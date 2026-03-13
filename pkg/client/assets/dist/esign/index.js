import { a as xt } from "../chunks/html-Br-oQr7i.js";
class Xi {
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
    const n = 200, r = 25;
    for (; t <= r; ) {
      const h = await this.listAgreements({ page: t, per_page: n }), g = h.items || h.records || [];
      if (e.push(...g), g.length === 0 || e.length >= h.total)
        break;
      t += 1;
    }
    const o = {};
    for (const h of e) {
      const g = String(h?.status || "").trim().toLowerCase();
      g && (o[g] = (o[g] || 0) + 1);
    }
    const c = (o.sent || 0) + (o.in_progress || 0), s = c + (o.declined || 0);
    return {
      draft: o.draft || 0,
      sent: o.sent || 0,
      in_progress: o.in_progress || 0,
      completed: o.completed || 0,
      voided: o.voided || 0,
      declined: o.declined || 0,
      expired: o.expired || 0,
      pending: c,
      action_required: s
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
      throw new Qi(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Qi extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let In = null;
function Ys() {
  if (!In)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return In;
}
function Zi(i) {
  In = i;
}
function er(i) {
  const e = new Xi(i);
  return Zi(e), e;
}
function Kt(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Ks(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function tn(i, e) {
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
function Xs(i, e) {
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
function Qs(i, e) {
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
function Zs(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), r = Math.round(n / 1e3), o = Math.round(r / 60), c = Math.round(o / 60), s = Math.round(c / 24), h = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(s) >= 1 ? h.format(s, "day") : Math.abs(c) >= 1 ? h.format(c, "hour") : Math.abs(o) >= 1 ? h.format(o, "minute") : h.format(r, "second");
  } catch {
    return String(i);
  }
}
function ea(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function tr(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function ta(i) {
  return i ? i.split("_").map((e) => tr(e)).join(" ") : "";
}
function na(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const nr = {
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
function di(i) {
  const e = String(i || "").trim().toLowerCase();
  return nr[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function ir(i, e) {
  const t = di(i), n = e?.showDot ?? !1, r = e?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, c = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${o[r]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${c}${t.label}</span>`;
}
function ia(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = ir(i, e), t.firstElementChild;
}
function ra(i, e, t) {
  const n = di(e), r = t?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${o[r]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const h = i.querySelector(".rounded-full");
    if (h)
      h.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const g = document.createElement("span");
      g.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, g.setAttribute("aria-hidden", "true"), i.prepend(g);
    }
  }
  const s = i.childNodes[i.childNodes.length - 1];
  s && s.nodeType === Node.TEXT_NODE ? s.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function u(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function Rt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function sa(i) {
  return document.getElementById(i);
}
function rr(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [r, o] of Object.entries(e))
      o !== void 0 && n.setAttribute(r, o);
  if (t)
    for (const r of t)
      typeof r == "string" ? n.appendChild(document.createTextNode(r)) : n.appendChild(r);
  return n;
}
function aa(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function oa(i, e, t, n, r) {
  const o = (c) => {
    const s = c.target.closest(e);
    s && i.contains(s) && n.call(s, c, s);
  };
  return i.addEventListener(t, o, r), () => i.removeEventListener(t, o, r);
}
function _e(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function V(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function R(i) {
  i && i.classList.add("hidden");
}
function ca(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? V(i) : R(i);
}
function la(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Ot(i, e, t = document) {
  const n = u(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function da(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Ot(t, n, e);
}
function sr(i = "[data-esign-page]", e = "data-esign-config") {
  const t = u(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const r = u(
    'script[type="application/json"]',
    t
  );
  if (r?.textContent)
    try {
      return JSON.parse(r.textContent);
    } catch {
      console.warn("Failed to parse page config from script:", r.textContent);
    }
  return null;
}
function ut(i, e = "polite") {
  const t = u(`[aria-live="${e}"]`) || (() => {
    const n = rr("div", {
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
async function ua(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: r = 6e4,
    maxAttempts: o = 30,
    onProgress: c,
    signal: s
  } = i, h = Date.now();
  let g = 0, v;
  for (; g < o; ) {
    if (s?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - h >= r)
      return {
        result: v,
        attempts: g,
        stopped: !1,
        timedOut: !0
      };
    if (g++, v = await e(), c && c(v, g), t(v))
      return {
        result: v,
        attempts: g,
        stopped: !0,
        timedOut: !1
      };
    await ui(n, s);
  }
  return {
    result: v,
    attempts: g,
    stopped: !1,
    timedOut: !1
  };
}
async function pa(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: r = 3e4,
    exponentialBackoff: o = !0,
    shouldRetry: c = () => !0,
    onRetry: s,
    signal: h
  } = i;
  let g;
  for (let v = 1; v <= t; v++) {
    if (h?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (x) {
      if (g = x, v >= t || !c(x, v))
        throw x;
      const _ = o ? Math.min(n * Math.pow(2, v - 1), r) : n;
      s && s(x, v, _), await ui(_, h);
    }
  }
  throw g;
}
function ui(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const r = setTimeout(t, i);
    if (e) {
      const o = () => {
        clearTimeout(r), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", o, { once: !0 });
    }
  });
}
function nn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function ga(i, e) {
  let t = 0, n = null;
  return (...r) => {
    const o = Date.now();
    o - t >= e ? (t = o, i(...r)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...r);
      },
      e - (o - t)
    ));
  };
}
function ma(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function fa(i, e, t = "Operation timed out") {
  let n;
  const r = new Promise((o, c) => {
    n = setTimeout(() => {
      c(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, r]);
  } finally {
    clearTimeout(n);
  }
}
class Tn {
  constructor(e) {
    this.config = e, this.client = er({
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
    Ot('count="draft"', e.draft), Ot('count="pending"', e.pending), Ot('count="completed"', e.completed), Ot('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function ha(i) {
  const e = i || sr(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Tn(e);
  return _e(() => t.init()), t;
}
function ya(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new Tn(t);
  _e(() => n.init());
}
typeof document < "u" && _e(() => {
  const i = document.querySelector(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (i) {
    const e = document.getElementById("esign-page-config"), t = i.getAttribute("data-esign-config"), n = (() => {
      if (e?.textContent)
        try {
          return JSON.parse(e.textContent);
        } catch (r) {
          console.warn("Failed to parse landing page config script:", r);
        }
      if (t)
        try {
          return JSON.parse(t);
        } catch (r) {
          console.warn("Failed to parse landing page config attribute:", r);
        }
      return null;
    })();
    if (n) {
      const r = String(n.basePath || n.base_path || "/admin"), o = String(
        n.apiBasePath || n.api_base_path || `${r}/api`
      );
      new Tn({ basePath: r, apiBasePath: o }).init();
    }
  }
});
class pi {
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
    const e = u("#retry-artifacts-btn");
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
        const n = (await e.json())?.assets || {}, r = this.resolveArtifacts(n);
        r ? (this.state.hasArtifacts = !0, this.displayArtifacts(r), this.showArtifactState("available")) : this.config.agreementCompleted ? (this.showArtifactState("processing"), this.state.retryCount < this.state.maxRetries && (this.state.retryCount++, setTimeout(() => this.loadArtifacts(), 5e3))) : this.showArtifactState("processing"), this.state.loaded = !0;
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
      const r = u(`#artifacts-${n}`);
      r && (n === e ? V(r) : R(r));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = u("#artifact-executed"), n = u("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), V(t));
    }
    if (e.source) {
      const t = u("#artifact-source"), n = u("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), V(t));
    }
    if (e.certificate) {
      const t = u("#artifact-certificate"), n = u("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), V(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function va(i) {
  const e = new pi(i);
  return _e(() => e.init()), e;
}
function ba(i) {
  const e = new pi(i);
  _e(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function ar(i = document) {
  Rt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Kt(t));
  });
}
function or(i = document) {
  Rt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = tn(t));
  });
}
function cr(i = document) {
  ar(i), or(i);
}
function lr() {
  _e(() => {
    cr();
  });
}
typeof document < "u" && lr();
const qn = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class gi {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: u("#loading-state"),
      successState: u("#success-state"),
      errorState: u("#error-state"),
      errorMessage: u("#error-message"),
      errorDetail: u("#error-detail"),
      closeBtn: u("#close-btn")
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), r = e.get("error_description"), o = e.get("state"), c = this.parseOAuthState(o);
    c.account_id || (c.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, r, c) : t ? this.handleSuccess(t, c) : this.handleError("unknown", "No authorization code was received from Google.", c);
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
    const { loadingState: t, successState: n, errorState: r } = this.elements;
    switch (R(t), R(n), R(r), e) {
      case "loading":
        V(t);
        break;
      case "success":
        V(n);
        break;
      case "error":
        V(r);
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
    const { errorMessage: r, errorDetail: o, closeBtn: c } = this.elements;
    r && (r.textContent = qn[e] || qn.unknown), t && o && (o.textContent = t, V(o)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), r = new URLSearchParams(window.location.search), o = r.get("state"), s = this.parseOAuthState(o).account_id || r.get("account_id");
      s && n.searchParams.set("account_id", s), window.location.href = n.toString();
    }
  }
}
function wa(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new gi(e);
  return _e(() => t.init()), t;
}
function Sa(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new gi(e);
  _e(() => t.init());
}
const mn = "esign.google.account_id", dr = {
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
class mi {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      loadingState: u("#loading-state"),
      disconnectedState: u("#disconnected-state"),
      connectedState: u("#connected-state"),
      errorState: u("#error-state"),
      statusBadge: u("#status-badge"),
      announcements: u("#integration-announcements"),
      accountIdInput: u("#account-id-input"),
      connectBtn: u("#connect-btn"),
      disconnectBtn: u("#disconnect-btn"),
      refreshBtn: u("#refresh-status-btn"),
      retryBtn: u("#retry-btn"),
      reauthBtn: u("#reauth-btn"),
      oauthModal: u("#oauth-modal"),
      oauthCancelBtn: u("#oauth-cancel-btn"),
      disconnectModal: u("#disconnect-modal"),
      disconnectCancelBtn: u("#disconnect-cancel-btn"),
      disconnectConfirmBtn: u("#disconnect-confirm-btn"),
      connectedEmail: u("#connected-email"),
      connectedAccountId: u("#connected-account-id"),
      scopesList: u("#scopes-list"),
      expiryInfo: u("#expiry-info"),
      reauthWarning: u("#reauth-warning"),
      reauthReason: u("#reauth-reason"),
      errorMessage: u("#error-message"),
      degradedWarning: u("#degraded-warning"),
      degradedReason: u("#degraded-reason"),
      importDriveLink: u("#import-drive-link"),
      integrationSettingsLink: u("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: u("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: u("#accounts-section"),
      accountsLoading: u("#accounts-loading"),
      accountsEmpty: u("#accounts-empty"),
      accountsGrid: u("#accounts-grid"),
      connectFirstBtn: u("#connect-first-btn")
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
      retryBtn: r,
      reauthBtn: o,
      oauthCancelBtn: c,
      disconnectCancelBtn: s,
      disconnectConfirmBtn: h,
      accountIdInput: g,
      oauthModal: v,
      disconnectModal: x
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, x && V(x);
    }), s && s.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, x && R(x);
    }), h && h.addEventListener("click", () => this.disconnect()), c && c.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), r && r.addEventListener("click", () => this.checkStatus()), g && (g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, !0);
    }), g.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(g.value, !0));
    }));
    const { accountDropdown: _, connectFirstBtn: b } = this.elements;
    _ && _.addEventListener("change", () => {
      _.value === "__new__" ? (_.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(_.value, !0);
    }), b && b.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (v && !v.classList.contains("hidden") && this.cancelOAuthFlow(), x && !x.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, R(x)));
    }), [v, x].forEach((f) => {
      f && f.addEventListener("click", (L) => {
        const S = L.target;
        (S === f || S.getAttribute("aria-hidden") === "true") && (R(f), f === v ? this.cancelOAuthFlow() : f === x && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(mn)
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
      (r) => this.normalizeAccountId(r.account_id) === t
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
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: r } = this.elements;
    e && document.activeElement !== e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), this.persistAccountId(), this.syncAccountIdInURL(), this.updateScopedLinks([n, r]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  /**
   * Persist account ID to localStorage
   */
  persistAccountId() {
    try {
      this.currentAccountId ? window.localStorage.setItem(mn, this.currentAccountId) : window.localStorage.removeItem(mn);
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
    t && (t.textContent = e), ut(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: r, errorState: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        V(t);
        break;
      case "disconnected":
        V(n);
        break;
      case "connected":
        V(r);
        break;
      case "error":
        V(o);
        break;
    }
  }
  /**
   * Update status badge
   */
  updateStatusBadge(e, t = !1, n = !1) {
    const { statusBadge: r } = this.elements;
    if (r) {
      if (n) {
        r.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
          Degraded
        </span>
      `;
        return;
      }
      e ? t ? r.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
            Expiring Soon
          </span>
        ` : r.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <span class="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
            Connected
          </span>
        ` : r.innerHTML = `
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
          const c = await e.json();
          c?.error?.message && (o = c.error.message);
        } catch {
        }
        throw new Error(o);
      }
      const t = await e.json(), n = this.normalizeIntegrationPayload(t.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const r = n.degraded === !0;
      this.renderDegradedState(r, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, r), this.announce(
        r ? "Google Drive connected with degraded provider health" : "Google Drive is connected"
      )) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, r), this.announce(
        r ? "Google Drive integration is degraded" : "Google Drive is not connected"
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
    const t = (L, S) => {
      for (const C of L)
        if (Object.prototype.hasOwnProperty.call(e, C) && e[C] !== void 0 && e[C] !== null)
          return e[C];
      return S;
    }, n = t(["expires_at", "ExpiresAt"], ""), r = t(["scopes", "Scopes"], []), o = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), c = t(["connected", "Connected"], !1), s = t(["degraded", "Degraded"], !1), h = t(["degraded_reason", "DegradedReason"], ""), g = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), v = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), x = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let _ = t(["is_expired", "IsExpired"], void 0), b = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof _ != "boolean" || typeof b != "boolean") && n) {
      const L = new Date(n);
      if (!Number.isNaN(L.getTime())) {
        const S = L.getTime() - Date.now(), C = 5 * 60 * 1e3;
        _ = S <= 0, b = S > 0 && S <= C;
      }
    }
    const f = typeof x == "boolean" ? x : (_ === !0 || b === !0) && !v;
    return {
      connected: c,
      account_id: o,
      email: g,
      scopes: Array.isArray(r) ? r : [],
      expires_at: n,
      is_expired: _ === !0,
      is_expiring_soon: b === !0,
      can_auto_refresh: v,
      needs_reauthorization: f,
      degraded: s,
      degraded_reason: h
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: r, expiryInfo: o, reauthWarning: c, reauthReason: s } = this.elements;
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
        const r = dr[n] || { label: n, description: "" };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${this.escapeHtml(r.label)}</span>
            ${r.description ? `<p class="text-xs text-gray-500">${this.escapeHtml(r.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  /**
   * Render token expiry information
   */
  renderExpiry(e, t, n, r, o) {
    const { expiryInfo: c, reauthWarning: s, reauthReason: h } = this.elements;
    if (!c) return;
    if (c.classList.remove("text-red-600", "text-amber-600"), c.classList.add("text-gray-500"), !e) {
      c.textContent = "Access token status unknown", s && R(s);
      return;
    }
    const g = new Date(e), v = /* @__PURE__ */ new Date(), x = Math.max(
      1,
      Math.round((g.getTime() - v.getTime()) / (1e3 * 60))
    );
    t ? r ? (c.textContent = "Access token expired, but refresh is available and will be applied automatically.", c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), s && R(s)) : (c.textContent = "Access token has expired. Please re-authorize.", c.classList.remove("text-gray-500"), c.classList.add("text-red-600"), s && V(s), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), r ? (c.textContent = `Token expires in approximately ${x} minute${x !== 1 ? "s" : ""}. Refresh is available automatically.`, s && R(s)) : (c.textContent = `Token expires in approximately ${x} minute${x !== 1 ? "s" : ""}`, s && V(s), h && (h.textContent = `Your access token will expire in ${x} minute${x !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (c.textContent = `Token valid until ${g.toLocaleDateString()} ${g.toLocaleTimeString()}`, s && R(s)), !o && s && R(s);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: r } = this.elements;
    n && (e ? (V(n), r && (r.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : R(n));
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
      const c = this.normalizeAccountId(o.account_id);
      if (n.has(c))
        continue;
      n.add(c);
      const s = document.createElement("option");
      s.value = c;
      const h = o.email || c || "Default", g = o.status !== "connected" ? ` (${o.status})` : "";
      s.textContent = `${h}${g}`, c === this.currentAccountId && (s.selected = !0), e.appendChild(s);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const o = document.createElement("option");
      o.value = this.currentAccountId, o.textContent = `${this.currentAccountId} (new)`, o.selected = !0, e.appendChild(o);
    }
    const r = document.createElement("option");
    r.value = "__new__", r.textContent = "+ Connect New Account...", e.appendChild(r);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && R(e), this.accounts.length === 0) {
      t && V(t), n && R(n);
      return;
    }
    t && R(t), n && (V(n), n.innerHTML = this.accounts.map((r) => this.renderAccountCard(r)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, r = {
      connected: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      needs_reauth: "bg-amber-100 text-amber-700",
      degraded: "bg-gray-100 text-gray-700"
    }, o = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, c = t ? "ring-2 ring-blue-500" : "", s = n[e.status] || "bg-white border-gray-200", h = r[e.status] || "bg-gray-100 text-gray-700", g = o[e.status] || e.status, v = e.account_id || "default", x = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${s} ${c} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(x)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(v)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${h}">
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
    e.querySelectorAll(".select-account-btn").forEach((r) => {
      r.addEventListener("click", (o) => {
        const s = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(s, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((r) => {
      r.addEventListener("click", (o) => {
        const s = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(s, !1), this.startOAuthFlow(s);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((r) => {
      r.addEventListener("click", (o) => {
        const s = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = s, t && V(t);
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
    t && V(t);
    const r = this.resolveOAuthRedirectURI(), o = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = o;
    const c = this.buildGoogleOAuthUrl(r, o);
    if (!c) {
      t && R(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const s = 500, h = 600, g = (window.screen.width - s) / 2, v = (window.screen.height - h) / 2;
    if (this.oauthWindow = window.open(
      c,
      "google_oauth",
      `width=${s},height=${h},left=${g},top=${v},popup=yes`
    ), !this.oauthWindow) {
      t && R(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (x) => this.handleOAuthCallback(x), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && R(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const n = /* @__PURE__ */ new Set(), r = this.normalizeOrigin(window.location.origin);
    r && n.add(r);
    const o = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    o && n.add(o);
    for (const c of n)
      if (t === c || this.areEquivalentLoopbackOrigins(t, c))
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
      const n = new URL(e), r = new URL(t);
      return n.protocol !== r.protocol || n.port !== r.port ? !1 : this.isLoopbackHost(n.hostname) && this.isLoopbackHost(r.hostname);
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
    const r = [
      "https://www.googleapis.com/auth/drive.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: n,
      redirect_uri: e,
      response_type: "code",
      scope: r,
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
    if (this.cleanupOAuthFlow(), n && R(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const r = this.resolveOAuthRedirectURI(), c = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        c !== this.currentAccountId && this.setCurrentAccountId(c, !1);
        const s = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", c),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: c || void 0,
              redirect_uri: r
            })
          }
        );
        if (!s.ok) {
          const h = await s.json();
          throw new Error(h.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (r) {
        console.error("Connect error:", r);
        const o = r instanceof Error ? r.message : "Unknown error";
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
    e && R(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && R(e);
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
        const r = await n.json();
        throw new Error(r.error?.message || "Failed to disconnect");
      }
      this.showToast("Google Drive disconnected", "success"), this.announce("Google Drive disconnected"), t === this.currentAccountId && this.setCurrentAccountId("", !1), await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (n) {
      console.error("Disconnect error:", n);
      const r = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to disconnect: ${r}`, "error"), this.announce(`Failed to disconnect: ${r}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function xa(i) {
  const e = new mi(i);
  return _e(() => e.init()), e;
}
function Ia(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new mi(e);
  _e(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const fn = "esign.google.account_id", Vn = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Gn = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class fi {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: u("#drive-search"),
      clearSearchBtn: u("#clear-search-btn"),
      fileList: u("#file-list"),
      loadingState: u("#loading-state"),
      breadcrumb: u("#breadcrumb"),
      listTitle: u("#list-title"),
      resultCount: u("#result-count"),
      pagination: u("#pagination"),
      loadMoreBtn: u("#load-more-btn"),
      refreshBtn: u("#refresh-btn"),
      announcements: u("#drive-announcements"),
      accountScopeHelp: u("#account-scope-help"),
      connectGoogleLink: u("#connect-google-link"),
      noSelection: u("#no-selection"),
      filePreview: u("#file-preview"),
      previewIcon: u("#preview-icon"),
      previewTitle: u("#preview-title"),
      previewType: u("#preview-type"),
      previewFileId: u("#preview-file-id"),
      previewOwner: u("#preview-owner"),
      previewLocation: u("#preview-location"),
      previewModified: u("#preview-modified"),
      importBtn: u("#import-btn"),
      openInGoogleBtn: u("#open-in-google-btn"),
      clearSelectionBtn: u("#clear-selection-btn"),
      importModal: u("#import-modal"),
      importForm: u("#import-form"),
      importGoogleFileId: u("#import-google-file-id"),
      importDocumentTitle: u("#import-document-title"),
      importAgreementTitle: u("#import-agreement-title"),
      importCancelBtn: u("#import-cancel-btn"),
      importConfirmBtn: u("#import-confirm-btn"),
      importSpinner: u("#import-spinner"),
      importBtnText: u("#import-btn-text"),
      viewListBtn: u("#view-list-btn"),
      viewGridBtn: u("#view-grid-btn")
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
      loadMoreBtn: r,
      importBtn: o,
      clearSelectionBtn: c,
      importCancelBtn: s,
      importConfirmBtn: h,
      importForm: g,
      importModal: v,
      viewListBtn: x,
      viewGridBtn: _
    } = this.elements;
    if (e) {
      const f = nn(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (L) => {
        L.key === "Enter" && (L.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), r && r.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), c && c.addEventListener("click", () => this.clearSelection()), s && s.addEventListener("click", () => this.hideImportModal()), h && g && g.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), v && v.addEventListener("click", (f) => {
      const L = f.target;
      (L === v || L.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), x && x.addEventListener("click", () => this.setViewMode("list")), _ && _.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && v && !v.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: b } = this.elements;
    b && b.addEventListener("click", (f) => this.handleFileListClick(f));
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
        window.localStorage.getItem(fn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, V(e)) : R(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(fn, this.currentAccountId) : window.localStorage.removeItem(fn);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), c = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), s = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : s ? [s] : [], v = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
      modifiedTime: o,
      webViewLink: c,
      parents: g,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && V(t));
    try {
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      let o;
      this.searchQuery ? o = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : o = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(r.id)}`
      ), this.nextPageToken && (o += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const c = await fetch(o, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!c.ok)
        throw new Error(`Failed to load files: ${c.status}`);
      const s = await c.json(), h = Array.isArray(s.files) ? s.files.map((g) => this.normalizeDriveFile(g)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.nextPageToken = s.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), ut(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (r) {
      console.error("Error loading files:", r), this.renderError(r instanceof Error ? r.message : "Failed to load files"), ut("Error loading files");
    } finally {
      this.isLoading = !1, t && R(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && R(t), this.currentFiles.length === 0) {
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
    const n = this.currentFiles.map((r) => this.renderFileItem(r)).join("");
    e.innerHTML = n;
  }
  /**
   * Render a single file item
   */
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Gn.includes(e.mimeType), r = this.selectedFile?.id === e.id, o = Vn[e.mimeType] || Vn.default, c = this.getFileIcon(o);
    return `
      <div
        class="file-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${r ? "bg-blue-50 border-l-2 border-blue-500" : ""}"
        data-file-id="${this.escapeHtml(e.id)}"
        data-is-folder="${t}"
        role="option"
        aria-selected="${r}"
        tabindex="0"
      >
        <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
          ${c}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${tn(e.modifiedTime)}
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
    const r = n.dataset.fileId, o = n.dataset.isFolder === "true";
    r && (o ? this.navigateToFolder(r) : this.selectFile(r));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), ut(`Selected: ${t.name}`));
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
      previewTitle: r,
      previewType: o,
      previewFileId: c,
      previewOwner: s,
      previewModified: h,
      importBtn: g,
      openInGoogleBtn: v
    } = this.elements;
    if (!this.selectedFile) {
      e && V(e), t && R(t);
      return;
    }
    e && R(e), t && V(t);
    const x = this.selectedFile, _ = Gn.includes(x.mimeType);
    r && (r.textContent = x.name), o && (o.textContent = this.getMimeTypeLabel(x.mimeType)), c && (c.textContent = x.id), s && x.owners.length > 0 && (s.textContent = x.owners[0].emailAddress || "-"), h && (h.textContent = tn(x.modifiedTime)), g && (_ ? (g.removeAttribute("disabled"), g.classList.remove("opacity-50", "cursor-not-allowed")) : (g.setAttribute("disabled", "true"), g.classList.add("opacity-50", "cursor-not-allowed"))), v && x.webViewLink && (v.href = x.webViewLink);
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
      R(e), t && (t.textContent = "Search Results");
      return;
    }
    V(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const r = e.querySelector("ol");
    r && (r.innerHTML = this.currentFolderPath.map(
      (o, c) => `
        <li class="flex items-center">
          ${c > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(o.id)}"
            data-folder-index="${c}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(o.name)}
          </button>
        </li>
      `
    ).join(""), Rt(".breadcrumb-item", r).forEach((o) => {
      o.addEventListener("click", () => {
        const c = parseInt(o.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(c);
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
    e && (this.nextPageToken ? V(e) : R(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? V(t) : R(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && R(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: n, importAgreementTitle: r } = this.elements;
    if (t && (t.value = this.selectedFile.id), n) {
      const o = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = o;
    }
    r && (r.value = ""), e && V(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && R(e);
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
      importDocumentTitle: r,
      importAgreementTitle: o
    } = this.elements, c = this.selectedFile.id, s = r?.value.trim() || this.selectedFile.name, h = o?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && V(t), n && (n.textContent = "Importing...");
    try {
      const g = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: c,
          document_title: s,
          agreement_title: h || void 0
        })
      });
      if (!g.ok) {
        const x = await g.json();
        throw new Error(x.error?.message || "Import failed");
      }
      const v = await g.json();
      this.showToast("Import started successfully", "success"), ut("Import started"), this.hideImportModal(), v.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${v.document.id}` : v.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${v.agreement.id}`);
    } catch (g) {
      console.error("Import error:", g);
      const v = g instanceof Error ? g.message : "Import failed";
      this.showToast(v, "error"), ut(`Error: ${v}`);
    } finally {
      e && e.removeAttribute("disabled"), t && R(t), n && (n.textContent = "Import");
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
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
  /**
   * Escape HTML
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function Ea(i) {
  const e = new fi(i);
  return _e(() => e.init()), e;
}
function Ca(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new fi(e);
  _e(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class hi {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: u("#time-range"),
      providerFilter: u("#provider-filter"),
      refreshBtn: u("#refresh-btn"),
      healthScore: u("#health-score"),
      healthIndicator: u("#health-indicator"),
      healthTrend: u("#health-trend"),
      syncSuccessRate: u("#sync-success-rate"),
      syncSuccessCount: u("#sync-success-count"),
      syncFailedCount: u("#sync-failed-count"),
      syncSuccessBar: u("#sync-success-bar"),
      conflictCount: u("#conflict-count"),
      conflictPending: u("#conflict-pending"),
      conflictResolved: u("#conflict-resolved"),
      conflictTrend: u("#conflict-trend"),
      syncLag: u("#sync-lag"),
      lagStatus: u("#lag-status"),
      lastSync: u("#last-sync"),
      retryTotal: u("#retry-total"),
      retryRecovery: u("#retry-recovery"),
      retryAvg: u("#retry-avg"),
      retryList: u("#retry-list"),
      providerHealthTable: u("#provider-health-table"),
      alertsList: u("#alerts-list"),
      noAlerts: u("#no-alerts"),
      alertCount: u("#alert-count"),
      activityFeed: u("#activity-feed"),
      syncChartCanvas: u("#sync-chart-canvas"),
      conflictChartCanvas: u("#conflict-chart-canvas")
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
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", r = t?.value || "";
    try {
      const o = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      o.searchParams.set("range", n), r && o.searchParams.set("provider", r);
      const c = await fetch(o.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!c.ok)
        this.healthData = this.generateMockHealthData(n, r);
      else {
        const s = await c.json();
        this.healthData = s;
      }
      this.renderHealthData(), ut("Health data refreshed");
    } catch (o) {
      console.error("Failed to load health data:", o), this.healthData = this.generateMockHealthData(n, r), this.renderHealthData();
    }
  }
  /**
   * Generate mock health data for demonstration
   */
  generateMockHealthData(e, t) {
    const r = Math.min(e === "1h" ? 1 : e === "6h" ? 6 : e === "24h" ? 24 : e === "7d" ? 168 : 720, 24);
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
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((c) => ({
        provider: c,
        status: c === "workday" ? "degraded" : "healthy",
        successRate: c === "workday" ? 89.2 : 97 + Math.random() * 3,
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
        sync: this.generateTimeSeriesData(r, "sync"),
        conflicts: this.generateTimeSeriesData(r, "conflicts")
      }
    };
  }
  /**
   * Generate activity feed data
   */
  generateActivityFeed(e) {
    const t = [], n = ["sync_completed", "sync_failed", "conflict_created", "conflict_resolved", "mapping_published"], r = ["salesforce", "hubspot", "bamboohr", "workday"];
    for (let o = 0; o < e; o++) {
      const c = n[Math.floor(Math.random() * n.length)], s = r[Math.floor(Math.random() * r.length)];
      t.push({
        type: c,
        provider: s,
        message: this.getActivityMessage(c, s),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: c.includes("failed") || c.includes("created") ? "warning" : "success"
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
    const n = [], r = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, o = /* @__PURE__ */ new Date();
    for (let c = e - 1; c >= 0; c--) {
      const s = new Date(o.getTime() - c * 36e5);
      n.push(
        s.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      ), t === "sync" ? (r.success.push(Math.floor(Math.random() * 15) + 10), r.failed.push(Math.floor(Math.random() * 3))) : (r.pending.push(Math.floor(Math.random() * 5)), r.resolved.push(Math.floor(Math.random() * 8) + 2));
    }
    return { labels: n, datasets: r };
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
    const { healthScore: e, healthIndicator: t, healthTrend: n } = this.elements, r = this.healthData;
    if (e && (e.textContent = `${r.healthScore}%`, r.healthScore >= 95 ? e.className = "text-3xl font-bold text-green-600" : r.healthScore >= 80 ? e.className = "text-3xl font-bold text-yellow-600" : e.className = "text-3xl font-bold text-red-600"), t && (r.healthScore >= 95 ? (t.className = "w-12 h-12 rounded-full bg-green-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>') : r.healthScore >= 80 ? (t.className = "w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>') : (t.className = "w-12 h-12 rounded-full bg-red-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>')), n) {
      const o = r.healthTrend >= 0 ? "+" : "";
      n.textContent = `${o}${r.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: r } = this.elements, o = this.healthData.syncStats;
    e && (e.textContent = `${o.successRate.toFixed(1)}%`), t && (t.textContent = `${o.succeeded} succeeded`), n && (n.textContent = `${o.failed} failed`), r && (r.style.width = `${o.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: r } = this.elements, o = this.healthData.conflictStats;
    if (e && (e.textContent = String(o.pending)), t && (t.textContent = `${o.pending} pending`), n && (n.textContent = `${o.resolvedToday} resolved today`), r) {
      const c = o.trend >= 0 ? "+" : "";
      r.textContent = `${c}${o.trend} from previous period`;
    }
  }
  /**
   * Render lag statistics
   */
  renderLagStats() {
    if (!this.healthData) return;
    const { syncLag: e, lagStatus: t, lastSync: n } = this.elements, r = this.healthData.lagStats;
    e && (e.textContent = `${r.averageMinutes}m`), t && (r.status === "normal" ? (t.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", t.textContent = "Normal") : r.status === "elevated" ? (t.className = "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full", t.textContent = "Elevated") : (t.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full", t.textContent = "Critical")), n && (n.textContent = `Last sync: ${r.lastSyncMinutesAgo} minutes ago`);
  }
  /**
   * Render retry activity
   */
  renderRetryActivity() {
    if (!this.healthData) return;
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: r } = this.elements, o = this.healthData.retryStats;
    e && (e.textContent = String(o.total)), t && (t.textContent = `${o.recoveryRate}%`), n && (n.textContent = o.avgAttempts.toFixed(1)), r && (r.innerHTML = o.recent.map(
      (c) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(c.provider)} / ${this.escapeHtml(c.entity)}</span>
            <span class="${c.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(c.time)}</span>
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
      (r) => `
            <div class="flex items-start gap-3 p-3 rounded-lg ${r.severity === "warning" ? "bg-yellow-50 border border-yellow-200" : r.severity === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}">
              <div class="flex-shrink-0">
                ${this.getAlertIcon(r.severity)}
              </div>
              <div class="flex-1">
                <div class="flex justify-between">
                  <span class="font-medium capitalize">${this.escapeHtml(r.provider)}</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(r.time)}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(r.message)}</p>
              </div>
              <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dismiss-alert-btn" aria-label="Dismiss alert">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `
    ).join(""), e.querySelectorAll(".dismiss-alert-btn").forEach((r) => {
      r.addEventListener("click", (o) => this.dismissAlert(o));
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
    const { alertsList: r, noAlerts: o, alertCount: c } = this.elements, s = r?.querySelectorAll(":scope > div").length || 0;
    c && (c.textContent = `${s} active`, s === 0 && (c.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", r && r.classList.add("hidden"), o && o.classList.remove("hidden")));
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
  renderBarChart(e, t, n, r) {
    const o = document.getElementById(e);
    if (!o) return;
    const c = o.getContext("2d");
    if (!c) return;
    const s = o.width, h = o.height, g = 40, v = s - g * 2, x = h - g * 2;
    c.clearRect(0, 0, s, h);
    const _ = t.labels, b = Object.values(t.datasets), f = v / _.length / (b.length + 1), L = Math.max(...b.flat()) || 1;
    _.forEach((S, C) => {
      const U = g + C * v / _.length + f / 2;
      b.forEach((X, F) => {
        const T = X[C] / L * x, W = U + F * f, B = h - g - T;
        c.fillStyle = n[F] || "#6b7280", c.fillRect(W, B, f - 2, T);
      }), C % Math.ceil(_.length / 6) === 0 && (c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "center", c.fillText(S, U + b.length * f / 2, h - g + 15));
    }), c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "right";
    for (let S = 0; S <= 4; S++) {
      const C = h - g - S * x / 4, U = Math.round(L * S / 4);
      c.fillText(U.toString(), g - 5, C + 3);
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
function La(i) {
  const e = new hi(i);
  return _e(() => e.init()), e;
}
function Aa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new hi(e);
  _e(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class yi {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: u("#mappings-announcements"),
      loadingState: u("#loading-state"),
      emptyState: u("#empty-state"),
      errorState: u("#error-state"),
      mappingsList: u("#mappings-list"),
      mappingsTbody: u("#mappings-tbody"),
      searchInput: u("#search-mappings"),
      filterStatus: u("#filter-status"),
      filterProvider: u("#filter-provider"),
      refreshBtn: u("#refresh-btn"),
      retryBtn: u("#retry-btn"),
      errorMessage: u("#error-message"),
      createMappingBtn: u("#create-mapping-btn"),
      createMappingEmptyBtn: u("#create-mapping-empty-btn"),
      mappingModal: u("#mapping-modal"),
      mappingModalTitle: u("#mapping-modal-title"),
      closeModalBtn: u("#close-modal-btn"),
      cancelModalBtn: u("#cancel-modal-btn"),
      mappingForm: u("#mapping-form"),
      mappingIdInput: u("#mapping-id"),
      mappingVersionInput: u("#mapping-version"),
      mappingNameInput: u("#mapping-name"),
      mappingProviderInput: u("#mapping-provider"),
      schemaObjectTypeInput: u("#schema-object-type"),
      schemaVersionInput: u("#schema-version"),
      schemaFieldsContainer: u("#schema-fields-container"),
      addFieldBtn: u("#add-field-btn"),
      mappingRulesContainer: u("#mapping-rules-container"),
      addRuleBtn: u("#add-rule-btn"),
      validateBtn: u("#validate-btn"),
      saveBtn: u("#save-btn"),
      formValidationStatus: u("#form-validation-status"),
      mappingStatusBadge: u("#mapping-status-badge"),
      publishModal: u("#publish-modal"),
      publishMappingName: u("#publish-mapping-name"),
      publishMappingVersion: u("#publish-mapping-version"),
      publishCancelBtn: u("#publish-cancel-btn"),
      publishConfirmBtn: u("#publish-confirm-btn"),
      deleteModal: u("#delete-modal"),
      deleteCancelBtn: u("#delete-cancel-btn"),
      deleteConfirmBtn: u("#delete-confirm-btn"),
      previewModal: u("#preview-modal"),
      closePreviewBtn: u("#close-preview-btn"),
      previewMappingName: u("#preview-mapping-name"),
      previewMappingProvider: u("#preview-mapping-provider"),
      previewObjectType: u("#preview-object-type"),
      previewMappingStatus: u("#preview-mapping-status"),
      previewSourceInput: u("#preview-source-input"),
      sourceSyntaxError: u("#source-syntax-error"),
      loadSampleBtn: u("#load-sample-btn"),
      runPreviewBtn: u("#run-preview-btn"),
      clearPreviewBtn: u("#clear-preview-btn"),
      previewEmpty: u("#preview-empty"),
      previewLoading: u("#preview-loading"),
      previewError: u("#preview-error"),
      previewErrorMessage: u("#preview-error-message"),
      previewSuccess: u("#preview-success"),
      previewParticipants: u("#preview-participants"),
      participantsCount: u("#participants-count"),
      previewFields: u("#preview-fields"),
      fieldsCount: u("#fields-count"),
      previewMetadata: u("#preview-metadata"),
      previewRawJson: u("#preview-raw-json"),
      previewRulesTbody: u("#preview-rules-tbody")
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
      cancelModalBtn: r,
      refreshBtn: o,
      retryBtn: c,
      addFieldBtn: s,
      addRuleBtn: h,
      validateBtn: g,
      mappingForm: v,
      publishCancelBtn: x,
      publishConfirmBtn: _,
      deleteCancelBtn: b,
      deleteConfirmBtn: f,
      closePreviewBtn: L,
      loadSampleBtn: S,
      runPreviewBtn: C,
      clearPreviewBtn: U,
      previewSourceInput: X,
      searchInput: F,
      filterStatus: T,
      filterProvider: W,
      mappingModal: B,
      publishModal: se,
      deleteModal: fe,
      previewModal: re
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.loadMappings()), s?.addEventListener("click", () => this.addSchemaField()), h?.addEventListener("click", () => this.addMappingRule()), g?.addEventListener("click", () => this.validateMapping()), v?.addEventListener("submit", (we) => {
      we.preventDefault(), this.saveMapping();
    }), x?.addEventListener("click", () => this.closePublishModal()), _?.addEventListener("click", () => this.publishMapping()), b?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), L?.addEventListener("click", () => this.closePreviewModal()), S?.addEventListener("click", () => this.loadSamplePayload()), C?.addEventListener("click", () => this.runPreviewTransform()), U?.addEventListener("click", () => this.clearPreview()), X?.addEventListener("input", nn(() => this.validateSourceJson(), 300)), F?.addEventListener("input", nn(() => this.renderMappings(), 300)), T?.addEventListener("change", () => this.renderMappings()), W?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (we) => {
      we.key === "Escape" && (B && !B.classList.contains("hidden") && this.closeModal(), se && !se.classList.contains("hidden") && this.closePublishModal(), fe && !fe.classList.contains("hidden") && this.closeDeleteModal(), re && !re.classList.contains("hidden") && this.closePreviewModal());
    }), [B, se, fe, re].forEach((we) => {
      we?.addEventListener("click", (He) => {
        const ge = He.target;
        (ge === we || ge.getAttribute("aria-hidden") === "true") && (we === B ? this.closeModal() : we === se ? this.closePublishModal() : we === fe ? this.closeDeleteModal() : we === re && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ut(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: r, mappingsList: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        V(t);
        break;
      case "empty":
        V(n);
        break;
      case "error":
        V(r);
        break;
      case "list":
        V(o);
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
    const { mappingsTbody: e, searchInput: t, filterStatus: n, filterProvider: r } = this.elements;
    if (!e) return;
    const o = (t?.value || "").toLowerCase(), c = n?.value || "", s = r?.value || "", h = this.mappings.filter((g) => !(o && !g.name.toLowerCase().includes(o) && !g.provider.toLowerCase().includes(o) || c && g.status !== c || s && g.provider !== s));
    if (h.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = h.map(
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
      mappingProviderInput: r,
      schemaObjectTypeInput: o,
      schemaVersionInput: c,
      schemaFieldsContainer: s,
      mappingRulesContainer: h
    } = this.elements, g = [];
    s?.querySelectorAll(".schema-field-row").forEach((x) => {
      g.push({
        object: (x.querySelector(".field-object")?.value || "").trim(),
        field: (x.querySelector(".field-name")?.value || "").trim(),
        type: x.querySelector(".field-type")?.value || "string",
        required: x.querySelector(".field-required")?.checked || !1
      });
    });
    const v = [];
    return h?.querySelectorAll(".mapping-rule-row").forEach((x) => {
      v.push({
        source_object: (x.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (x.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: x.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (x.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: r?.value.trim() || "",
      external_schema: {
        object_type: o?.value.trim() || "",
        version: c?.value.trim() || void 0,
        fields: g
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
      mappingNameInput: r,
      mappingProviderInput: o,
      schemaObjectTypeInput: c,
      schemaVersionInput: s,
      schemaFieldsContainer: h,
      mappingRulesContainer: g,
      mappingStatusBadge: v,
      formValidationStatus: x
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), r && (r.value = e.name || ""), o && (o.value = e.provider || "");
    const _ = e.external_schema || { object_type: "", fields: [] };
    c && (c.value = _.object_type || ""), s && (s.value = _.version || ""), h && (h.innerHTML = "", (_.fields || []).forEach((b) => h.appendChild(this.createSchemaFieldRow(b)))), g && (g.innerHTML = "", (e.rules || []).forEach((b) => g.appendChild(this.createMappingRuleRow(b)))), e.status && v ? (v.innerHTML = this.getStatusBadge(e.status), v.classList.remove("hidden")) : v && v.classList.add("hidden"), R(x);
  }
  /**
   * Reset the form to initial state
   */
  resetForm() {
    const {
      mappingForm: e,
      mappingIdInput: t,
      mappingVersionInput: n,
      schemaFieldsContainer: r,
      mappingRulesContainer: o,
      mappingStatusBadge: c,
      formValidationStatus: s
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), r && (r.innerHTML = ""), o && (o.innerHTML = ""), c && c.classList.add("hidden"), R(s), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), V(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: r, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, r && (r.textContent = "Edit Mapping Specification"), this.populateForm(t), V(n), o?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    R(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: r, publishMappingVersion: o } = this.elements;
    this.pendingPublishId = e, r && (r.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), V(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    R(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, V(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    R(this.elements.deleteModal), this.pendingDeleteId = null;
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
      const r = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...n, validate_only: !0 })
      }), o = await r.json();
      if (r.ok && o.status === "ok")
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
        const c = o.errors || [o.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${c.map((s) => `<li>${this.escapeHtml(s)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      V(t);
    } catch (r) {
      console.error("Validation error:", r), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(r instanceof Error ? r.message : "Unknown error")}</div>`, V(t));
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
      const n = !!t.id, r = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, c = await fetch(r, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!c.ok) {
        const s = await c.json();
        throw new Error(s.error?.message || `HTTP ${c.status}`);
      }
      this.showToast(n ? "Mapping updated" : "Mapping created", "success"), this.announce(n ? "Mapping updated" : "Mapping created"), this.closeModal(), await this.loadMappings();
    } catch (n) {
      console.error("Save error:", n);
      const r = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to save: ${r}`, "error"), this.announce(`Failed to save: ${r}`);
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
          const r = await n.json();
          throw new Error(r.error?.message || `HTTP ${n.status}`);
        }
        this.showToast("Mapping published", "success"), this.announce("Mapping published"), this.closePublishModal(), await this.loadMappings();
      } catch (n) {
        console.error("Publish error:", n);
        const r = n instanceof Error ? n.message : "Unknown error";
        this.showToast(`Failed to publish: ${r}`, "error");
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
      previewMappingName: r,
      previewMappingProvider: o,
      previewObjectType: c,
      previewMappingStatus: s,
      previewSourceInput: h,
      sourceSyntaxError: g
    } = this.elements;
    this.currentPreviewMapping = t, r && (r.textContent = t.name), o && (o.textContent = t.provider), c && (c.textContent = t.external_schema?.object_type || "-"), s && (s.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), h && (h.value = ""), R(g), V(n), h?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    R(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: r, previewSuccess: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "empty":
        V(t);
        break;
      case "loading":
        V(n);
        break;
      case "error":
        V(r);
        break;
      case "success":
        V(o);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, r = n.object_type || "data", o = n.fields || [], c = {}, s = {};
    o.forEach((h) => {
      const g = h.field || "field";
      switch (h.type) {
        case "string":
          s[g] = g === "email" ? "john.doe@example.com" : g === "name" ? "John Doe" : `sample_${g}`;
          break;
        case "number":
          s[g] = 123;
          break;
        case "boolean":
          s[g] = !0;
          break;
        case "date":
          s[g] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          s[g] = `sample_${g}`;
      }
    }), c[r] = s, e && (e.value = JSON.stringify(c, null, 2)), R(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return R(t), null;
    try {
      const r = JSON.parse(n);
      return R(t), r;
    } catch (r) {
      return t && (t.textContent = `JSON Syntax Error: ${r instanceof Error ? r.message : "Invalid JSON"}`, V(t)), null;
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
          const r = this.simulateTransform(n, this.currentPreviewMapping);
          this.renderPreviewResult(r), this.showPreviewState("success");
        } catch (r) {
          console.error("Transform error:", r), t && (t.textContent = r instanceof Error ? r.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  /**
   * Simulate transform (client-side preview)
   */
  simulateTransform(e, t) {
    const n = t.rules || [], r = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, o = {}, c = {}, s = [];
    return n.forEach((h) => {
      const g = this.resolveSourceValue(e, h.source_object, h.source_field), v = g !== void 0;
      if (r.matched_rules.push({
        source: h.source_field,
        matched: v,
        value: g
      }), !!v)
        switch (h.target_entity) {
          case "participant":
            o[h.target_path] = g;
            break;
          case "agreement":
            c[h.target_path] = g;
            break;
          case "field_definition":
            s.push({ path: h.target_path, value: g });
            break;
        }
    }), Object.keys(o).length > 0 && r.participants.push({
      ...o,
      role: o.role || "signer",
      signing_stage: o.signing_stage || 1
    }), r.agreement = c, r.field_definitions = s, r;
  }
  /**
   * Resolve source value from payload
   */
  resolveSourceValue(e, t, n) {
    if (!(!e || !n)) {
      if (t && e[t])
        return e[t][n];
      for (const r of Object.keys(e))
        if (typeof e[r] == "object" && e[r] !== null) {
          const o = e[r];
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
      previewFields: r,
      fieldsCount: o,
      previewMetadata: c,
      previewRawJson: s,
      previewRulesTbody: h
    } = this.elements, g = e.participants || [];
    n && (n.textContent = `(${g.length})`), t && (g.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = g.map(
      (b) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(b.name || b.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(b.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(b.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(b.role))}</span>
              <span class="text-xs text-gray-500">Stage ${b.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const v = e.field_definitions || [];
    o && (o.textContent = `(${v.length})`), r && (v.length === 0 ? r.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : r.innerHTML = v.map(
      (b) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(b.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(b.value))}</span>
          </div>
        `
    ).join(""));
    const x = e.agreement || {}, _ = Object.entries(x);
    c && (_.length === 0 ? c.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : c.innerHTML = _.map(
      ([b, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(b)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(f))}</span>
          </div>
        `
    ).join("")), s && (s.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((b) => {
      const f = h?.querySelector(`[data-rule-source="${this.escapeHtml(b.source)}"] span`);
      f && (b.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), R(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function Pa(i) {
  const e = new yi(i);
  return _e(() => e.init()), e;
}
function Ta(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new yi(e);
  _e(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class vi {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: u("#conflicts-announcements"),
      loadingState: u("#loading-state"),
      emptyState: u("#empty-state"),
      errorState: u("#error-state"),
      conflictsList: u("#conflicts-list"),
      errorMessage: u("#error-message"),
      refreshBtn: u("#refresh-btn"),
      retryBtn: u("#retry-btn"),
      filterStatus: u("#filter-status"),
      filterProvider: u("#filter-provider"),
      filterEntity: u("#filter-entity"),
      statPending: u("#stat-pending"),
      statResolved: u("#stat-resolved"),
      statIgnored: u("#stat-ignored"),
      conflictDetailModal: u("#conflict-detail-modal"),
      closeDetailBtn: u("#close-detail-btn"),
      detailReason: u("#detail-reason"),
      detailEntityType: u("#detail-entity-type"),
      detailStatusBadge: u("#detail-status-badge"),
      detailProvider: u("#detail-provider"),
      detailExternalId: u("#detail-external-id"),
      detailInternalId: u("#detail-internal-id"),
      detailBindingId: u("#detail-binding-id"),
      detailPayload: u("#detail-payload"),
      resolutionSection: u("#resolution-section"),
      detailResolvedAt: u("#detail-resolved-at"),
      detailResolvedBy: u("#detail-resolved-by"),
      detailResolution: u("#detail-resolution"),
      detailConflictId: u("#detail-conflict-id"),
      detailRunId: u("#detail-run-id"),
      detailCreatedAt: u("#detail-created-at"),
      detailVersion: u("#detail-version"),
      actionButtons: u("#action-buttons"),
      actionResolveBtn: u("#action-resolve-btn"),
      actionIgnoreBtn: u("#action-ignore-btn"),
      resolveModal: u("#resolve-modal"),
      resolveForm: u("#resolve-form"),
      cancelResolveBtn: u("#cancel-resolve-btn"),
      submitResolveBtn: u("#submit-resolve-btn"),
      resolutionAction: u("#resolution-action")
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
      filterStatus: r,
      filterProvider: o,
      filterEntity: c,
      actionResolveBtn: s,
      actionIgnoreBtn: h,
      cancelResolveBtn: g,
      resolveForm: v,
      conflictDetailModal: x,
      resolveModal: _
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), r?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("change", () => this.renderConflicts()), s?.addEventListener("click", () => this.openResolveModal("resolved")), h?.addEventListener("click", () => this.openResolveModal("ignored")), g?.addEventListener("click", () => this.closeResolveModal()), v?.addEventListener("submit", (b) => this.submitResolution(b)), document.addEventListener("keydown", (b) => {
      b.key === "Escape" && (_ && !_.classList.contains("hidden") ? this.closeResolveModal() : x && !x.classList.contains("hidden") && this.closeConflictDetail());
    }), [x, _].forEach((b) => {
      b?.addEventListener("click", (f) => {
        const L = f.target;
        (L === b || L.getAttribute("aria-hidden") === "true") && (b === x ? this.closeConflictDetail() : b === _ && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ut(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: r, conflictsList: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        V(t);
        break;
      case "empty":
        V(n);
        break;
      case "error":
        V(r);
        break;
      case "list":
        V(o);
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
      const r = await n.json();
      this.conflicts = r.conflicts || [], this.populateProviderFilter(), this.updateStats(), this.renderConflicts(), this.announce(`Loaded ${this.conflicts.length} conflicts`);
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
    const t = e.value, n = [...new Set(this.conflicts.map((r) => r.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + n.map(
      (r) => `<option value="${this.escapeHtml(r)}" ${r === t ? "selected" : ""}>${this.escapeHtml(r)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, r = this.conflicts.filter((s) => s.status === "pending").length, o = this.conflicts.filter((s) => s.status === "resolved").length, c = this.conflicts.filter((s) => s.status === "ignored").length;
    e && (e.textContent = String(r)), t && (t.textContent = String(o)), n && (n.textContent = String(c));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: r } = this.elements;
    if (!e) return;
    const o = t?.value || "", c = n?.value || "", s = r?.value || "", h = this.conflicts.filter((g) => !(o && g.status !== o || c && g.provider !== c || s && g.entity_kind !== s));
    if (h.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = h.map(
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
    const t = this.conflicts.find((T) => T.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: r,
      detailEntityType: o,
      detailStatusBadge: c,
      detailProvider: s,
      detailExternalId: h,
      detailInternalId: g,
      detailBindingId: v,
      detailConflictId: x,
      detailRunId: _,
      detailCreatedAt: b,
      detailVersion: f,
      detailPayload: L,
      resolutionSection: S,
      actionButtons: C,
      detailResolvedAt: U,
      detailResolvedBy: X,
      detailResolution: F
    } = this.elements;
    if (r && (r.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), s && (s.textContent = t.provider || "-"), h && (h.textContent = t.external_id || "-"), g && (g.textContent = t.internal_id || "-"), v && (v.textContent = t.binding_id || "-"), x && (x.textContent = t.id), _ && (_.textContent = t.run_id || "-"), b && (b.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), L)
      try {
        const T = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        L.textContent = JSON.stringify(T, null, 2);
      } catch {
        L.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (V(S), R(C), U && (U.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), X && (X.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), F)
        try {
          const T = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          F.textContent = JSON.stringify(T, null, 2);
        } catch {
          F.textContent = t.resolution_json || "{}";
        }
    } else
      R(S), V(C);
    V(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    R(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: r } = this.elements;
    n?.reset(), r && (r.value = e), V(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    R(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const r = new FormData(t);
    let o = {};
    const c = r.get("resolution");
    if (c)
      try {
        o = JSON.parse(c);
      } catch {
        o = { raw: c };
      }
    const s = r.get("notes");
    s && (o.notes = s);
    const h = {
      status: r.get("status"),
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
        body: JSON.stringify(h)
      });
      if (!g.ok) {
        const v = await g.json();
        throw new Error(v.error?.message || `HTTP ${g.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (g) {
      console.error("Resolution error:", g);
      const v = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${v}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution';
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function _a(i) {
  const e = new vi(i);
  return _e(() => e.init()), e;
}
function ka(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new vi(e);
  _e(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class bi {
  constructor(e) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: u("#sync-announcements"),
      loadingState: u("#loading-state"),
      emptyState: u("#empty-state"),
      errorState: u("#error-state"),
      runsTimeline: u("#runs-timeline"),
      errorMessage: u("#error-message"),
      refreshBtn: u("#refresh-btn"),
      retryBtn: u("#retry-btn"),
      filterProvider: u("#filter-provider"),
      filterStatus: u("#filter-status"),
      filterDirection: u("#filter-direction"),
      statTotal: u("#stat-total"),
      statRunning: u("#stat-running"),
      statCompleted: u("#stat-completed"),
      statFailed: u("#stat-failed"),
      startSyncBtn: u("#start-sync-btn"),
      startSyncEmptyBtn: u("#start-sync-empty-btn"),
      startSyncModal: u("#start-sync-modal"),
      startSyncForm: u("#start-sync-form"),
      cancelSyncBtn: u("#cancel-sync-btn"),
      submitSyncBtn: u("#submit-sync-btn"),
      syncMappingSelect: u("#sync-mapping"),
      runDetailModal: u("#run-detail-modal"),
      closeDetailBtn: u("#close-detail-btn"),
      detailRunId: u("#detail-run-id"),
      detailProvider: u("#detail-provider"),
      detailDirection: u("#detail-direction"),
      detailStatus: u("#detail-status"),
      detailStarted: u("#detail-started"),
      detailCompleted: u("#detail-completed"),
      detailCursor: u("#detail-cursor"),
      detailAttempt: u("#detail-attempt"),
      detailErrorSection: u("#detail-error-section"),
      detailLastError: u("#detail-last-error"),
      detailCheckpoints: u("#detail-checkpoints"),
      actionResumeBtn: u("#action-resume-btn"),
      actionRetryBtn: u("#action-retry-btn"),
      actionCompleteBtn: u("#action-complete-btn"),
      actionFailBtn: u("#action-fail-btn"),
      actionDiagnosticsBtn: u("#action-diagnostics-btn")
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
      startSyncForm: r,
      refreshBtn: o,
      retryBtn: c,
      closeDetailBtn: s,
      filterProvider: h,
      filterStatus: g,
      filterDirection: v,
      actionResumeBtn: x,
      actionRetryBtn: _,
      actionCompleteBtn: b,
      actionFailBtn: f,
      actionDiagnosticsBtn: L,
      startSyncModal: S,
      runDetailModal: C
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (U) => this.startSync(U)), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.loadSyncRuns()), s?.addEventListener("click", () => this.closeRunDetail()), h?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), x?.addEventListener("click", () => this.runAction("resume")), _?.addEventListener("click", () => this.runAction("resume")), b?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), L?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (U) => {
      U.key === "Escape" && (S && !S.classList.contains("hidden") && this.closeStartSyncModal(), C && !C.classList.contains("hidden") && this.closeRunDetail());
    }), [S, C].forEach((U) => {
      U?.addEventListener("click", (X) => {
        const F = X.target;
        (F === U || F.getAttribute("aria-hidden") === "true") && (U === S ? this.closeStartSyncModal() : U === C && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ut(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: r, runsTimeline: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        V(t);
        break;
      case "empty":
        V(n);
        break;
      case "error":
        V(r);
        break;
      case "list":
        V(o);
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
      const r = await n.json();
      this.syncRuns = r.runs || [], this.populateProviderFilter(), this.updateStats(), this.renderTimeline(), this.announce(`Loaded ${this.syncRuns.length} sync runs`);
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
    const t = e.value, n = [...new Set(this.syncRuns.map((r) => r.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + n.map(
      (r) => `<option value="${this.escapeHtml(r)}" ${r === t ? "selected" : ""}>${this.escapeHtml(r)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: r } = this.elements, o = this.syncRuns.length, c = this.syncRuns.filter(
      (g) => g.status === "running" || g.status === "pending"
    ).length, s = this.syncRuns.filter((g) => g.status === "completed").length, h = this.syncRuns.filter((g) => g.status === "failed").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(c)), n && (n.textContent = String(s)), r && (r.textContent = String(h));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const r = t?.value || "", o = n?.value || "", c = this.syncRuns.filter((s) => !(r && s.status !== r || o && s.direction !== o));
    if (c.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = c.map(
      (s) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(s.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${s.status === "running" ? "bg-blue-100" : s.status === "completed" ? "bg-green-100" : s.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${s.status === "running" ? "text-blue-600 animate-spin" : s.status === "completed" ? "text-green-600" : s.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(s.provider)}</span>
                  ${this.getDirectionBadge(s.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(s.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(s.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(s.started_at)}</p>
            </div>
          </div>

          ${s.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(s.cursor)}</span></p>
            </div>
          ` : ""}

          ${s.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(s.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".sync-run-card").forEach((s) => {
      s.addEventListener("click", () => this.openRunDetail(s.dataset.id || ""));
    });
  }
  /**
   * Open start sync modal
   */
  openStartSyncModal() {
    const { startSyncModal: e, startSyncForm: t } = this.elements;
    t?.reset(), V(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    R(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const r = new FormData(t), o = {
      provider: r.get("provider"),
      direction: r.get("direction"),
      mapping_spec_id: r.get("mapping_spec_id"),
      cursor: r.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const c = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(o)
      });
      if (!c.ok) {
        const s = await c.json();
        throw new Error(s.error?.message || `HTTP ${c.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (c) {
      console.error("Start sync error:", c);
      const s = c instanceof Error ? c.message : "Unknown error";
      this.showToast(`Failed to start: ${s}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(e) {
    this.currentRunId = e;
    const t = this.syncRuns.find((X) => X.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: r,
      detailProvider: o,
      detailDirection: c,
      detailStatus: s,
      detailStarted: h,
      detailCompleted: g,
      detailCursor: v,
      detailAttempt: x,
      detailErrorSection: _,
      detailLastError: b,
      detailCheckpoints: f,
      actionResumeBtn: L,
      actionRetryBtn: S,
      actionCompleteBtn: C,
      actionFailBtn: U
    } = this.elements;
    r && (r.textContent = t.id), o && (o.textContent = t.provider), c && (c.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), s && (s.innerHTML = this.getStatusBadge(t.status)), h && (h.textContent = this.formatDate(t.started_at)), g && (g.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), v && (v.textContent = t.cursor || "-"), x && (x.textContent = String(t.attempt_count || 1)), t.last_error ? (b && (b.textContent = t.last_error), V(_)) : R(_), L && L.classList.toggle("hidden", t.status !== "running"), S && S.classList.toggle("hidden", t.status !== "failed"), C && C.classList.toggle("hidden", t.status !== "running"), U && U.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), V(n);
    try {
      const X = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (X.ok) {
        const F = await X.json();
        this.renderCheckpoints(F.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (X) {
      console.error("Error loading checkpoints:", X), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
        (n, r) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
          ${r + 1}
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
    R(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: r, actionFailBtn: o } = this.elements, c = e === "resume" ? t : e === "complete" ? r : o, s = e === "resume" ? n : null;
    if (!c) return;
    c.setAttribute("disabled", "true"), s?.setAttribute("disabled", "true");
    const h = c.innerHTML;
    c.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const g = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, v = await fetch(g, {
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
        const x = await v.json();
        throw new Error(x.error?.message || `HTTP ${v.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (g) {
      console.error(`${e} error:`, g);
      const v = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${v}`, "error");
    } finally {
      c.removeAttribute("disabled"), s?.removeAttribute("disabled"), c.innerHTML = h;
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
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : t === "error" ? r.error(e) : t === "info" && r.info && r.info(e));
  }
}
function Da(i) {
  const e = new bi(i);
  return _e(() => e.init()), e;
}
function Ra(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new bi(e);
  _e(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const hn = "esign.google.account_id", ur = 25 * 1024 * 1024, pr = 2e3, Wn = 60, En = "application/vnd.google-apps.document", Cn = "application/pdf", Jn = "application/vnd.google-apps.folder", gr = [En, Cn];
class _n {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || ur, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      // Upload panel
      form: u("#document-upload-form"),
      fileInput: u("#pdf_file"),
      uploadZone: u("#pdf-upload-zone"),
      placeholder: u("#upload-placeholder"),
      preview: u("#upload-preview"),
      fileName: u("#selected-file-name"),
      fileSize: u("#selected-file-size"),
      clearBtn: u("#clear-file-btn"),
      errorEl: u("#upload-error"),
      submitBtn: u("#submit-btn"),
      titleInput: u("#title"),
      sourceObjectKeyInput: u("#source_object_key"),
      sourceOriginalNameInput: u("#source_original_name"),
      // Source tabs
      sourceTabs: Rt(".source-tab"),
      sourcePanels: Rt(".source-panel"),
      announcements: u("#doc-announcements"),
      // Google Drive panel
      searchInput: u("#drive-search"),
      clearSearchBtn: u("#clear-search-btn"),
      fileList: u("#file-list"),
      loadingState: u("#loading-state"),
      breadcrumb: u("#breadcrumb"),
      listTitle: u("#list-title"),
      resultCount: u("#result-count"),
      pagination: u("#pagination"),
      loadMoreBtn: u("#load-more-btn"),
      refreshBtn: u("#refresh-btn"),
      driveAccountDropdown: u("#drive-account-dropdown"),
      accountScopeHelp: u("#account-scope-help"),
      connectGoogleLink: u("#connect-google-link"),
      // Selection panel
      noSelection: u("#no-selection"),
      filePreview: u("#file-preview"),
      previewIcon: u("#preview-icon"),
      previewTitle: u("#preview-title"),
      previewType: u("#preview-type"),
      importTypeInfo: u("#import-type-info"),
      importTypeLabel: u("#import-type-label"),
      importTypeDesc: u("#import-type-desc"),
      snapshotWarning: u("#snapshot-warning"),
      importDocumentTitle: u("#import-document-title"),
      importBtn: u("#import-btn"),
      importBtnText: u("#import-btn-text"),
      clearSelectionBtn: u("#clear-selection-btn"),
      // Import status
      importStatus: u("#import-status"),
      importStatusQueued: u("#import-status-queued"),
      importStatusSuccess: u("#import-status-success"),
      importStatusFailed: u("#import-status-failed"),
      importStatusMessage: u("#import-status-message"),
      importErrorMessage: u("#import-error-message"),
      importRetryBtn: u("#import-retry-btn"),
      importReconnectLink: u("#import-reconnect-link")
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
      clearBtn: r,
      titleInput: o
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), r && r.addEventListener("click", (c) => {
      c.preventDefault(), c.stopPropagation(), this.clearFileSelection();
    }), o && o.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((c) => {
      n.addEventListener(c, (s) => {
        s.preventDefault(), s.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((c) => {
      n.addEventListener(c, (s) => {
        s.preventDefault(), s.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (c) => {
      const s = c.dataTransfer;
      s?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = s.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (c) => {
      (c.key === "Enter" || c.key === " ") && (c.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (c) => this.handleFormSubmit(c));
  }
  /**
   * Setup Google Drive listeners
   */
  setupGoogleDriveListeners() {
    const {
      searchInput: e,
      clearSearchBtn: t,
      loadMoreBtn: n,
      refreshBtn: r,
      clearSelectionBtn: o,
      importBtn: c,
      importRetryBtn: s,
      driveAccountDropdown: h
    } = this.elements;
    if (e) {
      const g = nn(() => this.handleSearch(), 300);
      e.addEventListener("input", g);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), r && r.addEventListener("click", () => this.refreshFiles()), h && h.addEventListener("change", () => {
      this.setCurrentAccountId(h.value, this.currentSource === "google");
    }), o && o.addEventListener("click", () => this.clearFileSelection()), c && c.addEventListener("click", () => this.startImport()), s && s.addEventListener("click", () => {
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
        window.localStorage.getItem(hn)
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
      const { searchInput: r, clearSearchBtn: o } = this.elements;
      r && (r.value = ""), o && R(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
        const r = await n.json();
        this.connectedAccounts = Array.isArray(r.accounts) ? r.accounts : [], this.renderConnectedAccountsDropdown();
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
    for (const r of this.connectedAccounts) {
      const o = this.normalizeAccountId(r?.account_id);
      if (n.has(o))
        continue;
      n.add(o);
      const c = document.createElement("option");
      c.value = o;
      const s = String(r?.email || "").trim(), h = String(r?.status || "").trim(), g = s || o || "Default account";
      c.textContent = h && h !== "connected" ? `${g} (${h})` : g, o === this.currentAccountId && (c.selected = !0), e.appendChild(c);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const r = document.createElement("option");
      r.value = this.currentAccountId, r.textContent = `${this.currentAccountId} (custom)`, r.selected = !0, e.appendChild(r);
    }
  }
  /**
   * Sync account ID to URL and localStorage
   */
  syncScopedAccountState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(hn, this.currentAccountId) : window.localStorage.removeItem(hn);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, V(e)) : R(e)), t) {
      const r = t.dataset.baseHref || t.getAttribute("href");
      r && t.setAttribute("href", this.applyAccountIdToPath(r));
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
      const r = n.dataset.source === e;
      n.setAttribute("aria-selected", String(r)), r ? (n.classList.add("border-blue-500", "text-blue-600"), n.classList.remove(
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
      n.id.replace("panel-", "") === e ? V(n) : R(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), ut(
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: r } = this.elements, o = e?.files?.[0];
    if (o && this.validateFile(o)) {
      if (this.showPreview(o), n && (n.value = ""), r && (r.value = o.name), t && !t.value.trim()) {
        const c = o.name.replace(/\.pdf$/i, "");
        t.value = c;
      }
    } else
      e && (e.value = ""), this.clearPreview(), n && (n.value = ""), r && (r.value = "");
    this.updateSubmitState();
  }
  /**
   * Validate uploaded file
   */
  validateFile(e) {
    return this.clearError(), e ? e.type !== "application/pdf" && !e.name.toLowerCase().endsWith(".pdf") ? (this.showError("Please select a PDF file."), !1) : e.size > this.maxFileSize ? (this.showError(
      `File is too large (${Kt(e.size)}). Maximum size is ${Kt(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: r, fileSize: o, uploadZone: c } = this.elements;
    r && (r.textContent = e.name), o && (o.textContent = Kt(e.size)), t && R(t), n && V(n), c && (c.classList.remove("border-gray-300"), c.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && V(e), t && R(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file selection
   */
  clearFileSelection() {
    const { fileInput: e, sourceObjectKeyInput: t, sourceOriginalNameInput: n } = this.elements;
    e && (e.value = ""), t && (t.value = ""), n && (n.value = ""), this.clearPreview(), this.clearError(), this.updateSubmitState();
  }
  /**
   * Show error message
   */
  showError(e) {
    const { errorEl: t } = this.elements;
    t && (t.textContent = e, V(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", R(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, r = e?.files && e.files.length > 0, o = t?.value.trim().length ?? !1, c = r && o;
    n && (n.disabled = !c, n.setAttribute("aria-disabled", String(!c)));
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), r = t.get("org_id"), o = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && o.searchParams.set("tenant_id", n), r && o.searchParams.set("org_id", r);
    const c = new FormData();
    c.append("file", e);
    const s = await fetch(o.toString(), {
      method: "POST",
      body: c,
      credentials: "same-origin"
    }), h = await s.json().catch(() => ({}));
    if (!s.ok) {
      const x = h?.error?.message || h?.message || "Upload failed. Please try again.";
      throw new Error(x);
    }
    const g = h?.object_key ? String(h.object_key).trim() : "";
    if (!g)
      throw new Error("Upload failed: missing source object key.");
    const v = h?.source_original_name ? String(h.source_original_name).trim() : h?.original_name ? String(h.original_name).trim() : e.name;
    return {
      objectKey: g,
      sourceOriginalName: v
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: r, sourceOriginalNameInput: o } = this.elements, c = t?.files?.[0];
    if (!(!c || !this.validateFile(c))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const s = await this.uploadSourcePDF(c);
        r && (r.value = s.objectKey), o && (o.value = s.sourceOriginalName || c.name), n?.submit();
      } catch (s) {
        const h = s instanceof Error ? s.message : "Upload failed. Please try again.";
        this.showError(h), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), c = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), s = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : s ? [s] : [], v = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
      modifiedTime: o,
      webViewLink: c,
      parents: g,
      owners: v
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === En;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === Cn;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Jn;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return gr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === En ? "Google Document" : t === Cn ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Jn ? "Folder" : "File";
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
    const r = t[n];
    return { html: {
      doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
      pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
      folder: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      default: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>'
    }[n], ...r };
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
    const { folderId: t, query: n, pageToken: r, append: o } = e, { fileList: c } = this.elements;
    !o && c && (c.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let s;
      n ? (s = this.buildScopedAPIURL("/esign/google-drive/search"), s.searchParams.set("q", n), s.searchParams.set("page_size", "20"), r && s.searchParams.set("page_token", r)) : (s = this.buildScopedAPIURL("/esign/google-drive/browse"), s.searchParams.set("page_size", "20"), t && t !== "root" && s.searchParams.set("folder_id", t), r && s.searchParams.set("page_token", r));
      const h = await fetch(s.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), g = await h.json();
      if (!h.ok)
        throw new Error(g.error?.message || "Failed to load files");
      const v = Array.isArray(g.files) ? g.files.map((f) => this.normalizeDriveFile(f)) : [];
      this.nextPageToken = g.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...v] : this.currentFiles = v, this.renderFiles(o);
      const { resultCount: x, listTitle: _ } = this.elements;
      n && x ? (x.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, _ && (_.textContent = "Search Results")) : (x && (x.textContent = ""), _ && (_.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: b } = this.elements;
      b && (this.nextPageToken ? V(b) : R(b)), ut(`Loaded ${v.length} files`);
    } catch (s) {
      console.error("Error loading files:", s), c && (c.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), ut(`Error: ${s instanceof Error ? s.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((r, o) => {
      const c = this.getFileIcon(r), s = this.isImportable(r), h = this.isFolder(r), g = this.selectedFile && this.selectedFile.id === r.id, v = !s && !h;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${g ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${v ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${g}"
          data-file-index="${o}"
          ${v ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0 ${c.text}">
            ${c.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(r.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(r.mimeType)}
              ${r.modifiedTime ? " • " + tn(r.modifiedTime) : ""}
              ${v ? " • Not importable" : ""}
            </p>
          </div>
          ${h ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((r) => {
      r.addEventListener("click", () => {
        const o = parseInt(r.dataset.fileIndex || "0", 10), c = this.currentFiles[o];
        this.isFolder(c) ? this.navigateToFolder(c) : this.isImportable(c) && this.selectFile(c);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: n } = this.elements;
    t && (t.value = ""), n && R(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      R(e);
      return;
    }
    V(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, r) => {
      const o = r === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${r > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${r}" class="breadcrumb-item ${o ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const r = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, r + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: r } = this.elements;
    r && r.querySelectorAll(".file-item").forEach((S) => {
      const C = parseInt(S.dataset.fileIndex || "0", 10);
      this.currentFiles[C].id === e.id ? (S.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), S.setAttribute("aria-selected", "true")) : (S.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), S.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: o,
      filePreview: c,
      importStatus: s,
      previewIcon: h,
      previewTitle: g,
      previewType: v,
      importTypeInfo: x,
      importTypeLabel: _,
      importTypeDesc: b,
      snapshotWarning: f,
      importDocumentTitle: L
    } = this.elements;
    o && R(o), c && V(c), s && R(s), h && (h.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, h.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), g && (g.textContent = e.name || "Untitled"), v && (v.textContent = this.getFileTypeName(e.mimeType)), n && x && (x.className = `p-3 rounded-lg border ${n.bgClass}`, _ && (_.textContent = n.label, _.className = `text-xs font-medium ${n.textClass}`), b && (b.textContent = n.desc, b.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? V(f) : R(f))), L && (L.value = e.name || ""), ut(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: r } = this.elements;
    e && V(e), t && R(t), n && R(n), r && r.querySelectorAll(".file-item").forEach((o) => {
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
      t && V(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && R(t), this.searchQuery = "";
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: r.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && R(t), this.searchQuery = "";
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
      importStatus: r,
      importStatusQueued: o,
      importStatusSuccess: c,
      importStatusFailed: s
    } = this.elements;
    switch (t && R(t), n && R(n), r && V(r), o && R(o), c && R(c), s && R(s), e) {
      case "queued":
      case "running":
        o && V(o);
        break;
      case "succeeded":
        c && V(c);
        break;
      case "failed":
        s && V(s);
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
    const { importErrorMessage: n, importReconnectLink: r } = this.elements;
    if (n && (n.textContent = e), r)
      if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
        const o = this.config.routes.integrations || "/admin/esign/integrations/google";
        r.href = this.applyAccountIdToPath(o), V(r);
      } else
        R(r);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: r } = this.elements;
    if (!this.selectedFile || !e) return;
    const o = e.value.trim();
    if (!o) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), r && R(r), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const c = new URL(window.location.href);
      c.searchParams.delete("import_run_id"), window.history.replaceState({}, "", c.toString());
      const s = await fetch(
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
      ), h = await s.json();
      if (!s.ok) {
        const v = h.error?.code || "";
        throw { message: h.error?.message || "Failed to start import", code: v };
      }
      this.currentImportRunId = h.import_run_id, this.pollAttempts = 0;
      const g = new URL(window.location.href);
      this.currentImportRunId && g.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", g.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (c) {
      console.error("Import error:", c);
      const s = c;
      this.showImportError(s.message || "Failed to start import", s.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), pr);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Wn) {
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
            this.showImportStatus("succeeded"), ut("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const o = n.error?.code || "", c = n.error?.message || "Import failed";
            this.showImportError(c, o), ut("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Wn ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function Ma(i) {
  const e = new _n(i);
  return _e(() => e.init()), e;
}
function Fa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new _n(e);
  _e(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function mr(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, r = i.context && typeof i.context == "object" ? i.context : {}, o = String(t.index || "").trim();
  return !e && !o ? null : {
    basePath: e || "/admin",
    apiBasePath: String(i.apiBasePath || i.api_base_path || "").trim() || void 0,
    userId: String(i.userId || i.user_id || r.user_id || "").trim(),
    googleEnabled: !!(i.googleEnabled ?? n.google_enabled),
    googleConnected: !!(i.googleConnected ?? n.google_connected),
    googleAccountId: String(
      i.googleAccountId || i.google_account_id || r.google_account_id || ""
    ).trim(),
    maxFileSize: typeof i.maxFileSize == "number" ? i.maxFileSize : typeof i.max_file_size == "number" ? i.max_file_size : void 0,
    routes: {
      index: o,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && _e(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = mr(t);
        n && new _n(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const rt = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, Vt = rt.REVIEW, fr = {
  [rt.DOCUMENT]: "Details",
  [rt.DETAILS]: "Participants",
  [rt.PARTICIPANTS]: "Fields",
  [rt.FIELDS]: "Placement",
  [rt.PLACEMENT]: "Review"
}, gt = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, rn = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
};
rt.DOCUMENT, rt.DETAILS, rt.PARTICIPANTS, rt.FIELDS, rt.REVIEW;
const Ln = /* @__PURE__ */ new Map(), hr = 30 * 60 * 1e3, Yn = {
  401: {
    message: "Unable to access this document",
    suggestion: "Please sign in again or check your permissions."
  },
  403: {
    message: "Access denied",
    suggestion: "You don't have permission to view this document."
  },
  404: {
    message: "Document not found",
    suggestion: "This document may have been moved or deleted."
  },
  500: {
    message: "Server error",
    suggestion: "Please try again in a moment."
  },
  502: {
    message: "Service temporarily unavailable",
    suggestion: "Please try again in a moment."
  },
  503: {
    message: "Service temporarily unavailable",
    suggestion: "Please try again in a moment."
  }
};
function yr(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function vr(i) {
  const e = i instanceof Error ? i.message : i, t = yr(e);
  if (e.toLowerCase().includes("network") || e.toLowerCase().includes("failed to fetch") || e.toLowerCase().includes("connection"))
    return {
      message: "Connection problem",
      suggestion: "Please check your internet connection and try again.",
      isRetryable: !0
    };
  if (e.toLowerCase().includes("pdf") && e.toLowerCase().includes("unavailable"))
    return {
      message: "Preview not available",
      suggestion: "The preview feature is temporarily unavailable.",
      isRetryable: !1
    };
  if (t && Yn[t]) {
    const n = Yn[t];
    return {
      message: n.message,
      suggestion: n.suggestion,
      isRetryable: t >= 500
      // Server errors are retryable
    };
  }
  return {
    message: "Preview unavailable",
    suggestion: "Unable to load the document preview.",
    isRetryable: !0
  };
}
function Kn() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function br() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function wr() {
  if (!br())
    throw new Error("PDF preview library unavailable");
}
function Sr(i) {
  const e = Ln.get(i);
  return e ? Date.now() - e.timestamp > hr ? (Ln.delete(i), null) : e : null;
}
function xr(i, e, t) {
  Ln.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Ir(i, e = rn.THUMBNAIL_MAX_WIDTH, t = rn.THUMBNAIL_MAX_HEIGHT) {
  await wr();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const o = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, c = o.numPages, s = await o.getPage(1), h = s.getViewport({ scale: 1 }), g = e / h.width, v = t / h.height, x = Math.min(g, v, 1), _ = s.getViewport({ scale: x }), b = document.createElement("canvas");
  b.width = _.width, b.height = _.height;
  const f = b.getContext("2d");
  if (!f)
    throw new Error("Failed to get canvas context");
  return await s.render({
    canvasContext: f,
    viewport: _
  }).promise, { dataUrl: b.toDataURL("image/jpeg", 0.8), pageCount: c };
}
class Er {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || rn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || rn.THUMBNAIL_MAX_HEIGHT
    }, this.state = {
      documentId: null,
      documentTitle: null,
      pageCount: null,
      thumbnailUrl: null,
      isLoading: !1,
      error: null
    }, this.elements = {
      container: null,
      thumbnail: null,
      title: null,
      pageCount: null,
      loadingState: null,
      errorState: null,
      emptyState: null,
      contentState: null,
      errorMessage: null,
      errorSuggestion: null,
      errorRetryBtn: null,
      errorDebugInfo: null
    };
  }
  /**
   * Initialize the preview card by binding to DOM elements
   */
  init() {
    this.elements.container = document.getElementById("document-preview-card"), this.elements.thumbnail = document.getElementById("document-preview-thumbnail"), this.elements.title = document.getElementById("document-preview-title"), this.elements.pageCount = document.getElementById("document-preview-page-count"), this.elements.loadingState = document.getElementById("document-preview-loading"), this.elements.errorState = document.getElementById("document-preview-error"), this.elements.emptyState = document.getElementById("document-preview-empty"), this.elements.contentState = document.getElementById("document-preview-content"), this.elements.errorMessage = document.getElementById("document-preview-error-message"), this.elements.errorSuggestion = document.getElementById("document-preview-error-suggestion"), this.elements.errorRetryBtn = document.getElementById("document-preview-retry-btn"), this.elements.errorDebugInfo = document.getElementById("document-preview-error-debug"), this.elements.errorRetryBtn && this.elements.errorRetryBtn.addEventListener("click", () => this.retry()), this.render();
  }
  /**
   * Retry loading the document preview
   */
  retry() {
    this.state.documentId && this.setDocument(this.state.documentId, this.state.documentTitle, this.state.pageCount);
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Update visibility based on current wizard step
   */
  updateVisibility(e) {
    if (!this.elements.container) return;
    const t = e === rt.DOCUMENT || e === rt.DETAILS || e === rt.PARTICIPANTS || e === rt.FIELDS || e === rt.REVIEW;
    this.elements.container.classList.toggle("hidden", !t);
  }
  /**
   * Set document and load preview
   */
  async setDocument(e, t = null, n = null) {
    const r = ++this.requestVersion;
    if (!e) {
      this.state = {
        documentId: null,
        documentTitle: null,
        pageCount: null,
        thumbnailUrl: null,
        isLoading: !1,
        error: null
      }, this.render();
      return;
    }
    const o = Sr(e);
    if (o) {
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? o.pageCount,
        thumbnailUrl: o.dataUrl,
        isLoading: !1,
        error: null
      }, this.render();
      return;
    }
    this.state = {
      documentId: e,
      documentTitle: t,
      pageCount: n,
      thumbnailUrl: null,
      isLoading: !0,
      error: null
    }, this.render();
    try {
      const c = await this.fetchDocumentPdfUrl(e);
      if (r !== this.requestVersion)
        return;
      const { dataUrl: s, pageCount: h } = await Ir(
        c,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (r !== this.requestVersion)
        return;
      xr(e, s, h), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? h,
        thumbnailUrl: s,
        isLoading: !1,
        error: null
      };
    } catch (c) {
      if (r !== this.requestVersion)
        return;
      const s = c instanceof Error ? c.message : "Failed to load preview", h = vr(s);
      Kn() && console.error("Failed to load document preview:", c), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: s,
        errorMessage: h.message,
        errorSuggestion: h.suggestion,
        errorRetryable: h.isRetryable
      };
    }
    this.render();
  }
  /**
   * Fetch PDF URL from document API
   */
  async fetchDocumentPdfUrl(e) {
    const n = (this.config.apiBasePath || `${this.config.basePath}/api`).replace(/\/+$/, "");
    return `${/\/v\d+$/i.test(n) ? n : `${n}/v1`}/panels/esign_documents/${encodeURIComponent(e)}/source/pdf`;
  }
  /**
   * Render the preview card based on current state
   */
  render() {
    const { container: e, thumbnail: t, title: n, pageCount: r, loadingState: o, errorState: c, emptyState: s, contentState: h } = this.elements;
    if (e) {
      if (o?.classList.add("hidden"), c?.classList.add("hidden"), s?.classList.add("hidden"), h?.classList.add("hidden"), !this.state.documentId) {
        s?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        o?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        c?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Kn() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      h?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), r && this.state.pageCount && (r.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
    }
  }
  /**
   * Clear the preview card state
   */
  clear() {
    this.state = {
      documentId: null,
      documentTitle: null,
      pageCount: null,
      thumbnailUrl: null,
      isLoading: !1,
      error: null
    }, this.render();
  }
}
function Cr(i = {}) {
  const e = new Er(i);
  return e.init(), e;
}
function Lr(i = {}) {
  let e = !1;
  return {
    start() {
      e || (e = !0, i.renderInitialUI?.(), i.bindEvents?.(), i.startSideEffects?.());
    },
    destroy() {
      e && (e = !1, i.destroy?.());
    }
  };
}
function Ar(i) {
  const { context: e, hooks: t = {} } = i;
  return Lr({
    renderInitialUI() {
      t.renderInitialUI?.();
    },
    bindEvents() {
      t.bindEvents?.();
    },
    startSideEffects() {
      e.syncController.start(), t.startSideEffects?.();
    },
    destroy() {
      t.destroy?.(), e.syncController.destroy();
    }
  });
}
function ct(i, e) {
  return i instanceof Document ? i.getElementById(e) : i.querySelector(`#${e}`);
}
function Ht(i, e, t) {
  const n = ct(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function Pr(i = document) {
  return {
    marker: ct(i, "esign-page-config"),
    form: {
      root: Ht(i, "agreement-form", "form"),
      submitBtn: Ht(i, "submit-btn", "submit button"),
      wizardSaveBtn: ct(i, "wizard-save-btn"),
      announcements: ct(i, "form-announcements"),
      documentIdInput: Ht(i, "document_id", "document selector"),
      documentPageCountInput: ct(i, "document_page_count"),
      titleInput: Ht(i, "title", "title input"),
      messageInput: Ht(i, "message", "message input")
    },
    ownership: {
      banner: ct(i, "active-tab-banner"),
      message: ct(i, "active-tab-message"),
      takeControlBtn: ct(i, "active-tab-take-control-btn"),
      reloadBtn: ct(i, "active-tab-reload-btn")
    },
    sync: {
      indicator: ct(i, "sync-status-indicator"),
      icon: ct(i, "sync-status-icon"),
      text: ct(i, "sync-status-text"),
      retryBtn: ct(i, "sync-retry-btn")
    },
    conflict: {
      modal: ct(i, "conflict-dialog-modal"),
      localTime: ct(i, "conflict-local-time"),
      serverRevision: ct(i, "conflict-server-revision"),
      serverTime: ct(i, "conflict-server-time")
    }
  };
}
function Tr(i, e) {
  return {
    render(t = {}) {
      const n = t?.coordinationAvailable !== !1, r = i.ownership.banner, o = i.ownership.message;
      if (!(!r || !o)) {
        if (!n) {
          const c = t?.claim, s = c?.lastSeenAt ? e.formatRelativeTime(c.lastSeenAt) : "recently";
          o.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${s}.`, r.classList.remove("hidden");
          return;
        }
        if (t?.isOwner !== !1) {
          r.classList.add("hidden");
          return;
        }
        r.classList.add("hidden");
      }
    },
    destroy() {
      i.ownership.banner?.classList.add("hidden");
    }
  };
}
class _r {
  constructor(e) {
    this.state = null, this.listeners = [], this.options = e;
  }
  start() {
    this.state = this.loadFromSession() || this.createInitialState();
  }
  destroy() {
    this.listeners = [];
  }
  now() {
    return this.options.now ? this.options.now() : (/* @__PURE__ */ new Date()).toISOString();
  }
  storage() {
    return this.options.sessionStorage !== void 0 ? this.options.sessionStorage : typeof window > "u" ? null : window.sessionStorage ?? null;
  }
  createInitialState() {
    return {
      wizardId: this.generateWizardId(),
      version: this.options.stateVersion,
      createdAt: this.now(),
      updatedAt: this.now(),
      currentStep: 1,
      document: { id: null, title: null, pageCount: null },
      details: { title: "", message: "" },
      participants: [],
      fieldDefinitions: [],
      fieldPlacements: [],
      fieldRules: [],
      titleSource: this.options.titleSource.AUTOFILL,
      resourceRef: null,
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
    const e = this.storage();
    if (!e) return null;
    try {
      const t = e.getItem(this.options.storageKey);
      if (!t) return null;
      const n = JSON.parse(t);
      return n.version !== this.options.stateVersion ? this.migrateState(n) : this.normalizeLoadedState(n);
    } catch {
      return null;
    }
  }
  normalizeLoadedState(e) {
    if (!e || typeof e != "object")
      return this.createInitialState();
    const t = this.createInitialState(), n = { ...t, ...e }, r = Number.parseInt(String(e.currentStep ?? t.currentStep), 10);
    n.currentStep = Number.isFinite(r) ? Math.min(Math.max(r, 1), this.options.totalWizardSteps) : t.currentStep;
    const o = e.document && typeof e.document == "object" ? e.document : {}, c = o.id;
    n.document = {
      id: c == null ? null : String(c).trim() || null,
      title: String(o.title ?? "").trim() || null,
      pageCount: this.options.parsePositiveInt(o.pageCount, 0) || null
    };
    const s = e.details && typeof e.details == "object" ? e.details : {}, h = String(s.title ?? "").trim(), g = h === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    n.details = {
      title: h,
      message: String(s.message ?? "")
    }, n.participants = Array.isArray(e.participants) ? e.participants : [], n.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], n.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], n.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const v = String(e.wizardId ?? "").trim();
    n.wizardId = v || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, g), n.resourceRef = this.normalizeResourceRef(e.resourceRef ?? e.resource_ref);
    const x = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = x || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e, n = String(t.kind ?? "").trim(), r = String(t.id ?? "").trim();
    if (n === "" || r === "")
      return null;
    const o = t.scope, c = o && typeof o == "object" && !Array.isArray(o) ? Object.entries(o).reduce((s, [h, g]) => {
      const v = String(h || "").trim();
      return v !== "" && (s[v] = String(g ?? "").trim()), s;
    }, {}) : void 0;
    return {
      kind: n,
      id: r,
      scope: c && Object.keys(c).length > 0 ? c : void 0
    };
  }
  migrateState(e) {
    return null;
  }
  saveToSession() {
    const e = this.storage();
    if (!(!e || !this.state))
      try {
        this.state.updatedAt = this.now(), e.setItem(this.options.storageKey, JSON.stringify(this.state));
      } catch {
      }
  }
  getState() {
    return this.state || (this.state = this.createInitialState()), this.state;
  }
  setState(e, t = {}) {
    this.state = this.normalizeLoadedState(e), t.syncPending === !0 ? this.state.syncPending = !0 : t.syncPending === !1 && (this.state.syncPending = !1), t.save !== !1 && this.saveToSession(), t.notify !== !1 && this.notifyListeners();
  }
  updateState(e) {
    this.setState(
      { ...this.getState(), ...e, syncPending: !0, updatedAt: this.now() },
      { syncPending: !0 }
    );
  }
  updateStep(e) {
    this.updateState({ currentStep: e });
  }
  updateDocument(e) {
    this.updateState({ document: { ...this.getState().document, ...e } });
  }
  updateDetails(e, t = {}) {
    const n = {
      details: { ...this.getState().details, ...e }
    };
    Object.prototype.hasOwnProperty.call(t, "titleSource") ? n.titleSource = this.options.normalizeTitleSource(t.titleSource, this.getState().titleSource) : Object.prototype.hasOwnProperty.call(e || {}, "title") && (n.titleSource = this.options.titleSource.USER), this.updateState(n);
  }
  setTitleSource(e, t = {}) {
    const n = this.options.normalizeTitleSource(e, this.getState().titleSource);
    if (n !== this.getState().titleSource) {
      if (t.syncPending === !1) {
        this.setState({ ...this.getState(), titleSource: n }, { syncPending: !1 });
        return;
      }
      this.updateState({ titleSource: n });
    }
  }
  updateParticipants(e) {
    this.updateState({ participants: e });
  }
  updateFieldDefinitions(e) {
    this.updateState({ fieldDefinitions: e });
  }
  updateFieldPlacements(e) {
    this.updateState({ fieldPlacements: e });
  }
  markSynced(e, t) {
    this.setState({
      ...this.getState(),
      serverDraftId: e,
      serverRevision: t,
      lastSyncedAt: this.now(),
      syncPending: !1
    }, { syncPending: !1 });
  }
  bindResourceRef(e, t = {}) {
    const n = this.normalizeResourceRef(e);
    this.setState({
      ...this.getState(),
      resourceRef: n,
      serverDraftId: n?.id || null
    }, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    });
  }
  applyServerSnapshot(e, t = {}) {
    const n = this.getState();
    if (t.preserveDirty === !0 && n.syncPending === !0)
      return this.setState({
        ...n,
        resourceRef: e.ref,
        serverDraftId: e.ref.id,
        serverRevision: e.revision,
        lastSyncedAt: e.updatedAt,
        syncPending: !0
      }, {
        save: t.save,
        notify: t.notify,
        syncPending: !0
      }), this.getState();
    const o = e?.data && typeof e.data == "object" ? e.data : {}, c = this.normalizeLoadedState({
      ...o?.wizard_state && typeof o.wizard_state == "object" ? o.wizard_state : {},
      resourceRef: e.ref,
      serverDraftId: e.ref.id,
      serverRevision: e.revision,
      lastSyncedAt: e.updatedAt,
      syncPending: !1
    });
    return this.setState(c, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    }), this.getState();
  }
  applyRemoteSync(e, t, n = {}) {
    const r = this.getState(), o = r.syncPending === !0, c = String(e ?? "").trim() || null, s = this.options.parsePositiveInt(t, 0);
    return this.setState({
      ...r,
      serverDraftId: c || r.serverDraftId,
      serverRevision: s > 0 ? s : r.serverRevision,
      lastSyncedAt: String(n.lastSyncedAt || this.now()).trim() || r.lastSyncedAt,
      syncPending: o
    }, {
      syncPending: o,
      save: n.save,
      notify: n.notify
    }), {
      preservedLocalChanges: o,
      state: this.getState()
    };
  }
  applyRemoteState(e, t = {}) {
    const n = this.normalizeLoadedState(e), r = this.getState();
    return r.syncPending === !0 ? (this.setState({
      ...r,
      serverDraftId: n.serverDraftId || r.serverDraftId,
      serverRevision: Math.max(
        this.options.parsePositiveInt(r.serverRevision, 0),
        this.options.parsePositiveInt(n.serverRevision, 0)
      ),
      lastSyncedAt: n.lastSyncedAt || r.lastSyncedAt,
      syncPending: !0
    }, {
      syncPending: !0,
      save: t.save,
      notify: t.notify
    }), {
      preservedLocalChanges: !0,
      replacedLocalState: !1,
      state: this.getState()
    }) : (this.setState(n, {
      syncPending: !!n.syncPending,
      save: t.save,
      notify: t.notify
    }), {
      preservedLocalChanges: !1,
      replacedLocalState: !0,
      state: this.getState()
    });
  }
  clear() {
    const e = this.storage();
    this.state = this.createInitialState(), e?.removeItem(this.options.storageKey), this.notifyListeners();
  }
  hasResumableState() {
    return this.options.hasMeaningfulWizardProgress(this.getState());
  }
  onStateChange(e) {
    return this.listeners.push(e), () => {
      this.listeners = this.listeners.filter((t) => t !== e);
    };
  }
  notifyListeners() {
    const e = this.getState();
    this.listeners.forEach((t) => t(e));
  }
  collectFormState() {
    const e = this.getState(), t = this.options.collectFormState(), n = t.details && typeof t.details == "object" ? t.details : {}, r = this.options.normalizeTitleSource(
      t.titleSource,
      String(n.title || "").trim() === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER
    );
    return {
      ...t,
      resourceRef: e.resourceRef || null,
      titleSource: r,
      serverDraftId: e.serverDraftId,
      serverRevision: e.serverRevision,
      lastSyncedAt: e.lastSyncedAt,
      currentStep: e.currentStep,
      wizardId: e.wizardId,
      version: e.version,
      createdAt: e.createdAt,
      updatedAt: this.now(),
      syncPending: !0
    };
  }
}
const yn = /* @__PURE__ */ new Map();
async function kr(i) {
  const e = String(i || "").trim().replace(/\/+$/, "");
  if (e === "")
    throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? An(window.__esignSyncCoreModule) : (yn.has(e) || yn.set(e, Dr(e)), yn.get(e));
}
async function Dr(i) {
  if (typeof window < "u" && typeof window.__esignSyncCoreLoader == "function")
    return An(await window.__esignSyncCoreLoader(i));
  const t = await import(`${i}/index.js`);
  return An(t);
}
function An(i) {
  if (!i || typeof i.createInMemoryCache != "function" || typeof i.createFetchSyncTransport != "function" || typeof i.createSyncEngine != "function" || typeof i.parseReadEnvelope != "function")
    throw new TypeError("Invalid sync-core runtime module");
  return i;
}
class Rr {
  constructor(e) {
    this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null, this.syncModulePromise = null, this.syncModule = null, this.transport = null, this.cache = null, this.resource = null, this.resourceRef = null, this.stateManager = e.stateManager, this.requestHeaders = e.requestHeaders, this.fetchImpl = e.fetchImpl || fetch.bind(globalThis), this.syncConfig = e.syncConfig;
  }
  async start() {
    const e = this.stateManager.getState(), t = this.resolveStoredResourceRef(e);
    t && await this.bindResource(t);
  }
  destroy() {
    this.resource = null, this.resourceRef = null;
  }
  async create(e) {
    const t = this.stateManager.normalizeLoadedState(e);
    await this.ensureBoundResource({
      forceBootstrap: !0,
      preserveLocalState: !0
    }), this.stateManager.setState({
      ...t,
      resourceRef: this.resourceRef,
      serverDraftId: this.resourceRef?.id || null,
      serverRevision: Number(this.resource?.getSnapshot()?.revision || 0),
      lastSyncedAt: this.resource?.getSnapshot()?.updatedAt || null,
      syncPending: !0
    }, {
      notify: !1,
      save: !0,
      syncPending: !0
    });
    const n = await this.sync();
    if (!n.success || !n.result)
      throw this.toRuntimeError(n.error || "draft_create_failed");
    return n.result;
  }
  async load(e) {
    const t = this.resolveStoredResourceRef(this.stateManager.getState(), e) || this.createFallbackResourceRef(e);
    await this.bindResource(t);
    try {
      const n = await this.resource.refresh({ force: !0 });
      return this.snapshotToRecord(n);
    } catch (n) {
      if (String(n?.code || "").trim().toUpperCase() === "NOT_FOUND") {
        const r = new Error("HTTP 404");
        throw r.status = 404, r.code = "NOT_FOUND", r;
      }
      throw n;
    }
  }
  async dispose(e) {
    const t = this.resourceRef?.id === e ? this.resourceRef : this.resolveStoredResourceRef(this.stateManager.getState(), e) || this.createFallbackResourceRef(e);
    await this.bindResource(t);
    let n = Number(this.resource?.getSnapshot()?.revision || 0);
    if (n <= 0)
      try {
        const r = await this.resource.load();
        n = Number(r.revision || 0);
      } catch (r) {
        if (Number(r?.status || 0) !== 404 && String(r?.code || "").trim().toUpperCase() !== "NOT_FOUND")
          throw r;
        n = 0;
      }
    n > 0 && await this.resource.mutate({
      operation: "discard",
      payload: {},
      expectedRevision: n,
      idempotencyKey: `discard:${e}:${n}`
    }), this.resourceRef?.id === e && (this.resource = null, this.resourceRef = null);
  }
  async refresh(e = {}) {
    const t = await this.ensureBoundResource(), n = t.getSnapshot() ? await t.refresh({ force: e.force !== !1 }) : await t.load();
    return this.stateManager.applyServerSnapshot(n, {
      notify: !0,
      save: !0,
      preserveDirty: e.preserveDirty === !0
    }), this.snapshotToRecord(n);
  }
  async send(e, t, n = {}) {
    const o = await (await this.ensureBoundResource()).mutate({
      operation: "send",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: n
    });
    return {
      replay: o.replay,
      applied: o.applied,
      snapshot: o.snapshot,
      data: this.snapshotData(o.snapshot)
    };
  }
  async sync() {
    const e = this.stateManager.getState();
    if (!e.syncPending) {
      const t = this.resource?.getSnapshot();
      return {
        success: !0,
        result: t ? this.snapshotToRecord(t) : void 0
      };
    }
    try {
      const n = await (await this.ensureBoundResource({
        preserveLocalState: !e.serverDraftId
      })).mutate({
        operation: "autosave",
        payload: {
          wizard_state: e,
          title: e.details?.title || "Untitled Agreement",
          current_step: e.currentStep,
          document_id: e.document?.id || null
        },
        expectedRevision: Number(e.serverRevision || 0) || void 0
      });
      return this.applyMutationSnapshot(n), {
        success: !0,
        result: this.snapshotToRecord(n.snapshot)
      };
    } catch (t) {
      const n = t?.conflict;
      return n || String(t?.code || "").trim().toUpperCase() === "STALE_REVISION" ? {
        success: !1,
        conflict: !0,
        currentRevision: Number(n?.currentRevision || t?.currentRevision || 0),
        latestSnapshot: n?.latestSnapshot || t?.resource || null
      } : {
        success: !1,
        error: String(t?.message || "sync_failed").trim() || "sync_failed"
      };
    }
  }
  async bootstrap() {
    const e = await this.ensureRuntime(), t = await this.fetchImpl(this.syncConfig.bootstrap_path, {
      method: "POST",
      credentials: "same-origin",
      headers: this.requestHeaders(!1)
    }), n = await t.json().catch(() => ({}));
    if (!t.ok)
      throw new Error(String(n?.error?.message || `HTTP ${t.status}`));
    const r = this.normalizeResourceRef(n?.resource_ref);
    if (!r)
      throw new Error("Invalid agreement draft bootstrap response");
    const o = e.parseReadEnvelope(r, n?.draft || {});
    return {
      resourceRef: r,
      snapshot: o,
      wizardID: String(n?.wizard_id || "").trim()
    };
  }
  async ensureRuntime() {
    return this.syncModule ? this.syncModule : (this.syncModulePromise || (this.syncModulePromise = kr(this.syncConfig.client_base_path)), this.syncModule = await this.syncModulePromise, this.cache || (this.cache = this.syncModule.createInMemoryCache()), this.transport || (this.transport = this.syncModule.createFetchSyncTransport({
      baseURL: this.syncConfig.base_url,
      credentials: "same-origin",
      fetch: this.fetchImpl,
      headers: () => this.requestHeaders(!1),
      actionOperations: this.syncConfig.action_operations
    })), this.syncModule);
  }
  async ensureBoundResource(e = {}) {
    if (!e.forceBootstrap && this.resource && this.resourceRef)
      return this.resource;
    const t = this.stateManager.getState(), n = e.forceBootstrap ? null : this.resolveStoredResourceRef(t);
    if (n)
      return await this.bindResource(n), this.resource;
    if (!e.forceBootstrap && t.serverDraftId)
      return await this.bindResource(this.createFallbackResourceRef(t.serverDraftId)), this.resource;
    const r = await this.bootstrap();
    return await this.bindResource(r.resourceRef, r.snapshot), e.preserveLocalState ? this.stateManager.setState({
      ...this.stateManager.getState(),
      resourceRef: r.resourceRef,
      serverDraftId: r.resourceRef.id,
      serverRevision: r.snapshot.revision,
      lastSyncedAt: r.snapshot.updatedAt,
      syncPending: !0
    }, {
      notify: !1,
      save: !0,
      syncPending: !0
    }) : this.stateManager.applyServerSnapshot(r.snapshot, {
      notify: !1,
      save: !0
    }), this.resource;
  }
  async bindResource(e, t) {
    const n = await this.ensureRuntime(), r = this.normalizeResourceRef(e);
    if (!r)
      throw new Error("A valid draft resourceRef is required");
    t && this.cache && this.cache.set(r, t);
    const o = n.createSyncEngine({
      transport: this.transport,
      cache: this.cache
    });
    this.resourceRef = r, this.resource = o.resource(r), this.stateManager.bindResourceRef(r, {
      notify: !1,
      save: !0
    });
  }
  applyMutationSnapshot(e) {
    this.stateManager.applyServerSnapshot(e.snapshot, {
      notify: !1,
      save: !0
    });
  }
  snapshotToRecord(e) {
    const t = this.snapshotData(e);
    return {
      id: String(t.id || e.ref.id || "").trim(),
      revision: Number(e.revision || 0),
      updated_at: String(t.updated_at || e.updatedAt || "").trim(),
      wizard_state: this.snapshotWizardState(e),
      resource_ref: e.ref
    };
  }
  snapshotWizardState(e) {
    const n = this.snapshotData(e)?.wizard_state;
    return n && typeof n == "object" ? n : {};
  }
  snapshotData(e) {
    return !e?.data || typeof e.data != "object" ? {} : e.data;
  }
  resolveStoredResourceRef(e, t = "") {
    const n = this.normalizeResourceRef(e?.resourceRef || e?.resource_ref);
    return !n || t && n.id !== t ? null : n;
  }
  createFallbackResourceRef(e) {
    const t = String(e || "").trim();
    return {
      kind: this.syncConfig.resource_kind || "agreement_draft",
      id: t
    };
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e, n = String(t.kind || "").trim(), r = String(t.id || "").trim();
    if (n === "" || r === "")
      return null;
    const o = t.scope, c = o && typeof o == "object" && !Array.isArray(o) ? Object.entries(o).reduce((s, [h, g]) => {
      const v = String(h || "").trim();
      return v !== "" && (s[v] = String(g ?? "").trim()), s;
    }, {}) : void 0;
    return {
      kind: n,
      id: r,
      scope: c && Object.keys(c).length > 0 ? c : void 0
    };
  }
  toRuntimeError(e) {
    return new Error(String(e || "sync_failed").trim() || "sync_failed");
  }
}
class Mr {
  constructor(e) {
    this.channel = null, this.cleanupFns = [], this.activeDraftId = "", this.isOwner = !0, this.currentClaim = null, this.lastBlockedReason = "", this.options = e;
  }
  start() {
    this.initBroadcastChannel(), this.initEventListeners(), this.options.onOwnershipChange({
      isOwner: !0,
      reason: "",
      claim: null,
      coordinationAvailable: !!this.channel
    });
  }
  stop() {
    this.cleanupFns.forEach((e) => e()), this.cleanupFns = [], this.channel?.close && this.channel.close(), this.channel = null, this.activeDraftId = "";
  }
  setActiveDraft(e) {
    this.activeDraftId = String(e || "").trim();
  }
  broadcastStateUpdate(e) {
  }
  broadcastSyncCompleted(e, t) {
    const n = String(e || "").trim();
    n !== "" && this.broadcastMessage({
      type: "sync_completed",
      tabId: this.getTabId(),
      draftId: n,
      revision: t
    });
  }
  broadcastDraftDisposed(e, t = "") {
    const n = String(e || "").trim();
    n !== "" && this.broadcastMessage({
      type: "draft_disposed",
      tabId: this.getTabId(),
      draftId: n,
      reason: String(t || "").trim()
    });
  }
  now() {
    return this.options.now ? this.options.now() : (/* @__PURE__ */ new Date()).toISOString();
  }
  win() {
    return this.options.windowRef || (typeof window > "u" ? null : window);
  }
  doc() {
    return this.options.documentRef || (typeof document > "u" ? null : document);
  }
  initBroadcastChannel() {
    const e = this.options.broadcastChannelFactory || ((t) => new BroadcastChannel(t));
    if (!(typeof BroadcastChannel > "u" && !this.options.broadcastChannelFactory))
      try {
        this.channel = e(this.options.channelName), this.channel.onmessage = (t) => this.handleChannelMessage(t.data);
      } catch {
        this.channel = null;
      }
  }
  initEventListeners() {
    const e = this.doc(), t = this.win();
    if (!e || !t) return;
    const n = () => {
      e.visibilityState === "hidden" && this.options.onVisibilityHidden();
    };
    e.addEventListener("visibilitychange", n), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", n));
    const r = () => {
      this.options.onPageHide();
    };
    t.addEventListener("pagehide", r), this.cleanupFns.push(() => t.removeEventListener("pagehide", r));
    const o = () => {
      this.options.onBeforeUnload();
    };
    t.addEventListener("beforeunload", o), this.cleanupFns.push(() => t.removeEventListener("beforeunload", o));
  }
  getTabId() {
    const e = this.win();
    return e ? (e._wizardTabId || (e._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`), e._wizardTabId) : "tab_missing_window";
  }
  broadcastMessage(e) {
    this.channel?.postMessage(e);
  }
  handleChannelMessage(e) {
    if (!e || e.tabId === this.getTabId())
      return;
    const t = String(e.draftId || "").trim();
    if (!(t === "" || t !== this.activeDraftId))
      switch (e.type) {
        case "sync_completed":
          this.options.onRemoteSync(t, Number(e.revision || 0));
          break;
        case "draft_disposed":
          this.options.onRemoteDraftDisposed?.(t, String(e.reason || "").trim());
          break;
      }
  }
}
const wi = "[esign-send]";
function Lt(i) {
  const e = String(i ?? "").trim();
  return e === "" ? null : e;
}
function Xn(i) {
  const e = Number(i);
  return Number.isFinite(e) ? e : null;
}
function Fr() {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function Xe(i = {}) {
  const {
    state: e,
    storageKey: t,
    ownership: n,
    sendAttemptId: r,
    extra: o = {}
  } = i;
  return {
    wizardId: Lt(e?.wizardId),
    serverDraftId: Lt(e?.serverDraftId),
    serverRevision: Xn(e?.serverRevision),
    currentStep: Xn(e?.currentStep),
    syncPending: e?.syncPending === !0,
    storageKey: Lt(t),
    activeTabOwner: typeof n?.isOwner == "boolean" ? n.isOwner : null,
    activeTabClaimTabId: Lt(n?.claim?.tabId),
    activeTabClaimedAt: Lt(n?.claim?.claimedAt),
    activeTabLastSeenAt: Lt(n?.claim?.lastSeenAt),
    activeTabBlockedReason: Lt(n?.blockedReason),
    sendAttemptId: Lt(r),
    ...o
  };
}
function ht(i, e = {}) {
  console.info(wi, i, e);
}
function Et(i, e = {}) {
  console.warn(wi, i, e);
}
class $r {
  constructor(e) {
    this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.cleanupFns = [], this.options = e, this.stateManager = e.stateManager, this.syncService = e.syncService, this.activeTabController = e.activeTabController;
  }
  start() {
    this.activeTabController.start(), this.syncService.start().catch(() => {
    }), this.bindRefreshEvents(), this.activeTabController.setActiveDraft(this.stateManager.getState()?.serverDraftId || null);
  }
  destroy() {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null), this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.cleanupFns.forEach((e) => e()), this.cleanupFns = [], this.syncService.destroy(), this.activeTabController.stop();
  }
  get isOwner() {
    return !0;
  }
  get currentClaim() {
    return null;
  }
  get lastBlockedReason() {
    return "";
  }
  broadcastStateUpdate() {
    this.activeTabController.setActiveDraft(this.stateManager.getState()?.serverDraftId || null);
  }
  broadcastSyncCompleted(e, t) {
    this.activeTabController.setActiveDraft(e), this.activeTabController.broadcastSyncCompleted(e, t);
  }
  broadcastDraftDisposed(e, t = "") {
    this.activeTabController.broadcastDraftDisposed(e, t);
  }
  async refreshCurrentDraft(e = {}) {
    try {
      const t = await this.syncService.refresh(e);
      return t ? (this.activeTabController.setActiveDraft(t.id), this.options.statusUpdater(this.stateManager.getState().syncPending ? "pending" : "saved"), { success: !0, draftId: t.id, revision: t.revision }) : { skipped: !0, reason: "no_active_draft" };
    } catch (t) {
      return String(t?.code || "").trim().toUpperCase() === "NOT_FOUND" ? { stale: !0, reason: "not_found" } : { error: !0, reason: String(t?.message || "refresh_failed").trim() || "refresh_failed" };
    }
  }
  scheduleSync() {
    this.debounceTimer && clearTimeout(this.debounceTimer), this.options.statusUpdater("pending"), this.debounceTimer = setTimeout(() => {
      this.performSync();
    }, this.options.syncDebounceMs);
  }
  async forceSync() {
    return this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null), this.performSync();
  }
  async performSync() {
    if (this.isSyncing) return { blocked: !0, reason: "sync_in_progress" };
    const e = this.stateManager.getState();
    if (!e.syncPending)
      return this.options.statusUpdater("saved"), { skipped: !0, reason: "not_pending" };
    this.isSyncing = !0, this.options.statusUpdater("saving"), ht("sync_perform_start", Xe({
      state: e,
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: !0,
        claim: null,
        blockedReason: void 0
      },
      sendAttemptId: null,
      extra: {
        mode: e.serverDraftId ? "update" : "bootstrap_autosave",
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        expectedRevision: Number(e.serverRevision || 0)
      }
    }));
    const t = await this.syncService.sync();
    return this.isSyncing = !1, t.success ? (t.result?.id && t.result?.revision && (this.activeTabController.setActiveDraft(t.result.id), this.broadcastSyncCompleted(t.result.id, t.result.revision)), this.options.statusUpdater("saved"), this.retryCount = 0, {
      success: !0,
      draftId: t.result?.id || null,
      revision: t.result?.revision || 0
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), Et("sync_perform_conflict", Xe({
      state: e,
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: !0,
        claim: null,
        blockedReason: void 0
      },
      sendAttemptId: null,
      extra: {
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        currentRevision: Number(t.currentRevision || 0)
      }
    })), { conflict: !0, currentRevision: t.currentRevision }) : (this.options.statusUpdater("error"), this.scheduleRetry(), { error: !0, reason: t.error || "sync_failed" });
  }
  manualRetry() {
    return this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
  }
  scheduleRetry() {
    if (this.retryCount >= this.options.syncRetryDelays.length)
      return;
    const e = this.options.syncRetryDelays[this.retryCount];
    this.retryCount += 1, this.retryTimer = setTimeout(() => {
      this.performSync();
    }, e);
  }
  bindRefreshEvents() {
    const e = this.options.documentRef || (typeof document > "u" ? null : document), t = this.options.windowRef || (typeof window > "u" ? null : window);
    if (!e || !t)
      return;
    const n = () => {
      e.visibilityState !== "hidden" && this.stateManager.getState().serverDraftId && this.refreshCurrentDraft({ preserveDirty: !0, force: !0 });
    };
    t.addEventListener("focus", n), this.cleanupFns.push(() => t.removeEventListener("focus", n));
    const r = () => {
      e.visibilityState === "visible" && this.stateManager.getState().serverDraftId && this.refreshCurrentDraft({ preserveDirty: !0, force: !0 });
    };
    e.addEventListener("visibilitychange", r), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", r));
  }
}
function Br() {
  return function(e, t = {}) {
    const n = String(e || "").trim();
    if (!n || typeof window > "u") return;
    const r = window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {};
    r[n] = Number(r[n] || 0) + 1, window.dispatchEvent(new CustomEvent("esign:wizard-telemetry", {
      detail: {
        event: n,
        count: r[n],
        fields: t,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
  };
}
function vt(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Gt(i, e, t = "") {
  const n = i.querySelector(e);
  return (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && n.value || t;
}
function Nr(i, e, t = !1) {
  const n = i.querySelector(e);
  return n instanceof HTMLInputElement ? n.checked : t;
}
function Wt(i, e) {
  i instanceof HTMLButtonElement && (i.disabled = e);
}
function Ur(i) {
  const {
    documentIdInput: e,
    selectedDocumentTitle: t,
    participantsContainer: n,
    fieldDefinitionsContainer: r,
    submitBtn: o,
    syncOrchestrator: c,
    escapeHtml: s,
    getSignerParticipants: h,
    getCurrentDocumentPageCount: g,
    collectFieldRulesForState: v,
    expandRulesForPreview: x,
    findSignersMissingRequiredSignatureField: _,
    goToStep: b
  } = i;
  function f() {
    const L = vt("send-readiness-loading"), S = vt("send-readiness-results"), C = vt("send-validation-status"), U = vt("send-validation-issues"), X = vt("send-issues-list"), F = vt("send-confirmation"), T = vt("review-agreement-title"), W = vt("review-document-title"), B = vt("review-participant-count"), se = vt("review-stage-count"), fe = vt("review-participants-list"), re = vt("review-fields-summary"), we = document.getElementById("title");
    if (!L || !S || !C || !U || !X || !F || !T || !W || !B || !se || !fe || !re || !(we instanceof HTMLInputElement))
      return;
    const He = we.value || "Untitled", ge = t?.textContent || "No document", he = n.querySelectorAll(".participant-entry"), de = r.querySelectorAll(".field-definition-entry"), Se = x(v(), g()), Re = h(), ze = /* @__PURE__ */ new Set();
    he.forEach((k) => {
      const pe = k.querySelector(".signing-stage-input"), ke = k.querySelector('select[name*=".role"]');
      ke instanceof HTMLSelectElement && ke.value === "signer" && pe instanceof HTMLInputElement && pe.value && ze.add(Number.parseInt(pe.value, 10));
    }), T.textContent = He, W.textContent = ge, B.textContent = `${he.length} (${Re.length} signers)`, se.textContent = String(ze.size > 0 ? ze.size : 1), fe.innerHTML = "", he.forEach((k) => {
      const pe = Gt(k, 'input[name*=".name"]'), ke = Gt(k, 'input[name*=".email"]'), Qe = Gt(k, 'select[name*=".role"]', "signer"), Je = Gt(k, ".signing-stage-input"), it = Nr(k, ".notify-input", !0), st = document.createElement("div");
      st.className = "flex items-center justify-between text-sm", st.innerHTML = `
        <div>
          <span class="font-medium">${s(pe || ke)}</span>
          <span class="text-gray-500 ml-2">${s(ke)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Qe === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Qe === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${it ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${it ? "Notify" : "No Notify"}
          </span>
          ${Qe === "signer" && Je ? `<span class="text-xs text-gray-500">Stage ${Je}</span>` : ""}
        </div>
      `, fe.appendChild(st);
    });
    const nt = de.length + Se.length;
    re.textContent = `${nt} field${nt !== 1 ? "s" : ""} defined (${de.length} manual, ${Se.length} generated)`;
    const Ae = [];
    e?.value || Ae.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), Re.length === 0 && Ae.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), _().forEach((k) => {
      Ae.push({
        severity: "error",
        message: `${k.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Me = Array.from(ze).sort((k, pe) => k - pe);
    for (let k = 0; k < Me.length; k++)
      if (Me[k] !== k + 1) {
        Ae.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const je = Ae.some((k) => k.severity === "error"), lt = Ae.some((k) => k.severity === "warning");
    je ? (C.className = "p-4 rounded-lg bg-red-50 border border-red-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, F.classList.add("hidden"), Wt(o, !0)) : lt ? (C.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, F.classList.remove("hidden"), Wt(o, !1)) : (C.className = "p-4 rounded-lg bg-green-50 border border-green-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, F.classList.remove("hidden"), Wt(o, !1)), c.isOwner || (C.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, F.classList.add("hidden"), Wt(o, !0)), Ae.length > 0 ? (U.classList.remove("hidden"), X.innerHTML = "", Ae.forEach((k) => {
      const pe = document.createElement("li");
      pe.className = `p-3 rounded-lg flex items-center justify-between ${k.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, pe.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${k.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${k.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${s(k.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${k.step}">
            ${s(k.action)}
          </button>
        `, X.appendChild(pe);
    }), X.querySelectorAll("[data-go-to-step]").forEach((k) => {
      k.addEventListener("click", () => {
        const pe = Number(k.getAttribute("data-go-to-step"));
        Number.isFinite(pe) && b(pe);
      });
    })) : U.classList.add("hidden"), L.classList.add("hidden"), S.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: f
  };
}
function Qn(i, e = 0) {
  const t = Number.parseInt(String(i || "").trim(), 10);
  return Number.isFinite(t) ? t : e;
}
function Hr(i) {
  const {
    totalWizardSteps: e,
    wizardStep: t,
    nextStepLabels: n,
    submitBtn: r,
    syncOrchestrator: o,
    previewCard: c,
    updateActiveTabOwnershipUI: s,
    validateStep: h,
    onPlacementStep: g,
    onReviewStep: v,
    onStepChanged: x,
    initialStep: _ = 1
  } = i;
  let b = _;
  const f = Array.from(document.querySelectorAll(".wizard-step-btn")), L = Array.from(document.querySelectorAll(".wizard-step")), S = Array.from(document.querySelectorAll(".wizard-connector")), C = document.getElementById("wizard-prev-btn"), U = document.getElementById("wizard-next-btn"), X = document.getElementById("wizard-save-btn");
  function F() {
    if (f.forEach((B, se) => {
      const fe = se + 1, re = B.querySelector(".wizard-step-number");
      re instanceof HTMLElement && (fe < b ? (B.classList.remove("text-gray-500", "text-blue-600"), B.classList.add("text-green-600"), re.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), re.classList.add("bg-green-600", "text-white"), B.removeAttribute("aria-current")) : fe === b ? (B.classList.remove("text-gray-500", "text-green-600"), B.classList.add("text-blue-600"), re.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), re.classList.add("bg-blue-600", "text-white"), B.setAttribute("aria-current", "step")) : (B.classList.remove("text-blue-600", "text-green-600"), B.classList.add("text-gray-500"), re.classList.remove("bg-blue-600", "text-white", "bg-green-600"), re.classList.add("bg-gray-300", "text-gray-600"), B.removeAttribute("aria-current")));
    }), S.forEach((B, se) => {
      se < b - 1 ? (B.classList.remove("bg-gray-300"), B.classList.add("bg-green-600")) : (B.classList.remove("bg-green-600"), B.classList.add("bg-gray-300"));
    }), L.forEach((B) => {
      Qn(B.dataset.step) === b ? B.classList.remove("hidden") : B.classList.add("hidden");
    }), C?.classList.toggle("hidden", b === 1), U?.classList.toggle("hidden", b === e), X?.classList.toggle("hidden", b !== e), r.classList.toggle("hidden", b !== e), s({
      isOwner: o.isOwner,
      reason: o.lastBlockedReason,
      claim: o.currentClaim
    }), b < e) {
      const B = n[b] || "Next";
      U && (U.innerHTML = `
        ${B}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    b === t.PLACEMENT ? g?.() : b === t.REVIEW && v?.(), c.updateVisibility(b);
  }
  function T(B) {
    if (!(B < t.DOCUMENT || B > e)) {
      if (B > b) {
        for (let se = b; se < B; se++)
          if (!h(se)) return;
      }
      b = B, F(), x?.(B), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function W() {
    f.forEach((B) => {
      B.addEventListener("click", () => {
        const se = Qn(B.dataset.step);
        T(se);
      });
    }), C?.addEventListener("click", () => T(b - 1)), U?.addEventListener("click", () => T(b + 1)), X?.addEventListener("click", () => {
      const B = document.getElementById("agreement-form");
      if (!(B instanceof HTMLFormElement)) return;
      const se = document.createElement("input");
      se.type = "hidden", se.name = "save_as_draft", se.value = "1", B.appendChild(se), B.submit();
    });
  }
  return {
    bindEvents: W,
    getCurrentStep() {
      return b;
    },
    setCurrentStep(B) {
      b = B;
    },
    goToStep: T,
    updateWizardUI: F
  };
}
function Zn(i) {
  return i.querySelector('select[name*=".role"]');
}
function zr(i) {
  return i.querySelector(".field-participant-select");
}
function Xt(i) {
  return typeof i == "object" && i !== null;
}
function Or(i, e, t = {}) {
  const n = new Error(e);
  return n.code = String(i).trim(), Number(t.status || 0) > 0 && (n.status = Number(t.status || 0)), Number(t.currentRevision || 0) > 0 && (n.currentRevision = Number(t.currentRevision || 0)), Number(t.conflict?.currentRevision || 0) > 0 && (n.conflict = {
    currentRevision: Number(t.conflict?.currentRevision || 0)
  }), n;
}
function jr(i, e = 0) {
  if (!Xt(i))
    return Number(e || 0);
  const t = i, n = Number(t.currentRevision || 0);
  if (n > 0)
    return n;
  const r = Number(t.conflict?.currentRevision || 0);
  return r > 0 ? r : Number(e || 0);
}
function qr(i) {
  const {
    config: e,
    form: t,
    submitBtn: n,
    documentIdInput: r,
    documentSearch: o,
    participantsContainer: c,
    addParticipantBtn: s,
    fieldDefinitionsContainer: h,
    fieldRulesContainer: g,
    documentPageCountInput: v,
    fieldPlacementsJSONInput: x,
    fieldRulesJSONInput: _,
    storageKey: b,
    syncService: f,
    syncOrchestrator: L,
    stateManager: S,
    submitMode: C,
    totalWizardSteps: U,
    wizardStep: X,
    getCurrentStep: F,
    getPlacementState: T,
    getCurrentDocumentPageCount: W,
    ensureSelectedDocumentCompatibility: B,
    collectFieldRulesForState: se,
    collectFieldRulesForForm: fe,
    expandRulesForPreview: re,
    findSignersMissingRequiredSignatureField: we,
    missingSignatureFieldMessage: He,
    getSignerParticipants: ge,
    buildCanonicalAgreementPayload: he,
    announceError: de,
    emitWizardTelemetry: Se,
    parseAPIError: Re,
    goToStep: ze,
    showSyncConflictDialog: nt,
    surfaceSyncOutcome: Ae,
    updateSyncStatus: et,
    activeTabOwnershipRequiredCode: Me = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: je,
    addFieldBtn: lt
  } = i;
  let k = null;
  function pe() {
    return je?.() || {};
  }
  function ke(me, xe = !1) {
    n.setAttribute("aria-busy", xe ? "true" : "false"), n.innerHTML = xe ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${me}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${me}
        `;
  }
  async function Qe() {
    ht("persist_latest_wizard_state_start", Xe({
      state: S.getState(),
      storageKey: b,
      ownership: pe(),
      sendAttemptId: k
    })), S.updateState(S.collectFormState());
    const me = await L.forceSync();
    if (me?.blocked && me.reason === "passive_tab")
      throw Et("persist_latest_wizard_state_blocked", Xe({
        state: S.getState(),
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          reason: me.reason
        }
      })), {
        code: Me,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const xe = S.getState();
    if (xe?.syncPending)
      throw Et("persist_latest_wizard_state_unsynced", Xe({
        state: xe,
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k
      })), new Error("Unable to sync latest draft changes");
    return ht("persist_latest_wizard_state_complete", Xe({
      state: xe,
      storageKey: b,
      ownership: pe(),
      sendAttemptId: k
    })), xe;
  }
  async function Je() {
    ht("ensure_draft_ready_for_send_start", Xe({
      state: S.getState(),
      storageKey: b,
      ownership: pe(),
      sendAttemptId: k
    }));
    const me = await Qe(), xe = String(me?.serverDraftId || "").trim();
    if (!xe) {
      Et("ensure_draft_ready_for_send_missing_draft", Xe({
        state: me,
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          action: "create_draft"
        }
      }));
      const Fe = await f.create(me), Ye = String(Fe.id || "").trim(), P = Number(Fe.revision || 0);
      return Ye && P > 0 && S.markSynced(Ye, P), ht("ensure_draft_ready_for_send_created", Xe({
        state: S.getState(),
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          loadedDraftId: Ye,
          loadedRevision: P
        }
      })), {
        draftID: Ye,
        revision: P
      };
    }
    try {
      ht("ensure_draft_ready_for_send_loading", Xe({
        state: me,
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          targetDraftId: xe
        }
      }));
      const Fe = await f.load(xe), Ye = String(Fe?.id || xe).trim(), P = Number(Fe?.revision || me?.serverRevision || 0);
      return Ye && P > 0 && S.markSynced(Ye, P), ht("ensure_draft_ready_for_send_loaded", Xe({
        state: S.getState(),
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          loadedDraftId: Ye,
          loadedRevision: P
        }
      })), {
        draftID: Ye,
        revision: P > 0 ? P : Number(me?.serverRevision || 0)
      };
    } catch (Fe) {
      throw Number(Xt(Fe) && Fe.status || 0) !== 404 ? (Et("ensure_draft_ready_for_send_load_failed", Xe({
        state: me,
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          targetDraftId: xe,
          status: Number(Xt(Fe) && Fe.status || 0)
        }
      })), Fe) : (Et("ensure_draft_ready_for_send_missing_remote_draft", Xe({
        state: me,
        storageKey: b,
        ownership: pe(),
        sendAttemptId: k,
        extra: {
          targetDraftId: xe,
          status: 404
        }
      })), Se("wizard_send_not_found", {
        draft_id: xe,
        status: 404,
        phase: "pre_send"
      }), await it().catch(() => {
      }), Or(
        "DRAFT_SEND_NOT_FOUND",
        "Draft not found",
        { status: 404 }
      ));
    }
  }
  async function it() {
    const me = S.getState();
    S.setState({
      ...me,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await L.forceSync();
  }
  function st() {
    t.addEventListener("submit", function(me) {
      if (he(), !r.value) {
        me.preventDefault(), de("Please select a document"), o.focus();
        return;
      }
      if (!B()) {
        me.preventDefault();
        return;
      }
      const xe = c.querySelectorAll(".participant-entry");
      if (xe.length === 0) {
        me.preventDefault(), de("Please add at least one participant"), s.focus();
        return;
      }
      let Fe = !1;
      if (xe.forEach((Q) => {
        Zn(Q)?.value === "signer" && (Fe = !0);
      }), !Fe) {
        me.preventDefault(), de("At least one signer is required");
        const Q = xe[0] ? Zn(xe[0]) : null;
        Q && Q.focus();
        return;
      }
      const Ye = h.querySelectorAll(".field-definition-entry"), P = we();
      if (P.length > 0) {
        me.preventDefault(), de(He(P)), ze(X.FIELDS), lt.focus();
        return;
      }
      let M = !1;
      if (Ye.forEach((Q) => {
        zr(Q)?.value || (M = !0);
      }), M) {
        me.preventDefault(), de("Please assign all fields to a signer");
        const Q = h.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        Q && Q.focus();
        return;
      }
      if (se().some((Q) => !Q.participantId)) {
        me.preventDefault(), de("Please assign all automation rules to a signer"), Array.from(g?.querySelectorAll(".field-rule-participant-select") || []).find((Ie) => !Ie.value)?.focus();
        return;
      }
      const ie = !!t.querySelector('input[name="save_as_draft"]'), te = F() === U && !ie;
      if (te) {
        let Q = t.querySelector('input[name="send_for_signature"]');
        Q || (Q = document.createElement("input"), Q.type = "hidden", Q.name = "send_for_signature", t.appendChild(Q)), Q.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (C === "json") {
        me.preventDefault(), n.disabled = !0, ke(te ? "Sending..." : "Saving...", !0), (async () => {
          try {
            he();
            const Q = String(e.routes?.index || "").trim();
            if (!te) {
              if (await Qe(), Q) {
                window.location.href = Q;
                return;
              }
              window.location.reload();
              return;
            }
            k = Fr(), ht("send_submit_start", Xe({
              state: S.getState(),
              storageKey: b,
              ownership: pe(),
              sendAttemptId: k
            }));
            const Ie = await Je(), ue = String(Ie?.draftID || "").trim(), q = Number(Ie?.revision || 0);
            if (!ue || q <= 0)
              throw new Error("Draft session not available. Please try again.");
            ht("send_request_start", Xe({
              state: S.getState(),
              storageKey: b,
              ownership: pe(),
              sendAttemptId: k,
              extra: {
                targetDraftId: ue,
                expectedRevision: q
              }
            }));
            const Z = await f.send(q, k || ue), ve = String(
              Z?.agreement_id || Z?.id || Z?.data?.agreement_id || Z?.data?.id || ""
            ).trim();
            if (ht("send_request_success", Xe({
              state: S.getState(),
              storageKey: b,
              ownership: pe(),
              sendAttemptId: k,
              extra: {
                targetDraftId: ue,
                expectedRevision: q,
                agreementId: ve
              }
            })), S.clear(), L.broadcastStateUpdate(), L.broadcastDraftDisposed?.(ue, "send_completed"), k = null, ve && Q) {
              window.location.href = `${Q}/${encodeURIComponent(ve)}`;
              return;
            }
            if (Q) {
              window.location.href = Q;
              return;
            }
            window.location.reload();
          } catch (Q) {
            const Ie = Xt(Q) ? Q : {}, ue = String(Ie.message || "Failed to process agreement").trim();
            let q = String(Ie.code || "").trim();
            const Z = Number(Ie.status || 0);
            if (q.toUpperCase() === "STALE_REVISION") {
              const ve = jr(Q, Number(S.getState()?.serverRevision || 0));
              et?.("conflict"), nt?.(ve), Se("wizard_send_conflict", {
                draft_id: String(S.getState()?.serverDraftId || "").trim(),
                current_revision: ve,
                status: Z || 409
              }), n.disabled = !1, ke("Send for Signature", !1), k = null;
              return;
            }
            q.toUpperCase() === "NOT_FOUND" && (q = "DRAFT_SEND_NOT_FOUND", Se("wizard_send_not_found", {
              draft_id: String(S.getState()?.serverDraftId || "").trim(),
              status: Z || 404
            }), await it().catch(() => {
            })), Et("send_request_failed", Xe({
              state: S.getState(),
              storageKey: b,
              ownership: pe(),
              sendAttemptId: k,
              extra: {
                code: q || null,
                status: Z,
                message: ue
              }
            })), de(ue, q, Z), n.disabled = !1, ke("Send for Signature", !1), k = null;
          }
        })();
        return;
      }
      n.disabled = !0, ke(te ? "Sending..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: st,
    ensureDraftReadyForSend: Je,
    persistLatestWizardState: Qe,
    resyncAfterSendNotFound: it
  };
}
const ei = 150, ti = 32;
function Ue(i) {
  return i == null ? "" : String(i).trim();
}
function Si(i) {
  if (typeof i == "boolean") return i;
  const e = Ue(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Vr(i) {
  return Ue(i).toLowerCase();
}
function Ze(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(Ue(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Jt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(Ue(i));
  return Number.isFinite(t) ? t : e;
}
function Qt(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function jt(i, e) {
  const t = Ze(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function zt(i, e, t = 1) {
  const n = Ze(t, 1), r = Ze(i, n);
  return e > 0 ? Qt(r, 1, e) : r > 0 ? r : n;
}
function Gr(i, e, t) {
  const n = Ze(t, 1);
  let r = jt(i, n), o = jt(e, n);
  return r <= 0 && (r = 1), o <= 0 && (o = n), o < r ? { start: o, end: r } : { start: r, end: o };
}
function sn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => Ue(n)) : Ue(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const r = Ze(n, 0);
    r > 0 && t.add(r);
  }), Array.from(t).sort((n, r) => n - r);
}
function Zt(i, e) {
  const t = Ze(e, 1), n = Ue(i.participantId ?? i.participant_id), r = sn(i.excludePages ?? i.exclude_pages), o = i.required, c = typeof o == "boolean" ? o : !["0", "false", "off", "no"].includes(Ue(o).toLowerCase());
  return {
    id: Ue(i.id),
    type: Vr(i.type),
    participantId: n,
    participantTempId: Ue(i.participantTempId) || n,
    fromPage: jt(i.fromPage ?? i.from_page, t),
    toPage: jt(i.toPage ?? i.to_page, t),
    page: jt(i.page, t),
    excludeLastPage: Si(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: r,
    required: c
  };
}
function Wr(i, e) {
  const t = Ue(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Jr(i, e) {
  const t = Ze(e, 1), n = [];
  return i.forEach((r, o) => {
    const c = Zt(r || {}, t);
    if (c.type === "") return;
    const s = Wr(c, o);
    if (c.type === "initials_each_page") {
      const h = Gr(c.fromPage, c.toPage, t), g = /* @__PURE__ */ new Set();
      sn(c.excludePages).forEach((v) => {
        v <= t && g.add(v);
      }), c.excludeLastPage && g.add(t);
      for (let v = h.start; v <= h.end; v += 1)
        g.has(v) || n.push({
          id: `${s}-initials-${v}`,
          type: "initials",
          page: v,
          participantId: Ue(c.participantId),
          required: c.required !== !1,
          ruleId: s
          // Track rule ID for link group creation.
        });
      return;
    }
    if (c.type === "signature_once") {
      let h = c.page > 0 ? c.page : c.toPage > 0 ? c.toPage : t;
      h <= 0 && (h = 1), n.push({
        id: `${s}-signature-${h}`,
        type: "signature",
        page: h,
        participantId: Ue(c.participantId),
        required: c.required !== !1,
        ruleId: s
        // Track rule ID for link group creation.
      });
    }
  }), n.sort((r, o) => r.page !== o.page ? r.page - o.page : r.id.localeCompare(o.id)), n;
}
function Yr(i, e, t, n, r) {
  const o = Ze(t, 1);
  let c = i > 0 ? i : 1, s = e > 0 ? e : o;
  c = Qt(c, 1, o), s = Qt(s, 1, o), s < c && ([c, s] = [s, c]);
  const h = /* @__PURE__ */ new Set();
  r.forEach((v) => {
    const x = Ze(v, 0);
    x > 0 && h.add(Qt(x, 1, o));
  }), n && h.add(o);
  const g = [];
  for (let v = c; v <= s; v += 1)
    h.has(v) || g.push(v);
  return {
    pages: g,
    rangeStart: c,
    rangeEnd: s,
    excludedPages: Array.from(h).sort((v, x) => v - x),
    isEmpty: g.length === 0
  };
}
function Kr(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let r = 1; r <= e.length; r += 1)
    if (r === e.length || e[r] !== e[r - 1] + 1) {
      const o = e[n], c = e[r - 1];
      o === c ? t.push(String(o)) : c === o + 1 ? t.push(`${o}, ${c}`) : t.push(`${o}-${c}`), n = r;
    }
  return `pages ${t.join(", ")}`;
}
function vn(i) {
  const e = i || {};
  return {
    id: Ue(e.id),
    title: Ue(e.title || e.name) || "Untitled",
    pageCount: Ze(e.page_count ?? e.pageCount, 0),
    compatibilityTier: Ue(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: Ue(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function xi(i) {
  const e = Ue(i).toLowerCase();
  if (e === "") return gt.MANUAL;
  switch (e) {
    case gt.AUTO:
    case gt.MANUAL:
    case gt.AUTO_LINKED:
    case gt.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function qt(i, e = 0) {
  const t = i || {}, n = Ue(t.id) || `fi_init_${e}`, r = Ue(t.definitionId || t.definition_id || t.field_definition_id) || n, o = Ze(t.page ?? t.page_number, 1), c = Jt(t.x ?? t.pos_x, 0), s = Jt(t.y ?? t.pos_y, 0), h = Jt(t.width, ei), g = Jt(t.height, ti);
  return {
    id: n,
    definitionId: r,
    type: Ue(t.type) || "text",
    participantId: Ue(t.participantId || t.participant_id),
    participantName: Ue(t.participantName || t.participant_name) || "Unassigned",
    page: o > 0 ? o : 1,
    x: c >= 0 ? c : 0,
    y: s >= 0 ? s : 0,
    width: h > 0 ? h : ei,
    height: g > 0 ? g : ti,
    placementSource: xi(t.placementSource || t.placement_source),
    linkGroupId: Ue(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: Ue(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: Si(t.isUnlinked ?? t.is_unlinked)
  };
}
function Xr(i, e = 0) {
  const t = qt(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: xi(t.placementSource),
    link_group_id: Ue(t.linkGroupId),
    linked_from_field_id: Ue(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Ge(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function It(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function _t(i) {
  return typeof i == "object" && i !== null;
}
function Qr(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentsUploadURL: n,
    isEditMode: r,
    titleSource: o,
    normalizeTitleSource: c,
    stateManager: s,
    previewCard: h,
    parseAPIError: g,
    announceError: v,
    showToast: x,
    mapUserFacingError: _,
    renderFieldRulePreview: b
  } = i, f = Ge("document_id"), L = Ge("selected-document"), S = Ge("document-picker"), C = Ge("document-search"), U = Ge("document-list"), X = Ge("change-document-btn"), F = Ge("selected-document-title"), T = Ge("selected-document-info"), W = Ge("document_page_count"), B = Ge("document-remediation-panel"), se = Ge("document-remediation-message"), fe = Ge("document-remediation-status"), re = Ge("document-remediation-trigger-btn"), we = Ge("document-remediation-dismiss-btn"), He = Ge("title"), ge = 300, he = 5, de = 10, Se = Ge("document-typeahead"), Re = Ge("document-typeahead-dropdown"), ze = Ge("document-recent-section"), nt = Ge("document-recent-list"), Ae = Ge("document-search-section"), et = Ge("document-search-list"), Me = Ge("document-empty-state"), je = Ge("document-dropdown-loading"), lt = Ge("document-search-loading"), k = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let pe = [], ke = null, Qe = 0, Je = null;
  const it = /* @__PURE__ */ new Set(), st = /* @__PURE__ */ new Map();
  function me(D) {
    return String(D || "").trim().toLowerCase();
  }
  function xe(D) {
    return String(D || "").trim().toLowerCase();
  }
  function Fe(D) {
    return me(D) === "unsupported";
  }
  function Ye() {
    !r && He && He.value.trim() !== "" && !s.hasResumableState() && s.setTitleSource(o.SERVER_SEED, { syncPending: !1 });
  }
  function P(D) {
    const $ = Ze(D, 0);
    W && (W.value = String($));
  }
  function M() {
    const D = Ze(W?.value || "0", 0);
    if (D > 0) return D;
    const $ = String(T?.textContent || "").match(/(\d+)\s+pages?/i);
    if ($) {
      const N = Ze($[1], 0);
      if (N > 0) return N;
    }
    return 1;
  }
  function Y() {
    f && (f.value = ""), F && (F.textContent = ""), T && (T.textContent = ""), P(0), s.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), h.setDocument(null, null, null);
  }
  function H(D = "") {
    const $ = "This document cannot be used because its PDF is incompatible with online signing.", N = xe(D);
    return N ? `${$} Reason: ${N}. Select another document or upload a remediated PDF.` : `${$} Select another document or upload a remediated PDF.`;
  }
  function ie() {
    ke = null, fe && (fe.textContent = "", fe.className = "mt-2 text-xs text-amber-800"), B && B.classList.add("hidden"), re && (re.disabled = !1, re.textContent = "Remediate PDF");
  }
  function te(D, $ = "info") {
    if (!fe) return;
    const N = String(D || "").trim();
    fe.textContent = N;
    const K = $ === "error" ? "text-red-700" : $ === "success" ? "text-green-700" : "text-amber-800";
    fe.className = `mt-2 text-xs ${K}`;
  }
  function Q(D, $ = "") {
    !D || !B || !se || (ke = {
      id: String(D.id || "").trim(),
      title: String(D.title || "").trim(),
      pageCount: Ze(D.pageCount, 0),
      compatibilityReason: xe($ || D.compatibilityReason || "")
    }, ke.id && (se.textContent = H(ke.compatibilityReason), te("Run remediation to make this document signable."), B.classList.remove("hidden")));
  }
  function Ie(D) {
    const $ = He;
    if (!$) return;
    const N = s.getState(), K = $.value.trim(), ae = c(
      N?.titleSource,
      K === "" ? o.AUTOFILL : o.USER
    );
    if (K && ae === o.USER)
      return;
    const ee = String(D || "").trim();
    ee && ($.value = ee, s.updateDetails({
      title: ee,
      message: s.getState().details.message || ""
    }, { titleSource: o.AUTOFILL }));
  }
  function ue(D, $, N) {
    if (!f || !F || !T || !L || !S)
      return;
    f.value = String(D || ""), F.textContent = $ || "", T.textContent = `${N} pages`, P(N), L.classList.remove("hidden"), S.classList.add("hidden"), b(), Ie($);
    const K = Ze(N, 0);
    s.updateDocument({
      id: D,
      title: $,
      pageCount: K
    }), h.setDocument(D, $, K), ie();
  }
  function q(D) {
    const $ = String(D || "").trim();
    if ($ === "") return null;
    const N = pe.find((ee) => String(ee.id || "").trim() === $);
    if (N) return N;
    const K = k.recentDocuments.find((ee) => String(ee.id || "").trim() === $);
    if (K) return K;
    const ae = k.searchResults.find((ee) => String(ee.id || "").trim() === $);
    return ae || null;
  }
  function Z() {
    const D = q(f?.value || "");
    if (!D) return !0;
    const $ = me(D.compatibilityTier);
    return Fe($) ? (Q(D, D.compatibilityReason || ""), Y(), v(H(D.compatibilityReason || "")), L && L.classList.add("hidden"), S && S.classList.remove("hidden"), C?.focus(), !1) : (ie(), !0);
  }
  function ve() {
    if (!F || !T || !L || !S)
      return;
    const D = (f?.value || "").trim();
    if (!D) return;
    const $ = pe.find((N) => String(N.id || "").trim() === D);
    $ && (F.textContent.trim() || (F.textContent = $.title || "Untitled"), (!T.textContent.trim() || T.textContent.trim() === "pages") && (T.textContent = `${$.pageCount || 0} pages`), P($.pageCount || 0), L.classList.remove("hidden"), S.classList.add("hidden"));
  }
  async function Ee() {
    try {
      const D = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), $ = await fetch(`${e}/panels/esign_documents?${D.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!$.ok)
        throw await g($, "Failed to load documents");
      const N = await $.json();
      pe = (Array.isArray(N?.records) ? N.records : Array.isArray(N?.items) ? N.items : []).slice().sort((ee, Le) => {
        const Oe = Date.parse(String(ee?.created_at ?? ee?.createdAt ?? ee?.updated_at ?? ee?.updatedAt ?? "")), mt = Date.parse(String(Le?.created_at ?? Le?.createdAt ?? Le?.updated_at ?? Le?.updatedAt ?? "")), O = Number.isFinite(Oe) ? Oe : 0;
        return (Number.isFinite(mt) ? mt : 0) - O;
      }).map((ee) => vn(ee)).filter((ee) => ee.id !== ""), De(pe), ve();
    } catch (D) {
      const $ = _t(D) ? String(D.message || "Failed to load documents") : "Failed to load documents", N = _t(D) ? String(D.code || "") : "", K = _t(D) ? Number(D.status || 0) : 0, ae = _($, N, K);
      U && (U.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${It(ae)}</div>`);
    }
  }
  function De(D) {
    if (!U) return;
    if (D.length === 0) {
      U.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${It(n)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    U.innerHTML = D.map((N, K) => {
      const ae = It(String(N.id || "").trim()), ee = It(String(N.title || "").trim()), Le = String(Ze(N.pageCount, 0)), Oe = me(N.compatibilityTier), mt = xe(N.compatibilityReason), O = It(Oe), le = It(mt), tt = Fe(Oe) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${K === 0 ? "0" : "-1"}"
                data-document-id="${ae}"
                data-document-title="${ee}"
                data-document-pages="${Le}"
                data-document-compatibility-tier="${O}"
                data-document-compatibility-reason="${le}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${ee}</div>
            <div class="text-xs text-gray-500">${Le} pages ${tt}</div>
          </div>
        </button>
      `;
    }).join("");
    const $ = Array.from(U.querySelectorAll(".document-option"));
    $.forEach((N, K) => {
      N.addEventListener("click", () => Be(N)), N.addEventListener("keydown", (ae) => {
        let ee = K;
        if (ae.key === "ArrowDown")
          ae.preventDefault(), ee = Math.min(K + 1, $.length - 1);
        else if (ae.key === "ArrowUp")
          ae.preventDefault(), ee = Math.max(K - 1, 0);
        else if (ae.key === "Enter" || ae.key === " ") {
          ae.preventDefault(), Be(N);
          return;
        } else ae.key === "Home" ? (ae.preventDefault(), ee = 0) : ae.key === "End" && (ae.preventDefault(), ee = $.length - 1);
        ee !== K && ($[ee].focus(), $[ee].setAttribute("tabindex", "0"), N.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Be(D) {
    const $ = D.getAttribute("data-document-id"), N = D.getAttribute("data-document-title"), K = D.getAttribute("data-document-pages"), ae = me(D.getAttribute("data-document-compatibility-tier")), ee = xe(D.getAttribute("data-document-compatibility-reason"));
    if (Fe(ae)) {
      Q({ id: String($ || ""), title: String(N || ""), pageCount: Ze(K, 0), compatibilityReason: ee }), Y(), v(H(ee)), C?.focus();
      return;
    }
    ue($, N, K);
  }
  async function y(D, $, N) {
    const K = String(D || "").trim();
    if (!K) return;
    const ae = Date.now(), ee = 12e4, Le = 1250;
    for (; Date.now() - ae < ee; ) {
      const Oe = await fetch(K, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!Oe.ok)
        throw await g(Oe, "Failed to read remediation status");
      const O = (await Oe.json())?.dispatch || {}, le = String(O?.status || "").trim().toLowerCase();
      if (le === "succeeded") {
        te("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (le === "failed" || le === "canceled" || le === "dead_letter") {
        const tt = String(O?.terminal_reason || "").trim();
        throw { message: tt ? `Remediation failed: ${tt}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      te(le === "retrying" ? "Remediation is retrying in the queue..." : le === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((tt) => setTimeout(tt, Le));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${$} (${N})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function w() {
    const D = ke;
    if (!D || !D.id) return;
    const $ = String(D.id || "").trim();
    if (!(!$ || it.has($))) {
      it.add($), re && (re.disabled = !0, re.textContent = "Remediating...");
      try {
        let N = st.get($) || "";
        N || (N = `esign-remediate-${$}-${Date.now()}`, st.set($, N));
        const K = `${t}/esign/documents/${encodeURIComponent($)}/remediate`, ae = await fetch(K, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": N
          }
        });
        if (!ae.ok)
          throw await g(ae, "Failed to trigger remediation");
        const ee = await ae.json(), Le = ee?.receipt || {}, Oe = String(Le?.dispatch_id || ee?.dispatch_id || "").trim(), mt = String(Le?.mode || ee?.mode || "").trim().toLowerCase();
        let O = String(ee?.dispatch_status_url || "").trim();
        !O && Oe && (O = `${t}/esign/dispatches/${encodeURIComponent(Oe)}`), mt === "queued" && Oe && O && (te("Remediation queued. Monitoring progress..."), await y(O, Oe, $)), await Ee();
        const le = q($);
        if (!le || Fe(le.compatibilityTier)) {
          te("Remediation finished, but this PDF is still incompatible.", "error"), v("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        ue(le.id, le.title, le.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : x("Document remediated successfully. You can continue.", "success");
      } catch (N) {
        const K = _t(N) ? String(N.message || "Remediation failed").trim() : "Remediation failed", ae = _t(N) ? String(N.code || "") : "", ee = _t(N) ? Number(N.status || 0) : 0;
        te(K, "error"), v(K, ae, ee);
      } finally {
        it.delete($), re && (re.disabled = !1, re.textContent = "Remediate PDF");
      }
    }
  }
  function E(D, $) {
    let N = null;
    return (...K) => {
      N !== null && clearTimeout(N), N = setTimeout(() => {
        D(...K), N = null;
      }, $);
    };
  }
  async function z() {
    try {
      const D = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(he)
      }), $ = await fetch(`${e}/panels/esign_documents?${D}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!$.ok) {
        console.warn("Failed to load recent documents:", $.status);
        return;
      }
      const N = await $.json(), K = Array.isArray(N?.records) ? N.records : Array.isArray(N?.items) ? N.items : [];
      k.recentDocuments = K.map((ae) => vn(ae)).filter((ae) => ae.id !== "").slice(0, he);
    } catch (D) {
      console.warn("Error loading recent documents:", D);
    }
  }
  async function j(D) {
    const $ = D.trim();
    if (!$) {
      Je && (Je.abort(), Je = null), k.isSearchMode = !1, k.searchResults = [], Ce();
      return;
    }
    const N = ++Qe;
    Je && Je.abort(), Je = new AbortController(), k.isLoading = !0, k.isSearchMode = !0, Ce();
    try {
      const K = new URLSearchParams({
        q: $,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(de)
      }), ae = await fetch(`${e}/panels/esign_documents?${K}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Je.signal
      });
      if (N !== Qe) return;
      if (!ae.ok) {
        console.warn("Failed to search documents:", ae.status), k.searchResults = [], k.isLoading = !1, Ce();
        return;
      }
      const ee = await ae.json(), Le = Array.isArray(ee?.records) ? ee.records : Array.isArray(ee?.items) ? ee.items : [];
      k.searchResults = Le.map((Oe) => vn(Oe)).filter((Oe) => Oe.id !== "").slice(0, de);
    } catch (K) {
      if (_t(K) && K.name === "AbortError")
        return;
      console.warn("Error searching documents:", K), k.searchResults = [];
    } finally {
      N === Qe && (k.isLoading = !1, Ce());
    }
  }
  const G = E(j, ge);
  function oe() {
    Re && (k.isOpen = !0, k.selectedIndex = -1, Re.classList.remove("hidden"), C?.setAttribute("aria-expanded", "true"), U?.classList.add("hidden"), Ce());
  }
  function ce() {
    Re && (k.isOpen = !1, k.selectedIndex = -1, Re.classList.add("hidden"), C?.setAttribute("aria-expanded", "false"), U?.classList.remove("hidden"));
  }
  function $e(D, $, N) {
    D && (D.innerHTML = $.map((K, ae) => {
      const ee = ae, Le = k.selectedIndex === ee, Oe = It(String(K.id || "").trim()), mt = It(String(K.title || "").trim()), O = String(Ze(K.pageCount, 0)), le = me(K.compatibilityTier), dt = xe(K.compatibilityReason), tt = It(le), Ut = It(dt), ln = Fe(le) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${Le ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${Le}"
          tabindex="-1"
          data-document-id="${Oe}"
          data-document-title="${mt}"
          data-document-pages="${O}"
          data-document-compatibility-tier="${tt}"
          data-document-compatibility-reason="${Ut}"
          data-typeahead-index="${ee}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${mt}</div>
            <div class="text-xs text-gray-500">${O} pages ${ln}</div>
          </div>
        </button>
      `;
    }).join(""), D.querySelectorAll(".typeahead-option").forEach((K) => {
      K.addEventListener("click", () => Ke(K));
    }));
  }
  function Ce() {
    if (Re) {
      if (k.isLoading) {
        je?.classList.remove("hidden"), ze?.classList.add("hidden"), Ae?.classList.add("hidden"), Me?.classList.add("hidden"), lt?.classList.remove("hidden");
        return;
      }
      je?.classList.add("hidden"), lt?.classList.add("hidden"), k.isSearchMode ? (ze?.classList.add("hidden"), k.searchResults.length > 0 ? (Ae?.classList.remove("hidden"), Me?.classList.add("hidden"), $e(et, k.searchResults)) : (Ae?.classList.add("hidden"), Me?.classList.remove("hidden"))) : (Ae?.classList.add("hidden"), k.recentDocuments.length > 0 ? (ze?.classList.remove("hidden"), Me?.classList.add("hidden"), $e(nt, k.recentDocuments)) : (ze?.classList.add("hidden"), Me?.classList.remove("hidden"), Me && (Me.textContent = "No recent documents")));
    }
  }
  function Ke(D) {
    const $ = D.getAttribute("data-document-id"), N = D.getAttribute("data-document-title"), K = D.getAttribute("data-document-pages"), ae = me(D.getAttribute("data-document-compatibility-tier")), ee = xe(D.getAttribute("data-document-compatibility-reason"));
    if ($) {
      if (Fe(ae)) {
        Q({ id: String($ || ""), title: String(N || ""), pageCount: Ze(K, 0), compatibilityReason: ee }), Y(), v(H(ee)), C?.focus();
        return;
      }
      ue($, N, K), ce(), C && (C.value = ""), k.query = "", k.isSearchMode = !1, k.searchResults = [];
    }
  }
  function Ne() {
    if (!Re) return;
    const D = Re.querySelector(`[data-typeahead-index="${k.selectedIndex}"]`);
    D && D.scrollIntoView({ block: "nearest" });
  }
  function at(D) {
    if (!k.isOpen) {
      (D.key === "ArrowDown" || D.key === "Enter") && (D.preventDefault(), oe());
      return;
    }
    const $ = k.isSearchMode ? k.searchResults : k.recentDocuments, N = $.length - 1;
    switch (D.key) {
      case "ArrowDown":
        D.preventDefault(), k.selectedIndex = Math.min(k.selectedIndex + 1, N), Ce(), Ne();
        break;
      case "ArrowUp":
        D.preventDefault(), k.selectedIndex = Math.max(k.selectedIndex - 1, 0), Ce(), Ne();
        break;
      case "Enter":
        if (D.preventDefault(), k.selectedIndex >= 0 && k.selectedIndex <= N) {
          const K = $[k.selectedIndex];
          if (K) {
            const ae = document.createElement("button");
            ae.setAttribute("data-document-id", K.id), ae.setAttribute("data-document-title", K.title), ae.setAttribute("data-document-pages", String(K.pageCount)), ae.setAttribute("data-document-compatibility-tier", String(K.compatibilityTier || "")), ae.setAttribute("data-document-compatibility-reason", String(K.compatibilityReason || "")), Ke(ae);
          }
        }
        break;
      case "Escape":
        D.preventDefault(), ce();
        break;
      case "Tab":
        ce();
        break;
      case "Home":
        D.preventDefault(), k.selectedIndex = 0, Ce(), Ne();
        break;
      case "End":
        D.preventDefault(), k.selectedIndex = N, Ce(), Ne();
        break;
    }
  }
  function qe() {
    X && X.addEventListener("click", () => {
      L?.classList.add("hidden"), S?.classList.remove("hidden"), ie(), C?.focus(), oe();
    }), re && re.addEventListener("click", () => {
      w();
    }), we && we.addEventListener("click", () => {
      ie(), C?.focus();
    }), C && (C.addEventListener("input", (D) => {
      const $ = D.target;
      if (!($ instanceof HTMLInputElement)) return;
      const N = $.value;
      k.query = N, k.isOpen || oe(), N.trim() ? (k.isLoading = !0, Ce(), G(N)) : (k.isSearchMode = !1, k.searchResults = [], Ce());
      const K = pe.filter(
        (ae) => String(ae.title || "").toLowerCase().includes(N.toLowerCase())
      );
      De(K);
    }), C.addEventListener("focus", () => {
      oe();
    }), C.addEventListener("keydown", at)), document.addEventListener("click", (D) => {
      const $ = D.target;
      Se && !($ instanceof Node && Se.contains($)) && ce();
    });
  }
  return {
    refs: {
      documentIdInput: f,
      selectedDocument: L,
      documentPicker: S,
      documentSearch: C,
      documentList: U,
      selectedDocumentTitle: F,
      selectedDocumentInfo: T,
      documentPageCountInput: W
    },
    bindEvents: qe,
    initializeTitleSourceSeed: Ye,
    loadDocuments: Ee,
    loadRecentDocuments: z,
    ensureSelectedDocumentCompatibility: Z,
    getCurrentDocumentPageCount: M
  };
}
function wt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function bn(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Zr(i = {}) {
  const {
    initialParticipants: e = [],
    onParticipantsChanged: t
  } = i, n = document.getElementById("participants-container"), r = document.getElementById("participant-template"), o = document.getElementById("add-participant-btn");
  let c = 0, s = 0;
  function h() {
    return `temp_${Date.now()}_${c++}`;
  }
  function g(L = {}) {
    if (!(r instanceof HTMLTemplateElement) || !n)
      return;
    const S = r.content.cloneNode(!0), C = S.querySelector(".participant-entry");
    if (!(C instanceof HTMLElement)) return;
    const U = L.id || h();
    C.setAttribute("data-participant-id", U);
    const X = wt(C, ".participant-id-input"), F = wt(C, 'input[name="participants[].name"]'), T = wt(C, 'input[name="participants[].email"]'), W = bn(C, 'select[name="participants[].role"]'), B = wt(C, 'input[name="participants[].signing_stage"]'), se = wt(C, 'input[name="participants[].notify"]'), fe = C.querySelector(".signing-stage-wrapper");
    if (!X || !F || !T || !W) return;
    const re = s++;
    X.name = `participants[${re}].id`, X.value = U, F.name = `participants[${re}].name`, T.name = `participants[${re}].email`, W.name = `participants[${re}].role`, B && (B.name = `participants[${re}].signing_stage`), se && (se.name = `participants[${re}].notify`), L.name && (F.value = L.name), L.email && (T.value = L.email), L.role && (W.value = L.role), B && L.signing_stage && (B.value = String(L.signing_stage)), se && (se.checked = L.notify !== !1);
    const we = () => {
      if (!(fe instanceof HTMLElement) || !B) return;
      const He = W.value === "signer";
      fe.classList.toggle("hidden", !He), He ? B.value || (B.value = "1") : B.value = "";
    };
    we(), C.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      C.remove(), t?.();
    }), W.addEventListener("change", () => {
      we(), t?.();
    }), n.appendChild(S);
  }
  function v() {
    n && (e.length > 0 ? e.forEach((L) => {
      g({
        id: String(L.id || "").trim(),
        name: String(L.name || "").trim(),
        email: String(L.email || "").trim(),
        role: String(L.role || "signer").trim() || "signer",
        notify: L.notify !== !1,
        signing_stage: Number(L.signing_stage || L.signingStage || 1) || 1
      });
    }) : g());
  }
  function x() {
    if (!n) return;
    o?.addEventListener("click", () => g()), new MutationObserver(() => {
      t?.();
    }).observe(n, { childList: !0, subtree: !0 }), n.addEventListener("change", (S) => {
      const C = S.target;
      C instanceof Element && (C.matches('select[name*=".role"]') || C.matches('input[name*=".name"]') || C.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (S) => {
      const C = S.target;
      C instanceof Element && (C.matches('input[name*=".name"]') || C.matches('input[name*=".email"]')) && t?.();
    });
  }
  function _() {
    if (!n) return [];
    const L = n.querySelectorAll(".participant-entry"), S = [];
    return L.forEach((C) => {
      const U = C.getAttribute("data-participant-id"), X = bn(C, 'select[name*=".role"]'), F = wt(C, 'input[name*=".name"]'), T = wt(C, 'input[name*=".email"]');
      X?.value === "signer" && S.push({
        id: String(U || ""),
        name: F?.value || T?.value || "Signer",
        email: T?.value || ""
      });
    }), S;
  }
  function b() {
    if (!n) return [];
    const L = [];
    return n.querySelectorAll(".participant-entry").forEach((S) => {
      const C = S.getAttribute("data-participant-id"), U = wt(S, 'input[name*=".name"]')?.value || "", X = wt(S, 'input[name*=".email"]')?.value || "", F = bn(S, 'select[name*=".role"]')?.value || "signer", T = Number.parseInt(wt(S, ".signing-stage-input")?.value || "1", 10), W = wt(S, ".notify-input")?.checked !== !1;
      L.push({
        tempId: String(C || ""),
        name: U,
        email: X,
        role: F,
        notify: W,
        signingStage: Number.isFinite(T) ? T : 1
      });
    }), L;
  }
  function f(L) {
    !n || !L?.participants || L.participants.length === 0 || (n.innerHTML = "", s = 0, L.participants.forEach((S) => {
      g({
        id: S.tempId,
        name: S.name,
        email: S.email,
        role: S.role,
        notify: S.notify !== !1,
        signing_stage: S.signingStage
      });
    }));
  }
  return {
    refs: {
      participantsContainer: n,
      addParticipantBtn: o
    },
    initialize: v,
    bindEvents: x,
    addParticipant: g,
    getSignerParticipants: _,
    collectParticipantsForState: b,
    restoreFromState: f
  };
}
function es() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function an() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function ts(i, e) {
  return {
    id: es(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Ii(i, e) {
  const t = new Map(i.groups);
  t.set(e.id, e);
  const n = new Map(i.definitionToGroup);
  for (const r of e.memberDefinitionIds)
    n.set(r, e.id);
  return {
    ...i,
    groups: t,
    definitionToGroup: n
  };
}
function ni(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function ii(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Ei(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function ns(i, e) {
  const t = Ei(i, e.definitionId);
  if (!t || !t.isActive || t.templatePosition) return null;
  const n = {
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height
  };
  return { updatedGroup: {
    ...t,
    sourceFieldId: e.id,
    templatePosition: n
  } };
}
function is(i, e, t, n) {
  const r = /* @__PURE__ */ new Set();
  for (const o of t)
    r.add(o.definitionId);
  for (const [o, c] of n) {
    if (c.page !== e || r.has(o) || i.unlinkedDefinitions.has(o)) continue;
    const s = i.definitionToGroup.get(o);
    if (!s) continue;
    const h = i.groups.get(s);
    if (!h || !h.isActive || !h.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: o,
      type: c.type,
      participantId: c.participantId,
      participantName: c.participantName,
      page: e,
      x: h.templatePosition.x,
      y: h.templatePosition.y,
      width: h.templatePosition.width,
      height: h.templatePosition.height,
      placementSource: gt.AUTO_LINKED,
      linkGroupId: h.id,
      linkedFromFieldId: h.sourceFieldId
    } };
  }
  return null;
}
function St(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function We(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function pt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function ri(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function kt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLElement ? t : null;
}
function rs(i) {
  const {
    initialFieldInstances: e = [],
    placementSource: t,
    getCurrentDocumentPageCount: n,
    getSignerParticipants: r,
    escapeHtml: o,
    onDefinitionsChanged: c,
    onRulesChanged: s,
    onParticipantsChanged: h,
    getPlacementLinkGroupState: g,
    setPlacementLinkGroupState: v
  } = i, x = St("field-definitions-container"), _ = document.getElementById("field-definition-template"), b = St("add-field-btn"), f = St("add-field-btn-container"), L = St("add-field-definition-empty-btn"), S = St("field-definitions-empty-state"), C = St("field-rules-container"), U = document.getElementById("field-rule-template"), X = St("add-field-rule-btn"), F = St("field-rules-empty-state"), T = St("field-rules-preview"), W = St("field_rules_json"), B = St("field_placements_json");
  let se = 0, fe = 0, re = 0;
  function we() {
    return `temp_field_${Date.now()}_${se++}`;
  }
  function He() {
    return `rule_${Date.now()}_${re}`;
  }
  function ge(P, M) {
    const Y = String(P || "").trim();
    return Y && M.some((H) => H.id === Y) ? Y : M.length === 1 ? M[0].id : "";
  }
  function he(P, M, Y = "") {
    if (!P) return;
    const H = ge(Y, M);
    P.innerHTML = '<option value="">Select signer...</option>', M.forEach((ie) => {
      const te = document.createElement("option");
      te.value = ie.id, te.textContent = ie.name, P.appendChild(te);
    }), P.value = H;
  }
  function de(P = r()) {
    if (!x) return;
    const M = x.querySelectorAll(".field-participant-select"), Y = C ? C.querySelectorAll(".field-rule-participant-select") : [];
    M.forEach((H) => {
      he(
        H instanceof HTMLSelectElement ? H : null,
        P,
        H instanceof HTMLSelectElement ? H.value : ""
      );
    }), Y.forEach((H) => {
      he(
        H instanceof HTMLSelectElement ? H : null,
        P,
        H instanceof HTMLSelectElement ? H.value : ""
      );
    });
  }
  function Se() {
    if (!x || !S) return;
    x.querySelectorAll(".field-definition-entry").length === 0 ? (S.classList.remove("hidden"), f?.classList.add("hidden")) : (S.classList.add("hidden"), f?.classList.remove("hidden"));
  }
  function Re() {
    if (!C || !F) return;
    const P = C.querySelectorAll(".field-rule-entry");
    F.classList.toggle("hidden", P.length > 0);
  }
  function ze() {
    if (!x) return [];
    const P = [];
    return x.querySelectorAll(".field-definition-entry").forEach((M) => {
      const Y = M.getAttribute("data-field-definition-id"), H = pt(M, ".field-type-select")?.value || "signature", ie = pt(M, ".field-participant-select")?.value || "", te = Number.parseInt(We(M, 'input[name*=".page"]')?.value || "1", 10), Q = We(M, 'input[name*=".required"]')?.checked ?? !0;
      P.push({
        tempId: String(Y || ""),
        type: H,
        participantTempId: ie,
        page: Number.isFinite(te) ? te : 1,
        required: Q
      });
    }), P;
  }
  function nt() {
    if (!C) return [];
    const P = n(), M = C.querySelectorAll(".field-rule-entry"), Y = [];
    return M.forEach((H) => {
      const ie = Zt({
        id: H.getAttribute("data-field-rule-id") || "",
        type: pt(H, ".field-rule-type-select")?.value || "",
        participantId: pt(H, ".field-rule-participant-select")?.value || "",
        fromPage: We(H, ".field-rule-from-page-input")?.value || "",
        toPage: We(H, ".field-rule-to-page-input")?.value || "",
        page: We(H, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!We(H, ".field-rule-exclude-last-input")?.checked,
        excludePages: sn(We(H, ".field-rule-exclude-pages-input")?.value || ""),
        required: (pt(H, ".field-rule-required-select")?.value || "1") !== "0"
      }, P);
      ie.type && Y.push(ie);
    }), Y;
  }
  function Ae() {
    return nt().map((P) => ({
      id: P.id,
      type: P.type,
      participant_id: P.participantId,
      from_page: P.fromPage,
      to_page: P.toPage,
      page: P.page,
      exclude_last_page: P.excludeLastPage,
      exclude_pages: P.excludePages,
      required: P.required
    }));
  }
  function et(P, M) {
    return Jr(P, M);
  }
  function Me() {
    if (!T) return;
    const P = nt(), M = n(), Y = et(P, M), H = r(), ie = new Map(H.map((ue) => [String(ue.id), ue.name]));
    if (W && (W.value = JSON.stringify(Ae())), !Y.length) {
      T.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const te = Y.reduce((ue, q) => {
      const Z = q.type;
      return ue[Z] = (ue[Z] || 0) + 1, ue;
    }, {}), Q = Y.slice(0, 8).map((ue) => {
      const q = ie.get(String(ue.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${ue.type === "initials" ? "Initials" : "Signature"} on page ${ue.page}</span><span class="text-gray-500">${o(String(q))}</span></li>`;
    }).join(""), Ie = Y.length - 8;
    T.innerHTML = `
      <p class="text-gray-700">${Y.length} generated field${Y.length !== 1 ? "s" : ""} (${te.initials || 0} initials, ${te.signature || 0} signatures)</p>
      <ul class="space-y-1">${Q}</ul>
      ${Ie > 0 ? `<p class="text-gray-500">+${Ie} more</p>` : ""}
    `;
  }
  function je() {
    const P = r();
    de(P), Me();
  }
  function lt(P) {
    const M = pt(P, ".field-rule-type-select"), Y = kt(P, ".field-rule-range-start-wrap"), H = kt(P, ".field-rule-range-end-wrap"), ie = kt(P, ".field-rule-page-wrap"), te = kt(P, ".field-rule-exclude-last-wrap"), Q = kt(P, ".field-rule-exclude-pages-wrap"), Ie = kt(P, ".field-rule-summary"), ue = We(P, ".field-rule-from-page-input"), q = We(P, ".field-rule-to-page-input"), Z = We(P, ".field-rule-page-input"), ve = We(P, ".field-rule-exclude-last-input"), Ee = We(P, ".field-rule-exclude-pages-input");
    if (!M || !Y || !H || !ie || !te || !Q || !Ie)
      return;
    const De = n(), Be = Zt({
      type: M?.value || "",
      fromPage: ue?.value || "",
      toPage: q?.value || "",
      page: Z?.value || "",
      excludeLastPage: !!ve?.checked,
      excludePages: sn(Ee?.value || ""),
      required: !0
    }, De), y = Be.fromPage > 0 ? Be.fromPage : 1, w = Be.toPage > 0 ? Be.toPage : De, E = Be.page > 0 ? Be.page : Be.toPage > 0 ? Be.toPage : De, z = Be.excludeLastPage, j = Be.excludePages.join(","), G = M?.value === "initials_each_page";
    if (Y.classList.toggle("hidden", !G), H.classList.toggle("hidden", !G), te.classList.toggle("hidden", !G), Q.classList.toggle("hidden", !G), ie.classList.toggle("hidden", G), ue && (ue.value = String(y)), q && (q.value = String(w)), Z && (Z.value = String(E)), Ee && (Ee.value = j), ve && (ve.checked = z), G) {
      const oe = Yr(
        y,
        w,
        De,
        z,
        Be.excludePages
      ), ce = Kr(oe);
      Ie.textContent = oe.isEmpty ? `Warning: No initials fields will be generated ${ce}.` : `Generates initials fields on ${ce}.`;
    } else
      Ie.textContent = `Generates one signature field on page ${E}.`;
  }
  function k(P = {}) {
    if (!(U instanceof HTMLTemplateElement) || !C) return;
    const M = U.content.cloneNode(!0), Y = M.querySelector(".field-rule-entry");
    if (!(Y instanceof HTMLElement)) return;
    const H = P.id || He(), ie = re++, te = n();
    Y.setAttribute("data-field-rule-id", H);
    const Q = We(Y, ".field-rule-id-input"), Ie = pt(Y, ".field-rule-type-select"), ue = pt(Y, ".field-rule-participant-select"), q = We(Y, ".field-rule-from-page-input"), Z = We(Y, ".field-rule-to-page-input"), ve = We(Y, ".field-rule-page-input"), Ee = pt(Y, ".field-rule-required-select"), De = We(Y, ".field-rule-exclude-last-input"), Be = We(Y, ".field-rule-exclude-pages-input"), y = ri(Y, ".remove-field-rule-btn");
    if (!Q || !Ie || !ue || !q || !Z || !ve || !Ee || !De || !Be || !y)
      return;
    Q.name = `field_rules[${ie}].id`, Q.value = H, Ie.name = `field_rules[${ie}].type`, ue.name = `field_rules[${ie}].participant_id`, q.name = `field_rules[${ie}].from_page`, Z.name = `field_rules[${ie}].to_page`, ve.name = `field_rules[${ie}].page`, Ee.name = `field_rules[${ie}].required`, De.name = `field_rules[${ie}].exclude_last_page`, Be.name = `field_rules[${ie}].exclude_pages`;
    const w = Zt(P, te);
    Ie.value = w.type || "initials_each_page", he(ue, r(), w.participantId), q.value = String(w.fromPage > 0 ? w.fromPage : 1), Z.value = String(w.toPage > 0 ? w.toPage : te), ve.value = String(w.page > 0 ? w.page : te), Ee.value = w.required ? "1" : "0", De.checked = w.excludeLastPage, Be.value = w.excludePages.join(",");
    const E = () => {
      lt(Y), Me(), s?.();
    }, z = () => {
      const G = n();
      if (q) {
        const oe = parseInt(q.value, 10);
        Number.isFinite(oe) && (q.value = String(zt(oe, G, 1)));
      }
      if (Z) {
        const oe = parseInt(Z.value, 10);
        Number.isFinite(oe) && (Z.value = String(zt(oe, G, 1)));
      }
      if (ve) {
        const oe = parseInt(ve.value, 10);
        Number.isFinite(oe) && (ve.value = String(zt(oe, G, 1)));
      }
    }, j = () => {
      z(), E();
    };
    Ie.addEventListener("change", E), ue.addEventListener("change", E), q.addEventListener("input", j), q.addEventListener("change", j), Z.addEventListener("input", j), Z.addEventListener("change", j), ve.addEventListener("input", j), ve.addEventListener("change", j), Ee.addEventListener("change", E), De.addEventListener("change", () => {
      const G = n();
      Z.value = String(De.checked ? Math.max(1, G - 1) : G), E();
    }), Be.addEventListener("input", E), y.addEventListener("click", () => {
      Y.remove(), Re(), Me(), s?.();
    }), C.appendChild(M), lt(C.lastElementChild || Y), Re(), Me();
  }
  function pe(P = {}) {
    if (!(_ instanceof HTMLTemplateElement) || !x) return;
    const M = _.content.cloneNode(!0), Y = M.querySelector(".field-definition-entry");
    if (!(Y instanceof HTMLElement)) return;
    const H = String(P.id || we()).trim() || we();
    Y.setAttribute("data-field-definition-id", H);
    const ie = We(Y, ".field-definition-id-input"), te = pt(Y, 'select[name="field_definitions[].type"]'), Q = pt(Y, 'select[name="field_definitions[].participant_id"]'), Ie = We(Y, 'input[name="field_definitions[].page"]'), ue = We(Y, 'input[name="field_definitions[].required"]'), q = kt(Y, ".field-date-signed-info");
    if (!ie || !te || !Q || !Ie || !ue || !q) return;
    const Z = fe++;
    ie.name = `field_instances[${Z}].id`, ie.value = H, te.name = `field_instances[${Z}].type`, Q.name = `field_instances[${Z}].participant_id`, Ie.name = `field_instances[${Z}].page`, ue.name = `field_instances[${Z}].required`, P.type && (te.value = String(P.type)), P.page !== void 0 && (Ie.value = String(zt(P.page, n(), 1))), P.required !== void 0 && (ue.checked = !!P.required);
    const ve = String(P.participant_id || P.participantId || "").trim();
    he(Q, r(), ve), te.addEventListener("change", () => {
      te.value === "date_signed" ? q.classList.remove("hidden") : q.classList.add("hidden");
    }), te.value === "date_signed" && q.classList.remove("hidden"), ri(Y, ".remove-field-definition-btn")?.addEventListener("click", () => {
      Y.remove(), Se(), c?.();
    });
    const Ee = We(Y, 'input[name*=".page"]'), De = () => {
      Ee && (Ee.value = String(zt(Ee.value, n(), 1)));
    };
    De(), Ee?.addEventListener("input", De), Ee?.addEventListener("change", De), x.appendChild(M), Se();
  }
  function ke() {
    b?.addEventListener("click", () => pe()), L?.addEventListener("click", () => pe()), X?.addEventListener("click", () => k({ to_page: n() })), h?.();
  }
  function Qe() {
    const P = [];
    window._initialFieldPlacementsData = P, e.forEach((M) => {
      const Y = String(M.id || "").trim();
      if (!Y) return;
      const H = String(M.type || "signature").trim() || "signature", ie = String(M.participant_id || M.participantId || "").trim(), te = Number(M.page || 1) || 1, Q = !!M.required;
      pe({
        id: Y,
        type: H,
        participant_id: ie,
        page: te,
        required: Q
      }), P.push(qt({
        id: Y,
        definitionId: Y,
        type: H,
        participantId: ie,
        participantName: String(M.participant_name || M.participantName || "").trim(),
        page: te,
        x: Number(M.x || M.pos_x || 0) || 0,
        y: Number(M.y || M.pos_y || 0) || 0,
        width: Number(M.width || 150) || 150,
        height: Number(M.height || 32) || 32,
        placementSource: String(M.placement_source || M.placementSource || t.MANUAL).trim() || t.MANUAL
      }, P.length));
    }), Se(), je(), Re(), Me();
  }
  function Je() {
    const P = window._initialFieldPlacementsData;
    return Array.isArray(P) ? P.map((M, Y) => qt(M, Y)) : [];
  }
  function it() {
    if (!x) return [];
    const P = r(), M = new Map(P.map((q) => [String(q.id), q.name || q.email || "Signer"])), Y = [];
    x.querySelectorAll(".field-definition-entry").forEach((q) => {
      const Z = String(q.getAttribute("data-field-definition-id") || "").trim(), ve = pt(q, ".field-type-select"), Ee = pt(q, ".field-participant-select"), De = We(q, 'input[name*=".page"]'), Be = String(ve?.value || "text").trim() || "text", y = String(Ee?.value || "").trim(), w = parseInt(String(De?.value || "1"), 10) || 1;
      Y.push({
        definitionId: Z,
        fieldType: Be,
        participantId: y,
        participantName: M.get(y) || "Unassigned",
        page: w
      });
    });
    const ie = et(nt(), n()), te = /* @__PURE__ */ new Map();
    ie.forEach((q) => {
      const Z = String(q.ruleId || "").trim(), ve = String(q.id || "").trim();
      if (Z && ve) {
        const Ee = te.get(Z) || [];
        Ee.push(ve), te.set(Z, Ee);
      }
    });
    let Q = g();
    te.forEach((q, Z) => {
      if (q.length > 1 && !Q.groups.get(`rule_${Z}`)) {
        const Ee = ts(q, `Rule ${Z}`);
        Ee.id = `rule_${Z}`, Q = Ii(Q, Ee);
      }
    }), v(Q), ie.forEach((q) => {
      const Z = String(q.id || "").trim();
      if (!Z) return;
      const ve = String(q.participantId || "").trim(), Ee = parseInt(String(q.page || "1"), 10) || 1, De = String(q.ruleId || "").trim();
      Y.push({
        definitionId: Z,
        fieldType: String(q.type || "text").trim() || "text",
        participantId: ve,
        participantName: M.get(ve) || "Unassigned",
        page: Ee,
        linkGroupId: De ? `rule_${De}` : void 0
      });
    });
    const Ie = /* @__PURE__ */ new Set(), ue = Y.filter((q) => {
      const Z = String(q.definitionId || "").trim();
      return !Z || Ie.has(Z) ? !1 : (Ie.add(Z), !0);
    });
    return ue.sort((q, Z) => q.page !== Z.page ? q.page - Z.page : q.definitionId.localeCompare(Z.definitionId)), ue;
  }
  function st(P) {
    const M = String(P || "").trim();
    if (!M) return null;
    const H = it().find((ie) => String(ie.definitionId || "").trim() === M);
    return H ? {
      id: M,
      type: String(H.fieldType || "text").trim() || "text",
      participant_id: String(H.participantId || "").trim(),
      participant_name: String(H.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(H.page || "1"), 10) || 1,
      link_group_id: String(H.linkGroupId || "").trim()
    } : null;
  }
  function me() {
    if (!x) return [];
    const P = r(), M = /* @__PURE__ */ new Map();
    return P.forEach((ie) => M.set(ie.id, !1)), x.querySelectorAll(".field-definition-entry").forEach((ie) => {
      const te = pt(ie, ".field-type-select"), Q = pt(ie, ".field-participant-select"), Ie = We(ie, 'input[name*=".required"]');
      te?.value === "signature" && Q?.value && Ie?.checked && M.set(Q.value, !0);
    }), et(nt(), n()).forEach((ie) => {
      ie.type === "signature" && ie.participantId && ie.required && M.set(ie.participantId, !0);
    }), P.filter((ie) => !M.get(ie.id));
  }
  function xe(P) {
    if (!Array.isArray(P) || P.length === 0)
      return "Each signer requires at least one required signature field.";
    const M = P.map((Y) => Y?.name?.trim()).filter(Boolean);
    return M.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${M.join(", ")}`;
  }
  function Fe(P) {
    !x || !P?.fieldDefinitions || P.fieldDefinitions.length === 0 || (x.innerHTML = "", fe = 0, P.fieldDefinitions.forEach((M) => {
      pe({
        id: M.tempId,
        type: M.type,
        participant_id: M.participantTempId,
        page: M.page,
        required: M.required
      });
    }), Se());
  }
  function Ye(P) {
    !Array.isArray(P?.fieldRules) || P.fieldRules.length === 0 || C && (C.querySelectorAll(".field-rule-entry").forEach((M) => M.remove()), re = 0, P.fieldRules.forEach((M) => {
      k({
        id: M.id,
        type: M.type,
        participantId: M.participantId || M.participantTempId,
        fromPage: M.fromPage,
        toPage: M.toPage,
        page: M.page,
        excludeLastPage: M.excludeLastPage,
        excludePages: M.excludePages,
        required: M.required
      });
    }), Re(), Me());
  }
  return {
    refs: {
      fieldDefinitionsContainer: x,
      fieldRulesContainer: C,
      addFieldBtn: b,
      fieldPlacementsJSONInput: B,
      fieldRulesJSONInput: W
    },
    bindEvents: ke,
    initialize: Qe,
    buildInitialPlacementInstances: Je,
    collectFieldDefinitionsForState: ze,
    collectFieldRulesForState: nt,
    collectFieldRulesForForm: Ae,
    expandRulesForPreview: et,
    renderFieldRulePreview: Me,
    updateFieldParticipantOptions: je,
    collectPlacementFieldDefinitions: it,
    getFieldDefinitionById: st,
    findSignersMissingRequiredSignatureField: me,
    missingSignatureFieldMessage: xe,
    restoreFieldDefinitionsFromState: Fe,
    restoreFieldRulesFromState: Ye
  };
}
function ss(i) {
  return typeof i == "object" && i !== null && "run" in i;
}
const Ft = {
  signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
  name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
  date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
  text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
  checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
  initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
}, Yt = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};
function as(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentIdInput: n,
    fieldPlacementsJSONInput: r,
    initialFieldInstances: o = [],
    initialLinkGroupState: c = null,
    collectPlacementFieldDefinitions: s,
    getFieldDefinitionById: h,
    parseAPIError: g,
    mapUserFacingError: v,
    showToast: x,
    escapeHtml: _,
    onPlacementsChanged: b
  } = i, f = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(o) ? o.map((y, w) => qt(y, w)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: c || an()
  }, L = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function S(y = "fi") {
    return `${y}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function C(y) {
    return document.querySelector(`.placement-field-item[data-definition-id="${y}"]`);
  }
  function U() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function X(y, w) {
    return y.querySelector(w);
  }
  function F(y, w) {
    return y.querySelector(w);
  }
  function T() {
    return {
      loading: document.getElementById("placement-loading"),
      noDocument: document.getElementById("placement-no-document"),
      fieldsList: document.getElementById("placement-fields-list"),
      viewer: document.getElementById("placement-viewer"),
      canvas: document.getElementById("placement-pdf-canvas"),
      overlays: document.getElementById("placement-overlays-container"),
      canvasContainer: document.getElementById("placement-canvas-container"),
      currentPage: document.getElementById("placement-current-page"),
      totalPages: document.getElementById("placement-total-pages"),
      zoomLevel: document.getElementById("placement-zoom-level"),
      totalFields: document.getElementById("placement-total-fields"),
      placedCount: document.getElementById("placement-placed-count"),
      unplacedCount: document.getElementById("placement-unplaced-count"),
      autoPlaceBtn: document.getElementById("auto-place-btn"),
      policyPreset: document.getElementById("placement-policy-preset"),
      prevBtn: document.getElementById("placement-prev-page"),
      nextBtn: document.getElementById("placement-next-page"),
      zoomIn: document.getElementById("placement-zoom-in"),
      zoomOut: document.getElementById("placement-zoom-out"),
      zoomFit: document.getElementById("placement-zoom-fit"),
      linkBatchActions: document.getElementById("link-batch-actions"),
      linkAllBtn: document.getElementById("link-all-btn"),
      unlinkAllBtn: document.getElementById("unlink-all-btn"),
      fieldInstancesContainer: document.getElementById("field-instances-container")
    };
  }
  function W() {
    return f;
  }
  function B() {
    return f.linkGroupState;
  }
  function se(y) {
    f.linkGroupState = y || an();
  }
  function fe() {
    return f.fieldInstances.map((y, w) => Xr(y, w));
  }
  function re(y = {}) {
    const { silent: w = !1 } = y, E = T();
    E.fieldInstancesContainer && (E.fieldInstancesContainer.innerHTML = "");
    const z = fe();
    return r && (r.value = JSON.stringify(z)), w || b?.(), z;
  }
  function we() {
    const y = T(), w = Array.from(document.querySelectorAll(".placement-field-item")), E = w.length, z = new Set(
      w.map((ce) => String(ce.dataset.definitionId || "").trim()).filter((ce) => ce)
    ), j = /* @__PURE__ */ new Set();
    f.fieldInstances.forEach((ce) => {
      const $e = String(ce.definitionId || "").trim();
      z.has($e) && j.add($e);
    });
    const G = j.size, oe = Math.max(0, E - G);
    y.totalFields && (y.totalFields.textContent = String(E)), y.placedCount && (y.placedCount.textContent = String(G)), y.unplacedCount && (y.unplacedCount.textContent = String(oe));
  }
  function He(y, w = !1) {
    const E = C(y);
    if (!E) return;
    E.classList.add("opacity-50"), E.draggable = !1;
    const z = E.querySelector(".placement-status");
    z && (z.textContent = "Placed", z.classList.remove("text-amber-600"), z.classList.add("text-green-600")), w && E.classList.add("just-linked");
  }
  function ge(y) {
    const w = C(y);
    if (!w) return;
    w.classList.remove("opacity-50"), w.draggable = !0;
    const E = w.querySelector(".placement-status");
    E && (E.textContent = "Not placed", E.classList.remove("text-green-600"), E.classList.add("text-amber-600"));
  }
  function he() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((w) => {
      w.classList.add("linked-flash"), setTimeout(() => {
        w.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function de(y) {
    const w = y === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${y} linked fields`;
    window.toastManager?.info?.(w);
    const E = document.createElement("div");
    E.setAttribute("role", "status"), E.setAttribute("aria-live", "polite"), E.className = "sr-only", E.textContent = w, document.body.appendChild(E), setTimeout(() => E.remove(), 1e3), he();
  }
  function Se(y, w) {
    const E = document.createElement("div");
    E.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", E.dataset.definitionId = y, E.dataset.isLinked = String(w), E.title = w ? "Click to unlink this field" : "Click to re-link this field", E.setAttribute("role", "button"), E.setAttribute("aria-label", w ? "Unlink field from group" : "Re-link field to group"), E.setAttribute("tabindex", "0"), w ? E.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : E.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const z = () => Me(y, w);
    return E.addEventListener("click", z), E.addEventListener("keydown", (j) => {
      (j.key === "Enter" || j.key === " ") && (j.preventDefault(), z());
    }), E;
  }
  function Re() {
    const y = T();
    if (y.linkAllBtn && (y.linkAllBtn.disabled = f.linkGroupState.unlinkedDefinitions.size === 0), y.unlinkAllBtn) {
      let w = !1;
      for (const E of f.linkGroupState.definitionToGroup.keys())
        if (!f.linkGroupState.unlinkedDefinitions.has(E)) {
          w = !0;
          break;
        }
      y.unlinkAllBtn.disabled = !w;
    }
  }
  function ze() {
    const y = T();
    y.linkAllBtn && !y.linkAllBtn.dataset.bound && (y.linkAllBtn.dataset.bound = "true", y.linkAllBtn.addEventListener("click", () => {
      const w = f.linkGroupState.unlinkedDefinitions.size;
      if (w !== 0) {
        for (const E of f.linkGroupState.unlinkedDefinitions)
          f.linkGroupState = ii(f.linkGroupState, E);
        window.toastManager && window.toastManager.success(`Re-linked ${w} field${w > 1 ? "s" : ""}`), et();
      }
    })), y.unlinkAllBtn && !y.unlinkAllBtn.dataset.bound && (y.unlinkAllBtn.dataset.bound = "true", y.unlinkAllBtn.addEventListener("click", () => {
      let w = 0;
      for (const E of f.linkGroupState.definitionToGroup.keys())
        f.linkGroupState.unlinkedDefinitions.has(E) || (f.linkGroupState = ni(f.linkGroupState, E), w += 1);
      w > 0 && window.toastManager && window.toastManager.success(`Unlinked ${w} field${w > 1 ? "s" : ""}`), et();
    })), Re();
  }
  function nt() {
    return s().map((w) => {
      const E = String(w.definitionId || "").trim(), z = f.linkGroupState.definitionToGroup.get(E) || "", j = f.linkGroupState.unlinkedDefinitions.has(E);
      return { ...w, definitionId: E, linkGroupId: z, isUnlinked: j };
    });
  }
  function Ae() {
    const y = T();
    if (!y.fieldsList) return;
    y.fieldsList.innerHTML = "";
    const w = nt();
    y.linkBatchActions && y.linkBatchActions.classList.toggle("hidden", f.linkGroupState.groups.size === 0), w.forEach((E, z) => {
      const j = E.definitionId, G = String(E.fieldType || "text").trim() || "text", oe = String(E.participantId || "").trim(), ce = String(E.participantName || "Unassigned").trim() || "Unassigned", $e = Number.parseInt(String(E.page || "1"), 10) || 1, Ce = E.linkGroupId, Ke = E.isUnlinked;
      if (!j) return;
      f.fieldInstances.forEach((Le) => {
        Le.definitionId === j && (Le.type = G, Le.participantId = oe, Le.participantName = ce);
      });
      const Ne = Ft[G] || Ft.text, at = f.fieldInstances.some((Le) => Le.definitionId === j), qe = document.createElement("div");
      qe.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${at ? "opacity-50" : ""}`, qe.draggable = !at, qe.dataset.definitionId = j, qe.dataset.fieldType = G, qe.dataset.participantId = oe, qe.dataset.participantName = ce, qe.dataset.page = String($e), Ce && (qe.dataset.linkGroupId = Ce);
      const D = document.createElement("span");
      D.className = `w-3 h-3 rounded ${Ne.bg}`;
      const $ = document.createElement("div");
      $.className = "flex-1 text-xs";
      const N = document.createElement("div");
      N.className = "font-medium capitalize", N.textContent = G.replace(/_/g, " ");
      const K = document.createElement("div");
      K.className = "text-gray-500", K.textContent = ce;
      const ae = document.createElement("span");
      ae.className = `placement-status text-xs ${at ? "text-green-600" : "text-amber-600"}`, ae.textContent = at ? "Placed" : "Not placed", $.appendChild(N), $.appendChild(K), qe.appendChild(D), qe.appendChild($), qe.appendChild(ae), qe.addEventListener("dragstart", (Le) => {
        if (at) {
          Le.preventDefault();
          return;
        }
        Le.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: j,
          fieldType: G,
          participantId: oe,
          participantName: ce
        })), Le.dataTransfer && (Le.dataTransfer.effectAllowed = "copy"), qe.classList.add("opacity-50");
      }), qe.addEventListener("dragend", () => {
        qe.classList.remove("opacity-50");
      }), y.fieldsList?.appendChild(qe);
      const ee = w[z + 1];
      Ce && ee && ee.linkGroupId === Ce && y.fieldsList?.appendChild(Se(j, !Ke));
    }), ze(), we();
  }
  function et() {
    Ae();
  }
  function Me(y, w) {
    w ? (f.linkGroupState = ni(f.linkGroupState, y), window.toastManager?.info?.("Field unlinked")) : (f.linkGroupState = ii(f.linkGroupState, y), window.toastManager?.info?.("Field re-linked")), et();
  }
  async function je(y) {
    const w = f.pdfDoc;
    if (!w) return;
    const E = T();
    if (!E.canvas || !E.canvasContainer) return;
    const z = E.canvas.getContext("2d"), j = await w.getPage(y), G = j.getViewport({ scale: f.scale });
    E.canvas.width = G.width, E.canvas.height = G.height, E.canvasContainer.style.width = `${G.width}px`, E.canvasContainer.style.height = `${G.height}px`, await j.render({
      canvasContext: z,
      viewport: G
    }).promise, E.currentPage && (E.currentPage.textContent = String(y)), ke();
  }
  function lt(y) {
    const w = ns(f.linkGroupState, y);
    w && (f.linkGroupState = Ii(f.linkGroupState, w.updatedGroup));
  }
  function k(y) {
    const w = /* @__PURE__ */ new Map();
    s().forEach((z) => {
      const j = String(z.definitionId || "").trim();
      j && w.set(j, {
        type: String(z.fieldType || "text").trim() || "text",
        participantId: String(z.participantId || "").trim(),
        participantName: String(z.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(z.page || "1"), 10) || 1,
        linkGroupId: f.linkGroupState.definitionToGroup.get(j)
      });
    });
    let E = 0;
    for (; E < 10; ) {
      const z = is(
        f.linkGroupState,
        y,
        f.fieldInstances,
        w
      );
      if (!z || !z.newPlacement) break;
      f.fieldInstances.push(z.newPlacement), He(z.newPlacement.definitionId, !0), E += 1;
    }
    E > 0 && (ke(), we(), re(), de(E));
  }
  function pe(y) {
    lt(y);
  }
  function ke() {
    const w = T().overlays;
    w && (w.innerHTML = "", w.style.pointerEvents = "auto", f.fieldInstances.filter((E) => E.page === f.currentPage).forEach((E) => {
      const z = Ft[E.type] || Ft.text, j = f.selectedFieldId === E.id, G = E.placementSource === gt.AUTO_LINKED, oe = document.createElement("div"), ce = G ? "border-dashed" : "border-solid";
      oe.className = `field-overlay absolute cursor-move ${z.border} border-2 ${ce} rounded`, oe.style.cssText = `
          left: ${E.x * f.scale}px;
          top: ${E.y * f.scale}px;
          width: ${E.width * f.scale}px;
          height: ${E.height * f.scale}px;
          background-color: ${z.fill};
          ${j ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, oe.dataset.instanceId = E.id;
      const $e = document.createElement("div");
      if ($e.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${z.bg}`, $e.textContent = `${E.type.replace("_", " ")} - ${E.participantName}`, oe.appendChild($e), G) {
        const Ne = document.createElement("div");
        Ne.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", Ne.title = "Auto-linked from template", Ne.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, oe.appendChild(Ne);
      }
      const Ce = document.createElement("div");
      Ce.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Ce.style.cssText = "transform: translate(50%, 50%);", oe.appendChild(Ce);
      const Ke = document.createElement("button");
      Ke.type = "button", Ke.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", Ke.innerHTML = "×", Ke.addEventListener("click", (Ne) => {
        Ne.stopPropagation(), me(E.id);
      }), oe.appendChild(Ke), oe.addEventListener("mousedown", (Ne) => {
        Ne.target === Ce ? st(Ne, E) : Ne.target !== Ke && it(Ne, E, oe);
      }), oe.addEventListener("click", () => {
        f.selectedFieldId = E.id, ke();
      }), w.appendChild(oe);
    }));
  }
  function Qe(y, w, E, z = {}) {
    const j = Yt[y.fieldType] || Yt.text, G = z.placementSource || gt.MANUAL, oe = z.linkGroupId || Ei(f.linkGroupState, y.definitionId)?.id, ce = {
      id: S("fi"),
      definitionId: y.definitionId,
      type: y.fieldType,
      participantId: y.participantId,
      participantName: y.participantName,
      page: f.currentPage,
      x: Math.max(0, w - j.width / 2),
      y: Math.max(0, E - j.height / 2),
      width: j.width,
      height: j.height,
      placementSource: G,
      linkGroupId: oe,
      linkedFromFieldId: z.linkedFromFieldId
    };
    f.fieldInstances.push(ce), He(y.definitionId), G === gt.MANUAL && oe && pe(ce), ke(), we(), re();
  }
  function Je(y, w) {
    const E = {
      id: S("instance"),
      definitionId: y.definitionId,
      type: y.fieldType,
      participantId: y.participantId,
      participantName: y.participantName,
      page: w.page_number,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      placementSource: gt.AUTO,
      resolverId: w.resolver_id,
      confidence: w.confidence,
      placementRunId: L.currentRunId
    };
    f.fieldInstances.push(E), He(y.definitionId), ke(), we(), re();
  }
  function it(y, w, E) {
    y.preventDefault(), f.isDragging = !0, f.selectedFieldId = w.id;
    const z = y.clientX, j = y.clientY, G = w.x * f.scale, oe = w.y * f.scale;
    function ce(Ce) {
      const Ke = Ce.clientX - z, Ne = Ce.clientY - j;
      w.x = Math.max(0, (G + Ke) / f.scale), w.y = Math.max(0, (oe + Ne) / f.scale), w.placementSource = gt.MANUAL, E.style.left = `${w.x * f.scale}px`, E.style.top = `${w.y * f.scale}px`;
    }
    function $e() {
      f.isDragging = !1, document.removeEventListener("mousemove", ce), document.removeEventListener("mouseup", $e), re();
    }
    document.addEventListener("mousemove", ce), document.addEventListener("mouseup", $e);
  }
  function st(y, w) {
    y.preventDefault(), y.stopPropagation(), f.isResizing = !0;
    const E = y.clientX, z = y.clientY, j = w.width, G = w.height;
    function oe($e) {
      const Ce = ($e.clientX - E) / f.scale, Ke = ($e.clientY - z) / f.scale;
      w.width = Math.max(30, j + Ce), w.height = Math.max(20, G + Ke), w.placementSource = gt.MANUAL, ke();
    }
    function ce() {
      f.isResizing = !1, document.removeEventListener("mousemove", oe), document.removeEventListener("mouseup", ce), re();
    }
    document.addEventListener("mousemove", oe), document.addEventListener("mouseup", ce);
  }
  function me(y) {
    const w = f.fieldInstances.find((E) => E.id === y);
    w && (f.fieldInstances = f.fieldInstances.filter((E) => E.id !== y), ge(w.definitionId), ke(), we(), re());
  }
  function xe(y, w) {
    const z = T().canvas;
    !y || !z || (y.addEventListener("dragover", (j) => {
      j.preventDefault(), j.dataTransfer && (j.dataTransfer.dropEffect = "copy"), z.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), y.addEventListener("dragleave", () => {
      z.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), y.addEventListener("drop", (j) => {
      j.preventDefault(), z.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const G = j.dataTransfer?.getData("application/json") || "";
      if (!G) return;
      const oe = JSON.parse(G), ce = z.getBoundingClientRect(), $e = (j.clientX - ce.left) / f.scale, Ce = (j.clientY - ce.top) / f.scale;
      Qe(oe, $e, Ce);
    }));
  }
  function Fe() {
    const y = T();
    y.prevBtn?.addEventListener("click", async () => {
      f.currentPage > 1 && (f.currentPage -= 1, k(f.currentPage), await je(f.currentPage));
    }), y.nextBtn?.addEventListener("click", async () => {
      f.currentPage < f.totalPages && (f.currentPage += 1, k(f.currentPage), await je(f.currentPage));
    });
  }
  function Ye() {
    const y = T();
    y.zoomIn?.addEventListener("click", async () => {
      f.scale = Math.min(3, f.scale + 0.25), y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await je(f.currentPage);
    }), y.zoomOut?.addEventListener("click", async () => {
      f.scale = Math.max(0.5, f.scale - 0.25), y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await je(f.currentPage);
    }), y.zoomFit?.addEventListener("click", async () => {
      if (!f.pdfDoc || !y.viewer) return;
      const E = (await f.pdfDoc.getPage(f.currentPage)).getViewport({ scale: 1 });
      f.scale = (y.viewer.clientWidth - 40) / E.width, y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await je(f.currentPage);
    });
  }
  function P() {
    return T().policyPreset?.value || "balanced";
  }
  function M(y) {
    return y >= 0.8 ? "bg-green-100 text-green-800" : y >= 0.6 ? "bg-blue-100 text-blue-800" : y >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Y(y) {
    return y >= 0.9 ? "bg-green-100 text-green-800" : y >= 0.7 ? "bg-blue-100 text-blue-800" : y >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function H(y) {
    return y ? y.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Unknown";
  }
  function ie(y) {
    y.page_number !== f.currentPage && (f.currentPage = y.page_number, je(y.page_number));
    const w = T().overlays;
    if (!w) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const E = document.createElement("div");
    E.id = "suggestion-preview-overlay", E.className = "absolute pointer-events-none animate-pulse", E.style.cssText = `
      left: ${y.x * f.scale}px;
      top: ${y.y * f.scale}px;
      width: ${y.width * f.scale}px;
      height: ${y.height * f.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, w.appendChild(E), setTimeout(() => E.remove(), 3e3);
  }
  async function te(y, w) {
  }
  function Q() {
    const y = document.getElementById("placement-suggestions-modal");
    if (!y) return;
    const w = y.querySelectorAll('.suggestion-item[data-accepted="true"]');
    w.forEach((E) => {
      const z = Number.parseInt(E.dataset.index || "", 10), j = L.suggestions[z];
      if (!j) return;
      const G = h(j.field_definition_id);
      if (!G) return;
      const oe = C(j.field_definition_id);
      if (!oe || oe.classList.contains("opacity-50")) return;
      const ce = {
        definitionId: j.field_definition_id,
        fieldType: G.type,
        participantId: G.participant_id,
        participantName: oe.dataset.participantName || G.participant_name || "Unassigned"
      };
      f.currentPage = j.page_number, Je(ce, j);
    }), f.pdfDoc && je(f.currentPage), te(w.length, L.suggestions.length - w.length), x(`Applied ${w.length} placement${w.length !== 1 ? "s" : ""}`, "success");
  }
  function Ie(y) {
    y.querySelectorAll(".accept-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const E = w.closest(".suggestion-item");
        E && (E.classList.add("border-green-500", "bg-green-50"), E.classList.remove("border-red-500", "bg-red-50"), E.dataset.accepted = "true");
      });
    }), y.querySelectorAll(".reject-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const E = w.closest(".suggestion-item");
        E && (E.classList.add("border-red-500", "bg-red-50"), E.classList.remove("border-green-500", "bg-green-50"), E.dataset.accepted = "false");
      });
    }), y.querySelectorAll(".preview-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const E = Number.parseInt(w.dataset.index || "", 10), z = L.suggestions[E];
        z && ie(z);
      });
    });
  }
  function ue() {
    const y = document.createElement("div");
    return y.id = "placement-suggestions-modal", y.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", y.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Smart Placement Suggestions</h2>
            <p class="text-sm text-gray-500 mt-0.5">Review and apply AI-generated field placements</p>
          </div>
          <button type="button" id="close-suggestions-modal" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div id="run-stats"></div>
            <div class="flex items-center gap-2">
              <button type="button" id="accept-all-btn" class="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">
                Accept All
              </button>
              <button type="button" id="reject-all-btn" class="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors">
                Reject All
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-2 gap-4 p-6">
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Suggestions</h3>
              <div id="suggestions-list" class="space-y-3"></div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Resolver Ranking</h3>
              <div id="resolver-info" class="bg-gray-50 rounded-lg p-3"></div>

              <h3 class="text-sm font-medium text-gray-700 mt-4 mb-3">Policy Preset</h3>
              <select id="placement-policy-preset-modal" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="balanced">Balanced (Recommended)</option>
                <option value="accuracy-first">Accuracy First</option>
                <option value="cost-first">Cost Optimized</option>
                <option value="speed-first">Speed Optimized</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Change preset and re-run for different results</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" id="rerun-placement-btn" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Re-run with New Policy
          </button>
          <button type="button" id="apply-suggestions-btn" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Apply Selected
          </button>
        </div>
      </div>
    `, X(y, "#close-suggestions-modal")?.addEventListener("click", () => {
      y.classList.add("hidden");
    }), y.addEventListener("click", (w) => {
      w.target === y && y.classList.add("hidden");
    }), X(y, "#accept-all-btn")?.addEventListener("click", () => {
      y.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-green-500", "bg-green-50"), w.classList.remove("border-red-500", "bg-red-50"), w.dataset.accepted = "true";
      });
    }), X(y, "#reject-all-btn")?.addEventListener("click", () => {
      y.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-red-500", "bg-red-50"), w.classList.remove("border-green-500", "bg-green-50"), w.dataset.accepted = "false";
      });
    }), X(y, "#apply-suggestions-btn")?.addEventListener("click", () => {
      Q(), y.classList.add("hidden");
    }), X(y, "#rerun-placement-btn")?.addEventListener("click", () => {
      y.classList.add("hidden");
      const w = F(y, "#placement-policy-preset-modal"), E = T().policyPreset;
      E && w && (E.value = w.value), T().autoPlaceBtn?.click();
    }), y;
  }
  function q(y) {
    let w = document.getElementById("placement-suggestions-modal");
    w || (w = ue(), document.body.appendChild(w));
    const E = F(w, "#suggestions-list"), z = F(w, "#resolver-info"), j = F(w, "#run-stats");
    !E || !z || !j || (z.innerHTML = L.resolverScores.map((G) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${_(String(G?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${G.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${M(Number(G.score || 0))}">
              ${(Number(G?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), j.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${_(String(y?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${y.status === "completed" ? "text-green-600" : "text-amber-600"}">${_(String(y?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(y?.elapsed_ms || 0))}ms</span>
      </div>
    `, E.innerHTML = L.suggestions.map((G, oe) => {
      const ce = h(G.field_definition_id), $e = Ft[ce?.type || "text"] || Ft.text, Ce = _(String(ce?.type || "field").replace(/_/g, " ")), Ke = _(String(G?.id || "")), Ne = Math.max(1, Number(G?.page_number || 1)), at = Math.round(Number(G?.x || 0)), qe = Math.round(Number(G?.y || 0)), D = Math.max(0, Number(G?.confidence || 0)), $ = _(H(String(G?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${oe}" data-suggestion-id="${Ke}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${$e.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Ce}</div>
                <div class="text-xs text-gray-500">Page ${Ne}, (${at}, ${qe})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${Y(Number(G.confidence || 0))}">
                ${(D * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${$}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${oe}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${oe}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${oe}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), Ie(w), w.classList.remove("hidden"));
  }
  function Z() {
    const y = U();
    let w = 100;
    y.forEach((E) => {
      const z = {
        definitionId: E.dataset.definitionId || "",
        fieldType: E.dataset.fieldType || "text",
        participantId: E.dataset.participantId || "",
        participantName: E.dataset.participantName || "Unassigned"
      }, j = Yt[z.fieldType || "text"] || Yt.text;
      f.currentPage = f.totalPages, Qe(z, 300, w + j.height / 2, { placementSource: gt.AUTO_FALLBACK }), w += j.height + 20;
    }), f.pdfDoc && je(f.totalPages), x("Fields placed using fallback layout", "info");
  }
  async function ve() {
    const y = T();
    if (!y.autoPlaceBtn || L.isRunning) return;
    if (U().length === 0) {
      x("All fields are already placed", "info");
      return;
    }
    const E = document.querySelector('input[name="id"]')?.value;
    if (!E) {
      Z();
      return;
    }
    L.isRunning = !0, y.autoPlaceBtn.disabled = !0, y.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const z = await fetch(`${t}/esign/agreements/${E}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: P()
        })
      });
      if (!z.ok)
        throw await g(z, "Auto-placement failed");
      const j = await z.json(), G = ss(j) ? j.run || {} : j;
      L.currentRunId = G?.run_id || G?.id || null, L.suggestions = G?.suggestions || [], L.resolverScores = G?.resolver_scores || [], L.suggestions.length === 0 ? (x("No placement suggestions found. Try placing fields manually.", "warning"), Z()) : q(G);
    } catch (z) {
      console.error("Auto-place error:", z);
      const j = z && typeof z == "object" ? z : {}, G = v(j.message || "Auto-placement failed", j.code || "", j.status || 0);
      x(`Auto-placement failed: ${G}`, "error"), Z();
    } finally {
      L.isRunning = !1, y.autoPlaceBtn.disabled = !1, y.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function Ee() {
    const y = T();
    y.autoPlaceBtn && !f.autoPlaceBound && (y.autoPlaceBtn.addEventListener("click", () => {
      ve();
    }), f.autoPlaceBound = !0);
  }
  async function De() {
    const y = T();
    if (!n?.value) {
      y.loading?.classList.add("hidden"), y.noDocument?.classList.remove("hidden");
      return;
    }
    y.loading?.classList.remove("hidden"), y.noDocument?.classList.add("hidden");
    const w = s(), E = new Set(
      w.map((ce) => String(ce.definitionId || "").trim()).filter((ce) => ce)
    );
    f.fieldInstances = f.fieldInstances.filter(
      (ce) => E.has(String(ce.definitionId || "").trim())
    ), Ae();
    const z = ++f.loadRequestVersion, j = String(n.value || "").trim(), G = encodeURIComponent(j), oe = `${e}/panels/esign_documents/${G}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const $e = await window.pdfjsLib.getDocument({
        url: oe,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (z !== f.loadRequestVersion)
        return;
      f.pdfDoc = $e, f.totalPages = f.pdfDoc.numPages, f.currentPage = 1, y.totalPages && (y.totalPages.textContent = String(f.totalPages)), await je(f.currentPage), y.loading?.classList.add("hidden"), f.uiHandlersBound || (xe(y.viewer, y.overlays), Fe(), Ye(), f.uiHandlersBound = !0), ke();
    } catch (ce) {
      if (z !== f.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", ce), y.loading?.classList.add("hidden"), y.noDocument?.classList.remove("hidden"), y.noDocument) {
        const $e = ce && typeof ce == "object" ? ce : {};
        y.noDocument.textContent = `Failed to load PDF: ${v($e.message || "Failed to load PDF")}`;
      }
    }
    we(), re({ silent: !0 });
  }
  function Be(y) {
    const w = Array.isArray(y?.fieldPlacements) ? y.fieldPlacements : [];
    f.fieldInstances = w.map((E, z) => qt(E, z)), re({ silent: !0 });
  }
  return re({ silent: !0 }), {
    bindEvents: Ee,
    initPlacementEditor: De,
    getState: W,
    getLinkGroupState: B,
    setLinkGroupState: se,
    buildPlacementFormEntries: fe,
    updateFieldInstancesFormData: re,
    restoreFieldPlacementsFromState: Be
  };
}
function Dt(i, e, t = "") {
  return String(i.querySelector(e)?.value || t).trim();
}
function si(i, e, t = !1) {
  const n = i.querySelector(e);
  return n ? n.checked : t;
}
function os(i) {
  const {
    documentIdInput: e,
    documentPageCountInput: t,
    titleInput: n,
    messageInput: r,
    participantsContainer: o,
    fieldDefinitionsContainer: c,
    fieldPlacementsJSONInput: s,
    fieldRulesJSONInput: h,
    collectFieldRulesForForm: g,
    buildPlacementFormEntries: v,
    getCurrentStep: x,
    totalWizardSteps: _
  } = i;
  function b() {
    const f = [];
    o.querySelectorAll(".participant-entry").forEach((U) => {
      const X = String(U.getAttribute("data-participant-id") || "").trim(), F = Dt(U, 'input[name*=".name"]'), T = Dt(U, 'input[name*=".email"]'), W = Dt(U, 'select[name*=".role"]', "signer"), B = si(U, ".notify-input", !0), se = Dt(U, ".signing-stage-input"), fe = Number(se || "1") || 1;
      f.push({
        id: X,
        name: F,
        email: T,
        role: W,
        notify: B,
        signing_stage: W === "signer" ? fe : 0
      });
    });
    const L = [];
    c.querySelectorAll(".field-definition-entry").forEach((U) => {
      const X = String(U.getAttribute("data-field-definition-id") || "").trim(), F = Dt(U, ".field-type-select", "signature"), T = Dt(U, ".field-participant-select"), W = Number(Dt(U, 'input[name*=".page"]', "1")) || 1, B = si(U, 'input[name*=".required"]');
      X && L.push({
        id: X,
        type: F,
        participant_id: T,
        page: W,
        required: B
      });
    });
    const S = v(), C = JSON.stringify(S);
    return s && (s.value = C), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(r?.value || "").trim(),
      participants: f,
      field_instances: L,
      field_placements: S,
      field_placements_json: C,
      field_rules: g(),
      field_rules_json: String(h?.value || "[]"),
      send_for_signature: x() === _ ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(t?.value || "0") || 0
    };
  }
  return {
    buildCanonicalAgreementPayload: b
  };
}
function cs(i) {
  const {
    titleSource: e,
    stateManager: t,
    trackWizardStateChanges: n,
    participantsController: r,
    fieldDefinitionsController: o,
    placementController: c,
    updateFieldParticipantOptions: s,
    previewCard: h,
    wizardNavigationController: g,
    documentIdInput: v,
    documentPageCountInput: x,
    selectedDocumentTitle: _,
    agreementRefs: b,
    parsePositiveInt: f,
    isEditMode: L
  } = i;
  let S = null, C = !1;
  function U(ge) {
    C = !0;
    try {
      return ge();
    } finally {
      C = !1;
    }
  }
  function X(ge) {
    const he = ge?.document, de = document.getElementById("selected-document"), Se = document.getElementById("document-picker"), Re = document.getElementById("selected-document-info");
    if (v.value = String(he?.id || "").trim(), x) {
      const ze = f(he?.pageCount, 0) || 0;
      x.value = ze > 0 ? String(ze) : "";
    }
    if (_ && (_.textContent = String(he?.title || "").trim()), Re instanceof HTMLElement) {
      const ze = f(he?.pageCount, 0) || 0;
      Re.textContent = ze > 0 ? `${ze} pages` : "";
    }
    if (v.value) {
      de?.classList.remove("hidden"), Se?.classList.add("hidden");
      return;
    }
    de?.classList.add("hidden"), Se?.classList.remove("hidden");
  }
  function F(ge) {
    b.form.titleInput.value = String(ge?.details?.title || ""), b.form.messageInput.value = String(ge?.details?.message || "");
  }
  function T() {
    C || (S !== null && clearTimeout(S), S = setTimeout(() => {
      n();
    }, 500));
  }
  function W(ge) {
    r.restoreFromState(ge);
  }
  function B(ge) {
    o.restoreFieldDefinitionsFromState(ge);
  }
  function se(ge) {
    o.restoreFieldRulesFromState(ge);
  }
  function fe(ge) {
    c.restoreFieldPlacementsFromState(ge);
  }
  function re() {
    v && new MutationObserver(() => {
      C || n();
    }).observe(v, { attributes: !0, attributeFilter: ["value"] });
    const ge = document.getElementById("title"), he = document.getElementById("message");
    ge instanceof HTMLInputElement && ge.addEventListener("input", () => {
      const de = String(ge.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(de), T();
    }), (he instanceof HTMLInputElement || he instanceof HTMLTextAreaElement) && he.addEventListener("input", T), r.refs.participantsContainer?.addEventListener("input", T), r.refs.participantsContainer?.addEventListener("change", T), o.refs.fieldDefinitionsContainer?.addEventListener("input", T), o.refs.fieldDefinitionsContainer?.addEventListener("change", T), o.refs.fieldRulesContainer?.addEventListener("input", T), o.refs.fieldRulesContainer?.addEventListener("change", T);
  }
  function we(ge, he = {}) {
    U(() => {
      if (X(ge), F(ge), W(ge), B(ge), se(ge), s(), fe(ge), he.updatePreview !== !1) {
        const Se = ge?.document;
        Se?.id ? h.setDocument(
          Se.id,
          Se.title || null,
          Se.pageCount ?? null
        ) : h.clear();
      }
      const de = f(
        he.step ?? ge?.currentStep,
        g.getCurrentStep()
      ) || 1;
      g.setCurrentStep(de), g.updateWizardUI();
    });
  }
  function He() {
    if (g.updateWizardUI(), v.value) {
      const ge = _?.textContent || null, he = f(x?.value, 0) || null;
      h.setDocument(v.value, ge, he);
    } else
      h.clear();
    L && b.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: re,
    debouncedTrackChanges: T,
    applyStateToUI: we,
    renderInitialWizardUI: He
  };
}
function ls(i) {
  return i.querySelector('select[name*=".role"]');
}
function ds(i) {
  return i.querySelector(".field-participant-select");
}
function us(i) {
  const {
    documentIdInput: e,
    titleInput: t,
    participantsContainer: n,
    fieldDefinitionsContainer: r,
    fieldRulesContainer: o,
    addFieldBtn: c,
    ensureSelectedDocumentCompatibility: s,
    collectFieldRulesForState: h,
    findSignersMissingRequiredSignatureField: g,
    missingSignatureFieldMessage: v,
    announceError: x
  } = i;
  function _(b) {
    switch (b) {
      case 1:
        return e.value ? !!s() : (x("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (x("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const f = n.querySelectorAll(".participant-entry");
        if (f.length === 0)
          return x("Please add at least one participant"), !1;
        let L = !1;
        return f.forEach((S) => {
          ls(S)?.value === "signer" && (L = !0);
        }), L ? !0 : (x("At least one signer is required"), !1);
      }
      case 4: {
        const f = r.querySelectorAll(".field-definition-entry");
        for (const U of Array.from(f)) {
          const X = ds(U);
          if (!X?.value)
            return x("Please assign all fields to a signer"), X?.focus(), !1;
        }
        if (h().find((U) => !U.participantId))
          return x("Please assign all automation rules to a signer"), o?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const C = g();
        return C.length > 0 ? (x(v(C)), c.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: _
  };
}
function ps(i) {
  const {
    isEditMode: e,
    storageKey: t,
    stateManager: n,
    syncOrchestrator: r,
    syncService: o,
    applyResumedState: c,
    hasMeaningfulWizardProgress: s,
    formatRelativeTime: h,
    emitWizardTelemetry: g,
    getActiveTabDebugState: v
  } = i;
  function x(F, T) {
    return n.normalizeLoadedState({
      ...T,
      currentStep: F.currentStep,
      document: F.document,
      details: F.details,
      participants: F.participants,
      fieldDefinitions: F.fieldDefinitions,
      fieldPlacements: F.fieldPlacements,
      fieldRules: F.fieldRules,
      titleSource: F.titleSource,
      syncPending: !0,
      serverDraftId: T.serverDraftId,
      serverRevision: T.serverRevision,
      lastSyncedAt: T.lastSyncedAt
    });
  }
  async function _() {
    if (e) return n.getState();
    const F = n.normalizeLoadedState(n.getState());
    ht("resume_reconcile_start", Xe({
      state: F,
      storageKey: t,
      ownership: v?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const T = String(F?.serverDraftId || "").trim();
    if (!T) {
      if (!s(F))
        try {
          const W = await o.bootstrap();
          return n.setState({
            ...W.snapshot?.data?.wizard_state && typeof W.snapshot.data.wizard_state == "object" ? W.snapshot.data.wizard_state : {},
            resourceRef: W.resourceRef,
            serverDraftId: String(W.snapshot?.ref?.id || "").trim() || null,
            serverRevision: Number(W.snapshot?.revision || 0),
            lastSyncedAt: String(W.snapshot?.updatedAt || "").trim() || null,
            syncPending: !1
          }, { syncPending: !1, notify: !1 }), n.getState();
        } catch {
          Et("resume_reconcile_bootstrap_failed", Xe({
            state: F,
            storageKey: t,
            ownership: v?.() || void 0,
            sendAttemptId: null,
            extra: {
              source: "bootstrap_failed_keep_local"
            }
          }));
        }
      return n.setState(F, { syncPending: !!F.syncPending, notify: !1 }), ht("resume_reconcile_complete", Xe({
        state: F,
        storageKey: t,
        ownership: v?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), n.getState();
    }
    try {
      const W = await o.load(T), B = n.normalizeLoadedState({
        ...W?.wizard_state && typeof W.wizard_state == "object" ? W.wizard_state : {},
        resourceRef: W?.resource_ref || F.resourceRef || null,
        serverDraftId: String(W?.id || T).trim() || T,
        serverRevision: Number(W?.revision || 0),
        lastSyncedAt: String(W?.updated_at || W?.updatedAt || "").trim() || F.lastSyncedAt,
        syncPending: !1
      }), se = String(F.serverDraftId || "").trim() === String(B.serverDraftId || "").trim(), fe = se && F.syncPending === !0 ? x(F, B) : B;
      return n.setState(fe, { syncPending: !!fe.syncPending, notify: !1 }), ht("resume_reconcile_complete", Xe({
        state: fe,
        storageKey: t,
        ownership: v?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: se && F.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(W?.id || T).trim() || null,
          loadedRevision: Number(W?.revision || 0)
        }
      })), n.getState();
    } catch (W) {
      const B = typeof W == "object" && W !== null && "status" in W ? Number(W.status || 0) : 0;
      if (B === 404) {
        const se = n.normalizeLoadedState({
          ...F,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return n.setState(se, { syncPending: !!se.syncPending, notify: !1 }), Et("resume_reconcile_remote_missing", Xe({
          state: se,
          storageKey: t,
          ownership: v?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: T,
            status: B
          }
        })), n.getState();
      }
      return Et("resume_reconcile_failed", Xe({
        state: F,
        storageKey: t,
        ownership: v?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: T,
          status: B
        }
      })), n.getState();
    }
  }
  function b(F) {
    return document.getElementById(F);
  }
  function f() {
    const F = document.getElementById("resume-dialog-modal"), T = n.getState(), W = String(T?.document?.title || "").trim() || String(T?.document?.id || "").trim() || "Unknown document", B = b("resume-draft-title"), se = b("resume-draft-document"), fe = b("resume-draft-step"), re = b("resume-draft-time");
    B && (B.textContent = T.details?.title || "Untitled Agreement"), se && (se.textContent = W), fe && (fe.textContent = String(T.currentStep || 1)), re && (re.textContent = h(T.updatedAt)), F?.classList.remove("hidden"), g("wizard_resume_prompt_shown", {
      step: Number(T.currentStep || 1),
      has_server_draft: !!T.serverDraftId
    });
  }
  async function L(F = {}) {
    const T = F.deleteServerDraft === !0, W = String(n.getState()?.serverDraftId || "").trim();
    if (n.clear(), r.broadcastStateUpdate(), W && r.broadcastDraftDisposed?.(W, T ? "resume_clear_delete" : "resume_clear_local"), !(!T || !W))
      try {
        await o.dispose(W);
      } catch (B) {
        console.warn("Failed to delete server draft:", B);
      }
  }
  function S() {
    return n.normalizeLoadedState({
      ...n.getState(),
      ...n.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  async function C(F) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const T = S();
    switch (F) {
      case "continue":
        !String(n.getState()?.serverDraftId || "").trim() && s(T) && await o.create(T), c(n.getState());
        return;
      case "start_new":
        await L({ deleteServerDraft: !1 }), s(T) ? await o.create(T) : await _(), c(n.getState());
        return;
      case "proceed":
        await L({ deleteServerDraft: !0 }), s(T) ? await o.create(T) : await _(), c(n.getState());
        return;
      case "discard":
        await L({ deleteServerDraft: !0 }), await _(), c(n.getState());
        return;
      default:
        return;
    }
  }
  function U() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      C("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      C("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      C("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      C("discard");
    });
  }
  async function X() {
    e || (await _(), n.hasResumableState() && f());
  }
  return {
    bindEvents: U,
    reconcileBootstrapState: _,
    maybeShowResumeDialog: X
  };
}
function gs(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let r = "saved";
  function o(b) {
    if (!b) return "unknown";
    const f = new Date(b), S = (/* @__PURE__ */ new Date()).getTime() - f.getTime(), C = Math.floor(S / 6e4), U = Math.floor(S / 36e5), X = Math.floor(S / 864e5);
    return C < 1 ? "just now" : C < 60 ? `${C} minute${C !== 1 ? "s" : ""} ago` : U < 24 ? `${U} hour${U !== 1 ? "s" : ""} ago` : X < 7 ? `${X} day${X !== 1 ? "s" : ""} ago` : f.toLocaleDateString();
  }
  function c() {
    const b = n.getState();
    r === "paused" && s(b?.syncPending ? "pending" : "saved");
  }
  function s(b) {
    r = String(b || "").trim() || "saved";
    const f = e.sync.indicator, L = e.sync.icon, S = e.sync.text, C = e.sync.retryBtn;
    if (!(!f || !L || !S))
      switch (f.classList.remove("hidden"), b) {
        case "saved":
          L.className = "w-2 h-2 rounded-full bg-green-500", S.textContent = "Saved", S.className = "text-gray-600", C?.classList.add("hidden");
          break;
        case "saving":
          L.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", S.textContent = "Saving...", S.className = "text-gray-600", C?.classList.add("hidden");
          break;
        case "pending":
          L.className = "w-2 h-2 rounded-full bg-gray-400", S.textContent = "Unsaved changes", S.className = "text-gray-500", C?.classList.add("hidden");
          break;
        case "error":
          L.className = "w-2 h-2 rounded-full bg-amber-500", S.textContent = "Not synced", S.className = "text-amber-600", C?.classList.remove("hidden");
          break;
        case "paused":
          L.className = "w-2 h-2 rounded-full bg-slate-400", S.textContent = "Open in another tab", S.className = "text-slate-600", C?.classList.add("hidden");
          break;
        case "conflict":
          L.className = "w-2 h-2 rounded-full bg-red-500", S.textContent = "Conflict", S.className = "text-red-600", C?.classList.add("hidden");
          break;
        default:
          f.classList.add("hidden");
      }
  }
  function h(b) {
    const f = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = o(f.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(b || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function g(b, f = "", L = 0) {
    const S = String(f || "").trim().toUpperCase(), C = String(b || "").trim().toLowerCase();
    return S === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : S === "DRAFT_SEND_NOT_FOUND" || S === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : S === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : S === "SCOPE_DENIED" || C.includes("scope denied") ? "You don't have access to this organization's resources." : S === "TRANSPORT_SECURITY" || S === "TRANSPORT_SECURITY_REQUIRED" || C.includes("tls transport required") || Number(L) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : S === "PDF_UNSUPPORTED" || C === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(b || "").trim() !== "" ? String(b).trim() : "Something went wrong. Please try again.";
  }
  async function v(b, f = "") {
    const L = Number(b?.status || 0);
    let S = "", C = "", U = {};
    try {
      const X = await b.json();
      S = String(X?.error?.code || X?.code || "").trim(), C = String(X?.error?.message || X?.message || "").trim(), U = X?.error?.details && typeof X.error.details == "object" ? X.error.details : {}, String(U?.entity || "").trim().toLowerCase() === "drafts" && String(S).trim().toUpperCase() === "NOT_FOUND" && (S = "DRAFT_SEND_NOT_FOUND", C === "" && (C = "Draft not found"));
    } catch {
      C = "";
    }
    return C === "" && (C = f || `Request failed (${L || "unknown"})`), {
      status: L,
      code: S,
      details: U,
      message: g(C, S, L)
    };
  }
  function x(b, f = "", L = 0) {
    const S = g(b, f, L);
    t && (t.textContent = S), window.toastManager?.error ? window.toastManager.error(S) : alert(S);
  }
  async function _(b, f = {}) {
    const L = await b;
    return L?.blocked && L.reason === "passive_tab" ? (x(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), L) : (L?.error && String(f.errorMessage || "").trim() !== "" && x(f.errorMessage || ""), L);
  }
  return {
    announceError: x,
    formatRelativeTime: o,
    mapUserFacingError: g,
    parseAPIError: v,
    restoreSyncStatusFromState: c,
    showSyncConflictDialog: h,
    surfaceSyncOutcome: _,
    updateSyncStatus: s
  };
}
function ms(i) {
  const {
    createSuccess: e,
    stateManager: t,
    syncOrchestrator: n,
    syncService: r,
    applyStateToUI: o,
    surfaceSyncOutcome: c,
    getCurrentStep: s,
    reviewStep: h,
    onReviewStepRequested: g,
    updateActiveTabOwnershipUI: v
  } = i;
  function x() {
    const L = t.collectFormState();
    t.updateState(L), n.scheduleSync(), n.broadcastStateUpdate();
  }
  function _() {
    if (!e)
      return;
    const S = t.getState()?.serverDraftId;
    t.clear(), n.broadcastStateUpdate(), S && (n.broadcastDraftDisposed?.(S, "agreement_created"), r.dispose(S).catch((C) => {
      console.warn("Failed to dispose sync draft after successful create:", C);
    }));
  }
  function b() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await c(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      n.refreshCurrentDraft && (await n.refreshCurrentDraft({ preserveDirty: !1, force: !0 }), o(t.getState())), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const L = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      t.setState({
        ...t.getState(),
        serverRevision: L,
        syncPending: !0
      }, { syncPending: !0 });
      const S = await c(n.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (S?.success || S?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  function f() {
    document.getElementById("active-tab-take-control-btn")?.addEventListener("click", async () => {
      v(), await n.refreshCurrentDraft?.({ preserveDirty: !0, force: !0 }), s() === h && g();
    }), document.getElementById("active-tab-reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
  }
  return {
    bindOwnershipHandlers: f,
    bindRetryAndConflictHandlers: b,
    handleCreateSuccessCleanup: _,
    trackWizardStateChanges: x
  };
}
const Ct = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function Ci(i, e = Ct.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === Ct.USER ? Ct.USER : t === Ct.SERVER_SEED ? Ct.SERVER_SEED : t === Ct.AUTOFILL ? Ct.AUTOFILL : e;
}
function fs(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), r = String(t.email ?? "").trim(), o = String(t.role ?? "signer").trim().toLowerCase(), c = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), s = t.notify !== !1;
  return n !== "" || r !== "" || o !== "" && o !== "signer" || Number.isFinite(c) && c > 1 || !s ? !0 : e > 0;
}
function ai(i, e = {}) {
  const {
    normalizeTitleSource: t = Ci,
    titleSource: n = Ct
  } = e;
  if (!i || typeof i != "object") return !1;
  const r = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(r) && r > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const c = String(i.details?.title ?? "").trim(), s = String(i.details?.message ?? "").trim(), h = t(
    i.titleSource,
    c === "" ? n.AUTOFILL : n.USER
  );
  return !!(c !== "" && h !== n.SERVER_SEED || s !== "" || (Array.isArray(i.participants) ? i.participants : []).some((x, _) => fs(x, _)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function hs(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, r = n.replace(/\/+$/, ""), o = /\/v\d+$/i.test(r) ? r : `${r}/v1`, c = !!e.is_edit, s = !!e.create_success, h = String(e.submit_mode || "json").trim().toLowerCase(), g = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, v = Array.isArray(e.initial_participants) ? e.initial_participants : [], x = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], _ = e.sync && typeof e.sync == "object" ? e.sync : {}, b = Array.isArray(_.action_operations) ? _.action_operations.map((C) => String(C || "").trim()).filter(Boolean) : [], f = `${o}/esign`, L = {
    base_url: String(_.base_url || "").trim() || f,
    bootstrap_path: String(_.bootstrap_path || "").trim() || `${f}/sync/bootstrap/agreement-draft`,
    client_base_path: String(_.client_base_path || "").trim() || `${t}/sync-client/sync-core`,
    resource_kind: String(_.resource_kind || "").trim() || "agreement_draft",
    action_operations: b.length > 0 ? b : ["send", "discard"]
  }, S = {
    sync: L,
    base_path: t,
    api_base_path: n,
    is_edit: c,
    create_success: s,
    submit_mode: h,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: g
    },
    initial_participants: v,
    initial_field_instances: x
  };
  return {
    config: e,
    normalizedConfig: S,
    syncConfig: L,
    basePath: t,
    apiBase: n,
    apiVersionBase: o,
    isEditMode: c,
    createSuccess: s,
    submitMode: h,
    documentsUploadURL: g,
    initialParticipants: v,
    initialFieldInstances: x
  };
}
function ys(i = !0) {
  const e = { Accept: "application/json" };
  return i && (e["Content-Type"] = "application/json"), e;
}
function vs(i = {}) {
  const {
    config: e = {},
    isEditMode: t = !1
  } = i, n = t ? "edit" : "create", r = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), o = [
    n,
    r || "agreement-form"
  ].join("|");
  return {
    WIZARD_STATE_VERSION: 1,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v1:${encodeURIComponent(o)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(o)}`,
    SYNC_DEBOUNCE_MS: 2e3,
    SYNC_RETRY_DELAYS: [1e3, 2e3, 5e3, 1e4, 3e4],
    ACTIVE_TAB_STORAGE_KEY: `esign_wizard_active_tab_v1:${encodeURIComponent(o)}`,
    ACTIVE_TAB_HEARTBEAT_MS: 5e3,
    ACTIVE_TAB_STALE_MS: 2e4,
    TITLE_SOURCE: Ct
  };
}
function wn(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function oi(i, e = "info") {
  const t = document.createElement("div");
  t.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${e === "success" ? "bg-green-600 text-white" : e === "error" ? "bg-red-600 text-white" : e === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, t.textContent = i, document.body.appendChild(t), setTimeout(() => {
    t.style.opacity = "0", setTimeout(() => t.remove(), 300);
  }, 3e3);
}
function $t(i, e) {
  if (!i)
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function bs(i, e) {
  if (!(i instanceof HTMLButtonElement))
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function ws(i = {}) {
  const {
    config: e,
    normalizedConfig: t,
    syncConfig: n,
    basePath: r,
    apiBase: o,
    apiVersionBase: c,
    isEditMode: s,
    createSuccess: h,
    submitMode: g,
    documentsUploadURL: v,
    initialParticipants: x,
    initialFieldInstances: _
  } = hs(i), b = Pr(document), {
    WIZARD_STATE_VERSION: f,
    WIZARD_STORAGE_KEY: L,
    WIZARD_CHANNEL_NAME: S,
    SYNC_DEBOUNCE_MS: C,
    SYNC_RETRY_DELAYS: U,
    ACTIVE_TAB_STORAGE_KEY: X,
    ACTIVE_TAB_HEARTBEAT_MS: F,
    ACTIVE_TAB_STALE_MS: T,
    TITLE_SOURCE: W
  } = vs({
    config: e,
    isEditMode: s
  }), B = Br(), se = (O, le = W.AUTOFILL) => Ci(O, le), fe = (O) => ai(O, {
    normalizeTitleSource: se,
    titleSource: W
  }), re = Cr({
    apiBasePath: c,
    basePath: r
  }), we = b.form.root, He = bs(b.form.submitBtn, "submit button"), ge = b.form.announcements;
  let he = null, de = null, Se = null, Re = null, ze = null, nt = null, Ae = null, et = null, Me = an();
  const je = (O, le = {}) => {
    Re?.applyStateToUI(O, le);
  }, lt = () => Re?.debouncedTrackChanges?.(), k = () => et?.trackWizardStateChanges?.(), pe = (O) => Ae?.formatRelativeTime(O) || "unknown", ke = () => Ae?.restoreSyncStatusFromState(), Qe = (O) => Ae?.updateSyncStatus(O), Je = (O) => Ae?.showSyncConflictDialog(O), it = (O, le = "", dt = 0) => Ae?.mapUserFacingError(O, le, dt) || String(O || "").trim(), st = (O, le) => Ae ? Ae.parseAPIError(O, le) : Promise.resolve({ status: Number(O.status || 0), code: "", details: {}, message: le }), me = (O, le = "", dt = 0) => Ae?.announceError(O, le, dt), xe = (O, le = {}) => Ae ? Ae.surfaceSyncOutcome(O, le) : Promise.resolve({}), Fe = () => ({
    isOwner: te?.isOwner ?? Q.isOwner,
    claim: te?.currentClaim ?? Q.currentClaim,
    blockedReason: te?.lastBlockedReason ?? Q.lastBlockedReason
  }), Ye = Tr(b, {
    formatRelativeTime: pe
  }), P = (O = {}) => Ye.render(O), M = async (O, le) => {
    const dt = await st(O, le), tt = new Error(dt.message);
    return tt.code = dt.code, tt.status = dt.status, tt;
  }, Y = {
    hasResumableState: () => H.hasResumableState(),
    setTitleSource: (O, le) => H.setTitleSource(O, le),
    updateDocument: (O) => H.updateDocument(O),
    updateDetails: (O, le) => H.updateDetails(O, le),
    getState: () => {
      const O = H.getState();
      return {
        titleSource: O.titleSource,
        details: O.details && typeof O.details == "object" ? O.details : {}
      };
    }
  }, H = new _r({
    storageKey: L,
    stateVersion: f,
    totalWizardSteps: Vt,
    titleSource: W,
    normalizeTitleSource: se,
    parsePositiveInt: Ze,
    hasMeaningfulWizardProgress: fe,
    collectFormState: () => {
      const O = b.form.documentIdInput?.value || null, le = document.getElementById("selected-document-title")?.textContent?.trim() || null, dt = se(
        H.getState()?.titleSource,
        String(b.form.titleInput?.value || "").trim() === "" ? W.AUTOFILL : W.USER
      );
      return {
        document: {
          id: O,
          title: le,
          pageCount: parseInt(b.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: b.form.titleInput?.value || "",
          message: b.form.messageInput?.value || ""
        },
        titleSource: dt,
        participants: he?.collectParticipantsForState?.() || [],
        fieldDefinitions: de?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: Se?.getState?.()?.fieldInstances || [],
        fieldRules: de?.collectFieldRulesForState?.() || []
      };
    },
    emitTelemetry: B
  });
  H.start(), Ae = gs({
    agreementRefs: b,
    formAnnouncements: ge,
    stateManager: H
  });
  const ie = new Rr({
    stateManager: H,
    requestHeaders: ys,
    syncConfig: n
  });
  let te;
  const Q = new Mr({
    storageKey: X,
    channelName: S,
    heartbeatMs: F,
    staleMs: T,
    telemetry: B,
    onOwnershipChange: (O) => {
      ke(), Ye.render(O);
    },
    onRemoteState: () => {
    },
    onRemoteSync: (O) => {
      String(H.getState()?.serverDraftId || "").trim() === String(O || "").trim() && (H.getState()?.syncPending || te?.refreshCurrentDraft({ preserveDirty: !0, force: !0 }).then(() => {
        je(H.getState(), {
          step: Number(H.getState()?.currentStep || 1)
        });
      }));
    },
    onRemoteDraftDisposed: (O) => {
      String(H.getState()?.serverDraftId || "").trim() === String(O || "").trim() && (H.getState()?.syncPending || H.setState({
        ...H.getState(),
        serverDraftId: null,
        serverRevision: 0,
        lastSyncedAt: null,
        resourceRef: null
      }, {
        notify: !0,
        save: !0,
        syncPending: !1
      }));
    },
    onVisibilityHidden: () => {
      te?.forceSync();
    },
    onPageHide: () => {
      te?.forceSync();
    },
    onBeforeUnload: () => {
      te?.forceSync();
    }
  });
  te = new $r({
    stateManager: H,
    syncService: ie,
    activeTabController: Q,
    storageKey: L,
    statusUpdater: Qe,
    showConflictDialog: Je,
    syncDebounceMs: C,
    syncRetryDelays: U,
    documentRef: document,
    windowRef: window
  });
  const ue = Ar({
    context: {
      config: t,
      refs: b,
      basePath: r,
      apiBase: o,
      apiVersionBase: c,
      previewCard: re,
      emitTelemetry: B,
      stateManager: H,
      syncService: ie,
      activeTabController: Q,
      syncController: te
    },
    hooks: {
      renderInitialUI() {
        Re?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        nt?.maybeShowResumeDialog?.(), q.loadDocuments(), q.loadRecentDocuments();
      },
      destroy() {
        Ye.destroy(), H.destroy();
      }
    }
  }), q = Qr({
    apiBase: o,
    apiVersionBase: c,
    documentsUploadURL: v,
    isEditMode: s,
    titleSource: W,
    normalizeTitleSource: se,
    stateManager: Y,
    previewCard: re,
    parseAPIError: M,
    announceError: me,
    showToast: oi,
    mapUserFacingError: it,
    renderFieldRulePreview: () => de?.renderFieldRulePreview?.()
  });
  q.initializeTitleSourceSeed(), q.bindEvents();
  const Z = $t(q.refs.documentIdInput, "document id input"), ve = $t(q.refs.documentSearch, "document search input"), Ee = q.refs.selectedDocumentTitle, De = q.refs.documentPageCountInput, Be = q.ensureSelectedDocumentCompatibility, y = q.getCurrentDocumentPageCount;
  he = Zr({
    initialParticipants: x,
    onParticipantsChanged: () => de?.updateFieldParticipantOptions?.()
  }), he.initialize(), he.bindEvents();
  const w = $t(he.refs.participantsContainer, "participants container"), E = $t(he.refs.addParticipantBtn, "add participant button"), z = () => he?.getSignerParticipants() || [];
  de = rs({
    initialFieldInstances: _,
    placementSource: gt,
    getCurrentDocumentPageCount: y,
    getSignerParticipants: z,
    escapeHtml: wn,
    onDefinitionsChanged: () => lt(),
    onRulesChanged: () => lt(),
    onParticipantsChanged: () => de?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => Se?.getLinkGroupState?.() || Me,
    setPlacementLinkGroupState: (O) => {
      Me = O || an(), Se?.setLinkGroupState?.(Me);
    }
  }), de.bindEvents(), de.initialize();
  const j = $t(de.refs.fieldDefinitionsContainer, "field definitions container"), G = de.refs.fieldRulesContainer, oe = $t(de.refs.addFieldBtn, "add field button"), ce = de.refs.fieldPlacementsJSONInput, $e = de.refs.fieldRulesJSONInput, Ce = () => de?.collectFieldRulesForState() || [], Ke = () => de?.collectFieldRulesForState() || [], Ne = () => de?.collectFieldRulesForForm() || [], at = (O, le) => de?.expandRulesForPreview(O, le) || [], qe = () => de?.updateFieldParticipantOptions(), D = () => de.collectPlacementFieldDefinitions(), $ = (O) => de?.getFieldDefinitionById(O) || null, N = () => de?.findSignersMissingRequiredSignatureField() || [], K = (O) => de?.missingSignatureFieldMessage(O) || "", ae = Ur({
    documentIdInput: Z,
    selectedDocumentTitle: Ee,
    participantsContainer: w,
    fieldDefinitionsContainer: j,
    submitBtn: He,
    syncOrchestrator: te,
    escapeHtml: wn,
    getSignerParticipants: z,
    getCurrentDocumentPageCount: y,
    collectFieldRulesForState: Ke,
    expandRulesForPreview: at,
    findSignersMissingRequiredSignatureField: N,
    goToStep: (O) => ee.goToStep(O)
  });
  Se = as({
    apiBase: o,
    apiVersionBase: c,
    documentIdInput: Z,
    fieldPlacementsJSONInput: ce,
    initialFieldInstances: de.buildInitialPlacementInstances(),
    initialLinkGroupState: Me,
    collectPlacementFieldDefinitions: D,
    getFieldDefinitionById: $,
    parseAPIError: M,
    mapUserFacingError: it,
    showToast: oi,
    escapeHtml: wn,
    onPlacementsChanged: () => k()
  }), Se.bindEvents(), Me = Se.getLinkGroupState();
  const ee = Hr({
    totalWizardSteps: Vt,
    wizardStep: rt,
    nextStepLabels: fr,
    submitBtn: He,
    syncOrchestrator: te,
    previewCard: re,
    updateActiveTabOwnershipUI: P,
    validateStep: (O) => ze?.validateStep(O) !== !1,
    onPlacementStep() {
      Se.initPlacementEditor();
    },
    onReviewStep() {
      ae.initSendReadinessCheck();
    },
    onStepChanged(O) {
      H.updateStep(O), k(), te.forceSync();
    }
  });
  ee.bindEvents(), et = ms({
    createSuccess: h,
    stateManager: H,
    syncOrchestrator: te,
    syncService: ie,
    applyStateToUI: (O) => je(O, {
      step: Number(O?.currentStep || 1)
    }),
    surfaceSyncOutcome: xe,
    getCurrentStep: () => ee.getCurrentStep(),
    reviewStep: rt.REVIEW,
    onReviewStepRequested: () => ae.initSendReadinessCheck(),
    updateActiveTabOwnershipUI: P
  }), et.handleCreateSuccessCleanup(), et.bindRetryAndConflictHandlers(), et.bindOwnershipHandlers();
  const Le = os({
    documentIdInput: Z,
    documentPageCountInput: De,
    titleInput: b.form.titleInput,
    messageInput: b.form.messageInput,
    participantsContainer: w,
    fieldDefinitionsContainer: j,
    fieldPlacementsJSONInput: ce,
    fieldRulesJSONInput: $e,
    collectFieldRulesForForm: () => Ne(),
    buildPlacementFormEntries: () => Se?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => ee.getCurrentStep(),
    totalWizardSteps: Vt
  }), Oe = () => Le.buildCanonicalAgreementPayload();
  return Re = cs({
    titleSource: W,
    stateManager: H,
    trackWizardStateChanges: k,
    participantsController: he,
    fieldDefinitionsController: de,
    placementController: Se,
    updateFieldParticipantOptions: qe,
    previewCard: re,
    wizardNavigationController: ee,
    documentIdInput: Z,
    documentPageCountInput: De,
    selectedDocumentTitle: Ee,
    agreementRefs: b,
    parsePositiveInt: Ze,
    isEditMode: s
  }), Re.bindChangeTracking(), ze = us({
    documentIdInput: Z,
    titleInput: b.form.titleInput,
    participantsContainer: w,
    fieldDefinitionsContainer: j,
    fieldRulesContainer: G,
    addFieldBtn: oe,
    ensureSelectedDocumentCompatibility: Be,
    collectFieldRulesForState: Ce,
    findSignersMissingRequiredSignatureField: N,
    missingSignatureFieldMessage: K,
    announceError: me
  }), nt = ps({
    isEditMode: s,
    storageKey: L,
    stateManager: H,
    syncOrchestrator: te,
    syncService: ie,
    applyResumedState: (O) => je(O, {
      step: Number(O?.currentStep || 1)
    }),
    hasMeaningfulWizardProgress: ai,
    formatRelativeTime: pe,
    emitWizardTelemetry: (O, le) => B(O, le),
    getActiveTabDebugState: Fe
  }), nt.bindEvents(), qr({
    config: e,
    form: we,
    submitBtn: He,
    documentIdInput: Z,
    documentSearch: ve,
    participantsContainer: w,
    addParticipantBtn: E,
    fieldDefinitionsContainer: j,
    fieldRulesContainer: G,
    documentPageCountInput: De,
    fieldPlacementsJSONInput: ce,
    fieldRulesJSONInput: $e,
    storageKey: L,
    syncService: ie,
    syncOrchestrator: te,
    stateManager: H,
    submitMode: g,
    totalWizardSteps: Vt,
    wizardStep: rt,
    getCurrentStep: () => ee.getCurrentStep(),
    getPlacementState: () => Se.getState(),
    getCurrentDocumentPageCount: y,
    ensureSelectedDocumentCompatibility: Be,
    collectFieldRulesForState: Ce,
    collectFieldRulesForForm: Ne,
    expandRulesForPreview: at,
    findSignersMissingRequiredSignatureField: N,
    missingSignatureFieldMessage: K,
    getSignerParticipants: z,
    buildCanonicalAgreementPayload: Oe,
    announceError: me,
    emitWizardTelemetry: B,
    parseAPIError: st,
    goToStep: (O) => ee.goToStep(O),
    showSyncConflictDialog: Je,
    surfaceSyncOutcome: xe,
    updateSyncStatus: Qe,
    getActiveTabDebugState: Fe,
    addFieldBtn: oe
  }).bindEvents(), ue;
}
let on = null;
function Ss() {
  on?.destroy(), on = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function xs(i = {}) {
  if (on)
    return;
  const e = ws(i);
  e.start(), on = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function Is(i) {
  return {
    sync: i.sync && typeof i.sync == "object" ? {
      base_url: String(i.sync.base_url || "").trim(),
      bootstrap_path: String(i.sync.bootstrap_path || "").trim(),
      client_base_path: String(i.sync.client_base_path || "").trim(),
      resource_kind: String(i.sync.resource_kind || "").trim(),
      action_operations: Array.isArray(i.sync.action_operations) ? i.sync.action_operations.map((e) => String(e || "").trim()).filter(Boolean) : []
    } : void 0,
    base_path: String(i.base_path || i.basePath || "").trim(),
    api_base_path: String(i.api_base_path || i.apiBasePath || "").trim(),
    user_id: String(i.user_id || "").trim(),
    is_edit: !!(i.is_edit ?? i.isEditMode),
    create_success: !!(i.create_success ?? i.createSuccess),
    submit_mode: String(i.submit_mode || "json").trim().toLowerCase(),
    routes: {
      index: String(i.routes?.index || "").trim(),
      documents: String(i.routes?.documents || "").trim(),
      create: String(i.routes?.create || "").trim(),
      documents_upload_url: String(i.routes?.documents_upload_url || "").trim()
    },
    initial_participants: Array.isArray(i.initial_participants) ? i.initial_participants : [],
    initial_field_instances: Array.isArray(i.initial_field_instances) ? i.initial_field_instances : []
  };
}
class Li {
  constructor(e) {
    this.initialized = !1, this.config = Is(e);
  }
  init() {
    this.initialized || (this.initialized = !0, xs(this.config));
  }
  destroy() {
    Ss(), this.initialized = !1;
  }
}
function $a(i) {
  const e = new Li(i);
  return _e(() => e.init()), e;
}
function Es(i) {
  const e = new Li({
    sync: i.sync,
    basePath: i.basePath,
    apiBasePath: i.apiBasePath,
    base_path: i.base_path,
    api_base_path: i.api_base_path,
    user_id: i.user_id,
    isEditMode: i.isEditMode,
    is_edit: i.is_edit,
    createSuccess: i.createSuccess,
    create_success: i.create_success,
    submit_mode: i.submit_mode || "json",
    initial_participants: i.initial_participants || [],
    initial_field_instances: i.initial_field_instances || [],
    routes: i.routes
  });
  _e(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && _e(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      Es({
        sync: t.sync && typeof t.sync == "object" ? t.sync : void 0,
        base_path: t.base_path || t.basePath,
        api_base_path: t.api_base_path || t.apiBasePath,
        user_id: t.user_id || t.userId,
        is_edit: t.is_edit || t.isEditMode || !1,
        create_success: t.create_success || t.createSuccess || !1,
        submit_mode: t.submit_mode || "json",
        initial_participants: Array.isArray(t.initial_participants) ? t.initial_participants : [],
        initial_field_instances: Array.isArray(t.initial_field_instances) ? t.initial_field_instances : [],
        routes: t.routes || { index: "" }
      });
    } catch (t) {
      console.warn("Failed to parse agreement form page config:", t);
    }
});
const Cs = "esign.signer.profile.v1", ci = "esign.signer.profile.outbox.v1", Pn = 90, li = 500 * 1024;
class Ls {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : Pn;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Cs}:${e}`;
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
class As {
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
class Sn {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(ci);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [r, o] of Object.entries(t)) {
        if (!o || typeof o != "object")
          continue;
        const c = o;
        if (c.op === "clear") {
          n[r] = {
            op: "clear",
            updatedAt: Number(c.updatedAt) || Date.now()
          };
          continue;
        }
        const s = c.op === "patch" ? c.patch : c;
        n[r] = {
          op: "patch",
          patch: s && typeof s == "object" ? s : {},
          updatedAt: Number(c.updatedAt) || Date.now()
        };
      }
      return n;
    } catch {
      return {};
    }
  }
  outboxSave(e) {
    try {
      window.localStorage.setItem(ci, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), r = n[e], o = r?.op === "patch" ? r.patch || {} : {};
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
      const [n, r] = await Promise.all([
        this.localStore.load(e),
        this.remoteStore.load(e).catch(() => null)
      ]), o = this.pickLatest(n, r);
      return o && await this.localStore.save(e, o), await this.flushOutboxForKey(e), o;
    }
    return this.localStore.load(e);
  }
  async save(e, t) {
    if (this.mode === "remote_only") {
      if (!this.remoteStore)
        throw new Error("remote profile store not configured");
      const r = await this.remoteStore.save(e, t);
      return this.removeOutboxEntry(e), r;
    }
    const n = await this.localStore.save(e, t);
    if (this.mode === "hybrid" && this.remoteStore)
      try {
        const r = await this.remoteStore.save(e, t);
        return await this.localStore.save(e, r), this.removeOutboxEntry(e), r;
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
function Ps(i) {
  const e = i.profile?.mode || "local_only";
  return {
    token: String(i.token || "").trim(),
    apiBasePath: String(i.apiBasePath || "/api/v1/esign/signing").trim(),
    signerBasePath: String(i.signerBasePath || "/esign/sign").trim(),
    agreementId: String(i.agreementId || "").trim(),
    recipientId: String(i.recipientId || "").trim(),
    recipientEmail: String(i.recipientEmail || "").trim(),
    recipientName: String(i.recipientName || "").trim(),
    documentUrl: String(i.documentUrl || "").trim(),
    pageCount: Number(i.pageCount || 1) || 1,
    hasConsented: !!i.hasConsented,
    fields: Array.isArray(i.fields) ? i.fields : [],
    flowMode: i.flowMode || "unified",
    telemetryEnabled: i.telemetryEnabled !== !1,
    viewer: {
      coordinateSpace: i.viewer?.coordinateSpace || "pdf",
      contractVersion: String(i.viewer?.contractVersion || "1.0"),
      unit: i.viewer?.unit || "pt",
      origin: i.viewer?.origin || "top-left",
      yAxisDirection: i.viewer?.yAxisDirection || "down",
      pages: Array.isArray(i.viewer?.pages) ? i.viewer?.pages : [],
      compatibilityTier: String(i.viewer?.compatibilityTier || "").trim().toLowerCase(),
      compatibilityReason: String(i.viewer?.compatibilityReason || "").trim().toLowerCase(),
      compatibilityMessage: String(i.viewer?.compatibilityMessage || "").trim()
    },
    signerState: i.signerState || "active",
    recipientStage: Number(i.recipientStage || 1) || 1,
    activeStage: Number(i.activeStage || 1) || 1,
    activeRecipientIds: Array.isArray(i.activeRecipientIds) ? i.activeRecipientIds : [],
    waitingForRecipientIds: Array.isArray(i.waitingForRecipientIds) ? i.waitingForRecipientIds : [],
    profile: {
      mode: e,
      rememberByDefault: i.profile?.rememberByDefault !== !1,
      ttlDays: Number(i.profile?.ttlDays || Pn) || Pn,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Ts(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function xn(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function _s(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function ft(i) {
  const e = String(i || "").trim();
  return _s(e) ? "" : e;
}
function ks(i) {
  const e = new Ls(i.profile.ttlDays), t = new As(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new Sn("local_only", e, null) : i.profile.mode === "remote_only" ? new Sn("remote_only", e, t) : new Sn("hybrid", e, t);
}
function Ds() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Rs(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Ps(i), r = Ts(n), o = ks(n);
  Ds();
  const c = {
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
    track(a, l = {}) {
      if (!n.telemetryEnabled) return;
      const d = {
        event: a,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...l
      };
      this.events.push(d), this.isCriticalEvent(a) && this.flush();
    },
    /**
     * Check if event is critical and should be sent immediately
     * @param {string} eventName - Event name
     * @returns {boolean}
     */
    isCriticalEvent(a) {
      return [
        "viewer_load_failed",
        "submit_success",
        "submit_failed",
        "viewer_critical_error",
        "consent_declined"
      ].includes(a);
    },
    /**
     * Track viewer load completion
     * @param {boolean} success - Whether load succeeded
     * @param {number} duration - Load duration in ms
     * @param {string} error - Error message if failed
     */
    trackViewerLoad(a, l, d = null) {
      this.metrics.viewerLoadTime = l, this.track(a ? "viewer_load_success" : "viewer_load_failed", {
        duration: l,
        error: d,
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
    trackFieldSave(a, l, d, p, m = null) {
      this.metrics.fieldSaveLatencies.push(p), d ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: a, error: m }), this.track(d ? "field_save_success" : "field_save_failed", {
        fieldId: a,
        fieldType: l,
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
    trackSignatureAttach(a, l, d, p, m = null) {
      this.metrics.signatureAttachLatencies.push(p), this.track(d ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: a,
        signatureType: l,
        latency: p,
        error: m
      });
    },
    /**
     * Track consent action
     * @param {boolean} accepted - Whether consent was accepted
     */
    trackConsent(a) {
      this.metrics.consentTime = Date.now() - this.startTime, this.track(a ? "consent_accepted" : "consent_declined", {
        timeToConsent: this.metrics.consentTime
      });
    },
    /**
     * Track submission
     * @param {boolean} success - Whether submit succeeded
     * @param {string} error - Error message if failed
     */
    trackSubmit(a, l = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(a ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: s.fieldState.size,
        error: l
      });
    },
    /**
     * Track page navigation
     * @param {number} pageNum - Page number viewed
     */
    trackPageView(a) {
      this.metrics.pagesViewed.has(a) || (this.metrics.pagesViewed.add(a), this.track("page_viewed", {
        pageNum: a,
        totalPagesViewed: this.metrics.pagesViewed.size
      }));
    },
    /**
     * Track viewer critical error
     * @param {string} reason - Reason for error
     */
    trackViewerCriticalError(a) {
      this.track("viewer_critical_error", {
        reason: a,
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
    trackDegradedMode(a, l = {}) {
      this.track("degraded_mode", {
        degradationType: a,
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
        totalFields: s.fieldState?.size || 0,
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
    calculateAverage(a) {
      return a.length ? Math.round(a.reduce((l, d) => l + d, 0) / a.length) : 0;
    },
    /**
     * Flush events to backend
     */
    async flush() {
      if (!n.telemetryEnabled || this.events.length === 0) return;
      const a = [...this.events];
      this.events = [];
      try {
        if (navigator.sendBeacon) {
          const l = JSON.stringify({
            events: a,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, l);
        } else
          await fetch(`${n.apiBasePath}/telemetry/${n.token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              events: a,
              summary: this.getSessionSummary()
            }),
            keepalive: !0
          });
      } catch (l) {
        this.events = [...a, ...this.events], console.warn("Telemetry flush failed:", l);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    c.track("session_end", c.getSessionSummary()), c.flush();
  }), setInterval(() => c.flush(), 3e4);
  const s = {
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
    profileKey: r,
    profileData: null,
    profileRemember: n.profile.rememberByDefault,
    guidedTargetFieldId: null,
    writeCooldownUntil: 0,
    writeCooldownTimer: null,
    submitCooldownUntil: 0,
    submitCooldownTimer: null,
    isSubmitting: !1,
    overlayRenderFrameID: 0
  };
  function h() {
    s.overlayRenderFrameID || (s.overlayRenderFrameID = window.requestAnimationFrame(() => {
      s.overlayRenderFrameID = 0, ue();
    }));
  }
  function g(a) {
    const l = s.fieldState.get(a);
    l && (delete l.previewValueText, delete l.previewValueBool, delete l.previewSignatureUrl);
  }
  function v() {
    s.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function x(a, l) {
    const d = s.fieldState.get(a);
    if (!d) return;
    const p = ft(String(l || ""));
    if (!p) {
      delete d.previewValueText;
      return;
    }
    d.previewValueText = p, delete d.previewValueBool, delete d.previewSignatureUrl;
  }
  function _(a, l) {
    const d = s.fieldState.get(a);
    d && (d.previewValueBool = !!l, delete d.previewValueText, delete d.previewSignatureUrl);
  }
  function b(a, l) {
    const d = s.fieldState.get(a);
    if (!d) return;
    const p = String(l || "").trim();
    if (!p) {
      delete d.previewSignatureUrl;
      return;
    }
    d.previewSignatureUrl = p, delete d.previewValueText, delete d.previewValueBool;
  }
  const f = {
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
    getPageMetadata(a) {
      const l = n.viewer.pages?.find((p) => p.page === a);
      if (l)
        return {
          width: l.width,
          height: l.height,
          rotation: l.rotation || 0
        };
      const d = this.pageViewports.get(a);
      return d ? {
        width: d.width,
        height: d.height,
        rotation: d.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(a, l) {
      this.pageViewports.set(a, {
        width: l.width,
        height: l.height,
        rotation: l.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(a, l) {
      const d = a.page, p = this.getPageMetadata(d), m = l.offsetWidth, I = l.offsetHeight, A = a.pageWidth || p.width, J = a.pageHeight || p.height, ne = m / A, Pe = I / J;
      let ye = a.posX || 0, Te = a.posY || 0;
      n.viewer.origin === "bottom-left" && (Te = J - Te - (a.height || 30));
      const yt = ye * ne, bt = Te * Pe, be = (a.width || 150) * ne, Ve = (a.height || 30) * Pe;
      return {
        left: yt,
        top: bt,
        width: be,
        height: Ve,
        // Store original values for debugging
        _debug: {
          sourceX: ye,
          sourceY: Te,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: A,
          pageHeight: J,
          scaleX: ne,
          scaleY: Pe,
          zoom: s.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(a, l) {
      const d = this.pageToScreen(a, l);
      return {
        left: `${Math.round(d.left)}px`,
        top: `${Math.round(d.top)}px`,
        width: `${Math.round(d.width)}px`,
        height: `${Math.round(d.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, L = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(a, l, d, p) {
      const m = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: a,
            sha256: l,
            content_type: d,
            size_bytes: p
          })
        }
      );
      if (!m.ok)
        throw await tt(m, "Failed to get upload contract");
      const I = await m.json(), A = I?.contract || I;
      if (!A || typeof A != "object" || !A.upload_url)
        throw new Error("Invalid upload contract response");
      return A;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(a, l) {
      const d = new URL(a.upload_url, window.location.origin);
      a.upload_token && d.searchParams.set("upload_token", String(a.upload_token)), a.object_key && d.searchParams.set("object_key", String(a.object_key));
      const p = {
        "Content-Type": a.content_type || "image/png"
      };
      a.headers && Object.entries(a.headers).forEach(([I, A]) => {
        const J = String(I).toLowerCase();
        J === "x-esign-upload-token" || J === "x-esign-upload-key" || (p[I] = String(A));
      });
      const m = await fetch(d.toString(), {
        method: a.method || "PUT",
        headers: p,
        body: l,
        credentials: "omit"
      });
      if (!m.ok)
        throw await tt(m, `Upload failed: ${m.status} ${m.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [l, d] = a.split(","), p = l.match(/data:([^;]+)/), m = p ? p[1] : "image/png", I = atob(d), A = new Uint8Array(I.length);
      for (let J = 0; J < I.length; J++)
        A[J] = I.charCodeAt(J);
      return new Blob([A], { type: m });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, l) {
      const d = this.dataUrlToBlob(l), p = d.size, m = "image/png", I = await he(d), A = await this.requestUploadBootstrap(
        a,
        I,
        m,
        p
      );
      return await this.uploadToSignedUrl(A, d), {
        uploadToken: A.upload_token,
        objectKey: A.object_key,
        sha256: A.sha256,
        contentType: A.content_type
      };
    }
  }, S = {
    endpoint(a, l = "") {
      const d = encodeURIComponent(a), p = l ? `/${encodeURIComponent(l)}` : "";
      return `${n.apiBasePath}/signatures/${d}${p}`;
    },
    async list(a) {
      const l = new URL(this.endpoint(n.token), window.location.origin);
      l.searchParams.set("type", a);
      const d = await fetch(l.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!d.ok) {
        const m = await d.json().catch(() => ({}));
        throw new Error(m?.error?.message || "Failed to load saved signatures");
      }
      const p = await d.json();
      return Array.isArray(p?.signatures) ? p.signatures : [];
    },
    async save(a, l, d = "") {
      const p = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: a,
          label: d,
          data_url: l
        })
      });
      if (!p.ok) {
        const I = await p.json().catch(() => ({})), A = new Error(I?.error?.message || "Failed to save signature");
        throw A.code = I?.error?.code || "", A;
      }
      return (await p.json())?.signature || null;
    },
    async delete(a) {
      const l = await fetch(this.endpoint(n.token, a), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!l.ok) {
        const d = await l.json().catch(() => ({}));
        throw new Error(d?.error?.message || "Failed to delete signature");
      }
    }
  };
  function C(a) {
    const l = s.fieldState.get(a);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function U(a) {
    return s.savedSignaturesByType.get(a) || [];
  }
  async function X(a, l = !1) {
    const d = C(a);
    if (!l && s.savedSignaturesByType.has(d)) {
      F(a);
      return;
    }
    const p = await S.list(d);
    s.savedSignaturesByType.set(d, p), F(a);
  }
  function F(a) {
    const l = C(a), d = U(l), p = document.getElementById("sig-saved-list");
    if (p) {
      if (!d.length) {
        p.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      p.innerHTML = d.map((m) => {
        const I = xt(String(m?.thumbnail_data_url || m?.data_url || "")), A = xt(String(m?.label || "Saved signature")), J = xt(String(m?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${I}" alt="${A}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${A}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${xt(a)}" data-signature-id="${J}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${xt(a)}" data-signature-id="${J}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function T(a) {
    const l = s.signatureCanvases.get(a), d = C(a);
    if (!l || !Le(a))
      throw new Error(`Please add your ${d === "initials" ? "initials" : "signature"} first`);
    const p = l.canvas.toDataURL("image/png"), m = await S.save(d, p, d === "initials" ? "Initials" : "Signature");
    if (!m)
      throw new Error("Failed to save signature");
    const I = U(d);
    I.unshift(m), s.savedSignaturesByType.set(d, I), F(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function W(a, l) {
    const d = C(a), m = U(d).find((A) => String(A?.id || "") === String(l));
    if (!m) return;
    requestAnimationFrame(() => D(a)), await fe(a);
    const I = String(m.data_url || m.thumbnail_data_url || "").trim();
    I && (await N(a, I, { clearStrokes: !0 }), b(a, I), h(), at("draw", a), ot("Saved signature selected."));
  }
  async function B(a, l) {
    const d = C(a);
    await S.delete(l);
    const p = U(d).filter((m) => String(m?.id || "") !== String(l));
    s.savedSignaturesByType.set(d, p), F(a);
  }
  function se(a) {
    const l = String(a?.code || "").trim(), d = String(a?.message || "Unable to update saved signatures"), p = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : d;
    window.toastManager && window.toastManager.error(p), ot(p, "assertive");
  }
  async function fe(a, l = 8) {
    for (let d = 0; d < l; d++) {
      if (s.signatureCanvases.has(a)) return !0;
      await new Promise((p) => setTimeout(p, 40)), D(a);
    }
    return !1;
  }
  async function re(a, l) {
    const d = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(d))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => D(a)), await fe(a);
    const p = s.signatureCanvases.get(a);
    if (!p)
      throw new Error("Signature canvas is not ready");
    const m = await we(l), I = d === "image/png" ? m : await ge(m, p.drawWidth, p.drawHeight);
    if (He(I) > li)
      throw new Error(`Image exceeds ${Math.round(li / 1024)}KB limit after conversion`);
    await N(a, I, { clearStrokes: !0 }), b(a, I), h();
    const J = document.getElementById("sig-upload-preview-wrap"), ne = document.getElementById("sig-upload-preview");
    J && J.classList.remove("hidden"), ne && ne.setAttribute("src", I), ot("Signature image uploaded. You can now insert it.");
  }
  function we(a) {
    return new Promise((l, d) => {
      const p = new FileReader();
      p.onload = () => l(String(p.result || "")), p.onerror = () => d(new Error("Unable to read image file")), p.readAsDataURL(a);
    });
  }
  function He(a) {
    const l = String(a || "").split(",");
    if (l.length < 2) return 0;
    const d = l[1] || "", p = (d.match(/=+$/) || [""])[0].length;
    return Math.floor(d.length * 3 / 4) - p;
  }
  async function ge(a, l, d) {
    return await new Promise((p, m) => {
      const I = new Image();
      I.onload = () => {
        const A = document.createElement("canvas"), J = Math.max(1, Math.round(Number(l) || 600)), ne = Math.max(1, Math.round(Number(d) || 160));
        A.width = J, A.height = ne;
        const Pe = A.getContext("2d");
        if (!Pe) {
          m(new Error("Unable to process image"));
          return;
        }
        Pe.clearRect(0, 0, J, ne);
        const ye = Math.min(J / I.width, ne / I.height), Te = I.width * ye, yt = I.height * ye, bt = (J - Te) / 2, be = (ne - yt) / 2;
        Pe.drawImage(I, bt, be, Te, yt), p(A.toDataURL("image/png"));
      }, I.onerror = () => m(new Error("Unable to decode image file")), I.src = a;
    });
  }
  async function he(a) {
    if (window.crypto && window.crypto.subtle) {
      const l = await a.arrayBuffer(), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function de() {
    document.addEventListener("click", (a) => {
      const l = a.target;
      if (!(l instanceof Element)) return;
      const d = l.closest("[data-esign-action]");
      if (!d) return;
      switch (d.getAttribute("data-esign-action")) {
        case "prev-page":
          Z();
          break;
        case "next-page":
          ve();
          break;
        case "zoom-out":
          y();
          break;
        case "zoom-in":
          Be();
          break;
        case "fit-width":
          w();
          break;
        case "download-document":
          ji();
          break;
        case "show-consent-modal":
          Un();
          break;
        case "activate-field": {
          const m = d.getAttribute("data-field-id");
          m && z(m);
          break;
        }
        case "submit-signature":
          Ui();
          break;
        case "show-decline-modal":
          Hi();
          break;
        case "close-field-editor":
          O();
          break;
        case "save-field-editor":
          ln();
          break;
        case "hide-consent-modal":
          un();
          break;
        case "accept-consent":
          Ni();
          break;
        case "hide-decline-modal":
          Hn();
          break;
        case "confirm-decline":
          zi();
          break;
        case "retry-load-pdf":
          P();
          break;
        case "signature-tab": {
          const m = d.getAttribute("data-tab") || "draw", I = d.getAttribute("data-field-id");
          I && at(m, I);
          break;
        }
        case "clear-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && mt(m);
          break;
        }
        case "undo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && ae(m);
          break;
        }
        case "redo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && ee(m);
          break;
        }
        case "save-current-signature-library": {
          const m = d.getAttribute("data-field-id");
          m && T(m).catch(se);
          break;
        }
        case "select-saved-signature": {
          const m = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          m && I && W(m, I).catch(se);
          break;
        }
        case "delete-saved-signature": {
          const m = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          m && I && B(m, I).catch(se);
          break;
        }
        case "clear-signer-profile":
          Qe().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          At.togglePanel();
          break;
        case "debug-copy-session":
          At.copySessionInfo();
          break;
        case "debug-clear-cache":
          At.clearCache();
          break;
        case "debug-show-telemetry":
          At.showTelemetry();
          break;
        case "debug-reload-viewer":
          At.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const l = a.target;
      if (l instanceof HTMLInputElement) {
        if (l.matches("#sig-upload-input")) {
          const d = l.getAttribute("data-field-id"), p = l.files?.[0];
          if (!d || !p) return;
          re(d, p).catch((m) => {
            window.toastManager && window.toastManager.error(m?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (l.matches("#field-checkbox-input")) {
          const d = l.getAttribute("data-field-id") || s.activeFieldId;
          if (!d) return;
          _(d, l.checked), h();
        }
      }
    }), document.addEventListener("input", (a) => {
      const l = a.target;
      if (!(l instanceof HTMLInputElement) && !(l instanceof HTMLTextAreaElement)) return;
      const d = l.getAttribute("data-field-id") || s.activeFieldId;
      if (d) {
        if (l.matches("#sig-type-input")) {
          Ke(d, l.value || "", { syncOverlay: !0 });
          return;
        }
        if (l.matches("#field-text-input")) {
          x(d, l.value || ""), h();
          return;
        }
        l.matches("#field-checkbox-input") && l instanceof HTMLInputElement && (_(d, l.checked), h());
      }
    });
  }
  _e(async () => {
    de(), s.isLowMemory = st(), Ae(), et(), await je(), Me(), it(), Bn(), Mt(), await P(), ue(), document.addEventListener("visibilitychange", Se), "memory" in navigator && ze(), At.init();
  });
  function Se() {
    document.hidden && Re();
  }
  function Re() {
    const a = s.isLowMemory ? 1 : 2;
    for (; s.renderedPages.size > a; ) {
      let l = null, d = 1 / 0;
      if (s.renderedPages.forEach((p, m) => {
        m !== s.currentPage && p.timestamp < d && (l = m, d = p.timestamp);
      }), l !== null)
        s.renderedPages.delete(l);
      else
        break;
    }
  }
  function ze() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        a / l > 0.8 && (s.isLowMemory = !0, Re());
      }
    }, 3e4);
  }
  function nt(a) {
    switch (String(a || "").trim().toLowerCase()) {
      case "preview_fallback_forced":
        return "Preview is running in safe mode due to compatibility safeguards. You can continue signing.";
      case "source_import_failed":
      case "source_not_pdf":
        return "This PDF preview is degraded due to source compatibility. You can continue signing.";
      case "normalized_unavailable":
      case "source_unavailable":
        return "A fallback preview is being used because the source document is temporarily unavailable.";
      default:
        return "This signing session is using a degraded preview mode for compatibility.";
    }
  }
  function Ae() {
    const a = document.getElementById("pdf-compatibility-banner"), l = document.getElementById("pdf-compatibility-message"), d = document.getElementById("pdf-compatibility-title");
    if (!a || !l || !d) return;
    const p = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), m = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (p !== "limited") {
      a.classList.add("hidden");
      return;
    }
    d.textContent = "Preview Compatibility Notice", l.textContent = String(n.viewer.compatibilityMessage || "").trim() || nt(m), a.classList.remove("hidden"), c.trackDegradedMode("pdf_preview_compatibility", { tier: p, reason: m });
  }
  function et() {
    const a = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), d = document.getElementById("stage-state-title"), p = document.getElementById("stage-state-message"), m = document.getElementById("stage-state-meta");
    if (!a || !l || !d || !p || !m) return;
    const I = n.signerState || "active", A = n.recipientStage || 1, J = n.activeStage || 1, ne = n.activeRecipientIds || [], Pe = n.waitingForRecipientIds || [];
    let ye = {
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
    switch (I) {
      case "waiting":
        ye = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: A > J ? `You are in signing stage ${A}. Stage ${J} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Pe.length > 0 && ye.badges.push({
          icon: "iconoir-group",
          text: `${Pe.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        ye = {
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
        ye = {
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
        ne.length > 1 ? (ye.message = `You and ${ne.length - 1} other signer(s) can sign now.`, ye.badges = [
          { icon: "iconoir-users", text: `Stage ${J} active`, variant: "green" }
        ]) : A > 1 ? ye.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${A}`, variant: "green" }
        ] : ye.hidden = !0;
        break;
    }
    if (ye.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${ye.bgClass} ${ye.borderClass}`, l.className = `${ye.iconClass} mt-0.5`, d.className = `text-sm font-semibold ${ye.titleClass}`, d.textContent = ye.title, p.className = `text-xs ${ye.messageClass} mt-1`, p.textContent = ye.message, m.innerHTML = "", ye.badges.forEach((Te) => {
      const yt = document.createElement("span"), bt = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      yt.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bt[Te.variant] || bt.blue}`, yt.innerHTML = `<i class="${Te.icon} mr-1"></i>${Te.text}`, m.appendChild(yt);
    });
  }
  function Me() {
    n.fields.forEach((a) => {
      let l = null, d = !1;
      if (a.type === "checkbox")
        l = a.value_bool || !1, d = l;
      else if (a.type === "date_signed")
        l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = !0;
      else {
        const p = String(a.value_text || "");
        l = p || lt(a), d = !!p;
      }
      s.fieldState.set(a.id, {
        id: a.id,
        type: a.type,
        page: a.page || 1,
        required: a.required,
        value: l,
        completed: d,
        hasError: !1,
        lastError: null,
        // Geometry metadata is populated from backend field payloads when present.
        posX: a.pos_x || 0,
        posY: a.pos_y || 0,
        width: a.width || 150,
        height: a.height || 30,
        tabIndex: Number(a.tab_index || 0) || 0
      });
    });
  }
  async function je() {
    try {
      const a = await o.load(s.profileKey);
      a && (s.profileData = a, s.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function lt(a) {
    const l = s.profileData;
    if (!l) return "";
    const d = String(a?.type || "").trim();
    return d === "name" ? ft(l.fullName || "") : d === "initials" ? ft(l.initials || "") || xn(l.fullName || n.recipientName || "") : d === "signature" ? ft(l.typedSignature || "") : "";
  }
  function k(a) {
    return !n.profile.persistDrawnSignature || !s.profileData ? "" : a?.type === "initials" && String(s.profileData.drawnInitialsDataUrl || "").trim() || String(s.profileData.drawnSignatureDataUrl || "").trim();
  }
  function pe(a) {
    const l = ft(a?.value || "");
    return l || (s.profileData ? a?.type === "initials" ? ft(s.profileData.initials || "") || xn(s.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? ft(s.profileData.typedSignature || "") : "" : "");
  }
  function ke() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : s.profileRemember;
  }
  async function Qe(a = !1) {
    let l = null;
    try {
      await o.clear(s.profileKey);
    } catch (d) {
      l = d;
    } finally {
      s.profileData = null, s.profileRemember = n.profile.rememberByDefault;
    }
    if (l) {
      if (!a && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !a)
        throw l;
      return;
    }
    !a && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Je(a, l = {}) {
    const d = ke();
    if (s.profileRemember = d, !d) {
      await Qe(!0);
      return;
    }
    if (!a) return;
    const p = {
      remember: !0
    }, m = String(a.type || "");
    if (m === "name" && typeof a.value == "string") {
      const I = ft(a.value);
      I && (p.fullName = I, (s.profileData?.initials || "").trim() || (p.initials = xn(I)));
    }
    if (m === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = ft(a.value);
        I && (p.initials = I);
      }
    }
    if (m === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = ft(a.value);
        I && (p.typedSignature = I);
      }
    }
    if (!(Object.keys(p).length === 1 && p.remember === !0))
      try {
        const I = await o.save(s.profileKey, p);
        s.profileData = I;
      } catch {
      }
  }
  function it() {
    const a = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    a && l && a.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function st() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function me() {
    const a = s.isLowMemory ? 3 : s.maxCachedPages;
    if (s.renderedPages.size <= a) return;
    const l = [];
    for (s.renderedPages.forEach((d, p) => {
      const m = Math.abs(p - s.currentPage);
      l.push({ pageNum: p, distance: m });
    }), l.sort((d, p) => p.distance - d.distance); s.renderedPages.size > a && l.length > 0; ) {
      const d = l.shift();
      d && d.pageNum !== s.currentPage && s.renderedPages.delete(d.pageNum);
    }
  }
  function xe(a) {
    if (s.isLowMemory) return;
    const l = [];
    a > 1 && l.push(a - 1), a < n.pageCount && l.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      l.forEach(async (d) => {
        !s.renderedPages.has(d) && !s.pageRendering && await Fe(d);
      });
    }, { timeout: 2e3 });
  }
  async function Fe(a) {
    if (!(!s.pdfDoc || s.renderedPages.has(a)))
      try {
        const l = await s.pdfDoc.getPage(a), d = s.zoomLevel, p = l.getViewport({ scale: d * window.devicePixelRatio }), m = document.createElement("canvas"), I = m.getContext("2d");
        m.width = p.width, m.height = p.height;
        const A = {
          canvasContext: I,
          viewport: p
        };
        await l.render(A).promise, s.renderedPages.set(a, {
          canvas: m,
          scale: d,
          timestamp: Date.now()
        }), me();
      } catch (l) {
        console.warn("Preload failed for page", a, l);
      }
  }
  function Ye() {
    const a = window.devicePixelRatio || 1;
    return s.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function P() {
    const a = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const d = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!d.ok)
        throw new Error("Failed to load document");
      const m = (await d.json()).assets || {}, I = m.source_url || m.executed_url || m.certificate_url || n.documentUrl;
      if (!I)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const A = pdfjsLib.getDocument(I);
      s.pdfDoc = await A.promise, n.pageCount = s.pdfDoc.numPages, document.getElementById("page-count").textContent = s.pdfDoc.numPages, await M(1), De(), c.trackViewerLoad(!0, Date.now() - l), c.trackPageView(1);
    } catch (d) {
      console.error("PDF load error:", d), c.trackViewerLoad(!1, Date.now() - l, d.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Oi();
    }
  }
  async function M(a) {
    if (!s.pdfDoc) return;
    const l = s.renderedPages.get(a);
    if (l && l.scale === s.zoomLevel) {
      Y(l), s.currentPage = a, document.getElementById("current-page").textContent = a, De(), ue(), xe(a);
      return;
    }
    s.pageRendering = !0;
    try {
      const d = await s.pdfDoc.getPage(a), p = s.zoomLevel, m = Ye(), I = d.getViewport({ scale: p * m }), A = d.getViewport({ scale: 1 });
      f.setPageViewport(a, {
        width: A.width,
        height: A.height,
        rotation: A.rotation || 0
      });
      const J = document.getElementById("pdf-page-1");
      J.innerHTML = "";
      const ne = document.createElement("canvas"), Pe = ne.getContext("2d");
      ne.height = I.height, ne.width = I.width, ne.style.width = `${I.width / m}px`, ne.style.height = `${I.height / m}px`, J.appendChild(ne);
      const ye = document.getElementById("pdf-container");
      ye.style.width = `${I.width / m}px`;
      const Te = {
        canvasContext: Pe,
        viewport: I
      };
      await d.render(Te).promise, s.renderedPages.set(a, {
        canvas: ne.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: I.width / m,
        displayHeight: I.height / m
      }), s.renderedPages.get(a).canvas.getContext("2d").drawImage(ne, 0, 0), me(), s.currentPage = a, document.getElementById("current-page").textContent = a, De(), ue(), c.trackPageView(a), xe(a);
    } catch (d) {
      console.error("Page render error:", d);
    } finally {
      if (s.pageRendering = !1, s.pageNumPending !== null) {
        const d = s.pageNumPending;
        s.pageNumPending = null, await M(d);
      }
    }
  }
  function Y(a, l) {
    const d = document.getElementById("pdf-page-1");
    d.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = a.canvas.width, p.height = a.canvas.height, p.style.width = `${a.displayWidth}px`, p.style.height = `${a.displayHeight}px`, p.getContext("2d").drawImage(a.canvas, 0, 0), d.appendChild(p);
    const I = document.getElementById("pdf-container");
    I.style.width = `${a.displayWidth}px`;
  }
  function H(a) {
    s.pageRendering ? s.pageNumPending = a : M(a);
  }
  function ie(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? ft(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? ft(a.value) : "";
  }
  function te(a, l, d, p = !1) {
    const m = document.createElement("img");
    m.className = "field-overlay-preview", m.src = l, m.alt = d, a.appendChild(m), a.classList.add("has-preview"), p && a.classList.add("draft-preview");
  }
  function Q(a, l, d = !1, p = !1) {
    const m = document.createElement("span");
    m.className = "field-overlay-value", d && m.classList.add("font-signature"), m.textContent = l, a.appendChild(m), a.classList.add("has-value"), p && a.classList.add("draft-preview");
  }
  function Ie(a, l) {
    const d = document.createElement("span");
    d.className = "field-overlay-label", d.textContent = l, a.appendChild(d);
  }
  function ue() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    s.fieldState.forEach((d, p) => {
      if (d.page !== s.currentPage) return;
      const m = document.createElement("div");
      if (m.className = "field-overlay", m.dataset.fieldId = p, d.required && m.classList.add("required"), d.completed && m.classList.add("completed"), s.activeFieldId === p && m.classList.add("active"), d.posX != null && d.posY != null && d.width != null && d.height != null) {
        const Te = f.getOverlayStyles(d, l);
        m.style.left = Te.left, m.style.top = Te.top, m.style.width = Te.width, m.style.height = Te.height, m.style.transform = Te.transform, At.enabled && (m.dataset.debugCoords = JSON.stringify(
          f.pageToScreen(d, l)._debug
        ));
      } else {
        const Te = Array.from(s.fieldState.keys()).indexOf(p);
        m.style.left = "10px", m.style.top = `${100 + Te * 50}px`, m.style.width = "150px", m.style.height = "30px";
      }
      const A = String(d.previewSignatureUrl || "").trim(), J = String(d.signaturePreviewUrl || "").trim(), ne = ie(d), Pe = d.type === "signature" || d.type === "initials", ye = typeof d.previewValueBool == "boolean";
      if (A)
        te(m, A, q(d.type), !0);
      else if (d.completed && J)
        te(m, J, q(d.type));
      else if (ne) {
        const Te = typeof d.previewValueText == "string" && d.previewValueText.trim() !== "";
        Q(m, ne, Pe, Te);
      } else d.type === "checkbox" && (ye ? d.previewValueBool : !!d.value) ? Q(m, "Checked", !1, ye) : Ie(m, q(d.type));
      m.setAttribute("tabindex", "0"), m.setAttribute("role", "button"), m.setAttribute("aria-label", `${q(d.type)} field${d.required ? ", required" : ""}${d.completed ? ", completed" : ""}`), m.addEventListener("click", () => z(p)), m.addEventListener("keydown", (Te) => {
        (Te.key === "Enter" || Te.key === " ") && (Te.preventDefault(), z(p));
      }), a.appendChild(m);
    });
  }
  function q(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function Z() {
    s.currentPage <= 1 || H(s.currentPage - 1);
  }
  function ve() {
    s.currentPage >= n.pageCount || H(s.currentPage + 1);
  }
  function Ee(a) {
    a < 1 || a > n.pageCount || H(a);
  }
  function De() {
    document.getElementById("prev-page-btn").disabled = s.currentPage <= 1, document.getElementById("next-page-btn").disabled = s.currentPage >= n.pageCount;
  }
  function Be() {
    s.zoomLevel = Math.min(s.zoomLevel + 0.25, 3), E(), H(s.currentPage);
  }
  function y() {
    s.zoomLevel = Math.max(s.zoomLevel - 0.25, 0.5), E(), H(s.currentPage);
  }
  function w() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, d = 612;
    s.zoomLevel = l / d, E(), H(s.currentPage);
  }
  function E() {
    document.getElementById("zoom-level").textContent = `${Math.round(s.zoomLevel * 100)}%`;
  }
  function z(a) {
    if (!s.hasConsented && n.fields.some((l) => l.id === a && l.type !== "date_signed")) {
      Un();
      return;
    }
    j(a, { openEditor: !0 });
  }
  function j(a, l = { openEditor: !0 }) {
    const d = s.fieldState.get(a);
    if (d) {
      if (l.openEditor && (s.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), d.page !== s.currentPage && Ee(d.page), !l.openEditor) {
        G(a);
        return;
      }
      d.type !== "date_signed" && oe(a);
    }
  }
  function G(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function oe(a) {
    const l = s.fieldState.get(a);
    if (!l) return;
    const d = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), m = document.getElementById("field-editor-title"), I = document.getElementById("field-editor-legal-disclaimer");
    m.textContent = ce(l.type), p.innerHTML = $e(l), I?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && qe(a), d.classList.add("active"), d.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", pn(d.querySelector(".field-editor")), ot(`Editing ${ce(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const A = p.querySelector("input, textarea");
      A ? A.focus() : p.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), le(s.writeCooldownUntil) > 0 && Ut(le(s.writeCooldownUntil));
  }
  function ce(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function $e(a) {
    const l = Ce(a.type), d = xt(String(a?.id || "")), p = xt(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const m = a.type === "initials" ? "initials" : "signature", I = xt(pe(a)), A = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], J = Ne(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${A.map((ne) => `
            <button
              type="button"
              id="sig-tab-${ne.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${J === ne.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${ne.id}"
              data-esign-action="signature-tab"
              data-field-id="${d}"
              role="tab"
              aria-selected="${J === ne.id ? "true" : "false"}"
              aria-controls="sig-editor-${ne.id}"
              tabindex="${J === ne.id ? "0" : "-1"}"
            >
              ${ne.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${J === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${m}"
              value="${I}"
              data-field-id="${d}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${d}">${I}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${m} will appear as your ${p}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${J === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${d}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${d}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${d}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${d}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-erase" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${d}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${m} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${J === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${d}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${J === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${m}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${d}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
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
    if (a.type === "name")
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${xt(String(a.value || ""))}"
          data-field-id="${d}"
        />
        ${l}
      `;
    if (a.type === "text") {
      const m = xt(String(a.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${d}"
        >${m}</textarea>
      `;
    }
    return a.type === "checkbox" ? `
        <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            id="field-checkbox-input"
            class="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${a.value ? "checked" : ""}
            data-field-id="${a.id}"
          />
          <span class="text-gray-700">I agree to the terms and conditions</span>
        </label>
      ` : '<p class="text-gray-500">Unsupported field type</p>';
  }
  function Ce(a) {
    return a === "name" || a === "initials" || a === "signature" ? `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${s.profileRemember ? "checked" : ""}
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
  function Ke(a, l, d = { syncOverlay: !1 }) {
    const p = document.getElementById("sig-type-preview"), m = s.fieldState.get(a);
    if (!m) return;
    const I = ft(String(l || "").trim());
    if (d?.syncOverlay && (I ? x(a, I) : g(a), h()), !!p) {
      if (I) {
        p.textContent = I;
        return;
      }
      p.textContent = m.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function Ne(a) {
    const l = String(s.signatureTabByField.get(a) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function at(a, l) {
    const d = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    s.signatureTabByField.set(l, d), document.querySelectorAll(".sig-editor-tab").forEach((m) => {
      m.classList.remove("border-blue-600", "text-blue-600"), m.classList.add("border-transparent", "text-gray-500"), m.setAttribute("aria-selected", "false"), m.setAttribute("tabindex", "-1");
    });
    const p = document.querySelector(`.sig-editor-tab[data-tab="${d}"]`);
    if (p?.classList.add("border-blue-600", "text-blue-600"), p?.classList.remove("border-transparent", "text-gray-500"), p?.setAttribute("aria-selected", "true"), p?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", d !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", d !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", d !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", d !== "saved"), (d === "draw" || d === "upload" || d === "saved") && p && requestAnimationFrame(() => D(l)), d === "type") {
      const m = document.getElementById("sig-type-input");
      Ke(l, m?.value || "");
    }
    d === "saved" && X(l).catch(se);
  }
  function qe(a) {
    s.signatureTabByField.set(a, "draw"), at("draw", a);
    const l = document.getElementById("sig-type-input");
    l && Ke(a, l.value || "");
  }
  function D(a) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || s.signatureCanvases.has(a)) return;
    const d = l.closest(".signature-canvas-container"), p = l.getContext("2d");
    if (!p) return;
    const m = l.getBoundingClientRect();
    if (!m.width || !m.height) return;
    const I = window.devicePixelRatio || 1;
    l.width = m.width * I, l.height = m.height * I, p.scale(I, I), p.lineCap = "round", p.lineJoin = "round", p.strokeStyle = "#1f2937", p.lineWidth = 2.5;
    let A = !1, J = 0, ne = 0, Pe = [];
    const ye = (be) => {
      const Ve = l.getBoundingClientRect();
      let Pt, Tt;
      return be.touches && be.touches.length > 0 ? (Pt = be.touches[0].clientX, Tt = be.touches[0].clientY) : be.changedTouches && be.changedTouches.length > 0 ? (Pt = be.changedTouches[0].clientX, Tt = be.changedTouches[0].clientY) : (Pt = be.clientX, Tt = be.clientY), {
        x: Pt - Ve.left,
        y: Tt - Ve.top,
        timestamp: Date.now()
      };
    }, Te = (be) => {
      A = !0;
      const Ve = ye(be);
      J = Ve.x, ne = Ve.y, Pe = [{ x: Ve.x, y: Ve.y, t: Ve.timestamp, width: 2.5 }], d && d.classList.add("drawing");
    }, yt = (be) => {
      if (!A) return;
      const Ve = ye(be);
      Pe.push({ x: Ve.x, y: Ve.y, t: Ve.timestamp, width: 2.5 });
      const Pt = Ve.x - J, Tt = Ve.y - ne, Vi = Ve.timestamp - (Pe[Pe.length - 2]?.t || Ve.timestamp), Gi = Math.sqrt(Pt * Pt + Tt * Tt) / Math.max(Vi, 1), Wi = 2.5, Ji = 1.5, Yi = 4, Ki = Math.min(Gi / 5, 1), jn = Math.max(Ji, Math.min(Yi, Wi - Ki * 1.5));
      Pe[Pe.length - 1].width = jn, p.lineWidth = jn, p.beginPath(), p.moveTo(J, ne), p.lineTo(Ve.x, Ve.y), p.stroke(), J = Ve.x, ne = Ve.y;
    }, bt = () => {
      if (A = !1, Pe.length > 1) {
        const be = s.signatureCanvases.get(a);
        be && (be.strokes.push(Pe.map((Ve) => ({ ...Ve }))), be.redoStack = []), Oe(a);
      }
      Pe = [], d && d.classList.remove("drawing");
    };
    l.addEventListener("mousedown", Te), l.addEventListener("mousemove", yt), l.addEventListener("mouseup", bt), l.addEventListener("mouseout", bt), l.addEventListener("touchstart", (be) => {
      be.preventDefault(), be.stopPropagation(), Te(be);
    }, { passive: !1 }), l.addEventListener("touchmove", (be) => {
      be.preventDefault(), be.stopPropagation(), yt(be);
    }, { passive: !1 }), l.addEventListener("touchend", (be) => {
      be.preventDefault(), bt();
    }, { passive: !1 }), l.addEventListener("touchcancel", bt), l.addEventListener("gesturestart", (be) => be.preventDefault()), l.addEventListener("gesturechange", (be) => be.preventDefault()), l.addEventListener("gestureend", (be) => be.preventDefault()), s.signatureCanvases.set(a, {
      canvas: l,
      ctx: p,
      dpr: I,
      drawWidth: m.width,
      drawHeight: m.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), $(a);
  }
  function $(a) {
    const l = s.signatureCanvases.get(a), d = s.fieldState.get(a);
    if (!l || !d) return;
    const p = k(d);
    p && N(a, p, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function N(a, l, d = { clearStrokes: !1 }) {
    const p = s.signatureCanvases.get(a);
    if (!p) return !1;
    const m = String(l || "").trim();
    if (!m)
      return p.baseImageDataUrl = "", p.baseImage = null, d.clearStrokes && (p.strokes = [], p.redoStack = []), K(a), !0;
    const { drawWidth: I, drawHeight: A } = p, J = new Image();
    return await new Promise((ne) => {
      J.onload = () => {
        d.clearStrokes && (p.strokes = [], p.redoStack = []), p.baseImage = J, p.baseImageDataUrl = m, I > 0 && A > 0 && K(a), ne(!0);
      }, J.onerror = () => ne(!1), J.src = m;
    });
  }
  function K(a) {
    const l = s.signatureCanvases.get(a);
    if (!l) return;
    const { ctx: d, drawWidth: p, drawHeight: m, baseImage: I, strokes: A } = l;
    if (d.clearRect(0, 0, p, m), I) {
      const J = Math.min(p / I.width, m / I.height), ne = I.width * J, Pe = I.height * J, ye = (p - ne) / 2, Te = (m - Pe) / 2;
      d.drawImage(I, ye, Te, ne, Pe);
    }
    for (const J of A)
      for (let ne = 1; ne < J.length; ne++) {
        const Pe = J[ne - 1], ye = J[ne];
        d.lineWidth = Number(ye.width || 2.5) || 2.5, d.beginPath(), d.moveTo(Pe.x, Pe.y), d.lineTo(ye.x, ye.y), d.stroke();
      }
  }
  function ae(a) {
    const l = s.signatureCanvases.get(a);
    if (!l || l.strokes.length === 0) return;
    const d = l.strokes.pop();
    d && l.redoStack.push(d), K(a), Oe(a);
  }
  function ee(a) {
    const l = s.signatureCanvases.get(a);
    if (!l || l.redoStack.length === 0) return;
    const d = l.redoStack.pop();
    d && l.strokes.push(d), K(a), Oe(a);
  }
  function Le(a) {
    const l = s.signatureCanvases.get(a);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: d, ctx: p } = l;
    return p.getImageData(0, 0, d.width, d.height).data.some((I, A) => A % 4 === 3 && I > 0);
  }
  function Oe(a) {
    const l = s.signatureCanvases.get(a);
    l && (Le(a) ? b(a, l.canvas.toDataURL("image/png")) : g(a), h());
  }
  function mt(a) {
    const l = s.signatureCanvases.get(a);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", K(a)), g(a), h();
    const d = document.getElementById("sig-upload-preview-wrap"), p = document.getElementById("sig-upload-preview");
    d && d.classList.add("hidden"), p && p.removeAttribute("src");
  }
  function O() {
    const a = document.getElementById("field-editor-overlay"), l = a.querySelector(".field-editor");
    if (gn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", s.activeFieldId) {
      const d = document.querySelector(`.field-list-item[data-field-id="${s.activeFieldId}"]`);
      requestAnimationFrame(() => {
        d?.focus();
      });
    }
    v(), h(), s.activeFieldId = null, s.signatureCanvases.clear(), ot("Field editor closed.");
  }
  function le(a) {
    const l = Number(a) || 0;
    return l <= 0 ? 0 : Math.max(0, Math.ceil((l - Date.now()) / 1e3));
  }
  function dt(a, l = {}) {
    const d = Number(l.retry_after_seconds);
    if (Number.isFinite(d) && d > 0)
      return Math.ceil(d);
    const p = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!p) return 0;
    const m = Number(p);
    return Number.isFinite(m) && m > 0 ? Math.ceil(m) : 0;
  }
  async function tt(a, l) {
    let d = {};
    try {
      d = await a.json();
    } catch {
      d = {};
    }
    const p = d?.error || {}, m = p?.details && typeof p.details == "object" ? p.details : {}, I = dt(a, m), A = a?.status === 429, J = A ? I > 0 ? `Too many actions too quickly. Please wait ${I}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(p?.message || l || "Request failed"), ne = new Error(J);
    return ne.status = a?.status || 0, ne.code = String(p?.code || ""), ne.details = m, ne.rateLimited = A, ne.retryAfterSeconds = I, ne;
  }
  function Ut(a) {
    const l = Math.max(1, Number(a) || 1);
    s.writeCooldownUntil = Date.now() + l * 1e3, s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
    const d = () => {
      const p = document.getElementById("field-editor-save");
      if (!p) return;
      const m = le(s.writeCooldownUntil);
      if (m <= 0) {
        s.pendingSaves.has(s.activeFieldId || "") || (p.disabled = !1, p.innerHTML = "Insert"), s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
        return;
      }
      p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${m}s`;
    };
    d(), s.writeCooldownTimer = setInterval(d, 250);
  }
  function Fn(a) {
    const l = Math.max(1, Number(a) || 1);
    s.submitCooldownUntil = Date.now() + l * 1e3, s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    const d = () => {
      const p = le(s.submitCooldownUntil);
      Mt(), p <= 0 && s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    };
    d(), s.submitCooldownTimer = setInterval(d, 250);
  }
  async function ln() {
    const a = s.activeFieldId;
    if (!a) return;
    const l = s.fieldState.get(a);
    if (!l) return;
    const d = le(s.writeCooldownUntil);
    if (d > 0) {
      const m = `Please wait ${d}s before saving again.`;
      window.toastManager && window.toastManager.error(m), ot(m, "assertive");
      return;
    }
    const p = document.getElementById("field-editor-save");
    p.disabled = !0, p.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      s.profileRemember = ke();
      let m = !1;
      if (l.type === "signature" || l.type === "initials")
        m = await Di(a);
      else if (l.type === "checkbox") {
        const I = document.getElementById("field-checkbox-input");
        m = await dn(a, null, I?.checked || !1);
      } else {
        const A = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!A && l.required)
          throw new Error("This field is required");
        m = await dn(a, A, null);
      }
      if (m) {
        O(), Bn(), Mt(), zn(), ue(), Fi(a), Bi(a);
        const I = On();
        I.allRequiredComplete ? ot("Field saved. All required fields complete. Ready to submit.") : ot(`Field saved. ${I.remainingRequired} required field${I.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (m) {
      m?.rateLimited && Ut(m.retryAfterSeconds), window.toastManager && window.toastManager.error(m.message), ot(`Error saving field: ${m.message}`, "assertive");
    } finally {
      if (le(s.writeCooldownUntil) > 0) {
        const m = le(s.writeCooldownUntil);
        p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${m}s`;
      } else
        p.disabled = !1, p.innerHTML = "Insert";
    }
  }
  async function Di(a) {
    const l = s.fieldState.get(a), d = document.getElementById("sig-type-input"), p = Ne(a);
    if (p === "draw" || p === "upload" || p === "saved") {
      const I = s.signatureCanvases.get(a);
      if (!I) return !1;
      if (!Le(a))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const A = I.canvas.toDataURL("image/png");
      return await $n(a, { type: "drawn", dataUrl: A }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const I = d?.value?.trim();
      if (!I)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await dn(a, I, null) : await $n(a, { type: "typed", text: I }, I);
    }
  }
  async function dn(a, l, d) {
    s.pendingSaves.add(a);
    const p = Date.now(), m = s.fieldState.get(a);
    try {
      const I = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: a,
          value_text: l,
          value_bool: d
        })
      });
      if (!I.ok)
        throw await tt(I, "Failed to save field");
      const A = s.fieldState.get(a);
      return A && (A.value = l ?? d, A.completed = !0, A.hasError = !1), await Je(A), window.toastManager && window.toastManager.success("Field saved"), c.trackFieldSave(a, A?.type, !0, Date.now() - p), !0;
    } catch (I) {
      const A = s.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = I.message), c.trackFieldSave(a, m?.type, !1, Date.now() - p, I.message), I;
    } finally {
      s.pendingSaves.delete(a);
    }
  }
  async function $n(a, l, d) {
    s.pendingSaves.add(a);
    const p = Date.now(), m = l?.type || "typed";
    try {
      let I;
      if (m === "drawn") {
        const ne = await L.uploadDrawnSignature(
          a,
          l.dataUrl
        );
        I = {
          field_instance_id: a,
          type: "drawn",
          value_text: d,
          object_key: ne.objectKey,
          sha256: ne.sha256,
          upload_token: ne.uploadToken
        };
      } else
        I = await Ri(a, d);
      const A = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(I)
      });
      if (!A.ok)
        throw await tt(A, "Failed to save signature");
      const J = s.fieldState.get(a);
      return J && (J.value = d, J.completed = !0, J.hasError = !1, l?.dataUrl && (J.signaturePreviewUrl = l.dataUrl)), await Je(J, {
        signatureType: m,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), c.trackSignatureAttach(a, m, !0, Date.now() - p), !0;
    } catch (I) {
      const A = s.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = I.message), c.trackSignatureAttach(a, m, !1, Date.now() - p, I.message), I;
    } finally {
      s.pendingSaves.delete(a);
    }
  }
  async function Ri(a, l) {
    const d = `${l}|${a}`, p = await Mi(d), m = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: l,
      object_key: m,
      sha256: p
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Mi(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const l = new TextEncoder().encode(a), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Bn() {
    let a = 0;
    s.fieldState.forEach((J) => {
      J.required, J.completed && a++;
    });
    const l = s.fieldState.size, d = l > 0 ? a / l * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = l;
    const p = document.getElementById("progress-ring-circle"), m = 97.4, I = m - d / 100 * m;
    p.style.strokeDashoffset = I, document.getElementById("mobile-progress").style.width = `${d}%`;
    const A = l - a;
    document.getElementById("fields-status").textContent = A > 0 ? `${A} remaining` : "All complete";
  }
  function Mt() {
    const a = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), d = document.getElementById("incomplete-message"), p = le(s.submitCooldownUntil);
    let m = [], I = !1;
    s.fieldState.forEach((J, ne) => {
      J.required && !J.completed && m.push(J), J.hasError && (I = !0);
    });
    const A = s.hasConsented && m.length === 0 && !I && s.pendingSaves.size === 0 && p === 0 && !s.isSubmitting;
    a.disabled = !A, !s.isSubmitting && p > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s` : !s.isSubmitting && p === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), s.hasConsented ? p > 0 ? (l.classList.remove("hidden"), d.textContent = `Please wait ${p}s before submitting again.`) : I ? (l.classList.remove("hidden"), d.textContent = "Some fields failed to save. Please retry.") : m.length > 0 ? (l.classList.remove("hidden"), d.textContent = `Complete ${m.length} required field${m.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), d.textContent = "Please accept the consent agreement");
  }
  function Fi(a) {
    const l = s.fieldState.get(a), d = document.querySelector(`.field-list-item[data-field-id="${a}"]`);
    if (!(!d || !l)) {
      if (l.completed) {
        d.classList.add("completed"), d.classList.remove("error");
        const p = d.querySelector(".w-8");
        p.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), p.classList.add("bg-green-100", "text-green-600"), p.innerHTML = '<i class="iconoir-check"></i>';
      } else if (l.hasError) {
        d.classList.remove("completed"), d.classList.add("error");
        const p = d.querySelector(".w-8");
        p.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), p.classList.add("bg-red-100", "text-red-600"), p.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function $i() {
    const a = Array.from(s.fieldState.values()).filter((l) => l.required);
    return a.sort((l, d) => {
      const p = Number(l.page || 0), m = Number(d.page || 0);
      if (p !== m) return p - m;
      const I = Number(l.tabIndex || 0), A = Number(d.tabIndex || 0);
      if (I > 0 && A > 0 && I !== A) return I - A;
      if (I > 0 != A > 0) return I > 0 ? -1 : 1;
      const J = Number(l.posY || 0), ne = Number(d.posY || 0);
      if (J !== ne) return J - ne;
      const Pe = Number(l.posX || 0), ye = Number(d.posX || 0);
      return Pe !== ye ? Pe - ye : String(l.id || "").localeCompare(String(d.id || ""));
    }), a;
  }
  function Nn(a) {
    s.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((l) => l.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((l) => l.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function Bi(a) {
    const l = $i(), d = l.filter((A) => !A.completed);
    if (d.length === 0) {
      c.track("guided_next_none_remaining", { fromFieldId: a });
      const A = document.getElementById("submit-btn");
      A?.scrollIntoView({ behavior: "smooth", block: "nearest" }), A?.focus(), ot("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const p = l.findIndex((A) => String(A.id) === String(a));
    let m = null;
    if (p >= 0) {
      for (let A = p + 1; A < l.length; A++)
        if (!l[A].completed) {
          m = l[A];
          break;
        }
    }
    if (m || (m = d[0]), !m) return;
    c.track("guided_next_started", { fromFieldId: a, toFieldId: m.id });
    const I = Number(m.page || 1);
    I !== s.currentPage && Ee(I), j(m.id, { openEditor: !1 }), Nn(m.id), setTimeout(() => {
      Nn(m.id), G(m.id), c.track("guided_next_completed", { toFieldId: m.id, page: m.page }), ot(`Next required field highlighted on page ${m.page}.`);
    }, 120);
  }
  function Un() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", pn(a.querySelector(".field-editor")), ot("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function un() {
    const a = document.getElementById("consent-modal"), l = a.querySelector(".field-editor");
    gn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ot("Consent dialog closed.");
  }
  async function Ni() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const l = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!l.ok)
        throw await tt(l, "Failed to accept consent");
      s.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), un(), Mt(), zn(), c.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ot("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), ot(`Error: ${l.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function Ui() {
    const a = document.getElementById("submit-btn"), l = le(s.submitCooldownUntil);
    if (l > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${l}s before submitting again.`), Mt();
      return;
    }
    s.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const d = `submit-${n.recipientId}-${Date.now()}`, p = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": d }
      });
      if (!p.ok)
        throw await tt(p, "Failed to submit");
      c.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (d) {
      c.trackSubmit(!1, d.message), d?.rateLimited && Fn(d.retryAfterSeconds), window.toastManager && window.toastManager.error(d.message);
    } finally {
      s.isSubmitting = !1, Mt();
    }
  }
  function Hi() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", pn(a.querySelector(".field-editor")), ot("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Hn() {
    const a = document.getElementById("decline-modal"), l = a.querySelector(".field-editor");
    gn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ot("Decline dialog closed.");
  }
  async function zi() {
    const a = document.getElementById("decline-reason").value;
    try {
      const l = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!l.ok)
        throw await tt(l, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message);
    }
  }
  function Oi() {
    c.trackDegradedMode("viewer_load_failure"), c.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function ji() {
    try {
      const a = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!a.ok) throw new Error("Document unavailable");
      const d = (await a.json()).assets || {}, p = d.source_url || d.executed_url || d.certificate_url;
      if (p)
        window.open(p, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (a) {
      window.toastManager && window.toastManager.error(a.message || "Unable to download document");
    }
  }
  const At = {
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
            <div class="debug-value" id="debug-session-id">${c.sessionId}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Consent</div>
            <div class="debug-value" id="debug-consent">${s.hasConsented ? "✓ Accepted" : "✗ Pending"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${s.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${s.isLowMemory ? "⚠ Low Memory" : "Normal"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${s.renderedPages?.size || 0}</div>
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
      const a = this.panel.querySelector(".debug-toggle"), l = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (a.textContent = "+", l.style.display = "none") : (a.textContent = "−", l.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const a = s.fieldState;
      let l = 0;
      a?.forEach((p) => {
        p.completed && l++;
      }), document.getElementById("debug-consent").textContent = s.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${s.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${l}/${a?.size || 0}`, document.getElementById("debug-cached").textContent = s.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = s.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${s.isLowMemory ? "warning" : ""}`;
      const d = c.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = d.length > 0 ? `${d.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${d.length > 0 ? "error" : ""}`;
    },
    /**
     * Bind console helper functions
     */
    bindConsoleHelpers() {
      window.esignDebug = {
        getState: () => ({
          config: n,
          state: {
            currentPage: s.currentPage,
            zoomLevel: s.zoomLevel,
            hasConsented: s.hasConsented,
            activeFieldId: s.activeFieldId,
            isLowMemory: s.isLowMemory,
            cachedPages: s.renderedPages?.size || 0
          },
          fields: Array.from(s.fieldState?.entries() || []).map(([a, l]) => ({
            id: a,
            type: l.type,
            completed: l.completed,
            hasError: l.hasError
          })),
          telemetry: c.getSessionSummary(),
          errors: c.metrics.errorsEncountered
        }),
        getEvents: () => c.events,
        forceError: (a) => {
          c.track("debug_forced_error", { message: a }), console.error("[E-Sign Debug] Forced error:", a);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), P();
        },
        setLowMemory: (a) => {
          s.isLowMemory = a, me(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", c.sessionId), console.log("Fields:", s.fieldState?.size || 0), console.log("Low Memory:", s.isLowMemory), console.groupEnd();
    },
    /**
     * Copy session info to clipboard
     */
    async copySessionInfo() {
      const a = JSON.stringify(window.esignDebug.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(a), alert("Session info copied to clipboard");
      } catch {
        console.log("Session Info:", a), alert("Check console for session info");
      }
    },
    /**
     * Reload the PDF viewer
     */
    reloadViewer() {
      console.log("[E-Sign Debug] Reloading PDF viewer..."), P(), this.updatePanel();
    },
    /**
     * Clear page cache
     */
    clearCache() {
      s.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(c.events), console.log("Session Summary:", c.getSessionSummary());
    }
  };
  function ot(a, l = "polite") {
    const d = l === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    d && (d.textContent = "", requestAnimationFrame(() => {
      d.textContent = a;
    }));
  }
  function pn(a) {
    const d = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), p = d[0], m = d[d.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function I(A) {
      A.key === "Tab" && (A.shiftKey ? document.activeElement === p && (A.preventDefault(), m?.focus()) : document.activeElement === m && (A.preventDefault(), p?.focus()));
    }
    a.addEventListener("keydown", I), a._focusTrapHandler = I, requestAnimationFrame(() => {
      p?.focus();
    });
  }
  function gn(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const l = a.dataset.previousFocus;
    if (l) {
      const d = document.getElementById(l);
      requestAnimationFrame(() => {
        d?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function zn() {
    const a = On(), l = document.getElementById("submit-status");
    l && (a.allRequiredComplete && s.hasConsented ? l.textContent = "All required fields complete. You can now submit." : s.hasConsented ? l.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : l.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function On() {
    let a = 0, l = 0, d = 0;
    return s.fieldState.forEach((p) => {
      p.required && l++, p.completed && a++, p.required && !p.completed && d++;
    }), {
      completed: a,
      required: l,
      remainingRequired: d,
      total: s.fieldState.size,
      allRequiredComplete: d === 0
    };
  }
  function qi(a, l = 1) {
    const d = Array.from(s.fieldState.keys()), p = d.indexOf(a);
    if (p === -1) return null;
    const m = p + l;
    return m >= 0 && m < d.length ? d[m] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (O(), un(), Hn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), d = l.indexOf(a.target);
      if (d !== -1) {
        let p = d;
        if (a.key === "ArrowRight" && (p = (d + 1) % l.length), a.key === "ArrowLeft" && (p = (d - 1 + l.length) % l.length), a.key === "Home" && (p = 0), a.key === "End" && (p = l.length - 1), p !== d) {
          a.preventDefault();
          const m = l[p], I = m.getAttribute("data-tab") || "draw", A = m.getAttribute("data-field-id");
          A && at(I, A), m.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const l = a.target.dataset.fieldId, d = a.key === "ArrowDown" ? 1 : -1, p = qi(l, d);
        p && document.querySelector(`.field-list-item[data-field-id="${p}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const l = a.target.dataset.fieldId;
        l && z(l);
      }
    }
    a.key === "Tab" && !a.target.closest(".field-editor-overlay") && !a.target.closest("#consent-modal") && a.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(a) {
    a.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Ai {
  constructor(e) {
    this.config = e;
  }
  init() {
    Rs(this.config);
  }
  destroy() {
  }
}
function Ba(i) {
  const e = new Ai(i);
  return _e(() => e.init()), e;
}
function Ms() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && _e(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = Ms();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Ai(e);
  t.init(), window.esignSignerReviewController = t;
});
class Pi {
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
    Rt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Rt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function Na(i = {}) {
  const e = new Pi(i);
  return _e(() => e.init()), e;
}
function Ua(i = {}) {
  const e = new Pi(i);
  _e(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class kn {
  constructor(e) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = e, this.elements = {
      loadBtn: u("#pdf-load-btn"),
      retryBtn: u("#pdf-retry-btn"),
      loading: u("#pdf-loading"),
      spinner: u("#pdf-spinner"),
      error: u("#pdf-error"),
      errorMessage: u("#pdf-error-message"),
      viewer: u("#pdf-viewer"),
      canvas: u("#pdf-canvas"),
      pagination: u("#pdf-pagination"),
      prevBtn: u("#pdf-prev-page"),
      nextBtn: u("#pdf-next-page"),
      currentPageEl: u("#pdf-current-page"),
      totalPagesEl: u("#pdf-total-pages"),
      status: u("#pdf-status")
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
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: r } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), r && r.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (o) => {
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
        const n = await this.pdfDoc.getPage(e), r = n.getViewport({ scale: this.scale }), o = this.elements.canvas, c = o.getContext("2d");
        if (!c)
          throw new Error("Failed to get canvas context");
        o.height = r.height, o.width = r.width, await n.render({
          canvasContext: c,
          viewport: r
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: r } = this.elements, o = this.pdfDoc?.numPages || 1;
    r && r.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= o);
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
    const { loading: e, spinner: t, error: n, viewer: r } = this.elements;
    e && R(e), t && V(t), n && R(n), r && R(r);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: r } = this.elements;
    e && R(e), t && R(t), n && R(n), r && V(r);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: r, errorMessage: o, viewer: c } = this.elements;
    t && R(t), n && R(n), r && V(r), c && R(c), o && (o.textContent = e);
  }
}
function Ha(i) {
  const e = new kn(i);
  return e.init(), e;
}
function za(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new kn(e);
  _e(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && _e(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new kn({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class Oa {
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
class ja {
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
function Fs(i) {
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
function $s(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", r = t.label ?? String(n);
    return { label: String(r), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Bs(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((o) => String(o || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), r = e ? String(e).trim().toLowerCase() : "";
  return r && n.includes(r) ? [r, ...n.filter((o) => o !== r)] : n;
}
function qa(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Va(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: Fs(e.type),
    options: $s(e.options),
    operators: Bs(e.operators, e.default_operator)
  })) : [];
}
function Ga(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function Wa(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Ja(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function Ya(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([c, s]) => `${c}: ${s}`).join("; ") : "", r = e?.textCode ? `${e.textCode}: ` : "", o = e?.message || `${i} failed`;
    t.error(n ? `${r}${o}: ${n}` : `${r}${o}`);
  }
}
function Ka(i, e) {
  const t = u(`#${i}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function Xa(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const Qa = {
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
}, cn = "application/vnd.google-apps.document", Dn = "application/vnd.google-apps.spreadsheet", Rn = "application/vnd.google-apps.presentation", Ti = "application/vnd.google-apps.folder", Mn = "application/pdf", Ns = [cn, Mn], _i = "esign.google.account_id";
function Us(i) {
  return i.mimeType === cn;
}
function Hs(i) {
  return i.mimeType === Mn;
}
function Bt(i) {
  return i.mimeType === Ti;
}
function zs(i) {
  return Ns.includes(i.mimeType);
}
function Za(i) {
  return i.mimeType === cn || i.mimeType === Dn || i.mimeType === Rn;
}
function Os(i) {
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
function eo(i) {
  return i.map(Os);
}
function ki(i) {
  return {
    [cn]: "Google Doc",
    [Dn]: "Google Sheet",
    [Rn]: "Google Slides",
    [Ti]: "Folder",
    [Mn]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function js(i) {
  return Bt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Us(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Hs(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === Dn ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Rn ? {
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
function qs(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Vs(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function to(i, e) {
  const t = i.get("account_id");
  if (t)
    return en(t);
  if (e)
    return en(e);
  const n = localStorage.getItem(_i);
  return n ? en(n) : "";
}
function en(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function no(i) {
  const e = en(i);
  e && localStorage.setItem(_i, e);
}
function io(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function ro(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function so(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function Nt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Gs(i) {
  const e = js(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function ao(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, r) => {
    const o = r === t.length - 1, c = r > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return o ? `${c}<span class="text-gray-900 font-medium">${Nt(n.name)}</span>` : `${c}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${Nt(n.name)}</button>`;
  }).join("");
}
function Ws(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: r = !0 } = e, o = Gs(i), c = Bt(i), s = zs(i), h = c ? "cursor-pointer hover:bg-gray-50" : s ? "cursor-pointer hover:bg-blue-50" : "opacity-60", g = c ? `data-folder-id="${i.id}" data-folder-name="${Nt(i.name)}"` : s && t ? `data-file-id="${i.id}" data-file-name="${Nt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${h} file-item"
      ${g}
      role="listitem"
      ${s ? 'tabindex="0"' : ""}
    >
      ${o}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${Nt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${ki(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${qs(i.size)}` : ""}
          ${r && i.modifiedTime ? ` &middot; ${Vs(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${s && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function oo(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${Nt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((o, c) => Bt(o) && !Bt(c) ? -1 : !Bt(o) && Bt(c) ? 1 : o.name.localeCompare(c.name)).map((o) => Ws(o, { selectable: n })).join("")}
    </div>
  `;
}
function co(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: ki(i.mimeType)
  };
}
export {
  nr as AGREEMENT_STATUS_BADGES,
  Li as AgreementFormController,
  kn as DocumentDetailPreviewController,
  _n as DocumentFormController,
  Xi as ESignAPIClient,
  Qi as ESignAPIError,
  _i as GOOGLE_ACCOUNT_STORAGE_KEY,
  gi as GoogleCallbackController,
  fi as GoogleDrivePickerController,
  mi as GoogleIntegrationController,
  Ns as IMPORTABLE_MIME_TYPES,
  vi as IntegrationConflictsController,
  hi as IntegrationHealthController,
  yi as IntegrationMappingsController,
  bi as IntegrationSyncRunsController,
  Tn as LandingPageController,
  cn as MIME_GOOGLE_DOC,
  Ti as MIME_GOOGLE_FOLDER,
  Dn as MIME_GOOGLE_SHEET,
  Rn as MIME_GOOGLE_SLIDES,
  Mn as MIME_PDF,
  Oa as PanelPaginationBehavior,
  ja as PanelSearchBehavior,
  Qa as STANDARD_GRID_SELECTORS,
  pi as SignerCompletePageController,
  Pi as SignerErrorPageController,
  Ai as SignerReviewController,
  ut as announce,
  io as applyAccountIdToPath,
  cr as applyDetailFormatters,
  Es as bootstrapAgreementForm,
  za as bootstrapDocumentDetailPreview,
  Fa as bootstrapDocumentForm,
  Sa as bootstrapGoogleCallback,
  Ca as bootstrapGoogleDrivePicker,
  Ia as bootstrapGoogleIntegration,
  ka as bootstrapIntegrationConflicts,
  Aa as bootstrapIntegrationHealth,
  Ta as bootstrapIntegrationMappings,
  Ra as bootstrapIntegrationSyncRuns,
  ya as bootstrapLandingPage,
  ba as bootstrapSignerCompletePage,
  Ua as bootstrapSignerErrorPage,
  Rs as bootstrapSignerReview,
  ro as buildScopedApiUrl,
  sa as byId,
  tr as capitalize,
  er as createESignClient,
  rr as createElement,
  Xa as createSchemaActionCachingRefresh,
  co as createSelectedFile,
  ia as createStatusBadgeElement,
  ma as createTimeoutController,
  Ga as dateTimeCellRenderer,
  nn as debounce,
  Ya as defaultActionErrorHandler,
  Ja as defaultActionSuccessHandler,
  oa as delegate,
  Nt as escapeHtml,
  Wa as fileSizeCellRenderer,
  Xs as formatDate,
  tn as formatDateTime,
  Vs as formatDriveDate,
  qs as formatDriveFileSize,
  Kt as formatFileSize,
  Ks as formatPageCount,
  ea as formatRecipientCount,
  Zs as formatRelativeTime,
  ar as formatSizeElements,
  Qs as formatTime,
  or as formatTimestampElements,
  di as getAgreementStatusBadge,
  Ys as getESignClient,
  js as getFileIconConfig,
  ki as getFileTypeName,
  sr as getPageConfig,
  R as hide,
  $a as initAgreementForm,
  lr as initDetailFormatters,
  Ha as initDocumentDetailPreview,
  Ma as initDocumentForm,
  wa as initGoogleCallback,
  Ea as initGoogleDrivePicker,
  xa as initGoogleIntegration,
  _a as initIntegrationConflicts,
  La as initIntegrationHealth,
  Pa as initIntegrationMappings,
  Da as initIntegrationSyncRuns,
  ha as initLandingPage,
  va as initSignerCompletePage,
  Na as initSignerErrorPage,
  Ba as initSignerReview,
  Bt as isFolder,
  Us as isGoogleDoc,
  Za as isGoogleWorkspaceFile,
  zs as isImportable,
  Hs as isPDF,
  en as normalizeAccountId,
  Os as normalizeDriveFile,
  eo as normalizeDriveFiles,
  Bs as normalizeFilterOperators,
  $s as normalizeFilterOptions,
  Fs as normalizeFilterType,
  aa as on,
  _e as onReady,
  ua as poll,
  Va as prepareFilterFields,
  qa as prepareGridColumns,
  u as qs,
  Rt as qsa,
  ao as renderBreadcrumb,
  Gs as renderFileIcon,
  Ws as renderFileItem,
  oo as renderFileList,
  ir as renderStatusBadge,
  to as resolveAccountId,
  pa as retry,
  no as saveAccountId,
  Zi as setESignClient,
  la as setLoading,
  Ka as setupRefreshButton,
  V as show,
  ui as sleep,
  ta as snakeToTitle,
  so as syncAccountIdToUrl,
  ga as throttle,
  ca as toggle,
  na as truncate,
  Ot as updateDataText,
  da as updateDataTexts,
  ra as updateStatusBadge,
  fa as withTimeout
};
//# sourceMappingURL=index.js.map

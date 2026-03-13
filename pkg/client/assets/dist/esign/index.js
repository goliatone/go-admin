import { a as At } from "../chunks/html-Br-oQr7i.js";
class Ji {
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
    const n = 200, s = 25;
    for (; t <= s; ) {
      const f = await this.listAgreements({ page: t, per_page: n }), p = f.items || f.records || [];
      if (e.push(...p), p.length === 0 || e.length >= f.total)
        break;
      t += 1;
    }
    const o = {};
    for (const f of e) {
      const p = String(f?.status || "").trim().toLowerCase();
      p && (o[p] = (o[p] || 0) + 1);
    }
    const c = (o.sent || 0) + (o.in_progress || 0), r = c + (o.declined || 0);
    return {
      draft: o.draft || 0,
      sent: o.sent || 0,
      in_progress: o.in_progress || 0,
      completed: o.completed || 0,
      voided: o.voided || 0,
      declined: o.declined || 0,
      expired: o.expired || 0,
      pending: c,
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
      throw new Yi(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Yi extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Cn = null;
function jr() {
  if (!Cn)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Cn;
}
function Xi(i) {
  Cn = i;
}
function Qi(i) {
  const e = new Ji(i);
  return Xi(e), e;
}
function en(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function qr(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function rn(i, e) {
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
function Vr(i, e) {
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
function Gr(i, e) {
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
function Wr(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), o = Math.round(s / 60), c = Math.round(o / 60), r = Math.round(c / 24), f = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(r) >= 1 ? f.format(r, "day") : Math.abs(c) >= 1 ? f.format(c, "hour") : Math.abs(o) >= 1 ? f.format(o, "minute") : f.format(s, "second");
  } catch {
    return String(i);
  }
}
function Kr(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Zi(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function Jr(i) {
  return i ? i.split("_").map((e) => Zi(e)).join(" ") : "";
}
function Yr(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const es = {
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
function li(i) {
  const e = String(i || "").trim().toLowerCase();
  return es[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function ts(i, e) {
  const t = li(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, c = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${o[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${c}${t.label}</span>`;
}
function Xr(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = ts(i, e), t.firstElementChild;
}
function Qr(i, e, t) {
  const n = li(e), s = t?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${o[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const f = i.querySelector(".rounded-full");
    if (f)
      f.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const p = document.createElement("span");
      p.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, p.setAttribute("aria-hidden", "true"), i.prepend(p);
    }
  }
  const r = i.childNodes[i.childNodes.length - 1];
  r && r.nodeType === Node.TEXT_NODE ? r.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function u(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function Bt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function Zr(i) {
  return document.getElementById(i);
}
function ns(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, o] of Object.entries(e))
      o !== void 0 && n.setAttribute(s, o);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function ea(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function ta(i, e, t, n, s) {
  const o = (c) => {
    const r = c.target.closest(e);
    r && i.contains(r) && n.call(r, c, r);
  };
  return i.addEventListener(t, o, s), () => i.removeEventListener(t, o, s);
}
function De(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function G(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function D(i) {
  i && i.classList.add("hidden");
}
function na(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? G(i) : D(i);
}
function ia(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Gt(i, e, t = document) {
  const n = u(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function sa(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Gt(t, n, e);
}
function is(i = "[data-esign-page]", e = "data-esign-config") {
  const t = u(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const s = u(
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
function ht(i, e = "polite") {
  const t = u(`[aria-live="${e}"]`) || (() => {
    const n = ns("div", {
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
async function ra(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: o = 30,
    onProgress: c,
    signal: r
  } = i, f = Date.now();
  let p = 0, y;
  for (; p < o; ) {
    if (r?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - f >= s)
      return {
        result: y,
        attempts: p,
        stopped: !1,
        timedOut: !0
      };
    if (p++, y = await e(), c && c(y, p), t(y))
      return {
        result: y,
        attempts: p,
        stopped: !0,
        timedOut: !1
      };
    await di(n, r);
  }
  return {
    result: y,
    attempts: p,
    stopped: !1,
    timedOut: !1
  };
}
async function aa(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: o = !0,
    shouldRetry: c = () => !0,
    onRetry: r,
    signal: f
  } = i;
  let p;
  for (let y = 1; y <= t; y++) {
    if (f?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (S) {
      if (p = S, y >= t || !c(S, y))
        throw S;
      const M = o ? Math.min(n * Math.pow(2, y - 1), s) : n;
      r && r(S, y, M), await di(M, f);
    }
  }
  throw p;
}
function di(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const s = setTimeout(t, i);
    if (e) {
      const o = () => {
        clearTimeout(s), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", o, { once: !0 });
    }
  });
}
function an(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function oa(i, e) {
  let t = 0, n = null;
  return (...s) => {
    const o = Date.now();
    o - t >= e ? (t = o, i(...s)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...s);
      },
      e - (o - t)
    ));
  };
}
function ca(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function la(i, e, t = "Operation timed out") {
  let n;
  const s = new Promise((o, c) => {
    n = setTimeout(() => {
      c(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, s]);
  } finally {
    clearTimeout(n);
  }
}
class _n {
  constructor(e) {
    this.config = e, this.client = Qi({
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
    Gt('count="draft"', e.draft), Gt('count="pending"', e.pending), Gt('count="completed"', e.completed), Gt('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function da(i) {
  const e = i || is(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new _n(e);
  return De(() => t.init()), t;
}
function ua(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new _n(t);
  De(() => n.init());
}
typeof document < "u" && De(() => {
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
      const s = String(n.basePath || n.base_path || "/admin"), o = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new _n({ basePath: s, apiBasePath: o }).init();
    }
  }
});
class ui {
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
      const s = u(`#artifacts-${n}`);
      s && (n === e ? G(s) : D(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = u("#artifact-executed"), n = u("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), G(t));
    }
    if (e.source) {
      const t = u("#artifact-source"), n = u("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), G(t));
    }
    if (e.certificate) {
      const t = u("#artifact-certificate"), n = u("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), G(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function pa(i) {
  const e = new ui(i);
  return De(() => e.init()), e;
}
function ga(i) {
  const e = new ui(i);
  De(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function ss(i = document) {
  Bt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = en(t));
  });
}
function rs(i = document) {
  Bt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = rn(t));
  });
}
function as(i = document) {
  ss(i), rs(i);
}
function os() {
  De(() => {
    as();
  });
}
typeof document < "u" && os();
const jn = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class pi {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), o = e.get("state"), c = this.parseOAuthState(o);
    c.account_id || (c.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, s, c) : t ? this.handleSuccess(t, c) : this.handleError("unknown", "No authorization code was received from Google.", c);
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
    switch (D(t), D(n), D(s), e) {
      case "loading":
        G(t);
        break;
      case "success":
        G(n);
        break;
      case "error":
        G(s);
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
    const { errorMessage: s, errorDetail: o, closeBtn: c } = this.elements;
    s && (s.textContent = jn[e] || jn.unknown), t && o && (o.textContent = t, G(o)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), o = s.get("state"), r = this.parseOAuthState(o).account_id || s.get("account_id");
      r && n.searchParams.set("account_id", r), window.location.href = n.toString();
    }
  }
}
function ma(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new pi(e);
  return De(() => t.init()), t;
}
function ha(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new pi(e);
  De(() => t.init());
}
const hn = "esign.google.account_id", cs = {
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
class gi {
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
      retryBtn: s,
      reauthBtn: o,
      oauthCancelBtn: c,
      disconnectCancelBtn: r,
      disconnectConfirmBtn: f,
      accountIdInput: p,
      oauthModal: y,
      disconnectModal: S
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, S && G(S);
    }), r && r.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, S && D(S);
    }), f && f.addEventListener("click", () => this.disconnect()), c && c.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), p && (p.addEventListener("change", () => {
      this.setCurrentAccountId(p.value, !0);
    }), p.addEventListener("keydown", (m) => {
      m.key === "Enter" && (m.preventDefault(), this.setCurrentAccountId(p.value, !0));
    }));
    const { accountDropdown: M, connectFirstBtn: L } = this.elements;
    M && M.addEventListener("change", () => {
      M.value === "__new__" ? (M.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(M.value, !0);
    }), L && L.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (m) => {
      m.key === "Escape" && (y && !y.classList.contains("hidden") && this.cancelOAuthFlow(), S && !S.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, D(S)));
    }), [y, S].forEach((m) => {
      m && m.addEventListener("click", (E) => {
        const w = E.target;
        (w === m || w.getAttribute("aria-hidden") === "true") && (D(m), m === y ? this.cancelOAuthFlow() : m === S && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(hn)
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
      (s) => this.normalizeAccountId(s.account_id) === t
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
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: s } = this.elements;
    e && document.activeElement !== e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), this.persistAccountId(), this.syncAccountIdInURL(), this.updateScopedLinks([n, s]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  /**
   * Persist account ID to localStorage
   */
  persistAccountId() {
    try {
      this.currentAccountId ? window.localStorage.setItem(hn, this.currentAccountId) : window.localStorage.removeItem(hn);
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
    t && (t.textContent = e), ht(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: o } = this.elements;
    switch (D(t), D(n), D(s), D(o), e) {
      case "loading":
        G(t);
        break;
      case "disconnected":
        G(n);
        break;
      case "connected":
        G(s);
        break;
      case "error":
        G(o);
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
    const t = (E, w) => {
      for (const C of E)
        if (Object.prototype.hasOwnProperty.call(e, C) && e[C] !== void 0 && e[C] !== null)
          return e[C];
      return w;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), o = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), c = t(["connected", "Connected"], !1), r = t(["degraded", "Degraded"], !1), f = t(["degraded_reason", "DegradedReason"], ""), p = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), y = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), S = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let M = t(["is_expired", "IsExpired"], void 0), L = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof M != "boolean" || typeof L != "boolean") && n) {
      const E = new Date(n);
      if (!Number.isNaN(E.getTime())) {
        const w = E.getTime() - Date.now(), C = 5 * 60 * 1e3;
        M = w <= 0, L = w > 0 && w <= C;
      }
    }
    const m = typeof S == "boolean" ? S : (M === !0 || L === !0) && !y;
    return {
      connected: c,
      account_id: o,
      email: p,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: M === !0,
      is_expiring_soon: L === !0,
      can_auto_refresh: y,
      needs_reauthorization: m,
      degraded: r,
      degraded_reason: f
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: o, reauthWarning: c, reauthReason: r } = this.elements;
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
        const s = cs[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, s, o) {
    const { expiryInfo: c, reauthWarning: r, reauthReason: f } = this.elements;
    if (!c) return;
    if (c.classList.remove("text-red-600", "text-amber-600"), c.classList.add("text-gray-500"), !e) {
      c.textContent = "Access token status unknown", r && D(r);
      return;
    }
    const p = new Date(e), y = /* @__PURE__ */ new Date(), S = Math.max(
      1,
      Math.round((p.getTime() - y.getTime()) / (1e3 * 60))
    );
    t ? s ? (c.textContent = "Access token expired, but refresh is available and will be applied automatically.", c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), r && D(r)) : (c.textContent = "Access token has expired. Please re-authorize.", c.classList.remove("text-gray-500"), c.classList.add("text-red-600"), r && G(r), f && (f.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), s ? (c.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}. Refresh is available automatically.`, r && D(r)) : (c.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}`, r && G(r), f && (f.textContent = `Your access token will expire in ${S} minute${S !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (c.textContent = `Token valid until ${p.toLocaleDateString()} ${p.toLocaleTimeString()}`, r && D(r)), !o && r && D(r);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (G(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : D(n));
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
      const r = document.createElement("option");
      r.value = c;
      const f = o.email || c || "Default", p = o.status !== "connected" ? ` (${o.status})` : "";
      r.textContent = `${f}${p}`, c === this.currentAccountId && (r.selected = !0), e.appendChild(r);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const o = document.createElement("option");
      o.value = this.currentAccountId, o.textContent = `${this.currentAccountId} (new)`, o.selected = !0, e.appendChild(o);
    }
    const s = document.createElement("option");
    s.value = "__new__", s.textContent = "+ Connect New Account...", e.appendChild(s);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && D(e), this.accounts.length === 0) {
      t && G(t), n && D(n);
      return;
    }
    t && D(t), n && (G(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, o = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, c = t ? "ring-2 ring-blue-500" : "", r = n[e.status] || "bg-white border-gray-200", f = s[e.status] || "bg-gray-100 text-gray-700", p = o[e.status] || e.status, y = e.account_id || "default", S = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${r} ${c} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(S)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(y)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${f}">
              ${p}
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
      s.addEventListener("click", (o) => {
        const r = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(r, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (o) => {
        const r = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(r, !1), this.startOAuthFlow(r);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (o) => {
        const r = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = r, t && G(t);
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
    t && G(t);
    const s = this.resolveOAuthRedirectURI(), o = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = o;
    const c = this.buildGoogleOAuthUrl(s, o);
    if (!c) {
      t && D(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const r = 500, f = 600, p = (window.screen.width - r) / 2, y = (window.screen.height - f) / 2;
    if (this.oauthWindow = window.open(
      c,
      "google_oauth",
      `width=${r},height=${f},left=${p},top=${y},popup=yes`
    ), !this.oauthWindow) {
      t && D(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (S) => this.handleOAuthCallback(S), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && D(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const n = /* @__PURE__ */ new Set(), s = this.normalizeOrigin(window.location.origin);
    s && n.add(s);
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
      const n = new URL(e), s = new URL(t);
      return n.protocol !== s.protocol || n.port !== s.port ? !1 : this.isLoopbackHost(n.hostname) && this.isLoopbackHost(s.hostname);
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
    if (!this.isAllowedOAuthCallbackOrigin(e.origin)) return;
    const t = e.data;
    if (t.type !== "google_oauth_callback") return;
    const { oauthModal: n } = this.elements;
    if (this.cleanupOAuthFlow(), n && D(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const s = this.resolveOAuthRedirectURI(), c = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        c !== this.currentAccountId && this.setCurrentAccountId(c, !1);
        const r = await fetch(
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
              redirect_uri: s
            })
          }
        );
        if (!r.ok) {
          const f = await r.json();
          throw new Error(f.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (s) {
        console.error("Connect error:", s);
        const o = s instanceof Error ? s.message : "Unknown error";
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
    e && D(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && D(e);
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
function fa(i) {
  const e = new gi(i);
  return De(() => e.init()), e;
}
function va(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new gi(e);
  De(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const fn = "esign.google.account_id", qn = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Vn = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class mi {
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
      loadMoreBtn: s,
      importBtn: o,
      clearSelectionBtn: c,
      importCancelBtn: r,
      importConfirmBtn: f,
      importForm: p,
      importModal: y,
      viewListBtn: S,
      viewGridBtn: M
    } = this.elements;
    if (e) {
      const m = an(() => this.handleSearch(), 300);
      e.addEventListener("input", m), e.addEventListener("keydown", (E) => {
        E.key === "Enter" && (E.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), c && c.addEventListener("click", () => this.clearSelection()), r && r.addEventListener("click", () => this.hideImportModal()), f && p && p.addEventListener("submit", (m) => {
      m.preventDefault(), this.handleImport();
    }), y && y.addEventListener("click", (m) => {
      const E = m.target;
      (E === y || E.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), S && S.addEventListener("click", () => this.setViewMode("list")), M && M.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (m) => {
      m.key === "Escape" && y && !y.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: L } = this.elements;
    L && L.addEventListener("click", (m) => this.handleFileListClick(m));
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, G(e)) : D(e)), t) {
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), c = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), f = String(e.ownerEmail || e.OwnerEmail || "").trim(), p = Array.isArray(e.parents) ? e.parents : r ? [r] : [], y = Array.isArray(e.owners) ? e.owners : f ? [{ emailAddress: f }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: o,
      webViewLink: c,
      parents: p,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && G(t));
    try {
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      let o;
      this.searchQuery ? o = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : o = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (o += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const c = await fetch(o, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!c.ok)
        throw new Error(`Failed to load files: ${c.status}`);
      const r = await c.json(), f = Array.isArray(r.files) ? r.files.map((p) => this.normalizeDriveFile(p)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...f] : this.currentFiles = f, this.nextPageToken = r.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), ht(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), ht("Error loading files");
    } finally {
      this.isLoading = !1, t && D(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && D(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Vn.includes(e.mimeType), s = this.selectedFile?.id === e.id, o = qn[e.mimeType] || qn.default, c = this.getFileIcon(o);
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
          ${c}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${rn(e.modifiedTime)}
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
    const s = n.dataset.fileId, o = n.dataset.isFolder === "true";
    s && (o ? this.navigateToFolder(s) : this.selectFile(s));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), ht(`Selected: ${t.name}`));
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
      previewType: o,
      previewFileId: c,
      previewOwner: r,
      previewModified: f,
      importBtn: p,
      openInGoogleBtn: y
    } = this.elements;
    if (!this.selectedFile) {
      e && G(e), t && D(t);
      return;
    }
    e && D(e), t && G(t);
    const S = this.selectedFile, M = Vn.includes(S.mimeType);
    s && (s.textContent = S.name), o && (o.textContent = this.getMimeTypeLabel(S.mimeType)), c && (c.textContent = S.id), r && S.owners.length > 0 && (r.textContent = S.owners[0].emailAddress || "-"), f && (f.textContent = rn(S.modifiedTime)), p && (M ? (p.removeAttribute("disabled"), p.classList.remove("opacity-50", "cursor-not-allowed")) : (p.setAttribute("disabled", "true"), p.classList.add("opacity-50", "cursor-not-allowed"))), y && S.webViewLink && (y.href = S.webViewLink);
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
      D(e), t && (t.textContent = "Search Results");
      return;
    }
    G(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
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
    ).join(""), Bt(".breadcrumb-item", s).forEach((o) => {
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
    e && (this.nextPageToken ? G(e) : D(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? G(t) : D(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && D(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
      const o = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = o;
    }
    s && (s.value = ""), e && G(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && D(e);
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
      importAgreementTitle: o
    } = this.elements, c = this.selectedFile.id, r = s?.value.trim() || this.selectedFile.name, f = o?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && G(t), n && (n.textContent = "Importing...");
    try {
      const p = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: c,
          document_title: r,
          agreement_title: f || void 0
        })
      });
      if (!p.ok) {
        const S = await p.json();
        throw new Error(S.error?.message || "Import failed");
      }
      const y = await p.json();
      this.showToast("Import started successfully", "success"), ht("Import started"), this.hideImportModal(), y.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${y.document.id}` : y.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${y.agreement.id}`);
    } catch (p) {
      console.error("Import error:", p);
      const y = p instanceof Error ? p.message : "Import failed";
      this.showToast(y, "error"), ht(`Error: ${y}`);
    } finally {
      e && e.removeAttribute("disabled"), t && D(t), n && (n.textContent = "Import");
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
function ya(i) {
  const e = new mi(i);
  return De(() => e.init()), e;
}
function ba(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new mi(e);
  De(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
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
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", s = t?.value || "";
    try {
      const o = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      o.searchParams.set("range", n), s && o.searchParams.set("provider", s);
      const c = await fetch(o.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!c.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const r = await c.json();
        this.healthData = r;
      }
      this.renderHealthData(), ht("Health data refreshed");
    } catch (o) {
      console.error("Failed to load health data:", o), this.healthData = this.generateMockHealthData(n, s), this.renderHealthData();
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
    for (let o = 0; o < e; o++) {
      const c = n[Math.floor(Math.random() * n.length)], r = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: c,
        provider: r,
        message: this.getActivityMessage(c, r),
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
    const n = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, o = /* @__PURE__ */ new Date();
    for (let c = e - 1; c >= 0; c--) {
      const r = new Date(o.getTime() - c * 36e5);
      n.push(
        r.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
      const o = s.healthTrend >= 0 ? "+" : "";
      n.textContent = `${o}${s.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: s } = this.elements, o = this.healthData.syncStats;
    e && (e.textContent = `${o.successRate.toFixed(1)}%`), t && (t.textContent = `${o.succeeded} succeeded`), n && (n.textContent = `${o.failed} failed`), s && (s.style.width = `${o.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: s } = this.elements, o = this.healthData.conflictStats;
    if (e && (e.textContent = String(o.pending)), t && (t.textContent = `${o.pending} pending`), n && (n.textContent = `${o.resolvedToday} resolved today`), s) {
      const c = o.trend >= 0 ? "+" : "";
      s.textContent = `${c}${o.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: s } = this.elements, o = this.healthData.retryStats;
    e && (e.textContent = String(o.total)), t && (t.textContent = `${o.recoveryRate}%`), n && (n.textContent = o.avgAttempts.toFixed(1)), s && (s.innerHTML = o.recent.map(
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
      s.addEventListener("click", (o) => this.dismissAlert(o));
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
    const { alertsList: s, noAlerts: o, alertCount: c } = this.elements, r = s?.querySelectorAll(":scope > div").length || 0;
    c && (c.textContent = `${r} active`, r === 0 && (c.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), o && o.classList.remove("hidden")));
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
    const o = document.getElementById(e);
    if (!o) return;
    const c = o.getContext("2d");
    if (!c) return;
    const r = o.width, f = o.height, p = 40, y = r - p * 2, S = f - p * 2;
    c.clearRect(0, 0, r, f);
    const M = t.labels, L = Object.values(t.datasets), m = y / M.length / (L.length + 1), E = Math.max(...L.flat()) || 1;
    M.forEach((w, C) => {
      const R = p + C * y / M.length + m / 2;
      L.forEach((U, _) => {
        const $ = U[C] / E * S, te = R + _ * m, N = f - p - $;
        c.fillStyle = n[_] || "#6b7280", c.fillRect(te, N, m - 2, $);
      }), C % Math.ceil(M.length / 6) === 0 && (c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "center", c.fillText(w, R + L.length * m / 2, f - p + 15));
    }), c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "right";
    for (let w = 0; w <= 4; w++) {
      const C = f - p - w * S / 4, R = Math.round(E * w / 4);
      c.fillText(R.toString(), p - 5, C + 3);
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
function wa(i) {
  const e = new hi(i);
  return De(() => e.init()), e;
}
function Sa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new hi(e);
  De(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class fi {
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
      cancelModalBtn: s,
      refreshBtn: o,
      retryBtn: c,
      addFieldBtn: r,
      addRuleBtn: f,
      validateBtn: p,
      mappingForm: y,
      publishCancelBtn: S,
      publishConfirmBtn: M,
      deleteCancelBtn: L,
      deleteConfirmBtn: m,
      closePreviewBtn: E,
      loadSampleBtn: w,
      runPreviewBtn: C,
      clearPreviewBtn: R,
      previewSourceInput: U,
      searchInput: _,
      filterStatus: $,
      filterProvider: te,
      mappingModal: N,
      publishModal: Z,
      deleteModal: me,
      previewModal: le
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.loadMappings()), r?.addEventListener("click", () => this.addSchemaField()), f?.addEventListener("click", () => this.addMappingRule()), p?.addEventListener("click", () => this.validateMapping()), y?.addEventListener("submit", (ue) => {
      ue.preventDefault(), this.saveMapping();
    }), S?.addEventListener("click", () => this.closePublishModal()), M?.addEventListener("click", () => this.publishMapping()), L?.addEventListener("click", () => this.closeDeleteModal()), m?.addEventListener("click", () => this.deleteMapping()), E?.addEventListener("click", () => this.closePreviewModal()), w?.addEventListener("click", () => this.loadSamplePayload()), C?.addEventListener("click", () => this.runPreviewTransform()), R?.addEventListener("click", () => this.clearPreview()), U?.addEventListener("input", an(() => this.validateSourceJson(), 300)), _?.addEventListener("input", an(() => this.renderMappings(), 300)), $?.addEventListener("change", () => this.renderMappings()), te?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ue) => {
      ue.key === "Escape" && (N && !N.classList.contains("hidden") && this.closeModal(), Z && !Z.classList.contains("hidden") && this.closePublishModal(), me && !me.classList.contains("hidden") && this.closeDeleteModal(), le && !le.classList.contains("hidden") && this.closePreviewModal());
    }), [N, Z, me, le].forEach((ue) => {
      ue?.addEventListener("click", (Ne) => {
        const Ze = Ne.target;
        (Ze === ue || Ze.getAttribute("aria-hidden") === "true") && (ue === N ? this.closeModal() : ue === Z ? this.closePublishModal() : ue === me ? this.closeDeleteModal() : ue === le && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ht(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: o } = this.elements;
    switch (D(t), D(n), D(s), D(o), e) {
      case "loading":
        G(t);
        break;
      case "empty":
        G(n);
        break;
      case "error":
        G(s);
        break;
      case "list":
        G(o);
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
    const o = (t?.value || "").toLowerCase(), c = n?.value || "", r = s?.value || "", f = this.mappings.filter((p) => !(o && !p.name.toLowerCase().includes(o) && !p.provider.toLowerCase().includes(o) || c && p.status !== c || r && p.provider !== r));
    if (f.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = f.map(
      (p) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(p.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(p.compiled_hash ? p.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(p.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(p.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${p.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(p.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(p.id)}" aria-label="Preview ${this.escapeHtml(p.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(p.id)}" aria-label="Edit ${this.escapeHtml(p.name)}">
              Edit
            </button>
            ${p.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(p.id)}" aria-label="Publish ${this.escapeHtml(p.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(p.id)}" aria-label="Delete ${this.escapeHtml(p.name)}">
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
      schemaObjectTypeInput: o,
      schemaVersionInput: c,
      schemaFieldsContainer: r,
      mappingRulesContainer: f
    } = this.elements, p = [];
    r?.querySelectorAll(".schema-field-row").forEach((S) => {
      p.push({
        object: (S.querySelector(".field-object")?.value || "").trim(),
        field: (S.querySelector(".field-name")?.value || "").trim(),
        type: S.querySelector(".field-type")?.value || "string",
        required: S.querySelector(".field-required")?.checked || !1
      });
    });
    const y = [];
    return f?.querySelectorAll(".mapping-rule-row").forEach((S) => {
      y.push({
        source_object: (S.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (S.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: S.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (S.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: o?.value.trim() || "",
        version: c?.value.trim() || void 0,
        fields: p
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
      mappingNameInput: s,
      mappingProviderInput: o,
      schemaObjectTypeInput: c,
      schemaVersionInput: r,
      schemaFieldsContainer: f,
      mappingRulesContainer: p,
      mappingStatusBadge: y,
      formValidationStatus: S
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), o && (o.value = e.provider || "");
    const M = e.external_schema || { object_type: "", fields: [] };
    c && (c.value = M.object_type || ""), r && (r.value = M.version || ""), f && (f.innerHTML = "", (M.fields || []).forEach((L) => f.appendChild(this.createSchemaFieldRow(L)))), p && (p.innerHTML = "", (e.rules || []).forEach((L) => p.appendChild(this.createMappingRuleRow(L)))), e.status && y ? (y.innerHTML = this.getStatusBadge(e.status), y.classList.remove("hidden")) : y && y.classList.add("hidden"), D(S);
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
      mappingRulesContainer: o,
      mappingStatusBadge: c,
      formValidationStatus: r
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), o && (o.innerHTML = ""), c && c.classList.add("hidden"), D(r), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), G(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), G(n), o?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    D(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: o } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), G(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    D(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, G(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    D(this.elements.deleteModal), this.pendingDeleteId = null;
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
      }), o = await s.json();
      if (s.ok && o.status === "ok")
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
                <ul class="text-sm mt-1 list-disc list-inside">${c.map((r) => `<li>${this.escapeHtml(r)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      G(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, G(t));
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
      const n = !!t.id, s = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, c = await fetch(s, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!c.ok) {
        const r = await c.json();
        throw new Error(r.error?.message || `HTTP ${c.status}`);
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
    const t = this.mappings.find((y) => y.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: s,
      previewMappingProvider: o,
      previewObjectType: c,
      previewMappingStatus: r,
      previewSourceInput: f,
      sourceSyntaxError: p
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), o && (o.textContent = t.provider), c && (c.textContent = t.external_schema?.object_type || "-"), r && (r.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), f && (f.value = ""), D(p), G(n), f?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    D(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: o } = this.elements;
    switch (D(t), D(n), D(s), D(o), e) {
      case "empty":
        G(t);
        break;
      case "loading":
        G(n);
        break;
      case "error":
        G(s);
        break;
      case "success":
        G(o);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", o = n.fields || [], c = {}, r = {};
    o.forEach((f) => {
      const p = f.field || "field";
      switch (f.type) {
        case "string":
          r[p] = p === "email" ? "john.doe@example.com" : p === "name" ? "John Doe" : `sample_${p}`;
          break;
        case "number":
          r[p] = 123;
          break;
        case "boolean":
          r[p] = !0;
          break;
        case "date":
          r[p] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          r[p] = `sample_${p}`;
      }
    }), c[s] = r, e && (e.value = JSON.stringify(c, null, 2)), D(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return D(t), null;
    try {
      const s = JSON.parse(n);
      return D(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, G(t)), null;
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
    }, o = {}, c = {}, r = [];
    return n.forEach((f) => {
      const p = this.resolveSourceValue(e, f.source_object, f.source_field), y = p !== void 0;
      if (s.matched_rules.push({
        source: f.source_field,
        matched: y,
        value: p
      }), !!y)
        switch (f.target_entity) {
          case "participant":
            o[f.target_path] = p;
            break;
          case "agreement":
            c[f.target_path] = p;
            break;
          case "field_definition":
            r.push({ path: f.target_path, value: p });
            break;
        }
    }), Object.keys(o).length > 0 && s.participants.push({
      ...o,
      role: o.role || "signer",
      signing_stage: o.signing_stage || 1
    }), s.agreement = c, s.field_definitions = r, s;
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
          const o = e[s];
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
      previewFields: s,
      fieldsCount: o,
      previewMetadata: c,
      previewRawJson: r,
      previewRulesTbody: f
    } = this.elements, p = e.participants || [];
    n && (n.textContent = `(${p.length})`), t && (p.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = p.map(
      (L) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(L.name || L.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(L.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(L.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(L.role))}</span>
              <span class="text-xs text-gray-500">Stage ${L.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const y = e.field_definitions || [];
    o && (o.textContent = `(${y.length})`), s && (y.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = y.map(
      (L) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(L.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(L.value))}</span>
          </div>
        `
    ).join(""));
    const S = e.agreement || {}, M = Object.entries(S);
    c && (M.length === 0 ? c.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : c.innerHTML = M.map(
      ([L, m]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(L)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(m))}</span>
          </div>
        `
    ).join("")), r && (r.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((L) => {
      const m = f?.querySelector(`[data-rule-source="${this.escapeHtml(L.source)}"] span`);
      m && (L.matched ? (m.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", m.textContent = "Matched") : (m.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", m.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), D(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function xa(i) {
  const e = new fi(i);
  return De(() => e.init()), e;
}
function Ia(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new fi(e);
  De(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
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
      filterStatus: s,
      filterProvider: o,
      filterEntity: c,
      actionResolveBtn: r,
      actionIgnoreBtn: f,
      cancelResolveBtn: p,
      resolveForm: y,
      conflictDetailModal: S,
      resolveModal: M
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), f?.addEventListener("click", () => this.openResolveModal("ignored")), p?.addEventListener("click", () => this.closeResolveModal()), y?.addEventListener("submit", (L) => this.submitResolution(L)), document.addEventListener("keydown", (L) => {
      L.key === "Escape" && (M && !M.classList.contains("hidden") ? this.closeResolveModal() : S && !S.classList.contains("hidden") && this.closeConflictDetail());
    }), [S, M].forEach((L) => {
      L?.addEventListener("click", (m) => {
        const E = m.target;
        (E === L || E.getAttribute("aria-hidden") === "true") && (L === S ? this.closeConflictDetail() : L === M && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ht(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: o } = this.elements;
    switch (D(t), D(n), D(s), D(o), e) {
      case "loading":
        G(t);
        break;
      case "empty":
        G(n);
        break;
      case "error":
        G(s);
        break;
      case "list":
        G(o);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((r) => r.status === "pending").length, o = this.conflicts.filter((r) => r.status === "resolved").length, c = this.conflicts.filter((r) => r.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(o)), n && (n.textContent = String(c));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const o = t?.value || "", c = n?.value || "", r = s?.value || "", f = this.conflicts.filter((p) => !(o && p.status !== o || c && p.provider !== c || r && p.entity_kind !== r));
    if (f.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = f.map(
      (p) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(p.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${p.status === "pending" ? "bg-amber-100" : p.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${p.status === "pending" ? "text-amber-600" : p.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(p.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(p.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(p.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((p.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(p.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(p.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((p) => {
      p.addEventListener("click", () => this.openConflictDetail(p.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find(($) => $.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: o,
      detailStatusBadge: c,
      detailProvider: r,
      detailExternalId: f,
      detailInternalId: p,
      detailBindingId: y,
      detailConflictId: S,
      detailRunId: M,
      detailCreatedAt: L,
      detailVersion: m,
      detailPayload: E,
      resolutionSection: w,
      actionButtons: C,
      detailResolvedAt: R,
      detailResolvedBy: U,
      detailResolution: _
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), f && (f.textContent = t.external_id || "-"), p && (p.textContent = t.internal_id || "-"), y && (y.textContent = t.binding_id || "-"), S && (S.textContent = t.id), M && (M.textContent = t.run_id || "-"), L && (L.textContent = this.formatDate(t.created_at)), m && (m.textContent = String(t.version || 1)), E)
      try {
        const $ = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        E.textContent = JSON.stringify($, null, 2);
      } catch {
        E.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (G(w), D(C), R && (R.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), U && (U.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), _)
        try {
          const $ = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          _.textContent = JSON.stringify($, null, 2);
        } catch {
          _.textContent = t.resolution_json || "{}";
        }
    } else
      D(w), G(C);
    G(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    D(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), G(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    D(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t);
    let o = {};
    const c = s.get("resolution");
    if (c)
      try {
        o = JSON.parse(c);
      } catch {
        o = { raw: c };
      }
    const r = s.get("notes");
    r && (o.notes = r);
    const f = {
      status: s.get("status"),
      resolution: o
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const p = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(f)
      });
      if (!p.ok) {
        const y = await p.json();
        throw new Error(y.error?.message || `HTTP ${p.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (p) {
      console.error("Resolution error:", p);
      const y = p instanceof Error ? p.message : "Unknown error";
      this.showToast(`Failed: ${y}`, "error");
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
function Ca(i) {
  const e = new vi(i);
  return De(() => e.init()), e;
}
function Ea(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new vi(e);
  De(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class yi {
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
      startSyncForm: s,
      refreshBtn: o,
      retryBtn: c,
      closeDetailBtn: r,
      filterProvider: f,
      filterStatus: p,
      filterDirection: y,
      actionResumeBtn: S,
      actionRetryBtn: M,
      actionCompleteBtn: L,
      actionFailBtn: m,
      actionDiagnosticsBtn: E,
      startSyncModal: w,
      runDetailModal: C
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (R) => this.startSync(R)), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.loadSyncRuns()), r?.addEventListener("click", () => this.closeRunDetail()), f?.addEventListener("change", () => this.renderTimeline()), p?.addEventListener("change", () => this.renderTimeline()), y?.addEventListener("change", () => this.renderTimeline()), S?.addEventListener("click", () => this.runAction("resume")), M?.addEventListener("click", () => this.runAction("resume")), L?.addEventListener("click", () => this.runAction("complete")), m?.addEventListener("click", () => this.runAction("fail")), E?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (R) => {
      R.key === "Escape" && (w && !w.classList.contains("hidden") && this.closeStartSyncModal(), C && !C.classList.contains("hidden") && this.closeRunDetail());
    }), [w, C].forEach((R) => {
      R?.addEventListener("click", (U) => {
        const _ = U.target;
        (_ === R || _.getAttribute("aria-hidden") === "true") && (R === w ? this.closeStartSyncModal() : R === C && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ht(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: o } = this.elements;
    switch (D(t), D(n), D(s), D(o), e) {
      case "loading":
        G(t);
        break;
      case "empty":
        G(n);
        break;
      case "error":
        G(s);
        break;
      case "list":
        G(o);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, o = this.syncRuns.length, c = this.syncRuns.filter(
      (p) => p.status === "running" || p.status === "pending"
    ).length, r = this.syncRuns.filter((p) => p.status === "completed").length, f = this.syncRuns.filter((p) => p.status === "failed").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(c)), n && (n.textContent = String(r)), s && (s.textContent = String(f));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", o = n?.value || "", c = this.syncRuns.filter((r) => !(s && r.status !== s || o && r.direction !== o));
    if (c.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = c.map(
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
    t?.reset(), G(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    D(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t), o = {
      provider: s.get("provider"),
      direction: s.get("direction"),
      mapping_spec_id: s.get("mapping_spec_id"),
      cursor: s.get("cursor") || void 0
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
        const r = await c.json();
        throw new Error(r.error?.message || `HTTP ${c.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (c) {
      console.error("Start sync error:", c);
      const r = c instanceof Error ? c.message : "Unknown error";
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
    const t = this.syncRuns.find((U) => U.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: o,
      detailDirection: c,
      detailStatus: r,
      detailStarted: f,
      detailCompleted: p,
      detailCursor: y,
      detailAttempt: S,
      detailErrorSection: M,
      detailLastError: L,
      detailCheckpoints: m,
      actionResumeBtn: E,
      actionRetryBtn: w,
      actionCompleteBtn: C,
      actionFailBtn: R
    } = this.elements;
    s && (s.textContent = t.id), o && (o.textContent = t.provider), c && (c.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), r && (r.innerHTML = this.getStatusBadge(t.status)), f && (f.textContent = this.formatDate(t.started_at)), p && (p.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), y && (y.textContent = t.cursor || "-"), S && (S.textContent = String(t.attempt_count || 1)), t.last_error ? (L && (L.textContent = t.last_error), G(M)) : D(M), E && E.classList.toggle("hidden", t.status !== "running"), w && w.classList.toggle("hidden", t.status !== "failed"), C && C.classList.toggle("hidden", t.status !== "running"), R && R.classList.toggle("hidden", t.status !== "running"), m && (m.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), G(n);
    try {
      const U = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (U.ok) {
        const _ = await U.json();
        this.renderCheckpoints(_.checkpoints || []);
      } else
        m && (m.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (U) {
      console.error("Error loading checkpoints:", U), m && (m.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    D(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: o } = this.elements, c = e === "resume" ? t : e === "complete" ? s : o, r = e === "resume" ? n : null;
    if (!c) return;
    c.setAttribute("disabled", "true"), r?.setAttribute("disabled", "true");
    const f = c.innerHTML;
    c.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const p = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, y = await fetch(p, {
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
        const S = await y.json();
        throw new Error(S.error?.message || `HTTP ${y.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (p) {
      console.error(`${e} error:`, p);
      const y = p instanceof Error ? p.message : "Unknown error";
      this.showToast(`Failed: ${y}`, "error");
    } finally {
      c.removeAttribute("disabled"), r?.removeAttribute("disabled"), c.innerHTML = f;
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
function La(i) {
  const e = new yi(i);
  return De(() => e.init()), e;
}
function Aa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new yi(e);
  De(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const vn = "esign.google.account_id", ls = 25 * 1024 * 1024, ds = 2e3, Gn = 60, En = "application/vnd.google-apps.document", Ln = "application/pdf", Wn = "application/vnd.google-apps.folder", us = [En, Ln];
class Pn {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || ls, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: Bt(".source-tab"),
      sourcePanels: Bt(".source-panel"),
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
      clearBtn: s,
      titleInput: o
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (c) => {
      c.preventDefault(), c.stopPropagation(), this.clearFileSelection();
    }), o && o.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((c) => {
      n.addEventListener(c, (r) => {
        r.preventDefault(), r.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((c) => {
      n.addEventListener(c, (r) => {
        r.preventDefault(), r.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (c) => {
      const r = c.dataTransfer;
      r?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = r.files, this.handleFileSelect());
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
      refreshBtn: s,
      clearSelectionBtn: o,
      importBtn: c,
      importRetryBtn: r,
      driveAccountDropdown: f
    } = this.elements;
    if (e) {
      const p = an(() => this.handleSearch(), 300);
      e.addEventListener("input", p);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), f && f.addEventListener("change", () => {
      this.setCurrentAccountId(f.value, this.currentSource === "google");
    }), o && o.addEventListener("click", () => this.clearFileSelection()), c && c.addEventListener("click", () => this.startImport()), r && r.addEventListener("click", () => {
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
        window.localStorage.getItem(vn)
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
      const { searchInput: s, clearSearchBtn: o } = this.elements;
      s && (s.value = ""), o && D(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
        const s = await n.json();
        this.connectedAccounts = Array.isArray(s.accounts) ? s.accounts : [], this.renderConnectedAccountsDropdown();
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
    for (const s of this.connectedAccounts) {
      const o = this.normalizeAccountId(s?.account_id);
      if (n.has(o))
        continue;
      n.add(o);
      const c = document.createElement("option");
      c.value = o;
      const r = String(s?.email || "").trim(), f = String(s?.status || "").trim(), p = r || o || "Default account";
      c.textContent = f && f !== "connected" ? `${p} (${f})` : p, o === this.currentAccountId && (c.selected = !0), e.appendChild(c);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const s = document.createElement("option");
      s.value = this.currentAccountId, s.textContent = `${this.currentAccountId} (custom)`, s.selected = !0, e.appendChild(s);
    }
  }
  /**
   * Sync account ID to URL and localStorage
   */
  syncScopedAccountState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(vn, this.currentAccountId) : window.localStorage.removeItem(vn);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, G(e)) : D(e)), t) {
      const s = t.dataset.baseHref || t.getAttribute("href");
      s && t.setAttribute("href", this.applyAccountIdToPath(s));
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
      n.id.replace("panel-", "") === e ? G(n) : D(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), ht(
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: s } = this.elements, o = e?.files?.[0];
    if (o && this.validateFile(o)) {
      if (this.showPreview(o), n && (n.value = ""), s && (s.value = o.name), t && !t.value.trim()) {
        const c = o.name.replace(/\.pdf$/i, "");
        t.value = c;
      }
    } else
      e && (e.value = ""), this.clearPreview(), n && (n.value = ""), s && (s.value = "");
    this.updateSubmitState();
  }
  /**
   * Validate uploaded file
   */
  validateFile(e) {
    return this.clearError(), e ? e.type !== "application/pdf" && !e.name.toLowerCase().endsWith(".pdf") ? (this.showError("Please select a PDF file."), !1) : e.size > this.maxFileSize ? (this.showError(
      `File is too large (${en(e.size)}). Maximum size is ${en(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: o, uploadZone: c } = this.elements;
    s && (s.textContent = e.name), o && (o.textContent = en(e.size)), t && D(t), n && G(n), c && (c.classList.remove("border-gray-300"), c.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && G(e), t && D(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, G(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", D(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, o = t?.value.trim().length ?? !1, c = s && o;
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), s = t.get("org_id"), o = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && o.searchParams.set("tenant_id", n), s && o.searchParams.set("org_id", s);
    const c = new FormData();
    c.append("file", e);
    const r = await fetch(o.toString(), {
      method: "POST",
      body: c,
      credentials: "same-origin"
    }), f = await r.json().catch(() => ({}));
    if (!r.ok) {
      const S = f?.error?.message || f?.message || "Upload failed. Please try again.";
      throw new Error(S);
    }
    const p = f?.object_key ? String(f.object_key).trim() : "";
    if (!p)
      throw new Error("Upload failed: missing source object key.");
    const y = f?.source_original_name ? String(f.source_original_name).trim() : f?.original_name ? String(f.original_name).trim() : e.name;
    return {
      objectKey: p,
      sourceOriginalName: y
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: s, sourceOriginalNameInput: o } = this.elements, c = t?.files?.[0];
    if (!(!c || !this.validateFile(c))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const r = await this.uploadSourcePDF(c);
        s && (s.value = r.objectKey), o && (o.value = r.sourceOriginalName || c.name), n?.submit();
      } catch (r) {
        const f = r instanceof Error ? r.message : "Upload failed. Please try again.";
        this.showError(f), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), c = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), f = String(e.ownerEmail || e.OwnerEmail || "").trim(), p = Array.isArray(e.parents) ? e.parents : r ? [r] : [], y = Array.isArray(e.owners) ? e.owners : f ? [{ emailAddress: f }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: o,
      webViewLink: c,
      parents: p,
      owners: y
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
    return e.mimeType === Ln;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Wn;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return us.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === En ? "Google Document" : t === Ln ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Wn ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: s, append: o } = e, { fileList: c } = this.elements;
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
      let r;
      n ? (r = this.buildScopedAPIURL("/esign/google-drive/search"), r.searchParams.set("q", n), r.searchParams.set("page_size", "20"), s && r.searchParams.set("page_token", s)) : (r = this.buildScopedAPIURL("/esign/google-drive/browse"), r.searchParams.set("page_size", "20"), t && t !== "root" && r.searchParams.set("folder_id", t), s && r.searchParams.set("page_token", s));
      const f = await fetch(r.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), p = await f.json();
      if (!f.ok)
        throw new Error(p.error?.message || "Failed to load files");
      const y = Array.isArray(p.files) ? p.files.map((m) => this.normalizeDriveFile(m)) : [];
      this.nextPageToken = p.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...y] : this.currentFiles = y, this.renderFiles(o);
      const { resultCount: S, listTitle: M } = this.elements;
      n && S ? (S.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, M && (M.textContent = "Search Results")) : (S && (S.textContent = ""), M && (M.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: L } = this.elements;
      L && (this.nextPageToken ? G(L) : D(L)), ht(`Loaded ${y.length} files`);
    } catch (r) {
      console.error("Error loading files:", r), c && (c.innerHTML = `
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
        `), ht(`Error: ${r instanceof Error ? r.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((s, o) => {
      const c = this.getFileIcon(s), r = this.isImportable(s), f = this.isFolder(s), p = this.selectedFile && this.selectedFile.id === s.id, y = !r && !f;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${p ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${y ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${p}"
          data-file-index="${o}"
          ${y ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0 ${c.text}">
            ${c.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + rn(s.modifiedTime) : ""}
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
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((s) => {
      s.addEventListener("click", () => {
        const o = parseInt(s.dataset.fileIndex || "0", 10), c = this.currentFiles[o];
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
    t && (t.value = ""), n && D(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      D(e);
      return;
    }
    G(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, s) => {
      const o = s === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${s > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${s}" class="breadcrumb-item ${o ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const s = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, s + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: s } = this.elements;
    s && s.querySelectorAll(".file-item").forEach((w) => {
      const C = parseInt(w.dataset.fileIndex || "0", 10);
      this.currentFiles[C].id === e.id ? (w.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "true")) : (w.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: o,
      filePreview: c,
      importStatus: r,
      previewIcon: f,
      previewTitle: p,
      previewType: y,
      importTypeInfo: S,
      importTypeLabel: M,
      importTypeDesc: L,
      snapshotWarning: m,
      importDocumentTitle: E
    } = this.elements;
    o && D(o), c && G(c), r && D(r), f && (f.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, f.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), p && (p.textContent = e.name || "Untitled"), y && (y.textContent = this.getFileTypeName(e.mimeType)), n && S && (S.className = `p-3 rounded-lg border ${n.bgClass}`, M && (M.textContent = n.label, M.className = `text-xs font-medium ${n.textClass}`), L && (L.textContent = n.desc, L.className = `text-xs mt-1 ${n.textClass}`), m && (n.showSnapshot ? G(m) : D(m))), E && (E.value = e.name || ""), ht(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && G(e), t && D(t), n && D(n), s && s.querySelectorAll(".file-item").forEach((o) => {
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
      t && G(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && D(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && D(t), this.searchQuery = "";
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
      importStatusQueued: o,
      importStatusSuccess: c,
      importStatusFailed: r
    } = this.elements;
    switch (t && D(t), n && D(n), s && G(s), o && D(o), c && D(c), r && D(r), e) {
      case "queued":
      case "running":
        o && G(o);
        break;
      case "succeeded":
        c && G(c);
        break;
      case "failed":
        r && G(r);
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
        const o = this.config.routes.integrations || "/admin/esign/integrations/google";
        s.href = this.applyAccountIdToPath(o), G(s);
      } else
        D(s);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: s } = this.elements;
    if (!this.selectedFile || !e) return;
    const o = e.value.trim();
    if (!o) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && D(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const c = new URL(window.location.href);
      c.searchParams.delete("import_run_id"), window.history.replaceState({}, "", c.toString());
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
            document_title: o
          })
        }
      ), f = await r.json();
      if (!r.ok) {
        const y = f.error?.code || "";
        throw { message: f.error?.message || "Failed to start import", code: y };
      }
      this.currentImportRunId = f.import_run_id, this.pollAttempts = 0;
      const p = new URL(window.location.href);
      this.currentImportRunId && p.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", p.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (c) {
      console.error("Import error:", c);
      const r = c;
      this.showImportError(r.message || "Failed to start import", r.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), ds);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Gn) {
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
            this.showImportStatus("succeeded"), ht("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const o = n.error?.code || "", c = n.error?.message || "Import failed";
            this.showImportError(c, o), ht("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Gn ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function Ta(i) {
  const e = new Pn(i);
  return De(() => e.init()), e;
}
function _a(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new Pn(e);
  De(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function ps(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, s = i.context && typeof i.context == "object" ? i.context : {}, o = String(t.index || "").trim();
  return !e && !o ? null : {
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
      index: o,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && De(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = ps(t);
        n && new Pn(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const st = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, Jt = st.REVIEW, gs = {
  [st.DOCUMENT]: "Details",
  [st.DETAILS]: "Participants",
  [st.PARTICIPANTS]: "Fields",
  [st.FIELDS]: "Placement",
  [st.PLACEMENT]: "Review"
}, vt = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, on = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
};
st.DOCUMENT, st.DETAILS, st.PARTICIPANTS, st.FIELDS, st.REVIEW;
const An = /* @__PURE__ */ new Map(), ms = 30 * 60 * 1e3, Kn = {
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
function hs(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function fs(i) {
  const e = i instanceof Error ? i.message : i, t = hs(e);
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
  if (t && Kn[t]) {
    const n = Kn[t];
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
function Jn() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function vs() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function ys() {
  if (!vs())
    throw new Error("PDF preview library unavailable");
}
function bs(i) {
  const e = An.get(i);
  return e ? Date.now() - e.timestamp > ms ? (An.delete(i), null) : e : null;
}
function ws(i, e, t) {
  An.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Ss(i, e = on.THUMBNAIL_MAX_WIDTH, t = on.THUMBNAIL_MAX_HEIGHT) {
  await ys();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const o = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, c = o.numPages, r = await o.getPage(1), f = r.getViewport({ scale: 1 }), p = e / f.width, y = t / f.height, S = Math.min(p, y, 1), M = r.getViewport({ scale: S }), L = document.createElement("canvas");
  L.width = M.width, L.height = M.height;
  const m = L.getContext("2d");
  if (!m)
    throw new Error("Failed to get canvas context");
  return await r.render({
    canvasContext: m,
    viewport: M
  }).promise, { dataUrl: L.toDataURL("image/jpeg", 0.8), pageCount: c };
}
class xs {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || on.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || on.THUMBNAIL_MAX_HEIGHT
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
    const t = e === st.DOCUMENT || e === st.DETAILS || e === st.PARTICIPANTS || e === st.FIELDS || e === st.REVIEW;
    this.elements.container.classList.toggle("hidden", !t);
  }
  /**
   * Set document and load preview
   */
  async setDocument(e, t = null, n = null) {
    const s = ++this.requestVersion;
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
    const o = bs(e);
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
      if (s !== this.requestVersion)
        return;
      const { dataUrl: r, pageCount: f } = await Ss(
        c,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      ws(e, r, f), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? f,
        thumbnailUrl: r,
        isLoading: !1,
        error: null
      };
    } catch (c) {
      if (s !== this.requestVersion)
        return;
      const r = c instanceof Error ? c.message : "Failed to load preview", f = fs(r);
      Jn() && console.error("Failed to load document preview:", c), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: r,
        errorMessage: f.message,
        errorSuggestion: f.suggestion,
        errorRetryable: f.isRetryable
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: o, errorState: c, emptyState: r, contentState: f } = this.elements;
    if (e) {
      if (o?.classList.add("hidden"), c?.classList.add("hidden"), r?.classList.add("hidden"), f?.classList.add("hidden"), !this.state.documentId) {
        r?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        o?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        c?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Jn() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      f?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), s && this.state.pageCount && (s.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
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
function Is(i = {}) {
  const e = new xs(i);
  return e.init(), e;
}
function Cs(i = {}) {
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
function Es(i) {
  const { context: e, hooks: t = {} } = i;
  return Cs({
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
function pt(i, e) {
  return i instanceof Document ? i.getElementById(e) : i.querySelector(`#${e}`);
}
function qt(i, e, t) {
  const n = pt(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function Ls(i = document) {
  return {
    marker: pt(i, "esign-page-config"),
    form: {
      root: qt(i, "agreement-form", "form"),
      submitBtn: qt(i, "submit-btn", "submit button"),
      wizardSaveBtn: pt(i, "wizard-save-btn"),
      announcements: pt(i, "form-announcements"),
      documentIdInput: qt(i, "document_id", "document selector"),
      documentPageCountInput: pt(i, "document_page_count"),
      titleInput: qt(i, "title", "title input"),
      messageInput: qt(i, "message", "message input")
    },
    ownership: {
      banner: pt(i, "active-tab-banner"),
      message: pt(i, "active-tab-message"),
      takeControlBtn: pt(i, "active-tab-take-control-btn"),
      reloadBtn: pt(i, "active-tab-reload-btn")
    },
    sync: {
      indicator: pt(i, "sync-status-indicator"),
      icon: pt(i, "sync-status-icon"),
      text: pt(i, "sync-status-text"),
      retryBtn: pt(i, "sync-retry-btn")
    },
    conflict: {
      modal: pt(i, "conflict-dialog-modal"),
      localTime: pt(i, "conflict-local-time"),
      serverRevision: pt(i, "conflict-server-revision"),
      serverTime: pt(i, "conflict-server-time")
    }
  };
}
function As(i, e) {
  function t(n) {
    i.form.wizardSaveBtn instanceof HTMLButtonElement && (i.form.wizardSaveBtn.disabled = n), i.form.submitBtn instanceof HTMLButtonElement && (i.form.submitBtn.disabled = n);
  }
  return {
    render(n = {}) {
      const s = n?.isOwner !== !1, o = n?.coordinationAvailable !== !1, c = i.ownership.banner, r = i.ownership.message, f = i.ownership.takeControlBtn;
      if (!c || !r) {
        t(!s);
        return;
      }
      if (!o || s) {
        c.classList.add("hidden"), f?.removeAttribute("disabled"), t(!1);
        return;
      }
      const p = n?.claim, y = p?.lastSeenAt ? e.formatRelativeTime(p.lastSeenAt) : "recently";
      r.textContent = `This agreement is active in another tab. Take control here to resume syncing and sending. Last seen ${y}.`, c.classList.remove("hidden"), t(!0);
    },
    destroy() {
      t(!1);
    }
  };
}
class Ts {
  constructor(e) {
    this.state = null, this.listeners = [], this.options = e;
  }
  start() {
    this.migrateLegacyStateIfNeeded(), this.state = this.loadFromSession() || this.createInitialState();
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
      storageMigrationVersion: this.options.storageMigrationVersion,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !1
    };
  }
  generateWizardId() {
    return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  migrateLegacyStateIfNeeded() {
    const e = this.storage();
    if (e)
      try {
        const t = e.getItem(this.options.storageKey), n = e.getItem(this.options.legacyStorageKey);
        if (!n) return;
        if (t) {
          e.removeItem(this.options.legacyStorageKey);
          return;
        }
        const s = JSON.parse(n), o = this.normalizeLoadedState({
          ...s,
          storageMigrationVersion: this.options.storageMigrationVersion
        });
        e.setItem(this.options.storageKey, JSON.stringify(o)), e.removeItem(this.options.legacyStorageKey), this.options.emitTelemetry("wizard_resume_migration_used", {
          from: this.options.legacyStorageKey,
          to: this.options.storageKey
        });
      } catch {
        e.removeItem(this.options.legacyStorageKey);
      }
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
    const t = this.createInitialState(), n = { ...t, ...e }, s = Number.parseInt(String(e.currentStep ?? t.currentStep), 10);
    n.currentStep = Number.isFinite(s) ? Math.min(Math.max(s, 1), this.options.totalWizardSteps) : t.currentStep;
    const o = e.document && typeof e.document == "object" ? e.document : {}, c = o.id;
    n.document = {
      id: c == null ? null : String(c).trim() || null,
      title: String(o.title ?? "").trim() || null,
      pageCount: this.options.parsePositiveInt(o.pageCount, 0) || null
    };
    const r = e.details && typeof e.details == "object" ? e.details : {}, f = String(r.title ?? "").trim(), p = f === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    n.details = {
      title: f,
      message: String(r.message ?? "")
    }, n.participants = Array.isArray(e.participants) ? e.participants : [], n.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], n.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], n.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const y = String(e.wizardId ?? "").trim();
    n.wizardId = y || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, p), n.storageMigrationVersion = this.options.parsePositiveInt(
      e.storageMigrationVersion,
      this.options.storageMigrationVersion
    ) || this.options.storageMigrationVersion;
    const S = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = S || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
  }
  migrateState(e) {
    return null;
  }
  saveToSession() {
    const e = this.storage();
    if (!(!e || !this.state))
      try {
        this.state.updatedAt = this.now(), this.state.storageMigrationVersion = this.options.storageMigrationVersion, e.setItem(this.options.storageKey, JSON.stringify(this.state));
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
  applyRemoteSync(e, t, n = {}) {
    const s = this.getState(), o = s.syncPending === !0, c = String(e ?? "").trim() || null, r = this.options.parsePositiveInt(t, 0);
    return this.setState({
      ...s,
      serverDraftId: c || s.serverDraftId,
      serverRevision: r > 0 ? r : s.serverRevision,
      lastSyncedAt: String(n.lastSyncedAt || this.now()).trim() || s.lastSyncedAt,
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
    const n = this.normalizeLoadedState(e), s = this.getState();
    return s.syncPending === !0 ? (this.setState({
      ...s,
      serverDraftId: n.serverDraftId || s.serverDraftId,
      serverRevision: Math.max(
        this.options.parsePositiveInt(s.serverRevision, 0),
        this.options.parsePositiveInt(n.serverRevision, 0)
      ),
      lastSyncedAt: n.lastSyncedAt || s.lastSyncedAt,
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
    this.state = this.createInitialState(), e?.removeItem(this.options.storageKey), e?.removeItem(this.options.legacyStorageKey), this.notifyListeners();
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
    const e = this.getState(), t = this.options.collectFormState(), n = t.details && typeof t.details == "object" ? t.details : {}, s = this.options.normalizeTitleSource(
      t.titleSource,
      String(n.title || "").trim() === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER
    );
    return {
      ...t,
      titleSource: s,
      serverDraftId: e.serverDraftId,
      serverRevision: e.serverRevision,
      lastSyncedAt: e.lastSyncedAt,
      currentStep: e.currentStep,
      wizardId: e.wizardId,
      version: e.version,
      createdAt: e.createdAt,
      updatedAt: this.now(),
      storageMigrationVersion: this.options.storageMigrationVersion,
      syncPending: !0
    };
  }
  restoreFormState() {
    const e = this.getState();
    this.options.restoreDocumentState(e), this.options.restoreDetailsState(e);
  }
}
class _s {
  constructor(e) {
    this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null, this.stateManager = e.stateManager, this.currentUserID = e.currentUserID, this.draftsEndpoint = e.draftsEndpoint, this.draftEndpointWithUserID = e.draftEndpointWithUserID, this.draftRequestHeaders = e.draftRequestHeaders, this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
  }
  async create(e) {
    const t = {
      wizard_id: e.wizardId,
      wizard_state: e,
      title: e.details.title || "Untitled Agreement",
      current_step: e.currentStep,
      document_id: e.document.id || null,
      created_by_user_id: this.currentUserID
    }, n = await this.fetchImpl(this.draftEndpointWithUserID(this.draftsEndpoint), {
      method: "POST",
      credentials: "same-origin",
      headers: this.draftRequestHeaders(),
      body: JSON.stringify(t)
    });
    if (!n.ok) {
      const s = await n.json().catch(() => ({}));
      throw new Error(s.error?.message || `HTTP ${n.status}`);
    }
    return n.json();
  }
  async update(e, t, n) {
    const s = {
      expected_revision: n,
      wizard_state: t,
      title: t.details.title || "Untitled Agreement",
      current_step: t.currentStep,
      document_id: t.document.id || null,
      updated_by_user_id: this.currentUserID
    }, o = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}/${e}`), {
      method: "PUT",
      credentials: "same-origin",
      headers: this.draftRequestHeaders(),
      body: JSON.stringify(s)
    });
    if (o.status === 409) {
      const c = await o.json().catch(() => ({})), r = new Error("stale_revision");
      throw r.code = "stale_revision", r.currentRevision = c.error?.details?.current_revision, r;
    }
    if (!o.ok) {
      const c = await o.json().catch(() => ({}));
      throw new Error(c.error?.message || `HTTP ${o.status}`);
    }
    return o.json();
  }
  async load(e) {
    const t = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}/${e}`), {
      credentials: "same-origin",
      headers: this.draftRequestHeaders(!1)
    });
    if (!t.ok) {
      const n = new Error(`HTTP ${t.status}`);
      throw n.status = t.status, n;
    }
    return t.json();
  }
  async delete(e) {
    const t = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}/${e}`), {
      method: "DELETE",
      credentials: "same-origin",
      headers: this.draftRequestHeaders(!1)
    });
    if (!t.ok && t.status !== 404)
      throw new Error(`HTTP ${t.status}`);
  }
  async list() {
    const e = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}?limit=10`), {
      credentials: "same-origin",
      headers: this.draftRequestHeaders(!1)
    });
    if (!e.ok)
      throw new Error(`HTTP ${e.status}`);
    return e.json();
  }
  async sync() {
    const e = this.stateManager.getState();
    if (!e.syncPending) return { success: !0, result: null };
    try {
      let t;
      return e.serverDraftId ? t = await this.update(e.serverDraftId, e, e.serverRevision) : t = await this.create(e), this.stateManager.markSynced(t.id, t.revision), this.retryCount = 0, { success: !0, result: t };
    } catch (t) {
      return t?.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: t.currentRevision } : { success: !1, error: t?.message || "sync_failed" };
    }
  }
}
class Ps {
  constructor(e) {
    this.channel = null, this.heartbeatTimer = null, this.cleanupFns = [], this.activeTabCoordinationAvailable = !1, this.storageProbeValue = null, this.isOwner = !1, this.currentClaim = null, this.lastBlockedReason = "", this.options = e, this.activeTabCoordinationAvailable = this.hasActiveTabStorage();
  }
  start() {
    if (this.initBroadcastChannel(), this.initEventListeners(), !this.activeTabCoordinationAvailable) {
      this.updateOwnershipState(!0, "storage_unavailable", null);
      return;
    }
    this.evaluateOwnership("startup", { allowClaimIfAvailable: !0 });
  }
  stop() {
    this.activeTabCoordinationAvailable ? this.release("stop") : this.updateOwnershipState(!1, "stop", null), this.stopHeartbeat(), this.cleanupFns.forEach((e) => e()), this.cleanupFns = [], this.channel?.close && this.channel.close(), this.channel = null;
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
  storage() {
    return this.options.localStorageRef !== void 0 ? this.options.localStorageRef : this.win()?.localStorage ?? null;
  }
  hasActiveTabStorage() {
    if (this.storageProbeValue !== null)
      return this.storageProbeValue;
    const e = this.storage();
    if (!e)
      return this.storageProbeValue = !1, !1;
    try {
      const t = `${this.options.storageKey}:probe`;
      e.setItem(t, "1"), e.removeItem(t), this.storageProbeValue = !0;
    } catch {
      this.storageProbeValue = !1;
    }
    return this.storageProbeValue;
  }
  parseISOTimeToMillis(e) {
    const t = Date.parse(String(e || "").trim());
    return Number.isFinite(t) ? t : 0;
  }
  readActiveTabClaim() {
    const e = this.storage();
    if (!this.hasActiveTabStorage() || !e) return null;
    try {
      const t = e.getItem(this.options.storageKey);
      if (!t) return null;
      const n = JSON.parse(t);
      if (!n || typeof n != "object") return null;
      const s = String(n.tabId || "").trim();
      return s ? {
        tabId: s,
        claimedAt: String(n.claimedAt || "").trim(),
        lastSeenAt: String(n.lastSeenAt || "").trim()
      } : null;
    } catch {
      return null;
    }
  }
  isClaimFresh(e, t = Date.now()) {
    if (!e) return !1;
    const n = this.parseISOTimeToMillis(e.lastSeenAt || e.claimedAt);
    return n <= 0 ? !1 : t - n < this.options.staleMs;
  }
  writeActiveTabClaim(e) {
    const t = this.storage();
    if (!this.hasActiveTabStorage() || !t) return !1;
    try {
      return t.setItem(this.options.storageKey, JSON.stringify(e)), !0;
    } catch {
      return this.storageProbeValue = !1, !1;
    }
  }
  clearActiveTabClaim(e = "") {
    const t = this.storage();
    if (!this.hasActiveTabStorage() || !t) return !1;
    try {
      const n = this.readActiveTabClaim();
      return e && n?.tabId && n.tabId !== e ? !1 : (t.removeItem(this.options.storageKey), !0);
    } catch {
      return this.storageProbeValue = !1, !1;
    }
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
      if (e.visibilityState === "hidden") {
        this.isOwner && this.options.onVisibilityHidden();
        return;
      }
      this.evaluateOwnership("visible", { allowClaimIfAvailable: !0 });
    };
    e.addEventListener("visibilitychange", n), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", n));
    const s = () => {
      this.isOwner && this.options.onPageHide(), this.release("pagehide");
    };
    t.addEventListener("pagehide", s), this.cleanupFns.push(() => t.removeEventListener("pagehide", s));
    const o = () => {
      this.isOwner && this.options.onBeforeUnload(), this.release("beforeunload");
    };
    t.addEventListener("beforeunload", o), this.cleanupFns.push(() => t.removeEventListener("beforeunload", o));
    const c = (r) => {
      !this.activeTabCoordinationAvailable || r.key !== this.options.storageKey || this.evaluateOwnership("storage", {
        allowClaimIfAvailable: e.visibilityState !== "hidden"
      });
    };
    t.addEventListener("storage", c), this.cleanupFns.push(() => t.removeEventListener("storage", c));
  }
  getTabId() {
    const e = this.win();
    return e ? (e._wizardTabId || (e._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`), e._wizardTabId) : "tab_missing_window";
  }
  isClaimOwnedByThisTab(e) {
    return String(e?.tabId || "").trim() === this.getTabId();
  }
  buildClaim(e = null) {
    const t = this.now();
    return {
      tabId: this.getTabId(),
      claimedAt: this.isClaimOwnedByThisTab(e) && String(e?.claimedAt || t).trim() || t,
      lastSeenAt: t
    };
  }
  startHeartbeat() {
    const e = this.win();
    this.stopHeartbeat(), !(!e || !this.isOwner || !this.activeTabCoordinationAvailable) && (this.heartbeatTimer = e.setInterval(() => {
      this.refreshClaim("heartbeat");
    }, this.options.heartbeatMs));
  }
  stopHeartbeat() {
    const e = this.win();
    !e || this.heartbeatTimer === null || (e.clearInterval(this.heartbeatTimer), this.heartbeatTimer = null);
  }
  updateOwnershipState(e, t = "", n = null) {
    this.isOwner = !!e, this.currentClaim = this.activeTabCoordinationAvailable && n || null, this.lastBlockedReason = this.isOwner ? "" : String(t || "passive_tab").trim() || "passive_tab", this.isOwner && this.activeTabCoordinationAvailable ? this.startHeartbeat() : this.stopHeartbeat(), this.options.onOwnershipChange({
      isOwner: this.isOwner,
      reason: this.lastBlockedReason,
      claim: this.currentClaim,
      coordinationAvailable: this.activeTabCoordinationAvailable
    });
  }
  enterDegradedMode(e = "storage_unavailable") {
    return this.activeTabCoordinationAvailable ? (this.activeTabCoordinationAvailable = !1, this.options.telemetry("wizard_active_tab_coordination_degraded", { reason: e }), this.updateOwnershipState(!0, e, null), !0) : (this.updateOwnershipState(!0, e, null), !0);
  }
  refreshClaim(e = "heartbeat") {
    if (!this.activeTabCoordinationAvailable) return !0;
    if (!this.isOwner) return !1;
    const t = this.readActiveTabClaim();
    if (t && !this.isClaimOwnedByThisTab(t) && this.isClaimFresh(t))
      return this.updateOwnershipState(!1, "passive_tab", t), !1;
    const n = this.buildClaim(t);
    return this.writeActiveTabClaim(n) ? (this.currentClaim = n, e !== "heartbeat" && (this.broadcastMessage({
      type: "active_tab_claimed",
      tabId: n.tabId,
      claimedAt: n.claimedAt,
      lastSeenAt: n.lastSeenAt,
      reason: e
    }), this.options.onOwnershipChange({
      isOwner: !0,
      reason: e,
      claim: n,
      coordinationAvailable: this.activeTabCoordinationAvailable
    })), !0) : this.enterDegradedMode("storage_unavailable");
  }
  claim(e = "claim") {
    if (!this.activeTabCoordinationAvailable)
      return this.updateOwnershipState(!0, e, null), !0;
    const t = this.readActiveTabClaim();
    if (t && !this.isClaimOwnedByThisTab(t) && this.isClaimFresh(t) && e !== "take_control")
      return this.updateOwnershipState(!1, "passive_tab", t), !1;
    const s = this.buildClaim(e === "take_control" ? null : t);
    return this.writeActiveTabClaim(s) ? (this.updateOwnershipState(!0, e, s), this.broadcastMessage({
      type: "active_tab_claimed",
      tabId: s.tabId,
      claimedAt: s.claimedAt,
      lastSeenAt: s.lastSeenAt,
      reason: e
    }), !0) : this.enterDegradedMode("storage_unavailable");
  }
  release(e = "release") {
    if (!this.activeTabCoordinationAvailable) return;
    const t = this.readActiveTabClaim();
    this.isClaimOwnedByThisTab(t) && (this.clearActiveTabClaim(this.getTabId()), this.broadcastMessage({
      type: "active_tab_released",
      tabId: this.getTabId(),
      reason: e
    })), this.updateOwnershipState(!1, e, null);
  }
  evaluateOwnership(e = "check", t = {}) {
    if (!this.activeTabCoordinationAvailable)
      return this.updateOwnershipState(!0, e, null), !0;
    const n = t.allowClaimIfAvailable === !0, s = this.doc(), o = !s || s.visibilityState !== "hidden", c = this.readActiveTabClaim();
    return !c || !this.isClaimFresh(c) ? n && o ? this.claim(e) : (this.updateOwnershipState(!1, "no_active_tab", null), !1) : this.isClaimOwnedByThisTab(c) ? (this.updateOwnershipState(!0, e, c), this.refreshClaim("heartbeat"), !0) : (this.updateOwnershipState(!1, "passive_tab", c), !1);
  }
  ensureOwnership(e = "sync", t = {}) {
    return this.activeTabCoordinationAvailable ? this.evaluateOwnership(e, {
      allowClaimIfAvailable: t.allowClaimIfAvailable !== !1
    }) : !0;
  }
  takeControl() {
    return this.activeTabCoordinationAvailable ? this.claim("take_control") : (this.updateOwnershipState(!0, "take_control", null), !0);
  }
  broadcastStateUpdate(e) {
    this.broadcastMessage({
      type: "state_updated",
      tabId: this.getTabId(),
      state: e
    });
  }
  broadcastSyncCompleted(e, t) {
    this.broadcastMessage({
      type: "sync_completed",
      tabId: this.getTabId(),
      draftId: e,
      revision: t
    });
  }
  broadcastMessage(e) {
    this.channel?.postMessage(e);
  }
  handleChannelMessage(e) {
    switch (e?.type) {
      case "active_tab_claimed":
        e.tabId !== this.getTabId() && this.evaluateOwnership("remote_claim", { allowClaimIfAvailable: !1 });
        break;
      case "active_tab_released":
        if (e.tabId !== this.getTabId()) {
          const t = this.doc();
          this.evaluateOwnership("remote_release", {
            allowClaimIfAvailable: !t || t.visibilityState !== "hidden"
          });
        }
        break;
      case "state_updated":
        e.tabId !== this.getTabId() && e.state && typeof e.state == "object" && this.options.onRemoteState(e.state);
        break;
      case "sync_completed":
        e.tabId !== this.getTabId() && e.draftId && e.revision && this.options.onRemoteSync(String(e.draftId), Number(e.revision));
        break;
    }
  }
}
const bi = "[esign-send]";
function Pt(i) {
  const e = String(i ?? "").trim();
  return e === "" ? null : e;
}
function Yn(i) {
  const e = Number(i);
  return Number.isFinite(e) ? e : null;
}
function ks() {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function Ee(i = {}) {
  const {
    state: e,
    storageKey: t,
    ownership: n,
    sendAttemptId: s,
    extra: o = {}
  } = i;
  return {
    wizardId: Pt(e?.wizardId),
    serverDraftId: Pt(e?.serverDraftId),
    serverRevision: Yn(e?.serverRevision),
    currentStep: Yn(e?.currentStep),
    syncPending: e?.syncPending === !0,
    storageKey: Pt(t),
    activeTabOwner: typeof n?.isOwner == "boolean" ? n.isOwner : null,
    activeTabClaimTabId: Pt(n?.claim?.tabId),
    activeTabClaimedAt: Pt(n?.claim?.claimedAt),
    activeTabLastSeenAt: Pt(n?.claim?.lastSeenAt),
    activeTabBlockedReason: Pt(n?.blockedReason),
    sendAttemptId: Pt(s),
    ...o
  };
}
function it(i, e = {}) {
  console.info(bi, i, e);
}
function mt(i, e = {}) {
  console.warn(bi, i, e);
}
class Ds {
  constructor(e) {
    this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.options = e, this.stateManager = e.stateManager, this.syncService = e.syncService, this.activeTabController = e.activeTabController, this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
  }
  start() {
    this.activeTabController.start();
  }
  destroy() {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null), this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.activeTabController.stop();
  }
  get isOwner() {
    return this.activeTabController.isOwner;
  }
  get currentClaim() {
    return this.activeTabController.currentClaim;
  }
  get lastBlockedReason() {
    return this.activeTabController.lastBlockedReason;
  }
  ensureActiveTabOwnership(e = "sync", t = {}) {
    return this.activeTabController.ensureOwnership(e, t);
  }
  takeControl() {
    return this.activeTabController.takeControl();
  }
  broadcastStateUpdate() {
    this.activeTabController.broadcastStateUpdate(this.stateManager.getState());
  }
  broadcastSyncCompleted(e, t) {
    this.activeTabController.broadcastSyncCompleted(e, t);
  }
  scheduleSync() {
    if (!this.ensureActiveTabOwnership("schedule_sync", { allowClaimIfAvailable: !1 })) {
      mt("sync_schedule_blocked", Ee({
        state: this.stateManager.getState(),
        storageKey: this.options.storageKey,
        ownership: {
          isOwner: this.isOwner,
          claim: this.currentClaim,
          blockedReason: this.lastBlockedReason || "passive_tab"
        },
        sendAttemptId: null,
        extra: {
          reason: "passive_tab"
        }
      })), this.options.statusUpdater("paused");
      return;
    }
    this.debounceTimer && clearTimeout(this.debounceTimer), this.options.statusUpdater("pending"), this.debounceTimer = setTimeout(() => {
      this.performSync();
    }, this.options.syncDebounceMs);
  }
  async forceSync(e = {}) {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
    const t = e.keepalive === !0, n = this.stateManager.getState();
    if (!this.ensureActiveTabOwnership(t ? "keepalive_sync" : "force_sync", { allowClaimIfAvailable: !0 }))
      return mt("sync_force_blocked", Ee({
        state: n,
        storageKey: this.options.storageKey,
        ownership: {
          isOwner: this.isOwner,
          claim: this.currentClaim,
          blockedReason: this.lastBlockedReason || "passive_tab"
        },
        sendAttemptId: null,
        extra: {
          keepalive: t,
          reason: "passive_tab"
        }
      })), { blocked: !0, reason: "passive_tab" };
    if (it("sync_force_start", Ee({
      state: n,
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: this.isOwner,
        claim: this.currentClaim,
        blockedReason: this.lastBlockedReason
      },
      sendAttemptId: null,
      extra: {
        keepalive: t,
        mode: n.serverDraftId ? "update" : "create",
        targetDraftId: String(n.serverDraftId || "").trim() || null,
        expectedRevision: Number(n.serverRevision || 0)
      }
    })), !t)
      return this.performSync();
    if (n.syncPending && n.serverDraftId) {
      const s = JSON.stringify({
        expected_revision: n.serverRevision,
        wizard_state: n,
        title: n.details.title || "Untitled Agreement",
        current_step: n.currentStep,
        document_id: n.document.id || null,
        updated_by_user_id: this.options.currentUserID
      });
      try {
        it("sync_keepalive_request", Ee({
          state: n,
          storageKey: this.options.storageKey,
          ownership: {
            isOwner: this.isOwner,
            claim: this.currentClaim,
            blockedReason: this.lastBlockedReason
          },
          sendAttemptId: null,
          extra: {
            mode: "update",
            targetDraftId: String(n.serverDraftId || "").trim() || null,
            expectedRevision: Number(n.serverRevision || 0)
          }
        }));
        const o = await this.fetchImpl(this.options.draftEndpointWithUserID(`${this.options.draftsEndpoint}/${n.serverDraftId}`), {
          method: "PUT",
          credentials: "same-origin",
          headers: this.options.draftRequestHeaders(),
          body: s,
          keepalive: !0
        });
        if (o.status === 409) {
          const p = await o.json().catch(() => ({})), y = Number(p?.error?.details?.current_revision || 0);
          return this.options.statusUpdater("conflict"), this.options.showConflictDialog(y > 0 ? y : n.serverRevision), mt("sync_keepalive_conflict", Ee({
            state: n,
            storageKey: this.options.storageKey,
            ownership: {
              isOwner: this.isOwner,
              claim: this.currentClaim,
              blockedReason: this.lastBlockedReason
            },
            sendAttemptId: null,
            extra: {
              mode: "update",
              targetDraftId: String(n.serverDraftId || "").trim() || null,
              currentRevision: y
            }
          })), { conflict: !0 };
        }
        if (!o.ok)
          throw new Error(`HTTP ${o.status}`);
        const c = await o.json().catch(() => ({})), r = String(c?.id || c?.draft_id || n.serverDraftId || "").trim(), f = Number(c?.revision || 0);
        if (r && Number.isFinite(f) && f > 0)
          return this.stateManager.markSynced(r, f), this.options.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(r, f), it("sync_keepalive_success", Ee({
            state: this.stateManager.getState(),
            storageKey: this.options.storageKey,
            ownership: {
              isOwner: this.isOwner,
              claim: this.currentClaim,
              blockedReason: this.lastBlockedReason
            },
            sendAttemptId: null,
            extra: {
              mode: "update",
              targetDraftId: r,
              returnedRevision: f
            }
          })), { success: !0, draftId: r, revision: f };
      } catch {
        mt("sync_keepalive_fallback", Ee({
          state: n,
          storageKey: this.options.storageKey,
          ownership: {
            isOwner: this.isOwner,
            claim: this.currentClaim,
            blockedReason: this.lastBlockedReason
          },
          sendAttemptId: null,
          extra: {
            mode: "update",
            targetDraftId: String(n.serverDraftId || "").trim() || null,
            reason: "keepalive_failed_fallback"
          }
        }));
      }
    }
    return this.performSync();
  }
  async performSync() {
    if (this.isSyncing) return { blocked: !0, reason: "sync_in_progress" };
    if (!this.ensureActiveTabOwnership("perform_sync", { allowClaimIfAvailable: !0 }))
      return mt("sync_perform_blocked", Ee({
        state: this.stateManager.getState(),
        storageKey: this.options.storageKey,
        ownership: {
          isOwner: this.isOwner,
          claim: this.currentClaim,
          blockedReason: this.lastBlockedReason || "passive_tab"
        },
        sendAttemptId: null,
        extra: {
          reason: "passive_tab"
        }
      })), { blocked: !0, reason: "passive_tab" };
    const e = this.stateManager.getState();
    if (!e.syncPending)
      return this.options.statusUpdater("saved"), it("sync_perform_skipped", Ee({
        state: e,
        storageKey: this.options.storageKey,
        ownership: {
          isOwner: this.isOwner,
          claim: this.currentClaim,
          blockedReason: this.lastBlockedReason
        },
        sendAttemptId: null,
        extra: {
          reason: "not_pending"
        }
      })), { skipped: !0, reason: "not_pending" };
    this.isSyncing = !0, this.options.statusUpdater("saving"), it("sync_perform_start", Ee({
      state: e,
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: this.isOwner,
        claim: this.currentClaim,
        blockedReason: this.lastBlockedReason
      },
      sendAttemptId: null,
      extra: {
        mode: e.serverDraftId ? "update" : "create",
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        expectedRevision: Number(e.serverRevision || 0)
      }
    }));
    const t = await this.syncService.sync();
    return this.isSyncing = !1, t.success ? (t.result?.id && t.result?.revision && this.broadcastSyncCompleted(t.result.id, t.result.revision), this.options.statusUpdater("saved"), this.retryCount = 0, it("sync_perform_success", Ee({
      state: this.stateManager.getState(),
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: this.isOwner,
        claim: this.currentClaim,
        blockedReason: this.lastBlockedReason
      },
      sendAttemptId: null,
      extra: {
        mode: e.serverDraftId ? "update" : "create",
        targetDraftId: String(t.result?.id || e.serverDraftId || "").trim() || null,
        returnedRevision: Number(t.result?.revision || 0)
      }
    })), { success: !0, draftId: t.result?.id || null, revision: t.result?.revision || 0 }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), mt("sync_perform_conflict", Ee({
      state: e,
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: this.isOwner,
        claim: this.currentClaim,
        blockedReason: this.lastBlockedReason
      },
      sendAttemptId: null,
      extra: {
        mode: e.serverDraftId ? "update" : "create",
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        currentRevision: Number(t.currentRevision || 0)
      }
    })), { conflict: !0, currentRevision: t.currentRevision }) : (this.options.statusUpdater("error"), this.scheduleRetry(), mt("sync_perform_error", Ee({
      state: e,
      storageKey: this.options.storageKey,
      ownership: {
        isOwner: this.isOwner,
        claim: this.currentClaim,
        blockedReason: this.lastBlockedReason
      },
      sendAttemptId: null,
      extra: {
        mode: e.serverDraftId ? "update" : "create",
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        reason: t.error || "sync_failed"
      }
    })), { error: !0, reason: t.error || "sync_failed" });
  }
  manualRetry() {
    return this.ensureActiveTabOwnership("manual_retry", { allowClaimIfAvailable: !0 }) ? (this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync()) : { blocked: !0, reason: "passive_tab" };
  }
  scheduleRetry() {
    if (!this.isOwner || this.retryCount >= this.options.syncRetryDelays.length)
      return;
    const e = this.options.syncRetryDelays[this.retryCount];
    this.retryCount += 1, this.retryTimer = setTimeout(() => {
      this.performSync();
    }, e);
  }
}
function Ms() {
  return function(e, t = {}) {
    const n = String(e || "").trim();
    if (!n || typeof window > "u") return;
    const s = window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {};
    s[n] = Number(s[n] || 0) + 1, window.dispatchEvent(new CustomEvent("esign:wizard-telemetry", {
      detail: {
        event: n,
        count: s[n],
        fields: t,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
  };
}
function xt(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Yt(i, e, t = "") {
  const n = i.querySelector(e);
  return (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && n.value || t;
}
function Rs(i, e, t = !1) {
  const n = i.querySelector(e);
  return n instanceof HTMLInputElement ? n.checked : t;
}
function Xt(i, e) {
  i instanceof HTMLButtonElement && (i.disabled = e);
}
function $s(i) {
  const {
    documentIdInput: e,
    selectedDocumentTitle: t,
    participantsContainer: n,
    fieldDefinitionsContainer: s,
    submitBtn: o,
    syncOrchestrator: c,
    escapeHtml: r,
    getSignerParticipants: f,
    getCurrentDocumentPageCount: p,
    collectFieldRulesForState: y,
    expandRulesForPreview: S,
    findSignersMissingRequiredSignatureField: M,
    goToStep: L
  } = i;
  function m() {
    const E = xt("send-readiness-loading"), w = xt("send-readiness-results"), C = xt("send-validation-status"), R = xt("send-validation-issues"), U = xt("send-issues-list"), _ = xt("send-confirmation"), $ = xt("review-agreement-title"), te = xt("review-document-title"), N = xt("review-participant-count"), Z = xt("review-stage-count"), me = xt("review-participants-list"), le = xt("review-fields-summary"), ue = document.getElementById("title");
    if (!E || !w || !C || !R || !U || !_ || !$ || !te || !N || !Z || !me || !le || !(ue instanceof HTMLInputElement))
      return;
    const Ne = ue.value || "Untitled", Ze = t?.textContent || "No document", lt = n.querySelectorAll(".participant-entry"), rt = s.querySelectorAll(".field-definition-entry"), at = S(y(), p()), et = f(), We = /* @__PURE__ */ new Set();
    lt.forEach((ae) => {
      const W = ae.querySelector(".signing-stage-input"), de = ae.querySelector('select[name*=".role"]');
      de instanceof HTMLSelectElement && de.value === "signer" && W instanceof HTMLInputElement && W.value && We.add(Number.parseInt(W.value, 10));
    }), $.textContent = Ne, te.textContent = Ze, N.textContent = `${lt.length} (${et.length} signers)`, Z.textContent = String(We.size > 0 ? We.size : 1), me.innerHTML = "", lt.forEach((ae) => {
      const W = Yt(ae, 'input[name*=".name"]'), de = Yt(ae, 'input[name*=".email"]'), we = Yt(ae, 'select[name*=".role"]', "signer"), Qe = Yt(ae, ".signing-stage-input"), ze = Rs(ae, ".notify-input", !0), ot = document.createElement("div");
      ot.className = "flex items-center justify-between text-sm", ot.innerHTML = `
        <div>
          <span class="font-medium">${r(W || de)}</span>
          <span class="text-gray-500 ml-2">${r(de)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${we === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${we === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${ze ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${ze ? "Notify" : "No Notify"}
          </span>
          ${we === "signer" && Qe ? `<span class="text-xs text-gray-500">Stage ${Qe}</span>` : ""}
        </div>
      `, me.appendChild(ot);
    });
    const Le = rt.length + at.length;
    le.textContent = `${Le} field${Le !== 1 ? "s" : ""} defined (${rt.length} manual, ${at.length} generated)`;
    const pe = [];
    e?.value || pe.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), et.length === 0 && pe.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), M().forEach((ae) => {
      pe.push({
        severity: "error",
        message: `${ae.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Ke = Array.from(We).sort((ae, W) => ae - W);
    for (let ae = 0; ae < Ke.length; ae++)
      if (Ke[ae] !== ae + 1) {
        pe.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Re = pe.some((ae) => ae.severity === "error"), nt = pe.some((ae) => ae.severity === "warning");
    Re ? (C.className = "p-4 rounded-lg bg-red-50 border border-red-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, _.classList.add("hidden"), Xt(o, !0)) : nt ? (C.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, _.classList.remove("hidden"), Xt(o, !1)) : (C.className = "p-4 rounded-lg bg-green-50 border border-green-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, _.classList.remove("hidden"), Xt(o, !1)), c.isOwner || (C.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, _.classList.add("hidden"), Xt(o, !0)), pe.length > 0 ? (R.classList.remove("hidden"), U.innerHTML = "", pe.forEach((ae) => {
      const W = document.createElement("li");
      W.className = `p-3 rounded-lg flex items-center justify-between ${ae.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, W.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${ae.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${ae.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${r(ae.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${ae.step}">
            ${r(ae.action)}
          </button>
        `, U.appendChild(W);
    }), U.querySelectorAll("[data-go-to-step]").forEach((ae) => {
      ae.addEventListener("click", () => {
        const W = Number(ae.getAttribute("data-go-to-step"));
        Number.isFinite(W) && L(W);
      });
    })) : R.classList.add("hidden"), E.classList.add("hidden"), w.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: m
  };
}
function Xn(i, e = 0) {
  const t = Number.parseInt(String(i || "").trim(), 10);
  return Number.isFinite(t) ? t : e;
}
function Fs(i) {
  const {
    totalWizardSteps: e,
    wizardStep: t,
    nextStepLabels: n,
    submitBtn: s,
    syncOrchestrator: o,
    previewCard: c,
    updateActiveTabOwnershipUI: r,
    validateStep: f,
    onPlacementStep: p,
    onReviewStep: y,
    onStepChanged: S,
    initialStep: M = 1
  } = i;
  let L = M;
  const m = Array.from(document.querySelectorAll(".wizard-step-btn")), E = Array.from(document.querySelectorAll(".wizard-step")), w = Array.from(document.querySelectorAll(".wizard-connector")), C = document.getElementById("wizard-prev-btn"), R = document.getElementById("wizard-next-btn"), U = document.getElementById("wizard-save-btn");
  function _() {
    if (m.forEach((N, Z) => {
      const me = Z + 1, le = N.querySelector(".wizard-step-number");
      le instanceof HTMLElement && (me < L ? (N.classList.remove("text-gray-500", "text-blue-600"), N.classList.add("text-green-600"), le.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), le.classList.add("bg-green-600", "text-white"), N.removeAttribute("aria-current")) : me === L ? (N.classList.remove("text-gray-500", "text-green-600"), N.classList.add("text-blue-600"), le.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), le.classList.add("bg-blue-600", "text-white"), N.setAttribute("aria-current", "step")) : (N.classList.remove("text-blue-600", "text-green-600"), N.classList.add("text-gray-500"), le.classList.remove("bg-blue-600", "text-white", "bg-green-600"), le.classList.add("bg-gray-300", "text-gray-600"), N.removeAttribute("aria-current")));
    }), w.forEach((N, Z) => {
      Z < L - 1 ? (N.classList.remove("bg-gray-300"), N.classList.add("bg-green-600")) : (N.classList.remove("bg-green-600"), N.classList.add("bg-gray-300"));
    }), E.forEach((N) => {
      Xn(N.dataset.step) === L ? N.classList.remove("hidden") : N.classList.add("hidden");
    }), C?.classList.toggle("hidden", L === 1), R?.classList.toggle("hidden", L === e), U?.classList.toggle("hidden", L !== e), s.classList.toggle("hidden", L !== e), r({
      isOwner: o.isOwner,
      reason: o.lastBlockedReason,
      claim: o.currentClaim
    }), L < e) {
      const N = n[L] || "Next";
      R && (R.innerHTML = `
        ${N}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    L === t.PLACEMENT ? p?.() : L === t.REVIEW && y?.(), c.updateVisibility(L);
  }
  function $(N) {
    if (!(N < t.DOCUMENT || N > e)) {
      if (N > L) {
        for (let Z = L; Z < N; Z++)
          if (!f(Z)) return;
      }
      L = N, _(), S?.(N), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function te() {
    m.forEach((N) => {
      N.addEventListener("click", () => {
        const Z = Xn(N.dataset.step);
        $(Z);
      });
    }), C?.addEventListener("click", () => $(L - 1)), R?.addEventListener("click", () => $(L + 1)), U?.addEventListener("click", () => {
      const N = document.getElementById("agreement-form");
      if (!(N instanceof HTMLFormElement)) return;
      const Z = document.createElement("input");
      Z.type = "hidden", Z.name = "save_as_draft", Z.value = "1", N.appendChild(Z), N.submit();
    });
  }
  return {
    bindEvents: te,
    getCurrentStep() {
      return L;
    },
    setCurrentStep(N) {
      L = N;
    },
    goToStep: $,
    updateWizardUI: _
  };
}
function Qn(i) {
  return i.querySelector('select[name*=".role"]');
}
function Bs(i) {
  return i.querySelector(".field-participant-select");
}
function yn(i) {
  return typeof i == "object" && i !== null;
}
function Os(i) {
  const {
    config: e,
    form: t,
    submitBtn: n,
    documentIdInput: s,
    documentSearch: o,
    participantsContainer: c,
    addParticipantBtn: r,
    fieldDefinitionsContainer: f,
    fieldRulesContainer: p,
    documentPageCountInput: y,
    fieldPlacementsJSONInput: S,
    fieldRulesJSONInput: M,
    currentUserID: L,
    storageKey: m,
    draftsEndpoint: E,
    draftEndpointWithUserID: w,
    draftRequestHeaders: C,
    syncService: R,
    syncOrchestrator: U,
    stateManager: _,
    submitMode: $,
    totalWizardSteps: te,
    wizardStep: N,
    getCurrentStep: Z,
    getPlacementState: me,
    getCurrentDocumentPageCount: le,
    ensureSelectedDocumentCompatibility: ue,
    collectFieldRulesForState: Ne,
    collectFieldRulesForForm: Ze,
    expandRulesForPreview: lt,
    findSignersMissingRequiredSignatureField: rt,
    missingSignatureFieldMessage: at,
    getSignerParticipants: et,
    buildCanonicalAgreementPayload: We,
    announceError: Le,
    emitWizardTelemetry: pe,
    parseAPIError: Me,
    goToStep: Ke,
    surfaceSyncOutcome: Re,
    activeTabOwnershipRequiredCode: nt = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: ae,
    addFieldBtn: W
  } = i;
  let de = null;
  function we() {
    return ae?.() || {
      isOwner: typeof U.isOwner == "boolean" ? U.isOwner : void 0,
      claim: U.currentClaim || null,
      blockedReason: String(U.lastBlockedReason || "").trim() || void 0
    };
  }
  function Qe(fe, Ie = !1) {
    n.setAttribute("aria-busy", Ie ? "true" : "false"), n.innerHTML = Ie ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${fe}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${fe}
        `;
  }
  async function ze() {
    it("persist_latest_wizard_state_start", Ee({
      state: _.getState(),
      storageKey: m,
      ownership: we(),
      sendAttemptId: de
    })), _.updateState(_.collectFormState());
    const fe = await U.forceSync();
    if (fe?.blocked && fe.reason === "passive_tab")
      throw mt("persist_latest_wizard_state_blocked", Ee({
        state: _.getState(),
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          reason: fe.reason
        }
      })), {
        code: nt,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const Ie = _.getState();
    if (Ie?.syncPending)
      throw mt("persist_latest_wizard_state_unsynced", Ee({
        state: Ie,
        storageKey: m,
        ownership: we(),
        sendAttemptId: de
      })), new Error("Unable to sync latest draft changes");
    return it("persist_latest_wizard_state_complete", Ee({
      state: Ie,
      storageKey: m,
      ownership: we(),
      sendAttemptId: de
    })), Ie;
  }
  async function ot() {
    it("ensure_draft_ready_for_send_start", Ee({
      state: _.getState(),
      storageKey: m,
      ownership: we(),
      sendAttemptId: de
    }));
    const fe = await ze(), Ie = String(fe?.serverDraftId || "").trim();
    if (!Ie) {
      mt("ensure_draft_ready_for_send_missing_draft", Ee({
        state: fe,
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          action: "create_draft"
        }
      }));
      const T = await R.create(fe), P = String(T.id || "").trim(), B = Number(T.revision || 0);
      return P && B > 0 && _.markSynced(P, B), it("ensure_draft_ready_for_send_created", Ee({
        state: _.getState(),
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          loadedDraftId: P,
          loadedRevision: B
        }
      })), {
        draftID: P,
        revision: B
      };
    }
    try {
      it("ensure_draft_ready_for_send_loading", Ee({
        state: fe,
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          targetDraftId: Ie
        }
      }));
      const T = await R.load(Ie), P = String(T?.id || Ie).trim(), B = Number(T?.revision || fe?.serverRevision || 0);
      return P && B > 0 && _.markSynced(P, B), it("ensure_draft_ready_for_send_loaded", Ee({
        state: _.getState(),
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          loadedDraftId: P,
          loadedRevision: B
        }
      })), {
        draftID: P,
        revision: B > 0 ? B : Number(fe?.serverRevision || 0)
      };
    } catch (T) {
      if (Number(yn(T) && T.status || 0) !== 404)
        throw mt("ensure_draft_ready_for_send_load_failed", Ee({
          state: fe,
          storageKey: m,
          ownership: we(),
          sendAttemptId: de,
          extra: {
            targetDraftId: Ie,
            status: Number(yn(T) && T.status || 0)
          }
        })), T;
      mt("ensure_draft_ready_for_send_stale_recreate", Ee({
        state: fe,
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          targetDraftId: Ie,
          status: 404
        }
      }));
      const P = await R.create({
        ..._.getState(),
        ..._.collectFormState()
      }), B = String(P?.id || "").trim(), Y = Number(P?.revision || 0);
      return _.markSynced(B, Y), pe("wizard_send_stale_draft_recovered", {
        stale_draft_id: Ie,
        recovered_draft_id: B
      }), it("ensure_draft_ready_for_send_recreated", Ee({
        state: _.getState(),
        storageKey: m,
        ownership: we(),
        sendAttemptId: de,
        extra: {
          loadedDraftId: B,
          loadedRevision: Y,
          staleDraftId: Ie
        }
      })), { draftID: B, revision: Y };
    }
  }
  async function gt() {
    const fe = _.getState();
    _.setState({
      ...fe,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await U.forceSync();
  }
  function dt() {
    t.addEventListener("submit", function(fe) {
      if (We(), !s.value) {
        fe.preventDefault(), Le("Please select a document"), o.focus();
        return;
      }
      if (!ue()) {
        fe.preventDefault();
        return;
      }
      const Ie = c.querySelectorAll(".participant-entry");
      if (Ie.length === 0) {
        fe.preventDefault(), Le("Please add at least one participant"), r.focus();
        return;
      }
      let T = !1;
      if (Ie.forEach((X) => {
        Qn(X)?.value === "signer" && (T = !0);
      }), !T) {
        fe.preventDefault(), Le("At least one signer is required");
        const X = Ie[0] ? Qn(Ie[0]) : null;
        X && X.focus();
        return;
      }
      const P = f.querySelectorAll(".field-definition-entry"), B = rt();
      if (B.length > 0) {
        fe.preventDefault(), Le(at(B)), Ke(N.FIELDS), W.focus();
        return;
      }
      let Y = !1;
      if (P.forEach((X) => {
        Bs(X)?.value || (Y = !0);
      }), Y) {
        fe.preventDefault(), Le("Please assign all fields to a signer");
        const X = f.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        X && X.focus();
        return;
      }
      if (Ne().some((X) => !X.participantId)) {
        fe.preventDefault(), Le("Please assign all automation rules to a signer"), Array.from(p?.querySelectorAll(".field-rule-participant-select") || []).find((j) => !j.value)?.focus();
        return;
      }
      const ve = !!t.querySelector('input[name="save_as_draft"]'), re = Z() === te && !ve;
      if (re) {
        let X = t.querySelector('input[name="send_for_signature"]');
        X || (X = document.createElement("input"), X.type = "hidden", X.name = "send_for_signature", t.appendChild(X)), X.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if ($ === "json") {
        fe.preventDefault(), n.disabled = !0, Qe(re ? "Sending..." : "Saving...", !0), (async () => {
          try {
            We();
            const X = String(e.routes?.index || "").trim();
            if (!re) {
              if (await ze(), X) {
                window.location.href = X;
                return;
              }
              window.location.reload();
              return;
            }
            de = ks(), it("send_submit_start", Ee({
              state: _.getState(),
              storageKey: m,
              ownership: we(),
              sendAttemptId: de
            }));
            const j = await ot(), ee = String(j?.draftID || "").trim(), Se = Number(j?.revision || 0);
            if (!ee || Se <= 0)
              throw new Error("Draft session not available. Please try again.");
            if (!U.ensureActiveTabOwnership("send", { allowClaimIfAvailable: !0 }))
              throw mt("send_submit_blocked", Ee({
                state: _.getState(),
                storageKey: m,
                ownership: we(),
                sendAttemptId: de,
                extra: {
                  reason: "active_tab_required"
                }
              })), {
                code: nt,
                message: "This agreement is active in another tab. Take control in this tab before sending."
              };
            it("send_request_start", Ee({
              state: _.getState(),
              storageKey: m,
              ownership: we(),
              sendAttemptId: de,
              extra: {
                targetDraftId: ee,
                expectedRevision: Se
              }
            }));
            const ye = await fetch(
              w(`${E}/${encodeURIComponent(ee)}/send`),
              {
                method: "POST",
                credentials: "same-origin",
                headers: C(),
                body: JSON.stringify({
                  expected_revision: Se,
                  created_by_user_id: L
                })
              }
            );
            if (!ye.ok) {
              const v = await Me(ye, "Failed to send agreement");
              throw String(v?.code || "").trim().toUpperCase() === "DRAFT_SEND_NOT_FOUND" ? (pe("wizard_send_not_found", {
                draft_id: ee,
                status: Number(v?.status || 0)
              }), await gt().catch(() => {
              }), {
                ...v,
                code: "DRAFT_SESSION_STALE"
              }) : v;
            }
            const he = await ye.json(), Ce = String(he?.agreement_id || he?.id || he?.data?.id || "").trim();
            if (it("send_request_success", Ee({
              state: _.getState(),
              storageKey: m,
              ownership: we(),
              sendAttemptId: de,
              extra: {
                targetDraftId: ee,
                expectedRevision: Se,
                agreementId: Ce
              }
            })), _.clear(), U.broadcastStateUpdate(), de = null, Ce && X) {
              window.location.href = `${X}/${encodeURIComponent(Ce)}`;
              return;
            }
            if (X) {
              window.location.href = X;
              return;
            }
            window.location.reload();
          } catch (X) {
            const j = yn(X) ? X : {}, ee = String(j.message || "Failed to process agreement").trim(), Se = String(j.code || "").trim(), ye = Number(j.status || 0);
            mt("send_request_failed", Ee({
              state: _.getState(),
              storageKey: m,
              ownership: we(),
              sendAttemptId: de,
              extra: {
                code: Se || null,
                status: ye,
                message: ee
              }
            })), Le(ee, Se, ye), n.disabled = !1, Qe("Send for Signature", !1), de = null;
          }
        })();
        return;
      }
      n.disabled = !0, Qe(re ? "Sending..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: dt,
    ensureDraftReadyForSend: ot,
    persistLatestWizardState: ze,
    resyncAfterSendNotFound: gt
  };
}
const Zn = 150, ei = 32;
function Fe(i) {
  return i == null ? "" : String(i).trim();
}
function wi(i) {
  if (typeof i == "boolean") return i;
  const e = Fe(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Ns(i) {
  return Fe(i).toLowerCase();
}
function Xe(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(Fe(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Qt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(Fe(i));
  return Number.isFinite(t) ? t : e;
}
function tn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function Wt(i, e) {
  const t = Xe(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function Vt(i, e, t = 1) {
  const n = Xe(t, 1), s = Xe(i, n);
  return e > 0 ? tn(s, 1, e) : s > 0 ? s : n;
}
function Us(i, e, t) {
  const n = Xe(t, 1);
  let s = Wt(i, n), o = Wt(e, n);
  return s <= 0 && (s = 1), o <= 0 && (o = n), o < s ? { start: o, end: s } : { start: s, end: o };
}
function cn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => Fe(n)) : Fe(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = Xe(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function nn(i, e) {
  const t = Xe(e, 1), n = Fe(i.participantId ?? i.participant_id), s = cn(i.excludePages ?? i.exclude_pages), o = i.required, c = typeof o == "boolean" ? o : !["0", "false", "off", "no"].includes(Fe(o).toLowerCase());
  return {
    id: Fe(i.id),
    type: Ns(i.type),
    participantId: n,
    participantTempId: Fe(i.participantTempId) || n,
    fromPage: Wt(i.fromPage ?? i.from_page, t),
    toPage: Wt(i.toPage ?? i.to_page, t),
    page: Wt(i.page, t),
    excludeLastPage: wi(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: c
  };
}
function Hs(i, e) {
  const t = Fe(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function zs(i, e) {
  const t = Xe(e, 1), n = [];
  return i.forEach((s, o) => {
    const c = nn(s || {}, t);
    if (c.type === "") return;
    const r = Hs(c, o);
    if (c.type === "initials_each_page") {
      const f = Us(c.fromPage, c.toPage, t), p = /* @__PURE__ */ new Set();
      cn(c.excludePages).forEach((y) => {
        y <= t && p.add(y);
      }), c.excludeLastPage && p.add(t);
      for (let y = f.start; y <= f.end; y += 1)
        p.has(y) || n.push({
          id: `${r}-initials-${y}`,
          type: "initials",
          page: y,
          participantId: Fe(c.participantId),
          required: c.required !== !1,
          ruleId: r
          // Track rule ID for link group creation.
        });
      return;
    }
    if (c.type === "signature_once") {
      let f = c.page > 0 ? c.page : c.toPage > 0 ? c.toPage : t;
      f <= 0 && (f = 1), n.push({
        id: `${r}-signature-${f}`,
        type: "signature",
        page: f,
        participantId: Fe(c.participantId),
        required: c.required !== !1,
        ruleId: r
        // Track rule ID for link group creation.
      });
    }
  }), n.sort((s, o) => s.page !== o.page ? s.page - o.page : s.id.localeCompare(o.id)), n;
}
function js(i, e, t, n, s) {
  const o = Xe(t, 1);
  let c = i > 0 ? i : 1, r = e > 0 ? e : o;
  c = tn(c, 1, o), r = tn(r, 1, o), r < c && ([c, r] = [r, c]);
  const f = /* @__PURE__ */ new Set();
  s.forEach((y) => {
    const S = Xe(y, 0);
    S > 0 && f.add(tn(S, 1, o));
  }), n && f.add(o);
  const p = [];
  for (let y = c; y <= r; y += 1)
    f.has(y) || p.push(y);
  return {
    pages: p,
    rangeStart: c,
    rangeEnd: r,
    excludedPages: Array.from(f).sort((y, S) => y - S),
    isEmpty: p.length === 0
  };
}
function qs(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const o = e[n], c = e[s - 1];
      o === c ? t.push(String(o)) : c === o + 1 ? t.push(`${o}, ${c}`) : t.push(`${o}-${c}`), n = s;
    }
  return `pages ${t.join(", ")}`;
}
function bn(i) {
  const e = i || {};
  return {
    id: Fe(e.id),
    title: Fe(e.title || e.name) || "Untitled",
    pageCount: Xe(e.page_count ?? e.pageCount, 0),
    compatibilityTier: Fe(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: Fe(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Si(i) {
  const e = Fe(i).toLowerCase();
  if (e === "") return vt.MANUAL;
  switch (e) {
    case vt.AUTO:
    case vt.MANUAL:
    case vt.AUTO_LINKED:
    case vt.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function Kt(i, e = 0) {
  const t = i || {}, n = Fe(t.id) || `fi_init_${e}`, s = Fe(t.definitionId || t.definition_id || t.field_definition_id) || n, o = Xe(t.page ?? t.page_number, 1), c = Qt(t.x ?? t.pos_x, 0), r = Qt(t.y ?? t.pos_y, 0), f = Qt(t.width, Zn), p = Qt(t.height, ei);
  return {
    id: n,
    definitionId: s,
    type: Fe(t.type) || "text",
    participantId: Fe(t.participantId || t.participant_id),
    participantName: Fe(t.participantName || t.participant_name) || "Unassigned",
    page: o > 0 ? o : 1,
    x: c >= 0 ? c : 0,
    y: r >= 0 ? r : 0,
    width: f > 0 ? f : Zn,
    height: p > 0 ? p : ei,
    placementSource: Si(t.placementSource || t.placement_source),
    linkGroupId: Fe(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: Fe(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: wi(t.isUnlinked ?? t.is_unlinked)
  };
}
function Vs(i, e = 0) {
  const t = Kt(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Si(t.placementSource),
    link_group_id: Fe(t.linkGroupId),
    linked_from_field_id: Fe(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Ve(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Tt(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Rt(i) {
  return typeof i == "object" && i !== null;
}
function Gs(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    currentUserID: n,
    documentsUploadURL: s,
    isEditMode: o,
    titleSource: c,
    normalizeTitleSource: r,
    stateManager: f,
    previewCard: p,
    parseAPIError: y,
    announceError: S,
    showToast: M,
    mapUserFacingError: L,
    renderFieldRulePreview: m
  } = i, E = Ve("document_id"), w = Ve("selected-document"), C = Ve("document-picker"), R = Ve("document-search"), U = Ve("document-list"), _ = Ve("change-document-btn"), $ = Ve("selected-document-title"), te = Ve("selected-document-info"), N = Ve("document_page_count"), Z = Ve("document-remediation-panel"), me = Ve("document-remediation-message"), le = Ve("document-remediation-status"), ue = Ve("document-remediation-trigger-btn"), Ne = Ve("document-remediation-dismiss-btn"), Ze = Ve("title"), lt = 300, rt = 5, at = 10, et = Ve("document-typeahead"), We = Ve("document-typeahead-dropdown"), Le = Ve("document-recent-section"), pe = Ve("document-recent-list"), Me = Ve("document-search-section"), Ke = Ve("document-search-list"), Re = Ve("document-empty-state"), nt = Ve("document-dropdown-loading"), ae = Ve("document-search-loading"), W = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let de = [], we = null, Qe = 0, ze = null;
  const ot = /* @__PURE__ */ new Set(), gt = /* @__PURE__ */ new Map();
  function dt(k) {
    return String(k || "").trim().toLowerCase();
  }
  function fe(k) {
    return String(k || "").trim().toLowerCase();
  }
  function Ie(k) {
    return dt(k) === "unsupported";
  }
  function T() {
    !o && Ze && Ze.value.trim() !== "" && !f.hasResumableState() && f.setTitleSource(c.SERVER_SEED, { syncPending: !1 });
  }
  function P(k) {
    const F = Xe(k, 0);
    N && (N.value = String(F));
  }
  function B() {
    const k = Xe(N?.value || "0", 0);
    if (k > 0) return k;
    const F = String(te?.textContent || "").match(/(\d+)\s+pages?/i);
    if (F) {
      const O = Xe(F[1], 0);
      if (O > 0) return O;
    }
    return 1;
  }
  function Y() {
    E && (E.value = ""), $ && ($.textContent = ""), te && (te.textContent = ""), P(0), f.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), p.setDocument(null, null, null);
  }
  function ie(k = "") {
    const F = "This document cannot be used because its PDF is incompatible with online signing.", O = fe(k);
    return O ? `${F} Reason: ${O}. Select another document or upload a remediated PDF.` : `${F} Select another document or upload a remediated PDF.`;
  }
  function ge() {
    we = null, le && (le.textContent = "", le.className = "mt-2 text-xs text-amber-800"), Z && Z.classList.add("hidden"), ue && (ue.disabled = !1, ue.textContent = "Remediate PDF");
  }
  function ve(k, F = "info") {
    if (!le) return;
    const O = String(k || "").trim();
    le.textContent = O;
    const Q = F === "error" ? "text-red-700" : F === "success" ? "text-green-700" : "text-amber-800";
    le.className = `mt-2 text-xs ${Q}`;
  }
  function re(k, F = "") {
    !k || !Z || !me || (we = {
      id: String(k.id || "").trim(),
      title: String(k.title || "").trim(),
      pageCount: Xe(k.pageCount, 0),
      compatibilityReason: fe(F || k.compatibilityReason || "")
    }, we.id && (me.textContent = ie(we.compatibilityReason), ve("Run remediation to make this document signable."), Z.classList.remove("hidden")));
  }
  function X(k) {
    const F = Ze;
    if (!F) return;
    const O = f.getState(), Q = F.value.trim(), se = r(
      O?.titleSource,
      Q === "" ? c.AUTOFILL : c.USER
    );
    if (Q && se === c.USER)
      return;
    const J = String(k || "").trim();
    J && (F.value = J, f.updateDetails({
      title: J,
      message: f.getState().details.message || ""
    }, { titleSource: c.AUTOFILL }));
  }
  function j(k, F, O) {
    if (!E || !$ || !te || !w || !C)
      return;
    E.value = String(k || ""), $.textContent = F || "", te.textContent = `${O} pages`, P(O), w.classList.remove("hidden"), C.classList.add("hidden"), m(), X(F);
    const Q = Xe(O, 0);
    f.updateDocument({
      id: k,
      title: F,
      pageCount: Q
    }), p.setDocument(k, F, Q), ge();
  }
  function ee(k) {
    const F = String(k || "").trim();
    if (F === "") return null;
    const O = de.find((J) => String(J.id || "").trim() === F);
    if (O) return O;
    const Q = W.recentDocuments.find((J) => String(J.id || "").trim() === F);
    if (Q) return Q;
    const se = W.searchResults.find((J) => String(J.id || "").trim() === F);
    return se || null;
  }
  function Se() {
    const k = ee(E?.value || "");
    if (!k) return !0;
    const F = dt(k.compatibilityTier);
    return Ie(F) ? (re(k, k.compatibilityReason || ""), Y(), S(ie(k.compatibilityReason || "")), w && w.classList.add("hidden"), C && C.classList.remove("hidden"), R?.focus(), !1) : (ge(), !0);
  }
  function ye() {
    if (!$ || !te || !w || !C)
      return;
    const k = (E?.value || "").trim();
    if (!k) return;
    const F = de.find((O) => String(O.id || "").trim() === k);
    F && ($.textContent.trim() || ($.textContent = F.title || "Untitled"), (!te.textContent.trim() || te.textContent.trim() === "pages") && (te.textContent = `${F.pageCount || 0} pages`), P(F.pageCount || 0), w.classList.remove("hidden"), C.classList.add("hidden"));
  }
  async function he() {
    try {
      const k = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), F = await fetch(`${e}/panels/esign_documents?${k.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!F.ok)
        throw await y(F, "Failed to load documents");
      const O = await F.json();
      de = (Array.isArray(O?.records) ? O.records : Array.isArray(O?.items) ? O.items : []).slice().sort((J, je) => {
        const He = Date.parse(String(J?.created_at ?? J?.createdAt ?? J?.updated_at ?? J?.updatedAt ?? "")), Je = Date.parse(String(je?.created_at ?? je?.createdAt ?? je?.updated_at ?? je?.updatedAt ?? "")), Oe = Number.isFinite(He) ? He : 0;
        return (Number.isFinite(Je) ? Je : 0) - Oe;
      }).map((J) => bn(J)).filter((J) => J.id !== ""), Ce(de), ye();
    } catch (k) {
      const F = Rt(k) ? String(k.message || "Failed to load documents") : "Failed to load documents", O = Rt(k) ? String(k.code || "") : "", Q = Rt(k) ? Number(k.status || 0) : 0, se = L(F, O, Q);
      U && (U.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${Tt(se)}</div>`);
    }
  }
  function Ce(k) {
    if (!U) return;
    if (k.length === 0) {
      U.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${Tt(s)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    U.innerHTML = k.map((O, Q) => {
      const se = Tt(String(O.id || "").trim()), J = Tt(String(O.title || "").trim()), je = String(Xe(O.pageCount, 0)), He = dt(O.compatibilityTier), Je = fe(O.compatibilityReason), Oe = Tt(He), Ye = Tt(Je), z = Ie(He) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${Q === 0 ? "0" : "-1"}"
                data-document-id="${se}"
                data-document-title="${J}"
                data-document-pages="${je}"
                data-document-compatibility-tier="${Oe}"
                data-document-compatibility-reason="${Ye}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${J}</div>
            <div class="text-xs text-gray-500">${je} pages ${z}</div>
          </div>
        </button>
      `;
    }).join("");
    const F = Array.from(U.querySelectorAll(".document-option"));
    F.forEach((O, Q) => {
      O.addEventListener("click", () => v(O)), O.addEventListener("keydown", (se) => {
        let J = Q;
        if (se.key === "ArrowDown")
          se.preventDefault(), J = Math.min(Q + 1, F.length - 1);
        else if (se.key === "ArrowUp")
          se.preventDefault(), J = Math.max(Q - 1, 0);
        else if (se.key === "Enter" || se.key === " ") {
          se.preventDefault(), v(O);
          return;
        } else se.key === "Home" ? (se.preventDefault(), J = 0) : se.key === "End" && (se.preventDefault(), J = F.length - 1);
        J !== Q && (F[J].focus(), F[J].setAttribute("tabindex", "0"), O.setAttribute("tabindex", "-1"));
      });
    });
  }
  function v(k) {
    const F = k.getAttribute("data-document-id"), O = k.getAttribute("data-document-title"), Q = k.getAttribute("data-document-pages"), se = dt(k.getAttribute("data-document-compatibility-tier")), J = fe(k.getAttribute("data-document-compatibility-reason"));
    if (Ie(se)) {
      re({ id: String(F || ""), title: String(O || ""), pageCount: Xe(Q, 0), compatibilityReason: J }), Y(), S(ie(J)), R?.focus();
      return;
    }
    j(F, O, Q);
  }
  async function b(k, F, O) {
    const Q = String(k || "").trim();
    if (!Q) return;
    const se = Date.now(), J = 12e4, je = 1250;
    for (; Date.now() - se < J; ) {
      const He = await fetch(Q, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!He.ok)
        throw await y(He, "Failed to read remediation status");
      const Oe = (await He.json())?.dispatch || {}, Ye = String(Oe?.status || "").trim().toLowerCase();
      if (Ye === "succeeded") {
        ve("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (Ye === "failed" || Ye === "canceled" || Ye === "dead_letter") {
        const z = String(Oe?.terminal_reason || "").trim();
        throw { message: z ? `Remediation failed: ${z}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      ve(Ye === "retrying" ? "Remediation is retrying in the queue..." : Ye === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((z) => setTimeout(z, je));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${F} (${O})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function x() {
    const k = we;
    if (!k || !k.id) return;
    const F = String(k.id || "").trim();
    if (!(!F || ot.has(F))) {
      ot.add(F), ue && (ue.disabled = !0, ue.textContent = "Remediating...");
      try {
        let O = gt.get(F) || "";
        O || (O = `esign-remediate-${F}-${Date.now()}`, gt.set(F, O));
        const Q = `${t}/esign/documents/${encodeURIComponent(F)}/remediate`, se = await fetch(Q, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": O
          }
        });
        if (!se.ok)
          throw await y(se, "Failed to trigger remediation");
        const J = await se.json(), je = J?.receipt || {}, He = String(je?.dispatch_id || J?.dispatch_id || "").trim(), Je = String(je?.mode || J?.mode || "").trim().toLowerCase();
        let Oe = String(J?.dispatch_status_url || "").trim();
        !Oe && He && (Oe = `${t}/esign/dispatches/${encodeURIComponent(He)}`), Je === "queued" && He && Oe && (ve("Remediation queued. Monitoring progress..."), await b(Oe, He, F)), await he();
        const Ye = ee(F);
        if (!Ye || Ie(Ye.compatibilityTier)) {
          ve("Remediation finished, but this PDF is still incompatible.", "error"), S("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        j(Ye.id, Ye.title, Ye.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : M("Document remediated successfully. You can continue.", "success");
      } catch (O) {
        const Q = Rt(O) ? String(O.message || "Remediation failed").trim() : "Remediation failed", se = Rt(O) ? String(O.code || "") : "", J = Rt(O) ? Number(O.status || 0) : 0;
        ve(Q, "error"), S(Q, se, J);
      } finally {
        ot.delete(F), ue && (ue.disabled = !1, ue.textContent = "Remediate PDF");
      }
    }
  }
  function H(k, F) {
    let O = null;
    return (...Q) => {
      O !== null && clearTimeout(O), O = setTimeout(() => {
        k(...Q), O = null;
      }, F);
    };
  }
  async function q() {
    try {
      const k = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(rt)
      });
      n && k.set("created_by_user_id", n);
      const F = await fetch(`${e}/panels/esign_documents?${k}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!F.ok) {
        console.warn("Failed to load recent documents:", F.status);
        return;
      }
      const O = await F.json(), Q = Array.isArray(O?.records) ? O.records : Array.isArray(O?.items) ? O.items : [];
      W.recentDocuments = Q.map((se) => bn(se)).filter((se) => se.id !== "").slice(0, rt);
    } catch (k) {
      console.warn("Error loading recent documents:", k);
    }
  }
  async function V(k) {
    const F = k.trim();
    if (!F) {
      ze && (ze.abort(), ze = null), W.isSearchMode = !1, W.searchResults = [], Te();
      return;
    }
    const O = ++Qe;
    ze && ze.abort(), ze = new AbortController(), W.isLoading = !0, W.isSearchMode = !0, Te();
    try {
      const Q = new URLSearchParams({
        q: F,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(at)
      }), se = await fetch(`${e}/panels/esign_documents?${Q}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: ze.signal
      });
      if (O !== Qe) return;
      if (!se.ok) {
        console.warn("Failed to search documents:", se.status), W.searchResults = [], W.isLoading = !1, Te();
        return;
      }
      const J = await se.json(), je = Array.isArray(J?.records) ? J.records : Array.isArray(J?.items) ? J.items : [];
      W.searchResults = je.map((He) => bn(He)).filter((He) => He.id !== "").slice(0, at);
    } catch (Q) {
      if (Rt(Q) && Q.name === "AbortError")
        return;
      console.warn("Error searching documents:", Q), W.searchResults = [];
    } finally {
      O === Qe && (W.isLoading = !1, Te());
    }
  }
  const oe = H(V, lt);
  function ce() {
    We && (W.isOpen = !0, W.selectedIndex = -1, We.classList.remove("hidden"), R?.setAttribute("aria-expanded", "true"), U?.classList.add("hidden"), Te());
  }
  function Ae() {
    We && (W.isOpen = !1, W.selectedIndex = -1, We.classList.add("hidden"), R?.setAttribute("aria-expanded", "false"), U?.classList.remove("hidden"));
  }
  function Be(k, F, O) {
    k && (k.innerHTML = F.map((Q, se) => {
      const J = se, je = W.selectedIndex === J, He = Tt(String(Q.id || "").trim()), Je = Tt(String(Q.title || "").trim()), Oe = String(Xe(Q.pageCount, 0)), Ye = dt(Q.compatibilityTier), bt = fe(Q.compatibilityReason), z = Tt(Ye), _e = Tt(bt), Lt = Ie(Ye) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${je ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${je}"
          tabindex="-1"
          data-document-id="${He}"
          data-document-title="${Je}"
          data-document-pages="${Oe}"
          data-document-compatibility-tier="${z}"
          data-document-compatibility-reason="${_e}"
          data-typeahead-index="${J}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${Je}</div>
            <div class="text-xs text-gray-500">${Oe} pages ${Lt}</div>
          </div>
        </button>
      `;
    }).join(""), k.querySelectorAll(".typeahead-option").forEach((Q) => {
      Q.addEventListener("click", () => $e(Q));
    }));
  }
  function Te() {
    if (We) {
      if (W.isLoading) {
        nt?.classList.remove("hidden"), Le?.classList.add("hidden"), Me?.classList.add("hidden"), Re?.classList.add("hidden"), ae?.classList.remove("hidden");
        return;
      }
      nt?.classList.add("hidden"), ae?.classList.add("hidden"), W.isSearchMode ? (Le?.classList.add("hidden"), W.searchResults.length > 0 ? (Me?.classList.remove("hidden"), Re?.classList.add("hidden"), Be(Ke, W.searchResults)) : (Me?.classList.add("hidden"), Re?.classList.remove("hidden"))) : (Me?.classList.add("hidden"), W.recentDocuments.length > 0 ? (Le?.classList.remove("hidden"), Re?.classList.add("hidden"), Be(pe, W.recentDocuments)) : (Le?.classList.add("hidden"), Re?.classList.remove("hidden"), Re && (Re.textContent = "No recent documents")));
    }
  }
  function $e(k) {
    const F = k.getAttribute("data-document-id"), O = k.getAttribute("data-document-title"), Q = k.getAttribute("data-document-pages"), se = dt(k.getAttribute("data-document-compatibility-tier")), J = fe(k.getAttribute("data-document-compatibility-reason"));
    if (F) {
      if (Ie(se)) {
        re({ id: String(F || ""), title: String(O || ""), pageCount: Xe(Q, 0), compatibilityReason: J }), Y(), S(ie(J)), R?.focus();
        return;
      }
      j(F, O, Q), Ae(), R && (R.value = ""), W.query = "", W.isSearchMode = !1, W.searchResults = [];
    }
  }
  function tt() {
    if (!We) return;
    const k = We.querySelector(`[data-typeahead-index="${W.selectedIndex}"]`);
    k && k.scrollIntoView({ block: "nearest" });
  }
  function Ue(k) {
    if (!W.isOpen) {
      (k.key === "ArrowDown" || k.key === "Enter") && (k.preventDefault(), ce());
      return;
    }
    const F = W.isSearchMode ? W.searchResults : W.recentDocuments, O = F.length - 1;
    switch (k.key) {
      case "ArrowDown":
        k.preventDefault(), W.selectedIndex = Math.min(W.selectedIndex + 1, O), Te(), tt();
        break;
      case "ArrowUp":
        k.preventDefault(), W.selectedIndex = Math.max(W.selectedIndex - 1, 0), Te(), tt();
        break;
      case "Enter":
        if (k.preventDefault(), W.selectedIndex >= 0 && W.selectedIndex <= O) {
          const Q = F[W.selectedIndex];
          if (Q) {
            const se = document.createElement("button");
            se.setAttribute("data-document-id", Q.id), se.setAttribute("data-document-title", Q.title), se.setAttribute("data-document-pages", String(Q.pageCount)), se.setAttribute("data-document-compatibility-tier", String(Q.compatibilityTier || "")), se.setAttribute("data-document-compatibility-reason", String(Q.compatibilityReason || "")), $e(se);
          }
        }
        break;
      case "Escape":
        k.preventDefault(), Ae();
        break;
      case "Tab":
        Ae();
        break;
      case "Home":
        k.preventDefault(), W.selectedIndex = 0, Te(), tt();
        break;
      case "End":
        k.preventDefault(), W.selectedIndex = O, Te(), tt();
        break;
    }
  }
  function yt() {
    _ && _.addEventListener("click", () => {
      w?.classList.add("hidden"), C?.classList.remove("hidden"), ge(), R?.focus(), ce();
    }), ue && ue.addEventListener("click", () => {
      x();
    }), Ne && Ne.addEventListener("click", () => {
      ge(), R?.focus();
    }), R && (R.addEventListener("input", (k) => {
      const F = k.target;
      if (!(F instanceof HTMLInputElement)) return;
      const O = F.value;
      W.query = O, W.isOpen || ce(), O.trim() ? (W.isLoading = !0, Te(), oe(O)) : (W.isSearchMode = !1, W.searchResults = [], Te());
      const Q = de.filter(
        (se) => String(se.title || "").toLowerCase().includes(O.toLowerCase())
      );
      Ce(Q);
    }), R.addEventListener("focus", () => {
      ce();
    }), R.addEventListener("keydown", Ue)), document.addEventListener("click", (k) => {
      const F = k.target;
      et && !(F instanceof Node && et.contains(F)) && Ae();
    });
  }
  return {
    refs: {
      documentIdInput: E,
      selectedDocument: w,
      documentPicker: C,
      documentSearch: R,
      documentList: U,
      selectedDocumentTitle: $,
      selectedDocumentInfo: te,
      documentPageCountInput: N
    },
    bindEvents: yt,
    initializeTitleSourceSeed: T,
    loadDocuments: he,
    loadRecentDocuments: q,
    ensureSelectedDocumentCompatibility: Se,
    getCurrentDocumentPageCount: B
  };
}
function Ct(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function wn(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Ws(i = {}) {
  const {
    initialParticipants: e = [],
    onParticipantsChanged: t
  } = i, n = document.getElementById("participants-container"), s = document.getElementById("participant-template"), o = document.getElementById("add-participant-btn");
  let c = 0, r = 0;
  function f() {
    return `temp_${Date.now()}_${c++}`;
  }
  function p(E = {}) {
    if (!(s instanceof HTMLTemplateElement) || !n)
      return;
    const w = s.content.cloneNode(!0), C = w.querySelector(".participant-entry");
    if (!(C instanceof HTMLElement)) return;
    const R = E.id || f();
    C.setAttribute("data-participant-id", R);
    const U = Ct(C, ".participant-id-input"), _ = Ct(C, 'input[name="participants[].name"]'), $ = Ct(C, 'input[name="participants[].email"]'), te = wn(C, 'select[name="participants[].role"]'), N = Ct(C, 'input[name="participants[].signing_stage"]'), Z = Ct(C, 'input[name="participants[].notify"]'), me = C.querySelector(".signing-stage-wrapper");
    if (!U || !_ || !$ || !te) return;
    const le = r++;
    U.name = `participants[${le}].id`, U.value = R, _.name = `participants[${le}].name`, $.name = `participants[${le}].email`, te.name = `participants[${le}].role`, N && (N.name = `participants[${le}].signing_stage`), Z && (Z.name = `participants[${le}].notify`), E.name && (_.value = E.name), E.email && ($.value = E.email), E.role && (te.value = E.role), N && E.signing_stage && (N.value = String(E.signing_stage)), Z && (Z.checked = E.notify !== !1);
    const ue = () => {
      if (!(me instanceof HTMLElement) || !N) return;
      const Ne = te.value === "signer";
      me.classList.toggle("hidden", !Ne), Ne ? N.value || (N.value = "1") : N.value = "";
    };
    ue(), C.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      C.remove(), t?.();
    }), te.addEventListener("change", () => {
      ue(), t?.();
    }), n.appendChild(w);
  }
  function y() {
    n && (e.length > 0 ? e.forEach((E) => {
      p({
        id: String(E.id || "").trim(),
        name: String(E.name || "").trim(),
        email: String(E.email || "").trim(),
        role: String(E.role || "signer").trim() || "signer",
        notify: E.notify !== !1,
        signing_stage: Number(E.signing_stage || E.signingStage || 1) || 1
      });
    }) : p());
  }
  function S() {
    if (!n) return;
    o?.addEventListener("click", () => p()), new MutationObserver(() => {
      t?.();
    }).observe(n, { childList: !0, subtree: !0 }), n.addEventListener("change", (w) => {
      const C = w.target;
      C instanceof Element && (C.matches('select[name*=".role"]') || C.matches('input[name*=".name"]') || C.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (w) => {
      const C = w.target;
      C instanceof Element && (C.matches('input[name*=".name"]') || C.matches('input[name*=".email"]')) && t?.();
    });
  }
  function M() {
    if (!n) return [];
    const E = n.querySelectorAll(".participant-entry"), w = [];
    return E.forEach((C) => {
      const R = C.getAttribute("data-participant-id"), U = wn(C, 'select[name*=".role"]'), _ = Ct(C, 'input[name*=".name"]'), $ = Ct(C, 'input[name*=".email"]');
      U?.value === "signer" && w.push({
        id: String(R || ""),
        name: _?.value || $?.value || "Signer",
        email: $?.value || ""
      });
    }), w;
  }
  function L() {
    if (!n) return [];
    const E = [];
    return n.querySelectorAll(".participant-entry").forEach((w) => {
      const C = w.getAttribute("data-participant-id"), R = Ct(w, 'input[name*=".name"]')?.value || "", U = Ct(w, 'input[name*=".email"]')?.value || "", _ = wn(w, 'select[name*=".role"]')?.value || "signer", $ = Number.parseInt(Ct(w, ".signing-stage-input")?.value || "1", 10), te = Ct(w, ".notify-input")?.checked !== !1;
      E.push({
        tempId: String(C || ""),
        name: R,
        email: U,
        role: _,
        notify: te,
        signingStage: Number.isFinite($) ? $ : 1
      });
    }), E;
  }
  function m(E) {
    !n || !E?.participants || E.participants.length === 0 || (n.innerHTML = "", r = 0, E.participants.forEach((w) => {
      p({
        id: w.tempId,
        name: w.name,
        email: w.email,
        role: w.role,
        notify: w.notify !== !1,
        signing_stage: w.signingStage
      });
    }));
  }
  return {
    refs: {
      participantsContainer: n,
      addParticipantBtn: o
    },
    initialize: y,
    bindEvents: S,
    addParticipant: p,
    getSignerParticipants: M,
    collectParticipantsForState: L,
    restoreFromState: m
  };
}
function Ks() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function ln() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Js(i, e) {
  return {
    id: Ks(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function xi(i, e) {
  const t = new Map(i.groups);
  t.set(e.id, e);
  const n = new Map(i.definitionToGroup);
  for (const s of e.memberDefinitionIds)
    n.set(s, e.id);
  return {
    ...i,
    groups: t,
    definitionToGroup: n
  };
}
function ti(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function ni(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Ii(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function Ys(i, e) {
  const t = Ii(i, e.definitionId);
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
function Xs(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const o of t)
    s.add(o.definitionId);
  for (const [o, c] of n) {
    if (c.page !== e || s.has(o) || i.unlinkedDefinitions.has(o)) continue;
    const r = i.definitionToGroup.get(o);
    if (!r) continue;
    const f = i.groups.get(r);
    if (!f || !f.isActive || !f.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: o,
      type: c.type,
      participantId: c.participantId,
      participantName: c.participantName,
      page: e,
      x: f.templatePosition.x,
      y: f.templatePosition.y,
      width: f.templatePosition.width,
      height: f.templatePosition.height,
      placementSource: vt.AUTO_LINKED,
      linkGroupId: f.id,
      linkedFromFieldId: f.sourceFieldId
    } };
  }
  return null;
}
function Et(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Ge(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function ft(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function ii(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function $t(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLElement ? t : null;
}
function Qs(i) {
  const {
    initialFieldInstances: e = [],
    placementSource: t,
    getCurrentDocumentPageCount: n,
    getSignerParticipants: s,
    escapeHtml: o,
    onDefinitionsChanged: c,
    onRulesChanged: r,
    onParticipantsChanged: f,
    getPlacementLinkGroupState: p,
    setPlacementLinkGroupState: y
  } = i, S = Et("field-definitions-container"), M = document.getElementById("field-definition-template"), L = Et("add-field-btn"), m = Et("add-field-btn-container"), E = Et("add-field-definition-empty-btn"), w = Et("field-definitions-empty-state"), C = Et("field-rules-container"), R = document.getElementById("field-rule-template"), U = Et("add-field-rule-btn"), _ = Et("field-rules-empty-state"), $ = Et("field-rules-preview"), te = Et("field_rules_json"), N = Et("field_placements_json");
  let Z = 0, me = 0, le = 0;
  function ue() {
    return `temp_field_${Date.now()}_${Z++}`;
  }
  function Ne() {
    return `rule_${Date.now()}_${le}`;
  }
  function Ze(T, P) {
    const B = String(T || "").trim();
    return B && P.some((Y) => Y.id === B) ? B : P.length === 1 ? P[0].id : "";
  }
  function lt(T, P, B = "") {
    if (!T) return;
    const Y = Ze(B, P);
    T.innerHTML = '<option value="">Select signer...</option>', P.forEach((ie) => {
      const ge = document.createElement("option");
      ge.value = ie.id, ge.textContent = ie.name, T.appendChild(ge);
    }), T.value = Y;
  }
  function rt(T = s()) {
    if (!S) return;
    const P = S.querySelectorAll(".field-participant-select"), B = C ? C.querySelectorAll(".field-rule-participant-select") : [];
    P.forEach((Y) => {
      lt(
        Y instanceof HTMLSelectElement ? Y : null,
        T,
        Y instanceof HTMLSelectElement ? Y.value : ""
      );
    }), B.forEach((Y) => {
      lt(
        Y instanceof HTMLSelectElement ? Y : null,
        T,
        Y instanceof HTMLSelectElement ? Y.value : ""
      );
    });
  }
  function at() {
    if (!S || !w) return;
    S.querySelectorAll(".field-definition-entry").length === 0 ? (w.classList.remove("hidden"), m?.classList.add("hidden")) : (w.classList.add("hidden"), m?.classList.remove("hidden"));
  }
  function et() {
    if (!C || !_) return;
    const T = C.querySelectorAll(".field-rule-entry");
    _.classList.toggle("hidden", T.length > 0);
  }
  function We() {
    if (!S) return [];
    const T = [];
    return S.querySelectorAll(".field-definition-entry").forEach((P) => {
      const B = P.getAttribute("data-field-definition-id"), Y = ft(P, ".field-type-select")?.value || "signature", ie = ft(P, ".field-participant-select")?.value || "", ge = Number.parseInt(Ge(P, 'input[name*=".page"]')?.value || "1", 10), ve = Ge(P, 'input[name*=".required"]')?.checked ?? !0;
      T.push({
        tempId: String(B || ""),
        type: Y,
        participantTempId: ie,
        page: Number.isFinite(ge) ? ge : 1,
        required: ve
      });
    }), T;
  }
  function Le() {
    if (!C) return [];
    const T = n(), P = C.querySelectorAll(".field-rule-entry"), B = [];
    return P.forEach((Y) => {
      const ie = nn({
        id: Y.getAttribute("data-field-rule-id") || "",
        type: ft(Y, ".field-rule-type-select")?.value || "",
        participantId: ft(Y, ".field-rule-participant-select")?.value || "",
        fromPage: Ge(Y, ".field-rule-from-page-input")?.value || "",
        toPage: Ge(Y, ".field-rule-to-page-input")?.value || "",
        page: Ge(Y, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Ge(Y, ".field-rule-exclude-last-input")?.checked,
        excludePages: cn(Ge(Y, ".field-rule-exclude-pages-input")?.value || ""),
        required: (ft(Y, ".field-rule-required-select")?.value || "1") !== "0"
      }, T);
      ie.type && B.push(ie);
    }), B;
  }
  function pe() {
    return Le().map((T) => ({
      id: T.id,
      type: T.type,
      participant_id: T.participantId,
      from_page: T.fromPage,
      to_page: T.toPage,
      page: T.page,
      exclude_last_page: T.excludeLastPage,
      exclude_pages: T.excludePages,
      required: T.required
    }));
  }
  function Me(T, P) {
    return zs(T, P);
  }
  function Ke() {
    if (!$) return;
    const T = Le(), P = n(), B = Me(T, P), Y = s(), ie = new Map(Y.map((X) => [String(X.id), X.name]));
    if (te && (te.value = JSON.stringify(pe())), !B.length) {
      $.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const ge = B.reduce((X, j) => {
      const ee = j.type;
      return X[ee] = (X[ee] || 0) + 1, X;
    }, {}), ve = B.slice(0, 8).map((X) => {
      const j = ie.get(String(X.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${X.type === "initials" ? "Initials" : "Signature"} on page ${X.page}</span><span class="text-gray-500">${o(String(j))}</span></li>`;
    }).join(""), re = B.length - 8;
    $.innerHTML = `
      <p class="text-gray-700">${B.length} generated field${B.length !== 1 ? "s" : ""} (${ge.initials || 0} initials, ${ge.signature || 0} signatures)</p>
      <ul class="space-y-1">${ve}</ul>
      ${re > 0 ? `<p class="text-gray-500">+${re} more</p>` : ""}
    `;
  }
  function Re() {
    const T = s();
    rt(T), Ke();
  }
  function nt(T) {
    const P = ft(T, ".field-rule-type-select"), B = $t(T, ".field-rule-range-start-wrap"), Y = $t(T, ".field-rule-range-end-wrap"), ie = $t(T, ".field-rule-page-wrap"), ge = $t(T, ".field-rule-exclude-last-wrap"), ve = $t(T, ".field-rule-exclude-pages-wrap"), re = $t(T, ".field-rule-summary"), X = Ge(T, ".field-rule-from-page-input"), j = Ge(T, ".field-rule-to-page-input"), ee = Ge(T, ".field-rule-page-input"), Se = Ge(T, ".field-rule-exclude-last-input"), ye = Ge(T, ".field-rule-exclude-pages-input");
    if (!P || !B || !Y || !ie || !ge || !ve || !re)
      return;
    const he = n(), Ce = nn({
      type: P?.value || "",
      fromPage: X?.value || "",
      toPage: j?.value || "",
      page: ee?.value || "",
      excludeLastPage: !!Se?.checked,
      excludePages: cn(ye?.value || ""),
      required: !0
    }, he), v = Ce.fromPage > 0 ? Ce.fromPage : 1, b = Ce.toPage > 0 ? Ce.toPage : he, x = Ce.page > 0 ? Ce.page : Ce.toPage > 0 ? Ce.toPage : he, H = Ce.excludeLastPage, q = Ce.excludePages.join(","), V = P?.value === "initials_each_page";
    if (B.classList.toggle("hidden", !V), Y.classList.toggle("hidden", !V), ge.classList.toggle("hidden", !V), ve.classList.toggle("hidden", !V), ie.classList.toggle("hidden", V), X && (X.value = String(v)), j && (j.value = String(b)), ee && (ee.value = String(x)), ye && (ye.value = q), Se && (Se.checked = H), V) {
      const oe = js(
        v,
        b,
        he,
        H,
        Ce.excludePages
      ), ce = qs(oe);
      re.textContent = oe.isEmpty ? `Warning: No initials fields will be generated ${ce}.` : `Generates initials fields on ${ce}.`;
    } else
      re.textContent = `Generates one signature field on page ${x}.`;
  }
  function ae(T = {}) {
    if (!(R instanceof HTMLTemplateElement) || !C) return;
    const P = R.content.cloneNode(!0), B = P.querySelector(".field-rule-entry");
    if (!(B instanceof HTMLElement)) return;
    const Y = T.id || Ne(), ie = le++, ge = n();
    B.setAttribute("data-field-rule-id", Y);
    const ve = Ge(B, ".field-rule-id-input"), re = ft(B, ".field-rule-type-select"), X = ft(B, ".field-rule-participant-select"), j = Ge(B, ".field-rule-from-page-input"), ee = Ge(B, ".field-rule-to-page-input"), Se = Ge(B, ".field-rule-page-input"), ye = ft(B, ".field-rule-required-select"), he = Ge(B, ".field-rule-exclude-last-input"), Ce = Ge(B, ".field-rule-exclude-pages-input"), v = ii(B, ".remove-field-rule-btn");
    if (!ve || !re || !X || !j || !ee || !Se || !ye || !he || !Ce || !v)
      return;
    ve.name = `field_rules[${ie}].id`, ve.value = Y, re.name = `field_rules[${ie}].type`, X.name = `field_rules[${ie}].participant_id`, j.name = `field_rules[${ie}].from_page`, ee.name = `field_rules[${ie}].to_page`, Se.name = `field_rules[${ie}].page`, ye.name = `field_rules[${ie}].required`, he.name = `field_rules[${ie}].exclude_last_page`, Ce.name = `field_rules[${ie}].exclude_pages`;
    const b = nn(T, ge);
    re.value = b.type || "initials_each_page", lt(X, s(), b.participantId), j.value = String(b.fromPage > 0 ? b.fromPage : 1), ee.value = String(b.toPage > 0 ? b.toPage : ge), Se.value = String(b.page > 0 ? b.page : ge), ye.value = b.required ? "1" : "0", he.checked = b.excludeLastPage, Ce.value = b.excludePages.join(",");
    const x = () => {
      nt(B), Ke(), r?.();
    }, H = () => {
      const V = n();
      if (j) {
        const oe = parseInt(j.value, 10);
        Number.isFinite(oe) && (j.value = String(Vt(oe, V, 1)));
      }
      if (ee) {
        const oe = parseInt(ee.value, 10);
        Number.isFinite(oe) && (ee.value = String(Vt(oe, V, 1)));
      }
      if (Se) {
        const oe = parseInt(Se.value, 10);
        Number.isFinite(oe) && (Se.value = String(Vt(oe, V, 1)));
      }
    }, q = () => {
      H(), x();
    };
    re.addEventListener("change", x), X.addEventListener("change", x), j.addEventListener("input", q), j.addEventListener("change", q), ee.addEventListener("input", q), ee.addEventListener("change", q), Se.addEventListener("input", q), Se.addEventListener("change", q), ye.addEventListener("change", x), he.addEventListener("change", () => {
      const V = n();
      ee.value = String(he.checked ? Math.max(1, V - 1) : V), x();
    }), Ce.addEventListener("input", x), v.addEventListener("click", () => {
      B.remove(), et(), Ke(), r?.();
    }), C.appendChild(P), nt(C.lastElementChild || B), et(), Ke();
  }
  function W(T = {}) {
    if (!(M instanceof HTMLTemplateElement) || !S) return;
    const P = M.content.cloneNode(!0), B = P.querySelector(".field-definition-entry");
    if (!(B instanceof HTMLElement)) return;
    const Y = String(T.id || ue()).trim() || ue();
    B.setAttribute("data-field-definition-id", Y);
    const ie = Ge(B, ".field-definition-id-input"), ge = ft(B, 'select[name="field_definitions[].type"]'), ve = ft(B, 'select[name="field_definitions[].participant_id"]'), re = Ge(B, 'input[name="field_definitions[].page"]'), X = Ge(B, 'input[name="field_definitions[].required"]'), j = $t(B, ".field-date-signed-info");
    if (!ie || !ge || !ve || !re || !X || !j) return;
    const ee = me++;
    ie.name = `field_instances[${ee}].id`, ie.value = Y, ge.name = `field_instances[${ee}].type`, ve.name = `field_instances[${ee}].participant_id`, re.name = `field_instances[${ee}].page`, X.name = `field_instances[${ee}].required`, T.type && (ge.value = String(T.type)), T.page !== void 0 && (re.value = String(Vt(T.page, n(), 1))), T.required !== void 0 && (X.checked = !!T.required);
    const Se = String(T.participant_id || T.participantId || "").trim();
    lt(ve, s(), Se), ge.addEventListener("change", () => {
      ge.value === "date_signed" ? j.classList.remove("hidden") : j.classList.add("hidden");
    }), ge.value === "date_signed" && j.classList.remove("hidden"), ii(B, ".remove-field-definition-btn")?.addEventListener("click", () => {
      B.remove(), at(), c?.();
    });
    const ye = Ge(B, 'input[name*=".page"]'), he = () => {
      ye && (ye.value = String(Vt(ye.value, n(), 1)));
    };
    he(), ye?.addEventListener("input", he), ye?.addEventListener("change", he), S.appendChild(P), at();
  }
  function de() {
    L?.addEventListener("click", () => W()), E?.addEventListener("click", () => W()), U?.addEventListener("click", () => ae({ to_page: n() })), f?.();
  }
  function we() {
    const T = [];
    window._initialFieldPlacementsData = T, e.forEach((P) => {
      const B = String(P.id || "").trim();
      if (!B) return;
      const Y = String(P.type || "signature").trim() || "signature", ie = String(P.participant_id || P.participantId || "").trim(), ge = Number(P.page || 1) || 1, ve = !!P.required;
      W({
        id: B,
        type: Y,
        participant_id: ie,
        page: ge,
        required: ve
      }), T.push(Kt({
        id: B,
        definitionId: B,
        type: Y,
        participantId: ie,
        participantName: String(P.participant_name || P.participantName || "").trim(),
        page: ge,
        x: Number(P.x || P.pos_x || 0) || 0,
        y: Number(P.y || P.pos_y || 0) || 0,
        width: Number(P.width || 150) || 150,
        height: Number(P.height || 32) || 32,
        placementSource: String(P.placement_source || P.placementSource || t.MANUAL).trim() || t.MANUAL
      }, T.length));
    }), at(), Re(), et(), Ke();
  }
  function Qe() {
    const T = window._initialFieldPlacementsData;
    return Array.isArray(T) ? T.map((P, B) => Kt(P, B)) : [];
  }
  function ze() {
    if (!S) return [];
    const T = s(), P = new Map(T.map((j) => [String(j.id), j.name || j.email || "Signer"])), B = [];
    S.querySelectorAll(".field-definition-entry").forEach((j) => {
      const ee = String(j.getAttribute("data-field-definition-id") || "").trim(), Se = ft(j, ".field-type-select"), ye = ft(j, ".field-participant-select"), he = Ge(j, 'input[name*=".page"]'), Ce = String(Se?.value || "text").trim() || "text", v = String(ye?.value || "").trim(), b = parseInt(String(he?.value || "1"), 10) || 1;
      B.push({
        definitionId: ee,
        fieldType: Ce,
        participantId: v,
        participantName: P.get(v) || "Unassigned",
        page: b
      });
    });
    const ie = Me(Le(), n()), ge = /* @__PURE__ */ new Map();
    ie.forEach((j) => {
      const ee = String(j.ruleId || "").trim(), Se = String(j.id || "").trim();
      if (ee && Se) {
        const ye = ge.get(ee) || [];
        ye.push(Se), ge.set(ee, ye);
      }
    });
    let ve = p();
    ge.forEach((j, ee) => {
      if (j.length > 1 && !ve.groups.get(`rule_${ee}`)) {
        const ye = Js(j, `Rule ${ee}`);
        ye.id = `rule_${ee}`, ve = xi(ve, ye);
      }
    }), y(ve), ie.forEach((j) => {
      const ee = String(j.id || "").trim();
      if (!ee) return;
      const Se = String(j.participantId || "").trim(), ye = parseInt(String(j.page || "1"), 10) || 1, he = String(j.ruleId || "").trim();
      B.push({
        definitionId: ee,
        fieldType: String(j.type || "text").trim() || "text",
        participantId: Se,
        participantName: P.get(Se) || "Unassigned",
        page: ye,
        linkGroupId: he ? `rule_${he}` : void 0
      });
    });
    const re = /* @__PURE__ */ new Set(), X = B.filter((j) => {
      const ee = String(j.definitionId || "").trim();
      return !ee || re.has(ee) ? !1 : (re.add(ee), !0);
    });
    return X.sort((j, ee) => j.page !== ee.page ? j.page - ee.page : j.definitionId.localeCompare(ee.definitionId)), X;
  }
  function ot(T) {
    const P = String(T || "").trim();
    if (!P) return null;
    const Y = ze().find((ie) => String(ie.definitionId || "").trim() === P);
    return Y ? {
      id: P,
      type: String(Y.fieldType || "text").trim() || "text",
      participant_id: String(Y.participantId || "").trim(),
      participant_name: String(Y.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(Y.page || "1"), 10) || 1,
      link_group_id: String(Y.linkGroupId || "").trim()
    } : null;
  }
  function gt() {
    if (!S) return [];
    const T = s(), P = /* @__PURE__ */ new Map();
    return T.forEach((ie) => P.set(ie.id, !1)), S.querySelectorAll(".field-definition-entry").forEach((ie) => {
      const ge = ft(ie, ".field-type-select"), ve = ft(ie, ".field-participant-select"), re = Ge(ie, 'input[name*=".required"]');
      ge?.value === "signature" && ve?.value && re?.checked && P.set(ve.value, !0);
    }), Me(Le(), n()).forEach((ie) => {
      ie.type === "signature" && ie.participantId && ie.required && P.set(ie.participantId, !0);
    }), T.filter((ie) => !P.get(ie.id));
  }
  function dt(T) {
    if (!Array.isArray(T) || T.length === 0)
      return "Each signer requires at least one required signature field.";
    const P = T.map((B) => B?.name?.trim()).filter(Boolean);
    return P.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${P.join(", ")}`;
  }
  function fe(T) {
    !S || !T?.fieldDefinitions || T.fieldDefinitions.length === 0 || (S.innerHTML = "", me = 0, T.fieldDefinitions.forEach((P) => {
      W({
        id: P.tempId,
        type: P.type,
        participant_id: P.participantTempId,
        page: P.page,
        required: P.required
      });
    }), at());
  }
  function Ie(T) {
    !Array.isArray(T?.fieldRules) || T.fieldRules.length === 0 || C && (C.querySelectorAll(".field-rule-entry").forEach((P) => P.remove()), le = 0, T.fieldRules.forEach((P) => {
      ae({
        id: P.id,
        type: P.type,
        participantId: P.participantId || P.participantTempId,
        fromPage: P.fromPage,
        toPage: P.toPage,
        page: P.page,
        excludeLastPage: P.excludeLastPage,
        excludePages: P.excludePages,
        required: P.required
      });
    }), et(), Ke());
  }
  return {
    refs: {
      fieldDefinitionsContainer: S,
      fieldRulesContainer: C,
      addFieldBtn: L,
      fieldPlacementsJSONInput: N,
      fieldRulesJSONInput: te
    },
    bindEvents: de,
    initialize: we,
    buildInitialPlacementInstances: Qe,
    collectFieldDefinitionsForState: We,
    collectFieldRulesForState: Le,
    collectFieldRulesForForm: pe,
    expandRulesForPreview: Me,
    renderFieldRulePreview: Ke,
    updateFieldParticipantOptions: Re,
    collectPlacementFieldDefinitions: ze,
    getFieldDefinitionById: ot,
    findSignersMissingRequiredSignatureField: gt,
    missingSignatureFieldMessage: dt,
    restoreFieldDefinitionsFromState: fe,
    restoreFieldRulesFromState: Ie
  };
}
function Zs(i) {
  return typeof i == "object" && i !== null && "run" in i;
}
const Ut = {
  signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
  name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
  date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
  text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
  checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
  initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
}, Zt = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};
function er(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentIdInput: n,
    fieldPlacementsJSONInput: s,
    initialFieldInstances: o = [],
    initialLinkGroupState: c = null,
    collectPlacementFieldDefinitions: r,
    getFieldDefinitionById: f,
    parseAPIError: p,
    mapUserFacingError: y,
    showToast: S,
    escapeHtml: M,
    onPlacementsChanged: L
  } = i, m = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(o) ? o.map((v, b) => Kt(v, b)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: c || ln()
  }, E = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function w(v = "fi") {
    return `${v}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function C(v) {
    return document.querySelector(`.placement-field-item[data-definition-id="${v}"]`);
  }
  function R() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function U(v, b) {
    return v.querySelector(b);
  }
  function _(v, b) {
    return v.querySelector(b);
  }
  function $() {
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
  function te() {
    return m;
  }
  function N() {
    return m.linkGroupState;
  }
  function Z(v) {
    m.linkGroupState = v || ln();
  }
  function me() {
    return m.fieldInstances.map((v, b) => Vs(v, b));
  }
  function le(v = {}) {
    const { silent: b = !1 } = v, x = $();
    x.fieldInstancesContainer && (x.fieldInstancesContainer.innerHTML = "");
    const H = me();
    return s && (s.value = JSON.stringify(H)), b || L?.(), H;
  }
  function ue() {
    const v = $(), b = Array.from(document.querySelectorAll(".placement-field-item")), x = b.length, H = new Set(
      b.map((ce) => String(ce.dataset.definitionId || "").trim()).filter((ce) => ce)
    ), q = /* @__PURE__ */ new Set();
    m.fieldInstances.forEach((ce) => {
      const Ae = String(ce.definitionId || "").trim();
      H.has(Ae) && q.add(Ae);
    });
    const V = q.size, oe = Math.max(0, x - V);
    v.totalFields && (v.totalFields.textContent = String(x)), v.placedCount && (v.placedCount.textContent = String(V)), v.unplacedCount && (v.unplacedCount.textContent = String(oe));
  }
  function Ne(v, b = !1) {
    const x = C(v);
    if (!x) return;
    x.classList.add("opacity-50"), x.draggable = !1;
    const H = x.querySelector(".placement-status");
    H && (H.textContent = "Placed", H.classList.remove("text-amber-600"), H.classList.add("text-green-600")), b && x.classList.add("just-linked");
  }
  function Ze(v) {
    const b = C(v);
    if (!b) return;
    b.classList.remove("opacity-50"), b.draggable = !0;
    const x = b.querySelector(".placement-status");
    x && (x.textContent = "Not placed", x.classList.remove("text-green-600"), x.classList.add("text-amber-600"));
  }
  function lt() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((b) => {
      b.classList.add("linked-flash"), setTimeout(() => {
        b.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function rt(v) {
    const b = v === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${v} linked fields`;
    window.toastManager?.info?.(b);
    const x = document.createElement("div");
    x.setAttribute("role", "status"), x.setAttribute("aria-live", "polite"), x.className = "sr-only", x.textContent = b, document.body.appendChild(x), setTimeout(() => x.remove(), 1e3), lt();
  }
  function at(v, b) {
    const x = document.createElement("div");
    x.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", x.dataset.definitionId = v, x.dataset.isLinked = String(b), x.title = b ? "Click to unlink this field" : "Click to re-link this field", x.setAttribute("role", "button"), x.setAttribute("aria-label", b ? "Unlink field from group" : "Re-link field to group"), x.setAttribute("tabindex", "0"), b ? x.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : x.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const H = () => Ke(v, b);
    return x.addEventListener("click", H), x.addEventListener("keydown", (q) => {
      (q.key === "Enter" || q.key === " ") && (q.preventDefault(), H());
    }), x;
  }
  function et() {
    const v = $();
    if (v.linkAllBtn && (v.linkAllBtn.disabled = m.linkGroupState.unlinkedDefinitions.size === 0), v.unlinkAllBtn) {
      let b = !1;
      for (const x of m.linkGroupState.definitionToGroup.keys())
        if (!m.linkGroupState.unlinkedDefinitions.has(x)) {
          b = !0;
          break;
        }
      v.unlinkAllBtn.disabled = !b;
    }
  }
  function We() {
    const v = $();
    v.linkAllBtn && !v.linkAllBtn.dataset.bound && (v.linkAllBtn.dataset.bound = "true", v.linkAllBtn.addEventListener("click", () => {
      const b = m.linkGroupState.unlinkedDefinitions.size;
      if (b !== 0) {
        for (const x of m.linkGroupState.unlinkedDefinitions)
          m.linkGroupState = ni(m.linkGroupState, x);
        window.toastManager && window.toastManager.success(`Re-linked ${b} field${b > 1 ? "s" : ""}`), Me();
      }
    })), v.unlinkAllBtn && !v.unlinkAllBtn.dataset.bound && (v.unlinkAllBtn.dataset.bound = "true", v.unlinkAllBtn.addEventListener("click", () => {
      let b = 0;
      for (const x of m.linkGroupState.definitionToGroup.keys())
        m.linkGroupState.unlinkedDefinitions.has(x) || (m.linkGroupState = ti(m.linkGroupState, x), b += 1);
      b > 0 && window.toastManager && window.toastManager.success(`Unlinked ${b} field${b > 1 ? "s" : ""}`), Me();
    })), et();
  }
  function Le() {
    return r().map((b) => {
      const x = String(b.definitionId || "").trim(), H = m.linkGroupState.definitionToGroup.get(x) || "", q = m.linkGroupState.unlinkedDefinitions.has(x);
      return { ...b, definitionId: x, linkGroupId: H, isUnlinked: q };
    });
  }
  function pe() {
    const v = $();
    if (!v.fieldsList) return;
    v.fieldsList.innerHTML = "";
    const b = Le();
    v.linkBatchActions && v.linkBatchActions.classList.toggle("hidden", m.linkGroupState.groups.size === 0), b.forEach((x, H) => {
      const q = x.definitionId, V = String(x.fieldType || "text").trim() || "text", oe = String(x.participantId || "").trim(), ce = String(x.participantName || "Unassigned").trim() || "Unassigned", Ae = Number.parseInt(String(x.page || "1"), 10) || 1, Be = x.linkGroupId, Te = x.isUnlinked;
      if (!q) return;
      m.fieldInstances.forEach((J) => {
        J.definitionId === q && (J.type = V, J.participantId = oe, J.participantName = ce);
      });
      const $e = Ut[V] || Ut.text, tt = m.fieldInstances.some((J) => J.definitionId === q), Ue = document.createElement("div");
      Ue.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${tt ? "opacity-50" : ""}`, Ue.draggable = !tt, Ue.dataset.definitionId = q, Ue.dataset.fieldType = V, Ue.dataset.participantId = oe, Ue.dataset.participantName = ce, Ue.dataset.page = String(Ae), Be && (Ue.dataset.linkGroupId = Be);
      const yt = document.createElement("span");
      yt.className = `w-3 h-3 rounded ${$e.bg}`;
      const k = document.createElement("div");
      k.className = "flex-1 text-xs";
      const F = document.createElement("div");
      F.className = "font-medium capitalize", F.textContent = V.replace(/_/g, " ");
      const O = document.createElement("div");
      O.className = "text-gray-500", O.textContent = ce;
      const Q = document.createElement("span");
      Q.className = `placement-status text-xs ${tt ? "text-green-600" : "text-amber-600"}`, Q.textContent = tt ? "Placed" : "Not placed", k.appendChild(F), k.appendChild(O), Ue.appendChild(yt), Ue.appendChild(k), Ue.appendChild(Q), Ue.addEventListener("dragstart", (J) => {
        if (tt) {
          J.preventDefault();
          return;
        }
        J.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: q,
          fieldType: V,
          participantId: oe,
          participantName: ce
        })), J.dataTransfer && (J.dataTransfer.effectAllowed = "copy"), Ue.classList.add("opacity-50");
      }), Ue.addEventListener("dragend", () => {
        Ue.classList.remove("opacity-50");
      }), v.fieldsList?.appendChild(Ue);
      const se = b[H + 1];
      Be && se && se.linkGroupId === Be && v.fieldsList?.appendChild(at(q, !Te));
    }), We(), ue();
  }
  function Me() {
    pe();
  }
  function Ke(v, b) {
    b ? (m.linkGroupState = ti(m.linkGroupState, v), window.toastManager?.info?.("Field unlinked")) : (m.linkGroupState = ni(m.linkGroupState, v), window.toastManager?.info?.("Field re-linked")), Me();
  }
  async function Re(v) {
    const b = m.pdfDoc;
    if (!b) return;
    const x = $();
    if (!x.canvas || !x.canvasContainer) return;
    const H = x.canvas.getContext("2d"), q = await b.getPage(v), V = q.getViewport({ scale: m.scale });
    x.canvas.width = V.width, x.canvas.height = V.height, x.canvasContainer.style.width = `${V.width}px`, x.canvasContainer.style.height = `${V.height}px`, await q.render({
      canvasContext: H,
      viewport: V
    }).promise, x.currentPage && (x.currentPage.textContent = String(v)), de();
  }
  function nt(v) {
    const b = Ys(m.linkGroupState, v);
    b && (m.linkGroupState = xi(m.linkGroupState, b.updatedGroup));
  }
  function ae(v) {
    const b = /* @__PURE__ */ new Map();
    r().forEach((H) => {
      const q = String(H.definitionId || "").trim();
      q && b.set(q, {
        type: String(H.fieldType || "text").trim() || "text",
        participantId: String(H.participantId || "").trim(),
        participantName: String(H.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(H.page || "1"), 10) || 1,
        linkGroupId: m.linkGroupState.definitionToGroup.get(q)
      });
    });
    let x = 0;
    for (; x < 10; ) {
      const H = Xs(
        m.linkGroupState,
        v,
        m.fieldInstances,
        b
      );
      if (!H || !H.newPlacement) break;
      m.fieldInstances.push(H.newPlacement), Ne(H.newPlacement.definitionId, !0), x += 1;
    }
    x > 0 && (de(), ue(), le(), rt(x));
  }
  function W(v) {
    nt(v);
  }
  function de() {
    const b = $().overlays;
    b && (b.innerHTML = "", b.style.pointerEvents = "auto", m.fieldInstances.filter((x) => x.page === m.currentPage).forEach((x) => {
      const H = Ut[x.type] || Ut.text, q = m.selectedFieldId === x.id, V = x.placementSource === vt.AUTO_LINKED, oe = document.createElement("div"), ce = V ? "border-dashed" : "border-solid";
      oe.className = `field-overlay absolute cursor-move ${H.border} border-2 ${ce} rounded`, oe.style.cssText = `
          left: ${x.x * m.scale}px;
          top: ${x.y * m.scale}px;
          width: ${x.width * m.scale}px;
          height: ${x.height * m.scale}px;
          background-color: ${H.fill};
          ${q ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, oe.dataset.instanceId = x.id;
      const Ae = document.createElement("div");
      if (Ae.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${H.bg}`, Ae.textContent = `${x.type.replace("_", " ")} - ${x.participantName}`, oe.appendChild(Ae), V) {
        const $e = document.createElement("div");
        $e.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", $e.title = "Auto-linked from template", $e.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, oe.appendChild($e);
      }
      const Be = document.createElement("div");
      Be.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Be.style.cssText = "transform: translate(50%, 50%);", oe.appendChild(Be);
      const Te = document.createElement("button");
      Te.type = "button", Te.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", Te.innerHTML = "×", Te.addEventListener("click", ($e) => {
        $e.stopPropagation(), gt(x.id);
      }), oe.appendChild(Te), oe.addEventListener("mousedown", ($e) => {
        $e.target === Be ? ot($e, x) : $e.target !== Te && ze($e, x, oe);
      }), oe.addEventListener("click", () => {
        m.selectedFieldId = x.id, de();
      }), b.appendChild(oe);
    }));
  }
  function we(v, b, x, H = {}) {
    const q = Zt[v.fieldType] || Zt.text, V = H.placementSource || vt.MANUAL, oe = H.linkGroupId || Ii(m.linkGroupState, v.definitionId)?.id, ce = {
      id: w("fi"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: m.currentPage,
      x: Math.max(0, b - q.width / 2),
      y: Math.max(0, x - q.height / 2),
      width: q.width,
      height: q.height,
      placementSource: V,
      linkGroupId: oe,
      linkedFromFieldId: H.linkedFromFieldId
    };
    m.fieldInstances.push(ce), Ne(v.definitionId), V === vt.MANUAL && oe && W(ce), de(), ue(), le();
  }
  function Qe(v, b) {
    const x = {
      id: w("instance"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: b.page_number,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      placementSource: vt.AUTO,
      resolverId: b.resolver_id,
      confidence: b.confidence,
      placementRunId: E.currentRunId
    };
    m.fieldInstances.push(x), Ne(v.definitionId), de(), ue(), le();
  }
  function ze(v, b, x) {
    v.preventDefault(), m.isDragging = !0, m.selectedFieldId = b.id;
    const H = v.clientX, q = v.clientY, V = b.x * m.scale, oe = b.y * m.scale;
    function ce(Be) {
      const Te = Be.clientX - H, $e = Be.clientY - q;
      b.x = Math.max(0, (V + Te) / m.scale), b.y = Math.max(0, (oe + $e) / m.scale), b.placementSource = vt.MANUAL, x.style.left = `${b.x * m.scale}px`, x.style.top = `${b.y * m.scale}px`;
    }
    function Ae() {
      m.isDragging = !1, document.removeEventListener("mousemove", ce), document.removeEventListener("mouseup", Ae), le();
    }
    document.addEventListener("mousemove", ce), document.addEventListener("mouseup", Ae);
  }
  function ot(v, b) {
    v.preventDefault(), v.stopPropagation(), m.isResizing = !0;
    const x = v.clientX, H = v.clientY, q = b.width, V = b.height;
    function oe(Ae) {
      const Be = (Ae.clientX - x) / m.scale, Te = (Ae.clientY - H) / m.scale;
      b.width = Math.max(30, q + Be), b.height = Math.max(20, V + Te), b.placementSource = vt.MANUAL, de();
    }
    function ce() {
      m.isResizing = !1, document.removeEventListener("mousemove", oe), document.removeEventListener("mouseup", ce), le();
    }
    document.addEventListener("mousemove", oe), document.addEventListener("mouseup", ce);
  }
  function gt(v) {
    const b = m.fieldInstances.find((x) => x.id === v);
    b && (m.fieldInstances = m.fieldInstances.filter((x) => x.id !== v), Ze(b.definitionId), de(), ue(), le());
  }
  function dt(v, b) {
    const H = $().canvas;
    !v || !H || (v.addEventListener("dragover", (q) => {
      q.preventDefault(), q.dataTransfer && (q.dataTransfer.dropEffect = "copy"), H.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("dragleave", () => {
      H.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("drop", (q) => {
      q.preventDefault(), H.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const V = q.dataTransfer?.getData("application/json") || "";
      if (!V) return;
      const oe = JSON.parse(V), ce = H.getBoundingClientRect(), Ae = (q.clientX - ce.left) / m.scale, Be = (q.clientY - ce.top) / m.scale;
      we(oe, Ae, Be);
    }));
  }
  function fe() {
    const v = $();
    v.prevBtn?.addEventListener("click", async () => {
      m.currentPage > 1 && (m.currentPage -= 1, ae(m.currentPage), await Re(m.currentPage));
    }), v.nextBtn?.addEventListener("click", async () => {
      m.currentPage < m.totalPages && (m.currentPage += 1, ae(m.currentPage), await Re(m.currentPage));
    });
  }
  function Ie() {
    const v = $();
    v.zoomIn?.addEventListener("click", async () => {
      m.scale = Math.min(3, m.scale + 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(m.scale * 100)}%`), await Re(m.currentPage);
    }), v.zoomOut?.addEventListener("click", async () => {
      m.scale = Math.max(0.5, m.scale - 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(m.scale * 100)}%`), await Re(m.currentPage);
    }), v.zoomFit?.addEventListener("click", async () => {
      if (!m.pdfDoc || !v.viewer) return;
      const x = (await m.pdfDoc.getPage(m.currentPage)).getViewport({ scale: 1 });
      m.scale = (v.viewer.clientWidth - 40) / x.width, v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(m.scale * 100)}%`), await Re(m.currentPage);
    });
  }
  function T() {
    return $().policyPreset?.value || "balanced";
  }
  function P(v) {
    return v >= 0.8 ? "bg-green-100 text-green-800" : v >= 0.6 ? "bg-blue-100 text-blue-800" : v >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function B(v) {
    return v >= 0.9 ? "bg-green-100 text-green-800" : v >= 0.7 ? "bg-blue-100 text-blue-800" : v >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Y(v) {
    return v ? v.split("_").map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(" ") : "Unknown";
  }
  function ie(v) {
    v.page_number !== m.currentPage && (m.currentPage = v.page_number, Re(v.page_number));
    const b = $().overlays;
    if (!b) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const x = document.createElement("div");
    x.id = "suggestion-preview-overlay", x.className = "absolute pointer-events-none animate-pulse", x.style.cssText = `
      left: ${v.x * m.scale}px;
      top: ${v.y * m.scale}px;
      width: ${v.width * m.scale}px;
      height: ${v.height * m.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, b.appendChild(x), setTimeout(() => x.remove(), 3e3);
  }
  async function ge(v, b) {
  }
  function ve() {
    const v = document.getElementById("placement-suggestions-modal");
    if (!v) return;
    const b = v.querySelectorAll('.suggestion-item[data-accepted="true"]');
    b.forEach((x) => {
      const H = Number.parseInt(x.dataset.index || "", 10), q = E.suggestions[H];
      if (!q) return;
      const V = f(q.field_definition_id);
      if (!V) return;
      const oe = C(q.field_definition_id);
      if (!oe || oe.classList.contains("opacity-50")) return;
      const ce = {
        definitionId: q.field_definition_id,
        fieldType: V.type,
        participantId: V.participant_id,
        participantName: oe.dataset.participantName || V.participant_name || "Unassigned"
      };
      m.currentPage = q.page_number, Qe(ce, q);
    }), m.pdfDoc && Re(m.currentPage), ge(b.length, E.suggestions.length - b.length), S(`Applied ${b.length} placement${b.length !== 1 ? "s" : ""}`, "success");
  }
  function re(v) {
    v.querySelectorAll(".accept-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const x = b.closest(".suggestion-item");
        x && (x.classList.add("border-green-500", "bg-green-50"), x.classList.remove("border-red-500", "bg-red-50"), x.dataset.accepted = "true");
      });
    }), v.querySelectorAll(".reject-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const x = b.closest(".suggestion-item");
        x && (x.classList.add("border-red-500", "bg-red-50"), x.classList.remove("border-green-500", "bg-green-50"), x.dataset.accepted = "false");
      });
    }), v.querySelectorAll(".preview-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const x = Number.parseInt(b.dataset.index || "", 10), H = E.suggestions[x];
        H && ie(H);
      });
    });
  }
  function X() {
    const v = document.createElement("div");
    return v.id = "placement-suggestions-modal", v.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", v.innerHTML = `
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
    `, U(v, "#close-suggestions-modal")?.addEventListener("click", () => {
      v.classList.add("hidden");
    }), v.addEventListener("click", (b) => {
      b.target === v && v.classList.add("hidden");
    }), U(v, "#accept-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-green-500", "bg-green-50"), b.classList.remove("border-red-500", "bg-red-50"), b.dataset.accepted = "true";
      });
    }), U(v, "#reject-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-red-500", "bg-red-50"), b.classList.remove("border-green-500", "bg-green-50"), b.dataset.accepted = "false";
      });
    }), U(v, "#apply-suggestions-btn")?.addEventListener("click", () => {
      ve(), v.classList.add("hidden");
    }), U(v, "#rerun-placement-btn")?.addEventListener("click", () => {
      v.classList.add("hidden");
      const b = _(v, "#placement-policy-preset-modal"), x = $().policyPreset;
      x && b && (x.value = b.value), $().autoPlaceBtn?.click();
    }), v;
  }
  function j(v) {
    let b = document.getElementById("placement-suggestions-modal");
    b || (b = X(), document.body.appendChild(b));
    const x = _(b, "#suggestions-list"), H = _(b, "#resolver-info"), q = _(b, "#run-stats");
    !x || !H || !q || (H.innerHTML = E.resolverScores.map((V) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${M(String(V?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${V.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${P(Number(V.score || 0))}">
              ${(Number(V?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), q.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${M(String(v?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${v.status === "completed" ? "text-green-600" : "text-amber-600"}">${M(String(v?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(v?.elapsed_ms || 0))}ms</span>
      </div>
    `, x.innerHTML = E.suggestions.map((V, oe) => {
      const ce = f(V.field_definition_id), Ae = Ut[ce?.type || "text"] || Ut.text, Be = M(String(ce?.type || "field").replace(/_/g, " ")), Te = M(String(V?.id || "")), $e = Math.max(1, Number(V?.page_number || 1)), tt = Math.round(Number(V?.x || 0)), Ue = Math.round(Number(V?.y || 0)), yt = Math.max(0, Number(V?.confidence || 0)), k = M(Y(String(V?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${oe}" data-suggestion-id="${Te}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Ae.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Be}</div>
                <div class="text-xs text-gray-500">Page ${$e}, (${tt}, ${Ue})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${B(Number(V.confidence || 0))}">
                ${(yt * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${k}
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
    }).join(""), re(b), b.classList.remove("hidden"));
  }
  function ee() {
    const v = R();
    let b = 100;
    v.forEach((x) => {
      const H = {
        definitionId: x.dataset.definitionId || "",
        fieldType: x.dataset.fieldType || "text",
        participantId: x.dataset.participantId || "",
        participantName: x.dataset.participantName || "Unassigned"
      }, q = Zt[H.fieldType || "text"] || Zt.text;
      m.currentPage = m.totalPages, we(H, 300, b + q.height / 2, { placementSource: vt.AUTO_FALLBACK }), b += q.height + 20;
    }), m.pdfDoc && Re(m.totalPages), S("Fields placed using fallback layout", "info");
  }
  async function Se() {
    const v = $();
    if (!v.autoPlaceBtn || E.isRunning) return;
    if (R().length === 0) {
      S("All fields are already placed", "info");
      return;
    }
    const x = document.querySelector('input[name="id"]')?.value;
    if (!x) {
      ee();
      return;
    }
    E.isRunning = !0, v.autoPlaceBtn.disabled = !0, v.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const H = await fetch(`${t}/esign/agreements/${x}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: T()
        })
      });
      if (!H.ok)
        throw await p(H, "Auto-placement failed");
      const q = await H.json(), V = Zs(q) ? q.run || {} : q;
      E.currentRunId = V?.run_id || V?.id || null, E.suggestions = V?.suggestions || [], E.resolverScores = V?.resolver_scores || [], E.suggestions.length === 0 ? (S("No placement suggestions found. Try placing fields manually.", "warning"), ee()) : j(V);
    } catch (H) {
      console.error("Auto-place error:", H);
      const q = H && typeof H == "object" ? H : {}, V = y(q.message || "Auto-placement failed", q.code || "", q.status || 0);
      S(`Auto-placement failed: ${V}`, "error"), ee();
    } finally {
      E.isRunning = !1, v.autoPlaceBtn.disabled = !1, v.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function ye() {
    const v = $();
    v.autoPlaceBtn && !m.autoPlaceBound && (v.autoPlaceBtn.addEventListener("click", () => {
      Se();
    }), m.autoPlaceBound = !0);
  }
  async function he() {
    const v = $();
    if (!n?.value) {
      v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden");
      return;
    }
    v.loading?.classList.remove("hidden"), v.noDocument?.classList.add("hidden");
    const b = r(), x = new Set(
      b.map((ce) => String(ce.definitionId || "").trim()).filter((ce) => ce)
    );
    m.fieldInstances = m.fieldInstances.filter(
      (ce) => x.has(String(ce.definitionId || "").trim())
    ), pe();
    const H = ++m.loadRequestVersion, q = String(n.value || "").trim(), V = encodeURIComponent(q), oe = `${e}/panels/esign_documents/${V}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const Ae = await window.pdfjsLib.getDocument({
        url: oe,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (H !== m.loadRequestVersion)
        return;
      m.pdfDoc = Ae, m.totalPages = m.pdfDoc.numPages, m.currentPage = 1, v.totalPages && (v.totalPages.textContent = String(m.totalPages)), await Re(m.currentPage), v.loading?.classList.add("hidden"), m.uiHandlersBound || (dt(v.viewer, v.overlays), fe(), Ie(), m.uiHandlersBound = !0), de();
    } catch (ce) {
      if (H !== m.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", ce), v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden"), v.noDocument) {
        const Ae = ce && typeof ce == "object" ? ce : {};
        v.noDocument.textContent = `Failed to load PDF: ${y(Ae.message || "Failed to load PDF")}`;
      }
    }
    ue(), le({ silent: !0 });
  }
  function Ce(v) {
    const b = Array.isArray(v?.fieldPlacements) ? v.fieldPlacements : [];
    m.fieldInstances = b.map((x, H) => Kt(x, H)), le({ silent: !0 });
  }
  return le({ silent: !0 }), {
    bindEvents: ye,
    initPlacementEditor: he,
    getState: te,
    getLinkGroupState: N,
    setLinkGroupState: Z,
    buildPlacementFormEntries: me,
    updateFieldInstancesFormData: le,
    restoreFieldPlacementsFromState: Ce
  };
}
function Ft(i, e, t = "") {
  return String(i.querySelector(e)?.value || t).trim();
}
function si(i, e, t = !1) {
  const n = i.querySelector(e);
  return n ? n.checked : t;
}
function tr(i) {
  const {
    documentIdInput: e,
    documentPageCountInput: t,
    titleInput: n,
    messageInput: s,
    participantsContainer: o,
    fieldDefinitionsContainer: c,
    fieldPlacementsJSONInput: r,
    fieldRulesJSONInput: f,
    collectFieldRulesForForm: p,
    buildPlacementFormEntries: y,
    getCurrentStep: S,
    totalWizardSteps: M
  } = i;
  function L() {
    const m = [];
    o.querySelectorAll(".participant-entry").forEach((R) => {
      const U = String(R.getAttribute("data-participant-id") || "").trim(), _ = Ft(R, 'input[name*=".name"]'), $ = Ft(R, 'input[name*=".email"]'), te = Ft(R, 'select[name*=".role"]', "signer"), N = si(R, ".notify-input", !0), Z = Ft(R, ".signing-stage-input"), me = Number(Z || "1") || 1;
      m.push({
        id: U,
        name: _,
        email: $,
        role: te,
        notify: N,
        signing_stage: te === "signer" ? me : 0
      });
    });
    const E = [];
    c.querySelectorAll(".field-definition-entry").forEach((R) => {
      const U = String(R.getAttribute("data-field-definition-id") || "").trim(), _ = Ft(R, ".field-type-select", "signature"), $ = Ft(R, ".field-participant-select"), te = Number(Ft(R, 'input[name*=".page"]', "1")) || 1, N = si(R, 'input[name*=".required"]');
      U && E.push({
        id: U,
        type: _,
        participant_id: $,
        page: te,
        required: N
      });
    });
    const w = y(), C = JSON.stringify(w);
    return r && (r.value = C), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(s?.value || "").trim(),
      participants: m,
      field_instances: E,
      field_placements: w,
      field_placements_json: C,
      field_rules: p(),
      field_rules_json: String(f?.value || "[]"),
      send_for_signature: S() === M ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(t?.value || "0") || 0
    };
  }
  return {
    buildCanonicalAgreementPayload: L
  };
}
function nr(i) {
  const {
    titleSource: e,
    stateManager: t,
    trackWizardStateChanges: n,
    participantsController: s,
    fieldDefinitionsController: o,
    placementController: c,
    updateFieldParticipantOptions: r,
    previewCard: f,
    wizardNavigationController: p,
    documentIdInput: y,
    documentPageCountInput: S,
    selectedDocumentTitle: M,
    agreementRefs: L,
    parsePositiveInt: m,
    isEditMode: E
  } = i;
  let w = null;
  function C() {
    w !== null && clearTimeout(w), w = setTimeout(() => {
      n();
    }, 500);
  }
  function R() {
    s.restoreFromState(t.getState());
  }
  function U() {
    o.restoreFieldDefinitionsFromState(t.getState());
  }
  function _() {
    o.restoreFieldRulesFromState(t.getState());
  }
  function $() {
    c.restoreFieldPlacementsFromState(t.getState());
  }
  function te() {
    y && new MutationObserver(() => {
      n();
    }).observe(y, { attributes: !0, attributeFilter: ["value"] });
    const Z = document.getElementById("title"), me = document.getElementById("message");
    Z instanceof HTMLInputElement && Z.addEventListener("input", () => {
      const le = String(Z.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(le), C();
    }), (me instanceof HTMLInputElement || me instanceof HTMLTextAreaElement) && me.addEventListener("input", C), s.refs.participantsContainer?.addEventListener("input", C), s.refs.participantsContainer?.addEventListener("change", C), o.refs.fieldDefinitionsContainer?.addEventListener("input", C), o.refs.fieldDefinitionsContainer?.addEventListener("change", C), o.refs.fieldRulesContainer?.addEventListener("input", C), o.refs.fieldRulesContainer?.addEventListener("change", C);
  }
  function N() {
    if (window._resumeToStep) {
      R(), U(), _(), r(), $();
      const Z = t.getState();
      Z.document?.id && f.setDocument(
        Z.document.id,
        Z.document.title || null,
        Z.document.pageCount ?? null
      ), p.setCurrentStep(window._resumeToStep), p.updateWizardUI(), delete window._resumeToStep;
    } else if (p.updateWizardUI(), y.value) {
      const Z = M?.textContent || null, me = m(S?.value, 0) || null;
      f.setDocument(y.value, Z, me);
    }
    E && L.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: te,
    debouncedTrackChanges: C,
    renderInitialWizardUI: N
  };
}
function ir(i) {
  return i.querySelector('select[name*=".role"]');
}
function sr(i) {
  return i.querySelector(".field-participant-select");
}
function rr(i) {
  const {
    documentIdInput: e,
    titleInput: t,
    participantsContainer: n,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: o,
    addFieldBtn: c,
    ensureSelectedDocumentCompatibility: r,
    collectFieldRulesForState: f,
    findSignersMissingRequiredSignatureField: p,
    missingSignatureFieldMessage: y,
    announceError: S
  } = i;
  function M(L) {
    switch (L) {
      case 1:
        return e.value ? !!r() : (S("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (S("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const m = n.querySelectorAll(".participant-entry");
        if (m.length === 0)
          return S("Please add at least one participant"), !1;
        let E = !1;
        return m.forEach((w) => {
          ir(w)?.value === "signer" && (E = !0);
        }), E ? !0 : (S("At least one signer is required"), !1);
      }
      case 4: {
        const m = s.querySelectorAll(".field-definition-entry");
        for (const R of Array.from(m)) {
          const U = sr(R);
          if (!U?.value)
            return S("Please assign all fields to a signer"), U?.focus(), !1;
        }
        if (f().find((R) => !R.participantId))
          return S("Please assign all automation rules to a signer"), o?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const C = p();
        return C.length > 0 ? (S(y(C)), c.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: M
  };
}
function ar(i) {
  const {
    isEditMode: e,
    storageKey: t,
    stateManager: n,
    syncOrchestrator: s,
    syncService: o,
    hasMeaningfulWizardProgress: c,
    formatRelativeTime: r,
    emitWizardTelemetry: f,
    getActiveTabDebugState: p
  } = i;
  function y(_, $) {
    return n.normalizeLoadedState({
      ...$,
      currentStep: _.currentStep,
      document: _.document,
      details: _.details,
      participants: _.participants,
      fieldDefinitions: _.fieldDefinitions,
      fieldPlacements: _.fieldPlacements,
      fieldRules: _.fieldRules,
      titleSource: _.titleSource,
      syncPending: !0,
      serverDraftId: $.serverDraftId,
      serverRevision: $.serverRevision,
      lastSyncedAt: $.lastSyncedAt
    });
  }
  async function S() {
    if (e) return n.getState();
    const _ = n.normalizeLoadedState(n.getState());
    it("resume_reconcile_start", Ee({
      state: _,
      storageKey: t,
      ownership: p?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const $ = String(_?.serverDraftId || "").trim();
    if (!$)
      return n.setState(_, { syncPending: !!_.syncPending, notify: !1 }), it("resume_reconcile_complete", Ee({
        state: _,
        storageKey: t,
        ownership: p?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), n.getState();
    try {
      const te = await o.load($), N = n.normalizeLoadedState({
        ...te?.wizard_state && typeof te.wizard_state == "object" ? te.wizard_state : {},
        serverDraftId: String(te?.id || $).trim() || $,
        serverRevision: Number(te?.revision || 0),
        lastSyncedAt: String(te?.updated_at || te?.updatedAt || "").trim() || _.lastSyncedAt,
        syncPending: !1
      }), Z = String(_.serverDraftId || "").trim() === String(N.serverDraftId || "").trim(), me = Z && _.syncPending === !0 ? y(_, N) : N;
      return n.setState(me, { syncPending: !!me.syncPending, notify: !1 }), it("resume_reconcile_complete", Ee({
        state: me,
        storageKey: t,
        ownership: p?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: Z && _.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(te?.id || $).trim() || null,
          loadedRevision: Number(te?.revision || 0)
        }
      })), n.getState();
    } catch (te) {
      const N = typeof te == "object" && te !== null && "status" in te ? Number(te.status || 0) : 0;
      if (N === 404) {
        const Z = n.normalizeLoadedState({
          ..._,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return n.setState(Z, { syncPending: !!Z.syncPending, notify: !1 }), mt("resume_reconcile_remote_missing", Ee({
          state: Z,
          storageKey: t,
          ownership: p?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: $,
            status: N
          }
        })), n.getState();
      }
      return mt("resume_reconcile_failed", Ee({
        state: _,
        storageKey: t,
        ownership: p?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: $,
          status: N
        }
      })), n.getState();
    }
  }
  function M(_) {
    return document.getElementById(_);
  }
  function L() {
    const _ = document.getElementById("resume-dialog-modal"), $ = n.getState(), te = String($?.document?.title || "").trim() || String($?.document?.id || "").trim() || "Unknown document", N = M("resume-draft-title"), Z = M("resume-draft-document"), me = M("resume-draft-step"), le = M("resume-draft-time");
    N && (N.textContent = $.details?.title || "Untitled Agreement"), Z && (Z.textContent = te), me && (me.textContent = String($.currentStep || 1)), le && (le.textContent = r($.updatedAt)), _?.classList.remove("hidden"), f("wizard_resume_prompt_shown", {
      step: Number($.currentStep || 1),
      has_server_draft: !!$.serverDraftId
    });
  }
  async function m(_ = {}) {
    const $ = _.deleteServerDraft === !0, te = String(n.getState()?.serverDraftId || "").trim();
    if (n.clear(), s.broadcastStateUpdate(), !(!$ || !te))
      try {
        await o.delete(te);
      } catch (N) {
        console.warn("Failed to delete server draft:", N);
      }
  }
  function E() {
    return n.normalizeLoadedState({
      ...n.getState(),
      ...n.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function w(_) {
    c(_) && (n.setState(_, { syncPending: !0 }), s.scheduleSync(), s.broadcastStateUpdate());
  }
  async function C(_) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const $ = E();
    switch (_) {
      case "continue":
        n.restoreFormState(), window._resumeToStep = n.getState().currentStep;
        return;
      case "start_new":
        await m({ deleteServerDraft: !1 }), w($);
        return;
      case "proceed":
        await m({ deleteServerDraft: !0 }), w($);
        return;
      case "discard":
        await m({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  function R() {
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
  async function U() {
    e || (await S(), n.hasResumableState() && L());
  }
  return {
    bindEvents: R,
    reconcileBootstrapState: S,
    maybeShowResumeDialog: U
  };
}
function or(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let s = "saved";
  function o(L) {
    if (!L) return "unknown";
    const m = new Date(L), w = (/* @__PURE__ */ new Date()).getTime() - m.getTime(), C = Math.floor(w / 6e4), R = Math.floor(w / 36e5), U = Math.floor(w / 864e5);
    return C < 1 ? "just now" : C < 60 ? `${C} minute${C !== 1 ? "s" : ""} ago` : R < 24 ? `${R} hour${R !== 1 ? "s" : ""} ago` : U < 7 ? `${U} day${U !== 1 ? "s" : ""} ago` : m.toLocaleDateString();
  }
  function c() {
    const L = n.getState();
    s === "paused" && r(L?.syncPending ? "pending" : "saved");
  }
  function r(L) {
    s = String(L || "").trim() || "saved";
    const m = e.sync.indicator, E = e.sync.icon, w = e.sync.text, C = e.sync.retryBtn;
    if (!(!m || !E || !w))
      switch (m.classList.remove("hidden"), L) {
        case "saved":
          E.className = "w-2 h-2 rounded-full bg-green-500", w.textContent = "Saved", w.className = "text-gray-600", C?.classList.add("hidden");
          break;
        case "saving":
          E.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", w.textContent = "Saving...", w.className = "text-gray-600", C?.classList.add("hidden");
          break;
        case "pending":
          E.className = "w-2 h-2 rounded-full bg-gray-400", w.textContent = "Unsaved changes", w.className = "text-gray-500", C?.classList.add("hidden");
          break;
        case "error":
          E.className = "w-2 h-2 rounded-full bg-amber-500", w.textContent = "Not synced", w.className = "text-amber-600", C?.classList.remove("hidden");
          break;
        case "paused":
          E.className = "w-2 h-2 rounded-full bg-slate-400", w.textContent = "Open in another tab", w.className = "text-slate-600", C?.classList.add("hidden");
          break;
        case "conflict":
          E.className = "w-2 h-2 rounded-full bg-red-500", w.textContent = "Conflict", w.className = "text-red-600", C?.classList.add("hidden");
          break;
        default:
          m.classList.add("hidden");
      }
  }
  function f(L) {
    const m = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = o(m.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(L || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function p(L, m = "", E = 0) {
    const w = String(m || "").trim().toUpperCase(), C = String(L || "").trim().toLowerCase();
    return w === "DRAFT_SEND_NOT_FOUND" || w === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : w === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : w === "SCOPE_DENIED" || C.includes("scope denied") ? "You don't have access to this organization's resources." : w === "TRANSPORT_SECURITY" || w === "TRANSPORT_SECURITY_REQUIRED" || C.includes("tls transport required") || Number(E) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : w === "PDF_UNSUPPORTED" || C === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(L || "").trim() !== "" ? String(L).trim() : "Something went wrong. Please try again.";
  }
  async function y(L, m = "") {
    const E = Number(L?.status || 0);
    let w = "", C = "", R = {};
    try {
      const U = await L.json();
      w = String(U?.error?.code || U?.code || "").trim(), C = String(U?.error?.message || U?.message || "").trim(), R = U?.error?.details && typeof U.error.details == "object" ? U.error.details : {}, String(R?.entity || "").trim().toLowerCase() === "drafts" && String(w).trim().toUpperCase() === "NOT_FOUND" && (w = "DRAFT_SEND_NOT_FOUND", C === "" && (C = "Draft not found"));
    } catch {
      C = "";
    }
    return C === "" && (C = m || `Request failed (${E || "unknown"})`), {
      status: E,
      code: w,
      details: R,
      message: p(C, w, E)
    };
  }
  function S(L, m = "", E = 0) {
    const w = p(L, m, E);
    t && (t.textContent = w), window.toastManager?.error ? window.toastManager.error(w) : alert(w);
  }
  async function M(L, m = {}) {
    const E = await L;
    return E?.blocked && E.reason === "passive_tab" ? (S(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), E) : (E?.error && String(m.errorMessage || "").trim() !== "" && S(m.errorMessage || ""), E);
  }
  return {
    announceError: S,
    formatRelativeTime: o,
    mapUserFacingError: p,
    parseAPIError: y,
    restoreSyncStatusFromState: c,
    showSyncConflictDialog: f,
    surfaceSyncOutcome: M,
    updateSyncStatus: r
  };
}
function cr(i) {
  const {
    createSuccess: e,
    stateManager: t,
    syncOrchestrator: n,
    syncService: s,
    surfaceSyncOutcome: o,
    announceError: c,
    getCurrentStep: r,
    reviewStep: f,
    onReviewStepRequested: p,
    updateActiveTabOwnershipUI: y
  } = i;
  function S() {
    const E = t.collectFormState();
    t.updateState(E), n.scheduleSync(), n.broadcastStateUpdate();
  }
  function M() {
    if (!e)
      return;
    const w = t.getState()?.serverDraftId;
    t.clear(), n.broadcastStateUpdate(), w && s.delete(w).catch((C) => {
      console.warn("Failed to delete server draft after successful create:", C);
    });
  }
  function L() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await o(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      const E = t.getState();
      if (E.serverDraftId)
        try {
          const w = await s.load(E.serverDraftId);
          w.wizard_state && (t.setState({
            ...w.wizard_state,
            serverDraftId: w.id,
            serverRevision: w.revision,
            syncPending: !1
          }, { syncPending: !1 }), window.location.reload());
        } catch (w) {
          console.error("Failed to load server draft:", w);
        }
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const E = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      t.setState({
        ...t.getState(),
        serverRevision: E,
        syncPending: !0
      }, { syncPending: !0 });
      const w = await o(n.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (w?.success || w?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  function m() {
    document.getElementById("active-tab-take-control-btn")?.addEventListener("click", async () => {
      if (!n.takeControl()) {
        c("This agreement is active in another tab. Take control here before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED");
        return;
      }
      y({ isOwner: !0 }), t.getState()?.syncPending && await o(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      }), r() === f && p();
    }), document.getElementById("active-tab-reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
  }
  return {
    bindOwnershipHandlers: m,
    bindRetryAndConflictHandlers: L,
    handleCreateSuccessCleanup: M,
    trackWizardStateChanges: S
  };
}
const _t = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function Ci(i, e = _t.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === _t.USER ? _t.USER : t === _t.SERVER_SEED ? _t.SERVER_SEED : t === _t.AUTOFILL ? _t.AUTOFILL : e;
}
function lr(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), s = String(t.email ?? "").trim(), o = String(t.role ?? "signer").trim().toLowerCase(), c = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), r = t.notify !== !1;
  return n !== "" || s !== "" || o !== "" && o !== "signer" || Number.isFinite(c) && c > 1 || !r ? !0 : e > 0;
}
function ri(i, e = {}) {
  const {
    normalizeTitleSource: t = Ci,
    titleSource: n = _t
  } = e;
  if (!i || typeof i != "object") return !1;
  const s = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(s) && s > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const c = String(i.details?.title ?? "").trim(), r = String(i.details?.message ?? "").trim(), f = t(
    i.titleSource,
    c === "" ? n.AUTOFILL : n.USER
  );
  return !!(c !== "" && f !== n.SERVER_SEED || r !== "" || (Array.isArray(i.participants) ? i.participants : []).some((S, M) => lr(S, M)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function dr(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), o = /\/v\d+$/i.test(s) ? s : `${s}/v1`, c = `${o}/esign/drafts`, r = !!e.is_edit, f = !!e.create_success, p = String(e.user_id || "").trim(), y = String(e.submit_mode || "json").trim().toLowerCase(), S = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, M = Array.isArray(e.initial_participants) ? e.initial_participants : [], L = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], m = {
    base_path: t,
    api_base_path: n,
    user_id: p,
    is_edit: r,
    create_success: f,
    submit_mode: y,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: S
    },
    initial_participants: M,
    initial_field_instances: L
  };
  return {
    config: e,
    normalizedConfig: m,
    basePath: t,
    apiBase: n,
    apiVersionBase: o,
    draftsEndpoint: c,
    isEditMode: r,
    createSuccess: f,
    currentUserID: p,
    submitMode: y,
    documentsUploadURL: S,
    initialParticipants: M,
    initialFieldInstances: L
  };
}
function ur(i) {
  function e(n) {
    if (!i) return n;
    const s = n.includes("?") ? "&" : "?";
    return `${n}${s}user_id=${encodeURIComponent(i)}`;
  }
  function t(n = !0) {
    const s = { Accept: "application/json" };
    return n && (s["Content-Type"] = "application/json"), i && (s["X-User-ID"] = i), s;
  }
  return {
    draftEndpointWithUserID: e,
    draftRequestHeaders: t
  };
}
function pr(i = {}) {
  const {
    config: e = {},
    currentUserID: t = "",
    isEditMode: n = !1
  } = i, s = n ? "edit" : "create", o = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), c = [
    s,
    t || "anonymous",
    o || "agreement-form"
  ].join("|");
  return {
    WIZARD_STATE_VERSION: 1,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v1:${encodeURIComponent(c)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(c)}`,
    LEGACY_WIZARD_STORAGE_KEY: "esign_wizard_state_v1",
    SYNC_DEBOUNCE_MS: 2e3,
    SYNC_RETRY_DELAYS: [1e3, 2e3, 5e3, 1e4, 3e4],
    WIZARD_STORAGE_MIGRATION_VERSION: 1,
    ACTIVE_TAB_STORAGE_KEY: `esign_wizard_active_tab_v1:${encodeURIComponent(c)}`,
    ACTIVE_TAB_HEARTBEAT_MS: 5e3,
    ACTIVE_TAB_STALE_MS: 2e4,
    TITLE_SOURCE: _t
  };
}
function Sn(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function ai(i, e = "info") {
  const t = document.createElement("div");
  t.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${e === "success" ? "bg-green-600 text-white" : e === "error" ? "bg-red-600 text-white" : e === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, t.textContent = i, document.body.appendChild(t), setTimeout(() => {
    t.style.opacity = "0", setTimeout(() => t.remove(), 300);
  }, 3e3);
}
function Ht(i, e) {
  if (!i)
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function gr(i, e) {
  if (!(i instanceof HTMLButtonElement))
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function mr(i = {}) {
  const {
    config: e,
    normalizedConfig: t,
    basePath: n,
    apiBase: s,
    apiVersionBase: o,
    draftsEndpoint: c,
    isEditMode: r,
    createSuccess: f,
    currentUserID: p,
    submitMode: y,
    documentsUploadURL: S,
    initialParticipants: M,
    initialFieldInstances: L
  } = dr(i), {
    draftEndpointWithUserID: m,
    draftRequestHeaders: E
  } = ur(p), w = Ls(document), {
    WIZARD_STATE_VERSION: C,
    WIZARD_STORAGE_KEY: R,
    WIZARD_CHANNEL_NAME: U,
    LEGACY_WIZARD_STORAGE_KEY: _,
    SYNC_DEBOUNCE_MS: $,
    SYNC_RETRY_DELAYS: te,
    WIZARD_STORAGE_MIGRATION_VERSION: N,
    ACTIVE_TAB_STORAGE_KEY: Z,
    ACTIVE_TAB_HEARTBEAT_MS: me,
    ACTIVE_TAB_STALE_MS: le,
    TITLE_SOURCE: ue
  } = pr({
    config: e,
    currentUserID: p,
    isEditMode: r
  }), Ne = Ms(), Ze = (z, _e = ue.AUTOFILL) => Ci(z, _e), lt = (z) => ri(z, {
    normalizeTitleSource: Ze,
    titleSource: ue
  }), rt = Is({
    apiBasePath: o,
    basePath: n
  }), at = w.form.root, et = gr(w.form.submitBtn, "submit button"), We = w.form.announcements;
  let Le = null, pe = null, Me = null, Ke = null, Re = null, nt = null, ae = null, W = null, de = ln();
  const we = () => Ke?.debouncedTrackChanges?.(), Qe = () => W?.trackWizardStateChanges?.(), ze = (z) => ae?.formatRelativeTime(z) || "unknown", ot = () => ae?.restoreSyncStatusFromState(), gt = (z) => ae?.updateSyncStatus(z), dt = (z) => ae?.showSyncConflictDialog(z), fe = (z, _e = "", ct = 0) => ae?.mapUserFacingError(z, _e, ct) || String(z || "").trim(), Ie = (z, _e) => ae ? ae.parseAPIError(z, _e) : Promise.resolve({ status: Number(z.status || 0), code: "", details: {}, message: _e }), T = (z, _e = "", ct = 0) => ae?.announceError(z, _e, ct), P = (z, _e = {}) => ae ? ae.surfaceSyncOutcome(z, _e) : Promise.resolve({}), B = () => ({
    isOwner: j?.isOwner ?? ee.isOwner,
    claim: j?.currentClaim ?? ee.currentClaim,
    blockedReason: j?.lastBlockedReason ?? ee.lastBlockedReason
  }), Y = As(w, {
    formatRelativeTime: ze
  }), ie = (z = {}) => Y.render(z), ge = async (z, _e) => {
    const ct = await Ie(z, _e), Lt = new Error(ct.message);
    return Lt.code = ct.code, Lt.status = ct.status, Lt;
  }, ve = {
    hasResumableState: () => re.hasResumableState(),
    setTitleSource: (z, _e) => re.setTitleSource(z, _e),
    updateDocument: (z) => re.updateDocument(z),
    updateDetails: (z, _e) => re.updateDetails(z, _e),
    getState: () => {
      const z = re.getState();
      return {
        titleSource: z.titleSource,
        details: z.details && typeof z.details == "object" ? z.details : {}
      };
    }
  }, re = new Ts({
    storageKey: R,
    legacyStorageKey: _,
    stateVersion: C,
    storageMigrationVersion: N,
    totalWizardSteps: Jt,
    titleSource: ue,
    normalizeTitleSource: Ze,
    parsePositiveInt: Xe,
    hasMeaningfulWizardProgress: lt,
    collectFormState: () => {
      const z = w.form.documentIdInput?.value || null, _e = document.getElementById("selected-document-title")?.textContent?.trim() || null, ct = Ze(
        re.getState()?.titleSource,
        String(w.form.titleInput?.value || "").trim() === "" ? ue.AUTOFILL : ue.USER
      );
      return {
        document: {
          id: z,
          title: _e,
          pageCount: parseInt(w.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: w.form.titleInput?.value || "",
          message: w.form.messageInput?.value || ""
        },
        titleSource: ct,
        participants: Le?.collectParticipantsForState?.() || [],
        fieldDefinitions: pe?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: Me?.getState?.()?.fieldInstances || [],
        fieldRules: pe?.collectFieldRulesForState?.() || []
      };
    },
    restoreDocumentState: (z) => {
      if (!z?.document?.id) return;
      const _e = document.getElementById("selected-document"), ct = document.getElementById("document-picker"), Lt = document.getElementById("selected-document-title"), Ot = document.getElementById("selected-document-info");
      w.form.documentIdInput.value = z.document.id, Lt && (Lt.textContent = z.document.title || "Selected Document"), Ot && (Ot.textContent = z.document.pageCount ? `${z.document.pageCount} pages` : ""), w.form.documentPageCountInput && z.document.pageCount && (w.form.documentPageCountInput.value = String(z.document.pageCount)), _e && _e.classList.remove("hidden"), ct && ct.classList.add("hidden");
    },
    restoreDetailsState: (z) => {
      w.form.titleInput.value = z?.details?.title || "", w.form.messageInput.value = z?.details?.message || "";
    },
    emitTelemetry: Ne
  });
  re.start(), ae = or({
    agreementRefs: w,
    formAnnouncements: We,
    stateManager: re
  });
  const X = new _s({
    stateManager: re,
    currentUserID: p,
    draftsEndpoint: c,
    draftEndpointWithUserID: m,
    draftRequestHeaders: E
  });
  let j;
  const ee = new Ps({
    storageKey: Z,
    channelName: U,
    heartbeatMs: me,
    staleMs: le,
    telemetry: Ne,
    onOwnershipChange: (z) => {
      z.isOwner ? ot() : gt("paused"), Y.render(z);
    },
    onRemoteState: (z) => {
      if (re.applyRemoteState(z, {
        save: !0,
        notify: !1
      }).replacedLocalState) {
        const ct = nt?.reconcileBootstrapState?.();
        ct ? ct.then(() => {
          re.notifyListeners();
        }) : re.notifyListeners();
      } else
        re.notifyListeners();
    },
    onRemoteSync: (z, _e) => {
      re.applyRemoteSync(z, _e, {
        save: !0,
        notify: !0
      });
    },
    onVisibilityHidden: () => {
      j?.forceSync({ keepalive: !0 });
    },
    onPageHide: () => {
      j?.forceSync({ keepalive: !0 });
    },
    onBeforeUnload: () => {
      j?.forceSync({ keepalive: !0 });
    }
  });
  j = new Ds({
    stateManager: re,
    syncService: X,
    activeTabController: ee,
    storageKey: R,
    statusUpdater: gt,
    showConflictDialog: dt,
    syncDebounceMs: $,
    syncRetryDelays: te,
    currentUserID: p,
    draftsEndpoint: c,
    draftEndpointWithUserID: m,
    draftRequestHeaders: E
  });
  const ye = Es({
    context: {
      config: t,
      refs: w,
      basePath: n,
      apiBase: s,
      apiVersionBase: o,
      draftsEndpoint: c,
      previewCard: rt,
      emitTelemetry: Ne,
      stateManager: re,
      syncService: X,
      activeTabController: ee,
      syncController: j
    },
    hooks: {
      renderInitialUI() {
        Ke?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        nt?.maybeShowResumeDialog?.(), he.loadDocuments(), he.loadRecentDocuments();
      },
      destroy() {
        Y.destroy(), re.destroy();
      }
    }
  }), he = Gs({
    apiBase: s,
    apiVersionBase: o,
    currentUserID: p,
    documentsUploadURL: S,
    isEditMode: r,
    titleSource: ue,
    normalizeTitleSource: Ze,
    stateManager: ve,
    previewCard: rt,
    parseAPIError: ge,
    announceError: T,
    showToast: ai,
    mapUserFacingError: fe,
    renderFieldRulePreview: () => pe?.renderFieldRulePreview?.()
  });
  he.initializeTitleSourceSeed(), he.bindEvents();
  const Ce = Ht(he.refs.documentIdInput, "document id input"), v = Ht(he.refs.documentSearch, "document search input"), b = he.refs.selectedDocumentTitle, x = he.refs.documentPageCountInput, H = he.ensureSelectedDocumentCompatibility, q = he.getCurrentDocumentPageCount;
  Le = Ws({
    initialParticipants: M,
    onParticipantsChanged: () => pe?.updateFieldParticipantOptions?.()
  }), Le.initialize(), Le.bindEvents();
  const V = Ht(Le.refs.participantsContainer, "participants container"), oe = Ht(Le.refs.addParticipantBtn, "add participant button"), ce = () => Le?.getSignerParticipants() || [];
  pe = Qs({
    initialFieldInstances: L,
    placementSource: vt,
    getCurrentDocumentPageCount: q,
    getSignerParticipants: ce,
    escapeHtml: Sn,
    onDefinitionsChanged: () => we(),
    onRulesChanged: () => we(),
    onParticipantsChanged: () => pe?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => Me?.getLinkGroupState?.() || de,
    setPlacementLinkGroupState: (z) => {
      de = z || ln(), Me?.setLinkGroupState?.(de);
    }
  }), pe.bindEvents(), pe.initialize();
  const Ae = Ht(pe.refs.fieldDefinitionsContainer, "field definitions container"), Be = pe.refs.fieldRulesContainer, Te = Ht(pe.refs.addFieldBtn, "add field button"), $e = pe.refs.fieldPlacementsJSONInput, tt = pe.refs.fieldRulesJSONInput, Ue = () => pe?.collectFieldRulesForState() || [], yt = () => pe?.collectFieldRulesForState() || [], k = () => pe?.collectFieldRulesForForm() || [], F = (z, _e) => pe?.expandRulesForPreview(z, _e) || [], O = () => pe?.updateFieldParticipantOptions(), Q = () => pe.collectPlacementFieldDefinitions(), se = (z) => pe?.getFieldDefinitionById(z) || null, J = () => pe?.findSignersMissingRequiredSignatureField() || [], je = (z) => pe?.missingSignatureFieldMessage(z) || "", He = $s({
    documentIdInput: Ce,
    selectedDocumentTitle: b,
    participantsContainer: V,
    fieldDefinitionsContainer: Ae,
    submitBtn: et,
    syncOrchestrator: j,
    escapeHtml: Sn,
    getSignerParticipants: ce,
    getCurrentDocumentPageCount: q,
    collectFieldRulesForState: yt,
    expandRulesForPreview: F,
    findSignersMissingRequiredSignatureField: J,
    goToStep: (z) => Je.goToStep(z)
  });
  Me = er({
    apiBase: s,
    apiVersionBase: o,
    documentIdInput: Ce,
    fieldPlacementsJSONInput: $e,
    initialFieldInstances: pe.buildInitialPlacementInstances(),
    initialLinkGroupState: de,
    collectPlacementFieldDefinitions: Q,
    getFieldDefinitionById: se,
    parseAPIError: ge,
    mapUserFacingError: fe,
    showToast: ai,
    escapeHtml: Sn,
    onPlacementsChanged: () => Qe()
  }), Me.bindEvents(), de = Me.getLinkGroupState();
  const Je = Fs({
    totalWizardSteps: Jt,
    wizardStep: st,
    nextStepLabels: gs,
    submitBtn: et,
    syncOrchestrator: j,
    previewCard: rt,
    updateActiveTabOwnershipUI: ie,
    validateStep: (z) => Re?.validateStep(z) !== !1,
    onPlacementStep() {
      Me.initPlacementEditor();
    },
    onReviewStep() {
      He.initSendReadinessCheck();
    },
    onStepChanged(z) {
      re.updateStep(z), Qe(), j.forceSync();
    }
  });
  Je.bindEvents(), W = cr({
    createSuccess: f,
    stateManager: re,
    syncOrchestrator: j,
    syncService: X,
    surfaceSyncOutcome: P,
    announceError: T,
    getCurrentStep: () => Je.getCurrentStep(),
    reviewStep: st.REVIEW,
    onReviewStepRequested: () => He.initSendReadinessCheck(),
    updateActiveTabOwnershipUI: ie
  }), W.handleCreateSuccessCleanup(), W.bindRetryAndConflictHandlers(), W.bindOwnershipHandlers();
  const Oe = tr({
    documentIdInput: Ce,
    documentPageCountInput: x,
    titleInput: w.form.titleInput,
    messageInput: w.form.messageInput,
    participantsContainer: V,
    fieldDefinitionsContainer: Ae,
    fieldPlacementsJSONInput: $e,
    fieldRulesJSONInput: tt,
    collectFieldRulesForForm: () => k(),
    buildPlacementFormEntries: () => Me?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => Je.getCurrentStep(),
    totalWizardSteps: Jt
  }), Ye = () => Oe.buildCanonicalAgreementPayload();
  return Ke = nr({
    titleSource: ue,
    stateManager: re,
    trackWizardStateChanges: Qe,
    participantsController: Le,
    fieldDefinitionsController: pe,
    placementController: Me,
    updateFieldParticipantOptions: O,
    previewCard: rt,
    wizardNavigationController: Je,
    documentIdInput: Ce,
    documentPageCountInput: x,
    selectedDocumentTitle: b,
    agreementRefs: w,
    parsePositiveInt: Xe,
    isEditMode: r
  }), Ke.bindChangeTracking(), Re = rr({
    documentIdInput: Ce,
    titleInput: w.form.titleInput,
    participantsContainer: V,
    fieldDefinitionsContainer: Ae,
    fieldRulesContainer: Be,
    addFieldBtn: Te,
    ensureSelectedDocumentCompatibility: H,
    collectFieldRulesForState: Ue,
    findSignersMissingRequiredSignatureField: J,
    missingSignatureFieldMessage: je,
    announceError: T
  }), nt = ar({
    isEditMode: r,
    storageKey: R,
    stateManager: re,
    syncOrchestrator: j,
    syncService: X,
    hasMeaningfulWizardProgress: ri,
    formatRelativeTime: ze,
    emitWizardTelemetry: (z, _e) => Ne(z, _e),
    getActiveTabDebugState: B
  }), nt.bindEvents(), Os({
    config: e,
    form: at,
    submitBtn: et,
    documentIdInput: Ce,
    documentSearch: v,
    participantsContainer: V,
    addParticipantBtn: oe,
    fieldDefinitionsContainer: Ae,
    fieldRulesContainer: Be,
    documentPageCountInput: x,
    fieldPlacementsJSONInput: $e,
    fieldRulesJSONInput: tt,
    currentUserID: p,
    storageKey: R,
    draftsEndpoint: c,
    draftEndpointWithUserID: m,
    draftRequestHeaders: E,
    syncService: X,
    syncOrchestrator: j,
    stateManager: re,
    submitMode: y,
    totalWizardSteps: Jt,
    wizardStep: st,
    getCurrentStep: () => Je.getCurrentStep(),
    getPlacementState: () => Me.getState(),
    getCurrentDocumentPageCount: q,
    ensureSelectedDocumentCompatibility: H,
    collectFieldRulesForState: Ue,
    collectFieldRulesForForm: k,
    expandRulesForPreview: F,
    findSignersMissingRequiredSignatureField: J,
    missingSignatureFieldMessage: je,
    getSignerParticipants: ce,
    buildCanonicalAgreementPayload: Ye,
    announceError: T,
    emitWizardTelemetry: Ne,
    parseAPIError: Ie,
    goToStep: (z) => Je.goToStep(z),
    surfaceSyncOutcome: P,
    getActiveTabDebugState: B,
    addFieldBtn: Te
  }).bindEvents(), ye;
}
let dn = null;
function hr() {
  dn?.destroy(), dn = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function fr(i = {}) {
  if (dn)
    return;
  const e = mr(i);
  e.start(), dn = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function vr(i) {
  return {
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
class Ei {
  constructor(e) {
    this.initialized = !1, this.config = vr(e);
  }
  init() {
    this.initialized || (this.initialized = !0, fr(this.config));
  }
  destroy() {
    hr(), this.initialized = !1;
  }
}
function Pa(i) {
  const e = new Ei(i);
  return De(() => e.init()), e;
}
function yr(i) {
  const e = new Ei({
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
  De(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && De(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      yr({
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
const br = "esign.signer.profile.v1", oi = "esign.signer.profile.outbox.v1", Tn = 90, ci = 500 * 1024;
class wr {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : Tn;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${br}:${e}`;
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
class Sr {
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
class xn {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(oi);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [s, o] of Object.entries(t)) {
        if (!o || typeof o != "object")
          continue;
        const c = o;
        if (c.op === "clear") {
          n[s] = {
            op: "clear",
            updatedAt: Number(c.updatedAt) || Date.now()
          };
          continue;
        }
        const r = c.op === "patch" ? c.patch : c;
        n[s] = {
          op: "patch",
          patch: r && typeof r == "object" ? r : {},
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
      window.localStorage.setItem(oi, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), s = n[e], o = s?.op === "patch" ? s.patch || {} : {};
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
      const [n, s] = await Promise.all([
        this.localStore.load(e),
        this.remoteStore.load(e).catch(() => null)
      ]), o = this.pickLatest(n, s);
      return o && await this.localStore.save(e, o), await this.flushOutboxForKey(e), o;
    }
    return this.localStore.load(e);
  }
  async save(e, t) {
    if (this.mode === "remote_only") {
      if (!this.remoteStore)
        throw new Error("remote profile store not configured");
      const s = await this.remoteStore.save(e, t);
      return this.removeOutboxEntry(e), s;
    }
    const n = await this.localStore.save(e, t);
    if (this.mode === "hybrid" && this.remoteStore)
      try {
        const s = await this.remoteStore.save(e, t);
        return await this.localStore.save(e, s), this.removeOutboxEntry(e), s;
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
function xr(i) {
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
      ttlDays: Number(i.profile?.ttlDays || Tn) || Tn,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Ir(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function In(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Cr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function wt(i) {
  const e = String(i || "").trim();
  return Cr(e) ? "" : e;
}
function Er(i) {
  const e = new wr(i.profile.ttlDays), t = new Sr(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new xn("local_only", e, null) : i.profile.mode === "remote_only" ? new xn("remote_only", e, t) : new xn("hybrid", e, t);
}
function Lr() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Ar(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = xr(i), s = Ir(n), o = Er(n);
  Lr();
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
    trackFieldSave(a, l, d, g, h = null) {
      this.metrics.fieldSaveLatencies.push(g), d ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: a, error: h }), this.track(d ? "field_save_success" : "field_save_failed", {
        fieldId: a,
        fieldType: l,
        latency: g,
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
    trackSignatureAttach(a, l, d, g, h = null) {
      this.metrics.signatureAttachLatencies.push(g), this.track(d ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: a,
        signatureType: l,
        latency: g,
        error: h
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
        totalFields: r.fieldState.size,
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
    profileKey: s,
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
  function f() {
    r.overlayRenderFrameID || (r.overlayRenderFrameID = window.requestAnimationFrame(() => {
      r.overlayRenderFrameID = 0, X();
    }));
  }
  function p(a) {
    const l = r.fieldState.get(a);
    l && (delete l.previewValueText, delete l.previewValueBool, delete l.previewSignatureUrl);
  }
  function y() {
    r.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function S(a, l) {
    const d = r.fieldState.get(a);
    if (!d) return;
    const g = wt(String(l || ""));
    if (!g) {
      delete d.previewValueText;
      return;
    }
    d.previewValueText = g, delete d.previewValueBool, delete d.previewSignatureUrl;
  }
  function M(a, l) {
    const d = r.fieldState.get(a);
    d && (d.previewValueBool = !!l, delete d.previewValueText, delete d.previewSignatureUrl);
  }
  function L(a, l) {
    const d = r.fieldState.get(a);
    if (!d) return;
    const g = String(l || "").trim();
    if (!g) {
      delete d.previewSignatureUrl;
      return;
    }
    d.previewSignatureUrl = g, delete d.previewValueText, delete d.previewValueBool;
  }
  const m = {
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
      const l = n.viewer.pages?.find((g) => g.page === a);
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
      const d = a.page, g = this.getPageMetadata(d), h = l.offsetWidth, I = l.offsetHeight, A = a.pageWidth || g.width, K = a.pageHeight || g.height, ne = h / A, Pe = I / K;
      let be = a.posX || 0, ke = a.posY || 0;
      n.viewer.origin === "bottom-left" && (ke = K - ke - (a.height || 30));
      const St = be * ne, It = ke * Pe, xe = (a.width || 150) * ne, qe = (a.height || 30) * Pe;
      return {
        left: St,
        top: It,
        width: xe,
        height: qe,
        // Store original values for debugging
        _debug: {
          sourceX: be,
          sourceY: ke,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: A,
          pageHeight: K,
          scaleX: ne,
          scaleY: Pe,
          zoom: r.zoomLevel,
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
  }, E = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(a, l, d, g) {
      const h = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: a,
            sha256: l,
            content_type: d,
            size_bytes: g
          })
        }
      );
      if (!h.ok)
        throw await bt(h, "Failed to get upload contract");
      const I = await h.json(), A = I?.contract || I;
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
      const g = {
        "Content-Type": a.content_type || "image/png"
      };
      a.headers && Object.entries(a.headers).forEach(([I, A]) => {
        const K = String(I).toLowerCase();
        K === "x-esign-upload-token" || K === "x-esign-upload-key" || (g[I] = String(A));
      });
      const h = await fetch(d.toString(), {
        method: a.method || "PUT",
        headers: g,
        body: l,
        credentials: "omit"
      });
      if (!h.ok)
        throw await bt(h, `Upload failed: ${h.status} ${h.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [l, d] = a.split(","), g = l.match(/data:([^;]+)/), h = g ? g[1] : "image/png", I = atob(d), A = new Uint8Array(I.length);
      for (let K = 0; K < I.length; K++)
        A[K] = I.charCodeAt(K);
      return new Blob([A], { type: h });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, l) {
      const d = this.dataUrlToBlob(l), g = d.size, h = "image/png", I = await lt(d), A = await this.requestUploadBootstrap(
        a,
        I,
        h,
        g
      );
      return await this.uploadToSignedUrl(A, d), {
        uploadToken: A.upload_token,
        objectKey: A.object_key,
        sha256: A.sha256,
        contentType: A.content_type
      };
    }
  }, w = {
    endpoint(a, l = "") {
      const d = encodeURIComponent(a), g = l ? `/${encodeURIComponent(l)}` : "";
      return `${n.apiBasePath}/signatures/${d}${g}`;
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
        const h = await d.json().catch(() => ({}));
        throw new Error(h?.error?.message || "Failed to load saved signatures");
      }
      const g = await d.json();
      return Array.isArray(g?.signatures) ? g.signatures : [];
    },
    async save(a, l, d = "") {
      const g = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: a,
          label: d,
          data_url: l
        })
      });
      if (!g.ok) {
        const I = await g.json().catch(() => ({})), A = new Error(I?.error?.message || "Failed to save signature");
        throw A.code = I?.error?.code || "", A;
      }
      return (await g.json())?.signature || null;
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
    const l = r.fieldState.get(a);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function R(a) {
    return r.savedSignaturesByType.get(a) || [];
  }
  async function U(a, l = !1) {
    const d = C(a);
    if (!l && r.savedSignaturesByType.has(d)) {
      _(a);
      return;
    }
    const g = await w.list(d);
    r.savedSignaturesByType.set(d, g), _(a);
  }
  function _(a) {
    const l = C(a), d = R(l), g = document.getElementById("sig-saved-list");
    if (g) {
      if (!d.length) {
        g.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      g.innerHTML = d.map((h) => {
        const I = At(String(h?.thumbnail_data_url || h?.data_url || "")), A = At(String(h?.label || "Saved signature")), K = At(String(h?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${I}" alt="${A}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${A}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${At(a)}" data-signature-id="${K}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${At(a)}" data-signature-id="${K}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function $(a) {
    const l = r.signatureCanvases.get(a), d = C(a);
    if (!l || !J(a))
      throw new Error(`Please add your ${d === "initials" ? "initials" : "signature"} first`);
    const g = l.canvas.toDataURL("image/png"), h = await w.save(d, g, d === "initials" ? "Initials" : "Signature");
    if (!h)
      throw new Error("Failed to save signature");
    const I = R(d);
    I.unshift(h), r.savedSignaturesByType.set(d, I), _(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function te(a, l) {
    const d = C(a), h = R(d).find((A) => String(A?.id || "") === String(l));
    if (!h) return;
    requestAnimationFrame(() => yt(a)), await me(a);
    const I = String(h.data_url || h.thumbnail_data_url || "").trim();
    I && (await F(a, I, { clearStrokes: !0 }), L(a, I), f(), tt("draw", a), ut("Saved signature selected."));
  }
  async function N(a, l) {
    const d = C(a);
    await w.delete(l);
    const g = R(d).filter((h) => String(h?.id || "") !== String(l));
    r.savedSignaturesByType.set(d, g), _(a);
  }
  function Z(a) {
    const l = String(a?.code || "").trim(), d = String(a?.message || "Unable to update saved signatures"), g = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : d;
    window.toastManager && window.toastManager.error(g), ut(g, "assertive");
  }
  async function me(a, l = 8) {
    for (let d = 0; d < l; d++) {
      if (r.signatureCanvases.has(a)) return !0;
      await new Promise((g) => setTimeout(g, 40)), yt(a);
    }
    return !1;
  }
  async function le(a, l) {
    const d = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(d))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => yt(a)), await me(a);
    const g = r.signatureCanvases.get(a);
    if (!g)
      throw new Error("Signature canvas is not ready");
    const h = await ue(l), I = d === "image/png" ? h : await Ze(h, g.drawWidth, g.drawHeight);
    if (Ne(I) > ci)
      throw new Error(`Image exceeds ${Math.round(ci / 1024)}KB limit after conversion`);
    await F(a, I, { clearStrokes: !0 }), L(a, I), f();
    const K = document.getElementById("sig-upload-preview-wrap"), ne = document.getElementById("sig-upload-preview");
    K && K.classList.remove("hidden"), ne && ne.setAttribute("src", I), ut("Signature image uploaded. You can now insert it.");
  }
  function ue(a) {
    return new Promise((l, d) => {
      const g = new FileReader();
      g.onload = () => l(String(g.result || "")), g.onerror = () => d(new Error("Unable to read image file")), g.readAsDataURL(a);
    });
  }
  function Ne(a) {
    const l = String(a || "").split(",");
    if (l.length < 2) return 0;
    const d = l[1] || "", g = (d.match(/=+$/) || [""])[0].length;
    return Math.floor(d.length * 3 / 4) - g;
  }
  async function Ze(a, l, d) {
    return await new Promise((g, h) => {
      const I = new Image();
      I.onload = () => {
        const A = document.createElement("canvas"), K = Math.max(1, Math.round(Number(l) || 600)), ne = Math.max(1, Math.round(Number(d) || 160));
        A.width = K, A.height = ne;
        const Pe = A.getContext("2d");
        if (!Pe) {
          h(new Error("Unable to process image"));
          return;
        }
        Pe.clearRect(0, 0, K, ne);
        const be = Math.min(K / I.width, ne / I.height), ke = I.width * be, St = I.height * be, It = (K - ke) / 2, xe = (ne - St) / 2;
        Pe.drawImage(I, It, xe, ke, St), g(A.toDataURL("image/png"));
      }, I.onerror = () => h(new Error("Unable to decode image file")), I.src = a;
    });
  }
  async function lt(a) {
    if (window.crypto && window.crypto.subtle) {
      const l = await a.arrayBuffer(), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((g) => g.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function rt() {
    document.addEventListener("click", (a) => {
      const l = a.target;
      if (!(l instanceof Element)) return;
      const d = l.closest("[data-esign-action]");
      if (!d) return;
      switch (d.getAttribute("data-esign-action")) {
        case "prev-page":
          ee();
          break;
        case "next-page":
          Se();
          break;
        case "zoom-out":
          v();
          break;
        case "zoom-in":
          Ce();
          break;
        case "fit-width":
          b();
          break;
        case "download-document":
          Hi();
          break;
        case "show-consent-modal":
          On();
          break;
        case "activate-field": {
          const h = d.getAttribute("data-field-id");
          h && H(h);
          break;
        }
        case "submit-signature":
          Bi();
          break;
        case "show-decline-modal":
          Oi();
          break;
        case "close-field-editor":
          Je();
          break;
        case "save-field-editor":
          ct();
          break;
        case "hide-consent-modal":
          pn();
          break;
        case "accept-consent":
          Fi();
          break;
        case "hide-decline-modal":
          Nn();
          break;
        case "confirm-decline":
          Ni();
          break;
        case "retry-load-pdf":
          T();
          break;
        case "signature-tab": {
          const h = d.getAttribute("data-tab") || "draw", I = d.getAttribute("data-field-id");
          I && tt(h, I);
          break;
        }
        case "clear-signature-canvas": {
          const h = d.getAttribute("data-field-id");
          h && He(h);
          break;
        }
        case "undo-signature-canvas": {
          const h = d.getAttribute("data-field-id");
          h && Q(h);
          break;
        }
        case "redo-signature-canvas": {
          const h = d.getAttribute("data-field-id");
          h && se(h);
          break;
        }
        case "save-current-signature-library": {
          const h = d.getAttribute("data-field-id");
          h && $(h).catch(Z);
          break;
        }
        case "select-saved-signature": {
          const h = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          h && I && te(h, I).catch(Z);
          break;
        }
        case "delete-saved-signature": {
          const h = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          h && I && N(h, I).catch(Z);
          break;
        }
        case "clear-signer-profile":
          we().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          kt.togglePanel();
          break;
        case "debug-copy-session":
          kt.copySessionInfo();
          break;
        case "debug-clear-cache":
          kt.clearCache();
          break;
        case "debug-show-telemetry":
          kt.showTelemetry();
          break;
        case "debug-reload-viewer":
          kt.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const l = a.target;
      if (l instanceof HTMLInputElement) {
        if (l.matches("#sig-upload-input")) {
          const d = l.getAttribute("data-field-id"), g = l.files?.[0];
          if (!d || !g) return;
          le(d, g).catch((h) => {
            window.toastManager && window.toastManager.error(h?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (l.matches("#field-checkbox-input")) {
          const d = l.getAttribute("data-field-id") || r.activeFieldId;
          if (!d) return;
          M(d, l.checked), f();
        }
      }
    }), document.addEventListener("input", (a) => {
      const l = a.target;
      if (!(l instanceof HTMLInputElement) && !(l instanceof HTMLTextAreaElement)) return;
      const d = l.getAttribute("data-field-id") || r.activeFieldId;
      if (d) {
        if (l.matches("#sig-type-input")) {
          Te(d, l.value || "", { syncOverlay: !0 });
          return;
        }
        if (l.matches("#field-text-input")) {
          S(d, l.value || ""), f();
          return;
        }
        l.matches("#field-checkbox-input") && l instanceof HTMLInputElement && (M(d, l.checked), f());
      }
    });
  }
  De(async () => {
    rt(), r.isLowMemory = ot(), pe(), Me(), await Re(), Ke(), ze(), Fn(), Nt(), await T(), X(), document.addEventListener("visibilitychange", at), "memory" in navigator && We(), kt.init();
  });
  function at() {
    document.hidden && et();
  }
  function et() {
    const a = r.isLowMemory ? 1 : 2;
    for (; r.renderedPages.size > a; ) {
      let l = null, d = 1 / 0;
      if (r.renderedPages.forEach((g, h) => {
        h !== r.currentPage && g.timestamp < d && (l = h, d = g.timestamp);
      }), l !== null)
        r.renderedPages.delete(l);
      else
        break;
    }
  }
  function We() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        a / l > 0.8 && (r.isLowMemory = !0, et());
      }
    }, 3e4);
  }
  function Le(a) {
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
  function pe() {
    const a = document.getElementById("pdf-compatibility-banner"), l = document.getElementById("pdf-compatibility-message"), d = document.getElementById("pdf-compatibility-title");
    if (!a || !l || !d) return;
    const g = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), h = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (g !== "limited") {
      a.classList.add("hidden");
      return;
    }
    d.textContent = "Preview Compatibility Notice", l.textContent = String(n.viewer.compatibilityMessage || "").trim() || Le(h), a.classList.remove("hidden"), c.trackDegradedMode("pdf_preview_compatibility", { tier: g, reason: h });
  }
  function Me() {
    const a = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), d = document.getElementById("stage-state-title"), g = document.getElementById("stage-state-message"), h = document.getElementById("stage-state-meta");
    if (!a || !l || !d || !g || !h) return;
    const I = n.signerState || "active", A = n.recipientStage || 1, K = n.activeStage || 1, ne = n.activeRecipientIds || [], Pe = n.waitingForRecipientIds || [];
    let be = {
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
        be = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: A > K ? `You are in signing stage ${A}. Stage ${K} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Pe.length > 0 && be.badges.push({
          icon: "iconoir-group",
          text: `${Pe.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        be = {
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
        be = {
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
        ne.length > 1 ? (be.message = `You and ${ne.length - 1} other signer(s) can sign now.`, be.badges = [
          { icon: "iconoir-users", text: `Stage ${K} active`, variant: "green" }
        ]) : A > 1 ? be.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${A}`, variant: "green" }
        ] : be.hidden = !0;
        break;
    }
    if (be.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${be.bgClass} ${be.borderClass}`, l.className = `${be.iconClass} mt-0.5`, d.className = `text-sm font-semibold ${be.titleClass}`, d.textContent = be.title, g.className = `text-xs ${be.messageClass} mt-1`, g.textContent = be.message, h.innerHTML = "", be.badges.forEach((ke) => {
      const St = document.createElement("span"), It = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      St.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${It[ke.variant] || It.blue}`, St.innerHTML = `<i class="${ke.icon} mr-1"></i>${ke.text}`, h.appendChild(St);
    });
  }
  function Ke() {
    n.fields.forEach((a) => {
      let l = null, d = !1;
      if (a.type === "checkbox")
        l = a.value_bool || !1, d = l;
      else if (a.type === "date_signed")
        l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = !0;
      else {
        const g = String(a.value_text || "");
        l = g || nt(a), d = !!g;
      }
      r.fieldState.set(a.id, {
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
  async function Re() {
    try {
      const a = await o.load(r.profileKey);
      a && (r.profileData = a, r.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function nt(a) {
    const l = r.profileData;
    if (!l) return "";
    const d = String(a?.type || "").trim();
    return d === "name" ? wt(l.fullName || "") : d === "initials" ? wt(l.initials || "") || In(l.fullName || n.recipientName || "") : d === "signature" ? wt(l.typedSignature || "") : "";
  }
  function ae(a) {
    return !n.profile.persistDrawnSignature || !r.profileData ? "" : a?.type === "initials" && String(r.profileData.drawnInitialsDataUrl || "").trim() || String(r.profileData.drawnSignatureDataUrl || "").trim();
  }
  function W(a) {
    const l = wt(a?.value || "");
    return l || (r.profileData ? a?.type === "initials" ? wt(r.profileData.initials || "") || In(r.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? wt(r.profileData.typedSignature || "") : "" : "");
  }
  function de() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : r.profileRemember;
  }
  async function we(a = !1) {
    let l = null;
    try {
      await o.clear(r.profileKey);
    } catch (d) {
      l = d;
    } finally {
      r.profileData = null, r.profileRemember = n.profile.rememberByDefault;
    }
    if (l) {
      if (!a && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !a)
        throw l;
      return;
    }
    !a && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Qe(a, l = {}) {
    const d = de();
    if (r.profileRemember = d, !d) {
      await we(!0);
      return;
    }
    if (!a) return;
    const g = {
      remember: !0
    }, h = String(a.type || "");
    if (h === "name" && typeof a.value == "string") {
      const I = wt(a.value);
      I && (g.fullName = I, (r.profileData?.initials || "").trim() || (g.initials = In(I)));
    }
    if (h === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        g.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = wt(a.value);
        I && (g.initials = I);
      }
    }
    if (h === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        g.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = wt(a.value);
        I && (g.typedSignature = I);
      }
    }
    if (!(Object.keys(g).length === 1 && g.remember === !0))
      try {
        const I = await o.save(r.profileKey, g);
        r.profileData = I;
      } catch {
      }
  }
  function ze() {
    const a = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    a && l && a.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function ot() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function gt() {
    const a = r.isLowMemory ? 3 : r.maxCachedPages;
    if (r.renderedPages.size <= a) return;
    const l = [];
    for (r.renderedPages.forEach((d, g) => {
      const h = Math.abs(g - r.currentPage);
      l.push({ pageNum: g, distance: h });
    }), l.sort((d, g) => g.distance - d.distance); r.renderedPages.size > a && l.length > 0; ) {
      const d = l.shift();
      d && d.pageNum !== r.currentPage && r.renderedPages.delete(d.pageNum);
    }
  }
  function dt(a) {
    if (r.isLowMemory) return;
    const l = [];
    a > 1 && l.push(a - 1), a < n.pageCount && l.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      l.forEach(async (d) => {
        !r.renderedPages.has(d) && !r.pageRendering && await fe(d);
      });
    }, { timeout: 2e3 });
  }
  async function fe(a) {
    if (!(!r.pdfDoc || r.renderedPages.has(a)))
      try {
        const l = await r.pdfDoc.getPage(a), d = r.zoomLevel, g = l.getViewport({ scale: d * window.devicePixelRatio }), h = document.createElement("canvas"), I = h.getContext("2d");
        h.width = g.width, h.height = g.height;
        const A = {
          canvasContext: I,
          viewport: g
        };
        await l.render(A).promise, r.renderedPages.set(a, {
          canvas: h,
          scale: d,
          timestamp: Date.now()
        }), gt();
      } catch (l) {
        console.warn("Preload failed for page", a, l);
      }
  }
  function Ie() {
    const a = window.devicePixelRatio || 1;
    return r.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function T() {
    const a = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const d = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!d.ok)
        throw new Error("Failed to load document");
      const h = (await d.json()).assets || {}, I = h.source_url || h.executed_url || h.certificate_url || n.documentUrl;
      if (!I)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const A = pdfjsLib.getDocument(I);
      r.pdfDoc = await A.promise, n.pageCount = r.pdfDoc.numPages, document.getElementById("page-count").textContent = r.pdfDoc.numPages, await P(1), he(), c.trackViewerLoad(!0, Date.now() - l), c.trackPageView(1);
    } catch (d) {
      console.error("PDF load error:", d), c.trackViewerLoad(!1, Date.now() - l, d.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Ui();
    }
  }
  async function P(a) {
    if (!r.pdfDoc) return;
    const l = r.renderedPages.get(a);
    if (l && l.scale === r.zoomLevel) {
      B(l), r.currentPage = a, document.getElementById("current-page").textContent = a, he(), X(), dt(a);
      return;
    }
    r.pageRendering = !0;
    try {
      const d = await r.pdfDoc.getPage(a), g = r.zoomLevel, h = Ie(), I = d.getViewport({ scale: g * h }), A = d.getViewport({ scale: 1 });
      m.setPageViewport(a, {
        width: A.width,
        height: A.height,
        rotation: A.rotation || 0
      });
      const K = document.getElementById("pdf-page-1");
      K.innerHTML = "";
      const ne = document.createElement("canvas"), Pe = ne.getContext("2d");
      ne.height = I.height, ne.width = I.width, ne.style.width = `${I.width / h}px`, ne.style.height = `${I.height / h}px`, K.appendChild(ne);
      const be = document.getElementById("pdf-container");
      be.style.width = `${I.width / h}px`;
      const ke = {
        canvasContext: Pe,
        viewport: I
      };
      await d.render(ke).promise, r.renderedPages.set(a, {
        canvas: ne.cloneNode(!0),
        scale: g,
        timestamp: Date.now(),
        displayWidth: I.width / h,
        displayHeight: I.height / h
      }), r.renderedPages.get(a).canvas.getContext("2d").drawImage(ne, 0, 0), gt(), r.currentPage = a, document.getElementById("current-page").textContent = a, he(), X(), c.trackPageView(a), dt(a);
    } catch (d) {
      console.error("Page render error:", d);
    } finally {
      if (r.pageRendering = !1, r.pageNumPending !== null) {
        const d = r.pageNumPending;
        r.pageNumPending = null, await P(d);
      }
    }
  }
  function B(a, l) {
    const d = document.getElementById("pdf-page-1");
    d.innerHTML = "";
    const g = document.createElement("canvas");
    g.width = a.canvas.width, g.height = a.canvas.height, g.style.width = `${a.displayWidth}px`, g.style.height = `${a.displayHeight}px`, g.getContext("2d").drawImage(a.canvas, 0, 0), d.appendChild(g);
    const I = document.getElementById("pdf-container");
    I.style.width = `${a.displayWidth}px`;
  }
  function Y(a) {
    r.pageRendering ? r.pageNumPending = a : P(a);
  }
  function ie(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? wt(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? wt(a.value) : "";
  }
  function ge(a, l, d, g = !1) {
    const h = document.createElement("img");
    h.className = "field-overlay-preview", h.src = l, h.alt = d, a.appendChild(h), a.classList.add("has-preview"), g && a.classList.add("draft-preview");
  }
  function ve(a, l, d = !1, g = !1) {
    const h = document.createElement("span");
    h.className = "field-overlay-value", d && h.classList.add("font-signature"), h.textContent = l, a.appendChild(h), a.classList.add("has-value"), g && a.classList.add("draft-preview");
  }
  function re(a, l) {
    const d = document.createElement("span");
    d.className = "field-overlay-label", d.textContent = l, a.appendChild(d);
  }
  function X() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    r.fieldState.forEach((d, g) => {
      if (d.page !== r.currentPage) return;
      const h = document.createElement("div");
      if (h.className = "field-overlay", h.dataset.fieldId = g, d.required && h.classList.add("required"), d.completed && h.classList.add("completed"), r.activeFieldId === g && h.classList.add("active"), d.posX != null && d.posY != null && d.width != null && d.height != null) {
        const ke = m.getOverlayStyles(d, l);
        h.style.left = ke.left, h.style.top = ke.top, h.style.width = ke.width, h.style.height = ke.height, h.style.transform = ke.transform, kt.enabled && (h.dataset.debugCoords = JSON.stringify(
          m.pageToScreen(d, l)._debug
        ));
      } else {
        const ke = Array.from(r.fieldState.keys()).indexOf(g);
        h.style.left = "10px", h.style.top = `${100 + ke * 50}px`, h.style.width = "150px", h.style.height = "30px";
      }
      const A = String(d.previewSignatureUrl || "").trim(), K = String(d.signaturePreviewUrl || "").trim(), ne = ie(d), Pe = d.type === "signature" || d.type === "initials", be = typeof d.previewValueBool == "boolean";
      if (A)
        ge(h, A, j(d.type), !0);
      else if (d.completed && K)
        ge(h, K, j(d.type));
      else if (ne) {
        const ke = typeof d.previewValueText == "string" && d.previewValueText.trim() !== "";
        ve(h, ne, Pe, ke);
      } else d.type === "checkbox" && (be ? d.previewValueBool : !!d.value) ? ve(h, "Checked", !1, be) : re(h, j(d.type));
      h.setAttribute("tabindex", "0"), h.setAttribute("role", "button"), h.setAttribute("aria-label", `${j(d.type)} field${d.required ? ", required" : ""}${d.completed ? ", completed" : ""}`), h.addEventListener("click", () => H(g)), h.addEventListener("keydown", (ke) => {
        (ke.key === "Enter" || ke.key === " ") && (ke.preventDefault(), H(g));
      }), a.appendChild(h);
    });
  }
  function j(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function ee() {
    r.currentPage <= 1 || Y(r.currentPage - 1);
  }
  function Se() {
    r.currentPage >= n.pageCount || Y(r.currentPage + 1);
  }
  function ye(a) {
    a < 1 || a > n.pageCount || Y(a);
  }
  function he() {
    document.getElementById("prev-page-btn").disabled = r.currentPage <= 1, document.getElementById("next-page-btn").disabled = r.currentPage >= n.pageCount;
  }
  function Ce() {
    r.zoomLevel = Math.min(r.zoomLevel + 0.25, 3), x(), Y(r.currentPage);
  }
  function v() {
    r.zoomLevel = Math.max(r.zoomLevel - 0.25, 0.5), x(), Y(r.currentPage);
  }
  function b() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, d = 612;
    r.zoomLevel = l / d, x(), Y(r.currentPage);
  }
  function x() {
    document.getElementById("zoom-level").textContent = `${Math.round(r.zoomLevel * 100)}%`;
  }
  function H(a) {
    if (!r.hasConsented && n.fields.some((l) => l.id === a && l.type !== "date_signed")) {
      On();
      return;
    }
    q(a, { openEditor: !0 });
  }
  function q(a, l = { openEditor: !0 }) {
    const d = r.fieldState.get(a);
    if (d) {
      if (l.openEditor && (r.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((g) => g.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((g) => g.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), d.page !== r.currentPage && ye(d.page), !l.openEditor) {
        V(a);
        return;
      }
      d.type !== "date_signed" && oe(a);
    }
  }
  function V(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function oe(a) {
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = document.getElementById("field-editor-overlay"), g = document.getElementById("field-editor-content"), h = document.getElementById("field-editor-title"), I = document.getElementById("field-editor-legal-disclaimer");
    h.textContent = ce(l.type), g.innerHTML = Ae(l), I?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && Ue(a), d.classList.add("active"), d.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", gn(d.querySelector(".field-editor")), ut(`Editing ${ce(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const A = g.querySelector("input, textarea");
      A ? A.focus() : g.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Oe(r.writeCooldownUntil) > 0 && z(Oe(r.writeCooldownUntil));
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
  function Ae(a) {
    const l = Be(a.type), d = At(String(a?.id || "")), g = At(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const h = a.type === "initials" ? "initials" : "signature", I = At(W(a)), A = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], K = $e(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${A.map((ne) => `
            <button
              type="button"
              id="sig-tab-${ne.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${K === ne.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${ne.id}"
              data-esign-action="signature-tab"
              data-field-id="${d}"
              role="tab"
              aria-selected="${K === ne.id ? "true" : "false"}"
              aria-controls="sig-editor-${ne.id}"
              tabindex="${K === ne.id ? "0" : "-1"}"
            >
              ${ne.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${K === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${h}"
              value="${I}"
              data-field-id="${d}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${d}">${I}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${h} will appear as your ${g}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${K === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${h} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${K === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${K === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${h}s</p>
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
          value="${At(String(a.value || ""))}"
          data-field-id="${d}"
        />
        ${l}
      `;
    if (a.type === "text") {
      const h = At(String(a.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${d}"
        >${h}</textarea>
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
  function Be(a) {
    return a === "name" || a === "initials" || a === "signature" ? `
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
  function Te(a, l, d = { syncOverlay: !1 }) {
    const g = document.getElementById("sig-type-preview"), h = r.fieldState.get(a);
    if (!h) return;
    const I = wt(String(l || "").trim());
    if (d?.syncOverlay && (I ? S(a, I) : p(a), f()), !!g) {
      if (I) {
        g.textContent = I;
        return;
      }
      g.textContent = h.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function $e(a) {
    const l = String(r.signatureTabByField.get(a) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function tt(a, l) {
    const d = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    r.signatureTabByField.set(l, d), document.querySelectorAll(".sig-editor-tab").forEach((h) => {
      h.classList.remove("border-blue-600", "text-blue-600"), h.classList.add("border-transparent", "text-gray-500"), h.setAttribute("aria-selected", "false"), h.setAttribute("tabindex", "-1");
    });
    const g = document.querySelector(`.sig-editor-tab[data-tab="${d}"]`);
    if (g?.classList.add("border-blue-600", "text-blue-600"), g?.classList.remove("border-transparent", "text-gray-500"), g?.setAttribute("aria-selected", "true"), g?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", d !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", d !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", d !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", d !== "saved"), (d === "draw" || d === "upload" || d === "saved") && g && requestAnimationFrame(() => yt(l)), d === "type") {
      const h = document.getElementById("sig-type-input");
      Te(l, h?.value || "");
    }
    d === "saved" && U(l).catch(Z);
  }
  function Ue(a) {
    r.signatureTabByField.set(a, "draw"), tt("draw", a);
    const l = document.getElementById("sig-type-input");
    l && Te(a, l.value || "");
  }
  function yt(a) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || r.signatureCanvases.has(a)) return;
    const d = l.closest(".signature-canvas-container"), g = l.getContext("2d");
    if (!g) return;
    const h = l.getBoundingClientRect();
    if (!h.width || !h.height) return;
    const I = window.devicePixelRatio || 1;
    l.width = h.width * I, l.height = h.height * I, g.scale(I, I), g.lineCap = "round", g.lineJoin = "round", g.strokeStyle = "#1f2937", g.lineWidth = 2.5;
    let A = !1, K = 0, ne = 0, Pe = [];
    const be = (xe) => {
      const qe = l.getBoundingClientRect();
      let Dt, Mt;
      return xe.touches && xe.touches.length > 0 ? (Dt = xe.touches[0].clientX, Mt = xe.touches[0].clientY) : xe.changedTouches && xe.changedTouches.length > 0 ? (Dt = xe.changedTouches[0].clientX, Mt = xe.changedTouches[0].clientY) : (Dt = xe.clientX, Mt = xe.clientY), {
        x: Dt - qe.left,
        y: Mt - qe.top,
        timestamp: Date.now()
      };
    }, ke = (xe) => {
      A = !0;
      const qe = be(xe);
      K = qe.x, ne = qe.y, Pe = [{ x: qe.x, y: qe.y, t: qe.timestamp, width: 2.5 }], d && d.classList.add("drawing");
    }, St = (xe) => {
      if (!A) return;
      const qe = be(xe);
      Pe.push({ x: qe.x, y: qe.y, t: qe.timestamp, width: 2.5 });
      const Dt = qe.x - K, Mt = qe.y - ne, ji = qe.timestamp - (Pe[Pe.length - 2]?.t || qe.timestamp), qi = Math.sqrt(Dt * Dt + Mt * Mt) / Math.max(ji, 1), Vi = 2.5, Gi = 1.5, Wi = 4, Ki = Math.min(qi / 5, 1), zn = Math.max(Gi, Math.min(Wi, Vi - Ki * 1.5));
      Pe[Pe.length - 1].width = zn, g.lineWidth = zn, g.beginPath(), g.moveTo(K, ne), g.lineTo(qe.x, qe.y), g.stroke(), K = qe.x, ne = qe.y;
    }, It = () => {
      if (A = !1, Pe.length > 1) {
        const xe = r.signatureCanvases.get(a);
        xe && (xe.strokes.push(Pe.map((qe) => ({ ...qe }))), xe.redoStack = []), je(a);
      }
      Pe = [], d && d.classList.remove("drawing");
    };
    l.addEventListener("mousedown", ke), l.addEventListener("mousemove", St), l.addEventListener("mouseup", It), l.addEventListener("mouseout", It), l.addEventListener("touchstart", (xe) => {
      xe.preventDefault(), xe.stopPropagation(), ke(xe);
    }, { passive: !1 }), l.addEventListener("touchmove", (xe) => {
      xe.preventDefault(), xe.stopPropagation(), St(xe);
    }, { passive: !1 }), l.addEventListener("touchend", (xe) => {
      xe.preventDefault(), It();
    }, { passive: !1 }), l.addEventListener("touchcancel", It), l.addEventListener("gesturestart", (xe) => xe.preventDefault()), l.addEventListener("gesturechange", (xe) => xe.preventDefault()), l.addEventListener("gestureend", (xe) => xe.preventDefault()), r.signatureCanvases.set(a, {
      canvas: l,
      ctx: g,
      dpr: I,
      drawWidth: h.width,
      drawHeight: h.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), k(a);
  }
  function k(a) {
    const l = r.signatureCanvases.get(a), d = r.fieldState.get(a);
    if (!l || !d) return;
    const g = ae(d);
    g && F(a, g, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function F(a, l, d = { clearStrokes: !1 }) {
    const g = r.signatureCanvases.get(a);
    if (!g) return !1;
    const h = String(l || "").trim();
    if (!h)
      return g.baseImageDataUrl = "", g.baseImage = null, d.clearStrokes && (g.strokes = [], g.redoStack = []), O(a), !0;
    const { drawWidth: I, drawHeight: A } = g, K = new Image();
    return await new Promise((ne) => {
      K.onload = () => {
        d.clearStrokes && (g.strokes = [], g.redoStack = []), g.baseImage = K, g.baseImageDataUrl = h, I > 0 && A > 0 && O(a), ne(!0);
      }, K.onerror = () => ne(!1), K.src = h;
    });
  }
  function O(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return;
    const { ctx: d, drawWidth: g, drawHeight: h, baseImage: I, strokes: A } = l;
    if (d.clearRect(0, 0, g, h), I) {
      const K = Math.min(g / I.width, h / I.height), ne = I.width * K, Pe = I.height * K, be = (g - ne) / 2, ke = (h - Pe) / 2;
      d.drawImage(I, be, ke, ne, Pe);
    }
    for (const K of A)
      for (let ne = 1; ne < K.length; ne++) {
        const Pe = K[ne - 1], be = K[ne];
        d.lineWidth = Number(be.width || 2.5) || 2.5, d.beginPath(), d.moveTo(Pe.x, Pe.y), d.lineTo(be.x, be.y), d.stroke();
      }
  }
  function Q(a) {
    const l = r.signatureCanvases.get(a);
    if (!l || l.strokes.length === 0) return;
    const d = l.strokes.pop();
    d && l.redoStack.push(d), O(a), je(a);
  }
  function se(a) {
    const l = r.signatureCanvases.get(a);
    if (!l || l.redoStack.length === 0) return;
    const d = l.redoStack.pop();
    d && l.strokes.push(d), O(a), je(a);
  }
  function J(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: d, ctx: g } = l;
    return g.getImageData(0, 0, d.width, d.height).data.some((I, A) => A % 4 === 3 && I > 0);
  }
  function je(a) {
    const l = r.signatureCanvases.get(a);
    l && (J(a) ? L(a, l.canvas.toDataURL("image/png")) : p(a), f());
  }
  function He(a) {
    const l = r.signatureCanvases.get(a);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", O(a)), p(a), f();
    const d = document.getElementById("sig-upload-preview-wrap"), g = document.getElementById("sig-upload-preview");
    d && d.classList.add("hidden"), g && g.removeAttribute("src");
  }
  function Je() {
    const a = document.getElementById("field-editor-overlay"), l = a.querySelector(".field-editor");
    if (mn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", r.activeFieldId) {
      const d = document.querySelector(`.field-list-item[data-field-id="${r.activeFieldId}"]`);
      requestAnimationFrame(() => {
        d?.focus();
      });
    }
    y(), f(), r.activeFieldId = null, r.signatureCanvases.clear(), ut("Field editor closed.");
  }
  function Oe(a) {
    const l = Number(a) || 0;
    return l <= 0 ? 0 : Math.max(0, Math.ceil((l - Date.now()) / 1e3));
  }
  function Ye(a, l = {}) {
    const d = Number(l.retry_after_seconds);
    if (Number.isFinite(d) && d > 0)
      return Math.ceil(d);
    const g = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!g) return 0;
    const h = Number(g);
    return Number.isFinite(h) && h > 0 ? Math.ceil(h) : 0;
  }
  async function bt(a, l) {
    let d = {};
    try {
      d = await a.json();
    } catch {
      d = {};
    }
    const g = d?.error || {}, h = g?.details && typeof g.details == "object" ? g.details : {}, I = Ye(a, h), A = a?.status === 429, K = A ? I > 0 ? `Too many actions too quickly. Please wait ${I}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(g?.message || l || "Request failed"), ne = new Error(K);
    return ne.status = a?.status || 0, ne.code = String(g?.code || ""), ne.details = h, ne.rateLimited = A, ne.retryAfterSeconds = I, ne;
  }
  function z(a) {
    const l = Math.max(1, Number(a) || 1);
    r.writeCooldownUntil = Date.now() + l * 1e3, r.writeCooldownTimer && (clearInterval(r.writeCooldownTimer), r.writeCooldownTimer = null);
    const d = () => {
      const g = document.getElementById("field-editor-save");
      if (!g) return;
      const h = Oe(r.writeCooldownUntil);
      if (h <= 0) {
        r.pendingSaves.has(r.activeFieldId || "") || (g.disabled = !1, g.innerHTML = "Insert"), r.writeCooldownTimer && (clearInterval(r.writeCooldownTimer), r.writeCooldownTimer = null);
        return;
      }
      g.disabled = !0, g.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${h}s`;
    };
    d(), r.writeCooldownTimer = setInterval(d, 250);
  }
  function _e(a) {
    const l = Math.max(1, Number(a) || 1);
    r.submitCooldownUntil = Date.now() + l * 1e3, r.submitCooldownTimer && (clearInterval(r.submitCooldownTimer), r.submitCooldownTimer = null);
    const d = () => {
      const g = Oe(r.submitCooldownUntil);
      Nt(), g <= 0 && r.submitCooldownTimer && (clearInterval(r.submitCooldownTimer), r.submitCooldownTimer = null);
    };
    d(), r.submitCooldownTimer = setInterval(d, 250);
  }
  async function ct() {
    const a = r.activeFieldId;
    if (!a) return;
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = Oe(r.writeCooldownUntil);
    if (d > 0) {
      const h = `Please wait ${d}s before saving again.`;
      window.toastManager && window.toastManager.error(h), ut(h, "assertive");
      return;
    }
    const g = document.getElementById("field-editor-save");
    g.disabled = !0, g.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      r.profileRemember = de();
      let h = !1;
      if (l.type === "signature" || l.type === "initials")
        h = await Lt(a);
      else if (l.type === "checkbox") {
        const I = document.getElementById("field-checkbox-input");
        h = await Ot(a, null, I?.checked || !1);
      } else {
        const A = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!A && l.required)
          throw new Error("This field is required");
        h = await Ot(a, A, null);
      }
      if (h) {
        Je(), Fn(), Nt(), Un(), X(), Mi(a), $i(a);
        const I = Hn();
        I.allRequiredComplete ? ut("Field saved. All required fields complete. Ready to submit.") : ut(`Field saved. ${I.remainingRequired} required field${I.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (h) {
      h?.rateLimited && z(h.retryAfterSeconds), window.toastManager && window.toastManager.error(h.message), ut(`Error saving field: ${h.message}`, "assertive");
    } finally {
      if (Oe(r.writeCooldownUntil) > 0) {
        const h = Oe(r.writeCooldownUntil);
        g.disabled = !0, g.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${h}s`;
      } else
        g.disabled = !1, g.innerHTML = "Insert";
    }
  }
  async function Lt(a) {
    const l = r.fieldState.get(a), d = document.getElementById("sig-type-input"), g = $e(a);
    if (g === "draw" || g === "upload" || g === "saved") {
      const I = r.signatureCanvases.get(a);
      if (!I) return !1;
      if (!J(a))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const A = I.canvas.toDataURL("image/png");
      return await $n(a, { type: "drawn", dataUrl: A }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const I = d?.value?.trim();
      if (!I)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await Ot(a, I, null) : await $n(a, { type: "typed", text: I }, I);
    }
  }
  async function Ot(a, l, d) {
    r.pendingSaves.add(a);
    const g = Date.now(), h = r.fieldState.get(a);
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
        throw await bt(I, "Failed to save field");
      const A = r.fieldState.get(a);
      return A && (A.value = l ?? d, A.completed = !0, A.hasError = !1), await Qe(A), window.toastManager && window.toastManager.success("Field saved"), c.trackFieldSave(a, A?.type, !0, Date.now() - g), !0;
    } catch (I) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = I.message), c.trackFieldSave(a, h?.type, !1, Date.now() - g, I.message), I;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function $n(a, l, d) {
    r.pendingSaves.add(a);
    const g = Date.now(), h = l?.type || "typed";
    try {
      let I;
      if (h === "drawn") {
        const ne = await E.uploadDrawnSignature(
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
        I = await ki(a, d);
      const A = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(I)
      });
      if (!A.ok)
        throw await bt(A, "Failed to save signature");
      const K = r.fieldState.get(a);
      return K && (K.value = d, K.completed = !0, K.hasError = !1, l?.dataUrl && (K.signaturePreviewUrl = l.dataUrl)), await Qe(K, {
        signatureType: h,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), c.trackSignatureAttach(a, h, !0, Date.now() - g), !0;
    } catch (I) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = I.message), c.trackSignatureAttach(a, h, !1, Date.now() - g, I.message), I;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function ki(a, l) {
    const d = `${l}|${a}`, g = await Di(d), h = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: l,
      object_key: h,
      sha256: g
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Di(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const l = new TextEncoder().encode(a), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((g) => g.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Fn() {
    let a = 0;
    r.fieldState.forEach((K) => {
      K.required, K.completed && a++;
    });
    const l = r.fieldState.size, d = l > 0 ? a / l * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = l;
    const g = document.getElementById("progress-ring-circle"), h = 97.4, I = h - d / 100 * h;
    g.style.strokeDashoffset = I, document.getElementById("mobile-progress").style.width = `${d}%`;
    const A = l - a;
    document.getElementById("fields-status").textContent = A > 0 ? `${A} remaining` : "All complete";
  }
  function Nt() {
    const a = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), d = document.getElementById("incomplete-message"), g = Oe(r.submitCooldownUntil);
    let h = [], I = !1;
    r.fieldState.forEach((K, ne) => {
      K.required && !K.completed && h.push(K), K.hasError && (I = !0);
    });
    const A = r.hasConsented && h.length === 0 && !I && r.pendingSaves.size === 0 && g === 0 && !r.isSubmitting;
    a.disabled = !A, !r.isSubmitting && g > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${g}s` : !r.isSubmitting && g === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), r.hasConsented ? g > 0 ? (l.classList.remove("hidden"), d.textContent = `Please wait ${g}s before submitting again.`) : I ? (l.classList.remove("hidden"), d.textContent = "Some fields failed to save. Please retry.") : h.length > 0 ? (l.classList.remove("hidden"), d.textContent = `Complete ${h.length} required field${h.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), d.textContent = "Please accept the consent agreement");
  }
  function Mi(a) {
    const l = r.fieldState.get(a), d = document.querySelector(`.field-list-item[data-field-id="${a}"]`);
    if (!(!d || !l)) {
      if (l.completed) {
        d.classList.add("completed"), d.classList.remove("error");
        const g = d.querySelector(".w-8");
        g.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), g.classList.add("bg-green-100", "text-green-600"), g.innerHTML = '<i class="iconoir-check"></i>';
      } else if (l.hasError) {
        d.classList.remove("completed"), d.classList.add("error");
        const g = d.querySelector(".w-8");
        g.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), g.classList.add("bg-red-100", "text-red-600"), g.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function Ri() {
    const a = Array.from(r.fieldState.values()).filter((l) => l.required);
    return a.sort((l, d) => {
      const g = Number(l.page || 0), h = Number(d.page || 0);
      if (g !== h) return g - h;
      const I = Number(l.tabIndex || 0), A = Number(d.tabIndex || 0);
      if (I > 0 && A > 0 && I !== A) return I - A;
      if (I > 0 != A > 0) return I > 0 ? -1 : 1;
      const K = Number(l.posY || 0), ne = Number(d.posY || 0);
      if (K !== ne) return K - ne;
      const Pe = Number(l.posX || 0), be = Number(d.posX || 0);
      return Pe !== be ? Pe - be : String(l.id || "").localeCompare(String(d.id || ""));
    }), a;
  }
  function Bn(a) {
    r.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((l) => l.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((l) => l.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function $i(a) {
    const l = Ri(), d = l.filter((A) => !A.completed);
    if (d.length === 0) {
      c.track("guided_next_none_remaining", { fromFieldId: a });
      const A = document.getElementById("submit-btn");
      A?.scrollIntoView({ behavior: "smooth", block: "nearest" }), A?.focus(), ut("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const g = l.findIndex((A) => String(A.id) === String(a));
    let h = null;
    if (g >= 0) {
      for (let A = g + 1; A < l.length; A++)
        if (!l[A].completed) {
          h = l[A];
          break;
        }
    }
    if (h || (h = d[0]), !h) return;
    c.track("guided_next_started", { fromFieldId: a, toFieldId: h.id });
    const I = Number(h.page || 1);
    I !== r.currentPage && ye(I), q(h.id, { openEditor: !1 }), Bn(h.id), setTimeout(() => {
      Bn(h.id), V(h.id), c.track("guided_next_completed", { toFieldId: h.id, page: h.page }), ut(`Next required field highlighted on page ${h.page}.`);
    }, 120);
  }
  function On() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", gn(a.querySelector(".field-editor")), ut("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function pn() {
    const a = document.getElementById("consent-modal"), l = a.querySelector(".field-editor");
    mn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ut("Consent dialog closed.");
  }
  async function Fi() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const l = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!l.ok)
        throw await bt(l, "Failed to accept consent");
      r.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), pn(), Nt(), Un(), c.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ut("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), ut(`Error: ${l.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function Bi() {
    const a = document.getElementById("submit-btn"), l = Oe(r.submitCooldownUntil);
    if (l > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${l}s before submitting again.`), Nt();
      return;
    }
    r.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const d = `submit-${n.recipientId}-${Date.now()}`, g = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": d }
      });
      if (!g.ok)
        throw await bt(g, "Failed to submit");
      c.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (d) {
      c.trackSubmit(!1, d.message), d?.rateLimited && _e(d.retryAfterSeconds), window.toastManager && window.toastManager.error(d.message);
    } finally {
      r.isSubmitting = !1, Nt();
    }
  }
  function Oi() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", gn(a.querySelector(".field-editor")), ut("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Nn() {
    const a = document.getElementById("decline-modal"), l = a.querySelector(".field-editor");
    mn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ut("Decline dialog closed.");
  }
  async function Ni() {
    const a = document.getElementById("decline-reason").value;
    try {
      const l = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!l.ok)
        throw await bt(l, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message);
    }
  }
  function Ui() {
    c.trackDegradedMode("viewer_load_failure"), c.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Hi() {
    try {
      const a = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!a.ok) throw new Error("Document unavailable");
      const d = (await a.json()).assets || {}, g = d.source_url || d.executed_url || d.certificate_url;
      if (g)
        window.open(g, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (a) {
      window.toastManager && window.toastManager.error(a.message || "Unable to download document");
    }
  }
  const kt = {
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
      const a = this.panel.querySelector(".debug-toggle"), l = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (a.textContent = "+", l.style.display = "none") : (a.textContent = "−", l.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const a = r.fieldState;
      let l = 0;
      a?.forEach((g) => {
        g.completed && l++;
      }), document.getElementById("debug-consent").textContent = r.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${r.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${l}/${a?.size || 0}`, document.getElementById("debug-cached").textContent = r.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = r.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${r.isLowMemory ? "warning" : ""}`;
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
            currentPage: r.currentPage,
            zoomLevel: r.zoomLevel,
            hasConsented: r.hasConsented,
            activeFieldId: r.activeFieldId,
            isLowMemory: r.isLowMemory,
            cachedPages: r.renderedPages?.size || 0
          },
          fields: Array.from(r.fieldState?.entries() || []).map(([a, l]) => ({
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
          console.log("[E-Sign Debug] Reloading viewer..."), T();
        },
        setLowMemory: (a) => {
          r.isLowMemory = a, gt(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", c.sessionId), console.log("Fields:", r.fieldState?.size || 0), console.log("Low Memory:", r.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), T(), this.updatePanel();
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
      console.table(c.events), console.log("Session Summary:", c.getSessionSummary());
    }
  };
  function ut(a, l = "polite") {
    const d = l === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    d && (d.textContent = "", requestAnimationFrame(() => {
      d.textContent = a;
    }));
  }
  function gn(a) {
    const d = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), g = d[0], h = d[d.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function I(A) {
      A.key === "Tab" && (A.shiftKey ? document.activeElement === g && (A.preventDefault(), h?.focus()) : document.activeElement === h && (A.preventDefault(), g?.focus()));
    }
    a.addEventListener("keydown", I), a._focusTrapHandler = I, requestAnimationFrame(() => {
      g?.focus();
    });
  }
  function mn(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const l = a.dataset.previousFocus;
    if (l) {
      const d = document.getElementById(l);
      requestAnimationFrame(() => {
        d?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function Un() {
    const a = Hn(), l = document.getElementById("submit-status");
    l && (a.allRequiredComplete && r.hasConsented ? l.textContent = "All required fields complete. You can now submit." : r.hasConsented ? l.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : l.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Hn() {
    let a = 0, l = 0, d = 0;
    return r.fieldState.forEach((g) => {
      g.required && l++, g.completed && a++, g.required && !g.completed && d++;
    }), {
      completed: a,
      required: l,
      remainingRequired: d,
      total: r.fieldState.size,
      allRequiredComplete: d === 0
    };
  }
  function zi(a, l = 1) {
    const d = Array.from(r.fieldState.keys()), g = d.indexOf(a);
    if (g === -1) return null;
    const h = g + l;
    return h >= 0 && h < d.length ? d[h] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (Je(), pn(), Nn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), d = l.indexOf(a.target);
      if (d !== -1) {
        let g = d;
        if (a.key === "ArrowRight" && (g = (d + 1) % l.length), a.key === "ArrowLeft" && (g = (d - 1 + l.length) % l.length), a.key === "Home" && (g = 0), a.key === "End" && (g = l.length - 1), g !== d) {
          a.preventDefault();
          const h = l[g], I = h.getAttribute("data-tab") || "draw", A = h.getAttribute("data-field-id");
          A && tt(I, A), h.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const l = a.target.dataset.fieldId, d = a.key === "ArrowDown" ? 1 : -1, g = zi(l, d);
        g && document.querySelector(`.field-list-item[data-field-id="${g}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const l = a.target.dataset.fieldId;
        l && H(l);
      }
    }
    a.key === "Tab" && !a.target.closest(".field-editor-overlay") && !a.target.closest("#consent-modal") && a.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(a) {
    a.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Li {
  constructor(e) {
    this.config = e;
  }
  init() {
    Ar(this.config);
  }
  destroy() {
  }
}
function ka(i) {
  const e = new Li(i);
  return De(() => e.init()), e;
}
function Tr() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && De(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = Tr();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Li(e);
  t.init(), window.esignSignerReviewController = t;
});
class Ai {
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
    Bt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Bt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function Da(i = {}) {
  const e = new Ai(i);
  return De(() => e.init()), e;
}
function Ma(i = {}) {
  const e = new Ai(i);
  De(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
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
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: s } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), s && s.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (o) => {
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
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), o = this.elements.canvas, c = o.getContext("2d");
        if (!c)
          throw new Error("Failed to get canvas context");
        o.height = s.height, o.width = s.width, await n.render({
          canvasContext: c,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: s } = this.elements, o = this.pdfDoc?.numPages || 1;
    s && s.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= o);
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
    e && D(e), t && G(t), n && D(n), s && D(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && D(e), t && D(t), n && D(n), s && G(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: o, viewer: c } = this.elements;
    t && D(t), n && D(n), s && G(s), c && D(c), o && (o.textContent = e);
  }
}
function Ra(i) {
  const e = new kn(i);
  return e.init(), e;
}
function $a(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new kn(e);
  De(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && De(() => {
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
class Fa {
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
class Ba {
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
function _r(i) {
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
function Pr(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function kr(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((o) => String(o || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((o) => o !== s)] : n;
}
function Oa(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Na(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: _r(e.type),
    options: Pr(e.options),
    operators: kr(e.operators, e.default_operator)
  })) : [];
}
function Ua(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function Ha(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function za(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function ja(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([c, r]) => `${c}: ${r}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", o = e?.message || `${i} failed`;
    t.error(n ? `${s}${o}: ${n}` : `${s}${o}`);
  }
}
function qa(i, e) {
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
function Va(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const Ga = {
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
}, un = "application/vnd.google-apps.document", Dn = "application/vnd.google-apps.spreadsheet", Mn = "application/vnd.google-apps.presentation", Ti = "application/vnd.google-apps.folder", Rn = "application/pdf", Dr = [un, Rn], _i = "esign.google.account_id";
function Mr(i) {
  return i.mimeType === un;
}
function Rr(i) {
  return i.mimeType === Rn;
}
function zt(i) {
  return i.mimeType === Ti;
}
function $r(i) {
  return Dr.includes(i.mimeType);
}
function Wa(i) {
  return i.mimeType === un || i.mimeType === Dn || i.mimeType === Mn;
}
function Fr(i) {
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
function Ka(i) {
  return i.map(Fr);
}
function Pi(i) {
  return {
    [un]: "Google Doc",
    [Dn]: "Google Sheet",
    [Mn]: "Google Slides",
    [Ti]: "Folder",
    [Rn]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Br(i) {
  return zt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Mr(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Rr(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === Dn ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Mn ? {
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
function Or(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Nr(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function Ja(i, e) {
  const t = i.get("account_id");
  if (t)
    return sn(t);
  if (e)
    return sn(e);
  const n = localStorage.getItem(_i);
  return n ? sn(n) : "";
}
function sn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function Ya(i) {
  const e = sn(i);
  e && localStorage.setItem(_i, e);
}
function Xa(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Qa(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function Za(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function jt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Ur(i) {
  const e = Br(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function eo(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const o = s === t.length - 1, c = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return o ? `${c}<span class="text-gray-900 font-medium">${jt(n.name)}</span>` : `${c}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${jt(n.name)}</button>`;
  }).join("");
}
function Hr(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, o = Ur(i), c = zt(i), r = $r(i), f = c ? "cursor-pointer hover:bg-gray-50" : r ? "cursor-pointer hover:bg-blue-50" : "opacity-60", p = c ? `data-folder-id="${i.id}" data-folder-name="${jt(i.name)}"` : r && t ? `data-file-id="${i.id}" data-file-name="${jt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${f} file-item"
      ${p}
      role="listitem"
      ${r ? 'tabindex="0"' : ""}
    >
      ${o}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${jt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Pi(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Or(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${Nr(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${r && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function to(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${jt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((o, c) => zt(o) && !zt(c) ? -1 : !zt(o) && zt(c) ? 1 : o.name.localeCompare(c.name)).map((o) => Hr(o, { selectable: n })).join("")}
    </div>
  `;
}
function no(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Pi(i.mimeType)
  };
}
export {
  es as AGREEMENT_STATUS_BADGES,
  Ei as AgreementFormController,
  kn as DocumentDetailPreviewController,
  Pn as DocumentFormController,
  Ji as ESignAPIClient,
  Yi as ESignAPIError,
  _i as GOOGLE_ACCOUNT_STORAGE_KEY,
  pi as GoogleCallbackController,
  mi as GoogleDrivePickerController,
  gi as GoogleIntegrationController,
  Dr as IMPORTABLE_MIME_TYPES,
  vi as IntegrationConflictsController,
  hi as IntegrationHealthController,
  fi as IntegrationMappingsController,
  yi as IntegrationSyncRunsController,
  _n as LandingPageController,
  un as MIME_GOOGLE_DOC,
  Ti as MIME_GOOGLE_FOLDER,
  Dn as MIME_GOOGLE_SHEET,
  Mn as MIME_GOOGLE_SLIDES,
  Rn as MIME_PDF,
  Fa as PanelPaginationBehavior,
  Ba as PanelSearchBehavior,
  Ga as STANDARD_GRID_SELECTORS,
  ui as SignerCompletePageController,
  Ai as SignerErrorPageController,
  Li as SignerReviewController,
  ht as announce,
  Xa as applyAccountIdToPath,
  as as applyDetailFormatters,
  yr as bootstrapAgreementForm,
  $a as bootstrapDocumentDetailPreview,
  _a as bootstrapDocumentForm,
  ha as bootstrapGoogleCallback,
  ba as bootstrapGoogleDrivePicker,
  va as bootstrapGoogleIntegration,
  Ea as bootstrapIntegrationConflicts,
  Sa as bootstrapIntegrationHealth,
  Ia as bootstrapIntegrationMappings,
  Aa as bootstrapIntegrationSyncRuns,
  ua as bootstrapLandingPage,
  ga as bootstrapSignerCompletePage,
  Ma as bootstrapSignerErrorPage,
  Ar as bootstrapSignerReview,
  Qa as buildScopedApiUrl,
  Zr as byId,
  Zi as capitalize,
  Qi as createESignClient,
  ns as createElement,
  Va as createSchemaActionCachingRefresh,
  no as createSelectedFile,
  Xr as createStatusBadgeElement,
  ca as createTimeoutController,
  Ua as dateTimeCellRenderer,
  an as debounce,
  ja as defaultActionErrorHandler,
  za as defaultActionSuccessHandler,
  ta as delegate,
  jt as escapeHtml,
  Ha as fileSizeCellRenderer,
  Vr as formatDate,
  rn as formatDateTime,
  Nr as formatDriveDate,
  Or as formatDriveFileSize,
  en as formatFileSize,
  qr as formatPageCount,
  Kr as formatRecipientCount,
  Wr as formatRelativeTime,
  ss as formatSizeElements,
  Gr as formatTime,
  rs as formatTimestampElements,
  li as getAgreementStatusBadge,
  jr as getESignClient,
  Br as getFileIconConfig,
  Pi as getFileTypeName,
  is as getPageConfig,
  D as hide,
  Pa as initAgreementForm,
  os as initDetailFormatters,
  Ra as initDocumentDetailPreview,
  Ta as initDocumentForm,
  ma as initGoogleCallback,
  ya as initGoogleDrivePicker,
  fa as initGoogleIntegration,
  Ca as initIntegrationConflicts,
  wa as initIntegrationHealth,
  xa as initIntegrationMappings,
  La as initIntegrationSyncRuns,
  da as initLandingPage,
  pa as initSignerCompletePage,
  Da as initSignerErrorPage,
  ka as initSignerReview,
  zt as isFolder,
  Mr as isGoogleDoc,
  Wa as isGoogleWorkspaceFile,
  $r as isImportable,
  Rr as isPDF,
  sn as normalizeAccountId,
  Fr as normalizeDriveFile,
  Ka as normalizeDriveFiles,
  kr as normalizeFilterOperators,
  Pr as normalizeFilterOptions,
  _r as normalizeFilterType,
  ea as on,
  De as onReady,
  ra as poll,
  Na as prepareFilterFields,
  Oa as prepareGridColumns,
  u as qs,
  Bt as qsa,
  eo as renderBreadcrumb,
  Ur as renderFileIcon,
  Hr as renderFileItem,
  to as renderFileList,
  ts as renderStatusBadge,
  Ja as resolveAccountId,
  aa as retry,
  Ya as saveAccountId,
  Xi as setESignClient,
  ia as setLoading,
  qa as setupRefreshButton,
  G as show,
  di as sleep,
  Jr as snakeToTitle,
  Za as syncAccountIdToUrl,
  oa as throttle,
  na as toggle,
  Yr as truncate,
  Gt as updateDataText,
  sa as updateDataTexts,
  Qr as updateStatusBadge,
  la as withTimeout
};
//# sourceMappingURL=index.js.map

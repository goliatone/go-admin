import { a as Tt } from "../chunks/html-Br-oQr7i.js";
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
      const g = document.createElement("span");
      g.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, g.setAttribute("aria-hidden", "true"), i.prepend(g);
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
function Ot(i, e = document) {
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
function q(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function M(i) {
  i && i.classList.add("hidden");
}
function na(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? q(i) : M(i);
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
function mt(i, e = "polite") {
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
  let g = 0, y;
  for (; g < o; ) {
    if (r?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - f >= s)
      return {
        result: y,
        attempts: g,
        stopped: !1,
        timedOut: !0
      };
    if (g++, y = await e(), c && c(y, g), t(y))
      return {
        result: y,
        attempts: g,
        stopped: !0,
        timedOut: !1
      };
    await di(n, r);
  }
  return {
    result: y,
    attempts: g,
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
  let g;
  for (let y = 1; y <= t; y++) {
    if (f?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (w) {
      if (g = w, y >= t || !c(w, y))
        throw w;
      const R = o ? Math.min(n * Math.pow(2, y - 1), s) : n;
      r && r(w, y, R), await di(R, f);
    }
  }
  throw g;
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
      s && (n === e ? q(s) : M(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = u("#artifact-executed"), n = u("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), q(t));
    }
    if (e.source) {
      const t = u("#artifact-source"), n = u("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), q(t));
    }
    if (e.certificate) {
      const t = u("#artifact-certificate"), n = u("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), q(t));
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
  Ot("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = en(t));
  });
}
function rs(i = document) {
  Ot("[data-timestamp]", i).forEach((e) => {
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
    switch (M(t), M(n), M(s), e) {
      case "loading":
        q(t);
        break;
      case "success":
        q(n);
        break;
      case "error":
        q(s);
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
    s && (s.textContent = jn[e] || jn.unknown), t && o && (o.textContent = t, q(o)), this.sendToOpener({
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
      accountIdInput: g,
      oauthModal: y,
      disconnectModal: w
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, w && q(w);
    }), r && r.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, w && M(w);
    }), f && f.addEventListener("click", () => this.disconnect()), c && c.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), g && (g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, !0);
    }), g.addEventListener("keydown", (m) => {
      m.key === "Enter" && (m.preventDefault(), this.setCurrentAccountId(g.value, !0));
    }));
    const { accountDropdown: R, connectFirstBtn: E } = this.elements;
    R && R.addEventListener("change", () => {
      R.value === "__new__" ? (R.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(R.value, !0);
    }), E && E.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (m) => {
      m.key === "Escape" && (y && !y.classList.contains("hidden") && this.cancelOAuthFlow(), w && !w.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, M(w)));
    }), [y, w].forEach((m) => {
      m && m.addEventListener("click", (L) => {
        const I = L.target;
        (I === m || I.getAttribute("aria-hidden") === "true") && (M(m), m === y ? this.cancelOAuthFlow() : m === w && (this.pendingDisconnectAccountId = null));
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
    t && (t.textContent = e), mt(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: o } = this.elements;
    switch (M(t), M(n), M(s), M(o), e) {
      case "loading":
        q(t);
        break;
      case "disconnected":
        q(n);
        break;
      case "connected":
        q(s);
        break;
      case "error":
        q(o);
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
    const t = (L, I) => {
      for (const C of L)
        if (Object.prototype.hasOwnProperty.call(e, C) && e[C] !== void 0 && e[C] !== null)
          return e[C];
      return I;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), o = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), c = t(["connected", "Connected"], !1), r = t(["degraded", "Degraded"], !1), f = t(["degraded_reason", "DegradedReason"], ""), g = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), y = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), w = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let R = t(["is_expired", "IsExpired"], void 0), E = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof R != "boolean" || typeof E != "boolean") && n) {
      const L = new Date(n);
      if (!Number.isNaN(L.getTime())) {
        const I = L.getTime() - Date.now(), C = 5 * 60 * 1e3;
        R = I <= 0, E = I > 0 && I <= C;
      }
    }
    const m = typeof w == "boolean" ? w : (R === !0 || E === !0) && !y;
    return {
      connected: c,
      account_id: o,
      email: g,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: R === !0,
      is_expiring_soon: E === !0,
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
      c.textContent = "Access token status unknown", r && M(r);
      return;
    }
    const g = new Date(e), y = /* @__PURE__ */ new Date(), w = Math.max(
      1,
      Math.round((g.getTime() - y.getTime()) / (1e3 * 60))
    );
    t ? s ? (c.textContent = "Access token expired, but refresh is available and will be applied automatically.", c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), r && M(r)) : (c.textContent = "Access token has expired. Please re-authorize.", c.classList.remove("text-gray-500"), c.classList.add("text-red-600"), r && q(r), f && (f.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), s ? (c.textContent = `Token expires in approximately ${w} minute${w !== 1 ? "s" : ""}. Refresh is available automatically.`, r && M(r)) : (c.textContent = `Token expires in approximately ${w} minute${w !== 1 ? "s" : ""}`, r && q(r), f && (f.textContent = `Your access token will expire in ${w} minute${w !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (c.textContent = `Token valid until ${g.toLocaleDateString()} ${g.toLocaleTimeString()}`, r && M(r)), !o && r && M(r);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (q(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : M(n));
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
      const f = o.email || c || "Default", g = o.status !== "connected" ? ` (${o.status})` : "";
      r.textContent = `${f}${g}`, c === this.currentAccountId && (r.selected = !0), e.appendChild(r);
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
    if (e && M(e), this.accounts.length === 0) {
      t && q(t), n && M(n);
      return;
    }
    t && M(t), n && (q(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, c = t ? "ring-2 ring-blue-500" : "", r = n[e.status] || "bg-white border-gray-200", f = s[e.status] || "bg-gray-100 text-gray-700", g = o[e.status] || e.status, y = e.account_id || "default", w = e.email || (e.account_id ? e.account_id : "Default account");
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(w)}</p>
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
        this.pendingDisconnectAccountId = r, t && q(t);
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
    t && q(t);
    const s = this.resolveOAuthRedirectURI(), o = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = o;
    const c = this.buildGoogleOAuthUrl(s, o);
    if (!c) {
      t && M(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const r = 500, f = 600, g = (window.screen.width - r) / 2, y = (window.screen.height - f) / 2;
    if (this.oauthWindow = window.open(
      c,
      "google_oauth",
      `width=${r},height=${f},left=${g},top=${y},popup=yes`
    ), !this.oauthWindow) {
      t && M(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (w) => this.handleOAuthCallback(w), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && M(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    if (this.cleanupOAuthFlow(), n && M(n), this.closeOAuthWindow(), t.error) {
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
    e && M(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && M(e);
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
      importForm: g,
      importModal: y,
      viewListBtn: w,
      viewGridBtn: R
    } = this.elements;
    if (e) {
      const m = an(() => this.handleSearch(), 300);
      e.addEventListener("input", m), e.addEventListener("keydown", (L) => {
        L.key === "Enter" && (L.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), c && c.addEventListener("click", () => this.clearSelection()), r && r.addEventListener("click", () => this.hideImportModal()), f && g && g.addEventListener("submit", (m) => {
      m.preventDefault(), this.handleImport();
    }), y && y.addEventListener("click", (m) => {
      const L = m.target;
      (L === y || L.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), w && w.addEventListener("click", () => this.setViewMode("list")), R && R.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (m) => {
      m.key === "Escape" && y && !y.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: E } = this.elements;
    E && E.addEventListener("click", (m) => this.handleFileListClick(m));
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, q(e)) : M(e)), t) {
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
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), f = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : r ? [r] : [], y = Array.isArray(e.owners) ? e.owners : f ? [{ emailAddress: f }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: o,
      webViewLink: c,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && q(t));
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
      const r = await c.json(), f = Array.isArray(r.files) ? r.files.map((g) => this.normalizeDriveFile(g)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...f] : this.currentFiles = f, this.nextPageToken = r.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), mt(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), mt("Error loading files");
    } finally {
      this.isLoading = !1, t && M(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && M(t), this.currentFiles.length === 0) {
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), mt(`Selected: ${t.name}`));
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
      importBtn: g,
      openInGoogleBtn: y
    } = this.elements;
    if (!this.selectedFile) {
      e && q(e), t && M(t);
      return;
    }
    e && M(e), t && q(t);
    const w = this.selectedFile, R = Vn.includes(w.mimeType);
    s && (s.textContent = w.name), o && (o.textContent = this.getMimeTypeLabel(w.mimeType)), c && (c.textContent = w.id), r && w.owners.length > 0 && (r.textContent = w.owners[0].emailAddress || "-"), f && (f.textContent = rn(w.modifiedTime)), g && (R ? (g.removeAttribute("disabled"), g.classList.remove("opacity-50", "cursor-not-allowed")) : (g.setAttribute("disabled", "true"), g.classList.add("opacity-50", "cursor-not-allowed"))), y && w.webViewLink && (y.href = w.webViewLink);
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
      M(e), t && (t.textContent = "Search Results");
      return;
    }
    q(e);
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
    ).join(""), Ot(".breadcrumb-item", s).forEach((o) => {
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
    e && (this.nextPageToken ? q(e) : M(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? q(t) : M(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && M(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    s && (s.value = ""), e && q(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && M(e);
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
    e && e.setAttribute("disabled", "true"), t && q(t), n && (n.textContent = "Importing...");
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
          document_title: r,
          agreement_title: f || void 0
        })
      });
      if (!g.ok) {
        const w = await g.json();
        throw new Error(w.error?.message || "Import failed");
      }
      const y = await g.json();
      this.showToast("Import started successfully", "success"), mt("Import started"), this.hideImportModal(), y.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${y.document.id}` : y.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${y.agreement.id}`);
    } catch (g) {
      console.error("Import error:", g);
      const y = g instanceof Error ? g.message : "Import failed";
      this.showToast(y, "error"), mt(`Error: ${y}`);
    } finally {
      e && e.removeAttribute("disabled"), t && M(t), n && (n.textContent = "Import");
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
      this.renderHealthData(), mt("Health data refreshed");
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
    const r = o.width, f = o.height, g = 40, y = r - g * 2, w = f - g * 2;
    c.clearRect(0, 0, r, f);
    const R = t.labels, E = Object.values(t.datasets), m = y / R.length / (E.length + 1), L = Math.max(...E.flat()) || 1;
    R.forEach((I, C) => {
      const k = g + C * y / R.length + m / 2;
      E.forEach((H, j) => {
        const _ = H[C] / L * w, X = k + j * m, $ = f - g - _;
        c.fillStyle = n[j] || "#6b7280", c.fillRect(X, $, m - 2, _);
      }), C % Math.ceil(R.length / 6) === 0 && (c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "center", c.fillText(I, k + E.length * m / 2, f - g + 15));
    }), c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "right";
    for (let I = 0; I <= 4; I++) {
      const C = f - g - I * w / 4, k = Math.round(L * I / 4);
      c.fillText(k.toString(), g - 5, C + 3);
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
      validateBtn: g,
      mappingForm: y,
      publishCancelBtn: w,
      publishConfirmBtn: R,
      deleteCancelBtn: E,
      deleteConfirmBtn: m,
      closePreviewBtn: L,
      loadSampleBtn: I,
      runPreviewBtn: C,
      clearPreviewBtn: k,
      previewSourceInput: H,
      searchInput: j,
      filterStatus: _,
      filterProvider: X,
      mappingModal: $,
      publishModal: ne,
      deleteModal: me,
      previewModal: ae
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.loadMappings()), r?.addEventListener("click", () => this.addSchemaField()), f?.addEventListener("click", () => this.addMappingRule()), g?.addEventListener("click", () => this.validateMapping()), y?.addEventListener("submit", (ce) => {
      ce.preventDefault(), this.saveMapping();
    }), w?.addEventListener("click", () => this.closePublishModal()), R?.addEventListener("click", () => this.publishMapping()), E?.addEventListener("click", () => this.closeDeleteModal()), m?.addEventListener("click", () => this.deleteMapping()), L?.addEventListener("click", () => this.closePreviewModal()), I?.addEventListener("click", () => this.loadSamplePayload()), C?.addEventListener("click", () => this.runPreviewTransform()), k?.addEventListener("click", () => this.clearPreview()), H?.addEventListener("input", an(() => this.validateSourceJson(), 300)), j?.addEventListener("input", an(() => this.renderMappings(), 300)), _?.addEventListener("change", () => this.renderMappings()), X?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ce) => {
      ce.key === "Escape" && ($ && !$.classList.contains("hidden") && this.closeModal(), ne && !ne.classList.contains("hidden") && this.closePublishModal(), me && !me.classList.contains("hidden") && this.closeDeleteModal(), ae && !ae.classList.contains("hidden") && this.closePreviewModal());
    }), [$, ne, me, ae].forEach((ce) => {
      ce?.addEventListener("click", (Ue) => {
        const ue = Ue.target;
        (ue === ce || ue.getAttribute("aria-hidden") === "true") && (ce === $ ? this.closeModal() : ce === ne ? this.closePublishModal() : ce === me ? this.closeDeleteModal() : ce === ae && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), mt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: o } = this.elements;
    switch (M(t), M(n), M(s), M(o), e) {
      case "loading":
        q(t);
        break;
      case "empty":
        q(n);
        break;
      case "error":
        q(s);
        break;
      case "list":
        q(o);
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
    const o = (t?.value || "").toLowerCase(), c = n?.value || "", r = s?.value || "", f = this.mappings.filter((g) => !(o && !g.name.toLowerCase().includes(o) && !g.provider.toLowerCase().includes(o) || c && g.status !== c || r && g.provider !== r));
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
      mappingProviderInput: s,
      schemaObjectTypeInput: o,
      schemaVersionInput: c,
      schemaFieldsContainer: r,
      mappingRulesContainer: f
    } = this.elements, g = [];
    r?.querySelectorAll(".schema-field-row").forEach((w) => {
      g.push({
        object: (w.querySelector(".field-object")?.value || "").trim(),
        field: (w.querySelector(".field-name")?.value || "").trim(),
        type: w.querySelector(".field-type")?.value || "string",
        required: w.querySelector(".field-required")?.checked || !1
      });
    });
    const y = [];
    return f?.querySelectorAll(".mapping-rule-row").forEach((w) => {
      y.push({
        source_object: (w.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (w.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: w.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (w.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: o?.value.trim() || "",
        version: c?.value.trim() || void 0,
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
      mappingNameInput: s,
      mappingProviderInput: o,
      schemaObjectTypeInput: c,
      schemaVersionInput: r,
      schemaFieldsContainer: f,
      mappingRulesContainer: g,
      mappingStatusBadge: y,
      formValidationStatus: w
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), o && (o.value = e.provider || "");
    const R = e.external_schema || { object_type: "", fields: [] };
    c && (c.value = R.object_type || ""), r && (r.value = R.version || ""), f && (f.innerHTML = "", (R.fields || []).forEach((E) => f.appendChild(this.createSchemaFieldRow(E)))), g && (g.innerHTML = "", (e.rules || []).forEach((E) => g.appendChild(this.createMappingRuleRow(E)))), e.status && y ? (y.innerHTML = this.getStatusBadge(e.status), y.classList.remove("hidden")) : y && y.classList.add("hidden"), M(w);
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
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), o && (o.innerHTML = ""), c && c.classList.add("hidden"), M(r), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), q(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), q(n), o?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    M(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: o } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), q(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    M(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, q(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    M(this.elements.deleteModal), this.pendingDeleteId = null;
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
      q(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, q(t));
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
      sourceSyntaxError: g
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), o && (o.textContent = t.provider), c && (c.textContent = t.external_schema?.object_type || "-"), r && (r.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), f && (f.value = ""), M(g), q(n), f?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    M(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: o } = this.elements;
    switch (M(t), M(n), M(s), M(o), e) {
      case "empty":
        q(t);
        break;
      case "loading":
        q(n);
        break;
      case "error":
        q(s);
        break;
      case "success":
        q(o);
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
      const g = f.field || "field";
      switch (f.type) {
        case "string":
          r[g] = g === "email" ? "john.doe@example.com" : g === "name" ? "John Doe" : `sample_${g}`;
          break;
        case "number":
          r[g] = 123;
          break;
        case "boolean":
          r[g] = !0;
          break;
        case "date":
          r[g] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          r[g] = `sample_${g}`;
      }
    }), c[s] = r, e && (e.value = JSON.stringify(c, null, 2)), M(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return M(t), null;
    try {
      const s = JSON.parse(n);
      return M(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, q(t)), null;
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
      const g = this.resolveSourceValue(e, f.source_object, f.source_field), y = g !== void 0;
      if (s.matched_rules.push({
        source: f.source_field,
        matched: y,
        value: g
      }), !!y)
        switch (f.target_entity) {
          case "participant":
            o[f.target_path] = g;
            break;
          case "agreement":
            c[f.target_path] = g;
            break;
          case "field_definition":
            r.push({ path: f.target_path, value: g });
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
    } = this.elements, g = e.participants || [];
    n && (n.textContent = `(${g.length})`), t && (g.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = g.map(
      (E) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(E.name || E.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(E.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(E.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(E.role))}</span>
              <span class="text-xs text-gray-500">Stage ${E.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const y = e.field_definitions || [];
    o && (o.textContent = `(${y.length})`), s && (y.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = y.map(
      (E) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(E.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(E.value))}</span>
          </div>
        `
    ).join(""));
    const w = e.agreement || {}, R = Object.entries(w);
    c && (R.length === 0 ? c.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : c.innerHTML = R.map(
      ([E, m]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(E)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(m))}</span>
          </div>
        `
    ).join("")), r && (r.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((E) => {
      const m = f?.querySelector(`[data-rule-source="${this.escapeHtml(E.source)}"] span`);
      m && (E.matched ? (m.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", m.textContent = "Matched") : (m.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", m.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), M(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
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
      cancelResolveBtn: g,
      resolveForm: y,
      conflictDetailModal: w,
      resolveModal: R
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), f?.addEventListener("click", () => this.openResolveModal("ignored")), g?.addEventListener("click", () => this.closeResolveModal()), y?.addEventListener("submit", (E) => this.submitResolution(E)), document.addEventListener("keydown", (E) => {
      E.key === "Escape" && (R && !R.classList.contains("hidden") ? this.closeResolveModal() : w && !w.classList.contains("hidden") && this.closeConflictDetail());
    }), [w, R].forEach((E) => {
      E?.addEventListener("click", (m) => {
        const L = m.target;
        (L === E || L.getAttribute("aria-hidden") === "true") && (E === w ? this.closeConflictDetail() : E === R && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), mt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: o } = this.elements;
    switch (M(t), M(n), M(s), M(o), e) {
      case "loading":
        q(t);
        break;
      case "empty":
        q(n);
        break;
      case "error":
        q(s);
        break;
      case "list":
        q(o);
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
    const o = t?.value || "", c = n?.value || "", r = s?.value || "", f = this.conflicts.filter((g) => !(o && g.status !== o || c && g.provider !== c || r && g.entity_kind !== r));
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
    const t = this.conflicts.find((_) => _.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: o,
      detailStatusBadge: c,
      detailProvider: r,
      detailExternalId: f,
      detailInternalId: g,
      detailBindingId: y,
      detailConflictId: w,
      detailRunId: R,
      detailCreatedAt: E,
      detailVersion: m,
      detailPayload: L,
      resolutionSection: I,
      actionButtons: C,
      detailResolvedAt: k,
      detailResolvedBy: H,
      detailResolution: j
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), f && (f.textContent = t.external_id || "-"), g && (g.textContent = t.internal_id || "-"), y && (y.textContent = t.binding_id || "-"), w && (w.textContent = t.id), R && (R.textContent = t.run_id || "-"), E && (E.textContent = this.formatDate(t.created_at)), m && (m.textContent = String(t.version || 1)), L)
      try {
        const _ = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        L.textContent = JSON.stringify(_, null, 2);
      } catch {
        L.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (q(I), M(C), k && (k.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), H && (H.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), j)
        try {
          const _ = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          j.textContent = JSON.stringify(_, null, 2);
        } catch {
          j.textContent = t.resolution_json || "{}";
        }
    } else
      M(I), q(C);
    q(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    M(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), q(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    M(this.elements.resolveModal);
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
      filterStatus: g,
      filterDirection: y,
      actionResumeBtn: w,
      actionRetryBtn: R,
      actionCompleteBtn: E,
      actionFailBtn: m,
      actionDiagnosticsBtn: L,
      startSyncModal: I,
      runDetailModal: C
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (k) => this.startSync(k)), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.loadSyncRuns()), r?.addEventListener("click", () => this.closeRunDetail()), f?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("change", () => this.renderTimeline()), y?.addEventListener("change", () => this.renderTimeline()), w?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("resume")), E?.addEventListener("click", () => this.runAction("complete")), m?.addEventListener("click", () => this.runAction("fail")), L?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (k) => {
      k.key === "Escape" && (I && !I.classList.contains("hidden") && this.closeStartSyncModal(), C && !C.classList.contains("hidden") && this.closeRunDetail());
    }), [I, C].forEach((k) => {
      k?.addEventListener("click", (H) => {
        const j = H.target;
        (j === k || j.getAttribute("aria-hidden") === "true") && (k === I ? this.closeStartSyncModal() : k === C && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), mt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: o } = this.elements;
    switch (M(t), M(n), M(s), M(o), e) {
      case "loading":
        q(t);
        break;
      case "empty":
        q(n);
        break;
      case "error":
        q(s);
        break;
      case "list":
        q(o);
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
      (g) => g.status === "running" || g.status === "pending"
    ).length, r = this.syncRuns.filter((g) => g.status === "completed").length, f = this.syncRuns.filter((g) => g.status === "failed").length;
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
    t?.reset(), q(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    M(this.elements.startSyncModal);
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
    const t = this.syncRuns.find((H) => H.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: o,
      detailDirection: c,
      detailStatus: r,
      detailStarted: f,
      detailCompleted: g,
      detailCursor: y,
      detailAttempt: w,
      detailErrorSection: R,
      detailLastError: E,
      detailCheckpoints: m,
      actionResumeBtn: L,
      actionRetryBtn: I,
      actionCompleteBtn: C,
      actionFailBtn: k
    } = this.elements;
    s && (s.textContent = t.id), o && (o.textContent = t.provider), c && (c.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), r && (r.innerHTML = this.getStatusBadge(t.status)), f && (f.textContent = this.formatDate(t.started_at)), g && (g.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), y && (y.textContent = t.cursor || "-"), w && (w.textContent = String(t.attempt_count || 1)), t.last_error ? (E && (E.textContent = t.last_error), q(R)) : M(R), L && L.classList.toggle("hidden", t.status !== "running"), I && I.classList.toggle("hidden", t.status !== "failed"), C && C.classList.toggle("hidden", t.status !== "running"), k && k.classList.toggle("hidden", t.status !== "running"), m && (m.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), q(n);
    try {
      const H = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (H.ok) {
        const j = await H.json();
        this.renderCheckpoints(j.checkpoints || []);
      } else
        m && (m.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (H) {
      console.error("Error loading checkpoints:", H), m && (m.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    M(this.elements.runDetailModal), this.currentRunId = null;
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
        const w = await y.json();
        throw new Error(w.error?.message || `HTTP ${y.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (g) {
      console.error(`${e} error:`, g);
      const y = g instanceof Error ? g.message : "Unknown error";
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
      sourceTabs: Ot(".source-tab"),
      sourcePanels: Ot(".source-panel"),
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
      const g = an(() => this.handleSearch(), 300);
      e.addEventListener("input", g);
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
      s && (s.value = ""), o && M(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const r = String(s?.email || "").trim(), f = String(s?.status || "").trim(), g = r || o || "Default account";
      c.textContent = f && f !== "connected" ? `${g} (${f})` : g, o === this.currentAccountId && (c.selected = !0), e.appendChild(c);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, q(e)) : M(e)), t) {
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
      n.id.replace("panel-", "") === e ? q(n) : M(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), mt(
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
    s && (s.textContent = e.name), o && (o.textContent = en(e.size)), t && M(t), n && q(n), c && (c.classList.remove("border-gray-300"), c.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && q(e), t && M(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, q(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", M(e));
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
      const w = f?.error?.message || f?.message || "Upload failed. Please try again.";
      throw new Error(w);
    }
    const g = f?.object_key ? String(f.object_key).trim() : "";
    if (!g)
      throw new Error("Upload failed: missing source object key.");
    const y = f?.source_original_name ? String(f.source_original_name).trim() : f?.original_name ? String(f.original_name).trim() : e.name;
    return {
      objectKey: g,
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
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), f = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : r ? [r] : [], y = Array.isArray(e.owners) ? e.owners : f ? [{ emailAddress: f }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: o,
      webViewLink: c,
      parents: g,
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
      }), g = await f.json();
      if (!f.ok)
        throw new Error(g.error?.message || "Failed to load files");
      const y = Array.isArray(g.files) ? g.files.map((m) => this.normalizeDriveFile(m)) : [];
      this.nextPageToken = g.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...y] : this.currentFiles = y, this.renderFiles(o);
      const { resultCount: w, listTitle: R } = this.elements;
      n && w ? (w.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, R && (R.textContent = "Search Results")) : (w && (w.textContent = ""), R && (R.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: E } = this.elements;
      E && (this.nextPageToken ? q(E) : M(E)), mt(`Loaded ${y.length} files`);
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
        `), mt(`Error: ${r instanceof Error ? r.message : "Unknown error"}`);
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
      const c = this.getFileIcon(s), r = this.isImportable(s), f = this.isFolder(s), g = this.selectedFile && this.selectedFile.id === s.id, y = !r && !f;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${g ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${y ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${g}"
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
    t && (t.value = ""), n && M(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      M(e);
      return;
    }
    q(e);
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
    s && s.querySelectorAll(".file-item").forEach((I) => {
      const C = parseInt(I.dataset.fileIndex || "0", 10);
      this.currentFiles[C].id === e.id ? (I.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), I.setAttribute("aria-selected", "true")) : (I.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), I.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: o,
      filePreview: c,
      importStatus: r,
      previewIcon: f,
      previewTitle: g,
      previewType: y,
      importTypeInfo: w,
      importTypeLabel: R,
      importTypeDesc: E,
      snapshotWarning: m,
      importDocumentTitle: L
    } = this.elements;
    o && M(o), c && q(c), r && M(r), f && (f.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, f.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), g && (g.textContent = e.name || "Untitled"), y && (y.textContent = this.getFileTypeName(e.mimeType)), n && w && (w.className = `p-3 rounded-lg border ${n.bgClass}`, R && (R.textContent = n.label, R.className = `text-xs font-medium ${n.textClass}`), E && (E.textContent = n.desc, E.className = `text-xs mt-1 ${n.textClass}`), m && (n.showSnapshot ? q(m) : M(m))), L && (L.value = e.name || ""), mt(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && q(e), t && M(t), n && M(n), s && s.querySelectorAll(".file-item").forEach((o) => {
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
      t && q(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && M(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && M(t), this.searchQuery = "";
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
    switch (t && M(t), n && M(n), s && q(s), o && M(o), c && M(c), r && M(r), e) {
      case "queued":
      case "running":
        o && q(o);
        break;
      case "succeeded":
        c && q(c);
        break;
      case "failed":
        r && q(r);
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
        s.href = this.applyAccountIdToPath(o), q(s);
      } else
        M(s);
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
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && M(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
      const g = new URL(window.location.href);
      this.currentImportRunId && g.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", g.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
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
            this.showImportStatus("succeeded"), mt("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const o = n.error?.code || "", c = n.error?.message || "Import failed";
            this.showImportError(c, o), mt("Import failed");
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
const ot = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, Jt = ot.REVIEW, gs = {
  [ot.DOCUMENT]: "Details",
  [ot.DETAILS]: "Participants",
  [ot.PARTICIPANTS]: "Fields",
  [ot.FIELDS]: "Placement",
  [ot.PLACEMENT]: "Review"
}, bt = {
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
ot.DOCUMENT, ot.DETAILS, ot.PARTICIPANTS, ot.FIELDS, ot.REVIEW;
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
  }).promise, c = o.numPages, r = await o.getPage(1), f = r.getViewport({ scale: 1 }), g = e / f.width, y = t / f.height, w = Math.min(g, y, 1), R = r.getViewport({ scale: w }), E = document.createElement("canvas");
  E.width = R.width, E.height = R.height;
  const m = E.getContext("2d");
  if (!m)
    throw new Error("Failed to get canvas context");
  return await r.render({
    canvasContext: m,
    viewport: R
  }).promise, { dataUrl: E.toDataURL("image/jpeg", 0.8), pageCount: c };
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
    const t = e === ot.DOCUMENT || e === ot.DETAILS || e === ot.PARTICIPANTS || e === ot.FIELDS || e === ot.REVIEW;
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
function ut(i, e) {
  return i instanceof Document ? i.getElementById(e) : i.querySelector(`#${e}`);
}
function qt(i, e, t) {
  const n = ut(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function Ls(i = document) {
  return {
    marker: ut(i, "esign-page-config"),
    form: {
      root: qt(i, "agreement-form", "form"),
      submitBtn: qt(i, "submit-btn", "submit button"),
      wizardSaveBtn: ut(i, "wizard-save-btn"),
      announcements: ut(i, "form-announcements"),
      documentIdInput: qt(i, "document_id", "document selector"),
      documentPageCountInput: ut(i, "document_page_count"),
      titleInput: qt(i, "title", "title input"),
      messageInput: qt(i, "message", "message input")
    },
    ownership: {
      banner: ut(i, "active-tab-banner"),
      message: ut(i, "active-tab-message"),
      takeControlBtn: ut(i, "active-tab-take-control-btn"),
      reloadBtn: ut(i, "active-tab-reload-btn")
    },
    sync: {
      indicator: ut(i, "sync-status-indicator"),
      icon: ut(i, "sync-status-icon"),
      text: ut(i, "sync-status-text"),
      retryBtn: ut(i, "sync-retry-btn")
    },
    conflict: {
      modal: ut(i, "conflict-dialog-modal"),
      localTime: ut(i, "conflict-local-time"),
      serverRevision: ut(i, "conflict-server-revision"),
      serverTime: ut(i, "conflict-server-time")
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
      const g = n?.claim, y = g?.lastSeenAt ? e.formatRelativeTime(g.lastSeenAt) : "recently";
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
    const r = e.details && typeof e.details == "object" ? e.details : {}, f = String(r.title ?? "").trim(), g = f === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    n.details = {
      title: f,
      message: String(r.message ?? "")
    }, n.participants = Array.isArray(e.participants) ? e.participants : [], n.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], n.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], n.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const y = String(e.wizardId ?? "").trim();
    n.wizardId = y || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, g), n.storageMigrationVersion = this.options.parsePositiveInt(
      e.storageMigrationVersion,
      this.options.storageMigrationVersion
    ) || this.options.storageMigrationVersion;
    const w = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = w || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
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
function kt(i) {
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
    wizardId: kt(e?.wizardId),
    serverDraftId: kt(e?.serverDraftId),
    serverRevision: Yn(e?.serverRevision),
    currentStep: Yn(e?.currentStep),
    syncPending: e?.syncPending === !0,
    storageKey: kt(t),
    activeTabOwner: typeof n?.isOwner == "boolean" ? n.isOwner : null,
    activeTabClaimTabId: kt(n?.claim?.tabId),
    activeTabClaimedAt: kt(n?.claim?.claimedAt),
    activeTabLastSeenAt: kt(n?.claim?.lastSeenAt),
    activeTabBlockedReason: kt(n?.blockedReason),
    sendAttemptId: kt(s),
    ...o
  };
}
function at(i, e = {}) {
  console.info(bi, i, e);
}
function gt(i, e = {}) {
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
      gt("sync_schedule_blocked", Ee({
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
      return gt("sync_force_blocked", Ee({
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
    if (at("sync_force_start", Ee({
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
        at("sync_keepalive_request", Ee({
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
          const g = await o.json().catch(() => ({})), y = Number(g?.error?.details?.current_revision || 0);
          return this.options.statusUpdater("conflict"), this.options.showConflictDialog(y > 0 ? y : n.serverRevision), gt("sync_keepalive_conflict", Ee({
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
          return this.stateManager.markSynced(r, f), this.options.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(r, f), at("sync_keepalive_success", Ee({
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
        gt("sync_keepalive_fallback", Ee({
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
      return gt("sync_perform_blocked", Ee({
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
      return this.options.statusUpdater("saved"), at("sync_perform_skipped", Ee({
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
    this.isSyncing = !0, this.options.statusUpdater("saving"), at("sync_perform_start", Ee({
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
    return this.isSyncing = !1, t.success ? (t.result?.id && t.result?.revision && this.broadcastSyncCompleted(t.result.id, t.result.revision), this.options.statusUpdater("saved"), this.retryCount = 0, at("sync_perform_success", Ee({
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
    })), { success: !0, draftId: t.result?.id || null, revision: t.result?.revision || 0 }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), gt("sync_perform_conflict", Ee({
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
    })), { conflict: !0, currentRevision: t.currentRevision }) : (this.options.statusUpdater("error"), this.scheduleRetry(), gt("sync_perform_error", Ee({
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
function It(i) {
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
    getCurrentDocumentPageCount: g,
    collectFieldRulesForState: y,
    expandRulesForPreview: w,
    findSignersMissingRequiredSignatureField: R,
    goToStep: E
  } = i;
  function m() {
    const L = It("send-readiness-loading"), I = It("send-readiness-results"), C = It("send-validation-status"), k = It("send-validation-issues"), H = It("send-issues-list"), j = It("send-confirmation"), _ = It("review-agreement-title"), X = It("review-document-title"), $ = It("review-participant-count"), ne = It("review-stage-count"), me = It("review-participants-list"), ae = It("review-fields-summary"), ce = document.getElementById("title");
    if (!L || !I || !C || !k || !H || !j || !_ || !X || !$ || !ne || !me || !ae || !(ce instanceof HTMLInputElement))
      return;
    const Ue = ce.value || "Untitled", ue = t?.textContent || "No document", Re = n.querySelectorAll(".participant-entry"), ze = s.querySelectorAll(".field-definition-entry"), je = w(y(), g()), Ze = f(), Fe = /* @__PURE__ */ new Set();
    Re.forEach((oe) => {
      const G = oe.querySelector(".signing-stage-input"), de = oe.querySelector('select[name*=".role"]');
      de instanceof HTMLSelectElement && de.value === "signer" && G instanceof HTMLInputElement && G.value && Fe.add(Number.parseInt(G.value, 10));
    }), _.textContent = Ue, X.textContent = ue, $.textContent = `${Re.length} (${Ze.length} signers)`, ne.textContent = String(Fe.size > 0 ? Fe.size : 1), me.innerHTML = "", Re.forEach((oe) => {
      const G = Yt(oe, 'input[name*=".name"]'), de = Yt(oe, 'input[name*=".email"]'), ye = Yt(oe, 'select[name*=".role"]', "signer"), it = Yt(oe, ".signing-stage-input"), Ve = Rs(oe, ".notify-input", !0), rt = document.createElement("div");
      rt.className = "flex items-center justify-between text-sm", rt.innerHTML = `
        <div>
          <span class="font-medium">${r(G || de)}</span>
          <span class="text-gray-500 ml-2">${r(de)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${ye === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${ye === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${Ve ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${Ve ? "Notify" : "No Notify"}
          </span>
          ${ye === "signer" && it ? `<span class="text-xs text-gray-500">Stage ${it}</span>` : ""}
        </div>
      `, me.appendChild(rt);
    });
    const Le = ze.length + je.length;
    ae.textContent = `${Le} field${Le !== 1 ? "s" : ""} defined (${ze.length} manual, ${je.length} generated)`;
    const pe = [];
    e?.value || pe.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), Ze.length === 0 && pe.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), R().forEach((oe) => {
      pe.push({
        severity: "error",
        message: `${oe.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Je = Array.from(Fe).sort((oe, G) => oe - G);
    for (let oe = 0; oe < Je.length; oe++)
      if (Je[oe] !== oe + 1) {
        pe.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Oe = pe.some((oe) => oe.severity === "error"), st = pe.some((oe) => oe.severity === "warning");
    Oe ? (C.className = "p-4 rounded-lg bg-red-50 border border-red-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, j.classList.add("hidden"), Xt(o, !0)) : st ? (C.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, j.classList.remove("hidden"), Xt(o, !1)) : (C.className = "p-4 rounded-lg bg-green-50 border border-green-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, j.classList.remove("hidden"), Xt(o, !1)), c.isOwner || (C.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", C.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, j.classList.add("hidden"), Xt(o, !0)), pe.length > 0 ? (k.classList.remove("hidden"), H.innerHTML = "", pe.forEach((oe) => {
      const G = document.createElement("li");
      G.className = `p-3 rounded-lg flex items-center justify-between ${oe.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, G.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${oe.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${oe.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${r(oe.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${oe.step}">
            ${r(oe.action)}
          </button>
        `, H.appendChild(G);
    }), H.querySelectorAll("[data-go-to-step]").forEach((oe) => {
      oe.addEventListener("click", () => {
        const G = Number(oe.getAttribute("data-go-to-step"));
        Number.isFinite(G) && E(G);
      });
    })) : k.classList.add("hidden"), L.classList.add("hidden"), I.classList.remove("hidden");
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
    onPlacementStep: g,
    onReviewStep: y,
    onStepChanged: w,
    initialStep: R = 1
  } = i;
  let E = R;
  const m = Array.from(document.querySelectorAll(".wizard-step-btn")), L = Array.from(document.querySelectorAll(".wizard-step")), I = Array.from(document.querySelectorAll(".wizard-connector")), C = document.getElementById("wizard-prev-btn"), k = document.getElementById("wizard-next-btn"), H = document.getElementById("wizard-save-btn");
  function j() {
    if (m.forEach(($, ne) => {
      const me = ne + 1, ae = $.querySelector(".wizard-step-number");
      ae instanceof HTMLElement && (me < E ? ($.classList.remove("text-gray-500", "text-blue-600"), $.classList.add("text-green-600"), ae.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), ae.classList.add("bg-green-600", "text-white"), $.removeAttribute("aria-current")) : me === E ? ($.classList.remove("text-gray-500", "text-green-600"), $.classList.add("text-blue-600"), ae.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), ae.classList.add("bg-blue-600", "text-white"), $.setAttribute("aria-current", "step")) : ($.classList.remove("text-blue-600", "text-green-600"), $.classList.add("text-gray-500"), ae.classList.remove("bg-blue-600", "text-white", "bg-green-600"), ae.classList.add("bg-gray-300", "text-gray-600"), $.removeAttribute("aria-current")));
    }), I.forEach(($, ne) => {
      ne < E - 1 ? ($.classList.remove("bg-gray-300"), $.classList.add("bg-green-600")) : ($.classList.remove("bg-green-600"), $.classList.add("bg-gray-300"));
    }), L.forEach(($) => {
      Xn($.dataset.step) === E ? $.classList.remove("hidden") : $.classList.add("hidden");
    }), C?.classList.toggle("hidden", E === 1), k?.classList.toggle("hidden", E === e), H?.classList.toggle("hidden", E !== e), s.classList.toggle("hidden", E !== e), r({
      isOwner: o.isOwner,
      reason: o.lastBlockedReason,
      claim: o.currentClaim
    }), E < e) {
      const $ = n[E] || "Next";
      k && (k.innerHTML = `
        ${$}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    E === t.PLACEMENT ? g?.() : E === t.REVIEW && y?.(), c.updateVisibility(E);
  }
  function _($) {
    if (!($ < t.DOCUMENT || $ > e)) {
      if ($ > E) {
        for (let ne = E; ne < $; ne++)
          if (!f(ne)) return;
      }
      E = $, j(), w?.($), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function X() {
    m.forEach(($) => {
      $.addEventListener("click", () => {
        const ne = Xn($.dataset.step);
        _(ne);
      });
    }), C?.addEventListener("click", () => _(E - 1)), k?.addEventListener("click", () => _(E + 1)), H?.addEventListener("click", () => {
      const $ = document.getElementById("agreement-form");
      if (!($ instanceof HTMLFormElement)) return;
      const ne = document.createElement("input");
      ne.type = "hidden", ne.name = "save_as_draft", ne.value = "1", $.appendChild(ne), $.submit();
    });
  }
  return {
    bindEvents: X,
    getCurrentStep() {
      return E;
    },
    setCurrentStep($) {
      E = $;
    },
    goToStep: _,
    updateWizardUI: j
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
    fieldRulesContainer: g,
    documentPageCountInput: y,
    fieldPlacementsJSONInput: w,
    fieldRulesJSONInput: R,
    currentUserID: E,
    storageKey: m,
    draftsEndpoint: L,
    draftEndpointWithUserID: I,
    draftRequestHeaders: C,
    syncService: k,
    syncOrchestrator: H,
    stateManager: j,
    submitMode: _,
    totalWizardSteps: X,
    wizardStep: $,
    getCurrentStep: ne,
    getPlacementState: me,
    getCurrentDocumentPageCount: ae,
    ensureSelectedDocumentCompatibility: ce,
    collectFieldRulesForState: Ue,
    collectFieldRulesForForm: ue,
    expandRulesForPreview: Re,
    findSignersMissingRequiredSignatureField: ze,
    missingSignatureFieldMessage: je,
    getSignerParticipants: Ze,
    buildCanonicalAgreementPayload: Fe,
    announceError: Le,
    emitWizardTelemetry: pe,
    parseAPIError: Be,
    goToStep: Je,
    surfaceSyncOutcome: Oe,
    activeTabOwnershipRequiredCode: st = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: oe,
    addFieldBtn: G
  } = i;
  let de = null;
  function ye() {
    return oe?.() || {
      isOwner: typeof H.isOwner == "boolean" ? H.isOwner : void 0,
      claim: H.currentClaim || null,
      blockedReason: String(H.lastBlockedReason || "").trim() || void 0
    };
  }
  function it(fe, Ie = !1) {
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
  async function Ve() {
    at("persist_latest_wizard_state_start", Ee({
      state: j.getState(),
      storageKey: m,
      ownership: ye(),
      sendAttemptId: de
    })), j.updateState(j.collectFormState());
    const fe = await H.forceSync();
    if (fe?.blocked && fe.reason === "passive_tab")
      throw gt("persist_latest_wizard_state_blocked", Ee({
        state: j.getState(),
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          reason: fe.reason
        }
      })), {
        code: st,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const Ie = j.getState();
    if (Ie?.syncPending)
      throw gt("persist_latest_wizard_state_unsynced", Ee({
        state: Ie,
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de
      })), new Error("Unable to sync latest draft changes");
    return at("persist_latest_wizard_state_complete", Ee({
      state: Ie,
      storageKey: m,
      ownership: ye(),
      sendAttemptId: de
    })), Ie;
  }
  async function rt() {
    at("ensure_draft_ready_for_send_start", Ee({
      state: j.getState(),
      storageKey: m,
      ownership: ye(),
      sendAttemptId: de
    }));
    const fe = await Ve(), Ie = String(fe?.serverDraftId || "").trim();
    if (!Ie) {
      gt("ensure_draft_ready_for_send_missing_draft", Ee({
        state: fe,
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          action: "create_draft"
        }
      }));
      const P = await k.create(fe), T = String(P.id || "").trim(), B = Number(P.revision || 0);
      return T && B > 0 && j.markSynced(T, B), at("ensure_draft_ready_for_send_created", Ee({
        state: j.getState(),
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          loadedDraftId: T,
          loadedRevision: B
        }
      })), {
        draftID: T,
        revision: B
      };
    }
    try {
      at("ensure_draft_ready_for_send_loading", Ee({
        state: fe,
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          targetDraftId: Ie
        }
      }));
      const P = await k.load(Ie), T = String(P?.id || Ie).trim(), B = Number(P?.revision || fe?.serverRevision || 0);
      return T && B > 0 && j.markSynced(T, B), at("ensure_draft_ready_for_send_loaded", Ee({
        state: j.getState(),
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          loadedDraftId: T,
          loadedRevision: B
        }
      })), {
        draftID: T,
        revision: B > 0 ? B : Number(fe?.serverRevision || 0)
      };
    } catch (P) {
      if (Number(yn(P) && P.status || 0) !== 404)
        throw gt("ensure_draft_ready_for_send_load_failed", Ee({
          state: fe,
          storageKey: m,
          ownership: ye(),
          sendAttemptId: de,
          extra: {
            targetDraftId: Ie,
            status: Number(yn(P) && P.status || 0)
          }
        })), P;
      gt("ensure_draft_ready_for_send_stale_recreate", Ee({
        state: fe,
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          targetDraftId: Ie,
          status: 404
        }
      }));
      const T = await k.create({
        ...j.getState(),
        ...j.collectFormState()
      }), B = String(T?.id || "").trim(), Q = Number(T?.revision || 0);
      return j.markSynced(B, Q), pe("wizard_send_stale_draft_recovered", {
        stale_draft_id: Ie,
        recovered_draft_id: B
      }), at("ensure_draft_ready_for_send_recreated", Ee({
        state: j.getState(),
        storageKey: m,
        ownership: ye(),
        sendAttemptId: de,
        extra: {
          loadedDraftId: B,
          loadedRevision: Q,
          staleDraftId: Ie
        }
      })), { draftID: B, revision: Q };
    }
  }
  async function ht() {
    const fe = j.getState();
    j.setState({
      ...fe,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await H.forceSync();
  }
  function ct() {
    t.addEventListener("submit", function(fe) {
      if (Fe(), !s.value) {
        fe.preventDefault(), Le("Please select a document"), o.focus();
        return;
      }
      if (!ce()) {
        fe.preventDefault();
        return;
      }
      const Ie = c.querySelectorAll(".participant-entry");
      if (Ie.length === 0) {
        fe.preventDefault(), Le("Please add at least one participant"), r.focus();
        return;
      }
      let P = !1;
      if (Ie.forEach((N) => {
        Qn(N)?.value === "signer" && (P = !0);
      }), !P) {
        fe.preventDefault(), Le("At least one signer is required");
        const N = Ie[0] ? Qn(Ie[0]) : null;
        N && N.focus();
        return;
      }
      const T = f.querySelectorAll(".field-definition-entry"), B = ze();
      if (B.length > 0) {
        fe.preventDefault(), Le(je(B)), Je($.FIELDS), G.focus();
        return;
      }
      let Q = !1;
      if (T.forEach((N) => {
        Bs(N)?.value || (Q = !0);
      }), Q) {
        fe.preventDefault(), Le("Please assign all fields to a signer");
        const N = f.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        N && N.focus();
        return;
      }
      if (Ue().some((N) => !N.participantId)) {
        fe.preventDefault(), Le("Please assign all automation rules to a signer"), Array.from(g?.querySelectorAll(".field-rule-participant-select") || []).find((J) => !J.value)?.focus();
        return;
      }
      const ve = !!t.querySelector('input[name="save_as_draft"]'), Ce = ne() === X && !ve;
      if (Ce) {
        let N = t.querySelector('input[name="send_for_signature"]');
        N || (N = document.createElement("input"), N.type = "hidden", N.name = "send_for_signature", t.appendChild(N)), N.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (_ === "json") {
        fe.preventDefault(), n.disabled = !0, it(Ce ? "Sending..." : "Saving...", !0), (async () => {
          try {
            Fe();
            const N = String(e.routes?.index || "").trim();
            if (!Ce) {
              if (await Ve(), N) {
                window.location.href = N;
                return;
              }
              window.location.reload();
              return;
            }
            de = ks(), at("send_submit_start", Ee({
              state: j.getState(),
              storageKey: m,
              ownership: ye(),
              sendAttemptId: de
            }));
            const J = await rt(), K = String(J?.draftID || "").trim(), he = Number(J?.revision || 0);
            if (!K || he <= 0)
              throw new Error("Draft session not available. Please try again.");
            if (!H.ensureActiveTabOwnership("send", { allowClaimIfAvailable: !0 }))
              throw gt("send_submit_blocked", Ee({
                state: j.getState(),
                storageKey: m,
                ownership: ye(),
                sendAttemptId: de,
                extra: {
                  reason: "active_tab_required"
                }
              })), {
                code: st,
                message: "This agreement is active in another tab. Take control in this tab before sending."
              };
            at("send_request_start", Ee({
              state: j.getState(),
              storageKey: m,
              ownership: ye(),
              sendAttemptId: de,
              extra: {
                targetDraftId: K,
                expectedRevision: he
              }
            }));
            const Se = await fetch(
              I(`${L}/${encodeURIComponent(K)}/send`),
              {
                method: "POST",
                credentials: "same-origin",
                headers: C(),
                body: JSON.stringify({
                  expected_revision: he,
                  created_by_user_id: E
                })
              }
            );
            if (!Se.ok) {
              const v = await Be(Se, "Failed to send agreement");
              throw String(v?.code || "").trim().toUpperCase() === "DRAFT_SEND_NOT_FOUND" ? (pe("wizard_send_not_found", {
                draft_id: K,
                status: Number(v?.status || 0)
              }), await ht().catch(() => {
              }), {
                ...v,
                code: "DRAFT_SESSION_STALE"
              }) : v;
            }
            const Ae = await Se.json(), be = String(Ae?.agreement_id || Ae?.id || Ae?.data?.id || "").trim();
            if (at("send_request_success", Ee({
              state: j.getState(),
              storageKey: m,
              ownership: ye(),
              sendAttemptId: de,
              extra: {
                targetDraftId: K,
                expectedRevision: he,
                agreementId: be
              }
            })), j.clear(), H.broadcastStateUpdate(), de = null, be && N) {
              window.location.href = `${N}/${encodeURIComponent(be)}`;
              return;
            }
            if (N) {
              window.location.href = N;
              return;
            }
            window.location.reload();
          } catch (N) {
            const J = yn(N) ? N : {}, K = String(J.message || "Failed to process agreement").trim(), he = String(J.code || "").trim(), Se = Number(J.status || 0);
            gt("send_request_failed", Ee({
              state: j.getState(),
              storageKey: m,
              ownership: ye(),
              sendAttemptId: de,
              extra: {
                code: he || null,
                status: Se,
                message: K
              }
            })), Le(K, he, Se), n.disabled = !1, it("Send for Signature", !1), de = null;
          }
        })();
        return;
      }
      n.disabled = !0, it(Ce ? "Sending..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: ct,
    ensureDraftReadyForSend: rt,
    persistLatestWizardState: Ve,
    resyncAfterSendNotFound: ht
  };
}
const Zn = 150, ei = 32;
function He(i) {
  return i == null ? "" : String(i).trim();
}
function wi(i) {
  if (typeof i == "boolean") return i;
  const e = He(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Ns(i) {
  return He(i).toLowerCase();
}
function tt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(He(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Qt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(He(i));
  return Number.isFinite(t) ? t : e;
}
function tn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function Wt(i, e) {
  const t = tt(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function Vt(i, e, t = 1) {
  const n = tt(t, 1), s = tt(i, n);
  return e > 0 ? tn(s, 1, e) : s > 0 ? s : n;
}
function Us(i, e, t) {
  const n = tt(t, 1);
  let s = Wt(i, n), o = Wt(e, n);
  return s <= 0 && (s = 1), o <= 0 && (o = n), o < s ? { start: o, end: s } : { start: s, end: o };
}
function cn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => He(n)) : He(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = tt(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function nn(i, e) {
  const t = tt(e, 1), n = He(i.participantId ?? i.participant_id), s = cn(i.excludePages ?? i.exclude_pages), o = i.required, c = typeof o == "boolean" ? o : !["0", "false", "off", "no"].includes(He(o).toLowerCase());
  return {
    id: He(i.id),
    type: Ns(i.type),
    participantId: n,
    participantTempId: He(i.participantTempId) || n,
    fromPage: Wt(i.fromPage ?? i.from_page, t),
    toPage: Wt(i.toPage ?? i.to_page, t),
    page: Wt(i.page, t),
    excludeLastPage: wi(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: c
  };
}
function Hs(i, e) {
  const t = He(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function zs(i, e) {
  const t = tt(e, 1), n = [];
  return i.forEach((s, o) => {
    const c = nn(s || {}, t);
    if (c.type === "") return;
    const r = Hs(c, o);
    if (c.type === "initials_each_page") {
      const f = Us(c.fromPage, c.toPage, t), g = /* @__PURE__ */ new Set();
      cn(c.excludePages).forEach((y) => {
        y <= t && g.add(y);
      }), c.excludeLastPage && g.add(t);
      for (let y = f.start; y <= f.end; y += 1)
        g.has(y) || n.push({
          id: `${r}-initials-${y}`,
          type: "initials",
          page: y,
          participantId: He(c.participantId),
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
        participantId: He(c.participantId),
        required: c.required !== !1,
        ruleId: r
        // Track rule ID for link group creation.
      });
    }
  }), n.sort((s, o) => s.page !== o.page ? s.page - o.page : s.id.localeCompare(o.id)), n;
}
function js(i, e, t, n, s) {
  const o = tt(t, 1);
  let c = i > 0 ? i : 1, r = e > 0 ? e : o;
  c = tn(c, 1, o), r = tn(r, 1, o), r < c && ([c, r] = [r, c]);
  const f = /* @__PURE__ */ new Set();
  s.forEach((y) => {
    const w = tt(y, 0);
    w > 0 && f.add(tn(w, 1, o));
  }), n && f.add(o);
  const g = [];
  for (let y = c; y <= r; y += 1)
    f.has(y) || g.push(y);
  return {
    pages: g,
    rangeStart: c,
    rangeEnd: r,
    excludedPages: Array.from(f).sort((y, w) => y - w),
    isEmpty: g.length === 0
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
    id: He(e.id),
    title: He(e.title || e.name) || "Untitled",
    pageCount: tt(e.page_count ?? e.pageCount, 0),
    compatibilityTier: He(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: He(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Si(i) {
  const e = He(i).toLowerCase();
  if (e === "") return bt.MANUAL;
  switch (e) {
    case bt.AUTO:
    case bt.MANUAL:
    case bt.AUTO_LINKED:
    case bt.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function Kt(i, e = 0) {
  const t = i || {}, n = He(t.id) || `fi_init_${e}`, s = He(t.definitionId || t.definition_id || t.field_definition_id) || n, o = tt(t.page ?? t.page_number, 1), c = Qt(t.x ?? t.pos_x, 0), r = Qt(t.y ?? t.pos_y, 0), f = Qt(t.width, Zn), g = Qt(t.height, ei);
  return {
    id: n,
    definitionId: s,
    type: He(t.type) || "text",
    participantId: He(t.participantId || t.participant_id),
    participantName: He(t.participantName || t.participant_name) || "Unassigned",
    page: o > 0 ? o : 1,
    x: c >= 0 ? c : 0,
    y: r >= 0 ? r : 0,
    width: f > 0 ? f : Zn,
    height: g > 0 ? g : ei,
    placementSource: Si(t.placementSource || t.placement_source),
    linkGroupId: He(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: He(t.linkedFromFieldId || t.linked_from_field_id),
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
    link_group_id: He(t.linkGroupId),
    linked_from_field_id: He(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Xe(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function _t(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function $t(i) {
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
    previewCard: g,
    parseAPIError: y,
    announceError: w,
    showToast: R,
    mapUserFacingError: E,
    renderFieldRulePreview: m
  } = i, L = Xe("document_id"), I = Xe("selected-document"), C = Xe("document-picker"), k = Xe("document-search"), H = Xe("document-list"), j = Xe("change-document-btn"), _ = Xe("selected-document-title"), X = Xe("selected-document-info"), $ = Xe("document_page_count"), ne = Xe("document-remediation-panel"), me = Xe("document-remediation-message"), ae = Xe("document-remediation-status"), ce = Xe("document-remediation-trigger-btn"), Ue = Xe("document-remediation-dismiss-btn"), ue = Xe("title"), Re = 300, ze = 5, je = 10, Ze = Xe("document-typeahead"), Fe = Xe("document-typeahead-dropdown"), Le = Xe("document-recent-section"), pe = Xe("document-recent-list"), Be = Xe("document-search-section"), Je = Xe("document-search-list"), Oe = Xe("document-empty-state"), st = Xe("document-dropdown-loading"), oe = Xe("document-search-loading"), G = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let de = [], ye = null, it = 0, Ve = null;
  const rt = /* @__PURE__ */ new Set(), ht = /* @__PURE__ */ new Map();
  function ct(D) {
    return String(D || "").trim().toLowerCase();
  }
  function fe(D) {
    return String(D || "").trim().toLowerCase();
  }
  function Ie(D) {
    return ct(D) === "unsupported";
  }
  function P() {
    !o && ue && ue.value.trim() !== "" && !f.hasResumableState() && f.setTitleSource(c.SERVER_SEED, { syncPending: !1 });
  }
  function T(D) {
    const F = tt(D, 0);
    $ && ($.value = String(F));
  }
  function B() {
    const D = tt($?.value || "0", 0);
    if (D > 0) return D;
    const F = String(X?.textContent || "").match(/(\d+)\s+pages?/i);
    if (F) {
      const O = tt(F[1], 0);
      if (O > 0) return O;
    }
    return 1;
  }
  function Q() {
    L && (L.value = ""), _ && (_.textContent = ""), X && (X.textContent = ""), T(0), f.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), g.setDocument(null, null, null);
  }
  function ie(D = "") {
    const F = "This document cannot be used because its PDF is incompatible with online signing.", O = fe(D);
    return O ? `${F} Reason: ${O}. Select another document or upload a remediated PDF.` : `${F} Select another document or upload a remediated PDF.`;
  }
  function ge() {
    ye = null, ae && (ae.textContent = "", ae.className = "mt-2 text-xs text-amber-800"), ne && ne.classList.add("hidden"), ce && (ce.disabled = !1, ce.textContent = "Remediate PDF");
  }
  function ve(D, F = "info") {
    if (!ae) return;
    const O = String(D || "").trim();
    ae.textContent = O;
    const ee = F === "error" ? "text-red-700" : F === "success" ? "text-green-700" : "text-amber-800";
    ae.className = `mt-2 text-xs ${ee}`;
  }
  function Ce(D, F = "") {
    !D || !ne || !me || (ye = {
      id: String(D.id || "").trim(),
      title: String(D.title || "").trim(),
      pageCount: tt(D.pageCount, 0),
      compatibilityReason: fe(F || D.compatibilityReason || "")
    }, ye.id && (me.textContent = ie(ye.compatibilityReason), ve("Run remediation to make this document signable."), ne.classList.remove("hidden")));
  }
  function N(D) {
    const F = ue;
    if (!F) return;
    const O = f.getState(), ee = F.value.trim(), re = r(
      O?.titleSource,
      ee === "" ? c.AUTOFILL : c.USER
    );
    if (ee && re === c.USER)
      return;
    const Z = String(D || "").trim();
    Z && (F.value = Z, f.updateDetails({
      title: Z,
      message: f.getState().details.message || ""
    }, { titleSource: c.AUTOFILL }));
  }
  function J(D, F, O) {
    if (!L || !_ || !X || !I || !C)
      return;
    L.value = String(D || ""), _.textContent = F || "", X.textContent = `${O} pages`, T(O), I.classList.remove("hidden"), C.classList.add("hidden"), m(), N(F);
    const ee = tt(O, 0);
    f.updateDocument({
      id: D,
      title: F,
      pageCount: ee
    }), g.setDocument(D, F, ee), ge();
  }
  function K(D) {
    const F = String(D || "").trim();
    if (F === "") return null;
    const O = de.find((Z) => String(Z.id || "").trim() === F);
    if (O) return O;
    const ee = G.recentDocuments.find((Z) => String(Z.id || "").trim() === F);
    if (ee) return ee;
    const re = G.searchResults.find((Z) => String(Z.id || "").trim() === F);
    return re || null;
  }
  function he() {
    const D = K(L?.value || "");
    if (!D) return !0;
    const F = ct(D.compatibilityTier);
    return Ie(F) ? (Ce(D, D.compatibilityReason || ""), Q(), w(ie(D.compatibilityReason || "")), I && I.classList.add("hidden"), C && C.classList.remove("hidden"), k?.focus(), !1) : (ge(), !0);
  }
  function Se() {
    if (!_ || !X || !I || !C)
      return;
    const D = (L?.value || "").trim();
    if (!D) return;
    const F = de.find((O) => String(O.id || "").trim() === D);
    F && (_.textContent.trim() || (_.textContent = F.title || "Untitled"), (!X.textContent.trim() || X.textContent.trim() === "pages") && (X.textContent = `${F.pageCount || 0} pages`), T(F.pageCount || 0), I.classList.remove("hidden"), C.classList.add("hidden"));
  }
  async function Ae() {
    try {
      const D = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), F = await fetch(`${e}/panels/esign_documents?${D.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!F.ok)
        throw await y(F, "Failed to load documents");
      const O = await F.json();
      de = (Array.isArray(O?.records) ? O.records : Array.isArray(O?.items) ? O.items : []).slice().sort((Z, We) => {
        const Ke = Date.parse(String(Z?.created_at ?? Z?.createdAt ?? Z?.updated_at ?? Z?.updatedAt ?? "")), lt = Date.parse(String(We?.created_at ?? We?.createdAt ?? We?.updated_at ?? We?.updatedAt ?? "")), Me = Number.isFinite(Ke) ? Ke : 0;
        return (Number.isFinite(lt) ? lt : 0) - Me;
      }).map((Z) => bn(Z)).filter((Z) => Z.id !== ""), be(de), Se();
    } catch (D) {
      const F = $t(D) ? String(D.message || "Failed to load documents") : "Failed to load documents", O = $t(D) ? String(D.code || "") : "", ee = $t(D) ? Number(D.status || 0) : 0, re = E(F, O, ee);
      H && (H.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${_t(re)}</div>`);
    }
  }
  function be(D) {
    if (!H) return;
    if (D.length === 0) {
      H.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${_t(s)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    H.innerHTML = D.map((O, ee) => {
      const re = _t(String(O.id || "").trim()), Z = _t(String(O.title || "").trim()), We = String(tt(O.pageCount, 0)), Ke = ct(O.compatibilityTier), lt = fe(O.compatibilityReason), Me = _t(Ke), et = _t(lt), wt = Ie(Ke) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${ee === 0 ? "0" : "-1"}"
                data-document-id="${re}"
                data-document-title="${Z}"
                data-document-pages="${We}"
                data-document-compatibility-tier="${Me}"
                data-document-compatibility-reason="${et}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${Z}</div>
            <div class="text-xs text-gray-500">${We} pages ${wt}</div>
          </div>
        </button>
      `;
    }).join("");
    const F = Array.from(H.querySelectorAll(".document-option"));
    F.forEach((O, ee) => {
      O.addEventListener("click", () => v(O)), O.addEventListener("keydown", (re) => {
        let Z = ee;
        if (re.key === "ArrowDown")
          re.preventDefault(), Z = Math.min(ee + 1, F.length - 1);
        else if (re.key === "ArrowUp")
          re.preventDefault(), Z = Math.max(ee - 1, 0);
        else if (re.key === "Enter" || re.key === " ") {
          re.preventDefault(), v(O);
          return;
        } else re.key === "Home" ? (re.preventDefault(), Z = 0) : re.key === "End" && (re.preventDefault(), Z = F.length - 1);
        Z !== ee && (F[Z].focus(), F[Z].setAttribute("tabindex", "0"), O.setAttribute("tabindex", "-1"));
      });
    });
  }
  function v(D) {
    const F = D.getAttribute("data-document-id"), O = D.getAttribute("data-document-title"), ee = D.getAttribute("data-document-pages"), re = ct(D.getAttribute("data-document-compatibility-tier")), Z = fe(D.getAttribute("data-document-compatibility-reason"));
    if (Ie(re)) {
      Ce({ id: String(F || ""), title: String(O || ""), pageCount: tt(ee, 0), compatibilityReason: Z }), Q(), w(ie(Z)), k?.focus();
      return;
    }
    J(F, O, ee);
  }
  async function b(D, F, O) {
    const ee = String(D || "").trim();
    if (!ee) return;
    const re = Date.now(), Z = 12e4, We = 1250;
    for (; Date.now() - re < Z; ) {
      const Ke = await fetch(ee, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!Ke.ok)
        throw await y(Ke, "Failed to read remediation status");
      const Me = (await Ke.json())?.dispatch || {}, et = String(Me?.status || "").trim().toLowerCase();
      if (et === "succeeded") {
        ve("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (et === "failed" || et === "canceled" || et === "dead_letter") {
        const wt = String(Me?.terminal_reason || "").trim();
        throw { message: wt ? `Remediation failed: ${wt}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      ve(et === "retrying" ? "Remediation is retrying in the queue..." : et === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((wt) => setTimeout(wt, We));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${F} (${O})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function S() {
    const D = ye;
    if (!D || !D.id) return;
    const F = String(D.id || "").trim();
    if (!(!F || rt.has(F))) {
      rt.add(F), ce && (ce.disabled = !0, ce.textContent = "Remediating...");
      try {
        let O = ht.get(F) || "";
        O || (O = `esign-remediate-${F}-${Date.now()}`, ht.set(F, O));
        const ee = `${t}/esign/documents/${encodeURIComponent(F)}/remediate`, re = await fetch(ee, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": O
          }
        });
        if (!re.ok)
          throw await y(re, "Failed to trigger remediation");
        const Z = await re.json(), We = Z?.receipt || {}, Ke = String(We?.dispatch_id || Z?.dispatch_id || "").trim(), lt = String(We?.mode || Z?.mode || "").trim().toLowerCase();
        let Me = String(Z?.dispatch_status_url || "").trim();
        !Me && Ke && (Me = `${t}/esign/dispatches/${encodeURIComponent(Ke)}`), lt === "queued" && Ke && Me && (ve("Remediation queued. Monitoring progress..."), await b(Me, Ke, F)), await Ae();
        const et = K(F);
        if (!et || Ie(et.compatibilityTier)) {
          ve("Remediation finished, but this PDF is still incompatible.", "error"), w("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        J(et.id, et.title, et.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : R("Document remediated successfully. You can continue.", "success");
      } catch (O) {
        const ee = $t(O) ? String(O.message || "Remediation failed").trim() : "Remediation failed", re = $t(O) ? String(O.code || "") : "", Z = $t(O) ? Number(O.status || 0) : 0;
        ve(ee, "error"), w(ee, re, Z);
      } finally {
        rt.delete(F), ce && (ce.disabled = !1, ce.textContent = "Remediate PDF");
      }
    }
  }
  function U(D, F) {
    let O = null;
    return (...ee) => {
      O !== null && clearTimeout(O), O = setTimeout(() => {
        D(...ee), O = null;
      }, F);
    };
  }
  async function z() {
    try {
      const D = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(ze)
      });
      n && D.set("created_by_user_id", n);
      const F = await fetch(`${e}/panels/esign_documents?${D}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!F.ok) {
        console.warn("Failed to load recent documents:", F.status);
        return;
      }
      const O = await F.json(), ee = Array.isArray(O?.records) ? O.records : Array.isArray(O?.items) ? O.items : [];
      G.recentDocuments = ee.map((re) => bn(re)).filter((re) => re.id !== "").slice(0, ze);
    } catch (D) {
      console.warn("Error loading recent documents:", D);
    }
  }
  async function V(D) {
    const F = D.trim();
    if (!F) {
      Ve && (Ve.abort(), Ve = null), G.isSearchMode = !1, G.searchResults = [], _e();
      return;
    }
    const O = ++it;
    Ve && Ve.abort(), Ve = new AbortController(), G.isLoading = !0, G.isSearchMode = !0, _e();
    try {
      const ee = new URLSearchParams({
        q: F,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(je)
      }), re = await fetch(`${e}/panels/esign_documents?${ee}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Ve.signal
      });
      if (O !== it) return;
      if (!re.ok) {
        console.warn("Failed to search documents:", re.status), G.searchResults = [], G.isLoading = !1, _e();
        return;
      }
      const Z = await re.json(), We = Array.isArray(Z?.records) ? Z.records : Array.isArray(Z?.items) ? Z.items : [];
      G.searchResults = We.map((Ke) => bn(Ke)).filter((Ke) => Ke.id !== "").slice(0, je);
    } catch (ee) {
      if ($t(ee) && ee.name === "AbortError")
        return;
      console.warn("Error searching documents:", ee), G.searchResults = [];
    } finally {
      O === it && (G.isLoading = !1, _e());
    }
  }
  const se = U(V, Re);
  function le() {
    Fe && (G.isOpen = !0, G.selectedIndex = -1, Fe.classList.remove("hidden"), k?.setAttribute("aria-expanded", "true"), H?.classList.add("hidden"), _e());
  }
  function Te() {
    Fe && (G.isOpen = !1, G.selectedIndex = -1, Fe.classList.add("hidden"), k?.setAttribute("aria-expanded", "false"), H?.classList.remove("hidden"));
  }
  function Ne(D, F, O) {
    D && (D.innerHTML = F.map((ee, re) => {
      const Z = re, We = G.selectedIndex === Z, Ke = _t(String(ee.id || "").trim()), lt = _t(String(ee.title || "").trim()), Me = String(tt(ee.pageCount, 0)), et = ct(ee.compatibilityTier), yt = fe(ee.compatibilityReason), wt = _t(et), Y = _t(yt), pt = Ie(et) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${We ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${We}"
          tabindex="-1"
          data-document-id="${Ke}"
          data-document-title="${lt}"
          data-document-pages="${Me}"
          data-document-compatibility-tier="${wt}"
          data-document-compatibility-reason="${Y}"
          data-typeahead-index="${Z}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${lt}</div>
            <div class="text-xs text-gray-500">${Me} pages ${pt}</div>
          </div>
        </button>
      `;
    }).join(""), D.querySelectorAll(".typeahead-option").forEach((ee) => {
      ee.addEventListener("click", () => qe(ee));
    }));
  }
  function _e() {
    if (Fe) {
      if (G.isLoading) {
        st?.classList.remove("hidden"), Le?.classList.add("hidden"), Be?.classList.add("hidden"), Oe?.classList.add("hidden"), oe?.classList.remove("hidden");
        return;
      }
      st?.classList.add("hidden"), oe?.classList.add("hidden"), G.isSearchMode ? (Le?.classList.add("hidden"), G.searchResults.length > 0 ? (Be?.classList.remove("hidden"), Oe?.classList.add("hidden"), Ne(Je, G.searchResults)) : (Be?.classList.add("hidden"), Oe?.classList.remove("hidden"))) : (Be?.classList.add("hidden"), G.recentDocuments.length > 0 ? (Le?.classList.remove("hidden"), Oe?.classList.add("hidden"), Ne(pe, G.recentDocuments)) : (Le?.classList.add("hidden"), Oe?.classList.remove("hidden"), Oe && (Oe.textContent = "No recent documents")));
    }
  }
  function qe(D) {
    const F = D.getAttribute("data-document-id"), O = D.getAttribute("data-document-title"), ee = D.getAttribute("data-document-pages"), re = ct(D.getAttribute("data-document-compatibility-tier")), Z = fe(D.getAttribute("data-document-compatibility-reason"));
    if (F) {
      if (Ie(re)) {
        Ce({ id: String(F || ""), title: String(O || ""), pageCount: tt(ee, 0), compatibilityReason: Z }), Q(), w(ie(Z)), k?.focus();
        return;
      }
      J(F, O, ee), Te(), k && (k.value = ""), G.query = "", G.isSearchMode = !1, G.searchResults = [];
    }
  }
  function nt() {
    if (!Fe) return;
    const D = Fe.querySelector(`[data-typeahead-index="${G.selectedIndex}"]`);
    D && D.scrollIntoView({ block: "nearest" });
  }
  function Ge(D) {
    if (!G.isOpen) {
      (D.key === "ArrowDown" || D.key === "Enter") && (D.preventDefault(), le());
      return;
    }
    const F = G.isSearchMode ? G.searchResults : G.recentDocuments, O = F.length - 1;
    switch (D.key) {
      case "ArrowDown":
        D.preventDefault(), G.selectedIndex = Math.min(G.selectedIndex + 1, O), _e(), nt();
        break;
      case "ArrowUp":
        D.preventDefault(), G.selectedIndex = Math.max(G.selectedIndex - 1, 0), _e(), nt();
        break;
      case "Enter":
        if (D.preventDefault(), G.selectedIndex >= 0 && G.selectedIndex <= O) {
          const ee = F[G.selectedIndex];
          if (ee) {
            const re = document.createElement("button");
            re.setAttribute("data-document-id", ee.id), re.setAttribute("data-document-title", ee.title), re.setAttribute("data-document-pages", String(ee.pageCount)), re.setAttribute("data-document-compatibility-tier", String(ee.compatibilityTier || "")), re.setAttribute("data-document-compatibility-reason", String(ee.compatibilityReason || "")), qe(re);
          }
        }
        break;
      case "Escape":
        D.preventDefault(), Te();
        break;
      case "Tab":
        Te();
        break;
      case "Home":
        D.preventDefault(), G.selectedIndex = 0, _e(), nt();
        break;
      case "End":
        D.preventDefault(), G.selectedIndex = O, _e(), nt();
        break;
    }
  }
  function vt() {
    j && j.addEventListener("click", () => {
      I?.classList.add("hidden"), C?.classList.remove("hidden"), ge(), k?.focus(), le();
    }), ce && ce.addEventListener("click", () => {
      S();
    }), Ue && Ue.addEventListener("click", () => {
      ge(), k?.focus();
    }), k && (k.addEventListener("input", (D) => {
      const F = D.target;
      if (!(F instanceof HTMLInputElement)) return;
      const O = F.value;
      G.query = O, G.isOpen || le(), O.trim() ? (G.isLoading = !0, _e(), se(O)) : (G.isSearchMode = !1, G.searchResults = [], _e());
      const ee = de.filter(
        (re) => String(re.title || "").toLowerCase().includes(O.toLowerCase())
      );
      be(ee);
    }), k.addEventListener("focus", () => {
      le();
    }), k.addEventListener("keydown", Ge)), document.addEventListener("click", (D) => {
      const F = D.target;
      Ze && !(F instanceof Node && Ze.contains(F)) && Te();
    });
  }
  return {
    refs: {
      documentIdInput: L,
      selectedDocument: I,
      documentPicker: C,
      documentSearch: k,
      documentList: H,
      selectedDocumentTitle: _,
      selectedDocumentInfo: X,
      documentPageCountInput: $
    },
    bindEvents: vt,
    initializeTitleSourceSeed: P,
    loadDocuments: Ae,
    loadRecentDocuments: z,
    ensureSelectedDocumentCompatibility: he,
    getCurrentDocumentPageCount: B
  };
}
function Et(i, e) {
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
  function g(L = {}) {
    if (!(s instanceof HTMLTemplateElement) || !n)
      return;
    const I = s.content.cloneNode(!0), C = I.querySelector(".participant-entry");
    if (!(C instanceof HTMLElement)) return;
    const k = L.id || f();
    C.setAttribute("data-participant-id", k);
    const H = Et(C, ".participant-id-input"), j = Et(C, 'input[name="participants[].name"]'), _ = Et(C, 'input[name="participants[].email"]'), X = wn(C, 'select[name="participants[].role"]'), $ = Et(C, 'input[name="participants[].signing_stage"]'), ne = Et(C, 'input[name="participants[].notify"]'), me = C.querySelector(".signing-stage-wrapper");
    if (!H || !j || !_ || !X) return;
    const ae = r++;
    H.name = `participants[${ae}].id`, H.value = k, j.name = `participants[${ae}].name`, _.name = `participants[${ae}].email`, X.name = `participants[${ae}].role`, $ && ($.name = `participants[${ae}].signing_stage`), ne && (ne.name = `participants[${ae}].notify`), L.name && (j.value = L.name), L.email && (_.value = L.email), L.role && (X.value = L.role), $ && L.signing_stage && ($.value = String(L.signing_stage)), ne && (ne.checked = L.notify !== !1);
    const ce = () => {
      if (!(me instanceof HTMLElement) || !$) return;
      const Ue = X.value === "signer";
      me.classList.toggle("hidden", !Ue), Ue ? $.value || ($.value = "1") : $.value = "";
    };
    ce(), C.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      C.remove(), t?.();
    }), X.addEventListener("change", () => {
      ce(), t?.();
    }), n.appendChild(I);
  }
  function y() {
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
  function w() {
    if (!n) return;
    o?.addEventListener("click", () => g()), new MutationObserver(() => {
      t?.();
    }).observe(n, { childList: !0, subtree: !0 }), n.addEventListener("change", (I) => {
      const C = I.target;
      C instanceof Element && (C.matches('select[name*=".role"]') || C.matches('input[name*=".name"]') || C.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (I) => {
      const C = I.target;
      C instanceof Element && (C.matches('input[name*=".name"]') || C.matches('input[name*=".email"]')) && t?.();
    });
  }
  function R() {
    if (!n) return [];
    const L = n.querySelectorAll(".participant-entry"), I = [];
    return L.forEach((C) => {
      const k = C.getAttribute("data-participant-id"), H = wn(C, 'select[name*=".role"]'), j = Et(C, 'input[name*=".name"]'), _ = Et(C, 'input[name*=".email"]');
      H?.value === "signer" && I.push({
        id: String(k || ""),
        name: j?.value || _?.value || "Signer",
        email: _?.value || ""
      });
    }), I;
  }
  function E() {
    if (!n) return [];
    const L = [];
    return n.querySelectorAll(".participant-entry").forEach((I) => {
      const C = I.getAttribute("data-participant-id"), k = Et(I, 'input[name*=".name"]')?.value || "", H = Et(I, 'input[name*=".email"]')?.value || "", j = wn(I, 'select[name*=".role"]')?.value || "signer", _ = Number.parseInt(Et(I, ".signing-stage-input")?.value || "1", 10), X = Et(I, ".notify-input")?.checked !== !1;
      L.push({
        tempId: String(C || ""),
        name: k,
        email: H,
        role: j,
        notify: X,
        signingStage: Number.isFinite(_) ? _ : 1
      });
    }), L;
  }
  function m(L) {
    !n || !L?.participants || L.participants.length === 0 || (n.innerHTML = "", r = 0, L.participants.forEach((I) => {
      g({
        id: I.tempId,
        name: I.name,
        email: I.email,
        role: I.role,
        notify: I.notify !== !1,
        signing_stage: I.signingStage
      });
    }));
  }
  return {
    refs: {
      participantsContainer: n,
      addParticipantBtn: o
    },
    initialize: y,
    bindEvents: w,
    addParticipant: g,
    getSignerParticipants: R,
    collectParticipantsForState: E,
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
      placementSource: bt.AUTO_LINKED,
      linkGroupId: f.id,
      linkedFromFieldId: f.sourceFieldId
    } };
  }
  return null;
}
function Lt(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Qe(i, e) {
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
function Ft(i, e) {
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
    getPlacementLinkGroupState: g,
    setPlacementLinkGroupState: y
  } = i, w = Lt("field-definitions-container"), R = document.getElementById("field-definition-template"), E = Lt("add-field-btn"), m = Lt("add-field-btn-container"), L = Lt("add-field-definition-empty-btn"), I = Lt("field-definitions-empty-state"), C = Lt("field-rules-container"), k = document.getElementById("field-rule-template"), H = Lt("add-field-rule-btn"), j = Lt("field-rules-empty-state"), _ = Lt("field-rules-preview"), X = Lt("field_rules_json"), $ = Lt("field_placements_json");
  let ne = 0, me = 0, ae = 0;
  function ce() {
    return `temp_field_${Date.now()}_${ne++}`;
  }
  function Ue() {
    return `rule_${Date.now()}_${ae}`;
  }
  function ue(P, T) {
    const B = String(P || "").trim();
    return B && T.some((Q) => Q.id === B) ? B : T.length === 1 ? T[0].id : "";
  }
  function Re(P, T, B = "") {
    if (!P) return;
    const Q = ue(B, T);
    P.innerHTML = '<option value="">Select signer...</option>', T.forEach((ie) => {
      const ge = document.createElement("option");
      ge.value = ie.id, ge.textContent = ie.name, P.appendChild(ge);
    }), P.value = Q;
  }
  function ze(P = s()) {
    if (!w) return;
    const T = w.querySelectorAll(".field-participant-select"), B = C ? C.querySelectorAll(".field-rule-participant-select") : [];
    T.forEach((Q) => {
      Re(
        Q instanceof HTMLSelectElement ? Q : null,
        P,
        Q instanceof HTMLSelectElement ? Q.value : ""
      );
    }), B.forEach((Q) => {
      Re(
        Q instanceof HTMLSelectElement ? Q : null,
        P,
        Q instanceof HTMLSelectElement ? Q.value : ""
      );
    });
  }
  function je() {
    if (!w || !I) return;
    w.querySelectorAll(".field-definition-entry").length === 0 ? (I.classList.remove("hidden"), m?.classList.add("hidden")) : (I.classList.add("hidden"), m?.classList.remove("hidden"));
  }
  function Ze() {
    if (!C || !j) return;
    const P = C.querySelectorAll(".field-rule-entry");
    j.classList.toggle("hidden", P.length > 0);
  }
  function Fe() {
    if (!w) return [];
    const P = [];
    return w.querySelectorAll(".field-definition-entry").forEach((T) => {
      const B = T.getAttribute("data-field-definition-id"), Q = ft(T, ".field-type-select")?.value || "signature", ie = ft(T, ".field-participant-select")?.value || "", ge = Number.parseInt(Qe(T, 'input[name*=".page"]')?.value || "1", 10), ve = Qe(T, 'input[name*=".required"]')?.checked ?? !0;
      P.push({
        tempId: String(B || ""),
        type: Q,
        participantTempId: ie,
        page: Number.isFinite(ge) ? ge : 1,
        required: ve
      });
    }), P;
  }
  function Le() {
    if (!C) return [];
    const P = n(), T = C.querySelectorAll(".field-rule-entry"), B = [];
    return T.forEach((Q) => {
      const ie = nn({
        id: Q.getAttribute("data-field-rule-id") || "",
        type: ft(Q, ".field-rule-type-select")?.value || "",
        participantId: ft(Q, ".field-rule-participant-select")?.value || "",
        fromPage: Qe(Q, ".field-rule-from-page-input")?.value || "",
        toPage: Qe(Q, ".field-rule-to-page-input")?.value || "",
        page: Qe(Q, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Qe(Q, ".field-rule-exclude-last-input")?.checked,
        excludePages: cn(Qe(Q, ".field-rule-exclude-pages-input")?.value || ""),
        required: (ft(Q, ".field-rule-required-select")?.value || "1") !== "0"
      }, P);
      ie.type && B.push(ie);
    }), B;
  }
  function pe() {
    return Le().map((P) => ({
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
  function Be(P, T) {
    return zs(P, T);
  }
  function Je() {
    if (!_) return;
    const P = Le(), T = n(), B = Be(P, T), Q = s(), ie = new Map(Q.map((N) => [String(N.id), N.name]));
    if (X && (X.value = JSON.stringify(pe())), !B.length) {
      _.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const ge = B.reduce((N, J) => {
      const K = J.type;
      return N[K] = (N[K] || 0) + 1, N;
    }, {}), ve = B.slice(0, 8).map((N) => {
      const J = ie.get(String(N.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${N.type === "initials" ? "Initials" : "Signature"} on page ${N.page}</span><span class="text-gray-500">${o(String(J))}</span></li>`;
    }).join(""), Ce = B.length - 8;
    _.innerHTML = `
      <p class="text-gray-700">${B.length} generated field${B.length !== 1 ? "s" : ""} (${ge.initials || 0} initials, ${ge.signature || 0} signatures)</p>
      <ul class="space-y-1">${ve}</ul>
      ${Ce > 0 ? `<p class="text-gray-500">+${Ce} more</p>` : ""}
    `;
  }
  function Oe() {
    const P = s();
    ze(P), Je();
  }
  function st(P) {
    const T = ft(P, ".field-rule-type-select"), B = Ft(P, ".field-rule-range-start-wrap"), Q = Ft(P, ".field-rule-range-end-wrap"), ie = Ft(P, ".field-rule-page-wrap"), ge = Ft(P, ".field-rule-exclude-last-wrap"), ve = Ft(P, ".field-rule-exclude-pages-wrap"), Ce = Ft(P, ".field-rule-summary"), N = Qe(P, ".field-rule-from-page-input"), J = Qe(P, ".field-rule-to-page-input"), K = Qe(P, ".field-rule-page-input"), he = Qe(P, ".field-rule-exclude-last-input"), Se = Qe(P, ".field-rule-exclude-pages-input");
    if (!T || !B || !Q || !ie || !ge || !ve || !Ce)
      return;
    const Ae = n(), be = nn({
      type: T?.value || "",
      fromPage: N?.value || "",
      toPage: J?.value || "",
      page: K?.value || "",
      excludeLastPage: !!he?.checked,
      excludePages: cn(Se?.value || ""),
      required: !0
    }, Ae), v = be.fromPage > 0 ? be.fromPage : 1, b = be.toPage > 0 ? be.toPage : Ae, S = be.page > 0 ? be.page : be.toPage > 0 ? be.toPage : Ae, U = be.excludeLastPage, z = be.excludePages.join(","), V = T?.value === "initials_each_page";
    if (B.classList.toggle("hidden", !V), Q.classList.toggle("hidden", !V), ge.classList.toggle("hidden", !V), ve.classList.toggle("hidden", !V), ie.classList.toggle("hidden", V), N && (N.value = String(v)), J && (J.value = String(b)), K && (K.value = String(S)), Se && (Se.value = z), he && (he.checked = U), V) {
      const se = js(
        v,
        b,
        Ae,
        U,
        be.excludePages
      ), le = qs(se);
      Ce.textContent = se.isEmpty ? `Warning: No initials fields will be generated ${le}.` : `Generates initials fields on ${le}.`;
    } else
      Ce.textContent = `Generates one signature field on page ${S}.`;
  }
  function oe(P = {}) {
    if (!(k instanceof HTMLTemplateElement) || !C) return;
    const T = k.content.cloneNode(!0), B = T.querySelector(".field-rule-entry");
    if (!(B instanceof HTMLElement)) return;
    const Q = P.id || Ue(), ie = ae++, ge = n();
    B.setAttribute("data-field-rule-id", Q);
    const ve = Qe(B, ".field-rule-id-input"), Ce = ft(B, ".field-rule-type-select"), N = ft(B, ".field-rule-participant-select"), J = Qe(B, ".field-rule-from-page-input"), K = Qe(B, ".field-rule-to-page-input"), he = Qe(B, ".field-rule-page-input"), Se = ft(B, ".field-rule-required-select"), Ae = Qe(B, ".field-rule-exclude-last-input"), be = Qe(B, ".field-rule-exclude-pages-input"), v = ii(B, ".remove-field-rule-btn");
    if (!ve || !Ce || !N || !J || !K || !he || !Se || !Ae || !be || !v)
      return;
    ve.name = `field_rules[${ie}].id`, ve.value = Q, Ce.name = `field_rules[${ie}].type`, N.name = `field_rules[${ie}].participant_id`, J.name = `field_rules[${ie}].from_page`, K.name = `field_rules[${ie}].to_page`, he.name = `field_rules[${ie}].page`, Se.name = `field_rules[${ie}].required`, Ae.name = `field_rules[${ie}].exclude_last_page`, be.name = `field_rules[${ie}].exclude_pages`;
    const b = nn(P, ge);
    Ce.value = b.type || "initials_each_page", Re(N, s(), b.participantId), J.value = String(b.fromPage > 0 ? b.fromPage : 1), K.value = String(b.toPage > 0 ? b.toPage : ge), he.value = String(b.page > 0 ? b.page : ge), Se.value = b.required ? "1" : "0", Ae.checked = b.excludeLastPage, be.value = b.excludePages.join(",");
    const S = () => {
      st(B), Je(), r?.();
    }, U = () => {
      const V = n();
      if (J) {
        const se = parseInt(J.value, 10);
        Number.isFinite(se) && (J.value = String(Vt(se, V, 1)));
      }
      if (K) {
        const se = parseInt(K.value, 10);
        Number.isFinite(se) && (K.value = String(Vt(se, V, 1)));
      }
      if (he) {
        const se = parseInt(he.value, 10);
        Number.isFinite(se) && (he.value = String(Vt(se, V, 1)));
      }
    }, z = () => {
      U(), S();
    };
    Ce.addEventListener("change", S), N.addEventListener("change", S), J.addEventListener("input", z), J.addEventListener("change", z), K.addEventListener("input", z), K.addEventListener("change", z), he.addEventListener("input", z), he.addEventListener("change", z), Se.addEventListener("change", S), Ae.addEventListener("change", () => {
      const V = n();
      K.value = String(Ae.checked ? Math.max(1, V - 1) : V), S();
    }), be.addEventListener("input", S), v.addEventListener("click", () => {
      B.remove(), Ze(), Je(), r?.();
    }), C.appendChild(T), st(C.lastElementChild || B), Ze(), Je();
  }
  function G(P = {}) {
    if (!(R instanceof HTMLTemplateElement) || !w) return;
    const T = R.content.cloneNode(!0), B = T.querySelector(".field-definition-entry");
    if (!(B instanceof HTMLElement)) return;
    const Q = String(P.id || ce()).trim() || ce();
    B.setAttribute("data-field-definition-id", Q);
    const ie = Qe(B, ".field-definition-id-input"), ge = ft(B, 'select[name="field_definitions[].type"]'), ve = ft(B, 'select[name="field_definitions[].participant_id"]'), Ce = Qe(B, 'input[name="field_definitions[].page"]'), N = Qe(B, 'input[name="field_definitions[].required"]'), J = Ft(B, ".field-date-signed-info");
    if (!ie || !ge || !ve || !Ce || !N || !J) return;
    const K = me++;
    ie.name = `field_instances[${K}].id`, ie.value = Q, ge.name = `field_instances[${K}].type`, ve.name = `field_instances[${K}].participant_id`, Ce.name = `field_instances[${K}].page`, N.name = `field_instances[${K}].required`, P.type && (ge.value = String(P.type)), P.page !== void 0 && (Ce.value = String(Vt(P.page, n(), 1))), P.required !== void 0 && (N.checked = !!P.required);
    const he = String(P.participant_id || P.participantId || "").trim();
    Re(ve, s(), he), ge.addEventListener("change", () => {
      ge.value === "date_signed" ? J.classList.remove("hidden") : J.classList.add("hidden");
    }), ge.value === "date_signed" && J.classList.remove("hidden"), ii(B, ".remove-field-definition-btn")?.addEventListener("click", () => {
      B.remove(), je(), c?.();
    });
    const Se = Qe(B, 'input[name*=".page"]'), Ae = () => {
      Se && (Se.value = String(Vt(Se.value, n(), 1)));
    };
    Ae(), Se?.addEventListener("input", Ae), Se?.addEventListener("change", Ae), w.appendChild(T), je();
  }
  function de() {
    E?.addEventListener("click", () => G()), L?.addEventListener("click", () => G()), H?.addEventListener("click", () => oe({ to_page: n() })), f?.();
  }
  function ye() {
    const P = [];
    window._initialFieldPlacementsData = P, e.forEach((T) => {
      const B = String(T.id || "").trim();
      if (!B) return;
      const Q = String(T.type || "signature").trim() || "signature", ie = String(T.participant_id || T.participantId || "").trim(), ge = Number(T.page || 1) || 1, ve = !!T.required;
      G({
        id: B,
        type: Q,
        participant_id: ie,
        page: ge,
        required: ve
      }), P.push(Kt({
        id: B,
        definitionId: B,
        type: Q,
        participantId: ie,
        participantName: String(T.participant_name || T.participantName || "").trim(),
        page: ge,
        x: Number(T.x || T.pos_x || 0) || 0,
        y: Number(T.y || T.pos_y || 0) || 0,
        width: Number(T.width || 150) || 150,
        height: Number(T.height || 32) || 32,
        placementSource: String(T.placement_source || T.placementSource || t.MANUAL).trim() || t.MANUAL
      }, P.length));
    }), je(), Oe(), Ze(), Je();
  }
  function it() {
    const P = window._initialFieldPlacementsData;
    return Array.isArray(P) ? P.map((T, B) => Kt(T, B)) : [];
  }
  function Ve() {
    if (!w) return [];
    const P = s(), T = new Map(P.map((J) => [String(J.id), J.name || J.email || "Signer"])), B = [];
    w.querySelectorAll(".field-definition-entry").forEach((J) => {
      const K = String(J.getAttribute("data-field-definition-id") || "").trim(), he = ft(J, ".field-type-select"), Se = ft(J, ".field-participant-select"), Ae = Qe(J, 'input[name*=".page"]'), be = String(he?.value || "text").trim() || "text", v = String(Se?.value || "").trim(), b = parseInt(String(Ae?.value || "1"), 10) || 1;
      B.push({
        definitionId: K,
        fieldType: be,
        participantId: v,
        participantName: T.get(v) || "Unassigned",
        page: b
      });
    });
    const ie = Be(Le(), n()), ge = /* @__PURE__ */ new Map();
    ie.forEach((J) => {
      const K = String(J.ruleId || "").trim(), he = String(J.id || "").trim();
      if (K && he) {
        const Se = ge.get(K) || [];
        Se.push(he), ge.set(K, Se);
      }
    });
    let ve = g();
    ge.forEach((J, K) => {
      if (J.length > 1 && !ve.groups.get(`rule_${K}`)) {
        const Se = Js(J, `Rule ${K}`);
        Se.id = `rule_${K}`, ve = xi(ve, Se);
      }
    }), y(ve), ie.forEach((J) => {
      const K = String(J.id || "").trim();
      if (!K) return;
      const he = String(J.participantId || "").trim(), Se = parseInt(String(J.page || "1"), 10) || 1, Ae = String(J.ruleId || "").trim();
      B.push({
        definitionId: K,
        fieldType: String(J.type || "text").trim() || "text",
        participantId: he,
        participantName: T.get(he) || "Unassigned",
        page: Se,
        linkGroupId: Ae ? `rule_${Ae}` : void 0
      });
    });
    const Ce = /* @__PURE__ */ new Set(), N = B.filter((J) => {
      const K = String(J.definitionId || "").trim();
      return !K || Ce.has(K) ? !1 : (Ce.add(K), !0);
    });
    return N.sort((J, K) => J.page !== K.page ? J.page - K.page : J.definitionId.localeCompare(K.definitionId)), N;
  }
  function rt(P) {
    const T = String(P || "").trim();
    if (!T) return null;
    const Q = Ve().find((ie) => String(ie.definitionId || "").trim() === T);
    return Q ? {
      id: T,
      type: String(Q.fieldType || "text").trim() || "text",
      participant_id: String(Q.participantId || "").trim(),
      participant_name: String(Q.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(Q.page || "1"), 10) || 1,
      link_group_id: String(Q.linkGroupId || "").trim()
    } : null;
  }
  function ht() {
    if (!w) return [];
    const P = s(), T = /* @__PURE__ */ new Map();
    return P.forEach((ie) => T.set(ie.id, !1)), w.querySelectorAll(".field-definition-entry").forEach((ie) => {
      const ge = ft(ie, ".field-type-select"), ve = ft(ie, ".field-participant-select"), Ce = Qe(ie, 'input[name*=".required"]');
      ge?.value === "signature" && ve?.value && Ce?.checked && T.set(ve.value, !0);
    }), Be(Le(), n()).forEach((ie) => {
      ie.type === "signature" && ie.participantId && ie.required && T.set(ie.participantId, !0);
    }), P.filter((ie) => !T.get(ie.id));
  }
  function ct(P) {
    if (!Array.isArray(P) || P.length === 0)
      return "Each signer requires at least one required signature field.";
    const T = P.map((B) => B?.name?.trim()).filter(Boolean);
    return T.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${T.join(", ")}`;
  }
  function fe(P) {
    !w || !P?.fieldDefinitions || P.fieldDefinitions.length === 0 || (w.innerHTML = "", me = 0, P.fieldDefinitions.forEach((T) => {
      G({
        id: T.tempId,
        type: T.type,
        participant_id: T.participantTempId,
        page: T.page,
        required: T.required
      });
    }), je());
  }
  function Ie(P) {
    !Array.isArray(P?.fieldRules) || P.fieldRules.length === 0 || C && (C.querySelectorAll(".field-rule-entry").forEach((T) => T.remove()), ae = 0, P.fieldRules.forEach((T) => {
      oe({
        id: T.id,
        type: T.type,
        participantId: T.participantId || T.participantTempId,
        fromPage: T.fromPage,
        toPage: T.toPage,
        page: T.page,
        excludeLastPage: T.excludeLastPage,
        excludePages: T.excludePages,
        required: T.required
      });
    }), Ze(), Je());
  }
  return {
    refs: {
      fieldDefinitionsContainer: w,
      fieldRulesContainer: C,
      addFieldBtn: E,
      fieldPlacementsJSONInput: $,
      fieldRulesJSONInput: X
    },
    bindEvents: de,
    initialize: ye,
    buildInitialPlacementInstances: it,
    collectFieldDefinitionsForState: Fe,
    collectFieldRulesForState: Le,
    collectFieldRulesForForm: pe,
    expandRulesForPreview: Be,
    renderFieldRulePreview: Je,
    updateFieldParticipantOptions: Oe,
    collectPlacementFieldDefinitions: Ve,
    getFieldDefinitionById: rt,
    findSignersMissingRequiredSignatureField: ht,
    missingSignatureFieldMessage: ct,
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
    parseAPIError: g,
    mapUserFacingError: y,
    showToast: w,
    escapeHtml: R,
    onPlacementsChanged: E
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
  }, L = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function I(v = "fi") {
    return `${v}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function C(v) {
    return document.querySelector(`.placement-field-item[data-definition-id="${v}"]`);
  }
  function k() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function H(v, b) {
    return v.querySelector(b);
  }
  function j(v, b) {
    return v.querySelector(b);
  }
  function _() {
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
  function X() {
    return m;
  }
  function $() {
    return m.linkGroupState;
  }
  function ne(v) {
    m.linkGroupState = v || ln();
  }
  function me() {
    return m.fieldInstances.map((v, b) => Vs(v, b));
  }
  function ae(v = {}) {
    const { silent: b = !1 } = v, S = _();
    S.fieldInstancesContainer && (S.fieldInstancesContainer.innerHTML = "");
    const U = me();
    return s && (s.value = JSON.stringify(U)), b || E?.(), U;
  }
  function ce() {
    const v = _(), b = Array.from(document.querySelectorAll(".placement-field-item")), S = b.length, U = new Set(
      b.map((le) => String(le.dataset.definitionId || "").trim()).filter((le) => le)
    ), z = /* @__PURE__ */ new Set();
    m.fieldInstances.forEach((le) => {
      const Te = String(le.definitionId || "").trim();
      U.has(Te) && z.add(Te);
    });
    const V = z.size, se = Math.max(0, S - V);
    v.totalFields && (v.totalFields.textContent = String(S)), v.placedCount && (v.placedCount.textContent = String(V)), v.unplacedCount && (v.unplacedCount.textContent = String(se));
  }
  function Ue(v, b = !1) {
    const S = C(v);
    if (!S) return;
    S.classList.add("opacity-50"), S.draggable = !1;
    const U = S.querySelector(".placement-status");
    U && (U.textContent = "Placed", U.classList.remove("text-amber-600"), U.classList.add("text-green-600")), b && S.classList.add("just-linked");
  }
  function ue(v) {
    const b = C(v);
    if (!b) return;
    b.classList.remove("opacity-50"), b.draggable = !0;
    const S = b.querySelector(".placement-status");
    S && (S.textContent = "Not placed", S.classList.remove("text-green-600"), S.classList.add("text-amber-600"));
  }
  function Re() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((b) => {
      b.classList.add("linked-flash"), setTimeout(() => {
        b.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function ze(v) {
    const b = v === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${v} linked fields`;
    window.toastManager?.info?.(b);
    const S = document.createElement("div");
    S.setAttribute("role", "status"), S.setAttribute("aria-live", "polite"), S.className = "sr-only", S.textContent = b, document.body.appendChild(S), setTimeout(() => S.remove(), 1e3), Re();
  }
  function je(v, b) {
    const S = document.createElement("div");
    S.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", S.dataset.definitionId = v, S.dataset.isLinked = String(b), S.title = b ? "Click to unlink this field" : "Click to re-link this field", S.setAttribute("role", "button"), S.setAttribute("aria-label", b ? "Unlink field from group" : "Re-link field to group"), S.setAttribute("tabindex", "0"), b ? S.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : S.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const U = () => Je(v, b);
    return S.addEventListener("click", U), S.addEventListener("keydown", (z) => {
      (z.key === "Enter" || z.key === " ") && (z.preventDefault(), U());
    }), S;
  }
  function Ze() {
    const v = _();
    if (v.linkAllBtn && (v.linkAllBtn.disabled = m.linkGroupState.unlinkedDefinitions.size === 0), v.unlinkAllBtn) {
      let b = !1;
      for (const S of m.linkGroupState.definitionToGroup.keys())
        if (!m.linkGroupState.unlinkedDefinitions.has(S)) {
          b = !0;
          break;
        }
      v.unlinkAllBtn.disabled = !b;
    }
  }
  function Fe() {
    const v = _();
    v.linkAllBtn && !v.linkAllBtn.dataset.bound && (v.linkAllBtn.dataset.bound = "true", v.linkAllBtn.addEventListener("click", () => {
      const b = m.linkGroupState.unlinkedDefinitions.size;
      if (b !== 0) {
        for (const S of m.linkGroupState.unlinkedDefinitions)
          m.linkGroupState = ni(m.linkGroupState, S);
        window.toastManager && window.toastManager.success(`Re-linked ${b} field${b > 1 ? "s" : ""}`), Be();
      }
    })), v.unlinkAllBtn && !v.unlinkAllBtn.dataset.bound && (v.unlinkAllBtn.dataset.bound = "true", v.unlinkAllBtn.addEventListener("click", () => {
      let b = 0;
      for (const S of m.linkGroupState.definitionToGroup.keys())
        m.linkGroupState.unlinkedDefinitions.has(S) || (m.linkGroupState = ti(m.linkGroupState, S), b += 1);
      b > 0 && window.toastManager && window.toastManager.success(`Unlinked ${b} field${b > 1 ? "s" : ""}`), Be();
    })), Ze();
  }
  function Le() {
    return r().map((b) => {
      const S = String(b.definitionId || "").trim(), U = m.linkGroupState.definitionToGroup.get(S) || "", z = m.linkGroupState.unlinkedDefinitions.has(S);
      return { ...b, definitionId: S, linkGroupId: U, isUnlinked: z };
    });
  }
  function pe() {
    const v = _();
    if (!v.fieldsList) return;
    v.fieldsList.innerHTML = "";
    const b = Le();
    v.linkBatchActions && v.linkBatchActions.classList.toggle("hidden", m.linkGroupState.groups.size === 0), b.forEach((S, U) => {
      const z = S.definitionId, V = String(S.fieldType || "text").trim() || "text", se = String(S.participantId || "").trim(), le = String(S.participantName || "Unassigned").trim() || "Unassigned", Te = Number.parseInt(String(S.page || "1"), 10) || 1, Ne = S.linkGroupId, _e = S.isUnlinked;
      if (!z) return;
      m.fieldInstances.forEach((Z) => {
        Z.definitionId === z && (Z.type = V, Z.participantId = se, Z.participantName = le);
      });
      const qe = Ut[V] || Ut.text, nt = m.fieldInstances.some((Z) => Z.definitionId === z), Ge = document.createElement("div");
      Ge.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${nt ? "opacity-50" : ""}`, Ge.draggable = !nt, Ge.dataset.definitionId = z, Ge.dataset.fieldType = V, Ge.dataset.participantId = se, Ge.dataset.participantName = le, Ge.dataset.page = String(Te), Ne && (Ge.dataset.linkGroupId = Ne);
      const vt = document.createElement("span");
      vt.className = `w-3 h-3 rounded ${qe.bg}`;
      const D = document.createElement("div");
      D.className = "flex-1 text-xs";
      const F = document.createElement("div");
      F.className = "font-medium capitalize", F.textContent = V.replace(/_/g, " ");
      const O = document.createElement("div");
      O.className = "text-gray-500", O.textContent = le;
      const ee = document.createElement("span");
      ee.className = `placement-status text-xs ${nt ? "text-green-600" : "text-amber-600"}`, ee.textContent = nt ? "Placed" : "Not placed", D.appendChild(F), D.appendChild(O), Ge.appendChild(vt), Ge.appendChild(D), Ge.appendChild(ee), Ge.addEventListener("dragstart", (Z) => {
        if (nt) {
          Z.preventDefault();
          return;
        }
        Z.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: z,
          fieldType: V,
          participantId: se,
          participantName: le
        })), Z.dataTransfer && (Z.dataTransfer.effectAllowed = "copy"), Ge.classList.add("opacity-50");
      }), Ge.addEventListener("dragend", () => {
        Ge.classList.remove("opacity-50");
      }), v.fieldsList?.appendChild(Ge);
      const re = b[U + 1];
      Ne && re && re.linkGroupId === Ne && v.fieldsList?.appendChild(je(z, !_e));
    }), Fe(), ce();
  }
  function Be() {
    pe();
  }
  function Je(v, b) {
    b ? (m.linkGroupState = ti(m.linkGroupState, v), window.toastManager?.info?.("Field unlinked")) : (m.linkGroupState = ni(m.linkGroupState, v), window.toastManager?.info?.("Field re-linked")), Be();
  }
  async function Oe(v) {
    const b = m.pdfDoc;
    if (!b) return;
    const S = _();
    if (!S.canvas || !S.canvasContainer) return;
    const U = S.canvas.getContext("2d"), z = await b.getPage(v), V = z.getViewport({ scale: m.scale });
    S.canvas.width = V.width, S.canvas.height = V.height, S.canvasContainer.style.width = `${V.width}px`, S.canvasContainer.style.height = `${V.height}px`, await z.render({
      canvasContext: U,
      viewport: V
    }).promise, S.currentPage && (S.currentPage.textContent = String(v)), de();
  }
  function st(v) {
    const b = Ys(m.linkGroupState, v);
    b && (m.linkGroupState = xi(m.linkGroupState, b.updatedGroup));
  }
  function oe(v) {
    const b = /* @__PURE__ */ new Map();
    r().forEach((U) => {
      const z = String(U.definitionId || "").trim();
      z && b.set(z, {
        type: String(U.fieldType || "text").trim() || "text",
        participantId: String(U.participantId || "").trim(),
        participantName: String(U.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(U.page || "1"), 10) || 1,
        linkGroupId: m.linkGroupState.definitionToGroup.get(z)
      });
    });
    let S = 0;
    for (; S < 10; ) {
      const U = Xs(
        m.linkGroupState,
        v,
        m.fieldInstances,
        b
      );
      if (!U || !U.newPlacement) break;
      m.fieldInstances.push(U.newPlacement), Ue(U.newPlacement.definitionId, !0), S += 1;
    }
    S > 0 && (de(), ce(), ae(), ze(S));
  }
  function G(v) {
    st(v);
  }
  function de() {
    const b = _().overlays;
    b && (b.innerHTML = "", b.style.pointerEvents = "auto", m.fieldInstances.filter((S) => S.page === m.currentPage).forEach((S) => {
      const U = Ut[S.type] || Ut.text, z = m.selectedFieldId === S.id, V = S.placementSource === bt.AUTO_LINKED, se = document.createElement("div"), le = V ? "border-dashed" : "border-solid";
      se.className = `field-overlay absolute cursor-move ${U.border} border-2 ${le} rounded`, se.style.cssText = `
          left: ${S.x * m.scale}px;
          top: ${S.y * m.scale}px;
          width: ${S.width * m.scale}px;
          height: ${S.height * m.scale}px;
          background-color: ${U.fill};
          ${z ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, se.dataset.instanceId = S.id;
      const Te = document.createElement("div");
      if (Te.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${U.bg}`, Te.textContent = `${S.type.replace("_", " ")} - ${S.participantName}`, se.appendChild(Te), V) {
        const qe = document.createElement("div");
        qe.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", qe.title = "Auto-linked from template", qe.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, se.appendChild(qe);
      }
      const Ne = document.createElement("div");
      Ne.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Ne.style.cssText = "transform: translate(50%, 50%);", se.appendChild(Ne);
      const _e = document.createElement("button");
      _e.type = "button", _e.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", _e.innerHTML = "×", _e.addEventListener("click", (qe) => {
        qe.stopPropagation(), ht(S.id);
      }), se.appendChild(_e), se.addEventListener("mousedown", (qe) => {
        qe.target === Ne ? rt(qe, S) : qe.target !== _e && Ve(qe, S, se);
      }), se.addEventListener("click", () => {
        m.selectedFieldId = S.id, de();
      }), b.appendChild(se);
    }));
  }
  function ye(v, b, S, U = {}) {
    const z = Zt[v.fieldType] || Zt.text, V = U.placementSource || bt.MANUAL, se = U.linkGroupId || Ii(m.linkGroupState, v.definitionId)?.id, le = {
      id: I("fi"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: m.currentPage,
      x: Math.max(0, b - z.width / 2),
      y: Math.max(0, S - z.height / 2),
      width: z.width,
      height: z.height,
      placementSource: V,
      linkGroupId: se,
      linkedFromFieldId: U.linkedFromFieldId
    };
    m.fieldInstances.push(le), Ue(v.definitionId), V === bt.MANUAL && se && G(le), de(), ce(), ae();
  }
  function it(v, b) {
    const S = {
      id: I("instance"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: b.page_number,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      placementSource: bt.AUTO,
      resolverId: b.resolver_id,
      confidence: b.confidence,
      placementRunId: L.currentRunId
    };
    m.fieldInstances.push(S), Ue(v.definitionId), de(), ce(), ae();
  }
  function Ve(v, b, S) {
    v.preventDefault(), m.isDragging = !0, m.selectedFieldId = b.id;
    const U = v.clientX, z = v.clientY, V = b.x * m.scale, se = b.y * m.scale;
    function le(Ne) {
      const _e = Ne.clientX - U, qe = Ne.clientY - z;
      b.x = Math.max(0, (V + _e) / m.scale), b.y = Math.max(0, (se + qe) / m.scale), b.placementSource = bt.MANUAL, S.style.left = `${b.x * m.scale}px`, S.style.top = `${b.y * m.scale}px`;
    }
    function Te() {
      m.isDragging = !1, document.removeEventListener("mousemove", le), document.removeEventListener("mouseup", Te), ae();
    }
    document.addEventListener("mousemove", le), document.addEventListener("mouseup", Te);
  }
  function rt(v, b) {
    v.preventDefault(), v.stopPropagation(), m.isResizing = !0;
    const S = v.clientX, U = v.clientY, z = b.width, V = b.height;
    function se(Te) {
      const Ne = (Te.clientX - S) / m.scale, _e = (Te.clientY - U) / m.scale;
      b.width = Math.max(30, z + Ne), b.height = Math.max(20, V + _e), b.placementSource = bt.MANUAL, de();
    }
    function le() {
      m.isResizing = !1, document.removeEventListener("mousemove", se), document.removeEventListener("mouseup", le), ae();
    }
    document.addEventListener("mousemove", se), document.addEventListener("mouseup", le);
  }
  function ht(v) {
    const b = m.fieldInstances.find((S) => S.id === v);
    b && (m.fieldInstances = m.fieldInstances.filter((S) => S.id !== v), ue(b.definitionId), de(), ce(), ae());
  }
  function ct(v, b) {
    const U = _().canvas;
    !v || !U || (v.addEventListener("dragover", (z) => {
      z.preventDefault(), z.dataTransfer && (z.dataTransfer.dropEffect = "copy"), U.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("dragleave", () => {
      U.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("drop", (z) => {
      z.preventDefault(), U.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const V = z.dataTransfer?.getData("application/json") || "";
      if (!V) return;
      const se = JSON.parse(V), le = U.getBoundingClientRect(), Te = (z.clientX - le.left) / m.scale, Ne = (z.clientY - le.top) / m.scale;
      ye(se, Te, Ne);
    }));
  }
  function fe() {
    const v = _();
    v.prevBtn?.addEventListener("click", async () => {
      m.currentPage > 1 && (m.currentPage -= 1, oe(m.currentPage), await Oe(m.currentPage));
    }), v.nextBtn?.addEventListener("click", async () => {
      m.currentPage < m.totalPages && (m.currentPage += 1, oe(m.currentPage), await Oe(m.currentPage));
    });
  }
  function Ie() {
    const v = _();
    v.zoomIn?.addEventListener("click", async () => {
      m.scale = Math.min(3, m.scale + 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(m.scale * 100)}%`), await Oe(m.currentPage);
    }), v.zoomOut?.addEventListener("click", async () => {
      m.scale = Math.max(0.5, m.scale - 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(m.scale * 100)}%`), await Oe(m.currentPage);
    }), v.zoomFit?.addEventListener("click", async () => {
      if (!m.pdfDoc || !v.viewer) return;
      const S = (await m.pdfDoc.getPage(m.currentPage)).getViewport({ scale: 1 });
      m.scale = (v.viewer.clientWidth - 40) / S.width, v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(m.scale * 100)}%`), await Oe(m.currentPage);
    });
  }
  function P() {
    return _().policyPreset?.value || "balanced";
  }
  function T(v) {
    return v >= 0.8 ? "bg-green-100 text-green-800" : v >= 0.6 ? "bg-blue-100 text-blue-800" : v >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function B(v) {
    return v >= 0.9 ? "bg-green-100 text-green-800" : v >= 0.7 ? "bg-blue-100 text-blue-800" : v >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Q(v) {
    return v ? v.split("_").map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(" ") : "Unknown";
  }
  function ie(v) {
    v.page_number !== m.currentPage && (m.currentPage = v.page_number, Oe(v.page_number));
    const b = _().overlays;
    if (!b) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const S = document.createElement("div");
    S.id = "suggestion-preview-overlay", S.className = "absolute pointer-events-none animate-pulse", S.style.cssText = `
      left: ${v.x * m.scale}px;
      top: ${v.y * m.scale}px;
      width: ${v.width * m.scale}px;
      height: ${v.height * m.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, b.appendChild(S), setTimeout(() => S.remove(), 3e3);
  }
  async function ge(v, b) {
  }
  function ve() {
    const v = document.getElementById("placement-suggestions-modal");
    if (!v) return;
    const b = v.querySelectorAll('.suggestion-item[data-accepted="true"]');
    b.forEach((S) => {
      const U = Number.parseInt(S.dataset.index || "", 10), z = L.suggestions[U];
      if (!z) return;
      const V = f(z.field_definition_id);
      if (!V) return;
      const se = C(z.field_definition_id);
      if (!se || se.classList.contains("opacity-50")) return;
      const le = {
        definitionId: z.field_definition_id,
        fieldType: V.type,
        participantId: V.participant_id,
        participantName: se.dataset.participantName || V.participant_name || "Unassigned"
      };
      m.currentPage = z.page_number, it(le, z);
    }), m.pdfDoc && Oe(m.currentPage), ge(b.length, L.suggestions.length - b.length), w(`Applied ${b.length} placement${b.length !== 1 ? "s" : ""}`, "success");
  }
  function Ce(v) {
    v.querySelectorAll(".accept-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const S = b.closest(".suggestion-item");
        S && (S.classList.add("border-green-500", "bg-green-50"), S.classList.remove("border-red-500", "bg-red-50"), S.dataset.accepted = "true");
      });
    }), v.querySelectorAll(".reject-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const S = b.closest(".suggestion-item");
        S && (S.classList.add("border-red-500", "bg-red-50"), S.classList.remove("border-green-500", "bg-green-50"), S.dataset.accepted = "false");
      });
    }), v.querySelectorAll(".preview-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const S = Number.parseInt(b.dataset.index || "", 10), U = L.suggestions[S];
        U && ie(U);
      });
    });
  }
  function N() {
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
    `, H(v, "#close-suggestions-modal")?.addEventListener("click", () => {
      v.classList.add("hidden");
    }), v.addEventListener("click", (b) => {
      b.target === v && v.classList.add("hidden");
    }), H(v, "#accept-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-green-500", "bg-green-50"), b.classList.remove("border-red-500", "bg-red-50"), b.dataset.accepted = "true";
      });
    }), H(v, "#reject-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-red-500", "bg-red-50"), b.classList.remove("border-green-500", "bg-green-50"), b.dataset.accepted = "false";
      });
    }), H(v, "#apply-suggestions-btn")?.addEventListener("click", () => {
      ve(), v.classList.add("hidden");
    }), H(v, "#rerun-placement-btn")?.addEventListener("click", () => {
      v.classList.add("hidden");
      const b = j(v, "#placement-policy-preset-modal"), S = _().policyPreset;
      S && b && (S.value = b.value), _().autoPlaceBtn?.click();
    }), v;
  }
  function J(v) {
    let b = document.getElementById("placement-suggestions-modal");
    b || (b = N(), document.body.appendChild(b));
    const S = j(b, "#suggestions-list"), U = j(b, "#resolver-info"), z = j(b, "#run-stats");
    !S || !U || !z || (U.innerHTML = L.resolverScores.map((V) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${R(String(V?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${V.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${T(Number(V.score || 0))}">
              ${(Number(V?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), z.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${R(String(v?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${v.status === "completed" ? "text-green-600" : "text-amber-600"}">${R(String(v?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(v?.elapsed_ms || 0))}ms</span>
      </div>
    `, S.innerHTML = L.suggestions.map((V, se) => {
      const le = f(V.field_definition_id), Te = Ut[le?.type || "text"] || Ut.text, Ne = R(String(le?.type || "field").replace(/_/g, " ")), _e = R(String(V?.id || "")), qe = Math.max(1, Number(V?.page_number || 1)), nt = Math.round(Number(V?.x || 0)), Ge = Math.round(Number(V?.y || 0)), vt = Math.max(0, Number(V?.confidence || 0)), D = R(Q(String(V?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${se}" data-suggestion-id="${_e}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Te.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Ne}</div>
                <div class="text-xs text-gray-500">Page ${qe}, (${nt}, ${Ge})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${B(Number(V.confidence || 0))}">
                ${(vt * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${D}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${se}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${se}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${se}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), Ce(b), b.classList.remove("hidden"));
  }
  function K() {
    const v = k();
    let b = 100;
    v.forEach((S) => {
      const U = {
        definitionId: S.dataset.definitionId || "",
        fieldType: S.dataset.fieldType || "text",
        participantId: S.dataset.participantId || "",
        participantName: S.dataset.participantName || "Unassigned"
      }, z = Zt[U.fieldType || "text"] || Zt.text;
      m.currentPage = m.totalPages, ye(U, 300, b + z.height / 2, { placementSource: bt.AUTO_FALLBACK }), b += z.height + 20;
    }), m.pdfDoc && Oe(m.totalPages), w("Fields placed using fallback layout", "info");
  }
  async function he() {
    const v = _();
    if (!v.autoPlaceBtn || L.isRunning) return;
    if (k().length === 0) {
      w("All fields are already placed", "info");
      return;
    }
    const S = document.querySelector('input[name="id"]')?.value;
    if (!S) {
      K();
      return;
    }
    L.isRunning = !0, v.autoPlaceBtn.disabled = !0, v.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const U = await fetch(`${t}/esign/agreements/${S}/auto-place`, {
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
      if (!U.ok)
        throw await g(U, "Auto-placement failed");
      const z = await U.json(), V = Zs(z) ? z.run || {} : z;
      L.currentRunId = V?.run_id || V?.id || null, L.suggestions = V?.suggestions || [], L.resolverScores = V?.resolver_scores || [], L.suggestions.length === 0 ? (w("No placement suggestions found. Try placing fields manually.", "warning"), K()) : J(V);
    } catch (U) {
      console.error("Auto-place error:", U);
      const z = U && typeof U == "object" ? U : {}, V = y(z.message || "Auto-placement failed", z.code || "", z.status || 0);
      w(`Auto-placement failed: ${V}`, "error"), K();
    } finally {
      L.isRunning = !1, v.autoPlaceBtn.disabled = !1, v.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function Se() {
    const v = _();
    v.autoPlaceBtn && !m.autoPlaceBound && (v.autoPlaceBtn.addEventListener("click", () => {
      he();
    }), m.autoPlaceBound = !0);
  }
  async function Ae() {
    const v = _();
    if (!n?.value) {
      v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden");
      return;
    }
    v.loading?.classList.remove("hidden"), v.noDocument?.classList.add("hidden");
    const b = r(), S = new Set(
      b.map((le) => String(le.definitionId || "").trim()).filter((le) => le)
    );
    m.fieldInstances = m.fieldInstances.filter(
      (le) => S.has(String(le.definitionId || "").trim())
    ), pe();
    const U = ++m.loadRequestVersion, z = String(n.value || "").trim(), V = encodeURIComponent(z), se = `${e}/panels/esign_documents/${V}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const Te = await window.pdfjsLib.getDocument({
        url: se,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (U !== m.loadRequestVersion)
        return;
      m.pdfDoc = Te, m.totalPages = m.pdfDoc.numPages, m.currentPage = 1, v.totalPages && (v.totalPages.textContent = String(m.totalPages)), await Oe(m.currentPage), v.loading?.classList.add("hidden"), m.uiHandlersBound || (ct(v.viewer, v.overlays), fe(), Ie(), m.uiHandlersBound = !0), de();
    } catch (le) {
      if (U !== m.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", le), v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden"), v.noDocument) {
        const Te = le && typeof le == "object" ? le : {};
        v.noDocument.textContent = `Failed to load PDF: ${y(Te.message || "Failed to load PDF")}`;
      }
    }
    ce(), ae({ silent: !0 });
  }
  function be(v) {
    const b = Array.isArray(v?.fieldPlacements) ? v.fieldPlacements : [];
    m.fieldInstances = b.map((S, U) => Kt(S, U)), ae({ silent: !0 });
  }
  return ae({ silent: !0 }), {
    bindEvents: Se,
    initPlacementEditor: Ae,
    getState: X,
    getLinkGroupState: $,
    setLinkGroupState: ne,
    buildPlacementFormEntries: me,
    updateFieldInstancesFormData: ae,
    restoreFieldPlacementsFromState: be
  };
}
function Bt(i, e, t = "") {
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
    collectFieldRulesForForm: g,
    buildPlacementFormEntries: y,
    getCurrentStep: w,
    totalWizardSteps: R
  } = i;
  function E() {
    const m = [];
    o.querySelectorAll(".participant-entry").forEach((k) => {
      const H = String(k.getAttribute("data-participant-id") || "").trim(), j = Bt(k, 'input[name*=".name"]'), _ = Bt(k, 'input[name*=".email"]'), X = Bt(k, 'select[name*=".role"]', "signer"), $ = si(k, ".notify-input", !0), ne = Bt(k, ".signing-stage-input"), me = Number(ne || "1") || 1;
      m.push({
        id: H,
        name: j,
        email: _,
        role: X,
        notify: $,
        signing_stage: X === "signer" ? me : 0
      });
    });
    const L = [];
    c.querySelectorAll(".field-definition-entry").forEach((k) => {
      const H = String(k.getAttribute("data-field-definition-id") || "").trim(), j = Bt(k, ".field-type-select", "signature"), _ = Bt(k, ".field-participant-select"), X = Number(Bt(k, 'input[name*=".page"]', "1")) || 1, $ = si(k, 'input[name*=".required"]');
      H && L.push({
        id: H,
        type: j,
        participant_id: _,
        page: X,
        required: $
      });
    });
    const I = y(), C = JSON.stringify(I);
    return r && (r.value = C), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(s?.value || "").trim(),
      participants: m,
      field_instances: L,
      field_placements: I,
      field_placements_json: C,
      field_rules: g(),
      field_rules_json: String(f?.value || "[]"),
      send_for_signature: w() === R ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(t?.value || "0") || 0
    };
  }
  return {
    buildCanonicalAgreementPayload: E
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
    wizardNavigationController: g,
    documentIdInput: y,
    documentPageCountInput: w,
    selectedDocumentTitle: R,
    agreementRefs: E,
    parsePositiveInt: m,
    isEditMode: L
  } = i;
  let I = null, C = !1;
  function k(ue) {
    C = !0;
    try {
      return ue();
    } finally {
      C = !1;
    }
  }
  function H(ue) {
    const Re = ue?.document, ze = document.getElementById("selected-document"), je = document.getElementById("document-picker"), Ze = document.getElementById("selected-document-info");
    if (y.value = String(Re?.id || "").trim(), w) {
      const Fe = m(Re?.pageCount, 0) || 0;
      w.value = Fe > 0 ? String(Fe) : "";
    }
    if (R && (R.textContent = String(Re?.title || "").trim()), Ze instanceof HTMLElement) {
      const Fe = m(Re?.pageCount, 0) || 0;
      Ze.textContent = Fe > 0 ? `${Fe} pages` : "";
    }
    if (y.value) {
      ze?.classList.remove("hidden"), je?.classList.add("hidden");
      return;
    }
    ze?.classList.add("hidden"), je?.classList.remove("hidden");
  }
  function j(ue) {
    E.form.titleInput.value = String(ue?.details?.title || ""), E.form.messageInput.value = String(ue?.details?.message || "");
  }
  function _() {
    C || (I !== null && clearTimeout(I), I = setTimeout(() => {
      n();
    }, 500));
  }
  function X(ue) {
    s.restoreFromState(ue);
  }
  function $(ue) {
    o.restoreFieldDefinitionsFromState(ue);
  }
  function ne(ue) {
    o.restoreFieldRulesFromState(ue);
  }
  function me(ue) {
    c.restoreFieldPlacementsFromState(ue);
  }
  function ae() {
    y && new MutationObserver(() => {
      C || n();
    }).observe(y, { attributes: !0, attributeFilter: ["value"] });
    const ue = document.getElementById("title"), Re = document.getElementById("message");
    ue instanceof HTMLInputElement && ue.addEventListener("input", () => {
      const ze = String(ue.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(ze), _();
    }), (Re instanceof HTMLInputElement || Re instanceof HTMLTextAreaElement) && Re.addEventListener("input", _), s.refs.participantsContainer?.addEventListener("input", _), s.refs.participantsContainer?.addEventListener("change", _), o.refs.fieldDefinitionsContainer?.addEventListener("input", _), o.refs.fieldDefinitionsContainer?.addEventListener("change", _), o.refs.fieldRulesContainer?.addEventListener("input", _), o.refs.fieldRulesContainer?.addEventListener("change", _);
  }
  function ce(ue, Re = {}) {
    k(() => {
      if (H(ue), j(ue), X(ue), $(ue), ne(ue), r(), me(ue), Re.updatePreview !== !1) {
        const je = ue?.document;
        je?.id ? f.setDocument(
          je.id,
          je.title || null,
          je.pageCount ?? null
        ) : f.clear();
      }
      const ze = m(
        Re.step ?? ue?.currentStep,
        g.getCurrentStep()
      ) || 1;
      g.setCurrentStep(ze), g.updateWizardUI();
    });
  }
  function Ue() {
    if (g.updateWizardUI(), y.value) {
      const ue = R?.textContent || null, Re = m(w?.value, 0) || null;
      f.setDocument(y.value, ue, Re);
    } else
      f.clear();
    L && E.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: ae,
    debouncedTrackChanges: _,
    applyStateToUI: ce,
    renderInitialWizardUI: Ue
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
    findSignersMissingRequiredSignatureField: g,
    missingSignatureFieldMessage: y,
    announceError: w
  } = i;
  function R(E) {
    switch (E) {
      case 1:
        return e.value ? !!r() : (w("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (w("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const m = n.querySelectorAll(".participant-entry");
        if (m.length === 0)
          return w("Please add at least one participant"), !1;
        let L = !1;
        return m.forEach((I) => {
          ir(I)?.value === "signer" && (L = !0);
        }), L ? !0 : (w("At least one signer is required"), !1);
      }
      case 4: {
        const m = s.querySelectorAll(".field-definition-entry");
        for (const k of Array.from(m)) {
          const H = sr(k);
          if (!H?.value)
            return w("Please assign all fields to a signer"), H?.focus(), !1;
        }
        if (f().find((k) => !k.participantId))
          return w("Please assign all automation rules to a signer"), o?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const C = g();
        return C.length > 0 ? (w(y(C)), c.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: R
  };
}
function ar(i) {
  const {
    isEditMode: e,
    storageKey: t,
    stateManager: n,
    syncOrchestrator: s,
    syncService: o,
    applyResumedState: c,
    hasMeaningfulWizardProgress: r,
    formatRelativeTime: f,
    emitWizardTelemetry: g,
    getActiveTabDebugState: y
  } = i;
  function w(_, X) {
    return n.normalizeLoadedState({
      ...X,
      currentStep: _.currentStep,
      document: _.document,
      details: _.details,
      participants: _.participants,
      fieldDefinitions: _.fieldDefinitions,
      fieldPlacements: _.fieldPlacements,
      fieldRules: _.fieldRules,
      titleSource: _.titleSource,
      syncPending: !0,
      serverDraftId: X.serverDraftId,
      serverRevision: X.serverRevision,
      lastSyncedAt: X.lastSyncedAt
    });
  }
  async function R() {
    if (e) return n.getState();
    const _ = n.normalizeLoadedState(n.getState());
    at("resume_reconcile_start", Ee({
      state: _,
      storageKey: t,
      ownership: y?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const X = String(_?.serverDraftId || "").trim();
    if (!X)
      return n.setState(_, { syncPending: !!_.syncPending, notify: !1 }), at("resume_reconcile_complete", Ee({
        state: _,
        storageKey: t,
        ownership: y?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), n.getState();
    try {
      const $ = await o.load(X), ne = n.normalizeLoadedState({
        ...$?.wizard_state && typeof $.wizard_state == "object" ? $.wizard_state : {},
        serverDraftId: String($?.id || X).trim() || X,
        serverRevision: Number($?.revision || 0),
        lastSyncedAt: String($?.updated_at || $?.updatedAt || "").trim() || _.lastSyncedAt,
        syncPending: !1
      }), me = String(_.serverDraftId || "").trim() === String(ne.serverDraftId || "").trim(), ae = me && _.syncPending === !0 ? w(_, ne) : ne;
      return n.setState(ae, { syncPending: !!ae.syncPending, notify: !1 }), at("resume_reconcile_complete", Ee({
        state: ae,
        storageKey: t,
        ownership: y?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: me && _.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String($?.id || X).trim() || null,
          loadedRevision: Number($?.revision || 0)
        }
      })), n.getState();
    } catch ($) {
      const ne = typeof $ == "object" && $ !== null && "status" in $ ? Number($.status || 0) : 0;
      if (ne === 404) {
        const me = n.normalizeLoadedState({
          ..._,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return n.setState(me, { syncPending: !!me.syncPending, notify: !1 }), gt("resume_reconcile_remote_missing", Ee({
          state: me,
          storageKey: t,
          ownership: y?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: X,
            status: ne
          }
        })), n.getState();
      }
      return gt("resume_reconcile_failed", Ee({
        state: _,
        storageKey: t,
        ownership: y?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: X,
          status: ne
        }
      })), n.getState();
    }
  }
  function E(_) {
    return document.getElementById(_);
  }
  function m() {
    const _ = document.getElementById("resume-dialog-modal"), X = n.getState(), $ = String(X?.document?.title || "").trim() || String(X?.document?.id || "").trim() || "Unknown document", ne = E("resume-draft-title"), me = E("resume-draft-document"), ae = E("resume-draft-step"), ce = E("resume-draft-time");
    ne && (ne.textContent = X.details?.title || "Untitled Agreement"), me && (me.textContent = $), ae && (ae.textContent = String(X.currentStep || 1)), ce && (ce.textContent = f(X.updatedAt)), _?.classList.remove("hidden"), g("wizard_resume_prompt_shown", {
      step: Number(X.currentStep || 1),
      has_server_draft: !!X.serverDraftId
    });
  }
  async function L(_ = {}) {
    const X = _.deleteServerDraft === !0, $ = String(n.getState()?.serverDraftId || "").trim();
    if (n.clear(), s.broadcastStateUpdate(), !(!X || !$))
      try {
        await o.delete($);
      } catch (ne) {
        console.warn("Failed to delete server draft:", ne);
      }
  }
  function I() {
    return n.normalizeLoadedState({
      ...n.getState(),
      ...n.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function C(_) {
    r(_) && (n.setState(_, { syncPending: !0 }), s.scheduleSync(), s.broadcastStateUpdate());
  }
  async function k(_) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const X = I();
    switch (_) {
      case "continue":
        c(n.getState());
        return;
      case "start_new":
        await L({ deleteServerDraft: !1 }), C(X);
        return;
      case "proceed":
        await L({ deleteServerDraft: !0 }), C(X);
        return;
      case "discard":
        await L({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  function H() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      k("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      k("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      k("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      k("discard");
    });
  }
  async function j() {
    e || (await R(), n.hasResumableState() && m());
  }
  return {
    bindEvents: H,
    reconcileBootstrapState: R,
    maybeShowResumeDialog: j
  };
}
function or(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let s = "saved";
  function o(E) {
    if (!E) return "unknown";
    const m = new Date(E), I = (/* @__PURE__ */ new Date()).getTime() - m.getTime(), C = Math.floor(I / 6e4), k = Math.floor(I / 36e5), H = Math.floor(I / 864e5);
    return C < 1 ? "just now" : C < 60 ? `${C} minute${C !== 1 ? "s" : ""} ago` : k < 24 ? `${k} hour${k !== 1 ? "s" : ""} ago` : H < 7 ? `${H} day${H !== 1 ? "s" : ""} ago` : m.toLocaleDateString();
  }
  function c() {
    const E = n.getState();
    s === "paused" && r(E?.syncPending ? "pending" : "saved");
  }
  function r(E) {
    s = String(E || "").trim() || "saved";
    const m = e.sync.indicator, L = e.sync.icon, I = e.sync.text, C = e.sync.retryBtn;
    if (!(!m || !L || !I))
      switch (m.classList.remove("hidden"), E) {
        case "saved":
          L.className = "w-2 h-2 rounded-full bg-green-500", I.textContent = "Saved", I.className = "text-gray-600", C?.classList.add("hidden");
          break;
        case "saving":
          L.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", I.textContent = "Saving...", I.className = "text-gray-600", C?.classList.add("hidden");
          break;
        case "pending":
          L.className = "w-2 h-2 rounded-full bg-gray-400", I.textContent = "Unsaved changes", I.className = "text-gray-500", C?.classList.add("hidden");
          break;
        case "error":
          L.className = "w-2 h-2 rounded-full bg-amber-500", I.textContent = "Not synced", I.className = "text-amber-600", C?.classList.remove("hidden");
          break;
        case "paused":
          L.className = "w-2 h-2 rounded-full bg-slate-400", I.textContent = "Open in another tab", I.className = "text-slate-600", C?.classList.add("hidden");
          break;
        case "conflict":
          L.className = "w-2 h-2 rounded-full bg-red-500", I.textContent = "Conflict", I.className = "text-red-600", C?.classList.add("hidden");
          break;
        default:
          m.classList.add("hidden");
      }
  }
  function f(E) {
    const m = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = o(m.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(E || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function g(E, m = "", L = 0) {
    const I = String(m || "").trim().toUpperCase(), C = String(E || "").trim().toLowerCase();
    return I === "DRAFT_SEND_NOT_FOUND" || I === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : I === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : I === "SCOPE_DENIED" || C.includes("scope denied") ? "You don't have access to this organization's resources." : I === "TRANSPORT_SECURITY" || I === "TRANSPORT_SECURITY_REQUIRED" || C.includes("tls transport required") || Number(L) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : I === "PDF_UNSUPPORTED" || C === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(E || "").trim() !== "" ? String(E).trim() : "Something went wrong. Please try again.";
  }
  async function y(E, m = "") {
    const L = Number(E?.status || 0);
    let I = "", C = "", k = {};
    try {
      const H = await E.json();
      I = String(H?.error?.code || H?.code || "").trim(), C = String(H?.error?.message || H?.message || "").trim(), k = H?.error?.details && typeof H.error.details == "object" ? H.error.details : {}, String(k?.entity || "").trim().toLowerCase() === "drafts" && String(I).trim().toUpperCase() === "NOT_FOUND" && (I = "DRAFT_SEND_NOT_FOUND", C === "" && (C = "Draft not found"));
    } catch {
      C = "";
    }
    return C === "" && (C = m || `Request failed (${L || "unknown"})`), {
      status: L,
      code: I,
      details: k,
      message: g(C, I, L)
    };
  }
  function w(E, m = "", L = 0) {
    const I = g(E, m, L);
    t && (t.textContent = I), window.toastManager?.error ? window.toastManager.error(I) : alert(I);
  }
  async function R(E, m = {}) {
    const L = await E;
    return L?.blocked && L.reason === "passive_tab" ? (w(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), L) : (L?.error && String(m.errorMessage || "").trim() !== "" && w(m.errorMessage || ""), L);
  }
  return {
    announceError: w,
    formatRelativeTime: o,
    mapUserFacingError: g,
    parseAPIError: y,
    restoreSyncStatusFromState: c,
    showSyncConflictDialog: f,
    surfaceSyncOutcome: R,
    updateSyncStatus: r
  };
}
function cr(i) {
  const {
    createSuccess: e,
    stateManager: t,
    syncOrchestrator: n,
    syncService: s,
    applyStateToUI: o,
    surfaceSyncOutcome: c,
    announceError: r,
    getCurrentStep: f,
    reviewStep: g,
    onReviewStepRequested: y,
    updateActiveTabOwnershipUI: w
  } = i;
  function R() {
    const I = t.collectFormState();
    t.updateState(I), n.scheduleSync(), n.broadcastStateUpdate();
  }
  function E() {
    if (!e)
      return;
    const C = t.getState()?.serverDraftId;
    t.clear(), n.broadcastStateUpdate(), C && s.delete(C).catch((k) => {
      console.warn("Failed to delete server draft after successful create:", k);
    });
  }
  function m() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await c(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      const I = t.getState();
      if (I.serverDraftId)
        try {
          const C = await s.load(I.serverDraftId);
          if (C.wizard_state) {
            const k = {
              ...C.wizard_state,
              serverDraftId: C.id,
              serverRevision: C.revision,
              syncPending: !1
            };
            t.setState(k, { syncPending: !1 }), o(k);
          }
        } catch (C) {
          console.error("Failed to load server draft:", C);
        }
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const I = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      t.setState({
        ...t.getState(),
        serverRevision: I,
        syncPending: !0
      }, { syncPending: !0 });
      const C = await c(n.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (C?.success || C?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  function L() {
    document.getElementById("active-tab-take-control-btn")?.addEventListener("click", async () => {
      if (!n.takeControl()) {
        r("This agreement is active in another tab. Take control here before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED");
        return;
      }
      w({ isOwner: !0 }), t.getState()?.syncPending && await c(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      }), f() === g && y();
    }), document.getElementById("active-tab-reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
  }
  return {
    bindOwnershipHandlers: L,
    bindRetryAndConflictHandlers: m,
    handleCreateSuccessCleanup: E,
    trackWizardStateChanges: R
  };
}
const Pt = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function Ci(i, e = Pt.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === Pt.USER ? Pt.USER : t === Pt.SERVER_SEED ? Pt.SERVER_SEED : t === Pt.AUTOFILL ? Pt.AUTOFILL : e;
}
function lr(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), s = String(t.email ?? "").trim(), o = String(t.role ?? "signer").trim().toLowerCase(), c = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), r = t.notify !== !1;
  return n !== "" || s !== "" || o !== "" && o !== "signer" || Number.isFinite(c) && c > 1 || !r ? !0 : e > 0;
}
function ri(i, e = {}) {
  const {
    normalizeTitleSource: t = Ci,
    titleSource: n = Pt
  } = e;
  if (!i || typeof i != "object") return !1;
  const s = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(s) && s > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const c = String(i.details?.title ?? "").trim(), r = String(i.details?.message ?? "").trim(), f = t(
    i.titleSource,
    c === "" ? n.AUTOFILL : n.USER
  );
  return !!(c !== "" && f !== n.SERVER_SEED || r !== "" || (Array.isArray(i.participants) ? i.participants : []).some((w, R) => lr(w, R)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function dr(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), o = /\/v\d+$/i.test(s) ? s : `${s}/v1`, c = `${o}/esign/drafts`, r = !!e.is_edit, f = !!e.create_success, g = String(e.user_id || "").trim(), y = String(e.submit_mode || "json").trim().toLowerCase(), w = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, R = Array.isArray(e.initial_participants) ? e.initial_participants : [], E = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], m = {
    base_path: t,
    api_base_path: n,
    user_id: g,
    is_edit: r,
    create_success: f,
    submit_mode: y,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: w
    },
    initial_participants: R,
    initial_field_instances: E
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
    currentUserID: g,
    submitMode: y,
    documentsUploadURL: w,
    initialParticipants: R,
    initialFieldInstances: E
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
    TITLE_SOURCE: Pt
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
    currentUserID: g,
    submitMode: y,
    documentsUploadURL: w,
    initialParticipants: R,
    initialFieldInstances: E
  } = dr(i), {
    draftEndpointWithUserID: m,
    draftRequestHeaders: L
  } = ur(g), I = Ls(document), {
    WIZARD_STATE_VERSION: C,
    WIZARD_STORAGE_KEY: k,
    WIZARD_CHANNEL_NAME: H,
    LEGACY_WIZARD_STORAGE_KEY: j,
    SYNC_DEBOUNCE_MS: _,
    SYNC_RETRY_DELAYS: X,
    WIZARD_STORAGE_MIGRATION_VERSION: $,
    ACTIVE_TAB_STORAGE_KEY: ne,
    ACTIVE_TAB_HEARTBEAT_MS: me,
    ACTIVE_TAB_STALE_MS: ae,
    TITLE_SOURCE: ce
  } = pr({
    config: e,
    currentUserID: g,
    isEditMode: r
  }), Ue = Ms(), ue = (Y, $e = ce.AUTOFILL) => Ci(Y, $e), Re = (Y) => ri(Y, {
    normalizeTitleSource: ue,
    titleSource: ce
  }), ze = Is({
    apiBasePath: o,
    basePath: n
  }), je = I.form.root, Ze = gr(I.form.submitBtn, "submit button"), Fe = I.form.announcements;
  let Le = null, pe = null, Be = null, Je = null, Oe = null, st = null, oe = null, G = null, de = ln();
  const ye = (Y, $e = {}) => {
    Je?.applyStateToUI(Y, $e);
  }, it = () => Je?.debouncedTrackChanges?.(), Ve = () => G?.trackWizardStateChanges?.(), rt = (Y) => oe?.formatRelativeTime(Y) || "unknown", ht = () => oe?.restoreSyncStatusFromState(), ct = (Y) => oe?.updateSyncStatus(Y), fe = (Y) => oe?.showSyncConflictDialog(Y), Ie = (Y, $e = "", pt = 0) => oe?.mapUserFacingError(Y, $e, pt) || String(Y || "").trim(), P = (Y, $e) => oe ? oe.parseAPIError(Y, $e) : Promise.resolve({ status: Number(Y.status || 0), code: "", details: {}, message: $e }), T = (Y, $e = "", pt = 0) => oe?.announceError(Y, $e, pt), B = (Y, $e = {}) => oe ? oe.surfaceSyncOutcome(Y, $e) : Promise.resolve({}), Q = () => ({
    isOwner: K?.isOwner ?? he.isOwner,
    claim: K?.currentClaim ?? he.currentClaim,
    blockedReason: K?.lastBlockedReason ?? he.lastBlockedReason
  }), ie = As(I, {
    formatRelativeTime: rt
  }), ge = (Y = {}) => ie.render(Y), ve = async (Y, $e) => {
    const pt = await P(Y, $e), At = new Error(pt.message);
    return At.code = pt.code, At.status = pt.status, At;
  }, Ce = {
    hasResumableState: () => N.hasResumableState(),
    setTitleSource: (Y, $e) => N.setTitleSource(Y, $e),
    updateDocument: (Y) => N.updateDocument(Y),
    updateDetails: (Y, $e) => N.updateDetails(Y, $e),
    getState: () => {
      const Y = N.getState();
      return {
        titleSource: Y.titleSource,
        details: Y.details && typeof Y.details == "object" ? Y.details : {}
      };
    }
  }, N = new Ts({
    storageKey: k,
    legacyStorageKey: j,
    stateVersion: C,
    storageMigrationVersion: $,
    totalWizardSteps: Jt,
    titleSource: ce,
    normalizeTitleSource: ue,
    parsePositiveInt: tt,
    hasMeaningfulWizardProgress: Re,
    collectFormState: () => {
      const Y = I.form.documentIdInput?.value || null, $e = document.getElementById("selected-document-title")?.textContent?.trim() || null, pt = ue(
        N.getState()?.titleSource,
        String(I.form.titleInput?.value || "").trim() === "" ? ce.AUTOFILL : ce.USER
      );
      return {
        document: {
          id: Y,
          title: $e,
          pageCount: parseInt(I.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: I.form.titleInput?.value || "",
          message: I.form.messageInput?.value || ""
        },
        titleSource: pt,
        participants: Le?.collectParticipantsForState?.() || [],
        fieldDefinitions: pe?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: Be?.getState?.()?.fieldInstances || [],
        fieldRules: pe?.collectFieldRulesForState?.() || []
      };
    },
    emitTelemetry: Ue
  });
  N.start(), oe = or({
    agreementRefs: I,
    formAnnouncements: Fe,
    stateManager: N
  });
  const J = new _s({
    stateManager: N,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: m,
    draftRequestHeaders: L
  });
  let K;
  const he = new Ps({
    storageKey: ne,
    channelName: H,
    heartbeatMs: me,
    staleMs: ae,
    telemetry: Ue,
    onOwnershipChange: (Y) => {
      Y.isOwner ? ht() : ct("paused"), ie.render(Y);
    },
    onRemoteState: (Y) => {
      if (N.applyRemoteState(Y, {
        save: !0,
        notify: !1
      }).replacedLocalState) {
        const pt = st?.reconcileBootstrapState?.();
        pt ? pt.then((At) => {
          ye(At, {
            step: Number(At?.currentStep || 1)
          }), N.notifyListeners();
        }) : (ye(N.getState(), {
          step: Number(N.getState()?.currentStep || 1)
        }), N.notifyListeners());
      } else
        N.notifyListeners();
    },
    onRemoteSync: (Y, $e) => {
      N.applyRemoteSync(Y, $e, {
        save: !0,
        notify: !0
      });
    },
    onVisibilityHidden: () => {
      K?.forceSync({ keepalive: !0 });
    },
    onPageHide: () => {
      K?.forceSync({ keepalive: !0 });
    },
    onBeforeUnload: () => {
      K?.forceSync({ keepalive: !0 });
    }
  });
  K = new Ds({
    stateManager: N,
    syncService: J,
    activeTabController: he,
    storageKey: k,
    statusUpdater: ct,
    showConflictDialog: fe,
    syncDebounceMs: _,
    syncRetryDelays: X,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: m,
    draftRequestHeaders: L
  });
  const Ae = Es({
    context: {
      config: t,
      refs: I,
      basePath: n,
      apiBase: s,
      apiVersionBase: o,
      draftsEndpoint: c,
      previewCard: ze,
      emitTelemetry: Ue,
      stateManager: N,
      syncService: J,
      activeTabController: he,
      syncController: K
    },
    hooks: {
      renderInitialUI() {
        Je?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        st?.maybeShowResumeDialog?.(), be.loadDocuments(), be.loadRecentDocuments();
      },
      destroy() {
        ie.destroy(), N.destroy();
      }
    }
  }), be = Gs({
    apiBase: s,
    apiVersionBase: o,
    currentUserID: g,
    documentsUploadURL: w,
    isEditMode: r,
    titleSource: ce,
    normalizeTitleSource: ue,
    stateManager: Ce,
    previewCard: ze,
    parseAPIError: ve,
    announceError: T,
    showToast: ai,
    mapUserFacingError: Ie,
    renderFieldRulePreview: () => pe?.renderFieldRulePreview?.()
  });
  be.initializeTitleSourceSeed(), be.bindEvents();
  const v = Ht(be.refs.documentIdInput, "document id input"), b = Ht(be.refs.documentSearch, "document search input"), S = be.refs.selectedDocumentTitle, U = be.refs.documentPageCountInput, z = be.ensureSelectedDocumentCompatibility, V = be.getCurrentDocumentPageCount;
  Le = Ws({
    initialParticipants: R,
    onParticipantsChanged: () => pe?.updateFieldParticipantOptions?.()
  }), Le.initialize(), Le.bindEvents();
  const se = Ht(Le.refs.participantsContainer, "participants container"), le = Ht(Le.refs.addParticipantBtn, "add participant button"), Te = () => Le?.getSignerParticipants() || [];
  pe = Qs({
    initialFieldInstances: E,
    placementSource: bt,
    getCurrentDocumentPageCount: V,
    getSignerParticipants: Te,
    escapeHtml: Sn,
    onDefinitionsChanged: () => it(),
    onRulesChanged: () => it(),
    onParticipantsChanged: () => pe?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => Be?.getLinkGroupState?.() || de,
    setPlacementLinkGroupState: (Y) => {
      de = Y || ln(), Be?.setLinkGroupState?.(de);
    }
  }), pe.bindEvents(), pe.initialize();
  const Ne = Ht(pe.refs.fieldDefinitionsContainer, "field definitions container"), _e = pe.refs.fieldRulesContainer, qe = Ht(pe.refs.addFieldBtn, "add field button"), nt = pe.refs.fieldPlacementsJSONInput, Ge = pe.refs.fieldRulesJSONInput, vt = () => pe?.collectFieldRulesForState() || [], D = () => pe?.collectFieldRulesForState() || [], F = () => pe?.collectFieldRulesForForm() || [], O = (Y, $e) => pe?.expandRulesForPreview(Y, $e) || [], ee = () => pe?.updateFieldParticipantOptions(), re = () => pe.collectPlacementFieldDefinitions(), Z = (Y) => pe?.getFieldDefinitionById(Y) || null, We = () => pe?.findSignersMissingRequiredSignatureField() || [], Ke = (Y) => pe?.missingSignatureFieldMessage(Y) || "", lt = $s({
    documentIdInput: v,
    selectedDocumentTitle: S,
    participantsContainer: se,
    fieldDefinitionsContainer: Ne,
    submitBtn: Ze,
    syncOrchestrator: K,
    escapeHtml: Sn,
    getSignerParticipants: Te,
    getCurrentDocumentPageCount: V,
    collectFieldRulesForState: D,
    expandRulesForPreview: O,
    findSignersMissingRequiredSignatureField: We,
    goToStep: (Y) => Me.goToStep(Y)
  });
  Be = er({
    apiBase: s,
    apiVersionBase: o,
    documentIdInput: v,
    fieldPlacementsJSONInput: nt,
    initialFieldInstances: pe.buildInitialPlacementInstances(),
    initialLinkGroupState: de,
    collectPlacementFieldDefinitions: re,
    getFieldDefinitionById: Z,
    parseAPIError: ve,
    mapUserFacingError: Ie,
    showToast: ai,
    escapeHtml: Sn,
    onPlacementsChanged: () => Ve()
  }), Be.bindEvents(), de = Be.getLinkGroupState();
  const Me = Fs({
    totalWizardSteps: Jt,
    wizardStep: ot,
    nextStepLabels: gs,
    submitBtn: Ze,
    syncOrchestrator: K,
    previewCard: ze,
    updateActiveTabOwnershipUI: ge,
    validateStep: (Y) => Oe?.validateStep(Y) !== !1,
    onPlacementStep() {
      Be.initPlacementEditor();
    },
    onReviewStep() {
      lt.initSendReadinessCheck();
    },
    onStepChanged(Y) {
      N.updateStep(Y), Ve(), K.forceSync();
    }
  });
  Me.bindEvents(), G = cr({
    createSuccess: f,
    stateManager: N,
    syncOrchestrator: K,
    syncService: J,
    applyStateToUI: (Y) => ye(Y, {
      step: Number(Y?.currentStep || 1)
    }),
    surfaceSyncOutcome: B,
    announceError: T,
    getCurrentStep: () => Me.getCurrentStep(),
    reviewStep: ot.REVIEW,
    onReviewStepRequested: () => lt.initSendReadinessCheck(),
    updateActiveTabOwnershipUI: ge
  }), G.handleCreateSuccessCleanup(), G.bindRetryAndConflictHandlers(), G.bindOwnershipHandlers();
  const et = tr({
    documentIdInput: v,
    documentPageCountInput: U,
    titleInput: I.form.titleInput,
    messageInput: I.form.messageInput,
    participantsContainer: se,
    fieldDefinitionsContainer: Ne,
    fieldPlacementsJSONInput: nt,
    fieldRulesJSONInput: Ge,
    collectFieldRulesForForm: () => F(),
    buildPlacementFormEntries: () => Be?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => Me.getCurrentStep(),
    totalWizardSteps: Jt
  }), yt = () => et.buildCanonicalAgreementPayload();
  return Je = nr({
    titleSource: ce,
    stateManager: N,
    trackWizardStateChanges: Ve,
    participantsController: Le,
    fieldDefinitionsController: pe,
    placementController: Be,
    updateFieldParticipantOptions: ee,
    previewCard: ze,
    wizardNavigationController: Me,
    documentIdInput: v,
    documentPageCountInput: U,
    selectedDocumentTitle: S,
    agreementRefs: I,
    parsePositiveInt: tt,
    isEditMode: r
  }), Je.bindChangeTracking(), Oe = rr({
    documentIdInput: v,
    titleInput: I.form.titleInput,
    participantsContainer: se,
    fieldDefinitionsContainer: Ne,
    fieldRulesContainer: _e,
    addFieldBtn: qe,
    ensureSelectedDocumentCompatibility: z,
    collectFieldRulesForState: vt,
    findSignersMissingRequiredSignatureField: We,
    missingSignatureFieldMessage: Ke,
    announceError: T
  }), st = ar({
    isEditMode: r,
    storageKey: k,
    stateManager: N,
    syncOrchestrator: K,
    syncService: J,
    applyResumedState: (Y) => ye(Y, {
      step: Number(Y?.currentStep || 1)
    }),
    hasMeaningfulWizardProgress: ri,
    formatRelativeTime: rt,
    emitWizardTelemetry: (Y, $e) => Ue(Y, $e),
    getActiveTabDebugState: Q
  }), st.bindEvents(), Os({
    config: e,
    form: je,
    submitBtn: Ze,
    documentIdInput: v,
    documentSearch: b,
    participantsContainer: se,
    addParticipantBtn: le,
    fieldDefinitionsContainer: Ne,
    fieldRulesContainer: _e,
    documentPageCountInput: U,
    fieldPlacementsJSONInput: nt,
    fieldRulesJSONInput: Ge,
    currentUserID: g,
    storageKey: k,
    draftsEndpoint: c,
    draftEndpointWithUserID: m,
    draftRequestHeaders: L,
    syncService: J,
    syncOrchestrator: K,
    stateManager: N,
    submitMode: y,
    totalWizardSteps: Jt,
    wizardStep: ot,
    getCurrentStep: () => Me.getCurrentStep(),
    getPlacementState: () => Be.getState(),
    getCurrentDocumentPageCount: V,
    ensureSelectedDocumentCompatibility: z,
    collectFieldRulesForState: vt,
    collectFieldRulesForForm: F,
    expandRulesForPreview: O,
    findSignersMissingRequiredSignatureField: We,
    missingSignatureFieldMessage: Ke,
    getSignerParticipants: Te,
    buildCanonicalAgreementPayload: yt,
    announceError: T,
    emitWizardTelemetry: Ue,
    parseAPIError: P,
    goToStep: (Y) => Me.goToStep(Y),
    surfaceSyncOutcome: B,
    getActiveTabDebugState: Q,
    addFieldBtn: qe
  }).bindEvents(), Ae;
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
function St(i) {
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
    trackFieldSave(a, l, d, p, h = null) {
      this.metrics.fieldSaveLatencies.push(p), d ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: a, error: h }), this.track(d ? "field_save_success" : "field_save_failed", {
        fieldId: a,
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
    trackSignatureAttach(a, l, d, p, h = null) {
      this.metrics.signatureAttachLatencies.push(p), this.track(d ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: a,
        signatureType: l,
        latency: p,
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
      r.overlayRenderFrameID = 0, N();
    }));
  }
  function g(a) {
    const l = r.fieldState.get(a);
    l && (delete l.previewValueText, delete l.previewValueBool, delete l.previewSignatureUrl);
  }
  function y() {
    r.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function w(a, l) {
    const d = r.fieldState.get(a);
    if (!d) return;
    const p = St(String(l || ""));
    if (!p) {
      delete d.previewValueText;
      return;
    }
    d.previewValueText = p, delete d.previewValueBool, delete d.previewSignatureUrl;
  }
  function R(a, l) {
    const d = r.fieldState.get(a);
    d && (d.previewValueBool = !!l, delete d.previewValueText, delete d.previewSignatureUrl);
  }
  function E(a, l) {
    const d = r.fieldState.get(a);
    if (!d) return;
    const p = String(l || "").trim();
    if (!p) {
      delete d.previewSignatureUrl;
      return;
    }
    d.previewSignatureUrl = p, delete d.previewValueText, delete d.previewValueBool;
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
      const d = a.page, p = this.getPageMetadata(d), h = l.offsetWidth, x = l.offsetHeight, A = a.pageWidth || p.width, W = a.pageHeight || p.height, te = h / A, Pe = x / W;
      let we = a.posX || 0, ke = a.posY || 0;
      n.viewer.origin === "bottom-left" && (ke = W - ke - (a.height || 30));
      const xt = we * te, Ct = ke * Pe, xe = (a.width || 150) * te, Ye = (a.height || 30) * Pe;
      return {
        left: xt,
        top: Ct,
        width: xe,
        height: Ye,
        // Store original values for debugging
        _debug: {
          sourceX: we,
          sourceY: ke,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: A,
          pageHeight: W,
          scaleX: te,
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
  }, L = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(a, l, d, p) {
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
            size_bytes: p
          })
        }
      );
      if (!h.ok)
        throw await yt(h, "Failed to get upload contract");
      const x = await h.json(), A = x?.contract || x;
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
      a.headers && Object.entries(a.headers).forEach(([x, A]) => {
        const W = String(x).toLowerCase();
        W === "x-esign-upload-token" || W === "x-esign-upload-key" || (p[x] = String(A));
      });
      const h = await fetch(d.toString(), {
        method: a.method || "PUT",
        headers: p,
        body: l,
        credentials: "omit"
      });
      if (!h.ok)
        throw await yt(h, `Upload failed: ${h.status} ${h.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [l, d] = a.split(","), p = l.match(/data:([^;]+)/), h = p ? p[1] : "image/png", x = atob(d), A = new Uint8Array(x.length);
      for (let W = 0; W < x.length; W++)
        A[W] = x.charCodeAt(W);
      return new Blob([A], { type: h });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, l) {
      const d = this.dataUrlToBlob(l), p = d.size, h = "image/png", x = await Re(d), A = await this.requestUploadBootstrap(
        a,
        x,
        h,
        p
      );
      return await this.uploadToSignedUrl(A, d), {
        uploadToken: A.upload_token,
        objectKey: A.object_key,
        sha256: A.sha256,
        contentType: A.content_type
      };
    }
  }, I = {
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
        const h = await d.json().catch(() => ({}));
        throw new Error(h?.error?.message || "Failed to load saved signatures");
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
        const x = await p.json().catch(() => ({})), A = new Error(x?.error?.message || "Failed to save signature");
        throw A.code = x?.error?.code || "", A;
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
    const l = r.fieldState.get(a);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function k(a) {
    return r.savedSignaturesByType.get(a) || [];
  }
  async function H(a, l = !1) {
    const d = C(a);
    if (!l && r.savedSignaturesByType.has(d)) {
      j(a);
      return;
    }
    const p = await I.list(d);
    r.savedSignaturesByType.set(d, p), j(a);
  }
  function j(a) {
    const l = C(a), d = k(l), p = document.getElementById("sig-saved-list");
    if (p) {
      if (!d.length) {
        p.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      p.innerHTML = d.map((h) => {
        const x = Tt(String(h?.thumbnail_data_url || h?.data_url || "")), A = Tt(String(h?.label || "Saved signature")), W = Tt(String(h?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${A}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${A}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Tt(a)}" data-signature-id="${W}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Tt(a)}" data-signature-id="${W}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function _(a) {
    const l = r.signatureCanvases.get(a), d = C(a);
    if (!l || !Z(a))
      throw new Error(`Please add your ${d === "initials" ? "initials" : "signature"} first`);
    const p = l.canvas.toDataURL("image/png"), h = await I.save(d, p, d === "initials" ? "Initials" : "Signature");
    if (!h)
      throw new Error("Failed to save signature");
    const x = k(d);
    x.unshift(h), r.savedSignaturesByType.set(d, x), j(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function X(a, l) {
    const d = C(a), h = k(d).find((A) => String(A?.id || "") === String(l));
    if (!h) return;
    requestAnimationFrame(() => vt(a)), await me(a);
    const x = String(h.data_url || h.thumbnail_data_url || "").trim();
    x && (await F(a, x, { clearStrokes: !0 }), E(a, x), f(), nt("draw", a), dt("Saved signature selected."));
  }
  async function $(a, l) {
    const d = C(a);
    await I.delete(l);
    const p = k(d).filter((h) => String(h?.id || "") !== String(l));
    r.savedSignaturesByType.set(d, p), j(a);
  }
  function ne(a) {
    const l = String(a?.code || "").trim(), d = String(a?.message || "Unable to update saved signatures"), p = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : d;
    window.toastManager && window.toastManager.error(p), dt(p, "assertive");
  }
  async function me(a, l = 8) {
    for (let d = 0; d < l; d++) {
      if (r.signatureCanvases.has(a)) return !0;
      await new Promise((p) => setTimeout(p, 40)), vt(a);
    }
    return !1;
  }
  async function ae(a, l) {
    const d = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(d))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => vt(a)), await me(a);
    const p = r.signatureCanvases.get(a);
    if (!p)
      throw new Error("Signature canvas is not ready");
    const h = await ce(l), x = d === "image/png" ? h : await ue(h, p.drawWidth, p.drawHeight);
    if (Ue(x) > ci)
      throw new Error(`Image exceeds ${Math.round(ci / 1024)}KB limit after conversion`);
    await F(a, x, { clearStrokes: !0 }), E(a, x), f();
    const W = document.getElementById("sig-upload-preview-wrap"), te = document.getElementById("sig-upload-preview");
    W && W.classList.remove("hidden"), te && te.setAttribute("src", x), dt("Signature image uploaded. You can now insert it.");
  }
  function ce(a) {
    return new Promise((l, d) => {
      const p = new FileReader();
      p.onload = () => l(String(p.result || "")), p.onerror = () => d(new Error("Unable to read image file")), p.readAsDataURL(a);
    });
  }
  function Ue(a) {
    const l = String(a || "").split(",");
    if (l.length < 2) return 0;
    const d = l[1] || "", p = (d.match(/=+$/) || [""])[0].length;
    return Math.floor(d.length * 3 / 4) - p;
  }
  async function ue(a, l, d) {
    return await new Promise((p, h) => {
      const x = new Image();
      x.onload = () => {
        const A = document.createElement("canvas"), W = Math.max(1, Math.round(Number(l) || 600)), te = Math.max(1, Math.round(Number(d) || 160));
        A.width = W, A.height = te;
        const Pe = A.getContext("2d");
        if (!Pe) {
          h(new Error("Unable to process image"));
          return;
        }
        Pe.clearRect(0, 0, W, te);
        const we = Math.min(W / x.width, te / x.height), ke = x.width * we, xt = x.height * we, Ct = (W - ke) / 2, xe = (te - xt) / 2;
        Pe.drawImage(x, Ct, xe, ke, xt), p(A.toDataURL("image/png"));
      }, x.onerror = () => h(new Error("Unable to decode image file")), x.src = a;
    });
  }
  async function Re(a) {
    if (window.crypto && window.crypto.subtle) {
      const l = await a.arrayBuffer(), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function ze() {
    document.addEventListener("click", (a) => {
      const l = a.target;
      if (!(l instanceof Element)) return;
      const d = l.closest("[data-esign-action]");
      if (!d) return;
      switch (d.getAttribute("data-esign-action")) {
        case "prev-page":
          K();
          break;
        case "next-page":
          he();
          break;
        case "zoom-out":
          v();
          break;
        case "zoom-in":
          be();
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
          h && U(h);
          break;
        }
        case "submit-signature":
          Bi();
          break;
        case "show-decline-modal":
          Oi();
          break;
        case "close-field-editor":
          lt();
          break;
        case "save-field-editor":
          $e();
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
          P();
          break;
        case "signature-tab": {
          const h = d.getAttribute("data-tab") || "draw", x = d.getAttribute("data-field-id");
          x && nt(h, x);
          break;
        }
        case "clear-signature-canvas": {
          const h = d.getAttribute("data-field-id");
          h && Ke(h);
          break;
        }
        case "undo-signature-canvas": {
          const h = d.getAttribute("data-field-id");
          h && ee(h);
          break;
        }
        case "redo-signature-canvas": {
          const h = d.getAttribute("data-field-id");
          h && re(h);
          break;
        }
        case "save-current-signature-library": {
          const h = d.getAttribute("data-field-id");
          h && _(h).catch(ne);
          break;
        }
        case "select-saved-signature": {
          const h = d.getAttribute("data-field-id"), x = d.getAttribute("data-signature-id");
          h && x && X(h, x).catch(ne);
          break;
        }
        case "delete-saved-signature": {
          const h = d.getAttribute("data-field-id"), x = d.getAttribute("data-signature-id");
          h && x && $(h, x).catch(ne);
          break;
        }
        case "clear-signer-profile":
          ye().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Dt.togglePanel();
          break;
        case "debug-copy-session":
          Dt.copySessionInfo();
          break;
        case "debug-clear-cache":
          Dt.clearCache();
          break;
        case "debug-show-telemetry":
          Dt.showTelemetry();
          break;
        case "debug-reload-viewer":
          Dt.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const l = a.target;
      if (l instanceof HTMLInputElement) {
        if (l.matches("#sig-upload-input")) {
          const d = l.getAttribute("data-field-id"), p = l.files?.[0];
          if (!d || !p) return;
          ae(d, p).catch((h) => {
            window.toastManager && window.toastManager.error(h?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (l.matches("#field-checkbox-input")) {
          const d = l.getAttribute("data-field-id") || r.activeFieldId;
          if (!d) return;
          R(d, l.checked), f();
        }
      }
    }), document.addEventListener("input", (a) => {
      const l = a.target;
      if (!(l instanceof HTMLInputElement) && !(l instanceof HTMLTextAreaElement)) return;
      const d = l.getAttribute("data-field-id") || r.activeFieldId;
      if (d) {
        if (l.matches("#sig-type-input")) {
          _e(d, l.value || "", { syncOverlay: !0 });
          return;
        }
        if (l.matches("#field-text-input")) {
          w(d, l.value || ""), f();
          return;
        }
        l.matches("#field-checkbox-input") && l instanceof HTMLInputElement && (R(d, l.checked), f());
      }
    });
  }
  De(async () => {
    ze(), r.isLowMemory = rt(), pe(), Be(), await Oe(), Je(), Ve(), Fn(), Nt(), await P(), N(), document.addEventListener("visibilitychange", je), "memory" in navigator && Fe(), Dt.init();
  });
  function je() {
    document.hidden && Ze();
  }
  function Ze() {
    const a = r.isLowMemory ? 1 : 2;
    for (; r.renderedPages.size > a; ) {
      let l = null, d = 1 / 0;
      if (r.renderedPages.forEach((p, h) => {
        h !== r.currentPage && p.timestamp < d && (l = h, d = p.timestamp);
      }), l !== null)
        r.renderedPages.delete(l);
      else
        break;
    }
  }
  function Fe() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        a / l > 0.8 && (r.isLowMemory = !0, Ze());
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
    const p = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), h = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (p !== "limited") {
      a.classList.add("hidden");
      return;
    }
    d.textContent = "Preview Compatibility Notice", l.textContent = String(n.viewer.compatibilityMessage || "").trim() || Le(h), a.classList.remove("hidden"), c.trackDegradedMode("pdf_preview_compatibility", { tier: p, reason: h });
  }
  function Be() {
    const a = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), d = document.getElementById("stage-state-title"), p = document.getElementById("stage-state-message"), h = document.getElementById("stage-state-meta");
    if (!a || !l || !d || !p || !h) return;
    const x = n.signerState || "active", A = n.recipientStage || 1, W = n.activeStage || 1, te = n.activeRecipientIds || [], Pe = n.waitingForRecipientIds || [];
    let we = {
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
    switch (x) {
      case "waiting":
        we = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: A > W ? `You are in signing stage ${A}. Stage ${W} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Pe.length > 0 && we.badges.push({
          icon: "iconoir-group",
          text: `${Pe.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        we = {
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
        we = {
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
        te.length > 1 ? (we.message = `You and ${te.length - 1} other signer(s) can sign now.`, we.badges = [
          { icon: "iconoir-users", text: `Stage ${W} active`, variant: "green" }
        ]) : A > 1 ? we.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${A}`, variant: "green" }
        ] : we.hidden = !0;
        break;
    }
    if (we.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${we.bgClass} ${we.borderClass}`, l.className = `${we.iconClass} mt-0.5`, d.className = `text-sm font-semibold ${we.titleClass}`, d.textContent = we.title, p.className = `text-xs ${we.messageClass} mt-1`, p.textContent = we.message, h.innerHTML = "", we.badges.forEach((ke) => {
      const xt = document.createElement("span"), Ct = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      xt.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${Ct[ke.variant] || Ct.blue}`, xt.innerHTML = `<i class="${ke.icon} mr-1"></i>${ke.text}`, h.appendChild(xt);
    });
  }
  function Je() {
    n.fields.forEach((a) => {
      let l = null, d = !1;
      if (a.type === "checkbox")
        l = a.value_bool || !1, d = l;
      else if (a.type === "date_signed")
        l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = !0;
      else {
        const p = String(a.value_text || "");
        l = p || st(a), d = !!p;
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
  async function Oe() {
    try {
      const a = await o.load(r.profileKey);
      a && (r.profileData = a, r.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function st(a) {
    const l = r.profileData;
    if (!l) return "";
    const d = String(a?.type || "").trim();
    return d === "name" ? St(l.fullName || "") : d === "initials" ? St(l.initials || "") || In(l.fullName || n.recipientName || "") : d === "signature" ? St(l.typedSignature || "") : "";
  }
  function oe(a) {
    return !n.profile.persistDrawnSignature || !r.profileData ? "" : a?.type === "initials" && String(r.profileData.drawnInitialsDataUrl || "").trim() || String(r.profileData.drawnSignatureDataUrl || "").trim();
  }
  function G(a) {
    const l = St(a?.value || "");
    return l || (r.profileData ? a?.type === "initials" ? St(r.profileData.initials || "") || In(r.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? St(r.profileData.typedSignature || "") : "" : "");
  }
  function de() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : r.profileRemember;
  }
  async function ye(a = !1) {
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
  async function it(a, l = {}) {
    const d = de();
    if (r.profileRemember = d, !d) {
      await ye(!0);
      return;
    }
    if (!a) return;
    const p = {
      remember: !0
    }, h = String(a.type || "");
    if (h === "name" && typeof a.value == "string") {
      const x = St(a.value);
      x && (p.fullName = x, (r.profileData?.initials || "").trim() || (p.initials = In(x)));
    }
    if (h === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const x = St(a.value);
        x && (p.initials = x);
      }
    }
    if (h === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const x = St(a.value);
        x && (p.typedSignature = x);
      }
    }
    if (!(Object.keys(p).length === 1 && p.remember === !0))
      try {
        const x = await o.save(r.profileKey, p);
        r.profileData = x;
      } catch {
      }
  }
  function Ve() {
    const a = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    a && l && a.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function rt() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function ht() {
    const a = r.isLowMemory ? 3 : r.maxCachedPages;
    if (r.renderedPages.size <= a) return;
    const l = [];
    for (r.renderedPages.forEach((d, p) => {
      const h = Math.abs(p - r.currentPage);
      l.push({ pageNum: p, distance: h });
    }), l.sort((d, p) => p.distance - d.distance); r.renderedPages.size > a && l.length > 0; ) {
      const d = l.shift();
      d && d.pageNum !== r.currentPage && r.renderedPages.delete(d.pageNum);
    }
  }
  function ct(a) {
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
        const l = await r.pdfDoc.getPage(a), d = r.zoomLevel, p = l.getViewport({ scale: d * window.devicePixelRatio }), h = document.createElement("canvas"), x = h.getContext("2d");
        h.width = p.width, h.height = p.height;
        const A = {
          canvasContext: x,
          viewport: p
        };
        await l.render(A).promise, r.renderedPages.set(a, {
          canvas: h,
          scale: d,
          timestamp: Date.now()
        }), ht();
      } catch (l) {
        console.warn("Preload failed for page", a, l);
      }
  }
  function Ie() {
    const a = window.devicePixelRatio || 1;
    return r.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function P() {
    const a = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const d = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!d.ok)
        throw new Error("Failed to load document");
      const h = (await d.json()).assets || {}, x = h.source_url || h.executed_url || h.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const A = pdfjsLib.getDocument(x);
      r.pdfDoc = await A.promise, n.pageCount = r.pdfDoc.numPages, document.getElementById("page-count").textContent = r.pdfDoc.numPages, await T(1), Ae(), c.trackViewerLoad(!0, Date.now() - l), c.trackPageView(1);
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
  async function T(a) {
    if (!r.pdfDoc) return;
    const l = r.renderedPages.get(a);
    if (l && l.scale === r.zoomLevel) {
      B(l), r.currentPage = a, document.getElementById("current-page").textContent = a, Ae(), N(), ct(a);
      return;
    }
    r.pageRendering = !0;
    try {
      const d = await r.pdfDoc.getPage(a), p = r.zoomLevel, h = Ie(), x = d.getViewport({ scale: p * h }), A = d.getViewport({ scale: 1 });
      m.setPageViewport(a, {
        width: A.width,
        height: A.height,
        rotation: A.rotation || 0
      });
      const W = document.getElementById("pdf-page-1");
      W.innerHTML = "";
      const te = document.createElement("canvas"), Pe = te.getContext("2d");
      te.height = x.height, te.width = x.width, te.style.width = `${x.width / h}px`, te.style.height = `${x.height / h}px`, W.appendChild(te);
      const we = document.getElementById("pdf-container");
      we.style.width = `${x.width / h}px`;
      const ke = {
        canvasContext: Pe,
        viewport: x
      };
      await d.render(ke).promise, r.renderedPages.set(a, {
        canvas: te.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: x.width / h,
        displayHeight: x.height / h
      }), r.renderedPages.get(a).canvas.getContext("2d").drawImage(te, 0, 0), ht(), r.currentPage = a, document.getElementById("current-page").textContent = a, Ae(), N(), c.trackPageView(a), ct(a);
    } catch (d) {
      console.error("Page render error:", d);
    } finally {
      if (r.pageRendering = !1, r.pageNumPending !== null) {
        const d = r.pageNumPending;
        r.pageNumPending = null, await T(d);
      }
    }
  }
  function B(a, l) {
    const d = document.getElementById("pdf-page-1");
    d.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = a.canvas.width, p.height = a.canvas.height, p.style.width = `${a.displayWidth}px`, p.style.height = `${a.displayHeight}px`, p.getContext("2d").drawImage(a.canvas, 0, 0), d.appendChild(p);
    const x = document.getElementById("pdf-container");
    x.style.width = `${a.displayWidth}px`;
  }
  function Q(a) {
    r.pageRendering ? r.pageNumPending = a : T(a);
  }
  function ie(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? St(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? St(a.value) : "";
  }
  function ge(a, l, d, p = !1) {
    const h = document.createElement("img");
    h.className = "field-overlay-preview", h.src = l, h.alt = d, a.appendChild(h), a.classList.add("has-preview"), p && a.classList.add("draft-preview");
  }
  function ve(a, l, d = !1, p = !1) {
    const h = document.createElement("span");
    h.className = "field-overlay-value", d && h.classList.add("font-signature"), h.textContent = l, a.appendChild(h), a.classList.add("has-value"), p && a.classList.add("draft-preview");
  }
  function Ce(a, l) {
    const d = document.createElement("span");
    d.className = "field-overlay-label", d.textContent = l, a.appendChild(d);
  }
  function N() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    r.fieldState.forEach((d, p) => {
      if (d.page !== r.currentPage) return;
      const h = document.createElement("div");
      if (h.className = "field-overlay", h.dataset.fieldId = p, d.required && h.classList.add("required"), d.completed && h.classList.add("completed"), r.activeFieldId === p && h.classList.add("active"), d.posX != null && d.posY != null && d.width != null && d.height != null) {
        const ke = m.getOverlayStyles(d, l);
        h.style.left = ke.left, h.style.top = ke.top, h.style.width = ke.width, h.style.height = ke.height, h.style.transform = ke.transform, Dt.enabled && (h.dataset.debugCoords = JSON.stringify(
          m.pageToScreen(d, l)._debug
        ));
      } else {
        const ke = Array.from(r.fieldState.keys()).indexOf(p);
        h.style.left = "10px", h.style.top = `${100 + ke * 50}px`, h.style.width = "150px", h.style.height = "30px";
      }
      const A = String(d.previewSignatureUrl || "").trim(), W = String(d.signaturePreviewUrl || "").trim(), te = ie(d), Pe = d.type === "signature" || d.type === "initials", we = typeof d.previewValueBool == "boolean";
      if (A)
        ge(h, A, J(d.type), !0);
      else if (d.completed && W)
        ge(h, W, J(d.type));
      else if (te) {
        const ke = typeof d.previewValueText == "string" && d.previewValueText.trim() !== "";
        ve(h, te, Pe, ke);
      } else d.type === "checkbox" && (we ? d.previewValueBool : !!d.value) ? ve(h, "Checked", !1, we) : Ce(h, J(d.type));
      h.setAttribute("tabindex", "0"), h.setAttribute("role", "button"), h.setAttribute("aria-label", `${J(d.type)} field${d.required ? ", required" : ""}${d.completed ? ", completed" : ""}`), h.addEventListener("click", () => U(p)), h.addEventListener("keydown", (ke) => {
        (ke.key === "Enter" || ke.key === " ") && (ke.preventDefault(), U(p));
      }), a.appendChild(h);
    });
  }
  function J(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function K() {
    r.currentPage <= 1 || Q(r.currentPage - 1);
  }
  function he() {
    r.currentPage >= n.pageCount || Q(r.currentPage + 1);
  }
  function Se(a) {
    a < 1 || a > n.pageCount || Q(a);
  }
  function Ae() {
    document.getElementById("prev-page-btn").disabled = r.currentPage <= 1, document.getElementById("next-page-btn").disabled = r.currentPage >= n.pageCount;
  }
  function be() {
    r.zoomLevel = Math.min(r.zoomLevel + 0.25, 3), S(), Q(r.currentPage);
  }
  function v() {
    r.zoomLevel = Math.max(r.zoomLevel - 0.25, 0.5), S(), Q(r.currentPage);
  }
  function b() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, d = 612;
    r.zoomLevel = l / d, S(), Q(r.currentPage);
  }
  function S() {
    document.getElementById("zoom-level").textContent = `${Math.round(r.zoomLevel * 100)}%`;
  }
  function U(a) {
    if (!r.hasConsented && n.fields.some((l) => l.id === a && l.type !== "date_signed")) {
      On();
      return;
    }
    z(a, { openEditor: !0 });
  }
  function z(a, l = { openEditor: !0 }) {
    const d = r.fieldState.get(a);
    if (d) {
      if (l.openEditor && (r.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), d.page !== r.currentPage && Se(d.page), !l.openEditor) {
        V(a);
        return;
      }
      d.type !== "date_signed" && se(a);
    }
  }
  function V(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function se(a) {
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), h = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    h.textContent = le(l.type), p.innerHTML = Te(l), x?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && Ge(a), d.classList.add("active"), d.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", gn(d.querySelector(".field-editor")), dt(`Editing ${le(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const A = p.querySelector("input, textarea");
      A ? A.focus() : p.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Me(r.writeCooldownUntil) > 0 && wt(Me(r.writeCooldownUntil));
  }
  function le(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function Te(a) {
    const l = Ne(a.type), d = Tt(String(a?.id || "")), p = Tt(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const h = a.type === "initials" ? "initials" : "signature", x = Tt(G(a)), A = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], W = qe(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${A.map((te) => `
            <button
              type="button"
              id="sig-tab-${te.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${W === te.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${te.id}"
              data-esign-action="signature-tab"
              data-field-id="${d}"
              role="tab"
              aria-selected="${W === te.id ? "true" : "false"}"
              aria-controls="sig-editor-${te.id}"
              tabindex="${W === te.id ? "0" : "-1"}"
            >
              ${te.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${W === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${h}"
              value="${x}"
              data-field-id="${d}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${d}">${x}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${h} will appear as your ${p}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${W === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
          <div id="sig-editor-upload" class="sig-editor-panel ${W === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${W === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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
          value="${Tt(String(a.value || ""))}"
          data-field-id="${d}"
        />
        ${l}
      `;
    if (a.type === "text") {
      const h = Tt(String(a.value || ""));
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
  function Ne(a) {
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
  function _e(a, l, d = { syncOverlay: !1 }) {
    const p = document.getElementById("sig-type-preview"), h = r.fieldState.get(a);
    if (!h) return;
    const x = St(String(l || "").trim());
    if (d?.syncOverlay && (x ? w(a, x) : g(a), f()), !!p) {
      if (x) {
        p.textContent = x;
        return;
      }
      p.textContent = h.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function qe(a) {
    const l = String(r.signatureTabByField.get(a) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function nt(a, l) {
    const d = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    r.signatureTabByField.set(l, d), document.querySelectorAll(".sig-editor-tab").forEach((h) => {
      h.classList.remove("border-blue-600", "text-blue-600"), h.classList.add("border-transparent", "text-gray-500"), h.setAttribute("aria-selected", "false"), h.setAttribute("tabindex", "-1");
    });
    const p = document.querySelector(`.sig-editor-tab[data-tab="${d}"]`);
    if (p?.classList.add("border-blue-600", "text-blue-600"), p?.classList.remove("border-transparent", "text-gray-500"), p?.setAttribute("aria-selected", "true"), p?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", d !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", d !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", d !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", d !== "saved"), (d === "draw" || d === "upload" || d === "saved") && p && requestAnimationFrame(() => vt(l)), d === "type") {
      const h = document.getElementById("sig-type-input");
      _e(l, h?.value || "");
    }
    d === "saved" && H(l).catch(ne);
  }
  function Ge(a) {
    r.signatureTabByField.set(a, "draw"), nt("draw", a);
    const l = document.getElementById("sig-type-input");
    l && _e(a, l.value || "");
  }
  function vt(a) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || r.signatureCanvases.has(a)) return;
    const d = l.closest(".signature-canvas-container"), p = l.getContext("2d");
    if (!p) return;
    const h = l.getBoundingClientRect();
    if (!h.width || !h.height) return;
    const x = window.devicePixelRatio || 1;
    l.width = h.width * x, l.height = h.height * x, p.scale(x, x), p.lineCap = "round", p.lineJoin = "round", p.strokeStyle = "#1f2937", p.lineWidth = 2.5;
    let A = !1, W = 0, te = 0, Pe = [];
    const we = (xe) => {
      const Ye = l.getBoundingClientRect();
      let Mt, Rt;
      return xe.touches && xe.touches.length > 0 ? (Mt = xe.touches[0].clientX, Rt = xe.touches[0].clientY) : xe.changedTouches && xe.changedTouches.length > 0 ? (Mt = xe.changedTouches[0].clientX, Rt = xe.changedTouches[0].clientY) : (Mt = xe.clientX, Rt = xe.clientY), {
        x: Mt - Ye.left,
        y: Rt - Ye.top,
        timestamp: Date.now()
      };
    }, ke = (xe) => {
      A = !0;
      const Ye = we(xe);
      W = Ye.x, te = Ye.y, Pe = [{ x: Ye.x, y: Ye.y, t: Ye.timestamp, width: 2.5 }], d && d.classList.add("drawing");
    }, xt = (xe) => {
      if (!A) return;
      const Ye = we(xe);
      Pe.push({ x: Ye.x, y: Ye.y, t: Ye.timestamp, width: 2.5 });
      const Mt = Ye.x - W, Rt = Ye.y - te, ji = Ye.timestamp - (Pe[Pe.length - 2]?.t || Ye.timestamp), qi = Math.sqrt(Mt * Mt + Rt * Rt) / Math.max(ji, 1), Vi = 2.5, Gi = 1.5, Wi = 4, Ki = Math.min(qi / 5, 1), zn = Math.max(Gi, Math.min(Wi, Vi - Ki * 1.5));
      Pe[Pe.length - 1].width = zn, p.lineWidth = zn, p.beginPath(), p.moveTo(W, te), p.lineTo(Ye.x, Ye.y), p.stroke(), W = Ye.x, te = Ye.y;
    }, Ct = () => {
      if (A = !1, Pe.length > 1) {
        const xe = r.signatureCanvases.get(a);
        xe && (xe.strokes.push(Pe.map((Ye) => ({ ...Ye }))), xe.redoStack = []), We(a);
      }
      Pe = [], d && d.classList.remove("drawing");
    };
    l.addEventListener("mousedown", ke), l.addEventListener("mousemove", xt), l.addEventListener("mouseup", Ct), l.addEventListener("mouseout", Ct), l.addEventListener("touchstart", (xe) => {
      xe.preventDefault(), xe.stopPropagation(), ke(xe);
    }, { passive: !1 }), l.addEventListener("touchmove", (xe) => {
      xe.preventDefault(), xe.stopPropagation(), xt(xe);
    }, { passive: !1 }), l.addEventListener("touchend", (xe) => {
      xe.preventDefault(), Ct();
    }, { passive: !1 }), l.addEventListener("touchcancel", Ct), l.addEventListener("gesturestart", (xe) => xe.preventDefault()), l.addEventListener("gesturechange", (xe) => xe.preventDefault()), l.addEventListener("gestureend", (xe) => xe.preventDefault()), r.signatureCanvases.set(a, {
      canvas: l,
      ctx: p,
      dpr: x,
      drawWidth: h.width,
      drawHeight: h.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), D(a);
  }
  function D(a) {
    const l = r.signatureCanvases.get(a), d = r.fieldState.get(a);
    if (!l || !d) return;
    const p = oe(d);
    p && F(a, p, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function F(a, l, d = { clearStrokes: !1 }) {
    const p = r.signatureCanvases.get(a);
    if (!p) return !1;
    const h = String(l || "").trim();
    if (!h)
      return p.baseImageDataUrl = "", p.baseImage = null, d.clearStrokes && (p.strokes = [], p.redoStack = []), O(a), !0;
    const { drawWidth: x, drawHeight: A } = p, W = new Image();
    return await new Promise((te) => {
      W.onload = () => {
        d.clearStrokes && (p.strokes = [], p.redoStack = []), p.baseImage = W, p.baseImageDataUrl = h, x > 0 && A > 0 && O(a), te(!0);
      }, W.onerror = () => te(!1), W.src = h;
    });
  }
  function O(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return;
    const { ctx: d, drawWidth: p, drawHeight: h, baseImage: x, strokes: A } = l;
    if (d.clearRect(0, 0, p, h), x) {
      const W = Math.min(p / x.width, h / x.height), te = x.width * W, Pe = x.height * W, we = (p - te) / 2, ke = (h - Pe) / 2;
      d.drawImage(x, we, ke, te, Pe);
    }
    for (const W of A)
      for (let te = 1; te < W.length; te++) {
        const Pe = W[te - 1], we = W[te];
        d.lineWidth = Number(we.width || 2.5) || 2.5, d.beginPath(), d.moveTo(Pe.x, Pe.y), d.lineTo(we.x, we.y), d.stroke();
      }
  }
  function ee(a) {
    const l = r.signatureCanvases.get(a);
    if (!l || l.strokes.length === 0) return;
    const d = l.strokes.pop();
    d && l.redoStack.push(d), O(a), We(a);
  }
  function re(a) {
    const l = r.signatureCanvases.get(a);
    if (!l || l.redoStack.length === 0) return;
    const d = l.redoStack.pop();
    d && l.strokes.push(d), O(a), We(a);
  }
  function Z(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: d, ctx: p } = l;
    return p.getImageData(0, 0, d.width, d.height).data.some((x, A) => A % 4 === 3 && x > 0);
  }
  function We(a) {
    const l = r.signatureCanvases.get(a);
    l && (Z(a) ? E(a, l.canvas.toDataURL("image/png")) : g(a), f());
  }
  function Ke(a) {
    const l = r.signatureCanvases.get(a);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", O(a)), g(a), f();
    const d = document.getElementById("sig-upload-preview-wrap"), p = document.getElementById("sig-upload-preview");
    d && d.classList.add("hidden"), p && p.removeAttribute("src");
  }
  function lt() {
    const a = document.getElementById("field-editor-overlay"), l = a.querySelector(".field-editor");
    if (mn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", r.activeFieldId) {
      const d = document.querySelector(`.field-list-item[data-field-id="${r.activeFieldId}"]`);
      requestAnimationFrame(() => {
        d?.focus();
      });
    }
    y(), f(), r.activeFieldId = null, r.signatureCanvases.clear(), dt("Field editor closed.");
  }
  function Me(a) {
    const l = Number(a) || 0;
    return l <= 0 ? 0 : Math.max(0, Math.ceil((l - Date.now()) / 1e3));
  }
  function et(a, l = {}) {
    const d = Number(l.retry_after_seconds);
    if (Number.isFinite(d) && d > 0)
      return Math.ceil(d);
    const p = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!p) return 0;
    const h = Number(p);
    return Number.isFinite(h) && h > 0 ? Math.ceil(h) : 0;
  }
  async function yt(a, l) {
    let d = {};
    try {
      d = await a.json();
    } catch {
      d = {};
    }
    const p = d?.error || {}, h = p?.details && typeof p.details == "object" ? p.details : {}, x = et(a, h), A = a?.status === 429, W = A ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(p?.message || l || "Request failed"), te = new Error(W);
    return te.status = a?.status || 0, te.code = String(p?.code || ""), te.details = h, te.rateLimited = A, te.retryAfterSeconds = x, te;
  }
  function wt(a) {
    const l = Math.max(1, Number(a) || 1);
    r.writeCooldownUntil = Date.now() + l * 1e3, r.writeCooldownTimer && (clearInterval(r.writeCooldownTimer), r.writeCooldownTimer = null);
    const d = () => {
      const p = document.getElementById("field-editor-save");
      if (!p) return;
      const h = Me(r.writeCooldownUntil);
      if (h <= 0) {
        r.pendingSaves.has(r.activeFieldId || "") || (p.disabled = !1, p.innerHTML = "Insert"), r.writeCooldownTimer && (clearInterval(r.writeCooldownTimer), r.writeCooldownTimer = null);
        return;
      }
      p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${h}s`;
    };
    d(), r.writeCooldownTimer = setInterval(d, 250);
  }
  function Y(a) {
    const l = Math.max(1, Number(a) || 1);
    r.submitCooldownUntil = Date.now() + l * 1e3, r.submitCooldownTimer && (clearInterval(r.submitCooldownTimer), r.submitCooldownTimer = null);
    const d = () => {
      const p = Me(r.submitCooldownUntil);
      Nt(), p <= 0 && r.submitCooldownTimer && (clearInterval(r.submitCooldownTimer), r.submitCooldownTimer = null);
    };
    d(), r.submitCooldownTimer = setInterval(d, 250);
  }
  async function $e() {
    const a = r.activeFieldId;
    if (!a) return;
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = Me(r.writeCooldownUntil);
    if (d > 0) {
      const h = `Please wait ${d}s before saving again.`;
      window.toastManager && window.toastManager.error(h), dt(h, "assertive");
      return;
    }
    const p = document.getElementById("field-editor-save");
    p.disabled = !0, p.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      r.profileRemember = de();
      let h = !1;
      if (l.type === "signature" || l.type === "initials")
        h = await pt(a);
      else if (l.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        h = await At(a, null, x?.checked || !1);
      } else {
        const A = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!A && l.required)
          throw new Error("This field is required");
        h = await At(a, A, null);
      }
      if (h) {
        lt(), Fn(), Nt(), Un(), N(), Mi(a), $i(a);
        const x = Hn();
        x.allRequiredComplete ? dt("Field saved. All required fields complete. Ready to submit.") : dt(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (h) {
      h?.rateLimited && wt(h.retryAfterSeconds), window.toastManager && window.toastManager.error(h.message), dt(`Error saving field: ${h.message}`, "assertive");
    } finally {
      if (Me(r.writeCooldownUntil) > 0) {
        const h = Me(r.writeCooldownUntil);
        p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${h}s`;
      } else
        p.disabled = !1, p.innerHTML = "Insert";
    }
  }
  async function pt(a) {
    const l = r.fieldState.get(a), d = document.getElementById("sig-type-input"), p = qe(a);
    if (p === "draw" || p === "upload" || p === "saved") {
      const x = r.signatureCanvases.get(a);
      if (!x) return !1;
      if (!Z(a))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const A = x.canvas.toDataURL("image/png");
      return await $n(a, { type: "drawn", dataUrl: A }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = d?.value?.trim();
      if (!x)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await At(a, x, null) : await $n(a, { type: "typed", text: x }, x);
    }
  }
  async function At(a, l, d) {
    r.pendingSaves.add(a);
    const p = Date.now(), h = r.fieldState.get(a);
    try {
      const x = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: a,
          value_text: l,
          value_bool: d
        })
      });
      if (!x.ok)
        throw await yt(x, "Failed to save field");
      const A = r.fieldState.get(a);
      return A && (A.value = l ?? d, A.completed = !0, A.hasError = !1), await it(A), window.toastManager && window.toastManager.success("Field saved"), c.trackFieldSave(a, A?.type, !0, Date.now() - p), !0;
    } catch (x) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = x.message), c.trackFieldSave(a, h?.type, !1, Date.now() - p, x.message), x;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function $n(a, l, d) {
    r.pendingSaves.add(a);
    const p = Date.now(), h = l?.type || "typed";
    try {
      let x;
      if (h === "drawn") {
        const te = await L.uploadDrawnSignature(
          a,
          l.dataUrl
        );
        x = {
          field_instance_id: a,
          type: "drawn",
          value_text: d,
          object_key: te.objectKey,
          sha256: te.sha256,
          upload_token: te.uploadToken
        };
      } else
        x = await ki(a, d);
      const A = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!A.ok)
        throw await yt(A, "Failed to save signature");
      const W = r.fieldState.get(a);
      return W && (W.value = d, W.completed = !0, W.hasError = !1, l?.dataUrl && (W.signaturePreviewUrl = l.dataUrl)), await it(W, {
        signatureType: h,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), c.trackSignatureAttach(a, h, !0, Date.now() - p), !0;
    } catch (x) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = x.message), c.trackSignatureAttach(a, h, !1, Date.now() - p, x.message), x;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function ki(a, l) {
    const d = `${l}|${a}`, p = await Di(d), h = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: l,
      object_key: h,
      sha256: p
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Di(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const l = new TextEncoder().encode(a), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Fn() {
    let a = 0;
    r.fieldState.forEach((W) => {
      W.required, W.completed && a++;
    });
    const l = r.fieldState.size, d = l > 0 ? a / l * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = l;
    const p = document.getElementById("progress-ring-circle"), h = 97.4, x = h - d / 100 * h;
    p.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${d}%`;
    const A = l - a;
    document.getElementById("fields-status").textContent = A > 0 ? `${A} remaining` : "All complete";
  }
  function Nt() {
    const a = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), d = document.getElementById("incomplete-message"), p = Me(r.submitCooldownUntil);
    let h = [], x = !1;
    r.fieldState.forEach((W, te) => {
      W.required && !W.completed && h.push(W), W.hasError && (x = !0);
    });
    const A = r.hasConsented && h.length === 0 && !x && r.pendingSaves.size === 0 && p === 0 && !r.isSubmitting;
    a.disabled = !A, !r.isSubmitting && p > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s` : !r.isSubmitting && p === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), r.hasConsented ? p > 0 ? (l.classList.remove("hidden"), d.textContent = `Please wait ${p}s before submitting again.`) : x ? (l.classList.remove("hidden"), d.textContent = "Some fields failed to save. Please retry.") : h.length > 0 ? (l.classList.remove("hidden"), d.textContent = `Complete ${h.length} required field${h.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), d.textContent = "Please accept the consent agreement");
  }
  function Mi(a) {
    const l = r.fieldState.get(a), d = document.querySelector(`.field-list-item[data-field-id="${a}"]`);
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
  function Ri() {
    const a = Array.from(r.fieldState.values()).filter((l) => l.required);
    return a.sort((l, d) => {
      const p = Number(l.page || 0), h = Number(d.page || 0);
      if (p !== h) return p - h;
      const x = Number(l.tabIndex || 0), A = Number(d.tabIndex || 0);
      if (x > 0 && A > 0 && x !== A) return x - A;
      if (x > 0 != A > 0) return x > 0 ? -1 : 1;
      const W = Number(l.posY || 0), te = Number(d.posY || 0);
      if (W !== te) return W - te;
      const Pe = Number(l.posX || 0), we = Number(d.posX || 0);
      return Pe !== we ? Pe - we : String(l.id || "").localeCompare(String(d.id || ""));
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
      A?.scrollIntoView({ behavior: "smooth", block: "nearest" }), A?.focus(), dt("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const p = l.findIndex((A) => String(A.id) === String(a));
    let h = null;
    if (p >= 0) {
      for (let A = p + 1; A < l.length; A++)
        if (!l[A].completed) {
          h = l[A];
          break;
        }
    }
    if (h || (h = d[0]), !h) return;
    c.track("guided_next_started", { fromFieldId: a, toFieldId: h.id });
    const x = Number(h.page || 1);
    x !== r.currentPage && Se(x), z(h.id, { openEditor: !1 }), Bn(h.id), setTimeout(() => {
      Bn(h.id), V(h.id), c.track("guided_next_completed", { toFieldId: h.id, page: h.page }), dt(`Next required field highlighted on page ${h.page}.`);
    }, 120);
  }
  function On() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", gn(a.querySelector(".field-editor")), dt("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function pn() {
    const a = document.getElementById("consent-modal"), l = a.querySelector(".field-editor");
    mn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", dt("Consent dialog closed.");
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
        throw await yt(l, "Failed to accept consent");
      r.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), pn(), Nt(), Un(), c.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), dt("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), dt(`Error: ${l.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function Bi() {
    const a = document.getElementById("submit-btn"), l = Me(r.submitCooldownUntil);
    if (l > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${l}s before submitting again.`), Nt();
      return;
    }
    r.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const d = `submit-${n.recipientId}-${Date.now()}`, p = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": d }
      });
      if (!p.ok)
        throw await yt(p, "Failed to submit");
      c.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (d) {
      c.trackSubmit(!1, d.message), d?.rateLimited && Y(d.retryAfterSeconds), window.toastManager && window.toastManager.error(d.message);
    } finally {
      r.isSubmitting = !1, Nt();
    }
  }
  function Oi() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", gn(a.querySelector(".field-editor")), dt("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Nn() {
    const a = document.getElementById("decline-modal"), l = a.querySelector(".field-editor");
    mn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", dt("Decline dialog closed.");
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
        throw await yt(l, "Failed to decline");
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
      const d = (await a.json()).assets || {}, p = d.source_url || d.executed_url || d.certificate_url;
      if (p)
        window.open(p, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (a) {
      window.toastManager && window.toastManager.error(a.message || "Unable to download document");
    }
  }
  const Dt = {
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
      a?.forEach((p) => {
        p.completed && l++;
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
          console.log("[E-Sign Debug] Reloading viewer..."), P();
        },
        setLowMemory: (a) => {
          r.isLowMemory = a, ht(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), P(), this.updatePanel();
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
  function dt(a, l = "polite") {
    const d = l === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    d && (d.textContent = "", requestAnimationFrame(() => {
      d.textContent = a;
    }));
  }
  function gn(a) {
    const d = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), p = d[0], h = d[d.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function x(A) {
      A.key === "Tab" && (A.shiftKey ? document.activeElement === p && (A.preventDefault(), h?.focus()) : document.activeElement === h && (A.preventDefault(), p?.focus()));
    }
    a.addEventListener("keydown", x), a._focusTrapHandler = x, requestAnimationFrame(() => {
      p?.focus();
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
    return r.fieldState.forEach((p) => {
      p.required && l++, p.completed && a++, p.required && !p.completed && d++;
    }), {
      completed: a,
      required: l,
      remainingRequired: d,
      total: r.fieldState.size,
      allRequiredComplete: d === 0
    };
  }
  function zi(a, l = 1) {
    const d = Array.from(r.fieldState.keys()), p = d.indexOf(a);
    if (p === -1) return null;
    const h = p + l;
    return h >= 0 && h < d.length ? d[h] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (lt(), pn(), Nn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), d = l.indexOf(a.target);
      if (d !== -1) {
        let p = d;
        if (a.key === "ArrowRight" && (p = (d + 1) % l.length), a.key === "ArrowLeft" && (p = (d - 1 + l.length) % l.length), a.key === "Home" && (p = 0), a.key === "End" && (p = l.length - 1), p !== d) {
          a.preventDefault();
          const h = l[p], x = h.getAttribute("data-tab") || "draw", A = h.getAttribute("data-field-id");
          A && nt(x, A), h.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const l = a.target.dataset.fieldId, d = a.key === "ArrowDown" ? 1 : -1, p = zi(l, d);
        p && document.querySelector(`.field-list-item[data-field-id="${p}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const l = a.target.dataset.fieldId;
        l && U(l);
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
    Ot('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Ot('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
    e && M(e), t && q(t), n && M(n), s && M(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && M(e), t && M(t), n && M(n), s && q(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: o, viewer: c } = this.elements;
    t && M(t), n && M(n), s && q(s), c && M(c), o && (o.textContent = e);
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
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, o = Ur(i), c = zt(i), r = $r(i), f = c ? "cursor-pointer hover:bg-gray-50" : r ? "cursor-pointer hover:bg-blue-50" : "opacity-60", g = c ? `data-folder-id="${i.id}" data-folder-name="${jt(i.name)}"` : r && t ? `data-file-id="${i.id}" data-file-name="${jt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${f} file-item"
      ${g}
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
  mt as announce,
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
  M as hide,
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
  Ot as qsa,
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
  q as show,
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

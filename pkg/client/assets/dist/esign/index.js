import { a as St } from "../chunks/html-Br-oQr7i.js";
class Oi {
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
      throw new Ni(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Ni extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let vn = null;
function _r() {
  if (!vn)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return vn;
}
function zi(i) {
  vn = i;
}
function ji(i) {
  const e = new Oi(i);
  return zi(e), e;
}
function Gt(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Dr(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Kt(i, e) {
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
function Mr(i, e) {
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
function Rr(i, e) {
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
function $r(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), o = Math.round(s / 60), c = Math.round(o / 60), r = Math.round(c / 24), h = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(r) >= 1 ? h.format(r, "day") : Math.abs(c) >= 1 ? h.format(c, "hour") : Math.abs(o) >= 1 ? h.format(o, "minute") : h.format(s, "second");
  } catch {
    return String(i);
  }
}
function Fr(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function qi(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function Br(i) {
  return i ? i.split("_").map((e) => qi(e)).join(" ") : "";
}
function Ur(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const Vi = {
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
function ti(i) {
  const e = String(i || "").trim().toLowerCase();
  return Vi[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Gi(i, e) {
  const t = ti(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, c = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${o[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${c}${t.label}</span>`;
}
function Hr(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = Gi(i, e), t.firstElementChild;
}
function Or(i, e, t) {
  const n = ti(e), s = t?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${o[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const h = i.querySelector(".rounded-full");
    if (h)
      h.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
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
function kt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function Nr(i) {
  return document.getElementById(i);
}
function Wi(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, o] of Object.entries(e))
      o !== void 0 && n.setAttribute(s, o);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function zr(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function jr(i, e, t, n, s) {
  const o = (c) => {
    const r = c.target.closest(e);
    r && i.contains(r) && n.call(r, c, r);
  };
  return i.addEventListener(t, o, s), () => i.removeEventListener(t, o, s);
}
function Te(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function j(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function k(i) {
  i && i.classList.add("hidden");
}
function qr(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? j(i) : k(i);
}
function Vr(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Bt(i, e, t = document) {
  const n = u(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function Gr(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Bt(t, n, e);
}
function Ji(i = "[data-esign-page]", e = "data-esign-config") {
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
function lt(i, e = "polite") {
  const t = u(`[aria-live="${e}"]`) || (() => {
    const n = Wi("div", {
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
async function Wr(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: o = 30,
    onProgress: c,
    signal: r
  } = i, h = Date.now();
  let g = 0, b;
  for (; g < o; ) {
    if (r?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - h >= s)
      return {
        result: b,
        attempts: g,
        stopped: !1,
        timedOut: !0
      };
    if (g++, b = await e(), c && c(b, g), t(b))
      return {
        result: b,
        attempts: g,
        stopped: !0,
        timedOut: !1
      };
    await ni(n, r);
  }
  return {
    result: b,
    attempts: g,
    stopped: !1,
    timedOut: !1
  };
}
async function Jr(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: o = !0,
    shouldRetry: c = () => !0,
    onRetry: r,
    signal: h
  } = i;
  let g;
  for (let b = 1; b <= t; b++) {
    if (h?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (x) {
      if (g = x, b >= t || !c(x, b))
        throw x;
      const D = o ? Math.min(n * Math.pow(2, b - 1), s) : n;
      r && r(x, b, D), await ni(D, h);
    }
  }
  throw g;
}
function ni(i, e) {
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
function Xt(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function Yr(i, e) {
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
function Kr(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Xr(i, e, t = "Operation timed out") {
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
class xn {
  constructor(e) {
    this.config = e, this.client = ji({
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
    Bt('count="draft"', e.draft), Bt('count="pending"', e.pending), Bt('count="completed"', e.completed), Bt('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Qr(i) {
  const e = i || Ji(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new xn(e);
  return Te(() => t.init()), t;
}
function Zr(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new xn(t);
  Te(() => n.init());
}
typeof document < "u" && Te(() => {
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
      new xn({ basePath: s, apiBasePath: o }).init();
    }
  }
});
class ii {
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
      s && (n === e ? j(s) : k(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = u("#artifact-executed"), n = u("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), j(t));
    }
    if (e.source) {
      const t = u("#artifact-source"), n = u("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), j(t));
    }
    if (e.certificate) {
      const t = u("#artifact-certificate"), n = u("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), j(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function ea(i) {
  const e = new ii(i);
  return Te(() => e.init()), e;
}
function ta(i) {
  const e = new ii(i);
  Te(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Yi(i = document) {
  kt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Gt(t));
  });
}
function Ki(i = document) {
  kt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Kt(t));
  });
}
function Xi(i = document) {
  Yi(i), Ki(i);
}
function Qi() {
  Te(() => {
    Xi();
  });
}
typeof document < "u" && Qi();
const Bn = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class si {
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
    switch (k(t), k(n), k(s), e) {
      case "loading":
        j(t);
        break;
      case "success":
        j(n);
        break;
      case "error":
        j(s);
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
    s && (s.textContent = Bn[e] || Bn.unknown), t && o && (o.textContent = t, j(o)), this.sendToOpener({
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
function na(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new si(e);
  return Te(() => t.init()), t;
}
function ia(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new si(e);
  Te(() => t.init());
}
const ln = "esign.google.account_id", Zi = {
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
class ri {
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
      disconnectConfirmBtn: h,
      accountIdInput: g,
      oauthModal: b,
      disconnectModal: x
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, x && j(x);
    }), r && r.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, x && k(x);
    }), h && h.addEventListener("click", () => this.disconnect()), c && c.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), g && (g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, !0);
    }), g.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(g.value, !0));
    }));
    const { accountDropdown: D, connectFirstBtn: C } = this.elements;
    D && D.addEventListener("change", () => {
      D.value === "__new__" ? (D.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(D.value, !0);
    }), C && C.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (b && !b.classList.contains("hidden") && this.cancelOAuthFlow(), x && !x.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, k(x)));
    }), [b, x].forEach((f) => {
      f && f.addEventListener("click", (L) => {
        const S = L.target;
        (S === f || S.getAttribute("aria-hidden") === "true") && (k(f), f === b ? this.cancelOAuthFlow() : f === x && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(ln)
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
      this.currentAccountId ? window.localStorage.setItem(ln, this.currentAccountId) : window.localStorage.removeItem(ln);
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
    t && (t.textContent = e), lt(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: o } = this.elements;
    switch (k(t), k(n), k(s), k(o), e) {
      case "loading":
        j(t);
        break;
      case "disconnected":
        j(n);
        break;
      case "connected":
        j(s);
        break;
      case "error":
        j(o);
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
    const t = (L, S) => {
      for (const y of L)
        if (Object.prototype.hasOwnProperty.call(e, y) && e[y] !== void 0 && e[y] !== null)
          return e[y];
      return S;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), o = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), c = t(["connected", "Connected"], !1), r = t(["degraded", "Degraded"], !1), h = t(["degraded_reason", "DegradedReason"], ""), g = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), b = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), x = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let D = t(["is_expired", "IsExpired"], void 0), C = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof D != "boolean" || typeof C != "boolean") && n) {
      const L = new Date(n);
      if (!Number.isNaN(L.getTime())) {
        const S = L.getTime() - Date.now(), y = 5 * 60 * 1e3;
        D = S <= 0, C = S > 0 && S <= y;
      }
    }
    const f = typeof x == "boolean" ? x : (D === !0 || C === !0) && !b;
    return {
      connected: c,
      account_id: o,
      email: g,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: D === !0,
      is_expiring_soon: C === !0,
      can_auto_refresh: b,
      needs_reauthorization: f,
      degraded: r,
      degraded_reason: h
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
        const s = Zi[n] || { label: n, description: "" };
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
    const { expiryInfo: c, reauthWarning: r, reauthReason: h } = this.elements;
    if (!c) return;
    if (c.classList.remove("text-red-600", "text-amber-600"), c.classList.add("text-gray-500"), !e) {
      c.textContent = "Access token status unknown", r && k(r);
      return;
    }
    const g = new Date(e), b = /* @__PURE__ */ new Date(), x = Math.max(
      1,
      Math.round((g.getTime() - b.getTime()) / (1e3 * 60))
    );
    t ? s ? (c.textContent = "Access token expired, but refresh is available and will be applied automatically.", c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), r && k(r)) : (c.textContent = "Access token has expired. Please re-authorize.", c.classList.remove("text-gray-500"), c.classList.add("text-red-600"), r && j(r), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), s ? (c.textContent = `Token expires in approximately ${x} minute${x !== 1 ? "s" : ""}. Refresh is available automatically.`, r && k(r)) : (c.textContent = `Token expires in approximately ${x} minute${x !== 1 ? "s" : ""}`, r && j(r), h && (h.textContent = `Your access token will expire in ${x} minute${x !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (c.textContent = `Token valid until ${g.toLocaleDateString()} ${g.toLocaleTimeString()}`, r && k(r)), !o && r && k(r);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (j(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : k(n));
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
      const h = o.email || c || "Default", g = o.status !== "connected" ? ` (${o.status})` : "";
      r.textContent = `${h}${g}`, c === this.currentAccountId && (r.selected = !0), e.appendChild(r);
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
    if (e && k(e), this.accounts.length === 0) {
      t && j(t), n && k(n);
      return;
    }
    t && k(t), n && (j(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, c = t ? "ring-2 ring-blue-500" : "", r = n[e.status] || "bg-white border-gray-200", h = s[e.status] || "bg-gray-100 text-gray-700", g = o[e.status] || e.status, b = e.account_id || "default", x = e.email || (e.account_id ? e.account_id : "Default account");
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(x)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(b)}</p>
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
        this.pendingDisconnectAccountId = r, t && j(t);
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
    t && j(t);
    const s = this.resolveOAuthRedirectURI(), o = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = o;
    const c = this.buildGoogleOAuthUrl(s, o);
    if (!c) {
      t && k(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const r = 500, h = 600, g = (window.screen.width - r) / 2, b = (window.screen.height - h) / 2;
    if (this.oauthWindow = window.open(
      c,
      "google_oauth",
      `width=${r},height=${h},left=${g},top=${b},popup=yes`
    ), !this.oauthWindow) {
      t && k(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (x) => this.handleOAuthCallback(x), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && k(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    if (this.cleanupOAuthFlow(), n && k(n), this.closeOAuthWindow(), t.error) {
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
          const h = await r.json();
          throw new Error(h.error?.message || "Failed to connect");
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
    e && k(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && k(e);
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
function sa(i) {
  const e = new ri(i);
  return Te(() => e.init()), e;
}
function ra(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new ri(e);
  Te(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const dn = "esign.google.account_id", Un = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Hn = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class ai {
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
      importConfirmBtn: h,
      importForm: g,
      importModal: b,
      viewListBtn: x,
      viewGridBtn: D
    } = this.elements;
    if (e) {
      const f = Xt(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (L) => {
        L.key === "Enter" && (L.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), c && c.addEventListener("click", () => this.clearSelection()), r && r.addEventListener("click", () => this.hideImportModal()), h && g && g.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), b && b.addEventListener("click", (f) => {
      const L = f.target;
      (L === b || L.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), x && x.addEventListener("click", () => this.setViewMode("list")), D && D.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && b && !b.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: C } = this.elements;
    C && C.addEventListener("click", (f) => this.handleFileListClick(f));
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
        window.localStorage.getItem(dn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, j(e)) : k(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(dn, this.currentAccountId) : window.localStorage.removeItem(dn);
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
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : r ? [r] : [], b = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: o,
      webViewLink: c,
      parents: g,
      owners: b,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && j(t));
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
      const r = await c.json(), h = Array.isArray(r.files) ? r.files.map((g) => this.normalizeDriveFile(g)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.nextPageToken = r.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), lt(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), lt("Error loading files");
    } finally {
      this.isLoading = !1, t && k(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && k(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Hn.includes(e.mimeType), s = this.selectedFile?.id === e.id, o = Un[e.mimeType] || Un.default, c = this.getFileIcon(o);
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
            ${Kt(e.modifiedTime)}
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), lt(`Selected: ${t.name}`));
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
      previewModified: h,
      importBtn: g,
      openInGoogleBtn: b
    } = this.elements;
    if (!this.selectedFile) {
      e && j(e), t && k(t);
      return;
    }
    e && k(e), t && j(t);
    const x = this.selectedFile, D = Hn.includes(x.mimeType);
    s && (s.textContent = x.name), o && (o.textContent = this.getMimeTypeLabel(x.mimeType)), c && (c.textContent = x.id), r && x.owners.length > 0 && (r.textContent = x.owners[0].emailAddress || "-"), h && (h.textContent = Kt(x.modifiedTime)), g && (D ? (g.removeAttribute("disabled"), g.classList.remove("opacity-50", "cursor-not-allowed")) : (g.setAttribute("disabled", "true"), g.classList.add("opacity-50", "cursor-not-allowed"))), b && x.webViewLink && (b.href = x.webViewLink);
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
      k(e), t && (t.textContent = "Search Results");
      return;
    }
    j(e);
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
    ).join(""), kt(".breadcrumb-item", s).forEach((o) => {
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
    e && (this.nextPageToken ? j(e) : k(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? j(t) : k(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && k(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    s && (s.value = ""), e && j(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && k(e);
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
    } = this.elements, c = this.selectedFile.id, r = s?.value.trim() || this.selectedFile.name, h = o?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && j(t), n && (n.textContent = "Importing...");
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
          agreement_title: h || void 0
        })
      });
      if (!g.ok) {
        const x = await g.json();
        throw new Error(x.error?.message || "Import failed");
      }
      const b = await g.json();
      this.showToast("Import started successfully", "success"), lt("Import started"), this.hideImportModal(), b.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${b.document.id}` : b.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${b.agreement.id}`);
    } catch (g) {
      console.error("Import error:", g);
      const b = g instanceof Error ? g.message : "Import failed";
      this.showToast(b, "error"), lt(`Error: ${b}`);
    } finally {
      e && e.removeAttribute("disabled"), t && k(t), n && (n.textContent = "Import");
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
function aa(i) {
  const e = new ai(i);
  return Te(() => e.init()), e;
}
function oa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new ai(e);
  Te(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class oi {
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
      this.renderHealthData(), lt("Health data refreshed");
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
    const r = o.width, h = o.height, g = 40, b = r - g * 2, x = h - g * 2;
    c.clearRect(0, 0, r, h);
    const D = t.labels, C = Object.values(t.datasets), f = b / D.length / (C.length + 1), L = Math.max(...C.flat()) || 1;
    D.forEach((S, y) => {
      const T = g + y * b / D.length + f / 2;
      C.forEach((_, X) => {
        const W = _[y] / L * x, de = T + X * f, V = h - g - W;
        c.fillStyle = n[X] || "#6b7280", c.fillRect(de, V, f - 2, W);
      }), y % Math.ceil(D.length / 6) === 0 && (c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "center", c.fillText(S, T + C.length * f / 2, h - g + 15));
    }), c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "right";
    for (let S = 0; S <= 4; S++) {
      const y = h - g - S * x / 4, T = Math.round(L * S / 4);
      c.fillText(T.toString(), g - 5, y + 3);
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
function ca(i) {
  const e = new oi(i);
  return Te(() => e.init()), e;
}
function la(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new oi(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class ci {
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
      addRuleBtn: h,
      validateBtn: g,
      mappingForm: b,
      publishCancelBtn: x,
      publishConfirmBtn: D,
      deleteCancelBtn: C,
      deleteConfirmBtn: f,
      closePreviewBtn: L,
      loadSampleBtn: S,
      runPreviewBtn: y,
      clearPreviewBtn: T,
      previewSourceInput: _,
      searchInput: X,
      filterStatus: W,
      filterProvider: de,
      mappingModal: V,
      publishModal: ne,
      deleteModal: fe,
      previewModal: oe
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.loadMappings()), r?.addEventListener("click", () => this.addSchemaField()), h?.addEventListener("click", () => this.addMappingRule()), g?.addEventListener("click", () => this.validateMapping()), b?.addEventListener("submit", (le) => {
      le.preventDefault(), this.saveMapping();
    }), x?.addEventListener("click", () => this.closePublishModal()), D?.addEventListener("click", () => this.publishMapping()), C?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), L?.addEventListener("click", () => this.closePreviewModal()), S?.addEventListener("click", () => this.loadSamplePayload()), y?.addEventListener("click", () => this.runPreviewTransform()), T?.addEventListener("click", () => this.clearPreview()), _?.addEventListener("input", Xt(() => this.validateSourceJson(), 300)), X?.addEventListener("input", Xt(() => this.renderMappings(), 300)), W?.addEventListener("change", () => this.renderMappings()), de?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (le) => {
      le.key === "Escape" && (V && !V.classList.contains("hidden") && this.closeModal(), ne && !ne.classList.contains("hidden") && this.closePublishModal(), fe && !fe.classList.contains("hidden") && this.closeDeleteModal(), oe && !oe.classList.contains("hidden") && this.closePreviewModal());
    }), [V, ne, fe, oe].forEach((le) => {
      le?.addEventListener("click", (Oe) => {
        const Ze = Oe.target;
        (Ze === le || Ze.getAttribute("aria-hidden") === "true") && (le === V ? this.closeModal() : le === ne ? this.closePublishModal() : le === fe ? this.closeDeleteModal() : le === oe && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), lt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: o } = this.elements;
    switch (k(t), k(n), k(s), k(o), e) {
      case "loading":
        j(t);
        break;
      case "empty":
        j(n);
        break;
      case "error":
        j(s);
        break;
      case "list":
        j(o);
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
    const o = (t?.value || "").toLowerCase(), c = n?.value || "", r = s?.value || "", h = this.mappings.filter((g) => !(o && !g.name.toLowerCase().includes(o) && !g.provider.toLowerCase().includes(o) || c && g.status !== c || r && g.provider !== r));
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
      mappingProviderInput: s,
      schemaObjectTypeInput: o,
      schemaVersionInput: c,
      schemaFieldsContainer: r,
      mappingRulesContainer: h
    } = this.elements, g = [];
    r?.querySelectorAll(".schema-field-row").forEach((x) => {
      g.push({
        object: (x.querySelector(".field-object")?.value || "").trim(),
        field: (x.querySelector(".field-name")?.value || "").trim(),
        type: x.querySelector(".field-type")?.value || "string",
        required: x.querySelector(".field-required")?.checked || !1
      });
    });
    const b = [];
    return h?.querySelectorAll(".mapping-rule-row").forEach((x) => {
      b.push({
        source_object: (x.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (x.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: x.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (x.querySelector(".rule-target-path")?.value || "").trim()
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
      rules: b
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
      schemaFieldsContainer: h,
      mappingRulesContainer: g,
      mappingStatusBadge: b,
      formValidationStatus: x
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), o && (o.value = e.provider || "");
    const D = e.external_schema || { object_type: "", fields: [] };
    c && (c.value = D.object_type || ""), r && (r.value = D.version || ""), h && (h.innerHTML = "", (D.fields || []).forEach((C) => h.appendChild(this.createSchemaFieldRow(C)))), g && (g.innerHTML = "", (e.rules || []).forEach((C) => g.appendChild(this.createMappingRuleRow(C)))), e.status && b ? (b.innerHTML = this.getStatusBadge(e.status), b.classList.remove("hidden")) : b && b.classList.add("hidden"), k(x);
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
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), o && (o.innerHTML = ""), c && c.classList.add("hidden"), k(r), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), j(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), j(n), o?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    k(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: o } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), j(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    k(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, j(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    k(this.elements.deleteModal), this.pendingDeleteId = null;
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
      j(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, j(t));
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
    const t = this.mappings.find((b) => b.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: s,
      previewMappingProvider: o,
      previewObjectType: c,
      previewMappingStatus: r,
      previewSourceInput: h,
      sourceSyntaxError: g
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), o && (o.textContent = t.provider), c && (c.textContent = t.external_schema?.object_type || "-"), r && (r.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), h && (h.value = ""), k(g), j(n), h?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    k(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: o } = this.elements;
    switch (k(t), k(n), k(s), k(o), e) {
      case "empty":
        j(t);
        break;
      case "loading":
        j(n);
        break;
      case "error":
        j(s);
        break;
      case "success":
        j(o);
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
    o.forEach((h) => {
      const g = h.field || "field";
      switch (h.type) {
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
    }), c[s] = r, e && (e.value = JSON.stringify(c, null, 2)), k(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return k(t), null;
    try {
      const s = JSON.parse(n);
      return k(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, j(t)), null;
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
    return n.forEach((h) => {
      const g = this.resolveSourceValue(e, h.source_object, h.source_field), b = g !== void 0;
      if (s.matched_rules.push({
        source: h.source_field,
        matched: b,
        value: g
      }), !!b)
        switch (h.target_entity) {
          case "participant":
            o[h.target_path] = g;
            break;
          case "agreement":
            c[h.target_path] = g;
            break;
          case "field_definition":
            r.push({ path: h.target_path, value: g });
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
      previewRulesTbody: h
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
    const b = e.field_definitions || [];
    o && (o.textContent = `(${b.length})`), s && (b.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = b.map(
      (C) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(C.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(C.value))}</span>
          </div>
        `
    ).join(""));
    const x = e.agreement || {}, D = Object.entries(x);
    c && (D.length === 0 ? c.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : c.innerHTML = D.map(
      ([C, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(C)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(f))}</span>
          </div>
        `
    ).join("")), r && (r.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((C) => {
      const f = h?.querySelector(`[data-rule-source="${this.escapeHtml(C.source)}"] span`);
      f && (C.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), k(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function da(i) {
  const e = new ci(i);
  return Te(() => e.init()), e;
}
function ua(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ci(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class li {
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
      actionIgnoreBtn: h,
      cancelResolveBtn: g,
      resolveForm: b,
      conflictDetailModal: x,
      resolveModal: D
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), h?.addEventListener("click", () => this.openResolveModal("ignored")), g?.addEventListener("click", () => this.closeResolveModal()), b?.addEventListener("submit", (C) => this.submitResolution(C)), document.addEventListener("keydown", (C) => {
      C.key === "Escape" && (D && !D.classList.contains("hidden") ? this.closeResolveModal() : x && !x.classList.contains("hidden") && this.closeConflictDetail());
    }), [x, D].forEach((C) => {
      C?.addEventListener("click", (f) => {
        const L = f.target;
        (L === C || L.getAttribute("aria-hidden") === "true") && (C === x ? this.closeConflictDetail() : C === D && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), lt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: o } = this.elements;
    switch (k(t), k(n), k(s), k(o), e) {
      case "loading":
        j(t);
        break;
      case "empty":
        j(n);
        break;
      case "error":
        j(s);
        break;
      case "list":
        j(o);
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
    const o = t?.value || "", c = n?.value || "", r = s?.value || "", h = this.conflicts.filter((g) => !(o && g.status !== o || c && g.provider !== c || r && g.entity_kind !== r));
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
    const t = this.conflicts.find((W) => W.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: o,
      detailStatusBadge: c,
      detailProvider: r,
      detailExternalId: h,
      detailInternalId: g,
      detailBindingId: b,
      detailConflictId: x,
      detailRunId: D,
      detailCreatedAt: C,
      detailVersion: f,
      detailPayload: L,
      resolutionSection: S,
      actionButtons: y,
      detailResolvedAt: T,
      detailResolvedBy: _,
      detailResolution: X
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), h && (h.textContent = t.external_id || "-"), g && (g.textContent = t.internal_id || "-"), b && (b.textContent = t.binding_id || "-"), x && (x.textContent = t.id), D && (D.textContent = t.run_id || "-"), C && (C.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), L)
      try {
        const W = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        L.textContent = JSON.stringify(W, null, 2);
      } catch {
        L.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (j(S), k(y), T && (T.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), _ && (_.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), X)
        try {
          const W = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          X.textContent = JSON.stringify(W, null, 2);
        } catch {
          X.textContent = t.resolution_json || "{}";
        }
    } else
      k(S), j(y);
    j(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    k(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), j(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    k(this.elements.resolveModal);
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
    const h = {
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
        body: JSON.stringify(h)
      });
      if (!g.ok) {
        const b = await g.json();
        throw new Error(b.error?.message || `HTTP ${g.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (g) {
      console.error("Resolution error:", g);
      const b = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${b}`, "error");
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
function pa(i) {
  const e = new li(i);
  return Te(() => e.init()), e;
}
function ga(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new li(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class di {
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
      filterProvider: h,
      filterStatus: g,
      filterDirection: b,
      actionResumeBtn: x,
      actionRetryBtn: D,
      actionCompleteBtn: C,
      actionFailBtn: f,
      actionDiagnosticsBtn: L,
      startSyncModal: S,
      runDetailModal: y
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (T) => this.startSync(T)), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.loadSyncRuns()), r?.addEventListener("click", () => this.closeRunDetail()), h?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("change", () => this.renderTimeline()), b?.addEventListener("change", () => this.renderTimeline()), x?.addEventListener("click", () => this.runAction("resume")), D?.addEventListener("click", () => this.runAction("resume")), C?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), L?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (T) => {
      T.key === "Escape" && (S && !S.classList.contains("hidden") && this.closeStartSyncModal(), y && !y.classList.contains("hidden") && this.closeRunDetail());
    }), [S, y].forEach((T) => {
      T?.addEventListener("click", (_) => {
        const X = _.target;
        (X === T || X.getAttribute("aria-hidden") === "true") && (T === S ? this.closeStartSyncModal() : T === y && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), lt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: o } = this.elements;
    switch (k(t), k(n), k(s), k(o), e) {
      case "loading":
        j(t);
        break;
      case "empty":
        j(n);
        break;
      case "error":
        j(s);
        break;
      case "list":
        j(o);
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
    ).length, r = this.syncRuns.filter((g) => g.status === "completed").length, h = this.syncRuns.filter((g) => g.status === "failed").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(c)), n && (n.textContent = String(r)), s && (s.textContent = String(h));
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
    t?.reset(), j(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    k(this.elements.startSyncModal);
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
    const t = this.syncRuns.find((_) => _.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: o,
      detailDirection: c,
      detailStatus: r,
      detailStarted: h,
      detailCompleted: g,
      detailCursor: b,
      detailAttempt: x,
      detailErrorSection: D,
      detailLastError: C,
      detailCheckpoints: f,
      actionResumeBtn: L,
      actionRetryBtn: S,
      actionCompleteBtn: y,
      actionFailBtn: T
    } = this.elements;
    s && (s.textContent = t.id), o && (o.textContent = t.provider), c && (c.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), r && (r.innerHTML = this.getStatusBadge(t.status)), h && (h.textContent = this.formatDate(t.started_at)), g && (g.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), b && (b.textContent = t.cursor || "-"), x && (x.textContent = String(t.attempt_count || 1)), t.last_error ? (C && (C.textContent = t.last_error), j(D)) : k(D), L && L.classList.toggle("hidden", t.status !== "running"), S && S.classList.toggle("hidden", t.status !== "failed"), y && y.classList.toggle("hidden", t.status !== "running"), T && T.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), j(n);
    try {
      const _ = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (_.ok) {
        const X = await _.json();
        this.renderCheckpoints(X.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (_) {
      console.error("Error loading checkpoints:", _), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    k(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: o } = this.elements, c = e === "resume" ? t : e === "complete" ? s : o, r = e === "resume" ? n : null;
    if (!c) return;
    c.setAttribute("disabled", "true"), r?.setAttribute("disabled", "true");
    const h = c.innerHTML;
    c.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const g = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, b = await fetch(g, {
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
      if (!b.ok) {
        const x = await b.json();
        throw new Error(x.error?.message || `HTTP ${b.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (g) {
      console.error(`${e} error:`, g);
      const b = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${b}`, "error");
    } finally {
      c.removeAttribute("disabled"), r?.removeAttribute("disabled"), c.innerHTML = h;
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
function ma(i) {
  const e = new di(i);
  return Te(() => e.init()), e;
}
function ha(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new di(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const un = "esign.google.account_id", es = 25 * 1024 * 1024, ts = 2e3, On = 60, yn = "application/vnd.google-apps.document", bn = "application/pdf", Nn = "application/vnd.google-apps.folder", ns = [yn, bn];
class In {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || es, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: kt(".source-tab"),
      sourcePanels: kt(".source-panel"),
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
      driveAccountDropdown: h
    } = this.elements;
    if (e) {
      const g = Xt(() => this.handleSearch(), 300);
      e.addEventListener("input", g);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), h && h.addEventListener("change", () => {
      this.setCurrentAccountId(h.value, this.currentSource === "google");
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
        window.localStorage.getItem(un)
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
      s && (s.value = ""), o && k(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const r = String(s?.email || "").trim(), h = String(s?.status || "").trim(), g = r || o || "Default account";
      c.textContent = h && h !== "connected" ? `${g} (${h})` : g, o === this.currentAccountId && (c.selected = !0), e.appendChild(c);
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
      this.currentAccountId ? window.localStorage.setItem(un, this.currentAccountId) : window.localStorage.removeItem(un);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, j(e)) : k(e)), t) {
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
      n.id.replace("panel-", "") === e ? j(n) : k(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), lt(
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
      `File is too large (${Gt(e.size)}). Maximum size is ${Gt(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: o, uploadZone: c } = this.elements;
    s && (s.textContent = e.name), o && (o.textContent = Gt(e.size)), t && k(t), n && j(n), c && (c.classList.remove("border-gray-300"), c.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && j(e), t && k(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, j(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", k(e));
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
    }), h = await r.json().catch(() => ({}));
    if (!r.ok) {
      const x = h?.error?.message || h?.message || "Upload failed. Please try again.";
      throw new Error(x);
    }
    const g = h?.object_key ? String(h.object_key).trim() : "";
    if (!g)
      throw new Error("Upload failed: missing source object key.");
    const b = h?.source_original_name ? String(h.source_original_name).trim() : h?.original_name ? String(h.original_name).trim() : e.name;
    return {
      objectKey: g,
      sourceOriginalName: b
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
        const h = r instanceof Error ? r.message : "Upload failed. Please try again.";
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), c = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : r ? [r] : [], b = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: o,
      webViewLink: c,
      parents: g,
      owners: b
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === yn;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === bn;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Nn;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return ns.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === yn ? "Google Document" : t === bn ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Nn ? "Folder" : "File";
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
      const h = await fetch(r.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), g = await h.json();
      if (!h.ok)
        throw new Error(g.error?.message || "Failed to load files");
      const b = Array.isArray(g.files) ? g.files.map((f) => this.normalizeDriveFile(f)) : [];
      this.nextPageToken = g.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...b] : this.currentFiles = b, this.renderFiles(o);
      const { resultCount: x, listTitle: D } = this.elements;
      n && x ? (x.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, D && (D.textContent = "Search Results")) : (x && (x.textContent = ""), D && (D.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: C } = this.elements;
      C && (this.nextPageToken ? j(C) : k(C)), lt(`Loaded ${b.length} files`);
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
        `), lt(`Error: ${r instanceof Error ? r.message : "Unknown error"}`);
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
      const c = this.getFileIcon(s), r = this.isImportable(s), h = this.isFolder(s), g = this.selectedFile && this.selectedFile.id === s.id, b = !r && !h;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${g ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${b ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${g}"
          data-file-index="${o}"
          ${b ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0 ${c.text}">
            ${c.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + Kt(s.modifiedTime) : ""}
              ${b ? " • Not importable" : ""}
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
    t && (t.value = ""), n && k(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      k(e);
      return;
    }
    j(e);
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
    s && s.querySelectorAll(".file-item").forEach((S) => {
      const y = parseInt(S.dataset.fileIndex || "0", 10);
      this.currentFiles[y].id === e.id ? (S.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), S.setAttribute("aria-selected", "true")) : (S.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), S.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: o,
      filePreview: c,
      importStatus: r,
      previewIcon: h,
      previewTitle: g,
      previewType: b,
      importTypeInfo: x,
      importTypeLabel: D,
      importTypeDesc: C,
      snapshotWarning: f,
      importDocumentTitle: L
    } = this.elements;
    o && k(o), c && j(c), r && k(r), h && (h.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, h.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), g && (g.textContent = e.name || "Untitled"), b && (b.textContent = this.getFileTypeName(e.mimeType)), n && x && (x.className = `p-3 rounded-lg border ${n.bgClass}`, D && (D.textContent = n.label, D.className = `text-xs font-medium ${n.textClass}`), C && (C.textContent = n.desc, C.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? j(f) : k(f))), L && (L.value = e.name || ""), lt(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && j(e), t && k(t), n && k(n), s && s.querySelectorAll(".file-item").forEach((o) => {
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
      t && j(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && k(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && k(t), this.searchQuery = "";
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
    switch (t && k(t), n && k(n), s && j(s), o && k(o), c && k(c), r && k(r), e) {
      case "queued":
      case "running":
        o && j(o);
        break;
      case "succeeded":
        c && j(c);
        break;
      case "failed":
        r && j(r);
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
        s.href = this.applyAccountIdToPath(o), j(s);
      } else
        k(s);
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
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && k(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
      ), h = await r.json();
      if (!r.ok) {
        const b = h.error?.code || "";
        throw { message: h.error?.message || "Failed to start import", code: b };
      }
      this.currentImportRunId = h.import_run_id, this.pollAttempts = 0;
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), ts);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > On) {
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
            this.showImportStatus("succeeded"), lt("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const o = n.error?.code || "", c = n.error?.message || "Import failed";
            this.showImportError(c, o), lt("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < On ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function fa(i) {
  const e = new In(i);
  return Te(() => e.init()), e;
}
function va(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new In(e);
  Te(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function is(i) {
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
typeof document < "u" && Te(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = is(t);
        n && new In(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const tt = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, Nt = tt.REVIEW, ss = {
  [tt.DOCUMENT]: "Details",
  [tt.DETAILS]: "Participants",
  [tt.PARTICIPANTS]: "Fields",
  [tt.FIELDS]: "Placement",
  [tt.PLACEMENT]: "Review"
}, gt = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, Qt = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
};
tt.DOCUMENT, tt.DETAILS, tt.PARTICIPANTS, tt.FIELDS, tt.REVIEW;
const wn = /* @__PURE__ */ new Map(), rs = 30 * 60 * 1e3, zn = {
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
function as(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function os(i) {
  const e = i instanceof Error ? i.message : i, t = as(e);
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
  if (t && zn[t]) {
    const n = zn[t];
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
function jn() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function cs() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function ls() {
  if (!cs())
    throw new Error("PDF preview library unavailable");
}
function ds(i) {
  const e = wn.get(i);
  return e ? Date.now() - e.timestamp > rs ? (wn.delete(i), null) : e : null;
}
function us(i, e, t) {
  wn.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function ps(i, e = Qt.THUMBNAIL_MAX_WIDTH, t = Qt.THUMBNAIL_MAX_HEIGHT) {
  await ls();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const o = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, c = o.numPages, r = await o.getPage(1), h = r.getViewport({ scale: 1 }), g = e / h.width, b = t / h.height, x = Math.min(g, b, 1), D = r.getViewport({ scale: x }), C = document.createElement("canvas");
  C.width = D.width, C.height = D.height;
  const f = C.getContext("2d");
  if (!f)
    throw new Error("Failed to get canvas context");
  return await r.render({
    canvasContext: f,
    viewport: D
  }).promise, { dataUrl: C.toDataURL("image/jpeg", 0.8), pageCount: c };
}
class gs {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || Qt.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || Qt.THUMBNAIL_MAX_HEIGHT
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
    const t = e === tt.DOCUMENT || e === tt.DETAILS || e === tt.PARTICIPANTS || e === tt.FIELDS || e === tt.REVIEW;
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
    const o = ds(e);
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
      const { dataUrl: r, pageCount: h } = await ps(
        c,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      us(e, r, h), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? h,
        thumbnailUrl: r,
        isLoading: !1,
        error: null
      };
    } catch (c) {
      if (s !== this.requestVersion)
        return;
      const r = c instanceof Error ? c.message : "Failed to load preview", h = os(r);
      jn() && console.error("Failed to load document preview:", c), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: r,
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: o, errorState: c, emptyState: r, contentState: h } = this.elements;
    if (e) {
      if (o?.classList.add("hidden"), c?.classList.add("hidden"), r?.classList.add("hidden"), h?.classList.add("hidden"), !this.state.documentId) {
        r?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        o?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        c?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (jn() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      h?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), s && this.state.pageCount && (s.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
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
function ms(i = {}) {
  const e = new gs(i);
  return e.init(), e;
}
function hs(i = {}) {
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
function fs(i) {
  const { context: e, hooks: t = {} } = i;
  return hs({
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
function $t(i, e, t) {
  const n = ct(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function vs(i = document) {
  return {
    marker: ct(i, "esign-page-config"),
    form: {
      root: $t(i, "agreement-form", "form"),
      submitBtn: $t(i, "submit-btn", "submit button"),
      wizardSaveBtn: ct(i, "wizard-save-btn"),
      announcements: ct(i, "form-announcements"),
      documentIdInput: $t(i, "document_id", "document selector"),
      documentPageCountInput: ct(i, "document_page_count"),
      titleInput: $t(i, "title", "title input"),
      messageInput: $t(i, "message", "message input")
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
function ys(i, e) {
  function t(n) {
    i.form.wizardSaveBtn instanceof HTMLButtonElement && (i.form.wizardSaveBtn.disabled = n), i.form.submitBtn instanceof HTMLButtonElement && (i.form.submitBtn.disabled = n);
  }
  return {
    render(n = {}) {
      const s = n?.isOwner !== !1, o = n?.coordinationAvailable !== !1, c = i.ownership.banner, r = i.ownership.message, h = i.ownership.takeControlBtn;
      if (!c || !r) {
        t(!s);
        return;
      }
      if (!o || s) {
        c.classList.add("hidden"), h?.removeAttribute("disabled"), t(!1);
        return;
      }
      const g = n?.claim, b = g?.lastSeenAt ? e.formatRelativeTime(g.lastSeenAt) : "recently";
      r.textContent = `This agreement is active in another tab. Take control here to resume syncing and sending. Last seen ${b}.`, c.classList.remove("hidden"), t(!0);
    },
    destroy() {
      t(!1);
    }
  };
}
class bs {
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
    const r = e.details && typeof e.details == "object" ? e.details : {}, h = String(r.title ?? "").trim(), g = h === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    n.details = {
      title: h,
      message: String(r.message ?? "")
    }, n.participants = Array.isArray(e.participants) ? e.participants : [], n.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], n.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], n.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const b = String(e.wizardId ?? "").trim();
    n.wizardId = b || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, g), n.storageMigrationVersion = this.options.parsePositiveInt(
      e.storageMigrationVersion,
      this.options.storageMigrationVersion
    ) || this.options.storageMigrationVersion;
    const x = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = x || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
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
class ws {
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
class Ss {
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
class xs {
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
      this.options.statusUpdater("paused");
      return;
    }
    this.debounceTimer && clearTimeout(this.debounceTimer), this.options.statusUpdater("pending"), this.debounceTimer = setTimeout(() => {
      this.performSync();
    }, this.options.syncDebounceMs);
  }
  async forceSync(e = {}) {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
    const t = e.keepalive === !0;
    if (!this.ensureActiveTabOwnership(t ? "keepalive_sync" : "force_sync", { allowClaimIfAvailable: !0 }))
      return { blocked: !0, reason: "passive_tab" };
    const n = this.stateManager.getState();
    if (!t)
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
        const o = await this.fetchImpl(this.options.draftEndpointWithUserID(`${this.options.draftsEndpoint}/${n.serverDraftId}`), {
          method: "PUT",
          credentials: "same-origin",
          headers: this.options.draftRequestHeaders(),
          body: s,
          keepalive: !0
        });
        if (o.status === 409) {
          const g = await o.json().catch(() => ({})), b = Number(g?.error?.details?.current_revision || 0);
          return this.options.statusUpdater("conflict"), this.options.showConflictDialog(b > 0 ? b : n.serverRevision), { conflict: !0 };
        }
        if (!o.ok)
          throw new Error(`HTTP ${o.status}`);
        const c = await o.json().catch(() => ({})), r = String(c?.id || c?.draft_id || n.serverDraftId || "").trim(), h = Number(c?.revision || 0);
        if (r && Number.isFinite(h) && h > 0)
          return this.stateManager.markSynced(r, h), this.options.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(r, h), { success: !0, draftId: r, revision: h };
      } catch {
      }
    }
    return this.performSync();
  }
  async performSync() {
    if (this.isSyncing) return { blocked: !0, reason: "sync_in_progress" };
    if (!this.ensureActiveTabOwnership("perform_sync", { allowClaimIfAvailable: !0 }))
      return { blocked: !0, reason: "passive_tab" };
    const e = this.stateManager.getState();
    if (!e.syncPending)
      return this.options.statusUpdater("saved"), { skipped: !0, reason: "not_pending" };
    this.isSyncing = !0, this.options.statusUpdater("saving");
    const t = await this.syncService.sync();
    return this.isSyncing = !1, t.success ? (t.result?.id && t.result?.revision && this.broadcastSyncCompleted(t.result.id, t.result.revision), this.options.statusUpdater("saved"), this.retryCount = 0, { success: !0, draftId: t.result?.id || null, revision: t.result?.revision || 0 }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), { conflict: !0, currentRevision: t.currentRevision }) : (this.options.statusUpdater("error"), this.scheduleRetry(), { error: !0, reason: t.error || "sync_failed" });
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
function Is() {
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
function vt(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function zt(i, e, t = "") {
  const n = i.querySelector(e);
  return (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && n.value || t;
}
function Es(i, e, t = !1) {
  const n = i.querySelector(e);
  return n instanceof HTMLInputElement ? n.checked : t;
}
function jt(i, e) {
  i instanceof HTMLButtonElement && (i.disabled = e);
}
function Cs(i) {
  const {
    documentIdInput: e,
    selectedDocumentTitle: t,
    participantsContainer: n,
    fieldDefinitionsContainer: s,
    submitBtn: o,
    syncOrchestrator: c,
    escapeHtml: r,
    getSignerParticipants: h,
    getCurrentDocumentPageCount: g,
    collectFieldRulesForState: b,
    expandRulesForPreview: x,
    findSignersMissingRequiredSignatureField: D,
    goToStep: C
  } = i;
  function f() {
    const L = vt("send-readiness-loading"), S = vt("send-readiness-results"), y = vt("send-validation-status"), T = vt("send-validation-issues"), _ = vt("send-issues-list"), X = vt("send-confirmation"), W = vt("review-agreement-title"), de = vt("review-document-title"), V = vt("review-participant-count"), ne = vt("review-stage-count"), fe = vt("review-participants-list"), oe = vt("review-fields-summary"), le = document.getElementById("title");
    if (!L || !S || !y || !T || !_ || !X || !W || !de || !V || !ne || !fe || !oe || !(le instanceof HTMLInputElement))
      return;
    const Oe = le.value || "Untitled", Ze = t?.textContent || "No document", nt = n.querySelectorAll(".participant-entry"), it = s.querySelectorAll(".field-definition-entry"), rt = x(b(), g()), We = h(), $e = /* @__PURE__ */ new Set();
    nt.forEach((se) => {
      const q = se.querySelector(".signing-stage-input"), we = se.querySelector('select[name*=".role"]');
      we instanceof HTMLSelectElement && we.value === "signer" && q instanceof HTMLInputElement && q.value && $e.add(Number.parseInt(q.value, 10));
    }), W.textContent = Oe, de.textContent = Ze, V.textContent = `${nt.length} (${We.length} signers)`, ne.textContent = String($e.size > 0 ? $e.size : 1), fe.innerHTML = "", nt.forEach((se) => {
      const q = zt(se, 'input[name*=".name"]'), we = zt(se, 'input[name*=".email"]'), Ye = zt(se, 'select[name*=".role"]', "signer"), ve = zt(se, ".signing-stage-input"), Ae = Es(se, ".notify-input", !0), Me = document.createElement("div");
      Me.className = "flex items-center justify-between text-sm", Me.innerHTML = `
        <div>
          <span class="font-medium">${r(q || we)}</span>
          <span class="text-gray-500 ml-2">${r(we)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Ye === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Ye === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${Ae ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${Ae ? "Notify" : "No Notify"}
          </span>
          ${Ye === "signer" && ve ? `<span class="text-xs text-gray-500">Stage ${ve}</span>` : ""}
        </div>
      `, fe.appendChild(Me);
    });
    const _e = it.length + rt.length;
    oe.textContent = `${_e} field${_e !== 1 ? "s" : ""} defined (${it.length} manual, ${rt.length} generated)`;
    const ue = [];
    e?.value || ue.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), We.length === 0 && ue.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), D().forEach((se) => {
      ue.push({
        severity: "error",
        message: `${se.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Je = Array.from($e).sort((se, q) => se - q);
    for (let se = 0; se < Je.length; se++)
      if (Je[se] !== se + 1) {
        ue.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const ke = ue.some((se) => se.severity === "error"), st = ue.some((se) => se.severity === "warning");
    ke ? (y.className = "p-4 rounded-lg bg-red-50 border border-red-200", y.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, X.classList.add("hidden"), jt(o, !0)) : st ? (y.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", y.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, X.classList.remove("hidden"), jt(o, !1)) : (y.className = "p-4 rounded-lg bg-green-50 border border-green-200", y.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, X.classList.remove("hidden"), jt(o, !1)), c.isOwner || (y.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", y.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, X.classList.add("hidden"), jt(o, !0)), ue.length > 0 ? (T.classList.remove("hidden"), _.innerHTML = "", ue.forEach((se) => {
      const q = document.createElement("li");
      q.className = `p-3 rounded-lg flex items-center justify-between ${se.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, q.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${se.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${se.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${r(se.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${se.step}">
            ${r(se.action)}
          </button>
        `, _.appendChild(q);
    }), _.querySelectorAll("[data-go-to-step]").forEach((se) => {
      se.addEventListener("click", () => {
        const q = Number(se.getAttribute("data-go-to-step"));
        Number.isFinite(q) && C(q);
      });
    })) : T.classList.add("hidden"), L.classList.add("hidden"), S.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: f
  };
}
function qn(i, e = 0) {
  const t = Number.parseInt(String(i || "").trim(), 10);
  return Number.isFinite(t) ? t : e;
}
function Ls(i) {
  const {
    totalWizardSteps: e,
    wizardStep: t,
    nextStepLabels: n,
    submitBtn: s,
    syncOrchestrator: o,
    previewCard: c,
    updateActiveTabOwnershipUI: r,
    validateStep: h,
    onPlacementStep: g,
    onReviewStep: b,
    onStepChanged: x,
    initialStep: D = 1
  } = i;
  let C = D;
  const f = Array.from(document.querySelectorAll(".wizard-step-btn")), L = Array.from(document.querySelectorAll(".wizard-step")), S = Array.from(document.querySelectorAll(".wizard-connector")), y = document.getElementById("wizard-prev-btn"), T = document.getElementById("wizard-next-btn"), _ = document.getElementById("wizard-save-btn");
  function X() {
    if (f.forEach((V, ne) => {
      const fe = ne + 1, oe = V.querySelector(".wizard-step-number");
      oe instanceof HTMLElement && (fe < C ? (V.classList.remove("text-gray-500", "text-blue-600"), V.classList.add("text-green-600"), oe.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), oe.classList.add("bg-green-600", "text-white"), V.removeAttribute("aria-current")) : fe === C ? (V.classList.remove("text-gray-500", "text-green-600"), V.classList.add("text-blue-600"), oe.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), oe.classList.add("bg-blue-600", "text-white"), V.setAttribute("aria-current", "step")) : (V.classList.remove("text-blue-600", "text-green-600"), V.classList.add("text-gray-500"), oe.classList.remove("bg-blue-600", "text-white", "bg-green-600"), oe.classList.add("bg-gray-300", "text-gray-600"), V.removeAttribute("aria-current")));
    }), S.forEach((V, ne) => {
      ne < C - 1 ? (V.classList.remove("bg-gray-300"), V.classList.add("bg-green-600")) : (V.classList.remove("bg-green-600"), V.classList.add("bg-gray-300"));
    }), L.forEach((V) => {
      qn(V.dataset.step) === C ? V.classList.remove("hidden") : V.classList.add("hidden");
    }), y?.classList.toggle("hidden", C === 1), T?.classList.toggle("hidden", C === e), _?.classList.toggle("hidden", C !== e), s.classList.toggle("hidden", C !== e), r({
      isOwner: o.isOwner,
      reason: o.lastBlockedReason,
      claim: o.currentClaim
    }), C < e) {
      const V = n[C] || "Next";
      T && (T.innerHTML = `
        ${V}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    C === t.PLACEMENT ? g?.() : C === t.REVIEW && b?.(), c.updateVisibility(C);
  }
  function W(V) {
    if (!(V < t.DOCUMENT || V > e)) {
      if (V > C) {
        for (let ne = C; ne < V; ne++)
          if (!h(ne)) return;
      }
      C = V, X(), x?.(V), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function de() {
    f.forEach((V) => {
      V.addEventListener("click", () => {
        const ne = qn(V.dataset.step);
        W(ne);
      });
    }), y?.addEventListener("click", () => W(C - 1)), T?.addEventListener("click", () => W(C + 1)), _?.addEventListener("click", () => {
      const V = document.getElementById("agreement-form");
      if (!(V instanceof HTMLFormElement)) return;
      const ne = document.createElement("input");
      ne.type = "hidden", ne.name = "save_as_draft", ne.value = "1", V.appendChild(ne), V.submit();
    });
  }
  return {
    bindEvents: de,
    getCurrentStep() {
      return C;
    },
    setCurrentStep(V) {
      C = V;
    },
    goToStep: W,
    updateWizardUI: X
  };
}
function Ts(i = {}) {
  const {
    config: e,
    form: t,
    submitBtn: n,
    documentIdInput: s,
    documentSearch: o,
    participantsContainer: c,
    addParticipantBtn: r,
    fieldDefinitionsContainer: h,
    fieldRulesContainer: g,
    documentPageCountInput: b,
    fieldPlacementsJSONInput: x,
    fieldRulesJSONInput: D,
    currentUserID: C,
    draftsEndpoint: f,
    draftEndpointWithUserID: L,
    draftRequestHeaders: S,
    syncService: y,
    syncOrchestrator: T,
    stateManager: _,
    submitMode: X,
    totalWizardSteps: W,
    wizardStep: de,
    getCurrentStep: V,
    getPlacementState: ne,
    getCurrentDocumentPageCount: fe,
    ensureSelectedDocumentCompatibility: oe,
    collectFieldRulesForState: le,
    collectFieldRulesForForm: Oe,
    expandRulesForPreview: Ze,
    findSignersMissingRequiredSignatureField: nt,
    missingSignatureFieldMessage: it,
    getSignerParticipants: rt,
    buildCanonicalAgreementPayload: We,
    announceError: $e,
    emitWizardTelemetry: _e,
    parseAPIError: ue,
    goToStep: De,
    surfaceSyncOutcome: Je,
    activeTabOwnershipRequiredCode: ke = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    addFieldBtn: st
  } = i;
  async function se() {
    _.updateState(_.collectFormState());
    const ve = await T.forceSync();
    if (ve?.blocked && ve.reason === "passive_tab")
      throw {
        code: ke,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const Ae = _.getState();
    if (Ae?.syncPending)
      throw new Error("Unable to sync latest draft changes");
    return Ae;
  }
  async function q() {
    const ve = await se(), Ae = String(ve?.serverDraftId || "").trim();
    if (!Ae) {
      const Me = await y.create(ve);
      return _.markSynced(Me.id, Me.revision), {
        draftID: String(Me.id || "").trim(),
        revision: Number(Me.revision || 0)
      };
    }
    try {
      const Me = await y.load(Ae), Ke = String(Me?.id || Ae).trim(), Fe = Number(Me?.revision || ve?.serverRevision || 0);
      return Ke && Fe > 0 && _.markSynced(Ke, Fe), {
        draftID: Ke,
        revision: Fe > 0 ? Fe : Number(ve?.serverRevision || 0)
      };
    } catch (Me) {
      if (Number(Me?.status || 0) !== 404)
        throw Me;
      const Ke = await y.create({
        ..._.getState(),
        ..._.collectFormState()
      }), Fe = String(Ke?.id || "").trim(), Qe = Number(Ke?.revision || 0);
      return _.markSynced(Fe, Qe), _e("wizard_send_stale_draft_recovered", {
        stale_draft_id: Ae,
        recovered_draft_id: Fe
      }), { draftID: Fe, revision: Qe };
    }
  }
  async function we() {
    const ve = _.getState();
    _.setState({
      ...ve,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await T.forceSync();
  }
  function Ye() {
    t.addEventListener("submit", function(ve) {
      if (We(), !s.value) {
        ve.preventDefault(), $e("Please select a document"), o.focus();
        return;
      }
      if (!oe()) {
        ve.preventDefault();
        return;
      }
      const Ae = c.querySelectorAll(".participant-entry");
      if (Ae.length === 0) {
        ve.preventDefault(), $e("Please add at least one participant"), r.focus();
        return;
      }
      let Me = !1;
      if (Ae.forEach((F) => {
        F.querySelector('select[name*=".role"]').value === "signer" && (Me = !0);
      }), !Me) {
        ve.preventDefault(), $e("At least one signer is required");
        const F = Ae[0]?.querySelector('select[name*=".role"]');
        F && F.focus();
        return;
      }
      const Ke = h.querySelectorAll(".field-definition-entry"), Fe = nt();
      if (Fe.length > 0) {
        ve.preventDefault(), $e(it(Fe)), De(de.FIELDS), st.focus();
        return;
      }
      let Qe = !1;
      if (Ke.forEach((F) => {
        F.querySelector(".field-participant-select").value || (Qe = !0);
      }), Qe) {
        ve.preventDefault(), $e("Please assign all fields to a signer");
        const F = h.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        F && F.focus();
        return;
      }
      if (le().some((F) => !F.participantId)) {
        ve.preventDefault(), $e("Please assign all automation rules to a signer"), Array.from(g?.querySelectorAll(".field-rule-participant-select") || []).find((H) => !H.value)?.focus();
        return;
      }
      const R = !!t.querySelector('input[name="save_as_draft"]'), N = V() === W && !R;
      if (N) {
        let F = t.querySelector('input[name="send_for_signature"]');
        F || (F = document.createElement("input"), F.type = "hidden", F.name = "send_for_signature", t.appendChild(F)), F.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (X === "json") {
        ve.preventDefault(), n.disabled = !0, n.innerHTML = `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${N ? "Sending..." : "Saving..."}
        `, (async () => {
          try {
            We();
            const F = String(e.routes?.index || "").trim();
            if (!N) {
              if (await se(), F) {
                window.location.href = F;
                return;
              }
              window.location.reload();
              return;
            }
            const H = await q(), ae = String(H?.draftID || "").trim(), ce = Number(H?.revision || 0);
            if (!ae || ce <= 0)
              throw new Error("Draft session not available. Please try again.");
            if (!T.ensureActiveTabOwnership("send", { allowClaimIfAvailable: !0 }))
              throw {
                code: ke,
                message: "This agreement is active in another tab. Take control in this tab before sending."
              };
            const ye = await fetch(
              L(`${f}/${encodeURIComponent(ae)}/send`),
              {
                method: "POST",
                credentials: "same-origin",
                headers: S(),
                body: JSON.stringify({
                  expected_revision: ce,
                  created_by_user_id: C
                })
              }
            );
            if (!ye.ok) {
              const Z = await ue(ye, "Failed to send agreement");
              throw String(Z?.code || "").trim().toUpperCase() === "DRAFT_SEND_NOT_FOUND" ? (_e("wizard_send_not_found", {
                draft_id: ae,
                status: Number(Z?.status || 0)
              }), await we().catch(() => {
              }), {
                ...Z,
                code: "DRAFT_SESSION_STALE"
              }) : Z;
            }
            const ge = await ye.json(), Q = String(ge?.agreement_id || ge?.id || ge?.data?.id || "").trim();
            if (_.clear(), T.broadcastStateUpdate(), Q && F) {
              window.location.href = `${F}/${encodeURIComponent(Q)}`;
              return;
            }
            if (F) {
              window.location.href = F;
              return;
            }
            window.location.reload();
          } catch (F) {
            const H = String(F?.message || "Failed to process agreement").trim(), ae = String(F?.code || "").trim(), ce = Number(F?.status || 0);
            $e(H, ae, ce), n.disabled = !1, n.innerHTML = `
              <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
              Send for Signature
            `;
          }
        })();
        return;
      }
      n.disabled = !0, n.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${N ? "Sending..." : "Saving..."}
      `;
    });
  }
  return {
    bindEvents: Ye,
    ensureDraftReadyForSend: q,
    persistLatestWizardState: se,
    resyncAfterSendNotFound: we
  };
}
const Vn = 150, Gn = 32;
function Be(i) {
  return i == null ? "" : String(i).trim();
}
function ui(i) {
  if (typeof i == "boolean") return i;
  const e = Be(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function As(i) {
  return Be(i).toLowerCase();
}
function Xe(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(Be(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function qt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(Be(i));
  return Number.isFinite(t) ? t : e;
}
function Wt(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function Ut(i, e) {
  const t = Xe(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function Ft(i, e, t = 1) {
  const n = Xe(t, 1), s = Xe(i, n);
  return e > 0 ? Wt(s, 1, e) : s > 0 ? s : n;
}
function Ps(i, e, t) {
  const n = Xe(t, 1);
  let s = Ut(i, n), o = Ut(e, n);
  return s <= 0 && (s = 1), o <= 0 && (o = n), o < s ? { start: o, end: s } : { start: s, end: o };
}
function Zt(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => Be(n)) : Be(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = Xe(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function Jt(i, e) {
  const t = Xe(e, 1), n = Be(i.participantId ?? i.participant_id), s = Zt(i.excludePages ?? i.exclude_pages), o = i.required, c = typeof o == "boolean" ? o : !["0", "false", "off", "no"].includes(Be(o).toLowerCase());
  return {
    id: Be(i.id),
    type: As(i.type),
    participantId: n,
    participantTempId: Be(i.participantTempId) || n,
    fromPage: Ut(i.fromPage ?? i.from_page, t),
    toPage: Ut(i.toPage ?? i.to_page, t),
    page: Ut(i.page, t),
    excludeLastPage: ui(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: c
  };
}
function ks(i, e) {
  const t = Be(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function _s(i, e) {
  const t = Xe(e, 1), n = [];
  return i.forEach((s, o) => {
    const c = Jt(s || {}, t);
    if (c.type === "") return;
    const r = ks(c, o);
    if (c.type === "initials_each_page") {
      const h = Ps(c.fromPage, c.toPage, t), g = /* @__PURE__ */ new Set();
      Zt(c.excludePages).forEach((b) => {
        b <= t && g.add(b);
      }), c.excludeLastPage && g.add(t);
      for (let b = h.start; b <= h.end; b += 1)
        g.has(b) || n.push({
          id: `${r}-initials-${b}`,
          type: "initials",
          page: b,
          participantId: Be(c.participantId),
          required: c.required !== !1,
          ruleId: r
          // Track rule ID for link group creation.
        });
      return;
    }
    if (c.type === "signature_once") {
      let h = c.page > 0 ? c.page : c.toPage > 0 ? c.toPage : t;
      h <= 0 && (h = 1), n.push({
        id: `${r}-signature-${h}`,
        type: "signature",
        page: h,
        participantId: Be(c.participantId),
        required: c.required !== !1,
        ruleId: r
        // Track rule ID for link group creation.
      });
    }
  }), n.sort((s, o) => s.page !== o.page ? s.page - o.page : s.id.localeCompare(o.id)), n;
}
function Ds(i, e, t, n, s) {
  const o = Xe(t, 1);
  let c = i > 0 ? i : 1, r = e > 0 ? e : o;
  c = Wt(c, 1, o), r = Wt(r, 1, o), r < c && ([c, r] = [r, c]);
  const h = /* @__PURE__ */ new Set();
  s.forEach((b) => {
    const x = Xe(b, 0);
    x > 0 && h.add(Wt(x, 1, o));
  }), n && h.add(o);
  const g = [];
  for (let b = c; b <= r; b += 1)
    h.has(b) || g.push(b);
  return {
    pages: g,
    rangeStart: c,
    rangeEnd: r,
    excludedPages: Array.from(h).sort((b, x) => b - x),
    isEmpty: g.length === 0
  };
}
function Ms(i) {
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
function pn(i) {
  const e = i || {};
  return {
    id: Be(e.id),
    title: Be(e.title || e.name) || "Untitled",
    pageCount: Xe(e.page_count ?? e.pageCount, 0),
    compatibilityTier: Be(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: Be(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function pi(i) {
  const e = Be(i).toLowerCase();
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
function Ht(i, e = 0) {
  const t = i || {}, n = Be(t.id) || `fi_init_${e}`, s = Be(t.definitionId || t.definition_id || t.field_definition_id) || n, o = Xe(t.page ?? t.page_number, 1), c = qt(t.x ?? t.pos_x, 0), r = qt(t.y ?? t.pos_y, 0), h = qt(t.width, Vn), g = qt(t.height, Gn);
  return {
    id: n,
    definitionId: s,
    type: Be(t.type) || "text",
    participantId: Be(t.participantId || t.participant_id),
    participantName: Be(t.participantName || t.participant_name) || "Unassigned",
    page: o > 0 ? o : 1,
    x: c >= 0 ? c : 0,
    y: r >= 0 ? r : 0,
    width: h > 0 ? h : Vn,
    height: g > 0 ? g : Gn,
    placementSource: pi(t.placementSource || t.placement_source),
    linkGroupId: Be(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: Be(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: ui(t.isUnlinked ?? t.is_unlinked)
  };
}
function Rs(i, e = 0) {
  const t = Ht(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: pi(t.placementSource),
    link_group_id: Be(t.linkGroupId),
    linked_from_field_id: Be(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function je(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function xt(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Tt(i) {
  return typeof i == "object" && i !== null;
}
function $s(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    currentUserID: n,
    documentsUploadURL: s,
    isEditMode: o,
    titleSource: c,
    normalizeTitleSource: r,
    stateManager: h,
    previewCard: g,
    parseAPIError: b,
    announceError: x,
    showToast: D,
    mapUserFacingError: C,
    renderFieldRulePreview: f
  } = i, L = je("document_id"), S = je("selected-document"), y = je("document-picker"), T = je("document-search"), _ = je("document-list"), X = je("change-document-btn"), W = je("selected-document-title"), de = je("selected-document-info"), V = je("document_page_count"), ne = je("document-remediation-panel"), fe = je("document-remediation-message"), oe = je("document-remediation-status"), le = je("document-remediation-trigger-btn"), Oe = je("document-remediation-dismiss-btn"), Ze = je("title"), nt = 300, it = 5, rt = 10, We = je("document-typeahead"), $e = je("document-typeahead-dropdown"), _e = je("document-recent-section"), ue = je("document-recent-list"), De = je("document-search-section"), Je = je("document-search-list"), ke = je("document-empty-state"), st = je("document-dropdown-loading"), se = je("document-search-loading"), q = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let we = [], Ye = null, ve = 0, Ae = null;
  const Me = /* @__PURE__ */ new Set(), Ke = /* @__PURE__ */ new Map();
  function Fe(P) {
    return String(P || "").trim().toLowerCase();
  }
  function Qe(P) {
    return String(P || "").trim().toLowerCase();
  }
  function at(P) {
    return Fe(P) === "unsupported";
  }
  function M() {
    !o && Ze && Ze.value.trim() !== "" && !h.hasResumableState() && h.setTitleSource(c.SERVER_SEED, { syncPending: !1 });
  }
  function R(P) {
    const $ = Xe(P, 0);
    V && (V.value = String($));
  }
  function N() {
    const P = Xe(V?.value || "0", 0);
    if (P > 0) return P;
    const $ = String(de?.textContent || "").match(/(\d+)\s+pages?/i);
    if ($) {
      const B = Xe($[1], 0);
      if (B > 0) return B;
    }
    return 1;
  }
  function F() {
    L && (L.value = ""), W && (W.textContent = ""), de && (de.textContent = ""), R(0), h.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), g.setDocument(null, null, null);
  }
  function H(P = "") {
    const $ = "This document cannot be used because its PDF is incompatible with online signing.", B = Qe(P);
    return B ? `${$} Reason: ${B}. Select another document or upload a remediated PDF.` : `${$} Select another document or upload a remediated PDF.`;
  }
  function ae() {
    Ye = null, oe && (oe.textContent = "", oe.className = "mt-2 text-xs text-amber-800"), ne && ne.classList.add("hidden"), le && (le.disabled = !1, le.textContent = "Remediate PDF");
  }
  function ce(P, $ = "info") {
    if (!oe) return;
    const B = String(P || "").trim();
    oe.textContent = B;
    const J = $ === "error" ? "text-red-700" : $ === "success" ? "text-green-700" : "text-amber-800";
    oe.className = `mt-2 text-xs ${J}`;
  }
  function ye(P, $ = "") {
    !P || !ne || !fe || (Ye = {
      id: String(P.id || "").trim(),
      title: String(P.title || "").trim(),
      pageCount: Xe(P.pageCount, 0),
      compatibilityReason: Qe($ || P.compatibilityReason || "")
    }, Ye.id && (fe.textContent = H(Ye.compatibilityReason), ce("Run remediation to make this document signable."), ne.classList.remove("hidden")));
  }
  function ge(P) {
    const $ = Ze;
    if (!$) return;
    const B = h.getState(), J = $.value.trim(), ee = r(
      B?.titleSource,
      J === "" ? c.AUTOFILL : c.USER
    );
    if (J && ee === c.USER)
      return;
    const Y = String(P || "").trim();
    Y && ($.value = Y, h.updateDetails({
      title: Y,
      message: h.getState().details.message || ""
    }, { titleSource: c.AUTOFILL }));
  }
  function Q(P, $, B) {
    if (!L || !W || !de || !S || !y)
      return;
    L.value = String(P || ""), W.textContent = $ || "", de.textContent = `${B} pages`, R(B), S.classList.remove("hidden"), y.classList.add("hidden"), f(), ge($);
    const J = Xe(B, 0);
    h.updateDocument({
      id: P,
      title: $,
      pageCount: J
    }), g.setDocument(P, $, J), ae();
  }
  function Z(P) {
    const $ = String(P || "").trim();
    if ($ === "") return null;
    const B = we.find((Y) => String(Y.id || "").trim() === $);
    if (B) return B;
    const J = q.recentDocuments.find((Y) => String(Y.id || "").trim() === $);
    if (J) return J;
    const ee = q.searchResults.find((Y) => String(Y.id || "").trim() === $);
    return ee || null;
  }
  function be() {
    const P = Z(L?.value || "");
    if (!P) return !0;
    const $ = Fe(P.compatibilityTier);
    return at($) ? (ye(P, P.compatibilityReason || ""), F(), x(H(P.compatibilityReason || "")), S && S.classList.add("hidden"), y && y.classList.remove("hidden"), T?.focus(), !1) : (ae(), !0);
  }
  function xe() {
    if (!W || !de || !S || !y)
      return;
    const P = (L?.value || "").trim();
    if (!P) return;
    const $ = we.find((B) => String(B.id || "").trim() === P);
    $ && (W.textContent.trim() || (W.textContent = $.title || "Untitled"), (!de.textContent.trim() || de.textContent.trim() === "pages") && (de.textContent = `${$.pageCount || 0} pages`), R($.pageCount || 0), S.classList.remove("hidden"), y.classList.add("hidden"));
  }
  async function Pe() {
    try {
      const P = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), $ = await fetch(`${e}/panels/esign_documents?${P.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!$.ok)
        throw await b($, "Failed to load documents");
      const B = await $.json();
      we = (Array.isArray(B?.records) ? B.records : Array.isArray(B?.items) ? B.items : []).slice().sort((Y, Ve) => {
        const Ge = Date.parse(String(Y?.created_at ?? Y?.createdAt ?? Y?.updated_at ?? Y?.updatedAt ?? "")), K = Date.parse(String(Ve?.created_at ?? Ve?.createdAt ?? Ve?.updated_at ?? Ve?.updatedAt ?? "")), pe = Number.isFinite(Ge) ? Ge : 0;
        return (Number.isFinite(K) ? K : 0) - pe;
      }).map((Y) => pn(Y)).filter((Y) => Y.id !== ""), Re(we), xe();
    } catch (P) {
      const $ = Tt(P) ? String(P.message || "Failed to load documents") : "Failed to load documents", B = Tt(P) ? String(P.code || "") : "", J = Tt(P) ? Number(P.status || 0) : 0, ee = C($, B, J);
      _ && (_.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${xt(ee)}</div>`);
    }
  }
  function Re(P) {
    if (!_) return;
    if (P.length === 0) {
      _.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${xt(s)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    _.innerHTML = P.map((B, J) => {
      const ee = xt(String(B.id || "").trim()), Y = xt(String(B.title || "").trim()), Ve = String(Xe(B.pageCount, 0)), Ge = Fe(B.compatibilityTier), K = Qe(B.compatibilityReason), pe = xt(Ge), Ee = xt(K), ut = at(Ge) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${J === 0 ? "0" : "-1"}"
                data-document-id="${ee}"
                data-document-title="${Y}"
                data-document-pages="${Ve}"
                data-document-compatibility-tier="${pe}"
                data-document-compatibility-reason="${Ee}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${Y}</div>
            <div class="text-xs text-gray-500">${Ve} pages ${ut}</div>
          </div>
        </button>
      `;
    }).join("");
    const $ = Array.from(_.querySelectorAll(".document-option"));
    $.forEach((B, J) => {
      B.addEventListener("click", () => v(B)), B.addEventListener("keydown", (ee) => {
        let Y = J;
        if (ee.key === "ArrowDown")
          ee.preventDefault(), Y = Math.min(J + 1, $.length - 1);
        else if (ee.key === "ArrowUp")
          ee.preventDefault(), Y = Math.max(J - 1, 0);
        else if (ee.key === "Enter" || ee.key === " ") {
          ee.preventDefault(), v(B);
          return;
        } else ee.key === "Home" ? (ee.preventDefault(), Y = 0) : ee.key === "End" && (ee.preventDefault(), Y = $.length - 1);
        Y !== J && ($[Y].focus(), $[Y].setAttribute("tabindex", "0"), B.setAttribute("tabindex", "-1"));
      });
    });
  }
  function v(P) {
    const $ = P.getAttribute("data-document-id"), B = P.getAttribute("data-document-title"), J = P.getAttribute("data-document-pages"), ee = Fe(P.getAttribute("data-document-compatibility-tier")), Y = Qe(P.getAttribute("data-document-compatibility-reason"));
    if (at(ee)) {
      ye({ id: String($ || ""), title: String(B || ""), pageCount: Xe(J, 0), compatibilityReason: Y }), F(), x(H(Y)), T?.focus();
      return;
    }
    Q($, B, J);
  }
  async function w(P, $, B) {
    const J = String(P || "").trim();
    if (!J) return;
    const ee = Date.now(), Y = 12e4, Ve = 1250;
    for (; Date.now() - ee < Y; ) {
      const Ge = await fetch(J, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!Ge.ok)
        throw await b(Ge, "Failed to read remediation status");
      const pe = (await Ge.json())?.dispatch || {}, Ee = String(pe?.status || "").trim().toLowerCase();
      if (Ee === "succeeded") {
        ce("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (Ee === "failed" || Ee === "canceled" || Ee === "dead_letter") {
        const ut = String(pe?.terminal_reason || "").trim();
        throw { message: ut ? `Remediation failed: ${ut}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      ce(Ee === "retrying" ? "Remediation is retrying in the queue..." : Ee === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((ut) => setTimeout(ut, Ve));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${$} (${B})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function I() {
    const P = Ye;
    if (!P || !P.id) return;
    const $ = String(P.id || "").trim();
    if (!(!$ || Me.has($))) {
      Me.add($), le && (le.disabled = !0, le.textContent = "Remediating...");
      try {
        let B = Ke.get($) || "";
        B || (B = `esign-remediate-${$}-${Date.now()}`, Ke.set($, B));
        const J = `${t}/esign/documents/${encodeURIComponent($)}/remediate`, ee = await fetch(J, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": B
          }
        });
        if (!ee.ok)
          throw await b(ee, "Failed to trigger remediation");
        const Y = await ee.json(), Ve = Y?.receipt || {}, Ge = String(Ve?.dispatch_id || Y?.dispatch_id || "").trim(), K = String(Ve?.mode || Y?.mode || "").trim().toLowerCase();
        let pe = String(Y?.dispatch_status_url || "").trim();
        !pe && Ge && (pe = `${t}/esign/dispatches/${encodeURIComponent(Ge)}`), K === "queued" && Ge && pe && (ce("Remediation queued. Monitoring progress..."), await w(pe, Ge, $)), await Pe();
        const Ee = Z($);
        if (!Ee || at(Ee.compatibilityTier)) {
          ce("Remediation finished, but this PDF is still incompatible.", "error"), x("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        Q(Ee.id, Ee.title, Ee.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : D("Document remediated successfully. You can continue.", "success");
      } catch (B) {
        const J = Tt(B) ? String(B.message || "Remediation failed").trim() : "Remediation failed", ee = Tt(B) ? String(B.code || "") : "", Y = Tt(B) ? Number(B.status || 0) : 0;
        ce(J, "error"), x(J, ee, Y);
      } finally {
        Me.delete($), le && (le.disabled = !1, le.textContent = "Remediate PDF");
      }
    }
  }
  function U(P, $) {
    let B = null;
    return (...J) => {
      B !== null && clearTimeout(B), B = setTimeout(() => {
        P(...J), B = null;
      }, $);
    };
  }
  async function O() {
    try {
      const P = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(it)
      });
      n && P.set("created_by_user_id", n);
      const $ = await fetch(`${e}/panels/esign_documents?${P}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!$.ok) {
        console.warn("Failed to load recent documents:", $.status);
        return;
      }
      const B = await $.json(), J = Array.isArray(B?.records) ? B.records : Array.isArray(B?.items) ? B.items : [];
      q.recentDocuments = J.map((ee) => pn(ee)).filter((ee) => ee.id !== "").slice(0, it);
    } catch (P) {
      console.warn("Error loading recent documents:", P);
    }
  }
  async function z(P) {
    const $ = P.trim();
    if (!$) {
      Ae && (Ae.abort(), Ae = null), q.isSearchMode = !1, q.searchResults = [], Se();
      return;
    }
    const B = ++ve;
    Ae && Ae.abort(), Ae = new AbortController(), q.isLoading = !0, q.isSearchMode = !0, Se();
    try {
      const J = new URLSearchParams({
        q: $,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(rt)
      }), ee = await fetch(`${e}/panels/esign_documents?${J}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Ae.signal
      });
      if (B !== ve) return;
      if (!ee.ok) {
        console.warn("Failed to search documents:", ee.status), q.searchResults = [], q.isLoading = !1, Se();
        return;
      }
      const Y = await ee.json(), Ve = Array.isArray(Y?.records) ? Y.records : Array.isArray(Y?.items) ? Y.items : [];
      q.searchResults = Ve.map((Ge) => pn(Ge)).filter((Ge) => Ge.id !== "").slice(0, rt);
    } catch (J) {
      if (Tt(J) && J.name === "AbortError")
        return;
      console.warn("Error searching documents:", J), q.searchResults = [];
    } finally {
      B === ve && (q.isLoading = !1, Se());
    }
  }
  const ie = U(z, nt);
  function re() {
    $e && (q.isOpen = !0, q.selectedIndex = -1, $e.classList.remove("hidden"), T?.setAttribute("aria-expanded", "true"), _?.classList.add("hidden"), Se());
  }
  function Ie() {
    $e && (q.isOpen = !1, q.selectedIndex = -1, $e.classList.add("hidden"), T?.setAttribute("aria-expanded", "false"), _?.classList.remove("hidden"));
  }
  function Ue(P, $, B) {
    P && (P.innerHTML = $.map((J, ee) => {
      const Y = ee, Ve = q.selectedIndex === Y, Ge = xt(String(J.id || "").trim()), K = xt(String(J.title || "").trim()), pe = String(Xe(J.pageCount, 0)), Ee = Fe(J.compatibilityTier), dt = Qe(J.compatibilityReason), ut = xt(Ee), Ot = xt(dt), sn = at(Ee) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${Ve ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${Ve}"
          tabindex="-1"
          data-document-id="${Ge}"
          data-document-title="${K}"
          data-document-pages="${pe}"
          data-document-compatibility-tier="${ut}"
          data-document-compatibility-reason="${Ot}"
          data-typeahead-index="${Y}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${K}</div>
            <div class="text-xs text-gray-500">${pe} pages ${sn}</div>
          </div>
        </button>
      `;
    }).join(""), P.querySelectorAll(".typeahead-option").forEach((J) => {
      J.addEventListener("click", () => He(J));
    }));
  }
  function Se() {
    if ($e) {
      if (q.isLoading) {
        st?.classList.remove("hidden"), _e?.classList.add("hidden"), De?.classList.add("hidden"), ke?.classList.add("hidden"), se?.classList.remove("hidden");
        return;
      }
      st?.classList.add("hidden"), se?.classList.add("hidden"), q.isSearchMode ? (_e?.classList.add("hidden"), q.searchResults.length > 0 ? (De?.classList.remove("hidden"), ke?.classList.add("hidden"), Ue(Je, q.searchResults)) : (De?.classList.add("hidden"), ke?.classList.remove("hidden"))) : (De?.classList.add("hidden"), q.recentDocuments.length > 0 ? (_e?.classList.remove("hidden"), ke?.classList.add("hidden"), Ue(ue, q.recentDocuments)) : (_e?.classList.add("hidden"), ke?.classList.remove("hidden"), ke && (ke.textContent = "No recent documents")));
    }
  }
  function He(P) {
    const $ = P.getAttribute("data-document-id"), B = P.getAttribute("data-document-title"), J = P.getAttribute("data-document-pages"), ee = Fe(P.getAttribute("data-document-compatibility-tier")), Y = Qe(P.getAttribute("data-document-compatibility-reason"));
    if ($) {
      if (at(ee)) {
        ye({ id: String($ || ""), title: String(B || ""), pageCount: Xe(J, 0), compatibilityReason: Y }), F(), x(H(Y)), T?.focus();
        return;
      }
      Q($, B, J), Ie(), T && (T.value = ""), q.query = "", q.isSearchMode = !1, q.searchResults = [];
    }
  }
  function et() {
    if (!$e) return;
    const P = $e.querySelector(`[data-typeahead-index="${q.selectedIndex}"]`);
    P && P.scrollIntoView({ block: "nearest" });
  }
  function Ne(P) {
    if (!q.isOpen) {
      (P.key === "ArrowDown" || P.key === "Enter") && (P.preventDefault(), re());
      return;
    }
    const $ = q.isSearchMode ? q.searchResults : q.recentDocuments, B = $.length - 1;
    switch (P.key) {
      case "ArrowDown":
        P.preventDefault(), q.selectedIndex = Math.min(q.selectedIndex + 1, B), Se(), et();
        break;
      case "ArrowUp":
        P.preventDefault(), q.selectedIndex = Math.max(q.selectedIndex - 1, 0), Se(), et();
        break;
      case "Enter":
        if (P.preventDefault(), q.selectedIndex >= 0 && q.selectedIndex <= B) {
          const J = $[q.selectedIndex];
          if (J) {
            const ee = document.createElement("button");
            ee.setAttribute("data-document-id", J.id), ee.setAttribute("data-document-title", J.title), ee.setAttribute("data-document-pages", String(J.pageCount)), ee.setAttribute("data-document-compatibility-tier", String(J.compatibilityTier || "")), ee.setAttribute("data-document-compatibility-reason", String(J.compatibilityReason || "")), He(ee);
          }
        }
        break;
      case "Escape":
        P.preventDefault(), Ie();
        break;
      case "Tab":
        Ie();
        break;
      case "Home":
        P.preventDefault(), q.selectedIndex = 0, Se(), et();
        break;
      case "End":
        P.preventDefault(), q.selectedIndex = B, Se(), et();
        break;
    }
  }
  function mt() {
    X && X.addEventListener("click", () => {
      S?.classList.add("hidden"), y?.classList.remove("hidden"), ae(), T?.focus(), re();
    }), le && le.addEventListener("click", () => {
      I();
    }), Oe && Oe.addEventListener("click", () => {
      ae(), T?.focus();
    }), T && (T.addEventListener("input", (P) => {
      const $ = P.target;
      if (!($ instanceof HTMLInputElement)) return;
      const B = $.value;
      q.query = B, q.isOpen || re(), B.trim() ? (q.isLoading = !0, Se(), ie(B)) : (q.isSearchMode = !1, q.searchResults = [], Se());
      const J = we.filter(
        (ee) => String(ee.title || "").toLowerCase().includes(B.toLowerCase())
      );
      Re(J);
    }), T.addEventListener("focus", () => {
      re();
    }), T.addEventListener("keydown", Ne)), document.addEventListener("click", (P) => {
      const $ = P.target;
      We && !($ instanceof Node && We.contains($)) && Ie();
    });
  }
  return {
    refs: {
      documentIdInput: L,
      selectedDocument: S,
      documentPicker: y,
      documentSearch: T,
      documentList: _,
      selectedDocumentTitle: W,
      selectedDocumentInfo: de,
      documentPageCountInput: V
    },
    bindEvents: mt,
    initializeTitleSourceSeed: M,
    loadDocuments: Pe,
    loadRecentDocuments: O,
    ensureSelectedDocumentCompatibility: be,
    getCurrentDocumentPageCount: N
  };
}
function bt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function gn(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Fs(i = {}) {
  const {
    initialParticipants: e = [],
    onParticipantsChanged: t
  } = i, n = document.getElementById("participants-container"), s = document.getElementById("participant-template"), o = document.getElementById("add-participant-btn");
  let c = 0, r = 0;
  function h() {
    return `temp_${Date.now()}_${c++}`;
  }
  function g(L = {}) {
    if (!(s instanceof HTMLTemplateElement) || !n)
      return;
    const S = s.content.cloneNode(!0), y = S.querySelector(".participant-entry");
    if (!(y instanceof HTMLElement)) return;
    const T = L.id || h();
    y.setAttribute("data-participant-id", T);
    const _ = bt(y, ".participant-id-input"), X = bt(y, 'input[name="participants[].name"]'), W = bt(y, 'input[name="participants[].email"]'), de = gn(y, 'select[name="participants[].role"]'), V = bt(y, 'input[name="participants[].signing_stage"]'), ne = bt(y, 'input[name="participants[].notify"]'), fe = y.querySelector(".signing-stage-wrapper");
    if (!_ || !X || !W || !de) return;
    const oe = r++;
    _.name = `participants[${oe}].id`, _.value = T, X.name = `participants[${oe}].name`, W.name = `participants[${oe}].email`, de.name = `participants[${oe}].role`, V && (V.name = `participants[${oe}].signing_stage`), ne && (ne.name = `participants[${oe}].notify`), L.name && (X.value = L.name), L.email && (W.value = L.email), L.role && (de.value = L.role), V && L.signing_stage && (V.value = String(L.signing_stage)), ne && (ne.checked = L.notify !== !1);
    const le = () => {
      if (!(fe instanceof HTMLElement) || !V) return;
      const Oe = de.value === "signer";
      fe.classList.toggle("hidden", !Oe), Oe ? V.value || (V.value = "1") : V.value = "";
    };
    le(), y.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      y.remove(), t?.();
    }), de.addEventListener("change", () => {
      le(), t?.();
    }), n.appendChild(S);
  }
  function b() {
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
      const y = S.target;
      y instanceof Element && (y.matches('select[name*=".role"]') || y.matches('input[name*=".name"]') || y.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (S) => {
      const y = S.target;
      y instanceof Element && (y.matches('input[name*=".name"]') || y.matches('input[name*=".email"]')) && t?.();
    });
  }
  function D() {
    if (!n) return [];
    const L = n.querySelectorAll(".participant-entry"), S = [];
    return L.forEach((y) => {
      const T = y.getAttribute("data-participant-id"), _ = gn(y, 'select[name*=".role"]'), X = bt(y, 'input[name*=".name"]'), W = bt(y, 'input[name*=".email"]');
      _?.value === "signer" && S.push({
        id: String(T || ""),
        name: X?.value || W?.value || "Signer",
        email: W?.value || ""
      });
    }), S;
  }
  function C() {
    if (!n) return [];
    const L = [];
    return n.querySelectorAll(".participant-entry").forEach((S) => {
      const y = S.getAttribute("data-participant-id"), T = bt(S, 'input[name*=".name"]')?.value || "", _ = bt(S, 'input[name*=".email"]')?.value || "", X = gn(S, 'select[name*=".role"]')?.value || "signer", W = Number.parseInt(bt(S, ".signing-stage-input")?.value || "1", 10), de = bt(S, ".notify-input")?.checked !== !1;
      L.push({
        tempId: String(y || ""),
        name: T,
        email: _,
        role: X,
        notify: de,
        signingStage: Number.isFinite(W) ? W : 1
      });
    }), L;
  }
  function f(L) {
    !n || !L?.participants || L.participants.length === 0 || (n.innerHTML = "", r = 0, L.participants.forEach((S) => {
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
    initialize: b,
    bindEvents: x,
    addParticipant: g,
    getSignerParticipants: D,
    collectParticipantsForState: C,
    restoreFromState: f
  };
}
function Bs() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function en() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Us(i, e) {
  return {
    id: Bs(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function gi(i, e) {
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
function Wn(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Jn(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function mi(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function Hs(i, e) {
  const t = mi(i, e.definitionId);
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
function Os(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const o of t)
    s.add(o.definitionId);
  for (const [o, c] of n) {
    if (c.page !== e || s.has(o) || i.unlinkedDefinitions.has(o)) continue;
    const r = i.definitionToGroup.get(o);
    if (!r) continue;
    const h = i.groups.get(r);
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
function wt(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function qe(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function pt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Yn(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function At(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLElement ? t : null;
}
function Ns(i) {
  const {
    initialFieldInstances: e = [],
    placementSource: t,
    getCurrentDocumentPageCount: n,
    getSignerParticipants: s,
    escapeHtml: o,
    onDefinitionsChanged: c,
    onRulesChanged: r,
    onParticipantsChanged: h,
    getPlacementLinkGroupState: g,
    setPlacementLinkGroupState: b
  } = i, x = wt("field-definitions-container"), D = document.getElementById("field-definition-template"), C = wt("add-field-btn"), f = wt("add-field-btn-container"), L = wt("add-field-definition-empty-btn"), S = wt("field-definitions-empty-state"), y = wt("field-rules-container"), T = document.getElementById("field-rule-template"), _ = wt("add-field-rule-btn"), X = wt("field-rules-empty-state"), W = wt("field-rules-preview"), de = wt("field_rules_json"), V = wt("field_placements_json");
  let ne = 0, fe = 0, oe = 0;
  function le() {
    return `temp_field_${Date.now()}_${ne++}`;
  }
  function Oe() {
    return `rule_${Date.now()}_${oe}`;
  }
  function Ze(M, R) {
    const N = String(M || "").trim();
    return N && R.some((F) => F.id === N) ? N : R.length === 1 ? R[0].id : "";
  }
  function nt(M, R, N = "") {
    if (!M) return;
    const F = Ze(N, R);
    M.innerHTML = '<option value="">Select signer...</option>', R.forEach((H) => {
      const ae = document.createElement("option");
      ae.value = H.id, ae.textContent = H.name, M.appendChild(ae);
    }), M.value = F;
  }
  function it(M = s()) {
    if (!x) return;
    const R = x.querySelectorAll(".field-participant-select"), N = y ? y.querySelectorAll(".field-rule-participant-select") : [];
    R.forEach((F) => {
      nt(
        F instanceof HTMLSelectElement ? F : null,
        M,
        F instanceof HTMLSelectElement ? F.value : ""
      );
    }), N.forEach((F) => {
      nt(
        F instanceof HTMLSelectElement ? F : null,
        M,
        F instanceof HTMLSelectElement ? F.value : ""
      );
    });
  }
  function rt() {
    if (!x || !S) return;
    x.querySelectorAll(".field-definition-entry").length === 0 ? (S.classList.remove("hidden"), f?.classList.add("hidden")) : (S.classList.add("hidden"), f?.classList.remove("hidden"));
  }
  function We() {
    if (!y || !X) return;
    const M = y.querySelectorAll(".field-rule-entry");
    X.classList.toggle("hidden", M.length > 0);
  }
  function $e() {
    if (!x) return [];
    const M = [];
    return x.querySelectorAll(".field-definition-entry").forEach((R) => {
      const N = R.getAttribute("data-field-definition-id"), F = pt(R, ".field-type-select")?.value || "signature", H = pt(R, ".field-participant-select")?.value || "", ae = Number.parseInt(qe(R, 'input[name*=".page"]')?.value || "1", 10), ce = qe(R, 'input[name*=".required"]')?.checked ?? !0;
      M.push({
        tempId: String(N || ""),
        type: F,
        participantTempId: H,
        page: Number.isFinite(ae) ? ae : 1,
        required: ce
      });
    }), M;
  }
  function _e() {
    if (!y) return [];
    const M = n(), R = y.querySelectorAll(".field-rule-entry"), N = [];
    return R.forEach((F) => {
      const H = Jt({
        id: F.getAttribute("data-field-rule-id") || "",
        type: pt(F, ".field-rule-type-select")?.value || "",
        participantId: pt(F, ".field-rule-participant-select")?.value || "",
        fromPage: qe(F, ".field-rule-from-page-input")?.value || "",
        toPage: qe(F, ".field-rule-to-page-input")?.value || "",
        page: qe(F, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!qe(F, ".field-rule-exclude-last-input")?.checked,
        excludePages: Zt(qe(F, ".field-rule-exclude-pages-input")?.value || ""),
        required: (pt(F, ".field-rule-required-select")?.value || "1") !== "0"
      }, M);
      H.type && N.push(H);
    }), N;
  }
  function ue() {
    return _e().map((M) => ({
      id: M.id,
      type: M.type,
      participant_id: M.participantId,
      from_page: M.fromPage,
      to_page: M.toPage,
      page: M.page,
      exclude_last_page: M.excludeLastPage,
      exclude_pages: M.excludePages,
      required: M.required
    }));
  }
  function De(M, R) {
    return _s(M, R);
  }
  function Je() {
    if (!W) return;
    const M = _e(), R = n(), N = De(M, R), F = s(), H = new Map(F.map((ge) => [String(ge.id), ge.name]));
    if (de && (de.value = JSON.stringify(ue())), !N.length) {
      W.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const ae = N.reduce((ge, Q) => {
      const Z = Q.type;
      return ge[Z] = (ge[Z] || 0) + 1, ge;
    }, {}), ce = N.slice(0, 8).map((ge) => {
      const Q = H.get(String(ge.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${ge.type === "initials" ? "Initials" : "Signature"} on page ${ge.page}</span><span class="text-gray-500">${o(String(Q))}</span></li>`;
    }).join(""), ye = N.length - 8;
    W.innerHTML = `
      <p class="text-gray-700">${N.length} generated field${N.length !== 1 ? "s" : ""} (${ae.initials || 0} initials, ${ae.signature || 0} signatures)</p>
      <ul class="space-y-1">${ce}</ul>
      ${ye > 0 ? `<p class="text-gray-500">+${ye} more</p>` : ""}
    `;
  }
  function ke() {
    const M = s();
    it(M), Je();
  }
  function st(M) {
    const R = pt(M, ".field-rule-type-select"), N = At(M, ".field-rule-range-start-wrap"), F = At(M, ".field-rule-range-end-wrap"), H = At(M, ".field-rule-page-wrap"), ae = At(M, ".field-rule-exclude-last-wrap"), ce = At(M, ".field-rule-exclude-pages-wrap"), ye = At(M, ".field-rule-summary"), ge = qe(M, ".field-rule-from-page-input"), Q = qe(M, ".field-rule-to-page-input"), Z = qe(M, ".field-rule-page-input"), be = qe(M, ".field-rule-exclude-last-input"), xe = qe(M, ".field-rule-exclude-pages-input");
    if (!R || !N || !F || !H || !ae || !ce || !ye)
      return;
    const Pe = n(), Re = Jt({
      type: R?.value || "",
      fromPage: ge?.value || "",
      toPage: Q?.value || "",
      page: Z?.value || "",
      excludeLastPage: !!be?.checked,
      excludePages: Zt(xe?.value || ""),
      required: !0
    }, Pe), v = Re.fromPage > 0 ? Re.fromPage : 1, w = Re.toPage > 0 ? Re.toPage : Pe, I = Re.page > 0 ? Re.page : Re.toPage > 0 ? Re.toPage : Pe, U = Re.excludeLastPage, O = Re.excludePages.join(","), z = R?.value === "initials_each_page";
    if (N.classList.toggle("hidden", !z), F.classList.toggle("hidden", !z), ae.classList.toggle("hidden", !z), ce.classList.toggle("hidden", !z), H.classList.toggle("hidden", z), ge && (ge.value = String(v)), Q && (Q.value = String(w)), Z && (Z.value = String(I)), xe && (xe.value = O), be && (be.checked = U), z) {
      const ie = Ds(
        v,
        w,
        Pe,
        U,
        Re.excludePages
      ), re = Ms(ie);
      ye.textContent = ie.isEmpty ? `Warning: No initials fields will be generated ${re}.` : `Generates initials fields on ${re}.`;
    } else
      ye.textContent = `Generates one signature field on page ${I}.`;
  }
  function se(M = {}) {
    if (!(T instanceof HTMLTemplateElement) || !y) return;
    const R = T.content.cloneNode(!0), N = R.querySelector(".field-rule-entry");
    if (!(N instanceof HTMLElement)) return;
    const F = M.id || Oe(), H = oe++, ae = n();
    N.setAttribute("data-field-rule-id", F);
    const ce = qe(N, ".field-rule-id-input"), ye = pt(N, ".field-rule-type-select"), ge = pt(N, ".field-rule-participant-select"), Q = qe(N, ".field-rule-from-page-input"), Z = qe(N, ".field-rule-to-page-input"), be = qe(N, ".field-rule-page-input"), xe = pt(N, ".field-rule-required-select"), Pe = qe(N, ".field-rule-exclude-last-input"), Re = qe(N, ".field-rule-exclude-pages-input"), v = Yn(N, ".remove-field-rule-btn");
    if (!ce || !ye || !ge || !Q || !Z || !be || !xe || !Pe || !Re || !v)
      return;
    ce.name = `field_rules[${H}].id`, ce.value = F, ye.name = `field_rules[${H}].type`, ge.name = `field_rules[${H}].participant_id`, Q.name = `field_rules[${H}].from_page`, Z.name = `field_rules[${H}].to_page`, be.name = `field_rules[${H}].page`, xe.name = `field_rules[${H}].required`, Pe.name = `field_rules[${H}].exclude_last_page`, Re.name = `field_rules[${H}].exclude_pages`;
    const w = Jt(M, ae);
    ye.value = w.type || "initials_each_page", nt(ge, s(), w.participantId), Q.value = String(w.fromPage > 0 ? w.fromPage : 1), Z.value = String(w.toPage > 0 ? w.toPage : ae), be.value = String(w.page > 0 ? w.page : ae), xe.value = w.required ? "1" : "0", Pe.checked = w.excludeLastPage, Re.value = w.excludePages.join(",");
    const I = () => {
      st(N), Je(), r?.();
    }, U = () => {
      const z = n();
      if (Q) {
        const ie = parseInt(Q.value, 10);
        Number.isFinite(ie) && (Q.value = String(Ft(ie, z, 1)));
      }
      if (Z) {
        const ie = parseInt(Z.value, 10);
        Number.isFinite(ie) && (Z.value = String(Ft(ie, z, 1)));
      }
      if (be) {
        const ie = parseInt(be.value, 10);
        Number.isFinite(ie) && (be.value = String(Ft(ie, z, 1)));
      }
    }, O = () => {
      U(), I();
    };
    ye.addEventListener("change", I), ge.addEventListener("change", I), Q.addEventListener("input", O), Q.addEventListener("change", O), Z.addEventListener("input", O), Z.addEventListener("change", O), be.addEventListener("input", O), be.addEventListener("change", O), xe.addEventListener("change", I), Pe.addEventListener("change", () => {
      const z = n();
      Z.value = String(Pe.checked ? Math.max(1, z - 1) : z), I();
    }), Re.addEventListener("input", I), v.addEventListener("click", () => {
      N.remove(), We(), Je(), r?.();
    }), y.appendChild(R), st(y.lastElementChild || N), We(), Je();
  }
  function q(M = {}) {
    if (!(D instanceof HTMLTemplateElement) || !x) return;
    const R = D.content.cloneNode(!0), N = R.querySelector(".field-definition-entry");
    if (!(N instanceof HTMLElement)) return;
    const F = String(M.id || le()).trim() || le();
    N.setAttribute("data-field-definition-id", F);
    const H = qe(N, ".field-definition-id-input"), ae = pt(N, 'select[name="field_definitions[].type"]'), ce = pt(N, 'select[name="field_definitions[].participant_id"]'), ye = qe(N, 'input[name="field_definitions[].page"]'), ge = qe(N, 'input[name="field_definitions[].required"]'), Q = At(N, ".field-date-signed-info");
    if (!H || !ae || !ce || !ye || !ge || !Q) return;
    const Z = fe++;
    H.name = `field_instances[${Z}].id`, H.value = F, ae.name = `field_instances[${Z}].type`, ce.name = `field_instances[${Z}].participant_id`, ye.name = `field_instances[${Z}].page`, ge.name = `field_instances[${Z}].required`, M.type && (ae.value = String(M.type)), M.page !== void 0 && (ye.value = String(Ft(M.page, n(), 1))), M.required !== void 0 && (ge.checked = !!M.required);
    const be = String(M.participant_id || M.participantId || "").trim();
    nt(ce, s(), be), ae.addEventListener("change", () => {
      ae.value === "date_signed" ? Q.classList.remove("hidden") : Q.classList.add("hidden");
    }), ae.value === "date_signed" && Q.classList.remove("hidden"), Yn(N, ".remove-field-definition-btn")?.addEventListener("click", () => {
      N.remove(), rt(), c?.();
    });
    const xe = qe(N, 'input[name*=".page"]'), Pe = () => {
      xe && (xe.value = String(Ft(xe.value, n(), 1)));
    };
    Pe(), xe?.addEventListener("input", Pe), xe?.addEventListener("change", Pe), x.appendChild(R), rt();
  }
  function we() {
    C?.addEventListener("click", () => q()), L?.addEventListener("click", () => q()), _?.addEventListener("click", () => se({ to_page: n() })), h?.();
  }
  function Ye() {
    const M = [];
    window._initialFieldPlacementsData = M, e.forEach((R) => {
      const N = String(R.id || "").trim();
      if (!N) return;
      const F = String(R.type || "signature").trim() || "signature", H = String(R.participant_id || R.participantId || "").trim(), ae = Number(R.page || 1) || 1, ce = !!R.required;
      q({
        id: N,
        type: F,
        participant_id: H,
        page: ae,
        required: ce
      }), M.push(Ht({
        id: N,
        definitionId: N,
        type: F,
        participantId: H,
        participantName: String(R.participant_name || R.participantName || "").trim(),
        page: ae,
        x: Number(R.x || R.pos_x || 0) || 0,
        y: Number(R.y || R.pos_y || 0) || 0,
        width: Number(R.width || 150) || 150,
        height: Number(R.height || 32) || 32,
        placementSource: String(R.placement_source || R.placementSource || t.MANUAL).trim() || t.MANUAL
      }, M.length));
    }), rt(), ke(), We(), Je();
  }
  function ve() {
    const M = window._initialFieldPlacementsData;
    return Array.isArray(M) ? M.map((R, N) => Ht(R, N)) : [];
  }
  function Ae() {
    if (!x) return [];
    const M = s(), R = new Map(M.map((Q) => [String(Q.id), Q.name || Q.email || "Signer"])), N = [];
    x.querySelectorAll(".field-definition-entry").forEach((Q) => {
      const Z = String(Q.getAttribute("data-field-definition-id") || "").trim(), be = pt(Q, ".field-type-select"), xe = pt(Q, ".field-participant-select"), Pe = qe(Q, 'input[name*=".page"]'), Re = String(be?.value || "text").trim() || "text", v = String(xe?.value || "").trim(), w = parseInt(String(Pe?.value || "1"), 10) || 1;
      N.push({
        definitionId: Z,
        fieldType: Re,
        participantId: v,
        participantName: R.get(v) || "Unassigned",
        page: w
      });
    });
    const H = De(_e(), n()), ae = /* @__PURE__ */ new Map();
    H.forEach((Q) => {
      const Z = String(Q.ruleId || "").trim(), be = String(Q.id || "").trim();
      if (Z && be) {
        const xe = ae.get(Z) || [];
        xe.push(be), ae.set(Z, xe);
      }
    });
    let ce = g();
    ae.forEach((Q, Z) => {
      if (Q.length > 1 && !ce.groups.get(`rule_${Z}`)) {
        const xe = Us(Q, `Rule ${Z}`);
        xe.id = `rule_${Z}`, ce = gi(ce, xe);
      }
    }), b(ce), H.forEach((Q) => {
      const Z = String(Q.id || "").trim();
      if (!Z) return;
      const be = String(Q.participantId || "").trim(), xe = parseInt(String(Q.page || "1"), 10) || 1, Pe = String(Q.ruleId || "").trim();
      N.push({
        definitionId: Z,
        fieldType: String(Q.type || "text").trim() || "text",
        participantId: be,
        participantName: R.get(be) || "Unassigned",
        page: xe,
        linkGroupId: Pe ? `rule_${Pe}` : void 0
      });
    });
    const ye = /* @__PURE__ */ new Set(), ge = N.filter((Q) => {
      const Z = String(Q.definitionId || "").trim();
      return !Z || ye.has(Z) ? !1 : (ye.add(Z), !0);
    });
    return ge.sort((Q, Z) => Q.page !== Z.page ? Q.page - Z.page : Q.definitionId.localeCompare(Z.definitionId)), ge;
  }
  function Me(M) {
    const R = String(M || "").trim();
    if (!R) return null;
    const F = Ae().find((H) => String(H.definitionId || "").trim() === R);
    return F ? {
      id: R,
      type: String(F.fieldType || "text").trim() || "text",
      participant_id: String(F.participantId || "").trim(),
      participant_name: String(F.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(F.page || "1"), 10) || 1,
      link_group_id: String(F.linkGroupId || "").trim()
    } : null;
  }
  function Ke() {
    if (!x) return [];
    const M = s(), R = /* @__PURE__ */ new Map();
    return M.forEach((H) => R.set(H.id, !1)), x.querySelectorAll(".field-definition-entry").forEach((H) => {
      const ae = pt(H, ".field-type-select"), ce = pt(H, ".field-participant-select"), ye = qe(H, 'input[name*=".required"]');
      ae?.value === "signature" && ce?.value && ye?.checked && R.set(ce.value, !0);
    }), De(_e(), n()).forEach((H) => {
      H.type === "signature" && H.participantId && H.required && R.set(H.participantId, !0);
    }), M.filter((H) => !R.get(H.id));
  }
  function Fe(M) {
    if (!Array.isArray(M) || M.length === 0)
      return "Each signer requires at least one required signature field.";
    const R = M.map((N) => N?.name?.trim()).filter(Boolean);
    return R.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${R.join(", ")}`;
  }
  function Qe(M) {
    !x || !M?.fieldDefinitions || M.fieldDefinitions.length === 0 || (x.innerHTML = "", fe = 0, M.fieldDefinitions.forEach((R) => {
      q({
        id: R.tempId,
        type: R.type,
        participant_id: R.participantTempId,
        page: R.page,
        required: R.required
      });
    }), rt());
  }
  function at(M) {
    !Array.isArray(M?.fieldRules) || M.fieldRules.length === 0 || y && (y.querySelectorAll(".field-rule-entry").forEach((R) => R.remove()), oe = 0, M.fieldRules.forEach((R) => {
      se({
        id: R.id,
        type: R.type,
        participantId: R.participantId || R.participantTempId,
        fromPage: R.fromPage,
        toPage: R.toPage,
        page: R.page,
        excludeLastPage: R.excludeLastPage,
        excludePages: R.excludePages,
        required: R.required
      });
    }), We(), Je());
  }
  return {
    refs: {
      fieldDefinitionsContainer: x,
      fieldRulesContainer: y,
      addFieldBtn: C,
      fieldPlacementsJSONInput: V,
      fieldRulesJSONInput: de
    },
    bindEvents: we,
    initialize: Ye,
    buildInitialPlacementInstances: ve,
    collectFieldDefinitionsForState: $e,
    collectFieldRulesForState: _e,
    collectFieldRulesForForm: ue,
    expandRulesForPreview: De,
    renderFieldRulePreview: Je,
    updateFieldParticipantOptions: ke,
    collectPlacementFieldDefinitions: Ae,
    getFieldDefinitionById: Me,
    findSignersMissingRequiredSignatureField: Ke,
    missingSignatureFieldMessage: Fe,
    restoreFieldDefinitionsFromState: Qe,
    restoreFieldRulesFromState: at
  };
}
function zs(i) {
  return typeof i == "object" && i !== null && "run" in i;
}
const Dt = {
  signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
  name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
  date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
  text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
  checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
  initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
}, Vt = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};
function js(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentIdInput: n,
    fieldPlacementsJSONInput: s,
    initialFieldInstances: o = [],
    initialLinkGroupState: c = null,
    collectPlacementFieldDefinitions: r,
    getFieldDefinitionById: h,
    parseAPIError: g,
    mapUserFacingError: b,
    showToast: x,
    escapeHtml: D,
    onPlacementsChanged: C
  } = i, f = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(o) ? o.map((v, w) => Ht(v, w)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: c || en()
  }, L = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function S(v = "fi") {
    return `${v}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function y(v) {
    return document.querySelector(`.placement-field-item[data-definition-id="${v}"]`);
  }
  function T() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function _(v, w) {
    return v.querySelector(w);
  }
  function X(v, w) {
    return v.querySelector(w);
  }
  function W() {
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
  function de() {
    return f;
  }
  function V() {
    return f.linkGroupState;
  }
  function ne(v) {
    f.linkGroupState = v || en();
  }
  function fe() {
    return f.fieldInstances.map((v, w) => Rs(v, w));
  }
  function oe(v = {}) {
    const { silent: w = !1 } = v, I = W();
    I.fieldInstancesContainer && (I.fieldInstancesContainer.innerHTML = "");
    const U = fe();
    return s && (s.value = JSON.stringify(U)), w || C?.(), U;
  }
  function le() {
    const v = W(), w = Array.from(document.querySelectorAll(".placement-field-item")), I = w.length, U = new Set(
      w.map((re) => String(re.dataset.definitionId || "").trim()).filter((re) => re)
    ), O = /* @__PURE__ */ new Set();
    f.fieldInstances.forEach((re) => {
      const Ie = String(re.definitionId || "").trim();
      U.has(Ie) && O.add(Ie);
    });
    const z = O.size, ie = Math.max(0, I - z);
    v.totalFields && (v.totalFields.textContent = String(I)), v.placedCount && (v.placedCount.textContent = String(z)), v.unplacedCount && (v.unplacedCount.textContent = String(ie));
  }
  function Oe(v, w = !1) {
    const I = y(v);
    if (!I) return;
    I.classList.add("opacity-50"), I.draggable = !1;
    const U = I.querySelector(".placement-status");
    U && (U.textContent = "Placed", U.classList.remove("text-amber-600"), U.classList.add("text-green-600")), w && I.classList.add("just-linked");
  }
  function Ze(v) {
    const w = y(v);
    if (!w) return;
    w.classList.remove("opacity-50"), w.draggable = !0;
    const I = w.querySelector(".placement-status");
    I && (I.textContent = "Not placed", I.classList.remove("text-green-600"), I.classList.add("text-amber-600"));
  }
  function nt() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((w) => {
      w.classList.add("linked-flash"), setTimeout(() => {
        w.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function it(v) {
    const w = v === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${v} linked fields`;
    window.toastManager?.info?.(w);
    const I = document.createElement("div");
    I.setAttribute("role", "status"), I.setAttribute("aria-live", "polite"), I.className = "sr-only", I.textContent = w, document.body.appendChild(I), setTimeout(() => I.remove(), 1e3), nt();
  }
  function rt(v, w) {
    const I = document.createElement("div");
    I.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", I.dataset.definitionId = v, I.dataset.isLinked = String(w), I.title = w ? "Click to unlink this field" : "Click to re-link this field", I.setAttribute("role", "button"), I.setAttribute("aria-label", w ? "Unlink field from group" : "Re-link field to group"), I.setAttribute("tabindex", "0"), w ? I.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : I.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const U = () => Je(v, w);
    return I.addEventListener("click", U), I.addEventListener("keydown", (O) => {
      (O.key === "Enter" || O.key === " ") && (O.preventDefault(), U());
    }), I;
  }
  function We() {
    const v = W();
    if (v.linkAllBtn && (v.linkAllBtn.disabled = f.linkGroupState.unlinkedDefinitions.size === 0), v.unlinkAllBtn) {
      let w = !1;
      for (const I of f.linkGroupState.definitionToGroup.keys())
        if (!f.linkGroupState.unlinkedDefinitions.has(I)) {
          w = !0;
          break;
        }
      v.unlinkAllBtn.disabled = !w;
    }
  }
  function $e() {
    const v = W();
    v.linkAllBtn && !v.linkAllBtn.dataset.bound && (v.linkAllBtn.dataset.bound = "true", v.linkAllBtn.addEventListener("click", () => {
      const w = f.linkGroupState.unlinkedDefinitions.size;
      if (w !== 0) {
        for (const I of f.linkGroupState.unlinkedDefinitions)
          f.linkGroupState = Jn(f.linkGroupState, I);
        window.toastManager && window.toastManager.success(`Re-linked ${w} field${w > 1 ? "s" : ""}`), De();
      }
    })), v.unlinkAllBtn && !v.unlinkAllBtn.dataset.bound && (v.unlinkAllBtn.dataset.bound = "true", v.unlinkAllBtn.addEventListener("click", () => {
      let w = 0;
      for (const I of f.linkGroupState.definitionToGroup.keys())
        f.linkGroupState.unlinkedDefinitions.has(I) || (f.linkGroupState = Wn(f.linkGroupState, I), w += 1);
      w > 0 && window.toastManager && window.toastManager.success(`Unlinked ${w} field${w > 1 ? "s" : ""}`), De();
    })), We();
  }
  function _e() {
    return r().map((w) => {
      const I = String(w.definitionId || "").trim(), U = f.linkGroupState.definitionToGroup.get(I) || "", O = f.linkGroupState.unlinkedDefinitions.has(I);
      return { ...w, definitionId: I, linkGroupId: U, isUnlinked: O };
    });
  }
  function ue() {
    const v = W();
    if (!v.fieldsList) return;
    v.fieldsList.innerHTML = "";
    const w = _e();
    v.linkBatchActions && v.linkBatchActions.classList.toggle("hidden", f.linkGroupState.groups.size === 0), w.forEach((I, U) => {
      const O = I.definitionId, z = String(I.fieldType || "text").trim() || "text", ie = String(I.participantId || "").trim(), re = String(I.participantName || "Unassigned").trim() || "Unassigned", Ie = Number.parseInt(String(I.page || "1"), 10) || 1, Ue = I.linkGroupId, Se = I.isUnlinked;
      if (!O) return;
      f.fieldInstances.forEach((Y) => {
        Y.definitionId === O && (Y.type = z, Y.participantId = ie, Y.participantName = re);
      });
      const He = Dt[z] || Dt.text, et = f.fieldInstances.some((Y) => Y.definitionId === O), Ne = document.createElement("div");
      Ne.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${et ? "opacity-50" : ""}`, Ne.draggable = !et, Ne.dataset.definitionId = O, Ne.dataset.fieldType = z, Ne.dataset.participantId = ie, Ne.dataset.participantName = re, Ne.dataset.page = String(Ie), Ue && (Ne.dataset.linkGroupId = Ue);
      const mt = document.createElement("span");
      mt.className = `w-3 h-3 rounded ${He.bg}`;
      const P = document.createElement("div");
      P.className = "flex-1 text-xs";
      const $ = document.createElement("div");
      $.className = "font-medium capitalize", $.textContent = z.replace(/_/g, " ");
      const B = document.createElement("div");
      B.className = "text-gray-500", B.textContent = re;
      const J = document.createElement("span");
      J.className = `placement-status text-xs ${et ? "text-green-600" : "text-amber-600"}`, J.textContent = et ? "Placed" : "Not placed", P.appendChild($), P.appendChild(B), Ne.appendChild(mt), Ne.appendChild(P), Ne.appendChild(J), Ne.addEventListener("dragstart", (Y) => {
        if (et) {
          Y.preventDefault();
          return;
        }
        Y.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: O,
          fieldType: z,
          participantId: ie,
          participantName: re
        })), Y.dataTransfer && (Y.dataTransfer.effectAllowed = "copy"), Ne.classList.add("opacity-50");
      }), Ne.addEventListener("dragend", () => {
        Ne.classList.remove("opacity-50");
      }), v.fieldsList?.appendChild(Ne);
      const ee = w[U + 1];
      Ue && ee && ee.linkGroupId === Ue && v.fieldsList?.appendChild(rt(O, !Se));
    }), $e(), le();
  }
  function De() {
    ue();
  }
  function Je(v, w) {
    w ? (f.linkGroupState = Wn(f.linkGroupState, v), window.toastManager?.info?.("Field unlinked")) : (f.linkGroupState = Jn(f.linkGroupState, v), window.toastManager?.info?.("Field re-linked")), De();
  }
  async function ke(v) {
    const w = f.pdfDoc;
    if (!w) return;
    const I = W();
    if (!I.canvas || !I.canvasContainer) return;
    const U = I.canvas.getContext("2d"), O = await w.getPage(v), z = O.getViewport({ scale: f.scale });
    I.canvas.width = z.width, I.canvas.height = z.height, I.canvasContainer.style.width = `${z.width}px`, I.canvasContainer.style.height = `${z.height}px`, await O.render({
      canvasContext: U,
      viewport: z
    }).promise, I.currentPage && (I.currentPage.textContent = String(v)), we();
  }
  function st(v) {
    const w = Hs(f.linkGroupState, v);
    w && (f.linkGroupState = gi(f.linkGroupState, w.updatedGroup));
  }
  function se(v) {
    const w = /* @__PURE__ */ new Map();
    r().forEach((U) => {
      const O = String(U.definitionId || "").trim();
      O && w.set(O, {
        type: String(U.fieldType || "text").trim() || "text",
        participantId: String(U.participantId || "").trim(),
        participantName: String(U.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(U.page || "1"), 10) || 1,
        linkGroupId: f.linkGroupState.definitionToGroup.get(O)
      });
    });
    let I = 0;
    for (; I < 10; ) {
      const U = Os(
        f.linkGroupState,
        v,
        f.fieldInstances,
        w
      );
      if (!U || !U.newPlacement) break;
      f.fieldInstances.push(U.newPlacement), Oe(U.newPlacement.definitionId, !0), I += 1;
    }
    I > 0 && (we(), le(), oe(), it(I));
  }
  function q(v) {
    st(v);
  }
  function we() {
    const w = W().overlays;
    w && (w.innerHTML = "", w.style.pointerEvents = "auto", f.fieldInstances.filter((I) => I.page === f.currentPage).forEach((I) => {
      const U = Dt[I.type] || Dt.text, O = f.selectedFieldId === I.id, z = I.placementSource === gt.AUTO_LINKED, ie = document.createElement("div"), re = z ? "border-dashed" : "border-solid";
      ie.className = `field-overlay absolute cursor-move ${U.border} border-2 ${re} rounded`, ie.style.cssText = `
          left: ${I.x * f.scale}px;
          top: ${I.y * f.scale}px;
          width: ${I.width * f.scale}px;
          height: ${I.height * f.scale}px;
          background-color: ${U.fill};
          ${O ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, ie.dataset.instanceId = I.id;
      const Ie = document.createElement("div");
      if (Ie.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${U.bg}`, Ie.textContent = `${I.type.replace("_", " ")} - ${I.participantName}`, ie.appendChild(Ie), z) {
        const He = document.createElement("div");
        He.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", He.title = "Auto-linked from template", He.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, ie.appendChild(He);
      }
      const Ue = document.createElement("div");
      Ue.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Ue.style.cssText = "transform: translate(50%, 50%);", ie.appendChild(Ue);
      const Se = document.createElement("button");
      Se.type = "button", Se.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", Se.innerHTML = "×", Se.addEventListener("click", (He) => {
        He.stopPropagation(), Ke(I.id);
      }), ie.appendChild(Se), ie.addEventListener("mousedown", (He) => {
        He.target === Ue ? Me(He, I) : He.target !== Se && Ae(He, I, ie);
      }), ie.addEventListener("click", () => {
        f.selectedFieldId = I.id, we();
      }), w.appendChild(ie);
    }));
  }
  function Ye(v, w, I, U = {}) {
    const O = Vt[v.fieldType] || Vt.text, z = U.placementSource || gt.MANUAL, ie = U.linkGroupId || mi(f.linkGroupState, v.definitionId)?.id, re = {
      id: S("fi"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: f.currentPage,
      x: Math.max(0, w - O.width / 2),
      y: Math.max(0, I - O.height / 2),
      width: O.width,
      height: O.height,
      placementSource: z,
      linkGroupId: ie,
      linkedFromFieldId: U.linkedFromFieldId
    };
    f.fieldInstances.push(re), Oe(v.definitionId), z === gt.MANUAL && ie && q(re), we(), le(), oe();
  }
  function ve(v, w) {
    const I = {
      id: S("instance"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
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
    f.fieldInstances.push(I), Oe(v.definitionId), we(), le(), oe();
  }
  function Ae(v, w, I) {
    v.preventDefault(), f.isDragging = !0, f.selectedFieldId = w.id;
    const U = v.clientX, O = v.clientY, z = w.x * f.scale, ie = w.y * f.scale;
    function re(Ue) {
      const Se = Ue.clientX - U, He = Ue.clientY - O;
      w.x = Math.max(0, (z + Se) / f.scale), w.y = Math.max(0, (ie + He) / f.scale), w.placementSource = gt.MANUAL, I.style.left = `${w.x * f.scale}px`, I.style.top = `${w.y * f.scale}px`;
    }
    function Ie() {
      f.isDragging = !1, document.removeEventListener("mousemove", re), document.removeEventListener("mouseup", Ie), oe();
    }
    document.addEventListener("mousemove", re), document.addEventListener("mouseup", Ie);
  }
  function Me(v, w) {
    v.preventDefault(), v.stopPropagation(), f.isResizing = !0;
    const I = v.clientX, U = v.clientY, O = w.width, z = w.height;
    function ie(Ie) {
      const Ue = (Ie.clientX - I) / f.scale, Se = (Ie.clientY - U) / f.scale;
      w.width = Math.max(30, O + Ue), w.height = Math.max(20, z + Se), w.placementSource = gt.MANUAL, we();
    }
    function re() {
      f.isResizing = !1, document.removeEventListener("mousemove", ie), document.removeEventListener("mouseup", re), oe();
    }
    document.addEventListener("mousemove", ie), document.addEventListener("mouseup", re);
  }
  function Ke(v) {
    const w = f.fieldInstances.find((I) => I.id === v);
    w && (f.fieldInstances = f.fieldInstances.filter((I) => I.id !== v), Ze(w.definitionId), we(), le(), oe());
  }
  function Fe(v, w) {
    const U = W().canvas;
    !v || !U || (v.addEventListener("dragover", (O) => {
      O.preventDefault(), O.dataTransfer && (O.dataTransfer.dropEffect = "copy"), U.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("dragleave", () => {
      U.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("drop", (O) => {
      O.preventDefault(), U.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const z = O.dataTransfer?.getData("application/json") || "";
      if (!z) return;
      const ie = JSON.parse(z), re = U.getBoundingClientRect(), Ie = (O.clientX - re.left) / f.scale, Ue = (O.clientY - re.top) / f.scale;
      Ye(ie, Ie, Ue);
    }));
  }
  function Qe() {
    const v = W();
    v.prevBtn?.addEventListener("click", async () => {
      f.currentPage > 1 && (f.currentPage -= 1, se(f.currentPage), await ke(f.currentPage));
    }), v.nextBtn?.addEventListener("click", async () => {
      f.currentPage < f.totalPages && (f.currentPage += 1, se(f.currentPage), await ke(f.currentPage));
    });
  }
  function at() {
    const v = W();
    v.zoomIn?.addEventListener("click", async () => {
      f.scale = Math.min(3, f.scale + 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await ke(f.currentPage);
    }), v.zoomOut?.addEventListener("click", async () => {
      f.scale = Math.max(0.5, f.scale - 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await ke(f.currentPage);
    }), v.zoomFit?.addEventListener("click", async () => {
      if (!f.pdfDoc || !v.viewer) return;
      const I = (await f.pdfDoc.getPage(f.currentPage)).getViewport({ scale: 1 });
      f.scale = (v.viewer.clientWidth - 40) / I.width, v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await ke(f.currentPage);
    });
  }
  function M() {
    return W().policyPreset?.value || "balanced";
  }
  function R(v) {
    return v >= 0.8 ? "bg-green-100 text-green-800" : v >= 0.6 ? "bg-blue-100 text-blue-800" : v >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function N(v) {
    return v >= 0.9 ? "bg-green-100 text-green-800" : v >= 0.7 ? "bg-blue-100 text-blue-800" : v >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function F(v) {
    return v ? v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Unknown";
  }
  function H(v) {
    v.page_number !== f.currentPage && (f.currentPage = v.page_number, ke(v.page_number));
    const w = W().overlays;
    if (!w) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const I = document.createElement("div");
    I.id = "suggestion-preview-overlay", I.className = "absolute pointer-events-none animate-pulse", I.style.cssText = `
      left: ${v.x * f.scale}px;
      top: ${v.y * f.scale}px;
      width: ${v.width * f.scale}px;
      height: ${v.height * f.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, w.appendChild(I), setTimeout(() => I.remove(), 3e3);
  }
  async function ae(v, w) {
  }
  function ce() {
    const v = document.getElementById("placement-suggestions-modal");
    if (!v) return;
    const w = v.querySelectorAll('.suggestion-item[data-accepted="true"]');
    w.forEach((I) => {
      const U = Number.parseInt(I.dataset.index || "", 10), O = L.suggestions[U];
      if (!O) return;
      const z = h(O.field_definition_id);
      if (!z) return;
      const ie = y(O.field_definition_id);
      if (!ie || ie.classList.contains("opacity-50")) return;
      const re = {
        definitionId: O.field_definition_id,
        fieldType: z.type,
        participantId: z.participant_id,
        participantName: ie.dataset.participantName || z.participant_name || "Unassigned"
      };
      f.currentPage = O.page_number, ve(re, O);
    }), f.pdfDoc && ke(f.currentPage), ae(w.length, L.suggestions.length - w.length), x(`Applied ${w.length} placement${w.length !== 1 ? "s" : ""}`, "success");
  }
  function ye(v) {
    v.querySelectorAll(".accept-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const I = w.closest(".suggestion-item");
        I && (I.classList.add("border-green-500", "bg-green-50"), I.classList.remove("border-red-500", "bg-red-50"), I.dataset.accepted = "true");
      });
    }), v.querySelectorAll(".reject-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const I = w.closest(".suggestion-item");
        I && (I.classList.add("border-red-500", "bg-red-50"), I.classList.remove("border-green-500", "bg-green-50"), I.dataset.accepted = "false");
      });
    }), v.querySelectorAll(".preview-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const I = Number.parseInt(w.dataset.index || "", 10), U = L.suggestions[I];
        U && H(U);
      });
    });
  }
  function ge() {
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
    `, _(v, "#close-suggestions-modal")?.addEventListener("click", () => {
      v.classList.add("hidden");
    }), v.addEventListener("click", (w) => {
      w.target === v && v.classList.add("hidden");
    }), _(v, "#accept-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-green-500", "bg-green-50"), w.classList.remove("border-red-500", "bg-red-50"), w.dataset.accepted = "true";
      });
    }), _(v, "#reject-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-red-500", "bg-red-50"), w.classList.remove("border-green-500", "bg-green-50"), w.dataset.accepted = "false";
      });
    }), _(v, "#apply-suggestions-btn")?.addEventListener("click", () => {
      ce(), v.classList.add("hidden");
    }), _(v, "#rerun-placement-btn")?.addEventListener("click", () => {
      v.classList.add("hidden");
      const w = X(v, "#placement-policy-preset-modal"), I = W().policyPreset;
      I && w && (I.value = w.value), W().autoPlaceBtn?.click();
    }), v;
  }
  function Q(v) {
    let w = document.getElementById("placement-suggestions-modal");
    w || (w = ge(), document.body.appendChild(w));
    const I = X(w, "#suggestions-list"), U = X(w, "#resolver-info"), O = X(w, "#run-stats");
    !I || !U || !O || (U.innerHTML = L.resolverScores.map((z) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${D(String(z?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${z.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${R(Number(z.score || 0))}">
              ${(Number(z?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), O.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${D(String(v?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${v.status === "completed" ? "text-green-600" : "text-amber-600"}">${D(String(v?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(v?.elapsed_ms || 0))}ms</span>
      </div>
    `, I.innerHTML = L.suggestions.map((z, ie) => {
      const re = h(z.field_definition_id), Ie = Dt[re?.type || "text"] || Dt.text, Ue = D(String(re?.type || "field").replace(/_/g, " ")), Se = D(String(z?.id || "")), He = Math.max(1, Number(z?.page_number || 1)), et = Math.round(Number(z?.x || 0)), Ne = Math.round(Number(z?.y || 0)), mt = Math.max(0, Number(z?.confidence || 0)), P = D(F(String(z?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${ie}" data-suggestion-id="${Se}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Ie.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Ue}</div>
                <div class="text-xs text-gray-500">Page ${He}, (${et}, ${Ne})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${N(Number(z.confidence || 0))}">
                ${(mt * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${P}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${ie}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${ie}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${ie}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), ye(w), w.classList.remove("hidden"));
  }
  function Z() {
    const v = T();
    let w = 100;
    v.forEach((I) => {
      const U = {
        definitionId: I.dataset.definitionId || "",
        fieldType: I.dataset.fieldType || "text",
        participantId: I.dataset.participantId || "",
        participantName: I.dataset.participantName || "Unassigned"
      }, O = Vt[U.fieldType || "text"] || Vt.text;
      f.currentPage = f.totalPages, Ye(U, 300, w + O.height / 2, { placementSource: gt.AUTO_FALLBACK }), w += O.height + 20;
    }), f.pdfDoc && ke(f.totalPages), x("Fields placed using fallback layout", "info");
  }
  async function be() {
    const v = W();
    if (!v.autoPlaceBtn || L.isRunning) return;
    if (T().length === 0) {
      x("All fields are already placed", "info");
      return;
    }
    const I = document.querySelector('input[name="id"]')?.value;
    if (!I) {
      Z();
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
      const U = await fetch(`${t}/esign/agreements/${I}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: M()
        })
      });
      if (!U.ok)
        throw await g(U, "Auto-placement failed");
      const O = await U.json(), z = zs(O) ? O.run || {} : O;
      L.currentRunId = z?.run_id || z?.id || null, L.suggestions = z?.suggestions || [], L.resolverScores = z?.resolver_scores || [], L.suggestions.length === 0 ? (x("No placement suggestions found. Try placing fields manually.", "warning"), Z()) : Q(z);
    } catch (U) {
      console.error("Auto-place error:", U);
      const O = U && typeof U == "object" ? U : {}, z = b(O.message || "Auto-placement failed", O.code || "", O.status || 0);
      x(`Auto-placement failed: ${z}`, "error"), Z();
    } finally {
      L.isRunning = !1, v.autoPlaceBtn.disabled = !1, v.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function xe() {
    const v = W();
    v.autoPlaceBtn && !f.autoPlaceBound && (v.autoPlaceBtn.addEventListener("click", () => {
      be();
    }), f.autoPlaceBound = !0);
  }
  async function Pe() {
    const v = W();
    if (!n?.value) {
      v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden");
      return;
    }
    v.loading?.classList.remove("hidden"), v.noDocument?.classList.add("hidden");
    const w = r(), I = new Set(
      w.map((re) => String(re.definitionId || "").trim()).filter((re) => re)
    );
    f.fieldInstances = f.fieldInstances.filter(
      (re) => I.has(String(re.definitionId || "").trim())
    ), ue();
    const U = ++f.loadRequestVersion, O = String(n.value || "").trim(), z = encodeURIComponent(O), ie = `${e}/panels/esign_documents/${z}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const Ie = await window.pdfjsLib.getDocument({
        url: ie,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (U !== f.loadRequestVersion)
        return;
      f.pdfDoc = Ie, f.totalPages = f.pdfDoc.numPages, f.currentPage = 1, v.totalPages && (v.totalPages.textContent = String(f.totalPages)), await ke(f.currentPage), v.loading?.classList.add("hidden"), f.uiHandlersBound || (Fe(v.viewer, v.overlays), Qe(), at(), f.uiHandlersBound = !0), we();
    } catch (re) {
      if (U !== f.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", re), v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden"), v.noDocument) {
        const Ie = re && typeof re == "object" ? re : {};
        v.noDocument.textContent = `Failed to load PDF: ${b(Ie.message || "Failed to load PDF")}`;
      }
    }
    le(), oe({ silent: !0 });
  }
  function Re(v) {
    const w = Array.isArray(v?.fieldPlacements) ? v.fieldPlacements : [];
    f.fieldInstances = w.map((I, U) => Ht(I, U)), oe({ silent: !0 });
  }
  return oe({ silent: !0 }), {
    bindEvents: xe,
    initPlacementEditor: Pe,
    getState: de,
    getLinkGroupState: V,
    setLinkGroupState: ne,
    buildPlacementFormEntries: fe,
    updateFieldInstancesFormData: oe,
    restoreFieldPlacementsFromState: Re
  };
}
function Pt(i, e, t = "") {
  return String(i.querySelector(e)?.value || t).trim();
}
function Kn(i, e, t = !1) {
  const n = i.querySelector(e);
  return n ? n.checked : t;
}
function qs(i) {
  const {
    documentIdInput: e,
    documentPageCountInput: t,
    titleInput: n,
    messageInput: s,
    participantsContainer: o,
    fieldDefinitionsContainer: c,
    fieldPlacementsJSONInput: r,
    fieldRulesJSONInput: h,
    collectFieldRulesForForm: g,
    buildPlacementFormEntries: b,
    getCurrentStep: x,
    totalWizardSteps: D
  } = i;
  function C() {
    const f = [];
    o.querySelectorAll(".participant-entry").forEach((T) => {
      const _ = String(T.getAttribute("data-participant-id") || "").trim(), X = Pt(T, 'input[name*=".name"]'), W = Pt(T, 'input[name*=".email"]'), de = Pt(T, 'select[name*=".role"]', "signer"), V = Kn(T, ".notify-input", !0), ne = Pt(T, ".signing-stage-input"), fe = Number(ne || "1") || 1;
      f.push({
        id: _,
        name: X,
        email: W,
        role: de,
        notify: V,
        signing_stage: de === "signer" ? fe : 0
      });
    });
    const L = [];
    c.querySelectorAll(".field-definition-entry").forEach((T) => {
      const _ = String(T.getAttribute("data-field-definition-id") || "").trim(), X = Pt(T, ".field-type-select", "signature"), W = Pt(T, ".field-participant-select"), de = Number(Pt(T, 'input[name*=".page"]', "1")) || 1, V = Kn(T, 'input[name*=".required"]');
      _ && L.push({
        id: _,
        type: X,
        participant_id: W,
        page: de,
        required: V
      });
    });
    const S = b(), y = JSON.stringify(S);
    return r && (r.value = y), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(s?.value || "").trim(),
      participants: f,
      field_instances: L,
      field_placements: S,
      field_placements_json: y,
      field_rules: g(),
      field_rules_json: String(h?.value || "[]"),
      send_for_signature: x() === D ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(t?.value || "0") || 0
    };
  }
  return {
    buildCanonicalAgreementPayload: C
  };
}
function Vs(i) {
  const {
    titleSource: e,
    stateManager: t,
    trackWizardStateChanges: n,
    participantsController: s,
    fieldDefinitionsController: o,
    placementController: c,
    updateFieldParticipantOptions: r,
    previewCard: h,
    wizardNavigationController: g,
    documentIdInput: b,
    documentPageCountInput: x,
    selectedDocumentTitle: D,
    agreementRefs: C,
    parsePositiveInt: f,
    isEditMode: L
  } = i;
  let S = null;
  function y() {
    S !== null && clearTimeout(S), S = setTimeout(() => {
      n();
    }, 500);
  }
  function T() {
    s.restoreFromState(t.getState());
  }
  function _() {
    o.restoreFieldDefinitionsFromState(t.getState());
  }
  function X() {
    o.restoreFieldRulesFromState(t.getState());
  }
  function W() {
    c.restoreFieldPlacementsFromState(t.getState());
  }
  function de() {
    b && new MutationObserver(() => {
      n();
    }).observe(b, { attributes: !0, attributeFilter: ["value"] });
    const ne = document.getElementById("title"), fe = document.getElementById("message");
    ne instanceof HTMLInputElement && ne.addEventListener("input", () => {
      const oe = String(ne.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(oe), y();
    }), (fe instanceof HTMLInputElement || fe instanceof HTMLTextAreaElement) && fe.addEventListener("input", y), s.refs.participantsContainer?.addEventListener("input", y), s.refs.participantsContainer?.addEventListener("change", y), o.refs.fieldDefinitionsContainer?.addEventListener("input", y), o.refs.fieldDefinitionsContainer?.addEventListener("change", y), o.refs.fieldRulesContainer?.addEventListener("input", y), o.refs.fieldRulesContainer?.addEventListener("change", y);
  }
  function V() {
    if (window._resumeToStep) {
      T(), _(), X(), r(), W();
      const ne = t.getState();
      ne.document?.id && h.setDocument(
        ne.document.id,
        ne.document.title || null,
        ne.document.pageCount ?? null
      ), g.setCurrentStep(window._resumeToStep), g.updateWizardUI(), delete window._resumeToStep;
    } else if (g.updateWizardUI(), b.value) {
      const ne = D?.textContent || null, fe = f(x?.value, 0) || null;
      h.setDocument(b.value, ne, fe);
    }
    L && C.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: de,
    debouncedTrackChanges: y,
    renderInitialWizardUI: V
  };
}
function Gs(i) {
  return i.querySelector('select[name*=".role"]');
}
function Ws(i) {
  return i.querySelector(".field-participant-select");
}
function Js(i) {
  const {
    documentIdInput: e,
    titleInput: t,
    participantsContainer: n,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: o,
    addFieldBtn: c,
    ensureSelectedDocumentCompatibility: r,
    collectFieldRulesForState: h,
    findSignersMissingRequiredSignatureField: g,
    missingSignatureFieldMessage: b,
    announceError: x
  } = i;
  function D(C) {
    switch (C) {
      case 1:
        return e.value ? !!r() : (x("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (x("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const f = n.querySelectorAll(".participant-entry");
        if (f.length === 0)
          return x("Please add at least one participant"), !1;
        let L = !1;
        return f.forEach((S) => {
          Gs(S)?.value === "signer" && (L = !0);
        }), L ? !0 : (x("At least one signer is required"), !1);
      }
      case 4: {
        const f = s.querySelectorAll(".field-definition-entry");
        for (const T of Array.from(f)) {
          const _ = Ws(T);
          if (!_?.value)
            return x("Please assign all fields to a signer"), _?.focus(), !1;
        }
        if (h().find((T) => !T.participantId))
          return x("Please assign all automation rules to a signer"), o?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const y = g();
        return y.length > 0 ? (x(b(y)), c.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: D
  };
}
function Ys(i = {}) {
  const {
    isEditMode: e,
    stateManager: t,
    syncOrchestrator: n,
    syncService: s,
    hasMeaningfulWizardProgress: o,
    formatRelativeTime: c,
    emitWizardTelemetry: r
  } = i;
  function h(y, T) {
    return t.normalizeLoadedState({
      ...T,
      currentStep: y.currentStep,
      document: y.document,
      details: y.details,
      participants: y.participants,
      fieldDefinitions: y.fieldDefinitions,
      fieldPlacements: y.fieldPlacements,
      fieldRules: y.fieldRules,
      titleSource: y.titleSource,
      syncPending: !0,
      serverDraftId: T.serverDraftId,
      serverRevision: T.serverRevision,
      lastSyncedAt: T.lastSyncedAt
    });
  }
  async function g() {
    if (e) return t.getState();
    const y = t.normalizeLoadedState(t.getState()), T = String(y?.serverDraftId || "").trim();
    if (!T)
      return t.setState(y, { syncPending: !!y.syncPending, notify: !1 }), t.getState();
    try {
      const _ = await s.load(T), X = t.normalizeLoadedState({
        ..._?.wizard_state && typeof _.wizard_state == "object" ? _.wizard_state : {},
        serverDraftId: String(_?.id || T).trim() || T,
        serverRevision: Number(_?.revision || 0),
        lastSyncedAt: String(_?.updated_at || _?.updatedAt || "").trim() || y.lastSyncedAt,
        syncPending: !1
      }), de = String(y.serverDraftId || "").trim() === String(X.serverDraftId || "").trim() && y.syncPending === !0 ? h(y, X) : X;
      return t.setState(de, { syncPending: !!de.syncPending, notify: !1 }), t.getState();
    } catch (_) {
      if (Number(_?.status || 0) === 404) {
        const X = t.normalizeLoadedState({
          ...y,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return t.setState(X, { syncPending: !!X.syncPending, notify: !1 }), t.getState();
      }
      return t.getState();
    }
  }
  function b() {
    const y = document.getElementById("resume-dialog-modal"), T = t.getState(), _ = String(T?.document?.title || "").trim() || String(T?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = T.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = _, document.getElementById("resume-draft-step").textContent = T.currentStep, document.getElementById("resume-draft-time").textContent = c(T.updatedAt), y?.classList.remove("hidden"), r("wizard_resume_prompt_shown", {
      step: Number(T.currentStep || 1),
      has_server_draft: !!T.serverDraftId
    });
  }
  async function x(y = {}) {
    const T = y.deleteServerDraft === !0, _ = String(t.getState()?.serverDraftId || "").trim();
    if (t.clear(), n.broadcastStateUpdate(), !(!T || !_))
      try {
        await s.delete(_);
      } catch (X) {
        console.warn("Failed to delete server draft:", X);
      }
  }
  function D() {
    return t.normalizeLoadedState({
      ...t.getState(),
      ...t.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function C(y) {
    o(y) && (t.setState(y, { syncPending: !0 }), n.scheduleSync(), n.broadcastStateUpdate());
  }
  async function f(y) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const T = D();
    switch (y) {
      case "continue":
        t.restoreFormState(), window._resumeToStep = t.getState().currentStep;
        return;
      case "start_new":
        await x({ deleteServerDraft: !1 }), C(T);
        return;
      case "proceed":
        await x({ deleteServerDraft: !0 }), C(T);
        return;
      case "discard":
        await x({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  function L() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      f("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      f("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      f("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      f("discard");
    });
  }
  async function S() {
    e || (await g(), t.hasResumableState() && b());
  }
  return {
    bindEvents: L,
    reconcileBootstrapState: g,
    maybeShowResumeDialog: S
  };
}
function Ks(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let s = "saved";
  function o(C) {
    if (!C) return "unknown";
    const f = new Date(C), S = (/* @__PURE__ */ new Date()).getTime() - f.getTime(), y = Math.floor(S / 6e4), T = Math.floor(S / 36e5), _ = Math.floor(S / 864e5);
    return y < 1 ? "just now" : y < 60 ? `${y} minute${y !== 1 ? "s" : ""} ago` : T < 24 ? `${T} hour${T !== 1 ? "s" : ""} ago` : _ < 7 ? `${_} day${_ !== 1 ? "s" : ""} ago` : f.toLocaleDateString();
  }
  function c() {
    const C = n.getState();
    s === "paused" && r(C?.syncPending ? "pending" : "saved");
  }
  function r(C) {
    s = String(C || "").trim() || "saved";
    const f = e.sync.indicator, L = e.sync.icon, S = e.sync.text, y = e.sync.retryBtn;
    if (!(!f || !L || !S))
      switch (f.classList.remove("hidden"), C) {
        case "saved":
          L.className = "w-2 h-2 rounded-full bg-green-500", S.textContent = "Saved", S.className = "text-gray-600", y?.classList.add("hidden");
          break;
        case "saving":
          L.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", S.textContent = "Saving...", S.className = "text-gray-600", y?.classList.add("hidden");
          break;
        case "pending":
          L.className = "w-2 h-2 rounded-full bg-gray-400", S.textContent = "Unsaved changes", S.className = "text-gray-500", y?.classList.add("hidden");
          break;
        case "error":
          L.className = "w-2 h-2 rounded-full bg-amber-500", S.textContent = "Not synced", S.className = "text-amber-600", y?.classList.remove("hidden");
          break;
        case "paused":
          L.className = "w-2 h-2 rounded-full bg-slate-400", S.textContent = "Open in another tab", S.className = "text-slate-600", y?.classList.add("hidden");
          break;
        case "conflict":
          L.className = "w-2 h-2 rounded-full bg-red-500", S.textContent = "Conflict", S.className = "text-red-600", y?.classList.add("hidden");
          break;
        default:
          f.classList.add("hidden");
      }
  }
  function h(C) {
    const f = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = o(f.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(C || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function g(C, f = "", L = 0) {
    const S = String(f || "").trim().toUpperCase(), y = String(C || "").trim().toLowerCase();
    return S === "DRAFT_SEND_NOT_FOUND" || S === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : S === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : S === "SCOPE_DENIED" || y.includes("scope denied") ? "You don't have access to this organization's resources." : S === "TRANSPORT_SECURITY" || S === "TRANSPORT_SECURITY_REQUIRED" || y.includes("tls transport required") || Number(L) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : S === "PDF_UNSUPPORTED" || y === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(C || "").trim() !== "" ? String(C).trim() : "Something went wrong. Please try again.";
  }
  async function b(C, f = "") {
    const L = Number(C?.status || 0);
    let S = "", y = "", T = {};
    try {
      const _ = await C.json();
      S = String(_?.error?.code || _?.code || "").trim(), y = String(_?.error?.message || _?.message || "").trim(), T = _?.error?.details && typeof _.error.details == "object" ? _.error.details : {}, String(T?.entity || "").trim().toLowerCase() === "drafts" && String(S).trim().toUpperCase() === "NOT_FOUND" && (S = "DRAFT_SEND_NOT_FOUND", y === "" && (y = "Draft not found"));
    } catch {
      y = "";
    }
    return y === "" && (y = f || `Request failed (${L || "unknown"})`), {
      status: L,
      code: S,
      details: T,
      message: g(y, S, L)
    };
  }
  function x(C, f = "", L = 0) {
    const S = g(C, f, L);
    t && (t.textContent = S), window.toastManager?.error ? window.toastManager.error(S) : alert(S);
  }
  async function D(C, f = {}) {
    const L = await C;
    return L?.blocked && L.reason === "passive_tab" ? (x(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), L) : (L?.error && String(f.errorMessage || "").trim() !== "" && x(f.errorMessage || ""), L);
  }
  return {
    announceError: x,
    formatRelativeTime: o,
    mapUserFacingError: g,
    parseAPIError: b,
    restoreSyncStatusFromState: c,
    showSyncConflictDialog: h,
    surfaceSyncOutcome: D,
    updateSyncStatus: r
  };
}
function Xs(i) {
  const {
    createSuccess: e,
    stateManager: t,
    syncOrchestrator: n,
    syncService: s,
    surfaceSyncOutcome: o,
    announceError: c,
    getCurrentStep: r,
    reviewStep: h,
    onReviewStepRequested: g,
    updateActiveTabOwnershipUI: b
  } = i;
  function x() {
    const L = t.collectFormState();
    t.updateState(L), n.scheduleSync(), n.broadcastStateUpdate();
  }
  function D() {
    if (!e)
      return;
    const S = t.getState()?.serverDraftId;
    t.clear(), n.broadcastStateUpdate(), S && s.delete(S).catch((y) => {
      console.warn("Failed to delete server draft after successful create:", y);
    });
  }
  function C() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await o(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      const L = t.getState();
      if (L.serverDraftId)
        try {
          const S = await s.load(L.serverDraftId);
          S.wizard_state && (t.setState({
            ...S.wizard_state,
            serverDraftId: S.id,
            serverRevision: S.revision,
            syncPending: !1
          }, { syncPending: !1 }), window.location.reload());
        } catch (S) {
          console.error("Failed to load server draft:", S);
        }
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const L = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      t.setState({
        ...t.getState(),
        serverRevision: L,
        syncPending: !0
      }, { syncPending: !0 });
      const S = await o(n.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (S?.success || S?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  function f() {
    document.getElementById("active-tab-take-control-btn")?.addEventListener("click", async () => {
      if (!n.takeControl()) {
        c("This agreement is active in another tab. Take control here before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED");
        return;
      }
      b({ isOwner: !0 }), t.getState()?.syncPending && await o(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      }), r() === h && g();
    }), document.getElementById("active-tab-reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
  }
  return {
    bindOwnershipHandlers: f,
    bindRetryAndConflictHandlers: C,
    handleCreateSuccessCleanup: D,
    trackWizardStateChanges: x
  };
}
const It = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function hi(i, e = It.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === It.USER ? It.USER : t === It.SERVER_SEED ? It.SERVER_SEED : t === It.AUTOFILL ? It.AUTOFILL : e;
}
function Qs(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), s = String(t.email ?? "").trim(), o = String(t.role ?? "signer").trim().toLowerCase(), c = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), r = t.notify !== !1;
  return n !== "" || s !== "" || o !== "" && o !== "signer" || Number.isFinite(c) && c > 1 || !r ? !0 : e > 0;
}
function Xn(i, e = {}) {
  const {
    normalizeTitleSource: t = hi,
    titleSource: n = It
  } = e;
  if (!i || typeof i != "object") return !1;
  const s = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(s) && s > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const c = String(i.details?.title ?? "").trim(), r = String(i.details?.message ?? "").trim(), h = t(
    i.titleSource,
    c === "" ? n.AUTOFILL : n.USER
  );
  return !!(c !== "" && h !== n.SERVER_SEED || r !== "" || (Array.isArray(i.participants) ? i.participants : []).some((x, D) => Qs(x, D)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function Zs(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), o = /\/v\d+$/i.test(s) ? s : `${s}/v1`, c = `${o}/esign/drafts`, r = !!e.is_edit, h = !!e.create_success, g = String(e.user_id || "").trim(), b = String(e.submit_mode || "json").trim().toLowerCase(), x = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, D = Array.isArray(e.initial_participants) ? e.initial_participants : [], C = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], f = {
    base_path: t,
    api_base_path: n,
    user_id: g,
    is_edit: r,
    create_success: h,
    submit_mode: b,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: x
    },
    initial_participants: D,
    initial_field_instances: C
  };
  return {
    config: e,
    normalizedConfig: f,
    basePath: t,
    apiBase: n,
    apiVersionBase: o,
    draftsEndpoint: c,
    isEditMode: r,
    createSuccess: h,
    currentUserID: g,
    submitMode: b,
    documentsUploadURL: x,
    initialParticipants: D,
    initialFieldInstances: C
  };
}
function er(i) {
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
function tr(i = {}) {
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
    TITLE_SOURCE: It
  };
}
function mn(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Qn(i, e = "info") {
  const t = document.createElement("div");
  t.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${e === "success" ? "bg-green-600 text-white" : e === "error" ? "bg-red-600 text-white" : e === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, t.textContent = i, document.body.appendChild(t), setTimeout(() => {
    t.style.opacity = "0", setTimeout(() => t.remove(), 300);
  }, 3e3);
}
function nr(i = {}) {
  const {
    config: e,
    normalizedConfig: t,
    basePath: n,
    apiBase: s,
    apiVersionBase: o,
    draftsEndpoint: c,
    isEditMode: r,
    createSuccess: h,
    currentUserID: g,
    submitMode: b,
    documentsUploadURL: x,
    initialParticipants: D,
    initialFieldInstances: C
  } = Zs(i), {
    draftEndpointWithUserID: f,
    draftRequestHeaders: L
  } = er(g), S = vs(document), {
    WIZARD_STATE_VERSION: y,
    WIZARD_STORAGE_KEY: T,
    WIZARD_CHANNEL_NAME: _,
    LEGACY_WIZARD_STORAGE_KEY: X,
    SYNC_DEBOUNCE_MS: W,
    SYNC_RETRY_DELAYS: de,
    WIZARD_STORAGE_MIGRATION_VERSION: V,
    ACTIVE_TAB_STORAGE_KEY: ne,
    ACTIVE_TAB_HEARTBEAT_MS: fe,
    ACTIVE_TAB_STALE_MS: oe,
    TITLE_SOURCE: le
  } = tr({
    config: e,
    currentUserID: g,
    isEditMode: r
  }), Oe = Is(), Ze = (K, pe = le.AUTOFILL) => hi(K, pe), nt = (K) => Xn(K, {
    normalizeTitleSource: Ze,
    titleSource: le
  }), it = ms({
    apiBasePath: o,
    basePath: n
  }), rt = S.form.root, We = S.form.submitBtn, $e = S.form.announcements;
  let _e, ue, De, Je, ke, st, se, q, we = en();
  const Ye = () => Je?.debouncedTrackChanges?.(), ve = () => q?.trackWizardStateChanges?.(), Ae = (K) => se.formatRelativeTime(K), Me = () => se.restoreSyncStatusFromState(), Ke = (K) => se.updateSyncStatus(K), Fe = (K) => se.showSyncConflictDialog(K), Qe = (K, pe = "", Ee = 0) => se.mapUserFacingError(K, pe, Ee), at = (K, pe) => se.parseAPIError(K, pe), M = (K, pe = "", Ee = 0) => se.announceError(K, pe, Ee), R = (K, pe = {}) => se.surfaceSyncOutcome(K, pe), N = ys(S, {
    formatRelativeTime: Ae
  }), F = (K = {}) => N.render(K), H = new bs({
    storageKey: T,
    legacyStorageKey: X,
    stateVersion: y,
    storageMigrationVersion: V,
    totalWizardSteps: Nt,
    titleSource: le,
    normalizeTitleSource: Ze,
    parsePositiveInt: Xe,
    hasMeaningfulWizardProgress: nt,
    collectFormState: () => {
      const K = S.form.documentIdInput?.value || null, pe = document.getElementById("selected-document-title")?.textContent?.trim() || null, Ee = Ze(
        H.getState()?.titleSource,
        String(S.form.titleInput?.value || "").trim() === "" ? le.AUTOFILL : le.USER
      );
      return {
        document: {
          id: K,
          title: pe,
          pageCount: parseInt(S.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: S.form.titleInput?.value || "",
          message: S.form.messageInput?.value || ""
        },
        titleSource: Ee,
        participants: _e?.collectParticipantsForState?.() || [],
        fieldDefinitions: ue?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: De?.getState?.()?.fieldInstances || [],
        fieldRules: ue?.collectFieldRulesForState?.() || []
      };
    },
    restoreDocumentState: (K) => {
      if (!K?.document?.id) return;
      const pe = document.getElementById("selected-document"), Ee = document.getElementById("document-picker"), dt = document.getElementById("selected-document-title"), ut = document.getElementById("selected-document-info");
      S.form.documentIdInput.value = K.document.id, dt && (dt.textContent = K.document.title || "Selected Document"), ut && (ut.textContent = K.document.pageCount ? `${K.document.pageCount} pages` : ""), S.form.documentPageCountInput && K.document.pageCount && (S.form.documentPageCountInput.value = String(K.document.pageCount)), pe && pe.classList.remove("hidden"), Ee && Ee.classList.add("hidden");
    },
    restoreDetailsState: (K) => {
      S.form.titleInput.value = K?.details?.title || "", S.form.messageInput.value = K?.details?.message || "";
    },
    emitTelemetry: Oe
  });
  H.start(), se = Ks({
    agreementRefs: S,
    formAnnouncements: $e,
    stateManager: H
  });
  const ae = new ws({
    stateManager: H,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: f,
    draftRequestHeaders: L
  });
  let ce;
  const ye = new Ss({
    storageKey: ne,
    channelName: _,
    heartbeatMs: fe,
    staleMs: oe,
    telemetry: Oe,
    onOwnershipChange: (K) => {
      K.isOwner ? Me() : Ke("paused"), N.render(K);
    },
    onRemoteState: (K) => {
      if (H.applyRemoteState(K, {
        save: !0,
        notify: !1
      }).replacedLocalState) {
        const Ee = st?.reconcileBootstrapState?.({ reason: "state_updated" });
        Ee && typeof Ee.then == "function" ? Ee.then(() => {
          H.notifyListeners();
        }) : H.notifyListeners();
      } else
        H.notifyListeners();
    },
    onRemoteSync: (K, pe) => {
      H.applyRemoteSync(K, pe, {
        save: !0,
        notify: !0
      });
    },
    onVisibilityHidden: () => {
      ce?.forceSync({ keepalive: !0 });
    },
    onPageHide: () => {
      ce?.forceSync({ keepalive: !0 });
    },
    onBeforeUnload: () => {
      ce?.forceSync({ keepalive: !0 });
    }
  });
  ce = new xs({
    stateManager: H,
    syncService: ae,
    activeTabController: ye,
    statusUpdater: Ke,
    showConflictDialog: Fe,
    syncDebounceMs: W,
    syncRetryDelays: de,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: f,
    draftRequestHeaders: L
  });
  const Q = fs({
    context: {
      config: t,
      refs: S,
      basePath: n,
      apiBase: s,
      apiVersionBase: o,
      draftsEndpoint: c,
      previewCard: it,
      emitTelemetry: Oe,
      stateManager: H,
      syncService: ae,
      activeTabController: ye,
      syncController: ce
    },
    hooks: {
      renderInitialUI() {
        Je?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        st?.maybeShowResumeDialog?.(), Z.loadDocuments(), Z.loadRecentDocuments();
      },
      destroy() {
        N.destroy(), H.destroy();
      }
    }
  }), Z = $s({
    apiBase: s,
    apiVersionBase: o,
    currentUserID: g,
    documentsUploadURL: x,
    isEditMode: r,
    titleSource: le,
    normalizeTitleSource: Ze,
    stateManager: H,
    previewCard: it,
    parseAPIError: at,
    announceError: M,
    showToast: Qn,
    mapUserFacingError: Qe,
    renderFieldRulePreview: () => ue?.renderFieldRulePreview?.()
  });
  Z.initializeTitleSourceSeed(), Z.bindEvents();
  const {
    documentIdInput: be,
    documentSearch: xe,
    selectedDocumentTitle: Pe,
    documentPageCountInput: Re
  } = Z.refs, v = Z.ensureSelectedDocumentCompatibility, w = Z.getCurrentDocumentPageCount;
  _e = Fs({
    initialParticipants: D,
    onParticipantsChanged: () => ue?.updateFieldParticipantOptions?.()
  }), _e.initialize(), _e.bindEvents();
  const I = _e.refs.participantsContainer, U = _e.refs.addParticipantBtn, O = () => _e.getSignerParticipants();
  ue = Ns({
    initialFieldInstances: C,
    placementSource: gt,
    getCurrentDocumentPageCount: w,
    getSignerParticipants: O,
    escapeHtml: mn,
    onDefinitionsChanged: () => Ye(),
    onRulesChanged: () => Ye(),
    onParticipantsChanged: () => ue?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => De?.getLinkGroupState?.() || we,
    setPlacementLinkGroupState: (K) => {
      we = K || en(), De?.setLinkGroupState?.(we);
    }
  }), ue.bindEvents(), ue.initialize();
  const z = ue.refs.fieldDefinitionsContainer, ie = ue.refs.fieldRulesContainer, re = ue.refs.addFieldBtn, Ie = ue.refs.fieldPlacementsJSONInput, Ue = ue.refs.fieldRulesJSONInput, Se = () => ue.collectFieldRulesForState(), He = () => ue.collectFieldRulesForForm(), et = (K, pe) => ue.expandRulesForPreview(K, pe), Ne = () => ue.updateFieldParticipantOptions(), mt = () => ue.collectPlacementFieldDefinitions(), P = (K) => ue.getFieldDefinitionById(K), $ = () => ue.findSignersMissingRequiredSignatureField(), B = (K) => ue.missingSignatureFieldMessage(K), J = Cs({
    documentIdInput: be,
    selectedDocumentTitle: Pe,
    participantsContainer: I,
    fieldDefinitionsContainer: z,
    submitBtn: We,
    syncOrchestrator: ce,
    escapeHtml: mn,
    getSignerParticipants: O,
    getCurrentDocumentPageCount: w,
    collectFieldRulesForState: Se,
    expandRulesForPreview: et,
    findSignersMissingRequiredSignatureField: $,
    goToStep: (K) => ee.goToStep(K)
  });
  De = js({
    apiBase: s,
    apiVersionBase: o,
    documentIdInput: be,
    fieldPlacementsJSONInput: Ie,
    initialFieldInstances: ue.buildInitialPlacementInstances(),
    initialLinkGroupState: we,
    collectPlacementFieldDefinitions: mt,
    getFieldDefinitionById: P,
    parseAPIError: at,
    mapUserFacingError: Qe,
    showToast: Qn,
    escapeHtml: mn,
    onPlacementsChanged: () => ve()
  }), De.bindEvents(), we = De.getLinkGroupState();
  const ee = Ls({
    totalWizardSteps: Nt,
    wizardStep: tt,
    nextStepLabels: ss,
    submitBtn: We,
    syncOrchestrator: ce,
    previewCard: it,
    updateActiveTabOwnershipUI: F,
    validateStep: (K) => ke.validateStep(K),
    onPlacementStep() {
      De.initPlacementEditor();
    },
    onReviewStep() {
      J.initSendReadinessCheck();
    },
    onStepChanged(K) {
      H.updateStep(K), ve(), ce.forceSync();
    }
  });
  ee.bindEvents(), q = Xs({
    createSuccess: h,
    stateManager: H,
    syncOrchestrator: ce,
    syncService: ae,
    surfaceSyncOutcome: R,
    announceError: M,
    getCurrentStep: () => ee.getCurrentStep(),
    reviewStep: tt.REVIEW,
    onReviewStepRequested: () => J.initSendReadinessCheck(),
    updateActiveTabOwnershipUI: F
  }), q.handleCreateSuccessCleanup(), q.bindRetryAndConflictHandlers(), q.bindOwnershipHandlers();
  const Y = qs({
    documentIdInput: be,
    documentPageCountInput: Re,
    titleInput: S.form.titleInput,
    messageInput: S.form.messageInput,
    participantsContainer: I,
    fieldDefinitionsContainer: z,
    fieldPlacementsJSONInput: Ie,
    fieldRulesJSONInput: Ue,
    collectFieldRulesForForm: He,
    buildPlacementFormEntries: () => De?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => ee.getCurrentStep(),
    totalWizardSteps: Nt
  }), Ve = () => Y.buildCanonicalAgreementPayload();
  return Je = Vs({
    titleSource: le,
    stateManager: H,
    trackWizardStateChanges: ve,
    participantsController: _e,
    fieldDefinitionsController: ue,
    placementController: De,
    updateFieldParticipantOptions: Ne,
    previewCard: it,
    wizardNavigationController: ee,
    documentIdInput: be,
    documentPageCountInput: Re,
    selectedDocumentTitle: Pe,
    agreementRefs: S,
    parsePositiveInt: Xe,
    isEditMode: r
  }), Je.bindChangeTracking(), ke = Js({
    documentIdInput: be,
    titleInput: S.form.titleInput,
    participantsContainer: I,
    fieldDefinitionsContainer: z,
    fieldRulesContainer: ie,
    addFieldBtn: re,
    ensureSelectedDocumentCompatibility: v,
    collectFieldRulesForState: Se,
    findSignersMissingRequiredSignatureField: $,
    missingSignatureFieldMessage: B,
    announceError: M
  }), st = Ys({
    isEditMode: r,
    stateManager: H,
    syncOrchestrator: ce,
    syncService: ae,
    hasMeaningfulWizardProgress: Xn,
    formatRelativeTime: Ae,
    emitWizardTelemetry: Oe
  }), st.bindEvents(), Ts({
    config: e,
    form: rt,
    submitBtn: We,
    documentIdInput: be,
    documentSearch: xe,
    participantsContainer: I,
    addParticipantBtn: U,
    fieldDefinitionsContainer: z,
    fieldRulesContainer: ie,
    documentPageCountInput: Re,
    fieldPlacementsJSONInput: Ie,
    fieldRulesJSONInput: Ue,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: f,
    draftRequestHeaders: L,
    syncService: ae,
    syncOrchestrator: ce,
    stateManager: H,
    submitMode: b,
    totalWizardSteps: Nt,
    wizardStep: tt,
    getCurrentStep: () => ee.getCurrentStep(),
    getPlacementState: () => De.getState(),
    getCurrentDocumentPageCount: w,
    ensureSelectedDocumentCompatibility: v,
    collectFieldRulesForState: Se,
    collectFieldRulesForForm: He,
    expandRulesForPreview: et,
    findSignersMissingRequiredSignatureField: $,
    missingSignatureFieldMessage: B,
    getSignerParticipants: O,
    buildCanonicalAgreementPayload: Ve,
    announceError: M,
    emitWizardTelemetry: Oe,
    parseAPIError: at,
    goToStep: (K) => ee.goToStep(K),
    surfaceSyncOutcome: R,
    addFieldBtn: re
  }).bindEvents(), Q;
}
let tn = null;
function ir() {
  tn?.destroy(), tn = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function sr(i = {}) {
  if (tn)
    return;
  const e = nr(i);
  e.start(), tn = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function rr(i) {
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
class fi {
  constructor(e) {
    this.initialized = !1, this.config = rr(e);
  }
  init() {
    this.initialized || (this.initialized = !0, sr(this.config));
  }
  destroy() {
    ir(), this.initialized = !1;
  }
}
function ya(i) {
  const e = new fi(i);
  return Te(() => e.init()), e;
}
function ar(i) {
  const e = new fi({
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
  Te(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && Te(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      ar({
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
const or = "esign.signer.profile.v1", Zn = "esign.signer.profile.outbox.v1", Sn = 90, ei = 500 * 1024;
class cr {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : Sn;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${or}:${e}`;
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
class lr {
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
class hn {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Zn);
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
      window.localStorage.setItem(Zn, JSON.stringify(e));
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
function dr(i) {
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
      ttlDays: Number(i.profile?.ttlDays || Sn) || Sn,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function ur(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function fn(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function pr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function ht(i) {
  const e = String(i || "").trim();
  return pr(e) ? "" : e;
}
function gr(i) {
  const e = new cr(i.profile.ttlDays), t = new lr(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new hn("local_only", e, null) : i.profile.mode === "remote_only" ? new hn("remote_only", e, t) : new hn("hybrid", e, t);
}
function mr() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function hr(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = dr(i), s = ur(n), o = gr(n);
  mr();
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
  function h() {
    r.overlayRenderFrameID || (r.overlayRenderFrameID = window.requestAnimationFrame(() => {
      r.overlayRenderFrameID = 0, ge();
    }));
  }
  function g(a) {
    const l = r.fieldState.get(a);
    l && (delete l.previewValueText, delete l.previewValueBool, delete l.previewSignatureUrl);
  }
  function b() {
    r.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function x(a, l) {
    const d = r.fieldState.get(a);
    if (!d) return;
    const p = ht(String(l || ""));
    if (!p) {
      delete d.previewValueText;
      return;
    }
    d.previewValueText = p, delete d.previewValueBool, delete d.previewSignatureUrl;
  }
  function D(a, l) {
    const d = r.fieldState.get(a);
    d && (d.previewValueBool = !!l, delete d.previewValueText, delete d.previewSignatureUrl);
  }
  function C(a, l) {
    const d = r.fieldState.get(a);
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
      const d = a.page, p = this.getPageMetadata(d), m = l.offsetWidth, E = l.offsetHeight, A = a.pageWidth || p.width, G = a.pageHeight || p.height, te = m / A, Ce = E / G;
      let me = a.posX || 0, Le = a.posY || 0;
      n.viewer.origin === "bottom-left" && (Le = G - Le - (a.height || 30));
      const ft = me * te, yt = Le * Ce, he = (a.width || 150) * te, ze = (a.height || 30) * Ce;
      return {
        left: ft,
        top: yt,
        width: he,
        height: ze,
        // Store original values for debugging
        _debug: {
          sourceX: me,
          sourceY: Le,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: A,
          pageHeight: G,
          scaleX: te,
          scaleY: Ce,
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
        throw await dt(m, "Failed to get upload contract");
      const E = await m.json(), A = E?.contract || E;
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
      a.headers && Object.entries(a.headers).forEach(([E, A]) => {
        const G = String(E).toLowerCase();
        G === "x-esign-upload-token" || G === "x-esign-upload-key" || (p[E] = String(A));
      });
      const m = await fetch(d.toString(), {
        method: a.method || "PUT",
        headers: p,
        body: l,
        credentials: "omit"
      });
      if (!m.ok)
        throw await dt(m, `Upload failed: ${m.status} ${m.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [l, d] = a.split(","), p = l.match(/data:([^;]+)/), m = p ? p[1] : "image/png", E = atob(d), A = new Uint8Array(E.length);
      for (let G = 0; G < E.length; G++)
        A[G] = E.charCodeAt(G);
      return new Blob([A], { type: m });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, l) {
      const d = this.dataUrlToBlob(l), p = d.size, m = "image/png", E = await nt(d), A = await this.requestUploadBootstrap(
        a,
        E,
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
        const E = await p.json().catch(() => ({})), A = new Error(E?.error?.message || "Failed to save signature");
        throw A.code = E?.error?.code || "", A;
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
  function y(a) {
    const l = r.fieldState.get(a);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function T(a) {
    return r.savedSignaturesByType.get(a) || [];
  }
  async function _(a, l = !1) {
    const d = y(a);
    if (!l && r.savedSignaturesByType.has(d)) {
      X(a);
      return;
    }
    const p = await S.list(d);
    r.savedSignaturesByType.set(d, p), X(a);
  }
  function X(a) {
    const l = y(a), d = T(l), p = document.getElementById("sig-saved-list");
    if (p) {
      if (!d.length) {
        p.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      p.innerHTML = d.map((m) => {
        const E = St(String(m?.thumbnail_data_url || m?.data_url || "")), A = St(String(m?.label || "Saved signature")), G = St(String(m?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${E}" alt="${A}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${A}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${St(a)}" data-signature-id="${G}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${St(a)}" data-signature-id="${G}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function W(a) {
    const l = r.signatureCanvases.get(a), d = y(a);
    if (!l || !Y(a))
      throw new Error(`Please add your ${d === "initials" ? "initials" : "signature"} first`);
    const p = l.canvas.toDataURL("image/png"), m = await S.save(d, p, d === "initials" ? "Initials" : "Signature");
    if (!m)
      throw new Error("Failed to save signature");
    const E = T(d);
    E.unshift(m), r.savedSignaturesByType.set(d, E), X(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function de(a, l) {
    const d = y(a), m = T(d).find((A) => String(A?.id || "") === String(l));
    if (!m) return;
    requestAnimationFrame(() => mt(a)), await fe(a);
    const E = String(m.data_url || m.thumbnail_data_url || "").trim();
    E && (await $(a, E, { clearStrokes: !0 }), C(a, E), h(), et("draw", a), ot("Saved signature selected."));
  }
  async function V(a, l) {
    const d = y(a);
    await S.delete(l);
    const p = T(d).filter((m) => String(m?.id || "") !== String(l));
    r.savedSignaturesByType.set(d, p), X(a);
  }
  function ne(a) {
    const l = String(a?.code || "").trim(), d = String(a?.message || "Unable to update saved signatures"), p = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : d;
    window.toastManager && window.toastManager.error(p), ot(p, "assertive");
  }
  async function fe(a, l = 8) {
    for (let d = 0; d < l; d++) {
      if (r.signatureCanvases.has(a)) return !0;
      await new Promise((p) => setTimeout(p, 40)), mt(a);
    }
    return !1;
  }
  async function oe(a, l) {
    const d = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(d))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => mt(a)), await fe(a);
    const p = r.signatureCanvases.get(a);
    if (!p)
      throw new Error("Signature canvas is not ready");
    const m = await le(l), E = d === "image/png" ? m : await Ze(m, p.drawWidth, p.drawHeight);
    if (Oe(E) > ei)
      throw new Error(`Image exceeds ${Math.round(ei / 1024)}KB limit after conversion`);
    await $(a, E, { clearStrokes: !0 }), C(a, E), h();
    const G = document.getElementById("sig-upload-preview-wrap"), te = document.getElementById("sig-upload-preview");
    G && G.classList.remove("hidden"), te && te.setAttribute("src", E), ot("Signature image uploaded. You can now insert it.");
  }
  function le(a) {
    return new Promise((l, d) => {
      const p = new FileReader();
      p.onload = () => l(String(p.result || "")), p.onerror = () => d(new Error("Unable to read image file")), p.readAsDataURL(a);
    });
  }
  function Oe(a) {
    const l = String(a || "").split(",");
    if (l.length < 2) return 0;
    const d = l[1] || "", p = (d.match(/=+$/) || [""])[0].length;
    return Math.floor(d.length * 3 / 4) - p;
  }
  async function Ze(a, l, d) {
    return await new Promise((p, m) => {
      const E = new Image();
      E.onload = () => {
        const A = document.createElement("canvas"), G = Math.max(1, Math.round(Number(l) || 600)), te = Math.max(1, Math.round(Number(d) || 160));
        A.width = G, A.height = te;
        const Ce = A.getContext("2d");
        if (!Ce) {
          m(new Error("Unable to process image"));
          return;
        }
        Ce.clearRect(0, 0, G, te);
        const me = Math.min(G / E.width, te / E.height), Le = E.width * me, ft = E.height * me, yt = (G - Le) / 2, he = (te - ft) / 2;
        Ce.drawImage(E, yt, he, Le, ft), p(A.toDataURL("image/png"));
      }, E.onerror = () => m(new Error("Unable to decode image file")), E.src = a;
    });
  }
  async function nt(a) {
    if (window.crypto && window.crypto.subtle) {
      const l = await a.arrayBuffer(), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function it() {
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
          be();
          break;
        case "zoom-out":
          v();
          break;
        case "zoom-in":
          Re();
          break;
        case "fit-width":
          w();
          break;
        case "download-document":
          Di();
          break;
        case "show-consent-modal":
          Dn();
          break;
        case "activate-field": {
          const m = d.getAttribute("data-field-id");
          m && U(m);
          break;
        }
        case "submit-signature":
          Ai();
          break;
        case "show-decline-modal":
          Pi();
          break;
        case "close-field-editor":
          K();
          break;
        case "save-field-editor":
          An();
          break;
        case "hide-consent-modal":
          an();
          break;
        case "accept-consent":
          Ti();
          break;
        case "hide-decline-modal":
          Mn();
          break;
        case "confirm-decline":
          ki();
          break;
        case "retry-load-pdf":
          M();
          break;
        case "signature-tab": {
          const m = d.getAttribute("data-tab") || "draw", E = d.getAttribute("data-field-id");
          E && et(m, E);
          break;
        }
        case "clear-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && Ge(m);
          break;
        }
        case "undo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && J(m);
          break;
        }
        case "redo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && ee(m);
          break;
        }
        case "save-current-signature-library": {
          const m = d.getAttribute("data-field-id");
          m && W(m).catch(ne);
          break;
        }
        case "select-saved-signature": {
          const m = d.getAttribute("data-field-id"), E = d.getAttribute("data-signature-id");
          m && E && de(m, E).catch(ne);
          break;
        }
        case "delete-saved-signature": {
          const m = d.getAttribute("data-field-id"), E = d.getAttribute("data-signature-id");
          m && E && V(m, E).catch(ne);
          break;
        }
        case "clear-signer-profile":
          Ye().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Et.togglePanel();
          break;
        case "debug-copy-session":
          Et.copySessionInfo();
          break;
        case "debug-clear-cache":
          Et.clearCache();
          break;
        case "debug-show-telemetry":
          Et.showTelemetry();
          break;
        case "debug-reload-viewer":
          Et.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const l = a.target;
      if (l instanceof HTMLInputElement) {
        if (l.matches("#sig-upload-input")) {
          const d = l.getAttribute("data-field-id"), p = l.files?.[0];
          if (!d || !p) return;
          oe(d, p).catch((m) => {
            window.toastManager && window.toastManager.error(m?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (l.matches("#field-checkbox-input")) {
          const d = l.getAttribute("data-field-id") || r.activeFieldId;
          if (!d) return;
          D(d, l.checked), h();
        }
      }
    }), document.addEventListener("input", (a) => {
      const l = a.target;
      if (!(l instanceof HTMLInputElement) && !(l instanceof HTMLTextAreaElement)) return;
      const d = l.getAttribute("data-field-id") || r.activeFieldId;
      if (d) {
        if (l.matches("#sig-type-input")) {
          Se(d, l.value || "", { syncOverlay: !0 });
          return;
        }
        if (l.matches("#field-text-input")) {
          x(d, l.value || ""), h();
          return;
        }
        l.matches("#field-checkbox-input") && l instanceof HTMLInputElement && (D(d, l.checked), h());
      }
    });
  }
  Te(async () => {
    it(), r.isLowMemory = Me(), ue(), De(), await ke(), Je(), Ae(), kn(), _t(), await M(), ge(), document.addEventListener("visibilitychange", rt), "memory" in navigator && $e(), Et.init();
  });
  function rt() {
    document.hidden && We();
  }
  function We() {
    const a = r.isLowMemory ? 1 : 2;
    for (; r.renderedPages.size > a; ) {
      let l = null, d = 1 / 0;
      if (r.renderedPages.forEach((p, m) => {
        m !== r.currentPage && p.timestamp < d && (l = m, d = p.timestamp);
      }), l !== null)
        r.renderedPages.delete(l);
      else
        break;
    }
  }
  function $e() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        a / l > 0.8 && (r.isLowMemory = !0, We());
      }
    }, 3e4);
  }
  function _e(a) {
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
  function ue() {
    const a = document.getElementById("pdf-compatibility-banner"), l = document.getElementById("pdf-compatibility-message"), d = document.getElementById("pdf-compatibility-title");
    if (!a || !l || !d) return;
    const p = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), m = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (p !== "limited") {
      a.classList.add("hidden");
      return;
    }
    d.textContent = "Preview Compatibility Notice", l.textContent = String(n.viewer.compatibilityMessage || "").trim() || _e(m), a.classList.remove("hidden"), c.trackDegradedMode("pdf_preview_compatibility", { tier: p, reason: m });
  }
  function De() {
    const a = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), d = document.getElementById("stage-state-title"), p = document.getElementById("stage-state-message"), m = document.getElementById("stage-state-meta");
    if (!a || !l || !d || !p || !m) return;
    const E = n.signerState || "active", A = n.recipientStage || 1, G = n.activeStage || 1, te = n.activeRecipientIds || [], Ce = n.waitingForRecipientIds || [];
    let me = {
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
    switch (E) {
      case "waiting":
        me = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: A > G ? `You are in signing stage ${A}. Stage ${G} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Ce.length > 0 && me.badges.push({
          icon: "iconoir-group",
          text: `${Ce.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        me = {
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
        me = {
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
        te.length > 1 ? (me.message = `You and ${te.length - 1} other signer(s) can sign now.`, me.badges = [
          { icon: "iconoir-users", text: `Stage ${G} active`, variant: "green" }
        ]) : A > 1 ? me.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${A}`, variant: "green" }
        ] : me.hidden = !0;
        break;
    }
    if (me.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${me.bgClass} ${me.borderClass}`, l.className = `${me.iconClass} mt-0.5`, d.className = `text-sm font-semibold ${me.titleClass}`, d.textContent = me.title, p.className = `text-xs ${me.messageClass} mt-1`, p.textContent = me.message, m.innerHTML = "", me.badges.forEach((Le) => {
      const ft = document.createElement("span"), yt = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      ft.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${yt[Le.variant] || yt.blue}`, ft.innerHTML = `<i class="${Le.icon} mr-1"></i>${Le.text}`, m.appendChild(ft);
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
  async function ke() {
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
    return d === "name" ? ht(l.fullName || "") : d === "initials" ? ht(l.initials || "") || fn(l.fullName || n.recipientName || "") : d === "signature" ? ht(l.typedSignature || "") : "";
  }
  function se(a) {
    return !n.profile.persistDrawnSignature || !r.profileData ? "" : a?.type === "initials" && String(r.profileData.drawnInitialsDataUrl || "").trim() || String(r.profileData.drawnSignatureDataUrl || "").trim();
  }
  function q(a) {
    const l = ht(a?.value || "");
    return l || (r.profileData ? a?.type === "initials" ? ht(r.profileData.initials || "") || fn(r.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? ht(r.profileData.typedSignature || "") : "" : "");
  }
  function we() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : r.profileRemember;
  }
  async function Ye(a = !1) {
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
  async function ve(a, l = {}) {
    const d = we();
    if (r.profileRemember = d, !d) {
      await Ye(!0);
      return;
    }
    if (!a) return;
    const p = {
      remember: !0
    }, m = String(a.type || "");
    if (m === "name" && typeof a.value == "string") {
      const E = ht(a.value);
      E && (p.fullName = E, (r.profileData?.initials || "").trim() || (p.initials = fn(E)));
    }
    if (m === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const E = ht(a.value);
        E && (p.initials = E);
      }
    }
    if (m === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const E = ht(a.value);
        E && (p.typedSignature = E);
      }
    }
    if (!(Object.keys(p).length === 1 && p.remember === !0))
      try {
        const E = await o.save(r.profileKey, p);
        r.profileData = E;
      } catch {
      }
  }
  function Ae() {
    const a = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    a && l && a.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function Me() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Ke() {
    const a = r.isLowMemory ? 3 : r.maxCachedPages;
    if (r.renderedPages.size <= a) return;
    const l = [];
    for (r.renderedPages.forEach((d, p) => {
      const m = Math.abs(p - r.currentPage);
      l.push({ pageNum: p, distance: m });
    }), l.sort((d, p) => p.distance - d.distance); r.renderedPages.size > a && l.length > 0; ) {
      const d = l.shift();
      d && d.pageNum !== r.currentPage && r.renderedPages.delete(d.pageNum);
    }
  }
  function Fe(a) {
    if (r.isLowMemory) return;
    const l = [];
    a > 1 && l.push(a - 1), a < n.pageCount && l.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      l.forEach(async (d) => {
        !r.renderedPages.has(d) && !r.pageRendering && await Qe(d);
      });
    }, { timeout: 2e3 });
  }
  async function Qe(a) {
    if (!(!r.pdfDoc || r.renderedPages.has(a)))
      try {
        const l = await r.pdfDoc.getPage(a), d = r.zoomLevel, p = l.getViewport({ scale: d * window.devicePixelRatio }), m = document.createElement("canvas"), E = m.getContext("2d");
        m.width = p.width, m.height = p.height;
        const A = {
          canvasContext: E,
          viewport: p
        };
        await l.render(A).promise, r.renderedPages.set(a, {
          canvas: m,
          scale: d,
          timestamp: Date.now()
        }), Ke();
      } catch (l) {
        console.warn("Preload failed for page", a, l);
      }
  }
  function at() {
    const a = window.devicePixelRatio || 1;
    return r.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function M() {
    const a = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const d = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!d.ok)
        throw new Error("Failed to load document");
      const m = (await d.json()).assets || {}, E = m.source_url || m.executed_url || m.certificate_url || n.documentUrl;
      if (!E)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const A = pdfjsLib.getDocument(E);
      r.pdfDoc = await A.promise, n.pageCount = r.pdfDoc.numPages, document.getElementById("page-count").textContent = r.pdfDoc.numPages, await R(1), Pe(), c.trackViewerLoad(!0, Date.now() - l), c.trackPageView(1);
    } catch (d) {
      console.error("PDF load error:", d), c.trackViewerLoad(!1, Date.now() - l, d.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), _i();
    }
  }
  async function R(a) {
    if (!r.pdfDoc) return;
    const l = r.renderedPages.get(a);
    if (l && l.scale === r.zoomLevel) {
      N(l), r.currentPage = a, document.getElementById("current-page").textContent = a, Pe(), ge(), Fe(a);
      return;
    }
    r.pageRendering = !0;
    try {
      const d = await r.pdfDoc.getPage(a), p = r.zoomLevel, m = at(), E = d.getViewport({ scale: p * m }), A = d.getViewport({ scale: 1 });
      f.setPageViewport(a, {
        width: A.width,
        height: A.height,
        rotation: A.rotation || 0
      });
      const G = document.getElementById("pdf-page-1");
      G.innerHTML = "";
      const te = document.createElement("canvas"), Ce = te.getContext("2d");
      te.height = E.height, te.width = E.width, te.style.width = `${E.width / m}px`, te.style.height = `${E.height / m}px`, G.appendChild(te);
      const me = document.getElementById("pdf-container");
      me.style.width = `${E.width / m}px`;
      const Le = {
        canvasContext: Ce,
        viewport: E
      };
      await d.render(Le).promise, r.renderedPages.set(a, {
        canvas: te.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: E.width / m,
        displayHeight: E.height / m
      }), r.renderedPages.get(a).canvas.getContext("2d").drawImage(te, 0, 0), Ke(), r.currentPage = a, document.getElementById("current-page").textContent = a, Pe(), ge(), c.trackPageView(a), Fe(a);
    } catch (d) {
      console.error("Page render error:", d);
    } finally {
      if (r.pageRendering = !1, r.pageNumPending !== null) {
        const d = r.pageNumPending;
        r.pageNumPending = null, await R(d);
      }
    }
  }
  function N(a, l) {
    const d = document.getElementById("pdf-page-1");
    d.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = a.canvas.width, p.height = a.canvas.height, p.style.width = `${a.displayWidth}px`, p.style.height = `${a.displayHeight}px`, p.getContext("2d").drawImage(a.canvas, 0, 0), d.appendChild(p);
    const E = document.getElementById("pdf-container");
    E.style.width = `${a.displayWidth}px`;
  }
  function F(a) {
    r.pageRendering ? r.pageNumPending = a : R(a);
  }
  function H(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? ht(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? ht(a.value) : "";
  }
  function ae(a, l, d, p = !1) {
    const m = document.createElement("img");
    m.className = "field-overlay-preview", m.src = l, m.alt = d, a.appendChild(m), a.classList.add("has-preview"), p && a.classList.add("draft-preview");
  }
  function ce(a, l, d = !1, p = !1) {
    const m = document.createElement("span");
    m.className = "field-overlay-value", d && m.classList.add("font-signature"), m.textContent = l, a.appendChild(m), a.classList.add("has-value"), p && a.classList.add("draft-preview");
  }
  function ye(a, l) {
    const d = document.createElement("span");
    d.className = "field-overlay-label", d.textContent = l, a.appendChild(d);
  }
  function ge() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    r.fieldState.forEach((d, p) => {
      if (d.page !== r.currentPage) return;
      const m = document.createElement("div");
      if (m.className = "field-overlay", m.dataset.fieldId = p, d.required && m.classList.add("required"), d.completed && m.classList.add("completed"), r.activeFieldId === p && m.classList.add("active"), d.posX != null && d.posY != null && d.width != null && d.height != null) {
        const Le = f.getOverlayStyles(d, l);
        m.style.left = Le.left, m.style.top = Le.top, m.style.width = Le.width, m.style.height = Le.height, m.style.transform = Le.transform, Et.enabled && (m.dataset.debugCoords = JSON.stringify(
          f.pageToScreen(d, l)._debug
        ));
      } else {
        const Le = Array.from(r.fieldState.keys()).indexOf(p);
        m.style.left = "10px", m.style.top = `${100 + Le * 50}px`, m.style.width = "150px", m.style.height = "30px";
      }
      const A = String(d.previewSignatureUrl || "").trim(), G = String(d.signaturePreviewUrl || "").trim(), te = H(d), Ce = d.type === "signature" || d.type === "initials", me = typeof d.previewValueBool == "boolean";
      if (A)
        ae(m, A, Q(d.type), !0);
      else if (d.completed && G)
        ae(m, G, Q(d.type));
      else if (te) {
        const Le = typeof d.previewValueText == "string" && d.previewValueText.trim() !== "";
        ce(m, te, Ce, Le);
      } else d.type === "checkbox" && (me ? d.previewValueBool : !!d.value) ? ce(m, "Checked", !1, me) : ye(m, Q(d.type));
      m.setAttribute("tabindex", "0"), m.setAttribute("role", "button"), m.setAttribute("aria-label", `${Q(d.type)} field${d.required ? ", required" : ""}${d.completed ? ", completed" : ""}`), m.addEventListener("click", () => U(p)), m.addEventListener("keydown", (Le) => {
        (Le.key === "Enter" || Le.key === " ") && (Le.preventDefault(), U(p));
      }), a.appendChild(m);
    });
  }
  function Q(a) {
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
    r.currentPage <= 1 || F(r.currentPage - 1);
  }
  function be() {
    r.currentPage >= n.pageCount || F(r.currentPage + 1);
  }
  function xe(a) {
    a < 1 || a > n.pageCount || F(a);
  }
  function Pe() {
    document.getElementById("prev-page-btn").disabled = r.currentPage <= 1, document.getElementById("next-page-btn").disabled = r.currentPage >= n.pageCount;
  }
  function Re() {
    r.zoomLevel = Math.min(r.zoomLevel + 0.25, 3), I(), F(r.currentPage);
  }
  function v() {
    r.zoomLevel = Math.max(r.zoomLevel - 0.25, 0.5), I(), F(r.currentPage);
  }
  function w() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, d = 612;
    r.zoomLevel = l / d, I(), F(r.currentPage);
  }
  function I() {
    document.getElementById("zoom-level").textContent = `${Math.round(r.zoomLevel * 100)}%`;
  }
  function U(a) {
    if (!r.hasConsented && n.fields.some((l) => l.id === a && l.type !== "date_signed")) {
      Dn();
      return;
    }
    O(a, { openEditor: !0 });
  }
  function O(a, l = { openEditor: !0 }) {
    const d = r.fieldState.get(a);
    if (d) {
      if (l.openEditor && (r.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), d.page !== r.currentPage && xe(d.page), !l.openEditor) {
        z(a);
        return;
      }
      d.type !== "date_signed" && ie(a);
    }
  }
  function z(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function ie(a) {
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), m = document.getElementById("field-editor-title"), E = document.getElementById("field-editor-legal-disclaimer");
    m.textContent = re(l.type), p.innerHTML = Ie(l), E?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && Ne(a), d.classList.add("active"), d.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", on(d.querySelector(".field-editor")), ot(`Editing ${re(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const A = p.querySelector("input, textarea");
      A ? A.focus() : p.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), pe(r.writeCooldownUntil) > 0 && ut(pe(r.writeCooldownUntil));
  }
  function re(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function Ie(a) {
    const l = Ue(a.type), d = St(String(a?.id || "")), p = St(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const m = a.type === "initials" ? "initials" : "signature", E = St(q(a)), A = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], G = He(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${A.map((te) => `
            <button
              type="button"
              id="sig-tab-${te.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${G === te.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${te.id}"
              data-esign-action="signature-tab"
              data-field-id="${d}"
              role="tab"
              aria-selected="${G === te.id ? "true" : "false"}"
              aria-controls="sig-editor-${te.id}"
              tabindex="${G === te.id ? "0" : "-1"}"
            >
              ${te.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${G === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${m}"
              value="${E}"
              data-field-id="${d}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${d}">${E}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${m} will appear as your ${p}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${G === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
          <div id="sig-editor-upload" class="sig-editor-panel ${G === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${G === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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
          value="${St(String(a.value || ""))}"
          data-field-id="${d}"
        />
        ${l}
      `;
    if (a.type === "text") {
      const m = St(String(a.value || ""));
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
  function Ue(a) {
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
  function Se(a, l, d = { syncOverlay: !1 }) {
    const p = document.getElementById("sig-type-preview"), m = r.fieldState.get(a);
    if (!m) return;
    const E = ht(String(l || "").trim());
    if (d?.syncOverlay && (E ? x(a, E) : g(a), h()), !!p) {
      if (E) {
        p.textContent = E;
        return;
      }
      p.textContent = m.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function He(a) {
    const l = String(r.signatureTabByField.get(a) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function et(a, l) {
    const d = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    r.signatureTabByField.set(l, d), document.querySelectorAll(".sig-editor-tab").forEach((m) => {
      m.classList.remove("border-blue-600", "text-blue-600"), m.classList.add("border-transparent", "text-gray-500"), m.setAttribute("aria-selected", "false"), m.setAttribute("tabindex", "-1");
    });
    const p = document.querySelector(`.sig-editor-tab[data-tab="${d}"]`);
    if (p?.classList.add("border-blue-600", "text-blue-600"), p?.classList.remove("border-transparent", "text-gray-500"), p?.setAttribute("aria-selected", "true"), p?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", d !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", d !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", d !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", d !== "saved"), (d === "draw" || d === "upload" || d === "saved") && p && requestAnimationFrame(() => mt(l)), d === "type") {
      const m = document.getElementById("sig-type-input");
      Se(l, m?.value || "");
    }
    d === "saved" && _(l).catch(ne);
  }
  function Ne(a) {
    r.signatureTabByField.set(a, "draw"), et("draw", a);
    const l = document.getElementById("sig-type-input");
    l && Se(a, l.value || "");
  }
  function mt(a) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || r.signatureCanvases.has(a)) return;
    const d = l.closest(".signature-canvas-container"), p = l.getContext("2d");
    if (!p) return;
    const m = l.getBoundingClientRect();
    if (!m.width || !m.height) return;
    const E = window.devicePixelRatio || 1;
    l.width = m.width * E, l.height = m.height * E, p.scale(E, E), p.lineCap = "round", p.lineJoin = "round", p.strokeStyle = "#1f2937", p.lineWidth = 2.5;
    let A = !1, G = 0, te = 0, Ce = [];
    const me = (he) => {
      const ze = l.getBoundingClientRect();
      let Ct, Lt;
      return he.touches && he.touches.length > 0 ? (Ct = he.touches[0].clientX, Lt = he.touches[0].clientY) : he.changedTouches && he.changedTouches.length > 0 ? (Ct = he.changedTouches[0].clientX, Lt = he.changedTouches[0].clientY) : (Ct = he.clientX, Lt = he.clientY), {
        x: Ct - ze.left,
        y: Lt - ze.top,
        timestamp: Date.now()
      };
    }, Le = (he) => {
      A = !0;
      const ze = me(he);
      G = ze.x, te = ze.y, Ce = [{ x: ze.x, y: ze.y, t: ze.timestamp, width: 2.5 }], d && d.classList.add("drawing");
    }, ft = (he) => {
      if (!A) return;
      const ze = me(he);
      Ce.push({ x: ze.x, y: ze.y, t: ze.timestamp, width: 2.5 });
      const Ct = ze.x - G, Lt = ze.y - te, Ri = ze.timestamp - (Ce[Ce.length - 2]?.t || ze.timestamp), $i = Math.sqrt(Ct * Ct + Lt * Lt) / Math.max(Ri, 1), Fi = 2.5, Bi = 1.5, Ui = 4, Hi = Math.min($i / 5, 1), Fn = Math.max(Bi, Math.min(Ui, Fi - Hi * 1.5));
      Ce[Ce.length - 1].width = Fn, p.lineWidth = Fn, p.beginPath(), p.moveTo(G, te), p.lineTo(ze.x, ze.y), p.stroke(), G = ze.x, te = ze.y;
    }, yt = () => {
      if (A = !1, Ce.length > 1) {
        const he = r.signatureCanvases.get(a);
        he && (he.strokes.push(Ce.map((ze) => ({ ...ze }))), he.redoStack = []), Ve(a);
      }
      Ce = [], d && d.classList.remove("drawing");
    };
    l.addEventListener("mousedown", Le), l.addEventListener("mousemove", ft), l.addEventListener("mouseup", yt), l.addEventListener("mouseout", yt), l.addEventListener("touchstart", (he) => {
      he.preventDefault(), he.stopPropagation(), Le(he);
    }, { passive: !1 }), l.addEventListener("touchmove", (he) => {
      he.preventDefault(), he.stopPropagation(), ft(he);
    }, { passive: !1 }), l.addEventListener("touchend", (he) => {
      he.preventDefault(), yt();
    }, { passive: !1 }), l.addEventListener("touchcancel", yt), l.addEventListener("gesturestart", (he) => he.preventDefault()), l.addEventListener("gesturechange", (he) => he.preventDefault()), l.addEventListener("gestureend", (he) => he.preventDefault()), r.signatureCanvases.set(a, {
      canvas: l,
      ctx: p,
      dpr: E,
      drawWidth: m.width,
      drawHeight: m.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), P(a);
  }
  function P(a) {
    const l = r.signatureCanvases.get(a), d = r.fieldState.get(a);
    if (!l || !d) return;
    const p = se(d);
    p && $(a, p, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function $(a, l, d = { clearStrokes: !1 }) {
    const p = r.signatureCanvases.get(a);
    if (!p) return !1;
    const m = String(l || "").trim();
    if (!m)
      return p.baseImageDataUrl = "", p.baseImage = null, d.clearStrokes && (p.strokes = [], p.redoStack = []), B(a), !0;
    const { drawWidth: E, drawHeight: A } = p, G = new Image();
    return await new Promise((te) => {
      G.onload = () => {
        d.clearStrokes && (p.strokes = [], p.redoStack = []), p.baseImage = G, p.baseImageDataUrl = m, E > 0 && A > 0 && B(a), te(!0);
      }, G.onerror = () => te(!1), G.src = m;
    });
  }
  function B(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return;
    const { ctx: d, drawWidth: p, drawHeight: m, baseImage: E, strokes: A } = l;
    if (d.clearRect(0, 0, p, m), E) {
      const G = Math.min(p / E.width, m / E.height), te = E.width * G, Ce = E.height * G, me = (p - te) / 2, Le = (m - Ce) / 2;
      d.drawImage(E, me, Le, te, Ce);
    }
    for (const G of A)
      for (let te = 1; te < G.length; te++) {
        const Ce = G[te - 1], me = G[te];
        d.lineWidth = Number(me.width || 2.5) || 2.5, d.beginPath(), d.moveTo(Ce.x, Ce.y), d.lineTo(me.x, me.y), d.stroke();
      }
  }
  function J(a) {
    const l = r.signatureCanvases.get(a);
    if (!l || l.strokes.length === 0) return;
    const d = l.strokes.pop();
    d && l.redoStack.push(d), B(a), Ve(a);
  }
  function ee(a) {
    const l = r.signatureCanvases.get(a);
    if (!l || l.redoStack.length === 0) return;
    const d = l.redoStack.pop();
    d && l.strokes.push(d), B(a), Ve(a);
  }
  function Y(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: d, ctx: p } = l;
    return p.getImageData(0, 0, d.width, d.height).data.some((E, A) => A % 4 === 3 && E > 0);
  }
  function Ve(a) {
    const l = r.signatureCanvases.get(a);
    l && (Y(a) ? C(a, l.canvas.toDataURL("image/png")) : g(a), h());
  }
  function Ge(a) {
    const l = r.signatureCanvases.get(a);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", B(a)), g(a), h();
    const d = document.getElementById("sig-upload-preview-wrap"), p = document.getElementById("sig-upload-preview");
    d && d.classList.add("hidden"), p && p.removeAttribute("src");
  }
  function K() {
    const a = document.getElementById("field-editor-overlay"), l = a.querySelector(".field-editor");
    if (cn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", r.activeFieldId) {
      const d = document.querySelector(`.field-list-item[data-field-id="${r.activeFieldId}"]`);
      requestAnimationFrame(() => {
        d?.focus();
      });
    }
    b(), h(), r.activeFieldId = null, r.signatureCanvases.clear(), ot("Field editor closed.");
  }
  function pe(a) {
    const l = Number(a) || 0;
    return l <= 0 ? 0 : Math.max(0, Math.ceil((l - Date.now()) / 1e3));
  }
  function Ee(a, l = {}) {
    const d = Number(l.retry_after_seconds);
    if (Number.isFinite(d) && d > 0)
      return Math.ceil(d);
    const p = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!p) return 0;
    const m = Number(p);
    return Number.isFinite(m) && m > 0 ? Math.ceil(m) : 0;
  }
  async function dt(a, l) {
    let d = {};
    try {
      d = await a.json();
    } catch {
      d = {};
    }
    const p = d?.error || {}, m = p?.details && typeof p.details == "object" ? p.details : {}, E = Ee(a, m), A = a?.status === 429, G = A ? E > 0 ? `Too many actions too quickly. Please wait ${E}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(p?.message || l || "Request failed"), te = new Error(G);
    return te.status = a?.status || 0, te.code = String(p?.code || ""), te.details = m, te.rateLimited = A, te.retryAfterSeconds = E, te;
  }
  function ut(a) {
    const l = Math.max(1, Number(a) || 1);
    r.writeCooldownUntil = Date.now() + l * 1e3, r.writeCooldownTimer && (clearInterval(r.writeCooldownTimer), r.writeCooldownTimer = null);
    const d = () => {
      const p = document.getElementById("field-editor-save");
      if (!p) return;
      const m = pe(r.writeCooldownUntil);
      if (m <= 0) {
        r.pendingSaves.has(r.activeFieldId || "") || (p.disabled = !1, p.innerHTML = "Insert"), r.writeCooldownTimer && (clearInterval(r.writeCooldownTimer), r.writeCooldownTimer = null);
        return;
      }
      p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${m}s`;
    };
    d(), r.writeCooldownTimer = setInterval(d, 250);
  }
  function Ot(a) {
    const l = Math.max(1, Number(a) || 1);
    r.submitCooldownUntil = Date.now() + l * 1e3, r.submitCooldownTimer && (clearInterval(r.submitCooldownTimer), r.submitCooldownTimer = null);
    const d = () => {
      const p = pe(r.submitCooldownUntil);
      _t(), p <= 0 && r.submitCooldownTimer && (clearInterval(r.submitCooldownTimer), r.submitCooldownTimer = null);
    };
    d(), r.submitCooldownTimer = setInterval(d, 250);
  }
  async function An() {
    const a = r.activeFieldId;
    if (!a) return;
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = pe(r.writeCooldownUntil);
    if (d > 0) {
      const m = `Please wait ${d}s before saving again.`;
      window.toastManager && window.toastManager.error(m), ot(m, "assertive");
      return;
    }
    const p = document.getElementById("field-editor-save");
    p.disabled = !0, p.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      r.profileRemember = we();
      let m = !1;
      if (l.type === "signature" || l.type === "initials")
        m = await sn(a);
      else if (l.type === "checkbox") {
        const E = document.getElementById("field-checkbox-input");
        m = await rn(a, null, E?.checked || !1);
      } else {
        const A = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!A && l.required)
          throw new Error("This field is required");
        m = await rn(a, A, null);
      }
      if (m) {
        K(), kn(), _t(), Rn(), ge(), Ei(a), Li(a);
        const E = $n();
        E.allRequiredComplete ? ot("Field saved. All required fields complete. Ready to submit.") : ot(`Field saved. ${E.remainingRequired} required field${E.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (m) {
      m?.rateLimited && ut(m.retryAfterSeconds), window.toastManager && window.toastManager.error(m.message), ot(`Error saving field: ${m.message}`, "assertive");
    } finally {
      if (pe(r.writeCooldownUntil) > 0) {
        const m = pe(r.writeCooldownUntil);
        p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${m}s`;
      } else
        p.disabled = !1, p.innerHTML = "Insert";
    }
  }
  async function sn(a) {
    const l = r.fieldState.get(a), d = document.getElementById("sig-type-input"), p = He(a);
    if (p === "draw" || p === "upload" || p === "saved") {
      const E = r.signatureCanvases.get(a);
      if (!E) return !1;
      if (!Y(a))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const A = E.canvas.toDataURL("image/png");
      return await Pn(a, { type: "drawn", dataUrl: A }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const E = d?.value?.trim();
      if (!E)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await rn(a, E, null) : await Pn(a, { type: "typed", text: E }, E);
    }
  }
  async function rn(a, l, d) {
    r.pendingSaves.add(a);
    const p = Date.now(), m = r.fieldState.get(a);
    try {
      const E = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: a,
          value_text: l,
          value_bool: d
        })
      });
      if (!E.ok)
        throw await dt(E, "Failed to save field");
      const A = r.fieldState.get(a);
      return A && (A.value = l ?? d, A.completed = !0, A.hasError = !1), await ve(A), window.toastManager && window.toastManager.success("Field saved"), c.trackFieldSave(a, A?.type, !0, Date.now() - p), !0;
    } catch (E) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = E.message), c.trackFieldSave(a, m?.type, !1, Date.now() - p, E.message), E;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function Pn(a, l, d) {
    r.pendingSaves.add(a);
    const p = Date.now(), m = l?.type || "typed";
    try {
      let E;
      if (m === "drawn") {
        const te = await L.uploadDrawnSignature(
          a,
          l.dataUrl
        );
        E = {
          field_instance_id: a,
          type: "drawn",
          value_text: d,
          object_key: te.objectKey,
          sha256: te.sha256,
          upload_token: te.uploadToken
        };
      } else
        E = await xi(a, d);
      const A = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(E)
      });
      if (!A.ok)
        throw await dt(A, "Failed to save signature");
      const G = r.fieldState.get(a);
      return G && (G.value = d, G.completed = !0, G.hasError = !1, l?.dataUrl && (G.signaturePreviewUrl = l.dataUrl)), await ve(G, {
        signatureType: m,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), c.trackSignatureAttach(a, m, !0, Date.now() - p), !0;
    } catch (E) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = E.message), c.trackSignatureAttach(a, m, !1, Date.now() - p, E.message), E;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function xi(a, l) {
    const d = `${l}|${a}`, p = await Ii(d), m = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: l,
      object_key: m,
      sha256: p
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Ii(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const l = new TextEncoder().encode(a), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function kn() {
    let a = 0;
    r.fieldState.forEach((G) => {
      G.required, G.completed && a++;
    });
    const l = r.fieldState.size, d = l > 0 ? a / l * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = l;
    const p = document.getElementById("progress-ring-circle"), m = 97.4, E = m - d / 100 * m;
    p.style.strokeDashoffset = E, document.getElementById("mobile-progress").style.width = `${d}%`;
    const A = l - a;
    document.getElementById("fields-status").textContent = A > 0 ? `${A} remaining` : "All complete";
  }
  function _t() {
    const a = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), d = document.getElementById("incomplete-message"), p = pe(r.submitCooldownUntil);
    let m = [], E = !1;
    r.fieldState.forEach((G, te) => {
      G.required && !G.completed && m.push(G), G.hasError && (E = !0);
    });
    const A = r.hasConsented && m.length === 0 && !E && r.pendingSaves.size === 0 && p === 0 && !r.isSubmitting;
    a.disabled = !A, !r.isSubmitting && p > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s` : !r.isSubmitting && p === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), r.hasConsented ? p > 0 ? (l.classList.remove("hidden"), d.textContent = `Please wait ${p}s before submitting again.`) : E ? (l.classList.remove("hidden"), d.textContent = "Some fields failed to save. Please retry.") : m.length > 0 ? (l.classList.remove("hidden"), d.textContent = `Complete ${m.length} required field${m.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), d.textContent = "Please accept the consent agreement");
  }
  function Ei(a) {
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
  function Ci() {
    const a = Array.from(r.fieldState.values()).filter((l) => l.required);
    return a.sort((l, d) => {
      const p = Number(l.page || 0), m = Number(d.page || 0);
      if (p !== m) return p - m;
      const E = Number(l.tabIndex || 0), A = Number(d.tabIndex || 0);
      if (E > 0 && A > 0 && E !== A) return E - A;
      if (E > 0 != A > 0) return E > 0 ? -1 : 1;
      const G = Number(l.posY || 0), te = Number(d.posY || 0);
      if (G !== te) return G - te;
      const Ce = Number(l.posX || 0), me = Number(d.posX || 0);
      return Ce !== me ? Ce - me : String(l.id || "").localeCompare(String(d.id || ""));
    }), a;
  }
  function _n(a) {
    r.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((l) => l.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((l) => l.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function Li(a) {
    const l = Ci(), d = l.filter((A) => !A.completed);
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
    const E = Number(m.page || 1);
    E !== r.currentPage && xe(E), O(m.id, { openEditor: !1 }), _n(m.id), setTimeout(() => {
      _n(m.id), z(m.id), c.track("guided_next_completed", { toFieldId: m.id, page: m.page }), ot(`Next required field highlighted on page ${m.page}.`);
    }, 120);
  }
  function Dn() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", on(a.querySelector(".field-editor")), ot("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function an() {
    const a = document.getElementById("consent-modal"), l = a.querySelector(".field-editor");
    cn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ot("Consent dialog closed.");
  }
  async function Ti() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const l = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!l.ok)
        throw await dt(l, "Failed to accept consent");
      r.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), an(), _t(), Rn(), c.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ot("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), ot(`Error: ${l.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function Ai() {
    const a = document.getElementById("submit-btn"), l = pe(r.submitCooldownUntil);
    if (l > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${l}s before submitting again.`), _t();
      return;
    }
    r.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const d = `submit-${n.recipientId}-${Date.now()}`, p = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": d }
      });
      if (!p.ok)
        throw await dt(p, "Failed to submit");
      c.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (d) {
      c.trackSubmit(!1, d.message), d?.rateLimited && Ot(d.retryAfterSeconds), window.toastManager && window.toastManager.error(d.message);
    } finally {
      r.isSubmitting = !1, _t();
    }
  }
  function Pi() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", on(a.querySelector(".field-editor")), ot("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Mn() {
    const a = document.getElementById("decline-modal"), l = a.querySelector(".field-editor");
    cn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ot("Decline dialog closed.");
  }
  async function ki() {
    const a = document.getElementById("decline-reason").value;
    try {
      const l = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!l.ok)
        throw await dt(l, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message);
    }
  }
  function _i() {
    c.trackDegradedMode("viewer_load_failure"), c.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Di() {
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
  const Et = {
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
          console.log("[E-Sign Debug] Reloading viewer..."), M();
        },
        setLowMemory: (a) => {
          r.isLowMemory = a, Ke(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), M(), this.updatePanel();
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
  function ot(a, l = "polite") {
    const d = l === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    d && (d.textContent = "", requestAnimationFrame(() => {
      d.textContent = a;
    }));
  }
  function on(a) {
    const d = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), p = d[0], m = d[d.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function E(A) {
      A.key === "Tab" && (A.shiftKey ? document.activeElement === p && (A.preventDefault(), m?.focus()) : document.activeElement === m && (A.preventDefault(), p?.focus()));
    }
    a.addEventListener("keydown", E), a._focusTrapHandler = E, requestAnimationFrame(() => {
      p?.focus();
    });
  }
  function cn(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const l = a.dataset.previousFocus;
    if (l) {
      const d = document.getElementById(l);
      requestAnimationFrame(() => {
        d?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function Rn() {
    const a = $n(), l = document.getElementById("submit-status");
    l && (a.allRequiredComplete && r.hasConsented ? l.textContent = "All required fields complete. You can now submit." : r.hasConsented ? l.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : l.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function $n() {
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
  function Mi(a, l = 1) {
    const d = Array.from(r.fieldState.keys()), p = d.indexOf(a);
    if (p === -1) return null;
    const m = p + l;
    return m >= 0 && m < d.length ? d[m] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (K(), an(), Mn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), d = l.indexOf(a.target);
      if (d !== -1) {
        let p = d;
        if (a.key === "ArrowRight" && (p = (d + 1) % l.length), a.key === "ArrowLeft" && (p = (d - 1 + l.length) % l.length), a.key === "Home" && (p = 0), a.key === "End" && (p = l.length - 1), p !== d) {
          a.preventDefault();
          const m = l[p], E = m.getAttribute("data-tab") || "draw", A = m.getAttribute("data-field-id");
          A && et(E, A), m.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const l = a.target.dataset.fieldId, d = a.key === "ArrowDown" ? 1 : -1, p = Mi(l, d);
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
class vi {
  constructor(e) {
    this.config = e;
  }
  init() {
    hr(this.config);
  }
  destroy() {
  }
}
function ba(i) {
  const e = new vi(i);
  return Te(() => e.init()), e;
}
function fr() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && Te(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = fr();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new vi(e);
  t.init(), window.esignSignerReviewController = t;
});
class yi {
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
    kt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), kt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function wa(i = {}) {
  const e = new yi(i);
  return Te(() => e.init()), e;
}
function Sa(i = {}) {
  const e = new yi(i);
  Te(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class En {
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
    e && k(e), t && j(t), n && k(n), s && k(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && k(e), t && k(t), n && k(n), s && j(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: o, viewer: c } = this.elements;
    t && k(t), n && k(n), s && j(s), c && k(c), o && (o.textContent = e);
  }
}
function xa(i) {
  const e = new En(i);
  return e.init(), e;
}
function Ia(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new En(e);
  Te(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && Te(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new En({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class Ea {
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
class Ca {
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
function vr(i) {
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
function yr(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function br(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((o) => String(o || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((o) => o !== s)] : n;
}
function La(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Ta(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: vr(e.type),
    options: yr(e.options),
    operators: br(e.operators, e.default_operator)
  })) : [];
}
function Aa(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function Pa(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ka(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function _a(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([c, r]) => `${c}: ${r}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", o = e?.message || `${i} failed`;
    t.error(n ? `${s}${o}: ${n}` : `${s}${o}`);
  }
}
function Da(i, e) {
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
function Ma(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const Ra = {
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
}, nn = "application/vnd.google-apps.document", Cn = "application/vnd.google-apps.spreadsheet", Ln = "application/vnd.google-apps.presentation", bi = "application/vnd.google-apps.folder", Tn = "application/pdf", wr = [nn, Tn], wi = "esign.google.account_id";
function Sr(i) {
  return i.mimeType === nn;
}
function xr(i) {
  return i.mimeType === Tn;
}
function Mt(i) {
  return i.mimeType === bi;
}
function Ir(i) {
  return wr.includes(i.mimeType);
}
function $a(i) {
  return i.mimeType === nn || i.mimeType === Cn || i.mimeType === Ln;
}
function Er(i) {
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
function Fa(i) {
  return i.map(Er);
}
function Si(i) {
  return {
    [nn]: "Google Doc",
    [Cn]: "Google Sheet",
    [Ln]: "Google Slides",
    [bi]: "Folder",
    [Tn]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Cr(i) {
  return Mt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Sr(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : xr(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === Cn ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Ln ? {
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
function Lr(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Tr(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function Ba(i, e) {
  const t = i.get("account_id");
  if (t)
    return Yt(t);
  if (e)
    return Yt(e);
  const n = localStorage.getItem(wi);
  return n ? Yt(n) : "";
}
function Yt(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function Ua(i) {
  const e = Yt(i);
  e && localStorage.setItem(wi, e);
}
function Ha(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Oa(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function Na(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function Rt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Ar(i) {
  const e = Cr(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function za(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const o = s === t.length - 1, c = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return o ? `${c}<span class="text-gray-900 font-medium">${Rt(n.name)}</span>` : `${c}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${Rt(n.name)}</button>`;
  }).join("");
}
function Pr(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, o = Ar(i), c = Mt(i), r = Ir(i), h = c ? "cursor-pointer hover:bg-gray-50" : r ? "cursor-pointer hover:bg-blue-50" : "opacity-60", g = c ? `data-folder-id="${i.id}" data-folder-name="${Rt(i.name)}"` : r && t ? `data-file-id="${i.id}" data-file-name="${Rt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${h} file-item"
      ${g}
      role="listitem"
      ${r ? 'tabindex="0"' : ""}
    >
      ${o}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${Rt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Si(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Lr(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${Tr(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${r && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function ja(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${Rt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((o, c) => Mt(o) && !Mt(c) ? -1 : !Mt(o) && Mt(c) ? 1 : o.name.localeCompare(c.name)).map((o) => Pr(o, { selectable: n })).join("")}
    </div>
  `;
}
function qa(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Si(i.mimeType)
  };
}
export {
  Vi as AGREEMENT_STATUS_BADGES,
  fi as AgreementFormController,
  En as DocumentDetailPreviewController,
  In as DocumentFormController,
  Oi as ESignAPIClient,
  Ni as ESignAPIError,
  wi as GOOGLE_ACCOUNT_STORAGE_KEY,
  si as GoogleCallbackController,
  ai as GoogleDrivePickerController,
  ri as GoogleIntegrationController,
  wr as IMPORTABLE_MIME_TYPES,
  li as IntegrationConflictsController,
  oi as IntegrationHealthController,
  ci as IntegrationMappingsController,
  di as IntegrationSyncRunsController,
  xn as LandingPageController,
  nn as MIME_GOOGLE_DOC,
  bi as MIME_GOOGLE_FOLDER,
  Cn as MIME_GOOGLE_SHEET,
  Ln as MIME_GOOGLE_SLIDES,
  Tn as MIME_PDF,
  Ea as PanelPaginationBehavior,
  Ca as PanelSearchBehavior,
  Ra as STANDARD_GRID_SELECTORS,
  ii as SignerCompletePageController,
  yi as SignerErrorPageController,
  vi as SignerReviewController,
  lt as announce,
  Ha as applyAccountIdToPath,
  Xi as applyDetailFormatters,
  ar as bootstrapAgreementForm,
  Ia as bootstrapDocumentDetailPreview,
  va as bootstrapDocumentForm,
  ia as bootstrapGoogleCallback,
  oa as bootstrapGoogleDrivePicker,
  ra as bootstrapGoogleIntegration,
  ga as bootstrapIntegrationConflicts,
  la as bootstrapIntegrationHealth,
  ua as bootstrapIntegrationMappings,
  ha as bootstrapIntegrationSyncRuns,
  Zr as bootstrapLandingPage,
  ta as bootstrapSignerCompletePage,
  Sa as bootstrapSignerErrorPage,
  hr as bootstrapSignerReview,
  Oa as buildScopedApiUrl,
  Nr as byId,
  qi as capitalize,
  ji as createESignClient,
  Wi as createElement,
  Ma as createSchemaActionCachingRefresh,
  qa as createSelectedFile,
  Hr as createStatusBadgeElement,
  Kr as createTimeoutController,
  Aa as dateTimeCellRenderer,
  Xt as debounce,
  _a as defaultActionErrorHandler,
  ka as defaultActionSuccessHandler,
  jr as delegate,
  Rt as escapeHtml,
  Pa as fileSizeCellRenderer,
  Mr as formatDate,
  Kt as formatDateTime,
  Tr as formatDriveDate,
  Lr as formatDriveFileSize,
  Gt as formatFileSize,
  Dr as formatPageCount,
  Fr as formatRecipientCount,
  $r as formatRelativeTime,
  Yi as formatSizeElements,
  Rr as formatTime,
  Ki as formatTimestampElements,
  ti as getAgreementStatusBadge,
  _r as getESignClient,
  Cr as getFileIconConfig,
  Si as getFileTypeName,
  Ji as getPageConfig,
  k as hide,
  ya as initAgreementForm,
  Qi as initDetailFormatters,
  xa as initDocumentDetailPreview,
  fa as initDocumentForm,
  na as initGoogleCallback,
  aa as initGoogleDrivePicker,
  sa as initGoogleIntegration,
  pa as initIntegrationConflicts,
  ca as initIntegrationHealth,
  da as initIntegrationMappings,
  ma as initIntegrationSyncRuns,
  Qr as initLandingPage,
  ea as initSignerCompletePage,
  wa as initSignerErrorPage,
  ba as initSignerReview,
  Mt as isFolder,
  Sr as isGoogleDoc,
  $a as isGoogleWorkspaceFile,
  Ir as isImportable,
  xr as isPDF,
  Yt as normalizeAccountId,
  Er as normalizeDriveFile,
  Fa as normalizeDriveFiles,
  br as normalizeFilterOperators,
  yr as normalizeFilterOptions,
  vr as normalizeFilterType,
  zr as on,
  Te as onReady,
  Wr as poll,
  Ta as prepareFilterFields,
  La as prepareGridColumns,
  u as qs,
  kt as qsa,
  za as renderBreadcrumb,
  Ar as renderFileIcon,
  Pr as renderFileItem,
  ja as renderFileList,
  Gi as renderStatusBadge,
  Ba as resolveAccountId,
  Jr as retry,
  Ua as saveAccountId,
  zi as setESignClient,
  Vr as setLoading,
  Da as setupRefreshButton,
  j as show,
  ni as sleep,
  Br as snakeToTitle,
  Na as syncAccountIdToUrl,
  Yr as throttle,
  qr as toggle,
  Ur as truncate,
  Bt as updateDataText,
  Gr as updateDataTexts,
  Or as updateStatusBadge,
  Xr as withTimeout
};
//# sourceMappingURL=index.js.map

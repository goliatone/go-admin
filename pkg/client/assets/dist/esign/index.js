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
function V(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function _(i) {
  i && i.classList.add("hidden");
}
function qr(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? V(i) : _(i);
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
  let g = 0, y;
  for (; g < o; ) {
    if (r?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - h >= s)
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
    await ni(n, r);
  }
  return {
    result: y,
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
  for (let y = 1; y <= t; y++) {
    if (h?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (S) {
      if (g = S, y >= t || !c(S, y))
        throw S;
      const D = o ? Math.min(n * Math.pow(2, y - 1), s) : n;
      r && r(S, y, D), await ni(D, h);
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
      s && (n === e ? V(s) : _(s));
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
    switch (_(t), _(n), _(s), e) {
      case "loading":
        V(t);
        break;
      case "success":
        V(n);
        break;
      case "error":
        V(s);
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
    s && (s.textContent = Bn[e] || Bn.unknown), t && o && (o.textContent = t, V(o)), this.sendToOpener({
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
      oauthModal: y,
      disconnectModal: S
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, S && V(S);
    }), r && r.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, S && _(S);
    }), h && h.addEventListener("click", () => this.disconnect()), c && c.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), g && (g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, !0);
    }), g.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(g.value, !0));
    }));
    const { accountDropdown: D, connectFirstBtn: L } = this.elements;
    D && D.addEventListener("change", () => {
      D.value === "__new__" ? (D.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(D.value, !0);
    }), L && L.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (y && !y.classList.contains("hidden") && this.cancelOAuthFlow(), S && !S.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, _(S)));
    }), [y, S].forEach((f) => {
      f && f.addEventListener("click", (C) => {
        const w = C.target;
        (w === f || w.getAttribute("aria-hidden") === "true") && (_(f), f === y ? this.cancelOAuthFlow() : f === S && (this.pendingDisconnectAccountId = null));
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
    switch (_(t), _(n), _(s), _(o), e) {
      case "loading":
        V(t);
        break;
      case "disconnected":
        V(n);
        break;
      case "connected":
        V(s);
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
    const t = (C, w) => {
      for (const E of C)
        if (Object.prototype.hasOwnProperty.call(e, E) && e[E] !== void 0 && e[E] !== null)
          return e[E];
      return w;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), o = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), c = t(["connected", "Connected"], !1), r = t(["degraded", "Degraded"], !1), h = t(["degraded_reason", "DegradedReason"], ""), g = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), y = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), S = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let D = t(["is_expired", "IsExpired"], void 0), L = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof D != "boolean" || typeof L != "boolean") && n) {
      const C = new Date(n);
      if (!Number.isNaN(C.getTime())) {
        const w = C.getTime() - Date.now(), E = 5 * 60 * 1e3;
        D = w <= 0, L = w > 0 && w <= E;
      }
    }
    const f = typeof S == "boolean" ? S : (D === !0 || L === !0) && !y;
    return {
      connected: c,
      account_id: o,
      email: g,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: D === !0,
      is_expiring_soon: L === !0,
      can_auto_refresh: y,
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
      c.textContent = "Access token status unknown", r && _(r);
      return;
    }
    const g = new Date(e), y = /* @__PURE__ */ new Date(), S = Math.max(
      1,
      Math.round((g.getTime() - y.getTime()) / (1e3 * 60))
    );
    t ? s ? (c.textContent = "Access token expired, but refresh is available and will be applied automatically.", c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), r && _(r)) : (c.textContent = "Access token has expired. Please re-authorize.", c.classList.remove("text-gray-500"), c.classList.add("text-red-600"), r && V(r), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), s ? (c.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}. Refresh is available automatically.`, r && _(r)) : (c.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}`, r && V(r), h && (h.textContent = `Your access token will expire in ${S} minute${S !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (c.textContent = `Token valid until ${g.toLocaleDateString()} ${g.toLocaleTimeString()}`, r && _(r)), !o && r && _(r);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (V(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : _(n));
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
    if (e && _(e), this.accounts.length === 0) {
      t && V(t), n && _(n);
      return;
    }
    t && _(t), n && (V(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, c = t ? "ring-2 ring-blue-500" : "", r = n[e.status] || "bg-white border-gray-200", h = s[e.status] || "bg-gray-100 text-gray-700", g = o[e.status] || e.status, y = e.account_id || "default", S = e.email || (e.account_id ? e.account_id : "Default account");
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
        this.pendingDisconnectAccountId = r, t && V(t);
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
    const s = this.resolveOAuthRedirectURI(), o = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = o;
    const c = this.buildGoogleOAuthUrl(s, o);
    if (!c) {
      t && _(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const r = 500, h = 600, g = (window.screen.width - r) / 2, y = (window.screen.height - h) / 2;
    if (this.oauthWindow = window.open(
      c,
      "google_oauth",
      `width=${r},height=${h},left=${g},top=${y},popup=yes`
    ), !this.oauthWindow) {
      t && _(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (S) => this.handleOAuthCallback(S), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && _(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    if (this.cleanupOAuthFlow(), n && _(n), this.closeOAuthWindow(), t.error) {
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
    e && _(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && _(e);
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
      importModal: y,
      viewListBtn: S,
      viewGridBtn: D
    } = this.elements;
    if (e) {
      const f = Xt(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (C) => {
        C.key === "Enter" && (C.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), c && c.addEventListener("click", () => this.clearSelection()), r && r.addEventListener("click", () => this.hideImportModal()), h && g && g.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), y && y.addEventListener("click", (f) => {
      const C = f.target;
      (C === y || C.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), S && S.addEventListener("click", () => this.setViewMode("list")), D && D.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && y && !y.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: L } = this.elements;
    L && L.addEventListener("click", (f) => this.handleFileListClick(f));
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, V(e)) : _(e)), t) {
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
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : r ? [r] : [], y = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && V(t));
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
      this.isLoading = !1, t && _(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && _(t), this.currentFiles.length === 0) {
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
      openInGoogleBtn: y
    } = this.elements;
    if (!this.selectedFile) {
      e && V(e), t && _(t);
      return;
    }
    e && _(e), t && V(t);
    const S = this.selectedFile, D = Hn.includes(S.mimeType);
    s && (s.textContent = S.name), o && (o.textContent = this.getMimeTypeLabel(S.mimeType)), c && (c.textContent = S.id), r && S.owners.length > 0 && (r.textContent = S.owners[0].emailAddress || "-"), h && (h.textContent = Kt(S.modifiedTime)), g && (D ? (g.removeAttribute("disabled"), g.classList.remove("opacity-50", "cursor-not-allowed")) : (g.setAttribute("disabled", "true"), g.classList.add("opacity-50", "cursor-not-allowed"))), y && S.webViewLink && (y.href = S.webViewLink);
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
      _(e), t && (t.textContent = "Search Results");
      return;
    }
    V(e);
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
    e && (this.nextPageToken ? V(e) : _(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? V(t) : _(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && _(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    s && (s.value = ""), e && V(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && _(e);
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
          document_title: r,
          agreement_title: h || void 0
        })
      });
      if (!g.ok) {
        const S = await g.json();
        throw new Error(S.error?.message || "Import failed");
      }
      const y = await g.json();
      this.showToast("Import started successfully", "success"), lt("Import started"), this.hideImportModal(), y.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${y.document.id}` : y.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${y.agreement.id}`);
    } catch (g) {
      console.error("Import error:", g);
      const y = g instanceof Error ? g.message : "Import failed";
      this.showToast(y, "error"), lt(`Error: ${y}`);
    } finally {
      e && e.removeAttribute("disabled"), t && _(t), n && (n.textContent = "Import");
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
    const r = o.width, h = o.height, g = 40, y = r - g * 2, S = h - g * 2;
    c.clearRect(0, 0, r, h);
    const D = t.labels, L = Object.values(t.datasets), f = y / D.length / (L.length + 1), C = Math.max(...L.flat()) || 1;
    D.forEach((w, E) => {
      const T = g + E * y / D.length + f / 2;
      L.forEach((P, J) => {
        const z = P[E] / C * S, oe = T + J * f, O = h - g - z;
        c.fillStyle = n[J] || "#6b7280", c.fillRect(oe, O, f - 2, z);
      }), E % Math.ceil(D.length / 6) === 0 && (c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "center", c.fillText(w, T + L.length * f / 2, h - g + 15));
    }), c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "right";
    for (let w = 0; w <= 4; w++) {
      const E = h - g - w * S / 4, T = Math.round(C * w / 4);
      c.fillText(T.toString(), g - 5, E + 3);
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
      mappingForm: y,
      publishCancelBtn: S,
      publishConfirmBtn: D,
      deleteCancelBtn: L,
      deleteConfirmBtn: f,
      closePreviewBtn: C,
      loadSampleBtn: w,
      runPreviewBtn: E,
      clearPreviewBtn: T,
      previewSourceInput: P,
      searchInput: J,
      filterStatus: z,
      filterProvider: oe,
      mappingModal: O,
      publishModal: ne,
      deleteModal: fe,
      previewModal: ce
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.loadMappings()), r?.addEventListener("click", () => this.addSchemaField()), h?.addEventListener("click", () => this.addMappingRule()), g?.addEventListener("click", () => this.validateMapping()), y?.addEventListener("submit", (de) => {
      de.preventDefault(), this.saveMapping();
    }), S?.addEventListener("click", () => this.closePublishModal()), D?.addEventListener("click", () => this.publishMapping()), L?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), C?.addEventListener("click", () => this.closePreviewModal()), w?.addEventListener("click", () => this.loadSamplePayload()), E?.addEventListener("click", () => this.runPreviewTransform()), T?.addEventListener("click", () => this.clearPreview()), P?.addEventListener("input", Xt(() => this.validateSourceJson(), 300)), J?.addEventListener("input", Xt(() => this.renderMappings(), 300)), z?.addEventListener("change", () => this.renderMappings()), oe?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (de) => {
      de.key === "Escape" && (O && !O.classList.contains("hidden") && this.closeModal(), ne && !ne.classList.contains("hidden") && this.closePublishModal(), fe && !fe.classList.contains("hidden") && this.closeDeleteModal(), ce && !ce.classList.contains("hidden") && this.closePreviewModal());
    }), [O, ne, fe, ce].forEach((de) => {
      de?.addEventListener("click", (Oe) => {
        const Ze = Oe.target;
        (Ze === de || Ze.getAttribute("aria-hidden") === "true") && (de === O ? this.closeModal() : de === ne ? this.closePublishModal() : de === fe ? this.closeDeleteModal() : de === ce && this.closePreviewModal());
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
    switch (_(t), _(n), _(s), _(o), e) {
      case "loading":
        V(t);
        break;
      case "empty":
        V(n);
        break;
      case "error":
        V(s);
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
    r?.querySelectorAll(".schema-field-row").forEach((S) => {
      g.push({
        object: (S.querySelector(".field-object")?.value || "").trim(),
        field: (S.querySelector(".field-name")?.value || "").trim(),
        type: S.querySelector(".field-type")?.value || "string",
        required: S.querySelector(".field-required")?.checked || !1
      });
    });
    const y = [];
    return h?.querySelectorAll(".mapping-rule-row").forEach((S) => {
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
      schemaFieldsContainer: h,
      mappingRulesContainer: g,
      mappingStatusBadge: y,
      formValidationStatus: S
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), o && (o.value = e.provider || "");
    const D = e.external_schema || { object_type: "", fields: [] };
    c && (c.value = D.object_type || ""), r && (r.value = D.version || ""), h && (h.innerHTML = "", (D.fields || []).forEach((L) => h.appendChild(this.createSchemaFieldRow(L)))), g && (g.innerHTML = "", (e.rules || []).forEach((L) => g.appendChild(this.createMappingRuleRow(L)))), e.status && y ? (y.innerHTML = this.getStatusBadge(e.status), y.classList.remove("hidden")) : y && y.classList.add("hidden"), _(S);
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
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), o && (o.innerHTML = ""), c && c.classList.add("hidden"), _(r), this.editingMappingId = null;
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
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), V(n), o?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    _(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: o } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), V(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    _(this.elements.publishModal), this.pendingPublishId = null;
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
    _(this.elements.deleteModal), this.pendingDeleteId = null;
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
      V(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, V(t));
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
      previewSourceInput: h,
      sourceSyntaxError: g
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), o && (o.textContent = t.provider), c && (c.textContent = t.external_schema?.object_type || "-"), r && (r.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), h && (h.value = ""), _(g), V(n), h?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    _(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: o } = this.elements;
    switch (_(t), _(n), _(s), _(o), e) {
      case "empty":
        V(t);
        break;
      case "loading":
        V(n);
        break;
      case "error":
        V(s);
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
    }), c[s] = r, e && (e.value = JSON.stringify(c, null, 2)), _(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return _(t), null;
    try {
      const s = JSON.parse(n);
      return _(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, V(t)), null;
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
      const g = this.resolveSourceValue(e, h.source_object, h.source_field), y = g !== void 0;
      if (s.matched_rules.push({
        source: h.source_field,
        matched: y,
        value: g
      }), !!y)
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
    const S = e.agreement || {}, D = Object.entries(S);
    c && (D.length === 0 ? c.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : c.innerHTML = D.map(
      ([L, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(L)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(f))}</span>
          </div>
        `
    ).join("")), r && (r.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((L) => {
      const f = h?.querySelector(`[data-rule-source="${this.escapeHtml(L.source)}"] span`);
      f && (L.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), _(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
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
      resolveForm: y,
      conflictDetailModal: S,
      resolveModal: D
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), h?.addEventListener("click", () => this.openResolveModal("ignored")), g?.addEventListener("click", () => this.closeResolveModal()), y?.addEventListener("submit", (L) => this.submitResolution(L)), document.addEventListener("keydown", (L) => {
      L.key === "Escape" && (D && !D.classList.contains("hidden") ? this.closeResolveModal() : S && !S.classList.contains("hidden") && this.closeConflictDetail());
    }), [S, D].forEach((L) => {
      L?.addEventListener("click", (f) => {
        const C = f.target;
        (C === L || C.getAttribute("aria-hidden") === "true") && (L === S ? this.closeConflictDetail() : L === D && this.closeResolveModal());
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
    switch (_(t), _(n), _(s), _(o), e) {
      case "loading":
        V(t);
        break;
      case "empty":
        V(n);
        break;
      case "error":
        V(s);
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
    const t = this.conflicts.find((z) => z.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: o,
      detailStatusBadge: c,
      detailProvider: r,
      detailExternalId: h,
      detailInternalId: g,
      detailBindingId: y,
      detailConflictId: S,
      detailRunId: D,
      detailCreatedAt: L,
      detailVersion: f,
      detailPayload: C,
      resolutionSection: w,
      actionButtons: E,
      detailResolvedAt: T,
      detailResolvedBy: P,
      detailResolution: J
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), h && (h.textContent = t.external_id || "-"), g && (g.textContent = t.internal_id || "-"), y && (y.textContent = t.binding_id || "-"), S && (S.textContent = t.id), D && (D.textContent = t.run_id || "-"), L && (L.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), C)
      try {
        const z = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        C.textContent = JSON.stringify(z, null, 2);
      } catch {
        C.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (V(w), _(E), T && (T.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), P && (P.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), J)
        try {
          const z = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          J.textContent = JSON.stringify(z, null, 2);
        } catch {
          J.textContent = t.resolution_json || "{}";
        }
    } else
      _(w), V(E);
    V(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    _(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), V(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    _(this.elements.resolveModal);
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
      filterDirection: y,
      actionResumeBtn: S,
      actionRetryBtn: D,
      actionCompleteBtn: L,
      actionFailBtn: f,
      actionDiagnosticsBtn: C,
      startSyncModal: w,
      runDetailModal: E
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (T) => this.startSync(T)), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.loadSyncRuns()), r?.addEventListener("click", () => this.closeRunDetail()), h?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("change", () => this.renderTimeline()), y?.addEventListener("change", () => this.renderTimeline()), S?.addEventListener("click", () => this.runAction("resume")), D?.addEventListener("click", () => this.runAction("resume")), L?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), C?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (T) => {
      T.key === "Escape" && (w && !w.classList.contains("hidden") && this.closeStartSyncModal(), E && !E.classList.contains("hidden") && this.closeRunDetail());
    }), [w, E].forEach((T) => {
      T?.addEventListener("click", (P) => {
        const J = P.target;
        (J === T || J.getAttribute("aria-hidden") === "true") && (T === w ? this.closeStartSyncModal() : T === E && this.closeRunDetail());
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
    switch (_(t), _(n), _(s), _(o), e) {
      case "loading":
        V(t);
        break;
      case "empty":
        V(n);
        break;
      case "error":
        V(s);
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
    t?.reset(), V(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    _(this.elements.startSyncModal);
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
    const t = this.syncRuns.find((P) => P.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: o,
      detailDirection: c,
      detailStatus: r,
      detailStarted: h,
      detailCompleted: g,
      detailCursor: y,
      detailAttempt: S,
      detailErrorSection: D,
      detailLastError: L,
      detailCheckpoints: f,
      actionResumeBtn: C,
      actionRetryBtn: w,
      actionCompleteBtn: E,
      actionFailBtn: T
    } = this.elements;
    s && (s.textContent = t.id), o && (o.textContent = t.provider), c && (c.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), r && (r.innerHTML = this.getStatusBadge(t.status)), h && (h.textContent = this.formatDate(t.started_at)), g && (g.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), y && (y.textContent = t.cursor || "-"), S && (S.textContent = String(t.attempt_count || 1)), t.last_error ? (L && (L.textContent = t.last_error), V(D)) : _(D), C && C.classList.toggle("hidden", t.status !== "running"), w && w.classList.toggle("hidden", t.status !== "failed"), E && E.classList.toggle("hidden", t.status !== "running"), T && T.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), V(n);
    try {
      const P = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (P.ok) {
        const J = await P.json();
        this.renderCheckpoints(J.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (P) {
      console.error("Error loading checkpoints:", P), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    _(this.elements.runDetailModal), this.currentRunId = null;
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
        const S = await y.json();
        throw new Error(S.error?.message || `HTTP ${y.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (g) {
      console.error(`${e} error:`, g);
      const y = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${y}`, "error");
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
      s && (s.value = ""), o && _(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, V(e)) : _(e)), t) {
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
      n.id.replace("panel-", "") === e ? V(n) : _(n);
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
    s && (s.textContent = e.name), o && (o.textContent = Gt(e.size)), t && _(t), n && V(n), c && (c.classList.remove("border-gray-300"), c.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && V(e), t && _(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    e && (e.textContent = "", _(e));
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
      const S = h?.error?.message || h?.message || "Upload failed. Please try again.";
      throw new Error(S);
    }
    const g = h?.object_key ? String(h.object_key).trim() : "";
    if (!g)
      throw new Error("Upload failed: missing source object key.");
    const y = h?.source_original_name ? String(h.source_original_name).trim() : h?.original_name ? String(h.original_name).trim() : e.name;
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
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : r ? [r] : [], y = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
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
      const y = Array.isArray(g.files) ? g.files.map((f) => this.normalizeDriveFile(f)) : [];
      this.nextPageToken = g.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...y] : this.currentFiles = y, this.renderFiles(o);
      const { resultCount: S, listTitle: D } = this.elements;
      n && S ? (S.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, D && (D.textContent = "Search Results")) : (S && (S.textContent = ""), D && (D.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: L } = this.elements;
      L && (this.nextPageToken ? V(L) : _(L)), lt(`Loaded ${y.length} files`);
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
      const c = this.getFileIcon(s), r = this.isImportable(s), h = this.isFolder(s), g = this.selectedFile && this.selectedFile.id === s.id, y = !r && !h;
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
              ${s.modifiedTime ? " • " + Kt(s.modifiedTime) : ""}
              ${y ? " • Not importable" : ""}
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
    t && (t.value = ""), n && _(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      _(e);
      return;
    }
    V(e);
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
      const E = parseInt(w.dataset.fileIndex || "0", 10);
      this.currentFiles[E].id === e.id ? (w.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "true")) : (w.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: o,
      filePreview: c,
      importStatus: r,
      previewIcon: h,
      previewTitle: g,
      previewType: y,
      importTypeInfo: S,
      importTypeLabel: D,
      importTypeDesc: L,
      snapshotWarning: f,
      importDocumentTitle: C
    } = this.elements;
    o && _(o), c && V(c), r && _(r), h && (h.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, h.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), g && (g.textContent = e.name || "Untitled"), y && (y.textContent = this.getFileTypeName(e.mimeType)), n && S && (S.className = `p-3 rounded-lg border ${n.bgClass}`, D && (D.textContent = n.label, D.className = `text-xs font-medium ${n.textClass}`), L && (L.textContent = n.desc, L.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? V(f) : _(f))), C && (C.value = e.name || ""), lt(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && V(e), t && _(t), n && _(n), s && s.querySelectorAll(".file-item").forEach((o) => {
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
      t && _(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && _(t), this.searchQuery = "";
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
    switch (t && _(t), n && _(n), s && V(s), o && _(o), c && _(c), r && _(r), e) {
      case "queued":
      case "running":
        o && V(o);
        break;
      case "succeeded":
        c && V(c);
        break;
      case "failed":
        r && V(r);
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
        s.href = this.applyAccountIdToPath(o), V(s);
      } else
        _(s);
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
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && _(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
        const y = h.error?.code || "";
        throw { message: h.error?.message || "Failed to start import", code: y };
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
  }).promise, c = o.numPages, r = await o.getPage(1), h = r.getViewport({ scale: 1 }), g = e / h.width, y = t / h.height, S = Math.min(g, y, 1), D = r.getViewport({ scale: S }), L = document.createElement("canvas");
  L.width = D.width, L.height = D.height;
  const f = L.getContext("2d");
  if (!f)
    throw new Error("Failed to get canvas context");
  return await r.render({
    canvasContext: f,
    viewport: D
  }).promise, { dataUrl: L.toDataURL("image/jpeg", 0.8), pageCount: c };
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
      const g = n?.claim, y = g?.lastSeenAt ? e.formatRelativeTime(g.lastSeenAt) : "recently";
      r.textContent = `This agreement is active in another tab. Take control here to resume syncing and sending. Last seen ${y}.`, c.classList.remove("hidden"), t(!0);
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
    const y = String(e.wizardId ?? "").trim();
    n.wizardId = y || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, g), n.storageMigrationVersion = this.options.parsePositiveInt(
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
          const g = await o.json().catch(() => ({})), y = Number(g?.error?.details?.current_revision || 0);
          return this.options.statusUpdater("conflict"), this.options.showConflictDialog(y > 0 ? y : n.serverRevision), { conflict: !0 };
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
    collectFieldRulesForState: y,
    expandRulesForPreview: S,
    findSignersMissingRequiredSignatureField: D,
    goToStep: L
  } = i;
  function f() {
    const C = vt("send-readiness-loading"), w = vt("send-readiness-results"), E = vt("send-validation-status"), T = vt("send-validation-issues"), P = vt("send-issues-list"), J = vt("send-confirmation"), z = vt("review-agreement-title"), oe = vt("review-document-title"), O = vt("review-participant-count"), ne = vt("review-stage-count"), fe = vt("review-participants-list"), ce = vt("review-fields-summary"), de = document.getElementById("title");
    if (!C || !w || !E || !T || !P || !J || !z || !oe || !O || !ne || !fe || !ce || !(de instanceof HTMLInputElement))
      return;
    const Oe = de.value || "Untitled", Ze = t?.textContent || "No document", nt = n.querySelectorAll(".participant-entry"), it = s.querySelectorAll(".field-definition-entry"), rt = S(y(), g()), We = h(), $e = /* @__PURE__ */ new Set();
    nt.forEach((se) => {
      const G = se.querySelector(".signing-stage-input"), we = se.querySelector('select[name*=".role"]');
      we instanceof HTMLSelectElement && we.value === "signer" && G instanceof HTMLInputElement && G.value && $e.add(Number.parseInt(G.value, 10));
    }), z.textContent = Oe, oe.textContent = Ze, O.textContent = `${nt.length} (${We.length} signers)`, ne.textContent = String($e.size > 0 ? $e.size : 1), fe.innerHTML = "", nt.forEach((se) => {
      const G = zt(se, 'input[name*=".name"]'), we = zt(se, 'input[name*=".email"]'), Ye = zt(se, 'select[name*=".role"]', "signer"), ve = zt(se, ".signing-stage-input"), Ae = Es(se, ".notify-input", !0), Me = document.createElement("div");
      Me.className = "flex items-center justify-between text-sm", Me.innerHTML = `
        <div>
          <span class="font-medium">${r(G || we)}</span>
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
    ce.textContent = `${_e} field${_e !== 1 ? "s" : ""} defined (${it.length} manual, ${rt.length} generated)`;
    const ue = [];
    e?.value || ue.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), We.length === 0 && ue.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), D().forEach((se) => {
      ue.push({
        severity: "error",
        message: `${se.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Je = Array.from($e).sort((se, G) => se - G);
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
    ke ? (E.className = "p-4 rounded-lg bg-red-50 border border-red-200", E.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, J.classList.add("hidden"), jt(o, !0)) : st ? (E.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", E.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, J.classList.remove("hidden"), jt(o, !1)) : (E.className = "p-4 rounded-lg bg-green-50 border border-green-200", E.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, J.classList.remove("hidden"), jt(o, !1)), c.isOwner || (E.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", E.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, J.classList.add("hidden"), jt(o, !0)), ue.length > 0 ? (T.classList.remove("hidden"), P.innerHTML = "", ue.forEach((se) => {
      const G = document.createElement("li");
      G.className = `p-3 rounded-lg flex items-center justify-between ${se.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, G.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${se.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${se.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${r(se.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${se.step}">
            ${r(se.action)}
          </button>
        `, P.appendChild(G);
    }), P.querySelectorAll("[data-go-to-step]").forEach((se) => {
      se.addEventListener("click", () => {
        const G = Number(se.getAttribute("data-go-to-step"));
        Number.isFinite(G) && L(G);
      });
    })) : T.classList.add("hidden"), C.classList.add("hidden"), w.classList.remove("hidden");
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
    onReviewStep: y,
    onStepChanged: S,
    initialStep: D = 1
  } = i;
  let L = D;
  const f = Array.from(document.querySelectorAll(".wizard-step-btn")), C = Array.from(document.querySelectorAll(".wizard-step")), w = Array.from(document.querySelectorAll(".wizard-connector")), E = document.getElementById("wizard-prev-btn"), T = document.getElementById("wizard-next-btn"), P = document.getElementById("wizard-save-btn");
  function J() {
    if (f.forEach((O, ne) => {
      const fe = ne + 1, ce = O.querySelector(".wizard-step-number");
      ce instanceof HTMLElement && (fe < L ? (O.classList.remove("text-gray-500", "text-blue-600"), O.classList.add("text-green-600"), ce.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), ce.classList.add("bg-green-600", "text-white"), O.removeAttribute("aria-current")) : fe === L ? (O.classList.remove("text-gray-500", "text-green-600"), O.classList.add("text-blue-600"), ce.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), ce.classList.add("bg-blue-600", "text-white"), O.setAttribute("aria-current", "step")) : (O.classList.remove("text-blue-600", "text-green-600"), O.classList.add("text-gray-500"), ce.classList.remove("bg-blue-600", "text-white", "bg-green-600"), ce.classList.add("bg-gray-300", "text-gray-600"), O.removeAttribute("aria-current")));
    }), w.forEach((O, ne) => {
      ne < L - 1 ? (O.classList.remove("bg-gray-300"), O.classList.add("bg-green-600")) : (O.classList.remove("bg-green-600"), O.classList.add("bg-gray-300"));
    }), C.forEach((O) => {
      qn(O.dataset.step) === L ? O.classList.remove("hidden") : O.classList.add("hidden");
    }), E?.classList.toggle("hidden", L === 1), T?.classList.toggle("hidden", L === e), P?.classList.toggle("hidden", L !== e), s.classList.toggle("hidden", L !== e), r({
      isOwner: o.isOwner,
      reason: o.lastBlockedReason,
      claim: o.currentClaim
    }), L < e) {
      const O = n[L] || "Next";
      T && (T.innerHTML = `
        ${O}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    L === t.PLACEMENT ? g?.() : L === t.REVIEW && y?.(), c.updateVisibility(L);
  }
  function z(O) {
    if (!(O < t.DOCUMENT || O > e)) {
      if (O > L) {
        for (let ne = L; ne < O; ne++)
          if (!h(ne)) return;
      }
      L = O, J(), S?.(O), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function oe() {
    f.forEach((O) => {
      O.addEventListener("click", () => {
        const ne = qn(O.dataset.step);
        z(ne);
      });
    }), E?.addEventListener("click", () => z(L - 1)), T?.addEventListener("click", () => z(L + 1)), P?.addEventListener("click", () => {
      const O = document.getElementById("agreement-form");
      if (!(O instanceof HTMLFormElement)) return;
      const ne = document.createElement("input");
      ne.type = "hidden", ne.name = "save_as_draft", ne.value = "1", O.appendChild(ne), O.submit();
    });
  }
  return {
    bindEvents: oe,
    getCurrentStep() {
      return L;
    },
    setCurrentStep(O) {
      L = O;
    },
    goToStep: z,
    updateWizardUI: J
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
    documentPageCountInput: y,
    fieldPlacementsJSONInput: S,
    fieldRulesJSONInput: D,
    currentUserID: L,
    draftsEndpoint: f,
    draftEndpointWithUserID: C,
    draftRequestHeaders: w,
    syncService: E,
    syncOrchestrator: T,
    stateManager: P,
    submitMode: J,
    totalWizardSteps: z,
    wizardStep: oe,
    getCurrentStep: O,
    getPlacementState: ne,
    getCurrentDocumentPageCount: fe,
    ensureSelectedDocumentCompatibility: ce,
    collectFieldRulesForState: de,
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
    P.updateState(P.collectFormState());
    const ve = await T.forceSync();
    if (ve?.blocked && ve.reason === "passive_tab")
      throw {
        code: ke,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const Ae = P.getState();
    if (Ae?.syncPending)
      throw new Error("Unable to sync latest draft changes");
    return Ae;
  }
  async function G() {
    const ve = await se(), Ae = String(ve?.serverDraftId || "").trim();
    if (!Ae) {
      const Me = await E.create(ve);
      return P.markSynced(Me.id, Me.revision), {
        draftID: String(Me.id || "").trim(),
        revision: Number(Me.revision || 0)
      };
    }
    try {
      const Me = await E.load(Ae), Ke = String(Me?.id || Ae).trim(), Fe = Number(Me?.revision || ve?.serverRevision || 0);
      return Ke && Fe > 0 && P.markSynced(Ke, Fe), {
        draftID: Ke,
        revision: Fe > 0 ? Fe : Number(ve?.serverRevision || 0)
      };
    } catch (Me) {
      if (Number(Me?.status || 0) !== 404)
        throw Me;
      const Ke = await E.create({
        ...P.getState(),
        ...P.collectFormState()
      }), Fe = String(Ke?.id || "").trim(), Qe = Number(Ke?.revision || 0);
      return P.markSynced(Fe, Qe), _e("wizard_send_stale_draft_recovered", {
        stale_draft_id: Ae,
        recovered_draft_id: Fe
      }), { draftID: Fe, revision: Qe };
    }
  }
  async function we() {
    const ve = P.getState();
    P.setState({
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
      if (!ce()) {
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
        ve.preventDefault(), $e(it(Fe)), De(oe.FIELDS), st.focus();
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
      if (de().some((F) => !F.participantId)) {
        ve.preventDefault(), $e("Please assign all automation rules to a signer"), Array.from(g?.querySelectorAll(".field-rule-participant-select") || []).find((H) => !H.value)?.focus();
        return;
      }
      const R = !!t.querySelector('input[name="save_as_draft"]'), j = O() === z && !R;
      if (j) {
        let F = t.querySelector('input[name="send_for_signature"]');
        F || (F = document.createElement("input"), F.type = "hidden", F.name = "send_for_signature", t.appendChild(F)), F.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (J === "json") {
        ve.preventDefault(), n.disabled = !0, n.innerHTML = `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${j ? "Sending..." : "Saving..."}
        `, (async () => {
          try {
            We();
            const F = String(e.routes?.index || "").trim();
            if (!j) {
              if (await se(), F) {
                window.location.href = F;
                return;
              }
              window.location.reload();
              return;
            }
            const H = await G(), ae = String(H?.draftID || "").trim(), le = Number(H?.revision || 0);
            if (!ae || le <= 0)
              throw new Error("Draft session not available. Please try again.");
            if (!T.ensureActiveTabOwnership("send", { allowClaimIfAvailable: !0 }))
              throw {
                code: ke,
                message: "This agreement is active in another tab. Take control in this tab before sending."
              };
            const ye = await fetch(
              C(`${f}/${encodeURIComponent(ae)}/send`),
              {
                method: "POST",
                credentials: "same-origin",
                headers: w(),
                body: JSON.stringify({
                  expected_revision: le,
                  created_by_user_id: L
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
            if (P.clear(), T.broadcastStateUpdate(), Q && F) {
              window.location.href = `${F}/${encodeURIComponent(Q)}`;
              return;
            }
            if (F) {
              window.location.href = F;
              return;
            }
            window.location.reload();
          } catch (F) {
            const H = String(F?.message || "Failed to process agreement").trim(), ae = String(F?.code || "").trim(), le = Number(F?.status || 0);
            $e(H, ae, le), n.disabled = !1, n.innerHTML = `
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
        ${j ? "Sending..." : "Saving..."}
      `;
    });
  }
  return {
    bindEvents: Ye,
    ensureDraftReadyForSend: G,
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
      Zt(c.excludePages).forEach((y) => {
        y <= t && g.add(y);
      }), c.excludeLastPage && g.add(t);
      for (let y = h.start; y <= h.end; y += 1)
        g.has(y) || n.push({
          id: `${r}-initials-${y}`,
          type: "initials",
          page: y,
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
  s.forEach((y) => {
    const S = Xe(y, 0);
    S > 0 && h.add(Wt(S, 1, o));
  }), n && h.add(o);
  const g = [];
  for (let y = c; y <= r; y += 1)
    h.has(y) || g.push(y);
  return {
    pages: g,
    rangeStart: c,
    rangeEnd: r,
    excludedPages: Array.from(h).sort((y, S) => y - S),
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
    parseAPIError: y,
    announceError: S,
    showToast: D,
    mapUserFacingError: L,
    renderFieldRulePreview: f
  } = i, C = je("document_id"), w = je("selected-document"), E = je("document-picker"), T = je("document-search"), P = je("document-list"), J = je("change-document-btn"), z = je("selected-document-title"), oe = je("selected-document-info"), O = je("document_page_count"), ne = je("document-remediation-panel"), fe = je("document-remediation-message"), ce = je("document-remediation-status"), de = je("document-remediation-trigger-btn"), Oe = je("document-remediation-dismiss-btn"), Ze = je("title"), nt = 300, it = 5, rt = 10, We = je("document-typeahead"), $e = je("document-typeahead-dropdown"), _e = je("document-recent-section"), ue = je("document-recent-list"), De = je("document-search-section"), Je = je("document-search-list"), ke = je("document-empty-state"), st = je("document-dropdown-loading"), se = je("document-search-loading"), G = {
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
  function Fe(k) {
    return String(k || "").trim().toLowerCase();
  }
  function Qe(k) {
    return String(k || "").trim().toLowerCase();
  }
  function at(k) {
    return Fe(k) === "unsupported";
  }
  function M() {
    !o && Ze && Ze.value.trim() !== "" && !h.hasResumableState() && h.setTitleSource(c.SERVER_SEED, { syncPending: !1 });
  }
  function R(k) {
    const $ = Xe(k, 0);
    O && (O.value = String($));
  }
  function j() {
    const k = Xe(O?.value || "0", 0);
    if (k > 0) return k;
    const $ = String(oe?.textContent || "").match(/(\d+)\s+pages?/i);
    if ($) {
      const B = Xe($[1], 0);
      if (B > 0) return B;
    }
    return 1;
  }
  function F() {
    C && (C.value = ""), z && (z.textContent = ""), oe && (oe.textContent = ""), R(0), h.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), g.setDocument(null, null, null);
  }
  function H(k = "") {
    const $ = "This document cannot be used because its PDF is incompatible with online signing.", B = Qe(k);
    return B ? `${$} Reason: ${B}. Select another document or upload a remediated PDF.` : `${$} Select another document or upload a remediated PDF.`;
  }
  function ae() {
    Ye = null, ce && (ce.textContent = "", ce.className = "mt-2 text-xs text-amber-800"), ne && ne.classList.add("hidden"), de && (de.disabled = !1, de.textContent = "Remediate PDF");
  }
  function le(k, $ = "info") {
    if (!ce) return;
    const B = String(k || "").trim();
    ce.textContent = B;
    const Y = $ === "error" ? "text-red-700" : $ === "success" ? "text-green-700" : "text-amber-800";
    ce.className = `mt-2 text-xs ${Y}`;
  }
  function ye(k, $ = "") {
    !k || !ne || !fe || (Ye = {
      id: String(k.id || "").trim(),
      title: String(k.title || "").trim(),
      pageCount: Xe(k.pageCount, 0),
      compatibilityReason: Qe($ || k.compatibilityReason || "")
    }, Ye.id && (fe.textContent = H(Ye.compatibilityReason), le("Run remediation to make this document signable."), ne.classList.remove("hidden")));
  }
  function ge(k) {
    const $ = Ze;
    if (!$) return;
    const B = h.getState(), Y = $.value.trim(), ee = r(
      B?.titleSource,
      Y === "" ? c.AUTOFILL : c.USER
    );
    if (Y && ee === c.USER)
      return;
    const K = String(k || "").trim();
    K && ($.value = K, h.updateDetails({
      title: K,
      message: h.getState().details.message || ""
    }, { titleSource: c.AUTOFILL }));
  }
  function Q(k, $, B) {
    if (!C || !z || !oe || !w || !E)
      return;
    C.value = String(k || ""), z.textContent = $ || "", oe.textContent = `${B} pages`, R(B), w.classList.remove("hidden"), E.classList.add("hidden"), f(), ge($);
    const Y = Xe(B, 0);
    h.updateDocument({
      id: k,
      title: $,
      pageCount: Y
    }), g.setDocument(k, $, Y), ae();
  }
  function Z(k) {
    const $ = String(k || "").trim();
    if ($ === "") return null;
    const B = we.find((K) => String(K.id || "").trim() === $);
    if (B) return B;
    const Y = G.recentDocuments.find((K) => String(K.id || "").trim() === $);
    if (Y) return Y;
    const ee = G.searchResults.find((K) => String(K.id || "").trim() === $);
    return ee || null;
  }
  function be() {
    const k = Z(C?.value || "");
    if (!k) return !0;
    const $ = Fe(k.compatibilityTier);
    return at($) ? (ye(k, k.compatibilityReason || ""), F(), S(H(k.compatibilityReason || "")), w && w.classList.add("hidden"), E && E.classList.remove("hidden"), T?.focus(), !1) : (ae(), !0);
  }
  function xe() {
    if (!z || !oe || !w || !E)
      return;
    const k = (C?.value || "").trim();
    if (!k) return;
    const $ = we.find((B) => String(B.id || "").trim() === k);
    $ && (z.textContent.trim() || (z.textContent = $.title || "Untitled"), (!oe.textContent.trim() || oe.textContent.trim() === "pages") && (oe.textContent = `${$.pageCount || 0} pages`), R($.pageCount || 0), w.classList.remove("hidden"), E.classList.add("hidden"));
  }
  async function Pe() {
    try {
      const k = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), $ = await fetch(`${e}/panels/esign_documents?${k.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!$.ok)
        throw await y($, "Failed to load documents");
      const B = await $.json();
      we = (Array.isArray(B?.records) ? B.records : Array.isArray(B?.items) ? B.items : []).slice().sort((K, Ve) => {
        const Ge = Date.parse(String(K?.created_at ?? K?.createdAt ?? K?.updated_at ?? K?.updatedAt ?? "")), X = Date.parse(String(Ve?.created_at ?? Ve?.createdAt ?? Ve?.updated_at ?? Ve?.updatedAt ?? "")), pe = Number.isFinite(Ge) ? Ge : 0;
        return (Number.isFinite(X) ? X : 0) - pe;
      }).map((K) => pn(K)).filter((K) => K.id !== ""), Re(we), xe();
    } catch (k) {
      const $ = Tt(k) ? String(k.message || "Failed to load documents") : "Failed to load documents", B = Tt(k) ? String(k.code || "") : "", Y = Tt(k) ? Number(k.status || 0) : 0, ee = L($, B, Y);
      P && (P.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${xt(ee)}</div>`);
    }
  }
  function Re(k) {
    if (!P) return;
    if (k.length === 0) {
      P.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${xt(s)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    P.innerHTML = k.map((B, Y) => {
      const ee = xt(String(B.id || "").trim()), K = xt(String(B.title || "").trim()), Ve = String(Xe(B.pageCount, 0)), Ge = Fe(B.compatibilityTier), X = Qe(B.compatibilityReason), pe = xt(Ge), Ee = xt(X), ut = at(Ge) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${Y === 0 ? "0" : "-1"}"
                data-document-id="${ee}"
                data-document-title="${K}"
                data-document-pages="${Ve}"
                data-document-compatibility-tier="${pe}"
                data-document-compatibility-reason="${Ee}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${K}</div>
            <div class="text-xs text-gray-500">${Ve} pages ${ut}</div>
          </div>
        </button>
      `;
    }).join("");
    const $ = Array.from(P.querySelectorAll(".document-option"));
    $.forEach((B, Y) => {
      B.addEventListener("click", () => v(B)), B.addEventListener("keydown", (ee) => {
        let K = Y;
        if (ee.key === "ArrowDown")
          ee.preventDefault(), K = Math.min(Y + 1, $.length - 1);
        else if (ee.key === "ArrowUp")
          ee.preventDefault(), K = Math.max(Y - 1, 0);
        else if (ee.key === "Enter" || ee.key === " ") {
          ee.preventDefault(), v(B);
          return;
        } else ee.key === "Home" ? (ee.preventDefault(), K = 0) : ee.key === "End" && (ee.preventDefault(), K = $.length - 1);
        K !== Y && ($[K].focus(), $[K].setAttribute("tabindex", "0"), B.setAttribute("tabindex", "-1"));
      });
    });
  }
  function v(k) {
    const $ = k.getAttribute("data-document-id"), B = k.getAttribute("data-document-title"), Y = k.getAttribute("data-document-pages"), ee = Fe(k.getAttribute("data-document-compatibility-tier")), K = Qe(k.getAttribute("data-document-compatibility-reason"));
    if (at(ee)) {
      ye({ id: String($ || ""), title: String(B || ""), pageCount: Xe(Y, 0), compatibilityReason: K }), F(), S(H(K)), T?.focus();
      return;
    }
    Q($, B, Y);
  }
  async function b(k, $, B) {
    const Y = String(k || "").trim();
    if (!Y) return;
    const ee = Date.now(), K = 12e4, Ve = 1250;
    for (; Date.now() - ee < K; ) {
      const Ge = await fetch(Y, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!Ge.ok)
        throw await y(Ge, "Failed to read remediation status");
      const pe = (await Ge.json())?.dispatch || {}, Ee = String(pe?.status || "").trim().toLowerCase();
      if (Ee === "succeeded") {
        le("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (Ee === "failed" || Ee === "canceled" || Ee === "dead_letter") {
        const ut = String(pe?.terminal_reason || "").trim();
        throw { message: ut ? `Remediation failed: ${ut}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      le(Ee === "retrying" ? "Remediation is retrying in the queue..." : Ee === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((ut) => setTimeout(ut, Ve));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${$} (${B})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function x() {
    const k = Ye;
    if (!k || !k.id) return;
    const $ = String(k.id || "").trim();
    if (!(!$ || Me.has($))) {
      Me.add($), de && (de.disabled = !0, de.textContent = "Remediating...");
      try {
        let B = Ke.get($) || "";
        B || (B = `esign-remediate-${$}-${Date.now()}`, Ke.set($, B));
        const Y = `${t}/esign/documents/${encodeURIComponent($)}/remediate`, ee = await fetch(Y, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": B
          }
        });
        if (!ee.ok)
          throw await y(ee, "Failed to trigger remediation");
        const K = await ee.json(), Ve = K?.receipt || {}, Ge = String(Ve?.dispatch_id || K?.dispatch_id || "").trim(), X = String(Ve?.mode || K?.mode || "").trim().toLowerCase();
        let pe = String(K?.dispatch_status_url || "").trim();
        !pe && Ge && (pe = `${t}/esign/dispatches/${encodeURIComponent(Ge)}`), X === "queued" && Ge && pe && (le("Remediation queued. Monitoring progress..."), await b(pe, Ge, $)), await Pe();
        const Ee = Z($);
        if (!Ee || at(Ee.compatibilityTier)) {
          le("Remediation finished, but this PDF is still incompatible.", "error"), S("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        Q(Ee.id, Ee.title, Ee.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : D("Document remediated successfully. You can continue.", "success");
      } catch (B) {
        const Y = Tt(B) ? String(B.message || "Remediation failed").trim() : "Remediation failed", ee = Tt(B) ? String(B.code || "") : "", K = Tt(B) ? Number(B.status || 0) : 0;
        le(Y, "error"), S(Y, ee, K);
      } finally {
        Me.delete($), de && (de.disabled = !1, de.textContent = "Remediate PDF");
      }
    }
  }
  function U(k, $) {
    let B = null;
    return (...Y) => {
      B !== null && clearTimeout(B), B = setTimeout(() => {
        k(...Y), B = null;
      }, $);
    };
  }
  async function N() {
    try {
      const k = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(it)
      });
      n && k.set("created_by_user_id", n);
      const $ = await fetch(`${e}/panels/esign_documents?${k}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!$.ok) {
        console.warn("Failed to load recent documents:", $.status);
        return;
      }
      const B = await $.json(), Y = Array.isArray(B?.records) ? B.records : Array.isArray(B?.items) ? B.items : [];
      G.recentDocuments = Y.map((ee) => pn(ee)).filter((ee) => ee.id !== "").slice(0, it);
    } catch (k) {
      console.warn("Error loading recent documents:", k);
    }
  }
  async function q(k) {
    const $ = k.trim();
    if (!$) {
      Ae && (Ae.abort(), Ae = null), G.isSearchMode = !1, G.searchResults = [], Se();
      return;
    }
    const B = ++ve;
    Ae && Ae.abort(), Ae = new AbortController(), G.isLoading = !0, G.isSearchMode = !0, Se();
    try {
      const Y = new URLSearchParams({
        q: $,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(rt)
      }), ee = await fetch(`${e}/panels/esign_documents?${Y}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Ae.signal
      });
      if (B !== ve) return;
      if (!ee.ok) {
        console.warn("Failed to search documents:", ee.status), G.searchResults = [], G.isLoading = !1, Se();
        return;
      }
      const K = await ee.json(), Ve = Array.isArray(K?.records) ? K.records : Array.isArray(K?.items) ? K.items : [];
      G.searchResults = Ve.map((Ge) => pn(Ge)).filter((Ge) => Ge.id !== "").slice(0, rt);
    } catch (Y) {
      if (Tt(Y) && Y.name === "AbortError")
        return;
      console.warn("Error searching documents:", Y), G.searchResults = [];
    } finally {
      B === ve && (G.isLoading = !1, Se());
    }
  }
  const ie = U(q, nt);
  function re() {
    $e && (G.isOpen = !0, G.selectedIndex = -1, $e.classList.remove("hidden"), T?.setAttribute("aria-expanded", "true"), P?.classList.add("hidden"), Se());
  }
  function Ie() {
    $e && (G.isOpen = !1, G.selectedIndex = -1, $e.classList.add("hidden"), T?.setAttribute("aria-expanded", "false"), P?.classList.remove("hidden"));
  }
  function Ue(k, $, B) {
    k && (k.innerHTML = $.map((Y, ee) => {
      const K = ee, Ve = G.selectedIndex === K, Ge = xt(String(Y.id || "").trim()), X = xt(String(Y.title || "").trim()), pe = String(Xe(Y.pageCount, 0)), Ee = Fe(Y.compatibilityTier), dt = Qe(Y.compatibilityReason), ut = xt(Ee), Ot = xt(dt), sn = at(Ee) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${Ve ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${Ve}"
          tabindex="-1"
          data-document-id="${Ge}"
          data-document-title="${X}"
          data-document-pages="${pe}"
          data-document-compatibility-tier="${ut}"
          data-document-compatibility-reason="${Ot}"
          data-typeahead-index="${K}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${X}</div>
            <div class="text-xs text-gray-500">${pe} pages ${sn}</div>
          </div>
        </button>
      `;
    }).join(""), k.querySelectorAll(".typeahead-option").forEach((Y) => {
      Y.addEventListener("click", () => He(Y));
    }));
  }
  function Se() {
    if ($e) {
      if (G.isLoading) {
        st?.classList.remove("hidden"), _e?.classList.add("hidden"), De?.classList.add("hidden"), ke?.classList.add("hidden"), se?.classList.remove("hidden");
        return;
      }
      st?.classList.add("hidden"), se?.classList.add("hidden"), G.isSearchMode ? (_e?.classList.add("hidden"), G.searchResults.length > 0 ? (De?.classList.remove("hidden"), ke?.classList.add("hidden"), Ue(Je, G.searchResults)) : (De?.classList.add("hidden"), ke?.classList.remove("hidden"))) : (De?.classList.add("hidden"), G.recentDocuments.length > 0 ? (_e?.classList.remove("hidden"), ke?.classList.add("hidden"), Ue(ue, G.recentDocuments)) : (_e?.classList.add("hidden"), ke?.classList.remove("hidden"), ke && (ke.textContent = "No recent documents")));
    }
  }
  function He(k) {
    const $ = k.getAttribute("data-document-id"), B = k.getAttribute("data-document-title"), Y = k.getAttribute("data-document-pages"), ee = Fe(k.getAttribute("data-document-compatibility-tier")), K = Qe(k.getAttribute("data-document-compatibility-reason"));
    if ($) {
      if (at(ee)) {
        ye({ id: String($ || ""), title: String(B || ""), pageCount: Xe(Y, 0), compatibilityReason: K }), F(), S(H(K)), T?.focus();
        return;
      }
      Q($, B, Y), Ie(), T && (T.value = ""), G.query = "", G.isSearchMode = !1, G.searchResults = [];
    }
  }
  function et() {
    if (!$e) return;
    const k = $e.querySelector(`[data-typeahead-index="${G.selectedIndex}"]`);
    k && k.scrollIntoView({ block: "nearest" });
  }
  function Ne(k) {
    if (!G.isOpen) {
      (k.key === "ArrowDown" || k.key === "Enter") && (k.preventDefault(), re());
      return;
    }
    const $ = G.isSearchMode ? G.searchResults : G.recentDocuments, B = $.length - 1;
    switch (k.key) {
      case "ArrowDown":
        k.preventDefault(), G.selectedIndex = Math.min(G.selectedIndex + 1, B), Se(), et();
        break;
      case "ArrowUp":
        k.preventDefault(), G.selectedIndex = Math.max(G.selectedIndex - 1, 0), Se(), et();
        break;
      case "Enter":
        if (k.preventDefault(), G.selectedIndex >= 0 && G.selectedIndex <= B) {
          const Y = $[G.selectedIndex];
          if (Y) {
            const ee = document.createElement("button");
            ee.setAttribute("data-document-id", Y.id), ee.setAttribute("data-document-title", Y.title), ee.setAttribute("data-document-pages", String(Y.pageCount)), ee.setAttribute("data-document-compatibility-tier", String(Y.compatibilityTier || "")), ee.setAttribute("data-document-compatibility-reason", String(Y.compatibilityReason || "")), He(ee);
          }
        }
        break;
      case "Escape":
        k.preventDefault(), Ie();
        break;
      case "Tab":
        Ie();
        break;
      case "Home":
        k.preventDefault(), G.selectedIndex = 0, Se(), et();
        break;
      case "End":
        k.preventDefault(), G.selectedIndex = B, Se(), et();
        break;
    }
  }
  function mt() {
    J && J.addEventListener("click", () => {
      w?.classList.add("hidden"), E?.classList.remove("hidden"), ae(), T?.focus(), re();
    }), de && de.addEventListener("click", () => {
      x();
    }), Oe && Oe.addEventListener("click", () => {
      ae(), T?.focus();
    }), T && (T.addEventListener("input", (k) => {
      const $ = k.target;
      if (!($ instanceof HTMLInputElement)) return;
      const B = $.value;
      G.query = B, G.isOpen || re(), B.trim() ? (G.isLoading = !0, Se(), ie(B)) : (G.isSearchMode = !1, G.searchResults = [], Se());
      const Y = we.filter(
        (ee) => String(ee.title || "").toLowerCase().includes(B.toLowerCase())
      );
      Re(Y);
    }), T.addEventListener("focus", () => {
      re();
    }), T.addEventListener("keydown", Ne)), document.addEventListener("click", (k) => {
      const $ = k.target;
      We && !($ instanceof Node && We.contains($)) && Ie();
    });
  }
  return {
    refs: {
      documentIdInput: C,
      selectedDocument: w,
      documentPicker: E,
      documentSearch: T,
      documentList: P,
      selectedDocumentTitle: z,
      selectedDocumentInfo: oe,
      documentPageCountInput: O
    },
    bindEvents: mt,
    initializeTitleSourceSeed: M,
    loadDocuments: Pe,
    loadRecentDocuments: N,
    ensureSelectedDocumentCompatibility: be,
    getCurrentDocumentPageCount: j
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
  function g(C = {}) {
    if (!(s instanceof HTMLTemplateElement) || !n)
      return;
    const w = s.content.cloneNode(!0), E = w.querySelector(".participant-entry");
    if (!(E instanceof HTMLElement)) return;
    const T = C.id || h();
    E.setAttribute("data-participant-id", T);
    const P = bt(E, ".participant-id-input"), J = bt(E, 'input[name="participants[].name"]'), z = bt(E, 'input[name="participants[].email"]'), oe = gn(E, 'select[name="participants[].role"]'), O = bt(E, 'input[name="participants[].signing_stage"]'), ne = bt(E, 'input[name="participants[].notify"]'), fe = E.querySelector(".signing-stage-wrapper");
    if (!P || !J || !z || !oe) return;
    const ce = r++;
    P.name = `participants[${ce}].id`, P.value = T, J.name = `participants[${ce}].name`, z.name = `participants[${ce}].email`, oe.name = `participants[${ce}].role`, O && (O.name = `participants[${ce}].signing_stage`), ne && (ne.name = `participants[${ce}].notify`), C.name && (J.value = C.name), C.email && (z.value = C.email), C.role && (oe.value = C.role), O && C.signing_stage && (O.value = String(C.signing_stage)), ne && (ne.checked = C.notify !== !1);
    const de = () => {
      if (!(fe instanceof HTMLElement) || !O) return;
      const Oe = oe.value === "signer";
      fe.classList.toggle("hidden", !Oe), Oe ? O.value || (O.value = "1") : O.value = "";
    };
    de(), E.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      E.remove(), t?.();
    }), oe.addEventListener("change", () => {
      de(), t?.();
    }), n.appendChild(w);
  }
  function y() {
    n && (e.length > 0 ? e.forEach((C) => {
      g({
        id: String(C.id || "").trim(),
        name: String(C.name || "").trim(),
        email: String(C.email || "").trim(),
        role: String(C.role || "signer").trim() || "signer",
        notify: C.notify !== !1,
        signing_stage: Number(C.signing_stage || C.signingStage || 1) || 1
      });
    }) : g());
  }
  function S() {
    if (!n) return;
    o?.addEventListener("click", () => g()), new MutationObserver(() => {
      t?.();
    }).observe(n, { childList: !0, subtree: !0 }), n.addEventListener("change", (w) => {
      const E = w.target;
      E instanceof Element && (E.matches('select[name*=".role"]') || E.matches('input[name*=".name"]') || E.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (w) => {
      const E = w.target;
      E instanceof Element && (E.matches('input[name*=".name"]') || E.matches('input[name*=".email"]')) && t?.();
    });
  }
  function D() {
    if (!n) return [];
    const C = n.querySelectorAll(".participant-entry"), w = [];
    return C.forEach((E) => {
      const T = E.getAttribute("data-participant-id"), P = gn(E, 'select[name*=".role"]'), J = bt(E, 'input[name*=".name"]'), z = bt(E, 'input[name*=".email"]');
      P?.value === "signer" && w.push({
        id: String(T || ""),
        name: J?.value || z?.value || "Signer",
        email: z?.value || ""
      });
    }), w;
  }
  function L() {
    if (!n) return [];
    const C = [];
    return n.querySelectorAll(".participant-entry").forEach((w) => {
      const E = w.getAttribute("data-participant-id"), T = bt(w, 'input[name*=".name"]')?.value || "", P = bt(w, 'input[name*=".email"]')?.value || "", J = gn(w, 'select[name*=".role"]')?.value || "signer", z = Number.parseInt(bt(w, ".signing-stage-input")?.value || "1", 10), oe = bt(w, ".notify-input")?.checked !== !1;
      C.push({
        tempId: String(E || ""),
        name: T,
        email: P,
        role: J,
        notify: oe,
        signingStage: Number.isFinite(z) ? z : 1
      });
    }), C;
  }
  function f(C) {
    !n || !C?.participants || C.participants.length === 0 || (n.innerHTML = "", r = 0, C.participants.forEach((w) => {
      g({
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
    addParticipant: g,
    getSignerParticipants: D,
    collectParticipantsForState: L,
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
    setPlacementLinkGroupState: y
  } = i, S = wt("field-definitions-container"), D = document.getElementById("field-definition-template"), L = wt("add-field-btn"), f = wt("add-field-btn-container"), C = wt("add-field-definition-empty-btn"), w = wt("field-definitions-empty-state"), E = wt("field-rules-container"), T = document.getElementById("field-rule-template"), P = wt("add-field-rule-btn"), J = wt("field-rules-empty-state"), z = wt("field-rules-preview"), oe = wt("field_rules_json"), O = wt("field_placements_json");
  let ne = 0, fe = 0, ce = 0;
  function de() {
    return `temp_field_${Date.now()}_${ne++}`;
  }
  function Oe() {
    return `rule_${Date.now()}_${ce}`;
  }
  function Ze(M, R) {
    const j = String(M || "").trim();
    return j && R.some((F) => F.id === j) ? j : R.length === 1 ? R[0].id : "";
  }
  function nt(M, R, j = "") {
    if (!M) return;
    const F = Ze(j, R);
    M.innerHTML = '<option value="">Select signer...</option>', R.forEach((H) => {
      const ae = document.createElement("option");
      ae.value = H.id, ae.textContent = H.name, M.appendChild(ae);
    }), M.value = F;
  }
  function it(M = s()) {
    if (!S) return;
    const R = S.querySelectorAll(".field-participant-select"), j = E ? E.querySelectorAll(".field-rule-participant-select") : [];
    R.forEach((F) => {
      nt(
        F instanceof HTMLSelectElement ? F : null,
        M,
        F instanceof HTMLSelectElement ? F.value : ""
      );
    }), j.forEach((F) => {
      nt(
        F instanceof HTMLSelectElement ? F : null,
        M,
        F instanceof HTMLSelectElement ? F.value : ""
      );
    });
  }
  function rt() {
    if (!S || !w) return;
    S.querySelectorAll(".field-definition-entry").length === 0 ? (w.classList.remove("hidden"), f?.classList.add("hidden")) : (w.classList.add("hidden"), f?.classList.remove("hidden"));
  }
  function We() {
    if (!E || !J) return;
    const M = E.querySelectorAll(".field-rule-entry");
    J.classList.toggle("hidden", M.length > 0);
  }
  function $e() {
    if (!S) return [];
    const M = [];
    return S.querySelectorAll(".field-definition-entry").forEach((R) => {
      const j = R.getAttribute("data-field-definition-id"), F = pt(R, ".field-type-select")?.value || "signature", H = pt(R, ".field-participant-select")?.value || "", ae = Number.parseInt(qe(R, 'input[name*=".page"]')?.value || "1", 10), le = qe(R, 'input[name*=".required"]')?.checked ?? !0;
      M.push({
        tempId: String(j || ""),
        type: F,
        participantTempId: H,
        page: Number.isFinite(ae) ? ae : 1,
        required: le
      });
    }), M;
  }
  function _e() {
    if (!E) return [];
    const M = n(), R = E.querySelectorAll(".field-rule-entry"), j = [];
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
      H.type && j.push(H);
    }), j;
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
    if (!z) return;
    const M = _e(), R = n(), j = De(M, R), F = s(), H = new Map(F.map((ge) => [String(ge.id), ge.name]));
    if (oe && (oe.value = JSON.stringify(ue())), !j.length) {
      z.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const ae = j.reduce((ge, Q) => {
      const Z = Q.type;
      return ge[Z] = (ge[Z] || 0) + 1, ge;
    }, {}), le = j.slice(0, 8).map((ge) => {
      const Q = H.get(String(ge.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${ge.type === "initials" ? "Initials" : "Signature"} on page ${ge.page}</span><span class="text-gray-500">${o(String(Q))}</span></li>`;
    }).join(""), ye = j.length - 8;
    z.innerHTML = `
      <p class="text-gray-700">${j.length} generated field${j.length !== 1 ? "s" : ""} (${ae.initials || 0} initials, ${ae.signature || 0} signatures)</p>
      <ul class="space-y-1">${le}</ul>
      ${ye > 0 ? `<p class="text-gray-500">+${ye} more</p>` : ""}
    `;
  }
  function ke() {
    const M = s();
    it(M), Je();
  }
  function st(M) {
    const R = pt(M, ".field-rule-type-select"), j = At(M, ".field-rule-range-start-wrap"), F = At(M, ".field-rule-range-end-wrap"), H = At(M, ".field-rule-page-wrap"), ae = At(M, ".field-rule-exclude-last-wrap"), le = At(M, ".field-rule-exclude-pages-wrap"), ye = At(M, ".field-rule-summary"), ge = qe(M, ".field-rule-from-page-input"), Q = qe(M, ".field-rule-to-page-input"), Z = qe(M, ".field-rule-page-input"), be = qe(M, ".field-rule-exclude-last-input"), xe = qe(M, ".field-rule-exclude-pages-input");
    if (!R || !j || !F || !H || !ae || !le || !ye)
      return;
    const Pe = n(), Re = Jt({
      type: R?.value || "",
      fromPage: ge?.value || "",
      toPage: Q?.value || "",
      page: Z?.value || "",
      excludeLastPage: !!be?.checked,
      excludePages: Zt(xe?.value || ""),
      required: !0
    }, Pe), v = Re.fromPage > 0 ? Re.fromPage : 1, b = Re.toPage > 0 ? Re.toPage : Pe, x = Re.page > 0 ? Re.page : Re.toPage > 0 ? Re.toPage : Pe, U = Re.excludeLastPage, N = Re.excludePages.join(","), q = R?.value === "initials_each_page";
    if (j.classList.toggle("hidden", !q), F.classList.toggle("hidden", !q), ae.classList.toggle("hidden", !q), le.classList.toggle("hidden", !q), H.classList.toggle("hidden", q), ge && (ge.value = String(v)), Q && (Q.value = String(b)), Z && (Z.value = String(x)), xe && (xe.value = N), be && (be.checked = U), q) {
      const ie = Ds(
        v,
        b,
        Pe,
        U,
        Re.excludePages
      ), re = Ms(ie);
      ye.textContent = ie.isEmpty ? `Warning: No initials fields will be generated ${re}.` : `Generates initials fields on ${re}.`;
    } else
      ye.textContent = `Generates one signature field on page ${x}.`;
  }
  function se(M = {}) {
    if (!(T instanceof HTMLTemplateElement) || !E) return;
    const R = T.content.cloneNode(!0), j = R.querySelector(".field-rule-entry");
    if (!(j instanceof HTMLElement)) return;
    const F = M.id || Oe(), H = ce++, ae = n();
    j.setAttribute("data-field-rule-id", F);
    const le = qe(j, ".field-rule-id-input"), ye = pt(j, ".field-rule-type-select"), ge = pt(j, ".field-rule-participant-select"), Q = qe(j, ".field-rule-from-page-input"), Z = qe(j, ".field-rule-to-page-input"), be = qe(j, ".field-rule-page-input"), xe = pt(j, ".field-rule-required-select"), Pe = qe(j, ".field-rule-exclude-last-input"), Re = qe(j, ".field-rule-exclude-pages-input"), v = Yn(j, ".remove-field-rule-btn");
    if (!le || !ye || !ge || !Q || !Z || !be || !xe || !Pe || !Re || !v)
      return;
    le.name = `field_rules[${H}].id`, le.value = F, ye.name = `field_rules[${H}].type`, ge.name = `field_rules[${H}].participant_id`, Q.name = `field_rules[${H}].from_page`, Z.name = `field_rules[${H}].to_page`, be.name = `field_rules[${H}].page`, xe.name = `field_rules[${H}].required`, Pe.name = `field_rules[${H}].exclude_last_page`, Re.name = `field_rules[${H}].exclude_pages`;
    const b = Jt(M, ae);
    ye.value = b.type || "initials_each_page", nt(ge, s(), b.participantId), Q.value = String(b.fromPage > 0 ? b.fromPage : 1), Z.value = String(b.toPage > 0 ? b.toPage : ae), be.value = String(b.page > 0 ? b.page : ae), xe.value = b.required ? "1" : "0", Pe.checked = b.excludeLastPage, Re.value = b.excludePages.join(",");
    const x = () => {
      st(j), Je(), r?.();
    }, U = () => {
      const q = n();
      if (Q) {
        const ie = parseInt(Q.value, 10);
        Number.isFinite(ie) && (Q.value = String(Ft(ie, q, 1)));
      }
      if (Z) {
        const ie = parseInt(Z.value, 10);
        Number.isFinite(ie) && (Z.value = String(Ft(ie, q, 1)));
      }
      if (be) {
        const ie = parseInt(be.value, 10);
        Number.isFinite(ie) && (be.value = String(Ft(ie, q, 1)));
      }
    }, N = () => {
      U(), x();
    };
    ye.addEventListener("change", x), ge.addEventListener("change", x), Q.addEventListener("input", N), Q.addEventListener("change", N), Z.addEventListener("input", N), Z.addEventListener("change", N), be.addEventListener("input", N), be.addEventListener("change", N), xe.addEventListener("change", x), Pe.addEventListener("change", () => {
      const q = n();
      Z.value = String(Pe.checked ? Math.max(1, q - 1) : q), x();
    }), Re.addEventListener("input", x), v.addEventListener("click", () => {
      j.remove(), We(), Je(), r?.();
    }), E.appendChild(R), st(E.lastElementChild || j), We(), Je();
  }
  function G(M = {}) {
    if (!(D instanceof HTMLTemplateElement) || !S) return;
    const R = D.content.cloneNode(!0), j = R.querySelector(".field-definition-entry");
    if (!(j instanceof HTMLElement)) return;
    const F = String(M.id || de()).trim() || de();
    j.setAttribute("data-field-definition-id", F);
    const H = qe(j, ".field-definition-id-input"), ae = pt(j, 'select[name="field_definitions[].type"]'), le = pt(j, 'select[name="field_definitions[].participant_id"]'), ye = qe(j, 'input[name="field_definitions[].page"]'), ge = qe(j, 'input[name="field_definitions[].required"]'), Q = At(j, ".field-date-signed-info");
    if (!H || !ae || !le || !ye || !ge || !Q) return;
    const Z = fe++;
    H.name = `field_instances[${Z}].id`, H.value = F, ae.name = `field_instances[${Z}].type`, le.name = `field_instances[${Z}].participant_id`, ye.name = `field_instances[${Z}].page`, ge.name = `field_instances[${Z}].required`, M.type && (ae.value = String(M.type)), M.page !== void 0 && (ye.value = String(Ft(M.page, n(), 1))), M.required !== void 0 && (ge.checked = !!M.required);
    const be = String(M.participant_id || M.participantId || "").trim();
    nt(le, s(), be), ae.addEventListener("change", () => {
      ae.value === "date_signed" ? Q.classList.remove("hidden") : Q.classList.add("hidden");
    }), ae.value === "date_signed" && Q.classList.remove("hidden"), Yn(j, ".remove-field-definition-btn")?.addEventListener("click", () => {
      j.remove(), rt(), c?.();
    });
    const xe = qe(j, 'input[name*=".page"]'), Pe = () => {
      xe && (xe.value = String(Ft(xe.value, n(), 1)));
    };
    Pe(), xe?.addEventListener("input", Pe), xe?.addEventListener("change", Pe), S.appendChild(R), rt();
  }
  function we() {
    L?.addEventListener("click", () => G()), C?.addEventListener("click", () => G()), P?.addEventListener("click", () => se({ to_page: n() })), h?.();
  }
  function Ye() {
    const M = [];
    window._initialFieldPlacementsData = M, e.forEach((R) => {
      const j = String(R.id || "").trim();
      if (!j) return;
      const F = String(R.type || "signature").trim() || "signature", H = String(R.participant_id || R.participantId || "").trim(), ae = Number(R.page || 1) || 1, le = !!R.required;
      G({
        id: j,
        type: F,
        participant_id: H,
        page: ae,
        required: le
      }), M.push(Ht({
        id: j,
        definitionId: j,
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
    return Array.isArray(M) ? M.map((R, j) => Ht(R, j)) : [];
  }
  function Ae() {
    if (!S) return [];
    const M = s(), R = new Map(M.map((Q) => [String(Q.id), Q.name || Q.email || "Signer"])), j = [];
    S.querySelectorAll(".field-definition-entry").forEach((Q) => {
      const Z = String(Q.getAttribute("data-field-definition-id") || "").trim(), be = pt(Q, ".field-type-select"), xe = pt(Q, ".field-participant-select"), Pe = qe(Q, 'input[name*=".page"]'), Re = String(be?.value || "text").trim() || "text", v = String(xe?.value || "").trim(), b = parseInt(String(Pe?.value || "1"), 10) || 1;
      j.push({
        definitionId: Z,
        fieldType: Re,
        participantId: v,
        participantName: R.get(v) || "Unassigned",
        page: b
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
    let le = g();
    ae.forEach((Q, Z) => {
      if (Q.length > 1 && !le.groups.get(`rule_${Z}`)) {
        const xe = Us(Q, `Rule ${Z}`);
        xe.id = `rule_${Z}`, le = gi(le, xe);
      }
    }), y(le), H.forEach((Q) => {
      const Z = String(Q.id || "").trim();
      if (!Z) return;
      const be = String(Q.participantId || "").trim(), xe = parseInt(String(Q.page || "1"), 10) || 1, Pe = String(Q.ruleId || "").trim();
      j.push({
        definitionId: Z,
        fieldType: String(Q.type || "text").trim() || "text",
        participantId: be,
        participantName: R.get(be) || "Unassigned",
        page: xe,
        linkGroupId: Pe ? `rule_${Pe}` : void 0
      });
    });
    const ye = /* @__PURE__ */ new Set(), ge = j.filter((Q) => {
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
    if (!S) return [];
    const M = s(), R = /* @__PURE__ */ new Map();
    return M.forEach((H) => R.set(H.id, !1)), S.querySelectorAll(".field-definition-entry").forEach((H) => {
      const ae = pt(H, ".field-type-select"), le = pt(H, ".field-participant-select"), ye = qe(H, 'input[name*=".required"]');
      ae?.value === "signature" && le?.value && ye?.checked && R.set(le.value, !0);
    }), De(_e(), n()).forEach((H) => {
      H.type === "signature" && H.participantId && H.required && R.set(H.participantId, !0);
    }), M.filter((H) => !R.get(H.id));
  }
  function Fe(M) {
    if (!Array.isArray(M) || M.length === 0)
      return "Each signer requires at least one required signature field.";
    const R = M.map((j) => j?.name?.trim()).filter(Boolean);
    return R.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${R.join(", ")}`;
  }
  function Qe(M) {
    !S || !M?.fieldDefinitions || M.fieldDefinitions.length === 0 || (S.innerHTML = "", fe = 0, M.fieldDefinitions.forEach((R) => {
      G({
        id: R.tempId,
        type: R.type,
        participant_id: R.participantTempId,
        page: R.page,
        required: R.required
      });
    }), rt());
  }
  function at(M) {
    !Array.isArray(M?.fieldRules) || M.fieldRules.length === 0 || E && (E.querySelectorAll(".field-rule-entry").forEach((R) => R.remove()), ce = 0, M.fieldRules.forEach((R) => {
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
      fieldDefinitionsContainer: S,
      fieldRulesContainer: E,
      addFieldBtn: L,
      fieldPlacementsJSONInput: O,
      fieldRulesJSONInput: oe
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
    mapUserFacingError: y,
    showToast: S,
    escapeHtml: D,
    onPlacementsChanged: L
  } = i, f = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(o) ? o.map((v, b) => Ht(v, b)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: c || en()
  }, C = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function w(v = "fi") {
    return `${v}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function E(v) {
    return document.querySelector(`.placement-field-item[data-definition-id="${v}"]`);
  }
  function T() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function P(v, b) {
    return v.querySelector(b);
  }
  function J(v, b) {
    return v.querySelector(b);
  }
  function z() {
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
  function oe() {
    return f;
  }
  function O() {
    return f.linkGroupState;
  }
  function ne(v) {
    f.linkGroupState = v || en();
  }
  function fe() {
    return f.fieldInstances.map((v, b) => Rs(v, b));
  }
  function ce(v = {}) {
    const { silent: b = !1 } = v, x = z();
    x.fieldInstancesContainer && (x.fieldInstancesContainer.innerHTML = "");
    const U = fe();
    return s && (s.value = JSON.stringify(U)), b || L?.(), U;
  }
  function de() {
    const v = z(), b = Array.from(document.querySelectorAll(".placement-field-item")), x = b.length, U = new Set(
      b.map((re) => String(re.dataset.definitionId || "").trim()).filter((re) => re)
    ), N = /* @__PURE__ */ new Set();
    f.fieldInstances.forEach((re) => {
      const Ie = String(re.definitionId || "").trim();
      U.has(Ie) && N.add(Ie);
    });
    const q = N.size, ie = Math.max(0, x - q);
    v.totalFields && (v.totalFields.textContent = String(x)), v.placedCount && (v.placedCount.textContent = String(q)), v.unplacedCount && (v.unplacedCount.textContent = String(ie));
  }
  function Oe(v, b = !1) {
    const x = E(v);
    if (!x) return;
    x.classList.add("opacity-50"), x.draggable = !1;
    const U = x.querySelector(".placement-status");
    U && (U.textContent = "Placed", U.classList.remove("text-amber-600"), U.classList.add("text-green-600")), b && x.classList.add("just-linked");
  }
  function Ze(v) {
    const b = E(v);
    if (!b) return;
    b.classList.remove("opacity-50"), b.draggable = !0;
    const x = b.querySelector(".placement-status");
    x && (x.textContent = "Not placed", x.classList.remove("text-green-600"), x.classList.add("text-amber-600"));
  }
  function nt() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((b) => {
      b.classList.add("linked-flash"), setTimeout(() => {
        b.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function it(v) {
    const b = v === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${v} linked fields`;
    window.toastManager?.info?.(b);
    const x = document.createElement("div");
    x.setAttribute("role", "status"), x.setAttribute("aria-live", "polite"), x.className = "sr-only", x.textContent = b, document.body.appendChild(x), setTimeout(() => x.remove(), 1e3), nt();
  }
  function rt(v, b) {
    const x = document.createElement("div");
    x.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", x.dataset.definitionId = v, x.dataset.isLinked = String(b), x.title = b ? "Click to unlink this field" : "Click to re-link this field", x.setAttribute("role", "button"), x.setAttribute("aria-label", b ? "Unlink field from group" : "Re-link field to group"), x.setAttribute("tabindex", "0"), b ? x.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : x.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const U = () => Je(v, b);
    return x.addEventListener("click", U), x.addEventListener("keydown", (N) => {
      (N.key === "Enter" || N.key === " ") && (N.preventDefault(), U());
    }), x;
  }
  function We() {
    const v = z();
    if (v.linkAllBtn && (v.linkAllBtn.disabled = f.linkGroupState.unlinkedDefinitions.size === 0), v.unlinkAllBtn) {
      let b = !1;
      for (const x of f.linkGroupState.definitionToGroup.keys())
        if (!f.linkGroupState.unlinkedDefinitions.has(x)) {
          b = !0;
          break;
        }
      v.unlinkAllBtn.disabled = !b;
    }
  }
  function $e() {
    const v = z();
    v.linkAllBtn && !v.linkAllBtn.dataset.bound && (v.linkAllBtn.dataset.bound = "true", v.linkAllBtn.addEventListener("click", () => {
      const b = f.linkGroupState.unlinkedDefinitions.size;
      if (b !== 0) {
        for (const x of f.linkGroupState.unlinkedDefinitions)
          f.linkGroupState = Jn(f.linkGroupState, x);
        window.toastManager && window.toastManager.success(`Re-linked ${b} field${b > 1 ? "s" : ""}`), De();
      }
    })), v.unlinkAllBtn && !v.unlinkAllBtn.dataset.bound && (v.unlinkAllBtn.dataset.bound = "true", v.unlinkAllBtn.addEventListener("click", () => {
      let b = 0;
      for (const x of f.linkGroupState.definitionToGroup.keys())
        f.linkGroupState.unlinkedDefinitions.has(x) || (f.linkGroupState = Wn(f.linkGroupState, x), b += 1);
      b > 0 && window.toastManager && window.toastManager.success(`Unlinked ${b} field${b > 1 ? "s" : ""}`), De();
    })), We();
  }
  function _e() {
    return r().map((b) => {
      const x = String(b.definitionId || "").trim(), U = f.linkGroupState.definitionToGroup.get(x) || "", N = f.linkGroupState.unlinkedDefinitions.has(x);
      return { ...b, definitionId: x, linkGroupId: U, isUnlinked: N };
    });
  }
  function ue() {
    const v = z();
    if (!v.fieldsList) return;
    v.fieldsList.innerHTML = "";
    const b = _e();
    v.linkBatchActions && v.linkBatchActions.classList.toggle("hidden", f.linkGroupState.groups.size === 0), b.forEach((x, U) => {
      const N = x.definitionId, q = String(x.fieldType || "text").trim() || "text", ie = String(x.participantId || "").trim(), re = String(x.participantName || "Unassigned").trim() || "Unassigned", Ie = Number.parseInt(String(x.page || "1"), 10) || 1, Ue = x.linkGroupId, Se = x.isUnlinked;
      if (!N) return;
      f.fieldInstances.forEach((K) => {
        K.definitionId === N && (K.type = q, K.participantId = ie, K.participantName = re);
      });
      const He = Dt[q] || Dt.text, et = f.fieldInstances.some((K) => K.definitionId === N), Ne = document.createElement("div");
      Ne.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${et ? "opacity-50" : ""}`, Ne.draggable = !et, Ne.dataset.definitionId = N, Ne.dataset.fieldType = q, Ne.dataset.participantId = ie, Ne.dataset.participantName = re, Ne.dataset.page = String(Ie), Ue && (Ne.dataset.linkGroupId = Ue);
      const mt = document.createElement("span");
      mt.className = `w-3 h-3 rounded ${He.bg}`;
      const k = document.createElement("div");
      k.className = "flex-1 text-xs";
      const $ = document.createElement("div");
      $.className = "font-medium capitalize", $.textContent = q.replace(/_/g, " ");
      const B = document.createElement("div");
      B.className = "text-gray-500", B.textContent = re;
      const Y = document.createElement("span");
      Y.className = `placement-status text-xs ${et ? "text-green-600" : "text-amber-600"}`, Y.textContent = et ? "Placed" : "Not placed", k.appendChild($), k.appendChild(B), Ne.appendChild(mt), Ne.appendChild(k), Ne.appendChild(Y), Ne.addEventListener("dragstart", (K) => {
        if (et) {
          K.preventDefault();
          return;
        }
        K.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: N,
          fieldType: q,
          participantId: ie,
          participantName: re
        })), K.dataTransfer && (K.dataTransfer.effectAllowed = "copy"), Ne.classList.add("opacity-50");
      }), Ne.addEventListener("dragend", () => {
        Ne.classList.remove("opacity-50");
      }), v.fieldsList?.appendChild(Ne);
      const ee = b[U + 1];
      Ue && ee && ee.linkGroupId === Ue && v.fieldsList?.appendChild(rt(N, !Se));
    }), $e(), de();
  }
  function De() {
    ue();
  }
  function Je(v, b) {
    b ? (f.linkGroupState = Wn(f.linkGroupState, v), window.toastManager?.info?.("Field unlinked")) : (f.linkGroupState = Jn(f.linkGroupState, v), window.toastManager?.info?.("Field re-linked")), De();
  }
  async function ke(v) {
    const b = f.pdfDoc;
    if (!b) return;
    const x = z();
    if (!x.canvas || !x.canvasContainer) return;
    const U = x.canvas.getContext("2d"), N = await b.getPage(v), q = N.getViewport({ scale: f.scale });
    x.canvas.width = q.width, x.canvas.height = q.height, x.canvasContainer.style.width = `${q.width}px`, x.canvasContainer.style.height = `${q.height}px`, await N.render({
      canvasContext: U,
      viewport: q
    }).promise, x.currentPage && (x.currentPage.textContent = String(v)), we();
  }
  function st(v) {
    const b = Hs(f.linkGroupState, v);
    b && (f.linkGroupState = gi(f.linkGroupState, b.updatedGroup));
  }
  function se(v) {
    const b = /* @__PURE__ */ new Map();
    r().forEach((U) => {
      const N = String(U.definitionId || "").trim();
      N && b.set(N, {
        type: String(U.fieldType || "text").trim() || "text",
        participantId: String(U.participantId || "").trim(),
        participantName: String(U.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(U.page || "1"), 10) || 1,
        linkGroupId: f.linkGroupState.definitionToGroup.get(N)
      });
    });
    let x = 0;
    for (; x < 10; ) {
      const U = Os(
        f.linkGroupState,
        v,
        f.fieldInstances,
        b
      );
      if (!U || !U.newPlacement) break;
      f.fieldInstances.push(U.newPlacement), Oe(U.newPlacement.definitionId, !0), x += 1;
    }
    x > 0 && (we(), de(), ce(), it(x));
  }
  function G(v) {
    st(v);
  }
  function we() {
    const b = z().overlays;
    b && (b.innerHTML = "", b.style.pointerEvents = "auto", f.fieldInstances.filter((x) => x.page === f.currentPage).forEach((x) => {
      const U = Dt[x.type] || Dt.text, N = f.selectedFieldId === x.id, q = x.placementSource === gt.AUTO_LINKED, ie = document.createElement("div"), re = q ? "border-dashed" : "border-solid";
      ie.className = `field-overlay absolute cursor-move ${U.border} border-2 ${re} rounded`, ie.style.cssText = `
          left: ${x.x * f.scale}px;
          top: ${x.y * f.scale}px;
          width: ${x.width * f.scale}px;
          height: ${x.height * f.scale}px;
          background-color: ${U.fill};
          ${N ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, ie.dataset.instanceId = x.id;
      const Ie = document.createElement("div");
      if (Ie.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${U.bg}`, Ie.textContent = `${x.type.replace("_", " ")} - ${x.participantName}`, ie.appendChild(Ie), q) {
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
        He.stopPropagation(), Ke(x.id);
      }), ie.appendChild(Se), ie.addEventListener("mousedown", (He) => {
        He.target === Ue ? Me(He, x) : He.target !== Se && Ae(He, x, ie);
      }), ie.addEventListener("click", () => {
        f.selectedFieldId = x.id, we();
      }), b.appendChild(ie);
    }));
  }
  function Ye(v, b, x, U = {}) {
    const N = Vt[v.fieldType] || Vt.text, q = U.placementSource || gt.MANUAL, ie = U.linkGroupId || mi(f.linkGroupState, v.definitionId)?.id, re = {
      id: w("fi"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: f.currentPage,
      x: Math.max(0, b - N.width / 2),
      y: Math.max(0, x - N.height / 2),
      width: N.width,
      height: N.height,
      placementSource: q,
      linkGroupId: ie,
      linkedFromFieldId: U.linkedFromFieldId
    };
    f.fieldInstances.push(re), Oe(v.definitionId), q === gt.MANUAL && ie && G(re), we(), de(), ce();
  }
  function ve(v, b) {
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
      placementSource: gt.AUTO,
      resolverId: b.resolver_id,
      confidence: b.confidence,
      placementRunId: C.currentRunId
    };
    f.fieldInstances.push(x), Oe(v.definitionId), we(), de(), ce();
  }
  function Ae(v, b, x) {
    v.preventDefault(), f.isDragging = !0, f.selectedFieldId = b.id;
    const U = v.clientX, N = v.clientY, q = b.x * f.scale, ie = b.y * f.scale;
    function re(Ue) {
      const Se = Ue.clientX - U, He = Ue.clientY - N;
      b.x = Math.max(0, (q + Se) / f.scale), b.y = Math.max(0, (ie + He) / f.scale), b.placementSource = gt.MANUAL, x.style.left = `${b.x * f.scale}px`, x.style.top = `${b.y * f.scale}px`;
    }
    function Ie() {
      f.isDragging = !1, document.removeEventListener("mousemove", re), document.removeEventListener("mouseup", Ie), ce();
    }
    document.addEventListener("mousemove", re), document.addEventListener("mouseup", Ie);
  }
  function Me(v, b) {
    v.preventDefault(), v.stopPropagation(), f.isResizing = !0;
    const x = v.clientX, U = v.clientY, N = b.width, q = b.height;
    function ie(Ie) {
      const Ue = (Ie.clientX - x) / f.scale, Se = (Ie.clientY - U) / f.scale;
      b.width = Math.max(30, N + Ue), b.height = Math.max(20, q + Se), b.placementSource = gt.MANUAL, we();
    }
    function re() {
      f.isResizing = !1, document.removeEventListener("mousemove", ie), document.removeEventListener("mouseup", re), ce();
    }
    document.addEventListener("mousemove", ie), document.addEventListener("mouseup", re);
  }
  function Ke(v) {
    const b = f.fieldInstances.find((x) => x.id === v);
    b && (f.fieldInstances = f.fieldInstances.filter((x) => x.id !== v), Ze(b.definitionId), we(), de(), ce());
  }
  function Fe(v, b) {
    const U = z().canvas;
    !v || !U || (v.addEventListener("dragover", (N) => {
      N.preventDefault(), N.dataTransfer && (N.dataTransfer.dropEffect = "copy"), U.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("dragleave", () => {
      U.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("drop", (N) => {
      N.preventDefault(), U.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const q = N.dataTransfer?.getData("application/json") || "";
      if (!q) return;
      const ie = JSON.parse(q), re = U.getBoundingClientRect(), Ie = (N.clientX - re.left) / f.scale, Ue = (N.clientY - re.top) / f.scale;
      Ye(ie, Ie, Ue);
    }));
  }
  function Qe() {
    const v = z();
    v.prevBtn?.addEventListener("click", async () => {
      f.currentPage > 1 && (f.currentPage -= 1, se(f.currentPage), await ke(f.currentPage));
    }), v.nextBtn?.addEventListener("click", async () => {
      f.currentPage < f.totalPages && (f.currentPage += 1, se(f.currentPage), await ke(f.currentPage));
    });
  }
  function at() {
    const v = z();
    v.zoomIn?.addEventListener("click", async () => {
      f.scale = Math.min(3, f.scale + 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await ke(f.currentPage);
    }), v.zoomOut?.addEventListener("click", async () => {
      f.scale = Math.max(0.5, f.scale - 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await ke(f.currentPage);
    }), v.zoomFit?.addEventListener("click", async () => {
      if (!f.pdfDoc || !v.viewer) return;
      const x = (await f.pdfDoc.getPage(f.currentPage)).getViewport({ scale: 1 });
      f.scale = (v.viewer.clientWidth - 40) / x.width, v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await ke(f.currentPage);
    });
  }
  function M() {
    return z().policyPreset?.value || "balanced";
  }
  function R(v) {
    return v >= 0.8 ? "bg-green-100 text-green-800" : v >= 0.6 ? "bg-blue-100 text-blue-800" : v >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function j(v) {
    return v >= 0.9 ? "bg-green-100 text-green-800" : v >= 0.7 ? "bg-blue-100 text-blue-800" : v >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function F(v) {
    return v ? v.split("_").map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(" ") : "Unknown";
  }
  function H(v) {
    v.page_number !== f.currentPage && (f.currentPage = v.page_number, ke(v.page_number));
    const b = z().overlays;
    if (!b) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const x = document.createElement("div");
    x.id = "suggestion-preview-overlay", x.className = "absolute pointer-events-none animate-pulse", x.style.cssText = `
      left: ${v.x * f.scale}px;
      top: ${v.y * f.scale}px;
      width: ${v.width * f.scale}px;
      height: ${v.height * f.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, b.appendChild(x), setTimeout(() => x.remove(), 3e3);
  }
  async function ae(v, b) {
  }
  function le() {
    const v = document.getElementById("placement-suggestions-modal");
    if (!v) return;
    const b = v.querySelectorAll('.suggestion-item[data-accepted="true"]');
    b.forEach((x) => {
      const U = Number.parseInt(x.dataset.index || "", 10), N = C.suggestions[U];
      if (!N) return;
      const q = h(N.field_definition_id);
      if (!q) return;
      const ie = E(N.field_definition_id);
      if (!ie || ie.classList.contains("opacity-50")) return;
      const re = {
        definitionId: N.field_definition_id,
        fieldType: q.type,
        participantId: q.participant_id,
        participantName: ie.dataset.participantName || q.participant_name || "Unassigned"
      };
      f.currentPage = N.page_number, ve(re, N);
    }), f.pdfDoc && ke(f.currentPage), ae(b.length, C.suggestions.length - b.length), S(`Applied ${b.length} placement${b.length !== 1 ? "s" : ""}`, "success");
  }
  function ye(v) {
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
        const x = Number.parseInt(b.dataset.index || "", 10), U = C.suggestions[x];
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
    `, P(v, "#close-suggestions-modal")?.addEventListener("click", () => {
      v.classList.add("hidden");
    }), v.addEventListener("click", (b) => {
      b.target === v && v.classList.add("hidden");
    }), P(v, "#accept-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-green-500", "bg-green-50"), b.classList.remove("border-red-500", "bg-red-50"), b.dataset.accepted = "true";
      });
    }), P(v, "#reject-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-red-500", "bg-red-50"), b.classList.remove("border-green-500", "bg-green-50"), b.dataset.accepted = "false";
      });
    }), P(v, "#apply-suggestions-btn")?.addEventListener("click", () => {
      le(), v.classList.add("hidden");
    }), P(v, "#rerun-placement-btn")?.addEventListener("click", () => {
      v.classList.add("hidden");
      const b = J(v, "#placement-policy-preset-modal"), x = z().policyPreset;
      x && b && (x.value = b.value), z().autoPlaceBtn?.click();
    }), v;
  }
  function Q(v) {
    let b = document.getElementById("placement-suggestions-modal");
    b || (b = ge(), document.body.appendChild(b));
    const x = J(b, "#suggestions-list"), U = J(b, "#resolver-info"), N = J(b, "#run-stats");
    !x || !U || !N || (U.innerHTML = C.resolverScores.map((q) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${D(String(q?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${q.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${R(Number(q.score || 0))}">
              ${(Number(q?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), N.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${D(String(v?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${v.status === "completed" ? "text-green-600" : "text-amber-600"}">${D(String(v?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(v?.elapsed_ms || 0))}ms</span>
      </div>
    `, x.innerHTML = C.suggestions.map((q, ie) => {
      const re = h(q.field_definition_id), Ie = Dt[re?.type || "text"] || Dt.text, Ue = D(String(re?.type || "field").replace(/_/g, " ")), Se = D(String(q?.id || "")), He = Math.max(1, Number(q?.page_number || 1)), et = Math.round(Number(q?.x || 0)), Ne = Math.round(Number(q?.y || 0)), mt = Math.max(0, Number(q?.confidence || 0)), k = D(F(String(q?.resolver_id || "")));
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
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${j(Number(q.confidence || 0))}">
                ${(mt * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${k}
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
    }).join(""), ye(b), b.classList.remove("hidden"));
  }
  function Z() {
    const v = T();
    let b = 100;
    v.forEach((x) => {
      const U = {
        definitionId: x.dataset.definitionId || "",
        fieldType: x.dataset.fieldType || "text",
        participantId: x.dataset.participantId || "",
        participantName: x.dataset.participantName || "Unassigned"
      }, N = Vt[U.fieldType || "text"] || Vt.text;
      f.currentPage = f.totalPages, Ye(U, 300, b + N.height / 2, { placementSource: gt.AUTO_FALLBACK }), b += N.height + 20;
    }), f.pdfDoc && ke(f.totalPages), S("Fields placed using fallback layout", "info");
  }
  async function be() {
    const v = z();
    if (!v.autoPlaceBtn || C.isRunning) return;
    if (T().length === 0) {
      S("All fields are already placed", "info");
      return;
    }
    const x = document.querySelector('input[name="id"]')?.value;
    if (!x) {
      Z();
      return;
    }
    C.isRunning = !0, v.autoPlaceBtn.disabled = !0, v.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const U = await fetch(`${t}/esign/agreements/${x}/auto-place`, {
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
      const N = await U.json(), q = zs(N) ? N.run || {} : N;
      C.currentRunId = q?.run_id || q?.id || null, C.suggestions = q?.suggestions || [], C.resolverScores = q?.resolver_scores || [], C.suggestions.length === 0 ? (S("No placement suggestions found. Try placing fields manually.", "warning"), Z()) : Q(q);
    } catch (U) {
      console.error("Auto-place error:", U);
      const N = U && typeof U == "object" ? U : {}, q = y(N.message || "Auto-placement failed", N.code || "", N.status || 0);
      S(`Auto-placement failed: ${q}`, "error"), Z();
    } finally {
      C.isRunning = !1, v.autoPlaceBtn.disabled = !1, v.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function xe() {
    const v = z();
    v.autoPlaceBtn && !f.autoPlaceBound && (v.autoPlaceBtn.addEventListener("click", () => {
      be();
    }), f.autoPlaceBound = !0);
  }
  async function Pe() {
    const v = z();
    if (!n?.value) {
      v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden");
      return;
    }
    v.loading?.classList.remove("hidden"), v.noDocument?.classList.add("hidden");
    const b = r(), x = new Set(
      b.map((re) => String(re.definitionId || "").trim()).filter((re) => re)
    );
    f.fieldInstances = f.fieldInstances.filter(
      (re) => x.has(String(re.definitionId || "").trim())
    ), ue();
    const U = ++f.loadRequestVersion, N = String(n.value || "").trim(), q = encodeURIComponent(N), ie = `${e}/panels/esign_documents/${q}/source/pdf`;
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
        v.noDocument.textContent = `Failed to load PDF: ${y(Ie.message || "Failed to load PDF")}`;
      }
    }
    de(), ce({ silent: !0 });
  }
  function Re(v) {
    const b = Array.isArray(v?.fieldPlacements) ? v.fieldPlacements : [];
    f.fieldInstances = b.map((x, U) => Ht(x, U)), ce({ silent: !0 });
  }
  return ce({ silent: !0 }), {
    bindEvents: xe,
    initPlacementEditor: Pe,
    getState: oe,
    getLinkGroupState: O,
    setLinkGroupState: ne,
    buildPlacementFormEntries: fe,
    updateFieldInstancesFormData: ce,
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
    buildPlacementFormEntries: y,
    getCurrentStep: S,
    totalWizardSteps: D
  } = i;
  function L() {
    const f = [];
    o.querySelectorAll(".participant-entry").forEach((T) => {
      const P = String(T.getAttribute("data-participant-id") || "").trim(), J = Pt(T, 'input[name*=".name"]'), z = Pt(T, 'input[name*=".email"]'), oe = Pt(T, 'select[name*=".role"]', "signer"), O = Kn(T, ".notify-input", !0), ne = Pt(T, ".signing-stage-input"), fe = Number(ne || "1") || 1;
      f.push({
        id: P,
        name: J,
        email: z,
        role: oe,
        notify: O,
        signing_stage: oe === "signer" ? fe : 0
      });
    });
    const C = [];
    c.querySelectorAll(".field-definition-entry").forEach((T) => {
      const P = String(T.getAttribute("data-field-definition-id") || "").trim(), J = Pt(T, ".field-type-select", "signature"), z = Pt(T, ".field-participant-select"), oe = Number(Pt(T, 'input[name*=".page"]', "1")) || 1, O = Kn(T, 'input[name*=".required"]');
      P && C.push({
        id: P,
        type: J,
        participant_id: z,
        page: oe,
        required: O
      });
    });
    const w = y(), E = JSON.stringify(w);
    return r && (r.value = E), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(s?.value || "").trim(),
      participants: f,
      field_instances: C,
      field_placements: w,
      field_placements_json: E,
      field_rules: g(),
      field_rules_json: String(h?.value || "[]"),
      send_for_signature: S() === D ? 1 : 0,
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
    documentIdInput: y,
    documentPageCountInput: S,
    selectedDocumentTitle: D,
    agreementRefs: L,
    parsePositiveInt: f,
    isEditMode: C
  } = i;
  let w = null;
  function E() {
    w !== null && clearTimeout(w), w = setTimeout(() => {
      n();
    }, 500);
  }
  function T() {
    s.restoreFromState(t.getState());
  }
  function P() {
    o.restoreFieldDefinitionsFromState(t.getState());
  }
  function J() {
    o.restoreFieldRulesFromState(t.getState());
  }
  function z() {
    c.restoreFieldPlacementsFromState(t.getState());
  }
  function oe() {
    y && new MutationObserver(() => {
      n();
    }).observe(y, { attributes: !0, attributeFilter: ["value"] });
    const ne = document.getElementById("title"), fe = document.getElementById("message");
    ne instanceof HTMLInputElement && ne.addEventListener("input", () => {
      const ce = String(ne.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(ce), E();
    }), (fe instanceof HTMLInputElement || fe instanceof HTMLTextAreaElement) && fe.addEventListener("input", E), s.refs.participantsContainer?.addEventListener("input", E), s.refs.participantsContainer?.addEventListener("change", E), o.refs.fieldDefinitionsContainer?.addEventListener("input", E), o.refs.fieldDefinitionsContainer?.addEventListener("change", E), o.refs.fieldRulesContainer?.addEventListener("input", E), o.refs.fieldRulesContainer?.addEventListener("change", E);
  }
  function O() {
    if (window._resumeToStep) {
      T(), P(), J(), r(), z();
      const ne = t.getState();
      ne.document?.id && h.setDocument(
        ne.document.id,
        ne.document.title || null,
        ne.document.pageCount ?? null
      ), g.setCurrentStep(window._resumeToStep), g.updateWizardUI(), delete window._resumeToStep;
    } else if (g.updateWizardUI(), y.value) {
      const ne = D?.textContent || null, fe = f(S?.value, 0) || null;
      h.setDocument(y.value, ne, fe);
    }
    C && L.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: oe,
    debouncedTrackChanges: E,
    renderInitialWizardUI: O
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
    missingSignatureFieldMessage: y,
    announceError: S
  } = i;
  function D(L) {
    switch (L) {
      case 1:
        return e.value ? !!r() : (S("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (S("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const f = n.querySelectorAll(".participant-entry");
        if (f.length === 0)
          return S("Please add at least one participant"), !1;
        let C = !1;
        return f.forEach((w) => {
          Gs(w)?.value === "signer" && (C = !0);
        }), C ? !0 : (S("At least one signer is required"), !1);
      }
      case 4: {
        const f = s.querySelectorAll(".field-definition-entry");
        for (const T of Array.from(f)) {
          const P = Ws(T);
          if (!P?.value)
            return S("Please assign all fields to a signer"), P?.focus(), !1;
        }
        if (h().find((T) => !T.participantId))
          return S("Please assign all automation rules to a signer"), o?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const E = g();
        return E.length > 0 ? (S(y(E)), c.focus(), !1) : !0;
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
function Ys(i) {
  const {
    isEditMode: e,
    stateManager: t,
    syncOrchestrator: n,
    syncService: s,
    hasMeaningfulWizardProgress: o,
    formatRelativeTime: c,
    emitWizardTelemetry: r
  } = i;
  function h(T, P) {
    return t.normalizeLoadedState({
      ...P,
      currentStep: T.currentStep,
      document: T.document,
      details: T.details,
      participants: T.participants,
      fieldDefinitions: T.fieldDefinitions,
      fieldPlacements: T.fieldPlacements,
      fieldRules: T.fieldRules,
      titleSource: T.titleSource,
      syncPending: !0,
      serverDraftId: P.serverDraftId,
      serverRevision: P.serverRevision,
      lastSyncedAt: P.lastSyncedAt
    });
  }
  async function g() {
    if (e) return t.getState();
    const T = t.normalizeLoadedState(t.getState()), P = String(T?.serverDraftId || "").trim();
    if (!P)
      return t.setState(T, { syncPending: !!T.syncPending, notify: !1 }), t.getState();
    try {
      const J = await s.load(P), z = t.normalizeLoadedState({
        ...J?.wizard_state && typeof J.wizard_state == "object" ? J.wizard_state : {},
        serverDraftId: String(J?.id || P).trim() || P,
        serverRevision: Number(J?.revision || 0),
        lastSyncedAt: String(J?.updated_at || J?.updatedAt || "").trim() || T.lastSyncedAt,
        syncPending: !1
      }), O = String(T.serverDraftId || "").trim() === String(z.serverDraftId || "").trim() && T.syncPending === !0 ? h(T, z) : z;
      return t.setState(O, { syncPending: !!O.syncPending, notify: !1 }), t.getState();
    } catch (J) {
      if ((typeof J == "object" && J !== null && "status" in J ? Number(J.status || 0) : 0) === 404) {
        const oe = t.normalizeLoadedState({
          ...T,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return t.setState(oe, { syncPending: !!oe.syncPending, notify: !1 }), t.getState();
      }
      return t.getState();
    }
  }
  function y(T) {
    return document.getElementById(T);
  }
  function S() {
    const T = document.getElementById("resume-dialog-modal"), P = t.getState(), J = String(P?.document?.title || "").trim() || String(P?.document?.id || "").trim() || "Unknown document", z = y("resume-draft-title"), oe = y("resume-draft-document"), O = y("resume-draft-step"), ne = y("resume-draft-time");
    z && (z.textContent = P.details?.title || "Untitled Agreement"), oe && (oe.textContent = J), O && (O.textContent = String(P.currentStep || 1)), ne && (ne.textContent = c(P.updatedAt)), T?.classList.remove("hidden"), r("wizard_resume_prompt_shown", {
      step: Number(P.currentStep || 1),
      has_server_draft: !!P.serverDraftId
    });
  }
  async function D(T = {}) {
    const P = T.deleteServerDraft === !0, J = String(t.getState()?.serverDraftId || "").trim();
    if (t.clear(), n.broadcastStateUpdate(), !(!P || !J))
      try {
        await s.delete(J);
      } catch (z) {
        console.warn("Failed to delete server draft:", z);
      }
  }
  function L() {
    return t.normalizeLoadedState({
      ...t.getState(),
      ...t.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function f(T) {
    o(T) && (t.setState(T, { syncPending: !0 }), n.scheduleSync(), n.broadcastStateUpdate());
  }
  async function C(T) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const P = L();
    switch (T) {
      case "continue":
        t.restoreFormState(), window._resumeToStep = t.getState().currentStep;
        return;
      case "start_new":
        await D({ deleteServerDraft: !1 }), f(P);
        return;
      case "proceed":
        await D({ deleteServerDraft: !0 }), f(P);
        return;
      case "discard":
        await D({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  function w() {
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
  async function E() {
    e || (await g(), t.hasResumableState() && S());
  }
  return {
    bindEvents: w,
    reconcileBootstrapState: g,
    maybeShowResumeDialog: E
  };
}
function Ks(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let s = "saved";
  function o(L) {
    if (!L) return "unknown";
    const f = new Date(L), w = (/* @__PURE__ */ new Date()).getTime() - f.getTime(), E = Math.floor(w / 6e4), T = Math.floor(w / 36e5), P = Math.floor(w / 864e5);
    return E < 1 ? "just now" : E < 60 ? `${E} minute${E !== 1 ? "s" : ""} ago` : T < 24 ? `${T} hour${T !== 1 ? "s" : ""} ago` : P < 7 ? `${P} day${P !== 1 ? "s" : ""} ago` : f.toLocaleDateString();
  }
  function c() {
    const L = n.getState();
    s === "paused" && r(L?.syncPending ? "pending" : "saved");
  }
  function r(L) {
    s = String(L || "").trim() || "saved";
    const f = e.sync.indicator, C = e.sync.icon, w = e.sync.text, E = e.sync.retryBtn;
    if (!(!f || !C || !w))
      switch (f.classList.remove("hidden"), L) {
        case "saved":
          C.className = "w-2 h-2 rounded-full bg-green-500", w.textContent = "Saved", w.className = "text-gray-600", E?.classList.add("hidden");
          break;
        case "saving":
          C.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", w.textContent = "Saving...", w.className = "text-gray-600", E?.classList.add("hidden");
          break;
        case "pending":
          C.className = "w-2 h-2 rounded-full bg-gray-400", w.textContent = "Unsaved changes", w.className = "text-gray-500", E?.classList.add("hidden");
          break;
        case "error":
          C.className = "w-2 h-2 rounded-full bg-amber-500", w.textContent = "Not synced", w.className = "text-amber-600", E?.classList.remove("hidden");
          break;
        case "paused":
          C.className = "w-2 h-2 rounded-full bg-slate-400", w.textContent = "Open in another tab", w.className = "text-slate-600", E?.classList.add("hidden");
          break;
        case "conflict":
          C.className = "w-2 h-2 rounded-full bg-red-500", w.textContent = "Conflict", w.className = "text-red-600", E?.classList.add("hidden");
          break;
        default:
          f.classList.add("hidden");
      }
  }
  function h(L) {
    const f = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = o(f.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(L || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function g(L, f = "", C = 0) {
    const w = String(f || "").trim().toUpperCase(), E = String(L || "").trim().toLowerCase();
    return w === "DRAFT_SEND_NOT_FOUND" || w === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : w === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : w === "SCOPE_DENIED" || E.includes("scope denied") ? "You don't have access to this organization's resources." : w === "TRANSPORT_SECURITY" || w === "TRANSPORT_SECURITY_REQUIRED" || E.includes("tls transport required") || Number(C) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : w === "PDF_UNSUPPORTED" || E === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(L || "").trim() !== "" ? String(L).trim() : "Something went wrong. Please try again.";
  }
  async function y(L, f = "") {
    const C = Number(L?.status || 0);
    let w = "", E = "", T = {};
    try {
      const P = await L.json();
      w = String(P?.error?.code || P?.code || "").trim(), E = String(P?.error?.message || P?.message || "").trim(), T = P?.error?.details && typeof P.error.details == "object" ? P.error.details : {}, String(T?.entity || "").trim().toLowerCase() === "drafts" && String(w).trim().toUpperCase() === "NOT_FOUND" && (w = "DRAFT_SEND_NOT_FOUND", E === "" && (E = "Draft not found"));
    } catch {
      E = "";
    }
    return E === "" && (E = f || `Request failed (${C || "unknown"})`), {
      status: C,
      code: w,
      details: T,
      message: g(E, w, C)
    };
  }
  function S(L, f = "", C = 0) {
    const w = g(L, f, C);
    t && (t.textContent = w), window.toastManager?.error ? window.toastManager.error(w) : alert(w);
  }
  async function D(L, f = {}) {
    const C = await L;
    return C?.blocked && C.reason === "passive_tab" ? (S(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), C) : (C?.error && String(f.errorMessage || "").trim() !== "" && S(f.errorMessage || ""), C);
  }
  return {
    announceError: S,
    formatRelativeTime: o,
    mapUserFacingError: g,
    parseAPIError: y,
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
    updateActiveTabOwnershipUI: y
  } = i;
  function S() {
    const C = t.collectFormState();
    t.updateState(C), n.scheduleSync(), n.broadcastStateUpdate();
  }
  function D() {
    if (!e)
      return;
    const w = t.getState()?.serverDraftId;
    t.clear(), n.broadcastStateUpdate(), w && s.delete(w).catch((E) => {
      console.warn("Failed to delete server draft after successful create:", E);
    });
  }
  function L() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await o(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      const C = t.getState();
      if (C.serverDraftId)
        try {
          const w = await s.load(C.serverDraftId);
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
      const C = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      t.setState({
        ...t.getState(),
        serverRevision: C,
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
  function f() {
    document.getElementById("active-tab-take-control-btn")?.addEventListener("click", async () => {
      if (!n.takeControl()) {
        c("This agreement is active in another tab. Take control here before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED");
        return;
      }
      y({ isOwner: !0 }), t.getState()?.syncPending && await o(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      }), r() === h && g();
    }), document.getElementById("active-tab-reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
  }
  return {
    bindOwnershipHandlers: f,
    bindRetryAndConflictHandlers: L,
    handleCreateSuccessCleanup: D,
    trackWizardStateChanges: S
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
  return !!(c !== "" && h !== n.SERVER_SEED || r !== "" || (Array.isArray(i.participants) ? i.participants : []).some((S, D) => Qs(S, D)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function Zs(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), o = /\/v\d+$/i.test(s) ? s : `${s}/v1`, c = `${o}/esign/drafts`, r = !!e.is_edit, h = !!e.create_success, g = String(e.user_id || "").trim(), y = String(e.submit_mode || "json").trim().toLowerCase(), S = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, D = Array.isArray(e.initial_participants) ? e.initial_participants : [], L = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], f = {
    base_path: t,
    api_base_path: n,
    user_id: g,
    is_edit: r,
    create_success: h,
    submit_mode: y,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: S
    },
    initial_participants: D,
    initial_field_instances: L
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
    submitMode: y,
    documentsUploadURL: S,
    initialParticipants: D,
    initialFieldInstances: L
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
    submitMode: y,
    documentsUploadURL: S,
    initialParticipants: D,
    initialFieldInstances: L
  } = Zs(i), {
    draftEndpointWithUserID: f,
    draftRequestHeaders: C
  } = er(g), w = vs(document), {
    WIZARD_STATE_VERSION: E,
    WIZARD_STORAGE_KEY: T,
    WIZARD_CHANNEL_NAME: P,
    LEGACY_WIZARD_STORAGE_KEY: J,
    SYNC_DEBOUNCE_MS: z,
    SYNC_RETRY_DELAYS: oe,
    WIZARD_STORAGE_MIGRATION_VERSION: O,
    ACTIVE_TAB_STORAGE_KEY: ne,
    ACTIVE_TAB_HEARTBEAT_MS: fe,
    ACTIVE_TAB_STALE_MS: ce,
    TITLE_SOURCE: de
  } = tr({
    config: e,
    currentUserID: g,
    isEditMode: r
  }), Oe = Is(), Ze = (X, pe = de.AUTOFILL) => hi(X, pe), nt = (X) => Xn(X, {
    normalizeTitleSource: Ze,
    titleSource: de
  }), it = ms({
    apiBasePath: o,
    basePath: n
  }), rt = w.form.root, We = w.form.submitBtn, $e = w.form.announcements;
  let _e, ue, De, Je, ke, st, se, G, we = en();
  const Ye = () => Je?.debouncedTrackChanges?.(), ve = () => G?.trackWizardStateChanges?.(), Ae = (X) => se.formatRelativeTime(X), Me = () => se.restoreSyncStatusFromState(), Ke = (X) => se.updateSyncStatus(X), Fe = (X) => se.showSyncConflictDialog(X), Qe = (X, pe = "", Ee = 0) => se.mapUserFacingError(X, pe, Ee), at = (X, pe) => se.parseAPIError(X, pe), M = (X, pe = "", Ee = 0) => se.announceError(X, pe, Ee), R = (X, pe = {}) => se.surfaceSyncOutcome(X, pe), j = ys(w, {
    formatRelativeTime: Ae
  }), F = (X = {}) => j.render(X), H = new bs({
    storageKey: T,
    legacyStorageKey: J,
    stateVersion: E,
    storageMigrationVersion: O,
    totalWizardSteps: Nt,
    titleSource: de,
    normalizeTitleSource: Ze,
    parsePositiveInt: Xe,
    hasMeaningfulWizardProgress: nt,
    collectFormState: () => {
      const X = w.form.documentIdInput?.value || null, pe = document.getElementById("selected-document-title")?.textContent?.trim() || null, Ee = Ze(
        H.getState()?.titleSource,
        String(w.form.titleInput?.value || "").trim() === "" ? de.AUTOFILL : de.USER
      );
      return {
        document: {
          id: X,
          title: pe,
          pageCount: parseInt(w.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: w.form.titleInput?.value || "",
          message: w.form.messageInput?.value || ""
        },
        titleSource: Ee,
        participants: _e?.collectParticipantsForState?.() || [],
        fieldDefinitions: ue?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: De?.getState?.()?.fieldInstances || [],
        fieldRules: ue?.collectFieldRulesForState?.() || []
      };
    },
    restoreDocumentState: (X) => {
      if (!X?.document?.id) return;
      const pe = document.getElementById("selected-document"), Ee = document.getElementById("document-picker"), dt = document.getElementById("selected-document-title"), ut = document.getElementById("selected-document-info");
      w.form.documentIdInput.value = X.document.id, dt && (dt.textContent = X.document.title || "Selected Document"), ut && (ut.textContent = X.document.pageCount ? `${X.document.pageCount} pages` : ""), w.form.documentPageCountInput && X.document.pageCount && (w.form.documentPageCountInput.value = String(X.document.pageCount)), pe && pe.classList.remove("hidden"), Ee && Ee.classList.add("hidden");
    },
    restoreDetailsState: (X) => {
      w.form.titleInput.value = X?.details?.title || "", w.form.messageInput.value = X?.details?.message || "";
    },
    emitTelemetry: Oe
  });
  H.start(), se = Ks({
    agreementRefs: w,
    formAnnouncements: $e,
    stateManager: H
  });
  const ae = new ws({
    stateManager: H,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: f,
    draftRequestHeaders: C
  });
  let le;
  const ye = new Ss({
    storageKey: ne,
    channelName: P,
    heartbeatMs: fe,
    staleMs: ce,
    telemetry: Oe,
    onOwnershipChange: (X) => {
      X.isOwner ? Me() : Ke("paused"), j.render(X);
    },
    onRemoteState: (X) => {
      if (H.applyRemoteState(X, {
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
    onRemoteSync: (X, pe) => {
      H.applyRemoteSync(X, pe, {
        save: !0,
        notify: !0
      });
    },
    onVisibilityHidden: () => {
      le?.forceSync({ keepalive: !0 });
    },
    onPageHide: () => {
      le?.forceSync({ keepalive: !0 });
    },
    onBeforeUnload: () => {
      le?.forceSync({ keepalive: !0 });
    }
  });
  le = new xs({
    stateManager: H,
    syncService: ae,
    activeTabController: ye,
    statusUpdater: Ke,
    showConflictDialog: Fe,
    syncDebounceMs: z,
    syncRetryDelays: oe,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: f,
    draftRequestHeaders: C
  });
  const Q = fs({
    context: {
      config: t,
      refs: w,
      basePath: n,
      apiBase: s,
      apiVersionBase: o,
      draftsEndpoint: c,
      previewCard: it,
      emitTelemetry: Oe,
      stateManager: H,
      syncService: ae,
      activeTabController: ye,
      syncController: le
    },
    hooks: {
      renderInitialUI() {
        Je?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        st?.maybeShowResumeDialog?.(), Z.loadDocuments(), Z.loadRecentDocuments();
      },
      destroy() {
        j.destroy(), H.destroy();
      }
    }
  }), Z = $s({
    apiBase: s,
    apiVersionBase: o,
    currentUserID: g,
    documentsUploadURL: S,
    isEditMode: r,
    titleSource: de,
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
  } = Z.refs, v = Z.ensureSelectedDocumentCompatibility, b = Z.getCurrentDocumentPageCount;
  _e = Fs({
    initialParticipants: D,
    onParticipantsChanged: () => ue?.updateFieldParticipantOptions?.()
  }), _e.initialize(), _e.bindEvents();
  const x = _e.refs.participantsContainer, U = _e.refs.addParticipantBtn, N = () => _e.getSignerParticipants();
  ue = Ns({
    initialFieldInstances: L,
    placementSource: gt,
    getCurrentDocumentPageCount: b,
    getSignerParticipants: N,
    escapeHtml: mn,
    onDefinitionsChanged: () => Ye(),
    onRulesChanged: () => Ye(),
    onParticipantsChanged: () => ue?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => De?.getLinkGroupState?.() || we,
    setPlacementLinkGroupState: (X) => {
      we = X || en(), De?.setLinkGroupState?.(we);
    }
  }), ue.bindEvents(), ue.initialize();
  const q = ue.refs.fieldDefinitionsContainer, ie = ue.refs.fieldRulesContainer, re = ue.refs.addFieldBtn, Ie = ue.refs.fieldPlacementsJSONInput, Ue = ue.refs.fieldRulesJSONInput, Se = () => ue.collectFieldRulesForState(), He = () => ue.collectFieldRulesForForm(), et = (X, pe) => ue.expandRulesForPreview(X, pe), Ne = () => ue.updateFieldParticipantOptions(), mt = () => ue.collectPlacementFieldDefinitions(), k = (X) => ue.getFieldDefinitionById(X), $ = () => ue.findSignersMissingRequiredSignatureField(), B = (X) => ue.missingSignatureFieldMessage(X), Y = Cs({
    documentIdInput: be,
    selectedDocumentTitle: Pe,
    participantsContainer: x,
    fieldDefinitionsContainer: q,
    submitBtn: We,
    syncOrchestrator: le,
    escapeHtml: mn,
    getSignerParticipants: N,
    getCurrentDocumentPageCount: b,
    collectFieldRulesForState: Se,
    expandRulesForPreview: et,
    findSignersMissingRequiredSignatureField: $,
    goToStep: (X) => ee.goToStep(X)
  });
  De = js({
    apiBase: s,
    apiVersionBase: o,
    documentIdInput: be,
    fieldPlacementsJSONInput: Ie,
    initialFieldInstances: ue.buildInitialPlacementInstances(),
    initialLinkGroupState: we,
    collectPlacementFieldDefinitions: mt,
    getFieldDefinitionById: k,
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
    syncOrchestrator: le,
    previewCard: it,
    updateActiveTabOwnershipUI: F,
    validateStep: (X) => ke.validateStep(X),
    onPlacementStep() {
      De.initPlacementEditor();
    },
    onReviewStep() {
      Y.initSendReadinessCheck();
    },
    onStepChanged(X) {
      H.updateStep(X), ve(), le.forceSync();
    }
  });
  ee.bindEvents(), G = Xs({
    createSuccess: h,
    stateManager: H,
    syncOrchestrator: le,
    syncService: ae,
    surfaceSyncOutcome: R,
    announceError: M,
    getCurrentStep: () => ee.getCurrentStep(),
    reviewStep: tt.REVIEW,
    onReviewStepRequested: () => Y.initSendReadinessCheck(),
    updateActiveTabOwnershipUI: F
  }), G.handleCreateSuccessCleanup(), G.bindRetryAndConflictHandlers(), G.bindOwnershipHandlers();
  const K = qs({
    documentIdInput: be,
    documentPageCountInput: Re,
    titleInput: w.form.titleInput,
    messageInput: w.form.messageInput,
    participantsContainer: x,
    fieldDefinitionsContainer: q,
    fieldPlacementsJSONInput: Ie,
    fieldRulesJSONInput: Ue,
    collectFieldRulesForForm: He,
    buildPlacementFormEntries: () => De?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => ee.getCurrentStep(),
    totalWizardSteps: Nt
  }), Ve = () => K.buildCanonicalAgreementPayload();
  return Je = Vs({
    titleSource: de,
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
    agreementRefs: w,
    parsePositiveInt: Xe,
    isEditMode: r
  }), Je.bindChangeTracking(), ke = Js({
    documentIdInput: be,
    titleInput: w.form.titleInput,
    participantsContainer: x,
    fieldDefinitionsContainer: q,
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
    syncOrchestrator: le,
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
    participantsContainer: x,
    addParticipantBtn: U,
    fieldDefinitionsContainer: q,
    fieldRulesContainer: ie,
    documentPageCountInput: Re,
    fieldPlacementsJSONInput: Ie,
    fieldRulesJSONInput: Ue,
    currentUserID: g,
    draftsEndpoint: c,
    draftEndpointWithUserID: f,
    draftRequestHeaders: C,
    syncService: ae,
    syncOrchestrator: le,
    stateManager: H,
    submitMode: y,
    totalWizardSteps: Nt,
    wizardStep: tt,
    getCurrentStep: () => ee.getCurrentStep(),
    getPlacementState: () => De.getState(),
    getCurrentDocumentPageCount: b,
    ensureSelectedDocumentCompatibility: v,
    collectFieldRulesForState: Se,
    collectFieldRulesForForm: He,
    expandRulesForPreview: et,
    findSignersMissingRequiredSignatureField: $,
    missingSignatureFieldMessage: B,
    getSignerParticipants: N,
    buildCanonicalAgreementPayload: Ve,
    announceError: M,
    emitWizardTelemetry: Oe,
    parseAPIError: at,
    goToStep: (X) => ee.goToStep(X),
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
  function y() {
    r.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function S(a, l) {
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
  function L(a, l) {
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
      const d = a.page, p = this.getPageMetadata(d), m = l.offsetWidth, I = l.offsetHeight, A = a.pageWidth || p.width, W = a.pageHeight || p.height, te = m / A, Ce = I / W;
      let me = a.posX || 0, Le = a.posY || 0;
      n.viewer.origin === "bottom-left" && (Le = W - Le - (a.height || 30));
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
          pageHeight: W,
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
  }, C = {
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
        const W = String(I).toLowerCase();
        W === "x-esign-upload-token" || W === "x-esign-upload-key" || (p[I] = String(A));
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
      const [l, d] = a.split(","), p = l.match(/data:([^;]+)/), m = p ? p[1] : "image/png", I = atob(d), A = new Uint8Array(I.length);
      for (let W = 0; W < I.length; W++)
        A[W] = I.charCodeAt(W);
      return new Blob([A], { type: m });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, l) {
      const d = this.dataUrlToBlob(l), p = d.size, m = "image/png", I = await nt(d), A = await this.requestUploadBootstrap(
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
  }, w = {
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
  function E(a) {
    const l = r.fieldState.get(a);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function T(a) {
    return r.savedSignaturesByType.get(a) || [];
  }
  async function P(a, l = !1) {
    const d = E(a);
    if (!l && r.savedSignaturesByType.has(d)) {
      J(a);
      return;
    }
    const p = await w.list(d);
    r.savedSignaturesByType.set(d, p), J(a);
  }
  function J(a) {
    const l = E(a), d = T(l), p = document.getElementById("sig-saved-list");
    if (p) {
      if (!d.length) {
        p.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      p.innerHTML = d.map((m) => {
        const I = St(String(m?.thumbnail_data_url || m?.data_url || "")), A = St(String(m?.label || "Saved signature")), W = St(String(m?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${I}" alt="${A}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${A}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${St(a)}" data-signature-id="${W}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${St(a)}" data-signature-id="${W}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function z(a) {
    const l = r.signatureCanvases.get(a), d = E(a);
    if (!l || !K(a))
      throw new Error(`Please add your ${d === "initials" ? "initials" : "signature"} first`);
    const p = l.canvas.toDataURL("image/png"), m = await w.save(d, p, d === "initials" ? "Initials" : "Signature");
    if (!m)
      throw new Error("Failed to save signature");
    const I = T(d);
    I.unshift(m), r.savedSignaturesByType.set(d, I), J(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function oe(a, l) {
    const d = E(a), m = T(d).find((A) => String(A?.id || "") === String(l));
    if (!m) return;
    requestAnimationFrame(() => mt(a)), await fe(a);
    const I = String(m.data_url || m.thumbnail_data_url || "").trim();
    I && (await $(a, I, { clearStrokes: !0 }), L(a, I), h(), et("draw", a), ot("Saved signature selected."));
  }
  async function O(a, l) {
    const d = E(a);
    await w.delete(l);
    const p = T(d).filter((m) => String(m?.id || "") !== String(l));
    r.savedSignaturesByType.set(d, p), J(a);
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
  async function ce(a, l) {
    const d = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(d))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => mt(a)), await fe(a);
    const p = r.signatureCanvases.get(a);
    if (!p)
      throw new Error("Signature canvas is not ready");
    const m = await de(l), I = d === "image/png" ? m : await Ze(m, p.drawWidth, p.drawHeight);
    if (Oe(I) > ei)
      throw new Error(`Image exceeds ${Math.round(ei / 1024)}KB limit after conversion`);
    await $(a, I, { clearStrokes: !0 }), L(a, I), h();
    const W = document.getElementById("sig-upload-preview-wrap"), te = document.getElementById("sig-upload-preview");
    W && W.classList.remove("hidden"), te && te.setAttribute("src", I), ot("Signature image uploaded. You can now insert it.");
  }
  function de(a) {
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
      const I = new Image();
      I.onload = () => {
        const A = document.createElement("canvas"), W = Math.max(1, Math.round(Number(l) || 600)), te = Math.max(1, Math.round(Number(d) || 160));
        A.width = W, A.height = te;
        const Ce = A.getContext("2d");
        if (!Ce) {
          m(new Error("Unable to process image"));
          return;
        }
        Ce.clearRect(0, 0, W, te);
        const me = Math.min(W / I.width, te / I.height), Le = I.width * me, ft = I.height * me, yt = (W - Le) / 2, he = (te - ft) / 2;
        Ce.drawImage(I, yt, he, Le, ft), p(A.toDataURL("image/png"));
      }, I.onerror = () => m(new Error("Unable to decode image file")), I.src = a;
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
          b();
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
          X();
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
          const m = d.getAttribute("data-tab") || "draw", I = d.getAttribute("data-field-id");
          I && et(m, I);
          break;
        }
        case "clear-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && Ge(m);
          break;
        }
        case "undo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && Y(m);
          break;
        }
        case "redo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && ee(m);
          break;
        }
        case "save-current-signature-library": {
          const m = d.getAttribute("data-field-id");
          m && z(m).catch(ne);
          break;
        }
        case "select-saved-signature": {
          const m = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          m && I && oe(m, I).catch(ne);
          break;
        }
        case "delete-saved-signature": {
          const m = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          m && I && O(m, I).catch(ne);
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
          ce(d, p).catch((m) => {
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
          S(d, l.value || ""), h();
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
    const I = n.signerState || "active", A = n.recipientStage || 1, W = n.activeStage || 1, te = n.activeRecipientIds || [], Ce = n.waitingForRecipientIds || [];
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
    switch (I) {
      case "waiting":
        me = {
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
          { icon: "iconoir-users", text: `Stage ${W} active`, variant: "green" }
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
  function G(a) {
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
      const I = ht(a.value);
      I && (p.fullName = I, (r.profileData?.initials || "").trim() || (p.initials = fn(I)));
    }
    if (m === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = ht(a.value);
        I && (p.initials = I);
      }
    }
    if (m === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = ht(a.value);
        I && (p.typedSignature = I);
      }
    }
    if (!(Object.keys(p).length === 1 && p.remember === !0))
      try {
        const I = await o.save(r.profileKey, p);
        r.profileData = I;
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
        const l = await r.pdfDoc.getPage(a), d = r.zoomLevel, p = l.getViewport({ scale: d * window.devicePixelRatio }), m = document.createElement("canvas"), I = m.getContext("2d");
        m.width = p.width, m.height = p.height;
        const A = {
          canvasContext: I,
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
      const m = (await d.json()).assets || {}, I = m.source_url || m.executed_url || m.certificate_url || n.documentUrl;
      if (!I)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const A = pdfjsLib.getDocument(I);
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
      j(l), r.currentPage = a, document.getElementById("current-page").textContent = a, Pe(), ge(), Fe(a);
      return;
    }
    r.pageRendering = !0;
    try {
      const d = await r.pdfDoc.getPage(a), p = r.zoomLevel, m = at(), I = d.getViewport({ scale: p * m }), A = d.getViewport({ scale: 1 });
      f.setPageViewport(a, {
        width: A.width,
        height: A.height,
        rotation: A.rotation || 0
      });
      const W = document.getElementById("pdf-page-1");
      W.innerHTML = "";
      const te = document.createElement("canvas"), Ce = te.getContext("2d");
      te.height = I.height, te.width = I.width, te.style.width = `${I.width / m}px`, te.style.height = `${I.height / m}px`, W.appendChild(te);
      const me = document.getElementById("pdf-container");
      me.style.width = `${I.width / m}px`;
      const Le = {
        canvasContext: Ce,
        viewport: I
      };
      await d.render(Le).promise, r.renderedPages.set(a, {
        canvas: te.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: I.width / m,
        displayHeight: I.height / m
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
  function j(a, l) {
    const d = document.getElementById("pdf-page-1");
    d.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = a.canvas.width, p.height = a.canvas.height, p.style.width = `${a.displayWidth}px`, p.style.height = `${a.displayHeight}px`, p.getContext("2d").drawImage(a.canvas, 0, 0), d.appendChild(p);
    const I = document.getElementById("pdf-container");
    I.style.width = `${a.displayWidth}px`;
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
  function le(a, l, d = !1, p = !1) {
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
      const A = String(d.previewSignatureUrl || "").trim(), W = String(d.signaturePreviewUrl || "").trim(), te = H(d), Ce = d.type === "signature" || d.type === "initials", me = typeof d.previewValueBool == "boolean";
      if (A)
        ae(m, A, Q(d.type), !0);
      else if (d.completed && W)
        ae(m, W, Q(d.type));
      else if (te) {
        const Le = typeof d.previewValueText == "string" && d.previewValueText.trim() !== "";
        le(m, te, Ce, Le);
      } else d.type === "checkbox" && (me ? d.previewValueBool : !!d.value) ? le(m, "Checked", !1, me) : ye(m, Q(d.type));
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
    r.zoomLevel = Math.min(r.zoomLevel + 0.25, 3), x(), F(r.currentPage);
  }
  function v() {
    r.zoomLevel = Math.max(r.zoomLevel - 0.25, 0.5), x(), F(r.currentPage);
  }
  function b() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, d = 612;
    r.zoomLevel = l / d, x(), F(r.currentPage);
  }
  function x() {
    document.getElementById("zoom-level").textContent = `${Math.round(r.zoomLevel * 100)}%`;
  }
  function U(a) {
    if (!r.hasConsented && n.fields.some((l) => l.id === a && l.type !== "date_signed")) {
      Dn();
      return;
    }
    N(a, { openEditor: !0 });
  }
  function N(a, l = { openEditor: !0 }) {
    const d = r.fieldState.get(a);
    if (d) {
      if (l.openEditor && (r.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), d.page !== r.currentPage && xe(d.page), !l.openEditor) {
        q(a);
        return;
      }
      d.type !== "date_signed" && ie(a);
    }
  }
  function q(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function ie(a) {
    const l = r.fieldState.get(a);
    if (!l) return;
    const d = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), m = document.getElementById("field-editor-title"), I = document.getElementById("field-editor-legal-disclaimer");
    m.textContent = re(l.type), p.innerHTML = Ie(l), I?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && Ne(a), d.classList.add("active"), d.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", on(d.querySelector(".field-editor")), ot(`Editing ${re(l.type)}. Press Escape to cancel.`), setTimeout(() => {
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
      const m = a.type === "initials" ? "initials" : "signature", I = St(G(a)), A = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], W = He(a.id);
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
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${m} using mouse or touch</p>
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
    const I = ht(String(l || "").trim());
    if (d?.syncOverlay && (I ? S(a, I) : g(a), h()), !!p) {
      if (I) {
        p.textContent = I;
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
    d === "saved" && P(l).catch(ne);
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
    const I = window.devicePixelRatio || 1;
    l.width = m.width * I, l.height = m.height * I, p.scale(I, I), p.lineCap = "round", p.lineJoin = "round", p.strokeStyle = "#1f2937", p.lineWidth = 2.5;
    let A = !1, W = 0, te = 0, Ce = [];
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
      W = ze.x, te = ze.y, Ce = [{ x: ze.x, y: ze.y, t: ze.timestamp, width: 2.5 }], d && d.classList.add("drawing");
    }, ft = (he) => {
      if (!A) return;
      const ze = me(he);
      Ce.push({ x: ze.x, y: ze.y, t: ze.timestamp, width: 2.5 });
      const Ct = ze.x - W, Lt = ze.y - te, Ri = ze.timestamp - (Ce[Ce.length - 2]?.t || ze.timestamp), $i = Math.sqrt(Ct * Ct + Lt * Lt) / Math.max(Ri, 1), Fi = 2.5, Bi = 1.5, Ui = 4, Hi = Math.min($i / 5, 1), Fn = Math.max(Bi, Math.min(Ui, Fi - Hi * 1.5));
      Ce[Ce.length - 1].width = Fn, p.lineWidth = Fn, p.beginPath(), p.moveTo(W, te), p.lineTo(ze.x, ze.y), p.stroke(), W = ze.x, te = ze.y;
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
      dpr: I,
      drawWidth: m.width,
      drawHeight: m.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), k(a);
  }
  function k(a) {
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
    const { drawWidth: I, drawHeight: A } = p, W = new Image();
    return await new Promise((te) => {
      W.onload = () => {
        d.clearStrokes && (p.strokes = [], p.redoStack = []), p.baseImage = W, p.baseImageDataUrl = m, I > 0 && A > 0 && B(a), te(!0);
      }, W.onerror = () => te(!1), W.src = m;
    });
  }
  function B(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return;
    const { ctx: d, drawWidth: p, drawHeight: m, baseImage: I, strokes: A } = l;
    if (d.clearRect(0, 0, p, m), I) {
      const W = Math.min(p / I.width, m / I.height), te = I.width * W, Ce = I.height * W, me = (p - te) / 2, Le = (m - Ce) / 2;
      d.drawImage(I, me, Le, te, Ce);
    }
    for (const W of A)
      for (let te = 1; te < W.length; te++) {
        const Ce = W[te - 1], me = W[te];
        d.lineWidth = Number(me.width || 2.5) || 2.5, d.beginPath(), d.moveTo(Ce.x, Ce.y), d.lineTo(me.x, me.y), d.stroke();
      }
  }
  function Y(a) {
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
  function K(a) {
    const l = r.signatureCanvases.get(a);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: d, ctx: p } = l;
    return p.getImageData(0, 0, d.width, d.height).data.some((I, A) => A % 4 === 3 && I > 0);
  }
  function Ve(a) {
    const l = r.signatureCanvases.get(a);
    l && (K(a) ? L(a, l.canvas.toDataURL("image/png")) : g(a), h());
  }
  function Ge(a) {
    const l = r.signatureCanvases.get(a);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", B(a)), g(a), h();
    const d = document.getElementById("sig-upload-preview-wrap"), p = document.getElementById("sig-upload-preview");
    d && d.classList.add("hidden"), p && p.removeAttribute("src");
  }
  function X() {
    const a = document.getElementById("field-editor-overlay"), l = a.querySelector(".field-editor");
    if (cn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", r.activeFieldId) {
      const d = document.querySelector(`.field-list-item[data-field-id="${r.activeFieldId}"]`);
      requestAnimationFrame(() => {
        d?.focus();
      });
    }
    y(), h(), r.activeFieldId = null, r.signatureCanvases.clear(), ot("Field editor closed.");
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
    const p = d?.error || {}, m = p?.details && typeof p.details == "object" ? p.details : {}, I = Ee(a, m), A = a?.status === 429, W = A ? I > 0 ? `Too many actions too quickly. Please wait ${I}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(p?.message || l || "Request failed"), te = new Error(W);
    return te.status = a?.status || 0, te.code = String(p?.code || ""), te.details = m, te.rateLimited = A, te.retryAfterSeconds = I, te;
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
        const I = document.getElementById("field-checkbox-input");
        m = await rn(a, null, I?.checked || !1);
      } else {
        const A = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!A && l.required)
          throw new Error("This field is required");
        m = await rn(a, A, null);
      }
      if (m) {
        X(), kn(), _t(), Rn(), ge(), Ei(a), Li(a);
        const I = $n();
        I.allRequiredComplete ? ot("Field saved. All required fields complete. Ready to submit.") : ot(`Field saved. ${I.remainingRequired} required field${I.remainingRequired > 1 ? "s" : ""} remaining.`);
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
      const I = r.signatureCanvases.get(a);
      if (!I) return !1;
      if (!K(a))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const A = I.canvas.toDataURL("image/png");
      return await Pn(a, { type: "drawn", dataUrl: A }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const I = d?.value?.trim();
      if (!I)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await rn(a, I, null) : await Pn(a, { type: "typed", text: I }, I);
    }
  }
  async function rn(a, l, d) {
    r.pendingSaves.add(a);
    const p = Date.now(), m = r.fieldState.get(a);
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
        throw await dt(I, "Failed to save field");
      const A = r.fieldState.get(a);
      return A && (A.value = l ?? d, A.completed = !0, A.hasError = !1), await ve(A), window.toastManager && window.toastManager.success("Field saved"), c.trackFieldSave(a, A?.type, !0, Date.now() - p), !0;
    } catch (I) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = I.message), c.trackFieldSave(a, m?.type, !1, Date.now() - p, I.message), I;
    } finally {
      r.pendingSaves.delete(a);
    }
  }
  async function Pn(a, l, d) {
    r.pendingSaves.add(a);
    const p = Date.now(), m = l?.type || "typed";
    try {
      let I;
      if (m === "drawn") {
        const te = await C.uploadDrawnSignature(
          a,
          l.dataUrl
        );
        I = {
          field_instance_id: a,
          type: "drawn",
          value_text: d,
          object_key: te.objectKey,
          sha256: te.sha256,
          upload_token: te.uploadToken
        };
      } else
        I = await xi(a, d);
      const A = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(I)
      });
      if (!A.ok)
        throw await dt(A, "Failed to save signature");
      const W = r.fieldState.get(a);
      return W && (W.value = d, W.completed = !0, W.hasError = !1, l?.dataUrl && (W.signaturePreviewUrl = l.dataUrl)), await ve(W, {
        signatureType: m,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), c.trackSignatureAttach(a, m, !0, Date.now() - p), !0;
    } catch (I) {
      const A = r.fieldState.get(a);
      throw A && (A.hasError = !0, A.lastError = I.message), c.trackSignatureAttach(a, m, !1, Date.now() - p, I.message), I;
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
    r.fieldState.forEach((W) => {
      W.required, W.completed && a++;
    });
    const l = r.fieldState.size, d = l > 0 ? a / l * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = l;
    const p = document.getElementById("progress-ring-circle"), m = 97.4, I = m - d / 100 * m;
    p.style.strokeDashoffset = I, document.getElementById("mobile-progress").style.width = `${d}%`;
    const A = l - a;
    document.getElementById("fields-status").textContent = A > 0 ? `${A} remaining` : "All complete";
  }
  function _t() {
    const a = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), d = document.getElementById("incomplete-message"), p = pe(r.submitCooldownUntil);
    let m = [], I = !1;
    r.fieldState.forEach((W, te) => {
      W.required && !W.completed && m.push(W), W.hasError && (I = !0);
    });
    const A = r.hasConsented && m.length === 0 && !I && r.pendingSaves.size === 0 && p === 0 && !r.isSubmitting;
    a.disabled = !A, !r.isSubmitting && p > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s` : !r.isSubmitting && p === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), r.hasConsented ? p > 0 ? (l.classList.remove("hidden"), d.textContent = `Please wait ${p}s before submitting again.`) : I ? (l.classList.remove("hidden"), d.textContent = "Some fields failed to save. Please retry.") : m.length > 0 ? (l.classList.remove("hidden"), d.textContent = `Complete ${m.length} required field${m.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), d.textContent = "Please accept the consent agreement");
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
      const I = Number(l.tabIndex || 0), A = Number(d.tabIndex || 0);
      if (I > 0 && A > 0 && I !== A) return I - A;
      if (I > 0 != A > 0) return I > 0 ? -1 : 1;
      const W = Number(l.posY || 0), te = Number(d.posY || 0);
      if (W !== te) return W - te;
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
    const I = Number(m.page || 1);
    I !== r.currentPage && xe(I), N(m.id, { openEditor: !1 }), _n(m.id), setTimeout(() => {
      _n(m.id), q(m.id), c.track("guided_next_completed", { toFieldId: m.id, page: m.page }), ot(`Next required field highlighted on page ${m.page}.`);
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
    function I(A) {
      A.key === "Tab" && (A.shiftKey ? document.activeElement === p && (A.preventDefault(), m?.focus()) : document.activeElement === m && (A.preventDefault(), p?.focus()));
    }
    a.addEventListener("keydown", I), a._focusTrapHandler = I, requestAnimationFrame(() => {
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
    if (a.key === "Escape" && (X(), an(), Mn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), d = l.indexOf(a.target);
      if (d !== -1) {
        let p = d;
        if (a.key === "ArrowRight" && (p = (d + 1) % l.length), a.key === "ArrowLeft" && (p = (d - 1 + l.length) % l.length), a.key === "Home" && (p = 0), a.key === "End" && (p = l.length - 1), p !== d) {
          a.preventDefault();
          const m = l[p], I = m.getAttribute("data-tab") || "draw", A = m.getAttribute("data-field-id");
          A && et(I, A), m.focus();
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
    e && _(e), t && V(t), n && _(n), s && _(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && _(e), t && _(t), n && _(n), s && V(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: o, viewer: c } = this.elements;
    t && _(t), n && _(n), s && V(s), c && _(c), o && (o.textContent = e);
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
  _ as hide,
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
  V as show,
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

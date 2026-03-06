import { e as Re } from "../chunks/html-DyksyvcZ.js";
class wi {
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
      const x = await this.listAgreements({ page: t, per_page: n }), v = x.items || x.records || [];
      if (e.push(...v), v.length === 0 || e.length >= x.total)
        break;
      t += 1;
    }
    const d = {};
    for (const x of e) {
      const v = String(x?.status || "").trim().toLowerCase();
      v && (d[v] = (d[v] || 0) + 1);
    }
    const u = (d.sent || 0) + (d.in_progress || 0), a = u + (d.declined || 0);
    return {
      draft: d.draft || 0,
      sent: d.sent || 0,
      in_progress: d.in_progress || 0,
      completed: d.completed || 0,
      voided: d.voided || 0,
      declined: d.declined || 0,
      expired: d.expired || 0,
      pending: u,
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
      throw new bi(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class bi extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let En = null;
function us() {
  if (!En)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return En;
}
function xi(s) {
  En = s;
}
function Si(s) {
  const e = new wi(s);
  return xi(e), e;
}
function Jt(s) {
  if (s == null || s === "" || s === 0) return "-";
  const e = typeof s == "string" ? parseInt(s, 10) : s;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ps(s) {
  if (!s) return "-";
  const e = typeof s == "string" ? parseInt(s, 10) : s;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Kt(s, e) {
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
function gs(s, e) {
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
function ms(s, e) {
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
function hs(s) {
  if (!s) return "-";
  try {
    const e = s instanceof Date ? s : new Date(s);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), i = Math.round(n / 1e3), d = Math.round(i / 60), u = Math.round(d / 60), a = Math.round(u / 24), x = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(a) >= 1 ? x.format(a, "day") : Math.abs(u) >= 1 ? x.format(u, "hour") : Math.abs(d) >= 1 ? x.format(d, "minute") : x.format(i, "second");
  } catch {
    return String(s);
  }
}
function fs(s) {
  return s == null ? "0 recipients" : s === 1 ? "1 recipient" : `${s} recipients`;
}
function Ii(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
function ys(s) {
  return s ? s.split("_").map((e) => Ii(e)).join(" ") : "";
}
function vs(s, e) {
  return !s || s.length <= e ? s : `${s.slice(0, e - 3)}...`;
}
const Ei = {
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
function On(s) {
  const e = String(s || "").trim().toLowerCase();
  return Ei[e] || {
    label: s || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Ci(s, e) {
  const t = On(s), n = e?.showDot ?? !1, i = e?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, u = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${d[i]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${u}${t.label}</span>`;
}
function ws(s, e) {
  const t = document.createElement("span");
  return t.innerHTML = Ci(s, e), t.firstElementChild;
}
function bs(s, e, t) {
  const n = On(e), i = t?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (s.className = "", s.className = `inline-flex items-center ${d[i]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const x = s.querySelector(".rounded-full");
    if (x)
      x.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const v = document.createElement("span");
      v.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, v.setAttribute("aria-hidden", "true"), s.prepend(v);
    }
  }
  const a = s.childNodes[s.childNodes.length - 1];
  a && a.nodeType === Node.TEXT_NODE ? a.textContent = n.label : s.appendChild(document.createTextNode(n.label));
}
function g(s, e = document) {
  try {
    return e.querySelector(s);
  } catch {
    return null;
  }
}
function nt(s, e = document) {
  try {
    return Array.from(e.querySelectorAll(s));
  } catch {
    return [];
  }
}
function xs(s) {
  return document.getElementById(s);
}
function Li(s, e, t) {
  const n = document.createElement(s);
  if (e)
    for (const [i, d] of Object.entries(e))
      d !== void 0 && n.setAttribute(i, d);
  if (t)
    for (const i of t)
      typeof i == "string" ? n.appendChild(document.createTextNode(i)) : n.appendChild(i);
  return n;
}
function Ss(s, e, t, n) {
  return s.addEventListener(e, t, n), () => s.removeEventListener(e, t, n);
}
function Is(s, e, t, n, i) {
  const d = (u) => {
    const a = u.target.closest(e);
    a && s.contains(a) && n.call(a, u, a);
  };
  return s.addEventListener(t, d, i), () => s.removeEventListener(t, d, i);
}
function W(s) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", s, { once: !0 }) : s();
}
function $(s) {
  s && (s.classList.remove("hidden", "invisible"), s.style.display = "");
}
function k(s) {
  s && s.classList.add("hidden");
}
function Es(s, e) {
  if (!s) return;
  e ?? s.classList.contains("hidden") ? $(s) : k(s);
}
function Cs(s, e, t) {
  s && (e ? (s.setAttribute("aria-busy", "true"), s.classList.add("opacity-50", "pointer-events-none"), (s instanceof HTMLButtonElement || s instanceof HTMLInputElement) && (s.disabled = !0)) : (s.removeAttribute("aria-busy"), s.classList.remove("opacity-50", "pointer-events-none"), (s instanceof HTMLButtonElement || s instanceof HTMLInputElement) && (s.disabled = !1)));
}
function Dt(s, e, t = document) {
  const n = g(`[data-esign-${s}]`, t);
  n && (n.textContent = String(e));
}
function Ls(s, e = document) {
  for (const [t, n] of Object.entries(s))
    Dt(t, n, e);
}
function ki(s = "[data-esign-page]", e = "data-esign-config") {
  const t = g(s);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const i = g(
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
function me(s, e = "polite") {
  const t = g(`[aria-live="${e}"]`) || (() => {
    const n = Li("div", {
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
async function ks(s) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: i = 6e4,
    maxAttempts: d = 30,
    onProgress: u,
    signal: a
  } = s, x = Date.now();
  let v = 0, C;
  for (; v < d; ) {
    if (a?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - x >= i)
      return {
        result: C,
        attempts: v,
        stopped: !1,
        timedOut: !0
      };
    if (v++, C = await e(), u && u(C, v), t(C))
      return {
        result: C,
        attempts: v,
        stopped: !0,
        timedOut: !1
      };
    await Un(n, a);
  }
  return {
    result: C,
    attempts: v,
    stopped: !1,
    timedOut: !1
  };
}
async function Ps(s) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: i = 3e4,
    exponentialBackoff: d = !0,
    shouldRetry: u = () => !0,
    onRetry: a,
    signal: x
  } = s;
  let v;
  for (let C = 1; C <= t; C++) {
    if (x?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (P) {
      if (v = P, C >= t || !u(P, C))
        throw P;
      const H = d ? Math.min(n * Math.pow(2, C - 1), i) : n;
      a && a(P, C, H), await Un(H, x);
    }
  }
  throw v;
}
function Un(s, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const i = setTimeout(t, s);
    if (e) {
      const d = () => {
        clearTimeout(i), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", d, { once: !0 });
    }
  });
}
function Qt(s, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      s(...n), t = null;
    }, e);
  };
}
function As(s, e) {
  let t = 0, n = null;
  return (...i) => {
    const d = Date.now();
    d - t >= e ? (t = d, s(...i)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, s(...i);
      },
      e - (d - t)
    ));
  };
}
function Ts(s) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), s);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function _s(s, e, t = "Operation timed out") {
  let n;
  const i = new Promise((d, u) => {
    n = setTimeout(() => {
      u(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([s, i]);
  } finally {
    clearTimeout(n);
  }
}
class Pn {
  constructor(e) {
    this.config = e, this.client = Si({
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
    Dt('count="draft"', e.draft), Dt('count="pending"', e.pending), Dt('count="completed"', e.completed), Dt('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function $s(s) {
  const e = s || ki(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Pn(e);
  return W(() => t.init()), t;
}
function Ms(s, e) {
  const t = {
    basePath: s,
    apiBasePath: e || `${s}/api`
  }, n = new Pn(t);
  W(() => n.init());
}
typeof document < "u" && W(() => {
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
      const i = String(n.basePath || n.base_path || "/admin"), d = String(
        n.apiBasePath || n.api_base_path || `${i}/api`
      );
      new Pn({ basePath: i, apiBasePath: d }).init();
    }
  }
});
class Vn {
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
    const e = g("#retry-artifacts-btn");
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
      const i = g(`#artifacts-${n}`);
      i && (n === e ? $(i) : k(i));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = g("#artifact-executed"), n = g("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), $(t));
    }
    if (e.source) {
      const t = g("#artifact-source"), n = g("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), $(t));
    }
    if (e.certificate) {
      const t = g("#artifact-certificate"), n = g("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), $(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function Bs(s) {
  const e = new Vn(s);
  return W(() => e.init()), e;
}
function Ds(s) {
  const e = new Vn(s);
  W(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Pi(s = document) {
  nt("[data-size-bytes]", s).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Jt(t));
  });
}
function Ai(s = document) {
  nt("[data-timestamp]", s).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Kt(t));
  });
}
function Ti(s = document) {
  Pi(s), Ai(s);
}
function _i() {
  W(() => {
    Ti();
  });
}
typeof document < "u" && _i();
const Fn = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Gn {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: g("#loading-state"),
      successState: g("#success-state"),
      errorState: g("#error-state"),
      errorMessage: g("#error-message"),
      errorDetail: g("#error-detail"),
      closeBtn: g("#close-btn")
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), i = e.get("error_description"), d = e.get("state"), u = this.parseOAuthState(d);
    u.account_id || (u.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, i, u) : t ? this.handleSuccess(t, u) : this.handleError("unknown", "No authorization code was received from Google.", u);
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
    switch (k(t), k(n), k(i), e) {
      case "loading":
        $(t);
        break;
      case "success":
        $(n);
        break;
      case "error":
        $(i);
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
    const { errorMessage: i, errorDetail: d, closeBtn: u } = this.elements;
    i && (i.textContent = Fn[e] || Fn.unknown), t && d && (d.textContent = t, $(d)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), i = new URLSearchParams(window.location.search), d = i.get("state"), a = this.parseOAuthState(d).account_id || i.get("account_id");
      a && n.searchParams.set("account_id", a), window.location.href = n.toString();
    }
  }
}
function Fs(s) {
  const e = s || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Gn(e);
  return W(() => t.init()), t;
}
function Rs(s) {
  const e = {
    basePath: s,
    apiBasePath: `${s}/api`
  }, t = new Gn(e);
  W(() => t.init());
}
const wn = "esign.google.account_id", $i = {
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
class Wn {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      loadingState: g("#loading-state"),
      disconnectedState: g("#disconnected-state"),
      connectedState: g("#connected-state"),
      errorState: g("#error-state"),
      statusBadge: g("#status-badge"),
      announcements: g("#integration-announcements"),
      accountIdInput: g("#account-id-input"),
      connectBtn: g("#connect-btn"),
      disconnectBtn: g("#disconnect-btn"),
      refreshBtn: g("#refresh-status-btn"),
      retryBtn: g("#retry-btn"),
      reauthBtn: g("#reauth-btn"),
      oauthModal: g("#oauth-modal"),
      oauthCancelBtn: g("#oauth-cancel-btn"),
      disconnectModal: g("#disconnect-modal"),
      disconnectCancelBtn: g("#disconnect-cancel-btn"),
      disconnectConfirmBtn: g("#disconnect-confirm-btn"),
      connectedEmail: g("#connected-email"),
      connectedAccountId: g("#connected-account-id"),
      scopesList: g("#scopes-list"),
      expiryInfo: g("#expiry-info"),
      reauthWarning: g("#reauth-warning"),
      reauthReason: g("#reauth-reason"),
      errorMessage: g("#error-message"),
      degradedWarning: g("#degraded-warning"),
      degradedReason: g("#degraded-reason"),
      importDriveLink: g("#import-drive-link"),
      integrationSettingsLink: g("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: g("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: g("#accounts-section"),
      accountsLoading: g("#accounts-loading"),
      accountsEmpty: g("#accounts-empty"),
      accountsGrid: g("#accounts-grid"),
      connectFirstBtn: g("#connect-first-btn")
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
      reauthBtn: d,
      oauthCancelBtn: u,
      disconnectCancelBtn: a,
      disconnectConfirmBtn: x,
      accountIdInput: v,
      oauthModal: C,
      disconnectModal: P
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), d && d.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, P && $(P);
    }), a && a.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, P && k(P);
    }), x && x.addEventListener("click", () => this.disconnect()), u && u.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), i && i.addEventListener("click", () => this.checkStatus()), v && (v.addEventListener("change", () => {
      this.setCurrentAccountId(v.value, !0);
    }), v.addEventListener("keydown", (D) => {
      D.key === "Enter" && (D.preventDefault(), this.setCurrentAccountId(v.value, !0));
    }));
    const { accountDropdown: H, connectFirstBtn: F } = this.elements;
    H && H.addEventListener("change", () => {
      H.value === "__new__" ? (H.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(H.value, !0);
    }), F && F.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (D) => {
      D.key === "Escape" && (C && !C.classList.contains("hidden") && this.cancelOAuthFlow(), P && !P.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, k(P)));
    }), [C, P].forEach((D) => {
      D && D.addEventListener("click", (z) => {
        const N = z.target;
        (N === D || N.getAttribute("aria-hidden") === "true") && (k(D), D === C ? this.cancelOAuthFlow() : D === P && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(wn)
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
      this.currentAccountId ? window.localStorage.setItem(wn, this.currentAccountId) : window.localStorage.removeItem(wn);
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
    t && (t.textContent = e), me(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: i, errorState: d } = this.elements;
    switch (k(t), k(n), k(i), k(d), e) {
      case "loading":
        $(t);
        break;
      case "disconnected":
        $(n);
        break;
      case "connected":
        $(i);
        break;
      case "error":
        $(d);
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
        let d = `Failed to check status: ${e.status}`;
        try {
          const u = await e.json();
          u?.error?.message && (d = u.error.message);
        } catch {
        }
        throw new Error(d);
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
    const t = (z, N) => {
      for (const U of z)
        if (Object.prototype.hasOwnProperty.call(e, U) && e[U] !== void 0 && e[U] !== null)
          return e[U];
      return N;
    }, n = t(["expires_at", "ExpiresAt"], ""), i = t(["scopes", "Scopes"], []), d = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), u = t(["connected", "Connected"], !1), a = t(["degraded", "Degraded"], !1), x = t(["degraded_reason", "DegradedReason"], ""), v = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), C = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), P = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let H = t(["is_expired", "IsExpired"], void 0), F = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof H != "boolean" || typeof F != "boolean") && n) {
      const z = new Date(n);
      if (!Number.isNaN(z.getTime())) {
        const N = z.getTime() - Date.now(), U = 5 * 60 * 1e3;
        H = N <= 0, F = N > 0 && N <= U;
      }
    }
    const D = typeof P == "boolean" ? P : (H === !0 || F === !0) && !C;
    return {
      connected: u,
      account_id: d,
      email: v,
      scopes: Array.isArray(i) ? i : [],
      expires_at: n,
      is_expired: H === !0,
      is_expiring_soon: F === !0,
      can_auto_refresh: C,
      needs_reauthorization: D,
      degraded: a,
      degraded_reason: x
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: i, expiryInfo: d, reauthWarning: u, reauthReason: a } = this.elements;
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
        const i = $i[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, i, d) {
    const { expiryInfo: u, reauthWarning: a, reauthReason: x } = this.elements;
    if (!u) return;
    if (u.classList.remove("text-red-600", "text-amber-600"), u.classList.add("text-gray-500"), !e) {
      u.textContent = "Access token status unknown", a && k(a);
      return;
    }
    const v = new Date(e), C = /* @__PURE__ */ new Date(), P = Math.max(
      1,
      Math.round((v.getTime() - C.getTime()) / (1e3 * 60))
    );
    t ? i ? (u.textContent = "Access token expired, but refresh is available and will be applied automatically.", u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), a && k(a)) : (u.textContent = "Access token has expired. Please re-authorize.", u.classList.remove("text-gray-500"), u.classList.add("text-red-600"), a && $(a), x && (x.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), i ? (u.textContent = `Token expires in approximately ${P} minute${P !== 1 ? "s" : ""}. Refresh is available automatically.`, a && k(a)) : (u.textContent = `Token expires in approximately ${P} minute${P !== 1 ? "s" : ""}`, a && $(a), x && (x.textContent = `Your access token will expire in ${P} minute${P !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (u.textContent = `Token valid until ${v.toLocaleDateString()} ${v.toLocaleTimeString()}`, a && k(a)), !d && a && k(a);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: i } = this.elements;
    n && (e ? ($(n), i && (i.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : k(n));
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
    for (const d of this.accounts) {
      const u = this.normalizeAccountId(d.account_id);
      if (n.has(u))
        continue;
      n.add(u);
      const a = document.createElement("option");
      a.value = u;
      const x = d.email || u || "Default", v = d.status !== "connected" ? ` (${d.status})` : "";
      a.textContent = `${x}${v}`, u === this.currentAccountId && (a.selected = !0), e.appendChild(a);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const d = document.createElement("option");
      d.value = this.currentAccountId, d.textContent = `${this.currentAccountId} (new)`, d.selected = !0, e.appendChild(d);
    }
    const i = document.createElement("option");
    i.value = "__new__", i.textContent = "+ Connect New Account...", e.appendChild(i);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && k(e), this.accounts.length === 0) {
      t && $(t), n && k(n);
      return;
    }
    t && k(t), n && ($(n), n.innerHTML = this.accounts.map((i) => this.renderAccountCard(i)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, d = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, u = t ? "ring-2 ring-blue-500" : "", a = n[e.status] || "bg-white border-gray-200", x = i[e.status] || "bg-gray-100 text-gray-700", v = d[e.status] || e.status, C = e.account_id || "default", P = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${a} ${u} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(P)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(C)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${x}">
              ${v}
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
      i.addEventListener("click", (d) => {
        const a = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((i) => {
      i.addEventListener("click", (d) => {
        const a = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !1), this.startOAuthFlow(a);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((i) => {
      i.addEventListener("click", (d) => {
        const a = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = a, t && $(t);
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
    t && $(t);
    const i = this.resolveOAuthRedirectURI(), d = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = d;
    const u = this.buildGoogleOAuthUrl(i, d);
    if (!u) {
      t && k(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const a = 500, x = 600, v = (window.screen.width - a) / 2, C = (window.screen.height - x) / 2;
    if (this.oauthWindow = window.open(
      u,
      "google_oauth",
      `width=${a},height=${x},left=${v},top=${C},popup=yes`
    ), !this.oauthWindow) {
      t && k(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (P) => this.handleOAuthCallback(P), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
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
    const n = /* @__PURE__ */ new Set(), i = this.normalizeOrigin(window.location.origin);
    i && n.add(i);
    const d = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    d && n.add(d);
    for (const u of n)
      if (t === u || this.areEquivalentLoopbackOrigins(t, u))
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
    if (this.cleanupOAuthFlow(), n && k(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const i = this.resolveOAuthRedirectURI(), u = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        u !== this.currentAccountId && this.setCurrentAccountId(u, !1);
        const a = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", u),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: u || void 0,
              redirect_uri: i
            })
          }
        );
        if (!a.ok) {
          const x = await a.json();
          throw new Error(x.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (i) {
        console.error("Connect error:", i);
        const d = i instanceof Error ? i.message : "Unknown error";
        this.showToast(`Failed to connect: ${d}`, "error"), this.announce(`Failed to connect: ${d}`);
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
function Hs(s) {
  const e = new Wn(s);
  return W(() => e.init()), e;
}
function js(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    userId: s.userId,
    googleAccountId: s.googleAccountId,
    googleRedirectUri: s.googleRedirectUri,
    googleClientId: s.googleClientId,
    googleEnabled: s.googleEnabled !== !1
  }, t = new Wn(e);
  W(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const bn = "esign.google.account_id", Rn = {
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
class Jn {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: g("#drive-search"),
      clearSearchBtn: g("#clear-search-btn"),
      fileList: g("#file-list"),
      loadingState: g("#loading-state"),
      breadcrumb: g("#breadcrumb"),
      listTitle: g("#list-title"),
      resultCount: g("#result-count"),
      pagination: g("#pagination"),
      loadMoreBtn: g("#load-more-btn"),
      refreshBtn: g("#refresh-btn"),
      announcements: g("#drive-announcements"),
      accountScopeHelp: g("#account-scope-help"),
      connectGoogleLink: g("#connect-google-link"),
      noSelection: g("#no-selection"),
      filePreview: g("#file-preview"),
      previewIcon: g("#preview-icon"),
      previewTitle: g("#preview-title"),
      previewType: g("#preview-type"),
      previewFileId: g("#preview-file-id"),
      previewOwner: g("#preview-owner"),
      previewLocation: g("#preview-location"),
      previewModified: g("#preview-modified"),
      importBtn: g("#import-btn"),
      openInGoogleBtn: g("#open-in-google-btn"),
      clearSelectionBtn: g("#clear-selection-btn"),
      importModal: g("#import-modal"),
      importForm: g("#import-form"),
      importGoogleFileId: g("#import-google-file-id"),
      importDocumentTitle: g("#import-document-title"),
      importAgreementTitle: g("#import-agreement-title"),
      importCancelBtn: g("#import-cancel-btn"),
      importConfirmBtn: g("#import-confirm-btn"),
      importSpinner: g("#import-spinner"),
      importBtnText: g("#import-btn-text"),
      viewListBtn: g("#view-list-btn"),
      viewGridBtn: g("#view-grid-btn")
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
      importBtn: d,
      clearSelectionBtn: u,
      importCancelBtn: a,
      importConfirmBtn: x,
      importForm: v,
      importModal: C,
      viewListBtn: P,
      viewGridBtn: H
    } = this.elements;
    if (e) {
      const D = Qt(() => this.handleSearch(), 300);
      e.addEventListener("input", D), e.addEventListener("keydown", (z) => {
        z.key === "Enter" && (z.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), i && i.addEventListener("click", () => this.loadMore()), d && d.addEventListener("click", () => this.showImportModal()), u && u.addEventListener("click", () => this.clearSelection()), a && a.addEventListener("click", () => this.hideImportModal()), x && v && v.addEventListener("submit", (D) => {
      D.preventDefault(), this.handleImport();
    }), C && C.addEventListener("click", (D) => {
      const z = D.target;
      (z === C || z.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), P && P.addEventListener("click", () => this.setViewMode("list")), H && H.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (D) => {
      D.key === "Escape" && C && !C.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: F } = this.elements;
    F && F.addEventListener("click", (D) => this.handleFileListClick(D));
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
        window.localStorage.getItem(bn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : k(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(bn, this.currentAccountId) : window.localStorage.removeItem(bn);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), i = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), u = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), x = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], C = Array.isArray(e.owners) ? e.owners : x ? [{ emailAddress: x }] : [];
    return {
      id: t,
      name: n,
      mimeType: i,
      modifiedTime: d,
      webViewLink: u,
      parents: v,
      owners: C,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && $(t));
    try {
      const i = this.currentFolderPath[this.currentFolderPath.length - 1];
      let d;
      this.searchQuery ? d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(i.id)}`
      ), this.nextPageToken && (d += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const u = await fetch(d, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!u.ok)
        throw new Error(`Failed to load files: ${u.status}`);
      const a = await u.json(), x = Array.isArray(a.files) ? a.files.map((v) => this.normalizeDriveFile(v)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...x] : this.currentFiles = x, this.nextPageToken = a.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), me(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (i) {
      console.error("Error loading files:", i), this.renderError(i instanceof Error ? i.message : "Failed to load files"), me("Error loading files");
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
    const n = this.currentFiles.map((i) => this.renderFileItem(i)).join("");
    e.innerHTML = n;
  }
  /**
   * Render a single file item
   */
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Hn.includes(e.mimeType), i = this.selectedFile?.id === e.id, d = Rn[e.mimeType] || Rn.default, u = this.getFileIcon(d);
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
          ${u}
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
    const i = n.dataset.fileId, d = n.dataset.isFolder === "true";
    i && (d ? this.navigateToFolder(i) : this.selectFile(i));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), me(`Selected: ${t.name}`));
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
      previewType: d,
      previewFileId: u,
      previewOwner: a,
      previewModified: x,
      importBtn: v,
      openInGoogleBtn: C
    } = this.elements;
    if (!this.selectedFile) {
      e && $(e), t && k(t);
      return;
    }
    e && k(e), t && $(t);
    const P = this.selectedFile, H = Hn.includes(P.mimeType);
    i && (i.textContent = P.name), d && (d.textContent = this.getMimeTypeLabel(P.mimeType)), u && (u.textContent = P.id), a && P.owners.length > 0 && (a.textContent = P.owners[0].emailAddress || "-"), x && (x.textContent = Kt(P.modifiedTime)), v && (H ? (v.removeAttribute("disabled"), v.classList.remove("opacity-50", "cursor-not-allowed")) : (v.setAttribute("disabled", "true"), v.classList.add("opacity-50", "cursor-not-allowed"))), C && P.webViewLink && (C.href = P.webViewLink);
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
    $(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const i = e.querySelector("ol");
    i && (i.innerHTML = this.currentFolderPath.map(
      (d, u) => `
        <li class="flex items-center">
          ${u > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(d.id)}"
            data-folder-index="${u}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(d.name)}
          </button>
        </li>
      `
    ).join(""), nt(".breadcrumb-item", i).forEach((d) => {
      d.addEventListener("click", () => {
        const u = parseInt(d.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(u);
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
    e && (this.nextPageToken ? $(e) : k(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? $(t) : k(t)), this.clearSelection(), this.loadFiles();
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
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: n, importAgreementTitle: i } = this.elements;
    if (t && (t.value = this.selectedFile.id), n) {
      const d = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = d;
    }
    i && (i.value = ""), e && $(e);
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
      importDocumentTitle: i,
      importAgreementTitle: d
    } = this.elements, u = this.selectedFile.id, a = i?.value.trim() || this.selectedFile.name, x = d?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && $(t), n && (n.textContent = "Importing...");
    try {
      const v = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: u,
          document_title: a,
          agreement_title: x || void 0
        })
      });
      if (!v.ok) {
        const P = await v.json();
        throw new Error(P.error?.message || "Import failed");
      }
      const C = await v.json();
      this.showToast("Import started successfully", "success"), me("Import started"), this.hideImportModal(), C.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${C.document.id}` : C.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${C.agreement.id}`);
    } catch (v) {
      console.error("Import error:", v);
      const C = v instanceof Error ? v.message : "Import failed";
      this.showToast(C, "error"), me(`Error: ${C}`);
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
function qs(s) {
  const e = new Jn(s);
  return W(() => e.init()), e;
}
function zs(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    userId: s.userId,
    googleAccountId: s.googleAccountId,
    googleConnected: s.googleConnected !== !1,
    pickerRoutes: s.pickerRoutes
  }, t = new Jn(e);
  W(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class Yn {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: g("#time-range"),
      providerFilter: g("#provider-filter"),
      refreshBtn: g("#refresh-btn"),
      healthScore: g("#health-score"),
      healthIndicator: g("#health-indicator"),
      healthTrend: g("#health-trend"),
      syncSuccessRate: g("#sync-success-rate"),
      syncSuccessCount: g("#sync-success-count"),
      syncFailedCount: g("#sync-failed-count"),
      syncSuccessBar: g("#sync-success-bar"),
      conflictCount: g("#conflict-count"),
      conflictPending: g("#conflict-pending"),
      conflictResolved: g("#conflict-resolved"),
      conflictTrend: g("#conflict-trend"),
      syncLag: g("#sync-lag"),
      lagStatus: g("#lag-status"),
      lastSync: g("#last-sync"),
      retryTotal: g("#retry-total"),
      retryRecovery: g("#retry-recovery"),
      retryAvg: g("#retry-avg"),
      retryList: g("#retry-list"),
      providerHealthTable: g("#provider-health-table"),
      alertsList: g("#alerts-list"),
      noAlerts: g("#no-alerts"),
      alertCount: g("#alert-count"),
      activityFeed: g("#activity-feed"),
      syncChartCanvas: g("#sync-chart-canvas"),
      conflictChartCanvas: g("#conflict-chart-canvas")
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
      const d = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      d.searchParams.set("range", n), i && d.searchParams.set("provider", i);
      const u = await fetch(d.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!u.ok)
        this.healthData = this.generateMockHealthData(n, i);
      else {
        const a = await u.json();
        this.healthData = a;
      }
      this.renderHealthData(), me("Health data refreshed");
    } catch (d) {
      console.error("Failed to load health data:", d), this.healthData = this.generateMockHealthData(n, i), this.renderHealthData();
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
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((u) => ({
        provider: u,
        status: u === "workday" ? "degraded" : "healthy",
        successRate: u === "workday" ? 89.2 : 97 + Math.random() * 3,
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
    for (let d = 0; d < e; d++) {
      const u = n[Math.floor(Math.random() * n.length)], a = i[Math.floor(Math.random() * i.length)];
      t.push({
        type: u,
        provider: a,
        message: this.getActivityMessage(u, a),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: u.includes("failed") || u.includes("created") ? "warning" : "success"
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
    const n = [], i = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, d = /* @__PURE__ */ new Date();
    for (let u = e - 1; u >= 0; u--) {
      const a = new Date(d.getTime() - u * 36e5);
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
      const d = i.healthTrend >= 0 ? "+" : "";
      n.textContent = `${d}${i.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: i } = this.elements, d = this.healthData.syncStats;
    e && (e.textContent = `${d.successRate.toFixed(1)}%`), t && (t.textContent = `${d.succeeded} succeeded`), n && (n.textContent = `${d.failed} failed`), i && (i.style.width = `${d.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: i } = this.elements, d = this.healthData.conflictStats;
    if (e && (e.textContent = String(d.pending)), t && (t.textContent = `${d.pending} pending`), n && (n.textContent = `${d.resolvedToday} resolved today`), i) {
      const u = d.trend >= 0 ? "+" : "";
      i.textContent = `${u}${d.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: i } = this.elements, d = this.healthData.retryStats;
    e && (e.textContent = String(d.total)), t && (t.textContent = `${d.recoveryRate}%`), n && (n.textContent = d.avgAttempts.toFixed(1)), i && (i.innerHTML = d.recent.map(
      (u) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(u.provider)} / ${this.escapeHtml(u.entity)}</span>
            <span class="${u.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(u.time)}</span>
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
      i.addEventListener("click", (d) => this.dismissAlert(d));
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
    const { alertsList: i, noAlerts: d, alertCount: u } = this.elements, a = i?.querySelectorAll(":scope > div").length || 0;
    u && (u.textContent = `${a} active`, a === 0 && (u.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", i && i.classList.add("hidden"), d && d.classList.remove("hidden")));
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
    const d = document.getElementById(e);
    if (!d) return;
    const u = d.getContext("2d");
    if (!u) return;
    const a = d.width, x = d.height, v = 40, C = a - v * 2, P = x - v * 2;
    u.clearRect(0, 0, a, x);
    const H = t.labels, F = Object.values(t.datasets), D = C / H.length / (F.length + 1), z = Math.max(...F.flat()) || 1;
    H.forEach((N, U) => {
      const X = v + U * C / H.length + D / 2;
      F.forEach((se, ce) => {
        const fe = se[U] / z * P, Ye = X + ce * D, _e = x - v - fe;
        u.fillStyle = n[ce] || "#6b7280", u.fillRect(Ye, _e, D - 2, fe);
      }), U % Math.ceil(H.length / 6) === 0 && (u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "center", u.fillText(N, X + F.length * D / 2, x - v + 15));
    }), u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "right";
    for (let N = 0; N <= 4; N++) {
      const U = x - v - N * P / 4, X = Math.round(z * N / 4);
      u.fillText(X.toString(), v - 5, U + 3);
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
function Ns(s) {
  const e = new Yn(s);
  return W(() => e.init()), e;
}
function Os(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    autoRefreshInterval: s.autoRefreshInterval || 3e4
  }, t = new Yn(e);
  W(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class Kn {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: g("#mappings-announcements"),
      loadingState: g("#loading-state"),
      emptyState: g("#empty-state"),
      errorState: g("#error-state"),
      mappingsList: g("#mappings-list"),
      mappingsTbody: g("#mappings-tbody"),
      searchInput: g("#search-mappings"),
      filterStatus: g("#filter-status"),
      filterProvider: g("#filter-provider"),
      refreshBtn: g("#refresh-btn"),
      retryBtn: g("#retry-btn"),
      errorMessage: g("#error-message"),
      createMappingBtn: g("#create-mapping-btn"),
      createMappingEmptyBtn: g("#create-mapping-empty-btn"),
      mappingModal: g("#mapping-modal"),
      mappingModalTitle: g("#mapping-modal-title"),
      closeModalBtn: g("#close-modal-btn"),
      cancelModalBtn: g("#cancel-modal-btn"),
      mappingForm: g("#mapping-form"),
      mappingIdInput: g("#mapping-id"),
      mappingVersionInput: g("#mapping-version"),
      mappingNameInput: g("#mapping-name"),
      mappingProviderInput: g("#mapping-provider"),
      schemaObjectTypeInput: g("#schema-object-type"),
      schemaVersionInput: g("#schema-version"),
      schemaFieldsContainer: g("#schema-fields-container"),
      addFieldBtn: g("#add-field-btn"),
      mappingRulesContainer: g("#mapping-rules-container"),
      addRuleBtn: g("#add-rule-btn"),
      validateBtn: g("#validate-btn"),
      saveBtn: g("#save-btn"),
      formValidationStatus: g("#form-validation-status"),
      mappingStatusBadge: g("#mapping-status-badge"),
      publishModal: g("#publish-modal"),
      publishMappingName: g("#publish-mapping-name"),
      publishMappingVersion: g("#publish-mapping-version"),
      publishCancelBtn: g("#publish-cancel-btn"),
      publishConfirmBtn: g("#publish-confirm-btn"),
      deleteModal: g("#delete-modal"),
      deleteCancelBtn: g("#delete-cancel-btn"),
      deleteConfirmBtn: g("#delete-confirm-btn"),
      previewModal: g("#preview-modal"),
      closePreviewBtn: g("#close-preview-btn"),
      previewMappingName: g("#preview-mapping-name"),
      previewMappingProvider: g("#preview-mapping-provider"),
      previewObjectType: g("#preview-object-type"),
      previewMappingStatus: g("#preview-mapping-status"),
      previewSourceInput: g("#preview-source-input"),
      sourceSyntaxError: g("#source-syntax-error"),
      loadSampleBtn: g("#load-sample-btn"),
      runPreviewBtn: g("#run-preview-btn"),
      clearPreviewBtn: g("#clear-preview-btn"),
      previewEmpty: g("#preview-empty"),
      previewLoading: g("#preview-loading"),
      previewError: g("#preview-error"),
      previewErrorMessage: g("#preview-error-message"),
      previewSuccess: g("#preview-success"),
      previewParticipants: g("#preview-participants"),
      participantsCount: g("#participants-count"),
      previewFields: g("#preview-fields"),
      fieldsCount: g("#fields-count"),
      previewMetadata: g("#preview-metadata"),
      previewRawJson: g("#preview-raw-json"),
      previewRulesTbody: g("#preview-rules-tbody")
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
      refreshBtn: d,
      retryBtn: u,
      addFieldBtn: a,
      addRuleBtn: x,
      validateBtn: v,
      mappingForm: C,
      publishCancelBtn: P,
      publishConfirmBtn: H,
      deleteCancelBtn: F,
      deleteConfirmBtn: D,
      closePreviewBtn: z,
      loadSampleBtn: N,
      runPreviewBtn: U,
      clearPreviewBtn: X,
      previewSourceInput: se,
      searchInput: ce,
      filterStatus: fe,
      filterProvider: Ye,
      mappingModal: _e,
      publishModal: He,
      deleteModal: Ue,
      previewModal: K
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), i?.addEventListener("click", () => this.closeModal()), d?.addEventListener("click", () => this.loadMappings()), u?.addEventListener("click", () => this.loadMappings()), a?.addEventListener("click", () => this.addSchemaField()), x?.addEventListener("click", () => this.addMappingRule()), v?.addEventListener("click", () => this.validateMapping()), C?.addEventListener("submit", (le) => {
      le.preventDefault(), this.saveMapping();
    }), P?.addEventListener("click", () => this.closePublishModal()), H?.addEventListener("click", () => this.publishMapping()), F?.addEventListener("click", () => this.closeDeleteModal()), D?.addEventListener("click", () => this.deleteMapping()), z?.addEventListener("click", () => this.closePreviewModal()), N?.addEventListener("click", () => this.loadSamplePayload()), U?.addEventListener("click", () => this.runPreviewTransform()), X?.addEventListener("click", () => this.clearPreview()), se?.addEventListener("input", Qt(() => this.validateSourceJson(), 300)), ce?.addEventListener("input", Qt(() => this.renderMappings(), 300)), fe?.addEventListener("change", () => this.renderMappings()), Ye?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (le) => {
      le.key === "Escape" && (_e && !_e.classList.contains("hidden") && this.closeModal(), He && !He.classList.contains("hidden") && this.closePublishModal(), Ue && !Ue.classList.contains("hidden") && this.closeDeleteModal(), K && !K.classList.contains("hidden") && this.closePreviewModal());
    }), [_e, He, Ue, K].forEach((le) => {
      le?.addEventListener("click", ($e) => {
        const it = $e.target;
        (it === le || it.getAttribute("aria-hidden") === "true") && (le === _e ? this.closeModal() : le === He ? this.closePublishModal() : le === Ue ? this.closeDeleteModal() : le === K && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), me(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: i, mappingsList: d } = this.elements;
    switch (k(t), k(n), k(i), k(d), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(i);
        break;
      case "list":
        $(d);
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
    const d = (t?.value || "").toLowerCase(), u = n?.value || "", a = i?.value || "", x = this.mappings.filter((v) => !(d && !v.name.toLowerCase().includes(d) && !v.provider.toLowerCase().includes(d) || u && v.status !== u || a && v.provider !== a));
    if (x.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = x.map(
      (v) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(v.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(v.compiled_hash ? v.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(v.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(v.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${v.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(v.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(v.id)}" aria-label="Preview ${this.escapeHtml(v.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(v.id)}" aria-label="Edit ${this.escapeHtml(v.name)}">
              Edit
            </button>
            ${v.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(v.id)}" aria-label="Publish ${this.escapeHtml(v.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(v.id)}" aria-label="Delete ${this.escapeHtml(v.name)}">
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
      schemaObjectTypeInput: d,
      schemaVersionInput: u,
      schemaFieldsContainer: a,
      mappingRulesContainer: x
    } = this.elements, v = [];
    a?.querySelectorAll(".schema-field-row").forEach((P) => {
      v.push({
        object: (P.querySelector(".field-object")?.value || "").trim(),
        field: (P.querySelector(".field-name")?.value || "").trim(),
        type: P.querySelector(".field-type")?.value || "string",
        required: P.querySelector(".field-required")?.checked || !1
      });
    });
    const C = [];
    return x?.querySelectorAll(".mapping-rule-row").forEach((P) => {
      C.push({
        source_object: (P.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (P.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: P.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (P.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: i?.value.trim() || "",
      external_schema: {
        object_type: d?.value.trim() || "",
        version: u?.value.trim() || void 0,
        fields: v
      },
      rules: C
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
      mappingProviderInput: d,
      schemaObjectTypeInput: u,
      schemaVersionInput: a,
      schemaFieldsContainer: x,
      mappingRulesContainer: v,
      mappingStatusBadge: C,
      formValidationStatus: P
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), i && (i.value = e.name || ""), d && (d.value = e.provider || "");
    const H = e.external_schema || { object_type: "", fields: [] };
    u && (u.value = H.object_type || ""), a && (a.value = H.version || ""), x && (x.innerHTML = "", (H.fields || []).forEach((F) => x.appendChild(this.createSchemaFieldRow(F)))), v && (v.innerHTML = "", (e.rules || []).forEach((F) => v.appendChild(this.createMappingRuleRow(F)))), e.status && C ? (C.innerHTML = this.getStatusBadge(e.status), C.classList.remove("hidden")) : C && C.classList.add("hidden"), k(P);
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
      mappingRulesContainer: d,
      mappingStatusBadge: u,
      formValidationStatus: a
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), i && (i.innerHTML = ""), d && (d.innerHTML = ""), u && u.classList.add("hidden"), k(a), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), $(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((u) => u.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: i, mappingNameInput: d } = this.elements;
    this.editingMappingId = e, i && (i.textContent = "Edit Mapping Specification"), this.populateForm(t), $(n), d?.focus();
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
    const t = this.mappings.find((u) => u.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: i, publishMappingVersion: d } = this.elements;
    this.pendingPublishId = e, i && (i.textContent = t.name), d && (d.textContent = `v${t.version || 1}`), $(n);
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
    this.pendingDeleteId = e, $(this.elements.deleteModal);
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
      const i = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...n, validate_only: !0 })
      }), d = await i.json();
      if (i.ok && d.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((d.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const u = d.errors || [d.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${u.map((a) => `<li>${this.escapeHtml(a)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      $(t);
    } catch (i) {
      console.error("Validation error:", i), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(i instanceof Error ? i.message : "Unknown error")}</div>`, $(t));
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
      const n = !!t.id, i = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, u = await fetch(i, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!u.ok) {
        const a = await u.json();
        throw new Error(a.error?.message || `HTTP ${u.status}`);
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
    const t = this.mappings.find((C) => C.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: i,
      previewMappingProvider: d,
      previewObjectType: u,
      previewMappingStatus: a,
      previewSourceInput: x,
      sourceSyntaxError: v
    } = this.elements;
    this.currentPreviewMapping = t, i && (i.textContent = t.name), d && (d.textContent = t.provider), u && (u.textContent = t.external_schema?.object_type || "-"), a && (a.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), x && (x.value = ""), k(v), $(n), x?.focus();
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
    const { previewEmpty: t, previewLoading: n, previewError: i, previewSuccess: d } = this.elements;
    switch (k(t), k(n), k(i), k(d), e) {
      case "empty":
        $(t);
        break;
      case "loading":
        $(n);
        break;
      case "error":
        $(i);
        break;
      case "success":
        $(d);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, i = n.object_type || "data", d = n.fields || [], u = {}, a = {};
    d.forEach((x) => {
      const v = x.field || "field";
      switch (x.type) {
        case "string":
          a[v] = v === "email" ? "john.doe@example.com" : v === "name" ? "John Doe" : `sample_${v}`;
          break;
        case "number":
          a[v] = 123;
          break;
        case "boolean":
          a[v] = !0;
          break;
        case "date":
          a[v] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          a[v] = `sample_${v}`;
      }
    }), u[i] = a, e && (e.value = JSON.stringify(u, null, 2)), k(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return k(t), null;
    try {
      const i = JSON.parse(n);
      return k(t), i;
    } catch (i) {
      return t && (t.textContent = `JSON Syntax Error: ${i instanceof Error ? i.message : "Invalid JSON"}`, $(t)), null;
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
    }, d = {}, u = {}, a = [];
    return n.forEach((x) => {
      const v = this.resolveSourceValue(e, x.source_object, x.source_field), C = v !== void 0;
      if (i.matched_rules.push({
        source: x.source_field,
        matched: C,
        value: v
      }), !!C)
        switch (x.target_entity) {
          case "participant":
            d[x.target_path] = v;
            break;
          case "agreement":
            u[x.target_path] = v;
            break;
          case "field_definition":
            a.push({ path: x.target_path, value: v });
            break;
        }
    }), Object.keys(d).length > 0 && i.participants.push({
      ...d,
      role: d.role || "signer",
      signing_stage: d.signing_stage || 1
    }), i.agreement = u, i.field_definitions = a, i;
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
          const d = e[i];
          if (n in d)
            return d[n];
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
      fieldsCount: d,
      previewMetadata: u,
      previewRawJson: a,
      previewRulesTbody: x
    } = this.elements, v = e.participants || [];
    n && (n.textContent = `(${v.length})`), t && (v.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = v.map(
      (F) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(F.name || F.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(F.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(F.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(F.role))}</span>
              <span class="text-xs text-gray-500">Stage ${F.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const C = e.field_definitions || [];
    d && (d.textContent = `(${C.length})`), i && (C.length === 0 ? i.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : i.innerHTML = C.map(
      (F) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(F.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(F.value))}</span>
          </div>
        `
    ).join(""));
    const P = e.agreement || {}, H = Object.entries(P);
    u && (H.length === 0 ? u.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : u.innerHTML = H.map(
      ([F, D]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(F)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(D))}</span>
          </div>
        `
    ).join("")), a && (a.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((F) => {
      const D = x?.querySelector(`[data-rule-source="${this.escapeHtml(F.source)}"] span`);
      D && (F.matched ? (D.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", D.textContent = "Matched") : (D.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", D.textContent = "Not Found"));
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
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
}
function Us(s) {
  const e = new Kn(s);
  return W(() => e.init()), e;
}
function Vs(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new Kn(e);
  W(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class Qn {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: g("#conflicts-announcements"),
      loadingState: g("#loading-state"),
      emptyState: g("#empty-state"),
      errorState: g("#error-state"),
      conflictsList: g("#conflicts-list"),
      errorMessage: g("#error-message"),
      refreshBtn: g("#refresh-btn"),
      retryBtn: g("#retry-btn"),
      filterStatus: g("#filter-status"),
      filterProvider: g("#filter-provider"),
      filterEntity: g("#filter-entity"),
      statPending: g("#stat-pending"),
      statResolved: g("#stat-resolved"),
      statIgnored: g("#stat-ignored"),
      conflictDetailModal: g("#conflict-detail-modal"),
      closeDetailBtn: g("#close-detail-btn"),
      detailReason: g("#detail-reason"),
      detailEntityType: g("#detail-entity-type"),
      detailStatusBadge: g("#detail-status-badge"),
      detailProvider: g("#detail-provider"),
      detailExternalId: g("#detail-external-id"),
      detailInternalId: g("#detail-internal-id"),
      detailBindingId: g("#detail-binding-id"),
      detailPayload: g("#detail-payload"),
      resolutionSection: g("#resolution-section"),
      detailResolvedAt: g("#detail-resolved-at"),
      detailResolvedBy: g("#detail-resolved-by"),
      detailResolution: g("#detail-resolution"),
      detailConflictId: g("#detail-conflict-id"),
      detailRunId: g("#detail-run-id"),
      detailCreatedAt: g("#detail-created-at"),
      detailVersion: g("#detail-version"),
      actionButtons: g("#action-buttons"),
      actionResolveBtn: g("#action-resolve-btn"),
      actionIgnoreBtn: g("#action-ignore-btn"),
      resolveModal: g("#resolve-modal"),
      resolveForm: g("#resolve-form"),
      cancelResolveBtn: g("#cancel-resolve-btn"),
      submitResolveBtn: g("#submit-resolve-btn"),
      resolutionAction: g("#resolution-action")
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
      filterProvider: d,
      filterEntity: u,
      actionResolveBtn: a,
      actionIgnoreBtn: x,
      cancelResolveBtn: v,
      resolveForm: C,
      conflictDetailModal: P,
      resolveModal: H
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), i?.addEventListener("change", () => this.loadConflicts()), d?.addEventListener("change", () => this.renderConflicts()), u?.addEventListener("change", () => this.renderConflicts()), a?.addEventListener("click", () => this.openResolveModal("resolved")), x?.addEventListener("click", () => this.openResolveModal("ignored")), v?.addEventListener("click", () => this.closeResolveModal()), C?.addEventListener("submit", (F) => this.submitResolution(F)), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && (H && !H.classList.contains("hidden") ? this.closeResolveModal() : P && !P.classList.contains("hidden") && this.closeConflictDetail());
    }), [P, H].forEach((F) => {
      F?.addEventListener("click", (D) => {
        const z = D.target;
        (z === F || z.getAttribute("aria-hidden") === "true") && (F === P ? this.closeConflictDetail() : F === H && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), me(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: i, conflictsList: d } = this.elements;
    switch (k(t), k(n), k(i), k(d), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(i);
        break;
      case "list":
        $(d);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, i = this.conflicts.filter((a) => a.status === "pending").length, d = this.conflicts.filter((a) => a.status === "resolved").length, u = this.conflicts.filter((a) => a.status === "ignored").length;
    e && (e.textContent = String(i)), t && (t.textContent = String(d)), n && (n.textContent = String(u));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: i } = this.elements;
    if (!e) return;
    const d = t?.value || "", u = n?.value || "", a = i?.value || "", x = this.conflicts.filter((v) => !(d && v.status !== d || u && v.provider !== u || a && v.entity_kind !== a));
    if (x.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = x.map(
      (v) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(v.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${v.status === "pending" ? "bg-amber-100" : v.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${v.status === "pending" ? "text-amber-600" : v.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(v.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(v.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(v.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((v.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(v.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(v.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((v) => {
      v.addEventListener("click", () => this.openConflictDetail(v.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((fe) => fe.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: i,
      detailEntityType: d,
      detailStatusBadge: u,
      detailProvider: a,
      detailExternalId: x,
      detailInternalId: v,
      detailBindingId: C,
      detailConflictId: P,
      detailRunId: H,
      detailCreatedAt: F,
      detailVersion: D,
      detailPayload: z,
      resolutionSection: N,
      actionButtons: U,
      detailResolvedAt: X,
      detailResolvedBy: se,
      detailResolution: ce
    } = this.elements;
    if (i && (i.textContent = t.reason || "Data conflict"), d && (d.textContent = t.entity_kind || "-"), u && (u.innerHTML = this.getStatusBadge(t.status)), a && (a.textContent = t.provider || "-"), x && (x.textContent = t.external_id || "-"), v && (v.textContent = t.internal_id || "-"), C && (C.textContent = t.binding_id || "-"), P && (P.textContent = t.id), H && (H.textContent = t.run_id || "-"), F && (F.textContent = this.formatDate(t.created_at)), D && (D.textContent = String(t.version || 1)), z)
      try {
        const fe = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        z.textContent = JSON.stringify(fe, null, 2);
      } catch {
        z.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if ($(N), k(U), X && (X.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), se && (se.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), ce)
        try {
          const fe = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          ce.textContent = JSON.stringify(fe, null, 2);
        } catch {
          ce.textContent = t.resolution_json || "{}";
        }
    } else
      k(N), $(U);
    $(n);
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
    const { resolveModal: t, resolveForm: n, resolutionAction: i } = this.elements;
    n?.reset(), i && (i.value = e), $(t);
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
    const i = new FormData(t);
    let d = {};
    const u = i.get("resolution");
    if (u)
      try {
        d = JSON.parse(u);
      } catch {
        d = { raw: u };
      }
    const a = i.get("notes");
    a && (d.notes = a);
    const x = {
      status: i.get("status"),
      resolution: d
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const v = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(x)
      });
      if (!v.ok) {
        const C = await v.json();
        throw new Error(C.error?.message || `HTTP ${v.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (v) {
      console.error("Resolution error:", v);
      const C = v instanceof Error ? v.message : "Unknown error";
      this.showToast(`Failed: ${C}`, "error");
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
function Gs(s) {
  const e = new Qn(s);
  return W(() => e.init()), e;
}
function Ws(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new Qn(e);
  W(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class Xn {
  constructor(e) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: g("#sync-announcements"),
      loadingState: g("#loading-state"),
      emptyState: g("#empty-state"),
      errorState: g("#error-state"),
      runsTimeline: g("#runs-timeline"),
      errorMessage: g("#error-message"),
      refreshBtn: g("#refresh-btn"),
      retryBtn: g("#retry-btn"),
      filterProvider: g("#filter-provider"),
      filterStatus: g("#filter-status"),
      filterDirection: g("#filter-direction"),
      statTotal: g("#stat-total"),
      statRunning: g("#stat-running"),
      statCompleted: g("#stat-completed"),
      statFailed: g("#stat-failed"),
      startSyncBtn: g("#start-sync-btn"),
      startSyncEmptyBtn: g("#start-sync-empty-btn"),
      startSyncModal: g("#start-sync-modal"),
      startSyncForm: g("#start-sync-form"),
      cancelSyncBtn: g("#cancel-sync-btn"),
      submitSyncBtn: g("#submit-sync-btn"),
      syncMappingSelect: g("#sync-mapping"),
      runDetailModal: g("#run-detail-modal"),
      closeDetailBtn: g("#close-detail-btn"),
      detailRunId: g("#detail-run-id"),
      detailProvider: g("#detail-provider"),
      detailDirection: g("#detail-direction"),
      detailStatus: g("#detail-status"),
      detailStarted: g("#detail-started"),
      detailCompleted: g("#detail-completed"),
      detailCursor: g("#detail-cursor"),
      detailAttempt: g("#detail-attempt"),
      detailErrorSection: g("#detail-error-section"),
      detailLastError: g("#detail-last-error"),
      detailCheckpoints: g("#detail-checkpoints"),
      actionResumeBtn: g("#action-resume-btn"),
      actionRetryBtn: g("#action-retry-btn"),
      actionCompleteBtn: g("#action-complete-btn"),
      actionFailBtn: g("#action-fail-btn"),
      actionDiagnosticsBtn: g("#action-diagnostics-btn")
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
      refreshBtn: d,
      retryBtn: u,
      closeDetailBtn: a,
      filterProvider: x,
      filterStatus: v,
      filterDirection: C,
      actionResumeBtn: P,
      actionRetryBtn: H,
      actionCompleteBtn: F,
      actionFailBtn: D,
      actionDiagnosticsBtn: z,
      startSyncModal: N,
      runDetailModal: U
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), i?.addEventListener("submit", (X) => this.startSync(X)), d?.addEventListener("click", () => this.loadSyncRuns()), u?.addEventListener("click", () => this.loadSyncRuns()), a?.addEventListener("click", () => this.closeRunDetail()), x?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), C?.addEventListener("change", () => this.renderTimeline()), P?.addEventListener("click", () => this.runAction("resume")), H?.addEventListener("click", () => this.runAction("resume")), F?.addEventListener("click", () => this.runAction("complete")), D?.addEventListener("click", () => this.runAction("fail")), z?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (X) => {
      X.key === "Escape" && (N && !N.classList.contains("hidden") && this.closeStartSyncModal(), U && !U.classList.contains("hidden") && this.closeRunDetail());
    }), [N, U].forEach((X) => {
      X?.addEventListener("click", (se) => {
        const ce = se.target;
        (ce === X || ce.getAttribute("aria-hidden") === "true") && (X === N ? this.closeStartSyncModal() : X === U && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), me(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: i, runsTimeline: d } = this.elements;
    switch (k(t), k(n), k(i), k(d), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(i);
        break;
      case "list":
        $(d);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: i } = this.elements, d = this.syncRuns.length, u = this.syncRuns.filter(
      (v) => v.status === "running" || v.status === "pending"
    ).length, a = this.syncRuns.filter((v) => v.status === "completed").length, x = this.syncRuns.filter((v) => v.status === "failed").length;
    e && (e.textContent = String(d)), t && (t.textContent = String(u)), n && (n.textContent = String(a)), i && (i.textContent = String(x));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const i = t?.value || "", d = n?.value || "", u = this.syncRuns.filter((a) => !(i && a.status !== i || d && a.direction !== d));
    if (u.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = u.map(
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
    t?.reset(), $(e), document.getElementById("sync-provider")?.focus();
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
    const i = new FormData(t), d = {
      provider: i.get("provider"),
      direction: i.get("direction"),
      mapping_spec_id: i.get("mapping_spec_id"),
      cursor: i.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const u = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(d)
      });
      if (!u.ok) {
        const a = await u.json();
        throw new Error(a.error?.message || `HTTP ${u.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (u) {
      console.error("Start sync error:", u);
      const a = u instanceof Error ? u.message : "Unknown error";
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
    const t = this.syncRuns.find((se) => se.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: i,
      detailProvider: d,
      detailDirection: u,
      detailStatus: a,
      detailStarted: x,
      detailCompleted: v,
      detailCursor: C,
      detailAttempt: P,
      detailErrorSection: H,
      detailLastError: F,
      detailCheckpoints: D,
      actionResumeBtn: z,
      actionRetryBtn: N,
      actionCompleteBtn: U,
      actionFailBtn: X
    } = this.elements;
    i && (i.textContent = t.id), d && (d.textContent = t.provider), u && (u.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), a && (a.innerHTML = this.getStatusBadge(t.status)), x && (x.textContent = this.formatDate(t.started_at)), v && (v.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), C && (C.textContent = t.cursor || "-"), P && (P.textContent = String(t.attempt_count || 1)), t.last_error ? (F && (F.textContent = t.last_error), $(H)) : k(H), z && z.classList.toggle("hidden", t.status !== "running"), N && N.classList.toggle("hidden", t.status !== "failed"), U && U.classList.toggle("hidden", t.status !== "running"), X && X.classList.toggle("hidden", t.status !== "running"), D && (D.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), $(n);
    try {
      const se = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (se.ok) {
        const ce = await se.json();
        this.renderCheckpoints(ce.checkpoints || []);
      } else
        D && (D.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (se) {
      console.error("Error loading checkpoints:", se), D && (D.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    k(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: i, actionFailBtn: d } = this.elements, u = e === "resume" ? t : e === "complete" ? i : d, a = e === "resume" ? n : null;
    if (!u) return;
    u.setAttribute("disabled", "true"), a?.setAttribute("disabled", "true");
    const x = u.innerHTML;
    u.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const v = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, C = await fetch(v, {
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
      if (!C.ok) {
        const P = await C.json();
        throw new Error(P.error?.message || `HTTP ${C.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (v) {
      console.error(`${e} error:`, v);
      const C = v instanceof Error ? v.message : "Unknown error";
      this.showToast(`Failed: ${C}`, "error");
    } finally {
      u.removeAttribute("disabled"), a?.removeAttribute("disabled"), u.innerHTML = x;
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
function Js(s) {
  const e = new Xn(s);
  return W(() => e.init()), e;
}
function Ys(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new Xn(e);
  W(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const xn = "esign.google.account_id", Mi = 25 * 1024 * 1024, Bi = 2e3, jn = 60, Cn = "application/vnd.google-apps.document", Ln = "application/pdf", qn = "application/vnd.google-apps.folder", Di = [Cn, Ln];
class An {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || Mi, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      // Upload panel
      form: g("#document-upload-form"),
      fileInput: g("#pdf_file"),
      uploadZone: g("#pdf-upload-zone"),
      placeholder: g("#upload-placeholder"),
      preview: g("#upload-preview"),
      fileName: g("#selected-file-name"),
      fileSize: g("#selected-file-size"),
      clearBtn: g("#clear-file-btn"),
      errorEl: g("#upload-error"),
      submitBtn: g("#submit-btn"),
      titleInput: g("#title"),
      sourceObjectKeyInput: g("#source_object_key"),
      // Source tabs
      sourceTabs: nt(".source-tab"),
      sourcePanels: nt(".source-panel"),
      announcements: g("#doc-announcements"),
      // Google Drive panel
      searchInput: g("#drive-search"),
      clearSearchBtn: g("#clear-search-btn"),
      fileList: g("#file-list"),
      loadingState: g("#loading-state"),
      breadcrumb: g("#breadcrumb"),
      listTitle: g("#list-title"),
      resultCount: g("#result-count"),
      pagination: g("#pagination"),
      loadMoreBtn: g("#load-more-btn"),
      refreshBtn: g("#refresh-btn"),
      driveAccountDropdown: g("#drive-account-dropdown"),
      accountScopeHelp: g("#account-scope-help"),
      connectGoogleLink: g("#connect-google-link"),
      // Selection panel
      noSelection: g("#no-selection"),
      filePreview: g("#file-preview"),
      previewIcon: g("#preview-icon"),
      previewTitle: g("#preview-title"),
      previewType: g("#preview-type"),
      importTypeInfo: g("#import-type-info"),
      importTypeLabel: g("#import-type-label"),
      importTypeDesc: g("#import-type-desc"),
      snapshotWarning: g("#snapshot-warning"),
      importDocumentTitle: g("#import-document-title"),
      importBtn: g("#import-btn"),
      importBtnText: g("#import-btn-text"),
      clearSelectionBtn: g("#clear-selection-btn"),
      // Import status
      importStatus: g("#import-status"),
      importStatusQueued: g("#import-status-queued"),
      importStatusSuccess: g("#import-status-success"),
      importStatusFailed: g("#import-status-failed"),
      importStatusMessage: g("#import-status-message"),
      importErrorMessage: g("#import-error-message"),
      importRetryBtn: g("#import-retry-btn"),
      importReconnectLink: g("#import-reconnect-link")
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
      titleInput: d
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), i && i.addEventListener("click", (u) => {
      u.preventDefault(), u.stopPropagation(), this.clearFileSelection();
    }), d && d.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((u) => {
      n.addEventListener(u, (a) => {
        a.preventDefault(), a.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((u) => {
      n.addEventListener(u, (a) => {
        a.preventDefault(), a.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (u) => {
      const a = u.dataTransfer;
      a?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = a.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (u) => {
      (u.key === "Enter" || u.key === " ") && (u.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (u) => this.handleFormSubmit(u));
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
      clearSelectionBtn: d,
      importBtn: u,
      importRetryBtn: a,
      driveAccountDropdown: x
    } = this.elements;
    if (e) {
      const v = Qt(() => this.handleSearch(), 300);
      e.addEventListener("input", v);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), i && i.addEventListener("click", () => this.refreshFiles()), x && x.addEventListener("change", () => {
      this.setCurrentAccountId(x.value, this.currentSource === "google");
    }), d && d.addEventListener("click", () => this.clearFileSelection()), u && u.addEventListener("click", () => this.startImport()), a && a.addEventListener("click", () => {
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
        window.localStorage.getItem(xn)
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
      const { searchInput: i, clearSearchBtn: d } = this.elements;
      i && (i.value = ""), d && k(d), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const d = this.normalizeAccountId(i?.account_id);
      if (n.has(d))
        continue;
      n.add(d);
      const u = document.createElement("option");
      u.value = d;
      const a = String(i?.email || "").trim(), x = String(i?.status || "").trim(), v = a || d || "Default account";
      u.textContent = x && x !== "connected" ? `${v} (${x})` : v, d === this.currentAccountId && (u.selected = !0), e.appendChild(u);
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
      this.currentAccountId ? window.localStorage.setItem(xn, this.currentAccountId) : window.localStorage.removeItem(xn);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : k(e)), t) {
      const i = t.dataset.baseHref || t.getAttribute("href");
      i && t.setAttribute("href", this.applyAccountIdToPath(i));
    }
    n && (Array.from(n.options).some(
      (d) => this.normalizeAccountId(d.value) === this.currentAccountId
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
      n.id.replace("panel-", "") === e ? $(n) : k(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), me(
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
        const d = i.name.replace(/\.pdf$/i, "");
        t.value = d;
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
      `File is too large (${Jt(e.size)}). Maximum size is ${Jt(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: i, fileSize: d, uploadZone: u } = this.elements;
    i && (i.textContent = e.name), d && (d.textContent = Jt(e.size)), t && k(t), n && $(n), u && (u.classList.remove("border-gray-300"), u.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && $(e), t && k(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, $(t));
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
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, i = e?.files && e.files.length > 0, d = t?.value.trim().length ?? !1, u = i && d;
    n && (n.disabled = !u, n.setAttribute("aria-disabled", String(!u)));
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), i = t.get("org_id"), d = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && d.searchParams.set("tenant_id", n), i && d.searchParams.set("org_id", i);
    const u = new FormData();
    u.append("file", e);
    const a = await fetch(d.toString(), {
      method: "POST",
      body: u,
      credentials: "same-origin"
    }), x = await a.json().catch(() => ({}));
    if (!a.ok) {
      const C = x?.error?.message || x?.message || "Upload failed. Please try again.";
      throw new Error(C);
    }
    const v = x?.object_key ? String(x.object_key).trim() : "";
    if (!v)
      throw new Error("Upload failed: missing source object key.");
    return v;
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: i } = this.elements, d = t?.files?.[0];
    if (!(!d || !this.validateFile(d))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const u = await this.uploadSourcePDF(d);
        i && (i.value = u), n?.submit();
      } catch (u) {
        const a = u instanceof Error ? u.message : "Upload failed. Please try again.";
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), i = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), u = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), x = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], C = Array.isArray(e.owners) ? e.owners : x ? [{ emailAddress: x }] : [];
    return {
      id: t,
      name: n,
      mimeType: i,
      modifiedTime: d,
      webViewLink: u,
      parents: v,
      owners: C
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === Cn;
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
    return e.mimeType === qn;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Di.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Cn ? "Google Document" : t === Ln ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === qn ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: i, append: d } = e, { fileList: u } = this.elements;
    !d && u && (u.innerHTML = `
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
      const x = await fetch(a.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), v = await x.json();
      if (!x.ok)
        throw new Error(v.error?.message || "Failed to load files");
      const C = Array.isArray(v.files) ? v.files.map((D) => this.normalizeDriveFile(D)) : [];
      this.nextPageToken = v.next_page_token || null, d ? this.currentFiles = [...this.currentFiles, ...C] : this.currentFiles = C, this.renderFiles(d);
      const { resultCount: P, listTitle: H } = this.elements;
      n && P ? (P.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, H && (H.textContent = "Search Results")) : (P && (P.textContent = ""), H && (H.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: F } = this.elements;
      F && (this.nextPageToken ? $(F) : k(F)), me(`Loaded ${C.length} files`);
    } catch (a) {
      console.error("Error loading files:", a), u && (u.innerHTML = `
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
        `), me(`Error: ${a instanceof Error ? a.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((i, d) => {
      const u = this.getFileIcon(i), a = this.isImportable(i), x = this.isFolder(i), v = this.selectedFile && this.selectedFile.id === i.id, C = !a && !x;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${v ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${C ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${v}"
          data-file-index="${d}"
          ${C ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${u.bg} flex items-center justify-center flex-shrink-0 ${u.text}">
            ${u.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(i.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(i.mimeType)}
              ${i.modifiedTime ? " • " + Kt(i.modifiedTime) : ""}
              ${C ? " • Not importable" : ""}
            </p>
          </div>
          ${x ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((i) => {
      i.addEventListener("click", () => {
        const d = parseInt(i.dataset.fileIndex || "0", 10), u = this.currentFiles[d];
        this.isFolder(u) ? this.navigateToFolder(u) : this.isImportable(u) && this.selectFile(u);
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
    $(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, i) => {
      const d = i === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${i > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${i}" class="breadcrumb-item ${d ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const i = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, i + 1), this.updateBreadcrumb();
        const d = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: d.id });
      });
    }));
  }
  /**
   * Select a file
   */
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: i } = this.elements;
    i && i.querySelectorAll(".file-item").forEach((N) => {
      const U = parseInt(N.dataset.fileIndex || "0", 10);
      this.currentFiles[U].id === e.id ? (N.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), N.setAttribute("aria-selected", "true")) : (N.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), N.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: d,
      filePreview: u,
      importStatus: a,
      previewIcon: x,
      previewTitle: v,
      previewType: C,
      importTypeInfo: P,
      importTypeLabel: H,
      importTypeDesc: F,
      snapshotWarning: D,
      importDocumentTitle: z
    } = this.elements;
    d && k(d), u && $(u), a && k(a), x && (x.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, x.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), v && (v.textContent = e.name || "Untitled"), C && (C.textContent = this.getFileTypeName(e.mimeType)), n && P && (P.className = `p-3 rounded-lg border ${n.bgClass}`, H && (H.textContent = n.label, H.className = `text-xs font-medium ${n.textClass}`), F && (F.textContent = n.desc, F.className = `text-xs mt-1 ${n.textClass}`), D && (n.showSnapshot ? $(D) : k(D))), z && (z.value = e.name || ""), me(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: i } = this.elements;
    e && $(e), t && k(t), n && k(n), i && i.querySelectorAll(".file-item").forEach((d) => {
      d.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), d.setAttribute("aria-selected", "false");
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
      t && $(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && k(t), this.searchQuery = "";
      const i = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: i.id });
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
      importStatus: i,
      importStatusQueued: d,
      importStatusSuccess: u,
      importStatusFailed: a
    } = this.elements;
    switch (t && k(t), n && k(n), i && $(i), d && k(d), u && k(u), a && k(a), e) {
      case "queued":
      case "running":
        d && $(d);
        break;
      case "succeeded":
        u && $(u);
        break;
      case "failed":
        a && $(a);
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
        const d = this.config.routes.integrations || "/admin/esign/integrations/google";
        i.href = this.applyAccountIdToPath(d), $(i);
      } else
        k(i);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: i } = this.elements;
    if (!this.selectedFile || !e) return;
    const d = e.value.trim();
    if (!d) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), i && k(i), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("import_run_id"), window.history.replaceState({}, "", u.toString());
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
            document_title: d
          })
        }
      ), x = await a.json();
      if (!a.ok) {
        const C = x.error?.code || "";
        throw { message: x.error?.message || "Failed to start import", code: C };
      }
      this.currentImportRunId = x.import_run_id, this.pollAttempts = 0;
      const v = new URL(window.location.href);
      this.currentImportRunId && v.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", v.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (u) {
      console.error("Import error:", u);
      const a = u;
      this.showImportError(a.message || "Failed to start import", a.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Bi);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > jn) {
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
            this.showImportStatus("succeeded"), me("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const d = n.error?.code || "", u = n.error?.message || "Import failed";
            this.showImportError(u, d), me("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < jn ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function Ks(s) {
  const e = new An(s);
  return W(() => e.init()), e;
}
function Qs(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api/v1`,
    userId: s.userId,
    googleEnabled: s.googleEnabled !== !1,
    googleConnected: s.googleConnected !== !1,
    googleAccountId: s.googleAccountId,
    maxFileSize: s.maxFileSize,
    routes: s.routes
  }, t = new An(e);
  W(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Fi(s) {
  const e = String(s.basePath || s.base_path || "").trim(), t = s.routes && typeof s.routes == "object" ? s.routes : {}, n = s.features && typeof s.features == "object" ? s.features : {}, i = s.context && typeof s.context == "object" ? s.context : {}, d = String(t.index || "").trim();
  return !e && !d ? null : {
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
      index: d,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && W(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Fi(t);
        n && new An(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
function Ri(s = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = s || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, i = n.replace(/\/+$/, ""), d = /\/v\d+$/i.test(i) ? i : `${i}/v1`, u = `${d}/esign/drafts`, a = !!e.is_edit, x = !!e.create_success, v = String(e.user_id || "").trim(), C = String(e.submit_mode || "form").trim().toLowerCase(), P = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, H = Array.isArray(e.initial_participants) ? e.initial_participants : [], F = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function D(l) {
    if (!v) return l;
    const o = l.includes("?") ? "&" : "?";
    return `${l}${o}user_id=${encodeURIComponent(v)}`;
  }
  function z(l = !0) {
    const o = { Accept: "application/json" };
    return l && (o["Content-Type"] = "application/json"), v && (o["X-User-ID"] = v), o;
  }
  const N = 1, U = "esign_wizard_state_v1", X = "esign_wizard_sync", se = 2e3, ce = [1e3, 2e3, 5e3, 1e4, 3e4];
  class fe {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.state = this.loadFromSession() || this.createInitialState();
    }
    createInitialState() {
      return {
        wizardId: this.generateWizardId(),
        version: N,
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
        const o = sessionStorage.getItem(U);
        if (!o) return null;
        const m = JSON.parse(o);
        return m.version !== N ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(m)) : (Array.isArray(m.fieldRules) || (m.fieldRules = []), m);
      } catch (o) {
        return console.error("Failed to load wizard state from session:", o), null;
      }
    }
    migrateState(o) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(U, JSON.stringify(this.state));
      } catch (o) {
        console.error("Failed to save wizard state to session:", o);
      }
    }
    getState() {
      return this.state;
    }
    updateState(o) {
      this.state = { ...this.state, ...o, syncPending: !0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, this.saveToSession(), this.notifyListeners();
    }
    updateStep(o) {
      this.updateState({ currentStep: o });
    }
    updateDocument(o) {
      this.updateState({ document: { ...this.state.document, ...o } });
    }
    updateDetails(o) {
      this.updateState({ details: { ...this.state.details, ...o } });
    }
    updateParticipants(o) {
      this.updateState({ participants: o });
    }
    updateFieldDefinitions(o) {
      this.updateState({ fieldDefinitions: o });
    }
    updateFieldPlacements(o) {
      this.updateState({ fieldPlacements: o });
    }
    markSynced(o, m) {
      this.state.serverDraftId = o, this.state.serverRevision = m, this.state.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.syncPending = !1, this.saveToSession(), this.notifyListeners();
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(U), this.notifyListeners();
    }
    hasResumableState() {
      return this.state ? this.state.currentStep > 1 || this.state.document.id !== null || this.state.participants.length > 0 || this.state.details.title.trim() !== "" : !1;
    }
    onStateChange(o) {
      return this.listeners.push(o), () => {
        this.listeners = this.listeners.filter((m) => m !== o);
      };
    }
    notifyListeners() {
      this.listeners.forEach((o) => o(this.state));
    }
    collectFormState() {
      const o = document.getElementById("document_id")?.value || null, m = document.getElementById("selected-document-title")?.textContent?.trim() || null, f = document.getElementById("title"), w = document.getElementById("message"), S = [];
      document.querySelectorAll(".participant-entry").forEach((M) => {
        const B = M.getAttribute("data-participant-id"), q = M.querySelector('input[name*=".name"]')?.value || "", G = M.querySelector('input[name*=".email"]')?.value || "", Y = M.querySelector('select[name*=".role"]')?.value || "signer", Z = parseInt(M.querySelector(".signing-stage-input")?.value || "1", 10);
        S.push({ tempId: B, name: q, email: G, role: Y, signingStage: Z });
      });
      const E = [];
      document.querySelectorAll(".field-definition-entry").forEach((M) => {
        const B = M.getAttribute("data-field-definition-id"), q = M.querySelector(".field-type-select")?.value || "signature", G = M.querySelector(".field-participant-select")?.value || "", Y = parseInt(M.querySelector('input[name*=".page"]')?.value || "1", 10), Z = M.querySelector('input[name*=".required"]')?.checked ?? !0;
        E.push({ tempId: B, type: q, participantTempId: G, page: Y, required: Z });
      });
      const T = Me(), L = parseInt(je?.value || "0", 10) || null;
      return {
        document: { id: o, title: m, pageCount: L },
        details: {
          title: f?.value || "",
          message: w?.value || ""
        },
        participants: S,
        fieldDefinitions: E,
        fieldPlacements: A?.fieldInstances || [],
        fieldRules: T
      };
    }
    restoreFormState() {
      const o = this.state;
      if (!o) return;
      if (o.document.id) {
        const w = document.getElementById("document_id"), S = document.getElementById("selected-document"), E = document.getElementById("document-picker"), T = document.getElementById("selected-document-title"), L = document.getElementById("selected-document-info");
        w && (w.value = o.document.id), T && (T.textContent = o.document.title || "Selected Document"), L && (L.textContent = o.document.pageCount ? `${o.document.pageCount} pages` : ""), je && o.document.pageCount && (je.value = String(o.document.pageCount)), S && S.classList.remove("hidden"), E && E.classList.add("hidden");
      }
      const m = document.getElementById("title"), f = document.getElementById("message");
      m && o.details.title && (m.value = o.details.title), f && o.details.message && (f.value = o.details.message);
    }
  }
  class Ye {
    constructor(o) {
      this.stateManager = o, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(o) {
      const m = {
        wizard_id: o.wizardId,
        wizard_state: o,
        title: o.details.title || "Untitled Agreement",
        current_step: o.currentStep,
        document_id: o.document.id || null,
        created_by_user_id: v
      }, f = await fetch(D(u), {
        method: "POST",
        credentials: "same-origin",
        headers: z(),
        body: JSON.stringify(m)
      });
      if (!f.ok) {
        const w = await f.json().catch(() => ({}));
        throw new Error(w.error?.message || `HTTP ${f.status}`);
      }
      return f.json();
    }
    async update(o, m, f) {
      const w = {
        expected_revision: f,
        wizard_state: m,
        title: m.details.title || "Untitled Agreement",
        current_step: m.currentStep,
        document_id: m.document.id || null,
        updated_by_user_id: v
      }, S = await fetch(D(`${u}/${o}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: z(),
        body: JSON.stringify(w)
      });
      if (S.status === 409) {
        const E = await S.json().catch(() => ({})), T = new Error("stale_revision");
        throw T.code = "stale_revision", T.currentRevision = E.error?.details?.current_revision, T;
      }
      if (!S.ok) {
        const E = await S.json().catch(() => ({}));
        throw new Error(E.error?.message || `HTTP ${S.status}`);
      }
      return S.json();
    }
    async load(o) {
      const m = await fetch(D(`${u}/${o}`), {
        credentials: "same-origin",
        headers: z(!1)
      });
      if (!m.ok)
        throw new Error(`HTTP ${m.status}`);
      return m.json();
    }
    async delete(o) {
      const m = await fetch(D(`${u}/${o}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: z(!1)
      });
      if (!m.ok && m.status !== 404)
        throw new Error(`HTTP ${m.status}`);
    }
    async list() {
      const o = await fetch(D(`${u}?limit=10`), {
        credentials: "same-origin",
        headers: z(!1)
      });
      if (!o.ok)
        throw new Error(`HTTP ${o.status}`);
      return o.json();
    }
    async sync() {
      const o = this.stateManager.getState();
      if (o.syncPending)
        try {
          let m;
          return o.serverDraftId ? m = await this.update(o.serverDraftId, o, o.serverRevision) : m = await this.create(o), this.stateManager.markSynced(m.id, m.revision), this.retryCount = 0, { success: !0, result: m };
        } catch (m) {
          return m.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: m.currentRevision } : { success: !1, error: m.message };
        }
    }
  }
  class _e {
    constructor(o, m, f) {
      this.stateManager = o, this.syncService = m, this.statusUpdater = f, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(X), this.channel.onmessage = (o) => this.handleChannelMessage(o.data), this.channel.postMessage({ type: "presence", tabId: this.getTabId() });
        } catch (o) {
          console.warn("BroadcastChannel not available:", o);
        }
    }
    getTabId() {
      return window._wizardTabId || (window._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`), window._wizardTabId;
    }
    handleChannelMessage(o) {
      switch (o.type) {
        case "presence":
          o.tabId !== this.getTabId() && this.channel?.postMessage({ type: "ownership_claim", tabId: this.getTabId() });
          break;
        case "ownership_claim":
          this.isOwner = !1;
          break;
        case "state_updated":
          if (o.tabId !== this.getTabId()) {
            const m = this.stateManager.loadFromSession();
            m && (this.stateManager.state = m, this.stateManager.notifyListeners());
          }
          break;
        case "sync_completed":
          o.tabId !== this.getTabId() && o.draftId && o.revision && this.stateManager.markSynced(o.draftId, o.revision);
          break;
      }
    }
    broadcastStateUpdate() {
      this.channel?.postMessage({
        type: "state_updated",
        tabId: this.getTabId()
      });
    }
    broadcastSyncCompleted(o, m) {
      this.channel?.postMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: o,
        revision: m
      });
    }
    initEventListeners() {
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && this.forceSync({ keepalive: !0 });
      }), window.addEventListener("pagehide", () => {
        this.forceSync({ keepalive: !0 });
      }), window.addEventListener("beforeunload", () => {
        this.forceSync({ keepalive: !0 });
      });
    }
    scheduleSync() {
      this.debounceTimer && clearTimeout(this.debounceTimer), this.statusUpdater("pending"), this.debounceTimer = setTimeout(() => {
        this.performSync();
      }, se);
    }
    async forceSync(o = {}) {
      this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
      const m = o && o.keepalive === !0, f = this.stateManager.getState();
      if (!m) {
        await this.performSync();
        return;
      }
      if (f.syncPending && f.serverDraftId) {
        const w = JSON.stringify({
          expected_revision: f.serverRevision,
          wizard_state: f,
          title: f.details.title || "Untitled Agreement",
          current_step: f.currentStep,
          document_id: f.document.id || null,
          updated_by_user_id: v
        });
        try {
          const S = await fetch(D(`${u}/${f.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: z(),
            body: w,
            keepalive: !0
          });
          if (S.status === 409) {
            const M = await S.json().catch(() => ({})), B = Number(M?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(B > 0 ? B : f.serverRevision);
            return;
          }
          if (!S.ok)
            throw new Error(`HTTP ${S.status}`);
          const E = await S.json().catch(() => ({})), T = String(E?.id || E?.draft_id || f.serverDraftId || "").trim(), L = Number(E?.revision || 0);
          if (T && Number.isFinite(L) && L > 0) {
            this.stateManager.markSynced(T, L), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(T, L);
            return;
          }
        } catch {
        }
      }
      await this.performSync();
    }
    async performSync() {
      if (this.isSyncing || !this.isOwner) return;
      if (!this.stateManager.getState().syncPending) {
        this.statusUpdater("saved");
        return;
      }
      this.isSyncing = !0, this.statusUpdater("saving");
      const m = await this.syncService.sync();
      this.isSyncing = !1, m.success ? (this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(m.result.id, m.result.revision)) : m.conflict ? (this.statusUpdater("conflict"), this.showConflictDialog(m.currentRevision)) : (this.statusUpdater("error"), this.scheduleRetry());
    }
    scheduleRetry() {
      if (this.retryCount >= ce.length) {
        console.error("Max sync retries reached");
        return;
      }
      const o = ce[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, o);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(o) {
      const m = document.getElementById("conflict-dialog-modal"), f = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = He(f.updatedAt), document.getElementById("conflict-server-revision").textContent = o, document.getElementById("conflict-server-time").textContent = "newer version", m?.classList.remove("hidden");
    }
  }
  function He(l) {
    if (!l) return "unknown";
    const o = new Date(l), f = /* @__PURE__ */ new Date() - o, w = Math.floor(f / 6e4), S = Math.floor(f / 36e5), E = Math.floor(f / 864e5);
    return w < 1 ? "just now" : w < 60 ? `${w} minute${w !== 1 ? "s" : ""} ago` : S < 24 ? `${S} hour${S !== 1 ? "s" : ""} ago` : E < 7 ? `${E} day${E !== 1 ? "s" : ""} ago` : o.toLocaleDateString();
  }
  function Ue(l) {
    const o = document.getElementById("sync-status-indicator"), m = document.getElementById("sync-status-icon"), f = document.getElementById("sync-status-text"), w = document.getElementById("sync-retry-btn");
    if (!(!o || !m || !f))
      switch (o.classList.remove("hidden"), l) {
        case "saved":
          m.className = "w-2 h-2 rounded-full bg-green-500", f.textContent = "Saved", f.className = "text-gray-600", w?.classList.add("hidden");
          break;
        case "saving":
          m.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", f.textContent = "Saving...", f.className = "text-gray-600", w?.classList.add("hidden");
          break;
        case "pending":
          m.className = "w-2 h-2 rounded-full bg-gray-400", f.textContent = "Unsaved changes", f.className = "text-gray-500", w?.classList.add("hidden");
          break;
        case "error":
          m.className = "w-2 h-2 rounded-full bg-amber-500", f.textContent = "Not synced", f.className = "text-amber-600", w?.classList.remove("hidden");
          break;
        case "conflict":
          m.className = "w-2 h-2 rounded-full bg-red-500", f.textContent = "Conflict", f.className = "text-red-600", w?.classList.add("hidden");
          break;
        default:
          o.classList.add("hidden");
      }
  }
  const K = new fe(), le = new Ye(K), $e = new _e(K, le, Ue);
  if (x) {
    const o = K.getState()?.serverDraftId;
    K.clear(), $e.broadcastStateUpdate(), o && le.delete(o).catch((m) => {
      console.warn("Failed to delete server draft after successful create:", m);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    $e.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const l = K.getState();
    if (l.serverDraftId)
      try {
        const o = await le.load(l.serverDraftId);
        o.wizard_state && (K.state = { ...o.wizard_state, serverDraftId: o.id, serverRevision: o.revision }, K.saveToSession(), window.location.reload());
      } catch (o) {
        console.error("Failed to load server draft:", o);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const l = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    K.state.serverRevision = l, K.state.syncPending = !0, K.saveToSession(), $e.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function it() {
    const l = document.getElementById("resume-dialog-modal"), o = K.getState();
    document.getElementById("resume-draft-title").textContent = o.details.title || "Untitled Agreement", document.getElementById("resume-draft-step").textContent = o.currentStep, document.getElementById("resume-draft-time").textContent = He(o.updatedAt), l?.classList.remove("hidden");
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), K.restoreFormState(), window._resumeToStep = K.getState().currentStep;
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), K.clear();
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", async () => {
    const l = K.getState();
    if (l.serverDraftId)
      try {
        await le.delete(l.serverDraftId);
      } catch (o) {
        console.warn("Failed to delete server draft:", o);
      }
    K.clear(), document.getElementById("resume-dialog-modal")?.classList.add("hidden");
  }), !a && K.hasResumableState() && it();
  function st() {
    const l = K.collectFormState();
    K.updateState(l), $e.scheduleSync(), $e.broadcastStateUpdate();
  }
  const xe = document.getElementById("document_id"), ht = document.getElementById("selected-document"), ft = document.getElementById("document-picker"), yt = document.getElementById("document-search"), Ke = document.getElementById("document-list"), vt = document.getElementById("change-document-btn"), Qe = document.getElementById("selected-document-title"), Xe = document.getElementById("selected-document-info"), je = document.getElementById("document_page_count");
  let Ve = [];
  function wt(l) {
    const o = parseInt(l || "0", 10), m = Number.isFinite(o) && o > 0 ? o : 0;
    je && (je.value = String(m));
  }
  function Zt() {
    const l = (xe?.value || "").trim();
    if (!l) return;
    const o = Ve.find((m) => String(m.id || "").trim() === l);
    o && (Qe.textContent.trim() || (Qe.textContent = o.title || "Untitled"), (!Xe.textContent.trim() || Xe.textContent.trim() === "pages") && (Xe.textContent = `${o.page_count || 0} pages`), wt(o.page_count || 0), ht.classList.remove("hidden"), ft.classList.add("hidden"));
  }
  async function en() {
    try {
      const l = await fetch(`${n}/panels/esign_documents?per_page=100`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!l.ok)
        throw await At(l, "Failed to load documents");
      const o = await l.json();
      Ve = o.records || o.items || [], Ze(Ve), Zt();
    } catch (l) {
      const o = ke(l?.message || "Failed to load documents", l?.code || "", l?.status || 0);
      Ke.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${Ee(o)}</div>`;
    }
  }
  function Ze(l) {
    if (l.length === 0) {
      Ke.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${Ee(P)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    Ke.innerHTML = l.map((m, f) => `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${f === 0 ? "0" : "-1"}"
              data-document-id="${m.id}"
              data-document-title="${Ee(m.title || "Untitled")}"
              data-document-pages="${m.page_count || 0}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${Ee(m.title || "Untitled")}</div>
          <div class="text-xs text-gray-500">${m.page_count || 0} pages</div>
        </div>
      </button>
    `).join("");
    const o = Ke.querySelectorAll(".document-option");
    o.forEach((m, f) => {
      m.addEventListener("click", () => rt(m)), m.addEventListener("keydown", (w) => {
        let S = f;
        if (w.key === "ArrowDown")
          w.preventDefault(), S = Math.min(f + 1, o.length - 1);
        else if (w.key === "ArrowUp")
          w.preventDefault(), S = Math.max(f - 1, 0);
        else if (w.key === "Enter" || w.key === " ") {
          w.preventDefault(), rt(m);
          return;
        } else w.key === "Home" ? (w.preventDefault(), S = 0) : w.key === "End" && (w.preventDefault(), S = o.length - 1);
        S !== f && (o[S].focus(), o[S].setAttribute("tabindex", "0"), m.setAttribute("tabindex", "-1"));
      });
    });
  }
  function rt(l) {
    const o = l.getAttribute("data-document-id"), m = l.getAttribute("data-document-title"), f = l.getAttribute("data-document-pages");
    xe.value = o, Qe.textContent = m, Xe.textContent = `${f} pages`, wt(f), ht.classList.remove("hidden"), ft.classList.add("hidden"), pe();
  }
  function Ee(l) {
    const o = document.createElement("div");
    return o.textContent = l, o.innerHTML;
  }
  vt && vt.addEventListener("click", () => {
    ht.classList.add("hidden"), ft.classList.remove("hidden");
  }), yt && yt.addEventListener("input", (l) => {
    const o = l.target.value.toLowerCase(), m = Ve.filter(
      (f) => (f.title || "").toLowerCase().includes(o)
    );
    Ze(m);
  }), en();
  const ae = document.getElementById("participants-container"), at = document.getElementById("participant-template"), bt = document.getElementById("add-participant-btn");
  let tn = 0, Ft = 0;
  function Rt() {
    return `temp_${Date.now()}_${tn++}`;
  }
  function qe(l = {}) {
    const o = at.content.cloneNode(!0), m = o.querySelector(".participant-entry"), f = l.id || Rt();
    m.setAttribute("data-participant-id", f);
    const w = m.querySelector(".participant-id-input"), S = m.querySelector('input[name="participants[].name"]'), E = m.querySelector('input[name="participants[].email"]'), T = m.querySelector('select[name="participants[].role"]'), L = m.querySelector('input[name="participants[].signing_stage"]'), M = m.querySelector(".signing-stage-wrapper"), B = Ft++;
    w.name = `participants[${B}].id`, w.value = f, S.name = `participants[${B}].name`, E.name = `participants[${B}].email`, T.name = `participants[${B}].role`, L && (L.name = `participants[${B}].signing_stage`), l.name && (S.value = l.name), l.email && (E.value = l.email), l.role && (T.value = l.role), L && l.signing_stage && (L.value = l.signing_stage);
    const q = () => {
      if (!M || !L) return;
      const G = T.value === "signer";
      M.classList.toggle("hidden", !G), G ? L.value || (L.value = "1") : L.value = "";
    };
    q(), m.querySelector(".remove-participant-btn").addEventListener("click", () => {
      m.remove(), we();
    }), T.addEventListener("change", () => {
      q(), we();
    }), ae.appendChild(o);
  }
  bt.addEventListener("click", () => qe()), H.length > 0 ? H.forEach((l) => {
    qe({
      id: String(l.id || "").trim(),
      name: String(l.name || "").trim(),
      email: String(l.email || "").trim(),
      role: String(l.role || "signer").trim() || "signer",
      signing_stage: Number(l.signing_stage || l.signingStage || 1) || 1
    });
  }) : qe();
  const he = document.getElementById("field-definitions-container"), nn = document.getElementById("field-definition-template"), xt = document.getElementById("add-field-btn"), St = document.getElementById("add-field-definition-empty-btn"), et = document.getElementById("field-definitions-empty-state"), de = document.getElementById("field-rules-container"), It = document.getElementById("field-rule-template"), sn = document.getElementById("add-field-rule-btn"), Et = document.getElementById("field-rules-empty-state"), Ct = document.getElementById("field-rules-preview"), Lt = document.getElementById("field_rules_json");
  let Ht = 0, tt = 0, kt = 0;
  function ot() {
    return `temp_field_${Date.now()}_${Ht++}`;
  }
  function rn() {
    return `rule_${Date.now()}_${kt}`;
  }
  function Ce() {
    const l = ae.querySelectorAll(".participant-entry"), o = [];
    return l.forEach((m) => {
      const f = m.getAttribute("data-participant-id"), w = m.querySelector('select[name*=".role"]'), S = m.querySelector('input[name*=".name"]'), E = m.querySelector('input[name*=".email"]');
      w.value === "signer" && o.push({
        id: f,
        name: S.value || E.value || "Signer",
        email: E.value
      });
    }), o;
  }
  function we() {
    const l = Ce(), o = he.querySelectorAll(".field-participant-select"), m = de ? de.querySelectorAll(".field-rule-participant-select") : [];
    o.forEach((f) => {
      const w = f.value;
      f.innerHTML = '<option value="">Select signer...</option>', l.forEach((S) => {
        const E = document.createElement("option");
        E.value = S.id, E.textContent = S.name, f.appendChild(E);
      }), w && l.some((S) => S.id === w) && (f.value = w);
    }), m.forEach((f) => {
      const w = f.value;
      f.innerHTML = '<option value="">Select signer...</option>', l.forEach((S) => {
        const E = document.createElement("option");
        E.value = S.id, E.textContent = S.name, f.appendChild(E);
      }), w && l.some((S) => S.id === w) && (f.value = w);
    }), pe();
  }
  function Ge() {
    const l = parseInt(je?.value || "0", 10);
    if (Number.isFinite(l) && l > 0) return l;
    const o = String(Xe?.textContent || "").match(/(\d+)\s+pages?/i);
    if (o) {
      const m = parseInt(o[1], 10);
      if (Number.isFinite(m) && m > 0) return m;
    }
    return 1;
  }
  function ct() {
    if (!de || !Et) return;
    const l = de.querySelectorAll(".field-rule-entry");
    Et.classList.toggle("hidden", l.length > 0);
  }
  function jt(l) {
    return l ? l.split(",").map((o) => parseInt(o.trim(), 10)).filter((o) => Number.isFinite(o) && o > 0) : [];
  }
  function Me() {
    if (!de) return [];
    const l = de.querySelectorAll(".field-rule-entry"), o = [];
    return l.forEach((m) => {
      const f = m.getAttribute("data-field-rule-id") || "", w = m.querySelector(".field-rule-type-select")?.value || "", S = m.querySelector(".field-rule-participant-select")?.value || "", E = parseInt(m.querySelector(".field-rule-from-page-input")?.value || "0", 10) || 0, T = parseInt(m.querySelector(".field-rule-to-page-input")?.value || "0", 10) || 0, L = parseInt(m.querySelector(".field-rule-page-input")?.value || "0", 10) || 0, M = !!m.querySelector(".field-rule-exclude-last-input")?.checked, B = jt(m.querySelector(".field-rule-exclude-pages-input")?.value || ""), q = (m.querySelector(".field-rule-required-select")?.value || "1") !== "0";
      w && o.push({
        id: f,
        type: w,
        participantId: S,
        participantTempId: S,
        fromPage: E,
        toPage: T,
        page: L,
        excludeLastPage: M,
        excludePages: B,
        required: q
      });
    }), o;
  }
  function lt() {
    return Me().map((l) => ({
      id: l.id,
      type: l.type,
      participant_id: l.participantId,
      from_page: l.fromPage,
      to_page: l.toPage,
      page: l.page,
      exclude_last_page: l.excludeLastPage,
      exclude_pages: l.excludePages,
      required: l.required
    }));
  }
  function Le(l, o) {
    const m = String(l?.id || "").trim();
    return m || `rule-${o + 1}`;
  }
  function dt(l, o) {
    const m = [];
    return l.forEach((f, w) => {
      const S = Le(f, w);
      if (f.type === "initials_each_page") {
        let E = f.fromPage > 0 ? f.fromPage : 1, T = f.toPage > 0 ? f.toPage : o;
        T < E && ([E, T] = [T, E]);
        const L = new Set(f.excludePages || []);
        f.excludeLastPage && L.add(o);
        for (let M = E; M <= T; M++)
          L.has(M) || m.push({
            id: `${S}-initials-${M}`,
            type: "initials",
            page: M,
            participantId: f.participantId,
            required: f.required !== !1
          });
      } else if (f.type === "signature_once") {
        let E = f.page > 0 ? f.page : f.toPage > 0 ? f.toPage : o;
        E <= 0 && (E = 1), m.push({
          id: `${S}-signature-${E}`,
          type: "signature",
          page: E,
          participantId: f.participantId,
          required: f.required !== !1
        });
      }
    }), m.sort((f, w) => f.page !== w.page ? f.page - w.page : String(f.id).localeCompare(String(w.id))), m;
  }
  function pe() {
    if (!Ct) return;
    const l = Me(), o = Ge(), m = dt(l, o), f = Ce(), w = new Map(f.map((L) => [String(L.id), L.name]));
    if (Lt && (Lt.value = JSON.stringify(lt())), !m.length) {
      Ct.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const S = m.reduce((L, M) => {
      const B = M.type;
      return L[B] = (L[B] || 0) + 1, L;
    }, {}), E = m.slice(0, 8).map((L) => {
      const M = w.get(String(L.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${L.type === "initials" ? "Initials" : "Signature"} on page ${L.page}</span><span class="text-gray-500">${Ee(String(M))}</span></li>`;
    }).join(""), T = m.length - 8;
    Ct.innerHTML = `
      <p class="text-gray-700">${m.length} generated field${m.length !== 1 ? "s" : ""} (${S.initials || 0} initials, ${S.signature || 0} signatures)</p>
      <ul class="space-y-1">${E}</ul>
      ${T > 0 ? `<p class="text-gray-500">+${T} more</p>` : ""}
    `;
  }
  function qt() {
    const l = Ce(), o = new Map(l.map((E) => [String(E.id), E.name || E.email || "Signer"])), m = [];
    he.querySelectorAll(".field-definition-entry").forEach((E) => {
      const T = String(E.getAttribute("data-field-definition-id") || "").trim(), L = E.querySelector(".field-type-select"), M = E.querySelector(".field-participant-select"), B = String(L?.value || "text").trim() || "text", q = String(M?.value || "").trim();
      m.push({
        definitionId: T,
        fieldType: B,
        participantId: q,
        participantName: o.get(q) || "Unassigned"
      });
    }), dt(Me(), Ge()).forEach((E) => {
      const T = String(E.id || "").trim();
      if (!T) return;
      const L = String(E.participantId || "").trim();
      m.push({
        definitionId: T,
        fieldType: String(E.type || "text").trim() || "text",
        participantId: L,
        participantName: o.get(L) || "Unassigned"
      });
    });
    const S = /* @__PURE__ */ new Set();
    return m.filter((E) => {
      const T = String(E.definitionId || "").trim();
      return !T || S.has(T) ? !1 : (S.add(T), !0);
    });
  }
  function zt(l) {
    const o = l.querySelector(".field-rule-type-select"), m = l.querySelector(".field-rule-range-start-wrap"), f = l.querySelector(".field-rule-range-end-wrap"), w = l.querySelector(".field-rule-page-wrap"), S = l.querySelector(".field-rule-exclude-last-wrap"), E = l.querySelector(".field-rule-exclude-pages-wrap"), T = l.querySelector(".field-rule-summary"), L = parseInt(l.querySelector(".field-rule-from-page-input")?.value || "1", 10) || 1, M = parseInt(l.querySelector(".field-rule-to-page-input")?.value || "1", 10) || 1, B = parseInt(l.querySelector(".field-rule-page-input")?.value || "1", 10) || 1, q = !!l.querySelector(".field-rule-exclude-last-input")?.checked, G = l.querySelector(".field-rule-exclude-pages-input")?.value || "", Y = o?.value === "initials_each_page";
    m.classList.toggle("hidden", !Y), f.classList.toggle("hidden", !Y), S.classList.toggle("hidden", !Y), E.classList.toggle("hidden", !Y), w.classList.toggle("hidden", Y), Y ? T.textContent = `Generates initials fields from page ${L} to ${M}${q ? " (excluding last page)" : ""}${G ? `; excluding ${G}` : ""}.` : T.textContent = `Generates one signature field on page ${B}.`;
  }
  function Nt(l = {}) {
    if (!It || !de) return;
    const o = It.content.cloneNode(!0), m = o.querySelector(".field-rule-entry"), f = l.id || rn(), w = kt++, S = Ge();
    m.setAttribute("data-field-rule-id", f);
    const E = m.querySelector(".field-rule-id-input"), T = m.querySelector(".field-rule-type-select"), L = m.querySelector(".field-rule-participant-select"), M = m.querySelector(".field-rule-from-page-input"), B = m.querySelector(".field-rule-to-page-input"), q = m.querySelector(".field-rule-page-input"), G = m.querySelector(".field-rule-required-select"), Y = m.querySelector(".field-rule-exclude-last-input"), Z = m.querySelector(".field-rule-exclude-pages-input"), ee = m.querySelector(".remove-field-rule-btn");
    E.name = `field_rules[${w}].id`, E.value = f, T.name = `field_rules[${w}].type`, L.name = `field_rules[${w}].participant_id`, M.name = `field_rules[${w}].from_page`, B.name = `field_rules[${w}].to_page`, q.name = `field_rules[${w}].page`, G.name = `field_rules[${w}].required`, Y.name = `field_rules[${w}].exclude_last_page`, Z.name = `field_rules[${w}].exclude_pages`;
    const ie = Ce();
    L.innerHTML = '<option value="">Select signer...</option>', ie.forEach((Fe) => {
      const ve = document.createElement("option");
      ve.value = Fe.id, ve.textContent = Fe.name, L.appendChild(ve);
    }), T.value = l.type || "initials_each_page", L.value = l.participant_id || l.participantId || "", M.value = String(l.from_page || l.fromPage || 1), B.value = String(l.to_page || l.toPage || S), q.value = String(l.page || 1), G.value = l.required === !1 ? "0" : "1", Y.checked = !!(l.exclude_last_page || l.excludeLastPage);
    const Ie = l.exclude_pages || l.excludePages || [];
    Z.value = Array.isArray(Ie) ? Ie.join(",") : String(Ie || "");
    const ye = () => {
      zt(m), pe(), De();
    };
    T.addEventListener("change", ye), L.addEventListener("change", ye), M.addEventListener("input", ye), B.addEventListener("input", ye), q.addEventListener("input", ye), G.addEventListener("change", ye), Y.addEventListener("change", ye), Z.addEventListener("input", ye), ee.addEventListener("click", () => {
      m.remove(), ct(), pe(), De();
    }), de.appendChild(o), zt(de.lastElementChild), ct(), pe();
  }
  function ut(l = {}) {
    const o = nn.content.cloneNode(!0), m = o.querySelector(".field-definition-entry"), f = l.id || ot();
    m.setAttribute("data-field-definition-id", f);
    const w = m.querySelector(".field-definition-id-input"), S = m.querySelector('select[name="field_definitions[].type"]'), E = m.querySelector('select[name="field_definitions[].participant_id"]'), T = m.querySelector('input[name="field_definitions[].page"]'), L = m.querySelector('input[name="field_definitions[].required"]'), M = m.querySelector(".field-date-signed-info"), B = tt++;
    w.name = `field_instances[${B}].id`, w.value = f, S.name = `field_instances[${B}].type`, E.name = `field_instances[${B}].participant_id`, T.name = `field_instances[${B}].page`, L.name = `field_instances[${B}].required`, l.type && (S.value = l.type), l.page && (T.value = l.page), l.required !== void 0 && (L.checked = l.required);
    const q = Ce();
    E.innerHTML = '<option value="">Select signer...</option>', q.forEach((ee) => {
      const ie = document.createElement("option");
      ie.value = ee.id, ie.textContent = ee.name, E.appendChild(ie);
    }), l.participant_id && (E.value = l.participant_id), S.addEventListener("change", () => {
      S.value === "date_signed" ? M.classList.remove("hidden") : M.classList.add("hidden");
    }), S.value === "date_signed" && M.classList.remove("hidden"), m.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      m.remove(), We();
    });
    const G = m.querySelector('input[name*=".page"]'), Y = m.querySelector(".jump-to-place-btn");
    Y.addEventListener("click", async () => {
      const ee = parseInt(G?.value || "1", 10), ie = m.getAttribute("data-field-definition-id");
      if (Be(5), await new Promise((Ie) => setTimeout(Ie, 100)), typeof A < "u" && A.pdfDoc) {
        const Ie = Math.max(1, Math.min(ee, A.totalPages || 1));
        A.currentPage !== Ie && (A.currentPage = Ie, await h(Ie)), document.querySelectorAll(".placement-field-item").forEach((ve) => ve.classList.remove("ring-2", "ring-blue-500", "bg-blue-50"));
        const Fe = document.querySelector(`.placement-field-item[data-definition-id="${ie}"]`);
        Fe && (Fe.classList.add("ring-2", "ring-blue-500", "bg-blue-50"), Fe.scrollIntoView({ behavior: "smooth", block: "center" }), setTimeout(() => {
          Fe.classList.remove("ring-2", "ring-blue-500", "bg-blue-50");
        }, 3e3));
      }
    });
    const Z = () => {
      const ee = G?.value || "1";
      Y.title = `Place on page ${ee}`, Y.setAttribute("aria-label", `Jump to place this field on page ${ee}`);
    };
    Z(), G?.addEventListener("input", Z), G?.addEventListener("change", Z), he.appendChild(o), We();
  }
  function We() {
    he.querySelectorAll(".field-definition-entry").length === 0 ? et.classList.remove("hidden") : et.classList.add("hidden");
  }
  new MutationObserver(() => {
    we();
  }).observe(ae, { childList: !0, subtree: !0 }), ae.addEventListener("change", (l) => {
    (l.target.matches('select[name*=".role"]') || l.target.matches('input[name*=".name"]') || l.target.matches('input[name*=".email"]')) && we();
  }), ae.addEventListener("input", (l) => {
    (l.target.matches('input[name*=".name"]') || l.target.matches('input[name*=".email"]')) && we();
  }), xt.addEventListener("click", () => ut()), St.addEventListener("click", () => ut()), sn?.addEventListener("click", () => Nt({ to_page: Ge() })), window._initialFieldPlacementsData = [], F.forEach((l) => {
    const o = String(l.id || "").trim();
    if (!o) return;
    const m = String(l.type || "signature").trim() || "signature", f = String(l.participant_id || l.participantId || "").trim(), w = Number(l.page || 1) || 1, S = !!l.required;
    ut({
      id: o,
      type: m,
      participant_id: f,
      page: w,
      required: S
    }), window._initialFieldPlacementsData.push({
      id: o,
      definitionId: o,
      type: m,
      participantId: f,
      participantName: String(l.participant_name || l.participantName || "").trim(),
      page: w,
      x: Number(l.x || l.pos_x || 0) || 0,
      y: Number(l.y || l.pos_y || 0) || 0,
      width: Number(l.width || 150) || 150,
      height: Number(l.height || 32) || 32,
      placementSource: String(l.placement_source || l.placementSource || "manual").trim() || "manual"
    });
  }), We(), we(), ct(), pe();
  const ze = document.getElementById("agreement-form"), Se = document.getElementById("submit-btn"), Pt = document.getElementById("form-announcements");
  function ke(l, o = "", m = 0) {
    const f = String(o || "").trim().toUpperCase(), w = String(l || "").trim().toLowerCase();
    return f === "SCOPE_DENIED" || w.includes("scope denied") ? "You don't have access to this organization's resources." : f === "TRANSPORT_SECURITY" || f === "TRANSPORT_SECURITY_REQUIRED" || w.includes("tls transport required") || Number(m) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : String(l || "").trim() !== "" ? String(l).trim() : "Something went wrong. Please try again.";
  }
  async function At(l, o) {
    const m = Number(l?.status || 0);
    let f = "", w = "";
    try {
      const S = await l.json();
      f = String(S?.error?.code || S?.code || "").trim(), w = String(S?.error?.message || S?.message || "").trim();
    } catch {
      w = "";
    }
    return w === "" && (w = o || `Request failed (${m || "unknown"})`), {
      status: m,
      code: f,
      message: ke(w, f, m)
    };
  }
  function ge(l, o = "", m = 0) {
    const f = ke(l, o, m);
    Pt && (Pt.textContent = f), window.toastManager ? window.toastManager.error(f) : alert(f);
  }
  function Ot() {
    const l = [];
    ae.querySelectorAll(".participant-entry").forEach((f) => {
      const w = String(f.getAttribute("data-participant-id") || "").trim(), S = String(f.querySelector('input[name*=".name"]')?.value || "").trim(), E = String(f.querySelector('input[name*=".email"]')?.value || "").trim(), T = String(f.querySelector('select[name*=".role"]')?.value || "signer").trim(), L = String(f.querySelector(".signing-stage-input")?.value || "").trim(), M = Number(L || "1") || 1;
      l.push({
        id: w,
        name: S,
        email: E,
        role: T,
        signing_stage: T === "signer" ? M : 0
      });
    });
    const o = [];
    he.querySelectorAll(".field-definition-entry").forEach((f) => {
      const w = String(f.getAttribute("data-field-definition-id") || "").trim(), S = String(f.querySelector(".field-type-select")?.value || "signature").trim(), E = String(f.querySelector(".field-participant-select")?.value || "").trim(), T = Number(f.querySelector('input[name*=".page"]')?.value || "1") || 1, L = !!f.querySelector('input[name*=".required"]')?.checked;
      w && o.push({
        id: w,
        type: S,
        participant_id: E,
        page: T,
        required: L
      });
    });
    const m = [];
    return A && Array.isArray(A.fieldInstances) && A.fieldInstances.forEach((f) => {
      m.push({
        id: String(f.id || "").trim(),
        definition_id: String(f.definitionId || "").trim(),
        page: Number(f.page || 1) || 1,
        x: Number(f.x || 0) || 0,
        y: Number(f.y || 0) || 0,
        width: Number(f.width || 0) || 0,
        height: Number(f.height || 0) || 0
      });
    }), {
      document_id: String(xe?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: l,
      field_instances: o,
      field_placements: m,
      field_rules: lt(),
      field_rules_json: String(Lt?.value || "[]"),
      send_for_signature: te === Pe ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(je?.value || "0") || 0
    };
  }
  function Tt() {
    const l = Ce(), o = /* @__PURE__ */ new Map();
    return l.forEach((w) => {
      o.set(w.id, !1);
    }), he.querySelectorAll(".field-definition-entry").forEach((w) => {
      const S = w.querySelector(".field-type-select"), E = w.querySelector(".field-participant-select"), T = w.querySelector('input[name*=".required"]');
      S?.value === "signature" && E?.value && T?.checked && o.set(E.value, !0);
    }), dt(Me(), Ge()).forEach((w) => {
      w.type === "signature" && w.participantId && w.required && o.set(w.participantId, !0);
    }), l.filter((w) => !o.get(w.id));
  }
  function _t(l) {
    if (!Array.isArray(l) || l.length === 0)
      return "Each signer requires at least one required signature field.";
    const o = l.map((m) => m?.name?.trim()).filter((m) => !!m);
    return o.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${o.join(", ")}`;
  }
  ze.addEventListener("submit", function(l) {
    if (pe(), !xe.value) {
      l.preventDefault(), ge("Please select a document"), yt.focus();
      return;
    }
    const o = ae.querySelectorAll(".participant-entry");
    if (o.length === 0) {
      l.preventDefault(), ge("Please add at least one participant"), bt.focus();
      return;
    }
    let m = !1;
    if (o.forEach((B) => {
      B.querySelector('select[name*=".role"]').value === "signer" && (m = !0);
    }), !m) {
      l.preventDefault(), ge("At least one signer is required");
      const B = o[0]?.querySelector('select[name*=".role"]');
      B && B.focus();
      return;
    }
    const f = he.querySelectorAll(".field-definition-entry"), w = Tt();
    if (w.length > 0) {
      l.preventDefault(), ge(_t(w)), Be(4), xt.focus();
      return;
    }
    let S = !1;
    if (f.forEach((B) => {
      B.querySelector(".field-participant-select").value || (S = !0);
    }), S) {
      l.preventDefault(), ge("Please assign all fields to a signer");
      const B = he.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      B && B.focus();
      return;
    }
    if (Me().some((B) => !B.participantId)) {
      l.preventDefault(), ge("Please assign all automation rules to a signer"), Array.from(de?.querySelectorAll(".field-rule-participant-select") || []).find((q) => !q.value)?.focus();
      return;
    }
    const L = !!ze.querySelector('input[name="save_as_draft"]'), M = te === Pe && !L;
    if (M) {
      let B = ze.querySelector('input[name="send_for_signature"]');
      B || (B = document.createElement("input"), B.type = "hidden", B.name = "send_for_signature", ze.appendChild(B)), B.value = "1";
    } else
      ze.querySelector('input[name="send_for_signature"]')?.remove();
    if (C === "json") {
      l.preventDefault();
      const B = Ot();
      Se.disabled = !0, Se.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${M ? "Sending..." : "Saving..."}
      `, fetch(`${d}/panels/esign_agreements`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...v ? { "X-User-ID": v } : {}
        },
        body: JSON.stringify(B)
      }).then(async (q) => {
        if (!q.ok)
          throw await At(q, "Failed to create agreement");
        return q.json();
      }).then((q) => {
        const G = String(q?.id || q?.data?.id || "").trim(), Y = String(e.routes?.index || "").trim();
        if (G && Y) {
          window.location.href = `${Y}/${encodeURIComponent(G)}`;
          return;
        }
        if (Y) {
          window.location.href = Y;
          return;
        }
        window.location.reload();
      }).catch((q) => {
        const G = String(q?.message || "Failed to create agreement").trim(), Y = String(q?.code || "").trim(), Z = Number(q?.status || 0);
        ge(G, Y, Z), Se.disabled = !1, Se.innerHTML = `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          Send for Signature
        `;
      });
      return;
    }
    Se.disabled = !0, Se.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${M ? "Sending..." : "Saving..."}
    `;
  });
  const Pe = 6;
  let te = 1;
  const Ut = document.querySelectorAll(".wizard-step-btn"), on = document.querySelectorAll(".wizard-step"), Vt = document.querySelectorAll(".wizard-connector"), Gt = document.getElementById("wizard-prev-btn"), $t = document.getElementById("wizard-next-btn"), Wt = document.getElementById("wizard-save-btn");
  function Ae() {
    if (Ut.forEach((l, o) => {
      const m = o + 1, f = l.querySelector(".wizard-step-number");
      m < te ? (l.classList.remove("text-gray-500", "text-blue-600"), l.classList.add("text-green-600"), f.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), f.classList.add("bg-green-600", "text-white"), l.removeAttribute("aria-current")) : m === te ? (l.classList.remove("text-gray-500", "text-green-600"), l.classList.add("text-blue-600"), f.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), f.classList.add("bg-blue-600", "text-white"), l.setAttribute("aria-current", "step")) : (l.classList.remove("text-blue-600", "text-green-600"), l.classList.add("text-gray-500"), f.classList.remove("bg-blue-600", "text-white", "bg-green-600"), f.classList.add("bg-gray-300", "text-gray-600"), l.removeAttribute("aria-current"));
    }), Vt.forEach((l, o) => {
      o < te - 1 ? (l.classList.remove("bg-gray-300"), l.classList.add("bg-green-600")) : (l.classList.remove("bg-green-600"), l.classList.add("bg-gray-300"));
    }), on.forEach((l) => {
      parseInt(l.dataset.step, 10) === te ? l.classList.remove("hidden") : l.classList.add("hidden");
    }), Gt.classList.toggle("hidden", te === 1), $t.classList.toggle("hidden", te === Pe), Wt.classList.toggle("hidden", te !== Pe), Se.classList.toggle("hidden", te !== Pe), te < Pe) {
      const l = ["Details", "Participants", "Fields", "Placement", "Review"][te - 1] || "Next";
      $t.innerHTML = `
        ${l}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    te === 5 ? c() : te === 6 && li();
  }
  function oe(l) {
    switch (l) {
      case 1:
        return xe.value ? !0 : (ge("Please select a document"), !1);
      case 2:
        const o = document.getElementById("title");
        return o.value.trim() ? !0 : (ge("Please enter an agreement title"), o.focus(), !1);
      case 3:
        const m = ae.querySelectorAll(".participant-entry");
        if (m.length === 0)
          return ge("Please add at least one participant"), !1;
        let f = !1;
        return m.forEach((L) => {
          L.querySelector('select[name*=".role"]').value === "signer" && (f = !0);
        }), f ? !0 : (ge("At least one signer is required"), !1);
      case 4:
        const w = he.querySelectorAll(".field-definition-entry");
        for (const L of w) {
          const M = L.querySelector(".field-participant-select");
          if (!M.value)
            return ge("Please assign all fields to a signer"), M.focus(), !1;
        }
        if (Me().find((L) => !L.participantId))
          return ge("Please assign all automation rules to a signer"), de?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const T = Tt();
        return T.length > 0 ? (ge(_t(T)), xt.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function Be(l) {
    if (!(l < 1 || l > Pe)) {
      if (l > te) {
        for (let o = te; o < l; o++)
          if (!oe(o)) return;
      }
      te = l, Ae(), K.updateStep(l), st(), $e.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  Ut.forEach((l) => {
    l.addEventListener("click", () => {
      const o = parseInt(l.dataset.step, 10);
      Be(o);
    });
  }), Gt.addEventListener("click", () => Be(te - 1)), $t.addEventListener("click", () => Be(te + 1)), Wt.addEventListener("click", () => {
    const l = document.createElement("input");
    l.type = "hidden", l.name = "save_as_draft", l.value = "1", ze.appendChild(l), ze.submit();
  });
  function pt(l, o) {
    const m = l || {}, f = String(m.id || `fi_init_${o || 0}`), w = String(m.definitionId || m.definition_id || m.field_definition_id || f), S = parseInt(m.page || m.page_number || "1", 10), E = parseFloat(m.x || m.pos_x || "0"), T = parseFloat(m.y || m.pos_y || "0"), L = parseFloat(m.width || "150"), M = parseFloat(m.height || "32");
    return {
      id: f,
      definitionId: w,
      type: String(m.type || "text"),
      participantId: String(m.participantId || m.participant_id || ""),
      participantName: String(m.participantName || m.participant_name || "Unassigned"),
      page: Number.isFinite(S) && S > 0 ? S : 1,
      x: Number.isFinite(E) && E >= 0 ? E : 0,
      y: Number.isFinite(T) && T >= 0 ? T : 0,
      width: Number.isFinite(L) && L > 0 ? L : 150,
      height: Number.isFinite(M) && M > 0 ? M : 32,
      placementSource: String(m.placementSource || m.placement_source || "manual")
    };
  }
  let A = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((l, o) => pt(l, o)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1
  };
  const Je = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, r = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function c() {
    const l = document.getElementById("placement-loading"), o = document.getElementById("placement-no-document"), m = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const f = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const w = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const S = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !xe.value) {
      l.classList.add("hidden"), o.classList.remove("hidden");
      return;
    }
    l.classList.remove("hidden"), o.classList.add("hidden");
    const E = qt(), T = new Set(
      E.map((L) => String(L.definitionId || "").trim()).filter((L) => L)
    );
    A.fieldInstances = A.fieldInstances.filter(
      (L) => T.has(String(L.definitionId || "").trim())
    ), m.innerHTML = "", E.forEach((L) => {
      const M = String(L.definitionId || "").trim(), B = String(L.fieldType || "text").trim() || "text", q = String(L.participantId || "").trim(), G = String(L.participantName || "Unassigned").trim() || "Unassigned";
      if (!M) return;
      A.fieldInstances.forEach((ie) => {
        ie.definitionId === M && (ie.type = B, ie.participantId = q, ie.participantName = G);
      });
      const Y = Je[B] || Je.text, Z = A.fieldInstances.some((ie) => ie.definitionId === M), ee = document.createElement("div");
      ee.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Z ? "opacity-50" : ""}`, ee.draggable = !Z, ee.dataset.definitionId = M, ee.dataset.fieldType = B, ee.dataset.participantId = q, ee.dataset.participantName = G, ee.innerHTML = `
        <span class="w-3 h-3 rounded ${Y.bg}"></span>
        <div class="flex-1 text-xs">
          <div class="font-medium capitalize">${B.replace("_", " ")}</div>
          <div class="text-gray-500">${G}</div>
        </div>
        <span class="placement-status text-xs ${Z ? "text-green-600" : "text-amber-600"}">
          ${Z ? "Placed" : "Not placed"}
        </span>
      `, ee.addEventListener("dragstart", (ie) => {
        if (Z) {
          ie.preventDefault();
          return;
        }
        ie.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: M,
          fieldType: B,
          participantId: q,
          participantName: G
        })), ie.dataTransfer.effectAllowed = "copy", ee.classList.add("opacity-50");
      }), ee.addEventListener("dragend", () => {
        ee.classList.remove("opacity-50");
      }), m.appendChild(ee);
    });
    try {
      window.pdfjsLib || await p();
      const L = await fetch(`${n}/panels/esign_documents/${xe.value}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!L.ok)
        throw new Error(`Failed to load document metadata (${L.status})`);
      const M = await L.json(), B = M && typeof M == "object" && M.data && typeof M.data == "object" ? M.data : M, q = String(B?.source_object_key || "").trim().replace(/^\/+/, ""), G = q ? `${t}/assets/${q.split("/").map(encodeURIComponent).join("/")}` : "", Y = String(
        B?.file_url || B?.url || B?.source_url || B?.download_url || G
      ).trim();
      if (!Y)
        throw new Error("No PDF URL found");
      const Z = window.pdfjsLib.getDocument(Y);
      A.pdfDoc = await Z.promise, A.totalPages = A.pdfDoc.numPages, A.currentPage = 1, S.textContent = A.totalPages, await h(A.currentPage), l.classList.add("hidden"), A.uiHandlersBound || (y(f, w), O(), re(), A.uiHandlersBound = !0), I();
    } catch (L) {
      console.error("Failed to load PDF:", L), l.innerHTML = `
        <div class="text-center py-8">
          <svg class="w-16 h-16 mx-auto text-red-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p class="text-sm text-red-600 mb-2">Failed to load PDF</p>
          <p class="text-xs text-gray-400">${L.message}</p>
        </div>
      `;
    }
    ue(), ne();
  }
  async function p() {
    return new Promise((l, o) => {
      const m = document.createElement("script");
      m.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", m.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js", l();
      }, m.onerror = o, document.head.appendChild(m);
    });
  }
  async function h(l) {
    if (!A.pdfDoc) return;
    const o = document.getElementById("placement-pdf-canvas"), m = document.getElementById("placement-canvas-container"), f = o.getContext("2d"), w = await A.pdfDoc.getPage(l), S = w.getViewport({ scale: A.scale });
    o.width = S.width, o.height = S.height, m.style.width = `${S.width}px`, m.style.height = `${S.height}px`, await w.render({
      canvasContext: f,
      viewport: S
    }).promise, document.getElementById("placement-current-page").textContent = l, I();
  }
  function y(l, o) {
    const m = document.getElementById("placement-pdf-canvas");
    l.addEventListener("dragover", (f) => {
      f.preventDefault(), f.dataTransfer.dropEffect = "copy", m.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), l.addEventListener("dragleave", (f) => {
      m.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), l.addEventListener("drop", (f) => {
      f.preventDefault(), m.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const w = f.dataTransfer.getData("application/json");
      if (!w) return;
      const S = JSON.parse(w), E = m.getBoundingClientRect(), T = (f.clientX - E.left) / A.scale, L = (f.clientY - E.top) / A.scale;
      b(S, T, L);
    });
  }
  function b(l, o, m, f = {}) {
    const w = r[l.fieldType] || r.text, S = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, E = f.placementSource || "manual", T = {
      id: S,
      definitionId: l.definitionId,
      type: l.fieldType,
      participantId: l.participantId,
      participantName: l.participantName,
      page: A.currentPage,
      x: Math.max(0, o - w.width / 2),
      y: Math.max(0, m - w.height / 2),
      width: w.width,
      height: w.height,
      placementSource: E
    };
    A.fieldInstances.push(T);
    const L = document.querySelector(`.placement-field-item[data-definition-id="${l.definitionId}"]`);
    if (L) {
      L.classList.add("opacity-50"), L.draggable = !1;
      const M = L.querySelector(".placement-status");
      M && (M.textContent = "Placed", M.classList.remove("text-amber-600"), M.classList.add("text-green-600"));
    }
    I(), ue(), ne();
  }
  function I() {
    const l = document.getElementById("placement-overlays-container");
    l.innerHTML = "", l.style.pointerEvents = "auto", A.fieldInstances.filter((o) => o.page === A.currentPage).forEach((o) => {
      const m = Je[o.type] || Je.text, f = A.selectedFieldId === o.id, w = document.createElement("div");
      w.className = `field-overlay absolute cursor-move ${m.border} border-2 rounded`, w.style.cssText = `
          left: ${o.x * A.scale}px;
          top: ${o.y * A.scale}px;
          width: ${o.width * A.scale}px;
          height: ${o.height * A.scale}px;
          background-color: ${m.fill};
          ${f ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, w.dataset.instanceId = o.id;
      const S = document.createElement("div");
      S.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + m.bg, S.textContent = `${o.type.replace("_", " ")} - ${o.participantName}`, w.appendChild(S);
      const E = document.createElement("div");
      E.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", E.style.cssText = "transform: translate(50%, 50%);", w.appendChild(E);
      const T = document.createElement("button");
      T.type = "button", T.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", T.innerHTML = "×", T.addEventListener("click", (L) => {
        L.stopPropagation(), V(o.id);
      }), w.appendChild(T), w.addEventListener("mousedown", (L) => {
        L.target === E ? R(L, o) : L.target !== T && _(L, o, w);
      }), w.addEventListener("click", () => {
        A.selectedFieldId = o.id, I();
      }), l.appendChild(w);
    });
  }
  function _(l, o, m) {
    l.preventDefault(), A.isDragging = !0, A.selectedFieldId = o.id;
    const f = l.clientX, w = l.clientY, S = o.x * A.scale, E = o.y * A.scale;
    function T(M) {
      const B = M.clientX - f, q = M.clientY - w;
      o.x = Math.max(0, (S + B) / A.scale), o.y = Math.max(0, (E + q) / A.scale), o.placementSource = "manual", m.style.left = `${o.x * A.scale}px`, m.style.top = `${o.y * A.scale}px`;
    }
    function L() {
      A.isDragging = !1, document.removeEventListener("mousemove", T), document.removeEventListener("mouseup", L), ne();
    }
    document.addEventListener("mousemove", T), document.addEventListener("mouseup", L);
  }
  function R(l, o) {
    l.preventDefault(), l.stopPropagation(), A.isResizing = !0;
    const m = l.clientX, f = l.clientY, w = o.width, S = o.height;
    function E(L) {
      const M = (L.clientX - m) / A.scale, B = (L.clientY - f) / A.scale;
      o.width = Math.max(30, w + M), o.height = Math.max(20, S + B), o.placementSource = "manual", I();
    }
    function T() {
      A.isResizing = !1, document.removeEventListener("mousemove", E), document.removeEventListener("mouseup", T), ne();
    }
    document.addEventListener("mousemove", E), document.addEventListener("mouseup", T);
  }
  function V(l) {
    const o = A.fieldInstances.find((f) => f.id === l);
    if (!o) return;
    A.fieldInstances = A.fieldInstances.filter((f) => f.id !== l);
    const m = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (m) {
      m.classList.remove("opacity-50"), m.draggable = !0;
      const f = m.querySelector(".placement-status");
      f && (f.textContent = "Not placed", f.classList.remove("text-green-600"), f.classList.add("text-amber-600"));
    }
    I(), ue(), ne();
  }
  function O() {
    const l = document.getElementById("placement-prev-page"), o = document.getElementById("placement-next-page");
    l.addEventListener("click", async () => {
      A.currentPage > 1 && (A.currentPage--, await h(A.currentPage));
    }), o.addEventListener("click", async () => {
      A.currentPage < A.totalPages && (A.currentPage++, await h(A.currentPage));
    });
  }
  function re() {
    const l = document.getElementById("placement-zoom-in"), o = document.getElementById("placement-zoom-out"), m = document.getElementById("placement-zoom-fit"), f = document.getElementById("placement-zoom-level");
    l.addEventListener("click", async () => {
      A.scale = Math.min(3, A.scale + 0.25), f.textContent = `${Math.round(A.scale * 100)}%`, await h(A.currentPage);
    }), o.addEventListener("click", async () => {
      A.scale = Math.max(0.5, A.scale - 0.25), f.textContent = `${Math.round(A.scale * 100)}%`, await h(A.currentPage);
    }), m.addEventListener("click", async () => {
      const w = document.getElementById("placement-viewer"), E = (await A.pdfDoc.getPage(A.currentPage)).getViewport({ scale: 1 });
      A.scale = (w.clientWidth - 40) / E.width, f.textContent = `${Math.round(A.scale * 100)}%`, await h(A.currentPage);
    });
  }
  function ue() {
    const l = Array.from(document.querySelectorAll(".placement-field-item")), o = l.length, m = new Set(
      l.map((E) => String(E.dataset.definitionId || "").trim()).filter((E) => E)
    ), f = /* @__PURE__ */ new Set();
    A.fieldInstances.forEach((E) => {
      const T = String(E.definitionId || "").trim();
      m.has(T) && f.add(T);
    });
    const w = f.size, S = Math.max(0, o - w);
    document.getElementById("placement-total-fields").textContent = o, document.getElementById("placement-placed-count").textContent = w, document.getElementById("placement-unplaced-count").textContent = S;
  }
  function ne() {
    const l = document.getElementById("field-instances-container");
    l.innerHTML = "", A.fieldInstances.forEach((o, m) => {
      [
        { name: `field_placements[${m}].id`, value: o.id },
        { name: `field_placements[${m}].definition_id`, value: o.definitionId },
        { name: `field_placements[${m}].page`, value: o.page },
        { name: `field_placements[${m}].x`, value: Math.round(o.x) },
        { name: `field_placements[${m}].y`, value: Math.round(o.y) },
        { name: `field_placements[${m}].width`, value: Math.round(o.width) },
        { name: `field_placements[${m}].height`, value: Math.round(o.height) }
      ].forEach(({ name: w, value: S }) => {
        const E = document.createElement("input");
        E.type = "hidden", E.name = w, E.value = S, l.appendChild(E);
      });
    });
  }
  ne();
  let j = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const J = document.getElementById("auto-place-btn");
  J && J.addEventListener("click", async () => {
    if (j.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      Bt("All fields are already placed", "info");
      return;
    }
    const o = document.querySelector('input[name="id"]')?.value;
    if (!o) {
      Te();
      return;
    }
    j.isRunning = !0, J.disabled = !0, J.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const m = await fetch(`${d}/esign/agreements/${o}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Ne()
        })
      });
      if (!m.ok)
        throw await At(m, "Auto-placement failed");
      const f = await m.json(), w = f && typeof f == "object" && f.run && typeof f.run == "object" ? f.run : f;
      j.currentRunId = w?.run_id || w?.id || null, j.suggestions = w?.suggestions || [], j.resolverScores = w?.resolver_scores || [], j.suggestions.length === 0 ? (Bt("No placement suggestions found. Try placing fields manually.", "warning"), Te()) : ln(f);
    } catch (m) {
      console.error("Auto-place error:", m);
      const f = ke(m?.message || "Auto-placement failed", m?.code || "", m?.status || 0);
      Bt(`Auto-placement failed: ${f}`, "error"), Te();
    } finally {
      j.isRunning = !1, J.disabled = !1, J.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Ne() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function Te() {
    const l = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let o = 100;
    l.forEach((m) => {
      const f = {
        definitionId: m.dataset.definitionId,
        fieldType: m.dataset.fieldType,
        participantId: m.dataset.participantId,
        participantName: m.dataset.participantName
      }, w = r[f.fieldType] || r.text;
      A.currentPage = A.totalPages, b(f, 300, o + w.height / 2, { placementSource: "auto_fallback" }), o += w.height + 20;
    }), A.pdfDoc && h(A.totalPages), Bt("Fields placed using fallback layout", "info");
  }
  function ln(l) {
    let o = document.getElementById("placement-suggestions-modal");
    o || (o = dn(), document.body.appendChild(o));
    const m = o.querySelector("#suggestions-list"), f = o.querySelector("#resolver-info"), w = o.querySelector("#run-stats");
    f.innerHTML = j.resolverScores.map((S) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${S.resolver_id.replace(/_/g, " ")}</span>
        <div class="flex items-center gap-2">
          ${S.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${ai(S.score)}">
              ${(S.score * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), w.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${l.run_id?.slice(0, 8) || "N/A"}</code></span>
        <span>Status: <span class="font-medium ${l.status === "completed" ? "text-green-600" : "text-amber-600"}">${l.status || "unknown"}</span></span>
        <span>Time: ${l.elapsed_ms || 0}ms</span>
      </div>
    `, m.innerHTML = j.suggestions.map((S, E) => {
      const T = Mt(S.field_definition_id), L = Je[T?.type] || Je.text;
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${E}" data-suggestion-id="${S.id}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${L.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${(T?.type || "field").replace("_", " ")}</div>
                <div class="text-xs text-gray-500">Page ${S.page_number}, (${Math.round(S.x)}, ${Math.round(S.y)})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${ri(S.confidence)}">
                ${(S.confidence * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${oi(S.resolver_id)}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${E}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${E}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${E}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), un(o), o.classList.remove("hidden");
  }
  function dn() {
    const l = document.createElement("div");
    return l.id = "placement-suggestions-modal", l.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", l.innerHTML = `
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
    `, l.querySelector("#close-suggestions-modal").addEventListener("click", () => {
      l.classList.add("hidden");
    }), l.addEventListener("click", (o) => {
      o.target === l && l.classList.add("hidden");
    }), l.querySelector("#accept-all-btn").addEventListener("click", () => {
      l.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-green-500", "bg-green-50"), o.classList.remove("border-red-500", "bg-red-50"), o.dataset.accepted = "true";
      });
    }), l.querySelector("#reject-all-btn").addEventListener("click", () => {
      l.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-red-500", "bg-red-50"), o.classList.remove("border-green-500", "bg-green-50"), o.dataset.accepted = "false";
      });
    }), l.querySelector("#apply-suggestions-btn").addEventListener("click", () => {
      gn(), l.classList.add("hidden");
    }), l.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      l.classList.add("hidden");
      const o = l.querySelector("#placement-policy-preset-modal"), m = document.getElementById("placement-policy-preset");
      m && o && (m.value = o.value), J?.click();
    }), l;
  }
  function un(l) {
    l.querySelectorAll(".accept-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const m = o.closest(".suggestion-item");
        m.classList.add("border-green-500", "bg-green-50"), m.classList.remove("border-red-500", "bg-red-50"), m.dataset.accepted = "true";
      });
    }), l.querySelectorAll(".reject-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const m = o.closest(".suggestion-item");
        m.classList.add("border-red-500", "bg-red-50"), m.classList.remove("border-green-500", "bg-green-50"), m.dataset.accepted = "false";
      });
    }), l.querySelectorAll(".preview-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const m = parseInt(o.dataset.index, 10), f = j.suggestions[m];
        f && pn(f);
      });
    });
  }
  function pn(l) {
    l.page_number !== A.currentPage && (A.currentPage = l.page_number, h(l.page_number));
    const o = document.getElementById("placement-overlays-container"), m = document.getElementById("suggestion-preview-overlay");
    m && m.remove();
    const f = document.createElement("div");
    f.id = "suggestion-preview-overlay", f.className = "absolute pointer-events-none animate-pulse", f.style.cssText = `
      left: ${l.x * A.scale}px;
      top: ${l.y * A.scale}px;
      width: ${l.width * A.scale}px;
      height: ${l.height * A.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, o.appendChild(f), setTimeout(() => f.remove(), 3e3);
  }
  function gn() {
    const o = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    o.forEach((m) => {
      const f = parseInt(m.dataset.index, 10), w = j.suggestions[f];
      if (!w) return;
      const S = Mt(w.field_definition_id);
      if (!S) return;
      const E = document.querySelector(`.placement-field-item[data-definition-id="${w.field_definition_id}"]`);
      if (!E || E.classList.contains("opacity-50")) return;
      const T = {
        definitionId: w.field_definition_id,
        fieldType: S.type,
        participantId: S.participant_id,
        participantName: E.dataset.participantName
      };
      A.currentPage = w.page_number, mn(T, w);
    }), A.pdfDoc && h(A.currentPage), ci(o.length, j.suggestions.length - o.length), Bt(`Applied ${o.length} placement${o.length !== 1 ? "s" : ""}`, "success");
  }
  function mn(l, o) {
    const m = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: l.definitionId,
      type: l.fieldType,
      participantId: l.participantId,
      participantName: l.participantName,
      page: o.page_number,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      // Track placement source for audit
      placementSource: "auto",
      resolverId: o.resolver_id,
      confidence: o.confidence,
      placementRunId: j.currentRunId
    };
    A.fieldInstances.push(m);
    const f = document.querySelector(`.placement-field-item[data-definition-id="${l.definitionId}"]`);
    if (f) {
      f.classList.add("opacity-50"), f.draggable = !1;
      const w = f.querySelector(".placement-status");
      w && (w.textContent = "Placed", w.classList.remove("text-amber-600"), w.classList.add("text-green-600"));
    }
    I(), ue(), ne();
  }
  function Mt(l) {
    const o = document.querySelector(`.field-definition-entry[data-field-definition-id="${l}"]`);
    return o ? {
      id: l,
      type: o.querySelector(".field-type-select")?.value || "text",
      participant_id: o.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function ri(l) {
    return l >= 0.9 ? "bg-green-100 text-green-800" : l >= 0.7 ? "bg-blue-100 text-blue-800" : l >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function ai(l) {
    return l >= 0.8 ? "bg-green-100 text-green-800" : l >= 0.6 ? "bg-blue-100 text-blue-800" : l >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function oi(l) {
    return l ? l.split("_").map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(" ") : "Unknown";
  }
  async function ci(l, o) {
  }
  function Bt(l, o = "info") {
    const m = document.createElement("div");
    m.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${o === "success" ? "bg-green-600 text-white" : o === "error" ? "bg-red-600 text-white" : o === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, m.textContent = l, document.body.appendChild(m), setTimeout(() => {
      m.style.opacity = "0", setTimeout(() => m.remove(), 300);
    }, 3e3);
  }
  function li() {
    const l = document.getElementById("send-readiness-loading"), o = document.getElementById("send-readiness-results"), m = document.getElementById("send-validation-status"), f = document.getElementById("send-validation-issues"), w = document.getElementById("send-issues-list"), S = document.getElementById("send-confirmation"), E = document.getElementById("review-agreement-title"), T = document.getElementById("review-document-title"), L = document.getElementById("review-participant-count"), M = document.getElementById("review-stage-count"), B = document.getElementById("review-participants-list"), q = document.getElementById("review-fields-summary"), G = document.getElementById("title").value || "Untitled", Y = Qe.textContent || "No document", Z = ae.querySelectorAll(".participant-entry"), ee = he.querySelectorAll(".field-definition-entry"), ie = dt(Me(), Ge()), Ie = Ce(), ye = /* @__PURE__ */ new Set();
    Z.forEach((Q) => {
      const be = Q.querySelector(".signing-stage-input");
      Q.querySelector('select[name*=".role"]').value === "signer" && be?.value && ye.add(parseInt(be.value, 10));
    }), E.textContent = G, T.textContent = Y, L.textContent = `${Z.length} (${Ie.length} signers)`, M.textContent = ye.size > 0 ? ye.size : "1", B.innerHTML = "", Z.forEach((Q) => {
      const be = Q.querySelector('input[name*=".name"]'), fn = Q.querySelector('input[name*=".email"]'), yn = Q.querySelector('select[name*=".role"]'), Dn = Q.querySelector(".signing-stage-input"), vn = document.createElement("div");
      vn.className = "flex items-center justify-between text-sm", vn.innerHTML = `
        <div>
          <span class="font-medium">${Ee(be.value || fn.value)}</span>
          <span class="text-gray-500 ml-2">${Ee(fn.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${yn.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${yn.value === "signer" ? "Signer" : "CC"}
          </span>
          ${yn.value === "signer" && Dn?.value ? `<span class="text-xs text-gray-500">Stage ${Dn.value}</span>` : ""}
        </div>
      `, B.appendChild(vn);
    });
    const Fe = ee.length + ie.length;
    q.textContent = `${Fe} field${Fe !== 1 ? "s" : ""} defined (${ee.length} manual, ${ie.length} generated)`;
    const ve = [];
    xe.value || ve.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), Ie.length === 0 && ve.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), Tt().forEach((Q) => {
      ve.push({
        severity: "error",
        message: `${Q.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Bn = Array.from(ye).sort((Q, be) => Q - be);
    for (let Q = 0; Q < Bn.length; Q++)
      if (Bn[Q] !== Q + 1) {
        ve.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const yi = ve.some((Q) => Q.severity === "error"), vi = ve.some((Q) => Q.severity === "warning");
    yi ? (m.className = "p-4 rounded-lg bg-red-50 border border-red-200", m.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, S.classList.add("hidden"), Se.disabled = !0) : vi ? (m.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", m.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, S.classList.remove("hidden"), Se.disabled = !1) : (m.className = "p-4 rounded-lg bg-green-50 border border-green-200", m.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, S.classList.remove("hidden"), Se.disabled = !1), ve.length > 0 ? (f.classList.remove("hidden"), w.innerHTML = "", ve.forEach((Q) => {
      const be = document.createElement("li");
      be.className = `p-3 rounded-lg flex items-center justify-between ${Q.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, be.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Q.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Q.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${Ee(Q.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Q.step}">
            ${Ee(Q.action)}
          </button>
        `, w.appendChild(be);
    }), w.querySelectorAll("[data-go-to-step]").forEach((Q) => {
      Q.addEventListener("click", () => {
        const be = Number(Q.getAttribute("data-go-to-step"));
        Number.isFinite(be) && Be(be);
      });
    })) : f.classList.add("hidden"), l.classList.add("hidden"), o.classList.remove("hidden");
  }
  let hn = null;
  function De() {
    hn && clearTimeout(hn), hn = setTimeout(() => {
      st();
    }, 500);
  }
  xe && new MutationObserver(() => {
    st();
  }).observe(xe, { attributes: !0, attributeFilter: ["value"] });
  const di = document.getElementById("title"), ui = document.getElementById("message");
  di?.addEventListener("input", De), ui?.addEventListener("input", De), ae.addEventListener("input", De), ae.addEventListener("change", De), he.addEventListener("input", De), he.addEventListener("change", De), de?.addEventListener("input", De), de?.addEventListener("change", De);
  const pi = ne;
  ne = function() {
    pi(), st();
  };
  function gi() {
    const l = K.getState();
    !l.participants || l.participants.length === 0 || (ae.innerHTML = "", Ft = 0, l.participants.forEach((o) => {
      qe({
        id: o.tempId,
        name: o.name,
        email: o.email,
        role: o.role,
        signing_stage: o.signingStage
      });
    }));
  }
  function mi() {
    const l = K.getState();
    !l.fieldDefinitions || l.fieldDefinitions.length === 0 || (he.innerHTML = "", tt = 0, l.fieldDefinitions.forEach((o) => {
      ut({
        id: o.tempId,
        type: o.type,
        participant_id: o.participantTempId,
        page: o.page,
        required: o.required
      });
    }), We());
  }
  function hi() {
    const l = K.getState();
    !Array.isArray(l.fieldRules) || l.fieldRules.length === 0 || de && (de.querySelectorAll(".field-rule-entry").forEach((o) => o.remove()), kt = 0, l.fieldRules.forEach((o) => {
      Nt({
        id: o.id,
        type: o.type,
        participantId: o.participantId || o.participantTempId,
        fromPage: o.fromPage,
        toPage: o.toPage,
        page: o.page,
        excludeLastPage: o.excludeLastPage,
        excludePages: o.excludePages,
        required: o.required
      });
    }), ct(), pe());
  }
  function fi() {
    const l = K.getState();
    !Array.isArray(l.fieldPlacements) || l.fieldPlacements.length === 0 || (A.fieldInstances = l.fieldPlacements.map((o, m) => pt(o, m)), ne());
  }
  window._resumeToStep ? (gi(), mi(), hi(), we(), fi(), te = window._resumeToStep, Ae(), delete window._resumeToStep) : Ae(), a && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function Hi(s) {
  return {
    base_path: String(s.base_path || s.basePath || "").trim(),
    api_base_path: String(s.api_base_path || s.apiBasePath || "").trim(),
    user_id: String(s.user_id || "").trim(),
    is_edit: !!(s.is_edit ?? s.isEditMode),
    create_success: !!(s.create_success ?? s.createSuccess),
    submit_mode: String(s.submit_mode || "form").trim().toLowerCase(),
    routes: {
      index: String(s.routes?.index || "").trim(),
      documents: String(s.routes?.documents || "").trim(),
      create: String(s.routes?.create || "").trim(),
      documents_upload_url: String(s.routes?.documents_upload_url || "").trim()
    },
    initial_participants: Array.isArray(s.initial_participants) ? s.initial_participants : [],
    initial_field_instances: Array.isArray(s.initial_field_instances) ? s.initial_field_instances : []
  };
}
class Zn {
  constructor(e) {
    this.initialized = !1, this.config = Hi(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Ri(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function Xs(s) {
  const e = new Zn(s);
  return W(() => e.init()), e;
}
function ji(s) {
  const e = new Zn({
    basePath: s.basePath,
    apiBasePath: s.apiBasePath,
    base_path: s.base_path,
    api_base_path: s.api_base_path,
    user_id: s.user_id,
    isEditMode: s.isEditMode,
    is_edit: s.is_edit,
    createSuccess: s.createSuccess,
    create_success: s.create_success,
    submit_mode: s.submit_mode || "form",
    initial_participants: s.initial_participants || [],
    initial_field_instances: s.initial_field_instances || [],
    routes: s.routes
  });
  W(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && W(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      ji({
        base_path: t.base_path || t.basePath,
        api_base_path: t.api_base_path || t.apiBasePath,
        user_id: t.user_id || t.userId,
        is_edit: t.is_edit || t.isEditMode || !1,
        create_success: t.create_success || t.createSuccess || !1,
        submit_mode: t.submit_mode || "form",
        initial_participants: Array.isArray(t.initial_participants) ? t.initial_participants : [],
        initial_field_instances: Array.isArray(t.initial_field_instances) ? t.initial_field_instances : [],
        routes: t.routes || { index: "" }
      });
    } catch (t) {
      console.warn("Failed to parse agreement form page config:", t);
    }
});
const qi = "esign.signer.profile.v1", zn = "esign.signer.profile.outbox.v1", kn = 90, Nn = 500 * 1024;
class zi {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : kn;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${qi}:${e}`;
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
    const n = Date.now(), d = {
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
      window.localStorage.setItem(this.storageKey(e), JSON.stringify(d));
    } catch {
    }
    return d;
  }
  async clear(e) {
    try {
      window.localStorage.removeItem(this.storageKey(e));
    } catch {
    }
  }
}
class Ni {
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
      const e = window.localStorage.getItem(zn);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [i, d] of Object.entries(t)) {
        if (!d || typeof d != "object")
          continue;
        const u = d;
        if (u.op === "clear") {
          n[i] = {
            op: "clear",
            updatedAt: Number(u.updatedAt) || Date.now()
          };
          continue;
        }
        const a = u.op === "patch" ? u.patch : u;
        n[i] = {
          op: "patch",
          patch: a && typeof a == "object" ? a : {},
          updatedAt: Number(u.updatedAt) || Date.now()
        };
      }
      return n;
    } catch {
      return {};
    }
  }
  outboxSave(e) {
    try {
      window.localStorage.setItem(zn, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), i = n[e], d = i?.op === "patch" ? i.patch || {} : {};
    n[e] = {
      op: "patch",
      patch: { ...d, ...t, updatedAt: Date.now() },
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
      ]), d = this.pickLatest(n, i);
      return d && await this.localStore.save(e, d), await this.flushOutboxForKey(e), d;
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
function Oi(s) {
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
      ttlDays: Number(s.profile?.ttlDays || kn) || kn,
      persistDrawnSignature: !!s.profile?.persistDrawnSignature,
      endpointBasePath: String(s.profile?.endpointBasePath || String(s.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Ui(s) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = s.recipientEmail ? s.recipientEmail.trim().toLowerCase() : s.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function In(s) {
  const e = String(s || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Vi(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Oe(s) {
  const e = String(s || "").trim();
  return Vi(e) ? "" : e;
}
function Gi(s) {
  const e = new zi(s.profile.ttlDays), t = new Ni(s.profile.endpointBasePath, s.token);
  return s.profile.mode === "local_only" ? new Sn("local_only", e, null) : s.profile.mode === "remote_only" ? new Sn("remote_only", e, t) : new Sn("hybrid", e, t);
}
function Wi() {
  const s = window;
  s.pdfjsLib && s.pdfjsLib.GlobalWorkerOptions && (s.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Ji(s) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Oi(s), i = Ui(n), d = Gi(n);
  Wi();
  const u = {
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
    track(r, c = {}) {
      if (!n.telemetryEnabled) return;
      const p = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...c
      };
      this.events.push(p), this.isCriticalEvent(r) && this.flush();
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
    trackViewerLoad(r, c, p = null) {
      this.metrics.viewerLoadTime = c, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: c,
        error: p,
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
    trackFieldSave(r, c, p, h, y = null) {
      this.metrics.fieldSaveLatencies.push(h), p ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: y }), this.track(p ? "field_save_success" : "field_save_failed", {
        fieldId: r,
        fieldType: c,
        latency: h,
        error: y
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
    trackSignatureAttach(r, c, p, h, y = null) {
      this.metrics.signatureAttachLatencies.push(h), this.track(p ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: r,
        signatureType: c,
        latency: h,
        error: y
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
    trackSubmit(r, c = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(r ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: a.fieldState.size,
        error: c
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
    trackDegradedMode(r, c = {}) {
      this.track("degraded_mode", {
        degradationType: r,
        ...c
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
      return r.length ? Math.round(r.reduce((c, p) => c + p, 0) / r.length) : 0;
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
          const c = JSON.stringify({
            events: r,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, c);
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
      } catch (c) {
        this.events = [...r, ...this.events], console.warn("Telemetry flush failed:", c);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    u.track("session_end", u.getSessionSummary()), u.flush();
  }), setInterval(() => u.flush(), 3e4);
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
    guidedTargetFieldId: null,
    writeCooldownUntil: 0,
    writeCooldownTimer: null,
    submitCooldownUntil: 0,
    submitCooldownTimer: null,
    isSubmitting: !1
  }, x = {
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
      const c = n.viewer.pages?.find((h) => h.page === r);
      if (c)
        return {
          width: c.width,
          height: c.height,
          rotation: c.rotation || 0
        };
      const p = this.pageViewports.get(r);
      return p ? {
        width: p.width,
        height: p.height,
        rotation: p.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(r, c) {
      this.pageViewports.set(r, {
        width: c.width,
        height: c.height,
        rotation: c.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(r, c) {
      const p = r.page, h = this.getPageMetadata(p), y = c.offsetWidth, b = c.offsetHeight, I = r.pageWidth || h.width, _ = r.pageHeight || h.height, R = y / I, V = b / _;
      let O = r.posX || 0, re = r.posY || 0;
      n.viewer.origin === "bottom-left" && (re = _ - re - (r.height || 30));
      const ue = O * R, ne = re * V, j = (r.width || 150) * R, J = (r.height || 30) * V;
      return {
        left: ue,
        top: ne,
        width: j,
        height: J,
        // Store original values for debugging
        _debug: {
          sourceX: O,
          sourceY: re,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: I,
          pageHeight: _,
          scaleX: R,
          scaleY: V,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, c) {
      const p = this.pageToScreen(r, c);
      return {
        left: `${Math.round(p.left)}px`,
        top: `${Math.round(p.top)}px`,
        width: `${Math.round(p.width)}px`,
        height: `${Math.round(p.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, v = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(r, c, p, h) {
      const y = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: c,
            content_type: p,
            size_bytes: h
          })
        }
      );
      if (!y.ok)
        throw await pe(y, "Failed to get upload contract");
      const b = await y.json(), I = b?.contract || b;
      if (!I || typeof I != "object" || !I.upload_url)
        throw new Error("Invalid upload contract response");
      return I;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, c) {
      const p = new URL(r.upload_url, window.location.origin);
      r.upload_token && p.searchParams.set("upload_token", String(r.upload_token)), r.object_key && p.searchParams.set("object_key", String(r.object_key));
      const h = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([b, I]) => {
        const _ = String(b).toLowerCase();
        _ === "x-esign-upload-token" || _ === "x-esign-upload-key" || (h[b] = String(I));
      });
      const y = await fetch(p.toString(), {
        method: r.method || "PUT",
        headers: h,
        body: c,
        credentials: "omit"
      });
      if (!y.ok)
        throw await pe(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [c, p] = r.split(","), h = c.match(/data:([^;]+)/), y = h ? h[1] : "image/png", b = atob(p), I = new Uint8Array(b.length);
      for (let _ = 0; _ < b.length; _++)
        I[_] = b.charCodeAt(_);
      return new Blob([I], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, c) {
      const p = this.dataUrlToBlob(c), h = p.size, y = "image/png", b = await He(p), I = await this.requestUploadBootstrap(
        r,
        b,
        y,
        h
      );
      return await this.uploadToSignedUrl(I, p), {
        uploadToken: I.upload_token,
        objectKey: I.object_key,
        sha256: I.sha256,
        contentType: I.content_type
      };
    }
  }, C = {
    endpoint(r, c = "") {
      const p = encodeURIComponent(r), h = c ? `/${encodeURIComponent(c)}` : "";
      return `${n.apiBasePath}/signatures/${p}${h}`;
    },
    async list(r) {
      const c = new URL(this.endpoint(n.token), window.location.origin);
      c.searchParams.set("type", r);
      const p = await fetch(c.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!p.ok) {
        const y = await p.json().catch(() => ({}));
        throw new Error(y?.error?.message || "Failed to load saved signatures");
      }
      const h = await p.json();
      return Array.isArray(h?.signatures) ? h.signatures : [];
    },
    async save(r, c, p = "") {
      const h = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: p,
          data_url: c
        })
      });
      if (!h.ok) {
        const b = await h.json().catch(() => ({})), I = new Error(b?.error?.message || "Failed to save signature");
        throw I.code = b?.error?.code || "", I;
      }
      return (await h.json())?.signature || null;
    },
    async delete(r) {
      const c = await fetch(this.endpoint(n.token, r), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!c.ok) {
        const p = await c.json().catch(() => ({}));
        throw new Error(p?.error?.message || "Failed to delete signature");
      }
    }
  };
  function P(r) {
    const c = a.fieldState.get(r);
    return c && c.type === "initials" ? "initials" : "signature";
  }
  function H(r) {
    return a.savedSignaturesByType.get(r) || [];
  }
  async function F(r, c = !1) {
    const p = P(r);
    if (!c && a.savedSignaturesByType.has(p)) {
      D(r);
      return;
    }
    const h = await C.list(p);
    a.savedSignaturesByType.set(p, h), D(r);
  }
  function D(r) {
    const c = P(r), p = H(c), h = document.getElementById("sig-saved-list");
    if (h) {
      if (!p.length) {
        h.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      h.innerHTML = p.map((y) => {
        const b = Re(String(y?.thumbnail_data_url || y?.data_url || "")), I = Re(String(y?.label || "Saved signature")), _ = Re(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${b}" alt="${I}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${I}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Re(r)}" data-signature-id="${_}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Re(r)}" data-signature-id="${_}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function z(r) {
    const c = a.signatureCanvases.get(r), p = P(r);
    if (!c || !jt(r))
      throw new Error(`Please add your ${p === "initials" ? "initials" : "signature"} first`);
    const h = c.canvas.toDataURL("image/png"), y = await C.save(p, h, p === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const b = H(p);
    b.unshift(y), a.savedSignaturesByType.set(p, b), D(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function N(r, c) {
    const p = P(r), y = H(p).find((I) => String(I?.id || "") === String(c));
    if (!y) return;
    requestAnimationFrame(() => ot(r)), await se(r);
    const b = String(y.data_url || y.thumbnail_data_url || "").trim();
    b && (await Ce(r, b, { clearStrokes: !0 }), tt("draw", r), oe("Saved signature selected."));
  }
  async function U(r, c) {
    const p = P(r);
    await C.delete(c);
    const h = H(p).filter((y) => String(y?.id || "") !== String(c));
    a.savedSignaturesByType.set(p, h), D(r);
  }
  function X(r) {
    const c = String(r?.code || "").trim(), p = String(r?.message || "Unable to update saved signatures"), h = c === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : p;
    window.toastManager && window.toastManager.error(h), oe(h, "assertive");
  }
  async function se(r, c = 8) {
    for (let p = 0; p < c; p++) {
      if (a.signatureCanvases.has(r)) return !0;
      await new Promise((h) => setTimeout(h, 40)), ot(r);
    }
    return !1;
  }
  async function ce(r, c) {
    const p = String(c?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(p))
      throw new Error("Only PNG and JPEG images are supported");
    if (c.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => ot(r)), await se(r);
    const h = a.signatureCanvases.get(r);
    if (!h)
      throw new Error("Signature canvas is not ready");
    const y = await fe(c), b = p === "image/png" ? y : await _e(y, h.drawWidth, h.drawHeight);
    if (Ye(b) > Nn)
      throw new Error(`Image exceeds ${Math.round(Nn / 1024)}KB limit after conversion`);
    await Ce(r, b, { clearStrokes: !0 });
    const _ = document.getElementById("sig-upload-preview-wrap"), R = document.getElementById("sig-upload-preview");
    _ && _.classList.remove("hidden"), R && R.setAttribute("src", b), oe("Signature image uploaded. You can now insert it.");
  }
  function fe(r) {
    return new Promise((c, p) => {
      const h = new FileReader();
      h.onload = () => c(String(h.result || "")), h.onerror = () => p(new Error("Unable to read image file")), h.readAsDataURL(r);
    });
  }
  function Ye(r) {
    const c = String(r || "").split(",");
    if (c.length < 2) return 0;
    const p = c[1] || "", h = (p.match(/=+$/) || [""])[0].length;
    return Math.floor(p.length * 3 / 4) - h;
  }
  async function _e(r, c, p) {
    return await new Promise((h, y) => {
      const b = new Image();
      b.onload = () => {
        const I = document.createElement("canvas"), _ = Math.max(1, Math.round(Number(c) || 600)), R = Math.max(1, Math.round(Number(p) || 160));
        I.width = _, I.height = R;
        const V = I.getContext("2d");
        if (!V) {
          y(new Error("Unable to process image"));
          return;
        }
        V.clearRect(0, 0, _, R);
        const O = Math.min(_ / b.width, R / b.height), re = b.width * O, ue = b.height * O, ne = (_ - re) / 2, j = (R - ue) / 2;
        V.drawImage(b, ne, j, re, ue), h(I.toDataURL("image/png"));
      }, b.onerror = () => y(new Error("Unable to decode image file")), b.src = r;
    });
  }
  async function He(r) {
    if (window.crypto && window.crypto.subtle) {
      const c = await r.arrayBuffer(), p = await window.crypto.subtle.digest("SHA-256", c);
      return Array.from(new Uint8Array(p)).map((h) => h.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function Ue() {
    document.addEventListener("click", (r) => {
      const c = r.target;
      if (!(c instanceof Element)) return;
      const p = c.closest("[data-esign-action]");
      if (!p) return;
      switch (p.getAttribute("data-esign-action")) {
        case "prev-page":
          tn();
          break;
        case "next-page":
          Ft();
          break;
        case "zoom-out":
          nn();
          break;
        case "zoom-in":
          he();
          break;
        case "fit-width":
          xt();
          break;
        case "download-document":
          Wt();
          break;
        case "show-consent-modal":
          _t();
          break;
        case "activate-field": {
          const y = p.getAttribute("data-field-id");
          y && et(y);
          break;
        }
        case "submit-signature":
          Ut();
          break;
        case "show-decline-modal":
          on();
          break;
        case "close-field-editor":
          lt();
          break;
        case "save-field-editor":
          Nt();
          break;
        case "hide-consent-modal":
          Pe();
          break;
        case "accept-consent":
          te();
          break;
        case "hide-decline-modal":
          Vt();
          break;
        case "confirm-decline":
          Gt();
          break;
        case "retry-load-pdf":
          Ze();
          break;
        case "signature-tab": {
          const y = p.getAttribute("data-tab") || "draw", b = p.getAttribute("data-field-id");
          b && tt(y, b);
          break;
        }
        case "clear-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Me(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Ge(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && ct(y);
          break;
        }
        case "save-current-signature-library": {
          const y = p.getAttribute("data-field-id");
          y && z(y).catch(X);
          break;
        }
        case "select-saved-signature": {
          const y = p.getAttribute("data-field-id"), b = p.getAttribute("data-signature-id");
          y && b && N(y, b).catch(X);
          break;
        }
        case "delete-saved-signature": {
          const y = p.getAttribute("data-field-id"), b = p.getAttribute("data-signature-id");
          y && b && U(y, b).catch(X);
          break;
        }
        case "clear-signer-profile":
          vt().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Ae.togglePanel();
          break;
        case "debug-copy-session":
          Ae.copySessionInfo();
          break;
        case "debug-clear-cache":
          Ae.clearCache();
          break;
        case "debug-show-telemetry":
          Ae.showTelemetry();
          break;
        case "debug-reload-viewer":
          Ae.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const c = r.target;
      if (!(c instanceof HTMLInputElement) || !c.matches("#sig-upload-input")) return;
      const p = c.getAttribute("data-field-id"), h = c.files?.[0];
      !p || !h || ce(p, h).catch((y) => {
        window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
      });
    });
  }
  W(async () => {
    Ue(), a.isLowMemory = je(), it(), await xe(), st(), Xe(), Pt(), ke(), await Ze(), at(), document.addEventListener("visibilitychange", K), "memory" in navigator && $e(), Ae.init();
  });
  function K() {
    document.hidden && le();
  }
  function le() {
    const r = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > r; ) {
      let c = null, p = 1 / 0;
      if (a.renderedPages.forEach((h, y) => {
        y !== a.currentPage && h.timestamp < p && (c = y, p = h.timestamp);
      }), c !== null)
        a.renderedPages.delete(c);
      else
        break;
    }
  }
  function $e() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, c = navigator.memory.totalJSHeapSize;
        r / c > 0.8 && (a.isLowMemory = !0, le());
      }
    }, 3e4);
  }
  function it() {
    const r = document.getElementById("stage-state-banner"), c = document.getElementById("stage-state-icon"), p = document.getElementById("stage-state-title"), h = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !c || !p || !h || !y) return;
    const b = n.signerState || "active", I = n.recipientStage || 1, _ = n.activeStage || 1, R = n.activeRecipientIds || [], V = n.waitingForRecipientIds || [];
    let O = {
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
        O = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: I > _ ? `You are in signing stage ${I}. Stage ${_} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, V.length > 0 && O.badges.push({
          icon: "iconoir-group",
          text: `${V.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        O = {
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
        O = {
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
        R.length > 1 ? (O.message = `You and ${R.length - 1} other signer(s) can sign now.`, O.badges = [
          { icon: "iconoir-users", text: `Stage ${_} active`, variant: "green" }
        ]) : I > 1 ? O.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${I}`, variant: "green" }
        ] : O.hidden = !0;
        break;
    }
    if (O.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${O.bgClass} ${O.borderClass}`, c.className = `${O.iconClass} mt-0.5`, p.className = `text-sm font-semibold ${O.titleClass}`, p.textContent = O.title, h.className = `text-xs ${O.messageClass} mt-1`, h.textContent = O.message, y.innerHTML = "", O.badges.forEach((re) => {
      const ue = document.createElement("span"), ne = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      ue.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ne[re.variant] || ne.blue}`, ue.innerHTML = `<i class="${re.icon} mr-1"></i>${re.text}`, y.appendChild(ue);
    });
  }
  function st() {
    n.fields.forEach((r) => {
      let c = null, p = !1;
      if (r.type === "checkbox")
        c = r.value_bool || !1, p = c;
      else if (r.type === "date_signed")
        c = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], p = !0;
      else {
        const h = String(r.value_text || "");
        c = h || ht(r), p = !!h;
      }
      a.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: c,
        completed: p,
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
  async function xe() {
    try {
      const r = await d.load(a.profileKey);
      r && (a.profileData = r, a.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function ht(r) {
    const c = a.profileData;
    if (!c) return "";
    const p = String(r?.type || "").trim();
    return p === "name" ? Oe(c.fullName || "") : p === "initials" ? Oe(c.initials || "") || In(c.fullName || n.recipientName || "") : p === "signature" ? Oe(c.typedSignature || "") : "";
  }
  function ft(r) {
    return !n.profile.persistDrawnSignature || !a.profileData ? "" : r?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function yt(r) {
    const c = Oe(r?.value || "");
    return c || (a.profileData ? r?.type === "initials" ? Oe(a.profileData.initials || "") || In(a.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? Oe(a.profileData.typedSignature || "") : "" : "");
  }
  function Ke() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : a.profileRemember;
  }
  async function vt(r = !1) {
    let c = null;
    try {
      await d.clear(a.profileKey);
    } catch (p) {
      c = p;
    } finally {
      a.profileData = null, a.profileRemember = n.profile.rememberByDefault;
    }
    if (c) {
      if (!r && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !r)
        throw c;
      return;
    }
    !r && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Qe(r, c = {}) {
    const p = Ke();
    if (a.profileRemember = p, !p) {
      await vt(!0);
      return;
    }
    if (!r) return;
    const h = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const b = Oe(r.value);
      b && (h.fullName = b, (a.profileData?.initials || "").trim() || (h.initials = In(b)));
    }
    if (y === "initials") {
      if (c.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof c.signatureDataUrl == "string")
        h.drawnInitialsDataUrl = c.signatureDataUrl;
      else if (typeof r.value == "string") {
        const b = Oe(r.value);
        b && (h.initials = b);
      }
    }
    if (y === "signature") {
      if (c.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof c.signatureDataUrl == "string")
        h.drawnSignatureDataUrl = c.signatureDataUrl;
      else if (typeof r.value == "string") {
        const b = Oe(r.value);
        b && (h.typedSignature = b);
      }
    }
    if (!(Object.keys(h).length === 1 && h.remember === !0))
      try {
        const b = await d.save(a.profileKey, h);
        a.profileData = b;
      } catch {
      }
  }
  function Xe() {
    const r = document.getElementById("consent-checkbox"), c = document.getElementById("consent-accept-btn");
    r && c && r.addEventListener("change", function() {
      c.disabled = !this.checked;
    });
  }
  function je() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Ve() {
    const r = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= r) return;
    const c = [];
    for (a.renderedPages.forEach((p, h) => {
      const y = Math.abs(h - a.currentPage);
      c.push({ pageNum: h, distance: y });
    }), c.sort((p, h) => h.distance - p.distance); a.renderedPages.size > r && c.length > 0; ) {
      const p = c.shift();
      p && p.pageNum !== a.currentPage && a.renderedPages.delete(p.pageNum);
    }
  }
  function wt(r) {
    if (a.isLowMemory) return;
    const c = [];
    r > 1 && c.push(r - 1), r < n.pageCount && c.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      c.forEach(async (p) => {
        !a.renderedPages.has(p) && !a.pageRendering && await Zt(p);
      });
    }, { timeout: 2e3 });
  }
  async function Zt(r) {
    if (!(!a.pdfDoc || a.renderedPages.has(r)))
      try {
        const c = await a.pdfDoc.getPage(r), p = a.zoomLevel, h = c.getViewport({ scale: p * window.devicePixelRatio }), y = document.createElement("canvas"), b = y.getContext("2d");
        y.width = h.width, y.height = h.height;
        const I = {
          canvasContext: b,
          viewport: h
        };
        await c.render(I).promise, a.renderedPages.set(r, {
          canvas: y,
          scale: p,
          timestamp: Date.now()
        }), Ve();
      } catch (c) {
        console.warn("Preload failed for page", r, c);
      }
  }
  function en() {
    const r = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function Ze() {
    const r = document.getElementById("pdf-loading"), c = Date.now();
    try {
      const p = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!p.ok)
        throw new Error("Failed to load document");
      const y = (await p.json()).assets || {}, b = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!b)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const I = pdfjsLib.getDocument(b);
      a.pdfDoc = await I.promise, n.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await rt(1), qe(), u.trackViewerLoad(!0, Date.now() - c), u.trackPageView(1);
    } catch (p) {
      console.error("PDF load error:", p), u.trackViewerLoad(!1, Date.now() - c, p.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), $t();
    }
  }
  async function rt(r) {
    if (!a.pdfDoc) return;
    const c = a.renderedPages.get(r);
    if (c && c.scale === a.zoomLevel) {
      Ee(c), a.currentPage = r, document.getElementById("current-page").textContent = r, at(), wt(r);
      return;
    }
    a.pageRendering = !0;
    try {
      const p = await a.pdfDoc.getPage(r), h = a.zoomLevel, y = en(), b = p.getViewport({ scale: h * y }), I = p.getViewport({ scale: 1 });
      x.setPageViewport(r, {
        width: I.width,
        height: I.height,
        rotation: I.rotation || 0
      });
      const _ = document.getElementById("pdf-page-1");
      _.innerHTML = "";
      const R = document.createElement("canvas"), V = R.getContext("2d");
      R.height = b.height, R.width = b.width, R.style.width = `${b.width / y}px`, R.style.height = `${b.height / y}px`, _.appendChild(R);
      const O = document.getElementById("pdf-container");
      O.style.width = `${b.width / y}px`;
      const re = {
        canvasContext: V,
        viewport: b
      };
      await p.render(re).promise, a.renderedPages.set(r, {
        canvas: R.cloneNode(!0),
        scale: h,
        timestamp: Date.now(),
        displayWidth: b.width / y,
        displayHeight: b.height / y
      }), a.renderedPages.get(r).canvas.getContext("2d").drawImage(R, 0, 0), Ve(), a.currentPage = r, document.getElementById("current-page").textContent = r, at(), u.trackPageView(r), wt(r);
    } catch (p) {
      console.error("Page render error:", p);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const p = a.pageNumPending;
        a.pageNumPending = null, await rt(p);
      }
    }
  }
  function Ee(r, c) {
    const p = document.getElementById("pdf-page-1");
    p.innerHTML = "";
    const h = document.createElement("canvas");
    h.width = r.canvas.width, h.height = r.canvas.height, h.style.width = `${r.displayWidth}px`, h.style.height = `${r.displayHeight}px`, h.getContext("2d").drawImage(r.canvas, 0, 0), p.appendChild(h);
    const b = document.getElementById("pdf-container");
    b.style.width = `${r.displayWidth}px`;
  }
  function ae(r) {
    a.pageRendering ? a.pageNumPending = r : rt(r);
  }
  function at() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const c = document.getElementById("pdf-container");
    a.fieldState.forEach((p, h) => {
      if (p.page !== a.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = h, p.required && y.classList.add("required"), p.completed && y.classList.add("completed"), a.activeFieldId === h && y.classList.add("active"), p.posX != null && p.posY != null && p.width != null && p.height != null) {
        const _ = x.getOverlayStyles(p, c);
        y.style.left = _.left, y.style.top = _.top, y.style.width = _.width, y.style.height = _.height, y.style.transform = _.transform, Ae.enabled && (y.dataset.debugCoords = JSON.stringify(
          x.pageToScreen(p, c)._debug
        ));
      } else {
        const _ = Array.from(a.fieldState.keys()).indexOf(h);
        y.style.left = "10px", y.style.top = `${100 + _ * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const I = document.createElement("span");
      I.className = "field-overlay-label", I.textContent = bt(p.type), y.appendChild(I), y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${bt(p.type)} field${p.required ? ", required" : ""}${p.completed ? ", completed" : ""}`), y.addEventListener("click", () => et(h)), y.addEventListener("keydown", (_) => {
        (_.key === "Enter" || _.key === " ") && (_.preventDefault(), et(h));
      }), r.appendChild(y);
    });
  }
  function bt(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function tn() {
    a.currentPage <= 1 || (ae(a.currentPage - 1), qe());
  }
  function Ft() {
    a.currentPage >= n.pageCount || (ae(a.currentPage + 1), qe());
  }
  function Rt(r) {
    r < 1 || r > n.pageCount || (ae(r), qe());
  }
  function qe() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= n.pageCount;
  }
  function he() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), St(), ae(a.currentPage);
  }
  function nn() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), St(), ae(a.currentPage);
  }
  function xt() {
    const c = document.getElementById("viewer-content").offsetWidth - 32, p = 612;
    a.zoomLevel = c / p, St(), ae(a.currentPage);
  }
  function St() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function et(r) {
    if (!a.hasConsented && n.fields.some((c) => c.id === r && c.type !== "date_signed")) {
      _t();
      return;
    }
    de(r, { openEditor: !0 });
  }
  function de(r, c = { openEditor: !0 }) {
    const p = a.fieldState.get(r);
    if (p) {
      if (c.openEditor && (a.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((h) => h.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((h) => h.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), p.page !== a.currentPage && Rt(p.page), !c.openEditor) {
        It(r);
        return;
      }
      p.type !== "date_signed" && sn(r);
    }
  }
  function It(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function sn(r) {
    const c = a.fieldState.get(r);
    if (!c) return;
    const p = document.getElementById("field-editor-overlay"), h = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), b = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = Et(c.type), h.innerHTML = Ct(c), b?.classList.toggle("hidden", !(c.type === "signature" || c.type === "initials")), (c.type === "signature" || c.type === "initials") && kt(r), p.classList.add("active"), p.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(p.querySelector(".field-editor")), oe(`Editing ${Et(c.type)}. Press Escape to cancel.`), setTimeout(() => {
      const I = h.querySelector("input, textarea");
      I ? I.focus() : h.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Le(a.writeCooldownUntil) > 0 && qt(Le(a.writeCooldownUntil));
  }
  function Et(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function Ct(r) {
    const c = Lt(r.type), p = Re(String(r?.id || "")), h = Re(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", b = Re(yt(r)), I = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], _ = Ht(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${I.map((R) => `
            <button
              type="button"
              id="sig-tab-${R.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${_ === R.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${R.id}"
              data-esign-action="signature-tab"
              data-field-id="${p}"
              role="tab"
              aria-selected="${_ === R.id ? "true" : "false"}"
              aria-controls="sig-editor-${R.id}"
              tabindex="${_ === R.id ? "0" : "-1"}"
            >
              ${R.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${_ === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${y}"
              value="${b}"
              data-field-id="${p}"
            />
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${y} will appear as your ${h}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${_ === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${p}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${p}" class="btn btn-secondary text-xs justify-center">
                Undo
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${p}" class="btn btn-secondary text-xs justify-center">
                Redo
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${p}" class="btn btn-secondary text-xs justify-center">
                Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${y} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${_ === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${p}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${_ === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${y}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${p}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <div id="sig-saved-list" class="space-y-2">
              <p class="text-xs text-gray-500">Loading saved signatures...</p>
            </div>
          </div>

          ${c}
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
          value="${Re(String(r.value || ""))}"
          data-field-id="${p}"
        />
        ${c}
      `;
    if (r.type === "text") {
      const y = Re(String(r.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${p}"
        >${y}</textarea>
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
  function Lt(r) {
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
  function Ht(r) {
    const c = String(a.signatureTabByField.get(r) || "").trim();
    return c === "draw" || c === "type" || c === "upload" || c === "saved" ? c : "draw";
  }
  function tt(r, c) {
    const p = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    a.signatureTabByField.set(c, p), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const h = document.querySelector(`.sig-editor-tab[data-tab="${p}"]`);
    h?.classList.add("border-blue-600", "text-blue-600"), h?.classList.remove("border-transparent", "text-gray-500"), h?.setAttribute("aria-selected", "true"), h?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", p !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", p !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", p !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", p !== "saved"), (p === "draw" || p === "upload" || p === "saved") && h && requestAnimationFrame(() => ot(c)), p === "saved" && F(c).catch(X);
  }
  function kt(r) {
    a.signatureTabByField.set(r, "draw"), tt("draw", r);
  }
  function ot(r) {
    const c = document.getElementById("sig-draw-canvas");
    if (!c || a.signatureCanvases.has(r)) return;
    const p = c.closest(".signature-canvas-container"), h = c.getContext("2d");
    if (!h) return;
    const y = c.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const b = window.devicePixelRatio || 1;
    c.width = y.width * b, c.height = y.height * b, h.scale(b, b), h.lineCap = "round", h.lineJoin = "round", h.strokeStyle = "#1f2937", h.lineWidth = 2.5;
    let I = !1, _ = 0, R = 0, V = [];
    const O = (j) => {
      const J = c.getBoundingClientRect();
      let Ne, Te;
      return j.touches && j.touches.length > 0 ? (Ne = j.touches[0].clientX, Te = j.touches[0].clientY) : j.changedTouches && j.changedTouches.length > 0 ? (Ne = j.changedTouches[0].clientX, Te = j.changedTouches[0].clientY) : (Ne = j.clientX, Te = j.clientY), {
        x: Ne - J.left,
        y: Te - J.top,
        timestamp: Date.now()
      };
    }, re = (j) => {
      I = !0;
      const J = O(j);
      _ = J.x, R = J.y, V = [{ x: J.x, y: J.y, t: J.timestamp, width: 2.5 }], p && p.classList.add("drawing");
    }, ue = (j) => {
      if (!I) return;
      const J = O(j);
      V.push({ x: J.x, y: J.y, t: J.timestamp, width: 2.5 });
      const Ne = J.x - _, Te = J.y - R, ln = J.timestamp - (V[V.length - 2]?.t || J.timestamp), dn = Math.sqrt(Ne * Ne + Te * Te) / Math.max(ln, 1), un = 2.5, pn = 1.5, gn = 4, mn = Math.min(dn / 5, 1), Mt = Math.max(pn, Math.min(gn, un - mn * 1.5));
      V[V.length - 1].width = Mt, h.lineWidth = Mt, h.beginPath(), h.moveTo(_, R), h.lineTo(J.x, J.y), h.stroke(), _ = J.x, R = J.y;
    }, ne = () => {
      if (I = !1, V.length > 1) {
        const j = a.signatureCanvases.get(r);
        j && (j.strokes.push(V.map((J) => ({ ...J }))), j.redoStack = []);
      }
      V = [], p && p.classList.remove("drawing");
    };
    c.addEventListener("mousedown", re), c.addEventListener("mousemove", ue), c.addEventListener("mouseup", ne), c.addEventListener("mouseout", ne), c.addEventListener("touchstart", (j) => {
      j.preventDefault(), j.stopPropagation(), re(j);
    }, { passive: !1 }), c.addEventListener("touchmove", (j) => {
      j.preventDefault(), j.stopPropagation(), ue(j);
    }, { passive: !1 }), c.addEventListener("touchend", (j) => {
      j.preventDefault(), ne();
    }, { passive: !1 }), c.addEventListener("touchcancel", ne), c.addEventListener("gesturestart", (j) => j.preventDefault()), c.addEventListener("gesturechange", (j) => j.preventDefault()), c.addEventListener("gestureend", (j) => j.preventDefault()), a.signatureCanvases.set(r, {
      canvas: c,
      ctx: h,
      dpr: b,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), rn(r);
  }
  function rn(r) {
    const c = a.signatureCanvases.get(r), p = a.fieldState.get(r);
    if (!c || !p) return;
    const h = ft(p);
    h && Ce(r, h, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function Ce(r, c, p = { clearStrokes: !1 }) {
    const h = a.signatureCanvases.get(r);
    if (!h) return !1;
    const y = String(c || "").trim();
    if (!y)
      return h.baseImageDataUrl = "", h.baseImage = null, p.clearStrokes && (h.strokes = [], h.redoStack = []), we(r), !0;
    const { drawWidth: b, drawHeight: I } = h, _ = new Image();
    return await new Promise((R) => {
      _.onload = () => {
        p.clearStrokes && (h.strokes = [], h.redoStack = []), h.baseImage = _, h.baseImageDataUrl = y, b > 0 && I > 0 && we(r), R(!0);
      }, _.onerror = () => R(!1), _.src = y;
    });
  }
  function we(r) {
    const c = a.signatureCanvases.get(r);
    if (!c) return;
    const { ctx: p, drawWidth: h, drawHeight: y, baseImage: b, strokes: I } = c;
    if (p.clearRect(0, 0, h, y), b) {
      const _ = Math.min(h / b.width, y / b.height), R = b.width * _, V = b.height * _, O = (h - R) / 2, re = (y - V) / 2;
      p.drawImage(b, O, re, R, V);
    }
    for (const _ of I)
      for (let R = 1; R < _.length; R++) {
        const V = _[R - 1], O = _[R];
        p.lineWidth = Number(O.width || 2.5) || 2.5, p.beginPath(), p.moveTo(V.x, V.y), p.lineTo(O.x, O.y), p.stroke();
      }
  }
  function Ge(r) {
    const c = a.signatureCanvases.get(r);
    if (!c || c.strokes.length === 0) return;
    const p = c.strokes.pop();
    p && c.redoStack.push(p), we(r);
  }
  function ct(r) {
    const c = a.signatureCanvases.get(r);
    if (!c || c.redoStack.length === 0) return;
    const p = c.redoStack.pop();
    p && c.strokes.push(p), we(r);
  }
  function jt(r) {
    const c = a.signatureCanvases.get(r);
    if (!c) return !1;
    if ((c.baseImageDataUrl || "").trim() || c.strokes.length > 0) return !0;
    const { canvas: p, ctx: h } = c;
    return h.getImageData(0, 0, p.width, p.height).data.some((b, I) => I % 4 === 3 && b > 0);
  }
  function Me(r) {
    const c = a.signatureCanvases.get(r);
    c && (c.strokes = [], c.redoStack = [], c.baseImage = null, c.baseImageDataUrl = "", we(r));
    const p = document.getElementById("sig-upload-preview-wrap"), h = document.getElementById("sig-upload-preview");
    p && p.classList.add("hidden"), h && h.removeAttribute("src");
  }
  function lt() {
    const r = document.getElementById("field-editor-overlay"), c = r.querySelector(".field-editor");
    if (pt(c), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const p = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        p?.focus();
      });
    }
    a.activeFieldId = null, a.signatureCanvases.clear(), oe("Field editor closed.");
  }
  function Le(r) {
    const c = Number(r) || 0;
    return c <= 0 ? 0 : Math.max(0, Math.ceil((c - Date.now()) / 1e3));
  }
  function dt(r, c = {}) {
    const p = Number(c.retry_after_seconds);
    if (Number.isFinite(p) && p > 0)
      return Math.ceil(p);
    const h = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!h) return 0;
    const y = Number(h);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function pe(r, c) {
    let p = {};
    try {
      p = await r.json();
    } catch {
      p = {};
    }
    const h = p?.error || {}, y = h?.details && typeof h.details == "object" ? h.details : {}, b = dt(r, y), I = r?.status === 429, _ = I ? b > 0 ? `Too many actions too quickly. Please wait ${b}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(h?.message || c || "Request failed"), R = new Error(_);
    return R.status = r?.status || 0, R.code = String(h?.code || ""), R.details = y, R.rateLimited = I, R.retryAfterSeconds = b, R;
  }
  function qt(r) {
    const c = Math.max(1, Number(r) || 1);
    a.writeCooldownUntil = Date.now() + c * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const p = () => {
      const h = document.getElementById("field-editor-save");
      if (!h) return;
      const y = Le(a.writeCooldownUntil);
      if (y <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (h.disabled = !1, h.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      h.disabled = !0, h.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    p(), a.writeCooldownTimer = setInterval(p, 250);
  }
  function zt(r) {
    const c = Math.max(1, Number(r) || 1);
    a.submitCooldownUntil = Date.now() + c * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const p = () => {
      const h = Le(a.submitCooldownUntil);
      ke(), h <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    p(), a.submitCooldownTimer = setInterval(p, 250);
  }
  async function Nt() {
    const r = a.activeFieldId;
    if (!r) return;
    const c = a.fieldState.get(r);
    if (!c) return;
    const p = Le(a.writeCooldownUntil);
    if (p > 0) {
      const y = `Please wait ${p}s before saving again.`;
      window.toastManager && window.toastManager.error(y), oe(y, "assertive");
      return;
    }
    const h = document.getElementById("field-editor-save");
    h.disabled = !0, h.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = Ke();
      let y = !1;
      if (c.type === "signature" || c.type === "initials")
        y = await ut(r);
      else if (c.type === "checkbox") {
        const b = document.getElementById("field-checkbox-input");
        y = await We(r, null, b?.checked || !1);
      } else {
        const I = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!I && c.required)
          throw new Error("This field is required");
        y = await We(r, I, null);
      }
      if (y) {
        lt(), Pt(), ke(), cn(), at(), At(r), Tt(r);
        const b = A();
        b.allRequiredComplete ? oe("Field saved. All required fields complete. Ready to submit.") : oe(`Field saved. ${b.remainingRequired} required field${b.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && qt(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), oe(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (Le(a.writeCooldownUntil) > 0) {
        const y = Le(a.writeCooldownUntil);
        h.disabled = !0, h.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        h.disabled = !1, h.innerHTML = "Insert";
    }
  }
  async function ut(r) {
    const c = a.fieldState.get(r), p = document.getElementById("sig-type-input"), h = Ht(r);
    if (h === "draw" || h === "upload" || h === "saved") {
      const b = a.signatureCanvases.get(r);
      if (!b) return !1;
      if (!jt(r))
        throw new Error(c?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const I = b.canvas.toDataURL("image/png");
      return await an(r, { type: "drawn", dataUrl: I }, c?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const b = p?.value?.trim();
      if (!b)
        throw new Error(c?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return c.type === "initials" ? await We(r, b, null) : await an(r, { type: "typed", text: b }, b);
    }
  }
  async function We(r, c, p) {
    a.pendingSaves.add(r);
    const h = Date.now(), y = a.fieldState.get(r);
    try {
      const b = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: c,
          value_bool: p
        })
      });
      if (!b.ok)
        throw await pe(b, "Failed to save field");
      const I = a.fieldState.get(r);
      return I && (I.value = c ?? p, I.completed = !0, I.hasError = !1), await Qe(I), window.toastManager && window.toastManager.success("Field saved"), u.trackFieldSave(r, I?.type, !0, Date.now() - h), !0;
    } catch (b) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = b.message), u.trackFieldSave(r, y?.type, !1, Date.now() - h, b.message), b;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function an(r, c, p) {
    a.pendingSaves.add(r);
    const h = Date.now(), y = c?.type || "typed";
    try {
      let b;
      if (y === "drawn") {
        const R = await v.uploadDrawnSignature(
          r,
          c.dataUrl
        );
        b = {
          field_instance_id: r,
          type: "drawn",
          value_text: p,
          object_key: R.objectKey,
          sha256: R.sha256,
          upload_token: R.uploadToken
        };
      } else
        b = await ze(r, p);
      const I = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b)
      });
      if (!I.ok)
        throw await pe(I, "Failed to save signature");
      const _ = a.fieldState.get(r);
      return _ && (_.value = p, _.completed = !0, _.hasError = !1), await Qe(_, {
        signatureType: y,
        signatureDataUrl: c?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), u.trackSignatureAttach(r, y, !0, Date.now() - h), !0;
    } catch (b) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = b.message), u.trackSignatureAttach(r, y, !1, Date.now() - h, b.message), b;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function ze(r, c) {
    const p = `${c}|${r}`, h = await Se(p), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: c,
      object_key: y,
      sha256: h
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Se(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const c = new TextEncoder().encode(r), p = await window.crypto.subtle.digest("SHA-256", c);
      return Array.from(new Uint8Array(p)).map((h) => h.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Pt() {
    let r = 0;
    a.fieldState.forEach((_) => {
      _.required, _.completed && r++;
    });
    const c = a.fieldState.size, p = c > 0 ? r / c * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = c;
    const h = document.getElementById("progress-ring-circle"), y = 97.4, b = y - p / 100 * y;
    h.style.strokeDashoffset = b, document.getElementById("mobile-progress").style.width = `${p}%`;
    const I = c - r;
    document.getElementById("fields-status").textContent = I > 0 ? `${I} remaining` : "All complete";
  }
  function ke() {
    const r = document.getElementById("submit-btn"), c = document.getElementById("incomplete-warning"), p = document.getElementById("incomplete-message"), h = Le(a.submitCooldownUntil);
    let y = [], b = !1;
    a.fieldState.forEach((_, R) => {
      _.required && !_.completed && y.push(_), _.hasError && (b = !0);
    });
    const I = a.hasConsented && y.length === 0 && !b && a.pendingSaves.size === 0 && h === 0 && !a.isSubmitting;
    r.disabled = !I, !a.isSubmitting && h > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${h}s` : !a.isSubmitting && h === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? h > 0 ? (c.classList.remove("hidden"), p.textContent = `Please wait ${h}s before submitting again.`) : b ? (c.classList.remove("hidden"), p.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (c.classList.remove("hidden"), p.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : c.classList.add("hidden") : (c.classList.remove("hidden"), p.textContent = "Please accept the consent agreement");
  }
  function At(r) {
    const c = a.fieldState.get(r), p = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!p || !c)) {
      if (c.completed) {
        p.classList.add("completed"), p.classList.remove("error");
        const h = p.querySelector(".w-8");
        h.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), h.classList.add("bg-green-100", "text-green-600"), h.innerHTML = '<i class="iconoir-check"></i>';
      } else if (c.hasError) {
        p.classList.remove("completed"), p.classList.add("error");
        const h = p.querySelector(".w-8");
        h.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), h.classList.add("bg-red-100", "text-red-600"), h.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function ge() {
    const r = Array.from(a.fieldState.values()).filter((c) => c.required);
    return r.sort((c, p) => {
      const h = Number(c.page || 0), y = Number(p.page || 0);
      if (h !== y) return h - y;
      const b = Number(c.tabIndex || 0), I = Number(p.tabIndex || 0);
      if (b > 0 && I > 0 && b !== I) return b - I;
      if (b > 0 != I > 0) return b > 0 ? -1 : 1;
      const _ = Number(c.posY || 0), R = Number(p.posY || 0);
      if (_ !== R) return _ - R;
      const V = Number(c.posX || 0), O = Number(p.posX || 0);
      return V !== O ? V - O : String(c.id || "").localeCompare(String(p.id || ""));
    }), r;
  }
  function Ot(r) {
    a.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((c) => c.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((c) => c.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function Tt(r) {
    const c = ge(), p = c.filter((I) => !I.completed);
    if (p.length === 0) {
      u.track("guided_next_none_remaining", { fromFieldId: r });
      const I = document.getElementById("submit-btn");
      I?.scrollIntoView({ behavior: "smooth", block: "nearest" }), I?.focus(), oe("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const h = c.findIndex((I) => String(I.id) === String(r));
    let y = null;
    if (h >= 0) {
      for (let I = h + 1; I < c.length; I++)
        if (!c[I].completed) {
          y = c[I];
          break;
        }
    }
    if (y || (y = p[0]), !y) return;
    u.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const b = Number(y.page || 1);
    b !== a.currentPage && Rt(b), de(y.id, { openEditor: !1 }), Ot(y.id), setTimeout(() => {
      Ot(y.id), It(y.id), u.track("guided_next_completed", { toFieldId: y.id, page: y.page }), oe(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function _t() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(r.querySelector(".field-editor")), oe("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Pe() {
    const r = document.getElementById("consent-modal"), c = r.querySelector(".field-editor");
    pt(c), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", oe("Consent dialog closed.");
  }
  async function te() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const c = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!c.ok)
        throw await pe(c, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Pe(), ke(), cn(), u.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), oe("Consent accepted. You can now complete the fields and submit.");
    } catch (c) {
      window.toastManager && window.toastManager.error(c.message), oe(`Error: ${c.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function Ut() {
    const r = document.getElementById("submit-btn"), c = Le(a.submitCooldownUntil);
    if (c > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${c}s before submitting again.`), ke();
      return;
    }
    a.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const p = `submit-${n.recipientId}-${Date.now()}`, h = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": p }
      });
      if (!h.ok)
        throw await pe(h, "Failed to submit");
      u.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (p) {
      u.trackSubmit(!1, p.message), p?.rateLimited && zt(p.retryAfterSeconds), window.toastManager && window.toastManager.error(p.message);
    } finally {
      a.isSubmitting = !1, ke();
    }
  }
  function on() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(r.querySelector(".field-editor")), oe("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Vt() {
    const r = document.getElementById("decline-modal"), c = r.querySelector(".field-editor");
    pt(c), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", oe("Decline dialog closed.");
  }
  async function Gt() {
    const r = document.getElementById("decline-reason").value;
    try {
      const c = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!c.ok)
        throw await pe(c, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (c) {
      window.toastManager && window.toastManager.error(c.message);
    }
  }
  function $t() {
    u.trackDegradedMode("viewer_load_failure"), u.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Wt() {
    try {
      const r = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!r.ok) throw new Error("Document unavailable");
      const p = (await r.json()).assets || {}, h = p.source_url || p.executed_url || p.certificate_url;
      if (h)
        window.open(h, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (r) {
      window.toastManager && window.toastManager.error(r.message || "Unable to download document");
    }
  }
  const Ae = {
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
            <div class="debug-value" id="debug-session-id">${u.sessionId}</div>
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
      const r = this.panel.querySelector(".debug-toggle"), c = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (r.textContent = "+", c.style.display = "none") : (r.textContent = "−", c.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const r = a.fieldState;
      let c = 0;
      r?.forEach((h) => {
        h.completed && c++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${c}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
      const p = u.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = p.length > 0 ? `${p.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${p.length > 0 ? "error" : ""}`;
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
          fields: Array.from(a.fieldState?.entries() || []).map(([r, c]) => ({
            id: r,
            type: c.type,
            completed: c.completed,
            hasError: c.hasError
          })),
          telemetry: u.getSessionSummary(),
          errors: u.metrics.errorsEncountered
        }),
        getEvents: () => u.events,
        forceError: (r) => {
          u.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), Ze();
        },
        setLowMemory: (r) => {
          a.isLowMemory = r, Ve(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", u.sessionId), console.log("Fields:", a.fieldState?.size || 0), console.log("Low Memory:", a.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Ze(), this.updatePanel();
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
      console.table(u.events), console.log("Session Summary:", u.getSessionSummary());
    }
  };
  function oe(r, c = "polite") {
    const p = c === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    p && (p.textContent = "", requestAnimationFrame(() => {
      p.textContent = r;
    }));
  }
  function Be(r) {
    const p = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), h = p[0], y = p[p.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function b(I) {
      I.key === "Tab" && (I.shiftKey ? document.activeElement === h && (I.preventDefault(), y?.focus()) : document.activeElement === y && (I.preventDefault(), h?.focus()));
    }
    r.addEventListener("keydown", b), r._focusTrapHandler = b, requestAnimationFrame(() => {
      h?.focus();
    });
  }
  function pt(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const c = r.dataset.previousFocus;
    if (c) {
      const p = document.getElementById(c);
      requestAnimationFrame(() => {
        p?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function cn() {
    const r = A(), c = document.getElementById("submit-status");
    c && (r.allRequiredComplete && a.hasConsented ? c.textContent = "All required fields complete. You can now submit." : a.hasConsented ? c.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : c.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function A() {
    let r = 0, c = 0, p = 0;
    return a.fieldState.forEach((h) => {
      h.required && c++, h.completed && r++, h.required && !h.completed && p++;
    }), {
      completed: r,
      required: c,
      remainingRequired: p,
      total: a.fieldState.size,
      allRequiredComplete: p === 0
    };
  }
  function Je(r, c = 1) {
    const p = Array.from(a.fieldState.keys()), h = p.indexOf(r);
    if (h === -1) return null;
    const y = h + c;
    return y >= 0 && y < p.length ? p[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (lt(), Pe(), Vt()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const c = Array.from(document.querySelectorAll(".sig-editor-tab")), p = c.indexOf(r.target);
      if (p !== -1) {
        let h = p;
        if (r.key === "ArrowRight" && (h = (p + 1) % c.length), r.key === "ArrowLeft" && (h = (p - 1 + c.length) % c.length), r.key === "Home" && (h = 0), r.key === "End" && (h = c.length - 1), h !== p) {
          r.preventDefault();
          const y = c[h], b = y.getAttribute("data-tab") || "draw", I = y.getAttribute("data-field-id");
          I && tt(b, I), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const c = r.target.dataset.fieldId, p = r.key === "ArrowDown" ? 1 : -1, h = Je(c, p);
        h && document.querySelector(`.field-list-item[data-field-id="${h}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const c = r.target.dataset.fieldId;
        c && et(c);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class ei {
  constructor(e) {
    this.config = e;
  }
  init() {
    Ji(this.config);
  }
  destroy() {
  }
}
function Zs(s) {
  const e = new ei(s);
  return W(() => e.init()), e;
}
function Yi() {
  const s = document.getElementById("esign-signer-review-config");
  if (!s) return null;
  try {
    const e = JSON.parse(s.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && W(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = Yi();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new ei(e);
  t.init(), window.esignSignerReviewController = t;
});
class ti {
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
    nt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), nt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function er(s = {}) {
  const e = new ti(s);
  return W(() => e.init()), e;
}
function tr(s = {}) {
  const e = new ti(s);
  W(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Tn {
  constructor(e) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = e, this.elements = {
      loadBtn: g("#pdf-load-btn"),
      retryBtn: g("#pdf-retry-btn"),
      loading: g("#pdf-loading"),
      spinner: g("#pdf-spinner"),
      error: g("#pdf-error"),
      errorMessage: g("#pdf-error-message"),
      viewer: g("#pdf-viewer"),
      canvas: g("#pdf-canvas"),
      pagination: g("#pdf-pagination"),
      prevBtn: g("#pdf-prev-page"),
      nextBtn: g("#pdf-next-page"),
      currentPageEl: g("#pdf-current-page"),
      totalPagesEl: g("#pdf-total-pages"),
      status: g("#pdf-status")
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
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), i && i.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (d) => {
      this.isLoaded && (d.key === "ArrowLeft" || d.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (d.key === "ArrowRight" || d.key === "PageDown") && this.goToPage(this.currentPage + 1));
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
        const n = await this.pdfDoc.getPage(e), i = n.getViewport({ scale: this.scale }), d = this.elements.canvas, u = d.getContext("2d");
        if (!u)
          throw new Error("Failed to get canvas context");
        d.height = i.height, d.width = i.width, await n.render({
          canvasContext: u,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: i } = this.elements, d = this.pdfDoc?.numPages || 1;
    i && i.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= d);
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
    e && k(e), t && $(t), n && k(n), i && k(i);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: i } = this.elements;
    e && k(e), t && k(t), n && k(n), i && $(i);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: i, errorMessage: d, viewer: u } = this.elements;
    t && k(t), n && k(n), i && $(i), u && k(u), d && (d.textContent = e);
  }
}
function nr(s) {
  const e = new Tn(s);
  return e.init(), e;
}
function ir(s) {
  const e = {
    documentId: s.documentId,
    pdfUrl: s.pdfUrl,
    pageCount: s.pageCount || 1
  }, t = new Tn(e);
  W(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && W(() => {
  const s = document.querySelector('[data-esign-page="document-detail"]');
  if (s instanceof HTMLElement) {
    const e = s.dataset.documentId || "", t = s.dataset.pdfUrl || "", n = parseInt(s.dataset.pageCount || "1", 10);
    e && t && new Tn({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class sr {
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
class rr {
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
function Ki(s) {
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
function Qi(s) {
  if (!Array.isArray(s)) return;
  const e = s.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", i = t.label ?? String(n);
    return { label: String(i), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Xi(s, e) {
  if (!Array.isArray(s) || s.length === 0) return;
  const t = s.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), i = e ? String(e).trim().toLowerCase() : "";
  return i && n.includes(i) ? [i, ...n.filter((d) => d !== i)] : n;
}
function ar(s) {
  return s.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function or(s) {
  return s ? s.map((e) => ({
    name: e.name,
    label: e.label,
    type: Ki(e.type),
    options: Qi(e.options),
    operators: Xi(e.operators, e.default_operator)
  })) : [];
}
function cr(s) {
  if (!s) return "-";
  try {
    const e = new Date(s);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(s);
  }
}
function lr(s) {
  if (!s || Number(s) <= 0) return "-";
  const e = parseInt(String(s), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function dr(s, e, t) {
  t && t.success(`${s} completed successfully`);
}
function ur(s, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([u, a]) => `${u}: ${a}`).join("; ") : "", i = e?.textCode ? `${e.textCode}: ` : "", d = e?.message || `${s} failed`;
    t.error(n ? `${i}${d}: ${n}` : `${i}${d}`);
  }
}
function pr(s, e) {
  const t = g(`#${s}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function gr(s, e) {
  const t = s.refresh.bind(s);
  return async function() {
    await t();
    const n = s.getSchema();
    n?.actions && e(n.actions);
  };
}
const mr = {
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
}, Xt = "application/vnd.google-apps.document", _n = "application/vnd.google-apps.spreadsheet", $n = "application/vnd.google-apps.presentation", ni = "application/vnd.google-apps.folder", Mn = "application/pdf", Zi = [Xt, Mn], ii = "esign.google.account_id";
function es(s) {
  return s.mimeType === Xt;
}
function ts(s) {
  return s.mimeType === Mn;
}
function gt(s) {
  return s.mimeType === ni;
}
function ns(s) {
  return Zi.includes(s.mimeType);
}
function hr(s) {
  return s.mimeType === Xt || s.mimeType === _n || s.mimeType === $n;
}
function is(s) {
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
function fr(s) {
  return s.map(is);
}
function si(s) {
  return {
    [Xt]: "Google Doc",
    [_n]: "Google Sheet",
    [$n]: "Google Slides",
    [ni]: "Folder",
    [Mn]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[s] || "File";
}
function ss(s) {
  return gt(s) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : es(s) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : ts(s) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : s.mimeType === _n ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : s.mimeType === $n ? {
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
function rs(s) {
  return !s || s <= 0 ? "-" : s < 1024 ? `${s} B` : s < 1024 * 1024 ? `${(s / 1024).toFixed(1)} KB` : `${(s / (1024 * 1024)).toFixed(2)} MB`;
}
function as(s) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}
function yr(s, e) {
  const t = s.get("account_id");
  if (t)
    return Yt(t);
  if (e)
    return Yt(e);
  const n = localStorage.getItem(ii);
  return n ? Yt(n) : "";
}
function Yt(s) {
  if (!s) return "";
  const e = s.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function vr(s) {
  const e = Yt(s);
  e && localStorage.setItem(ii, e);
}
function wr(s, e) {
  if (!e) return s;
  try {
    const t = new URL(s, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = s.includes("?") ? "&" : "?";
    return `${s}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function br(s, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(s) || (n.pathname = `${s}${e}`), t && n.searchParams.set("account_id", t), n;
}
function xr(s) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  s && t !== s ? (e.searchParams.set("account_id", s), window.history.replaceState({}, "", e.toString())) : !s && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function mt(s) {
  const e = document.createElement("div");
  return e.textContent = s, e.innerHTML;
}
function os(s) {
  const e = ss(s);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Sr(s, e) {
  if (s.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...s
  ];
  return t.map((n, i) => {
    const d = i === t.length - 1, u = i > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return d ? `${u}<span class="text-gray-900 font-medium">${mt(n.name)}</span>` : `${u}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${mt(n.name)}</button>`;
  }).join("");
}
function cs(s, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: i = !0 } = e, d = os(s), u = gt(s), a = ns(s), x = u ? "cursor-pointer hover:bg-gray-50" : a ? "cursor-pointer hover:bg-blue-50" : "opacity-60", v = u ? `data-folder-id="${s.id}" data-folder-name="${mt(s.name)}"` : a && t ? `data-file-id="${s.id}" data-file-name="${mt(s.name)}" data-mime-type="${s.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${x} file-item"
      ${v}
      role="listitem"
      ${a ? 'tabindex="0"' : ""}
    >
      ${d}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${mt(s.name)}</p>
        <p class="text-xs text-gray-500">
          ${si(s.mimeType)}
          ${n && s.size > 0 ? ` &middot; ${rs(s.size)}` : ""}
          ${i && s.modifiedTime ? ` &middot; ${as(s.modifiedTime)}` : ""}
        </p>
      </div>
      ${a && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Ir(s, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return s.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${mt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...s].sort((d, u) => gt(d) && !gt(u) ? -1 : !gt(d) && gt(u) ? 1 : d.name.localeCompare(u.name)).map((d) => cs(d, { selectable: n })).join("")}
    </div>
  `;
}
function Er(s) {
  return {
    id: s.id,
    name: s.name,
    mimeType: s.mimeType,
    typeName: si(s.mimeType)
  };
}
export {
  Ei as AGREEMENT_STATUS_BADGES,
  Zn as AgreementFormController,
  Tn as DocumentDetailPreviewController,
  An as DocumentFormController,
  wi as ESignAPIClient,
  bi as ESignAPIError,
  ii as GOOGLE_ACCOUNT_STORAGE_KEY,
  Gn as GoogleCallbackController,
  Jn as GoogleDrivePickerController,
  Wn as GoogleIntegrationController,
  Zi as IMPORTABLE_MIME_TYPES,
  Qn as IntegrationConflictsController,
  Yn as IntegrationHealthController,
  Kn as IntegrationMappingsController,
  Xn as IntegrationSyncRunsController,
  Pn as LandingPageController,
  Xt as MIME_GOOGLE_DOC,
  ni as MIME_GOOGLE_FOLDER,
  _n as MIME_GOOGLE_SHEET,
  $n as MIME_GOOGLE_SLIDES,
  Mn as MIME_PDF,
  sr as PanelPaginationBehavior,
  rr as PanelSearchBehavior,
  mr as STANDARD_GRID_SELECTORS,
  Vn as SignerCompletePageController,
  ti as SignerErrorPageController,
  ei as SignerReviewController,
  me as announce,
  wr as applyAccountIdToPath,
  Ti as applyDetailFormatters,
  ji as bootstrapAgreementForm,
  ir as bootstrapDocumentDetailPreview,
  Qs as bootstrapDocumentForm,
  Rs as bootstrapGoogleCallback,
  zs as bootstrapGoogleDrivePicker,
  js as bootstrapGoogleIntegration,
  Ws as bootstrapIntegrationConflicts,
  Os as bootstrapIntegrationHealth,
  Vs as bootstrapIntegrationMappings,
  Ys as bootstrapIntegrationSyncRuns,
  Ms as bootstrapLandingPage,
  Ds as bootstrapSignerCompletePage,
  tr as bootstrapSignerErrorPage,
  Ji as bootstrapSignerReview,
  br as buildScopedApiUrl,
  xs as byId,
  Ii as capitalize,
  Si as createESignClient,
  Li as createElement,
  gr as createSchemaActionCachingRefresh,
  Er as createSelectedFile,
  ws as createStatusBadgeElement,
  Ts as createTimeoutController,
  cr as dateTimeCellRenderer,
  Qt as debounce,
  ur as defaultActionErrorHandler,
  dr as defaultActionSuccessHandler,
  Is as delegate,
  mt as escapeHtml,
  lr as fileSizeCellRenderer,
  gs as formatDate,
  Kt as formatDateTime,
  as as formatDriveDate,
  rs as formatDriveFileSize,
  Jt as formatFileSize,
  ps as formatPageCount,
  fs as formatRecipientCount,
  hs as formatRelativeTime,
  Pi as formatSizeElements,
  ms as formatTime,
  Ai as formatTimestampElements,
  On as getAgreementStatusBadge,
  us as getESignClient,
  ss as getFileIconConfig,
  si as getFileTypeName,
  ki as getPageConfig,
  k as hide,
  Xs as initAgreementForm,
  _i as initDetailFormatters,
  nr as initDocumentDetailPreview,
  Ks as initDocumentForm,
  Fs as initGoogleCallback,
  qs as initGoogleDrivePicker,
  Hs as initGoogleIntegration,
  Gs as initIntegrationConflicts,
  Ns as initIntegrationHealth,
  Us as initIntegrationMappings,
  Js as initIntegrationSyncRuns,
  $s as initLandingPage,
  Bs as initSignerCompletePage,
  er as initSignerErrorPage,
  Zs as initSignerReview,
  gt as isFolder,
  es as isGoogleDoc,
  hr as isGoogleWorkspaceFile,
  ns as isImportable,
  ts as isPDF,
  Yt as normalizeAccountId,
  is as normalizeDriveFile,
  fr as normalizeDriveFiles,
  Xi as normalizeFilterOperators,
  Qi as normalizeFilterOptions,
  Ki as normalizeFilterType,
  Ss as on,
  W as onReady,
  ks as poll,
  or as prepareFilterFields,
  ar as prepareGridColumns,
  g as qs,
  nt as qsa,
  Sr as renderBreadcrumb,
  os as renderFileIcon,
  cs as renderFileItem,
  Ir as renderFileList,
  Ci as renderStatusBadge,
  yr as resolveAccountId,
  Ps as retry,
  vr as saveAccountId,
  xi as setESignClient,
  Cs as setLoading,
  pr as setupRefreshButton,
  $ as show,
  Un as sleep,
  ys as snakeToTitle,
  xr as syncAccountIdToUrl,
  As as throttle,
  Es as toggle,
  vs as truncate,
  Dt as updateDataText,
  Ls as updateDataTexts,
  bs as updateStatusBadge,
  _s as withTimeout
};
//# sourceMappingURL=index.js.map

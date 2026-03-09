import { e as Ye } from "../chunks/html-DyksyvcZ.js";
class js {
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
      const S = await this.listAgreements({ page: t, per_page: n }), v = S.items || S.records || [];
      if (e.push(...v), v.length === 0 || e.length >= S.total)
        break;
      t += 1;
    }
    const l = {};
    for (const S of e) {
      const v = String(S?.status || "").trim().toLowerCase();
      v && (l[v] = (l[v] || 0) + 1);
    }
    const d = (l.sent || 0) + (l.in_progress || 0), a = d + (l.declined || 0);
    return {
      draft: l.draft || 0,
      sent: l.sent || 0,
      in_progress: l.in_progress || 0,
      completed: l.completed || 0,
      voided: l.voided || 0,
      declined: l.declined || 0,
      expired: l.expired || 0,
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
      throw new zs(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class zs extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let ci = null;
function na() {
  if (!ci)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return ci;
}
function Os(i) {
  ci = i;
}
function Gs(i) {
  const e = new js(i);
  return Os(e), e;
}
function En(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ia(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Pn(i, e) {
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
function sa(i, e) {
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
function ra(i, e) {
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
function aa(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), l = Math.round(s / 60), d = Math.round(l / 60), a = Math.round(d / 24), S = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(a) >= 1 ? S.format(a, "day") : Math.abs(d) >= 1 ? S.format(d, "hour") : Math.abs(l) >= 1 ? S.format(l, "minute") : S.format(s, "second");
  } catch {
    return String(i);
  }
}
function oa(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Vs(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function ca(i) {
  return i ? i.split("_").map((e) => Vs(e)).join(" ") : "";
}
function la(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const Ws = {
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
function Oi(i) {
  const e = String(i || "").trim().toLowerCase();
  return Ws[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Js(i, e) {
  const t = Oi(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", l = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, d = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${l[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${d}${t.label}</span>`;
}
function da(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = Js(i, e), t.firstElementChild;
}
function ua(i, e, t) {
  const n = Oi(e), s = t?.size ?? "sm", l = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${l[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const S = i.querySelector(".rounded-full");
    if (S)
      S.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const v = document.createElement("span");
      v.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, v.setAttribute("aria-hidden", "true"), i.prepend(v);
    }
  }
  const a = i.childNodes[i.childNodes.length - 1];
  a && a.nodeType === Node.TEXT_NODE ? a.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function m(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function Tt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function pa(i) {
  return document.getElementById(i);
}
function Ys(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, l] of Object.entries(e))
      l !== void 0 && n.setAttribute(s, l);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function ga(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function ma(i, e, t, n, s) {
  const l = (d) => {
    const a = d.target.closest(e);
    a && i.contains(a) && n.call(a, d, a);
  };
  return i.addEventListener(t, l, s), () => i.removeEventListener(t, l, s);
}
function ee(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function M(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function P(i) {
  i && i.classList.add("hidden");
}
function ha(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? M(i) : P(i);
}
function fa(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function cn(i, e, t = document) {
  const n = m(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function ya(i, e = document) {
  for (const [t, n] of Object.entries(i))
    cn(t, n, e);
}
function Ks(i = "[data-esign-page]", e = "data-esign-config") {
  const t = m(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const s = m(
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
function Ie(i, e = "polite") {
  const t = m(`[aria-live="${e}"]`) || (() => {
    const n = Ys("div", {
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
async function va(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: l = 30,
    onProgress: d,
    signal: a
  } = i, S = Date.now();
  let v = 0, E;
  for (; v < l; ) {
    if (a?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - S >= s)
      return {
        result: E,
        attempts: v,
        stopped: !1,
        timedOut: !0
      };
    if (v++, E = await e(), d && d(E, v), t(E))
      return {
        result: E,
        attempts: v,
        stopped: !0,
        timedOut: !1
      };
    await Gi(n, a);
  }
  return {
    result: E,
    attempts: v,
    stopped: !1,
    timedOut: !1
  };
}
async function ba(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: l = !0,
    shouldRetry: d = () => !0,
    onRetry: a,
    signal: S
  } = i;
  let v;
  for (let E = 1; E <= t; E++) {
    if (S?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (T) {
      if (v = T, E >= t || !d(T, E))
        throw T;
      const R = l ? Math.min(n * Math.pow(2, E - 1), s) : n;
      a && a(T, E, R), await Gi(R, S);
    }
  }
  throw v;
}
function Gi(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const s = setTimeout(t, i);
    if (e) {
      const l = () => {
        clearTimeout(s), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", l, { once: !0 });
    }
  });
}
function Tn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function wa(i, e) {
  let t = 0, n = null;
  return (...s) => {
    const l = Date.now();
    l - t >= e ? (t = l, i(...s)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...s);
      },
      e - (l - t)
    ));
  };
}
function Sa(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function xa(i, e, t = "Operation timed out") {
  let n;
  const s = new Promise((l, d) => {
    n = setTimeout(() => {
      d(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, s]);
  } finally {
    clearTimeout(n);
  }
}
class gi {
  constructor(e) {
    this.config = e, this.client = Gs({
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
    cn('count="draft"', e.draft), cn('count="pending"', e.pending), cn('count="completed"', e.completed), cn('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Ia(i) {
  const e = i || Ks(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new gi(e);
  return ee(() => t.init()), t;
}
function Ea(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new gi(t);
  ee(() => n.init());
}
typeof document < "u" && ee(() => {
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
      const s = String(n.basePath || n.base_path || "/admin"), l = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new gi({ basePath: s, apiBasePath: l }).init();
    }
  }
});
class Vi {
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
    const e = m("#retry-artifacts-btn");
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
      const s = m(`#artifacts-${n}`);
      s && (n === e ? M(s) : P(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = m("#artifact-executed"), n = m("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), M(t));
    }
    if (e.source) {
      const t = m("#artifact-source"), n = m("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), M(t));
    }
    if (e.certificate) {
      const t = m("#artifact-certificate"), n = m("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), M(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function La(i) {
  const e = new Vi(i);
  return ee(() => e.init()), e;
}
function Ca(i) {
  const e = new Vi(i);
  ee(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Xs(i = document) {
  Tt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = En(t));
  });
}
function Qs(i = document) {
  Tt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Pn(t));
  });
}
function Zs(i = document) {
  Xs(i), Qs(i);
}
function er() {
  ee(() => {
    Zs();
  });
}
typeof document < "u" && er();
const Pi = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Wi {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: m("#loading-state"),
      successState: m("#success-state"),
      errorState: m("#error-state"),
      errorMessage: m("#error-message"),
      errorDetail: m("#error-detail"),
      closeBtn: m("#close-btn")
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), l = e.get("state"), d = this.parseOAuthState(l);
    d.account_id || (d.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, s, d) : t ? this.handleSuccess(t, d) : this.handleError("unknown", "No authorization code was received from Google.", d);
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
    switch (P(t), P(n), P(s), e) {
      case "loading":
        M(t);
        break;
      case "success":
        M(n);
        break;
      case "error":
        M(s);
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
    const { errorMessage: s, errorDetail: l, closeBtn: d } = this.elements;
    s && (s.textContent = Pi[e] || Pi.unknown), t && l && (l.textContent = t, M(l)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), l = s.get("state"), a = this.parseOAuthState(l).account_id || s.get("account_id");
      a && n.searchParams.set("account_id", a), window.location.href = n.toString();
    }
  }
}
function ka(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Wi(e);
  return ee(() => t.init()), t;
}
function Aa(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new Wi(e);
  ee(() => t.init());
}
const ni = "esign.google.account_id", tr = {
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
class Ji {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      loadingState: m("#loading-state"),
      disconnectedState: m("#disconnected-state"),
      connectedState: m("#connected-state"),
      errorState: m("#error-state"),
      statusBadge: m("#status-badge"),
      announcements: m("#integration-announcements"),
      accountIdInput: m("#account-id-input"),
      connectBtn: m("#connect-btn"),
      disconnectBtn: m("#disconnect-btn"),
      refreshBtn: m("#refresh-status-btn"),
      retryBtn: m("#retry-btn"),
      reauthBtn: m("#reauth-btn"),
      oauthModal: m("#oauth-modal"),
      oauthCancelBtn: m("#oauth-cancel-btn"),
      disconnectModal: m("#disconnect-modal"),
      disconnectCancelBtn: m("#disconnect-cancel-btn"),
      disconnectConfirmBtn: m("#disconnect-confirm-btn"),
      connectedEmail: m("#connected-email"),
      connectedAccountId: m("#connected-account-id"),
      scopesList: m("#scopes-list"),
      expiryInfo: m("#expiry-info"),
      reauthWarning: m("#reauth-warning"),
      reauthReason: m("#reauth-reason"),
      errorMessage: m("#error-message"),
      degradedWarning: m("#degraded-warning"),
      degradedReason: m("#degraded-reason"),
      importDriveLink: m("#import-drive-link"),
      integrationSettingsLink: m("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: m("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: m("#accounts-section"),
      accountsLoading: m("#accounts-loading"),
      accountsEmpty: m("#accounts-empty"),
      accountsGrid: m("#accounts-grid"),
      connectFirstBtn: m("#connect-first-btn")
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
      reauthBtn: l,
      oauthCancelBtn: d,
      disconnectCancelBtn: a,
      disconnectConfirmBtn: S,
      accountIdInput: v,
      oauthModal: E,
      disconnectModal: T
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), l && l.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, T && M(T);
    }), a && a.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, T && P(T);
    }), S && S.addEventListener("click", () => this.disconnect()), d && d.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), v && (v.addEventListener("change", () => {
      this.setCurrentAccountId(v.value, !0);
    }), v.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(v.value, !0));
    }));
    const { accountDropdown: R, connectFirstBtn: F } = this.elements;
    R && R.addEventListener("change", () => {
      R.value === "__new__" ? (R.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(R.value, !0);
    }), F && F.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), T && !T.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, P(T)));
    }), [E, T].forEach((B) => {
      B && B.addEventListener("click", (O) => {
        const Y = O.target;
        (Y === B || Y.getAttribute("aria-hidden") === "true") && (P(B), B === E ? this.cancelOAuthFlow() : B === T && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(ni)
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
      this.currentAccountId ? window.localStorage.setItem(ni, this.currentAccountId) : window.localStorage.removeItem(ni);
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
    t && (t.textContent = e), Ie(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: l } = this.elements;
    switch (P(t), P(n), P(s), P(l), e) {
      case "loading":
        M(t);
        break;
      case "disconnected":
        M(n);
        break;
      case "connected":
        M(s);
        break;
      case "error":
        M(l);
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
        let l = `Failed to check status: ${e.status}`;
        try {
          const d = await e.json();
          d?.error?.message && (l = d.error.message);
        } catch {
        }
        throw new Error(l);
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
    const t = (O, Y) => {
      for (const Q of O)
        if (Object.prototype.hasOwnProperty.call(e, Q) && e[Q] !== void 0 && e[Q] !== null)
          return e[Q];
      return Y;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), l = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), d = t(["connected", "Connected"], !1), a = t(["degraded", "Degraded"], !1), S = t(["degraded_reason", "DegradedReason"], ""), v = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), T = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let R = t(["is_expired", "IsExpired"], void 0), F = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof R != "boolean" || typeof F != "boolean") && n) {
      const O = new Date(n);
      if (!Number.isNaN(O.getTime())) {
        const Y = O.getTime() - Date.now(), Q = 5 * 60 * 1e3;
        R = Y <= 0, F = Y > 0 && Y <= Q;
      }
    }
    const B = typeof T == "boolean" ? T : (R === !0 || F === !0) && !E;
    return {
      connected: d,
      account_id: l,
      email: v,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: R === !0,
      is_expiring_soon: F === !0,
      can_auto_refresh: E,
      needs_reauthorization: B,
      degraded: a,
      degraded_reason: S
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: l, reauthWarning: d, reauthReason: a } = this.elements;
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
        const s = tr[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, s, l) {
    const { expiryInfo: d, reauthWarning: a, reauthReason: S } = this.elements;
    if (!d) return;
    if (d.classList.remove("text-red-600", "text-amber-600"), d.classList.add("text-gray-500"), !e) {
      d.textContent = "Access token status unknown", a && P(a);
      return;
    }
    const v = new Date(e), E = /* @__PURE__ */ new Date(), T = Math.max(
      1,
      Math.round((v.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? s ? (d.textContent = "Access token expired, but refresh is available and will be applied automatically.", d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), a && P(a)) : (d.textContent = "Access token has expired. Please re-authorize.", d.classList.remove("text-gray-500"), d.classList.add("text-red-600"), a && M(a), S && (S.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), s ? (d.textContent = `Token expires in approximately ${T} minute${T !== 1 ? "s" : ""}. Refresh is available automatically.`, a && P(a)) : (d.textContent = `Token expires in approximately ${T} minute${T !== 1 ? "s" : ""}`, a && M(a), S && (S.textContent = `Your access token will expire in ${T} minute${T !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (d.textContent = `Token valid until ${v.toLocaleDateString()} ${v.toLocaleTimeString()}`, a && P(a)), !l && a && P(a);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (M(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : P(n));
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
    for (const l of this.accounts) {
      const d = this.normalizeAccountId(l.account_id);
      if (n.has(d))
        continue;
      n.add(d);
      const a = document.createElement("option");
      a.value = d;
      const S = l.email || d || "Default", v = l.status !== "connected" ? ` (${l.status})` : "";
      a.textContent = `${S}${v}`, d === this.currentAccountId && (a.selected = !0), e.appendChild(a);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const l = document.createElement("option");
      l.value = this.currentAccountId, l.textContent = `${this.currentAccountId} (new)`, l.selected = !0, e.appendChild(l);
    }
    const s = document.createElement("option");
    s.value = "__new__", s.textContent = "+ Connect New Account...", e.appendChild(s);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && P(e), this.accounts.length === 0) {
      t && M(t), n && P(n);
      return;
    }
    t && P(t), n && (M(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, l = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, d = t ? "ring-2 ring-blue-500" : "", a = n[e.status] || "bg-white border-gray-200", S = s[e.status] || "bg-gray-100 text-gray-700", v = l[e.status] || e.status, E = e.account_id || "default", T = e.email || (e.account_id ? e.account_id : "Default account");
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(T)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(E)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${S}">
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
    e.querySelectorAll(".select-account-btn").forEach((s) => {
      s.addEventListener("click", (l) => {
        const a = l.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (l) => {
        const a = l.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !1), this.startOAuthFlow(a);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (l) => {
        const a = l.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = a, t && M(t);
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
    t && M(t);
    const s = this.resolveOAuthRedirectURI(), l = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = l;
    const d = this.buildGoogleOAuthUrl(s, l);
    if (!d) {
      t && P(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const a = 500, S = 600, v = (window.screen.width - a) / 2, E = (window.screen.height - S) / 2;
    if (this.oauthWindow = window.open(
      d,
      "google_oauth",
      `width=${a},height=${S},left=${v},top=${E},popup=yes`
    ), !this.oauthWindow) {
      t && P(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (T) => this.handleOAuthCallback(T), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && P(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const l = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    l && n.add(l);
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
    if (this.cleanupOAuthFlow(), n && P(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const s = this.resolveOAuthRedirectURI(), d = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
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
              redirect_uri: s
            })
          }
        );
        if (!a.ok) {
          const S = await a.json();
          throw new Error(S.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (s) {
        console.error("Connect error:", s);
        const l = s instanceof Error ? s.message : "Unknown error";
        this.showToast(`Failed to connect: ${l}`, "error"), this.announce(`Failed to connect: ${l}`);
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
    e && P(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && P(e);
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
function Pa(i) {
  const e = new Ji(i);
  return ee(() => e.init()), e;
}
function Ta(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new Ji(e);
  ee(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const ii = "esign.google.account_id", Ti = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, _i = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Yi {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: m("#drive-search"),
      clearSearchBtn: m("#clear-search-btn"),
      fileList: m("#file-list"),
      loadingState: m("#loading-state"),
      breadcrumb: m("#breadcrumb"),
      listTitle: m("#list-title"),
      resultCount: m("#result-count"),
      pagination: m("#pagination"),
      loadMoreBtn: m("#load-more-btn"),
      refreshBtn: m("#refresh-btn"),
      announcements: m("#drive-announcements"),
      accountScopeHelp: m("#account-scope-help"),
      connectGoogleLink: m("#connect-google-link"),
      noSelection: m("#no-selection"),
      filePreview: m("#file-preview"),
      previewIcon: m("#preview-icon"),
      previewTitle: m("#preview-title"),
      previewType: m("#preview-type"),
      previewFileId: m("#preview-file-id"),
      previewOwner: m("#preview-owner"),
      previewLocation: m("#preview-location"),
      previewModified: m("#preview-modified"),
      importBtn: m("#import-btn"),
      openInGoogleBtn: m("#open-in-google-btn"),
      clearSelectionBtn: m("#clear-selection-btn"),
      importModal: m("#import-modal"),
      importForm: m("#import-form"),
      importGoogleFileId: m("#import-google-file-id"),
      importDocumentTitle: m("#import-document-title"),
      importAgreementTitle: m("#import-agreement-title"),
      importCancelBtn: m("#import-cancel-btn"),
      importConfirmBtn: m("#import-confirm-btn"),
      importSpinner: m("#import-spinner"),
      importBtnText: m("#import-btn-text"),
      viewListBtn: m("#view-list-btn"),
      viewGridBtn: m("#view-grid-btn")
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
      importBtn: l,
      clearSelectionBtn: d,
      importCancelBtn: a,
      importConfirmBtn: S,
      importForm: v,
      importModal: E,
      viewListBtn: T,
      viewGridBtn: R
    } = this.elements;
    if (e) {
      const B = Tn(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (O) => {
        O.key === "Enter" && (O.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), l && l.addEventListener("click", () => this.showImportModal()), d && d.addEventListener("click", () => this.clearSelection()), a && a.addEventListener("click", () => this.hideImportModal()), S && v && v.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const O = B.target;
      (O === E || O.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), T && T.addEventListener("click", () => this.setViewMode("list")), R && R.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && E && !E.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: F } = this.elements;
    F && F.addEventListener("click", (B) => this.handleFileListClick(B));
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
        window.localStorage.getItem(ii)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, M(e)) : P(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(ii, this.currentAccountId) : window.localStorage.removeItem(ii);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), l = String(e.modifiedTime || e.ModifiedTime || "").trim(), d = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: l,
      webViewLink: d,
      parents: v,
      owners: E,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && M(t));
    try {
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      let l;
      this.searchQuery ? l = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : l = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (l += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const d = await fetch(l, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        throw new Error(`Failed to load files: ${d.status}`);
      const a = await d.json(), S = Array.isArray(a.files) ? a.files.map((v) => this.normalizeDriveFile(v)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...S] : this.currentFiles = S, this.nextPageToken = a.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), Ie(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), Ie("Error loading files");
    } finally {
      this.isLoading = !1, t && P(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && P(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = _i.includes(e.mimeType), s = this.selectedFile?.id === e.id, l = Ti[e.mimeType] || Ti.default, d = this.getFileIcon(l);
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
          ${d}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${Pn(e.modifiedTime)}
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
    const s = n.dataset.fileId, l = n.dataset.isFolder === "true";
    s && (l ? this.navigateToFolder(s) : this.selectFile(s));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), Ie(`Selected: ${t.name}`));
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
      previewType: l,
      previewFileId: d,
      previewOwner: a,
      previewModified: S,
      importBtn: v,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && M(e), t && P(t);
      return;
    }
    e && P(e), t && M(t);
    const T = this.selectedFile, R = _i.includes(T.mimeType);
    s && (s.textContent = T.name), l && (l.textContent = this.getMimeTypeLabel(T.mimeType)), d && (d.textContent = T.id), a && T.owners.length > 0 && (a.textContent = T.owners[0].emailAddress || "-"), S && (S.textContent = Pn(T.modifiedTime)), v && (R ? (v.removeAttribute("disabled"), v.classList.remove("opacity-50", "cursor-not-allowed")) : (v.setAttribute("disabled", "true"), v.classList.add("opacity-50", "cursor-not-allowed"))), E && T.webViewLink && (E.href = T.webViewLink);
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
      P(e), t && (t.textContent = "Search Results");
      return;
    }
    M(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
      (l, d) => `
        <li class="flex items-center">
          ${d > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(l.id)}"
            data-folder-index="${d}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(l.name)}
          </button>
        </li>
      `
    ).join(""), Tt(".breadcrumb-item", s).forEach((l) => {
      l.addEventListener("click", () => {
        const d = parseInt(l.dataset.folderIndex || "0", 10);
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
    e && (this.nextPageToken ? M(e) : P(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? M(t) : P(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && P(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
      const l = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = l;
    }
    s && (s.value = ""), e && M(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && P(e);
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
      importAgreementTitle: l
    } = this.elements, d = this.selectedFile.id, a = s?.value.trim() || this.selectedFile.name, S = l?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && M(t), n && (n.textContent = "Importing...");
    try {
      const v = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: d,
          document_title: a,
          agreement_title: S || void 0
        })
      });
      if (!v.ok) {
        const T = await v.json();
        throw new Error(T.error?.message || "Import failed");
      }
      const E = await v.json();
      this.showToast("Import started successfully", "success"), Ie("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (v) {
      console.error("Import error:", v);
      const E = v instanceof Error ? v.message : "Import failed";
      this.showToast(E, "error"), Ie(`Error: ${E}`);
    } finally {
      e && e.removeAttribute("disabled"), t && P(t), n && (n.textContent = "Import");
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
function _a(i) {
  const e = new Yi(i);
  return ee(() => e.init()), e;
}
function Da(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new Yi(e);
  ee(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class Ki {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: m("#time-range"),
      providerFilter: m("#provider-filter"),
      refreshBtn: m("#refresh-btn"),
      healthScore: m("#health-score"),
      healthIndicator: m("#health-indicator"),
      healthTrend: m("#health-trend"),
      syncSuccessRate: m("#sync-success-rate"),
      syncSuccessCount: m("#sync-success-count"),
      syncFailedCount: m("#sync-failed-count"),
      syncSuccessBar: m("#sync-success-bar"),
      conflictCount: m("#conflict-count"),
      conflictPending: m("#conflict-pending"),
      conflictResolved: m("#conflict-resolved"),
      conflictTrend: m("#conflict-trend"),
      syncLag: m("#sync-lag"),
      lagStatus: m("#lag-status"),
      lastSync: m("#last-sync"),
      retryTotal: m("#retry-total"),
      retryRecovery: m("#retry-recovery"),
      retryAvg: m("#retry-avg"),
      retryList: m("#retry-list"),
      providerHealthTable: m("#provider-health-table"),
      alertsList: m("#alerts-list"),
      noAlerts: m("#no-alerts"),
      alertCount: m("#alert-count"),
      activityFeed: m("#activity-feed"),
      syncChartCanvas: m("#sync-chart-canvas"),
      conflictChartCanvas: m("#conflict-chart-canvas")
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
      const l = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      l.searchParams.set("range", n), s && l.searchParams.set("provider", s);
      const d = await fetch(l.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const a = await d.json();
        this.healthData = a;
      }
      this.renderHealthData(), Ie("Health data refreshed");
    } catch (l) {
      console.error("Failed to load health data:", l), this.healthData = this.generateMockHealthData(n, s), this.renderHealthData();
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
    for (let l = 0; l < e; l++) {
      const d = n[Math.floor(Math.random() * n.length)], a = s[Math.floor(Math.random() * s.length)];
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
    const n = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, l = /* @__PURE__ */ new Date();
    for (let d = e - 1; d >= 0; d--) {
      const a = new Date(l.getTime() - d * 36e5);
      n.push(
        a.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
      const l = s.healthTrend >= 0 ? "+" : "";
      n.textContent = `${l}${s.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: s } = this.elements, l = this.healthData.syncStats;
    e && (e.textContent = `${l.successRate.toFixed(1)}%`), t && (t.textContent = `${l.succeeded} succeeded`), n && (n.textContent = `${l.failed} failed`), s && (s.style.width = `${l.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: s } = this.elements, l = this.healthData.conflictStats;
    if (e && (e.textContent = String(l.pending)), t && (t.textContent = `${l.pending} pending`), n && (n.textContent = `${l.resolvedToday} resolved today`), s) {
      const d = l.trend >= 0 ? "+" : "";
      s.textContent = `${d}${l.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: s } = this.elements, l = this.healthData.retryStats;
    e && (e.textContent = String(l.total)), t && (t.textContent = `${l.recoveryRate}%`), n && (n.textContent = l.avgAttempts.toFixed(1)), s && (s.innerHTML = l.recent.map(
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
      s.addEventListener("click", (l) => this.dismissAlert(l));
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
    const { alertsList: s, noAlerts: l, alertCount: d } = this.elements, a = s?.querySelectorAll(":scope > div").length || 0;
    d && (d.textContent = `${a} active`, a === 0 && (d.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), l && l.classList.remove("hidden")));
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
    const l = document.getElementById(e);
    if (!l) return;
    const d = l.getContext("2d");
    if (!d) return;
    const a = l.width, S = l.height, v = 40, E = a - v * 2, T = S - v * 2;
    d.clearRect(0, 0, a, S);
    const R = t.labels, F = Object.values(t.datasets), B = E / R.length / (F.length + 1), O = Math.max(...F.flat()) || 1;
    R.forEach((Y, Q) => {
      const re = v + Q * E / R.length + B / 2;
      F.forEach((me, we) => {
        const Pe = me[Q] / O * T, ft = re + we * B, je = S - v - Pe;
        d.fillStyle = n[we] || "#6b7280", d.fillRect(ft, je, B - 2, Pe);
      }), Q % Math.ceil(R.length / 6) === 0 && (d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "center", d.fillText(Y, re + F.length * B / 2, S - v + 15));
    }), d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "right";
    for (let Y = 0; Y <= 4; Y++) {
      const Q = S - v - Y * T / 4, re = Math.round(O * Y / 4);
      d.fillText(re.toString(), v - 5, Q + 3);
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
function Ma(i) {
  const e = new Ki(i);
  return ee(() => e.init()), e;
}
function $a(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new Ki(e);
  ee(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class Xi {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: m("#mappings-announcements"),
      loadingState: m("#loading-state"),
      emptyState: m("#empty-state"),
      errorState: m("#error-state"),
      mappingsList: m("#mappings-list"),
      mappingsTbody: m("#mappings-tbody"),
      searchInput: m("#search-mappings"),
      filterStatus: m("#filter-status"),
      filterProvider: m("#filter-provider"),
      refreshBtn: m("#refresh-btn"),
      retryBtn: m("#retry-btn"),
      errorMessage: m("#error-message"),
      createMappingBtn: m("#create-mapping-btn"),
      createMappingEmptyBtn: m("#create-mapping-empty-btn"),
      mappingModal: m("#mapping-modal"),
      mappingModalTitle: m("#mapping-modal-title"),
      closeModalBtn: m("#close-modal-btn"),
      cancelModalBtn: m("#cancel-modal-btn"),
      mappingForm: m("#mapping-form"),
      mappingIdInput: m("#mapping-id"),
      mappingVersionInput: m("#mapping-version"),
      mappingNameInput: m("#mapping-name"),
      mappingProviderInput: m("#mapping-provider"),
      schemaObjectTypeInput: m("#schema-object-type"),
      schemaVersionInput: m("#schema-version"),
      schemaFieldsContainer: m("#schema-fields-container"),
      addFieldBtn: m("#add-field-btn"),
      mappingRulesContainer: m("#mapping-rules-container"),
      addRuleBtn: m("#add-rule-btn"),
      validateBtn: m("#validate-btn"),
      saveBtn: m("#save-btn"),
      formValidationStatus: m("#form-validation-status"),
      mappingStatusBadge: m("#mapping-status-badge"),
      publishModal: m("#publish-modal"),
      publishMappingName: m("#publish-mapping-name"),
      publishMappingVersion: m("#publish-mapping-version"),
      publishCancelBtn: m("#publish-cancel-btn"),
      publishConfirmBtn: m("#publish-confirm-btn"),
      deleteModal: m("#delete-modal"),
      deleteCancelBtn: m("#delete-cancel-btn"),
      deleteConfirmBtn: m("#delete-confirm-btn"),
      previewModal: m("#preview-modal"),
      closePreviewBtn: m("#close-preview-btn"),
      previewMappingName: m("#preview-mapping-name"),
      previewMappingProvider: m("#preview-mapping-provider"),
      previewObjectType: m("#preview-object-type"),
      previewMappingStatus: m("#preview-mapping-status"),
      previewSourceInput: m("#preview-source-input"),
      sourceSyntaxError: m("#source-syntax-error"),
      loadSampleBtn: m("#load-sample-btn"),
      runPreviewBtn: m("#run-preview-btn"),
      clearPreviewBtn: m("#clear-preview-btn"),
      previewEmpty: m("#preview-empty"),
      previewLoading: m("#preview-loading"),
      previewError: m("#preview-error"),
      previewErrorMessage: m("#preview-error-message"),
      previewSuccess: m("#preview-success"),
      previewParticipants: m("#preview-participants"),
      participantsCount: m("#participants-count"),
      previewFields: m("#preview-fields"),
      fieldsCount: m("#fields-count"),
      previewMetadata: m("#preview-metadata"),
      previewRawJson: m("#preview-raw-json"),
      previewRulesTbody: m("#preview-rules-tbody")
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
      refreshBtn: l,
      retryBtn: d,
      addFieldBtn: a,
      addRuleBtn: S,
      validateBtn: v,
      mappingForm: E,
      publishCancelBtn: T,
      publishConfirmBtn: R,
      deleteCancelBtn: F,
      deleteConfirmBtn: B,
      closePreviewBtn: O,
      loadSampleBtn: Y,
      runPreviewBtn: Q,
      clearPreviewBtn: re,
      previewSourceInput: me,
      searchInput: we,
      filterStatus: Pe,
      filterProvider: ft,
      mappingModal: je,
      publishModal: Xe,
      deleteModal: ot,
      previewModal: z
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), l?.addEventListener("click", () => this.loadMappings()), d?.addEventListener("click", () => this.loadMappings()), a?.addEventListener("click", () => this.addSchemaField()), S?.addEventListener("click", () => this.addMappingRule()), v?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (fe) => {
      fe.preventDefault(), this.saveMapping();
    }), T?.addEventListener("click", () => this.closePublishModal()), R?.addEventListener("click", () => this.publishMapping()), F?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), O?.addEventListener("click", () => this.closePreviewModal()), Y?.addEventListener("click", () => this.loadSamplePayload()), Q?.addEventListener("click", () => this.runPreviewTransform()), re?.addEventListener("click", () => this.clearPreview()), me?.addEventListener("input", Tn(() => this.validateSourceJson(), 300)), we?.addEventListener("input", Tn(() => this.renderMappings(), 300)), Pe?.addEventListener("change", () => this.renderMappings()), ft?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (fe) => {
      fe.key === "Escape" && (je && !je.classList.contains("hidden") && this.closeModal(), Xe && !Xe.classList.contains("hidden") && this.closePublishModal(), ot && !ot.classList.contains("hidden") && this.closeDeleteModal(), z && !z.classList.contains("hidden") && this.closePreviewModal());
    }), [je, Xe, ot, z].forEach((fe) => {
      fe?.addEventListener("click", (Te) => {
        const He = Te.target;
        (He === fe || He.getAttribute("aria-hidden") === "true") && (fe === je ? this.closeModal() : fe === Xe ? this.closePublishModal() : fe === ot ? this.closeDeleteModal() : fe === z && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Ie(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: l } = this.elements;
    switch (P(t), P(n), P(s), P(l), e) {
      case "loading":
        M(t);
        break;
      case "empty":
        M(n);
        break;
      case "error":
        M(s);
        break;
      case "list":
        M(l);
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
    const l = (t?.value || "").toLowerCase(), d = n?.value || "", a = s?.value || "", S = this.mappings.filter((v) => !(l && !v.name.toLowerCase().includes(l) && !v.provider.toLowerCase().includes(l) || d && v.status !== d || a && v.provider !== a));
    if (S.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = S.map(
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
      mappingProviderInput: s,
      schemaObjectTypeInput: l,
      schemaVersionInput: d,
      schemaFieldsContainer: a,
      mappingRulesContainer: S
    } = this.elements, v = [];
    a?.querySelectorAll(".schema-field-row").forEach((T) => {
      v.push({
        object: (T.querySelector(".field-object")?.value || "").trim(),
        field: (T.querySelector(".field-name")?.value || "").trim(),
        type: T.querySelector(".field-type")?.value || "string",
        required: T.querySelector(".field-required")?.checked || !1
      });
    });
    const E = [];
    return S?.querySelectorAll(".mapping-rule-row").forEach((T) => {
      E.push({
        source_object: (T.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (T.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: T.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (T.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: l?.value.trim() || "",
        version: d?.value.trim() || void 0,
        fields: v
      },
      rules: E
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
      mappingProviderInput: l,
      schemaObjectTypeInput: d,
      schemaVersionInput: a,
      schemaFieldsContainer: S,
      mappingRulesContainer: v,
      mappingStatusBadge: E,
      formValidationStatus: T
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), l && (l.value = e.provider || "");
    const R = e.external_schema || { object_type: "", fields: [] };
    d && (d.value = R.object_type || ""), a && (a.value = R.version || ""), S && (S.innerHTML = "", (R.fields || []).forEach((F) => S.appendChild(this.createSchemaFieldRow(F)))), v && (v.innerHTML = "", (e.rules || []).forEach((F) => v.appendChild(this.createMappingRuleRow(F)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), P(T);
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
      mappingRulesContainer: l,
      mappingStatusBadge: d,
      formValidationStatus: a
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), l && (l.innerHTML = ""), d && d.classList.add("hidden"), P(a), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), M(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: l } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), M(n), l?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    P(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: l } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), l && (l.textContent = `v${t.version || 1}`), M(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    P(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, M(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    P(this.elements.deleteModal), this.pendingDeleteId = null;
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
      }), l = await s.json();
      if (s.ok && l.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((l.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const d = l.errors || [l.error?.message || "Validation failed"];
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
      M(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, M(t));
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
      const n = !!t.id, s = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, d = await fetch(s, {
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
    const t = this.mappings.find((E) => E.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: s,
      previewMappingProvider: l,
      previewObjectType: d,
      previewMappingStatus: a,
      previewSourceInput: S,
      sourceSyntaxError: v
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), l && (l.textContent = t.provider), d && (d.textContent = t.external_schema?.object_type || "-"), a && (a.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), S && (S.value = ""), P(v), M(n), S?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    P(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: l } = this.elements;
    switch (P(t), P(n), P(s), P(l), e) {
      case "empty":
        M(t);
        break;
      case "loading":
        M(n);
        break;
      case "error":
        M(s);
        break;
      case "success":
        M(l);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", l = n.fields || [], d = {}, a = {};
    l.forEach((S) => {
      const v = S.field || "field";
      switch (S.type) {
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
    }), d[s] = a, e && (e.value = JSON.stringify(d, null, 2)), P(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return P(t), null;
    try {
      const s = JSON.parse(n);
      return P(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, M(t)), null;
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
    }, l = {}, d = {}, a = [];
    return n.forEach((S) => {
      const v = this.resolveSourceValue(e, S.source_object, S.source_field), E = v !== void 0;
      if (s.matched_rules.push({
        source: S.source_field,
        matched: E,
        value: v
      }), !!E)
        switch (S.target_entity) {
          case "participant":
            l[S.target_path] = v;
            break;
          case "agreement":
            d[S.target_path] = v;
            break;
          case "field_definition":
            a.push({ path: S.target_path, value: v });
            break;
        }
    }), Object.keys(l).length > 0 && s.participants.push({
      ...l,
      role: l.role || "signer",
      signing_stage: l.signing_stage || 1
    }), s.agreement = d, s.field_definitions = a, s;
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
          const l = e[s];
          if (n in l)
            return l[n];
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
      fieldsCount: l,
      previewMetadata: d,
      previewRawJson: a,
      previewRulesTbody: S
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
    const E = e.field_definitions || [];
    l && (l.textContent = `(${E.length})`), s && (E.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = E.map(
      (F) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(F.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(F.value))}</span>
          </div>
        `
    ).join(""));
    const T = e.agreement || {}, R = Object.entries(T);
    d && (R.length === 0 ? d.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : d.innerHTML = R.map(
      ([F, B]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(F)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(B))}</span>
          </div>
        `
    ).join("")), a && (a.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((F) => {
      const B = S?.querySelector(`[data-rule-source="${this.escapeHtml(F.source)}"] span`);
      B && (F.matched ? (B.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", B.textContent = "Matched") : (B.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", B.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), P(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function Ba(i) {
  const e = new Xi(i);
  return ee(() => e.init()), e;
}
function Fa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Xi(e);
  ee(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class Qi {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: m("#conflicts-announcements"),
      loadingState: m("#loading-state"),
      emptyState: m("#empty-state"),
      errorState: m("#error-state"),
      conflictsList: m("#conflicts-list"),
      errorMessage: m("#error-message"),
      refreshBtn: m("#refresh-btn"),
      retryBtn: m("#retry-btn"),
      filterStatus: m("#filter-status"),
      filterProvider: m("#filter-provider"),
      filterEntity: m("#filter-entity"),
      statPending: m("#stat-pending"),
      statResolved: m("#stat-resolved"),
      statIgnored: m("#stat-ignored"),
      conflictDetailModal: m("#conflict-detail-modal"),
      closeDetailBtn: m("#close-detail-btn"),
      detailReason: m("#detail-reason"),
      detailEntityType: m("#detail-entity-type"),
      detailStatusBadge: m("#detail-status-badge"),
      detailProvider: m("#detail-provider"),
      detailExternalId: m("#detail-external-id"),
      detailInternalId: m("#detail-internal-id"),
      detailBindingId: m("#detail-binding-id"),
      detailPayload: m("#detail-payload"),
      resolutionSection: m("#resolution-section"),
      detailResolvedAt: m("#detail-resolved-at"),
      detailResolvedBy: m("#detail-resolved-by"),
      detailResolution: m("#detail-resolution"),
      detailConflictId: m("#detail-conflict-id"),
      detailRunId: m("#detail-run-id"),
      detailCreatedAt: m("#detail-created-at"),
      detailVersion: m("#detail-version"),
      actionButtons: m("#action-buttons"),
      actionResolveBtn: m("#action-resolve-btn"),
      actionIgnoreBtn: m("#action-ignore-btn"),
      resolveModal: m("#resolve-modal"),
      resolveForm: m("#resolve-form"),
      cancelResolveBtn: m("#cancel-resolve-btn"),
      submitResolveBtn: m("#submit-resolve-btn"),
      resolutionAction: m("#resolution-action")
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
      filterProvider: l,
      filterEntity: d,
      actionResolveBtn: a,
      actionIgnoreBtn: S,
      cancelResolveBtn: v,
      resolveForm: E,
      conflictDetailModal: T,
      resolveModal: R
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), l?.addEventListener("change", () => this.renderConflicts()), d?.addEventListener("change", () => this.renderConflicts()), a?.addEventListener("click", () => this.openResolveModal("resolved")), S?.addEventListener("click", () => this.openResolveModal("ignored")), v?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (F) => this.submitResolution(F)), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && (R && !R.classList.contains("hidden") ? this.closeResolveModal() : T && !T.classList.contains("hidden") && this.closeConflictDetail());
    }), [T, R].forEach((F) => {
      F?.addEventListener("click", (B) => {
        const O = B.target;
        (O === F || O.getAttribute("aria-hidden") === "true") && (F === T ? this.closeConflictDetail() : F === R && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Ie(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: l } = this.elements;
    switch (P(t), P(n), P(s), P(l), e) {
      case "loading":
        M(t);
        break;
      case "empty":
        M(n);
        break;
      case "error":
        M(s);
        break;
      case "list":
        M(l);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((a) => a.status === "pending").length, l = this.conflicts.filter((a) => a.status === "resolved").length, d = this.conflicts.filter((a) => a.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(l)), n && (n.textContent = String(d));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const l = t?.value || "", d = n?.value || "", a = s?.value || "", S = this.conflicts.filter((v) => !(l && v.status !== l || d && v.provider !== d || a && v.entity_kind !== a));
    if (S.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = S.map(
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
    const t = this.conflicts.find((Pe) => Pe.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: l,
      detailStatusBadge: d,
      detailProvider: a,
      detailExternalId: S,
      detailInternalId: v,
      detailBindingId: E,
      detailConflictId: T,
      detailRunId: R,
      detailCreatedAt: F,
      detailVersion: B,
      detailPayload: O,
      resolutionSection: Y,
      actionButtons: Q,
      detailResolvedAt: re,
      detailResolvedBy: me,
      detailResolution: we
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), l && (l.textContent = t.entity_kind || "-"), d && (d.innerHTML = this.getStatusBadge(t.status)), a && (a.textContent = t.provider || "-"), S && (S.textContent = t.external_id || "-"), v && (v.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), T && (T.textContent = t.id), R && (R.textContent = t.run_id || "-"), F && (F.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), O)
      try {
        const Pe = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        O.textContent = JSON.stringify(Pe, null, 2);
      } catch {
        O.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (M(Y), P(Q), re && (re.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), me && (me.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), we)
        try {
          const Pe = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          we.textContent = JSON.stringify(Pe, null, 2);
        } catch {
          we.textContent = t.resolution_json || "{}";
        }
    } else
      P(Y), M(Q);
    M(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    P(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), M(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    P(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t);
    let l = {};
    const d = s.get("resolution");
    if (d)
      try {
        l = JSON.parse(d);
      } catch {
        l = { raw: d };
      }
    const a = s.get("notes");
    a && (l.notes = a);
    const S = {
      status: s.get("status"),
      resolution: l
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
        body: JSON.stringify(S)
      });
      if (!v.ok) {
        const E = await v.json();
        throw new Error(E.error?.message || `HTTP ${v.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (v) {
      console.error("Resolution error:", v);
      const E = v instanceof Error ? v.message : "Unknown error";
      this.showToast(`Failed: ${E}`, "error");
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
function Ra(i) {
  const e = new Qi(i);
  return ee(() => e.init()), e;
}
function Ha(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Qi(e);
  ee(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class Zi {
  constructor(e) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: m("#sync-announcements"),
      loadingState: m("#loading-state"),
      emptyState: m("#empty-state"),
      errorState: m("#error-state"),
      runsTimeline: m("#runs-timeline"),
      errorMessage: m("#error-message"),
      refreshBtn: m("#refresh-btn"),
      retryBtn: m("#retry-btn"),
      filterProvider: m("#filter-provider"),
      filterStatus: m("#filter-status"),
      filterDirection: m("#filter-direction"),
      statTotal: m("#stat-total"),
      statRunning: m("#stat-running"),
      statCompleted: m("#stat-completed"),
      statFailed: m("#stat-failed"),
      startSyncBtn: m("#start-sync-btn"),
      startSyncEmptyBtn: m("#start-sync-empty-btn"),
      startSyncModal: m("#start-sync-modal"),
      startSyncForm: m("#start-sync-form"),
      cancelSyncBtn: m("#cancel-sync-btn"),
      submitSyncBtn: m("#submit-sync-btn"),
      syncMappingSelect: m("#sync-mapping"),
      runDetailModal: m("#run-detail-modal"),
      closeDetailBtn: m("#close-detail-btn"),
      detailRunId: m("#detail-run-id"),
      detailProvider: m("#detail-provider"),
      detailDirection: m("#detail-direction"),
      detailStatus: m("#detail-status"),
      detailStarted: m("#detail-started"),
      detailCompleted: m("#detail-completed"),
      detailCursor: m("#detail-cursor"),
      detailAttempt: m("#detail-attempt"),
      detailErrorSection: m("#detail-error-section"),
      detailLastError: m("#detail-last-error"),
      detailCheckpoints: m("#detail-checkpoints"),
      actionResumeBtn: m("#action-resume-btn"),
      actionRetryBtn: m("#action-retry-btn"),
      actionCompleteBtn: m("#action-complete-btn"),
      actionFailBtn: m("#action-fail-btn"),
      actionDiagnosticsBtn: m("#action-diagnostics-btn")
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
      refreshBtn: l,
      retryBtn: d,
      closeDetailBtn: a,
      filterProvider: S,
      filterStatus: v,
      filterDirection: E,
      actionResumeBtn: T,
      actionRetryBtn: R,
      actionCompleteBtn: F,
      actionFailBtn: B,
      actionDiagnosticsBtn: O,
      startSyncModal: Y,
      runDetailModal: Q
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (re) => this.startSync(re)), l?.addEventListener("click", () => this.loadSyncRuns()), d?.addEventListener("click", () => this.loadSyncRuns()), a?.addEventListener("click", () => this.closeRunDetail()), S?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), T?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("resume")), F?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), O?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (re) => {
      re.key === "Escape" && (Y && !Y.classList.contains("hidden") && this.closeStartSyncModal(), Q && !Q.classList.contains("hidden") && this.closeRunDetail());
    }), [Y, Q].forEach((re) => {
      re?.addEventListener("click", (me) => {
        const we = me.target;
        (we === re || we.getAttribute("aria-hidden") === "true") && (re === Y ? this.closeStartSyncModal() : re === Q && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Ie(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: l } = this.elements;
    switch (P(t), P(n), P(s), P(l), e) {
      case "loading":
        M(t);
        break;
      case "empty":
        M(n);
        break;
      case "error":
        M(s);
        break;
      case "list":
        M(l);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, l = this.syncRuns.length, d = this.syncRuns.filter(
      (v) => v.status === "running" || v.status === "pending"
    ).length, a = this.syncRuns.filter((v) => v.status === "completed").length, S = this.syncRuns.filter((v) => v.status === "failed").length;
    e && (e.textContent = String(l)), t && (t.textContent = String(d)), n && (n.textContent = String(a)), s && (s.textContent = String(S));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", l = n?.value || "", d = this.syncRuns.filter((a) => !(s && a.status !== s || l && a.direction !== l));
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
    t?.reset(), M(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    P(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t), l = {
      provider: s.get("provider"),
      direction: s.get("direction"),
      mapping_spec_id: s.get("mapping_spec_id"),
      cursor: s.get("cursor") || void 0
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
        body: JSON.stringify(l)
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
    const t = this.syncRuns.find((me) => me.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: l,
      detailDirection: d,
      detailStatus: a,
      detailStarted: S,
      detailCompleted: v,
      detailCursor: E,
      detailAttempt: T,
      detailErrorSection: R,
      detailLastError: F,
      detailCheckpoints: B,
      actionResumeBtn: O,
      actionRetryBtn: Y,
      actionCompleteBtn: Q,
      actionFailBtn: re
    } = this.elements;
    s && (s.textContent = t.id), l && (l.textContent = t.provider), d && (d.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), a && (a.innerHTML = this.getStatusBadge(t.status)), S && (S.textContent = this.formatDate(t.started_at)), v && (v.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), T && (T.textContent = String(t.attempt_count || 1)), t.last_error ? (F && (F.textContent = t.last_error), M(R)) : P(R), O && O.classList.toggle("hidden", t.status !== "running"), Y && Y.classList.toggle("hidden", t.status !== "failed"), Q && Q.classList.toggle("hidden", t.status !== "running"), re && re.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), M(n);
    try {
      const me = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (me.ok) {
        const we = await me.json();
        this.renderCheckpoints(we.checkpoints || []);
      } else
        B && (B.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (me) {
      console.error("Error loading checkpoints:", me), B && (B.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    P(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: l } = this.elements, d = e === "resume" ? t : e === "complete" ? s : l, a = e === "resume" ? n : null;
    if (!d) return;
    d.setAttribute("disabled", "true"), a?.setAttribute("disabled", "true");
    const S = d.innerHTML;
    d.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const v = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, E = await fetch(v, {
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
      if (!E.ok) {
        const T = await E.json();
        throw new Error(T.error?.message || `HTTP ${E.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (v) {
      console.error(`${e} error:`, v);
      const E = v instanceof Error ? v.message : "Unknown error";
      this.showToast(`Failed: ${E}`, "error");
    } finally {
      d.removeAttribute("disabled"), a?.removeAttribute("disabled"), d.innerHTML = S;
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
function Na(i) {
  const e = new Zi(i);
  return ee(() => e.init()), e;
}
function Ua(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Zi(e);
  ee(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const si = "esign.google.account_id", nr = 25 * 1024 * 1024, ir = 2e3, Di = 60, li = "application/vnd.google-apps.document", di = "application/pdf", Mi = "application/vnd.google-apps.folder", sr = [li, di];
class mi {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || nr, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      // Upload panel
      form: m("#document-upload-form"),
      fileInput: m("#pdf_file"),
      uploadZone: m("#pdf-upload-zone"),
      placeholder: m("#upload-placeholder"),
      preview: m("#upload-preview"),
      fileName: m("#selected-file-name"),
      fileSize: m("#selected-file-size"),
      clearBtn: m("#clear-file-btn"),
      errorEl: m("#upload-error"),
      submitBtn: m("#submit-btn"),
      titleInput: m("#title"),
      sourceObjectKeyInput: m("#source_object_key"),
      // Source tabs
      sourceTabs: Tt(".source-tab"),
      sourcePanels: Tt(".source-panel"),
      announcements: m("#doc-announcements"),
      // Google Drive panel
      searchInput: m("#drive-search"),
      clearSearchBtn: m("#clear-search-btn"),
      fileList: m("#file-list"),
      loadingState: m("#loading-state"),
      breadcrumb: m("#breadcrumb"),
      listTitle: m("#list-title"),
      resultCount: m("#result-count"),
      pagination: m("#pagination"),
      loadMoreBtn: m("#load-more-btn"),
      refreshBtn: m("#refresh-btn"),
      driveAccountDropdown: m("#drive-account-dropdown"),
      accountScopeHelp: m("#account-scope-help"),
      connectGoogleLink: m("#connect-google-link"),
      // Selection panel
      noSelection: m("#no-selection"),
      filePreview: m("#file-preview"),
      previewIcon: m("#preview-icon"),
      previewTitle: m("#preview-title"),
      previewType: m("#preview-type"),
      importTypeInfo: m("#import-type-info"),
      importTypeLabel: m("#import-type-label"),
      importTypeDesc: m("#import-type-desc"),
      snapshotWarning: m("#snapshot-warning"),
      importDocumentTitle: m("#import-document-title"),
      importBtn: m("#import-btn"),
      importBtnText: m("#import-btn-text"),
      clearSelectionBtn: m("#clear-selection-btn"),
      // Import status
      importStatus: m("#import-status"),
      importStatusQueued: m("#import-status-queued"),
      importStatusSuccess: m("#import-status-success"),
      importStatusFailed: m("#import-status-failed"),
      importStatusMessage: m("#import-status-message"),
      importErrorMessage: m("#import-error-message"),
      importRetryBtn: m("#import-retry-btn"),
      importReconnectLink: m("#import-reconnect-link")
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
      titleInput: l
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (d) => {
      d.preventDefault(), d.stopPropagation(), this.clearFileSelection();
    }), l && l.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((d) => {
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
      refreshBtn: s,
      clearSelectionBtn: l,
      importBtn: d,
      importRetryBtn: a,
      driveAccountDropdown: S
    } = this.elements;
    if (e) {
      const v = Tn(() => this.handleSearch(), 300);
      e.addEventListener("input", v);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), S && S.addEventListener("change", () => {
      this.setCurrentAccountId(S.value, this.currentSource === "google");
    }), l && l.addEventListener("click", () => this.clearFileSelection()), d && d.addEventListener("click", () => this.startImport()), a && a.addEventListener("click", () => {
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
        window.localStorage.getItem(si)
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
      const { searchInput: s, clearSearchBtn: l } = this.elements;
      s && (s.value = ""), l && P(l), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const l = this.normalizeAccountId(s?.account_id);
      if (n.has(l))
        continue;
      n.add(l);
      const d = document.createElement("option");
      d.value = l;
      const a = String(s?.email || "").trim(), S = String(s?.status || "").trim(), v = a || l || "Default account";
      d.textContent = S && S !== "connected" ? `${v} (${S})` : v, l === this.currentAccountId && (d.selected = !0), e.appendChild(d);
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
      this.currentAccountId ? window.localStorage.setItem(si, this.currentAccountId) : window.localStorage.removeItem(si);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, M(e)) : P(e)), t) {
      const s = t.dataset.baseHref || t.getAttribute("href");
      s && t.setAttribute("href", this.applyAccountIdToPath(s));
    }
    n && (Array.from(n.options).some(
      (l) => this.normalizeAccountId(l.value) === this.currentAccountId
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
      n.id.replace("panel-", "") === e ? M(n) : P(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), Ie(
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
        const l = s.name.replace(/\.pdf$/i, "");
        t.value = l;
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
      `File is too large (${En(e.size)}). Maximum size is ${En(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: l, uploadZone: d } = this.elements;
    s && (s.textContent = e.name), l && (l.textContent = En(e.size)), t && P(t), n && M(n), d && (d.classList.remove("border-gray-300"), d.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && M(e), t && P(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, M(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", P(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, l = t?.value.trim().length ?? !1, d = s && l;
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), s = t.get("org_id"), l = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && l.searchParams.set("tenant_id", n), s && l.searchParams.set("org_id", s);
    const d = new FormData();
    d.append("file", e);
    const a = await fetch(l.toString(), {
      method: "POST",
      body: d,
      credentials: "same-origin"
    }), S = await a.json().catch(() => ({}));
    if (!a.ok) {
      const E = S?.error?.message || S?.message || "Upload failed. Please try again.";
      throw new Error(E);
    }
    const v = S?.object_key ? String(S.object_key).trim() : "";
    if (!v)
      throw new Error("Upload failed: missing source object key.");
    return v;
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: s } = this.elements, l = t?.files?.[0];
    if (!(!l || !this.validateFile(l))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const d = await this.uploadSourcePDF(l);
        s && (s.value = d), n?.submit();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), l = String(e.modifiedTime || e.ModifiedTime || "").trim(), d = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: l,
      webViewLink: d,
      parents: v,
      owners: E
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === li;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === di;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Mi;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return sr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === li ? "Google Document" : t === di ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Mi ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: s, append: l } = e, { fileList: d } = this.elements;
    !l && d && (d.innerHTML = `
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
      n ? (a = this.buildScopedAPIURL("/esign/google-drive/search"), a.searchParams.set("q", n), a.searchParams.set("page_size", "20"), s && a.searchParams.set("page_token", s)) : (a = this.buildScopedAPIURL("/esign/google-drive/browse"), a.searchParams.set("page_size", "20"), t && t !== "root" && a.searchParams.set("folder_id", t), s && a.searchParams.set("page_token", s));
      const S = await fetch(a.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), v = await S.json();
      if (!S.ok)
        throw new Error(v.error?.message || "Failed to load files");
      const E = Array.isArray(v.files) ? v.files.map((B) => this.normalizeDriveFile(B)) : [];
      this.nextPageToken = v.next_page_token || null, l ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(l);
      const { resultCount: T, listTitle: R } = this.elements;
      n && T ? (T.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, R && (R.textContent = "Search Results")) : (T && (T.textContent = ""), R && (R.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: F } = this.elements;
      F && (this.nextPageToken ? M(F) : P(F)), Ie(`Loaded ${E.length} files`);
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
        `), Ie(`Error: ${a instanceof Error ? a.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((s, l) => {
      const d = this.getFileIcon(s), a = this.isImportable(s), S = this.isFolder(s), v = this.selectedFile && this.selectedFile.id === s.id, E = !a && !S;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${v ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${E ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${v}"
          data-file-index="${l}"
          ${E ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${d.bg} flex items-center justify-center flex-shrink-0 ${d.text}">
            ${d.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + Pn(s.modifiedTime) : ""}
              ${E ? " • Not importable" : ""}
            </p>
          </div>
          ${S ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((s) => {
      s.addEventListener("click", () => {
        const l = parseInt(s.dataset.fileIndex || "0", 10), d = this.currentFiles[l];
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
    t && (t.value = ""), n && P(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      P(e);
      return;
    }
    M(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, s) => {
      const l = s === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${s > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${s}" class="breadcrumb-item ${l ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const s = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, s + 1), this.updateBreadcrumb();
        const l = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: l.id });
      });
    }));
  }
  /**
   * Select a file
   */
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: s } = this.elements;
    s && s.querySelectorAll(".file-item").forEach((Y) => {
      const Q = parseInt(Y.dataset.fileIndex || "0", 10);
      this.currentFiles[Q].id === e.id ? (Y.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), Y.setAttribute("aria-selected", "true")) : (Y.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), Y.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: l,
      filePreview: d,
      importStatus: a,
      previewIcon: S,
      previewTitle: v,
      previewType: E,
      importTypeInfo: T,
      importTypeLabel: R,
      importTypeDesc: F,
      snapshotWarning: B,
      importDocumentTitle: O
    } = this.elements;
    l && P(l), d && M(d), a && P(a), S && (S.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, S.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), v && (v.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && T && (T.className = `p-3 rounded-lg border ${n.bgClass}`, R && (R.textContent = n.label, R.className = `text-xs font-medium ${n.textClass}`), F && (F.textContent = n.desc, F.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? M(B) : P(B))), O && (O.value = e.name || ""), Ie(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && M(e), t && P(t), n && P(n), s && s.querySelectorAll(".file-item").forEach((l) => {
      l.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), l.setAttribute("aria-selected", "false");
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
      t && M(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && P(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && P(t), this.searchQuery = "";
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
      importStatusQueued: l,
      importStatusSuccess: d,
      importStatusFailed: a
    } = this.elements;
    switch (t && P(t), n && P(n), s && M(s), l && P(l), d && P(d), a && P(a), e) {
      case "queued":
      case "running":
        l && M(l);
        break;
      case "succeeded":
        d && M(d);
        break;
      case "failed":
        a && M(a);
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
        const l = this.config.routes.integrations || "/admin/esign/integrations/google";
        s.href = this.applyAccountIdToPath(l), M(s);
      } else
        P(s);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: s } = this.elements;
    if (!this.selectedFile || !e) return;
    const l = e.value.trim();
    if (!l) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && P(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
            document_title: l
          })
        }
      ), S = await a.json();
      if (!a.ok) {
        const E = S.error?.code || "";
        throw { message: S.error?.message || "Failed to start import", code: E };
      }
      this.currentImportRunId = S.import_run_id, this.pollAttempts = 0;
      const v = new URL(window.location.href);
      this.currentImportRunId && v.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", v.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), ir);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Di) {
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
            this.showImportStatus("succeeded"), Ie("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const l = n.error?.code || "", d = n.error?.message || "Import failed";
            this.showImportError(d, l), Ie("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Di ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function qa(i) {
  const e = new mi(i);
  return ee(() => e.init()), e;
}
function ja(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new mi(e);
  ee(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function rr(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, s = i.context && typeof i.context == "object" ? i.context : {}, l = String(t.index || "").trim();
  return !e && !l ? null : {
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
      index: l,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && ee(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = rr(t);
        n && new mi(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const Ae = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, mt = Ae.REVIEW, ar = {
  [Ae.DOCUMENT]: "Details",
  [Ae.DETAILS]: "Participants",
  [Ae.PARTICIPANTS]: "Fields",
  [Ae.FIELDS]: "Placement",
  [Ae.PLACEMENT]: "Review"
}, ke = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, _n = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, ui = /* @__PURE__ */ new Map(), or = 30 * 60 * 1e3, $i = {
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
function cr(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function lr(i) {
  const e = i instanceof Error ? i.message : i, t = cr(e);
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
  if (t && $i[t]) {
    const n = $i[t];
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
function Bi() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function dr() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function ur() {
  if (!dr())
    throw new Error("PDF preview library unavailable");
}
function pr(i) {
  const e = ui.get(i);
  return e ? Date.now() - e.timestamp > or ? (ui.delete(i), null) : e : null;
}
function gr(i, e, t) {
  ui.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function mr(i, e = _n.THUMBNAIL_MAX_WIDTH, t = _n.THUMBNAIL_MAX_HEIGHT) {
  await ur();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const l = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, d = l.numPages, a = await l.getPage(1), S = a.getViewport({ scale: 1 }), v = e / S.width, E = t / S.height, T = Math.min(v, E, 1), R = a.getViewport({ scale: T }), F = document.createElement("canvas");
  F.width = R.width, F.height = R.height;
  const B = F.getContext("2d");
  if (!B)
    throw new Error("Failed to get canvas context");
  return await a.render({
    canvasContext: B,
    viewport: R
  }).promise, { dataUrl: F.toDataURL("image/jpeg", 0.8), pageCount: d };
}
class hr {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || _n.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || _n.THUMBNAIL_MAX_HEIGHT
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
    const t = e === Ae.DOCUMENT || e === Ae.DETAILS || e === Ae.PARTICIPANTS || e === Ae.FIELDS || e === Ae.REVIEW;
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
    const l = pr(e);
    if (l) {
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? l.pageCount,
        thumbnailUrl: l.dataUrl,
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
      const d = await this.fetchDocumentPdfUrl(e);
      if (s !== this.requestVersion)
        return;
      const { dataUrl: a, pageCount: S } = await mr(
        d,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      gr(e, a, S), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? S,
        thumbnailUrl: a,
        isLoading: !1,
        error: null
      };
    } catch (d) {
      if (s !== this.requestVersion)
        return;
      const a = d instanceof Error ? d.message : "Failed to load preview", S = lr(a);
      Bi() && console.error("Failed to load document preview:", d), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: a,
        errorMessage: S.message,
        errorSuggestion: S.suggestion,
        errorRetryable: S.isRetryable
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: l, errorState: d, emptyState: a, contentState: S } = this.elements;
    if (e) {
      if (l?.classList.add("hidden"), d?.classList.add("hidden"), a?.classList.add("hidden"), S?.classList.add("hidden"), !this.state.documentId) {
        a?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        l?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        d?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Bi() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      S?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), s && this.state.pageCount && (s.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
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
function fr(i = {}) {
  const e = new hr(i);
  return e.init(), e;
}
function yr() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function vr() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function br(i, e) {
  return {
    id: yr(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Fi(i, e) {
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
function Ri(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Hi(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function es(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function wr(i, e) {
  const t = es(i, e.definitionId);
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
function Sr(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const l of t)
    s.add(l.definitionId);
  for (const [l, d] of n) {
    if (d.page !== e || s.has(l) || i.unlinkedDefinitions.has(l)) continue;
    const a = i.definitionToGroup.get(l);
    if (!a) continue;
    const S = i.groups.get(a);
    if (!S || !S.isActive || !S.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: l,
      type: d.type,
      participantId: d.participantId,
      participantName: d.participantName,
      page: e,
      x: S.templatePosition.x,
      y: S.templatePosition.y,
      width: S.templatePosition.width,
      height: S.templatePosition.height,
      placementSource: ke.AUTO_LINKED,
      linkGroupId: S.id,
      linkedFromFieldId: S.sourceFieldId
    } };
  }
  return null;
}
const Ni = 150, Ui = 32;
function se(i) {
  return i == null ? "" : String(i).trim();
}
function ts(i) {
  if (typeof i == "boolean") return i;
  const e = se(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function ns(i) {
  return se(i).toLowerCase();
}
function ge(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(se(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function In(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(se(i));
  return Number.isFinite(t) ? t : e;
}
function Ln(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function ht(i, e) {
  const t = ge(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function on(i, e, t = 1) {
  const n = ge(t, 1), s = ge(i, n);
  return e > 0 ? Ln(s, 1, e) : s > 0 ? s : n;
}
function xr(i, e, t) {
  const n = ge(t, 1);
  let s = ht(i, n), l = ht(e, n);
  return s <= 0 && (s = 1), l <= 0 && (l = n), l < s ? { start: l, end: s } : { start: s, end: l };
}
function ln(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => se(n)) : se(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = ge(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function Cn(i, e) {
  const t = ge(e, 1), n = se(i.participantId ?? i.participant_id), s = ln(i.excludePages ?? i.exclude_pages), l = i.required, d = typeof l == "boolean" ? l : !["0", "false", "off", "no"].includes(se(l).toLowerCase());
  return {
    id: se(i.id),
    type: ns(i.type),
    participantId: n,
    participantTempId: se(i.participantTempId) || n,
    fromPage: ht(i.fromPage ?? i.from_page, t),
    toPage: ht(i.toPage ?? i.to_page, t),
    page: ht(i.page, t),
    excludeLastPage: ts(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: d
  };
}
function Ir(i) {
  return {
    id: se(i.id),
    type: ns(i.type),
    participant_id: se(i.participantId),
    from_page: ht(i.fromPage, 0),
    to_page: ht(i.toPage, 0),
    page: ht(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: ln(i.excludePages),
    required: i.required !== !1
  };
}
function Er(i, e) {
  const t = se(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Lr(i, e) {
  const t = ge(e, 1), n = [];
  return i.forEach((s, l) => {
    const d = Cn(s || {}, t);
    if (d.type === "") return;
    const a = Er(d, l);
    if (d.type === "initials_each_page") {
      const S = xr(d.fromPage, d.toPage, t), v = /* @__PURE__ */ new Set();
      ln(d.excludePages).forEach((E) => {
        E <= t && v.add(E);
      }), d.excludeLastPage && v.add(t);
      for (let E = S.start; E <= S.end; E += 1)
        v.has(E) || n.push({
          id: `${a}-initials-${E}`,
          type: "initials",
          page: E,
          participantId: se(d.participantId),
          required: d.required !== !1,
          ruleId: a
          // Phase 3: Track rule ID for link group creation
        });
      return;
    }
    if (d.type === "signature_once") {
      let S = d.page > 0 ? d.page : d.toPage > 0 ? d.toPage : t;
      S <= 0 && (S = 1), n.push({
        id: `${a}-signature-${S}`,
        type: "signature",
        page: S,
        participantId: se(d.participantId),
        required: d.required !== !1,
        ruleId: a
        // Phase 3: Track rule ID for link group creation
      });
    }
  }), n.sort((s, l) => s.page !== l.page ? s.page - l.page : s.id.localeCompare(l.id)), n;
}
function Cr(i, e, t, n, s) {
  const l = ge(t, 1);
  let d = i > 0 ? i : 1, a = e > 0 ? e : l;
  d = Ln(d, 1, l), a = Ln(a, 1, l), a < d && ([d, a] = [a, d]);
  const S = /* @__PURE__ */ new Set();
  s.forEach((E) => {
    const T = ge(E, 0);
    T > 0 && S.add(Ln(T, 1, l));
  }), n && S.add(l);
  const v = [];
  for (let E = d; E <= a; E += 1)
    S.has(E) || v.push(E);
  return {
    pages: v,
    rangeStart: d,
    rangeEnd: a,
    excludedPages: Array.from(S).sort((E, T) => E - T),
    isEmpty: v.length === 0
  };
}
function kr(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const l = e[n], d = e[s - 1];
      l === d ? t.push(String(l)) : d === l + 1 ? t.push(`${l}, ${d}`) : t.push(`${l}-${d}`), n = s;
    }
  return `pages ${t.join(", ")}`;
}
function ri(i) {
  const e = i || {};
  return {
    id: se(e.id),
    title: se(e.title || e.name) || "Untitled",
    pageCount: ge(e.page_count ?? e.pageCount, 0),
    compatibilityTier: se(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: se(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function is(i) {
  const e = se(i).toLowerCase();
  if (e === "") return ke.MANUAL;
  switch (e) {
    case ke.AUTO:
    case ke.MANUAL:
    case ke.AUTO_LINKED:
    case ke.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function kn(i, e = 0) {
  const t = i || {}, n = se(t.id) || `fi_init_${e}`, s = se(t.definitionId || t.definition_id || t.field_definition_id) || n, l = ge(t.page ?? t.page_number, 1), d = In(t.x ?? t.pos_x, 0), a = In(t.y ?? t.pos_y, 0), S = In(t.width, Ni), v = In(t.height, Ui);
  return {
    id: n,
    definitionId: s,
    type: se(t.type) || "text",
    participantId: se(t.participantId || t.participant_id),
    participantName: se(t.participantName || t.participant_name) || "Unassigned",
    page: l > 0 ? l : 1,
    x: d >= 0 ? d : 0,
    y: a >= 0 ? a : 0,
    width: S > 0 ? S : Ni,
    height: v > 0 ? v : Ui,
    placementSource: is(t.placementSource || t.placement_source),
    linkGroupId: se(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: se(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: ts(t.isUnlinked ?? t.is_unlinked)
  };
}
function qi(i, e = 0) {
  const t = kn(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: is(t.placementSource),
    link_group_id: se(t.linkGroupId),
    linked_from_field_id: se(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Ar(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), l = /\/v\d+$/i.test(s) ? s : `${s}/v1`, d = `${l}/esign/drafts`, a = !!e.is_edit, S = !!e.create_success, v = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), T = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, R = Array.isArray(e.initial_participants) ? e.initial_participants : [], F = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(c) {
    if (!v) return c;
    const o = c.includes("?") ? "&" : "?";
    return `${c}${o}user_id=${encodeURIComponent(v)}`;
  }
  function O(c = !0) {
    const o = { Accept: "application/json" };
    return c && (o["Content-Type"] = "application/json"), v && (o["X-User-ID"] = v), o;
  }
  const Y = 1, Q = "esign_wizard_state_v1", re = "esign_wizard_sync", me = 2e3, we = [1e3, 2e3, 5e3, 1e4, 3e4];
  class Pe {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.state = this.loadFromSession() || this.createInitialState();
    }
    createInitialState() {
      return {
        wizardId: this.generateWizardId(),
        version: Y,
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
        const o = sessionStorage.getItem(Q);
        if (!o) return null;
        const p = JSON.parse(o);
        return p.version !== Y ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(p)) : this.normalizeLoadedState(p);
      } catch (o) {
        return console.error("Failed to load wizard state from session:", o), null;
      }
    }
    normalizeLoadedState(o) {
      if (!o || typeof o != "object")
        return this.createInitialState();
      const p = this.createInitialState(), h = { ...p, ...o }, b = Number.parseInt(String(o.currentStep ?? p.currentStep), 10);
      h.currentStep = Number.isFinite(b) ? Math.min(Math.max(b, 1), mt) : p.currentStep;
      const w = o.document && typeof o.document == "object" ? o.document : {}, k = w.id;
      h.document = {
        id: k == null ? null : String(k).trim() || null,
        title: String(w.title ?? "").trim() || null,
        pageCount: ge(w.pageCount, 0) || null
      };
      const D = o.details && typeof o.details == "object" ? o.details : {};
      h.details = {
        title: String(D.title ?? "").trim(),
        message: String(D.message ?? "")
      }, h.participants = Array.isArray(o.participants) ? o.participants : [], h.fieldDefinitions = Array.isArray(o.fieldDefinitions) ? o.fieldDefinitions : [], h.fieldPlacements = Array.isArray(o.fieldPlacements) ? o.fieldPlacements : [], h.fieldRules = Array.isArray(o.fieldRules) ? o.fieldRules : [];
      const _ = String(o.wizardId ?? "").trim();
      h.wizardId = _ || p.wizardId, h.version = Y, h.createdAt = String(o.createdAt ?? p.createdAt), h.updatedAt = String(o.updatedAt ?? p.updatedAt);
      const A = String(o.serverDraftId ?? "").trim();
      return h.serverDraftId = A || null, h.serverRevision = ge(o.serverRevision, 0), h.lastSyncedAt = String(o.lastSyncedAt ?? "").trim() || null, h.syncPending = !!o.syncPending, h;
    }
    migrateState(o) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(Q, JSON.stringify(this.state));
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
    markSynced(o, p) {
      this.state.serverDraftId = o, this.state.serverRevision = p, this.state.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.syncPending = !1, this.saveToSession(), this.notifyListeners();
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(Q), this.notifyListeners();
    }
    hasResumableState() {
      if (!this.state || typeof this.state != "object") return !1;
      const o = Number.parseInt(String(this.state.currentStep ?? 1), 10), p = String(this.state.document?.id ?? "").trim() !== "", h = Array.isArray(this.state.participants) ? this.state.participants.length : 0, b = String(this.state.details?.title ?? "").trim();
      return Number.isFinite(o) && o > 1 || p || h > 0 || b !== "";
    }
    onStateChange(o) {
      return this.listeners.push(o), () => {
        this.listeners = this.listeners.filter((p) => p !== o);
      };
    }
    notifyListeners() {
      this.listeners.forEach((o) => o(this.state));
    }
    collectFormState() {
      const o = document.getElementById("document_id")?.value || null, p = document.getElementById("selected-document-title")?.textContent?.trim() || null, h = document.getElementById("title"), b = document.getElementById("message"), w = [];
      document.querySelectorAll(".participant-entry").forEach((A) => {
        const C = A.getAttribute("data-participant-id"), N = A.querySelector('input[name*=".name"]')?.value || "", U = A.querySelector('input[name*=".email"]')?.value || "", V = A.querySelector('select[name*=".role"]')?.value || "signer", q = parseInt(A.querySelector(".signing-stage-input")?.value || "1", 10);
        w.push({ tempId: C, name: N, email: U, role: V, signingStage: q });
      });
      const k = [];
      document.querySelectorAll(".field-definition-entry").forEach((A) => {
        const C = A.getAttribute("data-field-definition-id"), N = A.querySelector(".field-type-select")?.value || "signature", U = A.querySelector(".field-participant-select")?.value || "", V = parseInt(A.querySelector('input[name*=".page"]')?.value || "1", 10), q = A.querySelector('input[name*=".required"]')?.checked ?? !0;
        k.push({ tempId: C, type: N, participantTempId: U, page: V, required: q });
      });
      const D = g(), _ = parseInt(Oe?.value || "0", 10) || null;
      return {
        document: { id: o, title: p, pageCount: _ },
        details: {
          title: h?.value || "",
          message: b?.value || ""
        },
        participants: w,
        fieldDefinitions: k,
        fieldPlacements: L?.fieldInstances || [],
        fieldRules: D
      };
    }
    restoreFormState() {
      const o = this.state;
      if (!o) return;
      if (o.document.id) {
        const b = document.getElementById("document_id"), w = document.getElementById("selected-document"), k = document.getElementById("document-picker"), D = document.getElementById("selected-document-title"), _ = document.getElementById("selected-document-info");
        b && (b.value = o.document.id), D && (D.textContent = o.document.title || "Selected Document"), _ && (_.textContent = o.document.pageCount ? `${o.document.pageCount} pages` : ""), Oe && o.document.pageCount && (Oe.value = String(o.document.pageCount)), w && w.classList.remove("hidden"), k && k.classList.add("hidden");
      }
      const p = document.getElementById("title"), h = document.getElementById("message");
      p && o.details.title && (p.value = o.details.title), h && o.details.message && (h.value = o.details.message);
    }
  }
  class ft {
    constructor(o) {
      this.stateManager = o, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(o) {
      const p = {
        wizard_id: o.wizardId,
        wizard_state: o,
        title: o.details.title || "Untitled Agreement",
        current_step: o.currentStep,
        document_id: o.document.id || null,
        created_by_user_id: v
      }, h = await fetch(B(d), {
        method: "POST",
        credentials: "same-origin",
        headers: O(),
        body: JSON.stringify(p)
      });
      if (!h.ok) {
        const b = await h.json().catch(() => ({}));
        throw new Error(b.error?.message || `HTTP ${h.status}`);
      }
      return h.json();
    }
    async update(o, p, h) {
      const b = {
        expected_revision: h,
        wizard_state: p,
        title: p.details.title || "Untitled Agreement",
        current_step: p.currentStep,
        document_id: p.document.id || null,
        updated_by_user_id: v
      }, w = await fetch(B(`${d}/${o}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: O(),
        body: JSON.stringify(b)
      });
      if (w.status === 409) {
        const k = await w.json().catch(() => ({})), D = new Error("stale_revision");
        throw D.code = "stale_revision", D.currentRevision = k.error?.details?.current_revision, D;
      }
      if (!w.ok) {
        const k = await w.json().catch(() => ({}));
        throw new Error(k.error?.message || `HTTP ${w.status}`);
      }
      return w.json();
    }
    async load(o) {
      const p = await fetch(B(`${d}/${o}`), {
        credentials: "same-origin",
        headers: O(!1)
      });
      if (!p.ok) {
        const h = new Error(`HTTP ${p.status}`);
        throw h.status = p.status, h;
      }
      return p.json();
    }
    async delete(o) {
      const p = await fetch(B(`${d}/${o}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: O(!1)
      });
      if (!p.ok && p.status !== 404)
        throw new Error(`HTTP ${p.status}`);
    }
    async list() {
      const o = await fetch(B(`${d}?limit=10`), {
        credentials: "same-origin",
        headers: O(!1)
      });
      if (!o.ok)
        throw new Error(`HTTP ${o.status}`);
      return o.json();
    }
    async sync() {
      const o = this.stateManager.getState();
      if (o.syncPending)
        try {
          let p;
          return o.serverDraftId ? p = await this.update(o.serverDraftId, o, o.serverRevision) : p = await this.create(o), this.stateManager.markSynced(p.id, p.revision), this.retryCount = 0, { success: !0, result: p };
        } catch (p) {
          return p.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: p.currentRevision } : { success: !1, error: p.message };
        }
    }
  }
  class je {
    constructor(o, p, h) {
      this.stateManager = o, this.syncService = p, this.statusUpdater = h, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(re), this.channel.onmessage = (o) => this.handleChannelMessage(o.data), this.channel.postMessage({ type: "presence", tabId: this.getTabId() });
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
            const p = this.stateManager.loadFromSession();
            p && (this.stateManager.state = p, this.stateManager.notifyListeners());
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
    broadcastSyncCompleted(o, p) {
      this.channel?.postMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: o,
        revision: p
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
      }, me);
    }
    async forceSync(o = {}) {
      this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
      const p = o && o.keepalive === !0, h = this.stateManager.getState();
      if (!p) {
        await this.performSync();
        return;
      }
      if (h.syncPending && h.serverDraftId) {
        const b = JSON.stringify({
          expected_revision: h.serverRevision,
          wizard_state: h,
          title: h.details.title || "Untitled Agreement",
          current_step: h.currentStep,
          document_id: h.document.id || null,
          updated_by_user_id: v
        });
        try {
          const w = await fetch(B(`${d}/${h.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: O(),
            body: b,
            keepalive: !0
          });
          if (w.status === 409) {
            const A = await w.json().catch(() => ({})), C = Number(A?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(C > 0 ? C : h.serverRevision);
            return;
          }
          if (!w.ok)
            throw new Error(`HTTP ${w.status}`);
          const k = await w.json().catch(() => ({})), D = String(k?.id || k?.draft_id || h.serverDraftId || "").trim(), _ = Number(k?.revision || 0);
          if (D && Number.isFinite(_) && _ > 0) {
            this.stateManager.markSynced(D, _), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(D, _);
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
      const p = await this.syncService.sync();
      this.isSyncing = !1, p.success ? (this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(p.result.id, p.result.revision)) : p.conflict ? (this.statusUpdater("conflict"), this.showConflictDialog(p.currentRevision)) : (this.statusUpdater("error"), this.scheduleRetry());
    }
    scheduleRetry() {
      if (this.retryCount >= we.length) {
        console.error("Max sync retries reached");
        return;
      }
      const o = we[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, o);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(o) {
      const p = document.getElementById("conflict-dialog-modal"), h = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = Xe(h.updatedAt), document.getElementById("conflict-server-revision").textContent = o, document.getElementById("conflict-server-time").textContent = "newer version", p?.classList.remove("hidden");
    }
  }
  function Xe(c) {
    if (!c) return "unknown";
    const o = new Date(c), h = /* @__PURE__ */ new Date() - o, b = Math.floor(h / 6e4), w = Math.floor(h / 36e5), k = Math.floor(h / 864e5);
    return b < 1 ? "just now" : b < 60 ? `${b} minute${b !== 1 ? "s" : ""} ago` : w < 24 ? `${w} hour${w !== 1 ? "s" : ""} ago` : k < 7 ? `${k} day${k !== 1 ? "s" : ""} ago` : o.toLocaleDateString();
  }
  function ot(c) {
    const o = document.getElementById("sync-status-indicator"), p = document.getElementById("sync-status-icon"), h = document.getElementById("sync-status-text"), b = document.getElementById("sync-retry-btn");
    if (!(!o || !p || !h))
      switch (o.classList.remove("hidden"), c) {
        case "saved":
          p.className = "w-2 h-2 rounded-full bg-green-500", h.textContent = "Saved", h.className = "text-gray-600", b?.classList.add("hidden");
          break;
        case "saving":
          p.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", h.textContent = "Saving...", h.className = "text-gray-600", b?.classList.add("hidden");
          break;
        case "pending":
          p.className = "w-2 h-2 rounded-full bg-gray-400", h.textContent = "Unsaved changes", h.className = "text-gray-500", b?.classList.add("hidden");
          break;
        case "error":
          p.className = "w-2 h-2 rounded-full bg-amber-500", h.textContent = "Not synced", h.className = "text-amber-600", b?.classList.remove("hidden");
          break;
        case "conflict":
          p.className = "w-2 h-2 rounded-full bg-red-500", h.textContent = "Conflict", h.className = "text-red-600", b?.classList.add("hidden");
          break;
        default:
          o.classList.add("hidden");
      }
  }
  const z = new Pe(), fe = new ft(z), Te = new je(z, fe, ot), He = fr({
    apiBasePath: l,
    basePath: t
  });
  if (S) {
    const o = z.getState()?.serverDraftId;
    z.clear(), Te.broadcastStateUpdate(), o && fe.delete(o).catch((p) => {
      console.warn("Failed to delete server draft after successful create:", p);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    Te.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const c = z.getState();
    if (c.serverDraftId)
      try {
        const o = await fe.load(c.serverDraftId);
        o.wizard_state && (z.state = { ...o.wizard_state, serverDraftId: o.id, serverRevision: o.revision }, z.saveToSession(), window.location.reload());
      } catch (o) {
        console.error("Failed to load server draft:", o);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const c = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    z.state.serverRevision = c, z.state.syncPending = !0, z.saveToSession(), Te.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function jt() {
    const c = document.getElementById("resume-dialog-modal"), o = z.getState(), p = String(o?.document?.title || "").trim() || String(o?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = o.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = p, document.getElementById("resume-draft-step").textContent = o.currentStep, document.getElementById("resume-draft-time").textContent = Xe(o.updatedAt), c?.classList.remove("hidden");
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), z.restoreFormState(), window._resumeToStep = z.getState().currentStep;
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), z.clear();
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", async () => {
    const c = z.getState();
    if (c.serverDraftId)
      try {
        await fe.delete(c.serverDraftId);
      } catch (o) {
        console.warn("Failed to delete server draft:", o);
      }
    z.clear(), document.getElementById("resume-dialog-modal")?.classList.add("hidden");
  });
  async function Mn() {
    if (a || !z.hasResumableState()) return;
    const c = z.getState(), o = String(c?.serverDraftId || "").trim();
    if (!o) {
      jt();
      return;
    }
    try {
      const p = await fe.load(o);
      p?.wizard_state && typeof p.wizard_state == "object" && (z.state = { ...p.wizard_state, serverDraftId: p.id, serverRevision: p.revision }, z.saveToSession()), jt();
    } catch (p) {
      if (Number(p?.status || 0) === 404) {
        z.clear(), Te.broadcastStateUpdate();
        return;
      }
      jt();
    }
  }
  Mn();
  function _t() {
    const c = z.collectFormState();
    z.updateState(c), Te.scheduleSync(), Te.broadcastStateUpdate();
  }
  const Se = document.getElementById("document_id"), ct = document.getElementById("selected-document"), lt = document.getElementById("document-picker"), Ee = document.getElementById("document-search"), Qe = document.getElementById("document-list"), zt = document.getElementById("change-document-btn"), Ne = document.getElementById("selected-document-title"), ze = document.getElementById("selected-document-info"), Oe = document.getElementById("document_page_count");
  let Ze = [];
  function et(c) {
    return String(c || "").trim().toLowerCase();
  }
  function yt(c) {
    return String(c || "").trim().toLowerCase();
  }
  function vt(c) {
    return et(c) === "unsupported";
  }
  function dt() {
    Se && (Se.value = ""), Ne && (Ne.textContent = ""), ze && (ze.textContent = ""), nt(0), z.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), He.setDocument(null, null, null);
  }
  function bt(c = "") {
    const o = "This document cannot be used because its PDF is incompatible with online signing.", p = yt(c);
    return p ? `${o} Reason: ${p}. Select another document or upload a remediated PDF.` : `${o} Select another document or upload a remediated PDF.`;
  }
  function $n(c) {
    const o = String(c || "").trim();
    if (o === "") return null;
    const p = Ze.find((w) => String(w.id || "").trim() === o);
    if (p) return p;
    const h = j.recentDocuments.find((w) => String(w.id || "").trim() === o);
    if (h) return h;
    const b = j.searchResults.find((w) => String(w.id || "").trim() === o);
    return b || null;
  }
  function tt() {
    const c = $n(Se?.value || "");
    if (!c) return !0;
    const o = et(c.compatibilityTier);
    return vt(o) ? (dt(), ae(bt(c.compatibilityReason || "")), ct && ct.classList.add("hidden"), lt && lt.classList.remove("hidden"), Ee?.focus(), !1) : !0;
  }
  function nt(c) {
    const o = ge(c, 0);
    Oe && (Oe.value = String(o));
  }
  function Ot() {
    const c = (Se?.value || "").trim();
    if (!c) return;
    const o = Ze.find((p) => String(p.id || "").trim() === c);
    o && (Ne.textContent.trim() || (Ne.textContent = o.title || "Untitled"), (!ze.textContent.trim() || ze.textContent.trim() === "pages") && (ze.textContent = `${o.pageCount || 0} pages`), nt(o.pageCount || 0), ct.classList.remove("hidden"), lt.classList.add("hidden"));
  }
  async function Bn() {
    try {
      const c = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), o = await fetch(`${n}/panels/esign_documents?${c.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!o.ok)
        throw await Ue(o, "Failed to load documents");
      const p = await o.json();
      Ze = (Array.isArray(p?.records) ? p.records : Array.isArray(p?.items) ? p.items : []).slice().sort((w, k) => {
        const D = Date.parse(String(
          w?.created_at ?? w?.createdAt ?? w?.updated_at ?? w?.updatedAt ?? ""
        )), _ = Date.parse(String(
          k?.created_at ?? k?.createdAt ?? k?.updated_at ?? k?.updatedAt ?? ""
        )), A = Number.isFinite(D) ? D : 0;
        return (Number.isFinite(_) ? _ : 0) - A;
      }).map((w) => ri(w)).filter((w) => w.id !== ""), dn(Ze), Ot();
    } catch (c) {
      const o = te(c?.message || "Failed to load documents", c?.code || "", c?.status || 0);
      Qe.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${le(o)}</div>`;
    }
  }
  function dn(c) {
    if (c.length === 0) {
      Qe.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${le(T)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    Qe.innerHTML = c.map((p, h) => {
      const b = le(String(p.id || "").trim()), w = le(String(p.title || "").trim()), k = String(ge(p.pageCount, 0)), D = et(p.compatibilityTier), _ = yt(p.compatibilityReason), A = le(D), C = le(_), U = vt(D) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${h === 0 ? "0" : "-1"}"
              data-document-id="${b}"
              data-document-title="${w}"
              data-document-pages="${k}"
              data-document-compatibility-tier="${A}"
              data-document-compatibility-reason="${C}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${w}</div>
          <div class="text-xs text-gray-500">${k} pages ${U}</div>
        </div>
      </button>
    `;
    }).join("");
    const o = Qe.querySelectorAll(".document-option");
    o.forEach((p, h) => {
      p.addEventListener("click", () => Gt(p)), p.addEventListener("keydown", (b) => {
        let w = h;
        if (b.key === "ArrowDown")
          b.preventDefault(), w = Math.min(h + 1, o.length - 1);
        else if (b.key === "ArrowUp")
          b.preventDefault(), w = Math.max(h - 1, 0);
        else if (b.key === "Enter" || b.key === " ") {
          b.preventDefault(), Gt(p);
          return;
        } else b.key === "Home" ? (b.preventDefault(), w = 0) : b.key === "End" && (b.preventDefault(), w = o.length - 1);
        w !== h && (o[w].focus(), o[w].setAttribute("tabindex", "0"), p.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Gt(c) {
    const o = c.getAttribute("data-document-id"), p = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), b = et(
      c.getAttribute("data-document-compatibility-tier")
    ), w = yt(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (vt(b)) {
      dt(), ae(bt(w)), Ee?.focus();
      return;
    }
    Se.value = o, Ne.textContent = p, ze.textContent = `${h} pages`, nt(h), ct.classList.remove("hidden"), lt.classList.add("hidden"), x(), wt(p);
    const k = ge(h, null);
    He.setDocument(o, p, k);
  }
  function wt(c) {
    const o = document.getElementById("title");
    if (!o || o.value.trim())
      return;
    const h = String(c || "").trim();
    h && (o.value = h, z.updateDetails({
      title: h,
      message: z.getState().details.message || ""
    }));
  }
  function le(c) {
    const o = document.createElement("div");
    return o.textContent = c, o.innerHTML;
  }
  zt && zt.addEventListener("click", () => {
    ct.classList.add("hidden"), lt.classList.remove("hidden"), Ee?.focus(), $t();
  });
  const Fn = 300, un = 5, Dt = 10, St = document.getElementById("document-typeahead"), Ge = document.getElementById("document-typeahead-dropdown"), xt = document.getElementById("document-recent-section"), Rn = document.getElementById("document-recent-list"), It = document.getElementById("document-search-section"), Hn = document.getElementById("document-search-list"), it = document.getElementById("document-empty-state"), Mt = document.getElementById("document-dropdown-loading"), Vt = document.getElementById("document-search-loading"), j = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Wt = 0, Me = null;
  function Nn(c, o) {
    let p = null;
    return (...h) => {
      p !== null && clearTimeout(p), p = setTimeout(() => {
        c(...h), p = null;
      }, o);
    };
  }
  async function Jt() {
    try {
      const c = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(un)
      });
      v && c.set("created_by_user_id", v);
      const o = await fetch(`${n}/panels/esign_documents?${c}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!o.ok) {
        console.warn("Failed to load recent documents:", o.status);
        return;
      }
      const p = await o.json(), h = Array.isArray(p?.records) ? p.records : Array.isArray(p?.items) ? p.items : [];
      j.recentDocuments = h.map((b) => ri(b)).filter((b) => b.id !== "").slice(0, un);
    } catch (c) {
      console.warn("Error loading recent documents:", c);
    }
  }
  async function Et(c) {
    const o = c.trim();
    if (!o) {
      Me && (Me.abort(), Me = null), j.isSearchMode = !1, j.searchResults = [], _e();
      return;
    }
    const p = ++Wt;
    Me && Me.abort(), Me = new AbortController(), j.isLoading = !0, j.isSearchMode = !0, _e();
    try {
      const h = new URLSearchParams({
        q: o,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Dt)
      }), b = await fetch(`${n}/panels/esign_documents?${h}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Me.signal
      });
      if (p !== Wt)
        return;
      if (!b.ok) {
        console.warn("Failed to search documents:", b.status), j.searchResults = [], j.isLoading = !1, _e();
        return;
      }
      const w = await b.json(), k = Array.isArray(w?.records) ? w.records : Array.isArray(w?.items) ? w.items : [];
      j.searchResults = k.map((D) => ri(D)).filter((D) => D.id !== "").slice(0, Dt);
    } catch (h) {
      if (h?.name === "AbortError")
        return;
      console.warn("Error searching documents:", h), j.searchResults = [];
    } finally {
      p === Wt && (j.isLoading = !1, _e());
    }
  }
  const Un = Nn(Et, Fn);
  function $t() {
    Ge && (j.isOpen = !0, j.selectedIndex = -1, Ge.classList.remove("hidden"), Ee?.setAttribute("aria-expanded", "true"), Qe?.classList.add("hidden"), _e());
  }
  function Lt() {
    Ge && (j.isOpen = !1, j.selectedIndex = -1, Ge.classList.add("hidden"), Ee?.setAttribute("aria-expanded", "false"), Qe?.classList.remove("hidden"));
  }
  function _e() {
    if (Ge) {
      if (j.isLoading) {
        Mt?.classList.remove("hidden"), xt?.classList.add("hidden"), It?.classList.add("hidden"), it?.classList.add("hidden"), Vt?.classList.remove("hidden");
        return;
      }
      Mt?.classList.add("hidden"), Vt?.classList.add("hidden"), j.isSearchMode ? (xt?.classList.add("hidden"), j.searchResults.length > 0 ? (It?.classList.remove("hidden"), it?.classList.add("hidden"), Bt(Hn, j.searchResults, "search")) : (It?.classList.add("hidden"), it?.classList.remove("hidden"))) : (It?.classList.add("hidden"), j.recentDocuments.length > 0 ? (xt?.classList.remove("hidden"), it?.classList.add("hidden"), Bt(Rn, j.recentDocuments, "recent")) : (xt?.classList.add("hidden"), it?.classList.remove("hidden"), it && (it.textContent = "No recent documents")));
    }
  }
  function Bt(c, o, p) {
    c && (c.innerHTML = o.map((h, b) => {
      const w = b, k = j.selectedIndex === w, D = le(String(h.id || "").trim()), _ = le(String(h.title || "").trim()), A = String(ge(h.pageCount, 0)), C = et(h.compatibilityTier), N = yt(h.compatibilityReason), U = le(C), V = le(N), J = vt(C) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${k ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${k}"
          tabindex="-1"
          data-document-id="${D}"
          data-document-title="${_}"
          data-document-pages="${A}"
          data-document-compatibility-tier="${U}"
          data-document-compatibility-reason="${V}"
          data-typeahead-index="${w}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${_}</div>
            <div class="text-xs text-gray-500">${A} pages ${J}</div>
          </div>
        </button>
      `;
    }).join(""), c.querySelectorAll(".typeahead-option").forEach((h) => {
      h.addEventListener("click", () => $e(h));
    }));
  }
  function $e(c) {
    const o = c.getAttribute("data-document-id"), p = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), b = et(
      c.getAttribute("data-document-compatibility-tier")
    ), w = yt(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (!o) return;
    if (vt(b)) {
      dt(), ae(bt(w)), Ee?.focus();
      return;
    }
    Se.value = o, Ne.textContent = p || "", ze.textContent = `${h} pages`, nt(h), ct.classList.remove("hidden"), lt.classList.add("hidden"), Lt(), x(), Ee && (Ee.value = ""), j.query = "", j.isSearchMode = !1, j.searchResults = [], wt(p);
    const k = ge(h, 0);
    z.updateDocument({
      id: o,
      title: p,
      pageCount: k
    }), He.setDocument(o, p, k);
  }
  function qn(c) {
    if (!j.isOpen) {
      (c.key === "ArrowDown" || c.key === "Enter") && (c.preventDefault(), $t());
      return;
    }
    const o = j.isSearchMode ? j.searchResults : j.recentDocuments, p = o.length - 1;
    switch (c.key) {
      case "ArrowDown":
        c.preventDefault(), j.selectedIndex = Math.min(j.selectedIndex + 1, p), _e(), Be();
        break;
      case "ArrowUp":
        c.preventDefault(), j.selectedIndex = Math.max(j.selectedIndex - 1, 0), _e(), Be();
        break;
      case "Enter":
        if (c.preventDefault(), j.selectedIndex >= 0 && j.selectedIndex <= p) {
          const h = o[j.selectedIndex];
          if (h) {
            const b = document.createElement("button");
            b.setAttribute("data-document-id", h.id), b.setAttribute("data-document-title", h.title), b.setAttribute("data-document-pages", String(h.pageCount)), b.setAttribute("data-document-compatibility-tier", String(h.compatibilityTier || "")), b.setAttribute("data-document-compatibility-reason", String(h.compatibilityReason || "")), $e(b);
          }
        }
        break;
      case "Escape":
        c.preventDefault(), Lt();
        break;
      case "Tab":
        Lt();
        break;
      case "Home":
        c.preventDefault(), j.selectedIndex = 0, _e(), Be();
        break;
      case "End":
        c.preventDefault(), j.selectedIndex = p, _e(), Be();
        break;
    }
  }
  function Be() {
    if (!Ge) return;
    const c = Ge.querySelector(`[data-typeahead-index="${j.selectedIndex}"]`);
    c && c.scrollIntoView({ block: "nearest" });
  }
  Ee && (Ee.addEventListener("input", (c) => {
    const p = c.target.value;
    j.query = p, j.isOpen || $t(), p.trim() ? (j.isLoading = !0, _e(), Un(p)) : (j.isSearchMode = !1, j.searchResults = [], _e());
    const h = Ze.filter(
      (b) => String(b.title || "").toLowerCase().includes(p.toLowerCase())
    );
    dn(h);
  }), Ee.addEventListener("focus", () => {
    $t();
  }), Ee.addEventListener("keydown", qn)), document.addEventListener("click", (c) => {
    const o = c.target;
    St && !St.contains(o) && Lt();
  }), Bn(), Jt();
  const Le = document.getElementById("participants-container"), jn = document.getElementById("participant-template"), pn = document.getElementById("add-participant-btn");
  let zn = 0, Ft = 0;
  function gn() {
    return `temp_${Date.now()}_${zn++}`;
  }
  function Rt(c = {}) {
    const o = jn.content.cloneNode(!0), p = o.querySelector(".participant-entry"), h = c.id || gn();
    p.setAttribute("data-participant-id", h);
    const b = p.querySelector(".participant-id-input"), w = p.querySelector('input[name="participants[].name"]'), k = p.querySelector('input[name="participants[].email"]'), D = p.querySelector('select[name="participants[].role"]'), _ = p.querySelector('input[name="participants[].signing_stage"]'), A = p.querySelector(".signing-stage-wrapper"), C = Ft++;
    b.name = `participants[${C}].id`, b.value = h, w.name = `participants[${C}].name`, k.name = `participants[${C}].email`, D.name = `participants[${C}].role`, _ && (_.name = `participants[${C}].signing_stage`), c.name && (w.value = c.name), c.email && (k.value = c.email), c.role && (D.value = c.role), _ && c.signing_stage && (_.value = c.signing_stage);
    const N = () => {
      if (!A || !_) return;
      const U = D.value === "signer";
      A.classList.toggle("hidden", !U), U ? _.value || (_.value = "1") : _.value = "";
    };
    N(), p.querySelector(".remove-participant-btn").addEventListener("click", () => {
      p.remove(), rt();
    }), D.addEventListener("change", () => {
      N(), rt();
    }), Le.appendChild(o);
  }
  pn.addEventListener("click", () => Rt()), R.length > 0 ? R.forEach((c) => {
    Rt({
      id: String(c.id || "").trim(),
      name: String(c.name || "").trim(),
      email: String(c.email || "").trim(),
      role: String(c.role || "signer").trim() || "signer",
      signing_stage: Number(c.signing_stage || c.signingStage || 1) || 1
    });
  }) : Rt();
  const Ce = document.getElementById("field-definitions-container"), mn = document.getElementById("field-definition-template"), Ve = document.getElementById("add-field-btn"), hn = document.getElementById("add-field-btn-container"), On = document.getElementById("add-field-definition-empty-btn"), Yt = document.getElementById("field-definitions-empty-state"), xe = document.getElementById("field-rules-container"), Kt = document.getElementById("field-rule-template"), Xt = document.getElementById("add-field-rule-btn"), fn = document.getElementById("field-rules-empty-state"), Qt = document.getElementById("field-rules-preview"), Zt = document.getElementById("field_rules_json"), Ct = document.getElementById("field_placements_json");
  let Gn = 0, yn = 0, en = 0;
  function st() {
    return `temp_field_${Date.now()}_${Gn++}`;
  }
  function ye() {
    return `rule_${Date.now()}_${en}`;
  }
  function Fe() {
    const c = Le.querySelectorAll(".participant-entry"), o = [];
    return c.forEach((p) => {
      const h = p.getAttribute("data-participant-id"), b = p.querySelector('select[name*=".role"]'), w = p.querySelector('input[name*=".name"]'), k = p.querySelector('input[name*=".email"]');
      b.value === "signer" && o.push({
        id: h,
        name: w.value || k.value || "Signer",
        email: k.value
      });
    }), o;
  }
  function tn(c, o) {
    const p = String(c || "").trim();
    return p && o.some((h) => h.id === p) ? p : o.length === 1 ? o[0].id : "";
  }
  function kt(c, o, p = "") {
    if (!c) return;
    const h = tn(p, o);
    c.innerHTML = '<option value="">Select signer...</option>', o.forEach((b) => {
      const w = document.createElement("option");
      w.value = b.id, w.textContent = b.name, c.appendChild(w);
    }), c.value = h;
  }
  function vn(c = Fe()) {
    const o = Ce.querySelectorAll(".field-participant-select"), p = xe ? xe.querySelectorAll(".field-rule-participant-select") : [];
    o.forEach((h) => {
      kt(h, c, h.value);
    }), p.forEach((h) => {
      kt(h, c, h.value);
    });
  }
  function rt() {
    const c = Fe();
    vn(c), x();
  }
  function r() {
    const c = ge(Oe?.value || "0", 0);
    if (c > 0) return c;
    const o = String(ze?.textContent || "").match(/(\d+)\s+pages?/i);
    if (o) {
      const p = ge(o[1], 0);
      if (p > 0) return p;
    }
    return 1;
  }
  function u() {
    if (!xe || !fn) return;
    const c = xe.querySelectorAll(".field-rule-entry");
    fn.classList.toggle("hidden", c.length > 0);
  }
  function g() {
    if (!xe) return [];
    const c = r(), o = xe.querySelectorAll(".field-rule-entry"), p = [];
    return o.forEach((h) => {
      const b = Cn({
        id: h.getAttribute("data-field-rule-id") || "",
        type: h.querySelector(".field-rule-type-select")?.value || "",
        participantId: h.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: h.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: h.querySelector(".field-rule-to-page-input")?.value || "",
        page: h.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!h.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: ln(h.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (h.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, c);
      b.type && p.push(b);
    }), p;
  }
  function f() {
    return g().map((c) => Ir(c));
  }
  function y(c, o) {
    return Lr(c, o);
  }
  function x() {
    if (!Qt) return;
    const c = g(), o = r(), p = y(c, o), h = Fe(), b = new Map(h.map((_) => [String(_.id), _.name]));
    if (Zt && (Zt.value = JSON.stringify(f())), !p.length) {
      Qt.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const w = p.reduce((_, A) => {
      const C = A.type;
      return _[C] = (_[C] || 0) + 1, _;
    }, {}), k = p.slice(0, 8).map((_) => {
      const A = b.get(String(_.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${_.type === "initials" ? "Initials" : "Signature"} on page ${_.page}</span><span class="text-gray-500">${le(String(A))}</span></li>`;
    }).join(""), D = p.length - 8;
    Qt.innerHTML = `
      <p class="text-gray-700">${p.length} generated field${p.length !== 1 ? "s" : ""} (${w.initials || 0} initials, ${w.signature || 0} signatures)</p>
      <ul class="space-y-1">${k}</ul>
      ${D > 0 ? `<p class="text-gray-500">+${D} more</p>` : ""}
    `;
  }
  function I() {
    const c = Fe(), o = new Map(c.map((A) => [String(A.id), A.name || A.email || "Signer"])), p = [];
    Ce.querySelectorAll(".field-definition-entry").forEach((A) => {
      const C = String(A.getAttribute("data-field-definition-id") || "").trim(), N = A.querySelector(".field-type-select"), U = A.querySelector(".field-participant-select"), V = A.querySelector('input[name*=".page"]'), q = String(N?.value || "text").trim() || "text", J = String(U?.value || "").trim(), Z = parseInt(String(V?.value || "1"), 10) || 1;
      p.push({
        definitionId: C,
        fieldType: q,
        participantId: J,
        participantName: o.get(J) || "Unassigned",
        page: Z
      });
    });
    const b = y(g(), r()), w = /* @__PURE__ */ new Map();
    b.forEach((A) => {
      const C = String(A.ruleId || "").trim(), N = String(A.id || "").trim();
      if (C && N) {
        const U = w.get(C) || [];
        U.push(N), w.set(C, U);
      }
    });
    let k = L.linkGroupState;
    w.forEach((A, C) => {
      if (A.length > 1 && !L.linkGroupState.groups.get(`rule_${C}`)) {
        const U = br(A, `Rule ${C}`);
        U.id = `rule_${C}`, k = Fi(k, U);
      }
    }), L.linkGroupState = k, b.forEach((A) => {
      const C = String(A.id || "").trim();
      if (!C) return;
      const N = String(A.participantId || "").trim(), U = parseInt(String(A.page || "1"), 10) || 1, V = String(A.ruleId || "").trim();
      p.push({
        definitionId: C,
        fieldType: String(A.type || "text").trim() || "text",
        participantId: N,
        participantName: o.get(N) || "Unassigned",
        page: U,
        linkGroupId: V ? `rule_${V}` : void 0
      });
    });
    const D = /* @__PURE__ */ new Set(), _ = p.filter((A) => {
      const C = String(A.definitionId || "").trim();
      return !C || D.has(C) ? !1 : (D.add(C), !0);
    });
    return _.sort((A, C) => A.page !== C.page ? A.page - C.page : A.definitionId.localeCompare(C.definitionId)), _;
  }
  function $(c) {
    const o = c.querySelector(".field-rule-type-select"), p = c.querySelector(".field-rule-range-start-wrap"), h = c.querySelector(".field-rule-range-end-wrap"), b = c.querySelector(".field-rule-page-wrap"), w = c.querySelector(".field-rule-exclude-last-wrap"), k = c.querySelector(".field-rule-exclude-pages-wrap"), D = c.querySelector(".field-rule-summary"), _ = c.querySelector(".field-rule-from-page-input"), A = c.querySelector(".field-rule-to-page-input"), C = c.querySelector(".field-rule-page-input"), N = c.querySelector(".field-rule-exclude-last-input"), U = c.querySelector(".field-rule-exclude-pages-input"), V = r(), q = Cn({
      type: o?.value || "",
      fromPage: _?.value || "",
      toPage: A?.value || "",
      page: C?.value || "",
      excludeLastPage: !!N?.checked,
      excludePages: ln(U?.value || ""),
      required: !0
    }, V), J = q.fromPage > 0 ? q.fromPage : 1, Z = q.toPage > 0 ? q.toPage : V, oe = q.page > 0 ? q.page : q.toPage > 0 ? q.toPage : V, pe = q.excludeLastPage, be = q.excludePages.join(","), ne = o?.value === "initials_each_page";
    if (p.classList.toggle("hidden", !ne), h.classList.toggle("hidden", !ne), w.classList.toggle("hidden", !ne), k.classList.toggle("hidden", !ne), b.classList.toggle("hidden", ne), _ && (_.value = String(J)), A && (A.value = String(Z)), C && (C.value = String(oe)), U && (U.value = be), N && (N.checked = pe), ne) {
      const ce = Cr(
        J,
        Z,
        V,
        pe,
        q.excludePages
      ), Je = kr(ce);
      ce.isEmpty ? D.textContent = `Warning: No initials fields will be generated ${Je}.` : D.textContent = `Generates initials fields on ${Je}.`;
    } else
      D.textContent = `Generates one signature field on page ${oe}.`;
  }
  function H(c = {}) {
    if (!Kt || !xe) return;
    const o = Kt.content.cloneNode(!0), p = o.querySelector(".field-rule-entry"), h = c.id || ye(), b = en++, w = r();
    p.setAttribute("data-field-rule-id", h);
    const k = p.querySelector(".field-rule-id-input"), D = p.querySelector(".field-rule-type-select"), _ = p.querySelector(".field-rule-participant-select"), A = p.querySelector(".field-rule-from-page-input"), C = p.querySelector(".field-rule-to-page-input"), N = p.querySelector(".field-rule-page-input"), U = p.querySelector(".field-rule-required-select"), V = p.querySelector(".field-rule-exclude-last-input"), q = p.querySelector(".field-rule-exclude-pages-input"), J = p.querySelector(".remove-field-rule-btn");
    k.name = `field_rules[${b}].id`, k.value = h, D.name = `field_rules[${b}].type`, _.name = `field_rules[${b}].participant_id`, A.name = `field_rules[${b}].from_page`, C.name = `field_rules[${b}].to_page`, N.name = `field_rules[${b}].page`, U.name = `field_rules[${b}].required`, V.name = `field_rules[${b}].exclude_last_page`, q.name = `field_rules[${b}].exclude_pages`;
    const Z = Cn(c, w);
    D.value = Z.type || "initials_each_page", kt(_, Fe(), Z.participantId), A.value = String(Z.fromPage > 0 ? Z.fromPage : 1), C.value = String(Z.toPage > 0 ? Z.toPage : w), N.value = String(Z.page > 0 ? Z.page : w), U.value = Z.required ? "1" : "0", V.checked = Z.excludeLastPage, q.value = Z.excludePages.join(",");
    const oe = () => {
      $(p), x(), We();
    }, pe = () => {
      const ne = r();
      if (A) {
        const ce = parseInt(A.value, 10);
        Number.isFinite(ce) && (A.value = String(on(ce, ne, 1)));
      }
      if (C) {
        const ce = parseInt(C.value, 10);
        Number.isFinite(ce) && (C.value = String(on(ce, ne, 1)));
      }
      if (N) {
        const ce = parseInt(N.value, 10);
        Number.isFinite(ce) && (N.value = String(on(ce, ne, 1)));
      }
    }, be = () => {
      pe(), oe();
    };
    D.addEventListener("change", oe), _.addEventListener("change", oe), A.addEventListener("input", be), A.addEventListener("change", be), C.addEventListener("input", be), C.addEventListener("change", be), N.addEventListener("input", be), N.addEventListener("change", be), U.addEventListener("change", oe), V.addEventListener("change", () => {
      const ne = r();
      if (V.checked) {
        const ce = Math.max(1, ne - 1);
        C.value = String(ce);
      } else
        C.value = String(ne);
      oe();
    }), q.addEventListener("input", oe), J.addEventListener("click", () => {
      p.remove(), u(), x(), We();
    }), xe.appendChild(o), $(xe.lastElementChild), u(), x();
  }
  function K(c = {}) {
    const o = mn.content.cloneNode(!0), p = o.querySelector(".field-definition-entry"), h = c.id || st();
    p.setAttribute("data-field-definition-id", h);
    const b = p.querySelector(".field-definition-id-input"), w = p.querySelector('select[name="field_definitions[].type"]'), k = p.querySelector('select[name="field_definitions[].participant_id"]'), D = p.querySelector('input[name="field_definitions[].page"]'), _ = p.querySelector('input[name="field_definitions[].required"]'), A = p.querySelector(".field-date-signed-info"), C = yn++;
    b.name = `field_instances[${C}].id`, b.value = h, w.name = `field_instances[${C}].type`, k.name = `field_instances[${C}].participant_id`, D.name = `field_instances[${C}].page`, _.name = `field_instances[${C}].required`, c.type && (w.value = c.type), c.page && (D.value = String(on(c.page, r(), 1))), c.required !== void 0 && (_.checked = c.required);
    const N = String(c.participant_id || c.participantId || "").trim();
    kt(k, Fe(), N), w.addEventListener("change", () => {
      w.value === "date_signed" ? A.classList.remove("hidden") : A.classList.add("hidden");
    }), w.value === "date_signed" && A.classList.remove("hidden"), p.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      p.remove(), G();
    });
    const U = p.querySelector('input[name*=".page"]'), V = () => {
      U && (U.value = String(on(U.value, r(), 1)));
    };
    V(), U?.addEventListener("input", V), U?.addEventListener("change", V), Ce.appendChild(o), G();
  }
  function G() {
    Ce.querySelectorAll(".field-definition-entry").length === 0 ? (Yt.classList.remove("hidden"), hn?.classList.add("hidden")) : (Yt.classList.add("hidden"), hn?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    rt();
  }).observe(Le, { childList: !0, subtree: !0 }), Le.addEventListener("change", (c) => {
    (c.target.matches('select[name*=".role"]') || c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && rt();
  }), Le.addEventListener("input", (c) => {
    (c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && rt();
  }), Ve.addEventListener("click", () => K()), On.addEventListener("click", () => K()), Xt?.addEventListener("click", () => H({ to_page: r() })), window._initialFieldPlacementsData = [], F.forEach((c) => {
    const o = String(c.id || "").trim();
    if (!o) return;
    const p = String(c.type || "signature").trim() || "signature", h = String(c.participant_id || c.participantId || "").trim(), b = Number(c.page || 1) || 1, w = !!c.required;
    K({
      id: o,
      type: p,
      participant_id: h,
      page: b,
      required: w
    }), window._initialFieldPlacementsData.push(kn({
      id: o,
      definitionId: o,
      type: p,
      participantId: h,
      participantName: String(c.participant_name || c.participantName || "").trim(),
      page: b,
      x: Number(c.x || c.pos_x || 0) || 0,
      y: Number(c.y || c.pos_y || 0) || 0,
      width: Number(c.width || 150) || 150,
      height: Number(c.height || 32) || 32,
      placementSource: String(c.placement_source || c.placementSource || ke.MANUAL).trim() || ke.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), G(), rt(), u(), x();
  const he = document.getElementById("agreement-form"), ue = document.getElementById("submit-btn"), W = document.getElementById("form-announcements");
  function te(c, o = "", p = 0) {
    const h = String(o || "").trim().toUpperCase(), b = String(c || "").trim().toLowerCase();
    return h === "SCOPE_DENIED" || b.includes("scope denied") ? "You don't have access to this organization's resources." : h === "TRANSPORT_SECURITY" || h === "TRANSPORT_SECURITY_REQUIRED" || b.includes("tls transport required") || Number(p) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : h === "PDF_UNSUPPORTED" || b === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(c || "").trim() !== "" ? String(c).trim() : "Something went wrong. Please try again.";
  }
  async function Ue(c, o) {
    const p = Number(c?.status || 0);
    let h = "", b = "";
    try {
      const w = await c.json();
      h = String(w?.error?.code || w?.code || "").trim(), b = String(w?.error?.message || w?.message || "").trim();
    } catch {
      b = "";
    }
    return b === "" && (b = o || `Request failed (${p || "unknown"})`), {
      status: p,
      code: h,
      message: te(b, h, p)
    };
  }
  function ae(c, o = "", p = 0) {
    const h = te(c, o, p);
    W && (W.textContent = h), window.toastManager ? window.toastManager.error(h) : alert(h);
  }
  function Vn() {
    const c = [];
    Le.querySelectorAll(".participant-entry").forEach((b) => {
      const w = String(b.getAttribute("data-participant-id") || "").trim(), k = String(b.querySelector('input[name*=".name"]')?.value || "").trim(), D = String(b.querySelector('input[name*=".email"]')?.value || "").trim(), _ = String(b.querySelector('select[name*=".role"]')?.value || "signer").trim(), A = String(b.querySelector(".signing-stage-input")?.value || "").trim(), C = Number(A || "1") || 1;
      c.push({
        id: w,
        name: k,
        email: D,
        role: _,
        signing_stage: _ === "signer" ? C : 0
      });
    });
    const o = [];
    Ce.querySelectorAll(".field-definition-entry").forEach((b) => {
      const w = String(b.getAttribute("data-field-definition-id") || "").trim(), k = String(b.querySelector(".field-type-select")?.value || "signature").trim(), D = String(b.querySelector(".field-participant-select")?.value || "").trim(), _ = Number(b.querySelector('input[name*=".page"]')?.value || "1") || 1, A = !!b.querySelector('input[name*=".required"]')?.checked;
      w && o.push({
        id: w,
        type: k,
        participant_id: D,
        page: _,
        required: A
      });
    });
    const p = [];
    L && Array.isArray(L.fieldInstances) && L.fieldInstances.forEach((b, w) => {
      p.push(qi(b, w));
    });
    const h = JSON.stringify(p);
    return Ct && (Ct.value = h), {
      document_id: String(Se?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: c,
      field_instances: o,
      field_placements: p,
      field_placements_json: h,
      field_rules: f(),
      field_rules_json: String(Zt?.value || "[]"),
      send_for_signature: de === mt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(Oe?.value || "0") || 0
    };
  }
  function nn() {
    const c = Fe(), o = /* @__PURE__ */ new Map();
    return c.forEach((b) => {
      o.set(b.id, !1);
    }), Ce.querySelectorAll(".field-definition-entry").forEach((b) => {
      const w = b.querySelector(".field-type-select"), k = b.querySelector(".field-participant-select"), D = b.querySelector('input[name*=".required"]');
      w?.value === "signature" && k?.value && D?.checked && o.set(k.value, !0);
    }), y(g(), r()).forEach((b) => {
      b.type === "signature" && b.participantId && b.required && o.set(b.participantId, !0);
    }), c.filter((b) => !o.get(b.id));
  }
  function bn(c) {
    if (!Array.isArray(c) || c.length === 0)
      return "Each signer requires at least one required signature field.";
    const o = c.map((p) => p?.name?.trim()).filter((p) => !!p);
    return o.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${o.join(", ")}`;
  }
  he.addEventListener("submit", function(c) {
    if (x(), !Se.value) {
      c.preventDefault(), ae("Please select a document"), Ee.focus();
      return;
    }
    if (!tt()) {
      c.preventDefault();
      return;
    }
    const o = Le.querySelectorAll(".participant-entry");
    if (o.length === 0) {
      c.preventDefault(), ae("Please add at least one participant"), pn.focus();
      return;
    }
    let p = !1;
    if (o.forEach((C) => {
      C.querySelector('select[name*=".role"]').value === "signer" && (p = !0);
    }), !p) {
      c.preventDefault(), ae("At least one signer is required");
      const C = o[0]?.querySelector('select[name*=".role"]');
      C && C.focus();
      return;
    }
    const h = Ce.querySelectorAll(".field-definition-entry"), b = nn();
    if (b.length > 0) {
      c.preventDefault(), ae(bn(b)), sn(Ae.FIELDS), Ve.focus();
      return;
    }
    let w = !1;
    if (h.forEach((C) => {
      C.querySelector(".field-participant-select").value || (w = !0);
    }), w) {
      c.preventDefault(), ae("Please assign all fields to a signer");
      const C = Ce.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      C && C.focus();
      return;
    }
    if (g().some((C) => !C.participantId)) {
      c.preventDefault(), ae("Please assign all automation rules to a signer"), Array.from(xe?.querySelectorAll(".field-rule-participant-select") || []).find((N) => !N.value)?.focus();
      return;
    }
    const _ = !!he.querySelector('input[name="save_as_draft"]'), A = de === mt && !_;
    if (A) {
      let C = he.querySelector('input[name="send_for_signature"]');
      C || (C = document.createElement("input"), C.type = "hidden", C.name = "send_for_signature", he.appendChild(C)), C.value = "1";
    } else
      he.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      c.preventDefault(), ue.disabled = !0, ue.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${A ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          Vn(), z.updateState(z.collectFormState()), await Te.forceSync();
          const C = z.getState();
          if (C?.syncPending)
            throw new Error("Unable to sync latest draft changes");
          const N = String(C?.serverDraftId || "").trim();
          if (!N)
            throw new Error("Draft session not available. Please try again.");
          const U = String(e.routes?.index || "").trim();
          if (!A) {
            if (U) {
              window.location.href = U;
              return;
            }
            window.location.reload();
            return;
          }
          const V = await fetch(
            B(`${d}/${encodeURIComponent(N)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: O(),
              body: JSON.stringify({
                expected_revision: Number(C?.serverRevision || 0),
                created_by_user_id: v
              })
            }
          );
          if (!V.ok)
            throw await Ue(V, "Failed to send agreement");
          const q = await V.json(), J = String(q?.agreement_id || q?.id || q?.data?.id || "").trim();
          if (z.clear(), Te.broadcastStateUpdate(), J && U) {
            window.location.href = `${U}/${encodeURIComponent(J)}`;
            return;
          }
          if (U) {
            window.location.href = U;
            return;
          }
          window.location.reload();
        } catch (C) {
          const N = String(C?.message || "Failed to process agreement").trim(), U = String(C?.code || "").trim(), V = Number(C?.status || 0);
          ae(N, U, V), ue.disabled = !1, ue.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }
    ue.disabled = !0, ue.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${A ? "Sending..." : "Saving..."}
    `;
  });
  let de = 1;
  const wn = document.querySelectorAll(".wizard-step-btn"), Wn = document.querySelectorAll(".wizard-step"), Sn = document.querySelectorAll(".wizard-connector"), bi = document.getElementById("wizard-prev-btn"), Jn = document.getElementById("wizard-next-btn"), wi = document.getElementById("wizard-save-btn");
  function Yn() {
    if (wn.forEach((c, o) => {
      const p = o + 1, h = c.querySelector(".wizard-step-number");
      p < de ? (c.classList.remove("text-gray-500", "text-blue-600"), c.classList.add("text-green-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), h.classList.add("bg-green-600", "text-white"), c.removeAttribute("aria-current")) : p === de ? (c.classList.remove("text-gray-500", "text-green-600"), c.classList.add("text-blue-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), h.classList.add("bg-blue-600", "text-white"), c.setAttribute("aria-current", "step")) : (c.classList.remove("text-blue-600", "text-green-600"), c.classList.add("text-gray-500"), h.classList.remove("bg-blue-600", "text-white", "bg-green-600"), h.classList.add("bg-gray-300", "text-gray-600"), c.removeAttribute("aria-current"));
    }), Sn.forEach((c, o) => {
      o < de - 1 ? (c.classList.remove("bg-gray-300"), c.classList.add("bg-green-600")) : (c.classList.remove("bg-green-600"), c.classList.add("bg-gray-300"));
    }), Wn.forEach((c) => {
      parseInt(c.dataset.step, 10) === de ? c.classList.remove("hidden") : c.classList.add("hidden");
    }), bi.classList.toggle("hidden", de === 1), Jn.classList.toggle("hidden", de === mt), wi.classList.toggle("hidden", de !== mt), ue.classList.toggle("hidden", de !== mt), de < mt) {
      const c = ar[de] || "Next";
      Jn.innerHTML = `
        ${c}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    de === Ae.PLACEMENT ? us() : de === Ae.REVIEW && $s(), He.updateVisibility(de);
  }
  function ds(c) {
    switch (c) {
      case 1:
        return Se.value ? !!tt() : (ae("Please select a document"), !1);
      case 2:
        const o = document.getElementById("title");
        return o.value.trim() ? !0 : (ae("Please enter an agreement title"), o.focus(), !1);
      case 3:
        const p = Le.querySelectorAll(".participant-entry");
        if (p.length === 0)
          return ae("Please add at least one participant"), !1;
        let h = !1;
        return p.forEach((_) => {
          _.querySelector('select[name*=".role"]').value === "signer" && (h = !0);
        }), h ? !0 : (ae("At least one signer is required"), !1);
      case 4:
        const b = Ce.querySelectorAll(".field-definition-entry");
        for (const _ of b) {
          const A = _.querySelector(".field-participant-select");
          if (!A.value)
            return ae("Please assign all fields to a signer"), A.focus(), !1;
        }
        if (g().find((_) => !_.participantId))
          return ae("Please assign all automation rules to a signer"), xe?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const D = nn();
        return D.length > 0 ? (ae(bn(D)), Ve.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function sn(c) {
    if (!(c < Ae.DOCUMENT || c > mt)) {
      if (c > de) {
        for (let o = de; o < c; o++)
          if (!ds(o)) return;
      }
      de = c, Yn(), z.updateStep(c), _t(), Te.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  wn.forEach((c) => {
    c.addEventListener("click", () => {
      const o = parseInt(c.dataset.step, 10);
      sn(o);
    });
  }), bi.addEventListener("click", () => sn(de - 1)), Jn.addEventListener("click", () => sn(de + 1)), wi.addEventListener("click", () => {
    const c = document.createElement("input");
    c.type = "hidden", c.name = "save_as_draft", c.value = "1", he.appendChild(c), he.submit();
  });
  let L = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((c, o) => kn(c, o)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: vr()
  };
  const ut = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, xn = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function us() {
    const c = document.getElementById("placement-loading"), o = document.getElementById("placement-no-document"), p = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const h = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const b = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const w = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !Se.value) {
      c.classList.add("hidden"), o.classList.remove("hidden");
      return;
    }
    c.classList.remove("hidden"), o.classList.add("hidden");
    const k = I(), D = new Set(
      k.map((J) => String(J.definitionId || "").trim()).filter((J) => J)
    );
    L.fieldInstances = L.fieldInstances.filter(
      (J) => D.has(String(J.definitionId || "").trim())
    ), p.innerHTML = "";
    const _ = L.linkGroupState.groups.size > 0, A = document.getElementById("link-batch-actions");
    A && A.classList.toggle("hidden", !_);
    const C = k.map((J) => {
      const Z = String(J.definitionId || "").trim(), oe = L.linkGroupState.definitionToGroup.get(Z) || "", pe = L.linkGroupState.unlinkedDefinitions.has(Z);
      return { ...J, definitionId: Z, linkGroupId: oe, isUnlinked: pe };
    });
    C.forEach((J, Z) => {
      const oe = J.definitionId, pe = String(J.fieldType || "text").trim() || "text", be = String(J.participantId || "").trim(), ne = String(J.participantName || "Unassigned").trim() || "Unassigned", ce = parseInt(String(J.page || "1"), 10) || 1, Je = J.linkGroupId, Zn = J.isUnlinked;
      if (!oe) return;
      L.fieldInstances.forEach((Re) => {
        Re.definitionId === oe && (Re.type = pe, Re.participantId = be, Re.participantName = ne);
      });
      const ei = ut[pe] || ut.text, X = L.fieldInstances.some((Re) => Re.definitionId === oe), ie = document.createElement("div");
      ie.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${X ? "opacity-50" : ""}`, ie.draggable = !X, ie.dataset.definitionId = oe, ie.dataset.fieldType = pe, ie.dataset.participantId = be, ie.dataset.participantName = ne, ie.dataset.page = String(ce), Je && (ie.dataset.linkGroupId = Je);
      const Ht = document.createElement("span");
      Ht.className = `w-3 h-3 rounded ${ei.bg}`;
      const gt = document.createElement("div");
      gt.className = "flex-1 text-xs";
      const Nt = document.createElement("div");
      Nt.className = "font-medium capitalize", Nt.textContent = pe.replace(/_/g, " ");
      const Pt = document.createElement("div");
      Pt.className = "text-gray-500", Pt.textContent = ne;
      const ti = document.createElement("span");
      ti.className = `placement-status text-xs ${X ? "text-green-600" : "text-amber-600"}`, ti.textContent = X ? "Placed" : "Not placed", gt.appendChild(Nt), gt.appendChild(Pt), ie.appendChild(Ht), ie.appendChild(gt), ie.appendChild(ti), ie.addEventListener("dragstart", (Re) => {
        if (X) {
          Re.preventDefault();
          return;
        }
        Re.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: oe,
          fieldType: pe,
          participantId: be,
          participantName: ne
        })), Re.dataTransfer.effectAllowed = "copy", ie.classList.add("opacity-50");
      }), ie.addEventListener("dragend", () => {
        ie.classList.remove("opacity-50");
      }), p.appendChild(ie);
      const Ai = C[Z + 1];
      if (Je && Ai && Ai.linkGroupId === Je) {
        const Re = Si(oe, !Zn);
        p.appendChild(Re);
      }
    }), ps();
    const N = ++L.loadRequestVersion, U = String(Se.value || "").trim(), V = encodeURIComponent(U), q = `${n}/panels/esign_documents/${V}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const Z = await window.pdfjsLib.getDocument({
        url: q,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (N !== L.loadRequestVersion)
        return;
      L.pdfDoc = Z, L.totalPages = L.pdfDoc.numPages, L.currentPage = 1, w.textContent = L.totalPages, await at(L.currentPage), c.classList.add("hidden"), L.uiHandlersBound || (gs(h, b), Ss(), xs(), L.uiHandlersBound = !0), pt();
    } catch (J) {
      if (N !== L.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", J), c.classList.add("hidden"), o.classList.remove("hidden"), o.textContent = `Failed to load PDF: ${te(J?.message || "Failed to load PDF")}`;
    }
    rn(), qe();
  }
  function Si(c, o) {
    const p = document.createElement("div");
    return p.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", p.dataset.definitionId = c, p.dataset.isLinked = String(o), p.title = o ? "Click to unlink this field" : "Click to re-link this field", p.setAttribute("role", "button"), p.setAttribute("aria-label", o ? "Unlink field from group" : "Re-link field to group"), p.setAttribute("tabindex", "0"), o ? p.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : p.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, p.addEventListener("click", () => xi(c, o)), p.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), xi(c, o));
    }), p;
  }
  function xi(c, o) {
    o ? (L.linkGroupState = Ri(L.linkGroupState, c), window.toastManager && window.toastManager.info("Field unlinked")) : (L.linkGroupState = Hi(L.linkGroupState, c), window.toastManager && window.toastManager.info("Field re-linked")), Kn();
  }
  function ps() {
    const c = document.getElementById("link-all-btn"), o = document.getElementById("unlink-all-btn");
    c && !c.dataset.bound && (c.dataset.bound = "true", c.addEventListener("click", () => {
      const p = L.linkGroupState.unlinkedDefinitions.size;
      if (p !== 0) {
        for (const h of L.linkGroupState.unlinkedDefinitions)
          L.linkGroupState = Hi(L.linkGroupState, h);
        window.toastManager && window.toastManager.success(`Re-linked ${p} field${p > 1 ? "s" : ""}`), Kn();
      }
    })), o && !o.dataset.bound && (o.dataset.bound = "true", o.addEventListener("click", () => {
      let p = 0;
      for (const h of L.linkGroupState.definitionToGroup.keys())
        L.linkGroupState.unlinkedDefinitions.has(h) || (L.linkGroupState = Ri(L.linkGroupState, h), p++);
      p > 0 && window.toastManager && window.toastManager.success(`Unlinked ${p} field${p > 1 ? "s" : ""}`), Kn();
    })), Ii();
  }
  function Ii() {
    const c = document.getElementById("link-all-btn"), o = document.getElementById("unlink-all-btn");
    if (c) {
      const p = L.linkGroupState.unlinkedDefinitions.size > 0;
      c.disabled = !p;
    }
    if (o) {
      let p = !1;
      for (const h of L.linkGroupState.definitionToGroup.keys())
        if (!L.linkGroupState.unlinkedDefinitions.has(h)) {
          p = !0;
          break;
        }
      o.disabled = !p;
    }
  }
  function Kn() {
    const c = document.getElementById("placement-fields-list");
    if (!c) return;
    const o = I();
    c.innerHTML = "";
    const p = o.map((h) => {
      const b = String(h.definitionId || "").trim(), w = L.linkGroupState.definitionToGroup.get(b) || "", k = L.linkGroupState.unlinkedDefinitions.has(b);
      return { ...h, definitionId: b, linkGroupId: w, isUnlinked: k };
    });
    p.forEach((h, b) => {
      const w = h.definitionId, k = String(h.fieldType || "text").trim() || "text", D = String(h.participantId || "").trim(), _ = String(h.participantName || "Unassigned").trim() || "Unassigned", A = parseInt(String(h.page || "1"), 10) || 1, C = h.linkGroupId, N = h.isUnlinked;
      if (!w) return;
      const U = ut[k] || ut.text, V = L.fieldInstances.some((ce) => ce.definitionId === w), q = document.createElement("div");
      q.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${V ? "opacity-50" : ""}`, q.draggable = !V, q.dataset.definitionId = w, q.dataset.fieldType = k, q.dataset.participantId = D, q.dataset.participantName = _, q.dataset.page = String(A), C && (q.dataset.linkGroupId = C);
      const J = document.createElement("span");
      J.className = `w-3 h-3 rounded ${U.bg}`;
      const Z = document.createElement("div");
      Z.className = "flex-1 text-xs";
      const oe = document.createElement("div");
      oe.className = "font-medium capitalize", oe.textContent = k.replace(/_/g, " ");
      const pe = document.createElement("div");
      pe.className = "text-gray-500", pe.textContent = _;
      const be = document.createElement("span");
      be.className = `placement-status text-xs ${V ? "text-green-600" : "text-amber-600"}`, be.textContent = V ? "Placed" : "Not placed", Z.appendChild(oe), Z.appendChild(pe), q.appendChild(J), q.appendChild(Z), q.appendChild(be), q.addEventListener("dragstart", (ce) => {
        if (V) {
          ce.preventDefault();
          return;
        }
        ce.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: w,
          fieldType: k,
          participantId: D,
          participantName: _
        })), ce.dataTransfer.effectAllowed = "copy", q.classList.add("opacity-50");
      }), q.addEventListener("dragend", () => {
        q.classList.remove("opacity-50");
      }), c.appendChild(q);
      const ne = p[b + 1];
      if (C && ne && ne.linkGroupId === C) {
        const ce = Si(w, !N);
        c.appendChild(ce);
      }
    }), Ii();
  }
  async function at(c) {
    if (!L.pdfDoc) return;
    const o = document.getElementById("placement-pdf-canvas"), p = document.getElementById("placement-canvas-container"), h = o.getContext("2d"), b = await L.pdfDoc.getPage(c), w = b.getViewport({ scale: L.scale });
    o.width = w.width, o.height = w.height, p.style.width = `${w.width}px`, p.style.height = `${w.height}px`, await b.render({
      canvasContext: h,
      viewport: w
    }).promise, document.getElementById("placement-current-page").textContent = c, pt();
  }
  function gs(c, o) {
    const p = document.getElementById("placement-pdf-canvas");
    c.addEventListener("dragover", (h) => {
      h.preventDefault(), h.dataTransfer.dropEffect = "copy", p.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("dragleave", (h) => {
      p.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("drop", (h) => {
      h.preventDefault(), p.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const b = h.dataTransfer.getData("application/json");
      if (!b) return;
      const w = JSON.parse(b), k = p.getBoundingClientRect(), D = (h.clientX - k.left) / L.scale, _ = (h.clientY - k.top) / L.scale;
      Ei(w, D, _);
    });
  }
  function Ei(c, o, p, h = {}) {
    const b = xn[c.fieldType] || xn.text, w = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, k = h.placementSource || ke.MANUAL, D = h.linkGroupId || es(L.linkGroupState, c.definitionId)?.id, _ = {
      id: w,
      definitionId: c.definitionId,
      type: c.fieldType,
      participantId: c.participantId,
      participantName: c.participantName,
      page: L.currentPage,
      x: Math.max(0, o - b.width / 2),
      y: Math.max(0, p - b.height / 2),
      width: b.width,
      height: b.height,
      placementSource: k,
      linkGroupId: D,
      linkedFromFieldId: h.linkedFromFieldId
    };
    L.fieldInstances.push(_), Li(c.definitionId), k === ke.MANUAL && D && ys(_), pt(), rn(), qe();
  }
  function Li(c, o = !1) {
    const p = document.querySelector(`.placement-field-item[data-definition-id="${c}"]`);
    if (p) {
      p.classList.add("opacity-50"), p.draggable = !1;
      const h = p.querySelector(".placement-status");
      h && (h.textContent = "Placed", h.classList.remove("text-amber-600"), h.classList.add("text-green-600")), o && p.classList.add("just-linked");
    }
  }
  function ms(c) {
    const o = wr(
      L.linkGroupState,
      c
    );
    o && (L.linkGroupState = Fi(L.linkGroupState, o.updatedGroup));
  }
  function Ci(c) {
    const o = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((w) => {
      const k = w.dataset.definitionId, D = w.dataset.page;
      if (k) {
        const _ = L.linkGroupState.definitionToGroup.get(k);
        o.set(k, {
          type: w.dataset.fieldType || "text",
          participantId: w.dataset.participantId || "",
          participantName: w.dataset.participantName || "Unknown",
          page: D ? parseInt(D, 10) : 1,
          linkGroupId: _
        });
      }
    });
    let h = 0;
    const b = 10;
    for (; h < b; ) {
      const w = Sr(
        L.linkGroupState,
        c,
        L.fieldInstances,
        o
      );
      if (!w || !w.newPlacement) break;
      L.fieldInstances.push(w.newPlacement), Li(w.newPlacement.definitionId, !0), h++;
    }
    h > 0 && (pt(), rn(), qe(), hs(h));
  }
  function hs(c) {
    const o = c === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${c} linked fields`;
    window.toastManager && window.toastManager.info(o);
    const p = document.createElement("div");
    p.setAttribute("role", "status"), p.setAttribute("aria-live", "polite"), p.className = "sr-only", p.textContent = o, document.body.appendChild(p), setTimeout(() => p.remove(), 1e3), fs();
  }
  function fs() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((o) => {
      o.classList.add("linked-flash"), setTimeout(() => {
        o.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function ys(c) {
    ms(c);
  }
  function pt() {
    const c = document.getElementById("placement-overlays-container");
    c.innerHTML = "", c.style.pointerEvents = "auto", L.fieldInstances.filter((o) => o.page === L.currentPage).forEach((o) => {
      const p = ut[o.type] || ut.text, h = L.selectedFieldId === o.id, b = o.placementSource === ke.AUTO_LINKED, w = document.createElement("div"), k = b ? "border-dashed" : "border-solid";
      w.className = `field-overlay absolute cursor-move ${p.border} border-2 ${k} rounded`, w.style.cssText = `
          left: ${o.x * L.scale}px;
          top: ${o.y * L.scale}px;
          width: ${o.width * L.scale}px;
          height: ${o.height * L.scale}px;
          background-color: ${p.fill};
          ${h ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, w.dataset.instanceId = o.id;
      const D = document.createElement("div");
      if (D.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + p.bg, D.textContent = `${o.type.replace("_", " ")} - ${o.participantName}`, w.appendChild(D), b) {
        const C = document.createElement("div");
        C.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", C.title = "Auto-linked from template", C.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, w.appendChild(C);
      }
      const _ = document.createElement("div");
      _.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", _.style.cssText = "transform: translate(50%, 50%);", w.appendChild(_);
      const A = document.createElement("button");
      A.type = "button", A.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", A.innerHTML = "×", A.addEventListener("click", (C) => {
        C.stopPropagation(), ws(o.id);
      }), w.appendChild(A), w.addEventListener("mousedown", (C) => {
        C.target === _ ? bs(C, o) : C.target !== A && vs(C, o, w);
      }), w.addEventListener("click", () => {
        L.selectedFieldId = o.id, pt();
      }), c.appendChild(w);
    });
  }
  function vs(c, o, p) {
    c.preventDefault(), L.isDragging = !0, L.selectedFieldId = o.id;
    const h = c.clientX, b = c.clientY, w = o.x * L.scale, k = o.y * L.scale;
    function D(A) {
      const C = A.clientX - h, N = A.clientY - b;
      o.x = Math.max(0, (w + C) / L.scale), o.y = Math.max(0, (k + N) / L.scale), o.placementSource = ke.MANUAL, p.style.left = `${o.x * L.scale}px`, p.style.top = `${o.y * L.scale}px`;
    }
    function _() {
      L.isDragging = !1, document.removeEventListener("mousemove", D), document.removeEventListener("mouseup", _), qe();
    }
    document.addEventListener("mousemove", D), document.addEventListener("mouseup", _);
  }
  function bs(c, o) {
    c.preventDefault(), c.stopPropagation(), L.isResizing = !0;
    const p = c.clientX, h = c.clientY, b = o.width, w = o.height;
    function k(_) {
      const A = (_.clientX - p) / L.scale, C = (_.clientY - h) / L.scale;
      o.width = Math.max(30, b + A), o.height = Math.max(20, w + C), o.placementSource = ke.MANUAL, pt();
    }
    function D() {
      L.isResizing = !1, document.removeEventListener("mousemove", k), document.removeEventListener("mouseup", D), qe();
    }
    document.addEventListener("mousemove", k), document.addEventListener("mouseup", D);
  }
  function ws(c) {
    const o = L.fieldInstances.find((h) => h.id === c);
    if (!o) return;
    L.fieldInstances = L.fieldInstances.filter((h) => h.id !== c);
    const p = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (p) {
      p.classList.remove("opacity-50"), p.draggable = !0;
      const h = p.querySelector(".placement-status");
      h && (h.textContent = "Not placed", h.classList.remove("text-green-600"), h.classList.add("text-amber-600"));
    }
    pt(), rn(), qe();
  }
  function Ss() {
    const c = document.getElementById("placement-prev-page"), o = document.getElementById("placement-next-page");
    c.addEventListener("click", async () => {
      L.currentPage > 1 && (L.currentPage--, Ci(L.currentPage), await at(L.currentPage));
    }), o.addEventListener("click", async () => {
      L.currentPage < L.totalPages && (L.currentPage++, Ci(L.currentPage), await at(L.currentPage));
    });
  }
  function xs() {
    const c = document.getElementById("placement-zoom-in"), o = document.getElementById("placement-zoom-out"), p = document.getElementById("placement-zoom-fit"), h = document.getElementById("placement-zoom-level");
    c.addEventListener("click", async () => {
      L.scale = Math.min(3, L.scale + 0.25), h.textContent = `${Math.round(L.scale * 100)}%`, await at(L.currentPage);
    }), o.addEventListener("click", async () => {
      L.scale = Math.max(0.5, L.scale - 0.25), h.textContent = `${Math.round(L.scale * 100)}%`, await at(L.currentPage);
    }), p.addEventListener("click", async () => {
      const b = document.getElementById("placement-viewer"), k = (await L.pdfDoc.getPage(L.currentPage)).getViewport({ scale: 1 });
      L.scale = (b.clientWidth - 40) / k.width, h.textContent = `${Math.round(L.scale * 100)}%`, await at(L.currentPage);
    });
  }
  function rn() {
    const c = Array.from(document.querySelectorAll(".placement-field-item")), o = c.length, p = new Set(
      c.map((k) => String(k.dataset.definitionId || "").trim()).filter((k) => k)
    ), h = /* @__PURE__ */ new Set();
    L.fieldInstances.forEach((k) => {
      const D = String(k.definitionId || "").trim();
      p.has(D) && h.add(D);
    });
    const b = h.size, w = Math.max(0, o - b);
    document.getElementById("placement-total-fields").textContent = o, document.getElementById("placement-placed-count").textContent = b, document.getElementById("placement-unplaced-count").textContent = w;
  }
  function qe() {
    const c = document.getElementById("field-instances-container");
    c.innerHTML = "";
    const o = L.fieldInstances.map((p, h) => qi(p, h));
    Ct && (Ct.value = JSON.stringify(o));
  }
  qe();
  let De = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const At = document.getElementById("auto-place-btn");
  At && At.addEventListener("click", async () => {
    if (De.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      an("All fields are already placed", "info");
      return;
    }
    const o = document.querySelector('input[name="id"]')?.value;
    if (!o) {
      Xn();
      return;
    }
    De.isRunning = !0, At.disabled = !0, At.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const p = await fetch(`${l}/esign/agreements/${o}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Is()
        })
      });
      if (!p.ok)
        throw await Ue(p, "Auto-placement failed");
      const h = await p.json(), b = h && typeof h == "object" && h.run && typeof h.run == "object" ? h.run : h;
      De.currentRunId = b?.run_id || b?.id || null, De.suggestions = b?.suggestions || [], De.resolverScores = b?.resolver_scores || [], De.suggestions.length === 0 ? (an("No placement suggestions found. Try placing fields manually.", "warning"), Xn()) : Es(h);
    } catch (p) {
      console.error("Auto-place error:", p);
      const h = te(p?.message || "Auto-placement failed", p?.code || "", p?.status || 0);
      an(`Auto-placement failed: ${h}`, "error"), Xn();
    } finally {
      De.isRunning = !1, At.disabled = !1, At.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Is() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function Xn() {
    const c = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let o = 100;
    c.forEach((p) => {
      const h = {
        definitionId: p.dataset.definitionId,
        fieldType: p.dataset.fieldType,
        participantId: p.dataset.participantId,
        participantName: p.dataset.participantName
      }, b = xn[h.fieldType] || xn.text;
      L.currentPage = L.totalPages, Ei(h, 300, o + b.height / 2, { placementSource: ke.AUTO_FALLBACK }), o += b.height + 20;
    }), L.pdfDoc && at(L.totalPages), an("Fields placed using fallback layout", "info");
  }
  function Es(c) {
    let o = document.getElementById("placement-suggestions-modal");
    o || (o = Ls(), document.body.appendChild(o));
    const p = o.querySelector("#suggestions-list"), h = o.querySelector("#resolver-info"), b = o.querySelector("#run-stats");
    h.innerHTML = De.resolverScores.map((w) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${le(String(w?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${w.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${_s(w.score)}">
              ${(Number(w?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), b.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${le(String(c?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${c.status === "completed" ? "text-green-600" : "text-amber-600"}">${le(String(c?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(c?.elapsed_ms || 0))}ms</span>
      </div>
    `, p.innerHTML = De.suggestions.map((w, k) => {
      const D = ki(w.field_definition_id), _ = ut[D?.type] || ut.text, A = le(String(D?.type || "field").replace(/_/g, " ")), C = le(String(w?.id || "")), N = Math.max(1, Number(w?.page_number || 1)), U = Math.round(Number(w?.x || 0)), V = Math.round(Number(w?.y || 0)), q = Math.max(0, Number(w?.confidence || 0)), J = le(Ds(String(w?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${k}" data-suggestion-id="${C}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${_.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${A}</div>
                <div class="text-xs text-gray-500">Page ${N}, (${U}, ${V})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${Ts(w.confidence)}">
                ${(q * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${J}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${k}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${k}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${k}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), Cs(o), o.classList.remove("hidden");
  }
  function Ls() {
    const c = document.createElement("div");
    return c.id = "placement-suggestions-modal", c.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", c.innerHTML = `
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
    `, c.querySelector("#close-suggestions-modal").addEventListener("click", () => {
      c.classList.add("hidden");
    }), c.addEventListener("click", (o) => {
      o.target === c && c.classList.add("hidden");
    }), c.querySelector("#accept-all-btn").addEventListener("click", () => {
      c.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-green-500", "bg-green-50"), o.classList.remove("border-red-500", "bg-red-50"), o.dataset.accepted = "true";
      });
    }), c.querySelector("#reject-all-btn").addEventListener("click", () => {
      c.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-red-500", "bg-red-50"), o.classList.remove("border-green-500", "bg-green-50"), o.dataset.accepted = "false";
      });
    }), c.querySelector("#apply-suggestions-btn").addEventListener("click", () => {
      As(), c.classList.add("hidden");
    }), c.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      c.classList.add("hidden");
      const o = c.querySelector("#placement-policy-preset-modal"), p = document.getElementById("placement-policy-preset");
      p && o && (p.value = o.value), At?.click();
    }), c;
  }
  function Cs(c) {
    c.querySelectorAll(".accept-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const p = o.closest(".suggestion-item");
        p.classList.add("border-green-500", "bg-green-50"), p.classList.remove("border-red-500", "bg-red-50"), p.dataset.accepted = "true";
      });
    }), c.querySelectorAll(".reject-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const p = o.closest(".suggestion-item");
        p.classList.add("border-red-500", "bg-red-50"), p.classList.remove("border-green-500", "bg-green-50"), p.dataset.accepted = "false";
      });
    }), c.querySelectorAll(".preview-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const p = parseInt(o.dataset.index, 10), h = De.suggestions[p];
        h && ks(h);
      });
    });
  }
  function ks(c) {
    c.page_number !== L.currentPage && (L.currentPage = c.page_number, at(c.page_number));
    const o = document.getElementById("placement-overlays-container"), p = document.getElementById("suggestion-preview-overlay");
    p && p.remove();
    const h = document.createElement("div");
    h.id = "suggestion-preview-overlay", h.className = "absolute pointer-events-none animate-pulse", h.style.cssText = `
      left: ${c.x * L.scale}px;
      top: ${c.y * L.scale}px;
      width: ${c.width * L.scale}px;
      height: ${c.height * L.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, o.appendChild(h), setTimeout(() => h.remove(), 3e3);
  }
  function As() {
    const o = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    o.forEach((p) => {
      const h = parseInt(p.dataset.index, 10), b = De.suggestions[h];
      if (!b) return;
      const w = ki(b.field_definition_id);
      if (!w) return;
      const k = document.querySelector(`.placement-field-item[data-definition-id="${b.field_definition_id}"]`);
      if (!k || k.classList.contains("opacity-50")) return;
      const D = {
        definitionId: b.field_definition_id,
        fieldType: w.type,
        participantId: w.participant_id,
        participantName: k.dataset.participantName
      };
      L.currentPage = b.page_number, Ps(D, b);
    }), L.pdfDoc && at(L.currentPage), Ms(o.length, De.suggestions.length - o.length), an(`Applied ${o.length} placement${o.length !== 1 ? "s" : ""}`, "success");
  }
  function Ps(c, o) {
    const p = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: c.definitionId,
      type: c.fieldType,
      participantId: c.participantId,
      participantName: c.participantName,
      page: o.page_number,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      // Track placement source for audit
      placementSource: ke.AUTO,
      resolverId: o.resolver_id,
      confidence: o.confidence,
      placementRunId: De.currentRunId
    };
    L.fieldInstances.push(p);
    const h = document.querySelector(`.placement-field-item[data-definition-id="${c.definitionId}"]`);
    if (h) {
      h.classList.add("opacity-50"), h.draggable = !1;
      const b = h.querySelector(".placement-status");
      b && (b.textContent = "Placed", b.classList.remove("text-amber-600"), b.classList.add("text-green-600"));
    }
    pt(), rn(), qe();
  }
  function ki(c) {
    const o = document.querySelector(`.field-definition-entry[data-field-definition-id="${c}"]`);
    return o ? {
      id: c,
      type: o.querySelector(".field-type-select")?.value || "text",
      participant_id: o.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function Ts(c) {
    return c >= 0.9 ? "bg-green-100 text-green-800" : c >= 0.7 ? "bg-blue-100 text-blue-800" : c >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function _s(c) {
    return c >= 0.8 ? "bg-green-100 text-green-800" : c >= 0.6 ? "bg-blue-100 text-blue-800" : c >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Ds(c) {
    return c ? c.split("_").map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(" ") : "Unknown";
  }
  async function Ms(c, o) {
  }
  function an(c, o = "info") {
    const p = document.createElement("div");
    p.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${o === "success" ? "bg-green-600 text-white" : o === "error" ? "bg-red-600 text-white" : o === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, p.textContent = c, document.body.appendChild(p), setTimeout(() => {
      p.style.opacity = "0", setTimeout(() => p.remove(), 300);
    }, 3e3);
  }
  function $s() {
    const c = document.getElementById("send-readiness-loading"), o = document.getElementById("send-readiness-results"), p = document.getElementById("send-validation-status"), h = document.getElementById("send-validation-issues"), b = document.getElementById("send-issues-list"), w = document.getElementById("send-confirmation"), k = document.getElementById("review-agreement-title"), D = document.getElementById("review-document-title"), _ = document.getElementById("review-participant-count"), A = document.getElementById("review-stage-count"), C = document.getElementById("review-participants-list"), N = document.getElementById("review-fields-summary"), U = document.getElementById("title").value || "Untitled", V = Ne.textContent || "No document", q = Le.querySelectorAll(".participant-entry"), J = Ce.querySelectorAll(".field-definition-entry"), Z = y(g(), r()), oe = Fe(), pe = /* @__PURE__ */ new Set();
    q.forEach((X) => {
      const ie = X.querySelector(".signing-stage-input");
      X.querySelector('select[name*=".role"]').value === "signer" && ie?.value && pe.add(parseInt(ie.value, 10));
    }), k.textContent = U, D.textContent = V, _.textContent = `${q.length} (${oe.length} signers)`, A.textContent = pe.size > 0 ? pe.size : "1", C.innerHTML = "", q.forEach((X) => {
      const ie = X.querySelector('input[name*=".name"]'), Ht = X.querySelector('input[name*=".email"]'), gt = X.querySelector('select[name*=".role"]'), Nt = X.querySelector(".signing-stage-input"), Pt = document.createElement("div");
      Pt.className = "flex items-center justify-between text-sm", Pt.innerHTML = `
        <div>
          <span class="font-medium">${le(ie.value || Ht.value)}</span>
          <span class="text-gray-500 ml-2">${le(Ht.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${gt.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${gt.value === "signer" ? "Signer" : "CC"}
          </span>
          ${gt.value === "signer" && Nt?.value ? `<span class="text-xs text-gray-500">Stage ${Nt.value}</span>` : ""}
        </div>
      `, C.appendChild(Pt);
    });
    const be = J.length + Z.length;
    N.textContent = `${be} field${be !== 1 ? "s" : ""} defined (${J.length} manual, ${Z.length} generated)`;
    const ne = [];
    Se.value || ne.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), oe.length === 0 && ne.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), nn().forEach((X) => {
      ne.push({
        severity: "error",
        message: `${X.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Je = Array.from(pe).sort((X, ie) => X - ie);
    for (let X = 0; X < Je.length; X++)
      if (Je[X] !== X + 1) {
        ne.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Zn = ne.some((X) => X.severity === "error"), ei = ne.some((X) => X.severity === "warning");
    Zn ? (p.className = "p-4 rounded-lg bg-red-50 border border-red-200", p.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, w.classList.add("hidden"), ue.disabled = !0) : ei ? (p.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", p.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, w.classList.remove("hidden"), ue.disabled = !1) : (p.className = "p-4 rounded-lg bg-green-50 border border-green-200", p.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, w.classList.remove("hidden"), ue.disabled = !1), ne.length > 0 ? (h.classList.remove("hidden"), b.innerHTML = "", ne.forEach((X) => {
      const ie = document.createElement("li");
      ie.className = `p-3 rounded-lg flex items-center justify-between ${X.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, ie.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${X.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${X.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${le(X.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${X.step}">
            ${le(X.action)}
          </button>
        `, b.appendChild(ie);
    }), b.querySelectorAll("[data-go-to-step]").forEach((X) => {
      X.addEventListener("click", () => {
        const ie = Number(X.getAttribute("data-go-to-step"));
        Number.isFinite(ie) && sn(ie);
      });
    })) : h.classList.add("hidden"), c.classList.add("hidden"), o.classList.remove("hidden");
  }
  let Qn = null;
  function We() {
    Qn && clearTimeout(Qn), Qn = setTimeout(() => {
      _t();
    }, 500);
  }
  Se && new MutationObserver(() => {
    _t();
  }).observe(Se, { attributes: !0, attributeFilter: ["value"] });
  const Bs = document.getElementById("title"), Fs = document.getElementById("message");
  Bs?.addEventListener("input", We), Fs?.addEventListener("input", We), Le.addEventListener("input", We), Le.addEventListener("change", We), Ce.addEventListener("input", We), Ce.addEventListener("change", We), xe?.addEventListener("input", We), xe?.addEventListener("change", We);
  const Rs = qe;
  qe = function() {
    Rs(), _t();
  };
  function Hs() {
    const c = z.getState();
    !c.participants || c.participants.length === 0 || (Le.innerHTML = "", Ft = 0, c.participants.forEach((o) => {
      Rt({
        id: o.tempId,
        name: o.name,
        email: o.email,
        role: o.role,
        signing_stage: o.signingStage
      });
    }));
  }
  function Ns() {
    const c = z.getState();
    !c.fieldDefinitions || c.fieldDefinitions.length === 0 || (Ce.innerHTML = "", yn = 0, c.fieldDefinitions.forEach((o) => {
      K({
        id: o.tempId,
        type: o.type,
        participant_id: o.participantTempId,
        page: o.page,
        required: o.required
      });
    }), G());
  }
  function Us() {
    const c = z.getState();
    !Array.isArray(c.fieldRules) || c.fieldRules.length === 0 || xe && (xe.querySelectorAll(".field-rule-entry").forEach((o) => o.remove()), en = 0, c.fieldRules.forEach((o) => {
      H({
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
    }), u(), x());
  }
  function qs() {
    const c = z.getState();
    !Array.isArray(c.fieldPlacements) || c.fieldPlacements.length === 0 || (L.fieldInstances = c.fieldPlacements.map((o, p) => kn(o, p)), qe());
  }
  if (window._resumeToStep) {
    Hs(), Ns(), Us(), rt(), qs();
    const c = z.getState();
    c.document?.id && He.setDocument(c.document.id, c.document.title, c.document.pageCount), de = window._resumeToStep, Yn(), delete window._resumeToStep;
  } else if (Yn(), Se.value) {
    const c = Ne?.textContent || null, o = ge(Oe.value, null);
    He.setDocument(Se.value, c, o);
  }
  a && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function Pr(i) {
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
class ss {
  constructor(e) {
    this.initialized = !1, this.config = Pr(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Ar(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function za(i) {
  const e = new ss(i);
  return ee(() => e.init()), e;
}
function Tr(i) {
  const e = new ss({
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
  ee(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && ee(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      Tr({
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
const _r = "esign.signer.profile.v1", ji = "esign.signer.profile.outbox.v1", pi = 90, zi = 500 * 1024;
class Dr {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : pi;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${_r}:${e}`;
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
    const n = Date.now(), l = {
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
      window.localStorage.setItem(this.storageKey(e), JSON.stringify(l));
    } catch {
    }
    return l;
  }
  async clear(e) {
    try {
      window.localStorage.removeItem(this.storageKey(e));
    } catch {
    }
  }
}
class Mr {
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
class ai {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(ji);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [s, l] of Object.entries(t)) {
        if (!l || typeof l != "object")
          continue;
        const d = l;
        if (d.op === "clear") {
          n[s] = {
            op: "clear",
            updatedAt: Number(d.updatedAt) || Date.now()
          };
          continue;
        }
        const a = d.op === "patch" ? d.patch : d;
        n[s] = {
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
      window.localStorage.setItem(ji, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), s = n[e], l = s?.op === "patch" ? s.patch || {} : {};
    n[e] = {
      op: "patch",
      patch: { ...l, ...t, updatedAt: Date.now() },
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
      ]), l = this.pickLatest(n, s);
      return l && await this.localStore.save(e, l), await this.flushOutboxForKey(e), l;
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
function $r(i) {
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
      ttlDays: Number(i.profile?.ttlDays || pi) || pi,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Br(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function oi(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Fr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Ke(i) {
  const e = String(i || "").trim();
  return Fr(e) ? "" : e;
}
function Rr(i) {
  const e = new Dr(i.profile.ttlDays), t = new Mr(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new ai("local_only", e, null) : i.profile.mode === "remote_only" ? new ai("remote_only", e, t) : new ai("hybrid", e, t);
}
function Hr() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Nr(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = $r(i), s = Br(n), l = Rr(n);
  Hr();
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
    track(r, u = {}) {
      if (!n.telemetryEnabled) return;
      const g = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...u
      };
      this.events.push(g), this.isCriticalEvent(r) && this.flush();
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
    trackViewerLoad(r, u, g = null) {
      this.metrics.viewerLoadTime = u, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: u,
        error: g,
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
    trackFieldSave(r, u, g, f, y = null) {
      this.metrics.fieldSaveLatencies.push(f), g ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: y }), this.track(g ? "field_save_success" : "field_save_failed", {
        fieldId: r,
        fieldType: u,
        latency: f,
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
    trackSignatureAttach(r, u, g, f, y = null) {
      this.metrics.signatureAttachLatencies.push(f), this.track(g ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: r,
        signatureType: u,
        latency: f,
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
    trackSubmit(r, u = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(r ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: a.fieldState.size,
        error: u
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
    trackDegradedMode(r, u = {}) {
      this.track("degraded_mode", {
        degradationType: r,
        ...u
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
      return r.length ? Math.round(r.reduce((u, g) => u + g, 0) / r.length) : 0;
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
          const u = JSON.stringify({
            events: r,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, u);
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
      } catch (u) {
        this.events = [...r, ...this.events], console.warn("Telemetry flush failed:", u);
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
    profileKey: s,
    profileData: null,
    profileRemember: n.profile.rememberByDefault,
    guidedTargetFieldId: null,
    writeCooldownUntil: 0,
    writeCooldownTimer: null,
    submitCooldownUntil: 0,
    submitCooldownTimer: null,
    isSubmitting: !1
  }, S = {
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
      const u = n.viewer.pages?.find((f) => f.page === r);
      if (u)
        return {
          width: u.width,
          height: u.height,
          rotation: u.rotation || 0
        };
      const g = this.pageViewports.get(r);
      return g ? {
        width: g.width,
        height: g.height,
        rotation: g.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(r, u) {
      this.pageViewports.set(r, {
        width: u.width,
        height: u.height,
        rotation: u.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(r, u) {
      const g = r.page, f = this.getPageMetadata(g), y = u.offsetWidth, x = u.offsetHeight, I = r.pageWidth || f.width, $ = r.pageHeight || f.height, H = y / I, K = x / $;
      let G = r.posX || 0, ve = r.posY || 0;
      n.viewer.origin === "bottom-left" && (ve = $ - ve - (r.height || 30));
      const he = G * H, ue = ve * K, W = (r.width || 150) * H, te = (r.height || 30) * K;
      return {
        left: he,
        top: ue,
        width: W,
        height: te,
        // Store original values for debugging
        _debug: {
          sourceX: G,
          sourceY: ve,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: I,
          pageHeight: $,
          scaleX: H,
          scaleY: K,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, u) {
      const g = this.pageToScreen(r, u);
      return {
        left: `${Math.round(g.left)}px`,
        top: `${Math.round(g.top)}px`,
        width: `${Math.round(g.width)}px`,
        height: `${Math.round(g.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, v = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(r, u, g, f) {
      const y = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: u,
            content_type: g,
            size_bytes: f
          })
        }
      );
      if (!y.ok)
        throw await Be(y, "Failed to get upload contract");
      const x = await y.json(), I = x?.contract || x;
      if (!I || typeof I != "object" || !I.upload_url)
        throw new Error("Invalid upload contract response");
      return I;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, u) {
      const g = new URL(r.upload_url, window.location.origin);
      r.upload_token && g.searchParams.set("upload_token", String(r.upload_token)), r.object_key && g.searchParams.set("object_key", String(r.object_key));
      const f = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([x, I]) => {
        const $ = String(x).toLowerCase();
        $ === "x-esign-upload-token" || $ === "x-esign-upload-key" || (f[x] = String(I));
      });
      const y = await fetch(g.toString(), {
        method: r.method || "PUT",
        headers: f,
        body: u,
        credentials: "omit"
      });
      if (!y.ok)
        throw await Be(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [u, g] = r.split(","), f = u.match(/data:([^;]+)/), y = f ? f[1] : "image/png", x = atob(g), I = new Uint8Array(x.length);
      for (let $ = 0; $ < x.length; $++)
        I[$] = x.charCodeAt($);
      return new Blob([I], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, u) {
      const g = this.dataUrlToBlob(u), f = g.size, y = "image/png", x = await Xe(g), I = await this.requestUploadBootstrap(
        r,
        x,
        y,
        f
      );
      return await this.uploadToSignedUrl(I, g), {
        uploadToken: I.upload_token,
        objectKey: I.object_key,
        sha256: I.sha256,
        contentType: I.content_type
      };
    }
  }, E = {
    endpoint(r, u = "") {
      const g = encodeURIComponent(r), f = u ? `/${encodeURIComponent(u)}` : "";
      return `${n.apiBasePath}/signatures/${g}${f}`;
    },
    async list(r) {
      const u = new URL(this.endpoint(n.token), window.location.origin);
      u.searchParams.set("type", r);
      const g = await fetch(u.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!g.ok) {
        const y = await g.json().catch(() => ({}));
        throw new Error(y?.error?.message || "Failed to load saved signatures");
      }
      const f = await g.json();
      return Array.isArray(f?.signatures) ? f.signatures : [];
    },
    async save(r, u, g = "") {
      const f = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: g,
          data_url: u
        })
      });
      if (!f.ok) {
        const x = await f.json().catch(() => ({})), I = new Error(x?.error?.message || "Failed to save signature");
        throw I.code = x?.error?.code || "", I;
      }
      return (await f.json())?.signature || null;
    },
    async delete(r) {
      const u = await fetch(this.endpoint(n.token, r), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!u.ok) {
        const g = await u.json().catch(() => ({}));
        throw new Error(g?.error?.message || "Failed to delete signature");
      }
    }
  };
  function T(r) {
    const u = a.fieldState.get(r);
    return u && u.type === "initials" ? "initials" : "signature";
  }
  function R(r) {
    return a.savedSignaturesByType.get(r) || [];
  }
  async function F(r, u = !1) {
    const g = T(r);
    if (!u && a.savedSignaturesByType.has(g)) {
      B(r);
      return;
    }
    const f = await E.list(g);
    a.savedSignaturesByType.set(g, f), B(r);
  }
  function B(r) {
    const u = T(r), g = R(u), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!g.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = g.map((y) => {
        const x = Ye(String(y?.thumbnail_data_url || y?.data_url || "")), I = Ye(String(y?.label || "Saved signature")), $ = Ye(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${I}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${I}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Ye(r)}" data-signature-id="${$}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Ye(r)}" data-signature-id="${$}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function O(r) {
    const u = a.signatureCanvases.get(r), g = T(r);
    if (!u || !Lt(r))
      throw new Error(`Please add your ${g === "initials" ? "initials" : "signature"} first`);
    const f = u.canvas.toDataURL("image/png"), y = await E.save(g, f, g === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const x = R(g);
    x.unshift(y), a.savedSignaturesByType.set(g, x), B(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function Y(r, u) {
    const g = T(r), y = R(g).find((I) => String(I?.id || "") === String(u));
    if (!y) return;
    requestAnimationFrame(() => Me(r)), await me(r);
    const x = String(y.data_url || y.thumbnail_data_url || "").trim();
    x && (await Jt(r, x, { clearStrokes: !0 }), j("draw", r), ye("Saved signature selected."));
  }
  async function Q(r, u) {
    const g = T(r);
    await E.delete(u);
    const f = R(g).filter((y) => String(y?.id || "") !== String(u));
    a.savedSignaturesByType.set(g, f), B(r);
  }
  function re(r) {
    const u = String(r?.code || "").trim(), g = String(r?.message || "Unable to update saved signatures"), f = u === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : g;
    window.toastManager && window.toastManager.error(f), ye(f, "assertive");
  }
  async function me(r, u = 8) {
    for (let g = 0; g < u; g++) {
      if (a.signatureCanvases.has(r)) return !0;
      await new Promise((f) => setTimeout(f, 40)), Me(r);
    }
    return !1;
  }
  async function we(r, u) {
    const g = String(u?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(g))
      throw new Error("Only PNG and JPEG images are supported");
    if (u.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => Me(r)), await me(r);
    const f = a.signatureCanvases.get(r);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const y = await Pe(u), x = g === "image/png" ? y : await je(y, f.drawWidth, f.drawHeight);
    if (ft(x) > zi)
      throw new Error(`Image exceeds ${Math.round(zi / 1024)}KB limit after conversion`);
    await Jt(r, x, { clearStrokes: !0 });
    const $ = document.getElementById("sig-upload-preview-wrap"), H = document.getElementById("sig-upload-preview");
    $ && $.classList.remove("hidden"), H && H.setAttribute("src", x), ye("Signature image uploaded. You can now insert it.");
  }
  function Pe(r) {
    return new Promise((u, g) => {
      const f = new FileReader();
      f.onload = () => u(String(f.result || "")), f.onerror = () => g(new Error("Unable to read image file")), f.readAsDataURL(r);
    });
  }
  function ft(r) {
    const u = String(r || "").split(",");
    if (u.length < 2) return 0;
    const g = u[1] || "", f = (g.match(/=+$/) || [""])[0].length;
    return Math.floor(g.length * 3 / 4) - f;
  }
  async function je(r, u, g) {
    return await new Promise((f, y) => {
      const x = new Image();
      x.onload = () => {
        const I = document.createElement("canvas"), $ = Math.max(1, Math.round(Number(u) || 600)), H = Math.max(1, Math.round(Number(g) || 160));
        I.width = $, I.height = H;
        const K = I.getContext("2d");
        if (!K) {
          y(new Error("Unable to process image"));
          return;
        }
        K.clearRect(0, 0, $, H);
        const G = Math.min($ / x.width, H / x.height), ve = x.width * G, he = x.height * G, ue = ($ - ve) / 2, W = (H - he) / 2;
        K.drawImage(x, ue, W, ve, he), f(I.toDataURL("image/png"));
      }, x.onerror = () => y(new Error("Unable to decode image file")), x.src = r;
    });
  }
  async function Xe(r) {
    if (window.crypto && window.crypto.subtle) {
      const u = await r.arrayBuffer(), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function ot() {
    document.addEventListener("click", (r) => {
      const u = r.target;
      if (!(u instanceof Element)) return;
      const g = u.closest("[data-esign-action]");
      if (!g) return;
      switch (g.getAttribute("data-esign-action")) {
        case "prev-page":
          Bn();
          break;
        case "next-page":
          dn();
          break;
        case "zoom-out":
          Fn();
          break;
        case "zoom-in":
          le();
          break;
        case "fit-width":
          un();
          break;
        case "download-document":
          en();
          break;
        case "show-consent-modal":
          Kt();
          break;
        case "activate-field": {
          const y = g.getAttribute("data-field-id");
          y && St(y);
          break;
        }
        case "submit-signature":
          Qt();
          break;
        case "show-decline-modal":
          Zt();
          break;
        case "close-field-editor":
          Bt();
          break;
        case "save-field-editor":
          pn();
          break;
        case "hide-consent-modal":
          Xt();
          break;
        case "accept-consent":
          fn();
          break;
        case "hide-decline-modal":
          Ct();
          break;
        case "confirm-decline":
          Gn();
          break;
        case "retry-load-pdf":
          dt();
          break;
        case "signature-tab": {
          const y = g.getAttribute("data-tab") || "draw", x = g.getAttribute("data-field-id");
          x && j(y, x);
          break;
        }
        case "clear-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && _e(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && Un(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && $t(y);
          break;
        }
        case "save-current-signature-library": {
          const y = g.getAttribute("data-field-id");
          y && O(y).catch(re);
          break;
        }
        case "select-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && Y(y, x).catch(re);
          break;
        }
        case "delete-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && Q(y, x).catch(re);
          break;
        }
        case "clear-signer-profile":
          zt().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          st.togglePanel();
          break;
        case "debug-copy-session":
          st.copySessionInfo();
          break;
        case "debug-clear-cache":
          st.clearCache();
          break;
        case "debug-show-telemetry":
          st.showTelemetry();
          break;
        case "debug-reload-viewer":
          st.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const u = r.target;
      if (!(u instanceof HTMLInputElement) || !u.matches("#sig-upload-input")) return;
      const g = u.getAttribute("data-field-id"), f = u.files?.[0];
      !g || !f || we(g, f).catch((y) => {
        window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
      });
    }), document.addEventListener("input", (r) => {
      const u = r.target;
      if (!(u instanceof HTMLInputElement) || !u.matches("#sig-type-input")) return;
      const g = u.getAttribute("data-field-id") || a.activeFieldId;
      g && Mt(g, u.value || "");
    });
  }
  ee(async () => {
    ot(), a.isLowMemory = Oe(), jt(), Mn(), await Se(), _t(), ze(), mn(), Ve(), await dt(), nt(), document.addEventListener("visibilitychange", z), "memory" in navigator && Te(), st.init();
  });
  function z() {
    document.hidden && fe();
  }
  function fe() {
    const r = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > r; ) {
      let u = null, g = 1 / 0;
      if (a.renderedPages.forEach((f, y) => {
        y !== a.currentPage && f.timestamp < g && (u = y, g = f.timestamp);
      }), u !== null)
        a.renderedPages.delete(u);
      else
        break;
    }
  }
  function Te() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, u = navigator.memory.totalJSHeapSize;
        r / u > 0.8 && (a.isLowMemory = !0, fe());
      }
    }, 3e4);
  }
  function He(r) {
    switch (String(r || "").trim().toLowerCase()) {
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
  function jt() {
    const r = document.getElementById("pdf-compatibility-banner"), u = document.getElementById("pdf-compatibility-message"), g = document.getElementById("pdf-compatibility-title");
    if (!r || !u || !g) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      r.classList.add("hidden");
      return;
    }
    g.textContent = "Preview Compatibility Notice", u.textContent = String(n.viewer.compatibilityMessage || "").trim() || He(y), r.classList.remove("hidden"), d.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: y });
  }
  function Mn() {
    const r = document.getElementById("stage-state-banner"), u = document.getElementById("stage-state-icon"), g = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !u || !g || !f || !y) return;
    const x = n.signerState || "active", I = n.recipientStage || 1, $ = n.activeStage || 1, H = n.activeRecipientIds || [], K = n.waitingForRecipientIds || [];
    let G = {
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
        G = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: I > $ ? `You are in signing stage ${I}. Stage ${$} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, K.length > 0 && G.badges.push({
          icon: "iconoir-group",
          text: `${K.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        G = {
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
        G = {
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
        H.length > 1 ? (G.message = `You and ${H.length - 1} other signer(s) can sign now.`, G.badges = [
          { icon: "iconoir-users", text: `Stage ${$} active`, variant: "green" }
        ]) : I > 1 ? G.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${I}`, variant: "green" }
        ] : G.hidden = !0;
        break;
    }
    if (G.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${G.bgClass} ${G.borderClass}`, u.className = `${G.iconClass} mt-0.5`, g.className = `text-sm font-semibold ${G.titleClass}`, g.textContent = G.title, f.className = `text-xs ${G.messageClass} mt-1`, f.textContent = G.message, y.innerHTML = "", G.badges.forEach((ve) => {
      const he = document.createElement("span"), ue = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      he.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ue[ve.variant] || ue.blue}`, he.innerHTML = `<i class="${ve.icon} mr-1"></i>${ve.text}`, y.appendChild(he);
    });
  }
  function _t() {
    n.fields.forEach((r) => {
      let u = null, g = !1;
      if (r.type === "checkbox")
        u = r.value_bool || !1, g = u;
      else if (r.type === "date_signed")
        u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], g = !0;
      else {
        const f = String(r.value_text || "");
        u = f || ct(r), g = !!f;
      }
      a.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: u,
        completed: g,
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
  async function Se() {
    try {
      const r = await l.load(a.profileKey);
      r && (a.profileData = r, a.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function ct(r) {
    const u = a.profileData;
    if (!u) return "";
    const g = String(r?.type || "").trim();
    return g === "name" ? Ke(u.fullName || "") : g === "initials" ? Ke(u.initials || "") || oi(u.fullName || n.recipientName || "") : g === "signature" ? Ke(u.typedSignature || "") : "";
  }
  function lt(r) {
    return !n.profile.persistDrawnSignature || !a.profileData ? "" : r?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function Ee(r) {
    const u = Ke(r?.value || "");
    return u || (a.profileData ? r?.type === "initials" ? Ke(a.profileData.initials || "") || oi(a.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? Ke(a.profileData.typedSignature || "") : "" : "");
  }
  function Qe() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : a.profileRemember;
  }
  async function zt(r = !1) {
    let u = null;
    try {
      await l.clear(a.profileKey);
    } catch (g) {
      u = g;
    } finally {
      a.profileData = null, a.profileRemember = n.profile.rememberByDefault;
    }
    if (u) {
      if (!r && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !r)
        throw u;
      return;
    }
    !r && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Ne(r, u = {}) {
    const g = Qe();
    if (a.profileRemember = g, !g) {
      await zt(!0);
      return;
    }
    if (!r) return;
    const f = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const x = Ke(r.value);
      x && (f.fullName = x, (a.profileData?.initials || "").trim() || (f.initials = oi(x)));
    }
    if (y === "initials") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = u.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Ke(r.value);
        x && (f.initials = x);
      }
    }
    if (y === "signature") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnSignatureDataUrl = u.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Ke(r.value);
        x && (f.typedSignature = x);
      }
    }
    if (!(Object.keys(f).length === 1 && f.remember === !0))
      try {
        const x = await l.save(a.profileKey, f);
        a.profileData = x;
      } catch {
      }
  }
  function ze() {
    const r = document.getElementById("consent-checkbox"), u = document.getElementById("consent-accept-btn");
    r && u && r.addEventListener("change", function() {
      u.disabled = !this.checked;
    });
  }
  function Oe() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Ze() {
    const r = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= r) return;
    const u = [];
    for (a.renderedPages.forEach((g, f) => {
      const y = Math.abs(f - a.currentPage);
      u.push({ pageNum: f, distance: y });
    }), u.sort((g, f) => f.distance - g.distance); a.renderedPages.size > r && u.length > 0; ) {
      const g = u.shift();
      g && g.pageNum !== a.currentPage && a.renderedPages.delete(g.pageNum);
    }
  }
  function et(r) {
    if (a.isLowMemory) return;
    const u = [];
    r > 1 && u.push(r - 1), r < n.pageCount && u.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      u.forEach(async (g) => {
        !a.renderedPages.has(g) && !a.pageRendering && await yt(g);
      });
    }, { timeout: 2e3 });
  }
  async function yt(r) {
    if (!(!a.pdfDoc || a.renderedPages.has(r)))
      try {
        const u = await a.pdfDoc.getPage(r), g = a.zoomLevel, f = u.getViewport({ scale: g * window.devicePixelRatio }), y = document.createElement("canvas"), x = y.getContext("2d");
        y.width = f.width, y.height = f.height;
        const I = {
          canvasContext: x,
          viewport: f
        };
        await u.render(I).promise, a.renderedPages.set(r, {
          canvas: y,
          scale: g,
          timestamp: Date.now()
        }), Ze();
      } catch (u) {
        console.warn("Preload failed for page", r, u);
      }
  }
  function vt() {
    const r = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function dt() {
    const r = document.getElementById("pdf-loading"), u = Date.now();
    try {
      const g = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!g.ok)
        throw new Error("Failed to load document");
      const y = (await g.json()).assets || {}, x = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const I = pdfjsLib.getDocument(x);
      a.pdfDoc = await I.promise, n.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await bt(1), wt(), d.trackViewerLoad(!0, Date.now() - u), d.trackPageView(1);
    } catch (g) {
      console.error("PDF load error:", g), d.trackViewerLoad(!1, Date.now() - u, g.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), yn();
    }
  }
  async function bt(r) {
    if (!a.pdfDoc) return;
    const u = a.renderedPages.get(r);
    if (u && u.scale === a.zoomLevel) {
      $n(u), a.currentPage = r, document.getElementById("current-page").textContent = r, nt(), et(r);
      return;
    }
    a.pageRendering = !0;
    try {
      const g = await a.pdfDoc.getPage(r), f = a.zoomLevel, y = vt(), x = g.getViewport({ scale: f * y }), I = g.getViewport({ scale: 1 });
      S.setPageViewport(r, {
        width: I.width,
        height: I.height,
        rotation: I.rotation || 0
      });
      const $ = document.getElementById("pdf-page-1");
      $.innerHTML = "";
      const H = document.createElement("canvas"), K = H.getContext("2d");
      H.height = x.height, H.width = x.width, H.style.width = `${x.width / y}px`, H.style.height = `${x.height / y}px`, $.appendChild(H);
      const G = document.getElementById("pdf-container");
      G.style.width = `${x.width / y}px`;
      const ve = {
        canvasContext: K,
        viewport: x
      };
      await g.render(ve).promise, a.renderedPages.set(r, {
        canvas: H.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / y,
        displayHeight: x.height / y
      }), a.renderedPages.get(r).canvas.getContext("2d").drawImage(H, 0, 0), Ze(), a.currentPage = r, document.getElementById("current-page").textContent = r, nt(), d.trackPageView(r), et(r);
    } catch (g) {
      console.error("Page render error:", g);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const g = a.pageNumPending;
        a.pageNumPending = null, await bt(g);
      }
    }
  }
  function $n(r, u) {
    const g = document.getElementById("pdf-page-1");
    g.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = r.canvas.width, f.height = r.canvas.height, f.style.width = `${r.displayWidth}px`, f.style.height = `${r.displayHeight}px`, f.getContext("2d").drawImage(r.canvas, 0, 0), g.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${r.displayWidth}px`;
  }
  function tt(r) {
    a.pageRendering ? a.pageNumPending = r : bt(r);
  }
  function nt() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const u = document.getElementById("pdf-container");
    a.fieldState.forEach((g, f) => {
      if (g.page !== a.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = f, g.required && y.classList.add("required"), g.completed && y.classList.add("completed"), a.activeFieldId === f && y.classList.add("active"), g.posX != null && g.posY != null && g.width != null && g.height != null) {
        const I = S.getOverlayStyles(g, u);
        y.style.left = I.left, y.style.top = I.top, y.style.width = I.width, y.style.height = I.height, y.style.transform = I.transform, st.enabled && (y.dataset.debugCoords = JSON.stringify(
          S.pageToScreen(g, u)._debug
        ));
      } else {
        const I = Array.from(a.fieldState.keys()).indexOf(f);
        y.style.left = "10px", y.style.top = `${100 + I * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      if (g.completed && g.signaturePreviewUrl) {
        const I = document.createElement("img");
        I.className = "field-overlay-preview", I.src = g.signaturePreviewUrl, I.alt = Ot(g.type), y.appendChild(I), y.classList.add("has-preview");
      } else {
        const I = document.createElement("span");
        I.className = "field-overlay-label", I.textContent = Ot(g.type), y.appendChild(I);
      }
      y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${Ot(g.type)} field${g.required ? ", required" : ""}${g.completed ? ", completed" : ""}`), y.addEventListener("click", () => St(f)), y.addEventListener("keydown", (I) => {
        (I.key === "Enter" || I.key === " ") && (I.preventDefault(), St(f));
      }), r.appendChild(y);
    });
  }
  function Ot(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function Bn() {
    a.currentPage <= 1 || (tt(a.currentPage - 1), wt());
  }
  function dn() {
    a.currentPage >= n.pageCount || (tt(a.currentPage + 1), wt());
  }
  function Gt(r) {
    r < 1 || r > n.pageCount || (tt(r), wt());
  }
  function wt() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= n.pageCount;
  }
  function le() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), Dt(), tt(a.currentPage);
  }
  function Fn() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), Dt(), tt(a.currentPage);
  }
  function un() {
    const u = document.getElementById("viewer-content").offsetWidth - 32, g = 612;
    a.zoomLevel = u / g, Dt(), tt(a.currentPage);
  }
  function Dt() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function St(r) {
    if (!a.hasConsented && n.fields.some((u) => u.id === r && u.type !== "date_signed")) {
      Kt();
      return;
    }
    Ge(r, { openEditor: !0 });
  }
  function Ge(r, u = { openEditor: !0 }) {
    const g = a.fieldState.get(r);
    if (g) {
      if (u.openEditor && (a.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), g.page !== a.currentPage && Gt(g.page), !u.openEditor) {
        xt(r);
        return;
      }
      g.type !== "date_signed" && Rn(r);
    }
  }
  function xt(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Rn(r) {
    const u = a.fieldState.get(r);
    if (!u) return;
    const g = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = It(u.type), f.innerHTML = Hn(u), x?.classList.toggle("hidden", !(u.type === "signature" || u.type === "initials")), (u.type === "signature" || u.type === "initials") && Wt(r), g.classList.add("active"), g.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Fe(g.querySelector(".field-editor")), ye(`Editing ${It(u.type)}. Press Escape to cancel.`), setTimeout(() => {
      const I = f.querySelector("input, textarea");
      I ? I.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), $e(a.writeCooldownUntil) > 0 && Le($e(a.writeCooldownUntil));
  }
  function It(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function Hn(r) {
    const u = it(r.type), g = Ye(String(r?.id || "")), f = Ye(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", x = Ye(Ee(r)), I = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], $ = Vt(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${I.map((H) => `
            <button
              type="button"
              id="sig-tab-${H.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${$ === H.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${H.id}"
              data-esign-action="signature-tab"
              data-field-id="${g}"
              role="tab"
              aria-selected="${$ === H.id ? "true" : "false"}"
              aria-controls="sig-editor-${H.id}"
              tabindex="${$ === H.id ? "0" : "-1"}"
            >
              ${H.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${$ === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${y}"
              value="${x}"
              data-field-id="${g}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${g}">${x}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${y} will appear as your ${f}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${$ === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${g}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${g}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${g}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${g}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-eraser" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${g}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${y} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${$ === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${g}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${$ === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${y}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${g}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <div id="sig-saved-list" class="space-y-2">
              <p class="text-xs text-gray-500">Loading saved signatures...</p>
            </div>
          </div>

          ${u}
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
          value="${Ye(String(r.value || ""))}"
          data-field-id="${g}"
        />
        ${u}
      `;
    if (r.type === "text") {
      const y = Ye(String(r.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${g}"
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
  function it(r) {
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
  function Mt(r, u) {
    const g = document.getElementById("sig-type-preview"), f = a.fieldState.get(r);
    if (!g || !f) return;
    const y = Ke(String(u || "").trim());
    if (y) {
      g.textContent = y;
      return;
    }
    g.textContent = f.type === "initials" ? "Type your initials" : "Type your signature";
  }
  function Vt(r) {
    const u = String(a.signatureTabByField.get(r) || "").trim();
    return u === "draw" || u === "type" || u === "upload" || u === "saved" ? u : "draw";
  }
  function j(r, u) {
    const g = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    a.signatureTabByField.set(u, g), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${g}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", g !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", g !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", g !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", g !== "saved"), (g === "draw" || g === "upload" || g === "saved") && f && requestAnimationFrame(() => Me(u)), g === "type") {
      const y = document.getElementById("sig-type-input");
      Mt(u, y?.value || "");
    }
    g === "saved" && F(u).catch(re);
  }
  function Wt(r) {
    a.signatureTabByField.set(r, "draw"), j("draw", r);
    const u = document.getElementById("sig-type-input");
    u && Mt(r, u.value || "");
  }
  function Me(r) {
    const u = document.getElementById("sig-draw-canvas");
    if (!u || a.signatureCanvases.has(r)) return;
    const g = u.closest(".signature-canvas-container"), f = u.getContext("2d");
    if (!f) return;
    const y = u.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const x = window.devicePixelRatio || 1;
    u.width = y.width * x, u.height = y.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let I = !1, $ = 0, H = 0, K = [];
    const G = (W) => {
      const te = u.getBoundingClientRect();
      let Ue, ae;
      return W.touches && W.touches.length > 0 ? (Ue = W.touches[0].clientX, ae = W.touches[0].clientY) : W.changedTouches && W.changedTouches.length > 0 ? (Ue = W.changedTouches[0].clientX, ae = W.changedTouches[0].clientY) : (Ue = W.clientX, ae = W.clientY), {
        x: Ue - te.left,
        y: ae - te.top,
        timestamp: Date.now()
      };
    }, ve = (W) => {
      I = !0;
      const te = G(W);
      $ = te.x, H = te.y, K = [{ x: te.x, y: te.y, t: te.timestamp, width: 2.5 }], g && g.classList.add("drawing");
    }, he = (W) => {
      if (!I) return;
      const te = G(W);
      K.push({ x: te.x, y: te.y, t: te.timestamp, width: 2.5 });
      const Ue = te.x - $, ae = te.y - H, Vn = te.timestamp - (K[K.length - 2]?.t || te.timestamp), nn = Math.sqrt(Ue * Ue + ae * ae) / Math.max(Vn, 1), bn = 2.5, de = 1.5, wn = 4, Wn = Math.min(nn / 5, 1), Sn = Math.max(de, Math.min(wn, bn - Wn * 1.5));
      K[K.length - 1].width = Sn, f.lineWidth = Sn, f.beginPath(), f.moveTo($, H), f.lineTo(te.x, te.y), f.stroke(), $ = te.x, H = te.y;
    }, ue = () => {
      if (I = !1, K.length > 1) {
        const W = a.signatureCanvases.get(r);
        W && (W.strokes.push(K.map((te) => ({ ...te }))), W.redoStack = []);
      }
      K = [], g && g.classList.remove("drawing");
    };
    u.addEventListener("mousedown", ve), u.addEventListener("mousemove", he), u.addEventListener("mouseup", ue), u.addEventListener("mouseout", ue), u.addEventListener("touchstart", (W) => {
      W.preventDefault(), W.stopPropagation(), ve(W);
    }, { passive: !1 }), u.addEventListener("touchmove", (W) => {
      W.preventDefault(), W.stopPropagation(), he(W);
    }, { passive: !1 }), u.addEventListener("touchend", (W) => {
      W.preventDefault(), ue();
    }, { passive: !1 }), u.addEventListener("touchcancel", ue), u.addEventListener("gesturestart", (W) => W.preventDefault()), u.addEventListener("gesturechange", (W) => W.preventDefault()), u.addEventListener("gestureend", (W) => W.preventDefault()), a.signatureCanvases.set(r, {
      canvas: u,
      ctx: f,
      dpr: x,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Nn(r);
  }
  function Nn(r) {
    const u = a.signatureCanvases.get(r), g = a.fieldState.get(r);
    if (!u || !g) return;
    const f = lt(g);
    f && Jt(r, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function Jt(r, u, g = { clearStrokes: !1 }) {
    const f = a.signatureCanvases.get(r);
    if (!f) return !1;
    const y = String(u || "").trim();
    if (!y)
      return f.baseImageDataUrl = "", f.baseImage = null, g.clearStrokes && (f.strokes = [], f.redoStack = []), Et(r), !0;
    const { drawWidth: x, drawHeight: I } = f, $ = new Image();
    return await new Promise((H) => {
      $.onload = () => {
        g.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = $, f.baseImageDataUrl = y, x > 0 && I > 0 && Et(r), H(!0);
      }, $.onerror = () => H(!1), $.src = y;
    });
  }
  function Et(r) {
    const u = a.signatureCanvases.get(r);
    if (!u) return;
    const { ctx: g, drawWidth: f, drawHeight: y, baseImage: x, strokes: I } = u;
    if (g.clearRect(0, 0, f, y), x) {
      const $ = Math.min(f / x.width, y / x.height), H = x.width * $, K = x.height * $, G = (f - H) / 2, ve = (y - K) / 2;
      g.drawImage(x, G, ve, H, K);
    }
    for (const $ of I)
      for (let H = 1; H < $.length; H++) {
        const K = $[H - 1], G = $[H];
        g.lineWidth = Number(G.width || 2.5) || 2.5, g.beginPath(), g.moveTo(K.x, K.y), g.lineTo(G.x, G.y), g.stroke();
      }
  }
  function Un(r) {
    const u = a.signatureCanvases.get(r);
    if (!u || u.strokes.length === 0) return;
    const g = u.strokes.pop();
    g && u.redoStack.push(g), Et(r);
  }
  function $t(r) {
    const u = a.signatureCanvases.get(r);
    if (!u || u.redoStack.length === 0) return;
    const g = u.redoStack.pop();
    g && u.strokes.push(g), Et(r);
  }
  function Lt(r) {
    const u = a.signatureCanvases.get(r);
    if (!u) return !1;
    if ((u.baseImageDataUrl || "").trim() || u.strokes.length > 0) return !0;
    const { canvas: g, ctx: f } = u;
    return f.getImageData(0, 0, g.width, g.height).data.some((x, I) => I % 4 === 3 && x > 0);
  }
  function _e(r) {
    const u = a.signatureCanvases.get(r);
    u && (u.strokes = [], u.redoStack = [], u.baseImage = null, u.baseImageDataUrl = "", Et(r));
    const g = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    g && g.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function Bt() {
    const r = document.getElementById("field-editor-overlay"), u = r.querySelector(".field-editor");
    if (tn(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const g = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        g?.focus();
      });
    }
    a.activeFieldId = null, a.signatureCanvases.clear(), ye("Field editor closed.");
  }
  function $e(r) {
    const u = Number(r) || 0;
    return u <= 0 ? 0 : Math.max(0, Math.ceil((u - Date.now()) / 1e3));
  }
  function qn(r, u = {}) {
    const g = Number(u.retry_after_seconds);
    if (Number.isFinite(g) && g > 0)
      return Math.ceil(g);
    const f = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const y = Number(f);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function Be(r, u) {
    let g = {};
    try {
      g = await r.json();
    } catch {
      g = {};
    }
    const f = g?.error || {}, y = f?.details && typeof f.details == "object" ? f.details : {}, x = qn(r, y), I = r?.status === 429, $ = I ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || u || "Request failed"), H = new Error($);
    return H.status = r?.status || 0, H.code = String(f?.code || ""), H.details = y, H.rateLimited = I, H.retryAfterSeconds = x, H;
  }
  function Le(r) {
    const u = Math.max(1, Number(r) || 1);
    a.writeCooldownUntil = Date.now() + u * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const g = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const y = $e(a.writeCooldownUntil);
      if (y <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    g(), a.writeCooldownTimer = setInterval(g, 250);
  }
  function jn(r) {
    const u = Math.max(1, Number(r) || 1);
    a.submitCooldownUntil = Date.now() + u * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const g = () => {
      const f = $e(a.submitCooldownUntil);
      Ve(), f <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    g(), a.submitCooldownTimer = setInterval(g, 250);
  }
  async function pn() {
    const r = a.activeFieldId;
    if (!r) return;
    const u = a.fieldState.get(r);
    if (!u) return;
    const g = $e(a.writeCooldownUntil);
    if (g > 0) {
      const y = `Please wait ${g}s before saving again.`;
      window.toastManager && window.toastManager.error(y), ye(y, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = Qe();
      let y = !1;
      if (u.type === "signature" || u.type === "initials")
        y = await zn(r);
      else if (u.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        y = await Ft(r, null, x?.checked || !1);
      } else {
        const I = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!I && u.required)
          throw new Error("This field is required");
        y = await Ft(r, I, null);
      }
      if (y) {
        Bt(), mn(), Ve(), kt(), nt(), hn(r), xe(r);
        const x = vn();
        x.allRequiredComplete ? ye("Field saved. All required fields complete. Ready to submit.") : ye(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && Le(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), ye(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if ($e(a.writeCooldownUntil) > 0) {
        const y = $e(a.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function zn(r) {
    const u = a.fieldState.get(r), g = document.getElementById("sig-type-input"), f = Vt(r);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = a.signatureCanvases.get(r);
      if (!x) return !1;
      if (!Lt(r))
        throw new Error(u?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const I = x.canvas.toDataURL("image/png");
      return await gn(r, { type: "drawn", dataUrl: I }, u?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = g?.value?.trim();
      if (!x)
        throw new Error(u?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return u.type === "initials" ? await Ft(r, x, null) : await gn(r, { type: "typed", text: x }, x);
    }
  }
  async function Ft(r, u, g) {
    a.pendingSaves.add(r);
    const f = Date.now(), y = a.fieldState.get(r);
    try {
      const x = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: u,
          value_bool: g
        })
      });
      if (!x.ok)
        throw await Be(x, "Failed to save field");
      const I = a.fieldState.get(r);
      return I && (I.value = u ?? g, I.completed = !0, I.hasError = !1), await Ne(I), window.toastManager && window.toastManager.success("Field saved"), d.trackFieldSave(r, I?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = x.message), d.trackFieldSave(r, y?.type, !1, Date.now() - f, x.message), x;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function gn(r, u, g) {
    a.pendingSaves.add(r);
    const f = Date.now(), y = u?.type || "typed";
    try {
      let x;
      if (y === "drawn") {
        const H = await v.uploadDrawnSignature(
          r,
          u.dataUrl
        );
        x = {
          field_instance_id: r,
          type: "drawn",
          value_text: g,
          object_key: H.objectKey,
          sha256: H.sha256,
          upload_token: H.uploadToken
        };
      } else
        x = await Rt(r, g);
      const I = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!I.ok)
        throw await Be(I, "Failed to save signature");
      const $ = a.fieldState.get(r);
      return $ && ($.value = g, $.completed = !0, $.hasError = !1, u?.dataUrl && ($.signaturePreviewUrl = u.dataUrl)), await Ne($, {
        signatureType: y,
        signatureDataUrl: u?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), d.trackSignatureAttach(r, y, !0, Date.now() - f), !0;
    } catch (x) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = x.message), d.trackSignatureAttach(r, y, !1, Date.now() - f, x.message), x;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function Rt(r, u) {
    const g = `${u}|${r}`, f = await Ce(g), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: u,
      object_key: y,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Ce(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const u = new TextEncoder().encode(r), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function mn() {
    let r = 0;
    a.fieldState.forEach(($) => {
      $.required, $.completed && r++;
    });
    const u = a.fieldState.size, g = u > 0 ? r / u * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = u;
    const f = document.getElementById("progress-ring-circle"), y = 97.4, x = y - g / 100 * y;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${g}%`;
    const I = u - r;
    document.getElementById("fields-status").textContent = I > 0 ? `${I} remaining` : "All complete";
  }
  function Ve() {
    const r = document.getElementById("submit-btn"), u = document.getElementById("incomplete-warning"), g = document.getElementById("incomplete-message"), f = $e(a.submitCooldownUntil);
    let y = [], x = !1;
    a.fieldState.forEach(($, H) => {
      $.required && !$.completed && y.push($), $.hasError && (x = !0);
    });
    const I = a.hasConsented && y.length === 0 && !x && a.pendingSaves.size === 0 && f === 0 && !a.isSubmitting;
    r.disabled = !I, !a.isSubmitting && f > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !a.isSubmitting && f === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? f > 0 ? (u.classList.remove("hidden"), g.textContent = `Please wait ${f}s before submitting again.`) : x ? (u.classList.remove("hidden"), g.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (u.classList.remove("hidden"), g.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : u.classList.add("hidden") : (u.classList.remove("hidden"), g.textContent = "Please accept the consent agreement");
  }
  function hn(r) {
    const u = a.fieldState.get(r), g = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!g || !u)) {
      if (u.completed) {
        g.classList.add("completed"), g.classList.remove("error");
        const f = g.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), f.classList.add("bg-green-100", "text-green-600"), f.innerHTML = '<i class="iconoir-check"></i>';
      } else if (u.hasError) {
        g.classList.remove("completed"), g.classList.add("error");
        const f = g.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), f.classList.add("bg-red-100", "text-red-600"), f.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function On() {
    const r = Array.from(a.fieldState.values()).filter((u) => u.required);
    return r.sort((u, g) => {
      const f = Number(u.page || 0), y = Number(g.page || 0);
      if (f !== y) return f - y;
      const x = Number(u.tabIndex || 0), I = Number(g.tabIndex || 0);
      if (x > 0 && I > 0 && x !== I) return x - I;
      if (x > 0 != I > 0) return x > 0 ? -1 : 1;
      const $ = Number(u.posY || 0), H = Number(g.posY || 0);
      if ($ !== H) return $ - H;
      const K = Number(u.posX || 0), G = Number(g.posX || 0);
      return K !== G ? K - G : String(u.id || "").localeCompare(String(g.id || ""));
    }), r;
  }
  function Yt(r) {
    a.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function xe(r) {
    const u = On(), g = u.filter((I) => !I.completed);
    if (g.length === 0) {
      d.track("guided_next_none_remaining", { fromFieldId: r });
      const I = document.getElementById("submit-btn");
      I?.scrollIntoView({ behavior: "smooth", block: "nearest" }), I?.focus(), ye("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const f = u.findIndex((I) => String(I.id) === String(r));
    let y = null;
    if (f >= 0) {
      for (let I = f + 1; I < u.length; I++)
        if (!u[I].completed) {
          y = u[I];
          break;
        }
    }
    if (y || (y = g[0]), !y) return;
    d.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const x = Number(y.page || 1);
    x !== a.currentPage && Gt(x), Ge(y.id, { openEditor: !1 }), Yt(y.id), setTimeout(() => {
      Yt(y.id), xt(y.id), d.track("guided_next_completed", { toFieldId: y.id, page: y.page }), ye(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function Kt() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Fe(r.querySelector(".field-editor")), ye("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Xt() {
    const r = document.getElementById("consent-modal"), u = r.querySelector(".field-editor");
    tn(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ye("Consent dialog closed.");
  }
  async function fn() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const u = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!u.ok)
        throw await Be(u, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Xt(), Ve(), kt(), d.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ye("Consent accepted. You can now complete the fields and submit.");
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message), ye(`Error: ${u.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function Qt() {
    const r = document.getElementById("submit-btn"), u = $e(a.submitCooldownUntil);
    if (u > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${u}s before submitting again.`), Ve();
      return;
    }
    a.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const g = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": g }
      });
      if (!f.ok)
        throw await Be(f, "Failed to submit");
      d.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (g) {
      d.trackSubmit(!1, g.message), g?.rateLimited && jn(g.retryAfterSeconds), window.toastManager && window.toastManager.error(g.message);
    } finally {
      a.isSubmitting = !1, Ve();
    }
  }
  function Zt() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Fe(r.querySelector(".field-editor")), ye("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Ct() {
    const r = document.getElementById("decline-modal"), u = r.querySelector(".field-editor");
    tn(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ye("Decline dialog closed.");
  }
  async function Gn() {
    const r = document.getElementById("decline-reason").value;
    try {
      const u = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!u.ok)
        throw await Be(u, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message);
    }
  }
  function yn() {
    d.trackDegradedMode("viewer_load_failure"), d.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function en() {
    try {
      const r = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!r.ok) throw new Error("Document unavailable");
      const g = (await r.json()).assets || {}, f = g.source_url || g.executed_url || g.certificate_url;
      if (f)
        window.open(f, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (r) {
      window.toastManager && window.toastManager.error(r.message || "Unable to download document");
    }
  }
  const st = {
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
      const r = this.panel.querySelector(".debug-toggle"), u = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (r.textContent = "+", u.style.display = "none") : (r.textContent = "−", u.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const r = a.fieldState;
      let u = 0;
      r?.forEach((f) => {
        f.completed && u++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${u}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
      const g = d.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = g.length > 0 ? `${g.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${g.length > 0 ? "error" : ""}`;
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
          fields: Array.from(a.fieldState?.entries() || []).map(([r, u]) => ({
            id: r,
            type: u.type,
            completed: u.completed,
            hasError: u.hasError
          })),
          telemetry: d.getSessionSummary(),
          errors: d.metrics.errorsEncountered
        }),
        getEvents: () => d.events,
        forceError: (r) => {
          d.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), dt();
        },
        setLowMemory: (r) => {
          a.isLowMemory = r, Ze(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), dt(), this.updatePanel();
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
  function ye(r, u = "polite") {
    const g = u === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    g && (g.textContent = "", requestAnimationFrame(() => {
      g.textContent = r;
    }));
  }
  function Fe(r) {
    const g = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = g[0], y = g[g.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function x(I) {
      I.key === "Tab" && (I.shiftKey ? document.activeElement === f && (I.preventDefault(), y?.focus()) : document.activeElement === y && (I.preventDefault(), f?.focus()));
    }
    r.addEventListener("keydown", x), r._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function tn(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const u = r.dataset.previousFocus;
    if (u) {
      const g = document.getElementById(u);
      requestAnimationFrame(() => {
        g?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function kt() {
    const r = vn(), u = document.getElementById("submit-status");
    u && (r.allRequiredComplete && a.hasConsented ? u.textContent = "All required fields complete. You can now submit." : a.hasConsented ? u.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : u.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function vn() {
    let r = 0, u = 0, g = 0;
    return a.fieldState.forEach((f) => {
      f.required && u++, f.completed && r++, f.required && !f.completed && g++;
    }), {
      completed: r,
      required: u,
      remainingRequired: g,
      total: a.fieldState.size,
      allRequiredComplete: g === 0
    };
  }
  function rt(r, u = 1) {
    const g = Array.from(a.fieldState.keys()), f = g.indexOf(r);
    if (f === -1) return null;
    const y = f + u;
    return y >= 0 && y < g.length ? g[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (Bt(), Xt(), Ct()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const u = Array.from(document.querySelectorAll(".sig-editor-tab")), g = u.indexOf(r.target);
      if (g !== -1) {
        let f = g;
        if (r.key === "ArrowRight" && (f = (g + 1) % u.length), r.key === "ArrowLeft" && (f = (g - 1 + u.length) % u.length), r.key === "Home" && (f = 0), r.key === "End" && (f = u.length - 1), f !== g) {
          r.preventDefault();
          const y = u[f], x = y.getAttribute("data-tab") || "draw", I = y.getAttribute("data-field-id");
          I && j(x, I), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const u = r.target.dataset.fieldId, g = r.key === "ArrowDown" ? 1 : -1, f = rt(u, g);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const u = r.target.dataset.fieldId;
        u && St(u);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class rs {
  constructor(e) {
    this.config = e;
  }
  init() {
    Nr(this.config);
  }
  destroy() {
  }
}
function Oa(i) {
  const e = new rs(i);
  return ee(() => e.init()), e;
}
function Ur() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && ee(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = Ur();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new rs(e);
  t.init(), window.esignSignerReviewController = t;
});
class as {
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
    Tt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Tt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function Ga(i = {}) {
  const e = new as(i);
  return ee(() => e.init()), e;
}
function Va(i = {}) {
  const e = new as(i);
  ee(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class hi {
  constructor(e) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = e, this.elements = {
      loadBtn: m("#pdf-load-btn"),
      retryBtn: m("#pdf-retry-btn"),
      loading: m("#pdf-loading"),
      spinner: m("#pdf-spinner"),
      error: m("#pdf-error"),
      errorMessage: m("#pdf-error-message"),
      viewer: m("#pdf-viewer"),
      canvas: m("#pdf-canvas"),
      pagination: m("#pdf-pagination"),
      prevBtn: m("#pdf-prev-page"),
      nextBtn: m("#pdf-next-page"),
      currentPageEl: m("#pdf-current-page"),
      totalPagesEl: m("#pdf-total-pages"),
      status: m("#pdf-status")
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
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), s && s.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (l) => {
      this.isLoaded && (l.key === "ArrowLeft" || l.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (l.key === "ArrowRight" || l.key === "PageDown") && this.goToPage(this.currentPage + 1));
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
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), l = this.elements.canvas, d = l.getContext("2d");
        if (!d)
          throw new Error("Failed to get canvas context");
        l.height = s.height, l.width = s.width, await n.render({
          canvasContext: d,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: s } = this.elements, l = this.pdfDoc?.numPages || 1;
    s && s.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= l);
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
    e && P(e), t && M(t), n && P(n), s && P(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && P(e), t && P(t), n && P(n), s && M(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: l, viewer: d } = this.elements;
    t && P(t), n && P(n), s && M(s), d && P(d), l && (l.textContent = e);
  }
}
function Wa(i) {
  const e = new hi(i);
  return e.init(), e;
}
function Ja(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new hi(e);
  ee(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && ee(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new hi({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class Ya {
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
class Ka {
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
function qr(i) {
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
function jr(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function zr(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((l) => String(l || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((l) => l !== s)] : n;
}
function Xa(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Qa(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: qr(e.type),
    options: jr(e.options),
    operators: zr(e.operators, e.default_operator)
  })) : [];
}
function Za(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function eo(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function to(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function no(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([d, a]) => `${d}: ${a}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", l = e?.message || `${i} failed`;
    t.error(n ? `${s}${l}: ${n}` : `${s}${l}`);
  }
}
function io(i, e) {
  const t = m(`#${i}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function so(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const ro = {
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
}, Dn = "application/vnd.google-apps.document", fi = "application/vnd.google-apps.spreadsheet", yi = "application/vnd.google-apps.presentation", os = "application/vnd.google-apps.folder", vi = "application/pdf", Or = [Dn, vi], cs = "esign.google.account_id";
function Gr(i) {
  return i.mimeType === Dn;
}
function Vr(i) {
  return i.mimeType === vi;
}
function Ut(i) {
  return i.mimeType === os;
}
function Wr(i) {
  return Or.includes(i.mimeType);
}
function ao(i) {
  return i.mimeType === Dn || i.mimeType === fi || i.mimeType === yi;
}
function Jr(i) {
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
function oo(i) {
  return i.map(Jr);
}
function ls(i) {
  return {
    [Dn]: "Google Doc",
    [fi]: "Google Sheet",
    [yi]: "Google Slides",
    [os]: "Folder",
    [vi]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Yr(i) {
  return Ut(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Gr(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Vr(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === fi ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === yi ? {
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
function Kr(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Xr(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function co(i, e) {
  const t = i.get("account_id");
  if (t)
    return An(t);
  if (e)
    return An(e);
  const n = localStorage.getItem(cs);
  return n ? An(n) : "";
}
function An(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function lo(i) {
  const e = An(i);
  e && localStorage.setItem(cs, e);
}
function uo(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function po(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function go(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function qt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Qr(i) {
  const e = Yr(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function mo(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const l = s === t.length - 1, d = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return l ? `${d}<span class="text-gray-900 font-medium">${qt(n.name)}</span>` : `${d}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${qt(n.name)}</button>`;
  }).join("");
}
function Zr(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, l = Qr(i), d = Ut(i), a = Wr(i), S = d ? "cursor-pointer hover:bg-gray-50" : a ? "cursor-pointer hover:bg-blue-50" : "opacity-60", v = d ? `data-folder-id="${i.id}" data-folder-name="${qt(i.name)}"` : a && t ? `data-file-id="${i.id}" data-file-name="${qt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${S} file-item"
      ${v}
      role="listitem"
      ${a ? 'tabindex="0"' : ""}
    >
      ${l}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${qt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${ls(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Kr(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${Xr(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${a && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function ho(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${qt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((l, d) => Ut(l) && !Ut(d) ? -1 : !Ut(l) && Ut(d) ? 1 : l.name.localeCompare(d.name)).map((l) => Zr(l, { selectable: n })).join("")}
    </div>
  `;
}
function fo(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: ls(i.mimeType)
  };
}
export {
  Ws as AGREEMENT_STATUS_BADGES,
  ss as AgreementFormController,
  hi as DocumentDetailPreviewController,
  mi as DocumentFormController,
  js as ESignAPIClient,
  zs as ESignAPIError,
  cs as GOOGLE_ACCOUNT_STORAGE_KEY,
  Wi as GoogleCallbackController,
  Yi as GoogleDrivePickerController,
  Ji as GoogleIntegrationController,
  Or as IMPORTABLE_MIME_TYPES,
  Qi as IntegrationConflictsController,
  Ki as IntegrationHealthController,
  Xi as IntegrationMappingsController,
  Zi as IntegrationSyncRunsController,
  gi as LandingPageController,
  Dn as MIME_GOOGLE_DOC,
  os as MIME_GOOGLE_FOLDER,
  fi as MIME_GOOGLE_SHEET,
  yi as MIME_GOOGLE_SLIDES,
  vi as MIME_PDF,
  Ya as PanelPaginationBehavior,
  Ka as PanelSearchBehavior,
  ro as STANDARD_GRID_SELECTORS,
  Vi as SignerCompletePageController,
  as as SignerErrorPageController,
  rs as SignerReviewController,
  Ie as announce,
  uo as applyAccountIdToPath,
  Zs as applyDetailFormatters,
  Tr as bootstrapAgreementForm,
  Ja as bootstrapDocumentDetailPreview,
  ja as bootstrapDocumentForm,
  Aa as bootstrapGoogleCallback,
  Da as bootstrapGoogleDrivePicker,
  Ta as bootstrapGoogleIntegration,
  Ha as bootstrapIntegrationConflicts,
  $a as bootstrapIntegrationHealth,
  Fa as bootstrapIntegrationMappings,
  Ua as bootstrapIntegrationSyncRuns,
  Ea as bootstrapLandingPage,
  Ca as bootstrapSignerCompletePage,
  Va as bootstrapSignerErrorPage,
  Nr as bootstrapSignerReview,
  po as buildScopedApiUrl,
  pa as byId,
  Vs as capitalize,
  Gs as createESignClient,
  Ys as createElement,
  so as createSchemaActionCachingRefresh,
  fo as createSelectedFile,
  da as createStatusBadgeElement,
  Sa as createTimeoutController,
  Za as dateTimeCellRenderer,
  Tn as debounce,
  no as defaultActionErrorHandler,
  to as defaultActionSuccessHandler,
  ma as delegate,
  qt as escapeHtml,
  eo as fileSizeCellRenderer,
  sa as formatDate,
  Pn as formatDateTime,
  Xr as formatDriveDate,
  Kr as formatDriveFileSize,
  En as formatFileSize,
  ia as formatPageCount,
  oa as formatRecipientCount,
  aa as formatRelativeTime,
  Xs as formatSizeElements,
  ra as formatTime,
  Qs as formatTimestampElements,
  Oi as getAgreementStatusBadge,
  na as getESignClient,
  Yr as getFileIconConfig,
  ls as getFileTypeName,
  Ks as getPageConfig,
  P as hide,
  za as initAgreementForm,
  er as initDetailFormatters,
  Wa as initDocumentDetailPreview,
  qa as initDocumentForm,
  ka as initGoogleCallback,
  _a as initGoogleDrivePicker,
  Pa as initGoogleIntegration,
  Ra as initIntegrationConflicts,
  Ma as initIntegrationHealth,
  Ba as initIntegrationMappings,
  Na as initIntegrationSyncRuns,
  Ia as initLandingPage,
  La as initSignerCompletePage,
  Ga as initSignerErrorPage,
  Oa as initSignerReview,
  Ut as isFolder,
  Gr as isGoogleDoc,
  ao as isGoogleWorkspaceFile,
  Wr as isImportable,
  Vr as isPDF,
  An as normalizeAccountId,
  Jr as normalizeDriveFile,
  oo as normalizeDriveFiles,
  zr as normalizeFilterOperators,
  jr as normalizeFilterOptions,
  qr as normalizeFilterType,
  ga as on,
  ee as onReady,
  va as poll,
  Qa as prepareFilterFields,
  Xa as prepareGridColumns,
  m as qs,
  Tt as qsa,
  mo as renderBreadcrumb,
  Qr as renderFileIcon,
  Zr as renderFileItem,
  ho as renderFileList,
  Js as renderStatusBadge,
  co as resolveAccountId,
  ba as retry,
  lo as saveAccountId,
  Os as setESignClient,
  fa as setLoading,
  io as setupRefreshButton,
  M as show,
  Gi as sleep,
  ca as snakeToTitle,
  go as syncAccountIdToUrl,
  wa as throttle,
  ha as toggle,
  la as truncate,
  cn as updateDataText,
  ya as updateDataTexts,
  ua as updateStatusBadge,
  xa as withTimeout
};
//# sourceMappingURL=index.js.map

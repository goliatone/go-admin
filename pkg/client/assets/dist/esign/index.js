import { e as Ze } from "../chunks/html-DyksyvcZ.js";
class zs {
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
      const b = await this.listAgreements({ page: t, per_page: n }), v = b.items || b.records || [];
      if (e.push(...v), v.length === 0 || e.length >= b.total)
        break;
      t += 1;
    }
    const d = {};
    for (const b of e) {
      const v = String(b?.status || "").trim().toLowerCase();
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
      throw new Os(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Os extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let pi = null;
function na() {
  if (!pi)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return pi;
}
function Gs(i) {
  pi = i;
}
function Vs(i) {
  const e = new zs(i);
  return Gs(e), e;
}
function Fn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ia(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function qn(i, e) {
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
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), d = Math.round(s / 60), u = Math.round(d / 60), a = Math.round(u / 24), b = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(a) >= 1 ? b.format(a, "day") : Math.abs(u) >= 1 ? b.format(u, "hour") : Math.abs(d) >= 1 ? b.format(d, "minute") : b.format(s, "second");
  } catch {
    return String(i);
  }
}
function oa(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Ws(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function ca(i) {
  return i ? i.split("_").map((e) => Ws(e)).join(" ") : "";
}
function la(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const Js = {
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
function Wi(i) {
  const e = String(i || "").trim().toLowerCase();
  return Js[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Ys(i, e) {
  const t = Wi(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, u = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${d[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${u}${t.label}</span>`;
}
function da(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = Ys(i, e), t.firstElementChild;
}
function ua(i, e, t) {
  const n = Wi(e), s = t?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${d[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const b = i.querySelector(".rounded-full");
    if (b)
      b.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
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
function Pt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function pa(i) {
  return document.getElementById(i);
}
function Ks(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, d] of Object.entries(e))
      d !== void 0 && n.setAttribute(s, d);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function ga(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function ma(i, e, t, n, s) {
  const d = (u) => {
    const a = u.target.closest(e);
    a && i.contains(a) && n.call(a, u, a);
  };
  return i.addEventListener(t, d, s), () => i.removeEventListener(t, d, s);
}
function te(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function D(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function P(i) {
  i && i.classList.add("hidden");
}
function ha(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? D(i) : P(i);
}
function fa(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function yn(i, e, t = document) {
  const n = m(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function ya(i, e = document) {
  for (const [t, n] of Object.entries(i))
    yn(t, n, e);
}
function Xs(i = "[data-esign-page]", e = "data-esign-config") {
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
function Se(i, e = "polite") {
  const t = m(`[aria-live="${e}"]`) || (() => {
    const n = Ks("div", {
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
    maxAttempts: d = 30,
    onProgress: u,
    signal: a
  } = i, b = Date.now();
  let v = 0, E;
  for (; v < d; ) {
    if (a?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - b >= s)
      return {
        result: E,
        attempts: v,
        stopped: !1,
        timedOut: !0
      };
    if (v++, E = await e(), u && u(E, v), t(E))
      return {
        result: E,
        attempts: v,
        stopped: !0,
        timedOut: !1
      };
    await Ji(n, a);
  }
  return {
    result: E,
    attempts: v,
    stopped: !1,
    timedOut: !1
  };
}
async function wa(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: d = !0,
    shouldRetry: u = () => !0,
    onRetry: a,
    signal: b
  } = i;
  let v;
  for (let E = 1; E <= t; E++) {
    if (b?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (T) {
      if (v = T, E >= t || !u(T, E))
        throw T;
      const H = d ? Math.min(n * Math.pow(2, E - 1), s) : n;
      a && a(T, E, H), await Ji(H, b);
    }
  }
  throw v;
}
function Ji(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const s = setTimeout(t, i);
    if (e) {
      const d = () => {
        clearTimeout(s), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", d, { once: !0 });
    }
  });
}
function jn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function ba(i, e) {
  let t = 0, n = null;
  return (...s) => {
    const d = Date.now();
    d - t >= e ? (t = d, i(...s)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...s);
      },
      e - (d - t)
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
  const s = new Promise((d, u) => {
    n = setTimeout(() => {
      u(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, s]);
  } finally {
    clearTimeout(n);
  }
}
class yi {
  constructor(e) {
    this.config = e, this.client = Vs({
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
    yn('count="draft"', e.draft), yn('count="pending"', e.pending), yn('count="completed"', e.completed), yn('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
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
  const e = i || Xs(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new yi(e);
  return te(() => t.init()), t;
}
function Ea(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new yi(t);
  te(() => n.init());
}
typeof document < "u" && te(() => {
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
      const s = String(n.basePath || n.base_path || "/admin"), d = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new yi({ basePath: s, apiBasePath: d }).init();
    }
  }
});
class Yi {
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
      s && (n === e ? D(s) : P(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = m("#artifact-executed"), n = m("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), D(t));
    }
    if (e.source) {
      const t = m("#artifact-source"), n = m("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), D(t));
    }
    if (e.certificate) {
      const t = m("#artifact-certificate"), n = m("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), D(t));
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
  const e = new Yi(i);
  return te(() => e.init()), e;
}
function Ca(i) {
  const e = new Yi(i);
  te(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Qs(i = document) {
  Pt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Fn(t));
  });
}
function Zs(i = document) {
  Pt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = qn(t));
  });
}
function er(i = document) {
  Qs(i), Zs(i);
}
function tr() {
  te(() => {
    er();
  });
}
typeof document < "u" && tr();
const Mi = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Ki {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), d = e.get("state"), u = this.parseOAuthState(d);
    u.account_id || (u.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, s, u) : t ? this.handleSuccess(t, u) : this.handleError("unknown", "No authorization code was received from Google.", u);
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
        D(t);
        break;
      case "success":
        D(n);
        break;
      case "error":
        D(s);
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
    const { errorMessage: s, errorDetail: d, closeBtn: u } = this.elements;
    s && (s.textContent = Mi[e] || Mi.unknown), t && d && (d.textContent = t, D(d)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), d = s.get("state"), a = this.parseOAuthState(d).account_id || s.get("account_id");
      a && n.searchParams.set("account_id", a), window.location.href = n.toString();
    }
  }
}
function ka(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Ki(e);
  return te(() => t.init()), t;
}
function Aa(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new Ki(e);
  te(() => t.init());
}
const ai = "esign.google.account_id", nr = {
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
class Xi {
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
      reauthBtn: d,
      oauthCancelBtn: u,
      disconnectCancelBtn: a,
      disconnectConfirmBtn: b,
      accountIdInput: v,
      oauthModal: E,
      disconnectModal: T
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), d && d.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, T && D(T);
    }), a && a.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, T && P(T);
    }), b && b.addEventListener("click", () => this.disconnect()), u && u.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), v && (v.addEventListener("change", () => {
      this.setCurrentAccountId(v.value, !0);
    }), v.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(v.value, !0));
    }));
    const { accountDropdown: H, connectFirstBtn: F } = this.elements;
    H && H.addEventListener("change", () => {
      H.value === "__new__" ? (H.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(H.value, !0);
    }), F && F.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), T && !T.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, P(T)));
    }), [E, T].forEach((B) => {
      B && B.addEventListener("click", (G) => {
        const V = G.target;
        (V === B || V.getAttribute("aria-hidden") === "true") && (P(B), B === E ? this.cancelOAuthFlow() : B === T && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(ai)
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
      this.currentAccountId ? window.localStorage.setItem(ai, this.currentAccountId) : window.localStorage.removeItem(ai);
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
    t && (t.textContent = e), Se(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: d } = this.elements;
    switch (P(t), P(n), P(s), P(d), e) {
      case "loading":
        D(t);
        break;
      case "disconnected":
        D(n);
        break;
      case "connected":
        D(s);
        break;
      case "error":
        D(d);
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
    const t = (G, V) => {
      for (const K of G)
        if (Object.prototype.hasOwnProperty.call(e, K) && e[K] !== void 0 && e[K] !== null)
          return e[K];
      return V;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), d = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), u = t(["connected", "Connected"], !1), a = t(["degraded", "Degraded"], !1), b = t(["degraded_reason", "DegradedReason"], ""), v = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), T = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let H = t(["is_expired", "IsExpired"], void 0), F = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof H != "boolean" || typeof F != "boolean") && n) {
      const G = new Date(n);
      if (!Number.isNaN(G.getTime())) {
        const V = G.getTime() - Date.now(), K = 5 * 60 * 1e3;
        H = V <= 0, F = V > 0 && V <= K;
      }
    }
    const B = typeof T == "boolean" ? T : (H === !0 || F === !0) && !E;
    return {
      connected: u,
      account_id: d,
      email: v,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: H === !0,
      is_expiring_soon: F === !0,
      can_auto_refresh: E,
      needs_reauthorization: B,
      degraded: a,
      degraded_reason: b
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: d, reauthWarning: u, reauthReason: a } = this.elements;
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
        const s = nr[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, s, d) {
    const { expiryInfo: u, reauthWarning: a, reauthReason: b } = this.elements;
    if (!u) return;
    if (u.classList.remove("text-red-600", "text-amber-600"), u.classList.add("text-gray-500"), !e) {
      u.textContent = "Access token status unknown", a && P(a);
      return;
    }
    const v = new Date(e), E = /* @__PURE__ */ new Date(), T = Math.max(
      1,
      Math.round((v.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? s ? (u.textContent = "Access token expired, but refresh is available and will be applied automatically.", u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), a && P(a)) : (u.textContent = "Access token has expired. Please re-authorize.", u.classList.remove("text-gray-500"), u.classList.add("text-red-600"), a && D(a), b && (b.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), s ? (u.textContent = `Token expires in approximately ${T} minute${T !== 1 ? "s" : ""}. Refresh is available automatically.`, a && P(a)) : (u.textContent = `Token expires in approximately ${T} minute${T !== 1 ? "s" : ""}`, a && D(a), b && (b.textContent = `Your access token will expire in ${T} minute${T !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (u.textContent = `Token valid until ${v.toLocaleDateString()} ${v.toLocaleTimeString()}`, a && P(a)), !d && a && P(a);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (D(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : P(n));
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
      const b = d.email || u || "Default", v = d.status !== "connected" ? ` (${d.status})` : "";
      a.textContent = `${b}${v}`, u === this.currentAccountId && (a.selected = !0), e.appendChild(a);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const d = document.createElement("option");
      d.value = this.currentAccountId, d.textContent = `${this.currentAccountId} (new)`, d.selected = !0, e.appendChild(d);
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
      t && D(t), n && P(n);
      return;
    }
    t && P(t), n && (D(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, d = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, u = t ? "ring-2 ring-blue-500" : "", a = n[e.status] || "bg-white border-gray-200", b = s[e.status] || "bg-gray-100 text-gray-700", v = d[e.status] || e.status, E = e.account_id || "default", T = e.email || (e.account_id ? e.account_id : "Default account");
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(T)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(E)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${b}">
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
      s.addEventListener("click", (d) => {
        const a = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (d) => {
        const a = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !1), this.startOAuthFlow(a);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (d) => {
        const a = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = a, t && D(t);
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
    t && D(t);
    const s = this.resolveOAuthRedirectURI(), d = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = d;
    const u = this.buildGoogleOAuthUrl(s, d);
    if (!u) {
      t && P(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const a = 500, b = 600, v = (window.screen.width - a) / 2, E = (window.screen.height - b) / 2;
    if (this.oauthWindow = window.open(
      u,
      "google_oauth",
      `width=${a},height=${b},left=${v},top=${E},popup=yes`
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
        const s = this.resolveOAuthRedirectURI(), u = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
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
              redirect_uri: s
            })
          }
        );
        if (!a.ok) {
          const b = await a.json();
          throw new Error(b.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (s) {
        console.error("Connect error:", s);
        const d = s instanceof Error ? s.message : "Unknown error";
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
  const e = new Xi(i);
  return te(() => e.init()), e;
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
  }, t = new Xi(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const oi = "esign.google.account_id", Di = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, $i = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Qi {
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
      importBtn: d,
      clearSelectionBtn: u,
      importCancelBtn: a,
      importConfirmBtn: b,
      importForm: v,
      importModal: E,
      viewListBtn: T,
      viewGridBtn: H
    } = this.elements;
    if (e) {
      const B = jn(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (G) => {
        G.key === "Enter" && (G.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), d && d.addEventListener("click", () => this.showImportModal()), u && u.addEventListener("click", () => this.clearSelection()), a && a.addEventListener("click", () => this.hideImportModal()), b && v && v.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const G = B.target;
      (G === E || G.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), T && T.addEventListener("click", () => this.setViewMode("list")), H && H.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (B) => {
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
        window.localStorage.getItem(oi)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, D(e)) : P(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(oi, this.currentAccountId) : window.localStorage.removeItem(oi);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), u = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), b = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], E = Array.isArray(e.owners) ? e.owners : b ? [{ emailAddress: b }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: d,
      webViewLink: u,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && D(t));
    try {
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      let d;
      this.searchQuery ? d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (d += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const u = await fetch(d, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!u.ok)
        throw new Error(`Failed to load files: ${u.status}`);
      const a = await u.json(), b = Array.isArray(a.files) ? a.files.map((v) => this.normalizeDriveFile(v)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...b] : this.currentFiles = b, this.nextPageToken = a.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), Se(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), Se("Error loading files");
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = $i.includes(e.mimeType), s = this.selectedFile?.id === e.id, d = Di[e.mimeType] || Di.default, u = this.getFileIcon(d);
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
          ${u}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${qn(e.modifiedTime)}
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
    const s = n.dataset.fileId, d = n.dataset.isFolder === "true";
    s && (d ? this.navigateToFolder(s) : this.selectFile(s));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), Se(`Selected: ${t.name}`));
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
      previewType: d,
      previewFileId: u,
      previewOwner: a,
      previewModified: b,
      importBtn: v,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && D(e), t && P(t);
      return;
    }
    e && P(e), t && D(t);
    const T = this.selectedFile, H = $i.includes(T.mimeType);
    s && (s.textContent = T.name), d && (d.textContent = this.getMimeTypeLabel(T.mimeType)), u && (u.textContent = T.id), a && T.owners.length > 0 && (a.textContent = T.owners[0].emailAddress || "-"), b && (b.textContent = qn(T.modifiedTime)), v && (H ? (v.removeAttribute("disabled"), v.classList.remove("opacity-50", "cursor-not-allowed")) : (v.setAttribute("disabled", "true"), v.classList.add("opacity-50", "cursor-not-allowed"))), E && T.webViewLink && (E.href = T.webViewLink);
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
    D(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
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
    ).join(""), Pt(".breadcrumb-item", s).forEach((d) => {
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
    e && (this.nextPageToken ? D(e) : P(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? D(t) : P(t)), this.clearSelection(), this.loadFiles();
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
      const d = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = d;
    }
    s && (s.value = ""), e && D(e);
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
      importAgreementTitle: d
    } = this.elements, u = this.selectedFile.id, a = s?.value.trim() || this.selectedFile.name, b = d?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && D(t), n && (n.textContent = "Importing...");
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
          agreement_title: b || void 0
        })
      });
      if (!v.ok) {
        const T = await v.json();
        throw new Error(T.error?.message || "Import failed");
      }
      const E = await v.json();
      this.showToast("Import started successfully", "success"), Se("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (v) {
      console.error("Import error:", v);
      const E = v instanceof Error ? v.message : "Import failed";
      this.showToast(E, "error"), Se(`Error: ${E}`);
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
  const e = new Qi(i);
  return te(() => e.init()), e;
}
function Ma(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new Qi(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class Zi {
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
      const d = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      d.searchParams.set("range", n), s && d.searchParams.set("provider", s);
      const u = await fetch(d.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!u.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const a = await u.json();
        this.healthData = a;
      }
      this.renderHealthData(), Se("Health data refreshed");
    } catch (d) {
      console.error("Failed to load health data:", d), this.healthData = this.generateMockHealthData(n, s), this.renderHealthData();
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
    for (let d = 0; d < e; d++) {
      const u = n[Math.floor(Math.random() * n.length)], a = s[Math.floor(Math.random() * s.length)];
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
    const n = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, d = /* @__PURE__ */ new Date();
    for (let u = e - 1; u >= 0; u--) {
      const a = new Date(d.getTime() - u * 36e5);
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
      const d = s.healthTrend >= 0 ? "+" : "";
      n.textContent = `${d}${s.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: s } = this.elements, d = this.healthData.syncStats;
    e && (e.textContent = `${d.successRate.toFixed(1)}%`), t && (t.textContent = `${d.succeeded} succeeded`), n && (n.textContent = `${d.failed} failed`), s && (s.style.width = `${d.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: s } = this.elements, d = this.healthData.conflictStats;
    if (e && (e.textContent = String(d.pending)), t && (t.textContent = `${d.pending} pending`), n && (n.textContent = `${d.resolvedToday} resolved today`), s) {
      const u = d.trend >= 0 ? "+" : "";
      s.textContent = `${u}${d.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: s } = this.elements, d = this.healthData.retryStats;
    e && (e.textContent = String(d.total)), t && (t.textContent = `${d.recoveryRate}%`), n && (n.textContent = d.avgAttempts.toFixed(1)), s && (s.innerHTML = d.recent.map(
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
      s.addEventListener("click", (d) => this.dismissAlert(d));
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
    const { alertsList: s, noAlerts: d, alertCount: u } = this.elements, a = s?.querySelectorAll(":scope > div").length || 0;
    u && (u.textContent = `${a} active`, a === 0 && (u.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), d && d.classList.remove("hidden")));
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
    const d = document.getElementById(e);
    if (!d) return;
    const u = d.getContext("2d");
    if (!u) return;
    const a = d.width, b = d.height, v = 40, E = a - v * 2, T = b - v * 2;
    u.clearRect(0, 0, a, b);
    const H = t.labels, F = Object.values(t.datasets), B = E / H.length / (F.length + 1), G = Math.max(...F.flat()) || 1;
    H.forEach((V, K) => {
      const re = v + K * E / H.length + B / 2;
      F.forEach((me, ue) => {
        const Ce = me[K] / G * T, wt = re + ue * B, je = b - v - Ce;
        u.fillStyle = n[ue] || "#6b7280", u.fillRect(wt, je, B - 2, Ce);
      }), K % Math.ceil(H.length / 6) === 0 && (u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "center", u.fillText(V, re + F.length * B / 2, b - v + 15));
    }), u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "right";
    for (let V = 0; V <= 4; V++) {
      const K = b - v - V * T / 4, re = Math.round(G * V / 4);
      u.fillText(re.toString(), v - 5, K + 3);
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
function Da(i) {
  const e = new Zi(i);
  return te(() => e.init()), e;
}
function $a(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new Zi(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class es {
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
      refreshBtn: d,
      retryBtn: u,
      addFieldBtn: a,
      addRuleBtn: b,
      validateBtn: v,
      mappingForm: E,
      publishCancelBtn: T,
      publishConfirmBtn: H,
      deleteCancelBtn: F,
      deleteConfirmBtn: B,
      closePreviewBtn: G,
      loadSampleBtn: V,
      runPreviewBtn: K,
      clearPreviewBtn: re,
      previewSourceInput: me,
      searchInput: ue,
      filterStatus: Ce,
      filterProvider: wt,
      mappingModal: je,
      publishModal: $e,
      deleteModal: et,
      previewModal: O
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), d?.addEventListener("click", () => this.loadMappings()), u?.addEventListener("click", () => this.loadMappings()), a?.addEventListener("click", () => this.addSchemaField()), b?.addEventListener("click", () => this.addMappingRule()), v?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (ye) => {
      ye.preventDefault(), this.saveMapping();
    }), T?.addEventListener("click", () => this.closePublishModal()), H?.addEventListener("click", () => this.publishMapping()), F?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), G?.addEventListener("click", () => this.closePreviewModal()), V?.addEventListener("click", () => this.loadSamplePayload()), K?.addEventListener("click", () => this.runPreviewTransform()), re?.addEventListener("click", () => this.clearPreview()), me?.addEventListener("input", jn(() => this.validateSourceJson(), 300)), ue?.addEventListener("input", jn(() => this.renderMappings(), 300)), Ce?.addEventListener("change", () => this.renderMappings()), wt?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ye) => {
      ye.key === "Escape" && (je && !je.classList.contains("hidden") && this.closeModal(), $e && !$e.classList.contains("hidden") && this.closePublishModal(), et && !et.classList.contains("hidden") && this.closeDeleteModal(), O && !O.classList.contains("hidden") && this.closePreviewModal());
    }), [je, $e, et, O].forEach((ye) => {
      ye?.addEventListener("click", (Pe) => {
        const Re = Pe.target;
        (Re === ye || Re.getAttribute("aria-hidden") === "true") && (ye === je ? this.closeModal() : ye === $e ? this.closePublishModal() : ye === et ? this.closeDeleteModal() : ye === O && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Se(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: d } = this.elements;
    switch (P(t), P(n), P(s), P(d), e) {
      case "loading":
        D(t);
        break;
      case "empty":
        D(n);
        break;
      case "error":
        D(s);
        break;
      case "list":
        D(d);
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
    const d = (t?.value || "").toLowerCase(), u = n?.value || "", a = s?.value || "", b = this.mappings.filter((v) => !(d && !v.name.toLowerCase().includes(d) && !v.provider.toLowerCase().includes(d) || u && v.status !== u || a && v.provider !== a));
    if (b.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = b.map(
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
      schemaObjectTypeInput: d,
      schemaVersionInput: u,
      schemaFieldsContainer: a,
      mappingRulesContainer: b
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
    return b?.querySelectorAll(".mapping-rule-row").forEach((T) => {
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
        object_type: d?.value.trim() || "",
        version: u?.value.trim() || void 0,
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
      mappingProviderInput: d,
      schemaObjectTypeInput: u,
      schemaVersionInput: a,
      schemaFieldsContainer: b,
      mappingRulesContainer: v,
      mappingStatusBadge: E,
      formValidationStatus: T
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), d && (d.value = e.provider || "");
    const H = e.external_schema || { object_type: "", fields: [] };
    u && (u.value = H.object_type || ""), a && (a.value = H.version || ""), b && (b.innerHTML = "", (H.fields || []).forEach((F) => b.appendChild(this.createSchemaFieldRow(F)))), v && (v.innerHTML = "", (e.rules || []).forEach((F) => v.appendChild(this.createMappingRuleRow(F)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), P(T);
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
      mappingRulesContainer: d,
      mappingStatusBadge: u,
      formValidationStatus: a
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), d && (d.innerHTML = ""), u && u.classList.add("hidden"), P(a), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), D(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((u) => u.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: d } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), D(n), d?.focus();
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
    const t = this.mappings.find((u) => u.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: d } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), d && (d.textContent = `v${t.version || 1}`), D(n);
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
    this.pendingDeleteId = e, D(this.elements.deleteModal);
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
      }), d = await s.json();
      if (s.ok && d.status === "ok")
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
      D(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, D(t));
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
      const n = !!t.id, s = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, u = await fetch(s, {
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
      previewMappingProvider: d,
      previewObjectType: u,
      previewMappingStatus: a,
      previewSourceInput: b,
      sourceSyntaxError: v
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), d && (d.textContent = t.provider), u && (u.textContent = t.external_schema?.object_type || "-"), a && (a.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), b && (b.value = ""), P(v), D(n), b?.focus();
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
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: d } = this.elements;
    switch (P(t), P(n), P(s), P(d), e) {
      case "empty":
        D(t);
        break;
      case "loading":
        D(n);
        break;
      case "error":
        D(s);
        break;
      case "success":
        D(d);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", d = n.fields || [], u = {}, a = {};
    d.forEach((b) => {
      const v = b.field || "field";
      switch (b.type) {
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
    }), u[s] = a, e && (e.value = JSON.stringify(u, null, 2)), P(t);
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
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, D(t)), null;
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
    }, d = {}, u = {}, a = [];
    return n.forEach((b) => {
      const v = this.resolveSourceValue(e, b.source_object, b.source_field), E = v !== void 0;
      if (s.matched_rules.push({
        source: b.source_field,
        matched: E,
        value: v
      }), !!E)
        switch (b.target_entity) {
          case "participant":
            d[b.target_path] = v;
            break;
          case "agreement":
            u[b.target_path] = v;
            break;
          case "field_definition":
            a.push({ path: b.target_path, value: v });
            break;
        }
    }), Object.keys(d).length > 0 && s.participants.push({
      ...d,
      role: d.role || "signer",
      signing_stage: d.signing_stage || 1
    }), s.agreement = u, s.field_definitions = a, s;
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
          const d = e[s];
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
      previewFields: s,
      fieldsCount: d,
      previewMetadata: u,
      previewRawJson: a,
      previewRulesTbody: b
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
    d && (d.textContent = `(${E.length})`), s && (E.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = E.map(
      (F) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(F.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(F.value))}</span>
          </div>
        `
    ).join(""));
    const T = e.agreement || {}, H = Object.entries(T);
    u && (H.length === 0 ? u.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : u.innerHTML = H.map(
      ([F, B]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(F)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(B))}</span>
          </div>
        `
    ).join("")), a && (a.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((F) => {
      const B = b?.querySelector(`[data-rule-source="${this.escapeHtml(F.source)}"] span`);
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
  const e = new es(i);
  return te(() => e.init()), e;
}
function Fa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new es(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class ts {
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
      filterProvider: d,
      filterEntity: u,
      actionResolveBtn: a,
      actionIgnoreBtn: b,
      cancelResolveBtn: v,
      resolveForm: E,
      conflictDetailModal: T,
      resolveModal: H
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), d?.addEventListener("change", () => this.renderConflicts()), u?.addEventListener("change", () => this.renderConflicts()), a?.addEventListener("click", () => this.openResolveModal("resolved")), b?.addEventListener("click", () => this.openResolveModal("ignored")), v?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (F) => this.submitResolution(F)), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && (H && !H.classList.contains("hidden") ? this.closeResolveModal() : T && !T.classList.contains("hidden") && this.closeConflictDetail());
    }), [T, H].forEach((F) => {
      F?.addEventListener("click", (B) => {
        const G = B.target;
        (G === F || G.getAttribute("aria-hidden") === "true") && (F === T ? this.closeConflictDetail() : F === H && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Se(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: d } = this.elements;
    switch (P(t), P(n), P(s), P(d), e) {
      case "loading":
        D(t);
        break;
      case "empty":
        D(n);
        break;
      case "error":
        D(s);
        break;
      case "list":
        D(d);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((a) => a.status === "pending").length, d = this.conflicts.filter((a) => a.status === "resolved").length, u = this.conflicts.filter((a) => a.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(d)), n && (n.textContent = String(u));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const d = t?.value || "", u = n?.value || "", a = s?.value || "", b = this.conflicts.filter((v) => !(d && v.status !== d || u && v.provider !== u || a && v.entity_kind !== a));
    if (b.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = b.map(
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
    const t = this.conflicts.find((Ce) => Ce.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: d,
      detailStatusBadge: u,
      detailProvider: a,
      detailExternalId: b,
      detailInternalId: v,
      detailBindingId: E,
      detailConflictId: T,
      detailRunId: H,
      detailCreatedAt: F,
      detailVersion: B,
      detailPayload: G,
      resolutionSection: V,
      actionButtons: K,
      detailResolvedAt: re,
      detailResolvedBy: me,
      detailResolution: ue
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), d && (d.textContent = t.entity_kind || "-"), u && (u.innerHTML = this.getStatusBadge(t.status)), a && (a.textContent = t.provider || "-"), b && (b.textContent = t.external_id || "-"), v && (v.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), T && (T.textContent = t.id), H && (H.textContent = t.run_id || "-"), F && (F.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), G)
      try {
        const Ce = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        G.textContent = JSON.stringify(Ce, null, 2);
      } catch {
        G.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (D(V), P(K), re && (re.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), me && (me.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), ue)
        try {
          const Ce = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          ue.textContent = JSON.stringify(Ce, null, 2);
        } catch {
          ue.textContent = t.resolution_json || "{}";
        }
    } else
      P(V), D(K);
    D(n);
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
    n?.reset(), s && (s.value = e), D(t);
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
    let d = {};
    const u = s.get("resolution");
    if (u)
      try {
        d = JSON.parse(u);
      } catch {
        d = { raw: u };
      }
    const a = s.get("notes");
    a && (d.notes = a);
    const b = {
      status: s.get("status"),
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
        body: JSON.stringify(b)
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
  const e = new ts(i);
  return te(() => e.init()), e;
}
function Ha(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ts(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class ns {
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
      refreshBtn: d,
      retryBtn: u,
      closeDetailBtn: a,
      filterProvider: b,
      filterStatus: v,
      filterDirection: E,
      actionResumeBtn: T,
      actionRetryBtn: H,
      actionCompleteBtn: F,
      actionFailBtn: B,
      actionDiagnosticsBtn: G,
      startSyncModal: V,
      runDetailModal: K
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (re) => this.startSync(re)), d?.addEventListener("click", () => this.loadSyncRuns()), u?.addEventListener("click", () => this.loadSyncRuns()), a?.addEventListener("click", () => this.closeRunDetail()), b?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), T?.addEventListener("click", () => this.runAction("resume")), H?.addEventListener("click", () => this.runAction("resume")), F?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), G?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (re) => {
      re.key === "Escape" && (V && !V.classList.contains("hidden") && this.closeStartSyncModal(), K && !K.classList.contains("hidden") && this.closeRunDetail());
    }), [V, K].forEach((re) => {
      re?.addEventListener("click", (me) => {
        const ue = me.target;
        (ue === re || ue.getAttribute("aria-hidden") === "true") && (re === V ? this.closeStartSyncModal() : re === K && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Se(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: d } = this.elements;
    switch (P(t), P(n), P(s), P(d), e) {
      case "loading":
        D(t);
        break;
      case "empty":
        D(n);
        break;
      case "error":
        D(s);
        break;
      case "list":
        D(d);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, d = this.syncRuns.length, u = this.syncRuns.filter(
      (v) => v.status === "running" || v.status === "pending"
    ).length, a = this.syncRuns.filter((v) => v.status === "completed").length, b = this.syncRuns.filter((v) => v.status === "failed").length;
    e && (e.textContent = String(d)), t && (t.textContent = String(u)), n && (n.textContent = String(a)), s && (s.textContent = String(b));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", d = n?.value || "", u = this.syncRuns.filter((a) => !(s && a.status !== s || d && a.direction !== d));
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
    t?.reset(), D(e), document.getElementById("sync-provider")?.focus();
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
    const s = new FormData(t), d = {
      provider: s.get("provider"),
      direction: s.get("direction"),
      mapping_spec_id: s.get("mapping_spec_id"),
      cursor: s.get("cursor") || void 0
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
    const t = this.syncRuns.find((me) => me.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: d,
      detailDirection: u,
      detailStatus: a,
      detailStarted: b,
      detailCompleted: v,
      detailCursor: E,
      detailAttempt: T,
      detailErrorSection: H,
      detailLastError: F,
      detailCheckpoints: B,
      actionResumeBtn: G,
      actionRetryBtn: V,
      actionCompleteBtn: K,
      actionFailBtn: re
    } = this.elements;
    s && (s.textContent = t.id), d && (d.textContent = t.provider), u && (u.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), a && (a.innerHTML = this.getStatusBadge(t.status)), b && (b.textContent = this.formatDate(t.started_at)), v && (v.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), T && (T.textContent = String(t.attempt_count || 1)), t.last_error ? (F && (F.textContent = t.last_error), D(H)) : P(H), G && G.classList.toggle("hidden", t.status !== "running"), V && V.classList.toggle("hidden", t.status !== "failed"), K && K.classList.toggle("hidden", t.status !== "running"), re && re.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), D(n);
    try {
      const me = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (me.ok) {
        const ue = await me.json();
        this.renderCheckpoints(ue.checkpoints || []);
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
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: d } = this.elements, u = e === "resume" ? t : e === "complete" ? s : d, a = e === "resume" ? n : null;
    if (!u) return;
    u.setAttribute("disabled", "true"), a?.setAttribute("disabled", "true");
    const b = u.innerHTML;
    u.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
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
      u.removeAttribute("disabled"), a?.removeAttribute("disabled"), u.innerHTML = b;
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
  const e = new ns(i);
  return te(() => e.init()), e;
}
function Ua(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ns(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const ci = "esign.google.account_id", ir = 25 * 1024 * 1024, sr = 2e3, Bi = 60, gi = "application/vnd.google-apps.document", mi = "application/pdf", Fi = "application/vnd.google-apps.folder", rr = [gi, mi];
class vi {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || ir, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceOriginalNameInput: m("#source_original_name"),
      // Source tabs
      sourceTabs: Pt(".source-tab"),
      sourcePanels: Pt(".source-panel"),
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
      titleInput: d
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (u) => {
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
      refreshBtn: s,
      clearSelectionBtn: d,
      importBtn: u,
      importRetryBtn: a,
      driveAccountDropdown: b
    } = this.elements;
    if (e) {
      const v = jn(() => this.handleSearch(), 300);
      e.addEventListener("input", v);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), b && b.addEventListener("change", () => {
      this.setCurrentAccountId(b.value, this.currentSource === "google");
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
        window.localStorage.getItem(ci)
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
      const { searchInput: s, clearSearchBtn: d } = this.elements;
      s && (s.value = ""), d && P(d), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const d = this.normalizeAccountId(s?.account_id);
      if (n.has(d))
        continue;
      n.add(d);
      const u = document.createElement("option");
      u.value = d;
      const a = String(s?.email || "").trim(), b = String(s?.status || "").trim(), v = a || d || "Default account";
      u.textContent = b && b !== "connected" ? `${v} (${b})` : v, d === this.currentAccountId && (u.selected = !0), e.appendChild(u);
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
      this.currentAccountId ? window.localStorage.setItem(ci, this.currentAccountId) : window.localStorage.removeItem(ci);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, D(e)) : P(e)), t) {
      const s = t.dataset.baseHref || t.getAttribute("href");
      s && t.setAttribute("href", this.applyAccountIdToPath(s));
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
      n.id.replace("panel-", "") === e ? D(n) : P(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), Se(
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: s } = this.elements, d = e?.files?.[0];
    if (d && this.validateFile(d)) {
      if (this.showPreview(d), n && (n.value = ""), s && (s.value = d.name), t && !t.value.trim()) {
        const u = d.name.replace(/\.pdf$/i, "");
        t.value = u;
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
      `File is too large (${Fn(e.size)}). Maximum size is ${Fn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: d, uploadZone: u } = this.elements;
    s && (s.textContent = e.name), d && (d.textContent = Fn(e.size)), t && P(t), n && D(n), u && (u.classList.remove("border-gray-300"), u.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && D(e), t && P(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, D(t));
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
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, d = t?.value.trim().length ?? !1, u = s && d;
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), s = t.get("org_id"), d = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && d.searchParams.set("tenant_id", n), s && d.searchParams.set("org_id", s);
    const u = new FormData();
    u.append("file", e);
    const a = await fetch(d.toString(), {
      method: "POST",
      body: u,
      credentials: "same-origin"
    }), b = await a.json().catch(() => ({}));
    if (!a.ok) {
      const T = b?.error?.message || b?.message || "Upload failed. Please try again.";
      throw new Error(T);
    }
    const v = b?.object_key ? String(b.object_key).trim() : "";
    if (!v)
      throw new Error("Upload failed: missing source object key.");
    const E = b?.source_original_name ? String(b.source_original_name).trim() : b?.original_name ? String(b.original_name).trim() : e.name;
    return {
      objectKey: v,
      sourceOriginalName: E
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: s, sourceOriginalNameInput: d } = this.elements, u = t?.files?.[0];
    if (!(!u || !this.validateFile(u))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const a = await this.uploadSourcePDF(u);
        s && (s.value = a.objectKey), d && (d.value = a.sourceOriginalName || u.name), n?.submit();
      } catch (a) {
        const b = a instanceof Error ? a.message : "Upload failed. Please try again.";
        this.showError(b), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), u = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), b = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], E = Array.isArray(e.owners) ? e.owners : b ? [{ emailAddress: b }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: d,
      webViewLink: u,
      parents: v,
      owners: E
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === gi;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === mi;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Fi;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return rr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === gi ? "Google Document" : t === mi ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Fi ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: s, append: d } = e, { fileList: u } = this.elements;
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
      n ? (a = this.buildScopedAPIURL("/esign/google-drive/search"), a.searchParams.set("q", n), a.searchParams.set("page_size", "20"), s && a.searchParams.set("page_token", s)) : (a = this.buildScopedAPIURL("/esign/google-drive/browse"), a.searchParams.set("page_size", "20"), t && t !== "root" && a.searchParams.set("folder_id", t), s && a.searchParams.set("page_token", s));
      const b = await fetch(a.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), v = await b.json();
      if (!b.ok)
        throw new Error(v.error?.message || "Failed to load files");
      const E = Array.isArray(v.files) ? v.files.map((B) => this.normalizeDriveFile(B)) : [];
      this.nextPageToken = v.next_page_token || null, d ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(d);
      const { resultCount: T, listTitle: H } = this.elements;
      n && T ? (T.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, H && (H.textContent = "Search Results")) : (T && (T.textContent = ""), H && (H.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: F } = this.elements;
      F && (this.nextPageToken ? D(F) : P(F)), Se(`Loaded ${E.length} files`);
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
        `), Se(`Error: ${a instanceof Error ? a.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((s, d) => {
      const u = this.getFileIcon(s), a = this.isImportable(s), b = this.isFolder(s), v = this.selectedFile && this.selectedFile.id === s.id, E = !a && !b;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${v ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${E ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${v}"
          data-file-index="${d}"
          ${E ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${u.bg} flex items-center justify-center flex-shrink-0 ${u.text}">
            ${u.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + qn(s.modifiedTime) : ""}
              ${E ? " • Not importable" : ""}
            </p>
          </div>
          ${b ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((s) => {
      s.addEventListener("click", () => {
        const d = parseInt(s.dataset.fileIndex || "0", 10), u = this.currentFiles[d];
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
    D(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, s) => {
      const d = s === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${s > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${s}" class="breadcrumb-item ${d ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const s = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, s + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: s } = this.elements;
    s && s.querySelectorAll(".file-item").forEach((V) => {
      const K = parseInt(V.dataset.fileIndex || "0", 10);
      this.currentFiles[K].id === e.id ? (V.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), V.setAttribute("aria-selected", "true")) : (V.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), V.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: d,
      filePreview: u,
      importStatus: a,
      previewIcon: b,
      previewTitle: v,
      previewType: E,
      importTypeInfo: T,
      importTypeLabel: H,
      importTypeDesc: F,
      snapshotWarning: B,
      importDocumentTitle: G
    } = this.elements;
    d && P(d), u && D(u), a && P(a), b && (b.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, b.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), v && (v.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && T && (T.className = `p-3 rounded-lg border ${n.bgClass}`, H && (H.textContent = n.label, H.className = `text-xs font-medium ${n.textClass}`), F && (F.textContent = n.desc, F.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? D(B) : P(B))), G && (G.value = e.name || ""), Se(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && D(e), t && P(t), n && P(n), s && s.querySelectorAll(".file-item").forEach((d) => {
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
      t && D(t), this.searchQuery = n, this.loadFiles({ query: n });
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
      importStatusQueued: d,
      importStatusSuccess: u,
      importStatusFailed: a
    } = this.elements;
    switch (t && P(t), n && P(n), s && D(s), d && P(d), u && P(u), a && P(a), e) {
      case "queued":
      case "running":
        d && D(d);
        break;
      case "succeeded":
        u && D(u);
        break;
      case "failed":
        a && D(a);
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
        const d = this.config.routes.integrations || "/admin/esign/integrations/google";
        s.href = this.applyAccountIdToPath(d), D(s);
      } else
        P(s);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: s } = this.elements;
    if (!this.selectedFile || !e) return;
    const d = e.value.trim();
    if (!d) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && P(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
      ), b = await a.json();
      if (!a.ok) {
        const E = b.error?.code || "";
        throw { message: b.error?.message || "Failed to start import", code: E };
      }
      this.currentImportRunId = b.import_run_id, this.pollAttempts = 0;
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), sr);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Bi) {
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
            this.showImportStatus("succeeded"), Se("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const d = n.error?.code || "", u = n.error?.message || "Import failed";
            this.showImportError(u, d), Se("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Bi ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
  const e = new vi(i);
  return te(() => e.init()), e;
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
  }, t = new vi(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function ar(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, s = i.context && typeof i.context == "object" ? i.context : {}, d = String(t.index || "").trim();
  return !e && !d ? null : {
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
      index: d,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && te(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = ar(t);
        n && new vi(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const Le = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, yt = Le.REVIEW, or = {
  [Le.DOCUMENT]: "Details",
  [Le.DETAILS]: "Participants",
  [Le.PARTICIPANTS]: "Fields",
  [Le.FIELDS]: "Placement",
  [Le.PLACEMENT]: "Review"
}, Ee = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, zn = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, hi = /* @__PURE__ */ new Map(), cr = 30 * 60 * 1e3, Ri = {
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
function lr(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function dr(i) {
  const e = i instanceof Error ? i.message : i, t = lr(e);
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
  if (t && Ri[t]) {
    const n = Ri[t];
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
function Hi() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function ur() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function pr() {
  if (!ur())
    throw new Error("PDF preview library unavailable");
}
function gr(i) {
  const e = hi.get(i);
  return e ? Date.now() - e.timestamp > cr ? (hi.delete(i), null) : e : null;
}
function mr(i, e, t) {
  hi.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function hr(i, e = zn.THUMBNAIL_MAX_WIDTH, t = zn.THUMBNAIL_MAX_HEIGHT) {
  await pr();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const d = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, u = d.numPages, a = await d.getPage(1), b = a.getViewport({ scale: 1 }), v = e / b.width, E = t / b.height, T = Math.min(v, E, 1), H = a.getViewport({ scale: T }), F = document.createElement("canvas");
  F.width = H.width, F.height = H.height;
  const B = F.getContext("2d");
  if (!B)
    throw new Error("Failed to get canvas context");
  return await a.render({
    canvasContext: B,
    viewport: H
  }).promise, { dataUrl: F.toDataURL("image/jpeg", 0.8), pageCount: u };
}
class fr {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || zn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || zn.THUMBNAIL_MAX_HEIGHT
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
    const t = e === Le.DOCUMENT || e === Le.DETAILS || e === Le.PARTICIPANTS || e === Le.FIELDS || e === Le.REVIEW;
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
    const d = gr(e);
    if (d) {
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? d.pageCount,
        thumbnailUrl: d.dataUrl,
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
      const u = await this.fetchDocumentPdfUrl(e);
      if (s !== this.requestVersion)
        return;
      const { dataUrl: a, pageCount: b } = await hr(
        u,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      mr(e, a, b), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? b,
        thumbnailUrl: a,
        isLoading: !1,
        error: null
      };
    } catch (u) {
      if (s !== this.requestVersion)
        return;
      const a = u instanceof Error ? u.message : "Failed to load preview", b = dr(a);
      Hi() && console.error("Failed to load document preview:", u), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: a,
        errorMessage: b.message,
        errorSuggestion: b.suggestion,
        errorRetryable: b.isRetryable
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: d, errorState: u, emptyState: a, contentState: b } = this.elements;
    if (e) {
      if (d?.classList.add("hidden"), u?.classList.add("hidden"), a?.classList.add("hidden"), b?.classList.add("hidden"), !this.state.documentId) {
        a?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        d?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        u?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Hi() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      b?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), s && this.state.pageCount && (s.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
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
function yr(i = {}) {
  const e = new fr(i);
  return e.init(), e;
}
function vr() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function wr() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function br(i, e) {
  return {
    id: vr(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Ni(i, e) {
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
function Ui(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function qi(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function is(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function Sr(i, e) {
  const t = is(i, e.definitionId);
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
function xr(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const d of t)
    s.add(d.definitionId);
  for (const [d, u] of n) {
    if (u.page !== e || s.has(d) || i.unlinkedDefinitions.has(d)) continue;
    const a = i.definitionToGroup.get(d);
    if (!a) continue;
    const b = i.groups.get(a);
    if (!b || !b.isActive || !b.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: d,
      type: u.type,
      participantId: u.participantId,
      participantName: u.participantName,
      page: e,
      x: b.templatePosition.x,
      y: b.templatePosition.y,
      width: b.templatePosition.width,
      height: b.templatePosition.height,
      placementSource: Ee.AUTO_LINKED,
      linkGroupId: b.id,
      linkedFromFieldId: b.sourceFieldId
    } };
  }
  return null;
}
const ji = 150, zi = 32;
function se(i) {
  return i == null ? "" : String(i).trim();
}
function ss(i) {
  if (typeof i == "boolean") return i;
  const e = se(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function rs(i) {
  return se(i).toLowerCase();
}
function ge(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(se(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Bn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(se(i));
  return Number.isFinite(t) ? t : e;
}
function Rn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function vt(i, e) {
  const t = ge(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function fn(i, e, t = 1) {
  const n = ge(t, 1), s = ge(i, n);
  return e > 0 ? Rn(s, 1, e) : s > 0 ? s : n;
}
function Ir(i, e, t) {
  const n = ge(t, 1);
  let s = vt(i, n), d = vt(e, n);
  return s <= 0 && (s = 1), d <= 0 && (d = n), d < s ? { start: d, end: s } : { start: s, end: d };
}
function vn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => se(n)) : se(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = ge(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function Hn(i, e) {
  const t = ge(e, 1), n = se(i.participantId ?? i.participant_id), s = vn(i.excludePages ?? i.exclude_pages), d = i.required, u = typeof d == "boolean" ? d : !["0", "false", "off", "no"].includes(se(d).toLowerCase());
  return {
    id: se(i.id),
    type: rs(i.type),
    participantId: n,
    participantTempId: se(i.participantTempId) || n,
    fromPage: vt(i.fromPage ?? i.from_page, t),
    toPage: vt(i.toPage ?? i.to_page, t),
    page: vt(i.page, t),
    excludeLastPage: ss(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: u
  };
}
function Er(i) {
  return {
    id: se(i.id),
    type: rs(i.type),
    participant_id: se(i.participantId),
    from_page: vt(i.fromPage, 0),
    to_page: vt(i.toPage, 0),
    page: vt(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: vn(i.excludePages),
    required: i.required !== !1
  };
}
function Lr(i, e) {
  const t = se(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Cr(i, e) {
  const t = ge(e, 1), n = [];
  return i.forEach((s, d) => {
    const u = Hn(s || {}, t);
    if (u.type === "") return;
    const a = Lr(u, d);
    if (u.type === "initials_each_page") {
      const b = Ir(u.fromPage, u.toPage, t), v = /* @__PURE__ */ new Set();
      vn(u.excludePages).forEach((E) => {
        E <= t && v.add(E);
      }), u.excludeLastPage && v.add(t);
      for (let E = b.start; E <= b.end; E += 1)
        v.has(E) || n.push({
          id: `${a}-initials-${E}`,
          type: "initials",
          page: E,
          participantId: se(u.participantId),
          required: u.required !== !1,
          ruleId: a
          // Phase 3: Track rule ID for link group creation
        });
      return;
    }
    if (u.type === "signature_once") {
      let b = u.page > 0 ? u.page : u.toPage > 0 ? u.toPage : t;
      b <= 0 && (b = 1), n.push({
        id: `${a}-signature-${b}`,
        type: "signature",
        page: b,
        participantId: se(u.participantId),
        required: u.required !== !1,
        ruleId: a
        // Phase 3: Track rule ID for link group creation
      });
    }
  }), n.sort((s, d) => s.page !== d.page ? s.page - d.page : s.id.localeCompare(d.id)), n;
}
function kr(i, e, t, n, s) {
  const d = ge(t, 1);
  let u = i > 0 ? i : 1, a = e > 0 ? e : d;
  u = Rn(u, 1, d), a = Rn(a, 1, d), a < u && ([u, a] = [a, u]);
  const b = /* @__PURE__ */ new Set();
  s.forEach((E) => {
    const T = ge(E, 0);
    T > 0 && b.add(Rn(T, 1, d));
  }), n && b.add(d);
  const v = [];
  for (let E = u; E <= a; E += 1)
    b.has(E) || v.push(E);
  return {
    pages: v,
    rangeStart: u,
    rangeEnd: a,
    excludedPages: Array.from(b).sort((E, T) => E - T),
    isEmpty: v.length === 0
  };
}
function Ar(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const d = e[n], u = e[s - 1];
      d === u ? t.push(String(d)) : u === d + 1 ? t.push(`${d}, ${u}`) : t.push(`${d}-${u}`), n = s;
    }
  return `pages ${t.join(", ")}`;
}
function li(i) {
  const e = i || {};
  return {
    id: se(e.id),
    title: se(e.title || e.name) || "Untitled",
    pageCount: ge(e.page_count ?? e.pageCount, 0),
    compatibilityTier: se(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: se(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function as(i) {
  const e = se(i).toLowerCase();
  if (e === "") return Ee.MANUAL;
  switch (e) {
    case Ee.AUTO:
    case Ee.MANUAL:
    case Ee.AUTO_LINKED:
    case Ee.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function Nn(i, e = 0) {
  const t = i || {}, n = se(t.id) || `fi_init_${e}`, s = se(t.definitionId || t.definition_id || t.field_definition_id) || n, d = ge(t.page ?? t.page_number, 1), u = Bn(t.x ?? t.pos_x, 0), a = Bn(t.y ?? t.pos_y, 0), b = Bn(t.width, ji), v = Bn(t.height, zi);
  return {
    id: n,
    definitionId: s,
    type: se(t.type) || "text",
    participantId: se(t.participantId || t.participant_id),
    participantName: se(t.participantName || t.participant_name) || "Unassigned",
    page: d > 0 ? d : 1,
    x: u >= 0 ? u : 0,
    y: a >= 0 ? a : 0,
    width: b > 0 ? b : ji,
    height: v > 0 ? v : zi,
    placementSource: as(t.placementSource || t.placement_source),
    linkGroupId: se(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: se(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: ss(t.isUnlinked ?? t.is_unlinked)
  };
}
function Oi(i, e = 0) {
  const t = Nn(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: as(t.placementSource),
    link_group_id: se(t.linkGroupId),
    linked_from_field_id: se(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Pr(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), d = /\/v\d+$/i.test(s) ? s : `${s}/v1`, u = `${d}/esign/drafts`, a = !!e.is_edit, b = !!e.create_success, v = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), T = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, H = Array.isArray(e.initial_participants) ? e.initial_participants : [], F = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(c) {
    if (!v) return c;
    const o = c.includes("?") ? "&" : "?";
    return `${c}${o}user_id=${encodeURIComponent(v)}`;
  }
  function G(c = !0) {
    const o = { Accept: "application/json" };
    return c && (o["Content-Type"] = "application/json"), v && (o["X-User-ID"] = v), o;
  }
  const V = 1, K = "esign_wizard_state_v1", re = "esign_wizard_sync", me = 2e3, ue = [1e3, 2e3, 5e3, 1e4, 3e4];
  class Ce {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.state = this.loadFromSession() || this.createInitialState();
    }
    createInitialState() {
      return {
        wizardId: this.generateWizardId(),
        version: V,
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
        const o = sessionStorage.getItem(K);
        if (!o) return null;
        const g = JSON.parse(o);
        return g.version !== V ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(g)) : this.normalizeLoadedState(g);
      } catch (o) {
        return console.error("Failed to load wizard state from session:", o), null;
      }
    }
    normalizeLoadedState(o) {
      if (!o || typeof o != "object")
        return this.createInitialState();
      const g = this.createInitialState(), h = { ...g, ...o }, w = Number.parseInt(String(o.currentStep ?? g.currentStep), 10);
      h.currentStep = Number.isFinite(w) ? Math.min(Math.max(w, 1), yt) : g.currentStep;
      const S = o.document && typeof o.document == "object" ? o.document : {}, k = S.id;
      h.document = {
        id: k == null ? null : String(k).trim() || null,
        title: String(S.title ?? "").trim() || null,
        pageCount: ge(S.pageCount, 0) || null
      };
      const M = o.details && typeof o.details == "object" ? o.details : {};
      h.details = {
        title: String(M.title ?? "").trim(),
        message: String(M.message ?? "")
      }, h.participants = Array.isArray(o.participants) ? o.participants : [], h.fieldDefinitions = Array.isArray(o.fieldDefinitions) ? o.fieldDefinitions : [], h.fieldPlacements = Array.isArray(o.fieldPlacements) ? o.fieldPlacements : [], h.fieldRules = Array.isArray(o.fieldRules) ? o.fieldRules : [];
      const _ = String(o.wizardId ?? "").trim();
      h.wizardId = _ || g.wizardId, h.version = V, h.createdAt = String(o.createdAt ?? g.createdAt), h.updatedAt = String(o.updatedAt ?? g.updatedAt);
      const A = String(o.serverDraftId ?? "").trim();
      return h.serverDraftId = A || null, h.serverRevision = ge(o.serverRevision, 0), h.lastSyncedAt = String(o.lastSyncedAt ?? "").trim() || null, h.syncPending = !!o.syncPending, h;
    }
    migrateState(o) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(K, JSON.stringify(this.state));
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
    markSynced(o, g) {
      this.state.serverDraftId = o, this.state.serverRevision = g, this.state.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.syncPending = !1, this.saveToSession(), this.notifyListeners();
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(K), this.notifyListeners();
    }
    hasResumableState() {
      if (!this.state || typeof this.state != "object") return !1;
      const o = Number.parseInt(String(this.state.currentStep ?? 1), 10), g = String(this.state.document?.id ?? "").trim() !== "", h = Array.isArray(this.state.participants) ? this.state.participants.length : 0, w = String(this.state.details?.title ?? "").trim();
      return Number.isFinite(o) && o > 1 || g || h > 0 || w !== "";
    }
    onStateChange(o) {
      return this.listeners.push(o), () => {
        this.listeners = this.listeners.filter((g) => g !== o);
      };
    }
    notifyListeners() {
      this.listeners.forEach((o) => o(this.state));
    }
    collectFormState() {
      const o = document.getElementById("document_id")?.value || null, g = document.getElementById("selected-document-title")?.textContent?.trim() || null, h = document.getElementById("title"), w = document.getElementById("message"), S = [];
      document.querySelectorAll(".participant-entry").forEach((A) => {
        const C = A.getAttribute("data-participant-id"), U = A.querySelector('input[name*=".name"]')?.value || "", q = A.querySelector('input[name*=".email"]')?.value || "", W = A.querySelector('select[name*=".role"]')?.value || "signer", j = parseInt(A.querySelector(".signing-stage-input")?.value || "1", 10);
        S.push({ tempId: C, name: U, email: q, role: W, signingStage: j });
      });
      const k = [];
      document.querySelectorAll(".field-definition-entry").forEach((A) => {
        const C = A.getAttribute("data-field-definition-id"), U = A.querySelector(".field-type-select")?.value || "signature", q = A.querySelector(".field-participant-select")?.value || "", W = parseInt(A.querySelector('input[name*=".page"]')?.value || "1", 10), j = A.querySelector('input[name*=".required"]')?.checked ?? !0;
        k.push({ tempId: C, type: U, participantTempId: q, page: W, required: j });
      });
      const M = Je(), _ = parseInt(Ge?.value || "0", 10) || null;
      return {
        document: { id: o, title: g, pageCount: _ },
        details: {
          title: h?.value || "",
          message: w?.value || ""
        },
        participants: S,
        fieldDefinitions: k,
        fieldPlacements: L?.fieldInstances || [],
        fieldRules: M
      };
    }
    restoreFormState() {
      const o = this.state;
      if (!o) return;
      if (o.document.id) {
        const w = document.getElementById("document_id"), S = document.getElementById("selected-document"), k = document.getElementById("document-picker"), M = document.getElementById("selected-document-title"), _ = document.getElementById("selected-document-info");
        w && (w.value = o.document.id), M && (M.textContent = o.document.title || "Selected Document"), _ && (_.textContent = o.document.pageCount ? `${o.document.pageCount} pages` : ""), Ge && o.document.pageCount && (Ge.value = String(o.document.pageCount)), S && S.classList.remove("hidden"), k && k.classList.add("hidden");
      }
      const g = document.getElementById("title"), h = document.getElementById("message");
      g && o.details.title && (g.value = o.details.title), h && o.details.message && (h.value = o.details.message);
    }
  }
  class wt {
    constructor(o) {
      this.stateManager = o, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(o) {
      const g = {
        wizard_id: o.wizardId,
        wizard_state: o,
        title: o.details.title || "Untitled Agreement",
        current_step: o.currentStep,
        document_id: o.document.id || null,
        created_by_user_id: v
      }, h = await fetch(B(u), {
        method: "POST",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(g)
      });
      if (!h.ok) {
        const w = await h.json().catch(() => ({}));
        throw new Error(w.error?.message || `HTTP ${h.status}`);
      }
      return h.json();
    }
    async update(o, g, h) {
      const w = {
        expected_revision: h,
        wizard_state: g,
        title: g.details.title || "Untitled Agreement",
        current_step: g.currentStep,
        document_id: g.document.id || null,
        updated_by_user_id: v
      }, S = await fetch(B(`${u}/${o}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(w)
      });
      if (S.status === 409) {
        const k = await S.json().catch(() => ({})), M = new Error("stale_revision");
        throw M.code = "stale_revision", M.currentRevision = k.error?.details?.current_revision, M;
      }
      if (!S.ok) {
        const k = await S.json().catch(() => ({}));
        throw new Error(k.error?.message || `HTTP ${S.status}`);
      }
      return S.json();
    }
    async load(o) {
      const g = await fetch(B(`${u}/${o}`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!g.ok) {
        const h = new Error(`HTTP ${g.status}`);
        throw h.status = g.status, h;
      }
      return g.json();
    }
    async delete(o) {
      const g = await fetch(B(`${u}/${o}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!g.ok && g.status !== 404)
        throw new Error(`HTTP ${g.status}`);
    }
    async list() {
      const o = await fetch(B(`${u}?limit=10`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!o.ok)
        throw new Error(`HTTP ${o.status}`);
      return o.json();
    }
    async sync() {
      const o = this.stateManager.getState();
      if (o.syncPending)
        try {
          let g;
          return o.serverDraftId ? g = await this.update(o.serverDraftId, o, o.serverRevision) : g = await this.create(o), this.stateManager.markSynced(g.id, g.revision), this.retryCount = 0, { success: !0, result: g };
        } catch (g) {
          return g.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: g.currentRevision } : { success: !1, error: g.message };
        }
    }
  }
  class je {
    constructor(o, g, h) {
      this.stateManager = o, this.syncService = g, this.statusUpdater = h, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
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
            const g = this.stateManager.loadFromSession();
            g && (this.stateManager.state = g, this.stateManager.notifyListeners());
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
    broadcastSyncCompleted(o, g) {
      this.channel?.postMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: o,
        revision: g
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
      const g = o && o.keepalive === !0, h = this.stateManager.getState();
      if (!g) {
        await this.performSync();
        return;
      }
      if (h.syncPending && h.serverDraftId) {
        const w = JSON.stringify({
          expected_revision: h.serverRevision,
          wizard_state: h,
          title: h.details.title || "Untitled Agreement",
          current_step: h.currentStep,
          document_id: h.document.id || null,
          updated_by_user_id: v
        });
        try {
          const S = await fetch(B(`${u}/${h.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: G(),
            body: w,
            keepalive: !0
          });
          if (S.status === 409) {
            const A = await S.json().catch(() => ({})), C = Number(A?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(C > 0 ? C : h.serverRevision);
            return;
          }
          if (!S.ok)
            throw new Error(`HTTP ${S.status}`);
          const k = await S.json().catch(() => ({})), M = String(k?.id || k?.draft_id || h.serverDraftId || "").trim(), _ = Number(k?.revision || 0);
          if (M && Number.isFinite(_) && _ > 0) {
            this.stateManager.markSynced(M, _), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(M, _);
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
      const g = await this.syncService.sync();
      this.isSyncing = !1, g.success ? (this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(g.result.id, g.result.revision)) : g.conflict ? (this.statusUpdater("conflict"), this.showConflictDialog(g.currentRevision)) : (this.statusUpdater("error"), this.scheduleRetry());
    }
    scheduleRetry() {
      if (this.retryCount >= ue.length) {
        console.error("Max sync retries reached");
        return;
      }
      const o = ue[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, o);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(o) {
      const g = document.getElementById("conflict-dialog-modal"), h = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = $e(h.updatedAt), document.getElementById("conflict-server-revision").textContent = o, document.getElementById("conflict-server-time").textContent = "newer version", g?.classList.remove("hidden");
    }
  }
  function $e(c) {
    if (!c) return "unknown";
    const o = new Date(c), h = /* @__PURE__ */ new Date() - o, w = Math.floor(h / 6e4), S = Math.floor(h / 36e5), k = Math.floor(h / 864e5);
    return w < 1 ? "just now" : w < 60 ? `${w} minute${w !== 1 ? "s" : ""} ago` : S < 24 ? `${S} hour${S !== 1 ? "s" : ""} ago` : k < 7 ? `${k} day${k !== 1 ? "s" : ""} ago` : o.toLocaleDateString();
  }
  function et(c) {
    const o = document.getElementById("sync-status-indicator"), g = document.getElementById("sync-status-icon"), h = document.getElementById("sync-status-text"), w = document.getElementById("sync-retry-btn");
    if (!(!o || !g || !h))
      switch (o.classList.remove("hidden"), c) {
        case "saved":
          g.className = "w-2 h-2 rounded-full bg-green-500", h.textContent = "Saved", h.className = "text-gray-600", w?.classList.add("hidden");
          break;
        case "saving":
          g.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", h.textContent = "Saving...", h.className = "text-gray-600", w?.classList.add("hidden");
          break;
        case "pending":
          g.className = "w-2 h-2 rounded-full bg-gray-400", h.textContent = "Unsaved changes", h.className = "text-gray-500", w?.classList.add("hidden");
          break;
        case "error":
          g.className = "w-2 h-2 rounded-full bg-amber-500", h.textContent = "Not synced", h.className = "text-amber-600", w?.classList.remove("hidden");
          break;
        case "conflict":
          g.className = "w-2 h-2 rounded-full bg-red-500", h.textContent = "Conflict", h.className = "text-red-600", w?.classList.add("hidden");
          break;
        default:
          o.classList.add("hidden");
      }
  }
  const O = new Ce(), ye = new wt(O), Pe = new je(O, ye, et), Re = yr({
    apiBasePath: d,
    basePath: t
  });
  if (b) {
    const o = O.getState()?.serverDraftId;
    O.clear(), Pe.broadcastStateUpdate(), o && ye.delete(o).catch((g) => {
      console.warn("Failed to delete server draft after successful create:", g);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    Pe.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const c = O.getState();
    if (c.serverDraftId)
      try {
        const o = await ye.load(c.serverDraftId);
        o.wizard_state && (O.state = { ...o.wizard_state, serverDraftId: o.id, serverRevision: o.revision }, O.saveToSession(), window.location.reload());
      } catch (o) {
        console.error("Failed to load server draft:", o);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const c = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    O.state.serverRevision = c, O.state.syncPending = !0, O.saveToSession(), Pe.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function Xt() {
    const c = document.getElementById("resume-dialog-modal"), o = O.getState(), g = String(o?.document?.title || "").trim() || String(o?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = o.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = g, document.getElementById("resume-draft-step").textContent = o.currentStep, document.getElementById("resume-draft-time").textContent = $e(o.updatedAt), c?.classList.remove("hidden");
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), O.restoreFormState(), window._resumeToStep = O.getState().currentStep;
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), O.clear();
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", async () => {
    const c = O.getState();
    if (c.serverDraftId)
      try {
        await ye.delete(c.serverDraftId);
      } catch (o) {
        console.warn("Failed to delete server draft:", o);
      }
    O.clear(), document.getElementById("resume-dialog-modal")?.classList.add("hidden");
  });
  async function Gn() {
    if (a || !O.hasResumableState()) return;
    const c = O.getState(), o = String(c?.serverDraftId || "").trim();
    if (!o) {
      Xt();
      return;
    }
    try {
      const g = await ye.load(o);
      g?.wizard_state && typeof g.wizard_state == "object" && (O.state = { ...g.wizard_state, serverDraftId: g.id, serverRevision: g.revision }, O.saveToSession()), Xt();
    } catch (g) {
      if (Number(g?.status || 0) === 404) {
        O.clear(), Pe.broadcastStateUpdate();
        return;
      }
      Xt();
    }
  }
  Gn();
  function Tt() {
    const c = O.collectFormState();
    O.updateState(c), Pe.scheduleSync(), Pe.broadcastStateUpdate();
  }
  const he = document.getElementById("document_id"), at = document.getElementById("selected-document"), ot = document.getElementById("document-picker"), xe = document.getElementById("document-search"), ct = document.getElementById("document-list"), wn = document.getElementById("change-document-btn"), ze = document.getElementById("selected-document-title"), Oe = document.getElementById("selected-document-info"), Ge = document.getElementById("document_page_count");
  let bt = [];
  function tt(c) {
    return String(c || "").trim().toLowerCase();
  }
  function lt(c) {
    return String(c || "").trim().toLowerCase();
  }
  function dt(c) {
    return tt(c) === "unsupported";
  }
  function Qt() {
    he && (he.value = ""), ze && (ze.textContent = ""), Oe && (Oe.textContent = ""), _t(0), O.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), Re.setDocument(null, null, null);
  }
  function Zt(c = "") {
    const o = "This document cannot be used because its PDF is incompatible with online signing.", g = lt(c);
    return g ? `${o} Reason: ${g}. Select another document or upload a remediated PDF.` : `${o} Select another document or upload a remediated PDF.`;
  }
  function en(c) {
    const o = String(c || "").trim();
    if (o === "") return null;
    const g = bt.find((S) => String(S.id || "").trim() === o);
    if (g) return g;
    const h = z.recentDocuments.find((S) => String(S.id || "").trim() === o);
    if (h) return h;
    const w = z.searchResults.find((S) => String(S.id || "").trim() === o);
    return w || null;
  }
  function tn() {
    const c = en(he?.value || "");
    if (!c) return !0;
    const o = tt(c.compatibilityTier);
    return dt(o) ? (Qt(), I(Zt(c.compatibilityReason || "")), at && at.classList.add("hidden"), ot && ot.classList.remove("hidden"), xe?.focus(), !1) : !0;
  }
  function _t(c) {
    const o = ge(c, 0);
    Ge && (Ge.value = String(o));
  }
  function Vn() {
    const c = (he?.value || "").trim();
    if (!c) return;
    const o = bt.find((g) => String(g.id || "").trim() === c);
    o && (ze.textContent.trim() || (ze.textContent = o.title || "Untitled"), (!Oe.textContent.trim() || Oe.textContent.trim() === "pages") && (Oe.textContent = `${o.pageCount || 0} pages`), _t(o.pageCount || 0), at.classList.remove("hidden"), ot.classList.add("hidden"));
  }
  async function Mt() {
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
        throw await x(o, "Failed to load documents");
      const g = await o.json();
      bt = (Array.isArray(g?.records) ? g.records : Array.isArray(g?.items) ? g.items : []).slice().sort((S, k) => {
        const M = Date.parse(String(
          S?.created_at ?? S?.createdAt ?? S?.updated_at ?? S?.updatedAt ?? ""
        )), _ = Date.parse(String(
          k?.created_at ?? k?.createdAt ?? k?.updated_at ?? k?.updatedAt ?? ""
        )), A = Number.isFinite(M) ? M : 0;
        return (Number.isFinite(_) ? _ : 0) - A;
      }).map((S) => li(S)).filter((S) => S.id !== ""), Dt(bt), Vn();
    } catch (c) {
      const o = y(c?.message || "Failed to load documents", c?.code || "", c?.status || 0);
      ct.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${de(o)}</div>`;
    }
  }
  function Dt(c) {
    if (c.length === 0) {
      ct.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${de(T)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    ct.innerHTML = c.map((g, h) => {
      const w = de(String(g.id || "").trim()), S = de(String(g.title || "").trim()), k = String(ge(g.pageCount, 0)), M = tt(g.compatibilityTier), _ = lt(g.compatibilityReason), A = de(M), C = de(_), q = dt(M) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${h === 0 ? "0" : "-1"}"
              data-document-id="${w}"
              data-document-title="${S}"
              data-document-pages="${k}"
              data-document-compatibility-tier="${A}"
              data-document-compatibility-reason="${C}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${S}</div>
          <div class="text-xs text-gray-500">${k} pages ${q}</div>
        </div>
      </button>
    `;
    }).join("");
    const o = ct.querySelectorAll(".document-option");
    o.forEach((g, h) => {
      g.addEventListener("click", () => bn(g)), g.addEventListener("keydown", (w) => {
        let S = h;
        if (w.key === "ArrowDown")
          w.preventDefault(), S = Math.min(h + 1, o.length - 1);
        else if (w.key === "ArrowUp")
          w.preventDefault(), S = Math.max(h - 1, 0);
        else if (w.key === "Enter" || w.key === " ") {
          w.preventDefault(), bn(g);
          return;
        } else w.key === "Home" ? (w.preventDefault(), S = 0) : w.key === "End" && (w.preventDefault(), S = o.length - 1);
        S !== h && (o[S].focus(), o[S].setAttribute("tabindex", "0"), g.setAttribute("tabindex", "-1"));
      });
    });
  }
  function bn(c) {
    const o = c.getAttribute("data-document-id"), g = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), w = tt(
      c.getAttribute("data-document-compatibility-tier")
    ), S = lt(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (dt(w)) {
      Qt(), I(Zt(S)), xe?.focus();
      return;
    }
    he.value = o, ze.textContent = g, Oe.textContent = `${h} pages`, _t(h), at.classList.remove("hidden"), ot.classList.add("hidden"), oe(), nt(g);
    const k = ge(h, null);
    Re.setDocument(o, g, k);
  }
  function nt(c) {
    const o = document.getElementById("title");
    if (!o || o.value.trim())
      return;
    const h = String(c || "").trim();
    h && (o.value = h, O.updateDetails({
      title: h,
      message: O.getState().details.message || ""
    }));
  }
  function de(c) {
    const o = document.createElement("div");
    return o.textContent = c, o.innerHTML;
  }
  wn && wn.addEventListener("click", () => {
    at.classList.add("hidden"), ot.classList.remove("hidden"), xe?.focus(), Ft();
  });
  const Sn = 300, nn = 5, sn = 10, ut = document.getElementById("document-typeahead"), Te = document.getElementById("document-typeahead-dropdown"), $t = document.getElementById("document-recent-section"), Wn = document.getElementById("document-recent-list"), St = document.getElementById("document-search-section"), Bt = document.getElementById("document-search-list"), it = document.getElementById("document-empty-state"), xn = document.getElementById("document-dropdown-loading"), In = document.getElementById("document-search-loading"), z = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let pt = 0, Ve = null;
  function En(c, o) {
    let g = null;
    return (...h) => {
      g !== null && clearTimeout(g), g = setTimeout(() => {
        c(...h), g = null;
      }, o);
    };
  }
  async function Jn() {
    try {
      const c = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(nn)
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
      const g = await o.json(), h = Array.isArray(g?.records) ? g.records : Array.isArray(g?.items) ? g.items : [];
      z.recentDocuments = h.map((w) => li(w)).filter((w) => w.id !== "").slice(0, nn);
    } catch (c) {
      console.warn("Error loading recent documents:", c);
    }
  }
  async function Ln(c) {
    const o = c.trim();
    if (!o) {
      Ve && (Ve.abort(), Ve = null), z.isSearchMode = !1, z.searchResults = [], ke();
      return;
    }
    const g = ++pt;
    Ve && Ve.abort(), Ve = new AbortController(), z.isLoading = !0, z.isSearchMode = !0, ke();
    try {
      const h = new URLSearchParams({
        q: o,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(sn)
      }), w = await fetch(`${n}/panels/esign_documents?${h}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Ve.signal
      });
      if (g !== pt)
        return;
      if (!w.ok) {
        console.warn("Failed to search documents:", w.status), z.searchResults = [], z.isLoading = !1, ke();
        return;
      }
      const S = await w.json(), k = Array.isArray(S?.records) ? S.records : Array.isArray(S?.items) ? S.items : [];
      z.searchResults = k.map((M) => li(M)).filter((M) => M.id !== "").slice(0, sn);
    } catch (h) {
      if (h?.name === "AbortError")
        return;
      console.warn("Error searching documents:", h), z.searchResults = [];
    } finally {
      g === pt && (z.isLoading = !1, ke());
    }
  }
  const Yn = En(Ln, Sn);
  function Ft() {
    Te && (z.isOpen = !0, z.selectedIndex = -1, Te.classList.remove("hidden"), xe?.setAttribute("aria-expanded", "true"), ct?.classList.add("hidden"), ke());
  }
  function gt() {
    Te && (z.isOpen = !1, z.selectedIndex = -1, Te.classList.add("hidden"), xe?.setAttribute("aria-expanded", "false"), ct?.classList.remove("hidden"));
  }
  function ke() {
    if (Te) {
      if (z.isLoading) {
        xn?.classList.remove("hidden"), $t?.classList.add("hidden"), St?.classList.add("hidden"), it?.classList.add("hidden"), In?.classList.remove("hidden");
        return;
      }
      xn?.classList.add("hidden"), In?.classList.add("hidden"), z.isSearchMode ? ($t?.classList.add("hidden"), z.searchResults.length > 0 ? (St?.classList.remove("hidden"), it?.classList.add("hidden"), xt(Bt, z.searchResults, "search")) : (St?.classList.add("hidden"), it?.classList.remove("hidden"))) : (St?.classList.add("hidden"), z.recentDocuments.length > 0 ? ($t?.classList.remove("hidden"), it?.classList.add("hidden"), xt(Wn, z.recentDocuments, "recent")) : ($t?.classList.add("hidden"), it?.classList.remove("hidden"), it && (it.textContent = "No recent documents")));
    }
  }
  function xt(c, o, g) {
    c && (c.innerHTML = o.map((h, w) => {
      const S = w, k = z.selectedIndex === S, M = de(String(h.id || "").trim()), _ = de(String(h.title || "").trim()), A = String(ge(h.pageCount, 0)), C = tt(h.compatibilityTier), U = lt(h.compatibilityReason), q = de(C), W = de(U), Y = dt(C) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${k ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${k}"
          tabindex="-1"
          data-document-id="${M}"
          data-document-title="${_}"
          data-document-pages="${A}"
          data-document-compatibility-tier="${q}"
          data-document-compatibility-reason="${W}"
          data-typeahead-index="${S}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${_}</div>
            <div class="text-xs text-gray-500">${A} pages ${Y}</div>
          </div>
        </button>
      `;
    }).join(""), c.querySelectorAll(".typeahead-option").forEach((h) => {
      h.addEventListener("click", () => Cn(h));
    }));
  }
  function Cn(c) {
    const o = c.getAttribute("data-document-id"), g = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), w = tt(
      c.getAttribute("data-document-compatibility-tier")
    ), S = lt(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (!o) return;
    if (dt(w)) {
      Qt(), I(Zt(S)), xe?.focus();
      return;
    }
    he.value = o, ze.textContent = g || "", Oe.textContent = `${h} pages`, _t(h), at.classList.remove("hidden"), ot.classList.add("hidden"), gt(), oe(), xe && (xe.value = ""), z.query = "", z.isSearchMode = !1, z.searchResults = [], nt(g);
    const k = ge(h, 0);
    O.updateDocument({
      id: o,
      title: g,
      pageCount: k
    }), Re.setDocument(o, g, k);
  }
  function Rt(c) {
    if (!z.isOpen) {
      (c.key === "ArrowDown" || c.key === "Enter") && (c.preventDefault(), Ft());
      return;
    }
    const o = z.isSearchMode ? z.searchResults : z.recentDocuments, g = o.length - 1;
    switch (c.key) {
      case "ArrowDown":
        c.preventDefault(), z.selectedIndex = Math.min(z.selectedIndex + 1, g), ke(), Ht();
        break;
      case "ArrowUp":
        c.preventDefault(), z.selectedIndex = Math.max(z.selectedIndex - 1, 0), ke(), Ht();
        break;
      case "Enter":
        if (c.preventDefault(), z.selectedIndex >= 0 && z.selectedIndex <= g) {
          const h = o[z.selectedIndex];
          if (h) {
            const w = document.createElement("button");
            w.setAttribute("data-document-id", h.id), w.setAttribute("data-document-title", h.title), w.setAttribute("data-document-pages", String(h.pageCount)), w.setAttribute("data-document-compatibility-tier", String(h.compatibilityTier || "")), w.setAttribute("data-document-compatibility-reason", String(h.compatibilityReason || "")), Cn(w);
          }
        }
        break;
      case "Escape":
        c.preventDefault(), gt();
        break;
      case "Tab":
        gt();
        break;
      case "Home":
        c.preventDefault(), z.selectedIndex = 0, ke(), Ht();
        break;
      case "End":
        c.preventDefault(), z.selectedIndex = g, ke(), Ht();
        break;
    }
  }
  function Ht() {
    if (!Te) return;
    const c = Te.querySelector(`[data-typeahead-index="${z.selectedIndex}"]`);
    c && c.scrollIntoView({ block: "nearest" });
  }
  xe && (xe.addEventListener("input", (c) => {
    const g = c.target.value;
    z.query = g, z.isOpen || Ft(), g.trim() ? (z.isLoading = !0, ke(), Yn(g)) : (z.isSearchMode = !1, z.searchResults = [], ke());
    const h = bt.filter(
      (w) => String(w.title || "").toLowerCase().includes(g.toLowerCase())
    );
    Dt(h);
  }), xe.addEventListener("focus", () => {
    Ft();
  }), xe.addEventListener("keydown", Rt)), document.addEventListener("click", (c) => {
    const o = c.target;
    ut && !ut.contains(o) && gt();
  }), Mt(), Jn();
  const be = document.getElementById("participants-container"), It = document.getElementById("participant-template"), kn = document.getElementById("add-participant-btn");
  let Kn = 0, Nt = 0;
  function rn() {
    return `temp_${Date.now()}_${Kn++}`;
  }
  function Ut(c = {}) {
    const o = It.content.cloneNode(!0), g = o.querySelector(".participant-entry"), h = c.id || rn();
    g.setAttribute("data-participant-id", h);
    const w = g.querySelector(".participant-id-input"), S = g.querySelector('input[name="participants[].name"]'), k = g.querySelector('input[name="participants[].email"]'), M = g.querySelector('select[name="participants[].role"]'), _ = g.querySelector('input[name="participants[].signing_stage"]'), A = g.querySelector(".signing-stage-wrapper"), C = Nt++;
    w.name = `participants[${C}].id`, w.value = h, S.name = `participants[${C}].name`, k.name = `participants[${C}].email`, M.name = `participants[${C}].role`, _ && (_.name = `participants[${C}].signing_stage`), c.name && (S.value = c.name), c.email && (k.value = c.email), c.role && (M.value = c.role), _ && c.signing_stage && (_.value = c.signing_stage);
    const U = () => {
      if (!A || !_) return;
      const q = M.value === "signer";
      A.classList.toggle("hidden", !q), q ? _.value || (_.value = "1") : _.value = "";
    };
    U(), g.querySelector(".remove-participant-btn").addEventListener("click", () => {
      g.remove(), st();
    }), M.addEventListener("change", () => {
      U(), st();
    }), be.appendChild(o);
  }
  kn.addEventListener("click", () => Ut()), H.length > 0 ? H.forEach((c) => {
    Ut({
      id: String(c.id || "").trim(),
      name: String(c.name || "").trim(),
      email: String(c.email || "").trim(),
      role: String(c.role || "signer").trim() || "signer",
      signing_stage: Number(c.signing_stage || c.signingStage || 1) || 1
    });
  }) : Ut();
  const ve = document.getElementById("field-definitions-container"), He = document.getElementById("field-definition-template"), an = document.getElementById("add-field-btn"), We = document.getElementById("add-field-btn-container"), An = document.getElementById("add-field-definition-empty-btn"), Pn = document.getElementById("field-definitions-empty-state"), we = document.getElementById("field-rules-container"), Tn = document.getElementById("field-rule-template"), on = document.getElementById("add-field-rule-btn"), cn = document.getElementById("field-rules-empty-state"), ln = document.getElementById("field-rules-preview"), dn = document.getElementById("field_rules_json"), Et = document.getElementById("field_placements_json");
  let mt = 0, _n = 0, un = 0;
  function Mn() {
    return `temp_field_${Date.now()}_${mt++}`;
  }
  function Xn() {
    return `rule_${Date.now()}_${un}`;
  }
  function Ne() {
    const c = be.querySelectorAll(".participant-entry"), o = [];
    return c.forEach((g) => {
      const h = g.getAttribute("data-participant-id"), w = g.querySelector('select[name*=".role"]'), S = g.querySelector('input[name*=".name"]'), k = g.querySelector('input[name*=".email"]');
      w.value === "signer" && o.push({
        id: h,
        name: S.value || k.value || "Signer",
        email: k.value
      });
    }), o;
  }
  function pn(c, o) {
    const g = String(c || "").trim();
    return g && o.some((h) => h.id === g) ? g : o.length === 1 ? o[0].id : "";
  }
  function qt(c, o, g = "") {
    if (!c) return;
    const h = pn(g, o);
    c.innerHTML = '<option value="">Select signer...</option>', o.forEach((w) => {
      const S = document.createElement("option");
      S.value = w.id, S.textContent = w.name, c.appendChild(S);
    }), c.value = h;
  }
  function Qn(c = Ne()) {
    const o = ve.querySelectorAll(".field-participant-select"), g = we ? we.querySelectorAll(".field-rule-participant-select") : [];
    o.forEach((h) => {
      qt(h, c, h.value);
    }), g.forEach((h) => {
      qt(h, c, h.value);
    });
  }
  function st() {
    const c = Ne();
    Qn(c), oe();
  }
  function Ie() {
    const c = ge(Ge?.value || "0", 0);
    if (c > 0) return c;
    const o = String(Oe?.textContent || "").match(/(\d+)\s+pages?/i);
    if (o) {
      const g = ge(o[1], 0);
      if (g > 0) return g;
    }
    return 1;
  }
  function jt() {
    if (!we || !cn) return;
    const c = we.querySelectorAll(".field-rule-entry");
    cn.classList.toggle("hidden", c.length > 0);
  }
  function Je() {
    if (!we) return [];
    const c = Ie(), o = we.querySelectorAll(".field-rule-entry"), g = [];
    return o.forEach((h) => {
      const w = Hn({
        id: h.getAttribute("data-field-rule-id") || "",
        type: h.querySelector(".field-rule-type-select")?.value || "",
        participantId: h.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: h.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: h.querySelector(".field-rule-to-page-input")?.value || "",
        page: h.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!h.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: vn(h.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (h.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, c);
      w.type && g.push(w);
    }), g;
  }
  function Dn() {
    return Je().map((c) => Er(c));
  }
  function Be(c, o) {
    return Cr(c, o);
  }
  function oe() {
    if (!ln) return;
    const c = Je(), o = Ie(), g = Be(c, o), h = Ne(), w = new Map(h.map((_) => [String(_.id), _.name]));
    if (dn && (dn.value = JSON.stringify(Dn())), !g.length) {
      ln.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const S = g.reduce((_, A) => {
      const C = A.type;
      return _[C] = (_[C] || 0) + 1, _;
    }, {}), k = g.slice(0, 8).map((_) => {
      const A = w.get(String(_.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${_.type === "initials" ? "Initials" : "Signature"} on page ${_.page}</span><span class="text-gray-500">${de(String(A))}</span></li>`;
    }).join(""), M = g.length - 8;
    ln.innerHTML = `
      <p class="text-gray-700">${g.length} generated field${g.length !== 1 ? "s" : ""} (${S.initials || 0} initials, ${S.signature || 0} signatures)</p>
      <ul class="space-y-1">${k}</ul>
      ${M > 0 ? `<p class="text-gray-500">+${M} more</p>` : ""}
    `;
  }
  function zt() {
    const c = Ne(), o = new Map(c.map((A) => [String(A.id), A.name || A.email || "Signer"])), g = [];
    ve.querySelectorAll(".field-definition-entry").forEach((A) => {
      const C = String(A.getAttribute("data-field-definition-id") || "").trim(), U = A.querySelector(".field-type-select"), q = A.querySelector(".field-participant-select"), W = A.querySelector('input[name*=".page"]'), j = String(U?.value || "text").trim() || "text", Y = String(q?.value || "").trim(), ee = parseInt(String(W?.value || "1"), 10) || 1;
      g.push({
        definitionId: C,
        fieldType: j,
        participantId: Y,
        participantName: o.get(Y) || "Unassigned",
        page: ee
      });
    });
    const w = Be(Je(), Ie()), S = /* @__PURE__ */ new Map();
    w.forEach((A) => {
      const C = String(A.ruleId || "").trim(), U = String(A.id || "").trim();
      if (C && U) {
        const q = S.get(C) || [];
        q.push(U), S.set(C, q);
      }
    });
    let k = L.linkGroupState;
    S.forEach((A, C) => {
      if (A.length > 1 && !L.linkGroupState.groups.get(`rule_${C}`)) {
        const q = br(A, `Rule ${C}`);
        q.id = `rule_${C}`, k = Ni(k, q);
      }
    }), L.linkGroupState = k, w.forEach((A) => {
      const C = String(A.id || "").trim();
      if (!C) return;
      const U = String(A.participantId || "").trim(), q = parseInt(String(A.page || "1"), 10) || 1, W = String(A.ruleId || "").trim();
      g.push({
        definitionId: C,
        fieldType: String(A.type || "text").trim() || "text",
        participantId: U,
        participantName: o.get(U) || "Unassigned",
        page: q,
        linkGroupId: W ? `rule_${W}` : void 0
      });
    });
    const M = /* @__PURE__ */ new Set(), _ = g.filter((A) => {
      const C = String(A.definitionId || "").trim();
      return !C || M.has(C) ? !1 : (M.add(C), !0);
    });
    return _.sort((A, C) => A.page !== C.page ? A.page - C.page : A.definitionId.localeCompare(C.definitionId)), _;
  }
  function Ot(c) {
    const o = c.querySelector(".field-rule-type-select"), g = c.querySelector(".field-rule-range-start-wrap"), h = c.querySelector(".field-rule-range-end-wrap"), w = c.querySelector(".field-rule-page-wrap"), S = c.querySelector(".field-rule-exclude-last-wrap"), k = c.querySelector(".field-rule-exclude-pages-wrap"), M = c.querySelector(".field-rule-summary"), _ = c.querySelector(".field-rule-from-page-input"), A = c.querySelector(".field-rule-to-page-input"), C = c.querySelector(".field-rule-page-input"), U = c.querySelector(".field-rule-exclude-last-input"), q = c.querySelector(".field-rule-exclude-pages-input"), W = Ie(), j = Hn({
      type: o?.value || "",
      fromPage: _?.value || "",
      toPage: A?.value || "",
      page: C?.value || "",
      excludeLastPage: !!U?.checked,
      excludePages: vn(q?.value || ""),
      required: !0
    }, W), Y = j.fromPage > 0 ? j.fromPage : 1, ee = j.toPage > 0 ? j.toPage : W, ce = j.page > 0 ? j.page : j.toPage > 0 ? j.toPage : W, pe = j.excludeLastPage, fe = j.excludePages.join(","), ne = o?.value === "initials_each_page";
    if (g.classList.toggle("hidden", !ne), h.classList.toggle("hidden", !ne), S.classList.toggle("hidden", !ne), k.classList.toggle("hidden", !ne), w.classList.toggle("hidden", ne), _ && (_.value = String(Y)), A && (A.value = String(ee)), C && (C.value = String(ce)), q && (q.value = fe), U && (U.checked = pe), ne) {
      const le = kr(
        Y,
        ee,
        W,
        pe,
        j.excludePages
      ), Qe = Ar(le);
      le.isEmpty ? M.textContent = `Warning: No initials fields will be generated ${Qe}.` : M.textContent = `Generates initials fields on ${Qe}.`;
    } else
      M.textContent = `Generates one signature field on page ${ce}.`;
  }
  function gn(c = {}) {
    if (!Tn || !we) return;
    const o = Tn.content.cloneNode(!0), g = o.querySelector(".field-rule-entry"), h = c.id || Xn(), w = un++, S = Ie();
    g.setAttribute("data-field-rule-id", h);
    const k = g.querySelector(".field-rule-id-input"), M = g.querySelector(".field-rule-type-select"), _ = g.querySelector(".field-rule-participant-select"), A = g.querySelector(".field-rule-from-page-input"), C = g.querySelector(".field-rule-to-page-input"), U = g.querySelector(".field-rule-page-input"), q = g.querySelector(".field-rule-required-select"), W = g.querySelector(".field-rule-exclude-last-input"), j = g.querySelector(".field-rule-exclude-pages-input"), Y = g.querySelector(".remove-field-rule-btn");
    k.name = `field_rules[${w}].id`, k.value = h, M.name = `field_rules[${w}].type`, _.name = `field_rules[${w}].participant_id`, A.name = `field_rules[${w}].from_page`, C.name = `field_rules[${w}].to_page`, U.name = `field_rules[${w}].page`, q.name = `field_rules[${w}].required`, W.name = `field_rules[${w}].exclude_last_page`, j.name = `field_rules[${w}].exclude_pages`;
    const ee = Hn(c, S);
    M.value = ee.type || "initials_each_page", qt(_, Ne(), ee.participantId), A.value = String(ee.fromPage > 0 ? ee.fromPage : 1), C.value = String(ee.toPage > 0 ? ee.toPage : S), U.value = String(ee.page > 0 ? ee.page : S), q.value = ee.required ? "1" : "0", W.checked = ee.excludeLastPage, j.value = ee.excludePages.join(",");
    const ce = () => {
      Ot(g), oe(), Xe();
    }, pe = () => {
      const ne = Ie();
      if (A) {
        const le = parseInt(A.value, 10);
        Number.isFinite(le) && (A.value = String(fn(le, ne, 1)));
      }
      if (C) {
        const le = parseInt(C.value, 10);
        Number.isFinite(le) && (C.value = String(fn(le, ne, 1)));
      }
      if (U) {
        const le = parseInt(U.value, 10);
        Number.isFinite(le) && (U.value = String(fn(le, ne, 1)));
      }
    }, fe = () => {
      pe(), ce();
    };
    M.addEventListener("change", ce), _.addEventListener("change", ce), A.addEventListener("input", fe), A.addEventListener("change", fe), C.addEventListener("input", fe), C.addEventListener("change", fe), U.addEventListener("input", fe), U.addEventListener("change", fe), q.addEventListener("change", ce), W.addEventListener("change", () => {
      const ne = Ie();
      if (W.checked) {
        const le = Math.max(1, ne - 1);
        C.value = String(le);
      } else
        C.value = String(ne);
      ce();
    }), j.addEventListener("input", ce), Y.addEventListener("click", () => {
      g.remove(), jt(), oe(), Xe();
    }), we.appendChild(o), Ot(we.lastElementChild), jt(), oe();
  }
  function Lt(c = {}) {
    const o = He.content.cloneNode(!0), g = o.querySelector(".field-definition-entry"), h = c.id || Mn();
    g.setAttribute("data-field-definition-id", h);
    const w = g.querySelector(".field-definition-id-input"), S = g.querySelector('select[name="field_definitions[].type"]'), k = g.querySelector('select[name="field_definitions[].participant_id"]'), M = g.querySelector('input[name="field_definitions[].page"]'), _ = g.querySelector('input[name="field_definitions[].required"]'), A = g.querySelector(".field-date-signed-info"), C = _n++;
    w.name = `field_instances[${C}].id`, w.value = h, S.name = `field_instances[${C}].type`, k.name = `field_instances[${C}].participant_id`, M.name = `field_instances[${C}].page`, _.name = `field_instances[${C}].required`, c.type && (S.value = c.type), c.page && (M.value = String(fn(c.page, Ie(), 1))), c.required !== void 0 && (_.checked = c.required);
    const U = String(c.participant_id || c.participantId || "").trim();
    qt(k, Ne(), U), S.addEventListener("change", () => {
      S.value === "date_signed" ? A.classList.remove("hidden") : A.classList.add("hidden");
    }), S.value === "date_signed" && A.classList.remove("hidden"), g.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      g.remove(), Gt();
    });
    const q = g.querySelector('input[name*=".page"]'), W = () => {
      q && (q.value = String(fn(q.value, Ie(), 1)));
    };
    W(), q?.addEventListener("input", W), q?.addEventListener("change", W), ve.appendChild(o), Gt();
  }
  function Gt() {
    ve.querySelectorAll(".field-definition-entry").length === 0 ? (Pn.classList.remove("hidden"), We?.classList.add("hidden")) : (Pn.classList.add("hidden"), We?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    st();
  }).observe(be, { childList: !0, subtree: !0 }), be.addEventListener("change", (c) => {
    (c.target.matches('select[name*=".role"]') || c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && st();
  }), be.addEventListener("input", (c) => {
    (c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && st();
  }), an.addEventListener("click", () => Lt()), An.addEventListener("click", () => Lt()), on?.addEventListener("click", () => gn({ to_page: Ie() })), window._initialFieldPlacementsData = [], F.forEach((c) => {
    const o = String(c.id || "").trim();
    if (!o) return;
    const g = String(c.type || "signature").trim() || "signature", h = String(c.participant_id || c.participantId || "").trim(), w = Number(c.page || 1) || 1, S = !!c.required;
    Lt({
      id: o,
      type: g,
      participant_id: h,
      page: w,
      required: S
    }), window._initialFieldPlacementsData.push(Nn({
      id: o,
      definitionId: o,
      type: g,
      participantId: h,
      participantName: String(c.participant_name || c.participantName || "").trim(),
      page: w,
      x: Number(c.x || c.pos_x || 0) || 0,
      y: Number(c.y || c.pos_y || 0) || 0,
      width: Number(c.width || 150) || 150,
      height: Number(c.height || 32) || 32,
      placementSource: String(c.placement_source || c.placementSource || Ee.MANUAL).trim() || Ee.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), Gt(), st(), jt(), oe();
  const l = document.getElementById("agreement-form"), p = document.getElementById("submit-btn"), f = document.getElementById("form-announcements");
  function y(c, o = "", g = 0) {
    const h = String(o || "").trim().toUpperCase(), w = String(c || "").trim().toLowerCase();
    return h === "SCOPE_DENIED" || w.includes("scope denied") ? "You don't have access to this organization's resources." : h === "TRANSPORT_SECURITY" || h === "TRANSPORT_SECURITY_REQUIRED" || w.includes("tls transport required") || Number(g) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : h === "PDF_UNSUPPORTED" || w === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(c || "").trim() !== "" ? String(c).trim() : "Something went wrong. Please try again.";
  }
  async function x(c, o) {
    const g = Number(c?.status || 0);
    let h = "", w = "";
    try {
      const S = await c.json();
      h = String(S?.error?.code || S?.code || "").trim(), w = String(S?.error?.message || S?.message || "").trim();
    } catch {
      w = "";
    }
    return w === "" && (w = o || `Request failed (${g || "unknown"})`), {
      status: g,
      code: h,
      message: y(w, h, g)
    };
  }
  function I(c, o = "", g = 0) {
    const h = y(c, o, g);
    f && (f.textContent = h), window.toastManager ? window.toastManager.error(h) : alert(h);
  }
  function $() {
    const c = [];
    be.querySelectorAll(".participant-entry").forEach((w) => {
      const S = String(w.getAttribute("data-participant-id") || "").trim(), k = String(w.querySelector('input[name*=".name"]')?.value || "").trim(), M = String(w.querySelector('input[name*=".email"]')?.value || "").trim(), _ = String(w.querySelector('select[name*=".role"]')?.value || "signer").trim(), A = String(w.querySelector(".signing-stage-input")?.value || "").trim(), C = Number(A || "1") || 1;
      c.push({
        id: S,
        name: k,
        email: M,
        role: _,
        signing_stage: _ === "signer" ? C : 0
      });
    });
    const o = [];
    ve.querySelectorAll(".field-definition-entry").forEach((w) => {
      const S = String(w.getAttribute("data-field-definition-id") || "").trim(), k = String(w.querySelector(".field-type-select")?.value || "signature").trim(), M = String(w.querySelector(".field-participant-select")?.value || "").trim(), _ = Number(w.querySelector('input[name*=".page"]')?.value || "1") || 1, A = !!w.querySelector('input[name*=".required"]')?.checked;
      S && o.push({
        id: S,
        type: k,
        participant_id: M,
        page: _,
        required: A
      });
    });
    const g = [];
    L && Array.isArray(L.fieldInstances) && L.fieldInstances.forEach((w, S) => {
      g.push(Oi(w, S));
    });
    const h = JSON.stringify(g);
    return Et && (Et.value = h), {
      document_id: String(he?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: c,
      field_instances: o,
      field_placements: g,
      field_placements_json: h,
      field_rules: Dn(),
      field_rules_json: String(dn?.value || "[]"),
      send_for_signature: N === yt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(Ge?.value || "0") || 0
    };
  }
  function R() {
    const c = Ne(), o = /* @__PURE__ */ new Map();
    return c.forEach((w) => {
      o.set(w.id, !1);
    }), ve.querySelectorAll(".field-definition-entry").forEach((w) => {
      const S = w.querySelector(".field-type-select"), k = w.querySelector(".field-participant-select"), M = w.querySelector('input[name*=".required"]');
      S?.value === "signature" && k?.value && M?.checked && o.set(k.value, !0);
    }), Be(Je(), Ie()).forEach((w) => {
      w.type === "signature" && w.participantId && w.required && o.set(w.participantId, !0);
    }), c.filter((w) => !o.get(w.id));
  }
  function X(c) {
    if (!Array.isArray(c) || c.length === 0)
      return "Each signer requires at least one required signature field.";
    const o = c.map((g) => g?.name?.trim()).filter((g) => !!g);
    return o.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${o.join(", ")}`;
  }
  l.addEventListener("submit", function(c) {
    if (oe(), !he.value) {
      c.preventDefault(), I("Please select a document"), xe.focus();
      return;
    }
    if (!tn()) {
      c.preventDefault();
      return;
    }
    const o = be.querySelectorAll(".participant-entry");
    if (o.length === 0) {
      c.preventDefault(), I("Please add at least one participant"), kn.focus();
      return;
    }
    let g = !1;
    if (o.forEach((C) => {
      C.querySelector('select[name*=".role"]').value === "signer" && (g = !0);
    }), !g) {
      c.preventDefault(), I("At least one signer is required");
      const C = o[0]?.querySelector('select[name*=".role"]');
      C && C.focus();
      return;
    }
    const h = ve.querySelectorAll(".field-definition-entry"), w = R();
    if (w.length > 0) {
      c.preventDefault(), I(X(w)), Ct(Le.FIELDS), an.focus();
      return;
    }
    let S = !1;
    if (h.forEach((C) => {
      C.querySelector(".field-participant-select").value || (S = !0);
    }), S) {
      c.preventDefault(), I("Please assign all fields to a signer");
      const C = ve.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      C && C.focus();
      return;
    }
    if (Je().some((C) => !C.participantId)) {
      c.preventDefault(), I("Please assign all automation rules to a signer"), Array.from(we?.querySelectorAll(".field-rule-participant-select") || []).find((U) => !U.value)?.focus();
      return;
    }
    const _ = !!l.querySelector('input[name="save_as_draft"]'), A = N === yt && !_;
    if (A) {
      let C = l.querySelector('input[name="send_for_signature"]');
      C || (C = document.createElement("input"), C.type = "hidden", C.name = "send_for_signature", l.appendChild(C)), C.value = "1";
    } else
      l.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      c.preventDefault(), p.disabled = !0, p.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${A ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          $(), O.updateState(O.collectFormState()), await Pe.forceSync();
          const C = O.getState();
          if (C?.syncPending)
            throw new Error("Unable to sync latest draft changes");
          const U = String(C?.serverDraftId || "").trim();
          if (!U)
            throw new Error("Draft session not available. Please try again.");
          const q = String(e.routes?.index || "").trim();
          if (!A) {
            if (q) {
              window.location.href = q;
              return;
            }
            window.location.reload();
            return;
          }
          const W = await fetch(
            B(`${u}/${encodeURIComponent(U)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: G(),
              body: JSON.stringify({
                expected_revision: Number(C?.serverRevision || 0),
                created_by_user_id: v
              })
            }
          );
          if (!W.ok)
            throw await x(W, "Failed to send agreement");
          const j = await W.json(), Y = String(j?.agreement_id || j?.id || j?.data?.id || "").trim();
          if (O.clear(), Pe.broadcastStateUpdate(), Y && q) {
            window.location.href = `${q}/${encodeURIComponent(Y)}`;
            return;
          }
          if (q) {
            window.location.href = q;
            return;
          }
          window.location.reload();
        } catch (C) {
          const U = String(C?.message || "Failed to process agreement").trim(), q = String(C?.code || "").trim(), W = Number(C?.status || 0);
          I(U, q, W), p.disabled = !1, p.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }
    p.disabled = !0, p.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${A ? "Sending..." : "Saving..."}
    `;
  });
  let N = 1;
  const Q = document.querySelectorAll(".wizard-step-btn"), Ae = document.querySelectorAll(".wizard-step"), _e = document.querySelectorAll(".wizard-connector"), J = document.getElementById("wizard-prev-btn"), ae = document.getElementById("wizard-next-btn"), Ye = document.getElementById("wizard-save-btn");
  function Ue() {
    if (Q.forEach((c, o) => {
      const g = o + 1, h = c.querySelector(".wizard-step-number");
      g < N ? (c.classList.remove("text-gray-500", "text-blue-600"), c.classList.add("text-green-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), h.classList.add("bg-green-600", "text-white"), c.removeAttribute("aria-current")) : g === N ? (c.classList.remove("text-gray-500", "text-green-600"), c.classList.add("text-blue-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), h.classList.add("bg-blue-600", "text-white"), c.setAttribute("aria-current", "step")) : (c.classList.remove("text-blue-600", "text-green-600"), c.classList.add("text-gray-500"), h.classList.remove("bg-blue-600", "text-white", "bg-green-600"), h.classList.add("bg-gray-300", "text-gray-600"), c.removeAttribute("aria-current"));
    }), _e.forEach((c, o) => {
      o < N - 1 ? (c.classList.remove("bg-gray-300"), c.classList.add("bg-green-600")) : (c.classList.remove("bg-green-600"), c.classList.add("bg-gray-300"));
    }), Ae.forEach((c) => {
      parseInt(c.dataset.step, 10) === N ? c.classList.remove("hidden") : c.classList.add("hidden");
    }), J.classList.toggle("hidden", N === 1), ae.classList.toggle("hidden", N === yt), Ye.classList.toggle("hidden", N !== yt), p.classList.toggle("hidden", N !== yt), N < yt) {
      const c = or[N] || "Next";
      ae.innerHTML = `
        ${c}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    N === Le.PLACEMENT ? $n() : N === Le.REVIEW && Bs(), Re.updateVisibility(N);
  }
  function Zn(c) {
    switch (c) {
      case 1:
        return he.value ? !!tn() : (I("Please select a document"), !1);
      case 2:
        const o = document.getElementById("title");
        return o.value.trim() ? !0 : (I("Please enter an agreement title"), o.focus(), !1);
      case 3:
        const g = be.querySelectorAll(".participant-entry");
        if (g.length === 0)
          return I("Please add at least one participant"), !1;
        let h = !1;
        return g.forEach((_) => {
          _.querySelector('select[name*=".role"]').value === "signer" && (h = !0);
        }), h ? !0 : (I("At least one signer is required"), !1);
      case 4:
        const w = ve.querySelectorAll(".field-definition-entry");
        for (const _ of w) {
          const A = _.querySelector(".field-participant-select");
          if (!A.value)
            return I("Please assign all fields to a signer"), A.focus(), !1;
        }
        if (Je().find((_) => !_.participantId))
          return I("Please assign all automation rules to a signer"), we?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const M = R();
        return M.length > 0 ? (I(X(M)), an.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function Ct(c) {
    if (!(c < Le.DOCUMENT || c > yt)) {
      if (c > N) {
        for (let o = N; o < c; o++)
          if (!Zn(o)) return;
      }
      N = c, Ue(), O.updateStep(c), Tt(), Pe.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  Q.forEach((c) => {
    c.addEventListener("click", () => {
      const o = parseInt(c.dataset.step, 10);
      Ct(o);
    });
  }), J.addEventListener("click", () => Ct(N - 1)), ae.addEventListener("click", () => Ct(N + 1)), Ye.addEventListener("click", () => {
    const c = document.createElement("input");
    c.type = "hidden", c.name = "save_as_draft", c.value = "1", l.appendChild(c), l.submit();
  });
  let L = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((c, o) => Nn(c, o)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: wr()
  };
  const Ke = {
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
  async function $n() {
    const c = document.getElementById("placement-loading"), o = document.getElementById("placement-no-document"), g = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const h = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const w = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const S = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !he.value) {
      c.classList.add("hidden"), o.classList.remove("hidden");
      return;
    }
    c.classList.remove("hidden"), o.classList.add("hidden");
    const k = zt(), M = new Set(
      k.map((Y) => String(Y.definitionId || "").trim()).filter((Y) => Y)
    );
    L.fieldInstances = L.fieldInstances.filter(
      (Y) => M.has(String(Y.definitionId || "").trim())
    ), g.innerHTML = "";
    const _ = L.linkGroupState.groups.size > 0, A = document.getElementById("link-batch-actions");
    A && A.classList.toggle("hidden", !_);
    const C = k.map((Y) => {
      const ee = String(Y.definitionId || "").trim(), ce = L.linkGroupState.definitionToGroup.get(ee) || "", pe = L.linkGroupState.unlinkedDefinitions.has(ee);
      return { ...Y, definitionId: ee, linkGroupId: ce, isUnlinked: pe };
    });
    C.forEach((Y, ee) => {
      const ce = Y.definitionId, pe = String(Y.fieldType || "text").trim() || "text", fe = String(Y.participantId || "").trim(), ne = String(Y.participantName || "Unassigned").trim() || "Unassigned", le = parseInt(String(Y.page || "1"), 10) || 1, Qe = Y.linkGroupId, ii = Y.isUnlinked;
      if (!ce) return;
      L.fieldInstances.forEach((Fe) => {
        Fe.definitionId === ce && (Fe.type = pe, Fe.participantId = fe, Fe.participantName = ne);
      });
      const si = Ke[pe] || Ke.text, Z = L.fieldInstances.some((Fe) => Fe.definitionId === ce), ie = document.createElement("div");
      ie.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Z ? "opacity-50" : ""}`, ie.draggable = !Z, ie.dataset.definitionId = ce, ie.dataset.fieldType = pe, ie.dataset.participantId = fe, ie.dataset.participantName = ne, ie.dataset.page = String(le), Qe && (ie.dataset.linkGroupId = Qe);
      const Wt = document.createElement("span");
      Wt.className = `w-3 h-3 rounded ${si.bg}`;
      const ft = document.createElement("div");
      ft.className = "flex-1 text-xs";
      const Jt = document.createElement("div");
      Jt.className = "font-medium capitalize", Jt.textContent = pe.replace(/_/g, " ");
      const At = document.createElement("div");
      At.className = "text-gray-500", At.textContent = ne;
      const ri = document.createElement("span");
      ri.className = `placement-status text-xs ${Z ? "text-green-600" : "text-amber-600"}`, ri.textContent = Z ? "Placed" : "Not placed", ft.appendChild(Jt), ft.appendChild(At), ie.appendChild(Wt), ie.appendChild(ft), ie.appendChild(ri), ie.addEventListener("dragstart", (Fe) => {
        if (Z) {
          Fe.preventDefault();
          return;
        }
        Fe.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: ce,
          fieldType: pe,
          participantId: fe,
          participantName: ne
        })), Fe.dataTransfer.effectAllowed = "copy", ie.classList.add("opacity-50");
      }), ie.addEventListener("dragend", () => {
        ie.classList.remove("opacity-50");
      }), g.appendChild(ie);
      const _i = C[ee + 1];
      if (Qe && _i && _i.linkGroupId === Qe) {
        const Fe = Ei(ce, !ii);
        g.appendChild(Fe);
      }
    }), gs();
    const U = ++L.loadRequestVersion, q = String(he.value || "").trim(), W = encodeURIComponent(q), j = `${n}/panels/esign_documents/${W}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const ee = await window.pdfjsLib.getDocument({
        url: j,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (U !== L.loadRequestVersion)
        return;
      L.pdfDoc = ee, L.totalPages = L.pdfDoc.numPages, L.currentPage = 1, S.textContent = L.totalPages, await rt(L.currentPage), c.classList.add("hidden"), L.uiHandlersBound || (ms(h, w), xs(), Is(), L.uiHandlersBound = !0), ht();
    } catch (Y) {
      if (U !== L.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", Y), c.classList.add("hidden"), o.classList.remove("hidden"), o.textContent = `Failed to load PDF: ${y(Y?.message || "Failed to load PDF")}`;
    }
    mn(), qe();
  }
  function Ei(c, o) {
    const g = document.createElement("div");
    return g.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", g.dataset.definitionId = c, g.dataset.isLinked = String(o), g.title = o ? "Click to unlink this field" : "Click to re-link this field", g.setAttribute("role", "button"), g.setAttribute("aria-label", o ? "Unlink field from group" : "Re-link field to group"), g.setAttribute("tabindex", "0"), o ? g.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : g.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, g.addEventListener("click", () => Li(c, o)), g.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), Li(c, o));
    }), g;
  }
  function Li(c, o) {
    o ? (L.linkGroupState = Ui(L.linkGroupState, c), window.toastManager && window.toastManager.info("Field unlinked")) : (L.linkGroupState = qi(L.linkGroupState, c), window.toastManager && window.toastManager.info("Field re-linked")), ei();
  }
  function gs() {
    const c = document.getElementById("link-all-btn"), o = document.getElementById("unlink-all-btn");
    c && !c.dataset.bound && (c.dataset.bound = "true", c.addEventListener("click", () => {
      const g = L.linkGroupState.unlinkedDefinitions.size;
      if (g !== 0) {
        for (const h of L.linkGroupState.unlinkedDefinitions)
          L.linkGroupState = qi(L.linkGroupState, h);
        window.toastManager && window.toastManager.success(`Re-linked ${g} field${g > 1 ? "s" : ""}`), ei();
      }
    })), o && !o.dataset.bound && (o.dataset.bound = "true", o.addEventListener("click", () => {
      let g = 0;
      for (const h of L.linkGroupState.definitionToGroup.keys())
        L.linkGroupState.unlinkedDefinitions.has(h) || (L.linkGroupState = Ui(L.linkGroupState, h), g++);
      g > 0 && window.toastManager && window.toastManager.success(`Unlinked ${g} field${g > 1 ? "s" : ""}`), ei();
    })), Ci();
  }
  function Ci() {
    const c = document.getElementById("link-all-btn"), o = document.getElementById("unlink-all-btn");
    if (c) {
      const g = L.linkGroupState.unlinkedDefinitions.size > 0;
      c.disabled = !g;
    }
    if (o) {
      let g = !1;
      for (const h of L.linkGroupState.definitionToGroup.keys())
        if (!L.linkGroupState.unlinkedDefinitions.has(h)) {
          g = !0;
          break;
        }
      o.disabled = !g;
    }
  }
  function ei() {
    const c = document.getElementById("placement-fields-list");
    if (!c) return;
    const o = zt();
    c.innerHTML = "";
    const g = o.map((h) => {
      const w = String(h.definitionId || "").trim(), S = L.linkGroupState.definitionToGroup.get(w) || "", k = L.linkGroupState.unlinkedDefinitions.has(w);
      return { ...h, definitionId: w, linkGroupId: S, isUnlinked: k };
    });
    g.forEach((h, w) => {
      const S = h.definitionId, k = String(h.fieldType || "text").trim() || "text", M = String(h.participantId || "").trim(), _ = String(h.participantName || "Unassigned").trim() || "Unassigned", A = parseInt(String(h.page || "1"), 10) || 1, C = h.linkGroupId, U = h.isUnlinked;
      if (!S) return;
      const q = Ke[k] || Ke.text, W = L.fieldInstances.some((le) => le.definitionId === S), j = document.createElement("div");
      j.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${W ? "opacity-50" : ""}`, j.draggable = !W, j.dataset.definitionId = S, j.dataset.fieldType = k, j.dataset.participantId = M, j.dataset.participantName = _, j.dataset.page = String(A), C && (j.dataset.linkGroupId = C);
      const Y = document.createElement("span");
      Y.className = `w-3 h-3 rounded ${q.bg}`;
      const ee = document.createElement("div");
      ee.className = "flex-1 text-xs";
      const ce = document.createElement("div");
      ce.className = "font-medium capitalize", ce.textContent = k.replace(/_/g, " ");
      const pe = document.createElement("div");
      pe.className = "text-gray-500", pe.textContent = _;
      const fe = document.createElement("span");
      fe.className = `placement-status text-xs ${W ? "text-green-600" : "text-amber-600"}`, fe.textContent = W ? "Placed" : "Not placed", ee.appendChild(ce), ee.appendChild(pe), j.appendChild(Y), j.appendChild(ee), j.appendChild(fe), j.addEventListener("dragstart", (le) => {
        if (W) {
          le.preventDefault();
          return;
        }
        le.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: S,
          fieldType: k,
          participantId: M,
          participantName: _
        })), le.dataTransfer.effectAllowed = "copy", j.classList.add("opacity-50");
      }), j.addEventListener("dragend", () => {
        j.classList.remove("opacity-50");
      }), c.appendChild(j);
      const ne = g[w + 1];
      if (C && ne && ne.linkGroupId === C) {
        const le = Ei(S, !U);
        c.appendChild(le);
      }
    }), Ci();
  }
  async function rt(c) {
    if (!L.pdfDoc) return;
    const o = document.getElementById("placement-pdf-canvas"), g = document.getElementById("placement-canvas-container"), h = o.getContext("2d"), w = await L.pdfDoc.getPage(c), S = w.getViewport({ scale: L.scale });
    o.width = S.width, o.height = S.height, g.style.width = `${S.width}px`, g.style.height = `${S.height}px`, await w.render({
      canvasContext: h,
      viewport: S
    }).promise, document.getElementById("placement-current-page").textContent = c, ht();
  }
  function ms(c, o) {
    const g = document.getElementById("placement-pdf-canvas");
    c.addEventListener("dragover", (h) => {
      h.preventDefault(), h.dataTransfer.dropEffect = "copy", g.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("dragleave", (h) => {
      g.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("drop", (h) => {
      h.preventDefault(), g.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const w = h.dataTransfer.getData("application/json");
      if (!w) return;
      const S = JSON.parse(w), k = g.getBoundingClientRect(), M = (h.clientX - k.left) / L.scale, _ = (h.clientY - k.top) / L.scale;
      ki(S, M, _);
    });
  }
  function ki(c, o, g, h = {}) {
    const w = Vt[c.fieldType] || Vt.text, S = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, k = h.placementSource || Ee.MANUAL, M = h.linkGroupId || is(L.linkGroupState, c.definitionId)?.id, _ = {
      id: S,
      definitionId: c.definitionId,
      type: c.fieldType,
      participantId: c.participantId,
      participantName: c.participantName,
      page: L.currentPage,
      x: Math.max(0, o - w.width / 2),
      y: Math.max(0, g - w.height / 2),
      width: w.width,
      height: w.height,
      placementSource: k,
      linkGroupId: M,
      linkedFromFieldId: h.linkedFromFieldId
    };
    L.fieldInstances.push(_), Ai(c.definitionId), k === Ee.MANUAL && M && vs(_), ht(), mn(), qe();
  }
  function Ai(c, o = !1) {
    const g = document.querySelector(`.placement-field-item[data-definition-id="${c}"]`);
    if (g) {
      g.classList.add("opacity-50"), g.draggable = !1;
      const h = g.querySelector(".placement-status");
      h && (h.textContent = "Placed", h.classList.remove("text-amber-600"), h.classList.add("text-green-600")), o && g.classList.add("just-linked");
    }
  }
  function hs(c) {
    const o = Sr(
      L.linkGroupState,
      c
    );
    o && (L.linkGroupState = Ni(L.linkGroupState, o.updatedGroup));
  }
  function Pi(c) {
    const o = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((S) => {
      const k = S.dataset.definitionId, M = S.dataset.page;
      if (k) {
        const _ = L.linkGroupState.definitionToGroup.get(k);
        o.set(k, {
          type: S.dataset.fieldType || "text",
          participantId: S.dataset.participantId || "",
          participantName: S.dataset.participantName || "Unknown",
          page: M ? parseInt(M, 10) : 1,
          linkGroupId: _
        });
      }
    });
    let h = 0;
    const w = 10;
    for (; h < w; ) {
      const S = xr(
        L.linkGroupState,
        c,
        L.fieldInstances,
        o
      );
      if (!S || !S.newPlacement) break;
      L.fieldInstances.push(S.newPlacement), Ai(S.newPlacement.definitionId, !0), h++;
    }
    h > 0 && (ht(), mn(), qe(), fs(h));
  }
  function fs(c) {
    const o = c === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${c} linked fields`;
    window.toastManager && window.toastManager.info(o);
    const g = document.createElement("div");
    g.setAttribute("role", "status"), g.setAttribute("aria-live", "polite"), g.className = "sr-only", g.textContent = o, document.body.appendChild(g), setTimeout(() => g.remove(), 1e3), ys();
  }
  function ys() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((o) => {
      o.classList.add("linked-flash"), setTimeout(() => {
        o.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function vs(c) {
    hs(c);
  }
  function ht() {
    const c = document.getElementById("placement-overlays-container");
    c.innerHTML = "", c.style.pointerEvents = "auto", L.fieldInstances.filter((o) => o.page === L.currentPage).forEach((o) => {
      const g = Ke[o.type] || Ke.text, h = L.selectedFieldId === o.id, w = o.placementSource === Ee.AUTO_LINKED, S = document.createElement("div"), k = w ? "border-dashed" : "border-solid";
      S.className = `field-overlay absolute cursor-move ${g.border} border-2 ${k} rounded`, S.style.cssText = `
          left: ${o.x * L.scale}px;
          top: ${o.y * L.scale}px;
          width: ${o.width * L.scale}px;
          height: ${o.height * L.scale}px;
          background-color: ${g.fill};
          ${h ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, S.dataset.instanceId = o.id;
      const M = document.createElement("div");
      if (M.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + g.bg, M.textContent = `${o.type.replace("_", " ")} - ${o.participantName}`, S.appendChild(M), w) {
        const C = document.createElement("div");
        C.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", C.title = "Auto-linked from template", C.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, S.appendChild(C);
      }
      const _ = document.createElement("div");
      _.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", _.style.cssText = "transform: translate(50%, 50%);", S.appendChild(_);
      const A = document.createElement("button");
      A.type = "button", A.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", A.innerHTML = "×", A.addEventListener("click", (C) => {
        C.stopPropagation(), Ss(o.id);
      }), S.appendChild(A), S.addEventListener("mousedown", (C) => {
        C.target === _ ? bs(C, o) : C.target !== A && ws(C, o, S);
      }), S.addEventListener("click", () => {
        L.selectedFieldId = o.id, ht();
      }), c.appendChild(S);
    });
  }
  function ws(c, o, g) {
    c.preventDefault(), L.isDragging = !0, L.selectedFieldId = o.id;
    const h = c.clientX, w = c.clientY, S = o.x * L.scale, k = o.y * L.scale;
    function M(A) {
      const C = A.clientX - h, U = A.clientY - w;
      o.x = Math.max(0, (S + C) / L.scale), o.y = Math.max(0, (k + U) / L.scale), o.placementSource = Ee.MANUAL, g.style.left = `${o.x * L.scale}px`, g.style.top = `${o.y * L.scale}px`;
    }
    function _() {
      L.isDragging = !1, document.removeEventListener("mousemove", M), document.removeEventListener("mouseup", _), qe();
    }
    document.addEventListener("mousemove", M), document.addEventListener("mouseup", _);
  }
  function bs(c, o) {
    c.preventDefault(), c.stopPropagation(), L.isResizing = !0;
    const g = c.clientX, h = c.clientY, w = o.width, S = o.height;
    function k(_) {
      const A = (_.clientX - g) / L.scale, C = (_.clientY - h) / L.scale;
      o.width = Math.max(30, w + A), o.height = Math.max(20, S + C), o.placementSource = Ee.MANUAL, ht();
    }
    function M() {
      L.isResizing = !1, document.removeEventListener("mousemove", k), document.removeEventListener("mouseup", M), qe();
    }
    document.addEventListener("mousemove", k), document.addEventListener("mouseup", M);
  }
  function Ss(c) {
    const o = L.fieldInstances.find((h) => h.id === c);
    if (!o) return;
    L.fieldInstances = L.fieldInstances.filter((h) => h.id !== c);
    const g = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (g) {
      g.classList.remove("opacity-50"), g.draggable = !0;
      const h = g.querySelector(".placement-status");
      h && (h.textContent = "Not placed", h.classList.remove("text-green-600"), h.classList.add("text-amber-600"));
    }
    ht(), mn(), qe();
  }
  function xs() {
    const c = document.getElementById("placement-prev-page"), o = document.getElementById("placement-next-page");
    c.addEventListener("click", async () => {
      L.currentPage > 1 && (L.currentPage--, Pi(L.currentPage), await rt(L.currentPage));
    }), o.addEventListener("click", async () => {
      L.currentPage < L.totalPages && (L.currentPage++, Pi(L.currentPage), await rt(L.currentPage));
    });
  }
  function Is() {
    const c = document.getElementById("placement-zoom-in"), o = document.getElementById("placement-zoom-out"), g = document.getElementById("placement-zoom-fit"), h = document.getElementById("placement-zoom-level");
    c.addEventListener("click", async () => {
      L.scale = Math.min(3, L.scale + 0.25), h.textContent = `${Math.round(L.scale * 100)}%`, await rt(L.currentPage);
    }), o.addEventListener("click", async () => {
      L.scale = Math.max(0.5, L.scale - 0.25), h.textContent = `${Math.round(L.scale * 100)}%`, await rt(L.currentPage);
    }), g.addEventListener("click", async () => {
      const w = document.getElementById("placement-viewer"), k = (await L.pdfDoc.getPage(L.currentPage)).getViewport({ scale: 1 });
      L.scale = (w.clientWidth - 40) / k.width, h.textContent = `${Math.round(L.scale * 100)}%`, await rt(L.currentPage);
    });
  }
  function mn() {
    const c = Array.from(document.querySelectorAll(".placement-field-item")), o = c.length, g = new Set(
      c.map((k) => String(k.dataset.definitionId || "").trim()).filter((k) => k)
    ), h = /* @__PURE__ */ new Set();
    L.fieldInstances.forEach((k) => {
      const M = String(k.definitionId || "").trim();
      g.has(M) && h.add(M);
    });
    const w = h.size, S = Math.max(0, o - w);
    document.getElementById("placement-total-fields").textContent = o, document.getElementById("placement-placed-count").textContent = w, document.getElementById("placement-unplaced-count").textContent = S;
  }
  function qe() {
    const c = document.getElementById("field-instances-container");
    c.innerHTML = "";
    const o = L.fieldInstances.map((g, h) => Oi(g, h));
    Et && (Et.value = JSON.stringify(o));
  }
  qe();
  let Me = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const kt = document.getElementById("auto-place-btn");
  kt && kt.addEventListener("click", async () => {
    if (Me.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      hn("All fields are already placed", "info");
      return;
    }
    const o = document.querySelector('input[name="id"]')?.value;
    if (!o) {
      ti();
      return;
    }
    Me.isRunning = !0, kt.disabled = !0, kt.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const g = await fetch(`${d}/esign/agreements/${o}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Es()
        })
      });
      if (!g.ok)
        throw await x(g, "Auto-placement failed");
      const h = await g.json(), w = h && typeof h == "object" && h.run && typeof h.run == "object" ? h.run : h;
      Me.currentRunId = w?.run_id || w?.id || null, Me.suggestions = w?.suggestions || [], Me.resolverScores = w?.resolver_scores || [], Me.suggestions.length === 0 ? (hn("No placement suggestions found. Try placing fields manually.", "warning"), ti()) : Ls(h);
    } catch (g) {
      console.error("Auto-place error:", g);
      const h = y(g?.message || "Auto-placement failed", g?.code || "", g?.status || 0);
      hn(`Auto-placement failed: ${h}`, "error"), ti();
    } finally {
      Me.isRunning = !1, kt.disabled = !1, kt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Es() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function ti() {
    const c = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let o = 100;
    c.forEach((g) => {
      const h = {
        definitionId: g.dataset.definitionId,
        fieldType: g.dataset.fieldType,
        participantId: g.dataset.participantId,
        participantName: g.dataset.participantName
      }, w = Vt[h.fieldType] || Vt.text;
      L.currentPage = L.totalPages, ki(h, 300, o + w.height / 2, { placementSource: Ee.AUTO_FALLBACK }), o += w.height + 20;
    }), L.pdfDoc && rt(L.totalPages), hn("Fields placed using fallback layout", "info");
  }
  function Ls(c) {
    let o = document.getElementById("placement-suggestions-modal");
    o || (o = Cs(), document.body.appendChild(o));
    const g = o.querySelector("#suggestions-list"), h = o.querySelector("#resolver-info"), w = o.querySelector("#run-stats");
    h.innerHTML = Me.resolverScores.map((S) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${de(String(S?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${S.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${Ms(S.score)}">
              ${(Number(S?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), w.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${de(String(c?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${c.status === "completed" ? "text-green-600" : "text-amber-600"}">${de(String(c?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(c?.elapsed_ms || 0))}ms</span>
      </div>
    `, g.innerHTML = Me.suggestions.map((S, k) => {
      const M = Ti(S.field_definition_id), _ = Ke[M?.type] || Ke.text, A = de(String(M?.type || "field").replace(/_/g, " ")), C = de(String(S?.id || "")), U = Math.max(1, Number(S?.page_number || 1)), q = Math.round(Number(S?.x || 0)), W = Math.round(Number(S?.y || 0)), j = Math.max(0, Number(S?.confidence || 0)), Y = de(Ds(String(S?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${k}" data-suggestion-id="${C}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${_.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${A}</div>
                <div class="text-xs text-gray-500">Page ${U}, (${q}, ${W})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${_s(S.confidence)}">
                ${(j * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${Y}
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
    }).join(""), ks(o), o.classList.remove("hidden");
  }
  function Cs() {
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
      Ps(), c.classList.add("hidden");
    }), c.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      c.classList.add("hidden");
      const o = c.querySelector("#placement-policy-preset-modal"), g = document.getElementById("placement-policy-preset");
      g && o && (g.value = o.value), kt?.click();
    }), c;
  }
  function ks(c) {
    c.querySelectorAll(".accept-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const g = o.closest(".suggestion-item");
        g.classList.add("border-green-500", "bg-green-50"), g.classList.remove("border-red-500", "bg-red-50"), g.dataset.accepted = "true";
      });
    }), c.querySelectorAll(".reject-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const g = o.closest(".suggestion-item");
        g.classList.add("border-red-500", "bg-red-50"), g.classList.remove("border-green-500", "bg-green-50"), g.dataset.accepted = "false";
      });
    }), c.querySelectorAll(".preview-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const g = parseInt(o.dataset.index, 10), h = Me.suggestions[g];
        h && As(h);
      });
    });
  }
  function As(c) {
    c.page_number !== L.currentPage && (L.currentPage = c.page_number, rt(c.page_number));
    const o = document.getElementById("placement-overlays-container"), g = document.getElementById("suggestion-preview-overlay");
    g && g.remove();
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
  function Ps() {
    const o = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    o.forEach((g) => {
      const h = parseInt(g.dataset.index, 10), w = Me.suggestions[h];
      if (!w) return;
      const S = Ti(w.field_definition_id);
      if (!S) return;
      const k = document.querySelector(`.placement-field-item[data-definition-id="${w.field_definition_id}"]`);
      if (!k || k.classList.contains("opacity-50")) return;
      const M = {
        definitionId: w.field_definition_id,
        fieldType: S.type,
        participantId: S.participant_id,
        participantName: k.dataset.participantName
      };
      L.currentPage = w.page_number, Ts(M, w);
    }), L.pdfDoc && rt(L.currentPage), $s(o.length, Me.suggestions.length - o.length), hn(`Applied ${o.length} placement${o.length !== 1 ? "s" : ""}`, "success");
  }
  function Ts(c, o) {
    const g = {
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
      placementSource: Ee.AUTO,
      resolverId: o.resolver_id,
      confidence: o.confidence,
      placementRunId: Me.currentRunId
    };
    L.fieldInstances.push(g);
    const h = document.querySelector(`.placement-field-item[data-definition-id="${c.definitionId}"]`);
    if (h) {
      h.classList.add("opacity-50"), h.draggable = !1;
      const w = h.querySelector(".placement-status");
      w && (w.textContent = "Placed", w.classList.remove("text-amber-600"), w.classList.add("text-green-600"));
    }
    ht(), mn(), qe();
  }
  function Ti(c) {
    const o = document.querySelector(`.field-definition-entry[data-field-definition-id="${c}"]`);
    return o ? {
      id: c,
      type: o.querySelector(".field-type-select")?.value || "text",
      participant_id: o.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function _s(c) {
    return c >= 0.9 ? "bg-green-100 text-green-800" : c >= 0.7 ? "bg-blue-100 text-blue-800" : c >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Ms(c) {
    return c >= 0.8 ? "bg-green-100 text-green-800" : c >= 0.6 ? "bg-blue-100 text-blue-800" : c >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Ds(c) {
    return c ? c.split("_").map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(" ") : "Unknown";
  }
  async function $s(c, o) {
  }
  function hn(c, o = "info") {
    const g = document.createElement("div");
    g.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${o === "success" ? "bg-green-600 text-white" : o === "error" ? "bg-red-600 text-white" : o === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, g.textContent = c, document.body.appendChild(g), setTimeout(() => {
      g.style.opacity = "0", setTimeout(() => g.remove(), 300);
    }, 3e3);
  }
  function Bs() {
    const c = document.getElementById("send-readiness-loading"), o = document.getElementById("send-readiness-results"), g = document.getElementById("send-validation-status"), h = document.getElementById("send-validation-issues"), w = document.getElementById("send-issues-list"), S = document.getElementById("send-confirmation"), k = document.getElementById("review-agreement-title"), M = document.getElementById("review-document-title"), _ = document.getElementById("review-participant-count"), A = document.getElementById("review-stage-count"), C = document.getElementById("review-participants-list"), U = document.getElementById("review-fields-summary"), q = document.getElementById("title").value || "Untitled", W = ze.textContent || "No document", j = be.querySelectorAll(".participant-entry"), Y = ve.querySelectorAll(".field-definition-entry"), ee = Be(Je(), Ie()), ce = Ne(), pe = /* @__PURE__ */ new Set();
    j.forEach((Z) => {
      const ie = Z.querySelector(".signing-stage-input");
      Z.querySelector('select[name*=".role"]').value === "signer" && ie?.value && pe.add(parseInt(ie.value, 10));
    }), k.textContent = q, M.textContent = W, _.textContent = `${j.length} (${ce.length} signers)`, A.textContent = pe.size > 0 ? pe.size : "1", C.innerHTML = "", j.forEach((Z) => {
      const ie = Z.querySelector('input[name*=".name"]'), Wt = Z.querySelector('input[name*=".email"]'), ft = Z.querySelector('select[name*=".role"]'), Jt = Z.querySelector(".signing-stage-input"), At = document.createElement("div");
      At.className = "flex items-center justify-between text-sm", At.innerHTML = `
        <div>
          <span class="font-medium">${de(ie.value || Wt.value)}</span>
          <span class="text-gray-500 ml-2">${de(Wt.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${ft.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${ft.value === "signer" ? "Signer" : "CC"}
          </span>
          ${ft.value === "signer" && Jt?.value ? `<span class="text-xs text-gray-500">Stage ${Jt.value}</span>` : ""}
        </div>
      `, C.appendChild(At);
    });
    const fe = Y.length + ee.length;
    U.textContent = `${fe} field${fe !== 1 ? "s" : ""} defined (${Y.length} manual, ${ee.length} generated)`;
    const ne = [];
    he.value || ne.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), ce.length === 0 && ne.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), R().forEach((Z) => {
      ne.push({
        severity: "error",
        message: `${Z.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Qe = Array.from(pe).sort((Z, ie) => Z - ie);
    for (let Z = 0; Z < Qe.length; Z++)
      if (Qe[Z] !== Z + 1) {
        ne.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const ii = ne.some((Z) => Z.severity === "error"), si = ne.some((Z) => Z.severity === "warning");
    ii ? (g.className = "p-4 rounded-lg bg-red-50 border border-red-200", g.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, S.classList.add("hidden"), p.disabled = !0) : si ? (g.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", g.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, S.classList.remove("hidden"), p.disabled = !1) : (g.className = "p-4 rounded-lg bg-green-50 border border-green-200", g.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, S.classList.remove("hidden"), p.disabled = !1), ne.length > 0 ? (h.classList.remove("hidden"), w.innerHTML = "", ne.forEach((Z) => {
      const ie = document.createElement("li");
      ie.className = `p-3 rounded-lg flex items-center justify-between ${Z.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, ie.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Z.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Z.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${de(Z.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Z.step}">
            ${de(Z.action)}
          </button>
        `, w.appendChild(ie);
    }), w.querySelectorAll("[data-go-to-step]").forEach((Z) => {
      Z.addEventListener("click", () => {
        const ie = Number(Z.getAttribute("data-go-to-step"));
        Number.isFinite(ie) && Ct(ie);
      });
    })) : h.classList.add("hidden"), c.classList.add("hidden"), o.classList.remove("hidden");
  }
  let ni = null;
  function Xe() {
    ni && clearTimeout(ni), ni = setTimeout(() => {
      Tt();
    }, 500);
  }
  he && new MutationObserver(() => {
    Tt();
  }).observe(he, { attributes: !0, attributeFilter: ["value"] });
  const Fs = document.getElementById("title"), Rs = document.getElementById("message");
  Fs?.addEventListener("input", Xe), Rs?.addEventListener("input", Xe), be.addEventListener("input", Xe), be.addEventListener("change", Xe), ve.addEventListener("input", Xe), ve.addEventListener("change", Xe), we?.addEventListener("input", Xe), we?.addEventListener("change", Xe);
  const Hs = qe;
  qe = function() {
    Hs(), Tt();
  };
  function Ns() {
    const c = O.getState();
    !c.participants || c.participants.length === 0 || (be.innerHTML = "", Nt = 0, c.participants.forEach((o) => {
      Ut({
        id: o.tempId,
        name: o.name,
        email: o.email,
        role: o.role,
        signing_stage: o.signingStage
      });
    }));
  }
  function Us() {
    const c = O.getState();
    !c.fieldDefinitions || c.fieldDefinitions.length === 0 || (ve.innerHTML = "", _n = 0, c.fieldDefinitions.forEach((o) => {
      Lt({
        id: o.tempId,
        type: o.type,
        participant_id: o.participantTempId,
        page: o.page,
        required: o.required
      });
    }), Gt());
  }
  function qs() {
    const c = O.getState();
    !Array.isArray(c.fieldRules) || c.fieldRules.length === 0 || we && (we.querySelectorAll(".field-rule-entry").forEach((o) => o.remove()), un = 0, c.fieldRules.forEach((o) => {
      gn({
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
    }), jt(), oe());
  }
  function js() {
    const c = O.getState();
    !Array.isArray(c.fieldPlacements) || c.fieldPlacements.length === 0 || (L.fieldInstances = c.fieldPlacements.map((o, g) => Nn(o, g)), qe());
  }
  if (window._resumeToStep) {
    Ns(), Us(), qs(), st(), js();
    const c = O.getState();
    c.document?.id && Re.setDocument(c.document.id, c.document.title, c.document.pageCount), N = window._resumeToStep, Ue(), delete window._resumeToStep;
  } else if (Ue(), he.value) {
    const c = ze?.textContent || null, o = ge(Ge.value, null);
    Re.setDocument(he.value, c, o);
  }
  a && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function Tr(i) {
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
class os {
  constructor(e) {
    this.initialized = !1, this.config = Tr(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Pr(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function za(i) {
  const e = new os(i);
  return te(() => e.init()), e;
}
function _r(i) {
  const e = new os({
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
  te(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && te(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      _r({
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
const Mr = "esign.signer.profile.v1", Gi = "esign.signer.profile.outbox.v1", fi = 90, Vi = 500 * 1024;
class Dr {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : fi;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Mr}:${e}`;
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
class $r {
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
class di {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Gi);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [s, d] of Object.entries(t)) {
        if (!d || typeof d != "object")
          continue;
        const u = d;
        if (u.op === "clear") {
          n[s] = {
            op: "clear",
            updatedAt: Number(u.updatedAt) || Date.now()
          };
          continue;
        }
        const a = u.op === "patch" ? u.patch : u;
        n[s] = {
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
      window.localStorage.setItem(Gi, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), s = n[e], d = s?.op === "patch" ? s.patch || {} : {};
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
      const [n, s] = await Promise.all([
        this.localStore.load(e),
        this.remoteStore.load(e).catch(() => null)
      ]), d = this.pickLatest(n, s);
      return d && await this.localStore.save(e, d), await this.flushOutboxForKey(e), d;
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
function Br(i) {
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
      ttlDays: Number(i.profile?.ttlDays || fi) || fi,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Fr(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function ui(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Rr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function De(i) {
  const e = String(i || "").trim();
  return Rr(e) ? "" : e;
}
function Hr(i) {
  const e = new Dr(i.profile.ttlDays), t = new $r(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new di("local_only", e, null) : i.profile.mode === "remote_only" ? new di("remote_only", e, t) : new di("hybrid", e, t);
}
function Nr() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Ur(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Br(i), s = Fr(n), d = Hr(n);
  Nr();
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
    track(r, l = {}) {
      if (!n.telemetryEnabled) return;
      const p = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...l
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
    trackViewerLoad(r, l, p = null) {
      this.metrics.viewerLoadTime = l, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: l,
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
    trackFieldSave(r, l, p, f, y = null) {
      this.metrics.fieldSaveLatencies.push(f), p ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: y }), this.track(p ? "field_save_success" : "field_save_failed", {
        fieldId: r,
        fieldType: l,
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
    trackSignatureAttach(r, l, p, f, y = null) {
      this.metrics.signatureAttachLatencies.push(f), this.track(p ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: r,
        signatureType: l,
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
      return r.length ? Math.round(r.reduce((l, p) => l + p, 0) / r.length) : 0;
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
  function b() {
    a.overlayRenderFrameID || (a.overlayRenderFrameID = window.requestAnimationFrame(() => {
      a.overlayRenderFrameID = 0, ut();
    }));
  }
  function v(r) {
    const l = a.fieldState.get(r);
    l && (delete l.previewValueText, delete l.previewValueBool, delete l.previewSignatureUrl);
  }
  function E() {
    a.fieldState.forEach((r) => {
      delete r.previewValueText, delete r.previewValueBool, delete r.previewSignatureUrl;
    });
  }
  function T(r, l) {
    const p = a.fieldState.get(r);
    if (!p) return;
    const f = De(String(l || ""));
    if (!f) {
      delete p.previewValueText;
      return;
    }
    p.previewValueText = f, delete p.previewValueBool, delete p.previewSignatureUrl;
  }
  function H(r, l) {
    const p = a.fieldState.get(r);
    p && (p.previewValueBool = !!l, delete p.previewValueText, delete p.previewSignatureUrl);
  }
  function F(r, l) {
    const p = a.fieldState.get(r);
    if (!p) return;
    const f = String(l || "").trim();
    if (!f) {
      delete p.previewSignatureUrl;
      return;
    }
    p.previewSignatureUrl = f, delete p.previewValueText, delete p.previewValueBool;
  }
  const B = {
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
      const l = n.viewer.pages?.find((f) => f.page === r);
      if (l)
        return {
          width: l.width,
          height: l.height,
          rotation: l.rotation || 0
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
      const p = r.page, f = this.getPageMetadata(p), y = l.offsetWidth, x = l.offsetHeight, I = r.pageWidth || f.width, $ = r.pageHeight || f.height, R = y / I, X = x / $;
      let N = r.posX || 0, Q = r.posY || 0;
      n.viewer.origin === "bottom-left" && (Q = $ - Q - (r.height || 30));
      const Ae = N * R, _e = Q * X, J = (r.width || 150) * R, ae = (r.height || 30) * X;
      return {
        left: Ae,
        top: _e,
        width: J,
        height: ae,
        // Store original values for debugging
        _debug: {
          sourceX: N,
          sourceY: Q,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: I,
          pageHeight: $,
          scaleX: R,
          scaleY: X,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, l) {
      const p = this.pageToScreen(r, l);
      return {
        left: `${Math.round(p.left)}px`,
        top: `${Math.round(p.top)}px`,
        width: `${Math.round(p.width)}px`,
        height: `${Math.round(p.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, G = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(r, l, p, f) {
      const y = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: l,
            content_type: p,
            size_bytes: f
          })
        }
      );
      if (!y.ok)
        throw await We(y, "Failed to get upload contract");
      const x = await y.json(), I = x?.contract || x;
      if (!I || typeof I != "object" || !I.upload_url)
        throw new Error("Invalid upload contract response");
      return I;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, l) {
      const p = new URL(r.upload_url, window.location.origin);
      r.upload_token && p.searchParams.set("upload_token", String(r.upload_token)), r.object_key && p.searchParams.set("object_key", String(r.object_key));
      const f = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([x, I]) => {
        const $ = String(x).toLowerCase();
        $ === "x-esign-upload-token" || $ === "x-esign-upload-key" || (f[x] = String(I));
      });
      const y = await fetch(p.toString(), {
        method: r.method || "PUT",
        headers: f,
        body: l,
        credentials: "omit"
      });
      if (!y.ok)
        throw await We(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [l, p] = r.split(","), f = l.match(/data:([^;]+)/), y = f ? f[1] : "image/png", x = atob(p), I = new Uint8Array(x.length);
      for (let $ = 0; $ < x.length; $++)
        I[$] = x.charCodeAt($);
      return new Blob([I], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, l) {
      const p = this.dataUrlToBlob(l), f = p.size, y = "image/png", x = await Xt(p), I = await this.requestUploadBootstrap(
        r,
        x,
        y,
        f
      );
      return await this.uploadToSignedUrl(I, p), {
        uploadToken: I.upload_token,
        objectKey: I.object_key,
        sha256: I.sha256,
        contentType: I.content_type
      };
    }
  }, V = {
    endpoint(r, l = "") {
      const p = encodeURIComponent(r), f = l ? `/${encodeURIComponent(l)}` : "";
      return `${n.apiBasePath}/signatures/${p}${f}`;
    },
    async list(r) {
      const l = new URL(this.endpoint(n.token), window.location.origin);
      l.searchParams.set("type", r);
      const p = await fetch(l.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!p.ok) {
        const y = await p.json().catch(() => ({}));
        throw new Error(y?.error?.message || "Failed to load saved signatures");
      }
      const f = await p.json();
      return Array.isArray(f?.signatures) ? f.signatures : [];
    },
    async save(r, l, p = "") {
      const f = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: p,
          data_url: l
        })
      });
      if (!f.ok) {
        const x = await f.json().catch(() => ({})), I = new Error(x?.error?.message || "Failed to save signature");
        throw I.code = x?.error?.code || "", I;
      }
      return (await f.json())?.signature || null;
    },
    async delete(r) {
      const l = await fetch(this.endpoint(n.token, r), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!l.ok) {
        const p = await l.json().catch(() => ({}));
        throw new Error(p?.error?.message || "Failed to delete signature");
      }
    }
  };
  function K(r) {
    const l = a.fieldState.get(r);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function re(r) {
    return a.savedSignaturesByType.get(r) || [];
  }
  async function me(r, l = !1) {
    const p = K(r);
    if (!l && a.savedSignaturesByType.has(p)) {
      ue(r);
      return;
    }
    const f = await V.list(p);
    a.savedSignaturesByType.set(p, f), ue(r);
  }
  function ue(r) {
    const l = K(r), p = re(l), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!p.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = p.map((y) => {
        const x = Ze(String(y?.thumbnail_data_url || y?.data_url || "")), I = Ze(String(y?.label || "Saved signature")), $ = Ze(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${I}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${I}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Ze(r)}" data-signature-id="${$}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Ze(r)}" data-signature-id="${$}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Ce(r) {
    const l = a.signatureCanvases.get(r), p = K(r);
    if (!l || !Nt(r))
      throw new Error(`Please add your ${p === "initials" ? "initials" : "signature"} first`);
    const f = l.canvas.toDataURL("image/png"), y = await V.save(p, f, p === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const x = re(p);
    x.unshift(y), a.savedSignaturesByType.set(p, x), ue(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function wt(r, l) {
    const p = K(r), y = re(p).find((I) => String(I?.id || "") === String(l));
    if (!y) return;
    requestAnimationFrame(() => Rt(r)), await et(r);
    const x = String(y.data_url || y.thumbnail_data_url || "").trim();
    x && (await be(r, x, { clearStrokes: !0 }), F(r, x), b(), xt("draw", r), oe("Saved signature selected."));
  }
  async function je(r, l) {
    const p = K(r);
    await V.delete(l);
    const f = re(p).filter((y) => String(y?.id || "") !== String(l));
    a.savedSignaturesByType.set(p, f), ue(r);
  }
  function $e(r) {
    const l = String(r?.code || "").trim(), p = String(r?.message || "Unable to update saved signatures"), f = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : p;
    window.toastManager && window.toastManager.error(f), oe(f, "assertive");
  }
  async function et(r, l = 8) {
    for (let p = 0; p < l; p++) {
      if (a.signatureCanvases.has(r)) return !0;
      await new Promise((f) => setTimeout(f, 40)), Rt(r);
    }
    return !1;
  }
  async function O(r, l) {
    const p = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(p))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => Rt(r)), await et(r);
    const f = a.signatureCanvases.get(r);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const y = await ye(l), x = p === "image/png" ? y : await Re(y, f.drawWidth, f.drawHeight);
    if (Pe(x) > Vi)
      throw new Error(`Image exceeds ${Math.round(Vi / 1024)}KB limit after conversion`);
    await be(r, x, { clearStrokes: !0 }), F(r, x), b();
    const $ = document.getElementById("sig-upload-preview-wrap"), R = document.getElementById("sig-upload-preview");
    $ && $.classList.remove("hidden"), R && R.setAttribute("src", x), oe("Signature image uploaded. You can now insert it.");
  }
  function ye(r) {
    return new Promise((l, p) => {
      const f = new FileReader();
      f.onload = () => l(String(f.result || "")), f.onerror = () => p(new Error("Unable to read image file")), f.readAsDataURL(r);
    });
  }
  function Pe(r) {
    const l = String(r || "").split(",");
    if (l.length < 2) return 0;
    const p = l[1] || "", f = (p.match(/=+$/) || [""])[0].length;
    return Math.floor(p.length * 3 / 4) - f;
  }
  async function Re(r, l, p) {
    return await new Promise((f, y) => {
      const x = new Image();
      x.onload = () => {
        const I = document.createElement("canvas"), $ = Math.max(1, Math.round(Number(l) || 600)), R = Math.max(1, Math.round(Number(p) || 160));
        I.width = $, I.height = R;
        const X = I.getContext("2d");
        if (!X) {
          y(new Error("Unable to process image"));
          return;
        }
        X.clearRect(0, 0, $, R);
        const N = Math.min($ / x.width, R / x.height), Q = x.width * N, Ae = x.height * N, _e = ($ - Q) / 2, J = (R - Ae) / 2;
        X.drawImage(x, _e, J, Q, Ae), f(I.toDataURL("image/png"));
      }, x.onerror = () => y(new Error("Unable to decode image file")), x.src = r;
    });
  }
  async function Xt(r) {
    if (window.crypto && window.crypto.subtle) {
      const l = await r.arrayBuffer(), p = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(p)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function Gn() {
    document.addEventListener("click", (r) => {
      const l = r.target;
      if (!(l instanceof Element)) return;
      const p = l.closest("[data-esign-action]");
      if (!p) return;
      switch (p.getAttribute("data-esign-action")) {
        case "prev-page":
          $t();
          break;
        case "next-page":
          Wn();
          break;
        case "zoom-out":
          xn();
          break;
        case "zoom-in":
          it();
          break;
        case "fit-width":
          In();
          break;
        case "download-document":
          Dn();
          break;
        case "show-consent-modal":
          Ne();
          break;
        case "activate-field": {
          const y = p.getAttribute("data-field-id");
          y && pt(y);
          break;
        }
        case "submit-signature":
          Qn();
          break;
        case "show-decline-modal":
          st();
          break;
        case "close-field-editor":
          ve();
          break;
        case "save-field-editor":
          we();
          break;
        case "hide-consent-modal":
          pn();
          break;
        case "accept-consent":
          qt();
          break;
        case "hide-decline-modal":
          Ie();
          break;
        case "confirm-decline":
          jt();
          break;
        case "retry-load-pdf":
          Mt();
          break;
        case "signature-tab": {
          const y = p.getAttribute("data-tab") || "draw", x = p.getAttribute("data-field-id");
          x && xt(y, x);
          break;
        }
        case "clear-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Ut(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && kn(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Kn(y);
          break;
        }
        case "save-current-signature-library": {
          const y = p.getAttribute("data-field-id");
          y && Ce(y).catch($e);
          break;
        }
        case "select-saved-signature": {
          const y = p.getAttribute("data-field-id"), x = p.getAttribute("data-signature-id");
          y && x && wt(y, x).catch($e);
          break;
        }
        case "delete-saved-signature": {
          const y = p.getAttribute("data-field-id"), x = p.getAttribute("data-signature-id");
          y && x && je(y, x).catch($e);
          break;
        }
        case "clear-signer-profile":
          lt().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Be.togglePanel();
          break;
        case "debug-copy-session":
          Be.copySessionInfo();
          break;
        case "debug-clear-cache":
          Be.clearCache();
          break;
        case "debug-show-telemetry":
          Be.showTelemetry();
          break;
        case "debug-reload-viewer":
          Be.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const l = r.target;
      if (l instanceof HTMLInputElement) {
        if (l.matches("#sig-upload-input")) {
          const p = l.getAttribute("data-field-id"), f = l.files?.[0];
          if (!p || !f) return;
          O(p, f).catch((y) => {
            window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (l.matches("#field-checkbox-input")) {
          const p = l.getAttribute("data-field-id") || a.activeFieldId;
          if (!p) return;
          H(p, l.checked), b();
        }
      }
    }), document.addEventListener("input", (r) => {
      const l = r.target;
      if (!(l instanceof HTMLInputElement) && !(l instanceof HTMLTextAreaElement)) return;
      const p = l.getAttribute("data-field-id") || a.activeFieldId;
      if (p) {
        if (l.matches("#sig-type-input")) {
          gt(p, l.value || "", { syncOverlay: !0 });
          return;
        }
        if (l.matches("#field-text-input")) {
          T(p, l.value || ""), b();
          return;
        }
        l.matches("#field-checkbox-input") && l instanceof HTMLInputElement && (H(p, l.checked), b());
      }
    });
  }
  te(async () => {
    Gn(), a.isLowMemory = Zt(), xe(), ct(), await ze(), wn(), Qt(), Et(), mt(), await Mt(), ut(), document.addEventListener("visibilitychange", Tt), "memory" in navigator && at(), Be.init();
  });
  function Tt() {
    document.hidden && he();
  }
  function he() {
    const r = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > r; ) {
      let l = null, p = 1 / 0;
      if (a.renderedPages.forEach((f, y) => {
        y !== a.currentPage && f.timestamp < p && (l = y, p = f.timestamp);
      }), l !== null)
        a.renderedPages.delete(l);
      else
        break;
    }
  }
  function at() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        r / l > 0.8 && (a.isLowMemory = !0, he());
      }
    }, 3e4);
  }
  function ot(r) {
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
  function xe() {
    const r = document.getElementById("pdf-compatibility-banner"), l = document.getElementById("pdf-compatibility-message"), p = document.getElementById("pdf-compatibility-title");
    if (!r || !l || !p) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      r.classList.add("hidden");
      return;
    }
    p.textContent = "Preview Compatibility Notice", l.textContent = String(n.viewer.compatibilityMessage || "").trim() || ot(y), r.classList.remove("hidden"), u.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: y });
  }
  function ct() {
    const r = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), p = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !l || !p || !f || !y) return;
    const x = n.signerState || "active", I = n.recipientStage || 1, $ = n.activeStage || 1, R = n.activeRecipientIds || [], X = n.waitingForRecipientIds || [];
    let N = {
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
        N = {
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
        }, X.length > 0 && N.badges.push({
          icon: "iconoir-group",
          text: `${X.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        N = {
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
        N = {
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
        R.length > 1 ? (N.message = `You and ${R.length - 1} other signer(s) can sign now.`, N.badges = [
          { icon: "iconoir-users", text: `Stage ${$} active`, variant: "green" }
        ]) : I > 1 ? N.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${I}`, variant: "green" }
        ] : N.hidden = !0;
        break;
    }
    if (N.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${N.bgClass} ${N.borderClass}`, l.className = `${N.iconClass} mt-0.5`, p.className = `text-sm font-semibold ${N.titleClass}`, p.textContent = N.title, f.className = `text-xs ${N.messageClass} mt-1`, f.textContent = N.message, y.innerHTML = "", N.badges.forEach((Q) => {
      const Ae = document.createElement("span"), _e = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      Ae.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${_e[Q.variant] || _e.blue}`, Ae.innerHTML = `<i class="${Q.icon} mr-1"></i>${Q.text}`, y.appendChild(Ae);
    });
  }
  function wn() {
    n.fields.forEach((r) => {
      let l = null, p = !1;
      if (r.type === "checkbox")
        l = r.value_bool || !1, p = l;
      else if (r.type === "date_signed")
        l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], p = !0;
      else {
        const f = String(r.value_text || "");
        l = f || Oe(r), p = !!f;
      }
      a.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: l,
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
  async function ze() {
    try {
      const r = await d.load(a.profileKey);
      r && (a.profileData = r, a.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function Oe(r) {
    const l = a.profileData;
    if (!l) return "";
    const p = String(r?.type || "").trim();
    return p === "name" ? De(l.fullName || "") : p === "initials" ? De(l.initials || "") || ui(l.fullName || n.recipientName || "") : p === "signature" ? De(l.typedSignature || "") : "";
  }
  function Ge(r) {
    return !n.profile.persistDrawnSignature || !a.profileData ? "" : r?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function bt(r) {
    const l = De(r?.value || "");
    return l || (a.profileData ? r?.type === "initials" ? De(a.profileData.initials || "") || ui(a.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? De(a.profileData.typedSignature || "") : "" : "");
  }
  function tt() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : a.profileRemember;
  }
  async function lt(r = !1) {
    let l = null;
    try {
      await d.clear(a.profileKey);
    } catch (p) {
      l = p;
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
  async function dt(r, l = {}) {
    const p = tt();
    if (a.profileRemember = p, !p) {
      await lt(!0);
      return;
    }
    if (!r) return;
    const f = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const x = De(r.value);
      x && (f.fullName = x, (a.profileData?.initials || "").trim() || (f.initials = ui(x)));
    }
    if (y === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = De(r.value);
        x && (f.initials = x);
      }
    }
    if (y === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        f.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = De(r.value);
        x && (f.typedSignature = x);
      }
    }
    if (!(Object.keys(f).length === 1 && f.remember === !0))
      try {
        const x = await d.save(a.profileKey, f);
        a.profileData = x;
      } catch {
      }
  }
  function Qt() {
    const r = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    r && l && r.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function Zt() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function en() {
    const r = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= r) return;
    const l = [];
    for (a.renderedPages.forEach((p, f) => {
      const y = Math.abs(f - a.currentPage);
      l.push({ pageNum: f, distance: y });
    }), l.sort((p, f) => f.distance - p.distance); a.renderedPages.size > r && l.length > 0; ) {
      const p = l.shift();
      p && p.pageNum !== a.currentPage && a.renderedPages.delete(p.pageNum);
    }
  }
  function tn(r) {
    if (a.isLowMemory) return;
    const l = [];
    r > 1 && l.push(r - 1), r < n.pageCount && l.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      l.forEach(async (p) => {
        !a.renderedPages.has(p) && !a.pageRendering && await _t(p);
      });
    }, { timeout: 2e3 });
  }
  async function _t(r) {
    if (!(!a.pdfDoc || a.renderedPages.has(r)))
      try {
        const l = await a.pdfDoc.getPage(r), p = a.zoomLevel, f = l.getViewport({ scale: p * window.devicePixelRatio }), y = document.createElement("canvas"), x = y.getContext("2d");
        y.width = f.width, y.height = f.height;
        const I = {
          canvasContext: x,
          viewport: f
        };
        await l.render(I).promise, a.renderedPages.set(r, {
          canvas: y,
          scale: p,
          timestamp: Date.now()
        }), en();
      } catch (l) {
        console.warn("Preload failed for page", r, l);
      }
  }
  function Vn() {
    const r = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function Mt() {
    const r = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const p = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!p.ok)
        throw new Error("Failed to load document");
      const y = (await p.json()).assets || {}, x = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const I = pdfjsLib.getDocument(x);
      a.pdfDoc = await I.promise, n.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await Dt(1), Bt(), u.trackViewerLoad(!0, Date.now() - l), u.trackPageView(1);
    } catch (p) {
      console.error("PDF load error:", p), u.trackViewerLoad(!1, Date.now() - l, p.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Je();
    }
  }
  async function Dt(r) {
    if (!a.pdfDoc) return;
    const l = a.renderedPages.get(r);
    if (l && l.scale === a.zoomLevel) {
      bn(l), a.currentPage = r, document.getElementById("current-page").textContent = r, ut(), tn(r);
      return;
    }
    a.pageRendering = !0;
    try {
      const p = await a.pdfDoc.getPage(r), f = a.zoomLevel, y = Vn(), x = p.getViewport({ scale: f * y }), I = p.getViewport({ scale: 1 });
      B.setPageViewport(r, {
        width: I.width,
        height: I.height,
        rotation: I.rotation || 0
      });
      const $ = document.getElementById("pdf-page-1");
      $.innerHTML = "";
      const R = document.createElement("canvas"), X = R.getContext("2d");
      R.height = x.height, R.width = x.width, R.style.width = `${x.width / y}px`, R.style.height = `${x.height / y}px`, $.appendChild(R);
      const N = document.getElementById("pdf-container");
      N.style.width = `${x.width / y}px`;
      const Q = {
        canvasContext: X,
        viewport: x
      };
      await p.render(Q).promise, a.renderedPages.set(r, {
        canvas: R.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / y,
        displayHeight: x.height / y
      }), a.renderedPages.get(r).canvas.getContext("2d").drawImage(R, 0, 0), en(), a.currentPage = r, document.getElementById("current-page").textContent = r, ut(), u.trackPageView(r), tn(r);
    } catch (p) {
      console.error("Page render error:", p);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const p = a.pageNumPending;
        a.pageNumPending = null, await Dt(p);
      }
    }
  }
  function bn(r, l) {
    const p = document.getElementById("pdf-page-1");
    p.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = r.canvas.width, f.height = r.canvas.height, f.style.width = `${r.displayWidth}px`, f.style.height = `${r.displayHeight}px`, f.getContext("2d").drawImage(r.canvas, 0, 0), p.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${r.displayWidth}px`;
  }
  function nt(r) {
    a.pageRendering ? a.pageNumPending = r : Dt(r);
  }
  function de(r) {
    return typeof r.previewValueText == "string" && r.previewValueText.trim() !== "" ? De(r.previewValueText) : typeof r.value == "string" && r.value.trim() !== "" ? De(r.value) : "";
  }
  function Sn(r, l, p, f = !1) {
    const y = document.createElement("img");
    y.className = "field-overlay-preview", y.src = l, y.alt = p, r.appendChild(y), r.classList.add("has-preview"), f && r.classList.add("draft-preview");
  }
  function nn(r, l, p = !1, f = !1) {
    const y = document.createElement("span");
    y.className = "field-overlay-value", p && y.classList.add("font-signature"), y.textContent = l, r.appendChild(y), r.classList.add("has-value"), f && r.classList.add("draft-preview");
  }
  function sn(r, l) {
    const p = document.createElement("span");
    p.className = "field-overlay-label", p.textContent = l, r.appendChild(p);
  }
  function ut() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    a.fieldState.forEach((p, f) => {
      if (p.page !== a.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = f, p.required && y.classList.add("required"), p.completed && y.classList.add("completed"), a.activeFieldId === f && y.classList.add("active"), p.posX != null && p.posY != null && p.width != null && p.height != null) {
        const Q = B.getOverlayStyles(p, l);
        y.style.left = Q.left, y.style.top = Q.top, y.style.width = Q.width, y.style.height = Q.height, y.style.transform = Q.transform, Be.enabled && (y.dataset.debugCoords = JSON.stringify(
          B.pageToScreen(p, l)._debug
        ));
      } else {
        const Q = Array.from(a.fieldState.keys()).indexOf(f);
        y.style.left = "10px", y.style.top = `${100 + Q * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const I = String(p.previewSignatureUrl || "").trim(), $ = String(p.signaturePreviewUrl || "").trim(), R = de(p), X = p.type === "signature" || p.type === "initials", N = typeof p.previewValueBool == "boolean";
      if (I)
        Sn(y, I, Te(p.type), !0);
      else if (p.completed && $)
        Sn(y, $, Te(p.type));
      else if (R) {
        const Q = typeof p.previewValueText == "string" && p.previewValueText.trim() !== "";
        nn(y, R, X, Q);
      } else p.type === "checkbox" && (N ? p.previewValueBool : !!p.value) ? nn(y, "Checked", !1, N) : sn(y, Te(p.type));
      y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${Te(p.type)} field${p.required ? ", required" : ""}${p.completed ? ", completed" : ""}`), y.addEventListener("click", () => pt(f)), y.addEventListener("keydown", (Q) => {
        (Q.key === "Enter" || Q.key === " ") && (Q.preventDefault(), pt(f));
      }), r.appendChild(y);
    });
  }
  function Te(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function $t() {
    a.currentPage <= 1 || (nt(a.currentPage - 1), Bt());
  }
  function Wn() {
    a.currentPage >= n.pageCount || (nt(a.currentPage + 1), Bt());
  }
  function St(r) {
    r < 1 || r > n.pageCount || (nt(r), Bt());
  }
  function Bt() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= n.pageCount;
  }
  function it() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), z(), nt(a.currentPage);
  }
  function xn() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), z(), nt(a.currentPage);
  }
  function In() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, p = 612;
    a.zoomLevel = l / p, z(), nt(a.currentPage);
  }
  function z() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function pt(r) {
    if (!a.hasConsented && n.fields.some((l) => l.id === r && l.type !== "date_signed")) {
      Ne();
      return;
    }
    Ve(r, { openEditor: !0 });
  }
  function Ve(r, l = { openEditor: !0 }) {
    const p = a.fieldState.get(r);
    if (p) {
      if (l.openEditor && (a.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), p.page !== a.currentPage && St(p.page), !l.openEditor) {
        En(r);
        return;
      }
      p.type !== "date_signed" && Jn(r);
    }
  }
  function En(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Jn(r) {
    const l = a.fieldState.get(r);
    if (!l) return;
    const p = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = Ln(l.type), f.innerHTML = Yn(l), x?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && Cn(r), p.classList.add("active"), p.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", zt(p.querySelector(".field-editor")), oe(`Editing ${Ln(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const I = f.querySelector("input, textarea");
      I ? I.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), He(a.writeCooldownUntil) > 0 && An(He(a.writeCooldownUntil));
  }
  function Ln(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function Yn(r) {
    const l = Ft(r.type), p = Ze(String(r?.id || "")), f = Ze(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", x = Ze(bt(r)), I = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], $ = ke(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${I.map((R) => `
            <button
              type="button"
              id="sig-tab-${R.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${$ === R.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${R.id}"
              data-esign-action="signature-tab"
              data-field-id="${p}"
              role="tab"
              aria-selected="${$ === R.id ? "true" : "false"}"
              aria-controls="sig-editor-${R.id}"
              tabindex="${$ === R.id ? "0" : "-1"}"
            >
              ${R.label}
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
              data-field-id="${p}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${p}">${x}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${y} will appear as your ${f}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${$ === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${p}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${p}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${p}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${p}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-erase" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${p}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${$ === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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
          value="${Ze(String(r.value || ""))}"
          data-field-id="${p}"
        />
        ${l}
      `;
    if (r.type === "text") {
      const y = Ze(String(r.value || ""));
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
  function Ft(r) {
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
  function gt(r, l, p = { syncOverlay: !1 }) {
    const f = document.getElementById("sig-type-preview"), y = a.fieldState.get(r);
    if (!y) return;
    const x = De(String(l || "").trim());
    if (p?.syncOverlay && (x ? T(r, x) : v(r), b()), !!f) {
      if (x) {
        f.textContent = x;
        return;
      }
      f.textContent = y.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function ke(r) {
    const l = String(a.signatureTabByField.get(r) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function xt(r, l) {
    const p = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    a.signatureTabByField.set(l, p), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${p}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", p !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", p !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", p !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", p !== "saved"), (p === "draw" || p === "upload" || p === "saved") && f && requestAnimationFrame(() => Rt(l)), p === "type") {
      const y = document.getElementById("sig-type-input");
      gt(l, y?.value || "");
    }
    p === "saved" && me(l).catch($e);
  }
  function Cn(r) {
    a.signatureTabByField.set(r, "draw"), xt("draw", r);
    const l = document.getElementById("sig-type-input");
    l && gt(r, l.value || "");
  }
  function Rt(r) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || a.signatureCanvases.has(r)) return;
    const p = l.closest(".signature-canvas-container"), f = l.getContext("2d");
    if (!f) return;
    const y = l.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const x = window.devicePixelRatio || 1;
    l.width = y.width * x, l.height = y.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let I = !1, $ = 0, R = 0, X = [];
    const N = (J) => {
      const ae = l.getBoundingClientRect();
      let Ye, Ue;
      return J.touches && J.touches.length > 0 ? (Ye = J.touches[0].clientX, Ue = J.touches[0].clientY) : J.changedTouches && J.changedTouches.length > 0 ? (Ye = J.changedTouches[0].clientX, Ue = J.changedTouches[0].clientY) : (Ye = J.clientX, Ue = J.clientY), {
        x: Ye - ae.left,
        y: Ue - ae.top,
        timestamp: Date.now()
      };
    }, Q = (J) => {
      I = !0;
      const ae = N(J);
      $ = ae.x, R = ae.y, X = [{ x: ae.x, y: ae.y, t: ae.timestamp, width: 2.5 }], p && p.classList.add("drawing");
    }, Ae = (J) => {
      if (!I) return;
      const ae = N(J);
      X.push({ x: ae.x, y: ae.y, t: ae.timestamp, width: 2.5 });
      const Ye = ae.x - $, Ue = ae.y - R, Zn = ae.timestamp - (X[X.length - 2]?.t || ae.timestamp), Ct = Math.sqrt(Ye * Ye + Ue * Ue) / Math.max(Zn, 1), Ii = 2.5, L = 1.5, Ke = 4, Vt = Math.min(Ct / 5, 1), $n = Math.max(L, Math.min(Ke, Ii - Vt * 1.5));
      X[X.length - 1].width = $n, f.lineWidth = $n, f.beginPath(), f.moveTo($, R), f.lineTo(ae.x, ae.y), f.stroke(), $ = ae.x, R = ae.y;
    }, _e = () => {
      if (I = !1, X.length > 1) {
        const J = a.signatureCanvases.get(r);
        J && (J.strokes.push(X.map((ae) => ({ ...ae }))), J.redoStack = []), rn(r);
      }
      X = [], p && p.classList.remove("drawing");
    };
    l.addEventListener("mousedown", Q), l.addEventListener("mousemove", Ae), l.addEventListener("mouseup", _e), l.addEventListener("mouseout", _e), l.addEventListener("touchstart", (J) => {
      J.preventDefault(), J.stopPropagation(), Q(J);
    }, { passive: !1 }), l.addEventListener("touchmove", (J) => {
      J.preventDefault(), J.stopPropagation(), Ae(J);
    }, { passive: !1 }), l.addEventListener("touchend", (J) => {
      J.preventDefault(), _e();
    }, { passive: !1 }), l.addEventListener("touchcancel", _e), l.addEventListener("gesturestart", (J) => J.preventDefault()), l.addEventListener("gesturechange", (J) => J.preventDefault()), l.addEventListener("gestureend", (J) => J.preventDefault()), a.signatureCanvases.set(r, {
      canvas: l,
      ctx: f,
      dpr: x,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Ht(r);
  }
  function Ht(r) {
    const l = a.signatureCanvases.get(r), p = a.fieldState.get(r);
    if (!l || !p) return;
    const f = Ge(p);
    f && be(r, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function be(r, l, p = { clearStrokes: !1 }) {
    const f = a.signatureCanvases.get(r);
    if (!f) return !1;
    const y = String(l || "").trim();
    if (!y)
      return f.baseImageDataUrl = "", f.baseImage = null, p.clearStrokes && (f.strokes = [], f.redoStack = []), It(r), !0;
    const { drawWidth: x, drawHeight: I } = f, $ = new Image();
    return await new Promise((R) => {
      $.onload = () => {
        p.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = $, f.baseImageDataUrl = y, x > 0 && I > 0 && It(r), R(!0);
      }, $.onerror = () => R(!1), $.src = y;
    });
  }
  function It(r) {
    const l = a.signatureCanvases.get(r);
    if (!l) return;
    const { ctx: p, drawWidth: f, drawHeight: y, baseImage: x, strokes: I } = l;
    if (p.clearRect(0, 0, f, y), x) {
      const $ = Math.min(f / x.width, y / x.height), R = x.width * $, X = x.height * $, N = (f - R) / 2, Q = (y - X) / 2;
      p.drawImage(x, N, Q, R, X);
    }
    for (const $ of I)
      for (let R = 1; R < $.length; R++) {
        const X = $[R - 1], N = $[R];
        p.lineWidth = Number(N.width || 2.5) || 2.5, p.beginPath(), p.moveTo(X.x, X.y), p.lineTo(N.x, N.y), p.stroke();
      }
  }
  function kn(r) {
    const l = a.signatureCanvases.get(r);
    if (!l || l.strokes.length === 0) return;
    const p = l.strokes.pop();
    p && l.redoStack.push(p), It(r), rn(r);
  }
  function Kn(r) {
    const l = a.signatureCanvases.get(r);
    if (!l || l.redoStack.length === 0) return;
    const p = l.redoStack.pop();
    p && l.strokes.push(p), It(r), rn(r);
  }
  function Nt(r) {
    const l = a.signatureCanvases.get(r);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: p, ctx: f } = l;
    return f.getImageData(0, 0, p.width, p.height).data.some((x, I) => I % 4 === 3 && x > 0);
  }
  function rn(r) {
    const l = a.signatureCanvases.get(r);
    l && (Nt(r) ? F(r, l.canvas.toDataURL("image/png")) : v(r), b());
  }
  function Ut(r) {
    const l = a.signatureCanvases.get(r);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", It(r)), v(r), b();
    const p = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    p && p.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function ve() {
    const r = document.getElementById("field-editor-overlay"), l = r.querySelector(".field-editor");
    if (Ot(l), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const p = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        p?.focus();
      });
    }
    E(), b(), a.activeFieldId = null, a.signatureCanvases.clear(), oe("Field editor closed.");
  }
  function He(r) {
    const l = Number(r) || 0;
    return l <= 0 ? 0 : Math.max(0, Math.ceil((l - Date.now()) / 1e3));
  }
  function an(r, l = {}) {
    const p = Number(l.retry_after_seconds);
    if (Number.isFinite(p) && p > 0)
      return Math.ceil(p);
    const f = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const y = Number(f);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function We(r, l) {
    let p = {};
    try {
      p = await r.json();
    } catch {
      p = {};
    }
    const f = p?.error || {}, y = f?.details && typeof f.details == "object" ? f.details : {}, x = an(r, y), I = r?.status === 429, $ = I ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || l || "Request failed"), R = new Error($);
    return R.status = r?.status || 0, R.code = String(f?.code || ""), R.details = y, R.rateLimited = I, R.retryAfterSeconds = x, R;
  }
  function An(r) {
    const l = Math.max(1, Number(r) || 1);
    a.writeCooldownUntil = Date.now() + l * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const p = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const y = He(a.writeCooldownUntil);
      if (y <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    p(), a.writeCooldownTimer = setInterval(p, 250);
  }
  function Pn(r) {
    const l = Math.max(1, Number(r) || 1);
    a.submitCooldownUntil = Date.now() + l * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const p = () => {
      const f = He(a.submitCooldownUntil);
      mt(), f <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    p(), a.submitCooldownTimer = setInterval(p, 250);
  }
  async function we() {
    const r = a.activeFieldId;
    if (!r) return;
    const l = a.fieldState.get(r);
    if (!l) return;
    const p = He(a.writeCooldownUntil);
    if (p > 0) {
      const y = `Please wait ${p}s before saving again.`;
      window.toastManager && window.toastManager.error(y), oe(y, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = tt();
      let y = !1;
      if (l.type === "signature" || l.type === "initials")
        y = await Tn(r);
      else if (l.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        y = await on(r, null, x?.checked || !1);
      } else {
        const I = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!I && l.required)
          throw new Error("This field is required");
        y = await on(r, I, null);
      }
      if (y) {
        ve(), Et(), mt(), gn(), ut(), _n(r), Xn(r);
        const x = Lt();
        x.allRequiredComplete ? oe("Field saved. All required fields complete. Ready to submit.") : oe(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && An(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), oe(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (He(a.writeCooldownUntil) > 0) {
        const y = He(a.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function Tn(r) {
    const l = a.fieldState.get(r), p = document.getElementById("sig-type-input"), f = ke(r);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = a.signatureCanvases.get(r);
      if (!x) return !1;
      if (!Nt(r))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const I = x.canvas.toDataURL("image/png");
      return await cn(r, { type: "drawn", dataUrl: I }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = p?.value?.trim();
      if (!x)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await on(r, x, null) : await cn(r, { type: "typed", text: x }, x);
    }
  }
  async function on(r, l, p) {
    a.pendingSaves.add(r);
    const f = Date.now(), y = a.fieldState.get(r);
    try {
      const x = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: l,
          value_bool: p
        })
      });
      if (!x.ok)
        throw await We(x, "Failed to save field");
      const I = a.fieldState.get(r);
      return I && (I.value = l ?? p, I.completed = !0, I.hasError = !1), await dt(I), window.toastManager && window.toastManager.success("Field saved"), u.trackFieldSave(r, I?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = x.message), u.trackFieldSave(r, y?.type, !1, Date.now() - f, x.message), x;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function cn(r, l, p) {
    a.pendingSaves.add(r);
    const f = Date.now(), y = l?.type || "typed";
    try {
      let x;
      if (y === "drawn") {
        const R = await G.uploadDrawnSignature(
          r,
          l.dataUrl
        );
        x = {
          field_instance_id: r,
          type: "drawn",
          value_text: p,
          object_key: R.objectKey,
          sha256: R.sha256,
          upload_token: R.uploadToken
        };
      } else
        x = await ln(r, p);
      const I = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!I.ok)
        throw await We(I, "Failed to save signature");
      const $ = a.fieldState.get(r);
      return $ && ($.value = p, $.completed = !0, $.hasError = !1, l?.dataUrl && ($.signaturePreviewUrl = l.dataUrl)), await dt($, {
        signatureType: y,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), u.trackSignatureAttach(r, y, !0, Date.now() - f), !0;
    } catch (x) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = x.message), u.trackSignatureAttach(r, y, !1, Date.now() - f, x.message), x;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function ln(r, l) {
    const p = `${l}|${r}`, f = await dn(p), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: l,
      object_key: y,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function dn(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const l = new TextEncoder().encode(r), p = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(p)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Et() {
    let r = 0;
    a.fieldState.forEach(($) => {
      $.required, $.completed && r++;
    });
    const l = a.fieldState.size, p = l > 0 ? r / l * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = l;
    const f = document.getElementById("progress-ring-circle"), y = 97.4, x = y - p / 100 * y;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${p}%`;
    const I = l - r;
    document.getElementById("fields-status").textContent = I > 0 ? `${I} remaining` : "All complete";
  }
  function mt() {
    const r = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), p = document.getElementById("incomplete-message"), f = He(a.submitCooldownUntil);
    let y = [], x = !1;
    a.fieldState.forEach(($, R) => {
      $.required && !$.completed && y.push($), $.hasError && (x = !0);
    });
    const I = a.hasConsented && y.length === 0 && !x && a.pendingSaves.size === 0 && f === 0 && !a.isSubmitting;
    r.disabled = !I, !a.isSubmitting && f > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !a.isSubmitting && f === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? f > 0 ? (l.classList.remove("hidden"), p.textContent = `Please wait ${f}s before submitting again.`) : x ? (l.classList.remove("hidden"), p.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (l.classList.remove("hidden"), p.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), p.textContent = "Please accept the consent agreement");
  }
  function _n(r) {
    const l = a.fieldState.get(r), p = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!p || !l)) {
      if (l.completed) {
        p.classList.add("completed"), p.classList.remove("error");
        const f = p.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), f.classList.add("bg-green-100", "text-green-600"), f.innerHTML = '<i class="iconoir-check"></i>';
      } else if (l.hasError) {
        p.classList.remove("completed"), p.classList.add("error");
        const f = p.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), f.classList.add("bg-red-100", "text-red-600"), f.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function un() {
    const r = Array.from(a.fieldState.values()).filter((l) => l.required);
    return r.sort((l, p) => {
      const f = Number(l.page || 0), y = Number(p.page || 0);
      if (f !== y) return f - y;
      const x = Number(l.tabIndex || 0), I = Number(p.tabIndex || 0);
      if (x > 0 && I > 0 && x !== I) return x - I;
      if (x > 0 != I > 0) return x > 0 ? -1 : 1;
      const $ = Number(l.posY || 0), R = Number(p.posY || 0);
      if ($ !== R) return $ - R;
      const X = Number(l.posX || 0), N = Number(p.posX || 0);
      return X !== N ? X - N : String(l.id || "").localeCompare(String(p.id || ""));
    }), r;
  }
  function Mn(r) {
    a.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((l) => l.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((l) => l.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function Xn(r) {
    const l = un(), p = l.filter((I) => !I.completed);
    if (p.length === 0) {
      u.track("guided_next_none_remaining", { fromFieldId: r });
      const I = document.getElementById("submit-btn");
      I?.scrollIntoView({ behavior: "smooth", block: "nearest" }), I?.focus(), oe("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const f = l.findIndex((I) => String(I.id) === String(r));
    let y = null;
    if (f >= 0) {
      for (let I = f + 1; I < l.length; I++)
        if (!l[I].completed) {
          y = l[I];
          break;
        }
    }
    if (y || (y = p[0]), !y) return;
    u.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const x = Number(y.page || 1);
    x !== a.currentPage && St(x), Ve(y.id, { openEditor: !1 }), Mn(y.id), setTimeout(() => {
      Mn(y.id), En(y.id), u.track("guided_next_completed", { toFieldId: y.id, page: y.page }), oe(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function Ne() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", zt(r.querySelector(".field-editor")), oe("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function pn() {
    const r = document.getElementById("consent-modal"), l = r.querySelector(".field-editor");
    Ot(l), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", oe("Consent dialog closed.");
  }
  async function qt() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const l = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!l.ok)
        throw await We(l, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), pn(), mt(), gn(), u.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), oe("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), oe(`Error: ${l.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function Qn() {
    const r = document.getElementById("submit-btn"), l = He(a.submitCooldownUntil);
    if (l > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${l}s before submitting again.`), mt();
      return;
    }
    a.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const p = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": p }
      });
      if (!f.ok)
        throw await We(f, "Failed to submit");
      u.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (p) {
      u.trackSubmit(!1, p.message), p?.rateLimited && Pn(p.retryAfterSeconds), window.toastManager && window.toastManager.error(p.message);
    } finally {
      a.isSubmitting = !1, mt();
    }
  }
  function st() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", zt(r.querySelector(".field-editor")), oe("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Ie() {
    const r = document.getElementById("decline-modal"), l = r.querySelector(".field-editor");
    Ot(l), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", oe("Decline dialog closed.");
  }
  async function jt() {
    const r = document.getElementById("decline-reason").value;
    try {
      const l = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!l.ok)
        throw await We(l, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message);
    }
  }
  function Je() {
    u.trackDegradedMode("viewer_load_failure"), u.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Dn() {
    try {
      const r = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!r.ok) throw new Error("Document unavailable");
      const p = (await r.json()).assets || {}, f = p.source_url || p.executed_url || p.certificate_url;
      if (f)
        window.open(f, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (r) {
      window.toastManager && window.toastManager.error(r.message || "Unable to download document");
    }
  }
  const Be = {
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
      r?.forEach((f) => {
        f.completed && l++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${l}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
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
          fields: Array.from(a.fieldState?.entries() || []).map(([r, l]) => ({
            id: r,
            type: l.type,
            completed: l.completed,
            hasError: l.hasError
          })),
          telemetry: u.getSessionSummary(),
          errors: u.metrics.errorsEncountered
        }),
        getEvents: () => u.events,
        forceError: (r) => {
          u.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), Mt();
        },
        setLowMemory: (r) => {
          a.isLowMemory = r, en(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Mt(), this.updatePanel();
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
  function oe(r, l = "polite") {
    const p = l === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    p && (p.textContent = "", requestAnimationFrame(() => {
      p.textContent = r;
    }));
  }
  function zt(r) {
    const p = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = p[0], y = p[p.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function x(I) {
      I.key === "Tab" && (I.shiftKey ? document.activeElement === f && (I.preventDefault(), y?.focus()) : document.activeElement === y && (I.preventDefault(), f?.focus()));
    }
    r.addEventListener("keydown", x), r._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function Ot(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const l = r.dataset.previousFocus;
    if (l) {
      const p = document.getElementById(l);
      requestAnimationFrame(() => {
        p?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function gn() {
    const r = Lt(), l = document.getElementById("submit-status");
    l && (r.allRequiredComplete && a.hasConsented ? l.textContent = "All required fields complete. You can now submit." : a.hasConsented ? l.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : l.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Lt() {
    let r = 0, l = 0, p = 0;
    return a.fieldState.forEach((f) => {
      f.required && l++, f.completed && r++, f.required && !f.completed && p++;
    }), {
      completed: r,
      required: l,
      remainingRequired: p,
      total: a.fieldState.size,
      allRequiredComplete: p === 0
    };
  }
  function Gt(r, l = 1) {
    const p = Array.from(a.fieldState.keys()), f = p.indexOf(r);
    if (f === -1) return null;
    const y = f + l;
    return y >= 0 && y < p.length ? p[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (ve(), pn(), Ie()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), p = l.indexOf(r.target);
      if (p !== -1) {
        let f = p;
        if (r.key === "ArrowRight" && (f = (p + 1) % l.length), r.key === "ArrowLeft" && (f = (p - 1 + l.length) % l.length), r.key === "Home" && (f = 0), r.key === "End" && (f = l.length - 1), f !== p) {
          r.preventDefault();
          const y = l[f], x = y.getAttribute("data-tab") || "draw", I = y.getAttribute("data-field-id");
          I && xt(x, I), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const l = r.target.dataset.fieldId, p = r.key === "ArrowDown" ? 1 : -1, f = Gt(l, p);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const l = r.target.dataset.fieldId;
        l && pt(l);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class cs {
  constructor(e) {
    this.config = e;
  }
  init() {
    Ur(this.config);
  }
  destroy() {
  }
}
function Oa(i) {
  const e = new cs(i);
  return te(() => e.init()), e;
}
function qr() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && te(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = qr();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new cs(e);
  t.init(), window.esignSignerReviewController = t;
});
class ls {
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
    Pt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Pt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
  const e = new ls(i);
  return te(() => e.init()), e;
}
function Va(i = {}) {
  const e = new ls(i);
  te(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class wi {
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
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), s && s.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (d) => {
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
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), d = this.elements.canvas, u = d.getContext("2d");
        if (!u)
          throw new Error("Failed to get canvas context");
        d.height = s.height, d.width = s.width, await n.render({
          canvasContext: u,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: s } = this.elements, d = this.pdfDoc?.numPages || 1;
    s && s.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= d);
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
    e && P(e), t && D(t), n && P(n), s && P(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && P(e), t && P(t), n && P(n), s && D(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: d, viewer: u } = this.elements;
    t && P(t), n && P(n), s && D(s), u && P(u), d && (d.textContent = e);
  }
}
function Wa(i) {
  const e = new wi(i);
  return e.init(), e;
}
function Ja(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new wi(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && te(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new wi({
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
function jr(i) {
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
function zr(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Or(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((d) => d !== s)] : n;
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
    type: jr(e.type),
    options: zr(e.options),
    operators: Or(e.operators, e.default_operator)
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
    const n = e?.fields ? Object.entries(e.fields).map(([u, a]) => `${u}: ${a}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", d = e?.message || `${i} failed`;
    t.error(n ? `${s}${d}: ${n}` : `${s}${d}`);
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
}, On = "application/vnd.google-apps.document", bi = "application/vnd.google-apps.spreadsheet", Si = "application/vnd.google-apps.presentation", ds = "application/vnd.google-apps.folder", xi = "application/pdf", Gr = [On, xi], us = "esign.google.account_id";
function Vr(i) {
  return i.mimeType === On;
}
function Wr(i) {
  return i.mimeType === xi;
}
function Yt(i) {
  return i.mimeType === ds;
}
function Jr(i) {
  return Gr.includes(i.mimeType);
}
function ao(i) {
  return i.mimeType === On || i.mimeType === bi || i.mimeType === Si;
}
function Yr(i) {
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
  return i.map(Yr);
}
function ps(i) {
  return {
    [On]: "Google Doc",
    [bi]: "Google Sheet",
    [Si]: "Google Slides",
    [ds]: "Folder",
    [xi]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Kr(i) {
  return Yt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Vr(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Wr(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === bi ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Si ? {
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
function Xr(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Qr(i) {
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
    return Un(t);
  if (e)
    return Un(e);
  const n = localStorage.getItem(us);
  return n ? Un(n) : "";
}
function Un(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function lo(i) {
  const e = Un(i);
  e && localStorage.setItem(us, e);
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
function Kt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Zr(i) {
  const e = Kr(i);
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
    const d = s === t.length - 1, u = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return d ? `${u}<span class="text-gray-900 font-medium">${Kt(n.name)}</span>` : `${u}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${Kt(n.name)}</button>`;
  }).join("");
}
function ea(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, d = Zr(i), u = Yt(i), a = Jr(i), b = u ? "cursor-pointer hover:bg-gray-50" : a ? "cursor-pointer hover:bg-blue-50" : "opacity-60", v = u ? `data-folder-id="${i.id}" data-folder-name="${Kt(i.name)}"` : a && t ? `data-file-id="${i.id}" data-file-name="${Kt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${b} file-item"
      ${v}
      role="listitem"
      ${a ? 'tabindex="0"' : ""}
    >
      ${d}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${Kt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${ps(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Xr(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${Qr(i.modifiedTime)}` : ""}
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
        <p>${Kt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((d, u) => Yt(d) && !Yt(u) ? -1 : !Yt(d) && Yt(u) ? 1 : d.name.localeCompare(u.name)).map((d) => ea(d, { selectable: n })).join("")}
    </div>
  `;
}
function fo(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: ps(i.mimeType)
  };
}
export {
  Js as AGREEMENT_STATUS_BADGES,
  os as AgreementFormController,
  wi as DocumentDetailPreviewController,
  vi as DocumentFormController,
  zs as ESignAPIClient,
  Os as ESignAPIError,
  us as GOOGLE_ACCOUNT_STORAGE_KEY,
  Ki as GoogleCallbackController,
  Qi as GoogleDrivePickerController,
  Xi as GoogleIntegrationController,
  Gr as IMPORTABLE_MIME_TYPES,
  ts as IntegrationConflictsController,
  Zi as IntegrationHealthController,
  es as IntegrationMappingsController,
  ns as IntegrationSyncRunsController,
  yi as LandingPageController,
  On as MIME_GOOGLE_DOC,
  ds as MIME_GOOGLE_FOLDER,
  bi as MIME_GOOGLE_SHEET,
  Si as MIME_GOOGLE_SLIDES,
  xi as MIME_PDF,
  Ya as PanelPaginationBehavior,
  Ka as PanelSearchBehavior,
  ro as STANDARD_GRID_SELECTORS,
  Yi as SignerCompletePageController,
  ls as SignerErrorPageController,
  cs as SignerReviewController,
  Se as announce,
  uo as applyAccountIdToPath,
  er as applyDetailFormatters,
  _r as bootstrapAgreementForm,
  Ja as bootstrapDocumentDetailPreview,
  ja as bootstrapDocumentForm,
  Aa as bootstrapGoogleCallback,
  Ma as bootstrapGoogleDrivePicker,
  Ta as bootstrapGoogleIntegration,
  Ha as bootstrapIntegrationConflicts,
  $a as bootstrapIntegrationHealth,
  Fa as bootstrapIntegrationMappings,
  Ua as bootstrapIntegrationSyncRuns,
  Ea as bootstrapLandingPage,
  Ca as bootstrapSignerCompletePage,
  Va as bootstrapSignerErrorPage,
  Ur as bootstrapSignerReview,
  po as buildScopedApiUrl,
  pa as byId,
  Ws as capitalize,
  Vs as createESignClient,
  Ks as createElement,
  so as createSchemaActionCachingRefresh,
  fo as createSelectedFile,
  da as createStatusBadgeElement,
  Sa as createTimeoutController,
  Za as dateTimeCellRenderer,
  jn as debounce,
  no as defaultActionErrorHandler,
  to as defaultActionSuccessHandler,
  ma as delegate,
  Kt as escapeHtml,
  eo as fileSizeCellRenderer,
  sa as formatDate,
  qn as formatDateTime,
  Qr as formatDriveDate,
  Xr as formatDriveFileSize,
  Fn as formatFileSize,
  ia as formatPageCount,
  oa as formatRecipientCount,
  aa as formatRelativeTime,
  Qs as formatSizeElements,
  ra as formatTime,
  Zs as formatTimestampElements,
  Wi as getAgreementStatusBadge,
  na as getESignClient,
  Kr as getFileIconConfig,
  ps as getFileTypeName,
  Xs as getPageConfig,
  P as hide,
  za as initAgreementForm,
  tr as initDetailFormatters,
  Wa as initDocumentDetailPreview,
  qa as initDocumentForm,
  ka as initGoogleCallback,
  _a as initGoogleDrivePicker,
  Pa as initGoogleIntegration,
  Ra as initIntegrationConflicts,
  Da as initIntegrationHealth,
  Ba as initIntegrationMappings,
  Na as initIntegrationSyncRuns,
  Ia as initLandingPage,
  La as initSignerCompletePage,
  Ga as initSignerErrorPage,
  Oa as initSignerReview,
  Yt as isFolder,
  Vr as isGoogleDoc,
  ao as isGoogleWorkspaceFile,
  Jr as isImportable,
  Wr as isPDF,
  Un as normalizeAccountId,
  Yr as normalizeDriveFile,
  oo as normalizeDriveFiles,
  Or as normalizeFilterOperators,
  zr as normalizeFilterOptions,
  jr as normalizeFilterType,
  ga as on,
  te as onReady,
  va as poll,
  Qa as prepareFilterFields,
  Xa as prepareGridColumns,
  m as qs,
  Pt as qsa,
  mo as renderBreadcrumb,
  Zr as renderFileIcon,
  ea as renderFileItem,
  ho as renderFileList,
  Ys as renderStatusBadge,
  co as resolveAccountId,
  wa as retry,
  lo as saveAccountId,
  Gs as setESignClient,
  fa as setLoading,
  io as setupRefreshButton,
  D as show,
  Ji as sleep,
  ca as snakeToTitle,
  go as syncAccountIdToUrl,
  ba as throttle,
  ha as toggle,
  la as truncate,
  yn as updateDataText,
  ya as updateDataTexts,
  ua as updateStatusBadge,
  xa as withTimeout
};
//# sourceMappingURL=index.js.map

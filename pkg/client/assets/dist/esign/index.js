import { e as Qe } from "../chunks/html-DyksyvcZ.js";
class nr {
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
    const u = (l.sent || 0) + (l.in_progress || 0), o = u + (l.declined || 0);
    return {
      draft: l.draft || 0,
      sent: l.sent || 0,
      in_progress: l.in_progress || 0,
      completed: l.completed || 0,
      voided: l.voided || 0,
      declined: l.declined || 0,
      expired: l.expired || 0,
      pending: u,
      action_required: o
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
      throw new ir(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class ir extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let wi = null;
function fa() {
  if (!wi)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return wi;
}
function sr(i) {
  wi = i;
}
function rr(i) {
  const e = new nr(i);
  return sr(e), e;
}
function jn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ya(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Wn(i, e) {
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
function va(i, e) {
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
function wa(i, e) {
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
function ba(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), l = Math.round(s / 60), u = Math.round(l / 60), o = Math.round(u / 24), S = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(o) >= 1 ? S.format(o, "day") : Math.abs(u) >= 1 ? S.format(u, "hour") : Math.abs(l) >= 1 ? S.format(l, "minute") : S.format(s, "second");
  } catch {
    return String(i);
  }
}
function Sa(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function ar(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function xa(i) {
  return i ? i.split("_").map((e) => ar(e)).join(" ") : "";
}
function Ia(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const or = {
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
function ns(i) {
  const e = String(i || "").trim().toLowerCase();
  return or[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function cr(i, e) {
  const t = ns(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", l = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, u = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${l[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${u}${t.label}</span>`;
}
function Ea(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = cr(i, e), t.firstElementChild;
}
function La(i, e, t) {
  const n = ns(e), s = t?.size ?? "sm", l = {
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
  const o = i.childNodes[i.childNodes.length - 1];
  o && o.nodeType === Node.TEXT_NODE ? o.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function m(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function Dt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function Ca(i) {
  return document.getElementById(i);
}
function lr(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, l] of Object.entries(e))
      l !== void 0 && n.setAttribute(s, l);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function ka(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function Pa(i, e, t, n, s) {
  const l = (u) => {
    const o = u.target.closest(e);
    o && i.contains(o) && n.call(o, u, o);
  };
  return i.addEventListener(t, l, s), () => i.removeEventListener(t, l, s);
}
function te(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function $(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function A(i) {
  i && i.classList.add("hidden");
}
function Aa(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? $(i) : A(i);
}
function Ta(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function bn(i, e, t = document) {
  const n = m(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function _a(i, e = document) {
  for (const [t, n] of Object.entries(i))
    bn(t, n, e);
}
function dr(i = "[data-esign-page]", e = "data-esign-config") {
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
function Le(i, e = "polite") {
  const t = m(`[aria-live="${e}"]`) || (() => {
    const n = lr("div", {
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
async function Da(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: l = 30,
    onProgress: u,
    signal: o
  } = i, S = Date.now();
  let v = 0, E;
  for (; v < l; ) {
    if (o?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - S >= s)
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
    await is(n, o);
  }
  return {
    result: E,
    attempts: v,
    stopped: !1,
    timedOut: !1
  };
}
async function Ma(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: l = !0,
    shouldRetry: u = () => !0,
    onRetry: o,
    signal: S
  } = i;
  let v;
  for (let E = 1; E <= t; E++) {
    if (S?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (T) {
      if (v = T, E >= t || !u(T, E))
        throw T;
      const H = l ? Math.min(n * Math.pow(2, E - 1), s) : n;
      o && o(T, E, H), await is(H, S);
    }
  }
  throw v;
}
function is(i, e) {
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
function Jn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function $a(i, e) {
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
function Ba(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Fa(i, e, t = "Operation timed out") {
  let n;
  const s = new Promise((l, u) => {
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
class Ei {
  constructor(e) {
    this.config = e, this.client = rr({
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
    bn('count="draft"', e.draft), bn('count="pending"', e.pending), bn('count="completed"', e.completed), bn('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Ra(i) {
  const e = i || dr(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Ei(e);
  return te(() => t.init()), t;
}
function Ha(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new Ei(t);
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
      const s = String(n.basePath || n.base_path || "/admin"), l = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new Ei({ basePath: s, apiBasePath: l }).init();
    }
  }
});
class ss {
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
      s && (n === e ? $(s) : A(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = m("#artifact-executed"), n = m("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), $(t));
    }
    if (e.source) {
      const t = m("#artifact-source"), n = m("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), $(t));
    }
    if (e.certificate) {
      const t = m("#artifact-certificate"), n = m("#artifact-certificate-link");
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
function Na(i) {
  const e = new ss(i);
  return te(() => e.init()), e;
}
function Ua(i) {
  const e = new ss(i);
  te(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function ur(i = document) {
  Dt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = jn(t));
  });
}
function pr(i = document) {
  Dt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Wn(t));
  });
}
function gr(i = document) {
  ur(i), pr(i);
}
function mr() {
  te(() => {
    gr();
  });
}
typeof document < "u" && mr();
const qi = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class rs {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), l = e.get("state"), u = this.parseOAuthState(l);
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
    switch (A(t), A(n), A(s), e) {
      case "loading":
        $(t);
        break;
      case "success":
        $(n);
        break;
      case "error":
        $(s);
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
    const { errorMessage: s, errorDetail: l, closeBtn: u } = this.elements;
    s && (s.textContent = qi[e] || qi.unknown), t && l && (l.textContent = t, $(l)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), l = s.get("state"), o = this.parseOAuthState(l).account_id || s.get("account_id");
      o && n.searchParams.set("account_id", o), window.location.href = n.toString();
    }
  }
}
function qa(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new rs(e);
  return te(() => t.init()), t;
}
function ja(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new rs(e);
  te(() => t.init());
}
const gi = "esign.google.account_id", hr = {
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
class as {
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
      oauthCancelBtn: u,
      disconnectCancelBtn: o,
      disconnectConfirmBtn: S,
      accountIdInput: v,
      oauthModal: E,
      disconnectModal: T
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), l && l.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, T && $(T);
    }), o && o.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, T && A(T);
    }), S && S.addEventListener("click", () => this.disconnect()), u && u.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), v && (v.addEventListener("change", () => {
      this.setCurrentAccountId(v.value, !0);
    }), v.addEventListener("keydown", (F) => {
      F.key === "Enter" && (F.preventDefault(), this.setCurrentAccountId(v.value, !0));
    }));
    const { accountDropdown: H, connectFirstBtn: R } = this.elements;
    H && H.addEventListener("change", () => {
      H.value === "__new__" ? (H.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(H.value, !0);
    }), R && R.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), T && !T.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, A(T)));
    }), [E, T].forEach((F) => {
      F && F.addEventListener("click", (G) => {
        const J = G.target;
        (J === F || J.getAttribute("aria-hidden") === "true") && (A(F), F === E ? this.cancelOAuthFlow() : F === T && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(gi)
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
      this.currentAccountId ? window.localStorage.setItem(gi, this.currentAccountId) : window.localStorage.removeItem(gi);
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
    t && (t.textContent = e), Le(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: l } = this.elements;
    switch (A(t), A(n), A(s), A(l), e) {
      case "loading":
        $(t);
        break;
      case "disconnected":
        $(n);
        break;
      case "connected":
        $(s);
        break;
      case "error":
        $(l);
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
          const u = await e.json();
          u?.error?.message && (l = u.error.message);
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
    const t = (G, J) => {
      for (const K of G)
        if (Object.prototype.hasOwnProperty.call(e, K) && e[K] !== void 0 && e[K] !== null)
          return e[K];
      return J;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), l = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), u = t(["connected", "Connected"], !1), o = t(["degraded", "Degraded"], !1), S = t(["degraded_reason", "DegradedReason"], ""), v = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), T = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let H = t(["is_expired", "IsExpired"], void 0), R = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof H != "boolean" || typeof R != "boolean") && n) {
      const G = new Date(n);
      if (!Number.isNaN(G.getTime())) {
        const J = G.getTime() - Date.now(), K = 5 * 60 * 1e3;
        H = J <= 0, R = J > 0 && J <= K;
      }
    }
    const F = typeof T == "boolean" ? T : (H === !0 || R === !0) && !E;
    return {
      connected: u,
      account_id: l,
      email: v,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: H === !0,
      is_expiring_soon: R === !0,
      can_auto_refresh: E,
      needs_reauthorization: F,
      degraded: o,
      degraded_reason: S
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: l, reauthWarning: u, reauthReason: o } = this.elements;
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
        const s = hr[n] || { label: n, description: "" };
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
    const { expiryInfo: u, reauthWarning: o, reauthReason: S } = this.elements;
    if (!u) return;
    if (u.classList.remove("text-red-600", "text-amber-600"), u.classList.add("text-gray-500"), !e) {
      u.textContent = "Access token status unknown", o && A(o);
      return;
    }
    const v = new Date(e), E = /* @__PURE__ */ new Date(), T = Math.max(
      1,
      Math.round((v.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? s ? (u.textContent = "Access token expired, but refresh is available and will be applied automatically.", u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), o && A(o)) : (u.textContent = "Access token has expired. Please re-authorize.", u.classList.remove("text-gray-500"), u.classList.add("text-red-600"), o && $(o), S && (S.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), s ? (u.textContent = `Token expires in approximately ${T} minute${T !== 1 ? "s" : ""}. Refresh is available automatically.`, o && A(o)) : (u.textContent = `Token expires in approximately ${T} minute${T !== 1 ? "s" : ""}`, o && $(o), S && (S.textContent = `Your access token will expire in ${T} minute${T !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (u.textContent = `Token valid until ${v.toLocaleDateString()} ${v.toLocaleTimeString()}`, o && A(o)), !l && o && A(o);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? ($(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : A(n));
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
      const u = this.normalizeAccountId(l.account_id);
      if (n.has(u))
        continue;
      n.add(u);
      const o = document.createElement("option");
      o.value = u;
      const S = l.email || u || "Default", v = l.status !== "connected" ? ` (${l.status})` : "";
      o.textContent = `${S}${v}`, u === this.currentAccountId && (o.selected = !0), e.appendChild(o);
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
    if (e && A(e), this.accounts.length === 0) {
      t && $(t), n && A(n);
      return;
    }
    t && A(t), n && ($(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, u = t ? "ring-2 ring-blue-500" : "", o = n[e.status] || "bg-white border-gray-200", S = s[e.status] || "bg-gray-100 text-gray-700", v = l[e.status] || e.status, E = e.account_id || "default", T = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${o} ${u} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
        const o = l.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(o, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (l) => {
        const o = l.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(o, !1), this.startOAuthFlow(o);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (l) => {
        const o = l.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = o, t && $(t);
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
    const s = this.resolveOAuthRedirectURI(), l = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = l;
    const u = this.buildGoogleOAuthUrl(s, l);
    if (!u) {
      t && A(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const o = 500, S = 600, v = (window.screen.width - o) / 2, E = (window.screen.height - S) / 2;
    if (this.oauthWindow = window.open(
      u,
      "google_oauth",
      `width=${o},height=${S},left=${v},top=${E},popup=yes`
    ), !this.oauthWindow) {
      t && A(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (T) => this.handleOAuthCallback(T), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && A(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    if (this.cleanupOAuthFlow(), n && A(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const s = this.resolveOAuthRedirectURI(), u = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        u !== this.currentAccountId && this.setCurrentAccountId(u, !1);
        const o = await fetch(
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
        if (!o.ok) {
          const S = await o.json();
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
    e && A(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && A(e);
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
function za(i) {
  const e = new as(i);
  return te(() => e.init()), e;
}
function Oa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new as(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const mi = "esign.google.account_id", ji = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, zi = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class os {
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
      clearSelectionBtn: u,
      importCancelBtn: o,
      importConfirmBtn: S,
      importForm: v,
      importModal: E,
      viewListBtn: T,
      viewGridBtn: H
    } = this.elements;
    if (e) {
      const F = Jn(() => this.handleSearch(), 300);
      e.addEventListener("input", F), e.addEventListener("keydown", (G) => {
        G.key === "Enter" && (G.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), l && l.addEventListener("click", () => this.showImportModal()), u && u.addEventListener("click", () => this.clearSelection()), o && o.addEventListener("click", () => this.hideImportModal()), S && v && v.addEventListener("submit", (F) => {
      F.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (F) => {
      const G = F.target;
      (G === E || G.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), T && T.addEventListener("click", () => this.setViewMode("list")), H && H.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && E && !E.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: R } = this.elements;
    R && R.addEventListener("click", (F) => this.handleFileListClick(F));
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
        window.localStorage.getItem(mi)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : A(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(mi, this.currentAccountId) : window.localStorage.removeItem(mi);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), l = String(e.modifiedTime || e.ModifiedTime || "").trim(), u = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), o = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : o ? [o] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: l,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && $(t));
    try {
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      let l;
      this.searchQuery ? l = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : l = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (l += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const u = await fetch(l, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!u.ok)
        throw new Error(`Failed to load files: ${u.status}`);
      const o = await u.json(), S = Array.isArray(o.files) ? o.files.map((v) => this.normalizeDriveFile(v)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...S] : this.currentFiles = S, this.nextPageToken = o.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), Le(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), Le("Error loading files");
    } finally {
      this.isLoading = !1, t && A(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && A(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = zi.includes(e.mimeType), s = this.selectedFile?.id === e.id, l = ji[e.mimeType] || ji.default, u = this.getFileIcon(l);
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
            ${Wn(e.modifiedTime)}
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), Le(`Selected: ${t.name}`));
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
      previewFileId: u,
      previewOwner: o,
      previewModified: S,
      importBtn: v,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && $(e), t && A(t);
      return;
    }
    e && A(e), t && $(t);
    const T = this.selectedFile, H = zi.includes(T.mimeType);
    s && (s.textContent = T.name), l && (l.textContent = this.getMimeTypeLabel(T.mimeType)), u && (u.textContent = T.id), o && T.owners.length > 0 && (o.textContent = T.owners[0].emailAddress || "-"), S && (S.textContent = Wn(T.modifiedTime)), v && (H ? (v.removeAttribute("disabled"), v.classList.remove("opacity-50", "cursor-not-allowed")) : (v.setAttribute("disabled", "true"), v.classList.add("opacity-50", "cursor-not-allowed"))), E && T.webViewLink && (E.href = T.webViewLink);
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
      A(e), t && (t.textContent = "Search Results");
      return;
    }
    $(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
      (l, u) => `
        <li class="flex items-center">
          ${u > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(l.id)}"
            data-folder-index="${u}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(l.name)}
          </button>
        </li>
      `
    ).join(""), Dt(".breadcrumb-item", s).forEach((l) => {
      l.addEventListener("click", () => {
        const u = parseInt(l.dataset.folderIndex || "0", 10);
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
    e && (this.nextPageToken ? $(e) : A(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? $(t) : A(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && A(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    s && (s.value = ""), e && $(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && A(e);
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
    } = this.elements, u = this.selectedFile.id, o = s?.value.trim() || this.selectedFile.name, S = l?.value.trim() || "";
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
          document_title: o,
          agreement_title: S || void 0
        })
      });
      if (!v.ok) {
        const T = await v.json();
        throw new Error(T.error?.message || "Import failed");
      }
      const E = await v.json();
      this.showToast("Import started successfully", "success"), Le("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (v) {
      console.error("Import error:", v);
      const E = v instanceof Error ? v.message : "Import failed";
      this.showToast(E, "error"), Le(`Error: ${E}`);
    } finally {
      e && e.removeAttribute("disabled"), t && A(t), n && (n.textContent = "Import");
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
function Ga(i) {
  const e = new os(i);
  return te(() => e.init()), e;
}
function Va(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new os(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class cs {
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
      const u = await fetch(l.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!u.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const o = await u.json();
        this.healthData = o;
      }
      this.renderHealthData(), Le("Health data refreshed");
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
    for (let l = 0; l < e; l++) {
      const u = n[Math.floor(Math.random() * n.length)], o = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: u,
        provider: o,
        message: this.getActivityMessage(u, o),
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
    const n = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, l = /* @__PURE__ */ new Date();
    for (let u = e - 1; u >= 0; u--) {
      const o = new Date(l.getTime() - u * 36e5);
      n.push(
        o.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
      const u = l.trend >= 0 ? "+" : "";
      s.textContent = `${u}${l.trend} from previous period`;
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
    const { alertsList: s, noAlerts: l, alertCount: u } = this.elements, o = s?.querySelectorAll(":scope > div").length || 0;
    u && (u.textContent = `${o} active`, o === 0 && (u.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), l && l.classList.remove("hidden")));
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
    const u = l.getContext("2d");
    if (!u) return;
    const o = l.width, S = l.height, v = 40, E = o - v * 2, T = S - v * 2;
    u.clearRect(0, 0, o, S);
    const H = t.labels, R = Object.values(t.datasets), F = E / H.length / (R.length + 1), G = Math.max(...R.flat()) || 1;
    H.forEach((J, K) => {
      const ae = v + K * E / H.length + F / 2;
      R.forEach((fe, ue) => {
        const Ae = fe[K] / G * T, wt = ae + ue * F, Oe = S - v - Ae;
        u.fillStyle = n[ue] || "#6b7280", u.fillRect(wt, Oe, F - 2, Ae);
      }), K % Math.ceil(H.length / 6) === 0 && (u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "center", u.fillText(J, ae + R.length * F / 2, S - v + 15));
    }), u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "right";
    for (let J = 0; J <= 4; J++) {
      const K = S - v - J * T / 4, ae = Math.round(G * J / 4);
      u.fillText(ae.toString(), v - 5, K + 3);
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
function Wa(i) {
  const e = new cs(i);
  return te(() => e.init()), e;
}
function Ja(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new cs(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class ls {
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
      retryBtn: u,
      addFieldBtn: o,
      addRuleBtn: S,
      validateBtn: v,
      mappingForm: E,
      publishCancelBtn: T,
      publishConfirmBtn: H,
      deleteCancelBtn: R,
      deleteConfirmBtn: F,
      closePreviewBtn: G,
      loadSampleBtn: J,
      runPreviewBtn: K,
      clearPreviewBtn: ae,
      previewSourceInput: fe,
      searchInput: ue,
      filterStatus: Ae,
      filterProvider: wt,
      mappingModal: Oe,
      publishModal: Re,
      deleteModal: Ze,
      previewModal: O
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), l?.addEventListener("click", () => this.loadMappings()), u?.addEventListener("click", () => this.loadMappings()), o?.addEventListener("click", () => this.addSchemaField()), S?.addEventListener("click", () => this.addMappingRule()), v?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (ve) => {
      ve.preventDefault(), this.saveMapping();
    }), T?.addEventListener("click", () => this.closePublishModal()), H?.addEventListener("click", () => this.publishMapping()), R?.addEventListener("click", () => this.closeDeleteModal()), F?.addEventListener("click", () => this.deleteMapping()), G?.addEventListener("click", () => this.closePreviewModal()), J?.addEventListener("click", () => this.loadSamplePayload()), K?.addEventListener("click", () => this.runPreviewTransform()), ae?.addEventListener("click", () => this.clearPreview()), fe?.addEventListener("input", Jn(() => this.validateSourceJson(), 300)), ue?.addEventListener("input", Jn(() => this.renderMappings(), 300)), Ae?.addEventListener("change", () => this.renderMappings()), wt?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ve) => {
      ve.key === "Escape" && (Oe && !Oe.classList.contains("hidden") && this.closeModal(), Re && !Re.classList.contains("hidden") && this.closePublishModal(), Ze && !Ze.classList.contains("hidden") && this.closeDeleteModal(), O && !O.classList.contains("hidden") && this.closePreviewModal());
    }), [Oe, Re, Ze, O].forEach((ve) => {
      ve?.addEventListener("click", (Me) => {
        const Ge = Me.target;
        (Ge === ve || Ge.getAttribute("aria-hidden") === "true") && (ve === Oe ? this.closeModal() : ve === Re ? this.closePublishModal() : ve === Ze ? this.closeDeleteModal() : ve === O && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Le(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: l } = this.elements;
    switch (A(t), A(n), A(s), A(l), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(s);
        break;
      case "list":
        $(l);
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
    const l = (t?.value || "").toLowerCase(), u = n?.value || "", o = s?.value || "", S = this.mappings.filter((v) => !(l && !v.name.toLowerCase().includes(l) && !v.provider.toLowerCase().includes(l) || u && v.status !== u || o && v.provider !== o));
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
      schemaVersionInput: u,
      schemaFieldsContainer: o,
      mappingRulesContainer: S
    } = this.elements, v = [];
    o?.querySelectorAll(".schema-field-row").forEach((T) => {
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
      mappingProviderInput: l,
      schemaObjectTypeInput: u,
      schemaVersionInput: o,
      schemaFieldsContainer: S,
      mappingRulesContainer: v,
      mappingStatusBadge: E,
      formValidationStatus: T
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), l && (l.value = e.provider || "");
    const H = e.external_schema || { object_type: "", fields: [] };
    u && (u.value = H.object_type || ""), o && (o.value = H.version || ""), S && (S.innerHTML = "", (H.fields || []).forEach((R) => S.appendChild(this.createSchemaFieldRow(R)))), v && (v.innerHTML = "", (e.rules || []).forEach((R) => v.appendChild(this.createMappingRuleRow(R)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), A(T);
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
      mappingStatusBadge: u,
      formValidationStatus: o
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), l && (l.innerHTML = ""), u && u.classList.add("hidden"), A(o), this.editingMappingId = null;
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
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: l } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), $(n), l?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    A(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((u) => u.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: l } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), l && (l.textContent = `v${t.version || 1}`), $(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    A(this.elements.publishModal), this.pendingPublishId = null;
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
    A(this.elements.deleteModal), this.pendingDeleteId = null;
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
        const u = l.errors || [l.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${u.map((o) => `<li>${this.escapeHtml(o)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      $(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, $(t));
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
        const o = await u.json();
        throw new Error(o.error?.message || `HTTP ${u.status}`);
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
      previewObjectType: u,
      previewMappingStatus: o,
      previewSourceInput: S,
      sourceSyntaxError: v
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), l && (l.textContent = t.provider), u && (u.textContent = t.external_schema?.object_type || "-"), o && (o.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), S && (S.value = ""), A(v), $(n), S?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    A(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: l } = this.elements;
    switch (A(t), A(n), A(s), A(l), e) {
      case "empty":
        $(t);
        break;
      case "loading":
        $(n);
        break;
      case "error":
        $(s);
        break;
      case "success":
        $(l);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", l = n.fields || [], u = {}, o = {};
    l.forEach((S) => {
      const v = S.field || "field";
      switch (S.type) {
        case "string":
          o[v] = v === "email" ? "john.doe@example.com" : v === "name" ? "John Doe" : `sample_${v}`;
          break;
        case "number":
          o[v] = 123;
          break;
        case "boolean":
          o[v] = !0;
          break;
        case "date":
          o[v] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          o[v] = `sample_${v}`;
      }
    }), u[s] = o, e && (e.value = JSON.stringify(u, null, 2)), A(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return A(t), null;
    try {
      const s = JSON.parse(n);
      return A(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, $(t)), null;
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
    }, l = {}, u = {}, o = [];
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
            u[S.target_path] = v;
            break;
          case "field_definition":
            o.push({ path: S.target_path, value: v });
            break;
        }
    }), Object.keys(l).length > 0 && s.participants.push({
      ...l,
      role: l.role || "signer",
      signing_stage: l.signing_stage || 1
    }), s.agreement = u, s.field_definitions = o, s;
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
      previewMetadata: u,
      previewRawJson: o,
      previewRulesTbody: S
    } = this.elements, v = e.participants || [];
    n && (n.textContent = `(${v.length})`), t && (v.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = v.map(
      (R) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(R.name || R.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(R.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(R.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(R.role))}</span>
              <span class="text-xs text-gray-500">Stage ${R.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const E = e.field_definitions || [];
    l && (l.textContent = `(${E.length})`), s && (E.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = E.map(
      (R) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(R.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(R.value))}</span>
          </div>
        `
    ).join(""));
    const T = e.agreement || {}, H = Object.entries(T);
    u && (H.length === 0 ? u.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : u.innerHTML = H.map(
      ([R, F]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(R)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(F))}</span>
          </div>
        `
    ).join("")), o && (o.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((R) => {
      const F = S?.querySelector(`[data-rule-source="${this.escapeHtml(R.source)}"] span`);
      F && (R.matched ? (F.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", F.textContent = "Matched") : (F.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", F.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), A(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function Ya(i) {
  const e = new ls(i);
  return te(() => e.init()), e;
}
function Ka(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ls(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class ds {
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
      filterEntity: u,
      actionResolveBtn: o,
      actionIgnoreBtn: S,
      cancelResolveBtn: v,
      resolveForm: E,
      conflictDetailModal: T,
      resolveModal: H
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), l?.addEventListener("change", () => this.renderConflicts()), u?.addEventListener("change", () => this.renderConflicts()), o?.addEventListener("click", () => this.openResolveModal("resolved")), S?.addEventListener("click", () => this.openResolveModal("ignored")), v?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (R) => this.submitResolution(R)), document.addEventListener("keydown", (R) => {
      R.key === "Escape" && (H && !H.classList.contains("hidden") ? this.closeResolveModal() : T && !T.classList.contains("hidden") && this.closeConflictDetail());
    }), [T, H].forEach((R) => {
      R?.addEventListener("click", (F) => {
        const G = F.target;
        (G === R || G.getAttribute("aria-hidden") === "true") && (R === T ? this.closeConflictDetail() : R === H && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Le(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: l } = this.elements;
    switch (A(t), A(n), A(s), A(l), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(s);
        break;
      case "list":
        $(l);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((o) => o.status === "pending").length, l = this.conflicts.filter((o) => o.status === "resolved").length, u = this.conflicts.filter((o) => o.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(l)), n && (n.textContent = String(u));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const l = t?.value || "", u = n?.value || "", o = s?.value || "", S = this.conflicts.filter((v) => !(l && v.status !== l || u && v.provider !== u || o && v.entity_kind !== o));
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
    const t = this.conflicts.find((Ae) => Ae.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: l,
      detailStatusBadge: u,
      detailProvider: o,
      detailExternalId: S,
      detailInternalId: v,
      detailBindingId: E,
      detailConflictId: T,
      detailRunId: H,
      detailCreatedAt: R,
      detailVersion: F,
      detailPayload: G,
      resolutionSection: J,
      actionButtons: K,
      detailResolvedAt: ae,
      detailResolvedBy: fe,
      detailResolution: ue
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), l && (l.textContent = t.entity_kind || "-"), u && (u.innerHTML = this.getStatusBadge(t.status)), o && (o.textContent = t.provider || "-"), S && (S.textContent = t.external_id || "-"), v && (v.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), T && (T.textContent = t.id), H && (H.textContent = t.run_id || "-"), R && (R.textContent = this.formatDate(t.created_at)), F && (F.textContent = String(t.version || 1)), G)
      try {
        const Ae = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        G.textContent = JSON.stringify(Ae, null, 2);
      } catch {
        G.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if ($(J), A(K), ae && (ae.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), fe && (fe.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), ue)
        try {
          const Ae = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          ue.textContent = JSON.stringify(Ae, null, 2);
        } catch {
          ue.textContent = t.resolution_json || "{}";
        }
    } else
      A(J), $(K);
    $(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    A(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), $(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    A(this.elements.resolveModal);
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
    const u = s.get("resolution");
    if (u)
      try {
        l = JSON.parse(u);
      } catch {
        l = { raw: u };
      }
    const o = s.get("notes");
    o && (l.notes = o);
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
function Xa(i) {
  const e = new ds(i);
  return te(() => e.init()), e;
}
function Qa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ds(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class us {
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
      retryBtn: u,
      closeDetailBtn: o,
      filterProvider: S,
      filterStatus: v,
      filterDirection: E,
      actionResumeBtn: T,
      actionRetryBtn: H,
      actionCompleteBtn: R,
      actionFailBtn: F,
      actionDiagnosticsBtn: G,
      startSyncModal: J,
      runDetailModal: K
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (ae) => this.startSync(ae)), l?.addEventListener("click", () => this.loadSyncRuns()), u?.addEventListener("click", () => this.loadSyncRuns()), o?.addEventListener("click", () => this.closeRunDetail()), S?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), T?.addEventListener("click", () => this.runAction("resume")), H?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("complete")), F?.addEventListener("click", () => this.runAction("fail")), G?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (ae) => {
      ae.key === "Escape" && (J && !J.classList.contains("hidden") && this.closeStartSyncModal(), K && !K.classList.contains("hidden") && this.closeRunDetail());
    }), [J, K].forEach((ae) => {
      ae?.addEventListener("click", (fe) => {
        const ue = fe.target;
        (ue === ae || ue.getAttribute("aria-hidden") === "true") && (ae === J ? this.closeStartSyncModal() : ae === K && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), Le(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: l } = this.elements;
    switch (A(t), A(n), A(s), A(l), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(s);
        break;
      case "list":
        $(l);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, l = this.syncRuns.length, u = this.syncRuns.filter(
      (v) => v.status === "running" || v.status === "pending"
    ).length, o = this.syncRuns.filter((v) => v.status === "completed").length, S = this.syncRuns.filter((v) => v.status === "failed").length;
    e && (e.textContent = String(l)), t && (t.textContent = String(u)), n && (n.textContent = String(o)), s && (s.textContent = String(S));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", l = n?.value || "", u = this.syncRuns.filter((o) => !(s && o.status !== s || l && o.direction !== l));
    if (u.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = u.map(
      (o) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(o.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${o.status === "running" ? "bg-blue-100" : o.status === "completed" ? "bg-green-100" : o.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${o.status === "running" ? "text-blue-600 animate-spin" : o.status === "completed" ? "text-green-600" : o.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(o.provider)}</span>
                  ${this.getDirectionBadge(o.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(o.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(o.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(o.started_at)}</p>
            </div>
          </div>

          ${o.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(o.cursor)}</span></p>
            </div>
          ` : ""}

          ${o.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(o.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".sync-run-card").forEach((o) => {
      o.addEventListener("click", () => this.openRunDetail(o.dataset.id || ""));
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
    A(this.elements.startSyncModal);
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
      const u = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(l)
      });
      if (!u.ok) {
        const o = await u.json();
        throw new Error(o.error?.message || `HTTP ${u.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (u) {
      console.error("Start sync error:", u);
      const o = u instanceof Error ? u.message : "Unknown error";
      this.showToast(`Failed to start: ${o}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(e) {
    this.currentRunId = e;
    const t = this.syncRuns.find((fe) => fe.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: l,
      detailDirection: u,
      detailStatus: o,
      detailStarted: S,
      detailCompleted: v,
      detailCursor: E,
      detailAttempt: T,
      detailErrorSection: H,
      detailLastError: R,
      detailCheckpoints: F,
      actionResumeBtn: G,
      actionRetryBtn: J,
      actionCompleteBtn: K,
      actionFailBtn: ae
    } = this.elements;
    s && (s.textContent = t.id), l && (l.textContent = t.provider), u && (u.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), o && (o.innerHTML = this.getStatusBadge(t.status)), S && (S.textContent = this.formatDate(t.started_at)), v && (v.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), T && (T.textContent = String(t.attempt_count || 1)), t.last_error ? (R && (R.textContent = t.last_error), $(H)) : A(H), G && G.classList.toggle("hidden", t.status !== "running"), J && J.classList.toggle("hidden", t.status !== "failed"), K && K.classList.toggle("hidden", t.status !== "running"), ae && ae.classList.toggle("hidden", t.status !== "running"), F && (F.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), $(n);
    try {
      const fe = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (fe.ok) {
        const ue = await fe.json();
        this.renderCheckpoints(ue.checkpoints || []);
      } else
        F && (F.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (fe) {
      console.error("Error loading checkpoints:", fe), F && (F.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    A(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: l } = this.elements, u = e === "resume" ? t : e === "complete" ? s : l, o = e === "resume" ? n : null;
    if (!u) return;
    u.setAttribute("disabled", "true"), o?.setAttribute("disabled", "true");
    const S = u.innerHTML;
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
      u.removeAttribute("disabled"), o?.removeAttribute("disabled"), u.innerHTML = S;
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
function Za(i) {
  const e = new us(i);
  return te(() => e.init()), e;
}
function eo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new us(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const hi = "esign.google.account_id", fr = 25 * 1024 * 1024, yr = 2e3, Oi = 60, bi = "application/vnd.google-apps.document", Si = "application/pdf", Gi = "application/vnd.google-apps.folder", vr = [bi, Si];
class Li {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || fr, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: Dt(".source-tab"),
      sourcePanels: Dt(".source-panel"),
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
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (u) => {
      u.preventDefault(), u.stopPropagation(), this.clearFileSelection();
    }), l && l.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((u) => {
      n.addEventListener(u, (o) => {
        o.preventDefault(), o.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((u) => {
      n.addEventListener(u, (o) => {
        o.preventDefault(), o.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (u) => {
      const o = u.dataTransfer;
      o?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = o.files, this.handleFileSelect());
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
      clearSelectionBtn: l,
      importBtn: u,
      importRetryBtn: o,
      driveAccountDropdown: S
    } = this.elements;
    if (e) {
      const v = Jn(() => this.handleSearch(), 300);
      e.addEventListener("input", v);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), S && S.addEventListener("change", () => {
      this.setCurrentAccountId(S.value, this.currentSource === "google");
    }), l && l.addEventListener("click", () => this.clearFileSelection()), u && u.addEventListener("click", () => this.startImport()), o && o.addEventListener("click", () => {
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
        window.localStorage.getItem(hi)
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
      s && (s.value = ""), l && A(l), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const u = document.createElement("option");
      u.value = l;
      const o = String(s?.email || "").trim(), S = String(s?.status || "").trim(), v = o || l || "Default account";
      u.textContent = S && S !== "connected" ? `${v} (${S})` : v, l === this.currentAccountId && (u.selected = !0), e.appendChild(u);
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
      this.currentAccountId ? window.localStorage.setItem(hi, this.currentAccountId) : window.localStorage.removeItem(hi);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : A(e)), t) {
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
      n.id.replace("panel-", "") === e ? $(n) : A(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), Le(
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: s } = this.elements, l = e?.files?.[0];
    if (l && this.validateFile(l)) {
      if (this.showPreview(l), n && (n.value = ""), s && (s.value = l.name), t && !t.value.trim()) {
        const u = l.name.replace(/\.pdf$/i, "");
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
      `File is too large (${jn(e.size)}). Maximum size is ${jn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: l, uploadZone: u } = this.elements;
    s && (s.textContent = e.name), l && (l.textContent = jn(e.size)), t && A(t), n && $(n), u && (u.classList.remove("border-gray-300"), u.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && $(e), t && A(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, $(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", A(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, l = t?.value.trim().length ?? !1, u = s && l;
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), s = t.get("org_id"), l = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && l.searchParams.set("tenant_id", n), s && l.searchParams.set("org_id", s);
    const u = new FormData();
    u.append("file", e);
    const o = await fetch(l.toString(), {
      method: "POST",
      body: u,
      credentials: "same-origin"
    }), S = await o.json().catch(() => ({}));
    if (!o.ok) {
      const T = S?.error?.message || S?.message || "Upload failed. Please try again.";
      throw new Error(T);
    }
    const v = S?.object_key ? String(S.object_key).trim() : "";
    if (!v)
      throw new Error("Upload failed: missing source object key.");
    const E = S?.source_original_name ? String(S.source_original_name).trim() : S?.original_name ? String(S.original_name).trim() : e.name;
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
    const { fileInput: t, form: n, sourceObjectKeyInput: s, sourceOriginalNameInput: l } = this.elements, u = t?.files?.[0];
    if (!(!u || !this.validateFile(u))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const o = await this.uploadSourcePDF(u);
        s && (s.value = o.objectKey), l && (l.value = o.sourceOriginalName || u.name), n?.submit();
      } catch (o) {
        const S = o instanceof Error ? o.message : "Upload failed. Please try again.";
        this.showError(S), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), l = String(e.modifiedTime || e.ModifiedTime || "").trim(), u = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), o = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : o ? [o] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: l,
      webViewLink: u,
      parents: v,
      owners: E
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === bi;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === Si;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Gi;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return vr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === bi ? "Google Document" : t === Si ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Gi ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: s, append: l } = e, { fileList: u } = this.elements;
    !l && u && (u.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let o;
      n ? (o = this.buildScopedAPIURL("/esign/google-drive/search"), o.searchParams.set("q", n), o.searchParams.set("page_size", "20"), s && o.searchParams.set("page_token", s)) : (o = this.buildScopedAPIURL("/esign/google-drive/browse"), o.searchParams.set("page_size", "20"), t && t !== "root" && o.searchParams.set("folder_id", t), s && o.searchParams.set("page_token", s));
      const S = await fetch(o.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), v = await S.json();
      if (!S.ok)
        throw new Error(v.error?.message || "Failed to load files");
      const E = Array.isArray(v.files) ? v.files.map((F) => this.normalizeDriveFile(F)) : [];
      this.nextPageToken = v.next_page_token || null, l ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(l);
      const { resultCount: T, listTitle: H } = this.elements;
      n && T ? (T.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, H && (H.textContent = "Search Results")) : (T && (T.textContent = ""), H && (H.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: R } = this.elements;
      R && (this.nextPageToken ? $(R) : A(R)), Le(`Loaded ${E.length} files`);
    } catch (o) {
      console.error("Error loading files:", o), u && (u.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(o instanceof Error ? o.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), Le(`Error: ${o instanceof Error ? o.message : "Unknown error"}`);
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
      const u = this.getFileIcon(s), o = this.isImportable(s), S = this.isFolder(s), v = this.selectedFile && this.selectedFile.id === s.id, E = !o && !S;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${v ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${E ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${v}"
          data-file-index="${l}"
          ${E ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${u.bg} flex items-center justify-center flex-shrink-0 ${u.text}">
            ${u.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + Wn(s.modifiedTime) : ""}
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
        const l = parseInt(s.dataset.fileIndex || "0", 10), u = this.currentFiles[l];
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
    t && (t.value = ""), n && A(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      A(e);
      return;
    }
    $(e);
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
    s && s.querySelectorAll(".file-item").forEach((J) => {
      const K = parseInt(J.dataset.fileIndex || "0", 10);
      this.currentFiles[K].id === e.id ? (J.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), J.setAttribute("aria-selected", "true")) : (J.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), J.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: l,
      filePreview: u,
      importStatus: o,
      previewIcon: S,
      previewTitle: v,
      previewType: E,
      importTypeInfo: T,
      importTypeLabel: H,
      importTypeDesc: R,
      snapshotWarning: F,
      importDocumentTitle: G
    } = this.elements;
    l && A(l), u && $(u), o && A(o), S && (S.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, S.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), v && (v.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && T && (T.className = `p-3 rounded-lg border ${n.bgClass}`, H && (H.textContent = n.label, H.className = `text-xs font-medium ${n.textClass}`), R && (R.textContent = n.desc, R.className = `text-xs mt-1 ${n.textClass}`), F && (n.showSnapshot ? $(F) : A(F))), G && (G.value = e.name || ""), Le(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && $(e), t && A(t), n && A(n), s && s.querySelectorAll(".file-item").forEach((l) => {
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
      t && $(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && A(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && A(t), this.searchQuery = "";
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
      importStatusSuccess: u,
      importStatusFailed: o
    } = this.elements;
    switch (t && A(t), n && A(n), s && $(s), l && A(l), u && A(u), o && A(o), e) {
      case "queued":
      case "running":
        l && $(l);
        break;
      case "succeeded":
        u && $(u);
        break;
      case "failed":
        o && $(o);
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
        s.href = this.applyAccountIdToPath(l), $(s);
      } else
        A(s);
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
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && A(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("import_run_id"), window.history.replaceState({}, "", u.toString());
      const o = await fetch(
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
      ), S = await o.json();
      if (!o.ok) {
        const E = S.error?.code || "";
        throw { message: S.error?.message || "Failed to start import", code: E };
      }
      this.currentImportRunId = S.import_run_id, this.pollAttempts = 0;
      const v = new URL(window.location.href);
      this.currentImportRunId && v.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", v.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (u) {
      console.error("Import error:", u);
      const o = u;
      this.showImportError(o.message || "Failed to start import", o.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), yr);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Oi) {
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
            this.showImportStatus("succeeded"), Le("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const l = n.error?.code || "", u = n.error?.message || "Import failed";
            this.showImportError(u, l), Le("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Oi ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function to(i) {
  const e = new Li(i);
  return te(() => e.init()), e;
}
function no(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new Li(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function wr(i) {
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
typeof document < "u" && te(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = wr(t);
        n && new Li(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const Pe = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, yt = Pe.REVIEW, br = {
  [Pe.DOCUMENT]: "Details",
  [Pe.DETAILS]: "Participants",
  [Pe.PARTICIPANTS]: "Fields",
  [Pe.FIELDS]: "Placement",
  [Pe.PLACEMENT]: "Review"
}, ke = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, Yn = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, xi = /* @__PURE__ */ new Map(), Sr = 30 * 60 * 1e3, Vi = {
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
function xr(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function Ir(i) {
  const e = i instanceof Error ? i.message : i, t = xr(e);
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
  if (t && Vi[t]) {
    const n = Vi[t];
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
function Wi() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function Er() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function Lr() {
  if (!Er())
    throw new Error("PDF preview library unavailable");
}
function Cr(i) {
  const e = xi.get(i);
  return e ? Date.now() - e.timestamp > Sr ? (xi.delete(i), null) : e : null;
}
function kr(i, e, t) {
  xi.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Pr(i, e = Yn.THUMBNAIL_MAX_WIDTH, t = Yn.THUMBNAIL_MAX_HEIGHT) {
  await Lr();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const l = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, u = l.numPages, o = await l.getPage(1), S = o.getViewport({ scale: 1 }), v = e / S.width, E = t / S.height, T = Math.min(v, E, 1), H = o.getViewport({ scale: T }), R = document.createElement("canvas");
  R.width = H.width, R.height = H.height;
  const F = R.getContext("2d");
  if (!F)
    throw new Error("Failed to get canvas context");
  return await o.render({
    canvasContext: F,
    viewport: H
  }).promise, { dataUrl: R.toDataURL("image/jpeg", 0.8), pageCount: u };
}
class Ar {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || Yn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || Yn.THUMBNAIL_MAX_HEIGHT
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
    const t = e === Pe.DOCUMENT || e === Pe.DETAILS || e === Pe.PARTICIPANTS || e === Pe.FIELDS || e === Pe.REVIEW;
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
    const l = Cr(e);
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
      const u = await this.fetchDocumentPdfUrl(e);
      if (s !== this.requestVersion)
        return;
      const { dataUrl: o, pageCount: S } = await Pr(
        u,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      kr(e, o, S), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? S,
        thumbnailUrl: o,
        isLoading: !1,
        error: null
      };
    } catch (u) {
      if (s !== this.requestVersion)
        return;
      const o = u instanceof Error ? u.message : "Failed to load preview", S = Ir(o);
      Wi() && console.error("Failed to load document preview:", u), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: o,
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: l, errorState: u, emptyState: o, contentState: S } = this.elements;
    if (e) {
      if (l?.classList.add("hidden"), u?.classList.add("hidden"), o?.classList.add("hidden"), S?.classList.add("hidden"), !this.state.documentId) {
        o?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        l?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        u?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Wi() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function Tr(i = {}) {
  const e = new Ar(i);
  return e.init(), e;
}
function _r() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function Dr() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Mr(i, e) {
  return {
    id: _r(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Ji(i, e) {
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
function Yi(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Ki(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function ps(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function $r(i, e) {
  const t = ps(i, e.definitionId);
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
function Br(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const l of t)
    s.add(l.definitionId);
  for (const [l, u] of n) {
    if (u.page !== e || s.has(l) || i.unlinkedDefinitions.has(l)) continue;
    const o = i.definitionToGroup.get(l);
    if (!o) continue;
    const S = i.groups.get(o);
    if (!S || !S.isActive || !S.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: l,
      type: u.type,
      participantId: u.participantId,
      participantName: u.participantName,
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
const Xi = 150, Qi = 32;
function re(i) {
  return i == null ? "" : String(i).trim();
}
function gs(i) {
  if (typeof i == "boolean") return i;
  const e = re(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function ms(i) {
  return re(i).toLowerCase();
}
function me(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(re(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function qn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(re(i));
  return Number.isFinite(t) ? t : e;
}
function zn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function vt(i, e) {
  const t = me(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function wn(i, e, t = 1) {
  const n = me(t, 1), s = me(i, n);
  return e > 0 ? zn(s, 1, e) : s > 0 ? s : n;
}
function Fr(i, e, t) {
  const n = me(t, 1);
  let s = vt(i, n), l = vt(e, n);
  return s <= 0 && (s = 1), l <= 0 && (l = n), l < s ? { start: l, end: s } : { start: s, end: l };
}
function Sn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => re(n)) : re(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = me(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function On(i, e) {
  const t = me(e, 1), n = re(i.participantId ?? i.participant_id), s = Sn(i.excludePages ?? i.exclude_pages), l = i.required, u = typeof l == "boolean" ? l : !["0", "false", "off", "no"].includes(re(l).toLowerCase());
  return {
    id: re(i.id),
    type: ms(i.type),
    participantId: n,
    participantTempId: re(i.participantTempId) || n,
    fromPage: vt(i.fromPage ?? i.from_page, t),
    toPage: vt(i.toPage ?? i.to_page, t),
    page: vt(i.page, t),
    excludeLastPage: gs(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: u
  };
}
function Rr(i) {
  return {
    id: re(i.id),
    type: ms(i.type),
    participant_id: re(i.participantId),
    from_page: vt(i.fromPage, 0),
    to_page: vt(i.toPage, 0),
    page: vt(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: Sn(i.excludePages),
    required: i.required !== !1
  };
}
function Hr(i, e) {
  const t = re(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Nr(i, e) {
  const t = me(e, 1), n = [];
  return i.forEach((s, l) => {
    const u = On(s || {}, t);
    if (u.type === "") return;
    const o = Hr(u, l);
    if (u.type === "initials_each_page") {
      const S = Fr(u.fromPage, u.toPage, t), v = /* @__PURE__ */ new Set();
      Sn(u.excludePages).forEach((E) => {
        E <= t && v.add(E);
      }), u.excludeLastPage && v.add(t);
      for (let E = S.start; E <= S.end; E += 1)
        v.has(E) || n.push({
          id: `${o}-initials-${E}`,
          type: "initials",
          page: E,
          participantId: re(u.participantId),
          required: u.required !== !1,
          ruleId: o
          // Phase 3: Track rule ID for link group creation
        });
      return;
    }
    if (u.type === "signature_once") {
      let S = u.page > 0 ? u.page : u.toPage > 0 ? u.toPage : t;
      S <= 0 && (S = 1), n.push({
        id: `${o}-signature-${S}`,
        type: "signature",
        page: S,
        participantId: re(u.participantId),
        required: u.required !== !1,
        ruleId: o
        // Phase 3: Track rule ID for link group creation
      });
    }
  }), n.sort((s, l) => s.page !== l.page ? s.page - l.page : s.id.localeCompare(l.id)), n;
}
function Ur(i, e, t, n, s) {
  const l = me(t, 1);
  let u = i > 0 ? i : 1, o = e > 0 ? e : l;
  u = zn(u, 1, l), o = zn(o, 1, l), o < u && ([u, o] = [o, u]);
  const S = /* @__PURE__ */ new Set();
  s.forEach((E) => {
    const T = me(E, 0);
    T > 0 && S.add(zn(T, 1, l));
  }), n && S.add(l);
  const v = [];
  for (let E = u; E <= o; E += 1)
    S.has(E) || v.push(E);
  return {
    pages: v,
    rangeStart: u,
    rangeEnd: o,
    excludedPages: Array.from(S).sort((E, T) => E - T),
    isEmpty: v.length === 0
  };
}
function qr(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const l = e[n], u = e[s - 1];
      l === u ? t.push(String(l)) : u === l + 1 ? t.push(`${l}, ${u}`) : t.push(`${l}-${u}`), n = s;
    }
  return `pages ${t.join(", ")}`;
}
function fi(i) {
  const e = i || {};
  return {
    id: re(e.id),
    title: re(e.title || e.name) || "Untitled",
    pageCount: me(e.page_count ?? e.pageCount, 0),
    compatibilityTier: re(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: re(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function hs(i) {
  const e = re(i).toLowerCase();
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
function Gn(i, e = 0) {
  const t = i || {}, n = re(t.id) || `fi_init_${e}`, s = re(t.definitionId || t.definition_id || t.field_definition_id) || n, l = me(t.page ?? t.page_number, 1), u = qn(t.x ?? t.pos_x, 0), o = qn(t.y ?? t.pos_y, 0), S = qn(t.width, Xi), v = qn(t.height, Qi);
  return {
    id: n,
    definitionId: s,
    type: re(t.type) || "text",
    participantId: re(t.participantId || t.participant_id),
    participantName: re(t.participantName || t.participant_name) || "Unassigned",
    page: l > 0 ? l : 1,
    x: u >= 0 ? u : 0,
    y: o >= 0 ? o : 0,
    width: S > 0 ? S : Xi,
    height: v > 0 ? v : Qi,
    placementSource: hs(t.placementSource || t.placement_source),
    linkGroupId: re(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: re(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: gs(t.isUnlinked ?? t.is_unlinked)
  };
}
function Zi(i, e = 0) {
  const t = Gn(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: hs(t.placementSource),
    link_group_id: re(t.linkGroupId),
    linked_from_field_id: re(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function jr(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), l = /\/v\d+$/i.test(s) ? s : `${s}/v1`, u = `${l}/esign/drafts`, o = !!e.is_edit, S = !!e.create_success, v = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), T = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, H = Array.isArray(e.initial_participants) ? e.initial_participants : [], R = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function F(c) {
    if (!v) return c;
    const a = c.includes("?") ? "&" : "?";
    return `${c}${a}user_id=${encodeURIComponent(v)}`;
  }
  function G(c = !0) {
    const a = { Accept: "application/json" };
    return c && (a["Content-Type"] = "application/json"), v && (a["X-User-ID"] = v), a;
  }
  const J = 1, K = "esign_wizard_state_v1", ae = "esign_wizard_sync", fe = 2e3, ue = [1e3, 2e3, 5e3, 1e4, 3e4];
  class Ae {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.state = this.loadFromSession() || this.createInitialState();
    }
    createInitialState() {
      return {
        wizardId: this.generateWizardId(),
        version: J,
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
        const a = sessionStorage.getItem(K);
        if (!a) return null;
        const g = JSON.parse(a);
        return g.version !== J ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(g)) : this.normalizeLoadedState(g);
      } catch (a) {
        return console.error("Failed to load wizard state from session:", a), null;
      }
    }
    normalizeLoadedState(a) {
      if (!a || typeof a != "object")
        return this.createInitialState();
      const g = this.createInitialState(), h = { ...g, ...a }, w = Number.parseInt(String(a.currentStep ?? g.currentStep), 10);
      h.currentStep = Number.isFinite(w) ? Math.min(Math.max(w, 1), yt) : g.currentStep;
      const b = a.document && typeof a.document == "object" ? a.document : {}, P = b.id;
      h.document = {
        id: P == null ? null : String(P).trim() || null,
        title: String(b.title ?? "").trim() || null,
        pageCount: me(b.pageCount, 0) || null
      };
      const _ = a.details && typeof a.details == "object" ? a.details : {};
      h.details = {
        title: String(_.title ?? "").trim(),
        message: String(_.message ?? "")
      }, h.participants = Array.isArray(a.participants) ? a.participants : [], h.fieldDefinitions = Array.isArray(a.fieldDefinitions) ? a.fieldDefinitions : [], h.fieldPlacements = Array.isArray(a.fieldPlacements) ? a.fieldPlacements : [], h.fieldRules = Array.isArray(a.fieldRules) ? a.fieldRules : [];
      const D = String(a.wizardId ?? "").trim();
      h.wizardId = D || g.wizardId, h.version = J, h.createdAt = String(a.createdAt ?? g.createdAt), h.updatedAt = String(a.updatedAt ?? g.updatedAt);
      const k = String(a.serverDraftId ?? "").trim();
      return h.serverDraftId = k || null, h.serverRevision = me(a.serverRevision, 0), h.lastSyncedAt = String(a.lastSyncedAt ?? "").trim() || null, h.syncPending = !!a.syncPending, h;
    }
    migrateState(a) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(K, JSON.stringify(this.state));
      } catch (a) {
        console.error("Failed to save wizard state to session:", a);
      }
    }
    getState() {
      return this.state;
    }
    updateState(a) {
      this.state = { ...this.state, ...a, syncPending: !0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, this.saveToSession(), this.notifyListeners();
    }
    updateStep(a) {
      this.updateState({ currentStep: a });
    }
    updateDocument(a) {
      this.updateState({ document: { ...this.state.document, ...a } });
    }
    updateDetails(a) {
      this.updateState({ details: { ...this.state.details, ...a } });
    }
    updateParticipants(a) {
      this.updateState({ participants: a });
    }
    updateFieldDefinitions(a) {
      this.updateState({ fieldDefinitions: a });
    }
    updateFieldPlacements(a) {
      this.updateState({ fieldPlacements: a });
    }
    markSynced(a, g) {
      this.state.serverDraftId = a, this.state.serverRevision = g, this.state.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.syncPending = !1, this.saveToSession(), this.notifyListeners();
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(K), this.notifyListeners();
    }
    hasResumableState() {
      if (!this.state || typeof this.state != "object") return !1;
      const a = Number.parseInt(String(this.state.currentStep ?? 1), 10), g = String(this.state.document?.id ?? "").trim() !== "", h = Array.isArray(this.state.participants) ? this.state.participants.length : 0, w = String(this.state.details?.title ?? "").trim();
      return Number.isFinite(a) && a > 1 || g || h > 0 || w !== "";
    }
    onStateChange(a) {
      return this.listeners.push(a), () => {
        this.listeners = this.listeners.filter((g) => g !== a);
      };
    }
    notifyListeners() {
      this.listeners.forEach((a) => a(this.state));
    }
    collectFormState() {
      const a = document.getElementById("document_id")?.value || null, g = document.getElementById("selected-document-title")?.textContent?.trim() || null, h = document.getElementById("title"), w = document.getElementById("message"), b = [];
      document.querySelectorAll(".participant-entry").forEach((k) => {
        const I = k.getAttribute("data-participant-id"), N = k.querySelector('input[name*=".name"]')?.value || "", U = k.querySelector('input[name*=".email"]')?.value || "", z = k.querySelector('select[name*=".role"]')?.value || "signer", q = parseInt(k.querySelector(".signing-stage-input")?.value || "1", 10), W = k.querySelector(".notify-input")?.checked !== !1;
        b.push({ tempId: I, name: N, email: U, role: z, notify: W, signingStage: q });
      });
      const P = [];
      document.querySelectorAll(".field-definition-entry").forEach((k) => {
        const I = k.getAttribute("data-field-definition-id"), N = k.querySelector(".field-type-select")?.value || "signature", U = k.querySelector(".field-participant-select")?.value || "", z = parseInt(k.querySelector('input[name*=".page"]')?.value || "1", 10), q = k.querySelector('input[name*=".required"]')?.checked ?? !0;
        P.push({ tempId: I, type: N, participantTempId: U, page: z, required: q });
      });
      const _ = x(), D = parseInt(Ve?.value || "0", 10) || null;
      return {
        document: { id: a, title: g, pageCount: D },
        details: {
          title: h?.value || "",
          message: w?.value || ""
        },
        participants: b,
        fieldDefinitions: P,
        fieldPlacements: C?.fieldInstances || [],
        fieldRules: _
      };
    }
    restoreFormState() {
      const a = this.state;
      if (!a) return;
      if (a.document.id) {
        const w = document.getElementById("document_id"), b = document.getElementById("selected-document"), P = document.getElementById("document-picker"), _ = document.getElementById("selected-document-title"), D = document.getElementById("selected-document-info");
        w && (w.value = a.document.id), _ && (_.textContent = a.document.title || "Selected Document"), D && (D.textContent = a.document.pageCount ? `${a.document.pageCount} pages` : ""), Ve && a.document.pageCount && (Ve.value = String(a.document.pageCount)), b && b.classList.remove("hidden"), P && P.classList.add("hidden");
      }
      const g = document.getElementById("title"), h = document.getElementById("message");
      g && a.details.title && (g.value = a.details.title), h && a.details.message && (h.value = a.details.message);
    }
  }
  class wt {
    constructor(a) {
      this.stateManager = a, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(a) {
      const g = {
        wizard_id: a.wizardId,
        wizard_state: a,
        title: a.details.title || "Untitled Agreement",
        current_step: a.currentStep,
        document_id: a.document.id || null,
        created_by_user_id: v
      }, h = await fetch(F(u), {
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
    async update(a, g, h) {
      const w = {
        expected_revision: h,
        wizard_state: g,
        title: g.details.title || "Untitled Agreement",
        current_step: g.currentStep,
        document_id: g.document.id || null,
        updated_by_user_id: v
      }, b = await fetch(F(`${u}/${a}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(w)
      });
      if (b.status === 409) {
        const P = await b.json().catch(() => ({})), _ = new Error("stale_revision");
        throw _.code = "stale_revision", _.currentRevision = P.error?.details?.current_revision, _;
      }
      if (!b.ok) {
        const P = await b.json().catch(() => ({}));
        throw new Error(P.error?.message || `HTTP ${b.status}`);
      }
      return b.json();
    }
    async load(a) {
      const g = await fetch(F(`${u}/${a}`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!g.ok) {
        const h = new Error(`HTTP ${g.status}`);
        throw h.status = g.status, h;
      }
      return g.json();
    }
    async delete(a) {
      const g = await fetch(F(`${u}/${a}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!g.ok && g.status !== 404)
        throw new Error(`HTTP ${g.status}`);
    }
    async list() {
      const a = await fetch(F(`${u}?limit=10`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!a.ok)
        throw new Error(`HTTP ${a.status}`);
      return a.json();
    }
    async sync() {
      const a = this.stateManager.getState();
      if (a.syncPending)
        try {
          let g;
          return a.serverDraftId ? g = await this.update(a.serverDraftId, a, a.serverRevision) : g = await this.create(a), this.stateManager.markSynced(g.id, g.revision), this.retryCount = 0, { success: !0, result: g };
        } catch (g) {
          return g.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: g.currentRevision } : { success: !1, error: g.message };
        }
    }
  }
  class Oe {
    constructor(a, g, h) {
      this.stateManager = a, this.syncService = g, this.statusUpdater = h, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(ae), this.channel.onmessage = (a) => this.handleChannelMessage(a.data), this.channel.postMessage({ type: "presence", tabId: this.getTabId() });
        } catch (a) {
          console.warn("BroadcastChannel not available:", a);
        }
    }
    getTabId() {
      return window._wizardTabId || (window._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`), window._wizardTabId;
    }
    handleChannelMessage(a) {
      switch (a.type) {
        case "presence":
          a.tabId !== this.getTabId() && this.channel?.postMessage({ type: "ownership_claim", tabId: this.getTabId() });
          break;
        case "ownership_claim":
          this.isOwner = !1;
          break;
        case "state_updated":
          if (a.tabId !== this.getTabId()) {
            const g = this.stateManager.loadFromSession();
            g && (this.stateManager.state = g, this.stateManager.notifyListeners());
          }
          break;
        case "sync_completed":
          a.tabId !== this.getTabId() && a.draftId && a.revision && this.stateManager.markSynced(a.draftId, a.revision);
          break;
      }
    }
    broadcastStateUpdate() {
      this.channel?.postMessage({
        type: "state_updated",
        tabId: this.getTabId()
      });
    }
    broadcastSyncCompleted(a, g) {
      this.channel?.postMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: a,
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
      }, fe);
    }
    async forceSync(a = {}) {
      this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
      const g = a && a.keepalive === !0, h = this.stateManager.getState();
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
          const b = await fetch(F(`${u}/${h.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: G(),
            body: w,
            keepalive: !0
          });
          if (b.status === 409) {
            const k = await b.json().catch(() => ({})), I = Number(k?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(I > 0 ? I : h.serverRevision);
            return;
          }
          if (!b.ok)
            throw new Error(`HTTP ${b.status}`);
          const P = await b.json().catch(() => ({})), _ = String(P?.id || P?.draft_id || h.serverDraftId || "").trim(), D = Number(P?.revision || 0);
          if (_ && Number.isFinite(D) && D > 0) {
            this.stateManager.markSynced(_, D), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(_, D);
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
      const a = ue[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, a);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(a) {
      const g = document.getElementById("conflict-dialog-modal"), h = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = Re(h.updatedAt), document.getElementById("conflict-server-revision").textContent = a, document.getElementById("conflict-server-time").textContent = "newer version", g?.classList.remove("hidden");
    }
  }
  function Re(c) {
    if (!c) return "unknown";
    const a = new Date(c), h = /* @__PURE__ */ new Date() - a, w = Math.floor(h / 6e4), b = Math.floor(h / 36e5), P = Math.floor(h / 864e5);
    return w < 1 ? "just now" : w < 60 ? `${w} minute${w !== 1 ? "s" : ""} ago` : b < 24 ? `${b} hour${b !== 1 ? "s" : ""} ago` : P < 7 ? `${P} day${P !== 1 ? "s" : ""} ago` : a.toLocaleDateString();
  }
  function Ze(c) {
    const a = document.getElementById("sync-status-indicator"), g = document.getElementById("sync-status-icon"), h = document.getElementById("sync-status-text"), w = document.getElementById("sync-retry-btn");
    if (!(!a || !g || !h))
      switch (a.classList.remove("hidden"), c) {
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
          a.classList.add("hidden");
      }
  }
  const O = new Ae(), ve = new wt(O), Me = new Oe(O, ve, Ze), Ge = Tr({
    apiBasePath: l,
    basePath: t
  });
  if (S) {
    const a = O.getState()?.serverDraftId;
    O.clear(), Me.broadcastStateUpdate(), a && ve.delete(a).catch((g) => {
      console.warn("Failed to delete server draft after successful create:", g);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    Me.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const c = O.getState();
    if (c.serverDraftId)
      try {
        const a = await ve.load(c.serverDraftId);
        a.wizard_state && (O.state = { ...a.wizard_state, serverDraftId: a.id, serverRevision: a.revision }, O.saveToSession(), window.location.reload());
      } catch (a) {
        console.error("Failed to load server draft:", a);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const c = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    O.state.serverRevision = c, O.state.syncPending = !0, O.saveToSession(), Me.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function Qt() {
    const c = document.getElementById("resume-dialog-modal"), a = O.getState(), g = String(a?.document?.title || "").trim() || String(a?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = a.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = g, document.getElementById("resume-draft-step").textContent = a.currentStep, document.getElementById("resume-draft-time").textContent = Re(a.updatedAt), c?.classList.remove("hidden");
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), O.restoreFormState(), window._resumeToStep = O.getState().currentStep;
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), O.clear();
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", async () => {
    const c = O.getState();
    if (c.serverDraftId)
      try {
        await ve.delete(c.serverDraftId);
      } catch (a) {
        console.warn("Failed to delete server draft:", a);
      }
    O.clear(), document.getElementById("resume-dialog-modal")?.classList.add("hidden");
  });
  async function Xn() {
    if (o || !O.hasResumableState()) return;
    const c = O.getState(), a = String(c?.serverDraftId || "").trim();
    if (!a) {
      Qt();
      return;
    }
    try {
      const g = await ve.load(a);
      g?.wizard_state && typeof g.wizard_state == "object" && (O.state = { ...g.wizard_state, serverDraftId: g.id, serverRevision: g.revision }, O.saveToSession()), Qt();
    } catch (g) {
      if (Number(g?.status || 0) === 404) {
        O.clear(), Me.broadcastStateUpdate();
        return;
      }
      Qt();
    }
  }
  Xn();
  function Mt() {
    const c = O.collectFormState();
    O.updateState(c), Me.scheduleSync(), Me.broadcastStateUpdate();
  }
  const we = document.getElementById("document_id"), bt = document.getElementById("selected-document"), St = document.getElementById("document-picker"), Ie = document.getElementById("document-search"), ut = document.getElementById("document-list"), xn = document.getElementById("change-document-btn"), et = document.getElementById("selected-document-title"), tt = document.getElementById("selected-document-info"), Ve = document.getElementById("document_page_count"), $t = document.getElementById("document-remediation-panel"), Zt = document.getElementById("document-remediation-message"), nt = document.getElementById("document-remediation-status"), Te = document.getElementById("document-remediation-trigger-btn"), In = document.getElementById("document-remediation-dismiss-btn");
  let xt = [], it = null;
  const Bt = /* @__PURE__ */ new Set(), En = /* @__PURE__ */ new Map();
  function pt(c) {
    return String(c || "").trim().toLowerCase();
  }
  function Ne(c) {
    return String(c || "").trim().toLowerCase();
  }
  function We(c) {
    return pt(c) === "unsupported";
  }
  function en() {
    we && (we.value = ""), et && (et.textContent = ""), tt && (tt.textContent = ""), Nt(0), O.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), Ge.setDocument(null, null, null);
  }
  function Ue(c = "") {
    const a = "This document cannot be used because its PDF is incompatible with online signing.", g = Ne(c);
    return g ? `${a} Reason: ${g}. Select another document or upload a remediated PDF.` : `${a} Select another document or upload a remediated PDF.`;
  }
  function Ft() {
    it = null, nt && (nt.textContent = "", nt.className = "mt-2 text-xs text-amber-800"), $t && $t.classList.add("hidden"), Te && (Te.disabled = !1, Te.textContent = "Remediate PDF");
  }
  function st(c, a = "info") {
    if (!nt) return;
    const g = String(c || "").trim();
    nt.textContent = g;
    const h = a === "error" ? "text-red-700" : a === "success" ? "text-green-700" : "text-amber-800";
    nt.className = `mt-2 text-xs ${h}`;
  }
  function Rt(c, a = "") {
    !c || !$t || !Zt || (it = {
      id: String(c.id || "").trim(),
      title: String(c.title || "").trim(),
      pageCount: me(c.pageCount, 0),
      compatibilityReason: Ne(a || c.compatibilityReason || "")
    }, it.id && (Zt.textContent = Ue(it.compatibilityReason), st("Run remediation to make this document signable."), $t.classList.remove("hidden")));
  }
  function Ht(c, a, g) {
    we.value = c, et.textContent = a || "", tt.textContent = `${g} pages`, Nt(g), bt.classList.remove("hidden"), St.classList.add("hidden"), B(), nn(a);
    const h = me(g, 0);
    O.updateDocument({
      id: c,
      title: a,
      pageCount: h
    }), Ge.setDocument(c, a, h), Ft();
  }
  async function It(c, a, g) {
    const h = String(c || "").trim();
    if (!h) return;
    const w = Date.now(), b = 12e4, P = 1250;
    for (; Date.now() - w < b; ) {
      const _ = await fetch(h, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!_.ok)
        throw await At(_, "Failed to read remediation status");
      const k = (await _.json())?.dispatch || {}, I = String(k?.status || "").trim().toLowerCase();
      if (I === "succeeded") {
        st("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (I === "failed" || I === "canceled" || I === "dead_letter") {
        const U = String(k?.terminal_reason || "").trim();
        throw { message: U ? `Remediation failed: ${U}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      st(I === "retrying" ? "Remediation is retrying in the queue..." : I === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((U) => setTimeout(U, P));
    }
    throw { message: `Timed out waiting for remediation dispatch ${a} (${g})`, code: "REMEDIATION_TIMEOUT", status: 504 };
  }
  async function Et() {
    const c = it;
    if (!c || !c.id) return;
    const a = String(c.id || "").trim();
    if (!(!a || Bt.has(a))) {
      Bt.add(a), Te && (Te.disabled = !0, Te.textContent = "Remediating...");
      try {
        let g = En.get(a) || "";
        g || (g = `esign-remediate-${a}-${Date.now()}`, En.set(a, g));
        const h = `${l}/esign/documents/${encodeURIComponent(a)}/remediate`, w = await fetch(h, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": g
          }
        });
        if (!w.ok)
          throw await At(w, "Failed to trigger remediation");
        const b = await w.json(), P = b?.receipt || {}, _ = String(P?.dispatch_id || b?.dispatch_id || "").trim(), D = String(P?.mode || b?.mode || "").trim().toLowerCase();
        let k = String(b?.dispatch_status_url || "").trim();
        !k && _ && (k = `${l}/esign/dispatches/${encodeURIComponent(_)}`), D === "queued" && _ && k && (st("Remediation queued. Monitoring progress..."), await It(k, _, a)), await kn();
        const I = Ln(a);
        if (!I || We(I.compatibilityTier)) {
          st("Remediation finished, but this PDF is still incompatible.", "error"), pe("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        Ht(I.id, I.title, I.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : Vt("Document remediated successfully. You can continue.", "success");
      } catch (g) {
        st(String(g?.message || "Remediation failed").trim(), "error"), pe(g?.message || "Failed to remediate document", g?.code || "", g?.status || 0);
      } finally {
        Bt.delete(a), Te && (Te.disabled = !1, Te.textContent = "Remediate PDF");
      }
    }
  }
  function Ln(c) {
    const a = String(c || "").trim();
    if (a === "") return null;
    const g = xt.find((b) => String(b.id || "").trim() === a);
    if (g) return g;
    const h = j.recentDocuments.find((b) => String(b.id || "").trim() === a);
    if (h) return h;
    const w = j.searchResults.find((b) => String(b.id || "").trim() === a);
    return w || null;
  }
  function Cn() {
    const c = Ln(we?.value || "");
    if (!c) return !0;
    const a = pt(c.compatibilityTier);
    return We(a) ? (Rt(c, c.compatibilityReason || ""), en(), pe(Ue(c.compatibilityReason || "")), bt && bt.classList.add("hidden"), St && St.classList.remove("hidden"), Ie?.focus(), !1) : (Ft(), !0);
  }
  function Nt(c) {
    const a = me(c, 0);
    Ve && (Ve.value = String(a));
  }
  function tn() {
    const c = (we?.value || "").trim();
    if (!c) return;
    const a = xt.find((g) => String(g.id || "").trim() === c);
    a && (et.textContent.trim() || (et.textContent = a.title || "Untitled"), (!tt.textContent.trim() || tt.textContent.trim() === "pages") && (tt.textContent = `${a.pageCount || 0} pages`), Nt(a.pageCount || 0), bt.classList.remove("hidden"), St.classList.add("hidden"));
  }
  async function kn() {
    try {
      const c = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), a = await fetch(`${n}/panels/esign_documents?${c.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!a.ok)
        throw await At(a, "Failed to load documents");
      const g = await a.json();
      xt = (Array.isArray(g?.records) ? g.records : Array.isArray(g?.items) ? g.items : []).slice().sort((b, P) => {
        const _ = Date.parse(String(
          b?.created_at ?? b?.createdAt ?? b?.updated_at ?? b?.updatedAt ?? ""
        )), D = Date.parse(String(
          P?.created_at ?? P?.createdAt ?? P?.updated_at ?? P?.updatedAt ?? ""
        )), k = Number.isFinite(_) ? _ : 0;
        return (Number.isFinite(D) ? D : 0) - k;
      }).map((b) => fi(b)).filter((b) => b.id !== ""), Pn(xt), tn();
    } catch (c) {
      const a = Pt(c?.message || "Failed to load documents", c?.code || "", c?.status || 0);
      ut.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${oe(a)}</div>`;
    }
  }
  function Pn(c) {
    if (c.length === 0) {
      ut.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${oe(T)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    ut.innerHTML = c.map((g, h) => {
      const w = oe(String(g.id || "").trim()), b = oe(String(g.title || "").trim()), P = String(me(g.pageCount, 0)), _ = pt(g.compatibilityTier), D = Ne(g.compatibilityReason), k = oe(_), I = oe(D), U = We(_) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${h === 0 ? "0" : "-1"}"
              data-document-id="${w}"
              data-document-title="${b}"
              data-document-pages="${P}"
              data-document-compatibility-tier="${k}"
              data-document-compatibility-reason="${I}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${b}</div>
          <div class="text-xs text-gray-500">${P} pages ${U}</div>
        </div>
      </button>
    `;
    }).join("");
    const a = ut.querySelectorAll(".document-option");
    a.forEach((g, h) => {
      g.addEventListener("click", () => An(g)), g.addEventListener("keydown", (w) => {
        let b = h;
        if (w.key === "ArrowDown")
          w.preventDefault(), b = Math.min(h + 1, a.length - 1);
        else if (w.key === "ArrowUp")
          w.preventDefault(), b = Math.max(h - 1, 0);
        else if (w.key === "Enter" || w.key === " ") {
          w.preventDefault(), An(g);
          return;
        } else w.key === "Home" ? (w.preventDefault(), b = 0) : w.key === "End" && (w.preventDefault(), b = a.length - 1);
        b !== h && (a[b].focus(), a[b].setAttribute("tabindex", "0"), g.setAttribute("tabindex", "-1"));
      });
    });
  }
  function An(c) {
    const a = c.getAttribute("data-document-id"), g = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), w = pt(
      c.getAttribute("data-document-compatibility-tier")
    ), b = Ne(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (We(w)) {
      Rt({ id: a, title: g, pageCount: h, compatibilityReason: b }), en(), pe(Ue(b)), Ie?.focus();
      return;
    }
    Ht(a, g, h);
  }
  function nn(c) {
    const a = document.getElementById("title");
    if (!a || a.value.trim())
      return;
    const h = String(c || "").trim();
    h && (a.value = h, O.updateDetails({
      title: h,
      message: O.getState().details.message || ""
    }));
  }
  function oe(c) {
    const a = document.createElement("div");
    return a.textContent = c, a.innerHTML;
  }
  xn && xn.addEventListener("click", () => {
    bt.classList.add("hidden"), St.classList.remove("hidden"), Ft(), Ie?.focus(), gt();
  }), Te && Te.addEventListener("click", () => {
    Et();
  }), In && In.addEventListener("click", () => {
    Ft(), Ie?.focus();
  });
  const Tn = 300, sn = 5, _n = 10, rn = document.getElementById("document-typeahead"), rt = document.getElementById("document-typeahead-dropdown"), Ut = document.getElementById("document-recent-section"), an = document.getElementById("document-recent-list"), Lt = document.getElementById("document-search-section"), qt = document.getElementById("document-search-list"), at = document.getElementById("document-empty-state"), Ct = document.getElementById("document-dropdown-loading"), Dn = document.getElementById("document-search-loading"), j = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let ot = 0, ct = null;
  function Qn(c, a) {
    let g = null;
    return (...h) => {
      g !== null && clearTimeout(g), g = setTimeout(() => {
        c(...h), g = null;
      }, a);
    };
  }
  async function on() {
    try {
      const c = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(sn)
      });
      v && c.set("created_by_user_id", v);
      const a = await fetch(`${n}/panels/esign_documents?${c}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!a.ok) {
        console.warn("Failed to load recent documents:", a.status);
        return;
      }
      const g = await a.json(), h = Array.isArray(g?.records) ? g.records : Array.isArray(g?.items) ? g.items : [];
      j.recentDocuments = h.map((w) => fi(w)).filter((w) => w.id !== "").slice(0, sn);
    } catch (c) {
      console.warn("Error loading recent documents:", c);
    }
  }
  async function cn(c) {
    const a = c.trim();
    if (!a) {
      ct && (ct.abort(), ct = null), j.isSearchMode = !1, j.searchResults = [], $e();
      return;
    }
    const g = ++ot;
    ct && ct.abort(), ct = new AbortController(), j.isLoading = !0, j.isSearchMode = !0, $e();
    try {
      const h = new URLSearchParams({
        q: a,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(_n)
      }), w = await fetch(`${n}/panels/esign_documents?${h}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: ct.signal
      });
      if (g !== ot)
        return;
      if (!w.ok) {
        console.warn("Failed to search documents:", w.status), j.searchResults = [], j.isLoading = !1, $e();
        return;
      }
      const b = await w.json(), P = Array.isArray(b?.records) ? b.records : Array.isArray(b?.items) ? b.items : [];
      j.searchResults = P.map((_) => fi(_)).filter((_) => _.id !== "").slice(0, _n);
    } catch (h) {
      if (h?.name === "AbortError")
        return;
      console.warn("Error searching documents:", h), j.searchResults = [];
    } finally {
      g === ot && (j.isLoading = !1, $e());
    }
  }
  const Zn = Qn(cn, Tn);
  function gt() {
    rt && (j.isOpen = !0, j.selectedIndex = -1, rt.classList.remove("hidden"), Ie?.setAttribute("aria-expanded", "true"), ut?.classList.add("hidden"), $e());
  }
  function _e() {
    rt && (j.isOpen = !1, j.selectedIndex = -1, rt.classList.add("hidden"), Ie?.setAttribute("aria-expanded", "false"), ut?.classList.remove("hidden"));
  }
  function $e() {
    if (rt) {
      if (j.isLoading) {
        Ct?.classList.remove("hidden"), Ut?.classList.add("hidden"), Lt?.classList.add("hidden"), at?.classList.add("hidden"), Dn?.classList.remove("hidden");
        return;
      }
      Ct?.classList.add("hidden"), Dn?.classList.add("hidden"), j.isSearchMode ? (Ut?.classList.add("hidden"), j.searchResults.length > 0 ? (Lt?.classList.remove("hidden"), at?.classList.add("hidden"), Je(qt, j.searchResults, "search")) : (Lt?.classList.add("hidden"), at?.classList.remove("hidden"))) : (Lt?.classList.add("hidden"), j.recentDocuments.length > 0 ? (Ut?.classList.remove("hidden"), at?.classList.add("hidden"), Je(an, j.recentDocuments, "recent")) : (Ut?.classList.add("hidden"), at?.classList.remove("hidden"), at && (at.textContent = "No recent documents")));
    }
  }
  function Je(c, a, g) {
    c && (c.innerHTML = a.map((h, w) => {
      const b = w, P = j.selectedIndex === b, _ = oe(String(h.id || "").trim()), D = oe(String(h.title || "").trim()), k = String(me(h.pageCount, 0)), I = pt(h.compatibilityTier), N = Ne(h.compatibilityReason), U = oe(I), z = oe(N), W = We(I) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${P ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${P}"
          tabindex="-1"
          data-document-id="${_}"
          data-document-title="${D}"
          data-document-pages="${k}"
          data-document-compatibility-tier="${U}"
          data-document-compatibility-reason="${z}"
          data-typeahead-index="${b}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${D}</div>
            <div class="text-xs text-gray-500">${k} pages ${W}</div>
          </div>
        </button>
      `;
    }).join(""), c.querySelectorAll(".typeahead-option").forEach((h) => {
      h.addEventListener("click", () => ln(h));
    }));
  }
  function ln(c) {
    const a = c.getAttribute("data-document-id"), g = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), w = pt(
      c.getAttribute("data-document-compatibility-tier")
    ), b = Ne(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (a) {
      if (We(w)) {
        Rt({ id: a, title: g, pageCount: h, compatibilityReason: b }), en(), pe(Ue(b)), Ie?.focus();
        return;
      }
      Ht(a, g, h), _e(), Ie && (Ie.value = ""), j.query = "", j.isSearchMode = !1, j.searchResults = [];
    }
  }
  function ei(c) {
    if (!j.isOpen) {
      (c.key === "ArrowDown" || c.key === "Enter") && (c.preventDefault(), gt());
      return;
    }
    const a = j.isSearchMode ? j.searchResults : j.recentDocuments, g = a.length - 1;
    switch (c.key) {
      case "ArrowDown":
        c.preventDefault(), j.selectedIndex = Math.min(j.selectedIndex + 1, g), $e(), jt();
        break;
      case "ArrowUp":
        c.preventDefault(), j.selectedIndex = Math.max(j.selectedIndex - 1, 0), $e(), jt();
        break;
      case "Enter":
        if (c.preventDefault(), j.selectedIndex >= 0 && j.selectedIndex <= g) {
          const h = a[j.selectedIndex];
          if (h) {
            const w = document.createElement("button");
            w.setAttribute("data-document-id", h.id), w.setAttribute("data-document-title", h.title), w.setAttribute("data-document-pages", String(h.pageCount)), w.setAttribute("data-document-compatibility-tier", String(h.compatibilityTier || "")), w.setAttribute("data-document-compatibility-reason", String(h.compatibilityReason || "")), ln(w);
          }
        }
        break;
      case "Escape":
        c.preventDefault(), _e();
        break;
      case "Tab":
        _e();
        break;
      case "Home":
        c.preventDefault(), j.selectedIndex = 0, $e(), jt();
        break;
      case "End":
        c.preventDefault(), j.selectedIndex = g, $e(), jt();
        break;
    }
  }
  function jt() {
    if (!rt) return;
    const c = rt.querySelector(`[data-typeahead-index="${j.selectedIndex}"]`);
    c && c.scrollIntoView({ block: "nearest" });
  }
  Ie && (Ie.addEventListener("input", (c) => {
    const g = c.target.value;
    j.query = g, j.isOpen || gt(), g.trim() ? (j.isLoading = !0, $e(), Zn(g)) : (j.isSearchMode = !1, j.searchResults = [], $e());
    const h = xt.filter(
      (w) => String(w.title || "").toLowerCase().includes(g.toLowerCase())
    );
    Pn(h);
  }), Ie.addEventListener("focus", () => {
    gt();
  }), Ie.addEventListener("keydown", ei)), document.addEventListener("click", (c) => {
    const a = c.target;
    rn && !rn.contains(a) && _e();
  }), kn(), on();
  const De = document.getElementById("participants-container"), dn = document.getElementById("participant-template"), un = document.getElementById("add-participant-btn");
  let ti = 0, Mn = 0;
  function $n() {
    return `temp_${Date.now()}_${ti++}`;
  }
  function qe(c = {}) {
    const a = dn.content.cloneNode(!0), g = a.querySelector(".participant-entry"), h = c.id || $n();
    g.setAttribute("data-participant-id", h);
    const w = g.querySelector(".participant-id-input"), b = g.querySelector('input[name="participants[].name"]'), P = g.querySelector('input[name="participants[].email"]'), _ = g.querySelector('select[name="participants[].role"]'), D = g.querySelector('input[name="participants[].signing_stage"]'), k = g.querySelector('input[name="participants[].notify"]'), I = g.querySelector(".signing-stage-wrapper"), N = Mn++;
    w.name = `participants[${N}].id`, w.value = h, b.name = `participants[${N}].name`, P.name = `participants[${N}].email`, _.name = `participants[${N}].role`, D && (D.name = `participants[${N}].signing_stage`), k && (k.name = `participants[${N}].notify`), c.name && (b.value = c.name), c.email && (P.value = c.email), c.role && (_.value = c.role), D && c.signing_stage && (D.value = c.signing_stage), k && (k.checked = c.notify !== !1);
    const U = () => {
      if (!I || !D) return;
      const z = _.value === "signer";
      I.classList.toggle("hidden", !z), z ? D.value || (D.value = "1") : D.value = "";
    };
    U(), g.querySelector(".remove-participant-btn").addEventListener("click", () => {
      g.remove(), p();
    }), _.addEventListener("change", () => {
      U(), p();
    }), De.appendChild(a);
  }
  un.addEventListener("click", () => qe()), H.length > 0 ? H.forEach((c) => {
    qe({
      id: String(c.id || "").trim(),
      name: String(c.name || "").trim(),
      email: String(c.email || "").trim(),
      role: String(c.role || "signer").trim() || "signer",
      notify: c.notify !== !1,
      signing_stage: Number(c.signing_stage || c.signingStage || 1) || 1
    });
  }) : qe();
  const Ce = document.getElementById("field-definitions-container"), ni = document.getElementById("field-definition-template"), zt = document.getElementById("add-field-btn"), Bn = document.getElementById("add-field-btn-container"), Fn = document.getElementById("add-field-definition-empty-btn"), Ot = document.getElementById("field-definitions-empty-state"), Se = document.getElementById("field-rules-container"), Rn = document.getElementById("field-rule-template"), ii = document.getElementById("add-field-rule-btn"), pn = document.getElementById("field-rules-empty-state"), gn = document.getElementById("field-rules-preview"), mn = document.getElementById("field_rules_json"), Gt = document.getElementById("field_placements_json");
  let lt = 0, he = 0, kt = 0;
  function hn() {
    return `temp_field_${Date.now()}_${lt++}`;
  }
  function Hn() {
    return `rule_${Date.now()}_${kt}`;
  }
  function je() {
    const c = De.querySelectorAll(".participant-entry"), a = [];
    return c.forEach((g) => {
      const h = g.getAttribute("data-participant-id"), w = g.querySelector('select[name*=".role"]'), b = g.querySelector('input[name*=".name"]'), P = g.querySelector('input[name*=".email"]');
      w.value === "signer" && a.push({
        id: h,
        name: b.value || P.value || "Signer",
        email: P.value
      });
    }), a;
  }
  function si(c, a) {
    const g = String(c || "").trim();
    return g && a.some((h) => h.id === g) ? g : a.length === 1 ? a[0].id : "";
  }
  function r(c, a, g = "") {
    if (!c) return;
    const h = si(g, a);
    c.innerHTML = '<option value="">Select signer...</option>', a.forEach((w) => {
      const b = document.createElement("option");
      b.value = w.id, b.textContent = w.name, c.appendChild(b);
    }), c.value = h;
  }
  function d(c = je()) {
    const a = Ce.querySelectorAll(".field-participant-select"), g = Se ? Se.querySelectorAll(".field-rule-participant-select") : [];
    a.forEach((h) => {
      r(h, c, h.value);
    }), g.forEach((h) => {
      r(h, c, h.value);
    });
  }
  function p() {
    const c = je();
    d(c), B();
  }
  function f() {
    const c = me(Ve?.value || "0", 0);
    if (c > 0) return c;
    const a = String(tt?.textContent || "").match(/(\d+)\s+pages?/i);
    if (a) {
      const g = me(a[1], 0);
      if (g > 0) return g;
    }
    return 1;
  }
  function y() {
    if (!Se || !pn) return;
    const c = Se.querySelectorAll(".field-rule-entry");
    pn.classList.toggle("hidden", c.length > 0);
  }
  function x() {
    if (!Se) return [];
    const c = f(), a = Se.querySelectorAll(".field-rule-entry"), g = [];
    return a.forEach((h) => {
      const w = On({
        id: h.getAttribute("data-field-rule-id") || "",
        type: h.querySelector(".field-rule-type-select")?.value || "",
        participantId: h.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: h.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: h.querySelector(".field-rule-to-page-input")?.value || "",
        page: h.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!h.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: Sn(h.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (h.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, c);
      w.type && g.push(w);
    }), g;
  }
  function L() {
    return x().map((c) => Rr(c));
  }
  function M(c, a) {
    return Nr(c, a);
  }
  function B() {
    if (!gn) return;
    const c = x(), a = f(), g = M(c, a), h = je(), w = new Map(h.map((D) => [String(D.id), D.name]));
    if (mn && (mn.value = JSON.stringify(L())), !g.length) {
      gn.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const b = g.reduce((D, k) => {
      const I = k.type;
      return D[I] = (D[I] || 0) + 1, D;
    }, {}), P = g.slice(0, 8).map((D) => {
      const k = w.get(String(D.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${D.type === "initials" ? "Initials" : "Signature"} on page ${D.page}</span><span class="text-gray-500">${oe(String(k))}</span></li>`;
    }).join(""), _ = g.length - 8;
    gn.innerHTML = `
      <p class="text-gray-700">${g.length} generated field${g.length !== 1 ? "s" : ""} (${b.initials || 0} initials, ${b.signature || 0} signatures)</p>
      <ul class="space-y-1">${P}</ul>
      ${_ > 0 ? `<p class="text-gray-500">+${_} more</p>` : ""}
    `;
  }
  function Q() {
    const c = je(), a = new Map(c.map((k) => [String(k.id), k.name || k.email || "Signer"])), g = [];
    Ce.querySelectorAll(".field-definition-entry").forEach((k) => {
      const I = String(k.getAttribute("data-field-definition-id") || "").trim(), N = k.querySelector(".field-type-select"), U = k.querySelector(".field-participant-select"), z = k.querySelector('input[name*=".page"]'), q = String(N?.value || "text").trim() || "text", W = String(U?.value || "").trim(), ee = parseInt(String(z?.value || "1"), 10) || 1;
      g.push({
        definitionId: I,
        fieldType: q,
        participantId: W,
        participantName: a.get(W) || "Unassigned",
        page: ee
      });
    });
    const w = M(x(), f()), b = /* @__PURE__ */ new Map();
    w.forEach((k) => {
      const I = String(k.ruleId || "").trim(), N = String(k.id || "").trim();
      if (I && N) {
        const U = b.get(I) || [];
        U.push(N), b.set(I, U);
      }
    });
    let P = C.linkGroupState;
    b.forEach((k, I) => {
      if (k.length > 1 && !C.linkGroupState.groups.get(`rule_${I}`)) {
        const U = Mr(k, `Rule ${I}`);
        U.id = `rule_${I}`, P = Ji(P, U);
      }
    }), C.linkGroupState = P, w.forEach((k) => {
      const I = String(k.id || "").trim();
      if (!I) return;
      const N = String(k.participantId || "").trim(), U = parseInt(String(k.page || "1"), 10) || 1, z = String(k.ruleId || "").trim();
      g.push({
        definitionId: I,
        fieldType: String(k.type || "text").trim() || "text",
        participantId: N,
        participantName: a.get(N) || "Unassigned",
        page: U,
        linkGroupId: z ? `rule_${z}` : void 0
      });
    });
    const _ = /* @__PURE__ */ new Set(), D = g.filter((k) => {
      const I = String(k.definitionId || "").trim();
      return !I || _.has(I) ? !1 : (_.add(I), !0);
    });
    return D.sort((k, I) => k.page !== I.page ? k.page - I.page : k.definitionId.localeCompare(I.definitionId)), D;
  }
  function V(c) {
    const a = c.querySelector(".field-rule-type-select"), g = c.querySelector(".field-rule-range-start-wrap"), h = c.querySelector(".field-rule-range-end-wrap"), w = c.querySelector(".field-rule-page-wrap"), b = c.querySelector(".field-rule-exclude-last-wrap"), P = c.querySelector(".field-rule-exclude-pages-wrap"), _ = c.querySelector(".field-rule-summary"), D = c.querySelector(".field-rule-from-page-input"), k = c.querySelector(".field-rule-to-page-input"), I = c.querySelector(".field-rule-page-input"), N = c.querySelector(".field-rule-exclude-last-input"), U = c.querySelector(".field-rule-exclude-pages-input"), z = f(), q = On({
      type: a?.value || "",
      fromPage: D?.value || "",
      toPage: k?.value || "",
      page: I?.value || "",
      excludeLastPage: !!N?.checked,
      excludePages: Sn(U?.value || ""),
      required: !0
    }, z), W = q.fromPage > 0 ? q.fromPage : 1, ee = q.toPage > 0 ? q.toPage : z, ce = q.page > 0 ? q.page : q.toPage > 0 ? q.toPage : z, ge = q.excludeLastPage, ye = q.excludePages.join(","), ie = a?.value === "initials_each_page";
    if (g.classList.toggle("hidden", !ie), h.classList.toggle("hidden", !ie), b.classList.toggle("hidden", !ie), P.classList.toggle("hidden", !ie), w.classList.toggle("hidden", ie), D && (D.value = String(W)), k && (k.value = String(ee)), I && (I.value = String(ce)), U && (U.value = ye), N && (N.checked = ge), ie) {
      const de = Ur(
        W,
        ee,
        z,
        ge,
        q.excludePages
      ), Xe = qr(de);
      de.isEmpty ? _.textContent = `Warning: No initials fields will be generated ${Xe}.` : _.textContent = `Generates initials fields on ${Xe}.`;
    } else
      _.textContent = `Generates one signature field on page ${ce}.`;
  }
  function Z(c = {}) {
    if (!Rn || !Se) return;
    const a = Rn.content.cloneNode(!0), g = a.querySelector(".field-rule-entry"), h = c.id || Hn(), w = kt++, b = f();
    g.setAttribute("data-field-rule-id", h);
    const P = g.querySelector(".field-rule-id-input"), _ = g.querySelector(".field-rule-type-select"), D = g.querySelector(".field-rule-participant-select"), k = g.querySelector(".field-rule-from-page-input"), I = g.querySelector(".field-rule-to-page-input"), N = g.querySelector(".field-rule-page-input"), U = g.querySelector(".field-rule-required-select"), z = g.querySelector(".field-rule-exclude-last-input"), q = g.querySelector(".field-rule-exclude-pages-input"), W = g.querySelector(".remove-field-rule-btn");
    P.name = `field_rules[${w}].id`, P.value = h, _.name = `field_rules[${w}].type`, D.name = `field_rules[${w}].participant_id`, k.name = `field_rules[${w}].from_page`, I.name = `field_rules[${w}].to_page`, N.name = `field_rules[${w}].page`, U.name = `field_rules[${w}].required`, z.name = `field_rules[${w}].exclude_last_page`, q.name = `field_rules[${w}].exclude_pages`;
    const ee = On(c, b);
    _.value = ee.type || "initials_each_page", r(D, je(), ee.participantId), k.value = String(ee.fromPage > 0 ? ee.fromPage : 1), I.value = String(ee.toPage > 0 ? ee.toPage : b), N.value = String(ee.page > 0 ? ee.page : b), U.value = ee.required ? "1" : "0", z.checked = ee.excludeLastPage, q.value = ee.excludePages.join(",");
    const ce = () => {
      V(g), B(), Ke();
    }, ge = () => {
      const ie = f();
      if (k) {
        const de = parseInt(k.value, 10);
        Number.isFinite(de) && (k.value = String(wn(de, ie, 1)));
      }
      if (I) {
        const de = parseInt(I.value, 10);
        Number.isFinite(de) && (I.value = String(wn(de, ie, 1)));
      }
      if (N) {
        const de = parseInt(N.value, 10);
        Number.isFinite(de) && (N.value = String(wn(de, ie, 1)));
      }
    }, ye = () => {
      ge(), ce();
    };
    _.addEventListener("change", ce), D.addEventListener("change", ce), k.addEventListener("input", ye), k.addEventListener("change", ye), I.addEventListener("input", ye), I.addEventListener("change", ye), N.addEventListener("input", ye), N.addEventListener("change", ye), U.addEventListener("change", ce), z.addEventListener("change", () => {
      const ie = f();
      if (z.checked) {
        const de = Math.max(1, ie - 1);
        I.value = String(de);
      } else
        I.value = String(ie);
      ce();
    }), q.addEventListener("input", ce), W.addEventListener("click", () => {
      g.remove(), y(), B(), Ke();
    }), Se.appendChild(a), V(Se.lastElementChild), y(), B();
  }
  function xe(c = {}) {
    const a = ni.content.cloneNode(!0), g = a.querySelector(".field-definition-entry"), h = c.id || hn();
    g.setAttribute("data-field-definition-id", h);
    const w = g.querySelector(".field-definition-id-input"), b = g.querySelector('select[name="field_definitions[].type"]'), P = g.querySelector('select[name="field_definitions[].participant_id"]'), _ = g.querySelector('input[name="field_definitions[].page"]'), D = g.querySelector('input[name="field_definitions[].required"]'), k = g.querySelector(".field-date-signed-info"), I = he++;
    w.name = `field_instances[${I}].id`, w.value = h, b.name = `field_instances[${I}].type`, P.name = `field_instances[${I}].participant_id`, _.name = `field_instances[${I}].page`, D.name = `field_instances[${I}].required`, c.type && (b.value = c.type), c.page && (_.value = String(wn(c.page, f(), 1))), c.required !== void 0 && (D.checked = c.required);
    const N = String(c.participant_id || c.participantId || "").trim();
    r(P, je(), N), b.addEventListener("change", () => {
      b.value === "date_signed" ? k.classList.remove("hidden") : k.classList.add("hidden");
    }), b.value === "date_signed" && k.classList.remove("hidden"), g.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      g.remove(), Ee();
    });
    const U = g.querySelector('input[name*=".page"]'), z = () => {
      U && (U.value = String(wn(U.value, f(), 1)));
    };
    z(), U?.addEventListener("input", z), U?.addEventListener("change", z), Ce.appendChild(a), Ee();
  }
  function Ee() {
    Ce.querySelectorAll(".field-definition-entry").length === 0 ? (Ot.classList.remove("hidden"), Bn?.classList.add("hidden")) : (Ot.classList.add("hidden"), Bn?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    p();
  }).observe(De, { childList: !0, subtree: !0 }), De.addEventListener("change", (c) => {
    (c.target.matches('select[name*=".role"]') || c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && p();
  }), De.addEventListener("input", (c) => {
    (c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && p();
  }), zt.addEventListener("click", () => xe()), Fn.addEventListener("click", () => xe()), ii?.addEventListener("click", () => Z({ to_page: f() })), window._initialFieldPlacementsData = [], R.forEach((c) => {
    const a = String(c.id || "").trim();
    if (!a) return;
    const g = String(c.type || "signature").trim() || "signature", h = String(c.participant_id || c.participantId || "").trim(), w = Number(c.page || 1) || 1, b = !!c.required;
    xe({
      id: a,
      type: g,
      participant_id: h,
      page: w,
      required: b
    }), window._initialFieldPlacementsData.push(Gn({
      id: a,
      definitionId: a,
      type: g,
      participantId: h,
      participantName: String(c.participant_name || c.participantName || "").trim(),
      page: w,
      x: Number(c.x || c.pos_x || 0) || 0,
      y: Number(c.y || c.pos_y || 0) || 0,
      width: Number(c.width || 150) || 150,
      height: Number(c.height || 32) || 32,
      placementSource: String(c.placement_source || c.placementSource || ke.MANUAL).trim() || ke.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), Ee(), p(), y(), B();
  const ne = document.getElementById("agreement-form"), be = document.getElementById("submit-btn"), Ye = document.getElementById("form-announcements");
  function Pt(c, a = "", g = 0) {
    const h = String(a || "").trim().toUpperCase(), w = String(c || "").trim().toLowerCase();
    return h === "SCOPE_DENIED" || w.includes("scope denied") ? "You don't have access to this organization's resources." : h === "TRANSPORT_SECURITY" || h === "TRANSPORT_SECURITY_REQUIRED" || w.includes("tls transport required") || Number(g) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : h === "PDF_UNSUPPORTED" || w === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(c || "").trim() !== "" ? String(c).trim() : "Something went wrong. Please try again.";
  }
  async function At(c, a) {
    const g = Number(c?.status || 0);
    let h = "", w = "";
    try {
      const b = await c.json();
      h = String(b?.error?.code || b?.code || "").trim(), w = String(b?.error?.message || b?.message || "").trim();
    } catch {
      w = "";
    }
    return w === "" && (w = a || `Request failed (${g || "unknown"})`), {
      status: g,
      code: h,
      message: Pt(w, h, g)
    };
  }
  function pe(c, a = "", g = 0) {
    const h = Pt(c, a, g);
    Ye && (Ye.textContent = h), window.toastManager ? window.toastManager.error(h) : alert(h);
  }
  function ri() {
    const c = [];
    De.querySelectorAll(".participant-entry").forEach((w) => {
      const b = String(w.getAttribute("data-participant-id") || "").trim(), P = String(w.querySelector('input[name*=".name"]')?.value || "").trim(), _ = String(w.querySelector('input[name*=".email"]')?.value || "").trim(), D = String(w.querySelector('select[name*=".role"]')?.value || "signer").trim(), k = w.querySelector(".notify-input")?.checked !== !1, I = String(w.querySelector(".signing-stage-input")?.value || "").trim(), N = Number(I || "1") || 1;
      c.push({
        id: b,
        name: P,
        email: _,
        role: D,
        notify: k,
        signing_stage: D === "signer" ? N : 0
      });
    });
    const a = [];
    Ce.querySelectorAll(".field-definition-entry").forEach((w) => {
      const b = String(w.getAttribute("data-field-definition-id") || "").trim(), P = String(w.querySelector(".field-type-select")?.value || "signature").trim(), _ = String(w.querySelector(".field-participant-select")?.value || "").trim(), D = Number(w.querySelector('input[name*=".page"]')?.value || "1") || 1, k = !!w.querySelector('input[name*=".required"]')?.checked;
      b && a.push({
        id: b,
        type: P,
        participant_id: _,
        page: D,
        required: k
      });
    });
    const g = [];
    C && Array.isArray(C.fieldInstances) && C.fieldInstances.forEach((w, b) => {
      g.push(Zi(w, b));
    });
    const h = JSON.stringify(g);
    return Gt && (Gt.value = h), {
      document_id: String(we?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: c,
      field_instances: a,
      field_placements: g,
      field_placements_json: h,
      field_rules: L(),
      field_rules_json: String(mn?.value || "[]"),
      send_for_signature: le === yt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(Ve?.value || "0") || 0
    };
  }
  function fn() {
    const c = je(), a = /* @__PURE__ */ new Map();
    return c.forEach((w) => {
      a.set(w.id, !1);
    }), Ce.querySelectorAll(".field-definition-entry").forEach((w) => {
      const b = w.querySelector(".field-type-select"), P = w.querySelector(".field-participant-select"), _ = w.querySelector('input[name*=".required"]');
      b?.value === "signature" && P?.value && _?.checked && a.set(P.value, !0);
    }), M(x(), f()).forEach((w) => {
      w.type === "signature" && w.participantId && w.required && a.set(w.participantId, !0);
    }), c.filter((w) => !a.get(w.id));
  }
  function Nn(c) {
    if (!Array.isArray(c) || c.length === 0)
      return "Each signer requires at least one required signature field.";
    const a = c.map((g) => g?.name?.trim()).filter((g) => !!g);
    return a.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${a.join(", ")}`;
  }
  ne.addEventListener("submit", function(c) {
    if (B(), !we.value) {
      c.preventDefault(), pe("Please select a document"), Ie.focus();
      return;
    }
    if (!Cn()) {
      c.preventDefault();
      return;
    }
    const a = De.querySelectorAll(".participant-entry");
    if (a.length === 0) {
      c.preventDefault(), pe("Please add at least one participant"), un.focus();
      return;
    }
    let g = !1;
    if (a.forEach((I) => {
      I.querySelector('select[name*=".role"]').value === "signer" && (g = !0);
    }), !g) {
      c.preventDefault(), pe("At least one signer is required");
      const I = a[0]?.querySelector('select[name*=".role"]');
      I && I.focus();
      return;
    }
    const h = Ce.querySelectorAll(".field-definition-entry"), w = fn();
    if (w.length > 0) {
      c.preventDefault(), pe(Nn(w)), yn(Pe.FIELDS), zt.focus();
      return;
    }
    let b = !1;
    if (h.forEach((I) => {
      I.querySelector(".field-participant-select").value || (b = !0);
    }), b) {
      c.preventDefault(), pe("Please assign all fields to a signer");
      const I = Ce.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      I && I.focus();
      return;
    }
    if (x().some((I) => !I.participantId)) {
      c.preventDefault(), pe("Please assign all automation rules to a signer"), Array.from(Se?.querySelectorAll(".field-rule-participant-select") || []).find((N) => !N.value)?.focus();
      return;
    }
    const D = !!ne.querySelector('input[name="save_as_draft"]'), k = le === yt && !D;
    if (k) {
      let I = ne.querySelector('input[name="send_for_signature"]');
      I || (I = document.createElement("input"), I.type = "hidden", I.name = "send_for_signature", ne.appendChild(I)), I.value = "1";
    } else
      ne.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      c.preventDefault(), be.disabled = !0, be.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${k ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          ri(), O.updateState(O.collectFormState()), await Me.forceSync();
          const I = O.getState();
          if (I?.syncPending)
            throw new Error("Unable to sync latest draft changes");
          const N = String(I?.serverDraftId || "").trim();
          if (!N)
            throw new Error("Draft session not available. Please try again.");
          const U = String(e.routes?.index || "").trim();
          if (!k) {
            if (U) {
              window.location.href = U;
              return;
            }
            window.location.reload();
            return;
          }
          const z = await fetch(
            F(`${u}/${encodeURIComponent(N)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: G(),
              body: JSON.stringify({
                expected_revision: Number(I?.serverRevision || 0),
                created_by_user_id: v
              })
            }
          );
          if (!z.ok)
            throw await At(z, "Failed to send agreement");
          const q = await z.json(), W = String(q?.agreement_id || q?.id || q?.data?.id || "").trim();
          if (O.clear(), Me.broadcastStateUpdate(), W && U) {
            window.location.href = `${U}/${encodeURIComponent(W)}`;
            return;
          }
          if (U) {
            window.location.href = U;
            return;
          }
          window.location.reload();
        } catch (I) {
          const N = String(I?.message || "Failed to process agreement").trim(), U = String(I?.code || "").trim(), z = Number(I?.status || 0);
          pe(N, U, z), be.disabled = !1, be.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }
    be.disabled = !0, be.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${k ? "Sending..." : "Saving..."}
    `;
  });
  let le = 1;
  const Ti = document.querySelectorAll(".wizard-step-btn"), xs = document.querySelectorAll(".wizard-step"), Is = document.querySelectorAll(".wizard-connector"), _i = document.getElementById("wizard-prev-btn"), ai = document.getElementById("wizard-next-btn"), Di = document.getElementById("wizard-save-btn");
  function oi() {
    if (Ti.forEach((c, a) => {
      const g = a + 1, h = c.querySelector(".wizard-step-number");
      g < le ? (c.classList.remove("text-gray-500", "text-blue-600"), c.classList.add("text-green-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), h.classList.add("bg-green-600", "text-white"), c.removeAttribute("aria-current")) : g === le ? (c.classList.remove("text-gray-500", "text-green-600"), c.classList.add("text-blue-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), h.classList.add("bg-blue-600", "text-white"), c.setAttribute("aria-current", "step")) : (c.classList.remove("text-blue-600", "text-green-600"), c.classList.add("text-gray-500"), h.classList.remove("bg-blue-600", "text-white", "bg-green-600"), h.classList.add("bg-gray-300", "text-gray-600"), c.removeAttribute("aria-current"));
    }), Is.forEach((c, a) => {
      a < le - 1 ? (c.classList.remove("bg-gray-300"), c.classList.add("bg-green-600")) : (c.classList.remove("bg-green-600"), c.classList.add("bg-gray-300"));
    }), xs.forEach((c) => {
      parseInt(c.dataset.step, 10) === le ? c.classList.remove("hidden") : c.classList.add("hidden");
    }), _i.classList.toggle("hidden", le === 1), ai.classList.toggle("hidden", le === yt), Di.classList.toggle("hidden", le !== yt), be.classList.toggle("hidden", le !== yt), le < yt) {
      const c = br[le] || "Next";
      ai.innerHTML = `
        ${c}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    le === Pe.PLACEMENT ? Ls() : le === Pe.REVIEW && Js(), Ge.updateVisibility(le);
  }
  function Es(c) {
    switch (c) {
      case 1:
        return we.value ? !!Cn() : (pe("Please select a document"), !1);
      case 2:
        const a = document.getElementById("title");
        return a.value.trim() ? !0 : (pe("Please enter an agreement title"), a.focus(), !1);
      case 3:
        const g = De.querySelectorAll(".participant-entry");
        if (g.length === 0)
          return pe("Please add at least one participant"), !1;
        let h = !1;
        return g.forEach((D) => {
          D.querySelector('select[name*=".role"]').value === "signer" && (h = !0);
        }), h ? !0 : (pe("At least one signer is required"), !1);
      case 4:
        const w = Ce.querySelectorAll(".field-definition-entry");
        for (const D of w) {
          const k = D.querySelector(".field-participant-select");
          if (!k.value)
            return pe("Please assign all fields to a signer"), k.focus(), !1;
        }
        if (x().find((D) => !D.participantId))
          return pe("Please assign all automation rules to a signer"), Se?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const _ = fn();
        return _.length > 0 ? (pe(Nn(_)), zt.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function yn(c) {
    if (!(c < Pe.DOCUMENT || c > yt)) {
      if (c > le) {
        for (let a = le; a < c; a++)
          if (!Es(a)) return;
      }
      le = c, oi(), O.updateStep(c), Mt(), Me.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  Ti.forEach((c) => {
    c.addEventListener("click", () => {
      const a = parseInt(c.dataset.step, 10);
      yn(a);
    });
  }), _i.addEventListener("click", () => yn(le - 1)), ai.addEventListener("click", () => yn(le + 1)), Di.addEventListener("click", () => {
    const c = document.createElement("input");
    c.type = "hidden", c.name = "save_as_draft", c.value = "1", ne.appendChild(c), ne.submit();
  });
  let C = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((c, a) => Gn(c, a)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: Dr()
  };
  const mt = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, Un = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function Ls() {
    const c = document.getElementById("placement-loading"), a = document.getElementById("placement-no-document"), g = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const h = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const w = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const b = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !we.value) {
      c.classList.add("hidden"), a.classList.remove("hidden");
      return;
    }
    c.classList.remove("hidden"), a.classList.add("hidden");
    const P = Q(), _ = new Set(
      P.map((W) => String(W.definitionId || "").trim()).filter((W) => W)
    );
    C.fieldInstances = C.fieldInstances.filter(
      (W) => _.has(String(W.definitionId || "").trim())
    ), g.innerHTML = "";
    const D = C.linkGroupState.groups.size > 0, k = document.getElementById("link-batch-actions");
    k && k.classList.toggle("hidden", !D);
    const I = P.map((W) => {
      const ee = String(W.definitionId || "").trim(), ce = C.linkGroupState.definitionToGroup.get(ee) || "", ge = C.linkGroupState.unlinkedDefinitions.has(ee);
      return { ...W, definitionId: ee, linkGroupId: ce, isUnlinked: ge };
    });
    I.forEach((W, ee) => {
      const ce = W.definitionId, ge = String(W.fieldType || "text").trim() || "text", ye = String(W.participantId || "").trim(), ie = String(W.participantName || "Unassigned").trim() || "Unassigned", de = parseInt(String(W.page || "1"), 10) || 1, Xe = W.linkGroupId, ui = W.isUnlinked;
      if (!ce) return;
      C.fieldInstances.forEach((He) => {
        He.definitionId === ce && (He.type = ge, He.participantId = ye, He.participantName = ie);
      });
      const pi = mt[ge] || mt.text, X = C.fieldInstances.some((He) => He.definitionId === ce), se = document.createElement("div");
      se.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${X ? "opacity-50" : ""}`, se.draggable = !X, se.dataset.definitionId = ce, se.dataset.fieldType = ge, se.dataset.participantId = ye, se.dataset.participantName = ie, se.dataset.page = String(de), Xe && (se.dataset.linkGroupId = Xe);
      const Wt = document.createElement("span");
      Wt.className = `w-3 h-3 rounded ${pi.bg}`;
      const ft = document.createElement("div");
      ft.className = "flex-1 text-xs";
      const Jt = document.createElement("div");
      Jt.className = "font-medium capitalize", Jt.textContent = ge.replace(/_/g, " ");
      const Yt = document.createElement("div");
      Yt.className = "text-gray-500", Yt.textContent = ie;
      const _t = document.createElement("span");
      _t.className = `placement-status text-xs ${X ? "text-green-600" : "text-amber-600"}`, _t.textContent = X ? "Placed" : "Not placed", ft.appendChild(Jt), ft.appendChild(Yt), se.appendChild(Wt), se.appendChild(ft), se.appendChild(_t), se.addEventListener("dragstart", (He) => {
        if (X) {
          He.preventDefault();
          return;
        }
        He.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: ce,
          fieldType: ge,
          participantId: ye,
          participantName: ie
        })), He.dataTransfer.effectAllowed = "copy", se.classList.add("opacity-50");
      }), se.addEventListener("dragend", () => {
        se.classList.remove("opacity-50");
      }), g.appendChild(se);
      const Ui = I[ee + 1];
      if (Xe && Ui && Ui.linkGroupId === Xe) {
        const He = Mi(ce, !ui);
        g.appendChild(He);
      }
    }), Cs();
    const N = ++C.loadRequestVersion, U = String(we.value || "").trim(), z = encodeURIComponent(U), q = `${n}/panels/esign_documents/${z}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const ee = await window.pdfjsLib.getDocument({
        url: q,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (N !== C.loadRequestVersion)
        return;
      C.pdfDoc = ee, C.totalPages = C.pdfDoc.numPages, C.currentPage = 1, b.textContent = C.totalPages, await dt(C.currentPage), c.classList.add("hidden"), C.uiHandlersBound || (ks(h, w), Bs(), Fs(), C.uiHandlersBound = !0), ht();
    } catch (W) {
      if (N !== C.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", W), c.classList.add("hidden"), a.classList.remove("hidden"), a.textContent = `Failed to load PDF: ${Pt(W?.message || "Failed to load PDF")}`;
    }
    vn(), ze();
  }
  function Mi(c, a) {
    const g = document.createElement("div");
    return g.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", g.dataset.definitionId = c, g.dataset.isLinked = String(a), g.title = a ? "Click to unlink this field" : "Click to re-link this field", g.setAttribute("role", "button"), g.setAttribute("aria-label", a ? "Unlink field from group" : "Re-link field to group"), g.setAttribute("tabindex", "0"), a ? g.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : g.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, g.addEventListener("click", () => $i(c, a)), g.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), $i(c, a));
    }), g;
  }
  function $i(c, a) {
    a ? (C.linkGroupState = Yi(C.linkGroupState, c), window.toastManager && window.toastManager.info("Field unlinked")) : (C.linkGroupState = Ki(C.linkGroupState, c), window.toastManager && window.toastManager.info("Field re-linked")), ci();
  }
  function Cs() {
    const c = document.getElementById("link-all-btn"), a = document.getElementById("unlink-all-btn");
    c && !c.dataset.bound && (c.dataset.bound = "true", c.addEventListener("click", () => {
      const g = C.linkGroupState.unlinkedDefinitions.size;
      if (g !== 0) {
        for (const h of C.linkGroupState.unlinkedDefinitions)
          C.linkGroupState = Ki(C.linkGroupState, h);
        window.toastManager && window.toastManager.success(`Re-linked ${g} field${g > 1 ? "s" : ""}`), ci();
      }
    })), a && !a.dataset.bound && (a.dataset.bound = "true", a.addEventListener("click", () => {
      let g = 0;
      for (const h of C.linkGroupState.definitionToGroup.keys())
        C.linkGroupState.unlinkedDefinitions.has(h) || (C.linkGroupState = Yi(C.linkGroupState, h), g++);
      g > 0 && window.toastManager && window.toastManager.success(`Unlinked ${g} field${g > 1 ? "s" : ""}`), ci();
    })), Bi();
  }
  function Bi() {
    const c = document.getElementById("link-all-btn"), a = document.getElementById("unlink-all-btn");
    if (c) {
      const g = C.linkGroupState.unlinkedDefinitions.size > 0;
      c.disabled = !g;
    }
    if (a) {
      let g = !1;
      for (const h of C.linkGroupState.definitionToGroup.keys())
        if (!C.linkGroupState.unlinkedDefinitions.has(h)) {
          g = !0;
          break;
        }
      a.disabled = !g;
    }
  }
  function ci() {
    const c = document.getElementById("placement-fields-list");
    if (!c) return;
    const a = Q();
    c.innerHTML = "";
    const g = a.map((h) => {
      const w = String(h.definitionId || "").trim(), b = C.linkGroupState.definitionToGroup.get(w) || "", P = C.linkGroupState.unlinkedDefinitions.has(w);
      return { ...h, definitionId: w, linkGroupId: b, isUnlinked: P };
    });
    g.forEach((h, w) => {
      const b = h.definitionId, P = String(h.fieldType || "text").trim() || "text", _ = String(h.participantId || "").trim(), D = String(h.participantName || "Unassigned").trim() || "Unassigned", k = parseInt(String(h.page || "1"), 10) || 1, I = h.linkGroupId, N = h.isUnlinked;
      if (!b) return;
      const U = mt[P] || mt.text, z = C.fieldInstances.some((de) => de.definitionId === b), q = document.createElement("div");
      q.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${z ? "opacity-50" : ""}`, q.draggable = !z, q.dataset.definitionId = b, q.dataset.fieldType = P, q.dataset.participantId = _, q.dataset.participantName = D, q.dataset.page = String(k), I && (q.dataset.linkGroupId = I);
      const W = document.createElement("span");
      W.className = `w-3 h-3 rounded ${U.bg}`;
      const ee = document.createElement("div");
      ee.className = "flex-1 text-xs";
      const ce = document.createElement("div");
      ce.className = "font-medium capitalize", ce.textContent = P.replace(/_/g, " ");
      const ge = document.createElement("div");
      ge.className = "text-gray-500", ge.textContent = D;
      const ye = document.createElement("span");
      ye.className = `placement-status text-xs ${z ? "text-green-600" : "text-amber-600"}`, ye.textContent = z ? "Placed" : "Not placed", ee.appendChild(ce), ee.appendChild(ge), q.appendChild(W), q.appendChild(ee), q.appendChild(ye), q.addEventListener("dragstart", (de) => {
        if (z) {
          de.preventDefault();
          return;
        }
        de.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: b,
          fieldType: P,
          participantId: _,
          participantName: D
        })), de.dataTransfer.effectAllowed = "copy", q.classList.add("opacity-50");
      }), q.addEventListener("dragend", () => {
        q.classList.remove("opacity-50");
      }), c.appendChild(q);
      const ie = g[w + 1];
      if (I && ie && ie.linkGroupId === I) {
        const de = Mi(b, !N);
        c.appendChild(de);
      }
    }), Bi();
  }
  async function dt(c) {
    if (!C.pdfDoc) return;
    const a = document.getElementById("placement-pdf-canvas"), g = document.getElementById("placement-canvas-container"), h = a.getContext("2d"), w = await C.pdfDoc.getPage(c), b = w.getViewport({ scale: C.scale });
    a.width = b.width, a.height = b.height, g.style.width = `${b.width}px`, g.style.height = `${b.height}px`, await w.render({
      canvasContext: h,
      viewport: b
    }).promise, document.getElementById("placement-current-page").textContent = c, ht();
  }
  function ks(c, a) {
    const g = document.getElementById("placement-pdf-canvas");
    c.addEventListener("dragover", (h) => {
      h.preventDefault(), h.dataTransfer.dropEffect = "copy", g.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("dragleave", (h) => {
      g.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("drop", (h) => {
      h.preventDefault(), g.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const w = h.dataTransfer.getData("application/json");
      if (!w) return;
      const b = JSON.parse(w), P = g.getBoundingClientRect(), _ = (h.clientX - P.left) / C.scale, D = (h.clientY - P.top) / C.scale;
      Fi(b, _, D);
    });
  }
  function Fi(c, a, g, h = {}) {
    const w = Un[c.fieldType] || Un.text, b = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, P = h.placementSource || ke.MANUAL, _ = h.linkGroupId || ps(C.linkGroupState, c.definitionId)?.id, D = {
      id: b,
      definitionId: c.definitionId,
      type: c.fieldType,
      participantId: c.participantId,
      participantName: c.participantName,
      page: C.currentPage,
      x: Math.max(0, a - w.width / 2),
      y: Math.max(0, g - w.height / 2),
      width: w.width,
      height: w.height,
      placementSource: P,
      linkGroupId: _,
      linkedFromFieldId: h.linkedFromFieldId
    };
    C.fieldInstances.push(D), Ri(c.definitionId), P === ke.MANUAL && _ && _s(D), ht(), vn(), ze();
  }
  function Ri(c, a = !1) {
    const g = document.querySelector(`.placement-field-item[data-definition-id="${c}"]`);
    if (g) {
      g.classList.add("opacity-50"), g.draggable = !1;
      const h = g.querySelector(".placement-status");
      h && (h.textContent = "Placed", h.classList.remove("text-amber-600"), h.classList.add("text-green-600")), a && g.classList.add("just-linked");
    }
  }
  function Ps(c) {
    const a = $r(
      C.linkGroupState,
      c
    );
    a && (C.linkGroupState = Ji(C.linkGroupState, a.updatedGroup));
  }
  function Hi(c) {
    const a = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((b) => {
      const P = b.dataset.definitionId, _ = b.dataset.page;
      if (P) {
        const D = C.linkGroupState.definitionToGroup.get(P);
        a.set(P, {
          type: b.dataset.fieldType || "text",
          participantId: b.dataset.participantId || "",
          participantName: b.dataset.participantName || "Unknown",
          page: _ ? parseInt(_, 10) : 1,
          linkGroupId: D
        });
      }
    });
    let h = 0;
    const w = 10;
    for (; h < w; ) {
      const b = Br(
        C.linkGroupState,
        c,
        C.fieldInstances,
        a
      );
      if (!b || !b.newPlacement) break;
      C.fieldInstances.push(b.newPlacement), Ri(b.newPlacement.definitionId, !0), h++;
    }
    h > 0 && (ht(), vn(), ze(), As(h));
  }
  function As(c) {
    const a = c === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${c} linked fields`;
    window.toastManager && window.toastManager.info(a);
    const g = document.createElement("div");
    g.setAttribute("role", "status"), g.setAttribute("aria-live", "polite"), g.className = "sr-only", g.textContent = a, document.body.appendChild(g), setTimeout(() => g.remove(), 1e3), Ts();
  }
  function Ts() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((a) => {
      a.classList.add("linked-flash"), setTimeout(() => {
        a.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function _s(c) {
    Ps(c);
  }
  function ht() {
    const c = document.getElementById("placement-overlays-container");
    c.innerHTML = "", c.style.pointerEvents = "auto", C.fieldInstances.filter((a) => a.page === C.currentPage).forEach((a) => {
      const g = mt[a.type] || mt.text, h = C.selectedFieldId === a.id, w = a.placementSource === ke.AUTO_LINKED, b = document.createElement("div"), P = w ? "border-dashed" : "border-solid";
      b.className = `field-overlay absolute cursor-move ${g.border} border-2 ${P} rounded`, b.style.cssText = `
          left: ${a.x * C.scale}px;
          top: ${a.y * C.scale}px;
          width: ${a.width * C.scale}px;
          height: ${a.height * C.scale}px;
          background-color: ${g.fill};
          ${h ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, b.dataset.instanceId = a.id;
      const _ = document.createElement("div");
      if (_.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + g.bg, _.textContent = `${a.type.replace("_", " ")} - ${a.participantName}`, b.appendChild(_), w) {
        const I = document.createElement("div");
        I.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", I.title = "Auto-linked from template", I.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, b.appendChild(I);
      }
      const D = document.createElement("div");
      D.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", D.style.cssText = "transform: translate(50%, 50%);", b.appendChild(D);
      const k = document.createElement("button");
      k.type = "button", k.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", k.innerHTML = "×", k.addEventListener("click", (I) => {
        I.stopPropagation(), $s(a.id);
      }), b.appendChild(k), b.addEventListener("mousedown", (I) => {
        I.target === D ? Ms(I, a) : I.target !== k && Ds(I, a, b);
      }), b.addEventListener("click", () => {
        C.selectedFieldId = a.id, ht();
      }), c.appendChild(b);
    });
  }
  function Ds(c, a, g) {
    c.preventDefault(), C.isDragging = !0, C.selectedFieldId = a.id;
    const h = c.clientX, w = c.clientY, b = a.x * C.scale, P = a.y * C.scale;
    function _(k) {
      const I = k.clientX - h, N = k.clientY - w;
      a.x = Math.max(0, (b + I) / C.scale), a.y = Math.max(0, (P + N) / C.scale), a.placementSource = ke.MANUAL, g.style.left = `${a.x * C.scale}px`, g.style.top = `${a.y * C.scale}px`;
    }
    function D() {
      C.isDragging = !1, document.removeEventListener("mousemove", _), document.removeEventListener("mouseup", D), ze();
    }
    document.addEventListener("mousemove", _), document.addEventListener("mouseup", D);
  }
  function Ms(c, a) {
    c.preventDefault(), c.stopPropagation(), C.isResizing = !0;
    const g = c.clientX, h = c.clientY, w = a.width, b = a.height;
    function P(D) {
      const k = (D.clientX - g) / C.scale, I = (D.clientY - h) / C.scale;
      a.width = Math.max(30, w + k), a.height = Math.max(20, b + I), a.placementSource = ke.MANUAL, ht();
    }
    function _() {
      C.isResizing = !1, document.removeEventListener("mousemove", P), document.removeEventListener("mouseup", _), ze();
    }
    document.addEventListener("mousemove", P), document.addEventListener("mouseup", _);
  }
  function $s(c) {
    const a = C.fieldInstances.find((h) => h.id === c);
    if (!a) return;
    C.fieldInstances = C.fieldInstances.filter((h) => h.id !== c);
    const g = document.querySelector(`.placement-field-item[data-definition-id="${a.definitionId}"]`);
    if (g) {
      g.classList.remove("opacity-50"), g.draggable = !0;
      const h = g.querySelector(".placement-status");
      h && (h.textContent = "Not placed", h.classList.remove("text-green-600"), h.classList.add("text-amber-600"));
    }
    ht(), vn(), ze();
  }
  function Bs() {
    const c = document.getElementById("placement-prev-page"), a = document.getElementById("placement-next-page");
    c.addEventListener("click", async () => {
      C.currentPage > 1 && (C.currentPage--, Hi(C.currentPage), await dt(C.currentPage));
    }), a.addEventListener("click", async () => {
      C.currentPage < C.totalPages && (C.currentPage++, Hi(C.currentPage), await dt(C.currentPage));
    });
  }
  function Fs() {
    const c = document.getElementById("placement-zoom-in"), a = document.getElementById("placement-zoom-out"), g = document.getElementById("placement-zoom-fit"), h = document.getElementById("placement-zoom-level");
    c.addEventListener("click", async () => {
      C.scale = Math.min(3, C.scale + 0.25), h.textContent = `${Math.round(C.scale * 100)}%`, await dt(C.currentPage);
    }), a.addEventListener("click", async () => {
      C.scale = Math.max(0.5, C.scale - 0.25), h.textContent = `${Math.round(C.scale * 100)}%`, await dt(C.currentPage);
    }), g.addEventListener("click", async () => {
      const w = document.getElementById("placement-viewer"), P = (await C.pdfDoc.getPage(C.currentPage)).getViewport({ scale: 1 });
      C.scale = (w.clientWidth - 40) / P.width, h.textContent = `${Math.round(C.scale * 100)}%`, await dt(C.currentPage);
    });
  }
  function vn() {
    const c = Array.from(document.querySelectorAll(".placement-field-item")), a = c.length, g = new Set(
      c.map((P) => String(P.dataset.definitionId || "").trim()).filter((P) => P)
    ), h = /* @__PURE__ */ new Set();
    C.fieldInstances.forEach((P) => {
      const _ = String(P.definitionId || "").trim();
      g.has(_) && h.add(_);
    });
    const w = h.size, b = Math.max(0, a - w);
    document.getElementById("placement-total-fields").textContent = a, document.getElementById("placement-placed-count").textContent = w, document.getElementById("placement-unplaced-count").textContent = b;
  }
  function ze() {
    const c = document.getElementById("field-instances-container");
    c.innerHTML = "";
    const a = C.fieldInstances.map((g, h) => Zi(g, h));
    Gt && (Gt.value = JSON.stringify(a));
  }
  ze();
  let Be = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const Tt = document.getElementById("auto-place-btn");
  Tt && Tt.addEventListener("click", async () => {
    if (Be.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      Vt("All fields are already placed", "info");
      return;
    }
    const a = document.querySelector('input[name="id"]')?.value;
    if (!a) {
      li();
      return;
    }
    Be.isRunning = !0, Tt.disabled = !0, Tt.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const g = await fetch(`${l}/esign/agreements/${a}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Rs()
        })
      });
      if (!g.ok)
        throw await At(g, "Auto-placement failed");
      const h = await g.json(), w = h && typeof h == "object" && h.run && typeof h.run == "object" ? h.run : h;
      Be.currentRunId = w?.run_id || w?.id || null, Be.suggestions = w?.suggestions || [], Be.resolverScores = w?.resolver_scores || [], Be.suggestions.length === 0 ? (Vt("No placement suggestions found. Try placing fields manually.", "warning"), li()) : Hs(h);
    } catch (g) {
      console.error("Auto-place error:", g);
      const h = Pt(g?.message || "Auto-placement failed", g?.code || "", g?.status || 0);
      Vt(`Auto-placement failed: ${h}`, "error"), li();
    } finally {
      Be.isRunning = !1, Tt.disabled = !1, Tt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Rs() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function li() {
    const c = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let a = 100;
    c.forEach((g) => {
      const h = {
        definitionId: g.dataset.definitionId,
        fieldType: g.dataset.fieldType,
        participantId: g.dataset.participantId,
        participantName: g.dataset.participantName
      }, w = Un[h.fieldType] || Un.text;
      C.currentPage = C.totalPages, Fi(h, 300, a + w.height / 2, { placementSource: ke.AUTO_FALLBACK }), a += w.height + 20;
    }), C.pdfDoc && dt(C.totalPages), Vt("Fields placed using fallback layout", "info");
  }
  function Hs(c) {
    let a = document.getElementById("placement-suggestions-modal");
    a || (a = Ns(), document.body.appendChild(a));
    const g = a.querySelector("#suggestions-list"), h = a.querySelector("#resolver-info"), w = a.querySelector("#run-stats");
    h.innerHTML = Be.resolverScores.map((b) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${oe(String(b?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${b.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${Gs(b.score)}">
              ${(Number(b?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), w.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${oe(String(c?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${c.status === "completed" ? "text-green-600" : "text-amber-600"}">${oe(String(c?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(c?.elapsed_ms || 0))}ms</span>
      </div>
    `, g.innerHTML = Be.suggestions.map((b, P) => {
      const _ = Ni(b.field_definition_id), D = mt[_?.type] || mt.text, k = oe(String(_?.type || "field").replace(/_/g, " ")), I = oe(String(b?.id || "")), N = Math.max(1, Number(b?.page_number || 1)), U = Math.round(Number(b?.x || 0)), z = Math.round(Number(b?.y || 0)), q = Math.max(0, Number(b?.confidence || 0)), W = oe(Vs(String(b?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${P}" data-suggestion-id="${I}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${D.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${k}</div>
                <div class="text-xs text-gray-500">Page ${N}, (${U}, ${z})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${Os(b.confidence)}">
                ${(q * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${W}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${P}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${P}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${P}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), Us(a), a.classList.remove("hidden");
  }
  function Ns() {
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
    }), c.addEventListener("click", (a) => {
      a.target === c && c.classList.add("hidden");
    }), c.querySelector("#accept-all-btn").addEventListener("click", () => {
      c.querySelectorAll(".suggestion-item").forEach((a) => {
        a.classList.add("border-green-500", "bg-green-50"), a.classList.remove("border-red-500", "bg-red-50"), a.dataset.accepted = "true";
      });
    }), c.querySelector("#reject-all-btn").addEventListener("click", () => {
      c.querySelectorAll(".suggestion-item").forEach((a) => {
        a.classList.add("border-red-500", "bg-red-50"), a.classList.remove("border-green-500", "bg-green-50"), a.dataset.accepted = "false";
      });
    }), c.querySelector("#apply-suggestions-btn").addEventListener("click", () => {
      js(), c.classList.add("hidden");
    }), c.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      c.classList.add("hidden");
      const a = c.querySelector("#placement-policy-preset-modal"), g = document.getElementById("placement-policy-preset");
      g && a && (g.value = a.value), Tt?.click();
    }), c;
  }
  function Us(c) {
    c.querySelectorAll(".accept-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const g = a.closest(".suggestion-item");
        g.classList.add("border-green-500", "bg-green-50"), g.classList.remove("border-red-500", "bg-red-50"), g.dataset.accepted = "true";
      });
    }), c.querySelectorAll(".reject-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const g = a.closest(".suggestion-item");
        g.classList.add("border-red-500", "bg-red-50"), g.classList.remove("border-green-500", "bg-green-50"), g.dataset.accepted = "false";
      });
    }), c.querySelectorAll(".preview-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const g = parseInt(a.dataset.index, 10), h = Be.suggestions[g];
        h && qs(h);
      });
    });
  }
  function qs(c) {
    c.page_number !== C.currentPage && (C.currentPage = c.page_number, dt(c.page_number));
    const a = document.getElementById("placement-overlays-container"), g = document.getElementById("suggestion-preview-overlay");
    g && g.remove();
    const h = document.createElement("div");
    h.id = "suggestion-preview-overlay", h.className = "absolute pointer-events-none animate-pulse", h.style.cssText = `
      left: ${c.x * C.scale}px;
      top: ${c.y * C.scale}px;
      width: ${c.width * C.scale}px;
      height: ${c.height * C.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, a.appendChild(h), setTimeout(() => h.remove(), 3e3);
  }
  function js() {
    const a = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    a.forEach((g) => {
      const h = parseInt(g.dataset.index, 10), w = Be.suggestions[h];
      if (!w) return;
      const b = Ni(w.field_definition_id);
      if (!b) return;
      const P = document.querySelector(`.placement-field-item[data-definition-id="${w.field_definition_id}"]`);
      if (!P || P.classList.contains("opacity-50")) return;
      const _ = {
        definitionId: w.field_definition_id,
        fieldType: b.type,
        participantId: b.participant_id,
        participantName: P.dataset.participantName
      };
      C.currentPage = w.page_number, zs(_, w);
    }), C.pdfDoc && dt(C.currentPage), Ws(a.length, Be.suggestions.length - a.length), Vt(`Applied ${a.length} placement${a.length !== 1 ? "s" : ""}`, "success");
  }
  function zs(c, a) {
    const g = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: c.definitionId,
      type: c.fieldType,
      participantId: c.participantId,
      participantName: c.participantName,
      page: a.page_number,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      // Track placement source for audit
      placementSource: ke.AUTO,
      resolverId: a.resolver_id,
      confidence: a.confidence,
      placementRunId: Be.currentRunId
    };
    C.fieldInstances.push(g);
    const h = document.querySelector(`.placement-field-item[data-definition-id="${c.definitionId}"]`);
    if (h) {
      h.classList.add("opacity-50"), h.draggable = !1;
      const w = h.querySelector(".placement-status");
      w && (w.textContent = "Placed", w.classList.remove("text-amber-600"), w.classList.add("text-green-600"));
    }
    ht(), vn(), ze();
  }
  function Ni(c) {
    const a = document.querySelector(`.field-definition-entry[data-field-definition-id="${c}"]`);
    return a ? {
      id: c,
      type: a.querySelector(".field-type-select")?.value || "text",
      participant_id: a.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function Os(c) {
    return c >= 0.9 ? "bg-green-100 text-green-800" : c >= 0.7 ? "bg-blue-100 text-blue-800" : c >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Gs(c) {
    return c >= 0.8 ? "bg-green-100 text-green-800" : c >= 0.6 ? "bg-blue-100 text-blue-800" : c >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Vs(c) {
    return c ? c.split("_").map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(" ") : "Unknown";
  }
  async function Ws(c, a) {
  }
  function Vt(c, a = "info") {
    const g = document.createElement("div");
    g.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${a === "success" ? "bg-green-600 text-white" : a === "error" ? "bg-red-600 text-white" : a === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, g.textContent = c, document.body.appendChild(g), setTimeout(() => {
      g.style.opacity = "0", setTimeout(() => g.remove(), 300);
    }, 3e3);
  }
  function Js() {
    const c = document.getElementById("send-readiness-loading"), a = document.getElementById("send-readiness-results"), g = document.getElementById("send-validation-status"), h = document.getElementById("send-validation-issues"), w = document.getElementById("send-issues-list"), b = document.getElementById("send-confirmation"), P = document.getElementById("review-agreement-title"), _ = document.getElementById("review-document-title"), D = document.getElementById("review-participant-count"), k = document.getElementById("review-stage-count"), I = document.getElementById("review-participants-list"), N = document.getElementById("review-fields-summary"), U = document.getElementById("title").value || "Untitled", z = et.textContent || "No document", q = De.querySelectorAll(".participant-entry"), W = Ce.querySelectorAll(".field-definition-entry"), ee = M(x(), f()), ce = je(), ge = /* @__PURE__ */ new Set();
    q.forEach((X) => {
      const se = X.querySelector(".signing-stage-input");
      X.querySelector('select[name*=".role"]').value === "signer" && se?.value && ge.add(parseInt(se.value, 10));
    }), P.textContent = U, _.textContent = z, D.textContent = `${q.length} (${ce.length} signers)`, k.textContent = ge.size > 0 ? ge.size : "1", I.innerHTML = "", q.forEach((X) => {
      const se = X.querySelector('input[name*=".name"]'), Wt = X.querySelector('input[name*=".email"]'), ft = X.querySelector('select[name*=".role"]'), Jt = X.querySelector(".signing-stage-input"), Yt = X.querySelector(".notify-input"), _t = document.createElement("div");
      _t.className = "flex items-center justify-between text-sm", _t.innerHTML = `
        <div>
          <span class="font-medium">${oe(se.value || Wt.value)}</span>
          <span class="text-gray-500 ml-2">${oe(Wt.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${ft.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${ft.value === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${Yt?.checked !== !1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${Yt?.checked !== !1 ? "Notify" : "No Notify"}
          </span>
          ${ft.value === "signer" && Jt?.value ? `<span class="text-xs text-gray-500">Stage ${Jt.value}</span>` : ""}
        </div>
      `, I.appendChild(_t);
    });
    const ye = W.length + ee.length;
    N.textContent = `${ye} field${ye !== 1 ? "s" : ""} defined (${W.length} manual, ${ee.length} generated)`;
    const ie = [];
    we.value || ie.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), ce.length === 0 && ie.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), fn().forEach((X) => {
      ie.push({
        severity: "error",
        message: `${X.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Xe = Array.from(ge).sort((X, se) => X - se);
    for (let X = 0; X < Xe.length; X++)
      if (Xe[X] !== X + 1) {
        ie.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const ui = ie.some((X) => X.severity === "error"), pi = ie.some((X) => X.severity === "warning");
    ui ? (g.className = "p-4 rounded-lg bg-red-50 border border-red-200", g.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, b.classList.add("hidden"), be.disabled = !0) : pi ? (g.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", g.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, b.classList.remove("hidden"), be.disabled = !1) : (g.className = "p-4 rounded-lg bg-green-50 border border-green-200", g.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, b.classList.remove("hidden"), be.disabled = !1), ie.length > 0 ? (h.classList.remove("hidden"), w.innerHTML = "", ie.forEach((X) => {
      const se = document.createElement("li");
      se.className = `p-3 rounded-lg flex items-center justify-between ${X.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, se.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${X.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${X.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${oe(X.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${X.step}">
            ${oe(X.action)}
          </button>
        `, w.appendChild(se);
    }), w.querySelectorAll("[data-go-to-step]").forEach((X) => {
      X.addEventListener("click", () => {
        const se = Number(X.getAttribute("data-go-to-step"));
        Number.isFinite(se) && yn(se);
      });
    })) : h.classList.add("hidden"), c.classList.add("hidden"), a.classList.remove("hidden");
  }
  let di = null;
  function Ke() {
    di && clearTimeout(di), di = setTimeout(() => {
      Mt();
    }, 500);
  }
  we && new MutationObserver(() => {
    Mt();
  }).observe(we, { attributes: !0, attributeFilter: ["value"] });
  const Ys = document.getElementById("title"), Ks = document.getElementById("message");
  Ys?.addEventListener("input", Ke), Ks?.addEventListener("input", Ke), De.addEventListener("input", Ke), De.addEventListener("change", Ke), Ce.addEventListener("input", Ke), Ce.addEventListener("change", Ke), Se?.addEventListener("input", Ke), Se?.addEventListener("change", Ke);
  const Xs = ze;
  ze = function() {
    Xs(), Mt();
  };
  function Qs() {
    const c = O.getState();
    !c.participants || c.participants.length === 0 || (De.innerHTML = "", Mn = 0, c.participants.forEach((a) => {
      qe({
        id: a.tempId,
        name: a.name,
        email: a.email,
        role: a.role,
        notify: a.notify !== !1,
        signing_stage: a.signingStage
      });
    }));
  }
  function Zs() {
    const c = O.getState();
    !c.fieldDefinitions || c.fieldDefinitions.length === 0 || (Ce.innerHTML = "", he = 0, c.fieldDefinitions.forEach((a) => {
      xe({
        id: a.tempId,
        type: a.type,
        participant_id: a.participantTempId,
        page: a.page,
        required: a.required
      });
    }), Ee());
  }
  function er() {
    const c = O.getState();
    !Array.isArray(c.fieldRules) || c.fieldRules.length === 0 || Se && (Se.querySelectorAll(".field-rule-entry").forEach((a) => a.remove()), kt = 0, c.fieldRules.forEach((a) => {
      Z({
        id: a.id,
        type: a.type,
        participantId: a.participantId || a.participantTempId,
        fromPage: a.fromPage,
        toPage: a.toPage,
        page: a.page,
        excludeLastPage: a.excludeLastPage,
        excludePages: a.excludePages,
        required: a.required
      });
    }), y(), B());
  }
  function tr() {
    const c = O.getState();
    !Array.isArray(c.fieldPlacements) || c.fieldPlacements.length === 0 || (C.fieldInstances = c.fieldPlacements.map((a, g) => Gn(a, g)), ze());
  }
  if (window._resumeToStep) {
    Qs(), Zs(), er(), p(), tr();
    const c = O.getState();
    c.document?.id && Ge.setDocument(c.document.id, c.document.title, c.document.pageCount), le = window._resumeToStep, oi(), delete window._resumeToStep;
  } else if (oi(), we.value) {
    const c = et?.textContent || null, a = me(Ve.value, null);
    Ge.setDocument(we.value, c, a);
  }
  o && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function zr(i) {
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
class fs {
  constructor(e) {
    this.initialized = !1, this.config = zr(e);
  }
  init() {
    this.initialized || (this.initialized = !0, jr(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function io(i) {
  const e = new fs(i);
  return te(() => e.init()), e;
}
function Or(i) {
  const e = new fs({
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
      Or({
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
const Gr = "esign.signer.profile.v1", es = "esign.signer.profile.outbox.v1", Ii = 90, ts = 500 * 1024;
class Vr {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : Ii;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Gr}:${e}`;
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
class Wr {
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
class yi {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(es);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [s, l] of Object.entries(t)) {
        if (!l || typeof l != "object")
          continue;
        const u = l;
        if (u.op === "clear") {
          n[s] = {
            op: "clear",
            updatedAt: Number(u.updatedAt) || Date.now()
          };
          continue;
        }
        const o = u.op === "patch" ? u.patch : u;
        n[s] = {
          op: "patch",
          patch: o && typeof o == "object" ? o : {},
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
      window.localStorage.setItem(es, JSON.stringify(e));
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
function Jr(i) {
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
      ttlDays: Number(i.profile?.ttlDays || Ii) || Ii,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Yr(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function vi(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Kr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Fe(i) {
  const e = String(i || "").trim();
  return Kr(e) ? "" : e;
}
function Xr(i) {
  const e = new Vr(i.profile.ttlDays), t = new Wr(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new yi("local_only", e, null) : i.profile.mode === "remote_only" ? new yi("remote_only", e, t) : new yi("hybrid", e, t);
}
function Qr() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Zr(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Jr(i), s = Yr(n), l = Xr(n);
  Qr();
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
    track(r, d = {}) {
      if (!n.telemetryEnabled) return;
      const p = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...d
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
    trackViewerLoad(r, d, p = null) {
      this.metrics.viewerLoadTime = d, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: d,
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
    trackFieldSave(r, d, p, f, y = null) {
      this.metrics.fieldSaveLatencies.push(f), p ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: y }), this.track(p ? "field_save_success" : "field_save_failed", {
        fieldId: r,
        fieldType: d,
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
    trackSignatureAttach(r, d, p, f, y = null) {
      this.metrics.signatureAttachLatencies.push(f), this.track(p ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: r,
        signatureType: d,
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
    trackSubmit(r, d = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(r ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: o.fieldState.size,
        error: d
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
    trackDegradedMode(r, d = {}) {
      this.track("degraded_mode", {
        degradationType: r,
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
        totalFields: o.fieldState?.size || 0,
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
      return r.length ? Math.round(r.reduce((d, p) => d + p, 0) / r.length) : 0;
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
          const d = JSON.stringify({
            events: r,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, d);
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
      } catch (d) {
        this.events = [...r, ...this.events], console.warn("Telemetry flush failed:", d);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    u.track("session_end", u.getSessionSummary()), u.flush();
  }), setInterval(() => u.flush(), 3e4);
  const o = {
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
  function S() {
    o.overlayRenderFrameID || (o.overlayRenderFrameID = window.requestAnimationFrame(() => {
      o.overlayRenderFrameID = 0, It();
    }));
  }
  function v(r) {
    const d = o.fieldState.get(r);
    d && (delete d.previewValueText, delete d.previewValueBool, delete d.previewSignatureUrl);
  }
  function E() {
    o.fieldState.forEach((r) => {
      delete r.previewValueText, delete r.previewValueBool, delete r.previewSignatureUrl;
    });
  }
  function T(r, d) {
    const p = o.fieldState.get(r);
    if (!p) return;
    const f = Fe(String(d || ""));
    if (!f) {
      delete p.previewValueText;
      return;
    }
    p.previewValueText = f, delete p.previewValueBool, delete p.previewSignatureUrl;
  }
  function H(r, d) {
    const p = o.fieldState.get(r);
    p && (p.previewValueBool = !!d, delete p.previewValueText, delete p.previewSignatureUrl);
  }
  function R(r, d) {
    const p = o.fieldState.get(r);
    if (!p) return;
    const f = String(d || "").trim();
    if (!f) {
      delete p.previewSignatureUrl;
      return;
    }
    p.previewSignatureUrl = f, delete p.previewValueText, delete p.previewValueBool;
  }
  const F = {
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
      const d = n.viewer.pages?.find((f) => f.page === r);
      if (d)
        return {
          width: d.width,
          height: d.height,
          rotation: d.rotation || 0
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
    setPageViewport(r, d) {
      this.pageViewports.set(r, {
        width: d.width,
        height: d.height,
        rotation: d.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(r, d) {
      const p = r.page, f = this.getPageMetadata(p), y = d.offsetWidth, x = d.offsetHeight, L = r.pageWidth || f.width, M = r.pageHeight || f.height, B = y / L, Q = x / M;
      let V = r.posX || 0, Z = r.posY || 0;
      n.viewer.origin === "bottom-left" && (Z = M - Z - (r.height || 30));
      const xe = V * B, Ee = Z * Q, Y = (r.width || 150) * B, ne = (r.height || 30) * Q;
      return {
        left: xe,
        top: Ee,
        width: Y,
        height: ne,
        // Store original values for debugging
        _debug: {
          sourceX: V,
          sourceY: Z,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: L,
          pageHeight: M,
          scaleX: B,
          scaleY: Q,
          zoom: o.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, d) {
      const p = this.pageToScreen(r, d);
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
    async requestUploadBootstrap(r, d, p, f) {
      const y = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: d,
            content_type: p,
            size_bytes: f
          })
        }
      );
      if (!y.ok)
        throw await Je(y, "Failed to get upload contract");
      const x = await y.json(), L = x?.contract || x;
      if (!L || typeof L != "object" || !L.upload_url)
        throw new Error("Invalid upload contract response");
      return L;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, d) {
      const p = new URL(r.upload_url, window.location.origin);
      r.upload_token && p.searchParams.set("upload_token", String(r.upload_token)), r.object_key && p.searchParams.set("object_key", String(r.object_key));
      const f = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([x, L]) => {
        const M = String(x).toLowerCase();
        M === "x-esign-upload-token" || M === "x-esign-upload-key" || (f[x] = String(L));
      });
      const y = await fetch(p.toString(), {
        method: r.method || "PUT",
        headers: f,
        body: d,
        credentials: "omit"
      });
      if (!y.ok)
        throw await Je(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [d, p] = r.split(","), f = d.match(/data:([^;]+)/), y = f ? f[1] : "image/png", x = atob(p), L = new Uint8Array(x.length);
      for (let M = 0; M < x.length; M++)
        L[M] = x.charCodeAt(M);
      return new Blob([L], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, d) {
      const p = this.dataUrlToBlob(d), f = p.size, y = "image/png", x = await Qt(p), L = await this.requestUploadBootstrap(
        r,
        x,
        y,
        f
      );
      return await this.uploadToSignedUrl(L, p), {
        uploadToken: L.upload_token,
        objectKey: L.object_key,
        sha256: L.sha256,
        contentType: L.content_type
      };
    }
  }, J = {
    endpoint(r, d = "") {
      const p = encodeURIComponent(r), f = d ? `/${encodeURIComponent(d)}` : "";
      return `${n.apiBasePath}/signatures/${p}${f}`;
    },
    async list(r) {
      const d = new URL(this.endpoint(n.token), window.location.origin);
      d.searchParams.set("type", r);
      const p = await fetch(d.toString(), {
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
    async save(r, d, p = "") {
      const f = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: p,
          data_url: d
        })
      });
      if (!f.ok) {
        const x = await f.json().catch(() => ({})), L = new Error(x?.error?.message || "Failed to save signature");
        throw L.code = x?.error?.code || "", L;
      }
      return (await f.json())?.signature || null;
    },
    async delete(r) {
      const d = await fetch(this.endpoint(n.token, r), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!d.ok) {
        const p = await d.json().catch(() => ({}));
        throw new Error(p?.error?.message || "Failed to delete signature");
      }
    }
  };
  function K(r) {
    const d = o.fieldState.get(r);
    return d && d.type === "initials" ? "initials" : "signature";
  }
  function ae(r) {
    return o.savedSignaturesByType.get(r) || [];
  }
  async function fe(r, d = !1) {
    const p = K(r);
    if (!d && o.savedSignaturesByType.has(p)) {
      ue(r);
      return;
    }
    const f = await J.list(p);
    o.savedSignaturesByType.set(p, f), ue(r);
  }
  function ue(r) {
    const d = K(r), p = ae(d), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!p.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = p.map((y) => {
        const x = Qe(String(y?.thumbnail_data_url || y?.data_url || "")), L = Qe(String(y?.label || "Saved signature")), M = Qe(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${L}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${L}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Qe(r)}" data-signature-id="${M}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Qe(r)}" data-signature-id="${M}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Ae(r) {
    const d = o.signatureCanvases.get(r), p = K(r);
    if (!d || !on(r))
      throw new Error(`Please add your ${p === "initials" ? "initials" : "signature"} first`);
    const f = d.canvas.toDataURL("image/png"), y = await J.save(p, f, p === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const x = ae(p);
    x.unshift(y), o.savedSignaturesByType.set(p, x), ue(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function wt(r, d) {
    const p = K(r), y = ae(p).find((L) => String(L?.id || "") === String(d));
    if (!y) return;
    requestAnimationFrame(() => Ct(r)), await Ze(r);
    const x = String(y.data_url || y.thumbnail_data_url || "").trim();
    x && (await j(r, x, { clearStrokes: !0 }), R(r, x), S(), qt("draw", r), he("Saved signature selected."));
  }
  async function Oe(r, d) {
    const p = K(r);
    await J.delete(d);
    const f = ae(p).filter((y) => String(y?.id || "") !== String(d));
    o.savedSignaturesByType.set(p, f), ue(r);
  }
  function Re(r) {
    const d = String(r?.code || "").trim(), p = String(r?.message || "Unable to update saved signatures"), f = d === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : p;
    window.toastManager && window.toastManager.error(f), he(f, "assertive");
  }
  async function Ze(r, d = 8) {
    for (let p = 0; p < d; p++) {
      if (o.signatureCanvases.has(r)) return !0;
      await new Promise((f) => setTimeout(f, 40)), Ct(r);
    }
    return !1;
  }
  async function O(r, d) {
    const p = String(d?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(p))
      throw new Error("Only PNG and JPEG images are supported");
    if (d.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => Ct(r)), await Ze(r);
    const f = o.signatureCanvases.get(r);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const y = await ve(d), x = p === "image/png" ? y : await Ge(y, f.drawWidth, f.drawHeight);
    if (Me(x) > ts)
      throw new Error(`Image exceeds ${Math.round(ts / 1024)}KB limit after conversion`);
    await j(r, x, { clearStrokes: !0 }), R(r, x), S();
    const M = document.getElementById("sig-upload-preview-wrap"), B = document.getElementById("sig-upload-preview");
    M && M.classList.remove("hidden"), B && B.setAttribute("src", x), he("Signature image uploaded. You can now insert it.");
  }
  function ve(r) {
    return new Promise((d, p) => {
      const f = new FileReader();
      f.onload = () => d(String(f.result || "")), f.onerror = () => p(new Error("Unable to read image file")), f.readAsDataURL(r);
    });
  }
  function Me(r) {
    const d = String(r || "").split(",");
    if (d.length < 2) return 0;
    const p = d[1] || "", f = (p.match(/=+$/) || [""])[0].length;
    return Math.floor(p.length * 3 / 4) - f;
  }
  async function Ge(r, d, p) {
    return await new Promise((f, y) => {
      const x = new Image();
      x.onload = () => {
        const L = document.createElement("canvas"), M = Math.max(1, Math.round(Number(d) || 600)), B = Math.max(1, Math.round(Number(p) || 160));
        L.width = M, L.height = B;
        const Q = L.getContext("2d");
        if (!Q) {
          y(new Error("Unable to process image"));
          return;
        }
        Q.clearRect(0, 0, M, B);
        const V = Math.min(M / x.width, B / x.height), Z = x.width * V, xe = x.height * V, Ee = (M - Z) / 2, Y = (B - xe) / 2;
        Q.drawImage(x, Ee, Y, Z, xe), f(L.toDataURL("image/png"));
      }, x.onerror = () => y(new Error("Unable to decode image file")), x.src = r;
    });
  }
  async function Qt(r) {
    if (window.crypto && window.crypto.subtle) {
      const d = await r.arrayBuffer(), p = await window.crypto.subtle.digest("SHA-256", d);
      return Array.from(new Uint8Array(p)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function Xn() {
    document.addEventListener("click", (r) => {
      const d = r.target;
      if (!(d instanceof Element)) return;
      const p = d.closest("[data-esign-action]");
      if (!p) return;
      switch (p.getAttribute("data-esign-action")) {
        case "prev-page":
          Ln();
          break;
        case "next-page":
          Cn();
          break;
        case "zoom-out":
          Pn();
          break;
        case "zoom-in":
          kn();
          break;
        case "fit-width":
          An();
          break;
        case "download-document":
          Gt();
          break;
        case "show-consent-modal":
          Fn();
          break;
        case "activate-field": {
          const y = p.getAttribute("data-field-id");
          y && oe(y);
          break;
        }
        case "submit-signature":
          Rn();
          break;
        case "show-decline-modal":
          ii();
          break;
        case "close-field-editor":
          gt();
          break;
        case "save-field-editor":
          jt();
          break;
        case "hide-consent-modal":
          Ot();
          break;
        case "accept-consent":
          Se();
          break;
        case "hide-decline-modal":
          pn();
          break;
        case "confirm-decline":
          gn();
          break;
        case "retry-load-pdf":
          Ne();
          break;
        case "signature-tab": {
          const y = p.getAttribute("data-tab") || "draw", x = p.getAttribute("data-field-id");
          x && qt(y, x);
          break;
        }
        case "clear-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Zn(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && ct(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Qn(y);
          break;
        }
        case "save-current-signature-library": {
          const y = p.getAttribute("data-field-id");
          y && Ae(y).catch(Re);
          break;
        }
        case "select-saved-signature": {
          const y = p.getAttribute("data-field-id"), x = p.getAttribute("data-signature-id");
          y && x && wt(y, x).catch(Re);
          break;
        }
        case "delete-saved-signature": {
          const y = p.getAttribute("data-field-id"), x = p.getAttribute("data-signature-id");
          y && x && Oe(y, x).catch(Re);
          break;
        }
        case "clear-signer-profile":
          nt().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          lt.togglePanel();
          break;
        case "debug-copy-session":
          lt.copySessionInfo();
          break;
        case "debug-clear-cache":
          lt.clearCache();
          break;
        case "debug-show-telemetry":
          lt.showTelemetry();
          break;
        case "debug-reload-viewer":
          lt.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const d = r.target;
      if (d instanceof HTMLInputElement) {
        if (d.matches("#sig-upload-input")) {
          const p = d.getAttribute("data-field-id"), f = d.files?.[0];
          if (!p || !f) return;
          O(p, f).catch((y) => {
            window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (d.matches("#field-checkbox-input")) {
          const p = d.getAttribute("data-field-id") || o.activeFieldId;
          if (!p) return;
          H(p, d.checked), S();
        }
      }
    }), document.addEventListener("input", (r) => {
      const d = r.target;
      if (!(d instanceof HTMLInputElement) && !(d instanceof HTMLTextAreaElement)) return;
      const p = d.getAttribute("data-field-id") || o.activeFieldId;
      if (p) {
        if (d.matches("#sig-type-input")) {
          an(p, d.value || "", { syncOverlay: !0 });
          return;
        }
        if (d.matches("#field-text-input")) {
          T(p, d.value || ""), S();
          return;
        }
        d.matches("#field-checkbox-input") && d instanceof HTMLInputElement && (H(p, d.checked), S());
      }
    });
  }
  te(async () => {
    Xn(), o.isLowMemory = xt(), Ie(), ut(), await et(), xn(), In(), $n(), qe(), await Ne(), It(), document.addEventListener("visibilitychange", Mt), "memory" in navigator && bt(), lt.init();
  });
  function Mt() {
    document.hidden && we();
  }
  function we() {
    const r = o.isLowMemory ? 1 : 2;
    for (; o.renderedPages.size > r; ) {
      let d = null, p = 1 / 0;
      if (o.renderedPages.forEach((f, y) => {
        y !== o.currentPage && f.timestamp < p && (d = y, p = f.timestamp);
      }), d !== null)
        o.renderedPages.delete(d);
      else
        break;
    }
  }
  function bt() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, d = navigator.memory.totalJSHeapSize;
        r / d > 0.8 && (o.isLowMemory = !0, we());
      }
    }, 3e4);
  }
  function St(r) {
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
  function Ie() {
    const r = document.getElementById("pdf-compatibility-banner"), d = document.getElementById("pdf-compatibility-message"), p = document.getElementById("pdf-compatibility-title");
    if (!r || !d || !p) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      r.classList.add("hidden");
      return;
    }
    p.textContent = "Preview Compatibility Notice", d.textContent = String(n.viewer.compatibilityMessage || "").trim() || St(y), r.classList.remove("hidden"), u.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: y });
  }
  function ut() {
    const r = document.getElementById("stage-state-banner"), d = document.getElementById("stage-state-icon"), p = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !d || !p || !f || !y) return;
    const x = n.signerState || "active", L = n.recipientStage || 1, M = n.activeStage || 1, B = n.activeRecipientIds || [], Q = n.waitingForRecipientIds || [];
    let V = {
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
        V = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: L > M ? `You are in signing stage ${L}. Stage ${M} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Q.length > 0 && V.badges.push({
          icon: "iconoir-group",
          text: `${Q.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        V = {
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
        V = {
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
        B.length > 1 ? (V.message = `You and ${B.length - 1} other signer(s) can sign now.`, V.badges = [
          { icon: "iconoir-users", text: `Stage ${M} active`, variant: "green" }
        ]) : L > 1 ? V.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${L}`, variant: "green" }
        ] : V.hidden = !0;
        break;
    }
    if (V.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${V.bgClass} ${V.borderClass}`, d.className = `${V.iconClass} mt-0.5`, p.className = `text-sm font-semibold ${V.titleClass}`, p.textContent = V.title, f.className = `text-xs ${V.messageClass} mt-1`, f.textContent = V.message, y.innerHTML = "", V.badges.forEach((Z) => {
      const xe = document.createElement("span"), Ee = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      xe.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${Ee[Z.variant] || Ee.blue}`, xe.innerHTML = `<i class="${Z.icon} mr-1"></i>${Z.text}`, y.appendChild(xe);
    });
  }
  function xn() {
    n.fields.forEach((r) => {
      let d = null, p = !1;
      if (r.type === "checkbox")
        d = r.value_bool || !1, p = d;
      else if (r.type === "date_signed")
        d = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], p = !0;
      else {
        const f = String(r.value_text || "");
        d = f || tt(r), p = !!f;
      }
      o.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: d,
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
  async function et() {
    try {
      const r = await l.load(o.profileKey);
      r && (o.profileData = r, o.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function tt(r) {
    const d = o.profileData;
    if (!d) return "";
    const p = String(r?.type || "").trim();
    return p === "name" ? Fe(d.fullName || "") : p === "initials" ? Fe(d.initials || "") || vi(d.fullName || n.recipientName || "") : p === "signature" ? Fe(d.typedSignature || "") : "";
  }
  function Ve(r) {
    return !n.profile.persistDrawnSignature || !o.profileData ? "" : r?.type === "initials" && String(o.profileData.drawnInitialsDataUrl || "").trim() || String(o.profileData.drawnSignatureDataUrl || "").trim();
  }
  function $t(r) {
    const d = Fe(r?.value || "");
    return d || (o.profileData ? r?.type === "initials" ? Fe(o.profileData.initials || "") || vi(o.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? Fe(o.profileData.typedSignature || "") : "" : "");
  }
  function Zt() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : o.profileRemember;
  }
  async function nt(r = !1) {
    let d = null;
    try {
      await l.clear(o.profileKey);
    } catch (p) {
      d = p;
    } finally {
      o.profileData = null, o.profileRemember = n.profile.rememberByDefault;
    }
    if (d) {
      if (!r && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !r)
        throw d;
      return;
    }
    !r && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Te(r, d = {}) {
    const p = Zt();
    if (o.profileRemember = p, !p) {
      await nt(!0);
      return;
    }
    if (!r) return;
    const f = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const x = Fe(r.value);
      x && (f.fullName = x, (o.profileData?.initials || "").trim() || (f.initials = vi(x)));
    }
    if (y === "initials") {
      if (d.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof d.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = d.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Fe(r.value);
        x && (f.initials = x);
      }
    }
    if (y === "signature") {
      if (d.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof d.signatureDataUrl == "string")
        f.drawnSignatureDataUrl = d.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Fe(r.value);
        x && (f.typedSignature = x);
      }
    }
    if (!(Object.keys(f).length === 1 && f.remember === !0))
      try {
        const x = await l.save(o.profileKey, f);
        o.profileData = x;
      } catch {
      }
  }
  function In() {
    const r = document.getElementById("consent-checkbox"), d = document.getElementById("consent-accept-btn");
    r && d && r.addEventListener("change", function() {
      d.disabled = !this.checked;
    });
  }
  function xt() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function it() {
    const r = o.isLowMemory ? 3 : o.maxCachedPages;
    if (o.renderedPages.size <= r) return;
    const d = [];
    for (o.renderedPages.forEach((p, f) => {
      const y = Math.abs(f - o.currentPage);
      d.push({ pageNum: f, distance: y });
    }), d.sort((p, f) => f.distance - p.distance); o.renderedPages.size > r && d.length > 0; ) {
      const p = d.shift();
      p && p.pageNum !== o.currentPage && o.renderedPages.delete(p.pageNum);
    }
  }
  function Bt(r) {
    if (o.isLowMemory) return;
    const d = [];
    r > 1 && d.push(r - 1), r < n.pageCount && d.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      d.forEach(async (p) => {
        !o.renderedPages.has(p) && !o.pageRendering && await En(p);
      });
    }, { timeout: 2e3 });
  }
  async function En(r) {
    if (!(!o.pdfDoc || o.renderedPages.has(r)))
      try {
        const d = await o.pdfDoc.getPage(r), p = o.zoomLevel, f = d.getViewport({ scale: p * window.devicePixelRatio }), y = document.createElement("canvas"), x = y.getContext("2d");
        y.width = f.width, y.height = f.height;
        const L = {
          canvasContext: x,
          viewport: f
        };
        await d.render(L).promise, o.renderedPages.set(r, {
          canvas: y,
          scale: p,
          timestamp: Date.now()
        }), it();
      } catch (d) {
        console.warn("Preload failed for page", r, d);
      }
  }
  function pt() {
    const r = window.devicePixelRatio || 1;
    return o.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function Ne() {
    const r = document.getElementById("pdf-loading"), d = Date.now();
    try {
      const p = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!p.ok)
        throw new Error("Failed to load document");
      const y = (await p.json()).assets || {}, x = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const L = pdfjsLib.getDocument(x);
      o.pdfDoc = await L.promise, n.pageCount = o.pdfDoc.numPages, document.getElementById("page-count").textContent = o.pdfDoc.numPages, await We(1), tn(), u.trackViewerLoad(!0, Date.now() - d), u.trackPageView(1);
    } catch (p) {
      console.error("PDF load error:", p), u.trackViewerLoad(!1, Date.now() - d, p.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), mn();
    }
  }
  async function We(r) {
    if (!o.pdfDoc) return;
    const d = o.renderedPages.get(r);
    if (d && d.scale === o.zoomLevel) {
      en(d), o.currentPage = r, document.getElementById("current-page").textContent = r, tn(), It(), Bt(r);
      return;
    }
    o.pageRendering = !0;
    try {
      const p = await o.pdfDoc.getPage(r), f = o.zoomLevel, y = pt(), x = p.getViewport({ scale: f * y }), L = p.getViewport({ scale: 1 });
      F.setPageViewport(r, {
        width: L.width,
        height: L.height,
        rotation: L.rotation || 0
      });
      const M = document.getElementById("pdf-page-1");
      M.innerHTML = "";
      const B = document.createElement("canvas"), Q = B.getContext("2d");
      B.height = x.height, B.width = x.width, B.style.width = `${x.width / y}px`, B.style.height = `${x.height / y}px`, M.appendChild(B);
      const V = document.getElementById("pdf-container");
      V.style.width = `${x.width / y}px`;
      const Z = {
        canvasContext: Q,
        viewport: x
      };
      await p.render(Z).promise, o.renderedPages.set(r, {
        canvas: B.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / y,
        displayHeight: x.height / y
      }), o.renderedPages.get(r).canvas.getContext("2d").drawImage(B, 0, 0), it(), o.currentPage = r, document.getElementById("current-page").textContent = r, tn(), It(), u.trackPageView(r), Bt(r);
    } catch (p) {
      console.error("Page render error:", p);
    } finally {
      if (o.pageRendering = !1, o.pageNumPending !== null) {
        const p = o.pageNumPending;
        o.pageNumPending = null, await We(p);
      }
    }
  }
  function en(r, d) {
    const p = document.getElementById("pdf-page-1");
    p.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = r.canvas.width, f.height = r.canvas.height, f.style.width = `${r.displayWidth}px`, f.style.height = `${r.displayHeight}px`, f.getContext("2d").drawImage(r.canvas, 0, 0), p.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${r.displayWidth}px`;
  }
  function Ue(r) {
    o.pageRendering ? o.pageNumPending = r : We(r);
  }
  function Ft(r) {
    return typeof r.previewValueText == "string" && r.previewValueText.trim() !== "" ? Fe(r.previewValueText) : typeof r.value == "string" && r.value.trim() !== "" ? Fe(r.value) : "";
  }
  function st(r, d, p, f = !1) {
    const y = document.createElement("img");
    y.className = "field-overlay-preview", y.src = d, y.alt = p, r.appendChild(y), r.classList.add("has-preview"), f && r.classList.add("draft-preview");
  }
  function Rt(r, d, p = !1, f = !1) {
    const y = document.createElement("span");
    y.className = "field-overlay-value", p && y.classList.add("font-signature"), y.textContent = d, r.appendChild(y), r.classList.add("has-value"), f && r.classList.add("draft-preview");
  }
  function Ht(r, d) {
    const p = document.createElement("span");
    p.className = "field-overlay-label", p.textContent = d, r.appendChild(p);
  }
  function It() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const d = document.getElementById("pdf-container");
    o.fieldState.forEach((p, f) => {
      if (p.page !== o.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = f, p.required && y.classList.add("required"), p.completed && y.classList.add("completed"), o.activeFieldId === f && y.classList.add("active"), p.posX != null && p.posY != null && p.width != null && p.height != null) {
        const Z = F.getOverlayStyles(p, d);
        y.style.left = Z.left, y.style.top = Z.top, y.style.width = Z.width, y.style.height = Z.height, y.style.transform = Z.transform, lt.enabled && (y.dataset.debugCoords = JSON.stringify(
          F.pageToScreen(p, d)._debug
        ));
      } else {
        const Z = Array.from(o.fieldState.keys()).indexOf(f);
        y.style.left = "10px", y.style.top = `${100 + Z * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const L = String(p.previewSignatureUrl || "").trim(), M = String(p.signaturePreviewUrl || "").trim(), B = Ft(p), Q = p.type === "signature" || p.type === "initials", V = typeof p.previewValueBool == "boolean";
      if (L)
        st(y, L, Et(p.type), !0);
      else if (p.completed && M)
        st(y, M, Et(p.type));
      else if (B) {
        const Z = typeof p.previewValueText == "string" && p.previewValueText.trim() !== "";
        Rt(y, B, Q, Z);
      } else p.type === "checkbox" && (V ? p.previewValueBool : !!p.value) ? Rt(y, "Checked", !1, V) : Ht(y, Et(p.type));
      y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${Et(p.type)} field${p.required ? ", required" : ""}${p.completed ? ", completed" : ""}`), y.addEventListener("click", () => oe(f)), y.addEventListener("keydown", (Z) => {
        (Z.key === "Enter" || Z.key === " ") && (Z.preventDefault(), oe(f));
      }), r.appendChild(y);
    });
  }
  function Et(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function Ln() {
    o.currentPage <= 1 || Ue(o.currentPage - 1);
  }
  function Cn() {
    o.currentPage >= n.pageCount || Ue(o.currentPage + 1);
  }
  function Nt(r) {
    r < 1 || r > n.pageCount || Ue(r);
  }
  function tn() {
    document.getElementById("prev-page-btn").disabled = o.currentPage <= 1, document.getElementById("next-page-btn").disabled = o.currentPage >= n.pageCount;
  }
  function kn() {
    o.zoomLevel = Math.min(o.zoomLevel + 0.25, 3), nn(), Ue(o.currentPage);
  }
  function Pn() {
    o.zoomLevel = Math.max(o.zoomLevel - 0.25, 0.5), nn(), Ue(o.currentPage);
  }
  function An() {
    const d = document.getElementById("viewer-content").offsetWidth - 32, p = 612;
    o.zoomLevel = d / p, nn(), Ue(o.currentPage);
  }
  function nn() {
    document.getElementById("zoom-level").textContent = `${Math.round(o.zoomLevel * 100)}%`;
  }
  function oe(r) {
    if (!o.hasConsented && n.fields.some((d) => d.id === r && d.type !== "date_signed")) {
      Fn();
      return;
    }
    Tn(r, { openEditor: !0 });
  }
  function Tn(r, d = { openEditor: !0 }) {
    const p = o.fieldState.get(r);
    if (p) {
      if (d.openEditor && (o.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), p.page !== o.currentPage && Nt(p.page), !d.openEditor) {
        sn(r);
        return;
      }
      p.type !== "date_signed" && _n(r);
    }
  }
  function sn(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function _n(r) {
    const d = o.fieldState.get(r);
    if (!d) return;
    const p = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = rn(d.type), f.innerHTML = rt(d), x?.classList.toggle("hidden", !(d.type === "signature" || d.type === "initials")), (d.type === "signature" || d.type === "initials") && at(r), p.classList.add("active"), p.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", kt(p.querySelector(".field-editor")), he(`Editing ${rn(d.type)}. Press Escape to cancel.`), setTimeout(() => {
      const L = f.querySelector("input, textarea");
      L ? L.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), _e(o.writeCooldownUntil) > 0 && ln(_e(o.writeCooldownUntil));
  }
  function rn(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function rt(r) {
    const d = Ut(r.type), p = Qe(String(r?.id || "")), f = Qe(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", x = Qe($t(r)), L = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], M = Lt(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${L.map((B) => `
            <button
              type="button"
              id="sig-tab-${B.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${M === B.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${B.id}"
              data-esign-action="signature-tab"
              data-field-id="${p}"
              role="tab"
              aria-selected="${M === B.id ? "true" : "false"}"
              aria-controls="sig-editor-${B.id}"
              tabindex="${M === B.id ? "0" : "-1"}"
            >
              ${B.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${M === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
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
          <div id="sig-editor-draw" class="sig-editor-panel ${M === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
          <div id="sig-editor-upload" class="sig-editor-panel ${M === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${M === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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

          ${d}
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
          value="${Qe(String(r.value || ""))}"
          data-field-id="${p}"
        />
        ${d}
      `;
    if (r.type === "text") {
      const y = Qe(String(r.value || ""));
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
  function Ut(r) {
    return r === "name" || r === "initials" || r === "signature" ? `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${o.profileRemember ? "checked" : ""}
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
  function an(r, d, p = { syncOverlay: !1 }) {
    const f = document.getElementById("sig-type-preview"), y = o.fieldState.get(r);
    if (!y) return;
    const x = Fe(String(d || "").trim());
    if (p?.syncOverlay && (x ? T(r, x) : v(r), S()), !!f) {
      if (x) {
        f.textContent = x;
        return;
      }
      f.textContent = y.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function Lt(r) {
    const d = String(o.signatureTabByField.get(r) || "").trim();
    return d === "draw" || d === "type" || d === "upload" || d === "saved" ? d : "draw";
  }
  function qt(r, d) {
    const p = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    o.signatureTabByField.set(d, p), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${p}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", p !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", p !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", p !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", p !== "saved"), (p === "draw" || p === "upload" || p === "saved") && f && requestAnimationFrame(() => Ct(d)), p === "type") {
      const y = document.getElementById("sig-type-input");
      an(d, y?.value || "");
    }
    p === "saved" && fe(d).catch(Re);
  }
  function at(r) {
    o.signatureTabByField.set(r, "draw"), qt("draw", r);
    const d = document.getElementById("sig-type-input");
    d && an(r, d.value || "");
  }
  function Ct(r) {
    const d = document.getElementById("sig-draw-canvas");
    if (!d || o.signatureCanvases.has(r)) return;
    const p = d.closest(".signature-canvas-container"), f = d.getContext("2d");
    if (!f) return;
    const y = d.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const x = window.devicePixelRatio || 1;
    d.width = y.width * x, d.height = y.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let L = !1, M = 0, B = 0, Q = [];
    const V = (Y) => {
      const ne = d.getBoundingClientRect();
      let be, Ye;
      return Y.touches && Y.touches.length > 0 ? (be = Y.touches[0].clientX, Ye = Y.touches[0].clientY) : Y.changedTouches && Y.changedTouches.length > 0 ? (be = Y.changedTouches[0].clientX, Ye = Y.changedTouches[0].clientY) : (be = Y.clientX, Ye = Y.clientY), {
        x: be - ne.left,
        y: Ye - ne.top,
        timestamp: Date.now()
      };
    }, Z = (Y) => {
      L = !0;
      const ne = V(Y);
      M = ne.x, B = ne.y, Q = [{ x: ne.x, y: ne.y, t: ne.timestamp, width: 2.5 }], p && p.classList.add("drawing");
    }, xe = (Y) => {
      if (!L) return;
      const ne = V(Y);
      Q.push({ x: ne.x, y: ne.y, t: ne.timestamp, width: 2.5 });
      const be = ne.x - M, Ye = ne.y - B, Pt = ne.timestamp - (Q[Q.length - 2]?.t || ne.timestamp), At = Math.sqrt(be * be + Ye * Ye) / Math.max(Pt, 1), pe = 2.5, ri = 1.5, fn = 4, Nn = Math.min(At / 5, 1), le = Math.max(ri, Math.min(fn, pe - Nn * 1.5));
      Q[Q.length - 1].width = le, f.lineWidth = le, f.beginPath(), f.moveTo(M, B), f.lineTo(ne.x, ne.y), f.stroke(), M = ne.x, B = ne.y;
    }, Ee = () => {
      if (L = !1, Q.length > 1) {
        const Y = o.signatureCanvases.get(r);
        Y && (Y.strokes.push(Q.map((ne) => ({ ...ne }))), Y.redoStack = []), cn(r);
      }
      Q = [], p && p.classList.remove("drawing");
    };
    d.addEventListener("mousedown", Z), d.addEventListener("mousemove", xe), d.addEventListener("mouseup", Ee), d.addEventListener("mouseout", Ee), d.addEventListener("touchstart", (Y) => {
      Y.preventDefault(), Y.stopPropagation(), Z(Y);
    }, { passive: !1 }), d.addEventListener("touchmove", (Y) => {
      Y.preventDefault(), Y.stopPropagation(), xe(Y);
    }, { passive: !1 }), d.addEventListener("touchend", (Y) => {
      Y.preventDefault(), Ee();
    }, { passive: !1 }), d.addEventListener("touchcancel", Ee), d.addEventListener("gesturestart", (Y) => Y.preventDefault()), d.addEventListener("gesturechange", (Y) => Y.preventDefault()), d.addEventListener("gestureend", (Y) => Y.preventDefault()), o.signatureCanvases.set(r, {
      canvas: d,
      ctx: f,
      dpr: x,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Dn(r);
  }
  function Dn(r) {
    const d = o.signatureCanvases.get(r), p = o.fieldState.get(r);
    if (!d || !p) return;
    const f = Ve(p);
    f && j(r, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function j(r, d, p = { clearStrokes: !1 }) {
    const f = o.signatureCanvases.get(r);
    if (!f) return !1;
    const y = String(d || "").trim();
    if (!y)
      return f.baseImageDataUrl = "", f.baseImage = null, p.clearStrokes && (f.strokes = [], f.redoStack = []), ot(r), !0;
    const { drawWidth: x, drawHeight: L } = f, M = new Image();
    return await new Promise((B) => {
      M.onload = () => {
        p.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = M, f.baseImageDataUrl = y, x > 0 && L > 0 && ot(r), B(!0);
      }, M.onerror = () => B(!1), M.src = y;
    });
  }
  function ot(r) {
    const d = o.signatureCanvases.get(r);
    if (!d) return;
    const { ctx: p, drawWidth: f, drawHeight: y, baseImage: x, strokes: L } = d;
    if (p.clearRect(0, 0, f, y), x) {
      const M = Math.min(f / x.width, y / x.height), B = x.width * M, Q = x.height * M, V = (f - B) / 2, Z = (y - Q) / 2;
      p.drawImage(x, V, Z, B, Q);
    }
    for (const M of L)
      for (let B = 1; B < M.length; B++) {
        const Q = M[B - 1], V = M[B];
        p.lineWidth = Number(V.width || 2.5) || 2.5, p.beginPath(), p.moveTo(Q.x, Q.y), p.lineTo(V.x, V.y), p.stroke();
      }
  }
  function ct(r) {
    const d = o.signatureCanvases.get(r);
    if (!d || d.strokes.length === 0) return;
    const p = d.strokes.pop();
    p && d.redoStack.push(p), ot(r), cn(r);
  }
  function Qn(r) {
    const d = o.signatureCanvases.get(r);
    if (!d || d.redoStack.length === 0) return;
    const p = d.redoStack.pop();
    p && d.strokes.push(p), ot(r), cn(r);
  }
  function on(r) {
    const d = o.signatureCanvases.get(r);
    if (!d) return !1;
    if ((d.baseImageDataUrl || "").trim() || d.strokes.length > 0) return !0;
    const { canvas: p, ctx: f } = d;
    return f.getImageData(0, 0, p.width, p.height).data.some((x, L) => L % 4 === 3 && x > 0);
  }
  function cn(r) {
    const d = o.signatureCanvases.get(r);
    d && (on(r) ? R(r, d.canvas.toDataURL("image/png")) : v(r), S());
  }
  function Zn(r) {
    const d = o.signatureCanvases.get(r);
    d && (d.strokes = [], d.redoStack = [], d.baseImage = null, d.baseImageDataUrl = "", ot(r)), v(r), S();
    const p = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    p && p.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function gt() {
    const r = document.getElementById("field-editor-overlay"), d = r.querySelector(".field-editor");
    if (hn(d), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", o.activeFieldId) {
      const p = document.querySelector(`.field-list-item[data-field-id="${o.activeFieldId}"]`);
      requestAnimationFrame(() => {
        p?.focus();
      });
    }
    E(), S(), o.activeFieldId = null, o.signatureCanvases.clear(), he("Field editor closed.");
  }
  function _e(r) {
    const d = Number(r) || 0;
    return d <= 0 ? 0 : Math.max(0, Math.ceil((d - Date.now()) / 1e3));
  }
  function $e(r, d = {}) {
    const p = Number(d.retry_after_seconds);
    if (Number.isFinite(p) && p > 0)
      return Math.ceil(p);
    const f = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const y = Number(f);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function Je(r, d) {
    let p = {};
    try {
      p = await r.json();
    } catch {
      p = {};
    }
    const f = p?.error || {}, y = f?.details && typeof f.details == "object" ? f.details : {}, x = $e(r, y), L = r?.status === 429, M = L ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || d || "Request failed"), B = new Error(M);
    return B.status = r?.status || 0, B.code = String(f?.code || ""), B.details = y, B.rateLimited = L, B.retryAfterSeconds = x, B;
  }
  function ln(r) {
    const d = Math.max(1, Number(r) || 1);
    o.writeCooldownUntil = Date.now() + d * 1e3, o.writeCooldownTimer && (clearInterval(o.writeCooldownTimer), o.writeCooldownTimer = null);
    const p = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const y = _e(o.writeCooldownUntil);
      if (y <= 0) {
        o.pendingSaves.has(o.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), o.writeCooldownTimer && (clearInterval(o.writeCooldownTimer), o.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    p(), o.writeCooldownTimer = setInterval(p, 250);
  }
  function ei(r) {
    const d = Math.max(1, Number(r) || 1);
    o.submitCooldownUntil = Date.now() + d * 1e3, o.submitCooldownTimer && (clearInterval(o.submitCooldownTimer), o.submitCooldownTimer = null);
    const p = () => {
      const f = _e(o.submitCooldownUntil);
      qe(), f <= 0 && o.submitCooldownTimer && (clearInterval(o.submitCooldownTimer), o.submitCooldownTimer = null);
    };
    p(), o.submitCooldownTimer = setInterval(p, 250);
  }
  async function jt() {
    const r = o.activeFieldId;
    if (!r) return;
    const d = o.fieldState.get(r);
    if (!d) return;
    const p = _e(o.writeCooldownUntil);
    if (p > 0) {
      const y = `Please wait ${p}s before saving again.`;
      window.toastManager && window.toastManager.error(y), he(y, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      o.profileRemember = Zt();
      let y = !1;
      if (d.type === "signature" || d.type === "initials")
        y = await De(r);
      else if (d.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        y = await dn(r, null, x?.checked || !1);
      } else {
        const L = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!L && d.required)
          throw new Error("This field is required");
        y = await dn(r, L, null);
      }
      if (y) {
        gt(), $n(), qe(), Hn(), It(), Ce(r), Bn(r);
        const x = je();
        x.allRequiredComplete ? he("Field saved. All required fields complete. Ready to submit.") : he(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && ln(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), he(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (_e(o.writeCooldownUntil) > 0) {
        const y = _e(o.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function De(r) {
    const d = o.fieldState.get(r), p = document.getElementById("sig-type-input"), f = Lt(r);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = o.signatureCanvases.get(r);
      if (!x) return !1;
      if (!on(r))
        throw new Error(d?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const L = x.canvas.toDataURL("image/png");
      return await un(r, { type: "drawn", dataUrl: L }, d?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = p?.value?.trim();
      if (!x)
        throw new Error(d?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return d.type === "initials" ? await dn(r, x, null) : await un(r, { type: "typed", text: x }, x);
    }
  }
  async function dn(r, d, p) {
    o.pendingSaves.add(r);
    const f = Date.now(), y = o.fieldState.get(r);
    try {
      const x = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: d,
          value_bool: p
        })
      });
      if (!x.ok)
        throw await Je(x, "Failed to save field");
      const L = o.fieldState.get(r);
      return L && (L.value = d ?? p, L.completed = !0, L.hasError = !1), await Te(L), window.toastManager && window.toastManager.success("Field saved"), u.trackFieldSave(r, L?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const L = o.fieldState.get(r);
      throw L && (L.hasError = !0, L.lastError = x.message), u.trackFieldSave(r, y?.type, !1, Date.now() - f, x.message), x;
    } finally {
      o.pendingSaves.delete(r);
    }
  }
  async function un(r, d, p) {
    o.pendingSaves.add(r);
    const f = Date.now(), y = d?.type || "typed";
    try {
      let x;
      if (y === "drawn") {
        const B = await G.uploadDrawnSignature(
          r,
          d.dataUrl
        );
        x = {
          field_instance_id: r,
          type: "drawn",
          value_text: p,
          object_key: B.objectKey,
          sha256: B.sha256,
          upload_token: B.uploadToken
        };
      } else
        x = await ti(r, p);
      const L = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!L.ok)
        throw await Je(L, "Failed to save signature");
      const M = o.fieldState.get(r);
      return M && (M.value = p, M.completed = !0, M.hasError = !1, d?.dataUrl && (M.signaturePreviewUrl = d.dataUrl)), await Te(M, {
        signatureType: y,
        signatureDataUrl: d?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), u.trackSignatureAttach(r, y, !0, Date.now() - f), !0;
    } catch (x) {
      const L = o.fieldState.get(r);
      throw L && (L.hasError = !0, L.lastError = x.message), u.trackSignatureAttach(r, y, !1, Date.now() - f, x.message), x;
    } finally {
      o.pendingSaves.delete(r);
    }
  }
  async function ti(r, d) {
    const p = `${d}|${r}`, f = await Mn(p), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: d,
      object_key: y,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Mn(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const d = new TextEncoder().encode(r), p = await window.crypto.subtle.digest("SHA-256", d);
      return Array.from(new Uint8Array(p)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function $n() {
    let r = 0;
    o.fieldState.forEach((M) => {
      M.required, M.completed && r++;
    });
    const d = o.fieldState.size, p = d > 0 ? r / d * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = d;
    const f = document.getElementById("progress-ring-circle"), y = 97.4, x = y - p / 100 * y;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${p}%`;
    const L = d - r;
    document.getElementById("fields-status").textContent = L > 0 ? `${L} remaining` : "All complete";
  }
  function qe() {
    const r = document.getElementById("submit-btn"), d = document.getElementById("incomplete-warning"), p = document.getElementById("incomplete-message"), f = _e(o.submitCooldownUntil);
    let y = [], x = !1;
    o.fieldState.forEach((M, B) => {
      M.required && !M.completed && y.push(M), M.hasError && (x = !0);
    });
    const L = o.hasConsented && y.length === 0 && !x && o.pendingSaves.size === 0 && f === 0 && !o.isSubmitting;
    r.disabled = !L, !o.isSubmitting && f > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !o.isSubmitting && f === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), o.hasConsented ? f > 0 ? (d.classList.remove("hidden"), p.textContent = `Please wait ${f}s before submitting again.`) : x ? (d.classList.remove("hidden"), p.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (d.classList.remove("hidden"), p.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : d.classList.add("hidden") : (d.classList.remove("hidden"), p.textContent = "Please accept the consent agreement");
  }
  function Ce(r) {
    const d = o.fieldState.get(r), p = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!p || !d)) {
      if (d.completed) {
        p.classList.add("completed"), p.classList.remove("error");
        const f = p.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), f.classList.add("bg-green-100", "text-green-600"), f.innerHTML = '<i class="iconoir-check"></i>';
      } else if (d.hasError) {
        p.classList.remove("completed"), p.classList.add("error");
        const f = p.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), f.classList.add("bg-red-100", "text-red-600"), f.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function ni() {
    const r = Array.from(o.fieldState.values()).filter((d) => d.required);
    return r.sort((d, p) => {
      const f = Number(d.page || 0), y = Number(p.page || 0);
      if (f !== y) return f - y;
      const x = Number(d.tabIndex || 0), L = Number(p.tabIndex || 0);
      if (x > 0 && L > 0 && x !== L) return x - L;
      if (x > 0 != L > 0) return x > 0 ? -1 : 1;
      const M = Number(d.posY || 0), B = Number(p.posY || 0);
      if (M !== B) return M - B;
      const Q = Number(d.posX || 0), V = Number(p.posX || 0);
      return Q !== V ? Q - V : String(d.id || "").localeCompare(String(p.id || ""));
    }), r;
  }
  function zt(r) {
    o.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((d) => d.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((d) => d.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function Bn(r) {
    const d = ni(), p = d.filter((L) => !L.completed);
    if (p.length === 0) {
      u.track("guided_next_none_remaining", { fromFieldId: r });
      const L = document.getElementById("submit-btn");
      L?.scrollIntoView({ behavior: "smooth", block: "nearest" }), L?.focus(), he("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const f = d.findIndex((L) => String(L.id) === String(r));
    let y = null;
    if (f >= 0) {
      for (let L = f + 1; L < d.length; L++)
        if (!d[L].completed) {
          y = d[L];
          break;
        }
    }
    if (y || (y = p[0]), !y) return;
    u.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const x = Number(y.page || 1);
    x !== o.currentPage && Nt(x), Tn(y.id, { openEditor: !1 }), zt(y.id), setTimeout(() => {
      zt(y.id), sn(y.id), u.track("guided_next_completed", { toFieldId: y.id, page: y.page }), he(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function Fn() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", kt(r.querySelector(".field-editor")), he("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Ot() {
    const r = document.getElementById("consent-modal"), d = r.querySelector(".field-editor");
    hn(d), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", he("Consent dialog closed.");
  }
  async function Se() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const d = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!d.ok)
        throw await Je(d, "Failed to accept consent");
      o.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Ot(), qe(), Hn(), u.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), he("Consent accepted. You can now complete the fields and submit.");
    } catch (d) {
      window.toastManager && window.toastManager.error(d.message), he(`Error: ${d.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function Rn() {
    const r = document.getElementById("submit-btn"), d = _e(o.submitCooldownUntil);
    if (d > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${d}s before submitting again.`), qe();
      return;
    }
    o.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const p = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": p }
      });
      if (!f.ok)
        throw await Je(f, "Failed to submit");
      u.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (p) {
      u.trackSubmit(!1, p.message), p?.rateLimited && ei(p.retryAfterSeconds), window.toastManager && window.toastManager.error(p.message);
    } finally {
      o.isSubmitting = !1, qe();
    }
  }
  function ii() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", kt(r.querySelector(".field-editor")), he("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function pn() {
    const r = document.getElementById("decline-modal"), d = r.querySelector(".field-editor");
    hn(d), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", he("Decline dialog closed.");
  }
  async function gn() {
    const r = document.getElementById("decline-reason").value;
    try {
      const d = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!d.ok)
        throw await Je(d, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (d) {
      window.toastManager && window.toastManager.error(d.message);
    }
  }
  function mn() {
    u.trackDegradedMode("viewer_load_failure"), u.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Gt() {
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
  const lt = {
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
            <div class="debug-value" id="debug-consent">${o.hasConsented ? "✓ Accepted" : "✗ Pending"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${o.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${o.isLowMemory ? "⚠ Low Memory" : "Normal"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${o.renderedPages?.size || 0}</div>
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
      const r = this.panel.querySelector(".debug-toggle"), d = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (r.textContent = "+", d.style.display = "none") : (r.textContent = "−", d.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const r = o.fieldState;
      let d = 0;
      r?.forEach((f) => {
        f.completed && d++;
      }), document.getElementById("debug-consent").textContent = o.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${o.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${d}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = o.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = o.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${o.isLowMemory ? "warning" : ""}`;
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
            currentPage: o.currentPage,
            zoomLevel: o.zoomLevel,
            hasConsented: o.hasConsented,
            activeFieldId: o.activeFieldId,
            isLowMemory: o.isLowMemory,
            cachedPages: o.renderedPages?.size || 0
          },
          fields: Array.from(o.fieldState?.entries() || []).map(([r, d]) => ({
            id: r,
            type: d.type,
            completed: d.completed,
            hasError: d.hasError
          })),
          telemetry: u.getSessionSummary(),
          errors: u.metrics.errorsEncountered
        }),
        getEvents: () => u.events,
        forceError: (r) => {
          u.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), Ne();
        },
        setLowMemory: (r) => {
          o.isLowMemory = r, it(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", u.sessionId), console.log("Fields:", o.fieldState?.size || 0), console.log("Low Memory:", o.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Ne(), this.updatePanel();
    },
    /**
     * Clear page cache
     */
    clearCache() {
      o.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(u.events), console.log("Session Summary:", u.getSessionSummary());
    }
  };
  function he(r, d = "polite") {
    const p = d === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    p && (p.textContent = "", requestAnimationFrame(() => {
      p.textContent = r;
    }));
  }
  function kt(r) {
    const p = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = p[0], y = p[p.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function x(L) {
      L.key === "Tab" && (L.shiftKey ? document.activeElement === f && (L.preventDefault(), y?.focus()) : document.activeElement === y && (L.preventDefault(), f?.focus()));
    }
    r.addEventListener("keydown", x), r._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function hn(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const d = r.dataset.previousFocus;
    if (d) {
      const p = document.getElementById(d);
      requestAnimationFrame(() => {
        p?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function Hn() {
    const r = je(), d = document.getElementById("submit-status");
    d && (r.allRequiredComplete && o.hasConsented ? d.textContent = "All required fields complete. You can now submit." : o.hasConsented ? d.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : d.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function je() {
    let r = 0, d = 0, p = 0;
    return o.fieldState.forEach((f) => {
      f.required && d++, f.completed && r++, f.required && !f.completed && p++;
    }), {
      completed: r,
      required: d,
      remainingRequired: p,
      total: o.fieldState.size,
      allRequiredComplete: p === 0
    };
  }
  function si(r, d = 1) {
    const p = Array.from(o.fieldState.keys()), f = p.indexOf(r);
    if (f === -1) return null;
    const y = f + d;
    return y >= 0 && y < p.length ? p[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (gt(), Ot(), pn()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const d = Array.from(document.querySelectorAll(".sig-editor-tab")), p = d.indexOf(r.target);
      if (p !== -1) {
        let f = p;
        if (r.key === "ArrowRight" && (f = (p + 1) % d.length), r.key === "ArrowLeft" && (f = (p - 1 + d.length) % d.length), r.key === "Home" && (f = 0), r.key === "End" && (f = d.length - 1), f !== p) {
          r.preventDefault();
          const y = d[f], x = y.getAttribute("data-tab") || "draw", L = y.getAttribute("data-field-id");
          L && qt(x, L), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const d = r.target.dataset.fieldId, p = r.key === "ArrowDown" ? 1 : -1, f = si(d, p);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const d = r.target.dataset.fieldId;
        d && oe(d);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class ys {
  constructor(e) {
    this.config = e;
  }
  init() {
    Zr(this.config);
  }
  destroy() {
  }
}
function so(i) {
  const e = new ys(i);
  return te(() => e.init()), e;
}
function ea() {
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
  const e = ea();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new ys(e);
  t.init(), window.esignSignerReviewController = t;
});
class vs {
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
    Dt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Dt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function ro(i = {}) {
  const e = new vs(i);
  return te(() => e.init()), e;
}
function ao(i = {}) {
  const e = new vs(i);
  te(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Ci {
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
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), l = this.elements.canvas, u = l.getContext("2d");
        if (!u)
          throw new Error("Failed to get canvas context");
        l.height = s.height, l.width = s.width, await n.render({
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
    e && A(e), t && $(t), n && A(n), s && A(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && A(e), t && A(t), n && A(n), s && $(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: l, viewer: u } = this.elements;
    t && A(t), n && A(n), s && $(s), u && A(u), l && (l.textContent = e);
  }
}
function oo(i) {
  const e = new Ci(i);
  return e.init(), e;
}
function co(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new Ci(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && te(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new Ci({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class lo {
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
class uo {
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
function ta(i) {
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
function na(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function ia(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((l) => String(l || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((l) => l !== s)] : n;
}
function po(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function go(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: ta(e.type),
    options: na(e.options),
    operators: ia(e.operators, e.default_operator)
  })) : [];
}
function mo(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function ho(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function fo(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function yo(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([u, o]) => `${u}: ${o}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", l = e?.message || `${i} failed`;
    t.error(n ? `${s}${l}: ${n}` : `${s}${l}`);
  }
}
function vo(i, e) {
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
function wo(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const bo = {
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
}, Kn = "application/vnd.google-apps.document", ki = "application/vnd.google-apps.spreadsheet", Pi = "application/vnd.google-apps.presentation", ws = "application/vnd.google-apps.folder", Ai = "application/pdf", sa = [Kn, Ai], bs = "esign.google.account_id";
function ra(i) {
  return i.mimeType === Kn;
}
function aa(i) {
  return i.mimeType === Ai;
}
function Kt(i) {
  return i.mimeType === ws;
}
function oa(i) {
  return sa.includes(i.mimeType);
}
function So(i) {
  return i.mimeType === Kn || i.mimeType === ki || i.mimeType === Pi;
}
function ca(i) {
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
function xo(i) {
  return i.map(ca);
}
function Ss(i) {
  return {
    [Kn]: "Google Doc",
    [ki]: "Google Sheet",
    [Pi]: "Google Slides",
    [ws]: "Folder",
    [Ai]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function la(i) {
  return Kt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : ra(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : aa(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === ki ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Pi ? {
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
function da(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function ua(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function Io(i, e) {
  const t = i.get("account_id");
  if (t)
    return Vn(t);
  if (e)
    return Vn(e);
  const n = localStorage.getItem(bs);
  return n ? Vn(n) : "";
}
function Vn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function Eo(i) {
  const e = Vn(i);
  e && localStorage.setItem(bs, e);
}
function Lo(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Co(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function ko(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function Xt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function pa(i) {
  const e = la(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Po(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const l = s === t.length - 1, u = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return l ? `${u}<span class="text-gray-900 font-medium">${Xt(n.name)}</span>` : `${u}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${Xt(n.name)}</button>`;
  }).join("");
}
function ga(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, l = pa(i), u = Kt(i), o = oa(i), S = u ? "cursor-pointer hover:bg-gray-50" : o ? "cursor-pointer hover:bg-blue-50" : "opacity-60", v = u ? `data-folder-id="${i.id}" data-folder-name="${Xt(i.name)}"` : o && t ? `data-file-id="${i.id}" data-file-name="${Xt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${S} file-item"
      ${v}
      role="listitem"
      ${o ? 'tabindex="0"' : ""}
    >
      ${l}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${Xt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Ss(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${da(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${ua(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${o && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Ao(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${Xt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((l, u) => Kt(l) && !Kt(u) ? -1 : !Kt(l) && Kt(u) ? 1 : l.name.localeCompare(u.name)).map((l) => ga(l, { selectable: n })).join("")}
    </div>
  `;
}
function To(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Ss(i.mimeType)
  };
}
export {
  or as AGREEMENT_STATUS_BADGES,
  fs as AgreementFormController,
  Ci as DocumentDetailPreviewController,
  Li as DocumentFormController,
  nr as ESignAPIClient,
  ir as ESignAPIError,
  bs as GOOGLE_ACCOUNT_STORAGE_KEY,
  rs as GoogleCallbackController,
  os as GoogleDrivePickerController,
  as as GoogleIntegrationController,
  sa as IMPORTABLE_MIME_TYPES,
  ds as IntegrationConflictsController,
  cs as IntegrationHealthController,
  ls as IntegrationMappingsController,
  us as IntegrationSyncRunsController,
  Ei as LandingPageController,
  Kn as MIME_GOOGLE_DOC,
  ws as MIME_GOOGLE_FOLDER,
  ki as MIME_GOOGLE_SHEET,
  Pi as MIME_GOOGLE_SLIDES,
  Ai as MIME_PDF,
  lo as PanelPaginationBehavior,
  uo as PanelSearchBehavior,
  bo as STANDARD_GRID_SELECTORS,
  ss as SignerCompletePageController,
  vs as SignerErrorPageController,
  ys as SignerReviewController,
  Le as announce,
  Lo as applyAccountIdToPath,
  gr as applyDetailFormatters,
  Or as bootstrapAgreementForm,
  co as bootstrapDocumentDetailPreview,
  no as bootstrapDocumentForm,
  ja as bootstrapGoogleCallback,
  Va as bootstrapGoogleDrivePicker,
  Oa as bootstrapGoogleIntegration,
  Qa as bootstrapIntegrationConflicts,
  Ja as bootstrapIntegrationHealth,
  Ka as bootstrapIntegrationMappings,
  eo as bootstrapIntegrationSyncRuns,
  Ha as bootstrapLandingPage,
  Ua as bootstrapSignerCompletePage,
  ao as bootstrapSignerErrorPage,
  Zr as bootstrapSignerReview,
  Co as buildScopedApiUrl,
  Ca as byId,
  ar as capitalize,
  rr as createESignClient,
  lr as createElement,
  wo as createSchemaActionCachingRefresh,
  To as createSelectedFile,
  Ea as createStatusBadgeElement,
  Ba as createTimeoutController,
  mo as dateTimeCellRenderer,
  Jn as debounce,
  yo as defaultActionErrorHandler,
  fo as defaultActionSuccessHandler,
  Pa as delegate,
  Xt as escapeHtml,
  ho as fileSizeCellRenderer,
  va as formatDate,
  Wn as formatDateTime,
  ua as formatDriveDate,
  da as formatDriveFileSize,
  jn as formatFileSize,
  ya as formatPageCount,
  Sa as formatRecipientCount,
  ba as formatRelativeTime,
  ur as formatSizeElements,
  wa as formatTime,
  pr as formatTimestampElements,
  ns as getAgreementStatusBadge,
  fa as getESignClient,
  la as getFileIconConfig,
  Ss as getFileTypeName,
  dr as getPageConfig,
  A as hide,
  io as initAgreementForm,
  mr as initDetailFormatters,
  oo as initDocumentDetailPreview,
  to as initDocumentForm,
  qa as initGoogleCallback,
  Ga as initGoogleDrivePicker,
  za as initGoogleIntegration,
  Xa as initIntegrationConflicts,
  Wa as initIntegrationHealth,
  Ya as initIntegrationMappings,
  Za as initIntegrationSyncRuns,
  Ra as initLandingPage,
  Na as initSignerCompletePage,
  ro as initSignerErrorPage,
  so as initSignerReview,
  Kt as isFolder,
  ra as isGoogleDoc,
  So as isGoogleWorkspaceFile,
  oa as isImportable,
  aa as isPDF,
  Vn as normalizeAccountId,
  ca as normalizeDriveFile,
  xo as normalizeDriveFiles,
  ia as normalizeFilterOperators,
  na as normalizeFilterOptions,
  ta as normalizeFilterType,
  ka as on,
  te as onReady,
  Da as poll,
  go as prepareFilterFields,
  po as prepareGridColumns,
  m as qs,
  Dt as qsa,
  Po as renderBreadcrumb,
  pa as renderFileIcon,
  ga as renderFileItem,
  Ao as renderFileList,
  cr as renderStatusBadge,
  Io as resolveAccountId,
  Ma as retry,
  Eo as saveAccountId,
  sr as setESignClient,
  Ta as setLoading,
  vo as setupRefreshButton,
  $ as show,
  is as sleep,
  xa as snakeToTitle,
  ko as syncAccountIdToUrl,
  $a as throttle,
  Aa as toggle,
  Ia as truncate,
  bn as updateDataText,
  _a as updateDataTexts,
  La as updateStatusBadge,
  Fa as withTimeout
};
//# sourceMappingURL=index.js.map

import { a as St } from "../chunks/html-Br-oQr7i.js";
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
function Yt(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Ks(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function en(i, e) {
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
function Dt(i, e = document) {
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
function q(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function R(i) {
  i && i.classList.add("hidden");
}
function ca(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? q(i) : R(i);
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
function lt(i, e = "polite") {
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
    } catch (w) {
      if (g = w, v >= t || !c(w, v))
        throw w;
      const P = o ? Math.min(n * Math.pow(2, v - 1), r) : n;
      s && s(w, v, P), await ui(P, h);
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
function tn(i, e) {
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
      r && (n === e ? q(r) : R(r));
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
function va(i) {
  const e = new pi(i);
  return _e(() => e.init()), e;
}
function ba(i) {
  const e = new pi(i);
  _e(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function ar(i = document) {
  Dt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Yt(t));
  });
}
function or(i = document) {
  Dt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = en(t));
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
        q(t);
        break;
      case "success":
        q(n);
        break;
      case "error":
        q(r);
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
    r && (r.textContent = qn[e] || qn.unknown), t && o && (o.textContent = t, q(o)), this.sendToOpener({
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
const gn = "esign.google.account_id", dr = {
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
      disconnectModal: w
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, w && q(w);
    }), s && s.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, w && R(w);
    }), h && h.addEventListener("click", () => this.disconnect()), c && c.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), r && r.addEventListener("click", () => this.checkStatus()), g && (g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, !0);
    }), g.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(g.value, !0));
    }));
    const { accountDropdown: P, connectFirstBtn: E } = this.elements;
    P && P.addEventListener("change", () => {
      P.value === "__new__" ? (P.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(P.value, !0);
    }), E && E.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (v && !v.classList.contains("hidden") && this.cancelOAuthFlow(), w && !w.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, R(w)));
    }), [v, w].forEach((f) => {
      f && f.addEventListener("click", (L) => {
        const S = L.target;
        (S === f || S.getAttribute("aria-hidden") === "true") && (R(f), f === v ? this.cancelOAuthFlow() : f === w && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(gn)
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
      this.currentAccountId ? window.localStorage.setItem(gn, this.currentAccountId) : window.localStorage.removeItem(gn);
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
    const { loadingState: t, disconnectedState: n, connectedState: r, errorState: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        q(t);
        break;
      case "disconnected":
        q(n);
        break;
      case "connected":
        q(r);
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
    ), w = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let P = t(["is_expired", "IsExpired"], void 0), E = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof P != "boolean" || typeof E != "boolean") && n) {
      const L = new Date(n);
      if (!Number.isNaN(L.getTime())) {
        const S = L.getTime() - Date.now(), C = 5 * 60 * 1e3;
        P = S <= 0, E = S > 0 && S <= C;
      }
    }
    const f = typeof w == "boolean" ? w : (P === !0 || E === !0) && !v;
    return {
      connected: c,
      account_id: o,
      email: g,
      scopes: Array.isArray(r) ? r : [],
      expires_at: n,
      is_expired: P === !0,
      is_expiring_soon: E === !0,
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
    const g = new Date(e), v = /* @__PURE__ */ new Date(), w = Math.max(
      1,
      Math.round((g.getTime() - v.getTime()) / (1e3 * 60))
    );
    t ? r ? (c.textContent = "Access token expired, but refresh is available and will be applied automatically.", c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), s && R(s)) : (c.textContent = "Access token has expired. Please re-authorize.", c.classList.remove("text-gray-500"), c.classList.add("text-red-600"), s && q(s), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (c.classList.remove("text-gray-500"), c.classList.add("text-amber-600"), r ? (c.textContent = `Token expires in approximately ${w} minute${w !== 1 ? "s" : ""}. Refresh is available automatically.`, s && R(s)) : (c.textContent = `Token expires in approximately ${w} minute${w !== 1 ? "s" : ""}`, s && q(s), h && (h.textContent = `Your access token will expire in ${w} minute${w !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (c.textContent = `Token valid until ${g.toLocaleDateString()} ${g.toLocaleTimeString()}`, s && R(s)), !o && s && R(s);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: r } = this.elements;
    n && (e ? (q(n), r && (r.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : R(n));
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
      t && q(t), n && R(n);
      return;
    }
    t && R(t), n && (q(n), n.innerHTML = this.accounts.map((r) => this.renderAccountCard(r)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, c = t ? "ring-2 ring-blue-500" : "", s = n[e.status] || "bg-white border-gray-200", h = r[e.status] || "bg-gray-100 text-gray-700", g = o[e.status] || e.status, v = e.account_id || "default", w = e.email || (e.account_id ? e.account_id : "Default account");
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(w)}</p>
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
        this.pendingDisconnectAccountId = s, t && q(t);
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
    this.messageHandler = (w) => this.handleOAuthCallback(w), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
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
const mn = "esign.google.account_id", Vn = {
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
      viewListBtn: w,
      viewGridBtn: P
    } = this.elements;
    if (e) {
      const f = tn(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (L) => {
        L.key === "Enter" && (L.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), r && r.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), c && c.addEventListener("click", () => this.clearSelection()), s && s.addEventListener("click", () => this.hideImportModal()), h && g && g.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), v && v.addEventListener("click", (f) => {
      const L = f.target;
      (L === v || L.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), w && w.addEventListener("click", () => this.setViewMode("list")), P && P.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && v && !v.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: E } = this.elements;
    E && E.addEventListener("click", (f) => this.handleFileListClick(f));
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
        window.localStorage.getItem(mn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, q(e)) : R(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(mn, this.currentAccountId) : window.localStorage.removeItem(mn);
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && q(t));
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
      e ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.nextPageToken = s.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), lt(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (r) {
      console.error("Error loading files:", r), this.renderError(r instanceof Error ? r.message : "Failed to load files"), lt("Error loading files");
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
            ${en(e.modifiedTime)}
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
      previewTitle: r,
      previewType: o,
      previewFileId: c,
      previewOwner: s,
      previewModified: h,
      importBtn: g,
      openInGoogleBtn: v
    } = this.elements;
    if (!this.selectedFile) {
      e && q(e), t && R(t);
      return;
    }
    e && R(e), t && q(t);
    const w = this.selectedFile, P = Gn.includes(w.mimeType);
    r && (r.textContent = w.name), o && (o.textContent = this.getMimeTypeLabel(w.mimeType)), c && (c.textContent = w.id), s && w.owners.length > 0 && (s.textContent = w.owners[0].emailAddress || "-"), h && (h.textContent = en(w.modifiedTime)), g && (P ? (g.removeAttribute("disabled"), g.classList.remove("opacity-50", "cursor-not-allowed")) : (g.setAttribute("disabled", "true"), g.classList.add("opacity-50", "cursor-not-allowed"))), v && w.webViewLink && (v.href = w.webViewLink);
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
    q(e);
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
    ).join(""), Dt(".breadcrumb-item", r).forEach((o) => {
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
    e && (this.nextPageToken ? q(e) : R(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? q(t) : R(t)), this.clearSelection(), this.loadFiles();
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
    r && (r.value = ""), e && q(e);
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
          document_title: s,
          agreement_title: h || void 0
        })
      });
      if (!g.ok) {
        const w = await g.json();
        throw new Error(w.error?.message || "Import failed");
      }
      const v = await g.json();
      this.showToast("Import started successfully", "success"), lt("Import started"), this.hideImportModal(), v.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${v.document.id}` : v.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${v.agreement.id}`);
    } catch (g) {
      console.error("Import error:", g);
      const v = g instanceof Error ? g.message : "Import failed";
      this.showToast(v, "error"), lt(`Error: ${v}`);
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
      this.renderHealthData(), lt("Health data refreshed");
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
    const s = o.width, h = o.height, g = 40, v = s - g * 2, w = h - g * 2;
    c.clearRect(0, 0, s, h);
    const P = t.labels, E = Object.values(t.datasets), f = v / P.length / (E.length + 1), L = Math.max(...E.flat()) || 1;
    P.forEach((S, C) => {
      const H = g + C * v / P.length + f / 2;
      E.forEach((V, $) => {
        const _ = V[C] / L * w, D = H + $ * f, X = h - g - _;
        c.fillStyle = n[$] || "#6b7280", c.fillRect(D, X, f - 2, _);
      }), C % Math.ceil(P.length / 6) === 0 && (c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "center", c.fillText(S, H + E.length * f / 2, h - g + 15));
    }), c.fillStyle = "#6b7280", c.font = "10px sans-serif", c.textAlign = "right";
    for (let S = 0; S <= 4; S++) {
      const C = h - g - S * w / 4, H = Math.round(L * S / 4);
      c.fillText(H.toString(), g - 5, C + 3);
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
      publishCancelBtn: w,
      publishConfirmBtn: P,
      deleteCancelBtn: E,
      deleteConfirmBtn: f,
      closePreviewBtn: L,
      loadSampleBtn: S,
      runPreviewBtn: C,
      clearPreviewBtn: H,
      previewSourceInput: V,
      searchInput: $,
      filterStatus: _,
      filterProvider: D,
      mappingModal: X,
      publishModal: ge,
      deleteModal: le,
      previewModal: oe
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.loadMappings()), s?.addEventListener("click", () => this.addSchemaField()), h?.addEventListener("click", () => this.addMappingRule()), g?.addEventListener("click", () => this.validateMapping()), v?.addEventListener("submit", (he) => {
      he.preventDefault(), this.saveMapping();
    }), w?.addEventListener("click", () => this.closePublishModal()), P?.addEventListener("click", () => this.publishMapping()), E?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), L?.addEventListener("click", () => this.closePreviewModal()), S?.addEventListener("click", () => this.loadSamplePayload()), C?.addEventListener("click", () => this.runPreviewTransform()), H?.addEventListener("click", () => this.clearPreview()), V?.addEventListener("input", tn(() => this.validateSourceJson(), 300)), $?.addEventListener("input", tn(() => this.renderMappings(), 300)), _?.addEventListener("change", () => this.renderMappings()), D?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (he) => {
      he.key === "Escape" && (X && !X.classList.contains("hidden") && this.closeModal(), ge && !ge.classList.contains("hidden") && this.closePublishModal(), le && !le.classList.contains("hidden") && this.closeDeleteModal(), oe && !oe.classList.contains("hidden") && this.closePreviewModal());
    }), [X, ge, le, oe].forEach((he) => {
      he?.addEventListener("click", (pe) => {
        const se = pe.target;
        (se === he || se.getAttribute("aria-hidden") === "true") && (he === X ? this.closeModal() : he === ge ? this.closePublishModal() : he === le ? this.closeDeleteModal() : he === oe && this.closePreviewModal());
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
    const { loadingState: t, emptyState: n, errorState: r, mappingsList: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        q(t);
        break;
      case "empty":
        q(n);
        break;
      case "error":
        q(r);
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
    s?.querySelectorAll(".schema-field-row").forEach((w) => {
      g.push({
        object: (w.querySelector(".field-object")?.value || "").trim(),
        field: (w.querySelector(".field-name")?.value || "").trim(),
        type: w.querySelector(".field-type")?.value || "string",
        required: w.querySelector(".field-required")?.checked || !1
      });
    });
    const v = [];
    return h?.querySelectorAll(".mapping-rule-row").forEach((w) => {
      v.push({
        source_object: (w.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (w.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: w.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (w.querySelector(".rule-target-path")?.value || "").trim()
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
      formValidationStatus: w
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), r && (r.value = e.name || ""), o && (o.value = e.provider || "");
    const P = e.external_schema || { object_type: "", fields: [] };
    c && (c.value = P.object_type || ""), s && (s.value = P.version || ""), h && (h.innerHTML = "", (P.fields || []).forEach((E) => h.appendChild(this.createSchemaFieldRow(E)))), g && (g.innerHTML = "", (e.rules || []).forEach((E) => g.appendChild(this.createMappingRuleRow(E)))), e.status && v ? (v.innerHTML = this.getStatusBadge(e.status), v.classList.remove("hidden")) : v && v.classList.add("hidden"), R(w);
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
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), q(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: r, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, r && (r.textContent = "Edit Mapping Specification"), this.populateForm(t), q(n), o?.focus();
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
    this.pendingPublishId = e, r && (r.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), q(n);
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
    this.pendingDeleteId = e, q(this.elements.deleteModal);
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
      q(t);
    } catch (r) {
      console.error("Validation error:", r), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(r instanceof Error ? r.message : "Unknown error")}</div>`, q(t));
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
    this.currentPreviewMapping = t, r && (r.textContent = t.name), o && (o.textContent = t.provider), c && (c.textContent = t.external_schema?.object_type || "-"), s && (s.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), h && (h.value = ""), R(g), q(n), h?.focus();
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
        q(t);
        break;
      case "loading":
        q(n);
        break;
      case "error":
        q(r);
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
      return t && (t.textContent = `JSON Syntax Error: ${r instanceof Error ? r.message : "Invalid JSON"}`, q(t)), null;
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
    const v = e.field_definitions || [];
    o && (o.textContent = `(${v.length})`), r && (v.length === 0 ? r.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : r.innerHTML = v.map(
      (E) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(E.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(E.value))}</span>
          </div>
        `
    ).join(""));
    const w = e.agreement || {}, P = Object.entries(w);
    c && (P.length === 0 ? c.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : c.innerHTML = P.map(
      ([E, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(E)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(f))}</span>
          </div>
        `
    ).join("")), s && (s.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((E) => {
      const f = h?.querySelector(`[data-rule-source="${this.escapeHtml(E.source)}"] span`);
      f && (E.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
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
      conflictDetailModal: w,
      resolveModal: P
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), r?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("change", () => this.renderConflicts()), s?.addEventListener("click", () => this.openResolveModal("resolved")), h?.addEventListener("click", () => this.openResolveModal("ignored")), g?.addEventListener("click", () => this.closeResolveModal()), v?.addEventListener("submit", (E) => this.submitResolution(E)), document.addEventListener("keydown", (E) => {
      E.key === "Escape" && (P && !P.classList.contains("hidden") ? this.closeResolveModal() : w && !w.classList.contains("hidden") && this.closeConflictDetail());
    }), [w, P].forEach((E) => {
      E?.addEventListener("click", (f) => {
        const L = f.target;
        (L === E || L.getAttribute("aria-hidden") === "true") && (E === w ? this.closeConflictDetail() : E === P && this.closeResolveModal());
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
    const { loadingState: t, emptyState: n, errorState: r, conflictsList: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        q(t);
        break;
      case "empty":
        q(n);
        break;
      case "error":
        q(r);
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
    const t = this.conflicts.find((_) => _.id === e);
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
      detailConflictId: w,
      detailRunId: P,
      detailCreatedAt: E,
      detailVersion: f,
      detailPayload: L,
      resolutionSection: S,
      actionButtons: C,
      detailResolvedAt: H,
      detailResolvedBy: V,
      detailResolution: $
    } = this.elements;
    if (r && (r.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), s && (s.textContent = t.provider || "-"), h && (h.textContent = t.external_id || "-"), g && (g.textContent = t.internal_id || "-"), v && (v.textContent = t.binding_id || "-"), w && (w.textContent = t.id), P && (P.textContent = t.run_id || "-"), E && (E.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), L)
      try {
        const _ = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        L.textContent = JSON.stringify(_, null, 2);
      } catch {
        L.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (q(S), R(C), H && (H.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), V && (V.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), $)
        try {
          const _ = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          $.textContent = JSON.stringify(_, null, 2);
        } catch {
          $.textContent = t.resolution_json || "{}";
        }
    } else
      R(S), q(C);
    q(n);
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
    n?.reset(), r && (r.value = e), q(t);
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
      actionResumeBtn: w,
      actionRetryBtn: P,
      actionCompleteBtn: E,
      actionFailBtn: f,
      actionDiagnosticsBtn: L,
      startSyncModal: S,
      runDetailModal: C
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (H) => this.startSync(H)), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.loadSyncRuns()), s?.addEventListener("click", () => this.closeRunDetail()), h?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), w?.addEventListener("click", () => this.runAction("resume")), P?.addEventListener("click", () => this.runAction("resume")), E?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), L?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (H) => {
      H.key === "Escape" && (S && !S.classList.contains("hidden") && this.closeStartSyncModal(), C && !C.classList.contains("hidden") && this.closeRunDetail());
    }), [S, C].forEach((H) => {
      H?.addEventListener("click", (V) => {
        const $ = V.target;
        ($ === H || $.getAttribute("aria-hidden") === "true") && (H === S ? this.closeStartSyncModal() : H === C && this.closeRunDetail());
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
    const { loadingState: t, emptyState: n, errorState: r, runsTimeline: o } = this.elements;
    switch (R(t), R(n), R(r), R(o), e) {
      case "loading":
        q(t);
        break;
      case "empty":
        q(n);
        break;
      case "error":
        q(r);
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
    t?.reset(), q(e), document.getElementById("sync-provider")?.focus();
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
    const t = this.syncRuns.find((V) => V.id === e);
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
      detailAttempt: w,
      detailErrorSection: P,
      detailLastError: E,
      detailCheckpoints: f,
      actionResumeBtn: L,
      actionRetryBtn: S,
      actionCompleteBtn: C,
      actionFailBtn: H
    } = this.elements;
    r && (r.textContent = t.id), o && (o.textContent = t.provider), c && (c.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), s && (s.innerHTML = this.getStatusBadge(t.status)), h && (h.textContent = this.formatDate(t.started_at)), g && (g.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), v && (v.textContent = t.cursor || "-"), w && (w.textContent = String(t.attempt_count || 1)), t.last_error ? (E && (E.textContent = t.last_error), q(P)) : R(P), L && L.classList.toggle("hidden", t.status !== "running"), S && S.classList.toggle("hidden", t.status !== "failed"), C && C.classList.toggle("hidden", t.status !== "running"), H && H.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), q(n);
    try {
      const V = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (V.ok) {
        const $ = await V.json();
        this.renderCheckpoints($.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (V) {
      console.error("Error loading checkpoints:", V), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
        const w = await v.json();
        throw new Error(w.error?.message || `HTTP ${v.status}`);
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
const fn = "esign.google.account_id", ur = 25 * 1024 * 1024, pr = 2e3, Wn = 60, En = "application/vnd.google-apps.document", Cn = "application/pdf", Jn = "application/vnd.google-apps.folder", gr = [En, Cn];
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
      sourceTabs: Dt(".source-tab"),
      sourcePanels: Dt(".source-panel"),
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
      const g = tn(() => this.handleSearch(), 300);
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
   * Update account scope UI elements
   */
  updateAccountScopeUI() {
    this.syncScopedAccountState();
    const { accountScopeHelp: e, connectGoogleLink: t, driveAccountDropdown: n } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, q(e)) : R(e)), t) {
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
      n.id.replace("panel-", "") === e ? q(n) : R(n);
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
      `File is too large (${Yt(e.size)}). Maximum size is ${Yt(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: r, fileSize: o, uploadZone: c } = this.elements;
    r && (r.textContent = e.name), o && (o.textContent = Yt(e.size)), t && R(t), n && q(n), c && (c.classList.remove("border-gray-300"), c.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && q(e), t && R(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
      const w = h?.error?.message || h?.message || "Upload failed. Please try again.";
      throw new Error(w);
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
      const { resultCount: w, listTitle: P } = this.elements;
      n && w ? (w.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, P && (P.textContent = "Search Results")) : (w && (w.textContent = ""), P && (P.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: E } = this.elements;
      E && (this.nextPageToken ? q(E) : R(E)), lt(`Loaded ${v.length} files`);
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
        `), lt(`Error: ${s instanceof Error ? s.message : "Unknown error"}`);
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
              ${r.modifiedTime ? " • " + en(r.modifiedTime) : ""}
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
    q(e);
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
      importTypeInfo: w,
      importTypeLabel: P,
      importTypeDesc: E,
      snapshotWarning: f,
      importDocumentTitle: L
    } = this.elements;
    o && R(o), c && q(c), s && R(s), h && (h.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, h.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), g && (g.textContent = e.name || "Untitled"), v && (v.textContent = this.getFileTypeName(e.mimeType)), n && w && (w.className = `p-3 rounded-lg border ${n.bgClass}`, P && (P.textContent = n.label, P.className = `text-xs font-medium ${n.textClass}`), E && (E.textContent = n.desc, E.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? q(f) : R(f))), L && (L.value = e.name || ""), lt(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: r } = this.elements;
    e && q(e), t && R(t), n && R(n), r && r.querySelectorAll(".file-item").forEach((o) => {
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
    switch (t && R(t), n && R(n), r && q(r), o && R(o), c && R(c), s && R(s), e) {
      case "queued":
      case "running":
        o && q(o);
        break;
      case "succeeded":
        c && q(c);
        break;
      case "failed":
        s && q(s);
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
        r.href = this.applyAccountIdToPath(o), q(r);
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
}, pt = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, nn = {
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
async function Ir(i, e = nn.THUMBNAIL_MAX_WIDTH, t = nn.THUMBNAIL_MAX_HEIGHT) {
  await wr();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const o = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, c = o.numPages, s = await o.getPage(1), h = s.getViewport({ scale: 1 }), g = e / h.width, v = t / h.height, w = Math.min(g, v, 1), P = s.getViewport({ scale: w }), E = document.createElement("canvas");
  E.width = P.width, E.height = P.height;
  const f = E.getContext("2d");
  if (!f)
    throw new Error("Failed to get canvas context");
  return await s.render({
    canvasContext: f,
    viewport: P
  }).promise, { dataUrl: E.toDataURL("image/jpeg", 0.8), pageCount: c };
}
class Er {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || nn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || nn.THUMBNAIL_MAX_HEIGHT
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
function ut(i, e) {
  return i instanceof Document ? i.getElementById(e) : i.querySelector(`#${e}`);
}
function Ht(i, e, t) {
  const n = ut(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function Pr(i = document) {
  return {
    marker: ut(i, "esign-page-config"),
    form: {
      root: Ht(i, "agreement-form", "form"),
      submitBtn: Ht(i, "submit-btn", "submit button"),
      wizardSaveBtn: ut(i, "wizard-save-btn"),
      announcements: ut(i, "form-announcements"),
      documentIdInput: Ht(i, "document_id", "document selector"),
      documentPageCountInput: ut(i, "document_page_count"),
      titleInput: Ht(i, "title", "title input"),
      messageInput: Ht(i, "message", "message input")
    },
    coordination: {
      banner: ut(i, "active-tab-banner"),
      message: ut(i, "active-tab-message")
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
function Tr(i, e) {
  return {
    render(t = {}) {
      const n = t?.coordinationAvailable !== !1, r = i.coordination.banner, o = i.coordination.message;
      if (!r || !o)
        return;
      if (n) {
        r.classList.add("hidden");
        return;
      }
      const c = t?.lastSeenAt ? e.formatRelativeTime(t.lastSeenAt) : "recently";
      o.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${c}.`, r.classList.remove("hidden");
    },
    destroy() {
      i.coordination.banner?.classList.add("hidden");
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
    const w = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = w || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
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
const hn = /* @__PURE__ */ new Map();
async function kr(i) {
  const e = String(i || "").trim().replace(/\/+$/, "");
  if (e === "")
    throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? An(window.__esignSyncCoreModule) : (hn.has(e) || hn.set(e, Dr(e)), hn.get(e));
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
      operation: "dispose",
      payload: {},
      expectedRevision: n,
      idempotencyKey: `dispose:${e}:${n}`
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
    this.channel = null, this.cleanupFns = [], this.activeDraftId = "", this.coordinationAvailable = !1, this.options = e;
  }
  start() {
    this.initBroadcastChannel(), this.initEventListeners(), this.options.onCoordinationAvailabilityChange?.(this.coordinationAvailable);
  }
  stop() {
    this.cleanupFns.forEach((e) => e()), this.cleanupFns = [], this.channel?.close && this.channel.close(), this.channel = null, this.coordinationAvailable = !1, this.activeDraftId = "";
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
  win() {
    return this.options.windowRef || (typeof window > "u" ? null : window);
  }
  doc() {
    return this.options.documentRef || (typeof document > "u" ? null : document);
  }
  initBroadcastChannel() {
    const e = this.options.broadcastChannelFactory || ((t) => new BroadcastChannel(t));
    if (typeof BroadcastChannel > "u" && !this.options.broadcastChannelFactory) {
      this.coordinationAvailable = !1;
      return;
    }
    try {
      this.channel = e(this.options.channelName), this.channel.onmessage = (t) => this.handleChannelMessage(t.data), this.coordinationAvailable = !0;
    } catch {
      this.channel = null, this.coordinationAvailable = !1;
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
function Ct(i) {
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
function Ke(i = {}) {
  const {
    state: e,
    storageKey: t,
    ownership: n,
    sendAttemptId: r,
    extra: o = {}
  } = i;
  return {
    wizardId: Ct(e?.wizardId),
    serverDraftId: Ct(e?.serverDraftId),
    serverRevision: Xn(e?.serverRevision),
    currentStep: Xn(e?.currentStep),
    syncPending: e?.syncPending === !0,
    storageKey: Ct(t),
    activeTabOwner: typeof n?.isOwner == "boolean" ? n.isOwner : null,
    activeTabClaimTabId: Ct(n?.claim?.tabId),
    activeTabClaimedAt: Ct(n?.claim?.claimedAt),
    activeTabLastSeenAt: Ct(n?.claim?.lastSeenAt),
    activeTabBlockedReason: Ct(n?.blockedReason),
    sendAttemptId: Ct(r),
    ...o
  };
}
function ft(i, e = {}) {
  console.info(wi, i, e);
}
function It(i, e = {}) {
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
    this.isSyncing = !0, this.options.statusUpdater("saving"), ft("sync_perform_start", Ke({
      state: e,
      storageKey: this.options.storageKey,
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
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), It("sync_perform_conflict", Ke({
      state: e,
      storageKey: this.options.storageKey,
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
function yt(i) {
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
function yn(i, e) {
  i instanceof HTMLButtonElement && (i.disabled = e);
}
function Ur(i) {
  const {
    documentIdInput: e,
    selectedDocumentTitle: t,
    participantsContainer: n,
    fieldDefinitionsContainer: r,
    submitBtn: o,
    escapeHtml: c,
    getSignerParticipants: s,
    getCurrentDocumentPageCount: h,
    collectFieldRulesForState: g,
    expandRulesForPreview: v,
    findSignersMissingRequiredSignatureField: w,
    goToStep: P
  } = i;
  function E() {
    const f = yt("send-readiness-loading"), L = yt("send-readiness-results"), S = yt("send-validation-status"), C = yt("send-validation-issues"), H = yt("send-issues-list"), V = yt("send-confirmation"), $ = yt("review-agreement-title"), _ = yt("review-document-title"), D = yt("review-participant-count"), X = yt("review-stage-count"), ge = yt("review-participants-list"), le = yt("review-fields-summary"), oe = document.getElementById("title");
    if (!f || !L || !S || !C || !H || !V || !$ || !_ || !D || !X || !ge || !le || !(oe instanceof HTMLInputElement))
      return;
    const he = oe.value || "Untitled", pe = t?.textContent || "No document", se = n.querySelectorAll(".participant-entry"), Ie = r.querySelectorAll(".field-definition-entry"), De = v(g(), h()), Re = s(), Se = /* @__PURE__ */ new Set();
    se.forEach((me) => {
      const U = me.querySelector(".signing-stage-input"), be = me.querySelector('select[name*=".role"]');
      be instanceof HTMLSelectElement && be.value === "signer" && U instanceof HTMLInputElement && U.value && Se.add(Number.parseInt(U.value, 10));
    }), $.textContent = he, _.textContent = pe, D.textContent = `${se.length} (${Re.length} signers)`, X.textContent = String(Se.size > 0 ? Se.size : 1), ge.innerHTML = "", se.forEach((me) => {
      const U = Gt(me, 'input[name*=".name"]'), be = Gt(me, 'input[name*=".email"]'), ke = Gt(me, 'select[name*=".role"]', "signer"), et = Gt(me, ".signing-stage-input"), Ve = Nr(me, ".notify-input", !0), tt = document.createElement("div");
      tt.className = "flex items-center justify-between text-sm", tt.innerHTML = `
        <div>
          <span class="font-medium">${c(U || be)}</span>
          <span class="text-gray-500 ml-2">${c(be)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${ke === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${ke === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${Ve ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${Ve ? "Notify" : "No Notify"}
          </span>
          ${ke === "signer" && et ? `<span class="text-xs text-gray-500">Stage ${et}</span>` : ""}
        </div>
      `, ge.appendChild(tt);
    });
    const Oe = Ie.length + De.length;
    le.textContent = `${Oe} field${Oe !== 1 ? "s" : ""} defined (${Ie.length} manual, ${De.length} generated)`;
    const $e = [];
    e?.value || $e.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), Re.length === 0 && $e.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), w().forEach((me) => {
      $e.push({
        severity: "error",
        message: `${me.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const it = Array.from(Se).sort((me, U) => me - U);
    for (let me = 0; me < it.length; me++)
      if (it[me] !== me + 1) {
        $e.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Ne = $e.some((me) => me.severity === "error"), qe = $e.some((me) => me.severity === "warning");
    Ne ? (S.className = "p-4 rounded-lg bg-red-50 border border-red-200", S.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, V.classList.add("hidden"), yn(o, !0)) : qe ? (S.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", S.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, V.classList.remove("hidden"), yn(o, !1)) : (S.className = "p-4 rounded-lg bg-green-50 border border-green-200", S.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, V.classList.remove("hidden"), yn(o, !1)), $e.length > 0 ? (C.classList.remove("hidden"), H.innerHTML = "", $e.forEach((me) => {
      const U = document.createElement("li");
      U.className = `p-3 rounded-lg flex items-center justify-between ${me.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, U.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${me.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${me.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${c(me.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${me.step}">
            ${c(me.action)}
          </button>
        `, H.appendChild(U);
    }), H.querySelectorAll("[data-go-to-step]").forEach((me) => {
      me.addEventListener("click", () => {
        const U = Number(me.getAttribute("data-go-to-step"));
        Number.isFinite(U) && P(U);
      });
    })) : C.classList.add("hidden"), f.classList.add("hidden"), L.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: E
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
    previewCard: o,
    updateCoordinationUI: c,
    validateStep: s,
    onPlacementStep: h,
    onReviewStep: g,
    onStepChanged: v,
    initialStep: w = 1
  } = i;
  let P = w;
  const E = Array.from(document.querySelectorAll(".wizard-step-btn")), f = Array.from(document.querySelectorAll(".wizard-step")), L = Array.from(document.querySelectorAll(".wizard-connector")), S = document.getElementById("wizard-prev-btn"), C = document.getElementById("wizard-next-btn"), H = document.getElementById("wizard-save-btn");
  function V() {
    if (E.forEach((D, X) => {
      const ge = X + 1, le = D.querySelector(".wizard-step-number");
      le instanceof HTMLElement && (ge < P ? (D.classList.remove("text-gray-500", "text-blue-600"), D.classList.add("text-green-600"), le.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), le.classList.add("bg-green-600", "text-white"), D.removeAttribute("aria-current")) : ge === P ? (D.classList.remove("text-gray-500", "text-green-600"), D.classList.add("text-blue-600"), le.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), le.classList.add("bg-blue-600", "text-white"), D.setAttribute("aria-current", "step")) : (D.classList.remove("text-blue-600", "text-green-600"), D.classList.add("text-gray-500"), le.classList.remove("bg-blue-600", "text-white", "bg-green-600"), le.classList.add("bg-gray-300", "text-gray-600"), D.removeAttribute("aria-current")));
    }), L.forEach((D, X) => {
      X < P - 1 ? (D.classList.remove("bg-gray-300"), D.classList.add("bg-green-600")) : (D.classList.remove("bg-green-600"), D.classList.add("bg-gray-300"));
    }), f.forEach((D) => {
      Qn(D.dataset.step) === P ? D.classList.remove("hidden") : D.classList.add("hidden");
    }), S?.classList.toggle("hidden", P === 1), C?.classList.toggle("hidden", P === e), H?.classList.toggle("hidden", P !== e), r.classList.toggle("hidden", P !== e), c(), P < e) {
      const D = n[P] || "Next";
      C && (C.innerHTML = `
        ${D}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    P === t.PLACEMENT ? h?.() : P === t.REVIEW && g?.(), o.updateVisibility(P);
  }
  function $(D) {
    if (!(D < t.DOCUMENT || D > e)) {
      if (D > P) {
        for (let X = P; X < D; X++)
          if (!s(X)) return;
      }
      P = D, V(), v?.(D), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function _() {
    E.forEach((D) => {
      D.addEventListener("click", () => {
        const X = Qn(D.dataset.step);
        $(X);
      });
    }), S?.addEventListener("click", () => $(P - 1)), C?.addEventListener("click", () => $(P + 1)), H?.addEventListener("click", () => {
      const D = document.getElementById("agreement-form");
      if (!(D instanceof HTMLFormElement)) return;
      const X = document.createElement("input");
      X.type = "hidden", X.name = "save_as_draft", X.value = "1", D.appendChild(X), D.submit();
    });
  }
  return {
    bindEvents: _,
    getCurrentStep() {
      return P;
    },
    setCurrentStep(D) {
      P = D;
    },
    goToStep: $,
    updateWizardUI: V
  };
}
function Zn(i) {
  return i.querySelector('select[name*=".role"]');
}
function zr(i) {
  return i.querySelector(".field-participant-select");
}
function Kt(i) {
  return typeof i == "object" && i !== null;
}
function Or(i, e, t = {}) {
  const n = new Error(e);
  return n.code = String(i).trim(), Number(t.status || 0) > 0 && (n.status = Number(t.status || 0)), Number(t.currentRevision || 0) > 0 && (n.currentRevision = Number(t.currentRevision || 0)), Number(t.conflict?.currentRevision || 0) > 0 && (n.conflict = {
    currentRevision: Number(t.conflict?.currentRevision || 0)
  }), n;
}
function jr(i, e = 0) {
  if (!Kt(i))
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
    fieldPlacementsJSONInput: w,
    fieldRulesJSONInput: P,
    storageKey: E,
    syncService: f,
    syncOrchestrator: L,
    stateManager: S,
    submitMode: C,
    totalWizardSteps: H,
    wizardStep: V,
    getCurrentStep: $,
    getPlacementState: _,
    getCurrentDocumentPageCount: D,
    ensureSelectedDocumentCompatibility: X,
    collectFieldRulesForState: ge,
    collectFieldRulesForForm: le,
    expandRulesForPreview: oe,
    findSignersMissingRequiredSignatureField: he,
    missingSignatureFieldMessage: pe,
    getSignerParticipants: se,
    buildCanonicalAgreementPayload: Ie,
    announceError: De,
    emitWizardTelemetry: Re,
    parseAPIError: Se,
    goToStep: Oe,
    showSyncConflictDialog: $e,
    surfaceSyncOutcome: st,
    updateSyncStatus: it,
    activeTabOwnershipRequiredCode: Ne = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: qe,
    addFieldBtn: me
  } = i;
  let U = null;
  function be() {
    return qe?.() || {};
  }
  function ke(fe, Ee = !1) {
    n.setAttribute("aria-busy", Ee ? "true" : "false"), n.innerHTML = Ee ? `
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
  async function et() {
    ft("persist_latest_wizard_state_start", Ke({
      state: S.getState(),
      storageKey: E,
      ownership: be(),
      sendAttemptId: U
    })), S.updateState(S.collectFormState());
    const fe = await L.forceSync();
    if (fe?.blocked && fe.reason === "passive_tab")
      throw It("persist_latest_wizard_state_blocked", Ke({
        state: S.getState(),
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          reason: fe.reason
        }
      })), {
        code: Ne,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const Ee = S.getState();
    if (Ee?.syncPending)
      throw It("persist_latest_wizard_state_unsynced", Ke({
        state: Ee,
        storageKey: E,
        ownership: be(),
        sendAttemptId: U
      })), new Error("Unable to sync latest draft changes");
    return ft("persist_latest_wizard_state_complete", Ke({
      state: Ee,
      storageKey: E,
      ownership: be(),
      sendAttemptId: U
    })), Ee;
  }
  async function Ve() {
    ft("ensure_draft_ready_for_send_start", Ke({
      state: S.getState(),
      storageKey: E,
      ownership: be(),
      sendAttemptId: U
    }));
    const fe = await et(), Ee = String(fe?.serverDraftId || "").trim();
    if (!Ee) {
      It("ensure_draft_ready_for_send_missing_draft", Ke({
        state: fe,
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          action: "create_draft"
        }
      }));
      const Me = await f.create(fe), nt = String(Me.id || "").trim(), A = Number(Me.revision || 0);
      return nt && A > 0 && S.markSynced(nt, A), ft("ensure_draft_ready_for_send_created", Ke({
        state: S.getState(),
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          loadedDraftId: nt,
          loadedRevision: A
        }
      })), {
        draftID: nt,
        revision: A
      };
    }
    try {
      ft("ensure_draft_ready_for_send_loading", Ke({
        state: fe,
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          targetDraftId: Ee
        }
      }));
      const Me = await f.load(Ee), nt = String(Me?.id || Ee).trim(), A = Number(Me?.revision || fe?.serverRevision || 0);
      return nt && A > 0 && S.markSynced(nt, A), ft("ensure_draft_ready_for_send_loaded", Ke({
        state: S.getState(),
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          loadedDraftId: nt,
          loadedRevision: A
        }
      })), {
        draftID: nt,
        revision: A > 0 ? A : Number(fe?.serverRevision || 0)
      };
    } catch (Me) {
      throw Number(Kt(Me) && Me.status || 0) !== 404 ? (It("ensure_draft_ready_for_send_load_failed", Ke({
        state: fe,
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          targetDraftId: Ee,
          status: Number(Kt(Me) && Me.status || 0)
        }
      })), Me) : (It("ensure_draft_ready_for_send_missing_remote_draft", Ke({
        state: fe,
        storageKey: E,
        ownership: be(),
        sendAttemptId: U,
        extra: {
          targetDraftId: Ee,
          status: 404
        }
      })), Re("wizard_send_not_found", {
        draft_id: Ee,
        status: 404,
        phase: "pre_send"
      }), await tt().catch(() => {
      }), Or(
        "DRAFT_SEND_NOT_FOUND",
        "Draft not found",
        { status: 404 }
      ));
    }
  }
  async function tt() {
    const fe = S.getState();
    S.setState({
      ...fe,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await L.forceSync();
  }
  function gt() {
    t.addEventListener("submit", function(fe) {
      if (Ie(), !r.value) {
        fe.preventDefault(), De("Please select a document"), o.focus();
        return;
      }
      if (!X()) {
        fe.preventDefault();
        return;
      }
      const Ee = c.querySelectorAll(".participant-entry");
      if (Ee.length === 0) {
        fe.preventDefault(), De("Please add at least one participant"), s.focus();
        return;
      }
      let Me = !1;
      if (Ee.forEach((J) => {
        Zn(J)?.value === "signer" && (Me = !0);
      }), !Me) {
        fe.preventDefault(), De("At least one signer is required");
        const J = Ee[0] ? Zn(Ee[0]) : null;
        J && J.focus();
        return;
      }
      const nt = h.querySelectorAll(".field-definition-entry"), A = he();
      if (A.length > 0) {
        fe.preventDefault(), De(pe(A)), Oe(V.FIELDS), me.focus();
        return;
      }
      let M = !1;
      if (nt.forEach((J) => {
        zr(J)?.value || (M = !0);
      }), M) {
        fe.preventDefault(), De("Please assign all fields to a signer");
        const J = h.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        J && J.focus();
        return;
      }
      if (ge().some((J) => !J.participantId)) {
        fe.preventDefault(), De("Please assign all automation rules to a signer"), Array.from(g?.querySelectorAll(".field-rule-participant-select") || []).find((ye) => !ye.value)?.focus();
        return;
      }
      const ie = !!t.querySelector('input[name="save_as_draft"]'), ce = $() === H && !ie;
      if (ce) {
        let J = t.querySelector('input[name="send_for_signature"]');
        J || (J = document.createElement("input"), J.type = "hidden", J.name = "send_for_signature", t.appendChild(J)), J.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (C === "json") {
        fe.preventDefault(), n.disabled = !0, ke(ce ? "Sending..." : "Saving...", !0), (async () => {
          try {
            Ie();
            const J = String(e.routes?.index || "").trim();
            if (!ce) {
              if (await et(), J) {
                window.location.href = J;
                return;
              }
              window.location.reload();
              return;
            }
            U = Fr(), ft("send_submit_start", Ke({
              state: S.getState(),
              storageKey: E,
              ownership: be(),
              sendAttemptId: U
            }));
            const ye = await Ve(), de = String(ye?.draftID || "").trim(), K = Number(ye?.revision || 0);
            if (!de || K <= 0)
              throw new Error("Draft session not available. Please try again.");
            ft("send_request_start", Ke({
              state: S.getState(),
              storageKey: E,
              ownership: be(),
              sendAttemptId: U,
              extra: {
                targetDraftId: de,
                expectedRevision: K
              }
            }));
            const Z = await f.send(K, U || de), we = String(
              Z?.agreement_id || Z?.id || Z?.data?.agreement_id || Z?.data?.id || ""
            ).trim();
            if (ft("send_request_success", Ke({
              state: S.getState(),
              storageKey: E,
              ownership: be(),
              sendAttemptId: U,
              extra: {
                targetDraftId: de,
                expectedRevision: K,
                agreementId: we
              }
            })), S.clear(), L.broadcastStateUpdate(), L.broadcastDraftDisposed?.(de, "send_completed"), U = null, we && J) {
              window.location.href = `${J}/${encodeURIComponent(we)}`;
              return;
            }
            if (J) {
              window.location.href = J;
              return;
            }
            window.location.reload();
          } catch (J) {
            const ye = Kt(J) ? J : {}, de = String(ye.message || "Failed to process agreement").trim();
            let K = String(ye.code || "").trim();
            const Z = Number(ye.status || 0);
            if (K.toUpperCase() === "STALE_REVISION") {
              const we = jr(J, Number(S.getState()?.serverRevision || 0));
              it?.("conflict"), $e?.(we), Re("wizard_send_conflict", {
                draft_id: String(S.getState()?.serverDraftId || "").trim(),
                current_revision: we,
                status: Z || 409
              }), n.disabled = !1, ke("Send for Signature", !1), U = null;
              return;
            }
            K.toUpperCase() === "NOT_FOUND" && (K = "DRAFT_SEND_NOT_FOUND", Re("wizard_send_not_found", {
              draft_id: String(S.getState()?.serverDraftId || "").trim(),
              status: Z || 404
            }), await tt().catch(() => {
            })), It("send_request_failed", Ke({
              state: S.getState(),
              storageKey: E,
              ownership: be(),
              sendAttemptId: U,
              extra: {
                code: K || null,
                status: Z,
                message: de
              }
            })), De(de, K, Z), n.disabled = !1, ke("Send for Signature", !1), U = null;
          }
        })();
        return;
      }
      n.disabled = !0, ke(ce ? "Sending..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: gt,
    ensureDraftReadyForSend: Ve,
    persistLatestWizardState: et,
    resyncAfterSendNotFound: tt
  };
}
const ei = 150, ti = 32;
function ze(i) {
  return i == null ? "" : String(i).trim();
}
function Si(i) {
  if (typeof i == "boolean") return i;
  const e = ze(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Vr(i) {
  return ze(i).toLowerCase();
}
function Ze(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(ze(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Wt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(ze(i));
  return Number.isFinite(t) ? t : e;
}
function Xt(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function jt(i, e) {
  const t = Ze(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function zt(i, e, t = 1) {
  const n = Ze(t, 1), r = Ze(i, n);
  return e > 0 ? Xt(r, 1, e) : r > 0 ? r : n;
}
function Gr(i, e, t) {
  const n = Ze(t, 1);
  let r = jt(i, n), o = jt(e, n);
  return r <= 0 && (r = 1), o <= 0 && (o = n), o < r ? { start: o, end: r } : { start: r, end: o };
}
function rn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => ze(n)) : ze(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const r = Ze(n, 0);
    r > 0 && t.add(r);
  }), Array.from(t).sort((n, r) => n - r);
}
function Qt(i, e) {
  const t = Ze(e, 1), n = ze(i.participantId ?? i.participant_id), r = rn(i.excludePages ?? i.exclude_pages), o = i.required, c = typeof o == "boolean" ? o : !["0", "false", "off", "no"].includes(ze(o).toLowerCase());
  return {
    id: ze(i.id),
    type: Vr(i.type),
    participantId: n,
    participantTempId: ze(i.participantTempId) || n,
    fromPage: jt(i.fromPage ?? i.from_page, t),
    toPage: jt(i.toPage ?? i.to_page, t),
    page: jt(i.page, t),
    excludeLastPage: Si(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: r,
    required: c
  };
}
function Wr(i, e) {
  const t = ze(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Jr(i, e) {
  const t = Ze(e, 1), n = [];
  return i.forEach((r, o) => {
    const c = Qt(r || {}, t);
    if (c.type === "") return;
    const s = Wr(c, o);
    if (c.type === "initials_each_page") {
      const h = Gr(c.fromPage, c.toPage, t), g = /* @__PURE__ */ new Set();
      rn(c.excludePages).forEach((v) => {
        v <= t && g.add(v);
      }), c.excludeLastPage && g.add(t);
      for (let v = h.start; v <= h.end; v += 1)
        g.has(v) || n.push({
          id: `${s}-initials-${v}`,
          type: "initials",
          page: v,
          participantId: ze(c.participantId),
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
        participantId: ze(c.participantId),
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
  c = Xt(c, 1, o), s = Xt(s, 1, o), s < c && ([c, s] = [s, c]);
  const h = /* @__PURE__ */ new Set();
  r.forEach((v) => {
    const w = Ze(v, 0);
    w > 0 && h.add(Xt(w, 1, o));
  }), n && h.add(o);
  const g = [];
  for (let v = c; v <= s; v += 1)
    h.has(v) || g.push(v);
  return {
    pages: g,
    rangeStart: c,
    rangeEnd: s,
    excludedPages: Array.from(h).sort((v, w) => v - w),
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
    id: ze(e.id),
    title: ze(e.title || e.name) || "Untitled",
    pageCount: Ze(e.page_count ?? e.pageCount, 0),
    compatibilityTier: ze(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: ze(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function xi(i) {
  const e = ze(i).toLowerCase();
  if (e === "") return pt.MANUAL;
  switch (e) {
    case pt.AUTO:
    case pt.MANUAL:
    case pt.AUTO_LINKED:
    case pt.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function qt(i, e = 0) {
  const t = i || {}, n = ze(t.id) || `fi_init_${e}`, r = ze(t.definitionId || t.definition_id || t.field_definition_id) || n, o = Ze(t.page ?? t.page_number, 1), c = Wt(t.x ?? t.pos_x, 0), s = Wt(t.y ?? t.pos_y, 0), h = Wt(t.width, ei), g = Wt(t.height, ti);
  return {
    id: n,
    definitionId: r,
    type: ze(t.type) || "text",
    participantId: ze(t.participantId || t.participant_id),
    participantName: ze(t.participantName || t.participant_name) || "Unassigned",
    page: o > 0 ? o : 1,
    x: c >= 0 ? c : 0,
    y: s >= 0 ? s : 0,
    width: h > 0 ? h : ei,
    height: g > 0 ? g : ti,
    placementSource: xi(t.placementSource || t.placement_source),
    linkGroupId: ze(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: ze(t.linkedFromFieldId || t.linked_from_field_id),
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
    link_group_id: ze(t.linkGroupId),
    linked_from_field_id: ze(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function We(i) {
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
    showToast: w,
    mapUserFacingError: P,
    renderFieldRulePreview: E
  } = i, f = We("document_id"), L = We("selected-document"), S = We("document-picker"), C = We("document-search"), H = We("document-list"), V = We("change-document-btn"), $ = We("selected-document-title"), _ = We("selected-document-info"), D = We("document_page_count"), X = We("document-remediation-panel"), ge = We("document-remediation-message"), le = We("document-remediation-status"), oe = We("document-remediation-trigger-btn"), he = We("document-remediation-dismiss-btn"), pe = We("title"), se = 300, Ie = 5, De = 10, Re = We("document-typeahead"), Se = We("document-typeahead-dropdown"), Oe = We("document-recent-section"), $e = We("document-recent-list"), st = We("document-search-section"), it = We("document-search-list"), Ne = We("document-empty-state"), qe = We("document-dropdown-loading"), me = We("document-search-loading"), U = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let be = [], ke = null, et = 0, Ve = null;
  const tt = /* @__PURE__ */ new Set(), gt = /* @__PURE__ */ new Map();
  function fe(k) {
    return String(k || "").trim().toLowerCase();
  }
  function Ee(k) {
    return String(k || "").trim().toLowerCase();
  }
  function Me(k) {
    return fe(k) === "unsupported";
  }
  function nt() {
    !r && pe && pe.value.trim() !== "" && !s.hasResumableState() && s.setTitleSource(o.SERVER_SEED, { syncPending: !1 });
  }
  function A(k) {
    const B = Ze(k, 0);
    D && (D.value = String(B));
  }
  function M() {
    const k = Ze(D?.value || "0", 0);
    if (k > 0) return k;
    const B = String(_?.textContent || "").match(/(\d+)\s+pages?/i);
    if (B) {
      const N = Ze(B[1], 0);
      if (N > 0) return N;
    }
    return 1;
  }
  function O() {
    f && (f.value = ""), $ && ($.textContent = ""), _ && (_.textContent = ""), A(0), s.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), h.setDocument(null, null, null);
  }
  function Q(k = "") {
    const B = "This document cannot be used because its PDF is incompatible with online signing.", N = Ee(k);
    return N ? `${B} Reason: ${N}. Select another document or upload a remediated PDF.` : `${B} Select another document or upload a remediated PDF.`;
  }
  function ie() {
    ke = null, le && (le.textContent = "", le.className = "mt-2 text-xs text-amber-800"), X && X.classList.add("hidden"), oe && (oe.disabled = !1, oe.textContent = "Remediate PDF");
  }
  function ce(k, B = "info") {
    if (!le) return;
    const N = String(k || "").trim();
    le.textContent = N;
    const Y = B === "error" ? "text-red-700" : B === "success" ? "text-green-700" : "text-amber-800";
    le.className = `mt-2 text-xs ${Y}`;
  }
  function J(k, B = "") {
    !k || !X || !ge || (ke = {
      id: String(k.id || "").trim(),
      title: String(k.title || "").trim(),
      pageCount: Ze(k.pageCount, 0),
      compatibilityReason: Ee(B || k.compatibilityReason || "")
    }, ke.id && (ge.textContent = Q(ke.compatibilityReason), ce("Run remediation to make this document signable."), X.classList.remove("hidden")));
  }
  function ye(k) {
    const B = pe;
    if (!B) return;
    const N = s.getState(), Y = B.value.trim(), ne = c(
      N?.titleSource,
      Y === "" ? o.AUTOFILL : o.USER
    );
    if (Y && ne === o.USER)
      return;
    const re = String(k || "").trim();
    re && (B.value = re, s.updateDetails({
      title: re,
      message: s.getState().details.message || ""
    }, { titleSource: o.AUTOFILL }));
  }
  function de(k, B, N) {
    if (!f || !$ || !_ || !L || !S)
      return;
    f.value = String(k || ""), $.textContent = B || "", _.textContent = `${N} pages`, A(N), L.classList.remove("hidden"), S.classList.add("hidden"), E(), ye(B);
    const Y = Ze(N, 0);
    s.updateDocument({
      id: k,
      title: B,
      pageCount: Y
    }), h.setDocument(k, B, Y), ie();
  }
  function K(k) {
    const B = String(k || "").trim();
    if (B === "") return null;
    const N = be.find((re) => String(re.id || "").trim() === B);
    if (N) return N;
    const Y = U.recentDocuments.find((re) => String(re.id || "").trim() === B);
    if (Y) return Y;
    const ne = U.searchResults.find((re) => String(re.id || "").trim() === B);
    return ne || null;
  }
  function Z() {
    const k = K(f?.value || "");
    if (!k) return !0;
    const B = fe(k.compatibilityTier);
    return Me(B) ? (J(k, k.compatibilityReason || ""), O(), v(Q(k.compatibilityReason || "")), L && L.classList.add("hidden"), S && S.classList.remove("hidden"), C?.focus(), !1) : (ie(), !0);
  }
  function we() {
    if (!$ || !_ || !L || !S)
      return;
    const k = (f?.value || "").trim();
    if (!k) return;
    const B = be.find((N) => String(N.id || "").trim() === k);
    B && ($.textContent.trim() || ($.textContent = B.title || "Untitled"), (!_.textContent.trim() || _.textContent.trim() === "pages") && (_.textContent = `${B.pageCount || 0} pages`), A(B.pageCount || 0), L.classList.remove("hidden"), S.classList.add("hidden"));
  }
  async function Ce() {
    try {
      const k = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), B = await fetch(`${e}/panels/esign_documents?${k.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!B.ok)
        throw await g(B, "Failed to load documents");
      const N = await B.json();
      be = (Array.isArray(N?.records) ? N.records : Array.isArray(N?.items) ? N.items : []).slice().sort((re, F) => {
        const ue = Date.parse(String(re?.created_at ?? re?.createdAt ?? re?.updated_at ?? re?.updatedAt ?? "")), Xe = Date.parse(String(F?.created_at ?? F?.createdAt ?? F?.updated_at ?? F?.updatedAt ?? "")), Qe = Number.isFinite(ue) ? ue : 0;
        return (Number.isFinite(Xe) ? Xe : 0) - Qe;
      }).map((re) => vn(re)).filter((re) => re.id !== ""), Ae(be), we();
    } catch (k) {
      const B = Tt(k) ? String(k.message || "Failed to load documents") : "Failed to load documents", N = Tt(k) ? String(k.code || "") : "", Y = Tt(k) ? Number(k.status || 0) : 0, ne = P(B, N, Y);
      H && (H.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${xt(ne)}</div>`);
    }
  }
  function Ae(k) {
    if (!H) return;
    if (k.length === 0) {
      H.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${xt(n)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    H.innerHTML = k.map((N, Y) => {
      const ne = xt(String(N.id || "").trim()), re = xt(String(N.title || "").trim()), F = String(Ze(N.pageCount, 0)), ue = fe(N.compatibilityTier), Xe = Ee(N.compatibilityReason), Qe = xt(ue), Be = xt(Xe), at = Me(ue) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${Y === 0 ? "0" : "-1"}"
                data-document-id="${ne}"
                data-document-title="${re}"
                data-document-pages="${F}"
                data-document-compatibility-tier="${Qe}"
                data-document-compatibility-reason="${Be}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${re}</div>
            <div class="text-xs text-gray-500">${F} pages ${at}</div>
          </div>
        </button>
      `;
    }).join("");
    const B = Array.from(H.querySelectorAll(".document-option"));
    B.forEach((N, Y) => {
      N.addEventListener("click", () => Ue(N)), N.addEventListener("keydown", (ne) => {
        let re = Y;
        if (ne.key === "ArrowDown")
          ne.preventDefault(), re = Math.min(Y + 1, B.length - 1);
        else if (ne.key === "ArrowUp")
          ne.preventDefault(), re = Math.max(Y - 1, 0);
        else if (ne.key === "Enter" || ne.key === " ") {
          ne.preventDefault(), Ue(N);
          return;
        } else ne.key === "Home" ? (ne.preventDefault(), re = 0) : ne.key === "End" && (ne.preventDefault(), re = B.length - 1);
        re !== Y && (B[re].focus(), B[re].setAttribute("tabindex", "0"), N.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Ue(k) {
    const B = k.getAttribute("data-document-id"), N = k.getAttribute("data-document-title"), Y = k.getAttribute("data-document-pages"), ne = fe(k.getAttribute("data-document-compatibility-tier")), re = Ee(k.getAttribute("data-document-compatibility-reason"));
    if (Me(ne)) {
      J({ id: String(B || ""), title: String(N || ""), pageCount: Ze(Y, 0), compatibilityReason: re }), O(), v(Q(re)), C?.focus();
      return;
    }
    de(B, N, Y);
  }
  async function y(k, B, N) {
    const Y = String(k || "").trim();
    if (!Y) return;
    const ne = Date.now(), re = 12e4, F = 1250;
    for (; Date.now() - ne < re; ) {
      const ue = await fetch(Y, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!ue.ok)
        throw await g(ue, "Failed to read remediation status");
      const Qe = (await ue.json())?.dispatch || {}, Be = String(Qe?.status || "").trim().toLowerCase();
      if (Be === "succeeded") {
        ce("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (Be === "failed" || Be === "canceled" || Be === "dead_letter") {
        const at = String(Qe?.terminal_reason || "").trim();
        throw { message: at ? `Remediation failed: ${at}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      ce(Be === "retrying" ? "Remediation is retrying in the queue..." : Be === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((at) => setTimeout(at, F));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${B} (${N})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function b() {
    const k = ke;
    if (!k || !k.id) return;
    const B = String(k.id || "").trim();
    if (!(!B || tt.has(B))) {
      tt.add(B), oe && (oe.disabled = !0, oe.textContent = "Remediating...");
      try {
        let N = gt.get(B) || "";
        N || (N = `esign-remediate-${B}-${Date.now()}`, gt.set(B, N));
        const Y = `${t}/esign/documents/${encodeURIComponent(B)}/remediate`, ne = await fetch(Y, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": N
          }
        });
        if (!ne.ok)
          throw await g(ne, "Failed to trigger remediation");
        const re = await ne.json(), F = re?.receipt || {}, ue = String(F?.dispatch_id || re?.dispatch_id || "").trim(), Xe = String(F?.mode || re?.mode || "").trim().toLowerCase();
        let Qe = String(re?.dispatch_status_url || "").trim();
        !Qe && ue && (Qe = `${t}/esign/dispatches/${encodeURIComponent(ue)}`), Xe === "queued" && ue && Qe && (ce("Remediation queued. Monitoring progress..."), await y(Qe, ue, B)), await Ce();
        const Be = K(B);
        if (!Be || Me(Be.compatibilityTier)) {
          ce("Remediation finished, but this PDF is still incompatible.", "error"), v("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        de(Be.id, Be.title, Be.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : w("Document remediated successfully. You can continue.", "success");
      } catch (N) {
        const Y = Tt(N) ? String(N.message || "Remediation failed").trim() : "Remediation failed", ne = Tt(N) ? String(N.code || "") : "", re = Tt(N) ? Number(N.status || 0) : 0;
        ce(Y, "error"), v(Y, ne, re);
      } finally {
        tt.delete(B), oe && (oe.disabled = !1, oe.textContent = "Remediate PDF");
      }
    }
  }
  function x(k, B) {
    let N = null;
    return (...Y) => {
      N !== null && clearTimeout(N), N = setTimeout(() => {
        k(...Y), N = null;
      }, B);
    };
  }
  async function z() {
    try {
      const k = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Ie)
      }), B = await fetch(`${e}/panels/esign_documents?${k}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!B.ok) {
        console.warn("Failed to load recent documents:", B.status);
        return;
      }
      const N = await B.json(), Y = Array.isArray(N?.records) ? N.records : Array.isArray(N?.items) ? N.items : [];
      U.recentDocuments = Y.map((ne) => vn(ne)).filter((ne) => ne.id !== "").slice(0, Ie);
    } catch (k) {
      console.warn("Error loading recent documents:", k);
    }
  }
  async function j(k) {
    const B = k.trim();
    if (!B) {
      Ve && (Ve.abort(), Ve = null), U.isSearchMode = !1, U.searchResults = [], Le();
      return;
    }
    const N = ++et;
    Ve && Ve.abort(), Ve = new AbortController(), U.isLoading = !0, U.isSearchMode = !0, Le();
    try {
      const Y = new URLSearchParams({
        q: B,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(De)
      }), ne = await fetch(`${e}/panels/esign_documents?${Y}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Ve.signal
      });
      if (N !== et) return;
      if (!ne.ok) {
        console.warn("Failed to search documents:", ne.status), U.searchResults = [], U.isLoading = !1, Le();
        return;
      }
      const re = await ne.json(), F = Array.isArray(re?.records) ? re.records : Array.isArray(re?.items) ? re.items : [];
      U.searchResults = F.map((ue) => vn(ue)).filter((ue) => ue.id !== "").slice(0, De);
    } catch (Y) {
      if (Tt(Y) && Y.name === "AbortError")
        return;
      console.warn("Error searching documents:", Y), U.searchResults = [];
    } finally {
      N === et && (U.isLoading = !1, Le());
    }
  }
  const G = x(j, se);
  function te() {
    Se && (U.isOpen = !0, U.selectedIndex = -1, Se.classList.remove("hidden"), C?.setAttribute("aria-expanded", "true"), H?.classList.add("hidden"), Le());
  }
  function ae() {
    Se && (U.isOpen = !1, U.selectedIndex = -1, Se.classList.add("hidden"), C?.setAttribute("aria-expanded", "false"), H?.classList.remove("hidden"));
  }
  function Fe(k, B, N) {
    k && (k.innerHTML = B.map((Y, ne) => {
      const re = ne, F = U.selectedIndex === re, ue = xt(String(Y.id || "").trim()), Xe = xt(String(Y.title || "").trim()), Qe = String(Ze(Y.pageCount, 0)), Be = fe(Y.compatibilityTier), Rt = Ee(Y.compatibilityReason), at = xt(Be), Ut = xt(Rt), cn = Me(Be) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${F ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${F}"
          tabindex="-1"
          data-document-id="${ue}"
          data-document-title="${Xe}"
          data-document-pages="${Qe}"
          data-document-compatibility-tier="${at}"
          data-document-compatibility-reason="${Ut}"
          data-typeahead-index="${re}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${Xe}</div>
            <div class="text-xs text-gray-500">${Qe} pages ${cn}</div>
          </div>
        </button>
      `;
    }).join(""), k.querySelectorAll(".typeahead-option").forEach((Y) => {
      Y.addEventListener("click", () => Ye(Y));
    }));
  }
  function Le() {
    if (Se) {
      if (U.isLoading) {
        qe?.classList.remove("hidden"), Oe?.classList.add("hidden"), st?.classList.add("hidden"), Ne?.classList.add("hidden"), me?.classList.remove("hidden");
        return;
      }
      qe?.classList.add("hidden"), me?.classList.add("hidden"), U.isSearchMode ? (Oe?.classList.add("hidden"), U.searchResults.length > 0 ? (st?.classList.remove("hidden"), Ne?.classList.add("hidden"), Fe(it, U.searchResults)) : (st?.classList.add("hidden"), Ne?.classList.remove("hidden"))) : (st?.classList.add("hidden"), U.recentDocuments.length > 0 ? (Oe?.classList.remove("hidden"), Ne?.classList.add("hidden"), Fe($e, U.recentDocuments)) : (Oe?.classList.add("hidden"), Ne?.classList.remove("hidden"), Ne && (Ne.textContent = "No recent documents")));
    }
  }
  function Ye(k) {
    const B = k.getAttribute("data-document-id"), N = k.getAttribute("data-document-title"), Y = k.getAttribute("data-document-pages"), ne = fe(k.getAttribute("data-document-compatibility-tier")), re = Ee(k.getAttribute("data-document-compatibility-reason"));
    if (B) {
      if (Me(ne)) {
        J({ id: String(B || ""), title: String(N || ""), pageCount: Ze(Y, 0), compatibilityReason: re }), O(), v(Q(re)), C?.focus();
        return;
      }
      de(B, N, Y), ae(), C && (C.value = ""), U.query = "", U.isSearchMode = !1, U.searchResults = [];
    }
  }
  function He() {
    if (!Se) return;
    const k = Se.querySelector(`[data-typeahead-index="${U.selectedIndex}"]`);
    k && k.scrollIntoView({ block: "nearest" });
  }
  function ct(k) {
    if (!U.isOpen) {
      (k.key === "ArrowDown" || k.key === "Enter") && (k.preventDefault(), te());
      return;
    }
    const B = U.isSearchMode ? U.searchResults : U.recentDocuments, N = B.length - 1;
    switch (k.key) {
      case "ArrowDown":
        k.preventDefault(), U.selectedIndex = Math.min(U.selectedIndex + 1, N), Le(), He();
        break;
      case "ArrowUp":
        k.preventDefault(), U.selectedIndex = Math.max(U.selectedIndex - 1, 0), Le(), He();
        break;
      case "Enter":
        if (k.preventDefault(), U.selectedIndex >= 0 && U.selectedIndex <= N) {
          const Y = B[U.selectedIndex];
          if (Y) {
            const ne = document.createElement("button");
            ne.setAttribute("data-document-id", Y.id), ne.setAttribute("data-document-title", Y.title), ne.setAttribute("data-document-pages", String(Y.pageCount)), ne.setAttribute("data-document-compatibility-tier", String(Y.compatibilityTier || "")), ne.setAttribute("data-document-compatibility-reason", String(Y.compatibilityReason || "")), Ye(ne);
          }
        }
        break;
      case "Escape":
        k.preventDefault(), ae();
        break;
      case "Tab":
        ae();
        break;
      case "Home":
        k.preventDefault(), U.selectedIndex = 0, Le(), He();
        break;
      case "End":
        k.preventDefault(), U.selectedIndex = N, Le(), He();
        break;
    }
  }
  function je() {
    V && V.addEventListener("click", () => {
      L?.classList.add("hidden"), S?.classList.remove("hidden"), ie(), C?.focus(), te();
    }), oe && oe.addEventListener("click", () => {
      b();
    }), he && he.addEventListener("click", () => {
      ie(), C?.focus();
    }), C && (C.addEventListener("input", (k) => {
      const B = k.target;
      if (!(B instanceof HTMLInputElement)) return;
      const N = B.value;
      U.query = N, U.isOpen || te(), N.trim() ? (U.isLoading = !0, Le(), G(N)) : (U.isSearchMode = !1, U.searchResults = [], Le());
      const Y = be.filter(
        (ne) => String(ne.title || "").toLowerCase().includes(N.toLowerCase())
      );
      Ae(Y);
    }), C.addEventListener("focus", () => {
      te();
    }), C.addEventListener("keydown", ct)), document.addEventListener("click", (k) => {
      const B = k.target;
      Re && !(B instanceof Node && Re.contains(B)) && ae();
    });
  }
  return {
    refs: {
      documentIdInput: f,
      selectedDocument: L,
      documentPicker: S,
      documentSearch: C,
      documentList: H,
      selectedDocumentTitle: $,
      selectedDocumentInfo: _,
      documentPageCountInput: D
    },
    bindEvents: je,
    initializeTitleSourceSeed: nt,
    loadDocuments: Ce,
    loadRecentDocuments: z,
    ensureSelectedDocumentCompatibility: Z,
    getCurrentDocumentPageCount: M
  };
}
function bt(i, e) {
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
    const H = L.id || h();
    C.setAttribute("data-participant-id", H);
    const V = bt(C, ".participant-id-input"), $ = bt(C, 'input[name="participants[].name"]'), _ = bt(C, 'input[name="participants[].email"]'), D = bn(C, 'select[name="participants[].role"]'), X = bt(C, 'input[name="participants[].signing_stage"]'), ge = bt(C, 'input[name="participants[].notify"]'), le = C.querySelector(".signing-stage-wrapper");
    if (!V || !$ || !_ || !D) return;
    const oe = s++;
    V.name = `participants[${oe}].id`, V.value = H, $.name = `participants[${oe}].name`, _.name = `participants[${oe}].email`, D.name = `participants[${oe}].role`, X && (X.name = `participants[${oe}].signing_stage`), ge && (ge.name = `participants[${oe}].notify`), L.name && ($.value = L.name), L.email && (_.value = L.email), L.role && (D.value = L.role), X && L.signing_stage && (X.value = String(L.signing_stage)), ge && (ge.checked = L.notify !== !1);
    const he = () => {
      if (!(le instanceof HTMLElement) || !X) return;
      const pe = D.value === "signer";
      le.classList.toggle("hidden", !pe), pe ? X.value || (X.value = "1") : X.value = "";
    };
    he(), C.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      C.remove(), t?.();
    }), D.addEventListener("change", () => {
      he(), t?.();
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
  function w() {
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
  function P() {
    if (!n) return [];
    const L = n.querySelectorAll(".participant-entry"), S = [];
    return L.forEach((C) => {
      const H = C.getAttribute("data-participant-id"), V = bn(C, 'select[name*=".role"]'), $ = bt(C, 'input[name*=".name"]'), _ = bt(C, 'input[name*=".email"]');
      V?.value === "signer" && S.push({
        id: String(H || ""),
        name: $?.value || _?.value || "Signer",
        email: _?.value || ""
      });
    }), S;
  }
  function E() {
    if (!n) return [];
    const L = [];
    return n.querySelectorAll(".participant-entry").forEach((S) => {
      const C = S.getAttribute("data-participant-id"), H = bt(S, 'input[name*=".name"]')?.value || "", V = bt(S, 'input[name*=".email"]')?.value || "", $ = bn(S, 'select[name*=".role"]')?.value || "signer", _ = Number.parseInt(bt(S, ".signing-stage-input")?.value || "1", 10), D = bt(S, ".notify-input")?.checked !== !1;
      L.push({
        tempId: String(C || ""),
        name: H,
        email: V,
        role: $,
        notify: D,
        signingStage: Number.isFinite(_) ? _ : 1
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
    bindEvents: w,
    addParticipant: g,
    getSignerParticipants: P,
    collectParticipantsForState: E,
    restoreFromState: f
  };
}
function es() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function sn() {
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
      placementSource: pt.AUTO_LINKED,
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
function Je(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function dt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function ri(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function _t(i, e) {
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
  } = i, w = wt("field-definitions-container"), P = document.getElementById("field-definition-template"), E = wt("add-field-btn"), f = wt("add-field-btn-container"), L = wt("add-field-definition-empty-btn"), S = wt("field-definitions-empty-state"), C = wt("field-rules-container"), H = document.getElementById("field-rule-template"), V = wt("add-field-rule-btn"), $ = wt("field-rules-empty-state"), _ = wt("field-rules-preview"), D = wt("field_rules_json"), X = wt("field_placements_json");
  let ge = 0, le = 0, oe = 0;
  function he() {
    return `temp_field_${Date.now()}_${ge++}`;
  }
  function pe() {
    return `rule_${Date.now()}_${oe}`;
  }
  function se(A, M) {
    const O = String(A || "").trim();
    return O && M.some((Q) => Q.id === O) ? O : M.length === 1 ? M[0].id : "";
  }
  function Ie(A, M, O = "") {
    if (!A) return;
    const Q = se(O, M);
    A.innerHTML = '<option value="">Select signer...</option>', M.forEach((ie) => {
      const ce = document.createElement("option");
      ce.value = ie.id, ce.textContent = ie.name, A.appendChild(ce);
    }), A.value = Q;
  }
  function De(A = r()) {
    if (!w) return;
    const M = w.querySelectorAll(".field-participant-select"), O = C ? C.querySelectorAll(".field-rule-participant-select") : [];
    M.forEach((Q) => {
      Ie(
        Q instanceof HTMLSelectElement ? Q : null,
        A,
        Q instanceof HTMLSelectElement ? Q.value : ""
      );
    }), O.forEach((Q) => {
      Ie(
        Q instanceof HTMLSelectElement ? Q : null,
        A,
        Q instanceof HTMLSelectElement ? Q.value : ""
      );
    });
  }
  function Re() {
    if (!w || !S) return;
    w.querySelectorAll(".field-definition-entry").length === 0 ? (S.classList.remove("hidden"), f?.classList.add("hidden")) : (S.classList.add("hidden"), f?.classList.remove("hidden"));
  }
  function Se() {
    if (!C || !$) return;
    const A = C.querySelectorAll(".field-rule-entry");
    $.classList.toggle("hidden", A.length > 0);
  }
  function Oe() {
    if (!w) return [];
    const A = [];
    return w.querySelectorAll(".field-definition-entry").forEach((M) => {
      const O = M.getAttribute("data-field-definition-id"), Q = dt(M, ".field-type-select")?.value || "signature", ie = dt(M, ".field-participant-select")?.value || "", ce = Number.parseInt(Je(M, 'input[name*=".page"]')?.value || "1", 10), J = Je(M, 'input[name*=".required"]')?.checked ?? !0;
      A.push({
        tempId: String(O || ""),
        type: Q,
        participantTempId: ie,
        page: Number.isFinite(ce) ? ce : 1,
        required: J
      });
    }), A;
  }
  function $e() {
    if (!C) return [];
    const A = n(), M = C.querySelectorAll(".field-rule-entry"), O = [];
    return M.forEach((Q) => {
      const ie = Qt({
        id: Q.getAttribute("data-field-rule-id") || "",
        type: dt(Q, ".field-rule-type-select")?.value || "",
        participantId: dt(Q, ".field-rule-participant-select")?.value || "",
        fromPage: Je(Q, ".field-rule-from-page-input")?.value || "",
        toPage: Je(Q, ".field-rule-to-page-input")?.value || "",
        page: Je(Q, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Je(Q, ".field-rule-exclude-last-input")?.checked,
        excludePages: rn(Je(Q, ".field-rule-exclude-pages-input")?.value || ""),
        required: (dt(Q, ".field-rule-required-select")?.value || "1") !== "0"
      }, A);
      ie.type && O.push(ie);
    }), O;
  }
  function st() {
    return $e().map((A) => ({
      id: A.id,
      type: A.type,
      participant_id: A.participantId,
      from_page: A.fromPage,
      to_page: A.toPage,
      page: A.page,
      exclude_last_page: A.excludeLastPage,
      exclude_pages: A.excludePages,
      required: A.required
    }));
  }
  function it(A, M) {
    return Jr(A, M);
  }
  function Ne() {
    if (!_) return;
    const A = $e(), M = n(), O = it(A, M), Q = r(), ie = new Map(Q.map((de) => [String(de.id), de.name]));
    if (D && (D.value = JSON.stringify(st())), !O.length) {
      _.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const ce = O.reduce((de, K) => {
      const Z = K.type;
      return de[Z] = (de[Z] || 0) + 1, de;
    }, {}), J = O.slice(0, 8).map((de) => {
      const K = ie.get(String(de.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${de.type === "initials" ? "Initials" : "Signature"} on page ${de.page}</span><span class="text-gray-500">${o(String(K))}</span></li>`;
    }).join(""), ye = O.length - 8;
    _.innerHTML = `
      <p class="text-gray-700">${O.length} generated field${O.length !== 1 ? "s" : ""} (${ce.initials || 0} initials, ${ce.signature || 0} signatures)</p>
      <ul class="space-y-1">${J}</ul>
      ${ye > 0 ? `<p class="text-gray-500">+${ye} more</p>` : ""}
    `;
  }
  function qe() {
    const A = r();
    De(A), Ne();
  }
  function me(A) {
    const M = dt(A, ".field-rule-type-select"), O = _t(A, ".field-rule-range-start-wrap"), Q = _t(A, ".field-rule-range-end-wrap"), ie = _t(A, ".field-rule-page-wrap"), ce = _t(A, ".field-rule-exclude-last-wrap"), J = _t(A, ".field-rule-exclude-pages-wrap"), ye = _t(A, ".field-rule-summary"), de = Je(A, ".field-rule-from-page-input"), K = Je(A, ".field-rule-to-page-input"), Z = Je(A, ".field-rule-page-input"), we = Je(A, ".field-rule-exclude-last-input"), Ce = Je(A, ".field-rule-exclude-pages-input");
    if (!M || !O || !Q || !ie || !ce || !J || !ye)
      return;
    const Ae = n(), Ue = Qt({
      type: M?.value || "",
      fromPage: de?.value || "",
      toPage: K?.value || "",
      page: Z?.value || "",
      excludeLastPage: !!we?.checked,
      excludePages: rn(Ce?.value || ""),
      required: !0
    }, Ae), y = Ue.fromPage > 0 ? Ue.fromPage : 1, b = Ue.toPage > 0 ? Ue.toPage : Ae, x = Ue.page > 0 ? Ue.page : Ue.toPage > 0 ? Ue.toPage : Ae, z = Ue.excludeLastPage, j = Ue.excludePages.join(","), G = M?.value === "initials_each_page";
    if (O.classList.toggle("hidden", !G), Q.classList.toggle("hidden", !G), ce.classList.toggle("hidden", !G), J.classList.toggle("hidden", !G), ie.classList.toggle("hidden", G), de && (de.value = String(y)), K && (K.value = String(b)), Z && (Z.value = String(x)), Ce && (Ce.value = j), we && (we.checked = z), G) {
      const te = Yr(
        y,
        b,
        Ae,
        z,
        Ue.excludePages
      ), ae = Kr(te);
      ye.textContent = te.isEmpty ? `Warning: No initials fields will be generated ${ae}.` : `Generates initials fields on ${ae}.`;
    } else
      ye.textContent = `Generates one signature field on page ${x}.`;
  }
  function U(A = {}) {
    if (!(H instanceof HTMLTemplateElement) || !C) return;
    const M = H.content.cloneNode(!0), O = M.querySelector(".field-rule-entry");
    if (!(O instanceof HTMLElement)) return;
    const Q = A.id || pe(), ie = oe++, ce = n();
    O.setAttribute("data-field-rule-id", Q);
    const J = Je(O, ".field-rule-id-input"), ye = dt(O, ".field-rule-type-select"), de = dt(O, ".field-rule-participant-select"), K = Je(O, ".field-rule-from-page-input"), Z = Je(O, ".field-rule-to-page-input"), we = Je(O, ".field-rule-page-input"), Ce = dt(O, ".field-rule-required-select"), Ae = Je(O, ".field-rule-exclude-last-input"), Ue = Je(O, ".field-rule-exclude-pages-input"), y = ri(O, ".remove-field-rule-btn");
    if (!J || !ye || !de || !K || !Z || !we || !Ce || !Ae || !Ue || !y)
      return;
    J.name = `field_rules[${ie}].id`, J.value = Q, ye.name = `field_rules[${ie}].type`, de.name = `field_rules[${ie}].participant_id`, K.name = `field_rules[${ie}].from_page`, Z.name = `field_rules[${ie}].to_page`, we.name = `field_rules[${ie}].page`, Ce.name = `field_rules[${ie}].required`, Ae.name = `field_rules[${ie}].exclude_last_page`, Ue.name = `field_rules[${ie}].exclude_pages`;
    const b = Qt(A, ce);
    ye.value = b.type || "initials_each_page", Ie(de, r(), b.participantId), K.value = String(b.fromPage > 0 ? b.fromPage : 1), Z.value = String(b.toPage > 0 ? b.toPage : ce), we.value = String(b.page > 0 ? b.page : ce), Ce.value = b.required ? "1" : "0", Ae.checked = b.excludeLastPage, Ue.value = b.excludePages.join(",");
    const x = () => {
      me(O), Ne(), s?.();
    }, z = () => {
      const G = n();
      if (K) {
        const te = parseInt(K.value, 10);
        Number.isFinite(te) && (K.value = String(zt(te, G, 1)));
      }
      if (Z) {
        const te = parseInt(Z.value, 10);
        Number.isFinite(te) && (Z.value = String(zt(te, G, 1)));
      }
      if (we) {
        const te = parseInt(we.value, 10);
        Number.isFinite(te) && (we.value = String(zt(te, G, 1)));
      }
    }, j = () => {
      z(), x();
    };
    ye.addEventListener("change", x), de.addEventListener("change", x), K.addEventListener("input", j), K.addEventListener("change", j), Z.addEventListener("input", j), Z.addEventListener("change", j), we.addEventListener("input", j), we.addEventListener("change", j), Ce.addEventListener("change", x), Ae.addEventListener("change", () => {
      const G = n();
      Z.value = String(Ae.checked ? Math.max(1, G - 1) : G), x();
    }), Ue.addEventListener("input", x), y.addEventListener("click", () => {
      O.remove(), Se(), Ne(), s?.();
    }), C.appendChild(M), me(C.lastElementChild || O), Se(), Ne();
  }
  function be(A = {}) {
    if (!(P instanceof HTMLTemplateElement) || !w) return;
    const M = P.content.cloneNode(!0), O = M.querySelector(".field-definition-entry");
    if (!(O instanceof HTMLElement)) return;
    const Q = String(A.id || he()).trim() || he();
    O.setAttribute("data-field-definition-id", Q);
    const ie = Je(O, ".field-definition-id-input"), ce = dt(O, 'select[name="field_definitions[].type"]'), J = dt(O, 'select[name="field_definitions[].participant_id"]'), ye = Je(O, 'input[name="field_definitions[].page"]'), de = Je(O, 'input[name="field_definitions[].required"]'), K = _t(O, ".field-date-signed-info");
    if (!ie || !ce || !J || !ye || !de || !K) return;
    const Z = le++;
    ie.name = `field_instances[${Z}].id`, ie.value = Q, ce.name = `field_instances[${Z}].type`, J.name = `field_instances[${Z}].participant_id`, ye.name = `field_instances[${Z}].page`, de.name = `field_instances[${Z}].required`, A.type && (ce.value = String(A.type)), A.page !== void 0 && (ye.value = String(zt(A.page, n(), 1))), A.required !== void 0 && (de.checked = !!A.required);
    const we = String(A.participant_id || A.participantId || "").trim();
    Ie(J, r(), we), ce.addEventListener("change", () => {
      ce.value === "date_signed" ? K.classList.remove("hidden") : K.classList.add("hidden");
    }), ce.value === "date_signed" && K.classList.remove("hidden"), ri(O, ".remove-field-definition-btn")?.addEventListener("click", () => {
      O.remove(), Re(), c?.();
    });
    const Ce = Je(O, 'input[name*=".page"]'), Ae = () => {
      Ce && (Ce.value = String(zt(Ce.value, n(), 1)));
    };
    Ae(), Ce?.addEventListener("input", Ae), Ce?.addEventListener("change", Ae), w.appendChild(M), Re();
  }
  function ke() {
    E?.addEventListener("click", () => be()), L?.addEventListener("click", () => be()), V?.addEventListener("click", () => U({ to_page: n() })), h?.();
  }
  function et() {
    const A = [];
    window._initialFieldPlacementsData = A, e.forEach((M) => {
      const O = String(M.id || "").trim();
      if (!O) return;
      const Q = String(M.type || "signature").trim() || "signature", ie = String(M.participant_id || M.participantId || "").trim(), ce = Number(M.page || 1) || 1, J = !!M.required;
      be({
        id: O,
        type: Q,
        participant_id: ie,
        page: ce,
        required: J
      }), A.push(qt({
        id: O,
        definitionId: O,
        type: Q,
        participantId: ie,
        participantName: String(M.participant_name || M.participantName || "").trim(),
        page: ce,
        x: Number(M.x || M.pos_x || 0) || 0,
        y: Number(M.y || M.pos_y || 0) || 0,
        width: Number(M.width || 150) || 150,
        height: Number(M.height || 32) || 32,
        placementSource: String(M.placement_source || M.placementSource || t.MANUAL).trim() || t.MANUAL
      }, A.length));
    }), Re(), qe(), Se(), Ne();
  }
  function Ve() {
    const A = window._initialFieldPlacementsData;
    return Array.isArray(A) ? A.map((M, O) => qt(M, O)) : [];
  }
  function tt() {
    if (!w) return [];
    const A = r(), M = new Map(A.map((K) => [String(K.id), K.name || K.email || "Signer"])), O = [];
    w.querySelectorAll(".field-definition-entry").forEach((K) => {
      const Z = String(K.getAttribute("data-field-definition-id") || "").trim(), we = dt(K, ".field-type-select"), Ce = dt(K, ".field-participant-select"), Ae = Je(K, 'input[name*=".page"]'), Ue = String(we?.value || "text").trim() || "text", y = String(Ce?.value || "").trim(), b = parseInt(String(Ae?.value || "1"), 10) || 1;
      O.push({
        definitionId: Z,
        fieldType: Ue,
        participantId: y,
        participantName: M.get(y) || "Unassigned",
        page: b
      });
    });
    const ie = it($e(), n()), ce = /* @__PURE__ */ new Map();
    ie.forEach((K) => {
      const Z = String(K.ruleId || "").trim(), we = String(K.id || "").trim();
      if (Z && we) {
        const Ce = ce.get(Z) || [];
        Ce.push(we), ce.set(Z, Ce);
      }
    });
    let J = g();
    ce.forEach((K, Z) => {
      if (K.length > 1 && !J.groups.get(`rule_${Z}`)) {
        const Ce = ts(K, `Rule ${Z}`);
        Ce.id = `rule_${Z}`, J = Ii(J, Ce);
      }
    }), v(J), ie.forEach((K) => {
      const Z = String(K.id || "").trim();
      if (!Z) return;
      const we = String(K.participantId || "").trim(), Ce = parseInt(String(K.page || "1"), 10) || 1, Ae = String(K.ruleId || "").trim();
      O.push({
        definitionId: Z,
        fieldType: String(K.type || "text").trim() || "text",
        participantId: we,
        participantName: M.get(we) || "Unassigned",
        page: Ce,
        linkGroupId: Ae ? `rule_${Ae}` : void 0
      });
    });
    const ye = /* @__PURE__ */ new Set(), de = O.filter((K) => {
      const Z = String(K.definitionId || "").trim();
      return !Z || ye.has(Z) ? !1 : (ye.add(Z), !0);
    });
    return de.sort((K, Z) => K.page !== Z.page ? K.page - Z.page : K.definitionId.localeCompare(Z.definitionId)), de;
  }
  function gt(A) {
    const M = String(A || "").trim();
    if (!M) return null;
    const Q = tt().find((ie) => String(ie.definitionId || "").trim() === M);
    return Q ? {
      id: M,
      type: String(Q.fieldType || "text").trim() || "text",
      participant_id: String(Q.participantId || "").trim(),
      participant_name: String(Q.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(Q.page || "1"), 10) || 1,
      link_group_id: String(Q.linkGroupId || "").trim()
    } : null;
  }
  function fe() {
    if (!w) return [];
    const A = r(), M = /* @__PURE__ */ new Map();
    return A.forEach((ie) => M.set(ie.id, !1)), w.querySelectorAll(".field-definition-entry").forEach((ie) => {
      const ce = dt(ie, ".field-type-select"), J = dt(ie, ".field-participant-select"), ye = Je(ie, 'input[name*=".required"]');
      ce?.value === "signature" && J?.value && ye?.checked && M.set(J.value, !0);
    }), it($e(), n()).forEach((ie) => {
      ie.type === "signature" && ie.participantId && ie.required && M.set(ie.participantId, !0);
    }), A.filter((ie) => !M.get(ie.id));
  }
  function Ee(A) {
    if (!Array.isArray(A) || A.length === 0)
      return "Each signer requires at least one required signature field.";
    const M = A.map((O) => O?.name?.trim()).filter(Boolean);
    return M.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${M.join(", ")}`;
  }
  function Me(A) {
    !w || !A?.fieldDefinitions || A.fieldDefinitions.length === 0 || (w.innerHTML = "", le = 0, A.fieldDefinitions.forEach((M) => {
      be({
        id: M.tempId,
        type: M.type,
        participant_id: M.participantTempId,
        page: M.page,
        required: M.required
      });
    }), Re());
  }
  function nt(A) {
    !Array.isArray(A?.fieldRules) || A.fieldRules.length === 0 || C && (C.querySelectorAll(".field-rule-entry").forEach((M) => M.remove()), oe = 0, A.fieldRules.forEach((M) => {
      U({
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
    }), Se(), Ne());
  }
  return {
    refs: {
      fieldDefinitionsContainer: w,
      fieldRulesContainer: C,
      addFieldBtn: E,
      fieldPlacementsJSONInput: X,
      fieldRulesJSONInput: D
    },
    bindEvents: ke,
    initialize: et,
    buildInitialPlacementInstances: Ve,
    collectFieldDefinitionsForState: Oe,
    collectFieldRulesForState: $e,
    collectFieldRulesForForm: st,
    expandRulesForPreview: it,
    renderFieldRulePreview: Ne,
    updateFieldParticipantOptions: qe,
    collectPlacementFieldDefinitions: tt,
    getFieldDefinitionById: gt,
    findSignersMissingRequiredSignatureField: fe,
    missingSignatureFieldMessage: Ee,
    restoreFieldDefinitionsFromState: Me,
    restoreFieldRulesFromState: nt
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
}, Jt = {
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
    showToast: w,
    escapeHtml: P,
    onPlacementsChanged: E
  } = i, f = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(o) ? o.map((y, b) => qt(y, b)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: c || sn()
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
  function H() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function V(y, b) {
    return y.querySelector(b);
  }
  function $(y, b) {
    return y.querySelector(b);
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
  function D() {
    return f;
  }
  function X() {
    return f.linkGroupState;
  }
  function ge(y) {
    f.linkGroupState = y || sn();
  }
  function le() {
    return f.fieldInstances.map((y, b) => Xr(y, b));
  }
  function oe(y = {}) {
    const { silent: b = !1 } = y, x = _();
    x.fieldInstancesContainer && (x.fieldInstancesContainer.innerHTML = "");
    const z = le();
    return r && (r.value = JSON.stringify(z)), b || E?.(), z;
  }
  function he() {
    const y = _(), b = Array.from(document.querySelectorAll(".placement-field-item")), x = b.length, z = new Set(
      b.map((ae) => String(ae.dataset.definitionId || "").trim()).filter((ae) => ae)
    ), j = /* @__PURE__ */ new Set();
    f.fieldInstances.forEach((ae) => {
      const Fe = String(ae.definitionId || "").trim();
      z.has(Fe) && j.add(Fe);
    });
    const G = j.size, te = Math.max(0, x - G);
    y.totalFields && (y.totalFields.textContent = String(x)), y.placedCount && (y.placedCount.textContent = String(G)), y.unplacedCount && (y.unplacedCount.textContent = String(te));
  }
  function pe(y, b = !1) {
    const x = C(y);
    if (!x) return;
    x.classList.add("opacity-50"), x.draggable = !1;
    const z = x.querySelector(".placement-status");
    z && (z.textContent = "Placed", z.classList.remove("text-amber-600"), z.classList.add("text-green-600")), b && x.classList.add("just-linked");
  }
  function se(y) {
    const b = C(y);
    if (!b) return;
    b.classList.remove("opacity-50"), b.draggable = !0;
    const x = b.querySelector(".placement-status");
    x && (x.textContent = "Not placed", x.classList.remove("text-green-600"), x.classList.add("text-amber-600"));
  }
  function Ie() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((b) => {
      b.classList.add("linked-flash"), setTimeout(() => {
        b.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function De(y) {
    const b = y === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${y} linked fields`;
    window.toastManager?.info?.(b);
    const x = document.createElement("div");
    x.setAttribute("role", "status"), x.setAttribute("aria-live", "polite"), x.className = "sr-only", x.textContent = b, document.body.appendChild(x), setTimeout(() => x.remove(), 1e3), Ie();
  }
  function Re(y, b) {
    const x = document.createElement("div");
    x.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", x.dataset.definitionId = y, x.dataset.isLinked = String(b), x.title = b ? "Click to unlink this field" : "Click to re-link this field", x.setAttribute("role", "button"), x.setAttribute("aria-label", b ? "Unlink field from group" : "Re-link field to group"), x.setAttribute("tabindex", "0"), b ? x.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : x.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const z = () => Ne(y, b);
    return x.addEventListener("click", z), x.addEventListener("keydown", (j) => {
      (j.key === "Enter" || j.key === " ") && (j.preventDefault(), z());
    }), x;
  }
  function Se() {
    const y = _();
    if (y.linkAllBtn && (y.linkAllBtn.disabled = f.linkGroupState.unlinkedDefinitions.size === 0), y.unlinkAllBtn) {
      let b = !1;
      for (const x of f.linkGroupState.definitionToGroup.keys())
        if (!f.linkGroupState.unlinkedDefinitions.has(x)) {
          b = !0;
          break;
        }
      y.unlinkAllBtn.disabled = !b;
    }
  }
  function Oe() {
    const y = _();
    y.linkAllBtn && !y.linkAllBtn.dataset.bound && (y.linkAllBtn.dataset.bound = "true", y.linkAllBtn.addEventListener("click", () => {
      const b = f.linkGroupState.unlinkedDefinitions.size;
      if (b !== 0) {
        for (const x of f.linkGroupState.unlinkedDefinitions)
          f.linkGroupState = ii(f.linkGroupState, x);
        window.toastManager && window.toastManager.success(`Re-linked ${b} field${b > 1 ? "s" : ""}`), it();
      }
    })), y.unlinkAllBtn && !y.unlinkAllBtn.dataset.bound && (y.unlinkAllBtn.dataset.bound = "true", y.unlinkAllBtn.addEventListener("click", () => {
      let b = 0;
      for (const x of f.linkGroupState.definitionToGroup.keys())
        f.linkGroupState.unlinkedDefinitions.has(x) || (f.linkGroupState = ni(f.linkGroupState, x), b += 1);
      b > 0 && window.toastManager && window.toastManager.success(`Unlinked ${b} field${b > 1 ? "s" : ""}`), it();
    })), Se();
  }
  function $e() {
    return s().map((b) => {
      const x = String(b.definitionId || "").trim(), z = f.linkGroupState.definitionToGroup.get(x) || "", j = f.linkGroupState.unlinkedDefinitions.has(x);
      return { ...b, definitionId: x, linkGroupId: z, isUnlinked: j };
    });
  }
  function st() {
    const y = _();
    if (!y.fieldsList) return;
    y.fieldsList.innerHTML = "";
    const b = $e();
    y.linkBatchActions && y.linkBatchActions.classList.toggle("hidden", f.linkGroupState.groups.size === 0), b.forEach((x, z) => {
      const j = x.definitionId, G = String(x.fieldType || "text").trim() || "text", te = String(x.participantId || "").trim(), ae = String(x.participantName || "Unassigned").trim() || "Unassigned", Fe = Number.parseInt(String(x.page || "1"), 10) || 1, Le = x.linkGroupId, Ye = x.isUnlinked;
      if (!j) return;
      f.fieldInstances.forEach((F) => {
        F.definitionId === j && (F.type = G, F.participantId = te, F.participantName = ae);
      });
      const He = Ft[G] || Ft.text, ct = f.fieldInstances.some((F) => F.definitionId === j), je = document.createElement("div");
      je.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${ct ? "opacity-50" : ""}`, je.draggable = !ct, je.dataset.definitionId = j, je.dataset.fieldType = G, je.dataset.participantId = te, je.dataset.participantName = ae, je.dataset.page = String(Fe), Le && (je.dataset.linkGroupId = Le);
      const k = document.createElement("span");
      k.className = `w-3 h-3 rounded ${He.bg}`;
      const B = document.createElement("div");
      B.className = "flex-1 text-xs";
      const N = document.createElement("div");
      N.className = "font-medium capitalize", N.textContent = G.replace(/_/g, " ");
      const Y = document.createElement("div");
      Y.className = "text-gray-500", Y.textContent = ae;
      const ne = document.createElement("span");
      ne.className = `placement-status text-xs ${ct ? "text-green-600" : "text-amber-600"}`, ne.textContent = ct ? "Placed" : "Not placed", B.appendChild(N), B.appendChild(Y), je.appendChild(k), je.appendChild(B), je.appendChild(ne), je.addEventListener("dragstart", (F) => {
        if (ct) {
          F.preventDefault();
          return;
        }
        F.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: j,
          fieldType: G,
          participantId: te,
          participantName: ae
        })), F.dataTransfer && (F.dataTransfer.effectAllowed = "copy"), je.classList.add("opacity-50");
      }), je.addEventListener("dragend", () => {
        je.classList.remove("opacity-50");
      }), y.fieldsList?.appendChild(je);
      const re = b[z + 1];
      Le && re && re.linkGroupId === Le && y.fieldsList?.appendChild(Re(j, !Ye));
    }), Oe(), he();
  }
  function it() {
    st();
  }
  function Ne(y, b) {
    b ? (f.linkGroupState = ni(f.linkGroupState, y), window.toastManager?.info?.("Field unlinked")) : (f.linkGroupState = ii(f.linkGroupState, y), window.toastManager?.info?.("Field re-linked")), it();
  }
  async function qe(y) {
    const b = f.pdfDoc;
    if (!b) return;
    const x = _();
    if (!x.canvas || !x.canvasContainer) return;
    const z = x.canvas.getContext("2d"), j = await b.getPage(y), G = j.getViewport({ scale: f.scale });
    x.canvas.width = G.width, x.canvas.height = G.height, x.canvasContainer.style.width = `${G.width}px`, x.canvasContainer.style.height = `${G.height}px`, await j.render({
      canvasContext: z,
      viewport: G
    }).promise, x.currentPage && (x.currentPage.textContent = String(y)), ke();
  }
  function me(y) {
    const b = ns(f.linkGroupState, y);
    b && (f.linkGroupState = Ii(f.linkGroupState, b.updatedGroup));
  }
  function U(y) {
    const b = /* @__PURE__ */ new Map();
    s().forEach((z) => {
      const j = String(z.definitionId || "").trim();
      j && b.set(j, {
        type: String(z.fieldType || "text").trim() || "text",
        participantId: String(z.participantId || "").trim(),
        participantName: String(z.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(z.page || "1"), 10) || 1,
        linkGroupId: f.linkGroupState.definitionToGroup.get(j)
      });
    });
    let x = 0;
    for (; x < 10; ) {
      const z = is(
        f.linkGroupState,
        y,
        f.fieldInstances,
        b
      );
      if (!z || !z.newPlacement) break;
      f.fieldInstances.push(z.newPlacement), pe(z.newPlacement.definitionId, !0), x += 1;
    }
    x > 0 && (ke(), he(), oe(), De(x));
  }
  function be(y) {
    me(y);
  }
  function ke() {
    const b = _().overlays;
    b && (b.innerHTML = "", b.style.pointerEvents = "auto", f.fieldInstances.filter((x) => x.page === f.currentPage).forEach((x) => {
      const z = Ft[x.type] || Ft.text, j = f.selectedFieldId === x.id, G = x.placementSource === pt.AUTO_LINKED, te = document.createElement("div"), ae = G ? "border-dashed" : "border-solid";
      te.className = `field-overlay absolute cursor-move ${z.border} border-2 ${ae} rounded`, te.style.cssText = `
          left: ${x.x * f.scale}px;
          top: ${x.y * f.scale}px;
          width: ${x.width * f.scale}px;
          height: ${x.height * f.scale}px;
          background-color: ${z.fill};
          ${j ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, te.dataset.instanceId = x.id;
      const Fe = document.createElement("div");
      if (Fe.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${z.bg}`, Fe.textContent = `${x.type.replace("_", " ")} - ${x.participantName}`, te.appendChild(Fe), G) {
        const He = document.createElement("div");
        He.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", He.title = "Auto-linked from template", He.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, te.appendChild(He);
      }
      const Le = document.createElement("div");
      Le.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Le.style.cssText = "transform: translate(50%, 50%);", te.appendChild(Le);
      const Ye = document.createElement("button");
      Ye.type = "button", Ye.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", Ye.innerHTML = "×", Ye.addEventListener("click", (He) => {
        He.stopPropagation(), fe(x.id);
      }), te.appendChild(Ye), te.addEventListener("mousedown", (He) => {
        He.target === Le ? gt(He, x) : He.target !== Ye && tt(He, x, te);
      }), te.addEventListener("click", () => {
        f.selectedFieldId = x.id, ke();
      }), b.appendChild(te);
    }));
  }
  function et(y, b, x, z = {}) {
    const j = Jt[y.fieldType] || Jt.text, G = z.placementSource || pt.MANUAL, te = z.linkGroupId || Ei(f.linkGroupState, y.definitionId)?.id, ae = {
      id: S("fi"),
      definitionId: y.definitionId,
      type: y.fieldType,
      participantId: y.participantId,
      participantName: y.participantName,
      page: f.currentPage,
      x: Math.max(0, b - j.width / 2),
      y: Math.max(0, x - j.height / 2),
      width: j.width,
      height: j.height,
      placementSource: G,
      linkGroupId: te,
      linkedFromFieldId: z.linkedFromFieldId
    };
    f.fieldInstances.push(ae), pe(y.definitionId), G === pt.MANUAL && te && be(ae), ke(), he(), oe();
  }
  function Ve(y, b) {
    const x = {
      id: S("instance"),
      definitionId: y.definitionId,
      type: y.fieldType,
      participantId: y.participantId,
      participantName: y.participantName,
      page: b.page_number,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      placementSource: pt.AUTO,
      resolverId: b.resolver_id,
      confidence: b.confidence,
      placementRunId: L.currentRunId
    };
    f.fieldInstances.push(x), pe(y.definitionId), ke(), he(), oe();
  }
  function tt(y, b, x) {
    y.preventDefault(), f.isDragging = !0, f.selectedFieldId = b.id;
    const z = y.clientX, j = y.clientY, G = b.x * f.scale, te = b.y * f.scale;
    function ae(Le) {
      const Ye = Le.clientX - z, He = Le.clientY - j;
      b.x = Math.max(0, (G + Ye) / f.scale), b.y = Math.max(0, (te + He) / f.scale), b.placementSource = pt.MANUAL, x.style.left = `${b.x * f.scale}px`, x.style.top = `${b.y * f.scale}px`;
    }
    function Fe() {
      f.isDragging = !1, document.removeEventListener("mousemove", ae), document.removeEventListener("mouseup", Fe), oe();
    }
    document.addEventListener("mousemove", ae), document.addEventListener("mouseup", Fe);
  }
  function gt(y, b) {
    y.preventDefault(), y.stopPropagation(), f.isResizing = !0;
    const x = y.clientX, z = y.clientY, j = b.width, G = b.height;
    function te(Fe) {
      const Le = (Fe.clientX - x) / f.scale, Ye = (Fe.clientY - z) / f.scale;
      b.width = Math.max(30, j + Le), b.height = Math.max(20, G + Ye), b.placementSource = pt.MANUAL, ke();
    }
    function ae() {
      f.isResizing = !1, document.removeEventListener("mousemove", te), document.removeEventListener("mouseup", ae), oe();
    }
    document.addEventListener("mousemove", te), document.addEventListener("mouseup", ae);
  }
  function fe(y) {
    const b = f.fieldInstances.find((x) => x.id === y);
    b && (f.fieldInstances = f.fieldInstances.filter((x) => x.id !== y), se(b.definitionId), ke(), he(), oe());
  }
  function Ee(y, b) {
    const z = _().canvas;
    !y || !z || (y.addEventListener("dragover", (j) => {
      j.preventDefault(), j.dataTransfer && (j.dataTransfer.dropEffect = "copy"), z.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), y.addEventListener("dragleave", () => {
      z.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), y.addEventListener("drop", (j) => {
      j.preventDefault(), z.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const G = j.dataTransfer?.getData("application/json") || "";
      if (!G) return;
      const te = JSON.parse(G), ae = z.getBoundingClientRect(), Fe = (j.clientX - ae.left) / f.scale, Le = (j.clientY - ae.top) / f.scale;
      et(te, Fe, Le);
    }));
  }
  function Me() {
    const y = _();
    y.prevBtn?.addEventListener("click", async () => {
      f.currentPage > 1 && (f.currentPage -= 1, U(f.currentPage), await qe(f.currentPage));
    }), y.nextBtn?.addEventListener("click", async () => {
      f.currentPage < f.totalPages && (f.currentPage += 1, U(f.currentPage), await qe(f.currentPage));
    });
  }
  function nt() {
    const y = _();
    y.zoomIn?.addEventListener("click", async () => {
      f.scale = Math.min(3, f.scale + 0.25), y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await qe(f.currentPage);
    }), y.zoomOut?.addEventListener("click", async () => {
      f.scale = Math.max(0.5, f.scale - 0.25), y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await qe(f.currentPage);
    }), y.zoomFit?.addEventListener("click", async () => {
      if (!f.pdfDoc || !y.viewer) return;
      const x = (await f.pdfDoc.getPage(f.currentPage)).getViewport({ scale: 1 });
      f.scale = (y.viewer.clientWidth - 40) / x.width, y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await qe(f.currentPage);
    });
  }
  function A() {
    return _().policyPreset?.value || "balanced";
  }
  function M(y) {
    return y >= 0.8 ? "bg-green-100 text-green-800" : y >= 0.6 ? "bg-blue-100 text-blue-800" : y >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function O(y) {
    return y >= 0.9 ? "bg-green-100 text-green-800" : y >= 0.7 ? "bg-blue-100 text-blue-800" : y >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Q(y) {
    return y ? y.split("_").map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(" ") : "Unknown";
  }
  function ie(y) {
    y.page_number !== f.currentPage && (f.currentPage = y.page_number, qe(y.page_number));
    const b = _().overlays;
    if (!b) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const x = document.createElement("div");
    x.id = "suggestion-preview-overlay", x.className = "absolute pointer-events-none animate-pulse", x.style.cssText = `
      left: ${y.x * f.scale}px;
      top: ${y.y * f.scale}px;
      width: ${y.width * f.scale}px;
      height: ${y.height * f.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, b.appendChild(x), setTimeout(() => x.remove(), 3e3);
  }
  async function ce(y, b) {
  }
  function J() {
    const y = document.getElementById("placement-suggestions-modal");
    if (!y) return;
    const b = y.querySelectorAll('.suggestion-item[data-accepted="true"]');
    b.forEach((x) => {
      const z = Number.parseInt(x.dataset.index || "", 10), j = L.suggestions[z];
      if (!j) return;
      const G = h(j.field_definition_id);
      if (!G) return;
      const te = C(j.field_definition_id);
      if (!te || te.classList.contains("opacity-50")) return;
      const ae = {
        definitionId: j.field_definition_id,
        fieldType: G.type,
        participantId: G.participant_id,
        participantName: te.dataset.participantName || G.participant_name || "Unassigned"
      };
      f.currentPage = j.page_number, Ve(ae, j);
    }), f.pdfDoc && qe(f.currentPage), ce(b.length, L.suggestions.length - b.length), w(`Applied ${b.length} placement${b.length !== 1 ? "s" : ""}`, "success");
  }
  function ye(y) {
    y.querySelectorAll(".accept-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const x = b.closest(".suggestion-item");
        x && (x.classList.add("border-green-500", "bg-green-50"), x.classList.remove("border-red-500", "bg-red-50"), x.dataset.accepted = "true");
      });
    }), y.querySelectorAll(".reject-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const x = b.closest(".suggestion-item");
        x && (x.classList.add("border-red-500", "bg-red-50"), x.classList.remove("border-green-500", "bg-green-50"), x.dataset.accepted = "false");
      });
    }), y.querySelectorAll(".preview-suggestion-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const x = Number.parseInt(b.dataset.index || "", 10), z = L.suggestions[x];
        z && ie(z);
      });
    });
  }
  function de() {
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
    `, V(y, "#close-suggestions-modal")?.addEventListener("click", () => {
      y.classList.add("hidden");
    }), y.addEventListener("click", (b) => {
      b.target === y && y.classList.add("hidden");
    }), V(y, "#accept-all-btn")?.addEventListener("click", () => {
      y.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-green-500", "bg-green-50"), b.classList.remove("border-red-500", "bg-red-50"), b.dataset.accepted = "true";
      });
    }), V(y, "#reject-all-btn")?.addEventListener("click", () => {
      y.querySelectorAll(".suggestion-item").forEach((b) => {
        b.classList.add("border-red-500", "bg-red-50"), b.classList.remove("border-green-500", "bg-green-50"), b.dataset.accepted = "false";
      });
    }), V(y, "#apply-suggestions-btn")?.addEventListener("click", () => {
      J(), y.classList.add("hidden");
    }), V(y, "#rerun-placement-btn")?.addEventListener("click", () => {
      y.classList.add("hidden");
      const b = $(y, "#placement-policy-preset-modal"), x = _().policyPreset;
      x && b && (x.value = b.value), _().autoPlaceBtn?.click();
    }), y;
  }
  function K(y) {
    let b = document.getElementById("placement-suggestions-modal");
    b || (b = de(), document.body.appendChild(b));
    const x = $(b, "#suggestions-list"), z = $(b, "#resolver-info"), j = $(b, "#run-stats");
    !x || !z || !j || (z.innerHTML = L.resolverScores.map((G) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${P(String(G?.resolver_id || "").replace(/_/g, " "))}</span>
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
        <span>Run: <code class="bg-gray-100 px-1 rounded">${P(String(y?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${y.status === "completed" ? "text-green-600" : "text-amber-600"}">${P(String(y?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(y?.elapsed_ms || 0))}ms</span>
      </div>
    `, x.innerHTML = L.suggestions.map((G, te) => {
      const ae = h(G.field_definition_id), Fe = Ft[ae?.type || "text"] || Ft.text, Le = P(String(ae?.type || "field").replace(/_/g, " ")), Ye = P(String(G?.id || "")), He = Math.max(1, Number(G?.page_number || 1)), ct = Math.round(Number(G?.x || 0)), je = Math.round(Number(G?.y || 0)), k = Math.max(0, Number(G?.confidence || 0)), B = P(Q(String(G?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${te}" data-suggestion-id="${Ye}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Fe.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Le}</div>
                <div class="text-xs text-gray-500">Page ${He}, (${ct}, ${je})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${O(Number(G.confidence || 0))}">
                ${(k * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${B}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${te}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${te}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${te}">
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
    const y = H();
    let b = 100;
    y.forEach((x) => {
      const z = {
        definitionId: x.dataset.definitionId || "",
        fieldType: x.dataset.fieldType || "text",
        participantId: x.dataset.participantId || "",
        participantName: x.dataset.participantName || "Unassigned"
      }, j = Jt[z.fieldType || "text"] || Jt.text;
      f.currentPage = f.totalPages, et(z, 300, b + j.height / 2, { placementSource: pt.AUTO_FALLBACK }), b += j.height + 20;
    }), f.pdfDoc && qe(f.totalPages), w("Fields placed using fallback layout", "info");
  }
  async function we() {
    const y = _();
    if (!y.autoPlaceBtn || L.isRunning) return;
    if (H().length === 0) {
      w("All fields are already placed", "info");
      return;
    }
    const x = document.querySelector('input[name="id"]')?.value;
    if (!x) {
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
      const z = await fetch(`${t}/esign/agreements/${x}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: A()
        })
      });
      if (!z.ok)
        throw await g(z, "Auto-placement failed");
      const j = await z.json(), G = ss(j) ? j.run || {} : j;
      L.currentRunId = G?.run_id || G?.id || null, L.suggestions = G?.suggestions || [], L.resolverScores = G?.resolver_scores || [], L.suggestions.length === 0 ? (w("No placement suggestions found. Try placing fields manually.", "warning"), Z()) : K(G);
    } catch (z) {
      console.error("Auto-place error:", z);
      const j = z && typeof z == "object" ? z : {}, G = v(j.message || "Auto-placement failed", j.code || "", j.status || 0);
      w(`Auto-placement failed: ${G}`, "error"), Z();
    } finally {
      L.isRunning = !1, y.autoPlaceBtn.disabled = !1, y.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function Ce() {
    const y = _();
    y.autoPlaceBtn && !f.autoPlaceBound && (y.autoPlaceBtn.addEventListener("click", () => {
      we();
    }), f.autoPlaceBound = !0);
  }
  async function Ae() {
    const y = _();
    if (!n?.value) {
      y.loading?.classList.add("hidden"), y.noDocument?.classList.remove("hidden");
      return;
    }
    y.loading?.classList.remove("hidden"), y.noDocument?.classList.add("hidden");
    const b = s(), x = new Set(
      b.map((ae) => String(ae.definitionId || "").trim()).filter((ae) => ae)
    );
    f.fieldInstances = f.fieldInstances.filter(
      (ae) => x.has(String(ae.definitionId || "").trim())
    ), st();
    const z = ++f.loadRequestVersion, j = String(n.value || "").trim(), G = encodeURIComponent(j), te = `${e}/panels/esign_documents/${G}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const Fe = await window.pdfjsLib.getDocument({
        url: te,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (z !== f.loadRequestVersion)
        return;
      f.pdfDoc = Fe, f.totalPages = f.pdfDoc.numPages, f.currentPage = 1, y.totalPages && (y.totalPages.textContent = String(f.totalPages)), await qe(f.currentPage), y.loading?.classList.add("hidden"), f.uiHandlersBound || (Ee(y.viewer, y.overlays), Me(), nt(), f.uiHandlersBound = !0), ke();
    } catch (ae) {
      if (z !== f.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", ae), y.loading?.classList.add("hidden"), y.noDocument?.classList.remove("hidden"), y.noDocument) {
        const Fe = ae && typeof ae == "object" ? ae : {};
        y.noDocument.textContent = `Failed to load PDF: ${v(Fe.message || "Failed to load PDF")}`;
      }
    }
    he(), oe({ silent: !0 });
  }
  function Ue(y) {
    const b = Array.isArray(y?.fieldPlacements) ? y.fieldPlacements : [];
    f.fieldInstances = b.map((x, z) => qt(x, z)), oe({ silent: !0 });
  }
  return oe({ silent: !0 }), {
    bindEvents: Ce,
    initPlacementEditor: Ae,
    getState: D,
    getLinkGroupState: X,
    setLinkGroupState: ge,
    buildPlacementFormEntries: le,
    updateFieldInstancesFormData: oe,
    restoreFieldPlacementsFromState: Ue
  };
}
function kt(i, e, t = "") {
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
    getCurrentStep: w,
    totalWizardSteps: P
  } = i;
  function E() {
    const f = [];
    o.querySelectorAll(".participant-entry").forEach((H) => {
      const V = String(H.getAttribute("data-participant-id") || "").trim(), $ = kt(H, 'input[name*=".name"]'), _ = kt(H, 'input[name*=".email"]'), D = kt(H, 'select[name*=".role"]', "signer"), X = si(H, ".notify-input", !0), ge = kt(H, ".signing-stage-input"), le = Number(ge || "1") || 1;
      f.push({
        id: V,
        name: $,
        email: _,
        role: D,
        notify: X,
        signing_stage: D === "signer" ? le : 0
      });
    });
    const L = [];
    c.querySelectorAll(".field-definition-entry").forEach((H) => {
      const V = String(H.getAttribute("data-field-definition-id") || "").trim(), $ = kt(H, ".field-type-select", "signature"), _ = kt(H, ".field-participant-select"), D = Number(kt(H, 'input[name*=".page"]', "1")) || 1, X = si(H, 'input[name*=".required"]');
      V && L.push({
        id: V,
        type: $,
        participant_id: _,
        page: D,
        required: X
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
      send_for_signature: w() === P ? 1 : 0,
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
    documentPageCountInput: w,
    selectedDocumentTitle: P,
    agreementRefs: E,
    parsePositiveInt: f,
    isEditMode: L
  } = i;
  let S = null, C = !1;
  function H(se) {
    C = !0;
    try {
      return se();
    } finally {
      C = !1;
    }
  }
  function V(se) {
    const Ie = se?.document, De = document.getElementById("selected-document"), Re = document.getElementById("document-picker"), Se = document.getElementById("selected-document-info");
    if (v.value = String(Ie?.id || "").trim(), w) {
      const Oe = f(Ie?.pageCount, 0) || 0;
      w.value = Oe > 0 ? String(Oe) : "";
    }
    if (P && (P.textContent = String(Ie?.title || "").trim()), Se instanceof HTMLElement) {
      const Oe = f(Ie?.pageCount, 0) || 0;
      Se.textContent = Oe > 0 ? `${Oe} pages` : "";
    }
    if (v.value) {
      De?.classList.remove("hidden"), Re?.classList.add("hidden");
      return;
    }
    De?.classList.add("hidden"), Re?.classList.remove("hidden");
  }
  function $(se) {
    E.form.titleInput.value = String(se?.details?.title || ""), E.form.messageInput.value = String(se?.details?.message || "");
  }
  function _() {
    C || (S !== null && clearTimeout(S), S = setTimeout(() => {
      n();
    }, 500));
  }
  function D(se) {
    r.restoreFromState(se);
  }
  function X(se) {
    o.restoreFieldDefinitionsFromState(se);
  }
  function ge(se) {
    o.restoreFieldRulesFromState(se);
  }
  function le(se) {
    c.restoreFieldPlacementsFromState(se);
  }
  function oe() {
    v && new MutationObserver(() => {
      C || n();
    }).observe(v, { attributes: !0, attributeFilter: ["value"] });
    const se = document.getElementById("title"), Ie = document.getElementById("message");
    se instanceof HTMLInputElement && se.addEventListener("input", () => {
      const De = String(se.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(De), _();
    }), (Ie instanceof HTMLInputElement || Ie instanceof HTMLTextAreaElement) && Ie.addEventListener("input", _), r.refs.participantsContainer?.addEventListener("input", _), r.refs.participantsContainer?.addEventListener("change", _), o.refs.fieldDefinitionsContainer?.addEventListener("input", _), o.refs.fieldDefinitionsContainer?.addEventListener("change", _), o.refs.fieldRulesContainer?.addEventListener("input", _), o.refs.fieldRulesContainer?.addEventListener("change", _);
  }
  function he(se, Ie = {}) {
    H(() => {
      if (V(se), $(se), D(se), X(se), ge(se), s(), le(se), Ie.updatePreview !== !1) {
        const Re = se?.document;
        Re?.id ? h.setDocument(
          Re.id,
          Re.title || null,
          Re.pageCount ?? null
        ) : h.clear();
      }
      const De = f(
        Ie.step ?? se?.currentStep,
        g.getCurrentStep()
      ) || 1;
      g.setCurrentStep(De), g.updateWizardUI();
    });
  }
  function pe() {
    if (g.updateWizardUI(), v.value) {
      const se = P?.textContent || null, Ie = f(w?.value, 0) || null;
      h.setDocument(v.value, se, Ie);
    } else
      h.clear();
    L && E.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: oe,
    debouncedTrackChanges: _,
    applyStateToUI: he,
    renderInitialWizardUI: pe
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
    announceError: w
  } = i;
  function P(E) {
    switch (E) {
      case 1:
        return e.value ? !!s() : (w("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (w("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const f = n.querySelectorAll(".participant-entry");
        if (f.length === 0)
          return w("Please add at least one participant"), !1;
        let L = !1;
        return f.forEach((S) => {
          ls(S)?.value === "signer" && (L = !0);
        }), L ? !0 : (w("At least one signer is required"), !1);
      }
      case 4: {
        const f = r.querySelectorAll(".field-definition-entry");
        for (const H of Array.from(f)) {
          const V = ds(H);
          if (!V?.value)
            return w("Please assign all fields to a signer"), V?.focus(), !1;
        }
        if (h().find((H) => !H.participantId))
          return w("Please assign all automation rules to a signer"), o?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const C = g();
        return C.length > 0 ? (w(v(C)), c.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: P
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
  function w($, _) {
    return n.normalizeLoadedState({
      ..._,
      currentStep: $.currentStep,
      document: $.document,
      details: $.details,
      participants: $.participants,
      fieldDefinitions: $.fieldDefinitions,
      fieldPlacements: $.fieldPlacements,
      fieldRules: $.fieldRules,
      titleSource: $.titleSource,
      syncPending: !0,
      serverDraftId: _.serverDraftId,
      serverRevision: _.serverRevision,
      lastSyncedAt: _.lastSyncedAt
    });
  }
  async function P() {
    if (e) return n.getState();
    const $ = n.normalizeLoadedState(n.getState());
    ft("resume_reconcile_start", Ke({
      state: $,
      storageKey: t,
      ownership: v?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const _ = String($?.serverDraftId || "").trim();
    if (!_) {
      if (!s($))
        try {
          const D = await o.bootstrap();
          return n.setState({
            ...D.snapshot?.data?.wizard_state && typeof D.snapshot.data.wizard_state == "object" ? D.snapshot.data.wizard_state : {},
            resourceRef: D.resourceRef,
            serverDraftId: String(D.snapshot?.ref?.id || "").trim() || null,
            serverRevision: Number(D.snapshot?.revision || 0),
            lastSyncedAt: String(D.snapshot?.updatedAt || "").trim() || null,
            syncPending: !1
          }, { syncPending: !1, notify: !1 }), n.getState();
        } catch {
          It("resume_reconcile_bootstrap_failed", Ke({
            state: $,
            storageKey: t,
            ownership: v?.() || void 0,
            sendAttemptId: null,
            extra: {
              source: "bootstrap_failed_keep_local"
            }
          }));
        }
      return n.setState($, { syncPending: !!$.syncPending, notify: !1 }), ft("resume_reconcile_complete", Ke({
        state: $,
        storageKey: t,
        ownership: v?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), n.getState();
    }
    try {
      const D = await o.load(_), X = n.normalizeLoadedState({
        ...D?.wizard_state && typeof D.wizard_state == "object" ? D.wizard_state : {},
        resourceRef: D?.resource_ref || $.resourceRef || null,
        serverDraftId: String(D?.id || _).trim() || _,
        serverRevision: Number(D?.revision || 0),
        lastSyncedAt: String(D?.updated_at || D?.updatedAt || "").trim() || $.lastSyncedAt,
        syncPending: !1
      }), ge = String($.serverDraftId || "").trim() === String(X.serverDraftId || "").trim(), le = ge && $.syncPending === !0 ? w($, X) : X;
      return n.setState(le, { syncPending: !!le.syncPending, notify: !1 }), ft("resume_reconcile_complete", Ke({
        state: le,
        storageKey: t,
        ownership: v?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: ge && $.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(D?.id || _).trim() || null,
          loadedRevision: Number(D?.revision || 0)
        }
      })), n.getState();
    } catch (D) {
      const X = typeof D == "object" && D !== null && "status" in D ? Number(D.status || 0) : 0;
      if (X === 404) {
        const ge = n.normalizeLoadedState({
          ...$,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return n.setState(ge, { syncPending: !!ge.syncPending, notify: !1 }), It("resume_reconcile_remote_missing", Ke({
          state: ge,
          storageKey: t,
          ownership: v?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: _,
            status: X
          }
        })), n.getState();
      }
      return It("resume_reconcile_failed", Ke({
        state: $,
        storageKey: t,
        ownership: v?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: _,
          status: X
        }
      })), n.getState();
    }
  }
  function E($) {
    return document.getElementById($);
  }
  function f() {
    const $ = document.getElementById("resume-dialog-modal"), _ = n.getState(), D = String(_?.document?.title || "").trim() || String(_?.document?.id || "").trim() || "Unknown document", X = E("resume-draft-title"), ge = E("resume-draft-document"), le = E("resume-draft-step"), oe = E("resume-draft-time");
    X && (X.textContent = _.details?.title || "Untitled Agreement"), ge && (ge.textContent = D), le && (le.textContent = String(_.currentStep || 1)), oe && (oe.textContent = h(_.updatedAt)), $?.classList.remove("hidden"), g("wizard_resume_prompt_shown", {
      step: Number(_.currentStep || 1),
      has_server_draft: !!_.serverDraftId
    });
  }
  async function L($ = {}) {
    const _ = $.deleteServerDraft === !0, D = String(n.getState()?.serverDraftId || "").trim();
    if (n.clear(), r.broadcastStateUpdate(), D && r.broadcastDraftDisposed?.(D, _ ? "resume_clear_delete" : "resume_clear_local"), !(!_ || !D))
      try {
        await o.dispose(D);
      } catch (X) {
        console.warn("Failed to delete server draft:", X);
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
  async function C($) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const _ = S();
    switch ($) {
      case "continue":
        !String(n.getState()?.serverDraftId || "").trim() && s(_) && await o.create(_), c(n.getState());
        return;
      case "start_new":
        await L({ deleteServerDraft: !1 }), s(_) ? await o.create(_) : await P(), c(n.getState());
        return;
      case "proceed":
        await L({ deleteServerDraft: !0 }), s(_) ? await o.create(_) : await P(), c(n.getState());
        return;
      case "discard":
        await L({ deleteServerDraft: !0 }), await P(), c(n.getState());
        return;
      default:
        return;
    }
  }
  function H() {
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
  async function V() {
    e || (await P(), n.hasResumableState() && f());
  }
  return {
    bindEvents: H,
    reconcileBootstrapState: P,
    maybeShowResumeDialog: V
  };
}
function gs(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let r = "saved";
  function o(E) {
    if (!E) return "unknown";
    const f = new Date(E), S = (/* @__PURE__ */ new Date()).getTime() - f.getTime(), C = Math.floor(S / 6e4), H = Math.floor(S / 36e5), V = Math.floor(S / 864e5);
    return C < 1 ? "just now" : C < 60 ? `${C} minute${C !== 1 ? "s" : ""} ago` : H < 24 ? `${H} hour${H !== 1 ? "s" : ""} ago` : V < 7 ? `${V} day${V !== 1 ? "s" : ""} ago` : f.toLocaleDateString();
  }
  function c() {
    const E = n.getState();
    r === "paused" && s(E?.syncPending ? "pending" : "saved");
  }
  function s(E) {
    r = String(E || "").trim() || "saved";
    const f = e.sync.indicator, L = e.sync.icon, S = e.sync.text, C = e.sync.retryBtn;
    if (!(!f || !L || !S))
      switch (f.classList.remove("hidden"), E) {
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
  function h(E) {
    const f = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = o(f.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(E || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function g(E, f = "", L = 0) {
    const S = String(f || "").trim().toUpperCase(), C = String(E || "").trim().toLowerCase();
    return S === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : S === "DRAFT_SEND_NOT_FOUND" || S === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : S === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : S === "SCOPE_DENIED" || C.includes("scope denied") ? "You don't have access to this organization's resources." : S === "TRANSPORT_SECURITY" || S === "TRANSPORT_SECURITY_REQUIRED" || C.includes("tls transport required") || Number(L) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : S === "PDF_UNSUPPORTED" || C === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(E || "").trim() !== "" ? String(E).trim() : "Something went wrong. Please try again.";
  }
  async function v(E, f = "") {
    const L = Number(E?.status || 0);
    let S = "", C = "", H = {};
    try {
      const V = await E.json();
      S = String(V?.error?.code || V?.code || "").trim(), C = String(V?.error?.message || V?.message || "").trim(), H = V?.error?.details && typeof V.error.details == "object" ? V.error.details : {}, String(H?.entity || "").trim().toLowerCase() === "drafts" && String(S).trim().toUpperCase() === "NOT_FOUND" && (S = "DRAFT_SEND_NOT_FOUND", C === "" && (C = "Draft not found"));
    } catch {
      C = "";
    }
    return C === "" && (C = f || `Request failed (${L || "unknown"})`), {
      status: L,
      code: S,
      details: H,
      message: g(C, S, L)
    };
  }
  function w(E, f = "", L = 0) {
    const S = g(E, f, L);
    t && (t.textContent = S), window.toastManager?.error ? window.toastManager.error(S) : alert(S);
  }
  async function P(E, f = {}) {
    const L = await E;
    return L?.blocked && L.reason === "passive_tab" ? (w(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), L) : (L?.error && String(f.errorMessage || "").trim() !== "" && w(f.errorMessage || ""), L);
  }
  return {
    announceError: w,
    formatRelativeTime: o,
    mapUserFacingError: g,
    parseAPIError: v,
    restoreSyncStatusFromState: c,
    showSyncConflictDialog: h,
    surfaceSyncOutcome: P,
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
    surfaceSyncOutcome: c
  } = i;
  function s() {
    const v = t.collectFormState();
    t.updateState(v), n.scheduleSync(), n.broadcastStateUpdate();
  }
  function h() {
    if (!e)
      return;
    const w = t.getState()?.serverDraftId;
    t.clear(), n.broadcastStateUpdate(), w && (n.broadcastDraftDisposed?.(w, "agreement_created"), r.dispose(w).catch((P) => {
      console.warn("Failed to dispose sync draft after successful create:", P);
    }));
  }
  function g() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await c(n.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      n.refreshCurrentDraft && (await n.refreshCurrentDraft({ preserveDirty: !1, force: !0 }), o(t.getState())), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const v = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      t.setState({
        ...t.getState(),
        serverRevision: v,
        syncPending: !0
      }, { syncPending: !0 });
      const w = await c(n.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (w?.success || w?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  return {
    bindRetryAndConflictHandlers: g,
    handleCreateSuccessCleanup: h,
    trackWizardStateChanges: s
  };
}
const Et = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function Ci(i, e = Et.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === Et.USER ? Et.USER : t === Et.SERVER_SEED ? Et.SERVER_SEED : t === Et.AUTOFILL ? Et.AUTOFILL : e;
}
function fs(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), r = String(t.email ?? "").trim(), o = String(t.role ?? "signer").trim().toLowerCase(), c = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), s = t.notify !== !1;
  return n !== "" || r !== "" || o !== "" && o !== "signer" || Number.isFinite(c) && c > 1 || !s ? !0 : e > 0;
}
function ai(i, e = {}) {
  const {
    normalizeTitleSource: t = Ci,
    titleSource: n = Et
  } = e;
  if (!i || typeof i != "object") return !1;
  const r = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(r) && r > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const c = String(i.details?.title ?? "").trim(), s = String(i.details?.message ?? "").trim(), h = t(
    i.titleSource,
    c === "" ? n.AUTOFILL : n.USER
  );
  return !!(c !== "" && h !== n.SERVER_SEED || s !== "" || (Array.isArray(i.participants) ? i.participants : []).some((w, P) => fs(w, P)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function hs(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, r = n.replace(/\/+$/, ""), o = /\/v\d+$/i.test(r) ? r : `${r}/v1`, c = !!e.is_edit, s = !!e.create_success, h = String(e.submit_mode || "json").trim().toLowerCase(), g = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, v = Array.isArray(e.initial_participants) ? e.initial_participants : [], w = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], P = e.sync && typeof e.sync == "object" ? e.sync : {}, E = Array.isArray(P.action_operations) ? P.action_operations.map((C) => String(C || "").trim()).filter(Boolean) : [], f = `${o}/esign`, L = {
    base_url: String(P.base_url || "").trim() || f,
    bootstrap_path: String(P.bootstrap_path || "").trim() || `${f}/sync/bootstrap/agreement-draft`,
    client_base_path: String(P.client_base_path || "").trim() || `${t}/sync-client/sync-core`,
    resource_kind: String(P.resource_kind || "").trim() || "agreement_draft",
    storage_scope: String(P.storage_scope || "").trim(),
    action_operations: E.length > 0 ? E : ["send", "dispose"]
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
    initial_field_instances: w
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
    initialFieldInstances: w
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
  ).trim().toLowerCase(), c = [
    String(e.sync?.storage_scope || "").trim() || "anonymous",
    n,
    r || "agreement-form"
  ].join("|");
  return {
    WIZARD_STATE_VERSION: 2,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v2:${encodeURIComponent(c)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(c)}`,
    SYNC_DEBOUNCE_MS: 2e3,
    SYNC_RETRY_DELAYS: [1e3, 2e3, 5e3, 1e4, 3e4],
    TITLE_SOURCE: Et
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
    initialParticipants: w,
    initialFieldInstances: P
  } = hs(i), E = Pr(document), {
    WIZARD_STATE_VERSION: f,
    WIZARD_STORAGE_KEY: L,
    WIZARD_CHANNEL_NAME: S,
    SYNC_DEBOUNCE_MS: C,
    SYNC_RETRY_DELAYS: H,
    TITLE_SOURCE: V
  } = vs({
    config: e,
    isEditMode: s
  }), $ = Br(), _ = (F, ue = V.AUTOFILL) => Ci(F, ue), D = (F) => ai(F, {
    normalizeTitleSource: _,
    titleSource: V
  }), X = Cr({
    apiBasePath: c,
    basePath: r
  }), ge = E.form.root, le = bs(E.form.submitBtn, "submit button"), oe = E.form.announcements;
  let he = null, pe = null, se = null, Ie = null, De = null, Re = null, Se = null, Oe = null, $e = sn();
  const st = (F, ue = {}) => {
    Ie?.applyStateToUI(F, ue);
  }, it = () => Ie?.debouncedTrackChanges?.(), Ne = () => Oe?.trackWizardStateChanges?.(), qe = (F) => Se?.formatRelativeTime(F) || "unknown", me = () => Se?.restoreSyncStatusFromState(), U = (F) => Se?.updateSyncStatus(F), be = (F) => Se?.showSyncConflictDialog(F), ke = (F, ue = "", Xe = 0) => Se?.mapUserFacingError(F, ue, Xe) || String(F || "").trim(), et = (F, ue) => Se ? Se.parseAPIError(F, ue) : Promise.resolve({ status: Number(F.status || 0), code: "", details: {}, message: ue }), Ve = (F, ue = "", Xe = 0) => Se?.announceError(F, ue, Xe), tt = (F, ue = {}) => Se ? Se.surfaceSyncOutcome(F, ue) : Promise.resolve({}), gt = () => null, fe = Tr(E, {
    formatRelativeTime: qe
  }), Ee = () => fe.render({ coordinationAvailable: !0 }), Me = async (F, ue) => {
    const Xe = await et(F, ue), Qe = new Error(Xe.message);
    return Qe.code = Xe.code, Qe.status = Xe.status, Qe;
  }, nt = {
    hasResumableState: () => A.hasResumableState(),
    setTitleSource: (F, ue) => A.setTitleSource(F, ue),
    updateDocument: (F) => A.updateDocument(F),
    updateDetails: (F, ue) => A.updateDetails(F, ue),
    getState: () => {
      const F = A.getState();
      return {
        titleSource: F.titleSource,
        details: F.details && typeof F.details == "object" ? F.details : {}
      };
    }
  }, A = new _r({
    storageKey: L,
    stateVersion: f,
    totalWizardSteps: Vt,
    titleSource: V,
    normalizeTitleSource: _,
    parsePositiveInt: Ze,
    hasMeaningfulWizardProgress: D,
    collectFormState: () => {
      const F = E.form.documentIdInput?.value || null, ue = document.getElementById("selected-document-title")?.textContent?.trim() || null, Xe = _(
        A.getState()?.titleSource,
        String(E.form.titleInput?.value || "").trim() === "" ? V.AUTOFILL : V.USER
      );
      return {
        document: {
          id: F,
          title: ue,
          pageCount: parseInt(E.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: E.form.titleInput?.value || "",
          message: E.form.messageInput?.value || ""
        },
        titleSource: Xe,
        participants: he?.collectParticipantsForState?.() || [],
        fieldDefinitions: pe?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: se?.getState?.()?.fieldInstances || [],
        fieldRules: pe?.collectFieldRulesForState?.() || []
      };
    },
    emitTelemetry: $
  });
  A.start(), Se = gs({
    agreementRefs: E,
    formAnnouncements: oe,
    stateManager: A
  });
  const M = new Rr({
    stateManager: A,
    requestHeaders: ys,
    syncConfig: n
  });
  let O;
  const Q = new Mr({
    channelName: S,
    onCoordinationAvailabilityChange: (F) => {
      me(), fe.render({ coordinationAvailable: F });
    },
    onRemoteSync: (F) => {
      String(A.getState()?.serverDraftId || "").trim() === String(F || "").trim() && (A.getState()?.syncPending || O?.refreshCurrentDraft({ preserveDirty: !0, force: !0 }).then(() => {
        st(A.getState(), {
          step: Number(A.getState()?.currentStep || 1)
        });
      }));
    },
    onRemoteDraftDisposed: (F) => {
      String(A.getState()?.serverDraftId || "").trim() === String(F || "").trim() && (A.getState()?.syncPending || A.setState({
        ...A.getState(),
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
      O?.forceSync();
    },
    onPageHide: () => {
      O?.forceSync();
    },
    onBeforeUnload: () => {
      O?.forceSync();
    }
  });
  O = new $r({
    stateManager: A,
    syncService: M,
    activeTabController: Q,
    storageKey: L,
    statusUpdater: U,
    showConflictDialog: be,
    syncDebounceMs: C,
    syncRetryDelays: H,
    documentRef: document,
    windowRef: window
  });
  const ce = Ar({
    context: {
      config: t,
      refs: E,
      basePath: r,
      apiBase: o,
      apiVersionBase: c,
      previewCard: X,
      emitTelemetry: $,
      stateManager: A,
      syncService: M,
      activeTabController: Q,
      syncController: O
    },
    hooks: {
      renderInitialUI() {
        Ie?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        Re?.maybeShowResumeDialog?.(), J.loadDocuments(), J.loadRecentDocuments();
      },
      destroy() {
        fe.destroy(), A.destroy();
      }
    }
  }), J = Qr({
    apiBase: o,
    apiVersionBase: c,
    documentsUploadURL: v,
    isEditMode: s,
    titleSource: V,
    normalizeTitleSource: _,
    stateManager: nt,
    previewCard: X,
    parseAPIError: Me,
    announceError: Ve,
    showToast: oi,
    mapUserFacingError: ke,
    renderFieldRulePreview: () => pe?.renderFieldRulePreview?.()
  });
  J.initializeTitleSourceSeed(), J.bindEvents();
  const ye = $t(J.refs.documentIdInput, "document id input"), de = $t(J.refs.documentSearch, "document search input"), K = J.refs.selectedDocumentTitle, Z = J.refs.documentPageCountInput, we = J.ensureSelectedDocumentCompatibility, Ce = J.getCurrentDocumentPageCount;
  he = Zr({
    initialParticipants: w,
    onParticipantsChanged: () => pe?.updateFieldParticipantOptions?.()
  }), he.initialize(), he.bindEvents();
  const Ae = $t(he.refs.participantsContainer, "participants container"), Ue = $t(he.refs.addParticipantBtn, "add participant button"), y = () => he?.getSignerParticipants() || [];
  pe = rs({
    initialFieldInstances: P,
    placementSource: pt,
    getCurrentDocumentPageCount: Ce,
    getSignerParticipants: y,
    escapeHtml: wn,
    onDefinitionsChanged: () => it(),
    onRulesChanged: () => it(),
    onParticipantsChanged: () => pe?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => se?.getLinkGroupState?.() || $e,
    setPlacementLinkGroupState: (F) => {
      $e = F || sn(), se?.setLinkGroupState?.($e);
    }
  }), pe.bindEvents(), pe.initialize();
  const b = $t(pe.refs.fieldDefinitionsContainer, "field definitions container"), x = pe.refs.fieldRulesContainer, z = $t(pe.refs.addFieldBtn, "add field button"), j = pe.refs.fieldPlacementsJSONInput, G = pe.refs.fieldRulesJSONInput, te = () => pe?.collectFieldRulesForState() || [], ae = () => pe?.collectFieldRulesForState() || [], Fe = () => pe?.collectFieldRulesForForm() || [], Le = (F, ue) => pe?.expandRulesForPreview(F, ue) || [], Ye = () => pe?.updateFieldParticipantOptions(), He = () => pe.collectPlacementFieldDefinitions(), ct = (F) => pe?.getFieldDefinitionById(F) || null, je = () => pe?.findSignersMissingRequiredSignatureField() || [], k = (F) => pe?.missingSignatureFieldMessage(F) || "", B = Ur({
    documentIdInput: ye,
    selectedDocumentTitle: K,
    participantsContainer: Ae,
    fieldDefinitionsContainer: b,
    submitBtn: le,
    escapeHtml: wn,
    getSignerParticipants: y,
    getCurrentDocumentPageCount: Ce,
    collectFieldRulesForState: ae,
    expandRulesForPreview: Le,
    findSignersMissingRequiredSignatureField: je,
    goToStep: (F) => N.goToStep(F)
  });
  se = as({
    apiBase: o,
    apiVersionBase: c,
    documentIdInput: ye,
    fieldPlacementsJSONInput: j,
    initialFieldInstances: pe.buildInitialPlacementInstances(),
    initialLinkGroupState: $e,
    collectPlacementFieldDefinitions: He,
    getFieldDefinitionById: ct,
    parseAPIError: Me,
    mapUserFacingError: ke,
    showToast: oi,
    escapeHtml: wn,
    onPlacementsChanged: () => Ne()
  }), se.bindEvents(), $e = se.getLinkGroupState();
  const N = Hr({
    totalWizardSteps: Vt,
    wizardStep: rt,
    nextStepLabels: fr,
    submitBtn: le,
    previewCard: X,
    updateCoordinationUI: Ee,
    validateStep: (F) => De?.validateStep(F) !== !1,
    onPlacementStep() {
      se.initPlacementEditor();
    },
    onReviewStep() {
      B.initSendReadinessCheck();
    },
    onStepChanged(F) {
      A.updateStep(F), Ne(), O.forceSync();
    }
  });
  N.bindEvents(), Oe = ms({
    createSuccess: h,
    stateManager: A,
    syncOrchestrator: O,
    syncService: M,
    applyStateToUI: (F) => st(F, {
      step: Number(F?.currentStep || 1)
    }),
    surfaceSyncOutcome: tt,
    reviewStep: rt.REVIEW
  }), Oe.handleCreateSuccessCleanup(), Oe.bindRetryAndConflictHandlers();
  const Y = os({
    documentIdInput: ye,
    documentPageCountInput: Z,
    titleInput: E.form.titleInput,
    messageInput: E.form.messageInput,
    participantsContainer: Ae,
    fieldDefinitionsContainer: b,
    fieldPlacementsJSONInput: j,
    fieldRulesJSONInput: G,
    collectFieldRulesForForm: () => Fe(),
    buildPlacementFormEntries: () => se?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => N.getCurrentStep(),
    totalWizardSteps: Vt
  }), ne = () => Y.buildCanonicalAgreementPayload();
  return Ie = cs({
    titleSource: V,
    stateManager: A,
    trackWizardStateChanges: Ne,
    participantsController: he,
    fieldDefinitionsController: pe,
    placementController: se,
    updateFieldParticipantOptions: Ye,
    previewCard: X,
    wizardNavigationController: N,
    documentIdInput: ye,
    documentPageCountInput: Z,
    selectedDocumentTitle: K,
    agreementRefs: E,
    parsePositiveInt: Ze,
    isEditMode: s
  }), Ie.bindChangeTracking(), De = us({
    documentIdInput: ye,
    titleInput: E.form.titleInput,
    participantsContainer: Ae,
    fieldDefinitionsContainer: b,
    fieldRulesContainer: x,
    addFieldBtn: z,
    ensureSelectedDocumentCompatibility: we,
    collectFieldRulesForState: te,
    findSignersMissingRequiredSignatureField: je,
    missingSignatureFieldMessage: k,
    announceError: Ve
  }), Re = ps({
    isEditMode: s,
    storageKey: L,
    stateManager: A,
    syncOrchestrator: O,
    syncService: M,
    applyResumedState: (F) => st(F, {
      step: Number(F?.currentStep || 1)
    }),
    hasMeaningfulWizardProgress: ai,
    formatRelativeTime: qe,
    emitWizardTelemetry: (F, ue) => $(F, ue),
    getActiveTabDebugState: gt
  }), Re.bindEvents(), qr({
    config: e,
    form: ge,
    submitBtn: le,
    documentIdInput: ye,
    documentSearch: de,
    participantsContainer: Ae,
    addParticipantBtn: Ue,
    fieldDefinitionsContainer: b,
    fieldRulesContainer: x,
    documentPageCountInput: Z,
    fieldPlacementsJSONInput: j,
    fieldRulesJSONInput: G,
    storageKey: L,
    syncService: M,
    syncOrchestrator: O,
    stateManager: A,
    submitMode: g,
    totalWizardSteps: Vt,
    wizardStep: rt,
    getCurrentStep: () => N.getCurrentStep(),
    getPlacementState: () => se.getState(),
    getCurrentDocumentPageCount: Ce,
    ensureSelectedDocumentCompatibility: we,
    collectFieldRulesForState: te,
    collectFieldRulesForForm: Fe,
    expandRulesForPreview: Le,
    findSignersMissingRequiredSignatureField: je,
    missingSignatureFieldMessage: k,
    getSignerParticipants: y,
    buildCanonicalAgreementPayload: ne,
    announceError: Ve,
    emitWizardTelemetry: $,
    parseAPIError: et,
    goToStep: (F) => N.goToStep(F),
    showSyncConflictDialog: be,
    surfaceSyncOutcome: tt,
    updateSyncStatus: U,
    getActiveTabDebugState: gt,
    addFieldBtn: z
  }).bindEvents(), ce;
}
let an = null;
function Ss() {
  an?.destroy(), an = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function xs(i = {}) {
  if (an)
    return;
  const e = ws(i);
  e.start(), an = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function Is(i) {
  return {
    sync: i.sync && typeof i.sync == "object" ? {
      base_url: String(i.sync.base_url || "").trim(),
      bootstrap_path: String(i.sync.bootstrap_path || "").trim(),
      client_base_path: String(i.sync.client_base_path || "").trim(),
      resource_kind: String(i.sync.resource_kind || "").trim(),
      storage_scope: String(i.sync.storage_scope || "").trim(),
      action_operations: Array.isArray(i.sync.action_operations) ? i.sync.action_operations.map((e) => String(e || "").trim()).filter(Boolean) : []
    } : void 0,
    base_path: String(i.base_path || i.basePath || "").trim(),
    api_base_path: String(i.api_base_path || i.apiBasePath || "").trim(),
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
function mt(i) {
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
      s.overlayRenderFrameID = 0, de();
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
  function w(a, l) {
    const d = s.fieldState.get(a);
    if (!d) return;
    const p = mt(String(l || ""));
    if (!p) {
      delete d.previewValueText;
      return;
    }
    d.previewValueText = p, delete d.previewValueBool, delete d.previewSignatureUrl;
  }
  function P(a, l) {
    const d = s.fieldState.get(a);
    d && (d.previewValueBool = !!l, delete d.previewValueText, delete d.previewSignatureUrl);
  }
  function E(a, l) {
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
      const d = a.page, p = this.getPageMetadata(d), m = l.offsetWidth, I = l.offsetHeight, T = a.pageWidth || p.width, W = a.pageHeight || p.height, ee = m / T, Pe = I / W;
      let ve = a.posX || 0, Te = a.posY || 0;
      n.viewer.origin === "bottom-left" && (Te = W - Te - (a.height || 30));
      const ht = ve * ee, vt = Te * Pe, xe = (a.width || 150) * ee, Ge = (a.height || 30) * Pe;
      return {
        left: ht,
        top: vt,
        width: xe,
        height: Ge,
        // Store original values for debugging
        _debug: {
          sourceX: ve,
          sourceY: Te,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: T,
          pageHeight: W,
          scaleX: ee,
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
        throw await at(m, "Failed to get upload contract");
      const I = await m.json(), T = I?.contract || I;
      if (!T || typeof T != "object" || !T.upload_url)
        throw new Error("Invalid upload contract response");
      return T;
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
      a.headers && Object.entries(a.headers).forEach(([I, T]) => {
        const W = String(I).toLowerCase();
        W === "x-esign-upload-token" || W === "x-esign-upload-key" || (p[I] = String(T));
      });
      const m = await fetch(d.toString(), {
        method: a.method || "PUT",
        headers: p,
        body: l,
        credentials: "omit"
      });
      if (!m.ok)
        throw await at(m, `Upload failed: ${m.status} ${m.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [l, d] = a.split(","), p = l.match(/data:([^;]+)/), m = p ? p[1] : "image/png", I = atob(d), T = new Uint8Array(I.length);
      for (let W = 0; W < I.length; W++)
        T[W] = I.charCodeAt(W);
      return new Blob([T], { type: m });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, l) {
      const d = this.dataUrlToBlob(l), p = d.size, m = "image/png", I = await Ie(d), T = await this.requestUploadBootstrap(
        a,
        I,
        m,
        p
      );
      return await this.uploadToSignedUrl(T, d), {
        uploadToken: T.upload_token,
        objectKey: T.object_key,
        sha256: T.sha256,
        contentType: T.content_type
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
        const I = await p.json().catch(() => ({})), T = new Error(I?.error?.message || "Failed to save signature");
        throw T.code = I?.error?.code || "", T;
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
  function H(a) {
    return s.savedSignaturesByType.get(a) || [];
  }
  async function V(a, l = !1) {
    const d = C(a);
    if (!l && s.savedSignaturesByType.has(d)) {
      $(a);
      return;
    }
    const p = await S.list(d);
    s.savedSignaturesByType.set(d, p), $(a);
  }
  function $(a) {
    const l = C(a), d = H(l), p = document.getElementById("sig-saved-list");
    if (p) {
      if (!d.length) {
        p.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      p.innerHTML = d.map((m) => {
        const I = St(String(m?.thumbnail_data_url || m?.data_url || "")), T = St(String(m?.label || "Saved signature")), W = St(String(m?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${I}" alt="${T}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${T}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${St(a)}" data-signature-id="${W}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${St(a)}" data-signature-id="${W}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function _(a) {
    const l = s.signatureCanvases.get(a), d = C(a);
    if (!l || !F(a))
      throw new Error(`Please add your ${d === "initials" ? "initials" : "signature"} first`);
    const p = l.canvas.toDataURL("image/png"), m = await S.save(d, p, d === "initials" ? "Initials" : "Signature");
    if (!m)
      throw new Error("Failed to save signature");
    const I = H(d);
    I.unshift(m), s.savedSignaturesByType.set(d, I), $(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function D(a, l) {
    const d = C(a), m = H(d).find((T) => String(T?.id || "") === String(l));
    if (!m) return;
    requestAnimationFrame(() => k(a)), await le(a);
    const I = String(m.data_url || m.thumbnail_data_url || "").trim();
    I && (await N(a, I, { clearStrokes: !0 }), E(a, I), h(), ct("draw", a), ot("Saved signature selected."));
  }
  async function X(a, l) {
    const d = C(a);
    await S.delete(l);
    const p = H(d).filter((m) => String(m?.id || "") !== String(l));
    s.savedSignaturesByType.set(d, p), $(a);
  }
  function ge(a) {
    const l = String(a?.code || "").trim(), d = String(a?.message || "Unable to update saved signatures"), p = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : d;
    window.toastManager && window.toastManager.error(p), ot(p, "assertive");
  }
  async function le(a, l = 8) {
    for (let d = 0; d < l; d++) {
      if (s.signatureCanvases.has(a)) return !0;
      await new Promise((p) => setTimeout(p, 40)), k(a);
    }
    return !1;
  }
  async function oe(a, l) {
    const d = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(d))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => k(a)), await le(a);
    const p = s.signatureCanvases.get(a);
    if (!p)
      throw new Error("Signature canvas is not ready");
    const m = await he(l), I = d === "image/png" ? m : await se(m, p.drawWidth, p.drawHeight);
    if (pe(I) > li)
      throw new Error(`Image exceeds ${Math.round(li / 1024)}KB limit after conversion`);
    await N(a, I, { clearStrokes: !0 }), E(a, I), h();
    const W = document.getElementById("sig-upload-preview-wrap"), ee = document.getElementById("sig-upload-preview");
    W && W.classList.remove("hidden"), ee && ee.setAttribute("src", I), ot("Signature image uploaded. You can now insert it.");
  }
  function he(a) {
    return new Promise((l, d) => {
      const p = new FileReader();
      p.onload = () => l(String(p.result || "")), p.onerror = () => d(new Error("Unable to read image file")), p.readAsDataURL(a);
    });
  }
  function pe(a) {
    const l = String(a || "").split(",");
    if (l.length < 2) return 0;
    const d = l[1] || "", p = (d.match(/=+$/) || [""])[0].length;
    return Math.floor(d.length * 3 / 4) - p;
  }
  async function se(a, l, d) {
    return await new Promise((p, m) => {
      const I = new Image();
      I.onload = () => {
        const T = document.createElement("canvas"), W = Math.max(1, Math.round(Number(l) || 600)), ee = Math.max(1, Math.round(Number(d) || 160));
        T.width = W, T.height = ee;
        const Pe = T.getContext("2d");
        if (!Pe) {
          m(new Error("Unable to process image"));
          return;
        }
        Pe.clearRect(0, 0, W, ee);
        const ve = Math.min(W / I.width, ee / I.height), Te = I.width * ve, ht = I.height * ve, vt = (W - Te) / 2, xe = (ee - ht) / 2;
        Pe.drawImage(I, vt, xe, Te, ht), p(T.toDataURL("image/png"));
      }, I.onerror = () => m(new Error("Unable to decode image file")), I.src = a;
    });
  }
  async function Ie(a) {
    if (window.crypto && window.crypto.subtle) {
      const l = await a.arrayBuffer(), d = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(d)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function De() {
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
          we();
          break;
        case "zoom-out":
          y();
          break;
        case "zoom-in":
          Ue();
          break;
        case "fit-width":
          b();
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
          Qe();
          break;
        case "save-field-editor":
          cn();
          break;
        case "hide-consent-modal":
          dn();
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
          A();
          break;
        case "signature-tab": {
          const m = d.getAttribute("data-tab") || "draw", I = d.getAttribute("data-field-id");
          I && ct(m, I);
          break;
        }
        case "clear-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && Xe(m);
          break;
        }
        case "undo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && ne(m);
          break;
        }
        case "redo-signature-canvas": {
          const m = d.getAttribute("data-field-id");
          m && re(m);
          break;
        }
        case "save-current-signature-library": {
          const m = d.getAttribute("data-field-id");
          m && _(m).catch(ge);
          break;
        }
        case "select-saved-signature": {
          const m = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          m && I && D(m, I).catch(ge);
          break;
        }
        case "delete-saved-signature": {
          const m = d.getAttribute("data-field-id"), I = d.getAttribute("data-signature-id");
          m && I && X(m, I).catch(ge);
          break;
        }
        case "clear-signer-profile":
          et().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Lt.togglePanel();
          break;
        case "debug-copy-session":
          Lt.copySessionInfo();
          break;
        case "debug-clear-cache":
          Lt.clearCache();
          break;
        case "debug-show-telemetry":
          Lt.showTelemetry();
          break;
        case "debug-reload-viewer":
          Lt.reloadViewer();
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
          const d = l.getAttribute("data-field-id") || s.activeFieldId;
          if (!d) return;
          P(d, l.checked), h();
        }
      }
    }), document.addEventListener("input", (a) => {
      const l = a.target;
      if (!(l instanceof HTMLInputElement) && !(l instanceof HTMLTextAreaElement)) return;
      const d = l.getAttribute("data-field-id") || s.activeFieldId;
      if (d) {
        if (l.matches("#sig-type-input")) {
          Ye(d, l.value || "", { syncOverlay: !0 });
          return;
        }
        if (l.matches("#field-text-input")) {
          w(d, l.value || ""), h();
          return;
        }
        l.matches("#field-checkbox-input") && l instanceof HTMLInputElement && (P(d, l.checked), h());
      }
    });
  }
  _e(async () => {
    De(), s.isLowMemory = gt(), st(), it(), await qe(), Ne(), tt(), Bn(), Mt(), await A(), de(), document.addEventListener("visibilitychange", Re), "memory" in navigator && Oe(), Lt.init();
  });
  function Re() {
    document.hidden && Se();
  }
  function Se() {
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
  function Oe() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        a / l > 0.8 && (s.isLowMemory = !0, Se());
      }
    }, 3e4);
  }
  function $e(a) {
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
  function st() {
    const a = document.getElementById("pdf-compatibility-banner"), l = document.getElementById("pdf-compatibility-message"), d = document.getElementById("pdf-compatibility-title");
    if (!a || !l || !d) return;
    const p = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), m = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (p !== "limited") {
      a.classList.add("hidden");
      return;
    }
    d.textContent = "Preview Compatibility Notice", l.textContent = String(n.viewer.compatibilityMessage || "").trim() || $e(m), a.classList.remove("hidden"), c.trackDegradedMode("pdf_preview_compatibility", { tier: p, reason: m });
  }
  function it() {
    const a = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), d = document.getElementById("stage-state-title"), p = document.getElementById("stage-state-message"), m = document.getElementById("stage-state-meta");
    if (!a || !l || !d || !p || !m) return;
    const I = n.signerState || "active", T = n.recipientStage || 1, W = n.activeStage || 1, ee = n.activeRecipientIds || [], Pe = n.waitingForRecipientIds || [];
    let ve = {
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
        ve = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: T > W ? `You are in signing stage ${T}. Stage ${W} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Pe.length > 0 && ve.badges.push({
          icon: "iconoir-group",
          text: `${Pe.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        ve = {
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
        ve = {
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
        ee.length > 1 ? (ve.message = `You and ${ee.length - 1} other signer(s) can sign now.`, ve.badges = [
          { icon: "iconoir-users", text: `Stage ${W} active`, variant: "green" }
        ]) : T > 1 ? ve.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${T}`, variant: "green" }
        ] : ve.hidden = !0;
        break;
    }
    if (ve.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${ve.bgClass} ${ve.borderClass}`, l.className = `${ve.iconClass} mt-0.5`, d.className = `text-sm font-semibold ${ve.titleClass}`, d.textContent = ve.title, p.className = `text-xs ${ve.messageClass} mt-1`, p.textContent = ve.message, m.innerHTML = "", ve.badges.forEach((Te) => {
      const ht = document.createElement("span"), vt = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      ht.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${vt[Te.variant] || vt.blue}`, ht.innerHTML = `<i class="${Te.icon} mr-1"></i>${Te.text}`, m.appendChild(ht);
    });
  }
  function Ne() {
    n.fields.forEach((a) => {
      let l = null, d = !1;
      if (a.type === "checkbox")
        l = a.value_bool || !1, d = l;
      else if (a.type === "date_signed")
        l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = !0;
      else {
        const p = String(a.value_text || "");
        l = p || me(a), d = !!p;
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
  async function qe() {
    try {
      const a = await o.load(s.profileKey);
      a && (s.profileData = a, s.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function me(a) {
    const l = s.profileData;
    if (!l) return "";
    const d = String(a?.type || "").trim();
    return d === "name" ? mt(l.fullName || "") : d === "initials" ? mt(l.initials || "") || xn(l.fullName || n.recipientName || "") : d === "signature" ? mt(l.typedSignature || "") : "";
  }
  function U(a) {
    return !n.profile.persistDrawnSignature || !s.profileData ? "" : a?.type === "initials" && String(s.profileData.drawnInitialsDataUrl || "").trim() || String(s.profileData.drawnSignatureDataUrl || "").trim();
  }
  function be(a) {
    const l = mt(a?.value || "");
    return l || (s.profileData ? a?.type === "initials" ? mt(s.profileData.initials || "") || xn(s.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? mt(s.profileData.typedSignature || "") : "" : "");
  }
  function ke() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : s.profileRemember;
  }
  async function et(a = !1) {
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
  async function Ve(a, l = {}) {
    const d = ke();
    if (s.profileRemember = d, !d) {
      await et(!0);
      return;
    }
    if (!a) return;
    const p = {
      remember: !0
    }, m = String(a.type || "");
    if (m === "name" && typeof a.value == "string") {
      const I = mt(a.value);
      I && (p.fullName = I, (s.profileData?.initials || "").trim() || (p.initials = xn(I)));
    }
    if (m === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = mt(a.value);
        I && (p.initials = I);
      }
    }
    if (m === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof a.value == "string") {
        const I = mt(a.value);
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
  function tt() {
    const a = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    a && l && a.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function gt() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function fe() {
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
  function Ee(a) {
    if (s.isLowMemory) return;
    const l = [];
    a > 1 && l.push(a - 1), a < n.pageCount && l.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      l.forEach(async (d) => {
        !s.renderedPages.has(d) && !s.pageRendering && await Me(d);
      });
    }, { timeout: 2e3 });
  }
  async function Me(a) {
    if (!(!s.pdfDoc || s.renderedPages.has(a)))
      try {
        const l = await s.pdfDoc.getPage(a), d = s.zoomLevel, p = l.getViewport({ scale: d * window.devicePixelRatio }), m = document.createElement("canvas"), I = m.getContext("2d");
        m.width = p.width, m.height = p.height;
        const T = {
          canvasContext: I,
          viewport: p
        };
        await l.render(T).promise, s.renderedPages.set(a, {
          canvas: m,
          scale: d,
          timestamp: Date.now()
        }), fe();
      } catch (l) {
        console.warn("Preload failed for page", a, l);
      }
  }
  function nt() {
    const a = window.devicePixelRatio || 1;
    return s.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function A() {
    const a = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const d = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!d.ok)
        throw new Error("Failed to load document");
      const m = (await d.json()).assets || {}, I = m.source_url || m.executed_url || m.certificate_url || n.documentUrl;
      if (!I)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const T = pdfjsLib.getDocument(I);
      s.pdfDoc = await T.promise, n.pageCount = s.pdfDoc.numPages, document.getElementById("page-count").textContent = s.pdfDoc.numPages, await M(1), Ae(), c.trackViewerLoad(!0, Date.now() - l), c.trackPageView(1);
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
      O(l), s.currentPage = a, document.getElementById("current-page").textContent = a, Ae(), de(), Ee(a);
      return;
    }
    s.pageRendering = !0;
    try {
      const d = await s.pdfDoc.getPage(a), p = s.zoomLevel, m = nt(), I = d.getViewport({ scale: p * m }), T = d.getViewport({ scale: 1 });
      f.setPageViewport(a, {
        width: T.width,
        height: T.height,
        rotation: T.rotation || 0
      });
      const W = document.getElementById("pdf-page-1");
      W.innerHTML = "";
      const ee = document.createElement("canvas"), Pe = ee.getContext("2d");
      ee.height = I.height, ee.width = I.width, ee.style.width = `${I.width / m}px`, ee.style.height = `${I.height / m}px`, W.appendChild(ee);
      const ve = document.getElementById("pdf-container");
      ve.style.width = `${I.width / m}px`;
      const Te = {
        canvasContext: Pe,
        viewport: I
      };
      await d.render(Te).promise, s.renderedPages.set(a, {
        canvas: ee.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: I.width / m,
        displayHeight: I.height / m
      }), s.renderedPages.get(a).canvas.getContext("2d").drawImage(ee, 0, 0), fe(), s.currentPage = a, document.getElementById("current-page").textContent = a, Ae(), de(), c.trackPageView(a), Ee(a);
    } catch (d) {
      console.error("Page render error:", d);
    } finally {
      if (s.pageRendering = !1, s.pageNumPending !== null) {
        const d = s.pageNumPending;
        s.pageNumPending = null, await M(d);
      }
    }
  }
  function O(a, l) {
    const d = document.getElementById("pdf-page-1");
    d.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = a.canvas.width, p.height = a.canvas.height, p.style.width = `${a.displayWidth}px`, p.style.height = `${a.displayHeight}px`, p.getContext("2d").drawImage(a.canvas, 0, 0), d.appendChild(p);
    const I = document.getElementById("pdf-container");
    I.style.width = `${a.displayWidth}px`;
  }
  function Q(a) {
    s.pageRendering ? s.pageNumPending = a : M(a);
  }
  function ie(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? mt(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? mt(a.value) : "";
  }
  function ce(a, l, d, p = !1) {
    const m = document.createElement("img");
    m.className = "field-overlay-preview", m.src = l, m.alt = d, a.appendChild(m), a.classList.add("has-preview"), p && a.classList.add("draft-preview");
  }
  function J(a, l, d = !1, p = !1) {
    const m = document.createElement("span");
    m.className = "field-overlay-value", d && m.classList.add("font-signature"), m.textContent = l, a.appendChild(m), a.classList.add("has-value"), p && a.classList.add("draft-preview");
  }
  function ye(a, l) {
    const d = document.createElement("span");
    d.className = "field-overlay-label", d.textContent = l, a.appendChild(d);
  }
  function de() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    s.fieldState.forEach((d, p) => {
      if (d.page !== s.currentPage) return;
      const m = document.createElement("div");
      if (m.className = "field-overlay", m.dataset.fieldId = p, d.required && m.classList.add("required"), d.completed && m.classList.add("completed"), s.activeFieldId === p && m.classList.add("active"), d.posX != null && d.posY != null && d.width != null && d.height != null) {
        const Te = f.getOverlayStyles(d, l);
        m.style.left = Te.left, m.style.top = Te.top, m.style.width = Te.width, m.style.height = Te.height, m.style.transform = Te.transform, Lt.enabled && (m.dataset.debugCoords = JSON.stringify(
          f.pageToScreen(d, l)._debug
        ));
      } else {
        const Te = Array.from(s.fieldState.keys()).indexOf(p);
        m.style.left = "10px", m.style.top = `${100 + Te * 50}px`, m.style.width = "150px", m.style.height = "30px";
      }
      const T = String(d.previewSignatureUrl || "").trim(), W = String(d.signaturePreviewUrl || "").trim(), ee = ie(d), Pe = d.type === "signature" || d.type === "initials", ve = typeof d.previewValueBool == "boolean";
      if (T)
        ce(m, T, K(d.type), !0);
      else if (d.completed && W)
        ce(m, W, K(d.type));
      else if (ee) {
        const Te = typeof d.previewValueText == "string" && d.previewValueText.trim() !== "";
        J(m, ee, Pe, Te);
      } else d.type === "checkbox" && (ve ? d.previewValueBool : !!d.value) ? J(m, "Checked", !1, ve) : ye(m, K(d.type));
      m.setAttribute("tabindex", "0"), m.setAttribute("role", "button"), m.setAttribute("aria-label", `${K(d.type)} field${d.required ? ", required" : ""}${d.completed ? ", completed" : ""}`), m.addEventListener("click", () => z(p)), m.addEventListener("keydown", (Te) => {
        (Te.key === "Enter" || Te.key === " ") && (Te.preventDefault(), z(p));
      }), a.appendChild(m);
    });
  }
  function K(a) {
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
    s.currentPage <= 1 || Q(s.currentPage - 1);
  }
  function we() {
    s.currentPage >= n.pageCount || Q(s.currentPage + 1);
  }
  function Ce(a) {
    a < 1 || a > n.pageCount || Q(a);
  }
  function Ae() {
    document.getElementById("prev-page-btn").disabled = s.currentPage <= 1, document.getElementById("next-page-btn").disabled = s.currentPage >= n.pageCount;
  }
  function Ue() {
    s.zoomLevel = Math.min(s.zoomLevel + 0.25, 3), x(), Q(s.currentPage);
  }
  function y() {
    s.zoomLevel = Math.max(s.zoomLevel - 0.25, 0.5), x(), Q(s.currentPage);
  }
  function b() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, d = 612;
    s.zoomLevel = l / d, x(), Q(s.currentPage);
  }
  function x() {
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
      if (l.openEditor && (s.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), d.page !== s.currentPage && Ce(d.page), !l.openEditor) {
        G(a);
        return;
      }
      d.type !== "date_signed" && te(a);
    }
  }
  function G(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function te(a) {
    const l = s.fieldState.get(a);
    if (!l) return;
    const d = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), m = document.getElementById("field-editor-title"), I = document.getElementById("field-editor-legal-disclaimer");
    m.textContent = ae(l.type), p.innerHTML = Fe(l), I?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && je(a), d.classList.add("active"), d.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", un(d.querySelector(".field-editor")), ot(`Editing ${ae(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const T = p.querySelector("input, textarea");
      T ? T.focus() : p.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Be(s.writeCooldownUntil) > 0 && Ut(Be(s.writeCooldownUntil));
  }
  function ae(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function Fe(a) {
    const l = Le(a.type), d = St(String(a?.id || "")), p = St(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const m = a.type === "initials" ? "initials" : "signature", I = St(be(a)), T = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], W = He(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${T.map((ee) => `
            <button
              type="button"
              id="sig-tab-${ee.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${W === ee.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${ee.id}"
              data-esign-action="signature-tab"
              data-field-id="${d}"
              role="tab"
              aria-selected="${W === ee.id ? "true" : "false"}"
              aria-controls="sig-editor-${ee.id}"
              tabindex="${W === ee.id ? "0" : "-1"}"
            >
              ${ee.label}
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
  function Le(a) {
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
  function Ye(a, l, d = { syncOverlay: !1 }) {
    const p = document.getElementById("sig-type-preview"), m = s.fieldState.get(a);
    if (!m) return;
    const I = mt(String(l || "").trim());
    if (d?.syncOverlay && (I ? w(a, I) : g(a), h()), !!p) {
      if (I) {
        p.textContent = I;
        return;
      }
      p.textContent = m.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function He(a) {
    const l = String(s.signatureTabByField.get(a) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function ct(a, l) {
    const d = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    s.signatureTabByField.set(l, d), document.querySelectorAll(".sig-editor-tab").forEach((m) => {
      m.classList.remove("border-blue-600", "text-blue-600"), m.classList.add("border-transparent", "text-gray-500"), m.setAttribute("aria-selected", "false"), m.setAttribute("tabindex", "-1");
    });
    const p = document.querySelector(`.sig-editor-tab[data-tab="${d}"]`);
    if (p?.classList.add("border-blue-600", "text-blue-600"), p?.classList.remove("border-transparent", "text-gray-500"), p?.setAttribute("aria-selected", "true"), p?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", d !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", d !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", d !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", d !== "saved"), (d === "draw" || d === "upload" || d === "saved") && p && requestAnimationFrame(() => k(l)), d === "type") {
      const m = document.getElementById("sig-type-input");
      Ye(l, m?.value || "");
    }
    d === "saved" && V(l).catch(ge);
  }
  function je(a) {
    s.signatureTabByField.set(a, "draw"), ct("draw", a);
    const l = document.getElementById("sig-type-input");
    l && Ye(a, l.value || "");
  }
  function k(a) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || s.signatureCanvases.has(a)) return;
    const d = l.closest(".signature-canvas-container"), p = l.getContext("2d");
    if (!p) return;
    const m = l.getBoundingClientRect();
    if (!m.width || !m.height) return;
    const I = window.devicePixelRatio || 1;
    l.width = m.width * I, l.height = m.height * I, p.scale(I, I), p.lineCap = "round", p.lineJoin = "round", p.strokeStyle = "#1f2937", p.lineWidth = 2.5;
    let T = !1, W = 0, ee = 0, Pe = [];
    const ve = (xe) => {
      const Ge = l.getBoundingClientRect();
      let At, Pt;
      return xe.touches && xe.touches.length > 0 ? (At = xe.touches[0].clientX, Pt = xe.touches[0].clientY) : xe.changedTouches && xe.changedTouches.length > 0 ? (At = xe.changedTouches[0].clientX, Pt = xe.changedTouches[0].clientY) : (At = xe.clientX, Pt = xe.clientY), {
        x: At - Ge.left,
        y: Pt - Ge.top,
        timestamp: Date.now()
      };
    }, Te = (xe) => {
      T = !0;
      const Ge = ve(xe);
      W = Ge.x, ee = Ge.y, Pe = [{ x: Ge.x, y: Ge.y, t: Ge.timestamp, width: 2.5 }], d && d.classList.add("drawing");
    }, ht = (xe) => {
      if (!T) return;
      const Ge = ve(xe);
      Pe.push({ x: Ge.x, y: Ge.y, t: Ge.timestamp, width: 2.5 });
      const At = Ge.x - W, Pt = Ge.y - ee, Vi = Ge.timestamp - (Pe[Pe.length - 2]?.t || Ge.timestamp), Gi = Math.sqrt(At * At + Pt * Pt) / Math.max(Vi, 1), Wi = 2.5, Ji = 1.5, Yi = 4, Ki = Math.min(Gi / 5, 1), jn = Math.max(Ji, Math.min(Yi, Wi - Ki * 1.5));
      Pe[Pe.length - 1].width = jn, p.lineWidth = jn, p.beginPath(), p.moveTo(W, ee), p.lineTo(Ge.x, Ge.y), p.stroke(), W = Ge.x, ee = Ge.y;
    }, vt = () => {
      if (T = !1, Pe.length > 1) {
        const xe = s.signatureCanvases.get(a);
        xe && (xe.strokes.push(Pe.map((Ge) => ({ ...Ge }))), xe.redoStack = []), ue(a);
      }
      Pe = [], d && d.classList.remove("drawing");
    };
    l.addEventListener("mousedown", Te), l.addEventListener("mousemove", ht), l.addEventListener("mouseup", vt), l.addEventListener("mouseout", vt), l.addEventListener("touchstart", (xe) => {
      xe.preventDefault(), xe.stopPropagation(), Te(xe);
    }, { passive: !1 }), l.addEventListener("touchmove", (xe) => {
      xe.preventDefault(), xe.stopPropagation(), ht(xe);
    }, { passive: !1 }), l.addEventListener("touchend", (xe) => {
      xe.preventDefault(), vt();
    }, { passive: !1 }), l.addEventListener("touchcancel", vt), l.addEventListener("gesturestart", (xe) => xe.preventDefault()), l.addEventListener("gesturechange", (xe) => xe.preventDefault()), l.addEventListener("gestureend", (xe) => xe.preventDefault()), s.signatureCanvases.set(a, {
      canvas: l,
      ctx: p,
      dpr: I,
      drawWidth: m.width,
      drawHeight: m.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), B(a);
  }
  function B(a) {
    const l = s.signatureCanvases.get(a), d = s.fieldState.get(a);
    if (!l || !d) return;
    const p = U(d);
    p && N(a, p, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function N(a, l, d = { clearStrokes: !1 }) {
    const p = s.signatureCanvases.get(a);
    if (!p) return !1;
    const m = String(l || "").trim();
    if (!m)
      return p.baseImageDataUrl = "", p.baseImage = null, d.clearStrokes && (p.strokes = [], p.redoStack = []), Y(a), !0;
    const { drawWidth: I, drawHeight: T } = p, W = new Image();
    return await new Promise((ee) => {
      W.onload = () => {
        d.clearStrokes && (p.strokes = [], p.redoStack = []), p.baseImage = W, p.baseImageDataUrl = m, I > 0 && T > 0 && Y(a), ee(!0);
      }, W.onerror = () => ee(!1), W.src = m;
    });
  }
  function Y(a) {
    const l = s.signatureCanvases.get(a);
    if (!l) return;
    const { ctx: d, drawWidth: p, drawHeight: m, baseImage: I, strokes: T } = l;
    if (d.clearRect(0, 0, p, m), I) {
      const W = Math.min(p / I.width, m / I.height), ee = I.width * W, Pe = I.height * W, ve = (p - ee) / 2, Te = (m - Pe) / 2;
      d.drawImage(I, ve, Te, ee, Pe);
    }
    for (const W of T)
      for (let ee = 1; ee < W.length; ee++) {
        const Pe = W[ee - 1], ve = W[ee];
        d.lineWidth = Number(ve.width || 2.5) || 2.5, d.beginPath(), d.moveTo(Pe.x, Pe.y), d.lineTo(ve.x, ve.y), d.stroke();
      }
  }
  function ne(a) {
    const l = s.signatureCanvases.get(a);
    if (!l || l.strokes.length === 0) return;
    const d = l.strokes.pop();
    d && l.redoStack.push(d), Y(a), ue(a);
  }
  function re(a) {
    const l = s.signatureCanvases.get(a);
    if (!l || l.redoStack.length === 0) return;
    const d = l.redoStack.pop();
    d && l.strokes.push(d), Y(a), ue(a);
  }
  function F(a) {
    const l = s.signatureCanvases.get(a);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: d, ctx: p } = l;
    return p.getImageData(0, 0, d.width, d.height).data.some((I, T) => T % 4 === 3 && I > 0);
  }
  function ue(a) {
    const l = s.signatureCanvases.get(a);
    l && (F(a) ? E(a, l.canvas.toDataURL("image/png")) : g(a), h());
  }
  function Xe(a) {
    const l = s.signatureCanvases.get(a);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", Y(a)), g(a), h();
    const d = document.getElementById("sig-upload-preview-wrap"), p = document.getElementById("sig-upload-preview");
    d && d.classList.add("hidden"), p && p.removeAttribute("src");
  }
  function Qe() {
    const a = document.getElementById("field-editor-overlay"), l = a.querySelector(".field-editor");
    if (pn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", s.activeFieldId) {
      const d = document.querySelector(`.field-list-item[data-field-id="${s.activeFieldId}"]`);
      requestAnimationFrame(() => {
        d?.focus();
      });
    }
    v(), h(), s.activeFieldId = null, s.signatureCanvases.clear(), ot("Field editor closed.");
  }
  function Be(a) {
    const l = Number(a) || 0;
    return l <= 0 ? 0 : Math.max(0, Math.ceil((l - Date.now()) / 1e3));
  }
  function Rt(a, l = {}) {
    const d = Number(l.retry_after_seconds);
    if (Number.isFinite(d) && d > 0)
      return Math.ceil(d);
    const p = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!p) return 0;
    const m = Number(p);
    return Number.isFinite(m) && m > 0 ? Math.ceil(m) : 0;
  }
  async function at(a, l) {
    let d = {};
    try {
      d = await a.json();
    } catch {
      d = {};
    }
    const p = d?.error || {}, m = p?.details && typeof p.details == "object" ? p.details : {}, I = Rt(a, m), T = a?.status === 429, W = T ? I > 0 ? `Too many actions too quickly. Please wait ${I}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(p?.message || l || "Request failed"), ee = new Error(W);
    return ee.status = a?.status || 0, ee.code = String(p?.code || ""), ee.details = m, ee.rateLimited = T, ee.retryAfterSeconds = I, ee;
  }
  function Ut(a) {
    const l = Math.max(1, Number(a) || 1);
    s.writeCooldownUntil = Date.now() + l * 1e3, s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
    const d = () => {
      const p = document.getElementById("field-editor-save");
      if (!p) return;
      const m = Be(s.writeCooldownUntil);
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
      const p = Be(s.submitCooldownUntil);
      Mt(), p <= 0 && s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    };
    d(), s.submitCooldownTimer = setInterval(d, 250);
  }
  async function cn() {
    const a = s.activeFieldId;
    if (!a) return;
    const l = s.fieldState.get(a);
    if (!l) return;
    const d = Be(s.writeCooldownUntil);
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
        m = await ln(a, null, I?.checked || !1);
      } else {
        const T = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!T && l.required)
          throw new Error("This field is required");
        m = await ln(a, T, null);
      }
      if (m) {
        Qe(), Bn(), Mt(), zn(), de(), Fi(a), Bi(a);
        const I = On();
        I.allRequiredComplete ? ot("Field saved. All required fields complete. Ready to submit.") : ot(`Field saved. ${I.remainingRequired} required field${I.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (m) {
      m?.rateLimited && Ut(m.retryAfterSeconds), window.toastManager && window.toastManager.error(m.message), ot(`Error saving field: ${m.message}`, "assertive");
    } finally {
      if (Be(s.writeCooldownUntil) > 0) {
        const m = Be(s.writeCooldownUntil);
        p.disabled = !0, p.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${m}s`;
      } else
        p.disabled = !1, p.innerHTML = "Insert";
    }
  }
  async function Di(a) {
    const l = s.fieldState.get(a), d = document.getElementById("sig-type-input"), p = He(a);
    if (p === "draw" || p === "upload" || p === "saved") {
      const I = s.signatureCanvases.get(a);
      if (!I) return !1;
      if (!F(a))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const T = I.canvas.toDataURL("image/png");
      return await $n(a, { type: "drawn", dataUrl: T }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const I = d?.value?.trim();
      if (!I)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await ln(a, I, null) : await $n(a, { type: "typed", text: I }, I);
    }
  }
  async function ln(a, l, d) {
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
        throw await at(I, "Failed to save field");
      const T = s.fieldState.get(a);
      return T && (T.value = l ?? d, T.completed = !0, T.hasError = !1), await Ve(T), window.toastManager && window.toastManager.success("Field saved"), c.trackFieldSave(a, T?.type, !0, Date.now() - p), !0;
    } catch (I) {
      const T = s.fieldState.get(a);
      throw T && (T.hasError = !0, T.lastError = I.message), c.trackFieldSave(a, m?.type, !1, Date.now() - p, I.message), I;
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
        const ee = await L.uploadDrawnSignature(
          a,
          l.dataUrl
        );
        I = {
          field_instance_id: a,
          type: "drawn",
          value_text: d,
          object_key: ee.objectKey,
          sha256: ee.sha256,
          upload_token: ee.uploadToken
        };
      } else
        I = await Ri(a, d);
      const T = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(I)
      });
      if (!T.ok)
        throw await at(T, "Failed to save signature");
      const W = s.fieldState.get(a);
      return W && (W.value = d, W.completed = !0, W.hasError = !1, l?.dataUrl && (W.signaturePreviewUrl = l.dataUrl)), await Ve(W, {
        signatureType: m,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), c.trackSignatureAttach(a, m, !0, Date.now() - p), !0;
    } catch (I) {
      const T = s.fieldState.get(a);
      throw T && (T.hasError = !0, T.lastError = I.message), c.trackSignatureAttach(a, m, !1, Date.now() - p, I.message), I;
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
    s.fieldState.forEach((W) => {
      W.required, W.completed && a++;
    });
    const l = s.fieldState.size, d = l > 0 ? a / l * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = l;
    const p = document.getElementById("progress-ring-circle"), m = 97.4, I = m - d / 100 * m;
    p.style.strokeDashoffset = I, document.getElementById("mobile-progress").style.width = `${d}%`;
    const T = l - a;
    document.getElementById("fields-status").textContent = T > 0 ? `${T} remaining` : "All complete";
  }
  function Mt() {
    const a = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), d = document.getElementById("incomplete-message"), p = Be(s.submitCooldownUntil);
    let m = [], I = !1;
    s.fieldState.forEach((W, ee) => {
      W.required && !W.completed && m.push(W), W.hasError && (I = !0);
    });
    const T = s.hasConsented && m.length === 0 && !I && s.pendingSaves.size === 0 && p === 0 && !s.isSubmitting;
    a.disabled = !T, !s.isSubmitting && p > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s` : !s.isSubmitting && p === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), s.hasConsented ? p > 0 ? (l.classList.remove("hidden"), d.textContent = `Please wait ${p}s before submitting again.`) : I ? (l.classList.remove("hidden"), d.textContent = "Some fields failed to save. Please retry.") : m.length > 0 ? (l.classList.remove("hidden"), d.textContent = `Complete ${m.length} required field${m.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), d.textContent = "Please accept the consent agreement");
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
      const I = Number(l.tabIndex || 0), T = Number(d.tabIndex || 0);
      if (I > 0 && T > 0 && I !== T) return I - T;
      if (I > 0 != T > 0) return I > 0 ? -1 : 1;
      const W = Number(l.posY || 0), ee = Number(d.posY || 0);
      if (W !== ee) return W - ee;
      const Pe = Number(l.posX || 0), ve = Number(d.posX || 0);
      return Pe !== ve ? Pe - ve : String(l.id || "").localeCompare(String(d.id || ""));
    }), a;
  }
  function Nn(a) {
    s.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((l) => l.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((l) => l.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function Bi(a) {
    const l = $i(), d = l.filter((T) => !T.completed);
    if (d.length === 0) {
      c.track("guided_next_none_remaining", { fromFieldId: a });
      const T = document.getElementById("submit-btn");
      T?.scrollIntoView({ behavior: "smooth", block: "nearest" }), T?.focus(), ot("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const p = l.findIndex((T) => String(T.id) === String(a));
    let m = null;
    if (p >= 0) {
      for (let T = p + 1; T < l.length; T++)
        if (!l[T].completed) {
          m = l[T];
          break;
        }
    }
    if (m || (m = d[0]), !m) return;
    c.track("guided_next_started", { fromFieldId: a, toFieldId: m.id });
    const I = Number(m.page || 1);
    I !== s.currentPage && Ce(I), j(m.id, { openEditor: !1 }), Nn(m.id), setTimeout(() => {
      Nn(m.id), G(m.id), c.track("guided_next_completed", { toFieldId: m.id, page: m.page }), ot(`Next required field highlighted on page ${m.page}.`);
    }, 120);
  }
  function Un() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", un(a.querySelector(".field-editor")), ot("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function dn() {
    const a = document.getElementById("consent-modal"), l = a.querySelector(".field-editor");
    pn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ot("Consent dialog closed.");
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
        throw await at(l, "Failed to accept consent");
      s.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), dn(), Mt(), zn(), c.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ot("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), ot(`Error: ${l.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function Ui() {
    const a = document.getElementById("submit-btn"), l = Be(s.submitCooldownUntil);
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
        throw await at(p, "Failed to submit");
      c.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (d) {
      c.trackSubmit(!1, d.message), d?.rateLimited && Fn(d.retryAfterSeconds), window.toastManager && window.toastManager.error(d.message);
    } finally {
      s.isSubmitting = !1, Mt();
    }
  }
  function Hi() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", un(a.querySelector(".field-editor")), ot("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Hn() {
    const a = document.getElementById("decline-modal"), l = a.querySelector(".field-editor");
    pn(l), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ot("Decline dialog closed.");
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
        throw await at(l, "Failed to decline");
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
  const Lt = {
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
          console.log("[E-Sign Debug] Reloading viewer..."), A();
        },
        setLowMemory: (a) => {
          s.isLowMemory = a, fe(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), A(), this.updatePanel();
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
  function un(a) {
    const d = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), p = d[0], m = d[d.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function I(T) {
      T.key === "Tab" && (T.shiftKey ? document.activeElement === p && (T.preventDefault(), m?.focus()) : document.activeElement === m && (T.preventDefault(), p?.focus()));
    }
    a.addEventListener("keydown", I), a._focusTrapHandler = I, requestAnimationFrame(() => {
      p?.focus();
    });
  }
  function pn(a) {
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
    if (a.key === "Escape" && (Qe(), dn(), Hn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), d = l.indexOf(a.target);
      if (d !== -1) {
        let p = d;
        if (a.key === "ArrowRight" && (p = (d + 1) % l.length), a.key === "ArrowLeft" && (p = (d - 1 + l.length) % l.length), a.key === "Home" && (p = 0), a.key === "End" && (p = l.length - 1), p !== d) {
          a.preventDefault();
          const m = l[p], I = m.getAttribute("data-tab") || "draw", T = m.getAttribute("data-field-id");
          T && ct(I, T), m.focus();
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
    e && R(e), t && q(t), n && R(n), r && R(r);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: r } = this.elements;
    e && R(e), t && R(t), n && R(n), r && q(r);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: r, errorMessage: o, viewer: c } = this.elements;
    t && R(t), n && R(n), r && q(r), c && R(c), o && (o.textContent = e);
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
}, on = "application/vnd.google-apps.document", Dn = "application/vnd.google-apps.spreadsheet", Rn = "application/vnd.google-apps.presentation", Ti = "application/vnd.google-apps.folder", Mn = "application/pdf", Ns = [on, Mn], _i = "esign.google.account_id";
function Us(i) {
  return i.mimeType === on;
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
  return i.mimeType === on || i.mimeType === Dn || i.mimeType === Rn;
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
    [on]: "Google Doc",
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
    return Zt(t);
  if (e)
    return Zt(e);
  const n = localStorage.getItem(_i);
  return n ? Zt(n) : "";
}
function Zt(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function no(i) {
  const e = Zt(i);
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
  on as MIME_GOOGLE_DOC,
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
  lt as announce,
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
  tn as debounce,
  Ya as defaultActionErrorHandler,
  Ja as defaultActionSuccessHandler,
  oa as delegate,
  Nt as escapeHtml,
  Wa as fileSizeCellRenderer,
  Xs as formatDate,
  en as formatDateTime,
  Vs as formatDriveDate,
  qs as formatDriveFileSize,
  Yt as formatFileSize,
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
  Zt as normalizeAccountId,
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
  Dt as qsa,
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
  q as show,
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

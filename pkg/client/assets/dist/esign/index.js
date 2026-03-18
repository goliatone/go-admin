import { a as Ye } from "../chunks/html-Br-oQr7i.js";
import { p as ss } from "../chunks/date-utils-Ch6PxlHn.js";
class as {
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
      const h = await this.listAgreements({ page: t, per_page: n }), m = h.items || h.records || [];
      if (e.push(...m), m.length === 0 || e.length >= h.total)
        break;
      t += 1;
    }
    const c = {};
    for (const h of e) {
      const m = String(h?.status || "").trim().toLowerCase();
      m && (c[m] = (c[m] || 0) + 1);
    }
    const d = (c.sent || 0) + (c.in_progress || 0), s = d + (c.declined || 0);
    return {
      draft: c.draft || 0,
      sent: c.sent || 0,
      in_progress: c.in_progress || 0,
      completed: c.completed || 0,
      voided: c.voided || 0,
      declined: c.declined || 0,
      expired: c.expired || 0,
      pending: d,
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
      throw new os(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class os extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let si = null;
function uo() {
  if (!si)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return si;
}
function cs(i) {
  si = i;
}
function ls(i) {
  const e = new as(i);
  return cs(e), e;
}
function yn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function po(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function In(i, e) {
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
function go(i, e) {
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
function mo(i, e) {
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
function fo(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), r = Math.round(n / 1e3), c = Math.round(r / 60), d = Math.round(c / 60), s = Math.round(d / 24), h = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(s) >= 1 ? h.format(s, "day") : Math.abs(d) >= 1 ? h.format(d, "hour") : Math.abs(c) >= 1 ? h.format(c, "minute") : h.format(r, "second");
  } catch {
    return String(i);
  }
}
function ho(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function ds(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function vo(i) {
  return i ? i.split("_").map((e) => ds(e)).join(" ") : "";
}
function yo(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const us = {
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
function er(i) {
  const e = String(i || "").trim().toLowerCase();
  return us[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function ps(i, e) {
  const t = er(i), n = e?.showDot ?? !1, r = e?.size ?? "sm", c = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, d = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${c[r]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${d}${t.label}</span>`;
}
function bo(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = ps(i, e), t.firstElementChild;
}
function wo(i, e, t) {
  const n = er(e), r = t?.size ?? "sm", c = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${c[r]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const h = i.querySelector(".rounded-full");
    if (h)
      h.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const m = document.createElement("span");
      m.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, m.setAttribute("aria-hidden", "true"), i.prepend(m);
    }
  }
  const s = i.childNodes[i.childNodes.length - 1];
  s && s.nodeType === Node.TEXT_NODE ? s.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function g(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function Ht(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function So(i) {
  return document.getElementById(i);
}
function gs(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [r, c] of Object.entries(e))
      c !== void 0 && n.setAttribute(r, c);
  if (t)
    for (const r of t)
      typeof r == "string" ? n.appendChild(document.createTextNode(r)) : n.appendChild(r);
  return n;
}
function xo(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function Io(i, e, t, n, r) {
  const c = (d) => {
    const s = d.target.closest(e);
    s && i.contains(s) && n.call(s, d, s);
  };
  return i.addEventListener(t, c, r), () => i.removeEventListener(t, c, r);
}
function Fe(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function Y(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function B(i) {
  i && i.classList.add("hidden");
}
function Eo(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? Y(i) : B(i);
}
function Co(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Zt(i, e, t = document) {
  const n = g(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function Lo(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Zt(t, n, e);
}
function ms(i = "[data-esign-page]", e = "data-esign-config") {
  const t = g(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const r = g(
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
function mt(i, e = "polite") {
  const t = g(`[aria-live="${e}"]`) || (() => {
    const n = gs("div", {
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
async function _o(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: r = 6e4,
    maxAttempts: c = 30,
    onProgress: d,
    signal: s
  } = i, h = Date.now();
  let m = 0, b;
  for (; m < c; ) {
    if (s?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - h >= r)
      return {
        result: b,
        attempts: m,
        stopped: !1,
        timedOut: !0
      };
    if (m++, b = await e(), d && d(b, m), t(b))
      return {
        result: b,
        attempts: m,
        stopped: !0,
        timedOut: !1
      };
    await tr(n, s);
  }
  return {
    result: b,
    attempts: m,
    stopped: !1,
    timedOut: !1
  };
}
async function Ao(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: r = 3e4,
    exponentialBackoff: c = !0,
    shouldRetry: d = () => !0,
    onRetry: s,
    signal: h
  } = i;
  let m;
  for (let b = 1; b <= t; b++) {
    if (h?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (S) {
      if (m = S, b >= t || !d(S, b))
        throw S;
      const A = c ? Math.min(n * Math.pow(2, b - 1), r) : n;
      s && s(S, b, A), await tr(A, h);
    }
  }
  throw m;
}
function tr(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const r = setTimeout(t, i);
    if (e) {
      const c = () => {
        clearTimeout(r), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", c, { once: !0 });
    }
  });
}
function En(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function To(i, e) {
  let t = 0, n = null;
  return (...r) => {
    const c = Date.now();
    c - t >= e ? (t = c, i(...r)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...r);
      },
      e - (c - t)
    ));
  };
}
function Po(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function ko(i, e, t = "Operation timed out") {
  let n;
  const r = new Promise((c, d) => {
    n = setTimeout(() => {
      d(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, r]);
  } finally {
    clearTimeout(n);
  }
}
class pi {
  constructor(e) {
    this.config = e, this.client = ls({
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
    Zt('count="draft"', e.draft), Zt('count="pending"', e.pending), Zt('count="completed"', e.completed), Zt('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Do(i) {
  const e = i || ms(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new pi(e);
  return Fe(() => t.init()), t;
}
function Ro(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new pi(t);
  Fe(() => n.init());
}
typeof document < "u" && Fe(() => {
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
      const r = String(n.basePath || n.base_path || "/admin"), c = String(
        n.apiBasePath || n.api_base_path || `${r}/api`
      );
      new pi({ basePath: r, apiBasePath: c }).init();
    }
  }
});
class nr {
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
      const r = g(`#artifacts-${n}`);
      r && (n === e ? Y(r) : B(r));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = g("#artifact-executed"), n = g("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), Y(t));
    }
    if (e.source) {
      const t = g("#artifact-source"), n = g("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), Y(t));
    }
    if (e.certificate) {
      const t = g("#artifact-certificate"), n = g("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), Y(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function Mo(i) {
  const e = new nr(i);
  return Fe(() => e.init()), e;
}
function $o(i) {
  const e = new nr(i);
  Fe(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function fs(i = document) {
  Ht("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = yn(t));
  });
}
function hs(i = document) {
  Ht("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = In(t));
  });
}
function vs(i = document) {
  fs(i), hs(i);
}
function ys() {
  Fe(() => {
    vs();
  });
}
typeof document < "u" && ys();
const Ri = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class ir {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), r = e.get("error_description"), c = e.get("state"), d = this.parseOAuthState(c);
    d.account_id || (d.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, r, d) : t ? this.handleSuccess(t, d) : this.handleError("unknown", "No authorization code was received from Google.", d);
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
    switch (B(t), B(n), B(r), e) {
      case "loading":
        Y(t);
        break;
      case "success":
        Y(n);
        break;
      case "error":
        Y(r);
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
    const { errorMessage: r, errorDetail: c, closeBtn: d } = this.elements;
    r && (r.textContent = Ri[e] || Ri.unknown), t && c && (c.textContent = t, Y(c)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), r = new URLSearchParams(window.location.search), c = r.get("state"), s = this.parseOAuthState(c).account_id || r.get("account_id");
      s && n.searchParams.set("account_id", s), window.location.href = n.toString();
    }
  }
}
function Bo(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new ir(e);
  return Fe(() => t.init()), t;
}
function Fo(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new ir(e);
  Fe(() => t.init());
}
const Yn = "esign.google.account_id", bs = {
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
class rr {
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
      retryBtn: r,
      reauthBtn: c,
      oauthCancelBtn: d,
      disconnectCancelBtn: s,
      disconnectConfirmBtn: h,
      accountIdInput: m,
      oauthModal: b,
      disconnectModal: S
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), c && c.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, S && Y(S);
    }), s && s.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, S && B(S);
    }), h && h.addEventListener("click", () => this.disconnect()), d && d.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), r && r.addEventListener("click", () => this.checkStatus()), m && (m.addEventListener("change", () => {
      this.setCurrentAccountId(m.value, !0);
    }), m.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(m.value, !0));
    }));
    const { accountDropdown: A, connectFirstBtn: E } = this.elements;
    A && A.addEventListener("change", () => {
      A.value === "__new__" ? (A.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(A.value, !0);
    }), E && E.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (b && !b.classList.contains("hidden") && this.cancelOAuthFlow(), S && !S.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, B(S)));
    }), [b, S].forEach((f) => {
      f && f.addEventListener("click", (L) => {
        const x = L.target;
        (x === f || x.getAttribute("aria-hidden") === "true") && (B(f), f === b ? this.cancelOAuthFlow() : f === S && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Yn)
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
      this.currentAccountId ? window.localStorage.setItem(Yn, this.currentAccountId) : window.localStorage.removeItem(Yn);
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
    const { loadingState: t, disconnectedState: n, connectedState: r, errorState: c } = this.elements;
    switch (B(t), B(n), B(r), B(c), e) {
      case "loading":
        Y(t);
        break;
      case "disconnected":
        Y(n);
        break;
      case "connected":
        Y(r);
        break;
      case "error":
        Y(c);
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
        let c = `Failed to check status: ${e.status}`;
        try {
          const d = await e.json();
          d?.error?.message && (c = d.error.message);
        } catch {
        }
        throw new Error(c);
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
    const t = (L, x) => {
      for (const _ of L)
        if (Object.prototype.hasOwnProperty.call(e, _) && e[_] !== void 0 && e[_] !== null)
          return e[_];
      return x;
    }, n = t(["expires_at", "ExpiresAt"], ""), r = t(["scopes", "Scopes"], []), c = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), d = t(["connected", "Connected"], !1), s = t(["degraded", "Degraded"], !1), h = t(["degraded_reason", "DegradedReason"], ""), m = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), b = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), S = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let A = t(["is_expired", "IsExpired"], void 0), E = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof A != "boolean" || typeof E != "boolean") && n) {
      const L = new Date(n);
      if (!Number.isNaN(L.getTime())) {
        const x = L.getTime() - Date.now(), _ = 5 * 60 * 1e3;
        A = x <= 0, E = x > 0 && x <= _;
      }
    }
    const f = typeof S == "boolean" ? S : (A === !0 || E === !0) && !b;
    return {
      connected: d,
      account_id: c,
      email: m,
      scopes: Array.isArray(r) ? r : [],
      expires_at: n,
      is_expired: A === !0,
      is_expiring_soon: E === !0,
      can_auto_refresh: b,
      needs_reauthorization: f,
      degraded: s,
      degraded_reason: h
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: r, expiryInfo: c, reauthWarning: d, reauthReason: s } = this.elements;
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
        const r = bs[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, r, c) {
    const { expiryInfo: d, reauthWarning: s, reauthReason: h } = this.elements;
    if (!d) return;
    if (d.classList.remove("text-red-600", "text-amber-600"), d.classList.add("text-gray-500"), !e) {
      d.textContent = "Access token status unknown", s && B(s);
      return;
    }
    const m = new Date(e), b = /* @__PURE__ */ new Date(), S = Math.max(
      1,
      Math.round((m.getTime() - b.getTime()) / (1e3 * 60))
    );
    t ? r ? (d.textContent = "Access token expired, but refresh is available and will be applied automatically.", d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), s && B(s)) : (d.textContent = "Access token has expired. Please re-authorize.", d.classList.remove("text-gray-500"), d.classList.add("text-red-600"), s && Y(s), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), r ? (d.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}. Refresh is available automatically.`, s && B(s)) : (d.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}`, s && Y(s), h && (h.textContent = `Your access token will expire in ${S} minute${S !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (d.textContent = `Token valid until ${m.toLocaleDateString()} ${m.toLocaleTimeString()}`, s && B(s)), !c && s && B(s);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: r } = this.elements;
    n && (e ? (Y(n), r && (r.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : B(n));
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
    for (const c of this.accounts) {
      const d = this.normalizeAccountId(c.account_id);
      if (n.has(d))
        continue;
      n.add(d);
      const s = document.createElement("option");
      s.value = d;
      const h = c.email || d || "Default", m = c.status !== "connected" ? ` (${c.status})` : "";
      s.textContent = `${h}${m}`, d === this.currentAccountId && (s.selected = !0), e.appendChild(s);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const c = document.createElement("option");
      c.value = this.currentAccountId, c.textContent = `${this.currentAccountId} (new)`, c.selected = !0, e.appendChild(c);
    }
    const r = document.createElement("option");
    r.value = "__new__", r.textContent = "+ Connect New Account...", e.appendChild(r);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && B(e), this.accounts.length === 0) {
      t && Y(t), n && B(n);
      return;
    }
    t && B(t), n && (Y(n), n.innerHTML = this.accounts.map((r) => this.renderAccountCard(r)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, c = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, d = t ? "ring-2 ring-blue-500" : "", s = n[e.status] || "bg-white border-gray-200", h = r[e.status] || "bg-gray-100 text-gray-700", m = c[e.status] || e.status, b = e.account_id || "default", S = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${s} ${d} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(b)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${h}">
              ${m}
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
      r.addEventListener("click", (c) => {
        const s = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(s, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((r) => {
      r.addEventListener("click", (c) => {
        const s = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(s, !1), this.startOAuthFlow(s);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((r) => {
      r.addEventListener("click", (c) => {
        const s = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = s, t && Y(t);
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
    t && Y(t);
    const r = this.resolveOAuthRedirectURI(), c = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = c;
    const d = this.buildGoogleOAuthUrl(r, c);
    if (!d) {
      t && B(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const s = 500, h = 600, m = (window.screen.width - s) / 2, b = (window.screen.height - h) / 2;
    if (this.oauthWindow = window.open(
      d,
      "google_oauth",
      `width=${s},height=${h},left=${m},top=${b},popup=yes`
    ), !this.oauthWindow) {
      t && B(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (S) => this.handleOAuthCallback(S), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && B(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const c = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    c && n.add(c);
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
    if (this.cleanupOAuthFlow(), n && B(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const r = this.resolveOAuthRedirectURI(), d = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        d !== this.currentAccountId && this.setCurrentAccountId(d, !1);
        const s = await fetch(
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
        const c = r instanceof Error ? r.message : "Unknown error";
        this.showToast(`Failed to connect: ${c}`, "error"), this.announce(`Failed to connect: ${c}`);
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
    e && B(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && B(e);
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
function No(i) {
  const e = new rr(i);
  return Fe(() => e.init()), e;
}
function Ho(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new rr(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Jn = "esign.google.account_id", Mi = {
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
class sr {
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
      loadMoreBtn: r,
      importBtn: c,
      clearSelectionBtn: d,
      importCancelBtn: s,
      importConfirmBtn: h,
      importForm: m,
      importModal: b,
      viewListBtn: S,
      viewGridBtn: A
    } = this.elements;
    if (e) {
      const f = En(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (L) => {
        L.key === "Enter" && (L.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), r && r.addEventListener("click", () => this.loadMore()), c && c.addEventListener("click", () => this.showImportModal()), d && d.addEventListener("click", () => this.clearSelection()), s && s.addEventListener("click", () => this.hideImportModal()), h && m && m.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), b && b.addEventListener("click", (f) => {
      const L = f.target;
      (L === b || L.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), S && S.addEventListener("click", () => this.setViewMode("list")), A && A.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && b && !b.classList.contains("hidden") && this.hideImportModal();
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
        window.localStorage.getItem(Jn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, Y(e)) : B(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Jn, this.currentAccountId) : window.localStorage.removeItem(Jn);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), c = String(e.modifiedTime || e.ModifiedTime || "").trim(), d = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), s = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), m = Array.isArray(e.parents) ? e.parents : s ? [s] : [], b = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
      modifiedTime: c,
      webViewLink: d,
      parents: m,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && Y(t));
    try {
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      let c;
      this.searchQuery ? c = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : c = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(r.id)}`
      ), this.nextPageToken && (c += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const d = await fetch(c, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        throw new Error(`Failed to load files: ${d.status}`);
      const s = await d.json(), h = Array.isArray(s.files) ? s.files.map((m) => this.normalizeDriveFile(m)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.nextPageToken = s.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), mt(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (r) {
      console.error("Error loading files:", r), this.renderError(r instanceof Error ? r.message : "Failed to load files"), mt("Error loading files");
    } finally {
      this.isLoading = !1, t && B(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && B(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = $i.includes(e.mimeType), r = this.selectedFile?.id === e.id, c = Mi[e.mimeType] || Mi.default, d = this.getFileIcon(c);
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
          ${d}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${In(e.modifiedTime)}
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
    const r = n.dataset.fileId, c = n.dataset.isFolder === "true";
    r && (c ? this.navigateToFolder(r) : this.selectFile(r));
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
      previewTitle: r,
      previewType: c,
      previewFileId: d,
      previewOwner: s,
      previewModified: h,
      importBtn: m,
      openInGoogleBtn: b
    } = this.elements;
    if (!this.selectedFile) {
      e && Y(e), t && B(t);
      return;
    }
    e && B(e), t && Y(t);
    const S = this.selectedFile, A = $i.includes(S.mimeType);
    r && (r.textContent = S.name), c && (c.textContent = this.getMimeTypeLabel(S.mimeType)), d && (d.textContent = S.id), s && S.owners.length > 0 && (s.textContent = S.owners[0].emailAddress || "-"), h && (h.textContent = In(S.modifiedTime)), m && (A ? (m.removeAttribute("disabled"), m.classList.remove("opacity-50", "cursor-not-allowed")) : (m.setAttribute("disabled", "true"), m.classList.add("opacity-50", "cursor-not-allowed"))), b && S.webViewLink && (b.href = S.webViewLink);
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
      B(e), t && (t.textContent = "Search Results");
      return;
    }
    Y(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const r = e.querySelector("ol");
    r && (r.innerHTML = this.currentFolderPath.map(
      (c, d) => `
        <li class="flex items-center">
          ${d > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(c.id)}"
            data-folder-index="${d}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(c.name)}
          </button>
        </li>
      `
    ).join(""), Ht(".breadcrumb-item", r).forEach((c) => {
      c.addEventListener("click", () => {
        const d = parseInt(c.dataset.folderIndex || "0", 10);
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
    e && (this.nextPageToken ? Y(e) : B(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? Y(t) : B(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && B(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
      const c = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = c;
    }
    r && (r.value = ""), e && Y(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && B(e);
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
      importAgreementTitle: c
    } = this.elements, d = this.selectedFile.id, s = r?.value.trim() || this.selectedFile.name, h = c?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && Y(t), n && (n.textContent = "Importing...");
    try {
      const m = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: d,
          document_title: s,
          agreement_title: h || void 0
        })
      });
      if (!m.ok) {
        const S = await m.json();
        throw new Error(S.error?.message || "Import failed");
      }
      const b = await m.json();
      this.showToast("Import started successfully", "success"), mt("Import started"), this.hideImportModal(), b.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${b.document.id}` : b.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${b.agreement.id}`);
    } catch (m) {
      console.error("Import error:", m);
      const b = m instanceof Error ? m.message : "Import failed";
      this.showToast(b, "error"), mt(`Error: ${b}`);
    } finally {
      e && e.removeAttribute("disabled"), t && B(t), n && (n.textContent = "Import");
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
function Uo(i) {
  const e = new sr(i);
  return Fe(() => e.init()), e;
}
function zo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new sr(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class ar {
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
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", r = t?.value || "";
    try {
      const c = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      c.searchParams.set("range", n), r && c.searchParams.set("provider", r);
      const d = await fetch(c.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        this.healthData = this.generateMockHealthData(n, r);
      else {
        const s = await d.json();
        this.healthData = s;
      }
      this.renderHealthData(), mt("Health data refreshed");
    } catch (c) {
      console.error("Failed to load health data:", c), this.healthData = this.generateMockHealthData(n, r), this.renderHealthData();
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
    for (let c = 0; c < e; c++) {
      const d = n[Math.floor(Math.random() * n.length)], s = r[Math.floor(Math.random() * r.length)];
      t.push({
        type: d,
        provider: s,
        message: this.getActivityMessage(d, s),
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
    const n = [], r = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, c = /* @__PURE__ */ new Date();
    for (let d = e - 1; d >= 0; d--) {
      const s = new Date(c.getTime() - d * 36e5);
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
      const c = r.healthTrend >= 0 ? "+" : "";
      n.textContent = `${c}${r.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: r } = this.elements, c = this.healthData.syncStats;
    e && (e.textContent = `${c.successRate.toFixed(1)}%`), t && (t.textContent = `${c.succeeded} succeeded`), n && (n.textContent = `${c.failed} failed`), r && (r.style.width = `${c.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: r } = this.elements, c = this.healthData.conflictStats;
    if (e && (e.textContent = String(c.pending)), t && (t.textContent = `${c.pending} pending`), n && (n.textContent = `${c.resolvedToday} resolved today`), r) {
      const d = c.trend >= 0 ? "+" : "";
      r.textContent = `${d}${c.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: r } = this.elements, c = this.healthData.retryStats;
    e && (e.textContent = String(c.total)), t && (t.textContent = `${c.recoveryRate}%`), n && (n.textContent = c.avgAttempts.toFixed(1)), r && (r.innerHTML = c.recent.map(
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
      r.addEventListener("click", (c) => this.dismissAlert(c));
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
    const { alertsList: r, noAlerts: c, alertCount: d } = this.elements, s = r?.querySelectorAll(":scope > div").length || 0;
    d && (d.textContent = `${s} active`, s === 0 && (d.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", r && r.classList.add("hidden"), c && c.classList.remove("hidden")));
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
    const c = document.getElementById(e);
    if (!c) return;
    const d = c.getContext("2d");
    if (!d) return;
    const s = c.width, h = c.height, m = 40, b = s - m * 2, S = h - m * 2;
    d.clearRect(0, 0, s, h);
    const A = t.labels, E = Object.values(t.datasets), f = b / A.length / (E.length + 1), L = Math.max(...E.flat()) || 1;
    A.forEach((x, _) => {
      const N = m + _ * b / A.length + f / 2;
      E.forEach((j, F) => {
        const $ = j[_] / L * S, P = N + F * f, Q = h - m - $;
        d.fillStyle = n[F] || "#6b7280", d.fillRect(P, Q, f - 2, $);
      }), _ % Math.ceil(A.length / 6) === 0 && (d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "center", d.fillText(x, N + E.length * f / 2, h - m + 15));
    }), d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "right";
    for (let x = 0; x <= 4; x++) {
      const _ = h - m - x * S / 4, N = Math.round(L * x / 4);
      d.fillText(N.toString(), m - 5, _ + 3);
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
function Oo(i) {
  const e = new ar(i);
  return Fe(() => e.init()), e;
}
function jo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new ar(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class or {
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
      cancelModalBtn: r,
      refreshBtn: c,
      retryBtn: d,
      addFieldBtn: s,
      addRuleBtn: h,
      validateBtn: m,
      mappingForm: b,
      publishCancelBtn: S,
      publishConfirmBtn: A,
      deleteCancelBtn: E,
      deleteConfirmBtn: f,
      closePreviewBtn: L,
      loadSampleBtn: x,
      runPreviewBtn: _,
      clearPreviewBtn: N,
      previewSourceInput: j,
      searchInput: F,
      filterStatus: $,
      filterProvider: P,
      mappingModal: Q,
      publishModal: re,
      deleteModal: Z,
      previewModal: J
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.closeModal()), c?.addEventListener("click", () => this.loadMappings()), d?.addEventListener("click", () => this.loadMappings()), s?.addEventListener("click", () => this.addSchemaField()), h?.addEventListener("click", () => this.addMappingRule()), m?.addEventListener("click", () => this.validateMapping()), b?.addEventListener("submit", (ge) => {
      ge.preventDefault(), this.saveMapping();
    }), S?.addEventListener("click", () => this.closePublishModal()), A?.addEventListener("click", () => this.publishMapping()), E?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), L?.addEventListener("click", () => this.closePreviewModal()), x?.addEventListener("click", () => this.loadSamplePayload()), _?.addEventListener("click", () => this.runPreviewTransform()), N?.addEventListener("click", () => this.clearPreview()), j?.addEventListener("input", En(() => this.validateSourceJson(), 300)), F?.addEventListener("input", En(() => this.renderMappings(), 300)), $?.addEventListener("change", () => this.renderMappings()), P?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ge) => {
      ge.key === "Escape" && (Q && !Q.classList.contains("hidden") && this.closeModal(), re && !re.classList.contains("hidden") && this.closePublishModal(), Z && !Z.classList.contains("hidden") && this.closeDeleteModal(), J && !J.classList.contains("hidden") && this.closePreviewModal());
    }), [Q, re, Z, J].forEach((ge) => {
      ge?.addEventListener("click", (ne) => {
        const Te = ne.target;
        (Te === ge || Te.getAttribute("aria-hidden") === "true") && (ge === Q ? this.closeModal() : ge === re ? this.closePublishModal() : ge === Z ? this.closeDeleteModal() : ge === J && this.closePreviewModal());
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
    const { loadingState: t, emptyState: n, errorState: r, mappingsList: c } = this.elements;
    switch (B(t), B(n), B(r), B(c), e) {
      case "loading":
        Y(t);
        break;
      case "empty":
        Y(n);
        break;
      case "error":
        Y(r);
        break;
      case "list":
        Y(c);
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
    const c = (t?.value || "").toLowerCase(), d = n?.value || "", s = r?.value || "", h = this.mappings.filter((m) => !(c && !m.name.toLowerCase().includes(c) && !m.provider.toLowerCase().includes(c) || d && m.status !== d || s && m.provider !== s));
    if (h.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = h.map(
      (m) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(m.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(m.compiled_hash ? m.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(m.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(m.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${m.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(m.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Preview ${this.escapeHtml(m.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Edit ${this.escapeHtml(m.name)}">
              Edit
            </button>
            ${m.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Publish ${this.escapeHtml(m.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Delete ${this.escapeHtml(m.name)}">
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
      schemaObjectTypeInput: c,
      schemaVersionInput: d,
      schemaFieldsContainer: s,
      mappingRulesContainer: h
    } = this.elements, m = [];
    s?.querySelectorAll(".schema-field-row").forEach((S) => {
      m.push({
        object: (S.querySelector(".field-object")?.value || "").trim(),
        field: (S.querySelector(".field-name")?.value || "").trim(),
        type: S.querySelector(".field-type")?.value || "string",
        required: S.querySelector(".field-required")?.checked || !1
      });
    });
    const b = [];
    return h?.querySelectorAll(".mapping-rule-row").forEach((S) => {
      b.push({
        source_object: (S.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (S.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: S.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (S.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: r?.value.trim() || "",
      external_schema: {
        object_type: c?.value.trim() || "",
        version: d?.value.trim() || void 0,
        fields: m
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
      mappingNameInput: r,
      mappingProviderInput: c,
      schemaObjectTypeInput: d,
      schemaVersionInput: s,
      schemaFieldsContainer: h,
      mappingRulesContainer: m,
      mappingStatusBadge: b,
      formValidationStatus: S
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), r && (r.value = e.name || ""), c && (c.value = e.provider || "");
    const A = e.external_schema || { object_type: "", fields: [] };
    d && (d.value = A.object_type || ""), s && (s.value = A.version || ""), h && (h.innerHTML = "", (A.fields || []).forEach((E) => h.appendChild(this.createSchemaFieldRow(E)))), m && (m.innerHTML = "", (e.rules || []).forEach((E) => m.appendChild(this.createMappingRuleRow(E)))), e.status && b ? (b.innerHTML = this.getStatusBadge(e.status), b.classList.remove("hidden")) : b && b.classList.add("hidden"), B(S);
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
      mappingRulesContainer: c,
      mappingStatusBadge: d,
      formValidationStatus: s
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), r && (r.innerHTML = ""), c && (c.innerHTML = ""), d && d.classList.add("hidden"), B(s), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), Y(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: r, mappingNameInput: c } = this.elements;
    this.editingMappingId = e, r && (r.textContent = "Edit Mapping Specification"), this.populateForm(t), Y(n), c?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    B(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: r, publishMappingVersion: c } = this.elements;
    this.pendingPublishId = e, r && (r.textContent = t.name), c && (c.textContent = `v${t.version || 1}`), Y(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    B(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, Y(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    B(this.elements.deleteModal), this.pendingDeleteId = null;
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
      }), c = await r.json();
      if (r.ok && c.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((c.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const d = c.errors || [c.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${d.map((s) => `<li>${this.escapeHtml(s)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      Y(t);
    } catch (r) {
      console.error("Validation error:", r), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(r instanceof Error ? r.message : "Unknown error")}</div>`, Y(t));
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
      const n = !!t.id, r = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, d = await fetch(r, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!d.ok) {
        const s = await d.json();
        throw new Error(s.error?.message || `HTTP ${d.status}`);
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
    const t = this.mappings.find((b) => b.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: r,
      previewMappingProvider: c,
      previewObjectType: d,
      previewMappingStatus: s,
      previewSourceInput: h,
      sourceSyntaxError: m
    } = this.elements;
    this.currentPreviewMapping = t, r && (r.textContent = t.name), c && (c.textContent = t.provider), d && (d.textContent = t.external_schema?.object_type || "-"), s && (s.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), h && (h.value = ""), B(m), Y(n), h?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    B(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: r, previewSuccess: c } = this.elements;
    switch (B(t), B(n), B(r), B(c), e) {
      case "empty":
        Y(t);
        break;
      case "loading":
        Y(n);
        break;
      case "error":
        Y(r);
        break;
      case "success":
        Y(c);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, r = n.object_type || "data", c = n.fields || [], d = {}, s = {};
    c.forEach((h) => {
      const m = h.field || "field";
      switch (h.type) {
        case "string":
          s[m] = m === "email" ? "john.doe@example.com" : m === "name" ? "John Doe" : `sample_${m}`;
          break;
        case "number":
          s[m] = 123;
          break;
        case "boolean":
          s[m] = !0;
          break;
        case "date":
          s[m] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          s[m] = `sample_${m}`;
      }
    }), d[r] = s, e && (e.value = JSON.stringify(d, null, 2)), B(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return B(t), null;
    try {
      const r = JSON.parse(n);
      return B(t), r;
    } catch (r) {
      return t && (t.textContent = `JSON Syntax Error: ${r instanceof Error ? r.message : "Invalid JSON"}`, Y(t)), null;
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
    }, c = {}, d = {}, s = [];
    return n.forEach((h) => {
      const m = this.resolveSourceValue(e, h.source_object, h.source_field), b = m !== void 0;
      if (r.matched_rules.push({
        source: h.source_field,
        matched: b,
        value: m
      }), !!b)
        switch (h.target_entity) {
          case "participant":
            c[h.target_path] = m;
            break;
          case "agreement":
            d[h.target_path] = m;
            break;
          case "field_definition":
            s.push({ path: h.target_path, value: m });
            break;
        }
    }), Object.keys(c).length > 0 && r.participants.push({
      ...c,
      role: c.role || "signer",
      signing_stage: c.signing_stage || 1
    }), r.agreement = d, r.field_definitions = s, r;
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
          const c = e[r];
          if (n in c)
            return c[n];
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
      fieldsCount: c,
      previewMetadata: d,
      previewRawJson: s,
      previewRulesTbody: h
    } = this.elements, m = e.participants || [];
    n && (n.textContent = `(${m.length})`), t && (m.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = m.map(
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
    const b = e.field_definitions || [];
    c && (c.textContent = `(${b.length})`), r && (b.length === 0 ? r.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : r.innerHTML = b.map(
      (E) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(E.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(E.value))}</span>
          </div>
        `
    ).join(""));
    const S = e.agreement || {}, A = Object.entries(S);
    d && (A.length === 0 ? d.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : d.innerHTML = A.map(
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
    e && (e.value = ""), B(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function qo(i) {
  const e = new or(i);
  return Fe(() => e.init()), e;
}
function Vo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new or(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class cr {
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
      filterStatus: r,
      filterProvider: c,
      filterEntity: d,
      actionResolveBtn: s,
      actionIgnoreBtn: h,
      cancelResolveBtn: m,
      resolveForm: b,
      conflictDetailModal: S,
      resolveModal: A
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), r?.addEventListener("change", () => this.loadConflicts()), c?.addEventListener("change", () => this.renderConflicts()), d?.addEventListener("change", () => this.renderConflicts()), s?.addEventListener("click", () => this.openResolveModal("resolved")), h?.addEventListener("click", () => this.openResolveModal("ignored")), m?.addEventListener("click", () => this.closeResolveModal()), b?.addEventListener("submit", (E) => this.submitResolution(E)), document.addEventListener("keydown", (E) => {
      E.key === "Escape" && (A && !A.classList.contains("hidden") ? this.closeResolveModal() : S && !S.classList.contains("hidden") && this.closeConflictDetail());
    }), [S, A].forEach((E) => {
      E?.addEventListener("click", (f) => {
        const L = f.target;
        (L === E || L.getAttribute("aria-hidden") === "true") && (E === S ? this.closeConflictDetail() : E === A && this.closeResolveModal());
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
    const { loadingState: t, emptyState: n, errorState: r, conflictsList: c } = this.elements;
    switch (B(t), B(n), B(r), B(c), e) {
      case "loading":
        Y(t);
        break;
      case "empty":
        Y(n);
        break;
      case "error":
        Y(r);
        break;
      case "list":
        Y(c);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, r = this.conflicts.filter((s) => s.status === "pending").length, c = this.conflicts.filter((s) => s.status === "resolved").length, d = this.conflicts.filter((s) => s.status === "ignored").length;
    e && (e.textContent = String(r)), t && (t.textContent = String(c)), n && (n.textContent = String(d));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: r } = this.elements;
    if (!e) return;
    const c = t?.value || "", d = n?.value || "", s = r?.value || "", h = this.conflicts.filter((m) => !(c && m.status !== c || d && m.provider !== d || s && m.entity_kind !== s));
    if (h.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = h.map(
      (m) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(m.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${m.status === "pending" ? "bg-amber-100" : m.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${m.status === "pending" ? "text-amber-600" : m.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(m.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(m.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(m.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((m.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(m.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(m.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((m) => {
      m.addEventListener("click", () => this.openConflictDetail(m.dataset.id || ""));
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
      detailReason: r,
      detailEntityType: c,
      detailStatusBadge: d,
      detailProvider: s,
      detailExternalId: h,
      detailInternalId: m,
      detailBindingId: b,
      detailConflictId: S,
      detailRunId: A,
      detailCreatedAt: E,
      detailVersion: f,
      detailPayload: L,
      resolutionSection: x,
      actionButtons: _,
      detailResolvedAt: N,
      detailResolvedBy: j,
      detailResolution: F
    } = this.elements;
    if (r && (r.textContent = t.reason || "Data conflict"), c && (c.textContent = t.entity_kind || "-"), d && (d.innerHTML = this.getStatusBadge(t.status)), s && (s.textContent = t.provider || "-"), h && (h.textContent = t.external_id || "-"), m && (m.textContent = t.internal_id || "-"), b && (b.textContent = t.binding_id || "-"), S && (S.textContent = t.id), A && (A.textContent = t.run_id || "-"), E && (E.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), L)
      try {
        const $ = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        L.textContent = JSON.stringify($, null, 2);
      } catch {
        L.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (Y(x), B(_), N && (N.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), j && (j.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), F)
        try {
          const $ = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          F.textContent = JSON.stringify($, null, 2);
        } catch {
          F.textContent = t.resolution_json || "{}";
        }
    } else
      B(x), Y(_);
    Y(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    B(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: r } = this.elements;
    n?.reset(), r && (r.value = e), Y(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    B(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const r = new FormData(t);
    let c = {};
    const d = r.get("resolution");
    if (d)
      try {
        c = JSON.parse(d);
      } catch {
        c = { raw: d };
      }
    const s = r.get("notes");
    s && (c.notes = s);
    const h = {
      status: r.get("status"),
      resolution: c
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const m = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(h)
      });
      if (!m.ok) {
        const b = await m.json();
        throw new Error(b.error?.message || `HTTP ${m.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (m) {
      console.error("Resolution error:", m);
      const b = m instanceof Error ? m.message : "Unknown error";
      this.showToast(`Failed: ${b}`, "error");
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
function Go(i) {
  const e = new cr(i);
  return Fe(() => e.init()), e;
}
function Wo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new cr(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class lr {
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
      startSyncForm: r,
      refreshBtn: c,
      retryBtn: d,
      closeDetailBtn: s,
      filterProvider: h,
      filterStatus: m,
      filterDirection: b,
      actionResumeBtn: S,
      actionRetryBtn: A,
      actionCompleteBtn: E,
      actionFailBtn: f,
      actionDiagnosticsBtn: L,
      startSyncModal: x,
      runDetailModal: _
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (N) => this.startSync(N)), c?.addEventListener("click", () => this.loadSyncRuns()), d?.addEventListener("click", () => this.loadSyncRuns()), s?.addEventListener("click", () => this.closeRunDetail()), h?.addEventListener("change", () => this.renderTimeline()), m?.addEventListener("change", () => this.renderTimeline()), b?.addEventListener("change", () => this.renderTimeline()), S?.addEventListener("click", () => this.runAction("resume")), A?.addEventListener("click", () => this.runAction("resume")), E?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), L?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (N) => {
      N.key === "Escape" && (x && !x.classList.contains("hidden") && this.closeStartSyncModal(), _ && !_.classList.contains("hidden") && this.closeRunDetail());
    }), [x, _].forEach((N) => {
      N?.addEventListener("click", (j) => {
        const F = j.target;
        (F === N || F.getAttribute("aria-hidden") === "true") && (N === x ? this.closeStartSyncModal() : N === _ && this.closeRunDetail());
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
    const { loadingState: t, emptyState: n, errorState: r, runsTimeline: c } = this.elements;
    switch (B(t), B(n), B(r), B(c), e) {
      case "loading":
        Y(t);
        break;
      case "empty":
        Y(n);
        break;
      case "error":
        Y(r);
        break;
      case "list":
        Y(c);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: r } = this.elements, c = this.syncRuns.length, d = this.syncRuns.filter(
      (m) => m.status === "running" || m.status === "pending"
    ).length, s = this.syncRuns.filter((m) => m.status === "completed").length, h = this.syncRuns.filter((m) => m.status === "failed").length;
    e && (e.textContent = String(c)), t && (t.textContent = String(d)), n && (n.textContent = String(s)), r && (r.textContent = String(h));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const r = t?.value || "", c = n?.value || "", d = this.syncRuns.filter((s) => !(r && s.status !== r || c && s.direction !== c));
    if (d.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = d.map(
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
    t?.reset(), Y(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    B(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const r = new FormData(t), c = {
      provider: r.get("provider"),
      direction: r.get("direction"),
      mapping_spec_id: r.get("mapping_spec_id"),
      cursor: r.get("cursor") || void 0
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
        body: JSON.stringify(c)
      });
      if (!d.ok) {
        const s = await d.json();
        throw new Error(s.error?.message || `HTTP ${d.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (d) {
      console.error("Start sync error:", d);
      const s = d instanceof Error ? d.message : "Unknown error";
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
    const t = this.syncRuns.find((j) => j.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: r,
      detailProvider: c,
      detailDirection: d,
      detailStatus: s,
      detailStarted: h,
      detailCompleted: m,
      detailCursor: b,
      detailAttempt: S,
      detailErrorSection: A,
      detailLastError: E,
      detailCheckpoints: f,
      actionResumeBtn: L,
      actionRetryBtn: x,
      actionCompleteBtn: _,
      actionFailBtn: N
    } = this.elements;
    r && (r.textContent = t.id), c && (c.textContent = t.provider), d && (d.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), s && (s.innerHTML = this.getStatusBadge(t.status)), h && (h.textContent = this.formatDate(t.started_at)), m && (m.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), b && (b.textContent = t.cursor || "-"), S && (S.textContent = String(t.attempt_count || 1)), t.last_error ? (E && (E.textContent = t.last_error), Y(A)) : B(A), L && L.classList.toggle("hidden", t.status !== "running"), x && x.classList.toggle("hidden", t.status !== "failed"), _ && _.classList.toggle("hidden", t.status !== "running"), N && N.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), Y(n);
    try {
      const j = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (j.ok) {
        const F = await j.json();
        this.renderCheckpoints(F.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (j) {
      console.error("Error loading checkpoints:", j), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    B(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: r, actionFailBtn: c } = this.elements, d = e === "resume" ? t : e === "complete" ? r : c, s = e === "resume" ? n : null;
    if (!d) return;
    d.setAttribute("disabled", "true"), s?.setAttribute("disabled", "true");
    const h = d.innerHTML;
    d.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const m = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, b = await fetch(m, {
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
        const S = await b.json();
        throw new Error(S.error?.message || `HTTP ${b.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (m) {
      console.error(`${e} error:`, m);
      const b = m instanceof Error ? m.message : "Unknown error";
      this.showToast(`Failed: ${b}`, "error");
    } finally {
      d.removeAttribute("disabled"), s?.removeAttribute("disabled"), d.innerHTML = h;
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
function Yo(i) {
  const e = new lr(i);
  return Fe(() => e.init()), e;
}
function Jo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new lr(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const Kn = "esign.google.account_id", ws = 25 * 1024 * 1024, Ss = 2e3, Bi = 60, ai = "application/vnd.google-apps.document", oi = "application/pdf", Fi = "application/vnd.google-apps.folder", xs = [ai, oi];
class gi {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || ws, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceOriginalNameInput: g("#source_original_name"),
      // Source tabs
      sourceTabs: Ht(".source-tab"),
      sourcePanels: Ht(".source-panel"),
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
      clearBtn: r,
      titleInput: c
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), r && r.addEventListener("click", (d) => {
      d.preventDefault(), d.stopPropagation(), this.clearFileSelection();
    }), c && c.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((d) => {
      n.addEventListener(d, (s) => {
        s.preventDefault(), s.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((d) => {
      n.addEventListener(d, (s) => {
        s.preventDefault(), s.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (d) => {
      const s = d.dataTransfer;
      s?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = s.files, this.handleFileSelect());
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
      refreshBtn: r,
      clearSelectionBtn: c,
      importBtn: d,
      importRetryBtn: s,
      driveAccountDropdown: h
    } = this.elements;
    if (e) {
      const m = En(() => this.handleSearch(), 300);
      e.addEventListener("input", m);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), r && r.addEventListener("click", () => this.refreshFiles()), h && h.addEventListener("change", () => {
      this.setCurrentAccountId(h.value, this.currentSource === "google");
    }), c && c.addEventListener("click", () => this.clearFileSelection()), d && d.addEventListener("click", () => this.startImport()), s && s.addEventListener("click", () => {
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
        window.localStorage.getItem(Kn)
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
      const { searchInput: r, clearSearchBtn: c } = this.elements;
      r && (r.value = ""), c && B(c), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const c = this.normalizeAccountId(r?.account_id);
      if (n.has(c))
        continue;
      n.add(c);
      const d = document.createElement("option");
      d.value = c;
      const s = String(r?.email || "").trim(), h = String(r?.status || "").trim(), m = s || c || "Default account";
      d.textContent = h && h !== "connected" ? `${m} (${h})` : m, c === this.currentAccountId && (d.selected = !0), e.appendChild(d);
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
      this.currentAccountId ? window.localStorage.setItem(Kn, this.currentAccountId) : window.localStorage.removeItem(Kn);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, Y(e)) : B(e)), t) {
      const r = t.dataset.baseHref || t.getAttribute("href");
      r && t.setAttribute("href", this.applyAccountIdToPath(r));
    }
    n && (Array.from(n.options).some(
      (c) => this.normalizeAccountId(c.value) === this.currentAccountId
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
      n.id.replace("panel-", "") === e ? Y(n) : B(n);
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: r } = this.elements, c = e?.files?.[0];
    if (c && this.validateFile(c)) {
      if (this.showPreview(c), n && (n.value = ""), r && (r.value = c.name), t && !t.value.trim()) {
        const d = c.name.replace(/\.pdf$/i, "");
        t.value = d;
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
      `File is too large (${yn(e.size)}). Maximum size is ${yn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: r, fileSize: c, uploadZone: d } = this.elements;
    r && (r.textContent = e.name), c && (c.textContent = yn(e.size)), t && B(t), n && Y(n), d && (d.classList.remove("border-gray-300"), d.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && Y(e), t && B(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, Y(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", B(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, r = e?.files && e.files.length > 0, c = t?.value.trim().length ?? !1, d = r && c;
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), r = t.get("org_id"), c = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && c.searchParams.set("tenant_id", n), r && c.searchParams.set("org_id", r);
    const d = new FormData();
    d.append("file", e);
    const s = await fetch(c.toString(), {
      method: "POST",
      body: d,
      credentials: "same-origin"
    }), h = await s.json().catch(() => ({}));
    if (!s.ok) {
      const S = h?.error?.message || h?.message || "Upload failed. Please try again.";
      throw new Error(S);
    }
    const m = h?.object_key ? String(h.object_key).trim() : "";
    if (!m)
      throw new Error("Upload failed: missing source object key.");
    const b = h?.source_original_name ? String(h.source_original_name).trim() : h?.original_name ? String(h.original_name).trim() : e.name;
    return {
      objectKey: m,
      sourceOriginalName: b
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: r, sourceOriginalNameInput: c } = this.elements, d = t?.files?.[0];
    if (!(!d || !this.validateFile(d))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const s = await this.uploadSourcePDF(d);
        r && (r.value = s.objectKey), c && (c.value = s.sourceOriginalName || d.name), n?.submit();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), c = String(e.modifiedTime || e.ModifiedTime || "").trim(), d = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), s = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim(), m = Array.isArray(e.parents) ? e.parents : s ? [s] : [], b = Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
      modifiedTime: c,
      webViewLink: d,
      parents: m,
      owners: b
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === ai;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === oi;
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
    return xs.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === ai ? "Google Document" : t === oi ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Fi ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: r, append: c } = e, { fileList: d } = this.elements;
    !c && d && (d.innerHTML = `
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
      }), m = await h.json();
      if (!h.ok)
        throw new Error(m.error?.message || "Failed to load files");
      const b = Array.isArray(m.files) ? m.files.map((f) => this.normalizeDriveFile(f)) : [];
      this.nextPageToken = m.next_page_token || null, c ? this.currentFiles = [...this.currentFiles, ...b] : this.currentFiles = b, this.renderFiles(c);
      const { resultCount: S, listTitle: A } = this.elements;
      n && S ? (S.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, A && (A.textContent = "Search Results")) : (S && (S.textContent = ""), A && (A.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: E } = this.elements;
      E && (this.nextPageToken ? Y(E) : B(E)), mt(`Loaded ${b.length} files`);
    } catch (s) {
      console.error("Error loading files:", s), d && (d.innerHTML = `
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
        `), mt(`Error: ${s instanceof Error ? s.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((r, c) => {
      const d = this.getFileIcon(r), s = this.isImportable(r), h = this.isFolder(r), m = this.selectedFile && this.selectedFile.id === r.id, b = !s && !h;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${m ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${b ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${m}"
          data-file-index="${c}"
          ${b ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${d.bg} flex items-center justify-center flex-shrink-0 ${d.text}">
            ${d.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(r.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(r.mimeType)}
              ${r.modifiedTime ? " • " + In(r.modifiedTime) : ""}
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
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((r) => {
      r.addEventListener("click", () => {
        const c = parseInt(r.dataset.fileIndex || "0", 10), d = this.currentFiles[c];
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
    t && (t.value = ""), n && B(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      B(e);
      return;
    }
    Y(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, r) => {
      const c = r === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${r > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${r}" class="breadcrumb-item ${c ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const r = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, r + 1), this.updateBreadcrumb();
        const c = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: c.id });
      });
    }));
  }
  /**
   * Select a file
   */
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: r } = this.elements;
    r && r.querySelectorAll(".file-item").forEach((x) => {
      const _ = parseInt(x.dataset.fileIndex || "0", 10);
      this.currentFiles[_].id === e.id ? (x.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), x.setAttribute("aria-selected", "true")) : (x.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), x.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: c,
      filePreview: d,
      importStatus: s,
      previewIcon: h,
      previewTitle: m,
      previewType: b,
      importTypeInfo: S,
      importTypeLabel: A,
      importTypeDesc: E,
      snapshotWarning: f,
      importDocumentTitle: L
    } = this.elements;
    c && B(c), d && Y(d), s && B(s), h && (h.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, h.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), m && (m.textContent = e.name || "Untitled"), b && (b.textContent = this.getFileTypeName(e.mimeType)), n && S && (S.className = `p-3 rounded-lg border ${n.bgClass}`, A && (A.textContent = n.label, A.className = `text-xs font-medium ${n.textClass}`), E && (E.textContent = n.desc, E.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? Y(f) : B(f))), L && (L.value = e.name || ""), mt(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: r } = this.elements;
    e && Y(e), t && B(t), n && B(n), r && r.querySelectorAll(".file-item").forEach((c) => {
      c.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), c.setAttribute("aria-selected", "false");
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
      t && Y(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && B(t), this.searchQuery = "";
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: r.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && B(t), this.searchQuery = "";
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
      importStatusQueued: c,
      importStatusSuccess: d,
      importStatusFailed: s
    } = this.elements;
    switch (t && B(t), n && B(n), r && Y(r), c && B(c), d && B(d), s && B(s), e) {
      case "queued":
      case "running":
        c && Y(c);
        break;
      case "succeeded":
        d && Y(d);
        break;
      case "failed":
        s && Y(s);
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
        const c = this.config.routes.integrations || "/admin/esign/integrations/google";
        r.href = this.applyAccountIdToPath(c), Y(r);
      } else
        B(r);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: r } = this.elements;
    if (!this.selectedFile || !e) return;
    const c = e.value.trim();
    if (!c) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), r && B(r), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const d = new URL(window.location.href);
      d.searchParams.delete("import_run_id"), window.history.replaceState({}, "", d.toString());
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
            document_title: c
          })
        }
      ), h = await s.json();
      if (!s.ok) {
        const b = h.error?.code || "";
        throw { message: h.error?.message || "Failed to start import", code: b };
      }
      this.currentImportRunId = h.import_run_id, this.pollAttempts = 0;
      const m = new URL(window.location.href);
      this.currentImportRunId && m.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", m.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (d) {
      console.error("Import error:", d);
      const s = d;
      this.showImportError(s.message || "Failed to start import", s.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Ss);
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
            this.showImportStatus("succeeded"), mt("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const c = n.error?.code || "", d = n.error?.message || "Import failed";
            this.showImportError(d, c), mt("Import failed");
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
function Ko(i) {
  const e = new gi(i);
  return Fe(() => e.init()), e;
}
function Xo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new gi(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Is(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, r = i.context && typeof i.context == "object" ? i.context : {}, c = String(t.index || "").trim();
  return !e && !c ? null : {
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
      index: c,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && Fe(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Is(t);
        n && new gi(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const lt = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, mn = lt.REVIEW, Es = {
  [lt.DOCUMENT]: "Details",
  [lt.DETAILS]: "Participants",
  [lt.PARTICIPANTS]: "Fields",
  [lt.FIELDS]: "Placement",
  [lt.PLACEMENT]: "Review"
}, vt = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, Cn = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
};
lt.DOCUMENT, lt.DETAILS, lt.PARTICIPANTS, lt.FIELDS, lt.REVIEW;
const ci = /* @__PURE__ */ new Map(), Cs = 30 * 60 * 1e3, Ni = {
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
function Ls(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function _s(i) {
  const e = i instanceof Error ? i.message : i, t = Ls(e);
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
  if (t && Ni[t]) {
    const n = Ni[t];
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
function As() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function Ts() {
  if (!As())
    throw new Error("PDF preview library unavailable");
}
function Ps(i) {
  const e = ci.get(i);
  return e ? Date.now() - e.timestamp > Cs ? (ci.delete(i), null) : e : null;
}
function ks(i, e, t) {
  ci.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Ds(i, e = Cn.THUMBNAIL_MAX_WIDTH, t = Cn.THUMBNAIL_MAX_HEIGHT) {
  await Ts();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const c = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, d = c.numPages, s = await c.getPage(1), h = s.getViewport({ scale: 1 }), m = e / h.width, b = t / h.height, S = Math.min(m, b, 1), A = s.getViewport({ scale: S }), E = document.createElement("canvas");
  E.width = A.width, E.height = A.height;
  const f = E.getContext("2d");
  if (!f)
    throw new Error("Failed to get canvas context");
  return await s.render({
    canvasContext: f,
    viewport: A
  }).promise, { dataUrl: E.toDataURL("image/jpeg", 0.8), pageCount: d };
}
class Rs {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || Cn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || Cn.THUMBNAIL_MAX_HEIGHT
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
    const t = e === lt.DOCUMENT || e === lt.DETAILS || e === lt.PARTICIPANTS || e === lt.FIELDS || e === lt.REVIEW;
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
    const c = Ps(e);
    if (c) {
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? c.pageCount,
        thumbnailUrl: c.dataUrl,
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
      if (r !== this.requestVersion)
        return;
      const { dataUrl: s, pageCount: h } = await Ds(
        d,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (r !== this.requestVersion)
        return;
      ks(e, s, h), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? h,
        thumbnailUrl: s,
        isLoading: !1,
        error: null
      };
    } catch (d) {
      if (r !== this.requestVersion)
        return;
      const s = d instanceof Error ? d.message : "Failed to load preview", h = _s(s);
      Hi() && console.error("Failed to load document preview:", d), this.state = {
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
    const { container: e, thumbnail: t, title: n, pageCount: r, loadingState: c, errorState: d, emptyState: s, contentState: h } = this.elements;
    if (e) {
      if (c?.classList.add("hidden"), d?.classList.add("hidden"), s?.classList.add("hidden"), h?.classList.add("hidden"), !this.state.documentId) {
        s?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        c?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        d?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Hi() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function Ms(i = {}) {
  const e = new Rs(i);
  return e.init(), e;
}
function $s(i = {}) {
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
function Bs(i) {
  const { context: e, hooks: t = {} } = i;
  return $s({
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
function ht(i, e) {
  return i instanceof Document ? i.getElementById(e) : i.querySelector(`#${e}`);
}
function Jt(i, e, t) {
  const n = ht(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function Fs(i = document) {
  return {
    marker: ht(i, "esign-page-config"),
    form: {
      root: Jt(i, "agreement-form", "form"),
      submitBtn: Jt(i, "submit-btn", "submit button"),
      wizardSaveBtn: ht(i, "wizard-save-btn"),
      announcements: ht(i, "form-announcements"),
      documentIdInput: Jt(i, "document_id", "document selector"),
      documentPageCountInput: ht(i, "document_page_count"),
      titleInput: Jt(i, "title", "title input"),
      messageInput: Jt(i, "message", "message input")
    },
    coordination: {
      banner: ht(i, "active-tab-banner"),
      message: ht(i, "active-tab-message")
    },
    sync: {
      indicator: ht(i, "sync-status-indicator"),
      icon: ht(i, "sync-status-icon"),
      text: ht(i, "sync-status-text"),
      retryBtn: ht(i, "sync-retry-btn")
    },
    conflict: {
      modal: ht(i, "conflict-dialog-modal"),
      localTime: ht(i, "conflict-local-time"),
      serverRevision: ht(i, "conflict-server-revision"),
      serverTime: ht(i, "conflict-server-time")
    }
  };
}
function Ns(i, e) {
  return {
    render(t = {}) {
      const n = t?.coordinationAvailable !== !1, r = i.coordination.banner, c = i.coordination.message;
      if (!r || !c)
        return;
      if (n) {
        r.classList.add("hidden");
        return;
      }
      const d = t?.lastSeenAt ? e.formatRelativeTime(t.lastSeenAt) : "recently";
      c.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${d}.`, r.classList.remove("hidden");
    },
    destroy() {
      i.coordination.banner?.classList.add("hidden");
    }
  };
}
class Hs {
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
      review: {
        enabled: !1,
        gate: "approve_before_send",
        commentsEnabled: !1,
        participants: []
      },
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
    const c = e.document && typeof e.document == "object" ? e.document : {}, d = c.id;
    n.document = {
      id: d == null ? null : String(d).trim() || null,
      title: String(c.title ?? "").trim() || null,
      pageCount: this.options.parsePositiveInt(c.pageCount, 0) || null
    };
    const s = e.details && typeof e.details == "object" ? e.details : {}, h = String(s.title ?? "").trim(), m = h === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    n.details = {
      title: h,
      message: String(s.message ?? "")
    }, n.participants = Array.isArray(e.participants) ? e.participants : [], n.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], n.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], n.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const b = e.review && typeof e.review == "object" ? e.review : {};
    n.review = {
      enabled: !!b.enabled,
      gate: String(b.gate ?? t.review.gate).trim() || t.review.gate,
      commentsEnabled: !!b.commentsEnabled,
      participants: Array.isArray(b.participants) ? b.participants : []
    };
    const S = String(e.wizardId ?? "").trim();
    n.wizardId = S || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, m), n.resourceRef = this.normalizeResourceRef(e.resourceRef ?? e.resource_ref);
    const A = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = A || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e, n = String(t.kind ?? "").trim(), r = String(t.id ?? "").trim();
    if (n === "" || r === "")
      return null;
    const c = t.scope, d = c && typeof c == "object" && !Array.isArray(c) ? Object.entries(c).reduce((s, [h, m]) => {
      const b = String(h || "").trim();
      return b !== "" && (s[b] = String(m ?? "").trim()), s;
    }, {}) : void 0;
    return {
      kind: n,
      id: r,
      scope: d && Object.keys(d).length > 0 ? d : void 0
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
    const c = e?.data && typeof e.data == "object" ? e.data : {}, d = this.normalizeLoadedState({
      ...c?.wizard_state && typeof c.wizard_state == "object" ? c.wizard_state : {},
      resourceRef: e.ref,
      serverDraftId: e.ref.id,
      serverRevision: e.revision,
      lastSyncedAt: e.updatedAt,
      syncPending: !1
    });
    return this.setState(d, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    }), this.getState();
  }
  applyRemoteSync(e, t, n = {}) {
    const r = this.getState(), c = r.syncPending === !0, d = String(e ?? "").trim() || null, s = this.options.parsePositiveInt(t, 0);
    return this.setState({
      ...r,
      serverDraftId: d || r.serverDraftId,
      serverRevision: s > 0 ? s : r.serverRevision,
      lastSyncedAt: String(n.lastSyncedAt || this.now()).trim() || r.lastSyncedAt,
      syncPending: c
    }, {
      syncPending: c,
      save: n.save,
      notify: n.notify
    }), {
      preservedLocalChanges: c,
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
const Xn = /* @__PURE__ */ new Map();
async function Us(i) {
  const e = String(i || "").trim().replace(/\/+$/, "");
  if (e === "")
    throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? li(window.__esignSyncCoreModule) : (Xn.has(e) || Xn.set(e, zs(e)), Xn.get(e));
}
async function zs(i) {
  if (typeof window < "u" && typeof window.__esignSyncCoreLoader == "function")
    return li(await window.__esignSyncCoreLoader(i));
  const t = await import(`${i}/index.js`);
  return li(t);
}
function li(i) {
  if (!i || typeof i.createInMemoryCache != "function" || typeof i.createFetchSyncTransport != "function" || typeof i.createSyncEngine != "function" || typeof i.parseReadEnvelope != "function")
    throw new TypeError("Invalid sync-core runtime module");
  return i;
}
class Os {
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
    const c = await (await this.ensureBoundResource()).mutate({
      operation: "send",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: n
    });
    return {
      replay: c.replay,
      applied: c.applied,
      snapshot: c.snapshot,
      data: this.snapshotData(c.snapshot)
    };
  }
  async startReview(e, t, n = {}) {
    const c = await (await this.ensureBoundResource()).mutate({
      operation: "start_review",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: n
    });
    return {
      replay: c.replay,
      applied: c.applied,
      snapshot: c.snapshot,
      data: this.snapshotData(c.snapshot)
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
    const c = e.parseReadEnvelope(r, n?.draft || {});
    return {
      resourceRef: r,
      snapshot: c,
      wizardID: String(n?.wizard_id || "").trim()
    };
  }
  async ensureRuntime() {
    return this.syncModule ? this.syncModule : (this.syncModulePromise || (this.syncModulePromise = Us(this.syncConfig.client_base_path)), this.syncModule = await this.syncModulePromise, this.cache || (this.cache = this.syncModule.createInMemoryCache()), this.transport || (this.transport = this.syncModule.createFetchSyncTransport({
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
    const c = n.createSyncEngine({
      transport: this.transport,
      cache: this.cache
    });
    this.resourceRef = r, this.resource = c.resource(r), this.stateManager.bindResourceRef(r, {
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
    const c = t.scope, d = c && typeof c == "object" && !Array.isArray(c) ? Object.entries(c).reduce((s, [h, m]) => {
      const b = String(h || "").trim();
      return b !== "" && (s[b] = String(m ?? "").trim()), s;
    }, {}) : void 0;
    return {
      kind: n,
      id: r,
      scope: d && Object.keys(d).length > 0 ? d : void 0
    };
  }
  toRuntimeError(e) {
    return new Error(String(e || "sync_failed").trim() || "sync_failed");
  }
}
class js {
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
    const c = () => {
      this.options.onBeforeUnload();
    };
    t.addEventListener("beforeunload", c), this.cleanupFns.push(() => t.removeEventListener("beforeunload", c));
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
const dr = "[esign-send]";
function Rt(i) {
  const e = String(i ?? "").trim();
  return e === "" ? null : e;
}
function Ui(i) {
  const e = Number(i);
  return Number.isFinite(e) ? e : null;
}
function qs() {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function nt(i = {}) {
  const {
    state: e,
    storageKey: t,
    ownership: n,
    sendAttemptId: r,
    extra: c = {}
  } = i;
  return {
    wizardId: Rt(e?.wizardId),
    serverDraftId: Rt(e?.serverDraftId),
    serverRevision: Ui(e?.serverRevision),
    currentStep: Ui(e?.currentStep),
    syncPending: e?.syncPending === !0,
    storageKey: Rt(t),
    activeTabOwner: typeof n?.isOwner == "boolean" ? n.isOwner : null,
    activeTabClaimTabId: Rt(n?.claim?.tabId),
    activeTabClaimedAt: Rt(n?.claim?.claimedAt),
    activeTabLastSeenAt: Rt(n?.claim?.lastSeenAt),
    activeTabBlockedReason: Rt(n?.blockedReason),
    sendAttemptId: Rt(r),
    ...c
  };
}
function It(i, e = {}) {
  console.info(dr, i, e);
}
function At(i, e = {}) {
  console.warn(dr, i, e);
}
class Vs {
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
    this.isSyncing = !0, this.options.statusUpdater("saving"), It("sync_perform_start", nt({
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
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), At("sync_perform_conflict", nt({
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
function Gs() {
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
function Et(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function fn(i, e, t = "") {
  const n = i.querySelector(e);
  return (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && n.value || t;
}
function Ws(i, e, t = !1) {
  const n = i.querySelector(e);
  return n instanceof HTMLInputElement ? n.checked : t;
}
function Qn(i, e) {
  i instanceof HTMLButtonElement && (i.disabled = e);
}
function Ys(i) {
  const {
    documentIdInput: e,
    selectedDocumentTitle: t,
    participantsContainer: n,
    fieldDefinitionsContainer: r,
    submitBtn: c,
    escapeHtml: d,
    getSignerParticipants: s,
    getCurrentDocumentPageCount: h,
    collectFieldRulesForState: m,
    expandRulesForPreview: b,
    findSignersMissingRequiredSignatureField: S,
    goToStep: A
  } = i;
  function E() {
    const f = Et("send-readiness-loading"), L = Et("send-readiness-results"), x = Et("send-validation-status"), _ = Et("send-validation-issues"), N = Et("send-issues-list"), j = Et("send-confirmation"), F = Et("review-agreement-title"), $ = Et("review-document-title"), P = Et("review-participant-count"), Q = Et("review-stage-count"), re = Et("review-participants-list"), Z = Et("review-fields-summary"), J = document.getElementById("title");
    if (!f || !L || !x || !_ || !N || !j || !F || !$ || !P || !Q || !re || !Z || !(J instanceof HTMLInputElement))
      return;
    const ge = J.value || "Untitled", ne = t?.textContent || "No document", Te = n.querySelectorAll(".participant-entry"), Ce = r.querySelectorAll(".field-definition-entry"), de = b(m(), h()), Pe = s(), fe = /* @__PURE__ */ new Set();
    Te.forEach((ye) => {
      const ee = ye.querySelector(".signing-stage-input"), Ge = ye.querySelector('select[name*=".role"]');
      Ge instanceof HTMLSelectElement && Ge.value === "signer" && ee instanceof HTMLInputElement && ee.value && fe.add(Number.parseInt(ee.value, 10));
    }), F.textContent = ge, $.textContent = ne, P.textContent = `${Te.length} (${Pe.length} signers)`, Q.textContent = String(fe.size > 0 ? fe.size : 1), re.innerHTML = "", Te.forEach((ye) => {
      const ee = fn(ye, 'input[name*=".name"]'), Ge = fn(ye, 'input[name*=".email"]'), Oe = fn(ye, 'select[name*=".role"]', "signer"), Se = fn(ye, ".signing-stage-input"), Re = Ws(ye, ".notify-input", !0), at = document.createElement("div");
      at.className = "flex items-center justify-between text-sm", at.innerHTML = `
        <div>
          <span class="font-medium">${d(ee || Ge)}</span>
          <span class="text-gray-500 ml-2">${d(Ge)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Oe === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Oe === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${Re ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${Re ? "Notify" : "No Notify"}
          </span>
          ${Oe === "signer" && Se ? `<span class="text-xs text-gray-500">Stage ${Se}</span>` : ""}
        </div>
      `, re.appendChild(at);
    });
    const De = Ce.length + de.length;
    Z.textContent = `${De} field${De !== 1 ? "s" : ""} defined (${Ce.length} manual, ${de.length} generated)`;
    const ke = [];
    e?.value || ke.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), Pe.length === 0 && ke.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), S().forEach((ye) => {
      ke.push({
        severity: "error",
        message: `${ye.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const st = Array.from(fe).sort((ye, ee) => ye - ee);
    for (let ye = 0; ye < st.length; ye++)
      if (st[ye] !== ye + 1) {
        ke.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Ve = ke.some((ye) => ye.severity === "error"), Je = ke.some((ye) => ye.severity === "warning");
    Ve ? (x.className = "p-4 rounded-lg bg-red-50 border border-red-200", x.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, j.classList.add("hidden"), Qn(c, !0)) : Je ? (x.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", x.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, j.classList.remove("hidden"), Qn(c, !1)) : (x.className = "p-4 rounded-lg bg-green-50 border border-green-200", x.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, j.classList.remove("hidden"), Qn(c, !1)), ke.length > 0 ? (_.classList.remove("hidden"), N.innerHTML = "", ke.forEach((ye) => {
      const ee = document.createElement("li");
      ee.className = `p-3 rounded-lg flex items-center justify-between ${ye.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, ee.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${ye.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${ye.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${d(ye.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${ye.step}">
            ${d(ye.action)}
          </button>
        `, N.appendChild(ee);
    }), N.querySelectorAll("[data-go-to-step]").forEach((ye) => {
      ye.addEventListener("click", () => {
        const ee = Number(ye.getAttribute("data-go-to-step"));
        Number.isFinite(ee) && A(ee);
      });
    })) : _.classList.add("hidden"), f.classList.add("hidden"), L.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: E
  };
}
function zi(i, e = 0) {
  const t = Number.parseInt(String(i || "").trim(), 10);
  return Number.isFinite(t) ? t : e;
}
function Js(i) {
  const {
    totalWizardSteps: e,
    wizardStep: t,
    nextStepLabels: n,
    submitBtn: r,
    previewCard: c,
    updateCoordinationUI: d,
    validateStep: s,
    onPlacementStep: h,
    onReviewStep: m,
    onStepChanged: b,
    initialStep: S = 1
  } = i;
  let A = S;
  const E = Array.from(document.querySelectorAll(".wizard-step-btn")), f = Array.from(document.querySelectorAll(".wizard-step")), L = Array.from(document.querySelectorAll(".wizard-connector")), x = document.getElementById("wizard-prev-btn"), _ = document.getElementById("wizard-next-btn"), N = document.getElementById("wizard-save-btn");
  function j() {
    if (E.forEach((P, Q) => {
      const re = Q + 1, Z = P.querySelector(".wizard-step-number");
      Z instanceof HTMLElement && (re < A ? (P.classList.remove("text-gray-500", "text-blue-600"), P.classList.add("text-green-600"), Z.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), Z.classList.add("bg-green-600", "text-white"), P.removeAttribute("aria-current")) : re === A ? (P.classList.remove("text-gray-500", "text-green-600"), P.classList.add("text-blue-600"), Z.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), Z.classList.add("bg-blue-600", "text-white"), P.setAttribute("aria-current", "step")) : (P.classList.remove("text-blue-600", "text-green-600"), P.classList.add("text-gray-500"), Z.classList.remove("bg-blue-600", "text-white", "bg-green-600"), Z.classList.add("bg-gray-300", "text-gray-600"), P.removeAttribute("aria-current")));
    }), L.forEach((P, Q) => {
      Q < A - 1 ? (P.classList.remove("bg-gray-300"), P.classList.add("bg-green-600")) : (P.classList.remove("bg-green-600"), P.classList.add("bg-gray-300"));
    }), f.forEach((P) => {
      zi(P.dataset.step) === A ? P.classList.remove("hidden") : P.classList.add("hidden");
    }), x?.classList.toggle("hidden", A === 1), _?.classList.toggle("hidden", A === e), N?.classList.toggle("hidden", A !== e), r.classList.toggle("hidden", A !== e), d(), A < e) {
      const P = n[A] || "Next";
      _ && (_.innerHTML = `
        ${P}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    A === t.PLACEMENT ? h?.() : A === t.REVIEW && m?.(), c.updateVisibility(A);
  }
  function F(P) {
    if (!(P < t.DOCUMENT || P > e)) {
      if (P > A) {
        for (let Q = A; Q < P; Q++)
          if (!s(Q)) return;
      }
      A = P, j(), b?.(P), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function $() {
    E.forEach((P) => {
      P.addEventListener("click", () => {
        const Q = zi(P.dataset.step);
        F(Q);
      });
    }), x?.addEventListener("click", () => F(A - 1)), _?.addEventListener("click", () => F(A + 1)), N?.addEventListener("click", () => {
      const P = document.getElementById("agreement-form");
      if (!(P instanceof HTMLFormElement)) return;
      const Q = document.createElement("input");
      if (Q.type = "hidden", Q.name = "save_as_draft", Q.value = "1", P.appendChild(Q), typeof P.requestSubmit == "function") {
        P.requestSubmit();
        return;
      }
      P.submit();
    });
  }
  return {
    bindEvents: $,
    getCurrentStep() {
      return A;
    },
    setCurrentStep(P) {
      A = P;
    },
    goToStep: F,
    updateWizardUI: j
  };
}
function Oi(i) {
  return i.querySelector('select[name*=".role"]');
}
function Ks(i) {
  return i.querySelector(".field-participant-select");
}
function bn(i) {
  return typeof i == "object" && i !== null;
}
function Xs(i, e, t = {}) {
  const n = new Error(e);
  return n.code = String(i).trim(), Number(t.status || 0) > 0 && (n.status = Number(t.status || 0)), Number(t.currentRevision || 0) > 0 && (n.currentRevision = Number(t.currentRevision || 0)), Number(t.conflict?.currentRevision || 0) > 0 && (n.conflict = {
    currentRevision: Number(t.conflict?.currentRevision || 0)
  }), n;
}
function Qs(i, e = 0) {
  if (!bn(i))
    return Number(e || 0);
  const t = i, n = Number(t.currentRevision || 0);
  if (n > 0)
    return n;
  const r = Number(t.conflict?.currentRevision || 0);
  return r > 0 ? r : Number(e || 0);
}
function Zs(i) {
  const {
    config: e,
    form: t,
    submitBtn: n,
    documentIdInput: r,
    documentSearch: c,
    participantsContainer: d,
    addParticipantBtn: s,
    fieldDefinitionsContainer: h,
    fieldRulesContainer: m,
    documentPageCountInput: b,
    fieldPlacementsJSONInput: S,
    fieldRulesJSONInput: A,
    storageKey: E,
    syncService: f,
    syncOrchestrator: L,
    stateManager: x,
    submitMode: _,
    totalWizardSteps: N,
    wizardStep: j,
    getCurrentStep: F,
    getPlacementState: $,
    getCurrentDocumentPageCount: P,
    ensureSelectedDocumentCompatibility: Q,
    collectFieldRulesForState: re,
    collectFieldRulesForForm: Z,
    expandRulesForPreview: J,
    findSignersMissingRequiredSignatureField: ge,
    missingSignatureFieldMessage: ne,
    getSignerParticipants: Te,
    getReviewConfigForState: Ce,
    isStartReviewEnabled: de,
    setPrimaryActionLabel: Pe,
    buildCanonicalAgreementPayload: fe,
    announceError: De,
    emitWizardTelemetry: ke,
    parseAPIError: ze,
    goToStep: st,
    showSyncConflictDialog: Ve,
    surfaceSyncOutcome: Je,
    updateSyncStatus: ye,
    activeTabOwnershipRequiredCode: ee = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: Ge,
    addFieldBtn: Oe
  } = i;
  let Se = null;
  function Re() {
    return Ge?.() || {};
  }
  function at(Le, k = !1) {
    n.setAttribute("aria-busy", k ? "true" : "false"), n.innerHTML = k ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${Le}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${Le}
        `;
  }
  async function pt() {
    It("persist_latest_wizard_state_start", nt({
      state: x.getState(),
      storageKey: E,
      ownership: Re(),
      sendAttemptId: Se
    })), x.updateState(x.collectFormState());
    const Le = await L.forceSync();
    if (Le?.blocked && Le.reason === "passive_tab")
      throw At("persist_latest_wizard_state_blocked", nt({
        state: x.getState(),
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          reason: Le.reason
        }
      })), {
        code: ee,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const k = x.getState();
    if (k?.syncPending)
      throw At("persist_latest_wizard_state_unsynced", nt({
        state: k,
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se
      })), new Error("Unable to sync latest draft changes");
    return It("persist_latest_wizard_state_complete", nt({
      state: k,
      storageKey: E,
      ownership: Re(),
      sendAttemptId: Se
    })), k;
  }
  async function dt() {
    It("ensure_draft_ready_for_send_start", nt({
      state: x.getState(),
      storageKey: E,
      ownership: Re(),
      sendAttemptId: Se
    }));
    const Le = await pt(), k = String(Le?.serverDraftId || "").trim();
    if (!k) {
      At("ensure_draft_ready_for_send_missing_draft", nt({
        state: Le,
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          action: "create_draft"
        }
      }));
      const T = await f.create(Le), H = String(T.id || "").trim(), V = Number(T.revision || 0);
      return H && V > 0 && x.markSynced(H, V), It("ensure_draft_ready_for_send_created", nt({
        state: x.getState(),
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          loadedDraftId: H,
          loadedRevision: V
        }
      })), {
        draftID: H,
        revision: V
      };
    }
    try {
      It("ensure_draft_ready_for_send_loading", nt({
        state: Le,
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          targetDraftId: k
        }
      }));
      const T = await f.load(k), H = String(T?.id || k).trim(), V = Number(T?.revision || Le?.serverRevision || 0);
      return H && V > 0 && x.markSynced(H, V), It("ensure_draft_ready_for_send_loaded", nt({
        state: x.getState(),
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          loadedDraftId: H,
          loadedRevision: V
        }
      })), {
        draftID: H,
        revision: V > 0 ? V : Number(Le?.serverRevision || 0)
      };
    } catch (T) {
      throw Number(bn(T) && T.status || 0) !== 404 ? (At("ensure_draft_ready_for_send_load_failed", nt({
        state: Le,
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          targetDraftId: k,
          status: Number(bn(T) && T.status || 0)
        }
      })), T) : (At("ensure_draft_ready_for_send_missing_remote_draft", nt({
        state: Le,
        storageKey: E,
        ownership: Re(),
        sendAttemptId: Se,
        extra: {
          targetDraftId: k,
          status: 404
        }
      })), ke("wizard_send_not_found", {
        draft_id: k,
        status: 404,
        phase: "pre_send"
      }), await tt().catch(() => {
      }), Xs(
        "DRAFT_SEND_NOT_FOUND",
        "Draft not found",
        { status: 404 }
      ));
    }
  }
  async function tt() {
    const Le = x.getState();
    x.setState({
      ...Le,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await L.forceSync();
  }
  function ut() {
    t.addEventListener("submit", function(Le) {
      if (fe(), !r.value) {
        Le.preventDefault(), De("Please select a document"), c.focus();
        return;
      }
      if (!Q()) {
        Le.preventDefault();
        return;
      }
      const k = d.querySelectorAll(".participant-entry");
      if (k.length === 0) {
        Le.preventDefault(), De("Please add at least one participant"), s.focus();
        return;
      }
      let T = !1;
      if (k.forEach((O) => {
        Oi(O)?.value === "signer" && (T = !0);
      }), !T) {
        Le.preventDefault(), De("At least one signer is required");
        const O = k[0] ? Oi(k[0]) : null;
        O && O.focus();
        return;
      }
      const H = h.querySelectorAll(".field-definition-entry"), V = ge();
      if (V.length > 0) {
        Le.preventDefault(), De(ne(V)), st(j.FIELDS), Oe.focus();
        return;
      }
      let se = !1;
      if (H.forEach((O) => {
        Ks(O)?.value || (se = !0);
      }), se) {
        Le.preventDefault(), De("Please assign all fields to a signer");
        const O = h.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        O && O.focus();
        return;
      }
      if (re().some((O) => !O.participantId)) {
        Le.preventDefault(), De("Please assign all automation rules to a signer"), Array.from(m?.querySelectorAll(".field-rule-participant-select") || []).find((we) => !we.value)?.focus();
        return;
      }
      const Ie = !!t.querySelector('input[name="save_as_draft"]'), me = F() === N && !Ie && de(), ae = F() === N && !Ie && !me;
      if (ae) {
        let O = t.querySelector('input[name="send_for_signature"]');
        O || (O = document.createElement("input"), O.type = "hidden", O.name = "send_for_signature", t.appendChild(O)), O.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (_ === "json") {
        Le.preventDefault(), n.disabled = !0, at(ae ? "Sending..." : me ? "Starting Review..." : "Saving...", !0), (async () => {
          try {
            fe();
            const O = String(e.routes?.index || "").trim();
            if (!ae && !me) {
              if (await pt(), O) {
                window.location.href = O;
                return;
              }
              window.location.reload();
              return;
            }
            if (me) {
              const w = Ce();
              if (!w.enabled)
                throw new Error("Review mode is not enabled.");
              if ((w.participants || []).length === 0)
                throw new Error("Add at least one reviewer before starting review.");
            }
            Se = qs(), It("send_submit_start", nt({
              state: x.getState(),
              storageKey: E,
              ownership: Re(),
              sendAttemptId: Se
            }));
            const we = await dt(), ve = String(we?.draftID || "").trim(), be = Number(we?.revision || 0);
            if (!ve || be <= 0)
              throw new Error("Draft session not available. Please try again.");
            It("send_request_start", nt({
              state: x.getState(),
              storageKey: E,
              ownership: Re(),
              sendAttemptId: Se,
              extra: {
                targetDraftId: ve,
                expectedRevision: be,
                operation: me ? "start_review" : "send"
              }
            }));
            const Ee = me ? await f.startReview(be, Se || ve) : await f.send(be, Se || ve), v = String(
              Ee?.agreement_id || Ee?.id || Ee?.data?.agreement_id || Ee?.data?.id || ""
            ).trim();
            if (It("send_request_success", nt({
              state: x.getState(),
              storageKey: E,
              ownership: Re(),
              sendAttemptId: Se,
              extra: {
                targetDraftId: ve,
                expectedRevision: be,
                agreementId: v,
                operation: me ? "start_review" : "send"
              }
            })), x.clear(), L.broadcastStateUpdate(), L.broadcastDraftDisposed?.(ve, "send_completed"), Se = null, v && O) {
              window.location.href = `${O}/${encodeURIComponent(v)}`;
              return;
            }
            if (O) {
              window.location.href = O;
              return;
            }
            window.location.reload();
          } catch (O) {
            const we = bn(O) ? O : {}, ve = String(we.message || "Failed to process agreement").trim();
            let be = String(we.code || "").trim();
            const Ee = Number(we.status || 0);
            if (be.toUpperCase() === "STALE_REVISION") {
              const v = Qs(O, Number(x.getState()?.serverRevision || 0));
              ye?.("conflict"), Ve?.(v), ke("wizard_send_conflict", {
                draft_id: String(x.getState()?.serverDraftId || "").trim(),
                current_revision: v,
                status: Ee || 409
              }), n.disabled = !1, Pe(de() ? "Start Review" : "Send for Signature"), Se = null;
              return;
            }
            be.toUpperCase() === "NOT_FOUND" && (be = "DRAFT_SEND_NOT_FOUND", ke("wizard_send_not_found", {
              draft_id: String(x.getState()?.serverDraftId || "").trim(),
              status: Ee || 404
            }), await tt().catch(() => {
            })), At("send_request_failed", nt({
              state: x.getState(),
              storageKey: E,
              ownership: Re(),
              sendAttemptId: Se,
              extra: {
                code: be || null,
                status: Ee,
                message: ve
              }
            })), De(ve, be, Ee), n.disabled = !1, Pe(de() ? "Start Review" : "Send for Signature"), Se = null;
          }
        })();
        return;
      }
      n.disabled = !0, at(ae ? "Sending..." : me ? "Starting Review..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: ut,
    ensureDraftReadyForSend: dt,
    persistLatestWizardState: pt,
    resyncAfterSendNotFound: tt
  };
}
const ji = 150, qi = 32;
function qe(i) {
  return i == null ? "" : String(i).trim();
}
function ur(i) {
  if (typeof i == "boolean") return i;
  const e = qe(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function ea(i) {
  return qe(i).toLowerCase();
}
function rt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(qe(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function hn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(qe(i));
  return Number.isFinite(t) ? t : e;
}
function wn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function en(i, e) {
  const t = rt(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function Kt(i, e, t = 1) {
  const n = rt(t, 1), r = rt(i, n);
  return e > 0 ? wn(r, 1, e) : r > 0 ? r : n;
}
function ta(i, e, t) {
  const n = rt(t, 1);
  let r = en(i, n), c = en(e, n);
  return r <= 0 && (r = 1), c <= 0 && (c = n), c < r ? { start: c, end: r } : { start: r, end: c };
}
function Ln(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => qe(n)) : qe(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const r = rt(n, 0);
    r > 0 && t.add(r);
  }), Array.from(t).sort((n, r) => n - r);
}
function Sn(i, e) {
  const t = rt(e, 1), n = qe(i.participantId ?? i.participant_id), r = Ln(i.excludePages ?? i.exclude_pages), c = i.required, d = typeof c == "boolean" ? c : !["0", "false", "off", "no"].includes(qe(c).toLowerCase());
  return {
    id: qe(i.id),
    type: ea(i.type),
    participantId: n,
    participantTempId: qe(i.participantTempId) || n,
    fromPage: en(i.fromPage ?? i.from_page, t),
    toPage: en(i.toPage ?? i.to_page, t),
    page: en(i.page, t),
    excludeLastPage: ur(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: r,
    required: d
  };
}
function na(i, e) {
  const t = qe(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function ia(i, e) {
  const t = rt(e, 1), n = [];
  return i.forEach((r, c) => {
    const d = Sn(r || {}, t);
    if (d.type === "") return;
    const s = na(d, c);
    if (d.type === "initials_each_page") {
      const h = ta(d.fromPage, d.toPage, t), m = /* @__PURE__ */ new Set();
      Ln(d.excludePages).forEach((b) => {
        b <= t && m.add(b);
      }), d.excludeLastPage && m.add(t);
      for (let b = h.start; b <= h.end; b += 1)
        m.has(b) || n.push({
          id: `${s}-initials-${b}`,
          type: "initials",
          page: b,
          participantId: qe(d.participantId),
          required: d.required !== !1,
          ruleId: s
          // Track rule ID for link group creation.
        });
      return;
    }
    if (d.type === "signature_once") {
      let h = d.page > 0 ? d.page : d.toPage > 0 ? d.toPage : t;
      h <= 0 && (h = 1), n.push({
        id: `${s}-signature-${h}`,
        type: "signature",
        page: h,
        participantId: qe(d.participantId),
        required: d.required !== !1,
        ruleId: s
        // Track rule ID for link group creation.
      });
    }
  }), n.sort((r, c) => r.page !== c.page ? r.page - c.page : r.id.localeCompare(c.id)), n;
}
function ra(i, e, t, n, r) {
  const c = rt(t, 1);
  let d = i > 0 ? i : 1, s = e > 0 ? e : c;
  d = wn(d, 1, c), s = wn(s, 1, c), s < d && ([d, s] = [s, d]);
  const h = /* @__PURE__ */ new Set();
  r.forEach((b) => {
    const S = rt(b, 0);
    S > 0 && h.add(wn(S, 1, c));
  }), n && h.add(c);
  const m = [];
  for (let b = d; b <= s; b += 1)
    h.has(b) || m.push(b);
  return {
    pages: m,
    rangeStart: d,
    rangeEnd: s,
    excludedPages: Array.from(h).sort((b, S) => b - S),
    isEmpty: m.length === 0
  };
}
function sa(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let r = 1; r <= e.length; r += 1)
    if (r === e.length || e[r] !== e[r - 1] + 1) {
      const c = e[n], d = e[r - 1];
      c === d ? t.push(String(c)) : d === c + 1 ? t.push(`${c}, ${d}`) : t.push(`${c}-${d}`), n = r;
    }
  return `pages ${t.join(", ")}`;
}
function Zn(i) {
  const e = i || {};
  return {
    id: qe(e.id),
    title: qe(e.title || e.name) || "Untitled",
    pageCount: rt(e.page_count ?? e.pageCount, 0),
    compatibilityTier: qe(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: qe(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function pr(i) {
  const e = qe(i).toLowerCase();
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
function tn(i, e = 0) {
  const t = i || {}, n = qe(t.id) || `fi_init_${e}`, r = qe(t.definitionId || t.definition_id || t.field_definition_id) || n, c = rt(t.page ?? t.page_number, 1), d = hn(t.x ?? t.pos_x, 0), s = hn(t.y ?? t.pos_y, 0), h = hn(t.width, ji), m = hn(t.height, qi);
  return {
    id: n,
    definitionId: r,
    type: qe(t.type) || "text",
    participantId: qe(t.participantId || t.participant_id),
    participantName: qe(t.participantName || t.participant_name) || "Unassigned",
    page: c > 0 ? c : 1,
    x: d >= 0 ? d : 0,
    y: s >= 0 ? s : 0,
    width: h > 0 ? h : ji,
    height: m > 0 ? m : qi,
    placementSource: pr(t.placementSource || t.placement_source),
    linkGroupId: qe(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: qe(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: ur(t.isUnlinked ?? t.is_unlinked)
  };
}
function aa(i, e = 0) {
  const t = tn(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: pr(t.placementSource),
    link_group_id: qe(t.linkGroupId),
    linked_from_field_id: qe(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Ze(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function _t(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Bt(i) {
  return typeof i == "object" && i !== null;
}
function oa(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentsUploadURL: n,
    isEditMode: r,
    titleSource: c,
    normalizeTitleSource: d,
    stateManager: s,
    previewCard: h,
    parseAPIError: m,
    announceError: b,
    showToast: S,
    mapUserFacingError: A,
    renderFieldRulePreview: E
  } = i, f = Ze("document_id"), L = Ze("selected-document"), x = Ze("document-picker"), _ = Ze("document-search"), N = Ze("document-list"), j = Ze("change-document-btn"), F = Ze("selected-document-title"), $ = Ze("selected-document-info"), P = Ze("document_page_count"), Q = Ze("document-remediation-panel"), re = Ze("document-remediation-message"), Z = Ze("document-remediation-status"), J = Ze("document-remediation-trigger-btn"), ge = Ze("document-remediation-dismiss-btn"), ne = Ze("title"), Te = 300, Ce = 5, de = 10, Pe = Ze("document-typeahead"), fe = Ze("document-typeahead-dropdown"), De = Ze("document-recent-section"), ke = Ze("document-recent-list"), ze = Ze("document-search-section"), st = Ze("document-search-list"), Ve = Ze("document-empty-state"), Je = Ze("document-dropdown-loading"), ye = Ze("document-search-loading"), ee = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Ge = [], Oe = null, Se = 0, Re = null;
  const at = /* @__PURE__ */ new Set(), pt = /* @__PURE__ */ new Map();
  function dt(R) {
    return String(R || "").trim().toLowerCase();
  }
  function tt(R) {
    return String(R || "").trim().toLowerCase();
  }
  function ut(R) {
    return dt(R) === "unsupported";
  }
  function Le() {
    !r && ne && ne.value.trim() !== "" && !s.hasResumableState() && s.setTitleSource(c.SERVER_SEED, { syncPending: !1 });
  }
  function k(R) {
    const U = rt(R, 0);
    P && (P.value = String(U));
  }
  function T() {
    const R = rt(P?.value || "0", 0);
    if (R > 0) return R;
    const U = String($?.textContent || "").match(/(\d+)\s+pages?/i);
    if (U) {
      const z = rt(U[1], 0);
      if (z > 0) return z;
    }
    return 1;
  }
  function H() {
    f && (f.value = ""), F && (F.textContent = ""), $ && ($.textContent = ""), k(0), s.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), h.setDocument(null, null, null);
  }
  function V(R = "") {
    const U = "This document cannot be used because its PDF is incompatible with online signing.", z = tt(R);
    return z ? `${U} Reason: ${z}. Select another document or upload a remediated PDF.` : `${U} Select another document or upload a remediated PDF.`;
  }
  function se() {
    Oe = null, Z && (Z.textContent = "", Z.className = "mt-2 text-xs text-amber-800"), Q && Q.classList.add("hidden"), J && (J.disabled = !1, J.textContent = "Remediate PDF");
  }
  function he(R, U = "info") {
    if (!Z) return;
    const z = String(R || "").trim();
    Z.textContent = z;
    const te = U === "error" ? "text-red-700" : U === "success" ? "text-green-700" : "text-amber-800";
    Z.className = `mt-2 text-xs ${te}`;
  }
  function Ae(R, U = "") {
    !R || !Q || !re || (Oe = {
      id: String(R.id || "").trim(),
      title: String(R.title || "").trim(),
      pageCount: rt(R.pageCount, 0),
      compatibilityReason: tt(U || R.compatibilityReason || "")
    }, Oe.id && (re.textContent = V(Oe.compatibilityReason), he("Run remediation to make this document signable."), Q.classList.remove("hidden")));
  }
  function Ie(R) {
    const U = ne;
    if (!U) return;
    const z = s.getState(), te = U.value.trim(), ie = d(
      z?.titleSource,
      te === "" ? c.AUTOFILL : c.USER
    );
    if (te && ie === c.USER)
      return;
    const le = String(R || "").trim();
    le && (U.value = le, s.updateDetails({
      title: le,
      message: s.getState().details.message || ""
    }, { titleSource: c.AUTOFILL }));
  }
  function me(R, U, z) {
    if (!f || !F || !$ || !L || !x)
      return;
    f.value = String(R || ""), F.textContent = U || "", $.textContent = `${z} pages`, k(z), L.classList.remove("hidden"), x.classList.add("hidden"), E(), Ie(U);
    const te = rt(z, 0);
    s.updateDocument({
      id: R,
      title: U,
      pageCount: te
    }), h.setDocument(R, U, te), se();
  }
  function ae(R) {
    const U = String(R || "").trim();
    if (U === "") return null;
    const z = Ge.find((le) => String(le.id || "").trim() === U);
    if (z) return z;
    const te = ee.recentDocuments.find((le) => String(le.id || "").trim() === U);
    if (te) return te;
    const ie = ee.searchResults.find((le) => String(le.id || "").trim() === U);
    return ie || null;
  }
  function O() {
    const R = ae(f?.value || "");
    if (!R) return !0;
    const U = dt(R.compatibilityTier);
    return ut(U) ? (Ae(R, R.compatibilityReason || ""), H(), b(V(R.compatibilityReason || "")), L && L.classList.add("hidden"), x && x.classList.remove("hidden"), _?.focus(), !1) : (se(), !0);
  }
  function we() {
    if (!F || !$ || !L || !x)
      return;
    const R = (f?.value || "").trim();
    if (!R) return;
    const U = Ge.find((z) => String(z.id || "").trim() === R);
    U && (F.textContent.trim() || (F.textContent = U.title || "Untitled"), (!$.textContent.trim() || $.textContent.trim() === "pages") && ($.textContent = `${U.pageCount || 0} pages`), k(U.pageCount || 0), L.classList.remove("hidden"), x.classList.add("hidden"));
  }
  async function ve() {
    try {
      const R = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), U = await fetch(`${e}/panels/esign_documents?${R.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!U.ok)
        throw await m(U, "Failed to load documents");
      const z = await U.json();
      Ge = (Array.isArray(z?.records) ? z.records : Array.isArray(z?.items) ? z.items : []).slice().sort((le, Be) => {
        const Ke = Date.parse(String(le?.created_at ?? le?.createdAt ?? le?.updated_at ?? le?.updatedAt ?? "")), G = Date.parse(String(Be?.created_at ?? Be?.createdAt ?? Be?.updated_at ?? Be?.updatedAt ?? "")), xe = Number.isFinite(Ke) ? Ke : 0;
        return (Number.isFinite(G) ? G : 0) - xe;
      }).map((le) => Zn(le)).filter((le) => le.id !== ""), be(Ge), we();
    } catch (R) {
      const U = Bt(R) ? String(R.message || "Failed to load documents") : "Failed to load documents", z = Bt(R) ? String(R.code || "") : "", te = Bt(R) ? Number(R.status || 0) : 0, ie = A(U, z, te);
      N && (N.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${_t(ie)}</div>`);
    }
  }
  function be(R) {
    if (!N) return;
    if (R.length === 0) {
      N.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${_t(n)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    N.innerHTML = R.map((z, te) => {
      const ie = _t(String(z.id || "").trim()), le = _t(String(z.title || "").trim()), Be = String(rt(z.pageCount, 0)), Ke = dt(z.compatibilityTier), G = tt(z.compatibilityReason), xe = _t(Ke), Ne = _t(G), wt = ut(Ke) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${te === 0 ? "0" : "-1"}"
                data-document-id="${ie}"
                data-document-title="${le}"
                data-document-pages="${Be}"
                data-document-compatibility-tier="${xe}"
                data-document-compatibility-reason="${Ne}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${le}</div>
            <div class="text-xs text-gray-500">${Be} pages ${wt}</div>
          </div>
        </button>
      `;
    }).join("");
    const U = Array.from(N.querySelectorAll(".document-option"));
    U.forEach((z, te) => {
      z.addEventListener("click", () => Ee(z)), z.addEventListener("keydown", (ie) => {
        let le = te;
        if (ie.key === "ArrowDown")
          ie.preventDefault(), le = Math.min(te + 1, U.length - 1);
        else if (ie.key === "ArrowUp")
          ie.preventDefault(), le = Math.max(te - 1, 0);
        else if (ie.key === "Enter" || ie.key === " ") {
          ie.preventDefault(), Ee(z);
          return;
        } else ie.key === "Home" ? (ie.preventDefault(), le = 0) : ie.key === "End" && (ie.preventDefault(), le = U.length - 1);
        le !== te && (U[le].focus(), U[le].setAttribute("tabindex", "0"), z.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Ee(R) {
    const U = R.getAttribute("data-document-id"), z = R.getAttribute("data-document-title"), te = R.getAttribute("data-document-pages"), ie = dt(R.getAttribute("data-document-compatibility-tier")), le = tt(R.getAttribute("data-document-compatibility-reason"));
    if (ut(ie)) {
      Ae({ id: String(U || ""), title: String(z || ""), pageCount: rt(te, 0), compatibilityReason: le }), H(), b(V(le)), _?.focus();
      return;
    }
    me(U, z, te);
  }
  async function v(R, U, z) {
    const te = String(R || "").trim();
    if (!te) return;
    const ie = Date.now(), le = 12e4, Be = 1250;
    for (; Date.now() - ie < le; ) {
      const Ke = await fetch(te, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!Ke.ok)
        throw await m(Ke, "Failed to read remediation status");
      const xe = (await Ke.json())?.dispatch || {}, Ne = String(xe?.status || "").trim().toLowerCase();
      if (Ne === "succeeded") {
        he("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (Ne === "failed" || Ne === "canceled" || Ne === "dead_letter") {
        const wt = String(xe?.terminal_reason || "").trim();
        throw { message: wt ? `Remediation failed: ${wt}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      he(Ne === "retrying" ? "Remediation is retrying in the queue..." : Ne === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((wt) => setTimeout(wt, Be));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${U} (${z})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function w() {
    const R = Oe;
    if (!R || !R.id) return;
    const U = String(R.id || "").trim();
    if (!(!U || at.has(U))) {
      at.add(U), J && (J.disabled = !0, J.textContent = "Remediating...");
      try {
        let z = pt.get(U) || "";
        z || (z = `esign-remediate-${U}-${Date.now()}`, pt.set(U, z));
        const te = `${t}/esign/documents/${encodeURIComponent(U)}/remediate`, ie = await fetch(te, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": z
          }
        });
        if (!ie.ok)
          throw await m(ie, "Failed to trigger remediation");
        const le = await ie.json(), Be = le?.receipt || {}, Ke = String(Be?.dispatch_id || le?.dispatch_id || "").trim(), G = String(Be?.mode || le?.mode || "").trim().toLowerCase();
        let xe = String(le?.dispatch_status_url || "").trim();
        !xe && Ke && (xe = `${t}/esign/dispatches/${encodeURIComponent(Ke)}`), G === "queued" && Ke && xe && (he("Remediation queued. Monitoring progress..."), await v(xe, Ke, U)), await ve();
        const Ne = ae(U);
        if (!Ne || ut(Ne.compatibilityTier)) {
          he("Remediation finished, but this PDF is still incompatible.", "error"), b("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        me(Ne.id, Ne.title, Ne.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : S("Document remediated successfully. You can continue.", "success");
      } catch (z) {
        const te = Bt(z) ? String(z.message || "Remediation failed").trim() : "Remediation failed", ie = Bt(z) ? String(z.code || "") : "", le = Bt(z) ? Number(z.status || 0) : 0;
        he(te, "error"), b(te, ie, le);
      } finally {
        at.delete(U), J && (J.disabled = !1, J.textContent = "Remediate PDF");
      }
    }
  }
  function I(R, U) {
    let z = null;
    return (...te) => {
      z !== null && clearTimeout(z), z = setTimeout(() => {
        R(...te), z = null;
      }, U);
    };
  }
  async function q() {
    try {
      const R = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Ce)
      }), U = await fetch(`${e}/panels/esign_documents?${R}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!U.ok) {
        console.warn("Failed to load recent documents:", U.status);
        return;
      }
      const z = await U.json(), te = Array.isArray(z?.records) ? z.records : Array.isArray(z?.items) ? z.items : [];
      ee.recentDocuments = te.map((ie) => Zn(ie)).filter((ie) => ie.id !== "").slice(0, Ce);
    } catch (R) {
      console.warn("Error loading recent documents:", R);
    }
  }
  async function W(R) {
    const U = R.trim();
    if (!U) {
      Re && (Re.abort(), Re = null), ee.isSearchMode = !1, ee.searchResults = [], Me();
      return;
    }
    const z = ++Se;
    Re && Re.abort(), Re = new AbortController(), ee.isLoading = !0, ee.isSearchMode = !0, Me();
    try {
      const te = new URLSearchParams({
        q: U,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(de)
      }), ie = await fetch(`${e}/panels/esign_documents?${te}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Re.signal
      });
      if (z !== Se) return;
      if (!ie.ok) {
        console.warn("Failed to search documents:", ie.status), ee.searchResults = [], ee.isLoading = !1, Me();
        return;
      }
      const le = await ie.json(), Be = Array.isArray(le?.records) ? le.records : Array.isArray(le?.items) ? le.items : [];
      ee.searchResults = Be.map((Ke) => Zn(Ke)).filter((Ke) => Ke.id !== "").slice(0, de);
    } catch (te) {
      if (Bt(te) && te.name === "AbortError")
        return;
      console.warn("Error searching documents:", te), ee.searchResults = [];
    } finally {
      z === Se && (ee.isLoading = !1, Me());
    }
  }
  const K = I(W, Te);
  function oe() {
    fe && (ee.isOpen = !0, ee.selectedIndex = -1, fe.classList.remove("hidden"), _?.setAttribute("aria-expanded", "true"), N?.classList.add("hidden"), Me());
  }
  function ue() {
    fe && (ee.isOpen = !1, ee.selectedIndex = -1, fe.classList.add("hidden"), _?.setAttribute("aria-expanded", "false"), N?.classList.remove("hidden"));
  }
  function He(R, U, z) {
    R && (R.innerHTML = U.map((te, ie) => {
      const le = ie, Be = ee.selectedIndex === le, Ke = _t(String(te.id || "").trim()), G = _t(String(te.title || "").trim()), xe = String(rt(te.pageCount, 0)), Ne = dt(te.compatibilityTier), bt = tt(te.compatibilityReason), wt = _t(Ne), nn = _t(bt), Pn = ut(Ne) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${Be ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${Be}"
          tabindex="-1"
          data-document-id="${Ke}"
          data-document-title="${G}"
          data-document-pages="${xe}"
          data-document-compatibility-tier="${wt}"
          data-document-compatibility-reason="${nn}"
          data-typeahead-index="${le}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${G}</div>
            <div class="text-xs text-gray-500">${xe} pages ${Pn}</div>
          </div>
        </button>
      `;
    }).join(""), R.querySelectorAll(".typeahead-option").forEach((te) => {
      te.addEventListener("click", () => it(te));
    }));
  }
  function Me() {
    if (fe) {
      if (ee.isLoading) {
        Je?.classList.remove("hidden"), De?.classList.add("hidden"), ze?.classList.add("hidden"), Ve?.classList.add("hidden"), ye?.classList.remove("hidden");
        return;
      }
      Je?.classList.add("hidden"), ye?.classList.add("hidden"), ee.isSearchMode ? (De?.classList.add("hidden"), ee.searchResults.length > 0 ? (ze?.classList.remove("hidden"), Ve?.classList.add("hidden"), He(st, ee.searchResults)) : (ze?.classList.add("hidden"), Ve?.classList.remove("hidden"))) : (ze?.classList.add("hidden"), ee.recentDocuments.length > 0 ? (De?.classList.remove("hidden"), Ve?.classList.add("hidden"), He(ke, ee.recentDocuments)) : (De?.classList.add("hidden"), Ve?.classList.remove("hidden"), Ve && (Ve.textContent = "No recent documents")));
    }
  }
  function it(R) {
    const U = R.getAttribute("data-document-id"), z = R.getAttribute("data-document-title"), te = R.getAttribute("data-document-pages"), ie = dt(R.getAttribute("data-document-compatibility-tier")), le = tt(R.getAttribute("data-document-compatibility-reason"));
    if (U) {
      if (ut(ie)) {
        Ae({ id: String(U || ""), title: String(z || ""), pageCount: rt(te, 0), compatibilityReason: le }), H(), b(V(le)), _?.focus();
        return;
      }
      me(U, z, te), ue(), _ && (_.value = ""), ee.query = "", ee.isSearchMode = !1, ee.searchResults = [];
    }
  }
  function We() {
    if (!fe) return;
    const R = fe.querySelector(`[data-typeahead-index="${ee.selectedIndex}"]`);
    R && R.scrollIntoView({ block: "nearest" });
  }
  function yt(R) {
    if (!ee.isOpen) {
      (R.key === "ArrowDown" || R.key === "Enter") && (R.preventDefault(), oe());
      return;
    }
    const U = ee.isSearchMode ? ee.searchResults : ee.recentDocuments, z = U.length - 1;
    switch (R.key) {
      case "ArrowDown":
        R.preventDefault(), ee.selectedIndex = Math.min(ee.selectedIndex + 1, z), Me(), We();
        break;
      case "ArrowUp":
        R.preventDefault(), ee.selectedIndex = Math.max(ee.selectedIndex - 1, 0), Me(), We();
        break;
      case "Enter":
        if (R.preventDefault(), ee.selectedIndex >= 0 && ee.selectedIndex <= z) {
          const te = U[ee.selectedIndex];
          if (te) {
            const ie = document.createElement("button");
            ie.setAttribute("data-document-id", te.id), ie.setAttribute("data-document-title", te.title), ie.setAttribute("data-document-pages", String(te.pageCount)), ie.setAttribute("data-document-compatibility-tier", String(te.compatibilityTier || "")), ie.setAttribute("data-document-compatibility-reason", String(te.compatibilityReason || "")), it(ie);
          }
        }
        break;
      case "Escape":
        R.preventDefault(), ue();
        break;
      case "Tab":
        ue();
        break;
      case "Home":
        R.preventDefault(), ee.selectedIndex = 0, Me(), We();
        break;
      case "End":
        R.preventDefault(), ee.selectedIndex = z, Me(), We();
        break;
    }
  }
  function Xe() {
    j && j.addEventListener("click", () => {
      L?.classList.add("hidden"), x?.classList.remove("hidden"), se(), _?.focus(), oe();
    }), J && J.addEventListener("click", () => {
      w();
    }), ge && ge.addEventListener("click", () => {
      se(), _?.focus();
    }), _ && (_.addEventListener("input", (R) => {
      const U = R.target;
      if (!(U instanceof HTMLInputElement)) return;
      const z = U.value;
      ee.query = z, ee.isOpen || oe(), z.trim() ? (ee.isLoading = !0, Me(), K(z)) : (ee.isSearchMode = !1, ee.searchResults = [], Me());
      const te = Ge.filter(
        (ie) => String(ie.title || "").toLowerCase().includes(z.toLowerCase())
      );
      be(te);
    }), _.addEventListener("focus", () => {
      oe();
    }), _.addEventListener("keydown", yt)), document.addEventListener("click", (R) => {
      const U = R.target;
      Pe && !(U instanceof Node && Pe.contains(U)) && ue();
    });
  }
  return {
    refs: {
      documentIdInput: f,
      selectedDocument: L,
      documentPicker: x,
      documentSearch: _,
      documentList: N,
      selectedDocumentTitle: F,
      selectedDocumentInfo: $,
      documentPageCountInput: P
    },
    bindEvents: Xe,
    initializeTitleSourceSeed: Le,
    loadDocuments: ve,
    loadRecentDocuments: q,
    ensureSelectedDocumentCompatibility: O,
    getCurrentDocumentPageCount: T
  };
}
function Ct(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function ei(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function ca(i = {}) {
  const {
    initialParticipants: e = [],
    onParticipantsChanged: t
  } = i, n = document.getElementById("participants-container"), r = document.getElementById("participant-template"), c = document.getElementById("add-participant-btn");
  let d = 0, s = 0;
  function h() {
    return `temp_${Date.now()}_${d++}`;
  }
  function m(L = {}) {
    if (!(r instanceof HTMLTemplateElement) || !n)
      return;
    const x = r.content.cloneNode(!0), _ = x.querySelector(".participant-entry");
    if (!(_ instanceof HTMLElement)) return;
    const N = L.id || h();
    _.setAttribute("data-participant-id", N);
    const j = Ct(_, ".participant-id-input"), F = Ct(_, 'input[name="participants[].name"]'), $ = Ct(_, 'input[name="participants[].email"]'), P = ei(_, 'select[name="participants[].role"]'), Q = Ct(_, 'input[name="participants[].signing_stage"]'), re = Ct(_, 'input[name="participants[].notify"]'), Z = _.querySelector(".signing-stage-wrapper");
    if (!j || !F || !$ || !P) return;
    const J = s++;
    j.name = `participants[${J}].id`, j.value = N, F.name = `participants[${J}].name`, $.name = `participants[${J}].email`, P.name = `participants[${J}].role`, Q && (Q.name = `participants[${J}].signing_stage`), re && (re.name = `participants[${J}].notify`), L.name && (F.value = L.name), L.email && ($.value = L.email), L.role && (P.value = L.role), Q && L.signing_stage && (Q.value = String(L.signing_stage)), re && (re.checked = L.notify !== !1);
    const ge = () => {
      if (!(Z instanceof HTMLElement) || !Q) return;
      const ne = P.value === "signer";
      Z.classList.toggle("hidden", !ne), ne ? Q.value || (Q.value = "1") : Q.value = "";
    };
    ge(), _.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      _.remove(), t?.();
    }), P.addEventListener("change", () => {
      ge(), t?.();
    }), n.appendChild(x);
  }
  function b() {
    n && (e.length > 0 ? e.forEach((L) => {
      m({
        id: String(L.id || "").trim(),
        name: String(L.name || "").trim(),
        email: String(L.email || "").trim(),
        role: String(L.role || "signer").trim() || "signer",
        notify: L.notify !== !1,
        signing_stage: Number(L.signing_stage || L.signingStage || 1) || 1
      });
    }) : m());
  }
  function S() {
    if (!n) return;
    c?.addEventListener("click", () => m()), new MutationObserver(() => {
      t?.();
    }).observe(n, { childList: !0, subtree: !0 }), n.addEventListener("change", (x) => {
      const _ = x.target;
      _ instanceof Element && (_.matches('select[name*=".role"]') || _.matches('input[name*=".name"]') || _.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (x) => {
      const _ = x.target;
      _ instanceof Element && (_.matches('input[name*=".name"]') || _.matches('input[name*=".email"]')) && t?.();
    });
  }
  function A() {
    if (!n) return [];
    const L = n.querySelectorAll(".participant-entry"), x = [];
    return L.forEach((_) => {
      const N = _.getAttribute("data-participant-id"), j = ei(_, 'select[name*=".role"]'), F = Ct(_, 'input[name*=".name"]'), $ = Ct(_, 'input[name*=".email"]');
      j?.value === "signer" && x.push({
        id: String(N || ""),
        name: F?.value || $?.value || "Signer",
        email: $?.value || ""
      });
    }), x;
  }
  function E() {
    if (!n) return [];
    const L = [];
    return n.querySelectorAll(".participant-entry").forEach((x) => {
      const _ = x.getAttribute("data-participant-id"), N = Ct(x, 'input[name*=".name"]')?.value || "", j = Ct(x, 'input[name*=".email"]')?.value || "", F = ei(x, 'select[name*=".role"]')?.value || "signer", $ = Number.parseInt(Ct(x, ".signing-stage-input")?.value || "1", 10), P = Ct(x, ".notify-input")?.checked !== !1;
      L.push({
        tempId: String(_ || ""),
        name: N,
        email: j,
        role: F,
        notify: P,
        signingStage: Number.isFinite($) ? $ : 1
      });
    }), L;
  }
  function f(L) {
    !n || !L?.participants || L.participants.length === 0 || (n.innerHTML = "", s = 0, L.participants.forEach((x) => {
      m({
        id: x.tempId,
        name: x.name,
        email: x.email,
        role: x.role,
        notify: x.notify !== !1,
        signing_stage: x.signingStage
      });
    }));
  }
  return {
    refs: {
      participantsContainer: n,
      addParticipantBtn: c
    },
    initialize: b,
    bindEvents: S,
    addParticipant: m,
    getSignerParticipants: A,
    collectParticipantsForState: E,
    restoreFromState: f
  };
}
function la() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function _n() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function da(i, e) {
  return {
    id: la(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function gr(i, e) {
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
function Vi(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Gi(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function mr(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function ua(i, e) {
  const t = mr(i, e.definitionId);
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
function pa(i, e, t, n) {
  const r = /* @__PURE__ */ new Set();
  for (const c of t)
    r.add(c.definitionId);
  for (const [c, d] of n) {
    if (d.page !== e || r.has(c) || i.unlinkedDefinitions.has(c)) continue;
    const s = i.definitionToGroup.get(c);
    if (!s) continue;
    const h = i.groups.get(s);
    if (!h || !h.isActive || !h.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: c,
      type: d.type,
      participantId: d.participantId,
      participantName: d.participantName,
      page: e,
      x: h.templatePosition.x,
      y: h.templatePosition.y,
      width: h.templatePosition.width,
      height: h.templatePosition.height,
      placementSource: vt.AUTO_LINKED,
      linkGroupId: h.id,
      linkedFromFieldId: h.sourceFieldId
    } };
  }
  return null;
}
function Lt(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function et(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function ft(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Wi(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function Ft(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLElement ? t : null;
}
function ga(i) {
  const {
    initialFieldInstances: e = [],
    placementSource: t,
    getCurrentDocumentPageCount: n,
    getSignerParticipants: r,
    escapeHtml: c,
    onDefinitionsChanged: d,
    onRulesChanged: s,
    onParticipantsChanged: h,
    getPlacementLinkGroupState: m,
    setPlacementLinkGroupState: b
  } = i, S = Lt("field-definitions-container"), A = document.getElementById("field-definition-template"), E = Lt("add-field-btn"), f = Lt("add-field-btn-container"), L = Lt("add-field-definition-empty-btn"), x = Lt("field-definitions-empty-state"), _ = Lt("field-rules-container"), N = document.getElementById("field-rule-template"), j = Lt("add-field-rule-btn"), F = Lt("field-rules-empty-state"), $ = Lt("field-rules-preview"), P = Lt("field_rules_json"), Q = Lt("field_placements_json");
  let re = 0, Z = 0, J = 0;
  function ge() {
    return `temp_field_${Date.now()}_${re++}`;
  }
  function ne() {
    return `rule_${Date.now()}_${J}`;
  }
  function Te(k, T) {
    const H = String(k || "").trim();
    return H && T.some((V) => V.id === H) ? H : T.length === 1 ? T[0].id : "";
  }
  function Ce(k, T, H = "") {
    if (!k) return;
    const V = Te(H, T);
    k.innerHTML = '<option value="">Select signer...</option>', T.forEach((se) => {
      const he = document.createElement("option");
      he.value = se.id, he.textContent = se.name, k.appendChild(he);
    }), k.value = V;
  }
  function de(k = r()) {
    if (!S) return;
    const T = S.querySelectorAll(".field-participant-select"), H = _ ? _.querySelectorAll(".field-rule-participant-select") : [];
    T.forEach((V) => {
      Ce(
        V instanceof HTMLSelectElement ? V : null,
        k,
        V instanceof HTMLSelectElement ? V.value : ""
      );
    }), H.forEach((V) => {
      Ce(
        V instanceof HTMLSelectElement ? V : null,
        k,
        V instanceof HTMLSelectElement ? V.value : ""
      );
    });
  }
  function Pe() {
    if (!S || !x) return;
    S.querySelectorAll(".field-definition-entry").length === 0 ? (x.classList.remove("hidden"), f?.classList.add("hidden")) : (x.classList.add("hidden"), f?.classList.remove("hidden"));
  }
  function fe() {
    if (!_ || !F) return;
    const k = _.querySelectorAll(".field-rule-entry");
    F.classList.toggle("hidden", k.length > 0);
  }
  function De() {
    if (!S) return [];
    const k = [];
    return S.querySelectorAll(".field-definition-entry").forEach((T) => {
      const H = T.getAttribute("data-field-definition-id"), V = ft(T, ".field-type-select")?.value || "signature", se = ft(T, ".field-participant-select")?.value || "", he = Number.parseInt(et(T, 'input[name*=".page"]')?.value || "1", 10), Ae = et(T, 'input[name*=".required"]')?.checked ?? !0;
      k.push({
        tempId: String(H || ""),
        type: V,
        participantTempId: se,
        page: Number.isFinite(he) ? he : 1,
        required: Ae
      });
    }), k;
  }
  function ke() {
    if (!_) return [];
    const k = n(), T = _.querySelectorAll(".field-rule-entry"), H = [];
    return T.forEach((V) => {
      const se = Sn({
        id: V.getAttribute("data-field-rule-id") || "",
        type: ft(V, ".field-rule-type-select")?.value || "",
        participantId: ft(V, ".field-rule-participant-select")?.value || "",
        fromPage: et(V, ".field-rule-from-page-input")?.value || "",
        toPage: et(V, ".field-rule-to-page-input")?.value || "",
        page: et(V, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!et(V, ".field-rule-exclude-last-input")?.checked,
        excludePages: Ln(et(V, ".field-rule-exclude-pages-input")?.value || ""),
        required: (ft(V, ".field-rule-required-select")?.value || "1") !== "0"
      }, k);
      se.type && H.push(se);
    }), H;
  }
  function ze() {
    return ke().map((k) => ({
      id: k.id,
      type: k.type,
      participant_id: k.participantId,
      from_page: k.fromPage,
      to_page: k.toPage,
      page: k.page,
      exclude_last_page: k.excludeLastPage,
      exclude_pages: k.excludePages,
      required: k.required
    }));
  }
  function st(k, T) {
    return ia(k, T);
  }
  function Ve() {
    if (!$) return;
    const k = ke(), T = n(), H = st(k, T), V = r(), se = new Map(V.map((me) => [String(me.id), me.name]));
    if (P && (P.value = JSON.stringify(ze())), !H.length) {
      $.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const he = H.reduce((me, ae) => {
      const O = ae.type;
      return me[O] = (me[O] || 0) + 1, me;
    }, {}), Ae = H.slice(0, 8).map((me) => {
      const ae = se.get(String(me.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${me.type === "initials" ? "Initials" : "Signature"} on page ${me.page}</span><span class="text-gray-500">${c(String(ae))}</span></li>`;
    }).join(""), Ie = H.length - 8;
    $.innerHTML = `
      <p class="text-gray-700">${H.length} generated field${H.length !== 1 ? "s" : ""} (${he.initials || 0} initials, ${he.signature || 0} signatures)</p>
      <ul class="space-y-1">${Ae}</ul>
      ${Ie > 0 ? `<p class="text-gray-500">+${Ie} more</p>` : ""}
    `;
  }
  function Je() {
    const k = r();
    de(k), Ve();
  }
  function ye(k) {
    const T = ft(k, ".field-rule-type-select"), H = Ft(k, ".field-rule-range-start-wrap"), V = Ft(k, ".field-rule-range-end-wrap"), se = Ft(k, ".field-rule-page-wrap"), he = Ft(k, ".field-rule-exclude-last-wrap"), Ae = Ft(k, ".field-rule-exclude-pages-wrap"), Ie = Ft(k, ".field-rule-summary"), me = et(k, ".field-rule-from-page-input"), ae = et(k, ".field-rule-to-page-input"), O = et(k, ".field-rule-page-input"), we = et(k, ".field-rule-exclude-last-input"), ve = et(k, ".field-rule-exclude-pages-input");
    if (!T || !H || !V || !se || !he || !Ae || !Ie)
      return;
    const be = n(), Ee = Sn({
      type: T?.value || "",
      fromPage: me?.value || "",
      toPage: ae?.value || "",
      page: O?.value || "",
      excludeLastPage: !!we?.checked,
      excludePages: Ln(ve?.value || ""),
      required: !0
    }, be), v = Ee.fromPage > 0 ? Ee.fromPage : 1, w = Ee.toPage > 0 ? Ee.toPage : be, I = Ee.page > 0 ? Ee.page : Ee.toPage > 0 ? Ee.toPage : be, q = Ee.excludeLastPage, W = Ee.excludePages.join(","), K = T?.value === "initials_each_page";
    if (H.classList.toggle("hidden", !K), V.classList.toggle("hidden", !K), he.classList.toggle("hidden", !K), Ae.classList.toggle("hidden", !K), se.classList.toggle("hidden", K), me && (me.value = String(v)), ae && (ae.value = String(w)), O && (O.value = String(I)), ve && (ve.value = W), we && (we.checked = q), K) {
      const oe = ra(
        v,
        w,
        be,
        q,
        Ee.excludePages
      ), ue = sa(oe);
      Ie.textContent = oe.isEmpty ? `Warning: No initials fields will be generated ${ue}.` : `Generates initials fields on ${ue}.`;
    } else
      Ie.textContent = `Generates one signature field on page ${I}.`;
  }
  function ee(k = {}) {
    if (!(N instanceof HTMLTemplateElement) || !_) return;
    const T = N.content.cloneNode(!0), H = T.querySelector(".field-rule-entry");
    if (!(H instanceof HTMLElement)) return;
    const V = k.id || ne(), se = J++, he = n();
    H.setAttribute("data-field-rule-id", V);
    const Ae = et(H, ".field-rule-id-input"), Ie = ft(H, ".field-rule-type-select"), me = ft(H, ".field-rule-participant-select"), ae = et(H, ".field-rule-from-page-input"), O = et(H, ".field-rule-to-page-input"), we = et(H, ".field-rule-page-input"), ve = ft(H, ".field-rule-required-select"), be = et(H, ".field-rule-exclude-last-input"), Ee = et(H, ".field-rule-exclude-pages-input"), v = Wi(H, ".remove-field-rule-btn");
    if (!Ae || !Ie || !me || !ae || !O || !we || !ve || !be || !Ee || !v)
      return;
    Ae.name = `field_rules[${se}].id`, Ae.value = V, Ie.name = `field_rules[${se}].type`, me.name = `field_rules[${se}].participant_id`, ae.name = `field_rules[${se}].from_page`, O.name = `field_rules[${se}].to_page`, we.name = `field_rules[${se}].page`, ve.name = `field_rules[${se}].required`, be.name = `field_rules[${se}].exclude_last_page`, Ee.name = `field_rules[${se}].exclude_pages`;
    const w = Sn(k, he);
    Ie.value = w.type || "initials_each_page", Ce(me, r(), w.participantId), ae.value = String(w.fromPage > 0 ? w.fromPage : 1), O.value = String(w.toPage > 0 ? w.toPage : he), we.value = String(w.page > 0 ? w.page : he), ve.value = w.required ? "1" : "0", be.checked = w.excludeLastPage, Ee.value = w.excludePages.join(",");
    const I = () => {
      ye(H), Ve(), s?.();
    }, q = () => {
      const K = n();
      if (ae) {
        const oe = parseInt(ae.value, 10);
        Number.isFinite(oe) && (ae.value = String(Kt(oe, K, 1)));
      }
      if (O) {
        const oe = parseInt(O.value, 10);
        Number.isFinite(oe) && (O.value = String(Kt(oe, K, 1)));
      }
      if (we) {
        const oe = parseInt(we.value, 10);
        Number.isFinite(oe) && (we.value = String(Kt(oe, K, 1)));
      }
    }, W = () => {
      q(), I();
    };
    Ie.addEventListener("change", I), me.addEventListener("change", I), ae.addEventListener("input", W), ae.addEventListener("change", W), O.addEventListener("input", W), O.addEventListener("change", W), we.addEventListener("input", W), we.addEventListener("change", W), ve.addEventListener("change", I), be.addEventListener("change", () => {
      const K = n();
      O.value = String(be.checked ? Math.max(1, K - 1) : K), I();
    }), Ee.addEventListener("input", I), v.addEventListener("click", () => {
      H.remove(), fe(), Ve(), s?.();
    }), _.appendChild(T), ye(_.lastElementChild || H), fe(), Ve();
  }
  function Ge(k = {}) {
    if (!(A instanceof HTMLTemplateElement) || !S) return;
    const T = A.content.cloneNode(!0), H = T.querySelector(".field-definition-entry");
    if (!(H instanceof HTMLElement)) return;
    const V = String(k.id || ge()).trim() || ge();
    H.setAttribute("data-field-definition-id", V);
    const se = et(H, ".field-definition-id-input"), he = ft(H, 'select[name="field_definitions[].type"]'), Ae = ft(H, 'select[name="field_definitions[].participant_id"]'), Ie = et(H, 'input[name="field_definitions[].page"]'), me = et(H, 'input[name="field_definitions[].required"]'), ae = Ft(H, ".field-date-signed-info");
    if (!se || !he || !Ae || !Ie || !me || !ae) return;
    const O = Z++;
    se.name = `field_instances[${O}].id`, se.value = V, he.name = `field_instances[${O}].type`, Ae.name = `field_instances[${O}].participant_id`, Ie.name = `field_instances[${O}].page`, me.name = `field_instances[${O}].required`, k.type && (he.value = String(k.type)), k.page !== void 0 && (Ie.value = String(Kt(k.page, n(), 1))), k.required !== void 0 && (me.checked = !!k.required);
    const we = String(k.participant_id || k.participantId || "").trim();
    Ce(Ae, r(), we), he.addEventListener("change", () => {
      he.value === "date_signed" ? ae.classList.remove("hidden") : ae.classList.add("hidden");
    }), he.value === "date_signed" && ae.classList.remove("hidden"), Wi(H, ".remove-field-definition-btn")?.addEventListener("click", () => {
      H.remove(), Pe(), d?.();
    });
    const ve = et(H, 'input[name*=".page"]'), be = () => {
      ve && (ve.value = String(Kt(ve.value, n(), 1)));
    };
    be(), ve?.addEventListener("input", be), ve?.addEventListener("change", be), S.appendChild(T), Pe();
  }
  function Oe() {
    E?.addEventListener("click", () => Ge()), L?.addEventListener("click", () => Ge()), j?.addEventListener("click", () => ee({ to_page: n() })), h?.();
  }
  function Se() {
    const k = [];
    window._initialFieldPlacementsData = k, e.forEach((T) => {
      const H = String(T.id || "").trim();
      if (!H) return;
      const V = String(T.type || "signature").trim() || "signature", se = String(T.participant_id || T.participantId || "").trim(), he = Number(T.page || 1) || 1, Ae = !!T.required;
      Ge({
        id: H,
        type: V,
        participant_id: se,
        page: he,
        required: Ae
      }), k.push(tn({
        id: H,
        definitionId: H,
        type: V,
        participantId: se,
        participantName: String(T.participant_name || T.participantName || "").trim(),
        page: he,
        x: Number(T.x || T.pos_x || 0) || 0,
        y: Number(T.y || T.pos_y || 0) || 0,
        width: Number(T.width || 150) || 150,
        height: Number(T.height || 32) || 32,
        placementSource: String(T.placement_source || T.placementSource || t.MANUAL).trim() || t.MANUAL
      }, k.length));
    }), Pe(), Je(), fe(), Ve();
  }
  function Re() {
    const k = window._initialFieldPlacementsData;
    return Array.isArray(k) ? k.map((T, H) => tn(T, H)) : [];
  }
  function at() {
    if (!S) return [];
    const k = r(), T = new Map(k.map((ae) => [String(ae.id), ae.name || ae.email || "Signer"])), H = [];
    S.querySelectorAll(".field-definition-entry").forEach((ae) => {
      const O = String(ae.getAttribute("data-field-definition-id") || "").trim(), we = ft(ae, ".field-type-select"), ve = ft(ae, ".field-participant-select"), be = et(ae, 'input[name*=".page"]'), Ee = String(we?.value || "text").trim() || "text", v = String(ve?.value || "").trim(), w = parseInt(String(be?.value || "1"), 10) || 1;
      H.push({
        definitionId: O,
        fieldType: Ee,
        participantId: v,
        participantName: T.get(v) || "Unassigned",
        page: w
      });
    });
    const se = st(ke(), n()), he = /* @__PURE__ */ new Map();
    se.forEach((ae) => {
      const O = String(ae.ruleId || "").trim(), we = String(ae.id || "").trim();
      if (O && we) {
        const ve = he.get(O) || [];
        ve.push(we), he.set(O, ve);
      }
    });
    let Ae = m();
    he.forEach((ae, O) => {
      if (ae.length > 1 && !Ae.groups.get(`rule_${O}`)) {
        const ve = da(ae, `Rule ${O}`);
        ve.id = `rule_${O}`, Ae = gr(Ae, ve);
      }
    }), b(Ae), se.forEach((ae) => {
      const O = String(ae.id || "").trim();
      if (!O) return;
      const we = String(ae.participantId || "").trim(), ve = parseInt(String(ae.page || "1"), 10) || 1, be = String(ae.ruleId || "").trim();
      H.push({
        definitionId: O,
        fieldType: String(ae.type || "text").trim() || "text",
        participantId: we,
        participantName: T.get(we) || "Unassigned",
        page: ve,
        linkGroupId: be ? `rule_${be}` : void 0
      });
    });
    const Ie = /* @__PURE__ */ new Set(), me = H.filter((ae) => {
      const O = String(ae.definitionId || "").trim();
      return !O || Ie.has(O) ? !1 : (Ie.add(O), !0);
    });
    return me.sort((ae, O) => ae.page !== O.page ? ae.page - O.page : ae.definitionId.localeCompare(O.definitionId)), me;
  }
  function pt(k) {
    const T = String(k || "").trim();
    if (!T) return null;
    const V = at().find((se) => String(se.definitionId || "").trim() === T);
    return V ? {
      id: T,
      type: String(V.fieldType || "text").trim() || "text",
      participant_id: String(V.participantId || "").trim(),
      participant_name: String(V.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(V.page || "1"), 10) || 1,
      link_group_id: String(V.linkGroupId || "").trim()
    } : null;
  }
  function dt() {
    if (!S) return [];
    const k = r(), T = /* @__PURE__ */ new Map();
    return k.forEach((se) => T.set(se.id, !1)), S.querySelectorAll(".field-definition-entry").forEach((se) => {
      const he = ft(se, ".field-type-select"), Ae = ft(se, ".field-participant-select"), Ie = et(se, 'input[name*=".required"]');
      he?.value === "signature" && Ae?.value && Ie?.checked && T.set(Ae.value, !0);
    }), st(ke(), n()).forEach((se) => {
      se.type === "signature" && se.participantId && se.required && T.set(se.participantId, !0);
    }), k.filter((se) => !T.get(se.id));
  }
  function tt(k) {
    if (!Array.isArray(k) || k.length === 0)
      return "Each signer requires at least one required signature field.";
    const T = k.map((H) => H?.name?.trim()).filter(Boolean);
    return T.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${T.join(", ")}`;
  }
  function ut(k) {
    !S || !k?.fieldDefinitions || k.fieldDefinitions.length === 0 || (S.innerHTML = "", Z = 0, k.fieldDefinitions.forEach((T) => {
      Ge({
        id: T.tempId,
        type: T.type,
        participant_id: T.participantTempId,
        page: T.page,
        required: T.required
      });
    }), Pe());
  }
  function Le(k) {
    !Array.isArray(k?.fieldRules) || k.fieldRules.length === 0 || _ && (_.querySelectorAll(".field-rule-entry").forEach((T) => T.remove()), J = 0, k.fieldRules.forEach((T) => {
      ee({
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
    }), fe(), Ve());
  }
  return {
    refs: {
      fieldDefinitionsContainer: S,
      fieldRulesContainer: _,
      addFieldBtn: E,
      fieldPlacementsJSONInput: Q,
      fieldRulesJSONInput: P
    },
    bindEvents: Oe,
    initialize: Se,
    buildInitialPlacementInstances: Re,
    collectFieldDefinitionsForState: De,
    collectFieldRulesForState: ke,
    collectFieldRulesForForm: ze,
    expandRulesForPreview: st,
    renderFieldRulePreview: Ve,
    updateFieldParticipantOptions: Je,
    collectPlacementFieldDefinitions: at,
    getFieldDefinitionById: pt,
    findSignersMissingRequiredSignatureField: dt,
    missingSignatureFieldMessage: tt,
    restoreFieldDefinitionsFromState: ut,
    restoreFieldRulesFromState: Le
  };
}
function ma(i) {
  return typeof i == "object" && i !== null && "run" in i;
}
const zt = {
  signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
  name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
  date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
  text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
  checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
  initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
}, vn = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};
function fa(i) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentIdInput: n,
    fieldPlacementsJSONInput: r,
    initialFieldInstances: c = [],
    initialLinkGroupState: d = null,
    collectPlacementFieldDefinitions: s,
    getFieldDefinitionById: h,
    parseAPIError: m,
    mapUserFacingError: b,
    showToast: S,
    escapeHtml: A,
    onPlacementsChanged: E
  } = i, f = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(c) ? c.map((v, w) => tn(v, w)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: d || _n()
  }, L = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function x(v = "fi") {
    return `${v}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function _(v) {
    return document.querySelector(`.placement-field-item[data-definition-id="${v}"]`);
  }
  function N() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function j(v, w) {
    return v.querySelector(w);
  }
  function F(v, w) {
    return v.querySelector(w);
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
  function P() {
    return f;
  }
  function Q() {
    return f.linkGroupState;
  }
  function re(v) {
    f.linkGroupState = v || _n();
  }
  function Z() {
    return f.fieldInstances.map((v, w) => aa(v, w));
  }
  function J(v = {}) {
    const { silent: w = !1 } = v, I = $();
    I.fieldInstancesContainer && (I.fieldInstancesContainer.innerHTML = "");
    const q = Z();
    return r && (r.value = JSON.stringify(q)), w || E?.(), q;
  }
  function ge() {
    const v = $(), w = Array.from(document.querySelectorAll(".placement-field-item")), I = w.length, q = new Set(
      w.map((ue) => String(ue.dataset.definitionId || "").trim()).filter((ue) => ue)
    ), W = /* @__PURE__ */ new Set();
    f.fieldInstances.forEach((ue) => {
      const He = String(ue.definitionId || "").trim();
      q.has(He) && W.add(He);
    });
    const K = W.size, oe = Math.max(0, I - K);
    v.totalFields && (v.totalFields.textContent = String(I)), v.placedCount && (v.placedCount.textContent = String(K)), v.unplacedCount && (v.unplacedCount.textContent = String(oe));
  }
  function ne(v, w = !1) {
    const I = _(v);
    if (!I) return;
    I.classList.add("opacity-50"), I.draggable = !1;
    const q = I.querySelector(".placement-status");
    q && (q.textContent = "Placed", q.classList.remove("text-amber-600"), q.classList.add("text-green-600")), w && I.classList.add("just-linked");
  }
  function Te(v) {
    const w = _(v);
    if (!w) return;
    w.classList.remove("opacity-50"), w.draggable = !0;
    const I = w.querySelector(".placement-status");
    I && (I.textContent = "Not placed", I.classList.remove("text-green-600"), I.classList.add("text-amber-600"));
  }
  function Ce() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((w) => {
      w.classList.add("linked-flash"), setTimeout(() => {
        w.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function de(v) {
    const w = v === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${v} linked fields`;
    window.toastManager?.info?.(w);
    const I = document.createElement("div");
    I.setAttribute("role", "status"), I.setAttribute("aria-live", "polite"), I.className = "sr-only", I.textContent = w, document.body.appendChild(I), setTimeout(() => I.remove(), 1e3), Ce();
  }
  function Pe(v, w) {
    const I = document.createElement("div");
    I.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", I.dataset.definitionId = v, I.dataset.isLinked = String(w), I.title = w ? "Click to unlink this field" : "Click to re-link this field", I.setAttribute("role", "button"), I.setAttribute("aria-label", w ? "Unlink field from group" : "Re-link field to group"), I.setAttribute("tabindex", "0"), w ? I.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : I.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const q = () => Ve(v, w);
    return I.addEventListener("click", q), I.addEventListener("keydown", (W) => {
      (W.key === "Enter" || W.key === " ") && (W.preventDefault(), q());
    }), I;
  }
  function fe() {
    const v = $();
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
  function De() {
    const v = $();
    v.linkAllBtn && !v.linkAllBtn.dataset.bound && (v.linkAllBtn.dataset.bound = "true", v.linkAllBtn.addEventListener("click", () => {
      const w = f.linkGroupState.unlinkedDefinitions.size;
      if (w !== 0) {
        for (const I of f.linkGroupState.unlinkedDefinitions)
          f.linkGroupState = Gi(f.linkGroupState, I);
        window.toastManager && window.toastManager.success(`Re-linked ${w} field${w > 1 ? "s" : ""}`), st();
      }
    })), v.unlinkAllBtn && !v.unlinkAllBtn.dataset.bound && (v.unlinkAllBtn.dataset.bound = "true", v.unlinkAllBtn.addEventListener("click", () => {
      let w = 0;
      for (const I of f.linkGroupState.definitionToGroup.keys())
        f.linkGroupState.unlinkedDefinitions.has(I) || (f.linkGroupState = Vi(f.linkGroupState, I), w += 1);
      w > 0 && window.toastManager && window.toastManager.success(`Unlinked ${w} field${w > 1 ? "s" : ""}`), st();
    })), fe();
  }
  function ke() {
    return s().map((w) => {
      const I = String(w.definitionId || "").trim(), q = f.linkGroupState.definitionToGroup.get(I) || "", W = f.linkGroupState.unlinkedDefinitions.has(I);
      return { ...w, definitionId: I, linkGroupId: q, isUnlinked: W };
    });
  }
  function ze() {
    const v = $();
    if (!v.fieldsList) return;
    v.fieldsList.innerHTML = "";
    const w = ke();
    v.linkBatchActions && v.linkBatchActions.classList.toggle("hidden", f.linkGroupState.groups.size === 0), w.forEach((I, q) => {
      const W = I.definitionId, K = String(I.fieldType || "text").trim() || "text", oe = String(I.participantId || "").trim(), ue = String(I.participantName || "Unassigned").trim() || "Unassigned", He = Number.parseInt(String(I.page || "1"), 10) || 1, Me = I.linkGroupId, it = I.isUnlinked;
      if (!W) return;
      f.fieldInstances.forEach((Be) => {
        Be.definitionId === W && (Be.type = K, Be.participantId = oe, Be.participantName = ue);
      });
      const We = zt[K] || zt.text, yt = f.fieldInstances.some((Be) => Be.definitionId === W), Xe = document.createElement("div");
      Xe.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${yt ? "opacity-50" : ""}`, Xe.draggable = !yt, Xe.dataset.definitionId = W, Xe.dataset.fieldType = K, Xe.dataset.participantId = oe, Xe.dataset.participantName = ue, Xe.dataset.page = String(He), Me && (Xe.dataset.linkGroupId = Me);
      const R = document.createElement("span");
      R.className = `w-3 h-3 rounded ${We.bg}`;
      const U = document.createElement("div");
      U.className = "flex-1 text-xs";
      const z = document.createElement("div");
      z.className = "font-medium capitalize", z.textContent = K.replace(/_/g, " ");
      const te = document.createElement("div");
      te.className = "text-gray-500", te.textContent = ue;
      const ie = document.createElement("span");
      ie.className = `placement-status text-xs ${yt ? "text-green-600" : "text-amber-600"}`, ie.textContent = yt ? "Placed" : "Not placed", U.appendChild(z), U.appendChild(te), Xe.appendChild(R), Xe.appendChild(U), Xe.appendChild(ie), Xe.addEventListener("dragstart", (Be) => {
        if (yt) {
          Be.preventDefault();
          return;
        }
        Be.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: W,
          fieldType: K,
          participantId: oe,
          participantName: ue
        })), Be.dataTransfer && (Be.dataTransfer.effectAllowed = "copy"), Xe.classList.add("opacity-50");
      }), Xe.addEventListener("dragend", () => {
        Xe.classList.remove("opacity-50");
      }), v.fieldsList?.appendChild(Xe);
      const le = w[q + 1];
      Me && le && le.linkGroupId === Me && v.fieldsList?.appendChild(Pe(W, !it));
    }), De(), ge();
  }
  function st() {
    ze();
  }
  function Ve(v, w) {
    w ? (f.linkGroupState = Vi(f.linkGroupState, v), window.toastManager?.info?.("Field unlinked")) : (f.linkGroupState = Gi(f.linkGroupState, v), window.toastManager?.info?.("Field re-linked")), st();
  }
  async function Je(v) {
    const w = f.pdfDoc;
    if (!w) return;
    const I = $();
    if (!I.canvas || !I.canvasContainer) return;
    const q = I.canvas.getContext("2d"), W = await w.getPage(v), K = W.getViewport({ scale: f.scale });
    I.canvas.width = K.width, I.canvas.height = K.height, I.canvasContainer.style.width = `${K.width}px`, I.canvasContainer.style.height = `${K.height}px`, await W.render({
      canvasContext: q,
      viewport: K
    }).promise, I.currentPage && (I.currentPage.textContent = String(v)), Oe();
  }
  function ye(v) {
    const w = ua(f.linkGroupState, v);
    w && (f.linkGroupState = gr(f.linkGroupState, w.updatedGroup));
  }
  function ee(v) {
    const w = /* @__PURE__ */ new Map();
    s().forEach((q) => {
      const W = String(q.definitionId || "").trim();
      W && w.set(W, {
        type: String(q.fieldType || "text").trim() || "text",
        participantId: String(q.participantId || "").trim(),
        participantName: String(q.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(q.page || "1"), 10) || 1,
        linkGroupId: f.linkGroupState.definitionToGroup.get(W)
      });
    });
    let I = 0;
    for (; I < 10; ) {
      const q = pa(
        f.linkGroupState,
        v,
        f.fieldInstances,
        w
      );
      if (!q || !q.newPlacement) break;
      f.fieldInstances.push(q.newPlacement), ne(q.newPlacement.definitionId, !0), I += 1;
    }
    I > 0 && (Oe(), ge(), J(), de(I));
  }
  function Ge(v) {
    ye(v);
  }
  function Oe() {
    const w = $().overlays;
    w && (w.innerHTML = "", w.style.pointerEvents = "auto", f.fieldInstances.filter((I) => I.page === f.currentPage).forEach((I) => {
      const q = zt[I.type] || zt.text, W = f.selectedFieldId === I.id, K = I.placementSource === vt.AUTO_LINKED, oe = document.createElement("div"), ue = K ? "border-dashed" : "border-solid";
      oe.className = `field-overlay absolute cursor-move ${q.border} border-2 ${ue} rounded`, oe.style.cssText = `
          left: ${I.x * f.scale}px;
          top: ${I.y * f.scale}px;
          width: ${I.width * f.scale}px;
          height: ${I.height * f.scale}px;
          background-color: ${q.fill};
          ${W ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, oe.dataset.instanceId = I.id;
      const He = document.createElement("div");
      if (He.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${q.bg}`, He.textContent = `${I.type.replace("_", " ")} - ${I.participantName}`, oe.appendChild(He), K) {
        const We = document.createElement("div");
        We.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", We.title = "Auto-linked from template", We.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, oe.appendChild(We);
      }
      const Me = document.createElement("div");
      Me.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Me.style.cssText = "transform: translate(50%, 50%);", oe.appendChild(Me);
      const it = document.createElement("button");
      it.type = "button", it.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", it.innerHTML = "×", it.addEventListener("click", (We) => {
        We.stopPropagation(), dt(I.id);
      }), oe.appendChild(it), oe.addEventListener("mousedown", (We) => {
        We.target === Me ? pt(We, I) : We.target !== it && at(We, I, oe);
      }), oe.addEventListener("click", () => {
        f.selectedFieldId = I.id, Oe();
      }), w.appendChild(oe);
    }));
  }
  function Se(v, w, I, q = {}) {
    const W = vn[v.fieldType] || vn.text, K = q.placementSource || vt.MANUAL, oe = q.linkGroupId || mr(f.linkGroupState, v.definitionId)?.id, ue = {
      id: x("fi"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: f.currentPage,
      x: Math.max(0, w - W.width / 2),
      y: Math.max(0, I - W.height / 2),
      width: W.width,
      height: W.height,
      placementSource: K,
      linkGroupId: oe,
      linkedFromFieldId: q.linkedFromFieldId
    };
    f.fieldInstances.push(ue), ne(v.definitionId), K === vt.MANUAL && oe && Ge(ue), Oe(), ge(), J();
  }
  function Re(v, w) {
    const I = {
      id: x("instance"),
      definitionId: v.definitionId,
      type: v.fieldType,
      participantId: v.participantId,
      participantName: v.participantName,
      page: w.page_number,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      placementSource: vt.AUTO,
      resolverId: w.resolver_id,
      confidence: w.confidence,
      placementRunId: L.currentRunId
    };
    f.fieldInstances.push(I), ne(v.definitionId), Oe(), ge(), J();
  }
  function at(v, w, I) {
    v.preventDefault(), f.isDragging = !0, f.selectedFieldId = w.id;
    const q = v.clientX, W = v.clientY, K = w.x * f.scale, oe = w.y * f.scale;
    function ue(Me) {
      const it = Me.clientX - q, We = Me.clientY - W;
      w.x = Math.max(0, (K + it) / f.scale), w.y = Math.max(0, (oe + We) / f.scale), w.placementSource = vt.MANUAL, I.style.left = `${w.x * f.scale}px`, I.style.top = `${w.y * f.scale}px`;
    }
    function He() {
      f.isDragging = !1, document.removeEventListener("mousemove", ue), document.removeEventListener("mouseup", He), J();
    }
    document.addEventListener("mousemove", ue), document.addEventListener("mouseup", He);
  }
  function pt(v, w) {
    v.preventDefault(), v.stopPropagation(), f.isResizing = !0;
    const I = v.clientX, q = v.clientY, W = w.width, K = w.height;
    function oe(He) {
      const Me = (He.clientX - I) / f.scale, it = (He.clientY - q) / f.scale;
      w.width = Math.max(30, W + Me), w.height = Math.max(20, K + it), w.placementSource = vt.MANUAL, Oe();
    }
    function ue() {
      f.isResizing = !1, document.removeEventListener("mousemove", oe), document.removeEventListener("mouseup", ue), J();
    }
    document.addEventListener("mousemove", oe), document.addEventListener("mouseup", ue);
  }
  function dt(v) {
    const w = f.fieldInstances.find((I) => I.id === v);
    w && (f.fieldInstances = f.fieldInstances.filter((I) => I.id !== v), Te(w.definitionId), Oe(), ge(), J());
  }
  function tt(v, w) {
    const q = $().canvas;
    !v || !q || (v.addEventListener("dragover", (W) => {
      W.preventDefault(), W.dataTransfer && (W.dataTransfer.dropEffect = "copy"), q.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("dragleave", () => {
      q.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), v.addEventListener("drop", (W) => {
      W.preventDefault(), q.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const K = W.dataTransfer?.getData("application/json") || "";
      if (!K) return;
      const oe = JSON.parse(K), ue = q.getBoundingClientRect(), He = (W.clientX - ue.left) / f.scale, Me = (W.clientY - ue.top) / f.scale;
      Se(oe, He, Me);
    }));
  }
  function ut() {
    const v = $();
    v.prevBtn?.addEventListener("click", async () => {
      f.currentPage > 1 && (f.currentPage -= 1, ee(f.currentPage), await Je(f.currentPage));
    }), v.nextBtn?.addEventListener("click", async () => {
      f.currentPage < f.totalPages && (f.currentPage += 1, ee(f.currentPage), await Je(f.currentPage));
    });
  }
  function Le() {
    const v = $();
    v.zoomIn?.addEventListener("click", async () => {
      f.scale = Math.min(3, f.scale + 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await Je(f.currentPage);
    }), v.zoomOut?.addEventListener("click", async () => {
      f.scale = Math.max(0.5, f.scale - 0.25), v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await Je(f.currentPage);
    }), v.zoomFit?.addEventListener("click", async () => {
      if (!f.pdfDoc || !v.viewer) return;
      const I = (await f.pdfDoc.getPage(f.currentPage)).getViewport({ scale: 1 });
      f.scale = (v.viewer.clientWidth - 40) / I.width, v.zoomLevel && (v.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await Je(f.currentPage);
    });
  }
  function k() {
    return $().policyPreset?.value || "balanced";
  }
  function T(v) {
    return v >= 0.8 ? "bg-green-100 text-green-800" : v >= 0.6 ? "bg-blue-100 text-blue-800" : v >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function H(v) {
    return v >= 0.9 ? "bg-green-100 text-green-800" : v >= 0.7 ? "bg-blue-100 text-blue-800" : v >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function V(v) {
    return v ? v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Unknown";
  }
  function se(v) {
    v.page_number !== f.currentPage && (f.currentPage = v.page_number, Je(v.page_number));
    const w = $().overlays;
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
  async function he(v, w) {
  }
  function Ae() {
    const v = document.getElementById("placement-suggestions-modal");
    if (!v) return;
    const w = v.querySelectorAll('.suggestion-item[data-accepted="true"]');
    w.forEach((I) => {
      const q = Number.parseInt(I.dataset.index || "", 10), W = L.suggestions[q];
      if (!W) return;
      const K = h(W.field_definition_id);
      if (!K) return;
      const oe = _(W.field_definition_id);
      if (!oe || oe.classList.contains("opacity-50")) return;
      const ue = {
        definitionId: W.field_definition_id,
        fieldType: K.type,
        participantId: K.participant_id,
        participantName: oe.dataset.participantName || K.participant_name || "Unassigned"
      };
      f.currentPage = W.page_number, Re(ue, W);
    }), f.pdfDoc && Je(f.currentPage), he(w.length, L.suggestions.length - w.length), S(`Applied ${w.length} placement${w.length !== 1 ? "s" : ""}`, "success");
  }
  function Ie(v) {
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
        const I = Number.parseInt(w.dataset.index || "", 10), q = L.suggestions[I];
        q && se(q);
      });
    });
  }
  function me() {
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
    `, j(v, "#close-suggestions-modal")?.addEventListener("click", () => {
      v.classList.add("hidden");
    }), v.addEventListener("click", (w) => {
      w.target === v && v.classList.add("hidden");
    }), j(v, "#accept-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-green-500", "bg-green-50"), w.classList.remove("border-red-500", "bg-red-50"), w.dataset.accepted = "true";
      });
    }), j(v, "#reject-all-btn")?.addEventListener("click", () => {
      v.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-red-500", "bg-red-50"), w.classList.remove("border-green-500", "bg-green-50"), w.dataset.accepted = "false";
      });
    }), j(v, "#apply-suggestions-btn")?.addEventListener("click", () => {
      Ae(), v.classList.add("hidden");
    }), j(v, "#rerun-placement-btn")?.addEventListener("click", () => {
      v.classList.add("hidden");
      const w = F(v, "#placement-policy-preset-modal"), I = $().policyPreset;
      I && w && (I.value = w.value), $().autoPlaceBtn?.click();
    }), v;
  }
  function ae(v) {
    let w = document.getElementById("placement-suggestions-modal");
    w || (w = me(), document.body.appendChild(w));
    const I = F(w, "#suggestions-list"), q = F(w, "#resolver-info"), W = F(w, "#run-stats");
    !I || !q || !W || (q.innerHTML = L.resolverScores.map((K) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${A(String(K?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${K.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${T(Number(K.score || 0))}">
              ${(Number(K?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), W.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${A(String(v?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${v.status === "completed" ? "text-green-600" : "text-amber-600"}">${A(String(v?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(v?.elapsed_ms || 0))}ms</span>
      </div>
    `, I.innerHTML = L.suggestions.map((K, oe) => {
      const ue = h(K.field_definition_id), He = zt[ue?.type || "text"] || zt.text, Me = A(String(ue?.type || "field").replace(/_/g, " ")), it = A(String(K?.id || "")), We = Math.max(1, Number(K?.page_number || 1)), yt = Math.round(Number(K?.x || 0)), Xe = Math.round(Number(K?.y || 0)), R = Math.max(0, Number(K?.confidence || 0)), U = A(V(String(K?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${oe}" data-suggestion-id="${it}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${He.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Me}</div>
                <div class="text-xs text-gray-500">Page ${We}, (${yt}, ${Xe})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${H(Number(K.confidence || 0))}">
                ${(R * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${U}
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
  function O() {
    const v = N();
    let w = 100;
    v.forEach((I) => {
      const q = {
        definitionId: I.dataset.definitionId || "",
        fieldType: I.dataset.fieldType || "text",
        participantId: I.dataset.participantId || "",
        participantName: I.dataset.participantName || "Unassigned"
      }, W = vn[q.fieldType || "text"] || vn.text;
      f.currentPage = f.totalPages, Se(q, 300, w + W.height / 2, { placementSource: vt.AUTO_FALLBACK }), w += W.height + 20;
    }), f.pdfDoc && Je(f.totalPages), S("Fields placed using fallback layout", "info");
  }
  async function we() {
    const v = $();
    if (!v.autoPlaceBtn || L.isRunning) return;
    if (N().length === 0) {
      S("All fields are already placed", "info");
      return;
    }
    const I = document.querySelector('input[name="id"]')?.value;
    if (!I) {
      O();
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
      const q = await fetch(`${t}/esign/agreements/${I}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: k()
        })
      });
      if (!q.ok)
        throw await m(q, "Auto-placement failed");
      const W = await q.json(), K = ma(W) ? W.run || {} : W;
      L.currentRunId = K?.run_id || K?.id || null, L.suggestions = K?.suggestions || [], L.resolverScores = K?.resolver_scores || [], L.suggestions.length === 0 ? (S("No placement suggestions found. Try placing fields manually.", "warning"), O()) : ae(K);
    } catch (q) {
      console.error("Auto-place error:", q);
      const W = q && typeof q == "object" ? q : {}, K = b(W.message || "Auto-placement failed", W.code || "", W.status || 0);
      S(`Auto-placement failed: ${K}`, "error"), O();
    } finally {
      L.isRunning = !1, v.autoPlaceBtn.disabled = !1, v.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function ve() {
    const v = $();
    v.autoPlaceBtn && !f.autoPlaceBound && (v.autoPlaceBtn.addEventListener("click", () => {
      we();
    }), f.autoPlaceBound = !0);
  }
  async function be() {
    const v = $();
    if (!n?.value) {
      v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden");
      return;
    }
    v.loading?.classList.remove("hidden"), v.noDocument?.classList.add("hidden");
    const w = s(), I = new Set(
      w.map((ue) => String(ue.definitionId || "").trim()).filter((ue) => ue)
    );
    f.fieldInstances = f.fieldInstances.filter(
      (ue) => I.has(String(ue.definitionId || "").trim())
    ), ze();
    const q = ++f.loadRequestVersion, W = String(n.value || "").trim(), K = encodeURIComponent(W), oe = `${e}/panels/esign_documents/${K}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const He = await window.pdfjsLib.getDocument({
        url: oe,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (q !== f.loadRequestVersion)
        return;
      f.pdfDoc = He, f.totalPages = f.pdfDoc.numPages, f.currentPage = 1, v.totalPages && (v.totalPages.textContent = String(f.totalPages)), await Je(f.currentPage), v.loading?.classList.add("hidden"), f.uiHandlersBound || (tt(v.viewer, v.overlays), ut(), Le(), f.uiHandlersBound = !0), Oe();
    } catch (ue) {
      if (q !== f.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", ue), v.loading?.classList.add("hidden"), v.noDocument?.classList.remove("hidden"), v.noDocument) {
        const He = ue && typeof ue == "object" ? ue : {};
        v.noDocument.textContent = `Failed to load PDF: ${b(He.message || "Failed to load PDF")}`;
      }
    }
    ge(), J({ silent: !0 });
  }
  function Ee(v) {
    const w = Array.isArray(v?.fieldPlacements) ? v.fieldPlacements : [];
    f.fieldInstances = w.map((I, q) => tn(I, q)), J({ silent: !0 });
  }
  return J({ silent: !0 }), {
    bindEvents: ve,
    initPlacementEditor: be,
    getState: P,
    getLinkGroupState: Q,
    setLinkGroupState: re,
    buildPlacementFormEntries: Z,
    updateFieldInstancesFormData: J,
    restoreFieldPlacementsFromState: Ee
  };
}
function jt(i, e = !1) {
  return typeof i == "boolean" ? i : e;
}
function Yi(i) {
  const e = Array.isArray(i?.participants) ? i?.participants : [];
  return {
    enabled: !!i?.enabled,
    gate: String(i?.gate || "approve_before_send").trim() || "approve_before_send",
    commentsEnabled: !!i?.commentsEnabled,
    participants: e.map((t) => ({
      participantType: String(t?.participantType || "").trim() || "recipient",
      participantTempId: String(t?.participantTempId || "").trim() || void 0,
      recipientTempId: String(t?.recipientTempId || "").trim() || void 0,
      recipientId: String(t?.recipientId || "").trim() || void 0,
      email: String(t?.email || "").trim() || void 0,
      displayName: String(t?.displayName || "").trim() || void 0,
      canComment: jt(t?.canComment, !0),
      canApprove: jt(t?.canApprove, !0)
    }))
  };
}
function Xt(i) {
  return String(i ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function ha(i) {
  const {
    getSignerParticipants: e,
    setPrimaryActionLabel: t,
    onChanged: n
  } = i, r = document.getElementById("agreement-review-mode-send"), c = document.getElementById("agreement-review-mode-start"), d = document.getElementById("agreement-start-review-config"), s = document.getElementById("agreement-review-gate"), h = document.getElementById("agreement-review-comments-enabled"), m = document.getElementById("agreement-review-recipient-reviewers"), b = document.getElementById("agreement-review-external-reviewers"), S = document.getElementById("agreement-review-external-reviewers-empty"), A = document.getElementById("agreement-review-external-reviewer-template"), E = document.getElementById("agreement-add-external-reviewer-btn");
  function f() {
    return c instanceof HTMLInputElement ? c.checked : !1;
  }
  function L() {
    t(f() ? "Start Review" : "Send for Signature");
  }
  function x() {
    const re = !!b?.querySelector("[data-review-external-row]");
    S?.classList.toggle("hidden", re);
  }
  function _() {
    d?.classList.toggle("hidden", !f()), L();
  }
  function N(re) {
    if (!(A instanceof HTMLTemplateElement) || !b)
      return;
    const Z = A.content.cloneNode(!0), J = Z.querySelector("[data-review-external-row]");
    if (!J)
      return;
    const ge = J.querySelector("[data-review-external-name]"), ne = J.querySelector("[data-review-external-email]"), Te = J.querySelector("[data-review-external-comment]"), Ce = J.querySelector("[data-review-external-approve]");
    ge && (ge.value = String(re?.displayName || "").trim()), ne && (ne.value = String(re?.email || "").trim()), Te && (Te.checked = jt(re?.canComment, !0)), Ce && (Ce.checked = jt(re?.canApprove, !0)), b.appendChild(Z), x();
  }
  function j() {
    const re = [];
    m?.querySelectorAll("[data-review-recipient-row]").forEach((J) => {
      J.querySelector("[data-review-recipient-enabled]")?.checked && re.push({
        participantType: "recipient",
        participantTempId: String(J.dataset.participantTempId || "").trim() || void 0,
        recipientTempId: String(J.dataset.participantTempId || "").trim() || void 0,
        email: String(J.dataset.email || "").trim() || void 0,
        displayName: String(J.dataset.name || "").trim() || void 0,
        canComment: J.querySelector("[data-review-recipient-comment]")?.checked !== !1,
        canApprove: J.querySelector("[data-review-recipient-approve]")?.checked !== !1
      });
    });
    const Z = [];
    return b?.querySelectorAll("[data-review-external-row]").forEach((J) => {
      const ge = String(J.querySelector("[data-review-external-email]")?.value || "").trim();
      ge !== "" && Z.push({
        participantType: "external",
        email: ge,
        displayName: String(J.querySelector("[data-review-external-name]")?.value || "").trim() || void 0,
        canComment: J.querySelector("[data-review-external-comment]")?.checked !== !1,
        canApprove: J.querySelector("[data-review-external-approve]")?.checked !== !1
      });
    }), {
      enabled: f(),
      gate: String(s instanceof HTMLSelectElement ? s.value : "approve_before_send").trim() || "approve_before_send",
      commentsEnabled: h instanceof HTMLInputElement ? h.checked : !1,
      participants: [...re, ...Z]
    };
  }
  function F(re) {
    if (!m)
      return;
    const Z = Yi(re), J = /* @__PURE__ */ new Map();
    Z.participants.filter((ne) => String(ne.participantType || "").trim() === "recipient").forEach((ne) => {
      const Te = String(ne.participantTempId || ne.recipientTempId || ne.recipientId || "").trim();
      Te !== "" && J.set(Te, ne);
    });
    const ge = e();
    m.innerHTML = ge.map((ne) => {
      const Te = String(ne.id || "").trim(), Ce = J.get(Te), de = !!Ce, Pe = Ce ? jt(Ce.canComment, !0) : !0, fe = Ce ? jt(Ce.canApprove, !0) : !0;
      return `
        <div class="rounded-lg border border-gray-200 bg-white p-3" data-review-recipient-row data-participant-temp-id="${Xt(Te)}" data-email="${Xt(ne.email)}" data-name="${Xt(ne.name)}">
          <div class="flex items-start justify-between gap-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" data-review-recipient-enabled ${de ? "checked" : ""}>
              <span>
                <span class="block text-sm font-medium text-gray-900">${Xt(ne.name || ne.email || "Signer")}</span>
                <span class="block text-xs text-gray-500">${Xt(ne.email)}</span>
              </span>
            </label>
            <div class="flex flex-col gap-1.5 text-xs">
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to add comments">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-comment ${Pe ? "checked" : ""}>
                <span class="text-gray-600">Comment</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to approve or request changes">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-approve ${fe ? "checked" : ""}>
                <span class="text-gray-600">Approve</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
  function $() {
    F(j());
  }
  function P(re) {
    const Z = Yi(re?.review);
    r instanceof HTMLInputElement && (r.checked = !Z.enabled), c instanceof HTMLInputElement && (c.checked = Z.enabled), s instanceof HTMLSelectElement && (s.value = Z.gate), h instanceof HTMLInputElement && (h.checked = Z.commentsEnabled), F(Z), b && (b.innerHTML = "", Z.participants.filter((J) => String(J.participantType || "").trim() === "external").forEach((J) => N(J)), x()), _();
  }
  function Q() {
    [r, c].forEach((re) => {
      re?.addEventListener("change", () => {
        _(), n?.();
      });
    }), s?.addEventListener("change", () => n?.()), h?.addEventListener("change", () => n?.()), m?.addEventListener("change", () => n?.()), b?.addEventListener("input", () => n?.()), b?.addEventListener("change", () => n?.()), b?.addEventListener("click", (re) => {
      const Z = re.target;
      !(Z instanceof HTMLElement) || !Z.matches("[data-review-external-remove]") || (Z.closest("[data-review-external-row]")?.remove(), x(), n?.());
    }), E?.addEventListener("click", () => {
      N(), n?.();
    }), _(), x();
  }
  return {
    bindEvents: Q,
    collectReviewConfigForState: j,
    restoreFromState: P,
    refreshRecipientReviewers: $,
    isStartReviewEnabled: f
  };
}
function Nt(i, e, t = "") {
  return String(i.querySelector(e)?.value || t).trim();
}
function Ji(i, e, t = !1) {
  const n = i.querySelector(e);
  return n ? n.checked : t;
}
function va(i) {
  const {
    documentIdInput: e,
    documentPageCountInput: t,
    titleInput: n,
    messageInput: r,
    participantsContainer: c,
    fieldDefinitionsContainer: d,
    fieldPlacementsJSONInput: s,
    fieldRulesJSONInput: h,
    collectFieldRulesForForm: m,
    buildPlacementFormEntries: b,
    getCurrentStep: S,
    totalWizardSteps: A
  } = i;
  function E() {
    const f = [];
    c.querySelectorAll(".participant-entry").forEach((N) => {
      const j = String(N.getAttribute("data-participant-id") || "").trim(), F = Nt(N, 'input[name*=".name"]'), $ = Nt(N, 'input[name*=".email"]'), P = Nt(N, 'select[name*=".role"]', "signer"), Q = Ji(N, ".notify-input", !0), re = Nt(N, ".signing-stage-input"), Z = Number(re || "1") || 1;
      f.push({
        id: j,
        name: F,
        email: $,
        role: P,
        notify: Q,
        signing_stage: P === "signer" ? Z : 0
      });
    });
    const L = [];
    d.querySelectorAll(".field-definition-entry").forEach((N) => {
      const j = String(N.getAttribute("data-field-definition-id") || "").trim(), F = Nt(N, ".field-type-select", "signature"), $ = Nt(N, ".field-participant-select"), P = Number(Nt(N, 'input[name*=".page"]', "1")) || 1, Q = Ji(N, 'input[name*=".required"]');
      j && L.push({
        id: j,
        type: F,
        participant_id: $,
        page: P,
        required: Q
      });
    });
    const x = b(), _ = JSON.stringify(x);
    return s && (s.value = _), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(r?.value || "").trim(),
      participants: f,
      field_instances: L,
      field_placements: x,
      field_placements_json: _,
      field_rules: m(),
      field_rules_json: String(h?.value || "[]"),
      send_for_signature: S() === A ? 1 : 0,
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
function ya(i) {
  const {
    titleSource: e,
    stateManager: t,
    trackWizardStateChanges: n,
    participantsController: r,
    fieldDefinitionsController: c,
    placementController: d,
    reviewConfigController: s,
    updateFieldParticipantOptions: h,
    previewCard: m,
    wizardNavigationController: b,
    documentIdInput: S,
    documentPageCountInput: A,
    selectedDocumentTitle: E,
    agreementRefs: f,
    parsePositiveInt: L,
    isEditMode: x
  } = i;
  let _ = null, N = !1;
  function j(de) {
    N = !0;
    try {
      return de();
    } finally {
      N = !1;
    }
  }
  function F(de) {
    const Pe = de?.document, fe = document.getElementById("selected-document"), De = document.getElementById("document-picker"), ke = document.getElementById("selected-document-info");
    if (S.value = String(Pe?.id || "").trim(), A) {
      const ze = L(Pe?.pageCount, 0) || 0;
      A.value = ze > 0 ? String(ze) : "";
    }
    if (E && (E.textContent = String(Pe?.title || "").trim()), ke instanceof HTMLElement) {
      const ze = L(Pe?.pageCount, 0) || 0;
      ke.textContent = ze > 0 ? `${ze} pages` : "";
    }
    if (S.value) {
      fe?.classList.remove("hidden"), De?.classList.add("hidden");
      return;
    }
    fe?.classList.add("hidden"), De?.classList.remove("hidden");
  }
  function $(de) {
    f.form.titleInput.value = String(de?.details?.title || ""), f.form.messageInput.value = String(de?.details?.message || "");
  }
  function P() {
    N || (_ !== null && clearTimeout(_), _ = setTimeout(() => {
      n();
    }, 500));
  }
  function Q(de) {
    r.restoreFromState(de);
  }
  function re(de) {
    c.restoreFieldDefinitionsFromState(de);
  }
  function Z(de) {
    c.restoreFieldRulesFromState(de);
  }
  function J(de) {
    d.restoreFieldPlacementsFromState(de);
  }
  function ge(de) {
    s.restoreFromState(de);
  }
  function ne() {
    S && new MutationObserver(() => {
      N || n();
    }).observe(S, { attributes: !0, attributeFilter: ["value"] });
    const de = document.getElementById("title"), Pe = document.getElementById("message");
    de instanceof HTMLInputElement && de.addEventListener("input", () => {
      const fe = String(de.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(fe), P();
    }), (Pe instanceof HTMLInputElement || Pe instanceof HTMLTextAreaElement) && Pe.addEventListener("input", P), r.refs.participantsContainer?.addEventListener("input", P), r.refs.participantsContainer?.addEventListener("change", P), c.refs.fieldDefinitionsContainer?.addEventListener("input", P), c.refs.fieldDefinitionsContainer?.addEventListener("change", P), c.refs.fieldRulesContainer?.addEventListener("input", P), c.refs.fieldRulesContainer?.addEventListener("change", P);
  }
  function Te(de, Pe = {}) {
    j(() => {
      if (F(de), $(de), Q(de), re(de), Z(de), h(), J(de), ge(de), Pe.updatePreview !== !1) {
        const De = de?.document;
        De?.id ? m.setDocument(
          De.id,
          De.title || null,
          De.pageCount ?? null
        ) : m.clear();
      }
      const fe = L(
        Pe.step ?? de?.currentStep,
        b.getCurrentStep()
      ) || 1;
      b.setCurrentStep(fe), b.updateWizardUI();
    });
  }
  function Ce() {
    if (b.updateWizardUI(), S.value) {
      const de = E?.textContent || null, Pe = L(A?.value, 0) || null;
      m.setDocument(S.value, de, Pe);
    } else
      m.clear();
    x && f.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: ne,
    debouncedTrackChanges: P,
    applyStateToUI: Te,
    renderInitialWizardUI: Ce
  };
}
function ba(i) {
  return i.querySelector('select[name*=".role"]');
}
function wa(i) {
  return i.querySelector(".field-participant-select");
}
function Sa(i) {
  const {
    documentIdInput: e,
    titleInput: t,
    participantsContainer: n,
    fieldDefinitionsContainer: r,
    fieldRulesContainer: c,
    addFieldBtn: d,
    ensureSelectedDocumentCompatibility: s,
    collectFieldRulesForState: h,
    findSignersMissingRequiredSignatureField: m,
    missingSignatureFieldMessage: b,
    announceError: S
  } = i;
  function A(E) {
    switch (E) {
      case 1:
        return e.value ? !!s() : (S("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (S("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const f = n.querySelectorAll(".participant-entry");
        if (f.length === 0)
          return S("Please add at least one participant"), !1;
        let L = !1;
        return f.forEach((x) => {
          ba(x)?.value === "signer" && (L = !0);
        }), L ? !0 : (S("At least one signer is required"), !1);
      }
      case 4: {
        const f = r.querySelectorAll(".field-definition-entry");
        for (const N of Array.from(f)) {
          const j = wa(N);
          if (!j?.value)
            return S("Please assign all fields to a signer"), j?.focus(), !1;
        }
        if (h().find((N) => !N.participantId))
          return S("Please assign all automation rules to a signer"), c?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const _ = m();
        return _.length > 0 ? (S(b(_)), d.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: A
  };
}
function xa(i) {
  const {
    isEditMode: e,
    storageKey: t,
    stateManager: n,
    syncOrchestrator: r,
    syncService: c,
    applyResumedState: d,
    hasMeaningfulWizardProgress: s,
    formatRelativeTime: h,
    emitWizardTelemetry: m,
    getActiveTabDebugState: b
  } = i;
  function S(F, $) {
    return n.normalizeLoadedState({
      ...$,
      currentStep: F.currentStep,
      document: F.document,
      details: F.details,
      participants: F.participants,
      fieldDefinitions: F.fieldDefinitions,
      fieldPlacements: F.fieldPlacements,
      fieldRules: F.fieldRules,
      titleSource: F.titleSource,
      syncPending: !0,
      serverDraftId: $.serverDraftId,
      serverRevision: $.serverRevision,
      lastSyncedAt: $.lastSyncedAt
    });
  }
  async function A() {
    if (e) return n.getState();
    const F = n.normalizeLoadedState(n.getState());
    It("resume_reconcile_start", nt({
      state: F,
      storageKey: t,
      ownership: b?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const $ = String(F?.serverDraftId || "").trim();
    if (!$) {
      if (!s(F))
        try {
          const P = await c.bootstrap();
          return n.setState({
            ...P.snapshot?.data?.wizard_state && typeof P.snapshot.data.wizard_state == "object" ? P.snapshot.data.wizard_state : {},
            resourceRef: P.resourceRef,
            serverDraftId: String(P.snapshot?.ref?.id || "").trim() || null,
            serverRevision: Number(P.snapshot?.revision || 0),
            lastSyncedAt: String(P.snapshot?.updatedAt || "").trim() || null,
            syncPending: !1
          }, { syncPending: !1, notify: !1 }), n.getState();
        } catch {
          At("resume_reconcile_bootstrap_failed", nt({
            state: F,
            storageKey: t,
            ownership: b?.() || void 0,
            sendAttemptId: null,
            extra: {
              source: "bootstrap_failed_keep_local"
            }
          }));
        }
      return n.setState(F, { syncPending: !!F.syncPending, notify: !1 }), It("resume_reconcile_complete", nt({
        state: F,
        storageKey: t,
        ownership: b?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), n.getState();
    }
    try {
      const P = await c.load($), Q = n.normalizeLoadedState({
        ...P?.wizard_state && typeof P.wizard_state == "object" ? P.wizard_state : {},
        resourceRef: P?.resource_ref || F.resourceRef || null,
        serverDraftId: String(P?.id || $).trim() || $,
        serverRevision: Number(P?.revision || 0),
        lastSyncedAt: String(P?.updated_at || P?.updatedAt || "").trim() || F.lastSyncedAt,
        syncPending: !1
      }), re = String(F.serverDraftId || "").trim() === String(Q.serverDraftId || "").trim(), Z = re && F.syncPending === !0 ? S(F, Q) : Q;
      return n.setState(Z, { syncPending: !!Z.syncPending, notify: !1 }), It("resume_reconcile_complete", nt({
        state: Z,
        storageKey: t,
        ownership: b?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: re && F.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(P?.id || $).trim() || null,
          loadedRevision: Number(P?.revision || 0)
        }
      })), n.getState();
    } catch (P) {
      const Q = typeof P == "object" && P !== null && "status" in P ? Number(P.status || 0) : 0;
      if (Q === 404) {
        const re = n.normalizeLoadedState({
          ...F,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return n.setState(re, { syncPending: !!re.syncPending, notify: !1 }), At("resume_reconcile_remote_missing", nt({
          state: re,
          storageKey: t,
          ownership: b?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: $,
            status: Q
          }
        })), n.getState();
      }
      return At("resume_reconcile_failed", nt({
        state: F,
        storageKey: t,
        ownership: b?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: $,
          status: Q
        }
      })), n.getState();
    }
  }
  function E(F) {
    return document.getElementById(F);
  }
  function f() {
    const F = document.getElementById("resume-dialog-modal"), $ = n.getState(), P = String($?.document?.title || "").trim() || String($?.document?.id || "").trim() || "Unknown document", Q = E("resume-draft-title"), re = E("resume-draft-document"), Z = E("resume-draft-step"), J = E("resume-draft-time");
    Q && (Q.textContent = $.details?.title || "Untitled Agreement"), re && (re.textContent = P), Z && (Z.textContent = String($.currentStep || 1)), J && (J.textContent = h($.updatedAt)), F?.classList.remove("hidden"), m("wizard_resume_prompt_shown", {
      step: Number($.currentStep || 1),
      has_server_draft: !!$.serverDraftId
    });
  }
  async function L(F = {}) {
    const $ = F.deleteServerDraft === !0, P = String(n.getState()?.serverDraftId || "").trim();
    if (n.clear(), r.broadcastStateUpdate(), P && r.broadcastDraftDisposed?.(P, $ ? "resume_clear_delete" : "resume_clear_local"), !(!$ || !P))
      try {
        await c.dispose(P);
      } catch (Q) {
        console.warn("Failed to delete server draft:", Q);
      }
  }
  function x() {
    return n.normalizeLoadedState({
      ...n.getState(),
      ...n.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  async function _(F) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const $ = x();
    switch (F) {
      case "continue":
        !String(n.getState()?.serverDraftId || "").trim() && s($) && await c.create($), d(n.getState());
        return;
      case "start_new":
        await L({ deleteServerDraft: !1 }), s($) ? await c.create($) : await A(), d(n.getState());
        return;
      case "proceed":
        await L({ deleteServerDraft: !0 }), s($) ? await c.create($) : await A(), d(n.getState());
        return;
      case "discard":
        await L({ deleteServerDraft: !0 }), await A(), d(n.getState());
        return;
      default:
        return;
    }
  }
  function N() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      _("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      _("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      _("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      _("discard");
    });
  }
  async function j() {
    e || (await A(), n.hasResumableState() && f());
  }
  return {
    bindEvents: N,
    reconcileBootstrapState: A,
    maybeShowResumeDialog: j
  };
}
function Ia(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let r = "saved";
  function c(E) {
    if (!E) return "unknown";
    const f = new Date(E), x = (/* @__PURE__ */ new Date()).getTime() - f.getTime(), _ = Math.floor(x / 6e4), N = Math.floor(x / 36e5), j = Math.floor(x / 864e5);
    return _ < 1 ? "just now" : _ < 60 ? `${_} minute${_ !== 1 ? "s" : ""} ago` : N < 24 ? `${N} hour${N !== 1 ? "s" : ""} ago` : j < 7 ? `${j} day${j !== 1 ? "s" : ""} ago` : f.toLocaleDateString();
  }
  function d() {
    const E = n.getState();
    r === "paused" && s(E?.syncPending ? "pending" : "saved");
  }
  function s(E) {
    r = String(E || "").trim() || "saved";
    const f = e.sync.indicator, L = e.sync.icon, x = e.sync.text, _ = e.sync.retryBtn;
    if (!(!f || !L || !x))
      switch (f.classList.remove("hidden"), E) {
        case "saved":
          L.className = "w-2 h-2 rounded-full bg-green-500", x.textContent = "Saved", x.className = "text-gray-600", _?.classList.add("hidden");
          break;
        case "saving":
          L.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", x.textContent = "Saving...", x.className = "text-gray-600", _?.classList.add("hidden");
          break;
        case "pending":
          L.className = "w-2 h-2 rounded-full bg-gray-400", x.textContent = "Unsaved changes", x.className = "text-gray-500", _?.classList.add("hidden");
          break;
        case "error":
          L.className = "w-2 h-2 rounded-full bg-amber-500", x.textContent = "Not synced", x.className = "text-amber-600", _?.classList.remove("hidden");
          break;
        case "paused":
          L.className = "w-2 h-2 rounded-full bg-slate-400", x.textContent = "Open in another tab", x.className = "text-slate-600", _?.classList.add("hidden");
          break;
        case "conflict":
          L.className = "w-2 h-2 rounded-full bg-red-500", x.textContent = "Conflict", x.className = "text-red-600", _?.classList.add("hidden");
          break;
        default:
          f.classList.add("hidden");
      }
  }
  function h(E) {
    const f = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = c(f.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(E || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function m(E, f = "", L = 0) {
    const x = String(f || "").trim().toUpperCase(), _ = String(E || "").trim().toLowerCase();
    return x === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : x === "DRAFT_SEND_NOT_FOUND" || x === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : x === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : x === "SCOPE_DENIED" || _.includes("scope denied") ? "You don't have access to this organization's resources." : x === "TRANSPORT_SECURITY" || x === "TRANSPORT_SECURITY_REQUIRED" || _.includes("tls transport required") || Number(L) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : x === "PDF_UNSUPPORTED" || _ === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(E || "").trim() !== "" ? String(E).trim() : "Something went wrong. Please try again.";
  }
  async function b(E, f = "") {
    const L = Number(E?.status || 0);
    let x = "", _ = "", N = {};
    try {
      const j = await E.json();
      x = String(j?.error?.code || j?.code || "").trim(), _ = String(j?.error?.message || j?.message || "").trim(), N = j?.error?.details && typeof j.error.details == "object" ? j.error.details : {}, String(N?.entity || "").trim().toLowerCase() === "drafts" && String(x).trim().toUpperCase() === "NOT_FOUND" && (x = "DRAFT_SEND_NOT_FOUND", _ === "" && (_ = "Draft not found"));
    } catch {
      _ = "";
    }
    return _ === "" && (_ = f || `Request failed (${L || "unknown"})`), {
      status: L,
      code: x,
      details: N,
      message: m(_, x, L)
    };
  }
  function S(E, f = "", L = 0) {
    const x = m(E, f, L);
    t && (t.textContent = x), window.toastManager?.error ? window.toastManager.error(x) : alert(x);
  }
  async function A(E, f = {}) {
    const L = await E;
    return L?.blocked && L.reason === "passive_tab" ? (S(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), L) : (L?.error && String(f.errorMessage || "").trim() !== "" && S(f.errorMessage || ""), L);
  }
  return {
    announceError: S,
    formatRelativeTime: c,
    mapUserFacingError: m,
    parseAPIError: b,
    restoreSyncStatusFromState: d,
    showSyncConflictDialog: h,
    surfaceSyncOutcome: A,
    updateSyncStatus: s
  };
}
function Ea(i) {
  const {
    createSuccess: e,
    enableServerSync: t = !0,
    stateManager: n,
    syncOrchestrator: r,
    syncService: c,
    applyStateToUI: d,
    surfaceSyncOutcome: s
  } = i;
  function h() {
    const S = n.collectFormState();
    if (!t) {
      n.setState({
        ...n.getState(),
        ...S,
        syncPending: !1
      }, { syncPending: !1 });
      return;
    }
    n.updateState(S), r.scheduleSync(), r.broadcastStateUpdate();
  }
  function m() {
    if (!e)
      return;
    const A = n.getState()?.serverDraftId;
    n.clear(), r.broadcastStateUpdate(), A && (r.broadcastDraftDisposed?.(A, "agreement_created"), c.dispose(A).catch((E) => {
      console.warn("Failed to dispose sync draft after successful create:", E);
    }));
  }
  function b() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await s(r.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      r.refreshCurrentDraft && (await r.refreshCurrentDraft({ preserveDirty: !1, force: !0 }), d(n.getState())), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const S = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      n.setState({
        ...n.getState(),
        serverRevision: S,
        syncPending: !0
      }, { syncPending: !0 });
      const A = await s(r.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (A?.success || A?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  return {
    bindRetryAndConflictHandlers: b,
    handleCreateSuccessCleanup: m,
    trackWizardStateChanges: h
  };
}
const kt = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function fr(i, e = kt.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === kt.USER ? kt.USER : t === kt.SERVER_SEED ? kt.SERVER_SEED : t === kt.AUTOFILL ? kt.AUTOFILL : e;
}
function Ca(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), r = String(t.email ?? "").trim(), c = String(t.role ?? "signer").trim().toLowerCase(), d = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), s = t.notify !== !1;
  return n !== "" || r !== "" || c !== "" && c !== "signer" || Number.isFinite(d) && d > 1 || !s ? !0 : e > 0;
}
function Ki(i, e = {}) {
  const {
    normalizeTitleSource: t = fr,
    titleSource: n = kt
  } = e;
  if (!i || typeof i != "object") return !1;
  const r = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(r) && r > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const d = String(i.details?.title ?? "").trim(), s = String(i.details?.message ?? "").trim(), h = t(
    i.titleSource,
    d === "" ? n.AUTOFILL : n.USER
  );
  return !!(d !== "" && h !== n.SERVER_SEED || s !== "" || (Array.isArray(i.participants) ? i.participants : []).some((S, A) => Ca(S, A)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0 || i.review?.enabled);
}
function La(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, r = n.replace(/\/+$/, ""), c = /\/v\d+$/i.test(r) ? r : `${r}/v1`, d = !!e.is_edit, s = !!e.create_success, h = String(e.submit_mode || "json").trim().toLowerCase(), m = String(e.agreement_id || "").trim(), b = String(e.active_agreement_id || "").trim(), S = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, A = Array.isArray(e.initial_participants) ? e.initial_participants : [], E = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], f = e.sync && typeof e.sync == "object" ? e.sync : {}, L = Array.isArray(f.action_operations) ? f.action_operations.map((j) => String(j || "").trim()).filter(Boolean) : [], x = `${c}/esign`, _ = {
    base_url: String(f.base_url || "").trim() || x,
    bootstrap_path: String(f.bootstrap_path || "").trim() || `${x}/sync/bootstrap/agreement-draft`,
    client_base_path: String(f.client_base_path || "").trim() || `${t}/sync-client/sync-core`,
    resource_kind: String(f.resource_kind || "").trim() || "agreement_draft",
    storage_scope: String(f.storage_scope || "").trim(),
    action_operations: L.length > 0 ? L : ["send", "start_review", "dispose"]
  }, N = {
    sync: _,
    base_path: t,
    api_base_path: n,
    is_edit: d,
    create_success: s,
    submit_mode: h,
    agreement_id: m,
    active_agreement_id: b,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: S
    },
    initial_participants: A,
    initial_field_instances: E
  };
  return {
    config: e,
    normalizedConfig: N,
    syncConfig: _,
    basePath: t,
    apiBase: n,
    apiVersionBase: c,
    isEditMode: d,
    createSuccess: s,
    submitMode: h,
    agreementID: m,
    activeAgreementID: b,
    documentsUploadURL: S,
    initialParticipants: A,
    initialFieldInstances: E
  };
}
function _a(i = !0) {
  const e = { Accept: "application/json" };
  return i && (e["Content-Type"] = "application/json"), e;
}
function Aa(i = {}) {
  const {
    config: e = {},
    isEditMode: t = !1
  } = i, n = t ? "edit" : "create", r = String(e.agreement_id || "").trim().toLowerCase(), c = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), s = [
    String(e.sync?.storage_scope || "").trim() || "anonymous",
    n,
    t && r !== "" ? r : c || "agreement-form"
  ].join("|");
  return {
    WIZARD_STATE_VERSION: 2,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v2:${encodeURIComponent(s)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(s)}`,
    SYNC_DEBOUNCE_MS: 2e3,
    SYNC_RETRY_DELAYS: [1e3, 2e3, 5e3, 1e4, 3e4],
    TITLE_SOURCE: kt
  };
}
function ti(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Xi(i, e = "info") {
  const t = document.createElement("div");
  t.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${e === "success" ? "bg-green-600 text-white" : e === "error" ? "bg-red-600 text-white" : e === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, t.textContent = i, document.body.appendChild(t), setTimeout(() => {
    t.style.opacity = "0", setTimeout(() => t.remove(), 300);
  }, 3e3);
}
function Ot(i, e) {
  if (!i)
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function Ta(i, e) {
  if (!(i instanceof HTMLButtonElement))
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function Pa(i = {}) {
  const {
    config: e,
    normalizedConfig: t,
    syncConfig: n,
    basePath: r,
    apiBase: c,
    apiVersionBase: d,
    isEditMode: s,
    createSuccess: h,
    submitMode: m,
    documentsUploadURL: b,
    initialParticipants: S,
    initialFieldInstances: A
  } = La(i), E = Fs(document), {
    WIZARD_STATE_VERSION: f,
    WIZARD_STORAGE_KEY: L,
    WIZARD_CHANNEL_NAME: x,
    SYNC_DEBOUNCE_MS: _,
    SYNC_RETRY_DELAYS: N,
    TITLE_SOURCE: j
  } = Aa({
    config: e,
    isEditMode: s
  }), F = Gs(), $ = (G, xe = j.AUTOFILL) => fr(G, xe), P = (G) => Ki(G, {
    normalizeTitleSource: $,
    titleSource: j
  }), Q = Ms({
    apiBasePath: d,
    basePath: r
  }), re = E.form.root, Z = Ta(E.form.submitBtn, "submit button"), J = E.form.announcements;
  let ge = null, ne = null, Te = null, Ce = null, de = null, Pe = null, fe = null, De = null, ke = null, ze = _n();
  const st = (G, xe = {}) => {
    Ce?.applyStateToUI(G, xe);
  }, Ve = () => Ce?.debouncedTrackChanges?.(), Je = () => De?.trackWizardStateChanges?.(), ye = (G) => fe?.formatRelativeTime(G) || "unknown", ee = () => fe?.restoreSyncStatusFromState(), Ge = (G) => fe?.updateSyncStatus(G), Oe = (G) => fe?.showSyncConflictDialog(G), Se = (G, xe = "", Ne = 0) => fe?.mapUserFacingError(G, xe, Ne) || String(G || "").trim(), Re = (G, xe) => fe ? fe.parseAPIError(G, xe) : Promise.resolve({ status: Number(G.status || 0), code: "", details: {}, message: xe }), at = (G, xe = "", Ne = 0) => fe?.announceError(G, xe, Ne), pt = (G, xe = {}) => fe ? fe.surfaceSyncOutcome(G, xe) : Promise.resolve({}), dt = () => null, tt = Ns(E, {
    formatRelativeTime: ye
  }), ut = () => tt.render({ coordinationAvailable: !0 }), Le = async (G, xe) => {
    const Ne = await Re(G, xe), bt = new Error(Ne.message);
    return bt.code = Ne.code, bt.status = Ne.status, bt;
  }, k = {
    hasResumableState: () => T.hasResumableState(),
    setTitleSource: (G, xe) => T.setTitleSource(G, xe),
    updateDocument: (G) => T.updateDocument(G),
    updateDetails: (G, xe) => T.updateDetails(G, xe),
    getState: () => {
      const G = T.getState();
      return {
        titleSource: G.titleSource,
        details: G.details && typeof G.details == "object" ? G.details : {}
      };
    }
  }, T = new Hs({
    storageKey: L,
    stateVersion: f,
    totalWizardSteps: mn,
    titleSource: j,
    normalizeTitleSource: $,
    parsePositiveInt: rt,
    hasMeaningfulWizardProgress: P,
    collectFormState: () => {
      const G = E.form.documentIdInput?.value || null, xe = document.getElementById("selected-document-title")?.textContent?.trim() || null, Ne = $(
        T.getState()?.titleSource,
        String(E.form.titleInput?.value || "").trim() === "" ? j.AUTOFILL : j.USER
      );
      return {
        document: {
          id: G,
          title: xe,
          pageCount: parseInt(E.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: E.form.titleInput?.value || "",
          message: E.form.messageInput?.value || ""
        },
        titleSource: Ne,
        participants: ge?.collectParticipantsForState?.() || [],
        fieldDefinitions: ne?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: Te?.getState?.()?.fieldInstances || [],
        fieldRules: ne?.collectFieldRulesForState?.() || [],
        review: ke?.collectReviewConfigForState?.() || {
          enabled: !1,
          gate: "approve_before_send",
          commentsEnabled: !1,
          participants: []
        }
      };
    },
    emitTelemetry: F
  });
  T.start(), fe = Ia({
    agreementRefs: E,
    formAnnouncements: J,
    stateManager: T
  });
  const H = new Os({
    stateManager: T,
    requestHeaders: _a,
    syncConfig: n
  });
  let V;
  const se = new js({
    channelName: x,
    onCoordinationAvailabilityChange: (G) => {
      ee(), tt.render({ coordinationAvailable: G });
    },
    onRemoteSync: (G) => {
      String(T.getState()?.serverDraftId || "").trim() === String(G || "").trim() && (T.getState()?.syncPending || V?.refreshCurrentDraft({ preserveDirty: !0, force: !0 }).then(() => {
        st(T.getState(), {
          step: Number(T.getState()?.currentStep || 1)
        });
      }));
    },
    onRemoteDraftDisposed: (G) => {
      String(T.getState()?.serverDraftId || "").trim() === String(G || "").trim() && (T.getState()?.syncPending || T.setState({
        ...T.getState(),
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
      V?.forceSync();
    },
    onPageHide: () => {
      V?.forceSync();
    },
    onBeforeUnload: () => {
      V?.forceSync();
    }
  });
  V = new Vs({
    stateManager: T,
    syncService: H,
    activeTabController: se,
    storageKey: L,
    statusUpdater: Ge,
    showConflictDialog: Oe,
    syncDebounceMs: _,
    syncRetryDelays: N,
    documentRef: document,
    windowRef: window
  });
  const Ae = Bs({
    context: {
      config: t,
      refs: E,
      basePath: r,
      apiBase: c,
      apiVersionBase: d,
      previewCard: Q,
      emitTelemetry: F,
      stateManager: T,
      syncService: H,
      activeTabController: se,
      syncController: V
    },
    hooks: {
      renderInitialUI() {
        Ce?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        Pe?.maybeShowResumeDialog?.(), Ie.loadDocuments(), Ie.loadRecentDocuments();
      },
      destroy() {
        tt.destroy(), T.destroy();
      }
    }
  }), Ie = oa({
    apiBase: c,
    apiVersionBase: d,
    documentsUploadURL: b,
    isEditMode: s,
    titleSource: j,
    normalizeTitleSource: $,
    stateManager: k,
    previewCard: Q,
    parseAPIError: Le,
    announceError: at,
    showToast: Xi,
    mapUserFacingError: Se,
    renderFieldRulePreview: () => ne?.renderFieldRulePreview?.()
  });
  Ie.initializeTitleSourceSeed(), Ie.bindEvents();
  const me = Ot(Ie.refs.documentIdInput, "document id input"), ae = Ot(Ie.refs.documentSearch, "document search input"), O = Ie.refs.selectedDocumentTitle, we = Ie.refs.documentPageCountInput, ve = Ie.ensureSelectedDocumentCompatibility, be = Ie.getCurrentDocumentPageCount;
  ge = ca({
    initialParticipants: S,
    onParticipantsChanged: () => ne?.updateFieldParticipantOptions?.()
  }), ge.initialize(), ge.bindEvents();
  const Ee = Ot(ge.refs.participantsContainer, "participants container"), v = Ot(ge.refs.addParticipantBtn, "add participant button"), w = () => ge?.getSignerParticipants() || [];
  ne = ga({
    initialFieldInstances: A,
    placementSource: vt,
    getCurrentDocumentPageCount: be,
    getSignerParticipants: w,
    escapeHtml: ti,
    onDefinitionsChanged: () => Ve(),
    onRulesChanged: () => Ve(),
    onParticipantsChanged: () => ne?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => Te?.getLinkGroupState?.() || ze,
    setPlacementLinkGroupState: (G) => {
      ze = G || _n(), Te?.setLinkGroupState?.(ze);
    }
  }), ne.bindEvents(), ne.initialize();
  const I = Ot(ne.refs.fieldDefinitionsContainer, "field definitions container"), q = ne.refs.fieldRulesContainer, W = Ot(ne.refs.addFieldBtn, "add field button"), K = ne.refs.fieldPlacementsJSONInput, oe = ne.refs.fieldRulesJSONInput, ue = () => ne?.collectFieldRulesForState() || [], He = () => ne?.collectFieldRulesForState() || [], Me = () => ne?.collectFieldRulesForForm() || [], it = (G, xe) => ne?.expandRulesForPreview(G, xe) || [], We = () => ne?.updateFieldParticipantOptions(), yt = () => ne.collectPlacementFieldDefinitions(), Xe = (G) => ne?.getFieldDefinitionById(G) || null, R = () => ne?.findSignersMissingRequiredSignatureField() || [], U = (G) => ne?.missingSignatureFieldMessage(G) || "", z = Ys({
    documentIdInput: me,
    selectedDocumentTitle: O,
    participantsContainer: Ee,
    fieldDefinitionsContainer: I,
    submitBtn: Z,
    escapeHtml: ti,
    getSignerParticipants: w,
    getCurrentDocumentPageCount: be,
    collectFieldRulesForState: He,
    expandRulesForPreview: it,
    findSignersMissingRequiredSignatureField: R,
    goToStep: (G) => ie.goToStep(G)
  }), te = (G) => {
    Z.getAttribute("aria-busy") !== "true" && (Z.innerHTML = `
      <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      ${G}
    `);
  };
  ke = ha({
    getSignerParticipants: w,
    setPrimaryActionLabel: te,
    onChanged: () => Je()
  }), ke.bindEvents(), Te = fa({
    apiBase: c,
    apiVersionBase: d,
    documentIdInput: me,
    fieldPlacementsJSONInput: K,
    initialFieldInstances: ne.buildInitialPlacementInstances(),
    initialLinkGroupState: ze,
    collectPlacementFieldDefinitions: yt,
    getFieldDefinitionById: Xe,
    parseAPIError: Le,
    mapUserFacingError: Se,
    showToast: Xi,
    escapeHtml: ti,
    onPlacementsChanged: () => Je()
  }), Te.bindEvents(), ze = Te.getLinkGroupState();
  const ie = Js({
    totalWizardSteps: mn,
    wizardStep: lt,
    nextStepLabels: Es,
    submitBtn: Z,
    previewCard: Q,
    updateCoordinationUI: ut,
    validateStep: (G) => de?.validateStep(G) !== !1,
    onPlacementStep() {
      Te.initPlacementEditor();
    },
    onReviewStep() {
      ke?.refreshRecipientReviewers(), z.initSendReadinessCheck();
    },
    onStepChanged(G) {
      T.updateStep(G), Je(), V.forceSync();
    }
  });
  ie.bindEvents(), De = Ea({
    createSuccess: h,
    enableServerSync: !s && m === "json",
    stateManager: T,
    syncOrchestrator: V,
    syncService: H,
    applyStateToUI: (G) => st(G, {
      step: Number(G?.currentStep || 1)
    }),
    surfaceSyncOutcome: pt,
    reviewStep: lt.REVIEW
  }), De.handleCreateSuccessCleanup(), De.bindRetryAndConflictHandlers();
  const le = va({
    documentIdInput: me,
    documentPageCountInput: we,
    titleInput: E.form.titleInput,
    messageInput: E.form.messageInput,
    participantsContainer: Ee,
    fieldDefinitionsContainer: I,
    fieldPlacementsJSONInput: K,
    fieldRulesJSONInput: oe,
    collectFieldRulesForForm: () => Me(),
    buildPlacementFormEntries: () => Te?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => ie.getCurrentStep(),
    totalWizardSteps: mn
  }), Be = () => le.buildCanonicalAgreementPayload();
  return Ce = ya({
    titleSource: j,
    stateManager: T,
    trackWizardStateChanges: Je,
    participantsController: ge,
    fieldDefinitionsController: ne,
    placementController: Te,
    reviewConfigController: ke,
    updateFieldParticipantOptions: We,
    previewCard: Q,
    wizardNavigationController: ie,
    documentIdInput: me,
    documentPageCountInput: we,
    selectedDocumentTitle: O,
    agreementRefs: E,
    parsePositiveInt: rt,
    isEditMode: s
  }), Ce.bindChangeTracking(), de = Sa({
    documentIdInput: me,
    titleInput: E.form.titleInput,
    participantsContainer: Ee,
    fieldDefinitionsContainer: I,
    fieldRulesContainer: q,
    addFieldBtn: W,
    ensureSelectedDocumentCompatibility: ve,
    collectFieldRulesForState: ue,
    findSignersMissingRequiredSignatureField: R,
    missingSignatureFieldMessage: U,
    announceError: at
  }), Pe = xa({
    isEditMode: s,
    storageKey: L,
    stateManager: T,
    syncOrchestrator: V,
    syncService: H,
    applyResumedState: (G) => st(G, {
      step: Number(G?.currentStep || 1)
    }),
    hasMeaningfulWizardProgress: Ki,
    formatRelativeTime: ye,
    emitWizardTelemetry: (G, xe) => F(G, xe),
    getActiveTabDebugState: dt
  }), Pe.bindEvents(), Zs({
    config: e,
    form: re,
    submitBtn: Z,
    documentIdInput: me,
    documentSearch: ae,
    participantsContainer: Ee,
    addParticipantBtn: v,
    fieldDefinitionsContainer: I,
    fieldRulesContainer: q,
    documentPageCountInput: we,
    fieldPlacementsJSONInput: K,
    fieldRulesJSONInput: oe,
    storageKey: L,
    syncService: H,
    syncOrchestrator: V,
    stateManager: T,
    submitMode: m,
    totalWizardSteps: mn,
    wizardStep: lt,
    getCurrentStep: () => ie.getCurrentStep(),
    getPlacementState: () => Te.getState(),
    getCurrentDocumentPageCount: be,
    ensureSelectedDocumentCompatibility: ve,
    collectFieldRulesForState: ue,
    collectFieldRulesForForm: Me,
    expandRulesForPreview: it,
    findSignersMissingRequiredSignatureField: R,
    missingSignatureFieldMessage: U,
    getSignerParticipants: w,
    getReviewConfigForState: () => ke?.collectReviewConfigForState?.() || {
      enabled: !1,
      gate: "approve_before_send",
      commentsEnabled: !1,
      participants: []
    },
    isStartReviewEnabled: () => ke?.isStartReviewEnabled?.() === !0,
    setPrimaryActionLabel: te,
    buildCanonicalAgreementPayload: Be,
    announceError: at,
    emitWizardTelemetry: F,
    parseAPIError: Re,
    goToStep: (G) => ie.goToStep(G),
    showSyncConflictDialog: Oe,
    surfaceSyncOutcome: pt,
    updateSyncStatus: Ge,
    getActiveTabDebugState: dt,
    addFieldBtn: W
  }).bindEvents(), Ae;
}
let An = null;
function ka() {
  An?.destroy(), An = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function Da(i = {}) {
  if (An)
    return;
  const e = Pa(i);
  e.start(), An = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function Ra(i = document) {
  i.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((t) => {
    const n = t.getAttribute("aria-controls");
    if (!n) return;
    const r = document.getElementById(n);
    r && t.addEventListener("click", () => {
      const c = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!c)), r.classList.toggle("expanded", !c);
    });
  });
}
function Ma(i) {
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
    agreement_id: String(i.agreement_id || "").trim(),
    active_agreement_id: String(i.active_agreement_id || "").trim(),
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
class hr {
  constructor(e) {
    this.initialized = !1, this.config = Ma(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Ra(), Da(this.config));
  }
  destroy() {
    ka(), this.initialized = !1;
  }
}
function Qo(i) {
  const e = new hr(i);
  return Fe(() => e.init()), e;
}
function $a(i) {
  const e = new hr({
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
    agreement_id: i.agreement_id,
    active_agreement_id: i.active_agreement_id,
    initial_participants: i.initial_participants || [],
    initial_field_instances: i.initial_field_instances || [],
    routes: i.routes
  });
  Fe(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && Fe(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      $a({
        sync: t.sync && typeof t.sync == "object" ? t.sync : void 0,
        base_path: t.base_path || t.basePath,
        api_base_path: t.api_base_path || t.apiBasePath,
        is_edit: t.is_edit || t.isEditMode || !1,
        create_success: t.create_success || t.createSuccess || !1,
        submit_mode: t.submit_mode || "json",
        agreement_id: t.agreement_id || "",
        active_agreement_id: t.active_agreement_id || "",
        initial_participants: Array.isArray(t.initial_participants) ? t.initial_participants : [],
        initial_field_instances: Array.isArray(t.initial_field_instances) ? t.initial_field_instances : [],
        routes: t.routes || { index: "" }
      });
    } catch (t) {
      console.warn("Failed to parse agreement form page config:", t);
    }
});
const Ba = "esign.signer.profile.v1", Qi = "esign.signer.profile.outbox.v1", di = 90, Zi = 500 * 1024;
class Fa {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : di;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Ba}:${e}`;
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
    const n = Date.now(), c = {
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
      window.localStorage.setItem(this.storageKey(e), JSON.stringify(c));
    } catch {
    }
    return c;
  }
  async clear(e) {
    try {
      window.localStorage.removeItem(this.storageKey(e));
    } catch {
    }
  }
}
class Na {
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
class ni {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Qi);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [r, c] of Object.entries(t)) {
        if (!c || typeof c != "object")
          continue;
        const d = c;
        if (d.op === "clear") {
          n[r] = {
            op: "clear",
            updatedAt: Number(d.updatedAt) || Date.now()
          };
          continue;
        }
        const s = d.op === "patch" ? d.patch : d;
        n[r] = {
          op: "patch",
          patch: s && typeof s == "object" ? s : {},
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
      window.localStorage.setItem(Qi, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), r = n[e], c = r?.op === "patch" ? r.patch || {} : {};
    n[e] = {
      op: "patch",
      patch: { ...c, ...t, updatedAt: Date.now() },
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
      ]), c = this.pickLatest(n, r);
      return c && await this.localStore.save(e, c), await this.flushOutboxForKey(e), c;
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
function Ha(i) {
  const e = i.profile?.mode || "local_only";
  return {
    token: String(i.token || "").trim(),
    apiBasePath: String(i.apiBasePath || "/api/v1/esign/signing").trim(),
    signerBasePath: String(i.signerBasePath || "/esign/sign").trim(),
    agreementId: String(i.agreementId || "").trim(),
    sessionKind: String(i.sessionKind || "signer").trim() || "signer",
    recipientId: String(i.recipientId || "").trim(),
    recipientEmail: String(i.recipientEmail || "").trim(),
    recipientName: String(i.recipientName || "").trim(),
    documentUrl: String(i.documentUrl || "").trim(),
    pageCount: Number(i.pageCount || 1) || 1,
    hasConsented: !!i.hasConsented,
    canSign: i.canSign !== !1,
    fields: Array.isArray(i.fields) ? i.fields : [],
    review: ui(i.review),
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
      ttlDays: Number(i.profile?.ttlDays || di) || di,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Ua(i) {
  return !i || typeof i != "object" ? null : {
    id: String(i.id || "").trim(),
    participant_type: String(i.participant_type || "").trim(),
    recipient_id: String(i.recipient_id || "").trim(),
    email: String(i.email || "").trim(),
    display_name: String(i.display_name || "").trim(),
    decision_status: String(i.decision_status || "").trim()
  };
}
function za(i) {
  if (!i || typeof i != "object") return null;
  const e = i.thread && typeof i.thread == "object" ? i.thread : {}, t = Array.isArray(i.messages) ? i.messages : [];
  return {
    thread: {
      id: String(e.id || "").trim(),
      review_id: String(e.review_id || "").trim(),
      agreement_id: String(e.agreement_id || "").trim(),
      visibility: String(e.visibility || "shared").trim() || "shared",
      anchor_type: String(e.anchor_type || "agreement").trim() || "agreement",
      page_number: Number(e.page_number || 0) || 0,
      field_id: String(e.field_id || "").trim(),
      anchor_x: Number(e.anchor_x || 0) || 0,
      anchor_y: Number(e.anchor_y || 0) || 0,
      status: String(e.status || "open").trim() || "open",
      created_by_type: String(e.created_by_type || "").trim(),
      created_by_id: String(e.created_by_id || "").trim(),
      resolved_by_type: String(e.resolved_by_type || "").trim(),
      resolved_by_id: String(e.resolved_by_id || "").trim(),
      resolved_at: String(e.resolved_at || "").trim(),
      last_activity_at: String(e.last_activity_at || "").trim()
    },
    messages: t.filter((n) => n && typeof n == "object").map((n) => ({
      id: String(n.id || "").trim(),
      thread_id: String(n.thread_id || "").trim(),
      body: String(n.body || "").trim(),
      created_by_type: String(n.created_by_type || "").trim(),
      created_by_id: String(n.created_by_id || "").trim(),
      created_at: String(n.created_at || "").trim()
    }))
  };
}
function ui(i) {
  if (!i || typeof i != "object") return null;
  const e = Array.isArray(i.threads) ? i.threads.map(za).filter(Boolean) : [], t = Array.isArray(i.blockers) ? i.blockers.map((n) => String(n || "").trim()).filter(Boolean) : [];
  return {
    review_id: String(i.review_id || "").trim(),
    status: String(i.status || "").trim(),
    gate: String(i.gate || "").trim(),
    comments_enabled: !!i.comments_enabled,
    is_reviewer: !!i.is_reviewer,
    can_comment: !!i.can_comment,
    can_approve: !!i.can_approve,
    can_request_changes: !!i.can_request_changes,
    can_sign: i.can_sign !== !1,
    participant_status: String(i.participant_status || "").trim(),
    sign_blocked: !!i.sign_blocked,
    sign_block_reason: String(i.sign_block_reason || "").trim(),
    blockers: t,
    participant: Ua(i.participant),
    open_thread_count: Number(i.open_thread_count || 0) || 0,
    resolved_thread_count: Number(i.resolved_thread_count || 0) || 0,
    threads: e
  };
}
function ii(i) {
  switch (String(i?.thread?.anchor_type || "").trim()) {
    case "field":
      return i?.thread?.field_id ? `Field ${i.thread.field_id}` : "Field";
    case "page":
      return i?.thread?.page_number ? `Page ${i.thread.page_number}` : "Page";
    default:
      return "Agreement";
  }
}
function Qt(i) {
  const e = String(i || "").trim().toLowerCase();
  switch (e) {
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes Requested";
    case "in_review":
      return "In Review";
    case "closed":
      return "Closed";
    default:
      return e ? e.replace(/_/g, " ") : "Inactive";
  }
}
function Oa(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function ri(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function ja(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function xt(i) {
  const e = String(i || "").trim();
  return ja(e) ? "" : e;
}
function qa(i) {
  const e = new Fa(i.profile.ttlDays), t = new Na(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new ni("local_only", e, null) : i.profile.mode === "remote_only" ? new ni("remote_only", e, t) : new ni("hybrid", e, t);
}
function Va() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Ga(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Ha(i), r = Oa(n), c = qa(n);
  Va();
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
    track(a, o = {}) {
      if (!n.telemetryEnabled) return;
      const l = {
        event: a,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...o
      };
      this.events.push(l), this.isCriticalEvent(a) && this.flush();
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
    trackViewerLoad(a, o, l = null) {
      this.metrics.viewerLoadTime = o, this.track(a ? "viewer_load_success" : "viewer_load_failed", {
        duration: o,
        error: l,
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
    trackFieldSave(a, o, l, u, p = null) {
      this.metrics.fieldSaveLatencies.push(u), l ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: a, error: p }), this.track(l ? "field_save_success" : "field_save_failed", {
        fieldId: a,
        fieldType: o,
        latency: u,
        error: p
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
    trackSignatureAttach(a, o, l, u, p = null) {
      this.metrics.signatureAttachLatencies.push(u), this.track(l ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: a,
        signatureType: o,
        latency: u,
        error: p
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
    trackSubmit(a, o = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(a ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: s.fieldState.size,
        error: o
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
    trackDegradedMode(a, o = {}) {
      this.track("degraded_mode", {
        degradationType: a,
        ...o
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
      return a.length ? Math.round(a.reduce((o, l) => o + l, 0) / a.length) : 0;
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
          const o = JSON.stringify({
            events: a,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, o);
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
      } catch (o) {
        this.events = [...a, ...this.events], console.warn("Telemetry flush failed:", o);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    d.track("session_end", d.getSessionSummary()), d.flush();
  }), setInterval(() => d.flush(), 3e4);
  const s = {
    currentPage: 1,
    zoomLevel: 1,
    pdfDoc: null,
    pageRendering: !1,
    pageNumPending: null,
    fieldState: /* @__PURE__ */ new Map(),
    activeFieldId: null,
    hasConsented: n.hasConsented,
    canSignSession: n.canSign,
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
    reviewContext: n.review ? ui(n.review) : null,
    reviewThreadFilter: "all",
    reviewThreadPage: 1,
    guidedTargetFieldId: null,
    writeCooldownUntil: 0,
    writeCooldownTimer: null,
    submitCooldownUntil: 0,
    submitCooldownTimer: null,
    isSubmitting: !1,
    overlayRenderFrameID: 0,
    reviewAnchorPointDraft: null,
    pickingReviewAnchorPoint: !1,
    highlightedReviewThreadID: "",
    highlightedReviewThreadTimer: null
  };
  function h() {
    s.overlayRenderFrameID || (s.overlayRenderFrameID = window.requestAnimationFrame(() => {
      s.overlayRenderFrameID = 0, Gt();
    }));
  }
  function m(a) {
    const o = s.fieldState.get(a);
    o && (delete o.previewValueText, delete o.previewValueBool, delete o.previewSignatureUrl);
  }
  function b() {
    s.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function S(a, o) {
    const l = s.fieldState.get(a);
    if (!l) return;
    const u = xt(String(o || ""));
    if (!u) {
      delete l.previewValueText;
      return;
    }
    l.previewValueText = u, delete l.previewValueBool, delete l.previewSignatureUrl;
  }
  function A(a, o) {
    const l = s.fieldState.get(a);
    l && (l.previewValueBool = !!o, delete l.previewValueText, delete l.previewSignatureUrl);
  }
  function E(a, o) {
    const l = s.fieldState.get(a);
    if (!l) return;
    const u = String(o || "").trim();
    if (!u) {
      delete l.previewSignatureUrl;
      return;
    }
    l.previewSignatureUrl = u, delete l.previewValueText, delete l.previewValueBool;
  }
  function f() {
    return !!(s.reviewContext && typeof s.reviewContext == "object");
  }
  function L() {
    return String(n.sessionKind || "").trim().toLowerCase() === "reviewer";
  }
  function x() {
    return `${n.apiBasePath}/session/${encodeURIComponent(n.token)}`;
  }
  function _() {
    return `${x()}/review`;
  }
  function N(a, o) {
    return (Array.isArray(a) ? a : []).filter((l) => String(l?.thread?.status || "").trim() === o).length;
  }
  function j(a) {
    const o = String(a?.created_by_type || "").trim();
    return o === "user" || o === "sender" ? "Sender" : o === "reviewer" ? "Reviewer" : o === "recipient" || o === "signer" ? "Signer" : o ? o.replace(/_/g, " ") : "Participant";
  }
  function F(a) {
    return a ? String(a.display_name || a.email || a.recipient_id || a.id || "").trim() : "";
  }
  function $(a) {
    const o = String(a || "").trim();
    if (!o) return "";
    const l = new Date(o);
    return Number.isNaN(l.getTime()) ? o : l.toLocaleString();
  }
  function P(a) {
    s.reviewContext = ui(a), s.reviewContext && (Array.isArray(s.reviewContext.threads) || (s.reviewContext.threads = []), s.reviewContext.open_thread_count = N(s.reviewContext.threads, "open"), s.reviewContext.resolved_thread_count = N(s.reviewContext.threads, "resolved")), fe(), Se(), Dt();
  }
  async function Q() {
    const a = await fetch(x(), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!a.ok)
      throw await Pt(a, "Failed to reload review session");
    const o = await a.json(), l = o?.session && typeof o.session == "object" ? o.session : {};
    return s.canSignSession = l.can_sign !== !1, P(l.review || null), l;
  }
  async function re(a, o = {}, l = "Review request failed") {
    const u = await fetch(`${_()}${a}`, {
      credentials: "same-origin",
      ...o,
      headers: {
        Accept: "application/json",
        ...o?.body ? { "Content-Type": "application/json" } : {},
        ...o?.headers || {}
      }
    });
    if (!u.ok)
      throw await Pt(u, l);
    return u.json().catch(() => ({}));
  }
  function Z() {
    const a = document.getElementById("review-thread-anchor");
    return String(a?.value || "agreement").trim() || "agreement";
  }
  function J() {
    s.highlightedReviewThreadID = "", s.highlightedReviewThreadTimer && (window.clearTimeout(s.highlightedReviewThreadTimer), s.highlightedReviewThreadTimer = null);
  }
  function ge(a) {
    J(), s.highlightedReviewThreadID = String(a || "").trim(), s.highlightedReviewThreadID && (s.highlightedReviewThreadTimer = window.setTimeout(() => {
      J(), Ge(), h();
    }, 2400), Ge(), h());
  }
  function ne(a) {
    if (!a || typeof a != "object") {
      s.reviewAnchorPointDraft = null, Ce(), h();
      return;
    }
    s.reviewAnchorPointDraft = {
      page_number: Number(a.page_number || s.currentPage || 1) || 1,
      anchor_x: Math.round((Number(a.anchor_x || 0) || 0) * 100) / 100,
      anchor_y: Math.round((Number(a.anchor_y || 0) || 0) * 100) / 100
    }, Ce(), h();
  }
  function Te(a) {
    s.pickingReviewAnchorPoint = !!a && Z() === "page", document.getElementById("pdf-container")?.classList.toggle("review-anchor-picking", s.pickingReviewAnchorPoint), s.pickingReviewAnchorPoint ? $e("Click on the document page to pin this comment.") : $e("Comment pin placement cancelled."), Ce();
  }
  function Ce() {
    const a = document.getElementById("review-anchor-point-controls"), o = document.getElementById("review-anchor-point-status"), l = document.querySelector('[data-esign-action="pick-review-anchor-point"]'), u = document.querySelector('[data-esign-action="clear-review-anchor-point"]'), p = Z() === "page";
    if (a?.classList.toggle("hidden", !p), l instanceof HTMLButtonElement && (l.disabled = !f() || !(s.reviewContext?.comments_enabled && s.reviewContext?.can_comment), l.textContent = s.pickingReviewAnchorPoint ? "Picking..." : s.reviewAnchorPointDraft ? "Repin location" : "Pick location"), u instanceof HTMLButtonElement && (u.disabled = !s.reviewAnchorPointDraft), !!o) {
      if (!p) {
        o.textContent = "Attach this thread to a specific point on the current page.";
        return;
      }
      if (s.reviewAnchorPointDraft && Number(s.reviewAnchorPointDraft.page_number || 0) === Number(s.currentPage || 0)) {
        o.textContent = `Pinned on page ${s.reviewAnchorPointDraft.page_number} at x ${s.reviewAnchorPointDraft.anchor_x}, y ${s.reviewAnchorPointDraft.anchor_y}.`;
        return;
      }
      if (s.reviewAnchorPointDraft) {
        o.textContent = `Pinned on page ${s.reviewAnchorPointDraft.page_number}. Switch back to that page to adjust it.`;
        return;
      }
      o.textContent = s.pickingReviewAnchorPoint ? "Click on the document page to pin this comment." : "Attach this thread to a specific point on the current page.";
    }
  }
  function de() {
    const a = document.getElementById("review-progress-indicator");
    if (!a) return;
    if (!f()) {
      a.classList.add("hidden");
      return;
    }
    const o = s.reviewContext, l = String(o.status || "").trim().toLowerCase();
    a.classList.remove("hidden");
    const u = document.getElementById("review-step-draft"), p = document.getElementById("review-step-sent"), y = document.getElementById("review-step-review"), C = document.getElementById("review-step-decision"), D = a.querySelectorAll(".review-progress-line");
    if ([u, p, y, C].forEach((M) => {
      M?.classList.remove("completed", "active", "changes-requested");
    }), D.forEach((M) => {
      M.classList.remove("completed", "active");
    }), l === "approved") {
      u?.classList.add("completed"), p?.classList.add("completed"), y?.classList.add("completed"), C?.classList.add("completed"), D.forEach((ce) => ce.classList.add("completed"));
      const M = C?.querySelector("i");
      M && (M.className = "iconoir-check-circle text-xs");
    } else if (l === "changes_requested") {
      u?.classList.add("completed"), p?.classList.add("completed"), y?.classList.add("completed"), C?.classList.add("changes-requested"), D.forEach((ce) => ce.classList.add("completed"));
      const M = C?.querySelector("i");
      M && (M.className = "iconoir-warning-circle text-xs");
    } else if (l === "in_review" || l === "pending") {
      u?.classList.add("completed"), p?.classList.add("completed"), y?.classList.add("active"), D[0] && D[0].classList.add("completed"), D[1] && D[1].classList.add("completed"), D[2] && D[2].classList.add("active");
      const M = C?.querySelector("i");
      M && (M.className = "iconoir-check-circle text-xs");
    } else {
      u?.classList.add("active");
      const M = C?.querySelector("i");
      M && (M.className = "iconoir-check-circle text-xs");
    }
  }
  function Pe() {
    const a = Z();
    if (a === "field" && s.activeFieldId) {
      const o = s.fieldState.get(s.activeFieldId);
      return {
        anchor_type: "field",
        field_id: String(s.activeFieldId || "").trim(),
        page_number: Number(o?.page || s.currentPage || 1) || 1
      };
    }
    if (a === "page") {
      const o = s.reviewAnchorPointDraft ? Number(s.reviewAnchorPointDraft.page_number || s.currentPage || 1) || 1 : Number(s.currentPage || 1) || 1, l = {
        anchor_type: "page",
        page_number: o
      };
      return s.reviewAnchorPointDraft && Number(s.reviewAnchorPointDraft.page_number || 0) === o && (l.anchor_x = Number(s.reviewAnchorPointDraft.anchor_x || 0) || 0, l.anchor_y = Number(s.reviewAnchorPointDraft.anchor_y || 0) || 0), l;
    }
    return { anchor_type: "agreement" };
  }
  function fe() {
    const a = document.getElementById("review-panel"), o = document.getElementById("review-banner"), l = document.getElementById("review-status-chip"), u = document.getElementById("review-panel-subtitle"), p = document.getElementById("review-participant-summary"), y = document.getElementById("review-decision-actions"), C = document.getElementById("review-thread-summary"), D = document.getElementById("review-thread-composer"), M = document.getElementById("review-thread-list"), ce = document.getElementById("review-thread-composer-hint");
    if (!a || !M) return;
    if (!f()) {
      a.classList.add("hidden"), o?.classList.add("hidden"), Ce(), de();
      return;
    }
    const X = s.reviewContext, _e = Qt(X.status);
    if (a.classList.remove("hidden"), de(), l && (l.textContent = _e, l.className = "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide " + (X.status === "approved" ? "bg-emerald-100 text-emerald-700" : X.status === "changes_requested" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")), u && (u.textContent = X.gate ? `Gate: ${String(X.gate || "").replace(/_/g, " ")}` : "Track review status, comments, and decision actions."), p) {
      const ct = F(X.participant);
      ct || X.participant_status ? (p.classList.remove("hidden"), p.textContent = ct ? `${ct} • decision ${Qt(X.participant_status || "pending")}` : `Decision ${Qt(X.participant_status || "pending")}`) : p.classList.add("hidden");
    }
    if (y && y.classList.toggle("hidden", !(X.can_approve || X.can_request_changes)), C && (C.classList.remove("hidden"), C.textContent = `${X.open_thread_count || 0} open • ${X.resolved_thread_count || 0} resolved`), D) {
      const ct = X.comments_enabled && X.can_comment;
      D.classList.toggle("hidden", !ct), ce && (ce.textContent = s.activeFieldId ? "New threads can target the agreement, current page, or active field." : "New threads can target the agreement or current page. Activate a field to anchor to it.");
    }
    if (o) {
      const ct = [];
      X.sign_blocked && X.sign_block_reason && ct.push(X.sign_block_reason), (Array.isArray(X.blockers) ? X.blockers : []).forEach((Qe) => {
        const Ut = String(Qe || "").trim();
        Ut && !ct.includes(Ut) && ct.push(Ut);
      }), ct.length ? (o.classList.remove("hidden"), o.className = "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4", o.innerHTML = `
          <div class="flex items-start gap-3">
            <i class="iconoir-warning-circle mt-0.5 text-amber-600" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">Review Status</p>
              <p class="mt-1 text-xs text-amber-800">${Ye(ct.join(" "))}</p>
            </div>
          </div>
        `) : o.classList.add("hidden");
    }
    ke(), Ce();
    const ot = Array.isArray(X.threads) ? X.threads : [];
    if (!ot.length) {
      M.innerHTML = '<div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No review comments yet.</div>';
      return;
    }
    const je = s.reviewThreadFilter || "all", pe = ot.filter((ct) => {
      const Qe = String(ct?.thread?.status || "").trim();
      return je === "open" ? Qe === "open" : je === "resolved" ? Qe === "resolved" : !0;
    }), Ue = 5, St = Math.ceil(pe.length / Ue), gt = Math.min(s.reviewThreadPage || 1, St || 1), dn = (gt - 1) * Ue, On = pe.slice(dn, dn + Ue), un = ot.length > 0 ? `
      <div class="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
        <button type="button" data-esign-action="filter-review-threads" data-filter="all" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${je === "all" ? "bg-slate-100 text-slate-800" : "text-gray-500 hover:text-gray-700"}">
          All (${ot.length})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="open" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${je === "open" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}">
          Open (${X.open_thread_count || 0})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="resolved" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${je === "resolved" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700"}">
          Resolved (${X.resolved_thread_count || 0})
        </button>
      </div>
    ` : "", jn = St > 1 ? `
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">Page ${gt} of ${St}</span>
        <div class="flex gap-2">
          <button type="button" data-esign-action="page-review-threads" data-page="${gt - 1}" class="px-2 py-1 text-xs font-medium rounded border ${gt <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${gt <= 1 ? "disabled" : ""}>
            <i class="iconoir-nav-arrow-left"></i> Prev
          </button>
          <button type="button" data-esign-action="page-review-threads" data-page="${gt + 1}" class="px-2 py-1 text-xs font-medium rounded border ${gt >= St ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${gt >= St ? "disabled" : ""}>
            Next <i class="iconoir-nav-arrow-right"></i>
          </button>
        </div>
      </div>
    ` : "";
    if (pe.length === 0) {
      M.innerHTML = `
        ${un}
        <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No ${je === "all" ? "" : je} comments${je !== "all" ? ". Try a different filter." : "."}
        </div>
      `;
      return;
    }
    const qn = On.map((ct) => {
      const Qe = ct.thread || {}, Ut = Array.isArray(ct.messages) ? ct.messages : [], pn = X.comments_enabled && X.can_comment, Zr = pn && String(Qe.status || "").trim() === "open", es = pn && String(Qe.status || "").trim() === "resolved", ts = ii(ct), ki = $(Qe.last_activity_at || ""), Di = `review-reply-${Ye(String(Qe.id || ""))}`, Vn = `review-reply-composer-${Ye(String(Qe.id || ""))}`, ns = String(Qe.status || "").trim() === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200", Gn = String(Ut[0]?.created_by_type || "").trim(), is = Gn === "user" || Gn === "sender" ? "border-l-blue-400" : Gn === "reviewer" ? "border-l-purple-400" : "border-l-slate-300", rs = String(Qe.id || "").trim() === String(s.highlightedReviewThreadID || "").trim();
      return `
        <article class="rounded-xl border ${ns} border-l-4 ${is} p-4 ${rs ? "ring-2 ring-blue-200 shadow-sm" : ""}" data-review-thread-id="${Ye(String(Qe.id || ""))}" tabindex="-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" data-esign-action="go-review-thread-anchor" data-thread-id="${Ye(String(Qe.id || ""))}" class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">${Ye(ts)}</button>
                <span class="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${String(Qe.status || "").trim() === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}">${Ye(Qt(Qe.status || "open"))}</span>
              </div>
              ${ki ? `<p class="mt-2 text-xs text-gray-500">Last activity ${Ye(ki)}</p>` : ""}
            </div>
          </div>
          <div class="mt-3 space-y-3">
            ${Ut.map((gn) => {
        const Wn = String(gn.created_by_type || "").trim();
        return `
              <div class="rounded-lg ${Wn === "user" || Wn === "sender" ? "bg-blue-50 border-l-2 border-l-blue-300" : Wn === "reviewer" ? "bg-purple-50 border-l-2 border-l-purple-300" : "bg-slate-50"} px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-semibold text-slate-700">${Ye(j(gn))}</p>
                  <p class="text-[11px] text-slate-500">${Ye($(gn.created_at || ""))}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${Ye(String(gn.body || ""))}</p>
              </div>
            `;
      }).join("")}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            ${Zr ? `<button type="button" data-esign-action="resolve-review-thread" data-thread-id="${Ye(String(Qe.id || ""))}" class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Resolve</button>` : ""}
            ${es ? `<button type="button" data-esign-action="reopen-review-thread" data-thread-id="${Ye(String(Qe.id || ""))}" class="text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2">Reopen</button>` : ""}
            ${pn ? `<button type="button" data-esign-action="toggle-reply-composer" data-thread-id="${Ye(String(Qe.id || ""))}" data-composer-id="${Vn}" class="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <i class="iconoir-chat-bubble text-[10px]"></i> Reply
            </button>` : ""}
          </div>
          ${pn ? `
            <div id="${Vn}" class="review-reply-composer mt-3 space-y-2 hidden" data-thread-id="${Ye(String(Qe.id || ""))}">
              <textarea id="${Di}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400" rows="2" placeholder="Write your reply..."></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" data-esign-action="cancel-reply" data-composer-id="${Vn}" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" data-esign-action="reply-review-thread" data-thread-id="${Ye(String(Qe.id || ""))}" data-reply-input-id="${Di}" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Send Reply</button>
              </div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");
    M.innerHTML = un + qn + jn;
  }
  function De(a) {
    const o = Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : [];
    return a === "open" ? o.filter((l) => String(l?.thread?.status || "").trim() === "open") : a === "resolved" ? o.filter((l) => String(l?.thread?.status || "").trim() === "resolved") : o;
  }
  function ke() {
    const a = document.getElementById("review-anchor-page-label"), o = document.getElementById("review-anchor-field-chip"), l = document.getElementById("review-anchor-field-label"), u = document.getElementById("review-thread-anchor");
    if (a && (a.textContent = `Page ${s.currentPage || 1}`), o && l)
      if (s.activeFieldId) {
        const y = s.fieldState.get(s.activeFieldId)?.type || "field", C = y.charAt(0).toUpperCase() + y.slice(1).replace(/_/g, " ");
        l.textContent = C, o.disabled = !1, o.classList.remove("hidden", "text-gray-400", "cursor-not-allowed"), o.classList.add("text-gray-600");
      } else
        l.textContent = "Select a field", o.disabled = !0, o.classList.add("hidden", "text-gray-400", "cursor-not-allowed"), o.classList.remove("text-gray-600"), u && u.value === "field" && ze("agreement");
    Ce();
  }
  function ze(a) {
    const o = document.getElementById("review-thread-anchor"), l = document.querySelectorAll(".review-anchor-chip");
    o && (o.value = a), l.forEach((u) => {
      u.getAttribute("data-anchor-type") === a ? (u.classList.add("active", "border-blue-300", "bg-blue-50", "text-blue-700"), u.classList.remove("border-gray-200", "bg-white", "text-gray-600")) : (u.classList.remove("active", "border-blue-300", "bg-blue-50", "text-blue-700"), u.classList.add("border-gray-200", "bg-white", "text-gray-600"));
    }), a !== "page" && (s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking")), Ce();
  }
  function st() {
    const a = document.getElementById("review-anchor-chips");
    a && a.addEventListener("click", (o) => {
      const l = o.target.closest(".review-anchor-chip");
      if (!l || l.hasAttribute("disabled")) return;
      const u = l.getAttribute("data-anchor-type");
      u && ze(u);
    });
  }
  function Ve() {
    const a = document.getElementById("pdf-page-1");
    a && a.addEventListener("click", (o) => {
      if (!s.pickingReviewAnchorPoint || Z() !== "page" || !(o.target instanceof Element)) return;
      const l = a.querySelector("canvas"), u = l instanceof HTMLElement ? l : a, p = H.screenToPagePoint(
        Number(s.currentPage || 1) || 1,
        u,
        o.clientX,
        o.clientY
      );
      p && (ne(p), s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), $e(`Comment pinned on page ${p.page_number}.`));
    });
  }
  function Je(a) {
    const o = ["all", "open", "resolved"], l = String(a).trim().toLowerCase();
    s.reviewThreadFilter = o.includes(l) ? l : "all", s.reviewThreadPage = 1, fe(), $e(`Showing ${s.reviewThreadFilter === "all" ? "all" : s.reviewThreadFilter} comments.`);
  }
  function ye(a) {
    const o = Math.max(1, parseInt(String(a), 10) || 1);
    s.reviewThreadPage = o, fe(), document.getElementById("review-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function ee(a, o) {
    const l = document.getElementById(String(a || "").trim());
    if (l)
      if (o) {
        document.querySelectorAll(".review-reply-composer").forEach((p) => {
          p.id !== a && p.classList.add("hidden");
        }), l.classList.remove("hidden");
        const u = l.querySelector("textarea");
        u && u.focus();
      } else {
        l.classList.add("hidden");
        const u = l.querySelector("textarea");
        u && (u.value = "");
      }
  }
  function Ge() {
    document.querySelectorAll("[data-review-thread-id]").forEach((a) => {
      if (!(a instanceof HTMLElement)) return;
      const o = String(a.getAttribute("data-review-thread-id") || "").trim() === String(s.highlightedReviewThreadID || "").trim();
      a.classList.toggle("ring-2", o), a.classList.toggle("ring-blue-200", o), a.classList.toggle("shadow-sm", o);
    });
  }
  function Oe(a) {
    const o = String(a || "").trim();
    if (!o) return;
    const u = (Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : []).find((M) => String(M?.thread?.id || "").trim() === o);
    if (!u) return;
    const p = String(u?.thread?.status || "open").trim() || "open", y = s.reviewThreadFilter || "all";
    y !== "all" && y !== p && (s.reviewThreadFilter = p === "resolved" ? "resolved" : "open");
    const D = De(s.reviewThreadFilter || "all").findIndex((M) => String(M?.thread?.id || "").trim() === o);
    if (D >= 0)
      s.reviewThreadPage = Math.floor(D / 5) + 1;
    else {
      s.reviewThreadFilter = "all";
      const ce = De("all").findIndex((X) => String(X?.thread?.id || "").trim() === o);
      s.reviewThreadPage = ce >= 0 ? Math.floor(ce / 5) + 1 : 1;
    }
    ge(o), fe(), requestAnimationFrame(() => {
      const M = document.querySelector(`[data-review-thread-id="${CSS.escape(o)}"]`);
      M instanceof HTMLElement && (M.scrollIntoView({ behavior: "smooth", block: "nearest" }), M.focus({ preventScroll: !0 }));
    });
  }
  function Se() {
    const a = document.querySelector(".side-panel"), o = document.getElementById("panel-title"), l = document.getElementById("fields-status"), u = document.getElementById("fields-list"), p = document.getElementById("consent-notice"), y = document.getElementById("submit-btn"), C = document.getElementById("decline-btn"), D = document.querySelector(".panel-footer"), M = document.getElementById("panel-mobile-progress"), ce = document.getElementById("review-submit-warning"), X = document.getElementById("review-submit-message"), _e = document.getElementById("stage-state-banner"), ot = document.getElementById("header-progress-group"), je = document.getElementById("session-identity-label"), pe = L();
    a?.classList.toggle("review-only-mode", pe), je && (je.textContent = pe ? "Reviewing as" : "Signing as"), ot?.classList.toggle("review-only-hidden", pe), o && (o.textContent = pe ? "Review & Comment" : f() ? "Review, Complete & Sign" : "Complete & Sign"), u?.classList.toggle("hidden", pe), l?.classList.toggle("hidden", pe), M?.classList.toggle("hidden", pe), p?.classList.toggle("hidden", pe || s.hasConsented), _e?.classList.toggle("hidden", pe), pe ? D?.classList.add("hidden") : (D?.classList.remove("hidden"), y?.classList.remove("hidden"), C?.classList.remove("hidden")), ce && X && (pe ? ce.classList.add("hidden") : f() && s.reviewContext.sign_blocked ? (ce.classList.remove("hidden"), X.textContent = s.reviewContext.sign_block_reason || "Signing is blocked until review completes.") : ce.classList.add("hidden"));
  }
  async function Re() {
    if (!f()) return;
    const a = document.getElementById("review-thread-body"), o = String(a?.value || "").trim();
    if (!o) {
      $e("Enter a comment before creating a thread.", "assertive");
      return;
    }
    const l = document.getElementById("review-thread-visibility"), u = {
      thread: {
        review_id: s.reviewContext.review_id,
        visibility: String(l?.value || "shared").trim() || "shared",
        body: o,
        ...Pe()
      }
    };
    await re("/threads", {
      method: "POST",
      body: JSON.stringify(u)
    }, "Failed to create review thread"), a && (a.value = ""), Z() === "page" && (s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), ne(null)), await Q(), $e("Review comment added.");
  }
  async function at(a, o) {
    const l = document.getElementById(String(o || "").trim()), u = String(l?.value || "").trim();
    if (!a || !u) {
      $e("Enter a reply before sending.", "assertive");
      return;
    }
    await re(`/threads/${encodeURIComponent(String(a))}/replies`, {
      method: "POST",
      body: JSON.stringify({ reply: { body: u } })
    }, "Failed to reply to review thread"), l && (l.value = ""), await Q(), $e("Reply added to review thread.");
  }
  async function pt(a, o) {
    if (!a) return;
    const l = o ? "resolve" : "reopen";
    await re(`/threads/${encodeURIComponent(String(a))}/${l}`, {
      method: "POST",
      body: JSON.stringify({})
    }, o ? "Failed to resolve review thread" : "Failed to reopen review thread"), await Q(), $e(o ? "Review thread resolved." : "Review thread reopened.");
  }
  async function dt(a, o = "") {
    const l = a === "approve" ? "/approve" : "/request-changes", u = a === "approve" ? "Failed to approve review" : "Failed to request review changes", p = a === "request-changes" && o ? JSON.stringify({ comment: o }) : void 0;
    await re(l, { method: "POST", body: p }, u), await Q(), $e(a === "approve" ? "Review approved." : "Review changes requested.");
  }
  let tt = "";
  function ut(a) {
    const o = document.getElementById("review-decision-modal"), l = document.getElementById("review-decision-icon-container"), u = document.getElementById("review-decision-icon"), p = document.getElementById("review-decision-modal-title"), y = document.getElementById("review-decision-modal-description"), C = document.getElementById("review-decision-comment-section"), D = document.getElementById("review-decision-comment"), M = document.getElementById("review-decision-comment-error"), ce = document.getElementById("review-decision-confirm-btn");
    if (!o) return;
    tt = a, a === "approve" ? (l?.classList.remove("bg-amber-100"), l?.classList.add("bg-emerald-100"), u?.classList.remove("iconoir-warning-circle", "text-amber-600"), u?.classList.add("iconoir-check-circle", "text-emerald-600"), p && (p.textContent = "Approve Review?"), y && (y.textContent = "This will mark the document as approved and notify the sender that the review is complete."), C?.classList.add("hidden"), ce?.classList.remove("bg-amber-600", "hover:bg-amber-700"), ce?.classList.add("btn-primary"), ce && (ce.textContent = "Approve")) : (l?.classList.remove("bg-emerald-100"), l?.classList.add("bg-amber-100"), u?.classList.remove("iconoir-check-circle", "text-emerald-600"), u?.classList.add("iconoir-warning-circle", "text-amber-600"), p && (p.textContent = "Request Changes?"), y && (y.textContent = "The sender will be notified that changes are needed before this document can proceed."), C?.classList.remove("hidden"), D && (D.value = ""), M?.classList.add("hidden"), ce?.classList.remove("btn-primary"), ce?.classList.add("bg-amber-600", "hover:bg-amber-700", "text-white"), ce && (ce.textContent = "Request Changes")), o.classList.add("active"), o.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden";
    const X = o.querySelector(".field-editor");
    X instanceof HTMLElement && cn(X), a === "request-changes" && D?.focus();
  }
  function Le() {
    const a = document.getElementById("review-decision-modal");
    if (!a) return;
    const o = a.querySelector(".field-editor");
    o instanceof HTMLElement && ln(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", tt = "";
  }
  async function k() {
    if (!tt) return;
    const a = tt;
    let o = "";
    if (a === "request-changes") {
      const l = document.getElementById("review-decision-comment"), u = document.getElementById("review-decision-comment-error");
      if (o = String(l?.value || "").trim(), !o) {
        u?.classList.remove("hidden"), l?.focus(), $e("Please provide a reason for requesting changes.", "assertive");
        return;
      }
    }
    Le(), await dt(a, o);
  }
  function T(a) {
    const l = (Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : []).find((y) => String(y?.thread?.id || "") === String(a || ""));
    if (!l) return;
    ge(a);
    const u = String(l?.thread?.anchor_type || "").trim();
    if (u === "field" && l.thread.field_id) {
      const y = s.fieldState.get(l.thread.field_id);
      y?.page && rn(Number(y.page || 1) || 1), Rn(l.thread.field_id, { openEditor: !1 }), Un(l.thread.field_id);
      return;
    }
    if (u === "page" && Number(l?.thread?.page_number || 0) > 0) {
      rn(Number(l.thread.page_number || 1) || 1);
      return;
    }
    document.getElementById("viewer-content")?.scrollTo({ top: 0, behavior: "smooth" });
  }
  const H = {
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
      const o = n.viewer.pages?.find((u) => u.page === a);
      if (o)
        return {
          width: o.width,
          height: o.height,
          rotation: o.rotation || 0
        };
      const l = this.pageViewports.get(a);
      return l ? {
        width: l.width,
        height: l.height,
        rotation: l.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(a, o) {
      this.pageViewports.set(a, {
        width: o.width,
        height: o.height,
        rotation: o.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(a, o) {
      const l = a.page, u = this.getPageMetadata(l), p = o.offsetWidth, y = o.offsetHeight, C = a.pageWidth || u.width, D = a.pageHeight || u.height, M = p / C, ce = y / D;
      let X = a.posX || 0, _e = a.posY || 0;
      n.viewer.origin === "bottom-left" && (_e = D - _e - (a.height || 30));
      const ot = X * M, je = _e * ce, pe = (a.width || 150) * M, Ue = (a.height || 30) * ce;
      return {
        left: ot,
        top: je,
        width: pe,
        height: Ue,
        // Store original values for debugging
        _debug: {
          sourceX: X,
          sourceY: _e,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: C,
          pageHeight: D,
          scaleX: M,
          scaleY: ce,
          zoom: s.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(a, o) {
      const l = this.pageToScreen(a, o);
      return {
        left: `${Math.round(l.left)}px`,
        top: `${Math.round(l.top)}px`,
        width: `${Math.round(l.width)}px`,
        height: `${Math.round(l.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    },
    screenToPagePoint(a, o, l, u) {
      const p = this.getPageMetadata(a), y = o.getBoundingClientRect();
      if (!y.width || !y.height)
        return null;
      const C = Math.min(Math.max(l - y.left, 0), y.width), D = Math.min(Math.max(u - y.top, 0), y.height), M = p.width || y.width, ce = p.height || y.height, X = M / y.width, _e = ce / y.height;
      let ot = C * X, je = D * _e;
      return n.viewer.origin === "bottom-left" && (je = ce - je), {
        page_number: Number(a || 1) || 1,
        anchor_x: Math.round(ot * 100) / 100,
        anchor_y: Math.round(je * 100) / 100
      };
    }
  }, V = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(a, o, l, u) {
      const p = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: a,
            sha256: o,
            content_type: l,
            size_bytes: u
          })
        }
      );
      if (!p.ok)
        throw await Pt(p, "Failed to get upload contract");
      const y = await p.json(), C = y?.contract || y;
      if (!C || typeof C != "object" || !C.upload_url)
        throw new Error("Invalid upload contract response");
      return C;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(a, o) {
      const l = new URL(a.upload_url, window.location.origin);
      a.upload_token && l.searchParams.set("upload_token", String(a.upload_token)), a.object_key && l.searchParams.set("object_key", String(a.object_key));
      const u = {
        "Content-Type": a.content_type || "image/png"
      };
      a.headers && Object.entries(a.headers).forEach(([y, C]) => {
        const D = String(y).toLowerCase();
        D === "x-esign-upload-token" || D === "x-esign-upload-key" || (u[y] = String(C));
      });
      const p = await fetch(l.toString(), {
        method: a.method || "PUT",
        headers: u,
        body: o,
        credentials: "omit"
      });
      if (!p.ok)
        throw await Pt(p, `Upload failed: ${p.status} ${p.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [o, l] = a.split(","), u = o.match(/data:([^;]+)/), p = u ? u[1] : "image/png", y = atob(l), C = new Uint8Array(y.length);
      for (let D = 0; D < y.length; D++)
        C[D] = y.charCodeAt(D);
      return new Blob([C], { type: p });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, o) {
      const l = this.dataUrlToBlob(o), u = l.size, p = "image/png", y = await q(l), C = await this.requestUploadBootstrap(
        a,
        y,
        p,
        u
      );
      return await this.uploadToSignedUrl(C, l), {
        uploadToken: C.upload_token,
        objectKey: C.object_key,
        sha256: C.sha256,
        contentType: C.content_type
      };
    }
  }, se = {
    endpoint(a, o = "") {
      const l = encodeURIComponent(a), u = o ? `/${encodeURIComponent(o)}` : "";
      return `${n.apiBasePath}/signatures/${l}${u}`;
    },
    async list(a) {
      const o = new URL(this.endpoint(n.token), window.location.origin);
      o.searchParams.set("type", a);
      const l = await fetch(o.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!l.ok) {
        const p = await l.json().catch(() => ({}));
        throw new Error(p?.error?.message || "Failed to load saved signatures");
      }
      const u = await l.json();
      return Array.isArray(u?.signatures) ? u.signatures : [];
    },
    async save(a, o, l = "") {
      const u = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: a,
          label: l,
          data_url: o
        })
      });
      if (!u.ok) {
        const y = await u.json().catch(() => ({})), C = new Error(y?.error?.message || "Failed to save signature");
        throw C.code = y?.error?.code || "", C;
      }
      return (await u.json())?.signature || null;
    },
    async delete(a) {
      const o = await fetch(this.endpoint(n.token, a), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!o.ok) {
        const l = await o.json().catch(() => ({}));
        throw new Error(l?.error?.message || "Failed to delete signature");
      }
    }
  };
  function he(a) {
    const o = s.fieldState.get(a);
    return o && o.type === "initials" ? "initials" : "signature";
  }
  function Ae(a) {
    return s.savedSignaturesByType.get(a) || [];
  }
  async function Ie(a, o = !1) {
    const l = he(a);
    if (!o && s.savedSignaturesByType.has(l)) {
      me(a);
      return;
    }
    const u = await se.list(l);
    s.savedSignaturesByType.set(l, u), me(a);
  }
  function me(a) {
    const o = he(a), l = Ae(o), u = document.getElementById("sig-saved-list");
    if (u) {
      if (!l.length) {
        u.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      u.innerHTML = l.map((p) => {
        const y = Ye(String(p?.thumbnail_data_url || p?.data_url || "")), C = Ye(String(p?.label || "Saved signature")), D = Ye(String(p?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${y}" alt="${C}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${C}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Ye(a)}" data-signature-id="${D}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Ye(a)}" data-signature-id="${D}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function ae(a) {
    const o = s.signatureCanvases.get(a), l = he(a);
    if (!o || !Bn(a))
      throw new Error(`Please add your ${l === "initials" ? "initials" : "signature"} first`);
    const u = o.canvas.toDataURL("image/png"), p = await se.save(l, u, l === "initials" ? "Initials" : "Signature");
    if (!p)
      throw new Error("Failed to save signature");
    const y = Ae(l);
    y.unshift(p), s.savedSignaturesByType.set(l, y), me(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function O(a, o) {
    const l = he(a), p = Ae(l).find((C) => String(C?.id || "") === String(o));
    if (!p) return;
    requestAnimationFrame(() => on(a)), await be(a);
    const y = String(p.data_url || p.thumbnail_data_url || "").trim();
    y && (await $n(a, y, { clearStrokes: !0 }), E(a, y), h(), an("draw", a), $e("Saved signature selected."));
  }
  async function we(a, o) {
    const l = he(a);
    await se.delete(o);
    const u = Ae(l).filter((p) => String(p?.id || "") !== String(o));
    s.savedSignaturesByType.set(l, u), me(a);
  }
  function ve(a) {
    const o = String(a?.code || "").trim(), l = String(a?.message || "Unable to update saved signatures"), u = o === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : l;
    window.toastManager && window.toastManager.error(u), $e(u, "assertive");
  }
  async function be(a, o = 8) {
    for (let l = 0; l < o; l++) {
      if (s.signatureCanvases.has(a)) return !0;
      await new Promise((u) => setTimeout(u, 40)), on(a);
    }
    return !1;
  }
  async function Ee(a, o) {
    const l = String(o?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(l))
      throw new Error("Only PNG and JPEG images are supported");
    if (o.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => on(a)), await be(a);
    const u = s.signatureCanvases.get(a);
    if (!u)
      throw new Error("Signature canvas is not ready");
    const p = await v(o), y = l === "image/png" ? p : await I(p, u.drawWidth, u.drawHeight);
    if (w(y) > Zi)
      throw new Error(`Image exceeds ${Math.round(Zi / 1024)}KB limit after conversion`);
    await $n(a, y, { clearStrokes: !0 }), E(a, y), h();
    const D = document.getElementById("sig-upload-preview-wrap"), M = document.getElementById("sig-upload-preview");
    D && D.classList.remove("hidden"), M && M.setAttribute("src", y), $e("Signature image uploaded. You can now insert it.");
  }
  function v(a) {
    return new Promise((o, l) => {
      const u = new FileReader();
      u.onload = () => o(String(u.result || "")), u.onerror = () => l(new Error("Unable to read image file")), u.readAsDataURL(a);
    });
  }
  function w(a) {
    const o = String(a || "").split(",");
    if (o.length < 2) return 0;
    const l = o[1] || "", u = (l.match(/=+$/) || [""])[0].length;
    return Math.floor(l.length * 3 / 4) - u;
  }
  async function I(a, o, l) {
    return await new Promise((u, p) => {
      const y = new Image();
      y.onload = () => {
        const C = document.createElement("canvas"), D = Math.max(1, Math.round(Number(o) || 600)), M = Math.max(1, Math.round(Number(l) || 160));
        C.width = D, C.height = M;
        const ce = C.getContext("2d");
        if (!ce) {
          p(new Error("Unable to process image"));
          return;
        }
        ce.clearRect(0, 0, D, M);
        const X = Math.min(D / y.width, M / y.height), _e = y.width * X, ot = y.height * X, je = (D - _e) / 2, pe = (M - ot) / 2;
        ce.drawImage(y, je, pe, _e, ot), u(C.toDataURL("image/png"));
      }, y.onerror = () => p(new Error("Unable to decode image file")), y.src = a;
    });
  }
  async function q(a) {
    if (window.crypto && window.crypto.subtle) {
      const o = await a.arrayBuffer(), l = await window.crypto.subtle.digest("SHA-256", o);
      return Array.from(new Uint8Array(l)).map((u) => u.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function W() {
    document.addEventListener("click", (a) => {
      const o = a.target;
      if (!(o instanceof Element)) return;
      const l = o.closest("[data-esign-action]");
      if (!l) return;
      switch (l.getAttribute("data-esign-action")) {
        case "prev-page":
          Er();
          break;
        case "next-page":
          Cr();
          break;
        case "zoom-out":
          _r();
          break;
        case "zoom-in":
          Lr();
          break;
        case "fit-width":
          Ar();
          break;
        case "download-document":
          Xr();
          break;
        case "show-consent-modal":
          _i();
          break;
        case "activate-field": {
          const p = l.getAttribute("data-field-id");
          p && sn(p);
          break;
        }
        case "submit-signature":
          Wr();
          break;
        case "show-decline-modal":
          Yr();
          break;
        case "close-field-editor":
          Nn();
          break;
        case "save-field-editor":
          Hr();
          break;
        case "hide-consent-modal":
          zn();
          break;
        case "accept-consent":
          Gr();
          break;
        case "hide-decline-modal":
          Ai();
          break;
        case "confirm-decline":
          Jr();
          break;
        case "approve-review":
          ut("approve");
          break;
        case "request-review-changes":
          ut("request-changes");
          break;
        case "hide-review-decision-modal":
          Le();
          break;
        case "confirm-review-decision":
          k().catch((p) => {
            window.toastManager && window.toastManager.error(p?.message || "Unable to complete review action"), $e(`Error: ${p?.message || "Unable to complete review action"}`, "assertive");
          });
          break;
        case "create-review-thread":
          Re().catch((p) => {
            window.toastManager && window.toastManager.error(p?.message || "Unable to add comment"), $e(`Error: ${p?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "reply-review-thread": {
          const p = l.getAttribute("data-thread-id"), y = l.getAttribute("data-reply-input-id");
          at(p, y).catch((C) => {
            window.toastManager && window.toastManager.error(C?.message || "Unable to reply to thread"), $e(`Error: ${C?.message || "Unable to reply to thread"}`, "assertive");
          });
          break;
        }
        case "resolve-review-thread": {
          const p = l.getAttribute("data-thread-id");
          pt(p, !0).catch((y) => {
            window.toastManager && window.toastManager.error(y?.message || "Unable to resolve thread"), $e(`Error: ${y?.message || "Unable to resolve thread"}`, "assertive");
          });
          break;
        }
        case "reopen-review-thread": {
          const p = l.getAttribute("data-thread-id");
          pt(p, !1).catch((y) => {
            window.toastManager && window.toastManager.error(y?.message || "Unable to reopen thread"), $e(`Error: ${y?.message || "Unable to reopen thread"}`, "assertive");
          });
          break;
        }
        case "go-review-thread-anchor": {
          const p = l.getAttribute("data-thread-id");
          T(p);
          break;
        }
        case "go-review-thread": {
          const p = l.getAttribute("data-thread-id");
          Oe(p);
          break;
        }
        case "filter-review-threads": {
          const p = l.getAttribute("data-filter") || "all";
          Je(p);
          break;
        }
        case "page-review-threads": {
          const p = parseInt(l.getAttribute("data-page") || "1", 10);
          ye(p);
          break;
        }
        case "toggle-reply-composer": {
          const p = l.getAttribute("data-composer-id");
          ee(p, !0);
          break;
        }
        case "cancel-reply": {
          const p = l.getAttribute("data-composer-id");
          ee(p, !1);
          break;
        }
        case "pick-review-anchor-point":
          Z() === "page" && Te(!0);
          break;
        case "clear-review-anchor-point":
          s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), ne(null), $e("Pinned comment location cleared.");
          break;
        case "retry-load-pdf":
          bt();
          break;
        case "signature-tab": {
          const p = l.getAttribute("data-tab") || "draw", y = l.getAttribute("data-field-id");
          y && an(p, y);
          break;
        }
        case "clear-signature-canvas": {
          const p = l.getAttribute("data-field-id");
          p && Br(p);
          break;
        }
        case "undo-signature-canvas": {
          const p = l.getAttribute("data-field-id");
          p && Mr(p);
          break;
        }
        case "redo-signature-canvas": {
          const p = l.getAttribute("data-field-id");
          p && $r(p);
          break;
        }
        case "save-current-signature-library": {
          const p = l.getAttribute("data-field-id");
          p && ae(p).catch(ve);
          break;
        }
        case "select-saved-signature": {
          const p = l.getAttribute("data-field-id"), y = l.getAttribute("data-signature-id");
          p && y && O(p, y).catch(ve);
          break;
        }
        case "delete-saved-signature": {
          const p = l.getAttribute("data-field-id"), y = l.getAttribute("data-signature-id");
          p && y && we(p, y).catch(ve);
          break;
        }
        case "clear-signer-profile":
          te().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          $t.togglePanel();
          break;
        case "debug-copy-session":
          $t.copySessionInfo();
          break;
        case "debug-clear-cache":
          $t.clearCache();
          break;
        case "debug-show-telemetry":
          $t.showTelemetry();
          break;
        case "debug-reload-viewer":
          $t.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const o = a.target;
      if (o instanceof HTMLInputElement) {
        if (o.matches("#sig-upload-input")) {
          const l = o.getAttribute("data-field-id"), u = o.files?.[0];
          if (!l || !u) return;
          Ee(l, u).catch((p) => {
            window.toastManager && window.toastManager.error(p?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (o.matches("#field-checkbox-input")) {
          const l = o.getAttribute("data-field-id") || s.activeFieldId;
          if (!l) return;
          A(l, o.checked), h();
        }
      }
    }), document.addEventListener("input", (a) => {
      const o = a.target;
      if (!(o instanceof HTMLInputElement) && !(o instanceof HTMLTextAreaElement)) return;
      const l = o.getAttribute("data-field-id") || s.activeFieldId;
      if (l) {
        if (o.matches("#sig-type-input")) {
          Mn(l, o.value || "", { syncOverlay: !0 });
          return;
        }
        if (o.matches("#field-text-input")) {
          S(l, o.value || ""), h();
          return;
        }
        o.matches("#field-checkbox-input") && o instanceof HTMLInputElement && (A(l, o.checked), h());
      }
    });
  }
  Fe(async () => {
    W(), s.isLowMemory = Be(), Me(), it(), await yt(), We(), fe(), st(), Ve(), Se(), le(), Li(), Dt(), await bt(), Gt(), document.addEventListener("visibilitychange", K), "memory" in navigator && ue(), $t.init();
  });
  function K() {
    document.hidden && oe();
  }
  function oe() {
    const a = s.isLowMemory ? 1 : 2;
    for (; s.renderedPages.size > a; ) {
      let o = null, l = 1 / 0;
      if (s.renderedPages.forEach((u, p) => {
        p !== s.currentPage && u.timestamp < l && (o = p, l = u.timestamp);
      }), o !== null)
        s.renderedPages.delete(o);
      else
        break;
    }
  }
  function ue() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, o = navigator.memory.totalJSHeapSize;
        a / o > 0.8 && (s.isLowMemory = !0, oe());
      }
    }, 3e4);
  }
  function He(a) {
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
  function Me() {
    const a = document.getElementById("pdf-compatibility-banner"), o = document.getElementById("pdf-compatibility-message"), l = document.getElementById("pdf-compatibility-title");
    if (!a || !o || !l) return;
    const u = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), p = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (u !== "limited") {
      a.classList.add("hidden");
      return;
    }
    l.textContent = "Preview Compatibility Notice", o.textContent = String(n.viewer.compatibilityMessage || "").trim() || He(p), a.classList.remove("hidden"), d.trackDegradedMode("pdf_preview_compatibility", { tier: u, reason: p });
  }
  function it() {
    const a = document.getElementById("stage-state-banner"), o = document.getElementById("stage-state-icon"), l = document.getElementById("stage-state-title"), u = document.getElementById("stage-state-message"), p = document.getElementById("stage-state-meta");
    if (!a || !o || !l || !u || !p) return;
    const y = n.signerState || "active", C = n.recipientStage || 1, D = n.activeStage || 1, M = n.activeRecipientIds || [], ce = n.waitingForRecipientIds || [];
    let X = {
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
    switch (y) {
      case "waiting":
        X = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: C > D ? `You are in signing stage ${C}. Stage ${D} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, ce.length > 0 && X.badges.push({
          icon: "iconoir-group",
          text: `${ce.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        X = {
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
        X = {
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
        M.length > 1 ? (X.message = `You and ${M.length - 1} other signer(s) can sign now.`, X.badges = [
          { icon: "iconoir-users", text: `Stage ${D} active`, variant: "green" }
        ]) : C > 1 ? X.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${C}`, variant: "green" }
        ] : X.hidden = !0;
        break;
    }
    if (X.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${X.bgClass} ${X.borderClass}`, o.className = `${X.iconClass} mt-0.5`, l.className = `text-sm font-semibold ${X.titleClass}`, l.textContent = X.title, u.className = `text-xs ${X.messageClass} mt-1`, u.textContent = X.message, p.innerHTML = "", X.badges.forEach((_e) => {
      const ot = document.createElement("span"), je = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      ot.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${je[_e.variant] || je.blue}`, ot.innerHTML = `<i class="${_e.icon} mr-1"></i>${_e.text}`, p.appendChild(ot);
    });
  }
  function We() {
    n.fields.forEach((a) => {
      let o = null, l = !1;
      if (a.type === "checkbox")
        o = a.value_bool || !1, l = o;
      else if (a.type === "date_signed")
        o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], l = !0;
      else {
        const u = String(a.value_text || "");
        o = u || Xe(a), l = !!u;
      }
      s.fieldState.set(a.id, {
        id: a.id,
        type: a.type,
        page: a.page || 1,
        required: a.required,
        value: o,
        completed: l,
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
  async function yt() {
    try {
      const a = await c.load(s.profileKey);
      a && (s.profileData = a, s.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function Xe(a) {
    const o = s.profileData;
    if (!o) return "";
    const l = String(a?.type || "").trim();
    return l === "name" ? xt(o.fullName || "") : l === "initials" ? xt(o.initials || "") || ri(o.fullName || n.recipientName || "") : l === "signature" ? xt(o.typedSignature || "") : "";
  }
  function R(a) {
    return !n.profile.persistDrawnSignature || !s.profileData ? "" : a?.type === "initials" && String(s.profileData.drawnInitialsDataUrl || "").trim() || String(s.profileData.drawnSignatureDataUrl || "").trim();
  }
  function U(a) {
    const o = xt(a?.value || "");
    return o || (s.profileData ? a?.type === "initials" ? xt(s.profileData.initials || "") || ri(s.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? xt(s.profileData.typedSignature || "") : "" : "");
  }
  function z() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : s.profileRemember;
  }
  async function te(a = !1) {
    let o = null;
    try {
      await c.clear(s.profileKey);
    } catch (l) {
      o = l;
    } finally {
      s.profileData = null, s.profileRemember = n.profile.rememberByDefault;
    }
    if (o) {
      if (!a && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !a)
        throw o;
      return;
    }
    !a && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function ie(a, o = {}) {
    const l = z();
    if (s.profileRemember = l, !l) {
      await te(!0);
      return;
    }
    if (!a) return;
    const u = {
      remember: !0
    }, p = String(a.type || "");
    if (p === "name" && typeof a.value == "string") {
      const y = xt(a.value);
      y && (u.fullName = y, (s.profileData?.initials || "").trim() || (u.initials = ri(y)));
    }
    if (p === "initials") {
      if (o.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof o.signatureDataUrl == "string")
        u.drawnInitialsDataUrl = o.signatureDataUrl;
      else if (typeof a.value == "string") {
        const y = xt(a.value);
        y && (u.initials = y);
      }
    }
    if (p === "signature") {
      if (o.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof o.signatureDataUrl == "string")
        u.drawnSignatureDataUrl = o.signatureDataUrl;
      else if (typeof a.value == "string") {
        const y = xt(a.value);
        y && (u.typedSignature = y);
      }
    }
    if (!(Object.keys(u).length === 1 && u.remember === !0))
      try {
        const y = await c.save(s.profileKey, u);
        s.profileData = y;
      } catch {
      }
  }
  function le() {
    const a = document.getElementById("consent-checkbox"), o = document.getElementById("consent-accept-btn");
    a && o && a.addEventListener("change", function() {
      o.disabled = !this.checked;
    });
  }
  function Be() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Ke() {
    const a = s.isLowMemory ? 3 : s.maxCachedPages;
    if (s.renderedPages.size <= a) return;
    const o = [];
    for (s.renderedPages.forEach((l, u) => {
      const p = Math.abs(u - s.currentPage);
      o.push({ pageNum: u, distance: p });
    }), o.sort((l, u) => u.distance - l.distance); s.renderedPages.size > a && o.length > 0; ) {
      const l = o.shift();
      l && l.pageNum !== s.currentPage && s.renderedPages.delete(l.pageNum);
    }
  }
  function G(a) {
    if (s.isLowMemory) return;
    const o = [];
    a > 1 && o.push(a - 1), a < n.pageCount && o.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      o.forEach(async (l) => {
        !s.renderedPages.has(l) && !s.pageRendering && await xe(l);
      });
    }, { timeout: 2e3 });
  }
  async function xe(a) {
    if (!(!s.pdfDoc || s.renderedPages.has(a)))
      try {
        const o = await s.pdfDoc.getPage(a), l = s.zoomLevel, u = o.getViewport({ scale: l * window.devicePixelRatio }), p = document.createElement("canvas"), y = p.getContext("2d");
        p.width = u.width, p.height = u.height;
        const C = {
          canvasContext: y,
          viewport: u
        };
        await o.render(C).promise, s.renderedPages.set(a, {
          canvas: p,
          scale: l,
          timestamp: Date.now()
        }), Ke();
      } catch (o) {
        console.warn("Preload failed for page", a, o);
      }
  }
  function Ne() {
    const a = window.devicePixelRatio || 1;
    return s.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function bt() {
    const a = document.getElementById("pdf-loading"), o = Date.now();
    try {
      const l = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!l.ok)
        throw new Error("Failed to load document");
      const p = (await l.json()).assets || {}, y = p.source_url || p.executed_url || p.certificate_url || n.documentUrl;
      if (!y)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const C = pdfjsLib.getDocument(y);
      s.pdfDoc = await C.promise, n.pageCount = s.pdfDoc.numPages, document.getElementById("page-count").textContent = s.pdfDoc.numPages, await wt(1), kn(), d.trackViewerLoad(!0, Date.now() - o), d.trackPageView(1);
    } catch (l) {
      console.error("PDF load error:", l), d.trackViewerLoad(!1, Date.now() - o, l.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Kr();
    }
  }
  async function wt(a) {
    if (!s.pdfDoc) return;
    const o = s.renderedPages.get(a);
    if (o && o.scale === s.zoomLevel) {
      nn(o), s.currentPage = a, document.getElementById("current-page").textContent = a, kn(), ke(), Gt(), G(a);
      return;
    }
    s.pageRendering = !0;
    try {
      const l = await s.pdfDoc.getPage(a), u = s.zoomLevel, p = Ne(), y = l.getViewport({ scale: u * p }), C = l.getViewport({ scale: 1 });
      H.setPageViewport(a, {
        width: C.width,
        height: C.height,
        rotation: C.rotation || 0
      });
      const D = document.getElementById("pdf-page-1");
      D.innerHTML = "";
      const M = document.createElement("canvas"), ce = M.getContext("2d");
      M.height = y.height, M.width = y.width, M.style.width = `${y.width / p}px`, M.style.height = `${y.height / p}px`, D.appendChild(M);
      const X = document.getElementById("pdf-container");
      X.style.width = `${y.width / p}px`;
      const _e = {
        canvasContext: ce,
        viewport: y
      };
      await l.render(_e).promise, s.renderedPages.set(a, {
        canvas: M.cloneNode(!0),
        scale: u,
        timestamp: Date.now(),
        displayWidth: y.width / p,
        displayHeight: y.height / p
      }), s.renderedPages.get(a).canvas.getContext("2d").drawImage(M, 0, 0), Ke(), s.currentPage = a, document.getElementById("current-page").textContent = a, kn(), ke(), Gt(), d.trackPageView(a), G(a);
    } catch (l) {
      console.error("Page render error:", l);
    } finally {
      if (s.pageRendering = !1, s.pageNumPending !== null) {
        const l = s.pageNumPending;
        s.pageNumPending = null, await wt(l);
      }
    }
  }
  function nn(a, o) {
    const l = document.getElementById("pdf-page-1");
    l.innerHTML = "";
    const u = document.createElement("canvas");
    u.width = a.canvas.width, u.height = a.canvas.height, u.style.width = `${a.displayWidth}px`, u.style.height = `${a.displayHeight}px`, u.getContext("2d").drawImage(a.canvas, 0, 0), l.appendChild(u);
    const y = document.getElementById("pdf-container");
    y.style.width = `${a.displayWidth}px`;
  }
  function Mt(a) {
    s.pageRendering ? s.pageNumPending = a : wt(a);
  }
  function Pn(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? xt(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? xt(a.value) : "";
  }
  function yi(a, o, l, u = !1) {
    const p = document.createElement("img");
    p.className = "field-overlay-preview", p.src = o, p.alt = l, a.appendChild(p), a.classList.add("has-preview"), u && a.classList.add("draft-preview");
  }
  function bi(a, o, l = !1, u = !1) {
    const p = document.createElement("span");
    p.className = "field-overlay-value", l && p.classList.add("font-signature"), p.textContent = o, a.appendChild(p), a.classList.add("has-value"), u && a.classList.add("draft-preview");
  }
  function wi(a, o) {
    const l = document.createElement("span");
    l.className = "field-overlay-label", l.textContent = o, a.appendChild(l);
  }
  function xr(a, o) {
    if (!o) return null;
    const l = a?.thread || {}, u = String(l.anchor_type || "").trim();
    if (u === "page") {
      const p = Number(l.page_number || 0) || 0, y = (Number(l.anchor_x || 0) || 0) > 0 || (Number(l.anchor_y || 0) || 0) > 0;
      if (p !== Number(s.currentPage || 0) || !y) return null;
      const C = H.pageToScreen({
        page: p,
        posX: Number(l.anchor_x || 0) || 0,
        posY: Number(l.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, o);
      return { left: C.left, top: C.top };
    }
    if (u === "field" && l.field_id) {
      const p = s.fieldState.get(String(l.field_id || "").trim());
      if (!p || Number(p.page || 0) !== Number(s.currentPage || 0) || p.posX == null || p.posY == null) return null;
      const y = H.pageToScreen({
        page: Number(p.page || s.currentPage || 1) || 1,
        posX: (Number(p.posX || 0) || 0) + (Number(p.width || 0) || 0) / 2,
        posY: Number(p.posY || 0) || 0,
        width: 0,
        height: 0
      }, o);
      return { left: y.left, top: y.top };
    }
    return null;
  }
  function Ir(a, o) {
    if ((Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : []).forEach((u, p) => {
      const y = u?.thread || {}, C = xr(u, o);
      if (!C) return;
      const D = document.createElement("button");
      D.type = "button", D.className = "review-thread-marker", String(y.status || "").trim() === "resolved" && D.classList.add("resolved"), String(y.id || "").trim() === String(s.highlightedReviewThreadID || "").trim() && D.classList.add("active"), D.dataset.esignAction = "go-review-thread", D.dataset.threadId = String(y.id || "").trim(), D.style.left = `${Math.round(C.left)}px`, D.style.top = `${Math.round(C.top)}px`, D.title = `${ii(u)} comment`, D.setAttribute("aria-label", `${ii(u)} comment ${p + 1}`), D.textContent = String(p + 1), a.appendChild(D);
    }), Z() === "page" && s.reviewAnchorPointDraft && Number(s.reviewAnchorPointDraft.page_number || 0) === Number(s.currentPage || 0)) {
      const u = H.pageToScreen({
        page: Number(s.reviewAnchorPointDraft.page_number || s.currentPage || 1) || 1,
        posX: Number(s.reviewAnchorPointDraft.anchor_x || 0) || 0,
        posY: Number(s.reviewAnchorPointDraft.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, o), p = document.createElement("div");
      p.className = "review-thread-marker active", p.style.left = `${Math.round(u.left)}px`, p.style.top = `${Math.round(u.top)}px`, p.setAttribute("aria-hidden", "true"), p.textContent = "+", a.appendChild(p);
    }
  }
  function Gt() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const o = document.getElementById("pdf-container");
    s.fieldState.forEach((l, u) => {
      if (l.page !== s.currentPage) return;
      const p = document.createElement("div");
      if (p.className = "field-overlay", p.dataset.fieldId = u, l.required && p.classList.add("required"), l.completed && p.classList.add("completed"), s.activeFieldId === u && p.classList.add("active"), l.posX != null && l.posY != null && l.width != null && l.height != null) {
        const _e = H.getOverlayStyles(l, o);
        p.style.left = _e.left, p.style.top = _e.top, p.style.width = _e.width, p.style.height = _e.height, p.style.transform = _e.transform, $t.enabled && (p.dataset.debugCoords = JSON.stringify(
          H.pageToScreen(l, o)._debug
        ));
      } else {
        const _e = Array.from(s.fieldState.keys()).indexOf(u);
        p.style.left = "10px", p.style.top = `${100 + _e * 50}px`, p.style.width = "150px", p.style.height = "30px";
      }
      const C = String(l.previewSignatureUrl || "").trim(), D = String(l.signaturePreviewUrl || "").trim(), M = Pn(l), ce = l.type === "signature" || l.type === "initials", X = typeof l.previewValueBool == "boolean";
      if (C)
        yi(p, C, Wt(l.type), !0);
      else if (l.completed && D)
        yi(p, D, Wt(l.type));
      else if (M) {
        const _e = typeof l.previewValueText == "string" && l.previewValueText.trim() !== "";
        bi(p, M, ce, _e);
      } else l.type === "checkbox" && (X ? l.previewValueBool : !!l.value) ? bi(p, "Checked", !1, X) : wi(p, Wt(l.type));
      p.setAttribute("tabindex", "0"), p.setAttribute("role", "button"), p.setAttribute("aria-label", `${Wt(l.type)} field${l.required ? ", required" : ""}${l.completed ? ", completed" : ""}`), p.addEventListener("click", () => sn(u)), p.addEventListener("keydown", (_e) => {
        (_e.key === "Enter" || _e.key === " ") && (_e.preventDefault(), sn(u));
      }), a.appendChild(p);
    }), o && Ir(a, o);
  }
  function Wt(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function Er() {
    s.currentPage <= 1 || Mt(s.currentPage - 1);
  }
  function Cr() {
    s.currentPage >= n.pageCount || Mt(s.currentPage + 1);
  }
  function rn(a) {
    a < 1 || a > n.pageCount || Mt(a);
  }
  function kn() {
    document.getElementById("prev-page-btn").disabled = s.currentPage <= 1, document.getElementById("next-page-btn").disabled = s.currentPage >= n.pageCount;
  }
  function Lr() {
    s.zoomLevel = Math.min(s.zoomLevel + 0.25, 3), Dn(), Mt(s.currentPage);
  }
  function _r() {
    s.zoomLevel = Math.max(s.zoomLevel - 0.25, 0.5), Dn(), Mt(s.currentPage);
  }
  function Ar() {
    const o = document.getElementById("viewer-content").offsetWidth - 32, l = 612;
    s.zoomLevel = o / l, Dn(), Mt(s.currentPage);
  }
  function Dn() {
    document.getElementById("zoom-level").textContent = `${Math.round(s.zoomLevel * 100)}%`;
  }
  function sn(a) {
    if (!s.hasConsented && n.fields.some((o) => o.id === a && o.type !== "date_signed")) {
      _i();
      return;
    }
    Rn(a, { openEditor: !0 });
  }
  function Rn(a, o = { openEditor: !0 }) {
    const l = s.fieldState.get(a);
    if (l) {
      if (o.openEditor && (s.activeFieldId = a, fe()), document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), l.page !== s.currentPage && rn(l.page), !o.openEditor) {
        Si(a);
        return;
      }
      l.type !== "date_signed" && Tr(a);
    }
  }
  function Si(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Tr(a) {
    const o = s.fieldState.get(a);
    if (!o) return;
    const l = document.getElementById("field-editor-overlay"), u = document.getElementById("field-editor-content"), p = document.getElementById("field-editor-title"), y = document.getElementById("field-editor-legal-disclaimer");
    p.textContent = xi(o.type), u.innerHTML = Pr(o), y?.classList.toggle("hidden", !(o.type === "signature" || o.type === "initials")), (o.type === "signature" || o.type === "initials") && Dr(a), l.classList.add("active"), l.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", cn(l.querySelector(".field-editor")), $e(`Editing ${xi(o.type)}. Press Escape to cancel.`), setTimeout(() => {
      const C = u.querySelector("input, textarea");
      C ? C.focus() : u.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Tt(s.writeCooldownUntil) > 0 && Ei(Tt(s.writeCooldownUntil));
  }
  function xi(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function Pr(a) {
    const o = kr(a.type), l = Ye(String(a?.id || "")), u = Ye(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const p = a.type === "initials" ? "initials" : "signature", y = Ye(U(a)), C = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], D = Ii(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${C.map((M) => `
            <button
              type="button"
              id="sig-tab-${M.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${D === M.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${M.id}"
              data-esign-action="signature-tab"
              data-field-id="${l}"
              role="tab"
              aria-selected="${D === M.id ? "true" : "false"}"
              aria-controls="sig-editor-${M.id}"
              tabindex="${D === M.id ? "0" : "-1"}"
            >
              ${M.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${D === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${p}"
              value="${y}"
              data-field-id="${l}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${l}">${y}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${p} will appear as your ${u}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${D === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${l}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${l}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${l}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${l}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-erase" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${l}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${p} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${D === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${l}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${D === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${p}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${l}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <div id="sig-saved-list" class="space-y-2">
              <p class="text-xs text-gray-500">Loading saved signatures...</p>
            </div>
          </div>

          ${o}
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
          value="${Ye(String(a.value || ""))}"
          data-field-id="${l}"
        />
        ${o}
      `;
    if (a.type === "text") {
      const p = Ye(String(a.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${l}"
        >${p}</textarea>
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
  function kr(a) {
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
  function Mn(a, o, l = { syncOverlay: !1 }) {
    const u = document.getElementById("sig-type-preview"), p = s.fieldState.get(a);
    if (!p) return;
    const y = xt(String(o || "").trim());
    if (l?.syncOverlay && (y ? S(a, y) : m(a), h()), !!u) {
      if (y) {
        u.textContent = y;
        return;
      }
      u.textContent = p.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function Ii(a) {
    const o = String(s.signatureTabByField.get(a) || "").trim();
    return o === "draw" || o === "type" || o === "upload" || o === "saved" ? o : "draw";
  }
  function an(a, o) {
    const l = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    s.signatureTabByField.set(o, l), document.querySelectorAll(".sig-editor-tab").forEach((p) => {
      p.classList.remove("border-blue-600", "text-blue-600"), p.classList.add("border-transparent", "text-gray-500"), p.setAttribute("aria-selected", "false"), p.setAttribute("tabindex", "-1");
    });
    const u = document.querySelector(`.sig-editor-tab[data-tab="${l}"]`);
    if (u?.classList.add("border-blue-600", "text-blue-600"), u?.classList.remove("border-transparent", "text-gray-500"), u?.setAttribute("aria-selected", "true"), u?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", l !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", l !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", l !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", l !== "saved"), (l === "draw" || l === "upload" || l === "saved") && u && requestAnimationFrame(() => on(o)), l === "type") {
      const p = document.getElementById("sig-type-input");
      Mn(o, p?.value || "");
    }
    l === "saved" && Ie(o).catch(ve);
  }
  function Dr(a) {
    s.signatureTabByField.set(a, "draw"), an("draw", a);
    const o = document.getElementById("sig-type-input");
    o && Mn(a, o.value || "");
  }
  function on(a) {
    const o = document.getElementById("sig-draw-canvas");
    if (!o || s.signatureCanvases.has(a)) return;
    const l = o.closest(".signature-canvas-container"), u = o.getContext("2d");
    if (!u) return;
    const p = o.getBoundingClientRect();
    if (!p.width || !p.height) return;
    const y = window.devicePixelRatio || 1;
    o.width = p.width * y, o.height = p.height * y, u.scale(y, y), u.lineCap = "round", u.lineJoin = "round", u.strokeStyle = "#1f2937", u.lineWidth = 2.5;
    let C = !1, D = 0, M = 0, ce = [];
    const X = (pe) => {
      const Ue = o.getBoundingClientRect();
      let St, gt;
      return pe.touches && pe.touches.length > 0 ? (St = pe.touches[0].clientX, gt = pe.touches[0].clientY) : pe.changedTouches && pe.changedTouches.length > 0 ? (St = pe.changedTouches[0].clientX, gt = pe.changedTouches[0].clientY) : (St = pe.clientX, gt = pe.clientY), {
        x: St - Ue.left,
        y: gt - Ue.top,
        timestamp: Date.now()
      };
    }, _e = (pe) => {
      C = !0;
      const Ue = X(pe);
      D = Ue.x, M = Ue.y, ce = [{ x: Ue.x, y: Ue.y, t: Ue.timestamp, width: 2.5 }], l && l.classList.add("drawing");
    }, ot = (pe) => {
      if (!C) return;
      const Ue = X(pe);
      ce.push({ x: Ue.x, y: Ue.y, t: Ue.timestamp, width: 2.5 });
      const St = Ue.x - D, gt = Ue.y - M, dn = Ue.timestamp - (ce[ce.length - 2]?.t || Ue.timestamp), On = Math.sqrt(St * St + gt * gt) / Math.max(dn, 1), un = 2.5, jn = 1.5, qn = 4, ct = Math.min(On / 5, 1), Qe = Math.max(jn, Math.min(qn, un - ct * 1.5));
      ce[ce.length - 1].width = Qe, u.lineWidth = Qe, u.beginPath(), u.moveTo(D, M), u.lineTo(Ue.x, Ue.y), u.stroke(), D = Ue.x, M = Ue.y;
    }, je = () => {
      if (C = !1, ce.length > 1) {
        const pe = s.signatureCanvases.get(a);
        pe && (pe.strokes.push(ce.map((Ue) => ({ ...Ue }))), pe.redoStack = []), Fn(a);
      }
      ce = [], l && l.classList.remove("drawing");
    };
    o.addEventListener("mousedown", _e), o.addEventListener("mousemove", ot), o.addEventListener("mouseup", je), o.addEventListener("mouseout", je), o.addEventListener("touchstart", (pe) => {
      pe.preventDefault(), pe.stopPropagation(), _e(pe);
    }, { passive: !1 }), o.addEventListener("touchmove", (pe) => {
      pe.preventDefault(), pe.stopPropagation(), ot(pe);
    }, { passive: !1 }), o.addEventListener("touchend", (pe) => {
      pe.preventDefault(), je();
    }, { passive: !1 }), o.addEventListener("touchcancel", je), o.addEventListener("gesturestart", (pe) => pe.preventDefault()), o.addEventListener("gesturechange", (pe) => pe.preventDefault()), o.addEventListener("gestureend", (pe) => pe.preventDefault()), s.signatureCanvases.set(a, {
      canvas: o,
      ctx: u,
      dpr: y,
      drawWidth: p.width,
      drawHeight: p.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Rr(a);
  }
  function Rr(a) {
    const o = s.signatureCanvases.get(a), l = s.fieldState.get(a);
    if (!o || !l) return;
    const u = R(l);
    u && $n(a, u, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function $n(a, o, l = { clearStrokes: !1 }) {
    const u = s.signatureCanvases.get(a);
    if (!u) return !1;
    const p = String(o || "").trim();
    if (!p)
      return u.baseImageDataUrl = "", u.baseImage = null, l.clearStrokes && (u.strokes = [], u.redoStack = []), Yt(a), !0;
    const { drawWidth: y, drawHeight: C } = u, D = new Image();
    return await new Promise((M) => {
      D.onload = () => {
        l.clearStrokes && (u.strokes = [], u.redoStack = []), u.baseImage = D, u.baseImageDataUrl = p, y > 0 && C > 0 && Yt(a), M(!0);
      }, D.onerror = () => M(!1), D.src = p;
    });
  }
  function Yt(a) {
    const o = s.signatureCanvases.get(a);
    if (!o) return;
    const { ctx: l, drawWidth: u, drawHeight: p, baseImage: y, strokes: C } = o;
    if (l.clearRect(0, 0, u, p), y) {
      const D = Math.min(u / y.width, p / y.height), M = y.width * D, ce = y.height * D, X = (u - M) / 2, _e = (p - ce) / 2;
      l.drawImage(y, X, _e, M, ce);
    }
    for (const D of C)
      for (let M = 1; M < D.length; M++) {
        const ce = D[M - 1], X = D[M];
        l.lineWidth = Number(X.width || 2.5) || 2.5, l.beginPath(), l.moveTo(ce.x, ce.y), l.lineTo(X.x, X.y), l.stroke();
      }
  }
  function Mr(a) {
    const o = s.signatureCanvases.get(a);
    if (!o || o.strokes.length === 0) return;
    const l = o.strokes.pop();
    l && o.redoStack.push(l), Yt(a), Fn(a);
  }
  function $r(a) {
    const o = s.signatureCanvases.get(a);
    if (!o || o.redoStack.length === 0) return;
    const l = o.redoStack.pop();
    l && o.strokes.push(l), Yt(a), Fn(a);
  }
  function Bn(a) {
    const o = s.signatureCanvases.get(a);
    if (!o) return !1;
    if ((o.baseImageDataUrl || "").trim() || o.strokes.length > 0) return !0;
    const { canvas: l, ctx: u } = o;
    return u.getImageData(0, 0, l.width, l.height).data.some((y, C) => C % 4 === 3 && y > 0);
  }
  function Fn(a) {
    const o = s.signatureCanvases.get(a);
    o && (Bn(a) ? E(a, o.canvas.toDataURL("image/png")) : m(a), h());
  }
  function Br(a) {
    const o = s.signatureCanvases.get(a);
    o && (o.strokes = [], o.redoStack = [], o.baseImage = null, o.baseImageDataUrl = "", Yt(a)), m(a), h();
    const l = document.getElementById("sig-upload-preview-wrap"), u = document.getElementById("sig-upload-preview");
    l && l.classList.add("hidden"), u && u.removeAttribute("src");
  }
  function Nn() {
    const a = document.getElementById("field-editor-overlay"), o = a.querySelector(".field-editor");
    if (ln(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", s.activeFieldId) {
      const l = document.querySelector(`.field-list-item[data-field-id="${s.activeFieldId}"]`);
      requestAnimationFrame(() => {
        l?.focus();
      });
    }
    b(), h(), s.activeFieldId = null, fe(), s.signatureCanvases.clear(), $e("Field editor closed.");
  }
  function Tt(a) {
    const o = Number(a) || 0;
    return o <= 0 ? 0 : Math.max(0, Math.ceil((o - Date.now()) / 1e3));
  }
  function Fr(a, o = {}) {
    const l = Number(o.retry_after_seconds);
    if (Number.isFinite(l) && l > 0)
      return Math.ceil(l);
    const u = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!u) return 0;
    const p = Number(u);
    return Number.isFinite(p) && p > 0 ? Math.ceil(p) : 0;
  }
  async function Pt(a, o) {
    let l = {};
    try {
      l = await a.json();
    } catch {
      l = {};
    }
    const u = l?.error || {}, p = u?.details && typeof u.details == "object" ? u.details : {}, y = Fr(a, p), C = a?.status === 429, D = C ? y > 0 ? `Too many actions too quickly. Please wait ${y}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(u?.message || o || "Request failed"), M = new Error(D);
    return M.status = a?.status || 0, M.code = String(u?.code || ""), M.details = p, M.rateLimited = C, M.retryAfterSeconds = y, M;
  }
  function Ei(a) {
    const o = Math.max(1, Number(a) || 1);
    s.writeCooldownUntil = Date.now() + o * 1e3, s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
    const l = () => {
      const u = document.getElementById("field-editor-save");
      if (!u) return;
      const p = Tt(s.writeCooldownUntil);
      if (p <= 0) {
        s.pendingSaves.has(s.activeFieldId || "") || (u.disabled = !1, u.innerHTML = "Insert"), s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
        return;
      }
      u.disabled = !0, u.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s`;
    };
    l(), s.writeCooldownTimer = setInterval(l, 250);
  }
  function Nr(a) {
    const o = Math.max(1, Number(a) || 1);
    s.submitCooldownUntil = Date.now() + o * 1e3, s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    const l = () => {
      const u = Tt(s.submitCooldownUntil);
      Dt(), u <= 0 && s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    };
    l(), s.submitCooldownTimer = setInterval(l, 250);
  }
  async function Hr() {
    const a = s.activeFieldId;
    if (!a) return;
    const o = s.fieldState.get(a);
    if (!o) return;
    const l = Tt(s.writeCooldownUntil);
    if (l > 0) {
      const p = `Please wait ${l}s before saving again.`;
      window.toastManager && window.toastManager.error(p), $e(p, "assertive");
      return;
    }
    const u = document.getElementById("field-editor-save");
    u.disabled = !0, u.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      s.profileRemember = z();
      let p = !1;
      if (o.type === "signature" || o.type === "initials")
        p = await Ur(a);
      else if (o.type === "checkbox") {
        const y = document.getElementById("field-checkbox-input");
        p = await Hn(a, null, y?.checked || !1);
      } else {
        const C = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!C && o.required)
          throw new Error("This field is required");
        p = await Hn(a, C, null);
      }
      if (p) {
        Nn(), Li(), Dt(), Ti(), Gt(), jr(a), Vr(a);
        const y = Pi();
        y.allRequiredComplete ? $e("Field saved. All required fields complete. Ready to submit.") : $e(`Field saved. ${y.remainingRequired} required field${y.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (p) {
      p?.rateLimited && Ei(p.retryAfterSeconds), window.toastManager && window.toastManager.error(p.message), $e(`Error saving field: ${p.message}`, "assertive");
    } finally {
      if (Tt(s.writeCooldownUntil) > 0) {
        const p = Tt(s.writeCooldownUntil);
        u.disabled = !0, u.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s`;
      } else
        u.disabled = !1, u.innerHTML = "Insert";
    }
  }
  async function Ur(a) {
    const o = s.fieldState.get(a), l = document.getElementById("sig-type-input"), u = Ii(a);
    if (u === "draw" || u === "upload" || u === "saved") {
      const y = s.signatureCanvases.get(a);
      if (!y) return !1;
      if (!Bn(a))
        throw new Error(o?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const C = y.canvas.toDataURL("image/png");
      return await Ci(a, { type: "drawn", dataUrl: C }, o?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const y = l?.value?.trim();
      if (!y)
        throw new Error(o?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return o.type === "initials" ? await Hn(a, y, null) : await Ci(a, { type: "typed", text: y }, y);
    }
  }
  async function Hn(a, o, l) {
    s.pendingSaves.add(a);
    const u = Date.now(), p = s.fieldState.get(a);
    try {
      const y = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: a,
          value_text: o,
          value_bool: l
        })
      });
      if (!y.ok)
        throw await Pt(y, "Failed to save field");
      const C = s.fieldState.get(a);
      return C && (C.value = o ?? l, C.completed = !0, C.hasError = !1), await ie(C), window.toastManager && window.toastManager.success("Field saved"), d.trackFieldSave(a, C?.type, !0, Date.now() - u), !0;
    } catch (y) {
      const C = s.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = y.message), d.trackFieldSave(a, p?.type, !1, Date.now() - u, y.message), y;
    } finally {
      s.pendingSaves.delete(a);
    }
  }
  async function Ci(a, o, l) {
    s.pendingSaves.add(a);
    const u = Date.now(), p = o?.type || "typed";
    try {
      let y;
      if (p === "drawn") {
        const M = await V.uploadDrawnSignature(
          a,
          o.dataUrl
        );
        y = {
          field_instance_id: a,
          type: "drawn",
          value_text: l,
          object_key: M.objectKey,
          sha256: M.sha256,
          upload_token: M.uploadToken
        };
      } else
        y = await zr(a, l);
      const C = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(y)
      });
      if (!C.ok)
        throw await Pt(C, "Failed to save signature");
      const D = s.fieldState.get(a);
      return D && (D.value = l, D.completed = !0, D.hasError = !1, o?.dataUrl && (D.signaturePreviewUrl = o.dataUrl)), await ie(D, {
        signatureType: p,
        signatureDataUrl: o?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), d.trackSignatureAttach(a, p, !0, Date.now() - u), !0;
    } catch (y) {
      const C = s.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = y.message), d.trackSignatureAttach(a, p, !1, Date.now() - u, y.message), y;
    } finally {
      s.pendingSaves.delete(a);
    }
  }
  async function zr(a, o) {
    const l = `${o}|${a}`, u = await Or(l), p = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: o,
      object_key: p,
      sha256: u
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Or(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const o = new TextEncoder().encode(a), l = await window.crypto.subtle.digest("SHA-256", o);
      return Array.from(new Uint8Array(l)).map((u) => u.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Li() {
    let a = 0;
    s.fieldState.forEach((M) => {
      M.required, M.completed && a++;
    });
    const o = s.fieldState.size, l = o > 0 ? a / o * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = o;
    const u = document.getElementById("progress-ring-circle"), p = 97.4, y = p - l / 100 * p;
    u.style.strokeDashoffset = y, document.getElementById("mobile-progress").style.width = `${l}%`;
    const C = o - a, D = document.getElementById("fields-status");
    D && (L() ? D.textContent = f() ? Qt(s.reviewContext.status) : "Review" : f() && s.reviewContext.sign_blocked ? D.textContent = "Review blocked" : D.textContent = C > 0 ? `${C} remaining` : "All complete"), Se();
  }
  function Dt() {
    Se();
    const a = document.getElementById("submit-btn"), o = document.getElementById("incomplete-warning"), l = document.getElementById("incomplete-message"), u = Tt(s.submitCooldownUntil);
    let p = [], y = !1;
    s.fieldState.forEach((M, ce) => {
      M.required && !M.completed && p.push(M), M.hasError && (y = !0);
    });
    const C = !!s.reviewContext?.sign_blocked, D = s.canSignSession && s.hasConsented && p.length === 0 && !y && !C && s.pendingSaves.size === 0 && u === 0 && !s.isSubmitting;
    a.disabled = !D, !s.isSubmitting && u > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${u}s` : !s.isSubmitting && u === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), s.hasConsented ? u > 0 ? (o.classList.remove("hidden"), l.textContent = `Please wait ${u}s before submitting again.`) : s.canSignSession ? C ? (o.classList.remove("hidden"), l.textContent = s.reviewContext?.sign_block_reason || "Signing is blocked until review completes.") : y ? (o.classList.remove("hidden"), l.textContent = "Some fields failed to save. Please retry.") : p.length > 0 ? (o.classList.remove("hidden"), l.textContent = `Complete ${p.length} required field${p.length > 1 ? "s" : ""}`) : o.classList.add("hidden") : (o.classList.remove("hidden"), l.textContent = "This session cannot submit signatures.") : (o.classList.remove("hidden"), l.textContent = "Please accept the consent agreement");
  }
  function jr(a) {
    const o = s.fieldState.get(a), l = document.querySelector(`.field-list-item[data-field-id="${a}"]`);
    if (!(!l || !o)) {
      if (o.completed) {
        l.classList.add("completed"), l.classList.remove("error");
        const u = l.querySelector(".w-8");
        u.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), u.classList.add("bg-green-100", "text-green-600"), u.innerHTML = '<i class="iconoir-check"></i>';
      } else if (o.hasError) {
        l.classList.remove("completed"), l.classList.add("error");
        const u = l.querySelector(".w-8");
        u.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), u.classList.add("bg-red-100", "text-red-600"), u.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function qr() {
    const a = Array.from(s.fieldState.values()).filter((o) => o.required);
    return a.sort((o, l) => {
      const u = Number(o.page || 0), p = Number(l.page || 0);
      if (u !== p) return u - p;
      const y = Number(o.tabIndex || 0), C = Number(l.tabIndex || 0);
      if (y > 0 && C > 0 && y !== C) return y - C;
      if (y > 0 != C > 0) return y > 0 ? -1 : 1;
      const D = Number(o.posY || 0), M = Number(l.posY || 0);
      if (D !== M) return D - M;
      const ce = Number(o.posX || 0), X = Number(l.posX || 0);
      return ce !== X ? ce - X : String(o.id || "").localeCompare(String(l.id || ""));
    }), a;
  }
  function Un(a) {
    s.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((o) => o.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((o) => o.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function Vr(a) {
    const o = qr(), l = o.filter((C) => !C.completed);
    if (l.length === 0) {
      d.track("guided_next_none_remaining", { fromFieldId: a });
      const C = document.getElementById("submit-btn");
      C?.scrollIntoView({ behavior: "smooth", block: "nearest" }), C?.focus(), $e("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const u = o.findIndex((C) => String(C.id) === String(a));
    let p = null;
    if (u >= 0) {
      for (let C = u + 1; C < o.length; C++)
        if (!o[C].completed) {
          p = o[C];
          break;
        }
    }
    if (p || (p = l[0]), !p) return;
    d.track("guided_next_started", { fromFieldId: a, toFieldId: p.id });
    const y = Number(p.page || 1);
    y !== s.currentPage && rn(y), Rn(p.id, { openEditor: !1 }), Un(p.id), setTimeout(() => {
      Un(p.id), Si(p.id), d.track("guided_next_completed", { toFieldId: p.id, page: p.page }), $e(`Next required field highlighted on page ${p.page}.`);
    }, 120);
  }
  function _i() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", cn(a.querySelector(".field-editor")), $e("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function zn() {
    const a = document.getElementById("consent-modal"), o = a.querySelector(".field-editor");
    ln(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", $e("Consent dialog closed.");
  }
  async function Gr() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const o = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!o.ok)
        throw await Pt(o, "Failed to accept consent");
      s.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), zn(), Dt(), Ti(), d.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), $e("Consent accepted. You can now complete the fields and submit.");
    } catch (o) {
      window.toastManager && window.toastManager.error(o.message), $e(`Error: ${o.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function Wr() {
    if (!s.canSignSession || s.reviewContext?.sign_blocked) {
      Dt();
      return;
    }
    const a = document.getElementById("submit-btn"), o = Tt(s.submitCooldownUntil);
    if (o > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${o}s before submitting again.`), Dt();
      return;
    }
    s.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const l = `submit-${n.recipientId}-${Date.now()}`, u = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": l }
      });
      if (!u.ok)
        throw await Pt(u, "Failed to submit");
      d.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (l) {
      d.trackSubmit(!1, l.message), l?.rateLimited && Nr(l.retryAfterSeconds), window.toastManager && window.toastManager.error(l.message);
    } finally {
      s.isSubmitting = !1, Dt();
    }
  }
  function Yr() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", cn(a.querySelector(".field-editor")), $e("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Ai() {
    const a = document.getElementById("decline-modal"), o = a.querySelector(".field-editor");
    ln(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", $e("Decline dialog closed.");
  }
  async function Jr() {
    const a = document.getElementById("decline-reason").value;
    try {
      const o = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!o.ok)
        throw await Pt(o, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (o) {
      window.toastManager && window.toastManager.error(o.message);
    }
  }
  function Kr() {
    d.trackDegradedMode("viewer_load_failure"), d.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Xr() {
    try {
      const a = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!a.ok) throw new Error("Document unavailable");
      const l = (await a.json()).assets || {}, u = l.source_url || l.executed_url || l.certificate_url;
      if (u)
        window.open(u, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (a) {
      window.toastManager && window.toastManager.error(a.message || "Unable to download document");
    }
  }
  const $t = {
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
      const a = this.panel.querySelector(".debug-toggle"), o = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (a.textContent = "+", o.style.display = "none") : (a.textContent = "−", o.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const a = s.fieldState;
      let o = 0;
      a?.forEach((u) => {
        u.completed && o++;
      }), document.getElementById("debug-consent").textContent = s.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${s.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${o}/${a?.size || 0}`, document.getElementById("debug-cached").textContent = s.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = s.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${s.isLowMemory ? "warning" : ""}`;
      const l = d.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = l.length > 0 ? `${l.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${l.length > 0 ? "error" : ""}`;
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
          fields: Array.from(s.fieldState?.entries() || []).map(([a, o]) => ({
            id: a,
            type: o.type,
            completed: o.completed,
            hasError: o.hasError
          })),
          telemetry: d.getSessionSummary(),
          errors: d.metrics.errorsEncountered
        }),
        getEvents: () => d.events,
        forceError: (a) => {
          d.track("debug_forced_error", { message: a }), console.error("[E-Sign Debug] Forced error:", a);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), bt();
        },
        setLowMemory: (a) => {
          s.isLowMemory = a, Ke(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", d.sessionId), console.log("Fields:", s.fieldState?.size || 0), console.log("Low Memory:", s.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), bt(), this.updatePanel();
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
      console.table(d.events), console.log("Session Summary:", d.getSessionSummary());
    }
  };
  function $e(a, o = "polite") {
    const l = o === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    l && (l.textContent = "", requestAnimationFrame(() => {
      l.textContent = a;
    }));
  }
  function cn(a) {
    const l = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), u = l[0], p = l[l.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function y(C) {
      C.key === "Tab" && (C.shiftKey ? document.activeElement === u && (C.preventDefault(), p?.focus()) : document.activeElement === p && (C.preventDefault(), u?.focus()));
    }
    a.addEventListener("keydown", y), a._focusTrapHandler = y, requestAnimationFrame(() => {
      u?.focus();
    });
  }
  function ln(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const o = a.dataset.previousFocus;
    if (o) {
      const l = document.getElementById(o);
      requestAnimationFrame(() => {
        l?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function Ti() {
    const a = Pi(), o = document.getElementById("submit-status");
    o && (a.allRequiredComplete && s.hasConsented ? o.textContent = "All required fields complete. You can now submit." : s.hasConsented ? o.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : o.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Pi() {
    let a = 0, o = 0, l = 0;
    return s.fieldState.forEach((u) => {
      u.required && o++, u.completed && a++, u.required && !u.completed && l++;
    }), {
      completed: a,
      required: o,
      remainingRequired: l,
      total: s.fieldState.size,
      allRequiredComplete: l === 0
    };
  }
  function Qr(a, o = 1) {
    const l = Array.from(s.fieldState.keys()), u = l.indexOf(a);
    if (u === -1) return null;
    const p = u + o;
    return p >= 0 && p < l.length ? l[p] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (Nn(), zn(), Ai(), Le()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const o = Array.from(document.querySelectorAll(".sig-editor-tab")), l = o.indexOf(a.target);
      if (l !== -1) {
        let u = l;
        if (a.key === "ArrowRight" && (u = (l + 1) % o.length), a.key === "ArrowLeft" && (u = (l - 1 + o.length) % o.length), a.key === "Home" && (u = 0), a.key === "End" && (u = o.length - 1), u !== l) {
          a.preventDefault();
          const p = o[u], y = p.getAttribute("data-tab") || "draw", C = p.getAttribute("data-field-id");
          C && an(y, C), p.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const o = a.target.dataset.fieldId, l = a.key === "ArrowDown" ? 1 : -1, u = Qr(o, l);
        u && document.querySelector(`.field-list-item[data-field-id="${u}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const o = a.target.dataset.fieldId;
        o && sn(o);
      }
    }
    a.key === "Tab" && !a.target.closest(".field-editor-overlay") && !a.target.closest("#consent-modal") && a.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(a) {
    a.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class vr {
  constructor(e) {
    this.config = e;
  }
  init() {
    Ga(this.config);
  }
  destroy() {
  }
}
function Zo(i) {
  const e = new vr(i);
  return Fe(() => e.init()), e;
}
function Wa() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && Fe(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = Wa();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new vr(e);
  t.init(), window.esignSignerReviewController = t;
});
class yr {
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
    Ht('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Ht('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function ec(i = {}) {
  const e = new yr(i);
  return Fe(() => e.init()), e;
}
function tc(i = {}) {
  const e = new yr(i);
  Fe(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class mi {
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
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: r } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), r && r.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (c) => {
      this.isLoaded && (c.key === "ArrowLeft" || c.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (c.key === "ArrowRight" || c.key === "PageDown") && this.goToPage(this.currentPage + 1));
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
        const n = await this.pdfDoc.getPage(e), r = n.getViewport({ scale: this.scale }), c = this.elements.canvas, d = c.getContext("2d");
        if (!d)
          throw new Error("Failed to get canvas context");
        c.height = r.height, c.width = r.width, await n.render({
          canvasContext: d,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: r } = this.elements, c = this.pdfDoc?.numPages || 1;
    r && r.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= c);
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
    e && B(e), t && Y(t), n && B(n), r && B(r);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: r } = this.elements;
    e && B(e), t && B(t), n && B(n), r && Y(r);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: r, errorMessage: c, viewer: d } = this.elements;
    t && B(t), n && B(n), r && Y(r), d && B(d), c && (c.textContent = e);
  }
}
function nc(i) {
  const e = new mi(i);
  return e.init(), e;
}
function ic(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new mi(e);
  Fe(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && Fe(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new mi({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class rc {
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
class sc {
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
function Ya(i) {
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
function Ja(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", r = t.label ?? String(n);
    return { label: String(r), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Ka(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), r = e ? String(e).trim().toLowerCase() : "";
  return r && n.includes(r) ? [r, ...n.filter((c) => c !== r)] : n;
}
function ac(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function oc(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: Ya(e.type),
    options: Ja(e.options),
    operators: Ka(e.operators, e.default_operator)
  })) : [];
}
function cc(i) {
  if (!i) return "-";
  const e = ss(i);
  return e ? e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(i);
}
function lc(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function dc(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function uc(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([d, s]) => `${d}: ${s}`).join("; ") : "", r = e?.textCode ? `${e.textCode}: ` : "", c = e?.message || `${i} failed`;
    t.error(n ? `${r}${c}: ${n}` : `${r}${c}`);
  }
}
function pc(i, e) {
  const t = g(`#${i}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function gc(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const mc = {
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
}, Tn = "application/vnd.google-apps.document", fi = "application/vnd.google-apps.spreadsheet", hi = "application/vnd.google-apps.presentation", br = "application/vnd.google-apps.folder", vi = "application/pdf", Xa = [Tn, vi], wr = "esign.google.account_id";
function Qa(i) {
  return i.mimeType === Tn;
}
function Za(i) {
  return i.mimeType === vi;
}
function qt(i) {
  return i.mimeType === br;
}
function eo(i) {
  return Xa.includes(i.mimeType);
}
function fc(i) {
  return i.mimeType === Tn || i.mimeType === fi || i.mimeType === hi;
}
function to(i) {
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
function hc(i) {
  return i.map(to);
}
function Sr(i) {
  return {
    [Tn]: "Google Doc",
    [fi]: "Google Sheet",
    [hi]: "Google Slides",
    [br]: "Folder",
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
function no(i) {
  return qt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Qa(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Za(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === fi ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === hi ? {
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
function io(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function ro(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function vc(i, e) {
  const t = i.get("account_id");
  if (t)
    return xn(t);
  if (e)
    return xn(e);
  const n = localStorage.getItem(wr);
  return n ? xn(n) : "";
}
function xn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function yc(i) {
  const e = xn(i);
  e && localStorage.setItem(wr, e);
}
function bc(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function wc(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function Sc(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function Vt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function so(i) {
  const e = no(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function xc(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, r) => {
    const c = r === t.length - 1, d = r > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return c ? `${d}<span class="text-gray-900 font-medium">${Vt(n.name)}</span>` : `${d}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${Vt(n.name)}</button>`;
  }).join("");
}
function ao(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: r = !0 } = e, c = so(i), d = qt(i), s = eo(i), h = d ? "cursor-pointer hover:bg-gray-50" : s ? "cursor-pointer hover:bg-blue-50" : "opacity-60", m = d ? `data-folder-id="${i.id}" data-folder-name="${Vt(i.name)}"` : s && t ? `data-file-id="${i.id}" data-file-name="${Vt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${h} file-item"
      ${m}
      role="listitem"
      ${s ? 'tabindex="0"' : ""}
    >
      ${c}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${Vt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Sr(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${io(i.size)}` : ""}
          ${r && i.modifiedTime ? ` &middot; ${ro(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${s && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Ic(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${Vt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((c, d) => qt(c) && !qt(d) ? -1 : !qt(c) && qt(d) ? 1 : c.name.localeCompare(d.name)).map((c) => ao(c, { selectable: n })).join("")}
    </div>
  `;
}
function Ec(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Sr(i.mimeType)
  };
}
export {
  us as AGREEMENT_STATUS_BADGES,
  hr as AgreementFormController,
  mi as DocumentDetailPreviewController,
  gi as DocumentFormController,
  as as ESignAPIClient,
  os as ESignAPIError,
  wr as GOOGLE_ACCOUNT_STORAGE_KEY,
  ir as GoogleCallbackController,
  sr as GoogleDrivePickerController,
  rr as GoogleIntegrationController,
  Xa as IMPORTABLE_MIME_TYPES,
  cr as IntegrationConflictsController,
  ar as IntegrationHealthController,
  or as IntegrationMappingsController,
  lr as IntegrationSyncRunsController,
  pi as LandingPageController,
  Tn as MIME_GOOGLE_DOC,
  br as MIME_GOOGLE_FOLDER,
  fi as MIME_GOOGLE_SHEET,
  hi as MIME_GOOGLE_SLIDES,
  vi as MIME_PDF,
  rc as PanelPaginationBehavior,
  sc as PanelSearchBehavior,
  mc as STANDARD_GRID_SELECTORS,
  nr as SignerCompletePageController,
  yr as SignerErrorPageController,
  vr as SignerReviewController,
  mt as announce,
  bc as applyAccountIdToPath,
  vs as applyDetailFormatters,
  $a as bootstrapAgreementForm,
  ic as bootstrapDocumentDetailPreview,
  Xo as bootstrapDocumentForm,
  Fo as bootstrapGoogleCallback,
  zo as bootstrapGoogleDrivePicker,
  Ho as bootstrapGoogleIntegration,
  Wo as bootstrapIntegrationConflicts,
  jo as bootstrapIntegrationHealth,
  Vo as bootstrapIntegrationMappings,
  Jo as bootstrapIntegrationSyncRuns,
  Ro as bootstrapLandingPage,
  $o as bootstrapSignerCompletePage,
  tc as bootstrapSignerErrorPage,
  Ga as bootstrapSignerReview,
  wc as buildScopedApiUrl,
  So as byId,
  ds as capitalize,
  ls as createESignClient,
  gs as createElement,
  gc as createSchemaActionCachingRefresh,
  Ec as createSelectedFile,
  bo as createStatusBadgeElement,
  Po as createTimeoutController,
  cc as dateTimeCellRenderer,
  En as debounce,
  uc as defaultActionErrorHandler,
  dc as defaultActionSuccessHandler,
  Io as delegate,
  Vt as escapeHtml,
  lc as fileSizeCellRenderer,
  go as formatDate,
  In as formatDateTime,
  ro as formatDriveDate,
  io as formatDriveFileSize,
  yn as formatFileSize,
  po as formatPageCount,
  ho as formatRecipientCount,
  fo as formatRelativeTime,
  fs as formatSizeElements,
  mo as formatTime,
  hs as formatTimestampElements,
  er as getAgreementStatusBadge,
  uo as getESignClient,
  no as getFileIconConfig,
  Sr as getFileTypeName,
  ms as getPageConfig,
  B as hide,
  Qo as initAgreementForm,
  ys as initDetailFormatters,
  nc as initDocumentDetailPreview,
  Ko as initDocumentForm,
  Bo as initGoogleCallback,
  Uo as initGoogleDrivePicker,
  No as initGoogleIntegration,
  Go as initIntegrationConflicts,
  Oo as initIntegrationHealth,
  qo as initIntegrationMappings,
  Yo as initIntegrationSyncRuns,
  Do as initLandingPage,
  Mo as initSignerCompletePage,
  ec as initSignerErrorPage,
  Zo as initSignerReview,
  qt as isFolder,
  Qa as isGoogleDoc,
  fc as isGoogleWorkspaceFile,
  eo as isImportable,
  Za as isPDF,
  xn as normalizeAccountId,
  to as normalizeDriveFile,
  hc as normalizeDriveFiles,
  Ka as normalizeFilterOperators,
  Ja as normalizeFilterOptions,
  Ya as normalizeFilterType,
  xo as on,
  Fe as onReady,
  _o as poll,
  oc as prepareFilterFields,
  ac as prepareGridColumns,
  g as qs,
  Ht as qsa,
  xc as renderBreadcrumb,
  so as renderFileIcon,
  ao as renderFileItem,
  Ic as renderFileList,
  ps as renderStatusBadge,
  vc as resolveAccountId,
  Ao as retry,
  yc as saveAccountId,
  cs as setESignClient,
  Co as setLoading,
  pc as setupRefreshButton,
  Y as show,
  tr as sleep,
  vo as snakeToTitle,
  Sc as syncAccountIdToUrl,
  To as throttle,
  Eo as toggle,
  yo as truncate,
  Zt as updateDataText,
  Lo as updateDataTexts,
  wo as updateStatusBadge,
  ko as withTimeout
};
//# sourceMappingURL=index.js.map

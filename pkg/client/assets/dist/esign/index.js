import { a as Ge } from "../chunks/html-Br-oQr7i.js";
class ns {
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
      throw new is(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class is extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let ii = null;
function io() {
  if (!ii)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return ii;
}
function rs(i) {
  ii = i;
}
function ss(i) {
  const e = new ns(i);
  return rs(e), e;
}
function hn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ro(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Sn(i, e) {
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
function so(i, e) {
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
function ao(i, e) {
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
function oo(i) {
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
function co(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function as(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function lo(i) {
  return i ? i.split("_").map((e) => as(e)).join(" ") : "";
}
function uo(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const os = {
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
function Xi(i) {
  const e = String(i || "").trim().toLowerCase();
  return os[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function cs(i, e) {
  const t = Xi(i), n = e?.showDot ?? !1, r = e?.size ?? "sm", c = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, d = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${c[r]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${d}${t.label}</span>`;
}
function po(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = cs(i, e), t.firstElementChild;
}
function go(i, e, t) {
  const n = Xi(e), r = t?.size ?? "sm", c = {
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
function Ut(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function mo(i) {
  return document.getElementById(i);
}
function ls(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [r, c] of Object.entries(e))
      c !== void 0 && n.setAttribute(r, c);
  if (t)
    for (const r of t)
      typeof r == "string" ? n.appendChild(document.createTextNode(r)) : n.appendChild(r);
  return n;
}
function fo(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function ho(i, e, t, n, r) {
  const c = (d) => {
    const s = d.target.closest(e);
    s && i.contains(s) && n.call(s, d, s);
  };
  return i.addEventListener(t, c, r), () => i.removeEventListener(t, c, r);
}
function Te(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function W(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function $(i) {
  i && i.classList.add("hidden");
}
function vo(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? W(i) : $(i);
}
function yo(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Xt(i, e, t = document) {
  const n = g(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function bo(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Xt(t, n, e);
}
function ds(i = "[data-esign-page]", e = "data-esign-config") {
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
function gt(i, e = "polite") {
  const t = g(`[aria-live="${e}"]`) || (() => {
    const n = ls("div", {
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
async function wo(i) {
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
    await Qi(n, s);
  }
  return {
    result: b,
    attempts: m,
    stopped: !1,
    timedOut: !1
  };
}
async function So(i) {
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
      const P = c ? Math.min(n * Math.pow(2, b - 1), r) : n;
      s && s(S, b, P), await Qi(P, h);
    }
  }
  throw m;
}
function Qi(i, e) {
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
function xn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function xo(i, e) {
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
function Io(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Eo(i, e, t = "Operation timed out") {
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
class di {
  constructor(e) {
    this.config = e, this.client = ss({
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
    Xt('count="draft"', e.draft), Xt('count="pending"', e.pending), Xt('count="completed"', e.completed), Xt('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Co(i) {
  const e = i || ds(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new di(e);
  return Te(() => t.init()), t;
}
function Lo(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new di(t);
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
      new di({ basePath: r, apiBasePath: c }).init();
    }
  }
});
class Zi {
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
      r && (n === e ? W(r) : $(r));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = g("#artifact-executed"), n = g("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), W(t));
    }
    if (e.source) {
      const t = g("#artifact-source"), n = g("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), W(t));
    }
    if (e.certificate) {
      const t = g("#artifact-certificate"), n = g("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), W(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function _o(i) {
  const e = new Zi(i);
  return Te(() => e.init()), e;
}
function Ao(i) {
  const e = new Zi(i);
  Te(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function us(i = document) {
  Ut("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = hn(t));
  });
}
function ps(i = document) {
  Ut("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Sn(t));
  });
}
function gs(i = document) {
  us(i), ps(i);
}
function ms() {
  Te(() => {
    gs();
  });
}
typeof document < "u" && ms();
const ki = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class er {
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
    switch ($(t), $(n), $(r), e) {
      case "loading":
        W(t);
        break;
      case "success":
        W(n);
        break;
      case "error":
        W(r);
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
    r && (r.textContent = ki[e] || ki.unknown), t && c && (c.textContent = t, W(c)), this.sendToOpener({
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
function Po(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new er(e);
  return Te(() => t.init()), t;
}
function To(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new er(e);
  Te(() => t.init());
}
const Gn = "esign.google.account_id", fs = {
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
class tr {
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
      this.pendingDisconnectAccountId = this.currentAccountId, S && W(S);
    }), s && s.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, S && $(S);
    }), h && h.addEventListener("click", () => this.disconnect()), d && d.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), r && r.addEventListener("click", () => this.checkStatus()), m && (m.addEventListener("change", () => {
      this.setCurrentAccountId(m.value, !0);
    }), m.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(m.value, !0));
    }));
    const { accountDropdown: P, connectFirstBtn: E } = this.elements;
    P && P.addEventListener("change", () => {
      P.value === "__new__" ? (P.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(P.value, !0);
    }), E && E.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (b && !b.classList.contains("hidden") && this.cancelOAuthFlow(), S && !S.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, $(S)));
    }), [b, S].forEach((f) => {
      f && f.addEventListener("click", (_) => {
        const x = _.target;
        (x === f || x.getAttribute("aria-hidden") === "true") && ($(f), f === b ? this.cancelOAuthFlow() : f === S && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Gn)
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
      this.currentAccountId ? window.localStorage.setItem(Gn, this.currentAccountId) : window.localStorage.removeItem(Gn);
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
    t && (t.textContent = e), gt(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: r, errorState: c } = this.elements;
    switch ($(t), $(n), $(r), $(c), e) {
      case "loading":
        W(t);
        break;
      case "disconnected":
        W(n);
        break;
      case "connected":
        W(r);
        break;
      case "error":
        W(c);
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
    const t = (_, x) => {
      for (const L of _)
        if (Object.prototype.hasOwnProperty.call(e, L) && e[L] !== void 0 && e[L] !== null)
          return e[L];
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
    let P = t(["is_expired", "IsExpired"], void 0), E = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof P != "boolean" || typeof E != "boolean") && n) {
      const _ = new Date(n);
      if (!Number.isNaN(_.getTime())) {
        const x = _.getTime() - Date.now(), L = 5 * 60 * 1e3;
        P = x <= 0, E = x > 0 && x <= L;
      }
    }
    const f = typeof S == "boolean" ? S : (P === !0 || E === !0) && !b;
    return {
      connected: d,
      account_id: c,
      email: m,
      scopes: Array.isArray(r) ? r : [],
      expires_at: n,
      is_expired: P === !0,
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
        const r = fs[n] || { label: n, description: "" };
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
      d.textContent = "Access token status unknown", s && $(s);
      return;
    }
    const m = new Date(e), b = /* @__PURE__ */ new Date(), S = Math.max(
      1,
      Math.round((m.getTime() - b.getTime()) / (1e3 * 60))
    );
    t ? r ? (d.textContent = "Access token expired, but refresh is available and will be applied automatically.", d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), s && $(s)) : (d.textContent = "Access token has expired. Please re-authorize.", d.classList.remove("text-gray-500"), d.classList.add("text-red-600"), s && W(s), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), r ? (d.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}. Refresh is available automatically.`, s && $(s)) : (d.textContent = `Token expires in approximately ${S} minute${S !== 1 ? "s" : ""}`, s && W(s), h && (h.textContent = `Your access token will expire in ${S} minute${S !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (d.textContent = `Token valid until ${m.toLocaleDateString()} ${m.toLocaleTimeString()}`, s && $(s)), !c && s && $(s);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: r } = this.elements;
    n && (e ? (W(n), r && (r.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : $(n));
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
    if (e && $(e), this.accounts.length === 0) {
      t && W(t), n && $(n);
      return;
    }
    t && $(t), n && (W(n), n.innerHTML = this.accounts.map((r) => this.renderAccountCard(r)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
        this.pendingDisconnectAccountId = s, t && W(t);
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
    t && W(t);
    const r = this.resolveOAuthRedirectURI(), c = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = c;
    const d = this.buildGoogleOAuthUrl(r, c);
    if (!d) {
      t && $(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const s = 500, h = 600, m = (window.screen.width - s) / 2, b = (window.screen.height - h) / 2;
    if (this.oauthWindow = window.open(
      d,
      "google_oauth",
      `width=${s},height=${h},left=${m},top=${b},popup=yes`
    ), !this.oauthWindow) {
      t && $(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (S) => this.handleOAuthCallback(S), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && $(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    if (this.cleanupOAuthFlow(), n && $(n), this.closeOAuthWindow(), t.error) {
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
    e && $(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && $(e);
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
function ko(i) {
  const e = new tr(i);
  return Te(() => e.init()), e;
}
function Do(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new tr(e);
  Te(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Wn = "esign.google.account_id", Di = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Ri = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class nr {
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
      viewGridBtn: P
    } = this.elements;
    if (e) {
      const f = xn(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (_) => {
        _.key === "Enter" && (_.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), r && r.addEventListener("click", () => this.loadMore()), c && c.addEventListener("click", () => this.showImportModal()), d && d.addEventListener("click", () => this.clearSelection()), s && s.addEventListener("click", () => this.hideImportModal()), h && m && m.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), b && b.addEventListener("click", (f) => {
      const _ = f.target;
      (_ === b || _.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), S && S.addEventListener("click", () => this.setViewMode("list")), P && P.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
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
        window.localStorage.getItem(Wn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, W(e)) : $(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Wn, this.currentAccountId) : window.localStorage.removeItem(Wn);
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && W(t));
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
      e ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.nextPageToken = s.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), gt(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (r) {
      console.error("Error loading files:", r), this.renderError(r instanceof Error ? r.message : "Failed to load files"), gt("Error loading files");
    } finally {
      this.isLoading = !1, t && $(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && $(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Ri.includes(e.mimeType), r = this.selectedFile?.id === e.id, c = Di[e.mimeType] || Di.default, d = this.getFileIcon(c);
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
            ${Sn(e.modifiedTime)}
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), gt(`Selected: ${t.name}`));
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
      e && W(e), t && $(t);
      return;
    }
    e && $(e), t && W(t);
    const S = this.selectedFile, P = Ri.includes(S.mimeType);
    r && (r.textContent = S.name), c && (c.textContent = this.getMimeTypeLabel(S.mimeType)), d && (d.textContent = S.id), s && S.owners.length > 0 && (s.textContent = S.owners[0].emailAddress || "-"), h && (h.textContent = Sn(S.modifiedTime)), m && (P ? (m.removeAttribute("disabled"), m.classList.remove("opacity-50", "cursor-not-allowed")) : (m.setAttribute("disabled", "true"), m.classList.add("opacity-50", "cursor-not-allowed"))), b && S.webViewLink && (b.href = S.webViewLink);
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
      $(e), t && (t.textContent = "Search Results");
      return;
    }
    W(e);
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
    ).join(""), Ut(".breadcrumb-item", r).forEach((c) => {
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
    e && (this.nextPageToken ? W(e) : $(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? W(t) : $(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && $(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    r && (r.value = ""), e && W(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && $(e);
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
    e && e.setAttribute("disabled", "true"), t && W(t), n && (n.textContent = "Importing...");
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
      this.showToast("Import started successfully", "success"), gt("Import started"), this.hideImportModal(), b.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${b.document.id}` : b.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${b.agreement.id}`);
    } catch (m) {
      console.error("Import error:", m);
      const b = m instanceof Error ? m.message : "Import failed";
      this.showToast(b, "error"), gt(`Error: ${b}`);
    } finally {
      e && e.removeAttribute("disabled"), t && $(t), n && (n.textContent = "Import");
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
function Ro(i) {
  const e = new nr(i);
  return Te(() => e.init()), e;
}
function Mo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new nr(e);
  Te(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class ir {
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
      this.renderHealthData(), gt("Health data refreshed");
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
    const P = t.labels, E = Object.values(t.datasets), f = b / P.length / (E.length + 1), _ = Math.max(...E.flat()) || 1;
    P.forEach((x, L) => {
      const j = m + L * b / P.length + f / 2;
      E.forEach((G, U) => {
        const k = G[L] / _ * S, D = j + U * f, X = h - m - k;
        d.fillStyle = n[U] || "#6b7280", d.fillRect(D, X, f - 2, k);
      }), L % Math.ceil(P.length / 6) === 0 && (d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "center", d.fillText(x, j + E.length * f / 2, h - m + 15));
    }), d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "right";
    for (let x = 0; x <= 4; x++) {
      const L = h - m - x * S / 4, j = Math.round(_ * x / 4);
      d.fillText(j.toString(), m - 5, L + 3);
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
function $o(i) {
  const e = new ir(i);
  return Te(() => e.init()), e;
}
function Fo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new ir(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class rr {
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
      publishConfirmBtn: P,
      deleteCancelBtn: E,
      deleteConfirmBtn: f,
      closePreviewBtn: _,
      loadSampleBtn: x,
      runPreviewBtn: L,
      clearPreviewBtn: j,
      previewSourceInput: G,
      searchInput: U,
      filterStatus: k,
      filterProvider: D,
      mappingModal: X,
      publishModal: he,
      deleteModal: ce,
      previewModal: pe
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.closeModal()), c?.addEventListener("click", () => this.loadMappings()), d?.addEventListener("click", () => this.loadMappings()), s?.addEventListener("click", () => this.addSchemaField()), h?.addEventListener("click", () => this.addMappingRule()), m?.addEventListener("click", () => this.validateMapping()), b?.addEventListener("submit", (ye) => {
      ye.preventDefault(), this.saveMapping();
    }), S?.addEventListener("click", () => this.closePublishModal()), P?.addEventListener("click", () => this.publishMapping()), E?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), _?.addEventListener("click", () => this.closePreviewModal()), x?.addEventListener("click", () => this.loadSamplePayload()), L?.addEventListener("click", () => this.runPreviewTransform()), j?.addEventListener("click", () => this.clearPreview()), G?.addEventListener("input", xn(() => this.validateSourceJson(), 300)), U?.addEventListener("input", xn(() => this.renderMappings(), 300)), k?.addEventListener("change", () => this.renderMappings()), D?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ye) => {
      ye.key === "Escape" && (X && !X.classList.contains("hidden") && this.closeModal(), he && !he.classList.contains("hidden") && this.closePublishModal(), ce && !ce.classList.contains("hidden") && this.closeDeleteModal(), pe && !pe.classList.contains("hidden") && this.closePreviewModal());
    }), [X, he, ce, pe].forEach((ye) => {
      ye?.addEventListener("click", (ge) => {
        const oe = ge.target;
        (oe === ye || oe.getAttribute("aria-hidden") === "true") && (ye === X ? this.closeModal() : ye === he ? this.closePublishModal() : ye === ce ? this.closeDeleteModal() : ye === pe && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), gt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: r, mappingsList: c } = this.elements;
    switch ($(t), $(n), $(r), $(c), e) {
      case "loading":
        W(t);
        break;
      case "empty":
        W(n);
        break;
      case "error":
        W(r);
        break;
      case "list":
        W(c);
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
    const P = e.external_schema || { object_type: "", fields: [] };
    d && (d.value = P.object_type || ""), s && (s.value = P.version || ""), h && (h.innerHTML = "", (P.fields || []).forEach((E) => h.appendChild(this.createSchemaFieldRow(E)))), m && (m.innerHTML = "", (e.rules || []).forEach((E) => m.appendChild(this.createMappingRuleRow(E)))), e.status && b ? (b.innerHTML = this.getStatusBadge(e.status), b.classList.remove("hidden")) : b && b.classList.add("hidden"), $(S);
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
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), r && (r.innerHTML = ""), c && (c.innerHTML = ""), d && d.classList.add("hidden"), $(s), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), W(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: r, mappingNameInput: c } = this.elements;
    this.editingMappingId = e, r && (r.textContent = "Edit Mapping Specification"), this.populateForm(t), W(n), c?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    $(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: r, publishMappingVersion: c } = this.elements;
    this.pendingPublishId = e, r && (r.textContent = t.name), c && (c.textContent = `v${t.version || 1}`), W(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    $(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, W(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    $(this.elements.deleteModal), this.pendingDeleteId = null;
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
      W(t);
    } catch (r) {
      console.error("Validation error:", r), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(r instanceof Error ? r.message : "Unknown error")}</div>`, W(t));
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
    this.currentPreviewMapping = t, r && (r.textContent = t.name), c && (c.textContent = t.provider), d && (d.textContent = t.external_schema?.object_type || "-"), s && (s.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), h && (h.value = ""), $(m), W(n), h?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    $(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: r, previewSuccess: c } = this.elements;
    switch ($(t), $(n), $(r), $(c), e) {
      case "empty":
        W(t);
        break;
      case "loading":
        W(n);
        break;
      case "error":
        W(r);
        break;
      case "success":
        W(c);
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
    }), d[r] = s, e && (e.value = JSON.stringify(d, null, 2)), $(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return $(t), null;
    try {
      const r = JSON.parse(n);
      return $(t), r;
    } catch (r) {
      return t && (t.textContent = `JSON Syntax Error: ${r instanceof Error ? r.message : "Invalid JSON"}`, W(t)), null;
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
    const S = e.agreement || {}, P = Object.entries(S);
    d && (P.length === 0 ? d.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : d.innerHTML = P.map(
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
    e && (e.value = ""), $(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function Bo(i) {
  const e = new rr(i);
  return Te(() => e.init()), e;
}
function No(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new rr(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class sr {
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
      resolveModal: P
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), r?.addEventListener("change", () => this.loadConflicts()), c?.addEventListener("change", () => this.renderConflicts()), d?.addEventListener("change", () => this.renderConflicts()), s?.addEventListener("click", () => this.openResolveModal("resolved")), h?.addEventListener("click", () => this.openResolveModal("ignored")), m?.addEventListener("click", () => this.closeResolveModal()), b?.addEventListener("submit", (E) => this.submitResolution(E)), document.addEventListener("keydown", (E) => {
      E.key === "Escape" && (P && !P.classList.contains("hidden") ? this.closeResolveModal() : S && !S.classList.contains("hidden") && this.closeConflictDetail());
    }), [S, P].forEach((E) => {
      E?.addEventListener("click", (f) => {
        const _ = f.target;
        (_ === E || _.getAttribute("aria-hidden") === "true") && (E === S ? this.closeConflictDetail() : E === P && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), gt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: r, conflictsList: c } = this.elements;
    switch ($(t), $(n), $(r), $(c), e) {
      case "loading":
        W(t);
        break;
      case "empty":
        W(n);
        break;
      case "error":
        W(r);
        break;
      case "list":
        W(c);
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
    const t = this.conflicts.find((k) => k.id === e);
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
      detailRunId: P,
      detailCreatedAt: E,
      detailVersion: f,
      detailPayload: _,
      resolutionSection: x,
      actionButtons: L,
      detailResolvedAt: j,
      detailResolvedBy: G,
      detailResolution: U
    } = this.elements;
    if (r && (r.textContent = t.reason || "Data conflict"), c && (c.textContent = t.entity_kind || "-"), d && (d.innerHTML = this.getStatusBadge(t.status)), s && (s.textContent = t.provider || "-"), h && (h.textContent = t.external_id || "-"), m && (m.textContent = t.internal_id || "-"), b && (b.textContent = t.binding_id || "-"), S && (S.textContent = t.id), P && (P.textContent = t.run_id || "-"), E && (E.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), _)
      try {
        const k = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        _.textContent = JSON.stringify(k, null, 2);
      } catch {
        _.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (W(x), $(L), j && (j.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), G && (G.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), U)
        try {
          const k = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          U.textContent = JSON.stringify(k, null, 2);
        } catch {
          U.textContent = t.resolution_json || "{}";
        }
    } else
      $(x), W(L);
    W(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    $(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: r } = this.elements;
    n?.reset(), r && (r.value = e), W(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    $(this.elements.resolveModal);
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
function Uo(i) {
  const e = new sr(i);
  return Te(() => e.init()), e;
}
function Ho(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new sr(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class ar {
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
      actionRetryBtn: P,
      actionCompleteBtn: E,
      actionFailBtn: f,
      actionDiagnosticsBtn: _,
      startSyncModal: x,
      runDetailModal: L
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (j) => this.startSync(j)), c?.addEventListener("click", () => this.loadSyncRuns()), d?.addEventListener("click", () => this.loadSyncRuns()), s?.addEventListener("click", () => this.closeRunDetail()), h?.addEventListener("change", () => this.renderTimeline()), m?.addEventListener("change", () => this.renderTimeline()), b?.addEventListener("change", () => this.renderTimeline()), S?.addEventListener("click", () => this.runAction("resume")), P?.addEventListener("click", () => this.runAction("resume")), E?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), _?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (j) => {
      j.key === "Escape" && (x && !x.classList.contains("hidden") && this.closeStartSyncModal(), L && !L.classList.contains("hidden") && this.closeRunDetail());
    }), [x, L].forEach((j) => {
      j?.addEventListener("click", (G) => {
        const U = G.target;
        (U === j || U.getAttribute("aria-hidden") === "true") && (j === x ? this.closeStartSyncModal() : j === L && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), gt(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: r, runsTimeline: c } = this.elements;
    switch ($(t), $(n), $(r), $(c), e) {
      case "loading":
        W(t);
        break;
      case "empty":
        W(n);
        break;
      case "error":
        W(r);
        break;
      case "list":
        W(c);
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
    t?.reset(), W(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    $(this.elements.startSyncModal);
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
    const t = this.syncRuns.find((G) => G.id === e);
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
      detailErrorSection: P,
      detailLastError: E,
      detailCheckpoints: f,
      actionResumeBtn: _,
      actionRetryBtn: x,
      actionCompleteBtn: L,
      actionFailBtn: j
    } = this.elements;
    r && (r.textContent = t.id), c && (c.textContent = t.provider), d && (d.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), s && (s.innerHTML = this.getStatusBadge(t.status)), h && (h.textContent = this.formatDate(t.started_at)), m && (m.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), b && (b.textContent = t.cursor || "-"), S && (S.textContent = String(t.attempt_count || 1)), t.last_error ? (E && (E.textContent = t.last_error), W(P)) : $(P), _ && _.classList.toggle("hidden", t.status !== "running"), x && x.classList.toggle("hidden", t.status !== "failed"), L && L.classList.toggle("hidden", t.status !== "running"), j && j.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), W(n);
    try {
      const G = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (G.ok) {
        const U = await G.json();
        this.renderCheckpoints(U.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (G) {
      console.error("Error loading checkpoints:", G), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    $(this.elements.runDetailModal), this.currentRunId = null;
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
function zo(i) {
  const e = new ar(i);
  return Te(() => e.init()), e;
}
function Oo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ar(e);
  Te(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const Yn = "esign.google.account_id", hs = 25 * 1024 * 1024, vs = 2e3, Mi = 60, ri = "application/vnd.google-apps.document", si = "application/pdf", $i = "application/vnd.google-apps.folder", ys = [ri, si];
class ui {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || hs, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: Ut(".source-tab"),
      sourcePanels: Ut(".source-panel"),
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
      const m = xn(() => this.handleSearch(), 300);
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
        window.localStorage.getItem(Yn)
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
      r && (r.value = ""), c && $(c), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      this.currentAccountId ? window.localStorage.setItem(Yn, this.currentAccountId) : window.localStorage.removeItem(Yn);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, W(e)) : $(e)), t) {
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
      n.id.replace("panel-", "") === e ? W(n) : $(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), gt(
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
      `File is too large (${hn(e.size)}). Maximum size is ${hn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: r, fileSize: c, uploadZone: d } = this.elements;
    r && (r.textContent = e.name), c && (c.textContent = hn(e.size)), t && $(t), n && W(n), d && (d.classList.remove("border-gray-300"), d.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && W(e), t && $(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, W(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", $(e));
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
    return e.mimeType === ri;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === si;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === $i;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return ys.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === ri ? "Google Document" : t === si ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === $i ? "Folder" : "File";
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
      const { resultCount: S, listTitle: P } = this.elements;
      n && S ? (S.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, P && (P.textContent = "Search Results")) : (S && (S.textContent = ""), P && (P.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: E } = this.elements;
      E && (this.nextPageToken ? W(E) : $(E)), gt(`Loaded ${b.length} files`);
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
        `), gt(`Error: ${s instanceof Error ? s.message : "Unknown error"}`);
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
              ${r.modifiedTime ? " • " + Sn(r.modifiedTime) : ""}
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
    t && (t.value = ""), n && $(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      $(e);
      return;
    }
    W(e);
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
      const L = parseInt(x.dataset.fileIndex || "0", 10);
      this.currentFiles[L].id === e.id ? (x.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), x.setAttribute("aria-selected", "true")) : (x.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), x.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: c,
      filePreview: d,
      importStatus: s,
      previewIcon: h,
      previewTitle: m,
      previewType: b,
      importTypeInfo: S,
      importTypeLabel: P,
      importTypeDesc: E,
      snapshotWarning: f,
      importDocumentTitle: _
    } = this.elements;
    c && $(c), d && W(d), s && $(s), h && (h.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, h.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), m && (m.textContent = e.name || "Untitled"), b && (b.textContent = this.getFileTypeName(e.mimeType)), n && S && (S.className = `p-3 rounded-lg border ${n.bgClass}`, P && (P.textContent = n.label, P.className = `text-xs font-medium ${n.textClass}`), E && (E.textContent = n.desc, E.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? W(f) : $(f))), _ && (_.value = e.name || ""), gt(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: r } = this.elements;
    e && W(e), t && $(t), n && $(n), r && r.querySelectorAll(".file-item").forEach((c) => {
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
      t && W(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && $(t), this.searchQuery = "";
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: r.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && $(t), this.searchQuery = "";
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
    switch (t && $(t), n && $(n), r && W(r), c && $(c), d && $(d), s && $(s), e) {
      case "queued":
      case "running":
        c && W(c);
        break;
      case "succeeded":
        d && W(d);
        break;
      case "failed":
        s && W(s);
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
        r.href = this.applyAccountIdToPath(c), W(r);
      } else
        $(r);
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
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), r && $(r), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), vs);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Mi) {
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
            this.showImportStatus("succeeded"), gt("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const c = n.error?.code || "", d = n.error?.message || "Import failed";
            this.showImportError(d, c), gt("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Mi ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function jo(i) {
  const e = new ui(i);
  return Te(() => e.init()), e;
}
function qo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new ui(e);
  Te(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function bs(i) {
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
typeof document < "u" && Te(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = bs(t);
        n && new ui(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const ut = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, pn = ut.REVIEW, ws = {
  [ut.DOCUMENT]: "Details",
  [ut.DETAILS]: "Participants",
  [ut.PARTICIPANTS]: "Fields",
  [ut.FIELDS]: "Placement",
  [ut.PLACEMENT]: "Review"
}, vt = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, In = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
};
ut.DOCUMENT, ut.DETAILS, ut.PARTICIPANTS, ut.FIELDS, ut.REVIEW;
const ai = /* @__PURE__ */ new Map(), Ss = 30 * 60 * 1e3, Fi = {
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
function xs(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function Is(i) {
  const e = i instanceof Error ? i.message : i, t = xs(e);
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
  if (t && Fi[t]) {
    const n = Fi[t];
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
function Es() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function Cs() {
  if (!Es())
    throw new Error("PDF preview library unavailable");
}
function Ls(i) {
  const e = ai.get(i);
  return e ? Date.now() - e.timestamp > Ss ? (ai.delete(i), null) : e : null;
}
function _s(i, e, t) {
  ai.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function As(i, e = In.THUMBNAIL_MAX_WIDTH, t = In.THUMBNAIL_MAX_HEIGHT) {
  await Cs();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const c = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, d = c.numPages, s = await c.getPage(1), h = s.getViewport({ scale: 1 }), m = e / h.width, b = t / h.height, S = Math.min(m, b, 1), P = s.getViewport({ scale: S }), E = document.createElement("canvas");
  E.width = P.width, E.height = P.height;
  const f = E.getContext("2d");
  if (!f)
    throw new Error("Failed to get canvas context");
  return await s.render({
    canvasContext: f,
    viewport: P
  }).promise, { dataUrl: E.toDataURL("image/jpeg", 0.8), pageCount: d };
}
class Ps {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || In.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || In.THUMBNAIL_MAX_HEIGHT
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
    const t = e === ut.DOCUMENT || e === ut.DETAILS || e === ut.PARTICIPANTS || e === ut.FIELDS || e === ut.REVIEW;
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
    const c = Ls(e);
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
      const { dataUrl: s, pageCount: h } = await As(
        d,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (r !== this.requestVersion)
        return;
      _s(e, s, h), this.state = {
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
      const s = d instanceof Error ? d.message : "Failed to load preview", h = Is(s);
      Bi() && console.error("Failed to load document preview:", d), this.state = {
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
        d?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Bi() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function Ts(i = {}) {
  const e = new Ps(i);
  return e.init(), e;
}
function ks(i = {}) {
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
function Ds(i) {
  const { context: e, hooks: t = {} } = i;
  return ks({
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
function ft(i, e) {
  return i instanceof Document ? i.getElementById(e) : i.querySelector(`#${e}`);
}
function Yt(i, e, t) {
  const n = ft(i, e);
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return n;
}
function Rs(i = document) {
  return {
    marker: ft(i, "esign-page-config"),
    form: {
      root: Yt(i, "agreement-form", "form"),
      submitBtn: Yt(i, "submit-btn", "submit button"),
      wizardSaveBtn: ft(i, "wizard-save-btn"),
      announcements: ft(i, "form-announcements"),
      documentIdInput: Yt(i, "document_id", "document selector"),
      documentPageCountInput: ft(i, "document_page_count"),
      titleInput: Yt(i, "title", "title input"),
      messageInput: Yt(i, "message", "message input")
    },
    coordination: {
      banner: ft(i, "active-tab-banner"),
      message: ft(i, "active-tab-message")
    },
    sync: {
      indicator: ft(i, "sync-status-indicator"),
      icon: ft(i, "sync-status-icon"),
      text: ft(i, "sync-status-text"),
      retryBtn: ft(i, "sync-retry-btn")
    },
    conflict: {
      modal: ft(i, "conflict-dialog-modal"),
      localTime: ft(i, "conflict-local-time"),
      serverRevision: ft(i, "conflict-server-revision"),
      serverTime: ft(i, "conflict-server-time")
    }
  };
}
function Ms(i, e) {
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
class $s {
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
    const b = String(e.wizardId ?? "").trim();
    n.wizardId = b || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, m), n.resourceRef = this.normalizeResourceRef(e.resourceRef ?? e.resource_ref);
    const S = String(e.serverDraftId ?? "").trim();
    return n.serverDraftId = S || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
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
const Jn = /* @__PURE__ */ new Map();
async function Fs(i) {
  const e = String(i || "").trim().replace(/\/+$/, "");
  if (e === "")
    throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? oi(window.__esignSyncCoreModule) : (Jn.has(e) || Jn.set(e, Bs(e)), Jn.get(e));
}
async function Bs(i) {
  if (typeof window < "u" && typeof window.__esignSyncCoreLoader == "function")
    return oi(await window.__esignSyncCoreLoader(i));
  const t = await import(`${i}/index.js`);
  return oi(t);
}
function oi(i) {
  if (!i || typeof i.createInMemoryCache != "function" || typeof i.createFetchSyncTransport != "function" || typeof i.createSyncEngine != "function" || typeof i.parseReadEnvelope != "function")
    throw new TypeError("Invalid sync-core runtime module");
  return i;
}
class Ns {
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
    return this.syncModule ? this.syncModule : (this.syncModulePromise || (this.syncModulePromise = Fs(this.syncConfig.client_base_path)), this.syncModule = await this.syncModulePromise, this.cache || (this.cache = this.syncModule.createInMemoryCache()), this.transport || (this.transport = this.syncModule.createFetchSyncTransport({
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
class Us {
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
const or = "[esign-send]";
function Rt(i) {
  const e = String(i ?? "").trim();
  return e === "" ? null : e;
}
function Ni(i) {
  const e = Number(i);
  return Number.isFinite(e) ? e : null;
}
function Hs() {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function tt(i = {}) {
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
    serverRevision: Ni(e?.serverRevision),
    currentStep: Ni(e?.currentStep),
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
function xt(i, e = {}) {
  console.info(or, i, e);
}
function _t(i, e = {}) {
  console.warn(or, i, e);
}
class zs {
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
    this.isSyncing = !0, this.options.statusUpdater("saving"), xt("sync_perform_start", tt({
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
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), _t("sync_perform_conflict", tt({
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
function Os() {
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
function It(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function gn(i, e, t = "") {
  const n = i.querySelector(e);
  return (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && n.value || t;
}
function js(i, e, t = !1) {
  const n = i.querySelector(e);
  return n instanceof HTMLInputElement ? n.checked : t;
}
function Kn(i, e) {
  i instanceof HTMLButtonElement && (i.disabled = e);
}
function qs(i) {
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
    goToStep: P
  } = i;
  function E() {
    const f = It("send-readiness-loading"), _ = It("send-readiness-results"), x = It("send-validation-status"), L = It("send-validation-issues"), j = It("send-issues-list"), G = It("send-confirmation"), U = It("review-agreement-title"), k = It("review-document-title"), D = It("review-participant-count"), X = It("review-stage-count"), he = It("review-participants-list"), ce = It("review-fields-summary"), pe = document.getElementById("title");
    if (!f || !_ || !x || !L || !j || !G || !U || !k || !D || !X || !he || !ce || !(pe instanceof HTMLInputElement))
      return;
    const ye = pe.value || "Untitled", ge = t?.textContent || "No document", oe = n.querySelectorAll(".participant-entry"), be = r.querySelectorAll(".field-definition-entry"), De = b(m(), h()), Me = s(), we = /* @__PURE__ */ new Set();
    oe.forEach((ve) => {
      const z = ve.querySelector(".signing-stage-input"), Ie = ve.querySelector('select[name*=".role"]');
      Ie instanceof HTMLSelectElement && Ie.value === "signer" && z instanceof HTMLInputElement && z.value && we.add(Number.parseInt(z.value, 10));
    }), U.textContent = ye, k.textContent = ge, D.textContent = `${oe.length} (${Me.length} signers)`, X.textContent = String(we.size > 0 ? we.size : 1), he.innerHTML = "", oe.forEach((ve) => {
      const z = gn(ve, 'input[name*=".name"]'), Ie = gn(ve, 'input[name*=".email"]'), Fe = gn(ve, 'select[name*=".role"]', "signer"), Xe = gn(ve, ".signing-stage-input"), Qe = js(ve, ".notify-input", !0), it = document.createElement("div");
      it.className = "flex items-center justify-between text-sm", it.innerHTML = `
        <div>
          <span class="font-medium">${d(z || Ie)}</span>
          <span class="text-gray-500 ml-2">${d(Ie)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Fe === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Fe === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${Qe ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${Qe ? "Notify" : "No Notify"}
          </span>
          ${Fe === "signer" && Xe ? `<span class="text-xs text-gray-500">Stage ${Xe}</span>` : ""}
        </div>
      `, he.appendChild(it);
    });
    const Ue = be.length + De.length;
    ce.textContent = `${Ue} field${Ue !== 1 ? "s" : ""} defined (${be.length} manual, ${De.length} generated)`;
    const $e = [];
    e?.value || $e.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), Me.length === 0 && $e.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), S().forEach((ve) => {
      $e.push({
        severity: "error",
        message: `${ve.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const at = Array.from(we).sort((ve, z) => ve - z);
    for (let ve = 0; ve < at.length; ve++)
      if (at[ve] !== ve + 1) {
        $e.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const He = $e.some((ve) => ve.severity === "error"), We = $e.some((ve) => ve.severity === "warning");
    He ? (x.className = "p-4 rounded-lg bg-red-50 border border-red-200", x.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, G.classList.add("hidden"), Kn(c, !0)) : We ? (x.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", x.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, G.classList.remove("hidden"), Kn(c, !1)) : (x.className = "p-4 rounded-lg bg-green-50 border border-green-200", x.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, G.classList.remove("hidden"), Kn(c, !1)), $e.length > 0 ? (L.classList.remove("hidden"), j.innerHTML = "", $e.forEach((ve) => {
      const z = document.createElement("li");
      z.className = `p-3 rounded-lg flex items-center justify-between ${ve.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, z.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${ve.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${ve.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${d(ve.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${ve.step}">
            ${d(ve.action)}
          </button>
        `, j.appendChild(z);
    }), j.querySelectorAll("[data-go-to-step]").forEach((ve) => {
      ve.addEventListener("click", () => {
        const z = Number(ve.getAttribute("data-go-to-step"));
        Number.isFinite(z) && P(z);
      });
    })) : L.classList.add("hidden"), f.classList.add("hidden"), _.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: E
  };
}
function Ui(i, e = 0) {
  const t = Number.parseInt(String(i || "").trim(), 10);
  return Number.isFinite(t) ? t : e;
}
function Vs(i) {
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
  let P = S;
  const E = Array.from(document.querySelectorAll(".wizard-step-btn")), f = Array.from(document.querySelectorAll(".wizard-step")), _ = Array.from(document.querySelectorAll(".wizard-connector")), x = document.getElementById("wizard-prev-btn"), L = document.getElementById("wizard-next-btn"), j = document.getElementById("wizard-save-btn");
  function G() {
    if (E.forEach((D, X) => {
      const he = X + 1, ce = D.querySelector(".wizard-step-number");
      ce instanceof HTMLElement && (he < P ? (D.classList.remove("text-gray-500", "text-blue-600"), D.classList.add("text-green-600"), ce.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), ce.classList.add("bg-green-600", "text-white"), D.removeAttribute("aria-current")) : he === P ? (D.classList.remove("text-gray-500", "text-green-600"), D.classList.add("text-blue-600"), ce.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), ce.classList.add("bg-blue-600", "text-white"), D.setAttribute("aria-current", "step")) : (D.classList.remove("text-blue-600", "text-green-600"), D.classList.add("text-gray-500"), ce.classList.remove("bg-blue-600", "text-white", "bg-green-600"), ce.classList.add("bg-gray-300", "text-gray-600"), D.removeAttribute("aria-current")));
    }), _.forEach((D, X) => {
      X < P - 1 ? (D.classList.remove("bg-gray-300"), D.classList.add("bg-green-600")) : (D.classList.remove("bg-green-600"), D.classList.add("bg-gray-300"));
    }), f.forEach((D) => {
      Ui(D.dataset.step) === P ? D.classList.remove("hidden") : D.classList.add("hidden");
    }), x?.classList.toggle("hidden", P === 1), L?.classList.toggle("hidden", P === e), j?.classList.toggle("hidden", P !== e), r.classList.toggle("hidden", P !== e), d(), P < e) {
      const D = n[P] || "Next";
      L && (L.innerHTML = `
        ${D}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    P === t.PLACEMENT ? h?.() : P === t.REVIEW && m?.(), c.updateVisibility(P);
  }
  function U(D) {
    if (!(D < t.DOCUMENT || D > e)) {
      if (D > P) {
        for (let X = P; X < D; X++)
          if (!s(X)) return;
      }
      P = D, G(), b?.(D), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function k() {
    E.forEach((D) => {
      D.addEventListener("click", () => {
        const X = Ui(D.dataset.step);
        U(X);
      });
    }), x?.addEventListener("click", () => U(P - 1)), L?.addEventListener("click", () => U(P + 1)), j?.addEventListener("click", () => {
      const D = document.getElementById("agreement-form");
      if (!(D instanceof HTMLFormElement)) return;
      const X = document.createElement("input");
      if (X.type = "hidden", X.name = "save_as_draft", X.value = "1", D.appendChild(X), typeof D.requestSubmit == "function") {
        D.requestSubmit();
        return;
      }
      D.submit();
    });
  }
  return {
    bindEvents: k,
    getCurrentStep() {
      return P;
    },
    setCurrentStep(D) {
      P = D;
    },
    goToStep: U,
    updateWizardUI: G
  };
}
function Hi(i) {
  return i.querySelector('select[name*=".role"]');
}
function Gs(i) {
  return i.querySelector(".field-participant-select");
}
function vn(i) {
  return typeof i == "object" && i !== null;
}
function Ws(i, e, t = {}) {
  const n = new Error(e);
  return n.code = String(i).trim(), Number(t.status || 0) > 0 && (n.status = Number(t.status || 0)), Number(t.currentRevision || 0) > 0 && (n.currentRevision = Number(t.currentRevision || 0)), Number(t.conflict?.currentRevision || 0) > 0 && (n.conflict = {
    currentRevision: Number(t.conflict?.currentRevision || 0)
  }), n;
}
function Ys(i, e = 0) {
  if (!vn(i))
    return Number(e || 0);
  const t = i, n = Number(t.currentRevision || 0);
  if (n > 0)
    return n;
  const r = Number(t.conflict?.currentRevision || 0);
  return r > 0 ? r : Number(e || 0);
}
function Js(i) {
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
    fieldRulesJSONInput: P,
    storageKey: E,
    syncService: f,
    syncOrchestrator: _,
    stateManager: x,
    submitMode: L,
    totalWizardSteps: j,
    wizardStep: G,
    getCurrentStep: U,
    getPlacementState: k,
    getCurrentDocumentPageCount: D,
    ensureSelectedDocumentCompatibility: X,
    collectFieldRulesForState: he,
    collectFieldRulesForForm: ce,
    expandRulesForPreview: pe,
    findSignersMissingRequiredSignatureField: ye,
    missingSignatureFieldMessage: ge,
    getSignerParticipants: oe,
    buildCanonicalAgreementPayload: be,
    announceError: De,
    emitWizardTelemetry: Me,
    parseAPIError: we,
    goToStep: Ue,
    showSyncConflictDialog: $e,
    surfaceSyncOutcome: dt,
    updateSyncStatus: at,
    activeTabOwnershipRequiredCode: He = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: We,
    addFieldBtn: ve
  } = i;
  let z = null;
  function Ie() {
    return We?.() || {};
  }
  function Fe(Se, Le = !1) {
    n.setAttribute("aria-busy", Le ? "true" : "false"), n.innerHTML = Le ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${Se}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${Se}
        `;
  }
  async function Xe() {
    xt("persist_latest_wizard_state_start", tt({
      state: x.getState(),
      storageKey: E,
      ownership: Ie(),
      sendAttemptId: z
    })), x.updateState(x.collectFormState());
    const Se = await _.forceSync();
    if (Se?.blocked && Se.reason === "passive_tab")
      throw _t("persist_latest_wizard_state_blocked", tt({
        state: x.getState(),
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          reason: Se.reason
        }
      })), {
        code: He,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const Le = x.getState();
    if (Le?.syncPending)
      throw _t("persist_latest_wizard_state_unsynced", tt({
        state: Le,
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z
      })), new Error("Unable to sync latest draft changes");
    return xt("persist_latest_wizard_state_complete", tt({
      state: Le,
      storageKey: E,
      ownership: Ie(),
      sendAttemptId: z
    })), Le;
  }
  async function Qe() {
    xt("ensure_draft_ready_for_send_start", tt({
      state: x.getState(),
      storageKey: E,
      ownership: Ie(),
      sendAttemptId: z
    }));
    const Se = await Xe(), Le = String(Se?.serverDraftId || "").trim();
    if (!Le) {
      _t("ensure_draft_ready_for_send_missing_draft", tt({
        state: Se,
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          action: "create_draft"
        }
      }));
      const Re = await f.create(Se), Ze = String(Re.id || "").trim(), A = Number(Re.revision || 0);
      return Ze && A > 0 && x.markSynced(Ze, A), xt("ensure_draft_ready_for_send_created", tt({
        state: x.getState(),
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          loadedDraftId: Ze,
          loadedRevision: A
        }
      })), {
        draftID: Ze,
        revision: A
      };
    }
    try {
      xt("ensure_draft_ready_for_send_loading", tt({
        state: Se,
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          targetDraftId: Le
        }
      }));
      const Re = await f.load(Le), Ze = String(Re?.id || Le).trim(), A = Number(Re?.revision || Se?.serverRevision || 0);
      return Ze && A > 0 && x.markSynced(Ze, A), xt("ensure_draft_ready_for_send_loaded", tt({
        state: x.getState(),
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          loadedDraftId: Ze,
          loadedRevision: A
        }
      })), {
        draftID: Ze,
        revision: A > 0 ? A : Number(Se?.serverRevision || 0)
      };
    } catch (Re) {
      throw Number(vn(Re) && Re.status || 0) !== 404 ? (_t("ensure_draft_ready_for_send_load_failed", tt({
        state: Se,
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          targetDraftId: Le,
          status: Number(vn(Re) && Re.status || 0)
        }
      })), Re) : (_t("ensure_draft_ready_for_send_missing_remote_draft", tt({
        state: Se,
        storageKey: E,
        ownership: Ie(),
        sendAttemptId: z,
        extra: {
          targetDraftId: Le,
          status: 404
        }
      })), Me("wizard_send_not_found", {
        draft_id: Le,
        status: 404,
        phase: "pre_send"
      }), await it().catch(() => {
      }), Ws(
        "DRAFT_SEND_NOT_FOUND",
        "Draft not found",
        { status: 404 }
      ));
    }
  }
  async function it() {
    const Se = x.getState();
    x.setState({
      ...Se,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await _.forceSync();
  }
  function ht() {
    t.addEventListener("submit", function(Se) {
      if (be(), !r.value) {
        Se.preventDefault(), De("Please select a document"), c.focus();
        return;
      }
      if (!X()) {
        Se.preventDefault();
        return;
      }
      const Le = d.querySelectorAll(".participant-entry");
      if (Le.length === 0) {
        Se.preventDefault(), De("Please add at least one participant"), s.focus();
        return;
      }
      let Re = !1;
      if (Le.forEach((Y) => {
        Hi(Y)?.value === "signer" && (Re = !0);
      }), !Re) {
        Se.preventDefault(), De("At least one signer is required");
        const Y = Le[0] ? Hi(Le[0]) : null;
        Y && Y.focus();
        return;
      }
      const Ze = h.querySelectorAll(".field-definition-entry"), A = ye();
      if (A.length > 0) {
        Se.preventDefault(), De(ge(A)), Ue(G.FIELDS), ve.focus();
        return;
      }
      let F = !1;
      if (Ze.forEach((Y) => {
        Gs(Y)?.value || (F = !0);
      }), F) {
        Se.preventDefault(), De("Please assign all fields to a signer");
        const Y = h.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        Y && Y.focus();
        return;
      }
      if (he().some((Y) => !Y.participantId)) {
        Se.preventDefault(), De("Please assign all automation rules to a signer"), Array.from(m?.querySelectorAll(".field-rule-participant-select") || []).find((xe) => !xe.value)?.focus();
        return;
      }
      const ne = !!t.querySelector('input[name="save_as_draft"]'), le = U() === j && !ne;
      if (le) {
        let Y = t.querySelector('input[name="send_for_signature"]');
        Y || (Y = document.createElement("input"), Y.type = "hidden", Y.name = "send_for_signature", t.appendChild(Y)), Y.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (L === "json") {
        Se.preventDefault(), n.disabled = !0, Fe(le ? "Sending..." : "Saving...", !0), (async () => {
          try {
            be();
            const Y = String(e.routes?.index || "").trim();
            if (!le) {
              if (await Xe(), Y) {
                window.location.href = Y;
                return;
              }
              window.location.reload();
              return;
            }
            z = Hs(), xt("send_submit_start", tt({
              state: x.getState(),
              storageKey: E,
              ownership: Ie(),
              sendAttemptId: z
            }));
            const xe = await Qe(), fe = String(xe?.draftID || "").trim(), Z = Number(xe?.revision || 0);
            if (!fe || Z <= 0)
              throw new Error("Draft session not available. Please try again.");
            xt("send_request_start", tt({
              state: x.getState(),
              storageKey: E,
              ownership: Ie(),
              sendAttemptId: z,
              extra: {
                targetDraftId: fe,
                expectedRevision: Z
              }
            }));
            const ee = await f.send(Z, z || fe), Ee = String(
              ee?.agreement_id || ee?.id || ee?.data?.agreement_id || ee?.data?.id || ""
            ).trim();
            if (xt("send_request_success", tt({
              state: x.getState(),
              storageKey: E,
              ownership: Ie(),
              sendAttemptId: z,
              extra: {
                targetDraftId: fe,
                expectedRevision: Z,
                agreementId: Ee
              }
            })), x.clear(), _.broadcastStateUpdate(), _.broadcastDraftDisposed?.(fe, "send_completed"), z = null, Ee && Y) {
              window.location.href = `${Y}/${encodeURIComponent(Ee)}`;
              return;
            }
            if (Y) {
              window.location.href = Y;
              return;
            }
            window.location.reload();
          } catch (Y) {
            const xe = vn(Y) ? Y : {}, fe = String(xe.message || "Failed to process agreement").trim();
            let Z = String(xe.code || "").trim();
            const ee = Number(xe.status || 0);
            if (Z.toUpperCase() === "STALE_REVISION") {
              const Ee = Ys(Y, Number(x.getState()?.serverRevision || 0));
              at?.("conflict"), $e?.(Ee), Me("wizard_send_conflict", {
                draft_id: String(x.getState()?.serverDraftId || "").trim(),
                current_revision: Ee,
                status: ee || 409
              }), n.disabled = !1, Fe("Send for Signature", !1), z = null;
              return;
            }
            Z.toUpperCase() === "NOT_FOUND" && (Z = "DRAFT_SEND_NOT_FOUND", Me("wizard_send_not_found", {
              draft_id: String(x.getState()?.serverDraftId || "").trim(),
              status: ee || 404
            }), await it().catch(() => {
            })), _t("send_request_failed", tt({
              state: x.getState(),
              storageKey: E,
              ownership: Ie(),
              sendAttemptId: z,
              extra: {
                code: Z || null,
                status: ee,
                message: fe
              }
            })), De(fe, Z, ee), n.disabled = !1, Fe("Send for Signature", !1), z = null;
          }
        })();
        return;
      }
      n.disabled = !0, Fe(le ? "Sending..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: ht,
    ensureDraftReadyForSend: Qe,
    persistLatestWizardState: Xe,
    resyncAfterSendNotFound: it
  };
}
const zi = 150, Oi = 32;
function je(i) {
  return i == null ? "" : String(i).trim();
}
function cr(i) {
  if (typeof i == "boolean") return i;
  const e = je(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Ks(i) {
  return je(i).toLowerCase();
}
function nt(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(je(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function mn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(je(i));
  return Number.isFinite(t) ? t : e;
}
function yn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function Qt(i, e) {
  const t = nt(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function Jt(i, e, t = 1) {
  const n = nt(t, 1), r = nt(i, n);
  return e > 0 ? yn(r, 1, e) : r > 0 ? r : n;
}
function Xs(i, e, t) {
  const n = nt(t, 1);
  let r = Qt(i, n), c = Qt(e, n);
  return r <= 0 && (r = 1), c <= 0 && (c = n), c < r ? { start: c, end: r } : { start: r, end: c };
}
function En(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => je(n)) : je(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const r = nt(n, 0);
    r > 0 && t.add(r);
  }), Array.from(t).sort((n, r) => n - r);
}
function bn(i, e) {
  const t = nt(e, 1), n = je(i.participantId ?? i.participant_id), r = En(i.excludePages ?? i.exclude_pages), c = i.required, d = typeof c == "boolean" ? c : !["0", "false", "off", "no"].includes(je(c).toLowerCase());
  return {
    id: je(i.id),
    type: Ks(i.type),
    participantId: n,
    participantTempId: je(i.participantTempId) || n,
    fromPage: Qt(i.fromPage ?? i.from_page, t),
    toPage: Qt(i.toPage ?? i.to_page, t),
    page: Qt(i.page, t),
    excludeLastPage: cr(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: r,
    required: d
  };
}
function Qs(i, e) {
  const t = je(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Zs(i, e) {
  const t = nt(e, 1), n = [];
  return i.forEach((r, c) => {
    const d = bn(r || {}, t);
    if (d.type === "") return;
    const s = Qs(d, c);
    if (d.type === "initials_each_page") {
      const h = Xs(d.fromPage, d.toPage, t), m = /* @__PURE__ */ new Set();
      En(d.excludePages).forEach((b) => {
        b <= t && m.add(b);
      }), d.excludeLastPage && m.add(t);
      for (let b = h.start; b <= h.end; b += 1)
        m.has(b) || n.push({
          id: `${s}-initials-${b}`,
          type: "initials",
          page: b,
          participantId: je(d.participantId),
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
        participantId: je(d.participantId),
        required: d.required !== !1,
        ruleId: s
        // Track rule ID for link group creation.
      });
    }
  }), n.sort((r, c) => r.page !== c.page ? r.page - c.page : r.id.localeCompare(c.id)), n;
}
function ea(i, e, t, n, r) {
  const c = nt(t, 1);
  let d = i > 0 ? i : 1, s = e > 0 ? e : c;
  d = yn(d, 1, c), s = yn(s, 1, c), s < d && ([d, s] = [s, d]);
  const h = /* @__PURE__ */ new Set();
  r.forEach((b) => {
    const S = nt(b, 0);
    S > 0 && h.add(yn(S, 1, c));
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
function ta(i) {
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
function Xn(i) {
  const e = i || {};
  return {
    id: je(e.id),
    title: je(e.title || e.name) || "Untitled",
    pageCount: nt(e.page_count ?? e.pageCount, 0),
    compatibilityTier: je(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: je(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function lr(i) {
  const e = je(i).toLowerCase();
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
function Zt(i, e = 0) {
  const t = i || {}, n = je(t.id) || `fi_init_${e}`, r = je(t.definitionId || t.definition_id || t.field_definition_id) || n, c = nt(t.page ?? t.page_number, 1), d = mn(t.x ?? t.pos_x, 0), s = mn(t.y ?? t.pos_y, 0), h = mn(t.width, zi), m = mn(t.height, Oi);
  return {
    id: n,
    definitionId: r,
    type: je(t.type) || "text",
    participantId: je(t.participantId || t.participant_id),
    participantName: je(t.participantName || t.participant_name) || "Unassigned",
    page: c > 0 ? c : 1,
    x: d >= 0 ? d : 0,
    y: s >= 0 ? s : 0,
    width: h > 0 ? h : zi,
    height: m > 0 ? m : Oi,
    placementSource: lr(t.placementSource || t.placement_source),
    linkGroupId: je(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: je(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: cr(t.isUnlinked ?? t.is_unlinked)
  };
}
function na(i, e = 0) {
  const t = Zt(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: lr(t.placementSource),
    link_group_id: je(t.linkGroupId),
    linked_from_field_id: je(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Je(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Lt(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Ft(i) {
  return typeof i == "object" && i !== null;
}
function ia(i) {
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
    mapUserFacingError: P,
    renderFieldRulePreview: E
  } = i, f = Je("document_id"), _ = Je("selected-document"), x = Je("document-picker"), L = Je("document-search"), j = Je("document-list"), G = Je("change-document-btn"), U = Je("selected-document-title"), k = Je("selected-document-info"), D = Je("document_page_count"), X = Je("document-remediation-panel"), he = Je("document-remediation-message"), ce = Je("document-remediation-status"), pe = Je("document-remediation-trigger-btn"), ye = Je("document-remediation-dismiss-btn"), ge = Je("title"), oe = 300, be = 5, De = 10, Me = Je("document-typeahead"), we = Je("document-typeahead-dropdown"), Ue = Je("document-recent-section"), $e = Je("document-recent-list"), dt = Je("document-search-section"), at = Je("document-search-list"), He = Je("document-empty-state"), We = Je("document-dropdown-loading"), ve = Je("document-search-loading"), z = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Ie = [], Fe = null, Xe = 0, Qe = null;
  const it = /* @__PURE__ */ new Set(), ht = /* @__PURE__ */ new Map();
  function Se(M) {
    return String(M || "").trim().toLowerCase();
  }
  function Le(M) {
    return String(M || "").trim().toLowerCase();
  }
  function Re(M) {
    return Se(M) === "unsupported";
  }
  function Ze() {
    !r && ge && ge.value.trim() !== "" && !s.hasResumableState() && s.setTitleSource(c.SERVER_SEED, { syncPending: !1 });
  }
  function A(M) {
    const N = nt(M, 0);
    D && (D.value = String(N));
  }
  function F() {
    const M = nt(D?.value || "0", 0);
    if (M > 0) return M;
    const N = String(k?.textContent || "").match(/(\d+)\s+pages?/i);
    if (N) {
      const H = nt(N[1], 0);
      if (H > 0) return H;
    }
    return 1;
  }
  function O() {
    f && (f.value = ""), U && (U.textContent = ""), k && (k.textContent = ""), A(0), s.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), h.setDocument(null, null, null);
  }
  function te(M = "") {
    const N = "This document cannot be used because its PDF is incompatible with online signing.", H = Le(M);
    return H ? `${N} Reason: ${H}. Select another document or upload a remediated PDF.` : `${N} Select another document or upload a remediated PDF.`;
  }
  function ne() {
    Fe = null, ce && (ce.textContent = "", ce.className = "mt-2 text-xs text-amber-800"), X && X.classList.add("hidden"), pe && (pe.disabled = !1, pe.textContent = "Remediate PDF");
  }
  function le(M, N = "info") {
    if (!ce) return;
    const H = String(M || "").trim();
    ce.textContent = H;
    const Q = N === "error" ? "text-red-700" : N === "success" ? "text-green-700" : "text-amber-800";
    ce.className = `mt-2 text-xs ${Q}`;
  }
  function Y(M, N = "") {
    !M || !X || !he || (Fe = {
      id: String(M.id || "").trim(),
      title: String(M.title || "").trim(),
      pageCount: nt(M.pageCount, 0),
      compatibilityReason: Le(N || M.compatibilityReason || "")
    }, Fe.id && (he.textContent = te(Fe.compatibilityReason), le("Run remediation to make this document signable."), X.classList.remove("hidden")));
  }
  function xe(M) {
    const N = ge;
    if (!N) return;
    const H = s.getState(), Q = N.value.trim(), re = d(
      H?.titleSource,
      Q === "" ? c.AUTOFILL : c.USER
    );
    if (Q && re === c.USER)
      return;
    const ae = String(M || "").trim();
    ae && (N.value = ae, s.updateDetails({
      title: ae,
      message: s.getState().details.message || ""
    }, { titleSource: c.AUTOFILL }));
  }
  function fe(M, N, H) {
    if (!f || !U || !k || !_ || !x)
      return;
    f.value = String(M || ""), U.textContent = N || "", k.textContent = `${H} pages`, A(H), _.classList.remove("hidden"), x.classList.add("hidden"), E(), xe(N);
    const Q = nt(H, 0);
    s.updateDocument({
      id: M,
      title: N,
      pageCount: Q
    }), h.setDocument(M, N, Q), ne();
  }
  function Z(M) {
    const N = String(M || "").trim();
    if (N === "") return null;
    const H = Ie.find((ae) => String(ae.id || "").trim() === N);
    if (H) return H;
    const Q = z.recentDocuments.find((ae) => String(ae.id || "").trim() === N);
    if (Q) return Q;
    const re = z.searchResults.find((ae) => String(ae.id || "").trim() === N);
    return re || null;
  }
  function ee() {
    const M = Z(f?.value || "");
    if (!M) return !0;
    const N = Se(M.compatibilityTier);
    return Re(N) ? (Y(M, M.compatibilityReason || ""), O(), b(te(M.compatibilityReason || "")), _ && _.classList.add("hidden"), x && x.classList.remove("hidden"), L?.focus(), !1) : (ne(), !0);
  }
  function Ee() {
    if (!U || !k || !_ || !x)
      return;
    const M = (f?.value || "").trim();
    if (!M) return;
    const N = Ie.find((H) => String(H.id || "").trim() === M);
    N && (U.textContent.trim() || (U.textContent = N.title || "Untitled"), (!k.textContent.trim() || k.textContent.trim() === "pages") && (k.textContent = `${N.pageCount || 0} pages`), A(N.pageCount || 0), _.classList.remove("hidden"), x.classList.add("hidden"));
  }
  async function _e() {
    try {
      const M = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), N = await fetch(`${e}/panels/esign_documents?${M.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!N.ok)
        throw await m(N, "Failed to load documents");
      const H = await N.json();
      Ie = (Array.isArray(H?.records) ? H.records : Array.isArray(H?.items) ? H.items : []).slice().sort((ae, B) => {
        const me = Date.parse(String(ae?.created_at ?? ae?.createdAt ?? ae?.updated_at ?? ae?.updatedAt ?? "")), et = Date.parse(String(B?.created_at ?? B?.createdAt ?? B?.updated_at ?? B?.updatedAt ?? "")), ot = Number.isFinite(me) ? me : 0;
        return (Number.isFinite(et) ? et : 0) - ot;
      }).map((ae) => Xn(ae)).filter((ae) => ae.id !== ""), ke(Ie), Ee();
    } catch (M) {
      const N = Ft(M) ? String(M.message || "Failed to load documents") : "Failed to load documents", H = Ft(M) ? String(M.code || "") : "", Q = Ft(M) ? Number(M.status || 0) : 0, re = P(N, H, Q);
      j && (j.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${Lt(re)}</div>`);
    }
  }
  function ke(M) {
    if (!j) return;
    if (M.length === 0) {
      j.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${Lt(n)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    j.innerHTML = M.map((H, Q) => {
      const re = Lt(String(H.id || "").trim()), ae = Lt(String(H.title || "").trim()), B = String(nt(H.pageCount, 0)), me = Se(H.compatibilityTier), et = Le(H.compatibilityReason), ot = Lt(me), ct = Lt(et), bt = Re(me) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${Q === 0 ? "0" : "-1"}"
                data-document-id="${re}"
                data-document-title="${ae}"
                data-document-pages="${B}"
                data-document-compatibility-tier="${ot}"
                data-document-compatibility-reason="${ct}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${ae}</div>
            <div class="text-xs text-gray-500">${B} pages ${bt}</div>
          </div>
        </button>
      `;
    }).join("");
    const N = Array.from(j.querySelectorAll(".document-option"));
    N.forEach((H, Q) => {
      H.addEventListener("click", () => ze(H)), H.addEventListener("keydown", (re) => {
        let ae = Q;
        if (re.key === "ArrowDown")
          re.preventDefault(), ae = Math.min(Q + 1, N.length - 1);
        else if (re.key === "ArrowUp")
          re.preventDefault(), ae = Math.max(Q - 1, 0);
        else if (re.key === "Enter" || re.key === " ") {
          re.preventDefault(), ze(H);
          return;
        } else re.key === "Home" ? (re.preventDefault(), ae = 0) : re.key === "End" && (re.preventDefault(), ae = N.length - 1);
        ae !== Q && (N[ae].focus(), N[ae].setAttribute("tabindex", "0"), H.setAttribute("tabindex", "-1"));
      });
    });
  }
  function ze(M) {
    const N = M.getAttribute("data-document-id"), H = M.getAttribute("data-document-title"), Q = M.getAttribute("data-document-pages"), re = Se(M.getAttribute("data-document-compatibility-tier")), ae = Le(M.getAttribute("data-document-compatibility-reason"));
    if (Re(re)) {
      Y({ id: String(N || ""), title: String(H || ""), pageCount: nt(Q, 0), compatibilityReason: ae }), O(), b(te(ae)), L?.focus();
      return;
    }
    fe(N, H, Q);
  }
  async function y(M, N, H) {
    const Q = String(M || "").trim();
    if (!Q) return;
    const re = Date.now(), ae = 12e4, B = 1250;
    for (; Date.now() - re < ae; ) {
      const me = await fetch(Q, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!me.ok)
        throw await m(me, "Failed to read remediation status");
      const ot = (await me.json())?.dispatch || {}, ct = String(ot?.status || "").trim().toLowerCase();
      if (ct === "succeeded") {
        le("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (ct === "failed" || ct === "canceled" || ct === "dead_letter") {
        const bt = String(ot?.terminal_reason || "").trim();
        throw { message: bt ? `Remediation failed: ${bt}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      le(ct === "retrying" ? "Remediation is retrying in the queue..." : ct === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((bt) => setTimeout(bt, B));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${N} (${H})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function w() {
    const M = Fe;
    if (!M || !M.id) return;
    const N = String(M.id || "").trim();
    if (!(!N || it.has(N))) {
      it.add(N), pe && (pe.disabled = !0, pe.textContent = "Remediating...");
      try {
        let H = ht.get(N) || "";
        H || (H = `esign-remediate-${N}-${Date.now()}`, ht.set(N, H));
        const Q = `${t}/esign/documents/${encodeURIComponent(N)}/remediate`, re = await fetch(Q, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": H
          }
        });
        if (!re.ok)
          throw await m(re, "Failed to trigger remediation");
        const ae = await re.json(), B = ae?.receipt || {}, me = String(B?.dispatch_id || ae?.dispatch_id || "").trim(), et = String(B?.mode || ae?.mode || "").trim().toLowerCase();
        let ot = String(ae?.dispatch_status_url || "").trim();
        !ot && me && (ot = `${t}/esign/dispatches/${encodeURIComponent(me)}`), et === "queued" && me && ot && (le("Remediation queued. Monitoring progress..."), await y(ot, me, N)), await _e();
        const ct = Z(N);
        if (!ct || Re(ct.compatibilityTier)) {
          le("Remediation finished, but this PDF is still incompatible.", "error"), b("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        fe(ct.id, ct.title, ct.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : S("Document remediated successfully. You can continue.", "success");
      } catch (H) {
        const Q = Ft(H) ? String(H.message || "Remediation failed").trim() : "Remediation failed", re = Ft(H) ? String(H.code || "") : "", ae = Ft(H) ? Number(H.status || 0) : 0;
        le(Q, "error"), b(Q, re, ae);
      } finally {
        it.delete(N), pe && (pe.disabled = !1, pe.textContent = "Remediate PDF");
      }
    }
  }
  function I(M, N) {
    let H = null;
    return (...Q) => {
      H !== null && clearTimeout(H), H = setTimeout(() => {
        M(...Q), H = null;
      }, N);
    };
  }
  async function q() {
    try {
      const M = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(be)
      }), N = await fetch(`${e}/panels/esign_documents?${M}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!N.ok) {
        console.warn("Failed to load recent documents:", N.status);
        return;
      }
      const H = await N.json(), Q = Array.isArray(H?.records) ? H.records : Array.isArray(H?.items) ? H.items : [];
      z.recentDocuments = Q.map((re) => Xn(re)).filter((re) => re.id !== "").slice(0, be);
    } catch (M) {
      console.warn("Error loading recent documents:", M);
    }
  }
  async function V(M) {
    const N = M.trim();
    if (!N) {
      Qe && (Qe.abort(), Qe = null), z.isSearchMode = !1, z.searchResults = [], Ae();
      return;
    }
    const H = ++Xe;
    Qe && Qe.abort(), Qe = new AbortController(), z.isLoading = !0, z.isSearchMode = !0, Ae();
    try {
      const Q = new URLSearchParams({
        q: N,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(De)
      }), re = await fetch(`${e}/panels/esign_documents?${Q}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Qe.signal
      });
      if (H !== Xe) return;
      if (!re.ok) {
        console.warn("Failed to search documents:", re.status), z.searchResults = [], z.isLoading = !1, Ae();
        return;
      }
      const ae = await re.json(), B = Array.isArray(ae?.records) ? ae.records : Array.isArray(ae?.items) ? ae.items : [];
      z.searchResults = B.map((me) => Xn(me)).filter((me) => me.id !== "").slice(0, De);
    } catch (Q) {
      if (Ft(Q) && Q.name === "AbortError")
        return;
      console.warn("Error searching documents:", Q), z.searchResults = [];
    } finally {
      H === Xe && (z.isLoading = !1, Ae());
    }
  }
  const J = I(V, oe);
  function ie() {
    we && (z.isOpen = !0, z.selectedIndex = -1, we.classList.remove("hidden"), L?.setAttribute("aria-expanded", "true"), j?.classList.add("hidden"), Ae());
  }
  function ue() {
    we && (z.isOpen = !1, z.selectedIndex = -1, we.classList.add("hidden"), L?.setAttribute("aria-expanded", "false"), j?.classList.remove("hidden"));
  }
  function Be(M, N, H) {
    M && (M.innerHTML = N.map((Q, re) => {
      const ae = re, B = z.selectedIndex === ae, me = Lt(String(Q.id || "").trim()), et = Lt(String(Q.title || "").trim()), ot = String(nt(Q.pageCount, 0)), ct = Se(Q.compatibilityTier), At = Le(Q.compatibilityReason), bt = Lt(ct), en = Lt(At), An = Re(ct) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${B ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${B}"
          tabindex="-1"
          data-document-id="${me}"
          data-document-title="${et}"
          data-document-pages="${ot}"
          data-document-compatibility-tier="${bt}"
          data-document-compatibility-reason="${en}"
          data-typeahead-index="${ae}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${et}</div>
            <div class="text-xs text-gray-500">${ot} pages ${An}</div>
          </div>
        </button>
      `;
    }).join(""), M.querySelectorAll(".typeahead-option").forEach((Q) => {
      Q.addEventListener("click", () => rt(Q));
    }));
  }
  function Ae() {
    if (we) {
      if (z.isLoading) {
        We?.classList.remove("hidden"), Ue?.classList.add("hidden"), dt?.classList.add("hidden"), He?.classList.add("hidden"), ve?.classList.remove("hidden");
        return;
      }
      We?.classList.add("hidden"), ve?.classList.add("hidden"), z.isSearchMode ? (Ue?.classList.add("hidden"), z.searchResults.length > 0 ? (dt?.classList.remove("hidden"), He?.classList.add("hidden"), Be(at, z.searchResults)) : (dt?.classList.add("hidden"), He?.classList.remove("hidden"))) : (dt?.classList.add("hidden"), z.recentDocuments.length > 0 ? (Ue?.classList.remove("hidden"), He?.classList.add("hidden"), Be($e, z.recentDocuments)) : (Ue?.classList.add("hidden"), He?.classList.remove("hidden"), He && (He.textContent = "No recent documents")));
    }
  }
  function rt(M) {
    const N = M.getAttribute("data-document-id"), H = M.getAttribute("data-document-title"), Q = M.getAttribute("data-document-pages"), re = Se(M.getAttribute("data-document-compatibility-tier")), ae = Le(M.getAttribute("data-document-compatibility-reason"));
    if (N) {
      if (Re(re)) {
        Y({ id: String(N || ""), title: String(H || ""), pageCount: nt(Q, 0), compatibilityReason: ae }), O(), b(te(ae)), L?.focus();
        return;
      }
      fe(N, H, Q), ue(), L && (L.value = ""), z.query = "", z.isSearchMode = !1, z.searchResults = [];
    }
  }
  function qe() {
    if (!we) return;
    const M = we.querySelector(`[data-typeahead-index="${z.selectedIndex}"]`);
    M && M.scrollIntoView({ block: "nearest" });
  }
  function yt(M) {
    if (!z.isOpen) {
      (M.key === "ArrowDown" || M.key === "Enter") && (M.preventDefault(), ie());
      return;
    }
    const N = z.isSearchMode ? z.searchResults : z.recentDocuments, H = N.length - 1;
    switch (M.key) {
      case "ArrowDown":
        M.preventDefault(), z.selectedIndex = Math.min(z.selectedIndex + 1, H), Ae(), qe();
        break;
      case "ArrowUp":
        M.preventDefault(), z.selectedIndex = Math.max(z.selectedIndex - 1, 0), Ae(), qe();
        break;
      case "Enter":
        if (M.preventDefault(), z.selectedIndex >= 0 && z.selectedIndex <= H) {
          const Q = N[z.selectedIndex];
          if (Q) {
            const re = document.createElement("button");
            re.setAttribute("data-document-id", Q.id), re.setAttribute("data-document-title", Q.title), re.setAttribute("data-document-pages", String(Q.pageCount)), re.setAttribute("data-document-compatibility-tier", String(Q.compatibilityTier || "")), re.setAttribute("data-document-compatibility-reason", String(Q.compatibilityReason || "")), rt(re);
          }
        }
        break;
      case "Escape":
        M.preventDefault(), ue();
        break;
      case "Tab":
        ue();
        break;
      case "Home":
        M.preventDefault(), z.selectedIndex = 0, Ae(), qe();
        break;
      case "End":
        M.preventDefault(), z.selectedIndex = H, Ae(), qe();
        break;
    }
  }
  function Ve() {
    G && G.addEventListener("click", () => {
      _?.classList.add("hidden"), x?.classList.remove("hidden"), ne(), L?.focus(), ie();
    }), pe && pe.addEventListener("click", () => {
      w();
    }), ye && ye.addEventListener("click", () => {
      ne(), L?.focus();
    }), L && (L.addEventListener("input", (M) => {
      const N = M.target;
      if (!(N instanceof HTMLInputElement)) return;
      const H = N.value;
      z.query = H, z.isOpen || ie(), H.trim() ? (z.isLoading = !0, Ae(), J(H)) : (z.isSearchMode = !1, z.searchResults = [], Ae());
      const Q = Ie.filter(
        (re) => String(re.title || "").toLowerCase().includes(H.toLowerCase())
      );
      ke(Q);
    }), L.addEventListener("focus", () => {
      ie();
    }), L.addEventListener("keydown", yt)), document.addEventListener("click", (M) => {
      const N = M.target;
      Me && !(N instanceof Node && Me.contains(N)) && ue();
    });
  }
  return {
    refs: {
      documentIdInput: f,
      selectedDocument: _,
      documentPicker: x,
      documentSearch: L,
      documentList: j,
      selectedDocumentTitle: U,
      selectedDocumentInfo: k,
      documentPageCountInput: D
    },
    bindEvents: Ve,
    initializeTitleSourceSeed: Ze,
    loadDocuments: _e,
    loadRecentDocuments: q,
    ensureSelectedDocumentCompatibility: ee,
    getCurrentDocumentPageCount: F
  };
}
function Et(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function Qn(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function ra(i = {}) {
  const {
    initialParticipants: e = [],
    onParticipantsChanged: t
  } = i, n = document.getElementById("participants-container"), r = document.getElementById("participant-template"), c = document.getElementById("add-participant-btn");
  let d = 0, s = 0;
  function h() {
    return `temp_${Date.now()}_${d++}`;
  }
  function m(_ = {}) {
    if (!(r instanceof HTMLTemplateElement) || !n)
      return;
    const x = r.content.cloneNode(!0), L = x.querySelector(".participant-entry");
    if (!(L instanceof HTMLElement)) return;
    const j = _.id || h();
    L.setAttribute("data-participant-id", j);
    const G = Et(L, ".participant-id-input"), U = Et(L, 'input[name="participants[].name"]'), k = Et(L, 'input[name="participants[].email"]'), D = Qn(L, 'select[name="participants[].role"]'), X = Et(L, 'input[name="participants[].signing_stage"]'), he = Et(L, 'input[name="participants[].notify"]'), ce = L.querySelector(".signing-stage-wrapper");
    if (!G || !U || !k || !D) return;
    const pe = s++;
    G.name = `participants[${pe}].id`, G.value = j, U.name = `participants[${pe}].name`, k.name = `participants[${pe}].email`, D.name = `participants[${pe}].role`, X && (X.name = `participants[${pe}].signing_stage`), he && (he.name = `participants[${pe}].notify`), _.name && (U.value = _.name), _.email && (k.value = _.email), _.role && (D.value = _.role), X && _.signing_stage && (X.value = String(_.signing_stage)), he && (he.checked = _.notify !== !1);
    const ye = () => {
      if (!(ce instanceof HTMLElement) || !X) return;
      const ge = D.value === "signer";
      ce.classList.toggle("hidden", !ge), ge ? X.value || (X.value = "1") : X.value = "";
    };
    ye(), L.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      L.remove(), t?.();
    }), D.addEventListener("change", () => {
      ye(), t?.();
    }), n.appendChild(x);
  }
  function b() {
    n && (e.length > 0 ? e.forEach((_) => {
      m({
        id: String(_.id || "").trim(),
        name: String(_.name || "").trim(),
        email: String(_.email || "").trim(),
        role: String(_.role || "signer").trim() || "signer",
        notify: _.notify !== !1,
        signing_stage: Number(_.signing_stage || _.signingStage || 1) || 1
      });
    }) : m());
  }
  function S() {
    if (!n) return;
    c?.addEventListener("click", () => m()), new MutationObserver(() => {
      t?.();
    }).observe(n, { childList: !0, subtree: !0 }), n.addEventListener("change", (x) => {
      const L = x.target;
      L instanceof Element && (L.matches('select[name*=".role"]') || L.matches('input[name*=".name"]') || L.matches('input[name*=".email"]')) && t?.();
    }), n.addEventListener("input", (x) => {
      const L = x.target;
      L instanceof Element && (L.matches('input[name*=".name"]') || L.matches('input[name*=".email"]')) && t?.();
    });
  }
  function P() {
    if (!n) return [];
    const _ = n.querySelectorAll(".participant-entry"), x = [];
    return _.forEach((L) => {
      const j = L.getAttribute("data-participant-id"), G = Qn(L, 'select[name*=".role"]'), U = Et(L, 'input[name*=".name"]'), k = Et(L, 'input[name*=".email"]');
      G?.value === "signer" && x.push({
        id: String(j || ""),
        name: U?.value || k?.value || "Signer",
        email: k?.value || ""
      });
    }), x;
  }
  function E() {
    if (!n) return [];
    const _ = [];
    return n.querySelectorAll(".participant-entry").forEach((x) => {
      const L = x.getAttribute("data-participant-id"), j = Et(x, 'input[name*=".name"]')?.value || "", G = Et(x, 'input[name*=".email"]')?.value || "", U = Qn(x, 'select[name*=".role"]')?.value || "signer", k = Number.parseInt(Et(x, ".signing-stage-input")?.value || "1", 10), D = Et(x, ".notify-input")?.checked !== !1;
      _.push({
        tempId: String(L || ""),
        name: j,
        email: G,
        role: U,
        notify: D,
        signingStage: Number.isFinite(k) ? k : 1
      });
    }), _;
  }
  function f(_) {
    !n || !_?.participants || _.participants.length === 0 || (n.innerHTML = "", s = 0, _.participants.forEach((x) => {
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
    getSignerParticipants: P,
    collectParticipantsForState: E,
    restoreFromState: f
  };
}
function sa() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function Cn() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function aa(i, e) {
  return {
    id: sa(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function dr(i, e) {
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
function ji(i, e) {
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
function ur(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function oa(i, e) {
  const t = ur(i, e.definitionId);
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
function ca(i, e, t, n) {
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
function Ct(i) {
  const e = document.getElementById(i);
  return e instanceof HTMLElement ? e : null;
}
function Ke(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function mt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Vi(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function Bt(i, e) {
  const t = i.querySelector(e);
  return t instanceof HTMLElement ? t : null;
}
function la(i) {
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
  } = i, S = Ct("field-definitions-container"), P = document.getElementById("field-definition-template"), E = Ct("add-field-btn"), f = Ct("add-field-btn-container"), _ = Ct("add-field-definition-empty-btn"), x = Ct("field-definitions-empty-state"), L = Ct("field-rules-container"), j = document.getElementById("field-rule-template"), G = Ct("add-field-rule-btn"), U = Ct("field-rules-empty-state"), k = Ct("field-rules-preview"), D = Ct("field_rules_json"), X = Ct("field_placements_json");
  let he = 0, ce = 0, pe = 0;
  function ye() {
    return `temp_field_${Date.now()}_${he++}`;
  }
  function ge() {
    return `rule_${Date.now()}_${pe}`;
  }
  function oe(A, F) {
    const O = String(A || "").trim();
    return O && F.some((te) => te.id === O) ? O : F.length === 1 ? F[0].id : "";
  }
  function be(A, F, O = "") {
    if (!A) return;
    const te = oe(O, F);
    A.innerHTML = '<option value="">Select signer...</option>', F.forEach((ne) => {
      const le = document.createElement("option");
      le.value = ne.id, le.textContent = ne.name, A.appendChild(le);
    }), A.value = te;
  }
  function De(A = r()) {
    if (!S) return;
    const F = S.querySelectorAll(".field-participant-select"), O = L ? L.querySelectorAll(".field-rule-participant-select") : [];
    F.forEach((te) => {
      be(
        te instanceof HTMLSelectElement ? te : null,
        A,
        te instanceof HTMLSelectElement ? te.value : ""
      );
    }), O.forEach((te) => {
      be(
        te instanceof HTMLSelectElement ? te : null,
        A,
        te instanceof HTMLSelectElement ? te.value : ""
      );
    });
  }
  function Me() {
    if (!S || !x) return;
    S.querySelectorAll(".field-definition-entry").length === 0 ? (x.classList.remove("hidden"), f?.classList.add("hidden")) : (x.classList.add("hidden"), f?.classList.remove("hidden"));
  }
  function we() {
    if (!L || !U) return;
    const A = L.querySelectorAll(".field-rule-entry");
    U.classList.toggle("hidden", A.length > 0);
  }
  function Ue() {
    if (!S) return [];
    const A = [];
    return S.querySelectorAll(".field-definition-entry").forEach((F) => {
      const O = F.getAttribute("data-field-definition-id"), te = mt(F, ".field-type-select")?.value || "signature", ne = mt(F, ".field-participant-select")?.value || "", le = Number.parseInt(Ke(F, 'input[name*=".page"]')?.value || "1", 10), Y = Ke(F, 'input[name*=".required"]')?.checked ?? !0;
      A.push({
        tempId: String(O || ""),
        type: te,
        participantTempId: ne,
        page: Number.isFinite(le) ? le : 1,
        required: Y
      });
    }), A;
  }
  function $e() {
    if (!L) return [];
    const A = n(), F = L.querySelectorAll(".field-rule-entry"), O = [];
    return F.forEach((te) => {
      const ne = bn({
        id: te.getAttribute("data-field-rule-id") || "",
        type: mt(te, ".field-rule-type-select")?.value || "",
        participantId: mt(te, ".field-rule-participant-select")?.value || "",
        fromPage: Ke(te, ".field-rule-from-page-input")?.value || "",
        toPage: Ke(te, ".field-rule-to-page-input")?.value || "",
        page: Ke(te, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Ke(te, ".field-rule-exclude-last-input")?.checked,
        excludePages: En(Ke(te, ".field-rule-exclude-pages-input")?.value || ""),
        required: (mt(te, ".field-rule-required-select")?.value || "1") !== "0"
      }, A);
      ne.type && O.push(ne);
    }), O;
  }
  function dt() {
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
  function at(A, F) {
    return Zs(A, F);
  }
  function He() {
    if (!k) return;
    const A = $e(), F = n(), O = at(A, F), te = r(), ne = new Map(te.map((fe) => [String(fe.id), fe.name]));
    if (D && (D.value = JSON.stringify(dt())), !O.length) {
      k.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const le = O.reduce((fe, Z) => {
      const ee = Z.type;
      return fe[ee] = (fe[ee] || 0) + 1, fe;
    }, {}), Y = O.slice(0, 8).map((fe) => {
      const Z = ne.get(String(fe.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${fe.type === "initials" ? "Initials" : "Signature"} on page ${fe.page}</span><span class="text-gray-500">${c(String(Z))}</span></li>`;
    }).join(""), xe = O.length - 8;
    k.innerHTML = `
      <p class="text-gray-700">${O.length} generated field${O.length !== 1 ? "s" : ""} (${le.initials || 0} initials, ${le.signature || 0} signatures)</p>
      <ul class="space-y-1">${Y}</ul>
      ${xe > 0 ? `<p class="text-gray-500">+${xe} more</p>` : ""}
    `;
  }
  function We() {
    const A = r();
    De(A), He();
  }
  function ve(A) {
    const F = mt(A, ".field-rule-type-select"), O = Bt(A, ".field-rule-range-start-wrap"), te = Bt(A, ".field-rule-range-end-wrap"), ne = Bt(A, ".field-rule-page-wrap"), le = Bt(A, ".field-rule-exclude-last-wrap"), Y = Bt(A, ".field-rule-exclude-pages-wrap"), xe = Bt(A, ".field-rule-summary"), fe = Ke(A, ".field-rule-from-page-input"), Z = Ke(A, ".field-rule-to-page-input"), ee = Ke(A, ".field-rule-page-input"), Ee = Ke(A, ".field-rule-exclude-last-input"), _e = Ke(A, ".field-rule-exclude-pages-input");
    if (!F || !O || !te || !ne || !le || !Y || !xe)
      return;
    const ke = n(), ze = bn({
      type: F?.value || "",
      fromPage: fe?.value || "",
      toPage: Z?.value || "",
      page: ee?.value || "",
      excludeLastPage: !!Ee?.checked,
      excludePages: En(_e?.value || ""),
      required: !0
    }, ke), y = ze.fromPage > 0 ? ze.fromPage : 1, w = ze.toPage > 0 ? ze.toPage : ke, I = ze.page > 0 ? ze.page : ze.toPage > 0 ? ze.toPage : ke, q = ze.excludeLastPage, V = ze.excludePages.join(","), J = F?.value === "initials_each_page";
    if (O.classList.toggle("hidden", !J), te.classList.toggle("hidden", !J), le.classList.toggle("hidden", !J), Y.classList.toggle("hidden", !J), ne.classList.toggle("hidden", J), fe && (fe.value = String(y)), Z && (Z.value = String(w)), ee && (ee.value = String(I)), _e && (_e.value = V), Ee && (Ee.checked = q), J) {
      const ie = ea(
        y,
        w,
        ke,
        q,
        ze.excludePages
      ), ue = ta(ie);
      xe.textContent = ie.isEmpty ? `Warning: No initials fields will be generated ${ue}.` : `Generates initials fields on ${ue}.`;
    } else
      xe.textContent = `Generates one signature field on page ${I}.`;
  }
  function z(A = {}) {
    if (!(j instanceof HTMLTemplateElement) || !L) return;
    const F = j.content.cloneNode(!0), O = F.querySelector(".field-rule-entry");
    if (!(O instanceof HTMLElement)) return;
    const te = A.id || ge(), ne = pe++, le = n();
    O.setAttribute("data-field-rule-id", te);
    const Y = Ke(O, ".field-rule-id-input"), xe = mt(O, ".field-rule-type-select"), fe = mt(O, ".field-rule-participant-select"), Z = Ke(O, ".field-rule-from-page-input"), ee = Ke(O, ".field-rule-to-page-input"), Ee = Ke(O, ".field-rule-page-input"), _e = mt(O, ".field-rule-required-select"), ke = Ke(O, ".field-rule-exclude-last-input"), ze = Ke(O, ".field-rule-exclude-pages-input"), y = Vi(O, ".remove-field-rule-btn");
    if (!Y || !xe || !fe || !Z || !ee || !Ee || !_e || !ke || !ze || !y)
      return;
    Y.name = `field_rules[${ne}].id`, Y.value = te, xe.name = `field_rules[${ne}].type`, fe.name = `field_rules[${ne}].participant_id`, Z.name = `field_rules[${ne}].from_page`, ee.name = `field_rules[${ne}].to_page`, Ee.name = `field_rules[${ne}].page`, _e.name = `field_rules[${ne}].required`, ke.name = `field_rules[${ne}].exclude_last_page`, ze.name = `field_rules[${ne}].exclude_pages`;
    const w = bn(A, le);
    xe.value = w.type || "initials_each_page", be(fe, r(), w.participantId), Z.value = String(w.fromPage > 0 ? w.fromPage : 1), ee.value = String(w.toPage > 0 ? w.toPage : le), Ee.value = String(w.page > 0 ? w.page : le), _e.value = w.required ? "1" : "0", ke.checked = w.excludeLastPage, ze.value = w.excludePages.join(",");
    const I = () => {
      ve(O), He(), s?.();
    }, q = () => {
      const J = n();
      if (Z) {
        const ie = parseInt(Z.value, 10);
        Number.isFinite(ie) && (Z.value = String(Jt(ie, J, 1)));
      }
      if (ee) {
        const ie = parseInt(ee.value, 10);
        Number.isFinite(ie) && (ee.value = String(Jt(ie, J, 1)));
      }
      if (Ee) {
        const ie = parseInt(Ee.value, 10);
        Number.isFinite(ie) && (Ee.value = String(Jt(ie, J, 1)));
      }
    }, V = () => {
      q(), I();
    };
    xe.addEventListener("change", I), fe.addEventListener("change", I), Z.addEventListener("input", V), Z.addEventListener("change", V), ee.addEventListener("input", V), ee.addEventListener("change", V), Ee.addEventListener("input", V), Ee.addEventListener("change", V), _e.addEventListener("change", I), ke.addEventListener("change", () => {
      const J = n();
      ee.value = String(ke.checked ? Math.max(1, J - 1) : J), I();
    }), ze.addEventListener("input", I), y.addEventListener("click", () => {
      O.remove(), we(), He(), s?.();
    }), L.appendChild(F), ve(L.lastElementChild || O), we(), He();
  }
  function Ie(A = {}) {
    if (!(P instanceof HTMLTemplateElement) || !S) return;
    const F = P.content.cloneNode(!0), O = F.querySelector(".field-definition-entry");
    if (!(O instanceof HTMLElement)) return;
    const te = String(A.id || ye()).trim() || ye();
    O.setAttribute("data-field-definition-id", te);
    const ne = Ke(O, ".field-definition-id-input"), le = mt(O, 'select[name="field_definitions[].type"]'), Y = mt(O, 'select[name="field_definitions[].participant_id"]'), xe = Ke(O, 'input[name="field_definitions[].page"]'), fe = Ke(O, 'input[name="field_definitions[].required"]'), Z = Bt(O, ".field-date-signed-info");
    if (!ne || !le || !Y || !xe || !fe || !Z) return;
    const ee = ce++;
    ne.name = `field_instances[${ee}].id`, ne.value = te, le.name = `field_instances[${ee}].type`, Y.name = `field_instances[${ee}].participant_id`, xe.name = `field_instances[${ee}].page`, fe.name = `field_instances[${ee}].required`, A.type && (le.value = String(A.type)), A.page !== void 0 && (xe.value = String(Jt(A.page, n(), 1))), A.required !== void 0 && (fe.checked = !!A.required);
    const Ee = String(A.participant_id || A.participantId || "").trim();
    be(Y, r(), Ee), le.addEventListener("change", () => {
      le.value === "date_signed" ? Z.classList.remove("hidden") : Z.classList.add("hidden");
    }), le.value === "date_signed" && Z.classList.remove("hidden"), Vi(O, ".remove-field-definition-btn")?.addEventListener("click", () => {
      O.remove(), Me(), d?.();
    });
    const _e = Ke(O, 'input[name*=".page"]'), ke = () => {
      _e && (_e.value = String(Jt(_e.value, n(), 1)));
    };
    ke(), _e?.addEventListener("input", ke), _e?.addEventListener("change", ke), S.appendChild(F), Me();
  }
  function Fe() {
    E?.addEventListener("click", () => Ie()), _?.addEventListener("click", () => Ie()), G?.addEventListener("click", () => z({ to_page: n() })), h?.();
  }
  function Xe() {
    const A = [];
    window._initialFieldPlacementsData = A, e.forEach((F) => {
      const O = String(F.id || "").trim();
      if (!O) return;
      const te = String(F.type || "signature").trim() || "signature", ne = String(F.participant_id || F.participantId || "").trim(), le = Number(F.page || 1) || 1, Y = !!F.required;
      Ie({
        id: O,
        type: te,
        participant_id: ne,
        page: le,
        required: Y
      }), A.push(Zt({
        id: O,
        definitionId: O,
        type: te,
        participantId: ne,
        participantName: String(F.participant_name || F.participantName || "").trim(),
        page: le,
        x: Number(F.x || F.pos_x || 0) || 0,
        y: Number(F.y || F.pos_y || 0) || 0,
        width: Number(F.width || 150) || 150,
        height: Number(F.height || 32) || 32,
        placementSource: String(F.placement_source || F.placementSource || t.MANUAL).trim() || t.MANUAL
      }, A.length));
    }), Me(), We(), we(), He();
  }
  function Qe() {
    const A = window._initialFieldPlacementsData;
    return Array.isArray(A) ? A.map((F, O) => Zt(F, O)) : [];
  }
  function it() {
    if (!S) return [];
    const A = r(), F = new Map(A.map((Z) => [String(Z.id), Z.name || Z.email || "Signer"])), O = [];
    S.querySelectorAll(".field-definition-entry").forEach((Z) => {
      const ee = String(Z.getAttribute("data-field-definition-id") || "").trim(), Ee = mt(Z, ".field-type-select"), _e = mt(Z, ".field-participant-select"), ke = Ke(Z, 'input[name*=".page"]'), ze = String(Ee?.value || "text").trim() || "text", y = String(_e?.value || "").trim(), w = parseInt(String(ke?.value || "1"), 10) || 1;
      O.push({
        definitionId: ee,
        fieldType: ze,
        participantId: y,
        participantName: F.get(y) || "Unassigned",
        page: w
      });
    });
    const ne = at($e(), n()), le = /* @__PURE__ */ new Map();
    ne.forEach((Z) => {
      const ee = String(Z.ruleId || "").trim(), Ee = String(Z.id || "").trim();
      if (ee && Ee) {
        const _e = le.get(ee) || [];
        _e.push(Ee), le.set(ee, _e);
      }
    });
    let Y = m();
    le.forEach((Z, ee) => {
      if (Z.length > 1 && !Y.groups.get(`rule_${ee}`)) {
        const _e = aa(Z, `Rule ${ee}`);
        _e.id = `rule_${ee}`, Y = dr(Y, _e);
      }
    }), b(Y), ne.forEach((Z) => {
      const ee = String(Z.id || "").trim();
      if (!ee) return;
      const Ee = String(Z.participantId || "").trim(), _e = parseInt(String(Z.page || "1"), 10) || 1, ke = String(Z.ruleId || "").trim();
      O.push({
        definitionId: ee,
        fieldType: String(Z.type || "text").trim() || "text",
        participantId: Ee,
        participantName: F.get(Ee) || "Unassigned",
        page: _e,
        linkGroupId: ke ? `rule_${ke}` : void 0
      });
    });
    const xe = /* @__PURE__ */ new Set(), fe = O.filter((Z) => {
      const ee = String(Z.definitionId || "").trim();
      return !ee || xe.has(ee) ? !1 : (xe.add(ee), !0);
    });
    return fe.sort((Z, ee) => Z.page !== ee.page ? Z.page - ee.page : Z.definitionId.localeCompare(ee.definitionId)), fe;
  }
  function ht(A) {
    const F = String(A || "").trim();
    if (!F) return null;
    const te = it().find((ne) => String(ne.definitionId || "").trim() === F);
    return te ? {
      id: F,
      type: String(te.fieldType || "text").trim() || "text",
      participant_id: String(te.participantId || "").trim(),
      participant_name: String(te.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(te.page || "1"), 10) || 1,
      link_group_id: String(te.linkGroupId || "").trim()
    } : null;
  }
  function Se() {
    if (!S) return [];
    const A = r(), F = /* @__PURE__ */ new Map();
    return A.forEach((ne) => F.set(ne.id, !1)), S.querySelectorAll(".field-definition-entry").forEach((ne) => {
      const le = mt(ne, ".field-type-select"), Y = mt(ne, ".field-participant-select"), xe = Ke(ne, 'input[name*=".required"]');
      le?.value === "signature" && Y?.value && xe?.checked && F.set(Y.value, !0);
    }), at($e(), n()).forEach((ne) => {
      ne.type === "signature" && ne.participantId && ne.required && F.set(ne.participantId, !0);
    }), A.filter((ne) => !F.get(ne.id));
  }
  function Le(A) {
    if (!Array.isArray(A) || A.length === 0)
      return "Each signer requires at least one required signature field.";
    const F = A.map((O) => O?.name?.trim()).filter(Boolean);
    return F.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${F.join(", ")}`;
  }
  function Re(A) {
    !S || !A?.fieldDefinitions || A.fieldDefinitions.length === 0 || (S.innerHTML = "", ce = 0, A.fieldDefinitions.forEach((F) => {
      Ie({
        id: F.tempId,
        type: F.type,
        participant_id: F.participantTempId,
        page: F.page,
        required: F.required
      });
    }), Me());
  }
  function Ze(A) {
    !Array.isArray(A?.fieldRules) || A.fieldRules.length === 0 || L && (L.querySelectorAll(".field-rule-entry").forEach((F) => F.remove()), pe = 0, A.fieldRules.forEach((F) => {
      z({
        id: F.id,
        type: F.type,
        participantId: F.participantId || F.participantTempId,
        fromPage: F.fromPage,
        toPage: F.toPage,
        page: F.page,
        excludeLastPage: F.excludeLastPage,
        excludePages: F.excludePages,
        required: F.required
      });
    }), we(), He());
  }
  return {
    refs: {
      fieldDefinitionsContainer: S,
      fieldRulesContainer: L,
      addFieldBtn: E,
      fieldPlacementsJSONInput: X,
      fieldRulesJSONInput: D
    },
    bindEvents: Fe,
    initialize: Xe,
    buildInitialPlacementInstances: Qe,
    collectFieldDefinitionsForState: Ue,
    collectFieldRulesForState: $e,
    collectFieldRulesForForm: dt,
    expandRulesForPreview: at,
    renderFieldRulePreview: He,
    updateFieldParticipantOptions: We,
    collectPlacementFieldDefinitions: it,
    getFieldDefinitionById: ht,
    findSignersMissingRequiredSignatureField: Se,
    missingSignatureFieldMessage: Le,
    restoreFieldDefinitionsFromState: Re,
    restoreFieldRulesFromState: Ze
  };
}
function da(i) {
  return typeof i == "object" && i !== null && "run" in i;
}
const zt = {
  signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
  name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
  date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
  text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
  checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
  initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
}, fn = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};
function ua(i) {
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
    escapeHtml: P,
    onPlacementsChanged: E
  } = i, f = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(c) ? c.map((y, w) => Zt(y, w)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: d || Cn()
  }, _ = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function x(y = "fi") {
    return `${y}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function L(y) {
    return document.querySelector(`.placement-field-item[data-definition-id="${y}"]`);
  }
  function j() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function G(y, w) {
    return y.querySelector(w);
  }
  function U(y, w) {
    return y.querySelector(w);
  }
  function k() {
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
  function he(y) {
    f.linkGroupState = y || Cn();
  }
  function ce() {
    return f.fieldInstances.map((y, w) => na(y, w));
  }
  function pe(y = {}) {
    const { silent: w = !1 } = y, I = k();
    I.fieldInstancesContainer && (I.fieldInstancesContainer.innerHTML = "");
    const q = ce();
    return r && (r.value = JSON.stringify(q)), w || E?.(), q;
  }
  function ye() {
    const y = k(), w = Array.from(document.querySelectorAll(".placement-field-item")), I = w.length, q = new Set(
      w.map((ue) => String(ue.dataset.definitionId || "").trim()).filter((ue) => ue)
    ), V = /* @__PURE__ */ new Set();
    f.fieldInstances.forEach((ue) => {
      const Be = String(ue.definitionId || "").trim();
      q.has(Be) && V.add(Be);
    });
    const J = V.size, ie = Math.max(0, I - J);
    y.totalFields && (y.totalFields.textContent = String(I)), y.placedCount && (y.placedCount.textContent = String(J)), y.unplacedCount && (y.unplacedCount.textContent = String(ie));
  }
  function ge(y, w = !1) {
    const I = L(y);
    if (!I) return;
    I.classList.add("opacity-50"), I.draggable = !1;
    const q = I.querySelector(".placement-status");
    q && (q.textContent = "Placed", q.classList.remove("text-amber-600"), q.classList.add("text-green-600")), w && I.classList.add("just-linked");
  }
  function oe(y) {
    const w = L(y);
    if (!w) return;
    w.classList.remove("opacity-50"), w.draggable = !0;
    const I = w.querySelector(".placement-status");
    I && (I.textContent = "Not placed", I.classList.remove("text-green-600"), I.classList.add("text-amber-600"));
  }
  function be() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((w) => {
      w.classList.add("linked-flash"), setTimeout(() => {
        w.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function De(y) {
    const w = y === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${y} linked fields`;
    window.toastManager?.info?.(w);
    const I = document.createElement("div");
    I.setAttribute("role", "status"), I.setAttribute("aria-live", "polite"), I.className = "sr-only", I.textContent = w, document.body.appendChild(I), setTimeout(() => I.remove(), 1e3), be();
  }
  function Me(y, w) {
    const I = document.createElement("div");
    I.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", I.dataset.definitionId = y, I.dataset.isLinked = String(w), I.title = w ? "Click to unlink this field" : "Click to re-link this field", I.setAttribute("role", "button"), I.setAttribute("aria-label", w ? "Unlink field from group" : "Re-link field to group"), I.setAttribute("tabindex", "0"), w ? I.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : I.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const q = () => He(y, w);
    return I.addEventListener("click", q), I.addEventListener("keydown", (V) => {
      (V.key === "Enter" || V.key === " ") && (V.preventDefault(), q());
    }), I;
  }
  function we() {
    const y = k();
    if (y.linkAllBtn && (y.linkAllBtn.disabled = f.linkGroupState.unlinkedDefinitions.size === 0), y.unlinkAllBtn) {
      let w = !1;
      for (const I of f.linkGroupState.definitionToGroup.keys())
        if (!f.linkGroupState.unlinkedDefinitions.has(I)) {
          w = !0;
          break;
        }
      y.unlinkAllBtn.disabled = !w;
    }
  }
  function Ue() {
    const y = k();
    y.linkAllBtn && !y.linkAllBtn.dataset.bound && (y.linkAllBtn.dataset.bound = "true", y.linkAllBtn.addEventListener("click", () => {
      const w = f.linkGroupState.unlinkedDefinitions.size;
      if (w !== 0) {
        for (const I of f.linkGroupState.unlinkedDefinitions)
          f.linkGroupState = qi(f.linkGroupState, I);
        window.toastManager && window.toastManager.success(`Re-linked ${w} field${w > 1 ? "s" : ""}`), at();
      }
    })), y.unlinkAllBtn && !y.unlinkAllBtn.dataset.bound && (y.unlinkAllBtn.dataset.bound = "true", y.unlinkAllBtn.addEventListener("click", () => {
      let w = 0;
      for (const I of f.linkGroupState.definitionToGroup.keys())
        f.linkGroupState.unlinkedDefinitions.has(I) || (f.linkGroupState = ji(f.linkGroupState, I), w += 1);
      w > 0 && window.toastManager && window.toastManager.success(`Unlinked ${w} field${w > 1 ? "s" : ""}`), at();
    })), we();
  }
  function $e() {
    return s().map((w) => {
      const I = String(w.definitionId || "").trim(), q = f.linkGroupState.definitionToGroup.get(I) || "", V = f.linkGroupState.unlinkedDefinitions.has(I);
      return { ...w, definitionId: I, linkGroupId: q, isUnlinked: V };
    });
  }
  function dt() {
    const y = k();
    if (!y.fieldsList) return;
    y.fieldsList.innerHTML = "";
    const w = $e();
    y.linkBatchActions && y.linkBatchActions.classList.toggle("hidden", f.linkGroupState.groups.size === 0), w.forEach((I, q) => {
      const V = I.definitionId, J = String(I.fieldType || "text").trim() || "text", ie = String(I.participantId || "").trim(), ue = String(I.participantName || "Unassigned").trim() || "Unassigned", Be = Number.parseInt(String(I.page || "1"), 10) || 1, Ae = I.linkGroupId, rt = I.isUnlinked;
      if (!V) return;
      f.fieldInstances.forEach((B) => {
        B.definitionId === V && (B.type = J, B.participantId = ie, B.participantName = ue);
      });
      const qe = zt[J] || zt.text, yt = f.fieldInstances.some((B) => B.definitionId === V), Ve = document.createElement("div");
      Ve.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${yt ? "opacity-50" : ""}`, Ve.draggable = !yt, Ve.dataset.definitionId = V, Ve.dataset.fieldType = J, Ve.dataset.participantId = ie, Ve.dataset.participantName = ue, Ve.dataset.page = String(Be), Ae && (Ve.dataset.linkGroupId = Ae);
      const M = document.createElement("span");
      M.className = `w-3 h-3 rounded ${qe.bg}`;
      const N = document.createElement("div");
      N.className = "flex-1 text-xs";
      const H = document.createElement("div");
      H.className = "font-medium capitalize", H.textContent = J.replace(/_/g, " ");
      const Q = document.createElement("div");
      Q.className = "text-gray-500", Q.textContent = ue;
      const re = document.createElement("span");
      re.className = `placement-status text-xs ${yt ? "text-green-600" : "text-amber-600"}`, re.textContent = yt ? "Placed" : "Not placed", N.appendChild(H), N.appendChild(Q), Ve.appendChild(M), Ve.appendChild(N), Ve.appendChild(re), Ve.addEventListener("dragstart", (B) => {
        if (yt) {
          B.preventDefault();
          return;
        }
        B.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: V,
          fieldType: J,
          participantId: ie,
          participantName: ue
        })), B.dataTransfer && (B.dataTransfer.effectAllowed = "copy"), Ve.classList.add("opacity-50");
      }), Ve.addEventListener("dragend", () => {
        Ve.classList.remove("opacity-50");
      }), y.fieldsList?.appendChild(Ve);
      const ae = w[q + 1];
      Ae && ae && ae.linkGroupId === Ae && y.fieldsList?.appendChild(Me(V, !rt));
    }), Ue(), ye();
  }
  function at() {
    dt();
  }
  function He(y, w) {
    w ? (f.linkGroupState = ji(f.linkGroupState, y), window.toastManager?.info?.("Field unlinked")) : (f.linkGroupState = qi(f.linkGroupState, y), window.toastManager?.info?.("Field re-linked")), at();
  }
  async function We(y) {
    const w = f.pdfDoc;
    if (!w) return;
    const I = k();
    if (!I.canvas || !I.canvasContainer) return;
    const q = I.canvas.getContext("2d"), V = await w.getPage(y), J = V.getViewport({ scale: f.scale });
    I.canvas.width = J.width, I.canvas.height = J.height, I.canvasContainer.style.width = `${J.width}px`, I.canvasContainer.style.height = `${J.height}px`, await V.render({
      canvasContext: q,
      viewport: J
    }).promise, I.currentPage && (I.currentPage.textContent = String(y)), Fe();
  }
  function ve(y) {
    const w = oa(f.linkGroupState, y);
    w && (f.linkGroupState = dr(f.linkGroupState, w.updatedGroup));
  }
  function z(y) {
    const w = /* @__PURE__ */ new Map();
    s().forEach((q) => {
      const V = String(q.definitionId || "").trim();
      V && w.set(V, {
        type: String(q.fieldType || "text").trim() || "text",
        participantId: String(q.participantId || "").trim(),
        participantName: String(q.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(q.page || "1"), 10) || 1,
        linkGroupId: f.linkGroupState.definitionToGroup.get(V)
      });
    });
    let I = 0;
    for (; I < 10; ) {
      const q = ca(
        f.linkGroupState,
        y,
        f.fieldInstances,
        w
      );
      if (!q || !q.newPlacement) break;
      f.fieldInstances.push(q.newPlacement), ge(q.newPlacement.definitionId, !0), I += 1;
    }
    I > 0 && (Fe(), ye(), pe(), De(I));
  }
  function Ie(y) {
    ve(y);
  }
  function Fe() {
    const w = k().overlays;
    w && (w.innerHTML = "", w.style.pointerEvents = "auto", f.fieldInstances.filter((I) => I.page === f.currentPage).forEach((I) => {
      const q = zt[I.type] || zt.text, V = f.selectedFieldId === I.id, J = I.placementSource === vt.AUTO_LINKED, ie = document.createElement("div"), ue = J ? "border-dashed" : "border-solid";
      ie.className = `field-overlay absolute cursor-move ${q.border} border-2 ${ue} rounded`, ie.style.cssText = `
          left: ${I.x * f.scale}px;
          top: ${I.y * f.scale}px;
          width: ${I.width * f.scale}px;
          height: ${I.height * f.scale}px;
          background-color: ${q.fill};
          ${V ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, ie.dataset.instanceId = I.id;
      const Be = document.createElement("div");
      if (Be.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${q.bg}`, Be.textContent = `${I.type.replace("_", " ")} - ${I.participantName}`, ie.appendChild(Be), J) {
        const qe = document.createElement("div");
        qe.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", qe.title = "Auto-linked from template", qe.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, ie.appendChild(qe);
      }
      const Ae = document.createElement("div");
      Ae.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Ae.style.cssText = "transform: translate(50%, 50%);", ie.appendChild(Ae);
      const rt = document.createElement("button");
      rt.type = "button", rt.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", rt.innerHTML = "×", rt.addEventListener("click", (qe) => {
        qe.stopPropagation(), Se(I.id);
      }), ie.appendChild(rt), ie.addEventListener("mousedown", (qe) => {
        qe.target === Ae ? ht(qe, I) : qe.target !== rt && it(qe, I, ie);
      }), ie.addEventListener("click", () => {
        f.selectedFieldId = I.id, Fe();
      }), w.appendChild(ie);
    }));
  }
  function Xe(y, w, I, q = {}) {
    const V = fn[y.fieldType] || fn.text, J = q.placementSource || vt.MANUAL, ie = q.linkGroupId || ur(f.linkGroupState, y.definitionId)?.id, ue = {
      id: x("fi"),
      definitionId: y.definitionId,
      type: y.fieldType,
      participantId: y.participantId,
      participantName: y.participantName,
      page: f.currentPage,
      x: Math.max(0, w - V.width / 2),
      y: Math.max(0, I - V.height / 2),
      width: V.width,
      height: V.height,
      placementSource: J,
      linkGroupId: ie,
      linkedFromFieldId: q.linkedFromFieldId
    };
    f.fieldInstances.push(ue), ge(y.definitionId), J === vt.MANUAL && ie && Ie(ue), Fe(), ye(), pe();
  }
  function Qe(y, w) {
    const I = {
      id: x("instance"),
      definitionId: y.definitionId,
      type: y.fieldType,
      participantId: y.participantId,
      participantName: y.participantName,
      page: w.page_number,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      placementSource: vt.AUTO,
      resolverId: w.resolver_id,
      confidence: w.confidence,
      placementRunId: _.currentRunId
    };
    f.fieldInstances.push(I), ge(y.definitionId), Fe(), ye(), pe();
  }
  function it(y, w, I) {
    y.preventDefault(), f.isDragging = !0, f.selectedFieldId = w.id;
    const q = y.clientX, V = y.clientY, J = w.x * f.scale, ie = w.y * f.scale;
    function ue(Ae) {
      const rt = Ae.clientX - q, qe = Ae.clientY - V;
      w.x = Math.max(0, (J + rt) / f.scale), w.y = Math.max(0, (ie + qe) / f.scale), w.placementSource = vt.MANUAL, I.style.left = `${w.x * f.scale}px`, I.style.top = `${w.y * f.scale}px`;
    }
    function Be() {
      f.isDragging = !1, document.removeEventListener("mousemove", ue), document.removeEventListener("mouseup", Be), pe();
    }
    document.addEventListener("mousemove", ue), document.addEventListener("mouseup", Be);
  }
  function ht(y, w) {
    y.preventDefault(), y.stopPropagation(), f.isResizing = !0;
    const I = y.clientX, q = y.clientY, V = w.width, J = w.height;
    function ie(Be) {
      const Ae = (Be.clientX - I) / f.scale, rt = (Be.clientY - q) / f.scale;
      w.width = Math.max(30, V + Ae), w.height = Math.max(20, J + rt), w.placementSource = vt.MANUAL, Fe();
    }
    function ue() {
      f.isResizing = !1, document.removeEventListener("mousemove", ie), document.removeEventListener("mouseup", ue), pe();
    }
    document.addEventListener("mousemove", ie), document.addEventListener("mouseup", ue);
  }
  function Se(y) {
    const w = f.fieldInstances.find((I) => I.id === y);
    w && (f.fieldInstances = f.fieldInstances.filter((I) => I.id !== y), oe(w.definitionId), Fe(), ye(), pe());
  }
  function Le(y, w) {
    const q = k().canvas;
    !y || !q || (y.addEventListener("dragover", (V) => {
      V.preventDefault(), V.dataTransfer && (V.dataTransfer.dropEffect = "copy"), q.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), y.addEventListener("dragleave", () => {
      q.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), y.addEventListener("drop", (V) => {
      V.preventDefault(), q.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const J = V.dataTransfer?.getData("application/json") || "";
      if (!J) return;
      const ie = JSON.parse(J), ue = q.getBoundingClientRect(), Be = (V.clientX - ue.left) / f.scale, Ae = (V.clientY - ue.top) / f.scale;
      Xe(ie, Be, Ae);
    }));
  }
  function Re() {
    const y = k();
    y.prevBtn?.addEventListener("click", async () => {
      f.currentPage > 1 && (f.currentPage -= 1, z(f.currentPage), await We(f.currentPage));
    }), y.nextBtn?.addEventListener("click", async () => {
      f.currentPage < f.totalPages && (f.currentPage += 1, z(f.currentPage), await We(f.currentPage));
    });
  }
  function Ze() {
    const y = k();
    y.zoomIn?.addEventListener("click", async () => {
      f.scale = Math.min(3, f.scale + 0.25), y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await We(f.currentPage);
    }), y.zoomOut?.addEventListener("click", async () => {
      f.scale = Math.max(0.5, f.scale - 0.25), y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await We(f.currentPage);
    }), y.zoomFit?.addEventListener("click", async () => {
      if (!f.pdfDoc || !y.viewer) return;
      const I = (await f.pdfDoc.getPage(f.currentPage)).getViewport({ scale: 1 });
      f.scale = (y.viewer.clientWidth - 40) / I.width, y.zoomLevel && (y.zoomLevel.textContent = `${Math.round(f.scale * 100)}%`), await We(f.currentPage);
    });
  }
  function A() {
    return k().policyPreset?.value || "balanced";
  }
  function F(y) {
    return y >= 0.8 ? "bg-green-100 text-green-800" : y >= 0.6 ? "bg-blue-100 text-blue-800" : y >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function O(y) {
    return y >= 0.9 ? "bg-green-100 text-green-800" : y >= 0.7 ? "bg-blue-100 text-blue-800" : y >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function te(y) {
    return y ? y.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Unknown";
  }
  function ne(y) {
    y.page_number !== f.currentPage && (f.currentPage = y.page_number, We(y.page_number));
    const w = k().overlays;
    if (!w) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const I = document.createElement("div");
    I.id = "suggestion-preview-overlay", I.className = "absolute pointer-events-none animate-pulse", I.style.cssText = `
      left: ${y.x * f.scale}px;
      top: ${y.y * f.scale}px;
      width: ${y.width * f.scale}px;
      height: ${y.height * f.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, w.appendChild(I), setTimeout(() => I.remove(), 3e3);
  }
  async function le(y, w) {
  }
  function Y() {
    const y = document.getElementById("placement-suggestions-modal");
    if (!y) return;
    const w = y.querySelectorAll('.suggestion-item[data-accepted="true"]');
    w.forEach((I) => {
      const q = Number.parseInt(I.dataset.index || "", 10), V = _.suggestions[q];
      if (!V) return;
      const J = h(V.field_definition_id);
      if (!J) return;
      const ie = L(V.field_definition_id);
      if (!ie || ie.classList.contains("opacity-50")) return;
      const ue = {
        definitionId: V.field_definition_id,
        fieldType: J.type,
        participantId: J.participant_id,
        participantName: ie.dataset.participantName || J.participant_name || "Unassigned"
      };
      f.currentPage = V.page_number, Qe(ue, V);
    }), f.pdfDoc && We(f.currentPage), le(w.length, _.suggestions.length - w.length), S(`Applied ${w.length} placement${w.length !== 1 ? "s" : ""}`, "success");
  }
  function xe(y) {
    y.querySelectorAll(".accept-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const I = w.closest(".suggestion-item");
        I && (I.classList.add("border-green-500", "bg-green-50"), I.classList.remove("border-red-500", "bg-red-50"), I.dataset.accepted = "true");
      });
    }), y.querySelectorAll(".reject-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const I = w.closest(".suggestion-item");
        I && (I.classList.add("border-red-500", "bg-red-50"), I.classList.remove("border-green-500", "bg-green-50"), I.dataset.accepted = "false");
      });
    }), y.querySelectorAll(".preview-suggestion-btn").forEach((w) => {
      w.addEventListener("click", () => {
        const I = Number.parseInt(w.dataset.index || "", 10), q = _.suggestions[I];
        q && ne(q);
      });
    });
  }
  function fe() {
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
    `, G(y, "#close-suggestions-modal")?.addEventListener("click", () => {
      y.classList.add("hidden");
    }), y.addEventListener("click", (w) => {
      w.target === y && y.classList.add("hidden");
    }), G(y, "#accept-all-btn")?.addEventListener("click", () => {
      y.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-green-500", "bg-green-50"), w.classList.remove("border-red-500", "bg-red-50"), w.dataset.accepted = "true";
      });
    }), G(y, "#reject-all-btn")?.addEventListener("click", () => {
      y.querySelectorAll(".suggestion-item").forEach((w) => {
        w.classList.add("border-red-500", "bg-red-50"), w.classList.remove("border-green-500", "bg-green-50"), w.dataset.accepted = "false";
      });
    }), G(y, "#apply-suggestions-btn")?.addEventListener("click", () => {
      Y(), y.classList.add("hidden");
    }), G(y, "#rerun-placement-btn")?.addEventListener("click", () => {
      y.classList.add("hidden");
      const w = U(y, "#placement-policy-preset-modal"), I = k().policyPreset;
      I && w && (I.value = w.value), k().autoPlaceBtn?.click();
    }), y;
  }
  function Z(y) {
    let w = document.getElementById("placement-suggestions-modal");
    w || (w = fe(), document.body.appendChild(w));
    const I = U(w, "#suggestions-list"), q = U(w, "#resolver-info"), V = U(w, "#run-stats");
    !I || !q || !V || (q.innerHTML = _.resolverScores.map((J) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${P(String(J?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${J.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${F(Number(J.score || 0))}">
              ${(Number(J?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), V.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${P(String(y?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${y.status === "completed" ? "text-green-600" : "text-amber-600"}">${P(String(y?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(y?.elapsed_ms || 0))}ms</span>
      </div>
    `, I.innerHTML = _.suggestions.map((J, ie) => {
      const ue = h(J.field_definition_id), Be = zt[ue?.type || "text"] || zt.text, Ae = P(String(ue?.type || "field").replace(/_/g, " ")), rt = P(String(J?.id || "")), qe = Math.max(1, Number(J?.page_number || 1)), yt = Math.round(Number(J?.x || 0)), Ve = Math.round(Number(J?.y || 0)), M = Math.max(0, Number(J?.confidence || 0)), N = P(te(String(J?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${ie}" data-suggestion-id="${rt}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Be.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${Ae}</div>
                <div class="text-xs text-gray-500">Page ${qe}, (${yt}, ${Ve})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${O(Number(J.confidence || 0))}">
                ${(M * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${N}
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
    }).join(""), xe(w), w.classList.remove("hidden"));
  }
  function ee() {
    const y = j();
    let w = 100;
    y.forEach((I) => {
      const q = {
        definitionId: I.dataset.definitionId || "",
        fieldType: I.dataset.fieldType || "text",
        participantId: I.dataset.participantId || "",
        participantName: I.dataset.participantName || "Unassigned"
      }, V = fn[q.fieldType || "text"] || fn.text;
      f.currentPage = f.totalPages, Xe(q, 300, w + V.height / 2, { placementSource: vt.AUTO_FALLBACK }), w += V.height + 20;
    }), f.pdfDoc && We(f.totalPages), S("Fields placed using fallback layout", "info");
  }
  async function Ee() {
    const y = k();
    if (!y.autoPlaceBtn || _.isRunning) return;
    if (j().length === 0) {
      S("All fields are already placed", "info");
      return;
    }
    const I = document.querySelector('input[name="id"]')?.value;
    if (!I) {
      ee();
      return;
    }
    _.isRunning = !0, y.autoPlaceBtn.disabled = !0, y.autoPlaceBtn.innerHTML = `
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
          policy_preset: A()
        })
      });
      if (!q.ok)
        throw await m(q, "Auto-placement failed");
      const V = await q.json(), J = da(V) ? V.run || {} : V;
      _.currentRunId = J?.run_id || J?.id || null, _.suggestions = J?.suggestions || [], _.resolverScores = J?.resolver_scores || [], _.suggestions.length === 0 ? (S("No placement suggestions found. Try placing fields manually.", "warning"), ee()) : Z(J);
    } catch (q) {
      console.error("Auto-place error:", q);
      const V = q && typeof q == "object" ? q : {}, J = b(V.message || "Auto-placement failed", V.code || "", V.status || 0);
      S(`Auto-placement failed: ${J}`, "error"), ee();
    } finally {
      _.isRunning = !1, y.autoPlaceBtn.disabled = !1, y.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function _e() {
    const y = k();
    y.autoPlaceBtn && !f.autoPlaceBound && (y.autoPlaceBtn.addEventListener("click", () => {
      Ee();
    }), f.autoPlaceBound = !0);
  }
  async function ke() {
    const y = k();
    if (!n?.value) {
      y.loading?.classList.add("hidden"), y.noDocument?.classList.remove("hidden");
      return;
    }
    y.loading?.classList.remove("hidden"), y.noDocument?.classList.add("hidden");
    const w = s(), I = new Set(
      w.map((ue) => String(ue.definitionId || "").trim()).filter((ue) => ue)
    );
    f.fieldInstances = f.fieldInstances.filter(
      (ue) => I.has(String(ue.definitionId || "").trim())
    ), dt();
    const q = ++f.loadRequestVersion, V = String(n.value || "").trim(), J = encodeURIComponent(V), ie = `${e}/panels/esign_documents/${J}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const Be = await window.pdfjsLib.getDocument({
        url: ie,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (q !== f.loadRequestVersion)
        return;
      f.pdfDoc = Be, f.totalPages = f.pdfDoc.numPages, f.currentPage = 1, y.totalPages && (y.totalPages.textContent = String(f.totalPages)), await We(f.currentPage), y.loading?.classList.add("hidden"), f.uiHandlersBound || (Le(y.viewer, y.overlays), Re(), Ze(), f.uiHandlersBound = !0), Fe();
    } catch (ue) {
      if (q !== f.loadRequestVersion)
        return;
      if (console.error("Failed to load PDF:", ue), y.loading?.classList.add("hidden"), y.noDocument?.classList.remove("hidden"), y.noDocument) {
        const Be = ue && typeof ue == "object" ? ue : {};
        y.noDocument.textContent = `Failed to load PDF: ${b(Be.message || "Failed to load PDF")}`;
      }
    }
    ye(), pe({ silent: !0 });
  }
  function ze(y) {
    const w = Array.isArray(y?.fieldPlacements) ? y.fieldPlacements : [];
    f.fieldInstances = w.map((I, q) => Zt(I, q)), pe({ silent: !0 });
  }
  return pe({ silent: !0 }), {
    bindEvents: _e,
    initPlacementEditor: ke,
    getState: D,
    getLinkGroupState: X,
    setLinkGroupState: he,
    buildPlacementFormEntries: ce,
    updateFieldInstancesFormData: pe,
    restoreFieldPlacementsFromState: ze
  };
}
function Nt(i, e, t = "") {
  return String(i.querySelector(e)?.value || t).trim();
}
function Gi(i, e, t = !1) {
  const n = i.querySelector(e);
  return n ? n.checked : t;
}
function pa(i) {
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
    totalWizardSteps: P
  } = i;
  function E() {
    const f = [];
    c.querySelectorAll(".participant-entry").forEach((j) => {
      const G = String(j.getAttribute("data-participant-id") || "").trim(), U = Nt(j, 'input[name*=".name"]'), k = Nt(j, 'input[name*=".email"]'), D = Nt(j, 'select[name*=".role"]', "signer"), X = Gi(j, ".notify-input", !0), he = Nt(j, ".signing-stage-input"), ce = Number(he || "1") || 1;
      f.push({
        id: G,
        name: U,
        email: k,
        role: D,
        notify: X,
        signing_stage: D === "signer" ? ce : 0
      });
    });
    const _ = [];
    d.querySelectorAll(".field-definition-entry").forEach((j) => {
      const G = String(j.getAttribute("data-field-definition-id") || "").trim(), U = Nt(j, ".field-type-select", "signature"), k = Nt(j, ".field-participant-select"), D = Number(Nt(j, 'input[name*=".page"]', "1")) || 1, X = Gi(j, 'input[name*=".required"]');
      G && _.push({
        id: G,
        type: U,
        participant_id: k,
        page: D,
        required: X
      });
    });
    const x = b(), L = JSON.stringify(x);
    return s && (s.value = L), {
      document_id: String(e?.value || "").trim(),
      title: String(n?.value || "").trim(),
      message: String(r?.value || "").trim(),
      participants: f,
      field_instances: _,
      field_placements: x,
      field_placements_json: L,
      field_rules: m(),
      field_rules_json: String(h?.value || "[]"),
      send_for_signature: S() === P ? 1 : 0,
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
function ga(i) {
  const {
    titleSource: e,
    stateManager: t,
    trackWizardStateChanges: n,
    participantsController: r,
    fieldDefinitionsController: c,
    placementController: d,
    updateFieldParticipantOptions: s,
    previewCard: h,
    wizardNavigationController: m,
    documentIdInput: b,
    documentPageCountInput: S,
    selectedDocumentTitle: P,
    agreementRefs: E,
    parsePositiveInt: f,
    isEditMode: _
  } = i;
  let x = null, L = !1;
  function j(oe) {
    L = !0;
    try {
      return oe();
    } finally {
      L = !1;
    }
  }
  function G(oe) {
    const be = oe?.document, De = document.getElementById("selected-document"), Me = document.getElementById("document-picker"), we = document.getElementById("selected-document-info");
    if (b.value = String(be?.id || "").trim(), S) {
      const Ue = f(be?.pageCount, 0) || 0;
      S.value = Ue > 0 ? String(Ue) : "";
    }
    if (P && (P.textContent = String(be?.title || "").trim()), we instanceof HTMLElement) {
      const Ue = f(be?.pageCount, 0) || 0;
      we.textContent = Ue > 0 ? `${Ue} pages` : "";
    }
    if (b.value) {
      De?.classList.remove("hidden"), Me?.classList.add("hidden");
      return;
    }
    De?.classList.add("hidden"), Me?.classList.remove("hidden");
  }
  function U(oe) {
    E.form.titleInput.value = String(oe?.details?.title || ""), E.form.messageInput.value = String(oe?.details?.message || "");
  }
  function k() {
    L || (x !== null && clearTimeout(x), x = setTimeout(() => {
      n();
    }, 500));
  }
  function D(oe) {
    r.restoreFromState(oe);
  }
  function X(oe) {
    c.restoreFieldDefinitionsFromState(oe);
  }
  function he(oe) {
    c.restoreFieldRulesFromState(oe);
  }
  function ce(oe) {
    d.restoreFieldPlacementsFromState(oe);
  }
  function pe() {
    b && new MutationObserver(() => {
      L || n();
    }).observe(b, { attributes: !0, attributeFilter: ["value"] });
    const oe = document.getElementById("title"), be = document.getElementById("message");
    oe instanceof HTMLInputElement && oe.addEventListener("input", () => {
      const De = String(oe.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(De), k();
    }), (be instanceof HTMLInputElement || be instanceof HTMLTextAreaElement) && be.addEventListener("input", k), r.refs.participantsContainer?.addEventListener("input", k), r.refs.participantsContainer?.addEventListener("change", k), c.refs.fieldDefinitionsContainer?.addEventListener("input", k), c.refs.fieldDefinitionsContainer?.addEventListener("change", k), c.refs.fieldRulesContainer?.addEventListener("input", k), c.refs.fieldRulesContainer?.addEventListener("change", k);
  }
  function ye(oe, be = {}) {
    j(() => {
      if (G(oe), U(oe), D(oe), X(oe), he(oe), s(), ce(oe), be.updatePreview !== !1) {
        const Me = oe?.document;
        Me?.id ? h.setDocument(
          Me.id,
          Me.title || null,
          Me.pageCount ?? null
        ) : h.clear();
      }
      const De = f(
        be.step ?? oe?.currentStep,
        m.getCurrentStep()
      ) || 1;
      m.setCurrentStep(De), m.updateWizardUI();
    });
  }
  function ge() {
    if (m.updateWizardUI(), b.value) {
      const oe = P?.textContent || null, be = f(S?.value, 0) || null;
      h.setDocument(b.value, oe, be);
    } else
      h.clear();
    _ && E.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: pe,
    debouncedTrackChanges: k,
    applyStateToUI: ye,
    renderInitialWizardUI: ge
  };
}
function ma(i) {
  return i.querySelector('select[name*=".role"]');
}
function fa(i) {
  return i.querySelector(".field-participant-select");
}
function ha(i) {
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
  function P(E) {
    switch (E) {
      case 1:
        return e.value ? !!s() : (S("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (S("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const f = n.querySelectorAll(".participant-entry");
        if (f.length === 0)
          return S("Please add at least one participant"), !1;
        let _ = !1;
        return f.forEach((x) => {
          ma(x)?.value === "signer" && (_ = !0);
        }), _ ? !0 : (S("At least one signer is required"), !1);
      }
      case 4: {
        const f = r.querySelectorAll(".field-definition-entry");
        for (const j of Array.from(f)) {
          const G = fa(j);
          if (!G?.value)
            return S("Please assign all fields to a signer"), G?.focus(), !1;
        }
        if (h().find((j) => !j.participantId))
          return S("Please assign all automation rules to a signer"), c?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const L = m();
        return L.length > 0 ? (S(b(L)), d.focus(), !1) : !0;
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
function va(i) {
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
  function S(U, k) {
    return n.normalizeLoadedState({
      ...k,
      currentStep: U.currentStep,
      document: U.document,
      details: U.details,
      participants: U.participants,
      fieldDefinitions: U.fieldDefinitions,
      fieldPlacements: U.fieldPlacements,
      fieldRules: U.fieldRules,
      titleSource: U.titleSource,
      syncPending: !0,
      serverDraftId: k.serverDraftId,
      serverRevision: k.serverRevision,
      lastSyncedAt: k.lastSyncedAt
    });
  }
  async function P() {
    if (e) return n.getState();
    const U = n.normalizeLoadedState(n.getState());
    xt("resume_reconcile_start", tt({
      state: U,
      storageKey: t,
      ownership: b?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const k = String(U?.serverDraftId || "").trim();
    if (!k) {
      if (!s(U))
        try {
          const D = await c.bootstrap();
          return n.setState({
            ...D.snapshot?.data?.wizard_state && typeof D.snapshot.data.wizard_state == "object" ? D.snapshot.data.wizard_state : {},
            resourceRef: D.resourceRef,
            serverDraftId: String(D.snapshot?.ref?.id || "").trim() || null,
            serverRevision: Number(D.snapshot?.revision || 0),
            lastSyncedAt: String(D.snapshot?.updatedAt || "").trim() || null,
            syncPending: !1
          }, { syncPending: !1, notify: !1 }), n.getState();
        } catch {
          _t("resume_reconcile_bootstrap_failed", tt({
            state: U,
            storageKey: t,
            ownership: b?.() || void 0,
            sendAttemptId: null,
            extra: {
              source: "bootstrap_failed_keep_local"
            }
          }));
        }
      return n.setState(U, { syncPending: !!U.syncPending, notify: !1 }), xt("resume_reconcile_complete", tt({
        state: U,
        storageKey: t,
        ownership: b?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), n.getState();
    }
    try {
      const D = await c.load(k), X = n.normalizeLoadedState({
        ...D?.wizard_state && typeof D.wizard_state == "object" ? D.wizard_state : {},
        resourceRef: D?.resource_ref || U.resourceRef || null,
        serverDraftId: String(D?.id || k).trim() || k,
        serverRevision: Number(D?.revision || 0),
        lastSyncedAt: String(D?.updated_at || D?.updatedAt || "").trim() || U.lastSyncedAt,
        syncPending: !1
      }), he = String(U.serverDraftId || "").trim() === String(X.serverDraftId || "").trim(), ce = he && U.syncPending === !0 ? S(U, X) : X;
      return n.setState(ce, { syncPending: !!ce.syncPending, notify: !1 }), xt("resume_reconcile_complete", tt({
        state: ce,
        storageKey: t,
        ownership: b?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: he && U.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(D?.id || k).trim() || null,
          loadedRevision: Number(D?.revision || 0)
        }
      })), n.getState();
    } catch (D) {
      const X = typeof D == "object" && D !== null && "status" in D ? Number(D.status || 0) : 0;
      if (X === 404) {
        const he = n.normalizeLoadedState({
          ...U,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return n.setState(he, { syncPending: !!he.syncPending, notify: !1 }), _t("resume_reconcile_remote_missing", tt({
          state: he,
          storageKey: t,
          ownership: b?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: k,
            status: X
          }
        })), n.getState();
      }
      return _t("resume_reconcile_failed", tt({
        state: U,
        storageKey: t,
        ownership: b?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: k,
          status: X
        }
      })), n.getState();
    }
  }
  function E(U) {
    return document.getElementById(U);
  }
  function f() {
    const U = document.getElementById("resume-dialog-modal"), k = n.getState(), D = String(k?.document?.title || "").trim() || String(k?.document?.id || "").trim() || "Unknown document", X = E("resume-draft-title"), he = E("resume-draft-document"), ce = E("resume-draft-step"), pe = E("resume-draft-time");
    X && (X.textContent = k.details?.title || "Untitled Agreement"), he && (he.textContent = D), ce && (ce.textContent = String(k.currentStep || 1)), pe && (pe.textContent = h(k.updatedAt)), U?.classList.remove("hidden"), m("wizard_resume_prompt_shown", {
      step: Number(k.currentStep || 1),
      has_server_draft: !!k.serverDraftId
    });
  }
  async function _(U = {}) {
    const k = U.deleteServerDraft === !0, D = String(n.getState()?.serverDraftId || "").trim();
    if (n.clear(), r.broadcastStateUpdate(), D && r.broadcastDraftDisposed?.(D, k ? "resume_clear_delete" : "resume_clear_local"), !(!k || !D))
      try {
        await c.dispose(D);
      } catch (X) {
        console.warn("Failed to delete server draft:", X);
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
  async function L(U) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const k = x();
    switch (U) {
      case "continue":
        !String(n.getState()?.serverDraftId || "").trim() && s(k) && await c.create(k), d(n.getState());
        return;
      case "start_new":
        await _({ deleteServerDraft: !1 }), s(k) ? await c.create(k) : await P(), d(n.getState());
        return;
      case "proceed":
        await _({ deleteServerDraft: !0 }), s(k) ? await c.create(k) : await P(), d(n.getState());
        return;
      case "discard":
        await _({ deleteServerDraft: !0 }), await P(), d(n.getState());
        return;
      default:
        return;
    }
  }
  function j() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      L("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      L("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      L("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      L("discard");
    });
  }
  async function G() {
    e || (await P(), n.hasResumableState() && f());
  }
  return {
    bindEvents: j,
    reconcileBootstrapState: P,
    maybeShowResumeDialog: G
  };
}
function ya(i) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: n
  } = i;
  let r = "saved";
  function c(E) {
    if (!E) return "unknown";
    const f = new Date(E), x = (/* @__PURE__ */ new Date()).getTime() - f.getTime(), L = Math.floor(x / 6e4), j = Math.floor(x / 36e5), G = Math.floor(x / 864e5);
    return L < 1 ? "just now" : L < 60 ? `${L} minute${L !== 1 ? "s" : ""} ago` : j < 24 ? `${j} hour${j !== 1 ? "s" : ""} ago` : G < 7 ? `${G} day${G !== 1 ? "s" : ""} ago` : f.toLocaleDateString();
  }
  function d() {
    const E = n.getState();
    r === "paused" && s(E?.syncPending ? "pending" : "saved");
  }
  function s(E) {
    r = String(E || "").trim() || "saved";
    const f = e.sync.indicator, _ = e.sync.icon, x = e.sync.text, L = e.sync.retryBtn;
    if (!(!f || !_ || !x))
      switch (f.classList.remove("hidden"), E) {
        case "saved":
          _.className = "w-2 h-2 rounded-full bg-green-500", x.textContent = "Saved", x.className = "text-gray-600", L?.classList.add("hidden");
          break;
        case "saving":
          _.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", x.textContent = "Saving...", x.className = "text-gray-600", L?.classList.add("hidden");
          break;
        case "pending":
          _.className = "w-2 h-2 rounded-full bg-gray-400", x.textContent = "Unsaved changes", x.className = "text-gray-500", L?.classList.add("hidden");
          break;
        case "error":
          _.className = "w-2 h-2 rounded-full bg-amber-500", x.textContent = "Not synced", x.className = "text-amber-600", L?.classList.remove("hidden");
          break;
        case "paused":
          _.className = "w-2 h-2 rounded-full bg-slate-400", x.textContent = "Open in another tab", x.className = "text-slate-600", L?.classList.add("hidden");
          break;
        case "conflict":
          _.className = "w-2 h-2 rounded-full bg-red-500", x.textContent = "Conflict", x.className = "text-red-600", L?.classList.add("hidden");
          break;
        default:
          f.classList.add("hidden");
      }
  }
  function h(E) {
    const f = n.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = c(f.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(E || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function m(E, f = "", _ = 0) {
    const x = String(f || "").trim().toUpperCase(), L = String(E || "").trim().toLowerCase();
    return x === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : x === "DRAFT_SEND_NOT_FOUND" || x === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : x === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : x === "SCOPE_DENIED" || L.includes("scope denied") ? "You don't have access to this organization's resources." : x === "TRANSPORT_SECURITY" || x === "TRANSPORT_SECURITY_REQUIRED" || L.includes("tls transport required") || Number(_) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : x === "PDF_UNSUPPORTED" || L === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(E || "").trim() !== "" ? String(E).trim() : "Something went wrong. Please try again.";
  }
  async function b(E, f = "") {
    const _ = Number(E?.status || 0);
    let x = "", L = "", j = {};
    try {
      const G = await E.json();
      x = String(G?.error?.code || G?.code || "").trim(), L = String(G?.error?.message || G?.message || "").trim(), j = G?.error?.details && typeof G.error.details == "object" ? G.error.details : {}, String(j?.entity || "").trim().toLowerCase() === "drafts" && String(x).trim().toUpperCase() === "NOT_FOUND" && (x = "DRAFT_SEND_NOT_FOUND", L === "" && (L = "Draft not found"));
    } catch {
      L = "";
    }
    return L === "" && (L = f || `Request failed (${_ || "unknown"})`), {
      status: _,
      code: x,
      details: j,
      message: m(L, x, _)
    };
  }
  function S(E, f = "", _ = 0) {
    const x = m(E, f, _);
    t && (t.textContent = x), window.toastManager?.error ? window.toastManager.error(x) : alert(x);
  }
  async function P(E, f = {}) {
    const _ = await E;
    return _?.blocked && _.reason === "passive_tab" ? (S(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), _) : (_?.error && String(f.errorMessage || "").trim() !== "" && S(f.errorMessage || ""), _);
  }
  return {
    announceError: S,
    formatRelativeTime: c,
    mapUserFacingError: m,
    parseAPIError: b,
    restoreSyncStatusFromState: d,
    showSyncConflictDialog: h,
    surfaceSyncOutcome: P,
    updateSyncStatus: s
  };
}
function ba(i) {
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
    const P = n.getState()?.serverDraftId;
    n.clear(), r.broadcastStateUpdate(), P && (r.broadcastDraftDisposed?.(P, "agreement_created"), c.dispose(P).catch((E) => {
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
      const P = await s(r.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (P?.success || P?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
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
function pr(i, e = kt.AUTOFILL) {
  const t = String(i || "").trim().toLowerCase();
  return t === kt.USER ? kt.USER : t === kt.SERVER_SEED ? kt.SERVER_SEED : t === kt.AUTOFILL ? kt.AUTOFILL : e;
}
function wa(i, e = 0) {
  if (!i || typeof i != "object") return !1;
  const t = i, n = String(t.name ?? "").trim(), r = String(t.email ?? "").trim(), c = String(t.role ?? "signer").trim().toLowerCase(), d = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), s = t.notify !== !1;
  return n !== "" || r !== "" || c !== "" && c !== "signer" || Number.isFinite(d) && d > 1 || !s ? !0 : e > 0;
}
function Wi(i, e = {}) {
  const {
    normalizeTitleSource: t = pr,
    titleSource: n = kt
  } = e;
  if (!i || typeof i != "object") return !1;
  const r = Number.parseInt(String(i.currentStep ?? 1), 10);
  if (Number.isFinite(r) && r > 1 || String(i.document?.id ?? "").trim() !== "") return !0;
  const d = String(i.details?.title ?? "").trim(), s = String(i.details?.message ?? "").trim(), h = t(
    i.titleSource,
    d === "" ? n.AUTOFILL : n.USER
  );
  return !!(d !== "" && h !== n.SERVER_SEED || s !== "" || (Array.isArray(i.participants) ? i.participants : []).some((S, P) => wa(S, P)) || Array.isArray(i.fieldDefinitions) && i.fieldDefinitions.length > 0 || Array.isArray(i.fieldPlacements) && i.fieldPlacements.length > 0 || Array.isArray(i.fieldRules) && i.fieldRules.length > 0);
}
function Sa(i = {}) {
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, r = n.replace(/\/+$/, ""), c = /\/v\d+$/i.test(r) ? r : `${r}/v1`, d = !!e.is_edit, s = !!e.create_success, h = String(e.submit_mode || "json").trim().toLowerCase(), m = String(e.agreement_id || "").trim(), b = String(e.active_agreement_id || "").trim(), S = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, P = Array.isArray(e.initial_participants) ? e.initial_participants : [], E = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], f = e.sync && typeof e.sync == "object" ? e.sync : {}, _ = Array.isArray(f.action_operations) ? f.action_operations.map((G) => String(G || "").trim()).filter(Boolean) : [], x = `${c}/esign`, L = {
    base_url: String(f.base_url || "").trim() || x,
    bootstrap_path: String(f.bootstrap_path || "").trim() || `${x}/sync/bootstrap/agreement-draft`,
    client_base_path: String(f.client_base_path || "").trim() || `${t}/sync-client/sync-core`,
    resource_kind: String(f.resource_kind || "").trim() || "agreement_draft",
    storage_scope: String(f.storage_scope || "").trim(),
    action_operations: _.length > 0 ? _ : ["send", "dispose"]
  }, j = {
    sync: L,
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
    initial_participants: P,
    initial_field_instances: E
  };
  return {
    config: e,
    normalizedConfig: j,
    syncConfig: L,
    basePath: t,
    apiBase: n,
    apiVersionBase: c,
    isEditMode: d,
    createSuccess: s,
    submitMode: h,
    agreementID: m,
    activeAgreementID: b,
    documentsUploadURL: S,
    initialParticipants: P,
    initialFieldInstances: E
  };
}
function xa(i = !0) {
  const e = { Accept: "application/json" };
  return i && (e["Content-Type"] = "application/json"), e;
}
function Ia(i = {}) {
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
function Zn(i) {
  const e = document.createElement("div");
  return e.textContent = String(i ?? ""), e.innerHTML;
}
function Yi(i, e = "info") {
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
function Ea(i, e) {
  if (!(i instanceof HTMLButtonElement))
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return i;
}
function Ca(i = {}) {
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
    initialFieldInstances: P
  } = Sa(i), E = Rs(document), {
    WIZARD_STATE_VERSION: f,
    WIZARD_STORAGE_KEY: _,
    WIZARD_CHANNEL_NAME: x,
    SYNC_DEBOUNCE_MS: L,
    SYNC_RETRY_DELAYS: j,
    TITLE_SOURCE: G
  } = Ia({
    config: e,
    isEditMode: s
  }), U = Os(), k = (B, me = G.AUTOFILL) => pr(B, me), D = (B) => Wi(B, {
    normalizeTitleSource: k,
    titleSource: G
  }), X = Ts({
    apiBasePath: d,
    basePath: r
  }), he = E.form.root, ce = Ea(E.form.submitBtn, "submit button"), pe = E.form.announcements;
  let ye = null, ge = null, oe = null, be = null, De = null, Me = null, we = null, Ue = null, $e = Cn();
  const dt = (B, me = {}) => {
    be?.applyStateToUI(B, me);
  }, at = () => be?.debouncedTrackChanges?.(), He = () => Ue?.trackWizardStateChanges?.(), We = (B) => we?.formatRelativeTime(B) || "unknown", ve = () => we?.restoreSyncStatusFromState(), z = (B) => we?.updateSyncStatus(B), Ie = (B) => we?.showSyncConflictDialog(B), Fe = (B, me = "", et = 0) => we?.mapUserFacingError(B, me, et) || String(B || "").trim(), Xe = (B, me) => we ? we.parseAPIError(B, me) : Promise.resolve({ status: Number(B.status || 0), code: "", details: {}, message: me }), Qe = (B, me = "", et = 0) => we?.announceError(B, me, et), it = (B, me = {}) => we ? we.surfaceSyncOutcome(B, me) : Promise.resolve({}), ht = () => null, Se = Ms(E, {
    formatRelativeTime: We
  }), Le = () => Se.render({ coordinationAvailable: !0 }), Re = async (B, me) => {
    const et = await Xe(B, me), ot = new Error(et.message);
    return ot.code = et.code, ot.status = et.status, ot;
  }, Ze = {
    hasResumableState: () => A.hasResumableState(),
    setTitleSource: (B, me) => A.setTitleSource(B, me),
    updateDocument: (B) => A.updateDocument(B),
    updateDetails: (B, me) => A.updateDetails(B, me),
    getState: () => {
      const B = A.getState();
      return {
        titleSource: B.titleSource,
        details: B.details && typeof B.details == "object" ? B.details : {}
      };
    }
  }, A = new $s({
    storageKey: _,
    stateVersion: f,
    totalWizardSteps: pn,
    titleSource: G,
    normalizeTitleSource: k,
    parsePositiveInt: nt,
    hasMeaningfulWizardProgress: D,
    collectFormState: () => {
      const B = E.form.documentIdInput?.value || null, me = document.getElementById("selected-document-title")?.textContent?.trim() || null, et = k(
        A.getState()?.titleSource,
        String(E.form.titleInput?.value || "").trim() === "" ? G.AUTOFILL : G.USER
      );
      return {
        document: {
          id: B,
          title: me,
          pageCount: parseInt(E.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: E.form.titleInput?.value || "",
          message: E.form.messageInput?.value || ""
        },
        titleSource: et,
        participants: ye?.collectParticipantsForState?.() || [],
        fieldDefinitions: ge?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: oe?.getState?.()?.fieldInstances || [],
        fieldRules: ge?.collectFieldRulesForState?.() || []
      };
    },
    emitTelemetry: U
  });
  A.start(), we = ya({
    agreementRefs: E,
    formAnnouncements: pe,
    stateManager: A
  });
  const F = new Ns({
    stateManager: A,
    requestHeaders: xa,
    syncConfig: n
  });
  let O;
  const te = new Us({
    channelName: x,
    onCoordinationAvailabilityChange: (B) => {
      ve(), Se.render({ coordinationAvailable: B });
    },
    onRemoteSync: (B) => {
      String(A.getState()?.serverDraftId || "").trim() === String(B || "").trim() && (A.getState()?.syncPending || O?.refreshCurrentDraft({ preserveDirty: !0, force: !0 }).then(() => {
        dt(A.getState(), {
          step: Number(A.getState()?.currentStep || 1)
        });
      }));
    },
    onRemoteDraftDisposed: (B) => {
      String(A.getState()?.serverDraftId || "").trim() === String(B || "").trim() && (A.getState()?.syncPending || A.setState({
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
  O = new zs({
    stateManager: A,
    syncService: F,
    activeTabController: te,
    storageKey: _,
    statusUpdater: z,
    showConflictDialog: Ie,
    syncDebounceMs: L,
    syncRetryDelays: j,
    documentRef: document,
    windowRef: window
  });
  const le = Ds({
    context: {
      config: t,
      refs: E,
      basePath: r,
      apiBase: c,
      apiVersionBase: d,
      previewCard: X,
      emitTelemetry: U,
      stateManager: A,
      syncService: F,
      activeTabController: te,
      syncController: O
    },
    hooks: {
      renderInitialUI() {
        be?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        Me?.maybeShowResumeDialog?.(), Y.loadDocuments(), Y.loadRecentDocuments();
      },
      destroy() {
        Se.destroy(), A.destroy();
      }
    }
  }), Y = ia({
    apiBase: c,
    apiVersionBase: d,
    documentsUploadURL: b,
    isEditMode: s,
    titleSource: G,
    normalizeTitleSource: k,
    stateManager: Ze,
    previewCard: X,
    parseAPIError: Re,
    announceError: Qe,
    showToast: Yi,
    mapUserFacingError: Fe,
    renderFieldRulePreview: () => ge?.renderFieldRulePreview?.()
  });
  Y.initializeTitleSourceSeed(), Y.bindEvents();
  const xe = Ot(Y.refs.documentIdInput, "document id input"), fe = Ot(Y.refs.documentSearch, "document search input"), Z = Y.refs.selectedDocumentTitle, ee = Y.refs.documentPageCountInput, Ee = Y.ensureSelectedDocumentCompatibility, _e = Y.getCurrentDocumentPageCount;
  ye = ra({
    initialParticipants: S,
    onParticipantsChanged: () => ge?.updateFieldParticipantOptions?.()
  }), ye.initialize(), ye.bindEvents();
  const ke = Ot(ye.refs.participantsContainer, "participants container"), ze = Ot(ye.refs.addParticipantBtn, "add participant button"), y = () => ye?.getSignerParticipants() || [];
  ge = la({
    initialFieldInstances: P,
    placementSource: vt,
    getCurrentDocumentPageCount: _e,
    getSignerParticipants: y,
    escapeHtml: Zn,
    onDefinitionsChanged: () => at(),
    onRulesChanged: () => at(),
    onParticipantsChanged: () => ge?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => oe?.getLinkGroupState?.() || $e,
    setPlacementLinkGroupState: (B) => {
      $e = B || Cn(), oe?.setLinkGroupState?.($e);
    }
  }), ge.bindEvents(), ge.initialize();
  const w = Ot(ge.refs.fieldDefinitionsContainer, "field definitions container"), I = ge.refs.fieldRulesContainer, q = Ot(ge.refs.addFieldBtn, "add field button"), V = ge.refs.fieldPlacementsJSONInput, J = ge.refs.fieldRulesJSONInput, ie = () => ge?.collectFieldRulesForState() || [], ue = () => ge?.collectFieldRulesForState() || [], Be = () => ge?.collectFieldRulesForForm() || [], Ae = (B, me) => ge?.expandRulesForPreview(B, me) || [], rt = () => ge?.updateFieldParticipantOptions(), qe = () => ge.collectPlacementFieldDefinitions(), yt = (B) => ge?.getFieldDefinitionById(B) || null, Ve = () => ge?.findSignersMissingRequiredSignatureField() || [], M = (B) => ge?.missingSignatureFieldMessage(B) || "", N = qs({
    documentIdInput: xe,
    selectedDocumentTitle: Z,
    participantsContainer: ke,
    fieldDefinitionsContainer: w,
    submitBtn: ce,
    escapeHtml: Zn,
    getSignerParticipants: y,
    getCurrentDocumentPageCount: _e,
    collectFieldRulesForState: ue,
    expandRulesForPreview: Ae,
    findSignersMissingRequiredSignatureField: Ve,
    goToStep: (B) => H.goToStep(B)
  });
  oe = ua({
    apiBase: c,
    apiVersionBase: d,
    documentIdInput: xe,
    fieldPlacementsJSONInput: V,
    initialFieldInstances: ge.buildInitialPlacementInstances(),
    initialLinkGroupState: $e,
    collectPlacementFieldDefinitions: qe,
    getFieldDefinitionById: yt,
    parseAPIError: Re,
    mapUserFacingError: Fe,
    showToast: Yi,
    escapeHtml: Zn,
    onPlacementsChanged: () => He()
  }), oe.bindEvents(), $e = oe.getLinkGroupState();
  const H = Vs({
    totalWizardSteps: pn,
    wizardStep: ut,
    nextStepLabels: ws,
    submitBtn: ce,
    previewCard: X,
    updateCoordinationUI: Le,
    validateStep: (B) => De?.validateStep(B) !== !1,
    onPlacementStep() {
      oe.initPlacementEditor();
    },
    onReviewStep() {
      N.initSendReadinessCheck();
    },
    onStepChanged(B) {
      A.updateStep(B), He(), O.forceSync();
    }
  });
  H.bindEvents(), Ue = ba({
    createSuccess: h,
    enableServerSync: !s && m === "json",
    stateManager: A,
    syncOrchestrator: O,
    syncService: F,
    applyStateToUI: (B) => dt(B, {
      step: Number(B?.currentStep || 1)
    }),
    surfaceSyncOutcome: it,
    reviewStep: ut.REVIEW
  }), Ue.handleCreateSuccessCleanup(), Ue.bindRetryAndConflictHandlers();
  const Q = pa({
    documentIdInput: xe,
    documentPageCountInput: ee,
    titleInput: E.form.titleInput,
    messageInput: E.form.messageInput,
    participantsContainer: ke,
    fieldDefinitionsContainer: w,
    fieldPlacementsJSONInput: V,
    fieldRulesJSONInput: J,
    collectFieldRulesForForm: () => Be(),
    buildPlacementFormEntries: () => oe?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => H.getCurrentStep(),
    totalWizardSteps: pn
  }), re = () => Q.buildCanonicalAgreementPayload();
  return be = ga({
    titleSource: G,
    stateManager: A,
    trackWizardStateChanges: He,
    participantsController: ye,
    fieldDefinitionsController: ge,
    placementController: oe,
    updateFieldParticipantOptions: rt,
    previewCard: X,
    wizardNavigationController: H,
    documentIdInput: xe,
    documentPageCountInput: ee,
    selectedDocumentTitle: Z,
    agreementRefs: E,
    parsePositiveInt: nt,
    isEditMode: s
  }), be.bindChangeTracking(), De = ha({
    documentIdInput: xe,
    titleInput: E.form.titleInput,
    participantsContainer: ke,
    fieldDefinitionsContainer: w,
    fieldRulesContainer: I,
    addFieldBtn: q,
    ensureSelectedDocumentCompatibility: Ee,
    collectFieldRulesForState: ie,
    findSignersMissingRequiredSignatureField: Ve,
    missingSignatureFieldMessage: M,
    announceError: Qe
  }), Me = va({
    isEditMode: s,
    storageKey: _,
    stateManager: A,
    syncOrchestrator: O,
    syncService: F,
    applyResumedState: (B) => dt(B, {
      step: Number(B?.currentStep || 1)
    }),
    hasMeaningfulWizardProgress: Wi,
    formatRelativeTime: We,
    emitWizardTelemetry: (B, me) => U(B, me),
    getActiveTabDebugState: ht
  }), Me.bindEvents(), Js({
    config: e,
    form: he,
    submitBtn: ce,
    documentIdInput: xe,
    documentSearch: fe,
    participantsContainer: ke,
    addParticipantBtn: ze,
    fieldDefinitionsContainer: w,
    fieldRulesContainer: I,
    documentPageCountInput: ee,
    fieldPlacementsJSONInput: V,
    fieldRulesJSONInput: J,
    storageKey: _,
    syncService: F,
    syncOrchestrator: O,
    stateManager: A,
    submitMode: m,
    totalWizardSteps: pn,
    wizardStep: ut,
    getCurrentStep: () => H.getCurrentStep(),
    getPlacementState: () => oe.getState(),
    getCurrentDocumentPageCount: _e,
    ensureSelectedDocumentCompatibility: Ee,
    collectFieldRulesForState: ie,
    collectFieldRulesForForm: Be,
    expandRulesForPreview: Ae,
    findSignersMissingRequiredSignatureField: Ve,
    missingSignatureFieldMessage: M,
    getSignerParticipants: y,
    buildCanonicalAgreementPayload: re,
    announceError: Qe,
    emitWizardTelemetry: U,
    parseAPIError: Xe,
    goToStep: (B) => H.goToStep(B),
    showSyncConflictDialog: Ie,
    surfaceSyncOutcome: it,
    updateSyncStatus: z,
    getActiveTabDebugState: ht,
    addFieldBtn: q
  }).bindEvents(), le;
}
let Ln = null;
function La() {
  Ln?.destroy(), Ln = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function _a(i = {}) {
  if (Ln)
    return;
  const e = Ca(i);
  e.start(), Ln = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function Aa(i) {
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
class gr {
  constructor(e) {
    this.initialized = !1, this.config = Aa(e);
  }
  init() {
    this.initialized || (this.initialized = !0, _a(this.config));
  }
  destroy() {
    La(), this.initialized = !1;
  }
}
function Vo(i) {
  const e = new gr(i);
  return Te(() => e.init()), e;
}
function Pa(i) {
  const e = new gr({
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
  Te(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && Te(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      Pa({
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
const Ta = "esign.signer.profile.v1", Ji = "esign.signer.profile.outbox.v1", ci = 90, Ki = 500 * 1024;
class ka {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : ci;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Ta}:${e}`;
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
class Da {
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
class ei {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Ji);
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
      window.localStorage.setItem(Ji, JSON.stringify(e));
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
function Ra(i) {
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
    review: li(i.review),
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
      ttlDays: Number(i.profile?.ttlDays || ci) || ci,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Ma(i) {
  return !i || typeof i != "object" ? null : {
    id: String(i.id || "").trim(),
    participant_type: String(i.participant_type || "").trim(),
    recipient_id: String(i.recipient_id || "").trim(),
    email: String(i.email || "").trim(),
    display_name: String(i.display_name || "").trim(),
    decision_status: String(i.decision_status || "").trim()
  };
}
function $a(i) {
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
function li(i) {
  if (!i || typeof i != "object") return null;
  const e = Array.isArray(i.threads) ? i.threads.map($a).filter(Boolean) : [], t = Array.isArray(i.blockers) ? i.blockers.map((n) => String(n || "").trim()).filter(Boolean) : [];
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
    participant: Ma(i.participant),
    open_thread_count: Number(i.open_thread_count || 0) || 0,
    resolved_thread_count: Number(i.resolved_thread_count || 0) || 0,
    threads: e
  };
}
function ti(i) {
  switch (String(i?.thread?.anchor_type || "").trim()) {
    case "field":
      return i?.thread?.field_id ? `Field ${i.thread.field_id}` : "Field";
    case "page":
      return i?.thread?.page_number ? `Page ${i.thread.page_number}` : "Page";
    default:
      return "Agreement";
  }
}
function Kt(i) {
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
function Fa(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function ni(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Ba(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function St(i) {
  const e = String(i || "").trim();
  return Ba(e) ? "" : e;
}
function Na(i) {
  const e = new ka(i.profile.ttlDays), t = new Da(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new ei("local_only", e, null) : i.profile.mode === "remote_only" ? new ei("remote_only", e, t) : new ei("hybrid", e, t);
}
function Ua() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Ha(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Ra(i), r = Fa(n), c = Na(n);
  Ua();
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
    reviewContext: n.review ? li(n.review) : null,
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
      s.overlayRenderFrameID = 0, Vt();
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
    const u = St(String(o || ""));
    if (!u) {
      delete l.previewValueText;
      return;
    }
    l.previewValueText = u, delete l.previewValueBool, delete l.previewSignatureUrl;
  }
  function P(a, o) {
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
  function _() {
    return String(n.sessionKind || "").trim().toLowerCase() === "reviewer";
  }
  function x() {
    return `${n.apiBasePath}/session/${encodeURIComponent(n.token)}`;
  }
  function L() {
    return `${x()}/review`;
  }
  function j(a, o) {
    return (Array.isArray(a) ? a : []).filter((l) => String(l?.thread?.status || "").trim() === o).length;
  }
  function G(a) {
    const o = String(a?.created_by_type || "").trim();
    return o === "user" || o === "sender" ? "Sender" : o === "reviewer" ? "Reviewer" : o === "recipient" || o === "signer" ? "Signer" : o ? o.replace(/_/g, " ") : "Participant";
  }
  function U(a) {
    return a ? String(a.display_name || a.email || a.recipient_id || a.id || "").trim() : "";
  }
  function k(a) {
    const o = String(a || "").trim();
    if (!o) return "";
    const l = new Date(o);
    return Number.isNaN(l.getTime()) ? o : l.toLocaleString();
  }
  function D(a) {
    s.reviewContext = li(a), s.reviewContext && (Array.isArray(s.reviewContext.threads) || (s.reviewContext.threads = []), s.reviewContext.open_thread_count = j(s.reviewContext.threads, "open"), s.reviewContext.resolved_thread_count = j(s.reviewContext.threads, "resolved")), we(), Xe(), Dt();
  }
  async function X() {
    const a = await fetch(x(), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!a.ok)
      throw await Tt(a, "Failed to reload review session");
    const o = await a.json(), l = o?.session && typeof o.session == "object" ? o.session : {};
    return s.canSignSession = l.can_sign !== !1, D(l.review || null), l;
  }
  async function he(a, o = {}, l = "Review request failed") {
    const u = await fetch(`${L()}${a}`, {
      credentials: "same-origin",
      ...o,
      headers: {
        Accept: "application/json",
        ...o?.body ? { "Content-Type": "application/json" } : {},
        ...o?.headers || {}
      }
    });
    if (!u.ok)
      throw await Tt(u, l);
    return u.json().catch(() => ({}));
  }
  function ce() {
    const a = document.getElementById("review-thread-anchor");
    return String(a?.value || "agreement").trim() || "agreement";
  }
  function pe() {
    s.highlightedReviewThreadID = "", s.highlightedReviewThreadTimer && (window.clearTimeout(s.highlightedReviewThreadTimer), s.highlightedReviewThreadTimer = null);
  }
  function ye(a) {
    pe(), s.highlightedReviewThreadID = String(a || "").trim(), s.highlightedReviewThreadID && (s.highlightedReviewThreadTimer = window.setTimeout(() => {
      pe(), Ie(), h();
    }, 2400), Ie(), h());
  }
  function ge(a) {
    if (!a || typeof a != "object") {
      s.reviewAnchorPointDraft = null, be(), h();
      return;
    }
    s.reviewAnchorPointDraft = {
      page_number: Number(a.page_number || s.currentPage || 1) || 1,
      anchor_x: Math.round((Number(a.anchor_x || 0) || 0) * 100) / 100,
      anchor_y: Math.round((Number(a.anchor_y || 0) || 0) * 100) / 100
    }, be(), h();
  }
  function oe(a) {
    s.pickingReviewAnchorPoint = !!a && ce() === "page", document.getElementById("pdf-container")?.classList.toggle("review-anchor-picking", s.pickingReviewAnchorPoint), s.pickingReviewAnchorPoint ? Pe("Click on the document page to pin this comment.") : Pe("Comment pin placement cancelled."), be();
  }
  function be() {
    const a = document.getElementById("review-anchor-point-controls"), o = document.getElementById("review-anchor-point-status"), l = document.querySelector('[data-esign-action="pick-review-anchor-point"]'), u = document.querySelector('[data-esign-action="clear-review-anchor-point"]'), p = ce() === "page";
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
  function De() {
    const a = document.getElementById("review-progress-indicator");
    if (!a) return;
    if (!f()) {
      a.classList.add("hidden");
      return;
    }
    const o = s.reviewContext, l = String(o.status || "").trim().toLowerCase();
    a.classList.remove("hidden");
    const u = document.getElementById("review-step-draft"), p = document.getElementById("review-step-sent"), v = document.getElementById("review-step-review"), C = document.getElementById("review-step-decision"), T = a.querySelectorAll(".review-progress-line");
    if ([u, p, v, C].forEach((R) => {
      R?.classList.remove("completed", "active", "changes-requested");
    }), T.forEach((R) => {
      R.classList.remove("completed", "active");
    }), l === "approved") {
      u?.classList.add("completed"), p?.classList.add("completed"), v?.classList.add("completed"), C?.classList.add("completed"), T.forEach((se) => se.classList.add("completed"));
      const R = C?.querySelector("i");
      R && (R.className = "iconoir-check-circle text-xs");
    } else if (l === "changes_requested") {
      u?.classList.add("completed"), p?.classList.add("completed"), v?.classList.add("completed"), C?.classList.add("changes-requested"), T.forEach((se) => se.classList.add("completed"));
      const R = C?.querySelector("i");
      R && (R.className = "iconoir-warning-circle text-xs");
    } else if (l === "in_review" || l === "pending") {
      u?.classList.add("completed"), p?.classList.add("completed"), v?.classList.add("active"), T[0] && T[0].classList.add("completed"), T[1] && T[1].classList.add("completed"), T[2] && T[2].classList.add("active");
      const R = C?.querySelector("i");
      R && (R.className = "iconoir-check-circle text-xs");
    } else {
      u?.classList.add("active");
      const R = C?.querySelector("i");
      R && (R.className = "iconoir-check-circle text-xs");
    }
  }
  function Me() {
    const a = ce();
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
  function we() {
    const a = document.getElementById("review-panel"), o = document.getElementById("review-banner"), l = document.getElementById("review-status-chip"), u = document.getElementById("review-panel-subtitle"), p = document.getElementById("review-participant-summary"), v = document.getElementById("review-decision-actions"), C = document.getElementById("review-thread-summary"), T = document.getElementById("review-thread-composer"), R = document.getElementById("review-thread-list"), se = document.getElementById("review-thread-composer-hint");
    if (!a || !R) return;
    if (!f()) {
      a.classList.add("hidden"), o?.classList.add("hidden"), be(), De();
      return;
    }
    const K = s.reviewContext, Ce = Kt(K.status);
    if (a.classList.remove("hidden"), De(), l && (l.textContent = Ce, l.className = "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide " + (K.status === "approved" ? "bg-emerald-100 text-emerald-700" : K.status === "changes_requested" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")), u && (u.textContent = K.gate ? `Gate: ${String(K.gate || "").replace(/_/g, " ")}` : "Track review status, comments, and decision actions."), p) {
      const lt = U(K.participant);
      lt || K.participant_status ? (p.classList.remove("hidden"), p.textContent = lt ? `${lt} • decision ${Kt(K.participant_status || "pending")}` : `Decision ${Kt(K.participant_status || "pending")}`) : p.classList.add("hidden");
    }
    if (v && v.classList.toggle("hidden", !(K.can_approve || K.can_request_changes)), C && (C.classList.remove("hidden"), C.textContent = `${K.open_thread_count || 0} open • ${K.resolved_thread_count || 0} resolved`), T) {
      const lt = K.comments_enabled && K.can_comment;
      T.classList.toggle("hidden", !lt), se && (se.textContent = s.activeFieldId ? "New threads can target the agreement, current page, or active field." : "New threads can target the agreement or current page. Activate a field to anchor to it.");
    }
    if (o) {
      const lt = [];
      K.sign_blocked && K.sign_block_reason && lt.push(K.sign_block_reason), (Array.isArray(K.blockers) ? K.blockers : []).forEach((Ye) => {
        const Ht = String(Ye || "").trim();
        Ht && !lt.includes(Ht) && lt.push(Ht);
      }), lt.length ? (o.classList.remove("hidden"), o.className = "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4", o.innerHTML = `
          <div class="flex items-start gap-3">
            <i class="iconoir-warning-circle mt-0.5 text-amber-600" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">Review Status</p>
              <p class="mt-1 text-xs text-amber-800">${Ge(lt.join(" "))}</p>
            </div>
          </div>
        `) : o.classList.add("hidden");
    }
    $e(), be();
    const st = Array.isArray(K.threads) ? K.threads : [];
    if (!st.length) {
      R.innerHTML = '<div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No review comments yet.</div>';
      return;
    }
    const Oe = s.reviewThreadFilter || "all", de = st.filter((lt) => {
      const Ye = String(lt?.thread?.status || "").trim();
      return Oe === "open" ? Ye === "open" : Oe === "resolved" ? Ye === "resolved" : !0;
    }), Ne = 5, wt = Math.ceil(de.length / Ne), pt = Math.min(s.reviewThreadPage || 1, wt || 1), cn = (pt - 1) * Ne, Hn = de.slice(cn, cn + Ne), ln = st.length > 0 ? `
      <div class="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
        <button type="button" data-esign-action="filter-review-threads" data-filter="all" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${Oe === "all" ? "bg-slate-100 text-slate-800" : "text-gray-500 hover:text-gray-700"}">
          All (${st.length})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="open" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${Oe === "open" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}">
          Open (${K.open_thread_count || 0})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="resolved" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${Oe === "resolved" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700"}">
          Resolved (${K.resolved_thread_count || 0})
        </button>
      </div>
    ` : "", zn = wt > 1 ? `
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">Page ${pt} of ${wt}</span>
        <div class="flex gap-2">
          <button type="button" data-esign-action="page-review-threads" data-page="${pt - 1}" class="px-2 py-1 text-xs font-medium rounded border ${pt <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${pt <= 1 ? "disabled" : ""}>
            <i class="iconoir-nav-arrow-left"></i> Prev
          </button>
          <button type="button" data-esign-action="page-review-threads" data-page="${pt + 1}" class="px-2 py-1 text-xs font-medium rounded border ${pt >= wt ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${pt >= wt ? "disabled" : ""}>
            Next <i class="iconoir-nav-arrow-right"></i>
          </button>
        </div>
      </div>
    ` : "";
    if (de.length === 0) {
      R.innerHTML = `
        ${ln}
        <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No ${Oe === "all" ? "" : Oe} comments${Oe !== "all" ? ". Try a different filter." : "."}
        </div>
      `;
      return;
    }
    const On = Hn.map((lt) => {
      const Ye = lt.thread || {}, Ht = Array.isArray(lt.messages) ? lt.messages : [], dn = K.comments_enabled && K.can_comment, Kr = dn && String(Ye.status || "").trim() === "open", Xr = dn && String(Ye.status || "").trim() === "resolved", Qr = ti(lt), Pi = k(Ye.last_activity_at || ""), Ti = `review-reply-${Ge(String(Ye.id || ""))}`, jn = `review-reply-composer-${Ge(String(Ye.id || ""))}`, Zr = String(Ye.status || "").trim() === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200", qn = String(Ht[0]?.created_by_type || "").trim(), es = qn === "user" || qn === "sender" ? "border-l-blue-400" : qn === "reviewer" ? "border-l-purple-400" : "border-l-slate-300", ts = String(Ye.id || "").trim() === String(s.highlightedReviewThreadID || "").trim();
      return `
        <article class="rounded-xl border ${Zr} border-l-4 ${es} p-4 ${ts ? "ring-2 ring-blue-200 shadow-sm" : ""}" data-review-thread-id="${Ge(String(Ye.id || ""))}" tabindex="-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" data-esign-action="go-review-thread-anchor" data-thread-id="${Ge(String(Ye.id || ""))}" class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">${Ge(Qr)}</button>
                <span class="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${String(Ye.status || "").trim() === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}">${Ge(Kt(Ye.status || "open"))}</span>
              </div>
              ${Pi ? `<p class="mt-2 text-xs text-gray-500">Last activity ${Ge(Pi)}</p>` : ""}
            </div>
          </div>
          <div class="mt-3 space-y-3">
            ${Ht.map((un) => {
        const Vn = String(un.created_by_type || "").trim();
        return `
              <div class="rounded-lg ${Vn === "user" || Vn === "sender" ? "bg-blue-50 border-l-2 border-l-blue-300" : Vn === "reviewer" ? "bg-purple-50 border-l-2 border-l-purple-300" : "bg-slate-50"} px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-semibold text-slate-700">${Ge(G(un))}</p>
                  <p class="text-[11px] text-slate-500">${Ge(k(un.created_at || ""))}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${Ge(String(un.body || ""))}</p>
              </div>
            `;
      }).join("")}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            ${Kr ? `<button type="button" data-esign-action="resolve-review-thread" data-thread-id="${Ge(String(Ye.id || ""))}" class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Resolve</button>` : ""}
            ${Xr ? `<button type="button" data-esign-action="reopen-review-thread" data-thread-id="${Ge(String(Ye.id || ""))}" class="text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2">Reopen</button>` : ""}
            ${dn ? `<button type="button" data-esign-action="toggle-reply-composer" data-thread-id="${Ge(String(Ye.id || ""))}" data-composer-id="${jn}" class="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <i class="iconoir-chat-bubble text-[10px]"></i> Reply
            </button>` : ""}
          </div>
          ${dn ? `
            <div id="${jn}" class="review-reply-composer mt-3 space-y-2 hidden" data-thread-id="${Ge(String(Ye.id || ""))}">
              <textarea id="${Ti}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400" rows="2" placeholder="Write your reply..."></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" data-esign-action="cancel-reply" data-composer-id="${jn}" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" data-esign-action="reply-review-thread" data-thread-id="${Ge(String(Ye.id || ""))}" data-reply-input-id="${Ti}" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Send Reply</button>
              </div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");
    R.innerHTML = ln + On + zn;
  }
  function Ue(a) {
    const o = Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : [];
    return a === "open" ? o.filter((l) => String(l?.thread?.status || "").trim() === "open") : a === "resolved" ? o.filter((l) => String(l?.thread?.status || "").trim() === "resolved") : o;
  }
  function $e() {
    const a = document.getElementById("review-anchor-page-label"), o = document.getElementById("review-anchor-field-chip"), l = document.getElementById("review-anchor-field-label"), u = document.getElementById("review-thread-anchor");
    if (a && (a.textContent = `Page ${s.currentPage || 1}`), o && l)
      if (s.activeFieldId) {
        const v = s.fieldState.get(s.activeFieldId)?.type || "field", C = v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
        l.textContent = C, o.disabled = !1, o.classList.remove("hidden", "text-gray-400", "cursor-not-allowed"), o.classList.add("text-gray-600");
      } else
        l.textContent = "Select a field", o.disabled = !0, o.classList.add("hidden", "text-gray-400", "cursor-not-allowed"), o.classList.remove("text-gray-600"), u && u.value === "field" && dt("agreement");
    be();
  }
  function dt(a) {
    const o = document.getElementById("review-thread-anchor"), l = document.querySelectorAll(".review-anchor-chip");
    o && (o.value = a), l.forEach((u) => {
      u.getAttribute("data-anchor-type") === a ? (u.classList.add("active", "border-blue-300", "bg-blue-50", "text-blue-700"), u.classList.remove("border-gray-200", "bg-white", "text-gray-600")) : (u.classList.remove("active", "border-blue-300", "bg-blue-50", "text-blue-700"), u.classList.add("border-gray-200", "bg-white", "text-gray-600"));
    }), a !== "page" && (s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking")), be();
  }
  function at() {
    const a = document.getElementById("review-anchor-chips");
    a && a.addEventListener("click", (o) => {
      const l = o.target.closest(".review-anchor-chip");
      if (!l || l.hasAttribute("disabled")) return;
      const u = l.getAttribute("data-anchor-type");
      u && dt(u);
    });
  }
  function He() {
    const a = document.getElementById("pdf-page-1");
    a && a.addEventListener("click", (o) => {
      if (!s.pickingReviewAnchorPoint || ce() !== "page" || !(o.target instanceof Element)) return;
      const l = a.querySelector("canvas"), u = l instanceof HTMLElement ? l : a, p = O.screenToPagePoint(
        Number(s.currentPage || 1) || 1,
        u,
        o.clientX,
        o.clientY
      );
      p && (ge(p), s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), Pe(`Comment pinned on page ${p.page_number}.`));
    });
  }
  function We(a) {
    const o = ["all", "open", "resolved"], l = String(a).trim().toLowerCase();
    s.reviewThreadFilter = o.includes(l) ? l : "all", s.reviewThreadPage = 1, we(), Pe(`Showing ${s.reviewThreadFilter === "all" ? "all" : s.reviewThreadFilter} comments.`);
  }
  function ve(a) {
    const o = Math.max(1, parseInt(String(a), 10) || 1);
    s.reviewThreadPage = o, we(), document.getElementById("review-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function z(a, o) {
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
  function Ie() {
    document.querySelectorAll("[data-review-thread-id]").forEach((a) => {
      if (!(a instanceof HTMLElement)) return;
      const o = String(a.getAttribute("data-review-thread-id") || "").trim() === String(s.highlightedReviewThreadID || "").trim();
      a.classList.toggle("ring-2", o), a.classList.toggle("ring-blue-200", o), a.classList.toggle("shadow-sm", o);
    });
  }
  function Fe(a) {
    const o = String(a || "").trim();
    if (!o) return;
    const u = (Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : []).find((R) => String(R?.thread?.id || "").trim() === o);
    if (!u) return;
    const p = String(u?.thread?.status || "open").trim() || "open", v = s.reviewThreadFilter || "all";
    v !== "all" && v !== p && (s.reviewThreadFilter = p === "resolved" ? "resolved" : "open");
    const T = Ue(s.reviewThreadFilter || "all").findIndex((R) => String(R?.thread?.id || "").trim() === o);
    if (T >= 0)
      s.reviewThreadPage = Math.floor(T / 5) + 1;
    else {
      s.reviewThreadFilter = "all";
      const se = Ue("all").findIndex((K) => String(K?.thread?.id || "").trim() === o);
      s.reviewThreadPage = se >= 0 ? Math.floor(se / 5) + 1 : 1;
    }
    ye(o), we(), requestAnimationFrame(() => {
      const R = document.querySelector(`[data-review-thread-id="${CSS.escape(o)}"]`);
      R instanceof HTMLElement && (R.scrollIntoView({ behavior: "smooth", block: "nearest" }), R.focus({ preventScroll: !0 }));
    });
  }
  function Xe() {
    const a = document.querySelector(".side-panel"), o = document.getElementById("panel-title"), l = document.getElementById("fields-status"), u = document.getElementById("fields-list"), p = document.getElementById("consent-notice"), v = document.getElementById("submit-btn"), C = document.getElementById("decline-btn"), T = document.querySelector(".panel-footer"), R = document.getElementById("panel-mobile-progress"), se = document.getElementById("review-submit-warning"), K = document.getElementById("review-submit-message"), Ce = document.getElementById("stage-state-banner"), st = document.getElementById("header-progress-group"), Oe = document.getElementById("session-identity-label"), de = _();
    a?.classList.toggle("review-only-mode", de), Oe && (Oe.textContent = de ? "Reviewing as" : "Signing as"), st?.classList.toggle("review-only-hidden", de), o && (o.textContent = de ? "Review & Comment" : f() ? "Review, Complete & Sign" : "Complete & Sign"), u?.classList.toggle("hidden", de), l?.classList.toggle("hidden", de), R?.classList.toggle("hidden", de), p?.classList.toggle("hidden", de || s.hasConsented), Ce?.classList.toggle("hidden", de), de ? T?.classList.add("hidden") : (T?.classList.remove("hidden"), v?.classList.remove("hidden"), C?.classList.remove("hidden")), se && K && (de ? se.classList.add("hidden") : f() && s.reviewContext.sign_blocked ? (se.classList.remove("hidden"), K.textContent = s.reviewContext.sign_block_reason || "Signing is blocked until review completes.") : se.classList.add("hidden"));
  }
  async function Qe() {
    if (!f()) return;
    const a = document.getElementById("review-thread-body"), o = String(a?.value || "").trim();
    if (!o) {
      Pe("Enter a comment before creating a thread.", "assertive");
      return;
    }
    const l = document.getElementById("review-thread-visibility"), u = {
      thread: {
        review_id: s.reviewContext.review_id,
        visibility: String(l?.value || "shared").trim() || "shared",
        body: o,
        ...Me()
      }
    };
    await he("/threads", {
      method: "POST",
      body: JSON.stringify(u)
    }, "Failed to create review thread"), a && (a.value = ""), ce() === "page" && (s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), ge(null)), await X(), Pe("Review comment added.");
  }
  async function it(a, o) {
    const l = document.getElementById(String(o || "").trim()), u = String(l?.value || "").trim();
    if (!a || !u) {
      Pe("Enter a reply before sending.", "assertive");
      return;
    }
    await he(`/threads/${encodeURIComponent(String(a))}/replies`, {
      method: "POST",
      body: JSON.stringify({ reply: { body: u } })
    }, "Failed to reply to review thread"), l && (l.value = ""), await X(), Pe("Reply added to review thread.");
  }
  async function ht(a, o) {
    if (!a) return;
    const l = o ? "resolve" : "reopen";
    await he(`/threads/${encodeURIComponent(String(a))}/${l}`, {
      method: "POST",
      body: JSON.stringify({})
    }, o ? "Failed to resolve review thread" : "Failed to reopen review thread"), await X(), Pe(o ? "Review thread resolved." : "Review thread reopened.");
  }
  async function Se(a, o = "") {
    const l = a === "approve" ? "/approve" : "/request-changes", u = a === "approve" ? "Failed to approve review" : "Failed to request review changes", p = a === "request-changes" && o ? JSON.stringify({ comment: o }) : void 0;
    await he(l, { method: "POST", body: p }, u), await X(), Pe(a === "approve" ? "Review approved." : "Review changes requested.");
  }
  let Le = "";
  function Re(a) {
    const o = document.getElementById("review-decision-modal"), l = document.getElementById("review-decision-icon-container"), u = document.getElementById("review-decision-icon"), p = document.getElementById("review-decision-modal-title"), v = document.getElementById("review-decision-modal-description"), C = document.getElementById("review-decision-comment-section"), T = document.getElementById("review-decision-comment"), R = document.getElementById("review-decision-comment-error"), se = document.getElementById("review-decision-confirm-btn");
    if (!o) return;
    Le = a, a === "approve" ? (l?.classList.remove("bg-amber-100"), l?.classList.add("bg-emerald-100"), u?.classList.remove("iconoir-warning-circle", "text-amber-600"), u?.classList.add("iconoir-check-circle", "text-emerald-600"), p && (p.textContent = "Approve Review?"), v && (v.textContent = "This will mark the document as approved and notify the sender that the review is complete."), C?.classList.add("hidden"), se?.classList.remove("bg-amber-600", "hover:bg-amber-700"), se?.classList.add("btn-primary"), se && (se.textContent = "Approve")) : (l?.classList.remove("bg-emerald-100"), l?.classList.add("bg-amber-100"), u?.classList.remove("iconoir-check-circle", "text-emerald-600"), u?.classList.add("iconoir-warning-circle", "text-amber-600"), p && (p.textContent = "Request Changes?"), v && (v.textContent = "The sender will be notified that changes are needed before this document can proceed."), C?.classList.remove("hidden"), T && (T.value = ""), R?.classList.add("hidden"), se?.classList.remove("btn-primary"), se?.classList.add("bg-amber-600", "hover:bg-amber-700", "text-white"), se && (se.textContent = "Request Changes")), o.classList.add("active"), o.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden";
    const K = o.querySelector(".field-editor");
    K instanceof HTMLElement && an(K), a === "request-changes" && T?.focus();
  }
  function Ze() {
    const a = document.getElementById("review-decision-modal");
    if (!a) return;
    const o = a.querySelector(".field-editor");
    o instanceof HTMLElement && on(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", Le = "";
  }
  async function A() {
    if (!Le) return;
    const a = Le;
    let o = "";
    if (a === "request-changes") {
      const l = document.getElementById("review-decision-comment"), u = document.getElementById("review-decision-comment-error");
      if (o = String(l?.value || "").trim(), !o) {
        u?.classList.remove("hidden"), l?.focus(), Pe("Please provide a reason for requesting changes.", "assertive");
        return;
      }
    }
    Ze(), await Se(a, o);
  }
  function F(a) {
    const l = (Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : []).find((v) => String(v?.thread?.id || "") === String(a || ""));
    if (!l) return;
    ye(a);
    const u = String(l?.thread?.anchor_type || "").trim();
    if (u === "field" && l.thread.field_id) {
      const v = s.fieldState.get(l.thread.field_id);
      v?.page && tn(Number(v.page || 1) || 1), kn(l.thread.field_id, { openEditor: !1 }), Nn(l.thread.field_id);
      return;
    }
    if (u === "page" && Number(l?.thread?.page_number || 0) > 0) {
      tn(Number(l.thread.page_number || 1) || 1);
      return;
    }
    document.getElementById("viewer-content")?.scrollTo({ top: 0, behavior: "smooth" });
  }
  const O = {
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
      const l = a.page, u = this.getPageMetadata(l), p = o.offsetWidth, v = o.offsetHeight, C = a.pageWidth || u.width, T = a.pageHeight || u.height, R = p / C, se = v / T;
      let K = a.posX || 0, Ce = a.posY || 0;
      n.viewer.origin === "bottom-left" && (Ce = T - Ce - (a.height || 30));
      const st = K * R, Oe = Ce * se, de = (a.width || 150) * R, Ne = (a.height || 30) * se;
      return {
        left: st,
        top: Oe,
        width: de,
        height: Ne,
        // Store original values for debugging
        _debug: {
          sourceX: K,
          sourceY: Ce,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: C,
          pageHeight: T,
          scaleX: R,
          scaleY: se,
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
      const p = this.getPageMetadata(a), v = o.getBoundingClientRect();
      if (!v.width || !v.height)
        return null;
      const C = Math.min(Math.max(l - v.left, 0), v.width), T = Math.min(Math.max(u - v.top, 0), v.height), R = p.width || v.width, se = p.height || v.height, K = R / v.width, Ce = se / v.height;
      let st = C * K, Oe = T * Ce;
      return n.viewer.origin === "bottom-left" && (Oe = se - Oe), {
        page_number: Number(a || 1) || 1,
        anchor_x: Math.round(st * 100) / 100,
        anchor_y: Math.round(Oe * 100) / 100
      };
    }
  }, te = {
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
        throw await Tt(p, "Failed to get upload contract");
      const v = await p.json(), C = v?.contract || v;
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
      a.headers && Object.entries(a.headers).forEach(([v, C]) => {
        const T = String(v).toLowerCase();
        T === "x-esign-upload-token" || T === "x-esign-upload-key" || (u[v] = String(C));
      });
      const p = await fetch(l.toString(), {
        method: a.method || "PUT",
        headers: u,
        body: o,
        credentials: "omit"
      });
      if (!p.ok)
        throw await Tt(p, `Upload failed: ${p.status} ${p.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [o, l] = a.split(","), u = o.match(/data:([^;]+)/), p = u ? u[1] : "image/png", v = atob(l), C = new Uint8Array(v.length);
      for (let T = 0; T < v.length; T++)
        C[T] = v.charCodeAt(T);
      return new Blob([C], { type: p });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, o) {
      const l = this.dataUrlToBlob(o), u = l.size, p = "image/png", v = await q(l), C = await this.requestUploadBootstrap(
        a,
        v,
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
  }, ne = {
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
        const v = await u.json().catch(() => ({})), C = new Error(v?.error?.message || "Failed to save signature");
        throw C.code = v?.error?.code || "", C;
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
  function le(a) {
    const o = s.fieldState.get(a);
    return o && o.type === "initials" ? "initials" : "signature";
  }
  function Y(a) {
    return s.savedSignaturesByType.get(a) || [];
  }
  async function xe(a, o = !1) {
    const l = le(a);
    if (!o && s.savedSignaturesByType.has(l)) {
      fe(a);
      return;
    }
    const u = await ne.list(l);
    s.savedSignaturesByType.set(l, u), fe(a);
  }
  function fe(a) {
    const o = le(a), l = Y(o), u = document.getElementById("sig-saved-list");
    if (u) {
      if (!l.length) {
        u.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      u.innerHTML = l.map((p) => {
        const v = Ge(String(p?.thumbnail_data_url || p?.data_url || "")), C = Ge(String(p?.label || "Saved signature")), T = Ge(String(p?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${v}" alt="${C}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${C}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Ge(a)}" data-signature-id="${T}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Ge(a)}" data-signature-id="${T}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Z(a) {
    const o = s.signatureCanvases.get(a), l = le(a);
    if (!o || !Mn(a))
      throw new Error(`Please add your ${l === "initials" ? "initials" : "signature"} first`);
    const u = o.canvas.toDataURL("image/png"), p = await ne.save(l, u, l === "initials" ? "Initials" : "Signature");
    if (!p)
      throw new Error("Failed to save signature");
    const v = Y(l);
    v.unshift(p), s.savedSignaturesByType.set(l, v), fe(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function ee(a, o) {
    const l = le(a), p = Y(l).find((C) => String(C?.id || "") === String(o));
    if (!p) return;
    requestAnimationFrame(() => sn(a)), await ke(a);
    const v = String(p.data_url || p.thumbnail_data_url || "").trim();
    v && (await Rn(a, v, { clearStrokes: !0 }), E(a, v), h(), rn("draw", a), Pe("Saved signature selected."));
  }
  async function Ee(a, o) {
    const l = le(a);
    await ne.delete(o);
    const u = Y(l).filter((p) => String(p?.id || "") !== String(o));
    s.savedSignaturesByType.set(l, u), fe(a);
  }
  function _e(a) {
    const o = String(a?.code || "").trim(), l = String(a?.message || "Unable to update saved signatures"), u = o === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : l;
    window.toastManager && window.toastManager.error(u), Pe(u, "assertive");
  }
  async function ke(a, o = 8) {
    for (let l = 0; l < o; l++) {
      if (s.signatureCanvases.has(a)) return !0;
      await new Promise((u) => setTimeout(u, 40)), sn(a);
    }
    return !1;
  }
  async function ze(a, o) {
    const l = String(o?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(l))
      throw new Error("Only PNG and JPEG images are supported");
    if (o.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => sn(a)), await ke(a);
    const u = s.signatureCanvases.get(a);
    if (!u)
      throw new Error("Signature canvas is not ready");
    const p = await y(o), v = l === "image/png" ? p : await I(p, u.drawWidth, u.drawHeight);
    if (w(v) > Ki)
      throw new Error(`Image exceeds ${Math.round(Ki / 1024)}KB limit after conversion`);
    await Rn(a, v, { clearStrokes: !0 }), E(a, v), h();
    const T = document.getElementById("sig-upload-preview-wrap"), R = document.getElementById("sig-upload-preview");
    T && T.classList.remove("hidden"), R && R.setAttribute("src", v), Pe("Signature image uploaded. You can now insert it.");
  }
  function y(a) {
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
      const v = new Image();
      v.onload = () => {
        const C = document.createElement("canvas"), T = Math.max(1, Math.round(Number(o) || 600)), R = Math.max(1, Math.round(Number(l) || 160));
        C.width = T, C.height = R;
        const se = C.getContext("2d");
        if (!se) {
          p(new Error("Unable to process image"));
          return;
        }
        se.clearRect(0, 0, T, R);
        const K = Math.min(T / v.width, R / v.height), Ce = v.width * K, st = v.height * K, Oe = (T - Ce) / 2, de = (R - st) / 2;
        se.drawImage(v, Oe, de, Ce, st), u(C.toDataURL("image/png"));
      }, v.onerror = () => p(new Error("Unable to decode image file")), v.src = a;
    });
  }
  async function q(a) {
    if (window.crypto && window.crypto.subtle) {
      const o = await a.arrayBuffer(), l = await window.crypto.subtle.digest("SHA-256", o);
      return Array.from(new Uint8Array(l)).map((u) => u.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function V() {
    document.addEventListener("click", (a) => {
      const o = a.target;
      if (!(o instanceof Element)) return;
      const l = o.closest("[data-esign-action]");
      if (!l) return;
      switch (l.getAttribute("data-esign-action")) {
        case "prev-page":
          Sr();
          break;
        case "next-page":
          xr();
          break;
        case "zoom-out":
          Er();
          break;
        case "zoom-in":
          Ir();
          break;
        case "fit-width":
          Cr();
          break;
        case "download-document":
          Yr();
          break;
        case "show-consent-modal":
          Ci();
          break;
        case "activate-field": {
          const p = l.getAttribute("data-field-id");
          p && nn(p);
          break;
        }
        case "submit-signature":
          qr();
          break;
        case "show-decline-modal":
          Vr();
          break;
        case "close-field-editor":
          Fn();
          break;
        case "save-field-editor":
          Fr();
          break;
        case "hide-consent-modal":
          Un();
          break;
        case "accept-consent":
          jr();
          break;
        case "hide-decline-modal":
          Li();
          break;
        case "confirm-decline":
          Gr();
          break;
        case "approve-review":
          Re("approve");
          break;
        case "request-review-changes":
          Re("request-changes");
          break;
        case "hide-review-decision-modal":
          Ze();
          break;
        case "confirm-review-decision":
          A().catch((p) => {
            window.toastManager && window.toastManager.error(p?.message || "Unable to complete review action"), Pe(`Error: ${p?.message || "Unable to complete review action"}`, "assertive");
          });
          break;
        case "create-review-thread":
          Qe().catch((p) => {
            window.toastManager && window.toastManager.error(p?.message || "Unable to add comment"), Pe(`Error: ${p?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "reply-review-thread": {
          const p = l.getAttribute("data-thread-id"), v = l.getAttribute("data-reply-input-id");
          it(p, v).catch((C) => {
            window.toastManager && window.toastManager.error(C?.message || "Unable to reply to thread"), Pe(`Error: ${C?.message || "Unable to reply to thread"}`, "assertive");
          });
          break;
        }
        case "resolve-review-thread": {
          const p = l.getAttribute("data-thread-id");
          ht(p, !0).catch((v) => {
            window.toastManager && window.toastManager.error(v?.message || "Unable to resolve thread"), Pe(`Error: ${v?.message || "Unable to resolve thread"}`, "assertive");
          });
          break;
        }
        case "reopen-review-thread": {
          const p = l.getAttribute("data-thread-id");
          ht(p, !1).catch((v) => {
            window.toastManager && window.toastManager.error(v?.message || "Unable to reopen thread"), Pe(`Error: ${v?.message || "Unable to reopen thread"}`, "assertive");
          });
          break;
        }
        case "go-review-thread-anchor": {
          const p = l.getAttribute("data-thread-id");
          F(p);
          break;
        }
        case "go-review-thread": {
          const p = l.getAttribute("data-thread-id");
          Fe(p);
          break;
        }
        case "filter-review-threads": {
          const p = l.getAttribute("data-filter") || "all";
          We(p);
          break;
        }
        case "page-review-threads": {
          const p = parseInt(l.getAttribute("data-page") || "1", 10);
          ve(p);
          break;
        }
        case "toggle-reply-composer": {
          const p = l.getAttribute("data-composer-id");
          z(p, !0);
          break;
        }
        case "cancel-reply": {
          const p = l.getAttribute("data-composer-id");
          z(p, !1);
          break;
        }
        case "pick-review-anchor-point":
          ce() === "page" && oe(!0);
          break;
        case "clear-review-anchor-point":
          s.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), ge(null), Pe("Pinned comment location cleared.");
          break;
        case "retry-load-pdf":
          At();
          break;
        case "signature-tab": {
          const p = l.getAttribute("data-tab") || "draw", v = l.getAttribute("data-field-id");
          v && rn(p, v);
          break;
        }
        case "clear-signature-canvas": {
          const p = l.getAttribute("data-field-id");
          p && Rr(p);
          break;
        }
        case "undo-signature-canvas": {
          const p = l.getAttribute("data-field-id");
          p && kr(p);
          break;
        }
        case "redo-signature-canvas": {
          const p = l.getAttribute("data-field-id");
          p && Dr(p);
          break;
        }
        case "save-current-signature-library": {
          const p = l.getAttribute("data-field-id");
          p && Z(p).catch(_e);
          break;
        }
        case "select-saved-signature": {
          const p = l.getAttribute("data-field-id"), v = l.getAttribute("data-signature-id");
          p && v && ee(p, v).catch(_e);
          break;
        }
        case "delete-saved-signature": {
          const p = l.getAttribute("data-field-id"), v = l.getAttribute("data-signature-id");
          p && v && Ee(p, v).catch(_e);
          break;
        }
        case "clear-signer-profile":
          Q().catch(() => {
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
          ze(l, u).catch((p) => {
            window.toastManager && window.toastManager.error(p?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (o.matches("#field-checkbox-input")) {
          const l = o.getAttribute("data-field-id") || s.activeFieldId;
          if (!l) return;
          P(l, o.checked), h();
        }
      }
    }), document.addEventListener("input", (a) => {
      const o = a.target;
      if (!(o instanceof HTMLInputElement) && !(o instanceof HTMLTextAreaElement)) return;
      const l = o.getAttribute("data-field-id") || s.activeFieldId;
      if (l) {
        if (o.matches("#sig-type-input")) {
          Dn(l, o.value || "", { syncOverlay: !0 });
          return;
        }
        if (o.matches("#field-text-input")) {
          S(l, o.value || ""), h();
          return;
        }
        o.matches("#field-checkbox-input") && o instanceof HTMLInputElement && (P(l, o.checked), h());
      }
    });
  }
  Te(async () => {
    V(), s.isLowMemory = B(), Ae(), rt(), await yt(), qe(), we(), at(), He(), Xe(), ae(), Ei(), Dt(), await At(), Vt(), document.addEventListener("visibilitychange", J), "memory" in navigator && ue(), $t.init();
  });
  function J() {
    document.hidden && ie();
  }
  function ie() {
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
        a / o > 0.8 && (s.isLowMemory = !0, ie());
      }
    }, 3e4);
  }
  function Be(a) {
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
  function Ae() {
    const a = document.getElementById("pdf-compatibility-banner"), o = document.getElementById("pdf-compatibility-message"), l = document.getElementById("pdf-compatibility-title");
    if (!a || !o || !l) return;
    const u = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), p = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (u !== "limited") {
      a.classList.add("hidden");
      return;
    }
    l.textContent = "Preview Compatibility Notice", o.textContent = String(n.viewer.compatibilityMessage || "").trim() || Be(p), a.classList.remove("hidden"), d.trackDegradedMode("pdf_preview_compatibility", { tier: u, reason: p });
  }
  function rt() {
    const a = document.getElementById("stage-state-banner"), o = document.getElementById("stage-state-icon"), l = document.getElementById("stage-state-title"), u = document.getElementById("stage-state-message"), p = document.getElementById("stage-state-meta");
    if (!a || !o || !l || !u || !p) return;
    const v = n.signerState || "active", C = n.recipientStage || 1, T = n.activeStage || 1, R = n.activeRecipientIds || [], se = n.waitingForRecipientIds || [];
    let K = {
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
    switch (v) {
      case "waiting":
        K = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: C > T ? `You are in signing stage ${C}. Stage ${T} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, se.length > 0 && K.badges.push({
          icon: "iconoir-group",
          text: `${se.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        K = {
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
        K = {
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
        R.length > 1 ? (K.message = `You and ${R.length - 1} other signer(s) can sign now.`, K.badges = [
          { icon: "iconoir-users", text: `Stage ${T} active`, variant: "green" }
        ]) : C > 1 ? K.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${C}`, variant: "green" }
        ] : K.hidden = !0;
        break;
    }
    if (K.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${K.bgClass} ${K.borderClass}`, o.className = `${K.iconClass} mt-0.5`, l.className = `text-sm font-semibold ${K.titleClass}`, l.textContent = K.title, u.className = `text-xs ${K.messageClass} mt-1`, u.textContent = K.message, p.innerHTML = "", K.badges.forEach((Ce) => {
      const st = document.createElement("span"), Oe = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      st.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${Oe[Ce.variant] || Oe.blue}`, st.innerHTML = `<i class="${Ce.icon} mr-1"></i>${Ce.text}`, p.appendChild(st);
    });
  }
  function qe() {
    n.fields.forEach((a) => {
      let o = null, l = !1;
      if (a.type === "checkbox")
        o = a.value_bool || !1, l = o;
      else if (a.type === "date_signed")
        o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], l = !0;
      else {
        const u = String(a.value_text || "");
        o = u || Ve(a), l = !!u;
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
  function Ve(a) {
    const o = s.profileData;
    if (!o) return "";
    const l = String(a?.type || "").trim();
    return l === "name" ? St(o.fullName || "") : l === "initials" ? St(o.initials || "") || ni(o.fullName || n.recipientName || "") : l === "signature" ? St(o.typedSignature || "") : "";
  }
  function M(a) {
    return !n.profile.persistDrawnSignature || !s.profileData ? "" : a?.type === "initials" && String(s.profileData.drawnInitialsDataUrl || "").trim() || String(s.profileData.drawnSignatureDataUrl || "").trim();
  }
  function N(a) {
    const o = St(a?.value || "");
    return o || (s.profileData ? a?.type === "initials" ? St(s.profileData.initials || "") || ni(s.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? St(s.profileData.typedSignature || "") : "" : "");
  }
  function H() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : s.profileRemember;
  }
  async function Q(a = !1) {
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
  async function re(a, o = {}) {
    const l = H();
    if (s.profileRemember = l, !l) {
      await Q(!0);
      return;
    }
    if (!a) return;
    const u = {
      remember: !0
    }, p = String(a.type || "");
    if (p === "name" && typeof a.value == "string") {
      const v = St(a.value);
      v && (u.fullName = v, (s.profileData?.initials || "").trim() || (u.initials = ni(v)));
    }
    if (p === "initials") {
      if (o.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof o.signatureDataUrl == "string")
        u.drawnInitialsDataUrl = o.signatureDataUrl;
      else if (typeof a.value == "string") {
        const v = St(a.value);
        v && (u.initials = v);
      }
    }
    if (p === "signature") {
      if (o.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof o.signatureDataUrl == "string")
        u.drawnSignatureDataUrl = o.signatureDataUrl;
      else if (typeof a.value == "string") {
        const v = St(a.value);
        v && (u.typedSignature = v);
      }
    }
    if (!(Object.keys(u).length === 1 && u.remember === !0))
      try {
        const v = await c.save(s.profileKey, u);
        s.profileData = v;
      } catch {
      }
  }
  function ae() {
    const a = document.getElementById("consent-checkbox"), o = document.getElementById("consent-accept-btn");
    a && o && a.addEventListener("change", function() {
      o.disabled = !this.checked;
    });
  }
  function B() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function me() {
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
  function et(a) {
    if (s.isLowMemory) return;
    const o = [];
    a > 1 && o.push(a - 1), a < n.pageCount && o.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      o.forEach(async (l) => {
        !s.renderedPages.has(l) && !s.pageRendering && await ot(l);
      });
    }, { timeout: 2e3 });
  }
  async function ot(a) {
    if (!(!s.pdfDoc || s.renderedPages.has(a)))
      try {
        const o = await s.pdfDoc.getPage(a), l = s.zoomLevel, u = o.getViewport({ scale: l * window.devicePixelRatio }), p = document.createElement("canvas"), v = p.getContext("2d");
        p.width = u.width, p.height = u.height;
        const C = {
          canvasContext: v,
          viewport: u
        };
        await o.render(C).promise, s.renderedPages.set(a, {
          canvas: p,
          scale: l,
          timestamp: Date.now()
        }), me();
      } catch (o) {
        console.warn("Preload failed for page", a, o);
      }
  }
  function ct() {
    const a = window.devicePixelRatio || 1;
    return s.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function At() {
    const a = document.getElementById("pdf-loading"), o = Date.now();
    try {
      const l = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!l.ok)
        throw new Error("Failed to load document");
      const p = (await l.json()).assets || {}, v = p.source_url || p.executed_url || p.certificate_url || n.documentUrl;
      if (!v)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const C = pdfjsLib.getDocument(v);
      s.pdfDoc = await C.promise, n.pageCount = s.pdfDoc.numPages, document.getElementById("page-count").textContent = s.pdfDoc.numPages, await bt(1), Pn(), d.trackViewerLoad(!0, Date.now() - o), d.trackPageView(1);
    } catch (l) {
      console.error("PDF load error:", l), d.trackViewerLoad(!1, Date.now() - o, l.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Wr();
    }
  }
  async function bt(a) {
    if (!s.pdfDoc) return;
    const o = s.renderedPages.get(a);
    if (o && o.scale === s.zoomLevel) {
      en(o), s.currentPage = a, document.getElementById("current-page").textContent = a, Pn(), $e(), Vt(), et(a);
      return;
    }
    s.pageRendering = !0;
    try {
      const l = await s.pdfDoc.getPage(a), u = s.zoomLevel, p = ct(), v = l.getViewport({ scale: u * p }), C = l.getViewport({ scale: 1 });
      O.setPageViewport(a, {
        width: C.width,
        height: C.height,
        rotation: C.rotation || 0
      });
      const T = document.getElementById("pdf-page-1");
      T.innerHTML = "";
      const R = document.createElement("canvas"), se = R.getContext("2d");
      R.height = v.height, R.width = v.width, R.style.width = `${v.width / p}px`, R.style.height = `${v.height / p}px`, T.appendChild(R);
      const K = document.getElementById("pdf-container");
      K.style.width = `${v.width / p}px`;
      const Ce = {
        canvasContext: se,
        viewport: v
      };
      await l.render(Ce).promise, s.renderedPages.set(a, {
        canvas: R.cloneNode(!0),
        scale: u,
        timestamp: Date.now(),
        displayWidth: v.width / p,
        displayHeight: v.height / p
      }), s.renderedPages.get(a).canvas.getContext("2d").drawImage(R, 0, 0), me(), s.currentPage = a, document.getElementById("current-page").textContent = a, Pn(), $e(), Vt(), d.trackPageView(a), et(a);
    } catch (l) {
      console.error("Page render error:", l);
    } finally {
      if (s.pageRendering = !1, s.pageNumPending !== null) {
        const l = s.pageNumPending;
        s.pageNumPending = null, await bt(l);
      }
    }
  }
  function en(a, o) {
    const l = document.getElementById("pdf-page-1");
    l.innerHTML = "";
    const u = document.createElement("canvas");
    u.width = a.canvas.width, u.height = a.canvas.height, u.style.width = `${a.displayWidth}px`, u.style.height = `${a.displayHeight}px`, u.getContext("2d").drawImage(a.canvas, 0, 0), l.appendChild(u);
    const v = document.getElementById("pdf-container");
    v.style.width = `${a.displayWidth}px`;
  }
  function Mt(a) {
    s.pageRendering ? s.pageNumPending = a : bt(a);
  }
  function An(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? St(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? St(a.value) : "";
  }
  function hi(a, o, l, u = !1) {
    const p = document.createElement("img");
    p.className = "field-overlay-preview", p.src = o, p.alt = l, a.appendChild(p), a.classList.add("has-preview"), u && a.classList.add("draft-preview");
  }
  function vi(a, o, l = !1, u = !1) {
    const p = document.createElement("span");
    p.className = "field-overlay-value", l && p.classList.add("font-signature"), p.textContent = o, a.appendChild(p), a.classList.add("has-value"), u && a.classList.add("draft-preview");
  }
  function yi(a, o) {
    const l = document.createElement("span");
    l.className = "field-overlay-label", l.textContent = o, a.appendChild(l);
  }
  function br(a, o) {
    if (!o) return null;
    const l = a?.thread || {}, u = String(l.anchor_type || "").trim();
    if (u === "page") {
      const p = Number(l.page_number || 0) || 0, v = (Number(l.anchor_x || 0) || 0) > 0 || (Number(l.anchor_y || 0) || 0) > 0;
      if (p !== Number(s.currentPage || 0) || !v) return null;
      const C = O.pageToScreen({
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
      const v = O.pageToScreen({
        page: Number(p.page || s.currentPage || 1) || 1,
        posX: (Number(p.posX || 0) || 0) + (Number(p.width || 0) || 0) / 2,
        posY: Number(p.posY || 0) || 0,
        width: 0,
        height: 0
      }, o);
      return { left: v.left, top: v.top };
    }
    return null;
  }
  function wr(a, o) {
    if ((Array.isArray(s.reviewContext?.threads) ? s.reviewContext.threads : []).forEach((u, p) => {
      const v = u?.thread || {}, C = br(u, o);
      if (!C) return;
      const T = document.createElement("button");
      T.type = "button", T.className = "review-thread-marker", String(v.status || "").trim() === "resolved" && T.classList.add("resolved"), String(v.id || "").trim() === String(s.highlightedReviewThreadID || "").trim() && T.classList.add("active"), T.dataset.esignAction = "go-review-thread", T.dataset.threadId = String(v.id || "").trim(), T.style.left = `${Math.round(C.left)}px`, T.style.top = `${Math.round(C.top)}px`, T.title = `${ti(u)} comment`, T.setAttribute("aria-label", `${ti(u)} comment ${p + 1}`), T.textContent = String(p + 1), a.appendChild(T);
    }), ce() === "page" && s.reviewAnchorPointDraft && Number(s.reviewAnchorPointDraft.page_number || 0) === Number(s.currentPage || 0)) {
      const u = O.pageToScreen({
        page: Number(s.reviewAnchorPointDraft.page_number || s.currentPage || 1) || 1,
        posX: Number(s.reviewAnchorPointDraft.anchor_x || 0) || 0,
        posY: Number(s.reviewAnchorPointDraft.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, o), p = document.createElement("div");
      p.className = "review-thread-marker active", p.style.left = `${Math.round(u.left)}px`, p.style.top = `${Math.round(u.top)}px`, p.setAttribute("aria-hidden", "true"), p.textContent = "+", a.appendChild(p);
    }
  }
  function Vt() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const o = document.getElementById("pdf-container");
    s.fieldState.forEach((l, u) => {
      if (l.page !== s.currentPage) return;
      const p = document.createElement("div");
      if (p.className = "field-overlay", p.dataset.fieldId = u, l.required && p.classList.add("required"), l.completed && p.classList.add("completed"), s.activeFieldId === u && p.classList.add("active"), l.posX != null && l.posY != null && l.width != null && l.height != null) {
        const Ce = O.getOverlayStyles(l, o);
        p.style.left = Ce.left, p.style.top = Ce.top, p.style.width = Ce.width, p.style.height = Ce.height, p.style.transform = Ce.transform, $t.enabled && (p.dataset.debugCoords = JSON.stringify(
          O.pageToScreen(l, o)._debug
        ));
      } else {
        const Ce = Array.from(s.fieldState.keys()).indexOf(u);
        p.style.left = "10px", p.style.top = `${100 + Ce * 50}px`, p.style.width = "150px", p.style.height = "30px";
      }
      const C = String(l.previewSignatureUrl || "").trim(), T = String(l.signaturePreviewUrl || "").trim(), R = An(l), se = l.type === "signature" || l.type === "initials", K = typeof l.previewValueBool == "boolean";
      if (C)
        hi(p, C, Gt(l.type), !0);
      else if (l.completed && T)
        hi(p, T, Gt(l.type));
      else if (R) {
        const Ce = typeof l.previewValueText == "string" && l.previewValueText.trim() !== "";
        vi(p, R, se, Ce);
      } else l.type === "checkbox" && (K ? l.previewValueBool : !!l.value) ? vi(p, "Checked", !1, K) : yi(p, Gt(l.type));
      p.setAttribute("tabindex", "0"), p.setAttribute("role", "button"), p.setAttribute("aria-label", `${Gt(l.type)} field${l.required ? ", required" : ""}${l.completed ? ", completed" : ""}`), p.addEventListener("click", () => nn(u)), p.addEventListener("keydown", (Ce) => {
        (Ce.key === "Enter" || Ce.key === " ") && (Ce.preventDefault(), nn(u));
      }), a.appendChild(p);
    }), o && wr(a, o);
  }
  function Gt(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function Sr() {
    s.currentPage <= 1 || Mt(s.currentPage - 1);
  }
  function xr() {
    s.currentPage >= n.pageCount || Mt(s.currentPage + 1);
  }
  function tn(a) {
    a < 1 || a > n.pageCount || Mt(a);
  }
  function Pn() {
    document.getElementById("prev-page-btn").disabled = s.currentPage <= 1, document.getElementById("next-page-btn").disabled = s.currentPage >= n.pageCount;
  }
  function Ir() {
    s.zoomLevel = Math.min(s.zoomLevel + 0.25, 3), Tn(), Mt(s.currentPage);
  }
  function Er() {
    s.zoomLevel = Math.max(s.zoomLevel - 0.25, 0.5), Tn(), Mt(s.currentPage);
  }
  function Cr() {
    const o = document.getElementById("viewer-content").offsetWidth - 32, l = 612;
    s.zoomLevel = o / l, Tn(), Mt(s.currentPage);
  }
  function Tn() {
    document.getElementById("zoom-level").textContent = `${Math.round(s.zoomLevel * 100)}%`;
  }
  function nn(a) {
    if (!s.hasConsented && n.fields.some((o) => o.id === a && o.type !== "date_signed")) {
      Ci();
      return;
    }
    kn(a, { openEditor: !0 });
  }
  function kn(a, o = { openEditor: !0 }) {
    const l = s.fieldState.get(a);
    if (l) {
      if (o.openEditor && (s.activeFieldId = a, we()), document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), l.page !== s.currentPage && tn(l.page), !o.openEditor) {
        bi(a);
        return;
      }
      l.type !== "date_signed" && Lr(a);
    }
  }
  function bi(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Lr(a) {
    const o = s.fieldState.get(a);
    if (!o) return;
    const l = document.getElementById("field-editor-overlay"), u = document.getElementById("field-editor-content"), p = document.getElementById("field-editor-title"), v = document.getElementById("field-editor-legal-disclaimer");
    p.textContent = wi(o.type), u.innerHTML = _r(o), v?.classList.toggle("hidden", !(o.type === "signature" || o.type === "initials")), (o.type === "signature" || o.type === "initials") && Pr(a), l.classList.add("active"), l.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", an(l.querySelector(".field-editor")), Pe(`Editing ${wi(o.type)}. Press Escape to cancel.`), setTimeout(() => {
      const C = u.querySelector("input, textarea");
      C ? C.focus() : u.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Pt(s.writeCooldownUntil) > 0 && xi(Pt(s.writeCooldownUntil));
  }
  function wi(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function _r(a) {
    const o = Ar(a.type), l = Ge(String(a?.id || "")), u = Ge(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const p = a.type === "initials" ? "initials" : "signature", v = Ge(N(a)), C = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], T = Si(a.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${C.map((R) => `
            <button
              type="button"
              id="sig-tab-${R.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${T === R.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${R.id}"
              data-esign-action="signature-tab"
              data-field-id="${l}"
              role="tab"
              aria-selected="${T === R.id ? "true" : "false"}"
              aria-controls="sig-editor-${R.id}"
              tabindex="${T === R.id ? "0" : "-1"}"
            >
              ${R.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${T === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${p}"
              value="${v}"
              data-field-id="${l}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${l}">${v}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${p} will appear as your ${u}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${T === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
          <div id="sig-editor-upload" class="sig-editor-panel ${T === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${T === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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
          value="${Ge(String(a.value || ""))}"
          data-field-id="${l}"
        />
        ${o}
      `;
    if (a.type === "text") {
      const p = Ge(String(a.value || ""));
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
  function Ar(a) {
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
  function Dn(a, o, l = { syncOverlay: !1 }) {
    const u = document.getElementById("sig-type-preview"), p = s.fieldState.get(a);
    if (!p) return;
    const v = St(String(o || "").trim());
    if (l?.syncOverlay && (v ? S(a, v) : m(a), h()), !!u) {
      if (v) {
        u.textContent = v;
        return;
      }
      u.textContent = p.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function Si(a) {
    const o = String(s.signatureTabByField.get(a) || "").trim();
    return o === "draw" || o === "type" || o === "upload" || o === "saved" ? o : "draw";
  }
  function rn(a, o) {
    const l = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    s.signatureTabByField.set(o, l), document.querySelectorAll(".sig-editor-tab").forEach((p) => {
      p.classList.remove("border-blue-600", "text-blue-600"), p.classList.add("border-transparent", "text-gray-500"), p.setAttribute("aria-selected", "false"), p.setAttribute("tabindex", "-1");
    });
    const u = document.querySelector(`.sig-editor-tab[data-tab="${l}"]`);
    if (u?.classList.add("border-blue-600", "text-blue-600"), u?.classList.remove("border-transparent", "text-gray-500"), u?.setAttribute("aria-selected", "true"), u?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", l !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", l !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", l !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", l !== "saved"), (l === "draw" || l === "upload" || l === "saved") && u && requestAnimationFrame(() => sn(o)), l === "type") {
      const p = document.getElementById("sig-type-input");
      Dn(o, p?.value || "");
    }
    l === "saved" && xe(o).catch(_e);
  }
  function Pr(a) {
    s.signatureTabByField.set(a, "draw"), rn("draw", a);
    const o = document.getElementById("sig-type-input");
    o && Dn(a, o.value || "");
  }
  function sn(a) {
    const o = document.getElementById("sig-draw-canvas");
    if (!o || s.signatureCanvases.has(a)) return;
    const l = o.closest(".signature-canvas-container"), u = o.getContext("2d");
    if (!u) return;
    const p = o.getBoundingClientRect();
    if (!p.width || !p.height) return;
    const v = window.devicePixelRatio || 1;
    o.width = p.width * v, o.height = p.height * v, u.scale(v, v), u.lineCap = "round", u.lineJoin = "round", u.strokeStyle = "#1f2937", u.lineWidth = 2.5;
    let C = !1, T = 0, R = 0, se = [];
    const K = (de) => {
      const Ne = o.getBoundingClientRect();
      let wt, pt;
      return de.touches && de.touches.length > 0 ? (wt = de.touches[0].clientX, pt = de.touches[0].clientY) : de.changedTouches && de.changedTouches.length > 0 ? (wt = de.changedTouches[0].clientX, pt = de.changedTouches[0].clientY) : (wt = de.clientX, pt = de.clientY), {
        x: wt - Ne.left,
        y: pt - Ne.top,
        timestamp: Date.now()
      };
    }, Ce = (de) => {
      C = !0;
      const Ne = K(de);
      T = Ne.x, R = Ne.y, se = [{ x: Ne.x, y: Ne.y, t: Ne.timestamp, width: 2.5 }], l && l.classList.add("drawing");
    }, st = (de) => {
      if (!C) return;
      const Ne = K(de);
      se.push({ x: Ne.x, y: Ne.y, t: Ne.timestamp, width: 2.5 });
      const wt = Ne.x - T, pt = Ne.y - R, cn = Ne.timestamp - (se[se.length - 2]?.t || Ne.timestamp), Hn = Math.sqrt(wt * wt + pt * pt) / Math.max(cn, 1), ln = 2.5, zn = 1.5, On = 4, lt = Math.min(Hn / 5, 1), Ye = Math.max(zn, Math.min(On, ln - lt * 1.5));
      se[se.length - 1].width = Ye, u.lineWidth = Ye, u.beginPath(), u.moveTo(T, R), u.lineTo(Ne.x, Ne.y), u.stroke(), T = Ne.x, R = Ne.y;
    }, Oe = () => {
      if (C = !1, se.length > 1) {
        const de = s.signatureCanvases.get(a);
        de && (de.strokes.push(se.map((Ne) => ({ ...Ne }))), de.redoStack = []), $n(a);
      }
      se = [], l && l.classList.remove("drawing");
    };
    o.addEventListener("mousedown", Ce), o.addEventListener("mousemove", st), o.addEventListener("mouseup", Oe), o.addEventListener("mouseout", Oe), o.addEventListener("touchstart", (de) => {
      de.preventDefault(), de.stopPropagation(), Ce(de);
    }, { passive: !1 }), o.addEventListener("touchmove", (de) => {
      de.preventDefault(), de.stopPropagation(), st(de);
    }, { passive: !1 }), o.addEventListener("touchend", (de) => {
      de.preventDefault(), Oe();
    }, { passive: !1 }), o.addEventListener("touchcancel", Oe), o.addEventListener("gesturestart", (de) => de.preventDefault()), o.addEventListener("gesturechange", (de) => de.preventDefault()), o.addEventListener("gestureend", (de) => de.preventDefault()), s.signatureCanvases.set(a, {
      canvas: o,
      ctx: u,
      dpr: v,
      drawWidth: p.width,
      drawHeight: p.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Tr(a);
  }
  function Tr(a) {
    const o = s.signatureCanvases.get(a), l = s.fieldState.get(a);
    if (!o || !l) return;
    const u = M(l);
    u && Rn(a, u, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function Rn(a, o, l = { clearStrokes: !1 }) {
    const u = s.signatureCanvases.get(a);
    if (!u) return !1;
    const p = String(o || "").trim();
    if (!p)
      return u.baseImageDataUrl = "", u.baseImage = null, l.clearStrokes && (u.strokes = [], u.redoStack = []), Wt(a), !0;
    const { drawWidth: v, drawHeight: C } = u, T = new Image();
    return await new Promise((R) => {
      T.onload = () => {
        l.clearStrokes && (u.strokes = [], u.redoStack = []), u.baseImage = T, u.baseImageDataUrl = p, v > 0 && C > 0 && Wt(a), R(!0);
      }, T.onerror = () => R(!1), T.src = p;
    });
  }
  function Wt(a) {
    const o = s.signatureCanvases.get(a);
    if (!o) return;
    const { ctx: l, drawWidth: u, drawHeight: p, baseImage: v, strokes: C } = o;
    if (l.clearRect(0, 0, u, p), v) {
      const T = Math.min(u / v.width, p / v.height), R = v.width * T, se = v.height * T, K = (u - R) / 2, Ce = (p - se) / 2;
      l.drawImage(v, K, Ce, R, se);
    }
    for (const T of C)
      for (let R = 1; R < T.length; R++) {
        const se = T[R - 1], K = T[R];
        l.lineWidth = Number(K.width || 2.5) || 2.5, l.beginPath(), l.moveTo(se.x, se.y), l.lineTo(K.x, K.y), l.stroke();
      }
  }
  function kr(a) {
    const o = s.signatureCanvases.get(a);
    if (!o || o.strokes.length === 0) return;
    const l = o.strokes.pop();
    l && o.redoStack.push(l), Wt(a), $n(a);
  }
  function Dr(a) {
    const o = s.signatureCanvases.get(a);
    if (!o || o.redoStack.length === 0) return;
    const l = o.redoStack.pop();
    l && o.strokes.push(l), Wt(a), $n(a);
  }
  function Mn(a) {
    const o = s.signatureCanvases.get(a);
    if (!o) return !1;
    if ((o.baseImageDataUrl || "").trim() || o.strokes.length > 0) return !0;
    const { canvas: l, ctx: u } = o;
    return u.getImageData(0, 0, l.width, l.height).data.some((v, C) => C % 4 === 3 && v > 0);
  }
  function $n(a) {
    const o = s.signatureCanvases.get(a);
    o && (Mn(a) ? E(a, o.canvas.toDataURL("image/png")) : m(a), h());
  }
  function Rr(a) {
    const o = s.signatureCanvases.get(a);
    o && (o.strokes = [], o.redoStack = [], o.baseImage = null, o.baseImageDataUrl = "", Wt(a)), m(a), h();
    const l = document.getElementById("sig-upload-preview-wrap"), u = document.getElementById("sig-upload-preview");
    l && l.classList.add("hidden"), u && u.removeAttribute("src");
  }
  function Fn() {
    const a = document.getElementById("field-editor-overlay"), o = a.querySelector(".field-editor");
    if (on(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", s.activeFieldId) {
      const l = document.querySelector(`.field-list-item[data-field-id="${s.activeFieldId}"]`);
      requestAnimationFrame(() => {
        l?.focus();
      });
    }
    b(), h(), s.activeFieldId = null, we(), s.signatureCanvases.clear(), Pe("Field editor closed.");
  }
  function Pt(a) {
    const o = Number(a) || 0;
    return o <= 0 ? 0 : Math.max(0, Math.ceil((o - Date.now()) / 1e3));
  }
  function Mr(a, o = {}) {
    const l = Number(o.retry_after_seconds);
    if (Number.isFinite(l) && l > 0)
      return Math.ceil(l);
    const u = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!u) return 0;
    const p = Number(u);
    return Number.isFinite(p) && p > 0 ? Math.ceil(p) : 0;
  }
  async function Tt(a, o) {
    let l = {};
    try {
      l = await a.json();
    } catch {
      l = {};
    }
    const u = l?.error || {}, p = u?.details && typeof u.details == "object" ? u.details : {}, v = Mr(a, p), C = a?.status === 429, T = C ? v > 0 ? `Too many actions too quickly. Please wait ${v}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(u?.message || o || "Request failed"), R = new Error(T);
    return R.status = a?.status || 0, R.code = String(u?.code || ""), R.details = p, R.rateLimited = C, R.retryAfterSeconds = v, R;
  }
  function xi(a) {
    const o = Math.max(1, Number(a) || 1);
    s.writeCooldownUntil = Date.now() + o * 1e3, s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
    const l = () => {
      const u = document.getElementById("field-editor-save");
      if (!u) return;
      const p = Pt(s.writeCooldownUntil);
      if (p <= 0) {
        s.pendingSaves.has(s.activeFieldId || "") || (u.disabled = !1, u.innerHTML = "Insert"), s.writeCooldownTimer && (clearInterval(s.writeCooldownTimer), s.writeCooldownTimer = null);
        return;
      }
      u.disabled = !0, u.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s`;
    };
    l(), s.writeCooldownTimer = setInterval(l, 250);
  }
  function $r(a) {
    const o = Math.max(1, Number(a) || 1);
    s.submitCooldownUntil = Date.now() + o * 1e3, s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    const l = () => {
      const u = Pt(s.submitCooldownUntil);
      Dt(), u <= 0 && s.submitCooldownTimer && (clearInterval(s.submitCooldownTimer), s.submitCooldownTimer = null);
    };
    l(), s.submitCooldownTimer = setInterval(l, 250);
  }
  async function Fr() {
    const a = s.activeFieldId;
    if (!a) return;
    const o = s.fieldState.get(a);
    if (!o) return;
    const l = Pt(s.writeCooldownUntil);
    if (l > 0) {
      const p = `Please wait ${l}s before saving again.`;
      window.toastManager && window.toastManager.error(p), Pe(p, "assertive");
      return;
    }
    const u = document.getElementById("field-editor-save");
    u.disabled = !0, u.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      s.profileRemember = H();
      let p = !1;
      if (o.type === "signature" || o.type === "initials")
        p = await Br(a);
      else if (o.type === "checkbox") {
        const v = document.getElementById("field-checkbox-input");
        p = await Bn(a, null, v?.checked || !1);
      } else {
        const C = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!C && o.required)
          throw new Error("This field is required");
        p = await Bn(a, C, null);
      }
      if (p) {
        Fn(), Ei(), Dt(), _i(), Vt(), Hr(a), Or(a);
        const v = Ai();
        v.allRequiredComplete ? Pe("Field saved. All required fields complete. Ready to submit.") : Pe(`Field saved. ${v.remainingRequired} required field${v.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (p) {
      p?.rateLimited && xi(p.retryAfterSeconds), window.toastManager && window.toastManager.error(p.message), Pe(`Error saving field: ${p.message}`, "assertive");
    } finally {
      if (Pt(s.writeCooldownUntil) > 0) {
        const p = Pt(s.writeCooldownUntil);
        u.disabled = !0, u.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${p}s`;
      } else
        u.disabled = !1, u.innerHTML = "Insert";
    }
  }
  async function Br(a) {
    const o = s.fieldState.get(a), l = document.getElementById("sig-type-input"), u = Si(a);
    if (u === "draw" || u === "upload" || u === "saved") {
      const v = s.signatureCanvases.get(a);
      if (!v) return !1;
      if (!Mn(a))
        throw new Error(o?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const C = v.canvas.toDataURL("image/png");
      return await Ii(a, { type: "drawn", dataUrl: C }, o?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const v = l?.value?.trim();
      if (!v)
        throw new Error(o?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return o.type === "initials" ? await Bn(a, v, null) : await Ii(a, { type: "typed", text: v }, v);
    }
  }
  async function Bn(a, o, l) {
    s.pendingSaves.add(a);
    const u = Date.now(), p = s.fieldState.get(a);
    try {
      const v = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: a,
          value_text: o,
          value_bool: l
        })
      });
      if (!v.ok)
        throw await Tt(v, "Failed to save field");
      const C = s.fieldState.get(a);
      return C && (C.value = o ?? l, C.completed = !0, C.hasError = !1), await re(C), window.toastManager && window.toastManager.success("Field saved"), d.trackFieldSave(a, C?.type, !0, Date.now() - u), !0;
    } catch (v) {
      const C = s.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = v.message), d.trackFieldSave(a, p?.type, !1, Date.now() - u, v.message), v;
    } finally {
      s.pendingSaves.delete(a);
    }
  }
  async function Ii(a, o, l) {
    s.pendingSaves.add(a);
    const u = Date.now(), p = o?.type || "typed";
    try {
      let v;
      if (p === "drawn") {
        const R = await te.uploadDrawnSignature(
          a,
          o.dataUrl
        );
        v = {
          field_instance_id: a,
          type: "drawn",
          value_text: l,
          object_key: R.objectKey,
          sha256: R.sha256,
          upload_token: R.uploadToken
        };
      } else
        v = await Nr(a, l);
      const C = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v)
      });
      if (!C.ok)
        throw await Tt(C, "Failed to save signature");
      const T = s.fieldState.get(a);
      return T && (T.value = l, T.completed = !0, T.hasError = !1, o?.dataUrl && (T.signaturePreviewUrl = o.dataUrl)), await re(T, {
        signatureType: p,
        signatureDataUrl: o?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), d.trackSignatureAttach(a, p, !0, Date.now() - u), !0;
    } catch (v) {
      const C = s.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = v.message), d.trackSignatureAttach(a, p, !1, Date.now() - u, v.message), v;
    } finally {
      s.pendingSaves.delete(a);
    }
  }
  async function Nr(a, o) {
    const l = `${o}|${a}`, u = await Ur(l), p = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: o,
      object_key: p,
      sha256: u
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Ur(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const o = new TextEncoder().encode(a), l = await window.crypto.subtle.digest("SHA-256", o);
      return Array.from(new Uint8Array(l)).map((u) => u.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Ei() {
    let a = 0;
    s.fieldState.forEach((R) => {
      R.required, R.completed && a++;
    });
    const o = s.fieldState.size, l = o > 0 ? a / o * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = o;
    const u = document.getElementById("progress-ring-circle"), p = 97.4, v = p - l / 100 * p;
    u.style.strokeDashoffset = v, document.getElementById("mobile-progress").style.width = `${l}%`;
    const C = o - a, T = document.getElementById("fields-status");
    T && (_() ? T.textContent = f() ? Kt(s.reviewContext.status) : "Review" : f() && s.reviewContext.sign_blocked ? T.textContent = "Review blocked" : T.textContent = C > 0 ? `${C} remaining` : "All complete"), Xe();
  }
  function Dt() {
    Xe();
    const a = document.getElementById("submit-btn"), o = document.getElementById("incomplete-warning"), l = document.getElementById("incomplete-message"), u = Pt(s.submitCooldownUntil);
    let p = [], v = !1;
    s.fieldState.forEach((R, se) => {
      R.required && !R.completed && p.push(R), R.hasError && (v = !0);
    });
    const C = !!s.reviewContext?.sign_blocked, T = s.canSignSession && s.hasConsented && p.length === 0 && !v && !C && s.pendingSaves.size === 0 && u === 0 && !s.isSubmitting;
    a.disabled = !T, !s.isSubmitting && u > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${u}s` : !s.isSubmitting && u === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), s.hasConsented ? u > 0 ? (o.classList.remove("hidden"), l.textContent = `Please wait ${u}s before submitting again.`) : s.canSignSession ? C ? (o.classList.remove("hidden"), l.textContent = s.reviewContext?.sign_block_reason || "Signing is blocked until review completes.") : v ? (o.classList.remove("hidden"), l.textContent = "Some fields failed to save. Please retry.") : p.length > 0 ? (o.classList.remove("hidden"), l.textContent = `Complete ${p.length} required field${p.length > 1 ? "s" : ""}`) : o.classList.add("hidden") : (o.classList.remove("hidden"), l.textContent = "This session cannot submit signatures.") : (o.classList.remove("hidden"), l.textContent = "Please accept the consent agreement");
  }
  function Hr(a) {
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
  function zr() {
    const a = Array.from(s.fieldState.values()).filter((o) => o.required);
    return a.sort((o, l) => {
      const u = Number(o.page || 0), p = Number(l.page || 0);
      if (u !== p) return u - p;
      const v = Number(o.tabIndex || 0), C = Number(l.tabIndex || 0);
      if (v > 0 && C > 0 && v !== C) return v - C;
      if (v > 0 != C > 0) return v > 0 ? -1 : 1;
      const T = Number(o.posY || 0), R = Number(l.posY || 0);
      if (T !== R) return T - R;
      const se = Number(o.posX || 0), K = Number(l.posX || 0);
      return se !== K ? se - K : String(o.id || "").localeCompare(String(l.id || ""));
    }), a;
  }
  function Nn(a) {
    s.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((o) => o.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((o) => o.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function Or(a) {
    const o = zr(), l = o.filter((C) => !C.completed);
    if (l.length === 0) {
      d.track("guided_next_none_remaining", { fromFieldId: a });
      const C = document.getElementById("submit-btn");
      C?.scrollIntoView({ behavior: "smooth", block: "nearest" }), C?.focus(), Pe("All required fields are complete. Review the document and submit when ready.");
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
    const v = Number(p.page || 1);
    v !== s.currentPage && tn(v), kn(p.id, { openEditor: !1 }), Nn(p.id), setTimeout(() => {
      Nn(p.id), bi(p.id), d.track("guided_next_completed", { toFieldId: p.id, page: p.page }), Pe(`Next required field highlighted on page ${p.page}.`);
    }, 120);
  }
  function Ci() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", an(a.querySelector(".field-editor")), Pe("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Un() {
    const a = document.getElementById("consent-modal"), o = a.querySelector(".field-editor");
    on(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", Pe("Consent dialog closed.");
  }
  async function jr() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const o = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!o.ok)
        throw await Tt(o, "Failed to accept consent");
      s.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Un(), Dt(), _i(), d.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), Pe("Consent accepted. You can now complete the fields and submit.");
    } catch (o) {
      window.toastManager && window.toastManager.error(o.message), Pe(`Error: ${o.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function qr() {
    if (!s.canSignSession || s.reviewContext?.sign_blocked) {
      Dt();
      return;
    }
    const a = document.getElementById("submit-btn"), o = Pt(s.submitCooldownUntil);
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
        throw await Tt(u, "Failed to submit");
      d.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (l) {
      d.trackSubmit(!1, l.message), l?.rateLimited && $r(l.retryAfterSeconds), window.toastManager && window.toastManager.error(l.message);
    } finally {
      s.isSubmitting = !1, Dt();
    }
  }
  function Vr() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", an(a.querySelector(".field-editor")), Pe("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Li() {
    const a = document.getElementById("decline-modal"), o = a.querySelector(".field-editor");
    on(o), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", Pe("Decline dialog closed.");
  }
  async function Gr() {
    const a = document.getElementById("decline-reason").value;
    try {
      const o = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!o.ok)
        throw await Tt(o, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (o) {
      window.toastManager && window.toastManager.error(o.message);
    }
  }
  function Wr() {
    d.trackDegradedMode("viewer_load_failure"), d.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Yr() {
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
          console.log("[E-Sign Debug] Reloading viewer..."), At();
        },
        setLowMemory: (a) => {
          s.isLowMemory = a, me(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), At(), this.updatePanel();
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
  function Pe(a, o = "polite") {
    const l = o === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    l && (l.textContent = "", requestAnimationFrame(() => {
      l.textContent = a;
    }));
  }
  function an(a) {
    const l = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), u = l[0], p = l[l.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function v(C) {
      C.key === "Tab" && (C.shiftKey ? document.activeElement === u && (C.preventDefault(), p?.focus()) : document.activeElement === p && (C.preventDefault(), u?.focus()));
    }
    a.addEventListener("keydown", v), a._focusTrapHandler = v, requestAnimationFrame(() => {
      u?.focus();
    });
  }
  function on(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const o = a.dataset.previousFocus;
    if (o) {
      const l = document.getElementById(o);
      requestAnimationFrame(() => {
        l?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function _i() {
    const a = Ai(), o = document.getElementById("submit-status");
    o && (a.allRequiredComplete && s.hasConsented ? o.textContent = "All required fields complete. You can now submit." : s.hasConsented ? o.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : o.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Ai() {
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
  function Jr(a, o = 1) {
    const l = Array.from(s.fieldState.keys()), u = l.indexOf(a);
    if (u === -1) return null;
    const p = u + o;
    return p >= 0 && p < l.length ? l[p] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (Fn(), Un(), Li(), Ze()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const o = Array.from(document.querySelectorAll(".sig-editor-tab")), l = o.indexOf(a.target);
      if (l !== -1) {
        let u = l;
        if (a.key === "ArrowRight" && (u = (l + 1) % o.length), a.key === "ArrowLeft" && (u = (l - 1 + o.length) % o.length), a.key === "Home" && (u = 0), a.key === "End" && (u = o.length - 1), u !== l) {
          a.preventDefault();
          const p = o[u], v = p.getAttribute("data-tab") || "draw", C = p.getAttribute("data-field-id");
          C && rn(v, C), p.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const o = a.target.dataset.fieldId, l = a.key === "ArrowDown" ? 1 : -1, u = Jr(o, l);
        u && document.querySelector(`.field-list-item[data-field-id="${u}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const o = a.target.dataset.fieldId;
        o && nn(o);
      }
    }
    a.key === "Tab" && !a.target.closest(".field-editor-overlay") && !a.target.closest("#consent-modal") && a.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(a) {
    a.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class mr {
  constructor(e) {
    this.config = e;
  }
  init() {
    Ha(this.config);
  }
  destroy() {
  }
}
function Go(i) {
  const e = new mr(i);
  return Te(() => e.init()), e;
}
function za() {
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
  const e = za();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new mr(e);
  t.init(), window.esignSignerReviewController = t;
});
class fr {
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
    Ut('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Ut('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function Wo(i = {}) {
  const e = new fr(i);
  return Te(() => e.init()), e;
}
function Yo(i = {}) {
  const e = new fr(i);
  Te(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class pi {
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
    e && $(e), t && W(t), n && $(n), r && $(r);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: r } = this.elements;
    e && $(e), t && $(t), n && $(n), r && W(r);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: r, errorMessage: c, viewer: d } = this.elements;
    t && $(t), n && $(n), r && W(r), d && $(d), c && (c.textContent = e);
  }
}
function Jo(i) {
  const e = new pi(i);
  return e.init(), e;
}
function Ko(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new pi(e);
  Te(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && Te(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new pi({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class Xo {
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
class Qo {
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
function Oa(i) {
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
function ja(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", r = t.label ?? String(n);
    return { label: String(r), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function qa(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), r = e ? String(e).trim().toLowerCase() : "";
  return r && n.includes(r) ? [r, ...n.filter((c) => c !== r)] : n;
}
function Zo(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function ec(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: Oa(e.type),
    options: ja(e.options),
    operators: qa(e.operators, e.default_operator)
  })) : [];
}
function tc(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function nc(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ic(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function rc(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([d, s]) => `${d}: ${s}`).join("; ") : "", r = e?.textCode ? `${e.textCode}: ` : "", c = e?.message || `${i} failed`;
    t.error(n ? `${r}${c}: ${n}` : `${r}${c}`);
  }
}
function sc(i, e) {
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
function ac(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const oc = {
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
}, _n = "application/vnd.google-apps.document", gi = "application/vnd.google-apps.spreadsheet", mi = "application/vnd.google-apps.presentation", hr = "application/vnd.google-apps.folder", fi = "application/pdf", Va = [_n, fi], vr = "esign.google.account_id";
function Ga(i) {
  return i.mimeType === _n;
}
function Wa(i) {
  return i.mimeType === fi;
}
function jt(i) {
  return i.mimeType === hr;
}
function Ya(i) {
  return Va.includes(i.mimeType);
}
function cc(i) {
  return i.mimeType === _n || i.mimeType === gi || i.mimeType === mi;
}
function Ja(i) {
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
function lc(i) {
  return i.map(Ja);
}
function yr(i) {
  return {
    [_n]: "Google Doc",
    [gi]: "Google Sheet",
    [mi]: "Google Slides",
    [hr]: "Folder",
    [fi]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Ka(i) {
  return jt(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Ga(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Wa(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === gi ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === mi ? {
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
function Xa(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Qa(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function dc(i, e) {
  const t = i.get("account_id");
  if (t)
    return wn(t);
  if (e)
    return wn(e);
  const n = localStorage.getItem(vr);
  return n ? wn(n) : "";
}
function wn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function uc(i) {
  const e = wn(i);
  e && localStorage.setItem(vr, e);
}
function pc(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function gc(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function mc(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function qt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Za(i) {
  const e = Ka(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function fc(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, r) => {
    const c = r === t.length - 1, d = r > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return c ? `${d}<span class="text-gray-900 font-medium">${qt(n.name)}</span>` : `${d}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${qt(n.name)}</button>`;
  }).join("");
}
function eo(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: r = !0 } = e, c = Za(i), d = jt(i), s = Ya(i), h = d ? "cursor-pointer hover:bg-gray-50" : s ? "cursor-pointer hover:bg-blue-50" : "opacity-60", m = d ? `data-folder-id="${i.id}" data-folder-name="${qt(i.name)}"` : s && t ? `data-file-id="${i.id}" data-file-name="${qt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${h} file-item"
      ${m}
      role="listitem"
      ${s ? 'tabindex="0"' : ""}
    >
      ${c}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${qt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${yr(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Xa(i.size)}` : ""}
          ${r && i.modifiedTime ? ` &middot; ${Qa(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${s && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function hc(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${qt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((c, d) => jt(c) && !jt(d) ? -1 : !jt(c) && jt(d) ? 1 : c.name.localeCompare(d.name)).map((c) => eo(c, { selectable: n })).join("")}
    </div>
  `;
}
function vc(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: yr(i.mimeType)
  };
}
export {
  os as AGREEMENT_STATUS_BADGES,
  gr as AgreementFormController,
  pi as DocumentDetailPreviewController,
  ui as DocumentFormController,
  ns as ESignAPIClient,
  is as ESignAPIError,
  vr as GOOGLE_ACCOUNT_STORAGE_KEY,
  er as GoogleCallbackController,
  nr as GoogleDrivePickerController,
  tr as GoogleIntegrationController,
  Va as IMPORTABLE_MIME_TYPES,
  sr as IntegrationConflictsController,
  ir as IntegrationHealthController,
  rr as IntegrationMappingsController,
  ar as IntegrationSyncRunsController,
  di as LandingPageController,
  _n as MIME_GOOGLE_DOC,
  hr as MIME_GOOGLE_FOLDER,
  gi as MIME_GOOGLE_SHEET,
  mi as MIME_GOOGLE_SLIDES,
  fi as MIME_PDF,
  Xo as PanelPaginationBehavior,
  Qo as PanelSearchBehavior,
  oc as STANDARD_GRID_SELECTORS,
  Zi as SignerCompletePageController,
  fr as SignerErrorPageController,
  mr as SignerReviewController,
  gt as announce,
  pc as applyAccountIdToPath,
  gs as applyDetailFormatters,
  Pa as bootstrapAgreementForm,
  Ko as bootstrapDocumentDetailPreview,
  qo as bootstrapDocumentForm,
  To as bootstrapGoogleCallback,
  Mo as bootstrapGoogleDrivePicker,
  Do as bootstrapGoogleIntegration,
  Ho as bootstrapIntegrationConflicts,
  Fo as bootstrapIntegrationHealth,
  No as bootstrapIntegrationMappings,
  Oo as bootstrapIntegrationSyncRuns,
  Lo as bootstrapLandingPage,
  Ao as bootstrapSignerCompletePage,
  Yo as bootstrapSignerErrorPage,
  Ha as bootstrapSignerReview,
  gc as buildScopedApiUrl,
  mo as byId,
  as as capitalize,
  ss as createESignClient,
  ls as createElement,
  ac as createSchemaActionCachingRefresh,
  vc as createSelectedFile,
  po as createStatusBadgeElement,
  Io as createTimeoutController,
  tc as dateTimeCellRenderer,
  xn as debounce,
  rc as defaultActionErrorHandler,
  ic as defaultActionSuccessHandler,
  ho as delegate,
  qt as escapeHtml,
  nc as fileSizeCellRenderer,
  so as formatDate,
  Sn as formatDateTime,
  Qa as formatDriveDate,
  Xa as formatDriveFileSize,
  hn as formatFileSize,
  ro as formatPageCount,
  co as formatRecipientCount,
  oo as formatRelativeTime,
  us as formatSizeElements,
  ao as formatTime,
  ps as formatTimestampElements,
  Xi as getAgreementStatusBadge,
  io as getESignClient,
  Ka as getFileIconConfig,
  yr as getFileTypeName,
  ds as getPageConfig,
  $ as hide,
  Vo as initAgreementForm,
  ms as initDetailFormatters,
  Jo as initDocumentDetailPreview,
  jo as initDocumentForm,
  Po as initGoogleCallback,
  Ro as initGoogleDrivePicker,
  ko as initGoogleIntegration,
  Uo as initIntegrationConflicts,
  $o as initIntegrationHealth,
  Bo as initIntegrationMappings,
  zo as initIntegrationSyncRuns,
  Co as initLandingPage,
  _o as initSignerCompletePage,
  Wo as initSignerErrorPage,
  Go as initSignerReview,
  jt as isFolder,
  Ga as isGoogleDoc,
  cc as isGoogleWorkspaceFile,
  Ya as isImportable,
  Wa as isPDF,
  wn as normalizeAccountId,
  Ja as normalizeDriveFile,
  lc as normalizeDriveFiles,
  qa as normalizeFilterOperators,
  ja as normalizeFilterOptions,
  Oa as normalizeFilterType,
  fo as on,
  Te as onReady,
  wo as poll,
  ec as prepareFilterFields,
  Zo as prepareGridColumns,
  g as qs,
  Ut as qsa,
  fc as renderBreadcrumb,
  Za as renderFileIcon,
  eo as renderFileItem,
  hc as renderFileList,
  cs as renderStatusBadge,
  dc as resolveAccountId,
  So as retry,
  uc as saveAccountId,
  rs as setESignClient,
  yo as setLoading,
  sc as setupRefreshButton,
  W as show,
  Qi as sleep,
  lo as snakeToTitle,
  mc as syncAccountIdToUrl,
  xo as throttle,
  vo as toggle,
  uo as truncate,
  Xt as updateDataText,
  bo as updateDataTexts,
  go as updateStatusBadge,
  Eo as withTimeout
};
//# sourceMappingURL=index.js.map

import { e as Ve } from "../chunks/html-DyksyvcZ.js";
class vs {
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
    const c = {};
    for (const b of e) {
      const v = String(b?.status || "").trim().toLowerCase();
      v && (c[v] = (c[v] || 0) + 1);
    }
    const l = (c.sent || 0) + (c.in_progress || 0), a = l + (c.declined || 0);
    return {
      draft: c.draft || 0,
      sent: c.sent || 0,
      in_progress: c.in_progress || 0,
      completed: c.completed || 0,
      voided: c.voided || 0,
      declined: c.declined || 0,
      expired: c.expired || 0,
      pending: l,
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
      throw new ws(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class ws extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Xn = null;
function kr() {
  if (!Xn)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Xn;
}
function bs(i) {
  Xn = i;
}
function xs(i) {
  const e = new vs(i);
  return bs(e), e;
}
function xn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Tr(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Cn(i, e) {
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
function _r(i, e) {
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
function Mr(i, e) {
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
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), c = Math.round(s / 60), l = Math.round(c / 60), a = Math.round(l / 24), b = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(a) >= 1 ? b.format(a, "day") : Math.abs(l) >= 1 ? b.format(l, "hour") : Math.abs(c) >= 1 ? b.format(c, "minute") : b.format(s, "second");
  } catch {
    return String(i);
  }
}
function Dr(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Ss(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function Br(i) {
  return i ? i.split("_").map((e) => Ss(e)).join(" ") : "";
}
function Fr(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const Is = {
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
function Li(i) {
  const e = String(i || "").trim().toLowerCase();
  return Is[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Es(i, e) {
  const t = Li(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", c = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, l = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${c[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${l}${t.label}</span>`;
}
function Rr(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = Es(i, e), t.firstElementChild;
}
function Hr(i, e, t) {
  const n = Li(e), s = t?.size ?? "sm", c = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${c[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
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
function g(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function St(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function qr(i) {
  return document.getElementById(i);
}
function Ls(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, c] of Object.entries(e))
      c !== void 0 && n.setAttribute(s, c);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function Nr(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function jr(i, e, t, n, s) {
  const c = (l) => {
    const a = l.target.closest(e);
    a && i.contains(a) && n.call(a, l, a);
  };
  return i.addEventListener(t, c, s), () => i.removeEventListener(t, c, s);
}
function Q(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function D(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function C(i) {
  i && i.classList.add("hidden");
}
function Ur(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? D(i) : C(i);
}
function zr(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function an(i, e, t = document) {
  const n = g(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function Or(i, e = document) {
  for (const [t, n] of Object.entries(i))
    an(t, n, e);
}
function Cs(i = "[data-esign-page]", e = "data-esign-config") {
  const t = g(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const s = g(
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
function ve(i, e = "polite") {
  const t = g(`[aria-live="${e}"]`) || (() => {
    const n = Ls("div", {
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
async function Vr(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: c = 30,
    onProgress: l,
    signal: a
  } = i, b = Date.now();
  let v = 0, E;
  for (; v < c; ) {
    if (a?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - b >= s)
      return {
        result: E,
        attempts: v,
        stopped: !1,
        timedOut: !0
      };
    if (v++, E = await e(), l && l(E, v), t(E))
      return {
        result: E,
        attempts: v,
        stopped: !0,
        timedOut: !1
      };
    await Ci(n, a);
  }
  return {
    result: E,
    attempts: v,
    stopped: !1,
    timedOut: !1
  };
}
async function Gr(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: c = !0,
    shouldRetry: l = () => !0,
    onRetry: a,
    signal: b
  } = i;
  let v;
  for (let E = 1; E <= t; E++) {
    if (b?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (P) {
      if (v = P, E >= t || !l(P, E))
        throw P;
      const R = c ? Math.min(n * Math.pow(2, E - 1), s) : n;
      a && a(P, E, R), await Ci(R, b);
    }
  }
  throw v;
}
function Ci(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const s = setTimeout(t, i);
    if (e) {
      const c = () => {
        clearTimeout(s), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", c, { once: !0 });
    }
  });
}
function Pn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function Wr(i, e) {
  let t = 0, n = null;
  return (...s) => {
    const c = Date.now();
    c - t >= e ? (t = c, i(...s)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...s);
      },
      e - (c - t)
    ));
  };
}
function Jr(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Yr(i, e, t = "Operation timed out") {
  let n;
  const s = new Promise((c, l) => {
    n = setTimeout(() => {
      l(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, s]);
  } finally {
    clearTimeout(n);
  }
}
class ni {
  constructor(e) {
    this.config = e, this.client = xs({
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
    an('count="draft"', e.draft), an('count="pending"', e.pending), an('count="completed"', e.completed), an('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Kr(i) {
  const e = i || Cs(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new ni(e);
  return Q(() => t.init()), t;
}
function Xr(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new ni(t);
  Q(() => n.init());
}
typeof document < "u" && Q(() => {
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
      const s = String(n.basePath || n.base_path || "/admin"), c = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new ni({ basePath: s, apiBasePath: c }).init();
    }
  }
});
class Pi {
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
      const s = g(`#artifacts-${n}`);
      s && (n === e ? D(s) : C(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = g("#artifact-executed"), n = g("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), D(t));
    }
    if (e.source) {
      const t = g("#artifact-source"), n = g("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), D(t));
    }
    if (e.certificate) {
      const t = g("#artifact-certificate"), n = g("#artifact-certificate-link");
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
function Qr(i) {
  const e = new Pi(i);
  return Q(() => e.init()), e;
}
function Zr(i) {
  const e = new Pi(i);
  Q(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Ps(i = document) {
  St("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = xn(t));
  });
}
function As(i = document) {
  St("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Cn(t));
  });
}
function ks(i = document) {
  Ps(i), As(i);
}
function Ts() {
  Q(() => {
    ks();
  });
}
typeof document < "u" && Ts();
const mi = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Ai {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), c = e.get("state"), l = this.parseOAuthState(c);
    l.account_id || (l.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, s, l) : t ? this.handleSuccess(t, l) : this.handleError("unknown", "No authorization code was received from Google.", l);
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
    switch (C(t), C(n), C(s), e) {
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
    const { errorMessage: s, errorDetail: c, closeBtn: l } = this.elements;
    s && (s.textContent = mi[e] || mi.unknown), t && c && (c.textContent = t, D(c)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), c = s.get("state"), a = this.parseOAuthState(c).account_id || s.get("account_id");
      a && n.searchParams.set("account_id", a), window.location.href = n.toString();
    }
  }
}
function ea(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Ai(e);
  return Q(() => t.init()), t;
}
function ta(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new Ai(e);
  Q(() => t.init());
}
const Vn = "esign.google.account_id", _s = {
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
class ki {
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
      retryBtn: s,
      reauthBtn: c,
      oauthCancelBtn: l,
      disconnectCancelBtn: a,
      disconnectConfirmBtn: b,
      accountIdInput: v,
      oauthModal: E,
      disconnectModal: P
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), c && c.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, P && D(P);
    }), a && a.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, P && C(P);
    }), b && b.addEventListener("click", () => this.disconnect()), l && l.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), v && (v.addEventListener("change", () => {
      this.setCurrentAccountId(v.value, !0);
    }), v.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(v.value, !0));
    }));
    const { accountDropdown: R, connectFirstBtn: F } = this.elements;
    R && R.addEventListener("change", () => {
      R.value === "__new__" ? (R.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(R.value, !0);
    }), F && F.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), P && !P.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, C(P)));
    }), [E, P].forEach((B) => {
      B && B.addEventListener("click", (z) => {
        const V = z.target;
        (V === B || V.getAttribute("aria-hidden") === "true") && (C(B), B === E ? this.cancelOAuthFlow() : B === P && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Vn)
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
      this.currentAccountId ? window.localStorage.setItem(Vn, this.currentAccountId) : window.localStorage.removeItem(Vn);
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
    t && (t.textContent = e), ve(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: c } = this.elements;
    switch (C(t), C(n), C(s), C(c), e) {
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
        D(c);
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
        let c = `Failed to check status: ${e.status}`;
        try {
          const l = await e.json();
          l?.error?.message && (c = l.error.message);
        } catch {
        }
        throw new Error(c);
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
    const t = (z, V) => {
      for (const X of z)
        if (Object.prototype.hasOwnProperty.call(e, X) && e[X] !== void 0 && e[X] !== null)
          return e[X];
      return V;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), c = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), l = t(["connected", "Connected"], !1), a = t(["degraded", "Degraded"], !1), b = t(["degraded_reason", "DegradedReason"], ""), v = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), P = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let R = t(["is_expired", "IsExpired"], void 0), F = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof R != "boolean" || typeof F != "boolean") && n) {
      const z = new Date(n);
      if (!Number.isNaN(z.getTime())) {
        const V = z.getTime() - Date.now(), X = 5 * 60 * 1e3;
        R = V <= 0, F = V > 0 && V <= X;
      }
    }
    const B = typeof P == "boolean" ? P : (R === !0 || F === !0) && !E;
    return {
      connected: l,
      account_id: c,
      email: v,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: R === !0,
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
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: c, reauthWarning: l, reauthReason: a } = this.elements;
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
        const s = _s[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, s, c) {
    const { expiryInfo: l, reauthWarning: a, reauthReason: b } = this.elements;
    if (!l) return;
    if (l.classList.remove("text-red-600", "text-amber-600"), l.classList.add("text-gray-500"), !e) {
      l.textContent = "Access token status unknown", a && C(a);
      return;
    }
    const v = new Date(e), E = /* @__PURE__ */ new Date(), P = Math.max(
      1,
      Math.round((v.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? s ? (l.textContent = "Access token expired, but refresh is available and will be applied automatically.", l.classList.remove("text-gray-500"), l.classList.add("text-amber-600"), a && C(a)) : (l.textContent = "Access token has expired. Please re-authorize.", l.classList.remove("text-gray-500"), l.classList.add("text-red-600"), a && D(a), b && (b.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (l.classList.remove("text-gray-500"), l.classList.add("text-amber-600"), s ? (l.textContent = `Token expires in approximately ${P} minute${P !== 1 ? "s" : ""}. Refresh is available automatically.`, a && C(a)) : (l.textContent = `Token expires in approximately ${P} minute${P !== 1 ? "s" : ""}`, a && D(a), b && (b.textContent = `Your access token will expire in ${P} minute${P !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (l.textContent = `Token valid until ${v.toLocaleDateString()} ${v.toLocaleTimeString()}`, a && C(a)), !c && a && C(a);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (D(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : C(n));
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
      const l = this.normalizeAccountId(c.account_id);
      if (n.has(l))
        continue;
      n.add(l);
      const a = document.createElement("option");
      a.value = l;
      const b = c.email || l || "Default", v = c.status !== "connected" ? ` (${c.status})` : "";
      a.textContent = `${b}${v}`, l === this.currentAccountId && (a.selected = !0), e.appendChild(a);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const c = document.createElement("option");
      c.value = this.currentAccountId, c.textContent = `${this.currentAccountId} (new)`, c.selected = !0, e.appendChild(c);
    }
    const s = document.createElement("option");
    s.value = "__new__", s.textContent = "+ Connect New Account...", e.appendChild(s);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && C(e), this.accounts.length === 0) {
      t && D(t), n && C(n);
      return;
    }
    t && C(t), n && (D(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, c = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, l = t ? "ring-2 ring-blue-500" : "", a = n[e.status] || "bg-white border-gray-200", b = s[e.status] || "bg-gray-100 text-gray-700", v = c[e.status] || e.status, E = e.account_id || "default", P = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${a} ${l} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
      s.addEventListener("click", (c) => {
        const a = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (c) => {
        const a = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !1), this.startOAuthFlow(a);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (c) => {
        const a = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
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
    const s = this.resolveOAuthRedirectURI(), c = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = c;
    const l = this.buildGoogleOAuthUrl(s, c);
    if (!l) {
      t && C(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const a = 500, b = 600, v = (window.screen.width - a) / 2, E = (window.screen.height - b) / 2;
    if (this.oauthWindow = window.open(
      l,
      "google_oauth",
      `width=${a},height=${b},left=${v},top=${E},popup=yes`
    ), !this.oauthWindow) {
      t && C(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (P) => this.handleOAuthCallback(P), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && C(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const c = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    c && n.add(c);
    for (const l of n)
      if (t === l || this.areEquivalentLoopbackOrigins(t, l))
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
    if (this.cleanupOAuthFlow(), n && C(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const s = this.resolveOAuthRedirectURI(), l = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        l !== this.currentAccountId && this.setCurrentAccountId(l, !1);
        const a = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", l),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: l || void 0,
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
        const c = s instanceof Error ? s.message : "Unknown error";
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
    e && C(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && C(e);
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
function na(i) {
  const e = new ki(i);
  return Q(() => e.init()), e;
}
function ia(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new ki(e);
  Q(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Gn = "esign.google.account_id", hi = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, fi = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Ti {
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
      loadMoreBtn: s,
      importBtn: c,
      clearSelectionBtn: l,
      importCancelBtn: a,
      importConfirmBtn: b,
      importForm: v,
      importModal: E,
      viewListBtn: P,
      viewGridBtn: R
    } = this.elements;
    if (e) {
      const B = Pn(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (z) => {
        z.key === "Enter" && (z.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), c && c.addEventListener("click", () => this.showImportModal()), l && l.addEventListener("click", () => this.clearSelection()), a && a.addEventListener("click", () => this.hideImportModal()), b && v && v.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const z = B.target;
      (z === E || z.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), P && P.addEventListener("click", () => this.setViewMode("list")), R && R.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (B) => {
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
        window.localStorage.getItem(Gn)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, D(e)) : C(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Gn, this.currentAccountId) : window.localStorage.removeItem(Gn);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), c = String(e.modifiedTime || e.ModifiedTime || "").trim(), l = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), b = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], E = Array.isArray(e.owners) ? e.owners : b ? [{ emailAddress: b }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: c,
      webViewLink: l,
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
      let c;
      this.searchQuery ? c = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : c = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (c += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const l = await fetch(c, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!l.ok)
        throw new Error(`Failed to load files: ${l.status}`);
      const a = await l.json(), b = Array.isArray(a.files) ? a.files.map((v) => this.normalizeDriveFile(v)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...b] : this.currentFiles = b, this.nextPageToken = a.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), ve(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), ve("Error loading files");
    } finally {
      this.isLoading = !1, t && C(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && C(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = fi.includes(e.mimeType), s = this.selectedFile?.id === e.id, c = hi[e.mimeType] || hi.default, l = this.getFileIcon(c);
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
          ${l}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${Cn(e.modifiedTime)}
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
    const s = n.dataset.fileId, c = n.dataset.isFolder === "true";
    s && (c ? this.navigateToFolder(s) : this.selectFile(s));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), ve(`Selected: ${t.name}`));
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
      previewType: c,
      previewFileId: l,
      previewOwner: a,
      previewModified: b,
      importBtn: v,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && D(e), t && C(t);
      return;
    }
    e && C(e), t && D(t);
    const P = this.selectedFile, R = fi.includes(P.mimeType);
    s && (s.textContent = P.name), c && (c.textContent = this.getMimeTypeLabel(P.mimeType)), l && (l.textContent = P.id), a && P.owners.length > 0 && (a.textContent = P.owners[0].emailAddress || "-"), b && (b.textContent = Cn(P.modifiedTime)), v && (R ? (v.removeAttribute("disabled"), v.classList.remove("opacity-50", "cursor-not-allowed")) : (v.setAttribute("disabled", "true"), v.classList.add("opacity-50", "cursor-not-allowed"))), E && P.webViewLink && (E.href = P.webViewLink);
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
      C(e), t && (t.textContent = "Search Results");
      return;
    }
    D(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
      (c, l) => `
        <li class="flex items-center">
          ${l > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(c.id)}"
            data-folder-index="${l}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(c.name)}
          </button>
        </li>
      `
    ).join(""), St(".breadcrumb-item", s).forEach((c) => {
      c.addEventListener("click", () => {
        const l = parseInt(c.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(l);
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
    e && (this.nextPageToken ? D(e) : C(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? D(t) : C(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && C(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
      const c = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = c;
    }
    s && (s.value = ""), e && D(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && C(e);
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
      importAgreementTitle: c
    } = this.elements, l = this.selectedFile.id, a = s?.value.trim() || this.selectedFile.name, b = c?.value.trim() || "";
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
          google_file_id: l,
          document_title: a,
          agreement_title: b || void 0
        })
      });
      if (!v.ok) {
        const P = await v.json();
        throw new Error(P.error?.message || "Import failed");
      }
      const E = await v.json();
      this.showToast("Import started successfully", "success"), ve("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (v) {
      console.error("Import error:", v);
      const E = v instanceof Error ? v.message : "Import failed";
      this.showToast(E, "error"), ve(`Error: ${E}`);
    } finally {
      e && e.removeAttribute("disabled"), t && C(t), n && (n.textContent = "Import");
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
function sa(i) {
  const e = new Ti(i);
  return Q(() => e.init()), e;
}
function ra(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new Ti(e);
  Q(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class _i {
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
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", s = t?.value || "";
    try {
      const c = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      c.searchParams.set("range", n), s && c.searchParams.set("provider", s);
      const l = await fetch(c.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!l.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const a = await l.json();
        this.healthData = a;
      }
      this.renderHealthData(), ve("Health data refreshed");
    } catch (c) {
      console.error("Failed to load health data:", c), this.healthData = this.generateMockHealthData(n, s), this.renderHealthData();
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
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((l) => ({
        provider: l,
        status: l === "workday" ? "degraded" : "healthy",
        successRate: l === "workday" ? 89.2 : 97 + Math.random() * 3,
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
    for (let c = 0; c < e; c++) {
      const l = n[Math.floor(Math.random() * n.length)], a = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: l,
        provider: a,
        message: this.getActivityMessage(l, a),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: l.includes("failed") || l.includes("created") ? "warning" : "success"
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
    const n = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, c = /* @__PURE__ */ new Date();
    for (let l = e - 1; l >= 0; l--) {
      const a = new Date(c.getTime() - l * 36e5);
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
      const c = s.healthTrend >= 0 ? "+" : "";
      n.textContent = `${c}${s.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: s } = this.elements, c = this.healthData.syncStats;
    e && (e.textContent = `${c.successRate.toFixed(1)}%`), t && (t.textContent = `${c.succeeded} succeeded`), n && (n.textContent = `${c.failed} failed`), s && (s.style.width = `${c.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: s } = this.elements, c = this.healthData.conflictStats;
    if (e && (e.textContent = String(c.pending)), t && (t.textContent = `${c.pending} pending`), n && (n.textContent = `${c.resolvedToday} resolved today`), s) {
      const l = c.trend >= 0 ? "+" : "";
      s.textContent = `${l}${c.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: s } = this.elements, c = this.healthData.retryStats;
    e && (e.textContent = String(c.total)), t && (t.textContent = `${c.recoveryRate}%`), n && (n.textContent = c.avgAttempts.toFixed(1)), s && (s.innerHTML = c.recent.map(
      (l) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(l.provider)} / ${this.escapeHtml(l.entity)}</span>
            <span class="${l.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(l.time)}</span>
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
      s.addEventListener("click", (c) => this.dismissAlert(c));
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
    const { alertsList: s, noAlerts: c, alertCount: l } = this.elements, a = s?.querySelectorAll(":scope > div").length || 0;
    l && (l.textContent = `${a} active`, a === 0 && (l.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), c && c.classList.remove("hidden")));
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
    const c = document.getElementById(e);
    if (!c) return;
    const l = c.getContext("2d");
    if (!l) return;
    const a = c.width, b = c.height, v = 40, E = a - v * 2, P = b - v * 2;
    l.clearRect(0, 0, a, b);
    const R = t.labels, F = Object.values(t.datasets), B = E / R.length / (F.length + 1), z = Math.max(...F.flat()) || 1;
    R.forEach((V, X) => {
      const ee = v + X * E / R.length + B / 2;
      F.forEach((de, ge) => {
        const Ie = de[X] / z * P, ut = ee + ge * B, Re = b - v - Ie;
        l.fillStyle = n[ge] || "#6b7280", l.fillRect(ut, Re, B - 2, Ie);
      }), X % Math.ceil(R.length / 6) === 0 && (l.fillStyle = "#6b7280", l.font = "10px sans-serif", l.textAlign = "center", l.fillText(V, ee + F.length * B / 2, b - v + 15));
    }), l.fillStyle = "#6b7280", l.font = "10px sans-serif", l.textAlign = "right";
    for (let V = 0; V <= 4; V++) {
      const X = b - v - V * P / 4, ee = Math.round(z * V / 4);
      l.fillText(ee.toString(), v - 5, X + 3);
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
function aa(i) {
  const e = new _i(i);
  return Q(() => e.init()), e;
}
function oa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new _i(e);
  Q(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class Mi {
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
      cancelModalBtn: s,
      refreshBtn: c,
      retryBtn: l,
      addFieldBtn: a,
      addRuleBtn: b,
      validateBtn: v,
      mappingForm: E,
      publishCancelBtn: P,
      publishConfirmBtn: R,
      deleteCancelBtn: F,
      deleteConfirmBtn: B,
      closePreviewBtn: z,
      loadSampleBtn: V,
      runPreviewBtn: X,
      clearPreviewBtn: ee,
      previewSourceInput: de,
      searchInput: ge,
      filterStatus: Ie,
      filterProvider: ut,
      mappingModal: Re,
      publishModal: We,
      deleteModal: it,
      previewModal: J
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), c?.addEventListener("click", () => this.loadMappings()), l?.addEventListener("click", () => this.loadMappings()), a?.addEventListener("click", () => this.addSchemaField()), b?.addEventListener("click", () => this.addMappingRule()), v?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (me) => {
      me.preventDefault(), this.saveMapping();
    }), P?.addEventListener("click", () => this.closePublishModal()), R?.addEventListener("click", () => this.publishMapping()), F?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), z?.addEventListener("click", () => this.closePreviewModal()), V?.addEventListener("click", () => this.loadSamplePayload()), X?.addEventListener("click", () => this.runPreviewTransform()), ee?.addEventListener("click", () => this.clearPreview()), de?.addEventListener("input", Pn(() => this.validateSourceJson(), 300)), ge?.addEventListener("input", Pn(() => this.renderMappings(), 300)), Ie?.addEventListener("change", () => this.renderMappings()), ut?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (me) => {
      me.key === "Escape" && (Re && !Re.classList.contains("hidden") && this.closeModal(), We && !We.classList.contains("hidden") && this.closePublishModal(), it && !it.classList.contains("hidden") && this.closeDeleteModal(), J && !J.classList.contains("hidden") && this.closePreviewModal());
    }), [Re, We, it, J].forEach((me) => {
      me?.addEventListener("click", (_e) => {
        const He = _e.target;
        (He === me || He.getAttribute("aria-hidden") === "true") && (me === Re ? this.closeModal() : me === We ? this.closePublishModal() : me === it ? this.closeDeleteModal() : me === J && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ve(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: c } = this.elements;
    switch (C(t), C(n), C(s), C(c), e) {
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
        D(c);
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
    const c = (t?.value || "").toLowerCase(), l = n?.value || "", a = s?.value || "", b = this.mappings.filter((v) => !(c && !v.name.toLowerCase().includes(c) && !v.provider.toLowerCase().includes(c) || l && v.status !== l || a && v.provider !== a));
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
      schemaObjectTypeInput: c,
      schemaVersionInput: l,
      schemaFieldsContainer: a,
      mappingRulesContainer: b
    } = this.elements, v = [];
    a?.querySelectorAll(".schema-field-row").forEach((P) => {
      v.push({
        object: (P.querySelector(".field-object")?.value || "").trim(),
        field: (P.querySelector(".field-name")?.value || "").trim(),
        type: P.querySelector(".field-type")?.value || "string",
        required: P.querySelector(".field-required")?.checked || !1
      });
    });
    const E = [];
    return b?.querySelectorAll(".mapping-rule-row").forEach((P) => {
      E.push({
        source_object: (P.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (P.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: P.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (P.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: c?.value.trim() || "",
        version: l?.value.trim() || void 0,
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
      mappingProviderInput: c,
      schemaObjectTypeInput: l,
      schemaVersionInput: a,
      schemaFieldsContainer: b,
      mappingRulesContainer: v,
      mappingStatusBadge: E,
      formValidationStatus: P
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), c && (c.value = e.provider || "");
    const R = e.external_schema || { object_type: "", fields: [] };
    l && (l.value = R.object_type || ""), a && (a.value = R.version || ""), b && (b.innerHTML = "", (R.fields || []).forEach((F) => b.appendChild(this.createSchemaFieldRow(F)))), v && (v.innerHTML = "", (e.rules || []).forEach((F) => v.appendChild(this.createMappingRuleRow(F)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), C(P);
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
      mappingRulesContainer: c,
      mappingStatusBadge: l,
      formValidationStatus: a
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), c && (c.innerHTML = ""), l && l.classList.add("hidden"), C(a), this.editingMappingId = null;
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
    const t = this.mappings.find((l) => l.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: c } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), D(n), c?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    C(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((l) => l.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: c } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), c && (c.textContent = `v${t.version || 1}`), D(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    C(this.elements.publishModal), this.pendingPublishId = null;
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
    C(this.elements.deleteModal), this.pendingDeleteId = null;
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
      }), c = await s.json();
      if (s.ok && c.status === "ok")
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
        const l = c.errors || [c.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${l.map((a) => `<li>${this.escapeHtml(a)}</li>`).join("")}</ul>
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
      const n = !!t.id, s = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, l = await fetch(s, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!l.ok) {
        const a = await l.json();
        throw new Error(a.error?.message || `HTTP ${l.status}`);
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
      previewMappingProvider: c,
      previewObjectType: l,
      previewMappingStatus: a,
      previewSourceInput: b,
      sourceSyntaxError: v
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), c && (c.textContent = t.provider), l && (l.textContent = t.external_schema?.object_type || "-"), a && (a.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), b && (b.value = ""), C(v), D(n), b?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    C(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: c } = this.elements;
    switch (C(t), C(n), C(s), C(c), e) {
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
        D(c);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", c = n.fields || [], l = {}, a = {};
    c.forEach((b) => {
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
    }), l[s] = a, e && (e.value = JSON.stringify(l, null, 2)), C(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return C(t), null;
    try {
      const s = JSON.parse(n);
      return C(t), s;
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
    }, c = {}, l = {}, a = [];
    return n.forEach((b) => {
      const v = this.resolveSourceValue(e, b.source_object, b.source_field), E = v !== void 0;
      if (s.matched_rules.push({
        source: b.source_field,
        matched: E,
        value: v
      }), !!E)
        switch (b.target_entity) {
          case "participant":
            c[b.target_path] = v;
            break;
          case "agreement":
            l[b.target_path] = v;
            break;
          case "field_definition":
            a.push({ path: b.target_path, value: v });
            break;
        }
    }), Object.keys(c).length > 0 && s.participants.push({
      ...c,
      role: c.role || "signer",
      signing_stage: c.signing_stage || 1
    }), s.agreement = l, s.field_definitions = a, s;
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
          const c = e[s];
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
      previewFields: s,
      fieldsCount: c,
      previewMetadata: l,
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
    c && (c.textContent = `(${E.length})`), s && (E.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = E.map(
      (F) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(F.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(F.value))}</span>
          </div>
        `
    ).join(""));
    const P = e.agreement || {}, R = Object.entries(P);
    l && (R.length === 0 ? l.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : l.innerHTML = R.map(
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
    e && (e.value = ""), C(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function ca(i) {
  const e = new Mi(i);
  return Q(() => e.init()), e;
}
function la(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Mi(e);
  Q(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class $i {
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
      filterStatus: s,
      filterProvider: c,
      filterEntity: l,
      actionResolveBtn: a,
      actionIgnoreBtn: b,
      cancelResolveBtn: v,
      resolveForm: E,
      conflictDetailModal: P,
      resolveModal: R
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), c?.addEventListener("change", () => this.renderConflicts()), l?.addEventListener("change", () => this.renderConflicts()), a?.addEventListener("click", () => this.openResolveModal("resolved")), b?.addEventListener("click", () => this.openResolveModal("ignored")), v?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (F) => this.submitResolution(F)), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && (R && !R.classList.contains("hidden") ? this.closeResolveModal() : P && !P.classList.contains("hidden") && this.closeConflictDetail());
    }), [P, R].forEach((F) => {
      F?.addEventListener("click", (B) => {
        const z = B.target;
        (z === F || z.getAttribute("aria-hidden") === "true") && (F === P ? this.closeConflictDetail() : F === R && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ve(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: c } = this.elements;
    switch (C(t), C(n), C(s), C(c), e) {
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
        D(c);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((a) => a.status === "pending").length, c = this.conflicts.filter((a) => a.status === "resolved").length, l = this.conflicts.filter((a) => a.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(c)), n && (n.textContent = String(l));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const c = t?.value || "", l = n?.value || "", a = s?.value || "", b = this.conflicts.filter((v) => !(c && v.status !== c || l && v.provider !== l || a && v.entity_kind !== a));
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
    const t = this.conflicts.find((Ie) => Ie.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: c,
      detailStatusBadge: l,
      detailProvider: a,
      detailExternalId: b,
      detailInternalId: v,
      detailBindingId: E,
      detailConflictId: P,
      detailRunId: R,
      detailCreatedAt: F,
      detailVersion: B,
      detailPayload: z,
      resolutionSection: V,
      actionButtons: X,
      detailResolvedAt: ee,
      detailResolvedBy: de,
      detailResolution: ge
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), c && (c.textContent = t.entity_kind || "-"), l && (l.innerHTML = this.getStatusBadge(t.status)), a && (a.textContent = t.provider || "-"), b && (b.textContent = t.external_id || "-"), v && (v.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), P && (P.textContent = t.id), R && (R.textContent = t.run_id || "-"), F && (F.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), z)
      try {
        const Ie = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        z.textContent = JSON.stringify(Ie, null, 2);
      } catch {
        z.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (D(V), C(X), ee && (ee.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), de && (de.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), ge)
        try {
          const Ie = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          ge.textContent = JSON.stringify(Ie, null, 2);
        } catch {
          ge.textContent = t.resolution_json || "{}";
        }
    } else
      C(V), D(X);
    D(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    C(this.elements.conflictDetailModal), this.currentConflictId = null;
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
    C(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t);
    let c = {};
    const l = s.get("resolution");
    if (l)
      try {
        c = JSON.parse(l);
      } catch {
        c = { raw: l };
      }
    const a = s.get("notes");
    a && (c.notes = a);
    const b = {
      status: s.get("status"),
      resolution: c
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
function da(i) {
  const e = new $i(i);
  return Q(() => e.init()), e;
}
function ua(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new $i(e);
  Q(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class Di {
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
      startSyncForm: s,
      refreshBtn: c,
      retryBtn: l,
      closeDetailBtn: a,
      filterProvider: b,
      filterStatus: v,
      filterDirection: E,
      actionResumeBtn: P,
      actionRetryBtn: R,
      actionCompleteBtn: F,
      actionFailBtn: B,
      actionDiagnosticsBtn: z,
      startSyncModal: V,
      runDetailModal: X
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (ee) => this.startSync(ee)), c?.addEventListener("click", () => this.loadSyncRuns()), l?.addEventListener("click", () => this.loadSyncRuns()), a?.addEventListener("click", () => this.closeRunDetail()), b?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), P?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("resume")), F?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), z?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (ee) => {
      ee.key === "Escape" && (V && !V.classList.contains("hidden") && this.closeStartSyncModal(), X && !X.classList.contains("hidden") && this.closeRunDetail());
    }), [V, X].forEach((ee) => {
      ee?.addEventListener("click", (de) => {
        const ge = de.target;
        (ge === ee || ge.getAttribute("aria-hidden") === "true") && (ee === V ? this.closeStartSyncModal() : ee === X && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), ve(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: c } = this.elements;
    switch (C(t), C(n), C(s), C(c), e) {
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
        D(c);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, c = this.syncRuns.length, l = this.syncRuns.filter(
      (v) => v.status === "running" || v.status === "pending"
    ).length, a = this.syncRuns.filter((v) => v.status === "completed").length, b = this.syncRuns.filter((v) => v.status === "failed").length;
    e && (e.textContent = String(c)), t && (t.textContent = String(l)), n && (n.textContent = String(a)), s && (s.textContent = String(b));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", c = n?.value || "", l = this.syncRuns.filter((a) => !(s && a.status !== s || c && a.direction !== c));
    if (l.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = l.map(
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
    C(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t), c = {
      provider: s.get("provider"),
      direction: s.get("direction"),
      mapping_spec_id: s.get("mapping_spec_id"),
      cursor: s.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const l = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(c)
      });
      if (!l.ok) {
        const a = await l.json();
        throw new Error(a.error?.message || `HTTP ${l.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (l) {
      console.error("Start sync error:", l);
      const a = l instanceof Error ? l.message : "Unknown error";
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
    const t = this.syncRuns.find((de) => de.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: c,
      detailDirection: l,
      detailStatus: a,
      detailStarted: b,
      detailCompleted: v,
      detailCursor: E,
      detailAttempt: P,
      detailErrorSection: R,
      detailLastError: F,
      detailCheckpoints: B,
      actionResumeBtn: z,
      actionRetryBtn: V,
      actionCompleteBtn: X,
      actionFailBtn: ee
    } = this.elements;
    s && (s.textContent = t.id), c && (c.textContent = t.provider), l && (l.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), a && (a.innerHTML = this.getStatusBadge(t.status)), b && (b.textContent = this.formatDate(t.started_at)), v && (v.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), P && (P.textContent = String(t.attempt_count || 1)), t.last_error ? (F && (F.textContent = t.last_error), D(R)) : C(R), z && z.classList.toggle("hidden", t.status !== "running"), V && V.classList.toggle("hidden", t.status !== "failed"), X && X.classList.toggle("hidden", t.status !== "running"), ee && ee.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), D(n);
    try {
      const de = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (de.ok) {
        const ge = await de.json();
        this.renderCheckpoints(ge.checkpoints || []);
      } else
        B && (B.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (de) {
      console.error("Error loading checkpoints:", de), B && (B.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    C(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: c } = this.elements, l = e === "resume" ? t : e === "complete" ? s : c, a = e === "resume" ? n : null;
    if (!l) return;
    l.setAttribute("disabled", "true"), a?.setAttribute("disabled", "true");
    const b = l.innerHTML;
    l.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
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
        const P = await E.json();
        throw new Error(P.error?.message || `HTTP ${E.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (v) {
      console.error(`${e} error:`, v);
      const E = v instanceof Error ? v.message : "Unknown error";
      this.showToast(`Failed: ${E}`, "error");
    } finally {
      l.removeAttribute("disabled"), a?.removeAttribute("disabled"), l.innerHTML = b;
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
function pa(i) {
  const e = new Di(i);
  return Q(() => e.init()), e;
}
function ga(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Di(e);
  Q(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const Wn = "esign.google.account_id", Ms = 25 * 1024 * 1024, $s = 2e3, yi = 60, Qn = "application/vnd.google-apps.document", Zn = "application/pdf", vi = "application/vnd.google-apps.folder", Ds = [Qn, Zn];
class ii {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || Ms, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: St(".source-tab"),
      sourcePanels: St(".source-panel"),
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
      clearBtn: s,
      titleInput: c
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (l) => {
      l.preventDefault(), l.stopPropagation(), this.clearFileSelection();
    }), c && c.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((l) => {
      n.addEventListener(l, (a) => {
        a.preventDefault(), a.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((l) => {
      n.addEventListener(l, (a) => {
        a.preventDefault(), a.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (l) => {
      const a = l.dataTransfer;
      a?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = a.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (l) => {
      (l.key === "Enter" || l.key === " ") && (l.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (l) => this.handleFormSubmit(l));
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
      clearSelectionBtn: c,
      importBtn: l,
      importRetryBtn: a,
      driveAccountDropdown: b
    } = this.elements;
    if (e) {
      const v = Pn(() => this.handleSearch(), 300);
      e.addEventListener("input", v);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), b && b.addEventListener("change", () => {
      this.setCurrentAccountId(b.value, this.currentSource === "google");
    }), c && c.addEventListener("click", () => this.clearFileSelection()), l && l.addEventListener("click", () => this.startImport()), a && a.addEventListener("click", () => {
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
      const { searchInput: s, clearSearchBtn: c } = this.elements;
      s && (s.value = ""), c && C(c), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const c = this.normalizeAccountId(s?.account_id);
      if (n.has(c))
        continue;
      n.add(c);
      const l = document.createElement("option");
      l.value = c;
      const a = String(s?.email || "").trim(), b = String(s?.status || "").trim(), v = a || c || "Default account";
      l.textContent = b && b !== "connected" ? `${v} (${b})` : v, c === this.currentAccountId && (l.selected = !0), e.appendChild(l);
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
   * Update account scope UI elements
   */
  updateAccountScopeUI() {
    this.syncScopedAccountState();
    const { accountScopeHelp: e, connectGoogleLink: t, driveAccountDropdown: n } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, D(e)) : C(e)), t) {
      const s = t.dataset.baseHref || t.getAttribute("href");
      s && t.setAttribute("href", this.applyAccountIdToPath(s));
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
      n.id.replace("panel-", "") === e ? D(n) : C(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), ve(
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
        const c = s.name.replace(/\.pdf$/i, "");
        t.value = c;
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
      `File is too large (${xn(e.size)}). Maximum size is ${xn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: c, uploadZone: l } = this.elements;
    s && (s.textContent = e.name), c && (c.textContent = xn(e.size)), t && C(t), n && D(n), l && (l.classList.remove("border-gray-300"), l.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && D(e), t && C(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, D(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", C(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, c = t?.value.trim().length ?? !1, l = s && c;
    n && (n.disabled = !l, n.setAttribute("aria-disabled", String(!l)));
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), s = t.get("org_id"), c = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && c.searchParams.set("tenant_id", n), s && c.searchParams.set("org_id", s);
    const l = new FormData();
    l.append("file", e);
    const a = await fetch(c.toString(), {
      method: "POST",
      body: l,
      credentials: "same-origin"
    }), b = await a.json().catch(() => ({}));
    if (!a.ok) {
      const E = b?.error?.message || b?.message || "Upload failed. Please try again.";
      throw new Error(E);
    }
    const v = b?.object_key ? String(b.object_key).trim() : "";
    if (!v)
      throw new Error("Upload failed: missing source object key.");
    return v;
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: s } = this.elements, c = t?.files?.[0];
    if (!(!c || !this.validateFile(c))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const l = await this.uploadSourcePDF(c);
        s && (s.value = l), n?.submit();
      } catch (l) {
        const a = l instanceof Error ? l.message : "Upload failed. Please try again.";
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), c = String(e.modifiedTime || e.ModifiedTime || "").trim(), l = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), b = String(e.ownerEmail || e.OwnerEmail || "").trim(), v = Array.isArray(e.parents) ? e.parents : a ? [a] : [], E = Array.isArray(e.owners) ? e.owners : b ? [{ emailAddress: b }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: c,
      webViewLink: l,
      parents: v,
      owners: E
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === Qn;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === Zn;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === vi;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Ds.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Qn ? "Google Document" : t === Zn ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === vi ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: s, append: c } = e, { fileList: l } = this.elements;
    !c && l && (l.innerHTML = `
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
      this.nextPageToken = v.next_page_token || null, c ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(c);
      const { resultCount: P, listTitle: R } = this.elements;
      n && P ? (P.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, R && (R.textContent = "Search Results")) : (P && (P.textContent = ""), R && (R.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: F } = this.elements;
      F && (this.nextPageToken ? D(F) : C(F)), ve(`Loaded ${E.length} files`);
    } catch (a) {
      console.error("Error loading files:", a), l && (l.innerHTML = `
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
        `), ve(`Error: ${a instanceof Error ? a.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((s, c) => {
      const l = this.getFileIcon(s), a = this.isImportable(s), b = this.isFolder(s), v = this.selectedFile && this.selectedFile.id === s.id, E = !a && !b;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${v ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${E ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${v}"
          data-file-index="${c}"
          ${E ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${l.bg} flex items-center justify-center flex-shrink-0 ${l.text}">
            ${l.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + Cn(s.modifiedTime) : ""}
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
        const c = parseInt(s.dataset.fileIndex || "0", 10), l = this.currentFiles[c];
        this.isFolder(l) ? this.navigateToFolder(l) : this.isImportable(l) && this.selectFile(l);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: n } = this.elements;
    t && (t.value = ""), n && C(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      C(e);
      return;
    }
    D(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, s) => {
      const c = s === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${s > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${s}" class="breadcrumb-item ${c ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const s = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, s + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: s } = this.elements;
    s && s.querySelectorAll(".file-item").forEach((V) => {
      const X = parseInt(V.dataset.fileIndex || "0", 10);
      this.currentFiles[X].id === e.id ? (V.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), V.setAttribute("aria-selected", "true")) : (V.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), V.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: c,
      filePreview: l,
      importStatus: a,
      previewIcon: b,
      previewTitle: v,
      previewType: E,
      importTypeInfo: P,
      importTypeLabel: R,
      importTypeDesc: F,
      snapshotWarning: B,
      importDocumentTitle: z
    } = this.elements;
    c && C(c), l && D(l), a && C(a), b && (b.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, b.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), v && (v.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && P && (P.className = `p-3 rounded-lg border ${n.bgClass}`, R && (R.textContent = n.label, R.className = `text-xs font-medium ${n.textClass}`), F && (F.textContent = n.desc, F.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? D(B) : C(B))), z && (z.value = e.name || ""), ve(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && D(e), t && C(t), n && C(n), s && s.querySelectorAll(".file-item").forEach((c) => {
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
      t && D(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && C(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && C(t), this.searchQuery = "";
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
      importStatusQueued: c,
      importStatusSuccess: l,
      importStatusFailed: a
    } = this.elements;
    switch (t && C(t), n && C(n), s && D(s), c && C(c), l && C(l), a && C(a), e) {
      case "queued":
      case "running":
        c && D(c);
        break;
      case "succeeded":
        l && D(l);
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
        const c = this.config.routes.integrations || "/admin/esign/integrations/google";
        s.href = this.applyAccountIdToPath(c), D(s);
      } else
        C(s);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: s } = this.elements;
    if (!this.selectedFile || !e) return;
    const c = e.value.trim();
    if (!c) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && C(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const l = new URL(window.location.href);
      l.searchParams.delete("import_run_id"), window.history.replaceState({}, "", l.toString());
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
            document_title: c
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
    } catch (l) {
      console.error("Import error:", l);
      const a = l;
      this.showImportError(a.message || "Failed to start import", a.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), $s);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > yi) {
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
            this.showImportStatus("succeeded"), ve("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const c = n.error?.code || "", l = n.error?.message || "Import failed";
            this.showImportError(l, c), ve("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < yi ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function ma(i) {
  const e = new ii(i);
  return Q(() => e.init()), e;
}
function ha(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new ii(e);
  Q(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Bs(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, s = i.context && typeof i.context == "object" ? i.context : {}, c = String(t.index || "").trim();
  return !e && !c ? null : {
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
      index: c,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && Q(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Bs(t);
        n && new ii(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const Se = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, lt = Se.REVIEW, Fs = {
  [Se.DOCUMENT]: "Details",
  [Se.DETAILS]: "Participants",
  [Se.PARTICIPANTS]: "Fields",
  [Se.FIELDS]: "Placement",
  [Se.PLACEMENT]: "Review"
}, Pe = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, An = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, ei = /* @__PURE__ */ new Map(), Rs = 30 * 60 * 1e3;
function Hs() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function qs() {
  if (!Hs())
    throw new Error("PDF preview library unavailable");
}
function Ns(i) {
  const e = ei.get(i);
  return e ? Date.now() - e.timestamp > Rs ? (ei.delete(i), null) : e : null;
}
function js(i, e, t) {
  ei.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Us(i, e = An.THUMBNAIL_MAX_WIDTH, t = An.THUMBNAIL_MAX_HEIGHT) {
  await qs();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const c = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, l = c.numPages, a = await c.getPage(1), b = a.getViewport({ scale: 1 }), v = e / b.width, E = t / b.height, P = Math.min(v, E, 1), R = a.getViewport({ scale: P }), F = document.createElement("canvas");
  F.width = R.width, F.height = R.height;
  const B = F.getContext("2d");
  if (!B)
    throw new Error("Failed to get canvas context");
  return await a.render({
    canvasContext: B,
    viewport: R
  }).promise, { dataUrl: F.toDataURL("image/jpeg", 0.8), pageCount: l };
}
class zs {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || An.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || An.THUMBNAIL_MAX_HEIGHT
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
      contentState: null
    };
  }
  /**
   * Initialize the preview card by binding to DOM elements
   */
  init() {
    this.elements.container = document.getElementById("document-preview-card"), this.elements.thumbnail = document.getElementById("document-preview-thumbnail"), this.elements.title = document.getElementById("document-preview-title"), this.elements.pageCount = document.getElementById("document-preview-page-count"), this.elements.loadingState = document.getElementById("document-preview-loading"), this.elements.errorState = document.getElementById("document-preview-error"), this.elements.emptyState = document.getElementById("document-preview-empty"), this.elements.contentState = document.getElementById("document-preview-content"), this.render();
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
    const t = e === Se.DOCUMENT || e === Se.DETAILS || e === Se.PARTICIPANTS || e === Se.FIELDS || e === Se.REVIEW;
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
    const c = Ns(e);
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
      const l = await this.fetchDocumentPdfUrl(e);
      if (s !== this.requestVersion)
        return;
      const { dataUrl: a, pageCount: b } = await Us(
        l,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      js(e, a, b), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? b,
        thumbnailUrl: a,
        isLoading: !1,
        error: null
      };
    } catch (l) {
      if (s !== this.requestVersion)
        return;
      console.error("Failed to load document preview:", l), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: l instanceof Error ? l.message : "Failed to load preview"
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: c, errorState: l, emptyState: a, contentState: b } = this.elements;
    if (e) {
      if (c?.classList.add("hidden"), l?.classList.add("hidden"), a?.classList.add("hidden"), b?.classList.add("hidden"), !this.state.documentId) {
        a?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        c?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        l?.classList.remove("hidden");
        const v = l?.querySelector("#document-preview-error-message");
        v && (v.textContent = this.state.error);
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
function Os(i = {}) {
  const e = new zs(i);
  return e.init(), e;
}
function Vs() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function Gs() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Ws(i, e) {
  return {
    id: Vs(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function wi(i, e) {
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
function Bi(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function Js(i, e) {
  const t = Bi(i, e.definitionId);
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
function Ys(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const c of t)
    s.add(c.definitionId);
  for (const [c, l] of n) {
    if (l.page !== e || s.has(c) || i.unlinkedDefinitions.has(c)) continue;
    const a = i.definitionToGroup.get(c);
    if (!a) continue;
    const b = i.groups.get(a);
    if (!b || !b.isActive || !b.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: c,
      type: l.type,
      participantId: l.participantId,
      participantName: l.participantName,
      page: e,
      x: b.templatePosition.x,
      y: b.templatePosition.y,
      width: b.templatePosition.width,
      height: b.templatePosition.height,
      placementSource: Pe.AUTO_LINKED,
      linkGroupId: b.id,
      linkedFromFieldId: b.sourceFieldId
    } };
  }
  return null;
}
const bi = 150, xi = 32;
function se(i) {
  return i == null ? "" : String(i).trim();
}
function Fi(i) {
  if (typeof i == "boolean") return i;
  const e = se(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Ri(i) {
  return se(i).toLowerCase();
}
function le(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(se(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function bn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(se(i));
  return Number.isFinite(t) ? t : e;
}
function Sn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function dt(i, e) {
  const t = le(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function rn(i, e, t = 1) {
  const n = le(t, 1), s = le(i, n);
  return e > 0 ? Sn(s, 1, e) : s > 0 ? s : n;
}
function Ks(i, e, t) {
  const n = le(t, 1);
  let s = dt(i, n), c = dt(e, n);
  return s <= 0 && (s = 1), c <= 0 && (c = n), c < s ? { start: c, end: s } : { start: s, end: c };
}
function on(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => se(n)) : se(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = le(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function In(i, e) {
  const t = le(e, 1), n = se(i.participantId ?? i.participant_id), s = on(i.excludePages ?? i.exclude_pages), c = i.required, l = typeof c == "boolean" ? c : !["0", "false", "off", "no"].includes(se(c).toLowerCase());
  return {
    id: se(i.id),
    type: Ri(i.type),
    participantId: n,
    participantTempId: se(i.participantTempId) || n,
    fromPage: dt(i.fromPage ?? i.from_page, t),
    toPage: dt(i.toPage ?? i.to_page, t),
    page: dt(i.page, t),
    excludeLastPage: Fi(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: l
  };
}
function Xs(i) {
  return {
    id: se(i.id),
    type: Ri(i.type),
    participant_id: se(i.participantId),
    from_page: dt(i.fromPage, 0),
    to_page: dt(i.toPage, 0),
    page: dt(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: on(i.excludePages),
    required: i.required !== !1
  };
}
function Qs(i, e) {
  const t = se(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Zs(i, e) {
  const t = le(e, 1), n = [];
  return i.forEach((s, c) => {
    const l = In(s || {}, t);
    if (l.type === "") return;
    const a = Qs(l, c);
    if (l.type === "initials_each_page") {
      const b = Ks(l.fromPage, l.toPage, t), v = /* @__PURE__ */ new Set();
      on(l.excludePages).forEach((E) => {
        E <= t && v.add(E);
      }), l.excludeLastPage && v.add(t);
      for (let E = b.start; E <= b.end; E += 1)
        v.has(E) || n.push({
          id: `${a}-initials-${E}`,
          type: "initials",
          page: E,
          participantId: se(l.participantId),
          required: l.required !== !1,
          ruleId: a
          // Phase 3: Track rule ID for link group creation
        });
      return;
    }
    if (l.type === "signature_once") {
      let b = l.page > 0 ? l.page : l.toPage > 0 ? l.toPage : t;
      b <= 0 && (b = 1), n.push({
        id: `${a}-signature-${b}`,
        type: "signature",
        page: b,
        participantId: se(l.participantId),
        required: l.required !== !1,
        ruleId: a
        // Phase 3: Track rule ID for link group creation
      });
    }
  }), n.sort((s, c) => s.page !== c.page ? s.page - c.page : s.id.localeCompare(c.id)), n;
}
function er(i, e, t, n, s) {
  const c = le(t, 1);
  let l = i > 0 ? i : 1, a = e > 0 ? e : c;
  l = Sn(l, 1, c), a = Sn(a, 1, c), a < l && ([l, a] = [a, l]);
  const b = /* @__PURE__ */ new Set();
  s.forEach((E) => {
    const P = le(E, 0);
    P > 0 && b.add(Sn(P, 1, c));
  }), n && b.add(c);
  const v = [];
  for (let E = l; E <= a; E += 1)
    b.has(E) || v.push(E);
  return {
    pages: v,
    rangeStart: l,
    rangeEnd: a,
    excludedPages: Array.from(b).sort((E, P) => E - P),
    isEmpty: v.length === 0
  };
}
function tr(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const c = e[n], l = e[s - 1];
      c === l ? t.push(String(c)) : l === c + 1 ? t.push(`${c}, ${l}`) : t.push(`${c}-${l}`), n = s;
    }
  return `pages ${t.join(", ")}`;
}
function Jn(i) {
  const e = i || {};
  return {
    id: se(e.id),
    title: se(e.title || e.name) || "Untitled",
    pageCount: le(e.page_count ?? e.pageCount, 0)
  };
}
function Hi(i) {
  const e = se(i).toLowerCase();
  if (e === "") return Pe.MANUAL;
  switch (e) {
    case Pe.AUTO:
    case Pe.MANUAL:
    case Pe.AUTO_LINKED:
    case Pe.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function En(i, e = 0) {
  const t = i || {}, n = se(t.id) || `fi_init_${e}`, s = se(t.definitionId || t.definition_id || t.field_definition_id) || n, c = le(t.page ?? t.page_number, 1), l = bn(t.x ?? t.pos_x, 0), a = bn(t.y ?? t.pos_y, 0), b = bn(t.width, bi), v = bn(t.height, xi);
  return {
    id: n,
    definitionId: s,
    type: se(t.type) || "text",
    participantId: se(t.participantId || t.participant_id),
    participantName: se(t.participantName || t.participant_name) || "Unassigned",
    page: c > 0 ? c : 1,
    x: l >= 0 ? l : 0,
    y: a >= 0 ? a : 0,
    width: b > 0 ? b : bi,
    height: v > 0 ? v : xi,
    placementSource: Hi(t.placementSource || t.placement_source),
    linkGroupId: se(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: se(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: Fi(t.isUnlinked ?? t.is_unlinked)
  };
}
function Si(i, e = 0) {
  const t = En(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Hi(t.placementSource),
    link_group_id: se(t.linkGroupId),
    linked_from_field_id: se(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function nr(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), c = /\/v\d+$/i.test(s) ? s : `${s}/v1`, l = `${c}/esign/drafts`, a = !!e.is_edit, b = !!e.create_success, v = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), P = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, R = Array.isArray(e.initial_participants) ? e.initial_participants : [], F = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(d) {
    if (!v) return d;
    const o = d.includes("?") ? "&" : "?";
    return `${d}${o}user_id=${encodeURIComponent(v)}`;
  }
  function z(d = !0) {
    const o = { Accept: "application/json" };
    return d && (o["Content-Type"] = "application/json"), v && (o["X-User-ID"] = v), o;
  }
  const V = 1, X = "esign_wizard_state_v1", ee = "esign_wizard_sync", de = 2e3, ge = [1e3, 2e3, 5e3, 1e4, 3e4];
  class Ie {
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
        const o = sessionStorage.getItem(X);
        if (!o) return null;
        const m = JSON.parse(o);
        return m.version !== V ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(m)) : this.normalizeLoadedState(m);
      } catch (o) {
        return console.error("Failed to load wizard state from session:", o), null;
      }
    }
    normalizeLoadedState(o) {
      if (!o || typeof o != "object")
        return this.createInitialState();
      const m = this.createInitialState(), f = { ...m, ...o }, w = Number.parseInt(String(o.currentStep ?? m.currentStep), 10);
      f.currentStep = Number.isFinite(w) ? Math.min(Math.max(w, 1), lt) : m.currentStep;
      const x = o.document && typeof o.document == "object" ? o.document : {}, L = x.id;
      f.document = {
        id: L == null ? null : String(L).trim() || null,
        title: String(x.title ?? "").trim() || null,
        pageCount: le(x.pageCount, 0) || null
      };
      const $ = o.details && typeof o.details == "object" ? o.details : {};
      f.details = {
        title: String($.title ?? "").trim(),
        message: String($.message ?? "")
      }, f.participants = Array.isArray(o.participants) ? o.participants : [], f.fieldDefinitions = Array.isArray(o.fieldDefinitions) ? o.fieldDefinitions : [], f.fieldPlacements = Array.isArray(o.fieldPlacements) ? o.fieldPlacements : [], f.fieldRules = Array.isArray(o.fieldRules) ? o.fieldRules : [];
      const _ = String(o.wizardId ?? "").trim();
      f.wizardId = _ || m.wizardId, f.version = V, f.createdAt = String(o.createdAt ?? m.createdAt), f.updatedAt = String(o.updatedAt ?? m.updatedAt);
      const T = String(o.serverDraftId ?? "").trim();
      return f.serverDraftId = T || null, f.serverRevision = le(o.serverRevision, 0), f.lastSyncedAt = String(o.lastSyncedAt ?? "").trim() || null, f.syncPending = !!o.syncPending, f;
    }
    migrateState(o) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(X, JSON.stringify(this.state));
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
      this.state = this.createInitialState(), sessionStorage.removeItem(X), this.notifyListeners();
    }
    hasResumableState() {
      if (!this.state || typeof this.state != "object") return !1;
      const o = Number.parseInt(String(this.state.currentStep ?? 1), 10), m = String(this.state.document?.id ?? "").trim() !== "", f = Array.isArray(this.state.participants) ? this.state.participants.length : 0, w = String(this.state.details?.title ?? "").trim();
      return Number.isFinite(o) && o > 1 || m || f > 0 || w !== "";
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
      const o = document.getElementById("document_id")?.value || null, m = document.getElementById("selected-document-title")?.textContent?.trim() || null, f = document.getElementById("title"), w = document.getElementById("message"), x = [];
      document.querySelectorAll(".participant-entry").forEach((T) => {
        const k = T.getAttribute("data-participant-id"), j = T.querySelector('input[name*=".name"]')?.value || "", q = T.querySelector('input[name*=".email"]')?.value || "", G = T.querySelector('select[name*=".role"]')?.value || "signer", W = parseInt(T.querySelector(".signing-stage-input")?.value || "1", 10);
        x.push({ tempId: k, name: j, email: q, role: G, signingStage: W });
      });
      const L = [];
      document.querySelectorAll(".field-definition-entry").forEach((T) => {
        const k = T.getAttribute("data-field-definition-id"), j = T.querySelector(".field-type-select")?.value || "signature", q = T.querySelector(".field-participant-select")?.value || "", G = parseInt(T.querySelector('input[name*=".page"]')?.value || "1", 10), W = T.querySelector('input[name*=".required"]')?.checked ?? !0;
        L.push({ tempId: k, type: j, participantTempId: q, page: G, required: W });
      });
      const $ = Ue(), _ = parseInt(qe?.value || "0", 10) || null;
      return {
        document: { id: o, title: m, pageCount: _ },
        details: {
          title: f?.value || "",
          message: w?.value || ""
        },
        participants: x,
        fieldDefinitions: L,
        fieldPlacements: A?.fieldInstances || [],
        fieldRules: $
      };
    }
    restoreFormState() {
      const o = this.state;
      if (!o) return;
      if (o.document.id) {
        const w = document.getElementById("document_id"), x = document.getElementById("selected-document"), L = document.getElementById("document-picker"), $ = document.getElementById("selected-document-title"), _ = document.getElementById("selected-document-info");
        w && (w.value = o.document.id), $ && ($.textContent = o.document.title || "Selected Document"), _ && (_.textContent = o.document.pageCount ? `${o.document.pageCount} pages` : ""), qe && o.document.pageCount && (qe.value = String(o.document.pageCount)), x && x.classList.remove("hidden"), L && L.classList.add("hidden");
      }
      const m = document.getElementById("title"), f = document.getElementById("message");
      m && o.details.title && (m.value = o.details.title), f && o.details.message && (f.value = o.details.message);
    }
  }
  class ut {
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
      }, f = await fetch(B(l), {
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
      }, x = await fetch(B(`${l}/${o}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: z(),
        body: JSON.stringify(w)
      });
      if (x.status === 409) {
        const L = await x.json().catch(() => ({})), $ = new Error("stale_revision");
        throw $.code = "stale_revision", $.currentRevision = L.error?.details?.current_revision, $;
      }
      if (!x.ok) {
        const L = await x.json().catch(() => ({}));
        throw new Error(L.error?.message || `HTTP ${x.status}`);
      }
      return x.json();
    }
    async load(o) {
      const m = await fetch(B(`${l}/${o}`), {
        credentials: "same-origin",
        headers: z(!1)
      });
      if (!m.ok)
        throw new Error(`HTTP ${m.status}`);
      return m.json();
    }
    async delete(o) {
      const m = await fetch(B(`${l}/${o}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: z(!1)
      });
      if (!m.ok && m.status !== 404)
        throw new Error(`HTTP ${m.status}`);
    }
    async list() {
      const o = await fetch(B(`${l}?limit=10`), {
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
  class Re {
    constructor(o, m, f) {
      this.stateManager = o, this.syncService = m, this.statusUpdater = f, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(ee), this.channel.onmessage = (o) => this.handleChannelMessage(o.data), this.channel.postMessage({ type: "presence", tabId: this.getTabId() });
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
      }, de);
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
          const x = await fetch(B(`${l}/${f.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: z(),
            body: w,
            keepalive: !0
          });
          if (x.status === 409) {
            const T = await x.json().catch(() => ({})), k = Number(T?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(k > 0 ? k : f.serverRevision);
            return;
          }
          if (!x.ok)
            throw new Error(`HTTP ${x.status}`);
          const L = await x.json().catch(() => ({})), $ = String(L?.id || L?.draft_id || f.serverDraftId || "").trim(), _ = Number(L?.revision || 0);
          if ($ && Number.isFinite(_) && _ > 0) {
            this.stateManager.markSynced($, _), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted($, _);
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
      if (this.retryCount >= ge.length) {
        console.error("Max sync retries reached");
        return;
      }
      const o = ge[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, o);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(o) {
      const m = document.getElementById("conflict-dialog-modal"), f = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = We(f.updatedAt), document.getElementById("conflict-server-revision").textContent = o, document.getElementById("conflict-server-time").textContent = "newer version", m?.classList.remove("hidden");
    }
  }
  function We(d) {
    if (!d) return "unknown";
    const o = new Date(d), f = /* @__PURE__ */ new Date() - o, w = Math.floor(f / 6e4), x = Math.floor(f / 36e5), L = Math.floor(f / 864e5);
    return w < 1 ? "just now" : w < 60 ? `${w} minute${w !== 1 ? "s" : ""} ago` : x < 24 ? `${x} hour${x !== 1 ? "s" : ""} ago` : L < 7 ? `${L} day${L !== 1 ? "s" : ""} ago` : o.toLocaleDateString();
  }
  function it(d) {
    const o = document.getElementById("sync-status-indicator"), m = document.getElementById("sync-status-icon"), f = document.getElementById("sync-status-text"), w = document.getElementById("sync-retry-btn");
    if (!(!o || !m || !f))
      switch (o.classList.remove("hidden"), d) {
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
  const J = new Ie(), me = new ut(J), _e = new Re(J, me, it), He = Os({
    apiBasePath: c,
    basePath: t
  });
  if (b) {
    const o = J.getState()?.serverDraftId;
    J.clear(), _e.broadcastStateUpdate(), o && me.delete(o).catch((m) => {
      console.warn("Failed to delete server draft after successful create:", m);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    _e.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const d = J.getState();
    if (d.serverDraftId)
      try {
        const o = await me.load(d.serverDraftId);
        o.wizard_state && (J.state = { ...o.wizard_state, serverDraftId: o.id, serverRevision: o.revision }, J.saveToSession(), window.location.reload());
      } catch (o) {
        console.error("Failed to load server draft:", o);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const d = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    J.state.serverRevision = d, J.state.syncPending = !0, J.saveToSession(), _e.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function Tn() {
    const d = document.getElementById("resume-dialog-modal"), o = J.getState();
    document.getElementById("resume-draft-title").textContent = o.details.title || "Untitled Agreement", document.getElementById("resume-draft-step").textContent = o.currentStep, document.getElementById("resume-draft-time").textContent = We(o.updatedAt), d?.classList.remove("hidden");
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), J.restoreFormState(), window._resumeToStep = J.getState().currentStep;
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), J.clear();
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", async () => {
    const d = J.getState();
    if (d.serverDraftId)
      try {
        await me.delete(d.serverDraftId);
      } catch (o) {
        console.warn("Failed to delete server draft:", o);
      }
    J.clear(), document.getElementById("resume-dialog-modal")?.classList.add("hidden");
  }), !a && J.hasResumableState() && Tn();
  function It() {
    const d = J.collectFormState();
    J.updateState(d), _e.scheduleSync(), _e.broadcastStateUpdate();
  }
  const we = document.getElementById("document_id"), Et = document.getElementById("selected-document"), Lt = document.getElementById("document-picker"), Me = document.getElementById("document-search"), st = document.getElementById("document-list"), Ot = document.getElementById("change-document-btn"), Je = document.getElementById("selected-document-title"), Ye = document.getElementById("selected-document-info"), qe = document.getElementById("document_page_count");
  let Ct = [];
  function pt(d) {
    const o = le(d, 0);
    qe && (qe.value = String(o));
  }
  function cn() {
    const d = (we?.value || "").trim();
    if (!d) return;
    const o = Ct.find((m) => String(m.id || "").trim() === d);
    o && (Je.textContent.trim() || (Je.textContent = o.title || "Untitled"), (!Ye.textContent.trim() || Ye.textContent.trim() === "pages") && (Ye.textContent = `${o.pageCount || 0} pages`), pt(o.pageCount || 0), Et.classList.remove("hidden"), Lt.classList.add("hidden"));
  }
  async function _n() {
    try {
      const d = await fetch(`${n}/panels/esign_documents?per_page=100`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        throw await S(d, "Failed to load documents");
      const o = await d.json();
      Ct = (Array.isArray(o?.records) ? o.records : Array.isArray(o?.items) ? o.items : []).map((f) => Jn(f)).filter((f) => f.id !== ""), ln(Ct), cn();
    } catch (d) {
      const o = y(d?.message || "Failed to load documents", d?.code || "", d?.status || 0);
      st.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${ue(o)}</div>`;
    }
  }
  function ln(d) {
    if (d.length === 0) {
      st.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${ue(P)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    st.innerHTML = d.map((m, f) => {
      const w = ue(String(m.id || "").trim()), x = ue(String(m.title || "").trim()), L = String(le(m.pageCount, 0));
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${f === 0 ? "0" : "-1"}"
              data-document-id="${w}"
              data-document-title="${x}"
              data-document-pages="${L}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${x}</div>
          <div class="text-xs text-gray-500">${L} pages</div>
        </div>
      </button>
    `;
    }).join("");
    const o = st.querySelectorAll(".document-option");
    o.forEach((m, f) => {
      m.addEventListener("click", () => gt(m)), m.addEventListener("keydown", (w) => {
        let x = f;
        if (w.key === "ArrowDown")
          w.preventDefault(), x = Math.min(f + 1, o.length - 1);
        else if (w.key === "ArrowUp")
          w.preventDefault(), x = Math.max(f - 1, 0);
        else if (w.key === "Enter" || w.key === " ") {
          w.preventDefault(), gt(m);
          return;
        } else w.key === "Home" ? (w.preventDefault(), x = 0) : w.key === "End" && (w.preventDefault(), x = o.length - 1);
        x !== f && (o[x].focus(), o[x].setAttribute("tabindex", "0"), m.setAttribute("tabindex", "-1"));
      });
    });
  }
  function gt(d) {
    const o = d.getAttribute("data-document-id"), m = d.getAttribute("data-document-title"), f = d.getAttribute("data-document-pages");
    we.value = o, Je.textContent = m, Ye.textContent = `${f} pages`, pt(f), Et.classList.remove("hidden"), Lt.classList.add("hidden"), ie(), Pt(m);
    const w = le(f, null);
    He.setDocument(o, m, w);
  }
  function Pt(d) {
    const o = document.getElementById("title");
    if (!o || o.value.trim())
      return;
    const f = String(d || "").trim();
    f && (o.value = f, J.updateDetails({
      title: f,
      message: J.getState().details.message || ""
    }));
  }
  function ue(d) {
    const o = document.createElement("div");
    return o.textContent = d, o.innerHTML;
  }
  Ot && Ot.addEventListener("click", () => {
    Et.classList.add("hidden"), Lt.classList.remove("hidden"), Me?.focus(), yt();
  });
  const rt = 300, mt = 5, Vt = 10, dn = document.getElementById("document-typeahead"), Ke = document.getElementById("document-typeahead-dropdown"), ht = document.getElementById("document-recent-section"), At = document.getElementById("document-recent-list"), kt = document.getElementById("document-search-section"), Mn = document.getElementById("document-search-list"), Xe = document.getElementById("document-empty-state"), Tt = document.getElementById("document-dropdown-loading"), ft = document.getElementById("document-search-loading"), U = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let _t = 0, Qe = null;
  function un(d, o) {
    let m = null;
    return (...f) => {
      m !== null && clearTimeout(m), m = setTimeout(() => {
        d(...f), m = null;
      }, o);
    };
  }
  async function $n() {
    try {
      const d = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(mt)
      });
      v && d.set("created_by_user_id", v);
      const o = await fetch(`${n}/panels/esign_documents?${d}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!o.ok) {
        console.warn("Failed to load recent documents:", o.status);
        return;
      }
      const m = await o.json(), f = Array.isArray(m?.records) ? m.records : Array.isArray(m?.items) ? m.items : [];
      U.recentDocuments = f.map((w) => Jn(w)).filter((w) => w.id !== "").slice(0, mt);
    } catch (d) {
      console.warn("Error loading recent documents:", d);
    }
  }
  async function Dn(d) {
    const o = d.trim();
    if (!o) {
      Qe && (Qe.abort(), Qe = null), U.isSearchMode = !1, U.searchResults = [], Ae();
      return;
    }
    const m = ++_t;
    Qe && Qe.abort(), Qe = new AbortController(), U.isLoading = !0, U.isSearchMode = !0, Ae();
    try {
      const f = new URLSearchParams({
        q: o,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Vt)
      }), w = await fetch(`${n}/panels/esign_documents?${f}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Qe.signal
      });
      if (m !== _t)
        return;
      if (!w.ok) {
        console.warn("Failed to search documents:", w.status), U.searchResults = [], U.isLoading = !1, Ae();
        return;
      }
      const x = await w.json(), L = Array.isArray(x?.records) ? x.records : Array.isArray(x?.items) ? x.items : [];
      U.searchResults = L.map(($) => Jn($)).filter(($) => $.id !== "").slice(0, Vt);
    } catch (f) {
      if (f?.name === "AbortError")
        return;
      console.warn("Error searching documents:", f), U.searchResults = [];
    } finally {
      m === _t && (U.isLoading = !1, Ae());
    }
  }
  const Gt = un(Dn, rt);
  function yt() {
    Ke && (U.isOpen = !0, U.selectedIndex = -1, Ke.classList.remove("hidden"), Me?.setAttribute("aria-expanded", "true"), st?.classList.add("hidden"), Ae());
  }
  function Ze() {
    Ke && (U.isOpen = !1, U.selectedIndex = -1, Ke.classList.add("hidden"), Me?.setAttribute("aria-expanded", "false"), st?.classList.remove("hidden"));
  }
  function Ae() {
    if (Ke) {
      if (U.isLoading) {
        Tt?.classList.remove("hidden"), ht?.classList.add("hidden"), kt?.classList.add("hidden"), Xe?.classList.add("hidden"), ft?.classList.remove("hidden");
        return;
      }
      Tt?.classList.add("hidden"), ft?.classList.add("hidden"), U.isSearchMode ? (ht?.classList.add("hidden"), U.searchResults.length > 0 ? (kt?.classList.remove("hidden"), Xe?.classList.add("hidden"), vt(Mn, U.searchResults, "search")) : (kt?.classList.add("hidden"), Xe?.classList.remove("hidden"))) : (kt?.classList.add("hidden"), U.recentDocuments.length > 0 ? (ht?.classList.remove("hidden"), Xe?.classList.add("hidden"), vt(At, U.recentDocuments, "recent")) : (ht?.classList.add("hidden"), Xe?.classList.remove("hidden"), Xe && (Xe.textContent = "No recent documents")));
    }
  }
  function vt(d, o, m) {
    d && (d.innerHTML = o.map((f, w) => {
      const x = w, L = U.selectedIndex === x, $ = ue(String(f.id || "").trim()), _ = ue(String(f.title || "").trim()), T = String(le(f.pageCount, 0));
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${L ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${L}"
          tabindex="-1"
          data-document-id="${$}"
          data-document-title="${_}"
          data-document-pages="${T}"
          data-typeahead-index="${x}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${_}</div>
            <div class="text-xs text-gray-500">${T} pages</div>
          </div>
        </button>
      `;
    }).join(""), d.querySelectorAll(".typeahead-option").forEach((f) => {
      f.addEventListener("click", () => pn(f));
    }));
  }
  function pn(d) {
    const o = d.getAttribute("data-document-id"), m = d.getAttribute("data-document-title"), f = d.getAttribute("data-document-pages");
    if (!o) return;
    we.value = o, Je.textContent = m || "", Ye.textContent = `${f} pages`, pt(f), Et.classList.remove("hidden"), Lt.classList.add("hidden"), Ze(), ie(), Me && (Me.value = ""), U.query = "", U.isSearchMode = !1, U.searchResults = [], Pt(m);
    const w = le(f, 0);
    J.updateDocument({
      id: o,
      title: m,
      pageCount: w
    }), He.setDocument(o, m, w);
  }
  function Wt(d) {
    if (!U.isOpen) {
      (d.key === "ArrowDown" || d.key === "Enter") && (d.preventDefault(), yt());
      return;
    }
    const o = U.isSearchMode ? U.searchResults : U.recentDocuments, m = o.length - 1;
    switch (d.key) {
      case "ArrowDown":
        d.preventDefault(), U.selectedIndex = Math.min(U.selectedIndex + 1, m), Ae(), Ne();
        break;
      case "ArrowUp":
        d.preventDefault(), U.selectedIndex = Math.max(U.selectedIndex - 1, 0), Ae(), Ne();
        break;
      case "Enter":
        if (d.preventDefault(), U.selectedIndex >= 0 && U.selectedIndex <= m) {
          const f = o[U.selectedIndex];
          if (f) {
            const w = document.createElement("button");
            w.setAttribute("data-document-id", f.id), w.setAttribute("data-document-title", f.title), w.setAttribute("data-document-pages", String(f.pageCount)), pn(w);
          }
        }
        break;
      case "Escape":
        d.preventDefault(), Ze();
        break;
      case "Tab":
        Ze();
        break;
      case "Home":
        d.preventDefault(), U.selectedIndex = 0, Ae(), Ne();
        break;
      case "End":
        d.preventDefault(), U.selectedIndex = m, Ae(), Ne();
        break;
    }
  }
  function Ne() {
    if (!Ke) return;
    const d = Ke.querySelector(`[data-typeahead-index="${U.selectedIndex}"]`);
    d && d.scrollIntoView({ block: "nearest" });
  }
  Me && (Me.addEventListener("input", (d) => {
    const m = d.target.value;
    U.query = m, U.isOpen || yt(), m.trim() ? (U.isLoading = !0, Ae(), Gt(m)) : (U.isSearchMode = !1, U.searchResults = [], Ae());
    const f = Ct.filter(
      (w) => String(w.title || "").toLowerCase().includes(m.toLowerCase())
    );
    ln(f);
  }), Me.addEventListener("focus", () => {
    yt();
  }), Me.addEventListener("keydown", Wt)), document.addEventListener("click", (d) => {
    const o = d.target;
    dn && !dn.contains(o) && Ze();
  }), _n(), $n();
  const Ee = document.getElementById("participants-container"), Bn = document.getElementById("participant-template"), Jt = document.getElementById("add-participant-btn");
  let Fn = 0, Mt = 0;
  function De() {
    return `temp_${Date.now()}_${Fn++}`;
  }
  function $t(d = {}) {
    const o = Bn.content.cloneNode(!0), m = o.querySelector(".participant-entry"), f = d.id || De();
    m.setAttribute("data-participant-id", f);
    const w = m.querySelector(".participant-id-input"), x = m.querySelector('input[name="participants[].name"]'), L = m.querySelector('input[name="participants[].email"]'), $ = m.querySelector('select[name="participants[].role"]'), _ = m.querySelector('input[name="participants[].signing_stage"]'), T = m.querySelector(".signing-stage-wrapper"), k = Mt++;
    w.name = `participants[${k}].id`, w.value = f, x.name = `participants[${k}].name`, L.name = `participants[${k}].email`, $.name = `participants[${k}].role`, _ && (_.name = `participants[${k}].signing_stage`), d.name && (x.value = d.name), d.email && (L.value = d.email), d.role && ($.value = d.role), _ && d.signing_stage && (_.value = d.signing_stage);
    const j = () => {
      if (!T || !_) return;
      const q = $.value === "signer";
      T.classList.toggle("hidden", !q), q ? _.value || (_.value = "1") : _.value = "";
    };
    j(), m.querySelector(".remove-participant-btn").addEventListener("click", () => {
      m.remove(), tt();
    }), $.addEventListener("change", () => {
      j(), tt();
    }), Ee.appendChild(o);
  }
  Jt.addEventListener("click", () => $t()), R.length > 0 ? R.forEach((d) => {
    $t({
      id: String(d.id || "").trim(),
      name: String(d.name || "").trim(),
      email: String(d.email || "").trim(),
      role: String(d.role || "signer").trim() || "signer",
      signing_stage: Number(d.signing_stage || d.signingStage || 1) || 1
    });
  }) : $t();
  const oe = document.getElementById("field-definitions-container"), gn = document.getElementById("field-definition-template"), Yt = document.getElementById("add-field-btn"), mn = document.getElementById("add-field-btn-container"), Rn = document.getElementById("add-field-definition-empty-btn"), Dt = document.getElementById("field-definitions-empty-state"), he = document.getElementById("field-rules-container"), hn = document.getElementById("field-rule-template"), Hn = document.getElementById("add-field-rule-btn"), Kt = document.getElementById("field-rules-empty-state"), je = document.getElementById("field-rules-preview"), Xt = document.getElementById("field_rules_json"), Bt = document.getElementById("field_placements_json");
  let fn = 0, yn = 0, Ft = 0;
  function Qt() {
    return `temp_field_${Date.now()}_${fn++}`;
  }
  function qn() {
    return `rule_${Date.now()}_${Ft}`;
  }
  function et() {
    const d = Ee.querySelectorAll(".participant-entry"), o = [];
    return d.forEach((m) => {
      const f = m.getAttribute("data-participant-id"), w = m.querySelector('select[name*=".role"]'), x = m.querySelector('input[name*=".name"]'), L = m.querySelector('input[name*=".email"]');
      w.value === "signer" && o.push({
        id: f,
        name: x.value || L.value || "Signer",
        email: L.value
      });
    }), o;
  }
  function tt() {
    const d = et(), o = oe.querySelectorAll(".field-participant-select"), m = he ? he.querySelectorAll(".field-rule-participant-select") : [];
    o.forEach((f) => {
      const w = f.value;
      f.innerHTML = '<option value="">Select signer...</option>', d.forEach((x) => {
        const L = document.createElement("option");
        L.value = x.id, L.textContent = x.name, f.appendChild(L);
      }), w && d.some((x) => x.id === w) ? f.value = w : !w && d.length === 1 && (f.value = d[0].id);
    }), m.forEach((f) => {
      const w = f.value;
      f.innerHTML = '<option value="">Select signer...</option>', d.forEach((x) => {
        const L = document.createElement("option");
        L.value = x.id, L.textContent = x.name, f.appendChild(L);
      }), w && d.some((x) => x.id === w) ? f.value = w : !w && d.length === 1 && (f.value = d[0].id);
    }), ie();
  }
  function be() {
    const d = le(qe?.value || "0", 0);
    if (d > 0) return d;
    const o = String(Ye?.textContent || "").match(/(\d+)\s+pages?/i);
    if (o) {
      const m = le(o[1], 0);
      if (m > 0) return m;
    }
    return 1;
  }
  function Rt() {
    if (!he || !Kt) return;
    const d = he.querySelectorAll(".field-rule-entry");
    Kt.classList.toggle("hidden", d.length > 0);
  }
  function Ue() {
    if (!he) return [];
    const d = be(), o = he.querySelectorAll(".field-rule-entry"), m = [];
    return o.forEach((f) => {
      const w = In({
        id: f.getAttribute("data-field-rule-id") || "",
        type: f.querySelector(".field-rule-type-select")?.value || "",
        participantId: f.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: f.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: f.querySelector(".field-rule-to-page-input")?.value || "",
        page: f.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!f.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: on(f.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (f.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, d);
      w.type && m.push(w);
    }), m;
  }
  function vn() {
    return Ue().map((d) => Xs(d));
  }
  function $e(d, o) {
    return Zs(d, o);
  }
  function ie() {
    if (!je) return;
    const d = Ue(), o = be(), m = $e(d, o), f = et(), w = new Map(f.map((_) => [String(_.id), _.name]));
    if (Xt && (Xt.value = JSON.stringify(vn())), !m.length) {
      je.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const x = m.reduce((_, T) => {
      const k = T.type;
      return _[k] = (_[k] || 0) + 1, _;
    }, {}), L = m.slice(0, 8).map((_) => {
      const T = w.get(String(_.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${_.type === "initials" ? "Initials" : "Signature"} on page ${_.page}</span><span class="text-gray-500">${ue(String(T))}</span></li>`;
    }).join(""), $ = m.length - 8;
    je.innerHTML = `
      <p class="text-gray-700">${m.length} generated field${m.length !== 1 ? "s" : ""} (${x.initials || 0} initials, ${x.signature || 0} signatures)</p>
      <ul class="space-y-1">${L}</ul>
      ${$ > 0 ? `<p class="text-gray-500">+${$} more</p>` : ""}
    `;
  }
  function Zt() {
    const d = et(), o = new Map(d.map((T) => [String(T.id), T.name || T.email || "Signer"])), m = [];
    oe.querySelectorAll(".field-definition-entry").forEach((T) => {
      const k = String(T.getAttribute("data-field-definition-id") || "").trim(), j = T.querySelector(".field-type-select"), q = T.querySelector(".field-participant-select"), G = T.querySelector('input[name*=".page"]'), W = String(j?.value || "text").trim() || "text", re = String(q?.value || "").trim(), xe = parseInt(String(G?.value || "1"), 10) || 1;
      m.push({
        definitionId: k,
        fieldType: W,
        participantId: re,
        participantName: o.get(re) || "Unassigned",
        page: xe
      });
    });
    const w = $e(Ue(), be()), x = /* @__PURE__ */ new Map();
    w.forEach((T) => {
      const k = String(T.ruleId || "").trim(), j = String(T.id || "").trim();
      if (k && j) {
        const q = x.get(k) || [];
        q.push(j), x.set(k, q);
      }
    });
    let L = A.linkGroupState;
    x.forEach((T, k) => {
      if (T.length > 1 && !A.linkGroupState.groups.get(`rule_${k}`)) {
        const q = Ws(T, `Rule ${k}`);
        q.id = `rule_${k}`, L = wi(L, q);
      }
    }), A.linkGroupState = L, w.forEach((T) => {
      const k = String(T.id || "").trim();
      if (!k) return;
      const j = String(T.participantId || "").trim(), q = parseInt(String(T.page || "1"), 10) || 1, G = String(T.ruleId || "").trim();
      m.push({
        definitionId: k,
        fieldType: String(T.type || "text").trim() || "text",
        participantId: j,
        participantName: o.get(j) || "Unassigned",
        page: q,
        linkGroupId: G ? `rule_${G}` : void 0
      });
    });
    const $ = /* @__PURE__ */ new Set(), _ = m.filter((T) => {
      const k = String(T.definitionId || "").trim();
      return !k || $.has(k) ? !1 : ($.add(k), !0);
    });
    return _.sort((T, k) => T.page !== k.page ? T.page - k.page : T.definitionId.localeCompare(k.definitionId)), _;
  }
  function Ht(d) {
    const o = d.querySelector(".field-rule-type-select"), m = d.querySelector(".field-rule-range-start-wrap"), f = d.querySelector(".field-rule-range-end-wrap"), w = d.querySelector(".field-rule-page-wrap"), x = d.querySelector(".field-rule-exclude-last-wrap"), L = d.querySelector(".field-rule-exclude-pages-wrap"), $ = d.querySelector(".field-rule-summary"), _ = d.querySelector(".field-rule-from-page-input"), T = d.querySelector(".field-rule-to-page-input"), k = d.querySelector(".field-rule-page-input"), j = d.querySelector(".field-rule-exclude-last-input"), q = d.querySelector(".field-rule-exclude-pages-input"), G = be(), W = In({
      type: o?.value || "",
      fromPage: _?.value || "",
      toPage: T?.value || "",
      page: k?.value || "",
      excludeLastPage: !!j?.checked,
      excludePages: on(q?.value || ""),
      required: !0
    }, G), re = W.fromPage > 0 ? W.fromPage : 1, xe = W.toPage > 0 ? W.toPage : G, pe = W.page > 0 ? W.page : W.toPage > 0 ? W.toPage : G, fe = W.excludeLastPage, ct = W.excludePages.join(","), ne = o?.value === "initials_each_page";
    if (m.classList.toggle("hidden", !ne), f.classList.toggle("hidden", !ne), x.classList.toggle("hidden", !ne), L.classList.toggle("hidden", !ne), w.classList.toggle("hidden", ne), _ && (_.value = String(re)), T && (T.value = String(xe)), k && (k.value = String(pe)), q && (q.value = ct), j && (j.checked = fe), ne) {
      const Z = er(
        re,
        xe,
        G,
        fe,
        W.excludePages
      ), ae = tr(Z);
      Z.isEmpty ? $.textContent = `Warning: No initials fields will be generated ${ae}.` : $.textContent = `Generates initials fields on ${ae}.`;
    } else
      $.textContent = `Generates one signature field on page ${pe}.`;
  }
  function en(d = {}) {
    if (!hn || !he) return;
    const o = hn.content.cloneNode(!0), m = o.querySelector(".field-rule-entry"), f = d.id || qn(), w = Ft++, x = be();
    m.setAttribute("data-field-rule-id", f);
    const L = m.querySelector(".field-rule-id-input"), $ = m.querySelector(".field-rule-type-select"), _ = m.querySelector(".field-rule-participant-select"), T = m.querySelector(".field-rule-from-page-input"), k = m.querySelector(".field-rule-to-page-input"), j = m.querySelector(".field-rule-page-input"), q = m.querySelector(".field-rule-required-select"), G = m.querySelector(".field-rule-exclude-last-input"), W = m.querySelector(".field-rule-exclude-pages-input"), re = m.querySelector(".remove-field-rule-btn");
    L.name = `field_rules[${w}].id`, L.value = f, $.name = `field_rules[${w}].type`, _.name = `field_rules[${w}].participant_id`, T.name = `field_rules[${w}].from_page`, k.name = `field_rules[${w}].to_page`, j.name = `field_rules[${w}].page`, q.name = `field_rules[${w}].required`, G.name = `field_rules[${w}].exclude_last_page`, W.name = `field_rules[${w}].exclude_pages`;
    const xe = et();
    _.innerHTML = '<option value="">Select signer...</option>', xe.forEach((Z) => {
      const ae = document.createElement("option");
      ae.value = Z.id, ae.textContent = Z.name, _.appendChild(ae);
    });
    const pe = In(d, x);
    $.value = pe.type || "initials_each_page", _.value = pe.participantId, T.value = String(pe.fromPage > 0 ? pe.fromPage : 1), k.value = String(pe.toPage > 0 ? pe.toPage : x), j.value = String(pe.page > 0 ? pe.page : x), q.value = pe.required ? "1" : "0", G.checked = pe.excludeLastPage, W.value = pe.excludePages.join(",");
    const fe = () => {
      Ht(m), ie(), Oe();
    }, ct = () => {
      const Z = be();
      if (T) {
        const ae = parseInt(T.value, 10);
        Number.isFinite(ae) && (T.value = String(rn(ae, Z, 1)));
      }
      if (k) {
        const ae = parseInt(k.value, 10);
        Number.isFinite(ae) && (k.value = String(rn(ae, Z, 1)));
      }
      if (j) {
        const ae = parseInt(j.value, 10);
        Number.isFinite(ae) && (j.value = String(rn(ae, Z, 1)));
      }
    }, ne = () => {
      ct(), fe();
    };
    $.addEventListener("change", fe), _.addEventListener("change", fe), T.addEventListener("input", ne), T.addEventListener("change", ne), k.addEventListener("input", ne), k.addEventListener("change", ne), j.addEventListener("input", ne), j.addEventListener("change", ne), q.addEventListener("change", fe), G.addEventListener("change", () => {
      const Z = be();
      if (G.checked) {
        const ae = Math.max(1, Z - 1);
        k.value = String(ae);
      } else
        k.value = String(Z);
      fe();
    }), W.addEventListener("input", fe), re.addEventListener("click", () => {
      m.remove(), Rt(), ie(), Oe();
    }), he.appendChild(o), Ht(he.lastElementChild), Rt(), ie();
  }
  function wt(d = {}) {
    const o = gn.content.cloneNode(!0), m = o.querySelector(".field-definition-entry"), f = d.id || Qt();
    m.setAttribute("data-field-definition-id", f);
    const w = m.querySelector(".field-definition-id-input"), x = m.querySelector('select[name="field_definitions[].type"]'), L = m.querySelector('select[name="field_definitions[].participant_id"]'), $ = m.querySelector('input[name="field_definitions[].page"]'), _ = m.querySelector('input[name="field_definitions[].required"]'), T = m.querySelector(".field-date-signed-info"), k = yn++;
    w.name = `field_instances[${k}].id`, w.value = f, x.name = `field_instances[${k}].type`, L.name = `field_instances[${k}].participant_id`, $.name = `field_instances[${k}].page`, _.name = `field_instances[${k}].required`, d.type && (x.value = d.type), d.page && ($.value = String(rn(d.page, be(), 1))), d.required !== void 0 && (_.checked = d.required);
    const j = et();
    L.innerHTML = '<option value="">Select signer...</option>', j.forEach((W) => {
      const re = document.createElement("option");
      re.value = W.id, re.textContent = W.name, L.appendChild(re);
    }), d.participant_id ? L.value = d.participant_id : j.length === 1 && (L.value = j[0].id), x.addEventListener("change", () => {
      x.value === "date_signed" ? T.classList.remove("hidden") : T.classList.add("hidden");
    }), x.value === "date_signed" && T.classList.remove("hidden"), m.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      m.remove(), qt();
    });
    const q = m.querySelector('input[name*=".page"]'), G = () => {
      q && (q.value = String(rn(q.value, be(), 1)));
    };
    G(), q?.addEventListener("input", G), q?.addEventListener("change", G), oe.appendChild(o), qt();
  }
  function qt() {
    oe.querySelectorAll(".field-definition-entry").length === 0 ? (Dt.classList.remove("hidden"), mn?.classList.add("hidden")) : (Dt.classList.add("hidden"), mn?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    tt();
  }).observe(Ee, { childList: !0, subtree: !0 }), Ee.addEventListener("change", (d) => {
    (d.target.matches('select[name*=".role"]') || d.target.matches('input[name*=".name"]') || d.target.matches('input[name*=".email"]')) && tt();
  }), Ee.addEventListener("input", (d) => {
    (d.target.matches('input[name*=".name"]') || d.target.matches('input[name*=".email"]')) && tt();
  }), Yt.addEventListener("click", () => wt()), Rn.addEventListener("click", () => wt()), Hn?.addEventListener("click", () => en({ to_page: be() })), window._initialFieldPlacementsData = [], F.forEach((d) => {
    const o = String(d.id || "").trim();
    if (!o) return;
    const m = String(d.type || "signature").trim() || "signature", f = String(d.participant_id || d.participantId || "").trim(), w = Number(d.page || 1) || 1, x = !!d.required;
    wt({
      id: o,
      type: m,
      participant_id: f,
      page: w,
      required: x
    }), window._initialFieldPlacementsData.push(En({
      id: o,
      definitionId: o,
      type: m,
      participantId: f,
      participantName: String(d.participant_name || d.participantName || "").trim(),
      page: w,
      x: Number(d.x || d.pos_x || 0) || 0,
      y: Number(d.y || d.pos_y || 0) || 0,
      width: Number(d.width || 150) || 150,
      height: Number(d.height || 32) || 32,
      placementSource: String(d.placement_source || d.placementSource || Pe.MANUAL).trim() || Pe.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), qt(), tt(), Rt(), ie();
  const u = document.getElementById("agreement-form"), p = document.getElementById("submit-btn"), h = document.getElementById("form-announcements");
  function y(d, o = "", m = 0) {
    const f = String(o || "").trim().toUpperCase(), w = String(d || "").trim().toLowerCase();
    return f === "SCOPE_DENIED" || w.includes("scope denied") ? "You don't have access to this organization's resources." : f === "TRANSPORT_SECURITY" || f === "TRANSPORT_SECURITY_REQUIRED" || w.includes("tls transport required") || Number(m) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : String(d || "").trim() !== "" ? String(d).trim() : "Something went wrong. Please try again.";
  }
  async function S(d, o) {
    const m = Number(d?.status || 0);
    let f = "", w = "";
    try {
      const x = await d.json();
      f = String(x?.error?.code || x?.code || "").trim(), w = String(x?.error?.message || x?.message || "").trim();
    } catch {
      w = "";
    }
    return w === "" && (w = o || `Request failed (${m || "unknown"})`), {
      status: m,
      code: f,
      message: y(w, f, m)
    };
  }
  function I(d, o = "", m = 0) {
    const f = y(d, o, m);
    h && (h.textContent = f), window.toastManager ? window.toastManager.error(f) : alert(f);
  }
  function M() {
    const d = [];
    Ee.querySelectorAll(".participant-entry").forEach((w) => {
      const x = String(w.getAttribute("data-participant-id") || "").trim(), L = String(w.querySelector('input[name*=".name"]')?.value || "").trim(), $ = String(w.querySelector('input[name*=".email"]')?.value || "").trim(), _ = String(w.querySelector('select[name*=".role"]')?.value || "signer").trim(), T = String(w.querySelector(".signing-stage-input")?.value || "").trim(), k = Number(T || "1") || 1;
      d.push({
        id: x,
        name: L,
        email: $,
        role: _,
        signing_stage: _ === "signer" ? k : 0
      });
    });
    const o = [];
    oe.querySelectorAll(".field-definition-entry").forEach((w) => {
      const x = String(w.getAttribute("data-field-definition-id") || "").trim(), L = String(w.querySelector(".field-type-select")?.value || "signature").trim(), $ = String(w.querySelector(".field-participant-select")?.value || "").trim(), _ = Number(w.querySelector('input[name*=".page"]')?.value || "1") || 1, T = !!w.querySelector('input[name*=".required"]')?.checked;
      x && o.push({
        id: x,
        type: L,
        participant_id: $,
        page: _,
        required: T
      });
    });
    const m = [];
    A && Array.isArray(A.fieldInstances) && A.fieldInstances.forEach((w, x) => {
      m.push(Si(w, x));
    });
    const f = JSON.stringify(m);
    return Bt && (Bt.value = f), {
      document_id: String(we?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: d,
      field_instances: o,
      field_placements: m,
      field_placements_json: f,
      field_rules: vn(),
      field_rules_json: String(Xt?.value || "[]"),
      send_for_signature: N === lt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(qe?.value || "0") || 0
    };
  }
  function H() {
    const d = et(), o = /* @__PURE__ */ new Map();
    return d.forEach((w) => {
      o.set(w.id, !1);
    }), oe.querySelectorAll(".field-definition-entry").forEach((w) => {
      const x = w.querySelector(".field-type-select"), L = w.querySelector(".field-participant-select"), $ = w.querySelector('input[name*=".required"]');
      x?.value === "signature" && L?.value && $?.checked && o.set(L.value, !0);
    }), $e(Ue(), be()).forEach((w) => {
      w.type === "signature" && w.participantId && w.required && o.set(w.participantId, !0);
    }), d.filter((w) => !o.get(w.id));
  }
  function Y(d) {
    if (!Array.isArray(d) || d.length === 0)
      return "Each signer requires at least one required signature field.";
    const o = d.map((m) => m?.name?.trim()).filter((m) => !!m);
    return o.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${o.join(", ")}`;
  }
  u.addEventListener("submit", function(d) {
    if (ie(), !we.value) {
      d.preventDefault(), I("Please select a document"), Me.focus();
      return;
    }
    const o = Ee.querySelectorAll(".participant-entry");
    if (o.length === 0) {
      d.preventDefault(), I("Please add at least one participant"), Jt.focus();
      return;
    }
    let m = !1;
    if (o.forEach((k) => {
      k.querySelector('select[name*=".role"]').value === "signer" && (m = !0);
    }), !m) {
      d.preventDefault(), I("At least one signer is required");
      const k = o[0]?.querySelector('select[name*=".role"]');
      k && k.focus();
      return;
    }
    const f = oe.querySelectorAll(".field-definition-entry"), w = H();
    if (w.length > 0) {
      d.preventDefault(), I(Y(w)), bt(Se.FIELDS), Yt.focus();
      return;
    }
    let x = !1;
    if (f.forEach((k) => {
      k.querySelector(".field-participant-select").value || (x = !0);
    }), x) {
      d.preventDefault(), I("Please assign all fields to a signer");
      const k = oe.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      k && k.focus();
      return;
    }
    if (Ue().some((k) => !k.participantId)) {
      d.preventDefault(), I("Please assign all automation rules to a signer"), Array.from(he?.querySelectorAll(".field-rule-participant-select") || []).find((j) => !j.value)?.focus();
      return;
    }
    const _ = !!u.querySelector('input[name="save_as_draft"]'), T = N === lt && !_;
    if (T) {
      let k = u.querySelector('input[name="send_for_signature"]');
      k || (k = document.createElement("input"), k.type = "hidden", k.name = "send_for_signature", u.appendChild(k)), k.value = "1";
    } else
      u.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      d.preventDefault(), p.disabled = !0, p.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${T ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          M(), J.updateState(J.collectFormState()), await _e.forceSync();
          const k = J.getState();
          if (k?.syncPending)
            throw new Error("Unable to sync latest draft changes");
          const j = String(k?.serverDraftId || "").trim();
          if (!j)
            throw new Error("Draft session not available. Please try again.");
          const q = String(e.routes?.index || "").trim();
          if (!T) {
            if (q) {
              window.location.href = q;
              return;
            }
            window.location.reload();
            return;
          }
          const G = await fetch(
            B(`${l}/${encodeURIComponent(j)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: z(),
              body: JSON.stringify({
                expected_revision: Number(k?.serverRevision || 0),
                created_by_user_id: v
              })
            }
          );
          if (!G.ok)
            throw await S(G, "Failed to send agreement");
          const W = await G.json(), re = String(W?.agreement_id || W?.id || W?.data?.id || "").trim();
          if (J.clear(), _e.broadcastStateUpdate(), re && q) {
            window.location.href = `${q}/${encodeURIComponent(re)}`;
            return;
          }
          if (q) {
            window.location.href = q;
            return;
          }
          window.location.reload();
        } catch (k) {
          const j = String(k?.message || "Failed to process agreement").trim(), q = String(k?.code || "").trim(), G = Number(k?.status || 0);
          I(j, q, G), p.disabled = !1, p.innerHTML = `
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
      ${T ? "Sending..." : "Saving..."}
    `;
  });
  let N = 1;
  const ce = document.querySelectorAll(".wizard-step-btn"), Le = document.querySelectorAll(".wizard-step"), ke = document.querySelectorAll(".wizard-connector"), O = document.getElementById("wizard-prev-btn"), te = document.getElementById("wizard-next-btn"), ze = document.getElementById("wizard-save-btn");
  function Be() {
    if (ce.forEach((d, o) => {
      const m = o + 1, f = d.querySelector(".wizard-step-number");
      m < N ? (d.classList.remove("text-gray-500", "text-blue-600"), d.classList.add("text-green-600"), f.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), f.classList.add("bg-green-600", "text-white"), d.removeAttribute("aria-current")) : m === N ? (d.classList.remove("text-gray-500", "text-green-600"), d.classList.add("text-blue-600"), f.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), f.classList.add("bg-blue-600", "text-white"), d.setAttribute("aria-current", "step")) : (d.classList.remove("text-blue-600", "text-green-600"), d.classList.add("text-gray-500"), f.classList.remove("bg-blue-600", "text-white", "bg-green-600"), f.classList.add("bg-gray-300", "text-gray-600"), d.removeAttribute("aria-current"));
    }), ke.forEach((d, o) => {
      o < N - 1 ? (d.classList.remove("bg-gray-300"), d.classList.add("bg-green-600")) : (d.classList.remove("bg-green-600"), d.classList.add("bg-gray-300"));
    }), Le.forEach((d) => {
      parseInt(d.dataset.step, 10) === N ? d.classList.remove("hidden") : d.classList.add("hidden");
    }), O.classList.toggle("hidden", N === 1), te.classList.toggle("hidden", N === lt), ze.classList.toggle("hidden", N !== lt), p.classList.toggle("hidden", N !== lt), N < lt) {
      const d = Fs[N] || "Next";
      te.innerHTML = `
        ${d}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    N === Se.PLACEMENT ? wn() : N === Se.REVIEW && ds(), He.updateVisibility(N);
  }
  function Nn(d) {
    switch (d) {
      case 1:
        return we.value ? !0 : (I("Please select a document"), !1);
      case 2:
        const o = document.getElementById("title");
        return o.value.trim() ? !0 : (I("Please enter an agreement title"), o.focus(), !1);
      case 3:
        const m = Ee.querySelectorAll(".participant-entry");
        if (m.length === 0)
          return I("Please add at least one participant"), !1;
        let f = !1;
        return m.forEach((_) => {
          _.querySelector('select[name*=".role"]').value === "signer" && (f = !0);
        }), f ? !0 : (I("At least one signer is required"), !1);
      case 4:
        const w = oe.querySelectorAll(".field-definition-entry");
        for (const _ of w) {
          const T = _.querySelector(".field-participant-select");
          if (!T.value)
            return I("Please assign all fields to a signer"), T.focus(), !1;
        }
        if (Ue().find((_) => !_.participantId))
          return I("Please assign all automation rules to a signer"), he?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const $ = H();
        return $.length > 0 ? (I(Y($)), Yt.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function bt(d) {
    if (!(d < Se.DOCUMENT || d > lt)) {
      if (d > N) {
        for (let o = N; o < d; o++)
          if (!Nn(o)) return;
      }
      N = d, Be(), J.updateStep(d), It(), _e.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  ce.forEach((d) => {
    d.addEventListener("click", () => {
      const o = parseInt(d.dataset.step, 10);
      bt(o);
    });
  }), O.addEventListener("click", () => bt(N - 1)), te.addEventListener("click", () => bt(N + 1)), ze.addEventListener("click", () => {
    const d = document.createElement("input");
    d.type = "hidden", d.name = "save_as_draft", d.value = "1", u.appendChild(d), u.submit();
  });
  let A = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((d, o) => En(d, o)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: Gs()
  };
  const at = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, Nt = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function wn() {
    const d = document.getElementById("placement-loading"), o = document.getElementById("placement-no-document"), m = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const f = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const w = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const x = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !we.value) {
      d.classList.add("hidden"), o.classList.remove("hidden");
      return;
    }
    d.classList.remove("hidden"), o.classList.add("hidden");
    const L = Zt(), $ = new Set(
      L.map((q) => String(q.definitionId || "").trim()).filter((q) => q)
    );
    A.fieldInstances = A.fieldInstances.filter(
      (q) => $.has(String(q.definitionId || "").trim())
    ), m.innerHTML = "", L.forEach((q) => {
      const G = String(q.definitionId || "").trim(), W = String(q.fieldType || "text").trim() || "text", re = String(q.participantId || "").trim(), xe = String(q.participantName || "Unassigned").trim() || "Unassigned", pe = parseInt(String(q.page || "1"), 10) || 1, fe = String(q.linkGroupId || "").trim();
      if (!G) return;
      A.fieldInstances.forEach((Ce) => {
        Ce.definitionId === G && (Ce.type = W, Ce.participantId = re, Ce.participantName = xe);
      });
      const ct = at[W] || at.text, ne = A.fieldInstances.some((Ce) => Ce.definitionId === G), Z = document.createElement("div");
      Z.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${ne ? "opacity-50" : ""}`, Z.draggable = !ne, Z.dataset.definitionId = G, Z.dataset.fieldType = W, Z.dataset.participantId = re, Z.dataset.participantName = xe, Z.dataset.page = String(pe), fe && (Z.dataset.linkGroupId = fe);
      const ae = document.createElement("span");
      ae.className = `w-3 h-3 rounded ${ct.bg}`;
      const jt = document.createElement("div");
      jt.className = "flex-1 text-xs";
      const sn = document.createElement("div");
      sn.className = "font-medium capitalize", sn.textContent = W.replace(/_/g, " ");
      const K = document.createElement("div");
      K.className = "text-gray-500", K.textContent = xe;
      const ye = document.createElement("span");
      ye.className = `placement-status text-xs ${ne ? "text-green-600" : "text-amber-600"}`, ye.textContent = ne ? "Placed" : "Not placed", jt.appendChild(sn), jt.appendChild(K), Z.appendChild(ae), Z.appendChild(jt), Z.appendChild(ye), Z.addEventListener("dragstart", (Ce) => {
        if (ne) {
          Ce.preventDefault();
          return;
        }
        Ce.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: G,
          fieldType: W,
          participantId: re,
          participantName: xe
        })), Ce.dataTransfer.effectAllowed = "copy", Z.classList.add("opacity-50");
      }), Z.addEventListener("dragend", () => {
        Z.classList.remove("opacity-50");
      }), m.appendChild(Z);
    });
    const _ = ++A.loadRequestVersion, T = String(we.value || "").trim(), k = encodeURIComponent(T), j = `${n}/panels/esign_documents/${k}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const G = await window.pdfjsLib.getDocument({
        url: j,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (_ !== A.loadRequestVersion)
        return;
      A.pdfDoc = G, A.totalPages = A.pdfDoc.numPages, A.currentPage = 1, x.textContent = A.totalPages, await nt(A.currentPage), d.classList.add("hidden"), A.uiHandlersBound || (Vi(f, w), Xi(), Qi(), A.uiHandlersBound = !0), ot();
    } catch (q) {
      if (_ !== A.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", q), d.classList.add("hidden"), o.classList.remove("hidden"), o.textContent = `Failed to load PDF: ${y(q?.message || "Failed to load PDF")}`;
    }
    tn(), Fe();
  }
  async function nt(d) {
    if (!A.pdfDoc) return;
    const o = document.getElementById("placement-pdf-canvas"), m = document.getElementById("placement-canvas-container"), f = o.getContext("2d"), w = await A.pdfDoc.getPage(d), x = w.getViewport({ scale: A.scale });
    o.width = x.width, o.height = x.height, m.style.width = `${x.width}px`, m.style.height = `${x.height}px`, await w.render({
      canvasContext: f,
      viewport: x
    }).promise, document.getElementById("placement-current-page").textContent = d, ot();
  }
  function Vi(d, o) {
    const m = document.getElementById("placement-pdf-canvas");
    d.addEventListener("dragover", (f) => {
      f.preventDefault(), f.dataTransfer.dropEffect = "copy", m.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), d.addEventListener("dragleave", (f) => {
      m.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), d.addEventListener("drop", (f) => {
      f.preventDefault(), m.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const w = f.dataTransfer.getData("application/json");
      if (!w) return;
      const x = JSON.parse(w), L = m.getBoundingClientRect(), $ = (f.clientX - L.left) / A.scale, _ = (f.clientY - L.top) / A.scale;
      li(x, $, _);
    });
  }
  function li(d, o, m, f = {}) {
    const w = Nt[d.fieldType] || Nt.text, x = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, L = f.placementSource || Pe.MANUAL, $ = f.linkGroupId || Bi(A.linkGroupState, d.definitionId)?.id, _ = {
      id: x,
      definitionId: d.definitionId,
      type: d.fieldType,
      participantId: d.participantId,
      participantName: d.participantName,
      page: A.currentPage,
      x: Math.max(0, o - w.width / 2),
      y: Math.max(0, m - w.height / 2),
      width: w.width,
      height: w.height,
      placementSource: L,
      linkGroupId: $,
      linkedFromFieldId: f.linkedFromFieldId
    };
    A.fieldInstances.push(_), di(d.definitionId), L === Pe.MANUAL && $ && Wi(_), ot(), tn(), Fe();
  }
  function di(d) {
    const o = document.querySelector(`.placement-field-item[data-definition-id="${d}"]`);
    if (o) {
      o.classList.add("opacity-50"), o.draggable = !1;
      const m = o.querySelector(".placement-status");
      m && (m.textContent = "Placed", m.classList.remove("text-amber-600"), m.classList.add("text-green-600"));
    }
  }
  function Gi(d) {
    const o = Js(
      A.linkGroupState,
      d
    );
    o && (A.linkGroupState = wi(A.linkGroupState, o.updatedGroup));
  }
  function ui(d) {
    const o = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((x) => {
      const L = x.dataset.definitionId, $ = x.dataset.page;
      if (L) {
        const _ = A.linkGroupState.definitionToGroup.get(L);
        o.set(L, {
          type: x.dataset.fieldType || "text",
          participantId: x.dataset.participantId || "",
          participantName: x.dataset.participantName || "Unknown",
          page: $ ? parseInt($, 10) : 1,
          linkGroupId: _
        });
      }
    });
    let f = 0;
    const w = 10;
    for (; f < w; ) {
      const x = Ys(
        A.linkGroupState,
        d,
        A.fieldInstances,
        o
      );
      if (!x || !x.newPlacement) break;
      A.fieldInstances.push(x.newPlacement), di(x.newPlacement.definitionId), f++;
    }
    f > 0 && (ot(), tn(), Fe());
  }
  function Wi(d) {
    Gi(d);
  }
  function ot() {
    const d = document.getElementById("placement-overlays-container");
    d.innerHTML = "", d.style.pointerEvents = "auto", A.fieldInstances.filter((o) => o.page === A.currentPage).forEach((o) => {
      const m = at[o.type] || at.text, f = A.selectedFieldId === o.id, w = document.createElement("div");
      w.className = `field-overlay absolute cursor-move ${m.border} border-2 rounded`, w.style.cssText = `
          left: ${o.x * A.scale}px;
          top: ${o.y * A.scale}px;
          width: ${o.width * A.scale}px;
          height: ${o.height * A.scale}px;
          background-color: ${m.fill};
          ${f ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, w.dataset.instanceId = o.id;
      const x = document.createElement("div");
      x.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + m.bg, x.textContent = `${o.type.replace("_", " ")} - ${o.participantName}`, w.appendChild(x);
      const L = document.createElement("div");
      L.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", L.style.cssText = "transform: translate(50%, 50%);", w.appendChild(L);
      const $ = document.createElement("button");
      $.type = "button", $.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", $.innerHTML = "×", $.addEventListener("click", (_) => {
        _.stopPropagation(), Ki(o.id);
      }), w.appendChild($), w.addEventListener("mousedown", (_) => {
        _.target === L ? Yi(_, o) : _.target !== $ && Ji(_, o, w);
      }), w.addEventListener("click", () => {
        A.selectedFieldId = o.id, ot();
      }), d.appendChild(w);
    });
  }
  function Ji(d, o, m) {
    d.preventDefault(), A.isDragging = !0, A.selectedFieldId = o.id;
    const f = d.clientX, w = d.clientY, x = o.x * A.scale, L = o.y * A.scale;
    function $(T) {
      const k = T.clientX - f, j = T.clientY - w;
      o.x = Math.max(0, (x + k) / A.scale), o.y = Math.max(0, (L + j) / A.scale), o.placementSource = Pe.MANUAL, m.style.left = `${o.x * A.scale}px`, m.style.top = `${o.y * A.scale}px`;
    }
    function _() {
      A.isDragging = !1, document.removeEventListener("mousemove", $), document.removeEventListener("mouseup", _), Fe();
    }
    document.addEventListener("mousemove", $), document.addEventListener("mouseup", _);
  }
  function Yi(d, o) {
    d.preventDefault(), d.stopPropagation(), A.isResizing = !0;
    const m = d.clientX, f = d.clientY, w = o.width, x = o.height;
    function L(_) {
      const T = (_.clientX - m) / A.scale, k = (_.clientY - f) / A.scale;
      o.width = Math.max(30, w + T), o.height = Math.max(20, x + k), o.placementSource = Pe.MANUAL, ot();
    }
    function $() {
      A.isResizing = !1, document.removeEventListener("mousemove", L), document.removeEventListener("mouseup", $), Fe();
    }
    document.addEventListener("mousemove", L), document.addEventListener("mouseup", $);
  }
  function Ki(d) {
    const o = A.fieldInstances.find((f) => f.id === d);
    if (!o) return;
    A.fieldInstances = A.fieldInstances.filter((f) => f.id !== d);
    const m = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (m) {
      m.classList.remove("opacity-50"), m.draggable = !0;
      const f = m.querySelector(".placement-status");
      f && (f.textContent = "Not placed", f.classList.remove("text-green-600"), f.classList.add("text-amber-600"));
    }
    ot(), tn(), Fe();
  }
  function Xi() {
    const d = document.getElementById("placement-prev-page"), o = document.getElementById("placement-next-page");
    d.addEventListener("click", async () => {
      A.currentPage > 1 && (A.currentPage--, ui(A.currentPage), await nt(A.currentPage));
    }), o.addEventListener("click", async () => {
      A.currentPage < A.totalPages && (A.currentPage++, ui(A.currentPage), await nt(A.currentPage));
    });
  }
  function Qi() {
    const d = document.getElementById("placement-zoom-in"), o = document.getElementById("placement-zoom-out"), m = document.getElementById("placement-zoom-fit"), f = document.getElementById("placement-zoom-level");
    d.addEventListener("click", async () => {
      A.scale = Math.min(3, A.scale + 0.25), f.textContent = `${Math.round(A.scale * 100)}%`, await nt(A.currentPage);
    }), o.addEventListener("click", async () => {
      A.scale = Math.max(0.5, A.scale - 0.25), f.textContent = `${Math.round(A.scale * 100)}%`, await nt(A.currentPage);
    }), m.addEventListener("click", async () => {
      const w = document.getElementById("placement-viewer"), L = (await A.pdfDoc.getPage(A.currentPage)).getViewport({ scale: 1 });
      A.scale = (w.clientWidth - 40) / L.width, f.textContent = `${Math.round(A.scale * 100)}%`, await nt(A.currentPage);
    });
  }
  function tn() {
    const d = Array.from(document.querySelectorAll(".placement-field-item")), o = d.length, m = new Set(
      d.map((L) => String(L.dataset.definitionId || "").trim()).filter((L) => L)
    ), f = /* @__PURE__ */ new Set();
    A.fieldInstances.forEach((L) => {
      const $ = String(L.definitionId || "").trim();
      m.has($) && f.add($);
    });
    const w = f.size, x = Math.max(0, o - w);
    document.getElementById("placement-total-fields").textContent = o, document.getElementById("placement-placed-count").textContent = w, document.getElementById("placement-unplaced-count").textContent = x;
  }
  function Fe() {
    const d = document.getElementById("field-instances-container");
    d.innerHTML = "";
    const o = A.fieldInstances.map((m, f) => Si(m, f));
    Bt && (Bt.value = JSON.stringify(o));
  }
  Fe();
  let Te = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const xt = document.getElementById("auto-place-btn");
  xt && xt.addEventListener("click", async () => {
    if (Te.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      nn("All fields are already placed", "info");
      return;
    }
    const o = document.querySelector('input[name="id"]')?.value;
    if (!o) {
      jn();
      return;
    }
    Te.isRunning = !0, xt.disabled = !0, xt.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const m = await fetch(`${c}/esign/agreements/${o}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Zi()
        })
      });
      if (!m.ok)
        throw await S(m, "Auto-placement failed");
      const f = await m.json(), w = f && typeof f == "object" && f.run && typeof f.run == "object" ? f.run : f;
      Te.currentRunId = w?.run_id || w?.id || null, Te.suggestions = w?.suggestions || [], Te.resolverScores = w?.resolver_scores || [], Te.suggestions.length === 0 ? (nn("No placement suggestions found. Try placing fields manually.", "warning"), jn()) : es(f);
    } catch (m) {
      console.error("Auto-place error:", m);
      const f = y(m?.message || "Auto-placement failed", m?.code || "", m?.status || 0);
      nn(`Auto-placement failed: ${f}`, "error"), jn();
    } finally {
      Te.isRunning = !1, xt.disabled = !1, xt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Zi() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function jn() {
    const d = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let o = 100;
    d.forEach((m) => {
      const f = {
        definitionId: m.dataset.definitionId,
        fieldType: m.dataset.fieldType,
        participantId: m.dataset.participantId,
        participantName: m.dataset.participantName
      }, w = Nt[f.fieldType] || Nt.text;
      A.currentPage = A.totalPages, li(f, 300, o + w.height / 2, { placementSource: Pe.AUTO_FALLBACK }), o += w.height + 20;
    }), A.pdfDoc && nt(A.totalPages), nn("Fields placed using fallback layout", "info");
  }
  function es(d) {
    let o = document.getElementById("placement-suggestions-modal");
    o || (o = ts(), document.body.appendChild(o));
    const m = o.querySelector("#suggestions-list"), f = o.querySelector("#resolver-info"), w = o.querySelector("#run-stats");
    f.innerHTML = Te.resolverScores.map((x) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${ue(String(x?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${x.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${os(x.score)}">
              ${(Number(x?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), w.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${ue(String(d?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${d.status === "completed" ? "text-green-600" : "text-amber-600"}">${ue(String(d?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(d?.elapsed_ms || 0))}ms</span>
      </div>
    `, m.innerHTML = Te.suggestions.map((x, L) => {
      const $ = pi(x.field_definition_id), _ = at[$?.type] || at.text, T = ue(String($?.type || "field").replace(/_/g, " ")), k = ue(String(x?.id || "")), j = Math.max(1, Number(x?.page_number || 1)), q = Math.round(Number(x?.x || 0)), G = Math.round(Number(x?.y || 0)), W = Math.max(0, Number(x?.confidence || 0)), re = ue(cs(String(x?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${L}" data-suggestion-id="${k}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${_.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${T}</div>
                <div class="text-xs text-gray-500">Page ${j}, (${q}, ${G})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${as(x.confidence)}">
                ${(W * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${re}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${L}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${L}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${L}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), ns(o), o.classList.remove("hidden");
  }
  function ts() {
    const d = document.createElement("div");
    return d.id = "placement-suggestions-modal", d.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", d.innerHTML = `
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
    `, d.querySelector("#close-suggestions-modal").addEventListener("click", () => {
      d.classList.add("hidden");
    }), d.addEventListener("click", (o) => {
      o.target === d && d.classList.add("hidden");
    }), d.querySelector("#accept-all-btn").addEventListener("click", () => {
      d.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-green-500", "bg-green-50"), o.classList.remove("border-red-500", "bg-red-50"), o.dataset.accepted = "true";
      });
    }), d.querySelector("#reject-all-btn").addEventListener("click", () => {
      d.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-red-500", "bg-red-50"), o.classList.remove("border-green-500", "bg-green-50"), o.dataset.accepted = "false";
      });
    }), d.querySelector("#apply-suggestions-btn").addEventListener("click", () => {
      ss(), d.classList.add("hidden");
    }), d.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      d.classList.add("hidden");
      const o = d.querySelector("#placement-policy-preset-modal"), m = document.getElementById("placement-policy-preset");
      m && o && (m.value = o.value), xt?.click();
    }), d;
  }
  function ns(d) {
    d.querySelectorAll(".accept-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const m = o.closest(".suggestion-item");
        m.classList.add("border-green-500", "bg-green-50"), m.classList.remove("border-red-500", "bg-red-50"), m.dataset.accepted = "true";
      });
    }), d.querySelectorAll(".reject-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const m = o.closest(".suggestion-item");
        m.classList.add("border-red-500", "bg-red-50"), m.classList.remove("border-green-500", "bg-green-50"), m.dataset.accepted = "false";
      });
    }), d.querySelectorAll(".preview-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const m = parseInt(o.dataset.index, 10), f = Te.suggestions[m];
        f && is(f);
      });
    });
  }
  function is(d) {
    d.page_number !== A.currentPage && (A.currentPage = d.page_number, nt(d.page_number));
    const o = document.getElementById("placement-overlays-container"), m = document.getElementById("suggestion-preview-overlay");
    m && m.remove();
    const f = document.createElement("div");
    f.id = "suggestion-preview-overlay", f.className = "absolute pointer-events-none animate-pulse", f.style.cssText = `
      left: ${d.x * A.scale}px;
      top: ${d.y * A.scale}px;
      width: ${d.width * A.scale}px;
      height: ${d.height * A.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, o.appendChild(f), setTimeout(() => f.remove(), 3e3);
  }
  function ss() {
    const o = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    o.forEach((m) => {
      const f = parseInt(m.dataset.index, 10), w = Te.suggestions[f];
      if (!w) return;
      const x = pi(w.field_definition_id);
      if (!x) return;
      const L = document.querySelector(`.placement-field-item[data-definition-id="${w.field_definition_id}"]`);
      if (!L || L.classList.contains("opacity-50")) return;
      const $ = {
        definitionId: w.field_definition_id,
        fieldType: x.type,
        participantId: x.participant_id,
        participantName: L.dataset.participantName
      };
      A.currentPage = w.page_number, rs($, w);
    }), A.pdfDoc && nt(A.currentPage), ls(o.length, Te.suggestions.length - o.length), nn(`Applied ${o.length} placement${o.length !== 1 ? "s" : ""}`, "success");
  }
  function rs(d, o) {
    const m = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: d.definitionId,
      type: d.fieldType,
      participantId: d.participantId,
      participantName: d.participantName,
      page: o.page_number,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      // Track placement source for audit
      placementSource: Pe.AUTO,
      resolverId: o.resolver_id,
      confidence: o.confidence,
      placementRunId: Te.currentRunId
    };
    A.fieldInstances.push(m);
    const f = document.querySelector(`.placement-field-item[data-definition-id="${d.definitionId}"]`);
    if (f) {
      f.classList.add("opacity-50"), f.draggable = !1;
      const w = f.querySelector(".placement-status");
      w && (w.textContent = "Placed", w.classList.remove("text-amber-600"), w.classList.add("text-green-600"));
    }
    ot(), tn(), Fe();
  }
  function pi(d) {
    const o = document.querySelector(`.field-definition-entry[data-field-definition-id="${d}"]`);
    return o ? {
      id: d,
      type: o.querySelector(".field-type-select")?.value || "text",
      participant_id: o.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function as(d) {
    return d >= 0.9 ? "bg-green-100 text-green-800" : d >= 0.7 ? "bg-blue-100 text-blue-800" : d >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function os(d) {
    return d >= 0.8 ? "bg-green-100 text-green-800" : d >= 0.6 ? "bg-blue-100 text-blue-800" : d >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function cs(d) {
    return d ? d.split("_").map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(" ") : "Unknown";
  }
  async function ls(d, o) {
  }
  function nn(d, o = "info") {
    const m = document.createElement("div");
    m.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${o === "success" ? "bg-green-600 text-white" : o === "error" ? "bg-red-600 text-white" : o === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, m.textContent = d, document.body.appendChild(m), setTimeout(() => {
      m.style.opacity = "0", setTimeout(() => m.remove(), 300);
    }, 3e3);
  }
  function ds() {
    const d = document.getElementById("send-readiness-loading"), o = document.getElementById("send-readiness-results"), m = document.getElementById("send-validation-status"), f = document.getElementById("send-validation-issues"), w = document.getElementById("send-issues-list"), x = document.getElementById("send-confirmation"), L = document.getElementById("review-agreement-title"), $ = document.getElementById("review-document-title"), _ = document.getElementById("review-participant-count"), T = document.getElementById("review-stage-count"), k = document.getElementById("review-participants-list"), j = document.getElementById("review-fields-summary"), q = document.getElementById("title").value || "Untitled", G = Je.textContent || "No document", W = Ee.querySelectorAll(".participant-entry"), re = oe.querySelectorAll(".field-definition-entry"), xe = $e(Ue(), be()), pe = et(), fe = /* @__PURE__ */ new Set();
    W.forEach((K) => {
      const ye = K.querySelector(".signing-stage-input");
      K.querySelector('select[name*=".role"]').value === "signer" && ye?.value && fe.add(parseInt(ye.value, 10));
    }), L.textContent = q, $.textContent = G, _.textContent = `${W.length} (${pe.length} signers)`, T.textContent = fe.size > 0 ? fe.size : "1", k.innerHTML = "", W.forEach((K) => {
      const ye = K.querySelector('input[name*=".name"]'), Ce = K.querySelector('input[name*=".email"]'), zn = K.querySelector('select[name*=".role"]'), gi = K.querySelector(".signing-stage-input"), On = document.createElement("div");
      On.className = "flex items-center justify-between text-sm", On.innerHTML = `
        <div>
          <span class="font-medium">${ue(ye.value || Ce.value)}</span>
          <span class="text-gray-500 ml-2">${ue(Ce.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${zn.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${zn.value === "signer" ? "Signer" : "CC"}
          </span>
          ${zn.value === "signer" && gi?.value ? `<span class="text-xs text-gray-500">Stage ${gi.value}</span>` : ""}
        </div>
      `, k.appendChild(On);
    });
    const ct = re.length + xe.length;
    j.textContent = `${ct} field${ct !== 1 ? "s" : ""} defined (${re.length} manual, ${xe.length} generated)`;
    const ne = [];
    we.value || ne.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), pe.length === 0 && ne.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), H().forEach((K) => {
      ne.push({
        severity: "error",
        message: `${K.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const ae = Array.from(fe).sort((K, ye) => K - ye);
    for (let K = 0; K < ae.length; K++)
      if (ae[K] !== K + 1) {
        ne.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const jt = ne.some((K) => K.severity === "error"), sn = ne.some((K) => K.severity === "warning");
    jt ? (m.className = "p-4 rounded-lg bg-red-50 border border-red-200", m.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, x.classList.add("hidden"), p.disabled = !0) : sn ? (m.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", m.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, x.classList.remove("hidden"), p.disabled = !1) : (m.className = "p-4 rounded-lg bg-green-50 border border-green-200", m.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, x.classList.remove("hidden"), p.disabled = !1), ne.length > 0 ? (f.classList.remove("hidden"), w.innerHTML = "", ne.forEach((K) => {
      const ye = document.createElement("li");
      ye.className = `p-3 rounded-lg flex items-center justify-between ${K.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, ye.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${K.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${K.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${ue(K.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${K.step}">
            ${ue(K.action)}
          </button>
        `, w.appendChild(ye);
    }), w.querySelectorAll("[data-go-to-step]").forEach((K) => {
      K.addEventListener("click", () => {
        const ye = Number(K.getAttribute("data-go-to-step"));
        Number.isFinite(ye) && bt(ye);
      });
    })) : f.classList.add("hidden"), d.classList.add("hidden"), o.classList.remove("hidden");
  }
  let Un = null;
  function Oe() {
    Un && clearTimeout(Un), Un = setTimeout(() => {
      It();
    }, 500);
  }
  we && new MutationObserver(() => {
    It();
  }).observe(we, { attributes: !0, attributeFilter: ["value"] });
  const us = document.getElementById("title"), ps = document.getElementById("message");
  us?.addEventListener("input", Oe), ps?.addEventListener("input", Oe), Ee.addEventListener("input", Oe), Ee.addEventListener("change", Oe), oe.addEventListener("input", Oe), oe.addEventListener("change", Oe), he?.addEventListener("input", Oe), he?.addEventListener("change", Oe);
  const gs = Fe;
  Fe = function() {
    gs(), It();
  };
  function ms() {
    const d = J.getState();
    !d.participants || d.participants.length === 0 || (Ee.innerHTML = "", Mt = 0, d.participants.forEach((o) => {
      $t({
        id: o.tempId,
        name: o.name,
        email: o.email,
        role: o.role,
        signing_stage: o.signingStage
      });
    }));
  }
  function hs() {
    const d = J.getState();
    !d.fieldDefinitions || d.fieldDefinitions.length === 0 || (oe.innerHTML = "", yn = 0, d.fieldDefinitions.forEach((o) => {
      wt({
        id: o.tempId,
        type: o.type,
        participant_id: o.participantTempId,
        page: o.page,
        required: o.required
      });
    }), qt());
  }
  function fs() {
    const d = J.getState();
    !Array.isArray(d.fieldRules) || d.fieldRules.length === 0 || he && (he.querySelectorAll(".field-rule-entry").forEach((o) => o.remove()), Ft = 0, d.fieldRules.forEach((o) => {
      en({
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
    }), Rt(), ie());
  }
  function ys() {
    const d = J.getState();
    !Array.isArray(d.fieldPlacements) || d.fieldPlacements.length === 0 || (A.fieldInstances = d.fieldPlacements.map((o, m) => En(o, m)), Fe());
  }
  if (window._resumeToStep) {
    ms(), hs(), fs(), tt(), ys();
    const d = J.getState();
    d.document?.id && He.setDocument(d.document.id, d.document.title, d.document.pageCount), N = window._resumeToStep, Be(), delete window._resumeToStep;
  } else if (Be(), we.value) {
    const d = Je?.textContent || null, o = le(qe.value, null);
    He.setDocument(we.value, d, o);
  }
  a && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function ir(i) {
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
class qi {
  constructor(e) {
    this.initialized = !1, this.config = ir(e);
  }
  init() {
    this.initialized || (this.initialized = !0, nr(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function fa(i) {
  const e = new qi(i);
  return Q(() => e.init()), e;
}
function sr(i) {
  const e = new qi({
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
  Q(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && Q(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      sr({
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
const rr = "esign.signer.profile.v1", Ii = "esign.signer.profile.outbox.v1", ti = 90, Ei = 500 * 1024;
class ar {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : ti;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${rr}:${e}`;
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
class or {
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
class Yn {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Ii);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [s, c] of Object.entries(t)) {
        if (!c || typeof c != "object")
          continue;
        const l = c;
        if (l.op === "clear") {
          n[s] = {
            op: "clear",
            updatedAt: Number(l.updatedAt) || Date.now()
          };
          continue;
        }
        const a = l.op === "patch" ? l.patch : l;
        n[s] = {
          op: "patch",
          patch: a && typeof a == "object" ? a : {},
          updatedAt: Number(l.updatedAt) || Date.now()
        };
      }
      return n;
    } catch {
      return {};
    }
  }
  outboxSave(e) {
    try {
      window.localStorage.setItem(Ii, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), s = n[e], c = s?.op === "patch" ? s.patch || {} : {};
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
      const [n, s] = await Promise.all([
        this.localStore.load(e),
        this.remoteStore.load(e).catch(() => null)
      ]), c = this.pickLatest(n, s);
      return c && await this.localStore.save(e, c), await this.flushOutboxForKey(e), c;
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
function cr(i) {
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
      ttlDays: Number(i.profile?.ttlDays || ti) || ti,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function lr(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function Kn(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function dr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Ge(i) {
  const e = String(i || "").trim();
  return dr(e) ? "" : e;
}
function ur(i) {
  const e = new ar(i.profile.ttlDays), t = new or(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new Yn("local_only", e, null) : i.profile.mode === "remote_only" ? new Yn("remote_only", e, t) : new Yn("hybrid", e, t);
}
function pr() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function gr(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = cr(i), s = lr(n), c = ur(n);
  pr();
  const l = {
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
      const p = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...u
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
    trackViewerLoad(r, u, p = null) {
      this.metrics.viewerLoadTime = u, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: u,
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
    trackFieldSave(r, u, p, h, y = null) {
      this.metrics.fieldSaveLatencies.push(h), p ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: y }), this.track(p ? "field_save_success" : "field_save_failed", {
        fieldId: r,
        fieldType: u,
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
    trackSignatureAttach(r, u, p, h, y = null) {
      this.metrics.signatureAttachLatencies.push(h), this.track(p ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: r,
        signatureType: u,
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
      return r.length ? Math.round(r.reduce((u, p) => u + p, 0) / r.length) : 0;
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
    l.track("session_end", l.getSessionSummary()), l.flush();
  }), setInterval(() => l.flush(), 3e4);
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
  }, b = {
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
      const u = n.viewer.pages?.find((h) => h.page === r);
      if (u)
        return {
          width: u.width,
          height: u.height,
          rotation: u.rotation || 0
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
      const p = r.page, h = this.getPageMetadata(p), y = u.offsetWidth, S = u.offsetHeight, I = r.pageWidth || h.width, M = r.pageHeight || h.height, H = y / I, Y = S / M;
      let N = r.posX || 0, ce = r.posY || 0;
      n.viewer.origin === "bottom-left" && (ce = M - ce - (r.height || 30));
      const Le = N * H, ke = ce * Y, O = (r.width || 150) * H, te = (r.height || 30) * Y;
      return {
        left: Le,
        top: ke,
        width: O,
        height: te,
        // Store original values for debugging
        _debug: {
          sourceX: N,
          sourceY: ce,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: I,
          pageHeight: M,
          scaleX: H,
          scaleY: Y,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, u) {
      const p = this.pageToScreen(r, u);
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
    async requestUploadBootstrap(r, u, p, h) {
      const y = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: u,
            content_type: p,
            size_bytes: h
          })
        }
      );
      if (!y.ok)
        throw await oe(y, "Failed to get upload contract");
      const S = await y.json(), I = S?.contract || S;
      if (!I || typeof I != "object" || !I.upload_url)
        throw new Error("Invalid upload contract response");
      return I;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, u) {
      const p = new URL(r.upload_url, window.location.origin);
      r.upload_token && p.searchParams.set("upload_token", String(r.upload_token)), r.object_key && p.searchParams.set("object_key", String(r.object_key));
      const h = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([S, I]) => {
        const M = String(S).toLowerCase();
        M === "x-esign-upload-token" || M === "x-esign-upload-key" || (h[S] = String(I));
      });
      const y = await fetch(p.toString(), {
        method: r.method || "PUT",
        headers: h,
        body: u,
        credentials: "omit"
      });
      if (!y.ok)
        throw await oe(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [u, p] = r.split(","), h = u.match(/data:([^;]+)/), y = h ? h[1] : "image/png", S = atob(p), I = new Uint8Array(S.length);
      for (let M = 0; M < S.length; M++)
        I[M] = S.charCodeAt(M);
      return new Blob([I], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, u) {
      const p = this.dataUrlToBlob(u), h = p.size, y = "image/png", S = await We(p), I = await this.requestUploadBootstrap(
        r,
        S,
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
  }, E = {
    endpoint(r, u = "") {
      const p = encodeURIComponent(r), h = u ? `/${encodeURIComponent(u)}` : "";
      return `${n.apiBasePath}/signatures/${p}${h}`;
    },
    async list(r) {
      const u = new URL(this.endpoint(n.token), window.location.origin);
      u.searchParams.set("type", r);
      const p = await fetch(u.toString(), {
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
    async save(r, u, p = "") {
      const h = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: p,
          data_url: u
        })
      });
      if (!h.ok) {
        const S = await h.json().catch(() => ({})), I = new Error(S?.error?.message || "Failed to save signature");
        throw I.code = S?.error?.code || "", I;
      }
      return (await h.json())?.signature || null;
    },
    async delete(r) {
      const u = await fetch(this.endpoint(n.token, r), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!u.ok) {
        const p = await u.json().catch(() => ({}));
        throw new Error(p?.error?.message || "Failed to delete signature");
      }
    }
  };
  function P(r) {
    const u = a.fieldState.get(r);
    return u && u.type === "initials" ? "initials" : "signature";
  }
  function R(r) {
    return a.savedSignaturesByType.get(r) || [];
  }
  async function F(r, u = !1) {
    const p = P(r);
    if (!u && a.savedSignaturesByType.has(p)) {
      B(r);
      return;
    }
    const h = await E.list(p);
    a.savedSignaturesByType.set(p, h), B(r);
  }
  function B(r) {
    const u = P(r), p = R(u), h = document.getElementById("sig-saved-list");
    if (h) {
      if (!p.length) {
        h.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      h.innerHTML = p.map((y) => {
        const S = Ve(String(y?.thumbnail_data_url || y?.data_url || "")), I = Ve(String(y?.label || "Saved signature")), M = Ve(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${S}" alt="${I}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${I}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Ve(r)}" data-signature-id="${M}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Ve(r)}" data-signature-id="${M}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function z(r) {
    const u = a.signatureCanvases.get(r), p = P(r);
    if (!u || !Jt(r))
      throw new Error(`Please add your ${p === "initials" ? "initials" : "signature"} first`);
    const h = u.canvas.toDataURL("image/png"), y = await E.save(p, h, p === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const S = R(p);
    S.unshift(y), a.savedSignaturesByType.set(p, S), B(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function V(r, u) {
    const p = P(r), y = R(p).find((I) => String(I?.id || "") === String(u));
    if (!y) return;
    requestAnimationFrame(() => vt(r)), await de(r);
    const S = String(y.data_url || y.thumbnail_data_url || "").trim();
    S && (await Wt(r, S, { clearStrokes: !0 }), Ze("draw", r), ie("Saved signature selected."));
  }
  async function X(r, u) {
    const p = P(r);
    await E.delete(u);
    const h = R(p).filter((y) => String(y?.id || "") !== String(u));
    a.savedSignaturesByType.set(p, h), B(r);
  }
  function ee(r) {
    const u = String(r?.code || "").trim(), p = String(r?.message || "Unable to update saved signatures"), h = u === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : p;
    window.toastManager && window.toastManager.error(h), ie(h, "assertive");
  }
  async function de(r, u = 8) {
    for (let p = 0; p < u; p++) {
      if (a.signatureCanvases.has(r)) return !0;
      await new Promise((h) => setTimeout(h, 40)), vt(r);
    }
    return !1;
  }
  async function ge(r, u) {
    const p = String(u?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(p))
      throw new Error("Only PNG and JPEG images are supported");
    if (u.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => vt(r)), await de(r);
    const h = a.signatureCanvases.get(r);
    if (!h)
      throw new Error("Signature canvas is not ready");
    const y = await Ie(u), S = p === "image/png" ? y : await Re(y, h.drawWidth, h.drawHeight);
    if (ut(S) > Ei)
      throw new Error(`Image exceeds ${Math.round(Ei / 1024)}KB limit after conversion`);
    await Wt(r, S, { clearStrokes: !0 });
    const M = document.getElementById("sig-upload-preview-wrap"), H = document.getElementById("sig-upload-preview");
    M && M.classList.remove("hidden"), H && H.setAttribute("src", S), ie("Signature image uploaded. You can now insert it.");
  }
  function Ie(r) {
    return new Promise((u, p) => {
      const h = new FileReader();
      h.onload = () => u(String(h.result || "")), h.onerror = () => p(new Error("Unable to read image file")), h.readAsDataURL(r);
    });
  }
  function ut(r) {
    const u = String(r || "").split(",");
    if (u.length < 2) return 0;
    const p = u[1] || "", h = (p.match(/=+$/) || [""])[0].length;
    return Math.floor(p.length * 3 / 4) - h;
  }
  async function Re(r, u, p) {
    return await new Promise((h, y) => {
      const S = new Image();
      S.onload = () => {
        const I = document.createElement("canvas"), M = Math.max(1, Math.round(Number(u) || 600)), H = Math.max(1, Math.round(Number(p) || 160));
        I.width = M, I.height = H;
        const Y = I.getContext("2d");
        if (!Y) {
          y(new Error("Unable to process image"));
          return;
        }
        Y.clearRect(0, 0, M, H);
        const N = Math.min(M / S.width, H / S.height), ce = S.width * N, Le = S.height * N, ke = (M - ce) / 2, O = (H - Le) / 2;
        Y.drawImage(S, ke, O, ce, Le), h(I.toDataURL("image/png"));
      }, S.onerror = () => y(new Error("Unable to decode image file")), S.src = r;
    });
  }
  async function We(r) {
    if (window.crypto && window.crypto.subtle) {
      const u = await r.arrayBuffer(), p = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(p)).map((h) => h.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function it() {
    document.addEventListener("click", (r) => {
      const u = r.target;
      if (!(u instanceof Element)) return;
      const p = u.closest("[data-esign-action]");
      if (!p) return;
      switch (p.getAttribute("data-esign-action")) {
        case "prev-page":
          dn();
          break;
        case "next-page":
          Ke();
          break;
        case "zoom-out":
          Mn();
          break;
        case "zoom-in":
          kt();
          break;
        case "fit-width":
          Xe();
          break;
        case "download-document":
          vn();
          break;
        case "show-consent-modal":
          Ft();
          break;
        case "activate-field": {
          const y = p.getAttribute("data-field-id");
          y && ft(y);
          break;
        }
        case "submit-signature":
          et();
          break;
        case "show-decline-modal":
          tt();
          break;
        case "close-field-editor":
          Mt();
          break;
        case "save-field-editor":
          mn();
          break;
        case "hide-consent-modal":
          Qt();
          break;
        case "accept-consent":
          qn();
          break;
        case "hide-decline-modal":
          be();
          break;
        case "confirm-decline":
          Rt();
          break;
        case "retry-load-pdf":
          gt();
          break;
        case "signature-tab": {
          const y = p.getAttribute("data-tab") || "draw", S = p.getAttribute("data-field-id");
          S && Ze(y, S);
          break;
        }
        case "clear-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Fn(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Ee(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = p.getAttribute("data-field-id");
          y && Bn(y);
          break;
        }
        case "save-current-signature-library": {
          const y = p.getAttribute("data-field-id");
          y && z(y).catch(ee);
          break;
        }
        case "select-saved-signature": {
          const y = p.getAttribute("data-field-id"), S = p.getAttribute("data-signature-id");
          y && S && V(y, S).catch(ee);
          break;
        }
        case "delete-saved-signature": {
          const y = p.getAttribute("data-field-id"), S = p.getAttribute("data-signature-id");
          y && S && X(y, S).catch(ee);
          break;
        }
        case "clear-signer-profile":
          Je().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          $e.togglePanel();
          break;
        case "debug-copy-session":
          $e.copySessionInfo();
          break;
        case "debug-clear-cache":
          $e.clearCache();
          break;
        case "debug-show-telemetry":
          $e.showTelemetry();
          break;
        case "debug-reload-viewer":
          $e.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const u = r.target;
      if (!(u instanceof HTMLInputElement) || !u.matches("#sig-upload-input")) return;
      const p = u.getAttribute("data-field-id"), h = u.files?.[0];
      !p || !h || ge(p, h).catch((y) => {
        window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
      });
    }), document.addEventListener("input", (r) => {
      const u = r.target;
      if (!(u instanceof HTMLInputElement) || !u.matches("#sig-type-input")) return;
      const p = u.getAttribute("data-field-id") || a.activeFieldId;
      p && Gt(p, u.value || "");
    });
  }
  Q(async () => {
    it(), a.isLowMemory = Ct(), Tn(), It(), await Et(), we(), qe(), Kt(), je(), await gt(), mt(), document.addEventListener("visibilitychange", J), "memory" in navigator && _e(), $e.init();
  });
  function J() {
    document.hidden && me();
  }
  function me() {
    const r = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > r; ) {
      let u = null, p = 1 / 0;
      if (a.renderedPages.forEach((h, y) => {
        y !== a.currentPage && h.timestamp < p && (u = y, p = h.timestamp);
      }), u !== null)
        a.renderedPages.delete(u);
      else
        break;
    }
  }
  function _e() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, u = navigator.memory.totalJSHeapSize;
        r / u > 0.8 && (a.isLowMemory = !0, me());
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
  function Tn() {
    const r = document.getElementById("pdf-compatibility-banner"), u = document.getElementById("pdf-compatibility-message"), p = document.getElementById("pdf-compatibility-title");
    if (!r || !u || !p) return;
    const h = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (h !== "limited") {
      r.classList.add("hidden");
      return;
    }
    p.textContent = "Preview Compatibility Notice", u.textContent = String(n.viewer.compatibilityMessage || "").trim() || He(y), r.classList.remove("hidden"), l.trackDegradedMode("pdf_preview_compatibility", { tier: h, reason: y });
  }
  function It() {
    const r = document.getElementById("stage-state-banner"), u = document.getElementById("stage-state-icon"), p = document.getElementById("stage-state-title"), h = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !u || !p || !h || !y) return;
    const S = n.signerState || "active", I = n.recipientStage || 1, M = n.activeStage || 1, H = n.activeRecipientIds || [], Y = n.waitingForRecipientIds || [];
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
    switch (S) {
      case "waiting":
        N = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: I > M ? `You are in signing stage ${I}. Stage ${M} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, Y.length > 0 && N.badges.push({
          icon: "iconoir-group",
          text: `${Y.length} signer(s) ahead`,
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
        H.length > 1 ? (N.message = `You and ${H.length - 1} other signer(s) can sign now.`, N.badges = [
          { icon: "iconoir-users", text: `Stage ${M} active`, variant: "green" }
        ]) : I > 1 ? N.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${I}`, variant: "green" }
        ] : N.hidden = !0;
        break;
    }
    if (N.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${N.bgClass} ${N.borderClass}`, u.className = `${N.iconClass} mt-0.5`, p.className = `text-sm font-semibold ${N.titleClass}`, p.textContent = N.title, h.className = `text-xs ${N.messageClass} mt-1`, h.textContent = N.message, y.innerHTML = "", N.badges.forEach((ce) => {
      const Le = document.createElement("span"), ke = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      Le.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ke[ce.variant] || ke.blue}`, Le.innerHTML = `<i class="${ce.icon} mr-1"></i>${ce.text}`, y.appendChild(Le);
    });
  }
  function we() {
    n.fields.forEach((r) => {
      let u = null, p = !1;
      if (r.type === "checkbox")
        u = r.value_bool || !1, p = u;
      else if (r.type === "date_signed")
        u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], p = !0;
      else {
        const h = String(r.value_text || "");
        u = h || Lt(r), p = !!h;
      }
      a.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: u,
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
  async function Et() {
    try {
      const r = await c.load(a.profileKey);
      r && (a.profileData = r, a.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function Lt(r) {
    const u = a.profileData;
    if (!u) return "";
    const p = String(r?.type || "").trim();
    return p === "name" ? Ge(u.fullName || "") : p === "initials" ? Ge(u.initials || "") || Kn(u.fullName || n.recipientName || "") : p === "signature" ? Ge(u.typedSignature || "") : "";
  }
  function Me(r) {
    return !n.profile.persistDrawnSignature || !a.profileData ? "" : r?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function st(r) {
    const u = Ge(r?.value || "");
    return u || (a.profileData ? r?.type === "initials" ? Ge(a.profileData.initials || "") || Kn(a.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? Ge(a.profileData.typedSignature || "") : "" : "");
  }
  function Ot() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : a.profileRemember;
  }
  async function Je(r = !1) {
    let u = null;
    try {
      await c.clear(a.profileKey);
    } catch (p) {
      u = p;
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
  async function Ye(r, u = {}) {
    const p = Ot();
    if (a.profileRemember = p, !p) {
      await Je(!0);
      return;
    }
    if (!r) return;
    const h = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const S = Ge(r.value);
      S && (h.fullName = S, (a.profileData?.initials || "").trim() || (h.initials = Kn(S)));
    }
    if (y === "initials") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        h.drawnInitialsDataUrl = u.signatureDataUrl;
      else if (typeof r.value == "string") {
        const S = Ge(r.value);
        S && (h.initials = S);
      }
    }
    if (y === "signature") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        h.drawnSignatureDataUrl = u.signatureDataUrl;
      else if (typeof r.value == "string") {
        const S = Ge(r.value);
        S && (h.typedSignature = S);
      }
    }
    if (!(Object.keys(h).length === 1 && h.remember === !0))
      try {
        const S = await c.save(a.profileKey, h);
        a.profileData = S;
      } catch {
      }
  }
  function qe() {
    const r = document.getElementById("consent-checkbox"), u = document.getElementById("consent-accept-btn");
    r && u && r.addEventListener("change", function() {
      u.disabled = !this.checked;
    });
  }
  function Ct() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function pt() {
    const r = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= r) return;
    const u = [];
    for (a.renderedPages.forEach((p, h) => {
      const y = Math.abs(h - a.currentPage);
      u.push({ pageNum: h, distance: y });
    }), u.sort((p, h) => h.distance - p.distance); a.renderedPages.size > r && u.length > 0; ) {
      const p = u.shift();
      p && p.pageNum !== a.currentPage && a.renderedPages.delete(p.pageNum);
    }
  }
  function cn(r) {
    if (a.isLowMemory) return;
    const u = [];
    r > 1 && u.push(r - 1), r < n.pageCount && u.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      u.forEach(async (p) => {
        !a.renderedPages.has(p) && !a.pageRendering && await _n(p);
      });
    }, { timeout: 2e3 });
  }
  async function _n(r) {
    if (!(!a.pdfDoc || a.renderedPages.has(r)))
      try {
        const u = await a.pdfDoc.getPage(r), p = a.zoomLevel, h = u.getViewport({ scale: p * window.devicePixelRatio }), y = document.createElement("canvas"), S = y.getContext("2d");
        y.width = h.width, y.height = h.height;
        const I = {
          canvasContext: S,
          viewport: h
        };
        await u.render(I).promise, a.renderedPages.set(r, {
          canvas: y,
          scale: p,
          timestamp: Date.now()
        }), pt();
      } catch (u) {
        console.warn("Preload failed for page", r, u);
      }
  }
  function ln() {
    const r = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function gt() {
    const r = document.getElementById("pdf-loading"), u = Date.now();
    try {
      const p = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!p.ok)
        throw new Error("Failed to load document");
      const y = (await p.json()).assets || {}, S = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!S)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const I = pdfjsLib.getDocument(S);
      a.pdfDoc = await I.promise, n.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await Pt(1), At(), l.trackViewerLoad(!0, Date.now() - u), l.trackPageView(1);
    } catch (p) {
      console.error("PDF load error:", p), l.trackViewerLoad(!1, Date.now() - u, p.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Ue();
    }
  }
  async function Pt(r) {
    if (!a.pdfDoc) return;
    const u = a.renderedPages.get(r);
    if (u && u.scale === a.zoomLevel) {
      ue(u), a.currentPage = r, document.getElementById("current-page").textContent = r, mt(), cn(r);
      return;
    }
    a.pageRendering = !0;
    try {
      const p = await a.pdfDoc.getPage(r), h = a.zoomLevel, y = ln(), S = p.getViewport({ scale: h * y }), I = p.getViewport({ scale: 1 });
      b.setPageViewport(r, {
        width: I.width,
        height: I.height,
        rotation: I.rotation || 0
      });
      const M = document.getElementById("pdf-page-1");
      M.innerHTML = "";
      const H = document.createElement("canvas"), Y = H.getContext("2d");
      H.height = S.height, H.width = S.width, H.style.width = `${S.width / y}px`, H.style.height = `${S.height / y}px`, M.appendChild(H);
      const N = document.getElementById("pdf-container");
      N.style.width = `${S.width / y}px`;
      const ce = {
        canvasContext: Y,
        viewport: S
      };
      await p.render(ce).promise, a.renderedPages.set(r, {
        canvas: H.cloneNode(!0),
        scale: h,
        timestamp: Date.now(),
        displayWidth: S.width / y,
        displayHeight: S.height / y
      }), a.renderedPages.get(r).canvas.getContext("2d").drawImage(H, 0, 0), pt(), a.currentPage = r, document.getElementById("current-page").textContent = r, mt(), l.trackPageView(r), cn(r);
    } catch (p) {
      console.error("Page render error:", p);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const p = a.pageNumPending;
        a.pageNumPending = null, await Pt(p);
      }
    }
  }
  function ue(r, u) {
    const p = document.getElementById("pdf-page-1");
    p.innerHTML = "";
    const h = document.createElement("canvas");
    h.width = r.canvas.width, h.height = r.canvas.height, h.style.width = `${r.displayWidth}px`, h.style.height = `${r.displayHeight}px`, h.getContext("2d").drawImage(r.canvas, 0, 0), p.appendChild(h);
    const S = document.getElementById("pdf-container");
    S.style.width = `${r.displayWidth}px`;
  }
  function rt(r) {
    a.pageRendering ? a.pageNumPending = r : Pt(r);
  }
  function mt() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const u = document.getElementById("pdf-container");
    a.fieldState.forEach((p, h) => {
      if (p.page !== a.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = h, p.required && y.classList.add("required"), p.completed && y.classList.add("completed"), a.activeFieldId === h && y.classList.add("active"), p.posX != null && p.posY != null && p.width != null && p.height != null) {
        const M = b.getOverlayStyles(p, u);
        y.style.left = M.left, y.style.top = M.top, y.style.width = M.width, y.style.height = M.height, y.style.transform = M.transform, $e.enabled && (y.dataset.debugCoords = JSON.stringify(
          b.pageToScreen(p, u)._debug
        ));
      } else {
        const M = Array.from(a.fieldState.keys()).indexOf(h);
        y.style.left = "10px", y.style.top = `${100 + M * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const I = document.createElement("span");
      I.className = "field-overlay-label", I.textContent = Vt(p.type), y.appendChild(I), y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${Vt(p.type)} field${p.required ? ", required" : ""}${p.completed ? ", completed" : ""}`), y.addEventListener("click", () => ft(h)), y.addEventListener("keydown", (M) => {
        (M.key === "Enter" || M.key === " ") && (M.preventDefault(), ft(h));
      }), r.appendChild(y);
    });
  }
  function Vt(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function dn() {
    a.currentPage <= 1 || (rt(a.currentPage - 1), At());
  }
  function Ke() {
    a.currentPage >= n.pageCount || (rt(a.currentPage + 1), At());
  }
  function ht(r) {
    r < 1 || r > n.pageCount || (rt(r), At());
  }
  function At() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= n.pageCount;
  }
  function kt() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), Tt(), rt(a.currentPage);
  }
  function Mn() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), Tt(), rt(a.currentPage);
  }
  function Xe() {
    const u = document.getElementById("viewer-content").offsetWidth - 32, p = 612;
    a.zoomLevel = u / p, Tt(), rt(a.currentPage);
  }
  function Tt() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function ft(r) {
    if (!a.hasConsented && n.fields.some((u) => u.id === r && u.type !== "date_signed")) {
      Ft();
      return;
    }
    U(r, { openEditor: !0 });
  }
  function U(r, u = { openEditor: !0 }) {
    const p = a.fieldState.get(r);
    if (p) {
      if (u.openEditor && (a.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((h) => h.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((h) => h.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), p.page !== a.currentPage && ht(p.page), !u.openEditor) {
        _t(r);
        return;
      }
      p.type !== "date_signed" && Qe(r);
    }
  }
  function _t(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Qe(r) {
    const u = a.fieldState.get(r);
    if (!u) return;
    const p = document.getElementById("field-editor-overlay"), h = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), S = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = un(u.type), h.innerHTML = $n(u), S?.classList.toggle("hidden", !(u.type === "signature" || u.type === "initials")), (u.type === "signature" || u.type === "initials") && Ae(r), p.classList.add("active"), p.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Zt(p.querySelector(".field-editor")), ie(`Editing ${un(u.type)}. Press Escape to cancel.`), setTimeout(() => {
      const I = h.querySelector("input, textarea");
      I ? I.focus() : h.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), De(a.writeCooldownUntil) > 0 && gn(De(a.writeCooldownUntil));
  }
  function un(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function $n(r) {
    const u = Dn(r.type), p = Ve(String(r?.id || "")), h = Ve(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", S = Ve(st(r)), I = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], M = yt(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${I.map((H) => `
            <button
              type="button"
              id="sig-tab-${H.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${M === H.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${H.id}"
              data-esign-action="signature-tab"
              data-field-id="${p}"
              role="tab"
              aria-selected="${M === H.id ? "true" : "false"}"
              aria-controls="sig-editor-${H.id}"
              tabindex="${M === H.id ? "0" : "-1"}"
            >
              ${H.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${M === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${y}"
              value="${S}"
              data-field-id="${p}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${p}">${S}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${y} will appear as your ${h}</p>
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
                <i class="iconoir-eraser" aria-hidden="true"></i>
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
          value="${Ve(String(r.value || ""))}"
          data-field-id="${p}"
        />
        ${u}
      `;
    if (r.type === "text") {
      const y = Ve(String(r.value || ""));
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
  function Dn(r) {
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
  function Gt(r, u) {
    const p = document.getElementById("sig-type-preview"), h = a.fieldState.get(r);
    if (!p || !h) return;
    const y = Ge(String(u || "").trim());
    if (y) {
      p.textContent = y;
      return;
    }
    p.textContent = h.type === "initials" ? "Type your initials" : "Type your signature";
  }
  function yt(r) {
    const u = String(a.signatureTabByField.get(r) || "").trim();
    return u === "draw" || u === "type" || u === "upload" || u === "saved" ? u : "draw";
  }
  function Ze(r, u) {
    const p = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    a.signatureTabByField.set(u, p), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const h = document.querySelector(`.sig-editor-tab[data-tab="${p}"]`);
    if (h?.classList.add("border-blue-600", "text-blue-600"), h?.classList.remove("border-transparent", "text-gray-500"), h?.setAttribute("aria-selected", "true"), h?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", p !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", p !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", p !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", p !== "saved"), (p === "draw" || p === "upload" || p === "saved") && h && requestAnimationFrame(() => vt(u)), p === "type") {
      const y = document.getElementById("sig-type-input");
      Gt(u, y?.value || "");
    }
    p === "saved" && F(u).catch(ee);
  }
  function Ae(r) {
    a.signatureTabByField.set(r, "draw"), Ze("draw", r);
    const u = document.getElementById("sig-type-input");
    u && Gt(r, u.value || "");
  }
  function vt(r) {
    const u = document.getElementById("sig-draw-canvas");
    if (!u || a.signatureCanvases.has(r)) return;
    const p = u.closest(".signature-canvas-container"), h = u.getContext("2d");
    if (!h) return;
    const y = u.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const S = window.devicePixelRatio || 1;
    u.width = y.width * S, u.height = y.height * S, h.scale(S, S), h.lineCap = "round", h.lineJoin = "round", h.strokeStyle = "#1f2937", h.lineWidth = 2.5;
    let I = !1, M = 0, H = 0, Y = [];
    const N = (O) => {
      const te = u.getBoundingClientRect();
      let ze, Be;
      return O.touches && O.touches.length > 0 ? (ze = O.touches[0].clientX, Be = O.touches[0].clientY) : O.changedTouches && O.changedTouches.length > 0 ? (ze = O.changedTouches[0].clientX, Be = O.changedTouches[0].clientY) : (ze = O.clientX, Be = O.clientY), {
        x: ze - te.left,
        y: Be - te.top,
        timestamp: Date.now()
      };
    }, ce = (O) => {
      I = !0;
      const te = N(O);
      M = te.x, H = te.y, Y = [{ x: te.x, y: te.y, t: te.timestamp, width: 2.5 }], p && p.classList.add("drawing");
    }, Le = (O) => {
      if (!I) return;
      const te = N(O);
      Y.push({ x: te.x, y: te.y, t: te.timestamp, width: 2.5 });
      const ze = te.x - M, Be = te.y - H, Nn = te.timestamp - (Y[Y.length - 2]?.t || te.timestamp), bt = Math.sqrt(ze * ze + Be * Be) / Math.max(Nn, 1), ci = 2.5, A = 1.5, at = 4, Nt = Math.min(bt / 5, 1), wn = Math.max(A, Math.min(at, ci - Nt * 1.5));
      Y[Y.length - 1].width = wn, h.lineWidth = wn, h.beginPath(), h.moveTo(M, H), h.lineTo(te.x, te.y), h.stroke(), M = te.x, H = te.y;
    }, ke = () => {
      if (I = !1, Y.length > 1) {
        const O = a.signatureCanvases.get(r);
        O && (O.strokes.push(Y.map((te) => ({ ...te }))), O.redoStack = []);
      }
      Y = [], p && p.classList.remove("drawing");
    };
    u.addEventListener("mousedown", ce), u.addEventListener("mousemove", Le), u.addEventListener("mouseup", ke), u.addEventListener("mouseout", ke), u.addEventListener("touchstart", (O) => {
      O.preventDefault(), O.stopPropagation(), ce(O);
    }, { passive: !1 }), u.addEventListener("touchmove", (O) => {
      O.preventDefault(), O.stopPropagation(), Le(O);
    }, { passive: !1 }), u.addEventListener("touchend", (O) => {
      O.preventDefault(), ke();
    }, { passive: !1 }), u.addEventListener("touchcancel", ke), u.addEventListener("gesturestart", (O) => O.preventDefault()), u.addEventListener("gesturechange", (O) => O.preventDefault()), u.addEventListener("gestureend", (O) => O.preventDefault()), a.signatureCanvases.set(r, {
      canvas: u,
      ctx: h,
      dpr: S,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), pn(r);
  }
  function pn(r) {
    const u = a.signatureCanvases.get(r), p = a.fieldState.get(r);
    if (!u || !p) return;
    const h = Me(p);
    h && Wt(r, h, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function Wt(r, u, p = { clearStrokes: !1 }) {
    const h = a.signatureCanvases.get(r);
    if (!h) return !1;
    const y = String(u || "").trim();
    if (!y)
      return h.baseImageDataUrl = "", h.baseImage = null, p.clearStrokes && (h.strokes = [], h.redoStack = []), Ne(r), !0;
    const { drawWidth: S, drawHeight: I } = h, M = new Image();
    return await new Promise((H) => {
      M.onload = () => {
        p.clearStrokes && (h.strokes = [], h.redoStack = []), h.baseImage = M, h.baseImageDataUrl = y, S > 0 && I > 0 && Ne(r), H(!0);
      }, M.onerror = () => H(!1), M.src = y;
    });
  }
  function Ne(r) {
    const u = a.signatureCanvases.get(r);
    if (!u) return;
    const { ctx: p, drawWidth: h, drawHeight: y, baseImage: S, strokes: I } = u;
    if (p.clearRect(0, 0, h, y), S) {
      const M = Math.min(h / S.width, y / S.height), H = S.width * M, Y = S.height * M, N = (h - H) / 2, ce = (y - Y) / 2;
      p.drawImage(S, N, ce, H, Y);
    }
    for (const M of I)
      for (let H = 1; H < M.length; H++) {
        const Y = M[H - 1], N = M[H];
        p.lineWidth = Number(N.width || 2.5) || 2.5, p.beginPath(), p.moveTo(Y.x, Y.y), p.lineTo(N.x, N.y), p.stroke();
      }
  }
  function Ee(r) {
    const u = a.signatureCanvases.get(r);
    if (!u || u.strokes.length === 0) return;
    const p = u.strokes.pop();
    p && u.redoStack.push(p), Ne(r);
  }
  function Bn(r) {
    const u = a.signatureCanvases.get(r);
    if (!u || u.redoStack.length === 0) return;
    const p = u.redoStack.pop();
    p && u.strokes.push(p), Ne(r);
  }
  function Jt(r) {
    const u = a.signatureCanvases.get(r);
    if (!u) return !1;
    if ((u.baseImageDataUrl || "").trim() || u.strokes.length > 0) return !0;
    const { canvas: p, ctx: h } = u;
    return h.getImageData(0, 0, p.width, p.height).data.some((S, I) => I % 4 === 3 && S > 0);
  }
  function Fn(r) {
    const u = a.signatureCanvases.get(r);
    u && (u.strokes = [], u.redoStack = [], u.baseImage = null, u.baseImageDataUrl = "", Ne(r));
    const p = document.getElementById("sig-upload-preview-wrap"), h = document.getElementById("sig-upload-preview");
    p && p.classList.add("hidden"), h && h.removeAttribute("src");
  }
  function Mt() {
    const r = document.getElementById("field-editor-overlay"), u = r.querySelector(".field-editor");
    if (Ht(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const p = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        p?.focus();
      });
    }
    a.activeFieldId = null, a.signatureCanvases.clear(), ie("Field editor closed.");
  }
  function De(r) {
    const u = Number(r) || 0;
    return u <= 0 ? 0 : Math.max(0, Math.ceil((u - Date.now()) / 1e3));
  }
  function $t(r, u = {}) {
    const p = Number(u.retry_after_seconds);
    if (Number.isFinite(p) && p > 0)
      return Math.ceil(p);
    const h = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!h) return 0;
    const y = Number(h);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function oe(r, u) {
    let p = {};
    try {
      p = await r.json();
    } catch {
      p = {};
    }
    const h = p?.error || {}, y = h?.details && typeof h.details == "object" ? h.details : {}, S = $t(r, y), I = r?.status === 429, M = I ? S > 0 ? `Too many actions too quickly. Please wait ${S}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(h?.message || u || "Request failed"), H = new Error(M);
    return H.status = r?.status || 0, H.code = String(h?.code || ""), H.details = y, H.rateLimited = I, H.retryAfterSeconds = S, H;
  }
  function gn(r) {
    const u = Math.max(1, Number(r) || 1);
    a.writeCooldownUntil = Date.now() + u * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const p = () => {
      const h = document.getElementById("field-editor-save");
      if (!h) return;
      const y = De(a.writeCooldownUntil);
      if (y <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (h.disabled = !1, h.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      h.disabled = !0, h.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    p(), a.writeCooldownTimer = setInterval(p, 250);
  }
  function Yt(r) {
    const u = Math.max(1, Number(r) || 1);
    a.submitCooldownUntil = Date.now() + u * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const p = () => {
      const h = De(a.submitCooldownUntil);
      je(), h <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    p(), a.submitCooldownTimer = setInterval(p, 250);
  }
  async function mn() {
    const r = a.activeFieldId;
    if (!r) return;
    const u = a.fieldState.get(r);
    if (!u) return;
    const p = De(a.writeCooldownUntil);
    if (p > 0) {
      const y = `Please wait ${p}s before saving again.`;
      window.toastManager && window.toastManager.error(y), ie(y, "assertive");
      return;
    }
    const h = document.getElementById("field-editor-save");
    h.disabled = !0, h.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = Ot();
      let y = !1;
      if (u.type === "signature" || u.type === "initials")
        y = await Rn(r);
      else if (u.type === "checkbox") {
        const S = document.getElementById("field-checkbox-input");
        y = await Dt(r, null, S?.checked || !1);
      } else {
        const I = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!I && u.required)
          throw new Error("This field is required");
        y = await Dt(r, I, null);
      }
      if (y) {
        Mt(), Kt(), je(), en(), mt(), Xt(r), yn(r);
        const S = wt();
        S.allRequiredComplete ? ie("Field saved. All required fields complete. Ready to submit.") : ie(`Field saved. ${S.remainingRequired} required field${S.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && gn(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), ie(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (De(a.writeCooldownUntil) > 0) {
        const y = De(a.writeCooldownUntil);
        h.disabled = !0, h.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        h.disabled = !1, h.innerHTML = "Insert";
    }
  }
  async function Rn(r) {
    const u = a.fieldState.get(r), p = document.getElementById("sig-type-input"), h = yt(r);
    if (h === "draw" || h === "upload" || h === "saved") {
      const S = a.signatureCanvases.get(r);
      if (!S) return !1;
      if (!Jt(r))
        throw new Error(u?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const I = S.canvas.toDataURL("image/png");
      return await he(r, { type: "drawn", dataUrl: I }, u?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const S = p?.value?.trim();
      if (!S)
        throw new Error(u?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return u.type === "initials" ? await Dt(r, S, null) : await he(r, { type: "typed", text: S }, S);
    }
  }
  async function Dt(r, u, p) {
    a.pendingSaves.add(r);
    const h = Date.now(), y = a.fieldState.get(r);
    try {
      const S = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: u,
          value_bool: p
        })
      });
      if (!S.ok)
        throw await oe(S, "Failed to save field");
      const I = a.fieldState.get(r);
      return I && (I.value = u ?? p, I.completed = !0, I.hasError = !1), await Ye(I), window.toastManager && window.toastManager.success("Field saved"), l.trackFieldSave(r, I?.type, !0, Date.now() - h), !0;
    } catch (S) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = S.message), l.trackFieldSave(r, y?.type, !1, Date.now() - h, S.message), S;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function he(r, u, p) {
    a.pendingSaves.add(r);
    const h = Date.now(), y = u?.type || "typed";
    try {
      let S;
      if (y === "drawn") {
        const H = await v.uploadDrawnSignature(
          r,
          u.dataUrl
        );
        S = {
          field_instance_id: r,
          type: "drawn",
          value_text: p,
          object_key: H.objectKey,
          sha256: H.sha256,
          upload_token: H.uploadToken
        };
      } else
        S = await hn(r, p);
      const I = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(S)
      });
      if (!I.ok)
        throw await oe(I, "Failed to save signature");
      const M = a.fieldState.get(r);
      return M && (M.value = p, M.completed = !0, M.hasError = !1), await Ye(M, {
        signatureType: y,
        signatureDataUrl: u?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), l.trackSignatureAttach(r, y, !0, Date.now() - h), !0;
    } catch (S) {
      const I = a.fieldState.get(r);
      throw I && (I.hasError = !0, I.lastError = S.message), l.trackSignatureAttach(r, y, !1, Date.now() - h, S.message), S;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function hn(r, u) {
    const p = `${u}|${r}`, h = await Hn(p), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: u,
      object_key: y,
      sha256: h
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Hn(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const u = new TextEncoder().encode(r), p = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(p)).map((h) => h.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Kt() {
    let r = 0;
    a.fieldState.forEach((M) => {
      M.required, M.completed && r++;
    });
    const u = a.fieldState.size, p = u > 0 ? r / u * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = u;
    const h = document.getElementById("progress-ring-circle"), y = 97.4, S = y - p / 100 * y;
    h.style.strokeDashoffset = S, document.getElementById("mobile-progress").style.width = `${p}%`;
    const I = u - r;
    document.getElementById("fields-status").textContent = I > 0 ? `${I} remaining` : "All complete";
  }
  function je() {
    const r = document.getElementById("submit-btn"), u = document.getElementById("incomplete-warning"), p = document.getElementById("incomplete-message"), h = De(a.submitCooldownUntil);
    let y = [], S = !1;
    a.fieldState.forEach((M, H) => {
      M.required && !M.completed && y.push(M), M.hasError && (S = !0);
    });
    const I = a.hasConsented && y.length === 0 && !S && a.pendingSaves.size === 0 && h === 0 && !a.isSubmitting;
    r.disabled = !I, !a.isSubmitting && h > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${h}s` : !a.isSubmitting && h === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? h > 0 ? (u.classList.remove("hidden"), p.textContent = `Please wait ${h}s before submitting again.`) : S ? (u.classList.remove("hidden"), p.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (u.classList.remove("hidden"), p.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : u.classList.add("hidden") : (u.classList.remove("hidden"), p.textContent = "Please accept the consent agreement");
  }
  function Xt(r) {
    const u = a.fieldState.get(r), p = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!p || !u)) {
      if (u.completed) {
        p.classList.add("completed"), p.classList.remove("error");
        const h = p.querySelector(".w-8");
        h.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), h.classList.add("bg-green-100", "text-green-600"), h.innerHTML = '<i class="iconoir-check"></i>';
      } else if (u.hasError) {
        p.classList.remove("completed"), p.classList.add("error");
        const h = p.querySelector(".w-8");
        h.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), h.classList.add("bg-red-100", "text-red-600"), h.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function Bt() {
    const r = Array.from(a.fieldState.values()).filter((u) => u.required);
    return r.sort((u, p) => {
      const h = Number(u.page || 0), y = Number(p.page || 0);
      if (h !== y) return h - y;
      const S = Number(u.tabIndex || 0), I = Number(p.tabIndex || 0);
      if (S > 0 && I > 0 && S !== I) return S - I;
      if (S > 0 != I > 0) return S > 0 ? -1 : 1;
      const M = Number(u.posY || 0), H = Number(p.posY || 0);
      if (M !== H) return M - H;
      const Y = Number(u.posX || 0), N = Number(p.posX || 0);
      return Y !== N ? Y - N : String(u.id || "").localeCompare(String(p.id || ""));
    }), r;
  }
  function fn(r) {
    a.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function yn(r) {
    const u = Bt(), p = u.filter((I) => !I.completed);
    if (p.length === 0) {
      l.track("guided_next_none_remaining", { fromFieldId: r });
      const I = document.getElementById("submit-btn");
      I?.scrollIntoView({ behavior: "smooth", block: "nearest" }), I?.focus(), ie("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const h = u.findIndex((I) => String(I.id) === String(r));
    let y = null;
    if (h >= 0) {
      for (let I = h + 1; I < u.length; I++)
        if (!u[I].completed) {
          y = u[I];
          break;
        }
    }
    if (y || (y = p[0]), !y) return;
    l.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const S = Number(y.page || 1);
    S !== a.currentPage && ht(S), U(y.id, { openEditor: !1 }), fn(y.id), setTimeout(() => {
      fn(y.id), _t(y.id), l.track("guided_next_completed", { toFieldId: y.id, page: y.page }), ie(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function Ft() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Zt(r.querySelector(".field-editor")), ie("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Qt() {
    const r = document.getElementById("consent-modal"), u = r.querySelector(".field-editor");
    Ht(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ie("Consent dialog closed.");
  }
  async function qn() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const u = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!u.ok)
        throw await oe(u, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Qt(), je(), en(), l.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ie("Consent accepted. You can now complete the fields and submit.");
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message), ie(`Error: ${u.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function et() {
    const r = document.getElementById("submit-btn"), u = De(a.submitCooldownUntil);
    if (u > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${u}s before submitting again.`), je();
      return;
    }
    a.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const p = `submit-${n.recipientId}-${Date.now()}`, h = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": p }
      });
      if (!h.ok)
        throw await oe(h, "Failed to submit");
      l.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (p) {
      l.trackSubmit(!1, p.message), p?.rateLimited && Yt(p.retryAfterSeconds), window.toastManager && window.toastManager.error(p.message);
    } finally {
      a.isSubmitting = !1, je();
    }
  }
  function tt() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Zt(r.querySelector(".field-editor")), ie("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function be() {
    const r = document.getElementById("decline-modal"), u = r.querySelector(".field-editor");
    Ht(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ie("Decline dialog closed.");
  }
  async function Rt() {
    const r = document.getElementById("decline-reason").value;
    try {
      const u = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!u.ok)
        throw await oe(u, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message);
    }
  }
  function Ue() {
    l.trackDegradedMode("viewer_load_failure"), l.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function vn() {
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
  const $e = {
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
            <div class="debug-value" id="debug-session-id">${l.sessionId}</div>
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
      r?.forEach((h) => {
        h.completed && u++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${u}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
      const p = l.metrics.errorsEncountered;
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
          fields: Array.from(a.fieldState?.entries() || []).map(([r, u]) => ({
            id: r,
            type: u.type,
            completed: u.completed,
            hasError: u.hasError
          })),
          telemetry: l.getSessionSummary(),
          errors: l.metrics.errorsEncountered
        }),
        getEvents: () => l.events,
        forceError: (r) => {
          l.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), gt();
        },
        setLowMemory: (r) => {
          a.isLowMemory = r, pt(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", l.sessionId), console.log("Fields:", a.fieldState?.size || 0), console.log("Low Memory:", a.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), gt(), this.updatePanel();
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
      console.table(l.events), console.log("Session Summary:", l.getSessionSummary());
    }
  };
  function ie(r, u = "polite") {
    const p = u === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    p && (p.textContent = "", requestAnimationFrame(() => {
      p.textContent = r;
    }));
  }
  function Zt(r) {
    const p = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), h = p[0], y = p[p.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function S(I) {
      I.key === "Tab" && (I.shiftKey ? document.activeElement === h && (I.preventDefault(), y?.focus()) : document.activeElement === y && (I.preventDefault(), h?.focus()));
    }
    r.addEventListener("keydown", S), r._focusTrapHandler = S, requestAnimationFrame(() => {
      h?.focus();
    });
  }
  function Ht(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const u = r.dataset.previousFocus;
    if (u) {
      const p = document.getElementById(u);
      requestAnimationFrame(() => {
        p?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function en() {
    const r = wt(), u = document.getElementById("submit-status");
    u && (r.allRequiredComplete && a.hasConsented ? u.textContent = "All required fields complete. You can now submit." : a.hasConsented ? u.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : u.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function wt() {
    let r = 0, u = 0, p = 0;
    return a.fieldState.forEach((h) => {
      h.required && u++, h.completed && r++, h.required && !h.completed && p++;
    }), {
      completed: r,
      required: u,
      remainingRequired: p,
      total: a.fieldState.size,
      allRequiredComplete: p === 0
    };
  }
  function qt(r, u = 1) {
    const p = Array.from(a.fieldState.keys()), h = p.indexOf(r);
    if (h === -1) return null;
    const y = h + u;
    return y >= 0 && y < p.length ? p[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (Mt(), Qt(), be()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const u = Array.from(document.querySelectorAll(".sig-editor-tab")), p = u.indexOf(r.target);
      if (p !== -1) {
        let h = p;
        if (r.key === "ArrowRight" && (h = (p + 1) % u.length), r.key === "ArrowLeft" && (h = (p - 1 + u.length) % u.length), r.key === "Home" && (h = 0), r.key === "End" && (h = u.length - 1), h !== p) {
          r.preventDefault();
          const y = u[h], S = y.getAttribute("data-tab") || "draw", I = y.getAttribute("data-field-id");
          I && Ze(S, I), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const u = r.target.dataset.fieldId, p = r.key === "ArrowDown" ? 1 : -1, h = qt(u, p);
        h && document.querySelector(`.field-list-item[data-field-id="${h}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const u = r.target.dataset.fieldId;
        u && ft(u);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Ni {
  constructor(e) {
    this.config = e;
  }
  init() {
    gr(this.config);
  }
  destroy() {
  }
}
function ya(i) {
  const e = new Ni(i);
  return Q(() => e.init()), e;
}
function mr() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && Q(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = mr();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Ni(e);
  t.init(), window.esignSignerReviewController = t;
});
class ji {
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
    St('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), St('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function va(i = {}) {
  const e = new ji(i);
  return Q(() => e.init()), e;
}
function wa(i = {}) {
  const e = new ji(i);
  Q(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class si {
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
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: s } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), s && s.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (c) => {
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
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), c = this.elements.canvas, l = c.getContext("2d");
        if (!l)
          throw new Error("Failed to get canvas context");
        c.height = s.height, c.width = s.width, await n.render({
          canvasContext: l,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: s } = this.elements, c = this.pdfDoc?.numPages || 1;
    s && s.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= c);
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
    e && C(e), t && D(t), n && C(n), s && C(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && C(e), t && C(t), n && C(n), s && D(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: c, viewer: l } = this.elements;
    t && C(t), n && C(n), s && D(s), l && C(l), c && (c.textContent = e);
  }
}
function ba(i) {
  const e = new si(i);
  return e.init(), e;
}
function xa(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new si(e);
  Q(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && Q(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new si({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class Sa {
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
class Ia {
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
function hr(i) {
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
function fr(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function yr(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((c) => c !== s)] : n;
}
function Ea(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function La(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: hr(e.type),
    options: fr(e.options),
    operators: yr(e.operators, e.default_operator)
  })) : [];
}
function Ca(i) {
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
function Aa(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function ka(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([l, a]) => `${l}: ${a}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", c = e?.message || `${i} failed`;
    t.error(n ? `${s}${c}: ${n}` : `${s}${c}`);
  }
}
function Ta(i, e) {
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
function _a(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const Ma = {
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
}, kn = "application/vnd.google-apps.document", ri = "application/vnd.google-apps.spreadsheet", ai = "application/vnd.google-apps.presentation", Ui = "application/vnd.google-apps.folder", oi = "application/pdf", vr = [kn, oi], zi = "esign.google.account_id";
function wr(i) {
  return i.mimeType === kn;
}
function br(i) {
  return i.mimeType === oi;
}
function Ut(i) {
  return i.mimeType === Ui;
}
function xr(i) {
  return vr.includes(i.mimeType);
}
function $a(i) {
  return i.mimeType === kn || i.mimeType === ri || i.mimeType === ai;
}
function Sr(i) {
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
function Da(i) {
  return i.map(Sr);
}
function Oi(i) {
  return {
    [kn]: "Google Doc",
    [ri]: "Google Sheet",
    [ai]: "Google Slides",
    [Ui]: "Folder",
    [oi]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Ir(i) {
  return Ut(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : wr(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : br(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === ri ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === ai ? {
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
function Er(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Lr(i) {
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
    return Ln(t);
  if (e)
    return Ln(e);
  const n = localStorage.getItem(zi);
  return n ? Ln(n) : "";
}
function Ln(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function Fa(i) {
  const e = Ln(i);
  e && localStorage.setItem(zi, e);
}
function Ra(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Ha(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function qa(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function zt(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Cr(i) {
  const e = Ir(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Na(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const c = s === t.length - 1, l = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return c ? `${l}<span class="text-gray-900 font-medium">${zt(n.name)}</span>` : `${l}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${zt(n.name)}</button>`;
  }).join("");
}
function Pr(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, c = Cr(i), l = Ut(i), a = xr(i), b = l ? "cursor-pointer hover:bg-gray-50" : a ? "cursor-pointer hover:bg-blue-50" : "opacity-60", v = l ? `data-folder-id="${i.id}" data-folder-name="${zt(i.name)}"` : a && t ? `data-file-id="${i.id}" data-file-name="${zt(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${b} file-item"
      ${v}
      role="listitem"
      ${a ? 'tabindex="0"' : ""}
    >
      ${c}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${zt(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Oi(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Er(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${Lr(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${a && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function ja(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${zt(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((c, l) => Ut(c) && !Ut(l) ? -1 : !Ut(c) && Ut(l) ? 1 : c.name.localeCompare(l.name)).map((c) => Pr(c, { selectable: n })).join("")}
    </div>
  `;
}
function Ua(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Oi(i.mimeType)
  };
}
export {
  Is as AGREEMENT_STATUS_BADGES,
  qi as AgreementFormController,
  si as DocumentDetailPreviewController,
  ii as DocumentFormController,
  vs as ESignAPIClient,
  ws as ESignAPIError,
  zi as GOOGLE_ACCOUNT_STORAGE_KEY,
  Ai as GoogleCallbackController,
  Ti as GoogleDrivePickerController,
  ki as GoogleIntegrationController,
  vr as IMPORTABLE_MIME_TYPES,
  $i as IntegrationConflictsController,
  _i as IntegrationHealthController,
  Mi as IntegrationMappingsController,
  Di as IntegrationSyncRunsController,
  ni as LandingPageController,
  kn as MIME_GOOGLE_DOC,
  Ui as MIME_GOOGLE_FOLDER,
  ri as MIME_GOOGLE_SHEET,
  ai as MIME_GOOGLE_SLIDES,
  oi as MIME_PDF,
  Sa as PanelPaginationBehavior,
  Ia as PanelSearchBehavior,
  Ma as STANDARD_GRID_SELECTORS,
  Pi as SignerCompletePageController,
  ji as SignerErrorPageController,
  Ni as SignerReviewController,
  ve as announce,
  Ra as applyAccountIdToPath,
  ks as applyDetailFormatters,
  sr as bootstrapAgreementForm,
  xa as bootstrapDocumentDetailPreview,
  ha as bootstrapDocumentForm,
  ta as bootstrapGoogleCallback,
  ra as bootstrapGoogleDrivePicker,
  ia as bootstrapGoogleIntegration,
  ua as bootstrapIntegrationConflicts,
  oa as bootstrapIntegrationHealth,
  la as bootstrapIntegrationMappings,
  ga as bootstrapIntegrationSyncRuns,
  Xr as bootstrapLandingPage,
  Zr as bootstrapSignerCompletePage,
  wa as bootstrapSignerErrorPage,
  gr as bootstrapSignerReview,
  Ha as buildScopedApiUrl,
  qr as byId,
  Ss as capitalize,
  xs as createESignClient,
  Ls as createElement,
  _a as createSchemaActionCachingRefresh,
  Ua as createSelectedFile,
  Rr as createStatusBadgeElement,
  Jr as createTimeoutController,
  Ca as dateTimeCellRenderer,
  Pn as debounce,
  ka as defaultActionErrorHandler,
  Aa as defaultActionSuccessHandler,
  jr as delegate,
  zt as escapeHtml,
  Pa as fileSizeCellRenderer,
  _r as formatDate,
  Cn as formatDateTime,
  Lr as formatDriveDate,
  Er as formatDriveFileSize,
  xn as formatFileSize,
  Tr as formatPageCount,
  Dr as formatRecipientCount,
  $r as formatRelativeTime,
  Ps as formatSizeElements,
  Mr as formatTime,
  As as formatTimestampElements,
  Li as getAgreementStatusBadge,
  kr as getESignClient,
  Ir as getFileIconConfig,
  Oi as getFileTypeName,
  Cs as getPageConfig,
  C as hide,
  fa as initAgreementForm,
  Ts as initDetailFormatters,
  ba as initDocumentDetailPreview,
  ma as initDocumentForm,
  ea as initGoogleCallback,
  sa as initGoogleDrivePicker,
  na as initGoogleIntegration,
  da as initIntegrationConflicts,
  aa as initIntegrationHealth,
  ca as initIntegrationMappings,
  pa as initIntegrationSyncRuns,
  Kr as initLandingPage,
  Qr as initSignerCompletePage,
  va as initSignerErrorPage,
  ya as initSignerReview,
  Ut as isFolder,
  wr as isGoogleDoc,
  $a as isGoogleWorkspaceFile,
  xr as isImportable,
  br as isPDF,
  Ln as normalizeAccountId,
  Sr as normalizeDriveFile,
  Da as normalizeDriveFiles,
  yr as normalizeFilterOperators,
  fr as normalizeFilterOptions,
  hr as normalizeFilterType,
  Nr as on,
  Q as onReady,
  Vr as poll,
  La as prepareFilterFields,
  Ea as prepareGridColumns,
  g as qs,
  St as qsa,
  Na as renderBreadcrumb,
  Cr as renderFileIcon,
  Pr as renderFileItem,
  ja as renderFileList,
  Es as renderStatusBadge,
  Ba as resolveAccountId,
  Gr as retry,
  Fa as saveAccountId,
  bs as setESignClient,
  zr as setLoading,
  Ta as setupRefreshButton,
  D as show,
  Ci as sleep,
  Br as snakeToTitle,
  qa as syncAccountIdToUrl,
  Wr as throttle,
  Ur as toggle,
  Fr as truncate,
  an as updateDataText,
  Or as updateDataTexts,
  Hr as updateStatusBadge,
  Yr as withTimeout
};
//# sourceMappingURL=index.js.map

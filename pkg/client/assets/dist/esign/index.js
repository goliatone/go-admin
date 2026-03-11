import { e as it } from "../chunks/html-DyksyvcZ.js";
class Sr {
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
      const S = await this.listAgreements({ page: t, per_page: n }), w = S.items || S.records || [];
      if (e.push(...w), w.length === 0 || e.length >= S.total)
        break;
      t += 1;
    }
    const d = {};
    for (const S of e) {
      const w = String(S?.status || "").trim().toLowerCase();
      w && (d[w] = (d[w] || 0) + 1);
    }
    const p = (d.sent || 0) + (d.in_progress || 0), c = p + (d.declined || 0);
    return {
      draft: d.draft || 0,
      sent: d.sent || 0,
      in_progress: d.in_progress || 0,
      completed: d.completed || 0,
      voided: d.voided || 0,
      declined: d.declined || 0,
      expired: d.expired || 0,
      pending: p,
      action_required: c
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
      throw new xr(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class xr extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Pi = null;
function Ra() {
  if (!Pi)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Pi;
}
function Ir(i) {
  Pi = i;
}
function Er(i) {
  const e = new Sr(i);
  return Ir(e), e;
}
function Vn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Fa(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Xn(i, e) {
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
function Na(i, e) {
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
function Ua(i, e) {
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
function Ha(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), d = Math.round(s / 60), p = Math.round(d / 60), c = Math.round(p / 24), S = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? S.format(c, "day") : Math.abs(p) >= 1 ? S.format(p, "hour") : Math.abs(d) >= 1 ? S.format(d, "minute") : S.format(s, "second");
  } catch {
    return String(i);
  }
}
function qa(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Lr(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function Oa(i) {
  return i ? i.split("_").map((e) => Lr(e)).join(" ") : "";
}
function ja(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const Cr = {
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
function ws(i) {
  const e = String(i || "").trim().toLowerCase();
  return Cr[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function kr(i, e) {
  const t = ws(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, p = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${d[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${p}${t.label}</span>`;
}
function za(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = kr(i, e), t.firstElementChild;
}
function Ga(i, e, t) {
  const n = ws(e), s = t?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${d[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const S = i.querySelector(".rounded-full");
    if (S)
      S.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const w = document.createElement("span");
      w.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, w.setAttribute("aria-hidden", "true"), i.prepend(w);
    }
  }
  const c = i.childNodes[i.childNodes.length - 1];
  c && c.nodeType === Node.TEXT_NODE ? c.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function h(i, e = document) {
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
function Va(i) {
  return document.getElementById(i);
}
function Ar(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, d] of Object.entries(e))
      d !== void 0 && n.setAttribute(s, d);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function Wa(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function Ja(i, e, t, n, s) {
  const d = (p) => {
    const c = p.target.closest(e);
    c && i.contains(c) && n.call(c, p, c);
  };
  return i.addEventListener(t, d, s), () => i.removeEventListener(t, d, s);
}
function ne(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function $(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function T(i) {
  i && i.classList.add("hidden");
}
function Ya(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? $(i) : T(i);
}
function Ka(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Sn(i, e, t = document) {
  const n = h(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function Xa(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Sn(t, n, e);
}
function Pr(i = "[data-esign-page]", e = "data-esign-config") {
  const t = h(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const s = h(
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
  const t = h(`[aria-live="${e}"]`) || (() => {
    const n = Ar("div", {
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
async function Qa(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: d = 30,
    onProgress: p,
    signal: c
  } = i, S = Date.now();
  let w = 0, E;
  for (; w < d; ) {
    if (c?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - S >= s)
      return {
        result: E,
        attempts: w,
        stopped: !1,
        timedOut: !0
      };
    if (w++, E = await e(), p && p(E, w), t(E))
      return {
        result: E,
        attempts: w,
        stopped: !0,
        timedOut: !1
      };
    await bs(n, c);
  }
  return {
    result: E,
    attempts: w,
    stopped: !1,
    timedOut: !1
  };
}
async function Za(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: d = !0,
    shouldRetry: p = () => !0,
    onRetry: c,
    signal: S
  } = i;
  let w;
  for (let E = 1; E <= t; E++) {
    if (S?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (_) {
      if (w = _, E >= t || !p(_, E))
        throw _;
      const N = d ? Math.min(n * Math.pow(2, E - 1), s) : n;
      c && c(_, E, N), await bs(N, S);
    }
  }
  throw w;
}
function bs(i, e) {
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
function Qn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function eo(i, e) {
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
function to(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function no(i, e, t = "Operation timed out") {
  let n;
  const s = new Promise((d, p) => {
    n = setTimeout(() => {
      p(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, s]);
  } finally {
    clearTimeout(n);
  }
}
class $i {
  constructor(e) {
    this.config = e, this.client = Er({
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
    Sn('count="draft"', e.draft), Sn('count="pending"', e.pending), Sn('count="completed"', e.completed), Sn('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function io(i) {
  const e = i || Pr(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new $i(e);
  return ne(() => t.init()), t;
}
function so(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new $i(t);
  ne(() => n.init());
}
typeof document < "u" && ne(() => {
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
      new $i({ basePath: s, apiBasePath: d }).init();
    }
  }
});
class Ss {
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
    const e = h("#retry-artifacts-btn");
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
      const s = h(`#artifacts-${n}`);
      s && (n === e ? $(s) : T(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = h("#artifact-executed"), n = h("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), $(t));
    }
    if (e.source) {
      const t = h("#artifact-source"), n = h("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), $(t));
    }
    if (e.certificate) {
      const t = h("#artifact-certificate"), n = h("#artifact-certificate-link");
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
function ro(i) {
  const e = new Ss(i);
  return ne(() => e.init()), e;
}
function ao(i) {
  const e = new Ss(i);
  ne(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Tr(i = document) {
  Ht("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Vn(t));
  });
}
function _r(i = document) {
  Ht("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Xn(t));
  });
}
function Dr(i = document) {
  Tr(i), _r(i);
}
function Mr() {
  ne(() => {
    Dr();
  });
}
typeof document < "u" && Mr();
const ss = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class xs {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: h("#loading-state"),
      successState: h("#success-state"),
      errorState: h("#error-state"),
      errorMessage: h("#error-message"),
      errorDetail: h("#error-detail"),
      closeBtn: h("#close-btn")
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), d = e.get("state"), p = this.parseOAuthState(d);
    p.account_id || (p.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, s, p) : t ? this.handleSuccess(t, p) : this.handleError("unknown", "No authorization code was received from Google.", p);
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
    switch (T(t), T(n), T(s), e) {
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
    const { errorMessage: s, errorDetail: d, closeBtn: p } = this.elements;
    s && (s.textContent = ss[e] || ss.unknown), t && d && (d.textContent = t, $(d)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), d = s.get("state"), c = this.parseOAuthState(d).account_id || s.get("account_id");
      c && n.searchParams.set("account_id", c), window.location.href = n.toString();
    }
  }
}
function oo(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new xs(e);
  return ne(() => t.init()), t;
}
function co(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new xs(e);
  ne(() => t.init());
}
const Ii = "esign.google.account_id", $r = {
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
class Is {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      loadingState: h("#loading-state"),
      disconnectedState: h("#disconnected-state"),
      connectedState: h("#connected-state"),
      errorState: h("#error-state"),
      statusBadge: h("#status-badge"),
      announcements: h("#integration-announcements"),
      accountIdInput: h("#account-id-input"),
      connectBtn: h("#connect-btn"),
      disconnectBtn: h("#disconnect-btn"),
      refreshBtn: h("#refresh-status-btn"),
      retryBtn: h("#retry-btn"),
      reauthBtn: h("#reauth-btn"),
      oauthModal: h("#oauth-modal"),
      oauthCancelBtn: h("#oauth-cancel-btn"),
      disconnectModal: h("#disconnect-modal"),
      disconnectCancelBtn: h("#disconnect-cancel-btn"),
      disconnectConfirmBtn: h("#disconnect-confirm-btn"),
      connectedEmail: h("#connected-email"),
      connectedAccountId: h("#connected-account-id"),
      scopesList: h("#scopes-list"),
      expiryInfo: h("#expiry-info"),
      reauthWarning: h("#reauth-warning"),
      reauthReason: h("#reauth-reason"),
      errorMessage: h("#error-message"),
      degradedWarning: h("#degraded-warning"),
      degradedReason: h("#degraded-reason"),
      importDriveLink: h("#import-drive-link"),
      integrationSettingsLink: h("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: h("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: h("#accounts-section"),
      accountsLoading: h("#accounts-loading"),
      accountsEmpty: h("#accounts-empty"),
      accountsGrid: h("#accounts-grid"),
      connectFirstBtn: h("#connect-first-btn")
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
      oauthCancelBtn: p,
      disconnectCancelBtn: c,
      disconnectConfirmBtn: S,
      accountIdInput: w,
      oauthModal: E,
      disconnectModal: _
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), d && d.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, _ && $(_);
    }), c && c.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, _ && T(_);
    }), S && S.addEventListener("click", () => this.disconnect()), p && p.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), w && (w.addEventListener("change", () => {
      this.setCurrentAccountId(w.value, !0);
    }), w.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(w.value, !0));
    }));
    const { accountDropdown: N, connectFirstBtn: R } = this.elements;
    N && N.addEventListener("change", () => {
      N.value === "__new__" ? (N.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(N.value, !0);
    }), R && R.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), _ && !_.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, T(_)));
    }), [E, _].forEach((B) => {
      B && B.addEventListener("click", (V) => {
        const W = V.target;
        (W === B || W.getAttribute("aria-hidden") === "true") && (T(B), B === E ? this.cancelOAuthFlow() : B === _ && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Ii)
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
      this.currentAccountId ? window.localStorage.setItem(Ii, this.currentAccountId) : window.localStorage.removeItem(Ii);
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
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: d } = this.elements;
    switch (T(t), T(n), T(s), T(d), e) {
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
        $(d);
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
          const p = await e.json();
          p?.error?.message && (d = p.error.message);
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
    const t = (V, W) => {
      for (const ee of V)
        if (Object.prototype.hasOwnProperty.call(e, ee) && e[ee] !== void 0 && e[ee] !== null)
          return e[ee];
      return W;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), d = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), p = t(["connected", "Connected"], !1), c = t(["degraded", "Degraded"], !1), S = t(["degraded_reason", "DegradedReason"], ""), w = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), _ = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let N = t(["is_expired", "IsExpired"], void 0), R = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof N != "boolean" || typeof R != "boolean") && n) {
      const V = new Date(n);
      if (!Number.isNaN(V.getTime())) {
        const W = V.getTime() - Date.now(), ee = 5 * 60 * 1e3;
        N = W <= 0, R = W > 0 && W <= ee;
      }
    }
    const B = typeof _ == "boolean" ? _ : (N === !0 || R === !0) && !E;
    return {
      connected: p,
      account_id: d,
      email: w,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: N === !0,
      is_expiring_soon: R === !0,
      can_auto_refresh: E,
      needs_reauthorization: B,
      degraded: c,
      degraded_reason: S
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: d, reauthWarning: p, reauthReason: c } = this.elements;
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
        const s = $r[n] || { label: n, description: "" };
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
    const { expiryInfo: p, reauthWarning: c, reauthReason: S } = this.elements;
    if (!p) return;
    if (p.classList.remove("text-red-600", "text-amber-600"), p.classList.add("text-gray-500"), !e) {
      p.textContent = "Access token status unknown", c && T(c);
      return;
    }
    const w = new Date(e), E = /* @__PURE__ */ new Date(), _ = Math.max(
      1,
      Math.round((w.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? s ? (p.textContent = "Access token expired, but refresh is available and will be applied automatically.", p.classList.remove("text-gray-500"), p.classList.add("text-amber-600"), c && T(c)) : (p.textContent = "Access token has expired. Please re-authorize.", p.classList.remove("text-gray-500"), p.classList.add("text-red-600"), c && $(c), S && (S.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (p.classList.remove("text-gray-500"), p.classList.add("text-amber-600"), s ? (p.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}. Refresh is available automatically.`, c && T(c)) : (p.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}`, c && $(c), S && (S.textContent = `Your access token will expire in ${_} minute${_ !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (p.textContent = `Token valid until ${w.toLocaleDateString()} ${w.toLocaleTimeString()}`, c && T(c)), !d && c && T(c);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? ($(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : T(n));
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
      const p = this.normalizeAccountId(d.account_id);
      if (n.has(p))
        continue;
      n.add(p);
      const c = document.createElement("option");
      c.value = p;
      const S = d.email || p || "Default", w = d.status !== "connected" ? ` (${d.status})` : "";
      c.textContent = `${S}${w}`, p === this.currentAccountId && (c.selected = !0), e.appendChild(c);
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
    if (e && T(e), this.accounts.length === 0) {
      t && $(t), n && T(n);
      return;
    }
    t && T(t), n && ($(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, p = t ? "ring-2 ring-blue-500" : "", c = n[e.status] || "bg-white border-gray-200", S = s[e.status] || "bg-gray-100 text-gray-700", w = d[e.status] || e.status, E = e.account_id || "default", _ = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${c} ${p} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(_)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(E)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${S}">
              ${w}
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
        const c = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (d) => {
        const c = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !1), this.startOAuthFlow(c);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (d) => {
        const c = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = c, t && $(t);
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
    const s = this.resolveOAuthRedirectURI(), d = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = d;
    const p = this.buildGoogleOAuthUrl(s, d);
    if (!p) {
      t && T(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const c = 500, S = 600, w = (window.screen.width - c) / 2, E = (window.screen.height - S) / 2;
    if (this.oauthWindow = window.open(
      p,
      "google_oauth",
      `width=${c},height=${S},left=${w},top=${E},popup=yes`
    ), !this.oauthWindow) {
      t && T(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (_) => this.handleOAuthCallback(_), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && T(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    for (const p of n)
      if (t === p || this.areEquivalentLoopbackOrigins(t, p))
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
    if (this.cleanupOAuthFlow(), n && T(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const s = this.resolveOAuthRedirectURI(), p = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        p !== this.currentAccountId && this.setCurrentAccountId(p, !1);
        const c = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", p),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: p || void 0,
              redirect_uri: s
            })
          }
        );
        if (!c.ok) {
          const S = await c.json();
          throw new Error(S.error?.message || "Failed to connect");
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
    e && T(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && T(e);
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
function lo(i) {
  const e = new Is(i);
  return ne(() => e.init()), e;
}
function uo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new Is(e);
  ne(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Ei = "esign.google.account_id", rs = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, as = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Es {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: h("#drive-search"),
      clearSearchBtn: h("#clear-search-btn"),
      fileList: h("#file-list"),
      loadingState: h("#loading-state"),
      breadcrumb: h("#breadcrumb"),
      listTitle: h("#list-title"),
      resultCount: h("#result-count"),
      pagination: h("#pagination"),
      loadMoreBtn: h("#load-more-btn"),
      refreshBtn: h("#refresh-btn"),
      announcements: h("#drive-announcements"),
      accountScopeHelp: h("#account-scope-help"),
      connectGoogleLink: h("#connect-google-link"),
      noSelection: h("#no-selection"),
      filePreview: h("#file-preview"),
      previewIcon: h("#preview-icon"),
      previewTitle: h("#preview-title"),
      previewType: h("#preview-type"),
      previewFileId: h("#preview-file-id"),
      previewOwner: h("#preview-owner"),
      previewLocation: h("#preview-location"),
      previewModified: h("#preview-modified"),
      importBtn: h("#import-btn"),
      openInGoogleBtn: h("#open-in-google-btn"),
      clearSelectionBtn: h("#clear-selection-btn"),
      importModal: h("#import-modal"),
      importForm: h("#import-form"),
      importGoogleFileId: h("#import-google-file-id"),
      importDocumentTitle: h("#import-document-title"),
      importAgreementTitle: h("#import-agreement-title"),
      importCancelBtn: h("#import-cancel-btn"),
      importConfirmBtn: h("#import-confirm-btn"),
      importSpinner: h("#import-spinner"),
      importBtnText: h("#import-btn-text"),
      viewListBtn: h("#view-list-btn"),
      viewGridBtn: h("#view-grid-btn")
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
      clearSelectionBtn: p,
      importCancelBtn: c,
      importConfirmBtn: S,
      importForm: w,
      importModal: E,
      viewListBtn: _,
      viewGridBtn: N
    } = this.elements;
    if (e) {
      const B = Qn(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (V) => {
        V.key === "Enter" && (V.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), d && d.addEventListener("click", () => this.showImportModal()), p && p.addEventListener("click", () => this.clearSelection()), c && c.addEventListener("click", () => this.hideImportModal()), S && w && w.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const V = B.target;
      (V === E || V.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), _ && _.addEventListener("click", () => this.setViewMode("list")), N && N.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && E && !E.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: R } = this.elements;
    R && R.addEventListener("click", (B) => this.handleFileListClick(B));
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
        window.localStorage.getItem(Ei)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : T(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Ei, this.currentAccountId) : window.localStorage.removeItem(Ei);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), p = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), w = Array.isArray(e.parents) ? e.parents : c ? [c] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: d,
      webViewLink: p,
      parents: w,
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
      let d;
      this.searchQuery ? d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (d += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const p = await fetch(d, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!p.ok)
        throw new Error(`Failed to load files: ${p.status}`);
      const c = await p.json(), S = Array.isArray(c.files) ? c.files.map((w) => this.normalizeDriveFile(w)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...S] : this.currentFiles = S, this.nextPageToken = c.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), Le(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), Le("Error loading files");
    } finally {
      this.isLoading = !1, t && T(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && T(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = as.includes(e.mimeType), s = this.selectedFile?.id === e.id, d = rs[e.mimeType] || rs.default, p = this.getFileIcon(d);
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
          ${p}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${Xn(e.modifiedTime)}
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
      previewType: d,
      previewFileId: p,
      previewOwner: c,
      previewModified: S,
      importBtn: w,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && $(e), t && T(t);
      return;
    }
    e && T(e), t && $(t);
    const _ = this.selectedFile, N = as.includes(_.mimeType);
    s && (s.textContent = _.name), d && (d.textContent = this.getMimeTypeLabel(_.mimeType)), p && (p.textContent = _.id), c && _.owners.length > 0 && (c.textContent = _.owners[0].emailAddress || "-"), S && (S.textContent = Xn(_.modifiedTime)), w && (N ? (w.removeAttribute("disabled"), w.classList.remove("opacity-50", "cursor-not-allowed")) : (w.setAttribute("disabled", "true"), w.classList.add("opacity-50", "cursor-not-allowed"))), E && _.webViewLink && (E.href = _.webViewLink);
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
      T(e), t && (t.textContent = "Search Results");
      return;
    }
    $(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
      (d, p) => `
        <li class="flex items-center">
          ${p > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(d.id)}"
            data-folder-index="${p}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(d.name)}
          </button>
        </li>
      `
    ).join(""), Ht(".breadcrumb-item", s).forEach((d) => {
      d.addEventListener("click", () => {
        const p = parseInt(d.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(p);
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
    e && (this.nextPageToken ? $(e) : T(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? $(t) : T(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && T(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    s && (s.value = ""), e && $(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && T(e);
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
    } = this.elements, p = this.selectedFile.id, c = s?.value.trim() || this.selectedFile.name, S = d?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && $(t), n && (n.textContent = "Importing...");
    try {
      const w = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: p,
          document_title: c,
          agreement_title: S || void 0
        })
      });
      if (!w.ok) {
        const _ = await w.json();
        throw new Error(_.error?.message || "Import failed");
      }
      const E = await w.json();
      this.showToast("Import started successfully", "success"), Le("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (w) {
      console.error("Import error:", w);
      const E = w instanceof Error ? w.message : "Import failed";
      this.showToast(E, "error"), Le(`Error: ${E}`);
    } finally {
      e && e.removeAttribute("disabled"), t && T(t), n && (n.textContent = "Import");
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
function po(i) {
  const e = new Es(i);
  return ne(() => e.init()), e;
}
function go(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new Es(e);
  ne(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class Ls {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: h("#time-range"),
      providerFilter: h("#provider-filter"),
      refreshBtn: h("#refresh-btn"),
      healthScore: h("#health-score"),
      healthIndicator: h("#health-indicator"),
      healthTrend: h("#health-trend"),
      syncSuccessRate: h("#sync-success-rate"),
      syncSuccessCount: h("#sync-success-count"),
      syncFailedCount: h("#sync-failed-count"),
      syncSuccessBar: h("#sync-success-bar"),
      conflictCount: h("#conflict-count"),
      conflictPending: h("#conflict-pending"),
      conflictResolved: h("#conflict-resolved"),
      conflictTrend: h("#conflict-trend"),
      syncLag: h("#sync-lag"),
      lagStatus: h("#lag-status"),
      lastSync: h("#last-sync"),
      retryTotal: h("#retry-total"),
      retryRecovery: h("#retry-recovery"),
      retryAvg: h("#retry-avg"),
      retryList: h("#retry-list"),
      providerHealthTable: h("#provider-health-table"),
      alertsList: h("#alerts-list"),
      noAlerts: h("#no-alerts"),
      alertCount: h("#alert-count"),
      activityFeed: h("#activity-feed"),
      syncChartCanvas: h("#sync-chart-canvas"),
      conflictChartCanvas: h("#conflict-chart-canvas")
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
      const p = await fetch(d.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!p.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const c = await p.json();
        this.healthData = c;
      }
      this.renderHealthData(), Le("Health data refreshed");
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
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((p) => ({
        provider: p,
        status: p === "workday" ? "degraded" : "healthy",
        successRate: p === "workday" ? 89.2 : 97 + Math.random() * 3,
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
      const p = n[Math.floor(Math.random() * n.length)], c = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: p,
        provider: c,
        message: this.getActivityMessage(p, c),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: p.includes("failed") || p.includes("created") ? "warning" : "success"
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
    for (let p = e - 1; p >= 0; p--) {
      const c = new Date(d.getTime() - p * 36e5);
      n.push(
        c.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
      const p = d.trend >= 0 ? "+" : "";
      s.textContent = `${p}${d.trend} from previous period`;
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
      (p) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(p.provider)} / ${this.escapeHtml(p.entity)}</span>
            <span class="${p.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(p.time)}</span>
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
    const { alertsList: s, noAlerts: d, alertCount: p } = this.elements, c = s?.querySelectorAll(":scope > div").length || 0;
    p && (p.textContent = `${c} active`, c === 0 && (p.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), d && d.classList.remove("hidden")));
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
    const p = d.getContext("2d");
    if (!p) return;
    const c = d.width, S = d.height, w = 40, E = c - w * 2, _ = S - w * 2;
    p.clearRect(0, 0, c, S);
    const N = t.labels, R = Object.values(t.datasets), B = E / N.length / (R.length + 1), V = Math.max(...R.flat()) || 1;
    N.forEach((W, ee) => {
      const ce = w + ee * E / N.length + B / 2;
      R.forEach((he, le) => {
        const Pe = he[ee] / V * _, Ne = ce + le * B, Je = S - w - Pe;
        p.fillStyle = n[le] || "#6b7280", p.fillRect(Ne, Je, B - 2, Pe);
      }), ee % Math.ceil(N.length / 6) === 0 && (p.fillStyle = "#6b7280", p.font = "10px sans-serif", p.textAlign = "center", p.fillText(W, ce + R.length * B / 2, S - w + 15));
    }), p.fillStyle = "#6b7280", p.font = "10px sans-serif", p.textAlign = "right";
    for (let W = 0; W <= 4; W++) {
      const ee = S - w - W * _ / 4, ce = Math.round(V * W / 4);
      p.fillText(ce.toString(), w - 5, ee + 3);
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
function mo(i) {
  const e = new Ls(i);
  return ne(() => e.init()), e;
}
function ho(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new Ls(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class Cs {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: h("#mappings-announcements"),
      loadingState: h("#loading-state"),
      emptyState: h("#empty-state"),
      errorState: h("#error-state"),
      mappingsList: h("#mappings-list"),
      mappingsTbody: h("#mappings-tbody"),
      searchInput: h("#search-mappings"),
      filterStatus: h("#filter-status"),
      filterProvider: h("#filter-provider"),
      refreshBtn: h("#refresh-btn"),
      retryBtn: h("#retry-btn"),
      errorMessage: h("#error-message"),
      createMappingBtn: h("#create-mapping-btn"),
      createMappingEmptyBtn: h("#create-mapping-empty-btn"),
      mappingModal: h("#mapping-modal"),
      mappingModalTitle: h("#mapping-modal-title"),
      closeModalBtn: h("#close-modal-btn"),
      cancelModalBtn: h("#cancel-modal-btn"),
      mappingForm: h("#mapping-form"),
      mappingIdInput: h("#mapping-id"),
      mappingVersionInput: h("#mapping-version"),
      mappingNameInput: h("#mapping-name"),
      mappingProviderInput: h("#mapping-provider"),
      schemaObjectTypeInput: h("#schema-object-type"),
      schemaVersionInput: h("#schema-version"),
      schemaFieldsContainer: h("#schema-fields-container"),
      addFieldBtn: h("#add-field-btn"),
      mappingRulesContainer: h("#mapping-rules-container"),
      addRuleBtn: h("#add-rule-btn"),
      validateBtn: h("#validate-btn"),
      saveBtn: h("#save-btn"),
      formValidationStatus: h("#form-validation-status"),
      mappingStatusBadge: h("#mapping-status-badge"),
      publishModal: h("#publish-modal"),
      publishMappingName: h("#publish-mapping-name"),
      publishMappingVersion: h("#publish-mapping-version"),
      publishCancelBtn: h("#publish-cancel-btn"),
      publishConfirmBtn: h("#publish-confirm-btn"),
      deleteModal: h("#delete-modal"),
      deleteCancelBtn: h("#delete-cancel-btn"),
      deleteConfirmBtn: h("#delete-confirm-btn"),
      previewModal: h("#preview-modal"),
      closePreviewBtn: h("#close-preview-btn"),
      previewMappingName: h("#preview-mapping-name"),
      previewMappingProvider: h("#preview-mapping-provider"),
      previewObjectType: h("#preview-object-type"),
      previewMappingStatus: h("#preview-mapping-status"),
      previewSourceInput: h("#preview-source-input"),
      sourceSyntaxError: h("#source-syntax-error"),
      loadSampleBtn: h("#load-sample-btn"),
      runPreviewBtn: h("#run-preview-btn"),
      clearPreviewBtn: h("#clear-preview-btn"),
      previewEmpty: h("#preview-empty"),
      previewLoading: h("#preview-loading"),
      previewError: h("#preview-error"),
      previewErrorMessage: h("#preview-error-message"),
      previewSuccess: h("#preview-success"),
      previewParticipants: h("#preview-participants"),
      participantsCount: h("#participants-count"),
      previewFields: h("#preview-fields"),
      fieldsCount: h("#fields-count"),
      previewMetadata: h("#preview-metadata"),
      previewRawJson: h("#preview-raw-json"),
      previewRulesTbody: h("#preview-rules-tbody")
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
      retryBtn: p,
      addFieldBtn: c,
      addRuleBtn: S,
      validateBtn: w,
      mappingForm: E,
      publishCancelBtn: _,
      publishConfirmBtn: N,
      deleteCancelBtn: R,
      deleteConfirmBtn: B,
      closePreviewBtn: V,
      loadSampleBtn: W,
      runPreviewBtn: ee,
      clearPreviewBtn: ce,
      previewSourceInput: he,
      searchInput: le,
      filterStatus: Pe,
      filterProvider: Ne,
      mappingModal: Je,
      publishModal: Ue,
      deleteModal: $e,
      previewModal: ie
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), d?.addEventListener("click", () => this.loadMappings()), p?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.addSchemaField()), S?.addEventListener("click", () => this.addMappingRule()), w?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (Se) => {
      Se.preventDefault(), this.saveMapping();
    }), _?.addEventListener("click", () => this.closePublishModal()), N?.addEventListener("click", () => this.publishMapping()), R?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), V?.addEventListener("click", () => this.closePreviewModal()), W?.addEventListener("click", () => this.loadSamplePayload()), ee?.addEventListener("click", () => this.runPreviewTransform()), ce?.addEventListener("click", () => this.clearPreview()), he?.addEventListener("input", Qn(() => this.validateSourceJson(), 300)), le?.addEventListener("input", Qn(() => this.renderMappings(), 300)), Pe?.addEventListener("change", () => this.renderMappings()), Ne?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (Se) => {
      Se.key === "Escape" && (Je && !Je.classList.contains("hidden") && this.closeModal(), Ue && !Ue.classList.contains("hidden") && this.closePublishModal(), $e && !$e.classList.contains("hidden") && this.closeDeleteModal(), ie && !ie.classList.contains("hidden") && this.closePreviewModal());
    }), [Je, Ue, $e, ie].forEach((Se) => {
      Se?.addEventListener("click", (sn) => {
        const kt = sn.target;
        (kt === Se || kt.getAttribute("aria-hidden") === "true") && (Se === Je ? this.closeModal() : Se === Ue ? this.closePublishModal() : Se === $e ? this.closeDeleteModal() : Se === ie && this.closePreviewModal());
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
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: d } = this.elements;
    switch (T(t), T(n), T(s), T(d), e) {
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
    const { mappingsTbody: e, searchInput: t, filterStatus: n, filterProvider: s } = this.elements;
    if (!e) return;
    const d = (t?.value || "").toLowerCase(), p = n?.value || "", c = s?.value || "", S = this.mappings.filter((w) => !(d && !w.name.toLowerCase().includes(d) && !w.provider.toLowerCase().includes(d) || p && w.status !== p || c && w.provider !== c));
    if (S.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = S.map(
      (w) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(w.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(w.compiled_hash ? w.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(w.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(w.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${w.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(w.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(w.id)}" aria-label="Preview ${this.escapeHtml(w.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(w.id)}" aria-label="Edit ${this.escapeHtml(w.name)}">
              Edit
            </button>
            ${w.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(w.id)}" aria-label="Publish ${this.escapeHtml(w.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(w.id)}" aria-label="Delete ${this.escapeHtml(w.name)}">
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
      schemaVersionInput: p,
      schemaFieldsContainer: c,
      mappingRulesContainer: S
    } = this.elements, w = [];
    c?.querySelectorAll(".schema-field-row").forEach((_) => {
      w.push({
        object: (_.querySelector(".field-object")?.value || "").trim(),
        field: (_.querySelector(".field-name")?.value || "").trim(),
        type: _.querySelector(".field-type")?.value || "string",
        required: _.querySelector(".field-required")?.checked || !1
      });
    });
    const E = [];
    return S?.querySelectorAll(".mapping-rule-row").forEach((_) => {
      E.push({
        source_object: (_.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (_.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: _.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (_.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: d?.value.trim() || "",
        version: p?.value.trim() || void 0,
        fields: w
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
      schemaObjectTypeInput: p,
      schemaVersionInput: c,
      schemaFieldsContainer: S,
      mappingRulesContainer: w,
      mappingStatusBadge: E,
      formValidationStatus: _
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), d && (d.value = e.provider || "");
    const N = e.external_schema || { object_type: "", fields: [] };
    p && (p.value = N.object_type || ""), c && (c.value = N.version || ""), S && (S.innerHTML = "", (N.fields || []).forEach((R) => S.appendChild(this.createSchemaFieldRow(R)))), w && (w.innerHTML = "", (e.rules || []).forEach((R) => w.appendChild(this.createMappingRuleRow(R)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), T(_);
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
      mappingStatusBadge: p,
      formValidationStatus: c
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), d && (d.innerHTML = ""), p && p.classList.add("hidden"), T(c), this.editingMappingId = null;
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
    const t = this.mappings.find((p) => p.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: d } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), $(n), d?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    T(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((p) => p.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: d } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), d && (d.textContent = `v${t.version || 1}`), $(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    T(this.elements.publishModal), this.pendingPublishId = null;
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
    T(this.elements.deleteModal), this.pendingDeleteId = null;
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
        const p = d.errors || [d.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${p.map((c) => `<li>${this.escapeHtml(c)}</li>`).join("")}</ul>
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
      const n = !!t.id, s = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, p = await fetch(s, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!p.ok) {
        const c = await p.json();
        throw new Error(c.error?.message || `HTTP ${p.status}`);
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
      previewObjectType: p,
      previewMappingStatus: c,
      previewSourceInput: S,
      sourceSyntaxError: w
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), d && (d.textContent = t.provider), p && (p.textContent = t.external_schema?.object_type || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), S && (S.value = ""), T(w), $(n), S?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    T(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: d } = this.elements;
    switch (T(t), T(n), T(s), T(d), e) {
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", d = n.fields || [], p = {}, c = {};
    d.forEach((S) => {
      const w = S.field || "field";
      switch (S.type) {
        case "string":
          c[w] = w === "email" ? "john.doe@example.com" : w === "name" ? "John Doe" : `sample_${w}`;
          break;
        case "number":
          c[w] = 123;
          break;
        case "boolean":
          c[w] = !0;
          break;
        case "date":
          c[w] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          c[w] = `sample_${w}`;
      }
    }), p[s] = c, e && (e.value = JSON.stringify(p, null, 2)), T(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return T(t), null;
    try {
      const s = JSON.parse(n);
      return T(t), s;
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
    }, d = {}, p = {}, c = [];
    return n.forEach((S) => {
      const w = this.resolveSourceValue(e, S.source_object, S.source_field), E = w !== void 0;
      if (s.matched_rules.push({
        source: S.source_field,
        matched: E,
        value: w
      }), !!E)
        switch (S.target_entity) {
          case "participant":
            d[S.target_path] = w;
            break;
          case "agreement":
            p[S.target_path] = w;
            break;
          case "field_definition":
            c.push({ path: S.target_path, value: w });
            break;
        }
    }), Object.keys(d).length > 0 && s.participants.push({
      ...d,
      role: d.role || "signer",
      signing_stage: d.signing_stage || 1
    }), s.agreement = p, s.field_definitions = c, s;
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
      previewMetadata: p,
      previewRawJson: c,
      previewRulesTbody: S
    } = this.elements, w = e.participants || [];
    n && (n.textContent = `(${w.length})`), t && (w.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = w.map(
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
    d && (d.textContent = `(${E.length})`), s && (E.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = E.map(
      (R) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(R.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(R.value))}</span>
          </div>
        `
    ).join(""));
    const _ = e.agreement || {}, N = Object.entries(_);
    p && (N.length === 0 ? p.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : p.innerHTML = N.map(
      ([R, B]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(R)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(B))}</span>
          </div>
        `
    ).join("")), c && (c.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((R) => {
      const B = S?.querySelector(`[data-rule-source="${this.escapeHtml(R.source)}"] span`);
      B && (R.matched ? (B.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", B.textContent = "Matched") : (B.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", B.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), T(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function fo(i) {
  const e = new Cs(i);
  return ne(() => e.init()), e;
}
function yo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Cs(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class ks {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: h("#conflicts-announcements"),
      loadingState: h("#loading-state"),
      emptyState: h("#empty-state"),
      errorState: h("#error-state"),
      conflictsList: h("#conflicts-list"),
      errorMessage: h("#error-message"),
      refreshBtn: h("#refresh-btn"),
      retryBtn: h("#retry-btn"),
      filterStatus: h("#filter-status"),
      filterProvider: h("#filter-provider"),
      filterEntity: h("#filter-entity"),
      statPending: h("#stat-pending"),
      statResolved: h("#stat-resolved"),
      statIgnored: h("#stat-ignored"),
      conflictDetailModal: h("#conflict-detail-modal"),
      closeDetailBtn: h("#close-detail-btn"),
      detailReason: h("#detail-reason"),
      detailEntityType: h("#detail-entity-type"),
      detailStatusBadge: h("#detail-status-badge"),
      detailProvider: h("#detail-provider"),
      detailExternalId: h("#detail-external-id"),
      detailInternalId: h("#detail-internal-id"),
      detailBindingId: h("#detail-binding-id"),
      detailPayload: h("#detail-payload"),
      resolutionSection: h("#resolution-section"),
      detailResolvedAt: h("#detail-resolved-at"),
      detailResolvedBy: h("#detail-resolved-by"),
      detailResolution: h("#detail-resolution"),
      detailConflictId: h("#detail-conflict-id"),
      detailRunId: h("#detail-run-id"),
      detailCreatedAt: h("#detail-created-at"),
      detailVersion: h("#detail-version"),
      actionButtons: h("#action-buttons"),
      actionResolveBtn: h("#action-resolve-btn"),
      actionIgnoreBtn: h("#action-ignore-btn"),
      resolveModal: h("#resolve-modal"),
      resolveForm: h("#resolve-form"),
      cancelResolveBtn: h("#cancel-resolve-btn"),
      submitResolveBtn: h("#submit-resolve-btn"),
      resolutionAction: h("#resolution-action")
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
      filterEntity: p,
      actionResolveBtn: c,
      actionIgnoreBtn: S,
      cancelResolveBtn: w,
      resolveForm: E,
      conflictDetailModal: _,
      resolveModal: N
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), d?.addEventListener("change", () => this.renderConflicts()), p?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("click", () => this.openResolveModal("resolved")), S?.addEventListener("click", () => this.openResolveModal("ignored")), w?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (R) => this.submitResolution(R)), document.addEventListener("keydown", (R) => {
      R.key === "Escape" && (N && !N.classList.contains("hidden") ? this.closeResolveModal() : _ && !_.classList.contains("hidden") && this.closeConflictDetail());
    }), [_, N].forEach((R) => {
      R?.addEventListener("click", (B) => {
        const V = B.target;
        (V === R || V.getAttribute("aria-hidden") === "true") && (R === _ ? this.closeConflictDetail() : R === N && this.closeResolveModal());
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
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: d } = this.elements;
    switch (T(t), T(n), T(s), T(d), e) {
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((c) => c.status === "pending").length, d = this.conflicts.filter((c) => c.status === "resolved").length, p = this.conflicts.filter((c) => c.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(d)), n && (n.textContent = String(p));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const d = t?.value || "", p = n?.value || "", c = s?.value || "", S = this.conflicts.filter((w) => !(d && w.status !== d || p && w.provider !== p || c && w.entity_kind !== c));
    if (S.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = S.map(
      (w) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(w.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${w.status === "pending" ? "bg-amber-100" : w.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${w.status === "pending" ? "text-amber-600" : w.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(w.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(w.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(w.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((w.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(w.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(w.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((w) => {
      w.addEventListener("click", () => this.openConflictDetail(w.dataset.id || ""));
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
      detailEntityType: d,
      detailStatusBadge: p,
      detailProvider: c,
      detailExternalId: S,
      detailInternalId: w,
      detailBindingId: E,
      detailConflictId: _,
      detailRunId: N,
      detailCreatedAt: R,
      detailVersion: B,
      detailPayload: V,
      resolutionSection: W,
      actionButtons: ee,
      detailResolvedAt: ce,
      detailResolvedBy: he,
      detailResolution: le
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), d && (d.textContent = t.entity_kind || "-"), p && (p.innerHTML = this.getStatusBadge(t.status)), c && (c.textContent = t.provider || "-"), S && (S.textContent = t.external_id || "-"), w && (w.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), _ && (_.textContent = t.id), N && (N.textContent = t.run_id || "-"), R && (R.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), V)
      try {
        const Pe = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        V.textContent = JSON.stringify(Pe, null, 2);
      } catch {
        V.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if ($(W), T(ee), ce && (ce.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), he && (he.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), le)
        try {
          const Pe = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          le.textContent = JSON.stringify(Pe, null, 2);
        } catch {
          le.textContent = t.resolution_json || "{}";
        }
    } else
      T(W), $(ee);
    $(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    T(this.elements.conflictDetailModal), this.currentConflictId = null;
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
    T(this.elements.resolveModal);
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
    const p = s.get("resolution");
    if (p)
      try {
        d = JSON.parse(p);
      } catch {
        d = { raw: p };
      }
    const c = s.get("notes");
    c && (d.notes = c);
    const S = {
      status: s.get("status"),
      resolution: d
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const w = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(S)
      });
      if (!w.ok) {
        const E = await w.json();
        throw new Error(E.error?.message || `HTTP ${w.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (w) {
      console.error("Resolution error:", w);
      const E = w instanceof Error ? w.message : "Unknown error";
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
function vo(i) {
  const e = new ks(i);
  return ne(() => e.init()), e;
}
function wo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ks(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class As {
  constructor(e) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: h("#sync-announcements"),
      loadingState: h("#loading-state"),
      emptyState: h("#empty-state"),
      errorState: h("#error-state"),
      runsTimeline: h("#runs-timeline"),
      errorMessage: h("#error-message"),
      refreshBtn: h("#refresh-btn"),
      retryBtn: h("#retry-btn"),
      filterProvider: h("#filter-provider"),
      filterStatus: h("#filter-status"),
      filterDirection: h("#filter-direction"),
      statTotal: h("#stat-total"),
      statRunning: h("#stat-running"),
      statCompleted: h("#stat-completed"),
      statFailed: h("#stat-failed"),
      startSyncBtn: h("#start-sync-btn"),
      startSyncEmptyBtn: h("#start-sync-empty-btn"),
      startSyncModal: h("#start-sync-modal"),
      startSyncForm: h("#start-sync-form"),
      cancelSyncBtn: h("#cancel-sync-btn"),
      submitSyncBtn: h("#submit-sync-btn"),
      syncMappingSelect: h("#sync-mapping"),
      runDetailModal: h("#run-detail-modal"),
      closeDetailBtn: h("#close-detail-btn"),
      detailRunId: h("#detail-run-id"),
      detailProvider: h("#detail-provider"),
      detailDirection: h("#detail-direction"),
      detailStatus: h("#detail-status"),
      detailStarted: h("#detail-started"),
      detailCompleted: h("#detail-completed"),
      detailCursor: h("#detail-cursor"),
      detailAttempt: h("#detail-attempt"),
      detailErrorSection: h("#detail-error-section"),
      detailLastError: h("#detail-last-error"),
      detailCheckpoints: h("#detail-checkpoints"),
      actionResumeBtn: h("#action-resume-btn"),
      actionRetryBtn: h("#action-retry-btn"),
      actionCompleteBtn: h("#action-complete-btn"),
      actionFailBtn: h("#action-fail-btn"),
      actionDiagnosticsBtn: h("#action-diagnostics-btn")
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
      retryBtn: p,
      closeDetailBtn: c,
      filterProvider: S,
      filterStatus: w,
      filterDirection: E,
      actionResumeBtn: _,
      actionRetryBtn: N,
      actionCompleteBtn: R,
      actionFailBtn: B,
      actionDiagnosticsBtn: V,
      startSyncModal: W,
      runDetailModal: ee
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (ce) => this.startSync(ce)), d?.addEventListener("click", () => this.loadSyncRuns()), p?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.closeRunDetail()), S?.addEventListener("change", () => this.renderTimeline()), w?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), _?.addEventListener("click", () => this.runAction("resume")), N?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), V?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (ce) => {
      ce.key === "Escape" && (W && !W.classList.contains("hidden") && this.closeStartSyncModal(), ee && !ee.classList.contains("hidden") && this.closeRunDetail());
    }), [W, ee].forEach((ce) => {
      ce?.addEventListener("click", (he) => {
        const le = he.target;
        (le === ce || le.getAttribute("aria-hidden") === "true") && (ce === W ? this.closeStartSyncModal() : ce === ee && this.closeRunDetail());
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
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: d } = this.elements;
    switch (T(t), T(n), T(s), T(d), e) {
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, d = this.syncRuns.length, p = this.syncRuns.filter(
      (w) => w.status === "running" || w.status === "pending"
    ).length, c = this.syncRuns.filter((w) => w.status === "completed").length, S = this.syncRuns.filter((w) => w.status === "failed").length;
    e && (e.textContent = String(d)), t && (t.textContent = String(p)), n && (n.textContent = String(c)), s && (s.textContent = String(S));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", d = n?.value || "", p = this.syncRuns.filter((c) => !(s && c.status !== s || d && c.direction !== d));
    if (p.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = p.map(
      (c) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(c.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${c.status === "running" ? "bg-blue-100" : c.status === "completed" ? "bg-green-100" : c.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${c.status === "running" ? "text-blue-600 animate-spin" : c.status === "completed" ? "text-green-600" : c.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(c.provider)}</span>
                  ${this.getDirectionBadge(c.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(c.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(c.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(c.started_at)}</p>
            </div>
          </div>

          ${c.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(c.cursor)}</span></p>
            </div>
          ` : ""}

          ${c.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(c.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".sync-run-card").forEach((c) => {
      c.addEventListener("click", () => this.openRunDetail(c.dataset.id || ""));
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
    T(this.elements.startSyncModal);
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
      const p = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(d)
      });
      if (!p.ok) {
        const c = await p.json();
        throw new Error(c.error?.message || `HTTP ${p.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (p) {
      console.error("Start sync error:", p);
      const c = p instanceof Error ? p.message : "Unknown error";
      this.showToast(`Failed to start: ${c}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(e) {
    this.currentRunId = e;
    const t = this.syncRuns.find((he) => he.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: d,
      detailDirection: p,
      detailStatus: c,
      detailStarted: S,
      detailCompleted: w,
      detailCursor: E,
      detailAttempt: _,
      detailErrorSection: N,
      detailLastError: R,
      detailCheckpoints: B,
      actionResumeBtn: V,
      actionRetryBtn: W,
      actionCompleteBtn: ee,
      actionFailBtn: ce
    } = this.elements;
    s && (s.textContent = t.id), d && (d.textContent = t.provider), p && (p.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), c && (c.innerHTML = this.getStatusBadge(t.status)), S && (S.textContent = this.formatDate(t.started_at)), w && (w.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), _ && (_.textContent = String(t.attempt_count || 1)), t.last_error ? (R && (R.textContent = t.last_error), $(N)) : T(N), V && V.classList.toggle("hidden", t.status !== "running"), W && W.classList.toggle("hidden", t.status !== "failed"), ee && ee.classList.toggle("hidden", t.status !== "running"), ce && ce.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), $(n);
    try {
      const he = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (he.ok) {
        const le = await he.json();
        this.renderCheckpoints(le.checkpoints || []);
      } else
        B && (B.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (he) {
      console.error("Error loading checkpoints:", he), B && (B.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    T(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: d } = this.elements, p = e === "resume" ? t : e === "complete" ? s : d, c = e === "resume" ? n : null;
    if (!p) return;
    p.setAttribute("disabled", "true"), c?.setAttribute("disabled", "true");
    const S = p.innerHTML;
    p.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const w = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, E = await fetch(w, {
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
        const _ = await E.json();
        throw new Error(_.error?.message || `HTTP ${E.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (w) {
      console.error(`${e} error:`, w);
      const E = w instanceof Error ? w.message : "Unknown error";
      this.showToast(`Failed: ${E}`, "error");
    } finally {
      p.removeAttribute("disabled"), c?.removeAttribute("disabled"), p.innerHTML = S;
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
function bo(i) {
  const e = new As(i);
  return ne(() => e.init()), e;
}
function So(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new As(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const Li = "esign.google.account_id", Br = 25 * 1024 * 1024, Rr = 2e3, os = 60, Ti = "application/vnd.google-apps.document", _i = "application/pdf", cs = "application/vnd.google-apps.folder", Fr = [Ti, _i];
class Bi {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || Br, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      // Upload panel
      form: h("#document-upload-form"),
      fileInput: h("#pdf_file"),
      uploadZone: h("#pdf-upload-zone"),
      placeholder: h("#upload-placeholder"),
      preview: h("#upload-preview"),
      fileName: h("#selected-file-name"),
      fileSize: h("#selected-file-size"),
      clearBtn: h("#clear-file-btn"),
      errorEl: h("#upload-error"),
      submitBtn: h("#submit-btn"),
      titleInput: h("#title"),
      sourceObjectKeyInput: h("#source_object_key"),
      sourceOriginalNameInput: h("#source_original_name"),
      // Source tabs
      sourceTabs: Ht(".source-tab"),
      sourcePanels: Ht(".source-panel"),
      announcements: h("#doc-announcements"),
      // Google Drive panel
      searchInput: h("#drive-search"),
      clearSearchBtn: h("#clear-search-btn"),
      fileList: h("#file-list"),
      loadingState: h("#loading-state"),
      breadcrumb: h("#breadcrumb"),
      listTitle: h("#list-title"),
      resultCount: h("#result-count"),
      pagination: h("#pagination"),
      loadMoreBtn: h("#load-more-btn"),
      refreshBtn: h("#refresh-btn"),
      driveAccountDropdown: h("#drive-account-dropdown"),
      accountScopeHelp: h("#account-scope-help"),
      connectGoogleLink: h("#connect-google-link"),
      // Selection panel
      noSelection: h("#no-selection"),
      filePreview: h("#file-preview"),
      previewIcon: h("#preview-icon"),
      previewTitle: h("#preview-title"),
      previewType: h("#preview-type"),
      importTypeInfo: h("#import-type-info"),
      importTypeLabel: h("#import-type-label"),
      importTypeDesc: h("#import-type-desc"),
      snapshotWarning: h("#snapshot-warning"),
      importDocumentTitle: h("#import-document-title"),
      importBtn: h("#import-btn"),
      importBtnText: h("#import-btn-text"),
      clearSelectionBtn: h("#clear-selection-btn"),
      // Import status
      importStatus: h("#import-status"),
      importStatusQueued: h("#import-status-queued"),
      importStatusSuccess: h("#import-status-success"),
      importStatusFailed: h("#import-status-failed"),
      importStatusMessage: h("#import-status-message"),
      importErrorMessage: h("#import-error-message"),
      importRetryBtn: h("#import-retry-btn"),
      importReconnectLink: h("#import-reconnect-link")
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
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (p) => {
      p.preventDefault(), p.stopPropagation(), this.clearFileSelection();
    }), d && d.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((p) => {
      n.addEventListener(p, (c) => {
        c.preventDefault(), c.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((p) => {
      n.addEventListener(p, (c) => {
        c.preventDefault(), c.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (p) => {
      const c = p.dataTransfer;
      c?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = c.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (p) => {
      (p.key === "Enter" || p.key === " ") && (p.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (p) => this.handleFormSubmit(p));
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
      importBtn: p,
      importRetryBtn: c,
      driveAccountDropdown: S
    } = this.elements;
    if (e) {
      const w = Qn(() => this.handleSearch(), 300);
      e.addEventListener("input", w);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), S && S.addEventListener("change", () => {
      this.setCurrentAccountId(S.value, this.currentSource === "google");
    }), d && d.addEventListener("click", () => this.clearFileSelection()), p && p.addEventListener("click", () => this.startImport()), c && c.addEventListener("click", () => {
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
        window.localStorage.getItem(Li)
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
      s && (s.value = ""), d && T(d), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const p = document.createElement("option");
      p.value = d;
      const c = String(s?.email || "").trim(), S = String(s?.status || "").trim(), w = c || d || "Default account";
      p.textContent = S && S !== "connected" ? `${w} (${S})` : w, d === this.currentAccountId && (p.selected = !0), e.appendChild(p);
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
      this.currentAccountId ? window.localStorage.setItem(Li, this.currentAccountId) : window.localStorage.removeItem(Li);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : T(e)), t) {
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
      n.id.replace("panel-", "") === e ? $(n) : T(n);
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: s } = this.elements, d = e?.files?.[0];
    if (d && this.validateFile(d)) {
      if (this.showPreview(d), n && (n.value = ""), s && (s.value = d.name), t && !t.value.trim()) {
        const p = d.name.replace(/\.pdf$/i, "");
        t.value = p;
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
      `File is too large (${Vn(e.size)}). Maximum size is ${Vn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: d, uploadZone: p } = this.elements;
    s && (s.textContent = e.name), d && (d.textContent = Vn(e.size)), t && T(t), n && $(n), p && (p.classList.remove("border-gray-300"), p.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && $(e), t && T(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    e && (e.textContent = "", T(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, d = t?.value.trim().length ?? !1, p = s && d;
    n && (n.disabled = !p, n.setAttribute("aria-disabled", String(!p)));
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
    const p = new FormData();
    p.append("file", e);
    const c = await fetch(d.toString(), {
      method: "POST",
      body: p,
      credentials: "same-origin"
    }), S = await c.json().catch(() => ({}));
    if (!c.ok) {
      const _ = S?.error?.message || S?.message || "Upload failed. Please try again.";
      throw new Error(_);
    }
    const w = S?.object_key ? String(S.object_key).trim() : "";
    if (!w)
      throw new Error("Upload failed: missing source object key.");
    const E = S?.source_original_name ? String(S.source_original_name).trim() : S?.original_name ? String(S.original_name).trim() : e.name;
    return {
      objectKey: w,
      sourceOriginalName: E
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: s, sourceOriginalNameInput: d } = this.elements, p = t?.files?.[0];
    if (!(!p || !this.validateFile(p))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const c = await this.uploadSourcePDF(p);
        s && (s.value = c.objectKey), d && (d.value = c.sourceOriginalName || p.name), n?.submit();
      } catch (c) {
        const S = c instanceof Error ? c.message : "Upload failed. Please try again.";
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), p = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), w = Array.isArray(e.parents) ? e.parents : c ? [c] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: d,
      webViewLink: p,
      parents: w,
      owners: E
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === Ti;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === _i;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === cs;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Fr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Ti ? "Google Document" : t === _i ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === cs ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: s, append: d } = e, { fileList: p } = this.elements;
    !d && p && (p.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let c;
      n ? (c = this.buildScopedAPIURL("/esign/google-drive/search"), c.searchParams.set("q", n), c.searchParams.set("page_size", "20"), s && c.searchParams.set("page_token", s)) : (c = this.buildScopedAPIURL("/esign/google-drive/browse"), c.searchParams.set("page_size", "20"), t && t !== "root" && c.searchParams.set("folder_id", t), s && c.searchParams.set("page_token", s));
      const S = await fetch(c.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), w = await S.json();
      if (!S.ok)
        throw new Error(w.error?.message || "Failed to load files");
      const E = Array.isArray(w.files) ? w.files.map((B) => this.normalizeDriveFile(B)) : [];
      this.nextPageToken = w.next_page_token || null, d ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(d);
      const { resultCount: _, listTitle: N } = this.elements;
      n && _ ? (_.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, N && (N.textContent = "Search Results")) : (_ && (_.textContent = ""), N && (N.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: R } = this.elements;
      R && (this.nextPageToken ? $(R) : T(R)), Le(`Loaded ${E.length} files`);
    } catch (c) {
      console.error("Error loading files:", c), p && (p.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(c instanceof Error ? c.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), Le(`Error: ${c instanceof Error ? c.message : "Unknown error"}`);
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
      const p = this.getFileIcon(s), c = this.isImportable(s), S = this.isFolder(s), w = this.selectedFile && this.selectedFile.id === s.id, E = !c && !S;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${w ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${E ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${w}"
          data-file-index="${d}"
          ${E ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${p.bg} flex items-center justify-center flex-shrink-0 ${p.text}">
            ${p.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + Xn(s.modifiedTime) : ""}
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
        const d = parseInt(s.dataset.fileIndex || "0", 10), p = this.currentFiles[d];
        this.isFolder(p) ? this.navigateToFolder(p) : this.isImportable(p) && this.selectFile(p);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: n } = this.elements;
    t && (t.value = ""), n && T(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      T(e);
      return;
    }
    $(e);
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
    s && s.querySelectorAll(".file-item").forEach((W) => {
      const ee = parseInt(W.dataset.fileIndex || "0", 10);
      this.currentFiles[ee].id === e.id ? (W.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), W.setAttribute("aria-selected", "true")) : (W.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), W.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: d,
      filePreview: p,
      importStatus: c,
      previewIcon: S,
      previewTitle: w,
      previewType: E,
      importTypeInfo: _,
      importTypeLabel: N,
      importTypeDesc: R,
      snapshotWarning: B,
      importDocumentTitle: V
    } = this.elements;
    d && T(d), p && $(p), c && T(c), S && (S.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, S.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), w && (w.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && _ && (_.className = `p-3 rounded-lg border ${n.bgClass}`, N && (N.textContent = n.label, N.className = `text-xs font-medium ${n.textClass}`), R && (R.textContent = n.desc, R.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? $(B) : T(B))), V && (V.value = e.name || ""), Le(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && $(e), t && T(t), n && T(n), s && s.querySelectorAll(".file-item").forEach((d) => {
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
      t && T(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && T(t), this.searchQuery = "";
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
      importStatusSuccess: p,
      importStatusFailed: c
    } = this.elements;
    switch (t && T(t), n && T(n), s && $(s), d && T(d), p && T(p), c && T(c), e) {
      case "queued":
      case "running":
        d && $(d);
        break;
      case "succeeded":
        p && $(p);
        break;
      case "failed":
        c && $(c);
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
        s.href = this.applyAccountIdToPath(d), $(s);
      } else
        T(s);
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
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && T(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const p = new URL(window.location.href);
      p.searchParams.delete("import_run_id"), window.history.replaceState({}, "", p.toString());
      const c = await fetch(
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
      ), S = await c.json();
      if (!c.ok) {
        const E = S.error?.code || "";
        throw { message: S.error?.message || "Failed to start import", code: E };
      }
      this.currentImportRunId = S.import_run_id, this.pollAttempts = 0;
      const w = new URL(window.location.href);
      this.currentImportRunId && w.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", w.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (p) {
      console.error("Import error:", p);
      const c = p;
      this.showImportError(c.message || "Failed to start import", c.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Rr);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > os) {
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
            const d = n.error?.code || "", p = n.error?.message || "Import failed";
            this.showImportError(p, d), Le("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < os ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function xo(i) {
  const e = new Bi(i);
  return ne(() => e.init()), e;
}
function Io(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new Bi(e);
  ne(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Nr(i) {
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
typeof document < "u" && ne(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Nr(t);
        n && new Bi(n).init();
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
}, Lt = Ae.REVIEW, Ur = {
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
}, Zn = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, Di = /* @__PURE__ */ new Map(), Hr = 30 * 60 * 1e3, ls = {
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
function qr(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function Or(i) {
  const e = i instanceof Error ? i.message : i, t = qr(e);
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
  if (t && ls[t]) {
    const n = ls[t];
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
function ds() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function jr() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function zr() {
  if (!jr())
    throw new Error("PDF preview library unavailable");
}
function Gr(i) {
  const e = Di.get(i);
  return e ? Date.now() - e.timestamp > Hr ? (Di.delete(i), null) : e : null;
}
function Vr(i, e, t) {
  Di.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Wr(i, e = Zn.THUMBNAIL_MAX_WIDTH, t = Zn.THUMBNAIL_MAX_HEIGHT) {
  await zr();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const d = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, p = d.numPages, c = await d.getPage(1), S = c.getViewport({ scale: 1 }), w = e / S.width, E = t / S.height, _ = Math.min(w, E, 1), N = c.getViewport({ scale: _ }), R = document.createElement("canvas");
  R.width = N.width, R.height = N.height;
  const B = R.getContext("2d");
  if (!B)
    throw new Error("Failed to get canvas context");
  return await c.render({
    canvasContext: B,
    viewport: N
  }).promise, { dataUrl: R.toDataURL("image/jpeg", 0.8), pageCount: p };
}
class Jr {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || Zn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || Zn.THUMBNAIL_MAX_HEIGHT
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
    const d = Gr(e);
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
      const p = await this.fetchDocumentPdfUrl(e);
      if (s !== this.requestVersion)
        return;
      const { dataUrl: c, pageCount: S } = await Wr(
        p,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      Vr(e, c, S), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? S,
        thumbnailUrl: c,
        isLoading: !1,
        error: null
      };
    } catch (p) {
      if (s !== this.requestVersion)
        return;
      const c = p instanceof Error ? p.message : "Failed to load preview", S = Or(c);
      ds() && console.error("Failed to load document preview:", p), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: c,
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
    const { container: e, thumbnail: t, title: n, pageCount: s, loadingState: d, errorState: p, emptyState: c, contentState: S } = this.elements;
    if (e) {
      if (d?.classList.add("hidden"), p?.classList.add("hidden"), c?.classList.add("hidden"), S?.classList.add("hidden"), !this.state.documentId) {
        c?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        d?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        p?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (ds() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function Yr(i = {}) {
  const e = new Jr(i);
  return e.init(), e;
}
function Kr() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function Xr() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Qr(i, e) {
  return {
    id: Kr(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function us(i, e) {
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
function ps(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function gs(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Ps(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function Zr(i, e) {
  const t = Ps(i, e.definitionId);
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
function ea(i, e, t, n) {
  const s = /* @__PURE__ */ new Set();
  for (const d of t)
    s.add(d.definitionId);
  for (const [d, p] of n) {
    if (p.page !== e || s.has(d) || i.unlinkedDefinitions.has(d)) continue;
    const c = i.definitionToGroup.get(d);
    if (!c) continue;
    const S = i.groups.get(c);
    if (!S || !S.isActive || !S.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: d,
      type: p.type,
      participantId: p.participantId,
      participantName: p.participantName,
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
const ms = 150, hs = 32;
function oe(i) {
  return i == null ? "" : String(i).trim();
}
function Ts(i) {
  if (typeof i == "boolean") return i;
  const e = oe(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function _s(i) {
  return oe(i).toLowerCase();
}
function pe(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(oe(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Gn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(oe(i));
  return Number.isFinite(t) ? t : e;
}
function Wn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function Ct(i, e) {
  const t = pe(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function bn(i, e, t = 1) {
  const n = pe(t, 1), s = pe(i, n);
  return e > 0 ? Wn(s, 1, e) : s > 0 ? s : n;
}
function ta(i, e, t) {
  const n = pe(t, 1);
  let s = Ct(i, n), d = Ct(e, n);
  return s <= 0 && (s = 1), d <= 0 && (d = n), d < s ? { start: d, end: s } : { start: s, end: d };
}
function xn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => oe(n)) : oe(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = pe(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function Jn(i, e) {
  const t = pe(e, 1), n = oe(i.participantId ?? i.participant_id), s = xn(i.excludePages ?? i.exclude_pages), d = i.required, p = typeof d == "boolean" ? d : !["0", "false", "off", "no"].includes(oe(d).toLowerCase());
  return {
    id: oe(i.id),
    type: _s(i.type),
    participantId: n,
    participantTempId: oe(i.participantTempId) || n,
    fromPage: Ct(i.fromPage ?? i.from_page, t),
    toPage: Ct(i.toPage ?? i.to_page, t),
    page: Ct(i.page, t),
    excludeLastPage: Ts(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: p
  };
}
function na(i) {
  return {
    id: oe(i.id),
    type: _s(i.type),
    participant_id: oe(i.participantId),
    from_page: Ct(i.fromPage, 0),
    to_page: Ct(i.toPage, 0),
    page: Ct(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: xn(i.excludePages),
    required: i.required !== !1
  };
}
function ia(i, e) {
  const t = oe(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function sa(i, e) {
  const t = pe(e, 1), n = [];
  return i.forEach((s, d) => {
    const p = Jn(s || {}, t);
    if (p.type === "") return;
    const c = ia(p, d);
    if (p.type === "initials_each_page") {
      const S = ta(p.fromPage, p.toPage, t), w = /* @__PURE__ */ new Set();
      xn(p.excludePages).forEach((E) => {
        E <= t && w.add(E);
      }), p.excludeLastPage && w.add(t);
      for (let E = S.start; E <= S.end; E += 1)
        w.has(E) || n.push({
          id: `${c}-initials-${E}`,
          type: "initials",
          page: E,
          participantId: oe(p.participantId),
          required: p.required !== !1,
          ruleId: c
          // Phase 3: Track rule ID for link group creation
        });
      return;
    }
    if (p.type === "signature_once") {
      let S = p.page > 0 ? p.page : p.toPage > 0 ? p.toPage : t;
      S <= 0 && (S = 1), n.push({
        id: `${c}-signature-${S}`,
        type: "signature",
        page: S,
        participantId: oe(p.participantId),
        required: p.required !== !1,
        ruleId: c
        // Phase 3: Track rule ID for link group creation
      });
    }
  }), n.sort((s, d) => s.page !== d.page ? s.page - d.page : s.id.localeCompare(d.id)), n;
}
function ra(i, e, t, n, s) {
  const d = pe(t, 1);
  let p = i > 0 ? i : 1, c = e > 0 ? e : d;
  p = Wn(p, 1, d), c = Wn(c, 1, d), c < p && ([p, c] = [c, p]);
  const S = /* @__PURE__ */ new Set();
  s.forEach((E) => {
    const _ = pe(E, 0);
    _ > 0 && S.add(Wn(_, 1, d));
  }), n && S.add(d);
  const w = [];
  for (let E = p; E <= c; E += 1)
    S.has(E) || w.push(E);
  return {
    pages: w,
    rangeStart: p,
    rangeEnd: c,
    excludedPages: Array.from(S).sort((E, _) => E - _),
    isEmpty: w.length === 0
  };
}
function aa(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const d = e[n], p = e[s - 1];
      d === p ? t.push(String(d)) : p === d + 1 ? t.push(`${d}, ${p}`) : t.push(`${d}-${p}`), n = s;
    }
  return `pages ${t.join(", ")}`;
}
function Ci(i) {
  const e = i || {};
  return {
    id: oe(e.id),
    title: oe(e.title || e.name) || "Untitled",
    pageCount: pe(e.page_count ?? e.pageCount, 0),
    compatibilityTier: oe(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: oe(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Ds(i) {
  const e = oe(i).toLowerCase();
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
function Yn(i, e = 0) {
  const t = i || {}, n = oe(t.id) || `fi_init_${e}`, s = oe(t.definitionId || t.definition_id || t.field_definition_id) || n, d = pe(t.page ?? t.page_number, 1), p = Gn(t.x ?? t.pos_x, 0), c = Gn(t.y ?? t.pos_y, 0), S = Gn(t.width, ms), w = Gn(t.height, hs);
  return {
    id: n,
    definitionId: s,
    type: oe(t.type) || "text",
    participantId: oe(t.participantId || t.participant_id),
    participantName: oe(t.participantName || t.participant_name) || "Unassigned",
    page: d > 0 ? d : 1,
    x: p >= 0 ? p : 0,
    y: c >= 0 ? c : 0,
    width: S > 0 ? S : ms,
    height: w > 0 ? w : hs,
    placementSource: Ds(t.placementSource || t.placement_source),
    linkGroupId: oe(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: oe(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: Ts(t.isUnlinked ?? t.is_unlinked)
  };
}
function fs(i, e = 0) {
  const t = Yn(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Ds(t.placementSource),
    link_group_id: oe(t.linkGroupId),
    linked_from_field_id: oe(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function oa(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), d = /\/v\d+$/i.test(s) ? s : `${s}/v1`, p = `${d}/esign/drafts`, c = !!e.is_edit, S = !!e.create_success, w = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), _ = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, N = Array.isArray(e.initial_participants) ? e.initial_participants : [], R = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(o) {
    if (!w) return o;
    const a = o.includes("?") ? "&" : "?";
    return `${o}${a}user_id=${encodeURIComponent(w)}`;
  }
  function V(o = !0) {
    const a = { Accept: "application/json" };
    return o && (a["Content-Type"] = "application/json"), w && (a["X-User-ID"] = w), a;
  }
  const W = 1, ee = c ? "edit" : "create", ce = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), he = [
    ee,
    w || "anonymous",
    ce || "agreement-form"
  ].join("|"), le = `esign_wizard_state_v1:${encodeURIComponent(he)}`, Pe = `esign_wizard_sync:${encodeURIComponent(he)}`, Ne = "esign_wizard_state_v1", Je = 2e3, Ue = [1e3, 2e3, 5e3, 1e4, 3e4], $e = 1, ie = {
    USER: "user",
    AUTOFILL: "autofill",
    SERVER_SEED: "server_seed"
  };
  function Se(o, a = {}) {
    const l = String(o || "").trim();
    if (!l || typeof window > "u") return;
    const m = window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {};
    m[l] = Number(m[l] || 0) + 1, window.dispatchEvent(new CustomEvent("esign:wizard-telemetry", {
      detail: {
        event: l,
        count: m[l],
        fields: a,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
  }
  function sn(o, a = 0) {
    if (!o || typeof o != "object") return !1;
    const l = String(o.name ?? "").trim(), m = String(o.email ?? "").trim(), v = String(o.role ?? "signer").trim().toLowerCase(), b = Number.parseInt(String(o.signingStage ?? o.signing_stage ?? 1), 10), L = o.notify !== !1;
    return l !== "" || m !== "" || v !== "" && v !== "signer" || Number.isFinite(b) && b > 1 || !L ? !0 : a > 0;
  }
  function kt(o) {
    if (!o || typeof o != "object") return !1;
    const a = Number.parseInt(String(o.currentStep ?? 1), 10);
    if (Number.isFinite(a) && a > 1 || String(o.document?.id ?? "").trim() !== "") return !0;
    const m = String(o.details?.title ?? "").trim(), v = String(o.details?.message ?? "").trim(), b = gt(o.titleSource, m === "" ? ie.AUTOFILL : ie.USER);
    return !!(m !== "" && b !== ie.SERVER_SEED || v !== "" || (Array.isArray(o.participants) ? o.participants : []).some((D, A) => sn(D, A)) || Array.isArray(o.fieldDefinitions) && o.fieldDefinitions.length > 0 || Array.isArray(o.fieldPlacements) && o.fieldPlacements.length > 0 || Array.isArray(o.fieldRules) && o.fieldRules.length > 0);
  }
  function gt(o, a = ie.AUTOFILL) {
    const l = String(o || "").trim().toLowerCase();
    return l === ie.USER ? ie.USER : l === ie.SERVER_SEED ? ie.SERVER_SEED : l === ie.AUTOFILL ? ie.AUTOFILL : a;
  }
  class ti {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.migrateLegacyStateIfNeeded(), this.state = this.loadFromSession() || this.createInitialState();
    }
    createInitialState() {
      return {
        wizardId: this.generateWizardId(),
        version: W,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        currentStep: 1,
        document: { id: null, title: null, pageCount: null },
        details: { title: "", message: "" },
        participants: [],
        fieldDefinitions: [],
        fieldPlacements: [],
        fieldRules: [],
        titleSource: ie.AUTOFILL,
        storageMigrationVersion: $e,
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
      try {
        const a = sessionStorage.getItem(le), l = sessionStorage.getItem(Ne);
        if (!l) return;
        if (a) {
          sessionStorage.removeItem(Ne);
          return;
        }
        const m = JSON.parse(l), v = this.normalizeLoadedState({
          ...m,
          storageMigrationVersion: $e
        });
        sessionStorage.setItem(le, JSON.stringify(v)), sessionStorage.removeItem(Ne), Se("wizard_resume_migration_used", {
          from: Ne,
          to: le
        });
      } catch {
        sessionStorage.removeItem(Ne);
      }
    }
    loadFromSession() {
      try {
        const a = sessionStorage.getItem(le);
        if (!a) return null;
        const l = JSON.parse(a);
        return l.version !== W ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(l)) : this.normalizeLoadedState(l);
      } catch (a) {
        return console.error("Failed to load wizard state from session:", a), null;
      }
    }
    normalizeLoadedState(a) {
      if (!a || typeof a != "object")
        return this.createInitialState();
      const l = this.createInitialState(), m = { ...l, ...a }, v = Number.parseInt(String(a.currentStep ?? l.currentStep), 10);
      m.currentStep = Number.isFinite(v) ? Math.min(Math.max(v, 1), Lt) : l.currentStep;
      const b = a.document && typeof a.document == "object" ? a.document : {}, L = b.id;
      m.document = {
        id: L == null ? null : String(L).trim() || null,
        title: String(b.title ?? "").trim() || null,
        pageCount: pe(b.pageCount, 0) || null
      };
      const P = a.details && typeof a.details == "object" ? a.details : {}, D = String(P.title ?? "").trim(), A = D === "" ? ie.AUTOFILL : ie.USER;
      m.details = {
        title: D,
        message: String(P.message ?? "")
      }, m.participants = Array.isArray(a.participants) ? a.participants : [], m.fieldDefinitions = Array.isArray(a.fieldDefinitions) ? a.fieldDefinitions : [], m.fieldPlacements = Array.isArray(a.fieldPlacements) ? a.fieldPlacements : [], m.fieldRules = Array.isArray(a.fieldRules) ? a.fieldRules : [];
      const I = String(a.wizardId ?? "").trim();
      m.wizardId = I || l.wizardId, m.version = W, m.createdAt = String(a.createdAt ?? l.createdAt), m.updatedAt = String(a.updatedAt ?? l.updatedAt), m.titleSource = gt(a.titleSource, A), m.storageMigrationVersion = pe(
        a.storageMigrationVersion,
        $e
      ) || $e;
      const U = String(a.serverDraftId ?? "").trim();
      return m.serverDraftId = U || null, m.serverRevision = pe(a.serverRevision, 0), m.lastSyncedAt = String(a.lastSyncedAt ?? "").trim() || null, m.syncPending = !!a.syncPending, m;
    }
    migrateState(a) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.storageMigrationVersion = $e, sessionStorage.setItem(le, JSON.stringify(this.state));
      } catch (a) {
        console.error("Failed to save wizard state to session:", a);
      }
    }
    getState() {
      return this.state;
    }
    setState(a, l = {}) {
      this.state = this.normalizeLoadedState(a), l.syncPending === !0 ? this.state.syncPending = !0 : l.syncPending === !1 && (this.state.syncPending = !1), l.save !== !1 && this.saveToSession(), l.notify !== !1 && this.notifyListeners();
    }
    updateState(a) {
      this.setState(
        { ...this.state, ...a, syncPending: !0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
        { syncPending: !0 }
      );
    }
    updateStep(a) {
      this.updateState({ currentStep: a });
    }
    updateDocument(a) {
      this.updateState({ document: { ...this.state.document, ...a } });
    }
    updateDetails(a, l = {}) {
      const m = {
        details: { ...this.state.details, ...a }
      };
      Object.prototype.hasOwnProperty.call(l, "titleSource") ? m.titleSource = gt(l.titleSource, this.state.titleSource) : Object.prototype.hasOwnProperty.call(a || {}, "title") && (m.titleSource = ie.USER), this.updateState(m);
    }
    setTitleSource(a, l = {}) {
      const m = gt(a, this.state.titleSource);
      if (m !== this.state.titleSource) {
        if (l.syncPending === !1) {
          this.setState({ ...this.state, titleSource: m }, { syncPending: !1 });
          return;
        }
        this.updateState({ titleSource: m });
      }
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
    markSynced(a, l) {
      this.setState({
        ...this.state,
        serverDraftId: a,
        serverRevision: l,
        lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
        syncPending: !1
      }, { syncPending: !1 });
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(le), sessionStorage.removeItem(Ne), this.notifyListeners();
    }
    hasResumableState() {
      return kt(this.state);
    }
    onStateChange(a) {
      return this.listeners.push(a), () => {
        this.listeners = this.listeners.filter((l) => l !== a);
      };
    }
    notifyListeners() {
      this.listeners.forEach((a) => a(this.state));
    }
    collectFormState() {
      const a = document.getElementById("document_id")?.value || null, l = document.getElementById("selected-document-title")?.textContent?.trim() || null, m = document.getElementById("title"), v = document.getElementById("message"), b = gt(
        this.state?.titleSource,
        String(m?.value || "").trim() === "" ? ie.AUTOFILL : ie.USER
      ), L = [];
      document.querySelectorAll(".participant-entry").forEach((I) => {
        const U = I.getAttribute("data-participant-id"), q = I.querySelector('input[name*=".name"]')?.value || "", G = I.querySelector('input[name*=".email"]')?.value || "", O = I.querySelector('select[name*=".role"]')?.value || "signer", z = parseInt(I.querySelector(".signing-stage-input")?.value || "1", 10), X = I.querySelector(".notify-input")?.checked !== !1;
        L.push({ tempId: U, name: q, email: G, role: O, notify: X, signingStage: z });
      });
      const P = [];
      document.querySelectorAll(".field-definition-entry").forEach((I) => {
        const U = I.getAttribute("data-field-definition-id"), q = I.querySelector(".field-type-select")?.value || "signature", G = I.querySelector(".field-participant-select")?.value || "", O = parseInt(I.querySelector('input[name*=".page"]')?.value || "1", 10), z = I.querySelector('input[name*=".required"]')?.checked ?? !0;
        P.push({ tempId: U, type: q, participantTempId: G, page: O, required: z });
      });
      const D = Ze(), A = parseInt(Ge?.value || "0", 10) || null;
      return {
        document: { id: a, title: l, pageCount: A },
        details: {
          title: m?.value || "",
          message: v?.value || ""
        },
        titleSource: b,
        participants: L,
        fieldDefinitions: P,
        fieldPlacements: k?.fieldInstances || [],
        fieldRules: D
      };
    }
    restoreFormState() {
      const a = this.state;
      if (!a) return;
      if (a.document.id) {
        const v = document.getElementById("document_id"), b = document.getElementById("selected-document"), L = document.getElementById("document-picker"), P = document.getElementById("selected-document-title"), D = document.getElementById("selected-document-info");
        v && (v.value = a.document.id), P && (P.textContent = a.document.title || "Selected Document"), D && (D.textContent = a.document.pageCount ? `${a.document.pageCount} pages` : ""), Ge && a.document.pageCount && (Ge.value = String(a.document.pageCount)), b && b.classList.remove("hidden"), L && L.classList.add("hidden");
      }
      const l = document.getElementById("title"), m = document.getElementById("message");
      l && (l.value = a.details.title || ""), m && (m.value = a.details.message || "");
    }
  }
  class ni {
    constructor(a) {
      this.stateManager = a, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(a) {
      const l = {
        wizard_id: a.wizardId,
        wizard_state: a,
        title: a.details.title || "Untitled Agreement",
        current_step: a.currentStep,
        document_id: a.document.id || null,
        created_by_user_id: w
      }, m = await fetch(B(p), {
        method: "POST",
        credentials: "same-origin",
        headers: V(),
        body: JSON.stringify(l)
      });
      if (!m.ok) {
        const v = await m.json().catch(() => ({}));
        throw new Error(v.error?.message || `HTTP ${m.status}`);
      }
      return m.json();
    }
    async update(a, l, m) {
      const v = {
        expected_revision: m,
        wizard_state: l,
        title: l.details.title || "Untitled Agreement",
        current_step: l.currentStep,
        document_id: l.document.id || null,
        updated_by_user_id: w
      }, b = await fetch(B(`${p}/${a}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: V(),
        body: JSON.stringify(v)
      });
      if (b.status === 409) {
        const L = await b.json().catch(() => ({})), P = new Error("stale_revision");
        throw P.code = "stale_revision", P.currentRevision = L.error?.details?.current_revision, P;
      }
      if (!b.ok) {
        const L = await b.json().catch(() => ({}));
        throw new Error(L.error?.message || `HTTP ${b.status}`);
      }
      return b.json();
    }
    async load(a) {
      const l = await fetch(B(`${p}/${a}`), {
        credentials: "same-origin",
        headers: V(!1)
      });
      if (!l.ok) {
        const m = new Error(`HTTP ${l.status}`);
        throw m.status = l.status, m;
      }
      return l.json();
    }
    async delete(a) {
      const l = await fetch(B(`${p}/${a}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: V(!1)
      });
      if (!l.ok && l.status !== 404)
        throw new Error(`HTTP ${l.status}`);
    }
    async list() {
      const a = await fetch(B(`${p}?limit=10`), {
        credentials: "same-origin",
        headers: V(!1)
      });
      if (!a.ok)
        throw new Error(`HTTP ${a.status}`);
      return a.json();
    }
    async sync() {
      const a = this.stateManager.getState();
      if (a.syncPending)
        try {
          let l;
          return a.serverDraftId ? l = await this.update(a.serverDraftId, a, a.serverRevision) : l = await this.create(a), this.stateManager.markSynced(l.id, l.revision), this.retryCount = 0, { success: !0, result: l };
        } catch (l) {
          return l.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: l.currentRevision } : { success: !1, error: l.message };
        }
    }
  }
  class In {
    constructor(a, l, m) {
      this.stateManager = a, this.syncService = l, this.statusUpdater = m, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(Pe), this.channel.onmessage = (a) => this.handleChannelMessage(a.data), this.channel.postMessage({ type: "presence", tabId: this.getTabId() });
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
            const l = this.stateManager.loadFromSession();
            l && (this.stateManager.setState(l, { syncPending: !!l.syncPending, notify: !1 }), Ln({}).then(() => {
              this.stateManager.notifyListeners();
            }));
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
    broadcastSyncCompleted(a, l) {
      this.channel?.postMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: a,
        revision: l
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
      }, Je);
    }
    async forceSync(a = {}) {
      this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
      const l = a && a.keepalive === !0, m = this.stateManager.getState();
      if (!l) {
        await this.performSync();
        return;
      }
      if (m.syncPending && m.serverDraftId) {
        const v = JSON.stringify({
          expected_revision: m.serverRevision,
          wizard_state: m,
          title: m.details.title || "Untitled Agreement",
          current_step: m.currentStep,
          document_id: m.document.id || null,
          updated_by_user_id: w
        });
        try {
          const b = await fetch(B(`${p}/${m.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: V(),
            body: v,
            keepalive: !0
          });
          if (b.status === 409) {
            const A = await b.json().catch(() => ({})), I = Number(A?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(I > 0 ? I : m.serverRevision);
            return;
          }
          if (!b.ok)
            throw new Error(`HTTP ${b.status}`);
          const L = await b.json().catch(() => ({})), P = String(L?.id || L?.draft_id || m.serverDraftId || "").trim(), D = Number(L?.revision || 0);
          if (P && Number.isFinite(D) && D > 0) {
            this.stateManager.markSynced(P, D), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(P, D);
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
      const l = await this.syncService.sync();
      this.isSyncing = !1, l.success ? (this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(l.result.id, l.result.revision)) : l.conflict ? (this.statusUpdater("conflict"), this.showConflictDialog(l.currentRevision)) : (this.statusUpdater("error"), this.scheduleRetry());
    }
    scheduleRetry() {
      if (this.retryCount >= Ue.length) {
        console.error("Max sync retries reached");
        return;
      }
      const a = Ue[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, a);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(a) {
      const l = document.getElementById("conflict-dialog-modal"), m = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = En(m.updatedAt), document.getElementById("conflict-server-revision").textContent = a, document.getElementById("conflict-server-time").textContent = "newer version", l?.classList.remove("hidden");
    }
  }
  function En(o) {
    if (!o) return "unknown";
    const a = new Date(o), m = /* @__PURE__ */ new Date() - a, v = Math.floor(m / 6e4), b = Math.floor(m / 36e5), L = Math.floor(m / 864e5);
    return v < 1 ? "just now" : v < 60 ? `${v} minute${v !== 1 ? "s" : ""} ago` : b < 24 ? `${b} hour${b !== 1 ? "s" : ""} ago` : L < 7 ? `${L} day${L !== 1 ? "s" : ""} ago` : a.toLocaleDateString();
  }
  function ii(o) {
    const a = document.getElementById("sync-status-indicator"), l = document.getElementById("sync-status-icon"), m = document.getElementById("sync-status-text"), v = document.getElementById("sync-retry-btn");
    if (!(!a || !l || !m))
      switch (a.classList.remove("hidden"), o) {
        case "saved":
          l.className = "w-2 h-2 rounded-full bg-green-500", m.textContent = "Saved", m.className = "text-gray-600", v?.classList.add("hidden");
          break;
        case "saving":
          l.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", m.textContent = "Saving...", m.className = "text-gray-600", v?.classList.add("hidden");
          break;
        case "pending":
          l.className = "w-2 h-2 rounded-full bg-gray-400", m.textContent = "Unsaved changes", m.className = "text-gray-500", v?.classList.add("hidden");
          break;
        case "error":
          l.className = "w-2 h-2 rounded-full bg-amber-500", m.textContent = "Not synced", m.className = "text-amber-600", v?.classList.remove("hidden");
          break;
        case "conflict":
          l.className = "w-2 h-2 rounded-full bg-red-500", m.textContent = "Conflict", m.className = "text-red-600", v?.classList.add("hidden");
          break;
        default:
          a.classList.add("hidden");
      }
  }
  const H = new ti(), Ye = new ni(H), Te = new In(H, Ye, ii), At = Yr({
    apiBasePath: d,
    basePath: t
  });
  if (S) {
    const a = H.getState()?.serverDraftId;
    H.clear(), Te.broadcastStateUpdate(), a && Ye.delete(a).catch((l) => {
      console.warn("Failed to delete server draft after successful create:", l);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    Te.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const o = H.getState();
    if (o.serverDraftId)
      try {
        const a = await Ye.load(o.serverDraftId);
        a.wizard_state && (H.setState({
          ...a.wizard_state,
          serverDraftId: a.id,
          serverRevision: a.revision,
          syncPending: !1
        }, { syncPending: !1 }), window.location.reload());
      } catch (a) {
        console.error("Failed to load server draft:", a);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const o = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    H.setState({
      ...H.getState(),
      serverRevision: o,
      syncPending: !0
    }, { syncPending: !0 }), Te.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function si(o, a) {
    return H.normalizeLoadedState({
      ...a,
      currentStep: o.currentStep,
      document: o.document,
      details: o.details,
      participants: o.participants,
      fieldDefinitions: o.fieldDefinitions,
      fieldPlacements: o.fieldPlacements,
      fieldRules: o.fieldRules,
      titleSource: o.titleSource,
      syncPending: !0,
      serverDraftId: a.serverDraftId,
      serverRevision: a.serverRevision,
      lastSyncedAt: a.lastSyncedAt
    });
  }
  async function Ln(o = {}) {
    if (c) return H.getState();
    const a = H.normalizeLoadedState(H.getState()), l = String(a?.serverDraftId || "").trim();
    if (!l)
      return H.setState(a, { syncPending: !!a.syncPending, notify: !1 }), H.getState();
    try {
      const m = await Ye.load(l), v = H.normalizeLoadedState({
        ...m?.wizard_state && typeof m.wizard_state == "object" ? m.wizard_state : {},
        serverDraftId: String(m?.id || l).trim() || l,
        serverRevision: Number(m?.revision || 0),
        lastSyncedAt: String(m?.updated_at || m?.updatedAt || "").trim() || a.lastSyncedAt,
        syncPending: !1
      }), L = String(a.serverDraftId || "").trim() === String(v.serverDraftId || "").trim() && a.syncPending === !0 ? si(a, v) : v;
      return H.setState(L, { syncPending: !!L.syncPending, notify: !1 }), H.getState();
    } catch (m) {
      if (Number(m?.status || 0) === 404) {
        const v = H.normalizeLoadedState({
          ...a,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return H.setState(v, { syncPending: !!v.syncPending, notify: !1 }), H.getState();
      }
      return H.getState();
    }
  }
  function ri() {
    const o = document.getElementById("resume-dialog-modal"), a = H.getState(), l = String(a?.document?.title || "").trim() || String(a?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = a.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = l, document.getElementById("resume-draft-step").textContent = a.currentStep, document.getElementById("resume-draft-time").textContent = En(a.updatedAt), o?.classList.remove("hidden"), Se("wizard_resume_prompt_shown", {
      step: Number(a.currentStep || 1),
      has_server_draft: !!a.serverDraftId
    });
  }
  async function qt(o = {}) {
    const a = o.deleteServerDraft === !0, l = String(H.getState()?.serverDraftId || "").trim();
    if (H.clear(), Te.broadcastStateUpdate(), !(!a || !l))
      try {
        await Ye.delete(l);
      } catch (m) {
        console.warn("Failed to delete server draft:", m);
      }
  }
  function Cn() {
    return H.normalizeLoadedState({
      ...H.getState(),
      ...H.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function rn(o) {
    kt(o) && (H.setState(o, { syncPending: !0 }), Te.scheduleSync(), Te.broadcastStateUpdate());
  }
  async function Ot(o) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const a = Cn();
    switch (o) {
      case "continue":
        H.restoreFormState(), window._resumeToStep = H.getState().currentStep;
        return;
      case "start_new":
        await qt({ deleteServerDraft: !1 }), rn(a);
        return;
      case "proceed":
        await qt({ deleteServerDraft: !0 }), rn(a);
        return;
      case "discard":
        await qt({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    Ot("continue");
  }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
    Ot("proceed");
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    Ot("start_new");
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
    Ot("discard");
  });
  async function ai() {
    c || (await Ln({}), H.hasResumableState() && ri());
  }
  ai();
  function mt() {
    const o = H.collectFormState();
    H.updateState(o), Te.scheduleSync(), Te.broadcastStateUpdate();
  }
  const be = document.getElementById("document_id"), Pt = document.getElementById("selected-document"), Tt = document.getElementById("document-picker"), ye = document.getElementById("document-search"), Ke = document.getElementById("document-list"), kn = document.getElementById("change-document-btn"), _e = document.getElementById("selected-document-title"), st = document.getElementById("selected-document-info"), Ge = document.getElementById("document_page_count"), _t = document.getElementById("document-remediation-panel"), an = document.getElementById("document-remediation-message"), He = document.getElementById("document-remediation-status"), xe = document.getElementById("document-remediation-trigger-btn"), An = document.getElementById("document-remediation-dismiss-btn"), Pn = document.getElementById("title");
  !c && Pn && Pn.value.trim() !== "" && !H.hasResumableState() && H.setTitleSource(ie.SERVER_SEED, { syncPending: !1 });
  let ht = [], rt = null;
  const on = /* @__PURE__ */ new Set(), Tn = /* @__PURE__ */ new Map();
  function ft(o) {
    return String(o || "").trim().toLowerCase();
  }
  function Xe(o) {
    return String(o || "").trim().toLowerCase();
  }
  function Ve(o) {
    return ft(o) === "unsupported";
  }
  function jt() {
    be && (be.value = ""), _e && (_e.textContent = ""), st && (st.textContent = ""), yt(0), H.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), At.setDocument(null, null, null);
  }
  function Dt(o = "") {
    const a = "This document cannot be used because its PDF is incompatible with online signing.", l = Xe(o);
    return l ? `${a} Reason: ${l}. Select another document or upload a remediated PDF.` : `${a} Select another document or upload a remediated PDF.`;
  }
  function zt() {
    rt = null, He && (He.textContent = "", He.className = "mt-2 text-xs text-amber-800"), _t && _t.classList.add("hidden"), xe && (xe.disabled = !1, xe.textContent = "Remediate PDF");
  }
  function at(o, a = "info") {
    if (!He) return;
    const l = String(o || "").trim();
    He.textContent = l;
    const m = a === "error" ? "text-red-700" : a === "success" ? "text-green-700" : "text-amber-800";
    He.className = `mt-2 text-xs ${m}`;
  }
  function cn(o, a = "") {
    !o || !_t || !an || (rt = {
      id: String(o.id || "").trim(),
      title: String(o.title || "").trim(),
      pageCount: pe(o.pageCount, 0),
      compatibilityReason: Xe(a || o.compatibilityReason || "")
    }, rt.id && (an.textContent = Dt(rt.compatibilityReason), at("Run remediation to make this document signable."), _t.classList.remove("hidden")));
  }
  function ln(o, a, l) {
    be.value = o, _e.textContent = a || "", st.textContent = `${l} pages`, yt(l), Pt.classList.remove("hidden"), Tt.classList.add("hidden"), St(), ci(a);
    const m = pe(l, 0);
    H.updateDocument({
      id: o,
      title: a,
      pageCount: m
    }), At.setDocument(o, a, m), zt();
  }
  async function dn(o, a, l) {
    const m = String(o || "").trim();
    if (!m) return;
    const v = Date.now(), b = 12e4, L = 1250;
    for (; Date.now() - v < b; ) {
      const P = await fetch(m, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!P.ok)
        throw await yn(P, "Failed to read remediation status");
      const A = (await P.json())?.dispatch || {}, I = String(A?.status || "").trim().toLowerCase();
      if (I === "succeeded") {
        at("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (I === "failed" || I === "canceled" || I === "dead_letter") {
        const q = String(A?.terminal_reason || "").trim();
        throw { message: q ? `Remediation failed: ${q}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      at(I === "retrying" ? "Remediation is retrying in the queue..." : I === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((q) => setTimeout(q, L));
    }
    throw { message: `Timed out waiting for remediation dispatch ${a} (${l})`, code: "REMEDIATION_TIMEOUT", status: 504 };
  }
  async function _n() {
    const o = rt;
    if (!o || !o.id) return;
    const a = String(o.id || "").trim();
    if (!(!a || on.has(a))) {
      on.add(a), xe && (xe.disabled = !0, xe.textContent = "Remediating...");
      try {
        let l = Tn.get(a) || "";
        l || (l = `esign-remediate-${a}-${Date.now()}`, Tn.set(a, l));
        const m = `${d}/esign/documents/${encodeURIComponent(a)}/remediate`, v = await fetch(m, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": l
          }
        });
        if (!v.ok)
          throw await yn(v, "Failed to trigger remediation");
        const b = await v.json(), L = b?.receipt || {}, P = String(L?.dispatch_id || b?.dispatch_id || "").trim(), D = String(L?.mode || b?.mode || "").trim().toLowerCase();
        let A = String(b?.dispatch_status_url || "").trim();
        !A && P && (A = `${d}/esign/dispatches/${encodeURIComponent(P)}`), D === "queued" && P && A && (at("Remediation queued. Monitoring progress..."), await dn(A, P, a)), await Gt();
        const I = Mt(a);
        if (!I || Ve(I.compatibilityTier)) {
          at("Remediation finished, but this PDF is still incompatible.", "error"), ve("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        ln(I.id, I.title, I.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : Xt("Document remediated successfully. You can continue.", "success");
      } catch (l) {
        at(String(l?.message || "Remediation failed").trim(), "error"), ve(l?.message || "Failed to remediate document", l?.code || "", l?.status || 0);
      } finally {
        on.delete(a), xe && (xe.disabled = !1, xe.textContent = "Remediate PDF");
      }
    }
  }
  function Mt(o) {
    const a = String(o || "").trim();
    if (a === "") return null;
    const l = ht.find((b) => String(b.id || "").trim() === a);
    if (l) return l;
    const m = j.recentDocuments.find((b) => String(b.id || "").trim() === a);
    if (m) return m;
    const v = j.searchResults.find((b) => String(b.id || "").trim() === a);
    return v || null;
  }
  function Dn() {
    const o = Mt(be?.value || "");
    if (!o) return !0;
    const a = ft(o.compatibilityTier);
    return Ve(a) ? (cn(o, o.compatibilityReason || ""), jt(), ve(Dt(o.compatibilityReason || "")), Pt && Pt.classList.add("hidden"), Tt && Tt.classList.remove("hidden"), ye?.focus(), !1) : (zt(), !0);
  }
  function yt(o) {
    const a = pe(o, 0);
    Ge && (Ge.value = String(a));
  }
  function oi() {
    const o = (be?.value || "").trim();
    if (!o) return;
    const a = ht.find((l) => String(l.id || "").trim() === o);
    a && (_e.textContent.trim() || (_e.textContent = a.title || "Untitled"), (!st.textContent.trim() || st.textContent.trim() === "pages") && (st.textContent = `${a.pageCount || 0} pages`), yt(a.pageCount || 0), Pt.classList.remove("hidden"), Tt.classList.add("hidden"));
  }
  async function Gt() {
    try {
      const o = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), a = await fetch(`${n}/panels/esign_documents?${o.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!a.ok)
        throw await yn(a, "Failed to load documents");
      const l = await a.json();
      ht = (Array.isArray(l?.records) ? l.records : Array.isArray(l?.items) ? l.items : []).slice().sort((b, L) => {
        const P = Date.parse(String(
          b?.created_at ?? b?.createdAt ?? b?.updated_at ?? b?.updatedAt ?? ""
        )), D = Date.parse(String(
          L?.created_at ?? L?.createdAt ?? L?.updated_at ?? L?.updatedAt ?? ""
        )), A = Number.isFinite(P) ? P : 0;
        return (Number.isFinite(D) ? D : 0) - A;
      }).map((b) => Ci(b)).filter((b) => b.id !== ""), vt(ht), oi();
    } catch (o) {
      const a = fn(o?.message || "Failed to load documents", o?.code || "", o?.status || 0);
      Ke.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${de(a)}</div>`;
    }
  }
  function vt(o) {
    if (o.length === 0) {
      Ke.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${de(_)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    Ke.innerHTML = o.map((l, m) => {
      const v = de(String(l.id || "").trim()), b = de(String(l.title || "").trim()), L = String(pe(l.pageCount, 0)), P = ft(l.compatibilityTier), D = Xe(l.compatibilityReason), A = de(P), I = de(D), q = Ve(P) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${m === 0 ? "0" : "-1"}"
              data-document-id="${v}"
              data-document-title="${b}"
              data-document-pages="${L}"
              data-document-compatibility-tier="${A}"
              data-document-compatibility-reason="${I}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${b}</div>
          <div class="text-xs text-gray-500">${L} pages ${q}</div>
        </div>
      </button>
    `;
    }).join("");
    const a = Ke.querySelectorAll(".document-option");
    a.forEach((l, m) => {
      l.addEventListener("click", () => Mn(l)), l.addEventListener("keydown", (v) => {
        let b = m;
        if (v.key === "ArrowDown")
          v.preventDefault(), b = Math.min(m + 1, a.length - 1);
        else if (v.key === "ArrowUp")
          v.preventDefault(), b = Math.max(m - 1, 0);
        else if (v.key === "Enter" || v.key === " ") {
          v.preventDefault(), Mn(l);
          return;
        } else v.key === "Home" ? (v.preventDefault(), b = 0) : v.key === "End" && (v.preventDefault(), b = a.length - 1);
        b !== m && (a[b].focus(), a[b].setAttribute("tabindex", "0"), l.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Mn(o) {
    const a = o.getAttribute("data-document-id"), l = o.getAttribute("data-document-title"), m = o.getAttribute("data-document-pages"), v = ft(
      o.getAttribute("data-document-compatibility-tier")
    ), b = Xe(
      o.getAttribute("data-document-compatibility-reason")
    );
    if (Ve(v)) {
      cn({ id: a, title: l, pageCount: m, compatibilityReason: b }), jt(), ve(Dt(b)), ye?.focus();
      return;
    }
    ln(a, l, m);
  }
  function ci(o) {
    const a = document.getElementById("title");
    if (!a) return;
    const l = H.getState(), m = a.value.trim(), v = gt(
      l?.titleSource,
      m === "" ? ie.AUTOFILL : ie.USER
    );
    if (m && v === ie.USER)
      return;
    const b = String(o || "").trim();
    b && (a.value = b, H.updateDetails({
      title: b,
      message: H.getState().details.message || ""
    }, { titleSource: ie.AUTOFILL }));
  }
  function de(o) {
    const a = document.createElement("div");
    return a.textContent = o, a.innerHTML;
  }
  kn && kn.addEventListener("click", () => {
    Pt.classList.add("hidden"), Tt.classList.remove("hidden"), zt(), ye?.focus(), Yt();
  }), xe && xe.addEventListener("click", () => {
    _n();
  }), An && An.addEventListener("click", () => {
    zt(), ye?.focus();
  });
  const un = 300, $n = 5, Vt = 10, qe = document.getElementById("document-typeahead"), ot = document.getElementById("document-typeahead-dropdown"), Oe = document.getElementById("document-recent-section"), Bn = document.getElementById("document-recent-list"), Wt = document.getElementById("document-search-section"), li = document.getElementById("document-search-list"), ct = document.getElementById("document-empty-state"), Jt = document.getElementById("document-dropdown-loading"), pn = document.getElementById("document-search-loading"), j = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let gn = 0, Qe = null;
  function wt(o, a) {
    let l = null;
    return (...m) => {
      l !== null && clearTimeout(l), l = setTimeout(() => {
        o(...m), l = null;
      }, a);
    };
  }
  async function di() {
    try {
      const o = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String($n)
      });
      w && o.set("created_by_user_id", w);
      const a = await fetch(`${n}/panels/esign_documents?${o}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!a.ok) {
        console.warn("Failed to load recent documents:", a.status);
        return;
      }
      const l = await a.json(), m = Array.isArray(l?.records) ? l.records : Array.isArray(l?.items) ? l.items : [];
      j.recentDocuments = m.map((v) => Ci(v)).filter((v) => v.id !== "").slice(0, $n);
    } catch (o) {
      console.warn("Error loading recent documents:", o);
    }
  }
  async function ui(o) {
    const a = o.trim();
    if (!a) {
      Qe && (Qe.abort(), Qe = null), j.isSearchMode = !1, j.searchResults = [], Ce();
      return;
    }
    const l = ++gn;
    Qe && Qe.abort(), Qe = new AbortController(), j.isLoading = !0, j.isSearchMode = !0, Ce();
    try {
      const m = new URLSearchParams({
        q: a,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Vt)
      }), v = await fetch(`${n}/panels/esign_documents?${m}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: Qe.signal
      });
      if (l !== gn)
        return;
      if (!v.ok) {
        console.warn("Failed to search documents:", v.status), j.searchResults = [], j.isLoading = !1, Ce();
        return;
      }
      const b = await v.json(), L = Array.isArray(b?.records) ? b.records : Array.isArray(b?.items) ? b.items : [];
      j.searchResults = L.map((P) => Ci(P)).filter((P) => P.id !== "").slice(0, Vt);
    } catch (m) {
      if (m?.name === "AbortError")
        return;
      console.warn("Error searching documents:", m), j.searchResults = [];
    } finally {
      l === gn && (j.isLoading = !1, Ce());
    }
  }
  const Rn = wt(ui, un);
  function Yt() {
    ot && (j.isOpen = !0, j.selectedIndex = -1, ot.classList.remove("hidden"), ye?.setAttribute("aria-expanded", "true"), Ke?.classList.add("hidden"), Ce());
  }
  function $t() {
    ot && (j.isOpen = !1, j.selectedIndex = -1, ot.classList.add("hidden"), ye?.setAttribute("aria-expanded", "false"), Ke?.classList.remove("hidden"));
  }
  function Ce() {
    if (ot) {
      if (j.isLoading) {
        Jt?.classList.remove("hidden"), Oe?.classList.add("hidden"), Wt?.classList.add("hidden"), ct?.classList.add("hidden"), pn?.classList.remove("hidden");
        return;
      }
      Jt?.classList.add("hidden"), pn?.classList.add("hidden"), j.isSearchMode ? (Oe?.classList.add("hidden"), j.searchResults.length > 0 ? (Wt?.classList.remove("hidden"), ct?.classList.add("hidden"), Fn(li, j.searchResults, "search")) : (Wt?.classList.add("hidden"), ct?.classList.remove("hidden"))) : (Wt?.classList.add("hidden"), j.recentDocuments.length > 0 ? (Oe?.classList.remove("hidden"), ct?.classList.add("hidden"), Fn(Bn, j.recentDocuments, "recent")) : (Oe?.classList.add("hidden"), ct?.classList.remove("hidden"), ct && (ct.textContent = "No recent documents")));
    }
  }
  function Fn(o, a, l) {
    o && (o.innerHTML = a.map((m, v) => {
      const b = v, L = j.selectedIndex === b, P = de(String(m.id || "").trim()), D = de(String(m.title || "").trim()), A = String(pe(m.pageCount, 0)), I = ft(m.compatibilityTier), U = Xe(m.compatibilityReason), q = de(I), G = de(U), z = Ve(I) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${L ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${L}"
          tabindex="-1"
          data-document-id="${P}"
          data-document-title="${D}"
          data-document-pages="${A}"
          data-document-compatibility-tier="${q}"
          data-document-compatibility-reason="${G}"
          data-typeahead-index="${b}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${D}</div>
            <div class="text-xs text-gray-500">${A} pages ${z}</div>
          </div>
        </button>
      `;
    }).join(""), o.querySelectorAll(".typeahead-option").forEach((m) => {
      m.addEventListener("click", () => Nn(m));
    }));
  }
  function Nn(o) {
    const a = o.getAttribute("data-document-id"), l = o.getAttribute("data-document-title"), m = o.getAttribute("data-document-pages"), v = ft(
      o.getAttribute("data-document-compatibility-tier")
    ), b = Xe(
      o.getAttribute("data-document-compatibility-reason")
    );
    if (a) {
      if (Ve(v)) {
        cn({ id: a, title: l, pageCount: m, compatibilityReason: b }), jt(), ve(Dt(b)), ye?.focus();
        return;
      }
      ln(a, l, m), $t(), ye && (ye.value = ""), j.query = "", j.isSearchMode = !1, j.searchResults = [];
    }
  }
  function pi(o) {
    if (!j.isOpen) {
      (o.key === "ArrowDown" || o.key === "Enter") && (o.preventDefault(), Yt());
      return;
    }
    const a = j.isSearchMode ? j.searchResults : j.recentDocuments, l = a.length - 1;
    switch (o.key) {
      case "ArrowDown":
        o.preventDefault(), j.selectedIndex = Math.min(j.selectedIndex + 1, l), Ce(), Bt();
        break;
      case "ArrowUp":
        o.preventDefault(), j.selectedIndex = Math.max(j.selectedIndex - 1, 0), Ce(), Bt();
        break;
      case "Enter":
        if (o.preventDefault(), j.selectedIndex >= 0 && j.selectedIndex <= l) {
          const m = a[j.selectedIndex];
          if (m) {
            const v = document.createElement("button");
            v.setAttribute("data-document-id", m.id), v.setAttribute("data-document-title", m.title), v.setAttribute("data-document-pages", String(m.pageCount)), v.setAttribute("data-document-compatibility-tier", String(m.compatibilityTier || "")), v.setAttribute("data-document-compatibility-reason", String(m.compatibilityReason || "")), Nn(v);
          }
        }
        break;
      case "Escape":
        o.preventDefault(), $t();
        break;
      case "Tab":
        $t();
        break;
      case "Home":
        o.preventDefault(), j.selectedIndex = 0, Ce(), Bt();
        break;
      case "End":
        o.preventDefault(), j.selectedIndex = l, Ce(), Bt();
        break;
    }
  }
  function Bt() {
    if (!ot) return;
    const o = ot.querySelector(`[data-typeahead-index="${j.selectedIndex}"]`);
    o && o.scrollIntoView({ block: "nearest" });
  }
  ye && (ye.addEventListener("input", (o) => {
    const l = o.target.value;
    j.query = l, j.isOpen || Yt(), l.trim() ? (j.isLoading = !0, Ce(), Rn(l)) : (j.isSearchMode = !1, j.searchResults = [], Ce());
    const m = ht.filter(
      (v) => String(v.title || "").toLowerCase().includes(l.toLowerCase())
    );
    vt(m);
  }), ye.addEventListener("focus", () => {
    Yt();
  }), ye.addEventListener("keydown", pi)), document.addEventListener("click", (o) => {
    const a = o.target;
    qe && !qe.contains(a) && $t();
  }), Gt(), di();
  const De = document.getElementById("participants-container"), gi = document.getElementById("participant-template"), Un = document.getElementById("add-participant-btn");
  let lt = 0, fe = 0;
  function mn() {
    return `temp_${Date.now()}_${lt++}`;
  }
  function bt(o = {}) {
    const a = gi.content.cloneNode(!0), l = a.querySelector(".participant-entry"), m = o.id || mn();
    l.setAttribute("data-participant-id", m);
    const v = l.querySelector(".participant-id-input"), b = l.querySelector('input[name="participants[].name"]'), L = l.querySelector('input[name="participants[].email"]'), P = l.querySelector('select[name="participants[].role"]'), D = l.querySelector('input[name="participants[].signing_stage"]'), A = l.querySelector('input[name="participants[].notify"]'), I = l.querySelector(".signing-stage-wrapper"), U = fe++;
    v.name = `participants[${U}].id`, v.value = m, b.name = `participants[${U}].name`, L.name = `participants[${U}].email`, P.name = `participants[${U}].role`, D && (D.name = `participants[${U}].signing_stage`), A && (A.name = `participants[${U}].notify`), o.name && (b.value = o.name), o.email && (L.value = o.email), o.role && (P.value = o.role), D && o.signing_stage && (D.value = o.signing_stage), A && (A.checked = o.notify !== !1);
    const q = () => {
      if (!I || !D) return;
      const G = P.value === "signer";
      I.classList.toggle("hidden", !G), G ? D.value || (D.value = "1") : D.value = "";
    };
    q(), l.querySelector(".remove-participant-btn").addEventListener("click", () => {
      l.remove(), ut();
    }), P.addEventListener("change", () => {
      q(), ut();
    }), De.appendChild(a);
  }
  Un.addEventListener("click", () => bt()), N.length > 0 ? N.forEach((o) => {
    bt({
      id: String(o.id || "").trim(),
      name: String(o.name || "").trim(),
      email: String(o.email || "").trim(),
      role: String(o.role || "signer").trim() || "signer",
      notify: o.notify !== !1,
      signing_stage: Number(o.signing_stage || o.signingStage || 1) || 1
    });
  }) : bt();
  const Ie = document.getElementById("field-definitions-container"), Hn = document.getElementById("field-definition-template"), hn = document.getElementById("add-field-btn"), r = document.getElementById("add-field-btn-container"), u = document.getElementById("add-field-definition-empty-btn"), g = document.getElementById("field-definitions-empty-state"), f = document.getElementById("field-rules-container"), y = document.getElementById("field-rule-template"), x = document.getElementById("add-field-rule-btn"), C = document.getElementById("field-rules-empty-state"), M = document.getElementById("field-rules-preview"), F = document.getElementById("field_rules_json"), K = document.getElementById("field_placements_json");
  let J = 0, Z = 0, Ee = 0;
  function Be() {
    return `temp_field_${Date.now()}_${J++}`;
  }
  function Y() {
    return `rule_${Date.now()}_${Ee}`;
  }
  function te() {
    const o = De.querySelectorAll(".participant-entry"), a = [];
    return o.forEach((l) => {
      const m = l.getAttribute("data-participant-id"), v = l.querySelector('select[name*=".role"]'), b = l.querySelector('input[name*=".name"]'), L = l.querySelector('input[name*=".email"]');
      v.value === "signer" && a.push({
        id: m,
        name: b.value || L.value || "Signer",
        email: L.value
      });
    }), a;
  }
  function dt(o, a) {
    const l = String(o || "").trim();
    return l && a.some((m) => m.id === l) ? l : a.length === 1 ? a[0].id : "";
  }
  function je(o, a, l = "") {
    if (!o) return;
    const m = dt(l, a);
    o.innerHTML = '<option value="">Select signer...</option>', a.forEach((v) => {
      const b = document.createElement("option");
      b.value = v.id, b.textContent = v.name, o.appendChild(b);
    }), o.value = m;
  }
  function mi(o = te()) {
    const a = Ie.querySelectorAll(".field-participant-select"), l = f ? f.querySelectorAll(".field-rule-participant-select") : [];
    a.forEach((m) => {
      je(m, o, m.value);
    }), l.forEach((m) => {
      je(m, o, m.value);
    });
  }
  function ut() {
    const o = te();
    mi(o), St();
  }
  function Me() {
    const o = pe(Ge?.value || "0", 0);
    if (o > 0) return o;
    const a = String(st?.textContent || "").match(/(\d+)\s+pages?/i);
    if (a) {
      const l = pe(a[1], 0);
      if (l > 0) return l;
    }
    return 1;
  }
  function Kt() {
    if (!f || !C) return;
    const o = f.querySelectorAll(".field-rule-entry");
    C.classList.toggle("hidden", o.length > 0);
  }
  function Ze() {
    if (!f) return [];
    const o = Me(), a = f.querySelectorAll(".field-rule-entry"), l = [];
    return a.forEach((m) => {
      const v = Jn({
        id: m.getAttribute("data-field-rule-id") || "",
        type: m.querySelector(".field-rule-type-select")?.value || "",
        participantId: m.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: m.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: m.querySelector(".field-rule-to-page-input")?.value || "",
        page: m.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!m.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: xn(m.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (m.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, o);
      v.type && l.push(v);
    }), l;
  }
  function qn() {
    return Ze().map((o) => na(o));
  }
  function Rt(o, a) {
    return sa(o, a);
  }
  function St() {
    if (!M) return;
    const o = Ze(), a = Me(), l = Rt(o, a), m = te(), v = new Map(m.map((D) => [String(D.id), D.name]));
    if (F && (F.value = JSON.stringify(qn())), !l.length) {
      M.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const b = l.reduce((D, A) => {
      const I = A.type;
      return D[I] = (D[I] || 0) + 1, D;
    }, {}), L = l.slice(0, 8).map((D) => {
      const A = v.get(String(D.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${D.type === "initials" ? "Initials" : "Signature"} on page ${D.page}</span><span class="text-gray-500">${de(String(A))}</span></li>`;
    }).join(""), P = l.length - 8;
    M.innerHTML = `
      <p class="text-gray-700">${l.length} generated field${l.length !== 1 ? "s" : ""} (${b.initials || 0} initials, ${b.signature || 0} signatures)</p>
      <ul class="space-y-1">${L}</ul>
      ${P > 0 ? `<p class="text-gray-500">+${P} more</p>` : ""}
    `;
  }
  function Hi() {
    const o = te(), a = new Map(o.map((A) => [String(A.id), A.name || A.email || "Signer"])), l = [];
    Ie.querySelectorAll(".field-definition-entry").forEach((A) => {
      const I = String(A.getAttribute("data-field-definition-id") || "").trim(), U = A.querySelector(".field-type-select"), q = A.querySelector(".field-participant-select"), G = A.querySelector('input[name*=".page"]'), O = String(U?.value || "text").trim() || "text", z = String(q?.value || "").trim(), X = parseInt(String(G?.value || "1"), 10) || 1;
      l.push({
        definitionId: I,
        fieldType: O,
        participantId: z,
        participantName: a.get(z) || "Unassigned",
        page: X
      });
    });
    const v = Rt(Ze(), Me()), b = /* @__PURE__ */ new Map();
    v.forEach((A) => {
      const I = String(A.ruleId || "").trim(), U = String(A.id || "").trim();
      if (I && U) {
        const q = b.get(I) || [];
        q.push(U), b.set(I, q);
      }
    });
    let L = k.linkGroupState;
    b.forEach((A, I) => {
      if (A.length > 1 && !k.linkGroupState.groups.get(`rule_${I}`)) {
        const q = Qr(A, `Rule ${I}`);
        q.id = `rule_${I}`, L = us(L, q);
      }
    }), k.linkGroupState = L, v.forEach((A) => {
      const I = String(A.id || "").trim();
      if (!I) return;
      const U = String(A.participantId || "").trim(), q = parseInt(String(A.page || "1"), 10) || 1, G = String(A.ruleId || "").trim();
      l.push({
        definitionId: I,
        fieldType: String(A.type || "text").trim() || "text",
        participantId: U,
        participantName: a.get(U) || "Unassigned",
        page: q,
        linkGroupId: G ? `rule_${G}` : void 0
      });
    });
    const P = /* @__PURE__ */ new Set(), D = l.filter((A) => {
      const I = String(A.definitionId || "").trim();
      return !I || P.has(I) ? !1 : (P.add(I), !0);
    });
    return D.sort((A, I) => A.page !== I.page ? A.page - I.page : A.definitionId.localeCompare(I.definitionId)), D;
  }
  function qi(o) {
    const a = o.querySelector(".field-rule-type-select"), l = o.querySelector(".field-rule-range-start-wrap"), m = o.querySelector(".field-rule-range-end-wrap"), v = o.querySelector(".field-rule-page-wrap"), b = o.querySelector(".field-rule-exclude-last-wrap"), L = o.querySelector(".field-rule-exclude-pages-wrap"), P = o.querySelector(".field-rule-summary"), D = o.querySelector(".field-rule-from-page-input"), A = o.querySelector(".field-rule-to-page-input"), I = o.querySelector(".field-rule-page-input"), U = o.querySelector(".field-rule-exclude-last-input"), q = o.querySelector(".field-rule-exclude-pages-input"), G = Me(), O = Jn({
      type: a?.value || "",
      fromPage: D?.value || "",
      toPage: A?.value || "",
      page: I?.value || "",
      excludeLastPage: !!U?.checked,
      excludePages: xn(q?.value || ""),
      required: !0
    }, G), z = O.fromPage > 0 ? O.fromPage : 1, X = O.toPage > 0 ? O.toPage : G, se = O.page > 0 ? O.page : O.toPage > 0 ? O.toPage : G, me = O.excludeLastPage, we = O.excludePages.join(","), re = a?.value === "initials_each_page";
    if (l.classList.toggle("hidden", !re), m.classList.toggle("hidden", !re), b.classList.toggle("hidden", !re), L.classList.toggle("hidden", !re), v.classList.toggle("hidden", re), D && (D.value = String(z)), A && (A.value = String(X)), I && (I.value = String(se)), q && (q.value = we), U && (U.checked = me), re) {
      const ue = ra(
        z,
        X,
        G,
        me,
        O.excludePages
      ), nt = aa(ue);
      ue.isEmpty ? P.textContent = `Warning: No initials fields will be generated ${nt}.` : P.textContent = `Generates initials fields on ${nt}.`;
    } else
      P.textContent = `Generates one signature field on page ${se}.`;
  }
  function Oi(o = {}) {
    if (!y || !f) return;
    const a = y.content.cloneNode(!0), l = a.querySelector(".field-rule-entry"), m = o.id || Y(), v = Ee++, b = Me();
    l.setAttribute("data-field-rule-id", m);
    const L = l.querySelector(".field-rule-id-input"), P = l.querySelector(".field-rule-type-select"), D = l.querySelector(".field-rule-participant-select"), A = l.querySelector(".field-rule-from-page-input"), I = l.querySelector(".field-rule-to-page-input"), U = l.querySelector(".field-rule-page-input"), q = l.querySelector(".field-rule-required-select"), G = l.querySelector(".field-rule-exclude-last-input"), O = l.querySelector(".field-rule-exclude-pages-input"), z = l.querySelector(".remove-field-rule-btn");
    L.name = `field_rules[${v}].id`, L.value = m, P.name = `field_rules[${v}].type`, D.name = `field_rules[${v}].participant_id`, A.name = `field_rules[${v}].from_page`, I.name = `field_rules[${v}].to_page`, U.name = `field_rules[${v}].page`, q.name = `field_rules[${v}].required`, G.name = `field_rules[${v}].exclude_last_page`, O.name = `field_rules[${v}].exclude_pages`;
    const X = Jn(o, b);
    P.value = X.type || "initials_each_page", je(D, te(), X.participantId), A.value = String(X.fromPage > 0 ? X.fromPage : 1), I.value = String(X.toPage > 0 ? X.toPage : b), U.value = String(X.page > 0 ? X.page : b), q.value = X.required ? "1" : "0", G.checked = X.excludeLastPage, O.value = X.excludePages.join(",");
    const se = () => {
      qi(l), St(), tt();
    }, me = () => {
      const re = Me();
      if (A) {
        const ue = parseInt(A.value, 10);
        Number.isFinite(ue) && (A.value = String(bn(ue, re, 1)));
      }
      if (I) {
        const ue = parseInt(I.value, 10);
        Number.isFinite(ue) && (I.value = String(bn(ue, re, 1)));
      }
      if (U) {
        const ue = parseInt(U.value, 10);
        Number.isFinite(ue) && (U.value = String(bn(ue, re, 1)));
      }
    }, we = () => {
      me(), se();
    };
    P.addEventListener("change", se), D.addEventListener("change", se), A.addEventListener("input", we), A.addEventListener("change", we), I.addEventListener("input", we), I.addEventListener("change", we), U.addEventListener("input", we), U.addEventListener("change", we), q.addEventListener("change", se), G.addEventListener("change", () => {
      const re = Me();
      if (G.checked) {
        const ue = Math.max(1, re - 1);
        I.value = String(ue);
      } else
        I.value = String(re);
      se();
    }), O.addEventListener("input", se), z.addEventListener("click", () => {
      l.remove(), Kt(), St(), tt();
    }), f.appendChild(a), qi(f.lastElementChild), Kt(), St();
  }
  function On(o = {}) {
    const a = Hn.content.cloneNode(!0), l = a.querySelector(".field-definition-entry"), m = o.id || Be();
    l.setAttribute("data-field-definition-id", m);
    const v = l.querySelector(".field-definition-id-input"), b = l.querySelector('select[name="field_definitions[].type"]'), L = l.querySelector('select[name="field_definitions[].participant_id"]'), P = l.querySelector('input[name="field_definitions[].page"]'), D = l.querySelector('input[name="field_definitions[].required"]'), A = l.querySelector(".field-date-signed-info"), I = Z++;
    v.name = `field_instances[${I}].id`, v.value = m, b.name = `field_instances[${I}].type`, L.name = `field_instances[${I}].participant_id`, P.name = `field_instances[${I}].page`, D.name = `field_instances[${I}].required`, o.type && (b.value = o.type), o.page && (P.value = String(bn(o.page, Me(), 1))), o.required !== void 0 && (D.checked = o.required);
    const U = String(o.participant_id || o.participantId || "").trim();
    je(L, te(), U), b.addEventListener("change", () => {
      b.value === "date_signed" ? A.classList.remove("hidden") : A.classList.add("hidden");
    }), b.value === "date_signed" && A.classList.remove("hidden"), l.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      l.remove(), jn();
    });
    const q = l.querySelector('input[name*=".page"]'), G = () => {
      q && (q.value = String(bn(q.value, Me(), 1)));
    };
    G(), q?.addEventListener("input", G), q?.addEventListener("change", G), Ie.appendChild(a), jn();
  }
  function jn() {
    Ie.querySelectorAll(".field-definition-entry").length === 0 ? (g.classList.remove("hidden"), r?.classList.add("hidden")) : (g.classList.add("hidden"), r?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    ut();
  }).observe(De, { childList: !0, subtree: !0 }), De.addEventListener("change", (o) => {
    (o.target.matches('select[name*=".role"]') || o.target.matches('input[name*=".name"]') || o.target.matches('input[name*=".email"]')) && ut();
  }), De.addEventListener("input", (o) => {
    (o.target.matches('input[name*=".name"]') || o.target.matches('input[name*=".email"]')) && ut();
  }), hn.addEventListener("click", () => On()), u.addEventListener("click", () => On()), x?.addEventListener("click", () => Oi({ to_page: Me() })), window._initialFieldPlacementsData = [], R.forEach((o) => {
    const a = String(o.id || "").trim();
    if (!a) return;
    const l = String(o.type || "signature").trim() || "signature", m = String(o.participant_id || o.participantId || "").trim(), v = Number(o.page || 1) || 1, b = !!o.required;
    On({
      id: a,
      type: l,
      participant_id: m,
      page: v,
      required: b
    }), window._initialFieldPlacementsData.push(Yn({
      id: a,
      definitionId: a,
      type: l,
      participantId: m,
      participantName: String(o.participant_name || o.participantName || "").trim(),
      page: v,
      x: Number(o.x || o.pos_x || 0) || 0,
      y: Number(o.y || o.pos_y || 0) || 0,
      width: Number(o.width || 150) || 150,
      height: Number(o.height || 32) || 32,
      placementSource: String(o.placement_source || o.placementSource || ke.MANUAL).trim() || ke.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), jn(), ut(), Kt(), St();
  const Ft = document.getElementById("agreement-form"), et = document.getElementById("submit-btn"), ji = document.getElementById("form-announcements");
  function fn(o, a = "", l = 0) {
    const m = String(a || "").trim().toUpperCase(), v = String(o || "").trim().toLowerCase();
    return m === "DRAFT_SEND_NOT_FOUND" || m === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : m === "SCOPE_DENIED" || v.includes("scope denied") ? "You don't have access to this organization's resources." : m === "TRANSPORT_SECURITY" || m === "TRANSPORT_SECURITY_REQUIRED" || v.includes("tls transport required") || Number(l) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : m === "PDF_UNSUPPORTED" || v === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(o || "").trim() !== "" ? String(o).trim() : "Something went wrong. Please try again.";
  }
  async function yn(o, a) {
    const l = Number(o?.status || 0);
    let m = "", v = "", b = {};
    try {
      const L = await o.json();
      m = String(L?.error?.code || L?.code || "").trim(), v = String(L?.error?.message || L?.message || "").trim(), b = L?.error?.details && typeof L.error.details == "object" ? L.error.details : {}, String(b?.entity || "").trim().toLowerCase() === "drafts" && String(m).trim().toUpperCase() === "NOT_FOUND" && (m = "DRAFT_SEND_NOT_FOUND", v === "" && (v = "Draft not found"));
    } catch {
      v = "";
    }
    return v === "" && (v = a || `Request failed (${l || "unknown"})`), {
      status: l,
      code: m,
      details: b,
      message: fn(v, m, l)
    };
  }
  function ve(o, a = "", l = 0) {
    const m = fn(o, a, l);
    ji && (ji.textContent = m), window.toastManager ? window.toastManager.error(m) : alert(m);
  }
  function Us() {
    const o = [];
    De.querySelectorAll(".participant-entry").forEach((v) => {
      const b = String(v.getAttribute("data-participant-id") || "").trim(), L = String(v.querySelector('input[name*=".name"]')?.value || "").trim(), P = String(v.querySelector('input[name*=".email"]')?.value || "").trim(), D = String(v.querySelector('select[name*=".role"]')?.value || "signer").trim(), A = v.querySelector(".notify-input")?.checked !== !1, I = String(v.querySelector(".signing-stage-input")?.value || "").trim(), U = Number(I || "1") || 1;
      o.push({
        id: b,
        name: L,
        email: P,
        role: D,
        notify: A,
        signing_stage: D === "signer" ? U : 0
      });
    });
    const a = [];
    Ie.querySelectorAll(".field-definition-entry").forEach((v) => {
      const b = String(v.getAttribute("data-field-definition-id") || "").trim(), L = String(v.querySelector(".field-type-select")?.value || "signature").trim(), P = String(v.querySelector(".field-participant-select")?.value || "").trim(), D = Number(v.querySelector('input[name*=".page"]')?.value || "1") || 1, A = !!v.querySelector('input[name*=".required"]')?.checked;
      b && a.push({
        id: b,
        type: L,
        participant_id: P,
        page: D,
        required: A
      });
    });
    const l = [];
    k && Array.isArray(k.fieldInstances) && k.fieldInstances.forEach((v, b) => {
      l.push(fs(v, b));
    });
    const m = JSON.stringify(l);
    return K && (K.value = m), {
      document_id: String(be?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: o,
      field_instances: a,
      field_placements: l,
      field_placements_json: m,
      field_rules: qn(),
      field_rules_json: String(F?.value || "[]"),
      send_for_signature: ge === Lt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(Ge?.value || "0") || 0
    };
  }
  function hi() {
    const o = te(), a = /* @__PURE__ */ new Map();
    return o.forEach((v) => {
      a.set(v.id, !1);
    }), Ie.querySelectorAll(".field-definition-entry").forEach((v) => {
      const b = v.querySelector(".field-type-select"), L = v.querySelector(".field-participant-select"), P = v.querySelector('input[name*=".required"]');
      b?.value === "signature" && L?.value && P?.checked && a.set(L.value, !0);
    }), Rt(Ze(), Me()).forEach((v) => {
      v.type === "signature" && v.participantId && v.required && a.set(v.participantId, !0);
    }), o.filter((v) => !a.get(v.id));
  }
  function zi(o) {
    if (!Array.isArray(o) || o.length === 0)
      return "Each signer requires at least one required signature field.";
    const a = o.map((l) => l?.name?.trim()).filter((l) => !!l);
    return a.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${a.join(", ")}`;
  }
  async function Gi() {
    H.updateState(H.collectFormState()), await Te.forceSync();
    const o = H.getState();
    if (o?.syncPending)
      throw new Error("Unable to sync latest draft changes");
    return o;
  }
  async function Hs() {
    const o = await Gi(), a = String(o?.serverDraftId || "").trim();
    if (!a) {
      const l = await Ye.create(o);
      return H.markSynced(l.id, l.revision), {
        draftID: String(l.id || "").trim(),
        revision: Number(l.revision || 0)
      };
    }
    try {
      const l = await Ye.load(a), m = String(l?.id || a).trim(), v = Number(l?.revision || o?.serverRevision || 0);
      return m && v > 0 && H.markSynced(m, v), {
        draftID: m,
        revision: v > 0 ? v : Number(o?.serverRevision || 0)
      };
    } catch (l) {
      if (Number(l?.status || 0) !== 404)
        throw l;
      const m = await Ye.create({
        ...H.getState(),
        ...H.collectFormState()
      }), v = String(m?.id || "").trim(), b = Number(m?.revision || 0);
      return H.markSynced(v, b), Se("wizard_send_stale_draft_recovered", {
        stale_draft_id: a,
        recovered_draft_id: v
      }), { draftID: v, revision: b };
    }
  }
  async function qs() {
    const o = H.getState();
    H.setState({
      ...o,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await Te.forceSync();
  }
  Ft.addEventListener("submit", function(o) {
    if (St(), !be.value) {
      o.preventDefault(), ve("Please select a document"), ye.focus();
      return;
    }
    if (!Dn()) {
      o.preventDefault();
      return;
    }
    const a = De.querySelectorAll(".participant-entry");
    if (a.length === 0) {
      o.preventDefault(), ve("Please add at least one participant"), Un.focus();
      return;
    }
    let l = !1;
    if (a.forEach((I) => {
      I.querySelector('select[name*=".role"]').value === "signer" && (l = !0);
    }), !l) {
      o.preventDefault(), ve("At least one signer is required");
      const I = a[0]?.querySelector('select[name*=".role"]');
      I && I.focus();
      return;
    }
    const m = Ie.querySelectorAll(".field-definition-entry"), v = hi();
    if (v.length > 0) {
      o.preventDefault(), ve(zi(v)), vn(Ae.FIELDS), hn.focus();
      return;
    }
    let b = !1;
    if (m.forEach((I) => {
      I.querySelector(".field-participant-select").value || (b = !0);
    }), b) {
      o.preventDefault(), ve("Please assign all fields to a signer");
      const I = Ie.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      I && I.focus();
      return;
    }
    if (Ze().some((I) => !I.participantId)) {
      o.preventDefault(), ve("Please assign all automation rules to a signer"), Array.from(f?.querySelectorAll(".field-rule-participant-select") || []).find((U) => !U.value)?.focus();
      return;
    }
    const D = !!Ft.querySelector('input[name="save_as_draft"]'), A = ge === Lt && !D;
    if (A) {
      let I = Ft.querySelector('input[name="send_for_signature"]');
      I || (I = document.createElement("input"), I.type = "hidden", I.name = "send_for_signature", Ft.appendChild(I)), I.value = "1";
    } else
      Ft.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      o.preventDefault(), et.disabled = !0, et.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${A ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          Us();
          const I = String(e.routes?.index || "").trim();
          if (!A) {
            if (await Gi(), I) {
              window.location.href = I;
              return;
            }
            window.location.reload();
            return;
          }
          const U = await Hs(), q = String(U?.draftID || "").trim(), G = Number(U?.revision || 0);
          if (!q || G <= 0)
            throw new Error("Draft session not available. Please try again.");
          const O = await fetch(
            B(`${p}/${encodeURIComponent(q)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: V(),
              body: JSON.stringify({
                expected_revision: G,
                created_by_user_id: w
              })
            }
          );
          if (!O.ok) {
            const se = await yn(O, "Failed to send agreement");
            throw String(se?.code || "").trim().toUpperCase() === "DRAFT_SEND_NOT_FOUND" ? (Se("wizard_send_not_found", {
              draft_id: q,
              status: Number(se?.status || 0)
            }), await qs().catch(() => {
            }), {
              ...se,
              code: "DRAFT_SESSION_STALE"
            }) : se;
          }
          const z = await O.json(), X = String(z?.agreement_id || z?.id || z?.data?.id || "").trim();
          if (H.clear(), Te.broadcastStateUpdate(), X && I) {
            window.location.href = `${I}/${encodeURIComponent(X)}`;
            return;
          }
          if (I) {
            window.location.href = I;
            return;
          }
          window.location.reload();
        } catch (I) {
          const U = String(I?.message || "Failed to process agreement").trim(), q = String(I?.code || "").trim(), G = Number(I?.status || 0);
          ve(U, q, G), et.disabled = !1, et.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }
    et.disabled = !0, et.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${A ? "Sending..." : "Saving..."}
    `;
  });
  let ge = 1;
  const Vi = document.querySelectorAll(".wizard-step-btn"), Os = document.querySelectorAll(".wizard-step"), js = document.querySelectorAll(".wizard-connector"), Wi = document.getElementById("wizard-prev-btn"), fi = document.getElementById("wizard-next-btn"), Ji = document.getElementById("wizard-save-btn");
  function yi() {
    if (Vi.forEach((o, a) => {
      const l = a + 1, m = o.querySelector(".wizard-step-number");
      l < ge ? (o.classList.remove("text-gray-500", "text-blue-600"), o.classList.add("text-green-600"), m.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), m.classList.add("bg-green-600", "text-white"), o.removeAttribute("aria-current")) : l === ge ? (o.classList.remove("text-gray-500", "text-green-600"), o.classList.add("text-blue-600"), m.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), m.classList.add("bg-blue-600", "text-white"), o.setAttribute("aria-current", "step")) : (o.classList.remove("text-blue-600", "text-green-600"), o.classList.add("text-gray-500"), m.classList.remove("bg-blue-600", "text-white", "bg-green-600"), m.classList.add("bg-gray-300", "text-gray-600"), o.removeAttribute("aria-current"));
    }), js.forEach((o, a) => {
      a < ge - 1 ? (o.classList.remove("bg-gray-300"), o.classList.add("bg-green-600")) : (o.classList.remove("bg-green-600"), o.classList.add("bg-gray-300"));
    }), Os.forEach((o) => {
      parseInt(o.dataset.step, 10) === ge ? o.classList.remove("hidden") : o.classList.add("hidden");
    }), Wi.classList.toggle("hidden", ge === 1), fi.classList.toggle("hidden", ge === Lt), Ji.classList.toggle("hidden", ge !== Lt), et.classList.toggle("hidden", ge !== Lt), ge < Lt) {
      const o = Ur[ge] || "Next";
      fi.innerHTML = `
        ${o}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    ge === Ae.PLACEMENT ? Gs() : ge === Ae.REVIEW && mr(), At.updateVisibility(ge);
  }
  function zs(o) {
    switch (o) {
      case 1:
        return be.value ? !!Dn() : (ve("Please select a document"), !1);
      case 2:
        const a = document.getElementById("title");
        return a.value.trim() ? !0 : (ve("Please enter an agreement title"), a.focus(), !1);
      case 3:
        const l = De.querySelectorAll(".participant-entry");
        if (l.length === 0)
          return ve("Please add at least one participant"), !1;
        let m = !1;
        return l.forEach((D) => {
          D.querySelector('select[name*=".role"]').value === "signer" && (m = !0);
        }), m ? !0 : (ve("At least one signer is required"), !1);
      case 4:
        const v = Ie.querySelectorAll(".field-definition-entry");
        for (const D of v) {
          const A = D.querySelector(".field-participant-select");
          if (!A.value)
            return ve("Please assign all fields to a signer"), A.focus(), !1;
        }
        if (Ze().find((D) => !D.participantId))
          return ve("Please assign all automation rules to a signer"), f?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const P = hi();
        return P.length > 0 ? (ve(zi(P)), hn.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function vn(o) {
    if (!(o < Ae.DOCUMENT || o > Lt)) {
      if (o > ge) {
        for (let a = ge; a < o; a++)
          if (!zs(a)) return;
      }
      ge = o, yi(), H.updateStep(o), mt(), Te.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  Vi.forEach((o) => {
    o.addEventListener("click", () => {
      const a = parseInt(o.dataset.step, 10);
      vn(a);
    });
  }), Wi.addEventListener("click", () => vn(ge - 1)), fi.addEventListener("click", () => vn(ge + 1)), Ji.addEventListener("click", () => {
    const o = document.createElement("input");
    o.type = "hidden", o.name = "save_as_draft", o.value = "1", Ft.appendChild(o), Ft.submit();
  });
  let k = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((o, a) => Yn(o, a)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: Xr()
  };
  const xt = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, zn = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function Gs() {
    const o = document.getElementById("placement-loading"), a = document.getElementById("placement-no-document"), l = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const m = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const v = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const b = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !be.value) {
      o.classList.add("hidden"), a.classList.remove("hidden");
      return;
    }
    o.classList.remove("hidden"), a.classList.add("hidden");
    const L = Hi(), P = new Set(
      L.map((z) => String(z.definitionId || "").trim()).filter((z) => z)
    );
    k.fieldInstances = k.fieldInstances.filter(
      (z) => P.has(String(z.definitionId || "").trim())
    ), l.innerHTML = "";
    const D = k.linkGroupState.groups.size > 0, A = document.getElementById("link-batch-actions");
    A && A.classList.toggle("hidden", !D);
    const I = L.map((z) => {
      const X = String(z.definitionId || "").trim(), se = k.linkGroupState.definitionToGroup.get(X) || "", me = k.linkGroupState.unlinkedDefinitions.has(X);
      return { ...z, definitionId: X, linkGroupId: se, isUnlinked: me };
    });
    I.forEach((z, X) => {
      const se = z.definitionId, me = String(z.fieldType || "text").trim() || "text", we = String(z.participantId || "").trim(), re = String(z.participantName || "Unassigned").trim() || "Unassigned", ue = parseInt(String(z.page || "1"), 10) || 1, nt = z.linkGroupId, Si = z.isUnlinked;
      if (!se) return;
      k.fieldInstances.forEach((ze) => {
        ze.definitionId === se && (ze.type = me, ze.participantId = we, ze.participantName = re);
      });
      const xi = xt[me] || xt.text, Q = k.fieldInstances.some((ze) => ze.definitionId === se), ae = document.createElement("div");
      ae.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Q ? "opacity-50" : ""}`, ae.draggable = !Q, ae.dataset.definitionId = se, ae.dataset.fieldType = me, ae.dataset.participantId = we, ae.dataset.participantName = re, ae.dataset.page = String(ue), nt && (ae.dataset.linkGroupId = nt);
      const Qt = document.createElement("span");
      Qt.className = `w-3 h-3 rounded ${xi.bg}`;
      const Et = document.createElement("div");
      Et.className = "flex-1 text-xs";
      const Zt = document.createElement("div");
      Zt.className = "font-medium capitalize", Zt.textContent = me.replace(/_/g, " ");
      const en = document.createElement("div");
      en.className = "text-gray-500", en.textContent = re;
      const Ut = document.createElement("span");
      Ut.className = `placement-status text-xs ${Q ? "text-green-600" : "text-amber-600"}`, Ut.textContent = Q ? "Placed" : "Not placed", Et.appendChild(Zt), Et.appendChild(en), ae.appendChild(Qt), ae.appendChild(Et), ae.appendChild(Ut), ae.addEventListener("dragstart", (ze) => {
        if (Q) {
          ze.preventDefault();
          return;
        }
        ze.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: se,
          fieldType: me,
          participantId: we,
          participantName: re
        })), ze.dataTransfer.effectAllowed = "copy", ae.classList.add("opacity-50");
      }), ae.addEventListener("dragend", () => {
        ae.classList.remove("opacity-50");
      }), l.appendChild(ae);
      const is = I[X + 1];
      if (nt && is && is.linkGroupId === nt) {
        const ze = Yi(se, !Si);
        l.appendChild(ze);
      }
    }), Vs();
    const U = ++k.loadRequestVersion, q = String(be.value || "").trim(), G = encodeURIComponent(q), O = `${n}/panels/esign_documents/${G}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const X = await window.pdfjsLib.getDocument({
        url: O,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (U !== k.loadRequestVersion)
        return;
      k.pdfDoc = X, k.totalPages = k.pdfDoc.numPages, k.currentPage = 1, b.textContent = k.totalPages, await pt(k.currentPage), o.classList.add("hidden"), k.uiHandlersBound || (Ws(m, v), tr(), nr(), k.uiHandlersBound = !0), It();
    } catch (z) {
      if (U !== k.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", z), o.classList.add("hidden"), a.classList.remove("hidden"), a.textContent = `Failed to load PDF: ${fn(z?.message || "Failed to load PDF")}`;
    }
    wn(), We();
  }
  function Yi(o, a) {
    const l = document.createElement("div");
    return l.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", l.dataset.definitionId = o, l.dataset.isLinked = String(a), l.title = a ? "Click to unlink this field" : "Click to re-link this field", l.setAttribute("role", "button"), l.setAttribute("aria-label", a ? "Unlink field from group" : "Re-link field to group"), l.setAttribute("tabindex", "0"), a ? l.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : l.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, l.addEventListener("click", () => Ki(o, a)), l.addEventListener("keydown", (m) => {
      (m.key === "Enter" || m.key === " ") && (m.preventDefault(), Ki(o, a));
    }), l;
  }
  function Ki(o, a) {
    a ? (k.linkGroupState = ps(k.linkGroupState, o), window.toastManager && window.toastManager.info("Field unlinked")) : (k.linkGroupState = gs(k.linkGroupState, o), window.toastManager && window.toastManager.info("Field re-linked")), vi();
  }
  function Vs() {
    const o = document.getElementById("link-all-btn"), a = document.getElementById("unlink-all-btn");
    o && !o.dataset.bound && (o.dataset.bound = "true", o.addEventListener("click", () => {
      const l = k.linkGroupState.unlinkedDefinitions.size;
      if (l !== 0) {
        for (const m of k.linkGroupState.unlinkedDefinitions)
          k.linkGroupState = gs(k.linkGroupState, m);
        window.toastManager && window.toastManager.success(`Re-linked ${l} field${l > 1 ? "s" : ""}`), vi();
      }
    })), a && !a.dataset.bound && (a.dataset.bound = "true", a.addEventListener("click", () => {
      let l = 0;
      for (const m of k.linkGroupState.definitionToGroup.keys())
        k.linkGroupState.unlinkedDefinitions.has(m) || (k.linkGroupState = ps(k.linkGroupState, m), l++);
      l > 0 && window.toastManager && window.toastManager.success(`Unlinked ${l} field${l > 1 ? "s" : ""}`), vi();
    })), Xi();
  }
  function Xi() {
    const o = document.getElementById("link-all-btn"), a = document.getElementById("unlink-all-btn");
    if (o) {
      const l = k.linkGroupState.unlinkedDefinitions.size > 0;
      o.disabled = !l;
    }
    if (a) {
      let l = !1;
      for (const m of k.linkGroupState.definitionToGroup.keys())
        if (!k.linkGroupState.unlinkedDefinitions.has(m)) {
          l = !0;
          break;
        }
      a.disabled = !l;
    }
  }
  function vi() {
    const o = document.getElementById("placement-fields-list");
    if (!o) return;
    const a = Hi();
    o.innerHTML = "";
    const l = a.map((m) => {
      const v = String(m.definitionId || "").trim(), b = k.linkGroupState.definitionToGroup.get(v) || "", L = k.linkGroupState.unlinkedDefinitions.has(v);
      return { ...m, definitionId: v, linkGroupId: b, isUnlinked: L };
    });
    l.forEach((m, v) => {
      const b = m.definitionId, L = String(m.fieldType || "text").trim() || "text", P = String(m.participantId || "").trim(), D = String(m.participantName || "Unassigned").trim() || "Unassigned", A = parseInt(String(m.page || "1"), 10) || 1, I = m.linkGroupId, U = m.isUnlinked;
      if (!b) return;
      const q = xt[L] || xt.text, G = k.fieldInstances.some((ue) => ue.definitionId === b), O = document.createElement("div");
      O.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${G ? "opacity-50" : ""}`, O.draggable = !G, O.dataset.definitionId = b, O.dataset.fieldType = L, O.dataset.participantId = P, O.dataset.participantName = D, O.dataset.page = String(A), I && (O.dataset.linkGroupId = I);
      const z = document.createElement("span");
      z.className = `w-3 h-3 rounded ${q.bg}`;
      const X = document.createElement("div");
      X.className = "flex-1 text-xs";
      const se = document.createElement("div");
      se.className = "font-medium capitalize", se.textContent = L.replace(/_/g, " ");
      const me = document.createElement("div");
      me.className = "text-gray-500", me.textContent = D;
      const we = document.createElement("span");
      we.className = `placement-status text-xs ${G ? "text-green-600" : "text-amber-600"}`, we.textContent = G ? "Placed" : "Not placed", X.appendChild(se), X.appendChild(me), O.appendChild(z), O.appendChild(X), O.appendChild(we), O.addEventListener("dragstart", (ue) => {
        if (G) {
          ue.preventDefault();
          return;
        }
        ue.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: b,
          fieldType: L,
          participantId: P,
          participantName: D
        })), ue.dataTransfer.effectAllowed = "copy", O.classList.add("opacity-50");
      }), O.addEventListener("dragend", () => {
        O.classList.remove("opacity-50");
      }), o.appendChild(O);
      const re = l[v + 1];
      if (I && re && re.linkGroupId === I) {
        const ue = Yi(b, !U);
        o.appendChild(ue);
      }
    }), Xi();
  }
  async function pt(o) {
    if (!k.pdfDoc) return;
    const a = document.getElementById("placement-pdf-canvas"), l = document.getElementById("placement-canvas-container"), m = a.getContext("2d"), v = await k.pdfDoc.getPage(o), b = v.getViewport({ scale: k.scale });
    a.width = b.width, a.height = b.height, l.style.width = `${b.width}px`, l.style.height = `${b.height}px`, await v.render({
      canvasContext: m,
      viewport: b
    }).promise, document.getElementById("placement-current-page").textContent = o, It();
  }
  function Ws(o, a) {
    const l = document.getElementById("placement-pdf-canvas");
    o.addEventListener("dragover", (m) => {
      m.preventDefault(), m.dataTransfer.dropEffect = "copy", l.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), o.addEventListener("dragleave", (m) => {
      l.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), o.addEventListener("drop", (m) => {
      m.preventDefault(), l.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const v = m.dataTransfer.getData("application/json");
      if (!v) return;
      const b = JSON.parse(v), L = l.getBoundingClientRect(), P = (m.clientX - L.left) / k.scale, D = (m.clientY - L.top) / k.scale;
      Qi(b, P, D);
    });
  }
  function Qi(o, a, l, m = {}) {
    const v = zn[o.fieldType] || zn.text, b = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, L = m.placementSource || ke.MANUAL, P = m.linkGroupId || Ps(k.linkGroupState, o.definitionId)?.id, D = {
      id: b,
      definitionId: o.definitionId,
      type: o.fieldType,
      participantId: o.participantId,
      participantName: o.participantName,
      page: k.currentPage,
      x: Math.max(0, a - v.width / 2),
      y: Math.max(0, l - v.height / 2),
      width: v.width,
      height: v.height,
      placementSource: L,
      linkGroupId: P,
      linkedFromFieldId: m.linkedFromFieldId
    };
    k.fieldInstances.push(D), Zi(o.definitionId), L === ke.MANUAL && P && Xs(D), It(), wn(), We();
  }
  function Zi(o, a = !1) {
    const l = document.querySelector(`.placement-field-item[data-definition-id="${o}"]`);
    if (l) {
      l.classList.add("opacity-50"), l.draggable = !1;
      const m = l.querySelector(".placement-status");
      m && (m.textContent = "Placed", m.classList.remove("text-amber-600"), m.classList.add("text-green-600")), a && l.classList.add("just-linked");
    }
  }
  function Js(o) {
    const a = Zr(
      k.linkGroupState,
      o
    );
    a && (k.linkGroupState = us(k.linkGroupState, a.updatedGroup));
  }
  function es(o) {
    const a = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((b) => {
      const L = b.dataset.definitionId, P = b.dataset.page;
      if (L) {
        const D = k.linkGroupState.definitionToGroup.get(L);
        a.set(L, {
          type: b.dataset.fieldType || "text",
          participantId: b.dataset.participantId || "",
          participantName: b.dataset.participantName || "Unknown",
          page: P ? parseInt(P, 10) : 1,
          linkGroupId: D
        });
      }
    });
    let m = 0;
    const v = 10;
    for (; m < v; ) {
      const b = ea(
        k.linkGroupState,
        o,
        k.fieldInstances,
        a
      );
      if (!b || !b.newPlacement) break;
      k.fieldInstances.push(b.newPlacement), Zi(b.newPlacement.definitionId, !0), m++;
    }
    m > 0 && (It(), wn(), We(), Ys(m));
  }
  function Ys(o) {
    const a = o === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${o} linked fields`;
    window.toastManager && window.toastManager.info(a);
    const l = document.createElement("div");
    l.setAttribute("role", "status"), l.setAttribute("aria-live", "polite"), l.className = "sr-only", l.textContent = a, document.body.appendChild(l), setTimeout(() => l.remove(), 1e3), Ks();
  }
  function Ks() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((a) => {
      a.classList.add("linked-flash"), setTimeout(() => {
        a.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function Xs(o) {
    Js(o);
  }
  function It() {
    const o = document.getElementById("placement-overlays-container");
    o.innerHTML = "", o.style.pointerEvents = "auto", k.fieldInstances.filter((a) => a.page === k.currentPage).forEach((a) => {
      const l = xt[a.type] || xt.text, m = k.selectedFieldId === a.id, v = a.placementSource === ke.AUTO_LINKED, b = document.createElement("div"), L = v ? "border-dashed" : "border-solid";
      b.className = `field-overlay absolute cursor-move ${l.border} border-2 ${L} rounded`, b.style.cssText = `
          left: ${a.x * k.scale}px;
          top: ${a.y * k.scale}px;
          width: ${a.width * k.scale}px;
          height: ${a.height * k.scale}px;
          background-color: ${l.fill};
          ${m ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, b.dataset.instanceId = a.id;
      const P = document.createElement("div");
      if (P.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + l.bg, P.textContent = `${a.type.replace("_", " ")} - ${a.participantName}`, b.appendChild(P), v) {
        const I = document.createElement("div");
        I.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", I.title = "Auto-linked from template", I.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, b.appendChild(I);
      }
      const D = document.createElement("div");
      D.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", D.style.cssText = "transform: translate(50%, 50%);", b.appendChild(D);
      const A = document.createElement("button");
      A.type = "button", A.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", A.innerHTML = "×", A.addEventListener("click", (I) => {
        I.stopPropagation(), er(a.id);
      }), b.appendChild(A), b.addEventListener("mousedown", (I) => {
        I.target === D ? Zs(I, a) : I.target !== A && Qs(I, a, b);
      }), b.addEventListener("click", () => {
        k.selectedFieldId = a.id, It();
      }), o.appendChild(b);
    });
  }
  function Qs(o, a, l) {
    o.preventDefault(), k.isDragging = !0, k.selectedFieldId = a.id;
    const m = o.clientX, v = o.clientY, b = a.x * k.scale, L = a.y * k.scale;
    function P(A) {
      const I = A.clientX - m, U = A.clientY - v;
      a.x = Math.max(0, (b + I) / k.scale), a.y = Math.max(0, (L + U) / k.scale), a.placementSource = ke.MANUAL, l.style.left = `${a.x * k.scale}px`, l.style.top = `${a.y * k.scale}px`;
    }
    function D() {
      k.isDragging = !1, document.removeEventListener("mousemove", P), document.removeEventListener("mouseup", D), We();
    }
    document.addEventListener("mousemove", P), document.addEventListener("mouseup", D);
  }
  function Zs(o, a) {
    o.preventDefault(), o.stopPropagation(), k.isResizing = !0;
    const l = o.clientX, m = o.clientY, v = a.width, b = a.height;
    function L(D) {
      const A = (D.clientX - l) / k.scale, I = (D.clientY - m) / k.scale;
      a.width = Math.max(30, v + A), a.height = Math.max(20, b + I), a.placementSource = ke.MANUAL, It();
    }
    function P() {
      k.isResizing = !1, document.removeEventListener("mousemove", L), document.removeEventListener("mouseup", P), We();
    }
    document.addEventListener("mousemove", L), document.addEventListener("mouseup", P);
  }
  function er(o) {
    const a = k.fieldInstances.find((m) => m.id === o);
    if (!a) return;
    k.fieldInstances = k.fieldInstances.filter((m) => m.id !== o);
    const l = document.querySelector(`.placement-field-item[data-definition-id="${a.definitionId}"]`);
    if (l) {
      l.classList.remove("opacity-50"), l.draggable = !0;
      const m = l.querySelector(".placement-status");
      m && (m.textContent = "Not placed", m.classList.remove("text-green-600"), m.classList.add("text-amber-600"));
    }
    It(), wn(), We();
  }
  function tr() {
    const o = document.getElementById("placement-prev-page"), a = document.getElementById("placement-next-page");
    o.addEventListener("click", async () => {
      k.currentPage > 1 && (k.currentPage--, es(k.currentPage), await pt(k.currentPage));
    }), a.addEventListener("click", async () => {
      k.currentPage < k.totalPages && (k.currentPage++, es(k.currentPage), await pt(k.currentPage));
    });
  }
  function nr() {
    const o = document.getElementById("placement-zoom-in"), a = document.getElementById("placement-zoom-out"), l = document.getElementById("placement-zoom-fit"), m = document.getElementById("placement-zoom-level");
    o.addEventListener("click", async () => {
      k.scale = Math.min(3, k.scale + 0.25), m.textContent = `${Math.round(k.scale * 100)}%`, await pt(k.currentPage);
    }), a.addEventListener("click", async () => {
      k.scale = Math.max(0.5, k.scale - 0.25), m.textContent = `${Math.round(k.scale * 100)}%`, await pt(k.currentPage);
    }), l.addEventListener("click", async () => {
      const v = document.getElementById("placement-viewer"), L = (await k.pdfDoc.getPage(k.currentPage)).getViewport({ scale: 1 });
      k.scale = (v.clientWidth - 40) / L.width, m.textContent = `${Math.round(k.scale * 100)}%`, await pt(k.currentPage);
    });
  }
  function wn() {
    const o = Array.from(document.querySelectorAll(".placement-field-item")), a = o.length, l = new Set(
      o.map((L) => String(L.dataset.definitionId || "").trim()).filter((L) => L)
    ), m = /* @__PURE__ */ new Set();
    k.fieldInstances.forEach((L) => {
      const P = String(L.definitionId || "").trim();
      l.has(P) && m.add(P);
    });
    const v = m.size, b = Math.max(0, a - v);
    document.getElementById("placement-total-fields").textContent = a, document.getElementById("placement-placed-count").textContent = v, document.getElementById("placement-unplaced-count").textContent = b;
  }
  function We() {
    const o = document.getElementById("field-instances-container");
    o.innerHTML = "";
    const a = k.fieldInstances.map((l, m) => fs(l, m));
    K && (K.value = JSON.stringify(a));
  }
  We();
  let Re = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const Nt = document.getElementById("auto-place-btn");
  Nt && Nt.addEventListener("click", async () => {
    if (Re.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      Xt("All fields are already placed", "info");
      return;
    }
    const a = document.querySelector('input[name="id"]')?.value;
    if (!a) {
      wi();
      return;
    }
    Re.isRunning = !0, Nt.disabled = !0, Nt.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const l = await fetch(`${d}/esign/agreements/${a}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: ir()
        })
      });
      if (!l.ok)
        throw await yn(l, "Auto-placement failed");
      const m = await l.json(), v = m && typeof m == "object" && m.run && typeof m.run == "object" ? m.run : m;
      Re.currentRunId = v?.run_id || v?.id || null, Re.suggestions = v?.suggestions || [], Re.resolverScores = v?.resolver_scores || [], Re.suggestions.length === 0 ? (Xt("No placement suggestions found. Try placing fields manually.", "warning"), wi()) : sr(m);
    } catch (l) {
      console.error("Auto-place error:", l);
      const m = fn(l?.message || "Auto-placement failed", l?.code || "", l?.status || 0);
      Xt(`Auto-placement failed: ${m}`, "error"), wi();
    } finally {
      Re.isRunning = !1, Nt.disabled = !1, Nt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function ir() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function wi() {
    const o = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let a = 100;
    o.forEach((l) => {
      const m = {
        definitionId: l.dataset.definitionId,
        fieldType: l.dataset.fieldType,
        participantId: l.dataset.participantId,
        participantName: l.dataset.participantName
      }, v = zn[m.fieldType] || zn.text;
      k.currentPage = k.totalPages, Qi(m, 300, a + v.height / 2, { placementSource: ke.AUTO_FALLBACK }), a += v.height + 20;
    }), k.pdfDoc && pt(k.totalPages), Xt("Fields placed using fallback layout", "info");
  }
  function sr(o) {
    let a = document.getElementById("placement-suggestions-modal");
    a || (a = rr(), document.body.appendChild(a));
    const l = a.querySelector("#suggestions-list"), m = a.querySelector("#resolver-info"), v = a.querySelector("#run-stats");
    m.innerHTML = Re.resolverScores.map((b) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${de(String(b?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${b.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${ur(b.score)}">
              ${(Number(b?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), v.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${de(String(o?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${o.status === "completed" ? "text-green-600" : "text-amber-600"}">${de(String(o?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(o?.elapsed_ms || 0))}ms</span>
      </div>
    `, l.innerHTML = Re.suggestions.map((b, L) => {
      const P = ts(b.field_definition_id), D = xt[P?.type] || xt.text, A = de(String(P?.type || "field").replace(/_/g, " ")), I = de(String(b?.id || "")), U = Math.max(1, Number(b?.page_number || 1)), q = Math.round(Number(b?.x || 0)), G = Math.round(Number(b?.y || 0)), O = Math.max(0, Number(b?.confidence || 0)), z = de(pr(String(b?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${L}" data-suggestion-id="${I}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${D.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${A}</div>
                <div class="text-xs text-gray-500">Page ${U}, (${q}, ${G})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${dr(b.confidence)}">
                ${(O * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${z}
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
    }).join(""), ar(a), a.classList.remove("hidden");
  }
  function rr() {
    const o = document.createElement("div");
    return o.id = "placement-suggestions-modal", o.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", o.innerHTML = `
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
    `, o.querySelector("#close-suggestions-modal").addEventListener("click", () => {
      o.classList.add("hidden");
    }), o.addEventListener("click", (a) => {
      a.target === o && o.classList.add("hidden");
    }), o.querySelector("#accept-all-btn").addEventListener("click", () => {
      o.querySelectorAll(".suggestion-item").forEach((a) => {
        a.classList.add("border-green-500", "bg-green-50"), a.classList.remove("border-red-500", "bg-red-50"), a.dataset.accepted = "true";
      });
    }), o.querySelector("#reject-all-btn").addEventListener("click", () => {
      o.querySelectorAll(".suggestion-item").forEach((a) => {
        a.classList.add("border-red-500", "bg-red-50"), a.classList.remove("border-green-500", "bg-green-50"), a.dataset.accepted = "false";
      });
    }), o.querySelector("#apply-suggestions-btn").addEventListener("click", () => {
      cr(), o.classList.add("hidden");
    }), o.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      o.classList.add("hidden");
      const a = o.querySelector("#placement-policy-preset-modal"), l = document.getElementById("placement-policy-preset");
      l && a && (l.value = a.value), Nt?.click();
    }), o;
  }
  function ar(o) {
    o.querySelectorAll(".accept-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const l = a.closest(".suggestion-item");
        l.classList.add("border-green-500", "bg-green-50"), l.classList.remove("border-red-500", "bg-red-50"), l.dataset.accepted = "true";
      });
    }), o.querySelectorAll(".reject-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const l = a.closest(".suggestion-item");
        l.classList.add("border-red-500", "bg-red-50"), l.classList.remove("border-green-500", "bg-green-50"), l.dataset.accepted = "false";
      });
    }), o.querySelectorAll(".preview-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const l = parseInt(a.dataset.index, 10), m = Re.suggestions[l];
        m && or(m);
      });
    });
  }
  function or(o) {
    o.page_number !== k.currentPage && (k.currentPage = o.page_number, pt(o.page_number));
    const a = document.getElementById("placement-overlays-container"), l = document.getElementById("suggestion-preview-overlay");
    l && l.remove();
    const m = document.createElement("div");
    m.id = "suggestion-preview-overlay", m.className = "absolute pointer-events-none animate-pulse", m.style.cssText = `
      left: ${o.x * k.scale}px;
      top: ${o.y * k.scale}px;
      width: ${o.width * k.scale}px;
      height: ${o.height * k.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, a.appendChild(m), setTimeout(() => m.remove(), 3e3);
  }
  function cr() {
    const a = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    a.forEach((l) => {
      const m = parseInt(l.dataset.index, 10), v = Re.suggestions[m];
      if (!v) return;
      const b = ts(v.field_definition_id);
      if (!b) return;
      const L = document.querySelector(`.placement-field-item[data-definition-id="${v.field_definition_id}"]`);
      if (!L || L.classList.contains("opacity-50")) return;
      const P = {
        definitionId: v.field_definition_id,
        fieldType: b.type,
        participantId: b.participant_id,
        participantName: L.dataset.participantName
      };
      k.currentPage = v.page_number, lr(P, v);
    }), k.pdfDoc && pt(k.currentPage), gr(a.length, Re.suggestions.length - a.length), Xt(`Applied ${a.length} placement${a.length !== 1 ? "s" : ""}`, "success");
  }
  function lr(o, a) {
    const l = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: o.definitionId,
      type: o.fieldType,
      participantId: o.participantId,
      participantName: o.participantName,
      page: a.page_number,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      // Track placement source for audit
      placementSource: ke.AUTO,
      resolverId: a.resolver_id,
      confidence: a.confidence,
      placementRunId: Re.currentRunId
    };
    k.fieldInstances.push(l);
    const m = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (m) {
      m.classList.add("opacity-50"), m.draggable = !1;
      const v = m.querySelector(".placement-status");
      v && (v.textContent = "Placed", v.classList.remove("text-amber-600"), v.classList.add("text-green-600"));
    }
    It(), wn(), We();
  }
  function ts(o) {
    const a = document.querySelector(`.field-definition-entry[data-field-definition-id="${o}"]`);
    return a ? {
      id: o,
      type: a.querySelector(".field-type-select")?.value || "text",
      participant_id: a.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function dr(o) {
    return o >= 0.9 ? "bg-green-100 text-green-800" : o >= 0.7 ? "bg-blue-100 text-blue-800" : o >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function ur(o) {
    return o >= 0.8 ? "bg-green-100 text-green-800" : o >= 0.6 ? "bg-blue-100 text-blue-800" : o >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function pr(o) {
    return o ? o.split("_").map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(" ") : "Unknown";
  }
  async function gr(o, a) {
  }
  function Xt(o, a = "info") {
    const l = document.createElement("div");
    l.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${a === "success" ? "bg-green-600 text-white" : a === "error" ? "bg-red-600 text-white" : a === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, l.textContent = o, document.body.appendChild(l), setTimeout(() => {
      l.style.opacity = "0", setTimeout(() => l.remove(), 300);
    }, 3e3);
  }
  function mr() {
    const o = document.getElementById("send-readiness-loading"), a = document.getElementById("send-readiness-results"), l = document.getElementById("send-validation-status"), m = document.getElementById("send-validation-issues"), v = document.getElementById("send-issues-list"), b = document.getElementById("send-confirmation"), L = document.getElementById("review-agreement-title"), P = document.getElementById("review-document-title"), D = document.getElementById("review-participant-count"), A = document.getElementById("review-stage-count"), I = document.getElementById("review-participants-list"), U = document.getElementById("review-fields-summary"), q = document.getElementById("title").value || "Untitled", G = _e.textContent || "No document", O = De.querySelectorAll(".participant-entry"), z = Ie.querySelectorAll(".field-definition-entry"), X = Rt(Ze(), Me()), se = te(), me = /* @__PURE__ */ new Set();
    O.forEach((Q) => {
      const ae = Q.querySelector(".signing-stage-input");
      Q.querySelector('select[name*=".role"]').value === "signer" && ae?.value && me.add(parseInt(ae.value, 10));
    }), L.textContent = q, P.textContent = G, D.textContent = `${O.length} (${se.length} signers)`, A.textContent = me.size > 0 ? me.size : "1", I.innerHTML = "", O.forEach((Q) => {
      const ae = Q.querySelector('input[name*=".name"]'), Qt = Q.querySelector('input[name*=".email"]'), Et = Q.querySelector('select[name*=".role"]'), Zt = Q.querySelector(".signing-stage-input"), en = Q.querySelector(".notify-input"), Ut = document.createElement("div");
      Ut.className = "flex items-center justify-between text-sm", Ut.innerHTML = `
        <div>
          <span class="font-medium">${de(ae.value || Qt.value)}</span>
          <span class="text-gray-500 ml-2">${de(Qt.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Et.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Et.value === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${en?.checked !== !1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${en?.checked !== !1 ? "Notify" : "No Notify"}
          </span>
          ${Et.value === "signer" && Zt?.value ? `<span class="text-xs text-gray-500">Stage ${Zt.value}</span>` : ""}
        </div>
      `, I.appendChild(Ut);
    });
    const we = z.length + X.length;
    U.textContent = `${we} field${we !== 1 ? "s" : ""} defined (${z.length} manual, ${X.length} generated)`;
    const re = [];
    be.value || re.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), se.length === 0 && re.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), hi().forEach((Q) => {
      re.push({
        severity: "error",
        message: `${Q.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const nt = Array.from(me).sort((Q, ae) => Q - ae);
    for (let Q = 0; Q < nt.length; Q++)
      if (nt[Q] !== Q + 1) {
        re.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Si = re.some((Q) => Q.severity === "error"), xi = re.some((Q) => Q.severity === "warning");
    Si ? (l.className = "p-4 rounded-lg bg-red-50 border border-red-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, b.classList.add("hidden"), et.disabled = !0) : xi ? (l.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, b.classList.remove("hidden"), et.disabled = !1) : (l.className = "p-4 rounded-lg bg-green-50 border border-green-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, b.classList.remove("hidden"), et.disabled = !1), re.length > 0 ? (m.classList.remove("hidden"), v.innerHTML = "", re.forEach((Q) => {
      const ae = document.createElement("li");
      ae.className = `p-3 rounded-lg flex items-center justify-between ${Q.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, ae.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Q.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Q.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${de(Q.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Q.step}">
            ${de(Q.action)}
          </button>
        `, v.appendChild(ae);
    }), v.querySelectorAll("[data-go-to-step]").forEach((Q) => {
      Q.addEventListener("click", () => {
        const ae = Number(Q.getAttribute("data-go-to-step"));
        Number.isFinite(ae) && vn(ae);
      });
    })) : m.classList.add("hidden"), o.classList.add("hidden"), a.classList.remove("hidden");
  }
  let bi = null;
  function tt() {
    bi && clearTimeout(bi), bi = setTimeout(() => {
      mt();
    }, 500);
  }
  be && new MutationObserver(() => {
    mt();
  }).observe(be, { attributes: !0, attributeFilter: ["value"] });
  const ns = document.getElementById("title"), hr = document.getElementById("message");
  ns?.addEventListener("input", () => {
    const o = String(ns?.value || "").trim() === "" ? ie.AUTOFILL : ie.USER;
    H.setTitleSource(o), tt();
  }), hr?.addEventListener("input", tt), De.addEventListener("input", tt), De.addEventListener("change", tt), Ie.addEventListener("input", tt), Ie.addEventListener("change", tt), f?.addEventListener("input", tt), f?.addEventListener("change", tt);
  const fr = We;
  We = function() {
    fr(), mt();
  };
  function yr() {
    const o = H.getState();
    !o.participants || o.participants.length === 0 || (De.innerHTML = "", fe = 0, o.participants.forEach((a) => {
      bt({
        id: a.tempId,
        name: a.name,
        email: a.email,
        role: a.role,
        notify: a.notify !== !1,
        signing_stage: a.signingStage
      });
    }));
  }
  function vr() {
    const o = H.getState();
    !o.fieldDefinitions || o.fieldDefinitions.length === 0 || (Ie.innerHTML = "", Z = 0, o.fieldDefinitions.forEach((a) => {
      On({
        id: a.tempId,
        type: a.type,
        participant_id: a.participantTempId,
        page: a.page,
        required: a.required
      });
    }), jn());
  }
  function wr() {
    const o = H.getState();
    !Array.isArray(o.fieldRules) || o.fieldRules.length === 0 || f && (f.querySelectorAll(".field-rule-entry").forEach((a) => a.remove()), Ee = 0, o.fieldRules.forEach((a) => {
      Oi({
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
    }), Kt(), St());
  }
  function br() {
    const o = H.getState();
    !Array.isArray(o.fieldPlacements) || o.fieldPlacements.length === 0 || (k.fieldInstances = o.fieldPlacements.map((a, l) => Yn(a, l)), We());
  }
  if (window._resumeToStep) {
    yr(), vr(), wr(), ut(), br();
    const o = H.getState();
    o.document?.id && At.setDocument(o.document.id, o.document.title, o.document.pageCount), ge = window._resumeToStep, yi(), delete window._resumeToStep;
  } else if (yi(), be.value) {
    const o = _e?.textContent || null, a = pe(Ge.value, null);
    At.setDocument(be.value, o, a);
  }
  c && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function ca(i) {
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
class Ms {
  constructor(e) {
    this.initialized = !1, this.config = ca(e);
  }
  init() {
    this.initialized || (this.initialized = !0, oa(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function Eo(i) {
  const e = new Ms(i);
  return ne(() => e.init()), e;
}
function la(i) {
  const e = new Ms({
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
  ne(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
typeof document < "u" && ne(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}");
      la({
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
const da = "esign.signer.profile.v1", ys = "esign.signer.profile.outbox.v1", Mi = 90, vs = 500 * 1024;
class ua {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : Mi;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${da}:${e}`;
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
class pa {
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
class ki {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(ys);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [s, d] of Object.entries(t)) {
        if (!d || typeof d != "object")
          continue;
        const p = d;
        if (p.op === "clear") {
          n[s] = {
            op: "clear",
            updatedAt: Number(p.updatedAt) || Date.now()
          };
          continue;
        }
        const c = p.op === "patch" ? p.patch : p;
        n[s] = {
          op: "patch",
          patch: c && typeof c == "object" ? c : {},
          updatedAt: Number(p.updatedAt) || Date.now()
        };
      }
      return n;
    } catch {
      return {};
    }
  }
  outboxSave(e) {
    try {
      window.localStorage.setItem(ys, JSON.stringify(e));
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
function ga(i) {
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
      ttlDays: Number(i.profile?.ttlDays || Mi) || Mi,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function ma(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function Ai(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function ha(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Fe(i) {
  const e = String(i || "").trim();
  return ha(e) ? "" : e;
}
function fa(i) {
  const e = new ua(i.profile.ttlDays), t = new pa(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new ki("local_only", e, null) : i.profile.mode === "remote_only" ? new ki("remote_only", e, t) : new ki("hybrid", e, t);
}
function ya() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function va(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = ga(i), s = ma(n), d = fa(n);
  ya();
  const p = {
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
        totalFields: c.fieldState.size,
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
        totalFields: c.fieldState?.size || 0,
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
    p.track("session_end", p.getSessionSummary()), p.flush();
  }), setInterval(() => p.flush(), 3e4);
  const c = {
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
    c.overlayRenderFrameID || (c.overlayRenderFrameID = window.requestAnimationFrame(() => {
      c.overlayRenderFrameID = 0, He();
    }));
  }
  function w(r) {
    const u = c.fieldState.get(r);
    u && (delete u.previewValueText, delete u.previewValueBool, delete u.previewSignatureUrl);
  }
  function E() {
    c.fieldState.forEach((r) => {
      delete r.previewValueText, delete r.previewValueBool, delete r.previewSignatureUrl;
    });
  }
  function _(r, u) {
    const g = c.fieldState.get(r);
    if (!g) return;
    const f = Fe(String(u || ""));
    if (!f) {
      delete g.previewValueText;
      return;
    }
    g.previewValueText = f, delete g.previewValueBool, delete g.previewSignatureUrl;
  }
  function N(r, u) {
    const g = c.fieldState.get(r);
    g && (g.previewValueBool = !!u, delete g.previewValueText, delete g.previewSignatureUrl);
  }
  function R(r, u) {
    const g = c.fieldState.get(r);
    if (!g) return;
    const f = String(u || "").trim();
    if (!f) {
      delete g.previewSignatureUrl;
      return;
    }
    g.previewSignatureUrl = f, delete g.previewValueText, delete g.previewValueBool;
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
      const g = r.page, f = this.getPageMetadata(g), y = u.offsetWidth, x = u.offsetHeight, C = r.pageWidth || f.width, M = r.pageHeight || f.height, F = y / C, K = x / M;
      let J = r.posX || 0, Z = r.posY || 0;
      n.viewer.origin === "bottom-left" && (Z = M - Z - (r.height || 30));
      const Ee = J * F, Be = Z * K, Y = (r.width || 150) * F, te = (r.height || 30) * K;
      return {
        left: Ee,
        top: Be,
        width: Y,
        height: te,
        // Store original values for debugging
        _debug: {
          sourceX: J,
          sourceY: Z,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: C,
          pageHeight: M,
          scaleX: F,
          scaleY: K,
          zoom: c.zoomLevel,
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
  }, V = {
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
        throw await Oe(y, "Failed to get upload contract");
      const x = await y.json(), C = x?.contract || x;
      if (!C || typeof C != "object" || !C.upload_url)
        throw new Error("Invalid upload contract response");
      return C;
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
      r.headers && Object.entries(r.headers).forEach(([x, C]) => {
        const M = String(x).toLowerCase();
        M === "x-esign-upload-token" || M === "x-esign-upload-key" || (f[x] = String(C));
      });
      const y = await fetch(g.toString(), {
        method: r.method || "PUT",
        headers: f,
        body: u,
        credentials: "omit"
      });
      if (!y.ok)
        throw await Oe(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [u, g] = r.split(","), f = u.match(/data:([^;]+)/), y = f ? f[1] : "image/png", x = atob(g), C = new Uint8Array(x.length);
      for (let M = 0; M < x.length; M++)
        C[M] = x.charCodeAt(M);
      return new Blob([C], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, u) {
      const g = this.dataUrlToBlob(u), f = g.size, y = "image/png", x = await gt(g), C = await this.requestUploadBootstrap(
        r,
        x,
        y,
        f
      );
      return await this.uploadToSignedUrl(C, g), {
        uploadToken: C.upload_token,
        objectKey: C.object_key,
        sha256: C.sha256,
        contentType: C.content_type
      };
    }
  }, W = {
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
        const x = await f.json().catch(() => ({})), C = new Error(x?.error?.message || "Failed to save signature");
        throw C.code = x?.error?.code || "", C;
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
  function ee(r) {
    const u = c.fieldState.get(r);
    return u && u.type === "initials" ? "initials" : "signature";
  }
  function ce(r) {
    return c.savedSignaturesByType.get(r) || [];
  }
  async function he(r, u = !1) {
    const g = ee(r);
    if (!u && c.savedSignaturesByType.has(g)) {
      le(r);
      return;
    }
    const f = await W.list(g);
    c.savedSignaturesByType.set(g, f), le(r);
  }
  function le(r) {
    const u = ee(r), g = ce(u), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!g.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = g.map((y) => {
        const x = it(String(y?.thumbnail_data_url || y?.data_url || "")), C = it(String(y?.label || "Saved signature")), M = it(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${C}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${C}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${it(r)}" data-signature-id="${M}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${it(r)}" data-signature-id="${M}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Pe(r) {
    const u = c.signatureCanvases.get(r), g = ee(r);
    if (!u || !de(r))
      throw new Error(`Please add your ${g === "initials" ? "initials" : "signature"} first`);
    const f = u.canvas.toDataURL("image/png"), y = await W.save(g, f, g === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const x = ce(g);
    x.unshift(y), c.savedSignaturesByType.set(g, x), le(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function Ne(r, u) {
    const g = ee(r), y = ce(g).find((C) => String(C?.id || "") === String(u));
    if (!y) return;
    requestAnimationFrame(() => yt(r)), await $e(r);
    const x = String(y.data_url || y.thumbnail_data_url || "").trim();
    x && (await Gt(r, x, { clearStrokes: !0 }), R(r, x), S(), Mt("draw", r), fe("Saved signature selected."));
  }
  async function Je(r, u) {
    const g = ee(r);
    await W.delete(u);
    const f = ce(g).filter((y) => String(y?.id || "") !== String(u));
    c.savedSignaturesByType.set(g, f), le(r);
  }
  function Ue(r) {
    const u = String(r?.code || "").trim(), g = String(r?.message || "Unable to update saved signatures"), f = u === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : g;
    window.toastManager && window.toastManager.error(f), fe(f, "assertive");
  }
  async function $e(r, u = 8) {
    for (let g = 0; g < u; g++) {
      if (c.signatureCanvases.has(r)) return !0;
      await new Promise((f) => setTimeout(f, 40)), yt(r);
    }
    return !1;
  }
  async function ie(r, u) {
    const g = String(u?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(g))
      throw new Error("Only PNG and JPEG images are supported");
    if (u.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => yt(r)), await $e(r);
    const f = c.signatureCanvases.get(r);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const y = await Se(u), x = g === "image/png" ? y : await kt(y, f.drawWidth, f.drawHeight);
    if (sn(x) > vs)
      throw new Error(`Image exceeds ${Math.round(vs / 1024)}KB limit after conversion`);
    await Gt(r, x, { clearStrokes: !0 }), R(r, x), S();
    const M = document.getElementById("sig-upload-preview-wrap"), F = document.getElementById("sig-upload-preview");
    M && M.classList.remove("hidden"), F && F.setAttribute("src", x), fe("Signature image uploaded. You can now insert it.");
  }
  function Se(r) {
    return new Promise((u, g) => {
      const f = new FileReader();
      f.onload = () => u(String(f.result || "")), f.onerror = () => g(new Error("Unable to read image file")), f.readAsDataURL(r);
    });
  }
  function sn(r) {
    const u = String(r || "").split(",");
    if (u.length < 2) return 0;
    const g = u[1] || "", f = (g.match(/=+$/) || [""])[0].length;
    return Math.floor(g.length * 3 / 4) - f;
  }
  async function kt(r, u, g) {
    return await new Promise((f, y) => {
      const x = new Image();
      x.onload = () => {
        const C = document.createElement("canvas"), M = Math.max(1, Math.round(Number(u) || 600)), F = Math.max(1, Math.round(Number(g) || 160));
        C.width = M, C.height = F;
        const K = C.getContext("2d");
        if (!K) {
          y(new Error("Unable to process image"));
          return;
        }
        K.clearRect(0, 0, M, F);
        const J = Math.min(M / x.width, F / x.height), Z = x.width * J, Ee = x.height * J, Be = (M - Z) / 2, Y = (F - Ee) / 2;
        K.drawImage(x, Be, Y, Z, Ee), f(C.toDataURL("image/png"));
      }, x.onerror = () => y(new Error("Unable to decode image file")), x.src = r;
    });
  }
  async function gt(r) {
    if (window.crypto && window.crypto.subtle) {
      const u = await r.arrayBuffer(), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function ti() {
    document.addEventListener("click", (r) => {
      const u = r.target;
      if (!(u instanceof Element)) return;
      const g = u.closest("[data-esign-action]");
      if (!g) return;
      switch (g.getAttribute("data-esign-action")) {
        case "prev-page":
          An();
          break;
        case "next-page":
          Pn();
          break;
        case "zoom-out":
          Tn();
          break;
        case "zoom-in":
          on();
          break;
        case "fit-width":
          ft();
          break;
        case "download-document":
          Un();
          break;
        case "show-consent-modal":
          $t();
          break;
        case "activate-field": {
          const y = g.getAttribute("data-field-id");
          y && Ve(y);
          break;
        }
        case "submit-signature":
          Nn();
          break;
        case "show-decline-modal":
          pi();
          break;
        case "close-field-editor":
          Vt();
          break;
        case "save-field-editor":
          li();
          break;
        case "hide-consent-modal":
          Ce();
          break;
        case "accept-consent":
          Fn();
          break;
        case "hide-decline-modal":
          Bt();
          break;
        case "confirm-decline":
          De();
          break;
        case "retry-load-pdf":
          ye();
          break;
        case "signature-tab": {
          const y = g.getAttribute("data-tab") || "draw", x = g.getAttribute("data-field-id");
          x && Mt(y, x);
          break;
        }
        case "clear-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && $n(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && Mn(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && ci(y);
          break;
        }
        case "save-current-signature-library": {
          const y = g.getAttribute("data-field-id");
          y && Pe(y).catch(Ue);
          break;
        }
        case "select-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && Ne(y, x).catch(Ue);
          break;
        }
        case "delete-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && Je(y, x).catch(Ue);
          break;
        }
        case "clear-signer-profile":
          Cn().catch(() => {
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
      const u = r.target;
      if (u instanceof HTMLInputElement) {
        if (u.matches("#sig-upload-input")) {
          const g = u.getAttribute("data-field-id"), f = u.files?.[0];
          if (!g || !f) return;
          ie(g, f).catch((y) => {
            window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (u.matches("#field-checkbox-input")) {
          const g = u.getAttribute("data-field-id") || c.activeFieldId;
          if (!g) return;
          N(g, u.checked), S();
        }
      }
    }), document.addEventListener("input", (r) => {
      const u = r.target;
      if (!(u instanceof HTMLInputElement) && !(u instanceof HTMLTextAreaElement)) return;
      const g = u.getAttribute("data-field-id") || c.activeFieldId;
      if (g) {
        if (u.matches("#sig-type-input")) {
          dn(g, u.value || "", { syncOverlay: !0 });
          return;
        }
        if (u.matches("#field-text-input")) {
          _(g, u.value || ""), S();
          return;
        }
        u.matches("#field-checkbox-input") && u instanceof HTMLInputElement && (N(g, u.checked), S());
      }
    });
  }
  ne(async () => {
    ti(), c.isLowMemory = ai(), H(), Ye(), await At(), Te(), Ot(), Qe(), wt(), await ye(), He(), document.addEventListener("visibilitychange", ni), "memory" in navigator && En(), lt.init();
  });
  function ni() {
    document.hidden && In();
  }
  function In() {
    const r = c.isLowMemory ? 1 : 2;
    for (; c.renderedPages.size > r; ) {
      let u = null, g = 1 / 0;
      if (c.renderedPages.forEach((f, y) => {
        y !== c.currentPage && f.timestamp < g && (u = y, g = f.timestamp);
      }), u !== null)
        c.renderedPages.delete(u);
      else
        break;
    }
  }
  function En() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, u = navigator.memory.totalJSHeapSize;
        r / u > 0.8 && (c.isLowMemory = !0, In());
      }
    }, 3e4);
  }
  function ii(r) {
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
  function H() {
    const r = document.getElementById("pdf-compatibility-banner"), u = document.getElementById("pdf-compatibility-message"), g = document.getElementById("pdf-compatibility-title");
    if (!r || !u || !g) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      r.classList.add("hidden");
      return;
    }
    g.textContent = "Preview Compatibility Notice", u.textContent = String(n.viewer.compatibilityMessage || "").trim() || ii(y), r.classList.remove("hidden"), p.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: y });
  }
  function Ye() {
    const r = document.getElementById("stage-state-banner"), u = document.getElementById("stage-state-icon"), g = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !u || !g || !f || !y) return;
    const x = n.signerState || "active", C = n.recipientStage || 1, M = n.activeStage || 1, F = n.activeRecipientIds || [], K = n.waitingForRecipientIds || [];
    let J = {
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
        J = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: C > M ? `You are in signing stage ${C}. Stage ${M} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, K.length > 0 && J.badges.push({
          icon: "iconoir-group",
          text: `${K.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        J = {
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
        J = {
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
        F.length > 1 ? (J.message = `You and ${F.length - 1} other signer(s) can sign now.`, J.badges = [
          { icon: "iconoir-users", text: `Stage ${M} active`, variant: "green" }
        ]) : C > 1 ? J.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${C}`, variant: "green" }
        ] : J.hidden = !0;
        break;
    }
    if (J.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${J.bgClass} ${J.borderClass}`, u.className = `${J.iconClass} mt-0.5`, g.className = `text-sm font-semibold ${J.titleClass}`, g.textContent = J.title, f.className = `text-xs ${J.messageClass} mt-1`, f.textContent = J.message, y.innerHTML = "", J.badges.forEach((Z) => {
      const Ee = document.createElement("span"), Be = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      Ee.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${Be[Z.variant] || Be.blue}`, Ee.innerHTML = `<i class="${Z.icon} mr-1"></i>${Z.text}`, y.appendChild(Ee);
    });
  }
  function Te() {
    n.fields.forEach((r) => {
      let u = null, g = !1;
      if (r.type === "checkbox")
        u = r.value_bool || !1, g = u;
      else if (r.type === "date_signed")
        u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], g = !0;
      else {
        const f = String(r.value_text || "");
        u = f || si(r), g = !!f;
      }
      c.fieldState.set(r.id, {
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
  async function At() {
    try {
      const r = await d.load(c.profileKey);
      r && (c.profileData = r, c.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function si(r) {
    const u = c.profileData;
    if (!u) return "";
    const g = String(r?.type || "").trim();
    return g === "name" ? Fe(u.fullName || "") : g === "initials" ? Fe(u.initials || "") || Ai(u.fullName || n.recipientName || "") : g === "signature" ? Fe(u.typedSignature || "") : "";
  }
  function Ln(r) {
    return !n.profile.persistDrawnSignature || !c.profileData ? "" : r?.type === "initials" && String(c.profileData.drawnInitialsDataUrl || "").trim() || String(c.profileData.drawnSignatureDataUrl || "").trim();
  }
  function ri(r) {
    const u = Fe(r?.value || "");
    return u || (c.profileData ? r?.type === "initials" ? Fe(c.profileData.initials || "") || Ai(c.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? Fe(c.profileData.typedSignature || "") : "" : "");
  }
  function qt() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : c.profileRemember;
  }
  async function Cn(r = !1) {
    let u = null;
    try {
      await d.clear(c.profileKey);
    } catch (g) {
      u = g;
    } finally {
      c.profileData = null, c.profileRemember = n.profile.rememberByDefault;
    }
    if (u) {
      if (!r && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !r)
        throw u;
      return;
    }
    !r && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function rn(r, u = {}) {
    const g = qt();
    if (c.profileRemember = g, !g) {
      await Cn(!0);
      return;
    }
    if (!r) return;
    const f = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const x = Fe(r.value);
      x && (f.fullName = x, (c.profileData?.initials || "").trim() || (f.initials = Ai(x)));
    }
    if (y === "initials") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = u.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Fe(r.value);
        x && (f.initials = x);
      }
    }
    if (y === "signature") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnSignatureDataUrl = u.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Fe(r.value);
        x && (f.typedSignature = x);
      }
    }
    if (!(Object.keys(f).length === 1 && f.remember === !0))
      try {
        const x = await d.save(c.profileKey, f);
        c.profileData = x;
      } catch {
      }
  }
  function Ot() {
    const r = document.getElementById("consent-checkbox"), u = document.getElementById("consent-accept-btn");
    r && u && r.addEventListener("change", function() {
      u.disabled = !this.checked;
    });
  }
  function ai() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function mt() {
    const r = c.isLowMemory ? 3 : c.maxCachedPages;
    if (c.renderedPages.size <= r) return;
    const u = [];
    for (c.renderedPages.forEach((g, f) => {
      const y = Math.abs(f - c.currentPage);
      u.push({ pageNum: f, distance: y });
    }), u.sort((g, f) => f.distance - g.distance); c.renderedPages.size > r && u.length > 0; ) {
      const g = u.shift();
      g && g.pageNum !== c.currentPage && c.renderedPages.delete(g.pageNum);
    }
  }
  function be(r) {
    if (c.isLowMemory) return;
    const u = [];
    r > 1 && u.push(r - 1), r < n.pageCount && u.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      u.forEach(async (g) => {
        !c.renderedPages.has(g) && !c.pageRendering && await Pt(g);
      });
    }, { timeout: 2e3 });
  }
  async function Pt(r) {
    if (!(!c.pdfDoc || c.renderedPages.has(r)))
      try {
        const u = await c.pdfDoc.getPage(r), g = c.zoomLevel, f = u.getViewport({ scale: g * window.devicePixelRatio }), y = document.createElement("canvas"), x = y.getContext("2d");
        y.width = f.width, y.height = f.height;
        const C = {
          canvasContext: x,
          viewport: f
        };
        await u.render(C).promise, c.renderedPages.set(r, {
          canvas: y,
          scale: g,
          timestamp: Date.now()
        }), mt();
      } catch (u) {
        console.warn("Preload failed for page", r, u);
      }
  }
  function Tt() {
    const r = window.devicePixelRatio || 1;
    return c.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function ye() {
    const r = document.getElementById("pdf-loading"), u = Date.now();
    try {
      const g = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!g.ok)
        throw new Error("Failed to load document");
      const y = (await g.json()).assets || {}, x = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const C = pdfjsLib.getDocument(x);
      c.pdfDoc = await C.promise, n.pageCount = c.pdfDoc.numPages, document.getElementById("page-count").textContent = c.pdfDoc.numPages, await Ke(1), rt(), p.trackViewerLoad(!0, Date.now() - u), p.trackPageView(1);
    } catch (g) {
      console.error("PDF load error:", g), p.trackViewerLoad(!1, Date.now() - u, g.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), gi();
    }
  }
  async function Ke(r) {
    if (!c.pdfDoc) return;
    const u = c.renderedPages.get(r);
    if (u && u.scale === c.zoomLevel) {
      kn(u), c.currentPage = r, document.getElementById("current-page").textContent = r, rt(), He(), be(r);
      return;
    }
    c.pageRendering = !0;
    try {
      const g = await c.pdfDoc.getPage(r), f = c.zoomLevel, y = Tt(), x = g.getViewport({ scale: f * y }), C = g.getViewport({ scale: 1 });
      B.setPageViewport(r, {
        width: C.width,
        height: C.height,
        rotation: C.rotation || 0
      });
      const M = document.getElementById("pdf-page-1");
      M.innerHTML = "";
      const F = document.createElement("canvas"), K = F.getContext("2d");
      F.height = x.height, F.width = x.width, F.style.width = `${x.width / y}px`, F.style.height = `${x.height / y}px`, M.appendChild(F);
      const J = document.getElementById("pdf-container");
      J.style.width = `${x.width / y}px`;
      const Z = {
        canvasContext: K,
        viewport: x
      };
      await g.render(Z).promise, c.renderedPages.set(r, {
        canvas: F.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / y,
        displayHeight: x.height / y
      }), c.renderedPages.get(r).canvas.getContext("2d").drawImage(F, 0, 0), mt(), c.currentPage = r, document.getElementById("current-page").textContent = r, rt(), He(), p.trackPageView(r), be(r);
    } catch (g) {
      console.error("Page render error:", g);
    } finally {
      if (c.pageRendering = !1, c.pageNumPending !== null) {
        const g = c.pageNumPending;
        c.pageNumPending = null, await Ke(g);
      }
    }
  }
  function kn(r, u) {
    const g = document.getElementById("pdf-page-1");
    g.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = r.canvas.width, f.height = r.canvas.height, f.style.width = `${r.displayWidth}px`, f.style.height = `${r.displayHeight}px`, f.getContext("2d").drawImage(r.canvas, 0, 0), g.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${r.displayWidth}px`;
  }
  function _e(r) {
    c.pageRendering ? c.pageNumPending = r : Ke(r);
  }
  function st(r) {
    return typeof r.previewValueText == "string" && r.previewValueText.trim() !== "" ? Fe(r.previewValueText) : typeof r.value == "string" && r.value.trim() !== "" ? Fe(r.value) : "";
  }
  function Ge(r, u, g, f = !1) {
    const y = document.createElement("img");
    y.className = "field-overlay-preview", y.src = u, y.alt = g, r.appendChild(y), r.classList.add("has-preview"), f && r.classList.add("draft-preview");
  }
  function _t(r, u, g = !1, f = !1) {
    const y = document.createElement("span");
    y.className = "field-overlay-value", g && y.classList.add("font-signature"), y.textContent = u, r.appendChild(y), r.classList.add("has-value"), f && r.classList.add("draft-preview");
  }
  function an(r, u) {
    const g = document.createElement("span");
    g.className = "field-overlay-label", g.textContent = u, r.appendChild(g);
  }
  function He() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const u = document.getElementById("pdf-container");
    c.fieldState.forEach((g, f) => {
      if (g.page !== c.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = f, g.required && y.classList.add("required"), g.completed && y.classList.add("completed"), c.activeFieldId === f && y.classList.add("active"), g.posX != null && g.posY != null && g.width != null && g.height != null) {
        const Z = B.getOverlayStyles(g, u);
        y.style.left = Z.left, y.style.top = Z.top, y.style.width = Z.width, y.style.height = Z.height, y.style.transform = Z.transform, lt.enabled && (y.dataset.debugCoords = JSON.stringify(
          B.pageToScreen(g, u)._debug
        ));
      } else {
        const Z = Array.from(c.fieldState.keys()).indexOf(f);
        y.style.left = "10px", y.style.top = `${100 + Z * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const C = String(g.previewSignatureUrl || "").trim(), M = String(g.signaturePreviewUrl || "").trim(), F = st(g), K = g.type === "signature" || g.type === "initials", J = typeof g.previewValueBool == "boolean";
      if (C)
        Ge(y, C, xe(g.type), !0);
      else if (g.completed && M)
        Ge(y, M, xe(g.type));
      else if (F) {
        const Z = typeof g.previewValueText == "string" && g.previewValueText.trim() !== "";
        _t(y, F, K, Z);
      } else g.type === "checkbox" && (J ? g.previewValueBool : !!g.value) ? _t(y, "Checked", !1, J) : an(y, xe(g.type));
      y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${xe(g.type)} field${g.required ? ", required" : ""}${g.completed ? ", completed" : ""}`), y.addEventListener("click", () => Ve(f)), y.addEventListener("keydown", (Z) => {
        (Z.key === "Enter" || Z.key === " ") && (Z.preventDefault(), Ve(f));
      }), r.appendChild(y);
    });
  }
  function xe(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function An() {
    c.currentPage <= 1 || _e(c.currentPage - 1);
  }
  function Pn() {
    c.currentPage >= n.pageCount || _e(c.currentPage + 1);
  }
  function ht(r) {
    r < 1 || r > n.pageCount || _e(r);
  }
  function rt() {
    document.getElementById("prev-page-btn").disabled = c.currentPage <= 1, document.getElementById("next-page-btn").disabled = c.currentPage >= n.pageCount;
  }
  function on() {
    c.zoomLevel = Math.min(c.zoomLevel + 0.25, 3), Xe(), _e(c.currentPage);
  }
  function Tn() {
    c.zoomLevel = Math.max(c.zoomLevel - 0.25, 0.5), Xe(), _e(c.currentPage);
  }
  function ft() {
    const u = document.getElementById("viewer-content").offsetWidth - 32, g = 612;
    c.zoomLevel = u / g, Xe(), _e(c.currentPage);
  }
  function Xe() {
    document.getElementById("zoom-level").textContent = `${Math.round(c.zoomLevel * 100)}%`;
  }
  function Ve(r) {
    if (!c.hasConsented && n.fields.some((u) => u.id === r && u.type !== "date_signed")) {
      $t();
      return;
    }
    jt(r, { openEditor: !0 });
  }
  function jt(r, u = { openEditor: !0 }) {
    const g = c.fieldState.get(r);
    if (g) {
      if (u.openEditor && (c.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), g.page !== c.currentPage && ht(g.page), !u.openEditor) {
        Dt(r);
        return;
      }
      g.type !== "date_signed" && zt(r);
    }
  }
  function Dt(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function zt(r) {
    const u = c.fieldState.get(r);
    if (!u) return;
    const g = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = at(u.type), f.innerHTML = cn(u), x?.classList.toggle("hidden", !(u.type === "signature" || u.type === "initials")), (u.type === "signature" || u.type === "initials") && Dn(r), g.classList.add("active"), g.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", mn(g.querySelector(".field-editor")), fe(`Editing ${at(u.type)}. Press Escape to cancel.`), setTimeout(() => {
      const C = f.querySelector("input, textarea");
      C ? C.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), qe(c.writeCooldownUntil) > 0 && Bn(qe(c.writeCooldownUntil));
  }
  function at(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function cn(r) {
    const u = ln(r.type), g = it(String(r?.id || "")), f = it(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", x = it(ri(r)), C = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], M = _n(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${C.map((F) => `
            <button
              type="button"
              id="sig-tab-${F.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${M === F.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${F.id}"
              data-esign-action="signature-tab"
              data-field-id="${g}"
              role="tab"
              aria-selected="${M === F.id ? "true" : "false"}"
              aria-controls="sig-editor-${F.id}"
              tabindex="${M === F.id ? "0" : "-1"}"
            >
              ${F.label}
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
              data-field-id="${g}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${g}">${x}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${y} will appear as your ${f}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${M === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
                <i class="iconoir-erase" aria-hidden="true"></i>
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
          <div id="sig-editor-upload" class="sig-editor-panel ${M === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${M === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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
          value="${it(String(r.value || ""))}"
          data-field-id="${g}"
        />
        ${u}
      `;
    if (r.type === "text") {
      const y = it(String(r.value || ""));
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
  function ln(r) {
    return r === "name" || r === "initials" || r === "signature" ? `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${c.profileRemember ? "checked" : ""}
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
  function dn(r, u, g = { syncOverlay: !1 }) {
    const f = document.getElementById("sig-type-preview"), y = c.fieldState.get(r);
    if (!y) return;
    const x = Fe(String(u || "").trim());
    if (g?.syncOverlay && (x ? _(r, x) : w(r), S()), !!f) {
      if (x) {
        f.textContent = x;
        return;
      }
      f.textContent = y.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function _n(r) {
    const u = String(c.signatureTabByField.get(r) || "").trim();
    return u === "draw" || u === "type" || u === "upload" || u === "saved" ? u : "draw";
  }
  function Mt(r, u) {
    const g = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    c.signatureTabByField.set(u, g), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${g}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", g !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", g !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", g !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", g !== "saved"), (g === "draw" || g === "upload" || g === "saved") && f && requestAnimationFrame(() => yt(u)), g === "type") {
      const y = document.getElementById("sig-type-input");
      dn(u, y?.value || "");
    }
    g === "saved" && he(u).catch(Ue);
  }
  function Dn(r) {
    c.signatureTabByField.set(r, "draw"), Mt("draw", r);
    const u = document.getElementById("sig-type-input");
    u && dn(r, u.value || "");
  }
  function yt(r) {
    const u = document.getElementById("sig-draw-canvas");
    if (!u || c.signatureCanvases.has(r)) return;
    const g = u.closest(".signature-canvas-container"), f = u.getContext("2d");
    if (!f) return;
    const y = u.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const x = window.devicePixelRatio || 1;
    u.width = y.width * x, u.height = y.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let C = !1, M = 0, F = 0, K = [];
    const J = (Y) => {
      const te = u.getBoundingClientRect();
      let dt, je;
      return Y.touches && Y.touches.length > 0 ? (dt = Y.touches[0].clientX, je = Y.touches[0].clientY) : Y.changedTouches && Y.changedTouches.length > 0 ? (dt = Y.changedTouches[0].clientX, je = Y.changedTouches[0].clientY) : (dt = Y.clientX, je = Y.clientY), {
        x: dt - te.left,
        y: je - te.top,
        timestamp: Date.now()
      };
    }, Z = (Y) => {
      C = !0;
      const te = J(Y);
      M = te.x, F = te.y, K = [{ x: te.x, y: te.y, t: te.timestamp, width: 2.5 }], g && g.classList.add("drawing");
    }, Ee = (Y) => {
      if (!C) return;
      const te = J(Y);
      K.push({ x: te.x, y: te.y, t: te.timestamp, width: 2.5 });
      const dt = te.x - M, je = te.y - F, mi = te.timestamp - (K[K.length - 2]?.t || te.timestamp), ut = Math.sqrt(dt * dt + je * je) / Math.max(mi, 1), Me = 2.5, Kt = 1.5, Ze = 4, qn = Math.min(ut / 5, 1), Rt = Math.max(Kt, Math.min(Ze, Me - qn * 1.5));
      K[K.length - 1].width = Rt, f.lineWidth = Rt, f.beginPath(), f.moveTo(M, F), f.lineTo(te.x, te.y), f.stroke(), M = te.x, F = te.y;
    }, Be = () => {
      if (C = !1, K.length > 1) {
        const Y = c.signatureCanvases.get(r);
        Y && (Y.strokes.push(K.map((te) => ({ ...te }))), Y.redoStack = []), un(r);
      }
      K = [], g && g.classList.remove("drawing");
    };
    u.addEventListener("mousedown", Z), u.addEventListener("mousemove", Ee), u.addEventListener("mouseup", Be), u.addEventListener("mouseout", Be), u.addEventListener("touchstart", (Y) => {
      Y.preventDefault(), Y.stopPropagation(), Z(Y);
    }, { passive: !1 }), u.addEventListener("touchmove", (Y) => {
      Y.preventDefault(), Y.stopPropagation(), Ee(Y);
    }, { passive: !1 }), u.addEventListener("touchend", (Y) => {
      Y.preventDefault(), Be();
    }, { passive: !1 }), u.addEventListener("touchcancel", Be), u.addEventListener("gesturestart", (Y) => Y.preventDefault()), u.addEventListener("gesturechange", (Y) => Y.preventDefault()), u.addEventListener("gestureend", (Y) => Y.preventDefault()), c.signatureCanvases.set(r, {
      canvas: u,
      ctx: f,
      dpr: x,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), oi(r);
  }
  function oi(r) {
    const u = c.signatureCanvases.get(r), g = c.fieldState.get(r);
    if (!u || !g) return;
    const f = Ln(g);
    f && Gt(r, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function Gt(r, u, g = { clearStrokes: !1 }) {
    const f = c.signatureCanvases.get(r);
    if (!f) return !1;
    const y = String(u || "").trim();
    if (!y)
      return f.baseImageDataUrl = "", f.baseImage = null, g.clearStrokes && (f.strokes = [], f.redoStack = []), vt(r), !0;
    const { drawWidth: x, drawHeight: C } = f, M = new Image();
    return await new Promise((F) => {
      M.onload = () => {
        g.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = M, f.baseImageDataUrl = y, x > 0 && C > 0 && vt(r), F(!0);
      }, M.onerror = () => F(!1), M.src = y;
    });
  }
  function vt(r) {
    const u = c.signatureCanvases.get(r);
    if (!u) return;
    const { ctx: g, drawWidth: f, drawHeight: y, baseImage: x, strokes: C } = u;
    if (g.clearRect(0, 0, f, y), x) {
      const M = Math.min(f / x.width, y / x.height), F = x.width * M, K = x.height * M, J = (f - F) / 2, Z = (y - K) / 2;
      g.drawImage(x, J, Z, F, K);
    }
    for (const M of C)
      for (let F = 1; F < M.length; F++) {
        const K = M[F - 1], J = M[F];
        g.lineWidth = Number(J.width || 2.5) || 2.5, g.beginPath(), g.moveTo(K.x, K.y), g.lineTo(J.x, J.y), g.stroke();
      }
  }
  function Mn(r) {
    const u = c.signatureCanvases.get(r);
    if (!u || u.strokes.length === 0) return;
    const g = u.strokes.pop();
    g && u.redoStack.push(g), vt(r), un(r);
  }
  function ci(r) {
    const u = c.signatureCanvases.get(r);
    if (!u || u.redoStack.length === 0) return;
    const g = u.redoStack.pop();
    g && u.strokes.push(g), vt(r), un(r);
  }
  function de(r) {
    const u = c.signatureCanvases.get(r);
    if (!u) return !1;
    if ((u.baseImageDataUrl || "").trim() || u.strokes.length > 0) return !0;
    const { canvas: g, ctx: f } = u;
    return f.getImageData(0, 0, g.width, g.height).data.some((x, C) => C % 4 === 3 && x > 0);
  }
  function un(r) {
    const u = c.signatureCanvases.get(r);
    u && (de(r) ? R(r, u.canvas.toDataURL("image/png")) : w(r), S());
  }
  function $n(r) {
    const u = c.signatureCanvases.get(r);
    u && (u.strokes = [], u.redoStack = [], u.baseImage = null, u.baseImageDataUrl = "", vt(r)), w(r), S();
    const g = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    g && g.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function Vt() {
    const r = document.getElementById("field-editor-overlay"), u = r.querySelector(".field-editor");
    if (bt(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", c.activeFieldId) {
      const g = document.querySelector(`.field-list-item[data-field-id="${c.activeFieldId}"]`);
      requestAnimationFrame(() => {
        g?.focus();
      });
    }
    E(), S(), c.activeFieldId = null, c.signatureCanvases.clear(), fe("Field editor closed.");
  }
  function qe(r) {
    const u = Number(r) || 0;
    return u <= 0 ? 0 : Math.max(0, Math.ceil((u - Date.now()) / 1e3));
  }
  function ot(r, u = {}) {
    const g = Number(u.retry_after_seconds);
    if (Number.isFinite(g) && g > 0)
      return Math.ceil(g);
    const f = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const y = Number(f);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function Oe(r, u) {
    let g = {};
    try {
      g = await r.json();
    } catch {
      g = {};
    }
    const f = g?.error || {}, y = f?.details && typeof f.details == "object" ? f.details : {}, x = ot(r, y), C = r?.status === 429, M = C ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || u || "Request failed"), F = new Error(M);
    return F.status = r?.status || 0, F.code = String(f?.code || ""), F.details = y, F.rateLimited = C, F.retryAfterSeconds = x, F;
  }
  function Bn(r) {
    const u = Math.max(1, Number(r) || 1);
    c.writeCooldownUntil = Date.now() + u * 1e3, c.writeCooldownTimer && (clearInterval(c.writeCooldownTimer), c.writeCooldownTimer = null);
    const g = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const y = qe(c.writeCooldownUntil);
      if (y <= 0) {
        c.pendingSaves.has(c.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), c.writeCooldownTimer && (clearInterval(c.writeCooldownTimer), c.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    g(), c.writeCooldownTimer = setInterval(g, 250);
  }
  function Wt(r) {
    const u = Math.max(1, Number(r) || 1);
    c.submitCooldownUntil = Date.now() + u * 1e3, c.submitCooldownTimer && (clearInterval(c.submitCooldownTimer), c.submitCooldownTimer = null);
    const g = () => {
      const f = qe(c.submitCooldownUntil);
      wt(), f <= 0 && c.submitCooldownTimer && (clearInterval(c.submitCooldownTimer), c.submitCooldownTimer = null);
    };
    g(), c.submitCooldownTimer = setInterval(g, 250);
  }
  async function li() {
    const r = c.activeFieldId;
    if (!r) return;
    const u = c.fieldState.get(r);
    if (!u) return;
    const g = qe(c.writeCooldownUntil);
    if (g > 0) {
      const y = `Please wait ${g}s before saving again.`;
      window.toastManager && window.toastManager.error(y), fe(y, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      c.profileRemember = qt();
      let y = !1;
      if (u.type === "signature" || u.type === "initials")
        y = await ct(r);
      else if (u.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        y = await Jt(r, null, x?.checked || !1);
      } else {
        const C = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!C && u.required)
          throw new Error("This field is required");
        y = await Jt(r, C, null);
      }
      if (y) {
        Vt(), Qe(), wt(), Ie(), He(), di(r), Yt(r);
        const x = Hn();
        x.allRequiredComplete ? fe("Field saved. All required fields complete. Ready to submit.") : fe(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && Bn(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), fe(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (qe(c.writeCooldownUntil) > 0) {
        const y = qe(c.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function ct(r) {
    const u = c.fieldState.get(r), g = document.getElementById("sig-type-input"), f = _n(r);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = c.signatureCanvases.get(r);
      if (!x) return !1;
      if (!de(r))
        throw new Error(u?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const C = x.canvas.toDataURL("image/png");
      return await pn(r, { type: "drawn", dataUrl: C }, u?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = g?.value?.trim();
      if (!x)
        throw new Error(u?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return u.type === "initials" ? await Jt(r, x, null) : await pn(r, { type: "typed", text: x }, x);
    }
  }
  async function Jt(r, u, g) {
    c.pendingSaves.add(r);
    const f = Date.now(), y = c.fieldState.get(r);
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
        throw await Oe(x, "Failed to save field");
      const C = c.fieldState.get(r);
      return C && (C.value = u ?? g, C.completed = !0, C.hasError = !1), await rn(C), window.toastManager && window.toastManager.success("Field saved"), p.trackFieldSave(r, C?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const C = c.fieldState.get(r);
      throw C && (C.hasError = !0, C.lastError = x.message), p.trackFieldSave(r, y?.type, !1, Date.now() - f, x.message), x;
    } finally {
      c.pendingSaves.delete(r);
    }
  }
  async function pn(r, u, g) {
    c.pendingSaves.add(r);
    const f = Date.now(), y = u?.type || "typed";
    try {
      let x;
      if (y === "drawn") {
        const F = await V.uploadDrawnSignature(
          r,
          u.dataUrl
        );
        x = {
          field_instance_id: r,
          type: "drawn",
          value_text: g,
          object_key: F.objectKey,
          sha256: F.sha256,
          upload_token: F.uploadToken
        };
      } else
        x = await j(r, g);
      const C = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!C.ok)
        throw await Oe(C, "Failed to save signature");
      const M = c.fieldState.get(r);
      return M && (M.value = g, M.completed = !0, M.hasError = !1, u?.dataUrl && (M.signaturePreviewUrl = u.dataUrl)), await rn(M, {
        signatureType: y,
        signatureDataUrl: u?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), p.trackSignatureAttach(r, y, !0, Date.now() - f), !0;
    } catch (x) {
      const C = c.fieldState.get(r);
      throw C && (C.hasError = !0, C.lastError = x.message), p.trackSignatureAttach(r, y, !1, Date.now() - f, x.message), x;
    } finally {
      c.pendingSaves.delete(r);
    }
  }
  async function j(r, u) {
    const g = `${u}|${r}`, f = await gn(g), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: u,
      object_key: y,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function gn(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const u = new TextEncoder().encode(r), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Qe() {
    let r = 0;
    c.fieldState.forEach((M) => {
      M.required, M.completed && r++;
    });
    const u = c.fieldState.size, g = u > 0 ? r / u * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = u;
    const f = document.getElementById("progress-ring-circle"), y = 97.4, x = y - g / 100 * y;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${g}%`;
    const C = u - r;
    document.getElementById("fields-status").textContent = C > 0 ? `${C} remaining` : "All complete";
  }
  function wt() {
    const r = document.getElementById("submit-btn"), u = document.getElementById("incomplete-warning"), g = document.getElementById("incomplete-message"), f = qe(c.submitCooldownUntil);
    let y = [], x = !1;
    c.fieldState.forEach((M, F) => {
      M.required && !M.completed && y.push(M), M.hasError && (x = !0);
    });
    const C = c.hasConsented && y.length === 0 && !x && c.pendingSaves.size === 0 && f === 0 && !c.isSubmitting;
    r.disabled = !C, !c.isSubmitting && f > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !c.isSubmitting && f === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), c.hasConsented ? f > 0 ? (u.classList.remove("hidden"), g.textContent = `Please wait ${f}s before submitting again.`) : x ? (u.classList.remove("hidden"), g.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (u.classList.remove("hidden"), g.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : u.classList.add("hidden") : (u.classList.remove("hidden"), g.textContent = "Please accept the consent agreement");
  }
  function di(r) {
    const u = c.fieldState.get(r), g = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
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
  function ui() {
    const r = Array.from(c.fieldState.values()).filter((u) => u.required);
    return r.sort((u, g) => {
      const f = Number(u.page || 0), y = Number(g.page || 0);
      if (f !== y) return f - y;
      const x = Number(u.tabIndex || 0), C = Number(g.tabIndex || 0);
      if (x > 0 && C > 0 && x !== C) return x - C;
      if (x > 0 != C > 0) return x > 0 ? -1 : 1;
      const M = Number(u.posY || 0), F = Number(g.posY || 0);
      if (M !== F) return M - F;
      const K = Number(u.posX || 0), J = Number(g.posX || 0);
      return K !== J ? K - J : String(u.id || "").localeCompare(String(g.id || ""));
    }), r;
  }
  function Rn(r) {
    c.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function Yt(r) {
    const u = ui(), g = u.filter((C) => !C.completed);
    if (g.length === 0) {
      p.track("guided_next_none_remaining", { fromFieldId: r });
      const C = document.getElementById("submit-btn");
      C?.scrollIntoView({ behavior: "smooth", block: "nearest" }), C?.focus(), fe("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const f = u.findIndex((C) => String(C.id) === String(r));
    let y = null;
    if (f >= 0) {
      for (let C = f + 1; C < u.length; C++)
        if (!u[C].completed) {
          y = u[C];
          break;
        }
    }
    if (y || (y = g[0]), !y) return;
    p.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const x = Number(y.page || 1);
    x !== c.currentPage && ht(x), jt(y.id, { openEditor: !1 }), Rn(y.id), setTimeout(() => {
      Rn(y.id), Dt(y.id), p.track("guided_next_completed", { toFieldId: y.id, page: y.page }), fe(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function $t() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", mn(r.querySelector(".field-editor")), fe("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Ce() {
    const r = document.getElementById("consent-modal"), u = r.querySelector(".field-editor");
    bt(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", fe("Consent dialog closed.");
  }
  async function Fn() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const u = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!u.ok)
        throw await Oe(u, "Failed to accept consent");
      c.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Ce(), wt(), Ie(), p.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), fe("Consent accepted. You can now complete the fields and submit.");
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message), fe(`Error: ${u.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function Nn() {
    const r = document.getElementById("submit-btn"), u = qe(c.submitCooldownUntil);
    if (u > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${u}s before submitting again.`), wt();
      return;
    }
    c.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const g = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": g }
      });
      if (!f.ok)
        throw await Oe(f, "Failed to submit");
      p.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (g) {
      p.trackSubmit(!1, g.message), g?.rateLimited && Wt(g.retryAfterSeconds), window.toastManager && window.toastManager.error(g.message);
    } finally {
      c.isSubmitting = !1, wt();
    }
  }
  function pi() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", mn(r.querySelector(".field-editor")), fe("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Bt() {
    const r = document.getElementById("decline-modal"), u = r.querySelector(".field-editor");
    bt(u), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", fe("Decline dialog closed.");
  }
  async function De() {
    const r = document.getElementById("decline-reason").value;
    try {
      const u = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!u.ok)
        throw await Oe(u, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message);
    }
  }
  function gi() {
    p.trackDegradedMode("viewer_load_failure"), p.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Un() {
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
            <div class="debug-value" id="debug-session-id">${p.sessionId}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Consent</div>
            <div class="debug-value" id="debug-consent">${c.hasConsented ? "✓ Accepted" : "✗ Pending"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${c.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${c.isLowMemory ? "⚠ Low Memory" : "Normal"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${c.renderedPages?.size || 0}</div>
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
      const r = c.fieldState;
      let u = 0;
      r?.forEach((f) => {
        f.completed && u++;
      }), document.getElementById("debug-consent").textContent = c.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${c.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${u}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = c.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = c.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${c.isLowMemory ? "warning" : ""}`;
      const g = p.metrics.errorsEncountered;
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
            currentPage: c.currentPage,
            zoomLevel: c.zoomLevel,
            hasConsented: c.hasConsented,
            activeFieldId: c.activeFieldId,
            isLowMemory: c.isLowMemory,
            cachedPages: c.renderedPages?.size || 0
          },
          fields: Array.from(c.fieldState?.entries() || []).map(([r, u]) => ({
            id: r,
            type: u.type,
            completed: u.completed,
            hasError: u.hasError
          })),
          telemetry: p.getSessionSummary(),
          errors: p.metrics.errorsEncountered
        }),
        getEvents: () => p.events,
        forceError: (r) => {
          p.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), ye();
        },
        setLowMemory: (r) => {
          c.isLowMemory = r, mt(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", p.sessionId), console.log("Fields:", c.fieldState?.size || 0), console.log("Low Memory:", c.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), ye(), this.updatePanel();
    },
    /**
     * Clear page cache
     */
    clearCache() {
      c.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(p.events), console.log("Session Summary:", p.getSessionSummary());
    }
  };
  function fe(r, u = "polite") {
    const g = u === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    g && (g.textContent = "", requestAnimationFrame(() => {
      g.textContent = r;
    }));
  }
  function mn(r) {
    const g = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = g[0], y = g[g.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function x(C) {
      C.key === "Tab" && (C.shiftKey ? document.activeElement === f && (C.preventDefault(), y?.focus()) : document.activeElement === y && (C.preventDefault(), f?.focus()));
    }
    r.addEventListener("keydown", x), r._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function bt(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const u = r.dataset.previousFocus;
    if (u) {
      const g = document.getElementById(u);
      requestAnimationFrame(() => {
        g?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function Ie() {
    const r = Hn(), u = document.getElementById("submit-status");
    u && (r.allRequiredComplete && c.hasConsented ? u.textContent = "All required fields complete. You can now submit." : c.hasConsented ? u.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : u.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Hn() {
    let r = 0, u = 0, g = 0;
    return c.fieldState.forEach((f) => {
      f.required && u++, f.completed && r++, f.required && !f.completed && g++;
    }), {
      completed: r,
      required: u,
      remainingRequired: g,
      total: c.fieldState.size,
      allRequiredComplete: g === 0
    };
  }
  function hn(r, u = 1) {
    const g = Array.from(c.fieldState.keys()), f = g.indexOf(r);
    if (f === -1) return null;
    const y = f + u;
    return y >= 0 && y < g.length ? g[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (Vt(), Ce(), Bt()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const u = Array.from(document.querySelectorAll(".sig-editor-tab")), g = u.indexOf(r.target);
      if (g !== -1) {
        let f = g;
        if (r.key === "ArrowRight" && (f = (g + 1) % u.length), r.key === "ArrowLeft" && (f = (g - 1 + u.length) % u.length), r.key === "Home" && (f = 0), r.key === "End" && (f = u.length - 1), f !== g) {
          r.preventDefault();
          const y = u[f], x = y.getAttribute("data-tab") || "draw", C = y.getAttribute("data-field-id");
          C && Mt(x, C), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const u = r.target.dataset.fieldId, g = r.key === "ArrowDown" ? 1 : -1, f = hn(u, g);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const u = r.target.dataset.fieldId;
        u && Ve(u);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class $s {
  constructor(e) {
    this.config = e;
  }
  init() {
    va(this.config);
  }
  destroy() {
  }
}
function Lo(i) {
  const e = new $s(i);
  return ne(() => e.init()), e;
}
function wa() {
  const i = document.getElementById("esign-signer-review-config");
  if (!i) return null;
  try {
    const e = JSON.parse(i.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && ne(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = wa();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new $s(e);
  t.init(), window.esignSignerReviewController = t;
});
class Bs {
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
function Co(i = {}) {
  const e = new Bs(i);
  return ne(() => e.init()), e;
}
function ko(i = {}) {
  const e = new Bs(i);
  ne(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Ri {
  constructor(e) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = e, this.elements = {
      loadBtn: h("#pdf-load-btn"),
      retryBtn: h("#pdf-retry-btn"),
      loading: h("#pdf-loading"),
      spinner: h("#pdf-spinner"),
      error: h("#pdf-error"),
      errorMessage: h("#pdf-error-message"),
      viewer: h("#pdf-viewer"),
      canvas: h("#pdf-canvas"),
      pagination: h("#pdf-pagination"),
      prevBtn: h("#pdf-prev-page"),
      nextBtn: h("#pdf-next-page"),
      currentPageEl: h("#pdf-current-page"),
      totalPagesEl: h("#pdf-total-pages"),
      status: h("#pdf-status")
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
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), d = this.elements.canvas, p = d.getContext("2d");
        if (!p)
          throw new Error("Failed to get canvas context");
        d.height = s.height, d.width = s.width, await n.render({
          canvasContext: p,
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
    e && T(e), t && $(t), n && T(n), s && T(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && T(e), t && T(t), n && T(n), s && $(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: d, viewer: p } = this.elements;
    t && T(t), n && T(n), s && $(s), p && T(p), d && (d.textContent = e);
  }
}
function Ao(i) {
  const e = new Ri(i);
  return e.init(), e;
}
function Po(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new Ri(e);
  ne(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && ne(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new Ri({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class To {
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
class _o {
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
function ba(i) {
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
function Sa(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function xa(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((d) => d !== s)] : n;
}
function Do(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Mo(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: ba(e.type),
    options: Sa(e.options),
    operators: xa(e.operators, e.default_operator)
  })) : [];
}
function $o(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function Bo(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Ro(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function Fo(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([p, c]) => `${p}: ${c}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", d = e?.message || `${i} failed`;
    t.error(n ? `${s}${d}: ${n}` : `${s}${d}`);
  }
}
function No(i, e) {
  const t = h(`#${i}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function Uo(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const Ho = {
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
}, ei = "application/vnd.google-apps.document", Fi = "application/vnd.google-apps.spreadsheet", Ni = "application/vnd.google-apps.presentation", Rs = "application/vnd.google-apps.folder", Ui = "application/pdf", Ia = [ei, Ui], Fs = "esign.google.account_id";
function Ea(i) {
  return i.mimeType === ei;
}
function La(i) {
  return i.mimeType === Ui;
}
function tn(i) {
  return i.mimeType === Rs;
}
function Ca(i) {
  return Ia.includes(i.mimeType);
}
function qo(i) {
  return i.mimeType === ei || i.mimeType === Fi || i.mimeType === Ni;
}
function ka(i) {
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
function Oo(i) {
  return i.map(ka);
}
function Ns(i) {
  return {
    [ei]: "Google Doc",
    [Fi]: "Google Sheet",
    [Ni]: "Google Slides",
    [Rs]: "Folder",
    [Ui]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Aa(i) {
  return tn(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Ea(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : La(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === Fi ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Ni ? {
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
function Pa(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Ta(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function jo(i, e) {
  const t = i.get("account_id");
  if (t)
    return Kn(t);
  if (e)
    return Kn(e);
  const n = localStorage.getItem(Fs);
  return n ? Kn(n) : "";
}
function Kn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function zo(i) {
  const e = Kn(i);
  e && localStorage.setItem(Fs, e);
}
function Go(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Vo(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function Wo(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function nn(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function _a(i) {
  const e = Aa(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Jo(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const d = s === t.length - 1, p = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return d ? `${p}<span class="text-gray-900 font-medium">${nn(n.name)}</span>` : `${p}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${nn(n.name)}</button>`;
  }).join("");
}
function Da(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, d = _a(i), p = tn(i), c = Ca(i), S = p ? "cursor-pointer hover:bg-gray-50" : c ? "cursor-pointer hover:bg-blue-50" : "opacity-60", w = p ? `data-folder-id="${i.id}" data-folder-name="${nn(i.name)}"` : c && t ? `data-file-id="${i.id}" data-file-name="${nn(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${S} file-item"
      ${w}
      role="listitem"
      ${c ? 'tabindex="0"' : ""}
    >
      ${d}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${nn(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Ns(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Pa(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${Ta(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${c && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Yo(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${nn(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((d, p) => tn(d) && !tn(p) ? -1 : !tn(d) && tn(p) ? 1 : d.name.localeCompare(p.name)).map((d) => Da(d, { selectable: n })).join("")}
    </div>
  `;
}
function Ko(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Ns(i.mimeType)
  };
}
export {
  Cr as AGREEMENT_STATUS_BADGES,
  Ms as AgreementFormController,
  Ri as DocumentDetailPreviewController,
  Bi as DocumentFormController,
  Sr as ESignAPIClient,
  xr as ESignAPIError,
  Fs as GOOGLE_ACCOUNT_STORAGE_KEY,
  xs as GoogleCallbackController,
  Es as GoogleDrivePickerController,
  Is as GoogleIntegrationController,
  Ia as IMPORTABLE_MIME_TYPES,
  ks as IntegrationConflictsController,
  Ls as IntegrationHealthController,
  Cs as IntegrationMappingsController,
  As as IntegrationSyncRunsController,
  $i as LandingPageController,
  ei as MIME_GOOGLE_DOC,
  Rs as MIME_GOOGLE_FOLDER,
  Fi as MIME_GOOGLE_SHEET,
  Ni as MIME_GOOGLE_SLIDES,
  Ui as MIME_PDF,
  To as PanelPaginationBehavior,
  _o as PanelSearchBehavior,
  Ho as STANDARD_GRID_SELECTORS,
  Ss as SignerCompletePageController,
  Bs as SignerErrorPageController,
  $s as SignerReviewController,
  Le as announce,
  Go as applyAccountIdToPath,
  Dr as applyDetailFormatters,
  la as bootstrapAgreementForm,
  Po as bootstrapDocumentDetailPreview,
  Io as bootstrapDocumentForm,
  co as bootstrapGoogleCallback,
  go as bootstrapGoogleDrivePicker,
  uo as bootstrapGoogleIntegration,
  wo as bootstrapIntegrationConflicts,
  ho as bootstrapIntegrationHealth,
  yo as bootstrapIntegrationMappings,
  So as bootstrapIntegrationSyncRuns,
  so as bootstrapLandingPage,
  ao as bootstrapSignerCompletePage,
  ko as bootstrapSignerErrorPage,
  va as bootstrapSignerReview,
  Vo as buildScopedApiUrl,
  Va as byId,
  Lr as capitalize,
  Er as createESignClient,
  Ar as createElement,
  Uo as createSchemaActionCachingRefresh,
  Ko as createSelectedFile,
  za as createStatusBadgeElement,
  to as createTimeoutController,
  $o as dateTimeCellRenderer,
  Qn as debounce,
  Fo as defaultActionErrorHandler,
  Ro as defaultActionSuccessHandler,
  Ja as delegate,
  nn as escapeHtml,
  Bo as fileSizeCellRenderer,
  Na as formatDate,
  Xn as formatDateTime,
  Ta as formatDriveDate,
  Pa as formatDriveFileSize,
  Vn as formatFileSize,
  Fa as formatPageCount,
  qa as formatRecipientCount,
  Ha as formatRelativeTime,
  Tr as formatSizeElements,
  Ua as formatTime,
  _r as formatTimestampElements,
  ws as getAgreementStatusBadge,
  Ra as getESignClient,
  Aa as getFileIconConfig,
  Ns as getFileTypeName,
  Pr as getPageConfig,
  T as hide,
  Eo as initAgreementForm,
  Mr as initDetailFormatters,
  Ao as initDocumentDetailPreview,
  xo as initDocumentForm,
  oo as initGoogleCallback,
  po as initGoogleDrivePicker,
  lo as initGoogleIntegration,
  vo as initIntegrationConflicts,
  mo as initIntegrationHealth,
  fo as initIntegrationMappings,
  bo as initIntegrationSyncRuns,
  io as initLandingPage,
  ro as initSignerCompletePage,
  Co as initSignerErrorPage,
  Lo as initSignerReview,
  tn as isFolder,
  Ea as isGoogleDoc,
  qo as isGoogleWorkspaceFile,
  Ca as isImportable,
  La as isPDF,
  Kn as normalizeAccountId,
  ka as normalizeDriveFile,
  Oo as normalizeDriveFiles,
  xa as normalizeFilterOperators,
  Sa as normalizeFilterOptions,
  ba as normalizeFilterType,
  Wa as on,
  ne as onReady,
  Qa as poll,
  Mo as prepareFilterFields,
  Do as prepareGridColumns,
  h as qs,
  Ht as qsa,
  Jo as renderBreadcrumb,
  _a as renderFileIcon,
  Da as renderFileItem,
  Yo as renderFileList,
  kr as renderStatusBadge,
  jo as resolveAccountId,
  Za as retry,
  zo as saveAccountId,
  Ir as setESignClient,
  Ka as setLoading,
  No as setupRefreshButton,
  $ as show,
  bs as sleep,
  Oa as snakeToTitle,
  Wo as syncAccountIdToUrl,
  eo as throttle,
  Ya as toggle,
  ja as truncate,
  Sn as updateDataText,
  Xa as updateDataTexts,
  Ga as updateStatusBadge,
  no as withTimeout
};
//# sourceMappingURL=index.js.map

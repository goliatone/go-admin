import { e as at } from "../chunks/html-DyksyvcZ.js";
class Or {
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
      const S = await this.listAgreements({ page: t, per_page: n }), b = S.items || S.records || [];
      if (e.push(...b), b.length === 0 || e.length >= S.total)
        break;
      t += 1;
    }
    const d = {};
    for (const S of e) {
      const b = String(S?.status || "").trim().toLowerCase();
      b && (d[b] = (d[b] || 0) + 1);
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
      throw new Ur(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Ur extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Ni = null;
function Za() {
  if (!Ni)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Ni;
}
function Nr(i) {
  Ni = i;
}
function Hr(i) {
  const e = new Or(i);
  return Nr(e), e;
}
function Zn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function eo(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function si(i, e) {
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
function to(i, e) {
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
function no(i, e) {
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
function io(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), r = Math.round(n / 1e3), d = Math.round(r / 60), p = Math.round(d / 60), c = Math.round(p / 24), S = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? S.format(c, "day") : Math.abs(p) >= 1 ? S.format(p, "hour") : Math.abs(d) >= 1 ? S.format(d, "minute") : S.format(r, "second");
  } catch {
    return String(i);
  }
}
function so(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function qr(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function ro(i) {
  return i ? i.split("_").map((e) => qr(e)).join(" ") : "";
}
function ao(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const jr = {
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
function $s(i) {
  const e = String(i || "").trim().toLowerCase();
  return jr[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function zr(i, e) {
  const t = $s(i), n = e?.showDot ?? !1, r = e?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, p = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${d[r]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${p}${t.label}</span>`;
}
function oo(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = zr(i, e), t.firstElementChild;
}
function co(i, e, t) {
  const n = $s(e), r = t?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${d[r]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const S = i.querySelector(".rounded-full");
    if (S)
      S.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const b = document.createElement("span");
      b.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, b.setAttribute("aria-hidden", "true"), i.prepend(b);
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
function Ft(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function lo(i) {
  return document.getElementById(i);
}
function Vr(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [r, d] of Object.entries(e))
      d !== void 0 && n.setAttribute(r, d);
  if (t)
    for (const r of t)
      typeof r == "string" ? n.appendChild(document.createTextNode(r)) : n.appendChild(r);
  return n;
}
function uo(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function po(i, e, t, n, r) {
  const d = (p) => {
    const c = p.target.closest(e);
    c && i.contains(c) && n.call(c, p, c);
  };
  return i.addEventListener(t, d, r), () => i.removeEventListener(t, d, r);
}
function te(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function $(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function P(i) {
  i && i.classList.add("hidden");
}
function go(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? $(i) : P(i);
}
function mo(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function An(i, e, t = document) {
  const n = h(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function ho(i, e = document) {
  for (const [t, n] of Object.entries(i))
    An(t, n, e);
}
function Gr(i = "[data-esign-page]", e = "data-esign-config") {
  const t = h(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const r = h(
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
function Ie(i, e = "polite") {
  const t = h(`[aria-live="${e}"]`) || (() => {
    const n = Vr("div", {
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
async function fo(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: r = 6e4,
    maxAttempts: d = 30,
    onProgress: p,
    signal: c
  } = i, S = Date.now();
  let b = 0, E;
  for (; b < d; ) {
    if (c?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - S >= r)
      return {
        result: E,
        attempts: b,
        stopped: !1,
        timedOut: !0
      };
    if (b++, E = await e(), p && p(E, b), t(E))
      return {
        result: E,
        attempts: b,
        stopped: !0,
        timedOut: !1
      };
    await Bs(n, c);
  }
  return {
    result: E,
    attempts: b,
    stopped: !1,
    timedOut: !1
  };
}
async function yo(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: r = 3e4,
    exponentialBackoff: d = !0,
    shouldRetry: p = () => !0,
    onRetry: c,
    signal: S
  } = i;
  let b;
  for (let E = 1; E <= t; E++) {
    if (S?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (_) {
      if (b = _, E >= t || !p(_, E))
        throw _;
      const O = d ? Math.min(n * Math.pow(2, E - 1), r) : n;
      c && c(_, E, O), await Bs(O, S);
    }
  }
  throw b;
}
function Bs(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const r = setTimeout(t, i);
    if (e) {
      const d = () => {
        clearTimeout(r), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", d, { once: !0 });
    }
  });
}
function ri(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function vo(i, e) {
  let t = 0, n = null;
  return (...r) => {
    const d = Date.now();
    d - t >= e ? (t = d, i(...r)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...r);
      },
      e - (d - t)
    ));
  };
}
function bo(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function wo(i, e, t = "Operation timed out") {
  let n;
  const r = new Promise((d, p) => {
    n = setTimeout(() => {
      p(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, r]);
  } finally {
    clearTimeout(n);
  }
}
class Vi {
  constructor(e) {
    this.config = e, this.client = Hr({
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
    An('count="draft"', e.draft), An('count="pending"', e.pending), An('count="completed"', e.completed), An('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function So(i) {
  const e = i || Gr(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Vi(e);
  return te(() => t.init()), t;
}
function xo(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new Vi(t);
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
      const r = String(n.basePath || n.base_path || "/admin"), d = String(
        n.apiBasePath || n.api_base_path || `${r}/api`
      );
      new Vi({ basePath: r, apiBasePath: d }).init();
    }
  }
});
class Rs {
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
      const r = h(`#artifacts-${n}`);
      r && (n === e ? $(r) : P(r));
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
function Io(i) {
  const e = new Rs(i);
  return te(() => e.init()), e;
}
function Eo(i) {
  const e = new Rs(i);
  te(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Wr(i = document) {
  Ft("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Zn(t));
  });
}
function Jr(i = document) {
  Ft("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = si(t));
  });
}
function Yr(i = document) {
  Wr(i), Jr(i);
}
function Kr() {
  te(() => {
    Yr();
  });
}
typeof document < "u" && Kr();
const bs = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Fs {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), r = e.get("error_description"), d = e.get("state"), p = this.parseOAuthState(d);
    p.account_id || (p.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, r, p) : t ? this.handleSuccess(t, p) : this.handleError("unknown", "No authorization code was received from Google.", p);
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
    switch (P(t), P(n), P(r), e) {
      case "loading":
        $(t);
        break;
      case "success":
        $(n);
        break;
      case "error":
        $(r);
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
    const { errorMessage: r, errorDetail: d, closeBtn: p } = this.elements;
    r && (r.textContent = bs[e] || bs.unknown), t && d && (d.textContent = t, $(d)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), r = new URLSearchParams(window.location.search), d = r.get("state"), c = this.parseOAuthState(d).account_id || r.get("account_id");
      c && n.searchParams.set("account_id", c), window.location.href = n.toString();
    }
  }
}
function Lo(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Fs(e);
  return te(() => t.init()), t;
}
function Co(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new Fs(e);
  te(() => t.init());
}
const $i = "esign.google.account_id", Xr = {
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
class Os {
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
      retryBtn: r,
      reauthBtn: d,
      oauthCancelBtn: p,
      disconnectCancelBtn: c,
      disconnectConfirmBtn: S,
      accountIdInput: b,
      oauthModal: E,
      disconnectModal: _
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), d && d.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, _ && $(_);
    }), c && c.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, _ && P(_);
    }), S && S.addEventListener("click", () => this.disconnect()), p && p.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), r && r.addEventListener("click", () => this.checkStatus()), b && (b.addEventListener("change", () => {
      this.setCurrentAccountId(b.value, !0);
    }), b.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(b.value, !0));
    }));
    const { accountDropdown: O, connectFirstBtn: R } = this.elements;
    O && O.addEventListener("change", () => {
      O.value === "__new__" ? (O.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(O.value, !0);
    }), R && R.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), _ && !_.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, P(_)));
    }), [E, _].forEach((B) => {
      B && B.addEventListener("click", (G) => {
        const J = G.target;
        (J === B || J.getAttribute("aria-hidden") === "true") && (P(B), B === E ? this.cancelOAuthFlow() : B === _ && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem($i)
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
      this.currentAccountId ? window.localStorage.setItem($i, this.currentAccountId) : window.localStorage.removeItem($i);
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
    const { loadingState: t, disconnectedState: n, connectedState: r, errorState: d } = this.elements;
    switch (P(t), P(n), P(r), P(d), e) {
      case "loading":
        $(t);
        break;
      case "disconnected":
        $(n);
        break;
      case "connected":
        $(r);
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
    const t = (G, J) => {
      for (const Z of G)
        if (Object.prototype.hasOwnProperty.call(e, Z) && e[Z] !== void 0 && e[Z] !== null)
          return e[Z];
      return J;
    }, n = t(["expires_at", "ExpiresAt"], ""), r = t(["scopes", "Scopes"], []), d = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), p = t(["connected", "Connected"], !1), c = t(["degraded", "Degraded"], !1), S = t(["degraded_reason", "DegradedReason"], ""), b = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), _ = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let O = t(["is_expired", "IsExpired"], void 0), R = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof O != "boolean" || typeof R != "boolean") && n) {
      const G = new Date(n);
      if (!Number.isNaN(G.getTime())) {
        const J = G.getTime() - Date.now(), Z = 5 * 60 * 1e3;
        O = J <= 0, R = J > 0 && J <= Z;
      }
    }
    const B = typeof _ == "boolean" ? _ : (O === !0 || R === !0) && !E;
    return {
      connected: p,
      account_id: d,
      email: b,
      scopes: Array.isArray(r) ? r : [],
      expires_at: n,
      is_expired: O === !0,
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
    const { connectedEmail: t, connectedAccountId: n, scopesList: r, expiryInfo: d, reauthWarning: p, reauthReason: c } = this.elements;
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
        const r = Xr[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, r, d) {
    const { expiryInfo: p, reauthWarning: c, reauthReason: S } = this.elements;
    if (!p) return;
    if (p.classList.remove("text-red-600", "text-amber-600"), p.classList.add("text-gray-500"), !e) {
      p.textContent = "Access token status unknown", c && P(c);
      return;
    }
    const b = new Date(e), E = /* @__PURE__ */ new Date(), _ = Math.max(
      1,
      Math.round((b.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? r ? (p.textContent = "Access token expired, but refresh is available and will be applied automatically.", p.classList.remove("text-gray-500"), p.classList.add("text-amber-600"), c && P(c)) : (p.textContent = "Access token has expired. Please re-authorize.", p.classList.remove("text-gray-500"), p.classList.add("text-red-600"), c && $(c), S && (S.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (p.classList.remove("text-gray-500"), p.classList.add("text-amber-600"), r ? (p.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}. Refresh is available automatically.`, c && P(c)) : (p.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}`, c && $(c), S && (S.textContent = `Your access token will expire in ${_} minute${_ !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (p.textContent = `Token valid until ${b.toLocaleDateString()} ${b.toLocaleTimeString()}`, c && P(c)), !d && c && P(c);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: r } = this.elements;
    n && (e ? ($(n), r && (r.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : P(n));
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
      const S = d.email || p || "Default", b = d.status !== "connected" ? ` (${d.status})` : "";
      c.textContent = `${S}${b}`, p === this.currentAccountId && (c.selected = !0), e.appendChild(c);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const d = document.createElement("option");
      d.value = this.currentAccountId, d.textContent = `${this.currentAccountId} (new)`, d.selected = !0, e.appendChild(d);
    }
    const r = document.createElement("option");
    r.value = "__new__", r.textContent = "+ Connect New Account...", e.appendChild(r);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && P(e), this.accounts.length === 0) {
      t && $(t), n && P(n);
      return;
    }
    t && P(t), n && ($(n), n.innerHTML = this.accounts.map((r) => this.renderAccountCard(r)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, d = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, p = t ? "ring-2 ring-blue-500" : "", c = n[e.status] || "bg-white border-gray-200", S = r[e.status] || "bg-gray-100 text-gray-700", b = d[e.status] || e.status, E = e.account_id || "default", _ = e.email || (e.account_id ? e.account_id : "Default account");
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
              ${b}
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
      r.addEventListener("click", (d) => {
        const c = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((r) => {
      r.addEventListener("click", (d) => {
        const c = d.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !1), this.startOAuthFlow(c);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((r) => {
      r.addEventListener("click", (d) => {
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
    const r = this.resolveOAuthRedirectURI(), d = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = d;
    const p = this.buildGoogleOAuthUrl(r, d);
    if (!p) {
      t && P(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const c = 500, S = 600, b = (window.screen.width - c) / 2, E = (window.screen.height - S) / 2;
    if (this.oauthWindow = window.open(
      p,
      "google_oauth",
      `width=${c},height=${S},left=${b},top=${E},popup=yes`
    ), !this.oauthWindow) {
      t && P(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (_) => this.handleOAuthCallback(_), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
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
    const n = /* @__PURE__ */ new Set(), r = this.normalizeOrigin(window.location.origin);
    r && n.add(r);
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
    if (this.cleanupOAuthFlow(), n && P(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const r = this.resolveOAuthRedirectURI(), p = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
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
              redirect_uri: r
            })
          }
        );
        if (!c.ok) {
          const S = await c.json();
          throw new Error(S.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (r) {
        console.error("Connect error:", r);
        const d = r instanceof Error ? r.message : "Unknown error";
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
function Ao(i) {
  const e = new Os(i);
  return te(() => e.init()), e;
}
function To(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new Os(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Bi = "esign.google.account_id", ws = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Ss = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Us {
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
      loadMoreBtn: r,
      importBtn: d,
      clearSelectionBtn: p,
      importCancelBtn: c,
      importConfirmBtn: S,
      importForm: b,
      importModal: E,
      viewListBtn: _,
      viewGridBtn: O
    } = this.elements;
    if (e) {
      const B = ri(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (G) => {
        G.key === "Enter" && (G.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), r && r.addEventListener("click", () => this.loadMore()), d && d.addEventListener("click", () => this.showImportModal()), p && p.addEventListener("click", () => this.clearSelection()), c && c.addEventListener("click", () => this.hideImportModal()), S && b && b.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const G = B.target;
      (G === E || G.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), _ && _.addEventListener("click", () => this.setViewMode("list")), O && O.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (B) => {
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
        window.localStorage.getItem(Bi)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : P(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Bi, this.currentAccountId) : window.localStorage.removeItem(Bi);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), p = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), b = Array.isArray(e.parents) ? e.parents : c ? [c] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
      modifiedTime: d,
      webViewLink: p,
      parents: b,
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
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      let d;
      this.searchQuery ? d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : d = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(r.id)}`
      ), this.nextPageToken && (d += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const p = await fetch(d, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!p.ok)
        throw new Error(`Failed to load files: ${p.status}`);
      const c = await p.json(), S = Array.isArray(c.files) ? c.files.map((b) => this.normalizeDriveFile(b)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...S] : this.currentFiles = S, this.nextPageToken = c.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), Ie(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (r) {
      console.error("Error loading files:", r), this.renderError(r instanceof Error ? r.message : "Failed to load files"), Ie("Error loading files");
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
    const n = this.currentFiles.map((r) => this.renderFileItem(r)).join("");
    e.innerHTML = n;
  }
  /**
   * Render a single file item
   */
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Ss.includes(e.mimeType), r = this.selectedFile?.id === e.id, d = ws[e.mimeType] || ws.default, p = this.getFileIcon(d);
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
          ${p}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${si(e.modifiedTime)}
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
    const r = n.dataset.fileId, d = n.dataset.isFolder === "true";
    r && (d ? this.navigateToFolder(r) : this.selectFile(r));
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
      previewTitle: r,
      previewType: d,
      previewFileId: p,
      previewOwner: c,
      previewModified: S,
      importBtn: b,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && $(e), t && P(t);
      return;
    }
    e && P(e), t && $(t);
    const _ = this.selectedFile, O = Ss.includes(_.mimeType);
    r && (r.textContent = _.name), d && (d.textContent = this.getMimeTypeLabel(_.mimeType)), p && (p.textContent = _.id), c && _.owners.length > 0 && (c.textContent = _.owners[0].emailAddress || "-"), S && (S.textContent = si(_.modifiedTime)), b && (O ? (b.removeAttribute("disabled"), b.classList.remove("opacity-50", "cursor-not-allowed")) : (b.setAttribute("disabled", "true"), b.classList.add("opacity-50", "cursor-not-allowed"))), E && _.webViewLink && (E.href = _.webViewLink);
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
    $(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const r = e.querySelector("ol");
    r && (r.innerHTML = this.currentFolderPath.map(
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
    ).join(""), Ft(".breadcrumb-item", r).forEach((d) => {
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
    e && (this.nextPageToken ? $(e) : P(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? $(t) : P(t)), this.clearSelection(), this.loadFiles();
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
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: n, importAgreementTitle: r } = this.elements;
    if (t && (t.value = this.selectedFile.id), n) {
      const d = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = d;
    }
    r && (r.value = ""), e && $(e);
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
      importDocumentTitle: r,
      importAgreementTitle: d
    } = this.elements, p = this.selectedFile.id, c = r?.value.trim() || this.selectedFile.name, S = d?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && $(t), n && (n.textContent = "Importing...");
    try {
      const b = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
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
      if (!b.ok) {
        const _ = await b.json();
        throw new Error(_.error?.message || "Import failed");
      }
      const E = await b.json();
      this.showToast("Import started successfully", "success"), Ie("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (b) {
      console.error("Import error:", b);
      const E = b instanceof Error ? b.message : "Import failed";
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
function ko(i) {
  const e = new Us(i);
  return te(() => e.init()), e;
}
function Po(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new Us(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class Ns {
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
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", r = t?.value || "";
    try {
      const d = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      d.searchParams.set("range", n), r && d.searchParams.set("provider", r);
      const p = await fetch(d.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!p.ok)
        this.healthData = this.generateMockHealthData(n, r);
      else {
        const c = await p.json();
        this.healthData = c;
      }
      this.renderHealthData(), Ie("Health data refreshed");
    } catch (d) {
      console.error("Failed to load health data:", d), this.healthData = this.generateMockHealthData(n, r), this.renderHealthData();
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
    for (let d = 0; d < e; d++) {
      const p = n[Math.floor(Math.random() * n.length)], c = r[Math.floor(Math.random() * r.length)];
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
    const n = [], r = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, d = /* @__PURE__ */ new Date();
    for (let p = e - 1; p >= 0; p--) {
      const c = new Date(d.getTime() - p * 36e5);
      n.push(
        c.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
      const d = r.healthTrend >= 0 ? "+" : "";
      n.textContent = `${d}${r.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: r } = this.elements, d = this.healthData.syncStats;
    e && (e.textContent = `${d.successRate.toFixed(1)}%`), t && (t.textContent = `${d.succeeded} succeeded`), n && (n.textContent = `${d.failed} failed`), r && (r.style.width = `${d.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: r } = this.elements, d = this.healthData.conflictStats;
    if (e && (e.textContent = String(d.pending)), t && (t.textContent = `${d.pending} pending`), n && (n.textContent = `${d.resolvedToday} resolved today`), r) {
      const p = d.trend >= 0 ? "+" : "";
      r.textContent = `${p}${d.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: r } = this.elements, d = this.healthData.retryStats;
    e && (e.textContent = String(d.total)), t && (t.textContent = `${d.recoveryRate}%`), n && (n.textContent = d.avgAttempts.toFixed(1)), r && (r.innerHTML = d.recent.map(
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
      r.addEventListener("click", (d) => this.dismissAlert(d));
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
    const { alertsList: r, noAlerts: d, alertCount: p } = this.elements, c = r?.querySelectorAll(":scope > div").length || 0;
    p && (p.textContent = `${c} active`, c === 0 && (p.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", r && r.classList.add("hidden"), d && d.classList.remove("hidden")));
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
    const d = document.getElementById(e);
    if (!d) return;
    const p = d.getContext("2d");
    if (!p) return;
    const c = d.width, S = d.height, b = 40, E = c - b * 2, _ = S - b * 2;
    p.clearRect(0, 0, c, S);
    const O = t.labels, R = Object.values(t.datasets), B = E / O.length / (R.length + 1), G = Math.max(...R.flat()) || 1;
    O.forEach((J, Z) => {
      const ae = b + Z * E / O.length + B / 2;
      R.forEach((ve, de) => {
        const Te = ve[Z] / G * _, Re = ae + de * B, Qe = S - b - Te;
        p.fillStyle = n[de] || "#6b7280", p.fillRect(Re, Qe, B - 2, Te);
      }), Z % Math.ceil(O.length / 6) === 0 && (p.fillStyle = "#6b7280", p.font = "10px sans-serif", p.textAlign = "center", p.fillText(J, ae + R.length * B / 2, S - b + 15));
    }), p.fillStyle = "#6b7280", p.font = "10px sans-serif", p.textAlign = "right";
    for (let J = 0; J <= 4; J++) {
      const Z = S - b - J * _ / 4, ae = Math.round(G * J / 4);
      p.fillText(ae.toString(), b - 5, Z + 3);
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
function _o(i) {
  const e = new Ns(i);
  return te(() => e.init()), e;
}
function Do(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new Ns(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class Hs {
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
      cancelModalBtn: r,
      refreshBtn: d,
      retryBtn: p,
      addFieldBtn: c,
      addRuleBtn: S,
      validateBtn: b,
      mappingForm: E,
      publishCancelBtn: _,
      publishConfirmBtn: O,
      deleteCancelBtn: R,
      deleteConfirmBtn: B,
      closePreviewBtn: G,
      loadSampleBtn: J,
      runPreviewBtn: Z,
      clearPreviewBtn: ae,
      previewSourceInput: ve,
      searchInput: de,
      filterStatus: Te,
      filterProvider: Re,
      mappingModal: Qe,
      publishModal: Fe,
      deleteModal: _e,
      previewModal: Oe
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.closeModal()), d?.addEventListener("click", () => this.loadMappings()), p?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.addSchemaField()), S?.addEventListener("click", () => this.addMappingRule()), b?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (ke) => {
      ke.preventDefault(), this.saveMapping();
    }), _?.addEventListener("click", () => this.closePublishModal()), O?.addEventListener("click", () => this.publishMapping()), R?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), G?.addEventListener("click", () => this.closePreviewModal()), J?.addEventListener("click", () => this.loadSamplePayload()), Z?.addEventListener("click", () => this.runPreviewTransform()), ae?.addEventListener("click", () => this.clearPreview()), ve?.addEventListener("input", ri(() => this.validateSourceJson(), 300)), de?.addEventListener("input", ri(() => this.renderMappings(), 300)), Te?.addEventListener("change", () => this.renderMappings()), Re?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (ke) => {
      ke.key === "Escape" && (Qe && !Qe.classList.contains("hidden") && this.closeModal(), Fe && !Fe.classList.contains("hidden") && this.closePublishModal(), _e && !_e.classList.contains("hidden") && this.closeDeleteModal(), Oe && !Oe.classList.contains("hidden") && this.closePreviewModal());
    }), [Qe, Fe, _e, Oe].forEach((ke) => {
      ke?.addEventListener("click", (rn) => {
        const oe = rn.target;
        (oe === ke || oe.getAttribute("aria-hidden") === "true") && (ke === Qe ? this.closeModal() : ke === Fe ? this.closePublishModal() : ke === _e ? this.closeDeleteModal() : ke === Oe && this.closePreviewModal());
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
    const { loadingState: t, emptyState: n, errorState: r, mappingsList: d } = this.elements;
    switch (P(t), P(n), P(r), P(d), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(r);
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
    const { mappingsTbody: e, searchInput: t, filterStatus: n, filterProvider: r } = this.elements;
    if (!e) return;
    const d = (t?.value || "").toLowerCase(), p = n?.value || "", c = r?.value || "", S = this.mappings.filter((b) => !(d && !b.name.toLowerCase().includes(d) && !b.provider.toLowerCase().includes(d) || p && b.status !== p || c && b.provider !== c));
    if (S.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = S.map(
      (b) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(b.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(b.compiled_hash ? b.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(b.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(b.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${b.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(b.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(b.id)}" aria-label="Preview ${this.escapeHtml(b.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(b.id)}" aria-label="Edit ${this.escapeHtml(b.name)}">
              Edit
            </button>
            ${b.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(b.id)}" aria-label="Publish ${this.escapeHtml(b.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(b.id)}" aria-label="Delete ${this.escapeHtml(b.name)}">
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
      schemaObjectTypeInput: d,
      schemaVersionInput: p,
      schemaFieldsContainer: c,
      mappingRulesContainer: S
    } = this.elements, b = [];
    c?.querySelectorAll(".schema-field-row").forEach((_) => {
      b.push({
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
      provider: r?.value.trim() || "",
      external_schema: {
        object_type: d?.value.trim() || "",
        version: p?.value.trim() || void 0,
        fields: b
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
      mappingNameInput: r,
      mappingProviderInput: d,
      schemaObjectTypeInput: p,
      schemaVersionInput: c,
      schemaFieldsContainer: S,
      mappingRulesContainer: b,
      mappingStatusBadge: E,
      formValidationStatus: _
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), r && (r.value = e.name || ""), d && (d.value = e.provider || "");
    const O = e.external_schema || { object_type: "", fields: [] };
    p && (p.value = O.object_type || ""), c && (c.value = O.version || ""), S && (S.innerHTML = "", (O.fields || []).forEach((R) => S.appendChild(this.createSchemaFieldRow(R)))), b && (b.innerHTML = "", (e.rules || []).forEach((R) => b.appendChild(this.createMappingRuleRow(R)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), P(_);
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
      mappingRulesContainer: d,
      mappingStatusBadge: p,
      formValidationStatus: c
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), r && (r.innerHTML = ""), d && (d.innerHTML = ""), p && p.classList.add("hidden"), P(c), this.editingMappingId = null;
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
    const { mappingModal: n, mappingModalTitle: r, mappingNameInput: d } = this.elements;
    this.editingMappingId = e, r && (r.textContent = "Edit Mapping Specification"), this.populateForm(t), $(n), d?.focus();
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
    const t = this.mappings.find((p) => p.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: r, publishMappingVersion: d } = this.elements;
    this.pendingPublishId = e, r && (r.textContent = t.name), d && (d.textContent = `v${t.version || 1}`), $(n);
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
    this.pendingDeleteId = e, $(this.elements.deleteModal);
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
      const r = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...n, validate_only: !0 })
      }), d = await r.json();
      if (r.ok && d.status === "ok")
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
    } catch (r) {
      console.error("Validation error:", r), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(r instanceof Error ? r.message : "Unknown error")}</div>`, $(t));
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
      const n = !!t.id, r = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, p = await fetch(r, {
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
    const t = this.mappings.find((E) => E.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: r,
      previewMappingProvider: d,
      previewObjectType: p,
      previewMappingStatus: c,
      previewSourceInput: S,
      sourceSyntaxError: b
    } = this.elements;
    this.currentPreviewMapping = t, r && (r.textContent = t.name), d && (d.textContent = t.provider), p && (p.textContent = t.external_schema?.object_type || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), S && (S.value = ""), P(b), $(n), S?.focus();
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
    const { previewEmpty: t, previewLoading: n, previewError: r, previewSuccess: d } = this.elements;
    switch (P(t), P(n), P(r), P(d), e) {
      case "empty":
        $(t);
        break;
      case "loading":
        $(n);
        break;
      case "error":
        $(r);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, r = n.object_type || "data", d = n.fields || [], p = {}, c = {};
    d.forEach((S) => {
      const b = S.field || "field";
      switch (S.type) {
        case "string":
          c[b] = b === "email" ? "john.doe@example.com" : b === "name" ? "John Doe" : `sample_${b}`;
          break;
        case "number":
          c[b] = 123;
          break;
        case "boolean":
          c[b] = !0;
          break;
        case "date":
          c[b] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          c[b] = `sample_${b}`;
      }
    }), p[r] = c, e && (e.value = JSON.stringify(p, null, 2)), P(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return P(t), null;
    try {
      const r = JSON.parse(n);
      return P(t), r;
    } catch (r) {
      return t && (t.textContent = `JSON Syntax Error: ${r instanceof Error ? r.message : "Invalid JSON"}`, $(t)), null;
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
    }, d = {}, p = {}, c = [];
    return n.forEach((S) => {
      const b = this.resolveSourceValue(e, S.source_object, S.source_field), E = b !== void 0;
      if (r.matched_rules.push({
        source: S.source_field,
        matched: E,
        value: b
      }), !!E)
        switch (S.target_entity) {
          case "participant":
            d[S.target_path] = b;
            break;
          case "agreement":
            p[S.target_path] = b;
            break;
          case "field_definition":
            c.push({ path: S.target_path, value: b });
            break;
        }
    }), Object.keys(d).length > 0 && r.participants.push({
      ...d,
      role: d.role || "signer",
      signing_stage: d.signing_stage || 1
    }), r.agreement = p, r.field_definitions = c, r;
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
          const d = e[r];
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
      previewFields: r,
      fieldsCount: d,
      previewMetadata: p,
      previewRawJson: c,
      previewRulesTbody: S
    } = this.elements, b = e.participants || [];
    n && (n.textContent = `(${b.length})`), t && (b.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = b.map(
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
    d && (d.textContent = `(${E.length})`), r && (E.length === 0 ? r.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : r.innerHTML = E.map(
      (R) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(R.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(R.value))}</span>
          </div>
        `
    ).join(""));
    const _ = e.agreement || {}, O = Object.entries(_);
    p && (O.length === 0 ? p.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : p.innerHTML = O.map(
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
    e && (e.value = ""), P(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function Mo(i) {
  const e = new Hs(i);
  return te(() => e.init()), e;
}
function $o(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Hs(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class qs {
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
      filterStatus: r,
      filterProvider: d,
      filterEntity: p,
      actionResolveBtn: c,
      actionIgnoreBtn: S,
      cancelResolveBtn: b,
      resolveForm: E,
      conflictDetailModal: _,
      resolveModal: O
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), r?.addEventListener("change", () => this.loadConflicts()), d?.addEventListener("change", () => this.renderConflicts()), p?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("click", () => this.openResolveModal("resolved")), S?.addEventListener("click", () => this.openResolveModal("ignored")), b?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (R) => this.submitResolution(R)), document.addEventListener("keydown", (R) => {
      R.key === "Escape" && (O && !O.classList.contains("hidden") ? this.closeResolveModal() : _ && !_.classList.contains("hidden") && this.closeConflictDetail());
    }), [_, O].forEach((R) => {
      R?.addEventListener("click", (B) => {
        const G = B.target;
        (G === R || G.getAttribute("aria-hidden") === "true") && (R === _ ? this.closeConflictDetail() : R === O && this.closeResolveModal());
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
    const { loadingState: t, emptyState: n, errorState: r, conflictsList: d } = this.elements;
    switch (P(t), P(n), P(r), P(d), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(r);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, r = this.conflicts.filter((c) => c.status === "pending").length, d = this.conflicts.filter((c) => c.status === "resolved").length, p = this.conflicts.filter((c) => c.status === "ignored").length;
    e && (e.textContent = String(r)), t && (t.textContent = String(d)), n && (n.textContent = String(p));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: r } = this.elements;
    if (!e) return;
    const d = t?.value || "", p = n?.value || "", c = r?.value || "", S = this.conflicts.filter((b) => !(d && b.status !== d || p && b.provider !== p || c && b.entity_kind !== c));
    if (S.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = S.map(
      (b) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(b.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${b.status === "pending" ? "bg-amber-100" : b.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${b.status === "pending" ? "text-amber-600" : b.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(b.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(b.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(b.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((b.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(b.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(b.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((b) => {
      b.addEventListener("click", () => this.openConflictDetail(b.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((Te) => Te.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: r,
      detailEntityType: d,
      detailStatusBadge: p,
      detailProvider: c,
      detailExternalId: S,
      detailInternalId: b,
      detailBindingId: E,
      detailConflictId: _,
      detailRunId: O,
      detailCreatedAt: R,
      detailVersion: B,
      detailPayload: G,
      resolutionSection: J,
      actionButtons: Z,
      detailResolvedAt: ae,
      detailResolvedBy: ve,
      detailResolution: de
    } = this.elements;
    if (r && (r.textContent = t.reason || "Data conflict"), d && (d.textContent = t.entity_kind || "-"), p && (p.innerHTML = this.getStatusBadge(t.status)), c && (c.textContent = t.provider || "-"), S && (S.textContent = t.external_id || "-"), b && (b.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), _ && (_.textContent = t.id), O && (O.textContent = t.run_id || "-"), R && (R.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), G)
      try {
        const Te = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        G.textContent = JSON.stringify(Te, null, 2);
      } catch {
        G.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if ($(J), P(Z), ae && (ae.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), ve && (ve.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), de)
        try {
          const Te = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          de.textContent = JSON.stringify(Te, null, 2);
        } catch {
          de.textContent = t.resolution_json || "{}";
        }
    } else
      P(J), $(Z);
    $(n);
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
    const { resolveModal: t, resolveForm: n, resolutionAction: r } = this.elements;
    n?.reset(), r && (r.value = e), $(t);
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
    const r = new FormData(t);
    let d = {};
    const p = r.get("resolution");
    if (p)
      try {
        d = JSON.parse(p);
      } catch {
        d = { raw: p };
      }
    const c = r.get("notes");
    c && (d.notes = c);
    const S = {
      status: r.get("status"),
      resolution: d
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const b = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(S)
      });
      if (!b.ok) {
        const E = await b.json();
        throw new Error(E.error?.message || `HTTP ${b.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (b) {
      console.error("Resolution error:", b);
      const E = b instanceof Error ? b.message : "Unknown error";
      this.showToast(`Failed: ${E}`, "error");
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
function Bo(i) {
  const e = new qs(i);
  return te(() => e.init()), e;
}
function Ro(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new qs(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class js {
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
      startSyncForm: r,
      refreshBtn: d,
      retryBtn: p,
      closeDetailBtn: c,
      filterProvider: S,
      filterStatus: b,
      filterDirection: E,
      actionResumeBtn: _,
      actionRetryBtn: O,
      actionCompleteBtn: R,
      actionFailBtn: B,
      actionDiagnosticsBtn: G,
      startSyncModal: J,
      runDetailModal: Z
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (ae) => this.startSync(ae)), d?.addEventListener("click", () => this.loadSyncRuns()), p?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.closeRunDetail()), S?.addEventListener("change", () => this.renderTimeline()), b?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), _?.addEventListener("click", () => this.runAction("resume")), O?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), G?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (ae) => {
      ae.key === "Escape" && (J && !J.classList.contains("hidden") && this.closeStartSyncModal(), Z && !Z.classList.contains("hidden") && this.closeRunDetail());
    }), [J, Z].forEach((ae) => {
      ae?.addEventListener("click", (ve) => {
        const de = ve.target;
        (de === ae || de.getAttribute("aria-hidden") === "true") && (ae === J ? this.closeStartSyncModal() : ae === Z && this.closeRunDetail());
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
    const { loadingState: t, emptyState: n, errorState: r, runsTimeline: d } = this.elements;
    switch (P(t), P(n), P(r), P(d), e) {
      case "loading":
        $(t);
        break;
      case "empty":
        $(n);
        break;
      case "error":
        $(r);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: r } = this.elements, d = this.syncRuns.length, p = this.syncRuns.filter(
      (b) => b.status === "running" || b.status === "pending"
    ).length, c = this.syncRuns.filter((b) => b.status === "completed").length, S = this.syncRuns.filter((b) => b.status === "failed").length;
    e && (e.textContent = String(d)), t && (t.textContent = String(p)), n && (n.textContent = String(c)), r && (r.textContent = String(S));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const r = t?.value || "", d = n?.value || "", p = this.syncRuns.filter((c) => !(r && c.status !== r || d && c.direction !== d));
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
    P(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const r = new FormData(t), d = {
      provider: r.get("provider"),
      direction: r.get("direction"),
      mapping_spec_id: r.get("mapping_spec_id"),
      cursor: r.get("cursor") || void 0
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
    const t = this.syncRuns.find((ve) => ve.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: r,
      detailProvider: d,
      detailDirection: p,
      detailStatus: c,
      detailStarted: S,
      detailCompleted: b,
      detailCursor: E,
      detailAttempt: _,
      detailErrorSection: O,
      detailLastError: R,
      detailCheckpoints: B,
      actionResumeBtn: G,
      actionRetryBtn: J,
      actionCompleteBtn: Z,
      actionFailBtn: ae
    } = this.elements;
    r && (r.textContent = t.id), d && (d.textContent = t.provider), p && (p.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), c && (c.innerHTML = this.getStatusBadge(t.status)), S && (S.textContent = this.formatDate(t.started_at)), b && (b.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), _ && (_.textContent = String(t.attempt_count || 1)), t.last_error ? (R && (R.textContent = t.last_error), $(O)) : P(O), G && G.classList.toggle("hidden", t.status !== "running"), J && J.classList.toggle("hidden", t.status !== "failed"), Z && Z.classList.toggle("hidden", t.status !== "running"), ae && ae.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), $(n);
    try {
      const ve = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (ve.ok) {
        const de = await ve.json();
        this.renderCheckpoints(de.checkpoints || []);
      } else
        B && (B.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (ve) {
      console.error("Error loading checkpoints:", ve), B && (B.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    P(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: r, actionFailBtn: d } = this.elements, p = e === "resume" ? t : e === "complete" ? r : d, c = e === "resume" ? n : null;
    if (!p) return;
    p.setAttribute("disabled", "true"), c?.setAttribute("disabled", "true");
    const S = p.innerHTML;
    p.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const b = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, E = await fetch(b, {
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
    } catch (b) {
      console.error(`${e} error:`, b);
      const E = b instanceof Error ? b.message : "Unknown error";
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
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : t === "error" ? r.error(e) : t === "info" && r.info && r.info(e));
  }
}
function Fo(i) {
  const e = new js(i);
  return te(() => e.init()), e;
}
function Oo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new js(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const Ri = "esign.google.account_id", Qr = 25 * 1024 * 1024, Zr = 2e3, xs = 60, Hi = "application/vnd.google-apps.document", qi = "application/pdf", Is = "application/vnd.google-apps.folder", ea = [Hi, qi];
class Gi {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || Qr, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: Ft(".source-tab"),
      sourcePanels: Ft(".source-panel"),
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
      clearBtn: r,
      titleInput: d
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), r && r.addEventListener("click", (p) => {
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
      refreshBtn: r,
      clearSelectionBtn: d,
      importBtn: p,
      importRetryBtn: c,
      driveAccountDropdown: S
    } = this.elements;
    if (e) {
      const b = ri(() => this.handleSearch(), 300);
      e.addEventListener("input", b);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), r && r.addEventListener("click", () => this.refreshFiles()), S && S.addEventListener("change", () => {
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
        window.localStorage.getItem(Ri)
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
      const { searchInput: r, clearSearchBtn: d } = this.elements;
      r && (r.value = ""), d && P(d), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const d = this.normalizeAccountId(r?.account_id);
      if (n.has(d))
        continue;
      n.add(d);
      const p = document.createElement("option");
      p.value = d;
      const c = String(r?.email || "").trim(), S = String(r?.status || "").trim(), b = c || d || "Default account";
      p.textContent = S && S !== "connected" ? `${b} (${S})` : b, d === this.currentAccountId && (p.selected = !0), e.appendChild(p);
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
      this.currentAccountId ? window.localStorage.setItem(Ri, this.currentAccountId) : window.localStorage.removeItem(Ri);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, $(e)) : P(e)), t) {
      const r = t.dataset.baseHref || t.getAttribute("href");
      r && t.setAttribute("href", this.applyAccountIdToPath(r));
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
      n.id.replace("panel-", "") === e ? $(n) : P(n);
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n, sourceOriginalNameInput: r } = this.elements, d = e?.files?.[0];
    if (d && this.validateFile(d)) {
      if (this.showPreview(d), n && (n.value = ""), r && (r.value = d.name), t && !t.value.trim()) {
        const p = d.name.replace(/\.pdf$/i, "");
        t.value = p;
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
      `File is too large (${Zn(e.size)}). Maximum size is ${Zn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: r, fileSize: d, uploadZone: p } = this.elements;
    r && (r.textContent = e.name), d && (d.textContent = Zn(e.size)), t && P(t), n && $(n), p && (p.classList.remove("border-gray-300"), p.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && $(e), t && P(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    e && (e.textContent = "", P(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, r = e?.files && e.files.length > 0, d = t?.value.trim().length ?? !1, p = r && d;
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), r = t.get("org_id"), d = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && d.searchParams.set("tenant_id", n), r && d.searchParams.set("org_id", r);
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
    const b = S?.object_key ? String(S.object_key).trim() : "";
    if (!b)
      throw new Error("Upload failed: missing source object key.");
    const E = S?.source_original_name ? String(S.source_original_name).trim() : S?.original_name ? String(S.original_name).trim() : e.name;
    return {
      objectKey: b,
      sourceOriginalName: E
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: r, sourceOriginalNameInput: d } = this.elements, p = t?.files?.[0];
    if (!(!p || !this.validateFile(p))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const c = await this.uploadSourcePDF(p);
        r && (r.value = c.objectKey), d && (d.value = c.sourceOriginalName || p.name), n?.submit();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), d = String(e.modifiedTime || e.ModifiedTime || "").trim(), p = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), b = Array.isArray(e.parents) ? e.parents : c ? [c] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
      modifiedTime: d,
      webViewLink: p,
      parents: b,
      owners: E
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === Hi;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === qi;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Is;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return ea.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Hi ? "Google Document" : t === qi ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Is ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: r, append: d } = e, { fileList: p } = this.elements;
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
      n ? (c = this.buildScopedAPIURL("/esign/google-drive/search"), c.searchParams.set("q", n), c.searchParams.set("page_size", "20"), r && c.searchParams.set("page_token", r)) : (c = this.buildScopedAPIURL("/esign/google-drive/browse"), c.searchParams.set("page_size", "20"), t && t !== "root" && c.searchParams.set("folder_id", t), r && c.searchParams.set("page_token", r));
      const S = await fetch(c.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), b = await S.json();
      if (!S.ok)
        throw new Error(b.error?.message || "Failed to load files");
      const E = Array.isArray(b.files) ? b.files.map((B) => this.normalizeDriveFile(B)) : [];
      this.nextPageToken = b.next_page_token || null, d ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(d);
      const { resultCount: _, listTitle: O } = this.elements;
      n && _ ? (_.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, O && (O.textContent = "Search Results")) : (_ && (_.textContent = ""), O && (O.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: R } = this.elements;
      R && (this.nextPageToken ? $(R) : P(R)), Ie(`Loaded ${E.length} files`);
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
        `), Ie(`Error: ${c instanceof Error ? c.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((r, d) => {
      const p = this.getFileIcon(r), c = this.isImportable(r), S = this.isFolder(r), b = this.selectedFile && this.selectedFile.id === r.id, E = !c && !S;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${b ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${E ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${b}"
          data-file-index="${d}"
          ${E ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${p.bg} flex items-center justify-center flex-shrink-0 ${p.text}">
            ${p.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(r.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(r.mimeType)}
              ${r.modifiedTime ? " • " + si(r.modifiedTime) : ""}
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
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((r) => {
      r.addEventListener("click", () => {
        const d = parseInt(r.dataset.fileIndex || "0", 10), p = this.currentFiles[d];
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
    $(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, r) => {
      const d = r === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${r > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${r}" class="breadcrumb-item ${d ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const r = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, r + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: r } = this.elements;
    r && r.querySelectorAll(".file-item").forEach((J) => {
      const Z = parseInt(J.dataset.fileIndex || "0", 10);
      this.currentFiles[Z].id === e.id ? (J.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), J.setAttribute("aria-selected", "true")) : (J.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), J.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: d,
      filePreview: p,
      importStatus: c,
      previewIcon: S,
      previewTitle: b,
      previewType: E,
      importTypeInfo: _,
      importTypeLabel: O,
      importTypeDesc: R,
      snapshotWarning: B,
      importDocumentTitle: G
    } = this.elements;
    d && P(d), p && $(p), c && P(c), S && (S.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, S.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), b && (b.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && _ && (_.className = `p-3 rounded-lg border ${n.bgClass}`, O && (O.textContent = n.label, O.className = `text-xs font-medium ${n.textClass}`), R && (R.textContent = n.desc, R.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? $(B) : P(B))), G && (G.value = e.name || ""), Ie(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: r } = this.elements;
    e && $(e), t && P(t), n && P(n), r && r.querySelectorAll(".file-item").forEach((d) => {
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
      t && P(t), this.searchQuery = "";
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: r.id });
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
      importStatus: r,
      importStatusQueued: d,
      importStatusSuccess: p,
      importStatusFailed: c
    } = this.elements;
    switch (t && P(t), n && P(n), r && $(r), d && P(d), p && P(p), c && P(c), e) {
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
    const { importErrorMessage: n, importReconnectLink: r } = this.elements;
    if (n && (n.textContent = e), r)
      if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
        const d = this.config.routes.integrations || "/admin/esign/integrations/google";
        r.href = this.applyAccountIdToPath(d), $(r);
      } else
        P(r);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: r } = this.elements;
    if (!this.selectedFile || !e) return;
    const d = e.value.trim();
    if (!d) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), r && P(r), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
      const b = new URL(window.location.href);
      this.currentImportRunId && b.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", b.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Zr);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > xs) {
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
            const d = n.error?.code || "", p = n.error?.message || "Import failed";
            this.showImportError(p, d), Ie("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < xs ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function Uo(i) {
  const e = new Gi(i);
  return te(() => e.init()), e;
}
function No(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new Gi(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function ta(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, r = i.context && typeof i.context == "object" ? i.context : {}, d = String(t.index || "").trim();
  return !e && !d ? null : {
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
        ), n = ta(t);
        n && new Gi(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const Ee = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, Ct = Ee.REVIEW, na = {
  [Ee.DOCUMENT]: "Details",
  [Ee.DETAILS]: "Participants",
  [Ee.PARTICIPANTS]: "Fields",
  [Ee.FIELDS]: "Placement",
  [Ee.PLACEMENT]: "Review"
}, Ae = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, ai = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, ji = /* @__PURE__ */ new Map(), ia = 30 * 60 * 1e3, Es = {
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
function sa(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function ra(i) {
  const e = i instanceof Error ? i.message : i, t = sa(e);
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
  if (t && Es[t]) {
    const n = Es[t];
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
function Ls() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function aa() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function oa() {
  if (!aa())
    throw new Error("PDF preview library unavailable");
}
function ca(i) {
  const e = ji.get(i);
  return e ? Date.now() - e.timestamp > ia ? (ji.delete(i), null) : e : null;
}
function la(i, e, t) {
  ji.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function da(i, e = ai.THUMBNAIL_MAX_WIDTH, t = ai.THUMBNAIL_MAX_HEIGHT) {
  await oa();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const d = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, p = d.numPages, c = await d.getPage(1), S = c.getViewport({ scale: 1 }), b = e / S.width, E = t / S.height, _ = Math.min(b, E, 1), O = c.getViewport({ scale: _ }), R = document.createElement("canvas");
  R.width = O.width, R.height = O.height;
  const B = R.getContext("2d");
  if (!B)
    throw new Error("Failed to get canvas context");
  return await c.render({
    canvasContext: B,
    viewport: O
  }).promise, { dataUrl: R.toDataURL("image/jpeg", 0.8), pageCount: p };
}
class ua {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || ai.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || ai.THUMBNAIL_MAX_HEIGHT
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
    const t = e === Ee.DOCUMENT || e === Ee.DETAILS || e === Ee.PARTICIPANTS || e === Ee.FIELDS || e === Ee.REVIEW;
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
    const d = ca(e);
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
      if (r !== this.requestVersion)
        return;
      const { dataUrl: c, pageCount: S } = await da(
        p,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (r !== this.requestVersion)
        return;
      la(e, c, S), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? S,
        thumbnailUrl: c,
        isLoading: !1,
        error: null
      };
    } catch (p) {
      if (r !== this.requestVersion)
        return;
      const c = p instanceof Error ? p.message : "Failed to load preview", S = ra(c);
      Ls() && console.error("Failed to load document preview:", p), this.state = {
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
    const { container: e, thumbnail: t, title: n, pageCount: r, loadingState: d, errorState: p, emptyState: c, contentState: S } = this.elements;
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
        p?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Ls() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      S?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), r && this.state.pageCount && (r.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
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
function pa(i = {}) {
  const e = new ua(i);
  return e.init(), e;
}
function ga() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function ma() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function ha(i, e) {
  return {
    id: ga(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Cs(i, e) {
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
function As(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Ts(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function zs(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function fa(i, e) {
  const t = zs(i, e.definitionId);
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
function ya(i, e, t, n) {
  const r = /* @__PURE__ */ new Set();
  for (const d of t)
    r.add(d.definitionId);
  for (const [d, p] of n) {
    if (p.page !== e || r.has(d) || i.unlinkedDefinitions.has(d)) continue;
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
      placementSource: Ae.AUTO_LINKED,
      linkGroupId: S.id,
      linkedFromFieldId: S.sourceFieldId
    } };
  }
  return null;
}
const ks = 150, Ps = 32;
function re(i) {
  return i == null ? "" : String(i).trim();
}
function Vs(i) {
  if (typeof i == "boolean") return i;
  const e = re(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function Gs(i) {
  return re(i).toLowerCase();
}
function ue(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(re(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Qn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(re(i));
  return Number.isFinite(t) ? t : e;
}
function ei(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function At(i, e) {
  const t = ue(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function Cn(i, e, t = 1) {
  const n = ue(t, 1), r = ue(i, n);
  return e > 0 ? ei(r, 1, e) : r > 0 ? r : n;
}
function va(i, e, t) {
  const n = ue(t, 1);
  let r = At(i, n), d = At(e, n);
  return r <= 0 && (r = 1), d <= 0 && (d = n), d < r ? { start: d, end: r } : { start: r, end: d };
}
function Tn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => re(n)) : re(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const r = ue(n, 0);
    r > 0 && t.add(r);
  }), Array.from(t).sort((n, r) => n - r);
}
function ti(i, e) {
  const t = ue(e, 1), n = re(i.participantId ?? i.participant_id), r = Tn(i.excludePages ?? i.exclude_pages), d = i.required, p = typeof d == "boolean" ? d : !["0", "false", "off", "no"].includes(re(d).toLowerCase());
  return {
    id: re(i.id),
    type: Gs(i.type),
    participantId: n,
    participantTempId: re(i.participantTempId) || n,
    fromPage: At(i.fromPage ?? i.from_page, t),
    toPage: At(i.toPage ?? i.to_page, t),
    page: At(i.page, t),
    excludeLastPage: Vs(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: r,
    required: p
  };
}
function ba(i) {
  return {
    id: re(i.id),
    type: Gs(i.type),
    participant_id: re(i.participantId),
    from_page: At(i.fromPage, 0),
    to_page: At(i.toPage, 0),
    page: At(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: Tn(i.excludePages),
    required: i.required !== !1
  };
}
function wa(i, e) {
  const t = re(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Sa(i, e) {
  const t = ue(e, 1), n = [];
  return i.forEach((r, d) => {
    const p = ti(r || {}, t);
    if (p.type === "") return;
    const c = wa(p, d);
    if (p.type === "initials_each_page") {
      const S = va(p.fromPage, p.toPage, t), b = /* @__PURE__ */ new Set();
      Tn(p.excludePages).forEach((E) => {
        E <= t && b.add(E);
      }), p.excludeLastPage && b.add(t);
      for (let E = S.start; E <= S.end; E += 1)
        b.has(E) || n.push({
          id: `${c}-initials-${E}`,
          type: "initials",
          page: E,
          participantId: re(p.participantId),
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
        participantId: re(p.participantId),
        required: p.required !== !1,
        ruleId: c
        // Phase 3: Track rule ID for link group creation
      });
    }
  }), n.sort((r, d) => r.page !== d.page ? r.page - d.page : r.id.localeCompare(d.id)), n;
}
function xa(i, e, t, n, r) {
  const d = ue(t, 1);
  let p = i > 0 ? i : 1, c = e > 0 ? e : d;
  p = ei(p, 1, d), c = ei(c, 1, d), c < p && ([p, c] = [c, p]);
  const S = /* @__PURE__ */ new Set();
  r.forEach((E) => {
    const _ = ue(E, 0);
    _ > 0 && S.add(ei(_, 1, d));
  }), n && S.add(d);
  const b = [];
  for (let E = p; E <= c; E += 1)
    S.has(E) || b.push(E);
  return {
    pages: b,
    rangeStart: p,
    rangeEnd: c,
    excludedPages: Array.from(S).sort((E, _) => E - _),
    isEmpty: b.length === 0
  };
}
function Ia(i) {
  if (i.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = i;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let n = 0;
  for (let r = 1; r <= e.length; r += 1)
    if (r === e.length || e[r] !== e[r - 1] + 1) {
      const d = e[n], p = e[r - 1];
      d === p ? t.push(String(d)) : p === d + 1 ? t.push(`${d}, ${p}`) : t.push(`${d}-${p}`), n = r;
    }
  return `pages ${t.join(", ")}`;
}
function Fi(i) {
  const e = i || {};
  return {
    id: re(e.id),
    title: re(e.title || e.name) || "Untitled",
    pageCount: ue(e.page_count ?? e.pageCount, 0),
    compatibilityTier: re(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: re(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Ws(i) {
  const e = re(i).toLowerCase();
  if (e === "") return Ae.MANUAL;
  switch (e) {
    case Ae.AUTO:
    case Ae.MANUAL:
    case Ae.AUTO_LINKED:
    case Ae.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function ni(i, e = 0) {
  const t = i || {}, n = re(t.id) || `fi_init_${e}`, r = re(t.definitionId || t.definition_id || t.field_definition_id) || n, d = ue(t.page ?? t.page_number, 1), p = Qn(t.x ?? t.pos_x, 0), c = Qn(t.y ?? t.pos_y, 0), S = Qn(t.width, ks), b = Qn(t.height, Ps);
  return {
    id: n,
    definitionId: r,
    type: re(t.type) || "text",
    participantId: re(t.participantId || t.participant_id),
    participantName: re(t.participantName || t.participant_name) || "Unassigned",
    page: d > 0 ? d : 1,
    x: p >= 0 ? p : 0,
    y: c >= 0 ? c : 0,
    width: S > 0 ? S : ks,
    height: b > 0 ? b : Ps,
    placementSource: Ws(t.placementSource || t.placement_source),
    linkGroupId: re(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: re(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: Vs(t.isUnlinked ?? t.is_unlinked)
  };
}
function _s(i, e = 0) {
  const t = ni(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Ws(t.placementSource),
    link_group_id: re(t.linkGroupId),
    linked_from_field_id: re(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Ea(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, r = n.replace(/\/+$/, ""), d = /\/v\d+$/i.test(r) ? r : `${r}/v1`, p = `${d}/esign/drafts`, c = !!e.is_edit, S = !!e.create_success, b = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), _ = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, O = Array.isArray(e.initial_participants) ? e.initial_participants : [], R = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(o) {
    if (!b) return o;
    const s = o.includes("?") ? "&" : "?";
    return `${o}${s}user_id=${encodeURIComponent(b)}`;
  }
  function G(o = !0) {
    const s = { Accept: "application/json" };
    return o && (s["Content-Type"] = "application/json"), b && (s["X-User-ID"] = b), s;
  }
  const J = 1, Z = c ? "edit" : "create", ae = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), ve = [
    Z,
    b || "anonymous",
    ae || "agreement-form"
  ].join("|"), de = `esign_wizard_state_v1:${encodeURIComponent(ve)}`, Te = `esign_wizard_sync:${encodeURIComponent(ve)}`, Re = "esign_wizard_state_v1", Qe = 2e3, Fe = [1e3, 2e3, 5e3, 1e4, 3e4], _e = 1, Oe = `esign_wizard_active_tab_v1:${encodeURIComponent(ve)}`, ke = 5e3, rn = 2e4, oe = {
    USER: "user",
    AUTOFILL: "autofill",
    SERVER_SEED: "server_seed"
  };
  function Tt(o, s = {}) {
    const l = String(o || "").trim();
    if (!l || typeof window > "u") return;
    const m = window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {};
    m[l] = Number(m[l] || 0) + 1, window.dispatchEvent(new CustomEvent("esign:wizard-telemetry", {
      detail: {
        event: l,
        count: m[l],
        fields: s,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
  }
  function ci(o, s = 0) {
    if (!o || typeof o != "object") return !1;
    const l = String(o.name ?? "").trim(), m = String(o.email ?? "").trim(), y = String(o.role ?? "signer").trim().toLowerCase(), w = Number.parseInt(String(o.signingStage ?? o.signing_stage ?? 1), 10), L = o.notify !== !1;
    return l !== "" || m !== "" || y !== "" && y !== "signer" || Number.isFinite(w) && w > 1 || !L ? !0 : s > 0;
  }
  function kn(o) {
    if (!o || typeof o != "object") return !1;
    const s = Number.parseInt(String(o.currentStep ?? 1), 10);
    if (Number.isFinite(s) && s > 1 || String(o.document?.id ?? "").trim() !== "") return !0;
    const m = String(o.details?.title ?? "").trim(), y = String(o.details?.message ?? "").trim(), w = ot(o.titleSource, m === "" ? oe.AUTOFILL : oe.USER);
    return !!(m !== "" && w !== oe.SERVER_SEED || y !== "" || (Array.isArray(o.participants) ? o.participants : []).some((D, k) => ci(D, k)) || Array.isArray(o.fieldDefinitions) && o.fieldDefinitions.length > 0 || Array.isArray(o.fieldPlacements) && o.fieldPlacements.length > 0 || Array.isArray(o.fieldRules) && o.fieldRules.length > 0);
  }
  function ot(o, s = oe.AUTOFILL) {
    const l = String(o || "").trim().toLowerCase();
    return l === oe.USER ? oe.USER : l === oe.SERVER_SEED ? oe.SERVER_SEED : l === oe.AUTOFILL ? oe.AUTOFILL : s;
  }
  function li(o) {
    const s = Date.parse(String(o || "").trim());
    return Number.isFinite(s) ? s : 0;
  }
  let je = null;
  function Ot() {
    if (je !== null)
      return je;
    if (typeof window > "u" || !window.localStorage)
      return je = !1, je;
    try {
      const o = `${Oe}:probe`;
      window.localStorage.setItem(o, "1"), window.localStorage.removeItem(o), je = !0;
    } catch {
      je = !1;
    }
    return je;
  }
  function kt() {
    if (!Ot()) return null;
    try {
      const o = window.localStorage.getItem(Oe);
      if (!o) return null;
      const s = JSON.parse(o);
      if (!s || typeof s != "object") return null;
      const l = String(s.tabId || "").trim();
      if (!l) return null;
      const m = String(s.claimedAt || "").trim(), y = String(s.lastSeenAt || "").trim();
      return {
        tabId: l,
        claimedAt: m,
        lastSeenAt: y
      };
    } catch {
      return null;
    }
  }
  function an(o, s = Date.now()) {
    if (!o || typeof o != "object") return !1;
    const l = li(o.lastSeenAt || o.claimedAt);
    return l <= 0 ? !1 : s - l < rn;
  }
  function Pn(o) {
    if (!Ot()) return !1;
    try {
      return window.localStorage.setItem(Oe, JSON.stringify(o)), !0;
    } catch {
      return je = !1, !1;
    }
  }
  function di(o = "") {
    if (!Ot()) return !1;
    try {
      const s = kt();
      return o && s?.tabId && s.tabId !== o ? !1 : (window.localStorage.removeItem(Oe), !0);
    } catch {
      return je = !1, !1;
    }
  }
  class ui {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.migrateLegacyStateIfNeeded(), this.state = this.loadFromSession() || this.createInitialState();
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
        titleSource: oe.AUTOFILL,
        storageMigrationVersion: _e,
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
        const s = sessionStorage.getItem(de), l = sessionStorage.getItem(Re);
        if (!l) return;
        if (s) {
          sessionStorage.removeItem(Re);
          return;
        }
        const m = JSON.parse(l), y = this.normalizeLoadedState({
          ...m,
          storageMigrationVersion: _e
        });
        sessionStorage.setItem(de, JSON.stringify(y)), sessionStorage.removeItem(Re), Tt("wizard_resume_migration_used", {
          from: Re,
          to: de
        });
      } catch {
        sessionStorage.removeItem(Re);
      }
    }
    loadFromSession() {
      try {
        const s = sessionStorage.getItem(de);
        if (!s) return null;
        const l = JSON.parse(s);
        return l.version !== J ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(l)) : this.normalizeLoadedState(l);
      } catch (s) {
        return console.error("Failed to load wizard state from session:", s), null;
      }
    }
    normalizeLoadedState(s) {
      if (!s || typeof s != "object")
        return this.createInitialState();
      const l = this.createInitialState(), m = { ...l, ...s }, y = Number.parseInt(String(s.currentStep ?? l.currentStep), 10);
      m.currentStep = Number.isFinite(y) ? Math.min(Math.max(y, 1), Ct) : l.currentStep;
      const w = s.document && typeof s.document == "object" ? s.document : {}, L = w.id;
      m.document = {
        id: L == null ? null : String(L).trim() || null,
        title: String(w.title ?? "").trim() || null,
        pageCount: ue(w.pageCount, 0) || null
      };
      const T = s.details && typeof s.details == "object" ? s.details : {}, D = String(T.title ?? "").trim(), k = D === "" ? oe.AUTOFILL : oe.USER;
      m.details = {
        title: D,
        message: String(T.message ?? "")
      }, m.participants = Array.isArray(s.participants) ? s.participants : [], m.fieldDefinitions = Array.isArray(s.fieldDefinitions) ? s.fieldDefinitions : [], m.fieldPlacements = Array.isArray(s.fieldPlacements) ? s.fieldPlacements : [], m.fieldRules = Array.isArray(s.fieldRules) ? s.fieldRules : [];
      const I = String(s.wizardId ?? "").trim();
      m.wizardId = I || l.wizardId, m.version = J, m.createdAt = String(s.createdAt ?? l.createdAt), m.updatedAt = String(s.updatedAt ?? l.updatedAt), m.titleSource = ot(s.titleSource, k), m.storageMigrationVersion = ue(
        s.storageMigrationVersion,
        _e
      ) || _e;
      const U = String(s.serverDraftId ?? "").trim();
      return m.serverDraftId = U || null, m.serverRevision = ue(s.serverRevision, 0), m.lastSyncedAt = String(s.lastSyncedAt ?? "").trim() || null, m.syncPending = !!s.syncPending, m;
    }
    migrateState(s) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.storageMigrationVersion = _e, sessionStorage.setItem(de, JSON.stringify(this.state));
      } catch (s) {
        console.error("Failed to save wizard state to session:", s);
      }
    }
    getState() {
      return this.state;
    }
    setState(s, l = {}) {
      this.state = this.normalizeLoadedState(s), l.syncPending === !0 ? this.state.syncPending = !0 : l.syncPending === !1 && (this.state.syncPending = !1), l.save !== !1 && this.saveToSession(), l.notify !== !1 && this.notifyListeners();
    }
    updateState(s) {
      this.setState(
        { ...this.state, ...s, syncPending: !0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
        { syncPending: !0 }
      );
    }
    updateStep(s) {
      this.updateState({ currentStep: s });
    }
    updateDocument(s) {
      this.updateState({ document: { ...this.state.document, ...s } });
    }
    updateDetails(s, l = {}) {
      const m = {
        details: { ...this.state.details, ...s }
      };
      Object.prototype.hasOwnProperty.call(l, "titleSource") ? m.titleSource = ot(l.titleSource, this.state.titleSource) : Object.prototype.hasOwnProperty.call(s || {}, "title") && (m.titleSource = oe.USER), this.updateState(m);
    }
    setTitleSource(s, l = {}) {
      const m = ot(s, this.state.titleSource);
      if (m !== this.state.titleSource) {
        if (l.syncPending === !1) {
          this.setState({ ...this.state, titleSource: m }, { syncPending: !1 });
          return;
        }
        this.updateState({ titleSource: m });
      }
    }
    updateParticipants(s) {
      this.updateState({ participants: s });
    }
    updateFieldDefinitions(s) {
      this.updateState({ fieldDefinitions: s });
    }
    updateFieldPlacements(s) {
      this.updateState({ fieldPlacements: s });
    }
    markSynced(s, l) {
      this.setState({
        ...this.state,
        serverDraftId: s,
        serverRevision: l,
        lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
        syncPending: !1
      }, { syncPending: !1 });
    }
    applyRemoteSync(s, l, m = {}) {
      const y = this.state || this.createInitialState(), w = y.syncPending === !0, L = String(s ?? "").trim() || null, T = ue(l, 0);
      return this.setState({
        ...y,
        serverDraftId: L || y.serverDraftId,
        serverRevision: T > 0 ? T : y.serverRevision,
        lastSyncedAt: String(m.lastSyncedAt || (/* @__PURE__ */ new Date()).toISOString()).trim() || y.lastSyncedAt,
        syncPending: w
      }, {
        syncPending: w,
        save: m.save,
        notify: m.notify
      }), {
        preservedLocalChanges: w,
        state: this.state
      };
    }
    applyRemoteState(s, l = {}) {
      const m = this.normalizeLoadedState(s), y = this.state || this.createInitialState();
      return y.syncPending === !0 ? (this.setState({
        ...y,
        serverDraftId: m.serverDraftId || y.serverDraftId,
        serverRevision: Math.max(
          ue(y.serverRevision, 0),
          ue(m.serverRevision, 0)
        ),
        lastSyncedAt: m.lastSyncedAt || y.lastSyncedAt,
        syncPending: !0
      }, {
        syncPending: !0,
        save: l.save,
        notify: l.notify
      }), {
        preservedLocalChanges: !0,
        replacedLocalState: !1,
        state: this.state
      }) : (this.setState(m, {
        syncPending: !!m.syncPending,
        save: l.save,
        notify: l.notify
      }), {
        preservedLocalChanges: !1,
        replacedLocalState: !0,
        state: this.state
      });
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(de), sessionStorage.removeItem(Re), this.notifyListeners();
    }
    hasResumableState() {
      return kn(this.state);
    }
    onStateChange(s) {
      return this.listeners.push(s), () => {
        this.listeners = this.listeners.filter((l) => l !== s);
      };
    }
    notifyListeners() {
      this.listeners.forEach((s) => s(this.state));
    }
    collectFormState() {
      const s = document.getElementById("document_id")?.value || null, l = document.getElementById("selected-document-title")?.textContent?.trim() || null, m = document.getElementById("title"), y = document.getElementById("message"), w = ot(
        this.state?.titleSource,
        String(m?.value || "").trim() === "" ? oe.AUTOFILL : oe.USER
      ), L = [];
      document.querySelectorAll(".participant-entry").forEach((I) => {
        const U = I.getAttribute("data-participant-id"), H = I.querySelector('input[name*=".name"]')?.value || "", V = I.querySelector('input[name*=".email"]')?.value || "", q = I.querySelector('select[name*=".role"]')?.value || "signer", z = parseInt(I.querySelector(".signing-stage-input")?.value || "1", 10), X = I.querySelector(".notify-input")?.checked !== !1;
        L.push({ tempId: U, name: H, email: V, role: q, notify: X, signingStage: z });
      });
      const T = [];
      document.querySelectorAll(".field-definition-entry").forEach((I) => {
        const U = I.getAttribute("data-field-definition-id"), H = I.querySelector(".field-type-select")?.value || "signature", V = I.querySelector(".field-participant-select")?.value || "", q = parseInt(I.querySelector('input[name*=".page"]')?.value || "1", 10), z = I.querySelector('input[name*=".required"]')?.checked ?? !0;
        T.push({ tempId: U, type: H, participantTempId: V, page: q, required: z });
      });
      const D = St(), k = parseInt(et?.value || "0", 10) || null;
      return {
        document: { id: s, title: l, pageCount: k },
        details: {
          title: m?.value || "",
          message: y?.value || ""
        },
        titleSource: w,
        participants: L,
        fieldDefinitions: T,
        fieldPlacements: A?.fieldInstances || [],
        fieldRules: D
      };
    }
    restoreFormState() {
      const s = this.state;
      if (!s) return;
      if (s.document.id) {
        const y = document.getElementById("document_id"), w = document.getElementById("selected-document"), L = document.getElementById("document-picker"), T = document.getElementById("selected-document-title"), D = document.getElementById("selected-document-info");
        y && (y.value = s.document.id), T && (T.textContent = s.document.title || "Selected Document"), D && (D.textContent = s.document.pageCount ? `${s.document.pageCount} pages` : ""), et && s.document.pageCount && (et.value = String(s.document.pageCount)), w && w.classList.remove("hidden"), L && L.classList.add("hidden");
      }
      const l = document.getElementById("title"), m = document.getElementById("message");
      l && (l.value = s.details.title || ""), m && (m.value = s.details.message || "");
    }
  }
  class pi {
    constructor(s) {
      this.stateManager = s, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(s) {
      const l = {
        wizard_id: s.wizardId,
        wizard_state: s,
        title: s.details.title || "Untitled Agreement",
        current_step: s.currentStep,
        document_id: s.document.id || null,
        created_by_user_id: b
      }, m = await fetch(B(p), {
        method: "POST",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(l)
      });
      if (!m.ok) {
        const y = await m.json().catch(() => ({}));
        throw new Error(y.error?.message || `HTTP ${m.status}`);
      }
      return m.json();
    }
    async update(s, l, m) {
      const y = {
        expected_revision: m,
        wizard_state: l,
        title: l.details.title || "Untitled Agreement",
        current_step: l.currentStep,
        document_id: l.document.id || null,
        updated_by_user_id: b
      }, w = await fetch(B(`${p}/${s}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(y)
      });
      if (w.status === 409) {
        const L = await w.json().catch(() => ({})), T = new Error("stale_revision");
        throw T.code = "stale_revision", T.currentRevision = L.error?.details?.current_revision, T;
      }
      if (!w.ok) {
        const L = await w.json().catch(() => ({}));
        throw new Error(L.error?.message || `HTTP ${w.status}`);
      }
      return w.json();
    }
    async load(s) {
      const l = await fetch(B(`${p}/${s}`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!l.ok) {
        const m = new Error(`HTTP ${l.status}`);
        throw m.status = l.status, m;
      }
      return l.json();
    }
    async delete(s) {
      const l = await fetch(B(`${p}/${s}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!l.ok && l.status !== 404)
        throw new Error(`HTTP ${l.status}`);
    }
    async list() {
      const s = await fetch(B(`${p}?limit=10`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!s.ok)
        throw new Error(`HTTP ${s.status}`);
      return s.json();
    }
    async sync() {
      const s = this.stateManager.getState();
      if (s.syncPending)
        try {
          let l;
          return s.serverDraftId ? l = await this.update(s.serverDraftId, s, s.serverRevision) : l = await this.create(s), this.stateManager.markSynced(l.id, l.revision), this.retryCount = 0, { success: !0, result: l };
        } catch (l) {
          return l.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: l.currentRevision } : { success: !1, error: l.message };
        }
    }
  }
  class _n {
    constructor(s, l, m) {
      this.stateManager = s, this.syncService = l, this.statusUpdater = m, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !1, this.currentClaim = null, this.heartbeatTimer = null, this.lastBlockedReason = "", this.activeTabCoordinationAvailable = Ot(), this.initBroadcastChannel(), this.initEventListeners(), this.activeTabCoordinationAvailable ? this.evaluateActiveTabOwnership("startup", { allowClaimIfAvailable: !0 }) : this.updateOwnershipState(!0, "storage_unavailable", null);
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(Te), this.channel.onmessage = (s) => this.handleChannelMessage(s.data);
        } catch (s) {
          console.warn("BroadcastChannel not available:", s);
        }
    }
    getTabId() {
      return window._wizardTabId || (window._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`), window._wizardTabId;
    }
    broadcastMessage(s) {
      this.channel?.postMessage(s);
    }
    isClaimOwnedByThisTab(s) {
      return String(s?.tabId || "").trim() === this.getTabId();
    }
    buildActiveTabClaim(s = null) {
      const l = (/* @__PURE__ */ new Date()).toISOString();
      return {
        tabId: this.getTabId(),
        claimedAt: this.isClaimOwnedByThisTab(s) && String(s?.claimedAt || l).trim() || l,
        lastSeenAt: l
      };
    }
    startHeartbeat() {
      this.stopHeartbeat(), !(!this.isOwner || !this.activeTabCoordinationAvailable) && (this.heartbeatTimer = window.setInterval(() => {
        this.refreshActiveTabClaim("heartbeat");
      }, ke));
    }
    stopHeartbeat() {
      this.heartbeatTimer && (window.clearInterval(this.heartbeatTimer), this.heartbeatTimer = null);
    }
    updateOwnershipState(s, l = "", m = null) {
      this.isOwner = !!s, this.currentClaim = this.activeTabCoordinationAvailable && m || null, this.lastBlockedReason = this.isOwner ? "" : String(l || "passive_tab").trim() || "passive_tab", this.isOwner && this.activeTabCoordinationAvailable ? this.startHeartbeat() : (this.stopHeartbeat(), this.isOwner || this.statusUpdater("paused")), Kn({
        isOwner: this.isOwner,
        reason: this.lastBlockedReason,
        claim: this.currentClaim,
        coordinationAvailable: this.activeTabCoordinationAvailable
      });
    }
    enterDegradedOwnershipMode(s = "storage_unavailable") {
      return this.activeTabCoordinationAvailable ? (this.activeTabCoordinationAvailable = !1, Tt("wizard_active_tab_coordination_degraded", { reason: s }), this.updateOwnershipState(!0, s, null), !0) : (this.updateOwnershipState(!0, s, null), !0);
    }
    refreshActiveTabClaim(s = "heartbeat") {
      if (!this.activeTabCoordinationAvailable) return !0;
      if (!this.isOwner) return !1;
      const l = kt();
      if (l && !this.isClaimOwnedByThisTab(l) && an(l))
        return this.updateOwnershipState(!1, "passive_tab", l), !1;
      const m = this.buildActiveTabClaim(l);
      return Pn(m) ? (this.currentClaim = m, s !== "heartbeat" && (this.broadcastMessage({
        type: "active_tab_claimed",
        tabId: m.tabId,
        claimedAt: m.claimedAt,
        lastSeenAt: m.lastSeenAt,
        reason: s
      }), Kn({
        isOwner: !0,
        claim: m
      })), !0) : this.enterDegradedOwnershipMode("storage_unavailable");
    }
    claimActiveTab(s = "claim") {
      if (!this.activeTabCoordinationAvailable)
        return this.updateOwnershipState(!0, s, null), !0;
      const l = kt();
      if (l && !this.isClaimOwnedByThisTab(l) && an(l) && s !== "take_control")
        return this.updateOwnershipState(!1, "passive_tab", l), !1;
      const y = this.buildActiveTabClaim(s === "take_control" ? null : l);
      return Pn(y) ? (this.updateOwnershipState(!0, s, y), this.broadcastMessage({
        type: "active_tab_claimed",
        tabId: y.tabId,
        claimedAt: y.claimedAt,
        lastSeenAt: y.lastSeenAt,
        reason: s
      }), !0) : this.enterDegradedOwnershipMode("storage_unavailable");
    }
    releaseActiveTab(s = "release") {
      if (!this.activeTabCoordinationAvailable) return;
      const l = kt();
      this.isClaimOwnedByThisTab(l) && (di(this.getTabId()), this.broadcastMessage({
        type: "active_tab_released",
        tabId: this.getTabId(),
        reason: s
      })), this.updateOwnershipState(!1, s, null);
    }
    evaluateActiveTabOwnership(s = "check", l = {}) {
      if (!this.activeTabCoordinationAvailable)
        return this.updateOwnershipState(!0, s, null), !0;
      const m = l?.allowClaimIfAvailable === !0, y = typeof document > "u" || document.visibilityState !== "hidden", w = kt();
      return !w || !an(w) ? m && y ? this.claimActiveTab(s) : (this.updateOwnershipState(!1, "no_active_tab", null), !1) : this.isClaimOwnedByThisTab(w) ? (this.updateOwnershipState(!0, s, w), this.refreshActiveTabClaim("heartbeat"), !0) : (this.updateOwnershipState(!1, "passive_tab", w), !1);
    }
    ensureActiveTabOwnership(s = "sync", l = {}) {
      return this.activeTabCoordinationAvailable ? this.evaluateActiveTabOwnership(s, {
        allowClaimIfAvailable: l?.allowClaimIfAvailable !== !1
      }) : !0;
    }
    takeControl() {
      return this.activeTabCoordinationAvailable ? this.claimActiveTab("take_control") : (this.updateOwnershipState(!0, "take_control", null), !0);
    }
    handleChannelMessage(s) {
      switch (s.type) {
        case "active_tab_claimed":
          s.tabId !== this.getTabId() && this.evaluateActiveTabOwnership("remote_claim", { allowClaimIfAvailable: !1 });
          break;
        case "active_tab_released":
          s.tabId !== this.getTabId() && this.evaluateActiveTabOwnership("remote_release", {
            allowClaimIfAvailable: typeof document < "u" && document.visibilityState !== "hidden"
          });
          break;
        case "state_updated":
          s.tabId !== this.getTabId() && s.state && typeof s.state == "object" && (this.stateManager.applyRemoteState(s.state, {
            save: !0,
            notify: !1
          }).replacedLocalState ? Mn({}).then(() => {
            this.stateManager.notifyListeners();
          }) : this.stateManager.notifyListeners());
          break;
        case "sync_completed":
          s.tabId !== this.getTabId() && s.draftId && s.revision && this.stateManager.applyRemoteSync(s.draftId, s.revision, {
            save: !0,
            notify: !0
          });
          break;
      }
    }
    broadcastStateUpdate() {
      this.broadcastMessage({
        type: "state_updated",
        tabId: this.getTabId(),
        state: this.stateManager.getState()
      });
    }
    broadcastSyncCompleted(s, l) {
      this.broadcastMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: s,
        revision: l
      });
    }
    initEventListeners() {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.isOwner && this.forceSync({ keepalive: !0 });
          return;
        }
        this.evaluateActiveTabOwnership("visible", { allowClaimIfAvailable: !0 });
      }), window.addEventListener("pagehide", () => {
        this.isOwner && this.forceSync({ keepalive: !0 }), this.releaseActiveTab("pagehide");
      }), window.addEventListener("beforeunload", () => {
        this.isOwner && this.forceSync({ keepalive: !0 }), this.releaseActiveTab("beforeunload");
      }), window.addEventListener("storage", (s) => {
        !this.activeTabCoordinationAvailable || s.key !== Oe || this.evaluateActiveTabOwnership("storage", {
          allowClaimIfAvailable: typeof document < "u" && document.visibilityState !== "hidden"
        });
      });
    }
    scheduleSync() {
      if (!this.ensureActiveTabOwnership("schedule_sync", { allowClaimIfAvailable: !1 })) {
        this.statusUpdater("paused");
        return;
      }
      this.debounceTimer && clearTimeout(this.debounceTimer), this.statusUpdater("pending"), this.debounceTimer = setTimeout(() => {
        this.performSync();
      }, Qe);
    }
    async forceSync(s = {}) {
      this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
      const l = s && s.keepalive === !0;
      if (!this.ensureActiveTabOwnership(l ? "keepalive_sync" : "force_sync", { allowClaimIfAvailable: !0 }))
        return { blocked: !0, reason: "passive_tab" };
      const m = this.stateManager.getState();
      if (!l)
        return this.performSync();
      if (m.syncPending && m.serverDraftId) {
        const y = JSON.stringify({
          expected_revision: m.serverRevision,
          wizard_state: m,
          title: m.details.title || "Untitled Agreement",
          current_step: m.currentStep,
          document_id: m.document.id || null,
          updated_by_user_id: b
        });
        try {
          const w = await fetch(B(`${p}/${m.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: G(),
            body: y,
            keepalive: !0
          });
          if (w.status === 409) {
            const k = await w.json().catch(() => ({})), I = Number(k?.error?.details?.current_revision || 0);
            return this.statusUpdater("conflict"), this.showConflictDialog(I > 0 ? I : m.serverRevision), { conflict: !0 };
          }
          if (!w.ok)
            throw new Error(`HTTP ${w.status}`);
          const L = await w.json().catch(() => ({})), T = String(L?.id || L?.draft_id || m.serverDraftId || "").trim(), D = Number(L?.revision || 0);
          if (T && Number.isFinite(D) && D > 0)
            return this.stateManager.markSynced(T, D), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(T, D), { success: !0, draftId: T, revision: D };
        } catch {
        }
      }
      return this.performSync();
    }
    async performSync() {
      if (this.isSyncing) return { blocked: !0, reason: "sync_in_progress" };
      if (!this.ensureActiveTabOwnership("perform_sync", { allowClaimIfAvailable: !0 }))
        return { blocked: !0, reason: "passive_tab" };
      if (!this.stateManager.getState().syncPending)
        return this.statusUpdater("saved"), { skipped: !0, reason: "not_pending" };
      this.isSyncing = !0, this.statusUpdater("saving");
      const l = await this.syncService.sync();
      return this.isSyncing = !1, l.success ? (this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(l.result.id, l.result.revision), { success: !0, draftId: l.result.id, revision: l.result.revision }) : l.conflict ? (this.statusUpdater("conflict"), this.showConflictDialog(l.currentRevision), { conflict: !0, currentRevision: l.currentRevision }) : (this.statusUpdater("error"), this.scheduleRetry(), { error: !0, reason: l.error || "sync_failed" });
    }
    scheduleRetry() {
      if (!this.isOwner) return;
      if (this.retryCount >= Fe.length) {
        console.error("Max sync retries reached");
        return;
      }
      const s = Fe[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, s);
    }
    manualRetry() {
      return this.ensureActiveTabOwnership("manual_retry", { allowClaimIfAvailable: !0 }) ? (this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync()) : { blocked: !0, reason: "passive_tab" };
    }
    showConflictDialog(s) {
      const l = document.getElementById("conflict-dialog-modal"), m = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = Ut(m.updatedAt), document.getElementById("conflict-server-revision").textContent = s, document.getElementById("conflict-server-time").textContent = "newer version", l?.classList.remove("hidden");
    }
  }
  function Ut(o) {
    if (!o) return "unknown";
    const s = new Date(o), m = /* @__PURE__ */ new Date() - s, y = Math.floor(m / 6e4), w = Math.floor(m / 36e5), L = Math.floor(m / 864e5);
    return y < 1 ? "just now" : y < 60 ? `${y} minute${y !== 1 ? "s" : ""} ago` : w < 24 ? `${w} hour${w !== 1 ? "s" : ""} ago` : L < 7 ? `${L} day${L !== 1 ? "s" : ""} ago` : s.toLocaleDateString();
  }
  function Dn(o) {
    const s = document.getElementById("sync-status-indicator"), l = document.getElementById("sync-status-icon"), m = document.getElementById("sync-status-text"), y = document.getElementById("sync-retry-btn");
    if (!(!s || !l || !m))
      switch (s.classList.remove("hidden"), o) {
        case "saved":
          l.className = "w-2 h-2 rounded-full bg-green-500", m.textContent = "Saved", m.className = "text-gray-600", y?.classList.add("hidden");
          break;
        case "saving":
          l.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", m.textContent = "Saving...", m.className = "text-gray-600", y?.classList.add("hidden");
          break;
        case "pending":
          l.className = "w-2 h-2 rounded-full bg-gray-400", m.textContent = "Unsaved changes", m.className = "text-gray-500", y?.classList.add("hidden");
          break;
        case "error":
          l.className = "w-2 h-2 rounded-full bg-amber-500", m.textContent = "Not synced", m.className = "text-amber-600", y?.classList.remove("hidden");
          break;
        case "paused":
          l.className = "w-2 h-2 rounded-full bg-slate-400", m.textContent = "Open in another tab", m.className = "text-slate-600", y?.classList.add("hidden");
          break;
        case "conflict":
          l.className = "w-2 h-2 rounded-full bg-red-500", m.textContent = "Conflict", m.className = "text-red-600", y?.classList.add("hidden");
          break;
        default:
          s.classList.add("hidden");
      }
  }
  const N = new ui(), Ze = new pi(N), ge = new _n(N, Ze, Dn), mt = pa({
    apiBasePath: d,
    basePath: t
  });
  if (S) {
    const s = N.getState()?.serverDraftId;
    N.clear(), ge.broadcastStateUpdate(), s && Ze.delete(s).catch((l) => {
      console.warn("Failed to delete server draft after successful create:", l);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
    await Li(ge.manualRetry(), {
      errorMessage: "Unable to sync latest draft changes. Please try again."
    });
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const o = N.getState();
    if (o.serverDraftId)
      try {
        const s = await Ze.load(o.serverDraftId);
        s.wizard_state && (N.setState({
          ...s.wizard_state,
          serverDraftId: s.id,
          serverRevision: s.revision,
          syncPending: !1
        }, { syncPending: !1 }), window.location.reload());
      } catch (s) {
        console.error("Failed to load server draft:", s);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const o = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    N.setState({
      ...N.getState(),
      serverRevision: o,
      syncPending: !0
    }, { syncPending: !0 });
    const s = await Li(ge.performSync(), {
      errorMessage: "Unable to sync latest draft changes. Please try again."
    });
    (s?.success || s?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function gi(o, s) {
    return N.normalizeLoadedState({
      ...s,
      currentStep: o.currentStep,
      document: o.document,
      details: o.details,
      participants: o.participants,
      fieldDefinitions: o.fieldDefinitions,
      fieldPlacements: o.fieldPlacements,
      fieldRules: o.fieldRules,
      titleSource: o.titleSource,
      syncPending: !0,
      serverDraftId: s.serverDraftId,
      serverRevision: s.serverRevision,
      lastSyncedAt: s.lastSyncedAt
    });
  }
  async function Mn(o = {}) {
    if (c) return N.getState();
    const s = N.normalizeLoadedState(N.getState()), l = String(s?.serverDraftId || "").trim();
    if (!l)
      return N.setState(s, { syncPending: !!s.syncPending, notify: !1 }), N.getState();
    try {
      const m = await Ze.load(l), y = N.normalizeLoadedState({
        ...m?.wizard_state && typeof m.wizard_state == "object" ? m.wizard_state : {},
        serverDraftId: String(m?.id || l).trim() || l,
        serverRevision: Number(m?.revision || 0),
        lastSyncedAt: String(m?.updated_at || m?.updatedAt || "").trim() || s.lastSyncedAt,
        syncPending: !1
      }), L = String(s.serverDraftId || "").trim() === String(y.serverDraftId || "").trim() && s.syncPending === !0 ? gi(s, y) : y;
      return N.setState(L, { syncPending: !!L.syncPending, notify: !1 }), N.getState();
    } catch (m) {
      if (Number(m?.status || 0) === 404) {
        const y = N.normalizeLoadedState({
          ...s,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return N.setState(y, { syncPending: !!y.syncPending, notify: !1 }), N.getState();
      }
      return N.getState();
    }
  }
  function Nt() {
    const o = document.getElementById("resume-dialog-modal"), s = N.getState(), l = String(s?.document?.title || "").trim() || String(s?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = s.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = l, document.getElementById("resume-draft-step").textContent = s.currentStep, document.getElementById("resume-draft-time").textContent = Ut(s.updatedAt), o?.classList.remove("hidden"), Tt("wizard_resume_prompt_shown", {
      step: Number(s.currentStep || 1),
      has_server_draft: !!s.serverDraftId
    });
  }
  async function Pt(o = {}) {
    const s = o.deleteServerDraft === !0, l = String(N.getState()?.serverDraftId || "").trim();
    if (N.clear(), ge.broadcastStateUpdate(), !(!s || !l))
      try {
        await Ze.delete(l);
      } catch (m) {
        console.warn("Failed to delete server draft:", m);
      }
  }
  function mi() {
    return N.normalizeLoadedState({
      ...N.getState(),
      ...N.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function ct(o) {
    kn(o) && (N.setState(o, { syncPending: !0 }), ge.scheduleSync(), ge.broadcastStateUpdate());
  }
  async function Ht(o) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const s = mi();
    switch (o) {
      case "continue":
        N.restoreFormState(), window._resumeToStep = N.getState().currentStep;
        return;
      case "start_new":
        await Pt({ deleteServerDraft: !1 }), ct(s);
        return;
      case "proceed":
        await Pt({ deleteServerDraft: !0 }), ct(s);
        return;
      case "discard":
        await Pt({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    Ht("continue");
  }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
    Ht("proceed");
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    Ht("start_new");
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
    Ht("discard");
  });
  async function $n() {
    c || (await Mn({}), N.hasResumableState() && Nt());
  }
  $n();
  function _t() {
    const o = N.collectFormState();
    N.updateState(o), ge.scheduleSync(), ge.broadcastStateUpdate();
  }
  const Se = document.getElementById("document_id"), ze = document.getElementById("selected-document"), Ve = document.getElementById("document-picker"), xe = document.getElementById("document-search"), ht = document.getElementById("document-list"), on = document.getElementById("change-document-btn"), Ge = document.getElementById("selected-document-title"), lt = document.getElementById("selected-document-info"), et = document.getElementById("document_page_count"), qt = document.getElementById("document-remediation-panel"), jt = document.getElementById("document-remediation-message"), We = document.getElementById("document-remediation-status"), Pe = document.getElementById("document-remediation-trigger-btn"), cn = document.getElementById("document-remediation-dismiss-btn"), Bn = document.getElementById("title");
  !c && Bn && Bn.value.trim() !== "" && !N.hasResumableState() && N.setTitleSource(oe.SERVER_SEED, { syncPending: !1 });
  let ft = [], Dt = null;
  const ln = /* @__PURE__ */ new Set(), zt = /* @__PURE__ */ new Map();
  function dt(o) {
    return String(o || "").trim().toLowerCase();
  }
  function Je(o) {
    return String(o || "").trim().toLowerCase();
  }
  function yt(o) {
    return dt(o) === "unsupported";
  }
  function vt() {
    Se && (Se.value = ""), Ge && (Ge.textContent = ""), lt && (lt.textContent = ""), De(0), N.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), mt.setDocument(null, null, null);
  }
  function Vt(o = "") {
    const s = "This document cannot be used because its PDF is incompatible with online signing.", l = Je(o);
    return l ? `${s} Reason: ${l}. Select another document or upload a remediated PDF.` : `${s} Select another document or upload a remediated PDF.`;
  }
  function bt() {
    Dt = null, We && (We.textContent = "", We.className = "mt-2 text-xs text-amber-800"), qt && qt.classList.add("hidden"), Pe && (Pe.disabled = !1, Pe.textContent = "Remediate PDF");
  }
  function Ue(o, s = "info") {
    if (!We) return;
    const l = String(o || "").trim();
    We.textContent = l;
    const m = s === "error" ? "text-red-700" : s === "success" ? "text-green-700" : "text-amber-800";
    We.className = `mt-2 text-xs ${m}`;
  }
  function dn(o, s = "") {
    !o || !qt || !jt || (Dt = {
      id: String(o.id || "").trim(),
      title: String(o.title || "").trim(),
      pageCount: ue(o.pageCount, 0),
      compatibilityReason: Je(s || o.compatibilityReason || "")
    }, Dt.id && (jt.textContent = Vt(Dt.compatibilityReason), Ue("Run remediation to make this document signable."), qt.classList.remove("hidden")));
  }
  function un(o, s, l) {
    Se.value = o, Ge.textContent = s || "", lt.textContent = `${l} pages`, De(l), ze.classList.remove("hidden"), Ve.classList.add("hidden"), xt(), fi(s);
    const m = ue(l, 0);
    N.updateDocument({
      id: o,
      title: s,
      pageCount: m
    }), mt.setDocument(o, s, m), bt();
  }
  async function pn(o, s, l) {
    const m = String(o || "").trim();
    if (!m) return;
    const y = Date.now(), w = 12e4, L = 1250;
    for (; Date.now() - y < w; ) {
      const T = await fetch(m, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!T.ok)
        throw await In(T, "Failed to read remediation status");
      const k = (await T.json())?.dispatch || {}, I = String(k?.status || "").trim().toLowerCase();
      if (I === "succeeded") {
        Ue("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (I === "failed" || I === "canceled" || I === "dead_letter") {
        const H = String(k?.terminal_reason || "").trim();
        throw { message: H ? `Remediation failed: ${H}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      Ue(I === "retrying" ? "Remediation is retrying in the queue..." : I === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((H) => setTimeout(H, L));
    }
    throw { message: `Timed out waiting for remediation dispatch ${s} (${l})`, code: "REMEDIATION_TIMEOUT", status: 504 };
  }
  async function gn() {
    const o = Dt;
    if (!o || !o.id) return;
    const s = String(o.id || "").trim();
    if (!(!s || ln.has(s))) {
      ln.add(s), Pe && (Pe.disabled = !0, Pe.textContent = "Remediating...");
      try {
        let l = zt.get(s) || "";
        l || (l = `esign-remediate-${s}-${Date.now()}`, zt.set(s, l));
        const m = `${d}/esign/documents/${encodeURIComponent(s)}/remediate`, y = await fetch(m, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": l
          }
        });
        if (!y.ok)
          throw await In(y, "Failed to trigger remediation");
        const w = await y.json(), L = w?.receipt || {}, T = String(L?.dispatch_id || w?.dispatch_id || "").trim(), D = String(L?.mode || w?.mode || "").trim().toLowerCase();
        let k = String(w?.dispatch_status_url || "").trim();
        !k && T && (k = `${d}/esign/dispatches/${encodeURIComponent(T)}`), D === "queued" && T && k && (Ue("Remediation queued. Monitoring progress..."), await pn(k, T, s)), await tt();
        const I = Rn(s);
        if (!I || yt(I.compatibilityTier)) {
          Ue("Remediation finished, but this PDF is still incompatible.", "error"), fe("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        un(I.id, I.title, I.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : Qt("Document remediated successfully. You can continue.", "success");
      } catch (l) {
        Ue(String(l?.message || "Remediation failed").trim(), "error"), fe(l?.message || "Failed to remediate document", l?.code || "", l?.status || 0);
      } finally {
        ln.delete(s), Pe && (Pe.disabled = !1, Pe.textContent = "Remediate PDF");
      }
    }
  }
  function Rn(o) {
    const s = String(o || "").trim();
    if (s === "") return null;
    const l = ft.find((w) => String(w.id || "").trim() === s);
    if (l) return l;
    const m = j.recentDocuments.find((w) => String(w.id || "").trim() === s);
    if (m) return m;
    const y = j.searchResults.find((w) => String(w.id || "").trim() === s);
    return y || null;
  }
  function Gt() {
    const o = Rn(Se?.value || "");
    if (!o) return !0;
    const s = dt(o.compatibilityTier);
    return yt(s) ? (dn(o, o.compatibilityReason || ""), vt(), fe(Vt(o.compatibilityReason || "")), ze && ze.classList.add("hidden"), Ve && Ve.classList.remove("hidden"), xe?.focus(), !1) : (bt(), !0);
  }
  function De(o) {
    const s = ue(o, 0);
    et && (et.value = String(s));
  }
  function hi() {
    const o = (Se?.value || "").trim();
    if (!o) return;
    const s = ft.find((l) => String(l.id || "").trim() === o);
    s && (Ge.textContent.trim() || (Ge.textContent = s.title || "Untitled"), (!lt.textContent.trim() || lt.textContent.trim() === "pages") && (lt.textContent = `${s.pageCount || 0} pages`), De(s.pageCount || 0), ze.classList.remove("hidden"), Ve.classList.add("hidden"));
  }
  async function tt() {
    try {
      const o = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), s = await fetch(`${n}/panels/esign_documents?${o.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!s.ok)
        throw await In(s, "Failed to load documents");
      const l = await s.json();
      ft = (Array.isArray(l?.records) ? l.records : Array.isArray(l?.items) ? l.items : []).slice().sort((w, L) => {
        const T = Date.parse(String(
          w?.created_at ?? w?.createdAt ?? w?.updated_at ?? w?.updatedAt ?? ""
        )), D = Date.parse(String(
          L?.created_at ?? L?.createdAt ?? L?.updated_at ?? L?.updatedAt ?? ""
        )), k = Number.isFinite(T) ? T : 0;
        return (Number.isFinite(D) ? D : 0) - k;
      }).map((w) => Fi(w)).filter((w) => w.id !== ""), mn(ft), hi();
    } catch (o) {
      const s = xn(o?.message || "Failed to load documents", o?.code || "", o?.status || 0);
      ht.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${me(s)}</div>`;
    }
  }
  function mn(o) {
    if (o.length === 0) {
      ht.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${me(_)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    ht.innerHTML = o.map((l, m) => {
      const y = me(String(l.id || "").trim()), w = me(String(l.title || "").trim()), L = String(ue(l.pageCount, 0)), T = dt(l.compatibilityTier), D = Je(l.compatibilityReason), k = me(T), I = me(D), H = yt(T) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${m === 0 ? "0" : "-1"}"
              data-document-id="${y}"
              data-document-title="${w}"
              data-document-pages="${L}"
              data-document-compatibility-tier="${k}"
              data-document-compatibility-reason="${I}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${w}</div>
          <div class="text-xs text-gray-500">${L} pages ${H}</div>
        </div>
      </button>
    `;
    }).join("");
    const s = ht.querySelectorAll(".document-option");
    s.forEach((l, m) => {
      l.addEventListener("click", () => Fn(l)), l.addEventListener("keydown", (y) => {
        let w = m;
        if (y.key === "ArrowDown")
          y.preventDefault(), w = Math.min(m + 1, s.length - 1);
        else if (y.key === "ArrowUp")
          y.preventDefault(), w = Math.max(m - 1, 0);
        else if (y.key === "Enter" || y.key === " ") {
          y.preventDefault(), Fn(l);
          return;
        } else y.key === "Home" ? (y.preventDefault(), w = 0) : y.key === "End" && (y.preventDefault(), w = s.length - 1);
        w !== m && (s[w].focus(), s[w].setAttribute("tabindex", "0"), l.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Fn(o) {
    const s = o.getAttribute("data-document-id"), l = o.getAttribute("data-document-title"), m = o.getAttribute("data-document-pages"), y = dt(
      o.getAttribute("data-document-compatibility-tier")
    ), w = Je(
      o.getAttribute("data-document-compatibility-reason")
    );
    if (yt(y)) {
      dn({ id: s, title: l, pageCount: m, compatibilityReason: w }), vt(), fe(Vt(w)), xe?.focus();
      return;
    }
    un(s, l, m);
  }
  function fi(o) {
    const s = document.getElementById("title");
    if (!s) return;
    const l = N.getState(), m = s.value.trim(), y = ot(
      l?.titleSource,
      m === "" ? oe.AUTOFILL : oe.USER
    );
    if (m && y === oe.USER)
      return;
    const w = String(o || "").trim();
    w && (s.value = w, N.updateDetails({
      title: w,
      message: N.getState().details.message || ""
    }, { titleSource: oe.AUTOFILL }));
  }
  function me(o) {
    const s = document.createElement("div");
    return s.textContent = o, s.innerHTML;
  }
  on && on.addEventListener("click", () => {
    ze.classList.add("hidden"), Ve.classList.remove("hidden"), bt(), xe?.focus(), Ne();
  }), Pe && Pe.addEventListener("click", () => {
    gn();
  }), cn && cn.addEventListener("click", () => {
    bt(), xe?.focus();
  });
  const hn = 300, fn = 5, On = 10, Un = document.getElementById("document-typeahead"), nt = document.getElementById("document-typeahead-dropdown"), Ye = document.getElementById("document-recent-section"), yi = document.getElementById("document-recent-list"), Wt = document.getElementById("document-search-section"), Nn = document.getElementById("document-search-list"), ut = document.getElementById("document-empty-state"), yn = document.getElementById("document-dropdown-loading"), Jt = document.getElementById("document-search-loading"), j = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let vn = 0, pt = null;
  function Hn(o, s) {
    let l = null;
    return (...m) => {
      l !== null && clearTimeout(l), l = setTimeout(() => {
        o(...m), l = null;
      }, s);
    };
  }
  async function vi() {
    try {
      const o = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(fn)
      });
      b && o.set("created_by_user_id", b);
      const s = await fetch(`${n}/panels/esign_documents?${o}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!s.ok) {
        console.warn("Failed to load recent documents:", s.status);
        return;
      }
      const l = await s.json(), m = Array.isArray(l?.records) ? l.records : Array.isArray(l?.items) ? l.items : [];
      j.recentDocuments = m.map((y) => Fi(y)).filter((y) => y.id !== "").slice(0, fn);
    } catch (o) {
      console.warn("Error loading recent documents:", o);
    }
  }
  async function bi(o) {
    const s = o.trim();
    if (!s) {
      pt && (pt.abort(), pt = null), j.isSearchMode = !1, j.searchResults = [], Le();
      return;
    }
    const l = ++vn;
    pt && pt.abort(), pt = new AbortController(), j.isLoading = !0, j.isSearchMode = !0, Le();
    try {
      const m = new URLSearchParams({
        q: s,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(On)
      }), y = await fetch(`${n}/panels/esign_documents?${m}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: pt.signal
      });
      if (l !== vn)
        return;
      if (!y.ok) {
        console.warn("Failed to search documents:", y.status), j.searchResults = [], j.isLoading = !1, Le();
        return;
      }
      const w = await y.json(), L = Array.isArray(w?.records) ? w.records : Array.isArray(w?.items) ? w.items : [];
      j.searchResults = L.map((T) => Fi(T)).filter((T) => T.id !== "").slice(0, On);
    } catch (m) {
      if (m?.name === "AbortError")
        return;
      console.warn("Error searching documents:", m), j.searchResults = [];
    } finally {
      l === vn && (j.isLoading = !1, Le());
    }
  }
  const wi = Hn(bi, hn);
  function Ne() {
    nt && (j.isOpen = !0, j.selectedIndex = -1, nt.classList.remove("hidden"), xe?.setAttribute("aria-expanded", "true"), ht?.classList.add("hidden"), Le());
  }
  function he() {
    nt && (j.isOpen = !1, j.selectedIndex = -1, nt.classList.add("hidden"), xe?.setAttribute("aria-expanded", "false"), ht?.classList.remove("hidden"));
  }
  function Le() {
    if (nt) {
      if (j.isLoading) {
        yn?.classList.remove("hidden"), Ye?.classList.add("hidden"), Wt?.classList.add("hidden"), ut?.classList.add("hidden"), Jt?.classList.remove("hidden");
        return;
      }
      yn?.classList.add("hidden"), Jt?.classList.add("hidden"), j.isSearchMode ? (Ye?.classList.add("hidden"), j.searchResults.length > 0 ? (Wt?.classList.remove("hidden"), ut?.classList.add("hidden"), Yt(Nn, j.searchResults, "search")) : (Wt?.classList.add("hidden"), ut?.classList.remove("hidden"))) : (Wt?.classList.add("hidden"), j.recentDocuments.length > 0 ? (Ye?.classList.remove("hidden"), ut?.classList.add("hidden"), Yt(yi, j.recentDocuments, "recent")) : (Ye?.classList.add("hidden"), ut?.classList.remove("hidden"), ut && (ut.textContent = "No recent documents")));
    }
  }
  function Yt(o, s, l) {
    o && (o.innerHTML = s.map((m, y) => {
      const w = y, L = j.selectedIndex === w, T = me(String(m.id || "").trim()), D = me(String(m.title || "").trim()), k = String(ue(m.pageCount, 0)), I = dt(m.compatibilityTier), U = Je(m.compatibilityReason), H = me(I), V = me(U), z = yt(I) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${L ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${L}"
          tabindex="-1"
          data-document-id="${T}"
          data-document-title="${D}"
          data-document-pages="${k}"
          data-document-compatibility-tier="${H}"
          data-document-compatibility-reason="${V}"
          data-typeahead-index="${w}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${D}</div>
            <div class="text-xs text-gray-500">${k} pages ${z}</div>
          </div>
        </button>
      `;
    }).join(""), o.querySelectorAll(".typeahead-option").forEach((m) => {
      m.addEventListener("click", () => bn(m));
    }));
  }
  function bn(o) {
    const s = o.getAttribute("data-document-id"), l = o.getAttribute("data-document-title"), m = o.getAttribute("data-document-pages"), y = dt(
      o.getAttribute("data-document-compatibility-tier")
    ), w = Je(
      o.getAttribute("data-document-compatibility-reason")
    );
    if (s) {
      if (yt(y)) {
        dn({ id: s, title: l, pageCount: m, compatibilityReason: w }), vt(), fe(Vt(w)), xe?.focus();
        return;
      }
      un(s, l, m), he(), xe && (xe.value = ""), j.query = "", j.isSearchMode = !1, j.searchResults = [];
    }
  }
  function qn(o) {
    if (!j.isOpen) {
      (o.key === "ArrowDown" || o.key === "Enter") && (o.preventDefault(), Ne());
      return;
    }
    const s = j.isSearchMode ? j.searchResults : j.recentDocuments, l = s.length - 1;
    switch (o.key) {
      case "ArrowDown":
        o.preventDefault(), j.selectedIndex = Math.min(j.selectedIndex + 1, l), Le(), Kt();
        break;
      case "ArrowUp":
        o.preventDefault(), j.selectedIndex = Math.max(j.selectedIndex - 1, 0), Le(), Kt();
        break;
      case "Enter":
        if (o.preventDefault(), j.selectedIndex >= 0 && j.selectedIndex <= l) {
          const m = s[j.selectedIndex];
          if (m) {
            const y = document.createElement("button");
            y.setAttribute("data-document-id", m.id), y.setAttribute("data-document-title", m.title), y.setAttribute("data-document-pages", String(m.pageCount)), y.setAttribute("data-document-compatibility-tier", String(m.compatibilityTier || "")), y.setAttribute("data-document-compatibility-reason", String(m.compatibilityReason || "")), bn(y);
          }
        }
        break;
      case "Escape":
        o.preventDefault(), he();
        break;
      case "Tab":
        he();
        break;
      case "Home":
        o.preventDefault(), j.selectedIndex = 0, Le(), Kt();
        break;
      case "End":
        o.preventDefault(), j.selectedIndex = l, Le(), Kt();
        break;
    }
  }
  function Kt() {
    if (!nt) return;
    const o = nt.querySelector(`[data-typeahead-index="${j.selectedIndex}"]`);
    o && o.scrollIntoView({ block: "nearest" });
  }
  xe && (xe.addEventListener("input", (o) => {
    const l = o.target.value;
    j.query = l, j.isOpen || Ne(), l.trim() ? (j.isLoading = !0, Le(), wi(l)) : (j.isSearchMode = !1, j.searchResults = [], Le());
    const m = ft.filter(
      (y) => String(y.title || "").toLowerCase().includes(l.toLowerCase())
    );
    mn(m);
  }), xe.addEventListener("focus", () => {
    Ne();
  }), xe.addEventListener("keydown", qn)), document.addEventListener("click", (o) => {
    const s = o.target;
    Un && !Un.contains(s) && he();
  }), tt(), vi();
  const a = document.getElementById("participants-container"), u = document.getElementById("participant-template"), g = document.getElementById("add-participant-btn");
  let f = 0, v = 0;
  function x() {
    return `temp_${Date.now()}_${f++}`;
  }
  function C(o = {}) {
    const s = u.content.cloneNode(!0), l = s.querySelector(".participant-entry"), m = o.id || x();
    l.setAttribute("data-participant-id", m);
    const y = l.querySelector(".participant-id-input"), w = l.querySelector('input[name="participants[].name"]'), L = l.querySelector('input[name="participants[].email"]'), T = l.querySelector('select[name="participants[].role"]'), D = l.querySelector('input[name="participants[].signing_stage"]'), k = l.querySelector('input[name="participants[].notify"]'), I = l.querySelector(".signing-stage-wrapper"), U = v++;
    y.name = `participants[${U}].id`, y.value = m, w.name = `participants[${U}].name`, L.name = `participants[${U}].email`, T.name = `participants[${U}].role`, D && (D.name = `participants[${U}].signing_stage`), k && (k.name = `participants[${U}].notify`), o.name && (w.value = o.name), o.email && (L.value = o.email), o.role && (T.value = o.role), D && o.signing_stage && (D.value = o.signing_stage), k && (k.checked = o.notify !== !1);
    const H = () => {
      if (!I || !D) return;
      const V = T.value === "signer";
      I.classList.toggle("hidden", !V), V ? D.value || (D.value = "1") : D.value = "";
    };
    H(), l.querySelector(".remove-participant-btn").addEventListener("click", () => {
      l.remove(), Mt();
    }), T.addEventListener("change", () => {
      H(), Mt();
    }), a.appendChild(s);
  }
  g.addEventListener("click", () => C()), O.length > 0 ? O.forEach((o) => {
    C({
      id: String(o.id || "").trim(),
      name: String(o.name || "").trim(),
      email: String(o.email || "").trim(),
      role: String(o.role || "signer").trim() || "signer",
      notify: o.notify !== !1,
      signing_stage: Number(o.signing_stage || o.signingStage || 1) || 1
    });
  }) : C();
  const M = document.getElementById("field-definitions-container"), F = document.getElementById("field-definition-template"), K = document.getElementById("add-field-btn"), W = document.getElementById("add-field-btn-container"), ee = document.getElementById("add-field-definition-empty-btn"), Ce = document.getElementById("field-definitions-empty-state"), ce = document.getElementById("field-rules-container"), Y = document.getElementById("field-rule-template"), le = document.getElementById("add-field-rule-btn"), it = document.getElementById("field-rules-empty-state"), Ke = document.getElementById("field-rules-preview"), wn = document.getElementById("field_rules_json"), Xt = document.getElementById("field_placements_json");
  let Si = 0, jn = 0, Sn = 0;
  function xi() {
    return `temp_field_${Date.now()}_${Si++}`;
  }
  function zn() {
    return `rule_${Date.now()}_${Sn}`;
  }
  function wt() {
    const o = a.querySelectorAll(".participant-entry"), s = [];
    return o.forEach((l) => {
      const m = l.getAttribute("data-participant-id"), y = l.querySelector('select[name*=".role"]'), w = l.querySelector('input[name*=".name"]'), L = l.querySelector('input[name*=".email"]');
      y.value === "signer" && s.push({
        id: m,
        name: w.value || L.value || "Signer",
        email: L.value
      });
    }), s;
  }
  function er(o, s) {
    const l = String(o || "").trim();
    return l && s.some((m) => m.id === l) ? l : s.length === 1 ? s[0].id : "";
  }
  function Vn(o, s, l = "") {
    if (!o) return;
    const m = er(l, s);
    o.innerHTML = '<option value="">Select signer...</option>', s.forEach((y) => {
      const w = document.createElement("option");
      w.value = y.id, w.textContent = y.name, o.appendChild(w);
    }), o.value = m;
  }
  function tr(o = wt()) {
    const s = M.querySelectorAll(".field-participant-select"), l = ce ? ce.querySelectorAll(".field-rule-participant-select") : [];
    s.forEach((m) => {
      Vn(m, o, m.value);
    }), l.forEach((m) => {
      Vn(m, o, m.value);
    });
  }
  function Mt() {
    const o = wt();
    tr(o), xt();
  }
  function He() {
    const o = ue(et?.value || "0", 0);
    if (o > 0) return o;
    const s = String(lt?.textContent || "").match(/(\d+)\s+pages?/i);
    if (s) {
      const l = ue(s[1], 0);
      if (l > 0) return l;
    }
    return 1;
  }
  function Gn() {
    if (!ce || !it) return;
    const o = ce.querySelectorAll(".field-rule-entry");
    it.classList.toggle("hidden", o.length > 0);
  }
  function St() {
    if (!ce) return [];
    const o = He(), s = ce.querySelectorAll(".field-rule-entry"), l = [];
    return s.forEach((m) => {
      const y = ti({
        id: m.getAttribute("data-field-rule-id") || "",
        type: m.querySelector(".field-rule-type-select")?.value || "",
        participantId: m.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: m.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: m.querySelector(".field-rule-to-page-input")?.value || "",
        page: m.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!m.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: Tn(m.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (m.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, o);
      y.type && l.push(y);
    }), l;
  }
  function Xi() {
    return St().map((o) => ba(o));
  }
  function Wn(o, s) {
    return Sa(o, s);
  }
  function xt() {
    if (!Ke) return;
    const o = St(), s = He(), l = Wn(o, s), m = wt(), y = new Map(m.map((D) => [String(D.id), D.name]));
    if (wn && (wn.value = JSON.stringify(Xi())), !l.length) {
      Ke.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const w = l.reduce((D, k) => {
      const I = k.type;
      return D[I] = (D[I] || 0) + 1, D;
    }, {}), L = l.slice(0, 8).map((D) => {
      const k = y.get(String(D.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${D.type === "initials" ? "Initials" : "Signature"} on page ${D.page}</span><span class="text-gray-500">${me(String(k))}</span></li>`;
    }).join(""), T = l.length - 8;
    Ke.innerHTML = `
      <p class="text-gray-700">${l.length} generated field${l.length !== 1 ? "s" : ""} (${w.initials || 0} initials, ${w.signature || 0} signatures)</p>
      <ul class="space-y-1">${L}</ul>
      ${T > 0 ? `<p class="text-gray-500">+${T} more</p>` : ""}
    `;
  }
  function Qi() {
    const o = wt(), s = new Map(o.map((k) => [String(k.id), k.name || k.email || "Signer"])), l = [];
    M.querySelectorAll(".field-definition-entry").forEach((k) => {
      const I = String(k.getAttribute("data-field-definition-id") || "").trim(), U = k.querySelector(".field-type-select"), H = k.querySelector(".field-participant-select"), V = k.querySelector('input[name*=".page"]'), q = String(U?.value || "text").trim() || "text", z = String(H?.value || "").trim(), X = parseInt(String(V?.value || "1"), 10) || 1;
      l.push({
        definitionId: I,
        fieldType: q,
        participantId: z,
        participantName: s.get(z) || "Unassigned",
        page: X
      });
    });
    const y = Wn(St(), He()), w = /* @__PURE__ */ new Map();
    y.forEach((k) => {
      const I = String(k.ruleId || "").trim(), U = String(k.id || "").trim();
      if (I && U) {
        const H = w.get(I) || [];
        H.push(U), w.set(I, H);
      }
    });
    let L = A.linkGroupState;
    w.forEach((k, I) => {
      if (k.length > 1 && !A.linkGroupState.groups.get(`rule_${I}`)) {
        const H = ha(k, `Rule ${I}`);
        H.id = `rule_${I}`, L = Cs(L, H);
      }
    }), A.linkGroupState = L, y.forEach((k) => {
      const I = String(k.id || "").trim();
      if (!I) return;
      const U = String(k.participantId || "").trim(), H = parseInt(String(k.page || "1"), 10) || 1, V = String(k.ruleId || "").trim();
      l.push({
        definitionId: I,
        fieldType: String(k.type || "text").trim() || "text",
        participantId: U,
        participantName: s.get(U) || "Unassigned",
        page: H,
        linkGroupId: V ? `rule_${V}` : void 0
      });
    });
    const T = /* @__PURE__ */ new Set(), D = l.filter((k) => {
      const I = String(k.definitionId || "").trim();
      return !I || T.has(I) ? !1 : (T.add(I), !0);
    });
    return D.sort((k, I) => k.page !== I.page ? k.page - I.page : k.definitionId.localeCompare(I.definitionId)), D;
  }
  function Zi(o) {
    const s = o.querySelector(".field-rule-type-select"), l = o.querySelector(".field-rule-range-start-wrap"), m = o.querySelector(".field-rule-range-end-wrap"), y = o.querySelector(".field-rule-page-wrap"), w = o.querySelector(".field-rule-exclude-last-wrap"), L = o.querySelector(".field-rule-exclude-pages-wrap"), T = o.querySelector(".field-rule-summary"), D = o.querySelector(".field-rule-from-page-input"), k = o.querySelector(".field-rule-to-page-input"), I = o.querySelector(".field-rule-page-input"), U = o.querySelector(".field-rule-exclude-last-input"), H = o.querySelector(".field-rule-exclude-pages-input"), V = He(), q = ti({
      type: s?.value || "",
      fromPage: D?.value || "",
      toPage: k?.value || "",
      page: I?.value || "",
      excludeLastPage: !!U?.checked,
      excludePages: Tn(H?.value || ""),
      required: !0
    }, V), z = q.fromPage > 0 ? q.fromPage : 1, X = q.toPage > 0 ? q.toPage : V, ne = q.page > 0 ? q.page : q.toPage > 0 ? q.toPage : V, be = q.excludeLastPage, we = q.excludePages.join(","), ie = s?.value === "initials_each_page";
    if (l.classList.toggle("hidden", !ie), m.classList.toggle("hidden", !ie), w.classList.toggle("hidden", !ie), L.classList.toggle("hidden", !ie), y.classList.toggle("hidden", ie), D && (D.value = String(z)), k && (k.value = String(X)), I && (I.value = String(ne)), H && (H.value = we), U && (U.checked = be), ie) {
      const pe = xa(
        z,
        X,
        V,
        be,
        q.excludePages
      ), rt = Ia(pe);
      pe.isEmpty ? T.textContent = `Warning: No initials fields will be generated ${rt}.` : T.textContent = `Generates initials fields on ${rt}.`;
    } else
      T.textContent = `Generates one signature field on page ${ne}.`;
  }
  function es(o = {}) {
    if (!Y || !ce) return;
    const s = Y.content.cloneNode(!0), l = s.querySelector(".field-rule-entry"), m = o.id || zn(), y = Sn++, w = He();
    l.setAttribute("data-field-rule-id", m);
    const L = l.querySelector(".field-rule-id-input"), T = l.querySelector(".field-rule-type-select"), D = l.querySelector(".field-rule-participant-select"), k = l.querySelector(".field-rule-from-page-input"), I = l.querySelector(".field-rule-to-page-input"), U = l.querySelector(".field-rule-page-input"), H = l.querySelector(".field-rule-required-select"), V = l.querySelector(".field-rule-exclude-last-input"), q = l.querySelector(".field-rule-exclude-pages-input"), z = l.querySelector(".remove-field-rule-btn");
    L.name = `field_rules[${y}].id`, L.value = m, T.name = `field_rules[${y}].type`, D.name = `field_rules[${y}].participant_id`, k.name = `field_rules[${y}].from_page`, I.name = `field_rules[${y}].to_page`, U.name = `field_rules[${y}].page`, H.name = `field_rules[${y}].required`, V.name = `field_rules[${y}].exclude_last_page`, q.name = `field_rules[${y}].exclude_pages`;
    const X = ti(o, w);
    T.value = X.type || "initials_each_page", Vn(D, wt(), X.participantId), k.value = String(X.fromPage > 0 ? X.fromPage : 1), I.value = String(X.toPage > 0 ? X.toPage : w), U.value = String(X.page > 0 ? X.page : w), H.value = X.required ? "1" : "0", V.checked = X.excludeLastPage, q.value = X.excludePages.join(",");
    const ne = () => {
      Zi(l), xt(), st();
    }, be = () => {
      const ie = He();
      if (k) {
        const pe = parseInt(k.value, 10);
        Number.isFinite(pe) && (k.value = String(Cn(pe, ie, 1)));
      }
      if (I) {
        const pe = parseInt(I.value, 10);
        Number.isFinite(pe) && (I.value = String(Cn(pe, ie, 1)));
      }
      if (U) {
        const pe = parseInt(U.value, 10);
        Number.isFinite(pe) && (U.value = String(Cn(pe, ie, 1)));
      }
    }, we = () => {
      be(), ne();
    };
    T.addEventListener("change", ne), D.addEventListener("change", ne), k.addEventListener("input", we), k.addEventListener("change", we), I.addEventListener("input", we), I.addEventListener("change", we), U.addEventListener("input", we), U.addEventListener("change", we), H.addEventListener("change", ne), V.addEventListener("change", () => {
      const ie = He();
      if (V.checked) {
        const pe = Math.max(1, ie - 1);
        I.value = String(pe);
      } else
        I.value = String(ie);
      ne();
    }), q.addEventListener("input", ne), z.addEventListener("click", () => {
      l.remove(), Gn(), xt(), st();
    }), ce.appendChild(s), Zi(ce.lastElementChild), Gn(), xt();
  }
  function Jn(o = {}) {
    const s = F.content.cloneNode(!0), l = s.querySelector(".field-definition-entry"), m = o.id || xi();
    l.setAttribute("data-field-definition-id", m);
    const y = l.querySelector(".field-definition-id-input"), w = l.querySelector('select[name="field_definitions[].type"]'), L = l.querySelector('select[name="field_definitions[].participant_id"]'), T = l.querySelector('input[name="field_definitions[].page"]'), D = l.querySelector('input[name="field_definitions[].required"]'), k = l.querySelector(".field-date-signed-info"), I = jn++;
    y.name = `field_instances[${I}].id`, y.value = m, w.name = `field_instances[${I}].type`, L.name = `field_instances[${I}].participant_id`, T.name = `field_instances[${I}].page`, D.name = `field_instances[${I}].required`, o.type && (w.value = o.type), o.page && (T.value = String(Cn(o.page, He(), 1))), o.required !== void 0 && (D.checked = o.required);
    const U = String(o.participant_id || o.participantId || "").trim();
    Vn(L, wt(), U), w.addEventListener("change", () => {
      w.value === "date_signed" ? k.classList.remove("hidden") : k.classList.add("hidden");
    }), w.value === "date_signed" && k.classList.remove("hidden"), l.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      l.remove(), Yn();
    });
    const H = l.querySelector('input[name*=".page"]'), V = () => {
      H && (H.value = String(Cn(H.value, He(), 1)));
    };
    V(), H?.addEventListener("input", V), H?.addEventListener("change", V), M.appendChild(s), Yn();
  }
  function Yn() {
    M.querySelectorAll(".field-definition-entry").length === 0 ? (Ce.classList.remove("hidden"), W?.classList.add("hidden")) : (Ce.classList.add("hidden"), W?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    Mt();
  }).observe(a, { childList: !0, subtree: !0 }), a.addEventListener("change", (o) => {
    (o.target.matches('select[name*=".role"]') || o.target.matches('input[name*=".name"]') || o.target.matches('input[name*=".email"]')) && Mt();
  }), a.addEventListener("input", (o) => {
    (o.target.matches('input[name*=".name"]') || o.target.matches('input[name*=".email"]')) && Mt();
  }), K.addEventListener("click", () => Jn()), ee.addEventListener("click", () => Jn()), le?.addEventListener("click", () => es({ to_page: He() })), window._initialFieldPlacementsData = [], R.forEach((o) => {
    const s = String(o.id || "").trim();
    if (!s) return;
    const l = String(o.type || "signature").trim() || "signature", m = String(o.participant_id || o.participantId || "").trim(), y = Number(o.page || 1) || 1, w = !!o.required;
    Jn({
      id: s,
      type: l,
      participant_id: m,
      page: y,
      required: w
    }), window._initialFieldPlacementsData.push(ni({
      id: s,
      definitionId: s,
      type: l,
      participantId: m,
      participantName: String(o.participant_name || o.participantName || "").trim(),
      page: y,
      x: Number(o.x || o.pos_x || 0) || 0,
      y: Number(o.y || o.pos_y || 0) || 0,
      width: Number(o.width || 150) || 150,
      height: Number(o.height || 32) || 32,
      placementSource: String(o.placement_source || o.placementSource || Ae.MANUAL).trim() || Ae.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), Yn(), Mt(), Gn(), xt();
  const $t = document.getElementById("agreement-form"), Me = document.getElementById("submit-btn"), ts = document.getElementById("form-announcements"), Ii = document.getElementById("active-tab-banner"), ns = document.getElementById("active-tab-message"), is = document.getElementById("active-tab-take-control-btn"), nr = document.getElementById("active-tab-reload-btn");
  function Ei(o) {
    const s = document.getElementById("wizard-save-btn");
    s instanceof HTMLButtonElement && (s.disabled = o), Me instanceof HTMLButtonElement && (Me.disabled = o);
  }
  function Kn(o = {}) {
    const s = o?.isOwner !== !1, l = o?.coordinationAvailable !== !1;
    if (!Ii || !ns) {
      Ei(!s);
      return;
    }
    if (!l || s) {
      Ii.classList.add("hidden"), is?.removeAttribute("disabled"), Ei(!1);
      return;
    }
    const m = o?.claim, y = m?.lastSeenAt ? Ut(m.lastSeenAt) : "recently";
    ns.textContent = `This agreement is active in another tab. Take control here to resume syncing and sending. Last seen ${y}.`, Ii.classList.remove("hidden"), Ei(!0);
  }
  function xn(o, s = "", l = 0) {
    const m = String(s || "").trim().toUpperCase(), y = String(o || "").trim().toLowerCase();
    return m === "DRAFT_SEND_NOT_FOUND" || m === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : m === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : m === "SCOPE_DENIED" || y.includes("scope denied") ? "You don't have access to this organization's resources." : m === "TRANSPORT_SECURITY" || m === "TRANSPORT_SECURITY_REQUIRED" || y.includes("tls transport required") || Number(l) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : m === "PDF_UNSUPPORTED" || y === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(o || "").trim() !== "" ? String(o).trim() : "Something went wrong. Please try again.";
  }
  async function In(o, s) {
    const l = Number(o?.status || 0);
    let m = "", y = "", w = {};
    try {
      const L = await o.json();
      m = String(L?.error?.code || L?.code || "").trim(), y = String(L?.error?.message || L?.message || "").trim(), w = L?.error?.details && typeof L.error.details == "object" ? L.error.details : {}, String(w?.entity || "").trim().toLowerCase() === "drafts" && String(m).trim().toUpperCase() === "NOT_FOUND" && (m = "DRAFT_SEND_NOT_FOUND", y === "" && (y = "Draft not found"));
    } catch {
      y = "";
    }
    return y === "" && (y = s || `Request failed (${l || "unknown"})`), {
      status: l,
      code: m,
      details: w,
      message: xn(y, m, l)
    };
  }
  function fe(o, s = "", l = 0) {
    const m = xn(o, s, l);
    ts && (ts.textContent = m), window.toastManager ? window.toastManager.error(m) : alert(m);
  }
  async function Li(o, s = {}) {
    const l = await o;
    return l?.blocked && l.reason === "passive_tab" ? (fe(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), l) : (l?.error && String(s.errorMessage || "").trim() !== "" && fe(s.errorMessage), l);
  }
  is?.addEventListener("click", async () => {
    if (!ge.takeControl()) {
      fe("This agreement is active in another tab. Take control here before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED");
      return;
    }
    Kn({ isOwner: !0 }), N.getState()?.syncPending && await Li(ge.manualRetry(), {
      errorMessage: "Unable to sync latest draft changes. Please try again."
    }), ye === Ee.REVIEW && fs();
  }), nr?.addEventListener("click", () => {
    window.location.reload();
  });
  function ir() {
    const o = [];
    a.querySelectorAll(".participant-entry").forEach((y) => {
      const w = String(y.getAttribute("data-participant-id") || "").trim(), L = String(y.querySelector('input[name*=".name"]')?.value || "").trim(), T = String(y.querySelector('input[name*=".email"]')?.value || "").trim(), D = String(y.querySelector('select[name*=".role"]')?.value || "signer").trim(), k = y.querySelector(".notify-input")?.checked !== !1, I = String(y.querySelector(".signing-stage-input")?.value || "").trim(), U = Number(I || "1") || 1;
      o.push({
        id: w,
        name: L,
        email: T,
        role: D,
        notify: k,
        signing_stage: D === "signer" ? U : 0
      });
    });
    const s = [];
    M.querySelectorAll(".field-definition-entry").forEach((y) => {
      const w = String(y.getAttribute("data-field-definition-id") || "").trim(), L = String(y.querySelector(".field-type-select")?.value || "signature").trim(), T = String(y.querySelector(".field-participant-select")?.value || "").trim(), D = Number(y.querySelector('input[name*=".page"]')?.value || "1") || 1, k = !!y.querySelector('input[name*=".required"]')?.checked;
      w && s.push({
        id: w,
        type: L,
        participant_id: T,
        page: D,
        required: k
      });
    });
    const l = [];
    A && Array.isArray(A.fieldInstances) && A.fieldInstances.forEach((y, w) => {
      l.push(_s(y, w));
    });
    const m = JSON.stringify(l);
    return Xt && (Xt.value = m), {
      document_id: String(Se?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: o,
      field_instances: s,
      field_placements: l,
      field_placements_json: m,
      field_rules: Xi(),
      field_rules_json: String(wn?.value || "[]"),
      send_for_signature: ye === Ct ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(et?.value || "0") || 0
    };
  }
  function Ci() {
    const o = wt(), s = /* @__PURE__ */ new Map();
    return o.forEach((y) => {
      s.set(y.id, !1);
    }), M.querySelectorAll(".field-definition-entry").forEach((y) => {
      const w = y.querySelector(".field-type-select"), L = y.querySelector(".field-participant-select"), T = y.querySelector('input[name*=".required"]');
      w?.value === "signature" && L?.value && T?.checked && s.set(L.value, !0);
    }), Wn(St(), He()).forEach((y) => {
      y.type === "signature" && y.participantId && y.required && s.set(y.participantId, !0);
    }), o.filter((y) => !s.get(y.id));
  }
  function ss(o) {
    if (!Array.isArray(o) || o.length === 0)
      return "Each signer requires at least one required signature field.";
    const s = o.map((l) => l?.name?.trim()).filter((l) => !!l);
    return s.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${s.join(", ")}`;
  }
  async function rs() {
    N.updateState(N.collectFormState());
    const o = await ge.forceSync();
    if (o?.blocked && o.reason === "passive_tab")
      throw {
        code: "ACTIVE_TAB_OWNERSHIP_REQUIRED",
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const s = N.getState();
    if (s?.syncPending)
      throw new Error("Unable to sync latest draft changes");
    return s;
  }
  async function sr() {
    const o = await rs(), s = String(o?.serverDraftId || "").trim();
    if (!s) {
      const l = await Ze.create(o);
      return N.markSynced(l.id, l.revision), {
        draftID: String(l.id || "").trim(),
        revision: Number(l.revision || 0)
      };
    }
    try {
      const l = await Ze.load(s), m = String(l?.id || s).trim(), y = Number(l?.revision || o?.serverRevision || 0);
      return m && y > 0 && N.markSynced(m, y), {
        draftID: m,
        revision: y > 0 ? y : Number(o?.serverRevision || 0)
      };
    } catch (l) {
      if (Number(l?.status || 0) !== 404)
        throw l;
      const m = await Ze.create({
        ...N.getState(),
        ...N.collectFormState()
      }), y = String(m?.id || "").trim(), w = Number(m?.revision || 0);
      return N.markSynced(y, w), Tt("wizard_send_stale_draft_recovered", {
        stale_draft_id: s,
        recovered_draft_id: y
      }), { draftID: y, revision: w };
    }
  }
  async function rr() {
    const o = N.getState();
    N.setState({
      ...o,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await ge.forceSync();
  }
  $t.addEventListener("submit", function(o) {
    if (xt(), !Se.value) {
      o.preventDefault(), fe("Please select a document"), xe.focus();
      return;
    }
    if (!Gt()) {
      o.preventDefault();
      return;
    }
    const s = a.querySelectorAll(".participant-entry");
    if (s.length === 0) {
      o.preventDefault(), fe("Please add at least one participant"), g.focus();
      return;
    }
    let l = !1;
    if (s.forEach((I) => {
      I.querySelector('select[name*=".role"]').value === "signer" && (l = !0);
    }), !l) {
      o.preventDefault(), fe("At least one signer is required");
      const I = s[0]?.querySelector('select[name*=".role"]');
      I && I.focus();
      return;
    }
    const m = M.querySelectorAll(".field-definition-entry"), y = Ci();
    if (y.length > 0) {
      o.preventDefault(), fe(ss(y)), En(Ee.FIELDS), K.focus();
      return;
    }
    let w = !1;
    if (m.forEach((I) => {
      I.querySelector(".field-participant-select").value || (w = !0);
    }), w) {
      o.preventDefault(), fe("Please assign all fields to a signer");
      const I = M.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      I && I.focus();
      return;
    }
    if (St().some((I) => !I.participantId)) {
      o.preventDefault(), fe("Please assign all automation rules to a signer"), Array.from(ce?.querySelectorAll(".field-rule-participant-select") || []).find((U) => !U.value)?.focus();
      return;
    }
    const D = !!$t.querySelector('input[name="save_as_draft"]'), k = ye === Ct && !D;
    if (k) {
      let I = $t.querySelector('input[name="send_for_signature"]');
      I || (I = document.createElement("input"), I.type = "hidden", I.name = "send_for_signature", $t.appendChild(I)), I.value = "1";
    } else
      $t.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      o.preventDefault(), Me.disabled = !0, Me.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${k ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          ir();
          const I = String(e.routes?.index || "").trim();
          if (!k) {
            if (await rs(), I) {
              window.location.href = I;
              return;
            }
            window.location.reload();
            return;
          }
          const U = await sr(), H = String(U?.draftID || "").trim(), V = Number(U?.revision || 0);
          if (!H || V <= 0)
            throw new Error("Draft session not available. Please try again.");
          if (!ge.ensureActiveTabOwnership("send", { allowClaimIfAvailable: !0 }))
            throw {
              code: "ACTIVE_TAB_OWNERSHIP_REQUIRED",
              message: "This agreement is active in another tab. Take control in this tab before sending."
            };
          const q = await fetch(
            B(`${p}/${encodeURIComponent(H)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: G(),
              body: JSON.stringify({
                expected_revision: V,
                created_by_user_id: b
              })
            }
          );
          if (!q.ok) {
            const ne = await In(q, "Failed to send agreement");
            throw String(ne?.code || "").trim().toUpperCase() === "DRAFT_SEND_NOT_FOUND" ? (Tt("wizard_send_not_found", {
              draft_id: H,
              status: Number(ne?.status || 0)
            }), await rr().catch(() => {
            }), {
              ...ne,
              code: "DRAFT_SESSION_STALE"
            }) : ne;
          }
          const z = await q.json(), X = String(z?.agreement_id || z?.id || z?.data?.id || "").trim();
          if (N.clear(), ge.broadcastStateUpdate(), X && I) {
            window.location.href = `${I}/${encodeURIComponent(X)}`;
            return;
          }
          if (I) {
            window.location.href = I;
            return;
          }
          window.location.reload();
        } catch (I) {
          const U = String(I?.message || "Failed to process agreement").trim(), H = String(I?.code || "").trim(), V = Number(I?.status || 0);
          fe(U, H, V), Me.disabled = !1, Me.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }
    Me.disabled = !0, Me.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${k ? "Sending..." : "Saving..."}
    `;
  });
  let ye = 1;
  const as = document.querySelectorAll(".wizard-step-btn"), ar = document.querySelectorAll(".wizard-step"), or = document.querySelectorAll(".wizard-connector"), os = document.getElementById("wizard-prev-btn"), Ai = document.getElementById("wizard-next-btn"), cs = document.getElementById("wizard-save-btn");
  function Ti() {
    if (as.forEach((o, s) => {
      const l = s + 1, m = o.querySelector(".wizard-step-number");
      l < ye ? (o.classList.remove("text-gray-500", "text-blue-600"), o.classList.add("text-green-600"), m.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), m.classList.add("bg-green-600", "text-white"), o.removeAttribute("aria-current")) : l === ye ? (o.classList.remove("text-gray-500", "text-green-600"), o.classList.add("text-blue-600"), m.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), m.classList.add("bg-blue-600", "text-white"), o.setAttribute("aria-current", "step")) : (o.classList.remove("text-blue-600", "text-green-600"), o.classList.add("text-gray-500"), m.classList.remove("bg-blue-600", "text-white", "bg-green-600"), m.classList.add("bg-gray-300", "text-gray-600"), o.removeAttribute("aria-current"));
    }), or.forEach((o, s) => {
      s < ye - 1 ? (o.classList.remove("bg-gray-300"), o.classList.add("bg-green-600")) : (o.classList.remove("bg-green-600"), o.classList.add("bg-gray-300"));
    }), ar.forEach((o) => {
      parseInt(o.dataset.step, 10) === ye ? o.classList.remove("hidden") : o.classList.add("hidden");
    }), os.classList.toggle("hidden", ye === 1), Ai.classList.toggle("hidden", ye === Ct), cs.classList.toggle("hidden", ye !== Ct), Me.classList.toggle("hidden", ye !== Ct), Kn({
      isOwner: ge.isOwner,
      reason: ge.lastBlockedReason,
      claim: ge.currentClaim
    }), ye < Ct) {
      const o = na[ye] || "Next";
      Ai.innerHTML = `
        ${o}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    ye === Ee.PLACEMENT ? lr() : ye === Ee.REVIEW && fs(), mt.updateVisibility(ye);
  }
  function cr(o) {
    switch (o) {
      case 1:
        return Se.value ? !!Gt() : (fe("Please select a document"), !1);
      case 2:
        const s = document.getElementById("title");
        return s.value.trim() ? !0 : (fe("Please enter an agreement title"), s.focus(), !1);
      case 3:
        const l = a.querySelectorAll(".participant-entry");
        if (l.length === 0)
          return fe("Please add at least one participant"), !1;
        let m = !1;
        return l.forEach((D) => {
          D.querySelector('select[name*=".role"]').value === "signer" && (m = !0);
        }), m ? !0 : (fe("At least one signer is required"), !1);
      case 4:
        const y = M.querySelectorAll(".field-definition-entry");
        for (const D of y) {
          const k = D.querySelector(".field-participant-select");
          if (!k.value)
            return fe("Please assign all fields to a signer"), k.focus(), !1;
        }
        if (St().find((D) => !D.participantId))
          return fe("Please assign all automation rules to a signer"), ce?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const T = Ci();
        return T.length > 0 ? (fe(ss(T)), K.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function En(o) {
    if (!(o < Ee.DOCUMENT || o > Ct)) {
      if (o > ye) {
        for (let s = ye; s < o; s++)
          if (!cr(s)) return;
      }
      ye = o, Ti(), N.updateStep(o), _t(), ge.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  as.forEach((o) => {
    o.addEventListener("click", () => {
      const s = parseInt(o.dataset.step, 10);
      En(s);
    });
  }), os.addEventListener("click", () => En(ye - 1)), Ai.addEventListener("click", () => En(ye + 1)), cs.addEventListener("click", () => {
    const o = document.createElement("input");
    o.type = "hidden", o.name = "save_as_draft", o.value = "1", $t.appendChild(o), $t.submit();
  });
  let A = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((o, s) => ni(o, s)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: ma()
  };
  const It = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, Xn = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function lr() {
    const o = document.getElementById("placement-loading"), s = document.getElementById("placement-no-document"), l = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const m = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const y = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const w = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !Se.value) {
      o.classList.add("hidden"), s.classList.remove("hidden");
      return;
    }
    o.classList.remove("hidden"), s.classList.add("hidden");
    const L = Qi(), T = new Set(
      L.map((z) => String(z.definitionId || "").trim()).filter((z) => z)
    );
    A.fieldInstances = A.fieldInstances.filter(
      (z) => T.has(String(z.definitionId || "").trim())
    ), l.innerHTML = "";
    const D = A.linkGroupState.groups.size > 0, k = document.getElementById("link-batch-actions");
    k && k.classList.toggle("hidden", !D);
    const I = L.map((z) => {
      const X = String(z.definitionId || "").trim(), ne = A.linkGroupState.definitionToGroup.get(X) || "", be = A.linkGroupState.unlinkedDefinitions.has(X);
      return { ...z, definitionId: X, linkGroupId: ne, isUnlinked: be };
    });
    I.forEach((z, X) => {
      const ne = z.definitionId, be = String(z.fieldType || "text").trim() || "text", we = String(z.participantId || "").trim(), ie = String(z.participantName || "Unassigned").trim() || "Unassigned", pe = parseInt(String(z.page || "1"), 10) || 1, rt = z.linkGroupId, Di = z.isUnlinked;
      if (!ne) return;
      A.fieldInstances.forEach((qe) => {
        qe.definitionId === ne && (qe.type = be, qe.participantId = we, qe.participantName = ie);
      });
      const Mi = It[be] || It.text, Q = A.fieldInstances.some((qe) => qe.definitionId === ne), se = document.createElement("div");
      se.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Q ? "opacity-50" : ""}`, se.draggable = !Q, se.dataset.definitionId = ne, se.dataset.fieldType = be, se.dataset.participantId = we, se.dataset.participantName = ie, se.dataset.page = String(pe), rt && (se.dataset.linkGroupId = rt);
      const Zt = document.createElement("span");
      Zt.className = `w-3 h-3 rounded ${Mi.bg}`;
      const Lt = document.createElement("div");
      Lt.className = "flex-1 text-xs";
      const en = document.createElement("div");
      en.className = "font-medium capitalize", en.textContent = be.replace(/_/g, " ");
      const tn = document.createElement("div");
      tn.className = "text-gray-500", tn.textContent = ie;
      const Rt = document.createElement("span");
      Rt.className = `placement-status text-xs ${Q ? "text-green-600" : "text-amber-600"}`, Rt.textContent = Q ? "Placed" : "Not placed", Lt.appendChild(en), Lt.appendChild(tn), se.appendChild(Zt), se.appendChild(Lt), se.appendChild(Rt), se.addEventListener("dragstart", (qe) => {
        if (Q) {
          qe.preventDefault();
          return;
        }
        qe.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: ne,
          fieldType: be,
          participantId: we,
          participantName: ie
        })), qe.dataTransfer.effectAllowed = "copy", se.classList.add("opacity-50");
      }), se.addEventListener("dragend", () => {
        se.classList.remove("opacity-50");
      }), l.appendChild(se);
      const vs = I[X + 1];
      if (rt && vs && vs.linkGroupId === rt) {
        const qe = ls(ne, !Di);
        l.appendChild(qe);
      }
    }), dr();
    const U = ++A.loadRequestVersion, H = String(Se.value || "").trim(), V = encodeURIComponent(H), q = `${n}/panels/esign_documents/${V}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const X = await window.pdfjsLib.getDocument({
        url: q,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (U !== A.loadRequestVersion)
        return;
      A.pdfDoc = X, A.totalPages = A.pdfDoc.numPages, A.currentPage = 1, w.textContent = A.totalPages, await gt(A.currentPage), o.classList.add("hidden"), A.uiHandlersBound || (ur(m, y), br(), wr(), A.uiHandlersBound = !0), Et();
    } catch (z) {
      if (U !== A.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", z), o.classList.add("hidden"), s.classList.remove("hidden"), s.textContent = `Failed to load PDF: ${xn(z?.message || "Failed to load PDF")}`;
    }
    Ln(), Xe();
  }
  function ls(o, s) {
    const l = document.createElement("div");
    return l.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", l.dataset.definitionId = o, l.dataset.isLinked = String(s), l.title = s ? "Click to unlink this field" : "Click to re-link this field", l.setAttribute("role", "button"), l.setAttribute("aria-label", s ? "Unlink field from group" : "Re-link field to group"), l.setAttribute("tabindex", "0"), s ? l.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : l.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, l.addEventListener("click", () => ds(o, s)), l.addEventListener("keydown", (m) => {
      (m.key === "Enter" || m.key === " ") && (m.preventDefault(), ds(o, s));
    }), l;
  }
  function ds(o, s) {
    s ? (A.linkGroupState = As(A.linkGroupState, o), window.toastManager && window.toastManager.info("Field unlinked")) : (A.linkGroupState = Ts(A.linkGroupState, o), window.toastManager && window.toastManager.info("Field re-linked")), ki();
  }
  function dr() {
    const o = document.getElementById("link-all-btn"), s = document.getElementById("unlink-all-btn");
    o && !o.dataset.bound && (o.dataset.bound = "true", o.addEventListener("click", () => {
      const l = A.linkGroupState.unlinkedDefinitions.size;
      if (l !== 0) {
        for (const m of A.linkGroupState.unlinkedDefinitions)
          A.linkGroupState = Ts(A.linkGroupState, m);
        window.toastManager && window.toastManager.success(`Re-linked ${l} field${l > 1 ? "s" : ""}`), ki();
      }
    })), s && !s.dataset.bound && (s.dataset.bound = "true", s.addEventListener("click", () => {
      let l = 0;
      for (const m of A.linkGroupState.definitionToGroup.keys())
        A.linkGroupState.unlinkedDefinitions.has(m) || (A.linkGroupState = As(A.linkGroupState, m), l++);
      l > 0 && window.toastManager && window.toastManager.success(`Unlinked ${l} field${l > 1 ? "s" : ""}`), ki();
    })), us();
  }
  function us() {
    const o = document.getElementById("link-all-btn"), s = document.getElementById("unlink-all-btn");
    if (o) {
      const l = A.linkGroupState.unlinkedDefinitions.size > 0;
      o.disabled = !l;
    }
    if (s) {
      let l = !1;
      for (const m of A.linkGroupState.definitionToGroup.keys())
        if (!A.linkGroupState.unlinkedDefinitions.has(m)) {
          l = !0;
          break;
        }
      s.disabled = !l;
    }
  }
  function ki() {
    const o = document.getElementById("placement-fields-list");
    if (!o) return;
    const s = Qi();
    o.innerHTML = "";
    const l = s.map((m) => {
      const y = String(m.definitionId || "").trim(), w = A.linkGroupState.definitionToGroup.get(y) || "", L = A.linkGroupState.unlinkedDefinitions.has(y);
      return { ...m, definitionId: y, linkGroupId: w, isUnlinked: L };
    });
    l.forEach((m, y) => {
      const w = m.definitionId, L = String(m.fieldType || "text").trim() || "text", T = String(m.participantId || "").trim(), D = String(m.participantName || "Unassigned").trim() || "Unassigned", k = parseInt(String(m.page || "1"), 10) || 1, I = m.linkGroupId, U = m.isUnlinked;
      if (!w) return;
      const H = It[L] || It.text, V = A.fieldInstances.some((pe) => pe.definitionId === w), q = document.createElement("div");
      q.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${V ? "opacity-50" : ""}`, q.draggable = !V, q.dataset.definitionId = w, q.dataset.fieldType = L, q.dataset.participantId = T, q.dataset.participantName = D, q.dataset.page = String(k), I && (q.dataset.linkGroupId = I);
      const z = document.createElement("span");
      z.className = `w-3 h-3 rounded ${H.bg}`;
      const X = document.createElement("div");
      X.className = "flex-1 text-xs";
      const ne = document.createElement("div");
      ne.className = "font-medium capitalize", ne.textContent = L.replace(/_/g, " ");
      const be = document.createElement("div");
      be.className = "text-gray-500", be.textContent = D;
      const we = document.createElement("span");
      we.className = `placement-status text-xs ${V ? "text-green-600" : "text-amber-600"}`, we.textContent = V ? "Placed" : "Not placed", X.appendChild(ne), X.appendChild(be), q.appendChild(z), q.appendChild(X), q.appendChild(we), q.addEventListener("dragstart", (pe) => {
        if (V) {
          pe.preventDefault();
          return;
        }
        pe.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: w,
          fieldType: L,
          participantId: T,
          participantName: D
        })), pe.dataTransfer.effectAllowed = "copy", q.classList.add("opacity-50");
      }), q.addEventListener("dragend", () => {
        q.classList.remove("opacity-50");
      }), o.appendChild(q);
      const ie = l[y + 1];
      if (I && ie && ie.linkGroupId === I) {
        const pe = ls(w, !U);
        o.appendChild(pe);
      }
    }), us();
  }
  async function gt(o) {
    if (!A.pdfDoc) return;
    const s = document.getElementById("placement-pdf-canvas"), l = document.getElementById("placement-canvas-container"), m = s.getContext("2d"), y = await A.pdfDoc.getPage(o), w = y.getViewport({ scale: A.scale });
    s.width = w.width, s.height = w.height, l.style.width = `${w.width}px`, l.style.height = `${w.height}px`, await y.render({
      canvasContext: m,
      viewport: w
    }).promise, document.getElementById("placement-current-page").textContent = o, Et();
  }
  function ur(o, s) {
    const l = document.getElementById("placement-pdf-canvas");
    o.addEventListener("dragover", (m) => {
      m.preventDefault(), m.dataTransfer.dropEffect = "copy", l.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), o.addEventListener("dragleave", (m) => {
      l.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), o.addEventListener("drop", (m) => {
      m.preventDefault(), l.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const y = m.dataTransfer.getData("application/json");
      if (!y) return;
      const w = JSON.parse(y), L = l.getBoundingClientRect(), T = (m.clientX - L.left) / A.scale, D = (m.clientY - L.top) / A.scale;
      ps(w, T, D);
    });
  }
  function ps(o, s, l, m = {}) {
    const y = Xn[o.fieldType] || Xn.text, w = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, L = m.placementSource || Ae.MANUAL, T = m.linkGroupId || zs(A.linkGroupState, o.definitionId)?.id, D = {
      id: w,
      definitionId: o.definitionId,
      type: o.fieldType,
      participantId: o.participantId,
      participantName: o.participantName,
      page: A.currentPage,
      x: Math.max(0, s - y.width / 2),
      y: Math.max(0, l - y.height / 2),
      width: y.width,
      height: y.height,
      placementSource: L,
      linkGroupId: T,
      linkedFromFieldId: m.linkedFromFieldId
    };
    A.fieldInstances.push(D), gs(o.definitionId), L === Ae.MANUAL && T && hr(D), Et(), Ln(), Xe();
  }
  function gs(o, s = !1) {
    const l = document.querySelector(`.placement-field-item[data-definition-id="${o}"]`);
    if (l) {
      l.classList.add("opacity-50"), l.draggable = !1;
      const m = l.querySelector(".placement-status");
      m && (m.textContent = "Placed", m.classList.remove("text-amber-600"), m.classList.add("text-green-600")), s && l.classList.add("just-linked");
    }
  }
  function pr(o) {
    const s = fa(
      A.linkGroupState,
      o
    );
    s && (A.linkGroupState = Cs(A.linkGroupState, s.updatedGroup));
  }
  function ms(o) {
    const s = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((w) => {
      const L = w.dataset.definitionId, T = w.dataset.page;
      if (L) {
        const D = A.linkGroupState.definitionToGroup.get(L);
        s.set(L, {
          type: w.dataset.fieldType || "text",
          participantId: w.dataset.participantId || "",
          participantName: w.dataset.participantName || "Unknown",
          page: T ? parseInt(T, 10) : 1,
          linkGroupId: D
        });
      }
    });
    let m = 0;
    const y = 10;
    for (; m < y; ) {
      const w = ya(
        A.linkGroupState,
        o,
        A.fieldInstances,
        s
      );
      if (!w || !w.newPlacement) break;
      A.fieldInstances.push(w.newPlacement), gs(w.newPlacement.definitionId, !0), m++;
    }
    m > 0 && (Et(), Ln(), Xe(), gr(m));
  }
  function gr(o) {
    const s = o === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${o} linked fields`;
    window.toastManager && window.toastManager.info(s);
    const l = document.createElement("div");
    l.setAttribute("role", "status"), l.setAttribute("aria-live", "polite"), l.className = "sr-only", l.textContent = s, document.body.appendChild(l), setTimeout(() => l.remove(), 1e3), mr();
  }
  function mr() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((s) => {
      s.classList.add("linked-flash"), setTimeout(() => {
        s.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function hr(o) {
    pr(o);
  }
  function Et() {
    const o = document.getElementById("placement-overlays-container");
    o.innerHTML = "", o.style.pointerEvents = "auto", A.fieldInstances.filter((s) => s.page === A.currentPage).forEach((s) => {
      const l = It[s.type] || It.text, m = A.selectedFieldId === s.id, y = s.placementSource === Ae.AUTO_LINKED, w = document.createElement("div"), L = y ? "border-dashed" : "border-solid";
      w.className = `field-overlay absolute cursor-move ${l.border} border-2 ${L} rounded`, w.style.cssText = `
          left: ${s.x * A.scale}px;
          top: ${s.y * A.scale}px;
          width: ${s.width * A.scale}px;
          height: ${s.height * A.scale}px;
          background-color: ${l.fill};
          ${m ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, w.dataset.instanceId = s.id;
      const T = document.createElement("div");
      if (T.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + l.bg, T.textContent = `${s.type.replace("_", " ")} - ${s.participantName}`, w.appendChild(T), y) {
        const I = document.createElement("div");
        I.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", I.title = "Auto-linked from template", I.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, w.appendChild(I);
      }
      const D = document.createElement("div");
      D.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", D.style.cssText = "transform: translate(50%, 50%);", w.appendChild(D);
      const k = document.createElement("button");
      k.type = "button", k.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", k.innerHTML = "×", k.addEventListener("click", (I) => {
        I.stopPropagation(), vr(s.id);
      }), w.appendChild(k), w.addEventListener("mousedown", (I) => {
        I.target === D ? yr(I, s) : I.target !== k && fr(I, s, w);
      }), w.addEventListener("click", () => {
        A.selectedFieldId = s.id, Et();
      }), o.appendChild(w);
    });
  }
  function fr(o, s, l) {
    o.preventDefault(), A.isDragging = !0, A.selectedFieldId = s.id;
    const m = o.clientX, y = o.clientY, w = s.x * A.scale, L = s.y * A.scale;
    function T(k) {
      const I = k.clientX - m, U = k.clientY - y;
      s.x = Math.max(0, (w + I) / A.scale), s.y = Math.max(0, (L + U) / A.scale), s.placementSource = Ae.MANUAL, l.style.left = `${s.x * A.scale}px`, l.style.top = `${s.y * A.scale}px`;
    }
    function D() {
      A.isDragging = !1, document.removeEventListener("mousemove", T), document.removeEventListener("mouseup", D), Xe();
    }
    document.addEventListener("mousemove", T), document.addEventListener("mouseup", D);
  }
  function yr(o, s) {
    o.preventDefault(), o.stopPropagation(), A.isResizing = !0;
    const l = o.clientX, m = o.clientY, y = s.width, w = s.height;
    function L(D) {
      const k = (D.clientX - l) / A.scale, I = (D.clientY - m) / A.scale;
      s.width = Math.max(30, y + k), s.height = Math.max(20, w + I), s.placementSource = Ae.MANUAL, Et();
    }
    function T() {
      A.isResizing = !1, document.removeEventListener("mousemove", L), document.removeEventListener("mouseup", T), Xe();
    }
    document.addEventListener("mousemove", L), document.addEventListener("mouseup", T);
  }
  function vr(o) {
    const s = A.fieldInstances.find((m) => m.id === o);
    if (!s) return;
    A.fieldInstances = A.fieldInstances.filter((m) => m.id !== o);
    const l = document.querySelector(`.placement-field-item[data-definition-id="${s.definitionId}"]`);
    if (l) {
      l.classList.remove("opacity-50"), l.draggable = !0;
      const m = l.querySelector(".placement-status");
      m && (m.textContent = "Not placed", m.classList.remove("text-green-600"), m.classList.add("text-amber-600"));
    }
    Et(), Ln(), Xe();
  }
  function br() {
    const o = document.getElementById("placement-prev-page"), s = document.getElementById("placement-next-page");
    o.addEventListener("click", async () => {
      A.currentPage > 1 && (A.currentPage--, ms(A.currentPage), await gt(A.currentPage));
    }), s.addEventListener("click", async () => {
      A.currentPage < A.totalPages && (A.currentPage++, ms(A.currentPage), await gt(A.currentPage));
    });
  }
  function wr() {
    const o = document.getElementById("placement-zoom-in"), s = document.getElementById("placement-zoom-out"), l = document.getElementById("placement-zoom-fit"), m = document.getElementById("placement-zoom-level");
    o.addEventListener("click", async () => {
      A.scale = Math.min(3, A.scale + 0.25), m.textContent = `${Math.round(A.scale * 100)}%`, await gt(A.currentPage);
    }), s.addEventListener("click", async () => {
      A.scale = Math.max(0.5, A.scale - 0.25), m.textContent = `${Math.round(A.scale * 100)}%`, await gt(A.currentPage);
    }), l.addEventListener("click", async () => {
      const y = document.getElementById("placement-viewer"), L = (await A.pdfDoc.getPage(A.currentPage)).getViewport({ scale: 1 });
      A.scale = (y.clientWidth - 40) / L.width, m.textContent = `${Math.round(A.scale * 100)}%`, await gt(A.currentPage);
    });
  }
  function Ln() {
    const o = Array.from(document.querySelectorAll(".placement-field-item")), s = o.length, l = new Set(
      o.map((L) => String(L.dataset.definitionId || "").trim()).filter((L) => L)
    ), m = /* @__PURE__ */ new Set();
    A.fieldInstances.forEach((L) => {
      const T = String(L.definitionId || "").trim();
      l.has(T) && m.add(T);
    });
    const y = m.size, w = Math.max(0, s - y);
    document.getElementById("placement-total-fields").textContent = s, document.getElementById("placement-placed-count").textContent = y, document.getElementById("placement-unplaced-count").textContent = w;
  }
  function Xe() {
    const o = document.getElementById("field-instances-container");
    o.innerHTML = "";
    const s = A.fieldInstances.map((l, m) => _s(l, m));
    Xt && (Xt.value = JSON.stringify(s));
  }
  Xe();
  let $e = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const Bt = document.getElementById("auto-place-btn");
  Bt && Bt.addEventListener("click", async () => {
    if ($e.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      Qt("All fields are already placed", "info");
      return;
    }
    const s = document.querySelector('input[name="id"]')?.value;
    if (!s) {
      Pi();
      return;
    }
    $e.isRunning = !0, Bt.disabled = !0, Bt.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const l = await fetch(`${d}/esign/agreements/${s}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Sr()
        })
      });
      if (!l.ok)
        throw await In(l, "Auto-placement failed");
      const m = await l.json(), y = m && typeof m == "object" && m.run && typeof m.run == "object" ? m.run : m;
      $e.currentRunId = y?.run_id || y?.id || null, $e.suggestions = y?.suggestions || [], $e.resolverScores = y?.resolver_scores || [], $e.suggestions.length === 0 ? (Qt("No placement suggestions found. Try placing fields manually.", "warning"), Pi()) : xr(m);
    } catch (l) {
      console.error("Auto-place error:", l);
      const m = xn(l?.message || "Auto-placement failed", l?.code || "", l?.status || 0);
      Qt(`Auto-placement failed: ${m}`, "error"), Pi();
    } finally {
      $e.isRunning = !1, Bt.disabled = !1, Bt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Sr() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function Pi() {
    const o = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let s = 100;
    o.forEach((l) => {
      const m = {
        definitionId: l.dataset.definitionId,
        fieldType: l.dataset.fieldType,
        participantId: l.dataset.participantId,
        participantName: l.dataset.participantName
      }, y = Xn[m.fieldType] || Xn.text;
      A.currentPage = A.totalPages, ps(m, 300, s + y.height / 2, { placementSource: Ae.AUTO_FALLBACK }), s += y.height + 20;
    }), A.pdfDoc && gt(A.totalPages), Qt("Fields placed using fallback layout", "info");
  }
  function xr(o) {
    let s = document.getElementById("placement-suggestions-modal");
    s || (s = Ir(), document.body.appendChild(s));
    const l = s.querySelector("#suggestions-list"), m = s.querySelector("#resolver-info"), y = s.querySelector("#run-stats");
    m.innerHTML = $e.resolverScores.map((w) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${me(String(w?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${w.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${kr(w.score)}">
              ${(Number(w?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), y.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${me(String(o?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${o.status === "completed" ? "text-green-600" : "text-amber-600"}">${me(String(o?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(o?.elapsed_ms || 0))}ms</span>
      </div>
    `, l.innerHTML = $e.suggestions.map((w, L) => {
      const T = hs(w.field_definition_id), D = It[T?.type] || It.text, k = me(String(T?.type || "field").replace(/_/g, " ")), I = me(String(w?.id || "")), U = Math.max(1, Number(w?.page_number || 1)), H = Math.round(Number(w?.x || 0)), V = Math.round(Number(w?.y || 0)), q = Math.max(0, Number(w?.confidence || 0)), z = me(Pr(String(w?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${L}" data-suggestion-id="${I}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${D.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${k}</div>
                <div class="text-xs text-gray-500">Page ${U}, (${H}, ${V})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${Tr(w.confidence)}">
                ${(q * 100).toFixed(0)}%
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
    }).join(""), Er(s), s.classList.remove("hidden");
  }
  function Ir() {
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
    }), o.addEventListener("click", (s) => {
      s.target === o && o.classList.add("hidden");
    }), o.querySelector("#accept-all-btn").addEventListener("click", () => {
      o.querySelectorAll(".suggestion-item").forEach((s) => {
        s.classList.add("border-green-500", "bg-green-50"), s.classList.remove("border-red-500", "bg-red-50"), s.dataset.accepted = "true";
      });
    }), o.querySelector("#reject-all-btn").addEventListener("click", () => {
      o.querySelectorAll(".suggestion-item").forEach((s) => {
        s.classList.add("border-red-500", "bg-red-50"), s.classList.remove("border-green-500", "bg-green-50"), s.dataset.accepted = "false";
      });
    }), o.querySelector("#apply-suggestions-btn").addEventListener("click", () => {
      Cr(), o.classList.add("hidden");
    }), o.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      o.classList.add("hidden");
      const s = o.querySelector("#placement-policy-preset-modal"), l = document.getElementById("placement-policy-preset");
      l && s && (l.value = s.value), Bt?.click();
    }), o;
  }
  function Er(o) {
    o.querySelectorAll(".accept-suggestion-btn").forEach((s) => {
      s.addEventListener("click", () => {
        const l = s.closest(".suggestion-item");
        l.classList.add("border-green-500", "bg-green-50"), l.classList.remove("border-red-500", "bg-red-50"), l.dataset.accepted = "true";
      });
    }), o.querySelectorAll(".reject-suggestion-btn").forEach((s) => {
      s.addEventListener("click", () => {
        const l = s.closest(".suggestion-item");
        l.classList.add("border-red-500", "bg-red-50"), l.classList.remove("border-green-500", "bg-green-50"), l.dataset.accepted = "false";
      });
    }), o.querySelectorAll(".preview-suggestion-btn").forEach((s) => {
      s.addEventListener("click", () => {
        const l = parseInt(s.dataset.index, 10), m = $e.suggestions[l];
        m && Lr(m);
      });
    });
  }
  function Lr(o) {
    o.page_number !== A.currentPage && (A.currentPage = o.page_number, gt(o.page_number));
    const s = document.getElementById("placement-overlays-container"), l = document.getElementById("suggestion-preview-overlay");
    l && l.remove();
    const m = document.createElement("div");
    m.id = "suggestion-preview-overlay", m.className = "absolute pointer-events-none animate-pulse", m.style.cssText = `
      left: ${o.x * A.scale}px;
      top: ${o.y * A.scale}px;
      width: ${o.width * A.scale}px;
      height: ${o.height * A.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, s.appendChild(m), setTimeout(() => m.remove(), 3e3);
  }
  function Cr() {
    const s = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    s.forEach((l) => {
      const m = parseInt(l.dataset.index, 10), y = $e.suggestions[m];
      if (!y) return;
      const w = hs(y.field_definition_id);
      if (!w) return;
      const L = document.querySelector(`.placement-field-item[data-definition-id="${y.field_definition_id}"]`);
      if (!L || L.classList.contains("opacity-50")) return;
      const T = {
        definitionId: y.field_definition_id,
        fieldType: w.type,
        participantId: w.participant_id,
        participantName: L.dataset.participantName
      };
      A.currentPage = y.page_number, Ar(T, y);
    }), A.pdfDoc && gt(A.currentPage), _r(s.length, $e.suggestions.length - s.length), Qt(`Applied ${s.length} placement${s.length !== 1 ? "s" : ""}`, "success");
  }
  function Ar(o, s) {
    const l = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: o.definitionId,
      type: o.fieldType,
      participantId: o.participantId,
      participantName: o.participantName,
      page: s.page_number,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      // Track placement source for audit
      placementSource: Ae.AUTO,
      resolverId: s.resolver_id,
      confidence: s.confidence,
      placementRunId: $e.currentRunId
    };
    A.fieldInstances.push(l);
    const m = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (m) {
      m.classList.add("opacity-50"), m.draggable = !1;
      const y = m.querySelector(".placement-status");
      y && (y.textContent = "Placed", y.classList.remove("text-amber-600"), y.classList.add("text-green-600"));
    }
    Et(), Ln(), Xe();
  }
  function hs(o) {
    const s = document.querySelector(`.field-definition-entry[data-field-definition-id="${o}"]`);
    return s ? {
      id: o,
      type: s.querySelector(".field-type-select")?.value || "text",
      participant_id: s.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function Tr(o) {
    return o >= 0.9 ? "bg-green-100 text-green-800" : o >= 0.7 ? "bg-blue-100 text-blue-800" : o >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function kr(o) {
    return o >= 0.8 ? "bg-green-100 text-green-800" : o >= 0.6 ? "bg-blue-100 text-blue-800" : o >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Pr(o) {
    return o ? o.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Unknown";
  }
  async function _r(o, s) {
  }
  function Qt(o, s = "info") {
    const l = document.createElement("div");
    l.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${s === "success" ? "bg-green-600 text-white" : s === "error" ? "bg-red-600 text-white" : s === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, l.textContent = o, document.body.appendChild(l), setTimeout(() => {
      l.style.opacity = "0", setTimeout(() => l.remove(), 300);
    }, 3e3);
  }
  function fs() {
    const o = document.getElementById("send-readiness-loading"), s = document.getElementById("send-readiness-results"), l = document.getElementById("send-validation-status"), m = document.getElementById("send-validation-issues"), y = document.getElementById("send-issues-list"), w = document.getElementById("send-confirmation"), L = document.getElementById("review-agreement-title"), T = document.getElementById("review-document-title"), D = document.getElementById("review-participant-count"), k = document.getElementById("review-stage-count"), I = document.getElementById("review-participants-list"), U = document.getElementById("review-fields-summary"), H = document.getElementById("title").value || "Untitled", V = Ge.textContent || "No document", q = a.querySelectorAll(".participant-entry"), z = M.querySelectorAll(".field-definition-entry"), X = Wn(St(), He()), ne = wt(), be = /* @__PURE__ */ new Set();
    q.forEach((Q) => {
      const se = Q.querySelector(".signing-stage-input");
      Q.querySelector('select[name*=".role"]').value === "signer" && se?.value && be.add(parseInt(se.value, 10));
    }), L.textContent = H, T.textContent = V, D.textContent = `${q.length} (${ne.length} signers)`, k.textContent = be.size > 0 ? be.size : "1", I.innerHTML = "", q.forEach((Q) => {
      const se = Q.querySelector('input[name*=".name"]'), Zt = Q.querySelector('input[name*=".email"]'), Lt = Q.querySelector('select[name*=".role"]'), en = Q.querySelector(".signing-stage-input"), tn = Q.querySelector(".notify-input"), Rt = document.createElement("div");
      Rt.className = "flex items-center justify-between text-sm", Rt.innerHTML = `
        <div>
          <span class="font-medium">${me(se.value || Zt.value)}</span>
          <span class="text-gray-500 ml-2">${me(Zt.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Lt.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Lt.value === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${tn?.checked !== !1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${tn?.checked !== !1 ? "Notify" : "No Notify"}
          </span>
          ${Lt.value === "signer" && en?.value ? `<span class="text-xs text-gray-500">Stage ${en.value}</span>` : ""}
        </div>
      `, I.appendChild(Rt);
    });
    const we = z.length + X.length;
    U.textContent = `${we} field${we !== 1 ? "s" : ""} defined (${z.length} manual, ${X.length} generated)`;
    const ie = [];
    Se.value || ie.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), ne.length === 0 && ie.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), Ci().forEach((Q) => {
      ie.push({
        severity: "error",
        message: `${Q.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const rt = Array.from(be).sort((Q, se) => Q - se);
    for (let Q = 0; Q < rt.length; Q++)
      if (rt[Q] !== Q + 1) {
        ie.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Di = ie.some((Q) => Q.severity === "error"), Mi = ie.some((Q) => Q.severity === "warning");
    Di ? (l.className = "p-4 rounded-lg bg-red-50 border border-red-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, w.classList.add("hidden"), Me.disabled = !0) : Mi ? (l.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, w.classList.remove("hidden"), Me.disabled = !1) : (l.className = "p-4 rounded-lg bg-green-50 border border-green-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, w.classList.remove("hidden"), Me.disabled = !1), ge.isOwner || (l.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, w.classList.add("hidden"), Me.disabled = !0), ie.length > 0 ? (m.classList.remove("hidden"), y.innerHTML = "", ie.forEach((Q) => {
      const se = document.createElement("li");
      se.className = `p-3 rounded-lg flex items-center justify-between ${Q.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, se.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Q.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Q.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${me(Q.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Q.step}">
            ${me(Q.action)}
          </button>
        `, y.appendChild(se);
    }), y.querySelectorAll("[data-go-to-step]").forEach((Q) => {
      Q.addEventListener("click", () => {
        const se = Number(Q.getAttribute("data-go-to-step"));
        Number.isFinite(se) && En(se);
      });
    })) : m.classList.add("hidden"), o.classList.add("hidden"), s.classList.remove("hidden");
  }
  let _i = null;
  function st() {
    _i && clearTimeout(_i), _i = setTimeout(() => {
      _t();
    }, 500);
  }
  Se && new MutationObserver(() => {
    _t();
  }).observe(Se, { attributes: !0, attributeFilter: ["value"] });
  const ys = document.getElementById("title"), Dr = document.getElementById("message");
  ys?.addEventListener("input", () => {
    const o = String(ys?.value || "").trim() === "" ? oe.AUTOFILL : oe.USER;
    N.setTitleSource(o), st();
  }), Dr?.addEventListener("input", st), a.addEventListener("input", st), a.addEventListener("change", st), M.addEventListener("input", st), M.addEventListener("change", st), ce?.addEventListener("input", st), ce?.addEventListener("change", st);
  const Mr = Xe;
  Xe = function() {
    Mr(), _t();
  };
  function $r() {
    const o = N.getState();
    !o.participants || o.participants.length === 0 || (a.innerHTML = "", v = 0, o.participants.forEach((s) => {
      C({
        id: s.tempId,
        name: s.name,
        email: s.email,
        role: s.role,
        notify: s.notify !== !1,
        signing_stage: s.signingStage
      });
    }));
  }
  function Br() {
    const o = N.getState();
    !o.fieldDefinitions || o.fieldDefinitions.length === 0 || (M.innerHTML = "", jn = 0, o.fieldDefinitions.forEach((s) => {
      Jn({
        id: s.tempId,
        type: s.type,
        participant_id: s.participantTempId,
        page: s.page,
        required: s.required
      });
    }), Yn());
  }
  function Rr() {
    const o = N.getState();
    !Array.isArray(o.fieldRules) || o.fieldRules.length === 0 || ce && (ce.querySelectorAll(".field-rule-entry").forEach((s) => s.remove()), Sn = 0, o.fieldRules.forEach((s) => {
      es({
        id: s.id,
        type: s.type,
        participantId: s.participantId || s.participantTempId,
        fromPage: s.fromPage,
        toPage: s.toPage,
        page: s.page,
        excludeLastPage: s.excludeLastPage,
        excludePages: s.excludePages,
        required: s.required
      });
    }), Gn(), xt());
  }
  function Fr() {
    const o = N.getState();
    !Array.isArray(o.fieldPlacements) || o.fieldPlacements.length === 0 || (A.fieldInstances = o.fieldPlacements.map((s, l) => ni(s, l)), Xe());
  }
  if (window._resumeToStep) {
    $r(), Br(), Rr(), Mt(), Fr();
    const o = N.getState();
    o.document?.id && mt.setDocument(o.document.id, o.document.title, o.document.pageCount), ye = window._resumeToStep, Ti(), delete window._resumeToStep;
  } else if (Ti(), Se.value) {
    const o = Ge?.textContent || null, s = ue(et.value, null);
    mt.setDocument(Se.value, o, s);
  }
  c && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function La(i) {
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
class Js {
  constructor(e) {
    this.initialized = !1, this.config = La(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Ea(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function Ho(i) {
  const e = new Js(i);
  return te(() => e.init()), e;
}
function Ca(i) {
  const e = new Js({
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
      Ca({
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
const Aa = "esign.signer.profile.v1", Ds = "esign.signer.profile.outbox.v1", zi = 90, Ms = 500 * 1024;
class Ta {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : zi;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Aa}:${e}`;
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
class ka {
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
class Oi {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Ds);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [r, d] of Object.entries(t)) {
        if (!d || typeof d != "object")
          continue;
        const p = d;
        if (p.op === "clear") {
          n[r] = {
            op: "clear",
            updatedAt: Number(p.updatedAt) || Date.now()
          };
          continue;
        }
        const c = p.op === "patch" ? p.patch : p;
        n[r] = {
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
      window.localStorage.setItem(Ds, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), r = n[e], d = r?.op === "patch" ? r.patch || {} : {};
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
      const [n, r] = await Promise.all([
        this.localStore.load(e),
        this.remoteStore.load(e).catch(() => null)
      ]), d = this.pickLatest(n, r);
      return d && await this.localStore.save(e, d), await this.flushOutboxForKey(e), d;
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
function Pa(i) {
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
      ttlDays: Number(i.profile?.ttlDays || zi) || zi,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function _a(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function Ui(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Da(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Be(i) {
  const e = String(i || "").trim();
  return Da(e) ? "" : e;
}
function Ma(i) {
  const e = new Ta(i.profile.ttlDays), t = new ka(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new Oi("local_only", e, null) : i.profile.mode === "remote_only" ? new Oi("remote_only", e, t) : new Oi("hybrid", e, t);
}
function $a() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Ba(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Pa(i), r = _a(n), d = Ma(n);
  $a();
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
    track(a, u = {}) {
      if (!n.telemetryEnabled) return;
      const g = {
        event: a,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...u
      };
      this.events.push(g), this.isCriticalEvent(a) && this.flush();
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
    trackViewerLoad(a, u, g = null) {
      this.metrics.viewerLoadTime = u, this.track(a ? "viewer_load_success" : "viewer_load_failed", {
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
    trackFieldSave(a, u, g, f, v = null) {
      this.metrics.fieldSaveLatencies.push(f), g ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: a, error: v }), this.track(g ? "field_save_success" : "field_save_failed", {
        fieldId: a,
        fieldType: u,
        latency: f,
        error: v
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
    trackSignatureAttach(a, u, g, f, v = null) {
      this.metrics.signatureAttachLatencies.push(f), this.track(g ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: a,
        signatureType: u,
        latency: f,
        error: v
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
    trackSubmit(a, u = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(a ? "submit_success" : "submit_failed", {
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
    trackDegradedMode(a, u = {}) {
      this.track("degraded_mode", {
        degradationType: a,
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
    calculateAverage(a) {
      return a.length ? Math.round(a.reduce((u, g) => u + g, 0) / a.length) : 0;
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
          const u = JSON.stringify({
            events: a,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, u);
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
      } catch (u) {
        this.events = [...a, ...this.events], console.warn("Telemetry flush failed:", u);
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
  function S() {
    c.overlayRenderFrameID || (c.overlayRenderFrameID = window.requestAnimationFrame(() => {
      c.overlayRenderFrameID = 0, ze();
    }));
  }
  function b(a) {
    const u = c.fieldState.get(a);
    u && (delete u.previewValueText, delete u.previewValueBool, delete u.previewSignatureUrl);
  }
  function E() {
    c.fieldState.forEach((a) => {
      delete a.previewValueText, delete a.previewValueBool, delete a.previewSignatureUrl;
    });
  }
  function _(a, u) {
    const g = c.fieldState.get(a);
    if (!g) return;
    const f = Be(String(u || ""));
    if (!f) {
      delete g.previewValueText;
      return;
    }
    g.previewValueText = f, delete g.previewValueBool, delete g.previewSignatureUrl;
  }
  function O(a, u) {
    const g = c.fieldState.get(a);
    g && (g.previewValueBool = !!u, delete g.previewValueText, delete g.previewSignatureUrl);
  }
  function R(a, u) {
    const g = c.fieldState.get(a);
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
    getPageMetadata(a) {
      const u = n.viewer.pages?.find((f) => f.page === a);
      if (u)
        return {
          width: u.width,
          height: u.height,
          rotation: u.rotation || 0
        };
      const g = this.pageViewports.get(a);
      return g ? {
        width: g.width,
        height: g.height,
        rotation: g.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(a, u) {
      this.pageViewports.set(a, {
        width: u.width,
        height: u.height,
        rotation: u.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(a, u) {
      const g = a.page, f = this.getPageMetadata(g), v = u.offsetWidth, x = u.offsetHeight, C = a.pageWidth || f.width, M = a.pageHeight || f.height, F = v / C, K = x / M;
      let W = a.posX || 0, ee = a.posY || 0;
      n.viewer.origin === "bottom-left" && (ee = M - ee - (a.height || 30));
      const Ce = W * F, ce = ee * K, Y = (a.width || 150) * F, le = (a.height || 30) * K;
      return {
        left: Ce,
        top: ce,
        width: Y,
        height: le,
        // Store original values for debugging
        _debug: {
          sourceX: W,
          sourceY: ee,
          sourceWidth: a.width,
          sourceHeight: a.height,
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
    getOverlayStyles(a, u) {
      const g = this.pageToScreen(a, u);
      return {
        left: `${Math.round(g.left)}px`,
        top: `${Math.round(g.top)}px`,
        width: `${Math.round(g.width)}px`,
        height: `${Math.round(g.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, G = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(a, u, g, f) {
      const v = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: a,
            sha256: u,
            content_type: g,
            size_bytes: f
          })
        }
      );
      if (!v.ok)
        throw await tt(v, "Failed to get upload contract");
      const x = await v.json(), C = x?.contract || x;
      if (!C || typeof C != "object" || !C.upload_url)
        throw new Error("Invalid upload contract response");
      return C;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(a, u) {
      const g = new URL(a.upload_url, window.location.origin);
      a.upload_token && g.searchParams.set("upload_token", String(a.upload_token)), a.object_key && g.searchParams.set("object_key", String(a.object_key));
      const f = {
        "Content-Type": a.content_type || "image/png"
      };
      a.headers && Object.entries(a.headers).forEach(([x, C]) => {
        const M = String(x).toLowerCase();
        M === "x-esign-upload-token" || M === "x-esign-upload-key" || (f[x] = String(C));
      });
      const v = await fetch(g.toString(), {
        method: a.method || "PUT",
        headers: f,
        body: u,
        credentials: "omit"
      });
      if (!v.ok)
        throw await tt(v, `Upload failed: ${v.status} ${v.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [u, g] = a.split(","), f = u.match(/data:([^;]+)/), v = f ? f[1] : "image/png", x = atob(g), C = new Uint8Array(x.length);
      for (let M = 0; M < x.length; M++)
        C[M] = x.charCodeAt(M);
      return new Blob([C], { type: v });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, u) {
      const g = this.dataUrlToBlob(u), f = g.size, v = "image/png", x = await Tt(g), C = await this.requestUploadBootstrap(
        a,
        x,
        v,
        f
      );
      return await this.uploadToSignedUrl(C, g), {
        uploadToken: C.upload_token,
        objectKey: C.object_key,
        sha256: C.sha256,
        contentType: C.content_type
      };
    }
  }, J = {
    endpoint(a, u = "") {
      const g = encodeURIComponent(a), f = u ? `/${encodeURIComponent(u)}` : "";
      return `${n.apiBasePath}/signatures/${g}${f}`;
    },
    async list(a) {
      const u = new URL(this.endpoint(n.token), window.location.origin);
      u.searchParams.set("type", a);
      const g = await fetch(u.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!g.ok) {
        const v = await g.json().catch(() => ({}));
        throw new Error(v?.error?.message || "Failed to load saved signatures");
      }
      const f = await g.json();
      return Array.isArray(f?.signatures) ? f.signatures : [];
    },
    async save(a, u, g = "") {
      const f = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: a,
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
    async delete(a) {
      const u = await fetch(this.endpoint(n.token, a), {
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
  function Z(a) {
    const u = c.fieldState.get(a);
    return u && u.type === "initials" ? "initials" : "signature";
  }
  function ae(a) {
    return c.savedSignaturesByType.get(a) || [];
  }
  async function ve(a, u = !1) {
    const g = Z(a);
    if (!u && c.savedSignaturesByType.has(g)) {
      de(a);
      return;
    }
    const f = await J.list(g);
    c.savedSignaturesByType.set(g, f), de(a);
  }
  function de(a) {
    const u = Z(a), g = ae(u), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!g.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = g.map((v) => {
        const x = at(String(v?.thumbnail_data_url || v?.data_url || "")), C = at(String(v?.label || "Saved signature")), M = at(String(v?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${C}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${C}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${at(a)}" data-signature-id="${M}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${at(a)}" data-signature-id="${M}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Te(a) {
    const u = c.signatureCanvases.get(a), g = Z(a);
    if (!u || !pn(a))
      throw new Error(`Please add your ${g === "initials" ? "initials" : "signature"} first`);
    const f = u.canvas.toDataURL("image/png"), v = await J.save(g, f, g === "initials" ? "Initials" : "Signature");
    if (!v)
      throw new Error("Failed to save signature");
    const x = ae(g);
    x.unshift(v), c.savedSignaturesByType.set(g, x), de(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function Re(a, u) {
    const g = Z(a), v = ae(g).find((C) => String(C?.id || "") === String(u));
    if (!v) return;
    requestAnimationFrame(() => vt(a)), await _e(a);
    const x = String(v.data_url || v.thumbnail_data_url || "").trim();
    x && (await bt(a, x, { clearStrokes: !0 }), R(a, x), S(), Je("draw", a), he("Saved signature selected."));
  }
  async function Qe(a, u) {
    const g = Z(a);
    await J.delete(u);
    const f = ae(g).filter((v) => String(v?.id || "") !== String(u));
    c.savedSignaturesByType.set(g, f), de(a);
  }
  function Fe(a) {
    const u = String(a?.code || "").trim(), g = String(a?.message || "Unable to update saved signatures"), f = u === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : g;
    window.toastManager && window.toastManager.error(f), he(f, "assertive");
  }
  async function _e(a, u = 8) {
    for (let g = 0; g < u; g++) {
      if (c.signatureCanvases.has(a)) return !0;
      await new Promise((f) => setTimeout(f, 40)), vt(a);
    }
    return !1;
  }
  async function Oe(a, u) {
    const g = String(u?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(g))
      throw new Error("Only PNG and JPEG images are supported");
    if (u.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => vt(a)), await _e(a);
    const f = c.signatureCanvases.get(a);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const v = await ke(u), x = g === "image/png" ? v : await oe(v, f.drawWidth, f.drawHeight);
    if (rn(x) > Ms)
      throw new Error(`Image exceeds ${Math.round(Ms / 1024)}KB limit after conversion`);
    await bt(a, x, { clearStrokes: !0 }), R(a, x), S();
    const M = document.getElementById("sig-upload-preview-wrap"), F = document.getElementById("sig-upload-preview");
    M && M.classList.remove("hidden"), F && F.setAttribute("src", x), he("Signature image uploaded. You can now insert it.");
  }
  function ke(a) {
    return new Promise((u, g) => {
      const f = new FileReader();
      f.onload = () => u(String(f.result || "")), f.onerror = () => g(new Error("Unable to read image file")), f.readAsDataURL(a);
    });
  }
  function rn(a) {
    const u = String(a || "").split(",");
    if (u.length < 2) return 0;
    const g = u[1] || "", f = (g.match(/=+$/) || [""])[0].length;
    return Math.floor(g.length * 3 / 4) - f;
  }
  async function oe(a, u, g) {
    return await new Promise((f, v) => {
      const x = new Image();
      x.onload = () => {
        const C = document.createElement("canvas"), M = Math.max(1, Math.round(Number(u) || 600)), F = Math.max(1, Math.round(Number(g) || 160));
        C.width = M, C.height = F;
        const K = C.getContext("2d");
        if (!K) {
          v(new Error("Unable to process image"));
          return;
        }
        K.clearRect(0, 0, M, F);
        const W = Math.min(M / x.width, F / x.height), ee = x.width * W, Ce = x.height * W, ce = (M - ee) / 2, Y = (F - Ce) / 2;
        K.drawImage(x, ce, Y, ee, Ce), f(C.toDataURL("image/png"));
      }, x.onerror = () => v(new Error("Unable to decode image file")), x.src = a;
    });
  }
  async function Tt(a) {
    if (window.crypto && window.crypto.subtle) {
      const u = await a.arrayBuffer(), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function ci() {
    document.addEventListener("click", (a) => {
      const u = a.target;
      if (!(u instanceof Element)) return;
      const g = u.closest("[data-esign-action]");
      if (!g) return;
      switch (g.getAttribute("data-esign-action")) {
        case "prev-page":
          xe();
          break;
        case "next-page":
          ht();
          break;
        case "zoom-out":
          et();
          break;
        case "zoom-in":
          lt();
          break;
        case "fit-width":
          qt();
          break;
        case "download-document":
          wi();
          break;
        case "show-consent-modal":
          yn();
          break;
        case "activate-field": {
          const v = g.getAttribute("data-field-id");
          v && We(v);
          break;
        }
        case "submit-signature":
          vn();
          break;
        case "show-decline-modal":
          pt();
          break;
        case "close-field-editor":
          Gt();
          break;
        case "save-field-editor":
          fi();
          break;
        case "hide-consent-modal":
          Jt();
          break;
        case "accept-consent":
          j();
          break;
        case "hide-decline-modal":
          Hn();
          break;
        case "confirm-decline":
          vi();
          break;
        case "retry-load-pdf":
          Nt();
          break;
        case "signature-tab": {
          const v = g.getAttribute("data-tab") || "draw", x = g.getAttribute("data-field-id");
          x && Je(v, x);
          break;
        }
        case "clear-signature-canvas": {
          const v = g.getAttribute("data-field-id");
          v && Rn(v);
          break;
        }
        case "undo-signature-canvas": {
          const v = g.getAttribute("data-field-id");
          v && dn(v);
          break;
        }
        case "redo-signature-canvas": {
          const v = g.getAttribute("data-field-id");
          v && un(v);
          break;
        }
        case "save-current-signature-library": {
          const v = g.getAttribute("data-field-id");
          v && Te(v).catch(Fe);
          break;
        }
        case "select-saved-signature": {
          const v = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          v && x && Re(v, x).catch(Fe);
          break;
        }
        case "delete-saved-signature": {
          const v = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          v && x && Qe(v, x).catch(Fe);
          break;
        }
        case "clear-signer-profile":
          Ut().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Ne.togglePanel();
          break;
        case "debug-copy-session":
          Ne.copySessionInfo();
          break;
        case "debug-clear-cache":
          Ne.clearCache();
          break;
        case "debug-show-telemetry":
          Ne.showTelemetry();
          break;
        case "debug-reload-viewer":
          Ne.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const u = a.target;
      if (u instanceof HTMLInputElement) {
        if (u.matches("#sig-upload-input")) {
          const g = u.getAttribute("data-field-id"), f = u.files?.[0];
          if (!g || !f) return;
          Oe(g, f).catch((v) => {
            window.toastManager && window.toastManager.error(v?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (u.matches("#field-checkbox-input")) {
          const g = u.getAttribute("data-field-id") || c.activeFieldId;
          if (!g) return;
          O(g, u.checked), S();
        }
      }
    }), document.addEventListener("input", (a) => {
      const u = a.target;
      if (!(u instanceof HTMLInputElement) && !(u instanceof HTMLTextAreaElement)) return;
      const g = u.getAttribute("data-field-id") || c.activeFieldId;
      if (g) {
        if (u.matches("#sig-type-input")) {
          zt(g, u.value || "", { syncOverlay: !0 });
          return;
        }
        if (u.matches("#field-text-input")) {
          _(g, u.value || ""), S();
          return;
        }
        u.matches("#field-checkbox-input") && u instanceof HTMLInputElement && (O(g, u.checked), S());
      }
    });
  }
  te(async () => {
    ci(), c.isLowMemory = Ze(), Ot(), kt(), await Pn(), an(), N(), nt(), Ye(), await Nt(), ze(), document.addEventListener("visibilitychange", kn), "memory" in navigator && li(), Ne.init();
  });
  function kn() {
    document.hidden && ot();
  }
  function ot() {
    const a = c.isLowMemory ? 1 : 2;
    for (; c.renderedPages.size > a; ) {
      let u = null, g = 1 / 0;
      if (c.renderedPages.forEach((f, v) => {
        v !== c.currentPage && f.timestamp < g && (u = v, g = f.timestamp);
      }), u !== null)
        c.renderedPages.delete(u);
      else
        break;
    }
  }
  function li() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, u = navigator.memory.totalJSHeapSize;
        a / u > 0.8 && (c.isLowMemory = !0, ot());
      }
    }, 3e4);
  }
  function je(a) {
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
  function Ot() {
    const a = document.getElementById("pdf-compatibility-banner"), u = document.getElementById("pdf-compatibility-message"), g = document.getElementById("pdf-compatibility-title");
    if (!a || !u || !g) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), v = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      a.classList.add("hidden");
      return;
    }
    g.textContent = "Preview Compatibility Notice", u.textContent = String(n.viewer.compatibilityMessage || "").trim() || je(v), a.classList.remove("hidden"), p.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: v });
  }
  function kt() {
    const a = document.getElementById("stage-state-banner"), u = document.getElementById("stage-state-icon"), g = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), v = document.getElementById("stage-state-meta");
    if (!a || !u || !g || !f || !v) return;
    const x = n.signerState || "active", C = n.recipientStage || 1, M = n.activeStage || 1, F = n.activeRecipientIds || [], K = n.waitingForRecipientIds || [];
    let W = {
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
        W = {
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
        }, K.length > 0 && W.badges.push({
          icon: "iconoir-group",
          text: `${K.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        W = {
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
        W = {
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
        F.length > 1 ? (W.message = `You and ${F.length - 1} other signer(s) can sign now.`, W.badges = [
          { icon: "iconoir-users", text: `Stage ${M} active`, variant: "green" }
        ]) : C > 1 ? W.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${C}`, variant: "green" }
        ] : W.hidden = !0;
        break;
    }
    if (W.hidden) {
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${W.bgClass} ${W.borderClass}`, u.className = `${W.iconClass} mt-0.5`, g.className = `text-sm font-semibold ${W.titleClass}`, g.textContent = W.title, f.className = `text-xs ${W.messageClass} mt-1`, f.textContent = W.message, v.innerHTML = "", W.badges.forEach((ee) => {
      const Ce = document.createElement("span"), ce = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      Ce.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ce[ee.variant] || ce.blue}`, Ce.innerHTML = `<i class="${ee.icon} mr-1"></i>${ee.text}`, v.appendChild(Ce);
    });
  }
  function an() {
    n.fields.forEach((a) => {
      let u = null, g = !1;
      if (a.type === "checkbox")
        u = a.value_bool || !1, g = u;
      else if (a.type === "date_signed")
        u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], g = !0;
      else {
        const f = String(a.value_text || "");
        u = f || di(a), g = !!f;
      }
      c.fieldState.set(a.id, {
        id: a.id,
        type: a.type,
        page: a.page || 1,
        required: a.required,
        value: u,
        completed: g,
        hasError: !1,
        lastError: null,
        // Geometry metadata (will be populated from backend in Phase 18.BE.3)
        posX: a.pos_x || 0,
        posY: a.pos_y || 0,
        width: a.width || 150,
        height: a.height || 30,
        tabIndex: Number(a.tab_index || 0) || 0
      });
    });
  }
  async function Pn() {
    try {
      const a = await d.load(c.profileKey);
      a && (c.profileData = a, c.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function di(a) {
    const u = c.profileData;
    if (!u) return "";
    const g = String(a?.type || "").trim();
    return g === "name" ? Be(u.fullName || "") : g === "initials" ? Be(u.initials || "") || Ui(u.fullName || n.recipientName || "") : g === "signature" ? Be(u.typedSignature || "") : "";
  }
  function ui(a) {
    return !n.profile.persistDrawnSignature || !c.profileData ? "" : a?.type === "initials" && String(c.profileData.drawnInitialsDataUrl || "").trim() || String(c.profileData.drawnSignatureDataUrl || "").trim();
  }
  function pi(a) {
    const u = Be(a?.value || "");
    return u || (c.profileData ? a?.type === "initials" ? Be(c.profileData.initials || "") || Ui(c.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? Be(c.profileData.typedSignature || "") : "" : "");
  }
  function _n() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : c.profileRemember;
  }
  async function Ut(a = !1) {
    let u = null;
    try {
      await d.clear(c.profileKey);
    } catch (g) {
      u = g;
    } finally {
      c.profileData = null, c.profileRemember = n.profile.rememberByDefault;
    }
    if (u) {
      if (!a && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !a)
        throw u;
      return;
    }
    !a && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Dn(a, u = {}) {
    const g = _n();
    if (c.profileRemember = g, !g) {
      await Ut(!0);
      return;
    }
    if (!a) return;
    const f = {
      remember: !0
    }, v = String(a.type || "");
    if (v === "name" && typeof a.value == "string") {
      const x = Be(a.value);
      x && (f.fullName = x, (c.profileData?.initials || "").trim() || (f.initials = Ui(x)));
    }
    if (v === "initials") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = u.signatureDataUrl;
      else if (typeof a.value == "string") {
        const x = Be(a.value);
        x && (f.initials = x);
      }
    }
    if (v === "signature") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnSignatureDataUrl = u.signatureDataUrl;
      else if (typeof a.value == "string") {
        const x = Be(a.value);
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
  function N() {
    const a = document.getElementById("consent-checkbox"), u = document.getElementById("consent-accept-btn");
    a && u && a.addEventListener("change", function() {
      u.disabled = !this.checked;
    });
  }
  function Ze() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function ge() {
    const a = c.isLowMemory ? 3 : c.maxCachedPages;
    if (c.renderedPages.size <= a) return;
    const u = [];
    for (c.renderedPages.forEach((g, f) => {
      const v = Math.abs(f - c.currentPage);
      u.push({ pageNum: f, distance: v });
    }), u.sort((g, f) => f.distance - g.distance); c.renderedPages.size > a && u.length > 0; ) {
      const g = u.shift();
      g && g.pageNum !== c.currentPage && c.renderedPages.delete(g.pageNum);
    }
  }
  function mt(a) {
    if (c.isLowMemory) return;
    const u = [];
    a > 1 && u.push(a - 1), a < n.pageCount && u.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      u.forEach(async (g) => {
        !c.renderedPages.has(g) && !c.pageRendering && await gi(g);
      });
    }, { timeout: 2e3 });
  }
  async function gi(a) {
    if (!(!c.pdfDoc || c.renderedPages.has(a)))
      try {
        const u = await c.pdfDoc.getPage(a), g = c.zoomLevel, f = u.getViewport({ scale: g * window.devicePixelRatio }), v = document.createElement("canvas"), x = v.getContext("2d");
        v.width = f.width, v.height = f.height;
        const C = {
          canvasContext: x,
          viewport: f
        };
        await u.render(C).promise, c.renderedPages.set(a, {
          canvas: v,
          scale: g,
          timestamp: Date.now()
        }), ge();
      } catch (u) {
        console.warn("Preload failed for page", a, u);
      }
  }
  function Mn() {
    const a = window.devicePixelRatio || 1;
    return c.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function Nt() {
    const a = document.getElementById("pdf-loading"), u = Date.now();
    try {
      const g = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!g.ok)
        throw new Error("Failed to load document");
      const v = (await g.json()).assets || {}, x = v.source_url || v.executed_url || v.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const C = pdfjsLib.getDocument(x);
      c.pdfDoc = await C.promise, n.pageCount = c.pdfDoc.numPages, document.getElementById("page-count").textContent = c.pdfDoc.numPages, await Pt(1), Ge(), p.trackViewerLoad(!0, Date.now() - u), p.trackPageView(1);
    } catch (g) {
      console.error("PDF load error:", g), p.trackViewerLoad(!1, Date.now() - u, g.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), bi();
    }
  }
  async function Pt(a) {
    if (!c.pdfDoc) return;
    const u = c.renderedPages.get(a);
    if (u && u.scale === c.zoomLevel) {
      mi(u), c.currentPage = a, document.getElementById("current-page").textContent = a, Ge(), ze(), mt(a);
      return;
    }
    c.pageRendering = !0;
    try {
      const g = await c.pdfDoc.getPage(a), f = c.zoomLevel, v = Mn(), x = g.getViewport({ scale: f * v }), C = g.getViewport({ scale: 1 });
      B.setPageViewport(a, {
        width: C.width,
        height: C.height,
        rotation: C.rotation || 0
      });
      const M = document.getElementById("pdf-page-1");
      M.innerHTML = "";
      const F = document.createElement("canvas"), K = F.getContext("2d");
      F.height = x.height, F.width = x.width, F.style.width = `${x.width / v}px`, F.style.height = `${x.height / v}px`, M.appendChild(F);
      const W = document.getElementById("pdf-container");
      W.style.width = `${x.width / v}px`;
      const ee = {
        canvasContext: K,
        viewport: x
      };
      await g.render(ee).promise, c.renderedPages.set(a, {
        canvas: F.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / v,
        displayHeight: x.height / v
      }), c.renderedPages.get(a).canvas.getContext("2d").drawImage(F, 0, 0), ge(), c.currentPage = a, document.getElementById("current-page").textContent = a, Ge(), ze(), p.trackPageView(a), mt(a);
    } catch (g) {
      console.error("Page render error:", g);
    } finally {
      if (c.pageRendering = !1, c.pageNumPending !== null) {
        const g = c.pageNumPending;
        c.pageNumPending = null, await Pt(g);
      }
    }
  }
  function mi(a, u) {
    const g = document.getElementById("pdf-page-1");
    g.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = a.canvas.width, f.height = a.canvas.height, f.style.width = `${a.displayWidth}px`, f.style.height = `${a.displayHeight}px`, f.getContext("2d").drawImage(a.canvas, 0, 0), g.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${a.displayWidth}px`;
  }
  function ct(a) {
    c.pageRendering ? c.pageNumPending = a : Pt(a);
  }
  function Ht(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? Be(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? Be(a.value) : "";
  }
  function $n(a, u, g, f = !1) {
    const v = document.createElement("img");
    v.className = "field-overlay-preview", v.src = u, v.alt = g, a.appendChild(v), a.classList.add("has-preview"), f && a.classList.add("draft-preview");
  }
  function _t(a, u, g = !1, f = !1) {
    const v = document.createElement("span");
    v.className = "field-overlay-value", g && v.classList.add("font-signature"), v.textContent = u, a.appendChild(v), a.classList.add("has-value"), f && a.classList.add("draft-preview");
  }
  function Se(a, u) {
    const g = document.createElement("span");
    g.className = "field-overlay-label", g.textContent = u, a.appendChild(g);
  }
  function ze() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const u = document.getElementById("pdf-container");
    c.fieldState.forEach((g, f) => {
      if (g.page !== c.currentPage) return;
      const v = document.createElement("div");
      if (v.className = "field-overlay", v.dataset.fieldId = f, g.required && v.classList.add("required"), g.completed && v.classList.add("completed"), c.activeFieldId === f && v.classList.add("active"), g.posX != null && g.posY != null && g.width != null && g.height != null) {
        const ee = B.getOverlayStyles(g, u);
        v.style.left = ee.left, v.style.top = ee.top, v.style.width = ee.width, v.style.height = ee.height, v.style.transform = ee.transform, Ne.enabled && (v.dataset.debugCoords = JSON.stringify(
          B.pageToScreen(g, u)._debug
        ));
      } else {
        const ee = Array.from(c.fieldState.keys()).indexOf(f);
        v.style.left = "10px", v.style.top = `${100 + ee * 50}px`, v.style.width = "150px", v.style.height = "30px";
      }
      const C = String(g.previewSignatureUrl || "").trim(), M = String(g.signaturePreviewUrl || "").trim(), F = Ht(g), K = g.type === "signature" || g.type === "initials", W = typeof g.previewValueBool == "boolean";
      if (C)
        $n(v, C, Ve(g.type), !0);
      else if (g.completed && M)
        $n(v, M, Ve(g.type));
      else if (F) {
        const ee = typeof g.previewValueText == "string" && g.previewValueText.trim() !== "";
        _t(v, F, K, ee);
      } else g.type === "checkbox" && (W ? g.previewValueBool : !!g.value) ? _t(v, "Checked", !1, W) : Se(v, Ve(g.type));
      v.setAttribute("tabindex", "0"), v.setAttribute("role", "button"), v.setAttribute("aria-label", `${Ve(g.type)} field${g.required ? ", required" : ""}${g.completed ? ", completed" : ""}`), v.addEventListener("click", () => We(f)), v.addEventListener("keydown", (ee) => {
        (ee.key === "Enter" || ee.key === " ") && (ee.preventDefault(), We(f));
      }), a.appendChild(v);
    });
  }
  function Ve(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function xe() {
    c.currentPage <= 1 || ct(c.currentPage - 1);
  }
  function ht() {
    c.currentPage >= n.pageCount || ct(c.currentPage + 1);
  }
  function on(a) {
    a < 1 || a > n.pageCount || ct(a);
  }
  function Ge() {
    document.getElementById("prev-page-btn").disabled = c.currentPage <= 1, document.getElementById("next-page-btn").disabled = c.currentPage >= n.pageCount;
  }
  function lt() {
    c.zoomLevel = Math.min(c.zoomLevel + 0.25, 3), jt(), ct(c.currentPage);
  }
  function et() {
    c.zoomLevel = Math.max(c.zoomLevel - 0.25, 0.5), jt(), ct(c.currentPage);
  }
  function qt() {
    const u = document.getElementById("viewer-content").offsetWidth - 32, g = 612;
    c.zoomLevel = u / g, jt(), ct(c.currentPage);
  }
  function jt() {
    document.getElementById("zoom-level").textContent = `${Math.round(c.zoomLevel * 100)}%`;
  }
  function We(a) {
    if (!c.hasConsented && n.fields.some((u) => u.id === a && u.type !== "date_signed")) {
      yn();
      return;
    }
    Pe(a, { openEditor: !0 });
  }
  function Pe(a, u = { openEditor: !0 }) {
    const g = c.fieldState.get(a);
    if (g) {
      if (u.openEditor && (c.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), g.page !== c.currentPage && on(g.page), !u.openEditor) {
        cn(a);
        return;
      }
      g.type !== "date_signed" && Bn(a);
    }
  }
  function cn(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Bn(a) {
    const u = c.fieldState.get(a);
    if (!u) return;
    const g = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), v = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    v.textContent = ft(u.type), f.innerHTML = Dt(u), x?.classList.toggle("hidden", !(u.type === "signature" || u.type === "initials")), (u.type === "signature" || u.type === "initials") && yt(a), g.classList.add("active"), g.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Le(g.querySelector(".field-editor")), he(`Editing ${ft(u.type)}. Press Escape to cancel.`), setTimeout(() => {
      const C = f.querySelector("input, textarea");
      C ? C.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), De(c.writeCooldownUntil) > 0 && mn(De(c.writeCooldownUntil));
  }
  function ft(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function Dt(a) {
    const u = ln(a.type), g = at(String(a?.id || "")), f = at(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const v = a.type === "initials" ? "initials" : "signature", x = at(pi(a)), C = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], M = dt(a.id);
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
              placeholder="Type your ${v}"
              value="${x}"
              data-field-id="${g}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${g}">${x}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${v} will appear as your ${f}</p>
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
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${v} using mouse or touch</p>
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
              <p class="text-xs text-gray-500">Saved ${v}s</p>
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
    if (a.type === "name")
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${at(String(a.value || ""))}"
          data-field-id="${g}"
        />
        ${u}
      `;
    if (a.type === "text") {
      const v = at(String(a.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${g}"
        >${v}</textarea>
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
  function ln(a) {
    return a === "name" || a === "initials" || a === "signature" ? `
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
  function zt(a, u, g = { syncOverlay: !1 }) {
    const f = document.getElementById("sig-type-preview"), v = c.fieldState.get(a);
    if (!v) return;
    const x = Be(String(u || "").trim());
    if (g?.syncOverlay && (x ? _(a, x) : b(a), S()), !!f) {
      if (x) {
        f.textContent = x;
        return;
      }
      f.textContent = v.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function dt(a) {
    const u = String(c.signatureTabByField.get(a) || "").trim();
    return u === "draw" || u === "type" || u === "upload" || u === "saved" ? u : "draw";
  }
  function Je(a, u) {
    const g = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    c.signatureTabByField.set(u, g), document.querySelectorAll(".sig-editor-tab").forEach((v) => {
      v.classList.remove("border-blue-600", "text-blue-600"), v.classList.add("border-transparent", "text-gray-500"), v.setAttribute("aria-selected", "false"), v.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${g}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", g !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", g !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", g !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", g !== "saved"), (g === "draw" || g === "upload" || g === "saved") && f && requestAnimationFrame(() => vt(u)), g === "type") {
      const v = document.getElementById("sig-type-input");
      zt(u, v?.value || "");
    }
    g === "saved" && ve(u).catch(Fe);
  }
  function yt(a) {
    c.signatureTabByField.set(a, "draw"), Je("draw", a);
    const u = document.getElementById("sig-type-input");
    u && zt(a, u.value || "");
  }
  function vt(a) {
    const u = document.getElementById("sig-draw-canvas");
    if (!u || c.signatureCanvases.has(a)) return;
    const g = u.closest(".signature-canvas-container"), f = u.getContext("2d");
    if (!f) return;
    const v = u.getBoundingClientRect();
    if (!v.width || !v.height) return;
    const x = window.devicePixelRatio || 1;
    u.width = v.width * x, u.height = v.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let C = !1, M = 0, F = 0, K = [];
    const W = (Y) => {
      const le = u.getBoundingClientRect();
      let it, Ke;
      return Y.touches && Y.touches.length > 0 ? (it = Y.touches[0].clientX, Ke = Y.touches[0].clientY) : Y.changedTouches && Y.changedTouches.length > 0 ? (it = Y.changedTouches[0].clientX, Ke = Y.changedTouches[0].clientY) : (it = Y.clientX, Ke = Y.clientY), {
        x: it - le.left,
        y: Ke - le.top,
        timestamp: Date.now()
      };
    }, ee = (Y) => {
      C = !0;
      const le = W(Y);
      M = le.x, F = le.y, K = [{ x: le.x, y: le.y, t: le.timestamp, width: 2.5 }], g && g.classList.add("drawing");
    }, Ce = (Y) => {
      if (!C) return;
      const le = W(Y);
      K.push({ x: le.x, y: le.y, t: le.timestamp, width: 2.5 });
      const it = le.x - M, Ke = le.y - F, wn = le.timestamp - (K[K.length - 2]?.t || le.timestamp), Xt = Math.sqrt(it * it + Ke * Ke) / Math.max(wn, 1), Si = 2.5, jn = 1.5, Sn = 4, xi = Math.min(Xt / 5, 1), zn = Math.max(jn, Math.min(Sn, Si - xi * 1.5));
      K[K.length - 1].width = zn, f.lineWidth = zn, f.beginPath(), f.moveTo(M, F), f.lineTo(le.x, le.y), f.stroke(), M = le.x, F = le.y;
    }, ce = () => {
      if (C = !1, K.length > 1) {
        const Y = c.signatureCanvases.get(a);
        Y && (Y.strokes.push(K.map((le) => ({ ...le }))), Y.redoStack = []), gn(a);
      }
      K = [], g && g.classList.remove("drawing");
    };
    u.addEventListener("mousedown", ee), u.addEventListener("mousemove", Ce), u.addEventListener("mouseup", ce), u.addEventListener("mouseout", ce), u.addEventListener("touchstart", (Y) => {
      Y.preventDefault(), Y.stopPropagation(), ee(Y);
    }, { passive: !1 }), u.addEventListener("touchmove", (Y) => {
      Y.preventDefault(), Y.stopPropagation(), Ce(Y);
    }, { passive: !1 }), u.addEventListener("touchend", (Y) => {
      Y.preventDefault(), ce();
    }, { passive: !1 }), u.addEventListener("touchcancel", ce), u.addEventListener("gesturestart", (Y) => Y.preventDefault()), u.addEventListener("gesturechange", (Y) => Y.preventDefault()), u.addEventListener("gestureend", (Y) => Y.preventDefault()), c.signatureCanvases.set(a, {
      canvas: u,
      ctx: f,
      dpr: x,
      drawWidth: v.width,
      drawHeight: v.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Vt(a);
  }
  function Vt(a) {
    const u = c.signatureCanvases.get(a), g = c.fieldState.get(a);
    if (!u || !g) return;
    const f = ui(g);
    f && bt(a, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function bt(a, u, g = { clearStrokes: !1 }) {
    const f = c.signatureCanvases.get(a);
    if (!f) return !1;
    const v = String(u || "").trim();
    if (!v)
      return f.baseImageDataUrl = "", f.baseImage = null, g.clearStrokes && (f.strokes = [], f.redoStack = []), Ue(a), !0;
    const { drawWidth: x, drawHeight: C } = f, M = new Image();
    return await new Promise((F) => {
      M.onload = () => {
        g.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = M, f.baseImageDataUrl = v, x > 0 && C > 0 && Ue(a), F(!0);
      }, M.onerror = () => F(!1), M.src = v;
    });
  }
  function Ue(a) {
    const u = c.signatureCanvases.get(a);
    if (!u) return;
    const { ctx: g, drawWidth: f, drawHeight: v, baseImage: x, strokes: C } = u;
    if (g.clearRect(0, 0, f, v), x) {
      const M = Math.min(f / x.width, v / x.height), F = x.width * M, K = x.height * M, W = (f - F) / 2, ee = (v - K) / 2;
      g.drawImage(x, W, ee, F, K);
    }
    for (const M of C)
      for (let F = 1; F < M.length; F++) {
        const K = M[F - 1], W = M[F];
        g.lineWidth = Number(W.width || 2.5) || 2.5, g.beginPath(), g.moveTo(K.x, K.y), g.lineTo(W.x, W.y), g.stroke();
      }
  }
  function dn(a) {
    const u = c.signatureCanvases.get(a);
    if (!u || u.strokes.length === 0) return;
    const g = u.strokes.pop();
    g && u.redoStack.push(g), Ue(a), gn(a);
  }
  function un(a) {
    const u = c.signatureCanvases.get(a);
    if (!u || u.redoStack.length === 0) return;
    const g = u.redoStack.pop();
    g && u.strokes.push(g), Ue(a), gn(a);
  }
  function pn(a) {
    const u = c.signatureCanvases.get(a);
    if (!u) return !1;
    if ((u.baseImageDataUrl || "").trim() || u.strokes.length > 0) return !0;
    const { canvas: g, ctx: f } = u;
    return f.getImageData(0, 0, g.width, g.height).data.some((x, C) => C % 4 === 3 && x > 0);
  }
  function gn(a) {
    const u = c.signatureCanvases.get(a);
    u && (pn(a) ? R(a, u.canvas.toDataURL("image/png")) : b(a), S());
  }
  function Rn(a) {
    const u = c.signatureCanvases.get(a);
    u && (u.strokes = [], u.redoStack = [], u.baseImage = null, u.baseImageDataUrl = "", Ue(a)), b(a), S();
    const g = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    g && g.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function Gt() {
    const a = document.getElementById("field-editor-overlay"), u = a.querySelector(".field-editor");
    if (Yt(u), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", c.activeFieldId) {
      const g = document.querySelector(`.field-list-item[data-field-id="${c.activeFieldId}"]`);
      requestAnimationFrame(() => {
        g?.focus();
      });
    }
    E(), S(), c.activeFieldId = null, c.signatureCanvases.clear(), he("Field editor closed.");
  }
  function De(a) {
    const u = Number(a) || 0;
    return u <= 0 ? 0 : Math.max(0, Math.ceil((u - Date.now()) / 1e3));
  }
  function hi(a, u = {}) {
    const g = Number(u.retry_after_seconds);
    if (Number.isFinite(g) && g > 0)
      return Math.ceil(g);
    const f = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const v = Number(f);
    return Number.isFinite(v) && v > 0 ? Math.ceil(v) : 0;
  }
  async function tt(a, u) {
    let g = {};
    try {
      g = await a.json();
    } catch {
      g = {};
    }
    const f = g?.error || {}, v = f?.details && typeof f.details == "object" ? f.details : {}, x = hi(a, v), C = a?.status === 429, M = C ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || u || "Request failed"), F = new Error(M);
    return F.status = a?.status || 0, F.code = String(f?.code || ""), F.details = v, F.rateLimited = C, F.retryAfterSeconds = x, F;
  }
  function mn(a) {
    const u = Math.max(1, Number(a) || 1);
    c.writeCooldownUntil = Date.now() + u * 1e3, c.writeCooldownTimer && (clearInterval(c.writeCooldownTimer), c.writeCooldownTimer = null);
    const g = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const v = De(c.writeCooldownUntil);
      if (v <= 0) {
        c.pendingSaves.has(c.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), c.writeCooldownTimer && (clearInterval(c.writeCooldownTimer), c.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${v}s`;
    };
    g(), c.writeCooldownTimer = setInterval(g, 250);
  }
  function Fn(a) {
    const u = Math.max(1, Number(a) || 1);
    c.submitCooldownUntil = Date.now() + u * 1e3, c.submitCooldownTimer && (clearInterval(c.submitCooldownTimer), c.submitCooldownTimer = null);
    const g = () => {
      const f = De(c.submitCooldownUntil);
      Ye(), f <= 0 && c.submitCooldownTimer && (clearInterval(c.submitCooldownTimer), c.submitCooldownTimer = null);
    };
    g(), c.submitCooldownTimer = setInterval(g, 250);
  }
  async function fi() {
    const a = c.activeFieldId;
    if (!a) return;
    const u = c.fieldState.get(a);
    if (!u) return;
    const g = De(c.writeCooldownUntil);
    if (g > 0) {
      const v = `Please wait ${g}s before saving again.`;
      window.toastManager && window.toastManager.error(v), he(v, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      c.profileRemember = _n();
      let v = !1;
      if (u.type === "signature" || u.type === "initials")
        v = await me(a);
      else if (u.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        v = await hn(a, null, x?.checked || !1);
      } else {
        const C = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!C && u.required)
          throw new Error("This field is required");
        v = await hn(a, C, null);
      }
      if (v) {
        Gt(), nt(), Ye(), bn(), ze(), yi(a), ut(a);
        const x = qn();
        x.allRequiredComplete ? he("Field saved. All required fields complete. Ready to submit.") : he(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (v) {
      v?.rateLimited && mn(v.retryAfterSeconds), window.toastManager && window.toastManager.error(v.message), he(`Error saving field: ${v.message}`, "assertive");
    } finally {
      if (De(c.writeCooldownUntil) > 0) {
        const v = De(c.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${v}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function me(a) {
    const u = c.fieldState.get(a), g = document.getElementById("sig-type-input"), f = dt(a);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = c.signatureCanvases.get(a);
      if (!x) return !1;
      if (!pn(a))
        throw new Error(u?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const C = x.canvas.toDataURL("image/png");
      return await fn(a, { type: "drawn", dataUrl: C }, u?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = g?.value?.trim();
      if (!x)
        throw new Error(u?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return u.type === "initials" ? await hn(a, x, null) : await fn(a, { type: "typed", text: x }, x);
    }
  }
  async function hn(a, u, g) {
    c.pendingSaves.add(a);
    const f = Date.now(), v = c.fieldState.get(a);
    try {
      const x = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: a,
          value_text: u,
          value_bool: g
        })
      });
      if (!x.ok)
        throw await tt(x, "Failed to save field");
      const C = c.fieldState.get(a);
      return C && (C.value = u ?? g, C.completed = !0, C.hasError = !1), await Dn(C), window.toastManager && window.toastManager.success("Field saved"), p.trackFieldSave(a, C?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const C = c.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = x.message), p.trackFieldSave(a, v?.type, !1, Date.now() - f, x.message), x;
    } finally {
      c.pendingSaves.delete(a);
    }
  }
  async function fn(a, u, g) {
    c.pendingSaves.add(a);
    const f = Date.now(), v = u?.type || "typed";
    try {
      let x;
      if (v === "drawn") {
        const F = await G.uploadDrawnSignature(
          a,
          u.dataUrl
        );
        x = {
          field_instance_id: a,
          type: "drawn",
          value_text: g,
          object_key: F.objectKey,
          sha256: F.sha256,
          upload_token: F.uploadToken
        };
      } else
        x = await On(a, g);
      const C = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!C.ok)
        throw await tt(C, "Failed to save signature");
      const M = c.fieldState.get(a);
      return M && (M.value = g, M.completed = !0, M.hasError = !1, u?.dataUrl && (M.signaturePreviewUrl = u.dataUrl)), await Dn(M, {
        signatureType: v,
        signatureDataUrl: u?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), p.trackSignatureAttach(a, v, !0, Date.now() - f), !0;
    } catch (x) {
      const C = c.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = x.message), p.trackSignatureAttach(a, v, !1, Date.now() - f, x.message), x;
    } finally {
      c.pendingSaves.delete(a);
    }
  }
  async function On(a, u) {
    const g = `${u}|${a}`, f = await Un(g), v = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: u,
      object_key: v,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Un(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const u = new TextEncoder().encode(a), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function nt() {
    let a = 0;
    c.fieldState.forEach((M) => {
      M.required, M.completed && a++;
    });
    const u = c.fieldState.size, g = u > 0 ? a / u * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = u;
    const f = document.getElementById("progress-ring-circle"), v = 97.4, x = v - g / 100 * v;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${g}%`;
    const C = u - a;
    document.getElementById("fields-status").textContent = C > 0 ? `${C} remaining` : "All complete";
  }
  function Ye() {
    const a = document.getElementById("submit-btn"), u = document.getElementById("incomplete-warning"), g = document.getElementById("incomplete-message"), f = De(c.submitCooldownUntil);
    let v = [], x = !1;
    c.fieldState.forEach((M, F) => {
      M.required && !M.completed && v.push(M), M.hasError && (x = !0);
    });
    const C = c.hasConsented && v.length === 0 && !x && c.pendingSaves.size === 0 && f === 0 && !c.isSubmitting;
    a.disabled = !C, !c.isSubmitting && f > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !c.isSubmitting && f === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), c.hasConsented ? f > 0 ? (u.classList.remove("hidden"), g.textContent = `Please wait ${f}s before submitting again.`) : x ? (u.classList.remove("hidden"), g.textContent = "Some fields failed to save. Please retry.") : v.length > 0 ? (u.classList.remove("hidden"), g.textContent = `Complete ${v.length} required field${v.length > 1 ? "s" : ""}`) : u.classList.add("hidden") : (u.classList.remove("hidden"), g.textContent = "Please accept the consent agreement");
  }
  function yi(a) {
    const u = c.fieldState.get(a), g = document.querySelector(`.field-list-item[data-field-id="${a}"]`);
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
  function Wt() {
    const a = Array.from(c.fieldState.values()).filter((u) => u.required);
    return a.sort((u, g) => {
      const f = Number(u.page || 0), v = Number(g.page || 0);
      if (f !== v) return f - v;
      const x = Number(u.tabIndex || 0), C = Number(g.tabIndex || 0);
      if (x > 0 && C > 0 && x !== C) return x - C;
      if (x > 0 != C > 0) return x > 0 ? -1 : 1;
      const M = Number(u.posY || 0), F = Number(g.posY || 0);
      if (M !== F) return M - F;
      const K = Number(u.posX || 0), W = Number(g.posX || 0);
      return K !== W ? K - W : String(u.id || "").localeCompare(String(g.id || ""));
    }), a;
  }
  function Nn(a) {
    c.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function ut(a) {
    const u = Wt(), g = u.filter((C) => !C.completed);
    if (g.length === 0) {
      p.track("guided_next_none_remaining", { fromFieldId: a });
      const C = document.getElementById("submit-btn");
      C?.scrollIntoView({ behavior: "smooth", block: "nearest" }), C?.focus(), he("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const f = u.findIndex((C) => String(C.id) === String(a));
    let v = null;
    if (f >= 0) {
      for (let C = f + 1; C < u.length; C++)
        if (!u[C].completed) {
          v = u[C];
          break;
        }
    }
    if (v || (v = g[0]), !v) return;
    p.track("guided_next_started", { fromFieldId: a, toFieldId: v.id });
    const x = Number(v.page || 1);
    x !== c.currentPage && on(x), Pe(v.id, { openEditor: !1 }), Nn(v.id), setTimeout(() => {
      Nn(v.id), cn(v.id), p.track("guided_next_completed", { toFieldId: v.id, page: v.page }), he(`Next required field highlighted on page ${v.page}.`);
    }, 120);
  }
  function yn() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Le(a.querySelector(".field-editor")), he("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Jt() {
    const a = document.getElementById("consent-modal"), u = a.querySelector(".field-editor");
    Yt(u), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", he("Consent dialog closed.");
  }
  async function j() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const u = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!u.ok)
        throw await tt(u, "Failed to accept consent");
      c.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Jt(), Ye(), bn(), p.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), he("Consent accepted. You can now complete the fields and submit.");
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message), he(`Error: ${u.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function vn() {
    const a = document.getElementById("submit-btn"), u = De(c.submitCooldownUntil);
    if (u > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${u}s before submitting again.`), Ye();
      return;
    }
    c.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const g = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": g }
      });
      if (!f.ok)
        throw await tt(f, "Failed to submit");
      p.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (g) {
      p.trackSubmit(!1, g.message), g?.rateLimited && Fn(g.retryAfterSeconds), window.toastManager && window.toastManager.error(g.message);
    } finally {
      c.isSubmitting = !1, Ye();
    }
  }
  function pt() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Le(a.querySelector(".field-editor")), he("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Hn() {
    const a = document.getElementById("decline-modal"), u = a.querySelector(".field-editor");
    Yt(u), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", he("Decline dialog closed.");
  }
  async function vi() {
    const a = document.getElementById("decline-reason").value;
    try {
      const u = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!u.ok)
        throw await tt(u, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message);
    }
  }
  function bi() {
    p.trackDegradedMode("viewer_load_failure"), p.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function wi() {
    try {
      const a = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!a.ok) throw new Error("Document unavailable");
      const g = (await a.json()).assets || {}, f = g.source_url || g.executed_url || g.certificate_url;
      if (f)
        window.open(f, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (a) {
      window.toastManager && window.toastManager.error(a.message || "Unable to download document");
    }
  }
  const Ne = {
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
      const a = this.panel.querySelector(".debug-toggle"), u = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (a.textContent = "+", u.style.display = "none") : (a.textContent = "−", u.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const a = c.fieldState;
      let u = 0;
      a?.forEach((f) => {
        f.completed && u++;
      }), document.getElementById("debug-consent").textContent = c.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${c.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${u}/${a?.size || 0}`, document.getElementById("debug-cached").textContent = c.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = c.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${c.isLowMemory ? "warning" : ""}`;
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
          fields: Array.from(c.fieldState?.entries() || []).map(([a, u]) => ({
            id: a,
            type: u.type,
            completed: u.completed,
            hasError: u.hasError
          })),
          telemetry: p.getSessionSummary(),
          errors: p.metrics.errorsEncountered
        }),
        getEvents: () => p.events,
        forceError: (a) => {
          p.track("debug_forced_error", { message: a }), console.error("[E-Sign Debug] Forced error:", a);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), Nt();
        },
        setLowMemory: (a) => {
          c.isLowMemory = a, ge(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Nt(), this.updatePanel();
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
  function he(a, u = "polite") {
    const g = u === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    g && (g.textContent = "", requestAnimationFrame(() => {
      g.textContent = a;
    }));
  }
  function Le(a) {
    const g = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = g[0], v = g[g.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function x(C) {
      C.key === "Tab" && (C.shiftKey ? document.activeElement === f && (C.preventDefault(), v?.focus()) : document.activeElement === v && (C.preventDefault(), f?.focus()));
    }
    a.addEventListener("keydown", x), a._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function Yt(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const u = a.dataset.previousFocus;
    if (u) {
      const g = document.getElementById(u);
      requestAnimationFrame(() => {
        g?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function bn() {
    const a = qn(), u = document.getElementById("submit-status");
    u && (a.allRequiredComplete && c.hasConsented ? u.textContent = "All required fields complete. You can now submit." : c.hasConsented ? u.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : u.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function qn() {
    let a = 0, u = 0, g = 0;
    return c.fieldState.forEach((f) => {
      f.required && u++, f.completed && a++, f.required && !f.completed && g++;
    }), {
      completed: a,
      required: u,
      remainingRequired: g,
      total: c.fieldState.size,
      allRequiredComplete: g === 0
    };
  }
  function Kt(a, u = 1) {
    const g = Array.from(c.fieldState.keys()), f = g.indexOf(a);
    if (f === -1) return null;
    const v = f + u;
    return v >= 0 && v < g.length ? g[v] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (Gt(), Jt(), Hn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const u = Array.from(document.querySelectorAll(".sig-editor-tab")), g = u.indexOf(a.target);
      if (g !== -1) {
        let f = g;
        if (a.key === "ArrowRight" && (f = (g + 1) % u.length), a.key === "ArrowLeft" && (f = (g - 1 + u.length) % u.length), a.key === "Home" && (f = 0), a.key === "End" && (f = u.length - 1), f !== g) {
          a.preventDefault();
          const v = u[f], x = v.getAttribute("data-tab") || "draw", C = v.getAttribute("data-field-id");
          C && Je(x, C), v.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const u = a.target.dataset.fieldId, g = a.key === "ArrowDown" ? 1 : -1, f = Kt(u, g);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const u = a.target.dataset.fieldId;
        u && We(u);
      }
    }
    a.key === "Tab" && !a.target.closest(".field-editor-overlay") && !a.target.closest("#consent-modal") && a.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(a) {
    a.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Ys {
  constructor(e) {
    this.config = e;
  }
  init() {
    Ba(this.config);
  }
  destroy() {
  }
}
function qo(i) {
  const e = new Ys(i);
  return te(() => e.init()), e;
}
function Ra() {
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
  const e = Ra();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Ys(e);
  t.init(), window.esignSignerReviewController = t;
});
class Ks {
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
    Ft('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Ft('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function jo(i = {}) {
  const e = new Ks(i);
  return te(() => e.init()), e;
}
function zo(i = {}) {
  const e = new Ks(i);
  te(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Wi {
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
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: r } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), r && r.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (d) => {
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
        const n = await this.pdfDoc.getPage(e), r = n.getViewport({ scale: this.scale }), d = this.elements.canvas, p = d.getContext("2d");
        if (!p)
          throw new Error("Failed to get canvas context");
        d.height = r.height, d.width = r.width, await n.render({
          canvasContext: p,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: r } = this.elements, d = this.pdfDoc?.numPages || 1;
    r && r.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= d);
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
    e && P(e), t && $(t), n && P(n), r && P(r);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: r } = this.elements;
    e && P(e), t && P(t), n && P(n), r && $(r);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: r, errorMessage: d, viewer: p } = this.elements;
    t && P(t), n && P(n), r && $(r), p && P(p), d && (d.textContent = e);
  }
}
function Vo(i) {
  const e = new Wi(i);
  return e.init(), e;
}
function Go(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new Wi(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && te(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new Wi({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class Wo {
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
class Jo {
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
function Fa(i) {
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
function Oa(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", r = t.label ?? String(n);
    return { label: String(r), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Ua(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), r = e ? String(e).trim().toLowerCase() : "";
  return r && n.includes(r) ? [r, ...n.filter((d) => d !== r)] : n;
}
function Yo(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Ko(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: Fa(e.type),
    options: Oa(e.options),
    operators: Ua(e.operators, e.default_operator)
  })) : [];
}
function Xo(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function Qo(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Zo(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function ec(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([p, c]) => `${p}: ${c}`).join("; ") : "", r = e?.textCode ? `${e.textCode}: ` : "", d = e?.message || `${i} failed`;
    t.error(n ? `${r}${d}: ${n}` : `${r}${d}`);
  }
}
function tc(i, e) {
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
function nc(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const ic = {
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
}, oi = "application/vnd.google-apps.document", Ji = "application/vnd.google-apps.spreadsheet", Yi = "application/vnd.google-apps.presentation", Xs = "application/vnd.google-apps.folder", Ki = "application/pdf", Na = [oi, Ki], Qs = "esign.google.account_id";
function Ha(i) {
  return i.mimeType === oi;
}
function qa(i) {
  return i.mimeType === Ki;
}
function nn(i) {
  return i.mimeType === Xs;
}
function ja(i) {
  return Na.includes(i.mimeType);
}
function sc(i) {
  return i.mimeType === oi || i.mimeType === Ji || i.mimeType === Yi;
}
function za(i) {
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
function rc(i) {
  return i.map(za);
}
function Zs(i) {
  return {
    [oi]: "Google Doc",
    [Ji]: "Google Sheet",
    [Yi]: "Google Slides",
    [Xs]: "Folder",
    [Ki]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function Va(i) {
  return nn(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Ha(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : qa(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === Ji ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Yi ? {
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
function Ga(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function Wa(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function ac(i, e) {
  const t = i.get("account_id");
  if (t)
    return ii(t);
  if (e)
    return ii(e);
  const n = localStorage.getItem(Qs);
  return n ? ii(n) : "";
}
function ii(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function oc(i) {
  const e = ii(i);
  e && localStorage.setItem(Qs, e);
}
function cc(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function lc(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function dc(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function sn(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Ja(i) {
  const e = Va(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function uc(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, r) => {
    const d = r === t.length - 1, p = r > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return d ? `${p}<span class="text-gray-900 font-medium">${sn(n.name)}</span>` : `${p}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${sn(n.name)}</button>`;
  }).join("");
}
function Ya(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: r = !0 } = e, d = Ja(i), p = nn(i), c = ja(i), S = p ? "cursor-pointer hover:bg-gray-50" : c ? "cursor-pointer hover:bg-blue-50" : "opacity-60", b = p ? `data-folder-id="${i.id}" data-folder-name="${sn(i.name)}"` : c && t ? `data-file-id="${i.id}" data-file-name="${sn(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${S} file-item"
      ${b}
      role="listitem"
      ${c ? 'tabindex="0"' : ""}
    >
      ${d}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${sn(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Zs(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${Ga(i.size)}` : ""}
          ${r && i.modifiedTime ? ` &middot; ${Wa(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${c && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function pc(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${sn(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((d, p) => nn(d) && !nn(p) ? -1 : !nn(d) && nn(p) ? 1 : d.name.localeCompare(p.name)).map((d) => Ya(d, { selectable: n })).join("")}
    </div>
  `;
}
function gc(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Zs(i.mimeType)
  };
}
export {
  jr as AGREEMENT_STATUS_BADGES,
  Js as AgreementFormController,
  Wi as DocumentDetailPreviewController,
  Gi as DocumentFormController,
  Or as ESignAPIClient,
  Ur as ESignAPIError,
  Qs as GOOGLE_ACCOUNT_STORAGE_KEY,
  Fs as GoogleCallbackController,
  Us as GoogleDrivePickerController,
  Os as GoogleIntegrationController,
  Na as IMPORTABLE_MIME_TYPES,
  qs as IntegrationConflictsController,
  Ns as IntegrationHealthController,
  Hs as IntegrationMappingsController,
  js as IntegrationSyncRunsController,
  Vi as LandingPageController,
  oi as MIME_GOOGLE_DOC,
  Xs as MIME_GOOGLE_FOLDER,
  Ji as MIME_GOOGLE_SHEET,
  Yi as MIME_GOOGLE_SLIDES,
  Ki as MIME_PDF,
  Wo as PanelPaginationBehavior,
  Jo as PanelSearchBehavior,
  ic as STANDARD_GRID_SELECTORS,
  Rs as SignerCompletePageController,
  Ks as SignerErrorPageController,
  Ys as SignerReviewController,
  Ie as announce,
  cc as applyAccountIdToPath,
  Yr as applyDetailFormatters,
  Ca as bootstrapAgreementForm,
  Go as bootstrapDocumentDetailPreview,
  No as bootstrapDocumentForm,
  Co as bootstrapGoogleCallback,
  Po as bootstrapGoogleDrivePicker,
  To as bootstrapGoogleIntegration,
  Ro as bootstrapIntegrationConflicts,
  Do as bootstrapIntegrationHealth,
  $o as bootstrapIntegrationMappings,
  Oo as bootstrapIntegrationSyncRuns,
  xo as bootstrapLandingPage,
  Eo as bootstrapSignerCompletePage,
  zo as bootstrapSignerErrorPage,
  Ba as bootstrapSignerReview,
  lc as buildScopedApiUrl,
  lo as byId,
  qr as capitalize,
  Hr as createESignClient,
  Vr as createElement,
  nc as createSchemaActionCachingRefresh,
  gc as createSelectedFile,
  oo as createStatusBadgeElement,
  bo as createTimeoutController,
  Xo as dateTimeCellRenderer,
  ri as debounce,
  ec as defaultActionErrorHandler,
  Zo as defaultActionSuccessHandler,
  po as delegate,
  sn as escapeHtml,
  Qo as fileSizeCellRenderer,
  to as formatDate,
  si as formatDateTime,
  Wa as formatDriveDate,
  Ga as formatDriveFileSize,
  Zn as formatFileSize,
  eo as formatPageCount,
  so as formatRecipientCount,
  io as formatRelativeTime,
  Wr as formatSizeElements,
  no as formatTime,
  Jr as formatTimestampElements,
  $s as getAgreementStatusBadge,
  Za as getESignClient,
  Va as getFileIconConfig,
  Zs as getFileTypeName,
  Gr as getPageConfig,
  P as hide,
  Ho as initAgreementForm,
  Kr as initDetailFormatters,
  Vo as initDocumentDetailPreview,
  Uo as initDocumentForm,
  Lo as initGoogleCallback,
  ko as initGoogleDrivePicker,
  Ao as initGoogleIntegration,
  Bo as initIntegrationConflicts,
  _o as initIntegrationHealth,
  Mo as initIntegrationMappings,
  Fo as initIntegrationSyncRuns,
  So as initLandingPage,
  Io as initSignerCompletePage,
  jo as initSignerErrorPage,
  qo as initSignerReview,
  nn as isFolder,
  Ha as isGoogleDoc,
  sc as isGoogleWorkspaceFile,
  ja as isImportable,
  qa as isPDF,
  ii as normalizeAccountId,
  za as normalizeDriveFile,
  rc as normalizeDriveFiles,
  Ua as normalizeFilterOperators,
  Oa as normalizeFilterOptions,
  Fa as normalizeFilterType,
  uo as on,
  te as onReady,
  fo as poll,
  Ko as prepareFilterFields,
  Yo as prepareGridColumns,
  h as qs,
  Ft as qsa,
  uc as renderBreadcrumb,
  Ja as renderFileIcon,
  Ya as renderFileItem,
  pc as renderFileList,
  zr as renderStatusBadge,
  ac as resolveAccountId,
  yo as retry,
  oc as saveAccountId,
  Nr as setESignClient,
  mo as setLoading,
  tc as setupRefreshButton,
  $ as show,
  Bs as sleep,
  ro as snakeToTitle,
  dc as syncAccountIdToUrl,
  vo as throttle,
  go as toggle,
  ao as truncate,
  An as updateDataText,
  ho as updateDataTexts,
  co as updateStatusBadge,
  wo as withTimeout
};
//# sourceMappingURL=index.js.map

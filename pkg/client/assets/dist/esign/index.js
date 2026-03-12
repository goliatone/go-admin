import { e as nt } from "../chunks/html-DyksyvcZ.js";
class Br {
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
      throw new Rr(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Rr extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Ni = null;
function Ka() {
  if (!Ni)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Ni;
}
function Fr(i) {
  Ni = i;
}
function Nr(i) {
  const e = new Br(i);
  return Fr(e), e;
}
function Yn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Xa(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function ei(i, e) {
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
function Qa(i, e) {
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
function Za(i, e) {
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
function eo(i) {
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
function to(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Ur(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function no(i) {
  return i ? i.split("_").map((e) => Ur(e)).join(" ") : "";
}
function io(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const Or = {
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
function Ds(i) {
  const e = String(i || "").trim().toLowerCase();
  return Or[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Hr(i, e) {
  const t = Ds(i), n = e?.showDot ?? !1, r = e?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, p = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${d[r]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${p}${t.label}</span>`;
}
function so(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = Hr(i, e), t.firstElementChild;
}
function ro(i, e, t) {
  const n = Ds(e), r = t?.size ?? "sm", d = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${d[r]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
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
function Nt(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function ao(i) {
  return document.getElementById(i);
}
function qr(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [r, d] of Object.entries(e))
      d !== void 0 && n.setAttribute(r, d);
  if (t)
    for (const r of t)
      typeof r == "string" ? n.appendChild(document.createTextNode(r)) : n.appendChild(r);
  return n;
}
function oo(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function co(i, e, t, n, r) {
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
function lo(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? $(i) : P(i);
}
function uo(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function Ln(i, e, t = document) {
  const n = h(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function po(i, e = document) {
  for (const [t, n] of Object.entries(i))
    Ln(t, n, e);
}
function jr(i = "[data-esign-page]", e = "data-esign-config") {
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
    const n = qr("div", {
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
async function go(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: r = 6e4,
    maxAttempts: d = 30,
    onProgress: p,
    signal: c
  } = i, S = Date.now();
  let w = 0, E;
  for (; w < d; ) {
    if (c?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - S >= r)
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
    await Ms(n, c);
  }
  return {
    result: E,
    attempts: w,
    stopped: !1,
    timedOut: !1
  };
}
async function mo(i) {
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
  let w;
  for (let E = 1; E <= t; E++) {
    if (S?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (_) {
      if (w = _, E >= t || !p(_, E))
        throw _;
      const N = d ? Math.min(n * Math.pow(2, E - 1), r) : n;
      c && c(_, E, N), await Ms(N, S);
    }
  }
  throw w;
}
function Ms(i, e) {
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
function ti(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function ho(i, e) {
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
function fo(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function yo(i, e, t = "Operation timed out") {
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
class ji {
  constructor(e) {
    this.config = e, this.client = Nr({
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
    Ln('count="draft"', e.draft), Ln('count="pending"', e.pending), Ln('count="completed"', e.completed), Ln('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function vo(i) {
  const e = i || jr(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new ji(e);
  return te(() => t.init()), t;
}
function wo(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new ji(t);
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
      new ji({ basePath: r, apiBasePath: d }).init();
    }
  }
});
class $s {
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
function bo(i) {
  const e = new $s(i);
  return te(() => e.init()), e;
}
function So(i) {
  const e = new $s(i);
  te(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function zr(i = document) {
  Nt("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = Yn(t));
  });
}
function Vr(i = document) {
  Nt("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = ei(t));
  });
}
function Gr(i = document) {
  zr(i), Vr(i);
}
function Wr() {
  te(() => {
    Gr();
  });
}
typeof document < "u" && Wr();
const ys = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Bs {
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
    r && (r.textContent = ys[e] || ys.unknown), t && d && (d.textContent = t, $(d)), this.sendToOpener({
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
function xo(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Bs(e);
  return te(() => t.init()), t;
}
function Io(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new Bs(e);
  te(() => t.init());
}
const Di = "esign.google.account_id", Jr = {
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
class Rs {
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
      accountIdInput: w,
      oauthModal: E,
      disconnectModal: _
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), d && d.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, _ && $(_);
    }), c && c.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, _ && P(_);
    }), S && S.addEventListener("click", () => this.disconnect()), p && p.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), r && r.addEventListener("click", () => this.checkStatus()), w && (w.addEventListener("change", () => {
      this.setCurrentAccountId(w.value, !0);
    }), w.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(w.value, !0));
    }));
    const { accountDropdown: N, connectFirstBtn: R } = this.elements;
    N && N.addEventListener("change", () => {
      N.value === "__new__" ? (N.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(N.value, !0);
    }), R && R.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), _ && !_.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, P(_)));
    }), [E, _].forEach((B) => {
      B && B.addEventListener("click", (W) => {
        const Y = W.target;
        (Y === B || Y.getAttribute("aria-hidden") === "true") && (P(B), B === E ? this.cancelOAuthFlow() : B === _ && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Di)
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
      this.currentAccountId ? window.localStorage.setItem(Di, this.currentAccountId) : window.localStorage.removeItem(Di);
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
    const t = (W, Y) => {
      for (const Z of W)
        if (Object.prototype.hasOwnProperty.call(e, Z) && e[Z] !== void 0 && e[Z] !== null)
          return e[Z];
      return Y;
    }, n = t(["expires_at", "ExpiresAt"], ""), r = t(["scopes", "Scopes"], []), d = this.normalizeAccountId(
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
      const W = new Date(n);
      if (!Number.isNaN(W.getTime())) {
        const Y = W.getTime() - Date.now(), Z = 5 * 60 * 1e3;
        N = Y <= 0, R = Y > 0 && Y <= Z;
      }
    }
    const B = typeof _ == "boolean" ? _ : (N === !0 || R === !0) && !E;
    return {
      connected: p,
      account_id: d,
      email: w,
      scopes: Array.isArray(r) ? r : [],
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
        const r = Jr[n] || { label: n, description: "" };
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
    const w = new Date(e), E = /* @__PURE__ */ new Date(), _ = Math.max(
      1,
      Math.round((w.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? r ? (p.textContent = "Access token expired, but refresh is available and will be applied automatically.", p.classList.remove("text-gray-500"), p.classList.add("text-amber-600"), c && P(c)) : (p.textContent = "Access token has expired. Please re-authorize.", p.classList.remove("text-gray-500"), p.classList.add("text-red-600"), c && $(c), S && (S.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (p.classList.remove("text-gray-500"), p.classList.add("text-amber-600"), r ? (p.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}. Refresh is available automatically.`, c && P(c)) : (p.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}`, c && $(c), S && (S.textContent = `Your access token will expire in ${_} minute${_ !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (p.textContent = `Token valid until ${w.toLocaleDateString()} ${w.toLocaleTimeString()}`, c && P(c)), !d && c && P(c);
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
      const S = d.email || p || "Default", w = d.status !== "connected" ? ` (${d.status})` : "";
      c.textContent = `${S}${w}`, p === this.currentAccountId && (c.selected = !0), e.appendChild(c);
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
    }, p = t ? "ring-2 ring-blue-500" : "", c = n[e.status] || "bg-white border-gray-200", S = r[e.status] || "bg-gray-100 text-gray-700", w = d[e.status] || e.status, E = e.account_id || "default", _ = e.email || (e.account_id ? e.account_id : "Default account");
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
    const c = 500, S = 600, w = (window.screen.width - c) / 2, E = (window.screen.height - S) / 2;
    if (this.oauthWindow = window.open(
      p,
      "google_oauth",
      `width=${c},height=${S},left=${w},top=${E},popup=yes`
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
function Eo(i) {
  const e = new Rs(i);
  return te(() => e.init()), e;
}
function Lo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new Rs(e);
  te(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Mi = "esign.google.account_id", vs = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, ws = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Fs {
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
      importForm: w,
      importModal: E,
      viewListBtn: _,
      viewGridBtn: N
    } = this.elements;
    if (e) {
      const B = ti(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (W) => {
        W.key === "Enter" && (W.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), r && r.addEventListener("click", () => this.loadMore()), d && d.addEventListener("click", () => this.showImportModal()), p && p.addEventListener("click", () => this.clearSelection()), c && c.addEventListener("click", () => this.hideImportModal()), S && w && w.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const W = B.target;
      (W === E || W.getAttribute("aria-hidden") === "true") && this.hideImportModal();
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
        window.localStorage.getItem(Mi)
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
      this.currentAccountId ? window.localStorage.setItem(Mi, this.currentAccountId) : window.localStorage.removeItem(Mi);
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
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), w = Array.isArray(e.parents) ? e.parents : c ? [c] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
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
      const c = await p.json(), S = Array.isArray(c.files) ? c.files.map((w) => this.normalizeDriveFile(w)) : [];
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = ws.includes(e.mimeType), r = this.selectedFile?.id === e.id, d = vs[e.mimeType] || vs.default, p = this.getFileIcon(d);
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
            ${ei(e.modifiedTime)}
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
      importBtn: w,
      openInGoogleBtn: E
    } = this.elements;
    if (!this.selectedFile) {
      e && $(e), t && P(t);
      return;
    }
    e && P(e), t && $(t);
    const _ = this.selectedFile, N = ws.includes(_.mimeType);
    r && (r.textContent = _.name), d && (d.textContent = this.getMimeTypeLabel(_.mimeType)), p && (p.textContent = _.id), c && _.owners.length > 0 && (c.textContent = _.owners[0].emailAddress || "-"), S && (S.textContent = ei(_.modifiedTime)), w && (N ? (w.removeAttribute("disabled"), w.classList.remove("opacity-50", "cursor-not-allowed")) : (w.setAttribute("disabled", "true"), w.classList.add("opacity-50", "cursor-not-allowed"))), E && _.webViewLink && (E.href = _.webViewLink);
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
    ).join(""), Nt(".breadcrumb-item", r).forEach((d) => {
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
      this.showToast("Import started successfully", "success"), Ie("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (w) {
      console.error("Import error:", w);
      const E = w instanceof Error ? w.message : "Import failed";
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
function Co(i) {
  const e = new Fs(i);
  return te(() => e.init()), e;
}
function Ao(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new Fs(e);
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
    const c = d.width, S = d.height, w = 40, E = c - w * 2, _ = S - w * 2;
    p.clearRect(0, 0, c, S);
    const N = t.labels, R = Object.values(t.datasets), B = E / N.length / (R.length + 1), W = Math.max(...R.flat()) || 1;
    N.forEach((Y, Z) => {
      const ae = w + Z * E / N.length + B / 2;
      R.forEach((me, le) => {
        const ke = me[Z] / W * _, Re = ae + le * B, Ye = S - w - ke;
        p.fillStyle = n[le] || "#6b7280", p.fillRect(Re, Ye, B - 2, ke);
      }), Z % Math.ceil(N.length / 6) === 0 && (p.fillStyle = "#6b7280", p.font = "10px sans-serif", p.textAlign = "center", p.fillText(Y, ae + R.length * B / 2, S - w + 15));
    }), p.fillStyle = "#6b7280", p.font = "10px sans-serif", p.textAlign = "right";
    for (let Y = 0; Y <= 4; Y++) {
      const Z = S - w - Y * _ / 4, ae = Math.round(W * Y / 4);
      p.fillText(ae.toString(), w - 5, Z + 3);
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
function To(i) {
  const e = new Ns(i);
  return te(() => e.init()), e;
}
function ko(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new Ns(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class Us {
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
      validateBtn: w,
      mappingForm: E,
      publishCancelBtn: _,
      publishConfirmBtn: N,
      deleteCancelBtn: R,
      deleteConfirmBtn: B,
      closePreviewBtn: W,
      loadSampleBtn: Y,
      runPreviewBtn: Z,
      clearPreviewBtn: ae,
      previewSourceInput: me,
      searchInput: le,
      filterStatus: ke,
      filterProvider: Re,
      mappingModal: Ye,
      publishModal: Fe,
      deleteModal: _e,
      previewModal: ze
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.closeModal()), d?.addEventListener("click", () => this.loadMappings()), p?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.addSchemaField()), S?.addEventListener("click", () => this.addMappingRule()), w?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (Pe) => {
      Pe.preventDefault(), this.saveMapping();
    }), _?.addEventListener("click", () => this.closePublishModal()), N?.addEventListener("click", () => this.publishMapping()), R?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), W?.addEventListener("click", () => this.closePreviewModal()), Y?.addEventListener("click", () => this.loadSamplePayload()), Z?.addEventListener("click", () => this.runPreviewTransform()), ae?.addEventListener("click", () => this.clearPreview()), me?.addEventListener("input", ti(() => this.validateSourceJson(), 300)), le?.addEventListener("input", ti(() => this.renderMappings(), 300)), ke?.addEventListener("change", () => this.renderMappings()), Re?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (Pe) => {
      Pe.key === "Escape" && (Ye && !Ye.classList.contains("hidden") && this.closeModal(), Fe && !Fe.classList.contains("hidden") && this.closePublishModal(), _e && !_e.classList.contains("hidden") && this.closeDeleteModal(), ze && !ze.classList.contains("hidden") && this.closePreviewModal());
    }), [Ye, Fe, _e, ze].forEach((Pe) => {
      Pe?.addEventListener("click", (on) => {
        const oe = on.target;
        (oe === Pe || oe.getAttribute("aria-hidden") === "true") && (Pe === Ye ? this.closeModal() : Pe === Fe ? this.closePublishModal() : Pe === _e ? this.closeDeleteModal() : Pe === ze && this.closePreviewModal());
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
    const d = (t?.value || "").toLowerCase(), p = n?.value || "", c = r?.value || "", S = this.mappings.filter((w) => !(d && !w.name.toLowerCase().includes(d) && !w.provider.toLowerCase().includes(d) || p && w.status !== p || c && w.provider !== c));
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
      mappingProviderInput: r,
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
      provider: r?.value.trim() || "",
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
      mappingNameInput: r,
      mappingProviderInput: d,
      schemaObjectTypeInput: p,
      schemaVersionInput: c,
      schemaFieldsContainer: S,
      mappingRulesContainer: w,
      mappingStatusBadge: E,
      formValidationStatus: _
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), r && (r.value = e.name || ""), d && (d.value = e.provider || "");
    const N = e.external_schema || { object_type: "", fields: [] };
    p && (p.value = N.object_type || ""), c && (c.value = N.version || ""), S && (S.innerHTML = "", (N.fields || []).forEach((R) => S.appendChild(this.createSchemaFieldRow(R)))), w && (w.innerHTML = "", (e.rules || []).forEach((R) => w.appendChild(this.createMappingRuleRow(R)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), P(_);
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
      sourceSyntaxError: w
    } = this.elements;
    this.currentPreviewMapping = t, r && (r.textContent = t.name), d && (d.textContent = t.provider), p && (p.textContent = t.external_schema?.object_type || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), S && (S.value = ""), P(w), $(n), S?.focus();
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
      const w = this.resolveSourceValue(e, S.source_object, S.source_field), E = w !== void 0;
      if (r.matched_rules.push({
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
    d && (d.textContent = `(${E.length})`), r && (E.length === 0 ? r.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : r.innerHTML = E.map(
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
function Po(i) {
  const e = new Us(i);
  return te(() => e.init()), e;
}
function _o(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Us(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class Os {
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
      cancelResolveBtn: w,
      resolveForm: E,
      conflictDetailModal: _,
      resolveModal: N
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), r?.addEventListener("change", () => this.loadConflicts()), d?.addEventListener("change", () => this.renderConflicts()), p?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("click", () => this.openResolveModal("resolved")), S?.addEventListener("click", () => this.openResolveModal("ignored")), w?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (R) => this.submitResolution(R)), document.addEventListener("keydown", (R) => {
      R.key === "Escape" && (N && !N.classList.contains("hidden") ? this.closeResolveModal() : _ && !_.classList.contains("hidden") && this.closeConflictDetail());
    }), [_, N].forEach((R) => {
      R?.addEventListener("click", (B) => {
        const W = B.target;
        (W === R || W.getAttribute("aria-hidden") === "true") && (R === _ ? this.closeConflictDetail() : R === N && this.closeResolveModal());
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
    const d = t?.value || "", p = n?.value || "", c = r?.value || "", S = this.conflicts.filter((w) => !(d && w.status !== d || p && w.provider !== p || c && w.entity_kind !== c));
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
    const t = this.conflicts.find((ke) => ke.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: r,
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
      detailPayload: W,
      resolutionSection: Y,
      actionButtons: Z,
      detailResolvedAt: ae,
      detailResolvedBy: me,
      detailResolution: le
    } = this.elements;
    if (r && (r.textContent = t.reason || "Data conflict"), d && (d.textContent = t.entity_kind || "-"), p && (p.innerHTML = this.getStatusBadge(t.status)), c && (c.textContent = t.provider || "-"), S && (S.textContent = t.external_id || "-"), w && (w.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), _ && (_.textContent = t.id), N && (N.textContent = t.run_id || "-"), R && (R.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), W)
      try {
        const ke = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        W.textContent = JSON.stringify(ke, null, 2);
      } catch {
        W.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if ($(Y), P(Z), ae && (ae.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), me && (me.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), le)
        try {
          const ke = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          le.textContent = JSON.stringify(ke, null, 2);
        } catch {
          le.textContent = t.resolution_json || "{}";
        }
    } else
      P(Y), $(Z);
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
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : r.error(e));
  }
}
function Do(i) {
  const e = new Os(i);
  return te(() => e.init()), e;
}
function Mo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Os(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class Hs {
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
      filterStatus: w,
      filterDirection: E,
      actionResumeBtn: _,
      actionRetryBtn: N,
      actionCompleteBtn: R,
      actionFailBtn: B,
      actionDiagnosticsBtn: W,
      startSyncModal: Y,
      runDetailModal: Z
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (ae) => this.startSync(ae)), d?.addEventListener("click", () => this.loadSyncRuns()), p?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.closeRunDetail()), S?.addEventListener("change", () => this.renderTimeline()), w?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), _?.addEventListener("click", () => this.runAction("resume")), N?.addEventListener("click", () => this.runAction("resume")), R?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), W?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (ae) => {
      ae.key === "Escape" && (Y && !Y.classList.contains("hidden") && this.closeStartSyncModal(), Z && !Z.classList.contains("hidden") && this.closeRunDetail());
    }), [Y, Z].forEach((ae) => {
      ae?.addEventListener("click", (me) => {
        const le = me.target;
        (le === ae || le.getAttribute("aria-hidden") === "true") && (ae === Y ? this.closeStartSyncModal() : ae === Z && this.closeRunDetail());
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
      (w) => w.status === "running" || w.status === "pending"
    ).length, c = this.syncRuns.filter((w) => w.status === "completed").length, S = this.syncRuns.filter((w) => w.status === "failed").length;
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
    const t = this.syncRuns.find((me) => me.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: r,
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
      actionResumeBtn: W,
      actionRetryBtn: Y,
      actionCompleteBtn: Z,
      actionFailBtn: ae
    } = this.elements;
    r && (r.textContent = t.id), d && (d.textContent = t.provider), p && (p.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), c && (c.innerHTML = this.getStatusBadge(t.status)), S && (S.textContent = this.formatDate(t.started_at)), w && (w.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), _ && (_.textContent = String(t.attempt_count || 1)), t.last_error ? (R && (R.textContent = t.last_error), $(N)) : P(N), W && W.classList.toggle("hidden", t.status !== "running"), Y && Y.classList.toggle("hidden", t.status !== "failed"), Z && Z.classList.toggle("hidden", t.status !== "running"), ae && ae.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), $(n);
    try {
      const me = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (me.ok) {
        const le = await me.json();
        this.renderCheckpoints(le.checkpoints || []);
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
    const r = window.toastManager;
    r && (t === "success" ? r.success(e) : t === "error" ? r.error(e) : t === "info" && r.info && r.info(e));
  }
}
function $o(i) {
  const e = new Hs(i);
  return te(() => e.init()), e;
}
function Bo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new Hs(e);
  te(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const $i = "esign.google.account_id", Yr = 25 * 1024 * 1024, Kr = 2e3, bs = 60, Ui = "application/vnd.google-apps.document", Oi = "application/pdf", Ss = "application/vnd.google-apps.folder", Xr = [Ui, Oi];
class zi {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || Yr, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: Nt(".source-tab"),
      sourcePanels: Nt(".source-panel"),
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
      const w = ti(() => this.handleSearch(), 300);
      e.addEventListener("input", w);
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
        window.localStorage.getItem($i)
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
      const c = String(r?.email || "").trim(), S = String(r?.status || "").trim(), w = c || d || "Default account";
      p.textContent = S && S !== "connected" ? `${w} (${S})` : w, d === this.currentAccountId && (p.selected = !0), e.appendChild(p);
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
      this.currentAccountId ? window.localStorage.setItem($i, this.currentAccountId) : window.localStorage.removeItem($i);
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
      `File is too large (${Yn(e.size)}). Maximum size is ${Yn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: r, fileSize: d, uploadZone: p } = this.elements;
    r && (r.textContent = e.name), d && (d.textContent = Yn(e.size)), t && P(t), n && $(n), p && (p.classList.remove("border-gray-300"), p.classList.add("border-green-400", "bg-green-50"));
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
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), S = String(e.ownerEmail || e.OwnerEmail || "").trim(), w = Array.isArray(e.parents) ? e.parents : c ? [c] : [], E = Array.isArray(e.owners) ? e.owners : S ? [{ emailAddress: S }] : [];
    return {
      id: t,
      name: n,
      mimeType: r,
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
    return e.mimeType === Ui;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === Oi;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Ss;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Xr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Ui ? "Google Document" : t === Oi ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Ss ? "Folder" : "File";
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
      }), w = await S.json();
      if (!S.ok)
        throw new Error(w.error?.message || "Failed to load files");
      const E = Array.isArray(w.files) ? w.files.map((B) => this.normalizeDriveFile(B)) : [];
      this.nextPageToken = w.next_page_token || null, d ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(d);
      const { resultCount: _, listTitle: N } = this.elements;
      n && _ ? (_.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, N && (N.textContent = "Search Results")) : (_ && (_.textContent = ""), N && (N.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
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
      const p = this.getFileIcon(r), c = this.isImportable(r), S = this.isFolder(r), w = this.selectedFile && this.selectedFile.id === r.id, E = !c && !S;
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
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(r.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(r.mimeType)}
              ${r.modifiedTime ? " • " + ei(r.modifiedTime) : ""}
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
    r && r.querySelectorAll(".file-item").forEach((Y) => {
      const Z = parseInt(Y.dataset.fileIndex || "0", 10);
      this.currentFiles[Z].id === e.id ? (Y.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), Y.setAttribute("aria-selected", "true")) : (Y.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), Y.setAttribute("aria-selected", "false"));
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
      importDocumentTitle: W
    } = this.elements;
    d && P(d), p && $(p), c && P(c), S && (S.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, S.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), w && (w.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && _ && (_.className = `p-3 rounded-lg border ${n.bgClass}`, N && (N.textContent = n.label, N.className = `text-xs font-medium ${n.textClass}`), R && (R.textContent = n.desc, R.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? $(B) : P(B))), W && (W.value = e.name || ""), Ie(`Selected: ${e.name}`);
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Kr);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > bs) {
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
        console.error("Poll error:", e), this.pollAttempts < bs ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function Ro(i) {
  const e = new zi(i);
  return te(() => e.init()), e;
}
function Fo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new zi(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Qr(i) {
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
        ), n = Qr(t);
        n && new zi(n).init();
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
}, Lt = Ee.REVIEW, Zr = {
  [Ee.DOCUMENT]: "Details",
  [Ee.DETAILS]: "Participants",
  [Ee.PARTICIPANTS]: "Fields",
  [Ee.FIELDS]: "Placement",
  [Ee.PLACEMENT]: "Review"
}, Te = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, ni = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, Hi = /* @__PURE__ */ new Map(), ea = 30 * 60 * 1e3, xs = {
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
function ta(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function na(i) {
  const e = i instanceof Error ? i.message : i, t = ta(e);
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
  if (t && xs[t]) {
    const n = xs[t];
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
function Is() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function ia() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function sa() {
  if (!ia())
    throw new Error("PDF preview library unavailable");
}
function ra(i) {
  const e = Hi.get(i);
  return e ? Date.now() - e.timestamp > ea ? (Hi.delete(i), null) : e : null;
}
function aa(i, e, t) {
  Hi.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function oa(i, e = ni.THUMBNAIL_MAX_WIDTH, t = ni.THUMBNAIL_MAX_HEIGHT) {
  await sa();
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
class ca {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || ni.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || ni.THUMBNAIL_MAX_HEIGHT
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
    const d = ra(e);
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
      const { dataUrl: c, pageCount: S } = await oa(
        p,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (r !== this.requestVersion)
        return;
      aa(e, c, S), this.state = {
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
      const c = p instanceof Error ? p.message : "Failed to load preview", S = na(c);
      Is() && console.error("Failed to load document preview:", p), this.state = {
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
        p?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Is() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function la(i = {}) {
  const e = new ca(i);
  return e.init(), e;
}
function da() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function ua() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function pa(i, e) {
  return {
    id: da(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Es(i, e) {
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
function Ls(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function Cs(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function qs(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function ga(i, e) {
  const t = qs(i, e.definitionId);
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
function ma(i, e, t, n) {
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
      placementSource: Te.AUTO_LINKED,
      linkGroupId: S.id,
      linkedFromFieldId: S.sourceFieldId
    } };
  }
  return null;
}
const As = 150, Ts = 32;
function re(i) {
  return i == null ? "" : String(i).trim();
}
function js(i) {
  if (typeof i == "boolean") return i;
  const e = re(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function zs(i) {
  return re(i).toLowerCase();
}
function ge(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(re(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Jn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(re(i));
  return Number.isFinite(t) ? t : e;
}
function Kn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function Ct(i, e) {
  const t = ge(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function En(i, e, t = 1) {
  const n = ge(t, 1), r = ge(i, n);
  return e > 0 ? Kn(r, 1, e) : r > 0 ? r : n;
}
function ha(i, e, t) {
  const n = ge(t, 1);
  let r = Ct(i, n), d = Ct(e, n);
  return r <= 0 && (r = 1), d <= 0 && (d = n), d < r ? { start: d, end: r } : { start: r, end: d };
}
function Cn(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => re(n)) : re(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const r = ge(n, 0);
    r > 0 && t.add(r);
  }), Array.from(t).sort((n, r) => n - r);
}
function Xn(i, e) {
  const t = ge(e, 1), n = re(i.participantId ?? i.participant_id), r = Cn(i.excludePages ?? i.exclude_pages), d = i.required, p = typeof d == "boolean" ? d : !["0", "false", "off", "no"].includes(re(d).toLowerCase());
  return {
    id: re(i.id),
    type: zs(i.type),
    participantId: n,
    participantTempId: re(i.participantTempId) || n,
    fromPage: Ct(i.fromPage ?? i.from_page, t),
    toPage: Ct(i.toPage ?? i.to_page, t),
    page: Ct(i.page, t),
    excludeLastPage: js(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: r,
    required: p
  };
}
function fa(i) {
  return {
    id: re(i.id),
    type: zs(i.type),
    participant_id: re(i.participantId),
    from_page: Ct(i.fromPage, 0),
    to_page: Ct(i.toPage, 0),
    page: Ct(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: Cn(i.excludePages),
    required: i.required !== !1
  };
}
function ya(i, e) {
  const t = re(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function va(i, e) {
  const t = ge(e, 1), n = [];
  return i.forEach((r, d) => {
    const p = Xn(r || {}, t);
    if (p.type === "") return;
    const c = ya(p, d);
    if (p.type === "initials_each_page") {
      const S = ha(p.fromPage, p.toPage, t), w = /* @__PURE__ */ new Set();
      Cn(p.excludePages).forEach((E) => {
        E <= t && w.add(E);
      }), p.excludeLastPage && w.add(t);
      for (let E = S.start; E <= S.end; E += 1)
        w.has(E) || n.push({
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
function wa(i, e, t, n, r) {
  const d = ge(t, 1);
  let p = i > 0 ? i : 1, c = e > 0 ? e : d;
  p = Kn(p, 1, d), c = Kn(c, 1, d), c < p && ([p, c] = [c, p]);
  const S = /* @__PURE__ */ new Set();
  r.forEach((E) => {
    const _ = ge(E, 0);
    _ > 0 && S.add(Kn(_, 1, d));
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
function ba(i) {
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
function Bi(i) {
  const e = i || {};
  return {
    id: re(e.id),
    title: re(e.title || e.name) || "Untitled",
    pageCount: ge(e.page_count ?? e.pageCount, 0),
    compatibilityTier: re(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: re(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Vs(i) {
  const e = re(i).toLowerCase();
  if (e === "") return Te.MANUAL;
  switch (e) {
    case Te.AUTO:
    case Te.MANUAL:
    case Te.AUTO_LINKED:
    case Te.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function Qn(i, e = 0) {
  const t = i || {}, n = re(t.id) || `fi_init_${e}`, r = re(t.definitionId || t.definition_id || t.field_definition_id) || n, d = ge(t.page ?? t.page_number, 1), p = Jn(t.x ?? t.pos_x, 0), c = Jn(t.y ?? t.pos_y, 0), S = Jn(t.width, As), w = Jn(t.height, Ts);
  return {
    id: n,
    definitionId: r,
    type: re(t.type) || "text",
    participantId: re(t.participantId || t.participant_id),
    participantName: re(t.participantName || t.participant_name) || "Unassigned",
    page: d > 0 ? d : 1,
    x: p >= 0 ? p : 0,
    y: c >= 0 ? c : 0,
    width: S > 0 ? S : As,
    height: w > 0 ? w : Ts,
    placementSource: Vs(t.placementSource || t.placement_source),
    linkGroupId: re(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: re(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: js(t.isUnlinked ?? t.is_unlinked)
  };
}
function ks(i, e = 0) {
  const t = Qn(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Vs(t.placementSource),
    link_group_id: re(t.linkGroupId),
    linked_from_field_id: re(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Sa(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, r = n.replace(/\/+$/, ""), d = /\/v\d+$/i.test(r) ? r : `${r}/v1`, p = `${d}/esign/drafts`, c = !!e.is_edit, S = !!e.create_success, w = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), _ = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, N = Array.isArray(e.initial_participants) ? e.initial_participants : [], R = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(o) {
    if (!w) return o;
    const s = o.includes("?") ? "&" : "?";
    return `${o}${s}user_id=${encodeURIComponent(w)}`;
  }
  function W(o = !0) {
    const s = { Accept: "application/json" };
    return o && (s["Content-Type"] = "application/json"), w && (s["X-User-ID"] = w), s;
  }
  const Y = 1, Z = c ? "edit" : "create", ae = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), me = [
    Z,
    w || "anonymous",
    ae || "agreement-form"
  ].join("|"), le = `esign_wizard_state_v1:${encodeURIComponent(me)}`, ke = `esign_wizard_sync:${encodeURIComponent(me)}`, Re = "esign_wizard_state_v1", Ye = 2e3, Fe = [1e3, 2e3, 5e3, 1e4, 3e4], _e = 1, ze = `esign_wizard_active_tab_v1:${encodeURIComponent(me)}`, Pe = 5e3, on = 2e4, oe = {
    USER: "user",
    AUTOFILL: "autofill",
    SERVER_SEED: "server_seed"
  };
  function Ut(o, s = {}) {
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
  function si(o, s = 0) {
    if (!o || typeof o != "object") return !1;
    const l = String(o.name ?? "").trim(), m = String(o.email ?? "").trim(), v = String(o.role ?? "signer").trim().toLowerCase(), b = Number.parseInt(String(o.signingStage ?? o.signing_stage ?? 1), 10), L = o.notify !== !1;
    return l !== "" || m !== "" || v !== "" && v !== "signer" || Number.isFinite(b) && b > 1 || !L ? !0 : s > 0;
  }
  function An(o) {
    if (!o || typeof o != "object") return !1;
    const s = Number.parseInt(String(o.currentStep ?? 1), 10);
    if (Number.isFinite(s) && s > 1 || String(o.document?.id ?? "").trim() !== "") return !0;
    const m = String(o.details?.title ?? "").trim(), v = String(o.details?.message ?? "").trim(), b = it(o.titleSource, m === "" ? oe.AUTOFILL : oe.USER);
    return !!(m !== "" && b !== oe.SERVER_SEED || v !== "" || (Array.isArray(o.participants) ? o.participants : []).some((D, T) => si(D, T)) || Array.isArray(o.fieldDefinitions) && o.fieldDefinitions.length > 0 || Array.isArray(o.fieldPlacements) && o.fieldPlacements.length > 0 || Array.isArray(o.fieldRules) && o.fieldRules.length > 0);
  }
  function it(o, s = oe.AUTOFILL) {
    const l = String(o || "").trim().toLowerCase();
    return l === oe.USER ? oe.USER : l === oe.SERVER_SEED ? oe.SERVER_SEED : l === oe.AUTOFILL ? oe.AUTOFILL : s;
  }
  function ri(o) {
    const s = Date.parse(String(o || "").trim());
    return Number.isFinite(s) ? s : 0;
  }
  function At() {
    if (typeof window > "u" || !window.localStorage) return null;
    try {
      const o = window.localStorage.getItem(ze);
      if (!o) return null;
      const s = JSON.parse(o);
      if (!s || typeof s != "object") return null;
      const l = String(s.tabId || "").trim();
      if (!l) return null;
      const m = String(s.claimedAt || "").trim(), v = String(s.lastSeenAt || "").trim();
      return {
        tabId: l,
        claimedAt: m,
        lastSeenAt: v
      };
    } catch {
      return null;
    }
  }
  function cn(o, s = Date.now()) {
    if (!o || typeof o != "object") return !1;
    const l = ri(o.lastSeenAt || o.claimedAt);
    return l <= 0 ? !1 : s - l < on;
  }
  function Tn(o) {
    if (typeof window > "u" || !window.localStorage) return !1;
    try {
      return window.localStorage.setItem(ze, JSON.stringify(o)), !0;
    } catch {
      return !1;
    }
  }
  function ai(o = "") {
    if (typeof window > "u" || !window.localStorage) return !1;
    try {
      const s = At();
      return o && s?.tabId && s.tabId !== o ? !1 : (window.localStorage.removeItem(ze), !0);
    } catch {
      return !1;
    }
  }
  class oi {
    constructor() {
      this.state = null, this.listeners = [], this.init();
    }
    init() {
      this.migrateLegacyStateIfNeeded(), this.state = this.loadFromSession() || this.createInitialState();
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
        const s = sessionStorage.getItem(le), l = sessionStorage.getItem(Re);
        if (!l) return;
        if (s) {
          sessionStorage.removeItem(Re);
          return;
        }
        const m = JSON.parse(l), v = this.normalizeLoadedState({
          ...m,
          storageMigrationVersion: _e
        });
        sessionStorage.setItem(le, JSON.stringify(v)), sessionStorage.removeItem(Re), Ut("wizard_resume_migration_used", {
          from: Re,
          to: le
        });
      } catch {
        sessionStorage.removeItem(Re);
      }
    }
    loadFromSession() {
      try {
        const s = sessionStorage.getItem(le);
        if (!s) return null;
        const l = JSON.parse(s);
        return l.version !== Y ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(l)) : this.normalizeLoadedState(l);
      } catch (s) {
        return console.error("Failed to load wizard state from session:", s), null;
      }
    }
    normalizeLoadedState(s) {
      if (!s || typeof s != "object")
        return this.createInitialState();
      const l = this.createInitialState(), m = { ...l, ...s }, v = Number.parseInt(String(s.currentStep ?? l.currentStep), 10);
      m.currentStep = Number.isFinite(v) ? Math.min(Math.max(v, 1), Lt) : l.currentStep;
      const b = s.document && typeof s.document == "object" ? s.document : {}, L = b.id;
      m.document = {
        id: L == null ? null : String(L).trim() || null,
        title: String(b.title ?? "").trim() || null,
        pageCount: ge(b.pageCount, 0) || null
      };
      const k = s.details && typeof s.details == "object" ? s.details : {}, D = String(k.title ?? "").trim(), T = D === "" ? oe.AUTOFILL : oe.USER;
      m.details = {
        title: D,
        message: String(k.message ?? "")
      }, m.participants = Array.isArray(s.participants) ? s.participants : [], m.fieldDefinitions = Array.isArray(s.fieldDefinitions) ? s.fieldDefinitions : [], m.fieldPlacements = Array.isArray(s.fieldPlacements) ? s.fieldPlacements : [], m.fieldRules = Array.isArray(s.fieldRules) ? s.fieldRules : [];
      const I = String(s.wizardId ?? "").trim();
      m.wizardId = I || l.wizardId, m.version = Y, m.createdAt = String(s.createdAt ?? l.createdAt), m.updatedAt = String(s.updatedAt ?? l.updatedAt), m.titleSource = it(s.titleSource, T), m.storageMigrationVersion = ge(
        s.storageMigrationVersion,
        _e
      ) || _e;
      const O = String(s.serverDraftId ?? "").trim();
      return m.serverDraftId = O || null, m.serverRevision = ge(s.serverRevision, 0), m.lastSyncedAt = String(s.lastSyncedAt ?? "").trim() || null, m.syncPending = !!s.syncPending, m;
    }
    migrateState(s) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.storageMigrationVersion = _e, sessionStorage.setItem(le, JSON.stringify(this.state));
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
      Object.prototype.hasOwnProperty.call(l, "titleSource") ? m.titleSource = it(l.titleSource, this.state.titleSource) : Object.prototype.hasOwnProperty.call(s || {}, "title") && (m.titleSource = oe.USER), this.updateState(m);
    }
    setTitleSource(s, l = {}) {
      const m = it(s, this.state.titleSource);
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
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(le), sessionStorage.removeItem(Re), this.notifyListeners();
    }
    hasResumableState() {
      return An(this.state);
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
      const s = document.getElementById("document_id")?.value || null, l = document.getElementById("selected-document-title")?.textContent?.trim() || null, m = document.getElementById("title"), v = document.getElementById("message"), b = it(
        this.state?.titleSource,
        String(m?.value || "").trim() === "" ? oe.AUTOFILL : oe.USER
      ), L = [];
      document.querySelectorAll(".participant-entry").forEach((I) => {
        const O = I.getAttribute("data-participant-id"), H = I.querySelector('input[name*=".name"]')?.value || "", G = I.querySelector('input[name*=".email"]')?.value || "", q = I.querySelector('select[name*=".role"]')?.value || "signer", V = parseInt(I.querySelector(".signing-stage-input")?.value || "1", 10), X = I.querySelector(".notify-input")?.checked !== !1;
        L.push({ tempId: O, name: H, email: G, role: q, notify: X, signingStage: V });
      });
      const k = [];
      document.querySelectorAll(".field-definition-entry").forEach((I) => {
        const O = I.getAttribute("data-field-definition-id"), H = I.querySelector(".field-type-select")?.value || "signature", G = I.querySelector(".field-participant-select")?.value || "", q = parseInt(I.querySelector('input[name*=".page"]')?.value || "1", 10), V = I.querySelector('input[name*=".required"]')?.checked ?? !0;
        k.push({ tempId: O, type: H, participantTempId: G, page: q, required: V });
      });
      const D = bt(), T = parseInt(Ue?.value || "0", 10) || null;
      return {
        document: { id: s, title: l, pageCount: T },
        details: {
          title: m?.value || "",
          message: v?.value || ""
        },
        titleSource: b,
        participants: L,
        fieldDefinitions: k,
        fieldPlacements: A?.fieldInstances || [],
        fieldRules: D
      };
    }
    restoreFormState() {
      const s = this.state;
      if (!s) return;
      if (s.document.id) {
        const v = document.getElementById("document_id"), b = document.getElementById("selected-document"), L = document.getElementById("document-picker"), k = document.getElementById("selected-document-title"), D = document.getElementById("selected-document-info");
        v && (v.value = s.document.id), k && (k.textContent = s.document.title || "Selected Document"), D && (D.textContent = s.document.pageCount ? `${s.document.pageCount} pages` : ""), Ue && s.document.pageCount && (Ue.value = String(s.document.pageCount)), b && b.classList.remove("hidden"), L && L.classList.add("hidden");
      }
      const l = document.getElementById("title"), m = document.getElementById("message");
      l && (l.value = s.details.title || ""), m && (m.value = s.details.message || "");
    }
  }
  class ci {
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
        created_by_user_id: w
      }, m = await fetch(B(p), {
        method: "POST",
        credentials: "same-origin",
        headers: W(),
        body: JSON.stringify(l)
      });
      if (!m.ok) {
        const v = await m.json().catch(() => ({}));
        throw new Error(v.error?.message || `HTTP ${m.status}`);
      }
      return m.json();
    }
    async update(s, l, m) {
      const v = {
        expected_revision: m,
        wizard_state: l,
        title: l.details.title || "Untitled Agreement",
        current_step: l.currentStep,
        document_id: l.document.id || null,
        updated_by_user_id: w
      }, b = await fetch(B(`${p}/${s}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: W(),
        body: JSON.stringify(v)
      });
      if (b.status === 409) {
        const L = await b.json().catch(() => ({})), k = new Error("stale_revision");
        throw k.code = "stale_revision", k.currentRevision = L.error?.details?.current_revision, k;
      }
      if (!b.ok) {
        const L = await b.json().catch(() => ({}));
        throw new Error(L.error?.message || `HTTP ${b.status}`);
      }
      return b.json();
    }
    async load(s) {
      const l = await fetch(B(`${p}/${s}`), {
        credentials: "same-origin",
        headers: W(!1)
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
        headers: W(!1)
      });
      if (!l.ok && l.status !== 404)
        throw new Error(`HTTP ${l.status}`);
    }
    async list() {
      const s = await fetch(B(`${p}?limit=10`), {
        credentials: "same-origin",
        headers: W(!1)
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
  class li {
    constructor(s, l, m) {
      this.stateManager = s, this.syncService = l, this.statusUpdater = m, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !1, this.currentClaim = null, this.heartbeatTimer = null, this.lastBlockedReason = "", this.initBroadcastChannel(), this.initEventListeners(), this.evaluateActiveTabOwnership("startup", { allowClaimIfAvailable: !0 });
    }
    initBroadcastChannel() {
      if (!(typeof BroadcastChannel > "u"))
        try {
          this.channel = new BroadcastChannel(ke), this.channel.onmessage = (s) => this.handleChannelMessage(s.data);
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
      this.stopHeartbeat(), this.isOwner && (this.heartbeatTimer = window.setInterval(() => {
        this.refreshActiveTabClaim("heartbeat");
      }, Pe));
    }
    stopHeartbeat() {
      this.heartbeatTimer && (window.clearInterval(this.heartbeatTimer), this.heartbeatTimer = null);
    }
    updateOwnershipState(s, l = "", m = null) {
      this.isOwner = !!s, this.currentClaim = m || null, this.lastBlockedReason = this.isOwner ? "" : String(l || "passive_tab").trim() || "passive_tab", this.isOwner ? this.startHeartbeat() : (this.stopHeartbeat(), this.statusUpdater("paused")), Gn({
        isOwner: this.isOwner,
        reason: this.lastBlockedReason,
        claim: this.currentClaim
      });
    }
    refreshActiveTabClaim(s = "heartbeat") {
      if (!this.isOwner) return !1;
      const l = At();
      if (l && !this.isClaimOwnedByThisTab(l) && cn(l))
        return this.updateOwnershipState(!1, "passive_tab", l), !1;
      const m = this.buildActiveTabClaim(l);
      return Tn(m) ? (this.currentClaim = m, s !== "heartbeat" && (this.broadcastMessage({
        type: "active_tab_claimed",
        tabId: m.tabId,
        claimedAt: m.claimedAt,
        lastSeenAt: m.lastSeenAt,
        reason: s
      }), Gn({
        isOwner: !0,
        claim: m
      })), !0) : !1;
    }
    claimActiveTab(s = "claim") {
      const l = At();
      if (l && !this.isClaimOwnedByThisTab(l) && cn(l) && s !== "take_control")
        return this.updateOwnershipState(!1, "passive_tab", l), !1;
      const v = this.buildActiveTabClaim(s === "take_control" ? null : l);
      return Tn(v) ? (this.updateOwnershipState(!0, s, v), this.broadcastMessage({
        type: "active_tab_claimed",
        tabId: v.tabId,
        claimedAt: v.claimedAt,
        lastSeenAt: v.lastSeenAt,
        reason: s
      }), !0) : !1;
    }
    releaseActiveTab(s = "release") {
      const l = At();
      this.isClaimOwnedByThisTab(l) && (ai(this.getTabId()), this.broadcastMessage({
        type: "active_tab_released",
        tabId: this.getTabId(),
        reason: s
      })), this.updateOwnershipState(!1, s, null);
    }
    evaluateActiveTabOwnership(s = "check", l = {}) {
      const m = l?.allowClaimIfAvailable === !0, v = typeof document > "u" || document.visibilityState !== "hidden", b = At();
      return !b || !cn(b) ? m && v ? this.claimActiveTab(s) : (this.updateOwnershipState(!1, "no_active_tab", null), !1) : this.isClaimOwnedByThisTab(b) ? (this.updateOwnershipState(!0, s, b), this.refreshActiveTabClaim("heartbeat"), !0) : (this.updateOwnershipState(!1, "passive_tab", b), !1);
    }
    ensureActiveTabOwnership(s = "sync", l = {}) {
      return this.evaluateActiveTabOwnership(s, {
        allowClaimIfAvailable: l?.allowClaimIfAvailable !== !1
      });
    }
    takeControl() {
      return this.claimActiveTab("take_control");
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
          if (s.tabId !== this.getTabId()) {
            const l = this.stateManager.loadFromSession();
            l && (this.stateManager.setState(l, { syncPending: !!l.syncPending, notify: !1 }), un({}).then(() => {
              this.stateManager.notifyListeners();
            }));
          }
          break;
        case "sync_completed":
          s.tabId !== this.getTabId() && s.draftId && s.revision && this.stateManager.markSynced(s.draftId, s.revision);
          break;
      }
    }
    broadcastStateUpdate() {
      this.broadcastMessage({
        type: "state_updated",
        tabId: this.getTabId()
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
        s.key === ze && this.evaluateActiveTabOwnership("storage", {
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
      }, Ye);
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
            headers: W(),
            body: v,
            keepalive: !0
          });
          if (b.status === 409) {
            const T = await b.json().catch(() => ({})), I = Number(T?.error?.details?.current_revision || 0);
            return this.statusUpdater("conflict"), this.showConflictDialog(I > 0 ? I : m.serverRevision), { conflict: !0 };
          }
          if (!b.ok)
            throw new Error(`HTTP ${b.status}`);
          const L = await b.json().catch(() => ({})), k = String(L?.id || L?.draft_id || m.serverDraftId || "").trim(), D = Number(L?.revision || 0);
          if (k && Number.isFinite(D) && D > 0)
            return this.stateManager.markSynced(k, D), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(k, D), { success: !0, draftId: k, revision: D };
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
      document.getElementById("conflict-local-time").textContent = ln(m.updatedAt), document.getElementById("conflict-server-revision").textContent = s, document.getElementById("conflict-server-time").textContent = "newer version", l?.classList.remove("hidden");
    }
  }
  function ln(o) {
    if (!o) return "unknown";
    const s = new Date(o), m = /* @__PURE__ */ new Date() - s, v = Math.floor(m / 6e4), b = Math.floor(m / 36e5), L = Math.floor(m / 864e5);
    return v < 1 ? "just now" : v < 60 ? `${v} minute${v !== 1 ? "s" : ""} ago` : b < 24 ? `${b} hour${b !== 1 ? "s" : ""} ago` : L < 7 ? `${L} day${L !== 1 ? "s" : ""} ago` : s.toLocaleDateString();
  }
  function kn(o) {
    const s = document.getElementById("sync-status-indicator"), l = document.getElementById("sync-status-icon"), m = document.getElementById("sync-status-text"), v = document.getElementById("sync-retry-btn");
    if (!(!s || !l || !m))
      switch (s.classList.remove("hidden"), o) {
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
        case "paused":
          l.className = "w-2 h-2 rounded-full bg-slate-400", m.textContent = "Open in another tab", m.className = "text-slate-600", v?.classList.add("hidden");
          break;
        case "conflict":
          l.className = "w-2 h-2 rounded-full bg-red-500", m.textContent = "Conflict", m.className = "text-red-600", v?.classList.add("hidden");
          break;
        default:
          s.classList.add("hidden");
      }
  }
  const U = new oi(), Ve = new ci(U), he = new li(U, Ve, kn), Tt = la({
    apiBasePath: d,
    basePath: t
  });
  if (S) {
    const s = U.getState()?.serverDraftId;
    U.clear(), he.broadcastStateUpdate(), s && Ve.delete(s).catch((l) => {
      console.warn("Failed to delete server draft after successful create:", l);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    he.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const o = U.getState();
    if (o.serverDraftId)
      try {
        const s = await Ve.load(o.serverDraftId);
        s.wizard_state && (U.setState({
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
    U.setState({
      ...U.getState(),
      serverRevision: o,
      syncPending: !0
    }, { syncPending: !0 }), he.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function dn(o, s) {
    return U.normalizeLoadedState({
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
  async function un(o = {}) {
    if (c) return U.getState();
    const s = U.normalizeLoadedState(U.getState()), l = String(s?.serverDraftId || "").trim();
    if (!l)
      return U.setState(s, { syncPending: !!s.syncPending, notify: !1 }), U.getState();
    try {
      const m = await Ve.load(l), v = U.normalizeLoadedState({
        ...m?.wizard_state && typeof m.wizard_state == "object" ? m.wizard_state : {},
        serverDraftId: String(m?.id || l).trim() || l,
        serverRevision: Number(m?.revision || 0),
        lastSyncedAt: String(m?.updated_at || m?.updatedAt || "").trim() || s.lastSyncedAt,
        syncPending: !1
      }), L = String(s.serverDraftId || "").trim() === String(v.serverDraftId || "").trim() && s.syncPending === !0 ? dn(s, v) : v;
      return U.setState(L, { syncPending: !!L.syncPending, notify: !1 }), U.getState();
    } catch (m) {
      if (Number(m?.status || 0) === 404) {
        const v = U.normalizeLoadedState({
          ...s,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return U.setState(v, { syncPending: !!v.syncPending, notify: !1 }), U.getState();
      }
      return U.getState();
    }
  }
  function di() {
    const o = document.getElementById("resume-dialog-modal"), s = U.getState(), l = String(s?.document?.title || "").trim() || String(s?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = s.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = l, document.getElementById("resume-draft-step").textContent = s.currentStep, document.getElementById("resume-draft-time").textContent = ln(s.updatedAt), o?.classList.remove("hidden"), Ut("wizard_resume_prompt_shown", {
      step: Number(s.currentStep || 1),
      has_server_draft: !!s.serverDraftId
    });
  }
  async function pn(o = {}) {
    const s = o.deleteServerDraft === !0, l = String(U.getState()?.serverDraftId || "").trim();
    if (U.clear(), he.broadcastStateUpdate(), !(!s || !l))
      try {
        await Ve.delete(l);
      } catch (m) {
        console.warn("Failed to delete server draft:", m);
      }
  }
  function Ot() {
    return U.normalizeLoadedState({
      ...U.getState(),
      ...U.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  function Ht(o) {
    An(o) && (U.setState(o, { syncPending: !0 }), he.scheduleSync(), he.broadcastStateUpdate());
  }
  async function qt(o) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const s = Ot();
    switch (o) {
      case "continue":
        U.restoreFormState(), window._resumeToStep = U.getState().currentStep;
        return;
      case "start_new":
        await pn({ deleteServerDraft: !1 }), Ht(s);
        return;
      case "proceed":
        await pn({ deleteServerDraft: !0 }), Ht(s);
        return;
      case "discard":
        await pn({ deleteServerDraft: !0 });
        return;
      default:
        return;
    }
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    qt("continue");
  }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
    qt("proceed");
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    qt("start_new");
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
    qt("discard");
  });
  async function pt() {
    c || (await un({}), U.hasResumableState() && di());
  }
  pt();
  function jt() {
    const o = U.collectFormState();
    U.updateState(o), he.scheduleSync(), he.broadcastStateUpdate();
  }
  const xe = document.getElementById("document_id"), gt = document.getElementById("selected-document"), mt = document.getElementById("document-picker"), ye = document.getElementById("document-search"), Ne = document.getElementById("document-list"), Pn = document.getElementById("change-document-btn"), st = document.getElementById("selected-document-title"), Ke = document.getElementById("selected-document-info"), Ue = document.getElementById("document_page_count"), zt = document.getElementById("document-remediation-panel"), _n = document.getElementById("document-remediation-message"), ht = document.getElementById("document-remediation-status"), Le = document.getElementById("document-remediation-trigger-btn"), kt = document.getElementById("document-remediation-dismiss-btn"), gn = document.getElementById("title");
  !c && gn && gn.value.trim() !== "" && !U.hasResumableState() && U.setTitleSource(oe.SERVER_SEED, { syncPending: !1 });
  let ft = [], Pt = null;
  const Vt = /* @__PURE__ */ new Set(), Dn = /* @__PURE__ */ new Map();
  function yt(o) {
    return String(o || "").trim().toLowerCase();
  }
  function Xe(o) {
    return String(o || "").trim().toLowerCase();
  }
  function rt(o) {
    return yt(o) === "unsupported";
  }
  function vt() {
    xe && (xe.value = ""), st && (st.textContent = ""), Ke && (Ke.textContent = ""), mn(0), U.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), Tt.setDocument(null, null, null);
  }
  function Gt(o = "") {
    const s = "This document cannot be used because its PDF is incompatible with online signing.", l = Xe(o);
    return l ? `${s} Reason: ${l}. Select another document or upload a remediated PDF.` : `${s} Select another document or upload a remediated PDF.`;
  }
  function at() {
    Pt = null, ht && (ht.textContent = "", ht.className = "mt-2 text-xs text-amber-800"), zt && zt.classList.add("hidden"), Le && (Le.disabled = !1, Le.textContent = "Remediate PDF");
  }
  function wt(o, s = "info") {
    if (!ht) return;
    const l = String(o || "").trim();
    ht.textContent = l;
    const m = s === "error" ? "text-red-700" : s === "success" ? "text-green-700" : "text-amber-800";
    ht.className = `mt-2 text-xs ${m}`;
  }
  function _t(o, s = "") {
    !o || !zt || !_n || (Pt = {
      id: String(o.id || "").trim(),
      title: String(o.title || "").trim(),
      pageCount: ge(o.pageCount, 0),
      compatibilityReason: Xe(s || o.compatibilityReason || "")
    }, Pt.id && (_n.textContent = Gt(Pt.compatibilityReason), wt("Run remediation to make this document signable."), zt.classList.remove("hidden")));
  }
  function ot(o, s, l) {
    xe.value = o, st.textContent = s || "", Ke.textContent = `${l} pages`, mn(l), gt.classList.remove("hidden"), mt.classList.add("hidden"), St(), $n(s);
    const m = ge(l, 0);
    U.updateDocument({
      id: o,
      title: s,
      pageCount: m
    }), Tt.setDocument(o, s, m), at();
  }
  async function ui(o, s, l) {
    const m = String(o || "").trim();
    if (!m) return;
    const v = Date.now(), b = 12e4, L = 1250;
    for (; Date.now() - v < b; ) {
      const k = await fetch(m, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!k.ok)
        throw await Sn(k, "Failed to read remediation status");
      const T = (await k.json())?.dispatch || {}, I = String(T?.status || "").trim().toLowerCase();
      if (I === "succeeded") {
        wt("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (I === "failed" || I === "canceled" || I === "dead_letter") {
        const H = String(T?.terminal_reason || "").trim();
        throw { message: H ? `Remediation failed: ${H}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      wt(I === "retrying" ? "Remediation is retrying in the queue..." : I === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((H) => setTimeout(H, L));
    }
    throw { message: `Timed out waiting for remediation dispatch ${s} (${l})`, code: "REMEDIATION_TIMEOUT", status: 504 };
  }
  async function pi() {
    const o = Pt;
    if (!o || !o.id) return;
    const s = String(o.id || "").trim();
    if (!(!s || Vt.has(s))) {
      Vt.add(s), Le && (Le.disabled = !0, Le.textContent = "Remediating...");
      try {
        let l = Dn.get(s) || "";
        l || (l = `esign-remediate-${s}-${Date.now()}`, Dn.set(s, l));
        const m = `${d}/esign/documents/${encodeURIComponent(s)}/remediate`, v = await fetch(m, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": l
          }
        });
        if (!v.ok)
          throw await Sn(v, "Failed to trigger remediation");
        const b = await v.json(), L = b?.receipt || {}, k = String(L?.dispatch_id || b?.dispatch_id || "").trim(), D = String(L?.mode || b?.mode || "").trim().toLowerCase();
        let T = String(b?.dispatch_status_url || "").trim();
        !T && k && (T = `${d}/esign/dispatches/${encodeURIComponent(k)}`), D === "queued" && k && T && (wt("Remediation queued. Monitoring progress..."), await ui(T, k, s)), await Oe();
        const I = Wt(s);
        if (!I || rt(I.compatibilityTier)) {
          wt("Remediation finished, but this PDF is still incompatible.", "error"), we("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        ot(I.id, I.title, I.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : en("Document remediated successfully. You can continue.", "success");
      } catch (l) {
        wt(String(l?.message || "Remediation failed").trim(), "error"), we(l?.message || "Failed to remediate document", l?.code || "", l?.status || 0);
      } finally {
        Vt.delete(s), Le && (Le.disabled = !1, Le.textContent = "Remediate PDF");
      }
    }
  }
  function Wt(o) {
    const s = String(o || "").trim();
    if (s === "") return null;
    const l = ft.find((b) => String(b.id || "").trim() === s);
    if (l) return l;
    const m = z.recentDocuments.find((b) => String(b.id || "").trim() === s);
    if (m) return m;
    const v = z.searchResults.find((b) => String(b.id || "").trim() === s);
    return v || null;
  }
  function Jt() {
    const o = Wt(xe?.value || "");
    if (!o) return !0;
    const s = yt(o.compatibilityTier);
    return rt(s) ? (_t(o, o.compatibilityReason || ""), vt(), we(Gt(o.compatibilityReason || "")), gt && gt.classList.add("hidden"), mt && mt.classList.remove("hidden"), ye?.focus(), !1) : (at(), !0);
  }
  function mn(o) {
    const s = ge(o, 0);
    Ue && (Ue.value = String(s));
  }
  function hn() {
    const o = (xe?.value || "").trim();
    if (!o) return;
    const s = ft.find((l) => String(l.id || "").trim() === o);
    s && (st.textContent.trim() || (st.textContent = s.title || "Untitled"), (!Ke.textContent.trim() || Ke.textContent.trim() === "pages") && (Ke.textContent = `${s.pageCount || 0} pages`), mn(s.pageCount || 0), gt.classList.remove("hidden"), mt.classList.add("hidden"));
  }
  async function Oe() {
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
        throw await Sn(s, "Failed to load documents");
      const l = await s.json();
      ft = (Array.isArray(l?.records) ? l.records : Array.isArray(l?.items) ? l.items : []).slice().sort((b, L) => {
        const k = Date.parse(String(
          b?.created_at ?? b?.createdAt ?? b?.updated_at ?? b?.updatedAt ?? ""
        )), D = Date.parse(String(
          L?.created_at ?? L?.createdAt ?? L?.updated_at ?? L?.updatedAt ?? ""
        )), T = Number.isFinite(k) ? k : 0;
        return (Number.isFinite(D) ? D : 0) - T;
      }).map((b) => Bi(b)).filter((b) => b.id !== ""), Mn(ft), hn();
    } catch (o) {
      const s = bn(o?.message || "Failed to load documents", o?.code || "", o?.status || 0);
      Ne.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${ue(s)}</div>`;
    }
  }
  function Mn(o) {
    if (o.length === 0) {
      Ne.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${ue(_)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    Ne.innerHTML = o.map((l, m) => {
      const v = ue(String(l.id || "").trim()), b = ue(String(l.title || "").trim()), L = String(ge(l.pageCount, 0)), k = yt(l.compatibilityTier), D = Xe(l.compatibilityReason), T = ue(k), I = ue(D), H = rt(k) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${m === 0 ? "0" : "-1"}"
              data-document-id="${v}"
              data-document-title="${b}"
              data-document-pages="${L}"
              data-document-compatibility-tier="${T}"
              data-document-compatibility-reason="${I}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${b}</div>
          <div class="text-xs text-gray-500">${L} pages ${H}</div>
        </div>
      </button>
    `;
    }).join("");
    const s = Ne.querySelectorAll(".document-option");
    s.forEach((l, m) => {
      l.addEventListener("click", () => Qe(l)), l.addEventListener("keydown", (v) => {
        let b = m;
        if (v.key === "ArrowDown")
          v.preventDefault(), b = Math.min(m + 1, s.length - 1);
        else if (v.key === "ArrowUp")
          v.preventDefault(), b = Math.max(m - 1, 0);
        else if (v.key === "Enter" || v.key === " ") {
          v.preventDefault(), Qe(l);
          return;
        } else v.key === "Home" ? (v.preventDefault(), b = 0) : v.key === "End" && (v.preventDefault(), b = s.length - 1);
        b !== m && (s[b].focus(), s[b].setAttribute("tabindex", "0"), l.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Qe(o) {
    const s = o.getAttribute("data-document-id"), l = o.getAttribute("data-document-title"), m = o.getAttribute("data-document-pages"), v = yt(
      o.getAttribute("data-document-compatibility-tier")
    ), b = Xe(
      o.getAttribute("data-document-compatibility-reason")
    );
    if (rt(v)) {
      _t({ id: s, title: l, pageCount: m, compatibilityReason: b }), vt(), we(Gt(b)), ye?.focus();
      return;
    }
    ot(s, l, m);
  }
  function $n(o) {
    const s = document.getElementById("title");
    if (!s) return;
    const l = U.getState(), m = s.value.trim(), v = it(
      l?.titleSource,
      m === "" ? oe.AUTOFILL : oe.USER
    );
    if (m && v === oe.USER)
      return;
    const b = String(o || "").trim();
    b && (s.value = b, U.updateDetails({
      title: b,
      message: U.getState().details.message || ""
    }, { titleSource: oe.AUTOFILL }));
  }
  function ue(o) {
    const s = document.createElement("div");
    return s.textContent = o, s.innerHTML;
  }
  Pn && Pn.addEventListener("click", () => {
    gt.classList.add("hidden"), mt.classList.remove("hidden"), at(), ye?.focus(), Xt();
  }), Le && Le.addEventListener("click", () => {
    pi();
  }), kt && kt.addEventListener("click", () => {
    at(), ye?.focus();
  });
  const gi = 300, Bn = 5, Yt = 10, fn = document.getElementById("document-typeahead"), ct = document.getElementById("document-typeahead-dropdown"), Kt = document.getElementById("document-recent-section"), Rn = document.getElementById("document-recent-list"), Ge = document.getElementById("document-search-section"), mi = document.getElementById("document-search-list"), lt = document.getElementById("document-empty-state"), yn = document.getElementById("document-dropdown-loading"), Fn = document.getElementById("document-search-loading"), z = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Dt = 0, dt = null;
  function hi(o, s) {
    let l = null;
    return (...m) => {
      l !== null && clearTimeout(l), l = setTimeout(() => {
        o(...m), l = null;
      }, s);
    };
  }
  async function fi() {
    try {
      const o = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Bn)
      });
      w && o.set("created_by_user_id", w);
      const s = await fetch(`${n}/panels/esign_documents?${o}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!s.ok) {
        console.warn("Failed to load recent documents:", s.status);
        return;
      }
      const l = await s.json(), m = Array.isArray(l?.records) ? l.records : Array.isArray(l?.items) ? l.items : [];
      z.recentDocuments = m.map((v) => Bi(v)).filter((v) => v.id !== "").slice(0, Bn);
    } catch (o) {
      console.warn("Error loading recent documents:", o);
    }
  }
  async function Nn(o) {
    const s = o.trim();
    if (!s) {
      dt && (dt.abort(), dt = null), z.isSearchMode = !1, z.searchResults = [], be();
      return;
    }
    const l = ++Dt;
    dt && dt.abort(), dt = new AbortController(), z.isLoading = !0, z.isSearchMode = !0, be();
    try {
      const m = new URLSearchParams({
        q: s,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Yt)
      }), v = await fetch(`${n}/panels/esign_documents?${m}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: dt.signal
      });
      if (l !== Dt)
        return;
      if (!v.ok) {
        console.warn("Failed to search documents:", v.status), z.searchResults = [], z.isLoading = !1, be();
        return;
      }
      const b = await v.json(), L = Array.isArray(b?.records) ? b.records : Array.isArray(b?.items) ? b.items : [];
      z.searchResults = L.map((k) => Bi(k)).filter((k) => k.id !== "").slice(0, Yt);
    } catch (m) {
      if (m?.name === "AbortError")
        return;
      console.warn("Error searching documents:", m), z.searchResults = [];
    } finally {
      l === Dt && (z.isLoading = !1, be());
    }
  }
  const yi = hi(Nn, gi);
  function Xt() {
    ct && (z.isOpen = !0, z.selectedIndex = -1, ct.classList.remove("hidden"), ye?.setAttribute("aria-expanded", "true"), Ne?.classList.add("hidden"), be());
  }
  function Qt() {
    ct && (z.isOpen = !1, z.selectedIndex = -1, ct.classList.add("hidden"), ye?.setAttribute("aria-expanded", "false"), Ne?.classList.remove("hidden"));
  }
  function be() {
    if (ct) {
      if (z.isLoading) {
        yn?.classList.remove("hidden"), Kt?.classList.add("hidden"), Ge?.classList.add("hidden"), lt?.classList.add("hidden"), Fn?.classList.remove("hidden");
        return;
      }
      yn?.classList.add("hidden"), Fn?.classList.add("hidden"), z.isSearchMode ? (Kt?.classList.add("hidden"), z.searchResults.length > 0 ? (Ge?.classList.remove("hidden"), lt?.classList.add("hidden"), ve(mi, z.searchResults, "search")) : (Ge?.classList.add("hidden"), lt?.classList.remove("hidden"))) : (Ge?.classList.add("hidden"), z.recentDocuments.length > 0 ? (Kt?.classList.remove("hidden"), lt?.classList.add("hidden"), ve(Rn, z.recentDocuments, "recent")) : (Kt?.classList.add("hidden"), lt?.classList.remove("hidden"), lt && (lt.textContent = "No recent documents")));
    }
  }
  function ve(o, s, l) {
    o && (o.innerHTML = s.map((m, v) => {
      const b = v, L = z.selectedIndex === b, k = ue(String(m.id || "").trim()), D = ue(String(m.title || "").trim()), T = String(ge(m.pageCount, 0)), I = yt(m.compatibilityTier), O = Xe(m.compatibilityReason), H = ue(I), G = ue(O), V = rt(I) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${L ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${L}"
          tabindex="-1"
          data-document-id="${k}"
          data-document-title="${D}"
          data-document-pages="${T}"
          data-document-compatibility-tier="${H}"
          data-document-compatibility-reason="${G}"
          data-typeahead-index="${b}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${D}</div>
            <div class="text-xs text-gray-500">${T} pages ${V}</div>
          </div>
        </button>
      `;
    }).join(""), o.querySelectorAll(".typeahead-option").forEach((m) => {
      m.addEventListener("click", () => Zt(m));
    }));
  }
  function Zt(o) {
    const s = o.getAttribute("data-document-id"), l = o.getAttribute("data-document-title"), m = o.getAttribute("data-document-pages"), v = yt(
      o.getAttribute("data-document-compatibility-tier")
    ), b = Xe(
      o.getAttribute("data-document-compatibility-reason")
    );
    if (s) {
      if (rt(v)) {
        _t({ id: s, title: l, pageCount: m, compatibilityReason: b }), vt(), we(Gt(b)), ye?.focus();
        return;
      }
      ot(s, l, m), Qt(), ye && (ye.value = ""), z.query = "", z.isSearchMode = !1, z.searchResults = [];
    }
  }
  function vn(o) {
    if (!z.isOpen) {
      (o.key === "ArrowDown" || o.key === "Enter") && (o.preventDefault(), Xt());
      return;
    }
    const s = z.isSearchMode ? z.searchResults : z.recentDocuments, l = s.length - 1;
    switch (o.key) {
      case "ArrowDown":
        o.preventDefault(), z.selectedIndex = Math.min(z.selectedIndex + 1, l), be(), Mt();
        break;
      case "ArrowUp":
        o.preventDefault(), z.selectedIndex = Math.max(z.selectedIndex - 1, 0), be(), Mt();
        break;
      case "Enter":
        if (o.preventDefault(), z.selectedIndex >= 0 && z.selectedIndex <= l) {
          const m = s[z.selectedIndex];
          if (m) {
            const v = document.createElement("button");
            v.setAttribute("data-document-id", m.id), v.setAttribute("data-document-title", m.title), v.setAttribute("data-document-pages", String(m.pageCount)), v.setAttribute("data-document-compatibility-tier", String(m.compatibilityTier || "")), v.setAttribute("data-document-compatibility-reason", String(m.compatibilityReason || "")), Zt(v);
          }
        }
        break;
      case "Escape":
        o.preventDefault(), Qt();
        break;
      case "Tab":
        Qt();
        break;
      case "Home":
        o.preventDefault(), z.selectedIndex = 0, be(), Mt();
        break;
      case "End":
        o.preventDefault(), z.selectedIndex = l, be(), Mt();
        break;
    }
  }
  function Mt() {
    if (!ct) return;
    const o = ct.querySelector(`[data-typeahead-index="${z.selectedIndex}"]`);
    o && o.scrollIntoView({ block: "nearest" });
  }
  ye && (ye.addEventListener("input", (o) => {
    const l = o.target.value;
    z.query = l, z.isOpen || Xt(), l.trim() ? (z.isLoading = !0, be(), yi(l)) : (z.isSearchMode = !1, z.searchResults = [], be());
    const m = ft.filter(
      (v) => String(v.title || "").toLowerCase().includes(l.toLowerCase())
    );
    Mn(m);
  }), ye.addEventListener("focus", () => {
    Xt();
  }), ye.addEventListener("keydown", vn)), document.addEventListener("click", (o) => {
    const s = o.target;
    fn && !fn.contains(s) && Qt();
  }), Oe(), fi();
  const Ce = document.getElementById("participants-container"), vi = document.getElementById("participant-template"), a = document.getElementById("add-participant-btn");
  let u = 0, g = 0;
  function f() {
    return `temp_${Date.now()}_${u++}`;
  }
  function y(o = {}) {
    const s = vi.content.cloneNode(!0), l = s.querySelector(".participant-entry"), m = o.id || f();
    l.setAttribute("data-participant-id", m);
    const v = l.querySelector(".participant-id-input"), b = l.querySelector('input[name="participants[].name"]'), L = l.querySelector('input[name="participants[].email"]'), k = l.querySelector('select[name="participants[].role"]'), D = l.querySelector('input[name="participants[].signing_stage"]'), T = l.querySelector('input[name="participants[].notify"]'), I = l.querySelector(".signing-stage-wrapper"), O = g++;
    v.name = `participants[${O}].id`, v.value = m, b.name = `participants[${O}].name`, L.name = `participants[${O}].email`, k.name = `participants[${O}].role`, D && (D.name = `participants[${O}].signing_stage`), T && (T.name = `participants[${O}].notify`), o.name && (b.value = o.name), o.email && (L.value = o.email), o.role && (k.value = o.role), D && o.signing_stage && (D.value = o.signing_stage), T && (T.checked = o.notify !== !1);
    const H = () => {
      if (!I || !D) return;
      const G = k.value === "signer";
      I.classList.toggle("hidden", !G), G ? D.value || (D.value = "1") : D.value = "";
    };
    H(), l.querySelector(".remove-participant-btn").addEventListener("click", () => {
      l.remove(), $t();
    }), k.addEventListener("change", () => {
      H(), $t();
    }), Ce.appendChild(s);
  }
  a.addEventListener("click", () => y()), N.length > 0 ? N.forEach((o) => {
    y({
      id: String(o.id || "").trim(),
      name: String(o.name || "").trim(),
      email: String(o.email || "").trim(),
      role: String(o.role || "signer").trim() || "signer",
      notify: o.notify !== !1,
      signing_stage: Number(o.signing_stage || o.signingStage || 1) || 1
    });
  }) : y();
  const x = document.getElementById("field-definitions-container"), C = document.getElementById("field-definition-template"), M = document.getElementById("add-field-btn"), F = document.getElementById("add-field-btn-container"), ee = document.getElementById("add-field-definition-empty-btn"), J = document.getElementById("field-definitions-empty-state"), j = document.getElementById("field-rules-container"), Ae = document.getElementById("field-rule-template"), De = document.getElementById("add-field-rule-btn"), K = document.getElementById("field-rules-empty-state"), ce = document.getElementById("field-rules-preview"), We = document.getElementById("field_rules_json"), He = document.getElementById("field_placements_json");
  let wi = 0, Un = 0, wn = 0;
  function bi() {
    return `temp_field_${Date.now()}_${wi++}`;
  }
  function Si() {
    return `rule_${Date.now()}_${wn}`;
  }
  function Ze() {
    const o = Ce.querySelectorAll(".participant-entry"), s = [];
    return o.forEach((l) => {
      const m = l.getAttribute("data-participant-id"), v = l.querySelector('select[name*=".role"]'), b = l.querySelector('input[name*=".name"]'), L = l.querySelector('input[name*=".email"]');
      v.value === "signer" && s.push({
        id: m,
        name: b.value || L.value || "Signer",
        email: L.value
      });
    }), s;
  }
  function On(o, s) {
    const l = String(o || "").trim();
    return l && s.some((m) => m.id === l) ? l : s.length === 1 ? s[0].id : "";
  }
  function Hn(o, s, l = "") {
    if (!o) return;
    const m = On(l, s);
    o.innerHTML = '<option value="">Select signer...</option>', s.forEach((v) => {
      const b = document.createElement("option");
      b.value = v.id, b.textContent = v.name, o.appendChild(b);
    }), o.value = m;
  }
  function Qs(o = Ze()) {
    const s = x.querySelectorAll(".field-participant-select"), l = j ? j.querySelectorAll(".field-rule-participant-select") : [];
    s.forEach((m) => {
      Hn(m, o, m.value);
    }), l.forEach((m) => {
      Hn(m, o, m.value);
    });
  }
  function $t() {
    const o = Ze();
    Qs(o), St();
  }
  function qe() {
    const o = ge(Ue?.value || "0", 0);
    if (o > 0) return o;
    const s = String(Ke?.textContent || "").match(/(\d+)\s+pages?/i);
    if (s) {
      const l = ge(s[1], 0);
      if (l > 0) return l;
    }
    return 1;
  }
  function qn() {
    if (!j || !K) return;
    const o = j.querySelectorAll(".field-rule-entry");
    K.classList.toggle("hidden", o.length > 0);
  }
  function bt() {
    if (!j) return [];
    const o = qe(), s = j.querySelectorAll(".field-rule-entry"), l = [];
    return s.forEach((m) => {
      const v = Xn({
        id: m.getAttribute("data-field-rule-id") || "",
        type: m.querySelector(".field-rule-type-select")?.value || "",
        participantId: m.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: m.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: m.querySelector(".field-rule-to-page-input")?.value || "",
        page: m.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!m.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: Cn(m.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (m.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, o);
      v.type && l.push(v);
    }), l;
  }
  function Yi() {
    return bt().map((o) => fa(o));
  }
  function jn(o, s) {
    return va(o, s);
  }
  function St() {
    if (!ce) return;
    const o = bt(), s = qe(), l = jn(o, s), m = Ze(), v = new Map(m.map((D) => [String(D.id), D.name]));
    if (We && (We.value = JSON.stringify(Yi())), !l.length) {
      ce.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const b = l.reduce((D, T) => {
      const I = T.type;
      return D[I] = (D[I] || 0) + 1, D;
    }, {}), L = l.slice(0, 8).map((D) => {
      const T = v.get(String(D.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${D.type === "initials" ? "Initials" : "Signature"} on page ${D.page}</span><span class="text-gray-500">${ue(String(T))}</span></li>`;
    }).join(""), k = l.length - 8;
    ce.innerHTML = `
      <p class="text-gray-700">${l.length} generated field${l.length !== 1 ? "s" : ""} (${b.initials || 0} initials, ${b.signature || 0} signatures)</p>
      <ul class="space-y-1">${L}</ul>
      ${k > 0 ? `<p class="text-gray-500">+${k} more</p>` : ""}
    `;
  }
  function Ki() {
    const o = Ze(), s = new Map(o.map((T) => [String(T.id), T.name || T.email || "Signer"])), l = [];
    x.querySelectorAll(".field-definition-entry").forEach((T) => {
      const I = String(T.getAttribute("data-field-definition-id") || "").trim(), O = T.querySelector(".field-type-select"), H = T.querySelector(".field-participant-select"), G = T.querySelector('input[name*=".page"]'), q = String(O?.value || "text").trim() || "text", V = String(H?.value || "").trim(), X = parseInt(String(G?.value || "1"), 10) || 1;
      l.push({
        definitionId: I,
        fieldType: q,
        participantId: V,
        participantName: s.get(V) || "Unassigned",
        page: X
      });
    });
    const v = jn(bt(), qe()), b = /* @__PURE__ */ new Map();
    v.forEach((T) => {
      const I = String(T.ruleId || "").trim(), O = String(T.id || "").trim();
      if (I && O) {
        const H = b.get(I) || [];
        H.push(O), b.set(I, H);
      }
    });
    let L = A.linkGroupState;
    b.forEach((T, I) => {
      if (T.length > 1 && !A.linkGroupState.groups.get(`rule_${I}`)) {
        const H = pa(T, `Rule ${I}`);
        H.id = `rule_${I}`, L = Es(L, H);
      }
    }), A.linkGroupState = L, v.forEach((T) => {
      const I = String(T.id || "").trim();
      if (!I) return;
      const O = String(T.participantId || "").trim(), H = parseInt(String(T.page || "1"), 10) || 1, G = String(T.ruleId || "").trim();
      l.push({
        definitionId: I,
        fieldType: String(T.type || "text").trim() || "text",
        participantId: O,
        participantName: s.get(O) || "Unassigned",
        page: H,
        linkGroupId: G ? `rule_${G}` : void 0
      });
    });
    const k = /* @__PURE__ */ new Set(), D = l.filter((T) => {
      const I = String(T.definitionId || "").trim();
      return !I || k.has(I) ? !1 : (k.add(I), !0);
    });
    return D.sort((T, I) => T.page !== I.page ? T.page - I.page : T.definitionId.localeCompare(I.definitionId)), D;
  }
  function Xi(o) {
    const s = o.querySelector(".field-rule-type-select"), l = o.querySelector(".field-rule-range-start-wrap"), m = o.querySelector(".field-rule-range-end-wrap"), v = o.querySelector(".field-rule-page-wrap"), b = o.querySelector(".field-rule-exclude-last-wrap"), L = o.querySelector(".field-rule-exclude-pages-wrap"), k = o.querySelector(".field-rule-summary"), D = o.querySelector(".field-rule-from-page-input"), T = o.querySelector(".field-rule-to-page-input"), I = o.querySelector(".field-rule-page-input"), O = o.querySelector(".field-rule-exclude-last-input"), H = o.querySelector(".field-rule-exclude-pages-input"), G = qe(), q = Xn({
      type: s?.value || "",
      fromPage: D?.value || "",
      toPage: T?.value || "",
      page: I?.value || "",
      excludeLastPage: !!O?.checked,
      excludePages: Cn(H?.value || ""),
      required: !0
    }, G), V = q.fromPage > 0 ? q.fromPage : 1, X = q.toPage > 0 ? q.toPage : G, ne = q.page > 0 ? q.page : q.toPage > 0 ? q.toPage : G, fe = q.excludeLastPage, Se = q.excludePages.join(","), ie = s?.value === "initials_each_page";
    if (l.classList.toggle("hidden", !ie), m.classList.toggle("hidden", !ie), b.classList.toggle("hidden", !ie), L.classList.toggle("hidden", !ie), v.classList.toggle("hidden", ie), D && (D.value = String(V)), T && (T.value = String(X)), I && (I.value = String(ne)), H && (H.value = Se), O && (O.checked = fe), ie) {
      const de = wa(
        V,
        X,
        G,
        fe,
        q.excludePages
      ), tt = ba(de);
      de.isEmpty ? k.textContent = `Warning: No initials fields will be generated ${tt}.` : k.textContent = `Generates initials fields on ${tt}.`;
    } else
      k.textContent = `Generates one signature field on page ${ne}.`;
  }
  function Qi(o = {}) {
    if (!Ae || !j) return;
    const s = Ae.content.cloneNode(!0), l = s.querySelector(".field-rule-entry"), m = o.id || Si(), v = wn++, b = qe();
    l.setAttribute("data-field-rule-id", m);
    const L = l.querySelector(".field-rule-id-input"), k = l.querySelector(".field-rule-type-select"), D = l.querySelector(".field-rule-participant-select"), T = l.querySelector(".field-rule-from-page-input"), I = l.querySelector(".field-rule-to-page-input"), O = l.querySelector(".field-rule-page-input"), H = l.querySelector(".field-rule-required-select"), G = l.querySelector(".field-rule-exclude-last-input"), q = l.querySelector(".field-rule-exclude-pages-input"), V = l.querySelector(".remove-field-rule-btn");
    L.name = `field_rules[${v}].id`, L.value = m, k.name = `field_rules[${v}].type`, D.name = `field_rules[${v}].participant_id`, T.name = `field_rules[${v}].from_page`, I.name = `field_rules[${v}].to_page`, O.name = `field_rules[${v}].page`, H.name = `field_rules[${v}].required`, G.name = `field_rules[${v}].exclude_last_page`, q.name = `field_rules[${v}].exclude_pages`;
    const X = Xn(o, b);
    k.value = X.type || "initials_each_page", Hn(D, Ze(), X.participantId), T.value = String(X.fromPage > 0 ? X.fromPage : 1), I.value = String(X.toPage > 0 ? X.toPage : b), O.value = String(X.page > 0 ? X.page : b), H.value = X.required ? "1" : "0", G.checked = X.excludeLastPage, q.value = X.excludePages.join(",");
    const ne = () => {
      Xi(l), St(), et();
    }, fe = () => {
      const ie = qe();
      if (T) {
        const de = parseInt(T.value, 10);
        Number.isFinite(de) && (T.value = String(En(de, ie, 1)));
      }
      if (I) {
        const de = parseInt(I.value, 10);
        Number.isFinite(de) && (I.value = String(En(de, ie, 1)));
      }
      if (O) {
        const de = parseInt(O.value, 10);
        Number.isFinite(de) && (O.value = String(En(de, ie, 1)));
      }
    }, Se = () => {
      fe(), ne();
    };
    k.addEventListener("change", ne), D.addEventListener("change", ne), T.addEventListener("input", Se), T.addEventListener("change", Se), I.addEventListener("input", Se), I.addEventListener("change", Se), O.addEventListener("input", Se), O.addEventListener("change", Se), H.addEventListener("change", ne), G.addEventListener("change", () => {
      const ie = qe();
      if (G.checked) {
        const de = Math.max(1, ie - 1);
        I.value = String(de);
      } else
        I.value = String(ie);
      ne();
    }), q.addEventListener("input", ne), V.addEventListener("click", () => {
      l.remove(), qn(), St(), et();
    }), j.appendChild(s), Xi(j.lastElementChild), qn(), St();
  }
  function zn(o = {}) {
    const s = C.content.cloneNode(!0), l = s.querySelector(".field-definition-entry"), m = o.id || bi();
    l.setAttribute("data-field-definition-id", m);
    const v = l.querySelector(".field-definition-id-input"), b = l.querySelector('select[name="field_definitions[].type"]'), L = l.querySelector('select[name="field_definitions[].participant_id"]'), k = l.querySelector('input[name="field_definitions[].page"]'), D = l.querySelector('input[name="field_definitions[].required"]'), T = l.querySelector(".field-date-signed-info"), I = Un++;
    v.name = `field_instances[${I}].id`, v.value = m, b.name = `field_instances[${I}].type`, L.name = `field_instances[${I}].participant_id`, k.name = `field_instances[${I}].page`, D.name = `field_instances[${I}].required`, o.type && (b.value = o.type), o.page && (k.value = String(En(o.page, qe(), 1))), o.required !== void 0 && (D.checked = o.required);
    const O = String(o.participant_id || o.participantId || "").trim();
    Hn(L, Ze(), O), b.addEventListener("change", () => {
      b.value === "date_signed" ? T.classList.remove("hidden") : T.classList.add("hidden");
    }), b.value === "date_signed" && T.classList.remove("hidden"), l.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      l.remove(), Vn();
    });
    const H = l.querySelector('input[name*=".page"]'), G = () => {
      H && (H.value = String(En(H.value, qe(), 1)));
    };
    G(), H?.addEventListener("input", G), H?.addEventListener("change", G), x.appendChild(s), Vn();
  }
  function Vn() {
    x.querySelectorAll(".field-definition-entry").length === 0 ? (J.classList.remove("hidden"), F?.classList.add("hidden")) : (J.classList.add("hidden"), F?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    $t();
  }).observe(Ce, { childList: !0, subtree: !0 }), Ce.addEventListener("change", (o) => {
    (o.target.matches('select[name*=".role"]') || o.target.matches('input[name*=".name"]') || o.target.matches('input[name*=".email"]')) && $t();
  }), Ce.addEventListener("input", (o) => {
    (o.target.matches('input[name*=".name"]') || o.target.matches('input[name*=".email"]')) && $t();
  }), M.addEventListener("click", () => zn()), ee.addEventListener("click", () => zn()), De?.addEventListener("click", () => Qi({ to_page: qe() })), window._initialFieldPlacementsData = [], R.forEach((o) => {
    const s = String(o.id || "").trim();
    if (!s) return;
    const l = String(o.type || "signature").trim() || "signature", m = String(o.participant_id || o.participantId || "").trim(), v = Number(o.page || 1) || 1, b = !!o.required;
    zn({
      id: s,
      type: l,
      participant_id: m,
      page: v,
      required: b
    }), window._initialFieldPlacementsData.push(Qn({
      id: s,
      definitionId: s,
      type: l,
      participantId: m,
      participantName: String(o.participant_name || o.participantName || "").trim(),
      page: v,
      x: Number(o.x || o.pos_x || 0) || 0,
      y: Number(o.y || o.pos_y || 0) || 0,
      width: Number(o.width || 150) || 150,
      height: Number(o.height || 32) || 32,
      placementSource: String(o.placement_source || o.placementSource || Te.MANUAL).trim() || Te.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), Vn(), $t(), qn(), St();
  const Bt = document.getElementById("agreement-form"), Me = document.getElementById("submit-btn"), Zi = document.getElementById("form-announcements"), xi = document.getElementById("active-tab-banner"), es = document.getElementById("active-tab-message"), ts = document.getElementById("active-tab-take-control-btn"), Zs = document.getElementById("active-tab-reload-btn");
  function Ii(o) {
    const s = document.getElementById("wizard-save-btn");
    s instanceof HTMLButtonElement && (s.disabled = o), Me instanceof HTMLButtonElement && (Me.disabled = o);
  }
  function Gn(o = {}) {
    const s = o?.isOwner !== !1;
    if (!xi || !es) {
      Ii(!s);
      return;
    }
    if (s) {
      xi.classList.add("hidden"), ts?.removeAttribute("disabled"), Ii(!1);
      return;
    }
    const l = o?.claim, m = l?.lastSeenAt ? ln(l.lastSeenAt) : "recently";
    es.textContent = `This agreement is active in another tab. Take control here to resume syncing and sending. Last seen ${m}.`, xi.classList.remove("hidden"), Ii(!0);
  }
  function bn(o, s = "", l = 0) {
    const m = String(s || "").trim().toUpperCase(), v = String(o || "").trim().toLowerCase();
    return m === "DRAFT_SEND_NOT_FOUND" || m === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : m === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : m === "SCOPE_DENIED" || v.includes("scope denied") ? "You don't have access to this organization's resources." : m === "TRANSPORT_SECURITY" || m === "TRANSPORT_SECURITY_REQUIRED" || v.includes("tls transport required") || Number(l) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : m === "PDF_UNSUPPORTED" || v === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(o || "").trim() !== "" ? String(o).trim() : "Something went wrong. Please try again.";
  }
  async function Sn(o, s) {
    const l = Number(o?.status || 0);
    let m = "", v = "", b = {};
    try {
      const L = await o.json();
      m = String(L?.error?.code || L?.code || "").trim(), v = String(L?.error?.message || L?.message || "").trim(), b = L?.error?.details && typeof L.error.details == "object" ? L.error.details : {}, String(b?.entity || "").trim().toLowerCase() === "drafts" && String(m).trim().toUpperCase() === "NOT_FOUND" && (m = "DRAFT_SEND_NOT_FOUND", v === "" && (v = "Draft not found"));
    } catch {
      v = "";
    }
    return v === "" && (v = s || `Request failed (${l || "unknown"})`), {
      status: l,
      code: m,
      details: b,
      message: bn(v, m, l)
    };
  }
  function we(o, s = "", l = 0) {
    const m = bn(o, s, l);
    Zi && (Zi.textContent = m), window.toastManager ? window.toastManager.error(m) : alert(m);
  }
  ts?.addEventListener("click", () => {
    if (!he.takeControl()) {
      we("This agreement is active in another tab. Take control here before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED");
      return;
    }
    Gn({ isOwner: !0 }), U.getState()?.syncPending && he.manualRetry(), pe === Ee.REVIEW && ms();
  }), Zs?.addEventListener("click", () => {
    window.location.reload();
  });
  function er() {
    const o = [];
    Ce.querySelectorAll(".participant-entry").forEach((v) => {
      const b = String(v.getAttribute("data-participant-id") || "").trim(), L = String(v.querySelector('input[name*=".name"]')?.value || "").trim(), k = String(v.querySelector('input[name*=".email"]')?.value || "").trim(), D = String(v.querySelector('select[name*=".role"]')?.value || "signer").trim(), T = v.querySelector(".notify-input")?.checked !== !1, I = String(v.querySelector(".signing-stage-input")?.value || "").trim(), O = Number(I || "1") || 1;
      o.push({
        id: b,
        name: L,
        email: k,
        role: D,
        notify: T,
        signing_stage: D === "signer" ? O : 0
      });
    });
    const s = [];
    x.querySelectorAll(".field-definition-entry").forEach((v) => {
      const b = String(v.getAttribute("data-field-definition-id") || "").trim(), L = String(v.querySelector(".field-type-select")?.value || "signature").trim(), k = String(v.querySelector(".field-participant-select")?.value || "").trim(), D = Number(v.querySelector('input[name*=".page"]')?.value || "1") || 1, T = !!v.querySelector('input[name*=".required"]')?.checked;
      b && s.push({
        id: b,
        type: L,
        participant_id: k,
        page: D,
        required: T
      });
    });
    const l = [];
    A && Array.isArray(A.fieldInstances) && A.fieldInstances.forEach((v, b) => {
      l.push(ks(v, b));
    });
    const m = JSON.stringify(l);
    return He && (He.value = m), {
      document_id: String(xe?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: o,
      field_instances: s,
      field_placements: l,
      field_placements_json: m,
      field_rules: Yi(),
      field_rules_json: String(We?.value || "[]"),
      send_for_signature: pe === Lt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(Ue?.value || "0") || 0
    };
  }
  function Ei() {
    const o = Ze(), s = /* @__PURE__ */ new Map();
    return o.forEach((v) => {
      s.set(v.id, !1);
    }), x.querySelectorAll(".field-definition-entry").forEach((v) => {
      const b = v.querySelector(".field-type-select"), L = v.querySelector(".field-participant-select"), k = v.querySelector('input[name*=".required"]');
      b?.value === "signature" && L?.value && k?.checked && s.set(L.value, !0);
    }), jn(bt(), qe()).forEach((v) => {
      v.type === "signature" && v.participantId && v.required && s.set(v.participantId, !0);
    }), o.filter((v) => !s.get(v.id));
  }
  function ns(o) {
    if (!Array.isArray(o) || o.length === 0)
      return "Each signer requires at least one required signature field.";
    const s = o.map((l) => l?.name?.trim()).filter((l) => !!l);
    return s.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${s.join(", ")}`;
  }
  async function is() {
    U.updateState(U.collectFormState());
    const o = await he.forceSync();
    if (o?.blocked && o.reason === "passive_tab")
      throw {
        code: "ACTIVE_TAB_OWNERSHIP_REQUIRED",
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const s = U.getState();
    if (s?.syncPending)
      throw new Error("Unable to sync latest draft changes");
    return s;
  }
  async function tr() {
    const o = await is(), s = String(o?.serverDraftId || "").trim();
    if (!s) {
      const l = await Ve.create(o);
      return U.markSynced(l.id, l.revision), {
        draftID: String(l.id || "").trim(),
        revision: Number(l.revision || 0)
      };
    }
    try {
      const l = await Ve.load(s), m = String(l?.id || s).trim(), v = Number(l?.revision || o?.serverRevision || 0);
      return m && v > 0 && U.markSynced(m, v), {
        draftID: m,
        revision: v > 0 ? v : Number(o?.serverRevision || 0)
      };
    } catch (l) {
      if (Number(l?.status || 0) !== 404)
        throw l;
      const m = await Ve.create({
        ...U.getState(),
        ...U.collectFormState()
      }), v = String(m?.id || "").trim(), b = Number(m?.revision || 0);
      return U.markSynced(v, b), Ut("wizard_send_stale_draft_recovered", {
        stale_draft_id: s,
        recovered_draft_id: v
      }), { draftID: v, revision: b };
    }
  }
  async function nr() {
    const o = U.getState();
    U.setState({
      ...o,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await he.forceSync();
  }
  Bt.addEventListener("submit", function(o) {
    if (St(), !xe.value) {
      o.preventDefault(), we("Please select a document"), ye.focus();
      return;
    }
    if (!Jt()) {
      o.preventDefault();
      return;
    }
    const s = Ce.querySelectorAll(".participant-entry");
    if (s.length === 0) {
      o.preventDefault(), we("Please add at least one participant"), a.focus();
      return;
    }
    let l = !1;
    if (s.forEach((I) => {
      I.querySelector('select[name*=".role"]').value === "signer" && (l = !0);
    }), !l) {
      o.preventDefault(), we("At least one signer is required");
      const I = s[0]?.querySelector('select[name*=".role"]');
      I && I.focus();
      return;
    }
    const m = x.querySelectorAll(".field-definition-entry"), v = Ei();
    if (v.length > 0) {
      o.preventDefault(), we(ns(v)), xn(Ee.FIELDS), M.focus();
      return;
    }
    let b = !1;
    if (m.forEach((I) => {
      I.querySelector(".field-participant-select").value || (b = !0);
    }), b) {
      o.preventDefault(), we("Please assign all fields to a signer");
      const I = x.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      I && I.focus();
      return;
    }
    if (bt().some((I) => !I.participantId)) {
      o.preventDefault(), we("Please assign all automation rules to a signer"), Array.from(j?.querySelectorAll(".field-rule-participant-select") || []).find((O) => !O.value)?.focus();
      return;
    }
    const D = !!Bt.querySelector('input[name="save_as_draft"]'), T = pe === Lt && !D;
    if (T) {
      let I = Bt.querySelector('input[name="send_for_signature"]');
      I || (I = document.createElement("input"), I.type = "hidden", I.name = "send_for_signature", Bt.appendChild(I)), I.value = "1";
    } else
      Bt.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      o.preventDefault(), Me.disabled = !0, Me.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${T ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          er();
          const I = String(e.routes?.index || "").trim();
          if (!T) {
            if (await is(), I) {
              window.location.href = I;
              return;
            }
            window.location.reload();
            return;
          }
          const O = await tr(), H = String(O?.draftID || "").trim(), G = Number(O?.revision || 0);
          if (!H || G <= 0)
            throw new Error("Draft session not available. Please try again.");
          if (!he.ensureActiveTabOwnership("send", { allowClaimIfAvailable: !0 }))
            throw {
              code: "ACTIVE_TAB_OWNERSHIP_REQUIRED",
              message: "This agreement is active in another tab. Take control in this tab before sending."
            };
          const q = await fetch(
            B(`${p}/${encodeURIComponent(H)}/send`),
            {
              method: "POST",
              credentials: "same-origin",
              headers: W(),
              body: JSON.stringify({
                expected_revision: G,
                created_by_user_id: w
              })
            }
          );
          if (!q.ok) {
            const ne = await Sn(q, "Failed to send agreement");
            throw String(ne?.code || "").trim().toUpperCase() === "DRAFT_SEND_NOT_FOUND" ? (Ut("wizard_send_not_found", {
              draft_id: H,
              status: Number(ne?.status || 0)
            }), await nr().catch(() => {
            }), {
              ...ne,
              code: "DRAFT_SESSION_STALE"
            }) : ne;
          }
          const V = await q.json(), X = String(V?.agreement_id || V?.id || V?.data?.id || "").trim();
          if (U.clear(), he.broadcastStateUpdate(), X && I) {
            window.location.href = `${I}/${encodeURIComponent(X)}`;
            return;
          }
          if (I) {
            window.location.href = I;
            return;
          }
          window.location.reload();
        } catch (I) {
          const O = String(I?.message || "Failed to process agreement").trim(), H = String(I?.code || "").trim(), G = Number(I?.status || 0);
          we(O, H, G), Me.disabled = !1, Me.innerHTML = `
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
      ${T ? "Sending..." : "Saving..."}
    `;
  });
  let pe = 1;
  const ss = document.querySelectorAll(".wizard-step-btn"), ir = document.querySelectorAll(".wizard-step"), sr = document.querySelectorAll(".wizard-connector"), rs = document.getElementById("wizard-prev-btn"), Li = document.getElementById("wizard-next-btn"), as = document.getElementById("wizard-save-btn");
  function Ci() {
    if (ss.forEach((o, s) => {
      const l = s + 1, m = o.querySelector(".wizard-step-number");
      l < pe ? (o.classList.remove("text-gray-500", "text-blue-600"), o.classList.add("text-green-600"), m.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), m.classList.add("bg-green-600", "text-white"), o.removeAttribute("aria-current")) : l === pe ? (o.classList.remove("text-gray-500", "text-green-600"), o.classList.add("text-blue-600"), m.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), m.classList.add("bg-blue-600", "text-white"), o.setAttribute("aria-current", "step")) : (o.classList.remove("text-blue-600", "text-green-600"), o.classList.add("text-gray-500"), m.classList.remove("bg-blue-600", "text-white", "bg-green-600"), m.classList.add("bg-gray-300", "text-gray-600"), o.removeAttribute("aria-current"));
    }), sr.forEach((o, s) => {
      s < pe - 1 ? (o.classList.remove("bg-gray-300"), o.classList.add("bg-green-600")) : (o.classList.remove("bg-green-600"), o.classList.add("bg-gray-300"));
    }), ir.forEach((o) => {
      parseInt(o.dataset.step, 10) === pe ? o.classList.remove("hidden") : o.classList.add("hidden");
    }), rs.classList.toggle("hidden", pe === 1), Li.classList.toggle("hidden", pe === Lt), as.classList.toggle("hidden", pe !== Lt), Me.classList.toggle("hidden", pe !== Lt), Gn({
      isOwner: he.isOwner,
      reason: he.lastBlockedReason,
      claim: he.currentClaim
    }), pe < Lt) {
      const o = Zr[pe] || "Next";
      Li.innerHTML = `
        ${o}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    pe === Ee.PLACEMENT ? ar() : pe === Ee.REVIEW && ms(), Tt.updateVisibility(pe);
  }
  function rr(o) {
    switch (o) {
      case 1:
        return xe.value ? !!Jt() : (we("Please select a document"), !1);
      case 2:
        const s = document.getElementById("title");
        return s.value.trim() ? !0 : (we("Please enter an agreement title"), s.focus(), !1);
      case 3:
        const l = Ce.querySelectorAll(".participant-entry");
        if (l.length === 0)
          return we("Please add at least one participant"), !1;
        let m = !1;
        return l.forEach((D) => {
          D.querySelector('select[name*=".role"]').value === "signer" && (m = !0);
        }), m ? !0 : (we("At least one signer is required"), !1);
      case 4:
        const v = x.querySelectorAll(".field-definition-entry");
        for (const D of v) {
          const T = D.querySelector(".field-participant-select");
          if (!T.value)
            return we("Please assign all fields to a signer"), T.focus(), !1;
        }
        if (bt().find((D) => !D.participantId))
          return we("Please assign all automation rules to a signer"), j?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const k = Ei();
        return k.length > 0 ? (we(ns(k)), M.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function xn(o) {
    if (!(o < Ee.DOCUMENT || o > Lt)) {
      if (o > pe) {
        for (let s = pe; s < o; s++)
          if (!rr(s)) return;
      }
      pe = o, Ci(), U.updateStep(o), jt(), he.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  ss.forEach((o) => {
    o.addEventListener("click", () => {
      const s = parseInt(o.dataset.step, 10);
      xn(s);
    });
  }), rs.addEventListener("click", () => xn(pe - 1)), Li.addEventListener("click", () => xn(pe + 1)), as.addEventListener("click", () => {
    const o = document.createElement("input");
    o.type = "hidden", o.name = "save_as_draft", o.value = "1", Bt.appendChild(o), Bt.submit();
  });
  let A = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((o, s) => Qn(o, s)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: ua()
  };
  const xt = {
    signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
    name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
    date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
    text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
    checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
    initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
  }, Wn = {
    signature: { width: 200, height: 50 },
    name: { width: 180, height: 30 },
    date_signed: { width: 120, height: 30 },
    text: { width: 150, height: 30 },
    checkbox: { width: 24, height: 24 },
    initials: { width: 80, height: 40 }
  };
  async function ar() {
    const o = document.getElementById("placement-loading"), s = document.getElementById("placement-no-document"), l = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const m = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const v = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const b = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !xe.value) {
      o.classList.add("hidden"), s.classList.remove("hidden");
      return;
    }
    o.classList.remove("hidden"), s.classList.add("hidden");
    const L = Ki(), k = new Set(
      L.map((V) => String(V.definitionId || "").trim()).filter((V) => V)
    );
    A.fieldInstances = A.fieldInstances.filter(
      (V) => k.has(String(V.definitionId || "").trim())
    ), l.innerHTML = "";
    const D = A.linkGroupState.groups.size > 0, T = document.getElementById("link-batch-actions");
    T && T.classList.toggle("hidden", !D);
    const I = L.map((V) => {
      const X = String(V.definitionId || "").trim(), ne = A.linkGroupState.definitionToGroup.get(X) || "", fe = A.linkGroupState.unlinkedDefinitions.has(X);
      return { ...V, definitionId: X, linkGroupId: ne, isUnlinked: fe };
    });
    I.forEach((V, X) => {
      const ne = V.definitionId, fe = String(V.fieldType || "text").trim() || "text", Se = String(V.participantId || "").trim(), ie = String(V.participantName || "Unassigned").trim() || "Unassigned", de = parseInt(String(V.page || "1"), 10) || 1, tt = V.linkGroupId, Pi = V.isUnlinked;
      if (!ne) return;
      A.fieldInstances.forEach((je) => {
        je.definitionId === ne && (je.type = fe, je.participantId = Se, je.participantName = ie);
      });
      const _i = xt[fe] || xt.text, Q = A.fieldInstances.some((je) => je.definitionId === ne), se = document.createElement("div");
      se.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Q ? "opacity-50" : ""}`, se.draggable = !Q, se.dataset.definitionId = ne, se.dataset.fieldType = fe, se.dataset.participantId = Se, se.dataset.participantName = ie, se.dataset.page = String(de), tt && (se.dataset.linkGroupId = tt);
      const tn = document.createElement("span");
      tn.className = `w-3 h-3 rounded ${_i.bg}`;
      const Et = document.createElement("div");
      Et.className = "flex-1 text-xs";
      const nn = document.createElement("div");
      nn.className = "font-medium capitalize", nn.textContent = fe.replace(/_/g, " ");
      const sn = document.createElement("div");
      sn.className = "text-gray-500", sn.textContent = ie;
      const Ft = document.createElement("span");
      Ft.className = `placement-status text-xs ${Q ? "text-green-600" : "text-amber-600"}`, Ft.textContent = Q ? "Placed" : "Not placed", Et.appendChild(nn), Et.appendChild(sn), se.appendChild(tn), se.appendChild(Et), se.appendChild(Ft), se.addEventListener("dragstart", (je) => {
        if (Q) {
          je.preventDefault();
          return;
        }
        je.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: ne,
          fieldType: fe,
          participantId: Se,
          participantName: ie
        })), je.dataTransfer.effectAllowed = "copy", se.classList.add("opacity-50");
      }), se.addEventListener("dragend", () => {
        se.classList.remove("opacity-50");
      }), l.appendChild(se);
      const fs = I[X + 1];
      if (tt && fs && fs.linkGroupId === tt) {
        const je = os(ne, !Pi);
        l.appendChild(je);
      }
    }), or();
    const O = ++A.loadRequestVersion, H = String(xe.value || "").trim(), G = encodeURIComponent(H), q = `${n}/panels/esign_documents/${G}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const X = await window.pdfjsLib.getDocument({
        url: q,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (O !== A.loadRequestVersion)
        return;
      A.pdfDoc = X, A.totalPages = A.pdfDoc.numPages, A.currentPage = 1, b.textContent = A.totalPages, await ut(A.currentPage), o.classList.add("hidden"), A.uiHandlersBound || (cr(m, v), fr(), yr(), A.uiHandlersBound = !0), It();
    } catch (V) {
      if (O !== A.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", V), o.classList.add("hidden"), s.classList.remove("hidden"), s.textContent = `Failed to load PDF: ${bn(V?.message || "Failed to load PDF")}`;
    }
    In(), Je();
  }
  function os(o, s) {
    const l = document.createElement("div");
    return l.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", l.dataset.definitionId = o, l.dataset.isLinked = String(s), l.title = s ? "Click to unlink this field" : "Click to re-link this field", l.setAttribute("role", "button"), l.setAttribute("aria-label", s ? "Unlink field from group" : "Re-link field to group"), l.setAttribute("tabindex", "0"), s ? l.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : l.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, l.addEventListener("click", () => cs(o, s)), l.addEventListener("keydown", (m) => {
      (m.key === "Enter" || m.key === " ") && (m.preventDefault(), cs(o, s));
    }), l;
  }
  function cs(o, s) {
    s ? (A.linkGroupState = Ls(A.linkGroupState, o), window.toastManager && window.toastManager.info("Field unlinked")) : (A.linkGroupState = Cs(A.linkGroupState, o), window.toastManager && window.toastManager.info("Field re-linked")), Ai();
  }
  function or() {
    const o = document.getElementById("link-all-btn"), s = document.getElementById("unlink-all-btn");
    o && !o.dataset.bound && (o.dataset.bound = "true", o.addEventListener("click", () => {
      const l = A.linkGroupState.unlinkedDefinitions.size;
      if (l !== 0) {
        for (const m of A.linkGroupState.unlinkedDefinitions)
          A.linkGroupState = Cs(A.linkGroupState, m);
        window.toastManager && window.toastManager.success(`Re-linked ${l} field${l > 1 ? "s" : ""}`), Ai();
      }
    })), s && !s.dataset.bound && (s.dataset.bound = "true", s.addEventListener("click", () => {
      let l = 0;
      for (const m of A.linkGroupState.definitionToGroup.keys())
        A.linkGroupState.unlinkedDefinitions.has(m) || (A.linkGroupState = Ls(A.linkGroupState, m), l++);
      l > 0 && window.toastManager && window.toastManager.success(`Unlinked ${l} field${l > 1 ? "s" : ""}`), Ai();
    })), ls();
  }
  function ls() {
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
  function Ai() {
    const o = document.getElementById("placement-fields-list");
    if (!o) return;
    const s = Ki();
    o.innerHTML = "";
    const l = s.map((m) => {
      const v = String(m.definitionId || "").trim(), b = A.linkGroupState.definitionToGroup.get(v) || "", L = A.linkGroupState.unlinkedDefinitions.has(v);
      return { ...m, definitionId: v, linkGroupId: b, isUnlinked: L };
    });
    l.forEach((m, v) => {
      const b = m.definitionId, L = String(m.fieldType || "text").trim() || "text", k = String(m.participantId || "").trim(), D = String(m.participantName || "Unassigned").trim() || "Unassigned", T = parseInt(String(m.page || "1"), 10) || 1, I = m.linkGroupId, O = m.isUnlinked;
      if (!b) return;
      const H = xt[L] || xt.text, G = A.fieldInstances.some((de) => de.definitionId === b), q = document.createElement("div");
      q.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${G ? "opacity-50" : ""}`, q.draggable = !G, q.dataset.definitionId = b, q.dataset.fieldType = L, q.dataset.participantId = k, q.dataset.participantName = D, q.dataset.page = String(T), I && (q.dataset.linkGroupId = I);
      const V = document.createElement("span");
      V.className = `w-3 h-3 rounded ${H.bg}`;
      const X = document.createElement("div");
      X.className = "flex-1 text-xs";
      const ne = document.createElement("div");
      ne.className = "font-medium capitalize", ne.textContent = L.replace(/_/g, " ");
      const fe = document.createElement("div");
      fe.className = "text-gray-500", fe.textContent = D;
      const Se = document.createElement("span");
      Se.className = `placement-status text-xs ${G ? "text-green-600" : "text-amber-600"}`, Se.textContent = G ? "Placed" : "Not placed", X.appendChild(ne), X.appendChild(fe), q.appendChild(V), q.appendChild(X), q.appendChild(Se), q.addEventListener("dragstart", (de) => {
        if (G) {
          de.preventDefault();
          return;
        }
        de.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: b,
          fieldType: L,
          participantId: k,
          participantName: D
        })), de.dataTransfer.effectAllowed = "copy", q.classList.add("opacity-50");
      }), q.addEventListener("dragend", () => {
        q.classList.remove("opacity-50");
      }), o.appendChild(q);
      const ie = l[v + 1];
      if (I && ie && ie.linkGroupId === I) {
        const de = os(b, !O);
        o.appendChild(de);
      }
    }), ls();
  }
  async function ut(o) {
    if (!A.pdfDoc) return;
    const s = document.getElementById("placement-pdf-canvas"), l = document.getElementById("placement-canvas-container"), m = s.getContext("2d"), v = await A.pdfDoc.getPage(o), b = v.getViewport({ scale: A.scale });
    s.width = b.width, s.height = b.height, l.style.width = `${b.width}px`, l.style.height = `${b.height}px`, await v.render({
      canvasContext: m,
      viewport: b
    }).promise, document.getElementById("placement-current-page").textContent = o, It();
  }
  function cr(o, s) {
    const l = document.getElementById("placement-pdf-canvas");
    o.addEventListener("dragover", (m) => {
      m.preventDefault(), m.dataTransfer.dropEffect = "copy", l.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), o.addEventListener("dragleave", (m) => {
      l.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), o.addEventListener("drop", (m) => {
      m.preventDefault(), l.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const v = m.dataTransfer.getData("application/json");
      if (!v) return;
      const b = JSON.parse(v), L = l.getBoundingClientRect(), k = (m.clientX - L.left) / A.scale, D = (m.clientY - L.top) / A.scale;
      ds(b, k, D);
    });
  }
  function ds(o, s, l, m = {}) {
    const v = Wn[o.fieldType] || Wn.text, b = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, L = m.placementSource || Te.MANUAL, k = m.linkGroupId || qs(A.linkGroupState, o.definitionId)?.id, D = {
      id: b,
      definitionId: o.definitionId,
      type: o.fieldType,
      participantId: o.participantId,
      participantName: o.participantName,
      page: A.currentPage,
      x: Math.max(0, s - v.width / 2),
      y: Math.max(0, l - v.height / 2),
      width: v.width,
      height: v.height,
      placementSource: L,
      linkGroupId: k,
      linkedFromFieldId: m.linkedFromFieldId
    };
    A.fieldInstances.push(D), us(o.definitionId), L === Te.MANUAL && k && pr(D), It(), In(), Je();
  }
  function us(o, s = !1) {
    const l = document.querySelector(`.placement-field-item[data-definition-id="${o}"]`);
    if (l) {
      l.classList.add("opacity-50"), l.draggable = !1;
      const m = l.querySelector(".placement-status");
      m && (m.textContent = "Placed", m.classList.remove("text-amber-600"), m.classList.add("text-green-600")), s && l.classList.add("just-linked");
    }
  }
  function lr(o) {
    const s = ga(
      A.linkGroupState,
      o
    );
    s && (A.linkGroupState = Es(A.linkGroupState, s.updatedGroup));
  }
  function ps(o) {
    const s = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((b) => {
      const L = b.dataset.definitionId, k = b.dataset.page;
      if (L) {
        const D = A.linkGroupState.definitionToGroup.get(L);
        s.set(L, {
          type: b.dataset.fieldType || "text",
          participantId: b.dataset.participantId || "",
          participantName: b.dataset.participantName || "Unknown",
          page: k ? parseInt(k, 10) : 1,
          linkGroupId: D
        });
      }
    });
    let m = 0;
    const v = 10;
    for (; m < v; ) {
      const b = ma(
        A.linkGroupState,
        o,
        A.fieldInstances,
        s
      );
      if (!b || !b.newPlacement) break;
      A.fieldInstances.push(b.newPlacement), us(b.newPlacement.definitionId, !0), m++;
    }
    m > 0 && (It(), In(), Je(), dr(m));
  }
  function dr(o) {
    const s = o === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${o} linked fields`;
    window.toastManager && window.toastManager.info(s);
    const l = document.createElement("div");
    l.setAttribute("role", "status"), l.setAttribute("aria-live", "polite"), l.className = "sr-only", l.textContent = s, document.body.appendChild(l), setTimeout(() => l.remove(), 1e3), ur();
  }
  function ur() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((s) => {
      s.classList.add("linked-flash"), setTimeout(() => {
        s.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function pr(o) {
    lr(o);
  }
  function It() {
    const o = document.getElementById("placement-overlays-container");
    o.innerHTML = "", o.style.pointerEvents = "auto", A.fieldInstances.filter((s) => s.page === A.currentPage).forEach((s) => {
      const l = xt[s.type] || xt.text, m = A.selectedFieldId === s.id, v = s.placementSource === Te.AUTO_LINKED, b = document.createElement("div"), L = v ? "border-dashed" : "border-solid";
      b.className = `field-overlay absolute cursor-move ${l.border} border-2 ${L} rounded`, b.style.cssText = `
          left: ${s.x * A.scale}px;
          top: ${s.y * A.scale}px;
          width: ${s.width * A.scale}px;
          height: ${s.height * A.scale}px;
          background-color: ${l.fill};
          ${m ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, b.dataset.instanceId = s.id;
      const k = document.createElement("div");
      if (k.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + l.bg, k.textContent = `${s.type.replace("_", " ")} - ${s.participantName}`, b.appendChild(k), v) {
        const I = document.createElement("div");
        I.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", I.title = "Auto-linked from template", I.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, b.appendChild(I);
      }
      const D = document.createElement("div");
      D.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", D.style.cssText = "transform: translate(50%, 50%);", b.appendChild(D);
      const T = document.createElement("button");
      T.type = "button", T.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", T.innerHTML = "×", T.addEventListener("click", (I) => {
        I.stopPropagation(), hr(s.id);
      }), b.appendChild(T), b.addEventListener("mousedown", (I) => {
        I.target === D ? mr(I, s) : I.target !== T && gr(I, s, b);
      }), b.addEventListener("click", () => {
        A.selectedFieldId = s.id, It();
      }), o.appendChild(b);
    });
  }
  function gr(o, s, l) {
    o.preventDefault(), A.isDragging = !0, A.selectedFieldId = s.id;
    const m = o.clientX, v = o.clientY, b = s.x * A.scale, L = s.y * A.scale;
    function k(T) {
      const I = T.clientX - m, O = T.clientY - v;
      s.x = Math.max(0, (b + I) / A.scale), s.y = Math.max(0, (L + O) / A.scale), s.placementSource = Te.MANUAL, l.style.left = `${s.x * A.scale}px`, l.style.top = `${s.y * A.scale}px`;
    }
    function D() {
      A.isDragging = !1, document.removeEventListener("mousemove", k), document.removeEventListener("mouseup", D), Je();
    }
    document.addEventListener("mousemove", k), document.addEventListener("mouseup", D);
  }
  function mr(o, s) {
    o.preventDefault(), o.stopPropagation(), A.isResizing = !0;
    const l = o.clientX, m = o.clientY, v = s.width, b = s.height;
    function L(D) {
      const T = (D.clientX - l) / A.scale, I = (D.clientY - m) / A.scale;
      s.width = Math.max(30, v + T), s.height = Math.max(20, b + I), s.placementSource = Te.MANUAL, It();
    }
    function k() {
      A.isResizing = !1, document.removeEventListener("mousemove", L), document.removeEventListener("mouseup", k), Je();
    }
    document.addEventListener("mousemove", L), document.addEventListener("mouseup", k);
  }
  function hr(o) {
    const s = A.fieldInstances.find((m) => m.id === o);
    if (!s) return;
    A.fieldInstances = A.fieldInstances.filter((m) => m.id !== o);
    const l = document.querySelector(`.placement-field-item[data-definition-id="${s.definitionId}"]`);
    if (l) {
      l.classList.remove("opacity-50"), l.draggable = !0;
      const m = l.querySelector(".placement-status");
      m && (m.textContent = "Not placed", m.classList.remove("text-green-600"), m.classList.add("text-amber-600"));
    }
    It(), In(), Je();
  }
  function fr() {
    const o = document.getElementById("placement-prev-page"), s = document.getElementById("placement-next-page");
    o.addEventListener("click", async () => {
      A.currentPage > 1 && (A.currentPage--, ps(A.currentPage), await ut(A.currentPage));
    }), s.addEventListener("click", async () => {
      A.currentPage < A.totalPages && (A.currentPage++, ps(A.currentPage), await ut(A.currentPage));
    });
  }
  function yr() {
    const o = document.getElementById("placement-zoom-in"), s = document.getElementById("placement-zoom-out"), l = document.getElementById("placement-zoom-fit"), m = document.getElementById("placement-zoom-level");
    o.addEventListener("click", async () => {
      A.scale = Math.min(3, A.scale + 0.25), m.textContent = `${Math.round(A.scale * 100)}%`, await ut(A.currentPage);
    }), s.addEventListener("click", async () => {
      A.scale = Math.max(0.5, A.scale - 0.25), m.textContent = `${Math.round(A.scale * 100)}%`, await ut(A.currentPage);
    }), l.addEventListener("click", async () => {
      const v = document.getElementById("placement-viewer"), L = (await A.pdfDoc.getPage(A.currentPage)).getViewport({ scale: 1 });
      A.scale = (v.clientWidth - 40) / L.width, m.textContent = `${Math.round(A.scale * 100)}%`, await ut(A.currentPage);
    });
  }
  function In() {
    const o = Array.from(document.querySelectorAll(".placement-field-item")), s = o.length, l = new Set(
      o.map((L) => String(L.dataset.definitionId || "").trim()).filter((L) => L)
    ), m = /* @__PURE__ */ new Set();
    A.fieldInstances.forEach((L) => {
      const k = String(L.definitionId || "").trim();
      l.has(k) && m.add(k);
    });
    const v = m.size, b = Math.max(0, s - v);
    document.getElementById("placement-total-fields").textContent = s, document.getElementById("placement-placed-count").textContent = v, document.getElementById("placement-unplaced-count").textContent = b;
  }
  function Je() {
    const o = document.getElementById("field-instances-container");
    o.innerHTML = "";
    const s = A.fieldInstances.map((l, m) => ks(l, m));
    He && (He.value = JSON.stringify(s));
  }
  Je();
  let $e = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const Rt = document.getElementById("auto-place-btn");
  Rt && Rt.addEventListener("click", async () => {
    if ($e.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      en("All fields are already placed", "info");
      return;
    }
    const s = document.querySelector('input[name="id"]')?.value;
    if (!s) {
      Ti();
      return;
    }
    $e.isRunning = !0, Rt.disabled = !0, Rt.innerHTML = `
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
          policy_preset: vr()
        })
      });
      if (!l.ok)
        throw await Sn(l, "Auto-placement failed");
      const m = await l.json(), v = m && typeof m == "object" && m.run && typeof m.run == "object" ? m.run : m;
      $e.currentRunId = v?.run_id || v?.id || null, $e.suggestions = v?.suggestions || [], $e.resolverScores = v?.resolver_scores || [], $e.suggestions.length === 0 ? (en("No placement suggestions found. Try placing fields manually.", "warning"), Ti()) : wr(m);
    } catch (l) {
      console.error("Auto-place error:", l);
      const m = bn(l?.message || "Auto-placement failed", l?.code || "", l?.status || 0);
      en(`Auto-placement failed: ${m}`, "error"), Ti();
    } finally {
      $e.isRunning = !1, Rt.disabled = !1, Rt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function vr() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function Ti() {
    const o = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let s = 100;
    o.forEach((l) => {
      const m = {
        definitionId: l.dataset.definitionId,
        fieldType: l.dataset.fieldType,
        participantId: l.dataset.participantId,
        participantName: l.dataset.participantName
      }, v = Wn[m.fieldType] || Wn.text;
      A.currentPage = A.totalPages, ds(m, 300, s + v.height / 2, { placementSource: Te.AUTO_FALLBACK }), s += v.height + 20;
    }), A.pdfDoc && ut(A.totalPages), en("Fields placed using fallback layout", "info");
  }
  function wr(o) {
    let s = document.getElementById("placement-suggestions-modal");
    s || (s = br(), document.body.appendChild(s));
    const l = s.querySelector("#suggestions-list"), m = s.querySelector("#resolver-info"), v = s.querySelector("#run-stats");
    m.innerHTML = $e.resolverScores.map((b) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${ue(String(b?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${b.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${Cr(b.score)}">
              ${(Number(b?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), v.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${ue(String(o?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${o.status === "completed" ? "text-green-600" : "text-amber-600"}">${ue(String(o?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(o?.elapsed_ms || 0))}ms</span>
      </div>
    `, l.innerHTML = $e.suggestions.map((b, L) => {
      const k = gs(b.field_definition_id), D = xt[k?.type] || xt.text, T = ue(String(k?.type || "field").replace(/_/g, " ")), I = ue(String(b?.id || "")), O = Math.max(1, Number(b?.page_number || 1)), H = Math.round(Number(b?.x || 0)), G = Math.round(Number(b?.y || 0)), q = Math.max(0, Number(b?.confidence || 0)), V = ue(Ar(String(b?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${L}" data-suggestion-id="${I}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${D.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${T}</div>
                <div class="text-xs text-gray-500">Page ${O}, (${H}, ${G})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${Lr(b.confidence)}">
                ${(q * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${V}
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
    }).join(""), Sr(s), s.classList.remove("hidden");
  }
  function br() {
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
      Ir(), o.classList.add("hidden");
    }), o.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      o.classList.add("hidden");
      const s = o.querySelector("#placement-policy-preset-modal"), l = document.getElementById("placement-policy-preset");
      l && s && (l.value = s.value), Rt?.click();
    }), o;
  }
  function Sr(o) {
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
        m && xr(m);
      });
    });
  }
  function xr(o) {
    o.page_number !== A.currentPage && (A.currentPage = o.page_number, ut(o.page_number));
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
  function Ir() {
    const s = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    s.forEach((l) => {
      const m = parseInt(l.dataset.index, 10), v = $e.suggestions[m];
      if (!v) return;
      const b = gs(v.field_definition_id);
      if (!b) return;
      const L = document.querySelector(`.placement-field-item[data-definition-id="${v.field_definition_id}"]`);
      if (!L || L.classList.contains("opacity-50")) return;
      const k = {
        definitionId: v.field_definition_id,
        fieldType: b.type,
        participantId: b.participant_id,
        participantName: L.dataset.participantName
      };
      A.currentPage = v.page_number, Er(k, v);
    }), A.pdfDoc && ut(A.currentPage), Tr(s.length, $e.suggestions.length - s.length), en(`Applied ${s.length} placement${s.length !== 1 ? "s" : ""}`, "success");
  }
  function Er(o, s) {
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
      placementSource: Te.AUTO,
      resolverId: s.resolver_id,
      confidence: s.confidence,
      placementRunId: $e.currentRunId
    };
    A.fieldInstances.push(l);
    const m = document.querySelector(`.placement-field-item[data-definition-id="${o.definitionId}"]`);
    if (m) {
      m.classList.add("opacity-50"), m.draggable = !1;
      const v = m.querySelector(".placement-status");
      v && (v.textContent = "Placed", v.classList.remove("text-amber-600"), v.classList.add("text-green-600"));
    }
    It(), In(), Je();
  }
  function gs(o) {
    const s = document.querySelector(`.field-definition-entry[data-field-definition-id="${o}"]`);
    return s ? {
      id: o,
      type: s.querySelector(".field-type-select")?.value || "text",
      participant_id: s.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function Lr(o) {
    return o >= 0.9 ? "bg-green-100 text-green-800" : o >= 0.7 ? "bg-blue-100 text-blue-800" : o >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Cr(o) {
    return o >= 0.8 ? "bg-green-100 text-green-800" : o >= 0.6 ? "bg-blue-100 text-blue-800" : o >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Ar(o) {
    return o ? o.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Unknown";
  }
  async function Tr(o, s) {
  }
  function en(o, s = "info") {
    const l = document.createElement("div");
    l.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${s === "success" ? "bg-green-600 text-white" : s === "error" ? "bg-red-600 text-white" : s === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, l.textContent = o, document.body.appendChild(l), setTimeout(() => {
      l.style.opacity = "0", setTimeout(() => l.remove(), 300);
    }, 3e3);
  }
  function ms() {
    const o = document.getElementById("send-readiness-loading"), s = document.getElementById("send-readiness-results"), l = document.getElementById("send-validation-status"), m = document.getElementById("send-validation-issues"), v = document.getElementById("send-issues-list"), b = document.getElementById("send-confirmation"), L = document.getElementById("review-agreement-title"), k = document.getElementById("review-document-title"), D = document.getElementById("review-participant-count"), T = document.getElementById("review-stage-count"), I = document.getElementById("review-participants-list"), O = document.getElementById("review-fields-summary"), H = document.getElementById("title").value || "Untitled", G = st.textContent || "No document", q = Ce.querySelectorAll(".participant-entry"), V = x.querySelectorAll(".field-definition-entry"), X = jn(bt(), qe()), ne = Ze(), fe = /* @__PURE__ */ new Set();
    q.forEach((Q) => {
      const se = Q.querySelector(".signing-stage-input");
      Q.querySelector('select[name*=".role"]').value === "signer" && se?.value && fe.add(parseInt(se.value, 10));
    }), L.textContent = H, k.textContent = G, D.textContent = `${q.length} (${ne.length} signers)`, T.textContent = fe.size > 0 ? fe.size : "1", I.innerHTML = "", q.forEach((Q) => {
      const se = Q.querySelector('input[name*=".name"]'), tn = Q.querySelector('input[name*=".email"]'), Et = Q.querySelector('select[name*=".role"]'), nn = Q.querySelector(".signing-stage-input"), sn = Q.querySelector(".notify-input"), Ft = document.createElement("div");
      Ft.className = "flex items-center justify-between text-sm", Ft.innerHTML = `
        <div>
          <span class="font-medium">${ue(se.value || tn.value)}</span>
          <span class="text-gray-500 ml-2">${ue(tn.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Et.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Et.value === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${sn?.checked !== !1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${sn?.checked !== !1 ? "Notify" : "No Notify"}
          </span>
          ${Et.value === "signer" && nn?.value ? `<span class="text-xs text-gray-500">Stage ${nn.value}</span>` : ""}
        </div>
      `, I.appendChild(Ft);
    });
    const Se = V.length + X.length;
    O.textContent = `${Se} field${Se !== 1 ? "s" : ""} defined (${V.length} manual, ${X.length} generated)`;
    const ie = [];
    xe.value || ie.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), ne.length === 0 && ie.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), Ei().forEach((Q) => {
      ie.push({
        severity: "error",
        message: `${Q.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const tt = Array.from(fe).sort((Q, se) => Q - se);
    for (let Q = 0; Q < tt.length; Q++)
      if (tt[Q] !== Q + 1) {
        ie.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const Pi = ie.some((Q) => Q.severity === "error"), _i = ie.some((Q) => Q.severity === "warning");
    Pi ? (l.className = "p-4 rounded-lg bg-red-50 border border-red-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, b.classList.add("hidden"), Me.disabled = !0) : _i ? (l.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, b.classList.remove("hidden"), Me.disabled = !1) : (l.className = "p-4 rounded-lg bg-green-50 border border-green-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, b.classList.remove("hidden"), Me.disabled = !1), he.isOwner || (l.className = "p-4 rounded-lg bg-slate-50 border border-slate-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-slate-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 00-2-2H7a2 2 0 00-2 2v6m10-6h2a2 2 0 012 2v6m-8 0h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2v-2m4 4l3-3m0 0l3 3m-3-3v8"/>
          </svg>
          <span class="font-medium">Take control in this tab before sending</span>
        </div>
      `, b.classList.add("hidden"), Me.disabled = !0), ie.length > 0 ? (m.classList.remove("hidden"), v.innerHTML = "", ie.forEach((Q) => {
      const se = document.createElement("li");
      se.className = `p-3 rounded-lg flex items-center justify-between ${Q.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, se.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Q.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Q.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${ue(Q.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Q.step}">
            ${ue(Q.action)}
          </button>
        `, v.appendChild(se);
    }), v.querySelectorAll("[data-go-to-step]").forEach((Q) => {
      Q.addEventListener("click", () => {
        const se = Number(Q.getAttribute("data-go-to-step"));
        Number.isFinite(se) && xn(se);
      });
    })) : m.classList.add("hidden"), o.classList.add("hidden"), s.classList.remove("hidden");
  }
  let ki = null;
  function et() {
    ki && clearTimeout(ki), ki = setTimeout(() => {
      jt();
    }, 500);
  }
  xe && new MutationObserver(() => {
    jt();
  }).observe(xe, { attributes: !0, attributeFilter: ["value"] });
  const hs = document.getElementById("title"), kr = document.getElementById("message");
  hs?.addEventListener("input", () => {
    const o = String(hs?.value || "").trim() === "" ? oe.AUTOFILL : oe.USER;
    U.setTitleSource(o), et();
  }), kr?.addEventListener("input", et), Ce.addEventListener("input", et), Ce.addEventListener("change", et), x.addEventListener("input", et), x.addEventListener("change", et), j?.addEventListener("input", et), j?.addEventListener("change", et);
  const Pr = Je;
  Je = function() {
    Pr(), jt();
  };
  function _r() {
    const o = U.getState();
    !o.participants || o.participants.length === 0 || (Ce.innerHTML = "", g = 0, o.participants.forEach((s) => {
      y({
        id: s.tempId,
        name: s.name,
        email: s.email,
        role: s.role,
        notify: s.notify !== !1,
        signing_stage: s.signingStage
      });
    }));
  }
  function Dr() {
    const o = U.getState();
    !o.fieldDefinitions || o.fieldDefinitions.length === 0 || (x.innerHTML = "", Un = 0, o.fieldDefinitions.forEach((s) => {
      zn({
        id: s.tempId,
        type: s.type,
        participant_id: s.participantTempId,
        page: s.page,
        required: s.required
      });
    }), Vn());
  }
  function Mr() {
    const o = U.getState();
    !Array.isArray(o.fieldRules) || o.fieldRules.length === 0 || j && (j.querySelectorAll(".field-rule-entry").forEach((s) => s.remove()), wn = 0, o.fieldRules.forEach((s) => {
      Qi({
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
    }), qn(), St());
  }
  function $r() {
    const o = U.getState();
    !Array.isArray(o.fieldPlacements) || o.fieldPlacements.length === 0 || (A.fieldInstances = o.fieldPlacements.map((s, l) => Qn(s, l)), Je());
  }
  if (window._resumeToStep) {
    _r(), Dr(), Mr(), $t(), $r();
    const o = U.getState();
    o.document?.id && Tt.setDocument(o.document.id, o.document.title, o.document.pageCount), pe = window._resumeToStep, Ci(), delete window._resumeToStep;
  } else if (Ci(), xe.value) {
    const o = st?.textContent || null, s = ge(Ue.value, null);
    Tt.setDocument(xe.value, o, s);
  }
  c && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function xa(i) {
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
class Gs {
  constructor(e) {
    this.initialized = !1, this.config = xa(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Sa(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function No(i) {
  const e = new Gs(i);
  return te(() => e.init()), e;
}
function Ia(i) {
  const e = new Gs({
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
      Ia({
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
const Ea = "esign.signer.profile.v1", Ps = "esign.signer.profile.outbox.v1", qi = 90, _s = 500 * 1024;
class La {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : qi;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Ea}:${e}`;
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
class Ca {
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
class Ri {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(Ps);
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
      window.localStorage.setItem(Ps, JSON.stringify(e));
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
function Aa(i) {
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
      ttlDays: Number(i.profile?.ttlDays || qi) || qi,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Ta(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function Fi(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function ka(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Be(i) {
  const e = String(i || "").trim();
  return ka(e) ? "" : e;
}
function Pa(i) {
  const e = new La(i.profile.ttlDays), t = new Ca(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new Ri("local_only", e, null) : i.profile.mode === "remote_only" ? new Ri("remote_only", e, t) : new Ri("hybrid", e, t);
}
function _a() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Da(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Aa(i), r = Ta(n), d = Pa(n);
  _a();
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
    trackFieldSave(a, u, g, f, y = null) {
      this.metrics.fieldSaveLatencies.push(f), g ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: a, error: y }), this.track(g ? "field_save_success" : "field_save_failed", {
        fieldId: a,
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
    trackSignatureAttach(a, u, g, f, y = null) {
      this.metrics.signatureAttachLatencies.push(f), this.track(g ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: a,
        signatureType: u,
        latency: f,
        error: y
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
      c.overlayRenderFrameID = 0, ye();
    }));
  }
  function w(a) {
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
  function N(a, u) {
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
      const g = a.page, f = this.getPageMetadata(g), y = u.offsetWidth, x = u.offsetHeight, C = a.pageWidth || f.width, M = a.pageHeight || f.height, F = y / C, ee = x / M;
      let J = a.posX || 0, j = a.posY || 0;
      n.viewer.origin === "bottom-left" && (j = M - j - (a.height || 30));
      const Ae = J * F, De = j * ee, K = (a.width || 150) * F, ce = (a.height || 30) * ee;
      return {
        left: Ae,
        top: De,
        width: K,
        height: ce,
        // Store original values for debugging
        _debug: {
          sourceX: J,
          sourceY: j,
          sourceWidth: a.width,
          sourceHeight: a.height,
          pageWidth: C,
          pageHeight: M,
          scaleX: F,
          scaleY: ee,
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
  }, W = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(a, u, g, f) {
      const y = await fetch(
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
      if (!y.ok)
        throw await Qe(y, "Failed to get upload contract");
      const x = await y.json(), C = x?.contract || x;
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
      const y = await fetch(g.toString(), {
        method: a.method || "PUT",
        headers: f,
        body: u,
        credentials: "omit"
      });
      if (!y.ok)
        throw await Qe(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(a) {
      const [u, g] = a.split(","), f = u.match(/data:([^;]+)/), y = f ? f[1] : "image/png", x = atob(g), C = new Uint8Array(x.length);
      for (let M = 0; M < x.length; M++)
        C[M] = x.charCodeAt(M);
      return new Blob([C], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(a, u) {
      const g = this.dataUrlToBlob(u), f = g.size, y = "image/png", x = await Ut(g), C = await this.requestUploadBootstrap(
        a,
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
  }, Y = {
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
        const y = await g.json().catch(() => ({}));
        throw new Error(y?.error?.message || "Failed to load saved signatures");
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
  async function me(a, u = !1) {
    const g = Z(a);
    if (!u && c.savedSignaturesByType.has(g)) {
      le(a);
      return;
    }
    const f = await Y.list(g);
    c.savedSignaturesByType.set(g, f), le(a);
  }
  function le(a) {
    const u = Z(a), g = ae(u), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!g.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = g.map((y) => {
        const x = nt(String(y?.thumbnail_data_url || y?.data_url || "")), C = nt(String(y?.label || "Saved signature")), M = nt(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${C}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${C}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${nt(a)}" data-signature-id="${M}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${nt(a)}" data-signature-id="${M}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function ke(a) {
    const u = c.signatureCanvases.get(a), g = Z(a);
    if (!u || !Wt(a))
      throw new Error(`Please add your ${g === "initials" ? "initials" : "signature"} first`);
    const f = u.canvas.toDataURL("image/png"), y = await Y.save(g, f, g === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const x = ae(g);
    x.unshift(y), c.savedSignaturesByType.set(g, x), le(a), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function Re(a, u) {
    const g = Z(a), y = ae(g).find((C) => String(C?.id || "") === String(u));
    if (!y) return;
    requestAnimationFrame(() => at(a)), await _e(a);
    const x = String(y.data_url || y.thumbnail_data_url || "").trim();
    x && (await _t(a, x, { clearStrokes: !0 }), R(a, x), S(), vt("draw", a), ve("Saved signature selected."));
  }
  async function Ye(a, u) {
    const g = Z(a);
    await Y.delete(u);
    const f = ae(g).filter((y) => String(y?.id || "") !== String(u));
    c.savedSignaturesByType.set(g, f), le(a);
  }
  function Fe(a) {
    const u = String(a?.code || "").trim(), g = String(a?.message || "Unable to update saved signatures"), f = u === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : g;
    window.toastManager && window.toastManager.error(f), ve(f, "assertive");
  }
  async function _e(a, u = 8) {
    for (let g = 0; g < u; g++) {
      if (c.signatureCanvases.has(a)) return !0;
      await new Promise((f) => setTimeout(f, 40)), at(a);
    }
    return !1;
  }
  async function ze(a, u) {
    const g = String(u?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(g))
      throw new Error("Only PNG and JPEG images are supported");
    if (u.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => at(a)), await _e(a);
    const f = c.signatureCanvases.get(a);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const y = await Pe(u), x = g === "image/png" ? y : await oe(y, f.drawWidth, f.drawHeight);
    if (on(x) > _s)
      throw new Error(`Image exceeds ${Math.round(_s / 1024)}KB limit after conversion`);
    await _t(a, x, { clearStrokes: !0 }), R(a, x), S();
    const M = document.getElementById("sig-upload-preview-wrap"), F = document.getElementById("sig-upload-preview");
    M && M.classList.remove("hidden"), F && F.setAttribute("src", x), ve("Signature image uploaded. You can now insert it.");
  }
  function Pe(a) {
    return new Promise((u, g) => {
      const f = new FileReader();
      f.onload = () => u(String(f.result || "")), f.onerror = () => g(new Error("Unable to read image file")), f.readAsDataURL(a);
    });
  }
  function on(a) {
    const u = String(a || "").split(",");
    if (u.length < 2) return 0;
    const g = u[1] || "", f = (g.match(/=+$/) || [""])[0].length;
    return Math.floor(g.length * 3 / 4) - f;
  }
  async function oe(a, u, g) {
    return await new Promise((f, y) => {
      const x = new Image();
      x.onload = () => {
        const C = document.createElement("canvas"), M = Math.max(1, Math.round(Number(u) || 600)), F = Math.max(1, Math.round(Number(g) || 160));
        C.width = M, C.height = F;
        const ee = C.getContext("2d");
        if (!ee) {
          y(new Error("Unable to process image"));
          return;
        }
        ee.clearRect(0, 0, M, F);
        const J = Math.min(M / x.width, F / x.height), j = x.width * J, Ae = x.height * J, De = (M - j) / 2, K = (F - Ae) / 2;
        ee.drawImage(x, De, K, j, Ae), f(C.toDataURL("image/png"));
      }, x.onerror = () => y(new Error("Unable to decode image file")), x.src = a;
    });
  }
  async function Ut(a) {
    if (window.crypto && window.crypto.subtle) {
      const u = await a.arrayBuffer(), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function si() {
    document.addEventListener("click", (a) => {
      const u = a.target;
      if (!(u instanceof Element)) return;
      const g = u.closest("[data-esign-action]");
      if (!g) return;
      switch (g.getAttribute("data-esign-action")) {
        case "prev-page":
          Pn();
          break;
        case "next-page":
          st();
          break;
        case "zoom-out":
          _n();
          break;
        case "zoom-in":
          zt();
          break;
        case "fit-width":
          ht();
          break;
        case "download-document":
          Qt();
          break;
        case "show-consent-modal":
          z();
          break;
        case "activate-field": {
          const y = g.getAttribute("data-field-id");
          y && kt(y);
          break;
        }
        case "submit-signature":
          hi();
          break;
        case "show-decline-modal":
          fi();
          break;
        case "close-field-editor":
          hn();
          break;
        case "save-field-editor":
          gi();
          break;
        case "hide-consent-modal":
          Dt();
          break;
        case "accept-consent":
          dt();
          break;
        case "hide-decline-modal":
          Nn();
          break;
        case "confirm-decline":
          yi();
          break;
        case "retry-load-pdf":
          Ot();
          break;
        case "signature-tab": {
          const y = g.getAttribute("data-tab") || "draw", x = g.getAttribute("data-field-id");
          x && vt(y, x);
          break;
        }
        case "clear-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && mn(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && ui(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && pi(y);
          break;
        }
        case "save-current-signature-library": {
          const y = g.getAttribute("data-field-id");
          y && ke(y).catch(Fe);
          break;
        }
        case "select-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && Re(y, x).catch(Fe);
          break;
        }
        case "delete-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && Ye(y, x).catch(Fe);
          break;
        }
        case "clear-signer-profile":
          U().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          be.togglePanel();
          break;
        case "debug-copy-session":
          be.copySessionInfo();
          break;
        case "debug-clear-cache":
          be.clearCache();
          break;
        case "debug-show-telemetry":
          be.showTelemetry();
          break;
        case "debug-reload-viewer":
          be.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (a) => {
      const u = a.target;
      if (u instanceof HTMLInputElement) {
        if (u.matches("#sig-upload-input")) {
          const g = u.getAttribute("data-field-id"), f = u.files?.[0];
          if (!g || !f) return;
          ze(g, f).catch((y) => {
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
    }), document.addEventListener("input", (a) => {
      const u = a.target;
      if (!(u instanceof HTMLInputElement) && !(u instanceof HTMLTextAreaElement)) return;
      const g = u.getAttribute("data-field-id") || c.activeFieldId;
      if (g) {
        if (u.matches("#sig-type-input")) {
          Xe(g, u.value || "", { syncOverlay: !0 });
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
  te(async () => {
    si(), c.isLowMemory = Tt(), cn(), Tn(), await oi(), ai(), he(), Rn(), Ge(), await Ot(), ye(), document.addEventListener("visibilitychange", An), "memory" in navigator && ri(), be.init();
  });
  function An() {
    document.hidden && it();
  }
  function it() {
    const a = c.isLowMemory ? 1 : 2;
    for (; c.renderedPages.size > a; ) {
      let u = null, g = 1 / 0;
      if (c.renderedPages.forEach((f, y) => {
        y !== c.currentPage && f.timestamp < g && (u = y, g = f.timestamp);
      }), u !== null)
        c.renderedPages.delete(u);
      else
        break;
    }
  }
  function ri() {
    setInterval(() => {
      if (navigator.memory) {
        const a = navigator.memory.usedJSHeapSize, u = navigator.memory.totalJSHeapSize;
        a / u > 0.8 && (c.isLowMemory = !0, it());
      }
    }, 3e4);
  }
  function At(a) {
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
  function cn() {
    const a = document.getElementById("pdf-compatibility-banner"), u = document.getElementById("pdf-compatibility-message"), g = document.getElementById("pdf-compatibility-title");
    if (!a || !u || !g) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      a.classList.add("hidden");
      return;
    }
    g.textContent = "Preview Compatibility Notice", u.textContent = String(n.viewer.compatibilityMessage || "").trim() || At(y), a.classList.remove("hidden"), p.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: y });
  }
  function Tn() {
    const a = document.getElementById("stage-state-banner"), u = document.getElementById("stage-state-icon"), g = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!a || !u || !g || !f || !y) return;
    const x = n.signerState || "active", C = n.recipientStage || 1, M = n.activeStage || 1, F = n.activeRecipientIds || [], ee = n.waitingForRecipientIds || [];
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
        }, ee.length > 0 && J.badges.push({
          icon: "iconoir-group",
          text: `${ee.length} signer(s) ahead`,
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
      a.classList.add("hidden");
      return;
    }
    a.classList.remove("hidden"), a.className = `mb-4 rounded-lg border p-4 ${J.bgClass} ${J.borderClass}`, u.className = `${J.iconClass} mt-0.5`, g.className = `text-sm font-semibold ${J.titleClass}`, g.textContent = J.title, f.className = `text-xs ${J.messageClass} mt-1`, f.textContent = J.message, y.innerHTML = "", J.badges.forEach((j) => {
      const Ae = document.createElement("span"), De = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      Ae.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${De[j.variant] || De.blue}`, Ae.innerHTML = `<i class="${j.icon} mr-1"></i>${j.text}`, y.appendChild(Ae);
    });
  }
  function ai() {
    n.fields.forEach((a) => {
      let u = null, g = !1;
      if (a.type === "checkbox")
        u = a.value_bool || !1, g = u;
      else if (a.type === "date_signed")
        u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], g = !0;
      else {
        const f = String(a.value_text || "");
        u = f || ci(a), g = !!f;
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
  async function oi() {
    try {
      const a = await d.load(c.profileKey);
      a && (c.profileData = a, c.profileRemember = a.remember !== !1);
    } catch {
    }
  }
  function ci(a) {
    const u = c.profileData;
    if (!u) return "";
    const g = String(a?.type || "").trim();
    return g === "name" ? Be(u.fullName || "") : g === "initials" ? Be(u.initials || "") || Fi(u.fullName || n.recipientName || "") : g === "signature" ? Be(u.typedSignature || "") : "";
  }
  function li(a) {
    return !n.profile.persistDrawnSignature || !c.profileData ? "" : a?.type === "initials" && String(c.profileData.drawnInitialsDataUrl || "").trim() || String(c.profileData.drawnSignatureDataUrl || "").trim();
  }
  function ln(a) {
    const u = Be(a?.value || "");
    return u || (c.profileData ? a?.type === "initials" ? Be(c.profileData.initials || "") || Fi(c.profileData.fullName || n.recipientName || "") : a?.type === "signature" ? Be(c.profileData.typedSignature || "") : "" : "");
  }
  function kn() {
    const a = document.getElementById("remember-profile-input");
    return a instanceof HTMLInputElement ? !!a.checked : c.profileRemember;
  }
  async function U(a = !1) {
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
  async function Ve(a, u = {}) {
    const g = kn();
    if (c.profileRemember = g, !g) {
      await U(!0);
      return;
    }
    if (!a) return;
    const f = {
      remember: !0
    }, y = String(a.type || "");
    if (y === "name" && typeof a.value == "string") {
      const x = Be(a.value);
      x && (f.fullName = x, (c.profileData?.initials || "").trim() || (f.initials = Fi(x)));
    }
    if (y === "initials") {
      if (u.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof u.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = u.signatureDataUrl;
      else if (typeof a.value == "string") {
        const x = Be(a.value);
        x && (f.initials = x);
      }
    }
    if (y === "signature") {
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
  function he() {
    const a = document.getElementById("consent-checkbox"), u = document.getElementById("consent-accept-btn");
    a && u && a.addEventListener("change", function() {
      u.disabled = !this.checked;
    });
  }
  function Tt() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function dn() {
    const a = c.isLowMemory ? 3 : c.maxCachedPages;
    if (c.renderedPages.size <= a) return;
    const u = [];
    for (c.renderedPages.forEach((g, f) => {
      const y = Math.abs(f - c.currentPage);
      u.push({ pageNum: f, distance: y });
    }), u.sort((g, f) => f.distance - g.distance); c.renderedPages.size > a && u.length > 0; ) {
      const g = u.shift();
      g && g.pageNum !== c.currentPage && c.renderedPages.delete(g.pageNum);
    }
  }
  function un(a) {
    if (c.isLowMemory) return;
    const u = [];
    a > 1 && u.push(a - 1), a < n.pageCount && u.push(a + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      u.forEach(async (g) => {
        !c.renderedPages.has(g) && !c.pageRendering && await di(g);
      });
    }, { timeout: 2e3 });
  }
  async function di(a) {
    if (!(!c.pdfDoc || c.renderedPages.has(a)))
      try {
        const u = await c.pdfDoc.getPage(a), g = c.zoomLevel, f = u.getViewport({ scale: g * window.devicePixelRatio }), y = document.createElement("canvas"), x = y.getContext("2d");
        y.width = f.width, y.height = f.height;
        const C = {
          canvasContext: x,
          viewport: f
        };
        await u.render(C).promise, c.renderedPages.set(a, {
          canvas: y,
          scale: g,
          timestamp: Date.now()
        }), dn();
      } catch (u) {
        console.warn("Preload failed for page", a, u);
      }
  }
  function pn() {
    const a = window.devicePixelRatio || 1;
    return c.isLowMemory ? Math.min(a, 1.5) : Math.min(a, 2);
  }
  async function Ot() {
    const a = document.getElementById("pdf-loading"), u = Date.now();
    try {
      const g = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!g.ok)
        throw new Error("Failed to load document");
      const y = (await g.json()).assets || {}, x = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const C = pdfjsLib.getDocument(x);
      c.pdfDoc = await C.promise, n.pageCount = c.pdfDoc.numPages, document.getElementById("page-count").textContent = c.pdfDoc.numPages, await Ht(1), Ue(), p.trackViewerLoad(!0, Date.now() - u), p.trackPageView(1);
    } catch (g) {
      console.error("PDF load error:", g), p.trackViewerLoad(!1, Date.now() - u, g.message), a && (a.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Xt();
    }
  }
  async function Ht(a) {
    if (!c.pdfDoc) return;
    const u = c.renderedPages.get(a);
    if (u && u.scale === c.zoomLevel) {
      qt(u), c.currentPage = a, document.getElementById("current-page").textContent = a, Ue(), ye(), un(a);
      return;
    }
    c.pageRendering = !0;
    try {
      const g = await c.pdfDoc.getPage(a), f = c.zoomLevel, y = pn(), x = g.getViewport({ scale: f * y }), C = g.getViewport({ scale: 1 });
      B.setPageViewport(a, {
        width: C.width,
        height: C.height,
        rotation: C.rotation || 0
      });
      const M = document.getElementById("pdf-page-1");
      M.innerHTML = "";
      const F = document.createElement("canvas"), ee = F.getContext("2d");
      F.height = x.height, F.width = x.width, F.style.width = `${x.width / y}px`, F.style.height = `${x.height / y}px`, M.appendChild(F);
      const J = document.getElementById("pdf-container");
      J.style.width = `${x.width / y}px`;
      const j = {
        canvasContext: ee,
        viewport: x
      };
      await g.render(j).promise, c.renderedPages.set(a, {
        canvas: F.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / y,
        displayHeight: x.height / y
      }), c.renderedPages.get(a).canvas.getContext("2d").drawImage(F, 0, 0), dn(), c.currentPage = a, document.getElementById("current-page").textContent = a, Ue(), ye(), p.trackPageView(a), un(a);
    } catch (g) {
      console.error("Page render error:", g);
    } finally {
      if (c.pageRendering = !1, c.pageNumPending !== null) {
        const g = c.pageNumPending;
        c.pageNumPending = null, await Ht(g);
      }
    }
  }
  function qt(a, u) {
    const g = document.getElementById("pdf-page-1");
    g.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = a.canvas.width, f.height = a.canvas.height, f.style.width = `${a.displayWidth}px`, f.style.height = `${a.displayHeight}px`, f.getContext("2d").drawImage(a.canvas, 0, 0), g.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${a.displayWidth}px`;
  }
  function pt(a) {
    c.pageRendering ? c.pageNumPending = a : Ht(a);
  }
  function jt(a) {
    return typeof a.previewValueText == "string" && a.previewValueText.trim() !== "" ? Be(a.previewValueText) : typeof a.value == "string" && a.value.trim() !== "" ? Be(a.value) : "";
  }
  function xe(a, u, g, f = !1) {
    const y = document.createElement("img");
    y.className = "field-overlay-preview", y.src = u, y.alt = g, a.appendChild(y), a.classList.add("has-preview"), f && a.classList.add("draft-preview");
  }
  function gt(a, u, g = !1, f = !1) {
    const y = document.createElement("span");
    y.className = "field-overlay-value", g && y.classList.add("font-signature"), y.textContent = u, a.appendChild(y), a.classList.add("has-value"), f && a.classList.add("draft-preview");
  }
  function mt(a, u) {
    const g = document.createElement("span");
    g.className = "field-overlay-label", g.textContent = u, a.appendChild(g);
  }
  function ye() {
    const a = document.getElementById("field-overlays");
    a.innerHTML = "", a.style.pointerEvents = "auto";
    const u = document.getElementById("pdf-container");
    c.fieldState.forEach((g, f) => {
      if (g.page !== c.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = f, g.required && y.classList.add("required"), g.completed && y.classList.add("completed"), c.activeFieldId === f && y.classList.add("active"), g.posX != null && g.posY != null && g.width != null && g.height != null) {
        const j = B.getOverlayStyles(g, u);
        y.style.left = j.left, y.style.top = j.top, y.style.width = j.width, y.style.height = j.height, y.style.transform = j.transform, be.enabled && (y.dataset.debugCoords = JSON.stringify(
          B.pageToScreen(g, u)._debug
        ));
      } else {
        const j = Array.from(c.fieldState.keys()).indexOf(f);
        y.style.left = "10px", y.style.top = `${100 + j * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const C = String(g.previewSignatureUrl || "").trim(), M = String(g.signaturePreviewUrl || "").trim(), F = jt(g), ee = g.type === "signature" || g.type === "initials", J = typeof g.previewValueBool == "boolean";
      if (C)
        xe(y, C, Ne(g.type), !0);
      else if (g.completed && M)
        xe(y, M, Ne(g.type));
      else if (F) {
        const j = typeof g.previewValueText == "string" && g.previewValueText.trim() !== "";
        gt(y, F, ee, j);
      } else g.type === "checkbox" && (J ? g.previewValueBool : !!g.value) ? gt(y, "Checked", !1, J) : mt(y, Ne(g.type));
      y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${Ne(g.type)} field${g.required ? ", required" : ""}${g.completed ? ", completed" : ""}`), y.addEventListener("click", () => kt(f)), y.addEventListener("keydown", (j) => {
        (j.key === "Enter" || j.key === " ") && (j.preventDefault(), kt(f));
      }), a.appendChild(y);
    });
  }
  function Ne(a) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[a] || a;
  }
  function Pn() {
    c.currentPage <= 1 || pt(c.currentPage - 1);
  }
  function st() {
    c.currentPage >= n.pageCount || pt(c.currentPage + 1);
  }
  function Ke(a) {
    a < 1 || a > n.pageCount || pt(a);
  }
  function Ue() {
    document.getElementById("prev-page-btn").disabled = c.currentPage <= 1, document.getElementById("next-page-btn").disabled = c.currentPage >= n.pageCount;
  }
  function zt() {
    c.zoomLevel = Math.min(c.zoomLevel + 0.25, 3), Le(), pt(c.currentPage);
  }
  function _n() {
    c.zoomLevel = Math.max(c.zoomLevel - 0.25, 0.5), Le(), pt(c.currentPage);
  }
  function ht() {
    const u = document.getElementById("viewer-content").offsetWidth - 32, g = 612;
    c.zoomLevel = u / g, Le(), pt(c.currentPage);
  }
  function Le() {
    document.getElementById("zoom-level").textContent = `${Math.round(c.zoomLevel * 100)}%`;
  }
  function kt(a) {
    if (!c.hasConsented && n.fields.some((u) => u.id === a && u.type !== "date_signed")) {
      z();
      return;
    }
    gn(a, { openEditor: !0 });
  }
  function gn(a, u = { openEditor: !0 }) {
    const g = c.fieldState.get(a);
    if (g) {
      if (u.openEditor && (c.activeFieldId = a), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("active"), g.page !== c.currentPage && Ke(g.page), !u.openEditor) {
        ft(a);
        return;
      }
      g.type !== "date_signed" && Pt(a);
    }
  }
  function ft(a) {
    document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Pt(a) {
    const u = c.fieldState.get(a);
    if (!u) return;
    const g = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = Vt(u.type), f.innerHTML = Dn(u), x?.classList.toggle("hidden", !(u.type === "signature" || u.type === "initials")), (u.type === "signature" || u.type === "initials") && Gt(a), g.classList.add("active"), g.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Zt(g.querySelector(".field-editor")), ve(`Editing ${Vt(u.type)}. Press Escape to cancel.`), setTimeout(() => {
      const C = f.querySelector("input, textarea");
      C ? C.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Oe(c.writeCooldownUntil) > 0 && $n(Oe(c.writeCooldownUntil));
  }
  function Vt(a) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[a] || "Edit Field";
  }
  function Dn(a) {
    const u = yt(a.type), g = nt(String(a?.id || "")), f = nt(String(a?.type || ""));
    if (a.type === "signature" || a.type === "initials") {
      const y = a.type === "initials" ? "initials" : "signature", x = nt(ln(a)), C = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], M = rt(a.id);
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
    if (a.type === "name")
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${nt(String(a.value || ""))}"
          data-field-id="${g}"
        />
        ${u}
      `;
    if (a.type === "text") {
      const y = nt(String(a.value || ""));
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
  function yt(a) {
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
  function Xe(a, u, g = { syncOverlay: !1 }) {
    const f = document.getElementById("sig-type-preview"), y = c.fieldState.get(a);
    if (!y) return;
    const x = Be(String(u || "").trim());
    if (g?.syncOverlay && (x ? _(a, x) : w(a), S()), !!f) {
      if (x) {
        f.textContent = x;
        return;
      }
      f.textContent = y.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function rt(a) {
    const u = String(c.signatureTabByField.get(a) || "").trim();
    return u === "draw" || u === "type" || u === "upload" || u === "saved" ? u : "draw";
  }
  function vt(a, u) {
    const g = ["draw", "type", "upload", "saved"].includes(a) ? a : "draw";
    c.signatureTabByField.set(u, g), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${g}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", g !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", g !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", g !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", g !== "saved"), (g === "draw" || g === "upload" || g === "saved") && f && requestAnimationFrame(() => at(u)), g === "type") {
      const y = document.getElementById("sig-type-input");
      Xe(u, y?.value || "");
    }
    g === "saved" && me(u).catch(Fe);
  }
  function Gt(a) {
    c.signatureTabByField.set(a, "draw"), vt("draw", a);
    const u = document.getElementById("sig-type-input");
    u && Xe(a, u.value || "");
  }
  function at(a) {
    const u = document.getElementById("sig-draw-canvas");
    if (!u || c.signatureCanvases.has(a)) return;
    const g = u.closest(".signature-canvas-container"), f = u.getContext("2d");
    if (!f) return;
    const y = u.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const x = window.devicePixelRatio || 1;
    u.width = y.width * x, u.height = y.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let C = !1, M = 0, F = 0, ee = [];
    const J = (K) => {
      const ce = u.getBoundingClientRect();
      let We, He;
      return K.touches && K.touches.length > 0 ? (We = K.touches[0].clientX, He = K.touches[0].clientY) : K.changedTouches && K.changedTouches.length > 0 ? (We = K.changedTouches[0].clientX, He = K.changedTouches[0].clientY) : (We = K.clientX, He = K.clientY), {
        x: We - ce.left,
        y: He - ce.top,
        timestamp: Date.now()
      };
    }, j = (K) => {
      C = !0;
      const ce = J(K);
      M = ce.x, F = ce.y, ee = [{ x: ce.x, y: ce.y, t: ce.timestamp, width: 2.5 }], g && g.classList.add("drawing");
    }, Ae = (K) => {
      if (!C) return;
      const ce = J(K);
      ee.push({ x: ce.x, y: ce.y, t: ce.timestamp, width: 2.5 });
      const We = ce.x - M, He = ce.y - F, wi = ce.timestamp - (ee[ee.length - 2]?.t || ce.timestamp), Un = Math.sqrt(We * We + He * He) / Math.max(wi, 1), wn = 2.5, bi = 1.5, Si = 4, Ze = Math.min(Un / 5, 1), On = Math.max(bi, Math.min(Si, wn - Ze * 1.5));
      ee[ee.length - 1].width = On, f.lineWidth = On, f.beginPath(), f.moveTo(M, F), f.lineTo(ce.x, ce.y), f.stroke(), M = ce.x, F = ce.y;
    }, De = () => {
      if (C = !1, ee.length > 1) {
        const K = c.signatureCanvases.get(a);
        K && (K.strokes.push(ee.map((ce) => ({ ...ce }))), K.redoStack = []), Jt(a);
      }
      ee = [], g && g.classList.remove("drawing");
    };
    u.addEventListener("mousedown", j), u.addEventListener("mousemove", Ae), u.addEventListener("mouseup", De), u.addEventListener("mouseout", De), u.addEventListener("touchstart", (K) => {
      K.preventDefault(), K.stopPropagation(), j(K);
    }, { passive: !1 }), u.addEventListener("touchmove", (K) => {
      K.preventDefault(), K.stopPropagation(), Ae(K);
    }, { passive: !1 }), u.addEventListener("touchend", (K) => {
      K.preventDefault(), De();
    }, { passive: !1 }), u.addEventListener("touchcancel", De), u.addEventListener("gesturestart", (K) => K.preventDefault()), u.addEventListener("gesturechange", (K) => K.preventDefault()), u.addEventListener("gestureend", (K) => K.preventDefault()), c.signatureCanvases.set(a, {
      canvas: u,
      ctx: f,
      dpr: x,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), wt(a);
  }
  function wt(a) {
    const u = c.signatureCanvases.get(a), g = c.fieldState.get(a);
    if (!u || !g) return;
    const f = li(g);
    f && _t(a, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function _t(a, u, g = { clearStrokes: !1 }) {
    const f = c.signatureCanvases.get(a);
    if (!f) return !1;
    const y = String(u || "").trim();
    if (!y)
      return f.baseImageDataUrl = "", f.baseImage = null, g.clearStrokes && (f.strokes = [], f.redoStack = []), ot(a), !0;
    const { drawWidth: x, drawHeight: C } = f, M = new Image();
    return await new Promise((F) => {
      M.onload = () => {
        g.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = M, f.baseImageDataUrl = y, x > 0 && C > 0 && ot(a), F(!0);
      }, M.onerror = () => F(!1), M.src = y;
    });
  }
  function ot(a) {
    const u = c.signatureCanvases.get(a);
    if (!u) return;
    const { ctx: g, drawWidth: f, drawHeight: y, baseImage: x, strokes: C } = u;
    if (g.clearRect(0, 0, f, y), x) {
      const M = Math.min(f / x.width, y / x.height), F = x.width * M, ee = x.height * M, J = (f - F) / 2, j = (y - ee) / 2;
      g.drawImage(x, J, j, F, ee);
    }
    for (const M of C)
      for (let F = 1; F < M.length; F++) {
        const ee = M[F - 1], J = M[F];
        g.lineWidth = Number(J.width || 2.5) || 2.5, g.beginPath(), g.moveTo(ee.x, ee.y), g.lineTo(J.x, J.y), g.stroke();
      }
  }
  function ui(a) {
    const u = c.signatureCanvases.get(a);
    if (!u || u.strokes.length === 0) return;
    const g = u.strokes.pop();
    g && u.redoStack.push(g), ot(a), Jt(a);
  }
  function pi(a) {
    const u = c.signatureCanvases.get(a);
    if (!u || u.redoStack.length === 0) return;
    const g = u.redoStack.pop();
    g && u.strokes.push(g), ot(a), Jt(a);
  }
  function Wt(a) {
    const u = c.signatureCanvases.get(a);
    if (!u) return !1;
    if ((u.baseImageDataUrl || "").trim() || u.strokes.length > 0) return !0;
    const { canvas: g, ctx: f } = u;
    return f.getImageData(0, 0, g.width, g.height).data.some((x, C) => C % 4 === 3 && x > 0);
  }
  function Jt(a) {
    const u = c.signatureCanvases.get(a);
    u && (Wt(a) ? R(a, u.canvas.toDataURL("image/png")) : w(a), S());
  }
  function mn(a) {
    const u = c.signatureCanvases.get(a);
    u && (u.strokes = [], u.redoStack = [], u.baseImage = null, u.baseImageDataUrl = "", ot(a)), w(a), S();
    const g = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    g && g.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function hn() {
    const a = document.getElementById("field-editor-overlay"), u = a.querySelector(".field-editor");
    if (vn(u), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", c.activeFieldId) {
      const g = document.querySelector(`.field-list-item[data-field-id="${c.activeFieldId}"]`);
      requestAnimationFrame(() => {
        g?.focus();
      });
    }
    E(), S(), c.activeFieldId = null, c.signatureCanvases.clear(), ve("Field editor closed.");
  }
  function Oe(a) {
    const u = Number(a) || 0;
    return u <= 0 ? 0 : Math.max(0, Math.ceil((u - Date.now()) / 1e3));
  }
  function Mn(a, u = {}) {
    const g = Number(u.retry_after_seconds);
    if (Number.isFinite(g) && g > 0)
      return Math.ceil(g);
    const f = String(a?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const y = Number(f);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function Qe(a, u) {
    let g = {};
    try {
      g = await a.json();
    } catch {
      g = {};
    }
    const f = g?.error || {}, y = f?.details && typeof f.details == "object" ? f.details : {}, x = Mn(a, y), C = a?.status === 429, M = C ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || u || "Request failed"), F = new Error(M);
    return F.status = a?.status || 0, F.code = String(f?.code || ""), F.details = y, F.rateLimited = C, F.retryAfterSeconds = x, F;
  }
  function $n(a) {
    const u = Math.max(1, Number(a) || 1);
    c.writeCooldownUntil = Date.now() + u * 1e3, c.writeCooldownTimer && (clearInterval(c.writeCooldownTimer), c.writeCooldownTimer = null);
    const g = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const y = Oe(c.writeCooldownUntil);
      if (y <= 0) {
        c.pendingSaves.has(c.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), c.writeCooldownTimer && (clearInterval(c.writeCooldownTimer), c.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    g(), c.writeCooldownTimer = setInterval(g, 250);
  }
  function ue(a) {
    const u = Math.max(1, Number(a) || 1);
    c.submitCooldownUntil = Date.now() + u * 1e3, c.submitCooldownTimer && (clearInterval(c.submitCooldownTimer), c.submitCooldownTimer = null);
    const g = () => {
      const f = Oe(c.submitCooldownUntil);
      Ge(), f <= 0 && c.submitCooldownTimer && (clearInterval(c.submitCooldownTimer), c.submitCooldownTimer = null);
    };
    g(), c.submitCooldownTimer = setInterval(g, 250);
  }
  async function gi() {
    const a = c.activeFieldId;
    if (!a) return;
    const u = c.fieldState.get(a);
    if (!u) return;
    const g = Oe(c.writeCooldownUntil);
    if (g > 0) {
      const y = `Please wait ${g}s before saving again.`;
      window.toastManager && window.toastManager.error(y), ve(y, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      c.profileRemember = kn();
      let y = !1;
      if (u.type === "signature" || u.type === "initials")
        y = await Bn(a);
      else if (u.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        y = await Yt(a, null, x?.checked || !1);
      } else {
        const C = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!C && u.required)
          throw new Error("This field is required");
        y = await Yt(a, C, null);
      }
      if (y) {
        hn(), Rn(), Ge(), Mt(), ye(), mi(a), Fn(a);
        const x = Ce();
        x.allRequiredComplete ? ve("Field saved. All required fields complete. Ready to submit.") : ve(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && $n(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), ve(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (Oe(c.writeCooldownUntil) > 0) {
        const y = Oe(c.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function Bn(a) {
    const u = c.fieldState.get(a), g = document.getElementById("sig-type-input"), f = rt(a);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = c.signatureCanvases.get(a);
      if (!x) return !1;
      if (!Wt(a))
        throw new Error(u?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const C = x.canvas.toDataURL("image/png");
      return await fn(a, { type: "drawn", dataUrl: C }, u?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = g?.value?.trim();
      if (!x)
        throw new Error(u?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return u.type === "initials" ? await Yt(a, x, null) : await fn(a, { type: "typed", text: x }, x);
    }
  }
  async function Yt(a, u, g) {
    c.pendingSaves.add(a);
    const f = Date.now(), y = c.fieldState.get(a);
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
        throw await Qe(x, "Failed to save field");
      const C = c.fieldState.get(a);
      return C && (C.value = u ?? g, C.completed = !0, C.hasError = !1), await Ve(C), window.toastManager && window.toastManager.success("Field saved"), p.trackFieldSave(a, C?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const C = c.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = x.message), p.trackFieldSave(a, y?.type, !1, Date.now() - f, x.message), x;
    } finally {
      c.pendingSaves.delete(a);
    }
  }
  async function fn(a, u, g) {
    c.pendingSaves.add(a);
    const f = Date.now(), y = u?.type || "typed";
    try {
      let x;
      if (y === "drawn") {
        const F = await W.uploadDrawnSignature(
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
        x = await ct(a, g);
      const C = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!C.ok)
        throw await Qe(C, "Failed to save signature");
      const M = c.fieldState.get(a);
      return M && (M.value = g, M.completed = !0, M.hasError = !1, u?.dataUrl && (M.signaturePreviewUrl = u.dataUrl)), await Ve(M, {
        signatureType: y,
        signatureDataUrl: u?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), p.trackSignatureAttach(a, y, !0, Date.now() - f), !0;
    } catch (x) {
      const C = c.fieldState.get(a);
      throw C && (C.hasError = !0, C.lastError = x.message), p.trackSignatureAttach(a, y, !1, Date.now() - f, x.message), x;
    } finally {
      c.pendingSaves.delete(a);
    }
  }
  async function ct(a, u) {
    const g = `${u}|${a}`, f = await Kt(g), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${a}-${Date.now()}.txt`;
    return {
      field_instance_id: a,
      type: "typed",
      value_text: u,
      object_key: y,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Kt(a) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const u = new TextEncoder().encode(a), g = await window.crypto.subtle.digest("SHA-256", u);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Rn() {
    let a = 0;
    c.fieldState.forEach((M) => {
      M.required, M.completed && a++;
    });
    const u = c.fieldState.size, g = u > 0 ? a / u * 100 : 0;
    document.getElementById("completed-count").textContent = a, document.getElementById("total-count").textContent = u;
    const f = document.getElementById("progress-ring-circle"), y = 97.4, x = y - g / 100 * y;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${g}%`;
    const C = u - a;
    document.getElementById("fields-status").textContent = C > 0 ? `${C} remaining` : "All complete";
  }
  function Ge() {
    const a = document.getElementById("submit-btn"), u = document.getElementById("incomplete-warning"), g = document.getElementById("incomplete-message"), f = Oe(c.submitCooldownUntil);
    let y = [], x = !1;
    c.fieldState.forEach((M, F) => {
      M.required && !M.completed && y.push(M), M.hasError && (x = !0);
    });
    const C = c.hasConsented && y.length === 0 && !x && c.pendingSaves.size === 0 && f === 0 && !c.isSubmitting;
    a.disabled = !C, !c.isSubmitting && f > 0 ? a.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !c.isSubmitting && f === 0 && (a.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), c.hasConsented ? f > 0 ? (u.classList.remove("hidden"), g.textContent = `Please wait ${f}s before submitting again.`) : x ? (u.classList.remove("hidden"), g.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (u.classList.remove("hidden"), g.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : u.classList.add("hidden") : (u.classList.remove("hidden"), g.textContent = "Please accept the consent agreement");
  }
  function mi(a) {
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
  function lt() {
    const a = Array.from(c.fieldState.values()).filter((u) => u.required);
    return a.sort((u, g) => {
      const f = Number(u.page || 0), y = Number(g.page || 0);
      if (f !== y) return f - y;
      const x = Number(u.tabIndex || 0), C = Number(g.tabIndex || 0);
      if (x > 0 && C > 0 && x !== C) return x - C;
      if (x > 0 != C > 0) return x > 0 ? -1 : 1;
      const M = Number(u.posY || 0), F = Number(g.posY || 0);
      if (M !== F) return M - F;
      const ee = Number(u.posX || 0), J = Number(g.posX || 0);
      return ee !== J ? ee - J : String(u.id || "").localeCompare(String(g.id || ""));
    }), a;
  }
  function yn(a) {
    c.guidedTargetFieldId = a, document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${a}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${a}"]`)?.classList.add("guided-next-target");
  }
  function Fn(a) {
    const u = lt(), g = u.filter((C) => !C.completed);
    if (g.length === 0) {
      p.track("guided_next_none_remaining", { fromFieldId: a });
      const C = document.getElementById("submit-btn");
      C?.scrollIntoView({ behavior: "smooth", block: "nearest" }), C?.focus(), ve("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const f = u.findIndex((C) => String(C.id) === String(a));
    let y = null;
    if (f >= 0) {
      for (let C = f + 1; C < u.length; C++)
        if (!u[C].completed) {
          y = u[C];
          break;
        }
    }
    if (y || (y = g[0]), !y) return;
    p.track("guided_next_started", { fromFieldId: a, toFieldId: y.id });
    const x = Number(y.page || 1);
    x !== c.currentPage && Ke(x), gn(y.id, { openEditor: !1 }), yn(y.id), setTimeout(() => {
      yn(y.id), ft(y.id), p.track("guided_next_completed", { toFieldId: y.id, page: y.page }), ve(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function z() {
    const a = document.getElementById("consent-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Zt(a.querySelector(".field-editor")), ve("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Dt() {
    const a = document.getElementById("consent-modal"), u = a.querySelector(".field-editor");
    vn(u), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ve("Consent dialog closed.");
  }
  async function dt() {
    const a = document.getElementById("consent-accept-btn");
    a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const u = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!u.ok)
        throw await Qe(u, "Failed to accept consent");
      c.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Dt(), Ge(), Mt(), p.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ve("Consent accepted. You can now complete the fields and submit.");
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message), ve(`Error: ${u.message}`, "assertive");
    } finally {
      a.disabled = !1, a.innerHTML = "Accept & Continue";
    }
  }
  async function hi() {
    const a = document.getElementById("submit-btn"), u = Oe(c.submitCooldownUntil);
    if (u > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${u}s before submitting again.`), Ge();
      return;
    }
    c.isSubmitting = !0, a.disabled = !0, a.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const g = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": g }
      });
      if (!f.ok)
        throw await Qe(f, "Failed to submit");
      p.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (g) {
      p.trackSubmit(!1, g.message), g?.rateLimited && ue(g.retryAfterSeconds), window.toastManager && window.toastManager.error(g.message);
    } finally {
      c.isSubmitting = !1, Ge();
    }
  }
  function fi() {
    const a = document.getElementById("decline-modal");
    a.classList.add("active"), a.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Zt(a.querySelector(".field-editor")), ve("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Nn() {
    const a = document.getElementById("decline-modal"), u = a.querySelector(".field-editor");
    vn(u), a.classList.remove("active"), a.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ve("Decline dialog closed.");
  }
  async function yi() {
    const a = document.getElementById("decline-reason").value;
    try {
      const u = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: a })
      });
      if (!u.ok)
        throw await Qe(u, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (u) {
      window.toastManager && window.toastManager.error(u.message);
    }
  }
  function Xt() {
    p.trackDegradedMode("viewer_load_failure"), p.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Qt() {
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
  const be = {
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
          console.log("[E-Sign Debug] Reloading viewer..."), Ot();
        },
        setLowMemory: (a) => {
          c.isLowMemory = a, dn(), console.log(`[E-Sign Debug] Low memory mode: ${a}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Ot(), this.updatePanel();
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
  function ve(a, u = "polite") {
    const g = u === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    g && (g.textContent = "", requestAnimationFrame(() => {
      g.textContent = a;
    }));
  }
  function Zt(a) {
    const g = a.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = g[0], y = g[g.length - 1];
    a.dataset.previousFocus || (a.dataset.previousFocus = document.activeElement?.id || "");
    function x(C) {
      C.key === "Tab" && (C.shiftKey ? document.activeElement === f && (C.preventDefault(), y?.focus()) : document.activeElement === y && (C.preventDefault(), f?.focus()));
    }
    a.addEventListener("keydown", x), a._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function vn(a) {
    a._focusTrapHandler && (a.removeEventListener("keydown", a._focusTrapHandler), delete a._focusTrapHandler);
    const u = a.dataset.previousFocus;
    if (u) {
      const g = document.getElementById(u);
      requestAnimationFrame(() => {
        g?.focus();
      }), delete a.dataset.previousFocus;
    }
  }
  function Mt() {
    const a = Ce(), u = document.getElementById("submit-status");
    u && (a.allRequiredComplete && c.hasConsented ? u.textContent = "All required fields complete. You can now submit." : c.hasConsented ? u.textContent = `Complete ${a.remainingRequired} more required field${a.remainingRequired > 1 ? "s" : ""} to enable submission.` : u.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Ce() {
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
  function vi(a, u = 1) {
    const g = Array.from(c.fieldState.keys()), f = g.indexOf(a);
    if (f === -1) return null;
    const y = f + u;
    return y >= 0 && y < g.length ? g[y] : null;
  }
  document.addEventListener("keydown", function(a) {
    if (a.key === "Escape" && (hn(), Dt(), Nn()), a.target instanceof HTMLElement && a.target.classList.contains("sig-editor-tab")) {
      const u = Array.from(document.querySelectorAll(".sig-editor-tab")), g = u.indexOf(a.target);
      if (g !== -1) {
        let f = g;
        if (a.key === "ArrowRight" && (f = (g + 1) % u.length), a.key === "ArrowLeft" && (f = (g - 1 + u.length) % u.length), a.key === "Home" && (f = 0), a.key === "End" && (f = u.length - 1), f !== g) {
          a.preventDefault();
          const y = u[f], x = y.getAttribute("data-tab") || "draw", C = y.getAttribute("data-field-id");
          C && vt(x, C), y.focus();
          return;
        }
      }
    }
    if (a.target instanceof HTMLElement && a.target.classList.contains("field-list-item")) {
      if (a.key === "ArrowDown" || a.key === "ArrowUp") {
        a.preventDefault();
        const u = a.target.dataset.fieldId, g = a.key === "ArrowDown" ? 1 : -1, f = vi(u, g);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (a.key === "Enter" || a.key === " ") {
        a.preventDefault();
        const u = a.target.dataset.fieldId;
        u && kt(u);
      }
    }
    a.key === "Tab" && !a.target.closest(".field-editor-overlay") && !a.target.closest("#consent-modal") && a.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(a) {
    a.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Ws {
  constructor(e) {
    this.config = e;
  }
  init() {
    Da(this.config);
  }
  destroy() {
  }
}
function Uo(i) {
  const e = new Ws(i);
  return te(() => e.init()), e;
}
function Ma() {
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
  const e = Ma();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Ws(e);
  t.init(), window.esignSignerReviewController = t;
});
class Js {
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
    Nt('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), Nt('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function Oo(i = {}) {
  const e = new Js(i);
  return te(() => e.init()), e;
}
function Ho(i = {}) {
  const e = new Js(i);
  te(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Vi {
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
function qo(i) {
  const e = new Vi(i);
  return e.init(), e;
}
function jo(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new Vi(e);
  te(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && te(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new Vi({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class zo {
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
class Vo {
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
function $a(i) {
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
function Ba(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", r = t.label ?? String(n);
    return { label: String(r), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Ra(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), r = e ? String(e).trim().toLowerCase() : "";
  return r && n.includes(r) ? [r, ...n.filter((d) => d !== r)] : n;
}
function Go(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function Wo(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: $a(e.type),
    options: Ba(e.options),
    operators: Ra(e.operators, e.default_operator)
  })) : [];
}
function Jo(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function Yo(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Ko(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function Xo(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([p, c]) => `${p}: ${c}`).join("; ") : "", r = e?.textCode ? `${e.textCode}: ` : "", d = e?.message || `${i} failed`;
    t.error(n ? `${r}${d}: ${n}` : `${r}${d}`);
  }
}
function Qo(i, e) {
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
function Zo(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const ec = {
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
}, ii = "application/vnd.google-apps.document", Gi = "application/vnd.google-apps.spreadsheet", Wi = "application/vnd.google-apps.presentation", Ys = "application/vnd.google-apps.folder", Ji = "application/pdf", Fa = [ii, Ji], Ks = "esign.google.account_id";
function Na(i) {
  return i.mimeType === ii;
}
function Ua(i) {
  return i.mimeType === Ji;
}
function rn(i) {
  return i.mimeType === Ys;
}
function Oa(i) {
  return Fa.includes(i.mimeType);
}
function tc(i) {
  return i.mimeType === ii || i.mimeType === Gi || i.mimeType === Wi;
}
function Ha(i) {
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
function nc(i) {
  return i.map(Ha);
}
function Xs(i) {
  return {
    [ii]: "Google Doc",
    [Gi]: "Google Sheet",
    [Wi]: "Google Slides",
    [Ys]: "Folder",
    [Ji]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function qa(i) {
  return rn(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Na(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Ua(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === Gi ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Wi ? {
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
function ja(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function za(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function ic(i, e) {
  const t = i.get("account_id");
  if (t)
    return Zn(t);
  if (e)
    return Zn(e);
  const n = localStorage.getItem(Ks);
  return n ? Zn(n) : "";
}
function Zn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function sc(i) {
  const e = Zn(i);
  e && localStorage.setItem(Ks, e);
}
function rc(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function ac(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function oc(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function an(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function Va(i) {
  const e = qa(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function cc(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, r) => {
    const d = r === t.length - 1, p = r > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return d ? `${p}<span class="text-gray-900 font-medium">${an(n.name)}</span>` : `${p}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${an(n.name)}</button>`;
  }).join("");
}
function Ga(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: r = !0 } = e, d = Va(i), p = rn(i), c = Oa(i), S = p ? "cursor-pointer hover:bg-gray-50" : c ? "cursor-pointer hover:bg-blue-50" : "opacity-60", w = p ? `data-folder-id="${i.id}" data-folder-name="${an(i.name)}"` : c && t ? `data-file-id="${i.id}" data-file-name="${an(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${S} file-item"
      ${w}
      role="listitem"
      ${c ? 'tabindex="0"' : ""}
    >
      ${d}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${an(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Xs(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${ja(i.size)}` : ""}
          ${r && i.modifiedTime ? ` &middot; ${za(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${c && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function lc(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${an(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((d, p) => rn(d) && !rn(p) ? -1 : !rn(d) && rn(p) ? 1 : d.name.localeCompare(p.name)).map((d) => Ga(d, { selectable: n })).join("")}
    </div>
  `;
}
function dc(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Xs(i.mimeType)
  };
}
export {
  Or as AGREEMENT_STATUS_BADGES,
  Gs as AgreementFormController,
  Vi as DocumentDetailPreviewController,
  zi as DocumentFormController,
  Br as ESignAPIClient,
  Rr as ESignAPIError,
  Ks as GOOGLE_ACCOUNT_STORAGE_KEY,
  Bs as GoogleCallbackController,
  Fs as GoogleDrivePickerController,
  Rs as GoogleIntegrationController,
  Fa as IMPORTABLE_MIME_TYPES,
  Os as IntegrationConflictsController,
  Ns as IntegrationHealthController,
  Us as IntegrationMappingsController,
  Hs as IntegrationSyncRunsController,
  ji as LandingPageController,
  ii as MIME_GOOGLE_DOC,
  Ys as MIME_GOOGLE_FOLDER,
  Gi as MIME_GOOGLE_SHEET,
  Wi as MIME_GOOGLE_SLIDES,
  Ji as MIME_PDF,
  zo as PanelPaginationBehavior,
  Vo as PanelSearchBehavior,
  ec as STANDARD_GRID_SELECTORS,
  $s as SignerCompletePageController,
  Js as SignerErrorPageController,
  Ws as SignerReviewController,
  Ie as announce,
  rc as applyAccountIdToPath,
  Gr as applyDetailFormatters,
  Ia as bootstrapAgreementForm,
  jo as bootstrapDocumentDetailPreview,
  Fo as bootstrapDocumentForm,
  Io as bootstrapGoogleCallback,
  Ao as bootstrapGoogleDrivePicker,
  Lo as bootstrapGoogleIntegration,
  Mo as bootstrapIntegrationConflicts,
  ko as bootstrapIntegrationHealth,
  _o as bootstrapIntegrationMappings,
  Bo as bootstrapIntegrationSyncRuns,
  wo as bootstrapLandingPage,
  So as bootstrapSignerCompletePage,
  Ho as bootstrapSignerErrorPage,
  Da as bootstrapSignerReview,
  ac as buildScopedApiUrl,
  ao as byId,
  Ur as capitalize,
  Nr as createESignClient,
  qr as createElement,
  Zo as createSchemaActionCachingRefresh,
  dc as createSelectedFile,
  so as createStatusBadgeElement,
  fo as createTimeoutController,
  Jo as dateTimeCellRenderer,
  ti as debounce,
  Xo as defaultActionErrorHandler,
  Ko as defaultActionSuccessHandler,
  co as delegate,
  an as escapeHtml,
  Yo as fileSizeCellRenderer,
  Qa as formatDate,
  ei as formatDateTime,
  za as formatDriveDate,
  ja as formatDriveFileSize,
  Yn as formatFileSize,
  Xa as formatPageCount,
  to as formatRecipientCount,
  eo as formatRelativeTime,
  zr as formatSizeElements,
  Za as formatTime,
  Vr as formatTimestampElements,
  Ds as getAgreementStatusBadge,
  Ka as getESignClient,
  qa as getFileIconConfig,
  Xs as getFileTypeName,
  jr as getPageConfig,
  P as hide,
  No as initAgreementForm,
  Wr as initDetailFormatters,
  qo as initDocumentDetailPreview,
  Ro as initDocumentForm,
  xo as initGoogleCallback,
  Co as initGoogleDrivePicker,
  Eo as initGoogleIntegration,
  Do as initIntegrationConflicts,
  To as initIntegrationHealth,
  Po as initIntegrationMappings,
  $o as initIntegrationSyncRuns,
  vo as initLandingPage,
  bo as initSignerCompletePage,
  Oo as initSignerErrorPage,
  Uo as initSignerReview,
  rn as isFolder,
  Na as isGoogleDoc,
  tc as isGoogleWorkspaceFile,
  Oa as isImportable,
  Ua as isPDF,
  Zn as normalizeAccountId,
  Ha as normalizeDriveFile,
  nc as normalizeDriveFiles,
  Ra as normalizeFilterOperators,
  Ba as normalizeFilterOptions,
  $a as normalizeFilterType,
  oo as on,
  te as onReady,
  go as poll,
  Wo as prepareFilterFields,
  Go as prepareGridColumns,
  h as qs,
  Nt as qsa,
  cc as renderBreadcrumb,
  Va as renderFileIcon,
  Ga as renderFileItem,
  lc as renderFileList,
  Hr as renderStatusBadge,
  ic as resolveAccountId,
  mo as retry,
  sc as saveAccountId,
  Fr as setESignClient,
  uo as setLoading,
  Qo as setupRefreshButton,
  $ as show,
  Ms as sleep,
  no as snakeToTitle,
  oc as syncAccountIdToUrl,
  ho as throttle,
  lo as toggle,
  io as truncate,
  Ln as updateDataText,
  po as updateDataTexts,
  ro as updateStatusBadge,
  yo as withTimeout
};
//# sourceMappingURL=index.js.map

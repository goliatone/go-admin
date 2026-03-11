import { e as Xe } from "../chunks/html-DyksyvcZ.js";
class lr {
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
      throw new dr(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class dr extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Ii = null;
function Ia() {
  if (!Ii)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Ii;
}
function ur(i) {
  Ii = i;
}
function pr(i) {
  const e = new lr(i);
  return ur(e), e;
}
function qn(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Ea(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function Vn(i, e) {
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
function La(i, e) {
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
function Ca(i, e) {
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
function ka(i) {
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
function Pa(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function gr(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function Aa(i) {
  return i ? i.split("_").map((e) => gr(e)).join(" ") : "";
}
function Ta(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const mr = {
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
function cs(i) {
  const e = String(i || "").trim().toLowerCase();
  return mr[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function hr(i, e) {
  const t = cs(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", l = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, u = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${l[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${u}${t.label}</span>`;
}
function _a(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = hr(i, e), t.firstElementChild;
}
function Da(i, e, t) {
  const n = cs(e), s = t?.size ?? "sm", l = {
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
function $t(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function Ma(i) {
  return document.getElementById(i);
}
function fr(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, l] of Object.entries(e))
      l !== void 0 && n.setAttribute(s, l);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function $a(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function Ba(i, e, t, n, s) {
  const l = (u) => {
    const o = u.target.closest(e);
    o && i.contains(o) && n.call(o, u, o);
  };
  return i.addEventListener(t, l, s), () => i.removeEventListener(t, l, s);
}
function ne(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function $(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function A(i) {
  i && i.classList.add("hidden");
}
function Fa(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? $(i) : A(i);
}
function Ra(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function In(i, e, t = document) {
  const n = m(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function Ha(i, e = document) {
  for (const [t, n] of Object.entries(i))
    In(t, n, e);
}
function yr(i = "[data-esign-page]", e = "data-esign-config") {
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
    const n = fr("div", {
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
async function Ua(i) {
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
    await ls(n, o);
  }
  return {
    result: E,
    attempts: v,
    stopped: !1,
    timedOut: !1
  };
}
async function Na(i) {
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
    } catch (_) {
      if (v = _, E >= t || !u(_, E))
        throw _;
      const H = l ? Math.min(n * Math.pow(2, E - 1), s) : n;
      o && o(_, E, H), await ls(H, S);
    }
  }
  throw v;
}
function ls(i, e) {
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
function Wn(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function qa(i, e) {
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
function ja(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function za(i, e, t = "Operation timed out") {
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
class Pi {
  constructor(e) {
    this.config = e, this.client = pr({
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
    In('count="draft"', e.draft), In('count="pending"', e.pending), In('count="completed"', e.completed), In('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function Oa(i) {
  const e = i || yr(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Pi(e);
  return ne(() => t.init()), t;
}
function Ga(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new Pi(t);
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
      const s = String(n.basePath || n.base_path || "/admin"), l = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new Pi({ basePath: s, apiBasePath: l }).init();
    }
  }
});
class ds {
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
function Va(i) {
  const e = new ds(i);
  return ne(() => e.init()), e;
}
function Wa(i) {
  const e = new ds(i);
  ne(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function vr(i = document) {
  $t("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = qn(t));
  });
}
function wr(i = document) {
  $t("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = Vn(t));
  });
}
function br(i = document) {
  vr(i), wr(i);
}
function Sr() {
  ne(() => {
    br();
  });
}
typeof document < "u" && Sr();
const Wi = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class us {
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
    s && (s.textContent = Wi[e] || Wi.unknown), t && l && (l.textContent = t, $(l)), this.sendToOpener({
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
function Ja(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new us(e);
  return ne(() => t.init()), t;
}
function Ya(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new us(e);
  ne(() => t.init());
}
const yi = "esign.google.account_id", xr = {
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
class ps {
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
      disconnectModal: _
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), l && l.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, _ && $(_);
    }), o && o.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, _ && A(_);
    }), S && S.addEventListener("click", () => this.disconnect()), u && u.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), v && (v.addEventListener("change", () => {
      this.setCurrentAccountId(v.value, !0);
    }), v.addEventListener("keydown", (B) => {
      B.key === "Enter" && (B.preventDefault(), this.setCurrentAccountId(v.value, !0));
    }));
    const { accountDropdown: H, connectFirstBtn: F } = this.elements;
    H && H.addEventListener("change", () => {
      H.value === "__new__" ? (H.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(H.value, !0);
    }), F && F.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (E && !E.classList.contains("hidden") && this.cancelOAuthFlow(), _ && !_.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, A(_)));
    }), [E, _].forEach((B) => {
      B && B.addEventListener("click", (G) => {
        const J = G.target;
        (J === B || J.getAttribute("aria-hidden") === "true") && (A(B), B === E ? this.cancelOAuthFlow() : B === _ && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(yi)
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
      this.currentAccountId ? window.localStorage.setItem(yi, this.currentAccountId) : window.localStorage.removeItem(yi);
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
      for (const Z of G)
        if (Object.prototype.hasOwnProperty.call(e, Z) && e[Z] !== void 0 && e[Z] !== null)
          return e[Z];
      return J;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), l = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), u = t(["connected", "Connected"], !1), o = t(["degraded", "Degraded"], !1), S = t(["degraded_reason", "DegradedReason"], ""), v = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), E = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), _ = t(
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
        const J = G.getTime() - Date.now(), Z = 5 * 60 * 1e3;
        H = J <= 0, F = J > 0 && J <= Z;
      }
    }
    const B = typeof _ == "boolean" ? _ : (H === !0 || F === !0) && !E;
    return {
      connected: u,
      account_id: l,
      email: v,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: H === !0,
      is_expiring_soon: F === !0,
      can_auto_refresh: E,
      needs_reauthorization: B,
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
        const s = xr[n] || { label: n, description: "" };
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
    const v = new Date(e), E = /* @__PURE__ */ new Date(), _ = Math.max(
      1,
      Math.round((v.getTime() - E.getTime()) / (1e3 * 60))
    );
    t ? s ? (u.textContent = "Access token expired, but refresh is available and will be applied automatically.", u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), o && A(o)) : (u.textContent = "Access token has expired. Please re-authorize.", u.classList.remove("text-gray-500"), u.classList.add("text-red-600"), o && $(o), S && (S.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (u.classList.remove("text-gray-500"), u.classList.add("text-amber-600"), s ? (u.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}. Refresh is available automatically.`, o && A(o)) : (u.textContent = `Token expires in approximately ${_} minute${_ !== 1 ? "s" : ""}`, o && $(o), S && (S.textContent = `Your access token will expire in ${_} minute${_ !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (u.textContent = `Token valid until ${v.toLocaleDateString()} ${v.toLocaleTimeString()}`, o && A(o)), !l && o && A(o);
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
    }, u = t ? "ring-2 ring-blue-500" : "", o = n[e.status] || "bg-white border-gray-200", S = s[e.status] || "bg-gray-100 text-gray-700", v = l[e.status] || e.status, E = e.account_id || "default", _ = e.email || (e.account_id ? e.account_id : "Default account");
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(_)}</p>
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
    this.messageHandler = (_) => this.handleOAuthCallback(_), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
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
function Ka(i) {
  const e = new ps(i);
  return ne(() => e.init()), e;
}
function Xa(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new ps(e);
  ne(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const vi = "esign.google.account_id", Ji = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Yi = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class gs {
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
      viewListBtn: _,
      viewGridBtn: H
    } = this.elements;
    if (e) {
      const B = Wn(() => this.handleSearch(), 300);
      e.addEventListener("input", B), e.addEventListener("keydown", (G) => {
        G.key === "Enter" && (G.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), l && l.addEventListener("click", () => this.showImportModal()), u && u.addEventListener("click", () => this.clearSelection()), o && o.addEventListener("click", () => this.hideImportModal()), S && v && v.addEventListener("submit", (B) => {
      B.preventDefault(), this.handleImport();
    }), E && E.addEventListener("click", (B) => {
      const G = B.target;
      (G === E || G.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), _ && _.addEventListener("click", () => this.setViewMode("list")), H && H.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (B) => {
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
        window.localStorage.getItem(vi)
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
      this.currentAccountId ? window.localStorage.setItem(vi, this.currentAccountId) : window.localStorage.removeItem(vi);
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
      e ? this.currentFiles = [...this.currentFiles, ...S] : this.currentFiles = S, this.nextPageToken = o.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), Ie(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), Ie("Error loading files");
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Yi.includes(e.mimeType), s = this.selectedFile?.id === e.id, l = Ji[e.mimeType] || Ji.default, u = this.getFileIcon(l);
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
            ${Vn(e.modifiedTime)}
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
    const _ = this.selectedFile, H = Yi.includes(_.mimeType);
    s && (s.textContent = _.name), l && (l.textContent = this.getMimeTypeLabel(_.mimeType)), u && (u.textContent = _.id), o && _.owners.length > 0 && (o.textContent = _.owners[0].emailAddress || "-"), S && (S.textContent = Vn(_.modifiedTime)), v && (H ? (v.removeAttribute("disabled"), v.classList.remove("opacity-50", "cursor-not-allowed")) : (v.setAttribute("disabled", "true"), v.classList.add("opacity-50", "cursor-not-allowed"))), E && _.webViewLink && (E.href = _.webViewLink);
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
    ).join(""), $t(".breadcrumb-item", s).forEach((l) => {
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
        const _ = await v.json();
        throw new Error(_.error?.message || "Import failed");
      }
      const E = await v.json();
      this.showToast("Import started successfully", "success"), Ie("Import started"), this.hideImportModal(), E.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${E.document.id}` : E.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${E.agreement.id}`);
    } catch (v) {
      console.error("Import error:", v);
      const E = v instanceof Error ? v.message : "Import failed";
      this.showToast(E, "error"), Ie(`Error: ${E}`);
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
function Qa(i) {
  const e = new gs(i);
  return ne(() => e.init()), e;
}
function Za(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new gs(e);
  ne(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class ms {
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
    const o = l.width, S = l.height, v = 40, E = o - v * 2, _ = S - v * 2;
    u.clearRect(0, 0, o, S);
    const H = t.labels, F = Object.values(t.datasets), B = E / H.length / (F.length + 1), G = Math.max(...F.flat()) || 1;
    H.forEach((J, Z) => {
      const ae = v + Z * E / H.length + B / 2;
      F.forEach((fe, ue) => {
        const Pe = fe[Z] / G * _, wt = ae + ue * B, qe = S - v - Pe;
        u.fillStyle = n[ue] || "#6b7280", u.fillRect(wt, qe, B - 2, Pe);
      }), Z % Math.ceil(H.length / 6) === 0 && (u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "center", u.fillText(J, ae + F.length * B / 2, S - v + 15));
    }), u.fillStyle = "#6b7280", u.font = "10px sans-serif", u.textAlign = "right";
    for (let J = 0; J <= 4; J++) {
      const Z = S - v - J * _ / 4, ae = Math.round(G * J / 4);
      u.fillText(ae.toString(), v - 5, Z + 3);
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
function eo(i) {
  const e = new ms(i);
  return ne(() => e.init()), e;
}
function to(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new ms(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class hs {
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
      publishCancelBtn: _,
      publishConfirmBtn: H,
      deleteCancelBtn: F,
      deleteConfirmBtn: B,
      closePreviewBtn: G,
      loadSampleBtn: J,
      runPreviewBtn: Z,
      clearPreviewBtn: ae,
      previewSourceInput: fe,
      searchInput: ue,
      filterStatus: Pe,
      filterProvider: wt,
      mappingModal: qe,
      publishModal: je,
      deleteModal: Ve,
      previewModal: dt
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), l?.addEventListener("click", () => this.loadMappings()), u?.addEventListener("click", () => this.loadMappings()), o?.addEventListener("click", () => this.addSchemaField()), S?.addEventListener("click", () => this.addMappingRule()), v?.addEventListener("click", () => this.validateMapping()), E?.addEventListener("submit", (Ae) => {
      Ae.preventDefault(), this.saveMapping();
    }), _?.addEventListener("click", () => this.closePublishModal()), H?.addEventListener("click", () => this.publishMapping()), F?.addEventListener("click", () => this.closeDeleteModal()), B?.addEventListener("click", () => this.deleteMapping()), G?.addEventListener("click", () => this.closePreviewModal()), J?.addEventListener("click", () => this.loadSamplePayload()), Z?.addEventListener("click", () => this.runPreviewTransform()), ae?.addEventListener("click", () => this.clearPreview()), fe?.addEventListener("input", Wn(() => this.validateSourceJson(), 300)), ue?.addEventListener("input", Wn(() => this.renderMappings(), 300)), Pe?.addEventListener("change", () => this.renderMappings()), wt?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (Ae) => {
      Ae.key === "Escape" && (qe && !qe.classList.contains("hidden") && this.closeModal(), je && !je.classList.contains("hidden") && this.closePublishModal(), Ve && !Ve.classList.contains("hidden") && this.closeDeleteModal(), dt && !dt.classList.contains("hidden") && this.closePreviewModal());
    }), [qe, je, Ve, dt].forEach((Ae) => {
      Ae?.addEventListener("click", (rn) => {
        const bt = rn.target;
        (bt === Ae || bt.getAttribute("aria-hidden") === "true") && (Ae === qe ? this.closeModal() : Ae === je ? this.closePublishModal() : Ae === Ve ? this.closeDeleteModal() : Ae === dt && this.closePreviewModal());
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
    o?.querySelectorAll(".schema-field-row").forEach((_) => {
      v.push({
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
      formValidationStatus: _
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), l && (l.value = e.provider || "");
    const H = e.external_schema || { object_type: "", fields: [] };
    u && (u.value = H.object_type || ""), o && (o.value = H.version || ""), S && (S.innerHTML = "", (H.fields || []).forEach((F) => S.appendChild(this.createSchemaFieldRow(F)))), v && (v.innerHTML = "", (e.rules || []).forEach((F) => v.appendChild(this.createMappingRuleRow(F)))), e.status && E ? (E.innerHTML = this.getStatusBadge(e.status), E.classList.remove("hidden")) : E && E.classList.add("hidden"), A(_);
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
    const _ = e.agreement || {}, H = Object.entries(_);
    u && (H.length === 0 ? u.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : u.innerHTML = H.map(
      ([F, B]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(F)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(B))}</span>
          </div>
        `
    ).join("")), o && (o.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((F) => {
      const B = S?.querySelector(`[data-rule-source="${this.escapeHtml(F.source)}"] span`);
      B && (F.matched ? (B.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", B.textContent = "Matched") : (B.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", B.textContent = "Not Found"));
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
function no(i) {
  const e = new hs(i);
  return ne(() => e.init()), e;
}
function io(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new hs(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class fs {
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
      conflictDetailModal: _,
      resolveModal: H
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), l?.addEventListener("change", () => this.renderConflicts()), u?.addEventListener("change", () => this.renderConflicts()), o?.addEventListener("click", () => this.openResolveModal("resolved")), S?.addEventListener("click", () => this.openResolveModal("ignored")), v?.addEventListener("click", () => this.closeResolveModal()), E?.addEventListener("submit", (F) => this.submitResolution(F)), document.addEventListener("keydown", (F) => {
      F.key === "Escape" && (H && !H.classList.contains("hidden") ? this.closeResolveModal() : _ && !_.classList.contains("hidden") && this.closeConflictDetail());
    }), [_, H].forEach((F) => {
      F?.addEventListener("click", (B) => {
        const G = B.target;
        (G === F || G.getAttribute("aria-hidden") === "true") && (F === _ ? this.closeConflictDetail() : F === H && this.closeResolveModal());
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
    const t = this.conflicts.find((Pe) => Pe.id === e);
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
      detailConflictId: _,
      detailRunId: H,
      detailCreatedAt: F,
      detailVersion: B,
      detailPayload: G,
      resolutionSection: J,
      actionButtons: Z,
      detailResolvedAt: ae,
      detailResolvedBy: fe,
      detailResolution: ue
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), l && (l.textContent = t.entity_kind || "-"), u && (u.innerHTML = this.getStatusBadge(t.status)), o && (o.textContent = t.provider || "-"), S && (S.textContent = t.external_id || "-"), v && (v.textContent = t.internal_id || "-"), E && (E.textContent = t.binding_id || "-"), _ && (_.textContent = t.id), H && (H.textContent = t.run_id || "-"), F && (F.textContent = this.formatDate(t.created_at)), B && (B.textContent = String(t.version || 1)), G)
      try {
        const Pe = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        G.textContent = JSON.stringify(Pe, null, 2);
      } catch {
        G.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if ($(J), A(Z), ae && (ae.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), fe && (fe.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), ue)
        try {
          const Pe = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          ue.textContent = JSON.stringify(Pe, null, 2);
        } catch {
          ue.textContent = t.resolution_json || "{}";
        }
    } else
      A(J), $(Z);
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
function so(i) {
  const e = new fs(i);
  return ne(() => e.init()), e;
}
function ro(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new fs(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class ys {
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
      actionResumeBtn: _,
      actionRetryBtn: H,
      actionCompleteBtn: F,
      actionFailBtn: B,
      actionDiagnosticsBtn: G,
      startSyncModal: J,
      runDetailModal: Z
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (ae) => this.startSync(ae)), l?.addEventListener("click", () => this.loadSyncRuns()), u?.addEventListener("click", () => this.loadSyncRuns()), o?.addEventListener("click", () => this.closeRunDetail()), S?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), E?.addEventListener("change", () => this.renderTimeline()), _?.addEventListener("click", () => this.runAction("resume")), H?.addEventListener("click", () => this.runAction("resume")), F?.addEventListener("click", () => this.runAction("complete")), B?.addEventListener("click", () => this.runAction("fail")), G?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (ae) => {
      ae.key === "Escape" && (J && !J.classList.contains("hidden") && this.closeStartSyncModal(), Z && !Z.classList.contains("hidden") && this.closeRunDetail());
    }), [J, Z].forEach((ae) => {
      ae?.addEventListener("click", (fe) => {
        const ue = fe.target;
        (ue === ae || ue.getAttribute("aria-hidden") === "true") && (ae === J ? this.closeStartSyncModal() : ae === Z && this.closeRunDetail());
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
      detailAttempt: _,
      detailErrorSection: H,
      detailLastError: F,
      detailCheckpoints: B,
      actionResumeBtn: G,
      actionRetryBtn: J,
      actionCompleteBtn: Z,
      actionFailBtn: ae
    } = this.elements;
    s && (s.textContent = t.id), l && (l.textContent = t.provider), u && (u.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), o && (o.innerHTML = this.getStatusBadge(t.status)), S && (S.textContent = this.formatDate(t.started_at)), v && (v.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), E && (E.textContent = t.cursor || "-"), _ && (_.textContent = String(t.attempt_count || 1)), t.last_error ? (F && (F.textContent = t.last_error), $(H)) : A(H), G && G.classList.toggle("hidden", t.status !== "running"), J && J.classList.toggle("hidden", t.status !== "failed"), Z && Z.classList.toggle("hidden", t.status !== "running"), ae && ae.classList.toggle("hidden", t.status !== "running"), B && (B.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), $(n);
    try {
      const fe = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (fe.ok) {
        const ue = await fe.json();
        this.renderCheckpoints(ue.checkpoints || []);
      } else
        B && (B.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (fe) {
      console.error("Error loading checkpoints:", fe), B && (B.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
        const _ = await E.json();
        throw new Error(_.error?.message || `HTTP ${E.status}`);
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
function ao(i) {
  const e = new ys(i);
  return ne(() => e.init()), e;
}
function oo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ys(e);
  ne(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const wi = "esign.google.account_id", Ir = 25 * 1024 * 1024, Er = 2e3, Ki = 60, Ei = "application/vnd.google-apps.document", Li = "application/pdf", Xi = "application/vnd.google-apps.folder", Lr = [Ei, Li];
class Ai {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || Ir, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: $t(".source-tab"),
      sourcePanels: $t(".source-panel"),
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
      const v = Wn(() => this.handleSearch(), 300);
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
        window.localStorage.getItem(wi)
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
      this.currentAccountId ? window.localStorage.setItem(wi, this.currentAccountId) : window.localStorage.removeItem(wi);
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
      `File is too large (${qn(e.size)}). Maximum size is ${qn(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: l, uploadZone: u } = this.elements;
    s && (s.textContent = e.name), l && (l.textContent = qn(e.size)), t && A(t), n && $(n), u && (u.classList.remove("border-gray-300"), u.classList.add("border-green-400", "bg-green-50"));
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
      const _ = S?.error?.message || S?.message || "Upload failed. Please try again.";
      throw new Error(_);
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
    return e.mimeType === Ei;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === Li;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === Xi;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Lr.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Ei ? "Google Document" : t === Li ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === Xi ? "Folder" : "File";
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
      const E = Array.isArray(v.files) ? v.files.map((B) => this.normalizeDriveFile(B)) : [];
      this.nextPageToken = v.next_page_token || null, l ? this.currentFiles = [...this.currentFiles, ...E] : this.currentFiles = E, this.renderFiles(l);
      const { resultCount: _, listTitle: H } = this.elements;
      n && _ ? (_.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, H && (H.textContent = "Search Results")) : (_ && (_.textContent = ""), H && (H.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: F } = this.elements;
      F && (this.nextPageToken ? $(F) : A(F)), Ie(`Loaded ${E.length} files`);
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
        `), Ie(`Error: ${o instanceof Error ? o.message : "Unknown error"}`);
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
              ${s.modifiedTime ? " • " + Vn(s.modifiedTime) : ""}
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
      const Z = parseInt(J.dataset.fileIndex || "0", 10);
      this.currentFiles[Z].id === e.id ? (J.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), J.setAttribute("aria-selected", "true")) : (J.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), J.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: l,
      filePreview: u,
      importStatus: o,
      previewIcon: S,
      previewTitle: v,
      previewType: E,
      importTypeInfo: _,
      importTypeLabel: H,
      importTypeDesc: F,
      snapshotWarning: B,
      importDocumentTitle: G
    } = this.elements;
    l && A(l), u && $(u), o && A(o), S && (S.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, S.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), v && (v.textContent = e.name || "Untitled"), E && (E.textContent = this.getFileTypeName(e.mimeType)), n && _ && (_.className = `p-3 rounded-lg border ${n.bgClass}`, H && (H.textContent = n.label, H.className = `text-xs font-medium ${n.textClass}`), F && (F.textContent = n.desc, F.className = `text-xs mt-1 ${n.textClass}`), B && (n.showSnapshot ? $(B) : A(B))), G && (G.value = e.name || ""), Ie(`Selected: ${e.name}`);
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
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Er);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > Ki) {
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
            const l = n.error?.code || "", u = n.error?.message || "Import failed";
            this.showImportError(u, l), Ie("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < Ki ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function co(i) {
  const e = new Ai(i);
  return ne(() => e.init()), e;
}
function lo(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new Ai(e);
  ne(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Cr(i) {
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
typeof document < "u" && ne(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Cr(t);
        n && new Ai(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const ke = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, yt = ke.REVIEW, kr = {
  [ke.DOCUMENT]: "Details",
  [ke.DETAILS]: "Participants",
  [ke.PARTICIPANTS]: "Fields",
  [ke.FIELDS]: "Placement",
  [ke.PLACEMENT]: "Review"
}, Ce = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, Jn = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
}, Ci = /* @__PURE__ */ new Map(), Pr = 30 * 60 * 1e3, Qi = {
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
function Ar(i) {
  const t = (i instanceof Error ? i.message : i).match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (t) {
    const n = parseInt(t[1] || t[2] || t[3], 10);
    if (n >= 400 && n < 600)
      return n;
  }
  return null;
}
function Tr(i) {
  const e = i instanceof Error ? i.message : i, t = Ar(e);
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
  if (t && Qi[t]) {
    const n = Qi[t];
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
function Zi() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function _r() {
  return typeof window < "u" && "pdfjsLib" in window && typeof window.pdfjsLib?.getDocument == "function";
}
async function Dr() {
  if (!_r())
    throw new Error("PDF preview library unavailable");
}
function Mr(i) {
  const e = Ci.get(i);
  return e ? Date.now() - e.timestamp > Pr ? (Ci.delete(i), null) : e : null;
}
function $r(i, e, t) {
  Ci.set(i, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function Br(i, e = Jn.THUMBNAIL_MAX_WIDTH, t = Jn.THUMBNAIL_MAX_HEIGHT) {
  await Dr();
  const n = window.pdfjsLib;
  if (!n)
    throw new Error("PDF.js not available");
  const l = await n.getDocument({
    url: i,
    withCredentials: !0,
    disableWorker: !0
  }).promise, u = l.numPages, o = await l.getPage(1), S = o.getViewport({ scale: 1 }), v = e / S.width, E = t / S.height, _ = Math.min(v, E, 1), H = o.getViewport({ scale: _ }), F = document.createElement("canvas");
  F.width = H.width, F.height = H.height;
  const B = F.getContext("2d");
  if (!B)
    throw new Error("Failed to get canvas context");
  return await o.render({
    canvasContext: B,
    viewport: H
  }).promise, { dataUrl: F.toDataURL("image/jpeg", 0.8), pageCount: u };
}
class Fr {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || Jn.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || Jn.THUMBNAIL_MAX_HEIGHT
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
    const t = e === ke.DOCUMENT || e === ke.DETAILS || e === ke.PARTICIPANTS || e === ke.FIELDS || e === ke.REVIEW;
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
    const l = Mr(e);
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
      const { dataUrl: o, pageCount: S } = await Br(
        u,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      $r(e, o, S), this.state = {
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
      const o = u instanceof Error ? u.message : "Failed to load preview", S = Tr(o);
      Zi() && console.error("Failed to load document preview:", u), this.state = {
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
        u?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (Zi() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function Rr(i = {}) {
  const e = new Fr(i);
  return e.init(), e;
}
function Hr() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function Ur() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Nr(i, e) {
  return {
    id: Hr(),
    name: e,
    memberDefinitionIds: [...i],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function es(i, e) {
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
function ts(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.add(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function ns(i, e) {
  const t = new Set(i.unlinkedDefinitions);
  return t.delete(e), {
    ...i,
    unlinkedDefinitions: t
  };
}
function vs(i, e) {
  const t = i.definitionToGroup.get(e);
  if (t)
    return i.groups.get(t);
}
function qr(i, e) {
  const t = vs(i, e.definitionId);
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
function jr(i, e, t, n) {
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
      placementSource: Ce.AUTO_LINKED,
      linkGroupId: S.id,
      linkedFromFieldId: S.sourceFieldId
    } };
  }
  return null;
}
const is = 150, ss = 32;
function re(i) {
  return i == null ? "" : String(i).trim();
}
function ws(i) {
  if (typeof i == "boolean") return i;
  const e = re(i).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function bs(i) {
  return re(i).toLowerCase();
}
function he(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) && i > 0 ? Math.floor(i) : e;
  const t = Number.parseInt(re(i), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function Nn(i, e = 0) {
  if (typeof i == "number")
    return Number.isFinite(i) ? i : e;
  const t = Number.parseFloat(re(i));
  return Number.isFinite(t) ? t : e;
}
function jn(i, e, t) {
  return !Number.isFinite(i) || i < e ? e : i > t ? t : i;
}
function vt(i, e) {
  const t = he(i, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function xn(i, e, t = 1) {
  const n = he(t, 1), s = he(i, n);
  return e > 0 ? jn(s, 1, e) : s > 0 ? s : n;
}
function zr(i, e, t) {
  const n = he(t, 1);
  let s = vt(i, n), l = vt(e, n);
  return s <= 0 && (s = 1), l <= 0 && (l = n), l < s ? { start: l, end: s } : { start: s, end: l };
}
function En(i) {
  if (i == null) return [];
  const e = Array.isArray(i) ? i.map((n) => re(n)) : re(i).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((n) => {
    const s = he(n, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((n, s) => n - s);
}
function zn(i, e) {
  const t = he(e, 1), n = re(i.participantId ?? i.participant_id), s = En(i.excludePages ?? i.exclude_pages), l = i.required, u = typeof l == "boolean" ? l : !["0", "false", "off", "no"].includes(re(l).toLowerCase());
  return {
    id: re(i.id),
    type: bs(i.type),
    participantId: n,
    participantTempId: re(i.participantTempId) || n,
    fromPage: vt(i.fromPage ?? i.from_page, t),
    toPage: vt(i.toPage ?? i.to_page, t),
    page: vt(i.page, t),
    excludeLastPage: ws(i.excludeLastPage ?? i.exclude_last_page),
    excludePages: s,
    required: u
  };
}
function Or(i) {
  return {
    id: re(i.id),
    type: bs(i.type),
    participant_id: re(i.participantId),
    from_page: vt(i.fromPage, 0),
    to_page: vt(i.toPage, 0),
    page: vt(i.page, 0),
    exclude_last_page: !!i.excludeLastPage,
    exclude_pages: En(i.excludePages),
    required: i.required !== !1
  };
}
function Gr(i, e) {
  const t = re(i?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Vr(i, e) {
  const t = he(e, 1), n = [];
  return i.forEach((s, l) => {
    const u = zn(s || {}, t);
    if (u.type === "") return;
    const o = Gr(u, l);
    if (u.type === "initials_each_page") {
      const S = zr(u.fromPage, u.toPage, t), v = /* @__PURE__ */ new Set();
      En(u.excludePages).forEach((E) => {
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
function Wr(i, e, t, n, s) {
  const l = he(t, 1);
  let u = i > 0 ? i : 1, o = e > 0 ? e : l;
  u = jn(u, 1, l), o = jn(o, 1, l), o < u && ([u, o] = [o, u]);
  const S = /* @__PURE__ */ new Set();
  s.forEach((E) => {
    const _ = he(E, 0);
    _ > 0 && S.add(jn(_, 1, l));
  }), n && S.add(l);
  const v = [];
  for (let E = u; E <= o; E += 1)
    S.has(E) || v.push(E);
  return {
    pages: v,
    rangeStart: u,
    rangeEnd: o,
    excludedPages: Array.from(S).sort((E, _) => E - _),
    isEmpty: v.length === 0
  };
}
function Jr(i) {
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
function bi(i) {
  const e = i || {};
  return {
    id: re(e.id),
    title: re(e.title || e.name) || "Untitled",
    pageCount: he(e.page_count ?? e.pageCount, 0),
    compatibilityTier: re(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: re(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Ss(i) {
  const e = re(i).toLowerCase();
  if (e === "") return Ce.MANUAL;
  switch (e) {
    case Ce.AUTO:
    case Ce.MANUAL:
    case Ce.AUTO_LINKED:
    case Ce.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function On(i, e = 0) {
  const t = i || {}, n = re(t.id) || `fi_init_${e}`, s = re(t.definitionId || t.definition_id || t.field_definition_id) || n, l = he(t.page ?? t.page_number, 1), u = Nn(t.x ?? t.pos_x, 0), o = Nn(t.y ?? t.pos_y, 0), S = Nn(t.width, is), v = Nn(t.height, ss);
  return {
    id: n,
    definitionId: s,
    type: re(t.type) || "text",
    participantId: re(t.participantId || t.participant_id),
    participantName: re(t.participantName || t.participant_name) || "Unassigned",
    page: l > 0 ? l : 1,
    x: u >= 0 ? u : 0,
    y: o >= 0 ? o : 0,
    width: S > 0 ? S : is,
    height: v > 0 ? v : ss,
    placementSource: Ss(t.placementSource || t.placement_source),
    linkGroupId: re(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: re(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: ws(t.isUnlinked ?? t.is_unlinked)
  };
}
function rs(i, e = 0) {
  const t = On(i, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Ss(t.placementSource),
    link_group_id: re(t.linkGroupId),
    linked_from_field_id: re(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Yr(i = {}) {
  if (typeof window < "u") {
    if (window.__esignAgreementRuntimeInitialized)
      return;
    window.__esignAgreementRuntimeInitialized = !0;
  }
  const e = i || {}, t = String(e.base_path || "").trim(), n = String(e.api_base_path || "").trim() || `${t}/api`, s = n.replace(/\/+$/, ""), l = /\/v\d+$/i.test(s) ? s : `${s}/v1`, u = `${l}/esign/drafts`, o = !!e.is_edit, S = !!e.create_success, v = String(e.user_id || "").trim(), E = String(e.submit_mode || "json").trim().toLowerCase(), _ = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, H = Array.isArray(e.initial_participants) ? e.initial_participants : [], F = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [];
  function B(c) {
    if (!v) return c;
    const a = c.includes("?") ? "&" : "?";
    return `${c}${a}user_id=${encodeURIComponent(v)}`;
  }
  function G(c = !0) {
    const a = { Accept: "application/json" };
    return c && (a["Content-Type"] = "application/json"), v && (a["X-User-ID"] = v), a;
  }
  const J = 1, Z = o ? "edit" : "create", ae = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), fe = [
    Z,
    v || "anonymous",
    ae || "agreement-form"
  ].join("|"), ue = `esign_wizard_state_v1:${encodeURIComponent(fe)}`, Pe = `esign_wizard_sync:${encodeURIComponent(fe)}`, wt = 2e3, qe = [1e3, 2e3, 5e3, 1e4, 3e4];
  function je(c, a = 0) {
    if (!c || typeof c != "object") return !1;
    const p = String(c.name ?? "").trim(), h = String(c.email ?? "").trim(), w = String(c.role ?? "signer").trim().toLowerCase(), b = Number.parseInt(String(c.signingStage ?? c.signing_stage ?? 1), 10), k = c.notify !== !1;
    return p !== "" || h !== "" || w !== "" && w !== "signer" || Number.isFinite(b) && b > 1 || !k ? !0 : a > 0;
  }
  function Ve(c) {
    if (!c || typeof c != "object") return !1;
    const a = Number.parseInt(String(c.currentStep ?? 1), 10);
    if (Number.isFinite(a) && a > 1 || String(c.document?.id ?? "").trim() !== "") return !0;
    const h = String(c.details?.title ?? "").trim(), w = String(c.details?.message ?? "").trim();
    return !!(h !== "" || w !== "" || (Array.isArray(c.participants) ? c.participants : []).some((k, T) => je(k, T)) || Array.isArray(c.fieldDefinitions) && c.fieldDefinitions.length > 0 || Array.isArray(c.fieldPlacements) && c.fieldPlacements.length > 0 || Array.isArray(c.fieldRules) && c.fieldRules.length > 0);
  }
  class dt {
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
        const a = sessionStorage.getItem(ue);
        if (!a) return null;
        const p = JSON.parse(a);
        return p.version !== J ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(p)) : this.normalizeLoadedState(p);
      } catch (a) {
        return console.error("Failed to load wizard state from session:", a), null;
      }
    }
    normalizeLoadedState(a) {
      if (!a || typeof a != "object")
        return this.createInitialState();
      const p = this.createInitialState(), h = { ...p, ...a }, w = Number.parseInt(String(a.currentStep ?? p.currentStep), 10);
      h.currentStep = Number.isFinite(w) ? Math.min(Math.max(w, 1), yt) : p.currentStep;
      const b = a.document && typeof a.document == "object" ? a.document : {}, k = b.id;
      h.document = {
        id: k == null ? null : String(k).trim() || null,
        title: String(b.title ?? "").trim() || null,
        pageCount: he(b.pageCount, 0) || null
      };
      const T = a.details && typeof a.details == "object" ? a.details : {};
      h.details = {
        title: String(T.title ?? "").trim(),
        message: String(T.message ?? "")
      }, h.participants = Array.isArray(a.participants) ? a.participants : [], h.fieldDefinitions = Array.isArray(a.fieldDefinitions) ? a.fieldDefinitions : [], h.fieldPlacements = Array.isArray(a.fieldPlacements) ? a.fieldPlacements : [], h.fieldRules = Array.isArray(a.fieldRules) ? a.fieldRules : [];
      const D = String(a.wizardId ?? "").trim();
      h.wizardId = D || p.wizardId, h.version = J, h.createdAt = String(a.createdAt ?? p.createdAt), h.updatedAt = String(a.updatedAt ?? p.updatedAt);
      const P = String(a.serverDraftId ?? "").trim();
      return h.serverDraftId = P || null, h.serverRevision = he(a.serverRevision, 0), h.lastSyncedAt = String(a.lastSyncedAt ?? "").trim() || null, h.syncPending = !!a.syncPending, h;
    }
    migrateState(a) {
      return console.warn("Discarding incompatible wizard state"), null;
    }
    saveToSession() {
      try {
        this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(ue, JSON.stringify(this.state));
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
    markSynced(a, p) {
      this.state.serverDraftId = a, this.state.serverRevision = p, this.state.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.syncPending = !1, this.saveToSession(), this.notifyListeners();
    }
    clear() {
      this.state = this.createInitialState(), sessionStorage.removeItem(ue), this.notifyListeners();
    }
    hasResumableState() {
      return Ve(this.state);
    }
    onStateChange(a) {
      return this.listeners.push(a), () => {
        this.listeners = this.listeners.filter((p) => p !== a);
      };
    }
    notifyListeners() {
      this.listeners.forEach((a) => a(this.state));
    }
    collectFormState() {
      const a = document.getElementById("document_id")?.value || null, p = document.getElementById("selected-document-title")?.textContent?.trim() || null, h = document.getElementById("title"), w = document.getElementById("message"), b = [];
      document.querySelectorAll(".participant-entry").forEach((P) => {
        const I = P.getAttribute("data-participant-id"), U = P.querySelector('input[name*=".name"]')?.value || "", N = P.querySelector('input[name*=".email"]')?.value || "", O = P.querySelector('select[name*=".role"]')?.value || "signer", j = parseInt(P.querySelector(".signing-stage-input")?.value || "1", 10), W = P.querySelector(".notify-input")?.checked !== !1;
        b.push({ tempId: I, name: U, email: N, role: O, notify: W, signingStage: j });
      });
      const k = [];
      document.querySelectorAll(".field-definition-entry").forEach((P) => {
        const I = P.getAttribute("data-field-definition-id"), U = P.querySelector(".field-type-select")?.value || "signature", N = P.querySelector(".field-participant-select")?.value || "", O = parseInt(P.querySelector('input[name*=".page"]')?.value || "1", 10), j = P.querySelector('input[name*=".required"]')?.checked ?? !0;
        k.push({ tempId: I, type: U, participantTempId: N, page: O, required: j });
      });
      const T = pe(), D = parseInt(Fe?.value || "0", 10) || null;
      return {
        document: { id: a, title: p, pageCount: D },
        details: {
          title: h?.value || "",
          message: w?.value || ""
        },
        participants: b,
        fieldDefinitions: k,
        fieldPlacements: C?.fieldInstances || [],
        fieldRules: T
      };
    }
    restoreFormState() {
      const a = this.state;
      if (!a) return;
      if (a.document.id) {
        const w = document.getElementById("document_id"), b = document.getElementById("selected-document"), k = document.getElementById("document-picker"), T = document.getElementById("selected-document-title"), D = document.getElementById("selected-document-info");
        w && (w.value = a.document.id), T && (T.textContent = a.document.title || "Selected Document"), D && (D.textContent = a.document.pageCount ? `${a.document.pageCount} pages` : ""), Fe && a.document.pageCount && (Fe.value = String(a.document.pageCount)), b && b.classList.remove("hidden"), k && k.classList.add("hidden");
      }
      const p = document.getElementById("title"), h = document.getElementById("message");
      p && a.details.title && (p.value = a.details.title), h && a.details.message && (h.value = a.details.message);
    }
  }
  class Ae {
    constructor(a) {
      this.stateManager = a, this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null;
    }
    async create(a) {
      const p = {
        wizard_id: a.wizardId,
        wizard_state: a,
        title: a.details.title || "Untitled Agreement",
        current_step: a.currentStep,
        document_id: a.document.id || null,
        created_by_user_id: v
      }, h = await fetch(B(u), {
        method: "POST",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(p)
      });
      if (!h.ok) {
        const w = await h.json().catch(() => ({}));
        throw new Error(w.error?.message || `HTTP ${h.status}`);
      }
      return h.json();
    }
    async update(a, p, h) {
      const w = {
        expected_revision: h,
        wizard_state: p,
        title: p.details.title || "Untitled Agreement",
        current_step: p.currentStep,
        document_id: p.document.id || null,
        updated_by_user_id: v
      }, b = await fetch(B(`${u}/${a}`), {
        method: "PUT",
        credentials: "same-origin",
        headers: G(),
        body: JSON.stringify(w)
      });
      if (b.status === 409) {
        const k = await b.json().catch(() => ({})), T = new Error("stale_revision");
        throw T.code = "stale_revision", T.currentRevision = k.error?.details?.current_revision, T;
      }
      if (!b.ok) {
        const k = await b.json().catch(() => ({}));
        throw new Error(k.error?.message || `HTTP ${b.status}`);
      }
      return b.json();
    }
    async load(a) {
      const p = await fetch(B(`${u}/${a}`), {
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!p.ok) {
        const h = new Error(`HTTP ${p.status}`);
        throw h.status = p.status, h;
      }
      return p.json();
    }
    async delete(a) {
      const p = await fetch(B(`${u}/${a}`), {
        method: "DELETE",
        credentials: "same-origin",
        headers: G(!1)
      });
      if (!p.ok && p.status !== 404)
        throw new Error(`HTTP ${p.status}`);
    }
    async list() {
      const a = await fetch(B(`${u}?limit=10`), {
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
          let p;
          return a.serverDraftId ? p = await this.update(a.serverDraftId, a, a.serverRevision) : p = await this.create(a), this.stateManager.markSynced(p.id, p.revision), this.retryCount = 0, { success: !0, result: p };
        } catch (p) {
          return p.code === "stale_revision" ? { success: !1, conflict: !0, currentRevision: p.currentRevision } : { success: !1, error: p.message };
        }
    }
  }
  class rn {
    constructor(a, p, h) {
      this.stateManager = a, this.syncService = p, this.statusUpdater = h, this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.channel = null, this.isOwner = !0, this.initBroadcastChannel(), this.initEventListeners();
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
            const p = this.stateManager.loadFromSession();
            p && (this.stateManager.state = p, this.stateManager.notifyListeners());
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
    broadcastSyncCompleted(a, p) {
      this.channel?.postMessage({
        type: "sync_completed",
        tabId: this.getTabId(),
        draftId: a,
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
      }, wt);
    }
    async forceSync(a = {}) {
      this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
      const p = a && a.keepalive === !0, h = this.stateManager.getState();
      if (!p) {
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
          const b = await fetch(B(`${u}/${h.serverDraftId}`), {
            method: "PUT",
            credentials: "same-origin",
            headers: G(),
            body: w,
            keepalive: !0
          });
          if (b.status === 409) {
            const P = await b.json().catch(() => ({})), I = Number(P?.error?.details?.current_revision || 0);
            this.statusUpdater("conflict"), this.showConflictDialog(I > 0 ? I : h.serverRevision);
            return;
          }
          if (!b.ok)
            throw new Error(`HTTP ${b.status}`);
          const k = await b.json().catch(() => ({})), T = String(k?.id || k?.draft_id || h.serverDraftId || "").trim(), D = Number(k?.revision || 0);
          if (T && Number.isFinite(D) && D > 0) {
            this.stateManager.markSynced(T, D), this.statusUpdater("saved"), this.retryCount = 0, this.broadcastSyncCompleted(T, D);
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
      if (this.retryCount >= qe.length) {
        console.error("Max sync retries reached");
        return;
      }
      const a = qe[this.retryCount];
      this.retryCount++, this.retryTimer = setTimeout(() => {
        this.performSync();
      }, a);
    }
    manualRetry() {
      this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
    }
    showConflictDialog(a) {
      const p = document.getElementById("conflict-dialog-modal"), h = this.stateManager.getState();
      document.getElementById("conflict-local-time").textContent = bt(h.updatedAt), document.getElementById("conflict-server-revision").textContent = a, document.getElementById("conflict-server-time").textContent = "newer version", p?.classList.remove("hidden");
    }
  }
  function bt(c) {
    if (!c) return "unknown";
    const a = new Date(c), h = /* @__PURE__ */ new Date() - a, w = Math.floor(h / 6e4), b = Math.floor(h / 36e5), k = Math.floor(h / 864e5);
    return w < 1 ? "just now" : w < 60 ? `${w} minute${w !== 1 ? "s" : ""} ago` : b < 24 ? `${b} hour${b !== 1 ? "s" : ""} ago` : k < 7 ? `${k} day${k !== 1 ? "s" : ""} ago` : a.toLocaleDateString();
  }
  function Kn(c) {
    const a = document.getElementById("sync-status-indicator"), p = document.getElementById("sync-status-icon"), h = document.getElementById("sync-status-text"), w = document.getElementById("sync-retry-btn");
    if (!(!a || !p || !h))
      switch (a.classList.remove("hidden"), c) {
        case "saved":
          p.className = "w-2 h-2 rounded-full bg-green-500", h.textContent = "Saved", h.className = "text-gray-600", w?.classList.add("hidden");
          break;
        case "saving":
          p.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", h.textContent = "Saving...", h.className = "text-gray-600", w?.classList.add("hidden");
          break;
        case "pending":
          p.className = "w-2 h-2 rounded-full bg-gray-400", h.textContent = "Unsaved changes", h.className = "text-gray-500", w?.classList.add("hidden");
          break;
        case "error":
          p.className = "w-2 h-2 rounded-full bg-amber-500", h.textContent = "Not synced", h.className = "text-amber-600", w?.classList.remove("hidden");
          break;
        case "conflict":
          p.className = "w-2 h-2 rounded-full bg-red-500", h.textContent = "Conflict", h.className = "text-red-600", w?.classList.add("hidden");
          break;
        default:
          a.classList.add("hidden");
      }
  }
  const Y = new dt(), St = new Ae(Y), Ee = new rn(Y, St, Kn), xt = Rr({
    apiBasePath: l,
    basePath: t
  });
  if (S) {
    const a = Y.getState()?.serverDraftId;
    Y.clear(), Ee.broadcastStateUpdate(), a && St.delete(a).catch((p) => {
      console.warn("Failed to delete server draft after successful create:", p);
    });
  }
  document.getElementById("sync-retry-btn")?.addEventListener("click", () => {
    Ee.manualRetry();
  }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
    const c = Y.getState();
    if (c.serverDraftId)
      try {
        const a = await St.load(c.serverDraftId);
        a.wizard_state && (Y.state = { ...a.wizard_state, serverDraftId: a.id, serverRevision: a.revision }, Y.saveToSession(), window.location.reload());
      } catch (a) {
        console.error("Failed to load server draft:", a);
      }
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
    const c = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
    Y.state.serverRevision = c, Y.state.syncPending = !0, Y.saveToSession(), Ee.performSync(), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
    document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
  });
  function an() {
    const c = document.getElementById("resume-dialog-modal"), a = Y.getState(), p = String(a?.document?.title || "").trim() || String(a?.document?.id || "").trim() || "Unknown document";
    document.getElementById("resume-draft-title").textContent = a.details.title || "Untitled Agreement", document.getElementById("resume-draft-document").textContent = p, document.getElementById("resume-draft-step").textContent = a.currentStep, document.getElementById("resume-draft-time").textContent = bt(a.updatedAt), c?.classList.remove("hidden");
  }
  async function on(c = {}) {
    const a = c.deleteServerDraft === !0, p = String(Y.getState()?.serverDraftId || "").trim();
    if (Y.clear(), Ee.broadcastStateUpdate(), !(!a || !p))
      try {
        await St.delete(p);
      } catch (h) {
        console.warn("Failed to delete server draft:", h);
      }
  }
  function Xn() {
    const c = Y.getState(), a = Y.collectFormState();
    Ve({ ...c, ...a }) && (Y.updateState(a), Ee.scheduleSync(), Ee.broadcastStateUpdate());
  }
  document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), Y.restoreFormState(), window._resumeToStep = Y.getState().currentStep;
  }), document.getElementById("resume-proceed-btn")?.addEventListener("click", async () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), await on({ deleteServerDraft: !0 }), Xn();
  }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), on({ deleteServerDraft: !1 });
  }), document.getElementById("resume-discard-btn")?.addEventListener("click", async () => {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden"), await on({ deleteServerDraft: !0 });
  });
  async function Qn() {
    if (o || !Y.hasResumableState()) return;
    const c = Y.getState(), a = String(c?.serverDraftId || "").trim();
    if (!a) {
      an();
      return;
    }
    try {
      const p = await St.load(a);
      p?.wizard_state && typeof p.wizard_state == "object" && (Y.state = { ...p.wizard_state, serverDraftId: p.id, serverRevision: p.revision }, Y.saveToSession()), an();
    } catch (p) {
      if (Number(p?.status || 0) === 404) {
        Y.clear(), Ee.broadcastStateUpdate();
        return;
      }
      an();
    }
  }
  Qn();
  function Bt() {
    const c = Y.collectFormState();
    Y.updateState(c), Ee.scheduleSync(), Ee.broadcastStateUpdate();
  }
  const be = document.getElementById("document_id"), It = document.getElementById("selected-document"), Et = document.getElementById("document-picker"), Se = document.getElementById("document-search"), Qe = document.getElementById("document-list"), cn = document.getElementById("change-document-btn"), Ze = document.getElementById("selected-document-title"), et = document.getElementById("selected-document-info"), Fe = document.getElementById("document_page_count"), Lt = document.getElementById("document-remediation-panel"), Ln = document.getElementById("document-remediation-message"), ut = document.getElementById("document-remediation-status"), xe = document.getElementById("document-remediation-trigger-btn"), Ft = document.getElementById("document-remediation-dismiss-btn");
  let Ct = [], Re = null;
  const ln = /* @__PURE__ */ new Set(), dn = /* @__PURE__ */ new Map();
  function tt(c) {
    return String(c || "").trim().toLowerCase();
  }
  function nt(c) {
    return String(c || "").trim().toLowerCase();
  }
  function He(c) {
    return tt(c) === "unsupported";
  }
  function it() {
    be && (be.value = ""), Ze && (Ze.textContent = ""), et && (et.textContent = ""), Nt(0), Y.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), xt.setDocument(null, null, null);
  }
  function Rt(c = "") {
    const a = "This document cannot be used because its PDF is incompatible with online signing.", p = nt(c);
    return p ? `${a} Reason: ${p}. Select another document or upload a remediated PDF.` : `${a} Select another document or upload a remediated PDF.`;
  }
  function Ht() {
    Re = null, ut && (ut.textContent = "", ut.className = "mt-2 text-xs text-amber-800"), Lt && Lt.classList.add("hidden"), xe && (xe.disabled = !1, xe.textContent = "Remediate PDF");
  }
  function st(c, a = "info") {
    if (!ut) return;
    const p = String(c || "").trim();
    ut.textContent = p;
    const h = a === "error" ? "text-red-700" : a === "success" ? "text-green-700" : "text-amber-800";
    ut.className = `mt-2 text-xs ${h}`;
  }
  function kt(c, a = "") {
    !c || !Lt || !Ln || (Re = {
      id: String(c.id || "").trim(),
      title: String(c.title || "").trim(),
      pageCount: he(c.pageCount, 0),
      compatibilityReason: nt(a || c.compatibilityReason || "")
    }, Re.id && (Ln.textContent = Rt(Re.compatibilityReason), st("Run remediation to make this document signable."), Lt.classList.remove("hidden")));
  }
  function un(c, a, p) {
    be.value = c, Ze.textContent = a || "", et.textContent = `${p} pages`, Nt(p), It.classList.remove("hidden"), Et.classList.add("hidden"), ee(), ti(a);
    const h = he(p, 0);
    Y.updateDocument({
      id: c,
      title: a,
      pageCount: h
    }), xt.setDocument(c, a, h), Ht();
  }
  async function Zn(c, a, p) {
    const h = String(c || "").trim();
    if (!h) return;
    const w = Date.now(), b = 12e4, k = 1250;
    for (; Date.now() - w < b; ) {
      const T = await fetch(h, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!T.ok)
        throw await wn(T, "Failed to read remediation status");
      const P = (await T.json())?.dispatch || {}, I = String(P?.status || "").trim().toLowerCase();
      if (I === "succeeded") {
        st("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (I === "failed" || I === "canceled" || I === "dead_letter") {
        const N = String(P?.terminal_reason || "").trim();
        throw { message: N ? `Remediation failed: ${N}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      st(I === "retrying" ? "Remediation is retrying in the queue..." : I === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((N) => setTimeout(N, k));
    }
    throw { message: `Timed out waiting for remediation dispatch ${a} (${p})`, code: "REMEDIATION_TIMEOUT", status: 504 };
  }
  async function ei() {
    const c = Re;
    if (!c || !c.id) return;
    const a = String(c.id || "").trim();
    if (!(!a || ln.has(a))) {
      ln.add(a), xe && (xe.disabled = !0, xe.textContent = "Remediating...");
      try {
        let p = dn.get(a) || "";
        p || (p = `esign-remediate-${a}-${Date.now()}`, dn.set(a, p));
        const h = `${l}/esign/documents/${encodeURIComponent(a)}/remediate`, w = await fetch(h, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": p
          }
        });
        if (!w.ok)
          throw await wn(w, "Failed to trigger remediation");
        const b = await w.json(), k = b?.receipt || {}, T = String(k?.dispatch_id || b?.dispatch_id || "").trim(), D = String(k?.mode || b?.mode || "").trim().toLowerCase();
        let P = String(b?.dispatch_status_url || "").trim();
        !P && T && (P = `${l}/esign/dispatches/${encodeURIComponent(T)}`), D === "queued" && T && P && (st("Remediation queued. Monitoring progress..."), await Zn(P, T, a)), await kn();
        const I = Ut(a);
        if (!I || He(I.compatibilityTier)) {
          st("Remediation finished, but this PDF is still incompatible.", "error"), ve("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        un(I.id, I.title, I.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : Qt("Document remediated successfully. You can continue.", "success");
      } catch (p) {
        st(String(p?.message || "Remediation failed").trim(), "error"), ve(p?.message || "Failed to remediate document", p?.code || "", p?.status || 0);
      } finally {
        ln.delete(a), xe && (xe.disabled = !1, xe.textContent = "Remediate PDF");
      }
    }
  }
  function Ut(c) {
    const a = String(c || "").trim();
    if (a === "") return null;
    const p = Ct.find((b) => String(b.id || "").trim() === a);
    if (p) return p;
    const h = z.recentDocuments.find((b) => String(b.id || "").trim() === a);
    if (h) return h;
    const w = z.searchResults.find((b) => String(b.id || "").trim() === a);
    return w || null;
  }
  function Pt() {
    const c = Ut(be?.value || "");
    if (!c) return !0;
    const a = tt(c.compatibilityTier);
    return He(a) ? (kt(c, c.compatibilityReason || ""), it(), ve(Rt(c.compatibilityReason || "")), It && It.classList.add("hidden"), Et && Et.classList.remove("hidden"), Se?.focus(), !1) : (Ht(), !0);
  }
  function Nt(c) {
    const a = he(c, 0);
    Fe && (Fe.value = String(a));
  }
  function Cn() {
    const c = (be?.value || "").trim();
    if (!c) return;
    const a = Ct.find((p) => String(p.id || "").trim() === c);
    a && (Ze.textContent.trim() || (Ze.textContent = a.title || "Untitled"), (!et.textContent.trim() || et.textContent.trim() === "pages") && (et.textContent = `${a.pageCount || 0} pages`), Nt(a.pageCount || 0), It.classList.remove("hidden"), Et.classList.add("hidden"));
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
        throw await wn(a, "Failed to load documents");
      const p = await a.json();
      Ct = (Array.isArray(p?.records) ? p.records : Array.isArray(p?.items) ? p.items : []).slice().sort((b, k) => {
        const T = Date.parse(String(
          b?.created_at ?? b?.createdAt ?? b?.updated_at ?? b?.updatedAt ?? ""
        )), D = Date.parse(String(
          k?.created_at ?? k?.createdAt ?? k?.updated_at ?? k?.updatedAt ?? ""
        )), P = Number.isFinite(T) ? T : 0;
        return (Number.isFinite(D) ? D : 0) - P;
      }).map((b) => bi(b)).filter((b) => b.id !== ""), pn(Ct), Cn();
    } catch (c) {
      const a = vn(c?.message || "Failed to load documents", c?.code || "", c?.status || 0);
      Qe.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${oe(a)}</div>`;
    }
  }
  function pn(c) {
    if (c.length === 0) {
      Qe.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${oe(_)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    Qe.innerHTML = c.map((p, h) => {
      const w = oe(String(p.id || "").trim()), b = oe(String(p.title || "").trim()), k = String(he(p.pageCount, 0)), T = tt(p.compatibilityTier), D = nt(p.compatibilityReason), P = oe(T), I = oe(D), N = He(T) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
      <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              role="option"
              aria-selected="false"
              tabindex="${h === 0 ? "0" : "-1"}"
              data-document-id="${w}"
              data-document-title="${b}"
              data-document-pages="${k}"
              data-document-compatibility-tier="${P}"
              data-document-compatibility-reason="${I}">
        <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">${b}</div>
          <div class="text-xs text-gray-500">${k} pages ${N}</div>
        </div>
      </button>
    `;
    }).join("");
    const a = Qe.querySelectorAll(".document-option");
    a.forEach((p, h) => {
      p.addEventListener("click", () => Pn(p)), p.addEventListener("keydown", (w) => {
        let b = h;
        if (w.key === "ArrowDown")
          w.preventDefault(), b = Math.min(h + 1, a.length - 1);
        else if (w.key === "ArrowUp")
          w.preventDefault(), b = Math.max(h - 1, 0);
        else if (w.key === "Enter" || w.key === " ") {
          w.preventDefault(), Pn(p);
          return;
        } else w.key === "Home" ? (w.preventDefault(), b = 0) : w.key === "End" && (w.preventDefault(), b = a.length - 1);
        b !== h && (a[b].focus(), a[b].setAttribute("tabindex", "0"), p.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Pn(c) {
    const a = c.getAttribute("data-document-id"), p = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), w = tt(
      c.getAttribute("data-document-compatibility-tier")
    ), b = nt(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (He(w)) {
      kt({ id: a, title: p, pageCount: h, compatibilityReason: b }), it(), ve(Rt(b)), Se?.focus();
      return;
    }
    un(a, p, h);
  }
  function ti(c) {
    const a = document.getElementById("title");
    if (!a || a.value.trim())
      return;
    const h = String(c || "").trim();
    h && (a.value = h, Y.updateDetails({
      title: h,
      message: Y.getState().details.message || ""
    }));
  }
  function oe(c) {
    const a = document.createElement("div");
    return a.textContent = c, a.innerHTML;
  }
  cn && cn.addEventListener("click", () => {
    It.classList.add("hidden"), Et.classList.remove("hidden"), Ht(), Se?.focus(), zt();
  }), xe && xe.addEventListener("click", () => {
    ei();
  }), Ft && Ft.addEventListener("click", () => {
    Ht(), Se?.focus();
  });
  const An = 300, At = 5, Tn = 10, Tt = document.getElementById("document-typeahead"), rt = document.getElementById("document-typeahead-dropdown"), pt = document.getElementById("document-recent-section"), _t = document.getElementById("document-recent-list"), qt = document.getElementById("document-search-section"), ni = document.getElementById("document-search-list"), ze = document.getElementById("document-empty-state"), jt = document.getElementById("document-dropdown-loading"), _n = document.getElementById("document-search-loading"), z = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Me = 0, at = null;
  function ot(c, a) {
    let p = null;
    return (...h) => {
      p !== null && clearTimeout(p), p = setTimeout(() => {
        c(...h), p = null;
      }, a);
    };
  }
  async function Dn() {
    try {
      const c = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(At)
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
      const p = await a.json(), h = Array.isArray(p?.records) ? p.records : Array.isArray(p?.items) ? p.items : [];
      z.recentDocuments = h.map((w) => bi(w)).filter((w) => w.id !== "").slice(0, At);
    } catch (c) {
      console.warn("Error loading recent documents:", c);
    }
  }
  async function ii(c) {
    const a = c.trim();
    if (!a) {
      at && (at.abort(), at = null), z.isSearchMode = !1, z.searchResults = [], Te();
      return;
    }
    const p = ++Me;
    at && at.abort(), at = new AbortController(), z.isLoading = !0, z.isSearchMode = !0, Te();
    try {
      const h = new URLSearchParams({
        q: a,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Tn)
      }), w = await fetch(`${n}/panels/esign_documents?${h}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: at.signal
      });
      if (p !== Me)
        return;
      if (!w.ok) {
        console.warn("Failed to search documents:", w.status), z.searchResults = [], z.isLoading = !1, Te();
        return;
      }
      const b = await w.json(), k = Array.isArray(b?.records) ? b.records : Array.isArray(b?.items) ? b.items : [];
      z.searchResults = k.map((T) => bi(T)).filter((T) => T.id !== "").slice(0, Tn);
    } catch (h) {
      if (h?.name === "AbortError")
        return;
      console.warn("Error searching documents:", h), z.searchResults = [];
    } finally {
      p === Me && (z.isLoading = !1, Te());
    }
  }
  const si = ot(ii, An);
  function zt() {
    rt && (z.isOpen = !0, z.selectedIndex = -1, rt.classList.remove("hidden"), Se?.setAttribute("aria-expanded", "true"), Qe?.classList.add("hidden"), Te());
  }
  function gt() {
    rt && (z.isOpen = !1, z.selectedIndex = -1, rt.classList.add("hidden"), Se?.setAttribute("aria-expanded", "false"), Qe?.classList.remove("hidden"));
  }
  function Te() {
    if (rt) {
      if (z.isLoading) {
        jt?.classList.remove("hidden"), pt?.classList.add("hidden"), qt?.classList.add("hidden"), ze?.classList.add("hidden"), _n?.classList.remove("hidden");
        return;
      }
      jt?.classList.add("hidden"), _n?.classList.add("hidden"), z.isSearchMode ? (pt?.classList.add("hidden"), z.searchResults.length > 0 ? (qt?.classList.remove("hidden"), ze?.classList.add("hidden"), Mn(ni, z.searchResults, "search")) : (qt?.classList.add("hidden"), ze?.classList.remove("hidden"))) : (qt?.classList.add("hidden"), z.recentDocuments.length > 0 ? (pt?.classList.remove("hidden"), ze?.classList.add("hidden"), Mn(_t, z.recentDocuments, "recent")) : (pt?.classList.add("hidden"), ze?.classList.remove("hidden"), ze && (ze.textContent = "No recent documents")));
    }
  }
  function Mn(c, a, p) {
    c && (c.innerHTML = a.map((h, w) => {
      const b = w, k = z.selectedIndex === b, T = oe(String(h.id || "").trim()), D = oe(String(h.title || "").trim()), P = String(he(h.pageCount, 0)), I = tt(h.compatibilityTier), U = nt(h.compatibilityReason), N = oe(I), O = oe(U), W = He(I) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${k ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${k}"
          tabindex="-1"
          data-document-id="${T}"
          data-document-title="${D}"
          data-document-pages="${P}"
          data-document-compatibility-tier="${N}"
          data-document-compatibility-reason="${O}"
          data-typeahead-index="${b}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${D}</div>
            <div class="text-xs text-gray-500">${P} pages ${W}</div>
          </div>
        </button>
      `;
    }).join(""), c.querySelectorAll(".typeahead-option").forEach((h) => {
      h.addEventListener("click", () => $n(h));
    }));
  }
  function $n(c) {
    const a = c.getAttribute("data-document-id"), p = c.getAttribute("data-document-title"), h = c.getAttribute("data-document-pages"), w = tt(
      c.getAttribute("data-document-compatibility-tier")
    ), b = nt(
      c.getAttribute("data-document-compatibility-reason")
    );
    if (a) {
      if (He(w)) {
        kt({ id: a, title: p, pageCount: h, compatibilityReason: b }), it(), ve(Rt(b)), Se?.focus();
        return;
      }
      un(a, p, h), gt(), Se && (Se.value = ""), z.query = "", z.isSearchMode = !1, z.searchResults = [];
    }
  }
  function Bn(c) {
    if (!z.isOpen) {
      (c.key === "ArrowDown" || c.key === "Enter") && (c.preventDefault(), zt());
      return;
    }
    const a = z.isSearchMode ? z.searchResults : z.recentDocuments, p = a.length - 1;
    switch (c.key) {
      case "ArrowDown":
        c.preventDefault(), z.selectedIndex = Math.min(z.selectedIndex + 1, p), Te(), Oe();
        break;
      case "ArrowUp":
        c.preventDefault(), z.selectedIndex = Math.max(z.selectedIndex - 1, 0), Te(), Oe();
        break;
      case "Enter":
        if (c.preventDefault(), z.selectedIndex >= 0 && z.selectedIndex <= p) {
          const h = a[z.selectedIndex];
          if (h) {
            const w = document.createElement("button");
            w.setAttribute("data-document-id", h.id), w.setAttribute("data-document-title", h.title), w.setAttribute("data-document-pages", String(h.pageCount)), w.setAttribute("data-document-compatibility-tier", String(h.compatibilityTier || "")), w.setAttribute("data-document-compatibility-reason", String(h.compatibilityReason || "")), $n(w);
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
        c.preventDefault(), z.selectedIndex = 0, Te(), Oe();
        break;
      case "End":
        c.preventDefault(), z.selectedIndex = p, Te(), Oe();
        break;
    }
  }
  function Oe() {
    if (!rt) return;
    const c = rt.querySelector(`[data-typeahead-index="${z.selectedIndex}"]`);
    c && c.scrollIntoView({ block: "nearest" });
  }
  Se && (Se.addEventListener("input", (c) => {
    const p = c.target.value;
    z.query = p, z.isOpen || zt(), p.trim() ? (z.isLoading = !0, Te(), si(p)) : (z.isSearchMode = !1, z.searchResults = [], Te());
    const h = Ct.filter(
      (w) => String(w.title || "").toLowerCase().includes(p.toLowerCase())
    );
    pn(h);
  }), Se.addEventListener("focus", () => {
    zt();
  }), Se.addEventListener("keydown", Bn)), document.addEventListener("click", (c) => {
    const a = c.target;
    Tt && !Tt.contains(a) && gt();
  }), kn(), Dn();
  const _e = document.getElementById("participants-container"), ri = document.getElementById("participant-template"), gn = document.getElementById("add-participant-btn");
  let ai = 0, mn = 0;
  function hn() {
    return `temp_${Date.now()}_${ai++}`;
  }
  function Ot(c = {}) {
    const a = ri.content.cloneNode(!0), p = a.querySelector(".participant-entry"), h = c.id || hn();
    p.setAttribute("data-participant-id", h);
    const w = p.querySelector(".participant-id-input"), b = p.querySelector('input[name="participants[].name"]'), k = p.querySelector('input[name="participants[].email"]'), T = p.querySelector('select[name="participants[].role"]'), D = p.querySelector('input[name="participants[].signing_stage"]'), P = p.querySelector('input[name="participants[].notify"]'), I = p.querySelector(".signing-stage-wrapper"), U = mn++;
    w.name = `participants[${U}].id`, w.value = h, b.name = `participants[${U}].name`, k.name = `participants[${U}].email`, T.name = `participants[${U}].role`, D && (D.name = `participants[${U}].signing_stage`), P && (P.name = `participants[${U}].notify`), c.name && (b.value = c.name), c.email && (k.value = c.email), c.role && (T.value = c.role), D && c.signing_stage && (D.value = c.signing_stage), P && (P.checked = c.notify !== !1);
    const N = () => {
      if (!I || !D) return;
      const O = T.value === "signer";
      I.classList.toggle("hidden", !O), O ? D.value || (D.value = "1") : D.value = "";
    };
    N(), p.querySelector(".remove-participant-btn").addEventListener("click", () => {
      p.remove(), K();
    }), T.addEventListener("change", () => {
      N(), K();
    }), _e.appendChild(a);
  }
  gn.addEventListener("click", () => Ot()), H.length > 0 ? H.forEach((c) => {
    Ot({
      id: String(c.id || "").trim(),
      name: String(c.name || "").trim(),
      email: String(c.email || "").trim(),
      role: String(c.role || "signer").trim() || "signer",
      notify: c.notify !== !1,
      signing_stage: Number(c.signing_stage || c.signingStage || 1) || 1
    });
  }) : Ot();
  const Le = document.getElementById("field-definitions-container"), oi = document.getElementById("field-definition-template"), Gt = document.getElementById("add-field-btn"), Fn = document.getElementById("add-field-btn-container"), ci = document.getElementById("add-field-definition-empty-btn"), Rn = document.getElementById("field-definitions-empty-state"), de = document.getElementById("field-rules-container"), ye = document.getElementById("field-rule-template"), fn = document.getElementById("add-field-rule-btn"), Vt = document.getElementById("field-rules-empty-state"), Wt = document.getElementById("field-rules-preview"), Jt = document.getElementById("field_rules_json"), Yt = document.getElementById("field_placements_json");
  let r = 0, d = 0, g = 0;
  function f() {
    return `temp_field_${Date.now()}_${r++}`;
  }
  function y() {
    return `rule_${Date.now()}_${g}`;
  }
  function x() {
    const c = _e.querySelectorAll(".participant-entry"), a = [];
    return c.forEach((p) => {
      const h = p.getAttribute("data-participant-id"), w = p.querySelector('select[name*=".role"]'), b = p.querySelector('input[name*=".name"]'), k = p.querySelector('input[name*=".email"]');
      w.value === "signer" && a.push({
        id: h,
        name: b.value || k.value || "Signer",
        email: k.value
      });
    }), a;
  }
  function L(c, a) {
    const p = String(c || "").trim();
    return p && a.some((h) => h.id === p) ? p : a.length === 1 ? a[0].id : "";
  }
  function M(c, a, p = "") {
    if (!c) return;
    const h = L(p, a);
    c.innerHTML = '<option value="">Select signer...</option>', a.forEach((w) => {
      const b = document.createElement("option");
      b.value = w.id, b.textContent = w.name, c.appendChild(b);
    }), c.value = h;
  }
  function R(c = x()) {
    const a = Le.querySelectorAll(".field-participant-select"), p = de ? de.querySelectorAll(".field-rule-participant-select") : [];
    a.forEach((h) => {
      M(h, c, h.value);
    }), p.forEach((h) => {
      M(h, c, h.value);
    });
  }
  function K() {
    const c = x();
    R(c), ee();
  }
  function q() {
    const c = he(Fe?.value || "0", 0);
    if (c > 0) return c;
    const a = String(et?.textContent || "").match(/(\d+)\s+pages?/i);
    if (a) {
      const p = he(a[1], 0);
      if (p > 0) return p;
    }
    return 1;
  }
  function X() {
    if (!de || !Vt) return;
    const c = de.querySelectorAll(".field-rule-entry");
    Vt.classList.toggle("hidden", c.length > 0);
  }
  function pe() {
    if (!de) return [];
    const c = q(), a = de.querySelectorAll(".field-rule-entry"), p = [];
    return a.forEach((h) => {
      const w = zn({
        id: h.getAttribute("data-field-rule-id") || "",
        type: h.querySelector(".field-rule-type-select")?.value || "",
        participantId: h.querySelector(".field-rule-participant-select")?.value || "",
        fromPage: h.querySelector(".field-rule-from-page-input")?.value || "",
        toPage: h.querySelector(".field-rule-to-page-input")?.value || "",
        page: h.querySelector(".field-rule-page-input")?.value || "",
        excludeLastPage: !!h.querySelector(".field-rule-exclude-last-input")?.checked,
        excludePages: En(h.querySelector(".field-rule-exclude-pages-input")?.value || ""),
        required: (h.querySelector(".field-rule-required-select")?.value || "1") !== "0"
      }, c);
      w.type && p.push(w);
    }), p;
  }
  function De() {
    return pe().map((c) => Or(c));
  }
  function V(c, a) {
    return Vr(c, a);
  }
  function ee() {
    if (!Wt) return;
    const c = pe(), a = q(), p = V(c, a), h = x(), w = new Map(h.map((D) => [String(D.id), D.name]));
    if (Jt && (Jt.value = JSON.stringify(De())), !p.length) {
      Wt.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const b = p.reduce((D, P) => {
      const I = P.type;
      return D[I] = (D[I] || 0) + 1, D;
    }, {}), k = p.slice(0, 8).map((D) => {
      const P = w.get(String(D.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${D.type === "initials" ? "Initials" : "Signature"} on page ${D.page}</span><span class="text-gray-500">${oe(String(P))}</span></li>`;
    }).join(""), T = p.length - 8;
    Wt.innerHTML = `
      <p class="text-gray-700">${p.length} generated field${p.length !== 1 ? "s" : ""} (${b.initials || 0} initials, ${b.signature || 0} signatures)</p>
      <ul class="space-y-1">${k}</ul>
      ${T > 0 ? `<p class="text-gray-500">+${T} more</p>` : ""}
    `;
  }
  function We() {
    const c = x(), a = new Map(c.map((P) => [String(P.id), P.name || P.email || "Signer"])), p = [];
    Le.querySelectorAll(".field-definition-entry").forEach((P) => {
      const I = String(P.getAttribute("data-field-definition-id") || "").trim(), U = P.querySelector(".field-type-select"), N = P.querySelector(".field-participant-select"), O = P.querySelector('input[name*=".page"]'), j = String(U?.value || "text").trim() || "text", W = String(N?.value || "").trim(), te = parseInt(String(O?.value || "1"), 10) || 1;
      p.push({
        definitionId: I,
        fieldType: j,
        participantId: W,
        participantName: a.get(W) || "Unassigned",
        page: te
      });
    });
    const w = V(pe(), q()), b = /* @__PURE__ */ new Map();
    w.forEach((P) => {
      const I = String(P.ruleId || "").trim(), U = String(P.id || "").trim();
      if (I && U) {
        const N = b.get(I) || [];
        N.push(U), b.set(I, N);
      }
    });
    let k = C.linkGroupState;
    b.forEach((P, I) => {
      if (P.length > 1 && !C.linkGroupState.groups.get(`rule_${I}`)) {
        const N = Nr(P, `Rule ${I}`);
        N.id = `rule_${I}`, k = es(k, N);
      }
    }), C.linkGroupState = k, w.forEach((P) => {
      const I = String(P.id || "").trim();
      if (!I) return;
      const U = String(P.participantId || "").trim(), N = parseInt(String(P.page || "1"), 10) || 1, O = String(P.ruleId || "").trim();
      p.push({
        definitionId: I,
        fieldType: String(P.type || "text").trim() || "text",
        participantId: U,
        participantName: a.get(U) || "Unassigned",
        page: N,
        linkGroupId: O ? `rule_${O}` : void 0
      });
    });
    const T = /* @__PURE__ */ new Set(), D = p.filter((P) => {
      const I = String(P.definitionId || "").trim();
      return !I || T.has(I) ? !1 : (T.add(I), !0);
    });
    return D.sort((P, I) => P.page !== I.page ? P.page - I.page : P.definitionId.localeCompare(I.definitionId)), D;
  }
  function Je(c) {
    const a = c.querySelector(".field-rule-type-select"), p = c.querySelector(".field-rule-range-start-wrap"), h = c.querySelector(".field-rule-range-end-wrap"), w = c.querySelector(".field-rule-page-wrap"), b = c.querySelector(".field-rule-exclude-last-wrap"), k = c.querySelector(".field-rule-exclude-pages-wrap"), T = c.querySelector(".field-rule-summary"), D = c.querySelector(".field-rule-from-page-input"), P = c.querySelector(".field-rule-to-page-input"), I = c.querySelector(".field-rule-page-input"), U = c.querySelector(".field-rule-exclude-last-input"), N = c.querySelector(".field-rule-exclude-pages-input"), O = q(), j = zn({
      type: a?.value || "",
      fromPage: D?.value || "",
      toPage: P?.value || "",
      page: I?.value || "",
      excludeLastPage: !!U?.checked,
      excludePages: En(N?.value || ""),
      required: !0
    }, O), W = j.fromPage > 0 ? j.fromPage : 1, te = j.toPage > 0 ? j.toPage : O, ce = j.page > 0 ? j.page : j.toPage > 0 ? j.toPage : O, me = j.excludeLastPage, we = j.excludePages.join(","), ie = a?.value === "initials_each_page";
    if (p.classList.toggle("hidden", !ie), h.classList.toggle("hidden", !ie), b.classList.toggle("hidden", !ie), k.classList.toggle("hidden", !ie), w.classList.toggle("hidden", ie), D && (D.value = String(W)), P && (P.value = String(te)), I && (I.value = String(ce)), N && (N.value = we), U && (U.checked = me), ie) {
      const le = Wr(
        W,
        te,
        O,
        me,
        j.excludePages
      ), Ke = Jr(le);
      le.isEmpty ? T.textContent = `Warning: No initials fields will be generated ${Ke}.` : T.textContent = `Generates initials fields on ${Ke}.`;
    } else
      T.textContent = `Generates one signature field on page ${ce}.`;
  }
  function Hn(c = {}) {
    if (!ye || !de) return;
    const a = ye.content.cloneNode(!0), p = a.querySelector(".field-rule-entry"), h = c.id || y(), w = g++, b = q();
    p.setAttribute("data-field-rule-id", h);
    const k = p.querySelector(".field-rule-id-input"), T = p.querySelector(".field-rule-type-select"), D = p.querySelector(".field-rule-participant-select"), P = p.querySelector(".field-rule-from-page-input"), I = p.querySelector(".field-rule-to-page-input"), U = p.querySelector(".field-rule-page-input"), N = p.querySelector(".field-rule-required-select"), O = p.querySelector(".field-rule-exclude-last-input"), j = p.querySelector(".field-rule-exclude-pages-input"), W = p.querySelector(".remove-field-rule-btn");
    k.name = `field_rules[${w}].id`, k.value = h, T.name = `field_rules[${w}].type`, D.name = `field_rules[${w}].participant_id`, P.name = `field_rules[${w}].from_page`, I.name = `field_rules[${w}].to_page`, U.name = `field_rules[${w}].page`, N.name = `field_rules[${w}].required`, O.name = `field_rules[${w}].exclude_last_page`, j.name = `field_rules[${w}].exclude_pages`;
    const te = zn(c, b);
    T.value = te.type || "initials_each_page", M(D, x(), te.participantId), P.value = String(te.fromPage > 0 ? te.fromPage : 1), I.value = String(te.toPage > 0 ? te.toPage : b), U.value = String(te.page > 0 ? te.page : b), N.value = te.required ? "1" : "0", O.checked = te.excludeLastPage, j.value = te.excludePages.join(",");
    const ce = () => {
      Je(p), ee(), Ye();
    }, me = () => {
      const ie = q();
      if (P) {
        const le = parseInt(P.value, 10);
        Number.isFinite(le) && (P.value = String(xn(le, ie, 1)));
      }
      if (I) {
        const le = parseInt(I.value, 10);
        Number.isFinite(le) && (I.value = String(xn(le, ie, 1)));
      }
      if (U) {
        const le = parseInt(U.value, 10);
        Number.isFinite(le) && (U.value = String(xn(le, ie, 1)));
      }
    }, we = () => {
      me(), ce();
    };
    T.addEventListener("change", ce), D.addEventListener("change", ce), P.addEventListener("input", we), P.addEventListener("change", we), I.addEventListener("input", we), I.addEventListener("change", we), U.addEventListener("input", we), U.addEventListener("change", we), N.addEventListener("change", ce), O.addEventListener("change", () => {
      const ie = q();
      if (O.checked) {
        const le = Math.max(1, ie - 1);
        I.value = String(le);
      } else
        I.value = String(ie);
      ce();
    }), j.addEventListener("input", ce), W.addEventListener("click", () => {
      p.remove(), X(), ee(), Ye();
    }), de.appendChild(a), Je(de.lastElementChild), X(), ee();
  }
  function Kt(c = {}) {
    const a = oi.content.cloneNode(!0), p = a.querySelector(".field-definition-entry"), h = c.id || f();
    p.setAttribute("data-field-definition-id", h);
    const w = p.querySelector(".field-definition-id-input"), b = p.querySelector('select[name="field_definitions[].type"]'), k = p.querySelector('select[name="field_definitions[].participant_id"]'), T = p.querySelector('input[name="field_definitions[].page"]'), D = p.querySelector('input[name="field_definitions[].required"]'), P = p.querySelector(".field-date-signed-info"), I = d++;
    w.name = `field_instances[${I}].id`, w.value = h, b.name = `field_instances[${I}].type`, k.name = `field_instances[${I}].participant_id`, T.name = `field_instances[${I}].page`, D.name = `field_instances[${I}].required`, c.type && (b.value = c.type), c.page && (T.value = String(xn(c.page, q(), 1))), c.required !== void 0 && (D.checked = c.required);
    const U = String(c.participant_id || c.participantId || "").trim();
    M(k, x(), U), b.addEventListener("change", () => {
      b.value === "date_signed" ? P.classList.remove("hidden") : P.classList.add("hidden");
    }), b.value === "date_signed" && P.classList.remove("hidden"), p.querySelector(".remove-field-definition-btn").addEventListener("click", () => {
      p.remove(), Xt();
    });
    const N = p.querySelector('input[name*=".page"]'), O = () => {
      N && (N.value = String(xn(N.value, q(), 1)));
    };
    O(), N?.addEventListener("input", O), N?.addEventListener("change", O), Le.appendChild(a), Xt();
  }
  function Xt() {
    Le.querySelectorAll(".field-definition-entry").length === 0 ? (Rn.classList.remove("hidden"), Fn?.classList.add("hidden")) : (Rn.classList.add("hidden"), Fn?.classList.remove("hidden"));
  }
  new MutationObserver(() => {
    K();
  }).observe(_e, { childList: !0, subtree: !0 }), _e.addEventListener("change", (c) => {
    (c.target.matches('select[name*=".role"]') || c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && K();
  }), _e.addEventListener("input", (c) => {
    (c.target.matches('input[name*=".name"]') || c.target.matches('input[name*=".email"]')) && K();
  }), Gt.addEventListener("click", () => Kt()), ci.addEventListener("click", () => Kt()), fn?.addEventListener("click", () => Hn({ to_page: q() })), window._initialFieldPlacementsData = [], F.forEach((c) => {
    const a = String(c.id || "").trim();
    if (!a) return;
    const p = String(c.type || "signature").trim() || "signature", h = String(c.participant_id || c.participantId || "").trim(), w = Number(c.page || 1) || 1, b = !!c.required;
    Kt({
      id: a,
      type: p,
      participant_id: h,
      page: w,
      required: b
    }), window._initialFieldPlacementsData.push(On({
      id: a,
      definitionId: a,
      type: p,
      participantId: h,
      participantName: String(c.participant_name || c.participantName || "").trim(),
      page: w,
      x: Number(c.x || c.pos_x || 0) || 0,
      y: Number(c.y || c.pos_y || 0) || 0,
      width: Number(c.width || 150) || 150,
      height: Number(c.height || 32) || 32,
      placementSource: String(c.placement_source || c.placementSource || Ce.MANUAL).trim() || Ce.MANUAL
    }, window._initialFieldPlacementsData.length));
  }), Xt(), K(), X(), ee();
  const ct = document.getElementById("agreement-form"), Ue = document.getElementById("submit-btn"), yn = document.getElementById("form-announcements");
  function vn(c, a = "", p = 0) {
    const h = String(a || "").trim().toUpperCase(), w = String(c || "").trim().toLowerCase();
    return h === "SCOPE_DENIED" || w.includes("scope denied") ? "You don't have access to this organization's resources." : h === "TRANSPORT_SECURITY" || h === "TRANSPORT_SECURITY_REQUIRED" || w.includes("tls transport required") || Number(p) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : h === "PDF_UNSUPPORTED" || w === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(c || "").trim() !== "" ? String(c).trim() : "Something went wrong. Please try again.";
  }
  async function wn(c, a) {
    const p = Number(c?.status || 0);
    let h = "", w = "";
    try {
      const b = await c.json();
      h = String(b?.error?.code || b?.code || "").trim(), w = String(b?.error?.message || b?.message || "").trim();
    } catch {
      w = "";
    }
    return w === "" && (w = a || `Request failed (${p || "unknown"})`), {
      status: p,
      code: h,
      message: vn(w, h, p)
    };
  }
  function ve(c, a = "", p = 0) {
    const h = vn(c, a, p);
    yn && (yn.textContent = h), window.toastManager ? window.toastManager.error(h) : alert(h);
  }
  function Ps() {
    const c = [];
    _e.querySelectorAll(".participant-entry").forEach((w) => {
      const b = String(w.getAttribute("data-participant-id") || "").trim(), k = String(w.querySelector('input[name*=".name"]')?.value || "").trim(), T = String(w.querySelector('input[name*=".email"]')?.value || "").trim(), D = String(w.querySelector('select[name*=".role"]')?.value || "signer").trim(), P = w.querySelector(".notify-input")?.checked !== !1, I = String(w.querySelector(".signing-stage-input")?.value || "").trim(), U = Number(I || "1") || 1;
      c.push({
        id: b,
        name: k,
        email: T,
        role: D,
        notify: P,
        signing_stage: D === "signer" ? U : 0
      });
    });
    const a = [];
    Le.querySelectorAll(".field-definition-entry").forEach((w) => {
      const b = String(w.getAttribute("data-field-definition-id") || "").trim(), k = String(w.querySelector(".field-type-select")?.value || "signature").trim(), T = String(w.querySelector(".field-participant-select")?.value || "").trim(), D = Number(w.querySelector('input[name*=".page"]')?.value || "1") || 1, P = !!w.querySelector('input[name*=".required"]')?.checked;
      b && a.push({
        id: b,
        type: k,
        participant_id: T,
        page: D,
        required: P
      });
    });
    const p = [];
    C && Array.isArray(C.fieldInstances) && C.fieldInstances.forEach((w, b) => {
      p.push(rs(w, b));
    });
    const h = JSON.stringify(p);
    return Yt && (Yt.value = h), {
      document_id: String(be?.value || "").trim(),
      title: String(document.getElementById("title")?.value || "").trim(),
      message: String(document.getElementById("message")?.value || "").trim(),
      participants: c,
      field_instances: a,
      field_placements: p,
      field_placements_json: h,
      field_rules: De(),
      field_rules_json: String(Jt?.value || "[]"),
      send_for_signature: ge === yt ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(Fe?.value || "0") || 0
    };
  }
  function li() {
    const c = x(), a = /* @__PURE__ */ new Map();
    return c.forEach((w) => {
      a.set(w.id, !1);
    }), Le.querySelectorAll(".field-definition-entry").forEach((w) => {
      const b = w.querySelector(".field-type-select"), k = w.querySelector(".field-participant-select"), T = w.querySelector('input[name*=".required"]');
      b?.value === "signature" && k?.value && T?.checked && a.set(k.value, !0);
    }), V(pe(), q()).forEach((w) => {
      w.type === "signature" && w.participantId && w.required && a.set(w.participantId, !0);
    }), c.filter((w) => !a.get(w.id));
  }
  function Bi(c) {
    if (!Array.isArray(c) || c.length === 0)
      return "Each signer requires at least one required signature field.";
    const a = c.map((p) => p?.name?.trim()).filter((p) => !!p);
    return a.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${a.join(", ")}`;
  }
  ct.addEventListener("submit", function(c) {
    if (ee(), !be.value) {
      c.preventDefault(), ve("Please select a document"), Se.focus();
      return;
    }
    if (!Pt()) {
      c.preventDefault();
      return;
    }
    const a = _e.querySelectorAll(".participant-entry");
    if (a.length === 0) {
      c.preventDefault(), ve("Please add at least one participant"), gn.focus();
      return;
    }
    let p = !1;
    if (a.forEach((I) => {
      I.querySelector('select[name*=".role"]').value === "signer" && (p = !0);
    }), !p) {
      c.preventDefault(), ve("At least one signer is required");
      const I = a[0]?.querySelector('select[name*=".role"]');
      I && I.focus();
      return;
    }
    const h = Le.querySelectorAll(".field-definition-entry"), w = li();
    if (w.length > 0) {
      c.preventDefault(), ve(Bi(w)), bn(ke.FIELDS), Gt.focus();
      return;
    }
    let b = !1;
    if (h.forEach((I) => {
      I.querySelector(".field-participant-select").value || (b = !0);
    }), b) {
      c.preventDefault(), ve("Please assign all fields to a signer");
      const I = Le.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
      I && I.focus();
      return;
    }
    if (pe().some((I) => !I.participantId)) {
      c.preventDefault(), ve("Please assign all automation rules to a signer"), Array.from(de?.querySelectorAll(".field-rule-participant-select") || []).find((U) => !U.value)?.focus();
      return;
    }
    const D = !!ct.querySelector('input[name="save_as_draft"]'), P = ge === yt && !D;
    if (P) {
      let I = ct.querySelector('input[name="send_for_signature"]');
      I || (I = document.createElement("input"), I.type = "hidden", I.name = "send_for_signature", ct.appendChild(I)), I.value = "1";
    } else
      ct.querySelector('input[name="send_for_signature"]')?.remove();
    if (E === "json") {
      c.preventDefault(), Ue.disabled = !0, Ue.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${P ? "Sending..." : "Saving..."}
      `, (async () => {
        try {
          Ps(), Y.updateState(Y.collectFormState()), await Ee.forceSync();
          const I = Y.getState();
          if (I?.syncPending)
            throw new Error("Unable to sync latest draft changes");
          const U = String(I?.serverDraftId || "").trim();
          if (!U)
            throw new Error("Draft session not available. Please try again.");
          const N = String(e.routes?.index || "").trim();
          if (!P) {
            if (N) {
              window.location.href = N;
              return;
            }
            window.location.reload();
            return;
          }
          const O = await fetch(
            B(`${u}/${encodeURIComponent(U)}/send`),
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
          if (!O.ok)
            throw await wn(O, "Failed to send agreement");
          const j = await O.json(), W = String(j?.agreement_id || j?.id || j?.data?.id || "").trim();
          if (Y.clear(), Ee.broadcastStateUpdate(), W && N) {
            window.location.href = `${N}/${encodeURIComponent(W)}`;
            return;
          }
          if (N) {
            window.location.href = N;
            return;
          }
          window.location.reload();
        } catch (I) {
          const U = String(I?.message || "Failed to process agreement").trim(), N = String(I?.code || "").trim(), O = Number(I?.status || 0);
          ve(U, N, O), Ue.disabled = !1, Ue.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Send for Signature
          `;
        }
      })();
      return;
    }
    Ue.disabled = !0, Ue.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${P ? "Sending..." : "Saving..."}
    `;
  });
  let ge = 1;
  const Fi = document.querySelectorAll(".wizard-step-btn"), As = document.querySelectorAll(".wizard-step"), Ts = document.querySelectorAll(".wizard-connector"), Ri = document.getElementById("wizard-prev-btn"), di = document.getElementById("wizard-next-btn"), Hi = document.getElementById("wizard-save-btn");
  function ui() {
    if (Fi.forEach((c, a) => {
      const p = a + 1, h = c.querySelector(".wizard-step-number");
      p < ge ? (c.classList.remove("text-gray-500", "text-blue-600"), c.classList.add("text-green-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), h.classList.add("bg-green-600", "text-white"), c.removeAttribute("aria-current")) : p === ge ? (c.classList.remove("text-gray-500", "text-green-600"), c.classList.add("text-blue-600"), h.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), h.classList.add("bg-blue-600", "text-white"), c.setAttribute("aria-current", "step")) : (c.classList.remove("text-blue-600", "text-green-600"), c.classList.add("text-gray-500"), h.classList.remove("bg-blue-600", "text-white", "bg-green-600"), h.classList.add("bg-gray-300", "text-gray-600"), c.removeAttribute("aria-current"));
    }), Ts.forEach((c, a) => {
      a < ge - 1 ? (c.classList.remove("bg-gray-300"), c.classList.add("bg-green-600")) : (c.classList.remove("bg-green-600"), c.classList.add("bg-gray-300"));
    }), As.forEach((c) => {
      parseInt(c.dataset.step, 10) === ge ? c.classList.remove("hidden") : c.classList.add("hidden");
    }), Ri.classList.toggle("hidden", ge === 1), di.classList.toggle("hidden", ge === yt), Hi.classList.toggle("hidden", ge !== yt), Ue.classList.toggle("hidden", ge !== yt), ge < yt) {
      const c = kr[ge] || "Next";
      di.innerHTML = `
        ${c}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
    }
    ge === ke.PLACEMENT ? Ds() : ge === ke.REVIEW && tr(), xt.updateVisibility(ge);
  }
  function _s(c) {
    switch (c) {
      case 1:
        return be.value ? !!Pt() : (ve("Please select a document"), !1);
      case 2:
        const a = document.getElementById("title");
        return a.value.trim() ? !0 : (ve("Please enter an agreement title"), a.focus(), !1);
      case 3:
        const p = _e.querySelectorAll(".participant-entry");
        if (p.length === 0)
          return ve("Please add at least one participant"), !1;
        let h = !1;
        return p.forEach((D) => {
          D.querySelector('select[name*=".role"]').value === "signer" && (h = !0);
        }), h ? !0 : (ve("At least one signer is required"), !1);
      case 4:
        const w = Le.querySelectorAll(".field-definition-entry");
        for (const D of w) {
          const P = D.querySelector(".field-participant-select");
          if (!P.value)
            return ve("Please assign all fields to a signer"), P.focus(), !1;
        }
        if (pe().find((D) => !D.participantId))
          return ve("Please assign all automation rules to a signer"), de?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const T = li();
        return T.length > 0 ? (ve(Bi(T)), Gt.focus(), !1) : !0;
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  function bn(c) {
    if (!(c < ke.DOCUMENT || c > yt)) {
      if (c > ge) {
        for (let a = ge; a < c; a++)
          if (!_s(a)) return;
      }
      ge = c, ui(), Y.updateStep(c), Bt(), Ee.forceSync(), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  Fi.forEach((c) => {
    c.addEventListener("click", () => {
      const a = parseInt(c.dataset.step, 10);
      bn(a);
    });
  }), Ri.addEventListener("click", () => bn(ge - 1)), di.addEventListener("click", () => bn(ge + 1)), Hi.addEventListener("click", () => {
    const c = document.createElement("input");
    c.type = "hidden", c.name = "save_as_draft", c.value = "1", ct.appendChild(c), ct.submit();
  });
  let C = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(window._initialFieldPlacementsData) ? window._initialFieldPlacementsData.map((c, a) => On(c, a)) : [],
    // { id, definitionId, type, participantId, page, x, y, width, height }
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    loadRequestVersion: 0,
    // Phase 3: Linked field placement state
    linkGroupState: Ur()
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
  async function Ds() {
    const c = document.getElementById("placement-loading"), a = document.getElementById("placement-no-document"), p = document.getElementById("placement-fields-list");
    document.getElementById("placement-total-fields"), document.getElementById("placement-placed-count"), document.getElementById("placement-unplaced-count");
    const h = document.getElementById("placement-viewer");
    document.getElementById("placement-pdf-canvas");
    const w = document.getElementById("placement-overlays-container");
    document.getElementById("placement-canvas-container"), document.getElementById("placement-current-page");
    const b = document.getElementById("placement-total-pages");
    if (document.getElementById("placement-zoom-level"), !be.value) {
      c.classList.add("hidden"), a.classList.remove("hidden");
      return;
    }
    c.classList.remove("hidden"), a.classList.add("hidden");
    const k = We(), T = new Set(
      k.map((W) => String(W.definitionId || "").trim()).filter((W) => W)
    );
    C.fieldInstances = C.fieldInstances.filter(
      (W) => T.has(String(W.definitionId || "").trim())
    ), p.innerHTML = "";
    const D = C.linkGroupState.groups.size > 0, P = document.getElementById("link-batch-actions");
    P && P.classList.toggle("hidden", !D);
    const I = k.map((W) => {
      const te = String(W.definitionId || "").trim(), ce = C.linkGroupState.definitionToGroup.get(te) || "", me = C.linkGroupState.unlinkedDefinitions.has(te);
      return { ...W, definitionId: te, linkGroupId: ce, isUnlinked: me };
    });
    I.forEach((W, te) => {
      const ce = W.definitionId, me = String(W.fieldType || "text").trim() || "text", we = String(W.participantId || "").trim(), ie = String(W.participantName || "Unassigned").trim() || "Unassigned", le = parseInt(String(W.page || "1"), 10) || 1, Ke = W.linkGroupId, hi = W.isUnlinked;
      if (!ce) return;
      C.fieldInstances.forEach((Ne) => {
        Ne.definitionId === ce && (Ne.type = me, Ne.participantId = we, Ne.participantName = ie);
      });
      const fi = mt[me] || mt.text, Q = C.fieldInstances.some((Ne) => Ne.definitionId === ce), se = document.createElement("div");
      se.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Q ? "opacity-50" : ""}`, se.draggable = !Q, se.dataset.definitionId = ce, se.dataset.fieldType = me, se.dataset.participantId = we, se.dataset.participantName = ie, se.dataset.page = String(le), Ke && (se.dataset.linkGroupId = Ke);
      const Zt = document.createElement("span");
      Zt.className = `w-3 h-3 rounded ${fi.bg}`;
      const ft = document.createElement("div");
      ft.className = "flex-1 text-xs";
      const en = document.createElement("div");
      en.className = "font-medium capitalize", en.textContent = me.replace(/_/g, " ");
      const tn = document.createElement("div");
      tn.className = "text-gray-500", tn.textContent = ie;
      const Mt = document.createElement("span");
      Mt.className = `placement-status text-xs ${Q ? "text-green-600" : "text-amber-600"}`, Mt.textContent = Q ? "Placed" : "Not placed", ft.appendChild(en), ft.appendChild(tn), se.appendChild(Zt), se.appendChild(ft), se.appendChild(Mt), se.addEventListener("dragstart", (Ne) => {
        if (Q) {
          Ne.preventDefault();
          return;
        }
        Ne.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: ce,
          fieldType: me,
          participantId: we,
          participantName: ie
        })), Ne.dataTransfer.effectAllowed = "copy", se.classList.add("opacity-50");
      }), se.addEventListener("dragend", () => {
        se.classList.remove("opacity-50");
      }), p.appendChild(se);
      const Vi = I[te + 1];
      if (Ke && Vi && Vi.linkGroupId === Ke) {
        const Ne = Ui(ce, !hi);
        p.appendChild(Ne);
      }
    }), Ms();
    const U = ++C.loadRequestVersion, N = String(be.value || "").trim(), O = encodeURIComponent(N), j = `${n}/panels/esign_documents/${O}/source/pdf`;
    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument != "function")
        throw new Error("PDF preview library is unavailable");
      const te = await window.pdfjsLib.getDocument({
        url: j,
        withCredentials: !0,
        disableWorker: !0
      }).promise;
      if (U !== C.loadRequestVersion)
        return;
      C.pdfDoc = te, C.totalPages = C.pdfDoc.numPages, C.currentPage = 1, b.textContent = C.totalPages, await lt(C.currentPage), c.classList.add("hidden"), C.uiHandlersBound || ($s(h, w), js(), zs(), C.uiHandlersBound = !0), ht();
    } catch (W) {
      if (U !== C.loadRequestVersion)
        return;
      console.error("Failed to load PDF:", W), c.classList.add("hidden"), a.classList.remove("hidden"), a.textContent = `Failed to load PDF: ${vn(W?.message || "Failed to load PDF")}`;
    }
    Sn(), Ge();
  }
  function Ui(c, a) {
    const p = document.createElement("div");
    return p.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", p.dataset.definitionId = c, p.dataset.isLinked = String(a), p.title = a ? "Click to unlink this field" : "Click to re-link this field", p.setAttribute("role", "button"), p.setAttribute("aria-label", a ? "Unlink field from group" : "Re-link field to group"), p.setAttribute("tabindex", "0"), a ? p.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : p.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`, p.addEventListener("click", () => Ni(c, a)), p.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), Ni(c, a));
    }), p;
  }
  function Ni(c, a) {
    a ? (C.linkGroupState = ts(C.linkGroupState, c), window.toastManager && window.toastManager.info("Field unlinked")) : (C.linkGroupState = ns(C.linkGroupState, c), window.toastManager && window.toastManager.info("Field re-linked")), pi();
  }
  function Ms() {
    const c = document.getElementById("link-all-btn"), a = document.getElementById("unlink-all-btn");
    c && !c.dataset.bound && (c.dataset.bound = "true", c.addEventListener("click", () => {
      const p = C.linkGroupState.unlinkedDefinitions.size;
      if (p !== 0) {
        for (const h of C.linkGroupState.unlinkedDefinitions)
          C.linkGroupState = ns(C.linkGroupState, h);
        window.toastManager && window.toastManager.success(`Re-linked ${p} field${p > 1 ? "s" : ""}`), pi();
      }
    })), a && !a.dataset.bound && (a.dataset.bound = "true", a.addEventListener("click", () => {
      let p = 0;
      for (const h of C.linkGroupState.definitionToGroup.keys())
        C.linkGroupState.unlinkedDefinitions.has(h) || (C.linkGroupState = ts(C.linkGroupState, h), p++);
      p > 0 && window.toastManager && window.toastManager.success(`Unlinked ${p} field${p > 1 ? "s" : ""}`), pi();
    })), qi();
  }
  function qi() {
    const c = document.getElementById("link-all-btn"), a = document.getElementById("unlink-all-btn");
    if (c) {
      const p = C.linkGroupState.unlinkedDefinitions.size > 0;
      c.disabled = !p;
    }
    if (a) {
      let p = !1;
      for (const h of C.linkGroupState.definitionToGroup.keys())
        if (!C.linkGroupState.unlinkedDefinitions.has(h)) {
          p = !0;
          break;
        }
      a.disabled = !p;
    }
  }
  function pi() {
    const c = document.getElementById("placement-fields-list");
    if (!c) return;
    const a = We();
    c.innerHTML = "";
    const p = a.map((h) => {
      const w = String(h.definitionId || "").trim(), b = C.linkGroupState.definitionToGroup.get(w) || "", k = C.linkGroupState.unlinkedDefinitions.has(w);
      return { ...h, definitionId: w, linkGroupId: b, isUnlinked: k };
    });
    p.forEach((h, w) => {
      const b = h.definitionId, k = String(h.fieldType || "text").trim() || "text", T = String(h.participantId || "").trim(), D = String(h.participantName || "Unassigned").trim() || "Unassigned", P = parseInt(String(h.page || "1"), 10) || 1, I = h.linkGroupId, U = h.isUnlinked;
      if (!b) return;
      const N = mt[k] || mt.text, O = C.fieldInstances.some((le) => le.definitionId === b), j = document.createElement("div");
      j.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${O ? "opacity-50" : ""}`, j.draggable = !O, j.dataset.definitionId = b, j.dataset.fieldType = k, j.dataset.participantId = T, j.dataset.participantName = D, j.dataset.page = String(P), I && (j.dataset.linkGroupId = I);
      const W = document.createElement("span");
      W.className = `w-3 h-3 rounded ${N.bg}`;
      const te = document.createElement("div");
      te.className = "flex-1 text-xs";
      const ce = document.createElement("div");
      ce.className = "font-medium capitalize", ce.textContent = k.replace(/_/g, " ");
      const me = document.createElement("div");
      me.className = "text-gray-500", me.textContent = D;
      const we = document.createElement("span");
      we.className = `placement-status text-xs ${O ? "text-green-600" : "text-amber-600"}`, we.textContent = O ? "Placed" : "Not placed", te.appendChild(ce), te.appendChild(me), j.appendChild(W), j.appendChild(te), j.appendChild(we), j.addEventListener("dragstart", (le) => {
        if (O) {
          le.preventDefault();
          return;
        }
        le.dataTransfer.setData("application/json", JSON.stringify({
          definitionId: b,
          fieldType: k,
          participantId: T,
          participantName: D
        })), le.dataTransfer.effectAllowed = "copy", j.classList.add("opacity-50");
      }), j.addEventListener("dragend", () => {
        j.classList.remove("opacity-50");
      }), c.appendChild(j);
      const ie = p[w + 1];
      if (I && ie && ie.linkGroupId === I) {
        const le = Ui(b, !U);
        c.appendChild(le);
      }
    }), qi();
  }
  async function lt(c) {
    if (!C.pdfDoc) return;
    const a = document.getElementById("placement-pdf-canvas"), p = document.getElementById("placement-canvas-container"), h = a.getContext("2d"), w = await C.pdfDoc.getPage(c), b = w.getViewport({ scale: C.scale });
    a.width = b.width, a.height = b.height, p.style.width = `${b.width}px`, p.style.height = `${b.height}px`, await w.render({
      canvasContext: h,
      viewport: b
    }).promise, document.getElementById("placement-current-page").textContent = c, ht();
  }
  function $s(c, a) {
    const p = document.getElementById("placement-pdf-canvas");
    c.addEventListener("dragover", (h) => {
      h.preventDefault(), h.dataTransfer.dropEffect = "copy", p.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("dragleave", (h) => {
      p.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), c.addEventListener("drop", (h) => {
      h.preventDefault(), p.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const w = h.dataTransfer.getData("application/json");
      if (!w) return;
      const b = JSON.parse(w), k = p.getBoundingClientRect(), T = (h.clientX - k.left) / C.scale, D = (h.clientY - k.top) / C.scale;
      ji(b, T, D);
    });
  }
  function ji(c, a, p, h = {}) {
    const w = Un[c.fieldType] || Un.text, b = `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, k = h.placementSource || Ce.MANUAL, T = h.linkGroupId || vs(C.linkGroupState, c.definitionId)?.id, D = {
      id: b,
      definitionId: c.definitionId,
      type: c.fieldType,
      participantId: c.participantId,
      participantName: c.participantName,
      page: C.currentPage,
      x: Math.max(0, a - w.width / 2),
      y: Math.max(0, p - w.height / 2),
      width: w.width,
      height: w.height,
      placementSource: k,
      linkGroupId: T,
      linkedFromFieldId: h.linkedFromFieldId
    };
    C.fieldInstances.push(D), zi(c.definitionId), k === Ce.MANUAL && T && Hs(D), ht(), Sn(), Ge();
  }
  function zi(c, a = !1) {
    const p = document.querySelector(`.placement-field-item[data-definition-id="${c}"]`);
    if (p) {
      p.classList.add("opacity-50"), p.draggable = !1;
      const h = p.querySelector(".placement-status");
      h && (h.textContent = "Placed", h.classList.remove("text-amber-600"), h.classList.add("text-green-600")), a && p.classList.add("just-linked");
    }
  }
  function Bs(c) {
    const a = qr(
      C.linkGroupState,
      c
    );
    a && (C.linkGroupState = es(C.linkGroupState, a.updatedGroup));
  }
  function Oi(c) {
    const a = /* @__PURE__ */ new Map();
    document.querySelectorAll(".placement-field-item").forEach((b) => {
      const k = b.dataset.definitionId, T = b.dataset.page;
      if (k) {
        const D = C.linkGroupState.definitionToGroup.get(k);
        a.set(k, {
          type: b.dataset.fieldType || "text",
          participantId: b.dataset.participantId || "",
          participantName: b.dataset.participantName || "Unknown",
          page: T ? parseInt(T, 10) : 1,
          linkGroupId: D
        });
      }
    });
    let h = 0;
    const w = 10;
    for (; h < w; ) {
      const b = jr(
        C.linkGroupState,
        c,
        C.fieldInstances,
        a
      );
      if (!b || !b.newPlacement) break;
      C.fieldInstances.push(b.newPlacement), zi(b.newPlacement.definitionId, !0), h++;
    }
    h > 0 && (ht(), Sn(), Ge(), Fs(h));
  }
  function Fs(c) {
    const a = c === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${c} linked fields`;
    window.toastManager && window.toastManager.info(a);
    const p = document.createElement("div");
    p.setAttribute("role", "status"), p.setAttribute("aria-live", "polite"), p.className = "sr-only", p.textContent = a, document.body.appendChild(p), setTimeout(() => p.remove(), 1e3), Rs();
  }
  function Rs() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((a) => {
      a.classList.add("linked-flash"), setTimeout(() => {
        a.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function Hs(c) {
    Bs(c);
  }
  function ht() {
    const c = document.getElementById("placement-overlays-container");
    c.innerHTML = "", c.style.pointerEvents = "auto", C.fieldInstances.filter((a) => a.page === C.currentPage).forEach((a) => {
      const p = mt[a.type] || mt.text, h = C.selectedFieldId === a.id, w = a.placementSource === Ce.AUTO_LINKED, b = document.createElement("div"), k = w ? "border-dashed" : "border-solid";
      b.className = `field-overlay absolute cursor-move ${p.border} border-2 ${k} rounded`, b.style.cssText = `
          left: ${a.x * C.scale}px;
          top: ${a.y * C.scale}px;
          width: ${a.width * C.scale}px;
          height: ${a.height * C.scale}px;
          background-color: ${p.fill};
          ${h ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, b.dataset.instanceId = a.id;
      const T = document.createElement("div");
      if (T.className = "absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white " + p.bg, T.textContent = `${a.type.replace("_", " ")} - ${a.participantName}`, b.appendChild(T), w) {
        const I = document.createElement("div");
        I.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", I.title = "Auto-linked from template", I.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, b.appendChild(I);
      }
      const D = document.createElement("div");
      D.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", D.style.cssText = "transform: translate(50%, 50%);", b.appendChild(D);
      const P = document.createElement("button");
      P.type = "button", P.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", P.innerHTML = "×", P.addEventListener("click", (I) => {
        I.stopPropagation(), qs(a.id);
      }), b.appendChild(P), b.addEventListener("mousedown", (I) => {
        I.target === D ? Ns(I, a) : I.target !== P && Us(I, a, b);
      }), b.addEventListener("click", () => {
        C.selectedFieldId = a.id, ht();
      }), c.appendChild(b);
    });
  }
  function Us(c, a, p) {
    c.preventDefault(), C.isDragging = !0, C.selectedFieldId = a.id;
    const h = c.clientX, w = c.clientY, b = a.x * C.scale, k = a.y * C.scale;
    function T(P) {
      const I = P.clientX - h, U = P.clientY - w;
      a.x = Math.max(0, (b + I) / C.scale), a.y = Math.max(0, (k + U) / C.scale), a.placementSource = Ce.MANUAL, p.style.left = `${a.x * C.scale}px`, p.style.top = `${a.y * C.scale}px`;
    }
    function D() {
      C.isDragging = !1, document.removeEventListener("mousemove", T), document.removeEventListener("mouseup", D), Ge();
    }
    document.addEventListener("mousemove", T), document.addEventListener("mouseup", D);
  }
  function Ns(c, a) {
    c.preventDefault(), c.stopPropagation(), C.isResizing = !0;
    const p = c.clientX, h = c.clientY, w = a.width, b = a.height;
    function k(D) {
      const P = (D.clientX - p) / C.scale, I = (D.clientY - h) / C.scale;
      a.width = Math.max(30, w + P), a.height = Math.max(20, b + I), a.placementSource = Ce.MANUAL, ht();
    }
    function T() {
      C.isResizing = !1, document.removeEventListener("mousemove", k), document.removeEventListener("mouseup", T), Ge();
    }
    document.addEventListener("mousemove", k), document.addEventListener("mouseup", T);
  }
  function qs(c) {
    const a = C.fieldInstances.find((h) => h.id === c);
    if (!a) return;
    C.fieldInstances = C.fieldInstances.filter((h) => h.id !== c);
    const p = document.querySelector(`.placement-field-item[data-definition-id="${a.definitionId}"]`);
    if (p) {
      p.classList.remove("opacity-50"), p.draggable = !0;
      const h = p.querySelector(".placement-status");
      h && (h.textContent = "Not placed", h.classList.remove("text-green-600"), h.classList.add("text-amber-600"));
    }
    ht(), Sn(), Ge();
  }
  function js() {
    const c = document.getElementById("placement-prev-page"), a = document.getElementById("placement-next-page");
    c.addEventListener("click", async () => {
      C.currentPage > 1 && (C.currentPage--, Oi(C.currentPage), await lt(C.currentPage));
    }), a.addEventListener("click", async () => {
      C.currentPage < C.totalPages && (C.currentPage++, Oi(C.currentPage), await lt(C.currentPage));
    });
  }
  function zs() {
    const c = document.getElementById("placement-zoom-in"), a = document.getElementById("placement-zoom-out"), p = document.getElementById("placement-zoom-fit"), h = document.getElementById("placement-zoom-level");
    c.addEventListener("click", async () => {
      C.scale = Math.min(3, C.scale + 0.25), h.textContent = `${Math.round(C.scale * 100)}%`, await lt(C.currentPage);
    }), a.addEventListener("click", async () => {
      C.scale = Math.max(0.5, C.scale - 0.25), h.textContent = `${Math.round(C.scale * 100)}%`, await lt(C.currentPage);
    }), p.addEventListener("click", async () => {
      const w = document.getElementById("placement-viewer"), k = (await C.pdfDoc.getPage(C.currentPage)).getViewport({ scale: 1 });
      C.scale = (w.clientWidth - 40) / k.width, h.textContent = `${Math.round(C.scale * 100)}%`, await lt(C.currentPage);
    });
  }
  function Sn() {
    const c = Array.from(document.querySelectorAll(".placement-field-item")), a = c.length, p = new Set(
      c.map((k) => String(k.dataset.definitionId || "").trim()).filter((k) => k)
    ), h = /* @__PURE__ */ new Set();
    C.fieldInstances.forEach((k) => {
      const T = String(k.definitionId || "").trim();
      p.has(T) && h.add(T);
    });
    const w = h.size, b = Math.max(0, a - w);
    document.getElementById("placement-total-fields").textContent = a, document.getElementById("placement-placed-count").textContent = w, document.getElementById("placement-unplaced-count").textContent = b;
  }
  function Ge() {
    const c = document.getElementById("field-instances-container");
    c.innerHTML = "";
    const a = C.fieldInstances.map((p, h) => rs(p, h));
    Yt && (Yt.value = JSON.stringify(a));
  }
  Ge();
  let $e = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  const Dt = document.getElementById("auto-place-btn");
  Dt && Dt.addEventListener("click", async () => {
    if ($e.isRunning) return;
    if (document.querySelectorAll(".placement-field-item:not(.opacity-50)").length === 0) {
      Qt("All fields are already placed", "info");
      return;
    }
    const a = document.querySelector('input[name="id"]')?.value;
    if (!a) {
      gi();
      return;
    }
    $e.isRunning = !0, Dt.disabled = !0, Dt.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
      `;
    try {
      const p = await fetch(`${l}/esign/agreements/${a}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: Os()
        })
      });
      if (!p.ok)
        throw await wn(p, "Auto-placement failed");
      const h = await p.json(), w = h && typeof h == "object" && h.run && typeof h.run == "object" ? h.run : h;
      $e.currentRunId = w?.run_id || w?.id || null, $e.suggestions = w?.suggestions || [], $e.resolverScores = w?.resolver_scores || [], $e.suggestions.length === 0 ? (Qt("No placement suggestions found. Try placing fields manually.", "warning"), gi()) : Gs(h);
    } catch (p) {
      console.error("Auto-place error:", p);
      const h = vn(p?.message || "Auto-placement failed", p?.code || "", p?.status || 0);
      Qt(`Auto-placement failed: ${h}`, "error"), gi();
    } finally {
      $e.isRunning = !1, Dt.disabled = !1, Dt.innerHTML = `
          <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Auto-place
        `;
    }
  });
  function Os() {
    return document.getElementById("placement-policy-preset")?.value || "balanced";
  }
  function gi() {
    const c = document.querySelectorAll(".placement-field-item:not(.opacity-50)");
    let a = 100;
    c.forEach((p) => {
      const h = {
        definitionId: p.dataset.definitionId,
        fieldType: p.dataset.fieldType,
        participantId: p.dataset.participantId,
        participantName: p.dataset.participantName
      }, w = Un[h.fieldType] || Un.text;
      C.currentPage = C.totalPages, ji(h, 300, a + w.height / 2, { placementSource: Ce.AUTO_FALLBACK }), a += w.height + 20;
    }), C.pdfDoc && lt(C.totalPages), Qt("Fields placed using fallback layout", "info");
  }
  function Gs(c) {
    let a = document.getElementById("placement-suggestions-modal");
    a || (a = Vs(), document.body.appendChild(a));
    const p = a.querySelector("#suggestions-list"), h = a.querySelector("#resolver-info"), w = a.querySelector("#run-stats");
    h.innerHTML = $e.resolverScores.map((b) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${oe(String(b?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${b.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${Qs(b.score)}">
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
    `, p.innerHTML = $e.suggestions.map((b, k) => {
      const T = Gi(b.field_definition_id), D = mt[T?.type] || mt.text, P = oe(String(T?.type || "field").replace(/_/g, " ")), I = oe(String(b?.id || "")), U = Math.max(1, Number(b?.page_number || 1)), N = Math.round(Number(b?.x || 0)), O = Math.round(Number(b?.y || 0)), j = Math.max(0, Number(b?.confidence || 0)), W = oe(Zs(String(b?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${k}" data-suggestion-id="${I}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${D.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${P}</div>
                <div class="text-xs text-gray-500">Page ${U}, (${N}, ${O})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${Xs(b.confidence)}">
                ${(j * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${W}
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
    }).join(""), Ws(a), a.classList.remove("hidden");
  }
  function Vs() {
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
      Ys(), c.classList.add("hidden");
    }), c.querySelector("#rerun-placement-btn").addEventListener("click", () => {
      c.classList.add("hidden");
      const a = c.querySelector("#placement-policy-preset-modal"), p = document.getElementById("placement-policy-preset");
      p && a && (p.value = a.value), Dt?.click();
    }), c;
  }
  function Ws(c) {
    c.querySelectorAll(".accept-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const p = a.closest(".suggestion-item");
        p.classList.add("border-green-500", "bg-green-50"), p.classList.remove("border-red-500", "bg-red-50"), p.dataset.accepted = "true";
      });
    }), c.querySelectorAll(".reject-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const p = a.closest(".suggestion-item");
        p.classList.add("border-red-500", "bg-red-50"), p.classList.remove("border-green-500", "bg-green-50"), p.dataset.accepted = "false";
      });
    }), c.querySelectorAll(".preview-suggestion-btn").forEach((a) => {
      a.addEventListener("click", () => {
        const p = parseInt(a.dataset.index, 10), h = $e.suggestions[p];
        h && Js(h);
      });
    });
  }
  function Js(c) {
    c.page_number !== C.currentPage && (C.currentPage = c.page_number, lt(c.page_number));
    const a = document.getElementById("placement-overlays-container"), p = document.getElementById("suggestion-preview-overlay");
    p && p.remove();
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
  function Ys() {
    const a = document.getElementById("placement-suggestions-modal").querySelectorAll('.suggestion-item[data-accepted="true"]');
    a.forEach((p) => {
      const h = parseInt(p.dataset.index, 10), w = $e.suggestions[h];
      if (!w) return;
      const b = Gi(w.field_definition_id);
      if (!b) return;
      const k = document.querySelector(`.placement-field-item[data-definition-id="${w.field_definition_id}"]`);
      if (!k || k.classList.contains("opacity-50")) return;
      const T = {
        definitionId: w.field_definition_id,
        fieldType: b.type,
        participantId: b.participant_id,
        participantName: k.dataset.participantName
      };
      C.currentPage = w.page_number, Ks(T, w);
    }), C.pdfDoc && lt(C.currentPage), er(a.length, $e.suggestions.length - a.length), Qt(`Applied ${a.length} placement${a.length !== 1 ? "s" : ""}`, "success");
  }
  function Ks(c, a) {
    const p = {
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
      placementSource: Ce.AUTO,
      resolverId: a.resolver_id,
      confidence: a.confidence,
      placementRunId: $e.currentRunId
    };
    C.fieldInstances.push(p);
    const h = document.querySelector(`.placement-field-item[data-definition-id="${c.definitionId}"]`);
    if (h) {
      h.classList.add("opacity-50"), h.draggable = !1;
      const w = h.querySelector(".placement-status");
      w && (w.textContent = "Placed", w.classList.remove("text-amber-600"), w.classList.add("text-green-600"));
    }
    ht(), Sn(), Ge();
  }
  function Gi(c) {
    const a = document.querySelector(`.field-definition-entry[data-field-definition-id="${c}"]`);
    return a ? {
      id: c,
      type: a.querySelector(".field-type-select")?.value || "text",
      participant_id: a.querySelector(".field-participant-select")?.value || ""
    } : null;
  }
  function Xs(c) {
    return c >= 0.9 ? "bg-green-100 text-green-800" : c >= 0.7 ? "bg-blue-100 text-blue-800" : c >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function Qs(c) {
    return c >= 0.8 ? "bg-green-100 text-green-800" : c >= 0.6 ? "bg-blue-100 text-blue-800" : c >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function Zs(c) {
    return c ? c.split("_").map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(" ") : "Unknown";
  }
  async function er(c, a) {
  }
  function Qt(c, a = "info") {
    const p = document.createElement("div");
    p.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${a === "success" ? "bg-green-600 text-white" : a === "error" ? "bg-red-600 text-white" : a === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, p.textContent = c, document.body.appendChild(p), setTimeout(() => {
      p.style.opacity = "0", setTimeout(() => p.remove(), 300);
    }, 3e3);
  }
  function tr() {
    const c = document.getElementById("send-readiness-loading"), a = document.getElementById("send-readiness-results"), p = document.getElementById("send-validation-status"), h = document.getElementById("send-validation-issues"), w = document.getElementById("send-issues-list"), b = document.getElementById("send-confirmation"), k = document.getElementById("review-agreement-title"), T = document.getElementById("review-document-title"), D = document.getElementById("review-participant-count"), P = document.getElementById("review-stage-count"), I = document.getElementById("review-participants-list"), U = document.getElementById("review-fields-summary"), N = document.getElementById("title").value || "Untitled", O = Ze.textContent || "No document", j = _e.querySelectorAll(".participant-entry"), W = Le.querySelectorAll(".field-definition-entry"), te = V(pe(), q()), ce = x(), me = /* @__PURE__ */ new Set();
    j.forEach((Q) => {
      const se = Q.querySelector(".signing-stage-input");
      Q.querySelector('select[name*=".role"]').value === "signer" && se?.value && me.add(parseInt(se.value, 10));
    }), k.textContent = N, T.textContent = O, D.textContent = `${j.length} (${ce.length} signers)`, P.textContent = me.size > 0 ? me.size : "1", I.innerHTML = "", j.forEach((Q) => {
      const se = Q.querySelector('input[name*=".name"]'), Zt = Q.querySelector('input[name*=".email"]'), ft = Q.querySelector('select[name*=".role"]'), en = Q.querySelector(".signing-stage-input"), tn = Q.querySelector(".notify-input"), Mt = document.createElement("div");
      Mt.className = "flex items-center justify-between text-sm", Mt.innerHTML = `
        <div>
          <span class="font-medium">${oe(se.value || Zt.value)}</span>
          <span class="text-gray-500 ml-2">${oe(Zt.value)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${ft.value === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${ft.value === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${tn?.checked !== !1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${tn?.checked !== !1 ? "Notify" : "No Notify"}
          </span>
          ${ft.value === "signer" && en?.value ? `<span class="text-xs text-gray-500">Stage ${en.value}</span>` : ""}
        </div>
      `, I.appendChild(Mt);
    });
    const we = W.length + te.length;
    U.textContent = `${we} field${we !== 1 ? "s" : ""} defined (${W.length} manual, ${te.length} generated)`;
    const ie = [];
    be.value || ie.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), ce.length === 0 && ie.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), li().forEach((Q) => {
      ie.push({
        severity: "error",
        message: `${Q.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Ke = Array.from(me).sort((Q, se) => Q - se);
    for (let Q = 0; Q < Ke.length; Q++)
      if (Ke[Q] !== Q + 1) {
        ie.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const hi = ie.some((Q) => Q.severity === "error"), fi = ie.some((Q) => Q.severity === "warning");
    hi ? (p.className = "p-4 rounded-lg bg-red-50 border border-red-200", p.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, b.classList.add("hidden"), Ue.disabled = !0) : fi ? (p.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", p.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, b.classList.remove("hidden"), Ue.disabled = !1) : (p.className = "p-4 rounded-lg bg-green-50 border border-green-200", p.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, b.classList.remove("hidden"), Ue.disabled = !1), ie.length > 0 ? (h.classList.remove("hidden"), w.innerHTML = "", ie.forEach((Q) => {
      const se = document.createElement("li");
      se.className = `p-3 rounded-lg flex items-center justify-between ${Q.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, se.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Q.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Q.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${oe(Q.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Q.step}">
            ${oe(Q.action)}
          </button>
        `, w.appendChild(se);
    }), w.querySelectorAll("[data-go-to-step]").forEach((Q) => {
      Q.addEventListener("click", () => {
        const se = Number(Q.getAttribute("data-go-to-step"));
        Number.isFinite(se) && bn(se);
      });
    })) : h.classList.add("hidden"), c.classList.add("hidden"), a.classList.remove("hidden");
  }
  let mi = null;
  function Ye() {
    mi && clearTimeout(mi), mi = setTimeout(() => {
      Bt();
    }, 500);
  }
  be && new MutationObserver(() => {
    Bt();
  }).observe(be, { attributes: !0, attributeFilter: ["value"] });
  const nr = document.getElementById("title"), ir = document.getElementById("message");
  nr?.addEventListener("input", Ye), ir?.addEventListener("input", Ye), _e.addEventListener("input", Ye), _e.addEventListener("change", Ye), Le.addEventListener("input", Ye), Le.addEventListener("change", Ye), de?.addEventListener("input", Ye), de?.addEventListener("change", Ye);
  const sr = Ge;
  Ge = function() {
    sr(), Bt();
  };
  function rr() {
    const c = Y.getState();
    !c.participants || c.participants.length === 0 || (_e.innerHTML = "", mn = 0, c.participants.forEach((a) => {
      Ot({
        id: a.tempId,
        name: a.name,
        email: a.email,
        role: a.role,
        notify: a.notify !== !1,
        signing_stage: a.signingStage
      });
    }));
  }
  function ar() {
    const c = Y.getState();
    !c.fieldDefinitions || c.fieldDefinitions.length === 0 || (Le.innerHTML = "", d = 0, c.fieldDefinitions.forEach((a) => {
      Kt({
        id: a.tempId,
        type: a.type,
        participant_id: a.participantTempId,
        page: a.page,
        required: a.required
      });
    }), Xt());
  }
  function or() {
    const c = Y.getState();
    !Array.isArray(c.fieldRules) || c.fieldRules.length === 0 || de && (de.querySelectorAll(".field-rule-entry").forEach((a) => a.remove()), g = 0, c.fieldRules.forEach((a) => {
      Hn({
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
    }), X(), ee());
  }
  function cr() {
    const c = Y.getState();
    !Array.isArray(c.fieldPlacements) || c.fieldPlacements.length === 0 || (C.fieldInstances = c.fieldPlacements.map((a, p) => On(a, p)), Ge());
  }
  if (window._resumeToStep) {
    rr(), ar(), or(), K(), cr();
    const c = Y.getState();
    c.document?.id && xt.setDocument(c.document.id, c.document.title, c.document.pageCount), ge = window._resumeToStep, ui(), delete window._resumeToStep;
  } else if (ui(), be.value) {
    const c = Ze?.textContent || null, a = he(Fe.value, null);
    xt.setDocument(be.value, c, a);
  }
  o && document.getElementById("sync-status-indicator")?.classList.add("hidden");
}
function Kr(i) {
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
class xs {
  constructor(e) {
    this.initialized = !1, this.config = Kr(e);
  }
  init() {
    this.initialized || (this.initialized = !0, Yr(this.config));
  }
  destroy() {
    this.initialized = !1;
  }
}
function uo(i) {
  const e = new xs(i);
  return ne(() => e.init()), e;
}
function Xr(i) {
  const e = new xs({
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
      Xr({
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
const Qr = "esign.signer.profile.v1", as = "esign.signer.profile.outbox.v1", ki = 90, os = 500 * 1024;
class Zr {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : ki;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Qr}:${e}`;
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
class ea {
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
class Si {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(as);
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
      window.localStorage.setItem(as, JSON.stringify(e));
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
function ta(i) {
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
      ttlDays: Number(i.profile?.ttlDays || ki) || ki,
      persistDrawnSignature: !!i.profile?.persistDrawnSignature,
      endpointBasePath: String(i.profile?.endpointBasePath || String(i.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function na(i) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = i.recipientEmail ? i.recipientEmail.trim().toLowerCase() : i.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function xi(i) {
  const e = String(i || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function ia(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function Be(i) {
  const e = String(i || "").trim();
  return ia(e) ? "" : e;
}
function sa(i) {
  const e = new Zr(i.profile.ttlDays), t = new ea(i.profile.endpointBasePath, i.token);
  return i.profile.mode === "local_only" ? new Si("local_only", e, null) : i.profile.mode === "remote_only" ? new Si("remote_only", e, t) : new Si("hybrid", e, t);
}
function ra() {
  const i = window;
  i.pdfjsLib && i.pdfjsLib.GlobalWorkerOptions && (i.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function aa(i) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = ta(i), s = na(n), l = sa(n);
  ra();
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
      const g = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...d
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
    trackViewerLoad(r, d, g = null) {
      this.metrics.viewerLoadTime = d, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: d,
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
    trackFieldSave(r, d, g, f, y = null) {
      this.metrics.fieldSaveLatencies.push(f), g ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: y }), this.track(g ? "field_save_success" : "field_save_failed", {
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
    trackSignatureAttach(r, d, g, f, y = null) {
      this.metrics.signatureAttachLatencies.push(f), this.track(g ? "signature_attach_success" : "signature_attach_failed", {
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
      return r.length ? Math.round(r.reduce((d, g) => d + g, 0) / r.length) : 0;
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
      o.overlayRenderFrameID = 0, He();
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
  function _(r, d) {
    const g = o.fieldState.get(r);
    if (!g) return;
    const f = Be(String(d || ""));
    if (!f) {
      delete g.previewValueText;
      return;
    }
    g.previewValueText = f, delete g.previewValueBool, delete g.previewSignatureUrl;
  }
  function H(r, d) {
    const g = o.fieldState.get(r);
    g && (g.previewValueBool = !!d, delete g.previewValueText, delete g.previewSignatureUrl);
  }
  function F(r, d) {
    const g = o.fieldState.get(r);
    if (!g) return;
    const f = String(d || "").trim();
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
      const d = n.viewer.pages?.find((f) => f.page === r);
      if (d)
        return {
          width: d.width,
          height: d.height,
          rotation: d.rotation || 0
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
      const g = r.page, f = this.getPageMetadata(g), y = d.offsetWidth, x = d.offsetHeight, L = r.pageWidth || f.width, M = r.pageHeight || f.height, R = y / L, K = x / M;
      let q = r.posX || 0, X = r.posY || 0;
      n.viewer.origin === "bottom-left" && (X = M - X - (r.height || 30));
      const pe = q * R, De = X * K, V = (r.width || 150) * R, ee = (r.height || 30) * K;
      return {
        left: pe,
        top: De,
        width: V,
        height: ee,
        // Store original values for debugging
        _debug: {
          sourceX: q,
          sourceY: X,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: L,
          pageHeight: M,
          scaleX: R,
          scaleY: K,
          zoom: o.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, d) {
      const g = this.pageToScreen(r, d);
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
    async requestUploadBootstrap(r, d, g, f) {
      const y = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: d,
            content_type: g,
            size_bytes: f
          })
        }
      );
      if (!y.ok)
        throw await ot(y, "Failed to get upload contract");
      const x = await y.json(), L = x?.contract || x;
      if (!L || typeof L != "object" || !L.upload_url)
        throw new Error("Invalid upload contract response");
      return L;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, d) {
      const g = new URL(r.upload_url, window.location.origin);
      r.upload_token && g.searchParams.set("upload_token", String(r.upload_token)), r.object_key && g.searchParams.set("object_key", String(r.object_key));
      const f = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([x, L]) => {
        const M = String(x).toLowerCase();
        M === "x-esign-upload-token" || M === "x-esign-upload-key" || (f[x] = String(L));
      });
      const y = await fetch(g.toString(), {
        method: r.method || "PUT",
        headers: f,
        body: d,
        credentials: "omit"
      });
      if (!y.ok)
        throw await ot(y, `Upload failed: ${y.status} ${y.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [d, g] = r.split(","), f = d.match(/data:([^;]+)/), y = f ? f[1] : "image/png", x = atob(g), L = new Uint8Array(x.length);
      for (let M = 0; M < x.length; M++)
        L[M] = x.charCodeAt(M);
      return new Blob([L], { type: y });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, d) {
      const g = this.dataUrlToBlob(d), f = g.size, y = "image/png", x = await Kn(g), L = await this.requestUploadBootstrap(
        r,
        x,
        y,
        f
      );
      return await this.uploadToSignedUrl(L, g), {
        uploadToken: L.upload_token,
        objectKey: L.object_key,
        sha256: L.sha256,
        contentType: L.content_type
      };
    }
  }, J = {
    endpoint(r, d = "") {
      const g = encodeURIComponent(r), f = d ? `/${encodeURIComponent(d)}` : "";
      return `${n.apiBasePath}/signatures/${g}${f}`;
    },
    async list(r) {
      const d = new URL(this.endpoint(n.token), window.location.origin);
      d.searchParams.set("type", r);
      const g = await fetch(d.toString(), {
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
    async save(r, d, g = "") {
      const f = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: g,
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
        const g = await d.json().catch(() => ({}));
        throw new Error(g?.error?.message || "Failed to delete signature");
      }
    }
  };
  function Z(r) {
    const d = o.fieldState.get(r);
    return d && d.type === "initials" ? "initials" : "signature";
  }
  function ae(r) {
    return o.savedSignaturesByType.get(r) || [];
  }
  async function fe(r, d = !1) {
    const g = Z(r);
    if (!d && o.savedSignaturesByType.has(g)) {
      ue(r);
      return;
    }
    const f = await J.list(g);
    o.savedSignaturesByType.set(g, f), ue(r);
  }
  function ue(r) {
    const d = Z(r), g = ae(d), f = document.getElementById("sig-saved-list");
    if (f) {
      if (!g.length) {
        f.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      f.innerHTML = g.map((y) => {
        const x = Xe(String(y?.thumbnail_data_url || y?.data_url || "")), L = Xe(String(y?.label || "Saved signature")), M = Xe(String(y?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${x}" alt="${L}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${L}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${Xe(r)}" data-signature-id="${M}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${Xe(r)}" data-signature-id="${M}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Pe(r) {
    const d = o.signatureCanvases.get(r), g = Z(r);
    if (!d || !ze(r))
      throw new Error(`Please add your ${g === "initials" ? "initials" : "signature"} first`);
    const f = d.canvas.toDataURL("image/png"), y = await J.save(g, f, g === "initials" ? "Initials" : "Signature");
    if (!y)
      throw new Error("Failed to save signature");
    const x = ae(g);
    x.unshift(y), o.savedSignaturesByType.set(g, x), ue(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function wt(r, d) {
    const g = Z(r), y = ae(g).find((L) => String(L?.id || "") === String(d));
    if (!y) return;
    requestAnimationFrame(() => Tt(r)), await Ve(r);
    const x = String(y.data_url || y.thumbnail_data_url || "").trim();
    x && (await pt(r, x, { clearStrokes: !0 }), F(r, x), S(), At("draw", r), ye("Saved signature selected."));
  }
  async function qe(r, d) {
    const g = Z(r);
    await J.delete(d);
    const f = ae(g).filter((y) => String(y?.id || "") !== String(d));
    o.savedSignaturesByType.set(g, f), ue(r);
  }
  function je(r) {
    const d = String(r?.code || "").trim(), g = String(r?.message || "Unable to update saved signatures"), f = d === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : g;
    window.toastManager && window.toastManager.error(f), ye(f, "assertive");
  }
  async function Ve(r, d = 8) {
    for (let g = 0; g < d; g++) {
      if (o.signatureCanvases.has(r)) return !0;
      await new Promise((f) => setTimeout(f, 40)), Tt(r);
    }
    return !1;
  }
  async function dt(r, d) {
    const g = String(d?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(g))
      throw new Error("Only PNG and JPEG images are supported");
    if (d.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => Tt(r)), await Ve(r);
    const f = o.signatureCanvases.get(r);
    if (!f)
      throw new Error("Signature canvas is not ready");
    const y = await Ae(d), x = g === "image/png" ? y : await bt(y, f.drawWidth, f.drawHeight);
    if (rn(x) > os)
      throw new Error(`Image exceeds ${Math.round(os / 1024)}KB limit after conversion`);
    await pt(r, x, { clearStrokes: !0 }), F(r, x), S();
    const M = document.getElementById("sig-upload-preview-wrap"), R = document.getElementById("sig-upload-preview");
    M && M.classList.remove("hidden"), R && R.setAttribute("src", x), ye("Signature image uploaded. You can now insert it.");
  }
  function Ae(r) {
    return new Promise((d, g) => {
      const f = new FileReader();
      f.onload = () => d(String(f.result || "")), f.onerror = () => g(new Error("Unable to read image file")), f.readAsDataURL(r);
    });
  }
  function rn(r) {
    const d = String(r || "").split(",");
    if (d.length < 2) return 0;
    const g = d[1] || "", f = (g.match(/=+$/) || [""])[0].length;
    return Math.floor(g.length * 3 / 4) - f;
  }
  async function bt(r, d, g) {
    return await new Promise((f, y) => {
      const x = new Image();
      x.onload = () => {
        const L = document.createElement("canvas"), M = Math.max(1, Math.round(Number(d) || 600)), R = Math.max(1, Math.round(Number(g) || 160));
        L.width = M, L.height = R;
        const K = L.getContext("2d");
        if (!K) {
          y(new Error("Unable to process image"));
          return;
        }
        K.clearRect(0, 0, M, R);
        const q = Math.min(M / x.width, R / x.height), X = x.width * q, pe = x.height * q, De = (M - X) / 2, V = (R - pe) / 2;
        K.drawImage(x, De, V, X, pe), f(L.toDataURL("image/png"));
      }, x.onerror = () => y(new Error("Unable to decode image file")), x.src = r;
    });
  }
  async function Kn(r) {
    if (window.crypto && window.crypto.subtle) {
      const d = await r.arrayBuffer(), g = await window.crypto.subtle.digest("SHA-256", d);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function Y() {
    document.addEventListener("click", (r) => {
      const d = r.target;
      if (!(d instanceof Element)) return;
      const g = d.closest("[data-esign-action]");
      if (!g) return;
      switch (g.getAttribute("data-esign-action")) {
        case "prev-page":
          Rt();
          break;
        case "next-page":
          Ht();
          break;
        case "zoom-out":
          Zn();
          break;
        case "zoom-in":
          un();
          break;
        case "fit-width":
          ei();
          break;
        case "download-document":
          Rn();
          break;
        case "show-consent-modal":
          mn();
          break;
        case "activate-field": {
          const y = g.getAttribute("data-field-id");
          y && Pt(y);
          break;
        }
        case "submit-signature":
          Le();
          break;
        case "show-decline-modal":
          oi();
          break;
        case "close-field-editor":
          z();
          break;
        case "save-field-editor":
          si();
          break;
        case "hide-consent-modal":
          hn();
          break;
        case "accept-consent":
          Ot();
          break;
        case "hide-decline-modal":
          Gt();
          break;
        case "confirm-decline":
          Fn();
          break;
        case "retry-load-pdf":
          xe();
          break;
        case "signature-tab": {
          const y = g.getAttribute("data-tab") || "draw", x = g.getAttribute("data-field-id");
          x && At(y, x);
          break;
        }
        case "clear-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && _n(y);
          break;
        }
        case "undo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && qt(y);
          break;
        }
        case "redo-signature-canvas": {
          const y = g.getAttribute("data-field-id");
          y && ni(y);
          break;
        }
        case "save-current-signature-library": {
          const y = g.getAttribute("data-field-id");
          y && Pe(y).catch(je);
          break;
        }
        case "select-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && wt(y, x).catch(je);
          break;
        }
        case "delete-saved-signature": {
          const y = g.getAttribute("data-field-id"), x = g.getAttribute("data-signature-id");
          y && x && qe(y, x).catch(je);
          break;
        }
        case "clear-signer-profile":
          Qe().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          de.togglePanel();
          break;
        case "debug-copy-session":
          de.copySessionInfo();
          break;
        case "debug-clear-cache":
          de.clearCache();
          break;
        case "debug-show-telemetry":
          de.showTelemetry();
          break;
        case "debug-reload-viewer":
          de.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const d = r.target;
      if (d instanceof HTMLInputElement) {
        if (d.matches("#sig-upload-input")) {
          const g = d.getAttribute("data-field-id"), f = d.files?.[0];
          if (!g || !f) return;
          dt(g, f).catch((y) => {
            window.toastManager && window.toastManager.error(y?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (d.matches("#field-checkbox-input")) {
          const g = d.getAttribute("data-field-id") || o.activeFieldId;
          if (!g) return;
          H(g, d.checked), S();
        }
      }
    }), document.addEventListener("input", (r) => {
      const d = r.target;
      if (!(d instanceof HTMLInputElement) && !(d instanceof HTMLTextAreaElement)) return;
      const g = d.getAttribute("data-field-id") || o.activeFieldId;
      if (g) {
        if (d.matches("#sig-type-input")) {
          oe(g, d.value || "", { syncOverlay: !0 });
          return;
        }
        if (d.matches("#field-text-input")) {
          _(g, d.value || ""), S();
          return;
        }
        d.matches("#field-checkbox-input") && d instanceof HTMLInputElement && (H(g, d.checked), S());
      }
    });
  }
  ne(async () => {
    Y(), o.isLowMemory = et(), on(), Xn(), await Bt(), Qn(), Ze(), Bn(), Oe(), await xe(), He(), document.addEventListener("visibilitychange", St), "memory" in navigator && xt(), de.init();
  });
  function St() {
    document.hidden && Ee();
  }
  function Ee() {
    const r = o.isLowMemory ? 1 : 2;
    for (; o.renderedPages.size > r; ) {
      let d = null, g = 1 / 0;
      if (o.renderedPages.forEach((f, y) => {
        y !== o.currentPage && f.timestamp < g && (d = y, g = f.timestamp);
      }), d !== null)
        o.renderedPages.delete(d);
      else
        break;
    }
  }
  function xt() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, d = navigator.memory.totalJSHeapSize;
        r / d > 0.8 && (o.isLowMemory = !0, Ee());
      }
    }, 3e4);
  }
  function an(r) {
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
  function on() {
    const r = document.getElementById("pdf-compatibility-banner"), d = document.getElementById("pdf-compatibility-message"), g = document.getElementById("pdf-compatibility-title");
    if (!r || !d || !g) return;
    const f = String(n.viewer.compatibilityTier || "").trim().toLowerCase(), y = String(n.viewer.compatibilityReason || "").trim().toLowerCase();
    if (f !== "limited") {
      r.classList.add("hidden");
      return;
    }
    g.textContent = "Preview Compatibility Notice", d.textContent = String(n.viewer.compatibilityMessage || "").trim() || an(y), r.classList.remove("hidden"), u.trackDegradedMode("pdf_preview_compatibility", { tier: f, reason: y });
  }
  function Xn() {
    const r = document.getElementById("stage-state-banner"), d = document.getElementById("stage-state-icon"), g = document.getElementById("stage-state-title"), f = document.getElementById("stage-state-message"), y = document.getElementById("stage-state-meta");
    if (!r || !d || !g || !f || !y) return;
    const x = n.signerState || "active", L = n.recipientStage || 1, M = n.activeStage || 1, R = n.activeRecipientIds || [], K = n.waitingForRecipientIds || [];
    let q = {
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
        q = {
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
        }, K.length > 0 && q.badges.push({
          icon: "iconoir-group",
          text: `${K.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        q = {
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
        q = {
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
        R.length > 1 ? (q.message = `You and ${R.length - 1} other signer(s) can sign now.`, q.badges = [
          { icon: "iconoir-users", text: `Stage ${M} active`, variant: "green" }
        ]) : L > 1 ? q.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${L}`, variant: "green" }
        ] : q.hidden = !0;
        break;
    }
    if (q.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${q.bgClass} ${q.borderClass}`, d.className = `${q.iconClass} mt-0.5`, g.className = `text-sm font-semibold ${q.titleClass}`, g.textContent = q.title, f.className = `text-xs ${q.messageClass} mt-1`, f.textContent = q.message, y.innerHTML = "", q.badges.forEach((X) => {
      const pe = document.createElement("span"), De = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      pe.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${De[X.variant] || De.blue}`, pe.innerHTML = `<i class="${X.icon} mr-1"></i>${X.text}`, y.appendChild(pe);
    });
  }
  function Qn() {
    n.fields.forEach((r) => {
      let d = null, g = !1;
      if (r.type === "checkbox")
        d = r.value_bool || !1, g = d;
      else if (r.type === "date_signed")
        d = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], g = !0;
      else {
        const f = String(r.value_text || "");
        d = f || be(r), g = !!f;
      }
      o.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: d,
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
  async function Bt() {
    try {
      const r = await l.load(o.profileKey);
      r && (o.profileData = r, o.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function be(r) {
    const d = o.profileData;
    if (!d) return "";
    const g = String(r?.type || "").trim();
    return g === "name" ? Be(d.fullName || "") : g === "initials" ? Be(d.initials || "") || xi(d.fullName || n.recipientName || "") : g === "signature" ? Be(d.typedSignature || "") : "";
  }
  function It(r) {
    return !n.profile.persistDrawnSignature || !o.profileData ? "" : r?.type === "initials" && String(o.profileData.drawnInitialsDataUrl || "").trim() || String(o.profileData.drawnSignatureDataUrl || "").trim();
  }
  function Et(r) {
    const d = Be(r?.value || "");
    return d || (o.profileData ? r?.type === "initials" ? Be(o.profileData.initials || "") || xi(o.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? Be(o.profileData.typedSignature || "") : "" : "");
  }
  function Se() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : o.profileRemember;
  }
  async function Qe(r = !1) {
    let d = null;
    try {
      await l.clear(o.profileKey);
    } catch (g) {
      d = g;
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
  async function cn(r, d = {}) {
    const g = Se();
    if (o.profileRemember = g, !g) {
      await Qe(!0);
      return;
    }
    if (!r) return;
    const f = {
      remember: !0
    }, y = String(r.type || "");
    if (y === "name" && typeof r.value == "string") {
      const x = Be(r.value);
      x && (f.fullName = x, (o.profileData?.initials || "").trim() || (f.initials = xi(x)));
    }
    if (y === "initials") {
      if (d.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof d.signatureDataUrl == "string")
        f.drawnInitialsDataUrl = d.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Be(r.value);
        x && (f.initials = x);
      }
    }
    if (y === "signature") {
      if (d.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof d.signatureDataUrl == "string")
        f.drawnSignatureDataUrl = d.signatureDataUrl;
      else if (typeof r.value == "string") {
        const x = Be(r.value);
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
  function Ze() {
    const r = document.getElementById("consent-checkbox"), d = document.getElementById("consent-accept-btn");
    r && d && r.addEventListener("change", function() {
      d.disabled = !this.checked;
    });
  }
  function et() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Fe() {
    const r = o.isLowMemory ? 3 : o.maxCachedPages;
    if (o.renderedPages.size <= r) return;
    const d = [];
    for (o.renderedPages.forEach((g, f) => {
      const y = Math.abs(f - o.currentPage);
      d.push({ pageNum: f, distance: y });
    }), d.sort((g, f) => f.distance - g.distance); o.renderedPages.size > r && d.length > 0; ) {
      const g = d.shift();
      g && g.pageNum !== o.currentPage && o.renderedPages.delete(g.pageNum);
    }
  }
  function Lt(r) {
    if (o.isLowMemory) return;
    const d = [];
    r > 1 && d.push(r - 1), r < n.pageCount && d.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      d.forEach(async (g) => {
        !o.renderedPages.has(g) && !o.pageRendering && await Ln(g);
      });
    }, { timeout: 2e3 });
  }
  async function Ln(r) {
    if (!(!o.pdfDoc || o.renderedPages.has(r)))
      try {
        const d = await o.pdfDoc.getPage(r), g = o.zoomLevel, f = d.getViewport({ scale: g * window.devicePixelRatio }), y = document.createElement("canvas"), x = y.getContext("2d");
        y.width = f.width, y.height = f.height;
        const L = {
          canvasContext: x,
          viewport: f
        };
        await d.render(L).promise, o.renderedPages.set(r, {
          canvas: y,
          scale: g,
          timestamp: Date.now()
        }), Fe();
      } catch (d) {
        console.warn("Preload failed for page", r, d);
      }
  }
  function ut() {
    const r = window.devicePixelRatio || 1;
    return o.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function xe() {
    const r = document.getElementById("pdf-loading"), d = Date.now();
    try {
      const g = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!g.ok)
        throw new Error("Failed to load document");
      const y = (await g.json()).assets || {}, x = y.source_url || y.executed_url || y.certificate_url || n.documentUrl;
      if (!x)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const L = pdfjsLib.getDocument(x);
      o.pdfDoc = await L.promise, n.pageCount = o.pdfDoc.numPages, document.getElementById("page-count").textContent = o.pdfDoc.numPages, await Ft(1), kt(), u.trackViewerLoad(!0, Date.now() - d), u.trackPageView(1);
    } catch (g) {
      console.error("PDF load error:", g), u.trackViewerLoad(!1, Date.now() - d, g.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), ci();
    }
  }
  async function Ft(r) {
    if (!o.pdfDoc) return;
    const d = o.renderedPages.get(r);
    if (d && d.scale === o.zoomLevel) {
      Ct(d), o.currentPage = r, document.getElementById("current-page").textContent = r, kt(), He(), Lt(r);
      return;
    }
    o.pageRendering = !0;
    try {
      const g = await o.pdfDoc.getPage(r), f = o.zoomLevel, y = ut(), x = g.getViewport({ scale: f * y }), L = g.getViewport({ scale: 1 });
      B.setPageViewport(r, {
        width: L.width,
        height: L.height,
        rotation: L.rotation || 0
      });
      const M = document.getElementById("pdf-page-1");
      M.innerHTML = "";
      const R = document.createElement("canvas"), K = R.getContext("2d");
      R.height = x.height, R.width = x.width, R.style.width = `${x.width / y}px`, R.style.height = `${x.height / y}px`, M.appendChild(R);
      const q = document.getElementById("pdf-container");
      q.style.width = `${x.width / y}px`;
      const X = {
        canvasContext: K,
        viewport: x
      };
      await g.render(X).promise, o.renderedPages.set(r, {
        canvas: R.cloneNode(!0),
        scale: f,
        timestamp: Date.now(),
        displayWidth: x.width / y,
        displayHeight: x.height / y
      }), o.renderedPages.get(r).canvas.getContext("2d").drawImage(R, 0, 0), Fe(), o.currentPage = r, document.getElementById("current-page").textContent = r, kt(), He(), u.trackPageView(r), Lt(r);
    } catch (g) {
      console.error("Page render error:", g);
    } finally {
      if (o.pageRendering = !1, o.pageNumPending !== null) {
        const g = o.pageNumPending;
        o.pageNumPending = null, await Ft(g);
      }
    }
  }
  function Ct(r, d) {
    const g = document.getElementById("pdf-page-1");
    g.innerHTML = "";
    const f = document.createElement("canvas");
    f.width = r.canvas.width, f.height = r.canvas.height, f.style.width = `${r.displayWidth}px`, f.style.height = `${r.displayHeight}px`, f.getContext("2d").drawImage(r.canvas, 0, 0), g.appendChild(f);
    const x = document.getElementById("pdf-container");
    x.style.width = `${r.displayWidth}px`;
  }
  function Re(r) {
    o.pageRendering ? o.pageNumPending = r : Ft(r);
  }
  function ln(r) {
    return typeof r.previewValueText == "string" && r.previewValueText.trim() !== "" ? Be(r.previewValueText) : typeof r.value == "string" && r.value.trim() !== "" ? Be(r.value) : "";
  }
  function dn(r, d, g, f = !1) {
    const y = document.createElement("img");
    y.className = "field-overlay-preview", y.src = d, y.alt = g, r.appendChild(y), r.classList.add("has-preview"), f && r.classList.add("draft-preview");
  }
  function tt(r, d, g = !1, f = !1) {
    const y = document.createElement("span");
    y.className = "field-overlay-value", g && y.classList.add("font-signature"), y.textContent = d, r.appendChild(y), r.classList.add("has-value"), f && r.classList.add("draft-preview");
  }
  function nt(r, d) {
    const g = document.createElement("span");
    g.className = "field-overlay-label", g.textContent = d, r.appendChild(g);
  }
  function He() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const d = document.getElementById("pdf-container");
    o.fieldState.forEach((g, f) => {
      if (g.page !== o.currentPage) return;
      const y = document.createElement("div");
      if (y.className = "field-overlay", y.dataset.fieldId = f, g.required && y.classList.add("required"), g.completed && y.classList.add("completed"), o.activeFieldId === f && y.classList.add("active"), g.posX != null && g.posY != null && g.width != null && g.height != null) {
        const X = B.getOverlayStyles(g, d);
        y.style.left = X.left, y.style.top = X.top, y.style.width = X.width, y.style.height = X.height, y.style.transform = X.transform, de.enabled && (y.dataset.debugCoords = JSON.stringify(
          B.pageToScreen(g, d)._debug
        ));
      } else {
        const X = Array.from(o.fieldState.keys()).indexOf(f);
        y.style.left = "10px", y.style.top = `${100 + X * 50}px`, y.style.width = "150px", y.style.height = "30px";
      }
      const L = String(g.previewSignatureUrl || "").trim(), M = String(g.signaturePreviewUrl || "").trim(), R = ln(g), K = g.type === "signature" || g.type === "initials", q = typeof g.previewValueBool == "boolean";
      if (L)
        dn(y, L, it(g.type), !0);
      else if (g.completed && M)
        dn(y, M, it(g.type));
      else if (R) {
        const X = typeof g.previewValueText == "string" && g.previewValueText.trim() !== "";
        tt(y, R, K, X);
      } else g.type === "checkbox" && (q ? g.previewValueBool : !!g.value) ? tt(y, "Checked", !1, q) : nt(y, it(g.type));
      y.setAttribute("tabindex", "0"), y.setAttribute("role", "button"), y.setAttribute("aria-label", `${it(g.type)} field${g.required ? ", required" : ""}${g.completed ? ", completed" : ""}`), y.addEventListener("click", () => Pt(f)), y.addEventListener("keydown", (X) => {
        (X.key === "Enter" || X.key === " ") && (X.preventDefault(), Pt(f));
      }), r.appendChild(y);
    });
  }
  function it(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function Rt() {
    o.currentPage <= 1 || Re(o.currentPage - 1);
  }
  function Ht() {
    o.currentPage >= n.pageCount || Re(o.currentPage + 1);
  }
  function st(r) {
    r < 1 || r > n.pageCount || Re(r);
  }
  function kt() {
    document.getElementById("prev-page-btn").disabled = o.currentPage <= 1, document.getElementById("next-page-btn").disabled = o.currentPage >= n.pageCount;
  }
  function un() {
    o.zoomLevel = Math.min(o.zoomLevel + 0.25, 3), Ut(), Re(o.currentPage);
  }
  function Zn() {
    o.zoomLevel = Math.max(o.zoomLevel - 0.25, 0.5), Ut(), Re(o.currentPage);
  }
  function ei() {
    const d = document.getElementById("viewer-content").offsetWidth - 32, g = 612;
    o.zoomLevel = d / g, Ut(), Re(o.currentPage);
  }
  function Ut() {
    document.getElementById("zoom-level").textContent = `${Math.round(o.zoomLevel * 100)}%`;
  }
  function Pt(r) {
    if (!o.hasConsented && n.fields.some((d) => d.id === r && d.type !== "date_signed")) {
      mn();
      return;
    }
    Nt(r, { openEditor: !0 });
  }
  function Nt(r, d = { openEditor: !0 }) {
    const g = o.fieldState.get(r);
    if (g) {
      if (d.openEditor && (o.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((f) => f.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), g.page !== o.currentPage && st(g.page), !d.openEditor) {
        Cn(r);
        return;
      }
      g.type !== "date_signed" && kn(r);
    }
  }
  function Cn(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function kn(r) {
    const d = o.fieldState.get(r);
    if (!d) return;
    const g = document.getElementById("field-editor-overlay"), f = document.getElementById("field-editor-content"), y = document.getElementById("field-editor-title"), x = document.getElementById("field-editor-legal-disclaimer");
    y.textContent = pn(d.type), f.innerHTML = Pn(d), x?.classList.toggle("hidden", !(d.type === "signature" || d.type === "initials")), (d.type === "signature" || d.type === "initials") && Tn(r), g.classList.add("active"), g.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", fn(g.querySelector(".field-editor")), ye(`Editing ${pn(d.type)}. Press Escape to cancel.`), setTimeout(() => {
      const L = f.querySelector("input, textarea");
      L ? L.focus() : f.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), Me(o.writeCooldownUntil) > 0 && Dn(Me(o.writeCooldownUntil));
  }
  function pn(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function Pn(r) {
    const d = ti(r.type), g = Xe(String(r?.id || "")), f = Xe(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const y = r.type === "initials" ? "initials" : "signature", x = Xe(Et(r)), L = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], M = An(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${L.map((R) => `
            <button
              type="button"
              id="sig-tab-${R.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${M === R.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${R.id}"
              data-esign-action="signature-tab"
              data-field-id="${g}"
              role="tab"
              aria-selected="${M === R.id ? "true" : "false"}"
              aria-controls="sig-editor-${R.id}"
              tabindex="${M === R.id ? "0" : "-1"}"
            >
              ${R.label}
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
          value="${Xe(String(r.value || ""))}"
          data-field-id="${g}"
        />
        ${d}
      `;
    if (r.type === "text") {
      const y = Xe(String(r.value || ""));
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
  function ti(r) {
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
  function oe(r, d, g = { syncOverlay: !1 }) {
    const f = document.getElementById("sig-type-preview"), y = o.fieldState.get(r);
    if (!y) return;
    const x = Be(String(d || "").trim());
    if (g?.syncOverlay && (x ? _(r, x) : v(r), S()), !!f) {
      if (x) {
        f.textContent = x;
        return;
      }
      f.textContent = y.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function An(r) {
    const d = String(o.signatureTabByField.get(r) || "").trim();
    return d === "draw" || d === "type" || d === "upload" || d === "saved" ? d : "draw";
  }
  function At(r, d) {
    const g = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    o.signatureTabByField.set(d, g), document.querySelectorAll(".sig-editor-tab").forEach((y) => {
      y.classList.remove("border-blue-600", "text-blue-600"), y.classList.add("border-transparent", "text-gray-500"), y.setAttribute("aria-selected", "false"), y.setAttribute("tabindex", "-1");
    });
    const f = document.querySelector(`.sig-editor-tab[data-tab="${g}"]`);
    if (f?.classList.add("border-blue-600", "text-blue-600"), f?.classList.remove("border-transparent", "text-gray-500"), f?.setAttribute("aria-selected", "true"), f?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", g !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", g !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", g !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", g !== "saved"), (g === "draw" || g === "upload" || g === "saved") && f && requestAnimationFrame(() => Tt(d)), g === "type") {
      const y = document.getElementById("sig-type-input");
      oe(d, y?.value || "");
    }
    g === "saved" && fe(d).catch(je);
  }
  function Tn(r) {
    o.signatureTabByField.set(r, "draw"), At("draw", r);
    const d = document.getElementById("sig-type-input");
    d && oe(r, d.value || "");
  }
  function Tt(r) {
    const d = document.getElementById("sig-draw-canvas");
    if (!d || o.signatureCanvases.has(r)) return;
    const g = d.closest(".signature-canvas-container"), f = d.getContext("2d");
    if (!f) return;
    const y = d.getBoundingClientRect();
    if (!y.width || !y.height) return;
    const x = window.devicePixelRatio || 1;
    d.width = y.width * x, d.height = y.height * x, f.scale(x, x), f.lineCap = "round", f.lineJoin = "round", f.strokeStyle = "#1f2937", f.lineWidth = 2.5;
    let L = !1, M = 0, R = 0, K = [];
    const q = (V) => {
      const ee = d.getBoundingClientRect();
      let We, Je;
      return V.touches && V.touches.length > 0 ? (We = V.touches[0].clientX, Je = V.touches[0].clientY) : V.changedTouches && V.changedTouches.length > 0 ? (We = V.changedTouches[0].clientX, Je = V.changedTouches[0].clientY) : (We = V.clientX, Je = V.clientY), {
        x: We - ee.left,
        y: Je - ee.top,
        timestamp: Date.now()
      };
    }, X = (V) => {
      L = !0;
      const ee = q(V);
      M = ee.x, R = ee.y, K = [{ x: ee.x, y: ee.y, t: ee.timestamp, width: 2.5 }], g && g.classList.add("drawing");
    }, pe = (V) => {
      if (!L) return;
      const ee = q(V);
      K.push({ x: ee.x, y: ee.y, t: ee.timestamp, width: 2.5 });
      const We = ee.x - M, Je = ee.y - R, Hn = ee.timestamp - (K[K.length - 2]?.t || ee.timestamp), Kt = Math.sqrt(We * We + Je * Je) / Math.max(Hn, 1), Xt = 2.5, $i = 1.5, ct = 4, Ue = Math.min(Kt / 5, 1), yn = Math.max($i, Math.min(ct, Xt - Ue * 1.5));
      K[K.length - 1].width = yn, f.lineWidth = yn, f.beginPath(), f.moveTo(M, R), f.lineTo(ee.x, ee.y), f.stroke(), M = ee.x, R = ee.y;
    }, De = () => {
      if (L = !1, K.length > 1) {
        const V = o.signatureCanvases.get(r);
        V && (V.strokes.push(K.map((ee) => ({ ...ee }))), V.redoStack = []), jt(r);
      }
      K = [], g && g.classList.remove("drawing");
    };
    d.addEventListener("mousedown", X), d.addEventListener("mousemove", pe), d.addEventListener("mouseup", De), d.addEventListener("mouseout", De), d.addEventListener("touchstart", (V) => {
      V.preventDefault(), V.stopPropagation(), X(V);
    }, { passive: !1 }), d.addEventListener("touchmove", (V) => {
      V.preventDefault(), V.stopPropagation(), pe(V);
    }, { passive: !1 }), d.addEventListener("touchend", (V) => {
      V.preventDefault(), De();
    }, { passive: !1 }), d.addEventListener("touchcancel", De), d.addEventListener("gesturestart", (V) => V.preventDefault()), d.addEventListener("gesturechange", (V) => V.preventDefault()), d.addEventListener("gestureend", (V) => V.preventDefault()), o.signatureCanvases.set(r, {
      canvas: d,
      ctx: f,
      dpr: x,
      drawWidth: y.width,
      drawHeight: y.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), rt(r);
  }
  function rt(r) {
    const d = o.signatureCanvases.get(r), g = o.fieldState.get(r);
    if (!d || !g) return;
    const f = It(g);
    f && pt(r, f, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function pt(r, d, g = { clearStrokes: !1 }) {
    const f = o.signatureCanvases.get(r);
    if (!f) return !1;
    const y = String(d || "").trim();
    if (!y)
      return f.baseImageDataUrl = "", f.baseImage = null, g.clearStrokes && (f.strokes = [], f.redoStack = []), _t(r), !0;
    const { drawWidth: x, drawHeight: L } = f, M = new Image();
    return await new Promise((R) => {
      M.onload = () => {
        g.clearStrokes && (f.strokes = [], f.redoStack = []), f.baseImage = M, f.baseImageDataUrl = y, x > 0 && L > 0 && _t(r), R(!0);
      }, M.onerror = () => R(!1), M.src = y;
    });
  }
  function _t(r) {
    const d = o.signatureCanvases.get(r);
    if (!d) return;
    const { ctx: g, drawWidth: f, drawHeight: y, baseImage: x, strokes: L } = d;
    if (g.clearRect(0, 0, f, y), x) {
      const M = Math.min(f / x.width, y / x.height), R = x.width * M, K = x.height * M, q = (f - R) / 2, X = (y - K) / 2;
      g.drawImage(x, q, X, R, K);
    }
    for (const M of L)
      for (let R = 1; R < M.length; R++) {
        const K = M[R - 1], q = M[R];
        g.lineWidth = Number(q.width || 2.5) || 2.5, g.beginPath(), g.moveTo(K.x, K.y), g.lineTo(q.x, q.y), g.stroke();
      }
  }
  function qt(r) {
    const d = o.signatureCanvases.get(r);
    if (!d || d.strokes.length === 0) return;
    const g = d.strokes.pop();
    g && d.redoStack.push(g), _t(r), jt(r);
  }
  function ni(r) {
    const d = o.signatureCanvases.get(r);
    if (!d || d.redoStack.length === 0) return;
    const g = d.redoStack.pop();
    g && d.strokes.push(g), _t(r), jt(r);
  }
  function ze(r) {
    const d = o.signatureCanvases.get(r);
    if (!d) return !1;
    if ((d.baseImageDataUrl || "").trim() || d.strokes.length > 0) return !0;
    const { canvas: g, ctx: f } = d;
    return f.getImageData(0, 0, g.width, g.height).data.some((x, L) => L % 4 === 3 && x > 0);
  }
  function jt(r) {
    const d = o.signatureCanvases.get(r);
    d && (ze(r) ? F(r, d.canvas.toDataURL("image/png")) : v(r), S());
  }
  function _n(r) {
    const d = o.signatureCanvases.get(r);
    d && (d.strokes = [], d.redoStack = [], d.baseImage = null, d.baseImageDataUrl = "", _t(r)), v(r), S();
    const g = document.getElementById("sig-upload-preview-wrap"), f = document.getElementById("sig-upload-preview");
    g && g.classList.add("hidden"), f && f.removeAttribute("src");
  }
  function z() {
    const r = document.getElementById("field-editor-overlay"), d = r.querySelector(".field-editor");
    if (Vt(d), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", o.activeFieldId) {
      const g = document.querySelector(`.field-list-item[data-field-id="${o.activeFieldId}"]`);
      requestAnimationFrame(() => {
        g?.focus();
      });
    }
    E(), S(), o.activeFieldId = null, o.signatureCanvases.clear(), ye("Field editor closed.");
  }
  function Me(r) {
    const d = Number(r) || 0;
    return d <= 0 ? 0 : Math.max(0, Math.ceil((d - Date.now()) / 1e3));
  }
  function at(r, d = {}) {
    const g = Number(d.retry_after_seconds);
    if (Number.isFinite(g) && g > 0)
      return Math.ceil(g);
    const f = String(r?.headers?.get?.("Retry-After") || "").trim();
    if (!f) return 0;
    const y = Number(f);
    return Number.isFinite(y) && y > 0 ? Math.ceil(y) : 0;
  }
  async function ot(r, d) {
    let g = {};
    try {
      g = await r.json();
    } catch {
      g = {};
    }
    const f = g?.error || {}, y = f?.details && typeof f.details == "object" ? f.details : {}, x = at(r, y), L = r?.status === 429, M = L ? x > 0 ? `Too many actions too quickly. Please wait ${x}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(f?.message || d || "Request failed"), R = new Error(M);
    return R.status = r?.status || 0, R.code = String(f?.code || ""), R.details = y, R.rateLimited = L, R.retryAfterSeconds = x, R;
  }
  function Dn(r) {
    const d = Math.max(1, Number(r) || 1);
    o.writeCooldownUntil = Date.now() + d * 1e3, o.writeCooldownTimer && (clearInterval(o.writeCooldownTimer), o.writeCooldownTimer = null);
    const g = () => {
      const f = document.getElementById("field-editor-save");
      if (!f) return;
      const y = Me(o.writeCooldownUntil);
      if (y <= 0) {
        o.pendingSaves.has(o.activeFieldId || "") || (f.disabled = !1, f.innerHTML = "Insert"), o.writeCooldownTimer && (clearInterval(o.writeCooldownTimer), o.writeCooldownTimer = null);
        return;
      }
      f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
    };
    g(), o.writeCooldownTimer = setInterval(g, 250);
  }
  function ii(r) {
    const d = Math.max(1, Number(r) || 1);
    o.submitCooldownUntil = Date.now() + d * 1e3, o.submitCooldownTimer && (clearInterval(o.submitCooldownTimer), o.submitCooldownTimer = null);
    const g = () => {
      const f = Me(o.submitCooldownUntil);
      Oe(), f <= 0 && o.submitCooldownTimer && (clearInterval(o.submitCooldownTimer), o.submitCooldownTimer = null);
    };
    g(), o.submitCooldownTimer = setInterval(g, 250);
  }
  async function si() {
    const r = o.activeFieldId;
    if (!r) return;
    const d = o.fieldState.get(r);
    if (!d) return;
    const g = Me(o.writeCooldownUntil);
    if (g > 0) {
      const y = `Please wait ${g}s before saving again.`;
      window.toastManager && window.toastManager.error(y), ye(y, "assertive");
      return;
    }
    const f = document.getElementById("field-editor-save");
    f.disabled = !0, f.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      o.profileRemember = Se();
      let y = !1;
      if (d.type === "signature" || d.type === "initials")
        y = await zt(r);
      else if (d.type === "checkbox") {
        const x = document.getElementById("field-checkbox-input");
        y = await gt(r, null, x?.checked || !1);
      } else {
        const L = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!L && d.required)
          throw new Error("This field is required");
        y = await gt(r, L, null);
      }
      if (y) {
        z(), Bn(), Oe(), Wt(), He(), _e(r), ai(r);
        const x = Jt();
        x.allRequiredComplete ? ye("Field saved. All required fields complete. Ready to submit.") : ye(`Field saved. ${x.remainingRequired} required field${x.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (y) {
      y?.rateLimited && Dn(y.retryAfterSeconds), window.toastManager && window.toastManager.error(y.message), ye(`Error saving field: ${y.message}`, "assertive");
    } finally {
      if (Me(o.writeCooldownUntil) > 0) {
        const y = Me(o.writeCooldownUntil);
        f.disabled = !0, f.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${y}s`;
      } else
        f.disabled = !1, f.innerHTML = "Insert";
    }
  }
  async function zt(r) {
    const d = o.fieldState.get(r), g = document.getElementById("sig-type-input"), f = An(r);
    if (f === "draw" || f === "upload" || f === "saved") {
      const x = o.signatureCanvases.get(r);
      if (!x) return !1;
      if (!ze(r))
        throw new Error(d?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const L = x.canvas.toDataURL("image/png");
      return await Te(r, { type: "drawn", dataUrl: L }, d?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const x = g?.value?.trim();
      if (!x)
        throw new Error(d?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return d.type === "initials" ? await gt(r, x, null) : await Te(r, { type: "typed", text: x }, x);
    }
  }
  async function gt(r, d, g) {
    o.pendingSaves.add(r);
    const f = Date.now(), y = o.fieldState.get(r);
    try {
      const x = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: d,
          value_bool: g
        })
      });
      if (!x.ok)
        throw await ot(x, "Failed to save field");
      const L = o.fieldState.get(r);
      return L && (L.value = d ?? g, L.completed = !0, L.hasError = !1), await cn(L), window.toastManager && window.toastManager.success("Field saved"), u.trackFieldSave(r, L?.type, !0, Date.now() - f), !0;
    } catch (x) {
      const L = o.fieldState.get(r);
      throw L && (L.hasError = !0, L.lastError = x.message), u.trackFieldSave(r, y?.type, !1, Date.now() - f, x.message), x;
    } finally {
      o.pendingSaves.delete(r);
    }
  }
  async function Te(r, d, g) {
    o.pendingSaves.add(r);
    const f = Date.now(), y = d?.type || "typed";
    try {
      let x;
      if (y === "drawn") {
        const R = await G.uploadDrawnSignature(
          r,
          d.dataUrl
        );
        x = {
          field_instance_id: r,
          type: "drawn",
          value_text: g,
          object_key: R.objectKey,
          sha256: R.sha256,
          upload_token: R.uploadToken
        };
      } else
        x = await Mn(r, g);
      const L = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x)
      });
      if (!L.ok)
        throw await ot(L, "Failed to save signature");
      const M = o.fieldState.get(r);
      return M && (M.value = g, M.completed = !0, M.hasError = !1, d?.dataUrl && (M.signaturePreviewUrl = d.dataUrl)), await cn(M, {
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
  async function Mn(r, d) {
    const g = `${d}|${r}`, f = await $n(g), y = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: d,
      object_key: y,
      sha256: f
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function $n(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const d = new TextEncoder().encode(r), g = await window.crypto.subtle.digest("SHA-256", d);
      return Array.from(new Uint8Array(g)).map((f) => f.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Bn() {
    let r = 0;
    o.fieldState.forEach((M) => {
      M.required, M.completed && r++;
    });
    const d = o.fieldState.size, g = d > 0 ? r / d * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = d;
    const f = document.getElementById("progress-ring-circle"), y = 97.4, x = y - g / 100 * y;
    f.style.strokeDashoffset = x, document.getElementById("mobile-progress").style.width = `${g}%`;
    const L = d - r;
    document.getElementById("fields-status").textContent = L > 0 ? `${L} remaining` : "All complete";
  }
  function Oe() {
    const r = document.getElementById("submit-btn"), d = document.getElementById("incomplete-warning"), g = document.getElementById("incomplete-message"), f = Me(o.submitCooldownUntil);
    let y = [], x = !1;
    o.fieldState.forEach((M, R) => {
      M.required && !M.completed && y.push(M), M.hasError && (x = !0);
    });
    const L = o.hasConsented && y.length === 0 && !x && o.pendingSaves.size === 0 && f === 0 && !o.isSubmitting;
    r.disabled = !L, !o.isSubmitting && f > 0 ? r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${f}s` : !o.isSubmitting && f === 0 && (r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), o.hasConsented ? f > 0 ? (d.classList.remove("hidden"), g.textContent = `Please wait ${f}s before submitting again.`) : x ? (d.classList.remove("hidden"), g.textContent = "Some fields failed to save. Please retry.") : y.length > 0 ? (d.classList.remove("hidden"), g.textContent = `Complete ${y.length} required field${y.length > 1 ? "s" : ""}`) : d.classList.add("hidden") : (d.classList.remove("hidden"), g.textContent = "Please accept the consent agreement");
  }
  function _e(r) {
    const d = o.fieldState.get(r), g = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!g || !d)) {
      if (d.completed) {
        g.classList.add("completed"), g.classList.remove("error");
        const f = g.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), f.classList.add("bg-green-100", "text-green-600"), f.innerHTML = '<i class="iconoir-check"></i>';
      } else if (d.hasError) {
        g.classList.remove("completed"), g.classList.add("error");
        const f = g.querySelector(".w-8");
        f.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), f.classList.add("bg-red-100", "text-red-600"), f.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function ri() {
    const r = Array.from(o.fieldState.values()).filter((d) => d.required);
    return r.sort((d, g) => {
      const f = Number(d.page || 0), y = Number(g.page || 0);
      if (f !== y) return f - y;
      const x = Number(d.tabIndex || 0), L = Number(g.tabIndex || 0);
      if (x > 0 && L > 0 && x !== L) return x - L;
      if (x > 0 != L > 0) return x > 0 ? -1 : 1;
      const M = Number(d.posY || 0), R = Number(g.posY || 0);
      if (M !== R) return M - R;
      const K = Number(d.posX || 0), q = Number(g.posX || 0);
      return K !== q ? K - q : String(d.id || "").localeCompare(String(g.id || ""));
    }), r;
  }
  function gn(r) {
    o.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((d) => d.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((d) => d.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function ai(r) {
    const d = ri(), g = d.filter((L) => !L.completed);
    if (g.length === 0) {
      u.track("guided_next_none_remaining", { fromFieldId: r });
      const L = document.getElementById("submit-btn");
      L?.scrollIntoView({ behavior: "smooth", block: "nearest" }), L?.focus(), ye("All required fields are complete. Review the document and submit when ready.");
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
    if (y || (y = g[0]), !y) return;
    u.track("guided_next_started", { fromFieldId: r, toFieldId: y.id });
    const x = Number(y.page || 1);
    x !== o.currentPage && st(x), Nt(y.id, { openEditor: !1 }), gn(y.id), setTimeout(() => {
      gn(y.id), Cn(y.id), u.track("guided_next_completed", { toFieldId: y.id, page: y.page }), ye(`Next required field highlighted on page ${y.page}.`);
    }, 120);
  }
  function mn() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", fn(r.querySelector(".field-editor")), ye("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function hn() {
    const r = document.getElementById("consent-modal"), d = r.querySelector(".field-editor");
    Vt(d), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ye("Consent dialog closed.");
  }
  async function Ot() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const d = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!d.ok)
        throw await ot(d, "Failed to accept consent");
      o.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), hn(), Oe(), Wt(), u.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), ye("Consent accepted. You can now complete the fields and submit.");
    } catch (d) {
      window.toastManager && window.toastManager.error(d.message), ye(`Error: ${d.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function Le() {
    const r = document.getElementById("submit-btn"), d = Me(o.submitCooldownUntil);
    if (d > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${d}s before submitting again.`), Oe();
      return;
    }
    o.isSubmitting = !0, r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const g = `submit-${n.recipientId}-${Date.now()}`, f = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": g }
      });
      if (!f.ok)
        throw await ot(f, "Failed to submit");
      u.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (g) {
      u.trackSubmit(!1, g.message), g?.rateLimited && ii(g.retryAfterSeconds), window.toastManager && window.toastManager.error(g.message);
    } finally {
      o.isSubmitting = !1, Oe();
    }
  }
  function oi() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", fn(r.querySelector(".field-editor")), ye("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Gt() {
    const r = document.getElementById("decline-modal"), d = r.querySelector(".field-editor");
    Vt(d), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", ye("Decline dialog closed.");
  }
  async function Fn() {
    const r = document.getElementById("decline-reason").value;
    try {
      const d = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!d.ok)
        throw await ot(d, "Failed to decline");
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (d) {
      window.toastManager && window.toastManager.error(d.message);
    }
  }
  function ci() {
    u.trackDegradedMode("viewer_load_failure"), u.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Rn() {
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
  const de = {
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
      const g = u.metrics.errorsEncountered;
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
          console.log("[E-Sign Debug] Reloading viewer..."), xe();
        },
        setLowMemory: (r) => {
          o.isLowMemory = r, Fe(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), xe(), this.updatePanel();
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
  function ye(r, d = "polite") {
    const g = d === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    g && (g.textContent = "", requestAnimationFrame(() => {
      g.textContent = r;
    }));
  }
  function fn(r) {
    const g = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), f = g[0], y = g[g.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function x(L) {
      L.key === "Tab" && (L.shiftKey ? document.activeElement === f && (L.preventDefault(), y?.focus()) : document.activeElement === y && (L.preventDefault(), f?.focus()));
    }
    r.addEventListener("keydown", x), r._focusTrapHandler = x, requestAnimationFrame(() => {
      f?.focus();
    });
  }
  function Vt(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const d = r.dataset.previousFocus;
    if (d) {
      const g = document.getElementById(d);
      requestAnimationFrame(() => {
        g?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function Wt() {
    const r = Jt(), d = document.getElementById("submit-status");
    d && (r.allRequiredComplete && o.hasConsented ? d.textContent = "All required fields complete. You can now submit." : o.hasConsented ? d.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : d.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Jt() {
    let r = 0, d = 0, g = 0;
    return o.fieldState.forEach((f) => {
      f.required && d++, f.completed && r++, f.required && !f.completed && g++;
    }), {
      completed: r,
      required: d,
      remainingRequired: g,
      total: o.fieldState.size,
      allRequiredComplete: g === 0
    };
  }
  function Yt(r, d = 1) {
    const g = Array.from(o.fieldState.keys()), f = g.indexOf(r);
    if (f === -1) return null;
    const y = f + d;
    return y >= 0 && y < g.length ? g[y] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (z(), hn(), Gt()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const d = Array.from(document.querySelectorAll(".sig-editor-tab")), g = d.indexOf(r.target);
      if (g !== -1) {
        let f = g;
        if (r.key === "ArrowRight" && (f = (g + 1) % d.length), r.key === "ArrowLeft" && (f = (g - 1 + d.length) % d.length), r.key === "Home" && (f = 0), r.key === "End" && (f = d.length - 1), f !== g) {
          r.preventDefault();
          const y = d[f], x = y.getAttribute("data-tab") || "draw", L = y.getAttribute("data-field-id");
          L && At(x, L), y.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const d = r.target.dataset.fieldId, g = r.key === "ArrowDown" ? 1 : -1, f = Yt(d, g);
        f && document.querySelector(`.field-list-item[data-field-id="${f}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const d = r.target.dataset.fieldId;
        d && Pt(d);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Is {
  constructor(e) {
    this.config = e;
  }
  init() {
    aa(this.config);
  }
  destroy() {
  }
}
function po(i) {
  const e = new Is(i);
  return ne(() => e.init()), e;
}
function oa() {
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
  const e = oa();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Is(e);
  t.init(), window.esignSignerReviewController = t;
});
class Es {
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
    $t('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), $t('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function go(i = {}) {
  const e = new Es(i);
  return ne(() => e.init()), e;
}
function mo(i = {}) {
  const e = new Es(i);
  ne(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Ti {
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
function ho(i) {
  const e = new Ti(i);
  return e.init(), e;
}
function fo(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new Ti(e);
  ne(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && ne(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new Ti({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class yo {
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
class vo {
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
function ca(i) {
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
function la(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function da(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((l) => String(l || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((l) => l !== s)] : n;
}
function wo(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function bo(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: ca(e.type),
    options: la(e.options),
    operators: da(e.operators, e.default_operator)
  })) : [];
}
function So(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function xo(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Io(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function Eo(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([u, o]) => `${u}: ${o}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", l = e?.message || `${i} failed`;
    t.error(n ? `${s}${l}: ${n}` : `${s}${l}`);
  }
}
function Lo(i, e) {
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
function Co(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const ko = {
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
}, Yn = "application/vnd.google-apps.document", _i = "application/vnd.google-apps.spreadsheet", Di = "application/vnd.google-apps.presentation", Ls = "application/vnd.google-apps.folder", Mi = "application/pdf", ua = [Yn, Mi], Cs = "esign.google.account_id";
function pa(i) {
  return i.mimeType === Yn;
}
function ga(i) {
  return i.mimeType === Mi;
}
function nn(i) {
  return i.mimeType === Ls;
}
function ma(i) {
  return ua.includes(i.mimeType);
}
function Po(i) {
  return i.mimeType === Yn || i.mimeType === _i || i.mimeType === Di;
}
function ha(i) {
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
function Ao(i) {
  return i.map(ha);
}
function ks(i) {
  return {
    [Yn]: "Google Doc",
    [_i]: "Google Sheet",
    [Di]: "Google Slides",
    [Ls]: "Folder",
    [Mi]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function fa(i) {
  return nn(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : pa(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : ga(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === _i ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === Di ? {
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
function ya(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function va(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function To(i, e) {
  const t = i.get("account_id");
  if (t)
    return Gn(t);
  if (e)
    return Gn(e);
  const n = localStorage.getItem(Cs);
  return n ? Gn(n) : "";
}
function Gn(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function _o(i) {
  const e = Gn(i);
  e && localStorage.setItem(Cs, e);
}
function Do(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Mo(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function $o(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function sn(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function wa(i) {
  const e = fa(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Bo(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const l = s === t.length - 1, u = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return l ? `${u}<span class="text-gray-900 font-medium">${sn(n.name)}</span>` : `${u}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${sn(n.name)}</button>`;
  }).join("");
}
function ba(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, l = wa(i), u = nn(i), o = ma(i), S = u ? "cursor-pointer hover:bg-gray-50" : o ? "cursor-pointer hover:bg-blue-50" : "opacity-60", v = u ? `data-folder-id="${i.id}" data-folder-name="${sn(i.name)}"` : o && t ? `data-file-id="${i.id}" data-file-name="${sn(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${S} file-item"
      ${v}
      role="listitem"
      ${o ? 'tabindex="0"' : ""}
    >
      ${l}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${sn(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${ks(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${ya(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${va(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${o && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Fo(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${sn(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((l, u) => nn(l) && !nn(u) ? -1 : !nn(l) && nn(u) ? 1 : l.name.localeCompare(u.name)).map((l) => ba(l, { selectable: n })).join("")}
    </div>
  `;
}
function Ro(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: ks(i.mimeType)
  };
}
export {
  mr as AGREEMENT_STATUS_BADGES,
  xs as AgreementFormController,
  Ti as DocumentDetailPreviewController,
  Ai as DocumentFormController,
  lr as ESignAPIClient,
  dr as ESignAPIError,
  Cs as GOOGLE_ACCOUNT_STORAGE_KEY,
  us as GoogleCallbackController,
  gs as GoogleDrivePickerController,
  ps as GoogleIntegrationController,
  ua as IMPORTABLE_MIME_TYPES,
  fs as IntegrationConflictsController,
  ms as IntegrationHealthController,
  hs as IntegrationMappingsController,
  ys as IntegrationSyncRunsController,
  Pi as LandingPageController,
  Yn as MIME_GOOGLE_DOC,
  Ls as MIME_GOOGLE_FOLDER,
  _i as MIME_GOOGLE_SHEET,
  Di as MIME_GOOGLE_SLIDES,
  Mi as MIME_PDF,
  yo as PanelPaginationBehavior,
  vo as PanelSearchBehavior,
  ko as STANDARD_GRID_SELECTORS,
  ds as SignerCompletePageController,
  Es as SignerErrorPageController,
  Is as SignerReviewController,
  Ie as announce,
  Do as applyAccountIdToPath,
  br as applyDetailFormatters,
  Xr as bootstrapAgreementForm,
  fo as bootstrapDocumentDetailPreview,
  lo as bootstrapDocumentForm,
  Ya as bootstrapGoogleCallback,
  Za as bootstrapGoogleDrivePicker,
  Xa as bootstrapGoogleIntegration,
  ro as bootstrapIntegrationConflicts,
  to as bootstrapIntegrationHealth,
  io as bootstrapIntegrationMappings,
  oo as bootstrapIntegrationSyncRuns,
  Ga as bootstrapLandingPage,
  Wa as bootstrapSignerCompletePage,
  mo as bootstrapSignerErrorPage,
  aa as bootstrapSignerReview,
  Mo as buildScopedApiUrl,
  Ma as byId,
  gr as capitalize,
  pr as createESignClient,
  fr as createElement,
  Co as createSchemaActionCachingRefresh,
  Ro as createSelectedFile,
  _a as createStatusBadgeElement,
  ja as createTimeoutController,
  So as dateTimeCellRenderer,
  Wn as debounce,
  Eo as defaultActionErrorHandler,
  Io as defaultActionSuccessHandler,
  Ba as delegate,
  sn as escapeHtml,
  xo as fileSizeCellRenderer,
  La as formatDate,
  Vn as formatDateTime,
  va as formatDriveDate,
  ya as formatDriveFileSize,
  qn as formatFileSize,
  Ea as formatPageCount,
  Pa as formatRecipientCount,
  ka as formatRelativeTime,
  vr as formatSizeElements,
  Ca as formatTime,
  wr as formatTimestampElements,
  cs as getAgreementStatusBadge,
  Ia as getESignClient,
  fa as getFileIconConfig,
  ks as getFileTypeName,
  yr as getPageConfig,
  A as hide,
  uo as initAgreementForm,
  Sr as initDetailFormatters,
  ho as initDocumentDetailPreview,
  co as initDocumentForm,
  Ja as initGoogleCallback,
  Qa as initGoogleDrivePicker,
  Ka as initGoogleIntegration,
  so as initIntegrationConflicts,
  eo as initIntegrationHealth,
  no as initIntegrationMappings,
  ao as initIntegrationSyncRuns,
  Oa as initLandingPage,
  Va as initSignerCompletePage,
  go as initSignerErrorPage,
  po as initSignerReview,
  nn as isFolder,
  pa as isGoogleDoc,
  Po as isGoogleWorkspaceFile,
  ma as isImportable,
  ga as isPDF,
  Gn as normalizeAccountId,
  ha as normalizeDriveFile,
  Ao as normalizeDriveFiles,
  da as normalizeFilterOperators,
  la as normalizeFilterOptions,
  ca as normalizeFilterType,
  $a as on,
  ne as onReady,
  Ua as poll,
  bo as prepareFilterFields,
  wo as prepareGridColumns,
  m as qs,
  $t as qsa,
  Bo as renderBreadcrumb,
  wa as renderFileIcon,
  ba as renderFileItem,
  Fo as renderFileList,
  hr as renderStatusBadge,
  To as resolveAccountId,
  Na as retry,
  _o as saveAccountId,
  ur as setESignClient,
  Ra as setLoading,
  Lo as setupRefreshButton,
  $ as show,
  ls as sleep,
  Aa as snakeToTitle,
  $o as syncAccountIdToUrl,
  qa as throttle,
  Fa as toggle,
  Ta as truncate,
  In as updateDataText,
  Ha as updateDataTexts,
  Da as updateStatusBadge,
  za as withTimeout
};
//# sourceMappingURL=index.js.map

import { r as u } from "../chunks/icon-renderer-FL11lsYV.js";
import { escapeHTML as o } from "../shared/html.js";
import { C as ft } from "../chunks/modal-8-n6PAK8.js";
import { c as Ct, m as Lt, g as kt } from "../chunks/command-runtime-DiUPApH6.js";
import { C as Ze, a as Xe, f as ts, h as es, b as ss, i as is, d as rs, n as ns, p as as, e as os } from "../chunks/command-runtime-DiUPApH6.js";
class I extends Error {
  constructor(t, e, s, i) {
    super(t), this.name = "ServicesAPIError", this.code = e, this.statusCode = s, this.details = i;
  }
  static fromResponse(t, e) {
    const s = e.message || e.error || "Unknown error", i = e.text_code || "UNKNOWN_ERROR";
    return new I(s, i, t, e.details);
  }
  get isForbidden() {
    return this.statusCode === 403 || this.code === "FORBIDDEN";
  }
  get isNotFound() {
    return this.statusCode === 404;
  }
  get isValidationError() {
    return this.code === "VALIDATION_ERROR";
  }
  get isConflict() {
    return this.statusCode === 409 || this.code === "CONFLICT";
  }
}
const _ = {
  VIEW: "admin.services.view",
  CONNECT: "admin.services.connect",
  EDIT: "admin.services.edit",
  REVOKE: "admin.services.revoke",
  RECONSENT: "admin.services.reconsent",
  ACTIVITY_VIEW: "admin.services.activity.view",
  WEBHOOKS: "admin.services.webhooks"
}, Tt = {
  basePath: "/admin/api/services",
  timeout: 3e4,
  headers: {}
};
function Et() {
  return (typeof globalThis < "u" ? globalThis.location : void 0)?.origin || "http://localhost";
}
class bt {
  constructor(t = {}) {
    this.abortControllers = /* @__PURE__ */ new Map(), this.config = {
      ...Tt,
      ...t
    };
  }
  // ---------------------------------------------------------------------------
  // Provider Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List all registered providers
   */
  async listProviders(t) {
    return this.get("/providers", {}, t);
  }
  // ---------------------------------------------------------------------------
  // Connection Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List connections with optional filters
   */
  async listConnections(t = {}, e) {
    const s = this.buildListParams(t);
    return this.get("/connections", s, e);
  }
  /**
   * Get full connection detail payload
   */
  async getConnectionDetail(t, e) {
    return this.get(
      `/connections/${encodeURIComponent(t)}`,
      {},
      e
    );
  }
  /**
   * Begin a new connection flow (OAuth2 redirect)
   */
  async beginConnection(t, e = {}, s) {
    return this.post(
      `/connections/${encodeURIComponent(t)}/begin`,
      e,
      s
    );
  }
  /**
   * Complete OAuth callback (typically called via redirect)
   */
  async completeCallback(t, e, s) {
    return this.get(
      `/connections/${encodeURIComponent(t)}/callback`,
      e,
      s
    );
  }
  /**
   * Get grant snapshot for a connection
   */
  async getConnectionGrants(t, e) {
    return this.get(
      `/connections/${encodeURIComponent(t)}/grants`,
      {},
      e
    );
  }
  /**
   * Begin re-consent flow for a connection
   */
  async beginReconsent(t, e = {}, s) {
    return this.post(
      `/connections/${encodeURIComponent(t)}/reconsent/begin`,
      e,
      s
    );
  }
  /**
   * Refresh a connection's credentials
   */
  async refreshConnection(t, e = {}, s) {
    return this.post(
      `/connections/${encodeURIComponent(t)}/refresh`,
      e,
      s
    );
  }
  /**
   * Revoke a connection
   */
  async revokeConnection(t, e = {}, s) {
    return this.post(
      `/connections/${encodeURIComponent(t)}/revoke`,
      e,
      s
    );
  }
  // ---------------------------------------------------------------------------
  // Installation Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List installations with optional filters
   */
  async listInstallations(t = {}, e) {
    const s = this.buildListParams(t);
    return this.get("/installations", s, e);
  }
  /**
   * Begin a new installation flow
   */
  async beginInstallation(t, e = {}, s) {
    return this.post(
      `/installations/${encodeURIComponent(t)}/begin`,
      e,
      s
    );
  }
  /**
   * Uninstall an installation
   */
  async uninstallInstallation(t, e = {}, s) {
    return this.post(
      `/installations/${encodeURIComponent(t)}/uninstall`,
      e,
      s
    );
  }
  // ---------------------------------------------------------------------------
  // Subscription Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List subscriptions with optional filters
   */
  async listSubscriptions(t = {}, e) {
    const s = this.buildListParams(t);
    return this.get("/subscriptions", s, e);
  }
  /**
   * Renew a subscription
   */
  async renewSubscription(t, e = {}, s) {
    return this.post(
      `/subscriptions/${encodeURIComponent(t)}/renew`,
      e,
      s
    );
  }
  /**
   * Cancel a subscription
   */
  async cancelSubscription(t, e = {}, s) {
    return this.post(
      `/subscriptions/${encodeURIComponent(t)}/cancel`,
      e,
      s
    );
  }
  // ---------------------------------------------------------------------------
  // Sync Endpoints
  // ---------------------------------------------------------------------------
  /**
   * Run a sync job for a connection
   */
  async runSync(t, e, s) {
    return this.post(
      `/sync/${encodeURIComponent(t)}/run`,
      e,
      s
    );
  }
  /**
   * Get sync status summary for a connection
   */
  async getSyncStatus(t, e) {
    return this.get(
      `/sync/${encodeURIComponent(t)}/status`,
      {},
      e
    );
  }
  // ---------------------------------------------------------------------------
  // Workflow Mapping Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List mapping specs for provider/scope.
   */
  async listMappings(t, e) {
    const s = this.buildListParams(
      t
    );
    return this.get("/mappings", s, e);
  }
  /**
   * Get latest mapping spec (or explicit version via query).
   */
  async getMapping(t, e, s) {
    const i = this.buildListParams(
      e
    );
    return this.get(
      `/mappings/spec/${encodeURIComponent(t)}`,
      i,
      s
    );
  }
  /**
   * Get a specific mapping version.
   */
  async getMappingVersion(t, e, s, i) {
    const r = this.buildListParams(
      s
    );
    return this.get(
      `/mappings/spec/${encodeURIComponent(t)}/versions/${encodeURIComponent(String(e))}`,
      r,
      i
    );
  }
  /**
   * Create mapping draft.
   */
  async createMappingDraft(t, e) {
    return this.post("/mappings", t, e);
  }
  /**
   * Update mapping draft.
   */
  async updateMappingDraft(t, e, s) {
    return this.post(
      `/mappings/spec/${encodeURIComponent(t)}/update`,
      e,
      s
    );
  }
  /**
   * Mark mapping version validated.
   */
  async markMappingValidated(t, e, s) {
    return this.post(
      `/mappings/spec/${encodeURIComponent(t)}/validate`,
      e,
      s
    );
  }
  /**
   * Publish mapping version.
   */
  async publishMapping(t, e, s) {
    return this.post(
      `/mappings/spec/${encodeURIComponent(t)}/publish`,
      e,
      s
    );
  }
  /**
   * Unpublish mapping version.
   */
  async unpublishMapping(t, e, s) {
    return this.post(
      `/mappings/spec/${encodeURIComponent(t)}/unpublish`,
      e,
      s
    );
  }
  /**
   * Validate mapping spec against schema.
   */
  async validateMapping(t, e) {
    return this.post("/mappings/validate", t, e);
  }
  /**
   * Preview mapping transformations against samples.
   */
  async previewMapping(t, e) {
    return this.post("/mappings/preview", t, e);
  }
  // ---------------------------------------------------------------------------
  // Workflow Sync/Conflict Endpoints
  // ---------------------------------------------------------------------------
  /**
   * Build sync execution plan.
   */
  async planWorkflowSync(t, e) {
    return this.post("/sync/plan", t, e);
  }
  /**
   * Execute sync run from a plan/binding.
   */
  async runWorkflowSync(t, e) {
    return this.post("/sync/run", t, e);
  }
  /**
   * List workflow sync runs for provider/scope.
   */
  async listSyncRuns(t, e) {
    const s = this.buildListParams(
      t
    );
    return this.get("/sync/runs", s, e);
  }
  /**
   * Get workflow sync run detail.
   */
  async getSyncRun(t, e, s) {
    const i = this.buildListParams(
      e
    );
    return this.get(
      `/sync/runs/${encodeURIComponent(t)}`,
      i,
      s
    );
  }
  /**
   * Resume a workflow sync run from its latest checkpoint.
   */
  async resumeSyncRun(t, e, s) {
    return this.post(
      `/sync/runs/${encodeURIComponent(t)}/resume`,
      e,
      s
    );
  }
  /**
   * Get workflow sync checkpoint detail.
   */
  async getSyncCheckpoint(t, e, s) {
    const i = this.buildListParams(
      e
    );
    return this.get(
      `/sync/checkpoints/${encodeURIComponent(t)}`,
      i,
      s
    );
  }
  /**
   * List sync conflicts for provider/scope.
   */
  async listSyncConflicts(t, e) {
    const s = this.buildListParams(
      t
    );
    return this.get("/sync/conflicts", s, e);
  }
  /**
   * Get sync conflict detail.
   */
  async getSyncConflict(t, e, s) {
    const i = this.buildListParams(
      e
    );
    return this.get(
      `/sync/conflicts/${encodeURIComponent(t)}`,
      i,
      s
    );
  }
  /**
   * Resolve/ignore/retry a sync conflict.
   */
  async resolveSyncConflict(t, e, s) {
    return this.post(
      `/sync/conflicts/${encodeURIComponent(t)}/resolve`,
      e,
      s
    );
  }
  /**
   * List schema drift status for mapping specs in provider/scope.
   */
  async listSchemaDrift(t, e) {
    const s = this.buildListParams(
      t
    );
    return this.get("/sync/schema-drift", s, e);
  }
  /**
   * Set/update schema drift baseline for a mapping spec.
   */
  async setSchemaDriftBaseline(t, e) {
    return this.post(
      "/sync/schema-drift/baseline",
      t,
      e
    );
  }
  // ---------------------------------------------------------------------------
  // Diagnostics and Ambiguity Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List candidate connections for provider/scope ambiguity remediation.
   */
  async listConnectionCandidates(t, e) {
    const s = this.buildListParams(
      t
    );
    return this.get("/connection-candidates", s, e);
  }
  /**
   * Get callback resolver diagnostics status.
   */
  async getCallbackDiagnosticsStatus(t, e) {
    const s = {
      provider_id: t?.trim() || void 0
    };
    return this.get(
      "/callbacks/diagnostics/status",
      s,
      e
    );
  }
  /**
   * Preview callback resolver output for provider/flow.
   */
  async previewCallbackDiagnostics(t, e) {
    return this.post(
      "/callbacks/diagnostics/preview",
      t,
      e
    );
  }
  // ---------------------------------------------------------------------------
  // Capability Endpoints
  // ---------------------------------------------------------------------------
  /**
   * Invoke a provider capability
   */
  async invokeCapability(t, e, s = {}, i) {
    return this.post(
      `/capabilities/${encodeURIComponent(t)}/${encodeURIComponent(e)}/invoke`,
      s,
      i
    );
  }
  // ---------------------------------------------------------------------------
  // Activity Endpoints
  // ---------------------------------------------------------------------------
  /**
   * List activity entries with optional filters
   */
  async listActivity(t = {}, e) {
    const s = this.buildActivityParams(t);
    return this.get("/activity", s, e);
  }
  // ---------------------------------------------------------------------------
  // Status Endpoints
  // ---------------------------------------------------------------------------
  /**
   * Get service status
   */
  async getStatus(t) {
    return this.get("/status", {}, t);
  }
  /**
   * Run activity retention cleanup
   */
  async runRetentionCleanup(t) {
    return this.post("/activity/retention/cleanup", {}, t);
  }
  // ---------------------------------------------------------------------------
  // Webhook/Inbound Endpoints (typically server-to-server)
  // ---------------------------------------------------------------------------
  /**
   * Process a webhook from a provider
   */
  async processWebhook(t, e, s) {
    return this.post(
      `/webhooks/${encodeURIComponent(t)}`,
      e,
      void 0,
      s
    );
  }
  /**
   * Dispatch an inbound surface request
   */
  async dispatchInbound(t, e, s, i) {
    return this.post(
      `/inbound/${encodeURIComponent(t)}/${encodeURIComponent(e)}`,
      s,
      void 0,
      i
    );
  }
  // ---------------------------------------------------------------------------
  // Request Helpers
  // ---------------------------------------------------------------------------
  /**
   * Cancel all pending requests
   */
  cancelAll() {
    this.abortControllers.forEach((t) => {
      t.abort();
    }), this.abortControllers.clear();
  }
  /**
   * Cancel a specific request by key
   */
  cancel(t) {
    const e = this.abortControllers.get(t);
    e && (e.abort(), this.abortControllers.delete(t));
  }
  async get(t, e = {}, s) {
    const i = this.buildUrl(t, e), r = new AbortController(), a = () => r.abort();
    s && (s.aborted ? r.abort() : s.addEventListener("abort", a, { once: !0 })), this.abortControllers.set(t, r);
    try {
      const l = await this.fetchWithTimeout(i, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.config.headers
        },
        signal: r.signal
      }, t);
      return this.handleResponse(l);
    } finally {
      s && s.removeEventListener("abort", a), this.abortControllers.delete(t);
    }
  }
  async post(t, e, s, i) {
    const r = this.buildUrl(t), a = new AbortController();
    this.abortControllers.set(t, a);
    const l = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
      ...i
    }, c = s && s.trim() || this.createIdempotencyKey(t);
    l["Idempotency-Key"] = c;
    try {
      const d = await this.fetchWithTimeout(r, {
        method: "POST",
        headers: l,
        body: JSON.stringify(e),
        signal: a.signal
      }, t);
      return this.handleResponse(d);
    } finally {
      this.abortControllers.delete(t);
    }
  }
  buildUrl(t, e = {}) {
    const s = this.config.basePath.replace(/\/$/, ""), i = new URL(`${s}${t}`, Et());
    for (const [r, a] of Object.entries(e))
      a != null && a !== "" && i.searchParams.set(r, String(a));
    return i.toString();
  }
  async fetchWithTimeout(t, e, s) {
    const i = setTimeout(() => {
      this.abortControllers.get(s)?.abort();
    }, this.config.timeout);
    try {
      return await fetch(t, e);
    } finally {
      clearTimeout(i);
    }
  }
  createIdempotencyKey(t) {
    const e = t.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "request", s = typeof globalThis < "u" ? globalThis.crypto : void 0;
    return s && typeof s.randomUUID == "function" ? `services_${e}_${s.randomUUID()}` : `services_${e}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  async handleResponse(t) {
    if (!t.ok) {
      let e;
      try {
        e = await t.json();
      } catch {
        e = { error: t.statusText };
      }
      const s = I.fromResponse(t.status, e);
      throw this.config.onError?.(s), s;
    }
    return t.json();
  }
  buildListParams(t) {
    const e = {};
    for (const [s, i] of Object.entries(t))
      i == null || i === "" || (Array.isArray(i) ? i.length > 0 && (e[s] = i.join(",")) : e[s] = i);
    return e;
  }
  buildActivityParams(t) {
    const e = this.buildListParams(t);
    return t.page !== void 0 && t.per_page !== void 0 ? (e.offset = (t.page - 1) * t.per_page, e.limit = t.per_page, delete e.page, delete e.per_page) : t.per_page !== void 0 && (e.limit = t.per_page, delete e.per_page), e;
  }
}
let j = null;
function E() {
  return j || (j = new bt()), j;
}
function ne(n) {
  j = n;
}
function ae(n = {}) {
  return new bt(n);
}
const qt = {
  defaultPage: 1,
  defaultPerPage: 25,
  searchDelay: 300,
  useReplaceState: !1
};
function Z() {
  if (typeof window < "u")
    return window;
}
function at() {
  return typeof globalThis > "u" ? void 0 : globalThis.localStorage;
}
class O {
  constructor(t = {}) {
    this.searchTimeout = null, this.initialized = !1, this.config = {
      ...qt,
      ...t.config
    }, this.filterFields = new Set(t.filterFields || []), this.dateFields = new Set(t.dateFields || []), this.storageKey = t.storageKey || null, this.state = {
      page: this.config.defaultPage,
      per_page: this.config.defaultPerPage,
      search: "",
      filters: {}
    };
  }
  /**
   * Initialize the query state manager
   * Restores state from URL and/or localStorage
   */
  init() {
    return this.initialized ? this.state : (this.restoreFromURL(), this.restoreFromStorage(), this.initialized = !0, this.state);
  }
  /**
   * Get the current state
   */
  getState() {
    return { ...this.state, filters: { ...this.state.filters } };
  }
  /**
   * Get state as API query parameters
   */
  getQueryParams() {
    const t = {};
    t.page = this.state.page, t.per_page = this.state.per_page, this.state.search && (t.q = this.state.search), this.state.sort_field && (t.sort_field = this.state.sort_field, this.state.sort_order && (t.sort_order = this.state.sort_order));
    for (const [e, s] of Object.entries(this.state.filters))
      if (s != null && s !== "")
        if (this.dateFields.has(e)) {
          const i = this.toRFC3339(s);
          i && (t[e] = i);
        } else
          t[e] = s;
    return t;
  }
  /**
   * Set the current page
   */
  setPage(t) {
    const e = Math.max(1, t);
    this.state.page !== e && (this.state.page = e, this.syncToURL(), this.notifyChange());
  }
  /**
   * Set items per page
   */
  setPerPage(t) {
    const e = Math.max(1, t);
    this.state.per_page !== e && (this.state.per_page = e, this.state.page = 1, this.syncToURL(), this.saveToStorage(), this.notifyChange());
  }
  /**
   * Set search term with debouncing
   */
  setSearch(t) {
    this.searchTimeout && clearTimeout(this.searchTimeout), this.state.search !== t && (this.state.search = t, this.state.page = 1), this.searchTimeout = setTimeout(() => {
      this.searchTimeout = null, this.syncToURL(), this.notifyChange();
    }, this.config.searchDelay);
  }
  /**
   * Set search term immediately (no debouncing)
   */
  setSearchImmediate(t) {
    this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.state.search !== t && (this.state.search = t, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  /**
   * Set a single filter value
   */
  setFilter(t, e) {
    this.state.filters[t] !== e && (e == null || e === "" ? delete this.state.filters[t] : this.state.filters[t] = e, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  /**
   * Set multiple filters at once
   */
  setFilters(t) {
    let e = !1;
    for (const [s, i] of Object.entries(t))
      this.state.filters[s] !== i && (i == null || i === "" ? delete this.state.filters[s] : this.state.filters[s] = i, e = !0);
    e && (this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  /**
   * Set sort field and order
   */
  setSort(t, e = "asc") {
    (this.state.sort_field !== t || this.state.sort_order !== e) && (this.state.sort_field = t, this.state.sort_order = t ? e : void 0, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  /**
   * Reset all state to defaults
   */
  reset() {
    this.state = {
      page: this.config.defaultPage,
      per_page: this.state.per_page,
      // Keep per_page preference
      search: "",
      filters: {}
    }, this.syncToURL(), this.notifyChange();
  }
  /**
   * Reset filters only
   */
  resetFilters() {
    Object.keys(this.state.filters).length > 0 && (this.state.filters = {}, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  /**
   * Check if any filters are active
   */
  hasActiveFilters() {
    return Object.values(this.state.filters).some(
      (t) => t != null && t !== ""
    );
  }
  /**
   * Get the count of active filters
   */
  getActiveFilterCount() {
    return Object.values(this.state.filters).filter(
      (t) => t != null && t !== ""
    ).length;
  }
  /**
   * Navigate to next page
   */
  nextPage() {
    this.setPage(this.state.page + 1);
  }
  /**
   * Navigate to previous page
   */
  prevPage() {
    this.setPage(this.state.page - 1);
  }
  /**
   * Update pagination info based on API response
   */
  updateFromResponse(t, e) {
    const s = Math.ceil(t / this.state.per_page);
    this.state.page > s && s > 0 && this.setPage(s);
  }
  /**
   * Destroy the manager and clean up
   */
  destroy() {
    this.searchTimeout && clearTimeout(this.searchTimeout);
  }
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  restoreFromURL() {
    const t = Z();
    if (!t?.location)
      return;
    const e = new URLSearchParams(t.location.search), s = e.get("page");
    if (s) {
      const c = parseInt(s, 10);
      !Number.isNaN(c) && c > 0 && (this.state.page = c);
    }
    const i = e.get("per_page");
    if (i) {
      const c = parseInt(i, 10);
      !Number.isNaN(c) && c > 0 && (this.state.per_page = c);
    }
    const r = e.get("q") || e.get("search");
    r && (this.state.search = r);
    const a = e.get("sort_field"), l = e.get("sort_order");
    a && (this.state.sort_field = a, this.state.sort_order = l === "desc" ? "desc" : "asc");
    for (const c of this.filterFields) {
      const d = e.get(String(c));
      d !== null && (this.dateFields.has(c) ? this.state.filters[c] = this.toLocalInput(d) : this.state.filters[c] = d);
    }
  }
  restoreFromStorage() {
    if (!this.storageKey) return;
    const t = at(), e = Z();
    if (t)
      try {
        const s = t.getItem(this.storageKey);
        if (s) {
          const i = JSON.parse(s);
          typeof i.per_page == "number" && i.per_page > 0 && (new URLSearchParams(e?.location?.search || "").has("per_page") || (this.state.per_page = i.per_page));
        }
      } catch (s) {
        console.warn("[QueryStateManager] Failed to restore from localStorage:", s);
      }
  }
  saveToStorage() {
    if (!this.storageKey) return;
    const t = at();
    if (t)
      try {
        t.setItem(
          this.storageKey,
          JSON.stringify({ per_page: this.state.per_page })
        );
      } catch (e) {
        console.warn("[QueryStateManager] Failed to save to localStorage:", e);
      }
  }
  syncToURL() {
    const t = Z();
    if (!t?.location || !t.history)
      return;
    const e = new URLSearchParams();
    this.state.page > 1 && e.set("page", String(this.state.page)), this.state.per_page !== this.config.defaultPerPage && e.set("per_page", String(this.state.per_page)), this.state.search && e.set("q", this.state.search), this.state.sort_field && (e.set("sort_field", this.state.sort_field), this.state.sort_order && e.set("sort_order", this.state.sort_order));
    for (const [i, r] of Object.entries(this.state.filters))
      if (r != null && r !== "")
        if (this.dateFields.has(i)) {
          const a = this.toRFC3339(r);
          a && e.set(i, a);
        } else
          e.set(i, r);
    const s = e.toString() ? `${t.location.pathname}?${e.toString()}` : t.location.pathname;
    this.config.useReplaceState ? t.history.replaceState({}, "", s) : t.history.pushState({}, "", s);
  }
  notifyChange() {
    this.config.onChange?.(this.getState());
  }
  toRFC3339(t) {
    if (!t) return "";
    const e = new Date(t);
    return Number.isNaN(e.getTime()) ? "" : e.toISOString();
  }
  toLocalInput(t) {
    if (!t) return "";
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = e.getTimezoneOffset() * 6e4;
    return new Date(e.getTime() - s).toISOString().slice(0, 16);
  }
}
function oe(n, t) {
  let e = null;
  return Object.assign((...r) => {
    e && clearTimeout(e), e = setTimeout(() => {
      n(...r), e = null;
    }, t);
  }, { cancel: () => {
    e && (clearTimeout(e), e = null);
  } });
}
function ce(n, t) {
  if (!("filters" in n)) {
    const a = n, l = new URLSearchParams();
    for (const [c, d] of Object.entries(a))
      d != null && d !== "" && l.set(c, String(d));
    return l;
  }
  const e = n, s = new URLSearchParams(), { includePage: i = !0, includeDefaults: r = !1 } = t || {};
  i && (e.page > 1 || r) && s.set("page", String(e.page)), (e.per_page !== 25 || r) && s.set("per_page", String(e.per_page)), e.search && s.set("q", e.search), e.sort_field && (s.set("sort_field", e.sort_field), e.sort_order && s.set("sort_order", e.sort_order));
  for (const [a, l] of Object.entries(e.filters))
    l != null && l !== "" && s.set(a, l);
  return s;
}
function le(n, t, e) {
  if (!e) {
    const c = {};
    for (const d of t) {
      const p = n.get(String(d));
      p !== null && (c[String(d)] = p);
    }
    for (const d of ["page", "per_page", "q", "search", "sort_field", "sort_order"]) {
      const p = n.get(d);
      p !== null && (c[d] = p);
    }
    return c;
  }
  const s = {
    page: e?.page ?? 1,
    per_page: e?.per_page ?? 25,
    search: e?.search ?? "",
    filters: {},
    ...e
  }, i = n.get("page");
  if (i) {
    const c = parseInt(i, 10);
    Number.isNaN(c) || (s.page = Math.max(1, c));
  }
  const r = n.get("per_page");
  if (r) {
    const c = parseInt(r, 10);
    Number.isNaN(c) || (s.per_page = Math.max(1, c));
  }
  const a = n.get("q") || n.get("search");
  a && (s.search = a);
  const l = n.get("sort_field");
  l && (s.sort_field = l, s.sort_order = n.get("sort_order") === "desc" ? "desc" : "asc");
  for (const c of t) {
    const d = n.get(String(c));
    d !== null && (s.filters[c] = d);
  }
  return s;
}
class B {
  constructor() {
    this.state = {
      granted: /* @__PURE__ */ new Set(),
      loaded: !1
    }, this.loadPromise = null, this.listeners = /* @__PURE__ */ new Set();
  }
  /**
   * Initialize the permission manager with granted permissions
   */
  init(t) {
    this.state = {
      granted: new Set(t),
      loaded: !0
    }, this.notifyListeners();
  }
  /**
   * Back-compat alias used by the test and page surface.
   */
  setPermissions(t) {
    this.init(t);
  }
  /**
   * Load permissions from the server
   * Typically done by parsing user permissions from page context or API
   */
  async load(t) {
    return this.loadPromise ? this.loadPromise : (this.loadPromise = (async () => {
      try {
        const e = await t();
        this.state = {
          granted: new Set(e),
          loaded: !0
        };
      } catch (e) {
        this.state = {
          ...this.state,
          loaded: !0,
          error: e instanceof Error ? e : new Error(String(e))
        };
      } finally {
        this.loadPromise = null, this.notifyListeners();
      }
    })(), this.loadPromise);
  }
  /**
   * Check if user has a specific permission
   */
  has(t) {
    return this.state.granted.has(t);
  }
  /**
   * Back-compat alias used by the older services API shape.
   */
  can(t) {
    return this.has(t);
  }
  /**
   * Check if user has all specified permissions
   */
  hasAll(t) {
    return t.every((e) => this.state.granted.has(e));
  }
  /**
   * Back-compat alias used by the older services API shape.
   */
  canAll(t) {
    return this.hasAll(t);
  }
  /**
   * Check if user has any of the specified permissions
   */
  hasAny(t) {
    return t.some((e) => this.state.granted.has(e));
  }
  /**
   * Back-compat alias used by the older services API shape.
   */
  canAny(t) {
    return this.hasAny(t);
  }
  /**
   * Check a single permission and return detailed result
   */
  check(t) {
    const e = this.state.granted.has(t);
    return {
      allowed: e,
      permission: t,
      reason: e ? void 0 : `Missing permission: ${t}`
    };
  }
  /**
   * Get missing permissions from a required set
   */
  getMissing(t) {
    return t.filter((e) => !this.state.granted.has(e));
  }
  /**
   * Check if permissions have been loaded
   */
  isLoaded() {
    return this.state.loaded;
  }
  /**
   * Get the current state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Subscribe to state changes
   */
  subscribe(t) {
    return this.listeners.add(t), () => this.listeners.delete(t);
  }
  /**
   * Reset the manager state
   */
  reset() {
    this.state = {
      granted: /* @__PURE__ */ new Set(),
      loaded: !1
    }, this.loadPromise = null, this.notifyListeners();
  }
  notifyListeners() {
    const t = this.getState();
    this.listeners.forEach((e) => e(t));
  }
}
let X = null;
function C() {
  return X || (X = new B()), X;
}
function de(n) {
  C().init(n);
}
function q(n, t) {
  return (e) => {
    const s = e instanceof B ? e : t || C(), i = Array.isArray(n) ? n : [n];
    return () => s.hasAll(i);
  };
}
function ue(n, t) {
  return (e) => {
    const s = e instanceof B ? e : t || C();
    return () => s.hasAll(n);
  };
}
function he(n, t) {
  return (e) => {
    const s = e instanceof B ? e : t || C();
    return () => s.hasAny(n);
  };
}
function pe(...n) {
  const t = n.flatMap((e) => Array.isArray(e) ? e : [e]);
  return (e) => () => t.every((s) => s(e)());
}
function F(n) {
  return q(_.VIEW, n)();
}
function k(n) {
  return q(_.CONNECT, n)();
}
function A(n) {
  return q(_.EDIT, n)();
}
function rt(n) {
  return q(_.REVOKE, n)();
}
function yt(n) {
  return q(_.RECONSENT, n)();
}
function At(n) {
  return q(_.ACTIVITY_VIEW, n)();
}
function Rt(n) {
  if (n instanceof I)
    return n.isForbidden;
  if (!n || typeof n != "object")
    return !1;
  const t = n;
  return t.isForbidden === !0 || t.statusCode === 403 || t.code === "FORBIDDEN";
}
function ge(n, t) {
  return Rt(n) ? (t(n), !0) : !1;
}
function fe(n, t, e, s) {
  const i = s || C();
  return async () => {
    if (!i.has(n)) {
      e?.();
      return;
    }
    return t();
  };
}
function tt(n, t, e) {
  const s = e || C(), { requires: i = [], requiresAny: r = [], onDenied: a, disableOnDenied: l } = t;
  let c = !0, d = [];
  i.length > 0 ? (d = s.getMissing(i), c = d.length === 0) : r.length > 0 && (c = s.hasAny(r), c || (d = r)), c || (l ? ((n instanceof HTMLButtonElement || n instanceof HTMLInputElement) && (n.disabled = !0), n.classList.add("permission-denied", "opacity-50", "cursor-not-allowed"), n.setAttribute("title", `Permission required: ${d.join(", ")}`)) : (n.style.display = "none", n.classList.add("permission-hidden")), t.deniedContent && (typeof t.deniedContent == "string" ? n.outerHTML = t.deniedContent : n.replaceWith(t.deniedContent)), a?.(d));
}
function be(n = document.body, t) {
  n.querySelectorAll("[data-permission-requires]").forEach((r) => {
    const a = r.dataset.permissionRequires?.split(",").map((l) => l.trim());
    a && a.length > 0 && tt(r, { requires: a }, t);
  }), n.querySelectorAll("[data-permission-requires-any]").forEach((r) => {
    const a = r.dataset.permissionRequiresAny?.split(",").map((l) => l.trim());
    a && a.length > 0 && tt(r, { requiresAny: a }, t);
  }), n.querySelectorAll("[data-permission-disable]").forEach((r) => {
    const a = r.dataset.permissionDisable?.split(",").map((l) => l.trim());
    a && a.length > 0 && tt(r, { requires: a, disableOnDenied: !0 }, t);
  });
}
function Pt() {
  if (typeof window > "u" || typeof document > "u")
    return [];
  const n = window.__permissions;
  if (Array.isArray(n))
    return n.filter(
      (e) => Object.values(_).includes(e)
    );
  const t = document.body.dataset.permissions;
  if (t)
    try {
      const e = JSON.parse(t);
      if (Array.isArray(e))
        return e.filter(
          (s) => Object.values(_).includes(s)
        );
    } catch {
    }
  return [];
}
function ye() {
  const n = Pt(), t = C();
  return t.init(n), t;
}
const mt = {
  providers: {
    icon: "iconoir:plug",
    title: "No providers available",
    message: "No service providers are currently configured."
  },
  connections: {
    icon: "iconoir:link",
    title: "No connections found",
    message: "Connect a service to get started."
  },
  installations: {
    icon: "iconoir:download",
    title: "No installations found",
    message: "Install a service to get started."
  },
  subscriptions: {
    icon: "iconoir:bell-off",
    title: "No subscriptions found",
    message: "Subscriptions will appear here when created."
  },
  sync: {
    icon: "iconoir:sync",
    title: "No sync jobs found",
    message: "Sync jobs will appear here when syncs are triggered."
  },
  activity: {
    icon: "iconoir:activity",
    title: "No activity found",
    message: "Activity entries will appear here as actions occur."
  },
  generic: {
    icon: "iconoir:folder-empty",
    title: "No data",
    message: "Nothing to display."
  }
};
function z(n = {}) {
  const { text: t = "Loading...", size: e = "md", containerClass: s = "" } = n, r = {
    sm: { spinner: "h-4 w-4", text: "text-xs", py: "py-4" },
    md: { spinner: "h-5 w-5", text: "text-sm", py: "py-8" },
    lg: { spinner: "h-8 w-8", text: "text-base", py: "py-16" }
  }[e];
  return `
    <div class="ui-state ui-state-loading flex items-center justify-center ${r.py} ${s}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <svg class="animate-spin ${r.spinner}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="${r.text}">${o(t)}</span>
      </div>
    </div>
  `;
}
function xt(n = {}) {
  const t = mt[n.type || "generic"], {
    icon: e = t.icon,
    iconClass: s = "text-gray-400",
    title: i = t.title,
    message: r = t.message,
    containerClass: a = "",
    action: l
  } = n;
  return `
    <div class="ui-state ui-state-empty flex items-center justify-center py-12 ${a}" role="status" aria-label="Empty">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${u(e, { size: "24px", extraClass: s })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${o(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${o(r)}</p>
        </div>
        ${l ? St(l) : ""}
      </div>
    </div>
  `;
}
function vt(n = {}) {
  const {
    icon: t = "iconoir:search",
    iconClass: e = "text-gray-400",
    title: s = "No results found",
    query: i,
    filterCount: r = 0,
    containerClass: a = "",
    onReset: l
  } = n;
  let c = n.message;
  return c || (i && r > 0 ? c = `No items match "${i}" with ${r} filter${r > 1 ? "s" : ""} applied.` : i ? c = `No items match "${i}".` : r > 0 ? c = `No items match the ${r} filter${r > 1 ? "s" : ""} applied.` : c = "Try adjusting your search or filters."), `
    <div class="ui-state ui-state-no-results flex items-center justify-center py-12 ${a}" role="status" aria-label="No results">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${u(t, { size: "24px", extraClass: e })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${o(s)}</h3>
          <p class="text-sm text-gray-500 mt-1">${o(c)}</p>
        </div>
        ${l ? `
          <button type="button" class="ui-state-reset-btn px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
            Clear filters
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function V(n = {}) {
  const {
    icon: t = "iconoir:warning-triangle",
    iconClass: e = "text-red-500",
    title: s = "Something went wrong",
    error: i,
    compact: r = !1,
    containerClass: a = "",
    showRetry: l = !0,
    retryText: c = "Try again"
  } = n, d = n.message || i?.message || "An unexpected error occurred. Please try again.";
  return r ? `
      <div class="ui-state ui-state-error ui-state-error-compact p-4 ${a}" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-red-500" aria-hidden="true">
            ${u(t, { size: "20px", extraClass: e })}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800">${o(s)}</p>
            <p class="text-sm text-red-700 mt-1">${o(d)}</p>
          </div>
          ${l ? `
            <button type="button" class="ui-state-retry-btn flex-shrink-0 text-sm text-red-600 hover:text-red-700 font-medium">
              ${o(c)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : `
    <div class="ui-state ui-state-error flex items-center justify-center py-16 ${a}" role="alert">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
          ${u(t, { size: "24px", extraClass: e })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${o(s)}</h3>
          <p class="text-sm text-gray-500 mt-1">${o(d)}</p>
        </div>
        ${l ? `
          <button type="button" class="ui-state-retry-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            ${o(c)}
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function L(n = {}) {
  const {
    icon: t = "iconoir:lock",
    iconClass: e = "text-amber-500",
    title: s = "Access Denied",
    resource: i,
    permission: r,
    containerClass: a = "",
    action: l
  } = n;
  let c = n.message;
  return c || (i && r ? c = `You need the "${r}" permission to view ${i}.` : i ? c = `You don't have permission to view ${i}.` : c = "You don't have permission to access this resource."), `
    <div class="ui-state ui-state-forbidden flex items-center justify-center py-16 ${a}" role="alert" aria-label="Access denied">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
          ${u(t, { size: "24px", extraClass: e })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${o(s)}</h3>
          <p class="text-sm text-gray-500 mt-1">${o(c)}</p>
        </div>
        ${l ? St(l) : ""}
      </div>
    </div>
  `;
}
function W(n, t = {}) {
  const { text: e = "Loading...", containerClass: s = "" } = t;
  return `
    <tr class="ui-state ui-state-table-loading ${s}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-500" aria-busy="true">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">${o(e)}</span>
        </div>
      </td>
    </tr>
  `;
}
function G(n, t = {}) {
  const {
    icon: e = "iconoir:warning-triangle",
    iconClass: s = "text-red-500",
    title: i = "Failed to load data",
    error: r,
    containerClass: a = "",
    showRetry: l = !0,
    retryText: c = "Try again"
  } = t, d = t.message || r?.message || "An error occurred while loading.";
  return `
    <tr class="ui-state ui-state-table-error ${a}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="text-red-500 mb-2" aria-hidden="true">
          ${u(e, { size: "24px", extraClass: s })}
        </div>
        <p class="text-sm font-medium text-gray-900">${o(i)}</p>
        <p class="text-sm text-gray-500 mt-1">${o(d)}</p>
        ${l ? `
          <button type="button" class="ui-state-retry-btn mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            ${o(c)}
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
function me(n, t = {}) {
  const e = mt[t.type || "generic"], {
    icon: s = e.icon,
    iconClass: i = "text-gray-400",
    title: r = e.title,
    message: a = e.message,
    containerClass: l = ""
  } = t;
  return `
    <tr class="ui-state ui-state-table-empty ${l}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${u(s, { size: "24px", extraClass: i })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${o(r)}</h3>
        <p class="text-sm text-gray-500 mt-1">${o(a)}</p>
      </td>
    </tr>
  `;
}
function R(n, t = {}) {
  const {
    icon: e = "iconoir:search",
    iconClass: s = "text-gray-400",
    title: i = "No results found",
    query: r,
    filterCount: a = 0,
    containerClass: l = "",
    onReset: c
  } = t;
  let d = t.message;
  return d || (r && a > 0 ? d = `No items match "${r}" with ${a} filter${a > 1 ? "s" : ""} applied.` : r ? d = `No items match "${r}".` : a > 0 ? d = `No items match the ${a} filter${a > 1 ? "s" : ""} applied.` : d = "Try adjusting your search or filters."), `
    <tr class="ui-state ui-state-table-no-results ${l}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${u(e, { size: "24px", extraClass: s })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${o(i)}</h3>
        <p class="text-sm text-gray-500 mt-1">${o(d)}</p>
        ${c ? `
          <button type="button" class="ui-state-reset-btn mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
class xe {
  constructor(t) {
    this.currentState = "loading", this.container = t.container, this.config = t;
  }
  /**
   * Show loading state
   */
  showLoading(t) {
    this.currentState = "loading", this.container.innerHTML = z(t);
  }
  /**
   * Show empty state (no data)
   */
  showEmpty(t) {
    this.currentState = "empty", this.container.innerHTML = xt(t);
  }
  /**
   * Show no-results state (filters returned nothing)
   */
  showNoResults(t) {
    this.currentState = "no-results";
    const e = { ...t, onReset: t?.onReset || this.config.onReset };
    this.container.innerHTML = vt(e), this.bindResetHandler();
  }
  /**
   * Show error state
   */
  showError(t) {
    this.currentState = "error";
    const e = { ...t, onRetry: t?.onRetry || this.config.onRetry };
    this.container.innerHTML = V(e), this.bindRetryHandler();
  }
  /**
   * Show forbidden state
   */
  showForbidden(t) {
    this.currentState = "forbidden", this.container.innerHTML = L(t);
  }
  /**
   * Show content (clears any state and allows content rendering)
   */
  showContent() {
    this.currentState = "content";
  }
  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }
  /**
   * Check if currently showing loading
   */
  isLoading() {
    return this.currentState === "loading";
  }
  /**
   * Check if showing error
   */
  hasError() {
    return this.currentState === "error";
  }
  bindRetryHandler() {
    this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => {
      this.config.onRetry?.();
    });
  }
  bindResetHandler() {
    this.container.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.config.onReset?.();
    });
  }
}
function St(n) {
  return `
    <button type="button" class="ui-state-action-btn px-4 py-2 text-sm font-medium rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${{
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  }[n.variant || "primary"]}">
      ${o(n.text)}
    </button>
  `;
}
class It {
  constructor(t) {
    this.state = "idle", this.feedbackTimeout = null, this.button = t.button, this.originalHTML = this.button.innerHTML, this.originalDisabled = this.button.disabled, this.config = {
      loadingText: t.loadingText ?? "Processing...",
      successText: t.successText ?? "Done",
      errorText: t.errorText ?? "Failed",
      feedbackDuration: t.feedbackDuration ?? 2e3,
      disableOnLoading: t.disableOnLoading ?? !0,
      showSpinner: t.showSpinner ?? !0
    };
  }
  /** Get current state */
  getState() {
    return this.state;
  }
  /** Set button to loading state */
  setLoading() {
    this.clearFeedbackTimeout(), this.state = "loading", this.config.disableOnLoading && (this.button.disabled = !0), this.button.classList.add("mutation-loading"), this.button.classList.remove("mutation-success", "mutation-error");
    const t = this.config.showSpinner ? `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>` : "";
    this.button.innerHTML = `${t}<span>${o(this.config.loadingText)}</span>`;
  }
  /** Set button to success state (briefly shows success, then returns to idle) */
  setSuccess() {
    this.clearFeedbackTimeout(), this.state = "success", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-error"), this.button.classList.add("mutation-success"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${o(this.config.successText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  /** Set button to error state */
  setError() {
    this.clearFeedbackTimeout(), this.state = "error", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success"), this.button.classList.add("mutation-error"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>${o(this.config.errorText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  /** Reset button to original state */
  reset() {
    this.clearFeedbackTimeout(), this.state = "idle", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success", "mutation-error"), this.button.innerHTML = this.originalHTML;
  }
  /** Destroy and cleanup */
  destroy() {
    this.clearFeedbackTimeout(), this.reset();
  }
  clearFeedbackTimeout() {
    this.feedbackTimeout && (clearTimeout(this.feedbackTimeout), this.feedbackTimeout = null);
  }
}
async function S(n) {
  const {
    mutation: t,
    notifier: e,
    successMessage: s,
    errorMessagePrefix: i = "Operation failed",
    buttonConfig: r,
    onSuccess: a,
    onError: l,
    showInlineRetry: c = !1,
    retryContainer: d
  } = n, p = r ? new It(r) : null;
  try {
    p?.setLoading();
    const h = await t();
    if (p?.setSuccess(), e && s) {
      const g = typeof s == "function" ? s(h) : s;
      e.success(g);
    }
    return d && it(d), await a?.(h), { success: !0, result: h };
  } catch (h) {
    const g = h instanceof Error ? h : new Error(String(h));
    return p?.setError(), e && e.error(`${i}: ${g.message}`), c && d && Ft({
      container: d,
      action: () => S(n).then(() => {
      }),
      errorMessage: `${i}: ${g.message}`,
      onDismiss: () => it(d)
    }), l?.(g), { success: !1, error: g };
  }
}
async function ve(n) {
  const { confirmMessage: t, confirmOptions: e, ...s } = n;
  return await ft.confirm(t, {
    title: e?.title ?? "Confirm Action",
    confirmText: e?.confirmText ?? "Confirm",
    cancelText: e?.cancelText ?? "Cancel",
    confirmVariant: e?.variant ?? "primary"
  }) ? { ...await S(s), cancelled: !1 } : { success: !1, cancelled: !0 };
}
function Ft(n) {
  const {
    container: t,
    action: e,
    errorMessage: s,
    retryText: i = "Retry",
    dismissText: r = "Dismiss",
    onDismiss: a
  } = n;
  t.innerHTML = `
    <div class="mutation-retry-ui flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div class="flex-shrink-0 text-red-500" aria-hidden="true">
        ${u("iconoir:warning-triangle", { size: "20px" })}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-red-700">${o(s)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button"
                  class="mutation-retry-btn px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors">
            ${o(i)}
          </button>
          <button type="button"
                  class="mutation-dismiss-btn px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
            ${o(r)}
          </button>
        </div>
      </div>
    </div>
  `;
  const l = t.querySelector(".mutation-retry-btn"), c = t.querySelector(".mutation-dismiss-btn");
  l?.addEventListener("click", async () => {
    const d = l, p = d.textContent;
    d.disabled = !0, d.innerHTML = `
      <svg class="animate-spin h-3 w-3 inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Retrying...
    `;
    try {
      await e();
    } finally {
      d.disabled = !1, d.textContent = p;
    }
  }), c?.addEventListener("click", () => {
    it(t), a?.();
  });
}
function it(n) {
  n.querySelector(".mutation-retry-ui")?.remove();
}
function Mt(n) {
  const { action: t, resourceType: e, resourceName: s, additionalContext: i } = n, r = {
    revoke: { verb: "revoke", noun: "Revoke", variant: "danger" },
    disconnect: { verb: "disconnect", noun: "Disconnect", variant: "danger" },
    uninstall: { verb: "uninstall", noun: "Uninstall", variant: "danger" },
    cancel: { verb: "cancel", noun: "Cancel", variant: "danger" },
    delete: { verb: "delete", noun: "Delete", variant: "danger" },
    refresh: { verb: "refresh", noun: "Refresh", variant: "primary" }
  }, a = {
    connection: "connection",
    installation: "installation",
    subscription: "subscription",
    sync: "sync job"
  }, l = r[t] || { verb: t, noun: t, variant: "primary" }, c = a[e] || e;
  let d = `Are you sure you want to ${l.verb} this ${c}`;
  return s && (d += ` (${s})`), d += "?", i && (d += ` ${i}`), l.variant === "danger" && (d += " This action cannot be undone."), {
    message: d,
    options: {
      title: `${l.noun} ${c.charAt(0).toUpperCase() + c.slice(1)}`,
      confirmText: l.noun,
      cancelText: "Cancel",
      variant: l.variant
    }
  };
}
async function Q(n) {
  const { message: t, options: e } = Mt(n);
  return ft.confirm(t, e);
}
class J {
  constructor() {
    this.inFlight = /* @__PURE__ */ new Set();
  }
  /**
   * Check if an action is currently in flight.
   */
  isInFlight(t) {
    return this.inFlight.has(t);
  }
  /**
   * Execute an action with duplicate prevention.
   * Returns undefined if action is already in flight.
   */
  async execute(t, e) {
    if (!this.inFlight.has(t)) {
      this.inFlight.add(t);
      try {
        return await e();
      } finally {
        this.inFlight.delete(t);
      }
    }
  }
  /**
   * Clear all in-flight actions.
   */
  clear() {
    this.inFlight.clear();
  }
}
const M = {
  // Connection lifecycle
  connected: {
    action: "connected",
    label: "Connected",
    description: "Service connection established",
    category: "connections"
  },
  disconnected: {
    action: "disconnected",
    label: "Disconnected",
    description: "Service connection terminated",
    category: "connections"
  },
  refreshed: {
    action: "refreshed",
    label: "Credentials Refreshed",
    description: "Connection credentials were refreshed",
    category: "credentials"
  },
  revoked: {
    action: "revoked",
    label: "Connection Revoked",
    description: "Connection access was revoked",
    category: "connections"
  },
  reconsent_started: {
    action: "reconsent_started",
    label: "Re-consent Started",
    description: "User initiated re-authorization",
    category: "connections"
  },
  reconsent_completed: {
    action: "reconsent_completed",
    label: "Re-consent Completed",
    description: "User completed re-authorization",
    category: "connections"
  },
  reconsent_failed: {
    action: "reconsent_failed",
    label: "Re-consent Failed",
    description: "Re-authorization could not be completed",
    category: "connections"
  },
  // Sync operations
  sync_started: {
    action: "sync_started",
    label: "Sync Started",
    description: "Data synchronization began",
    category: "sync"
  },
  sync_completed: {
    action: "sync_completed",
    label: "Sync Completed",
    description: "Data synchronization finished successfully",
    category: "sync"
  },
  sync_failed: {
    action: "sync_failed",
    label: "Sync Failed",
    description: "Data synchronization encountered an error",
    category: "sync"
  },
  sync_progress: {
    action: "sync_progress",
    label: "Sync Progress",
    description: "Data synchronization progress update",
    category: "sync"
  },
  // Webhook events
  webhook_received: {
    action: "webhook_received",
    label: "Webhook Received",
    description: "Inbound webhook notification received",
    category: "webhooks"
  },
  webhook_processed: {
    action: "webhook_processed",
    label: "Webhook Processed",
    description: "Webhook notification was processed",
    category: "webhooks"
  },
  webhook_failed: {
    action: "webhook_failed",
    label: "Webhook Failed",
    description: "Webhook processing failed",
    category: "webhooks"
  },
  webhook_retried: {
    action: "webhook_retried",
    label: "Webhook Retried",
    description: "Webhook processing was retried",
    category: "webhooks"
  },
  // Subscription events
  subscription_created: {
    action: "subscription_created",
    label: "Subscription Created",
    description: "Event subscription was established",
    category: "subscriptions"
  },
  subscription_renewed: {
    action: "subscription_renewed",
    label: "Subscription Renewed",
    description: "Event subscription was renewed",
    category: "subscriptions"
  },
  subscription_expired: {
    action: "subscription_expired",
    label: "Subscription Expired",
    description: "Event subscription has expired",
    category: "subscriptions"
  },
  subscription_cancelled: {
    action: "subscription_cancelled",
    label: "Subscription Cancelled",
    description: "Event subscription was cancelled",
    category: "subscriptions"
  },
  // Installation events
  installed: {
    action: "installed",
    label: "Installed",
    description: "Service was installed",
    category: "installations"
  },
  uninstalled: {
    action: "uninstalled",
    label: "Uninstalled",
    description: "Service was uninstalled",
    category: "installations"
  },
  reinstalled: {
    action: "reinstalled",
    label: "Reinstalled",
    description: "Service was reinstalled",
    category: "installations"
  },
  // Grant/permission events
  grants_updated: {
    action: "grants_updated",
    label: "Permissions Updated",
    description: "Connection permissions were modified",
    category: "grants"
  },
  grants_captured: {
    action: "grants_captured",
    label: "Permissions Captured",
    description: "Connection permissions were recorded",
    category: "grants"
  },
  // Token events
  token_refreshed: {
    action: "token_refreshed",
    label: "Token Refreshed",
    description: "Access token was refreshed",
    category: "credentials"
  },
  token_expired: {
    action: "token_expired",
    label: "Token Expired",
    description: "Access token has expired",
    category: "credentials"
  },
  token_revoked: {
    action: "token_revoked",
    label: "Token Revoked",
    description: "Access token was revoked",
    category: "credentials"
  },
  // Error events
  error_occurred: {
    action: "error_occurred",
    label: "Error Occurred",
    description: "An error was recorded",
    category: "errors"
  },
  error_resolved: {
    action: "error_resolved",
    label: "Error Resolved",
    description: "A previous error was resolved",
    category: "errors"
  },
  // Rate limit events
  rate_limited: {
    action: "rate_limited",
    label: "Rate Limited",
    description: "API request was rate limited",
    category: "errors"
  },
  quota_exceeded: {
    action: "quota_exceeded",
    label: "Quota Exceeded",
    description: "API quota was exceeded",
    category: "errors"
  }
};
class Nt {
  constructor() {
    this.backendLabels = {}, this.initialized = !1, this.fallbackFormatter = ot;
  }
  /**
   * Initialize the registry with backend-provided labels.
   */
  init(t = {}) {
    t.labels && (this.backendLabels = { ...t.labels }), t.fallbackFormatter && (this.fallbackFormatter = t.fallbackFormatter), this.initialized = !0;
  }
  /**
   * Check if registry has been initialized.
   */
  isInitialized() {
    return this.initialized;
  }
  /**
   * Get the label for an action.
   * Priority: backend override > default label > fallback formatter
   */
  getLabel(t) {
    if (this.backendLabels[t])
      return this.backendLabels[t];
    const e = M[t];
    return e ? e.label : this.fallbackFormatter(t);
  }
  /**
   * Get full entry information for an action (includes description, category).
   */
  getEntry(t) {
    const e = M[t];
    return e ? {
      ...e,
      label: this.backendLabels[t] || e.label
    } : null;
  }
  /**
   * Get all known actions with their labels.
   */
  getAllLabels() {
    const t = {};
    for (const [e, s] of Object.entries(M))
      t[e] = s.label;
    for (const [e, s] of Object.entries(this.backendLabels))
      t[e] = s;
    return t;
  }
  /**
   * Get actions by category.
   */
  getActionsByCategory() {
    const t = {};
    for (const e of Object.values(M)) {
      const s = e.category || "other";
      t[s] || (t[s] = []), t[s].push({
        ...e,
        label: this.backendLabels[e.action] || e.label
      });
    }
    return t;
  }
  /**
   * Add or update backend labels.
   */
  setLabels(t) {
    this.backendLabels = { ...this.backendLabels, ...t };
  }
  /**
   * Clear backend labels (keeps defaults).
   */
  clearBackendLabels() {
    this.backendLabels = {};
  }
  /**
   * Reset to initial state.
   */
  reset() {
    this.backendLabels = {}, this.fallbackFormatter = ot, this.initialized = !1;
  }
}
const $ = new Nt();
function Se(n = {}) {
  $.init(n);
}
function jt(n) {
  return $.getLabel(n);
}
function we(n) {
  return $.getEntry(n);
}
function $e() {
  return $.getAllLabels();
}
function Dt() {
  return $.getActionsByCategory();
}
function _e(n) {
  $.setLabels(n);
}
function Ce() {
  return $.isInitialized();
}
function Le() {
  $.reset();
}
function ke(n = {}) {
  return (t) => n[t] ? n[t] : $.getLabel(t);
}
function ot(n) {
  return n.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function Ut(n) {
  const {
    container: t,
    selector: e,
    onSelect: s,
    onFocus: i,
    onEscape: r,
    wrap: a = !0,
    autoFocus: l = !1,
    keyHandlers: c = {}
  } = n;
  function d() {
    return Array.from(t.querySelectorAll(e));
  }
  function p(f) {
    const b = d();
    if (b.length === 0) return;
    let y = f;
    a ? y = (f % b.length + b.length) % b.length : y = Math.max(0, Math.min(f, b.length - 1)), b.forEach(($t, _t) => {
      $t.setAttribute("tabindex", _t === y ? "0" : "-1");
    });
    const x = b[y];
    x.focus(), i?.(x, y);
  }
  function h(f) {
    const b = d();
    if (b.length === 0) return;
    const y = f.target, x = b.indexOf(y);
    if (x !== -1) {
      if (c[f.key]) {
        c[f.key](f, y, x);
        return;
      }
      switch (f.key) {
        case "ArrowDown":
        case "ArrowRight":
          f.preventDefault(), p(x + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          f.preventDefault(), p(x - 1);
          break;
        case "Home":
          f.preventDefault(), p(0);
          break;
        case "End":
          f.preventDefault(), p(b.length - 1);
          break;
        case "Enter":
        case " ":
          f.preventDefault(), s?.(y, x);
          break;
        case "Escape":
          f.preventDefault(), r?.();
          break;
      }
    }
  }
  const g = d();
  return g.forEach((f, b) => {
    f.setAttribute("tabindex", b === 0 ? "0" : "-1"), f.hasAttribute("role") || f.setAttribute("role", "option");
  }), t.hasAttribute("role") || t.setAttribute("role", "listbox"), t.addEventListener("keydown", h), l && g.length > 0 && p(0), () => {
    t.removeEventListener("keydown", h);
  };
}
function Te(n, t) {
  return Ut({
    container: n,
    selector: t,
    wrap: !0,
    onSelect: (e) => {
      e.click();
    }
  });
}
const Ht = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function Ot(n) {
  const { container: t, initialFocus: e, returnFocus: s, onEscape: i } = n, r = document.activeElement;
  function a() {
    return Array.from(t.querySelectorAll(Ht));
  }
  function l(c) {
    if (c.key === "Escape") {
      c.preventDefault(), i?.();
      return;
    }
    if (c.key !== "Tab") return;
    const d = a();
    if (d.length === 0) return;
    const p = d[0], h = d[d.length - 1];
    c.shiftKey ? document.activeElement === p && (c.preventDefault(), h.focus()) : document.activeElement === h && (c.preventDefault(), p.focus());
  }
  return requestAnimationFrame(() => {
    e ? (typeof e == "string" ? t.querySelector(e) : e)?.focus() : a()[0]?.focus();
  }), t.addEventListener("keydown", l), t.hasAttribute("role") || t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), () => {
    t.removeEventListener("keydown", l), t.removeAttribute("aria-modal"), (s || r)?.focus?.();
  };
}
function Bt(n) {
  const t = `services-live-region-${n}`;
  let e = document.getElementById(t);
  return e || (e = document.createElement("div"), e.id = t, e.setAttribute("aria-live", n), e.setAttribute("aria-atomic", "true"), e.setAttribute("role", "status"), e.className = "sr-only", Object.assign(e.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0"
  }), document.body.appendChild(e)), e;
}
function K(n, t = {}) {
  const { priority: e = "polite", clear: s = !0 } = t, i = Bt(e);
  s && (i.textContent = ""), setTimeout(() => {
    i.textContent = n;
  }, 100);
}
function Ee(n) {
  K(`Loading ${n}...`, { priority: "polite" });
}
function qe(n) {
  K(n, { priority: "polite" });
}
function Ae(n) {
  K(`Error: ${n}`, { priority: "assertive" });
}
function Re(n) {
  K(`Navigating to ${n}`, { priority: "polite" });
}
function Pe(n, t, e) {
  n.setAttribute("aria-expanded", String(e));
  const s = typeof t == "string" ? t : t.id;
  s && n.setAttribute("aria-controls", s);
}
function Ie(n, t) {
  n.setAttribute("aria-busy", String(t)), t ? n.setAttribute("aria-describedby", "loading-indicator") : n.removeAttribute("aria-describedby");
}
function Fe(n, t, e) {
  n.setAttribute("role", "status"), n.setAttribute("aria-label", `Status: ${e}`);
}
function Me(n, t) {
  n.setAttribute("aria-sort", t), n.setAttribute("role", "columnheader");
}
function Ne(n, t, e = 100, s) {
  n.setAttribute("role", "progressbar"), n.setAttribute("aria-valuenow", String(t)), n.setAttribute("aria-valuemin", "0"), n.setAttribute("aria-valuemax", String(e)), s && n.setAttribute("aria-label", s);
}
function je(n, t = "Skip to main content") {
  const e = document.createElement("a");
  return e.href = `#${n}`, e.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg", e.textContent = t, e;
}
function De(n, t = {}) {
  const { title: e, describedBy: s, onClose: i } = t;
  if (n.setAttribute("role", "dialog"), n.setAttribute("aria-modal", "true"), e) {
    const a = `dialog-title-${Date.now()}`, l = n.querySelector('h1, h2, h3, [role="heading"]');
    l && (l.id = a, n.setAttribute("aria-labelledby", a));
  }
  s && n.setAttribute("aria-describedby", s);
  const r = Ot({
    container: n,
    onEscape: i
  });
  return () => {
    r(), n.removeAttribute("aria-modal"), n.removeAttribute("aria-labelledby"), n.removeAttribute("aria-describedby");
  };
}
function zt() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function Ue(n) {
  return zt() ? 0 : n;
}
const ct = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  degraded: { label: "Degraded", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:warning-triangle" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  disabled: { label: "Disabled", bg: "bg-gray-100", text: "text-gray-500", icon: "iconoir:cancel" }
}, Vt = {
  healthy: { label: "Healthy", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  warning: { label: "Warnings", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:warning-triangle" },
  error: { label: "Errors", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" }
};
class He {
  constructor(t) {
    this.container = null, this.state = null, this.loading = !1, this.config = t, this.state = t.state || null;
  }
  /**
   * Initialize the panel.
   */
  init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ExtensionDiagnostics] Container not found");
      return;
    }
    this.render(), this.bindEvents();
  }
  /**
   * Update state and re-render.
   */
  setState(t) {
    this.state = t, this.render(), this.bindEvents();
  }
  /**
   * Refresh diagnostics data.
   */
  async refresh() {
    if (!(!this.config.onRefresh || this.loading)) {
      this.loading = !0, this.updateRefreshButton();
      try {
        const t = await this.config.onRefresh();
        this.setState(t);
      } finally {
        this.loading = !1, this.updateRefreshButton();
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  render() {
    if (this.container) {
      if (!this.state) {
        this.container.innerHTML = this.renderLoading();
        return;
      }
      this.container.innerHTML = `
      <div class="extension-diagnostics space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Extension Diagnostics</h2>
            <p class="text-sm text-gray-500 mt-0.5">
              Runtime v${o(this.state.runtimeVersion)} &middot;
              Worker ${this.state.workerStatus}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">
              Last updated: ${this.formatTime(this.state.lastRefreshedAt)}
            </span>
            <button type="button"
                    class="diagnostics-refresh px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
              ${u("iconoir:refresh", { size: "16px" })}
              Refresh
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          ${this.renderSummaryCard("Packs", this.state.packs.length, this.countByStatus(this.state.packs))}
          ${this.renderSummaryCard("Hooks", this.state.hooks.length, this.countHookStatus(this.state.hooks))}
          ${this.renderConfigHealthCard()}
          ${this.renderErrorsCard()}
        </div>

        <!-- Provider Packs -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200">
            <h3 class="text-base font-medium text-gray-900">Provider Packs</h3>
          </div>
          <div class="divide-y divide-gray-100">
            ${this.state.packs.length === 0 ? this.renderEmptyState("No provider packs registered") : this.state.packs.map((t) => this.renderPackRow(t)).join("")}
          </div>
        </div>

        <!-- Hooks -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200">
            <h3 class="text-base font-medium text-gray-900">Registered Hooks</h3>
          </div>
          <div class="divide-y divide-gray-100">
            ${this.state.hooks.length === 0 ? this.renderEmptyState("No hooks registered") : this.state.hooks.map((t) => this.renderHookRow(t)).join("")}
          </div>
        </div>

        <!-- Recent Errors -->
        ${this.state.recentErrors.length > 0 ? `
          <div class="bg-white rounded-lg border border-red-200">
            <div class="px-4 py-3 border-b border-red-200 bg-red-50">
              <h3 class="text-base font-medium text-red-900 flex items-center gap-2">
                ${u("iconoir:warning-circle", { size: "18px" })}
                Recent Errors (${this.state.recentErrors.length})
              </h3>
            </div>
            <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              ${this.state.recentErrors.map((t) => this.renderErrorRow(t)).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `;
    }
  }
  renderLoading() {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span class="ml-3 text-gray-600">Loading diagnostics...</span>
      </div>
    `;
  }
  renderSummaryCard(t, e, s) {
    return `
      <div class="bg-white rounded-lg border ${(s.errored || 0) > 0 || (s.degraded || 0) > 0 ? "border-amber-200" : "border-gray-200"} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">${t}</span>
          <span class="text-2xl font-semibold text-gray-900">${e}</span>
        </div>
        <div class="flex items-center gap-2 mt-2">
          ${Object.entries(s).map(([a, l]) => {
      const c = ct[a];
      return l > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${c.bg} ${c.text}">
                ${l} ${c.label.toLowerCase()}
              </span>
            ` : "";
    }).join("")}
        </div>
      </div>
    `;
  }
  renderConfigHealthCard() {
    if (!this.state) return "";
    const t = this.state.configHealth, e = Vt[t.status];
    return `
      <div class="bg-white rounded-lg border ${t.status === "healthy" ? "border-gray-200" : "border-amber-200"} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">Config Health</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </div>
        ${t.issues.length > 0 ? `
          <div class="mt-2">
            <span class="text-sm text-gray-600">${t.issues.length} issue${t.issues.length > 1 ? "s" : ""}</span>
          </div>
        ` : ""}
      </div>
    `;
  }
  renderErrorsCard() {
    if (!this.state) return "";
    const t = this.state.recentErrors.length, e = t > 0;
    return `
      <div class="bg-white rounded-lg border ${e ? "border-red-200" : "border-gray-200"} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">Recent Errors</span>
          <span class="text-2xl font-semibold ${e ? "text-red-600" : "text-gray-900"}">${t}</span>
        </div>
        ${e ? `
          <div class="mt-2">
            <span class="text-sm text-red-600">Requires attention</span>
          </div>
        ` : `
          <div class="mt-2">
            <span class="text-sm text-green-600">No recent errors</span>
          </div>
        `}
      </div>
    `;
  }
  renderPackRow(t) {
    const e = ct[t.status];
    return `
      <div class="pack-row px-4 py-3 hover:bg-gray-50 cursor-pointer" data-pack-id="${o(t.id)}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${o(t.name)}</span>
              <span class="text-xs text-gray-400">v${o(t.version)}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${e.bg} ${e.text}">
                ${u(e.icon, { size: "10px" })}
                ${e.label}
              </span>
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>${t.providers.length} provider${t.providers.length !== 1 ? "s" : ""}</span>
              <span>${t.capabilities.length} capabilit${t.capabilities.length !== 1 ? "ies" : "y"}</span>
              <span>${t.hooks.length} hook${t.hooks.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${t.lastError ? `
              <span class="text-xs text-red-600 truncate max-w-48" title="${o(t.lastError)}">
                ${o(t.lastError.slice(0, 50))}${t.lastError.length > 50 ? "..." : ""}
              </span>
            ` : ""}
            ${u("iconoir:nav-arrow-right", { size: "16px", extraClass: "text-gray-400" })}
          </div>
        </div>
      </div>
    `;
  }
  renderHookRow(t) {
    const e = t.executionCount > 0 ? Math.round((t.executionCount - t.failureCount) / t.executionCount * 100) : 100;
    return `
      <div class="px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${o(t.name)}</span>
              <span class="text-xs text-gray-400">from ${o(t.sourcePack)}</span>
              ${t.enabled ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">Enabled</span>' : '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Disabled</span>'}
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>${t.executionCount} executions</span>
              <span class="${e < 90 ? "text-amber-600" : ""}">${e}% success rate</span>
              ${t.lastExecutionAt ? `<span>Last: ${this.formatTime(t.lastExecutionAt)}</span>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderErrorRow(t) {
    return `
      <div class="error-row px-4 py-3 hover:bg-red-50 cursor-pointer" data-error-id="${o(t.id)}">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            ${u("iconoir:warning-circle", { size: "16px", extraClass: "text-red-500" })}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-red-800">${o(t.type)}</span>
              <span class="text-xs text-gray-400">from ${o(t.packId)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-0.5">${o(t.message)}</p>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>${this.formatTime(t.occurredAt)}</span>
              ${t.relatedEntity ? `
                <span>${o(t.relatedEntity.type)}:${o(t.relatedEntity.id)}</span>
              ` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderEmptyState(t) {
    return `
      <div class="px-4 py-8 text-center">
        <p class="text-sm text-gray-500">${o(t)}</p>
      </div>
    `;
  }
  // ---------------------------------------------------------------------------
  // Event Binding
  // ---------------------------------------------------------------------------
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector(".diagnostics-refresh")?.addEventListener("click", () => this.refresh()), this.container.querySelectorAll(".pack-row").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.packId;
        s && this.config.onPackSelect && this.config.onPackSelect(s);
      });
    }), this.container.querySelectorAll(".error-row").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.errorId, i = this.state?.recentErrors.find((r) => r.id === s);
        i && this.config.onErrorSelect && this.config.onErrorSelect(i);
      });
    });
  }
  updateRefreshButton() {
    const t = this.container?.querySelector(".diagnostics-refresh");
    if (t) {
      t.disabled = this.loading;
      const e = t.querySelector("svg");
      e && e.classList.toggle("animate-spin", this.loading);
    }
  }
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  countByStatus(t) {
    const e = {};
    for (const s of t)
      e[s.status] = (e[s.status] || 0) + 1;
    return e;
  }
  countHookStatus(t) {
    let e = 0, s = 0;
    for (const i of t)
      i.enabled ? e++ : s++;
    return { active: e, disabled: s };
  }
  formatTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const i = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), r = Math.floor(i / 6e4), a = Math.floor(i / 36e5);
    return r < 1 ? "just now" : r < 60 ? `${r}m ago` : a < 24 ? `${a}h ago` : e.toLocaleDateString();
  }
}
function D(n) {
  const { source: t, packName: e, mode: s = "badge", context: i } = n, a = {
    "go-services": {
      label: "Core",
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "iconoir:box-3d-center",
      description: "Managed by go-services core"
    },
    downstream: {
      label: e || "Extension",
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: "iconoir:plug",
      description: `Managed by ${e || "downstream extension"}`
    },
    mixed: {
      label: "Mixed",
      bg: "bg-gray-50",
      text: "text-gray-700",
      icon: "iconoir:layers",
      description: "Combination of core and extension data"
    }
  }[t];
  return s === "tooltip" ? `
      <span class="state-source-indicator inline-flex items-center"
            title="${o(a.description)}${i ? ` - ${i}` : ""}"
            aria-label="${o(a.description)}">
        ${u(a.icon, { size: "14px", extraClass: a.text })}
      </span>
    ` : `
    <span class="state-source-indicator inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${a.bg} ${a.text}"
          title="${o(a.description)}${i ? ` - ${i}` : ""}"
          role="note"
          aria-label="State source: ${o(a.description)}">
      ${u(a.icon, { size: "12px" })}
      <span>${o(a.label)}</span>
    </span>
  `;
}
function Oe(n, t) {
  const e = document.createElement("span");
  e.innerHTML = D(t), n.appendChild(e.firstElementChild);
}
function Be() {
  return `
    <div class="state-source-legend p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">State Source Legend</h4>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          ${D({ source: "go-services" })}
          <span class="text-sm text-gray-600">Data managed by go-services core runtime</span>
        </div>
        <div class="flex items-center gap-3">
          ${D({ source: "downstream", packName: "Extension" })}
          <span class="text-sm text-gray-600">Data managed by an installed extension package</span>
        </div>
        <div class="flex items-center gap-3">
          ${D({ source: "mixed" })}
          <span class="text-sm text-gray-600">Combination of core and extension-managed data</span>
        </div>
      </div>
    </div>
  `;
}
function U(n) {
  return n.split(/[-_]/).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");
}
function w(n, t) {
  const e = typeof t == "function" ? String(t(n) || "").trim() : "";
  return e || U(n);
}
function H(n) {
  return n.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function v(n, t = 12) {
  return n.length <= t ? n : `${n.slice(0, t - 3)}...`;
}
function P(n) {
  const t = new Date(n);
  return Number.isNaN(t.getTime()) ? n : t.toLocaleString();
}
function m(n, t = {}) {
  const e = new Date(n);
  if (Number.isNaN(e.getTime())) return n;
  if (!t.allowFuture) {
    const h = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), g = Math.floor(h / 6e4), f = Math.floor(h / 36e5), b = Math.floor(h / 864e5);
    return g < 1 ? t.pastImmediateLabel || "Just now" : g < 60 ? `${g}m ago` : f < 24 ? `${f}h ago` : b < 7 ? `${b}d ago` : e.toLocaleDateString();
  }
  const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime(), r = i > 0, a = Math.abs(i), l = Math.floor(a / 6e4), c = Math.floor(a / 36e5), d = Math.floor(a / 864e5);
  return l < 1 ? r ? t.futureImmediateLabel || "Soon" : t.pastImmediateLabel || "Just now" : l < 60 ? r ? `in ${l}m` : `${l}m ago` : c < 24 ? r ? `in ${c}h` : `${c}h ago` : d < 7 ? r ? `in ${d}d` : `${d}d ago` : e.toLocaleDateString();
}
async function wt(n, t = {}) {
  try {
    return (await n.listProviders(t.signal)).providers || [];
  } catch (e) {
    const s = e instanceof Error ? e : new Error(String(e));
    return t.onError?.(s), t.notifier?.error(`Failed to load providers: ${s.message}`), [];
  }
}
async function nt(n, t) {
  const e = await wt(n, t);
  return Wt({
    container: t.container,
    providers: e,
    selectedProviderId: t.selectedProviderId,
    getProviderName: t.getProviderName,
    selectSelector: t.selectSelector,
    emptyLabel: t.emptyLabel
  }), e;
}
function Wt(n) {
  const t = n.container?.querySelector(
    n.selectSelector || '[data-filter="provider_id"]'
  );
  if (!t) return;
  const e = n.emptyLabel || "All Providers", s = n.providers.map((i) => {
    const r = w(i.id, n.getProviderName);
    return `<option value="${o(i.id)}">${o(r)}</option>`;
  }).join("");
  t.innerHTML = `<option value="">${o(e)}</option>${s}`, t.value = n.selectedProviderId || "";
}
function T(n, t) {
  n.querySelector(".ui-state-reset-btn")?.addEventListener("click", t);
}
function Y(n, t) {
  return n?.abort(), t.destroy(), null;
}
const lt = {
  github: "iconoir:github",
  google: "iconoir:google",
  gmail: "iconoir:mail",
  drive: "iconoir:folder",
  docs: "iconoir:page",
  calendar: "iconoir:calendar",
  slack: "iconoir:chat-bubble",
  dropbox: "iconoir:cloud",
  microsoft: "iconoir:microsoft",
  outlook: "iconoir:mail",
  teams: "iconoir:group",
  onedrive: "iconoir:cloud",
  default: "iconoir:plugin"
}, Gt = {
  github: "GitHub",
  google: "Google",
  gmail: "Gmail",
  drive: "Google Drive",
  docs: "Google Docs",
  calendar: "Google Calendar",
  slack: "Slack",
  dropbox: "Dropbox",
  microsoft: "Microsoft",
  outlook: "Outlook",
  teams: "Microsoft Teams",
  onedrive: "OneDrive"
};
class Qt {
  constructor(t) {
    this.container = null, this.providers = [], this.loading = !1, this.error = null, this.config = t;
  }
  /**
   * Initialize the providers catalog
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ProvidersCatalog] Container not found:", this.config.container);
      return;
    }
    if (!F()()) {
      this.renderForbidden();
      return;
    }
    await this.loadProviders();
  }
  /**
   * Refresh the providers list
   */
  async refresh() {
    await this.loadProviders();
  }
  /**
   * Get the loaded providers
   */
  getProviders() {
    return [...this.providers];
  }
  /**
   * Get a provider by ID
   */
  getProvider(t) {
    return this.providers.find((e) => e.id === t);
  }
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  async loadProviders() {
    if (!this.container) return;
    this.loading = !0, this.error = null, this.renderLoading();
    const t = E();
    this.providers = await wt(t, {
      notifier: this.config.notifier,
      onError: (e) => {
        this.error = e;
      }
    });
    try {
      if (this.error) {
        this.renderError();
        return;
      }
      this.renderProviders();
    } finally {
      this.loading = !1;
    }
  }
  renderLoading() {
    this.container && (this.container.innerHTML = z({
      text: "Loading providers...",
      size: "lg"
    }));
  }
  renderError() {
    if (!this.container) return;
    this.container.innerHTML = V({
      title: "Failed to load providers",
      error: this.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadProviders());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({
      resource: "service providers"
    }));
  }
  renderProviders() {
    if (!this.container) return;
    if (this.providers.length === 0) {
      this.renderEmpty();
      return;
    }
    const t = this.providers.map((e) => this.buildProviderCard(e));
    this.container.innerHTML = `
      <div class="providers-catalog-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        ${t.join("")}
      </div>
    `, this.bindCardEvents();
  }
  renderEmpty() {
    this.container && (this.container.innerHTML = xt({
      type: "providers"
    }));
  }
  buildProviderCard(t) {
    const e = this.getProviderCardData(t), s = k()() && t.supported_scope_types.includes("user"), i = k()() && t.supported_scope_types.includes("org"), r = this.buildCapabilitySummary(t.capabilities), a = this.buildScopeBadges(t.supported_scope_types);
    return `
      <div class="provider-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
           data-provider-id="${o(t.id)}">
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                ${u(e.icon, { size: "20px", extraClass: "text-gray-600" })}
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">${o(e.displayName)}</h3>
                <span class="text-xs text-gray-500">${o(t.auth_kind)}</span>
              </div>
            </div>
            ${a}
          </div>

          <!-- Capabilities -->
          <div class="mt-3">
            <div class="text-xs text-gray-500 mb-1.5">Capabilities (${e.capabilityCount})</div>
            ${r}
          </div>
        </div>

        <!-- Actions -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div class="flex items-center gap-2">
            ${s ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                      data-provider-id="${o(t.id)}"
                      data-scope-type="user">
                Connect as User
              </button>
            ` : ""}
            ${i ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      data-provider-id="${o(t.id)}"
                      data-scope-type="org">
                Connect Org
              </button>
            ` : ""}
            ${!s && !i ? `
              <span class="text-xs text-gray-400 italic">Connect permission required</span>
            ` : ""}
          </div>
        </div>
      </div>
    `;
  }
  buildCapabilitySummary(t) {
    if (t.length === 0)
      return '<span class="text-xs text-gray-400">No capabilities defined</span>';
    const e = 4, s = t.slice(0, e), i = t.length - e;
    let r = '<div class="flex flex-wrap gap-1">';
    for (const a of s) {
      const [l, c] = a.name.split(".");
      r += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              title="${o(a.name)}">
          ${o(c || a.name)}
        </span>
      `;
    }
    return i > 0 && (r += `<span class="text-xs text-gray-400">+${i} more</span>`), r += "</div>", r;
  }
  buildScopeBadges(t) {
    return `
      <div class="flex gap-1">
        ${t.map((e) => `
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${e === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${e}
          </span>
        `).join("")}
      </div>
    `;
  }
  getProviderCardData(t) {
    const e = this.config.getProviderName ? this.config.getProviderName(t.id) : Gt[t.id.toLowerCase()] || w(t.id), s = this.config.getProviderIcon ? this.config.getProviderIcon(t.id) : lt[t.id.toLowerCase()] || lt.default;
    return {
      provider: t,
      displayName: e,
      icon: s,
      description: `${t.auth_kind} authentication`,
      capabilityCount: t.capabilities.length,
      canConnect: k()()
    };
  }
  bindCardEvents() {
    if (!this.container) return;
    this.container.querySelectorAll(".provider-card").forEach((s) => {
      s.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const r = s.dataset.providerId;
        if (r) {
          const a = this.getProvider(r);
          a && this.config.onSelect && this.config.onSelect(a);
        }
      });
    }), this.container.querySelectorAll(".provider-connect-btn").forEach((s) => {
      s.addEventListener("click", (i) => {
        i.stopPropagation();
        const r = s.dataset.providerId, a = s.dataset.scopeType;
        if (r && a) {
          const l = this.getProvider(r);
          l && this.config.onConnect && this.config.onConnect(l, a);
        }
      });
    });
  }
}
async function ze(n) {
  const t = new Qt(n);
  return await t.init(), t;
}
const dt = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  disconnected: { label: "Disconnected", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:cancel" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  pending_reauth: { label: "Pending Reauth", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:clock" },
  needs_reconsent: { label: "Needs Reconsent", bg: "bg-orange-100", text: "text-orange-700", icon: "iconoir:refresh" }
};
class Jt {
  constructor(t) {
    this.container = null, this.state = {
      connections: [],
      providers: [],
      total: 0,
      loading: !1,
      error: null
    }, this.abortController = null, this.actionQueue = new J(), this.config = {
      perPage: 25,
      syncUrl: !0,
      ...t
    }, this.client = t.apiClient || E(), this.queryState = new O({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadConnections()
      },
      filterFields: ["provider_id", "scope_type", "scope_id", "status"],
      storageKey: "services-connections-list"
    });
  }
  /**
   * Initialize the connections list
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ConnectionsList] Container not found:", this.config.container);
      return;
    }
    if (!F()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), this.state.providers = await nt(this.client, {
      container: this.container,
      notifier: this.config.notifier,
      selectedProviderId: this.queryState.getState().filters.provider_id || "",
      getProviderName: this.config.getProviderName
    }), this.bindEvents(), await this.loadConnections();
  }
  /**
   * Refresh the connections list
   */
  async refresh() {
    await this.loadConnections();
  }
  /**
   * Get the current connections
   */
  getConnections() {
    return [...this.state.connections];
  }
  /**
   * Get a connection by ID
   */
  getConnection(t) {
    return this.state.connections.find((e) => e.id === t);
  }
  /**
   * Destroy the manager
   */
  destroy() {
    this.abortController = Y(this.abortController, this.queryState);
  }
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  async loadConnections() {
    if (this.container) {
      this.abortController?.abort(), this.abortController = new AbortController(), this.state.loading = !0, this.state.error = null, this.updateLoadingState();
      try {
        const t = this.queryState.getQueryParams(), e = {
          provider_id: t.provider_id,
          scope_type: t.scope_type,
          scope_id: t.scope_id,
          status: t.status,
          q: t.q,
          page: t.page,
          per_page: t.per_page
        }, s = await this.client.listConnections(e, this.abortController.signal);
        this.state.connections = s.connections, this.state.total = s.total, this.queryState.updateFromResponse(s.total, s.has_next), this.renderConnections(), this.updatePagination();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load connections: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  renderStructure() {
    this.container && (this.container.innerHTML = `
      <div class="connections-list">
        <!-- Filters -->
        <div class="connections-filters flex flex-wrap items-center gap-3 mb-4">
          <div class="flex-1 min-w-[200px]">
            <input type="text"
                   class="connections-search w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Search connections..."
                   data-filter="search">
          </div>

          <select class="connections-filter-provider px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="provider_id">
            <option value="">All Providers</option>
          </select>

          <select class="connections-filter-scope px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="scope_type">
            <option value="">All Scopes</option>
            <option value="user">User</option>
            <option value="org">Organization</option>
          </select>

          <select class="connections-filter-status px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disconnected">Disconnected</option>
            <option value="errored">Error</option>
            <option value="pending_reauth">Pending Reauth</option>
            <option value="needs_reconsent">Needs Reconsent</option>
          </select>

          <button type="button"
                  class="connections-reset px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  title="Reset filters">
            ${u("iconoir:refresh", { size: "16px" })}
          </button>
          ${k()() && this.config.onConnect ? `
            <button type="button"
                    class="connections-connect-user px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Connect User
            </button>
            <button type="button"
                    class="connections-connect-org px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Connect Org
            </button>
          ` : ""}
        </div>

        <!-- Table -->
        <div class="connections-table-wrapper overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table class="connections-table w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">External Account</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Updated</th>
                <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody class="connections-tbody divide-y divide-gray-100">
              <!-- Connections will be rendered here -->
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="connections-empty hidden py-12 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            ${u("iconoir:link", { size: "24px", extraClass: "text-gray-400" })}
          </div>
          <h3 class="text-lg font-medium text-gray-900">No connections found</h3>
          <p class="text-sm text-gray-500 mt-1">Connect a service to get started.</p>
        </div>

        <!-- Pagination -->
        <div class="connections-pagination flex items-center justify-between mt-4">
          <div class="connections-info text-sm text-gray-500">
            <!-- Info will be rendered here -->
          </div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="connections-prev px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="connections-next px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    `, this.restoreFilterValues());
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && (e.value = t.search || ""), this.container?.querySelectorAll("select[data-filter]")?.forEach((i) => {
      const r = i.dataset.filter;
      i.value = t.filters[r] || "";
    });
  }
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (c) => {
      this.queryState.setSearch(c.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((c) => {
      c.addEventListener("change", () => {
        const d = c.dataset.filter;
        this.queryState.setFilter(d, c.value || void 0);
      });
    }), this.container.querySelector(".connections-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const i = this.container.querySelector(".connections-connect-user"), r = this.container.querySelector(".connections-connect-org");
    i?.addEventListener("click", () => this.handleConnect("user")), r?.addEventListener("click", () => this.handleConnect("org"));
    const a = this.container.querySelector(".connections-prev"), l = this.container.querySelector(".connections-next");
    a?.addEventListener("click", () => this.queryState.prevPage()), l?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderConnections() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-empty"), s = this.container?.querySelector(".connections-table-wrapper");
    if (t) {
      if (this.state.connections.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = R(6, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
          onReset: () => {
            this.queryState.reset(), this.restoreFilterValues();
          }
        }), T(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.connections.map((i) => this.renderConnectionRow(i)).join(""), this.bindRowActions();
    }
  }
  handleConnect(t) {
    if (!this.config.onConnect || !k()()) return;
    const s = this.container?.querySelector('[data-filter="provider_id"]')?.value || "";
    if (!s) {
      this.config.notifier?.error("Select a provider before starting a connection.");
      return;
    }
    const i = this.state.providers.find((r) => r.id === s);
    if (!i) {
      this.config.notifier?.error("Selected provider is no longer available.");
      return;
    }
    if (!i.supported_scope_types.includes(t)) {
      const r = w(i.id, this.config.getProviderName);
      this.config.notifier?.error(`${r} does not support ${t} scope.`);
      return;
    }
    this.config.onConnect(i.id, t);
  }
  renderConnectionRow(t) {
    const e = dt[t.status] || dt.disconnected, s = w(t.provider_id, this.config.getProviderName), i = m(t.updated_at), r = this.buildRowActions(t);
    return `
      <tr class="connection-row hover:bg-gray-50 cursor-pointer" data-connection-id="${o(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${o(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${o(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${o(t.scope_id)}">
            ${o(v(t.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-gray-600" title="${o(t.external_account_id)}">
            ${o(v(t.external_account_id, 20))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
          ${t.last_error ? `
            <div class="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title="${o(t.last_error)}">
              ${o(t.last_error)}
            </div>
          ` : ""}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${i}
        </td>
        <td class="px-4 py-3 text-right">
          ${r}
        </td>
      </tr>
    `;
  }
  buildRowActions(t) {
    const e = [];
    return t.status === "active" && A()() && e.push(`
        <button type="button"
                class="connection-action-refresh p-1 text-gray-400 hover:text-blue-600"
                data-action="refresh"
                title="Refresh credentials">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status === "needs_reconsent" && yt()() && e.push(`
        <button type="button"
                class="connection-action-reconsent p-1 text-gray-400 hover:text-orange-600"
                data-action="reconsent"
                title="Re-consent">
          ${u("iconoir:redo", { size: "16px" })}
        </button>
      `), t.status !== "disconnected" && rt()() && e.push(`
        <button type="button"
                class="connection-action-revoke p-1 text-gray-400 hover:text-red-600"
                data-action="revoke"
                title="Revoke connection">
          ${u("iconoir:cancel", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindRowActions() {
    this.container?.querySelectorAll(".connection-row")?.forEach((e) => {
      const s = e.dataset.connectionId;
      s && (e.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const r = this.getConnection(s);
        r && this.config.onSelect && this.config.onSelect(r);
      }), e.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (r) => {
          switch (r.stopPropagation(), i.dataset.action) {
            case "refresh":
              await this.handleRefresh(s, i);
              break;
            case "reconsent":
              await this.handleReconsent(s, i);
              break;
            case "revoke":
              await this.handleRevoke(s, i);
              break;
          }
        });
      }));
    });
  }
  async handleRefresh(t, e) {
    const s = this.getConnection(t);
    s && (this.actionQueue.isInFlight(`refresh-${t}`) || await this.actionQueue.execute(`refresh-${t}`, async () => {
      await S({
        mutation: () => this.client.refreshConnection(t, {
          provider_id: s.provider_id
        }),
        notifier: this.config.notifier,
        successMessage: "Connection refresh initiated",
        errorMessagePrefix: "Failed to refresh",
        buttonConfig: e ? {
          button: e,
          loadingText: "Refreshing...",
          successText: "Refreshed",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadConnections()
      });
    }));
  }
  async handleReconsent(t, e) {
    this.actionQueue.isInFlight(`reconsent-${t}`) || await this.actionQueue.execute(`reconsent-${t}`, async () => {
      await S({
        mutation: () => this.client.beginReconsent(t),
        notifier: this.config.notifier,
        errorMessagePrefix: "Failed to start re-consent",
        buttonConfig: e ? {
          button: e,
          loadingText: "Starting...",
          errorText: "Failed"
        } : void 0,
        onSuccess: (s) => {
          s.begin?.authorize_url && (window.location.href = s.begin.authorize_url);
        }
      });
    });
  }
  async handleRevoke(t, e) {
    const s = this.getConnection(t), i = s ? w(s.provider_id, this.config.getProviderName) : void 0;
    await Q({
      action: "revoke",
      resourceType: "connection",
      resourceName: i
    }) && (this.actionQueue.isInFlight(`revoke-${t}`) || await this.actionQueue.execute(`revoke-${t}`, async () => {
      await S({
        mutation: () => this.client.revokeConnection(t),
        notifier: this.config.notifier,
        successMessage: "Connection revoked",
        errorMessagePrefix: "Failed to revoke",
        buttonConfig: e ? {
          button: e,
          loadingText: "Revoking...",
          successText: "Revoked",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadConnections()
      });
    }));
  }
  renderError() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), s = this.container?.querySelector(".connections-empty");
    if (!t) return;
    e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = G(6, {
      title: "Failed to load connections",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnections());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({
      resource: "connections"
    }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), s = this.container?.querySelector(".connections-empty");
    this.state.loading && t && this.state.connections.length === 0 && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = W(6, { text: "Loading connections..." }));
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, { total: i } = this.state, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), l = a < i, c = e > 1, d = this.container?.querySelector(".connections-info"), p = this.container?.querySelector(".connections-prev"), h = this.container?.querySelector(".connections-next");
    d && (d.textContent = i > 0 ? `Showing ${r}-${a} of ${i}` : "No connections"), p && (p.disabled = !c), h && (h.disabled = !l);
  }
}
async function Ve(n) {
  const t = new Jt(n);
  return await t.init(), t;
}
const ut = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  suspended: { label: "Suspended", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:pause" },
  uninstalled: { label: "Uninstalled", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:cancel" },
  needs_reconsent: { label: "Needs Reconsent", bg: "bg-orange-100", text: "text-orange-700", icon: "iconoir:refresh" }
}, ht = {
  user: { label: "User", bg: "bg-blue-50", text: "text-blue-600" },
  workspace: { label: "Workspace", bg: "bg-indigo-50", text: "text-indigo-600" },
  org: { label: "Organization", bg: "bg-purple-50", text: "text-purple-600" },
  marketplace_app: { label: "Marketplace", bg: "bg-pink-50", text: "text-pink-600" },
  standard: { label: "Standard", bg: "bg-gray-50", text: "text-gray-600" }
};
class Kt {
  constructor(t) {
    this.container = null, this.state = {
      installations: [],
      providers: [],
      total: 0,
      loading: !1,
      error: null
    }, this.abortController = null, this.actionQueue = new J(), this.config = {
      perPage: 25,
      syncUrl: !0,
      ...t
    }, this.client = t.apiClient || E(), this.queryState = new O({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadInstallations()
      },
      filterFields: ["provider_id", "scope_type", "scope_id", "install_type", "status"],
      storageKey: "services-installations-list"
    });
  }
  /**
   * Initialize the installations list
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[InstallationsList] Container not found:", this.config.container);
      return;
    }
    if (!F()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), this.state.providers = await nt(this.client, {
      container: this.container,
      notifier: this.config.notifier,
      selectedProviderId: this.queryState.getState().filters.provider_id || "",
      getProviderName: this.config.getProviderName
    }), this.bindEvents(), await this.loadInstallations();
  }
  /**
   * Refresh the installations list
   */
  async refresh() {
    await this.loadInstallations();
  }
  /**
   * Get the current installations
   */
  getInstallations() {
    return [...this.state.installations];
  }
  /**
   * Get an installation by ID
   */
  getInstallation(t) {
    return this.state.installations.find((e) => e.id === t);
  }
  /**
   * Destroy the manager
   */
  destroy() {
    this.abortController = Y(this.abortController, this.queryState);
  }
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  async loadInstallations() {
    if (this.container) {
      this.abortController?.abort(), this.abortController = new AbortController(), this.state.loading = !0, this.state.error = null, this.updateLoadingState();
      try {
        const t = this.queryState.getQueryParams(), e = {
          provider_id: t.provider_id,
          scope_type: t.scope_type,
          scope_id: t.scope_id,
          install_type: t.install_type,
          status: t.status,
          q: t.q,
          page: t.page,
          per_page: t.per_page
        }, s = await this.client.listInstallations(e, this.abortController.signal);
        this.state.installations = s.installations, this.state.total = s.total, this.queryState.updateFromResponse(s.total, s.has_next), this.renderInstallations(), this.updatePagination();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load installations: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  renderStructure() {
    this.container && (this.container.innerHTML = `
      <div class="installations-list">
        <!-- Filters -->
        <div class="installations-filters flex flex-wrap items-center gap-3 mb-4">
          <div class="flex-1 min-w-[200px]">
            <input type="text"
                   class="installations-search w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Search installations..."
                   data-filter="search">
          </div>

          <select class="installations-filter-provider px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="provider_id">
            <option value="">All Providers</option>
          </select>

          <select class="installations-filter-scope px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="scope_type">
            <option value="">All Scopes</option>
            <option value="user">User</option>
            <option value="org">Organization</option>
          </select>

          <select class="installations-filter-status px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="uninstalled">Uninstalled</option>
            <option value="needs_reconsent">Needs Reconsent</option>
          </select>

          <select class="installations-filter-type px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="install_type">
            <option value="">All Install Types</option>
            <option value="user">User</option>
            <option value="workspace">Workspace</option>
            <option value="org">Organization</option>
            <option value="marketplace_app">Marketplace</option>
            <option value="standard">Standard</option>
          </select>

          <button type="button"
                  class="installations-reset px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  title="Reset filters">
            ${u("iconoir:refresh", { size: "16px" })}
          </button>
        </div>

        <!-- Table -->
        <div class="installations-table-wrapper overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table class="installations-table w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Install Type</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Granted</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Revoked</th>
                <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody class="installations-tbody divide-y divide-gray-100">
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="installations-empty hidden py-12 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            ${u("iconoir:download", { size: "24px", extraClass: "text-gray-400" })}
          </div>
          <h3 class="text-lg font-medium text-gray-900">No installations found</h3>
          <p class="text-sm text-gray-500 mt-1">Install a service to get started.</p>
        </div>

        <!-- Pagination -->
        <div class="installations-pagination flex items-center justify-between mt-4">
          <div class="installations-info text-sm text-gray-500"></div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="installations-prev px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="installations-next px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    `, this.restoreFilterValues());
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && (e.value = t.search || ""), this.container?.querySelectorAll("select[data-filter]")?.forEach((i) => {
      const r = i.dataset.filter;
      i.value = t.filters[r] || "";
    });
  }
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (a) => {
      this.queryState.setSearch(a.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((a) => {
      a.addEventListener("change", () => {
        const l = a.dataset.filter;
        this.queryState.setFilter(l, a.value || void 0);
      });
    }), this.container.querySelector(".installations-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const i = this.container.querySelector(".installations-prev"), r = this.container.querySelector(".installations-next");
    i?.addEventListener("click", () => this.queryState.prevPage()), r?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderInstallations() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-empty"), s = this.container?.querySelector(".installations-table-wrapper");
    if (t) {
      if (this.state.installations.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = R(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), T(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.installations.map((i) => this.renderInstallationRow(i)).join(""), this.bindRowActions();
    }
  }
  renderInstallationRow(t) {
    const e = ut[t.status] || ut.uninstalled, s = ht[t.install_type] || ht.standard, i = w(t.provider_id, this.config.getProviderName), r = t.granted_at ? m(t.granted_at) : "—", a = t.revoked_at ? m(t.revoked_at) : "—", l = this.buildRowActions(t);
    return `
      <tr class="installation-row hover:bg-gray-50 cursor-pointer" data-installation-id="${o(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${o(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}">
            ${s.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${o(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${o(t.scope_id)}">
            ${o(v(t.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${r}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${a}
        </td>
        <td class="px-4 py-3 text-right">
          ${l}
        </td>
      </tr>
    `;
  }
  buildRowActions(t) {
    const e = [];
    return t.status === "active" && rt()() && e.push(`
        <button type="button"
                class="installation-action-uninstall p-1 text-gray-400 hover:text-red-600"
                data-action="uninstall"
                title="Uninstall">
          ${u("iconoir:trash", { size: "16px" })}
        </button>
      `), t.status === "uninstalled" && k()() && e.push(`
        <button type="button"
                class="installation-action-reinstall p-1 text-gray-400 hover:text-green-600"
                data-action="reinstall"
                title="Reinstall">
          ${u("iconoir:redo", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindRowActions() {
    this.container?.querySelectorAll(".installation-row")?.forEach((e) => {
      const s = e.dataset.installationId;
      s && (e.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const r = this.getInstallation(s);
        r && this.config.onSelect && this.config.onSelect(r);
      }), e.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (r) => {
          switch (r.stopPropagation(), i.dataset.action) {
            case "uninstall":
              await this.handleUninstall(s, i);
              break;
            case "reinstall":
              await this.handleReinstall(s);
              break;
          }
        });
      }));
    });
  }
  async handleUninstall(t, e) {
    const s = this.getInstallation(t), i = s ? w(s.provider_id, this.config.getProviderName) : void 0;
    await Q({
      action: "uninstall",
      resourceType: "installation",
      resourceName: i
    }) && (this.actionQueue.isInFlight(`uninstall-${t}`) || await this.actionQueue.execute(`uninstall-${t}`, async () => {
      await S({
        mutation: () => this.client.uninstallInstallation(t),
        notifier: this.config.notifier,
        successMessage: "Service uninstalled",
        errorMessagePrefix: "Failed to uninstall",
        buttonConfig: e ? {
          button: e,
          loadingText: "Uninstalling...",
          successText: "Uninstalled",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadInstallations()
      });
    }));
  }
  async handleReinstall(t) {
    const e = this.getInstallation(t);
    e && this.config.onBegin && this.config.onBegin(e.provider_id, e.scope_type);
  }
  renderError() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), s = this.container?.querySelector(".installations-empty");
    if (!t) return;
    e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = G(7, {
      title: "Failed to load installations",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadInstallations());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({
      resource: "installations"
    }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), s = this.container?.querySelector(".installations-empty");
    this.state.loading && t && this.state.installations.length === 0 && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = W(7, { text: "Loading installations..." }));
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, { total: i } = this.state, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), l = a < i, c = e > 1, d = this.container?.querySelector(".installations-info"), p = this.container?.querySelector(".installations-prev"), h = this.container?.querySelector(".installations-next");
    d && (d.textContent = i > 0 ? `Showing ${r}-${a} of ${i}` : "No installations"), p && (p.disabled = !c), h && (h.disabled = !l);
  }
}
async function We(n) {
  const t = new Kt(n);
  return await t.init(), t;
}
const N = {
  success: { label: "Success", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  failure: { label: "Failed", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:clock" }
};
class Yt {
  constructor(t) {
    this.container = null, this.state = {
      entries: [],
      total: 0,
      loading: !1,
      error: null,
      viewMode: "timeline"
    }, this.abortController = null, this.config = {
      perPage: 25,
      syncUrl: !0,
      viewMode: "timeline",
      useDeepLinks: !0,
      ...t
    }, this.state.viewMode = this.config.viewMode || "timeline", this.client = t.apiClient || E(), this.queryState = new O({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadActivity()
      },
      filterFields: [
        "provider_id",
        "scope_type",
        "scope_id",
        "channel",
        "action",
        "status",
        "object_type",
        "object_id",
        "from",
        "to"
      ],
      dateFields: ["from", "to"],
      storageKey: "services-activity"
    });
  }
  /**
   * Initialize the activity page
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ActivityPage] Container not found:", this.config.container);
      return;
    }
    if (!At()()) {
      this.renderForbidden();
      return;
    }
    this.restoreViewMode(), this.queryState.init(), this.renderStructure(), this.bindEvents(), await this.loadActivity();
  }
  /**
   * Refresh the activity list
   */
  async refresh() {
    await this.loadActivity();
  }
  /**
   * Get the current entries
   */
  getEntries() {
    return [...this.state.entries];
  }
  /**
   * Get an entry by ID
   */
  getEntry(t) {
    return this.state.entries.find((e) => e.id === t);
  }
  /**
   * Set view mode
   */
  setViewMode(t) {
    this.state.viewMode !== t && (this.state.viewMode = t, this.saveViewMode(), this.updateViewModeUI(), this.renderEntries());
  }
  /**
   * Get current view mode
   */
  getViewMode() {
    return this.state.viewMode;
  }
  /**
   * Destroy the manager
   */
  destroy() {
    this.abortController = Y(this.abortController, this.queryState);
  }
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  async loadActivity() {
    if (this.container) {
      this.abortController?.abort(), this.abortController = new AbortController(), this.state.loading = !0, this.state.error = null, this.updateLoadingState();
      try {
        const t = this.queryState.getQueryParams(), e = {
          provider_id: t.provider_id,
          scope_type: t.scope_type,
          scope_id: t.scope_id,
          action: t.action,
          status: t.status,
          from: t.from,
          to: t.to,
          page: t.page,
          per_page: t.per_page
        }, s = await this.client.listActivity(e, this.abortController.signal);
        this.state.entries = s.entries, this.state.total = s.total, this.queryState.updateFromResponse(s.total, s.has_more), this.renderEntries(), this.updatePagination();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load activity: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  renderStructure() {
    this.container && (this.container.innerHTML = `
      <div class="activity-page">
        <!-- Header with view toggle -->
        <div class="activity-header flex items-center justify-between mb-4">
          <div class="activity-filter-summary text-sm text-gray-500">
            <!-- Filter summary will be rendered here -->
          </div>
          <div class="activity-view-toggle flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button type="button"
                    class="activity-view-timeline px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${this.state.viewMode === "timeline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}"
                    title="Timeline view">
              ${u("iconoir:timeline", { size: "16px" })}
              <span class="ml-1.5">Timeline</span>
            </button>
            <button type="button"
                    class="activity-view-table px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${this.state.viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}"
                    title="Table view">
              ${u("iconoir:table-rows", { size: "16px" })}
              <span class="ml-1.5">Table</span>
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="activity-filters bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div class="flex flex-wrap items-end gap-3">
            <!-- Search -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input type="text"
                     class="activity-search w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Search activity..."
                     data-filter="search">
            </div>

            <!-- Provider -->
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-500 mb-1">Provider</label>
              <select class="activity-filter-provider w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="provider_id">
                <option value="">All Providers</option>
                ${this.renderProviderOptions()}
              </select>
            </div>

            <!-- Channel -->
            <div class="w-36">
              <label class="block text-xs font-medium text-gray-500 mb-1">Channel</label>
              <select class="activity-filter-channel w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="channel">
                <option value="">All Channels</option>
                ${this.renderChannelOptions()}
              </select>
            </div>

            <!-- Action -->
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select class="activity-filter-action w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="action">
                <option value="">All Actions</option>
                ${this.renderActionOptions()}
              </select>
            </div>

            <!-- Scope -->
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-500 mb-1">Scope</label>
              <select class="activity-filter-scope w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="scope_type">
                <option value="">All Scopes</option>
                <option value="user">User</option>
                <option value="org">Organization</option>
              </select>
            </div>

            <!-- Status -->
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select class="activity-filter-status w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="status">
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <!-- Date range and reset row -->
          <div class="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-gray-100">
            <!-- Object filter -->
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-500 mb-1">Object Type</label>
              <input type="text"
                     class="activity-filter-object-type w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g. connection"
                     data-filter="object_type">
            </div>

            <div class="w-48">
              <label class="block text-xs font-medium text-gray-500 mb-1">Object ID</label>
              <input type="text"
                     class="activity-filter-object-id w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     placeholder="Object ID"
                     data-filter="object_id">
            </div>

            <!-- Date From -->
            <div class="w-44">
              <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="datetime-local"
                     class="activity-filter-from w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     data-filter="from">
            </div>

            <!-- Date To -->
            <div class="w-44">
              <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="datetime-local"
                     class="activity-filter-to w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     data-filter="to">
            </div>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- Reset Button -->
            <button type="button"
                    class="activity-reset flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Reset filters">
              ${u("iconoir:refresh", { size: "16px" })}
              <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="activity-content">
          <!-- Timeline View -->
          <div class="activity-timeline-container ${this.state.viewMode === "timeline" ? "" : "hidden"}">
            <div class="activity-timeline space-y-4">
              <!-- Timeline entries will be rendered here -->
            </div>
          </div>

          <!-- Table View -->
          <div class="activity-table-container ${this.state.viewMode === "table" ? "" : "hidden"}">
            <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table class="activity-table w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Object</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Channel</th>
                  </tr>
                </thead>
                <tbody class="activity-tbody divide-y divide-gray-100">
                  <!-- Table rows will be rendered here -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Empty State -->
          <div class="activity-empty hidden py-12 text-center bg-white rounded-lg border border-gray-200">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              ${u("iconoir:activity", { size: "24px", extraClass: "text-gray-400" })}
            </div>
            <h3 class="text-lg font-medium text-gray-900">No activity found</h3>
            <p class="text-sm text-gray-500 mt-1">Activity entries will appear here as actions occur.</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="activity-pagination flex items-center justify-between mt-4">
          <div class="activity-info text-sm text-gray-500">
            <!-- Info will be rendered here -->
          </div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="activity-prev px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="activity-next px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    `, this.restoreFilterValues());
  }
  renderProviderOptions() {
    return !this.config.providers || this.config.providers.length === 0 ? "" : this.config.providers.map((t) => `<option value="${o(t.id)}">${o(t.name)}</option>`).join("");
  }
  renderChannelOptions() {
    return (this.config.channels || ["connections", "credentials", "grants", "webhooks", "sync", "lifecycle"]).map((e) => `<option value="${o(e)}">${o(H(e))}</option>`).join("");
  }
  renderActionOptions() {
    if (this.config.actions && this.config.actions.length > 0)
      return this.config.actions.map((i) => {
        const r = this.resolveActionLabel(i);
        return `<option value="${o(i)}">${o(r)}</option>`;
      }).join("");
    const t = Dt(), e = {
      connections: "Connections",
      credentials: "Credentials",
      sync: "Sync",
      webhooks: "Webhooks",
      subscriptions: "Subscriptions",
      installations: "Installations",
      grants: "Permissions",
      errors: "Errors",
      other: "Other"
    }, s = [];
    for (const [i, r] of Object.entries(t)) {
      const a = e[i] || H(i), l = r.map((c) => {
        const d = this.resolveActionLabel(c.action);
        return `<option value="${o(c.action)}">${o(d)}</option>`;
      }).join("");
      s.push(`<optgroup label="${o(a)}">${l}</optgroup>`);
    }
    return s.join("");
  }
  /**
   * Resolve action label using config override or centralized registry.
   */
  resolveActionLabel(t) {
    return this.config.getActionLabel ? this.config.getActionLabel(t) : jt(t);
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && t.search && (e.value = t.search);
    for (const [s, i] of Object.entries(t.filters)) {
      const r = this.container?.querySelector(`[data-filter="${s}"]`);
      r && i && (r.value = i);
    }
  }
  bindEvents() {
    if (!this.container) return;
    const t = this.container.querySelector(".activity-view-timeline"), e = this.container.querySelector(".activity-view-table");
    t?.addEventListener("click", () => this.setViewMode("timeline")), e?.addEventListener("click", () => this.setViewMode("table")), this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (h) => {
      this.queryState.setSearch(h.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((h) => {
      h.addEventListener("change", () => {
        const g = h.dataset.filter;
        this.queryState.setFilter(g, h.value || void 0);
      });
    }), this.container.querySelectorAll('input[data-filter]:not([type="text"])').forEach((h) => {
      h.addEventListener("change", () => {
        const g = h.dataset.filter;
        this.queryState.setFilter(g, h.value || void 0);
      });
    });
    const a = this.container.querySelector('[data-filter="object_type"]'), l = this.container.querySelector('[data-filter="object_id"]');
    a?.addEventListener("change", () => {
      this.queryState.setFilter("object_type", a.value || void 0);
    }), l?.addEventListener("change", () => {
      this.queryState.setFilter("object_id", l.value || void 0);
    }), this.container.querySelector(".activity-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const d = this.container.querySelector(".activity-prev"), p = this.container.querySelector(".activity-next");
    d?.addEventListener("click", () => this.queryState.prevPage()), p?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderEntries() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-empty"), i = this.container?.querySelector(".activity-timeline-container"), r = this.container?.querySelector(".activity-table-container");
    if (this.state.entries.length === 0) {
      this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = vt({
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount(),
        containerClass: "bg-white rounded-lg border border-gray-200"
      }), T(t, () => {
        this.queryState.reset(), this.restoreFilterValues();
      }))) : (r?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = R(7, {
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount()
      }), T(e, () => {
        this.queryState.reset(), this.restoreFilterValues();
      })))) : (i?.classList.add("hidden"), r?.classList.add("hidden"), s?.classList.remove("hidden")), this.updateFilterSummary();
      return;
    }
    s?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = this.state.entries.map((a) => this.renderTimelineEntry(a)).join(""), this.bindEntryActions())) : (r?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = this.state.entries.map((a) => this.renderTableRow(a)).join(""), this.bindEntryActions())), this.updateFilterSummary();
  }
  renderTimelineEntry(t) {
    const e = N[t.status] || N.pending, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : U(t.provider_id), i = this.resolveActionLabel(t.action), r = P(t.created_at), a = m(t.created_at);
    return `
      <div class="activity-entry flex gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
           data-entry-id="${o(t.id)}">
        <!-- Status indicator -->
        <div class="flex-shrink-0">
          <div class="w-10 h-10 rounded-full ${e.bg} flex items-center justify-center">
            ${u(e.icon, { size: "20px", extraClass: e.text })}
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-900">
                ${o(i)}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-500">${o(s)}</span>
                ${t.channel ? `
                  <span class="text-gray-300">&middot;</span>
                  <span class="text-xs text-gray-500">${o(t.channel)}</span>
                ` : ""}
                ${t.object_type && t.object_id ? `
                  <span class="text-gray-300">&middot;</span>
                  <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
                     class="activity-object-link text-xs text-blue-600 hover:text-blue-700"
                     data-object-type="${o(t.object_type)}"
                     data-object-id="${o(t.object_id)}">
                    ${o(t.object_type)}:${o(v(t.object_id))}
                  </a>
                ` : ""}
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-500" title="${o(r)}">${a}</p>
              <div class="flex items-center gap-1 mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
                  ${o(t.scope_type)}
                </span>
              </div>
            </div>
          </div>

          <!-- Metadata preview -->
          ${Object.keys(t.metadata || {}).length > 0 ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <div class="text-xs text-gray-500 font-mono truncate">
                ${o(this.formatMetadataPreview(t.metadata))}
              </div>
            </div>
          ` : ""}
        </div>

        <!-- Status badge -->
        <div class="flex-shrink-0">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${e.label}
          </span>
        </div>
      </div>
    `;
  }
  renderTableRow(t) {
    const e = N[t.status] || N.pending, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : U(t.provider_id), i = this.resolveActionLabel(t.action), r = P(t.created_at), a = m(t.created_at);
    return `
      <tr class="activity-row hover:bg-gray-50 cursor-pointer" data-entry-id="${o(t.id)}">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="text-sm text-gray-900" title="${o(r)}">${a}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm font-medium text-gray-900">${o(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-700">${o(i)}</span>
        </td>
        <td class="px-4 py-3">
          ${t.object_type && t.object_id ? `
            <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
               class="activity-object-link text-sm text-blue-600 hover:text-blue-700"
               data-object-type="${o(t.object_type)}"
               data-object-id="${o(t.object_id)}">
              ${o(t.object_type)}:${o(v(t.object_id))}
            </a>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${o(t.scope_type)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-500">${o(t.channel || "—")}</span>
        </td>
      </tr>
    `;
  }
  bindEntryActions() {
    this.container?.querySelectorAll("[data-entry-id]")?.forEach((s) => {
      const i = s.dataset.entryId;
      i && s.addEventListener("click", (r) => {
        if (r.target.closest("a")) return;
        const a = this.getEntry(i);
        a && this.config.onSelect && this.config.onSelect(a);
      });
    }), this.container?.querySelectorAll(".activity-object-link")?.forEach((s) => {
      s.addEventListener("click", (i) => {
        i.preventDefault(), i.stopPropagation();
        const r = s.dataset.objectType, a = s.dataset.objectId;
        if (!(!r || !a)) {
          if (this.config.onNavigate) {
            this.config.onNavigate(r, a);
            return;
          }
          this.config.useDeepLinks && this.createDeepLinkNavigateHandler()(r, a);
        }
      });
    });
  }
  /**
   * Create a navigate handler that uses deep links with context preservation.
   */
  createDeepLinkNavigateHandler() {
    return Ct(
      () => {
        const t = this.queryState.getState();
        return {
          filters: t.filters,
          search: t.search,
          page: t.page
        };
      },
      () => this.state.viewMode
    );
  }
  /**
   * Build object link URL for an activity entry.
   * Returns a deep link URL if deep links are enabled, otherwise '#'.
   */
  buildObjectLinkUrl(t, e) {
    if (!this.config.useDeepLinks)
      return "#";
    const s = Lt(t);
    if (!s)
      return "#";
    const i = this.queryState.getState(), r = {
      fromPage: window.location.pathname,
      filters: Object.fromEntries(
        Object.entries(i.filters).filter(([, a]) => a)
      ),
      search: i.search || void 0,
      page: i.page > 1 ? i.page : void 0,
      viewMode: this.state.viewMode
    };
    return kt(s, e, r);
  }
  updateViewModeUI() {
    const t = this.container?.querySelector(".activity-view-timeline"), e = this.container?.querySelector(".activity-view-table");
    this.state.viewMode === "timeline" ? (t?.classList.add("bg-white", "text-gray-900", "shadow-sm"), t?.classList.remove("text-gray-600"), e?.classList.remove("bg-white", "text-gray-900", "shadow-sm"), e?.classList.add("text-gray-600")) : (e?.classList.add("bg-white", "text-gray-900", "shadow-sm"), e?.classList.remove("text-gray-600"), t?.classList.remove("bg-white", "text-gray-900", "shadow-sm"), t?.classList.add("text-gray-600"));
  }
  updateFilterSummary() {
    const t = this.container?.querySelector(".activity-filter-summary");
    if (!t) return;
    const e = this.queryState.getActiveFilterCount(), s = this.queryState.getState();
    if (e === 0 && !s.search)
      t.textContent = `${this.state.total} entries`;
    else {
      const i = [];
      s.search && i.push(`"${s.search}"`), e > 0 && i.push(`${e} filter${e > 1 ? "s" : ""}`), t.textContent = `${this.state.total} entries matching ${i.join(" and ")}`;
    }
  }
  renderError() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-timeline-container"), i = this.container?.querySelector(".activity-table-container");
    this.container?.querySelector(".activity-empty")?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), i?.classList.add("hidden"), t && (t.innerHTML = V({
      title: "Failed to load activity",
      error: this.state.error,
      containerClass: "bg-white rounded-lg border border-gray-200",
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity()))) : (i?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = G(7, {
      title: "Failed to load activity",
      error: this.state.error,
      showRetry: !0
    }), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity())));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({
      resource: "activity"
    }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-timeline-container"), i = this.container?.querySelector(".activity-table-container"), r = this.container?.querySelector(".activity-empty");
    this.state.loading && (this.state.entries.length > 0 || (r?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), i?.classList.add("hidden"), t && (t.innerHTML = z({ text: "Loading activity..." }))) : (i?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = W(7, { text: "Loading activity..." })))));
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, { total: i } = this.state, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), l = a < i, c = e > 1, d = this.container?.querySelector(".activity-info"), p = this.container?.querySelector(".activity-prev"), h = this.container?.querySelector(".activity-next");
    d && (d.textContent = i > 0 ? `Showing ${r}-${a} of ${i}` : "No activity"), p && (p.disabled = !c), h && (h.disabled = !l);
  }
  // ---------------------------------------------------------------------------
  // View Mode Persistence
  // ---------------------------------------------------------------------------
  restoreViewMode() {
    const e = new URLSearchParams(window.location.search).get("view");
    if (e === "timeline" || e === "table") {
      this.state.viewMode = e;
      return;
    }
    try {
      const s = localStorage.getItem("services-activity-view");
      (s === "timeline" || s === "table") && (this.state.viewMode = s);
    } catch {
    }
  }
  saveViewMode() {
    try {
      localStorage.setItem("services-activity-view", this.state.viewMode);
    } catch {
    }
  }
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatMetadataPreview(t) {
    return Object.entries(t).slice(0, 3).map(([s, i]) => `${s}: ${JSON.stringify(i)}`).join(", ");
  }
}
async function Ge(n) {
  const t = new Yt(n);
  return await t.init(), t;
}
const et = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  expired: { label: "Expired", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:clock" },
  cancelled: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500", icon: "iconoir:cancel" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" }
}, st = {
  queued: { label: "Queued", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:clock" },
  running: { label: "Running", bg: "bg-blue-100", text: "text-blue-700", icon: "iconoir:play" },
  succeeded: { label: "Succeeded", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  failed: { label: "Failed", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" }
}, pt = {
  bootstrap: { label: "Bootstrap", description: "Full initial sync" },
  incremental: { label: "Incremental", description: "Delta changes only" },
  backfill: { label: "Backfill", description: "Historical data recovery" }
};
class Zt {
  constructor(t) {
    this.container = null, this.state = {
      providers: [],
      subscriptions: [],
      subscriptionsTotal: 0,
      syncJobs: [],
      syncJobsTotal: 0,
      loading: !1,
      error: null,
      activeTab: "subscriptions"
    }, this.abortController = null, this.actionQueue = new J(), this.config = {
      perPage: 25,
      syncUrl: !0,
      activeTab: "subscriptions",
      ...t
    }, this.state.activeTab = this.config.activeTab || "subscriptions", this.client = t.apiClient || E(), this.queryState = new O({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadData()
      },
      filterFields: ["provider_id", "connection_id", "status"],
      storageKey: "services-subscriptions-sync"
    });
  }
  /**
   * Initialize the page
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[SubscriptionsSyncPage] Container not found:", this.config.container);
      return;
    }
    if (!F()()) {
      this.renderForbidden();
      return;
    }
    this.restoreTab(), this.queryState.init(), this.renderStructure(), this.state.providers = await nt(this.client, {
      container: this.container,
      notifier: this.config.notifier,
      selectedProviderId: this.queryState.getState().filters.provider_id || "",
      getProviderName: this.config.getProviderName
    }), this.bindEvents(), await this.loadData();
  }
  /**
   * Refresh the data
   */
  async refresh() {
    await this.loadData();
  }
  /**
   * Set active tab
   */
  setTab(t) {
    this.state.activeTab !== t && (this.state.activeTab = t, this.saveTab(), this.updateTabUI(), this.loadData());
  }
  /**
   * Get active tab
   */
  getTab() {
    return this.state.activeTab;
  }
  /**
   * Get subscriptions
   */
  getSubscriptions() {
    return [...this.state.subscriptions];
  }
  /**
   * Get sync jobs
   */
  getSyncJobs() {
    return [...this.state.syncJobs];
  }
  /**
   * Destroy the manager
   */
  destroy() {
    this.abortController = Y(this.abortController, this.queryState);
  }
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  async loadData() {
    if (this.container) {
      this.abortController?.abort(), this.abortController = new AbortController(), this.state.loading = !0, this.state.error = null, this.updateLoadingState();
      try {
        const t = this.queryState.getQueryParams();
        this.state.activeTab === "subscriptions" ? await this.loadSubscriptions(t) : await this.loadSyncJobs(t);
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load data: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
  async loadSubscriptions(t) {
    const e = {
      provider_id: t.provider_id,
      connection_id: t.connection_id,
      status: t.status,
      q: t.q,
      page: t.page,
      per_page: t.per_page
    }, s = await this.client.listSubscriptions(e, this.abortController.signal);
    this.state.subscriptions = s.subscriptions, this.state.subscriptionsTotal = s.total, this.queryState.updateFromResponse(s.total, s.has_next), this.renderSubscriptions(), this.updatePagination();
  }
  async loadSyncJobs(t) {
    const e = t.provider_id, s = t.connection_id, i = t.status, r = String(t.q || "").trim().toLowerCase(), a = t.page || 1, l = t.per_page || this.config.perPage || 25, c = await this.loadSyncConnections({
      providerId: e,
      connectionId: s,
      signal: this.abortController?.signal
    }), h = (await Promise.all(
      c.map(async (y) => {
        try {
          const x = await this.client.getSyncStatus(y.id, this.abortController?.signal);
          return { connection: y, summary: x.sync_summary };
        } catch (x) {
          if (x.name === "AbortError")
            throw x;
          return null;
        }
      })
    )).filter((y) => y !== null).map((y) => this.toSyncJob(y.connection, y.summary)).filter((y) => y !== null).filter((y) => i && y.status !== i ? !1 : r ? this.matchesSyncSearch(y, r) : !0), g = h.length, f = (a - 1) * l, b = h.slice(f, f + l);
    this.state.syncJobs = b, this.state.syncJobsTotal = g, this.renderSyncJobs(), this.updatePagination();
  }
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  renderStructure() {
    this.container && (this.container.innerHTML = `
      <div class="subscriptions-sync-page">
        <!-- Tabs -->
        <div class="tabs-header flex items-center gap-4 mb-4 border-b border-gray-200">
          <button type="button"
                  class="tab-subscriptions px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${this.state.activeTab === "subscriptions" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}">
            ${u("iconoir:bell", { size: "16px" })}
            <span class="ml-1.5">Subscriptions</span>
          </button>
          <button type="button"
                  class="tab-sync px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${this.state.activeTab === "sync" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}">
            ${u("iconoir:sync", { size: "16px" })}
            <span class="ml-1.5">Sync Jobs</span>
          </button>
        </div>

        <!-- Filters -->
        <div class="filters bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex-1 min-w-[200px]">
              <input type="text"
                     class="search-input w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Search..."
                     data-filter="search">
            </div>

            <select class="filter-provider px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-filter="provider_id">
              <option value="">All Providers</option>
            </select>

            <select class="filter-status px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-filter="status">
              <option value="">All Statuses</option>
              ${this.state.activeTab === "subscriptions" ? this.renderSubscriptionStatusOptions() : this.renderSyncStatusOptions()}
            </select>

            <button type="button"
                    class="reset-btn px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    title="Reset filters">
              ${u("iconoir:refresh", { size: "16px" })}
            </button>
          </div>
        </div>

        <!-- Subscriptions Tab Content -->
        <div class="subscriptions-content ${this.state.activeTab === "subscriptions" ? "" : "hidden"}">
          <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table class="subscriptions-table w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Resource</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Channel ID</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Expires</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Updated</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody class="subscriptions-tbody divide-y divide-gray-100">
                <!-- Subscriptions will be rendered here -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sync Tab Content -->
        <div class="sync-content ${this.state.activeTab === "sync" ? "" : "hidden"}">
          <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table class="sync-table w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Mode</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Cursor</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Last Run</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Error</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody class="sync-tbody divide-y divide-gray-100">
                <!-- Sync jobs will be rendered here -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state hidden py-12 text-center bg-white rounded-lg border border-gray-200">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            ${u("iconoir:bell-off", { size: "24px", extraClass: "text-gray-400" })}
          </div>
          <h3 class="text-lg font-medium text-gray-900 empty-title">No subscriptions found</h3>
          <p class="text-sm text-gray-500 mt-1 empty-message">Subscriptions will appear here when created.</p>
        </div>

        <!-- Pagination -->
        <div class="pagination flex items-center justify-between mt-4">
          <div class="info text-sm text-gray-500">
            <!-- Info will be rendered here -->
          </div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="prev-btn px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="next-btn px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    `, this.restoreFilterValues());
  }
  renderSubscriptionStatusOptions() {
    return Object.entries(et).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  renderSyncStatusOptions() {
    return Object.entries(st).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && (e.value = t.search || ""), this.container?.querySelectorAll("[data-filter]")?.forEach((i) => {
      const r = i.dataset.filter;
      r !== "search" && (i.value = t.filters[r] || "");
    });
  }
  bindEvents() {
    if (!this.container) return;
    const t = this.container.querySelector(".tab-subscriptions"), e = this.container.querySelector(".tab-sync");
    t?.addEventListener("click", () => this.setTab("subscriptions")), e?.addEventListener("click", () => this.setTab("sync")), this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (c) => {
      this.queryState.setSearch(c.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((c) => {
      c.addEventListener("change", () => {
        const d = c.dataset.filter;
        this.queryState.setFilter(d, c.value || void 0);
      });
    }), this.container.querySelector(".reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const a = this.container.querySelector(".prev-btn"), l = this.container.querySelector(".next-btn");
    a?.addEventListener("click", () => this.queryState.prevPage()), l?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderSubscriptions() {
    const t = this.container?.querySelector(".subscriptions-tbody"), e = this.container?.querySelector(".empty-state"), s = this.container?.querySelector(".subscriptions-content");
    if (t) {
      if (this.state.subscriptions.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = R(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), T(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("subscriptions"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.subscriptions.map((i) => this.renderSubscriptionRow(i)).join(""), this.bindSubscriptionActions();
    }
  }
  renderSubscriptionRow(t) {
    const e = et[t.status] || et.errored, s = w(t.provider_id, this.config.getProviderName), i = t.expires_at ? m(t.expires_at, { allowFuture: !0, futureImmediateLabel: "Soon" }) : "—", r = t.expires_at ? P(t.expires_at) : "", a = m(t.updated_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }), l = t.expires_at && this.isExpiringSoon(t.expires_at);
    return `
      <tr class="subscription-row hover:bg-gray-50 cursor-pointer" data-subscription-id="${o(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${o(s)}</span>
        </td>
        <td class="px-4 py-3">
          <div class="text-sm text-gray-700">${o(t.resource_type)}</div>
          <div class="text-xs text-gray-500" title="${o(t.resource_id)}">
            ${o(v(t.resource_id))}
          </div>
        </td>
        <td class="px-4 py-3">
          <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">${o(v(t.channel_id, 16))}</code>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="${l ? "text-amber-600 font-medium" : "text-gray-500"}" title="${r}">
            ${i}
          </span>
          ${l ? u("iconoir:warning-triangle", { size: "12px", extraClass: "inline ml-1 text-amber-500" }) : ""}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${a}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSubscriptionActions(t)}
        </td>
      </tr>
    `;
  }
  buildSubscriptionActions(t) {
    const e = [];
    return t.status === "active" && A()() && e.push(`
        <button type="button"
                class="action-renew p-1 text-gray-400 hover:text-blue-600"
                data-action="renew"
                title="Renew subscription">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status !== "cancelled" && A()() && e.push(`
        <button type="button"
                class="action-cancel p-1 text-gray-400 hover:text-red-600"
                data-action="cancel"
                title="Cancel subscription">
          ${u("iconoir:cancel", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindSubscriptionActions() {
    this.container?.querySelectorAll(".subscription-row")?.forEach((e) => {
      const s = e.dataset.subscriptionId;
      s && (e.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const r = this.state.subscriptions.find((a) => a.id === s);
        r && this.config.onSubscriptionSelect && this.config.onSubscriptionSelect(r);
      }), e.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (r) => {
          switch (r.stopPropagation(), i.dataset.action) {
            case "renew":
              await this.handleRenew(s, i);
              break;
            case "cancel":
              await this.handleCancel(s, i);
              break;
          }
        });
      }));
    });
  }
  renderSyncJobs() {
    const t = this.container?.querySelector(".sync-tbody"), e = this.container?.querySelector(".empty-state"), s = this.container?.querySelector(".sync-content");
    if (t) {
      if (this.state.syncJobs.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = R(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), T(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("sync"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.syncJobs.map((i) => this.renderSyncJobRow(i)).join(""), this.bindSyncJobActions();
    }
  }
  renderSyncJobRow(t) {
    const e = st[t.status] || st.failed, s = pt[t.mode] || pt.incremental, i = w(t.provider_id, this.config.getProviderName), r = t.metadata, a = typeof r.last_synced_at == "string" ? r.last_synced_at : "", l = a ? m(a, { allowFuture: !0, futureImmediateLabel: "Soon" }) : m(t.updated_at, { allowFuture: !0, futureImmediateLabel: "Soon" }), c = typeof r.last_sync_error == "string" ? r.last_sync_error : "", d = t.checkpoint || "";
    return `
      <tr class="sync-row hover:bg-gray-50 cursor-pointer" data-job-id="${o(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${o(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700" title="${s.description}">
            ${s.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          ${d ? `
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded" title="${o(d)}">
              ${o(v(d, 16))}
            </code>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-gray-500 text-sm">
          ${l}
        </td>
        <td class="px-4 py-3 text-xs">
          ${c ? `<span class="text-red-600" title="${o(c)}">${o(v(c, 48))}</span>` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSyncJobActions(t)}
        </td>
      </tr>
    `;
  }
  buildSyncJobActions(t) {
    const e = [];
    return t.status !== "running" && A()() && e.push(`
        <button type="button"
                class="action-run p-1 text-gray-400 hover:text-green-600"
                data-action="run"
                title="Run sync now">
          ${u("iconoir:play", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindSyncJobActions() {
    this.container?.querySelectorAll(".sync-row")?.forEach((e) => {
      const s = e.dataset.jobId;
      s && (e.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const r = this.state.syncJobs.find((a) => a.id === s);
        r && this.config.onSyncJobSelect && this.config.onSyncJobSelect(r);
      }), e.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (r) => {
          r.stopPropagation(), i.dataset.action === "run" && await this.handleRunSync(s, i);
        });
      }));
    });
  }
  async handleRenew(t, e) {
    this.actionQueue.isInFlight(`renew-${t}`) || await this.actionQueue.execute(`renew-${t}`, async () => {
      await S({
        mutation: () => this.client.renewSubscription(t),
        notifier: this.config.notifier,
        successMessage: "Subscription renewal initiated",
        errorMessagePrefix: "Failed to renew",
        buttonConfig: e ? {
          button: e,
          loadingText: "Renewing...",
          successText: "Renewed",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadData()
      });
    });
  }
  async handleCancel(t, e) {
    await Q({
      action: "cancel",
      resourceType: "subscription"
    }) && (this.actionQueue.isInFlight(`cancel-${t}`) || await this.actionQueue.execute(`cancel-${t}`, async () => {
      await S({
        mutation: () => this.client.cancelSubscription(t),
        notifier: this.config.notifier,
        successMessage: "Subscription cancelled",
        errorMessagePrefix: "Failed to cancel",
        buttonConfig: e ? {
          button: e,
          loadingText: "Cancelling...",
          successText: "Cancelled",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadData()
      });
    }));
  }
  async handleRunSync(t, e) {
    const s = this.state.syncJobs.find((l) => l.id === t);
    if (!s) return;
    const i = s.metadata, r = typeof i.run_resource_type == "string" && i.run_resource_type ? i.run_resource_type : "default", a = typeof i.run_resource_id == "string" && i.run_resource_id ? i.run_resource_id : "default";
    this.actionQueue.isInFlight(`sync-${t}`) || await this.actionQueue.execute(`sync-${t}`, async () => {
      await S({
        mutation: () => this.client.runSync(s.connection_id, {
          provider_id: s.provider_id,
          resource_type: r,
          resource_id: a
        }),
        notifier: this.config.notifier,
        successMessage: "Sync job started",
        errorMessagePrefix: "Failed to start sync",
        buttonConfig: e ? {
          button: e,
          loadingText: "Starting...",
          successText: "Started",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadData()
      });
    });
  }
  updateTabUI() {
    const t = this.container?.querySelector(".tab-subscriptions"), e = this.container?.querySelector(".tab-sync"), s = this.container?.querySelector(".subscriptions-content"), i = this.container?.querySelector(".sync-content"), r = this.container?.querySelector('[data-filter="status"]');
    this.state.activeTab === "subscriptions" ? (t?.classList.add("border-blue-500", "text-blue-600"), t?.classList.remove("border-transparent", "text-gray-500"), e?.classList.remove("border-blue-500", "text-blue-600"), e?.classList.add("border-transparent", "text-gray-500"), s?.classList.remove("hidden"), i?.classList.add("hidden"), r && (r.innerHTML = `<option value="">All Statuses</option>${this.renderSubscriptionStatusOptions()}`, r.value = this.queryState.getState().filters.status || "")) : (e?.classList.add("border-blue-500", "text-blue-600"), e?.classList.remove("border-transparent", "text-gray-500"), t?.classList.remove("border-blue-500", "text-blue-600"), t?.classList.add("border-transparent", "text-gray-500"), i?.classList.remove("hidden"), s?.classList.add("hidden"), r && (r.innerHTML = `<option value="">All Statuses</option>${this.renderSyncStatusOptions()}`, r.value = this.queryState.getState().filters.status || "")), this.restoreFilterValues();
  }
  updateEmptyState(t) {
    const e = this.container?.querySelector(".empty-title"), s = this.container?.querySelector(".empty-message");
    t === "subscriptions" ? (e && (e.textContent = "No subscriptions found"), s && (s.textContent = "Subscriptions will appear here when created.")) : (e && (e.textContent = "No sync jobs found"), s && (s.textContent = "Sync jobs will appear here when syncs are triggered."));
  }
  renderError() {
    const t = this.state.activeTab === "subscriptions" ? ".subscriptions-content" : ".sync-content", e = this.container?.querySelector(t), s = this.container?.querySelector(".empty-state"), i = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody");
    if (!i) return;
    const r = 7;
    i.innerHTML = G(r, {
      title: `Failed to load ${this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs"}`,
      error: this.state.error,
      showRetry: !0
    }), e?.classList.remove("hidden"), s?.classList.add("hidden"), i.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadData());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({
      resource: "subscriptions and sync"
    }));
  }
  updateLoadingState() {
    const t = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-content") : this.container?.querySelector(".sync-content"), e = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody"), s = this.container?.querySelector(".empty-state");
    if (!this.state.loading || !e) return;
    if ((this.state.activeTab === "subscriptions" ? this.state.subscriptions : this.state.syncJobs).length === 0) {
      const a = this.state.activeTab === "subscriptions" ? "Loading subscriptions..." : "Loading sync jobs...";
      t?.classList.remove("hidden"), s?.classList.add("hidden"), e.innerHTML = W(7, { text: a });
    }
  }
  async loadSyncConnections(t) {
    const { providerId: e, connectionId: s, signal: i } = t;
    if (s)
      try {
        const a = await this.client.getConnectionDetail(s, i);
        return e && a.connection.provider_id !== e ? [] : [a.connection];
      } catch (a) {
        if (a.name === "AbortError")
          throw a;
        if (a instanceof I && a.isNotFound)
          return [];
        throw a;
      }
    return (await this.client.listConnections({
      provider_id: e,
      page: 1,
      per_page: 200
    }, i)).connections;
  }
  toSyncJob(t, e) {
    const s = e.cursors[0], i = s?.resource_type || "default", r = s?.resource_id || "default", a = {
      ...e.last_job?.metadata || {},
      last_synced_at: e.last_synced_at || null,
      last_sync_error: e.last_sync_error || "",
      run_resource_type: i,
      run_resource_id: r
    };
    return e.last_job ? {
      ...e.last_job,
      checkpoint: e.last_cursor || e.last_job.checkpoint,
      metadata: a
    } : !e.last_cursor && !e.last_synced_at && !e.last_sync_error ? null : {
      id: `synthetic-sync-${t.id}`,
      connection_id: t.id,
      provider_id: t.provider_id,
      mode: "incremental",
      checkpoint: e.last_cursor || "",
      status: e.last_sync_error ? "failed" : "succeeded",
      attempts: 0,
      metadata: a,
      created_at: t.created_at,
      updated_at: e.last_synced_at || t.updated_at
    };
  }
  matchesSyncSearch(t, e) {
    const s = t.metadata;
    return [
      t.id,
      t.connection_id,
      t.provider_id,
      t.mode,
      t.status,
      t.checkpoint || "",
      typeof s.last_sync_error == "string" ? s.last_sync_error : ""
    ].join(" ").toLowerCase().includes(e);
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, i = this.state.activeTab === "subscriptions" ? this.state.subscriptionsTotal : this.state.syncJobsTotal, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), l = a < i, c = e > 1, d = this.container?.querySelector(".info"), p = this.container?.querySelector(".prev-btn"), h = this.container?.querySelector(".next-btn"), g = this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs";
    d && (d.textContent = i > 0 ? `Showing ${r}-${a} of ${i} ${g}` : `No ${g}`), p && (p.disabled = !c), h && (h.disabled = !l);
  }
  // ---------------------------------------------------------------------------
  // Tab Persistence
  // ---------------------------------------------------------------------------
  restoreTab() {
    const e = new URLSearchParams(window.location.search).get("tab");
    (e === "subscriptions" || e === "sync") && (this.state.activeTab = e);
  }
  saveTab() {
    const t = new URLSearchParams(window.location.search);
    t.set("tab", this.state.activeTab);
    const e = `${window.location.pathname}?${t.toString()}`;
    window.history.replaceState({}, "", e);
  }
  isExpiringSoon(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return !1;
    const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime();
    return i > 0 && i < 864e5;
  }
}
async function Qe(n) {
  const t = new Zt(n);
  return await t.init(), t;
}
const gt = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  disconnected: { label: "Disconnected", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:cancel" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  pending_reauth: { label: "Pending Reauth", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:clock" },
  needs_reconsent: { label: "Needs Reconsent", bg: "bg-orange-100", text: "text-orange-700", icon: "iconoir:refresh" }
}, Xt = {
  granted: { label: "Granted", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check" },
  requested: { label: "Requested", bg: "bg-blue-100", text: "text-blue-700", icon: "iconoir:clock" },
  missing: { label: "Missing", bg: "bg-gray-100", text: "text-gray-500", icon: "iconoir:minus" },
  capability_required: { label: "Required", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:warning-triangle" }
};
class te {
  constructor(t) {
    this.container = null, this.state = {
      connection: null,
      grantSnapshot: null,
      provider: null,
      credentialHealth: null,
      rateLimitSummary: null,
      loading: !1,
      error: null,
      reconsentInProgress: !1
    }, this.abortController = null, this.actionQueue = new J(), this.config = t, this.client = t.apiClient || E();
  }
  /**
   * Initialize the detail panel
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ConnectionDetail] Container not found:", this.config.container);
      return;
    }
    if (!F()()) {
      this.renderForbidden();
      return;
    }
    await this.loadConnection();
  }
  /**
   * Refresh the connection data
   */
  async refresh() {
    await this.loadConnection();
  }
  /**
   * Get the current connection
   */
  getConnection() {
    return this.state.connection;
  }
  /**
   * Get the grant snapshot
   */
  getGrantSnapshot() {
    return this.state.grantSnapshot;
  }
  /**
   * Set the connection ID and reload
   */
  async setConnectionId(t) {
    this.config.connectionId = t, await this.loadConnection();
  }
  /**
   * Destroy the manager
   */
  destroy() {
    this.abortController?.abort();
  }
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  async loadConnection() {
    if (this.container) {
      this.abortController?.abort(), this.abortController = new AbortController(), this.state.loading = !0, this.state.error = null, this.renderLoading();
      try {
        const [t, e, s] = await Promise.all([
          this.client.getConnectionDetail(this.config.connectionId, this.abortController.signal),
          this.client.getConnectionGrants(this.config.connectionId, this.abortController.signal),
          this.client.listProviders(this.abortController.signal)
        ]), i = t.connection;
        this.state.connection = i, this.state.grantSnapshot = e.snapshot, this.state.provider = s.providers.find((r) => r.id === i.provider_id) || null, this.state.credentialHealth = t.credential_health || null, this.state.rateLimitSummary = t.rate_limit_summary || null, this.render();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load connection: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1;
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  render() {
    if (!this.container || !this.state.connection) return;
    const t = this.state.connection, e = gt[t.status] || gt.disconnected, s = w(t.provider_id, this.config.getProviderName), i = this.buildGrantInfoList(), r = i.some((l) => l.status === "capability_required"), a = t.status === "needs_reconsent" || r;
    this.container.innerHTML = `
      <div class="connection-detail">
        <!-- Header -->
        <div class="detail-header flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            ${this.config.onBack ? `
              <button type="button" class="back-btn p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                ${u("iconoir:arrow-left", { size: "20px" })}
              </button>
            ` : ""}
            <div>
              <h2 class="text-xl font-semibold text-gray-900">${o(s)}</h2>
              <p class="text-sm text-gray-500 mt-0.5">Connection Details</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${e.bg} ${e.text}">
              ${u(e.icon, { size: "16px" })}
              ${e.label}
            </span>
          </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Scope</dt>
            <dd class="mt-1 flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
                ${o(t.scope_type)}
              </span>
              <span class="text-sm text-gray-700" title="${o(t.scope_id)}">
                ${o(v(t.scope_id, 16))}
              </span>
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">External Account</dt>
            <dd class="mt-1 text-sm text-gray-700" title="${o(t.external_account_id)}">
              ${o(v(t.external_account_id, 20))}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${P(t.created_at)}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${P(t.updated_at)}
            </dd>
          </div>
        </div>

        ${t.last_error ? `
          <div class="error-banner flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex-shrink-0 text-red-500">
              ${u("iconoir:warning-circle", { size: "20px" })}
            </div>
            <div>
              <h4 class="text-sm font-medium text-red-800">Last Error</h4>
              <p class="text-sm text-red-700 mt-1">${o(t.last_error)}</p>
            </div>
          </div>
        ` : ""}

        ${a ? `
          <div class="reconsent-banner flex items-center justify-between p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 text-amber-500">
                ${u("iconoir:warning-triangle", { size: "20px" })}
              </div>
              <div>
                <h4 class="text-sm font-medium text-amber-800">Re-consent Required</h4>
                <p class="text-sm text-amber-700 mt-1">
                  ${r ? "Some required permissions are missing. Re-consent to restore full functionality." : "This connection needs re-authorization to continue working."}
                </p>
              </div>
            </div>
            ${yt()() ? `
              <button type="button"
                      class="reconsent-btn flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                Re-consent Now
              </button>
            ` : ""}
          </div>
        ` : ""}

        <!-- Grant Matrix -->
        <div class="grant-matrix bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900">Permissions</h3>
              ${this.state.grantSnapshot ? `
                <span class="text-xs text-gray-500">
                  Version ${this.state.grantSnapshot.version} • Captured ${m(this.state.grantSnapshot.captured_at, {
      allowFuture: !0,
      futureImmediateLabel: "in a moment",
      pastImmediateLabel: "just now"
    })}
                </span>
              ` : ""}
            </div>
          </div>

          <div class="divide-y divide-gray-100">
            ${this.renderGrantMatrix(i)}
          </div>

          ${i.length === 0 ? `
            <div class="px-4 py-8 text-center">
              <p class="text-sm text-gray-500">No permissions configured for this connection.</p>
            </div>
          ` : ""}
        </div>

        <!-- Capabilities Section -->
        ${this.state.provider && this.state.provider.capabilities.length > 0 ? `
          <div class="capabilities-section mt-6 bg-white rounded-lg border border-gray-200">
            <div class="px-4 py-3 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Capabilities</h3>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.renderCapabilities()}
              </div>
            </div>
          </div>
        ` : ""}

        <!-- Operational Status Panels -->
        <div class="operational-panels grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <!-- Credential Health Panel -->
          ${this.renderCredentialHealthPanel()}

          <!-- Rate Limit / Quota Panel -->
          ${this.renderRateLimitPanel()}
        </div>

        <!-- Actions -->
        <div class="actions flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          ${A()() && t.status === "active" ? `
            <button type="button"
                    class="refresh-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              ${u("iconoir:refresh", { size: "16px", extraClass: "mr-1.5" })}
              Refresh Credentials
            </button>
          ` : ""}
          ${rt()() && t.status !== "disconnected" ? `
            <button type="button"
                    class="revoke-btn px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              ${u("iconoir:cancel", { size: "16px", extraClass: "mr-1.5" })}
              Revoke Connection
            </button>
          ` : ""}
        </div>
      </div>
    `, this.bindEvents();
  }
  renderGrantMatrix(t) {
    return t.length === 0 ? "" : t.map((e) => {
      const s = Xt[e.status], i = e.capabilities.length > 0 ? e.capabilities.map((r) => H(r)).join(", ") : null;
      return `
          <div class="grant-row flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-gray-700">${o(e.grant)}</code>
                ${e.isCapabilityRequired ? `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600" title="Required by capabilities">
                    ${u("iconoir:puzzle", { size: "10px", extraClass: "mr-0.5" })}
                    Required
                  </span>
                ` : ""}
              </div>
              ${i ? `
                <p class="text-xs text-gray-500 mt-0.5">
                  Used by: ${o(i)}
                </p>
              ` : ""}
            </div>
            <div class="flex-shrink-0">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}">
                ${u(s.icon, { size: "12px" })}
                ${s.label}
              </span>
            </div>
          </div>
        `;
    }).join("");
  }
  renderCapabilities() {
    return !this.state.provider || !this.state.grantSnapshot ? "" : this.state.provider.capabilities.map((t) => {
      const e = new Set(this.state.grantSnapshot.granted_grants), s = t.required_grants.every((h) => e.has(h)), i = t.optional_grants.every((h) => e.has(h)), r = s && i, a = s && !i, l = !s;
      let c, d, p;
      return r ? (c = "Fully Enabled", d = "bg-green-100 text-green-700", p = "iconoir:check-circle") : a ? (c = "Partially Enabled", d = "bg-blue-100 text-blue-700", p = "iconoir:half-moon") : (c = t.denied_behavior === "block" ? "Blocked" : "Degraded", d = t.denied_behavior === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700", p = t.denied_behavior === "block" ? "iconoir:lock" : "iconoir:warning-triangle"), `
          <div class="capability-card border border-gray-200 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">${o(H(t.name))}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  ${t.required_grants.length} required, ${t.optional_grants.length} optional
                </p>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${d}">
                ${u(p, { size: "12px" })}
                ${c}
              </span>
            </div>
            ${l && t.denied_behavior === "block" ? `
              <p class="text-xs text-red-600 mt-2">
                Missing required: ${t.required_grants.filter((h) => !e.has(h)).join(", ")}
              </p>
            ` : ""}
          </div>
        `;
    }).join("");
  }
  renderCredentialHealthPanel() {
    const t = this.state.credentialHealth;
    if (!t)
      return "";
    let e = "healthy", s = "Healthy", i = "bg-green-100 text-green-700 border-green-200", r = "iconoir:shield-check";
    if (!t.has_active_credential)
      e = "error", s = "No Active Credential", i = "bg-red-100 text-red-700 border-red-200", r = "iconoir:warning-circle";
    else if (t.last_error)
      e = "error", s = "Credential Error", i = "bg-red-100 text-red-700 border-red-200", r = "iconoir:warning-circle";
    else if (t.expires_at) {
      const a = new Date(t.expires_at), l = /* @__PURE__ */ new Date(), c = (a.getTime() - l.getTime()) / (1e3 * 60 * 60);
      c < 0 ? (e = "error", s = "Expired", i = "bg-red-100 text-red-700 border-red-200", r = "iconoir:clock") : c < 24 && (e = "warning", s = "Expiring Soon", i = "bg-amber-100 text-amber-700 border-amber-200", r = "iconoir:clock");
    }
    return `
      <div class="credential-health-panel bg-white rounded-lg border ${e === "healthy" ? "border-gray-200" : e === "warning" ? "border-amber-200" : "border-red-200"}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${u("iconoir:key", { size: "20px" })}
            Credential Health
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${i}">
            ${u(r, { size: "12px" })}
            ${s}
          </span>
        </div>
        <div class="p-4 space-y-3">
          <!-- Status Row -->
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Active Credential</span>
            <span class="text-sm font-medium ${t.has_active_credential ? "text-green-600" : "text-red-600"}">
              ${t.has_active_credential ? "Yes" : "No"}
            </span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Refreshable</span>
            <span class="text-sm font-medium ${t.refreshable ? "text-green-600" : "text-gray-500"}">
              ${t.refreshable ? "Yes" : "No"}
            </span>
          </div>
          ${t.expires_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Expires At</span>
              <span class="text-sm font-medium text-gray-900" title="${o(t.expires_at)}">
                ${m(t.expires_at, {
      allowFuture: !0,
      futureImmediateLabel: "in a moment",
      pastImmediateLabel: "just now"
    })}
              </span>
            </div>
          ` : ""}
          ${t.last_refresh_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Last Refresh</span>
              <span class="text-sm font-medium text-gray-900" title="${o(t.last_refresh_at)}">
                ${m(t.last_refresh_at, {
      allowFuture: !0,
      futureImmediateLabel: "in a moment",
      pastImmediateLabel: "just now"
    })}
              </span>
            </div>
          ` : ""}
          ${t.next_refresh_attempt_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Next Refresh</span>
              <span class="text-sm font-medium text-gray-900" title="${o(t.next_refresh_attempt_at)}">
                ${m(t.next_refresh_attempt_at, {
      allowFuture: !0,
      futureImmediateLabel: "in a moment",
      pastImmediateLabel: "just now"
    })}
              </span>
            </div>
          ` : ""}
          ${t.last_error ? `
            <div class="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div class="flex items-start gap-2">
                ${u("iconoir:warning-circle", { size: "16px", extraClass: "text-red-500 mt-0.5 flex-shrink-0" })}
                <p class="text-sm text-red-700">${o(t.last_error)}</p>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  renderRateLimitPanel() {
    const t = this.state.rateLimitSummary;
    if (!t)
      return "";
    let e = "healthy", s = "Normal", i = "bg-green-100 text-green-700", r = "iconoir:check-circle";
    if (t.exhausted_buckets > 0) {
      const l = t.exhausted_buckets / Math.max(t.total_buckets, 1);
      l >= 1 ? (e = "exhausted", s = "All Limits Exhausted", i = "bg-red-100 text-red-700", r = "iconoir:warning-circle") : l >= 0.5 ? (e = "warning", s = "High Usage", i = "bg-amber-100 text-amber-700", r = "iconoir:warning-triangle") : (e = "warning", s = "Some Limits Hit", i = "bg-amber-100 text-amber-700", r = "iconoir:clock");
    }
    const a = t.total_buckets > 0 ? Math.round(t.exhausted_buckets / t.total_buckets * 100) : 0;
    return `
      <div class="rate-limit-panel bg-white rounded-lg border ${e === "healthy" ? "border-gray-200" : e === "warning" ? "border-amber-200" : "border-red-200"}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${u("iconoir:graph-up", { size: "20px" })}
            Rate Limits
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${i}">
            ${u(r, { size: "12px" })}
            ${s}
          </span>
        </div>
        <div class="p-4 space-y-3">
          <!-- Usage Bar -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-gray-600">Bucket Usage</span>
              <span class="text-sm font-medium text-gray-900">
                ${t.exhausted_buckets} / ${t.total_buckets} exhausted
              </span>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full transition-all duration-300 ${e === "healthy" ? "bg-green-500" : e === "warning" ? "bg-amber-500" : "bg-red-500"}" style="width: ${a}%"></div>
            </div>
          </div>

          ${t.next_reset_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Next Reset</span>
              <span class="text-sm font-medium text-gray-900" title="${o(t.next_reset_at)}">
                ${m(t.next_reset_at, {
      allowFuture: !0,
      futureImmediateLabel: "in a moment",
      pastImmediateLabel: "just now"
    })}
              </span>
            </div>
          ` : ""}

          ${t.max_retry_after_seconds > 0 ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Max Retry After</span>
              <span class="text-sm font-medium text-gray-900">
                ${this.formatDuration(t.max_retry_after_seconds)}
              </span>
            </div>
          ` : ""}

          ${e === "exhausted" ? `
            <div class="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div class="flex items-start gap-2">
                ${u("iconoir:warning-circle", { size: "16px", extraClass: "text-red-500 mt-0.5 flex-shrink-0" })}
                <p class="text-sm text-red-700">
                  All rate limit buckets are exhausted. API requests may be throttled until limits reset.
                </p>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  formatDuration(t) {
    if (t < 60)
      return `${t}s`;
    if (t < 3600)
      return `${Math.floor(t / 60)}m`;
    const e = Math.floor(t / 3600), s = Math.floor(t % 3600 / 60);
    return s > 0 ? `${e}h ${s}m` : `${e}h`;
  }
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector(".back-btn")?.addEventListener("click", () => {
      this.config.onBack?.();
    }), this.container.querySelector(".reconsent-btn")?.addEventListener("click", () => this.handleReconsent()), this.container.querySelector(".refresh-btn")?.addEventListener("click", () => this.handleRefresh()), this.container.querySelector(".revoke-btn")?.addEventListener("click", () => this.handleRevoke());
  }
  async handleReconsent() {
    if (!(!this.state.connection || this.state.reconsentInProgress)) {
      this.state.reconsentInProgress = !0, this.updateReconsentButtonState();
      try {
        const e = this.buildGrantInfoList().filter((i) => i.status === "capability_required").map((i) => i.grant), s = await this.client.beginReconsent(this.config.connectionId, {
          requested_grants: e.length > 0 ? e : void 0
        });
        s.begin?.authorize_url && (this.config.onReconsentComplete?.(this.config.connectionId), window.location.href = s.begin.authorize_url);
      } catch (t) {
        this.config.notifier?.error(`Failed to start re-consent: ${t.message}`), this.state.reconsentInProgress = !1, this.updateReconsentButtonState();
      }
    }
  }
  async handleRefresh() {
    if (!this.state.connection) return;
    const t = this.container?.querySelector(".refresh-btn");
    this.actionQueue.isInFlight("refresh") || await this.actionQueue.execute("refresh", async () => {
      await S({
        mutation: () => this.client.refreshConnection(this.config.connectionId, {
          provider_id: this.state.connection.provider_id
        }),
        notifier: this.config.notifier,
        successMessage: "Connection refresh initiated",
        errorMessagePrefix: "Failed to refresh",
        buttonConfig: t ? {
          button: t,
          loadingText: "Refreshing...",
          successText: "Refreshed",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.loadConnection()
      });
    });
  }
  async handleRevoke() {
    if (!this.state.connection) return;
    const t = this.config.getProviderName ? this.config.getProviderName(this.state.connection.provider_id) : U(this.state.connection.provider_id);
    if (!await Q({
      action: "revoke",
      resourceType: "connection",
      resourceName: t
    })) return;
    const s = this.container?.querySelector(".revoke-btn");
    this.actionQueue.isInFlight("revoke") || await this.actionQueue.execute("revoke", async () => {
      await S({
        mutation: () => this.client.revokeConnection(this.config.connectionId),
        notifier: this.config.notifier,
        successMessage: "Connection revoked",
        errorMessagePrefix: "Failed to revoke",
        buttonConfig: s ? {
          button: s,
          loadingText: "Revoking...",
          successText: "Revoked",
          errorText: "Failed"
        } : void 0,
        onSuccess: () => this.config.onRevoke?.(this.config.connectionId)
      });
    });
  }
  updateReconsentButtonState() {
    const t = this.container?.querySelector(".reconsent-btn");
    t && (this.state.reconsentInProgress ? (t.disabled = !0, t.innerHTML = `
        <svg class="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Redirecting...
      `) : (t.disabled = !1, t.textContent = "Re-consent Now"));
  }
  renderLoading() {
    this.container && (this.container.innerHTML = z({
      text: "Loading connection details...",
      size: "lg"
    }));
  }
  renderError() {
    if (!this.container) return;
    this.container.innerHTML = V({
      title: "Failed to Load Connection",
      error: this.state.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnection());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({
      resource: "connection details"
    }));
  }
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  buildGrantInfoList() {
    const t = this.state.grantSnapshot, e = this.state.provider;
    if (!t)
      return [];
    const s = new Set(t.requested_grants), i = new Set(t.granted_grants), r = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set();
    if (e)
      for (const p of e.capabilities) {
        for (const h of p.required_grants) {
          a.add(h);
          const g = r.get(h) || [];
          g.push(p.name), r.set(h, g);
        }
        for (const h of p.optional_grants) {
          const g = r.get(h) || [];
          g.push(p.name), r.set(h, g);
        }
      }
    const l = /* @__PURE__ */ new Set([
      ...t.requested_grants,
      ...t.granted_grants,
      ...a
    ]), c = [];
    for (const p of l) {
      const h = i.has(p), g = s.has(p), f = a.has(p);
      let b;
      h ? b = "granted" : g ? b = "requested" : f ? b = "capability_required" : b = "missing", c.push({
        grant: p,
        status: b,
        isRequired: g || f,
        isCapabilityRequired: f,
        capabilities: r.get(p) || []
      });
    }
    const d = {
      capability_required: 0,
      granted: 1,
      requested: 2,
      missing: 3
    };
    return c.sort((p, h) => d[p.status] - d[h.status]), c;
  }
}
async function Je(n) {
  const t = new te(n);
  return await t.init(), t;
}
export {
  J as ActionQueue,
  Yt as ActivityPageManager,
  Ze as CommandRuntimeController,
  te as ConnectionDetailManager,
  Jt as ConnectionsListManager,
  M as DEFAULT_ACTION_LABELS,
  He as ExtensionDiagnosticsPanel,
  Ht as FOCUSABLE_SELECTOR,
  Kt as InstallationsListManager,
  It as MutationButtonManager,
  Qt as ProvidersCatalogManager,
  O as QueryStateManager,
  bt as ServicesAPIClient,
  I as ServicesAPIError,
  B as ServicesPermissionManager,
  _ as ServicesPermissions,
  Zt as SubscriptionsSyncPageManager,
  xe as UIStateManager,
  Oe as addStateSourceIndicator,
  Ae as announceError,
  Ee as announceLoading,
  Re as announceNavigation,
  qe as announceSuccess,
  K as announceToScreenReader,
  T as bindNoResultsResetAction,
  ce as buildSearchParams,
  k as canConnect,
  A as canEdit,
  yt as canReconsent,
  rt as canRevoke,
  At as canViewActivity,
  F as canViewServices,
  it as clearRetryUI,
  pe as combineGuards,
  Xe as configureDeepLinks,
  Q as confirmServiceAction,
  ke as createActionLabelResolver,
  Ct as createActivityNavigateHandler,
  Ge as createActivityPage,
  Je as createConnectionDetail,
  Ve as createConnectionsList,
  Ot as createFocusTrap,
  We as createInstallationsList,
  ts as createNavigationContext,
  q as createPermissionGuard,
  ze as createProvidersCatalog,
  ae as createServicesClient,
  je as createSkipLink,
  Qe as createSubscriptionsSyncPage,
  oe as debounce,
  es as deepLinkManager,
  Y as destroyAbortableQueryPage,
  P as formatDateTime,
  U as formatProviderId,
  m as formatRelativeTime,
  H as formatServiceLabel,
  tt as gateElement,
  kt as generateDeepLink,
  ss as generateListLink,
  we as getActionEntry,
  jt as getActionLabel,
  Dt as getActionsByCategory,
  $e as getAllActionLabels,
  Ue as getAnimationDuration,
  C as getPermissionManager,
  Mt as getServiceConfirmConfig,
  E as getServicesClient,
  ge as handleForbidden,
  Se as initActivityLabels,
  is as initCommandRuntime,
  be as initPermissionGates,
  de as initPermissions,
  ye as initPermissionsFromContext,
  Ce as isActivityLabelsInitialized,
  Rt as isForbiddenError,
  nt as loadAndPopulateProviders,
  Pt as loadPermissionsFromContext,
  wt as loadProviders,
  Lt as mapObjectTypeToEntity,
  rs as navigateBack,
  ns as navigateToEntity,
  as as parseCurrentDeepLink,
  os as parseDeepLink,
  le as parseSearchParams,
  Wt as populateProviderFilterOptions,
  zt as prefersReducedMotion,
  xt as renderEmptyState,
  V as renderErrorState,
  L as renderForbiddenState,
  z as renderLoadingState,
  vt as renderNoResultsState,
  Ft as renderRetryUI,
  D as renderStateSourceIndicator,
  Be as renderStateSourceLegend,
  me as renderTableEmptyState,
  G as renderTableErrorState,
  W as renderTableLoadingState,
  R as renderTableNoResultsState,
  ue as requireAll,
  he as requireAny,
  Le as resetActivityLabels,
  w as resolveProviderDisplayName,
  _e as setActionLabels,
  Pe as setExpandedState,
  Ie as setLoadingState,
  Ne as setProgress,
  ne as setServicesClient,
  Me as setSortableHeader,
  Fe as setStatusLabel,
  De as setupDialogFocus,
  Ut as setupKeyboardNavigation,
  Te as setupRovingTabindex,
  v as truncateId,
  ve as withConfirmation,
  S as withMutationFeedback,
  fe as withPermission
};
//# sourceMappingURL=index.js.map

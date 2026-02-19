import { r as u } from "../chunks/icon-renderer-CRbgoQtj.js";
import { C as at } from "../chunks/modal-DXPBR0f5.js";
class R extends Error {
  constructor(t, e, s, i) {
    super(t), this.name = "ServicesAPIError", this.code = e, this.statusCode = s, this.details = i;
  }
  static fromResponse(t, e) {
    const s = e.message || e.error || "Unknown error", i = e.text_code || "UNKNOWN_ERROR";
    return new R(s, i, t, e.details);
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
const $ = {
  VIEW: "admin.services.view",
  CONNECT: "admin.services.connect",
  EDIT: "admin.services.edit",
  REVOKE: "admin.services.revoke",
  RECONSENT: "admin.services.reconsent",
  ACTIVITY_VIEW: "admin.services.activity.view",
  WEBHOOKS: "admin.services.webhooks"
}, bt = {
  basePath: "/admin/api/services",
  timeout: 3e4,
  headers: {}
};
class ot {
  constructor(t = {}) {
    this.abortControllers = /* @__PURE__ */ new Map(), this.config = {
      ...bt,
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
      `/sync/connections/${encodeURIComponent(t)}/run`,
      e,
      s
    );
  }
  /**
   * Get sync status summary for a connection
   */
  async getSyncStatus(t, e) {
    return this.get(
      `/sync/connections/${encodeURIComponent(t)}/status`,
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
      const o = await this.fetchWithTimeout(i, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.config.headers
        },
        signal: r.signal
      }, t);
      return this.handleResponse(o);
    } finally {
      s && s.removeEventListener("abort", a), this.abortControllers.delete(t);
    }
  }
  async post(t, e, s, i) {
    const r = this.buildUrl(t), a = new AbortController();
    this.abortControllers.set(t, a);
    const o = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
      ...i
    }, c = s && s.trim() || this.createIdempotencyKey(t);
    o["Idempotency-Key"] = c;
    try {
      const l = await this.fetchWithTimeout(r, {
        method: "POST",
        headers: o,
        body: JSON.stringify(e),
        signal: a.signal
      }, t);
      return this.handleResponse(l);
    } finally {
      this.abortControllers.delete(t);
    }
  }
  buildUrl(t, e = {}) {
    const s = this.config.basePath.replace(/\/$/, ""), i = new URL(`${s}${t}`, window.location.origin);
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
      const s = R.fromResponse(t.status, e);
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
let F = null;
function T() {
  return F || (F = new ot()), F;
}
function Yt(n) {
  F = n;
}
function Zt(n = {}) {
  return new ot(n);
}
const yt = {
  defaultPage: 1,
  defaultPerPage: 25,
  searchDelay: 300,
  useReplaceState: !1
};
class N {
  constructor(t = {}) {
    this.searchTimeout = null, this.initialized = !1, this.config = {
      ...yt,
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
    this.searchTimeout && clearTimeout(this.searchTimeout), this.searchTimeout = setTimeout(() => {
      this.state.search !== t && (this.state.search = t, this.state.page = 1, this.syncToURL(), this.notifyChange());
    }, this.config.searchDelay);
  }
  /**
   * Set search term immediately (no debouncing)
   */
  setSearchImmediate(t) {
    this.searchTimeout && clearTimeout(this.searchTimeout), this.state.search !== t && (this.state.search = t, this.state.page = 1, this.syncToURL(), this.notifyChange());
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
    const t = new URLSearchParams(window.location.search), e = t.get("page");
    if (e) {
      const o = parseInt(e, 10);
      !Number.isNaN(o) && o > 0 && (this.state.page = o);
    }
    const s = t.get("per_page");
    if (s) {
      const o = parseInt(s, 10);
      !Number.isNaN(o) && o > 0 && (this.state.per_page = o);
    }
    const i = t.get("q") || t.get("search");
    i && (this.state.search = i);
    const r = t.get("sort_field"), a = t.get("sort_order");
    r && (this.state.sort_field = r, this.state.sort_order = a === "desc" ? "desc" : "asc");
    for (const o of this.filterFields) {
      const c = t.get(String(o));
      c !== null && (this.dateFields.has(o) ? this.state.filters[o] = this.toLocalInput(c) : this.state.filters[o] = c);
    }
  }
  restoreFromStorage() {
    if (this.storageKey)
      try {
        const t = localStorage.getItem(this.storageKey);
        if (t) {
          const e = JSON.parse(t);
          typeof e.per_page == "number" && e.per_page > 0 && (new URLSearchParams(window.location.search).has("per_page") || (this.state.per_page = e.per_page));
        }
      } catch (t) {
        console.warn("[QueryStateManager] Failed to restore from localStorage:", t);
      }
  }
  saveToStorage() {
    if (this.storageKey)
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify({ per_page: this.state.per_page })
        );
      } catch (t) {
        console.warn("[QueryStateManager] Failed to save to localStorage:", t);
      }
  }
  syncToURL() {
    const t = new URLSearchParams();
    this.state.page > 1 && t.set("page", String(this.state.page)), this.state.per_page !== this.config.defaultPerPage && t.set("per_page", String(this.state.per_page)), this.state.search && t.set("q", this.state.search), this.state.sort_field && (t.set("sort_field", this.state.sort_field), this.state.sort_order && t.set("sort_order", this.state.sort_order));
    for (const [s, i] of Object.entries(this.state.filters))
      if (i != null && i !== "")
        if (this.dateFields.has(s)) {
          const r = this.toRFC3339(i);
          r && t.set(s, r);
        } else
          t.set(s, i);
    const e = t.toString() ? `${window.location.pathname}?${t.toString()}` : window.location.pathname;
    this.config.useReplaceState ? window.history.replaceState({}, "", e) : window.history.pushState({}, "", e);
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
function Xt(n, t) {
  let e = null;
  return { call: (...r) => {
    e && clearTimeout(e), e = setTimeout(() => {
      n(...r), e = null;
    }, t);
  }, cancel: () => {
    e && (clearTimeout(e), e = null);
  } };
}
function te(n, t) {
  const e = new URLSearchParams(), { includePage: s = !0, includeDefaults: i = !1 } = t || {};
  s && (n.page > 1 || i) && e.set("page", String(n.page)), (n.per_page !== 25 || i) && e.set("per_page", String(n.per_page)), n.search && e.set("q", n.search), n.sort_field && (e.set("sort_field", n.sort_field), n.sort_order && e.set("sort_order", n.sort_order));
  for (const [r, a] of Object.entries(n.filters))
    a != null && a !== "" && e.set(r, a);
  return e;
}
function ee(n, t, e) {
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
  const o = n.get("sort_field");
  o && (s.sort_field = o, s.sort_order = n.get("sort_order") === "desc" ? "desc" : "asc");
  for (const c of t) {
    const l = n.get(String(c));
    l !== null && (s.filters[c] = l);
  }
  return s;
}
class mt {
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
   * Check if user has all specified permissions
   */
  hasAll(t) {
    return t.every((e) => this.state.granted.has(e));
  }
  /**
   * Check if user has any of the specified permissions
   */
  hasAny(t) {
    return t.some((e) => this.state.granted.has(e));
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
let J = null;
function C() {
  return J || (J = new mt()), J;
}
function se(n) {
  C().init(n);
}
function E(n, t) {
  const e = t || C();
  return () => e.has(n);
}
function ie(n, t) {
  const e = t || C();
  return () => e.hasAll(n);
}
function re(n, t) {
  const e = t || C();
  return () => e.hasAny(n);
}
function ne(...n) {
  return (t) => n.every((e) => e(t));
}
function A(n) {
  return E($.VIEW, n);
}
function L(n) {
  return E($.CONNECT, n);
}
function P(n) {
  return E($.EDIT, n);
}
function Y(n) {
  return E($.REVOKE, n);
}
function ct(n) {
  return E($.RECONSENT, n);
}
function vt(n) {
  return E($.ACTIVITY_VIEW, n);
}
function xt(n) {
  return n instanceof R && n.isForbidden;
}
function ae(n, t) {
  return xt(n) ? (t(n), !0) : !1;
}
function oe(n, t, e, s) {
  const i = s || C();
  return async () => {
    if (!i.has(n)) {
      e?.();
      return;
    }
    return t();
  };
}
function G(n, t, e) {
  const s = e || C(), { requires: i = [], requiresAny: r = [], onDenied: a, disableOnDenied: o } = t;
  let c = !0, l = [];
  i.length > 0 ? (l = s.getMissing(i), c = l.length === 0) : r.length > 0 && (c = s.hasAny(r), c || (l = r)), c || (o ? ((n instanceof HTMLButtonElement || n instanceof HTMLInputElement) && (n.disabled = !0), n.classList.add("permission-denied", "opacity-50", "cursor-not-allowed"), n.setAttribute("title", `Permission required: ${l.join(", ")}`)) : (n.style.display = "none", n.classList.add("permission-hidden")), t.deniedContent && (typeof t.deniedContent == "string" ? n.outerHTML = t.deniedContent : n.replaceWith(t.deniedContent)), a?.(l));
}
function ce(n = document.body, t) {
  n.querySelectorAll("[data-permission-requires]").forEach((r) => {
    const a = r.dataset.permissionRequires?.split(",").map((o) => o.trim());
    a && a.length > 0 && G(r, { requires: a }, t);
  }), n.querySelectorAll("[data-permission-requires-any]").forEach((r) => {
    const a = r.dataset.permissionRequiresAny?.split(",").map((o) => o.trim());
    a && a.length > 0 && G(r, { requiresAny: a }, t);
  }), n.querySelectorAll("[data-permission-disable]").forEach((r) => {
    const a = r.dataset.permissionDisable?.split(",").map((o) => o.trim());
    a && a.length > 0 && G(r, { requires: a, disableOnDenied: !0 }, t);
  });
}
function St() {
  const n = window.__permissions;
  if (Array.isArray(n))
    return n.filter(
      (e) => Object.values($).includes(e)
    );
  const t = document.body.dataset.permissions;
  if (t)
    try {
      const e = JSON.parse(t);
      if (Array.isArray(e))
        return e.filter(
          (s) => Object.values($).includes(s)
        );
    } catch {
    }
  return [];
}
function le() {
  const n = St(), t = C();
  return t.init(n), t;
}
const lt = {
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
function j(n = {}) {
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
        <span class="${r.text}">${b(t)}</span>
      </div>
    </div>
  `;
}
function dt(n = {}) {
  const t = lt[n.type || "generic"], {
    icon: e = t.icon,
    iconClass: s = "text-gray-400",
    title: i = t.title,
    message: r = t.message,
    containerClass: a = "",
    action: o
  } = n;
  return `
    <div class="ui-state ui-state-empty flex items-center justify-center py-12 ${a}" role="status" aria-label="Empty">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${u(e, { size: "24px", extraClass: s })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${b(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${b(r)}</p>
        </div>
        ${o ? ht(o) : ""}
      </div>
    </div>
  `;
}
function ut(n = {}) {
  const {
    icon: t = "iconoir:search",
    iconClass: e = "text-gray-400",
    title: s = "No results found",
    query: i,
    filterCount: r = 0,
    containerClass: a = "",
    onReset: o
  } = n;
  let c = n.message;
  return c || (i && r > 0 ? c = `No items match "${i}" with ${r} filter${r > 1 ? "s" : ""} applied.` : i ? c = `No items match "${i}".` : r > 0 ? c = `No items match the ${r} filter${r > 1 ? "s" : ""} applied.` : c = "Try adjusting your search or filters."), `
    <div class="ui-state ui-state-no-results flex items-center justify-center py-12 ${a}" role="status" aria-label="No results">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${u(t, { size: "24px", extraClass: e })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${b(s)}</h3>
          <p class="text-sm text-gray-500 mt-1">${b(c)}</p>
        </div>
        ${o ? `
          <button type="button" class="ui-state-reset-btn px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
            Clear filters
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function D(n = {}) {
  const {
    icon: t = "iconoir:warning-triangle",
    iconClass: e = "text-red-500",
    title: s = "Something went wrong",
    error: i,
    compact: r = !1,
    containerClass: a = "",
    showRetry: o = !0,
    retryText: c = "Try again"
  } = n, l = n.message || i?.message || "An unexpected error occurred. Please try again.";
  return r ? `
      <div class="ui-state ui-state-error ui-state-error-compact p-4 ${a}" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-red-500" aria-hidden="true">
            ${u(t, { size: "20px", extraClass: e })}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800">${b(s)}</p>
            <p class="text-sm text-red-700 mt-1">${b(l)}</p>
          </div>
          ${o ? `
            <button type="button" class="ui-state-retry-btn flex-shrink-0 text-sm text-red-600 hover:text-red-700 font-medium">
              ${b(c)}
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
          <h3 class="text-lg font-medium text-gray-900">${b(s)}</h3>
          <p class="text-sm text-gray-500 mt-1">${b(l)}</p>
        </div>
        ${o ? `
          <button type="button" class="ui-state-retry-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            ${b(c)}
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function _(n = {}) {
  const {
    icon: t = "iconoir:lock",
    iconClass: e = "text-amber-500",
    title: s = "Access Denied",
    resource: i,
    permission: r,
    containerClass: a = "",
    action: o
  } = n;
  let c = n.message;
  return c || (i && r ? c = `You need the "${r}" permission to view ${i}.` : i ? c = `You don't have permission to view ${i}.` : c = "You don't have permission to access this resource."), `
    <div class="ui-state ui-state-forbidden flex items-center justify-center py-16 ${a}" role="alert" aria-label="Access denied">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
          ${u(t, { size: "24px", extraClass: e })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${b(s)}</h3>
          <p class="text-sm text-gray-500 mt-1">${b(c)}</p>
        </div>
        ${o ? ht(o) : ""}
      </div>
    </div>
  `;
}
function U(n, t = {}) {
  const { text: e = "Loading...", containerClass: s = "" } = t;
  return `
    <tr class="ui-state ui-state-table-loading ${s}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-500" aria-busy="true">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">${b(e)}</span>
        </div>
      </td>
    </tr>
  `;
}
function O(n, t = {}) {
  const {
    icon: e = "iconoir:warning-triangle",
    iconClass: s = "text-red-500",
    title: i = "Failed to load data",
    error: r,
    containerClass: a = "",
    showRetry: o = !0,
    retryText: c = "Try again"
  } = t, l = t.message || r?.message || "An error occurred while loading.";
  return `
    <tr class="ui-state ui-state-table-error ${a}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="text-red-500 mb-2" aria-hidden="true">
          ${u(e, { size: "24px", extraClass: s })}
        </div>
        <p class="text-sm font-medium text-gray-900">${b(i)}</p>
        <p class="text-sm text-gray-500 mt-1">${b(l)}</p>
        ${o ? `
          <button type="button" class="ui-state-retry-btn mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            ${b(c)}
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
function de(n, t = {}) {
  const e = lt[t.type || "generic"], {
    icon: s = e.icon,
    iconClass: i = "text-gray-400",
    title: r = e.title,
    message: a = e.message,
    containerClass: o = ""
  } = t;
  return `
    <tr class="ui-state ui-state-table-empty ${o}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${u(s, { size: "24px", extraClass: i })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${b(r)}</h3>
        <p class="text-sm text-gray-500 mt-1">${b(a)}</p>
      </td>
    </tr>
  `;
}
function q(n, t = {}) {
  const {
    icon: e = "iconoir:search",
    iconClass: s = "text-gray-400",
    title: i = "No results found",
    query: r,
    filterCount: a = 0,
    containerClass: o = "",
    onReset: c
  } = t;
  let l = t.message;
  return l || (r && a > 0 ? l = `No items match "${r}" with ${a} filter${a > 1 ? "s" : ""} applied.` : r ? l = `No items match "${r}".` : a > 0 ? l = `No items match the ${a} filter${a > 1 ? "s" : ""} applied.` : l = "Try adjusting your search or filters."), `
    <tr class="ui-state ui-state-table-no-results ${o}">
      <td colspan="${n}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${u(e, { size: "24px", extraClass: s })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${b(i)}</h3>
        <p class="text-sm text-gray-500 mt-1">${b(l)}</p>
        ${c ? `
          <button type="button" class="ui-state-reset-btn mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
class ue {
  constructor(t) {
    this.currentState = "loading", this.container = t.container, this.config = t;
  }
  /**
   * Show loading state
   */
  showLoading(t) {
    this.currentState = "loading", this.container.innerHTML = j(t);
  }
  /**
   * Show empty state (no data)
   */
  showEmpty(t) {
    this.currentState = "empty", this.container.innerHTML = dt(t);
  }
  /**
   * Show no-results state (filters returned nothing)
   */
  showNoResults(t) {
    this.currentState = "no-results";
    const e = { ...t, onReset: t?.onReset || this.config.onReset };
    this.container.innerHTML = ut(e), this.bindResetHandler();
  }
  /**
   * Show error state
   */
  showError(t) {
    this.currentState = "error";
    const e = { ...t, onRetry: t?.onRetry || this.config.onRetry };
    this.container.innerHTML = D(e), this.bindRetryHandler();
  }
  /**
   * Show forbidden state
   */
  showForbidden(t) {
    this.currentState = "forbidden", this.container.innerHTML = _(t);
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
function ht(n) {
  return `
    <button type="button" class="ui-state-action-btn px-4 py-2 text-sm font-medium rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${{
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  }[n.variant || "primary"]}">
      ${b(n.text)}
    </button>
  `;
}
function b(n) {
  const t = document.createElement("div");
  return t.textContent = n, t.innerHTML;
}
class wt {
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
    this.button.innerHTML = `${t}<span>${k(this.config.loadingText)}</span>`;
  }
  /** Set button to success state (briefly shows success, then returns to idle) */
  setSuccess() {
    this.clearFeedbackTimeout(), this.state = "success", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-error"), this.button.classList.add("mutation-success"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${k(this.config.successText)}</span>
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
      <span>${k(this.config.errorText)}</span>
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
async function x(n) {
  const {
    mutation: t,
    notifier: e,
    successMessage: s,
    errorMessagePrefix: i = "Operation failed",
    buttonConfig: r,
    onSuccess: a,
    onError: o,
    showInlineRetry: c = !1,
    retryContainer: l
  } = n, h = r ? new wt(r) : null;
  try {
    h?.setLoading();
    const d = await t();
    if (h?.setSuccess(), e && s) {
      const p = typeof s == "function" ? s(d) : s;
      e.success(p);
    }
    return l && K(l), await a?.(d), { success: !0, result: d };
  } catch (d) {
    const p = d instanceof Error ? d : new Error(String(d));
    return h?.setError(), e && e.error(`${i}: ${p.message}`), c && l && $t({
      container: l,
      action: () => x(n).then(() => {
      }),
      errorMessage: `${i}: ${p.message}`,
      onDismiss: () => K(l)
    }), o?.(p), { success: !1, error: p };
  }
}
async function he(n) {
  const { confirmMessage: t, confirmOptions: e, ...s } = n;
  return await at.confirm(t, {
    title: e?.title ?? "Confirm Action",
    confirmText: e?.confirmText ?? "Confirm",
    cancelText: e?.cancelText ?? "Cancel",
    confirmVariant: e?.variant ?? "primary"
  }) ? { ...await x(s), cancelled: !1 } : { success: !1, cancelled: !0 };
}
function $t(n) {
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
        <p class="text-sm text-red-700">${k(s)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button"
                  class="mutation-retry-btn px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors">
            ${k(i)}
          </button>
          <button type="button"
                  class="mutation-dismiss-btn px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
            ${k(r)}
          </button>
        </div>
      </div>
    </div>
  `;
  const o = t.querySelector(".mutation-retry-btn"), c = t.querySelector(".mutation-dismiss-btn");
  o?.addEventListener("click", async () => {
    const l = o, h = l.textContent;
    l.disabled = !0, l.innerHTML = `
      <svg class="animate-spin h-3 w-3 inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Retrying...
    `;
    try {
      await e();
    } finally {
      l.disabled = !1, l.textContent = h;
    }
  }), c?.addEventListener("click", () => {
    K(t), a?.();
  });
}
function K(n) {
  n.querySelector(".mutation-retry-ui")?.remove();
}
function Ct(n) {
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
  }, o = r[t] || { verb: t, noun: t, variant: "primary" }, c = a[e] || e;
  let l = `Are you sure you want to ${o.verb} this ${c}`;
  return s && (l += ` (${s})`), l += "?", i && (l += ` ${i}`), o.variant === "danger" && (l += " This action cannot be undone."), {
    message: l,
    options: {
      title: `${o.noun} ${c.charAt(0).toUpperCase() + c.slice(1)}`,
      confirmText: o.noun,
      cancelText: "Cancel",
      variant: o.variant
    }
  };
}
async function B(n) {
  const { message: t, options: e } = Ct(n);
  return at.confirm(t, e);
}
class z {
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
function k(n) {
  const t = document.createElement("div");
  return t.textContent = n, t.innerHTML;
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
class _t {
  constructor() {
    this.backendLabels = {}, this.initialized = !1, this.fallbackFormatter = Z;
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
    this.backendLabels = {}, this.fallbackFormatter = Z, this.initialized = !1;
  }
}
const S = new _t();
function pe(n = {}) {
  S.init(n);
}
function Lt(n) {
  return S.getLabel(n);
}
function ge(n) {
  return S.getEntry(n);
}
function fe() {
  return S.getAllLabels();
}
function kt() {
  return S.getActionsByCategory();
}
function be(n) {
  S.setLabels(n);
}
function ye() {
  return S.isInitialized();
}
function me() {
  S.reset();
}
function ve(n = {}) {
  return (t) => n[t] ? n[t] : S.getLabel(t);
}
function Z(n) {
  return n.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
const Tt = "/admin/services", Et = {
  connection: "connections",
  installation: "installations",
  subscription: "subscriptions",
  sync: "sync",
  provider: "providers",
  activity: "activity"
};
class Pt {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || Tt, this.pathMap = { ...Et, ...t.pathMap };
  }
  /**
   * Configure the manager.
   */
  configure(t) {
    t.basePath && (this.basePath = t.basePath), t.pathMap && (this.pathMap = { ...this.pathMap, ...t.pathMap });
  }
  /**
   * Generate a deep link URL for an entity.
   */
  generateLink(t, e, s) {
    const i = this.pathMap[t] || t;
    let r = `${this.basePath}/${i}/${encodeURIComponent(e)}`;
    if (s) {
      const a = this.encodeContext(s);
      a && (r += `?ctx=${a}`);
    }
    return r;
  }
  /**
   * Generate a link to an entity list page with optional filters.
   */
  generateListLink(t, e) {
    const s = this.pathMap[t] || t;
    let i = `${this.basePath}/${s}`;
    if (e && Object.keys(e).length > 0) {
      const r = new URLSearchParams();
      for (const [a, o] of Object.entries(e))
        o && r.set(a, o);
      i += `?${r.toString()}`;
    }
    return i;
  }
  /**
   * Navigate to an entity, preserving context for back navigation.
   */
  navigateTo(t, e, s, i = {}) {
    s && this.saveContext(s);
    const r = this.generateLink(t, e, s);
    i.replace ? window.history.replaceState({ entityType: t, entityId: e, context: s }, "", r) : window.history.pushState({ entityType: t, entityId: e, context: s }, "", r), window.dispatchEvent(
      new CustomEvent("services:navigate", {
        detail: { entityType: t, entityId: e, context: s, url: r }
      })
    );
  }
  /**
   * Navigate back with context restoration.
   */
  navigateBack() {
    const t = this.restoreContext();
    if (t?.fromPage) {
      const e = new URLSearchParams();
      if (t.filters)
        for (const [r, a] of Object.entries(t.filters))
          a && e.set(r, a);
      t.search && e.set("q", t.search), t.page && t.page > 1 && e.set("page", String(t.page)), t.viewMode && e.set("view", t.viewMode);
      const s = e.toString(), i = s ? `${t.fromPage}?${s}` : t.fromPage;
      return window.history.pushState({ restored: !0 }, "", i), window.dispatchEvent(
        new CustomEvent("services:navigate-back", {
          detail: { context: t, url: i }
        })
      ), t;
    }
    return window.history.back(), null;
  }
  /**
   * Parse entity info from current URL.
   */
  parseCurrentUrl() {
    return this.parseUrl(window.location.pathname + window.location.search);
  }
  /**
   * Parse entity info from a URL.
   */
  parseUrl(t) {
    const [e, s] = t.split("?"), r = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (r.length < 2)
      return null;
    const a = r[0], o = decodeURIComponent(r[1]);
    let c = null;
    for (const [h, d] of Object.entries(this.pathMap))
      if (d === a) {
        c = h;
        break;
      }
    if (!c)
      return null;
    let l;
    if (s) {
      const d = new URLSearchParams(s).get("ctx");
      d && (l = this.decodeContext(d));
    }
    return { entityType: c, entityId: o, context: l };
  }
  /**
   * Map object_type values from activity entries to entity types.
   */
  mapObjectTypeToEntity(t) {
    return {
      connection: "connection",
      connections: "connection",
      installation: "installation",
      installations: "installation",
      subscription: "subscription",
      subscriptions: "subscription",
      sync: "sync",
      sync_job: "sync",
      sync_jobs: "sync",
      provider: "provider",
      providers: "provider"
    }[t.toLowerCase()] || null;
  }
  /**
   * Create navigation context from current query state.
   */
  createContextFromQueryState(t, e) {
    const s = {};
    for (const [i, r] of Object.entries(t.filters))
      r && (s[i] = r);
    return {
      fromPage: window.location.pathname,
      filters: Object.keys(s).length > 0 ? s : void 0,
      search: t.search || void 0,
      page: t.page > 1 ? t.page : void 0,
      viewMode: e
    };
  }
  // ---------------------------------------------------------------------------
  // Context Storage
  // ---------------------------------------------------------------------------
  saveContext(t) {
    try {
      sessionStorage.setItem(this.contextStorageKey, JSON.stringify(t));
    } catch {
    }
  }
  restoreContext() {
    try {
      const t = sessionStorage.getItem(this.contextStorageKey);
      if (t)
        return sessionStorage.removeItem(this.contextStorageKey), JSON.parse(t);
    } catch {
    }
    return null;
  }
  encodeContext(t) {
    try {
      return btoa(JSON.stringify(t));
    } catch {
      return "";
    }
  }
  decodeContext(t) {
    try {
      return JSON.parse(atob(t));
    } catch {
      return;
    }
  }
}
const w = new Pt();
function xe(n) {
  w.configure(n);
}
function qt(n, t, e) {
  return w.generateLink(n, t, e);
}
function Se(n, t) {
  return w.generateListLink(n, t);
}
function Rt(n, t, e, s) {
  w.navigateTo(n, t, e, s);
}
function we() {
  return w.navigateBack();
}
function $e() {
  return w.parseCurrentUrl();
}
function Ce(n) {
  return w.parseUrl(n);
}
function pt(n) {
  return w.mapObjectTypeToEntity(n);
}
function At(n, t) {
  return w.createContextFromQueryState(n, t);
}
function Mt(n, t) {
  return (e, s) => {
    const i = pt(e);
    if (!i) {
      console.warn(`[DeepLinks] Unknown object type: ${e}`);
      return;
    }
    const r = At(
      n(),
      t?.()
    );
    Rt(i, s, r);
  };
}
function It(n) {
  const {
    container: t,
    selector: e,
    onSelect: s,
    onFocus: i,
    onEscape: r,
    wrap: a = !0,
    autoFocus: o = !1,
    keyHandlers: c = {}
  } = n;
  function l() {
    return Array.from(t.querySelectorAll(e));
  }
  function h(g) {
    const y = l();
    if (y.length === 0) return;
    let f = g;
    a ? f = (g % y.length + y.length) % y.length : f = Math.max(0, Math.min(g, y.length - 1)), y.forEach((gt, ft) => {
      gt.setAttribute("tabindex", ft === f ? "0" : "-1");
    });
    const v = y[f];
    v.focus(), i?.(v, f);
  }
  function d(g) {
    const y = l();
    if (y.length === 0) return;
    const f = g.target, v = y.indexOf(f);
    if (v !== -1) {
      if (c[g.key]) {
        c[g.key](g, f, v);
        return;
      }
      switch (g.key) {
        case "ArrowDown":
        case "ArrowRight":
          g.preventDefault(), h(v + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          g.preventDefault(), h(v - 1);
          break;
        case "Home":
          g.preventDefault(), h(0);
          break;
        case "End":
          g.preventDefault(), h(y.length - 1);
          break;
        case "Enter":
        case " ":
          g.preventDefault(), s?.(f, v);
          break;
        case "Escape":
          g.preventDefault(), r?.();
          break;
      }
    }
  }
  const p = l();
  return p.forEach((g, y) => {
    g.setAttribute("tabindex", y === 0 ? "0" : "-1"), g.hasAttribute("role") || g.setAttribute("role", "option");
  }), t.hasAttribute("role") || t.setAttribute("role", "listbox"), t.addEventListener("keydown", d), o && p.length > 0 && h(0), () => {
    t.removeEventListener("keydown", d);
  };
}
function _e(n, t) {
  return It({
    container: n,
    selector: t,
    wrap: !0,
    onSelect: (e) => {
      e.click();
    }
  });
}
const Ft = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function Ht(n) {
  const { container: t, initialFocus: e, returnFocus: s, onEscape: i } = n, r = document.activeElement;
  function a() {
    return Array.from(t.querySelectorAll(Ft));
  }
  function o(c) {
    if (c.key === "Escape") {
      c.preventDefault(), i?.();
      return;
    }
    if (c.key !== "Tab") return;
    const l = a();
    if (l.length === 0) return;
    const h = l[0], d = l[l.length - 1];
    c.shiftKey ? document.activeElement === h && (c.preventDefault(), d.focus()) : document.activeElement === d && (c.preventDefault(), h.focus());
  }
  return requestAnimationFrame(() => {
    e ? (typeof e == "string" ? t.querySelector(e) : e)?.focus() : a()[0]?.focus();
  }), t.addEventListener("keydown", o), t.hasAttribute("role") || t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), () => {
    t.removeEventListener("keydown", o), t.removeAttribute("aria-modal"), (s || r)?.focus?.();
  };
}
function Nt(n) {
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
function V(n, t = {}) {
  const { priority: e = "polite", clear: s = !0 } = t, i = Nt(e);
  s && (i.textContent = ""), setTimeout(() => {
    i.textContent = n;
  }, 100);
}
function Le(n) {
  V(`Loading ${n}...`, { priority: "polite" });
}
function ke(n) {
  V(n, { priority: "polite" });
}
function Te(n) {
  V(`Error: ${n}`, { priority: "assertive" });
}
function Ee(n) {
  V(`Navigating to ${n}`, { priority: "polite" });
}
function Pe(n, t, e) {
  n.setAttribute("aria-expanded", String(e));
  const s = typeof t == "string" ? t : t.id;
  s && n.setAttribute("aria-controls", s);
}
function qe(n, t) {
  n.setAttribute("aria-busy", String(t)), t ? n.setAttribute("aria-describedby", "loading-indicator") : n.removeAttribute("aria-describedby");
}
function Re(n, t, e) {
  n.setAttribute("role", "status"), n.setAttribute("aria-label", `Status: ${e}`);
}
function Ae(n, t) {
  n.setAttribute("aria-sort", t), n.setAttribute("role", "columnheader");
}
function Me(n, t, e = 100, s) {
  n.setAttribute("role", "progressbar"), n.setAttribute("aria-valuenow", String(t)), n.setAttribute("aria-valuemin", "0"), n.setAttribute("aria-valuemax", String(e)), s && n.setAttribute("aria-label", s);
}
function Ie(n, t = "Skip to main content") {
  const e = document.createElement("a");
  return e.href = `#${n}`, e.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg", e.textContent = t, e;
}
function Fe(n, t = {}) {
  const { title: e, describedBy: s, onClose: i } = t;
  if (n.setAttribute("role", "dialog"), n.setAttribute("aria-modal", "true"), e) {
    const a = `dialog-title-${Date.now()}`, o = n.querySelector('h1, h2, h3, [role="heading"]');
    o && (o.id = a, n.setAttribute("aria-labelledby", a));
  }
  s && n.setAttribute("aria-describedby", s);
  const r = Ht({
    container: n,
    onEscape: i
  });
  return () => {
    r(), n.removeAttribute("aria-modal"), n.removeAttribute("aria-labelledby"), n.removeAttribute("aria-describedby");
  };
}
function jt() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function He(n) {
  return jt() ? 0 : n;
}
const X = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  degraded: { label: "Degraded", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:warning-triangle" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  disabled: { label: "Disabled", bg: "bg-gray-100", text: "text-gray-500", icon: "iconoir:cancel" }
}, Dt = {
  healthy: { label: "Healthy", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  warning: { label: "Warnings", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:warning-triangle" },
  error: { label: "Errors", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" }
};
class Ne {
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
              Runtime v${m(this.state.runtimeVersion)} &middot;
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
          ${Object.entries(s).map(([a, o]) => {
      const c = X[a];
      return o > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${c.bg} ${c.text}">
                ${o} ${c.label.toLowerCase()}
              </span>
            ` : "";
    }).join("")}
        </div>
      </div>
    `;
  }
  renderConfigHealthCard() {
    if (!this.state) return "";
    const t = this.state.configHealth, e = Dt[t.status];
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
    const e = X[t.status];
    return `
      <div class="pack-row px-4 py-3 hover:bg-gray-50 cursor-pointer" data-pack-id="${m(t.id)}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${m(t.name)}</span>
              <span class="text-xs text-gray-400">v${m(t.version)}</span>
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
              <span class="text-xs text-red-600 truncate max-w-48" title="${m(t.lastError)}">
                ${m(t.lastError.slice(0, 50))}${t.lastError.length > 50 ? "..." : ""}
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
              <span class="text-sm font-medium text-gray-900">${m(t.name)}</span>
              <span class="text-xs text-gray-400">from ${m(t.sourcePack)}</span>
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
      <div class="error-row px-4 py-3 hover:bg-red-50 cursor-pointer" data-error-id="${m(t.id)}">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            ${u("iconoir:warning-circle", { size: "16px", extraClass: "text-red-500" })}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-red-800">${m(t.type)}</span>
              <span class="text-xs text-gray-400">from ${m(t.packId)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-0.5">${m(t.message)}</p>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>${this.formatTime(t.occurredAt)}</span>
              ${t.relatedEntity ? `
                <span>${m(t.relatedEntity.type)}:${m(t.relatedEntity.id)}</span>
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
        <p class="text-sm text-gray-500">${m(t)}</p>
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
function H(n) {
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
            title="${m(a.description)}${i ? ` - ${i}` : ""}"
            aria-label="${m(a.description)}">
        ${u(a.icon, { size: "14px", extraClass: a.text })}
      </span>
    ` : `
    <span class="state-source-indicator inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${a.bg} ${a.text}"
          title="${m(a.description)}${i ? ` - ${i}` : ""}"
          role="note"
          aria-label="State source: ${m(a.description)}">
      ${u(a.icon, { size: "12px" })}
      <span>${m(a.label)}</span>
    </span>
  `;
}
function je(n, t) {
  const e = document.createElement("span");
  e.innerHTML = H(t), n.appendChild(e.firstElementChild);
}
function De() {
  return `
    <div class="state-source-legend p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">State Source Legend</h4>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          ${H({ source: "go-services" })}
          <span class="text-sm text-gray-600">Data managed by go-services core runtime</span>
        </div>
        <div class="flex items-center gap-3">
          ${H({ source: "downstream", packName: "Extension" })}
          <span class="text-sm text-gray-600">Data managed by an installed extension package</span>
        </div>
        <div class="flex items-center gap-3">
          ${H({ source: "mixed" })}
          <span class="text-sm text-gray-600">Combination of core and extension-managed data</span>
        </div>
      </div>
    </div>
  `;
}
function m(n) {
  const t = document.createElement("div");
  return t.textContent = n, t.innerHTML;
}
const tt = {
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
}, Ut = {
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
class Ot {
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
    if (!A()()) {
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
    if (this.container) {
      this.loading = !0, this.error = null, this.renderLoading();
      try {
        const e = await T().listProviders();
        this.providers = e.providers || [], this.renderProviders();
      } catch (t) {
        this.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load providers: ${this.error.message}`);
      } finally {
        this.loading = !1;
      }
    }
  }
  renderLoading() {
    this.container && (this.container.innerHTML = j({
      text: "Loading providers...",
      size: "lg"
    }));
  }
  renderError() {
    if (!this.container) return;
    this.container.innerHTML = D({
      title: "Failed to load providers",
      error: this.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadProviders());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = _({
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
    this.container && (this.container.innerHTML = dt({
      type: "providers"
    }));
  }
  buildProviderCard(t) {
    const e = this.getProviderCardData(t), s = L()() && t.supported_scope_types.includes("user"), i = L()() && t.supported_scope_types.includes("org"), r = this.buildCapabilitySummary(t.capabilities), a = this.buildScopeBadges(t.supported_scope_types);
    return `
      <div class="provider-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
           data-provider-id="${this.escapeHtml(t.id)}">
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                ${u(e.icon, { size: "20px", extraClass: "text-gray-600" })}
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">${this.escapeHtml(e.displayName)}</h3>
                <span class="text-xs text-gray-500">${this.escapeHtml(t.auth_kind)}</span>
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
                      data-provider-id="${this.escapeHtml(t.id)}"
                      data-scope-type="user">
                Connect as User
              </button>
            ` : ""}
            ${i ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      data-provider-id="${this.escapeHtml(t.id)}"
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
      const [o, c] = a.name.split(".");
      r += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              title="${this.escapeHtml(a.name)}">
          ${this.escapeHtml(c || a.name)}
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
    const e = this.config.getProviderName ? this.config.getProviderName(t.id) : Ut[t.id.toLowerCase()] || this.formatProviderId(t.id), s = this.config.getProviderIcon ? this.config.getProviderIcon(t.id) : tt[t.id.toLowerCase()] || tt.default;
    return {
      provider: t,
      displayName: e,
      icon: s,
      description: `${t.auth_kind} authentication`,
      capabilityCount: t.capabilities.length,
      canConnect: L()()
    };
  }
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
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
          const o = this.getProvider(r);
          o && this.config.onConnect && this.config.onConnect(o, a);
        }
      });
    });
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
async function Ue(n) {
  const t = new Ot(n);
  return await t.init(), t;
}
const et = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  disconnected: { label: "Disconnected", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:cancel" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  pending_reauth: { label: "Pending Reauth", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:clock" },
  needs_reconsent: { label: "Needs Reconsent", bg: "bg-orange-100", text: "text-orange-700", icon: "iconoir:refresh" }
};
class Bt {
  constructor(t) {
    this.container = null, this.state = {
      connections: [],
      providers: [],
      total: 0,
      loading: !1,
      error: null
    }, this.abortController = null, this.actionQueue = new z(), this.config = {
      perPage: 25,
      syncUrl: !0,
      ...t
    }, this.client = t.apiClient || T(), this.queryState = new N({
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
    if (!A()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), await this.loadProviders(), this.bindEvents(), await this.loadConnections();
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
    this.abortController?.abort(), this.queryState.destroy();
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
          ${L()() && this.config.onConnect ? `
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
        const l = c.dataset.filter;
        this.queryState.setFilter(l, c.value || void 0);
      });
    }), this.container.querySelector(".connections-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const i = this.container.querySelector(".connections-connect-user"), r = this.container.querySelector(".connections-connect-org");
    i?.addEventListener("click", () => this.handleConnect("user")), r?.addEventListener("click", () => this.handleConnect("org"));
    const a = this.container.querySelector(".connections-prev"), o = this.container.querySelector(".connections-next");
    a?.addEventListener("click", () => this.queryState.prevPage()), o?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderConnections() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-empty"), s = this.container?.querySelector(".connections-table-wrapper");
    if (t) {
      if (this.state.connections.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = q(6, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
          onReset: () => {
            this.queryState.reset(), this.restoreFilterValues();
          }
        }), this.bindNoResultsActions(t)) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.connections.map((i) => this.renderConnectionRow(i)).join(""), this.bindRowActions();
    }
  }
  async loadProviders() {
    try {
      const t = await this.client.listProviders();
      this.state.providers = t.providers || [], this.populateProviderFilterOptions();
    } catch (t) {
      this.state.providers = [], this.config.notifier?.error(`Failed to load providers: ${t.message}`);
    }
  }
  populateProviderFilterOptions() {
    const t = this.container?.querySelector('[data-filter="provider_id"]');
    if (!t) return;
    const e = this.queryState.getState().filters.provider_id || "", s = this.state.providers.map((i) => {
      const r = this.config.getProviderName ? this.config.getProviderName(i.id) : this.formatProviderId(i.id);
      return `<option value="${this.escapeHtml(i.id)}">${this.escapeHtml(r)}</option>`;
    }).join("");
    t.innerHTML = `<option value="">All Providers</option>${s}`, t.value = e;
  }
  handleConnect(t) {
    if (!this.config.onConnect || !L()()) return;
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
      this.config.notifier?.error(`${this.formatProviderId(i.id)} does not support ${t} scope.`);
      return;
    }
    this.config.onConnect(i.id, t);
  }
  bindNoResultsActions(t) {
    t.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
  }
  renderConnectionRow(t) {
    const e = et[t.status] || et.disconnected, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.formatDate(t.updated_at), r = this.buildRowActions(t);
    return `
      <tr class="connection-row hover:bg-gray-50 cursor-pointer" data-connection-id="${this.escapeHtml(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${this.escapeHtml(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${this.escapeHtml(t.scope_id)}">
            ${this.escapeHtml(this.truncateId(t.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-gray-600" title="${this.escapeHtml(t.external_account_id)}">
            ${this.escapeHtml(this.truncateId(t.external_account_id, 20))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
          ${t.last_error ? `
            <div class="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title="${this.escapeHtml(t.last_error)}">
              ${this.escapeHtml(t.last_error)}
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
    return t.status === "active" && P()() && e.push(`
        <button type="button"
                class="connection-action-refresh p-1 text-gray-400 hover:text-blue-600"
                data-action="refresh"
                title="Refresh credentials">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status === "needs_reconsent" && ct()() && e.push(`
        <button type="button"
                class="connection-action-reconsent p-1 text-gray-400 hover:text-orange-600"
                data-action="reconsent"
                title="Re-consent">
          ${u("iconoir:redo", { size: "16px" })}
        </button>
      `), t.status !== "disconnected" && Y()() && e.push(`
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
      await x({
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
      await x({
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
    const s = this.getConnection(t), i = s ? this.config.getProviderName ? this.config.getProviderName(s.provider_id) : this.formatProviderId(s.provider_id) : void 0;
    await B({
      action: "revoke",
      resourceType: "connection",
      resourceName: i
    }) && (this.actionQueue.isInFlight(`revoke-${t}`) || await this.actionQueue.execute(`revoke-${t}`, async () => {
      await x({
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
    e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = O(6, {
      title: "Failed to load connections",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnections());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = _({
      resource: "connections"
    }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), s = this.container?.querySelector(".connections-empty");
    this.state.loading && t && this.state.connections.length === 0 && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = U(6, { text: "Loading connections..." }));
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, { total: i } = this.state, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), o = a < i, c = e > 1, l = this.container?.querySelector(".connections-info"), h = this.container?.querySelector(".connections-prev"), d = this.container?.querySelector(".connections-next");
    l && (l.textContent = i > 0 ? `Showing ${r}-${a} of ${i}` : "No connections"), h && (h.disabled = !c), d && (d.disabled = !o);
  }
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatDate(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const i = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), r = Math.floor(i / 6e4), a = Math.floor(i / 36e5), o = Math.floor(i / 864e5);
    return r < 1 ? "Just now" : r < 60 ? `${r}m ago` : a < 24 ? `${a}h ago` : o < 7 ? `${o}d ago` : e.toLocaleDateString();
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
async function Oe(n) {
  const t = new Bt(n);
  return await t.init(), t;
}
const st = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  suspended: { label: "Suspended", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:pause" },
  uninstalled: { label: "Uninstalled", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:cancel" },
  needs_reconsent: { label: "Needs Reconsent", bg: "bg-orange-100", text: "text-orange-700", icon: "iconoir:refresh" }
}, it = {
  user: { label: "User", bg: "bg-blue-50", text: "text-blue-600" },
  workspace: { label: "Workspace", bg: "bg-indigo-50", text: "text-indigo-600" },
  org: { label: "Organization", bg: "bg-purple-50", text: "text-purple-600" },
  marketplace_app: { label: "Marketplace", bg: "bg-pink-50", text: "text-pink-600" },
  standard: { label: "Standard", bg: "bg-gray-50", text: "text-gray-600" }
};
class zt {
  constructor(t) {
    this.container = null, this.state = {
      installations: [],
      providers: [],
      total: 0,
      loading: !1,
      error: null
    }, this.abortController = null, this.actionQueue = new z(), this.config = {
      perPage: 25,
      syncUrl: !0,
      ...t
    }, this.client = t.apiClient || T(), this.queryState = new N({
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
    if (!A()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), await this.loadProviders(), this.bindEvents(), await this.loadInstallations();
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
    this.abortController?.abort(), this.queryState.destroy();
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
        const o = a.dataset.filter;
        this.queryState.setFilter(o, a.value || void 0);
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
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = q(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), this.bindNoResultsActions(t)) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.installations.map((i) => this.renderInstallationRow(i)).join(""), this.bindRowActions();
    }
  }
  bindNoResultsActions(t) {
    t.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
  }
  renderInstallationRow(t) {
    const e = st[t.status] || st.uninstalled, s = it[t.install_type] || it.standard, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), r = t.granted_at ? this.formatDate(t.granted_at) : "—", a = t.revoked_at ? this.formatDate(t.revoked_at) : "—", o = this.buildRowActions(t);
    return `
      <tr class="installation-row hover:bg-gray-50 cursor-pointer" data-installation-id="${this.escapeHtml(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}">
            ${s.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${this.escapeHtml(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${this.escapeHtml(t.scope_id)}">
            ${this.escapeHtml(this.truncateId(t.scope_id))}
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
          ${o}
        </td>
      </tr>
    `;
  }
  buildRowActions(t) {
    const e = [];
    return t.status === "active" && Y()() && e.push(`
        <button type="button"
                class="installation-action-uninstall p-1 text-gray-400 hover:text-red-600"
                data-action="uninstall"
                title="Uninstall">
          ${u("iconoir:trash", { size: "16px" })}
        </button>
      `), t.status === "uninstalled" && L()() && e.push(`
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
    const s = this.getInstallation(t), i = s ? this.config.getProviderName ? this.config.getProviderName(s.provider_id) : this.formatProviderId(s.provider_id) : void 0;
    await B({
      action: "uninstall",
      resourceType: "installation",
      resourceName: i
    }) && (this.actionQueue.isInFlight(`uninstall-${t}`) || await this.actionQueue.execute(`uninstall-${t}`, async () => {
      await x({
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
    e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = O(7, {
      title: "Failed to load installations",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadInstallations());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = _({
      resource: "installations"
    }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), s = this.container?.querySelector(".installations-empty");
    this.state.loading && t && this.state.installations.length === 0 && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = U(7, { text: "Loading installations..." }));
  }
  async loadProviders() {
    try {
      const t = await this.client.listProviders();
      this.state.providers = t.providers || [], this.populateProviderFilterOptions();
    } catch (t) {
      this.state.providers = [], this.config.notifier?.error(`Failed to load providers: ${t.message}`);
    }
  }
  populateProviderFilterOptions() {
    const t = this.container?.querySelector('[data-filter="provider_id"]');
    if (!t) return;
    const e = this.queryState.getState().filters.provider_id || "", s = this.state.providers.map((i) => {
      const r = this.config.getProviderName ? this.config.getProviderName(i.id) : this.formatProviderId(i.id);
      return `<option value="${this.escapeHtml(i.id)}">${this.escapeHtml(r)}</option>`;
    }).join("");
    t.innerHTML = `<option value="">All Providers</option>${s}`, t.value = e;
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, { total: i } = this.state, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), o = a < i, c = e > 1, l = this.container?.querySelector(".installations-info"), h = this.container?.querySelector(".installations-prev"), d = this.container?.querySelector(".installations-next");
    l && (l.textContent = i > 0 ? `Showing ${r}-${a} of ${i}` : "No installations"), h && (h.disabled = !c), d && (d.disabled = !o);
  }
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatDate(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const i = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), r = Math.floor(i / 6e4), a = Math.floor(i / 36e5), o = Math.floor(i / 864e5);
    return r < 1 ? "Just now" : r < 60 ? `${r}m ago` : a < 24 ? `${a}h ago` : o < 7 ? `${o}d ago` : e.toLocaleDateString();
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
async function Be(n) {
  const t = new zt(n);
  return await t.init(), t;
}
const I = {
  success: { label: "Success", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  failure: { label: "Failed", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:clock" }
};
class Vt {
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
    }, this.state.viewMode = this.config.viewMode || "timeline", this.client = t.apiClient || T(), this.queryState = new N({
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
    if (!vt()()) {
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
    this.abortController?.abort(), this.queryState.destroy();
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
    return !this.config.providers || this.config.providers.length === 0 ? "" : this.config.providers.map((t) => `<option value="${this.escapeHtml(t.id)}">${this.escapeHtml(t.name)}</option>`).join("");
  }
  renderChannelOptions() {
    return (this.config.channels || ["connections", "credentials", "grants", "webhooks", "sync", "lifecycle"]).map((e) => `<option value="${this.escapeHtml(e)}">${this.escapeHtml(this.formatLabel(e))}</option>`).join("");
  }
  renderActionOptions() {
    if (this.config.actions && this.config.actions.length > 0)
      return this.config.actions.map((i) => {
        const r = this.resolveActionLabel(i);
        return `<option value="${this.escapeHtml(i)}">${this.escapeHtml(r)}</option>`;
      }).join("");
    const t = kt(), e = {
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
      const a = e[i] || this.formatLabel(i), o = r.map((c) => {
        const l = this.resolveActionLabel(c.action);
        return `<option value="${this.escapeHtml(c.action)}">${this.escapeHtml(l)}</option>`;
      }).join("");
      s.push(`<optgroup label="${this.escapeHtml(a)}">${o}</optgroup>`);
    }
    return s.join("");
  }
  /**
   * Resolve action label using config override or centralized registry.
   */
  resolveActionLabel(t) {
    return this.config.getActionLabel ? this.config.getActionLabel(t) : Lt(t);
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
    t?.addEventListener("click", () => this.setViewMode("timeline")), e?.addEventListener("click", () => this.setViewMode("table")), this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (d) => {
      this.queryState.setSearch(d.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((d) => {
      d.addEventListener("change", () => {
        const p = d.dataset.filter;
        this.queryState.setFilter(p, d.value || void 0);
      });
    }), this.container.querySelectorAll('input[data-filter]:not([type="text"])').forEach((d) => {
      d.addEventListener("change", () => {
        const p = d.dataset.filter;
        this.queryState.setFilter(p, d.value || void 0);
      });
    });
    const a = this.container.querySelector('[data-filter="object_type"]'), o = this.container.querySelector('[data-filter="object_id"]');
    a?.addEventListener("change", () => {
      this.queryState.setFilter("object_type", a.value || void 0);
    }), o?.addEventListener("change", () => {
      this.queryState.setFilter("object_id", o.value || void 0);
    }), this.container.querySelector(".activity-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const l = this.container.querySelector(".activity-prev"), h = this.container.querySelector(".activity-next");
    l?.addEventListener("click", () => this.queryState.prevPage()), h?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderEntries() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-empty"), i = this.container?.querySelector(".activity-timeline-container"), r = this.container?.querySelector(".activity-table-container");
    if (this.state.entries.length === 0) {
      this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = ut({
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount(),
        containerClass: "bg-white rounded-lg border border-gray-200"
      }), this.bindNoResultsActions(t))) : (r?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = q(7, {
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount()
      }), this.bindNoResultsActions(e)))) : (i?.classList.add("hidden"), r?.classList.add("hidden"), s?.classList.remove("hidden")), this.updateFilterSummary();
      return;
    }
    s?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = this.state.entries.map((a) => this.renderTimelineEntry(a)).join(""), this.bindEntryActions())) : (r?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = this.state.entries.map((a) => this.renderTableRow(a)).join(""), this.bindEntryActions())), this.updateFilterSummary();
  }
  bindNoResultsActions(t) {
    t.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
  }
  renderTimelineEntry(t) {
    const e = I[t.status] || I.pending, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.resolveActionLabel(t.action), r = this.formatTime(t.created_at), a = this.formatRelativeTime(t.created_at);
    return `
      <div class="activity-entry flex gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
           data-entry-id="${this.escapeHtml(t.id)}">
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
                ${this.escapeHtml(i)}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-500">${this.escapeHtml(s)}</span>
                ${t.channel ? `
                  <span class="text-gray-300">&middot;</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(t.channel)}</span>
                ` : ""}
                ${t.object_type && t.object_id ? `
                  <span class="text-gray-300">&middot;</span>
                  <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
                     class="activity-object-link text-xs text-blue-600 hover:text-blue-700"
                     data-object-type="${this.escapeHtml(t.object_type)}"
                     data-object-id="${this.escapeHtml(t.object_id)}">
                    ${this.escapeHtml(t.object_type)}:${this.escapeHtml(this.truncateId(t.object_id))}
                  </a>
                ` : ""}
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-500" title="${this.escapeHtml(r)}">${a}</p>
              <div class="flex items-center gap-1 mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
                  ${this.escapeHtml(t.scope_type)}
                </span>
              </div>
            </div>
          </div>

          <!-- Metadata preview -->
          ${Object.keys(t.metadata || {}).length > 0 ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <div class="text-xs text-gray-500 font-mono truncate">
                ${this.escapeHtml(this.formatMetadataPreview(t.metadata))}
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
    const e = I[t.status] || I.pending, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.resolveActionLabel(t.action), r = this.formatTime(t.created_at), a = this.formatRelativeTime(t.created_at);
    return `
      <tr class="activity-row hover:bg-gray-50 cursor-pointer" data-entry-id="${this.escapeHtml(t.id)}">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="text-sm text-gray-900" title="${this.escapeHtml(r)}">${a}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm font-medium text-gray-900">${this.escapeHtml(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-700">${this.escapeHtml(i)}</span>
        </td>
        <td class="px-4 py-3">
          ${t.object_type && t.object_id ? `
            <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
               class="activity-object-link text-sm text-blue-600 hover:text-blue-700"
               data-object-type="${this.escapeHtml(t.object_type)}"
               data-object-id="${this.escapeHtml(t.object_id)}">
              ${this.escapeHtml(t.object_type)}:${this.escapeHtml(this.truncateId(t.object_id))}
            </a>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${this.escapeHtml(t.scope_type)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-500">${this.escapeHtml(t.channel || "—")}</span>
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
    return Mt(
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
    const s = pt(t);
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
    return qt(s, e, r);
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
    this.container?.querySelector(".activity-empty")?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), i?.classList.add("hidden"), t && (t.innerHTML = D({
      title: "Failed to load activity",
      error: this.state.error,
      containerClass: "bg-white rounded-lg border border-gray-200",
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity()))) : (i?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = O(7, {
      title: "Failed to load activity",
      error: this.state.error,
      showRetry: !0
    }), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity())));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = _({
      resource: "activity"
    }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-timeline-container"), i = this.container?.querySelector(".activity-table-container"), r = this.container?.querySelector(".activity-empty");
    this.state.loading && (this.state.entries.length > 0 || (r?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), i?.classList.add("hidden"), t && (t.innerHTML = j({ text: "Loading activity..." }))) : (i?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = U(7, { text: "Loading activity..." })))));
  }
  updatePagination() {
    const t = this.queryState.getState(), { page: e, per_page: s } = t, { total: i } = this.state, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), o = a < i, c = e > 1, l = this.container?.querySelector(".activity-info"), h = this.container?.querySelector(".activity-prev"), d = this.container?.querySelector(".activity-next");
    l && (l.textContent = i > 0 ? `Showing ${r}-${a} of ${i}` : "No activity"), h && (h.disabled = !c), d && (d.disabled = !o);
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
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  formatLabel(t) {
    return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatTime(t) {
    const e = new Date(t);
    return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
  }
  formatRelativeTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const i = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), r = Math.floor(i / 6e4), a = Math.floor(i / 36e5), o = Math.floor(i / 864e5);
    return r < 1 ? "Just now" : r < 60 ? `${r}m ago` : a < 24 ? `${a}h ago` : o < 7 ? `${o}d ago` : e.toLocaleDateString();
  }
  formatMetadataPreview(t) {
    return Object.entries(t).slice(0, 3).map(([s, i]) => `${s}: ${JSON.stringify(i)}`).join(", ");
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
async function ze(n) {
  const t = new Vt(n);
  return await t.init(), t;
}
const W = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  expired: { label: "Expired", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:clock" },
  cancelled: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500", icon: "iconoir:cancel" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" }
}, Q = {
  queued: { label: "Queued", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:clock" },
  running: { label: "Running", bg: "bg-blue-100", text: "text-blue-700", icon: "iconoir:play" },
  succeeded: { label: "Succeeded", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  failed: { label: "Failed", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" }
}, rt = {
  bootstrap: { label: "Bootstrap", description: "Full initial sync" },
  incremental: { label: "Incremental", description: "Delta changes only" },
  backfill: { label: "Backfill", description: "Historical data recovery" }
};
class Jt {
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
    }, this.abortController = null, this.actionQueue = new z(), this.config = {
      perPage: 25,
      syncUrl: !0,
      activeTab: "subscriptions",
      ...t
    }, this.state.activeTab = this.config.activeTab || "subscriptions", this.client = t.apiClient || T(), this.queryState = new N({
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
    if (!A()()) {
      this.renderForbidden();
      return;
    }
    this.restoreTab(), this.queryState.init(), this.renderStructure(), await this.loadProviders(), this.bindEvents(), await this.loadData();
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
    this.abortController?.abort(), this.queryState.destroy();
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
    const e = t.provider_id, s = t.connection_id, i = t.status, r = String(t.q || "").trim().toLowerCase(), a = t.page || 1, o = t.per_page || this.config.perPage || 25, c = await this.loadSyncConnections({
      providerId: e,
      connectionId: s,
      signal: this.abortController?.signal
    }), d = (await Promise.all(
      c.map(async (f) => {
        try {
          const v = await this.client.getSyncStatus(f.id, this.abortController?.signal);
          return { connection: f, summary: v.sync_summary };
        } catch (v) {
          if (v.name === "AbortError")
            throw v;
          return null;
        }
      })
    )).filter((f) => f !== null).map((f) => this.toSyncJob(f.connection, f.summary)).filter((f) => f !== null).filter((f) => i && f.status !== i ? !1 : r ? this.matchesSyncSearch(f, r) : !0), p = d.length, g = (a - 1) * o, y = d.slice(g, g + o);
    this.state.syncJobs = y, this.state.syncJobsTotal = p, this.renderSyncJobs(), this.updatePagination();
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
    return Object.entries(W).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  renderSyncStatusOptions() {
    return Object.entries(Q).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  async loadProviders() {
    try {
      const t = await this.client.listProviders();
      this.state.providers = t.providers || [], this.populateProviderFilterOptions();
    } catch (t) {
      this.state.providers = [], this.config.notifier?.error(`Failed to load providers: ${t.message}`);
    }
  }
  populateProviderFilterOptions() {
    const t = this.container?.querySelector('[data-filter="provider_id"]');
    if (!t) return;
    const e = this.queryState.getState().filters.provider_id || "", s = this.state.providers.map((i) => {
      const r = this.config.getProviderName ? this.config.getProviderName(i.id) : this.formatProviderId(i.id);
      return `<option value="${this.escapeHtml(i.id)}">${this.escapeHtml(r)}</option>`;
    }).join("");
    t.innerHTML = `<option value="">All Providers</option>${s}`, t.value = e;
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
        const l = c.dataset.filter;
        this.queryState.setFilter(l, c.value || void 0);
      });
    }), this.container.querySelector(".reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const a = this.container.querySelector(".prev-btn"), o = this.container.querySelector(".next-btn");
    a?.addEventListener("click", () => this.queryState.prevPage()), o?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderSubscriptions() {
    const t = this.container?.querySelector(".subscriptions-tbody"), e = this.container?.querySelector(".empty-state"), s = this.container?.querySelector(".subscriptions-content");
    if (t) {
      if (this.state.subscriptions.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = q(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), this.bindNoResultsActions(t)) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("subscriptions"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.subscriptions.map((i) => this.renderSubscriptionRow(i)).join(""), this.bindSubscriptionActions();
    }
  }
  bindNoResultsActions(t) {
    t.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
  }
  renderSubscriptionRow(t) {
    const e = W[t.status] || W.errored, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = t.expires_at ? this.formatRelativeTime(t.expires_at) : "—", r = t.expires_at ? this.formatTime(t.expires_at) : "", a = this.formatRelativeTime(t.updated_at), o = t.expires_at && this.isExpiringSoon(t.expires_at);
    return `
      <tr class="subscription-row hover:bg-gray-50 cursor-pointer" data-subscription-id="${this.escapeHtml(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(s)}</span>
        </td>
        <td class="px-4 py-3">
          <div class="text-sm text-gray-700">${this.escapeHtml(t.resource_type)}</div>
          <div class="text-xs text-gray-500" title="${this.escapeHtml(t.resource_id)}">
            ${this.escapeHtml(this.truncateId(t.resource_id))}
          </div>
        </td>
        <td class="px-4 py-3">
          <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">${this.escapeHtml(this.truncateId(t.channel_id, 16))}</code>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="${o ? "text-amber-600 font-medium" : "text-gray-500"}" title="${r}">
            ${i}
          </span>
          ${o ? u("iconoir:warning-triangle", { size: "12px", extraClass: "inline ml-1 text-amber-500" }) : ""}
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
    return t.status === "active" && P()() && e.push(`
        <button type="button"
                class="action-renew p-1 text-gray-400 hover:text-blue-600"
                data-action="renew"
                title="Renew subscription">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status !== "cancelled" && P()() && e.push(`
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
        this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = q(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), this.bindNoResultsActions(t)) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("sync"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.syncJobs.map((i) => this.renderSyncJobRow(i)).join(""), this.bindSyncJobActions();
    }
  }
  renderSyncJobRow(t) {
    const e = Q[t.status] || Q.failed, s = rt[t.mode] || rt.incremental, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), r = t.metadata, a = typeof r.last_synced_at == "string" ? r.last_synced_at : "", o = a ? this.formatRelativeTime(a) : this.formatRelativeTime(t.updated_at), c = typeof r.last_sync_error == "string" ? r.last_sync_error : "", l = t.checkpoint || "";
    return `
      <tr class="sync-row hover:bg-gray-50 cursor-pointer" data-job-id="${this.escapeHtml(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(i)}</span>
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
          ${l ? `
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded" title="${this.escapeHtml(l)}">
              ${this.escapeHtml(this.truncateId(l, 16))}
            </code>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-gray-500 text-sm">
          ${o}
        </td>
        <td class="px-4 py-3 text-xs">
          ${c ? `<span class="text-red-600" title="${this.escapeHtml(c)}">${this.escapeHtml(this.truncateId(c, 48))}</span>` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSyncJobActions(t)}
        </td>
      </tr>
    `;
  }
  buildSyncJobActions(t) {
    const e = [];
    return t.status !== "running" && P()() && e.push(`
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
      await x({
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
    await B({
      action: "cancel",
      resourceType: "subscription"
    }) && (this.actionQueue.isInFlight(`cancel-${t}`) || await this.actionQueue.execute(`cancel-${t}`, async () => {
      await x({
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
    const s = this.state.syncJobs.find((o) => o.id === t);
    if (!s) return;
    const i = s.metadata, r = typeof i.run_resource_type == "string" && i.run_resource_type ? i.run_resource_type : "default", a = typeof i.run_resource_id == "string" && i.run_resource_id ? i.run_resource_id : "default";
    this.actionQueue.isInFlight(`sync-${t}`) || await this.actionQueue.execute(`sync-${t}`, async () => {
      await x({
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
    i.innerHTML = O(r, {
      title: `Failed to load ${this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs"}`,
      error: this.state.error,
      showRetry: !0
    }), e?.classList.remove("hidden"), s?.classList.add("hidden"), i.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadData());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = _({
      resource: "subscriptions and sync"
    }));
  }
  updateLoadingState() {
    const t = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-content") : this.container?.querySelector(".sync-content"), e = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody"), s = this.container?.querySelector(".empty-state");
    if (!this.state.loading || !e) return;
    if ((this.state.activeTab === "subscriptions" ? this.state.subscriptions : this.state.syncJobs).length === 0) {
      const a = this.state.activeTab === "subscriptions" ? "Loading subscriptions..." : "Loading sync jobs...";
      t?.classList.remove("hidden"), s?.classList.add("hidden"), e.innerHTML = U(7, { text: a });
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
        if (a instanceof R && a.isNotFound)
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
    const t = this.queryState.getState(), { page: e, per_page: s } = t, i = this.state.activeTab === "subscriptions" ? this.state.subscriptionsTotal : this.state.syncJobsTotal, r = i > 0 ? (e - 1) * s + 1 : 0, a = Math.min(e * s, i), o = a < i, c = e > 1, l = this.container?.querySelector(".info"), h = this.container?.querySelector(".prev-btn"), d = this.container?.querySelector(".next-btn"), p = this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs";
    l && (l.textContent = i > 0 ? `Showing ${r}-${a} of ${i} ${p}` : `No ${p}`), h && (h.disabled = !c), d && (d.disabled = !o);
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
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatTime(t) {
    const e = new Date(t);
    return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
  }
  formatRelativeTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime(), r = i > 0, a = Math.abs(i), o = Math.floor(a / 6e4), c = Math.floor(a / 36e5), l = Math.floor(a / 864e5);
    return o < 1 ? r ? "Soon" : "Just now" : o < 60 ? r ? `in ${o}m` : `${o}m ago` : c < 24 ? r ? `in ${c}h` : `${c}h ago` : l < 7 ? r ? `in ${l}d` : `${l}d ago` : e.toLocaleDateString();
  }
  isExpiringSoon(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return !1;
    const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime();
    return i > 0 && i < 864e5;
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
async function Ve(n) {
  const t = new Jt(n);
  return await t.init(), t;
}
const nt = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check-circle" },
  disconnected: { label: "Disconnected", bg: "bg-gray-100", text: "text-gray-600", icon: "iconoir:cancel" },
  errored: { label: "Error", bg: "bg-red-100", text: "text-red-700", icon: "iconoir:warning-circle" },
  pending_reauth: { label: "Pending Reauth", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:clock" },
  needs_reconsent: { label: "Needs Reconsent", bg: "bg-orange-100", text: "text-orange-700", icon: "iconoir:refresh" }
}, Gt = {
  granted: { label: "Granted", bg: "bg-green-100", text: "text-green-700", icon: "iconoir:check" },
  requested: { label: "Requested", bg: "bg-blue-100", text: "text-blue-700", icon: "iconoir:clock" },
  missing: { label: "Missing", bg: "bg-gray-100", text: "text-gray-500", icon: "iconoir:minus" },
  capability_required: { label: "Required", bg: "bg-amber-100", text: "text-amber-700", icon: "iconoir:warning-triangle" }
};
class Wt {
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
    }, this.abortController = null, this.actionQueue = new z(), this.config = t, this.client = t.apiClient || T();
  }
  /**
   * Initialize the detail panel
   */
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ConnectionDetail] Container not found:", this.config.container);
      return;
    }
    if (!A()()) {
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
    const t = this.state.connection, e = nt[t.status] || nt.disconnected, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.buildGrantInfoList(), r = i.some((o) => o.status === "capability_required"), a = t.status === "needs_reconsent" || r;
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
              <h2 class="text-xl font-semibold text-gray-900">${this.escapeHtml(s)}</h2>
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
                ${this.escapeHtml(t.scope_type)}
              </span>
              <span class="text-sm text-gray-700" title="${this.escapeHtml(t.scope_id)}">
                ${this.escapeHtml(this.truncateId(t.scope_id, 16))}
              </span>
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">External Account</dt>
            <dd class="mt-1 text-sm text-gray-700" title="${this.escapeHtml(t.external_account_id)}">
              ${this.escapeHtml(this.truncateId(t.external_account_id, 20))}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${this.formatTime(t.created_at)}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${this.formatTime(t.updated_at)}
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
              <p class="text-sm text-red-700 mt-1">${this.escapeHtml(t.last_error)}</p>
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
            ${ct()() ? `
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
                  Version ${this.state.grantSnapshot.version} • Captured ${this.formatRelativeTime(this.state.grantSnapshot.captured_at)}
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
          ${P()() && t.status === "active" ? `
            <button type="button"
                    class="refresh-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              ${u("iconoir:refresh", { size: "16px", extraClass: "mr-1.5" })}
              Refresh Credentials
            </button>
          ` : ""}
          ${Y()() && t.status !== "disconnected" ? `
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
      const s = Gt[e.status], i = e.capabilities.length > 0 ? e.capabilities.map((r) => this.formatLabel(r)).join(", ") : null;
      return `
          <div class="grant-row flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-gray-700">${this.escapeHtml(e.grant)}</code>
                ${e.isCapabilityRequired ? `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600" title="Required by capabilities">
                    ${u("iconoir:puzzle", { size: "10px", extraClass: "mr-0.5" })}
                    Required
                  </span>
                ` : ""}
              </div>
              ${i ? `
                <p class="text-xs text-gray-500 mt-0.5">
                  Used by: ${this.escapeHtml(i)}
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
      const e = new Set(this.state.grantSnapshot.granted_grants), s = t.required_grants.every((d) => e.has(d)), i = t.optional_grants.every((d) => e.has(d)), r = s && i, a = s && !i, o = !s;
      let c, l, h;
      return r ? (c = "Fully Enabled", l = "bg-green-100 text-green-700", h = "iconoir:check-circle") : a ? (c = "Partially Enabled", l = "bg-blue-100 text-blue-700", h = "iconoir:half-moon") : (c = t.denied_behavior === "block" ? "Blocked" : "Degraded", l = t.denied_behavior === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700", h = t.denied_behavior === "block" ? "iconoir:lock" : "iconoir:warning-triangle"), `
          <div class="capability-card border border-gray-200 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">${this.escapeHtml(this.formatLabel(t.name))}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  ${t.required_grants.length} required, ${t.optional_grants.length} optional
                </p>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${l}">
                ${u(h, { size: "12px" })}
                ${c}
              </span>
            </div>
            ${o && t.denied_behavior === "block" ? `
              <p class="text-xs text-red-600 mt-2">
                Missing required: ${t.required_grants.filter((d) => !e.has(d)).join(", ")}
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
      const a = new Date(t.expires_at), o = /* @__PURE__ */ new Date(), c = (a.getTime() - o.getTime()) / (1e3 * 60 * 60);
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
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(t.expires_at)}">
                ${this.formatRelativeTime(t.expires_at)}
              </span>
            </div>
          ` : ""}
          ${t.last_refresh_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Last Refresh</span>
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(t.last_refresh_at)}">
                ${this.formatRelativeTime(t.last_refresh_at)}
              </span>
            </div>
          ` : ""}
          ${t.next_refresh_attempt_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Next Refresh</span>
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(t.next_refresh_attempt_at)}">
                ${this.formatRelativeTime(t.next_refresh_attempt_at)}
              </span>
            </div>
          ` : ""}
          ${t.last_error ? `
            <div class="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div class="flex items-start gap-2">
                ${u("iconoir:warning-circle", { size: "16px", extraClass: "text-red-500 mt-0.5 flex-shrink-0" })}
                <p class="text-sm text-red-700">${this.escapeHtml(t.last_error)}</p>
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
      const o = t.exhausted_buckets / Math.max(t.total_buckets, 1);
      o >= 1 ? (e = "exhausted", s = "All Limits Exhausted", i = "bg-red-100 text-red-700", r = "iconoir:warning-circle") : o >= 0.5 ? (e = "warning", s = "High Usage", i = "bg-amber-100 text-amber-700", r = "iconoir:warning-triangle") : (e = "warning", s = "Some Limits Hit", i = "bg-amber-100 text-amber-700", r = "iconoir:clock");
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
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(t.next_reset_at)}">
                ${this.formatRelativeTime(t.next_reset_at)}
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
  formatRelativeTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime(), r = i > 0, a = Math.abs(i), o = Math.floor(a / 6e4), c = Math.floor(a / 36e5), l = Math.floor(a / 864e5);
    return o < 1 ? r ? "in a moment" : "just now" : o < 60 ? r ? `in ${o}m` : `${o}m ago` : c < 24 ? r ? `in ${c}h` : `${c}h ago` : l < 7 ? r ? `in ${l}d` : `${l}d ago` : e.toLocaleDateString();
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
      await x({
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
    const t = this.config.getProviderName ? this.config.getProviderName(this.state.connection.provider_id) : this.formatProviderId(this.state.connection.provider_id);
    if (!await B({
      action: "revoke",
      resourceType: "connection",
      resourceName: t
    })) return;
    const s = this.container?.querySelector(".revoke-btn");
    this.actionQueue.isInFlight("revoke") || await this.actionQueue.execute("revoke", async () => {
      await x({
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
    this.container && (this.container.innerHTML = j({
      text: "Loading connection details...",
      size: "lg"
    }));
  }
  renderError() {
    if (!this.container) return;
    this.container.innerHTML = D({
      title: "Failed to Load Connection",
      error: this.state.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnection());
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = _({
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
      for (const h of e.capabilities) {
        for (const d of h.required_grants) {
          a.add(d);
          const p = r.get(d) || [];
          p.push(h.name), r.set(d, p);
        }
        for (const d of h.optional_grants) {
          const p = r.get(d) || [];
          p.push(h.name), r.set(d, p);
        }
      }
    const o = /* @__PURE__ */ new Set([
      ...t.requested_grants,
      ...t.granted_grants,
      ...a
    ]), c = [];
    for (const h of o) {
      const d = i.has(h), p = s.has(h), g = a.has(h);
      let y;
      d ? y = "granted" : p ? y = "requested" : g ? y = "capability_required" : y = "missing", c.push({
        grant: h,
        status: y,
        isRequired: p || g,
        isCapabilityRequired: g,
        capabilities: r.get(h) || []
      });
    }
    const l = {
      capability_required: 0,
      granted: 1,
      requested: 2,
      missing: 3
    };
    return c.sort((h, d) => l[h.status] - l[d.status]), c;
  }
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  formatLabel(t) {
    return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatTime(t) {
    const e = new Date(t);
    return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
async function Je(n) {
  const t = new Wt(n);
  return await t.init(), t;
}
export {
  z as ActionQueue,
  Vt as ActivityPageManager,
  Wt as ConnectionDetailManager,
  Bt as ConnectionsListManager,
  M as DEFAULT_ACTION_LABELS,
  Ne as ExtensionDiagnosticsPanel,
  Ft as FOCUSABLE_SELECTOR,
  zt as InstallationsListManager,
  wt as MutationButtonManager,
  Ot as ProvidersCatalogManager,
  N as QueryStateManager,
  ot as ServicesAPIClient,
  R as ServicesAPIError,
  mt as ServicesPermissionManager,
  $ as ServicesPermissions,
  Jt as SubscriptionsSyncPageManager,
  ue as UIStateManager,
  je as addStateSourceIndicator,
  Te as announceError,
  Le as announceLoading,
  Ee as announceNavigation,
  ke as announceSuccess,
  V as announceToScreenReader,
  te as buildSearchParams,
  L as canConnect,
  P as canEdit,
  ct as canReconsent,
  Y as canRevoke,
  vt as canViewActivity,
  A as canViewServices,
  K as clearRetryUI,
  ne as combineGuards,
  xe as configureDeepLinks,
  B as confirmServiceAction,
  ve as createActionLabelResolver,
  Mt as createActivityNavigateHandler,
  ze as createActivityPage,
  Je as createConnectionDetail,
  Oe as createConnectionsList,
  Ht as createFocusTrap,
  Be as createInstallationsList,
  At as createNavigationContext,
  E as createPermissionGuard,
  Ue as createProvidersCatalog,
  Zt as createServicesClient,
  Ie as createSkipLink,
  Ve as createSubscriptionsSyncPage,
  Xt as debounce,
  w as deepLinkManager,
  G as gateElement,
  qt as generateDeepLink,
  Se as generateListLink,
  ge as getActionEntry,
  Lt as getActionLabel,
  kt as getActionsByCategory,
  fe as getAllActionLabels,
  He as getAnimationDuration,
  C as getPermissionManager,
  Ct as getServiceConfirmConfig,
  T as getServicesClient,
  ae as handleForbidden,
  pe as initActivityLabels,
  ce as initPermissionGates,
  se as initPermissions,
  le as initPermissionsFromContext,
  ye as isActivityLabelsInitialized,
  xt as isForbiddenError,
  St as loadPermissionsFromContext,
  pt as mapObjectTypeToEntity,
  we as navigateBack,
  Rt as navigateToEntity,
  $e as parseCurrentDeepLink,
  Ce as parseDeepLink,
  ee as parseSearchParams,
  jt as prefersReducedMotion,
  dt as renderEmptyState,
  D as renderErrorState,
  _ as renderForbiddenState,
  j as renderLoadingState,
  ut as renderNoResultsState,
  $t as renderRetryUI,
  H as renderStateSourceIndicator,
  De as renderStateSourceLegend,
  de as renderTableEmptyState,
  O as renderTableErrorState,
  U as renderTableLoadingState,
  q as renderTableNoResultsState,
  ie as requireAll,
  re as requireAny,
  me as resetActivityLabels,
  be as setActionLabels,
  Pe as setExpandedState,
  qe as setLoadingState,
  Me as setProgress,
  Yt as setServicesClient,
  Ae as setSortableHeader,
  Re as setStatusLabel,
  Fe as setupDialogFocus,
  It as setupKeyboardNavigation,
  _e as setupRovingTabindex,
  he as withConfirmation,
  x as withMutationFeedback,
  oe as withPermission
};
//# sourceMappingURL=index.js.map

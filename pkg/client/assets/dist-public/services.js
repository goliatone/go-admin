import { escapeHTML as a } from "./shared/html.js";
import { httpRequest as Lt } from "./shared/transport/http-client.js";
import { t as mt } from "./chunks/modal-BqeSB3vt.js";
import "./chunks/toast-manager-Bb3XT7VI.js";
import { n as ye, r as kt, t as me } from "./chunks/command-runtime-C_A1iWIS.js";
import { t as u } from "./chunks/icon-renderer-DeU9viK3.js";
import { UIStateManager as Se, renderEmptyState as Tt, renderErrorState as st, renderForbiddenState as q, renderLoadingState as rt, renderNoResultsState as Et, renderPanelLoadingState as we, renderPanelState as $e, renderTableEmptyState as _e, renderTableErrorState as z, renderTableLoadingState as B, renderTableNoResultsState as F } from "./services/ui-states.js";
var nt = class vt extends Error {
  constructor(e, i, s, r) {
    super(e), this.name = "ServicesAPIError", this.code = i, this.statusCode = s, this.details = r;
  }
  static fromResponse(e, i) {
    return new vt(i.message || i.error || "Unknown error", i.text_code || "UNKNOWN_ERROR", e, i.details);
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
}, C = {
  VIEW: "admin.services.view",
  CONNECT: "admin.services.connect",
  EDIT: "admin.services.edit",
  REVOKE: "admin.services.revoke",
  RECONSENT: "admin.services.reconsent",
  ACTIVITY_VIEW: "admin.services.activity.view",
  WEBHOOKS: "admin.services.webhooks"
}, qt = {
  basePath: "/admin/api/services",
  timeout: 3e4,
  headers: {}
};
function Pt() {
  return (typeof globalThis < "u" ? globalThis.location : void 0)?.origin || "http://localhost";
}
var xt = class {
  constructor(t = {}) {
    this.abortControllers = /* @__PURE__ */ new Map(), this.config = {
      ...qt,
      ...t
    };
  }
  async listProviders(t) {
    return this.get("/providers", {}, t);
  }
  async listConnections(t = {}, e) {
    const i = this.buildListParams(t);
    return this.get("/connections", i, e);
  }
  async getConnectionDetail(t, e) {
    return this.get(`/connections/${encodeURIComponent(t)}`, {}, e);
  }
  async beginConnection(t, e = {}, i) {
    return this.post(`/connections/${encodeURIComponent(t)}/begin`, e, i);
  }
  async completeCallback(t, e, i) {
    return this.get(`/connections/${encodeURIComponent(t)}/callback`, e, i);
  }
  async getConnectionGrants(t, e) {
    return this.get(`/connections/${encodeURIComponent(t)}/grants`, {}, e);
  }
  async beginReconsent(t, e = {}, i) {
    return this.post(`/connections/${encodeURIComponent(t)}/reconsent/begin`, e, i);
  }
  async refreshConnection(t, e = {}, i) {
    return this.post(`/connections/${encodeURIComponent(t)}/refresh`, e, i);
  }
  async revokeConnection(t, e = {}, i) {
    return this.post(`/connections/${encodeURIComponent(t)}/revoke`, e, i);
  }
  async listInstallations(t = {}, e) {
    const i = this.buildListParams(t);
    return this.get("/installations", i, e);
  }
  async beginInstallation(t, e = {}, i) {
    return this.post(`/installations/${encodeURIComponent(t)}/begin`, e, i);
  }
  async uninstallInstallation(t, e = {}, i) {
    return this.post(`/installations/${encodeURIComponent(t)}/uninstall`, e, i);
  }
  async listSubscriptions(t = {}, e) {
    const i = this.buildListParams(t);
    return this.get("/subscriptions", i, e);
  }
  async renewSubscription(t, e = {}, i) {
    return this.post(`/subscriptions/${encodeURIComponent(t)}/renew`, e, i);
  }
  async cancelSubscription(t, e = {}, i) {
    return this.post(`/subscriptions/${encodeURIComponent(t)}/cancel`, e, i);
  }
  async runSync(t, e, i) {
    return this.post(`/sync/${encodeURIComponent(t)}/run`, e, i);
  }
  async getSyncStatus(t, e) {
    return this.get(`/sync/${encodeURIComponent(t)}/status`, {}, e);
  }
  async listMappings(t, e) {
    const i = this.buildListParams(t);
    return this.get("/mappings", i, e);
  }
  async getMapping(t, e, i) {
    const s = this.buildListParams(e);
    return this.get(`/mappings/spec/${encodeURIComponent(t)}`, s, i);
  }
  async getMappingVersion(t, e, i, s) {
    const r = this.buildListParams(i);
    return this.get(`/mappings/spec/${encodeURIComponent(t)}/versions/${encodeURIComponent(String(e))}`, r, s);
  }
  async createMappingDraft(t, e) {
    return this.post("/mappings", t, e);
  }
  async updateMappingDraft(t, e, i) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/update`, e, i);
  }
  async markMappingValidated(t, e, i) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/validate`, e, i);
  }
  async publishMapping(t, e, i) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/publish`, e, i);
  }
  async unpublishMapping(t, e, i) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/unpublish`, e, i);
  }
  async validateMapping(t, e) {
    return this.post("/mappings/validate", t, e);
  }
  async previewMapping(t, e) {
    return this.post("/mappings/preview", t, e);
  }
  async planWorkflowSync(t, e) {
    return this.post("/sync/plan", t, e);
  }
  async runWorkflowSync(t, e) {
    return this.post("/sync/run", t, e);
  }
  async listSyncRuns(t, e) {
    const i = this.buildListParams(t);
    return this.get("/sync/runs", i, e);
  }
  async getSyncRun(t, e, i) {
    const s = this.buildListParams(e);
    return this.get(`/sync/runs/${encodeURIComponent(t)}`, s, i);
  }
  async resumeSyncRun(t, e, i) {
    return this.post(`/sync/runs/${encodeURIComponent(t)}/resume`, e, i);
  }
  async getSyncCheckpoint(t, e, i) {
    const s = this.buildListParams(e);
    return this.get(`/sync/checkpoints/${encodeURIComponent(t)}`, s, i);
  }
  async listSyncConflicts(t, e) {
    const i = this.buildListParams(t);
    return this.get("/sync/conflicts", i, e);
  }
  async getSyncConflict(t, e, i) {
    const s = this.buildListParams(e);
    return this.get(`/sync/conflicts/${encodeURIComponent(t)}`, s, i);
  }
  async resolveSyncConflict(t, e, i) {
    return this.post(`/sync/conflicts/${encodeURIComponent(t)}/resolve`, e, i);
  }
  async listSchemaDrift(t, e) {
    const i = this.buildListParams(t);
    return this.get("/sync/schema-drift", i, e);
  }
  async setSchemaDriftBaseline(t, e) {
    return this.post("/sync/schema-drift/baseline", t, e);
  }
  async listConnectionCandidates(t, e) {
    const i = this.buildListParams(t);
    return this.get("/connection-candidates", i, e);
  }
  async getCallbackDiagnosticsStatus(t, e) {
    const i = { provider_id: t?.trim() || void 0 };
    return this.get("/callbacks/diagnostics/status", i, e);
  }
  async previewCallbackDiagnostics(t, e) {
    return this.post("/callbacks/diagnostics/preview", t, e);
  }
  async invokeCapability(t, e, i = {}, s) {
    return this.post(`/capabilities/${encodeURIComponent(t)}/${encodeURIComponent(e)}/invoke`, i, s);
  }
  async listActivity(t = {}, e) {
    const i = this.buildActivityParams(t);
    return this.get("/activity", i, e);
  }
  async getStatus(t) {
    return this.get("/status", {}, t);
  }
  async runRetentionCleanup(t) {
    return this.post("/activity/retention/cleanup", {}, t);
  }
  async processWebhook(t, e, i) {
    return this.post(`/webhooks/${encodeURIComponent(t)}`, e, void 0, i);
  }
  async dispatchInbound(t, e, i, s) {
    return this.post(`/inbound/${encodeURIComponent(t)}/${encodeURIComponent(e)}`, i, void 0, s);
  }
  cancelAll() {
    this.abortControllers.forEach((t) => {
      t.abort();
    }), this.abortControllers.clear();
  }
  cancel(t) {
    const e = this.abortControllers.get(t);
    e && (e.abort(), this.abortControllers.delete(t));
  }
  async get(t, e = {}, i) {
    const s = this.buildUrl(t, e), r = new AbortController(), n = () => r.abort();
    i && (i.aborted ? r.abort() : i.addEventListener("abort", n, { once: !0 })), this.abortControllers.set(t, r);
    try {
      const c = await this.fetchWithTimeout(s, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.config.headers
        },
        signal: r.signal
      }, t);
      return this.handleResponse(c);
    } finally {
      i && i.removeEventListener("abort", n), this.abortControllers.delete(t);
    }
  }
  async post(t, e, i, s) {
    const r = this.buildUrl(t), n = new AbortController();
    this.abortControllers.set(t, n);
    const c = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
      ...s
    };
    c["Idempotency-Key"] = i && i.trim() || this.createIdempotencyKey(t);
    try {
      const o = await this.fetchWithTimeout(r, {
        method: "POST",
        headers: c,
        body: JSON.stringify(e),
        signal: n.signal
      }, t);
      return this.handleResponse(o);
    } finally {
      this.abortControllers.delete(t);
    }
  }
  buildUrl(t, e = {}) {
    const i = this.config.basePath.replace(/\/$/, ""), s = new URL(`${i}${t}`, Pt());
    for (const [r, n] of Object.entries(e)) n != null && n !== "" && s.searchParams.set(r, String(n));
    return s.toString();
  }
  async fetchWithTimeout(t, e, i) {
    const s = setTimeout(() => {
      this.abortControllers.get(i)?.abort();
    }, this.config.timeout);
    try {
      return await Lt(t, e);
    } finally {
      clearTimeout(s);
    }
  }
  createIdempotencyKey(t) {
    const e = t.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "request", i = typeof globalThis < "u" ? globalThis.crypto : void 0;
    return i && typeof i.randomUUID == "function" ? `services_${e}_${i.randomUUID()}` : `services_${e}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  async handleResponse(t) {
    if (!t.ok) {
      let e;
      try {
        e = await t.json();
      } catch {
        e = { error: t.statusText };
      }
      const i = nt.fromResponse(t.status, e);
      throw this.config.onError?.(i), i;
    }
    return t.json();
  }
  buildListParams(t) {
    const e = {};
    for (const [i, s] of Object.entries(t))
      s == null || s === "" || (Array.isArray(s) ? s.length > 0 && (e[i] = s.join(",")) : e[i] = s);
    return e;
  }
  buildActivityParams(t) {
    const e = this.buildListParams(t);
    return t.page !== void 0 && t.per_page !== void 0 ? (e.offset = (t.page - 1) * t.per_page, e.limit = t.per_page, delete e.page, delete e.per_page) : t.per_page !== void 0 && (e.limit = t.per_page, delete e.per_page), e;
  }
}, D = null;
function P() {
  return D || (D = new xt()), D;
}
function Ce(t) {
  D = t;
}
function Le(t = {}) {
  return new xt(t);
}
var At = {
  defaultPage: 1,
  defaultPerPage: 25,
  searchDelay: 300,
  useReplaceState: !1
};
function Y() {
  if (typeof window < "u") return window;
}
function ct() {
  if (!(typeof globalThis > "u"))
    return globalThis.localStorage;
}
var V = class {
  constructor(t = {}) {
    this.searchTimeout = null, this.initialized = !1, this.config = {
      ...At,
      ...t.config
    }, this.filterFields = new Set(t.filterFields || []), this.dateFields = new Set(t.dateFields || []), this.storageKey = t.storageKey || null, this.state = {
      page: this.config.defaultPage,
      per_page: this.config.defaultPerPage,
      search: "",
      filters: {}
    };
  }
  init() {
    return this.initialized ? this.state : (this.restoreFromURL(), this.restoreFromStorage(), this.initialized = !0, this.state);
  }
  getState() {
    return {
      ...this.state,
      filters: { ...this.state.filters }
    };
  }
  getQueryParams() {
    const t = {};
    t.page = this.state.page, t.per_page = this.state.per_page, this.state.search && (t.q = this.state.search), this.state.sort_field && (t.sort_field = this.state.sort_field, this.state.sort_order && (t.sort_order = this.state.sort_order));
    for (const [e, i] of Object.entries(this.state.filters)) if (i != null && i !== "") if (this.dateFields.has(e)) {
      const s = this.toRFC3339(i);
      s && (t[e] = s);
    } else t[e] = i;
    return t;
  }
  setPage(t) {
    const e = Math.max(1, t);
    this.state.page !== e && (this.state.page = e, this.syncToURL(), this.notifyChange());
  }
  setPerPage(t) {
    const e = Math.max(1, t);
    this.state.per_page !== e && (this.state.per_page = e, this.state.page = 1, this.syncToURL(), this.saveToStorage(), this.notifyChange());
  }
  setSearch(t) {
    this.searchTimeout && clearTimeout(this.searchTimeout), this.state.search !== t && (this.state.search = t, this.state.page = 1), this.searchTimeout = setTimeout(() => {
      this.searchTimeout = null, this.syncToURL(), this.notifyChange();
    }, this.config.searchDelay);
  }
  setSearchImmediate(t) {
    this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.state.search !== t && (this.state.search = t, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  setFilter(t, e) {
    this.state.filters[t] !== e && (e == null || e === "" ? delete this.state.filters[t] : this.state.filters[t] = e, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  setFilters(t) {
    let e = !1;
    for (const [i, s] of Object.entries(t)) this.state.filters[i] !== s && (s == null || s === "" ? delete this.state.filters[i] : this.state.filters[i] = s, e = !0);
    e && (this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  setSort(t, e = "asc") {
    (this.state.sort_field !== t || this.state.sort_order !== e) && (this.state.sort_field = t, this.state.sort_order = t ? e : void 0, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  reset() {
    this.state = {
      page: this.config.defaultPage,
      per_page: this.state.per_page,
      search: "",
      filters: {}
    }, this.syncToURL(), this.notifyChange();
  }
  resetFilters() {
    Object.keys(this.state.filters).length > 0 && (this.state.filters = {}, this.state.page = 1, this.syncToURL(), this.notifyChange());
  }
  hasActiveFilters() {
    return Object.values(this.state.filters).some((t) => t != null && t !== "");
  }
  getActiveFilterCount() {
    return Object.values(this.state.filters).filter((t) => t != null && t !== "").length;
  }
  nextPage() {
    this.setPage(this.state.page + 1);
  }
  prevPage() {
    this.setPage(this.state.page - 1);
  }
  updateFromResponse(t, e) {
    const i = Math.ceil(t / this.state.per_page);
    this.state.page > i && i > 0 && this.setPage(i);
  }
  destroy() {
    this.searchTimeout && clearTimeout(this.searchTimeout);
  }
  restoreFromURL() {
    const t = Y();
    if (!t?.location) return;
    const e = new URLSearchParams(t.location.search), i = e.get("page");
    if (i) {
      const o = parseInt(i, 10);
      !Number.isNaN(o) && o > 0 && (this.state.page = o);
    }
    const s = e.get("per_page");
    if (s) {
      const o = parseInt(s, 10);
      !Number.isNaN(o) && o > 0 && (this.state.per_page = o);
    }
    const r = e.get("q") || e.get("search");
    r && (this.state.search = r);
    const n = e.get("sort_field"), c = e.get("sort_order");
    n && (this.state.sort_field = n, this.state.sort_order = c === "desc" ? "desc" : "asc");
    for (const o of this.filterFields) {
      const d = e.get(String(o));
      d !== null && (this.dateFields.has(o) ? this.state.filters[o] = this.toLocalInput(d) : this.state.filters[o] = d);
    }
  }
  restoreFromStorage() {
    if (!this.storageKey) return;
    const t = ct(), e = Y();
    if (t)
      try {
        const i = t.getItem(this.storageKey);
        if (i) {
          const s = JSON.parse(i);
          typeof s.per_page == "number" && s.per_page > 0 && (new URLSearchParams(e?.location?.search || "").has("per_page") || (this.state.per_page = s.per_page));
        }
      } catch (i) {
        console.warn("[QueryStateManager] Failed to restore from localStorage:", i);
      }
  }
  saveToStorage() {
    if (!this.storageKey) return;
    const t = ct();
    if (t)
      try {
        t.setItem(this.storageKey, JSON.stringify({ per_page: this.state.per_page }));
      } catch (e) {
        console.warn("[QueryStateManager] Failed to save to localStorage:", e);
      }
  }
  syncToURL() {
    const t = Y();
    if (!t?.location || !t.history) return;
    const e = new URLSearchParams();
    this.state.page > 1 && e.set("page", String(this.state.page)), this.state.per_page !== this.config.defaultPerPage && e.set("per_page", String(this.state.per_page)), this.state.search && e.set("q", this.state.search), this.state.sort_field && (e.set("sort_field", this.state.sort_field), this.state.sort_order && e.set("sort_order", this.state.sort_order));
    for (const [s, r] of Object.entries(this.state.filters)) if (r != null && r !== "") if (this.dateFields.has(s)) {
      const n = this.toRFC3339(r);
      n && e.set(s, n);
    } else e.set(s, r);
    const i = e.toString() ? `${t.location.pathname}?${e.toString()}` : t.location.pathname;
    this.config.useReplaceState ? t.history.replaceState({}, "", i) : t.history.pushState({}, "", i);
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
    const i = e.getTimezoneOffset() * 6e4;
    return new Date(e.getTime() - i).toISOString().slice(0, 16);
  }
};
function ke(t, e) {
  let i = null;
  return Object.assign(((...n) => {
    i && clearTimeout(i), i = setTimeout(() => {
      t(...n), i = null;
    }, e);
  }), { cancel: () => {
    i && (clearTimeout(i), i = null);
  } });
}
function Te(t, e) {
  if (!("filters" in t)) {
    const c = t, o = new URLSearchParams();
    for (const [d, l] of Object.entries(c)) l != null && l !== "" && o.set(d, String(l));
    return o;
  }
  const i = t, s = new URLSearchParams(), { includePage: r = !0, includeDefaults: n = !1 } = e || {};
  r && (i.page > 1 || n) && s.set("page", String(i.page)), (i.per_page !== 25 || n) && s.set("per_page", String(i.per_page)), i.search && s.set("q", i.search), i.sort_field && (s.set("sort_field", i.sort_field), i.sort_order && s.set("sort_order", i.sort_order));
  for (const [c, o] of Object.entries(i.filters)) o != null && o !== "" && s.set(c, o);
  return s;
}
function Ee(t, e, i) {
  if (!i) {
    const d = {};
    for (const l of e) {
      const h = t.get(String(l));
      h !== null && (d[String(l)] = h);
    }
    for (const l of [
      "page",
      "per_page",
      "q",
      "search",
      "sort_field",
      "sort_order"
    ]) {
      const h = t.get(l);
      h !== null && (d[l] = h);
    }
    return d;
  }
  const s = {
    page: i?.page ?? 1,
    per_page: i?.per_page ?? 25,
    search: i?.search ?? "",
    filters: {},
    ...i
  }, r = t.get("page");
  if (r) {
    const d = parseInt(r, 10);
    Number.isNaN(d) || (s.page = Math.max(1, d));
  }
  const n = t.get("per_page");
  if (n) {
    const d = parseInt(n, 10);
    Number.isNaN(d) || (s.per_page = Math.max(1, d));
  }
  const c = t.get("q") || t.get("search");
  c && (s.search = c);
  const o = t.get("sort_field");
  o && (s.sort_field = o, s.sort_order = t.get("sort_order") === "desc" ? "desc" : "asc");
  for (const d of e) {
    const l = t.get(String(d));
    l !== null && (s.filters[d] = l);
  }
  return s;
}
var W = class {
  constructor() {
    this.state = {
      granted: /* @__PURE__ */ new Set(),
      loaded: !1
    }, this.loadPromise = null, this.listeners = /* @__PURE__ */ new Set();
  }
  init(t) {
    this.state = {
      granted: new Set(t),
      loaded: !0
    }, this.notifyListeners();
  }
  setPermissions(t) {
    this.init(t);
  }
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
  has(t) {
    return this.state.granted.has(t);
  }
  can(t) {
    return this.has(t);
  }
  hasAll(t) {
    return t.every((e) => this.state.granted.has(e));
  }
  canAll(t) {
    return this.hasAll(t);
  }
  hasAny(t) {
    return t.some((e) => this.state.granted.has(e));
  }
  canAny(t) {
    return this.hasAny(t);
  }
  check(t) {
    const e = this.state.granted.has(t);
    return {
      allowed: e,
      permission: t,
      reason: e ? void 0 : `Missing permission: ${t}`
    };
  }
  getMissing(t) {
    return t.filter((e) => !this.state.granted.has(e));
  }
  isLoaded() {
    return this.state.loaded;
  }
  getState() {
    return { ...this.state };
  }
  subscribe(t) {
    return this.listeners.add(t), () => this.listeners.delete(t);
  }
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
}, Z = null;
function L() {
  return Z || (Z = new W()), Z;
}
function qe(t) {
  L().init(t);
}
function A(t, e) {
  return (i) => {
    const s = i instanceof W ? i : e || L(), r = Array.isArray(t) ? t : [t];
    return () => s.hasAll(r);
  };
}
function Pe(t, e) {
  return (i) => {
    const s = i instanceof W ? i : e || L();
    return () => s.hasAll(t);
  };
}
function Ae(t, e) {
  return (i) => {
    const s = i instanceof W ? i : e || L();
    return () => s.hasAny(t);
  };
}
function Re(...t) {
  const e = t.flatMap((i) => Array.isArray(i) ? i : [i]);
  return (i) => () => e.every((s) => s(i)());
}
function M(t) {
  return A(C.VIEW, t)();
}
function T(t) {
  return A(C.CONNECT, t)();
}
function R(t) {
  return A(C.EDIT, t)();
}
function at(t) {
  return A(C.REVOKE, t)();
}
function St(t) {
  return A(C.RECONSENT, t)();
}
function Rt(t) {
  return A(C.ACTIVITY_VIEW, t)();
}
function Ft(t) {
  if (t instanceof nt) return t.isForbidden;
  if (!t || typeof t != "object") return !1;
  const e = t;
  return e.isForbidden === !0 || e.statusCode === 403 || e.code === "FORBIDDEN";
}
function Fe(t, e) {
  return Ft(t) ? (e(t), !0) : !1;
}
function Ie(t, e, i, s) {
  const r = s || L();
  return async () => {
    if (!r.has(t)) {
      i?.();
      return;
    }
    return e();
  };
}
function X(t, e, i) {
  const s = i || L(), { requires: r = [], requiresAny: n = [], onDenied: c, disableOnDenied: o } = e;
  let d = !0, l = [];
  r.length > 0 ? (l = s.getMissing(r), d = l.length === 0) : n.length > 0 && (d = s.hasAny(n), d || (l = n)), d || (o ? ((t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0), t.classList.add("permission-denied", "opacity-50", "cursor-not-allowed"), t.setAttribute("title", `Permission required: ${l.join(", ")}`)) : (t.style.display = "none", t.classList.add("permission-hidden")), e.deniedContent && (typeof e.deniedContent == "string" ? t.outerHTML = e.deniedContent : t.replaceWith(e.deniedContent)), c?.(l));
}
function Me(t = document.body, e) {
  t.querySelectorAll("[data-permission-requires]").forEach((i) => {
    const s = i.dataset.permissionRequires?.split(",").map((r) => r.trim());
    s && s.length > 0 && X(i, { requires: s }, e);
  }), t.querySelectorAll("[data-permission-requires-any]").forEach((i) => {
    const s = i.dataset.permissionRequiresAny?.split(",").map((r) => r.trim());
    s && s.length > 0 && X(i, { requiresAny: s }, e);
  }), t.querySelectorAll("[data-permission-disable]").forEach((i) => {
    const s = i.dataset.permissionDisable?.split(",").map((r) => r.trim());
    s && s.length > 0 && X(i, {
      requires: s,
      disableOnDenied: !0
    }, e);
  });
}
function It() {
  if (typeof window > "u" || typeof document > "u") return [];
  const t = window.__permissions;
  if (Array.isArray(t)) return t.filter((i) => Object.values(C).includes(i));
  const e = document.body.dataset.permissions;
  if (e) try {
    const i = JSON.parse(e);
    if (Array.isArray(i)) return i.filter((s) => Object.values(C).includes(s));
  } catch {
  }
  return [];
}
function je() {
  const t = It(), e = L();
  return e.init(t), e;
}
var Mt = class {
  constructor(t) {
    this.state = "idle", this.feedbackTimeout = null, this.busyController = null, this.button = t.button, this.originalHTML = this.button.innerHTML, this.originalDisabled = this.button.disabled, this.config = {
      loadingText: t.loadingText ?? "Processing...",
      successText: t.successText ?? "Done",
      errorText: t.errorText ?? "Failed",
      feedbackDuration: t.feedbackDuration ?? 2e3,
      disableOnLoading: t.disableOnLoading ?? !0,
      showSpinner: t.showSpinner ?? !0
    };
  }
  getState() {
    return this.state;
  }
  setLoading() {
    this.clearFeedbackTimeout(), this.resetBusyState(), this.state = "loading", this.button.classList.add("mutation-loading"), this.button.classList.remove("mutation-success", "mutation-error"), this.busyController = kt(this.button, {
      label: this.config.loadingText,
      generateSpinner: this.config.showSpinner
    }), this.config.disableOnLoading || (this.button.disabled = this.originalDisabled);
  }
  setSuccess() {
    this.clearFeedbackTimeout(), this.resetBusyState(), this.state = "success", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-error"), this.button.classList.add("mutation-success"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${a(this.config.successText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  setError() {
    this.clearFeedbackTimeout(), this.resetBusyState(), this.state = "error", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success"), this.button.classList.add("mutation-error"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>${a(this.config.errorText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  reset() {
    this.clearFeedbackTimeout(), this.resetBusyState(), this.state = "idle", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success", "mutation-error"), this.button.innerHTML = this.originalHTML;
  }
  destroy() {
    this.clearFeedbackTimeout(), this.reset();
  }
  clearFeedbackTimeout() {
    this.feedbackTimeout && (clearTimeout(this.feedbackTimeout), this.feedbackTimeout = null);
  }
  resetBusyState() {
    this.busyController && (this.busyController.reset(), this.busyController = null);
  }
};
async function v(t) {
  const { mutation: e, notifier: i, successMessage: s, errorMessagePrefix: r = "Operation failed", buttonConfig: n, onSuccess: c, onError: o, showInlineRetry: d = !1, retryContainer: l } = t, h = n ? new Mt(n) : null;
  try {
    h?.setLoading();
    const b = await e();
    if (h?.setSuccess(), i && s) {
      const g = typeof s == "function" ? s(b) : s;
      i.success(g);
    }
    return l && it(l), await c?.(b), {
      success: !0,
      result: b
    };
  } catch (b) {
    const g = b instanceof Error ? b : new Error(String(b));
    return h?.setError(), i && i.error(`${r}: ${g.message}`), d && l && jt({
      container: l,
      action: () => v(t).then(() => {
      }),
      errorMessage: `${r}: ${g.message}`,
      onDismiss: () => it(l)
    }), o?.(g), {
      success: !1,
      error: g
    };
  }
}
async function Ne(t) {
  const { confirmMessage: e, confirmOptions: i, ...s } = t;
  return await mt.confirm(e, {
    title: i?.title ?? "Confirm Action",
    confirmText: i?.confirmText ?? "Confirm",
    cancelText: i?.cancelText ?? "Cancel",
    confirmVariant: i?.variant ?? "primary"
  }) ? {
    ...await v(s),
    cancelled: !1
  } : {
    success: !1,
    cancelled: !0
  };
}
function jt(t) {
  const { container: e, action: i, errorMessage: s, retryText: r = "Retry", dismissText: n = "Dismiss", onDismiss: c } = t;
  e.innerHTML = `
    <div class="mutation-retry-ui flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div class="flex-shrink-0 text-red-500" aria-hidden="true">
        ${u("iconoir:warning-triangle", { size: "20px" })}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-red-700">${a(s)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button"
                  class="mutation-retry-btn px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors">
            ${a(r)}
          </button>
          <button type="button"
                  class="mutation-dismiss-btn px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
            ${a(n)}
          </button>
        </div>
      </div>
    </div>
  `;
  const o = e.querySelector(".mutation-retry-btn"), d = e.querySelector(".mutation-dismiss-btn");
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
      await i();
    } finally {
      l.disabled = !1, l.textContent = h;
    }
  }), d?.addEventListener("click", () => {
    it(e), c?.();
  });
}
function it(t) {
  t.querySelector(".mutation-retry-ui")?.remove();
}
function Nt(t) {
  const { action: e, resourceType: i, resourceName: s, additionalContext: r } = t, n = {
    revoke: {
      verb: "revoke",
      noun: "Revoke",
      variant: "danger"
    },
    disconnect: {
      verb: "disconnect",
      noun: "Disconnect",
      variant: "danger"
    },
    uninstall: {
      verb: "uninstall",
      noun: "Uninstall",
      variant: "danger"
    },
    cancel: {
      verb: "cancel",
      noun: "Cancel",
      variant: "danger"
    },
    delete: {
      verb: "delete",
      noun: "Delete",
      variant: "danger"
    },
    refresh: {
      verb: "refresh",
      noun: "Refresh",
      variant: "primary"
    }
  }, c = {
    connection: "connection",
    installation: "installation",
    subscription: "subscription",
    sync: "sync job"
  }, o = n[e] || {
    verb: e,
    noun: e,
    variant: "primary"
  }, d = c[i] || i;
  let l = `Are you sure you want to ${o.verb} this ${d}`;
  return s && (l += ` (${s})`), l += "?", r && (l += ` ${r}`), o.variant === "danger" && (l += " This action cannot be undone."), {
    message: l,
    options: {
      title: `${o.noun} ${d.charAt(0).toUpperCase() + d.slice(1)}`,
      confirmText: o.noun,
      cancelText: "Cancel",
      variant: o.variant
    }
  };
}
async function G(t) {
  const { message: e, options: i } = Nt(t);
  return mt.confirm(e, i);
}
var J = class {
  constructor() {
    this.inFlight = /* @__PURE__ */ new Set();
  }
  isInFlight(t) {
    return this.inFlight.has(t);
  }
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
  clear() {
    this.inFlight.clear();
  }
}, j = {
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
}, Dt = class {
  constructor() {
    this.backendLabels = {}, this.initialized = !1, this.fallbackFormatter = lt;
  }
  init(t = {}) {
    t.labels && (this.backendLabels = { ...t.labels }), t.fallbackFormatter && (this.fallbackFormatter = t.fallbackFormatter), this.initialized = !0;
  }
  isInitialized() {
    return this.initialized;
  }
  getLabel(t) {
    if (this.backendLabels[t]) return this.backendLabels[t];
    const e = j[t];
    return e ? e.label : this.fallbackFormatter(t);
  }
  getEntry(t) {
    const e = j[t];
    return e ? {
      ...e,
      label: this.backendLabels[t] || e.label
    } : null;
  }
  getAllLabels() {
    const t = {};
    for (const [e, i] of Object.entries(j)) t[e] = i.label;
    for (const [e, i] of Object.entries(this.backendLabels)) t[e] = i;
    return t;
  }
  getActionsByCategory() {
    const t = {};
    for (const e of Object.values(j)) {
      const i = e.category || "other";
      t[i] || (t[i] = []), t[i].push({
        ...e,
        label: this.backendLabels[e.action] || e.label
      });
    }
    return t;
  }
  setLabels(t) {
    this.backendLabels = {
      ...this.backendLabels,
      ...t
    };
  }
  clearBackendLabels() {
    this.backendLabels = {};
  }
  reset() {
    this.backendLabels = {}, this.fallbackFormatter = lt, this.initialized = !1;
  }
}, w = new Dt();
function De(t = {}) {
  w.init(t);
}
function Ut(t) {
  return w.getLabel(t);
}
function Ue(t) {
  return w.getEntry(t);
}
function Oe() {
  return w.getAllLabels();
}
function Ot() {
  return w.getActionsByCategory();
}
function He(t) {
  w.setLabels(t);
}
function ze() {
  return w.isInitialized();
}
function Be() {
  w.reset();
}
function Ve(t = {}) {
  return (e) => t[e] ? t[e] : w.getLabel(e);
}
function lt(t) {
  return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
var Ht = "/admin/services", zt = {
  connection: "connections",
  installation: "installations",
  subscription: "subscriptions",
  sync: "sync",
  provider: "providers",
  activity: "activity"
};
function k() {
  if (typeof window < "u") return window;
}
function dt() {
  if (!(typeof globalThis > "u"))
    return globalThis.sessionStorage;
}
function Bt(t) {
  const e = k();
  if (e && typeof e.btoa == "function") return e.btoa(t);
  const i = globalThis.Buffer;
  if (i) return i.from(t, "utf8").toString("base64");
  throw new Error("base64 encoding is unavailable");
}
function Vt(t) {
  const e = k();
  if (e && typeof e.atob == "function") return e.atob(t);
  const i = globalThis.Buffer;
  if (i) return i.from(t, "base64").toString("utf8");
  throw new Error("base64 decoding is unavailable");
}
var Wt = class {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || Ht, this.pathMap = {
      ...zt,
      ...t.pathMap
    };
  }
  configure(t) {
    t.basePath && (this.basePath = t.basePath), t.pathMap && (this.pathMap = {
      ...this.pathMap,
      ...t.pathMap
    });
  }
  generateLink(t, e, i) {
    const s = this.pathMap[t] || t;
    let r = `${this.basePath}/${s}/${encodeURIComponent(e)}`;
    if (i) {
      const n = this.encodeContext(i);
      n && (r += `?ctx=${n}`);
    }
    return r;
  }
  generateListLink(t, e) {
    const i = this.pathMap[t] || t;
    let s = `${this.basePath}/${i}`;
    if (e && Object.keys(e).length > 0) {
      const r = new URLSearchParams();
      for (const [n, c] of Object.entries(e)) c && r.set(n, c);
      s += `?${r.toString()}`;
    }
    return s;
  }
  navigateTo(t, e, i, s = {}) {
    const r = k();
    if (!r?.history) return;
    i && this.saveContext(i);
    const n = this.generateLink(t, e, i);
    s.replace ? r.history.replaceState({
      entityType: t,
      entityId: e,
      context: i
    }, "", n) : r.history.pushState({
      entityType: t,
      entityId: e,
      context: i
    }, "", n), r.dispatchEvent(new CustomEvent("services:navigate", { detail: {
      entityType: t,
      entityId: e,
      context: i,
      url: n
    } }));
  }
  navigateBack() {
    const t = k();
    if (!t?.history) return this.restoreContext();
    const e = this.restoreContext();
    if (e?.fromPage) {
      const i = new URLSearchParams();
      if (e.filters)
        for (const [n, c] of Object.entries(e.filters)) c && i.set(n, c);
      e.search && i.set("q", e.search), e.page && e.page > 1 && i.set("page", String(e.page)), e.viewMode && i.set("view", e.viewMode);
      const s = i.toString(), r = s ? `${e.fromPage}?${s}` : e.fromPage;
      return t.history.pushState({ restored: !0 }, "", r), t.dispatchEvent(new CustomEvent("services:navigate-back", { detail: {
        context: e,
        url: r
      } })), e;
    }
    return t.history.back(), null;
  }
  parseCurrentUrl() {
    const t = k();
    return t?.location ? this.parseUrl(t.location.pathname + t.location.search) : null;
  }
  parseUrl(t) {
    const [e, i] = t.split("?"), s = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (s.length < 2) return null;
    const r = s[0], n = decodeURIComponent(s[1]);
    let c = null;
    for (const [d, l] of Object.entries(this.pathMap)) if (l === r) {
      c = d;
      break;
    }
    if (!c) return null;
    let o;
    if (i) {
      const d = new URLSearchParams(i).get("ctx");
      d && (o = this.decodeContext(d));
    }
    return {
      entityType: c,
      entityId: n,
      context: o
    };
  }
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
  createContextFromQueryState(t, e) {
    const i = {};
    for (const [s, r] of Object.entries(t.filters)) r && (i[s] = r);
    return {
      fromPage: k()?.location?.pathname,
      filters: Object.keys(i).length > 0 ? i : void 0,
      search: t.search || void 0,
      page: t.page > 1 ? t.page : void 0,
      viewMode: e
    };
  }
  saveContext(t) {
    const e = dt();
    if (e)
      try {
        e.setItem(this.contextStorageKey, JSON.stringify(t));
      } catch {
      }
  }
  restoreContext() {
    const t = dt();
    if (!t) return null;
    try {
      const e = t.getItem(this.contextStorageKey);
      if (e)
        return t.removeItem(this.contextStorageKey), JSON.parse(e);
    } catch {
    }
    return null;
  }
  encodeContext(t) {
    try {
      return Bt(JSON.stringify(t));
    } catch {
      return "";
    }
  }
  decodeContext(t) {
    try {
      return JSON.parse(Vt(t));
    } catch {
      return;
    }
  }
}, $ = new Wt();
function We(t) {
  $.configure(t);
}
function Gt(t, e, i) {
  return $.generateLink(t, e, i);
}
function Ge(t, e) {
  return $.generateListLink(t, e);
}
function Jt(t, e, i, s) {
  $.navigateTo(t, e, i, s);
}
function Je() {
  return $.navigateBack();
}
function Qe() {
  return $.parseCurrentUrl();
}
function Ke(t) {
  return $.parseUrl(t);
}
function wt(t) {
  return $.mapObjectTypeToEntity(t);
}
function Qt(t, e) {
  return $.createContextFromQueryState(t, e);
}
function Kt(t, e) {
  return (i, s) => {
    const r = wt(i);
    if (!r) {
      console.warn(`[DeepLinks] Unknown object type: ${i}`);
      return;
    }
    Jt(r, s, Qt(t(), e?.()));
  };
}
function Yt(t) {
  const { container: e, selector: i, onSelect: s, onFocus: r, onEscape: n, wrap: c = !0, autoFocus: o = !1, keyHandlers: d = {} } = t;
  function l() {
    return Array.from(e.querySelectorAll(i));
  }
  function h(p) {
    const y = l();
    if (y.length === 0) return;
    let S = p;
    c ? S = (p % y.length + y.length) % y.length : S = Math.max(0, Math.min(p, y.length - 1)), y.forEach((_t, Ct) => {
      _t.setAttribute("tabindex", Ct === S ? "0" : "-1");
    });
    const _ = y[S];
    _.focus(), r?.(_, S);
  }
  function b(p) {
    const y = l();
    if (y.length === 0) return;
    const S = p.target, _ = y.indexOf(S);
    if (_ !== -1) {
      if (d[p.key]) {
        d[p.key](p, S, _);
        return;
      }
      switch (p.key) {
        case "ArrowDown":
        case "ArrowRight":
          p.preventDefault(), h(_ + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          p.preventDefault(), h(_ - 1);
          break;
        case "Home":
          p.preventDefault(), h(0);
          break;
        case "End":
          p.preventDefault(), h(y.length - 1);
          break;
        case "Enter":
        case " ":
          p.preventDefault(), s?.(S, _);
          break;
        case "Escape":
          p.preventDefault(), n?.();
          break;
      }
    }
  }
  const g = l();
  return g.forEach((p, y) => {
    p.setAttribute("tabindex", y === 0 ? "0" : "-1"), p.hasAttribute("role") || p.setAttribute("role", "option");
  }), e.hasAttribute("role") || e.setAttribute("role", "listbox"), e.addEventListener("keydown", b), o && g.length > 0 && h(0), () => {
    e.removeEventListener("keydown", b);
  };
}
function Ye(t, e) {
  return Yt({
    container: t,
    selector: e,
    wrap: !0,
    onSelect: (i) => {
      i.click();
    }
  });
}
var Zt = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function Xt(t) {
  const { container: e, initialFocus: i, returnFocus: s, onEscape: r } = t, n = document.activeElement;
  function c() {
    return Array.from(e.querySelectorAll(Zt));
  }
  function o(d) {
    if (d.key === "Escape") {
      d.preventDefault(), r?.();
      return;
    }
    if (d.key !== "Tab") return;
    const l = c();
    if (l.length === 0) return;
    const h = l[0], b = l[l.length - 1];
    d.shiftKey ? document.activeElement === h && (d.preventDefault(), b.focus()) : document.activeElement === b && (d.preventDefault(), h.focus());
  }
  return requestAnimationFrame(() => {
    i ? (typeof i == "string" ? e.querySelector(i) : i)?.focus() : c()[0]?.focus();
  }), e.addEventListener("keydown", o), e.hasAttribute("role") || e.setAttribute("role", "dialog"), e.setAttribute("aria-modal", "true"), () => {
    e.removeEventListener("keydown", o), e.removeAttribute("aria-modal"), (s || n)?.focus?.();
  };
}
function te(t) {
  const e = `services-live-region-${t}`;
  let i = document.getElementById(e);
  return i || (i = document.createElement("div"), i.id = e, i.setAttribute("aria-live", t), i.setAttribute("aria-atomic", "true"), i.setAttribute("role", "status"), i.className = "sr-only", Object.assign(i.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0"
  }), document.body.appendChild(i)), i;
}
function Q(t, e = {}) {
  const { priority: i = "polite", clear: s = !0 } = e, r = te(i);
  s && (r.textContent = ""), setTimeout(() => {
    r.textContent = t;
  }, 100);
}
function Ze(t) {
  Q(`Loading ${t}...`, { priority: "polite" });
}
function Xe(t) {
  Q(t, { priority: "polite" });
}
function ti(t) {
  Q(`Error: ${t}`, { priority: "assertive" });
}
function ei(t) {
  Q(`Navigating to ${t}`, { priority: "polite" });
}
function ii(t, e, i) {
  t.setAttribute("aria-expanded", String(i));
  const s = typeof e == "string" ? e : e.id;
  s && t.setAttribute("aria-controls", s);
}
function si(t, e) {
  t.setAttribute("aria-busy", String(e)), e ? t.setAttribute("aria-describedby", "loading-indicator") : t.removeAttribute("aria-describedby");
}
function ri(t, e, i) {
  t.setAttribute("role", "status"), t.setAttribute("aria-label", `Status: ${i}`);
}
function ni(t, e) {
  t.setAttribute("aria-sort", e), t.setAttribute("role", "columnheader");
}
function ai(t, e, i = 100, s) {
  t.setAttribute("role", "progressbar"), t.setAttribute("aria-valuenow", String(e)), t.setAttribute("aria-valuemin", "0"), t.setAttribute("aria-valuemax", String(i)), s && t.setAttribute("aria-label", s);
}
function oi(t, e = "Skip to main content") {
  const i = document.createElement("a");
  return i.href = `#${t}`, i.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg", i.textContent = e, i;
}
function ci(t, e = {}) {
  const { title: i, describedBy: s, onClose: r } = e;
  if (t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), i) {
    const c = `dialog-title-${Date.now()}`, o = t.querySelector('h1, h2, h3, [role="heading"]');
    o && (o.id = c, t.setAttribute("aria-labelledby", c));
  }
  s && t.setAttribute("aria-describedby", s);
  const n = Xt({
    container: t,
    onEscape: r
  });
  return () => {
    n(), t.removeAttribute("aria-modal"), t.removeAttribute("aria-labelledby"), t.removeAttribute("aria-describedby");
  };
}
function ee() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function li(t) {
  return ee() ? 0 : t;
}
var ut = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  degraded: {
    label: "Degraded",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:warning-triangle"
  },
  errored: {
    label: "Error",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  },
  disabled: {
    label: "Disabled",
    bg: "bg-gray-100",
    text: "text-gray-500",
    icon: "iconoir:cancel"
  }
}, ie = {
  healthy: {
    label: "Healthy",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  warning: {
    label: "Warnings",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:warning-triangle"
  },
  error: {
    label: "Errors",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  }
}, di = class {
  constructor(t) {
    this.container = null, this.state = null, this.loading = !1, this.config = t, this.state = t.state || null;
  }
  init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ExtensionDiagnostics] Container not found");
      return;
    }
    this.render(), this.bindEvents();
  }
  setState(t) {
    this.state = t, this.render(), this.bindEvents();
  }
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
              Runtime v${a(this.state.runtimeVersion)} &middot;
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
  renderSummaryCard(t, e, i) {
    return `
      <div class="bg-white rounded-lg border ${(i.errored || 0) > 0 || (i.degraded || 0) > 0 ? "border-amber-200" : "border-gray-200"} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">${t}</span>
          <span class="text-2xl font-semibold text-gray-900">${e}</span>
        </div>
        <div class="flex items-center gap-2 mt-2">
          ${Object.entries(i).map(([s, r]) => {
      const n = ut[s];
      return r > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${n.bg} ${n.text}">
                ${r} ${n.label.toLowerCase()}
              </span>
            ` : "";
    }).join("")}
        </div>
      </div>
    `;
  }
  renderConfigHealthCard() {
    if (!this.state) return "";
    const t = this.state.configHealth, e = ie[t.status];
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
    const e = ut[t.status];
    return `
      <div class="pack-row px-4 py-3 hover:bg-gray-50 cursor-pointer" data-pack-id="${a(t.id)}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${a(t.name)}</span>
              <span class="text-xs text-gray-400">v${a(t.version)}</span>
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
              <span class="text-xs text-red-600 truncate max-w-48" title="${a(t.lastError)}">
                ${a(t.lastError.slice(0, 50))}${t.lastError.length > 50 ? "..." : ""}
              </span>
            ` : ""}
            ${u("iconoir:nav-arrow-right", {
      size: "16px",
      extraClass: "text-gray-400"
    })}
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
              <span class="text-sm font-medium text-gray-900">${a(t.name)}</span>
              <span class="text-xs text-gray-400">from ${a(t.sourcePack)}</span>
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
      <div class="error-row px-4 py-3 hover:bg-red-50 cursor-pointer" data-error-id="${a(t.id)}">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            ${u("iconoir:warning-circle", {
      size: "16px",
      extraClass: "text-red-500"
    })}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-red-800">${a(t.type)}</span>
              <span class="text-xs text-gray-400">from ${a(t.packId)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-0.5">${a(t.message)}</p>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>${this.formatTime(t.occurredAt)}</span>
              ${t.relatedEntity ? `
                <span>${a(t.relatedEntity.type)}:${a(t.relatedEntity.id)}</span>
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
        <p class="text-sm text-gray-500">${a(t)}</p>
      </div>
    `;
  }
  bindEvents() {
    this.container && (this.container.querySelector(".diagnostics-refresh")?.addEventListener("click", () => this.refresh()), this.container.querySelectorAll(".pack-row").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.packId;
        e && this.config.onPackSelect && this.config.onPackSelect(e);
      });
    }), this.container.querySelectorAll(".error-row").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.errorId, i = this.state?.recentErrors.find((s) => s.id === e);
        i && this.config.onErrorSelect && this.config.onErrorSelect(i);
      });
    }));
  }
  updateRefreshButton() {
    const t = this.container?.querySelector(".diagnostics-refresh");
    if (t) {
      t.disabled = this.loading;
      const e = t.querySelector("svg");
      e && e.classList.toggle("animate-spin", this.loading);
    }
  }
  countByStatus(t) {
    const e = {};
    for (const i of t) e[i.status] = (e[i.status] || 0) + 1;
    return e;
  }
  countHookStatus(t) {
    let e = 0, i = 0;
    for (const s of t) s.enabled ? e++ : i++;
    return {
      active: e,
      disabled: i
    };
  }
  formatTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const i = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(i / 6e4), r = Math.floor(i / 36e5);
    return s < 1 ? "just now" : s < 60 ? `${s}m ago` : r < 24 ? `${r}h ago` : e.toLocaleDateString();
  }
};
function U(t) {
  const { source: e, packName: i, mode: s = "badge", context: r } = t, n = {
    "go-services": {
      label: "Core",
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "iconoir:box-3d-center",
      description: "Managed by go-services core"
    },
    downstream: {
      label: i || "Extension",
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: "iconoir:plug",
      description: `Managed by ${i || "downstream extension"}`
    },
    mixed: {
      label: "Mixed",
      bg: "bg-gray-50",
      text: "text-gray-700",
      icon: "iconoir:layers",
      description: "Combination of core and extension data"
    }
  }[e];
  return s === "tooltip" ? `
      <span class="state-source-indicator inline-flex items-center"
            title="${a(n.description)}${r ? ` - ${r}` : ""}"
            aria-label="${a(n.description)}">
        ${u(n.icon, {
    size: "14px",
    extraClass: n.text
  })}
      </span>
    ` : `
    <span class="state-source-indicator inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${n.bg} ${n.text}"
          title="${a(n.description)}${r ? ` - ${r}` : ""}"
          role="note"
          aria-label="State source: ${a(n.description)}">
      ${u(n.icon, { size: "12px" })}
      <span>${a(n.label)}</span>
    </span>
  `;
}
function ui(t, e) {
  const i = document.createElement("span");
  i.innerHTML = U(e), t.appendChild(i.firstElementChild);
}
function hi() {
  return `
    <div class="state-source-legend p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">State Source Legend</h4>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          ${U({ source: "go-services" })}
          <span class="text-sm text-gray-600">Data managed by go-services core runtime</span>
        </div>
        <div class="flex items-center gap-3">
          ${U({
    source: "downstream",
    packName: "Extension"
  })}
          <span class="text-sm text-gray-600">Data managed by an installed extension package</span>
        </div>
        <div class="flex items-center gap-3">
          ${U({ source: "mixed" })}
          <span class="text-sm text-gray-600">Combination of core and extension-managed data</span>
        </div>
      </div>
    </div>
  `;
}
function O(t) {
  return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function x(t, e) {
  const i = typeof e == "function" ? String(e(t) || "").trim() : "";
  return i || O(t);
}
function H(t) {
  return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function m(t, e = 12) {
  return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
}
function I(t) {
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
}
function f(t, e = {}) {
  const i = new Date(t);
  if (Number.isNaN(i.getTime())) return t;
  if (!e.allowFuture) {
    const h = (/* @__PURE__ */ new Date()).getTime() - i.getTime(), b = Math.floor(h / 6e4), g = Math.floor(h / 36e5), p = Math.floor(h / 864e5);
    return b < 1 ? e.pastImmediateLabel || "Just now" : b < 60 ? `${b}m ago` : g < 24 ? `${g}h ago` : p < 7 ? `${p}d ago` : i.toLocaleDateString();
  }
  const s = /* @__PURE__ */ new Date(), r = i.getTime() - s.getTime(), n = r > 0, c = Math.abs(r), o = Math.floor(c / 6e4), d = Math.floor(c / 36e5), l = Math.floor(c / 864e5);
  return o < 1 ? n ? e.futureImmediateLabel || "Soon" : e.pastImmediateLabel || "Just now" : o < 60 ? n ? `in ${o}m` : `${o}m ago` : d < 24 ? n ? `in ${d}h` : `${d}h ago` : l < 7 ? n ? `in ${l}d` : `${l}d ago` : i.toLocaleDateString();
}
async function $t(t, e = {}) {
  try {
    return (await t.listProviders(e.signal)).providers || [];
  } catch (i) {
    const s = i instanceof Error ? i : new Error(String(i));
    return e.onError?.(s), e.notifier?.error(`Failed to load providers: ${s.message}`), [];
  }
}
async function ot(t, e) {
  const i = await $t(t, e);
  return se({
    container: e.container,
    providers: i,
    selectedProviderId: e.selectedProviderId,
    getProviderName: e.getProviderName,
    selectSelector: e.selectSelector,
    emptyLabel: e.emptyLabel
  }), i;
}
function se(t) {
  const e = t.container?.querySelector(t.selectSelector || '[data-filter="provider_id"]');
  if (!e) return;
  const i = t.emptyLabel || "All Providers", s = t.providers.map((r) => {
    const n = x(r.id, t.getProviderName);
    return `<option value="${a(r.id)}">${a(n)}</option>`;
  }).join("");
  e.innerHTML = `<option value="">${a(i)}</option>${s}`, e.value = t.selectedProviderId || "";
}
function E(t, e) {
  t.querySelector(".ui-state-reset-btn")?.addEventListener("click", e);
}
function K(t, e) {
  return t?.abort(), e.destroy(), null;
}
var ht = {
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
}, re = {
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
}, ne = class {
  constructor(t) {
    this.container = null, this.providers = [], this.loading = !1, this.error = null, this.config = t;
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ProvidersCatalog] Container not found:", this.config.container);
      return;
    }
    if (!M()()) {
      this.renderForbidden();
      return;
    }
    await this.loadProviders();
  }
  async refresh() {
    await this.loadProviders();
  }
  getProviders() {
    return [...this.providers];
  }
  getProvider(t) {
    return this.providers.find((e) => e.id === t);
  }
  async loadProviders() {
    if (this.container) {
      this.loading = !0, this.error = null, this.renderLoading(), this.providers = await $t(P(), {
        notifier: this.config.notifier,
        onError: (t) => {
          this.error = t;
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
  }
  renderLoading() {
    this.container && (this.container.innerHTML = rt({
      text: "Loading providers...",
      size: "lg"
    }));
  }
  renderError() {
    this.container && (this.container.innerHTML = st({
      title: "Failed to load providers",
      error: this.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadProviders()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = q({ resource: "service providers" }));
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
    this.container && (this.container.innerHTML = Tt({ type: "providers" }));
  }
  buildProviderCard(t) {
    const e = this.getProviderCardData(t), i = T()() && t.supported_scope_types.includes("user"), s = T()() && t.supported_scope_types.includes("org"), r = this.buildCapabilitySummary(t.capabilities), n = this.buildScopeBadges(t.supported_scope_types);
    return `
      <div class="provider-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
           data-provider-id="${a(t.id)}">
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                ${u(e.icon, {
      size: "20px",
      extraClass: "text-gray-600"
    })}
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">${a(e.displayName)}</h3>
                <span class="text-xs text-gray-500">${a(t.auth_kind)}</span>
              </div>
            </div>
            ${n}
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
            ${i ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                      data-provider-id="${a(t.id)}"
                      data-scope-type="user">
                Connect as User
              </button>
            ` : ""}
            ${s ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      data-provider-id="${a(t.id)}"
                      data-scope-type="org">
                Connect Org
              </button>
            ` : ""}
            ${!i && !s ? `
              <span class="text-xs text-gray-400 italic">Connect permission required</span>
            ` : ""}
          </div>
        </div>
      </div>
    `;
  }
  buildCapabilitySummary(t) {
    if (t.length === 0) return '<span class="text-xs text-gray-400">No capabilities defined</span>';
    const e = 4, i = t.slice(0, e), s = t.length - e;
    let r = '<div class="flex flex-wrap gap-1">';
    for (const n of i) {
      const [c, o] = n.name.split(".");
      r += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              title="${a(n.name)}">
          ${a(o || n.name)}
        </span>
      `;
    }
    return s > 0 && (r += `<span class="text-xs text-gray-400">+${s} more</span>`), r += "</div>", r;
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
    return {
      provider: t,
      displayName: this.config.getProviderName ? this.config.getProviderName(t.id) : re[t.id.toLowerCase()] || x(t.id),
      icon: this.config.getProviderIcon ? this.config.getProviderIcon(t.id) : ht[t.id.toLowerCase()] || ht.default,
      description: `${t.auth_kind} authentication`,
      capabilityCount: t.capabilities.length,
      canConnect: T()()
    };
  }
  bindCardEvents() {
    this.container && (this.container.querySelectorAll(".provider-card").forEach((t) => {
      t.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const i = t.dataset.providerId;
        if (i) {
          const s = this.getProvider(i);
          s && this.config.onSelect && this.config.onSelect(s);
        }
      });
    }), this.container.querySelectorAll(".provider-connect-btn").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = t.dataset.providerId, s = t.dataset.scopeType;
        if (i && s) {
          const r = this.getProvider(i);
          r && this.config.onConnect && this.config.onConnect(r, s);
        }
      });
    }));
  }
};
async function pi(t) {
  const e = new ne(t);
  return await e.init(), e;
}
var pt = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  disconnected: {
    label: "Disconnected",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "iconoir:cancel"
  },
  errored: {
    label: "Error",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  },
  pending_reauth: {
    label: "Pending Reauth",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:clock"
  },
  needs_reconsent: {
    label: "Needs Reconsent",
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: "iconoir:refresh"
  }
}, ae = class {
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
    }, this.client = t.apiClient || P(), this.queryState = new V({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadConnections()
      },
      filterFields: [
        "provider_id",
        "scope_type",
        "scope_id",
        "status"
      ],
      storageKey: "services-connections-list"
    });
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ConnectionsList] Container not found:", this.config.container);
      return;
    }
    if (!M()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), this.state.providers = await ot(this.client, {
      container: this.container,
      notifier: this.config.notifier,
      selectedProviderId: this.queryState.getState().filters.provider_id || "",
      getProviderName: this.config.getProviderName
    }), this.bindEvents(), await this.loadConnections();
  }
  async refresh() {
    await this.loadConnections();
  }
  getConnections() {
    return [...this.state.connections];
  }
  getConnection(t) {
    return this.state.connections.find((e) => e.id === t);
  }
  destroy() {
    this.abortController = K(this.abortController, this.queryState);
  }
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
        }, i = await this.client.listConnections(e, this.abortController.signal);
        this.state.connections = i.connections, this.state.total = i.total, this.queryState.updateFromResponse(i.total, i.has_next), this.renderConnections(), this.updatePagination();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load connections: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
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
          ${T()() && this.config.onConnect ? `
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
            ${u("iconoir:link", {
      size: "24px",
      extraClass: "text-gray-400"
    })}
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
      const s = i.dataset.filter;
      i.value = t.filters[s] || "";
    });
  }
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (r) => {
      this.queryState.setSearch(r.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((r) => {
      r.addEventListener("change", () => {
        const n = r.dataset.filter;
        this.queryState.setFilter(n, r.value || void 0);
      });
    }), this.container.querySelector(".connections-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const t = this.container.querySelector(".connections-connect-user"), e = this.container.querySelector(".connections-connect-org");
    t?.addEventListener("click", () => this.handleConnect("user")), e?.addEventListener("click", () => this.handleConnect("org"));
    const i = this.container.querySelector(".connections-prev"), s = this.container.querySelector(".connections-next");
    i?.addEventListener("click", () => this.queryState.prevPage()), s?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderConnections() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-empty"), i = this.container?.querySelector(".connections-table-wrapper");
    if (t) {
      if (this.state.connections.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = F(6, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
          onReset: () => {
            this.queryState.reset(), this.restoreFilterValues();
          }
        }), E(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.connections.map((s) => this.renderConnectionRow(s)).join(""), this.bindRowActions();
    }
  }
  handleConnect(t) {
    if (!this.config.onConnect || !T()()) return;
    const e = this.container?.querySelector('[data-filter="provider_id"]')?.value || "";
    if (!e) {
      this.config.notifier?.error("Select a provider before starting a connection.");
      return;
    }
    const i = this.state.providers.find((s) => s.id === e);
    if (!i) {
      this.config.notifier?.error("Selected provider is no longer available.");
      return;
    }
    if (!i.supported_scope_types.includes(t)) {
      const s = x(i.id, this.config.getProviderName);
      this.config.notifier?.error(`${s} does not support ${t} scope.`);
      return;
    }
    this.config.onConnect(i.id, t);
  }
  renderConnectionRow(t) {
    const e = pt[t.status] || pt.disconnected, i = x(t.provider_id, this.config.getProviderName), s = f(t.updated_at), r = this.buildRowActions(t);
    return `
      <tr class="connection-row hover:bg-gray-50 cursor-pointer" data-connection-id="${a(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${a(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${a(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${a(t.scope_id)}">
            ${a(m(t.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-gray-600" title="${a(t.external_account_id)}">
            ${a(m(t.external_account_id, 20))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
          ${t.last_error ? `
            <div class="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title="${a(t.last_error)}">
              ${a(t.last_error)}
            </div>
          ` : ""}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${s}
        </td>
        <td class="px-4 py-3 text-right">
          ${r}
        </td>
      </tr>
    `;
  }
  buildRowActions(t) {
    const e = [];
    return t.status === "active" && R()() && e.push(`
        <button type="button"
                class="connection-action-refresh p-1 text-gray-400 hover:text-blue-600"
                data-action="refresh"
                title="Refresh credentials">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status === "needs_reconsent" && St()() && e.push(`
        <button type="button"
                class="connection-action-reconsent p-1 text-gray-400 hover:text-orange-600"
                data-action="reconsent"
                title="Re-consent">
          ${u("iconoir:redo", { size: "16px" })}
        </button>
      `), t.status !== "disconnected" && at()() && e.push(`
        <button type="button"
                class="connection-action-revoke p-1 text-gray-400 hover:text-red-600"
                data-action="revoke"
                title="Revoke connection">
          ${u("iconoir:cancel", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindRowActions() {
    this.container?.querySelectorAll(".connection-row")?.forEach((t) => {
      const e = t.dataset.connectionId;
      e && (t.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const s = this.getConnection(e);
        s && this.config.onSelect && this.config.onSelect(s);
      }), t.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (s) => {
          switch (s.stopPropagation(), i.dataset.action) {
            case "refresh":
              await this.handleRefresh(e, i);
              break;
            case "reconsent":
              await this.handleReconsent(e, i);
              break;
            case "revoke":
              await this.handleRevoke(e, i);
              break;
          }
        });
      }));
    });
  }
  async handleRefresh(t, e) {
    const i = this.getConnection(t);
    i && (this.actionQueue.isInFlight(`refresh-${t}`) || await this.actionQueue.execute(`refresh-${t}`, async () => {
      await v({
        mutation: () => this.client.refreshConnection(t, { provider_id: i.provider_id }),
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
      await v({
        mutation: () => this.client.beginReconsent(t),
        notifier: this.config.notifier,
        errorMessagePrefix: "Failed to start re-consent",
        buttonConfig: e ? {
          button: e,
          loadingText: "Starting...",
          errorText: "Failed"
        } : void 0,
        onSuccess: (i) => {
          i.begin?.authorize_url && (window.location.href = i.begin.authorize_url);
        }
      });
    });
  }
  async handleRevoke(t, e) {
    const i = this.getConnection(t);
    await G({
      action: "revoke",
      resourceType: "connection",
      resourceName: i ? x(i.provider_id, this.config.getProviderName) : void 0
    }) && (this.actionQueue.isInFlight(`revoke-${t}`) || await this.actionQueue.execute(`revoke-${t}`, async () => {
      await v({
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
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), i = this.container?.querySelector(".connections-empty");
    t && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = z(6, {
      title: "Failed to load connections",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnections()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = q({ resource: "connections" }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), i = this.container?.querySelector(".connections-empty");
    this.state.loading && t && this.state.connections.length === 0 && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = B(6, { text: "Loading connections..." }));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: i } = this.state, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, c = t > 1, o = this.container?.querySelector(".connections-info"), d = this.container?.querySelector(".connections-prev"), l = this.container?.querySelector(".connections-next");
    o && (o.textContent = i > 0 ? `Showing ${s}-${r} of ${i}` : "No connections"), d && (d.disabled = !c), l && (l.disabled = !n);
  }
};
async function gi(t) {
  const e = new ae(t);
  return await e.init(), e;
}
var gt = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  suspended: {
    label: "Suspended",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:pause"
  },
  uninstalled: {
    label: "Uninstalled",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "iconoir:cancel"
  },
  needs_reconsent: {
    label: "Needs Reconsent",
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: "iconoir:refresh"
  }
}, bt = {
  user: {
    label: "User",
    bg: "bg-blue-50",
    text: "text-blue-600"
  },
  workspace: {
    label: "Workspace",
    bg: "bg-indigo-50",
    text: "text-indigo-600"
  },
  org: {
    label: "Organization",
    bg: "bg-purple-50",
    text: "text-purple-600"
  },
  marketplace_app: {
    label: "Marketplace",
    bg: "bg-pink-50",
    text: "text-pink-600"
  },
  standard: {
    label: "Standard",
    bg: "bg-gray-50",
    text: "text-gray-600"
  }
}, oe = class {
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
    }, this.client = t.apiClient || P(), this.queryState = new V({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadInstallations()
      },
      filterFields: [
        "provider_id",
        "scope_type",
        "scope_id",
        "install_type",
        "status"
      ],
      storageKey: "services-installations-list"
    });
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[InstallationsList] Container not found:", this.config.container);
      return;
    }
    if (!M()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), this.state.providers = await ot(this.client, {
      container: this.container,
      notifier: this.config.notifier,
      selectedProviderId: this.queryState.getState().filters.provider_id || "",
      getProviderName: this.config.getProviderName
    }), this.bindEvents(), await this.loadInstallations();
  }
  async refresh() {
    await this.loadInstallations();
  }
  getInstallations() {
    return [...this.state.installations];
  }
  getInstallation(t) {
    return this.state.installations.find((e) => e.id === t);
  }
  destroy() {
    this.abortController = K(this.abortController, this.queryState);
  }
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
        }, i = await this.client.listInstallations(e, this.abortController.signal);
        this.state.installations = i.installations, this.state.total = i.total, this.queryState.updateFromResponse(i.total, i.has_next), this.renderInstallations(), this.updatePagination();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load installations: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
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
            ${u("iconoir:download", {
      size: "24px",
      extraClass: "text-gray-400"
    })}
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
      const s = i.dataset.filter;
      i.value = t.filters[s] || "";
    });
  }
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (i) => {
      this.queryState.setSearch(i.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((i) => {
      i.addEventListener("change", () => {
        const s = i.dataset.filter;
        this.queryState.setFilter(s, i.value || void 0);
      });
    }), this.container.querySelector(".installations-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const t = this.container.querySelector(".installations-prev"), e = this.container.querySelector(".installations-next");
    t?.addEventListener("click", () => this.queryState.prevPage()), e?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderInstallations() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-empty"), i = this.container?.querySelector(".installations-table-wrapper");
    if (t) {
      if (this.state.installations.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = F(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), E(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.installations.map((s) => this.renderInstallationRow(s)).join(""), this.bindRowActions();
    }
  }
  renderInstallationRow(t) {
    const e = gt[t.status] || gt.uninstalled, i = bt[t.install_type] || bt.standard, s = x(t.provider_id, this.config.getProviderName), r = t.granted_at ? f(t.granted_at) : "—", n = t.revoked_at ? f(t.revoked_at) : "—", c = this.buildRowActions(t);
    return `
      <tr class="installation-row hover:bg-gray-50 cursor-pointer" data-installation-id="${a(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${a(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${i.bg} ${i.text}">
            ${i.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${a(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${a(t.scope_id)}">
            ${a(m(t.scope_id))}
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
          ${n}
        </td>
        <td class="px-4 py-3 text-right">
          ${c}
        </td>
      </tr>
    `;
  }
  buildRowActions(t) {
    const e = [];
    return t.status === "active" && at()() && e.push(`
        <button type="button"
                class="installation-action-uninstall p-1 text-gray-400 hover:text-red-600"
                data-action="uninstall"
                title="Uninstall">
          ${u("iconoir:trash", { size: "16px" })}
        </button>
      `), t.status === "uninstalled" && T()() && e.push(`
        <button type="button"
                class="installation-action-reinstall p-1 text-gray-400 hover:text-green-600"
                data-action="reinstall"
                title="Reinstall">
          ${u("iconoir:redo", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindRowActions() {
    this.container?.querySelectorAll(".installation-row")?.forEach((t) => {
      const e = t.dataset.installationId;
      e && (t.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const s = this.getInstallation(e);
        s && this.config.onSelect && this.config.onSelect(s);
      }), t.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (s) => {
          switch (s.stopPropagation(), i.dataset.action) {
            case "uninstall":
              await this.handleUninstall(e, i);
              break;
            case "reinstall":
              await this.handleReinstall(e);
              break;
          }
        });
      }));
    });
  }
  async handleUninstall(t, e) {
    const i = this.getInstallation(t);
    await G({
      action: "uninstall",
      resourceType: "installation",
      resourceName: i ? x(i.provider_id, this.config.getProviderName) : void 0
    }) && (this.actionQueue.isInFlight(`uninstall-${t}`) || await this.actionQueue.execute(`uninstall-${t}`, async () => {
      await v({
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
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), i = this.container?.querySelector(".installations-empty");
    t && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = z(7, {
      title: "Failed to load installations",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadInstallations()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = q({ resource: "installations" }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), i = this.container?.querySelector(".installations-empty");
    this.state.loading && t && this.state.installations.length === 0 && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = B(7, { text: "Loading installations..." }));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: i } = this.state, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, c = t > 1, o = this.container?.querySelector(".installations-info"), d = this.container?.querySelector(".installations-prev"), l = this.container?.querySelector(".installations-next");
    o && (o.textContent = i > 0 ? `Showing ${s}-${r} of ${i}` : "No installations"), d && (d.disabled = !c), l && (l.disabled = !n);
  }
};
async function bi(t) {
  const e = new oe(t);
  return await e.init(), e;
}
var N = {
  success: {
    label: "Success",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  failure: {
    label: "Failed",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:clock"
  }
}, ce = class {
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
    }, this.state.viewMode = this.config.viewMode || "timeline", this.client = t.apiClient || P(), this.queryState = new V({
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
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ActivityPage] Container not found:", this.config.container);
      return;
    }
    if (!Rt()()) {
      this.renderForbidden();
      return;
    }
    this.restoreViewMode(), this.queryState.init(), this.renderStructure(), this.bindEvents(), await this.loadActivity();
  }
  async refresh() {
    await this.loadActivity();
  }
  getEntries() {
    return [...this.state.entries];
  }
  getEntry(t) {
    return this.state.entries.find((e) => e.id === t);
  }
  setViewMode(t) {
    this.state.viewMode !== t && (this.state.viewMode = t, this.saveViewMode(), this.updateViewModeUI(), this.renderEntries());
  }
  getViewMode() {
    return this.state.viewMode;
  }
  destroy() {
    this.abortController = K(this.abortController, this.queryState);
  }
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
        }, i = await this.client.listActivity(e, this.abortController.signal);
        this.state.entries = i.entries, this.state.total = i.total, this.queryState.updateFromResponse(i.total, i.has_more), this.renderEntries(), this.updatePagination();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load activity: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1, this.updateLoadingState();
      }
    }
  }
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
              ${u("iconoir:activity", {
      size: "24px",
      extraClass: "text-gray-400"
    })}
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
    return !this.config.providers || this.config.providers.length === 0 ? "" : this.config.providers.map((t) => `<option value="${a(t.id)}">${a(t.name)}</option>`).join("");
  }
  renderChannelOptions() {
    return (this.config.channels || [
      "connections",
      "credentials",
      "grants",
      "webhooks",
      "sync",
      "lifecycle"
    ]).map((t) => `<option value="${a(t)}">${a(H(t))}</option>`).join("");
  }
  renderActionOptions() {
    if (this.config.actions && this.config.actions.length > 0) return this.config.actions.map((s) => {
      const r = this.resolveActionLabel(s);
      return `<option value="${a(s)}">${a(r)}</option>`;
    }).join("");
    const t = Ot(), e = {
      connections: "Connections",
      credentials: "Credentials",
      sync: "Sync",
      webhooks: "Webhooks",
      subscriptions: "Subscriptions",
      installations: "Installations",
      grants: "Permissions",
      errors: "Errors",
      other: "Other"
    }, i = [];
    for (const [s, r] of Object.entries(t)) {
      const n = e[s] || H(s), c = r.map((o) => {
        const d = this.resolveActionLabel(o.action);
        return `<option value="${a(o.action)}">${a(d)}</option>`;
      }).join("");
      i.push(`<optgroup label="${a(n)}">${c}</optgroup>`);
    }
    return i.join("");
  }
  resolveActionLabel(t) {
    return this.config.getActionLabel ? this.config.getActionLabel(t) : Ut(t);
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && t.search && (e.value = t.search);
    for (const [i, s] of Object.entries(t.filters)) {
      const r = this.container?.querySelector(`[data-filter="${i}"]`);
      r && s && (r.value = s);
    }
  }
  bindEvents() {
    if (!this.container) return;
    const t = this.container.querySelector(".activity-view-timeline"), e = this.container.querySelector(".activity-view-table");
    t?.addEventListener("click", () => this.setViewMode("timeline")), e?.addEventListener("click", () => this.setViewMode("table")), this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (c) => {
      this.queryState.setSearch(c.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((c) => {
      c.addEventListener("change", () => {
        const o = c.dataset.filter;
        this.queryState.setFilter(o, c.value || void 0);
      });
    }), this.container.querySelectorAll('input[data-filter]:not([type="text"])').forEach((c) => {
      c.addEventListener("change", () => {
        const o = c.dataset.filter;
        this.queryState.setFilter(o, c.value || void 0);
      });
    });
    const i = this.container.querySelector('[data-filter="object_type"]'), s = this.container.querySelector('[data-filter="object_id"]');
    i?.addEventListener("change", () => {
      this.queryState.setFilter("object_type", i.value || void 0);
    }), s?.addEventListener("change", () => {
      this.queryState.setFilter("object_id", s.value || void 0);
    }), this.container.querySelector(".activity-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const r = this.container.querySelector(".activity-prev"), n = this.container.querySelector(".activity-next");
    r?.addEventListener("click", () => this.queryState.prevPage()), n?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderEntries() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), i = this.container?.querySelector(".activity-empty"), s = this.container?.querySelector(".activity-timeline-container"), r = this.container?.querySelector(".activity-table-container");
    if (this.state.entries.length === 0) {
      this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (i?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = Et({
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount(),
        containerClass: "bg-white rounded-lg border border-gray-200"
      }), E(t, () => {
        this.queryState.reset(), this.restoreFilterValues();
      }))) : (r?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = F(7, {
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount()
      }), E(e, () => {
        this.queryState.reset(), this.restoreFilterValues();
      })))) : (s?.classList.add("hidden"), r?.classList.add("hidden"), i?.classList.remove("hidden")), this.updateFilterSummary();
      return;
    }
    i?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = this.state.entries.map((n) => this.renderTimelineEntry(n)).join(""), this.bindEntryActions())) : (r?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = this.state.entries.map((n) => this.renderTableRow(n)).join(""), this.bindEntryActions())), this.updateFilterSummary();
  }
  renderTimelineEntry(t) {
    const e = N[t.status] || N.pending, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : O(t.provider_id), s = this.resolveActionLabel(t.action), r = I(t.created_at), n = f(t.created_at);
    return `
      <div class="activity-entry flex gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
           data-entry-id="${a(t.id)}">
        <!-- Status indicator -->
        <div class="flex-shrink-0">
          <div class="w-10 h-10 rounded-full ${e.bg} flex items-center justify-center">
            ${u(e.icon, {
      size: "20px",
      extraClass: e.text
    })}
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-900">
                ${a(s)}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-500">${a(i)}</span>
                ${t.channel ? `
                  <span class="text-gray-300">&middot;</span>
                  <span class="text-xs text-gray-500">${a(t.channel)}</span>
                ` : ""}
                ${t.object_type && t.object_id ? `
                  <span class="text-gray-300">&middot;</span>
                  <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
                     class="activity-object-link text-xs text-blue-600 hover:text-blue-700"
                     data-object-type="${a(t.object_type)}"
                     data-object-id="${a(t.object_id)}">
                    ${a(t.object_type)}:${a(m(t.object_id))}
                  </a>
                ` : ""}
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-500" title="${a(r)}">${n}</p>
              <div class="flex items-center gap-1 mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
                  ${a(t.scope_type)}
                </span>
              </div>
            </div>
          </div>

          <!-- Metadata preview -->
          ${Object.keys(t.metadata || {}).length > 0 ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <div class="text-xs text-gray-500 font-mono truncate">
                ${a(this.formatMetadataPreview(t.metadata))}
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
    const e = N[t.status] || N.pending, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : O(t.provider_id), s = this.resolveActionLabel(t.action), r = I(t.created_at), n = f(t.created_at);
    return `
      <tr class="activity-row hover:bg-gray-50 cursor-pointer" data-entry-id="${a(t.id)}">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="text-sm text-gray-900" title="${a(r)}">${n}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm font-medium text-gray-900">${a(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-700">${a(s)}</span>
        </td>
        <td class="px-4 py-3">
          ${t.object_type && t.object_id ? `
            <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
               class="activity-object-link text-sm text-blue-600 hover:text-blue-700"
               data-object-type="${a(t.object_type)}"
               data-object-id="${a(t.object_id)}">
              ${a(t.object_type)}:${a(m(t.object_id))}
            </a>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${a(t.scope_type)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-500">${a(t.channel || "—")}</span>
        </td>
      </tr>
    `;
  }
  bindEntryActions() {
    this.container?.querySelectorAll("[data-entry-id]")?.forEach((t) => {
      const e = t.dataset.entryId;
      e && t.addEventListener("click", (i) => {
        if (i.target.closest("a")) return;
        const s = this.getEntry(e);
        s && this.config.onSelect && this.config.onSelect(s);
      });
    }), this.container?.querySelectorAll(".activity-object-link")?.forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault(), e.stopPropagation();
        const i = t.dataset.objectType, s = t.dataset.objectId;
        if (!(!i || !s)) {
          if (this.config.onNavigate) {
            this.config.onNavigate(i, s);
            return;
          }
          this.config.useDeepLinks && this.createDeepLinkNavigateHandler()(i, s);
        }
      });
    });
  }
  createDeepLinkNavigateHandler() {
    return Kt(() => {
      const t = this.queryState.getState();
      return {
        filters: t.filters,
        search: t.search,
        page: t.page
      };
    }, () => this.state.viewMode);
  }
  buildObjectLinkUrl(t, e) {
    if (!this.config.useDeepLinks) return "#";
    const i = wt(t);
    if (!i) return "#";
    const s = this.queryState.getState();
    return Gt(i, e, {
      fromPage: window.location.pathname,
      filters: Object.fromEntries(Object.entries(s.filters).filter(([, r]) => r)),
      search: s.search || void 0,
      page: s.page > 1 ? s.page : void 0,
      viewMode: this.state.viewMode
    });
  }
  updateViewModeUI() {
    const t = this.container?.querySelector(".activity-view-timeline"), e = this.container?.querySelector(".activity-view-table");
    this.state.viewMode === "timeline" ? (t?.classList.add("bg-white", "text-gray-900", "shadow-sm"), t?.classList.remove("text-gray-600"), e?.classList.remove("bg-white", "text-gray-900", "shadow-sm"), e?.classList.add("text-gray-600")) : (e?.classList.add("bg-white", "text-gray-900", "shadow-sm"), e?.classList.remove("text-gray-600"), t?.classList.remove("bg-white", "text-gray-900", "shadow-sm"), t?.classList.add("text-gray-600"));
  }
  updateFilterSummary() {
    const t = this.container?.querySelector(".activity-filter-summary");
    if (!t) return;
    const e = this.queryState.getActiveFilterCount(), i = this.queryState.getState();
    if (e === 0 && !i.search) t.textContent = `${this.state.total} entries`;
    else {
      const s = [];
      i.search && s.push(`"${i.search}"`), e > 0 && s.push(`${e} filter${e > 1 ? "s" : ""}`), t.textContent = `${this.state.total} entries matching ${s.join(" and ")}`;
    }
  }
  renderError() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), i = this.container?.querySelector(".activity-timeline-container"), s = this.container?.querySelector(".activity-table-container");
    this.container?.querySelector(".activity-empty")?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), s?.classList.add("hidden"), t && (t.innerHTML = st({
      title: "Failed to load activity",
      error: this.state.error,
      containerClass: "bg-white rounded-lg border border-gray-200",
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity()))) : (s?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = z(7, {
      title: "Failed to load activity",
      error: this.state.error,
      showRetry: !0
    }), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity())));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = q({ resource: "activity" }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), i = this.container?.querySelector(".activity-timeline-container"), s = this.container?.querySelector(".activity-table-container"), r = this.container?.querySelector(".activity-empty");
    this.state.loading && (this.state.entries.length > 0 || (r?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), s?.classList.add("hidden"), t && (t.innerHTML = rt({ text: "Loading activity..." }))) : (s?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = B(7, { text: "Loading activity..." })))));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: i } = this.state, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, c = t > 1, o = this.container?.querySelector(".activity-info"), d = this.container?.querySelector(".activity-prev"), l = this.container?.querySelector(".activity-next");
    o && (o.textContent = i > 0 ? `Showing ${s}-${r} of ${i}` : "No activity"), d && (d.disabled = !c), l && (l.disabled = !n);
  }
  restoreViewMode() {
    const t = new URLSearchParams(window.location.search).get("view");
    if (t === "timeline" || t === "table") {
      this.state.viewMode = t;
      return;
    }
    try {
      const e = localStorage.getItem("services-activity-view");
      (e === "timeline" || e === "table") && (this.state.viewMode = e);
    } catch {
    }
  }
  saveViewMode() {
    try {
      localStorage.setItem("services-activity-view", this.state.viewMode);
    } catch {
    }
  }
  formatMetadataPreview(t) {
    return Object.entries(t).slice(0, 3).map(([e, i]) => `${e}: ${JSON.stringify(i)}`).join(", ");
  }
};
async function fi(t) {
  const e = new ce(t);
  return await e.init(), e;
}
var tt = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  expired: {
    label: "Expired",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "iconoir:clock"
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-gray-100",
    text: "text-gray-500",
    icon: "iconoir:cancel"
  },
  errored: {
    label: "Error",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  }
}, et = {
  queued: {
    label: "Queued",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "iconoir:clock"
  },
  running: {
    label: "Running",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "iconoir:play"
  },
  succeeded: {
    label: "Succeeded",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  failed: {
    label: "Failed",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  }
}, ft = {
  bootstrap: {
    label: "Bootstrap",
    description: "Full initial sync"
  },
  incremental: {
    label: "Incremental",
    description: "Delta changes only"
  },
  backfill: {
    label: "Backfill",
    description: "Historical data recovery"
  }
}, le = class {
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
    }, this.state.activeTab = this.config.activeTab || "subscriptions", this.client = t.apiClient || P(), this.queryState = new V({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadData()
      },
      filterFields: [
        "provider_id",
        "connection_id",
        "status"
      ],
      storageKey: "services-subscriptions-sync"
    });
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[SubscriptionsSyncPage] Container not found:", this.config.container);
      return;
    }
    if (!M()()) {
      this.renderForbidden();
      return;
    }
    this.restoreTab(), this.queryState.init(), this.renderStructure(), this.state.providers = await ot(this.client, {
      container: this.container,
      notifier: this.config.notifier,
      selectedProviderId: this.queryState.getState().filters.provider_id || "",
      getProviderName: this.config.getProviderName
    }), this.bindEvents(), await this.loadData();
  }
  async refresh() {
    await this.loadData();
  }
  setTab(t) {
    this.state.activeTab !== t && (this.state.activeTab = t, this.saveTab(), this.updateTabUI(), this.loadData());
  }
  getTab() {
    return this.state.activeTab;
  }
  getSubscriptions() {
    return [...this.state.subscriptions];
  }
  getSyncJobs() {
    return [...this.state.syncJobs];
  }
  destroy() {
    this.abortController = K(this.abortController, this.queryState);
  }
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
    }, i = await this.client.listSubscriptions(e, this.abortController.signal);
    this.state.subscriptions = i.subscriptions, this.state.subscriptionsTotal = i.total, this.queryState.updateFromResponse(i.total, i.has_next), this.renderSubscriptions(), this.updatePagination();
  }
  async loadSyncJobs(t) {
    const e = t.provider_id, i = t.connection_id, s = t.status, r = String(t.q || "").trim().toLowerCase(), n = t.page || 1, c = t.per_page || this.config.perPage || 25, o = await this.loadSyncConnections({
      providerId: e,
      connectionId: i,
      signal: this.abortController?.signal
    }), d = (await Promise.all(o.map(async (g) => {
      try {
        return {
          connection: g,
          summary: (await this.client.getSyncStatus(g.id, this.abortController?.signal)).sync_summary
        };
      } catch (p) {
        if (p.name === "AbortError") throw p;
        return null;
      }
    }))).filter((g) => g !== null).map((g) => this.toSyncJob(g.connection, g.summary)).filter((g) => g !== null).filter((g) => s && g.status !== s ? !1 : r ? this.matchesSyncSearch(g, r) : !0), l = d.length, h = (n - 1) * c, b = d.slice(h, h + c);
    this.state.syncJobs = b, this.state.syncJobsTotal = l, this.renderSyncJobs(), this.updatePagination();
  }
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
            ${u("iconoir:bell-off", {
      size: "24px",
      extraClass: "text-gray-400"
    })}
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
    return Object.entries(tt).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  renderSyncStatusOptions() {
    return Object.entries(et).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && (e.value = t.search || ""), this.container?.querySelectorAll("[data-filter]")?.forEach((i) => {
      const s = i.dataset.filter;
      s !== "search" && (i.value = t.filters[s] || "");
    });
  }
  bindEvents() {
    if (!this.container) return;
    const t = this.container.querySelector(".tab-subscriptions"), e = this.container.querySelector(".tab-sync");
    t?.addEventListener("click", () => this.setTab("subscriptions")), e?.addEventListener("click", () => this.setTab("sync")), this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (r) => {
      this.queryState.setSearch(r.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((r) => {
      r.addEventListener("change", () => {
        const n = r.dataset.filter;
        this.queryState.setFilter(n, r.value || void 0);
      });
    }), this.container.querySelector(".reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const i = this.container.querySelector(".prev-btn"), s = this.container.querySelector(".next-btn");
    i?.addEventListener("click", () => this.queryState.prevPage()), s?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderSubscriptions() {
    const t = this.container?.querySelector(".subscriptions-tbody"), e = this.container?.querySelector(".empty-state"), i = this.container?.querySelector(".subscriptions-content");
    if (t) {
      if (this.state.subscriptions.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = F(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), E(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("subscriptions"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.subscriptions.map((s) => this.renderSubscriptionRow(s)).join(""), this.bindSubscriptionActions();
    }
  }
  renderSubscriptionRow(t) {
    const e = tt[t.status] || tt.errored, i = x(t.provider_id, this.config.getProviderName), s = t.expires_at ? f(t.expires_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }) : "—", r = t.expires_at ? I(t.expires_at) : "", n = f(t.updated_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }), c = t.expires_at && this.isExpiringSoon(t.expires_at);
    return `
      <tr class="subscription-row hover:bg-gray-50 cursor-pointer" data-subscription-id="${a(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${a(i)}</span>
        </td>
        <td class="px-4 py-3">
          <div class="text-sm text-gray-700">${a(t.resource_type)}</div>
          <div class="text-xs text-gray-500" title="${a(t.resource_id)}">
            ${a(m(t.resource_id))}
          </div>
        </td>
        <td class="px-4 py-3">
          <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">${a(m(t.channel_id, 16))}</code>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="${c ? "text-amber-600 font-medium" : "text-gray-500"}" title="${r}">
            ${s}
          </span>
          ${c ? u("iconoir:warning-triangle", {
      size: "12px",
      extraClass: "inline ml-1 text-amber-500"
    }) : ""}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${n}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSubscriptionActions(t)}
        </td>
      </tr>
    `;
  }
  buildSubscriptionActions(t) {
    const e = [];
    return t.status === "active" && R()() && e.push(`
        <button type="button"
                class="action-renew p-1 text-gray-400 hover:text-blue-600"
                data-action="renew"
                title="Renew subscription">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status !== "cancelled" && R()() && e.push(`
        <button type="button"
                class="action-cancel p-1 text-gray-400 hover:text-red-600"
                data-action="cancel"
                title="Cancel subscription">
          ${u("iconoir:cancel", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindSubscriptionActions() {
    this.container?.querySelectorAll(".subscription-row")?.forEach((t) => {
      const e = t.dataset.subscriptionId;
      e && (t.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const s = this.state.subscriptions.find((r) => r.id === e);
        s && this.config.onSubscriptionSelect && this.config.onSubscriptionSelect(s);
      }), t.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (s) => {
          switch (s.stopPropagation(), i.dataset.action) {
            case "renew":
              await this.handleRenew(e, i);
              break;
            case "cancel":
              await this.handleCancel(e, i);
              break;
          }
        });
      }));
    });
  }
  renderSyncJobs() {
    const t = this.container?.querySelector(".sync-tbody"), e = this.container?.querySelector(".empty-state"), i = this.container?.querySelector(".sync-content");
    if (t) {
      if (this.state.syncJobs.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = F(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), E(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("sync"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.syncJobs.map((s) => this.renderSyncJobRow(s)).join(""), this.bindSyncJobActions();
    }
  }
  renderSyncJobRow(t) {
    const e = et[t.status] || et.failed, i = ft[t.mode] || ft.incremental, s = x(t.provider_id, this.config.getProviderName), r = t.metadata, n = typeof r.last_synced_at == "string" ? r.last_synced_at : "", c = n ? f(n, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }) : f(t.updated_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }), o = typeof r.last_sync_error == "string" ? r.last_sync_error : "", d = t.checkpoint || "";
    return `
      <tr class="sync-row hover:bg-gray-50 cursor-pointer" data-job-id="${a(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${a(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700" title="${i.description}">
            ${i.label}
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
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded" title="${a(d)}">
              ${a(m(d, 16))}
            </code>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-gray-500 text-sm">
          ${c}
        </td>
        <td class="px-4 py-3 text-xs">
          ${o ? `<span class="text-red-600" title="${a(o)}">${a(m(o, 48))}</span>` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSyncJobActions(t)}
        </td>
      </tr>
    `;
  }
  buildSyncJobActions(t) {
    const e = [];
    return t.status !== "running" && R()() && e.push(`
        <button type="button"
                class="action-run p-1 text-gray-400 hover:text-green-600"
                data-action="run"
                title="Run sync now">
          ${u("iconoir:play", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindSyncJobActions() {
    this.container?.querySelectorAll(".sync-row")?.forEach((t) => {
      const e = t.dataset.jobId;
      e && (t.addEventListener("click", (i) => {
        if (i.target.closest("button")) return;
        const s = this.state.syncJobs.find((r) => r.id === e);
        s && this.config.onSyncJobSelect && this.config.onSyncJobSelect(s);
      }), t.querySelectorAll("button[data-action]").forEach((i) => {
        i.addEventListener("click", async (s) => {
          s.stopPropagation(), i.dataset.action === "run" && await this.handleRunSync(e, i);
        });
      }));
    });
  }
  async handleRenew(t, e) {
    this.actionQueue.isInFlight(`renew-${t}`) || await this.actionQueue.execute(`renew-${t}`, async () => {
      await v({
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
    await G({
      action: "cancel",
      resourceType: "subscription"
    }) && (this.actionQueue.isInFlight(`cancel-${t}`) || await this.actionQueue.execute(`cancel-${t}`, async () => {
      await v({
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
    const i = this.state.syncJobs.find((c) => c.id === t);
    if (!i) return;
    const s = i.metadata, r = typeof s.run_resource_type == "string" && s.run_resource_type ? s.run_resource_type : "default", n = typeof s.run_resource_id == "string" && s.run_resource_id ? s.run_resource_id : "default";
    this.actionQueue.isInFlight(`sync-${t}`) || await this.actionQueue.execute(`sync-${t}`, async () => {
      await v({
        mutation: () => this.client.runSync(i.connection_id, {
          provider_id: i.provider_id,
          resource_type: r,
          resource_id: n
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
    const t = this.container?.querySelector(".tab-subscriptions"), e = this.container?.querySelector(".tab-sync"), i = this.container?.querySelector(".subscriptions-content"), s = this.container?.querySelector(".sync-content"), r = this.container?.querySelector('[data-filter="status"]');
    this.state.activeTab === "subscriptions" ? (t?.classList.add("border-blue-500", "text-blue-600"), t?.classList.remove("border-transparent", "text-gray-500"), e?.classList.remove("border-blue-500", "text-blue-600"), e?.classList.add("border-transparent", "text-gray-500"), i?.classList.remove("hidden"), s?.classList.add("hidden"), r && (r.innerHTML = `<option value="">All Statuses</option>${this.renderSubscriptionStatusOptions()}`, r.value = this.queryState.getState().filters.status || "")) : (e?.classList.add("border-blue-500", "text-blue-600"), e?.classList.remove("border-transparent", "text-gray-500"), t?.classList.remove("border-blue-500", "text-blue-600"), t?.classList.add("border-transparent", "text-gray-500"), s?.classList.remove("hidden"), i?.classList.add("hidden"), r && (r.innerHTML = `<option value="">All Statuses</option>${this.renderSyncStatusOptions()}`, r.value = this.queryState.getState().filters.status || "")), this.restoreFilterValues();
  }
  updateEmptyState(t) {
    const e = this.container?.querySelector(".empty-title"), i = this.container?.querySelector(".empty-message");
    t === "subscriptions" ? (e && (e.textContent = "No subscriptions found"), i && (i.textContent = "Subscriptions will appear here when created.")) : (e && (e.textContent = "No sync jobs found"), i && (i.textContent = "Sync jobs will appear here when syncs are triggered."));
  }
  renderError() {
    const t = this.state.activeTab === "subscriptions" ? ".subscriptions-content" : ".sync-content", e = this.container?.querySelector(t), i = this.container?.querySelector(".empty-state"), s = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody");
    s && (s.innerHTML = z(7, {
      title: `Failed to load ${this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs"}`,
      error: this.state.error,
      showRetry: !0
    }), e?.classList.remove("hidden"), i?.classList.add("hidden"), s.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadData()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = q({ resource: "subscriptions and sync" }));
  }
  updateLoadingState() {
    const t = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-content") : this.container?.querySelector(".sync-content"), e = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody"), i = this.container?.querySelector(".empty-state");
    if (!(!this.state.loading || !e) && (this.state.activeTab === "subscriptions" ? this.state.subscriptions : this.state.syncJobs).length === 0) {
      const r = this.state.activeTab === "subscriptions" ? "Loading subscriptions..." : "Loading sync jobs...";
      t?.classList.remove("hidden"), i?.classList.add("hidden"), e.innerHTML = B(7, { text: r });
    }
  }
  async loadSyncConnections(t) {
    const { providerId: e, connectionId: i, signal: s } = t;
    if (i) try {
      const r = await this.client.getConnectionDetail(i, s);
      return e && r.connection.provider_id !== e ? [] : [r.connection];
    } catch (r) {
      if (r.name === "AbortError") throw r;
      if (r instanceof nt && r.isNotFound) return [];
      throw r;
    }
    return (await this.client.listConnections({
      provider_id: e,
      page: 1,
      per_page: 200
    }, s)).connections;
  }
  toSyncJob(t, e) {
    const i = e.cursors[0], s = i?.resource_type || "default", r = i?.resource_id || "default", n = {
      ...e.last_job?.metadata || {},
      last_synced_at: e.last_synced_at || null,
      last_sync_error: e.last_sync_error || "",
      run_resource_type: s,
      run_resource_id: r
    };
    return e.last_job ? {
      ...e.last_job,
      checkpoint: e.last_cursor || e.last_job.checkpoint,
      metadata: n
    } : !e.last_cursor && !e.last_synced_at && !e.last_sync_error ? null : {
      id: `synthetic-sync-${t.id}`,
      connection_id: t.id,
      provider_id: t.provider_id,
      mode: "incremental",
      checkpoint: e.last_cursor || "",
      status: e.last_sync_error ? "failed" : "succeeded",
      attempts: 0,
      metadata: n,
      created_at: t.created_at,
      updated_at: e.last_synced_at || t.updated_at
    };
  }
  matchesSyncSearch(t, e) {
    const i = t.metadata;
    return [
      t.id,
      t.connection_id,
      t.provider_id,
      t.mode,
      t.status,
      t.checkpoint || "",
      typeof i.last_sync_error == "string" ? i.last_sync_error : ""
    ].join(" ").toLowerCase().includes(e);
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), i = this.state.activeTab === "subscriptions" ? this.state.subscriptionsTotal : this.state.syncJobsTotal, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, c = t > 1, o = this.container?.querySelector(".info"), d = this.container?.querySelector(".prev-btn"), l = this.container?.querySelector(".next-btn"), h = this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs";
    o && (o.textContent = i > 0 ? `Showing ${s}-${r} of ${i} ${h}` : `No ${h}`), d && (d.disabled = !c), l && (l.disabled = !n);
  }
  restoreTab() {
    const t = new URLSearchParams(window.location.search).get("tab");
    (t === "subscriptions" || t === "sync") && (this.state.activeTab = t);
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
    const i = /* @__PURE__ */ new Date(), s = e.getTime() - i.getTime();
    return s > 0 && s < 864e5;
  }
};
async function yi(t) {
  const e = new le(t);
  return await e.init(), e;
}
var yt = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check-circle"
  },
  disconnected: {
    label: "Disconnected",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "iconoir:cancel"
  },
  errored: {
    label: "Error",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "iconoir:warning-circle"
  },
  pending_reauth: {
    label: "Pending Reauth",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:clock"
  },
  needs_reconsent: {
    label: "Needs Reconsent",
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: "iconoir:refresh"
  }
}, de = {
  granted: {
    label: "Granted",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "iconoir:check"
  },
  requested: {
    label: "Requested",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "iconoir:clock"
  },
  missing: {
    label: "Missing",
    bg: "bg-gray-100",
    text: "text-gray-500",
    icon: "iconoir:minus"
  },
  capability_required: {
    label: "Required",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "iconoir:warning-triangle"
  }
}, ue = class {
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
    }, this.abortController = null, this.actionQueue = new J(), this.config = t, this.client = t.apiClient || P();
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ConnectionDetail] Container not found:", this.config.container);
      return;
    }
    if (!M()()) {
      this.renderForbidden();
      return;
    }
    await this.loadConnection();
  }
  async refresh() {
    await this.loadConnection();
  }
  getConnection() {
    return this.state.connection;
  }
  getGrantSnapshot() {
    return this.state.grantSnapshot;
  }
  async setConnectionId(t) {
    this.config.connectionId = t, await this.loadConnection();
  }
  destroy() {
    this.abortController?.abort();
  }
  async loadConnection() {
    if (this.container) {
      this.abortController?.abort(), this.abortController = new AbortController(), this.state.loading = !0, this.state.error = null, this.renderLoading();
      try {
        const [t, e, i] = await Promise.all([
          this.client.getConnectionDetail(this.config.connectionId, this.abortController.signal),
          this.client.getConnectionGrants(this.config.connectionId, this.abortController.signal),
          this.client.listProviders(this.abortController.signal)
        ]), s = t.connection;
        this.state.connection = s, this.state.grantSnapshot = e.snapshot, this.state.provider = i.providers.find((r) => r.id === s.provider_id) || null, this.state.credentialHealth = t.credential_health || null, this.state.rateLimitSummary = t.rate_limit_summary || null, this.render();
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load connection: ${this.state.error.message}`);
      } finally {
        this.state.loading = !1;
      }
    }
  }
  render() {
    if (!this.container || !this.state.connection) return;
    const t = this.state.connection, e = yt[t.status] || yt.disconnected, i = x(t.provider_id, this.config.getProviderName), s = this.buildGrantInfoList(), r = s.some((c) => c.status === "capability_required"), n = t.status === "needs_reconsent" || r;
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
              <h2 class="text-xl font-semibold text-gray-900">${a(i)}</h2>
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
                ${a(t.scope_type)}
              </span>
              <span class="text-sm text-gray-700" title="${a(t.scope_id)}">
                ${a(m(t.scope_id, 16))}
              </span>
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">External Account</dt>
            <dd class="mt-1 text-sm text-gray-700" title="${a(t.external_account_id)}">
              ${a(m(t.external_account_id, 20))}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${I(t.created_at)}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${I(t.updated_at)}
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
              <p class="text-sm text-red-700 mt-1">${a(t.last_error)}</p>
            </div>
          </div>
        ` : ""}

        ${n ? `
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
            ${St()() ? `
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
                  Version ${this.state.grantSnapshot.version} • Captured ${f(this.state.grantSnapshot.captured_at, {
      allowFuture: !0,
      futureImmediateLabel: "in a moment",
      pastImmediateLabel: "just now"
    })}
                </span>
              ` : ""}
            </div>
          </div>

          <div class="divide-y divide-gray-100">
            ${this.renderGrantMatrix(s)}
          </div>

          ${s.length === 0 ? `
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
          ${R()() && t.status === "active" ? `
            <button type="button"
                    class="refresh-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              ${u("iconoir:refresh", {
      size: "16px",
      extraClass: "mr-1.5"
    })}
              Refresh Credentials
            </button>
          ` : ""}
          ${at()() && t.status !== "disconnected" ? `
            <button type="button"
                    class="revoke-btn px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              ${u("iconoir:cancel", {
      size: "16px",
      extraClass: "mr-1.5"
    })}
              Revoke Connection
            </button>
          ` : ""}
        </div>
      </div>
    `, this.bindEvents();
  }
  renderGrantMatrix(t) {
    return t.length === 0 ? "" : t.map((e) => {
      const i = de[e.status], s = e.capabilities.length > 0 ? e.capabilities.map((r) => H(r)).join(", ") : null;
      return `
          <div class="grant-row flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-gray-700">${a(e.grant)}</code>
                ${e.isCapabilityRequired ? `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600" title="Required by capabilities">
                    ${u("iconoir:puzzle", {
        size: "10px",
        extraClass: "mr-0.5"
      })}
                    Required
                  </span>
                ` : ""}
              </div>
              ${s ? `
                <p class="text-xs text-gray-500 mt-0.5">
                  Used by: ${a(s)}
                </p>
              ` : ""}
            </div>
            <div class="flex-shrink-0">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${i.bg} ${i.text}">
                ${u(i.icon, { size: "12px" })}
                ${i.label}
              </span>
            </div>
          </div>
        `;
    }).join("");
  }
  renderCapabilities() {
    return !this.state.provider || !this.state.grantSnapshot ? "" : this.state.provider.capabilities.map((t) => {
      const e = new Set(this.state.grantSnapshot.granted_grants), i = t.required_grants.every((h) => e.has(h)), s = t.optional_grants.every((h) => e.has(h)), r = i && s, n = i && !s, c = !i;
      let o, d, l;
      return r ? (o = "Fully Enabled", d = "bg-green-100 text-green-700", l = "iconoir:check-circle") : n ? (o = "Partially Enabled", d = "bg-blue-100 text-blue-700", l = "iconoir:half-moon") : (o = t.denied_behavior === "block" ? "Blocked" : "Degraded", d = t.denied_behavior === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700", l = t.denied_behavior === "block" ? "iconoir:lock" : "iconoir:warning-triangle"), `
          <div class="capability-card border border-gray-200 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">${a(H(t.name))}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  ${t.required_grants.length} required, ${t.optional_grants.length} optional
                </p>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${d}">
                ${u(l, { size: "12px" })}
                ${o}
              </span>
            </div>
            ${c && t.denied_behavior === "block" ? `
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
    if (!t) return "";
    let e = "healthy", i = "Healthy", s = "bg-green-100 text-green-700 border-green-200", r = "iconoir:shield-check";
    if (!t.has_active_credential)
      e = "error", i = "No Active Credential", s = "bg-red-100 text-red-700 border-red-200", r = "iconoir:warning-circle";
    else if (t.last_error)
      e = "error", i = "Credential Error", s = "bg-red-100 text-red-700 border-red-200", r = "iconoir:warning-circle";
    else if (t.expires_at) {
      const n = new Date(t.expires_at), c = /* @__PURE__ */ new Date(), o = (n.getTime() - c.getTime()) / (1e3 * 60 * 60);
      o < 0 ? (e = "error", i = "Expired", s = "bg-red-100 text-red-700 border-red-200", r = "iconoir:clock") : o < 24 && (e = "warning", i = "Expiring Soon", s = "bg-amber-100 text-amber-700 border-amber-200", r = "iconoir:clock");
    }
    return `
      <div class="credential-health-panel bg-white rounded-lg border ${e === "healthy" ? "border-gray-200" : e === "warning" ? "border-amber-200" : "border-red-200"}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${u("iconoir:key", { size: "20px" })}
            Credential Health
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s}">
            ${u(r, { size: "12px" })}
            ${i}
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
              <span class="text-sm font-medium text-gray-900" title="${a(t.expires_at)}">
                ${f(t.expires_at, {
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
              <span class="text-sm font-medium text-gray-900" title="${a(t.last_refresh_at)}">
                ${f(t.last_refresh_at, {
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
              <span class="text-sm font-medium text-gray-900" title="${a(t.next_refresh_attempt_at)}">
                ${f(t.next_refresh_attempt_at, {
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
                ${u("iconoir:warning-circle", {
      size: "16px",
      extraClass: "text-red-500 mt-0.5 flex-shrink-0"
    })}
                <p class="text-sm text-red-700">${a(t.last_error)}</p>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  renderRateLimitPanel() {
    const t = this.state.rateLimitSummary;
    if (!t) return "";
    let e = "healthy", i = "Normal", s = "bg-green-100 text-green-700", r = "iconoir:check-circle";
    if (t.exhausted_buckets > 0) {
      const c = t.exhausted_buckets / Math.max(t.total_buckets, 1);
      c >= 1 ? (e = "exhausted", i = "All Limits Exhausted", s = "bg-red-100 text-red-700", r = "iconoir:warning-circle") : c >= 0.5 ? (e = "warning", i = "High Usage", s = "bg-amber-100 text-amber-700", r = "iconoir:warning-triangle") : (e = "warning", i = "Some Limits Hit", s = "bg-amber-100 text-amber-700", r = "iconoir:clock");
    }
    const n = t.total_buckets > 0 ? Math.round(t.exhausted_buckets / t.total_buckets * 100) : 0;
    return `
      <div class="rate-limit-panel bg-white rounded-lg border ${e === "healthy" ? "border-gray-200" : e === "warning" ? "border-amber-200" : "border-red-200"}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${u("iconoir:graph-up", { size: "20px" })}
            Rate Limits
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s}">
            ${u(r, { size: "12px" })}
            ${i}
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
              <div class="h-full transition-all duration-300 ${e === "healthy" ? "bg-green-500" : e === "warning" ? "bg-amber-500" : "bg-red-500"}" style="width: ${n}%"></div>
            </div>
          </div>

          ${t.next_reset_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Next Reset</span>
              <span class="text-sm font-medium text-gray-900" title="${a(t.next_reset_at)}">
                ${f(t.next_reset_at, {
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
                ${u("iconoir:warning-circle", {
      size: "16px",
      extraClass: "text-red-500 mt-0.5 flex-shrink-0"
    })}
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
    if (t < 60) return `${t}s`;
    if (t < 3600) return `${Math.floor(t / 60)}m`;
    const e = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60);
    return i > 0 ? `${e}h ${i}m` : `${e}h`;
  }
  bindEvents() {
    this.container && (this.container.querySelector(".back-btn")?.addEventListener("click", () => {
      this.config.onBack?.();
    }), this.container.querySelector(".reconsent-btn")?.addEventListener("click", () => this.handleReconsent()), this.container.querySelector(".refresh-btn")?.addEventListener("click", () => this.handleRefresh()), this.container.querySelector(".revoke-btn")?.addEventListener("click", () => this.handleRevoke()));
  }
  async handleReconsent() {
    if (!(!this.state.connection || this.state.reconsentInProgress)) {
      this.state.reconsentInProgress = !0, this.updateReconsentButtonState();
      try {
        const t = this.buildGrantInfoList().filter((i) => i.status === "capability_required").map((i) => i.grant), e = await this.client.beginReconsent(this.config.connectionId, { requested_grants: t.length > 0 ? t : void 0 });
        e.begin?.authorize_url && (this.config.onReconsentComplete?.(this.config.connectionId), window.location.href = e.begin.authorize_url);
      } catch (t) {
        this.config.notifier?.error(`Failed to start re-consent: ${t.message}`), this.state.reconsentInProgress = !1, this.updateReconsentButtonState();
      }
    }
  }
  async handleRefresh() {
    if (!this.state.connection) return;
    const t = this.container?.querySelector(".refresh-btn");
    this.actionQueue.isInFlight("refresh") || await this.actionQueue.execute("refresh", async () => {
      await v({
        mutation: () => this.client.refreshConnection(this.config.connectionId, { provider_id: this.state.connection.provider_id }),
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
    if (!this.state.connection || !await G({
      action: "revoke",
      resourceType: "connection",
      resourceName: this.config.getProviderName ? this.config.getProviderName(this.state.connection.provider_id) : O(this.state.connection.provider_id)
    })) return;
    const t = this.container?.querySelector(".revoke-btn");
    this.actionQueue.isInFlight("revoke") || await this.actionQueue.execute("revoke", async () => {
      await v({
        mutation: () => this.client.revokeConnection(this.config.connectionId),
        notifier: this.config.notifier,
        successMessage: "Connection revoked",
        errorMessagePrefix: "Failed to revoke",
        buttonConfig: t ? {
          button: t,
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
    this.container && (this.container.innerHTML = rt({
      text: "Loading connection details...",
      size: "lg"
    }));
  }
  renderError() {
    this.container && (this.container.innerHTML = st({
      title: "Failed to Load Connection",
      error: this.state.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnection()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = q({ resource: "connection details" }));
  }
  buildGrantInfoList() {
    const t = this.state.grantSnapshot, e = this.state.provider;
    if (!t) return [];
    const i = new Set(t.requested_grants), s = new Set(t.granted_grants), r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
    if (e) for (const l of e.capabilities) {
      for (const h of l.required_grants) {
        n.add(h);
        const b = r.get(h) || [];
        b.push(l.name), r.set(h, b);
      }
      for (const h of l.optional_grants) {
        const b = r.get(h) || [];
        b.push(l.name), r.set(h, b);
      }
    }
    const c = /* @__PURE__ */ new Set([
      ...t.requested_grants,
      ...t.granted_grants,
      ...n
    ]), o = [];
    for (const l of c) {
      const h = s.has(l), b = i.has(l), g = n.has(l);
      let p;
      h ? p = "granted" : b ? p = "requested" : g ? p = "capability_required" : p = "missing", o.push({
        grant: l,
        status: p,
        isRequired: b || g,
        isCapabilityRequired: g,
        capabilities: r.get(l) || []
      });
    }
    const d = {
      capability_required: 0,
      granted: 1,
      requested: 2,
      missing: 3
    };
    return o.sort((l, h) => d[l.status] - d[h.status]), o;
  }
};
async function mi(t) {
  const e = new ue(t);
  return await e.init(), e;
}
export {
  J as ActionQueue,
  ce as ActivityPageManager,
  me as CommandRuntimeController,
  ue as ConnectionDetailManager,
  ae as ConnectionsListManager,
  j as DEFAULT_ACTION_LABELS,
  di as ExtensionDiagnosticsPanel,
  Zt as FOCUSABLE_SELECTOR,
  oe as InstallationsListManager,
  Mt as MutationButtonManager,
  ne as ProvidersCatalogManager,
  V as QueryStateManager,
  xt as ServicesAPIClient,
  nt as ServicesAPIError,
  W as ServicesPermissionManager,
  C as ServicesPermissions,
  le as SubscriptionsSyncPageManager,
  Se as UIStateManager,
  ui as addStateSourceIndicator,
  ti as announceError,
  Ze as announceLoading,
  ei as announceNavigation,
  Xe as announceSuccess,
  Q as announceToScreenReader,
  E as bindNoResultsResetAction,
  Te as buildSearchParams,
  T as canConnect,
  R as canEdit,
  St as canReconsent,
  at as canRevoke,
  Rt as canViewActivity,
  M as canViewServices,
  it as clearRetryUI,
  Re as combineGuards,
  We as configureDeepLinks,
  G as confirmServiceAction,
  Ve as createActionLabelResolver,
  Kt as createActivityNavigateHandler,
  fi as createActivityPage,
  mi as createConnectionDetail,
  gi as createConnectionsList,
  Xt as createFocusTrap,
  bi as createInstallationsList,
  Qt as createNavigationContext,
  A as createPermissionGuard,
  pi as createProvidersCatalog,
  Le as createServicesClient,
  oi as createSkipLink,
  yi as createSubscriptionsSyncPage,
  ke as debounce,
  $ as deepLinkManager,
  K as destroyAbortableQueryPage,
  I as formatDateTime,
  O as formatProviderId,
  f as formatRelativeTime,
  H as formatServiceLabel,
  X as gateElement,
  Gt as generateDeepLink,
  Ge as generateListLink,
  Ue as getActionEntry,
  Ut as getActionLabel,
  Ot as getActionsByCategory,
  Oe as getAllActionLabels,
  li as getAnimationDuration,
  L as getPermissionManager,
  Nt as getServiceConfirmConfig,
  P as getServicesClient,
  Fe as handleForbidden,
  De as initActivityLabels,
  ye as initCommandRuntime,
  Me as initPermissionGates,
  qe as initPermissions,
  je as initPermissionsFromContext,
  ze as isActivityLabelsInitialized,
  Ft as isForbiddenError,
  ot as loadAndPopulateProviders,
  It as loadPermissionsFromContext,
  $t as loadProviders,
  wt as mapObjectTypeToEntity,
  Je as navigateBack,
  Jt as navigateToEntity,
  Qe as parseCurrentDeepLink,
  Ke as parseDeepLink,
  Ee as parseSearchParams,
  se as populateProviderFilterOptions,
  ee as prefersReducedMotion,
  Tt as renderEmptyState,
  st as renderErrorState,
  q as renderForbiddenState,
  rt as renderLoadingState,
  Et as renderNoResultsState,
  we as renderPanelLoadingState,
  $e as renderPanelState,
  jt as renderRetryUI,
  U as renderStateSourceIndicator,
  hi as renderStateSourceLegend,
  _e as renderTableEmptyState,
  z as renderTableErrorState,
  B as renderTableLoadingState,
  F as renderTableNoResultsState,
  Pe as requireAll,
  Ae as requireAny,
  Be as resetActivityLabels,
  x as resolveProviderDisplayName,
  He as setActionLabels,
  ii as setExpandedState,
  si as setLoadingState,
  ai as setProgress,
  Ce as setServicesClient,
  ni as setSortableHeader,
  ri as setStatusLabel,
  ci as setupDialogFocus,
  Yt as setupKeyboardNavigation,
  Ye as setupRovingTabindex,
  m as truncateId,
  Ne as withConfirmation,
  v as withMutationFeedback,
  Ie as withPermission
};

//# sourceMappingURL=services.js.map
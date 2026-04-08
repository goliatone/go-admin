import { escapeHTML as c } from "../shared/html.js";
import { t as u } from "./icon-renderer-a2WAOpSe.js";
import { t as At } from "./modal-C7iNT0ae.js";
import { t as jt } from "./toast-manager-DJ83v89f.js";
import { httpRequest as Dt, readHTTPJSONValue as Ut } from "../shared/transport/http-client.js";
import { extractStructuredError as ut, formatStructuredErrorForDisplay as ht, parseActionResponse as Ot } from "../toast/error-helpers.js";
import { a as at, d as V, f as F, i as q, n as Ht, o as Bt, r as ot, u as W } from "./ui-states-CskzQjWR.js";
var ct = class qt extends Error {
  constructor(e, i, s, r) {
    super(e), this.name = "ServicesAPIError", this.code = i, this.statusCode = s, this.details = r;
  }
  static fromResponse(e, i) {
    return new qt(i.message || i.error || "Unknown error", i.text_code || "UNKNOWN_ERROR", e, i.details);
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
}, L = {
  VIEW: "admin.services.view",
  CONNECT: "admin.services.connect",
  EDIT: "admin.services.edit",
  REVOKE: "admin.services.revoke",
  RECONSENT: "admin.services.reconsent",
  ACTIVITY_VIEW: "admin.services.activity.view",
  WEBHOOKS: "admin.services.webhooks"
}, zt = {
  basePath: "/admin/api/services",
  timeout: 3e4,
  headers: {}
};
function Vt() {
  return (typeof globalThis < "u" ? globalThis.location : void 0)?.origin || "http://localhost";
}
var Pt = class {
  constructor(t = {}) {
    this.abortControllers = /* @__PURE__ */ new Map(), this.config = {
      ...zt,
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
      const o = await this.fetchWithTimeout(s, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.config.headers
        },
        signal: r.signal
      }, t);
      return this.handleResponse(o);
    } finally {
      i && i.removeEventListener("abort", n), this.abortControllers.delete(t);
    }
  }
  async post(t, e, i, s) {
    const r = this.buildUrl(t), n = new AbortController();
    this.abortControllers.set(t, n);
    const o = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
      ...s
    };
    o["Idempotency-Key"] = i && i.trim() || this.createIdempotencyKey(t);
    try {
      const a = await this.fetchWithTimeout(r, {
        method: "POST",
        headers: o,
        body: JSON.stringify(e),
        signal: n.signal
      }, t);
      return this.handleResponse(a);
    } finally {
      this.abortControllers.delete(t);
    }
  }
  buildUrl(t, e = {}) {
    const i = this.config.basePath.replace(/\/$/, ""), s = new URL(`${i}${t}`, Vt());
    for (const [r, n] of Object.entries(e)) n != null && n !== "" && s.searchParams.set(r, String(n));
    return s.toString();
  }
  async fetchWithTimeout(t, e, i) {
    const s = setTimeout(() => {
      this.abortControllers.get(i)?.abort();
    }, this.config.timeout);
    try {
      return await Dt(t, e);
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
      const i = ct.fromResponse(t.status, e);
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
}, O = null;
function P() {
  return O || (O = new Pt()), O;
}
function ze(t) {
  O = t;
}
function Ve(t = {}) {
  return new Pt(t);
}
var Wt = {
  defaultPage: 1,
  defaultPerPage: 25,
  searchDelay: 300,
  useReplaceState: !1
};
function X() {
  if (typeof window < "u") return window;
}
function pt() {
  if (!(typeof globalThis > "u"))
    return globalThis.localStorage;
}
var G = class {
  constructor(t = {}) {
    this.searchTimeout = null, this.initialized = !1, this.config = {
      ...Wt,
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
    const t = X();
    if (!t?.location) return;
    const e = new URLSearchParams(t.location.search), i = e.get("page");
    if (i) {
      const a = parseInt(i, 10);
      !Number.isNaN(a) && a > 0 && (this.state.page = a);
    }
    const s = e.get("per_page");
    if (s) {
      const a = parseInt(s, 10);
      !Number.isNaN(a) && a > 0 && (this.state.per_page = a);
    }
    const r = e.get("q") || e.get("search");
    r && (this.state.search = r);
    const n = e.get("sort_field"), o = e.get("sort_order");
    n && (this.state.sort_field = n, this.state.sort_order = o === "desc" ? "desc" : "asc");
    for (const a of this.filterFields) {
      const l = e.get(String(a));
      l !== null && (this.dateFields.has(a) ? this.state.filters[a] = this.toLocalInput(l) : this.state.filters[a] = l);
    }
  }
  restoreFromStorage() {
    if (!this.storageKey) return;
    const t = pt(), e = X();
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
    const t = pt();
    if (t)
      try {
        t.setItem(this.storageKey, JSON.stringify({ per_page: this.state.per_page }));
      } catch (e) {
        console.warn("[QueryStateManager] Failed to save to localStorage:", e);
      }
  }
  syncToURL() {
    const t = X();
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
function We(t, e) {
  let i = null;
  return Object.assign(((...n) => {
    i && clearTimeout(i), i = setTimeout(() => {
      t(...n), i = null;
    }, e);
  }), { cancel: () => {
    i && (clearTimeout(i), i = null);
  } });
}
function Ge(t, e) {
  if (!("filters" in t)) {
    const o = t, a = new URLSearchParams();
    for (const [l, d] of Object.entries(o)) d != null && d !== "" && a.set(l, String(d));
    return a;
  }
  const i = t, s = new URLSearchParams(), { includePage: r = !0, includeDefaults: n = !1 } = e || {};
  r && (i.page > 1 || n) && s.set("page", String(i.page)), (i.per_page !== 25 || n) && s.set("per_page", String(i.per_page)), i.search && s.set("q", i.search), i.sort_field && (s.set("sort_field", i.sort_field), i.sort_order && s.set("sort_order", i.sort_order));
  for (const [o, a] of Object.entries(i.filters)) a != null && a !== "" && s.set(o, a);
  return s;
}
function Je(t, e, i) {
  if (!i) {
    const l = {};
    for (const d of e) {
      const h = t.get(String(d));
      h !== null && (l[String(d)] = h);
    }
    for (const d of [
      "page",
      "per_page",
      "q",
      "search",
      "sort_field",
      "sort_order"
    ]) {
      const h = t.get(d);
      h !== null && (l[d] = h);
    }
    return l;
  }
  const s = {
    page: i?.page ?? 1,
    per_page: i?.per_page ?? 25,
    search: i?.search ?? "",
    filters: {},
    ...i
  }, r = t.get("page");
  if (r) {
    const l = parseInt(r, 10);
    Number.isNaN(l) || (s.page = Math.max(1, l));
  }
  const n = t.get("per_page");
  if (n) {
    const l = parseInt(n, 10);
    Number.isNaN(l) || (s.per_page = Math.max(1, l));
  }
  const o = t.get("q") || t.get("search");
  o && (s.search = o);
  const a = t.get("sort_field");
  a && (s.sort_field = a, s.sort_order = t.get("sort_order") === "desc" ? "desc" : "asc");
  for (const l of e) {
    const d = t.get(String(l));
    d !== null && (s.filters[l] = d);
  }
  return s;
}
var J = class {
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
}, tt = null;
function k() {
  return tt || (tt = new J()), tt;
}
function Qe(t) {
  k().init(t);
}
function R(t, e) {
  return (i) => {
    const s = i instanceof J ? i : e || k(), r = Array.isArray(t) ? t : [t];
    return () => s.hasAll(r);
  };
}
function Ke(t, e) {
  return (i) => {
    const s = i instanceof J ? i : e || k();
    return () => s.hasAll(t);
  };
}
function Ye(t, e) {
  return (i) => {
    const s = i instanceof J ? i : e || k();
    return () => s.hasAny(t);
  };
}
function Ze(...t) {
  const e = t.flatMap((i) => Array.isArray(i) ? i : [i]);
  return (i) => () => e.every((s) => s(i)());
}
function j(t) {
  return R(L.VIEW, t)();
}
function E(t) {
  return R(L.CONNECT, t)();
}
function I(t) {
  return R(L.EDIT, t)();
}
function lt(t) {
  return R(L.REVOKE, t)();
}
function Rt(t) {
  return R(L.RECONSENT, t)();
}
function Gt(t) {
  return R(L.ACTIVITY_VIEW, t)();
}
function Jt(t) {
  if (t instanceof ct) return t.isForbidden;
  if (!t || typeof t != "object") return !1;
  const e = t;
  return e.isForbidden === !0 || e.statusCode === 403 || e.code === "FORBIDDEN";
}
function Xe(t, e) {
  return Jt(t) ? (e(t), !0) : !1;
}
function ti(t, e, i, s) {
  const r = s || k();
  return async () => {
    if (!r.has(t)) {
      i?.();
      return;
    }
    return e();
  };
}
function et(t, e, i) {
  const s = i || k(), { requires: r = [], requiresAny: n = [], onDenied: o, disableOnDenied: a } = e;
  let l = !0, d = [];
  r.length > 0 ? (d = s.getMissing(r), l = d.length === 0) : n.length > 0 && (l = s.hasAny(n), l || (d = n)), l || (a ? ((t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0), t.classList.add("permission-denied", "opacity-50", "cursor-not-allowed"), t.setAttribute("title", `Permission required: ${d.join(", ")}`)) : (t.style.display = "none", t.classList.add("permission-hidden")), e.deniedContent && (typeof e.deniedContent == "string" ? t.outerHTML = e.deniedContent : t.replaceWith(e.deniedContent)), o?.(d));
}
function ei(t = document.body, e) {
  t.querySelectorAll("[data-permission-requires]").forEach((i) => {
    const s = i.dataset.permissionRequires?.split(",").map((r) => r.trim());
    s && s.length > 0 && et(i, { requires: s }, e);
  }), t.querySelectorAll("[data-permission-requires-any]").forEach((i) => {
    const s = i.dataset.permissionRequiresAny?.split(",").map((r) => r.trim());
    s && s.length > 0 && et(i, { requiresAny: s }, e);
  }), t.querySelectorAll("[data-permission-disable]").forEach((i) => {
    const s = i.dataset.permissionDisable?.split(",").map((r) => r.trim());
    s && s.length > 0 && et(i, {
      requires: s,
      disableOnDenied: !0
    }, e);
  });
}
function Qt() {
  if (typeof window > "u" || typeof document > "u") return [];
  const t = window.__permissions;
  if (Array.isArray(t)) return t.filter((i) => Object.values(L).includes(i));
  const e = document.body.dataset.permissions;
  if (e) try {
    const i = JSON.parse(e);
    if (Array.isArray(i)) return i.filter((s) => Object.values(L).includes(s));
  } catch {
  }
  return [];
}
function ii() {
  const t = Qt(), e = k();
  return e.init(t), e;
}
var Kt = class {
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
  getState() {
    return this.state;
  }
  setLoading() {
    this.clearFeedbackTimeout(), this.state = "loading", this.config.disableOnLoading && (this.button.disabled = !0), this.button.classList.add("mutation-loading"), this.button.classList.remove("mutation-success", "mutation-error");
    const t = this.config.showSpinner ? `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>` : "";
    this.button.innerHTML = `${t}<span>${c(this.config.loadingText)}</span>`;
  }
  setSuccess() {
    this.clearFeedbackTimeout(), this.state = "success", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-error"), this.button.classList.add("mutation-success"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${c(this.config.successText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  setError() {
    this.clearFeedbackTimeout(), this.state = "error", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success"), this.button.classList.add("mutation-error"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>${c(this.config.errorText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  reset() {
    this.clearFeedbackTimeout(), this.state = "idle", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success", "mutation-error"), this.button.innerHTML = this.originalHTML;
  }
  destroy() {
    this.clearFeedbackTimeout(), this.reset();
  }
  clearFeedbackTimeout() {
    this.feedbackTimeout && (clearTimeout(this.feedbackTimeout), this.feedbackTimeout = null);
  }
};
async function x(t) {
  const { mutation: e, notifier: i, successMessage: s, errorMessagePrefix: r = "Operation failed", buttonConfig: n, onSuccess: o, onError: a, showInlineRetry: l = !1, retryContainer: d } = t, h = n ? new Kt(n) : null;
  try {
    h?.setLoading();
    const f = await e();
    if (h?.setSuccess(), i && s) {
      const g = typeof s == "function" ? s(f) : s;
      i.success(g);
    }
    return d && rt(d), await o?.(f), {
      success: !0,
      result: f
    };
  } catch (f) {
    const g = f instanceof Error ? f : new Error(String(f));
    return h?.setError(), i && i.error(`${r}: ${g.message}`), l && d && Yt({
      container: d,
      action: () => x(t).then(() => {
      }),
      errorMessage: `${r}: ${g.message}`,
      onDismiss: () => rt(d)
    }), a?.(g), {
      success: !1,
      error: g
    };
  }
}
async function si(t) {
  const { confirmMessage: e, confirmOptions: i, ...s } = t;
  return await At.confirm(e, {
    title: i?.title ?? "Confirm Action",
    confirmText: i?.confirmText ?? "Confirm",
    cancelText: i?.cancelText ?? "Cancel",
    confirmVariant: i?.variant ?? "primary"
  }) ? {
    ...await x(s),
    cancelled: !1
  } : {
    success: !1,
    cancelled: !0
  };
}
function Yt(t) {
  const { container: e, action: i, errorMessage: s, retryText: r = "Retry", dismissText: n = "Dismiss", onDismiss: o } = t;
  e.innerHTML = `
    <div class="mutation-retry-ui flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div class="flex-shrink-0 text-red-500" aria-hidden="true">
        ${u("iconoir:warning-triangle", { size: "20px" })}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-red-700">${c(s)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button"
                  class="mutation-retry-btn px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors">
            ${c(r)}
          </button>
          <button type="button"
                  class="mutation-dismiss-btn px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
            ${c(n)}
          </button>
        </div>
      </div>
    </div>
  `;
  const a = e.querySelector(".mutation-retry-btn"), l = e.querySelector(".mutation-dismiss-btn");
  a?.addEventListener("click", async () => {
    const d = a, h = d.textContent;
    d.disabled = !0, d.innerHTML = `
      <svg class="animate-spin h-3 w-3 inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Retrying...
    `;
    try {
      await i();
    } finally {
      d.disabled = !1, d.textContent = h;
    }
  }), l?.addEventListener("click", () => {
    rt(e), o?.();
  });
}
function rt(t) {
  t.querySelector(".mutation-retry-ui")?.remove();
}
function Zt(t) {
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
  }, o = {
    connection: "connection",
    installation: "installation",
    subscription: "subscription",
    sync: "sync job"
  }, a = n[e] || {
    verb: e,
    noun: e,
    variant: "primary"
  }, l = o[i] || i;
  let d = `Are you sure you want to ${a.verb} this ${l}`;
  return s && (d += ` (${s})`), d += "?", r && (d += ` ${r}`), a.variant === "danger" && (d += " This action cannot be undone."), {
    message: d,
    options: {
      title: `${a.noun} ${l.charAt(0).toUpperCase() + l.slice(1)}`,
      confirmText: a.noun,
      cancelText: "Cancel",
      variant: a.variant
    }
  };
}
async function Q(t) {
  const { message: e, options: i } = Zt(t);
  return At.confirm(e, i);
}
var K = class {
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
}, D = {
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
}, Xt = class {
  constructor() {
    this.backendLabels = {}, this.initialized = !1, this.fallbackFormatter = gt;
  }
  init(t = {}) {
    t.labels && (this.backendLabels = { ...t.labels }), t.fallbackFormatter && (this.fallbackFormatter = t.fallbackFormatter), this.initialized = !0;
  }
  isInitialized() {
    return this.initialized;
  }
  getLabel(t) {
    if (this.backendLabels[t]) return this.backendLabels[t];
    const e = D[t];
    return e ? e.label : this.fallbackFormatter(t);
  }
  getEntry(t) {
    const e = D[t];
    return e ? {
      ...e,
      label: this.backendLabels[t] || e.label
    } : null;
  }
  getAllLabels() {
    const t = {};
    for (const [e, i] of Object.entries(D)) t[e] = i.label;
    for (const [e, i] of Object.entries(this.backendLabels)) t[e] = i;
    return t;
  }
  getActionsByCategory() {
    const t = {};
    for (const e of Object.values(D)) {
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
    this.backendLabels = {}, this.fallbackFormatter = gt, this.initialized = !1;
  }
}, $ = new Xt();
function ri(t = {}) {
  $.init(t);
}
function te(t) {
  return $.getLabel(t);
}
function ni(t) {
  return $.getEntry(t);
}
function ai() {
  return $.getAllLabels();
}
function ee() {
  return $.getActionsByCategory();
}
function oi(t) {
  $.setLabels(t);
}
function ci() {
  return $.isInitialized();
}
function li() {
  $.reset();
}
function di(t = {}) {
  return (e) => t[e] ? t[e] : $.getLabel(e);
}
function gt(t) {
  return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
var ie = "/admin/services", se = {
  connection: "connections",
  installation: "installations",
  subscription: "subscriptions",
  sync: "sync",
  provider: "providers",
  activity: "activity"
};
function T() {
  if (typeof window < "u") return window;
}
function ft() {
  if (!(typeof globalThis > "u"))
    return globalThis.sessionStorage;
}
function re(t) {
  const e = T();
  if (e && typeof e.btoa == "function") return e.btoa(t);
  const i = globalThis.Buffer;
  if (i) return i.from(t, "utf8").toString("base64");
  throw new Error("base64 encoding is unavailable");
}
function ne(t) {
  const e = T();
  if (e && typeof e.atob == "function") return e.atob(t);
  const i = globalThis.Buffer;
  if (i) return i.from(t, "base64").toString("utf8");
  throw new Error("base64 decoding is unavailable");
}
var ae = class {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || ie, this.pathMap = {
      ...se,
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
      for (const [n, o] of Object.entries(e)) o && r.set(n, o);
      s += `?${r.toString()}`;
    }
    return s;
  }
  navigateTo(t, e, i, s = {}) {
    const r = T();
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
    const t = T();
    if (!t?.history) return this.restoreContext();
    const e = this.restoreContext();
    if (e?.fromPage) {
      const i = new URLSearchParams();
      if (e.filters)
        for (const [n, o] of Object.entries(e.filters)) o && i.set(n, o);
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
    const t = T();
    return t?.location ? this.parseUrl(t.location.pathname + t.location.search) : null;
  }
  parseUrl(t) {
    const [e, i] = t.split("?"), s = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (s.length < 2) return null;
    const r = s[0], n = decodeURIComponent(s[1]);
    let o = null;
    for (const [l, d] of Object.entries(this.pathMap)) if (d === r) {
      o = l;
      break;
    }
    if (!o) return null;
    let a;
    if (i) {
      const l = new URLSearchParams(i).get("ctx");
      l && (a = this.decodeContext(l));
    }
    return {
      entityType: o,
      entityId: n,
      context: a
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
      fromPage: T()?.location?.pathname,
      filters: Object.keys(i).length > 0 ? i : void 0,
      search: t.search || void 0,
      page: t.page > 1 ? t.page : void 0,
      viewMode: e
    };
  }
  saveContext(t) {
    const e = ft();
    if (e)
      try {
        e.setItem(this.contextStorageKey, JSON.stringify(t));
      } catch {
      }
  }
  restoreContext() {
    const t = ft();
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
      return re(JSON.stringify(t));
    } catch {
      return "";
    }
  }
  decodeContext(t) {
    try {
      return JSON.parse(ne(t));
    } catch {
      return;
    }
  }
}, _ = new ae();
function ui(t) {
  _.configure(t);
}
function oe(t, e, i) {
  return _.generateLink(t, e, i);
}
function hi(t, e) {
  return _.generateListLink(t, e);
}
function ce(t, e, i, s) {
  _.navigateTo(t, e, i, s);
}
function pi() {
  return _.navigateBack();
}
function gi() {
  return _.parseCurrentUrl();
}
function fi(t) {
  return _.parseUrl(t);
}
function It(t) {
  return _.mapObjectTypeToEntity(t);
}
function le(t, e) {
  return _.createContextFromQueryState(t, e);
}
function de(t, e) {
  return (i, s) => {
    const r = It(i);
    if (!r) {
      console.warn(`[DeepLinks] Unknown object type: ${i}`);
      return;
    }
    ce(r, s, le(t(), e?.()));
  };
}
function ue(t) {
  const { container: e, selector: i, onSelect: s, onFocus: r, onEscape: n, wrap: o = !0, autoFocus: a = !1, keyHandlers: l = {} } = t;
  function d() {
    return Array.from(e.querySelectorAll(i));
  }
  function h(p) {
    const y = d();
    if (y.length === 0) return;
    let w = p;
    o ? w = (p % y.length + y.length) % y.length : w = Math.max(0, Math.min(p, y.length - 1)), y.forEach((Ft, Nt) => {
      Ft.setAttribute("tabindex", Nt === w ? "0" : "-1");
    });
    const C = y[w];
    C.focus(), r?.(C, w);
  }
  function f(p) {
    const y = d();
    if (y.length === 0) return;
    const w = p.target, C = y.indexOf(w);
    if (C !== -1) {
      if (l[p.key]) {
        l[p.key](p, w, C);
        return;
      }
      switch (p.key) {
        case "ArrowDown":
        case "ArrowRight":
          p.preventDefault(), h(C + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          p.preventDefault(), h(C - 1);
          break;
        case "Home":
          p.preventDefault(), h(0);
          break;
        case "End":
          p.preventDefault(), h(y.length - 1);
          break;
        case "Enter":
        case " ":
          p.preventDefault(), s?.(w, C);
          break;
        case "Escape":
          p.preventDefault(), n?.();
          break;
      }
    }
  }
  const g = d();
  return g.forEach((p, y) => {
    p.setAttribute("tabindex", y === 0 ? "0" : "-1"), p.hasAttribute("role") || p.setAttribute("role", "option");
  }), e.hasAttribute("role") || e.setAttribute("role", "listbox"), e.addEventListener("keydown", f), a && g.length > 0 && h(0), () => {
    e.removeEventListener("keydown", f);
  };
}
function bi(t, e) {
  return ue({
    container: t,
    selector: e,
    wrap: !0,
    onSelect: (i) => {
      i.click();
    }
  });
}
var he = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function pe(t) {
  const { container: e, initialFocus: i, returnFocus: s, onEscape: r } = t, n = document.activeElement;
  function o() {
    return Array.from(e.querySelectorAll(he));
  }
  function a(l) {
    if (l.key === "Escape") {
      l.preventDefault(), r?.();
      return;
    }
    if (l.key !== "Tab") return;
    const d = o();
    if (d.length === 0) return;
    const h = d[0], f = d[d.length - 1];
    l.shiftKey ? document.activeElement === h && (l.preventDefault(), f.focus()) : document.activeElement === f && (l.preventDefault(), h.focus());
  }
  return requestAnimationFrame(() => {
    i ? (typeof i == "string" ? e.querySelector(i) : i)?.focus() : o()[0]?.focus();
  }), e.addEventListener("keydown", a), e.hasAttribute("role") || e.setAttribute("role", "dialog"), e.setAttribute("aria-modal", "true"), () => {
    e.removeEventListener("keydown", a), e.removeAttribute("aria-modal"), (s || n)?.focus?.();
  };
}
function ge(t) {
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
function Y(t, e = {}) {
  const { priority: i = "polite", clear: s = !0 } = e, r = ge(i);
  s && (r.textContent = ""), setTimeout(() => {
    r.textContent = t;
  }, 100);
}
function yi(t) {
  Y(`Loading ${t}...`, { priority: "polite" });
}
function mi(t) {
  Y(t, { priority: "polite" });
}
function vi(t) {
  Y(`Error: ${t}`, { priority: "assertive" });
}
function xi(t) {
  Y(`Navigating to ${t}`, { priority: "polite" });
}
function Si(t, e, i) {
  t.setAttribute("aria-expanded", String(i));
  const s = typeof e == "string" ? e : e.id;
  s && t.setAttribute("aria-controls", s);
}
function wi(t, e) {
  t.setAttribute("aria-busy", String(e)), e ? t.setAttribute("aria-describedby", "loading-indicator") : t.removeAttribute("aria-describedby");
}
function $i(t, e, i) {
  t.setAttribute("role", "status"), t.setAttribute("aria-label", `Status: ${i}`);
}
function _i(t, e) {
  t.setAttribute("aria-sort", e), t.setAttribute("role", "columnheader");
}
function Ci(t, e, i = 100, s) {
  t.setAttribute("role", "progressbar"), t.setAttribute("aria-valuenow", String(e)), t.setAttribute("aria-valuemin", "0"), t.setAttribute("aria-valuemax", String(i)), s && t.setAttribute("aria-label", s);
}
function Li(t, e = "Skip to main content") {
  const i = document.createElement("a");
  return i.href = `#${t}`, i.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg", i.textContent = e, i;
}
function ki(t, e = {}) {
  const { title: i, describedBy: s, onClose: r } = e;
  if (t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), i) {
    const o = `dialog-title-${Date.now()}`, a = t.querySelector('h1, h2, h3, [role="heading"]');
    a && (a.id = o, t.setAttribute("aria-labelledby", o));
  }
  s && t.setAttribute("aria-describedby", s);
  const n = pe({
    container: t,
    onEscape: r
  });
  return () => {
    n(), t.removeAttribute("aria-modal"), t.removeAttribute("aria-labelledby"), t.removeAttribute("aria-describedby");
  };
}
function fe() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function Ti(t) {
  return fe() ? 0 : t;
}
var bt = {
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
}, be = {
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
}, Ei = class {
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
              Runtime v${c(this.state.runtimeVersion)} &middot;
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
      const n = bt[s];
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
    const t = this.state.configHealth, e = be[t.status];
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
    const e = bt[t.status];
    return `
      <div class="pack-row px-4 py-3 hover:bg-gray-50 cursor-pointer" data-pack-id="${c(t.id)}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${c(t.name)}</span>
              <span class="text-xs text-gray-400">v${c(t.version)}</span>
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
              <span class="text-xs text-red-600 truncate max-w-48" title="${c(t.lastError)}">
                ${c(t.lastError.slice(0, 50))}${t.lastError.length > 50 ? "..." : ""}
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
              <span class="text-sm font-medium text-gray-900">${c(t.name)}</span>
              <span class="text-xs text-gray-400">from ${c(t.sourcePack)}</span>
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
      <div class="error-row px-4 py-3 hover:bg-red-50 cursor-pointer" data-error-id="${c(t.id)}">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            ${u("iconoir:warning-circle", {
      size: "16px",
      extraClass: "text-red-500"
    })}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-red-800">${c(t.type)}</span>
              <span class="text-xs text-gray-400">from ${c(t.packId)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-0.5">${c(t.message)}</p>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>${this.formatTime(t.occurredAt)}</span>
              ${t.relatedEntity ? `
                <span>${c(t.relatedEntity.type)}:${c(t.relatedEntity.id)}</span>
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
        <p class="text-sm text-gray-500">${c(t)}</p>
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
function H(t) {
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
            title="${c(n.description)}${r ? ` - ${r}` : ""}"
            aria-label="${c(n.description)}">
        ${u(n.icon, {
    size: "14px",
    extraClass: n.text
  })}
      </span>
    ` : `
    <span class="state-source-indicator inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${n.bg} ${n.text}"
          title="${c(n.description)}${r ? ` - ${r}` : ""}"
          role="note"
          aria-label="State source: ${c(n.description)}">
      ${u(n.icon, { size: "12px" })}
      <span>${c(n.label)}</span>
    </span>
  `;
}
function Ai(t, e) {
  const i = document.createElement("span");
  i.innerHTML = H(e), t.appendChild(i.firstElementChild);
}
function qi() {
  return `
    <div class="state-source-legend p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">State Source Legend</h4>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          ${H({ source: "go-services" })}
          <span class="text-sm text-gray-600">Data managed by go-services core runtime</span>
        </div>
        <div class="flex items-center gap-3">
          ${H({
    source: "downstream",
    packName: "Extension"
  })}
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
function ye() {
  const t = globalThis.window;
  return t?.toastManager ? t.toastManager : new jt();
}
function m(t) {
  return String(t || "").trim();
}
function me(t) {
  return t.replace(/[A-Z]/g, (e) => `-${e.toLowerCase()}`).replace(/^-+/, "");
}
function ve(t) {
  return me(t).replace(/-/g, "_");
}
function yt(t) {
  return String(t || "").split(",").map((e) => e.trim()).filter(Boolean);
}
function nt(t) {
  return String(t || "").trim().toLowerCase() || void 0;
}
function xe() {
  const t = globalThis.crypto;
  return t?.randomUUID ? t.randomUUID() : `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function Se(t) {
  const e = String(t.correlation_id || "").trim();
  if (e) return e;
  const i = xe();
  return t.correlation_id = i, i;
}
function M(t, e) {
  if (t && typeof t == "object") {
    const i = t;
    if (typeof i.message == "string") return {
      textCode: typeof i.textCode == "string" ? i.textCode : null,
      message: i.message || e,
      metadata: i.metadata && typeof i.metadata == "object" ? i.metadata : null,
      fields: i.fields && typeof i.fields == "object" ? i.fields : null,
      validationErrors: Array.isArray(i.validationErrors) ? i.validationErrors : null
    };
  }
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
function mt(t, e) {
  if (!t || typeof t != "object") return {
    success: !1,
    error: M(null, e)
  };
  const i = Ot(t);
  return i.success ? {
    success: !0,
    data: i.data
  } : {
    success: !1,
    error: i.error || M(null, e)
  };
}
async function vt(t) {
  return Ut(t, null);
}
function xt(t) {
  const e = {};
  for (const i of Array.from(t.attributes)) {
    if (!i.name.startsWith("data-command-payload-")) continue;
    const s = ve(i.name.slice(21));
    e[s] = i.value;
  }
  return e;
}
function we(t, e, i) {
  if (e) {
    if (typeof i == "string") {
      const s = i.trim();
      if (!s) return;
      if (t[e] === void 0) {
        t[e] = s;
        return;
      }
      if (Array.isArray(t[e])) {
        t[e].push(s);
        return;
      }
      t[e] = [t[e], s];
      return;
    }
    t[e] = i;
  }
}
function $e(t) {
  if (!t) return {};
  const e = {};
  return new FormData(t).forEach((i, s) => {
    we(e, s, i);
  }), e;
}
function St(t) {
  const e = m(t.dataset.commandBusyTarget);
  if (e) return document.querySelector(e);
  const i = m(t.dataset.commandBusyClosest);
  return i ? t.closest(i) : null;
}
function wt(t, e) {
  t && ((t instanceof HTMLButtonElement || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) && (t.disabled = e), e ? t.setAttribute("aria-busy", "true") : t.removeAttribute("aria-busy"));
}
function $t(t, e) {
  t && (e ? t.setAttribute("aria-busy", "true") : t.removeAttribute("aria-busy"), t.querySelectorAll("button").forEach((i) => {
    i.disabled = e, e ? i.setAttribute("aria-busy", "true") : i.removeAttribute("aria-busy");
  }));
}
function _e(t) {
  const e = /* @__PURE__ */ new Map();
  return t.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((i) => {
    const s = m(i.getAttribute("aria-controls") || void 0);
    s && e.set(s, i.getAttribute("aria-expanded") === "true");
  }), e;
}
function Ce(t, e) {
  e.forEach((i, s) => {
    const r = t.querySelector(`.collapsible-trigger[aria-controls="${s}"]`), n = document.getElementById(s);
    !r || !n || (r.setAttribute("aria-expanded", i ? "true" : "false"), n.classList.toggle("expanded", i));
  });
}
function Le(t) {
  if (!t || typeof t != "object") return;
  const e = t, i = typeof e.accepted == "boolean" ? e.accepted : void 0, s = nt(e.mode), r = String(e.command_id || e.commandId || "").trim() || void 0, n = String(e.dispatch_id || e.dispatchId || "").trim() || void 0, o = String(e.correlation_id || e.correlationId || "").trim() || void 0, a = e.enqueued_at || e.enqueuedAt, l = a == null ? void 0 : String(a).trim() || void 0;
  if (!(i === void 0 && !s && !r && !n && !o && !l))
    return {
      accepted: i,
      mode: s,
      commandId: r,
      dispatchId: n,
      correlationId: o,
      enqueuedAt: l
    };
}
var ke = class {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.feedbackUnsubscribe = null, this.pendingFeedback = /* @__PURE__ */ new Map(), this.inlineStatus = /* @__PURE__ */ new Map(), this.inlineStatusListeners = /* @__PURE__ */ new Set(), this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || ye(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.feedback = t.feedback, this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]")) return;
      t.preventDefault();
      const i = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, i);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element)) return;
      const i = e.closest("[data-command-name]:not(form)");
      !i || !this.mount.contains(i) || (t.preventDefault(), this.handleCommand(i, null, i));
    }, document.addEventListener("submit", this.submitHandler), document.addEventListener("click", this.clickHandler), this.feedback?.adapter && !this.feedbackUnsubscribe && (this.feedbackUnsubscribe = this.feedback.adapter.subscribe((t) => {
      this.handleFeedbackEvent(t);
    })));
  }
  destroy() {
    this.submitHandler && (document.removeEventListener("submit", this.submitHandler), this.submitHandler = null), this.clickHandler && (document.removeEventListener("click", this.clickHandler), this.clickHandler = null), this.feedbackUnsubscribe && (this.feedbackUnsubscribe(), this.feedbackUnsubscribe = null), this.pendingFeedback.clear(), this.inlineStatus.clear(), this.inlineStatusListeners.clear();
  }
  subscribeToInlineStatus(t) {
    return this.inlineStatusListeners.add(t), () => {
      this.inlineStatusListeners.delete(t);
    };
  }
  getInlineStatus(t) {
    return this.inlineStatus.get(t) || null;
  }
  getAllInlineStatus() {
    return Array.from(this.inlineStatus.values());
  }
  clearInlineStatus(t) {
    this.inlineStatus.delete(t);
  }
  clearAllInlineStatus() {
    this.inlineStatus.clear();
  }
  markStaleStatuses() {
    const t = Date.now();
    this.inlineStatus.forEach((e, i) => {
      e.state !== "completed" && e.state !== "failed" && this.setInlineStatus(i, {
        ...e,
        state: "stale",
        message: "Refreshing status...",
        timestamp: t
      });
    });
  }
  setInlineStatus(t, e) {
    const i = (this.inlineStatus.get(t) || null)?.state || null;
    this.inlineStatus.set(t, e), this.emitInlineStatusChange({
      entry: e,
      previousState: i
    });
  }
  emitInlineStatusChange(t) {
    this.inlineStatusListeners.forEach((e) => {
      try {
        e(t);
      } catch (i) {
        console.warn("Inline status listener error:", i);
      }
    });
  }
  updateInlineStatusFromDispatch(t, e, i, s = {}) {
    this.setInlineStatus(t, {
      correlationId: t,
      commandName: e,
      state: i,
      message: s.message,
      section: s.section,
      participantId: s.participantId,
      timestamp: Date.now()
    });
  }
  resolveSection(t) {
    return t.closest("[data-live-status-section]")?.getAttribute("data-live-status-section") || void 0;
  }
  resolveParticipantId(t, e) {
    const i = String(e.participant_id || e.recipient_id || "").trim();
    return i || t.closest("[data-participant-id]")?.getAttribute("data-participant-id") || void 0;
  }
  scopePayload() {
    const t = {};
    return this.tenantId && (t.tenant_id = this.tenantId), this.orgId && (t.org_id = this.orgId), t;
  }
  buildSpec(t, e, i) {
    const s = m(t.dataset.commandName || e?.dataset.commandName), r = m(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", n = m(t.dataset.commandDispatch || e?.dataset.commandDispatch) || s, o = $e(e), a = xt(t), l = e ? xt(e) : {}, d = {
      ...this.scopePayload(),
      ...o,
      ...l,
      ...a
    }, h = yt(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? yt(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: s,
      dispatchName: n,
      transport: r,
      payload: d,
      successMessage: m(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${s} completed successfully`,
      fallbackMessage: m(t.dataset.commandFailure || e?.dataset.commandFailure) || `${s} failed`,
      refreshSelectors: h,
      confirmMessage: m(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: m(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: m(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: m(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: St(t) || (e ? St(e) : null),
      submitter: i
    };
  }
  buildManualSpec(t) {
    const e = t.trigger || this.mount, i = {
      ...this.scopePayload(),
      ...t.payload || {}
    }, s = Array.isArray(t.refreshSelectors) && t.refreshSelectors.length > 0 ? t.refreshSelectors.filter(Boolean) : this.defaultRefreshSelectors;
    return {
      trigger: e,
      form: t.form || null,
      commandName: String(t.commandName || "").trim(),
      dispatchName: String(t.dispatchName || t.commandName || "").trim(),
      transport: t.transport || "action",
      payload: i,
      successMessage: String(t.successMessage || "").trim() || `${String(t.commandName || "").trim()} completed successfully`,
      fallbackMessage: String(t.fallbackMessage || "").trim() || `${String(t.commandName || "").trim()} failed`,
      refreshSelectors: s,
      confirmMessage: String(t.confirmMessage || "").trim(),
      confirmTitle: String(t.confirmTitle || "").trim(),
      reasonTitle: String(t.reasonTitle || "").trim(),
      reasonSubject: String(t.reasonSubject || "").trim(),
      busyTarget: t.busyTarget || null,
      submitter: t.submitter || null
    };
  }
  async dispatch(t) {
    return this.executeSpec(this.buildManualSpec(t));
  }
  async handleCommand(t, e, i) {
    const s = this.buildSpec(t, e, i);
    !s.commandName || !s.dispatchName || await this.executeSpec(s);
  }
  async executeSpec(t) {
    const e = () => ({
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: String(t.payload.correlation_id || "").trim(),
      success: !1
    });
    if (t.submitter && t.submitter.getAttribute("aria-busy") === "true" || t.confirmMessage && !await this.notifier.confirm(t.confirmMessage, { title: t.confirmTitle || void 0 }))
      return e();
    if (t.reasonTitle) {
      const o = t.reasonSubject ? `${t.reasonTitle}

${t.reasonSubject}

Enter a reason:` : `${t.reasonTitle}

Enter a reason:`, a = globalThis.window?.prompt(o, "") ?? null;
      if (a === null) return e();
      const l = String(a || "").trim();
      if (!l)
        return this.notifier.error("A reason is required."), e();
      t.payload.reason = l;
    }
    const i = Se(t.payload), s = this.resolveSection(t.trigger), r = this.resolveParticipantId(t.trigger, t.payload), n = {
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: i,
      success: !1
    };
    this.onBeforeDispatch?.(n), wt(t.submitter, !0), $t(t.busyTarget, !0), this.updateInlineStatusFromDispatch(i, t.commandName, "submitting", {
      message: "Sending...",
      section: s,
      participantId: r
    });
    try {
      const o = t.transport === "rpc" ? await this.dispatchRPC(t) : await this.dispatchAction(t), a = {
        ...n,
        success: o.success,
        data: o.data,
        error: o.error,
        correlationId: o.correlationId || i,
        receipt: o.receipt,
        responseMode: o.responseMode
      };
      if (!o.success || o.error) {
        const l = ht(o.error || M(null, t.fallbackMessage), t.fallbackMessage);
        return this.notifier.error(l), this.updateInlineStatusFromDispatch(i, t.commandName, "failed", {
          message: l || "Failed",
          section: s,
          participantId: r
        }), this.onAfterDispatch?.(a), a;
      }
      return this.notifier.success(t.successMessage), this.shouldWaitForFeedback(a) ? (this.updateInlineStatusFromDispatch(i, t.commandName, "accepted", {
        message: "Queued...",
        section: s,
        participantId: r
      }), this.pendingFeedback.set(a.correlationId, {
        correlationId: a.correlationId,
        commandName: a.commandName,
        transport: a.transport,
        responseMode: a.responseMode,
        receipt: a.receipt,
        refreshSelectors: [...t.refreshSelectors],
        trigger: t.trigger,
        section: s,
        participantId: r
      })) : (this.updateInlineStatusFromDispatch(i, t.commandName, "completed", {
        message: t.successMessage || "Done",
        section: s,
        participantId: r
      }), t.refreshSelectors.length > 0 && await this.refreshSelectors(t.refreshSelectors, t.trigger)), this.onAfterDispatch?.(a), a;
    } catch (o) {
      const a = M(o, t.fallbackMessage), l = {
        ...n,
        success: !1,
        error: a
      };
      return this.notifier.error(ht(a, t.fallbackMessage)), this.updateInlineStatusFromDispatch(i, t.commandName, "failed", {
        message: a.message || "Failed",
        section: s,
        participantId: r
      }), this.onAfterDispatch?.(l), l;
    } finally {
      wt(t.submitter, !1), $t(t.busyTarget, !1);
    }
  }
  shouldWaitForFeedback(t) {
    return this.feedback?.adapter ? nt(t.responseMode || t.receipt?.mode) === "queued" : !1;
  }
  async handleFeedbackEvent(t) {
    const e = String(t.correlationId || "").trim(), i = e && this.pendingFeedback.get(e) || null;
    i && this.pendingFeedback.delete(e);
    const s = {
      controller: this,
      event: t,
      pending: i
    };
    if (t.type === "stream_gap") {
      this.markStaleStatuses(), await this.feedback?.onStreamGap?.(s);
      return;
    }
    if (e) {
      const r = String(t.status || "").toLowerCase(), n = (Array.isArray(t.sections) ? t.sections : [])[0] || i?.section, o = i?.participantId, a = i?.commandName || "";
      r === "completed" || r === "success" ? this.updateInlineStatusFromDispatch(e, a, "completed", {
        message: t.message || "Done",
        section: n,
        participantId: o
      }) : r === "failed" || r === "error" ? this.updateInlineStatusFromDispatch(e, a, "failed", {
        message: t.message || "Failed",
        section: n,
        participantId: o
      }) : r === "retry" || r === "retry_scheduled" || r === "retrying" ? this.updateInlineStatusFromDispatch(e, a, "retry_scheduled", {
        message: t.message || "Retry scheduled...",
        section: n,
        participantId: o
      }) : (r === "accepted" || r === "queued" || r === "processing") && this.updateInlineStatusFromDispatch(e, a, "accepted", {
        message: t.message || "Processing...",
        section: n,
        participantId: o
      });
    }
    await this.feedback?.onEvent?.(s);
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName) return {
      success: !1,
      error: M(null, "Action transport is not configured")
    };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, i = {
      id: this.recordId,
      ...t.payload
    }, s = await this.fetchImpl(e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(i)
    });
    return s.ok ? {
      ...mt(await vt(s), t.fallbackMessage),
      correlationId: String(t.payload.correlation_id || "").trim() || void 0
    } : {
      success: !1,
      error: await ut(s)
    };
  }
  async dispatchRPC(t) {
    const e = String(t.payload.correlation_id || "").trim() || void 0, i = {
      method: "admin.commands.dispatch",
      params: { data: {
        name: t.dispatchName,
        ids: this.recordId ? [this.recordId] : [],
        payload: t.payload,
        options: {
          correlation_id: e,
          metadata: { correlation_id: e }
        }
      } }
    }, s = await this.fetchImpl(this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(i)
    });
    if (!s.ok) return {
      success: !1,
      error: await ut(s),
      correlationId: e
    };
    const r = await vt(s);
    if (r && typeof r == "object" && "error" in r) return {
      ...mt(r, t.fallbackMessage),
      correlationId: e
    };
    if (r && typeof r == "object" && "data" in r && typeof r.data == "object") {
      const n = r.data, o = Le(n.receipt);
      return {
        success: !0,
        data: n,
        correlationId: o?.correlationId || e,
        receipt: o,
        responseMode: nt(n.response_mode || o?.mode)
      };
    }
    return {
      success: !0,
      data: r && typeof r == "object" ? r : void 0,
      correlationId: e
    };
  }
  async refreshSelectors(t, e = null) {
    const i = await this.refreshFragments(t);
    return i && this.onAfterRefresh?.({
      mount: this.mount,
      trigger: e || this.mount,
      selectors: t,
      sourceDocument: i
    }), i;
  }
  async refreshFragments(t) {
    const e = await this.fetchImpl(globalThis.window?.location?.href || "", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "text/html",
        "X-Requested-With": "go-admin-command-runtime"
      }
    });
    if (!e.ok) return null;
    const i = await e.text();
    if (!i.trim()) return null;
    const s = new DOMParser().parseFromString(i, "text/html");
    return t.forEach((r) => {
      this.replaceFragment(r, s);
    }), s;
  }
  replaceFragment(t, e) {
    const i = document.querySelector(t), s = e.querySelector(t);
    if (!i && !s) return;
    if (i && !s) {
      i.remove();
      return;
    }
    if (!i || !s) return;
    const r = _e(i), n = document.importNode(s, !0);
    i.replaceWith(n), n instanceof Element && Ce(n, r);
  }
};
function Pi(t) {
  if (!t.mount) return null;
  const e = new ke(t);
  return e.init(), e;
}
function B(t) {
  return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function S(t, e) {
  const i = typeof e == "function" ? String(e(t) || "").trim() : "";
  return i || B(t);
}
function z(t) {
  return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function v(t, e = 12) {
  return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
}
function N(t) {
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
}
function b(t, e = {}) {
  const i = new Date(t);
  if (Number.isNaN(i.getTime())) return t;
  if (!e.allowFuture) {
    const h = (/* @__PURE__ */ new Date()).getTime() - i.getTime(), f = Math.floor(h / 6e4), g = Math.floor(h / 36e5), p = Math.floor(h / 864e5);
    return f < 1 ? e.pastImmediateLabel || "Just now" : f < 60 ? `${f}m ago` : g < 24 ? `${g}h ago` : p < 7 ? `${p}d ago` : i.toLocaleDateString();
  }
  const s = /* @__PURE__ */ new Date(), r = i.getTime() - s.getTime(), n = r > 0, o = Math.abs(r), a = Math.floor(o / 6e4), l = Math.floor(o / 36e5), d = Math.floor(o / 864e5);
  return a < 1 ? n ? e.futureImmediateLabel || "Soon" : e.pastImmediateLabel || "Just now" : a < 60 ? n ? `in ${a}m` : `${a}m ago` : l < 24 ? n ? `in ${l}h` : `${l}h ago` : d < 7 ? n ? `in ${d}d` : `${d}d ago` : i.toLocaleDateString();
}
async function Mt(t, e = {}) {
  try {
    return (await t.listProviders(e.signal)).providers || [];
  } catch (i) {
    const s = i instanceof Error ? i : new Error(String(i));
    return e.onError?.(s), e.notifier?.error(`Failed to load providers: ${s.message}`), [];
  }
}
async function dt(t, e) {
  const i = await Mt(t, e);
  return Te({
    container: e.container,
    providers: i,
    selectedProviderId: e.selectedProviderId,
    getProviderName: e.getProviderName,
    selectSelector: e.selectSelector,
    emptyLabel: e.emptyLabel
  }), i;
}
function Te(t) {
  const e = t.container?.querySelector(t.selectSelector || '[data-filter="provider_id"]');
  if (!e) return;
  const i = t.emptyLabel || "All Providers", s = t.providers.map((r) => {
    const n = S(r.id, t.getProviderName);
    return `<option value="${c(r.id)}">${c(n)}</option>`;
  }).join("");
  e.innerHTML = `<option value="">${c(i)}</option>${s}`, e.value = t.selectedProviderId || "";
}
function A(t, e) {
  t.querySelector(".ui-state-reset-btn")?.addEventListener("click", e);
}
function Z(t, e) {
  return t?.abort(), e.destroy(), null;
}
var _t = {
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
}, Ee = {
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
}, Ae = class {
  constructor(t) {
    this.container = null, this.providers = [], this.loading = !1, this.error = null, this.config = t;
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ProvidersCatalog] Container not found:", this.config.container);
      return;
    }
    if (!j()()) {
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
      this.loading = !0, this.error = null, this.renderLoading(), this.providers = await Mt(P(), {
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
    this.container && (this.container.innerHTML = at({
      text: "Loading providers...",
      size: "lg"
    }));
  }
  renderError() {
    this.container && (this.container.innerHTML = ot({
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
    this.container && (this.container.innerHTML = Ht({ type: "providers" }));
  }
  buildProviderCard(t) {
    const e = this.getProviderCardData(t), i = E()() && t.supported_scope_types.includes("user"), s = E()() && t.supported_scope_types.includes("org"), r = this.buildCapabilitySummary(t.capabilities), n = this.buildScopeBadges(t.supported_scope_types);
    return `
      <div class="provider-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
           data-provider-id="${c(t.id)}">
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
                <h3 class="text-sm font-semibold text-gray-900">${c(e.displayName)}</h3>
                <span class="text-xs text-gray-500">${c(t.auth_kind)}</span>
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
                      data-provider-id="${c(t.id)}"
                      data-scope-type="user">
                Connect as User
              </button>
            ` : ""}
            ${s ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      data-provider-id="${c(t.id)}"
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
      const [o, a] = n.name.split(".");
      r += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              title="${c(n.name)}">
          ${c(a || n.name)}
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
      displayName: this.config.getProviderName ? this.config.getProviderName(t.id) : Ee[t.id.toLowerCase()] || S(t.id),
      icon: this.config.getProviderIcon ? this.config.getProviderIcon(t.id) : _t[t.id.toLowerCase()] || _t.default,
      description: `${t.auth_kind} authentication`,
      capabilityCount: t.capabilities.length,
      canConnect: E()()
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
async function Ri(t) {
  const e = new Ae(t);
  return await e.init(), e;
}
var Ct = {
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
}, qe = class {
  constructor(t) {
    this.container = null, this.state = {
      connections: [],
      providers: [],
      total: 0,
      loading: !1,
      error: null
    }, this.abortController = null, this.actionQueue = new K(), this.config = {
      perPage: 25,
      syncUrl: !0,
      ...t
    }, this.client = t.apiClient || P(), this.queryState = new G({
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
    if (!j()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), this.state.providers = await dt(this.client, {
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
    this.abortController = Z(this.abortController, this.queryState);
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
          ${E()() && this.config.onConnect ? `
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
        }), A(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.connections.map((s) => this.renderConnectionRow(s)).join(""), this.bindRowActions();
    }
  }
  handleConnect(t) {
    if (!this.config.onConnect || !E()()) return;
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
      const s = S(i.id, this.config.getProviderName);
      this.config.notifier?.error(`${s} does not support ${t} scope.`);
      return;
    }
    this.config.onConnect(i.id, t);
  }
  renderConnectionRow(t) {
    const e = Ct[t.status] || Ct.disconnected, i = S(t.provider_id, this.config.getProviderName), s = b(t.updated_at), r = this.buildRowActions(t);
    return `
      <tr class="connection-row hover:bg-gray-50 cursor-pointer" data-connection-id="${c(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${c(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${c(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${c(t.scope_id)}">
            ${c(v(t.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-gray-600" title="${c(t.external_account_id)}">
            ${c(v(t.external_account_id, 20))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
          ${t.last_error ? `
            <div class="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title="${c(t.last_error)}">
              ${c(t.last_error)}
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
    return t.status === "active" && I()() && e.push(`
        <button type="button"
                class="connection-action-refresh p-1 text-gray-400 hover:text-blue-600"
                data-action="refresh"
                title="Refresh credentials">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status === "needs_reconsent" && Rt()() && e.push(`
        <button type="button"
                class="connection-action-reconsent p-1 text-gray-400 hover:text-orange-600"
                data-action="reconsent"
                title="Re-consent">
          ${u("iconoir:redo", { size: "16px" })}
        </button>
      `), t.status !== "disconnected" && lt()() && e.push(`
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
      await x({
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
      await x({
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
    await Q({
      action: "revoke",
      resourceType: "connection",
      resourceName: i ? S(i.provider_id, this.config.getProviderName) : void 0
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
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), i = this.container?.querySelector(".connections-empty");
    t && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = W(6, {
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
    this.state.loading && t && this.state.connections.length === 0 && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = V(6, { text: "Loading connections..." }));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: i } = this.state, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, o = t > 1, a = this.container?.querySelector(".connections-info"), l = this.container?.querySelector(".connections-prev"), d = this.container?.querySelector(".connections-next");
    a && (a.textContent = i > 0 ? `Showing ${s}-${r} of ${i}` : "No connections"), l && (l.disabled = !o), d && (d.disabled = !n);
  }
};
async function Ii(t) {
  const e = new qe(t);
  return await e.init(), e;
}
var Lt = {
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
}, kt = {
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
}, Pe = class {
  constructor(t) {
    this.container = null, this.state = {
      installations: [],
      providers: [],
      total: 0,
      loading: !1,
      error: null
    }, this.abortController = null, this.actionQueue = new K(), this.config = {
      perPage: 25,
      syncUrl: !0,
      ...t
    }, this.client = t.apiClient || P(), this.queryState = new G({
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
    if (!j()()) {
      this.renderForbidden();
      return;
    }
    this.queryState.init(), this.renderStructure(), this.state.providers = await dt(this.client, {
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
    this.abortController = Z(this.abortController, this.queryState);
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
        }), A(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.installations.map((s) => this.renderInstallationRow(s)).join(""), this.bindRowActions();
    }
  }
  renderInstallationRow(t) {
    const e = Lt[t.status] || Lt.uninstalled, i = kt[t.install_type] || kt.standard, s = S(t.provider_id, this.config.getProviderName), r = t.granted_at ? b(t.granted_at) : "—", n = t.revoked_at ? b(t.revoked_at) : "—", o = this.buildRowActions(t);
    return `
      <tr class="installation-row hover:bg-gray-50 cursor-pointer" data-installation-id="${c(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${c(s)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${i.bg} ${i.text}">
            ${i.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${c(t.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${c(t.scope_id)}">
            ${c(v(t.scope_id))}
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
          ${o}
        </td>
      </tr>
    `;
  }
  buildRowActions(t) {
    const e = [];
    return t.status === "active" && lt()() && e.push(`
        <button type="button"
                class="installation-action-uninstall p-1 text-gray-400 hover:text-red-600"
                data-action="uninstall"
                title="Uninstall">
          ${u("iconoir:trash", { size: "16px" })}
        </button>
      `), t.status === "uninstalled" && E()() && e.push(`
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
    await Q({
      action: "uninstall",
      resourceType: "installation",
      resourceName: i ? S(i.provider_id, this.config.getProviderName) : void 0
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
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), i = this.container?.querySelector(".installations-empty");
    t && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = W(7, {
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
    this.state.loading && t && this.state.installations.length === 0 && (e?.classList.remove("hidden"), i?.classList.add("hidden"), t.innerHTML = V(7, { text: "Loading installations..." }));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: i } = this.state, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, o = t > 1, a = this.container?.querySelector(".installations-info"), l = this.container?.querySelector(".installations-prev"), d = this.container?.querySelector(".installations-next");
    a && (a.textContent = i > 0 ? `Showing ${s}-${r} of ${i}` : "No installations"), l && (l.disabled = !o), d && (d.disabled = !n);
  }
};
async function Mi(t) {
  const e = new Pe(t);
  return await e.init(), e;
}
var U = {
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
}, Re = class {
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
    }, this.state.viewMode = this.config.viewMode || "timeline", this.client = t.apiClient || P(), this.queryState = new G({
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
    if (!Gt()()) {
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
    this.abortController = Z(this.abortController, this.queryState);
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
    return !this.config.providers || this.config.providers.length === 0 ? "" : this.config.providers.map((t) => `<option value="${c(t.id)}">${c(t.name)}</option>`).join("");
  }
  renderChannelOptions() {
    return (this.config.channels || [
      "connections",
      "credentials",
      "grants",
      "webhooks",
      "sync",
      "lifecycle"
    ]).map((t) => `<option value="${c(t)}">${c(z(t))}</option>`).join("");
  }
  renderActionOptions() {
    if (this.config.actions && this.config.actions.length > 0) return this.config.actions.map((s) => {
      const r = this.resolveActionLabel(s);
      return `<option value="${c(s)}">${c(r)}</option>`;
    }).join("");
    const t = ee(), e = {
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
      const n = e[s] || z(s), o = r.map((a) => {
        const l = this.resolveActionLabel(a.action);
        return `<option value="${c(a.action)}">${c(l)}</option>`;
      }).join("");
      i.push(`<optgroup label="${c(n)}">${o}</optgroup>`);
    }
    return i.join("");
  }
  resolveActionLabel(t) {
    return this.config.getActionLabel ? this.config.getActionLabel(t) : te(t);
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
    t?.addEventListener("click", () => this.setViewMode("timeline")), e?.addEventListener("click", () => this.setViewMode("table")), this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (o) => {
      this.queryState.setSearch(o.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((o) => {
      o.addEventListener("change", () => {
        const a = o.dataset.filter;
        this.queryState.setFilter(a, o.value || void 0);
      });
    }), this.container.querySelectorAll('input[data-filter]:not([type="text"])').forEach((o) => {
      o.addEventListener("change", () => {
        const a = o.dataset.filter;
        this.queryState.setFilter(a, o.value || void 0);
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
      this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (i?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = Bt({
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount(),
        containerClass: "bg-white rounded-lg border border-gray-200"
      }), A(t, () => {
        this.queryState.reset(), this.restoreFilterValues();
      }))) : (r?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = F(7, {
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount()
      }), A(e, () => {
        this.queryState.reset(), this.restoreFilterValues();
      })))) : (s?.classList.add("hidden"), r?.classList.add("hidden"), i?.classList.remove("hidden")), this.updateFilterSummary();
      return;
    }
    i?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = this.state.entries.map((n) => this.renderTimelineEntry(n)).join(""), this.bindEntryActions())) : (r?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = this.state.entries.map((n) => this.renderTableRow(n)).join(""), this.bindEntryActions())), this.updateFilterSummary();
  }
  renderTimelineEntry(t) {
    const e = U[t.status] || U.pending, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : B(t.provider_id), s = this.resolveActionLabel(t.action), r = N(t.created_at), n = b(t.created_at);
    return `
      <div class="activity-entry flex gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
           data-entry-id="${c(t.id)}">
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
                ${c(s)}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-500">${c(i)}</span>
                ${t.channel ? `
                  <span class="text-gray-300">&middot;</span>
                  <span class="text-xs text-gray-500">${c(t.channel)}</span>
                ` : ""}
                ${t.object_type && t.object_id ? `
                  <span class="text-gray-300">&middot;</span>
                  <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
                     class="activity-object-link text-xs text-blue-600 hover:text-blue-700"
                     data-object-type="${c(t.object_type)}"
                     data-object-id="${c(t.object_id)}">
                    ${c(t.object_type)}:${c(v(t.object_id))}
                  </a>
                ` : ""}
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-500" title="${c(r)}">${n}</p>
              <div class="flex items-center gap-1 mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
                  ${c(t.scope_type)}
                </span>
              </div>
            </div>
          </div>

          <!-- Metadata preview -->
          ${Object.keys(t.metadata || {}).length > 0 ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <div class="text-xs text-gray-500 font-mono truncate">
                ${c(this.formatMetadataPreview(t.metadata))}
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
    const e = U[t.status] || U.pending, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : B(t.provider_id), s = this.resolveActionLabel(t.action), r = N(t.created_at), n = b(t.created_at);
    return `
      <tr class="activity-row hover:bg-gray-50 cursor-pointer" data-entry-id="${c(t.id)}">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="text-sm text-gray-900" title="${c(r)}">${n}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm font-medium text-gray-900">${c(i)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-700">${c(s)}</span>
        </td>
        <td class="px-4 py-3">
          ${t.object_type && t.object_id ? `
            <a href="${this.buildObjectLinkUrl(t.object_type, t.object_id)}"
               class="activity-object-link text-sm text-blue-600 hover:text-blue-700"
               data-object-type="${c(t.object_type)}"
               data-object-id="${c(t.object_id)}">
              ${c(t.object_type)}:${c(v(t.object_id))}
            </a>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.scope_type === "user" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}">
            ${c(t.scope_type)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-500">${c(t.channel || "—")}</span>
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
    return de(() => {
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
    const i = It(t);
    if (!i) return "#";
    const s = this.queryState.getState();
    return oe(i, e, {
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
    this.container?.querySelector(".activity-empty")?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), s?.classList.add("hidden"), t && (t.innerHTML = ot({
      title: "Failed to load activity",
      error: this.state.error,
      containerClass: "bg-white rounded-lg border border-gray-200",
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity()))) : (s?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = W(7, {
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
    this.state.loading && (this.state.entries.length > 0 || (r?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), s?.classList.add("hidden"), t && (t.innerHTML = at({ text: "Loading activity..." }))) : (s?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = V(7, { text: "Loading activity..." })))));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: i } = this.state, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, o = t > 1, a = this.container?.querySelector(".activity-info"), l = this.container?.querySelector(".activity-prev"), d = this.container?.querySelector(".activity-next");
    a && (a.textContent = i > 0 ? `Showing ${s}-${r} of ${i}` : "No activity"), l && (l.disabled = !o), d && (d.disabled = !n);
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
async function Fi(t) {
  const e = new Re(t);
  return await e.init(), e;
}
var it = {
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
}, st = {
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
}, Tt = {
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
}, Ie = class {
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
    }, this.abortController = null, this.actionQueue = new K(), this.config = {
      perPage: 25,
      syncUrl: !0,
      activeTab: "subscriptions",
      ...t
    }, this.state.activeTab = this.config.activeTab || "subscriptions", this.client = t.apiClient || P(), this.queryState = new G({
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
    if (!j()()) {
      this.renderForbidden();
      return;
    }
    this.restoreTab(), this.queryState.init(), this.renderStructure(), this.state.providers = await dt(this.client, {
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
    this.abortController = Z(this.abortController, this.queryState);
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
    const e = t.provider_id, i = t.connection_id, s = t.status, r = String(t.q || "").trim().toLowerCase(), n = t.page || 1, o = t.per_page || this.config.perPage || 25, a = await this.loadSyncConnections({
      providerId: e,
      connectionId: i,
      signal: this.abortController?.signal
    }), l = (await Promise.all(a.map(async (g) => {
      try {
        return {
          connection: g,
          summary: (await this.client.getSyncStatus(g.id, this.abortController?.signal)).sync_summary
        };
      } catch (p) {
        if (p.name === "AbortError") throw p;
        return null;
      }
    }))).filter((g) => g !== null).map((g) => this.toSyncJob(g.connection, g.summary)).filter((g) => g !== null).filter((g) => s && g.status !== s ? !1 : r ? this.matchesSyncSearch(g, r) : !0), d = l.length, h = (n - 1) * o, f = l.slice(h, h + o);
    this.state.syncJobs = f, this.state.syncJobsTotal = d, this.renderSyncJobs(), this.updatePagination();
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
    return Object.entries(it).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  renderSyncStatusOptions() {
    return Object.entries(st).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
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
        }), A(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("subscriptions"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.subscriptions.map((s) => this.renderSubscriptionRow(s)).join(""), this.bindSubscriptionActions();
    }
  }
  renderSubscriptionRow(t) {
    const e = it[t.status] || it.errored, i = S(t.provider_id, this.config.getProviderName), s = t.expires_at ? b(t.expires_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }) : "—", r = t.expires_at ? N(t.expires_at) : "", n = b(t.updated_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }), o = t.expires_at && this.isExpiringSoon(t.expires_at);
    return `
      <tr class="subscription-row hover:bg-gray-50 cursor-pointer" data-subscription-id="${c(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${c(i)}</span>
        </td>
        <td class="px-4 py-3">
          <div class="text-sm text-gray-700">${c(t.resource_type)}</div>
          <div class="text-xs text-gray-500" title="${c(t.resource_id)}">
            ${c(v(t.resource_id))}
          </div>
        </td>
        <td class="px-4 py-3">
          <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">${c(v(t.channel_id, 16))}</code>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${e.bg} ${e.text}">
            ${u(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="${o ? "text-amber-600 font-medium" : "text-gray-500"}" title="${r}">
            ${s}
          </span>
          ${o ? u("iconoir:warning-triangle", {
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
    return t.status === "active" && I()() && e.push(`
        <button type="button"
                class="action-renew p-1 text-gray-400 hover:text-blue-600"
                data-action="renew"
                title="Renew subscription">
          ${u("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status !== "cancelled" && I()() && e.push(`
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
        }), A(t, () => {
          this.queryState.reset(), this.restoreFilterValues();
        })) : (t.innerHTML = "", i?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("sync"));
        return;
      }
      i?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.syncJobs.map((s) => this.renderSyncJobRow(s)).join(""), this.bindSyncJobActions();
    }
  }
  renderSyncJobRow(t) {
    const e = st[t.status] || st.failed, i = Tt[t.mode] || Tt.incremental, s = S(t.provider_id, this.config.getProviderName), r = t.metadata, n = typeof r.last_synced_at == "string" ? r.last_synced_at : "", o = n ? b(n, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }) : b(t.updated_at, {
      allowFuture: !0,
      futureImmediateLabel: "Soon"
    }), a = typeof r.last_sync_error == "string" ? r.last_sync_error : "", l = t.checkpoint || "";
    return `
      <tr class="sync-row hover:bg-gray-50 cursor-pointer" data-job-id="${c(t.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${c(s)}</span>
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
          ${l ? `
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded" title="${c(l)}">
              ${c(v(l, 16))}
            </code>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-gray-500 text-sm">
          ${o}
        </td>
        <td class="px-4 py-3 text-xs">
          ${a ? `<span class="text-red-600" title="${c(a)}">${c(v(a, 48))}</span>` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSyncJobActions(t)}
        </td>
      </tr>
    `;
  }
  buildSyncJobActions(t) {
    const e = [];
    return t.status !== "running" && I()() && e.push(`
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
    await Q({
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
    const i = this.state.syncJobs.find((o) => o.id === t);
    if (!i) return;
    const s = i.metadata, r = typeof s.run_resource_type == "string" && s.run_resource_type ? s.run_resource_type : "default", n = typeof s.run_resource_id == "string" && s.run_resource_id ? s.run_resource_id : "default";
    this.actionQueue.isInFlight(`sync-${t}`) || await this.actionQueue.execute(`sync-${t}`, async () => {
      await x({
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
    s && (s.innerHTML = W(7, {
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
      t?.classList.remove("hidden"), i?.classList.add("hidden"), e.innerHTML = V(7, { text: r });
    }
  }
  async loadSyncConnections(t) {
    const { providerId: e, connectionId: i, signal: s } = t;
    if (i) try {
      const r = await this.client.getConnectionDetail(i, s);
      return e && r.connection.provider_id !== e ? [] : [r.connection];
    } catch (r) {
      if (r.name === "AbortError") throw r;
      if (r instanceof ct && r.isNotFound) return [];
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
    const { page: t, per_page: e } = this.queryState.getState(), i = this.state.activeTab === "subscriptions" ? this.state.subscriptionsTotal : this.state.syncJobsTotal, s = i > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, i), n = r < i, o = t > 1, a = this.container?.querySelector(".info"), l = this.container?.querySelector(".prev-btn"), d = this.container?.querySelector(".next-btn"), h = this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs";
    a && (a.textContent = i > 0 ? `Showing ${s}-${r} of ${i} ${h}` : `No ${h}`), l && (l.disabled = !o), d && (d.disabled = !n);
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
async function Ni(t) {
  const e = new Ie(t);
  return await e.init(), e;
}
var Et = {
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
}, Me = {
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
}, Fe = class {
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
    }, this.abortController = null, this.actionQueue = new K(), this.config = t, this.client = t.apiClient || P();
  }
  async init() {
    if (this.container = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container, !this.container) {
      console.error("[ConnectionDetail] Container not found:", this.config.container);
      return;
    }
    if (!j()()) {
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
    const t = this.state.connection, e = Et[t.status] || Et.disconnected, i = S(t.provider_id, this.config.getProviderName), s = this.buildGrantInfoList(), r = s.some((o) => o.status === "capability_required"), n = t.status === "needs_reconsent" || r;
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
              <h2 class="text-xl font-semibold text-gray-900">${c(i)}</h2>
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
                ${c(t.scope_type)}
              </span>
              <span class="text-sm text-gray-700" title="${c(t.scope_id)}">
                ${c(v(t.scope_id, 16))}
              </span>
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">External Account</dt>
            <dd class="mt-1 text-sm text-gray-700" title="${c(t.external_account_id)}">
              ${c(v(t.external_account_id, 20))}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${N(t.created_at)}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${N(t.updated_at)}
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
              <p class="text-sm text-red-700 mt-1">${c(t.last_error)}</p>
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
            ${Rt()() ? `
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
                  Version ${this.state.grantSnapshot.version} • Captured ${b(this.state.grantSnapshot.captured_at, {
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
          ${I()() && t.status === "active" ? `
            <button type="button"
                    class="refresh-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              ${u("iconoir:refresh", {
      size: "16px",
      extraClass: "mr-1.5"
    })}
              Refresh Credentials
            </button>
          ` : ""}
          ${lt()() && t.status !== "disconnected" ? `
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
      const i = Me[e.status], s = e.capabilities.length > 0 ? e.capabilities.map((r) => z(r)).join(", ") : null;
      return `
          <div class="grant-row flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-gray-700">${c(e.grant)}</code>
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
                  Used by: ${c(s)}
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
      const e = new Set(this.state.grantSnapshot.granted_grants), i = t.required_grants.every((h) => e.has(h)), s = t.optional_grants.every((h) => e.has(h)), r = i && s, n = i && !s, o = !i;
      let a, l, d;
      return r ? (a = "Fully Enabled", l = "bg-green-100 text-green-700", d = "iconoir:check-circle") : n ? (a = "Partially Enabled", l = "bg-blue-100 text-blue-700", d = "iconoir:half-moon") : (a = t.denied_behavior === "block" ? "Blocked" : "Degraded", l = t.denied_behavior === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700", d = t.denied_behavior === "block" ? "iconoir:lock" : "iconoir:warning-triangle"), `
          <div class="capability-card border border-gray-200 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">${c(z(t.name))}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  ${t.required_grants.length} required, ${t.optional_grants.length} optional
                </p>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${l}">
                ${u(d, { size: "12px" })}
                ${a}
              </span>
            </div>
            ${o && t.denied_behavior === "block" ? `
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
      const n = new Date(t.expires_at), o = /* @__PURE__ */ new Date(), a = (n.getTime() - o.getTime()) / (1e3 * 60 * 60);
      a < 0 ? (e = "error", i = "Expired", s = "bg-red-100 text-red-700 border-red-200", r = "iconoir:clock") : a < 24 && (e = "warning", i = "Expiring Soon", s = "bg-amber-100 text-amber-700 border-amber-200", r = "iconoir:clock");
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
              <span class="text-sm font-medium text-gray-900" title="${c(t.expires_at)}">
                ${b(t.expires_at, {
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
              <span class="text-sm font-medium text-gray-900" title="${c(t.last_refresh_at)}">
                ${b(t.last_refresh_at, {
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
              <span class="text-sm font-medium text-gray-900" title="${c(t.next_refresh_attempt_at)}">
                ${b(t.next_refresh_attempt_at, {
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
                <p class="text-sm text-red-700">${c(t.last_error)}</p>
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
      const o = t.exhausted_buckets / Math.max(t.total_buckets, 1);
      o >= 1 ? (e = "exhausted", i = "All Limits Exhausted", s = "bg-red-100 text-red-700", r = "iconoir:warning-circle") : o >= 0.5 ? (e = "warning", i = "High Usage", s = "bg-amber-100 text-amber-700", r = "iconoir:warning-triangle") : (e = "warning", i = "Some Limits Hit", s = "bg-amber-100 text-amber-700", r = "iconoir:clock");
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
              <span class="text-sm font-medium text-gray-900" title="${c(t.next_reset_at)}">
                ${b(t.next_reset_at, {
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
      await x({
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
    if (!this.state.connection || !await Q({
      action: "revoke",
      resourceType: "connection",
      resourceName: this.config.getProviderName ? this.config.getProviderName(this.state.connection.provider_id) : B(this.state.connection.provider_id)
    })) return;
    const t = this.container?.querySelector(".revoke-btn");
    this.actionQueue.isInFlight("revoke") || await this.actionQueue.execute("revoke", async () => {
      await x({
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
    this.container && (this.container.innerHTML = at({
      text: "Loading connection details...",
      size: "lg"
    }));
  }
  renderError() {
    this.container && (this.container.innerHTML = ot({
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
    if (e) for (const d of e.capabilities) {
      for (const h of d.required_grants) {
        n.add(h);
        const f = r.get(h) || [];
        f.push(d.name), r.set(h, f);
      }
      for (const h of d.optional_grants) {
        const f = r.get(h) || [];
        f.push(d.name), r.set(h, f);
      }
    }
    const o = /* @__PURE__ */ new Set([
      ...t.requested_grants,
      ...t.granted_grants,
      ...n
    ]), a = [];
    for (const d of o) {
      const h = s.has(d), f = i.has(d), g = n.has(d);
      let p;
      h ? p = "granted" : f ? p = "requested" : g ? p = "capability_required" : p = "missing", a.push({
        grant: d,
        status: p,
        isRequired: f || g,
        isCapabilityRequired: g,
        capabilities: r.get(d) || []
      });
    }
    const l = {
      capability_required: 0,
      granted: 1,
      requested: 2,
      missing: 3
    };
    return a.sort((d, h) => l[d.status] - l[h.status]), a;
  }
};
async function ji(t) {
  const e = new Fe(t);
  return await e.init(), e;
}
export {
  _ as $,
  he as A,
  Ze as At,
  Si as B,
  Ke as Bt,
  v as C,
  J as Ct,
  Ai as D,
  lt as Dt,
  Ei as E,
  Rt as Et,
  Y as F,
  ei as Ft,
  ki as G,
  We as Gt,
  Ci as H,
  ti as Ht,
  pe as I,
  Qe as It,
  ui as J,
  Ve as Jt,
  ue as K,
  Je as Kt,
  Li as L,
  ii as Lt,
  yi as M,
  et as Mt,
  xi as N,
  k as Nt,
  H as O,
  Gt as Ot,
  mi as P,
  Xe as Pt,
  hi as Q,
  L as Qt,
  Ti as R,
  Jt as Rt,
  S,
  x as St,
  Pi as T,
  I as Tt,
  _i as U,
  G as Ut,
  wi as V,
  Ye as Vt,
  $i as W,
  Ge as Wt,
  le as X,
  ze as Xt,
  de as Y,
  P as Yt,
  oe as Z,
  ct as Zt,
  b as _,
  rt as _t,
  Re as a,
  D as at,
  Mt as b,
  Yt as bt,
  Mi as c,
  te as ct,
  Ae as d,
  ri as dt,
  It as et,
  Ri as f,
  ci as ft,
  B as g,
  Kt as gt,
  N as h,
  K as ht,
  Ni as i,
  fi as it,
  vi as j,
  R as jt,
  qi as k,
  j as kt,
  qe as l,
  ee as lt,
  Z as m,
  oi as mt,
  ji as n,
  ce as nt,
  Fi as o,
  di as ot,
  A as p,
  li as pt,
  bi as q,
  Pt as qt,
  Ie as r,
  gi as rt,
  Pe as s,
  ni as st,
  Fe as t,
  pi as tt,
  Ii as u,
  ai as ut,
  z as v,
  Q as vt,
  ke as w,
  E as wt,
  Te as x,
  si as xt,
  dt as y,
  Zt as yt,
  fe as z,
  Qt as zt
};

//# sourceMappingURL=services-CXXRRtu9.js.map
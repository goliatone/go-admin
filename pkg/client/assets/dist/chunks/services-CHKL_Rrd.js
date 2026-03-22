import { t as d } from "./icon-renderer-BSHLmdoQ.js";
import { t as wt } from "./modal-Bj9YWM2D.js";
import { t as qt } from "./toast-manager-CLcahrEa.js";
import { extractStructuredError as rt, formatStructuredErrorForDisplay as nt, parseActionResponse as It } from "../toast/error-helpers.js";
var st = class $t extends Error {
  constructor(e, s, i, r) {
    super(e), this.name = "ServicesAPIError", this.code = s, this.statusCode = i, this.details = r;
  }
  static fromResponse(e, s) {
    return new $t(s.message || s.error || "Unknown error", s.text_code || "UNKNOWN_ERROR", e, s.details);
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
}, Mt = {
  basePath: "/admin/api/services",
  timeout: 3e4,
  headers: {}
};
function Ft() {
  return (typeof globalThis < "u" ? globalThis.location : void 0)?.origin || "http://localhost";
}
var Ct = class {
  constructor(t = {}) {
    this.abortControllers = /* @__PURE__ */ new Map(), this.config = {
      ...Mt,
      ...t
    };
  }
  async listProviders(t) {
    return this.get("/providers", {}, t);
  }
  async listConnections(t = {}, e) {
    const s = this.buildListParams(t);
    return this.get("/connections", s, e);
  }
  async getConnectionDetail(t, e) {
    return this.get(`/connections/${encodeURIComponent(t)}`, {}, e);
  }
  async beginConnection(t, e = {}, s) {
    return this.post(`/connections/${encodeURIComponent(t)}/begin`, e, s);
  }
  async completeCallback(t, e, s) {
    return this.get(`/connections/${encodeURIComponent(t)}/callback`, e, s);
  }
  async getConnectionGrants(t, e) {
    return this.get(`/connections/${encodeURIComponent(t)}/grants`, {}, e);
  }
  async beginReconsent(t, e = {}, s) {
    return this.post(`/connections/${encodeURIComponent(t)}/reconsent/begin`, e, s);
  }
  async refreshConnection(t, e = {}, s) {
    return this.post(`/connections/${encodeURIComponent(t)}/refresh`, e, s);
  }
  async revokeConnection(t, e = {}, s) {
    return this.post(`/connections/${encodeURIComponent(t)}/revoke`, e, s);
  }
  async listInstallations(t = {}, e) {
    const s = this.buildListParams(t);
    return this.get("/installations", s, e);
  }
  async beginInstallation(t, e = {}, s) {
    return this.post(`/installations/${encodeURIComponent(t)}/begin`, e, s);
  }
  async uninstallInstallation(t, e = {}, s) {
    return this.post(`/installations/${encodeURIComponent(t)}/uninstall`, e, s);
  }
  async listSubscriptions(t = {}, e) {
    const s = this.buildListParams(t);
    return this.get("/subscriptions", s, e);
  }
  async renewSubscription(t, e = {}, s) {
    return this.post(`/subscriptions/${encodeURIComponent(t)}/renew`, e, s);
  }
  async cancelSubscription(t, e = {}, s) {
    return this.post(`/subscriptions/${encodeURIComponent(t)}/cancel`, e, s);
  }
  async runSync(t, e, s) {
    return this.post(`/sync/${encodeURIComponent(t)}/run`, e, s);
  }
  async getSyncStatus(t, e) {
    return this.get(`/sync/${encodeURIComponent(t)}/status`, {}, e);
  }
  async listMappings(t, e) {
    const s = this.buildListParams(t);
    return this.get("/mappings", s, e);
  }
  async getMapping(t, e, s) {
    const i = this.buildListParams(e);
    return this.get(`/mappings/spec/${encodeURIComponent(t)}`, i, s);
  }
  async getMappingVersion(t, e, s, i) {
    const r = this.buildListParams(s);
    return this.get(`/mappings/spec/${encodeURIComponent(t)}/versions/${encodeURIComponent(String(e))}`, r, i);
  }
  async createMappingDraft(t, e) {
    return this.post("/mappings", t, e);
  }
  async updateMappingDraft(t, e, s) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/update`, e, s);
  }
  async markMappingValidated(t, e, s) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/validate`, e, s);
  }
  async publishMapping(t, e, s) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/publish`, e, s);
  }
  async unpublishMapping(t, e, s) {
    return this.post(`/mappings/spec/${encodeURIComponent(t)}/unpublish`, e, s);
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
    const s = this.buildListParams(t);
    return this.get("/sync/runs", s, e);
  }
  async getSyncRun(t, e, s) {
    const i = this.buildListParams(e);
    return this.get(`/sync/runs/${encodeURIComponent(t)}`, i, s);
  }
  async resumeSyncRun(t, e, s) {
    return this.post(`/sync/runs/${encodeURIComponent(t)}/resume`, e, s);
  }
  async getSyncCheckpoint(t, e, s) {
    const i = this.buildListParams(e);
    return this.get(`/sync/checkpoints/${encodeURIComponent(t)}`, i, s);
  }
  async listSyncConflicts(t, e) {
    const s = this.buildListParams(t);
    return this.get("/sync/conflicts", s, e);
  }
  async getSyncConflict(t, e, s) {
    const i = this.buildListParams(e);
    return this.get(`/sync/conflicts/${encodeURIComponent(t)}`, i, s);
  }
  async resolveSyncConflict(t, e, s) {
    return this.post(`/sync/conflicts/${encodeURIComponent(t)}/resolve`, e, s);
  }
  async listSchemaDrift(t, e) {
    const s = this.buildListParams(t);
    return this.get("/sync/schema-drift", s, e);
  }
  async setSchemaDriftBaseline(t, e) {
    return this.post("/sync/schema-drift/baseline", t, e);
  }
  async listConnectionCandidates(t, e) {
    const s = this.buildListParams(t);
    return this.get("/connection-candidates", s, e);
  }
  async getCallbackDiagnosticsStatus(t, e) {
    const s = { provider_id: t?.trim() || void 0 };
    return this.get("/callbacks/diagnostics/status", s, e);
  }
  async previewCallbackDiagnostics(t, e) {
    return this.post("/callbacks/diagnostics/preview", t, e);
  }
  async invokeCapability(t, e, s = {}, i) {
    return this.post(`/capabilities/${encodeURIComponent(t)}/${encodeURIComponent(e)}/invoke`, s, i);
  }
  async listActivity(t = {}, e) {
    const s = this.buildActivityParams(t);
    return this.get("/activity", s, e);
  }
  async getStatus(t) {
    return this.get("/status", {}, t);
  }
  async runRetentionCleanup(t) {
    return this.post("/activity/retention/cleanup", {}, t);
  }
  async processWebhook(t, e, s) {
    return this.post(`/webhooks/${encodeURIComponent(t)}`, e, void 0, s);
  }
  async dispatchInbound(t, e, s, i) {
    return this.post(`/inbound/${encodeURIComponent(t)}/${encodeURIComponent(e)}`, s, void 0, i);
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
  async get(t, e = {}, s) {
    const i = this.buildUrl(t, e), r = new AbortController(), n = () => r.abort();
    s && (s.aborted ? r.abort() : s.addEventListener("abort", n, { once: !0 })), this.abortControllers.set(t, r);
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
      s && s.removeEventListener("abort", n), this.abortControllers.delete(t);
    }
  }
  async post(t, e, s, i) {
    const r = this.buildUrl(t), n = new AbortController();
    this.abortControllers.set(t, n);
    const o = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
      ...i
    };
    o["Idempotency-Key"] = s && s.trim() || this.createIdempotencyKey(t);
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
    const s = this.config.basePath.replace(/\/$/, ""), i = new URL(`${s}${t}`, Ft());
    for (const [r, n] of Object.entries(e)) n != null && n !== "" && i.searchParams.set(r, String(n));
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
      const s = st.fromResponse(t.status, e);
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
}, H = null;
function A() {
  return H || (H = new Ct()), H;
}
function Pe(t) {
  H = t;
}
function Re(t = {}) {
  return new Ct(t);
}
var Nt = {
  defaultPage: 1,
  defaultPerPage: 25,
  searchDelay: 300,
  useReplaceState: !1
};
function Q() {
  if (typeof window < "u") return window;
}
function at() {
  if (!(typeof globalThis > "u"))
    return globalThis.localStorage;
}
var D = class {
  constructor(t = {}) {
    this.searchTimeout = null, this.initialized = !1, this.config = {
      ...Nt,
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
    for (const [e, s] of Object.entries(this.state.filters)) if (s != null && s !== "") if (this.dateFields.has(e)) {
      const i = this.toRFC3339(s);
      i && (t[e] = i);
    } else t[e] = s;
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
    for (const [s, i] of Object.entries(t)) this.state.filters[s] !== i && (i == null || i === "" ? delete this.state.filters[s] : this.state.filters[s] = i, e = !0);
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
    const s = Math.ceil(t / this.state.per_page);
    this.state.page > s && s > 0 && this.setPage(s);
  }
  destroy() {
    this.searchTimeout && clearTimeout(this.searchTimeout);
  }
  restoreFromURL() {
    const t = Q();
    if (!t?.location) return;
    const e = new URLSearchParams(t.location.search), s = e.get("page");
    if (s) {
      const a = parseInt(s, 10);
      !Number.isNaN(a) && a > 0 && (this.state.page = a);
    }
    const i = e.get("per_page");
    if (i) {
      const a = parseInt(i, 10);
      !Number.isNaN(a) && a > 0 && (this.state.per_page = a);
    }
    const r = e.get("q") || e.get("search");
    r && (this.state.search = r);
    const n = e.get("sort_field"), o = e.get("sort_order");
    n && (this.state.sort_field = n, this.state.sort_order = o === "desc" ? "desc" : "asc");
    for (const a of this.filterFields) {
      const c = e.get(String(a));
      c !== null && (this.dateFields.has(a) ? this.state.filters[a] = this.toLocalInput(c) : this.state.filters[a] = c);
    }
  }
  restoreFromStorage() {
    if (!this.storageKey) return;
    const t = at(), e = Q();
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
        t.setItem(this.storageKey, JSON.stringify({ per_page: this.state.per_page }));
      } catch (e) {
        console.warn("[QueryStateManager] Failed to save to localStorage:", e);
      }
  }
  syncToURL() {
    const t = Q();
    if (!t?.location || !t.history) return;
    const e = new URLSearchParams();
    this.state.page > 1 && e.set("page", String(this.state.page)), this.state.per_page !== this.config.defaultPerPage && e.set("per_page", String(this.state.per_page)), this.state.search && e.set("q", this.state.search), this.state.sort_field && (e.set("sort_field", this.state.sort_field), this.state.sort_order && e.set("sort_order", this.state.sort_order));
    for (const [i, r] of Object.entries(this.state.filters)) if (r != null && r !== "") if (this.dateFields.has(i)) {
      const n = this.toRFC3339(r);
      n && e.set(i, n);
    } else e.set(i, r);
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
};
function qe(t, e) {
  let s = null;
  return Object.assign(((...n) => {
    s && clearTimeout(s), s = setTimeout(() => {
      t(...n), s = null;
    }, e);
  }), { cancel: () => {
    s && (clearTimeout(s), s = null);
  } });
}
function Ie(t, e) {
  if (!("filters" in t)) {
    const o = t, a = new URLSearchParams();
    for (const [c, l] of Object.entries(o)) l != null && l !== "" && a.set(c, String(l));
    return a;
  }
  const s = t, i = new URLSearchParams(), { includePage: r = !0, includeDefaults: n = !1 } = e || {};
  r && (s.page > 1 || n) && i.set("page", String(s.page)), (s.per_page !== 25 || n) && i.set("per_page", String(s.per_page)), s.search && i.set("q", s.search), s.sort_field && (i.set("sort_field", s.sort_field), s.sort_order && i.set("sort_order", s.sort_order));
  for (const [o, a] of Object.entries(s.filters)) a != null && a !== "" && i.set(o, a);
  return i;
}
function Me(t, e, s) {
  if (!s) {
    const c = {};
    for (const l of e) {
      const u = t.get(String(l));
      u !== null && (c[String(l)] = u);
    }
    for (const l of [
      "page",
      "per_page",
      "q",
      "search",
      "sort_field",
      "sort_order"
    ]) {
      const u = t.get(l);
      u !== null && (c[l] = u);
    }
    return c;
  }
  const i = {
    page: s?.page ?? 1,
    per_page: s?.per_page ?? 25,
    search: s?.search ?? "",
    filters: {},
    ...s
  }, r = t.get("page");
  if (r) {
    const c = parseInt(r, 10);
    Number.isNaN(c) || (i.page = Math.max(1, c));
  }
  const n = t.get("per_page");
  if (n) {
    const c = parseInt(n, 10);
    Number.isNaN(c) || (i.per_page = Math.max(1, c));
  }
  const o = t.get("q") || t.get("search");
  o && (i.search = o);
  const a = t.get("sort_field");
  a && (i.sort_field = a, i.sort_order = t.get("sort_order") === "desc" ? "desc" : "asc");
  for (const c of e) {
    const l = t.get(String(c));
    l !== null && (i.filters[c] = l);
  }
  return i;
}
var U = class {
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
}, K = null;
function _() {
  return K || (K = new U()), K;
}
function Fe(t) {
  _().init(t);
}
function P(t, e) {
  return (s) => {
    const i = s instanceof U ? s : e || _(), r = Array.isArray(t) ? t : [t];
    return () => i.hasAll(r);
  };
}
function Ne(t, e) {
  return (s) => {
    const i = s instanceof U ? s : e || _();
    return () => i.hasAll(t);
  };
}
function He(t, e) {
  return (s) => {
    const i = s instanceof U ? s : e || _();
    return () => i.hasAny(t);
  };
}
function je(...t) {
  const e = t.flatMap((s) => Array.isArray(s) ? s : [s]);
  return (s) => () => e.every((i) => i(s)());
}
function M(t) {
  return P(C.VIEW, t)();
}
function k(t) {
  return P(C.CONNECT, t)();
}
function R(t) {
  return P(C.EDIT, t)();
}
function it(t) {
  return P(C.REVOKE, t)();
}
function _t(t) {
  return P(C.RECONSENT, t)();
}
function Ht(t) {
  return P(C.ACTIVITY_VIEW, t)();
}
function jt(t) {
  if (t instanceof st) return t.isForbidden;
  if (!t || typeof t != "object") return !1;
  const e = t;
  return e.isForbidden === !0 || e.statusCode === 403 || e.code === "FORBIDDEN";
}
function De(t, e) {
  return jt(t) ? (e(t), !0) : !1;
}
function Ue(t, e, s, i) {
  const r = i || _();
  return async () => {
    if (!r.has(t)) {
      s?.();
      return;
    }
    return e();
  };
}
function Y(t, e, s) {
  const i = s || _(), { requires: r = [], requiresAny: n = [], onDenied: o, disableOnDenied: a } = e;
  let c = !0, l = [];
  r.length > 0 ? (l = i.getMissing(r), c = l.length === 0) : n.length > 0 && (c = i.hasAny(n), c || (l = n)), c || (a ? ((t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0), t.classList.add("permission-denied", "opacity-50", "cursor-not-allowed"), t.setAttribute("title", `Permission required: ${l.join(", ")}`)) : (t.style.display = "none", t.classList.add("permission-hidden")), e.deniedContent && (typeof e.deniedContent == "string" ? t.outerHTML = e.deniedContent : t.replaceWith(e.deniedContent)), o?.(l));
}
function Oe(t = document.body, e) {
  t.querySelectorAll("[data-permission-requires]").forEach((s) => {
    const i = s.dataset.permissionRequires?.split(",").map((r) => r.trim());
    i && i.length > 0 && Y(s, { requires: i }, e);
  }), t.querySelectorAll("[data-permission-requires-any]").forEach((s) => {
    const i = s.dataset.permissionRequiresAny?.split(",").map((r) => r.trim());
    i && i.length > 0 && Y(s, { requiresAny: i }, e);
  }), t.querySelectorAll("[data-permission-disable]").forEach((s) => {
    const i = s.dataset.permissionDisable?.split(",").map((r) => r.trim());
    i && i.length > 0 && Y(s, {
      requires: i,
      disableOnDenied: !0
    }, e);
  });
}
function Dt() {
  if (typeof window > "u" || typeof document > "u") return [];
  const t = window.__permissions;
  if (Array.isArray(t)) return t.filter((s) => Object.values(C).includes(s));
  const e = document.body.dataset.permissions;
  if (e) try {
    const s = JSON.parse(e);
    if (Array.isArray(s)) return s.filter((i) => Object.values(C).includes(i));
  } catch {
  }
  return [];
}
function ze() {
  const t = Dt(), e = _();
  return e.init(t), e;
}
var Lt = {
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
function O(t = {}) {
  const { text: e = "Loading...", size: s = "md", containerClass: i = "" } = t, r = {
    sm: {
      spinner: "h-4 w-4",
      text: "text-xs",
      py: "py-4"
    },
    md: {
      spinner: "h-5 w-5",
      text: "text-sm",
      py: "py-8"
    },
    lg: {
      spinner: "h-8 w-8",
      text: "text-base",
      py: "py-16"
    }
  }[s];
  return `
    <div class="ui-state ui-state-loading flex items-center justify-center ${r.py} ${i}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <svg class="animate-spin ${r.spinner}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="${r.text}">${f(e)}</span>
      </div>
    </div>
  `;
}
function Tt(t = {}) {
  const e = Lt[t.type || "generic"], { icon: s = e.icon, iconClass: i = "text-gray-400", title: r = e.title, message: n = e.message, containerClass: o = "", action: a } = t;
  return `
    <div class="ui-state ui-state-empty flex items-center justify-center py-12 ${o}" role="status" aria-label="Empty">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${d(s, {
    size: "24px",
    extraClass: i
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${f(r)}</h3>
          <p class="text-sm text-gray-500 mt-1">${f(n)}</p>
        </div>
        ${a ? Et(a) : ""}
      </div>
    </div>
  `;
}
function kt(t = {}) {
  const { icon: e = "iconoir:search", iconClass: s = "text-gray-400", title: i = "No results found", query: r, filterCount: n = 0, containerClass: o = "", onReset: a } = t;
  let c = t.message;
  return c || (r && n > 0 ? c = `No items match "${r}" with ${n} filter${n > 1 ? "s" : ""} applied.` : r ? c = `No items match "${r}".` : n > 0 ? c = `No items match the ${n} filter${n > 1 ? "s" : ""} applied.` : c = "Try adjusting your search or filters."), `
    <div class="ui-state ui-state-no-results flex items-center justify-center py-12 ${o}" role="status" aria-label="No results">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${d(e, {
    size: "24px",
    extraClass: s
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${f(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${f(c)}</p>
        </div>
        ${a ? `
          <button type="button" class="ui-state-reset-btn px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
            Clear filters
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function z(t = {}) {
  const { icon: e = "iconoir:warning-triangle", iconClass: s = "text-red-500", title: i = "Something went wrong", error: r, compact: n = !1, containerClass: o = "", showRetry: a = !0, retryText: c = "Try again" } = t, l = t.message || r?.message || "An unexpected error occurred. Please try again.";
  return n ? `
      <div class="ui-state ui-state-error ui-state-error-compact p-4 ${o}" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-red-500" aria-hidden="true">
            ${d(e, {
    size: "20px",
    extraClass: s
  })}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800">${f(i)}</p>
            <p class="text-sm text-red-700 mt-1">${f(l)}</p>
          </div>
          ${a ? `
            <button type="button" class="ui-state-retry-btn flex-shrink-0 text-sm text-red-600 hover:text-red-700 font-medium">
              ${f(c)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : `
    <div class="ui-state ui-state-error flex items-center justify-center py-16 ${o}" role="alert">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
          ${d(e, {
    size: "24px",
    extraClass: s
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${f(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${f(l)}</p>
        </div>
        ${a ? `
          <button type="button" class="ui-state-retry-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            ${f(c)}
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function L(t = {}) {
  const { icon: e = "iconoir:lock", iconClass: s = "text-amber-500", title: i = "Access Denied", resource: r, permission: n, containerClass: o = "", action: a } = t;
  let c = t.message;
  return c || (r && n ? c = `You need the "${n}" permission to view ${r}.` : r ? c = `You don't have permission to view ${r}.` : c = "You don't have permission to access this resource."), `
    <div class="ui-state ui-state-forbidden flex items-center justify-center py-16 ${o}" role="alert" aria-label="Access denied">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
          ${d(e, {
    size: "24px",
    extraClass: s
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${f(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${f(c)}</p>
        </div>
        ${a ? Et(a) : ""}
      </div>
    </div>
  `;
}
function B(t, e = {}) {
  const { text: s = "Loading...", containerClass: i = "" } = e;
  return `
    <tr class="ui-state ui-state-table-loading ${i}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-500" aria-busy="true">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">${f(s)}</span>
        </div>
      </td>
    </tr>
  `;
}
function V(t, e = {}) {
  const { icon: s = "iconoir:warning-triangle", iconClass: i = "text-red-500", title: r = "Failed to load data", error: n, containerClass: o = "", showRetry: a = !0, retryText: c = "Try again" } = e, l = e.message || n?.message || "An error occurred while loading.";
  return `
    <tr class="ui-state ui-state-table-error ${o}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="text-red-500 mb-2" aria-hidden="true">
          ${d(s, {
    size: "24px",
    extraClass: i
  })}
        </div>
        <p class="text-sm font-medium text-gray-900">${f(r)}</p>
        <p class="text-sm text-gray-500 mt-1">${f(l)}</p>
        ${a ? `
          <button type="button" class="ui-state-retry-btn mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            ${f(c)}
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
function Be(t, e = {}) {
  const s = Lt[e.type || "generic"], { icon: i = s.icon, iconClass: r = "text-gray-400", title: n = s.title, message: o = s.message, containerClass: a = "" } = e;
  return `
    <tr class="ui-state ui-state-table-empty ${a}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${d(i, {
    size: "24px",
    extraClass: r
  })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${f(n)}</h3>
        <p class="text-sm text-gray-500 mt-1">${f(o)}</p>
      </td>
    </tr>
  `;
}
function I(t, e = {}) {
  const { icon: s = "iconoir:search", iconClass: i = "text-gray-400", title: r = "No results found", query: n, filterCount: o = 0, containerClass: a = "", onReset: c } = e;
  let l = e.message;
  return l || (n && o > 0 ? l = `No items match "${n}" with ${o} filter${o > 1 ? "s" : ""} applied.` : n ? l = `No items match "${n}".` : o > 0 ? l = `No items match the ${o} filter${o > 1 ? "s" : ""} applied.` : l = "Try adjusting your search or filters."), `
    <tr class="ui-state ui-state-table-no-results ${a}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${d(s, {
    size: "24px",
    extraClass: i
  })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${f(r)}</h3>
        <p class="text-sm text-gray-500 mt-1">${f(l)}</p>
        ${c ? `
          <button type="button" class="ui-state-reset-btn mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
var Ve = class {
  constructor(t) {
    this.currentState = "loading", this.container = t.container, this.config = t;
  }
  showLoading(t) {
    this.currentState = "loading", this.container.innerHTML = O(t);
  }
  showEmpty(t) {
    this.currentState = "empty", this.container.innerHTML = Tt(t);
  }
  showNoResults(t) {
    this.currentState = "no-results";
    const e = {
      ...t,
      onReset: t?.onReset || this.config.onReset
    };
    this.container.innerHTML = kt(e), this.bindResetHandler();
  }
  showError(t) {
    this.currentState = "error";
    const e = {
      ...t,
      onRetry: t?.onRetry || this.config.onRetry
    };
    this.container.innerHTML = z(e), this.bindRetryHandler();
  }
  showForbidden(t) {
    this.currentState = "forbidden", this.container.innerHTML = L(t);
  }
  showContent() {
    this.currentState = "content";
  }
  getState() {
    return this.currentState;
  }
  isLoading() {
    return this.currentState === "loading";
  }
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
};
function Et(t) {
  return `
    <button type="button" class="ui-state-action-btn px-4 py-2 text-sm font-medium rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${{
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  }[t.variant || "primary"]}">
      ${f(t.text)}
    </button>
  `;
}
function f(t) {
  const e = document.createElement("div");
  return e.textContent = t, e.innerHTML;
}
var Ut = class {
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
    this.button.innerHTML = `${t}<span>${E(this.config.loadingText)}</span>`;
  }
  setSuccess() {
    this.clearFeedbackTimeout(), this.state = "success", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-error"), this.button.classList.add("mutation-success"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${E(this.config.successText)}</span>
    `, this.feedbackTimeout = setTimeout(() => {
      this.reset();
    }, this.config.feedbackDuration);
  }
  setError() {
    this.clearFeedbackTimeout(), this.state = "error", this.button.disabled = this.originalDisabled, this.button.classList.remove("mutation-loading", "mutation-success"), this.button.classList.add("mutation-error"), this.button.innerHTML = `
      <svg class="-ml-1 mr-2 h-4 w-4 inline-block text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>${E(this.config.errorText)}</span>
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
async function v(t) {
  const { mutation: e, notifier: s, successMessage: i, errorMessagePrefix: r = "Operation failed", buttonConfig: n, onSuccess: o, onError: a, showInlineRetry: c = !1, retryContainer: l } = t, u = n ? new Ut(n) : null;
  try {
    u?.setLoading();
    const g = await e();
    if (u?.setSuccess(), s && i) {
      const p = typeof i == "function" ? i(g) : i;
      s.success(p);
    }
    return l && tt(l), await o?.(g), {
      success: !0,
      result: g
    };
  } catch (g) {
    const p = g instanceof Error ? g : new Error(String(g));
    return u?.setError(), s && s.error(`${r}: ${p.message}`), c && l && Ot({
      container: l,
      action: () => v(t).then(() => {
      }),
      errorMessage: `${r}: ${p.message}`,
      onDismiss: () => tt(l)
    }), a?.(p), {
      success: !1,
      error: p
    };
  }
}
async function We(t) {
  const { confirmMessage: e, confirmOptions: s, ...i } = t;
  return await wt.confirm(e, {
    title: s?.title ?? "Confirm Action",
    confirmText: s?.confirmText ?? "Confirm",
    cancelText: s?.cancelText ?? "Cancel",
    confirmVariant: s?.variant ?? "primary"
  }) ? {
    ...await v(i),
    cancelled: !1
  } : {
    success: !1,
    cancelled: !0
  };
}
function Ot(t) {
  const { container: e, action: s, errorMessage: i, retryText: r = "Retry", dismissText: n = "Dismiss", onDismiss: o } = t;
  e.innerHTML = `
    <div class="mutation-retry-ui flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div class="flex-shrink-0 text-red-500" aria-hidden="true">
        ${d("iconoir:warning-triangle", { size: "20px" })}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-red-700">${E(i)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button"
                  class="mutation-retry-btn px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors">
            ${E(r)}
          </button>
          <button type="button"
                  class="mutation-dismiss-btn px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
            ${E(n)}
          </button>
        </div>
      </div>
    </div>
  `;
  const a = e.querySelector(".mutation-retry-btn"), c = e.querySelector(".mutation-dismiss-btn");
  a?.addEventListener("click", async () => {
    const l = a, u = l.textContent;
    l.disabled = !0, l.innerHTML = `
      <svg class="animate-spin h-3 w-3 inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Retrying...
    `;
    try {
      await s();
    } finally {
      l.disabled = !1, l.textContent = u;
    }
  }), c?.addEventListener("click", () => {
    tt(e), o?.();
  });
}
function tt(t) {
  t.querySelector(".mutation-retry-ui")?.remove();
}
function zt(t) {
  const { action: e, resourceType: s, resourceName: i, additionalContext: r } = t, n = {
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
  }, c = o[s] || s;
  let l = `Are you sure you want to ${a.verb} this ${c}`;
  return i && (l += ` (${i})`), l += "?", r && (l += ` ${r}`), a.variant === "danger" && (l += " This action cannot be undone."), {
    message: l,
    options: {
      title: `${a.noun} ${c.charAt(0).toUpperCase() + c.slice(1)}`,
      confirmText: a.noun,
      cancelText: "Cancel",
      variant: a.variant
    }
  };
}
async function W(t) {
  const { message: e, options: s } = zt(t);
  return wt.confirm(e, s);
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
};
function E(t) {
  const e = document.createElement("div");
  return e.textContent = t, e.innerHTML;
}
var F = {
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
}, Bt = class {
  constructor() {
    this.backendLabels = {}, this.initialized = !1, this.fallbackFormatter = ot;
  }
  init(t = {}) {
    t.labels && (this.backendLabels = { ...t.labels }), t.fallbackFormatter && (this.fallbackFormatter = t.fallbackFormatter), this.initialized = !0;
  }
  isInitialized() {
    return this.initialized;
  }
  getLabel(t) {
    if (this.backendLabels[t]) return this.backendLabels[t];
    const e = F[t];
    return e ? e.label : this.fallbackFormatter(t);
  }
  getEntry(t) {
    const e = F[t];
    return e ? {
      ...e,
      label: this.backendLabels[t] || e.label
    } : null;
  }
  getAllLabels() {
    const t = {};
    for (const [e, s] of Object.entries(F)) t[e] = s.label;
    for (const [e, s] of Object.entries(this.backendLabels)) t[e] = s;
    return t;
  }
  getActionsByCategory() {
    const t = {};
    for (const e of Object.values(F)) {
      const s = e.category || "other";
      t[s] || (t[s] = []), t[s].push({
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
    this.backendLabels = {}, this.fallbackFormatter = ot, this.initialized = !1;
  }
}, S = new Bt();
function Je(t = {}) {
  S.init(t);
}
function Vt(t) {
  return S.getLabel(t);
}
function Ge(t) {
  return S.getEntry(t);
}
function Qe() {
  return S.getAllLabels();
}
function Wt() {
  return S.getActionsByCategory();
}
function Ke(t) {
  S.setLabels(t);
}
function Ye() {
  return S.isInitialized();
}
function Ze() {
  S.reset();
}
function Xe(t = {}) {
  return (e) => t[e] ? t[e] : S.getLabel(e);
}
function ot(t) {
  return t.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
var Jt = "/admin/services", Gt = {
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
function ct() {
  if (!(typeof globalThis > "u"))
    return globalThis.sessionStorage;
}
function Qt(t) {
  const e = T();
  if (e && typeof e.btoa == "function") return e.btoa(t);
  const s = globalThis.Buffer;
  if (s) return s.from(t, "utf8").toString("base64");
  throw new Error("base64 encoding is unavailable");
}
function Kt(t) {
  const e = T();
  if (e && typeof e.atob == "function") return e.atob(t);
  const s = globalThis.Buffer;
  if (s) return s.from(t, "base64").toString("utf8");
  throw new Error("base64 decoding is unavailable");
}
var Yt = class {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || Jt, this.pathMap = {
      ...Gt,
      ...t.pathMap
    };
  }
  configure(t) {
    t.basePath && (this.basePath = t.basePath), t.pathMap && (this.pathMap = {
      ...this.pathMap,
      ...t.pathMap
    });
  }
  generateLink(t, e, s) {
    const i = this.pathMap[t] || t;
    let r = `${this.basePath}/${i}/${encodeURIComponent(e)}`;
    if (s) {
      const n = this.encodeContext(s);
      n && (r += `?ctx=${n}`);
    }
    return r;
  }
  generateListLink(t, e) {
    const s = this.pathMap[t] || t;
    let i = `${this.basePath}/${s}`;
    if (e && Object.keys(e).length > 0) {
      const r = new URLSearchParams();
      for (const [n, o] of Object.entries(e)) o && r.set(n, o);
      i += `?${r.toString()}`;
    }
    return i;
  }
  navigateTo(t, e, s, i = {}) {
    const r = T();
    if (!r?.history) return;
    s && this.saveContext(s);
    const n = this.generateLink(t, e, s);
    i.replace ? r.history.replaceState({
      entityType: t,
      entityId: e,
      context: s
    }, "", n) : r.history.pushState({
      entityType: t,
      entityId: e,
      context: s
    }, "", n), r.dispatchEvent(new CustomEvent("services:navigate", { detail: {
      entityType: t,
      entityId: e,
      context: s,
      url: n
    } }));
  }
  navigateBack() {
    const t = T();
    if (!t?.history) return this.restoreContext();
    const e = this.restoreContext();
    if (e?.fromPage) {
      const s = new URLSearchParams();
      if (e.filters)
        for (const [n, o] of Object.entries(e.filters)) o && s.set(n, o);
      e.search && s.set("q", e.search), e.page && e.page > 1 && s.set("page", String(e.page)), e.viewMode && s.set("view", e.viewMode);
      const i = s.toString(), r = i ? `${e.fromPage}?${i}` : e.fromPage;
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
    const [e, s] = t.split("?"), i = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (i.length < 2) return null;
    const r = i[0], n = decodeURIComponent(i[1]);
    let o = null;
    for (const [c, l] of Object.entries(this.pathMap)) if (l === r) {
      o = c;
      break;
    }
    if (!o) return null;
    let a;
    if (s) {
      const c = new URLSearchParams(s).get("ctx");
      c && (a = this.decodeContext(c));
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
    const s = {};
    for (const [i, r] of Object.entries(t.filters)) r && (s[i] = r);
    return {
      fromPage: T()?.location?.pathname,
      filters: Object.keys(s).length > 0 ? s : void 0,
      search: t.search || void 0,
      page: t.page > 1 ? t.page : void 0,
      viewMode: e
    };
  }
  saveContext(t) {
    const e = ct();
    if (e)
      try {
        e.setItem(this.contextStorageKey, JSON.stringify(t));
      } catch {
      }
  }
  restoreContext() {
    const t = ct();
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
      return Qt(JSON.stringify(t));
    } catch {
      return "";
    }
  }
  decodeContext(t) {
    try {
      return JSON.parse(Kt(t));
    } catch {
      return;
    }
  }
}, w = new Yt();
function ts(t) {
  w.configure(t);
}
function Zt(t, e, s) {
  return w.generateLink(t, e, s);
}
function es(t, e) {
  return w.generateListLink(t, e);
}
function Xt(t, e, s, i) {
  w.navigateTo(t, e, s, i);
}
function ss() {
  return w.navigateBack();
}
function is() {
  return w.parseCurrentUrl();
}
function rs(t) {
  return w.parseUrl(t);
}
function At(t) {
  return w.mapObjectTypeToEntity(t);
}
function te(t, e) {
  return w.createContextFromQueryState(t, e);
}
function ee(t, e) {
  return (s, i) => {
    const r = At(s);
    if (!r) {
      console.warn(`[DeepLinks] Unknown object type: ${s}`);
      return;
    }
    Xt(r, i, te(t(), e?.()));
  };
}
function se(t) {
  const { container: e, selector: s, onSelect: i, onFocus: r, onEscape: n, wrap: o = !0, autoFocus: a = !1, keyHandlers: c = {} } = t;
  function l() {
    return Array.from(e.querySelectorAll(s));
  }
  function u(h) {
    const b = l();
    if (b.length === 0) return;
    let x = h;
    o ? x = (h % b.length + b.length) % b.length : x = Math.max(0, Math.min(h, b.length - 1)), b.forEach((Pt, Rt) => {
      Pt.setAttribute("tabindex", Rt === x ? "0" : "-1");
    });
    const $ = b[x];
    $.focus(), r?.($, x);
  }
  function g(h) {
    const b = l();
    if (b.length === 0) return;
    const x = h.target, $ = b.indexOf(x);
    if ($ !== -1) {
      if (c[h.key]) {
        c[h.key](h, x, $);
        return;
      }
      switch (h.key) {
        case "ArrowDown":
        case "ArrowRight":
          h.preventDefault(), u($ + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          h.preventDefault(), u($ - 1);
          break;
        case "Home":
          h.preventDefault(), u(0);
          break;
        case "End":
          h.preventDefault(), u(b.length - 1);
          break;
        case "Enter":
        case " ":
          h.preventDefault(), i?.(x, $);
          break;
        case "Escape":
          h.preventDefault(), n?.();
          break;
      }
    }
  }
  const p = l();
  return p.forEach((h, b) => {
    h.setAttribute("tabindex", b === 0 ? "0" : "-1"), h.hasAttribute("role") || h.setAttribute("role", "option");
  }), e.hasAttribute("role") || e.setAttribute("role", "listbox"), e.addEventListener("keydown", g), a && p.length > 0 && u(0), () => {
    e.removeEventListener("keydown", g);
  };
}
function ns(t, e) {
  return se({
    container: t,
    selector: e,
    wrap: !0,
    onSelect: (s) => {
      s.click();
    }
  });
}
var ie = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function re(t) {
  const { container: e, initialFocus: s, returnFocus: i, onEscape: r } = t, n = document.activeElement;
  function o() {
    return Array.from(e.querySelectorAll(ie));
  }
  function a(c) {
    if (c.key === "Escape") {
      c.preventDefault(), r?.();
      return;
    }
    if (c.key !== "Tab") return;
    const l = o();
    if (l.length === 0) return;
    const u = l[0], g = l[l.length - 1];
    c.shiftKey ? document.activeElement === u && (c.preventDefault(), g.focus()) : document.activeElement === g && (c.preventDefault(), u.focus());
  }
  return requestAnimationFrame(() => {
    s ? (typeof s == "string" ? e.querySelector(s) : s)?.focus() : o()[0]?.focus();
  }), e.addEventListener("keydown", a), e.hasAttribute("role") || e.setAttribute("role", "dialog"), e.setAttribute("aria-modal", "true"), () => {
    e.removeEventListener("keydown", a), e.removeAttribute("aria-modal"), (i || n)?.focus?.();
  };
}
function ne(t) {
  const e = `services-live-region-${t}`;
  let s = document.getElementById(e);
  return s || (s = document.createElement("div"), s.id = e, s.setAttribute("aria-live", t), s.setAttribute("aria-atomic", "true"), s.setAttribute("role", "status"), s.className = "sr-only", Object.assign(s.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0"
  }), document.body.appendChild(s)), s;
}
function G(t, e = {}) {
  const { priority: s = "polite", clear: i = !0 } = e, r = ne(s);
  i && (r.textContent = ""), setTimeout(() => {
    r.textContent = t;
  }, 100);
}
function as(t) {
  G(`Loading ${t}...`, { priority: "polite" });
}
function os(t) {
  G(t, { priority: "polite" });
}
function cs(t) {
  G(`Error: ${t}`, { priority: "assertive" });
}
function ls(t) {
  G(`Navigating to ${t}`, { priority: "polite" });
}
function ds(t, e, s) {
  t.setAttribute("aria-expanded", String(s));
  const i = typeof e == "string" ? e : e.id;
  i && t.setAttribute("aria-controls", i);
}
function us(t, e) {
  t.setAttribute("aria-busy", String(e)), e ? t.setAttribute("aria-describedby", "loading-indicator") : t.removeAttribute("aria-describedby");
}
function hs(t, e, s) {
  t.setAttribute("role", "status"), t.setAttribute("aria-label", `Status: ${s}`);
}
function ps(t, e) {
  t.setAttribute("aria-sort", e), t.setAttribute("role", "columnheader");
}
function gs(t, e, s = 100, i) {
  t.setAttribute("role", "progressbar"), t.setAttribute("aria-valuenow", String(e)), t.setAttribute("aria-valuemin", "0"), t.setAttribute("aria-valuemax", String(s)), i && t.setAttribute("aria-label", i);
}
function fs(t, e = "Skip to main content") {
  const s = document.createElement("a");
  return s.href = `#${t}`, s.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg", s.textContent = e, s;
}
function ms(t, e = {}) {
  const { title: s, describedBy: i, onClose: r } = e;
  if (t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), s) {
    const o = `dialog-title-${Date.now()}`, a = t.querySelector('h1, h2, h3, [role="heading"]');
    a && (a.id = o, t.setAttribute("aria-labelledby", o));
  }
  i && t.setAttribute("aria-describedby", i);
  const n = re({
    container: t,
    onEscape: r
  });
  return () => {
    n(), t.removeAttribute("aria-modal"), t.removeAttribute("aria-labelledby"), t.removeAttribute("aria-describedby");
  };
}
function ae() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function bs(t) {
  return ae() ? 0 : t;
}
var lt = {
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
}, oe = {
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
}, ys = class {
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
              ${d("iconoir:refresh", { size: "16px" })}
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
                ${d("iconoir:warning-circle", { size: "18px" })}
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
          ${Object.entries(s).map(([i, r]) => {
      const n = lt[i];
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
    const t = this.state.configHealth, e = oe[t.status];
    return `
      <div class="bg-white rounded-lg border ${t.status === "healthy" ? "border-gray-200" : "border-amber-200"} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">Config Health</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${e.bg} ${e.text}">
            ${d(e.icon, { size: "12px" })}
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
    const e = lt[t.status];
    return `
      <div class="pack-row px-4 py-3 hover:bg-gray-50 cursor-pointer" data-pack-id="${m(t.id)}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${m(t.name)}</span>
              <span class="text-xs text-gray-400">v${m(t.version)}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${e.bg} ${e.text}">
                ${d(e.icon, { size: "10px" })}
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
            ${d("iconoir:nav-arrow-right", {
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
            ${d("iconoir:warning-circle", {
      size: "16px",
      extraClass: "text-red-500"
    })}
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
  bindEvents() {
    this.container && (this.container.querySelector(".diagnostics-refresh")?.addEventListener("click", () => this.refresh()), this.container.querySelectorAll(".pack-row").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.packId;
        e && this.config.onPackSelect && this.config.onPackSelect(e);
      });
    }), this.container.querySelectorAll(".error-row").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.errorId, s = this.state?.recentErrors.find((i) => i.id === e);
        s && this.config.onErrorSelect && this.config.onErrorSelect(s);
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
    for (const s of t) e[s.status] = (e[s.status] || 0) + 1;
    return e;
  }
  countHookStatus(t) {
    let e = 0, s = 0;
    for (const i of t) i.enabled ? e++ : s++;
    return {
      active: e,
      disabled: s
    };
  }
  formatTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), i = Math.floor(s / 6e4), r = Math.floor(s / 36e5);
    return i < 1 ? "just now" : i < 60 ? `${i}m ago` : r < 24 ? `${r}h ago` : e.toLocaleDateString();
  }
};
function j(t) {
  const { source: e, packName: s, mode: i = "badge", context: r } = t, n = {
    "go-services": {
      label: "Core",
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "iconoir:box-3d-center",
      description: "Managed by go-services core"
    },
    downstream: {
      label: s || "Extension",
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: "iconoir:plug",
      description: `Managed by ${s || "downstream extension"}`
    },
    mixed: {
      label: "Mixed",
      bg: "bg-gray-50",
      text: "text-gray-700",
      icon: "iconoir:layers",
      description: "Combination of core and extension data"
    }
  }[e];
  return i === "tooltip" ? `
      <span class="state-source-indicator inline-flex items-center"
            title="${m(n.description)}${r ? ` - ${r}` : ""}"
            aria-label="${m(n.description)}">
        ${d(n.icon, {
    size: "14px",
    extraClass: n.text
  })}
      </span>
    ` : `
    <span class="state-source-indicator inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${n.bg} ${n.text}"
          title="${m(n.description)}${r ? ` - ${r}` : ""}"
          role="note"
          aria-label="State source: ${m(n.description)}">
      ${d(n.icon, { size: "12px" })}
      <span>${m(n.label)}</span>
    </span>
  `;
}
function vs(t, e) {
  const s = document.createElement("span");
  s.innerHTML = j(e), t.appendChild(s.firstElementChild);
}
function xs() {
  return `
    <div class="state-source-legend p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">State Source Legend</h4>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          ${j({ source: "go-services" })}
          <span class="text-sm text-gray-600">Data managed by go-services core runtime</span>
        </div>
        <div class="flex items-center gap-3">
          ${j({
    source: "downstream",
    packName: "Extension"
  })}
          <span class="text-sm text-gray-600">Data managed by an installed extension package</span>
        </div>
        <div class="flex items-center gap-3">
          ${j({ source: "mixed" })}
          <span class="text-sm text-gray-600">Combination of core and extension-managed data</span>
        </div>
      </div>
    </div>
  `;
}
function m(t) {
  const e = document.createElement("div");
  return e.textContent = t, e.innerHTML;
}
function ce() {
  const t = globalThis.window;
  return t?.toastManager ? t.toastManager : new qt();
}
function y(t) {
  return String(t || "").trim();
}
function le(t) {
  return t.replace(/[A-Z]/g, (e) => `-${e.toLowerCase()}`).replace(/^-+/, "");
}
function de(t) {
  return le(t).replace(/-/g, "_");
}
function dt(t) {
  return String(t || "").split(",").map((e) => e.trim()).filter(Boolean);
}
function et(t) {
  return String(t || "").trim().toLowerCase() || void 0;
}
function ue() {
  const t = globalThis.crypto;
  return t?.randomUUID ? t.randomUUID() : `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function he(t) {
  const e = String(t.correlation_id || "").trim();
  if (e) return e;
  const s = ue();
  return t.correlation_id = s, s;
}
function q(t, e) {
  if (t && typeof t == "object") {
    const s = t;
    if (typeof s.message == "string") return {
      textCode: typeof s.textCode == "string" ? s.textCode : null,
      message: s.message || e,
      metadata: s.metadata && typeof s.metadata == "object" ? s.metadata : null,
      fields: s.fields && typeof s.fields == "object" ? s.fields : null,
      validationErrors: Array.isArray(s.validationErrors) ? s.validationErrors : null
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
function ut(t, e) {
  if (!t || typeof t != "object") return {
    success: !1,
    error: q(null, e)
  };
  const s = It(t);
  return s.success ? {
    success: !0,
    data: s.data
  } : {
    success: !1,
    error: s.error || q(null, e)
  };
}
function ht(t) {
  const e = {};
  for (const s of Array.from(t.attributes)) {
    if (!s.name.startsWith("data-command-payload-")) continue;
    const i = de(s.name.slice(21));
    e[i] = s.value;
  }
  return e;
}
function pe(t, e, s) {
  if (e) {
    if (typeof s == "string") {
      const i = s.trim();
      if (!i) return;
      if (t[e] === void 0) {
        t[e] = i;
        return;
      }
      if (Array.isArray(t[e])) {
        t[e].push(i);
        return;
      }
      t[e] = [t[e], i];
      return;
    }
    t[e] = s;
  }
}
function ge(t) {
  if (!t) return {};
  const e = {};
  return new FormData(t).forEach((s, i) => {
    pe(e, i, s);
  }), e;
}
function pt(t) {
  const e = y(t.dataset.commandBusyTarget);
  if (e) return document.querySelector(e);
  const s = y(t.dataset.commandBusyClosest);
  return s ? t.closest(s) : null;
}
function gt(t, e) {
  t && ((t instanceof HTMLButtonElement || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) && (t.disabled = e), e ? t.setAttribute("aria-busy", "true") : t.removeAttribute("aria-busy"));
}
function ft(t, e) {
  t && (e ? t.setAttribute("aria-busy", "true") : t.removeAttribute("aria-busy"), t.querySelectorAll("button").forEach((s) => {
    s.disabled = e, e ? s.setAttribute("aria-busy", "true") : s.removeAttribute("aria-busy");
  }));
}
function fe(t) {
  const e = /* @__PURE__ */ new Map();
  return t.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((s) => {
    const i = y(s.getAttribute("aria-controls") || void 0);
    i && e.set(i, s.getAttribute("aria-expanded") === "true");
  }), e;
}
function me(t, e) {
  e.forEach((s, i) => {
    const r = t.querySelector(`.collapsible-trigger[aria-controls="${i}"]`), n = document.getElementById(i);
    !r || !n || (r.setAttribute("aria-expanded", s ? "true" : "false"), n.classList.toggle("expanded", s));
  });
}
function be(t) {
  if (!t || typeof t != "object") return;
  const e = t, s = typeof e.accepted == "boolean" ? e.accepted : void 0, i = et(e.mode), r = String(e.command_id || e.commandId || "").trim() || void 0, n = String(e.dispatch_id || e.dispatchId || "").trim() || void 0, o = String(e.correlation_id || e.correlationId || "").trim() || void 0, a = e.enqueued_at || e.enqueuedAt, c = a == null ? void 0 : String(a).trim() || void 0;
  if (!(s === void 0 && !i && !r && !n && !o && !c))
    return {
      accepted: s,
      mode: i,
      commandId: r,
      dispatchId: n,
      correlationId: o,
      enqueuedAt: c
    };
}
var ye = class {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.feedbackUnsubscribe = null, this.pendingFeedback = /* @__PURE__ */ new Map(), this.inlineStatus = /* @__PURE__ */ new Map(), this.inlineStatusListeners = /* @__PURE__ */ new Set(), this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || ce(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.feedback = t.feedback, this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]")) return;
      t.preventDefault();
      const s = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, s);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element)) return;
      const s = e.closest("[data-command-name]:not(form)");
      !s || !this.mount.contains(s) || (t.preventDefault(), this.handleCommand(s, null, s));
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
    this.inlineStatus.forEach((e, s) => {
      e.state !== "completed" && e.state !== "failed" && this.setInlineStatus(s, {
        ...e,
        state: "stale",
        message: "Refreshing status...",
        timestamp: t
      });
    });
  }
  setInlineStatus(t, e) {
    const s = (this.inlineStatus.get(t) || null)?.state || null;
    this.inlineStatus.set(t, e), this.emitInlineStatusChange({
      entry: e,
      previousState: s
    });
  }
  emitInlineStatusChange(t) {
    this.inlineStatusListeners.forEach((e) => {
      try {
        e(t);
      } catch (s) {
        console.warn("Inline status listener error:", s);
      }
    });
  }
  updateInlineStatusFromDispatch(t, e, s, i = {}) {
    this.setInlineStatus(t, {
      correlationId: t,
      commandName: e,
      state: s,
      message: i.message,
      section: i.section,
      participantId: i.participantId,
      timestamp: Date.now()
    });
  }
  resolveSection(t) {
    return t.closest("[data-live-status-section]")?.getAttribute("data-live-status-section") || void 0;
  }
  resolveParticipantId(t, e) {
    const s = String(e.participant_id || e.recipient_id || "").trim();
    return s || t.closest("[data-participant-id]")?.getAttribute("data-participant-id") || void 0;
  }
  scopePayload() {
    const t = {};
    return this.tenantId && (t.tenant_id = this.tenantId), this.orgId && (t.org_id = this.orgId), t;
  }
  buildSpec(t, e, s) {
    const i = y(t.dataset.commandName || e?.dataset.commandName), r = y(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", n = y(t.dataset.commandDispatch || e?.dataset.commandDispatch) || i, o = ge(e), a = ht(t), c = e ? ht(e) : {}, l = {
      ...this.scopePayload(),
      ...o,
      ...c,
      ...a
    }, u = dt(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? dt(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: i,
      dispatchName: n,
      transport: r,
      payload: l,
      successMessage: y(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${i} completed successfully`,
      fallbackMessage: y(t.dataset.commandFailure || e?.dataset.commandFailure) || `${i} failed`,
      refreshSelectors: u,
      confirmMessage: y(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: y(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: y(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: y(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: pt(t) || (e ? pt(e) : null),
      submitter: s
    };
  }
  buildManualSpec(t) {
    const e = t.trigger || this.mount, s = {
      ...this.scopePayload(),
      ...t.payload || {}
    }, i = Array.isArray(t.refreshSelectors) && t.refreshSelectors.length > 0 ? t.refreshSelectors.filter(Boolean) : this.defaultRefreshSelectors;
    return {
      trigger: e,
      form: t.form || null,
      commandName: String(t.commandName || "").trim(),
      dispatchName: String(t.dispatchName || t.commandName || "").trim(),
      transport: t.transport || "action",
      payload: s,
      successMessage: String(t.successMessage || "").trim() || `${String(t.commandName || "").trim()} completed successfully`,
      fallbackMessage: String(t.fallbackMessage || "").trim() || `${String(t.commandName || "").trim()} failed`,
      refreshSelectors: i,
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
  async handleCommand(t, e, s) {
    const i = this.buildSpec(t, e, s);
    !i.commandName || !i.dispatchName || await this.executeSpec(i);
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
      const c = String(a || "").trim();
      if (!c)
        return this.notifier.error("A reason is required."), e();
      t.payload.reason = c;
    }
    const s = he(t.payload), i = this.resolveSection(t.trigger), r = this.resolveParticipantId(t.trigger, t.payload), n = {
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: s,
      success: !1
    };
    this.onBeforeDispatch?.(n), gt(t.submitter, !0), ft(t.busyTarget, !0), this.updateInlineStatusFromDispatch(s, t.commandName, "submitting", {
      message: "Sending...",
      section: i,
      participantId: r
    });
    try {
      const o = t.transport === "rpc" ? await this.dispatchRPC(t) : await this.dispatchAction(t), a = {
        ...n,
        success: o.success,
        data: o.data,
        error: o.error,
        correlationId: o.correlationId || s,
        receipt: o.receipt,
        responseMode: o.responseMode
      };
      if (!o.success || o.error) {
        const c = nt(o.error || q(null, t.fallbackMessage), t.fallbackMessage);
        return this.notifier.error(c), this.updateInlineStatusFromDispatch(s, t.commandName, "failed", {
          message: c || "Failed",
          section: i,
          participantId: r
        }), this.onAfterDispatch?.(a), a;
      }
      return this.notifier.success(t.successMessage), this.shouldWaitForFeedback(a) ? (this.updateInlineStatusFromDispatch(s, t.commandName, "accepted", {
        message: "Queued...",
        section: i,
        participantId: r
      }), this.pendingFeedback.set(a.correlationId, {
        correlationId: a.correlationId,
        commandName: a.commandName,
        transport: a.transport,
        responseMode: a.responseMode,
        receipt: a.receipt,
        refreshSelectors: [...t.refreshSelectors],
        trigger: t.trigger,
        section: i,
        participantId: r
      })) : (this.updateInlineStatusFromDispatch(s, t.commandName, "completed", {
        message: t.successMessage || "Done",
        section: i,
        participantId: r
      }), t.refreshSelectors.length > 0 && await this.refreshSelectors(t.refreshSelectors, t.trigger)), this.onAfterDispatch?.(a), a;
    } catch (o) {
      const a = q(o, t.fallbackMessage), c = {
        ...n,
        success: !1,
        error: a
      };
      return this.notifier.error(nt(a, t.fallbackMessage)), this.updateInlineStatusFromDispatch(s, t.commandName, "failed", {
        message: a.message || "Failed",
        section: i,
        participantId: r
      }), this.onAfterDispatch?.(c), c;
    } finally {
      gt(t.submitter, !1), ft(t.busyTarget, !1);
    }
  }
  shouldWaitForFeedback(t) {
    return this.feedback?.adapter ? et(t.responseMode || t.receipt?.mode) === "queued" : !1;
  }
  async handleFeedbackEvent(t) {
    const e = String(t.correlationId || "").trim(), s = e && this.pendingFeedback.get(e) || null;
    s && this.pendingFeedback.delete(e);
    const i = {
      controller: this,
      event: t,
      pending: s
    };
    if (t.type === "stream_gap") {
      this.markStaleStatuses(), await this.feedback?.onStreamGap?.(i);
      return;
    }
    if (e) {
      const r = String(t.status || "").toLowerCase(), n = (Array.isArray(t.sections) ? t.sections : [])[0] || s?.section, o = s?.participantId, a = s?.commandName || "";
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
    await this.feedback?.onEvent?.(i);
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName) return {
      success: !1,
      error: q(null, "Action transport is not configured")
    };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, s = {
      id: this.recordId,
      ...t.payload
    }, i = await this.fetchImpl(e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(s)
    });
    return i.ok ? {
      ...ut(await i.json().catch(() => null), t.fallbackMessage),
      correlationId: String(t.payload.correlation_id || "").trim() || void 0
    } : {
      success: !1,
      error: await rt(i)
    };
  }
  async dispatchRPC(t) {
    const e = String(t.payload.correlation_id || "").trim() || void 0, s = {
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
    }, i = await this.fetchImpl(this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(s)
    });
    if (!i.ok) return {
      success: !1,
      error: await rt(i),
      correlationId: e
    };
    const r = await i.json().catch(() => null);
    if (r && typeof r == "object" && "error" in r) return {
      ...ut(r, t.fallbackMessage),
      correlationId: e
    };
    if (r && typeof r == "object" && "data" in r && typeof r.data == "object") {
      const n = r.data, o = be(n.receipt);
      return {
        success: !0,
        data: n,
        correlationId: o?.correlationId || e,
        receipt: o,
        responseMode: et(n.response_mode || o?.mode)
      };
    }
    return {
      success: !0,
      data: r && typeof r == "object" ? r : void 0,
      correlationId: e
    };
  }
  async refreshSelectors(t, e = null) {
    const s = await this.refreshFragments(t);
    return s && this.onAfterRefresh?.({
      mount: this.mount,
      trigger: e || this.mount,
      selectors: t,
      sourceDocument: s
    }), s;
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
    const s = await e.text();
    if (!s.trim()) return null;
    const i = new DOMParser().parseFromString(s, "text/html");
    return t.forEach((r) => {
      this.replaceFragment(r, i);
    }), i;
  }
  replaceFragment(t, e) {
    const s = document.querySelector(t), i = e.querySelector(t);
    if (!s && !i) return;
    if (s && !i) {
      s.remove();
      return;
    }
    if (!s || !i) return;
    const r = fe(s), n = document.importNode(i, !0);
    s.replaceWith(n), n instanceof Element && me(n, r);
  }
};
function Ss(t) {
  if (!t.mount) return null;
  const e = new ye(t);
  return e.init(), e;
}
var mt = {
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
}, ve = {
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
}, xe = class {
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
      this.loading = !0, this.error = null, this.renderLoading();
      try {
        this.providers = (await A().listProviders()).providers || [], this.renderProviders();
      } catch (t) {
        this.error = t instanceof Error ? t : new Error(String(t)), this.renderError(), this.config.notifier && this.config.notifier.error(`Failed to load providers: ${this.error.message}`);
      } finally {
        this.loading = !1;
      }
    }
  }
  renderLoading() {
    this.container && (this.container.innerHTML = O({
      text: "Loading providers...",
      size: "lg"
    }));
  }
  renderError() {
    this.container && (this.container.innerHTML = z({
      title: "Failed to load providers",
      error: this.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadProviders()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({ resource: "service providers" }));
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
    const e = this.getProviderCardData(t), s = k()() && t.supported_scope_types.includes("user"), i = k()() && t.supported_scope_types.includes("org"), r = this.buildCapabilitySummary(t.capabilities), n = this.buildScopeBadges(t.supported_scope_types);
    return `
      <div class="provider-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
           data-provider-id="${this.escapeHtml(t.id)}">
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                ${d(e.icon, {
      size: "20px",
      extraClass: "text-gray-600"
    })}
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">${this.escapeHtml(e.displayName)}</h3>
                <span class="text-xs text-gray-500">${this.escapeHtml(t.auth_kind)}</span>
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
    if (t.length === 0) return '<span class="text-xs text-gray-400">No capabilities defined</span>';
    const e = 4, s = t.slice(0, e), i = t.length - e;
    let r = '<div class="flex flex-wrap gap-1">';
    for (const n of s) {
      const [o, a] = n.name.split(".");
      r += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              title="${this.escapeHtml(n.name)}">
          ${this.escapeHtml(a || n.name)}
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
    return {
      provider: t,
      displayName: this.config.getProviderName ? this.config.getProviderName(t.id) : ve[t.id.toLowerCase()] || this.formatProviderId(t.id),
      icon: this.config.getProviderIcon ? this.config.getProviderIcon(t.id) : mt[t.id.toLowerCase()] || mt.default,
      description: `${t.auth_kind} authentication`,
      capabilityCount: t.capabilities.length,
      canConnect: k()()
    };
  }
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  bindCardEvents() {
    this.container && (this.container.querySelectorAll(".provider-card").forEach((t) => {
      t.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const s = t.dataset.providerId;
        if (s) {
          const i = this.getProvider(s);
          i && this.config.onSelect && this.config.onSelect(i);
        }
      });
    }), this.container.querySelectorAll(".provider-connect-btn").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.stopPropagation();
        const s = t.dataset.providerId, i = t.dataset.scopeType;
        if (s && i) {
          const r = this.getProvider(s);
          r && this.config.onConnect && this.config.onConnect(r, i);
        }
      });
    }));
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
};
async function ws(t) {
  const e = new xe(t);
  return await e.init(), e;
}
var bt = {
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
}, Se = class {
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
    }, this.client = t.apiClient || A(), this.queryState = new D({
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
    this.queryState.init(), this.renderStructure(), await this.loadProviders(), this.bindEvents(), await this.loadConnections();
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
    this.abortController?.abort(), this.queryState.destroy();
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
            ${d("iconoir:refresh", { size: "16px" })}
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
            ${d("iconoir:link", {
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
    e && (e.value = t.search || ""), this.container?.querySelectorAll("select[data-filter]")?.forEach((s) => {
      const i = s.dataset.filter;
      s.value = t.filters[i] || "";
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
    const s = this.container.querySelector(".connections-prev"), i = this.container.querySelector(".connections-next");
    s?.addEventListener("click", () => this.queryState.prevPage()), i?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderConnections() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-empty"), s = this.container?.querySelector(".connections-table-wrapper");
    if (t) {
      if (this.state.connections.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = I(6, {
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
    const e = this.queryState.getState().filters.provider_id || "";
    t.innerHTML = `<option value="">All Providers</option>${this.state.providers.map((s) => {
      const i = this.config.getProviderName ? this.config.getProviderName(s.id) : this.formatProviderId(s.id);
      return `<option value="${this.escapeHtml(s.id)}">${this.escapeHtml(i)}</option>`;
    }).join("")}`, t.value = e;
  }
  handleConnect(t) {
    if (!this.config.onConnect || !k()()) return;
    const e = this.container?.querySelector('[data-filter="provider_id"]')?.value || "";
    if (!e) {
      this.config.notifier?.error("Select a provider before starting a connection.");
      return;
    }
    const s = this.state.providers.find((i) => i.id === e);
    if (!s) {
      this.config.notifier?.error("Selected provider is no longer available.");
      return;
    }
    if (!s.supported_scope_types.includes(t)) {
      this.config.notifier?.error(`${this.formatProviderId(s.id)} does not support ${t} scope.`);
      return;
    }
    this.config.onConnect(s.id, t);
  }
  bindNoResultsActions(t) {
    t.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
  }
  renderConnectionRow(t) {
    const e = bt[t.status] || bt.disconnected, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.formatDate(t.updated_at), r = this.buildRowActions(t);
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
            ${d(e.icon, { size: "12px" })}
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
    return t.status === "active" && R()() && e.push(`
        <button type="button"
                class="connection-action-refresh p-1 text-gray-400 hover:text-blue-600"
                data-action="refresh"
                title="Refresh credentials">
          ${d("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status === "needs_reconsent" && _t()() && e.push(`
        <button type="button"
                class="connection-action-reconsent p-1 text-gray-400 hover:text-orange-600"
                data-action="reconsent"
                title="Re-consent">
          ${d("iconoir:redo", { size: "16px" })}
        </button>
      `), t.status !== "disconnected" && it()() && e.push(`
        <button type="button"
                class="connection-action-revoke p-1 text-gray-400 hover:text-red-600"
                data-action="revoke"
                title="Revoke connection">
          ${d("iconoir:cancel", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindRowActions() {
    this.container?.querySelectorAll(".connection-row")?.forEach((t) => {
      const e = t.dataset.connectionId;
      e && (t.addEventListener("click", (s) => {
        if (s.target.closest("button")) return;
        const i = this.getConnection(e);
        i && this.config.onSelect && this.config.onSelect(i);
      }), t.querySelectorAll("button[data-action]").forEach((s) => {
        s.addEventListener("click", async (i) => {
          switch (i.stopPropagation(), s.dataset.action) {
            case "refresh":
              await this.handleRefresh(e, s);
              break;
            case "reconsent":
              await this.handleReconsent(e, s);
              break;
            case "revoke":
              await this.handleRevoke(e, s);
              break;
          }
        });
      }));
    });
  }
  async handleRefresh(t, e) {
    const s = this.getConnection(t);
    s && (this.actionQueue.isInFlight(`refresh-${t}`) || await this.actionQueue.execute(`refresh-${t}`, async () => {
      await v({
        mutation: () => this.client.refreshConnection(t, { provider_id: s.provider_id }),
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
        onSuccess: (s) => {
          s.begin?.authorize_url && (window.location.href = s.begin.authorize_url);
        }
      });
    });
  }
  async handleRevoke(t, e) {
    const s = this.getConnection(t);
    await W({
      action: "revoke",
      resourceType: "connection",
      resourceName: s ? this.config.getProviderName ? this.config.getProviderName(s.provider_id) : this.formatProviderId(s.provider_id) : void 0
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
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), s = this.container?.querySelector(".connections-empty");
    t && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = V(6, {
      title: "Failed to load connections",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnections()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({ resource: "connections" }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".connections-tbody"), e = this.container?.querySelector(".connections-table-wrapper"), s = this.container?.querySelector(".connections-empty");
    this.state.loading && t && this.state.connections.length === 0 && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = B(6, { text: "Loading connections..." }));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: s } = this.state, i = s > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, s), n = r < s, o = t > 1, a = this.container?.querySelector(".connections-info"), c = this.container?.querySelector(".connections-prev"), l = this.container?.querySelector(".connections-next");
    a && (a.textContent = s > 0 ? `Showing ${i}-${r} of ${s}` : "No connections"), c && (c.disabled = !o), l && (l.disabled = !n);
  }
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatDate(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), i = Math.floor(s / 6e4), r = Math.floor(s / 36e5), n = Math.floor(s / 864e5);
    return i < 1 ? "Just now" : i < 60 ? `${i}m ago` : r < 24 ? `${r}h ago` : n < 7 ? `${n}d ago` : e.toLocaleDateString();
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
};
async function $s(t) {
  const e = new Se(t);
  return await e.init(), e;
}
var yt = {
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
}, vt = {
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
}, we = class {
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
    }, this.client = t.apiClient || A(), this.queryState = new D({
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
    this.queryState.init(), this.renderStructure(), await this.loadProviders(), this.bindEvents(), await this.loadInstallations();
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
    this.abortController?.abort(), this.queryState.destroy();
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
            ${d("iconoir:refresh", { size: "16px" })}
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
            ${d("iconoir:download", {
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
    e && (e.value = t.search || ""), this.container?.querySelectorAll("select[data-filter]")?.forEach((s) => {
      const i = s.dataset.filter;
      s.value = t.filters[i] || "";
    });
  }
  bindEvents() {
    if (!this.container) return;
    this.container.querySelector('[data-filter="search"]')?.addEventListener("input", (s) => {
      this.queryState.setSearch(s.target.value);
    }), this.container.querySelectorAll("select[data-filter]").forEach((s) => {
      s.addEventListener("change", () => {
        const i = s.dataset.filter;
        this.queryState.setFilter(i, s.value || void 0);
      });
    }), this.container.querySelector(".installations-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const t = this.container.querySelector(".installations-prev"), e = this.container.querySelector(".installations-next");
    t?.addEventListener("click", () => this.queryState.prevPage()), e?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderInstallations() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-empty"), s = this.container?.querySelector(".installations-table-wrapper");
    if (t) {
      if (this.state.installations.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = I(7, {
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
    const e = yt[t.status] || yt.uninstalled, s = vt[t.install_type] || vt.standard, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), r = t.granted_at ? this.formatDate(t.granted_at) : "—", n = t.revoked_at ? this.formatDate(t.revoked_at) : "—", o = this.buildRowActions(t);
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
            ${d(e.icon, { size: "12px" })}
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
    return t.status === "active" && it()() && e.push(`
        <button type="button"
                class="installation-action-uninstall p-1 text-gray-400 hover:text-red-600"
                data-action="uninstall"
                title="Uninstall">
          ${d("iconoir:trash", { size: "16px" })}
        </button>
      `), t.status === "uninstalled" && k()() && e.push(`
        <button type="button"
                class="installation-action-reinstall p-1 text-gray-400 hover:text-green-600"
                data-action="reinstall"
                title="Reinstall">
          ${d("iconoir:redo", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindRowActions() {
    this.container?.querySelectorAll(".installation-row")?.forEach((t) => {
      const e = t.dataset.installationId;
      e && (t.addEventListener("click", (s) => {
        if (s.target.closest("button")) return;
        const i = this.getInstallation(e);
        i && this.config.onSelect && this.config.onSelect(i);
      }), t.querySelectorAll("button[data-action]").forEach((s) => {
        s.addEventListener("click", async (i) => {
          switch (i.stopPropagation(), s.dataset.action) {
            case "uninstall":
              await this.handleUninstall(e, s);
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
    const s = this.getInstallation(t);
    await W({
      action: "uninstall",
      resourceType: "installation",
      resourceName: s ? this.config.getProviderName ? this.config.getProviderName(s.provider_id) : this.formatProviderId(s.provider_id) : void 0
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
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), s = this.container?.querySelector(".installations-empty");
    t && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = V(7, {
      title: "Failed to load installations",
      error: this.state.error,
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadInstallations()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({ resource: "installations" }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".installations-tbody"), e = this.container?.querySelector(".installations-table-wrapper"), s = this.container?.querySelector(".installations-empty");
    this.state.loading && t && this.state.installations.length === 0 && (e?.classList.remove("hidden"), s?.classList.add("hidden"), t.innerHTML = B(7, { text: "Loading installations..." }));
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
    const e = this.queryState.getState().filters.provider_id || "";
    t.innerHTML = `<option value="">All Providers</option>${this.state.providers.map((s) => {
      const i = this.config.getProviderName ? this.config.getProviderName(s.id) : this.formatProviderId(s.id);
      return `<option value="${this.escapeHtml(s.id)}">${this.escapeHtml(i)}</option>`;
    }).join("")}`, t.value = e;
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: s } = this.state, i = s > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, s), n = r < s, o = t > 1, a = this.container?.querySelector(".installations-info"), c = this.container?.querySelector(".installations-prev"), l = this.container?.querySelector(".installations-next");
    a && (a.textContent = s > 0 ? `Showing ${i}-${r} of ${s}` : "No installations"), c && (c.disabled = !o), l && (l.disabled = !n);
  }
  formatProviderId(t) {
    return t.split(/[-_]/).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
  }
  truncateId(t, e = 12) {
    return t.length <= e ? t : `${t.slice(0, e - 3)}...`;
  }
  formatDate(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), i = Math.floor(s / 6e4), r = Math.floor(s / 36e5), n = Math.floor(s / 864e5);
    return i < 1 ? "Just now" : i < 60 ? `${i}m ago` : r < 24 ? `${r}h ago` : n < 7 ? `${n}d ago` : e.toLocaleDateString();
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
};
async function Cs(t) {
  const e = new we(t);
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
}, $e = class {
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
    }, this.state.viewMode = this.config.viewMode || "timeline", this.client = t.apiClient || A(), this.queryState = new D({
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
    if (!Ht()()) {
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
    this.abortController?.abort(), this.queryState.destroy();
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
              ${d("iconoir:timeline", { size: "16px" })}
              <span class="ml-1.5">Timeline</span>
            </button>
            <button type="button"
                    class="activity-view-table px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${this.state.viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}"
                    title="Table view">
              ${d("iconoir:table-rows", { size: "16px" })}
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
              ${d("iconoir:refresh", { size: "16px" })}
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
              ${d("iconoir:activity", {
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
    return !this.config.providers || this.config.providers.length === 0 ? "" : this.config.providers.map((t) => `<option value="${this.escapeHtml(t.id)}">${this.escapeHtml(t.name)}</option>`).join("");
  }
  renderChannelOptions() {
    return (this.config.channels || [
      "connections",
      "credentials",
      "grants",
      "webhooks",
      "sync",
      "lifecycle"
    ]).map((t) => `<option value="${this.escapeHtml(t)}">${this.escapeHtml(this.formatLabel(t))}</option>`).join("");
  }
  renderActionOptions() {
    if (this.config.actions && this.config.actions.length > 0) return this.config.actions.map((i) => {
      const r = this.resolveActionLabel(i);
      return `<option value="${this.escapeHtml(i)}">${this.escapeHtml(r)}</option>`;
    }).join("");
    const t = Wt(), e = {
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
      const n = e[i] || this.formatLabel(i), o = r.map((a) => {
        const c = this.resolveActionLabel(a.action);
        return `<option value="${this.escapeHtml(a.action)}">${this.escapeHtml(c)}</option>`;
      }).join("");
      s.push(`<optgroup label="${this.escapeHtml(n)}">${o}</optgroup>`);
    }
    return s.join("");
  }
  resolveActionLabel(t) {
    return this.config.getActionLabel ? this.config.getActionLabel(t) : Vt(t);
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
    const s = this.container.querySelector('[data-filter="object_type"]'), i = this.container.querySelector('[data-filter="object_id"]');
    s?.addEventListener("change", () => {
      this.queryState.setFilter("object_type", s.value || void 0);
    }), i?.addEventListener("change", () => {
      this.queryState.setFilter("object_id", i.value || void 0);
    }), this.container.querySelector(".activity-reset")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
    const r = this.container.querySelector(".activity-prev"), n = this.container.querySelector(".activity-next");
    r?.addEventListener("click", () => this.queryState.prevPage()), n?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderEntries() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-empty"), i = this.container?.querySelector(".activity-timeline-container"), r = this.container?.querySelector(".activity-table-container");
    if (this.state.entries.length === 0) {
      this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (s?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = kt({
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount(),
        containerClass: "bg-white rounded-lg border border-gray-200"
      }), this.bindNoResultsActions(t))) : (r?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = I(7, {
        query: this.queryState.getState().search,
        filterCount: this.queryState.getActiveFilterCount()
      }), this.bindNoResultsActions(e)))) : (i?.classList.add("hidden"), r?.classList.add("hidden"), s?.classList.remove("hidden")), this.updateFilterSummary();
      return;
    }
    s?.classList.add("hidden"), this.state.viewMode === "timeline" ? (i?.classList.remove("hidden"), r?.classList.add("hidden"), t && (t.innerHTML = this.state.entries.map((n) => this.renderTimelineEntry(n)).join(""), this.bindEntryActions())) : (r?.classList.remove("hidden"), i?.classList.add("hidden"), e && (e.innerHTML = this.state.entries.map((n) => this.renderTableRow(n)).join(""), this.bindEntryActions())), this.updateFilterSummary();
  }
  bindNoResultsActions(t) {
    t.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.queryState.reset(), this.restoreFilterValues();
    });
  }
  renderTimelineEntry(t) {
    const e = N[t.status] || N.pending, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.resolveActionLabel(t.action), r = this.formatTime(t.created_at), n = this.formatRelativeTime(t.created_at);
    return `
      <div class="activity-entry flex gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
           data-entry-id="${this.escapeHtml(t.id)}">
        <!-- Status indicator -->
        <div class="flex-shrink-0">
          <div class="w-10 h-10 rounded-full ${e.bg} flex items-center justify-center">
            ${d(e.icon, {
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
              <p class="text-xs text-gray-500" title="${this.escapeHtml(r)}">${n}</p>
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
    const e = N[t.status] || N.pending, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.resolveActionLabel(t.action), r = this.formatTime(t.created_at), n = this.formatRelativeTime(t.created_at);
    return `
      <tr class="activity-row hover:bg-gray-50 cursor-pointer" data-entry-id="${this.escapeHtml(t.id)}">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="text-sm text-gray-900" title="${this.escapeHtml(r)}">${n}</span>
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
            ${d(e.icon, { size: "12px" })}
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
    this.container?.querySelectorAll("[data-entry-id]")?.forEach((t) => {
      const e = t.dataset.entryId;
      e && t.addEventListener("click", (s) => {
        if (s.target.closest("a")) return;
        const i = this.getEntry(e);
        i && this.config.onSelect && this.config.onSelect(i);
      });
    }), this.container?.querySelectorAll(".activity-object-link")?.forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault(), e.stopPropagation();
        const s = t.dataset.objectType, i = t.dataset.objectId;
        if (!(!s || !i)) {
          if (this.config.onNavigate) {
            this.config.onNavigate(s, i);
            return;
          }
          this.config.useDeepLinks && this.createDeepLinkNavigateHandler()(s, i);
        }
      });
    });
  }
  createDeepLinkNavigateHandler() {
    return ee(() => {
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
    const s = At(t);
    if (!s) return "#";
    const i = this.queryState.getState();
    return Zt(s, e, {
      fromPage: window.location.pathname,
      filters: Object.fromEntries(Object.entries(i.filters).filter(([, r]) => r)),
      search: i.search || void 0,
      page: i.page > 1 ? i.page : void 0,
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
    const e = this.queryState.getActiveFilterCount(), s = this.queryState.getState();
    if (e === 0 && !s.search) t.textContent = `${this.state.total} entries`;
    else {
      const i = [];
      s.search && i.push(`"${s.search}"`), e > 0 && i.push(`${e} filter${e > 1 ? "s" : ""}`), t.textContent = `${this.state.total} entries matching ${i.join(" and ")}`;
    }
  }
  renderError() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-timeline-container"), i = this.container?.querySelector(".activity-table-container");
    this.container?.querySelector(".activity-empty")?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), i?.classList.add("hidden"), t && (t.innerHTML = z({
      title: "Failed to load activity",
      error: this.state.error,
      containerClass: "bg-white rounded-lg border border-gray-200",
      showRetry: !0
    }), t.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity()))) : (i?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = V(7, {
      title: "Failed to load activity",
      error: this.state.error,
      showRetry: !0
    }), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadActivity())));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({ resource: "activity" }));
  }
  updateLoadingState() {
    const t = this.container?.querySelector(".activity-timeline"), e = this.container?.querySelector(".activity-tbody"), s = this.container?.querySelector(".activity-timeline-container"), i = this.container?.querySelector(".activity-table-container"), r = this.container?.querySelector(".activity-empty");
    this.state.loading && (this.state.entries.length > 0 || (r?.classList.add("hidden"), this.state.viewMode === "timeline" ? (s?.classList.remove("hidden"), i?.classList.add("hidden"), t && (t.innerHTML = O({ text: "Loading activity..." }))) : (i?.classList.remove("hidden"), s?.classList.add("hidden"), e && (e.innerHTML = B(7, { text: "Loading activity..." })))));
  }
  updatePagination() {
    const { page: t, per_page: e } = this.queryState.getState(), { total: s } = this.state, i = s > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, s), n = r < s, o = t > 1, a = this.container?.querySelector(".activity-info"), c = this.container?.querySelector(".activity-prev"), l = this.container?.querySelector(".activity-next");
    a && (a.textContent = s > 0 ? `Showing ${i}-${r} of ${s}` : "No activity"), c && (c.disabled = !o), l && (l.disabled = !n);
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
    const s = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), i = Math.floor(s / 6e4), r = Math.floor(s / 36e5), n = Math.floor(s / 864e5);
    return i < 1 ? "Just now" : i < 60 ? `${i}m ago` : r < 24 ? `${r}h ago` : n < 7 ? `${n}d ago` : e.toLocaleDateString();
  }
  formatMetadataPreview(t) {
    return Object.entries(t).slice(0, 3).map(([e, s]) => `${e}: ${JSON.stringify(s)}`).join(", ");
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
};
async function _s(t) {
  const e = new $e(t);
  return await e.init(), e;
}
var Z = {
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
}, X = {
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
}, xt = {
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
}, Ce = class {
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
    }, this.state.activeTab = this.config.activeTab || "subscriptions", this.client = t.apiClient || A(), this.queryState = new D({
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
    this.restoreTab(), this.queryState.init(), this.renderStructure(), await this.loadProviders(), this.bindEvents(), await this.loadData();
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
    this.abortController?.abort(), this.queryState.destroy();
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
    }, s = await this.client.listSubscriptions(e, this.abortController.signal);
    this.state.subscriptions = s.subscriptions, this.state.subscriptionsTotal = s.total, this.queryState.updateFromResponse(s.total, s.has_next), this.renderSubscriptions(), this.updatePagination();
  }
  async loadSyncJobs(t) {
    const e = t.provider_id, s = t.connection_id, i = t.status, r = String(t.q || "").trim().toLowerCase(), n = t.page || 1, o = t.per_page || this.config.perPage || 25, a = await this.loadSyncConnections({
      providerId: e,
      connectionId: s,
      signal: this.abortController?.signal
    }), c = (await Promise.all(a.map(async (p) => {
      try {
        return {
          connection: p,
          summary: (await this.client.getSyncStatus(p.id, this.abortController?.signal)).sync_summary
        };
      } catch (h) {
        if (h.name === "AbortError") throw h;
        return null;
      }
    }))).filter((p) => p !== null).map((p) => this.toSyncJob(p.connection, p.summary)).filter((p) => p !== null).filter((p) => i && p.status !== i ? !1 : r ? this.matchesSyncSearch(p, r) : !0), l = c.length, u = (n - 1) * o, g = c.slice(u, u + o);
    this.state.syncJobs = g, this.state.syncJobsTotal = l, this.renderSyncJobs(), this.updatePagination();
  }
  renderStructure() {
    this.container && (this.container.innerHTML = `
      <div class="subscriptions-sync-page">
        <!-- Tabs -->
        <div class="tabs-header flex items-center gap-4 mb-4 border-b border-gray-200">
          <button type="button"
                  class="tab-subscriptions px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${this.state.activeTab === "subscriptions" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}">
            ${d("iconoir:bell", { size: "16px" })}
            <span class="ml-1.5">Subscriptions</span>
          </button>
          <button type="button"
                  class="tab-sync px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${this.state.activeTab === "sync" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}">
            ${d("iconoir:sync", { size: "16px" })}
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
              ${d("iconoir:refresh", { size: "16px" })}
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
            ${d("iconoir:bell-off", {
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
    return Object.entries(Z).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
  }
  renderSyncStatusOptions() {
    return Object.entries(X).map(([t, e]) => `<option value="${t}">${e.label}</option>`).join("");
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
    const e = this.queryState.getState().filters.provider_id || "";
    t.innerHTML = `<option value="">All Providers</option>${this.state.providers.map((s) => {
      const i = this.config.getProviderName ? this.config.getProviderName(s.id) : this.formatProviderId(s.id);
      return `<option value="${this.escapeHtml(s.id)}">${this.escapeHtml(i)}</option>`;
    }).join("")}`, t.value = e;
  }
  restoreFilterValues() {
    const t = this.queryState.getState(), e = this.container?.querySelector('[data-filter="search"]');
    e && (e.value = t.search || ""), this.container?.querySelectorAll("[data-filter]")?.forEach((s) => {
      const i = s.dataset.filter;
      i !== "search" && (s.value = t.filters[i] || "");
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
    const s = this.container.querySelector(".prev-btn"), i = this.container.querySelector(".next-btn");
    s?.addEventListener("click", () => this.queryState.prevPage()), i?.addEventListener("click", () => this.queryState.nextPage());
  }
  renderSubscriptions() {
    const t = this.container?.querySelector(".subscriptions-tbody"), e = this.container?.querySelector(".empty-state"), s = this.container?.querySelector(".subscriptions-content");
    if (t) {
      if (this.state.subscriptions.length === 0) {
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = I(7, {
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
    const e = Z[t.status] || Z.errored, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = t.expires_at ? this.formatRelativeTime(t.expires_at) : "—", r = t.expires_at ? this.formatTime(t.expires_at) : "", n = this.formatRelativeTime(t.updated_at), o = t.expires_at && this.isExpiringSoon(t.expires_at);
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
            ${d(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="${o ? "text-amber-600 font-medium" : "text-gray-500"}" title="${r}">
            ${i}
          </span>
          ${o ? d("iconoir:warning-triangle", {
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
          ${d("iconoir:refresh", { size: "16px" })}
        </button>
      `), t.status !== "cancelled" && R()() && e.push(`
        <button type="button"
                class="action-cancel p-1 text-gray-400 hover:text-red-600"
                data-action="cancel"
                title="Cancel subscription">
          ${d("iconoir:cancel", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindSubscriptionActions() {
    this.container?.querySelectorAll(".subscription-row")?.forEach((t) => {
      const e = t.dataset.subscriptionId;
      e && (t.addEventListener("click", (s) => {
        if (s.target.closest("button")) return;
        const i = this.state.subscriptions.find((r) => r.id === e);
        i && this.config.onSubscriptionSelect && this.config.onSubscriptionSelect(i);
      }), t.querySelectorAll("button[data-action]").forEach((s) => {
        s.addEventListener("click", async (i) => {
          switch (i.stopPropagation(), s.dataset.action) {
            case "renew":
              await this.handleRenew(e, s);
              break;
            case "cancel":
              await this.handleCancel(e, s);
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
        this.queryState.getActiveFilterCount() > 0 || this.queryState.getState().search ? (s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = I(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount()
        }), this.bindNoResultsActions(t)) : (t.innerHTML = "", s?.classList.add("hidden"), e?.classList.remove("hidden"), this.updateEmptyState("sync"));
        return;
      }
      s?.classList.remove("hidden"), e?.classList.add("hidden"), t.innerHTML = this.state.syncJobs.map((i) => this.renderSyncJobRow(i)).join(""), this.bindSyncJobActions();
    }
  }
  renderSyncJobRow(t) {
    const e = X[t.status] || X.failed, s = xt[t.mode] || xt.incremental, i = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), r = t.metadata, n = typeof r.last_synced_at == "string" ? r.last_synced_at : "", o = n ? this.formatRelativeTime(n) : this.formatRelativeTime(t.updated_at), a = typeof r.last_sync_error == "string" ? r.last_sync_error : "", c = t.checkpoint || "";
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
            ${d(e.icon, { size: "12px" })}
            ${e.label}
          </span>
        </td>
        <td class="px-4 py-3">
          ${c ? `
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded" title="${this.escapeHtml(c)}">
              ${this.escapeHtml(this.truncateId(c, 16))}
            </code>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-gray-500 text-sm">
          ${o}
        </td>
        <td class="px-4 py-3 text-xs">
          ${a ? `<span class="text-red-600" title="${this.escapeHtml(a)}">${this.escapeHtml(this.truncateId(a, 48))}</span>` : '<span class="text-gray-400">—</span>'}
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
          ${d("iconoir:play", { size: "16px" })}
        </button>
      `), e.length === 0 ? '<span class="text-gray-300 text-xs">—</span>' : `<div class="flex items-center justify-end gap-1">${e.join("")}</div>`;
  }
  bindSyncJobActions() {
    this.container?.querySelectorAll(".sync-row")?.forEach((t) => {
      const e = t.dataset.jobId;
      e && (t.addEventListener("click", (s) => {
        if (s.target.closest("button")) return;
        const i = this.state.syncJobs.find((r) => r.id === e);
        i && this.config.onSyncJobSelect && this.config.onSyncJobSelect(i);
      }), t.querySelectorAll("button[data-action]").forEach((s) => {
        s.addEventListener("click", async (i) => {
          i.stopPropagation(), s.dataset.action === "run" && await this.handleRunSync(e, s);
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
    await W({
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
    const s = this.state.syncJobs.find((o) => o.id === t);
    if (!s) return;
    const i = s.metadata, r = typeof i.run_resource_type == "string" && i.run_resource_type ? i.run_resource_type : "default", n = typeof i.run_resource_id == "string" && i.run_resource_id ? i.run_resource_id : "default";
    this.actionQueue.isInFlight(`sync-${t}`) || await this.actionQueue.execute(`sync-${t}`, async () => {
      await v({
        mutation: () => this.client.runSync(s.connection_id, {
          provider_id: s.provider_id,
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
    const t = this.container?.querySelector(".tab-subscriptions"), e = this.container?.querySelector(".tab-sync"), s = this.container?.querySelector(".subscriptions-content"), i = this.container?.querySelector(".sync-content"), r = this.container?.querySelector('[data-filter="status"]');
    this.state.activeTab === "subscriptions" ? (t?.classList.add("border-blue-500", "text-blue-600"), t?.classList.remove("border-transparent", "text-gray-500"), e?.classList.remove("border-blue-500", "text-blue-600"), e?.classList.add("border-transparent", "text-gray-500"), s?.classList.remove("hidden"), i?.classList.add("hidden"), r && (r.innerHTML = `<option value="">All Statuses</option>${this.renderSubscriptionStatusOptions()}`, r.value = this.queryState.getState().filters.status || "")) : (e?.classList.add("border-blue-500", "text-blue-600"), e?.classList.remove("border-transparent", "text-gray-500"), t?.classList.remove("border-blue-500", "text-blue-600"), t?.classList.add("border-transparent", "text-gray-500"), i?.classList.remove("hidden"), s?.classList.add("hidden"), r && (r.innerHTML = `<option value="">All Statuses</option>${this.renderSyncStatusOptions()}`, r.value = this.queryState.getState().filters.status || "")), this.restoreFilterValues();
  }
  updateEmptyState(t) {
    const e = this.container?.querySelector(".empty-title"), s = this.container?.querySelector(".empty-message");
    t === "subscriptions" ? (e && (e.textContent = "No subscriptions found"), s && (s.textContent = "Subscriptions will appear here when created.")) : (e && (e.textContent = "No sync jobs found"), s && (s.textContent = "Sync jobs will appear here when syncs are triggered."));
  }
  renderError() {
    const t = this.state.activeTab === "subscriptions" ? ".subscriptions-content" : ".sync-content", e = this.container?.querySelector(t), s = this.container?.querySelector(".empty-state"), i = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody");
    i && (i.innerHTML = V(7, {
      title: `Failed to load ${this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs"}`,
      error: this.state.error,
      showRetry: !0
    }), e?.classList.remove("hidden"), s?.classList.add("hidden"), i.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadData()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({ resource: "subscriptions and sync" }));
  }
  updateLoadingState() {
    const t = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-content") : this.container?.querySelector(".sync-content"), e = this.state.activeTab === "subscriptions" ? this.container?.querySelector(".subscriptions-tbody") : this.container?.querySelector(".sync-tbody"), s = this.container?.querySelector(".empty-state");
    if (!(!this.state.loading || !e) && (this.state.activeTab === "subscriptions" ? this.state.subscriptions : this.state.syncJobs).length === 0) {
      const r = this.state.activeTab === "subscriptions" ? "Loading subscriptions..." : "Loading sync jobs...";
      t?.classList.remove("hidden"), s?.classList.add("hidden"), e.innerHTML = B(7, { text: r });
    }
  }
  async loadSyncConnections(t) {
    const { providerId: e, connectionId: s, signal: i } = t;
    if (s) try {
      const r = await this.client.getConnectionDetail(s, i);
      return e && r.connection.provider_id !== e ? [] : [r.connection];
    } catch (r) {
      if (r.name === "AbortError") throw r;
      if (r instanceof st && r.isNotFound) return [];
      throw r;
    }
    return (await this.client.listConnections({
      provider_id: e,
      page: 1,
      per_page: 200
    }, i)).connections;
  }
  toSyncJob(t, e) {
    const s = e.cursors[0], i = s?.resource_type || "default", r = s?.resource_id || "default", n = {
      ...e.last_job?.metadata || {},
      last_synced_at: e.last_synced_at || null,
      last_sync_error: e.last_sync_error || "",
      run_resource_type: i,
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
    const { page: t, per_page: e } = this.queryState.getState(), s = this.state.activeTab === "subscriptions" ? this.state.subscriptionsTotal : this.state.syncJobsTotal, i = s > 0 ? (t - 1) * e + 1 : 0, r = Math.min(t * e, s), n = r < s, o = t > 1, a = this.container?.querySelector(".info"), c = this.container?.querySelector(".prev-btn"), l = this.container?.querySelector(".next-btn"), u = this.state.activeTab === "subscriptions" ? "subscriptions" : "sync jobs";
    a && (a.textContent = s > 0 ? `Showing ${i}-${r} of ${s} ${u}` : `No ${u}`), c && (c.disabled = !o), l && (l.disabled = !n);
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
    const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime(), r = i > 0, n = Math.abs(i), o = Math.floor(n / 6e4), a = Math.floor(n / 36e5), c = Math.floor(n / 864e5);
    return o < 1 ? r ? "Soon" : "Just now" : o < 60 ? r ? `in ${o}m` : `${o}m ago` : a < 24 ? r ? `in ${a}h` : `${a}h ago` : c < 7 ? r ? `in ${c}d` : `${c}d ago` : e.toLocaleDateString();
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
};
async function Ls(t) {
  const e = new Ce(t);
  return await e.init(), e;
}
var St = {
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
}, _e = {
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
}, Le = class {
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
    }, this.abortController = null, this.actionQueue = new J(), this.config = t, this.client = t.apiClient || A();
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
  render() {
    if (!this.container || !this.state.connection) return;
    const t = this.state.connection, e = St[t.status] || St.disconnected, s = this.config.getProviderName ? this.config.getProviderName(t.provider_id) : this.formatProviderId(t.provider_id), i = this.buildGrantInfoList(), r = i.some((o) => o.status === "capability_required"), n = t.status === "needs_reconsent" || r;
    this.container.innerHTML = `
      <div class="connection-detail">
        <!-- Header -->
        <div class="detail-header flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            ${this.config.onBack ? `
              <button type="button" class="back-btn p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                ${d("iconoir:arrow-left", { size: "20px" })}
              </button>
            ` : ""}
            <div>
              <h2 class="text-xl font-semibold text-gray-900">${this.escapeHtml(s)}</h2>
              <p class="text-sm text-gray-500 mt-0.5">Connection Details</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${e.bg} ${e.text}">
              ${d(e.icon, { size: "16px" })}
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
              ${d("iconoir:warning-circle", { size: "20px" })}
            </div>
            <div>
              <h4 class="text-sm font-medium text-red-800">Last Error</h4>
              <p class="text-sm text-red-700 mt-1">${this.escapeHtml(t.last_error)}</p>
            </div>
          </div>
        ` : ""}

        ${n ? `
          <div class="reconsent-banner flex items-center justify-between p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 text-amber-500">
                ${d("iconoir:warning-triangle", { size: "20px" })}
              </div>
              <div>
                <h4 class="text-sm font-medium text-amber-800">Re-consent Required</h4>
                <p class="text-sm text-amber-700 mt-1">
                  ${r ? "Some required permissions are missing. Re-consent to restore full functionality." : "This connection needs re-authorization to continue working."}
                </p>
              </div>
            </div>
            ${_t()() ? `
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
          ${R()() && t.status === "active" ? `
            <button type="button"
                    class="refresh-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              ${d("iconoir:refresh", {
      size: "16px",
      extraClass: "mr-1.5"
    })}
              Refresh Credentials
            </button>
          ` : ""}
          ${it()() && t.status !== "disconnected" ? `
            <button type="button"
                    class="revoke-btn px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              ${d("iconoir:cancel", {
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
      const s = _e[e.status], i = e.capabilities.length > 0 ? e.capabilities.map((r) => this.formatLabel(r)).join(", ") : null;
      return `
          <div class="grant-row flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-gray-700">${this.escapeHtml(e.grant)}</code>
                ${e.isCapabilityRequired ? `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600" title="Required by capabilities">
                    ${d("iconoir:puzzle", {
        size: "10px",
        extraClass: "mr-0.5"
      })}
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
                ${d(s.icon, { size: "12px" })}
                ${s.label}
              </span>
            </div>
          </div>
        `;
    }).join("");
  }
  renderCapabilities() {
    return !this.state.provider || !this.state.grantSnapshot ? "" : this.state.provider.capabilities.map((t) => {
      const e = new Set(this.state.grantSnapshot.granted_grants), s = t.required_grants.every((u) => e.has(u)), i = t.optional_grants.every((u) => e.has(u)), r = s && i, n = s && !i, o = !s;
      let a, c, l;
      return r ? (a = "Fully Enabled", c = "bg-green-100 text-green-700", l = "iconoir:check-circle") : n ? (a = "Partially Enabled", c = "bg-blue-100 text-blue-700", l = "iconoir:half-moon") : (a = t.denied_behavior === "block" ? "Blocked" : "Degraded", c = t.denied_behavior === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700", l = t.denied_behavior === "block" ? "iconoir:lock" : "iconoir:warning-triangle"), `
          <div class="capability-card border border-gray-200 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">${this.escapeHtml(this.formatLabel(t.name))}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  ${t.required_grants.length} required, ${t.optional_grants.length} optional
                </p>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c}">
                ${d(l, { size: "12px" })}
                ${a}
              </span>
            </div>
            ${o && t.denied_behavior === "block" ? `
              <p class="text-xs text-red-600 mt-2">
                Missing required: ${t.required_grants.filter((u) => !e.has(u)).join(", ")}
              </p>
            ` : ""}
          </div>
        `;
    }).join("");
  }
  renderCredentialHealthPanel() {
    const t = this.state.credentialHealth;
    if (!t) return "";
    let e = "healthy", s = "Healthy", i = "bg-green-100 text-green-700 border-green-200", r = "iconoir:shield-check";
    if (!t.has_active_credential)
      e = "error", s = "No Active Credential", i = "bg-red-100 text-red-700 border-red-200", r = "iconoir:warning-circle";
    else if (t.last_error)
      e = "error", s = "Credential Error", i = "bg-red-100 text-red-700 border-red-200", r = "iconoir:warning-circle";
    else if (t.expires_at) {
      const n = new Date(t.expires_at), o = /* @__PURE__ */ new Date(), a = (n.getTime() - o.getTime()) / (1e3 * 60 * 60);
      a < 0 ? (e = "error", s = "Expired", i = "bg-red-100 text-red-700 border-red-200", r = "iconoir:clock") : a < 24 && (e = "warning", s = "Expiring Soon", i = "bg-amber-100 text-amber-700 border-amber-200", r = "iconoir:clock");
    }
    return `
      <div class="credential-health-panel bg-white rounded-lg border ${e === "healthy" ? "border-gray-200" : e === "warning" ? "border-amber-200" : "border-red-200"}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${d("iconoir:key", { size: "20px" })}
            Credential Health
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${i}">
            ${d(r, { size: "12px" })}
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
                ${d("iconoir:warning-circle", {
      size: "16px",
      extraClass: "text-red-500 mt-0.5 flex-shrink-0"
    })}
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
    if (!t) return "";
    let e = "healthy", s = "Normal", i = "bg-green-100 text-green-700", r = "iconoir:check-circle";
    if (t.exhausted_buckets > 0) {
      const o = t.exhausted_buckets / Math.max(t.total_buckets, 1);
      o >= 1 ? (e = "exhausted", s = "All Limits Exhausted", i = "bg-red-100 text-red-700", r = "iconoir:warning-circle") : o >= 0.5 ? (e = "warning", s = "High Usage", i = "bg-amber-100 text-amber-700", r = "iconoir:warning-triangle") : (e = "warning", s = "Some Limits Hit", i = "bg-amber-100 text-amber-700", r = "iconoir:clock");
    }
    const n = t.total_buckets > 0 ? Math.round(t.exhausted_buckets / t.total_buckets * 100) : 0;
    return `
      <div class="rate-limit-panel bg-white rounded-lg border ${e === "healthy" ? "border-gray-200" : e === "warning" ? "border-amber-200" : "border-red-200"}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${d("iconoir:graph-up", { size: "20px" })}
            Rate Limits
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${i}">
            ${d(r, { size: "12px" })}
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
              <div class="h-full transition-all duration-300 ${e === "healthy" ? "bg-green-500" : e === "warning" ? "bg-amber-500" : "bg-red-500"}" style="width: ${n}%"></div>
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
                ${d("iconoir:warning-circle", {
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
    const e = Math.floor(t / 3600), s = Math.floor(t % 3600 / 60);
    return s > 0 ? `${e}h ${s}m` : `${e}h`;
  }
  formatRelativeTime(t) {
    const e = new Date(t);
    if (Number.isNaN(e.getTime())) return t;
    const s = /* @__PURE__ */ new Date(), i = e.getTime() - s.getTime(), r = i > 0, n = Math.abs(i), o = Math.floor(n / 6e4), a = Math.floor(n / 36e5), c = Math.floor(n / 864e5);
    return o < 1 ? r ? "in a moment" : "just now" : o < 60 ? r ? `in ${o}m` : `${o}m ago` : a < 24 ? r ? `in ${a}h` : `${a}h ago` : c < 7 ? r ? `in ${c}d` : `${c}d ago` : e.toLocaleDateString();
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
        const t = this.buildGrantInfoList().filter((s) => s.status === "capability_required").map((s) => s.grant), e = await this.client.beginReconsent(this.config.connectionId, { requested_grants: t.length > 0 ? t : void 0 });
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
    if (!this.state.connection || !await W({
      action: "revoke",
      resourceType: "connection",
      resourceName: this.config.getProviderName ? this.config.getProviderName(this.state.connection.provider_id) : this.formatProviderId(this.state.connection.provider_id)
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
    this.container && (this.container.innerHTML = O({
      text: "Loading connection details...",
      size: "lg"
    }));
  }
  renderError() {
    this.container && (this.container.innerHTML = z({
      title: "Failed to Load Connection",
      error: this.state.error,
      showRetry: !0
    }), this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => this.loadConnection()));
  }
  renderForbidden() {
    this.container && (this.container.innerHTML = L({ resource: "connection details" }));
  }
  buildGrantInfoList() {
    const t = this.state.grantSnapshot, e = this.state.provider;
    if (!t) return [];
    const s = new Set(t.requested_grants), i = new Set(t.granted_grants), r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
    if (e) for (const l of e.capabilities) {
      for (const u of l.required_grants) {
        n.add(u);
        const g = r.get(u) || [];
        g.push(l.name), r.set(u, g);
      }
      for (const u of l.optional_grants) {
        const g = r.get(u) || [];
        g.push(l.name), r.set(u, g);
      }
    }
    const o = /* @__PURE__ */ new Set([
      ...t.requested_grants,
      ...t.granted_grants,
      ...n
    ]), a = [];
    for (const l of o) {
      const u = i.has(l), g = s.has(l), p = n.has(l);
      let h;
      u ? h = "granted" : g ? h = "requested" : p ? h = "capability_required" : h = "missing", a.push({
        grant: l,
        status: h,
        isRequired: g || p,
        isCapabilityRequired: p,
        capabilities: r.get(l) || []
      });
    }
    const c = {
      capability_required: 0,
      granted: 1,
      requested: 2,
      missing: 3
    };
    return a.sort((l, u) => c[l.status] - c[u.status]), a;
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
};
async function Ts(t) {
  const e = new Le(t);
  return await e.init(), e;
}
export {
  Qe as $,
  us as A,
  P as At,
  Zt as B,
  He as Bt,
  os as C,
  k as Ct,
  bs as D,
  Ht as Dt,
  fs as E,
  it as Et,
  se as F,
  Fe as Ft,
  Xt as G,
  Me as Gt,
  w as H,
  D as Ht,
  ns as I,
  ze as It,
  F as J,
  A as Jt,
  is as K,
  Ct as Kt,
  ts as L,
  jt as Lt,
  ps as M,
  _ as Mt,
  hs as N,
  De as Nt,
  ae as O,
  M as Ot,
  ms as P,
  Oe as Pt,
  Wt as Q,
  ee as R,
  Dt as Rt,
  ls as S,
  U as St,
  re as T,
  _t as Tt,
  At as U,
  Ie as Ut,
  es as V,
  Ue as Vt,
  ss as W,
  qe as Wt,
  Ge as X,
  st as Xt,
  Xe as Y,
  Pe as Yt,
  Vt as Z,
  C as Zt,
  j as _,
  kt as _t,
  $e as a,
  Ut as at,
  cs as b,
  B as bt,
  Cs as c,
  zt as ct,
  xe as d,
  v as dt,
  Je as et,
  ws as f,
  Ve as ft,
  vs as g,
  O as gt,
  ys as h,
  L as ht,
  Ls as i,
  J as it,
  gs as j,
  Y as jt,
  ds as k,
  je as kt,
  Se as l,
  Ot as lt,
  Ss as m,
  z as mt,
  Ts as n,
  Ze as nt,
  _s as o,
  tt as ot,
  ye as p,
  Tt as pt,
  rs as q,
  Re as qt,
  Ce as r,
  Ke as rt,
  we as s,
  W as st,
  Le as t,
  Ye as tt,
  $s as u,
  We as ut,
  xs as v,
  Be as vt,
  G as w,
  R as wt,
  as as x,
  I as xt,
  ie as y,
  V as yt,
  te as z,
  Ne as zt
};

//# sourceMappingURL=services-CHKL_Rrd.js.map
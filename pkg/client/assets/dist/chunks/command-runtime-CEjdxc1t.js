import { formatStructuredErrorForDisplay as b, extractStructuredError as g, parseActionResponse as A } from "../toast/error-helpers.js";
import { F as P } from "./toast-manager-DQTs-tOQ.js";
const k = "/admin/services", L = {
  connection: "connections",
  installation: "installations",
  subscription: "subscriptions",
  sync: "sync",
  provider: "providers",
  activity: "activity"
};
function m() {
  if (typeof window < "u")
    return window;
}
function y() {
  if (!(typeof globalThis > "u"))
    return globalThis.sessionStorage;
}
function x(a) {
  const t = m();
  if (t && typeof t.btoa == "function")
    return t.btoa(a);
  const e = globalThis.Buffer;
  if (e)
    return e.from(a, "utf8").toString("base64");
  throw new Error("base64 encoding is unavailable");
}
function M(a) {
  const t = m();
  if (t && typeof t.atob == "function")
    return t.atob(a);
  const e = globalThis.Buffer;
  if (e)
    return e.from(a, "base64").toString("utf8");
  throw new Error("base64 decoding is unavailable");
}
class j {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || k, this.pathMap = { ...L, ...t.pathMap };
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
  generateLink(t, e, r) {
    const n = this.pathMap[t] || t;
    let s = `${this.basePath}/${n}/${encodeURIComponent(e)}`;
    if (r) {
      const i = this.encodeContext(r);
      i && (s += `?ctx=${i}`);
    }
    return s;
  }
  /**
   * Generate a link to an entity list page with optional filters.
   */
  generateListLink(t, e) {
    const r = this.pathMap[t] || t;
    let n = `${this.basePath}/${r}`;
    if (e && Object.keys(e).length > 0) {
      const s = new URLSearchParams();
      for (const [i, o] of Object.entries(e))
        o && s.set(i, o);
      n += `?${s.toString()}`;
    }
    return n;
  }
  /**
   * Navigate to an entity, preserving context for back navigation.
   */
  navigateTo(t, e, r, n = {}) {
    const s = m();
    if (!s?.history)
      return;
    r && this.saveContext(r);
    const i = this.generateLink(t, e, r);
    n.replace ? s.history.replaceState({ entityType: t, entityId: e, context: r }, "", i) : s.history.pushState({ entityType: t, entityId: e, context: r }, "", i), s.dispatchEvent(
      new CustomEvent("services:navigate", {
        detail: { entityType: t, entityId: e, context: r, url: i }
      })
    );
  }
  /**
   * Navigate back with context restoration.
   */
  navigateBack() {
    const t = m();
    if (!t?.history)
      return this.restoreContext();
    const e = this.restoreContext();
    if (e?.fromPage) {
      const r = new URLSearchParams();
      if (e.filters)
        for (const [i, o] of Object.entries(e.filters))
          o && r.set(i, o);
      e.search && r.set("q", e.search), e.page && e.page > 1 && r.set("page", String(e.page)), e.viewMode && r.set("view", e.viewMode);
      const n = r.toString(), s = n ? `${e.fromPage}?${n}` : e.fromPage;
      return t.history.pushState({ restored: !0 }, "", s), t.dispatchEvent(
        new CustomEvent("services:navigate-back", {
          detail: { context: e, url: s }
        })
      ), e;
    }
    return t.history.back(), null;
  }
  /**
   * Parse entity info from current URL.
   */
  parseCurrentUrl() {
    const t = m();
    return t?.location ? this.parseUrl(t.location.pathname + t.location.search) : null;
  }
  /**
   * Parse entity info from a URL.
   */
  parseUrl(t) {
    const [e, r] = t.split("?"), s = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (s.length < 2)
      return null;
    const i = s[0], o = decodeURIComponent(s[1]);
    let c = null;
    for (const [p, d] of Object.entries(this.pathMap))
      if (d === i) {
        c = p;
        break;
      }
    if (!c)
      return null;
    let h;
    if (r) {
      const d = new URLSearchParams(r).get("ctx");
      d && (h = this.decodeContext(d));
    }
    return { entityType: c, entityId: o, context: h };
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
    const r = {};
    for (const [n, s] of Object.entries(t.filters))
      s && (r[n] = s);
    return {
      fromPage: m()?.location?.pathname,
      filters: Object.keys(r).length > 0 ? r : void 0,
      search: t.search || void 0,
      page: t.page > 1 ? t.page : void 0,
      viewMode: e
    };
  }
  // ---------------------------------------------------------------------------
  // Context Storage
  // ---------------------------------------------------------------------------
  saveContext(t) {
    const e = y();
    if (e)
      try {
        e.setItem(this.contextStorageKey, JSON.stringify(t));
      } catch {
      }
  }
  restoreContext() {
    const t = y();
    if (!t)
      return null;
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
      return x(JSON.stringify(t));
    } catch {
      return "";
    }
  }
  decodeContext(t) {
    try {
      return JSON.parse(M(t));
    } catch {
      return;
    }
  }
}
const u = new j();
function J(a) {
  u.configure(a);
}
function K(a, t, e) {
  return u.generateLink(a, t, e);
}
function Q(a, t) {
  return u.generateListLink(a, t);
}
function D(a, t, e, r) {
  u.navigateTo(a, t, e, r);
}
function V() {
  return u.navigateBack();
}
function z() {
  return u.parseCurrentUrl();
}
function G(a) {
  return u.parseUrl(a);
}
function R(a) {
  return u.mapObjectTypeToEntity(a);
}
function B(a, t) {
  return u.createContextFromQueryState(a, t);
}
function X(a, t) {
  return (e, r) => {
    const n = R(e);
    if (!n) {
      console.warn(`[DeepLinks] Unknown object type: ${e}`);
      return;
    }
    const s = B(
      a(),
      t?.()
    );
    D(n, r, s);
  };
}
function N() {
  const a = globalThis.window;
  return a?.toastManager ? a.toastManager : new P();
}
function l(a) {
  return String(a || "").trim();
}
function I(a) {
  return a.replace(/[A-Z]/g, (t) => `-${t.toLowerCase()}`).replace(/^-+/, "");
}
function $(a) {
  return I(a).replace(/-/g, "_");
}
function S(a) {
  return String(a || "").split(",").map((t) => t.trim()).filter(Boolean);
}
function f(a, t) {
  if (a && typeof a == "object") {
    const e = a;
    if (typeof e.message == "string")
      return {
        textCode: typeof e.textCode == "string" ? e.textCode : null,
        message: e.message || t,
        metadata: e.metadata && typeof e.metadata == "object" ? e.metadata : null,
        fields: e.fields && typeof e.fields == "object" ? e.fields : null,
        validationErrors: Array.isArray(e.validationErrors) ? e.validationErrors : null
      };
  }
  return {
    textCode: null,
    message: t,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
function v(a, t) {
  if (!a || typeof a != "object")
    return {
      success: !1,
      error: f(null, t)
    };
  const e = A(a);
  return e.success ? {
    success: !0,
    data: e.data
  } : {
    success: !1,
    error: e.error || f(null, t)
  };
}
function w(a) {
  const t = {};
  for (const e of Array.from(a.attributes)) {
    if (!e.name.startsWith("data-command-payload-"))
      continue;
    const r = e.name.slice(21), n = $(r);
    t[n] = e.value;
  }
  return t;
}
function H(a, t, e) {
  if (t) {
    if (typeof e == "string") {
      const r = e.trim();
      if (!r)
        return;
      if (a[t] === void 0) {
        a[t] = r;
        return;
      }
      if (Array.isArray(a[t])) {
        a[t].push(r);
        return;
      }
      a[t] = [a[t], r];
      return;
    }
    a[t] = e;
  }
}
function O(a) {
  if (!a)
    return {};
  const t = {};
  return new FormData(a).forEach((r, n) => {
    H(t, n, r);
  }), t;
}
function T(a) {
  const t = l(a.dataset.commandBusyTarget);
  if (t)
    return document.querySelector(t);
  const e = l(a.dataset.commandBusyClosest);
  return e ? a.closest(e) : null;
}
function C(a, t) {
  a && ((a instanceof HTMLButtonElement || a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement) && (a.disabled = t), t ? a.setAttribute("aria-busy", "true") : a.removeAttribute("aria-busy"));
}
function E(a, t) {
  a && (t ? a.setAttribute("aria-busy", "true") : a.removeAttribute("aria-busy"), a.querySelectorAll("button").forEach((e) => {
    e.disabled = t, t ? e.setAttribute("aria-busy", "true") : e.removeAttribute("aria-busy");
  }));
}
function F(a) {
  const t = /* @__PURE__ */ new Map();
  return a.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((e) => {
    const r = l(e.getAttribute("aria-controls") || void 0);
    r && t.set(r, e.getAttribute("aria-expanded") === "true");
  }), t;
}
function U(a, t) {
  t.forEach((e, r) => {
    const n = a.querySelector(`.collapsible-trigger[aria-controls="${r}"]`), s = document.getElementById(r);
    !n || !s || (n.setAttribute("aria-expanded", e ? "true" : "false"), s.classList.toggle("expanded", e));
  });
}
class W {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || N(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]"))
        return;
      t.preventDefault();
      const r = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, r);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element))
        return;
      const r = e.closest("[data-command-name]:not(form)");
      !r || !this.mount.contains(r) || (t.preventDefault(), this.handleCommand(r, null, r));
    }, document.addEventListener("submit", this.submitHandler), document.addEventListener("click", this.clickHandler));
  }
  destroy() {
    this.submitHandler && (document.removeEventListener("submit", this.submitHandler), this.submitHandler = null), this.clickHandler && (document.removeEventListener("click", this.clickHandler), this.clickHandler = null);
  }
  scopePayload() {
    const t = {};
    return this.tenantId && (t.tenant_id = this.tenantId), this.orgId && (t.org_id = this.orgId), t;
  }
  buildSpec(t, e, r) {
    const n = l(t.dataset.commandName || e?.dataset.commandName), s = l(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", i = l(t.dataset.commandDispatch || e?.dataset.commandDispatch) || n, o = O(e), c = w(t), h = e ? w(e) : {}, p = {
      ...this.scopePayload(),
      ...o,
      ...h,
      ...c
    }, d = S(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? S(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: n,
      dispatchName: i,
      transport: s,
      payload: p,
      successMessage: l(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${n} completed successfully`,
      fallbackMessage: l(t.dataset.commandFailure || e?.dataset.commandFailure) || `${n} failed`,
      refreshSelectors: d,
      confirmMessage: l(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: l(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: l(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: l(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: T(t) || (e ? T(e) : null),
      submitter: r
    };
  }
  async handleCommand(t, e, r) {
    const n = this.buildSpec(t, e, r);
    if (!n.commandName || !n.dispatchName || n.submitter && n.submitter.getAttribute("aria-busy") === "true" || n.confirmMessage && !await this.notifier.confirm(n.confirmMessage, {
      title: n.confirmTitle || void 0
    }))
      return;
    if (n.reasonTitle) {
      const i = n.reasonSubject ? `${n.reasonTitle}

${n.reasonSubject}

Enter a reason:` : `${n.reasonTitle}

Enter a reason:`, o = globalThis.window?.prompt(i, "") ?? null;
      if (o === null)
        return;
      const c = String(o || "").trim();
      if (!c) {
        this.notifier.error("A reason is required.");
        return;
      }
      n.payload.reason = c;
    }
    const s = {
      trigger: n.trigger,
      form: n.form,
      commandName: n.commandName,
      transport: n.transport,
      payload: { ...n.payload },
      success: !1
    };
    this.onBeforeDispatch?.(s), C(n.submitter, !0), E(n.busyTarget, !0);
    try {
      const i = n.transport === "rpc" ? await this.dispatchRPC(n) : await this.dispatchAction(n), o = {
        ...s,
        success: i.success,
        data: i.data,
        error: i.error
      };
      if (!i.success || i.error) {
        const c = b(
          i.error || f(null, n.fallbackMessage),
          n.fallbackMessage
        );
        this.notifier.error(c), this.onAfterDispatch?.(o);
        return;
      }
      if (this.notifier.success(n.successMessage), n.refreshSelectors.length > 0) {
        const c = await this.refreshFragments(n.refreshSelectors);
        c && this.onAfterRefresh?.({
          mount: this.mount,
          trigger: n.trigger,
          selectors: n.refreshSelectors,
          sourceDocument: c
        });
      }
      this.onAfterDispatch?.(o);
    } catch (i) {
      const o = f(i, n.fallbackMessage);
      this.notifier.error(b(o, n.fallbackMessage)), this.onAfterDispatch?.({
        ...s,
        success: !1,
        error: o
      });
    } finally {
      C(n.submitter, !1), E(n.busyTarget, !1);
    }
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName)
      return {
        success: !1,
        error: f(null, "Action transport is not configured")
      };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, r = {
      id: this.recordId,
      ...t.payload
    }, n = await this.fetchImpl(e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(r)
    });
    if (!n.ok)
      return {
        success: !1,
        error: await g(n)
      };
    const s = await n.json().catch(() => null);
    return v(s, t.fallbackMessage);
  }
  async dispatchRPC(t) {
    const e = {
      method: "admin.commands.dispatch",
      params: {
        data: {
          name: t.dispatchName,
          ids: this.recordId ? [this.recordId] : [],
          payload: t.payload
        }
      }
    }, r = await this.fetchImpl(this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    });
    if (!r.ok)
      return {
        success: !1,
        error: await g(r)
      };
    const n = await r.json().catch(() => null);
    return n && typeof n == "object" && "error" in n ? v(n, t.fallbackMessage) : n && typeof n == "object" && "data" in n && typeof n.data == "object" ? {
      success: !0,
      data: n.data
    } : {
      success: !0,
      data: n && typeof n == "object" ? n : void 0
    };
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
    if (!e.ok)
      return null;
    const r = await e.text();
    if (!r.trim())
      return null;
    const n = new DOMParser().parseFromString(r, "text/html");
    return t.forEach((s) => {
      this.replaceFragment(s, n);
    }), n;
  }
  replaceFragment(t, e) {
    const r = document.querySelector(t), n = e.querySelector(t);
    if (!r && !n)
      return;
    if (r && !n) {
      r.remove();
      return;
    }
    if (!r || !n)
      return;
    const s = F(r), i = document.importNode(n, !0);
    r.replaceWith(i), i instanceof Element && U(i, s);
  }
}
function Z(a) {
  if (!a.mount)
    return null;
  const t = new W(a);
  return t.init(), t;
}
export {
  W as C,
  J as a,
  Q as b,
  X as c,
  V as d,
  G as e,
  B as f,
  K as g,
  u as h,
  Z as i,
  R as m,
  D as n,
  z as p
};
//# sourceMappingURL=command-runtime-CEjdxc1t.js.map

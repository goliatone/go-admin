import { formatStructuredErrorForDisplay as g, extractStructuredError as y, parseActionResponse as A } from "../toast/error-helpers.js";
import { F as M } from "./toast-manager-DQTs-tOQ.js";
const I = "/admin/services", P = {
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
function S() {
  if (!(typeof globalThis > "u"))
    return globalThis.sessionStorage;
}
function x(r) {
  const t = m();
  if (t && typeof t.btoa == "function")
    return t.btoa(r);
  const e = globalThis.Buffer;
  if (e)
    return e.from(r, "utf8").toString("base64");
  throw new Error("base64 encoding is unavailable");
}
function N(r) {
  const t = m();
  if (t && typeof t.atob == "function")
    return t.atob(r);
  const e = globalThis.Buffer;
  if (e)
    return e.from(r, "base64").toString("utf8");
  throw new Error("base64 decoding is unavailable");
}
class L {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || I, this.pathMap = { ...P, ...t.pathMap };
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
  generateLink(t, e, n) {
    const s = this.pathMap[t] || t;
    let a = `${this.basePath}/${s}/${encodeURIComponent(e)}`;
    if (n) {
      const i = this.encodeContext(n);
      i && (a += `?ctx=${i}`);
    }
    return a;
  }
  /**
   * Generate a link to an entity list page with optional filters.
   */
  generateListLink(t, e) {
    const n = this.pathMap[t] || t;
    let s = `${this.basePath}/${n}`;
    if (e && Object.keys(e).length > 0) {
      const a = new URLSearchParams();
      for (const [i, o] of Object.entries(e))
        o && a.set(i, o);
      s += `?${a.toString()}`;
    }
    return s;
  }
  /**
   * Navigate to an entity, preserving context for back navigation.
   */
  navigateTo(t, e, n, s = {}) {
    const a = m();
    if (!a?.history)
      return;
    n && this.saveContext(n);
    const i = this.generateLink(t, e, n);
    s.replace ? a.history.replaceState({ entityType: t, entityId: e, context: n }, "", i) : a.history.pushState({ entityType: t, entityId: e, context: n }, "", i), a.dispatchEvent(
      new CustomEvent("services:navigate", {
        detail: { entityType: t, entityId: e, context: n, url: i }
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
      const n = new URLSearchParams();
      if (e.filters)
        for (const [i, o] of Object.entries(e.filters))
          o && n.set(i, o);
      e.search && n.set("q", e.search), e.page && e.page > 1 && n.set("page", String(e.page)), e.viewMode && n.set("view", e.viewMode);
      const s = n.toString(), a = s ? `${e.fromPage}?${s}` : e.fromPage;
      return t.history.pushState({ restored: !0 }, "", a), t.dispatchEvent(
        new CustomEvent("services:navigate-back", {
          detail: { context: e, url: a }
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
    const [e, n] = t.split("?"), a = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (a.length < 2)
      return null;
    const i = a[0], o = decodeURIComponent(a[1]);
    let d = null;
    for (const [p, u] of Object.entries(this.pathMap))
      if (u === i) {
        d = p;
        break;
      }
    if (!d)
      return null;
    let h;
    if (n) {
      const u = new URLSearchParams(n).get("ctx");
      u && (h = this.decodeContext(u));
    }
    return { entityType: d, entityId: o, context: h };
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
    const n = {};
    for (const [s, a] of Object.entries(t.filters))
      a && (n[s] = a);
    return {
      fromPage: m()?.location?.pathname,
      filters: Object.keys(n).length > 0 ? n : void 0,
      search: t.search || void 0,
      page: t.page > 1 ? t.page : void 0,
      viewMode: e
    };
  }
  // ---------------------------------------------------------------------------
  // Context Storage
  // ---------------------------------------------------------------------------
  saveContext(t) {
    const e = S();
    if (e)
      try {
        e.setItem(this.contextStorageKey, JSON.stringify(t));
      } catch {
      }
  }
  restoreContext() {
    const t = S();
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
      return JSON.parse(N(t));
    } catch {
      return;
    }
  }
}
const l = new L();
function Q(r) {
  l.configure(r);
}
function V(r, t, e) {
  return l.generateLink(r, t, e);
}
function X(r, t) {
  return l.generateListLink(r, t);
}
function D(r, t, e, n) {
  l.navigateTo(r, t, e, n);
}
function Z() {
  return l.navigateBack();
}
function Y() {
  return l.parseCurrentUrl();
}
function tt(r) {
  return l.parseUrl(r);
}
function j(r) {
  return l.mapObjectTypeToEntity(r);
}
function R(r, t) {
  return l.createContextFromQueryState(r, t);
}
function et(r, t) {
  return (e, n) => {
    const s = j(e);
    if (!s) {
      console.warn(`[DeepLinks] Unknown object type: ${e}`);
      return;
    }
    const a = R(
      r(),
      t?.()
    );
    D(s, n, a);
  };
}
function B() {
  const r = globalThis.window;
  return r?.toastManager ? r.toastManager : new M();
}
function c(r) {
  return String(r || "").trim();
}
function F(r) {
  return r.replace(/[A-Z]/g, (t) => `-${t.toLowerCase()}`).replace(/^-+/, "");
}
function $(r) {
  return F(r).replace(/-/g, "_");
}
function v(r) {
  return String(r || "").split(",").map((t) => t.trim()).filter(Boolean);
}
function b(r) {
  return String(r || "").trim().toLowerCase() || void 0;
}
function U() {
  const r = globalThis.crypto;
  if (r?.randomUUID)
    return r.randomUUID();
  const t = Date.now().toString(36), e = Math.random().toString(36).slice(2, 12);
  return `cmd_${t}_${e}`;
}
function _(r) {
  const t = String(r.correlation_id || "").trim();
  if (t)
    return t;
  const e = U();
  return r.correlation_id = e, e;
}
function f(r, t) {
  if (r && typeof r == "object") {
    const e = r;
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
function k(r, t) {
  if (!r || typeof r != "object")
    return {
      success: !1,
      error: f(null, t)
    };
  const e = A(r);
  return e.success ? {
    success: !0,
    data: e.data
  } : {
    success: !1,
    error: e.error || f(null, t)
  };
}
function w(r) {
  const t = {};
  for (const e of Array.from(r.attributes)) {
    if (!e.name.startsWith("data-command-payload-"))
      continue;
    const n = e.name.slice(21), s = $(n);
    t[s] = e.value;
  }
  return t;
}
function H(r, t, e) {
  if (t) {
    if (typeof e == "string") {
      const n = e.trim();
      if (!n)
        return;
      if (r[t] === void 0) {
        r[t] = n;
        return;
      }
      if (Array.isArray(r[t])) {
        r[t].push(n);
        return;
      }
      r[t] = [r[t], n];
      return;
    }
    r[t] = e;
  }
}
function O(r) {
  if (!r)
    return {};
  const t = {};
  return new FormData(r).forEach((n, s) => {
    H(t, s, n);
  }), t;
}
function T(r) {
  const t = c(r.dataset.commandBusyTarget);
  if (t)
    return document.querySelector(t);
  const e = c(r.dataset.commandBusyClosest);
  return e ? r.closest(e) : null;
}
function C(r, t) {
  r && ((r instanceof HTMLButtonElement || r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r instanceof HTMLSelectElement) && (r.disabled = t), t ? r.setAttribute("aria-busy", "true") : r.removeAttribute("aria-busy"));
}
function E(r, t) {
  r && (t ? r.setAttribute("aria-busy", "true") : r.removeAttribute("aria-busy"), r.querySelectorAll("button").forEach((e) => {
    e.disabled = t, t ? e.setAttribute("aria-busy", "true") : e.removeAttribute("aria-busy");
  }));
}
function W(r) {
  const t = /* @__PURE__ */ new Map();
  return r.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((e) => {
    const n = c(e.getAttribute("aria-controls") || void 0);
    n && t.set(n, e.getAttribute("aria-expanded") === "true");
  }), t;
}
function q(r, t) {
  t.forEach((e, n) => {
    const s = r.querySelector(`.collapsible-trigger[aria-controls="${n}"]`), a = document.getElementById(n);
    !s || !a || (s.setAttribute("aria-expanded", e ? "true" : "false"), a.classList.toggle("expanded", e));
  });
}
function J(r) {
  if (!r || typeof r != "object")
    return;
  const t = r, e = typeof t.accepted == "boolean" ? t.accepted : void 0, n = b(t.mode), s = String(t.command_id || t.commandId || "").trim() || void 0, a = String(t.dispatch_id || t.dispatchId || "").trim() || void 0, i = String(t.correlation_id || t.correlationId || "").trim() || void 0, o = t.enqueued_at || t.enqueuedAt, d = o == null ? void 0 : String(o).trim() || void 0;
  if (!(e === void 0 && !n && !s && !a && !i && !d))
    return {
      accepted: e,
      mode: n,
      commandId: s,
      dispatchId: a,
      correlationId: i,
      enqueuedAt: d
    };
}
class K {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.feedbackUnsubscribe = null, this.pendingFeedback = /* @__PURE__ */ new Map(), this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || B(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.feedback = t.feedback, this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]"))
        return;
      t.preventDefault();
      const n = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, n);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element))
        return;
      const n = e.closest("[data-command-name]:not(form)");
      !n || !this.mount.contains(n) || (t.preventDefault(), this.handleCommand(n, null, n));
    }, document.addEventListener("submit", this.submitHandler), document.addEventListener("click", this.clickHandler), this.feedback?.adapter && !this.feedbackUnsubscribe && (this.feedbackUnsubscribe = this.feedback.adapter.subscribe((t) => {
      this.handleFeedbackEvent(t);
    })));
  }
  destroy() {
    this.submitHandler && (document.removeEventListener("submit", this.submitHandler), this.submitHandler = null), this.clickHandler && (document.removeEventListener("click", this.clickHandler), this.clickHandler = null), this.feedbackUnsubscribe && (this.feedbackUnsubscribe(), this.feedbackUnsubscribe = null), this.pendingFeedback.clear();
  }
  scopePayload() {
    const t = {};
    return this.tenantId && (t.tenant_id = this.tenantId), this.orgId && (t.org_id = this.orgId), t;
  }
  buildSpec(t, e, n) {
    const s = c(t.dataset.commandName || e?.dataset.commandName), a = c(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", i = c(t.dataset.commandDispatch || e?.dataset.commandDispatch) || s, o = O(e), d = w(t), h = e ? w(e) : {}, p = {
      ...this.scopePayload(),
      ...o,
      ...h,
      ...d
    }, u = v(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? v(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: s,
      dispatchName: i,
      transport: a,
      payload: p,
      successMessage: c(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${s} completed successfully`,
      fallbackMessage: c(t.dataset.commandFailure || e?.dataset.commandFailure) || `${s} failed`,
      refreshSelectors: u,
      confirmMessage: c(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: c(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: c(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: c(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: T(t) || (e ? T(e) : null),
      submitter: n
    };
  }
  buildManualSpec(t) {
    const e = t.trigger || this.mount, n = {
      ...this.scopePayload(),
      ...t.payload || {}
    }, s = Array.isArray(t.refreshSelectors) && t.refreshSelectors.length > 0 ? t.refreshSelectors.filter(Boolean) : this.defaultRefreshSelectors;
    return {
      trigger: e,
      form: t.form || null,
      commandName: String(t.commandName || "").trim(),
      dispatchName: String(t.dispatchName || t.commandName || "").trim(),
      transport: t.transport || "action",
      payload: n,
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
  async handleCommand(t, e, n) {
    const s = this.buildSpec(t, e, n);
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
    if (t.submitter && t.submitter.getAttribute("aria-busy") === "true" || t.confirmMessage && !await this.notifier.confirm(t.confirmMessage, {
      title: t.confirmTitle || void 0
    }))
      return e();
    if (t.reasonTitle) {
      const a = t.reasonSubject ? `${t.reasonTitle}

${t.reasonSubject}

Enter a reason:` : `${t.reasonTitle}

Enter a reason:`, i = globalThis.window?.prompt(a, "") ?? null;
      if (i === null)
        return e();
      const o = String(i || "").trim();
      if (!o)
        return this.notifier.error("A reason is required."), e();
      t.payload.reason = o;
    }
    const n = _(t.payload), s = {
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: n,
      success: !1
    };
    this.onBeforeDispatch?.(s), C(t.submitter, !0), E(t.busyTarget, !0);
    try {
      const a = t.transport === "rpc" ? await this.dispatchRPC(t) : await this.dispatchAction(t), i = {
        ...s,
        success: a.success,
        data: a.data,
        error: a.error,
        correlationId: a.correlationId || n,
        receipt: a.receipt,
        responseMode: a.responseMode
      };
      if (!a.success || a.error) {
        const o = g(
          a.error || f(null, t.fallbackMessage),
          t.fallbackMessage
        );
        return this.notifier.error(o), this.onAfterDispatch?.(i), i;
      }
      return this.notifier.success(t.successMessage), this.shouldWaitForFeedback(i) ? this.pendingFeedback.set(i.correlationId, {
        correlationId: i.correlationId,
        commandName: i.commandName,
        transport: i.transport,
        responseMode: i.responseMode,
        receipt: i.receipt,
        refreshSelectors: [...t.refreshSelectors],
        trigger: t.trigger
      }) : t.refreshSelectors.length > 0 && await this.refreshSelectors(t.refreshSelectors, t.trigger), this.onAfterDispatch?.(i), i;
    } catch (a) {
      const i = f(a, t.fallbackMessage), o = {
        ...s,
        success: !1,
        error: i
      };
      return this.notifier.error(g(i, t.fallbackMessage)), this.onAfterDispatch?.(o), o;
    } finally {
      C(t.submitter, !1), E(t.busyTarget, !1);
    }
  }
  shouldWaitForFeedback(t) {
    return this.feedback?.adapter ? b(t.responseMode || t.receipt?.mode) === "queued" : !1;
  }
  async handleFeedbackEvent(t) {
    const e = String(t.correlationId || "").trim(), n = e && this.pendingFeedback.get(e) || null;
    n && this.pendingFeedback.delete(e);
    const s = {
      controller: this,
      event: t,
      pending: n
    };
    if (t.type === "stream_gap") {
      await this.feedback?.onStreamGap?.(s);
      return;
    }
    await this.feedback?.onEvent?.(s);
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName)
      return {
        success: !1,
        error: f(null, "Action transport is not configured")
      };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, n = {
      id: this.recordId,
      ...t.payload
    }, s = await this.fetchImpl(e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(n)
    });
    if (!s.ok)
      return {
        success: !1,
        error: await y(s)
      };
    const a = await s.json().catch(() => null);
    return {
      ...k(a, t.fallbackMessage),
      correlationId: String(t.payload.correlation_id || "").trim() || void 0
    };
  }
  async dispatchRPC(t) {
    const e = String(t.payload.correlation_id || "").trim() || void 0, n = {
      method: "admin.commands.dispatch",
      params: {
        data: {
          name: t.dispatchName,
          ids: this.recordId ? [this.recordId] : [],
          payload: t.payload,
          options: {
            correlation_id: e,
            metadata: {
              correlation_id: e
            }
          }
        }
      }
    }, s = await this.fetchImpl(this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(n)
    });
    if (!s.ok)
      return {
        success: !1,
        error: await y(s),
        correlationId: e
      };
    const a = await s.json().catch(() => null);
    if (a && typeof a == "object" && "error" in a)
      return {
        ...k(a, t.fallbackMessage),
        correlationId: e
      };
    if (a && typeof a == "object" && "data" in a && typeof a.data == "object") {
      const i = a.data, o = J(i.receipt);
      return {
        success: !0,
        data: i,
        correlationId: o?.correlationId || e,
        receipt: o,
        responseMode: b(i.response_mode || o?.mode)
      };
    }
    return {
      success: !0,
      data: a && typeof a == "object" ? a : void 0,
      correlationId: e
    };
  }
  async refreshSelectors(t, e = null) {
    const n = await this.refreshFragments(t);
    return n && this.onAfterRefresh?.({
      mount: this.mount,
      trigger: e || this.mount,
      selectors: t,
      sourceDocument: n
    }), n;
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
    const n = await e.text();
    if (!n.trim())
      return null;
    const s = new DOMParser().parseFromString(n, "text/html");
    return t.forEach((a) => {
      this.replaceFragment(a, s);
    }), s;
  }
  replaceFragment(t, e) {
    const n = document.querySelector(t), s = e.querySelector(t);
    if (!n && !s)
      return;
    if (n && !s) {
      n.remove();
      return;
    }
    if (!n || !s)
      return;
    const a = W(n), i = document.importNode(s, !0);
    n.replaceWith(i), i instanceof Element && q(i, a);
  }
}
function rt(r) {
  if (!r.mount)
    return null;
  const t = new K(r);
  return t.init(), t;
}
export {
  K as C,
  Q as a,
  X as b,
  et as c,
  Z as d,
  tt as e,
  R as f,
  V as g,
  l as h,
  rt as i,
  j as m,
  D as n,
  Y as p
};
//# sourceMappingURL=command-runtime-DPGMnWn7.js.map

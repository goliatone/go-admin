import { formatStructuredErrorForDisplay as b, extractStructuredError as S, parseActionResponse as E } from "../toast/error-helpers.js";
import { F as M } from "./toast-manager-BXE4J35T.js";
import { readHTTPJSONValue as D } from "../shared/transport/http-client.js";
const P = "/admin/services", N = {
  connection: "connections",
  installation: "installations",
  subscription: "subscriptions",
  sync: "sync",
  provider: "providers",
  activity: "activity"
};
function h() {
  if (typeof window < "u")
    return window;
}
function y() {
  if (!(typeof globalThis > "u"))
    return globalThis.sessionStorage;
}
function L(r) {
  const t = h();
  if (t && typeof t.btoa == "function")
    return t.btoa(r);
  const e = globalThis.Buffer;
  if (e)
    return e.from(r, "utf8").toString("base64");
  throw new Error("base64 encoding is unavailable");
}
function F(r) {
  const t = h();
  if (t && typeof t.atob == "function")
    return t.atob(r);
  const e = globalThis.Buffer;
  if (e)
    return e.from(r, "base64").toString("utf8");
  throw new Error("base64 decoding is unavailable");
}
class x {
  constructor(t = {}) {
    this.contextStorageKey = "services-nav-context", this.basePath = t.basePath || P, this.pathMap = { ...N, ...t.pathMap };
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
  generateLink(t, e, a) {
    const n = this.pathMap[t] || t;
    let s = `${this.basePath}/${n}/${encodeURIComponent(e)}`;
    if (a) {
      const c = this.encodeContext(a);
      c && (s += `?ctx=${c}`);
    }
    return s;
  }
  /**
   * Generate a link to an entity list page with optional filters.
   */
  generateListLink(t, e) {
    const a = this.pathMap[t] || t;
    let n = `${this.basePath}/${a}`;
    if (e && Object.keys(e).length > 0) {
      const s = new URLSearchParams();
      for (const [c, i] of Object.entries(e))
        i && s.set(c, i);
      n += `?${s.toString()}`;
    }
    return n;
  }
  /**
   * Navigate to an entity, preserving context for back navigation.
   */
  navigateTo(t, e, a, n = {}) {
    const s = h();
    if (!s?.history)
      return;
    a && this.saveContext(a);
    const c = this.generateLink(t, e, a);
    n.replace ? s.history.replaceState({ entityType: t, entityId: e, context: a }, "", c) : s.history.pushState({ entityType: t, entityId: e, context: a }, "", c), s.dispatchEvent(
      new CustomEvent("services:navigate", {
        detail: { entityType: t, entityId: e, context: a, url: c }
      })
    );
  }
  /**
   * Navigate back with context restoration.
   */
  navigateBack() {
    const t = h();
    if (!t?.history)
      return this.restoreContext();
    const e = this.restoreContext();
    if (e?.fromPage) {
      const a = new URLSearchParams();
      if (e.filters)
        for (const [c, i] of Object.entries(e.filters))
          i && a.set(c, i);
      e.search && a.set("q", e.search), e.page && e.page > 1 && a.set("page", String(e.page)), e.viewMode && a.set("view", e.viewMode);
      const n = a.toString(), s = n ? `${e.fromPage}?${n}` : e.fromPage;
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
    const t = h();
    return t?.location ? this.parseUrl(t.location.pathname + t.location.search) : null;
  }
  /**
   * Parse entity info from a URL.
   */
  parseUrl(t) {
    const [e, a] = t.split("?"), s = (e.startsWith(this.basePath) ? e.slice(this.basePath.length) : e).split("/").filter(Boolean);
    if (s.length < 2)
      return null;
    const c = s[0], i = decodeURIComponent(s[1]);
    let o = null;
    for (const [p, m] of Object.entries(this.pathMap))
      if (m === c) {
        o = p;
        break;
      }
    if (!o)
      return null;
    let l;
    if (a) {
      const m = new URLSearchParams(a).get("ctx");
      m && (l = this.decodeContext(m));
    }
    return { entityType: o, entityId: i, context: l };
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
    const a = {};
    for (const [n, s] of Object.entries(t.filters))
      s && (a[n] = s);
    return {
      fromPage: h()?.location?.pathname,
      filters: Object.keys(a).length > 0 ? a : void 0,
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
      return L(JSON.stringify(t));
    } catch {
      return "";
    }
  }
  decodeContext(t) {
    try {
      return JSON.parse(F(t));
    } catch {
      return;
    }
  }
}
const d = new x();
function Z(r) {
  d.configure(r);
}
function Y(r, t, e) {
  return d.generateLink(r, t, e);
}
function tt(r, t) {
  return d.generateListLink(r, t);
}
function R(r, t, e, a) {
  d.navigateTo(r, t, e, a);
}
function et() {
  return d.navigateBack();
}
function at() {
  return d.parseCurrentUrl();
}
function rt(r) {
  return d.parseUrl(r);
}
function j(r) {
  return d.mapObjectTypeToEntity(r);
}
function B(r, t) {
  return d.createContextFromQueryState(r, t);
}
function nt(r, t) {
  return (e, a) => {
    const n = j(e);
    if (!n) {
      console.warn(`[DeepLinks] Unknown object type: ${e}`);
      return;
    }
    const s = B(
      r(),
      t?.()
    );
    R(n, a, s);
  };
}
function _() {
  const r = globalThis.window;
  return r?.toastManager ? r.toastManager : new M();
}
function u(r) {
  return String(r || "").trim();
}
function $(r) {
  return r.replace(/[A-Z]/g, (t) => `-${t.toLowerCase()}`).replace(/^-+/, "");
}
function U(r) {
  return $(r).replace(/-/g, "_");
}
function v(r) {
  return String(r || "").split(",").map((t) => t.trim()).filter(Boolean);
}
function g(r) {
  return String(r || "").trim().toLowerCase() || void 0;
}
function H() {
  const r = globalThis.crypto;
  if (r?.randomUUID)
    return r.randomUUID();
  const t = Date.now().toString(36), e = Math.random().toString(36).slice(2, 12);
  return `cmd_${t}_${e}`;
}
function O(r) {
  const t = String(r.correlation_id || "").trim();
  if (t)
    return t;
  const e = H();
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
function I(r, t) {
  if (!r || typeof r != "object")
    return {
      success: !1,
      error: f(null, t)
    };
  const e = E(r);
  return e.success ? {
    success: !0,
    data: e.data
  } : {
    success: !1,
    error: e.error || f(null, t)
  };
}
async function w(r) {
  return D(r, null);
}
function k(r) {
  const t = {};
  for (const e of Array.from(r.attributes)) {
    if (!e.name.startsWith("data-command-payload-"))
      continue;
    const a = e.name.slice(21), n = U(a);
    t[n] = e.value;
  }
  return t;
}
function q(r, t, e) {
  if (t) {
    if (typeof e == "string") {
      const a = e.trim();
      if (!a)
        return;
      if (r[t] === void 0) {
        r[t] = a;
        return;
      }
      if (Array.isArray(r[t])) {
        r[t].push(a);
        return;
      }
      r[t] = [r[t], a];
      return;
    }
    r[t] = e;
  }
}
function W(r) {
  if (!r)
    return {};
  const t = {};
  return new FormData(r).forEach((a, n) => {
    q(t, n, a);
  }), t;
}
function T(r) {
  const t = u(r.dataset.commandBusyTarget);
  if (t)
    return document.querySelector(t);
  const e = u(r.dataset.commandBusyClosest);
  return e ? r.closest(e) : null;
}
function A(r, t) {
  r && ((r instanceof HTMLButtonElement || r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r instanceof HTMLSelectElement) && (r.disabled = t), t ? r.setAttribute("aria-busy", "true") : r.removeAttribute("aria-busy"));
}
function C(r, t) {
  r && (t ? r.setAttribute("aria-busy", "true") : r.removeAttribute("aria-busy"), r.querySelectorAll("button").forEach((e) => {
    e.disabled = t, t ? e.setAttribute("aria-busy", "true") : e.removeAttribute("aria-busy");
  }));
}
function J(r) {
  const t = /* @__PURE__ */ new Map();
  return r.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((e) => {
    const a = u(e.getAttribute("aria-controls") || void 0);
    a && t.set(a, e.getAttribute("aria-expanded") === "true");
  }), t;
}
function K(r, t) {
  t.forEach((e, a) => {
    const n = r.querySelector(`.collapsible-trigger[aria-controls="${a}"]`), s = document.getElementById(a);
    !n || !s || (n.setAttribute("aria-expanded", e ? "true" : "false"), s.classList.toggle("expanded", e));
  });
}
function z(r) {
  if (!r || typeof r != "object")
    return;
  const t = r, e = typeof t.accepted == "boolean" ? t.accepted : void 0, a = g(t.mode), n = String(t.command_id || t.commandId || "").trim() || void 0, s = String(t.dispatch_id || t.dispatchId || "").trim() || void 0, c = String(t.correlation_id || t.correlationId || "").trim() || void 0, i = t.enqueued_at || t.enqueuedAt, o = i == null ? void 0 : String(i).trim() || void 0;
  if (!(e === void 0 && !a && !n && !s && !c && !o))
    return {
      accepted: e,
      mode: a,
      commandId: n,
      dispatchId: s,
      correlationId: c,
      enqueuedAt: o
    };
}
class Q {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.feedbackUnsubscribe = null, this.pendingFeedback = /* @__PURE__ */ new Map(), this.inlineStatus = /* @__PURE__ */ new Map(), this.inlineStatusListeners = /* @__PURE__ */ new Set(), this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || _(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.feedback = t.feedback, this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]"))
        return;
      t.preventDefault();
      const a = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, a);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element))
        return;
      const a = e.closest("[data-command-name]:not(form)");
      !a || !this.mount.contains(a) || (t.preventDefault(), this.handleCommand(a, null, a));
    }, document.addEventListener("submit", this.submitHandler), document.addEventListener("click", this.clickHandler), this.feedback?.adapter && !this.feedbackUnsubscribe && (this.feedbackUnsubscribe = this.feedback.adapter.subscribe((t) => {
      this.handleFeedbackEvent(t);
    })));
  }
  destroy() {
    this.submitHandler && (document.removeEventListener("submit", this.submitHandler), this.submitHandler = null), this.clickHandler && (document.removeEventListener("click", this.clickHandler), this.clickHandler = null), this.feedbackUnsubscribe && (this.feedbackUnsubscribe(), this.feedbackUnsubscribe = null), this.pendingFeedback.clear(), this.inlineStatus.clear(), this.inlineStatusListeners.clear();
  }
  /**
   * Subscribe to inline status changes.
   * Returns an unsubscribe function.
   */
  subscribeToInlineStatus(t) {
    return this.inlineStatusListeners.add(t), () => {
      this.inlineStatusListeners.delete(t);
    };
  }
  /**
   * Get current inline status for a correlation ID
   */
  getInlineStatus(t) {
    return this.inlineStatus.get(t) || null;
  }
  /**
   * Get all current inline status entries
   */
  getAllInlineStatus() {
    return Array.from(this.inlineStatus.values());
  }
  /**
   * Clear inline status for a correlation ID
   */
  clearInlineStatus(t) {
    this.inlineStatus.delete(t);
  }
  /**
   * Clear all inline statuses
   */
  clearAllInlineStatus() {
    this.inlineStatus.clear();
  }
  /**
   * Mark stale statuses (e.g., after stream gap)
   */
  markStaleStatuses() {
    const t = Date.now();
    this.inlineStatus.forEach((e, a) => {
      e.state !== "completed" && e.state !== "failed" && this.setInlineStatus(a, {
        ...e,
        state: "stale",
        message: "Refreshing status...",
        timestamp: t
      });
    });
  }
  setInlineStatus(t, e) {
    const n = (this.inlineStatus.get(t) || null)?.state || null;
    this.inlineStatus.set(t, e), this.emitInlineStatusChange({ entry: e, previousState: n });
  }
  emitInlineStatusChange(t) {
    this.inlineStatusListeners.forEach((e) => {
      try {
        e(t);
      } catch (a) {
        console.warn("Inline status listener error:", a);
      }
    });
  }
  updateInlineStatusFromDispatch(t, e, a, n = {}) {
    this.setInlineStatus(t, {
      correlationId: t,
      commandName: e,
      state: a,
      message: n.message,
      section: n.section,
      participantId: n.participantId,
      timestamp: Date.now()
    });
  }
  resolveSection(t) {
    return t.closest("[data-live-status-section]")?.getAttribute("data-live-status-section") || void 0;
  }
  resolveParticipantId(t, e) {
    const a = String(e.participant_id || e.recipient_id || "").trim();
    return a || t.closest("[data-participant-id]")?.getAttribute("data-participant-id") || void 0;
  }
  scopePayload() {
    const t = {};
    return this.tenantId && (t.tenant_id = this.tenantId), this.orgId && (t.org_id = this.orgId), t;
  }
  buildSpec(t, e, a) {
    const n = u(t.dataset.commandName || e?.dataset.commandName), s = u(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", c = u(t.dataset.commandDispatch || e?.dataset.commandDispatch) || n, i = W(e), o = k(t), l = e ? k(e) : {}, p = {
      ...this.scopePayload(),
      ...i,
      ...l,
      ...o
    }, m = v(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? v(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: n,
      dispatchName: c,
      transport: s,
      payload: p,
      successMessage: u(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${n} completed successfully`,
      fallbackMessage: u(t.dataset.commandFailure || e?.dataset.commandFailure) || `${n} failed`,
      refreshSelectors: m,
      confirmMessage: u(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: u(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: u(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: u(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: T(t) || (e ? T(e) : null),
      submitter: a
    };
  }
  buildManualSpec(t) {
    const e = t.trigger || this.mount, a = {
      ...this.scopePayload(),
      ...t.payload || {}
    }, n = Array.isArray(t.refreshSelectors) && t.refreshSelectors.length > 0 ? t.refreshSelectors.filter(Boolean) : this.defaultRefreshSelectors;
    return {
      trigger: e,
      form: t.form || null,
      commandName: String(t.commandName || "").trim(),
      dispatchName: String(t.dispatchName || t.commandName || "").trim(),
      transport: t.transport || "action",
      payload: a,
      successMessage: String(t.successMessage || "").trim() || `${String(t.commandName || "").trim()} completed successfully`,
      fallbackMessage: String(t.fallbackMessage || "").trim() || `${String(t.commandName || "").trim()} failed`,
      refreshSelectors: n,
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
  async handleCommand(t, e, a) {
    const n = this.buildSpec(t, e, a);
    !n.commandName || !n.dispatchName || await this.executeSpec(n);
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
      const i = t.reasonSubject ? `${t.reasonTitle}

${t.reasonSubject}

Enter a reason:` : `${t.reasonTitle}

Enter a reason:`, o = globalThis.window?.prompt(i, "") ?? null;
      if (o === null)
        return e();
      const l = String(o || "").trim();
      if (!l)
        return this.notifier.error("A reason is required."), e();
      t.payload.reason = l;
    }
    const a = O(t.payload), n = this.resolveSection(t.trigger), s = this.resolveParticipantId(t.trigger, t.payload), c = {
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: a,
      success: !1
    };
    this.onBeforeDispatch?.(c), A(t.submitter, !0), C(t.busyTarget, !0), this.updateInlineStatusFromDispatch(a, t.commandName, "submitting", {
      message: "Sending...",
      section: n,
      participantId: s
    });
    try {
      const i = t.transport === "rpc" ? await this.dispatchRPC(t) : await this.dispatchAction(t), o = {
        ...c,
        success: i.success,
        data: i.data,
        error: i.error,
        correlationId: i.correlationId || a,
        receipt: i.receipt,
        responseMode: i.responseMode
      };
      if (!i.success || i.error) {
        const l = b(
          i.error || f(null, t.fallbackMessage),
          t.fallbackMessage
        );
        return this.notifier.error(l), this.updateInlineStatusFromDispatch(a, t.commandName, "failed", {
          message: l || "Failed",
          section: n,
          participantId: s
        }), this.onAfterDispatch?.(o), o;
      }
      return this.notifier.success(t.successMessage), this.shouldWaitForFeedback(o) ? (this.updateInlineStatusFromDispatch(a, t.commandName, "accepted", {
        message: "Queued...",
        section: n,
        participantId: s
      }), this.pendingFeedback.set(o.correlationId, {
        correlationId: o.correlationId,
        commandName: o.commandName,
        transport: o.transport,
        responseMode: o.responseMode,
        receipt: o.receipt,
        refreshSelectors: [...t.refreshSelectors],
        trigger: t.trigger,
        section: n,
        participantId: s
      })) : (this.updateInlineStatusFromDispatch(a, t.commandName, "completed", {
        message: t.successMessage || "Done",
        section: n,
        participantId: s
      }), t.refreshSelectors.length > 0 && await this.refreshSelectors(t.refreshSelectors, t.trigger)), this.onAfterDispatch?.(o), o;
    } catch (i) {
      const o = f(i, t.fallbackMessage), l = {
        ...c,
        success: !1,
        error: o
      };
      return this.notifier.error(b(o, t.fallbackMessage)), this.updateInlineStatusFromDispatch(a, t.commandName, "failed", {
        message: o.message || "Failed",
        section: n,
        participantId: s
      }), this.onAfterDispatch?.(l), l;
    } finally {
      A(t.submitter, !1), C(t.busyTarget, !1);
    }
  }
  shouldWaitForFeedback(t) {
    return this.feedback?.adapter ? g(t.responseMode || t.receipt?.mode) === "queued" : !1;
  }
  async handleFeedbackEvent(t) {
    const e = String(t.correlationId || "").trim(), a = e && this.pendingFeedback.get(e) || null;
    a && this.pendingFeedback.delete(e);
    const n = {
      controller: this,
      event: t,
      pending: a
    };
    if (t.type === "stream_gap") {
      this.markStaleStatuses(), await this.feedback?.onStreamGap?.(n);
      return;
    }
    if (e) {
      const s = String(t.status || "").toLowerCase(), i = (Array.isArray(t.sections) ? t.sections : [])[0] || a?.section, o = a?.participantId, l = a?.commandName || "";
      s === "completed" || s === "success" ? this.updateInlineStatusFromDispatch(e, l, "completed", {
        message: t.message || "Done",
        section: i,
        participantId: o
      }) : s === "failed" || s === "error" ? this.updateInlineStatusFromDispatch(e, l, "failed", {
        message: t.message || "Failed",
        section: i,
        participantId: o
      }) : s === "retry" || s === "retry_scheduled" || s === "retrying" ? this.updateInlineStatusFromDispatch(e, l, "retry_scheduled", {
        message: t.message || "Retry scheduled...",
        section: i,
        participantId: o
      }) : (s === "accepted" || s === "queued" || s === "processing") && this.updateInlineStatusFromDispatch(e, l, "accepted", {
        message: t.message || "Processing...",
        section: i,
        participantId: o
      });
    }
    await this.feedback?.onEvent?.(n);
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName)
      return {
        success: !1,
        error: f(null, "Action transport is not configured")
      };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, a = {
      id: this.recordId,
      ...t.payload
    }, n = await this.fetchImpl(e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(a)
    });
    if (!n.ok)
      return {
        success: !1,
        error: await S(n)
      };
    const s = await w(n);
    return {
      ...I(s, t.fallbackMessage),
      correlationId: String(t.payload.correlation_id || "").trim() || void 0
    };
  }
  async dispatchRPC(t) {
    const e = String(t.payload.correlation_id || "").trim() || void 0, a = {
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
    }, n = await this.fetchImpl(this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(a)
    });
    if (!n.ok)
      return {
        success: !1,
        error: await S(n),
        correlationId: e
      };
    const s = await w(n);
    if (s && typeof s == "object" && "error" in s)
      return {
        ...I(s, t.fallbackMessage),
        correlationId: e
      };
    if (s && typeof s == "object" && "data" in s && typeof s.data == "object") {
      const c = s.data, i = z(c.receipt);
      return {
        success: !0,
        data: c,
        correlationId: i?.correlationId || e,
        receipt: i,
        responseMode: g(c.response_mode || i?.mode)
      };
    }
    return {
      success: !0,
      data: s && typeof s == "object" ? s : void 0,
      correlationId: e
    };
  }
  async refreshSelectors(t, e = null) {
    const a = await this.refreshFragments(t);
    return a && this.onAfterRefresh?.({
      mount: this.mount,
      trigger: e || this.mount,
      selectors: t,
      sourceDocument: a
    }), a;
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
    const a = await e.text();
    if (!a.trim())
      return null;
    const n = new DOMParser().parseFromString(a, "text/html");
    return t.forEach((s) => {
      this.replaceFragment(s, n);
    }), n;
  }
  replaceFragment(t, e) {
    const a = document.querySelector(t), n = e.querySelector(t);
    if (!a && !n)
      return;
    if (a && !n) {
      a.remove();
      return;
    }
    if (!a || !n)
      return;
    const s = J(a), c = document.importNode(n, !0);
    a.replaceWith(c), c instanceof Element && K(c, s);
  }
}
function st(r) {
  if (!r.mount)
    return null;
  const t = new Q(r);
  return t.init(), t;
}
export {
  Q as C,
  Z as a,
  tt as b,
  nt as c,
  et as d,
  rt as e,
  B as f,
  Y as g,
  d as h,
  st as i,
  j as m,
  R as n,
  at as p
};
//# sourceMappingURL=command-runtime-BuYRTGy7.js.map

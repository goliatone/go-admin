import { createLogger as k } from "../shared/logger.js";
import { httpRequestWith as m, readHTTPJSONValue as w } from "../shared/transport/http-client.js";
import { extractStructuredError as f, formatStructuredErrorForDisplay as p, parseActionResponse as C } from "../toast/error-helpers.js";
import { t as N } from "../chunks/toast-manager-CbwnrqR9.js";
import { i as S, t as b } from "../chunks/busy-MPizSUwt.js";
var F = k("CommandRuntime");
function M() {
  const t = globalThis.window;
  return t?.toastManager ? t.toastManager : new N();
}
function d(t) {
  return String(t || "").trim();
}
function E(t) {
  return t.replace(/[A-Z]/g, (e) => `-${e.toLowerCase()}`).replace(/^-+/, "");
}
function v(t) {
  return E(t).replace(/-/g, "_");
}
function g(t) {
  return String(t || "").split(",").map((e) => e.trim()).filter(Boolean);
}
function h(t) {
  return String(t || "").trim().toLowerCase() || void 0;
}
function R() {
  const t = globalThis.crypto;
  return t?.randomUUID ? t.randomUUID() : `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function P(t) {
  const e = String(t.correlation_id || "").trim();
  if (e) return e;
  const a = R();
  return t.correlation_id = a, a;
}
function u(t, e) {
  if (t && typeof t == "object") {
    const a = t;
    if (typeof a.message == "string") return {
      textCode: typeof a.textCode == "string" ? a.textCode : null,
      message: a.message || e,
      metadata: a.metadata && typeof a.metadata == "object" ? a.metadata : null,
      fields: a.fields && typeof a.fields == "object" ? a.fields : null,
      validationErrors: Array.isArray(a.validationErrors) ? a.validationErrors : null
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
function y(t, e) {
  if (!t || typeof t != "object") return {
    success: !1,
    error: u(null, e)
  };
  const a = C(t);
  return a.success ? {
    success: !0,
    data: a.data
  } : {
    success: !1,
    error: a.error || u(null, e)
  };
}
async function I(t) {
  return w(t, null);
}
function T(t) {
  const e = {};
  for (const a of Array.from(t.attributes)) {
    if (!a.name.startsWith("data-command-payload-")) continue;
    const r = v(a.name.slice(21));
    e[r] = a.value;
  }
  return e;
}
function _(t, e, a) {
  if (e) {
    if (typeof a == "string") {
      const r = a.trim();
      if (!r) return;
      if (t[e] === void 0) {
        t[e] = r;
        return;
      }
      if (Array.isArray(t[e])) {
        t[e].push(r);
        return;
      }
      t[e] = [t[e], r];
      return;
    }
    t[e] = a;
  }
}
function j(t) {
  if (!t) return {};
  const e = {};
  return new FormData(t).forEach((a, r) => {
    _(e, r, a);
  }), e;
}
function A(t) {
  const e = d(t.dataset.commandBusyTarget);
  if (e) return document.querySelector(e);
  const a = d(t.dataset.commandBusyClosest);
  return a ? t.closest(a) : null;
}
function B(t) {
  const e = [];
  return t.submitter && e.push(S(t.submitter)), t.busyTarget && t.busyTarget !== t.submitter && e.push(S(t.busyTarget)), e;
}
function L(t) {
  for (const e of [...t].reverse()) e.reset();
}
function x(t) {
  const e = /* @__PURE__ */ new Map();
  return t.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((a) => {
    const r = d(a.getAttribute("aria-controls") || void 0);
    r && e.set(r, a.getAttribute("aria-expanded") === "true");
  }), e;
}
function $(t, e) {
  e.forEach((a, r) => {
    const s = t.querySelector(`.collapsible-trigger[aria-controls="${r}"]`), n = document.getElementById(r);
    !s || !n || (s.setAttribute("aria-expanded", a ? "true" : "false"), n.classList.toggle("expanded", a));
  });
}
function q(t) {
  if (!t || typeof t != "object") return;
  const e = t, a = e.accepted ?? e.Accepted, r = typeof a == "boolean" ? a : void 0, s = h(e.mode ?? e.Mode), n = String(e.command_id || e.commandId || e.CommandID || "").trim() || void 0, c = String(e.dispatch_id || e.dispatchId || e.DispatchID || "").trim() || void 0, i = String(e.correlation_id || e.correlationId || e.CorrelationID || "").trim() || void 0, o = e.enqueued_at || e.enqueuedAt || e.EnqueuedAt, l = o == null ? void 0 : String(o).trim() || void 0;
  if (!(r === void 0 && !s && !n && !c && !i && !l))
    return {
      accepted: r,
      mode: s,
      commandId: n,
      dispatchId: c,
      correlationId: i,
      enqueuedAt: l
    };
}
var H = class {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.feedbackUnsubscribe = null, this.pendingFeedback = /* @__PURE__ */ new Map(), this.inlineStatus = /* @__PURE__ */ new Map(), this.inlineStatusListeners = /* @__PURE__ */ new Set(), this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || M(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.feedback = t.feedback, this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]")) return;
      t.preventDefault();
      const a = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, a);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element)) return;
      const a = e.closest("[data-command-name]:not(form)");
      !a || !this.mount.contains(a) || (t.preventDefault(), this.handleCommand(a, null, a));
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
    const a = (this.inlineStatus.get(t) || null)?.state || null;
    this.inlineStatus.set(t, e), this.emitInlineStatusChange({
      entry: e,
      previousState: a
    });
  }
  emitInlineStatusChange(t) {
    this.inlineStatusListeners.forEach((e) => {
      try {
        e(t);
      } catch (a) {
        F.warn("Inline status listener error:", a);
      }
    });
  }
  updateInlineStatusFromDispatch(t, e, a, r = {}) {
    this.setInlineStatus(t, {
      correlationId: t,
      commandName: e,
      state: a,
      message: r.message,
      section: r.section,
      participantId: r.participantId,
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
    const r = d(t.dataset.commandName || e?.dataset.commandName), s = d(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", n = d(t.dataset.commandDispatch || e?.dataset.commandDispatch) || r, c = j(e), i = T(t), o = e ? T(e) : {}, l = {
      ...this.scopePayload(),
      ...c,
      ...o,
      ...i
    }, D = g(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? g(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: r,
      dispatchName: n,
      transport: s,
      payload: l,
      successMessage: d(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${r} completed successfully`,
      fallbackMessage: d(t.dataset.commandFailure || e?.dataset.commandFailure) || `${r} failed`,
      refreshSelectors: D,
      confirmMessage: d(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: d(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: d(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: d(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: A(t) || (e ? A(e) : null),
      submitter: a
    };
  }
  buildManualSpec(t) {
    const e = t.trigger || this.mount, a = {
      ...this.scopePayload(),
      ...t.payload || {}
    }, r = Array.isArray(t.refreshSelectors) && t.refreshSelectors.length > 0 ? t.refreshSelectors.filter(Boolean) : this.defaultRefreshSelectors;
    return {
      trigger: e,
      form: t.form || null,
      commandName: String(t.commandName || "").trim(),
      dispatchName: String(t.dispatchName || t.commandName || "").trim(),
      transport: t.transport || "action",
      payload: a,
      successMessage: String(t.successMessage || "").trim() || `${String(t.commandName || "").trim()} completed successfully`,
      fallbackMessage: String(t.fallbackMessage || "").trim() || `${String(t.commandName || "").trim()} failed`,
      refreshSelectors: r,
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
    const r = this.buildSpec(t, e, a);
    !r.commandName || !r.dispatchName || await this.executeSpec(r);
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
    if (t.submitter && b(t.submitter) || t.busyTarget && b(t.busyTarget) || t.confirmMessage && !await this.notifier.confirm(t.confirmMessage, { title: t.confirmTitle || void 0 }))
      return e();
    if (t.reasonTitle) {
      const i = t.reasonSubject ? `${t.reasonTitle}

${t.reasonSubject}

Enter a reason:` : `${t.reasonTitle}

Enter a reason:`, o = globalThis.window?.prompt(i, "") ?? null;
      if (o === null) return e();
      const l = String(o || "").trim();
      if (!l)
        return this.notifier.error("A reason is required."), e();
      t.payload.reason = l;
    }
    const a = P(t.payload), r = this.resolveSection(t.trigger), s = this.resolveParticipantId(t.trigger, t.payload), n = {
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: a,
      success: !1
    };
    this.onBeforeDispatch?.(n);
    const c = B(t);
    this.updateInlineStatusFromDispatch(a, t.commandName, "submitting", {
      message: "Sending...",
      section: r,
      participantId: s
    });
    try {
      const i = t.transport === "rpc" ? await this.dispatchRPC(t) : await this.dispatchAction(t), o = {
        ...n,
        success: i.success,
        data: i.data,
        error: i.error,
        correlationId: i.correlationId || a,
        receipt: i.receipt,
        responseMode: i.responseMode
      };
      if (!i.success || i.error) {
        const l = p(i.error || u(null, t.fallbackMessage), t.fallbackMessage);
        return this.notifier.error(l), this.updateInlineStatusFromDispatch(a, t.commandName, "failed", {
          message: l || "Failed",
          section: r,
          participantId: s
        }), this.onAfterDispatch?.(o), o;
      }
      return this.notifier.success(t.successMessage), this.shouldWaitForFeedback(o) ? (this.updateInlineStatusFromDispatch(a, t.commandName, "accepted", {
        message: "Queued...",
        section: r,
        participantId: s
      }), this.pendingFeedback.set(o.correlationId, {
        correlationId: o.correlationId,
        commandName: o.commandName,
        transport: o.transport,
        responseMode: o.responseMode,
        receipt: o.receipt,
        refreshSelectors: [...t.refreshSelectors],
        trigger: t.trigger,
        section: r,
        participantId: s
      })) : (this.updateInlineStatusFromDispatch(a, t.commandName, "completed", {
        message: t.successMessage || "Done",
        section: r,
        participantId: s
      }), t.refreshSelectors.length > 0 && await this.refreshSelectors(t.refreshSelectors, t.trigger)), this.onAfterDispatch?.(o), o;
    } catch (i) {
      const o = u(i, t.fallbackMessage), l = {
        ...n,
        success: !1,
        error: o
      };
      return this.notifier.error(p(o, t.fallbackMessage)), this.updateInlineStatusFromDispatch(a, t.commandName, "failed", {
        message: o.message || "Failed",
        section: r,
        participantId: s
      }), this.onAfterDispatch?.(l), l;
    } finally {
      L(c);
    }
  }
  shouldWaitForFeedback(t) {
    return this.feedback?.adapter ? h(t.responseMode || t.receipt?.mode) === "queued" : !1;
  }
  async handleFeedbackEvent(t) {
    const e = String(t.correlationId || "").trim(), a = e && this.pendingFeedback.get(e) || null;
    a && this.pendingFeedback.delete(e);
    const r = {
      controller: this,
      event: t,
      pending: a
    };
    if (t.type === "stream_gap") {
      this.markStaleStatuses(), await this.feedback?.onStreamGap?.(r);
      return;
    }
    if (e) {
      const s = String(t.status || "").toLowerCase(), n = (Array.isArray(t.sections) ? t.sections : [])[0] || a?.section, c = a?.participantId, i = a?.commandName || "";
      s === "completed" || s === "success" ? this.updateInlineStatusFromDispatch(e, i, "completed", {
        message: t.message || "Done",
        section: n,
        participantId: c
      }) : s === "failed" || s === "error" ? this.updateInlineStatusFromDispatch(e, i, "failed", {
        message: t.message || "Failed",
        section: n,
        participantId: c
      }) : s === "retry" || s === "retry_scheduled" || s === "retrying" ? this.updateInlineStatusFromDispatch(e, i, "retry_scheduled", {
        message: t.message || "Retry scheduled...",
        section: n,
        participantId: c
      }) : (s === "accepted" || s === "queued" || s === "processing") && this.updateInlineStatusFromDispatch(e, i, "accepted", {
        message: t.message || "Processing...",
        section: n,
        participantId: c
      });
    }
    await this.feedback?.onEvent?.(r);
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName) return {
      success: !1,
      error: u(null, "Action transport is not configured")
    };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, a = {
      id: this.recordId,
      ...t.payload
    }, r = await m(this.fetchImpl, e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(a)
    });
    return r.ok ? {
      ...y(await I(r), t.fallbackMessage),
      correlationId: String(t.payload.correlation_id || "").trim() || void 0
    } : {
      success: !1,
      error: await f(r)
    };
  }
  async dispatchRPC(t) {
    const e = String(t.payload.correlation_id || "").trim() || void 0, a = {
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
    }, r = await m(this.fetchImpl, this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(a)
    });
    if (!r.ok) return {
      success: !1,
      error: await f(r),
      correlationId: e
    };
    const s = await I(r);
    if (s && typeof s == "object" && "error" in s) return {
      ...y(s, t.fallbackMessage),
      correlationId: e
    };
    if (s && typeof s == "object" && "data" in s && typeof s.data == "object") {
      const n = s.data, c = q(n.receipt);
      return {
        success: !0,
        data: n,
        correlationId: c?.correlationId || e,
        receipt: c,
        responseMode: h(n.response_mode || c?.mode)
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
    const e = await m(this.fetchImpl, globalThis.window?.location?.href || "", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "text/html",
        "X-Requested-With": "go-admin-command-runtime"
      }
    });
    if (!e.ok) return null;
    const a = await e.text();
    if (!a.trim()) return null;
    const r = new DOMParser().parseFromString(a, "text/html");
    return t.forEach((s) => {
      this.replaceFragment(s, r);
    }), r;
  }
  replaceFragment(t, e) {
    const a = document.querySelector(t), r = e.querySelector(t);
    if (!a && !r) return;
    if (a && !r) {
      a.remove();
      return;
    }
    if (!a || !r) return;
    const s = x(a), n = document.importNode(r, !0);
    a.replaceWith(n), n instanceof Element && $(n, s);
  }
};
function z(t) {
  if (!t.mount) return null;
  const e = new H(t);
  return e.init(), e;
}
export {
  H as CommandRuntimeController,
  z as initCommandRuntime
};

//# sourceMappingURL=command-runtime.js.map
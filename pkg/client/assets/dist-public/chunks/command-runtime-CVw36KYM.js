import { httpRequestWith as g, readHTTPJSONValue as F } from "../shared/transport/http-client.js";
import { extractStructuredError as A, formatStructuredErrorForDisplay as T, parseActionResponse as k } from "../toast/error-helpers.js";
import { t as B } from "./toast-manager-DYX_EcbR.js";
var d = "true", p = /* @__PURE__ */ new WeakMap();
function L(t) {
  return t ? p.has(t) || t.dataset.busy === "true" || t.dataset.submitLoadingActive === "true" || t.getAttribute("aria-busy") === "true" : !1;
}
function M(t, e = {}) {
  const n = p.get(t);
  if (n) return E(n);
  const a = {
    root: t,
    ariaBusy: t.getAttribute("aria-busy"),
    dataBusy: t.dataset.busy,
    dataLoading: t.dataset.loading,
    dataSubmitLoadingActive: t.dataset.submitLoadingActive,
    controls: [],
    labels: [],
    inputValues: [],
    spinners: [],
    generatedInputs: [],
    generatedSpinners: [],
    overrides: null
  };
  t.setAttribute("aria-busy", d), t.dataset.busy = d, (e.compatibilitySubmitLoading || t.hasAttribute("data-submit-loading-form")) && (t.dataset.loading = d, t.dataset.submitLoadingActive = d), b(t) && G(t, R(e.submitter), a);
  const i = j(t, e);
  for (const r of i)
    V(r, a), q(r, e, a);
  return p.set(t, a), E(a);
}
function x(t) {
  if (!t) return;
  const e = p.get(t);
  if (!e) {
    t.dataset.busy === "true" && (delete t.dataset.busy, t.removeAttribute("aria-busy")), (t.dataset.submitLoadingActive === "true" || t.dataset.loading === "true") && (delete t.dataset.loading, delete t.dataset.submitLoadingActive);
    return;
  }
  m(t, "aria-busy", e.ariaBusy), S(t, "busy", e.dataBusy), S(t, "loading", e.dataLoading), S(t, "submitLoadingActive", e.dataSubmitLoadingActive);
  for (const n of e.controls)
    n.control.disabled = n.disabled, m(n.control, "aria-label", n.ariaLabel);
  for (const n of e.labels) n.innerHTML !== void 0 ? n.element.innerHTML = n.innerHTML : n.element.textContent = n.textContent;
  for (const n of e.inputValues) n.input.value = n.value;
  for (const n of e.spinners) n.element.hidden = n.hidden;
  for (const n of e.generatedInputs) n.remove();
  for (const n of e.generatedSpinners) n.remove();
  e.overrides && b(t) && J(t, e.overrides), p.delete(t);
}
function E(t) {
  return {
    root: t.root,
    reset() {
      x(t.root);
    }
  };
}
function b(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLFormElement && t instanceof e.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement);
}
function h(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLButtonElement && t instanceof e.HTMLButtonElement || e?.HTMLInputElement && t instanceof e.HTMLInputElement || e?.HTMLTextAreaElement && t instanceof e.HTMLTextAreaElement || e?.HTMLSelectElement && t instanceof e.HTMLSelectElement || typeof HTMLButtonElement < "u" && t instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && t instanceof HTMLInputElement || typeof HTMLTextAreaElement < "u" && t instanceof HTMLTextAreaElement || typeof HTMLSelectElement < "u" && t instanceof HTMLSelectElement);
}
function R(t) {
  if (!t) return null;
  const e = t.ownerDocument?.defaultView;
  return e?.HTMLButtonElement && t instanceof e.HTMLButtonElement || e?.HTMLInputElement && t instanceof e.HTMLInputElement || typeof HTMLButtonElement < "u" && t instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && t instanceof HTMLInputElement ? t : null;
}
function P(t) {
  const e = t.tagName.toLowerCase();
  if (e === "button") return !0;
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function _(t) {
  if (!t) return !1;
  const e = t.tagName.toLowerCase();
  if (e === "button") return (t.getAttribute("type") || "submit").trim().toLowerCase() === "submit";
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "image";
}
function j(t, e) {
  const n = [];
  for (const a of e.controls ?? []) h(a) && !n.includes(a) && n.push(a);
  if (h(e.submitter) && !n.includes(e.submitter) && n.push(e.submitter), h(t) && !n.includes(t) && n.push(t), e.includeDescendantControls !== !1) {
    const a = b(t) ? 'button, input[type="submit"], input[type="button"], input[type="image"]' : 'button, input[type="submit"], input[type="button"], input[type="image"], select, textarea';
    t.querySelectorAll(a).forEach((i) => {
      (b(t) ? P(i) : h(i)) && !n.includes(i) && n.push(i);
    });
  }
  return n;
}
function V(t, e) {
  e.controls.push({
    control: t,
    disabled: t.disabled,
    ariaLabel: t.getAttribute("aria-label")
  });
}
function q(t, e, n) {
  const a = $(t, e);
  if (a) {
    t.setAttribute("aria-label", a);
    const r = U(t);
    r ? (n.labels.push({
      element: r,
      textContent: r.textContent
    }), r.textContent = a) : t instanceof HTMLButtonElement ? (n.labels.push({
      element: t,
      textContent: t.textContent,
      innerHTML: t.innerHTML
    }), t.textContent = a) : t instanceof HTMLInputElement && (n.inputValues.push({
      input: t,
      value: t.value
    }), t.value = a);
  }
  const i = O(t) || W(t, e, n);
  i && (n.spinners.push({
    element: i,
    hidden: i.hidden
  }), i.hidden = !1), t.disabled = !0;
}
function $(t, e) {
  return String(e.label || t.getAttribute("data-busy-label") || t.getAttribute("data-submit-loading-busy-label") || "").trim();
}
function U(t) {
  return t instanceof HTMLInputElement && t.tagName.toLowerCase() === "input" ? null : t.querySelector("[data-busy-label-target], [data-submit-loading-label]");
}
function O(t) {
  return t instanceof HTMLInputElement && t.tagName.toLowerCase() === "input" ? null : t.querySelector("[data-busy-spinner], .submit-loading-spinner");
}
function W(t, e, n) {
  if (!e.generateSpinner && !t.hasAttribute("data-busy-button") || t instanceof HTMLInputElement && t.tagName.toLowerCase() === "input") return null;
  const a = t.ownerDocument.createElement("span");
  return a.setAttribute("data-busy-spinner", ""), a.setAttribute("data-busy-generated-spinner", "true"), a.setAttribute("aria-hidden", "true"), a.className = "busy-spinner", t.insertBefore(a, t.firstChild), n.generatedSpinners.push(a), a;
}
function y(t, e, n, a, i = null) {
  const r = e.ownerDocument.createElement("input");
  return r.type = "hidden", r.name = n, r.value = a, r.dataset.busyGenerated = d, r.dataset.submitLoadingGenerated = d, i && i.parentNode === e ? i.after(r) : e.appendChild(r), t.generatedInputs.push(r), r;
}
function G(t, e, n) {
  if (!e || !_(e) || e.disabled) return;
  const a = {
    action: t.getAttribute("action"),
    method: t.getAttribute("method"),
    enctype: t.getAttribute("enctype"),
    target: t.getAttribute("target"),
    noValidate: t.noValidate
  };
  let i = !1;
  for (const [u, s] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) e.hasAttribute(u) && (t.setAttribute(s, e.getAttribute(u) ?? ""), i = !0);
  (e.hasAttribute("formnovalidate") || e.formNoValidate) && (t.noValidate = !0, i = !0), i && (n.overrides = a);
  const r = e.getAttribute("name")?.trim();
  if (r) {
    if ((e.tagName.toLowerCase() === "input" ? (e.getAttribute("type") || "text").trim().toLowerCase() : "submit") === "image") {
      const u = y(n, t, `${r}.x`, "0", e);
      y(n, t, `${r}.y`, "0", u);
      return;
    }
    y(n, t, r, e.getAttribute("value") ?? "", e);
  }
}
function J(t, e) {
  m(t, "action", e.action), m(t, "method", e.method), m(t, "enctype", e.enctype), m(t, "target", e.target), t.noValidate = e.noValidate;
}
function m(t, e, n) {
  n === null ? t.removeAttribute(e) : t.setAttribute(e, n);
}
function S(t, e, n) {
  n === void 0 ? delete t.dataset[e] : t.dataset[e] = n;
}
function z() {
  const t = globalThis.window;
  return t?.toastManager ? t.toastManager : new B();
}
function l(t) {
  return String(t || "").trim();
}
function K(t) {
  return t.replace(/[A-Z]/g, (e) => `-${e.toLowerCase()}`).replace(/^-+/, "");
}
function Q(t) {
  return K(t).replace(/-/g, "_");
}
function C(t) {
  return String(t || "").split(",").map((e) => e.trim()).filter(Boolean);
}
function I(t) {
  return String(t || "").trim().toLowerCase() || void 0;
}
function X() {
  const t = globalThis.crypto;
  return t?.randomUUID ? t.randomUUID() : `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function Y(t) {
  const e = String(t.correlation_id || "").trim();
  if (e) return e;
  const n = X();
  return t.correlation_id = n, n;
}
function f(t, e) {
  if (t && typeof t == "object") {
    const n = t;
    if (typeof n.message == "string") return {
      textCode: typeof n.textCode == "string" ? n.textCode : null,
      message: n.message || e,
      metadata: n.metadata && typeof n.metadata == "object" ? n.metadata : null,
      fields: n.fields && typeof n.fields == "object" ? n.fields : null,
      validationErrors: Array.isArray(n.validationErrors) ? n.validationErrors : null
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
function w(t, e) {
  if (!t || typeof t != "object") return {
    success: !1,
    error: f(null, e)
  };
  const n = k(t);
  return n.success ? {
    success: !0,
    data: n.data
  } : {
    success: !1,
    error: n.error || f(null, e)
  };
}
async function H(t) {
  return F(t, null);
}
function N(t) {
  const e = {};
  for (const n of Array.from(t.attributes)) {
    if (!n.name.startsWith("data-command-payload-")) continue;
    const a = Q(n.name.slice(21));
    e[a] = n.value;
  }
  return e;
}
function Z(t, e, n) {
  if (e) {
    if (typeof n == "string") {
      const a = n.trim();
      if (!a) return;
      if (t[e] === void 0) {
        t[e] = a;
        return;
      }
      if (Array.isArray(t[e])) {
        t[e].push(a);
        return;
      }
      t[e] = [t[e], a];
      return;
    }
    t[e] = n;
  }
}
function tt(t) {
  if (!t) return {};
  const e = {};
  return new FormData(t).forEach((n, a) => {
    Z(e, a, n);
  }), e;
}
function D(t) {
  const e = l(t.dataset.commandBusyTarget);
  if (e) return document.querySelector(e);
  const n = l(t.dataset.commandBusyClosest);
  return n ? t.closest(n) : null;
}
function et(t) {
  const e = [];
  return t.submitter && e.push(M(t.submitter)), t.busyTarget && t.busyTarget !== t.submitter && e.push(M(t.busyTarget)), e;
}
function nt(t) {
  for (const e of [...t].reverse()) e.reset();
}
function at(t) {
  const e = /* @__PURE__ */ new Map();
  return t.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((n) => {
    const a = l(n.getAttribute("aria-controls") || void 0);
    a && e.set(a, n.getAttribute("aria-expanded") === "true");
  }), e;
}
function it(t, e) {
  e.forEach((n, a) => {
    const i = t.querySelector(`.collapsible-trigger[aria-controls="${a}"]`), r = document.getElementById(a);
    !i || !r || (i.setAttribute("aria-expanded", n ? "true" : "false"), r.classList.toggle("expanded", n));
  });
}
function rt(t) {
  if (!t || typeof t != "object") return;
  const e = t, n = e.accepted ?? e.Accepted, a = typeof n == "boolean" ? n : void 0, i = I(e.mode ?? e.Mode), r = String(e.command_id || e.commandId || e.CommandID || "").trim() || void 0, u = String(e.dispatch_id || e.dispatchId || e.DispatchID || "").trim() || void 0, s = String(e.correlation_id || e.correlationId || e.CorrelationID || "").trim() || void 0, o = e.enqueued_at || e.enqueuedAt || e.EnqueuedAt, c = o == null ? void 0 : String(o).trim() || void 0;
  if (!(a === void 0 && !i && !r && !u && !s && !c))
    return {
      accepted: a,
      mode: i,
      commandId: r,
      dispatchId: u,
      correlationId: s,
      enqueuedAt: c
    };
}
var st = class {
  constructor(t) {
    this.submitHandler = null, this.clickHandler = null, this.feedbackUnsubscribe = null, this.pendingFeedback = /* @__PURE__ */ new Map(), this.inlineStatus = /* @__PURE__ */ new Map(), this.inlineStatusListeners = /* @__PURE__ */ new Set(), this.mount = t.mount, this.apiBasePath = String(t.apiBasePath || "").trim().replace(/\/$/, ""), this.panelName = String(t.panelName || "").trim(), this.recordId = String(t.recordId || "").trim(), this.rpcEndpoint = String(t.rpcEndpoint || "").trim() || `${this.apiBasePath}/rpc`, this.tenantId = String(t.tenantId || "").trim(), this.orgId = String(t.orgId || "").trim(), this.notifier = t.notifier || z(), this.fetchImpl = t.fetchImpl || fetch.bind(globalThis), this.defaultRefreshSelectors = Array.isArray(t.defaultRefreshSelectors) ? t.defaultRefreshSelectors.filter(Boolean) : [], this.feedback = t.feedback, this.onBeforeDispatch = t.onBeforeDispatch, this.onAfterDispatch = t.onAfterDispatch, this.onAfterRefresh = t.onAfterRefresh;
  }
  init() {
    this.mount && (this.submitHandler = (t) => {
      const e = t.target;
      if (!(e instanceof HTMLFormElement) || !this.mount.contains(e) || !e.matches("form[data-command-name]")) return;
      t.preventDefault();
      const n = t instanceof SubmitEvent && t.submitter instanceof HTMLElement ? t.submitter : null;
      this.handleCommand(e, e, n);
    }, this.clickHandler = (t) => {
      const e = t.target;
      if (!(e instanceof Element)) return;
      const n = e.closest("[data-command-name]:not(form)");
      !n || !this.mount.contains(n) || (t.preventDefault(), this.handleCommand(n, null, n));
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
    this.inlineStatus.forEach((e, n) => {
      e.state !== "completed" && e.state !== "failed" && this.setInlineStatus(n, {
        ...e,
        state: "stale",
        message: "Refreshing status...",
        timestamp: t
      });
    });
  }
  setInlineStatus(t, e) {
    const n = (this.inlineStatus.get(t) || null)?.state || null;
    this.inlineStatus.set(t, e), this.emitInlineStatusChange({
      entry: e,
      previousState: n
    });
  }
  emitInlineStatusChange(t) {
    this.inlineStatusListeners.forEach((e) => {
      try {
        e(t);
      } catch (n) {
        console.warn("Inline status listener error:", n);
      }
    });
  }
  updateInlineStatusFromDispatch(t, e, n, a = {}) {
    this.setInlineStatus(t, {
      correlationId: t,
      commandName: e,
      state: n,
      message: a.message,
      section: a.section,
      participantId: a.participantId,
      timestamp: Date.now()
    });
  }
  resolveSection(t) {
    return t.closest("[data-live-status-section]")?.getAttribute("data-live-status-section") || void 0;
  }
  resolveParticipantId(t, e) {
    const n = String(e.participant_id || e.recipient_id || "").trim();
    return n || t.closest("[data-participant-id]")?.getAttribute("data-participant-id") || void 0;
  }
  scopePayload() {
    const t = {};
    return this.tenantId && (t.tenant_id = this.tenantId), this.orgId && (t.org_id = this.orgId), t;
  }
  buildSpec(t, e, n) {
    const a = l(t.dataset.commandName || e?.dataset.commandName), i = l(t.dataset.commandTransport || e?.dataset.commandTransport) || "action", r = l(t.dataset.commandDispatch || e?.dataset.commandDispatch) || a, u = tt(e), s = N(t), o = e ? N(e) : {}, c = {
      ...this.scopePayload(),
      ...u,
      ...o,
      ...s
    }, v = C(t.dataset.commandRefresh || e?.dataset.commandRefresh || "").length > 0 ? C(t.dataset.commandRefresh || e?.dataset.commandRefresh || "") : this.defaultRefreshSelectors;
    return {
      trigger: t,
      form: e,
      commandName: a,
      dispatchName: r,
      transport: i,
      payload: c,
      successMessage: l(t.dataset.commandSuccess || e?.dataset.commandSuccess) || `${a} completed successfully`,
      fallbackMessage: l(t.dataset.commandFailure || e?.dataset.commandFailure) || `${a} failed`,
      refreshSelectors: v,
      confirmMessage: l(t.dataset.commandConfirm || e?.dataset.commandConfirm),
      confirmTitle: l(t.dataset.commandConfirmTitle || e?.dataset.commandConfirmTitle),
      reasonTitle: l(t.dataset.commandReasonTitle || e?.dataset.commandReasonTitle),
      reasonSubject: l(t.dataset.commandReasonSubject || e?.dataset.commandReasonSubject),
      busyTarget: D(t) || (e ? D(e) : null),
      submitter: n
    };
  }
  buildManualSpec(t) {
    const e = t.trigger || this.mount, n = {
      ...this.scopePayload(),
      ...t.payload || {}
    }, a = Array.isArray(t.refreshSelectors) && t.refreshSelectors.length > 0 ? t.refreshSelectors.filter(Boolean) : this.defaultRefreshSelectors;
    return {
      trigger: e,
      form: t.form || null,
      commandName: String(t.commandName || "").trim(),
      dispatchName: String(t.dispatchName || t.commandName || "").trim(),
      transport: t.transport || "action",
      payload: n,
      successMessage: String(t.successMessage || "").trim() || `${String(t.commandName || "").trim()} completed successfully`,
      fallbackMessage: String(t.fallbackMessage || "").trim() || `${String(t.commandName || "").trim()} failed`,
      refreshSelectors: a,
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
    const a = this.buildSpec(t, e, n);
    !a.commandName || !a.dispatchName || await this.executeSpec(a);
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
    if (t.submitter && L(t.submitter) || t.busyTarget && L(t.busyTarget) || t.confirmMessage && !await this.notifier.confirm(t.confirmMessage, { title: t.confirmTitle || void 0 }))
      return e();
    if (t.reasonTitle) {
      const s = t.reasonSubject ? `${t.reasonTitle}

${t.reasonSubject}

Enter a reason:` : `${t.reasonTitle}

Enter a reason:`, o = globalThis.window?.prompt(s, "") ?? null;
      if (o === null) return e();
      const c = String(o || "").trim();
      if (!c)
        return this.notifier.error("A reason is required."), e();
      t.payload.reason = c;
    }
    const n = Y(t.payload), a = this.resolveSection(t.trigger), i = this.resolveParticipantId(t.trigger, t.payload), r = {
      trigger: t.trigger,
      form: t.form,
      commandName: t.commandName,
      transport: t.transport,
      payload: { ...t.payload },
      correlationId: n,
      success: !1
    };
    this.onBeforeDispatch?.(r);
    const u = et(t);
    this.updateInlineStatusFromDispatch(n, t.commandName, "submitting", {
      message: "Sending...",
      section: a,
      participantId: i
    });
    try {
      const s = t.transport === "rpc" ? await this.dispatchRPC(t) : await this.dispatchAction(t), o = {
        ...r,
        success: s.success,
        data: s.data,
        error: s.error,
        correlationId: s.correlationId || n,
        receipt: s.receipt,
        responseMode: s.responseMode
      };
      if (!s.success || s.error) {
        const c = T(s.error || f(null, t.fallbackMessage), t.fallbackMessage);
        return this.notifier.error(c), this.updateInlineStatusFromDispatch(n, t.commandName, "failed", {
          message: c || "Failed",
          section: a,
          participantId: i
        }), this.onAfterDispatch?.(o), o;
      }
      return this.notifier.success(t.successMessage), this.shouldWaitForFeedback(o) ? (this.updateInlineStatusFromDispatch(n, t.commandName, "accepted", {
        message: "Queued...",
        section: a,
        participantId: i
      }), this.pendingFeedback.set(o.correlationId, {
        correlationId: o.correlationId,
        commandName: o.commandName,
        transport: o.transport,
        responseMode: o.responseMode,
        receipt: o.receipt,
        refreshSelectors: [...t.refreshSelectors],
        trigger: t.trigger,
        section: a,
        participantId: i
      })) : (this.updateInlineStatusFromDispatch(n, t.commandName, "completed", {
        message: t.successMessage || "Done",
        section: a,
        participantId: i
      }), t.refreshSelectors.length > 0 && await this.refreshSelectors(t.refreshSelectors, t.trigger)), this.onAfterDispatch?.(o), o;
    } catch (s) {
      const o = f(s, t.fallbackMessage), c = {
        ...r,
        success: !1,
        error: o
      };
      return this.notifier.error(T(o, t.fallbackMessage)), this.updateInlineStatusFromDispatch(n, t.commandName, "failed", {
        message: o.message || "Failed",
        section: a,
        participantId: i
      }), this.onAfterDispatch?.(c), c;
    } finally {
      nt(u);
    }
  }
  shouldWaitForFeedback(t) {
    return this.feedback?.adapter ? I(t.responseMode || t.receipt?.mode) === "queued" : !1;
  }
  async handleFeedbackEvent(t) {
    const e = String(t.correlationId || "").trim(), n = e && this.pendingFeedback.get(e) || null;
    n && this.pendingFeedback.delete(e);
    const a = {
      controller: this,
      event: t,
      pending: n
    };
    if (t.type === "stream_gap") {
      this.markStaleStatuses(), await this.feedback?.onStreamGap?.(a);
      return;
    }
    if (e) {
      const i = String(t.status || "").toLowerCase(), r = (Array.isArray(t.sections) ? t.sections : [])[0] || n?.section, u = n?.participantId, s = n?.commandName || "";
      i === "completed" || i === "success" ? this.updateInlineStatusFromDispatch(e, s, "completed", {
        message: t.message || "Done",
        section: r,
        participantId: u
      }) : i === "failed" || i === "error" ? this.updateInlineStatusFromDispatch(e, s, "failed", {
        message: t.message || "Failed",
        section: r,
        participantId: u
      }) : i === "retry" || i === "retry_scheduled" || i === "retrying" ? this.updateInlineStatusFromDispatch(e, s, "retry_scheduled", {
        message: t.message || "Retry scheduled...",
        section: r,
        participantId: u
      }) : (i === "accepted" || i === "queued" || i === "processing") && this.updateInlineStatusFromDispatch(e, s, "accepted", {
        message: t.message || "Processing...",
        section: r,
        participantId: u
      });
    }
    await this.feedback?.onEvent?.(a);
  }
  async dispatchAction(t) {
    if (!this.apiBasePath || !this.panelName) return {
      success: !1,
      error: f(null, "Action transport is not configured")
    };
    const e = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(t.commandName)}`, n = {
      id: this.recordId,
      ...t.payload
    }, a = await g(this.fetchImpl, e, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(n)
    });
    return a.ok ? {
      ...w(await H(a), t.fallbackMessage),
      correlationId: String(t.payload.correlation_id || "").trim() || void 0
    } : {
      success: !1,
      error: await A(a)
    };
  }
  async dispatchRPC(t) {
    const e = String(t.payload.correlation_id || "").trim() || void 0, n = {
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
    }, a = await g(this.fetchImpl, this.rpcEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(n)
    });
    if (!a.ok) return {
      success: !1,
      error: await A(a),
      correlationId: e
    };
    const i = await H(a);
    if (i && typeof i == "object" && "error" in i) return {
      ...w(i, t.fallbackMessage),
      correlationId: e
    };
    if (i && typeof i == "object" && "data" in i && typeof i.data == "object") {
      const r = i.data, u = rt(r.receipt);
      return {
        success: !0,
        data: r,
        correlationId: u?.correlationId || e,
        receipt: u,
        responseMode: I(r.response_mode || u?.mode)
      };
    }
    return {
      success: !0,
      data: i && typeof i == "object" ? i : void 0,
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
    const e = await g(this.fetchImpl, globalThis.window?.location?.href || "", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "text/html",
        "X-Requested-With": "go-admin-command-runtime"
      }
    });
    if (!e.ok) return null;
    const n = await e.text();
    if (!n.trim()) return null;
    const a = new DOMParser().parseFromString(n, "text/html");
    return t.forEach((i) => {
      this.replaceFragment(i, a);
    }), a;
  }
  replaceFragment(t, e) {
    const n = document.querySelector(t), a = e.querySelector(t);
    if (!n && !a) return;
    if (n && !a) {
      n.remove();
      return;
    }
    if (!n || !a) return;
    const i = at(n), r = document.importNode(a, !0);
    n.replaceWith(r), r instanceof Element && it(r, i);
  }
};
function lt(t) {
  if (!t.mount) return null;
  const e = new st(t);
  return e.init(), e;
}
export {
  lt as n,
  M as r,
  st as t
};

//# sourceMappingURL=command-runtime-CVw36KYM.js.map
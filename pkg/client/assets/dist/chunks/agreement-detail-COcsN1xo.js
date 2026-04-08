import { escapeHTML as f } from "../shared/html.js";
import { executeActionRequest as ie, formatStructuredErrorForDisplay as ne } from "../toast/error-helpers.js";
import { readJSONScriptValue as O, readJSONSelectorValue as j } from "../shared/json-parse.js";
import { c as ae, s as se } from "./ui-states-CskzQjWR.js";
import { T as oe } from "./services-CXXRRtu9.js";
import { a as ce } from "./dom-helpers-PJrpTqcW.js";
import { formatRelativeTime as T, formatTimestamp as C } from "../esign/timeline-formatters.js";
var le = 3e3, I = 45e3, de = 5, ue = 3e4, me = 0.2, ge = class {
  constructor(e) {
    if (this.options = e, this.running = !1, this.connectLoop = null, this.controller = null, this.heartbeatDegradeTimer = null, this.heartbeatFailoverTimer = null, this.reconnectTimer = null, this.reconnectWaiterResolve = null, this.reconnectAttempt = 0, this.serverRetryMs = null, this.recoveryPending = !1, !e.url || e.url.trim() === "") throw new Error("go-router SSE client requires a url");
    this.diagnosticsState = {
      connectionState: "disconnected",
      lastEventId: null,
      lastHeartbeatAt: null,
      lastEventAt: null,
      reconnectAttempts: 0,
      totalEventsReceived: 0,
      gapEventsReceived: 0,
      failoverTriggered: !1,
      failoverReason: null,
      streamUrl: e.url
    };
  }
  start() {
    this.diagnosticsState.failoverTriggered || this.running || (this.running = !0, this.ensureConnectLoop());
  }
  stop() {
    this.running = !1, this.recoveryPending = !1, this.clearReconnectTimer(), this.clearHeartbeatTimers(), this.controller?.abort(), this.controller = null, this.diagnosticsState.failoverTriggered || this.setConnectionState("disconnected");
  }
  isConnected() {
    return this.diagnosticsState.connectionState === "connected";
  }
  getDiagnostics() {
    return { ...this.diagnosticsState };
  }
  triggerFailover(e) {
    this.enterFailover(e);
  }
  attemptRecovery() {
    this.diagnosticsState.failoverTriggered && (this.diagnosticsState.failoverTriggered = !1, this.diagnosticsState.failoverReason = null, this.recoveryPending = !0, this.reconnectAttempt = 0, this.diagnosticsState.reconnectAttempts = 0, this.running = !0, !this.connectLoop && this.ensureConnectLoop());
  }
  ensureConnectLoop() {
    !this.running || this.connectLoop || this.diagnosticsState.failoverTriggered || (this.connectLoop = this.run(), this.connectLoop.finally(() => {
      if (this.connectLoop = null, this.running && !this.diagnosticsState.failoverTriggered) {
        this.ensureConnectLoop();
        return;
      }
      !this.running && !this.diagnosticsState.failoverTriggered && this.setConnectionState("disconnected");
    }));
  }
  async run() {
    for (; this.running; ) {
      const e = this.reconnectAttempt > 0;
      this.setConnectionState(e ? "reconnecting" : "connecting");
      try {
        const t = this.buildRequestURL(e);
        this.diagnosticsState.streamUrl = t;
        const r = await this.resolveHeaders();
        if (!this.running) return;
        this.controller = new AbortController();
        const i = await fetch(t, {
          method: "GET",
          headers: r,
          signal: this.controller.signal
        });
        if (i.status === 401 || i.status === 403) {
          this.enterFailover("auth_failed");
          return;
        }
        if (!i.ok) throw new Error(`SSE request failed with status ${i.status}`);
        if (!i.body) throw new Error("SSE response body is not readable");
        if (this.reconnectAttempt = 0, this.diagnosticsState.reconnectAttempts = 0, this.setConnectionState("connected"), this.armHeartbeatTimers(), this.recoveryPending && (this.recoveryPending = !1, this.options.onRecovery?.(this.getDiagnostics())), await this.consume(i.body), !this.running || this.diagnosticsState.failoverTriggered) return;
        await this.scheduleReconnect();
      } catch (t) {
        if (!this.running || this.diagnosticsState.failoverTriggered || ye(t) && !this.running) return;
        await this.scheduleReconnect();
      } finally {
        this.controller = null, this.clearHeartbeatTimers();
      }
    }
  }
  async consume(e) {
    const t = e.getReader(), r = new TextDecoder();
    let i = "";
    try {
      for (; this.running; ) {
        const { done: n, value: a } = await t.read();
        if (n) return;
        i += r.decode(a, { stream: !0 });
        const o = fe(i);
        i = o.remainder;
        for (const l of o.frames) {
          const c = he(l);
          if (c && (this.dispatch(c), !this.running || this.diagnosticsState.failoverTriggered))
            return;
        }
      }
    } finally {
      t.releaseLock();
    }
  }
  dispatch(e) {
    if (e.retry !== null && e.retry > 0 && (this.serverRetryMs = e.retry), e.data === "" && e.id === null && e.event === "message") return;
    const t = ve(e.data);
    switch (e.event) {
      case "heartbeat":
        this.handleHeartbeat(t);
        return;
      case "stream_gap":
        this.handleStreamGap(t);
        return;
      default:
        this.handleDomainEvent({
          id: e.id,
          name: e.event || "message",
          payload: t
        });
    }
  }
  handleDomainEvent(e) {
    e.id && (this.diagnosticsState.lastEventId = e.id), this.diagnosticsState.totalEventsReceived += 1, this.diagnosticsState.lastEventAt = (/* @__PURE__ */ new Date()).toISOString(), this.options.onEvent?.(e);
  }
  handleHeartbeat(e) {
    this.diagnosticsState.lastHeartbeatAt = e.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(), this.diagnosticsState.connectionState === "degraded" && this.setConnectionState("connected"), this.armHeartbeatTimers(), this.options.onHeartbeat?.(e);
  }
  handleStreamGap(e) {
    this.diagnosticsState.gapEventsReceived += 1, this.options.onStreamGap?.(e), this.options.onRequestSnapshot?.(), this.enterFailover("stream_gap");
  }
  armHeartbeatTimers() {
    const e = this.resolveHeartbeatTimeoutMs();
    e <= 0 || (this.clearHeartbeatTimers(), this.heartbeatDegradeTimer = setTimeout(() => {
      !this.running || this.diagnosticsState.failoverTriggered || (this.setConnectionState("degraded"), this.heartbeatFailoverTimer = setTimeout(() => {
        !this.running || this.diagnosticsState.failoverTriggered || this.diagnosticsState.connectionState === "degraded" && this.enterFailover("heartbeat_timeout");
      }, e));
    }, e));
  }
  clearHeartbeatTimers() {
    this.heartbeatDegradeTimer && (clearTimeout(this.heartbeatDegradeTimer), this.heartbeatDegradeTimer = null), this.heartbeatFailoverTimer && (clearTimeout(this.heartbeatFailoverTimer), this.heartbeatFailoverTimer = null);
  }
  async scheduleReconnect() {
    if (this.reconnectAttempt += 1, this.diagnosticsState.reconnectAttempts = this.reconnectAttempt, this.reconnectAttempt > this.resolveMaxReconnectAttempts()) {
      this.enterFailover("reconnect_exhausted");
      return;
    }
    this.setConnectionState("reconnecting");
    const e = this.computeReconnectDelay(this.reconnectAttempt);
    await new Promise((t) => {
      this.clearReconnectTimer(), this.reconnectWaiterResolve = () => {
        this.reconnectWaiterResolve = null, t();
      }, this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null, this.reconnectWaiterResolve?.();
      }, e);
    });
  }
  clearReconnectTimer() {
    if (this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.reconnectWaiterResolve) {
      const e = this.reconnectWaiterResolve;
      this.reconnectWaiterResolve = null, e();
    }
  }
  setConnectionState(e) {
    this.diagnosticsState.connectionState !== e && (this.diagnosticsState.connectionState = e, this.options.onConnectionStateChange?.(e, this.getDiagnostics()));
  }
  enterFailover(e) {
    this.diagnosticsState.failoverTriggered || (this.running = !1, this.diagnosticsState.failoverTriggered = !0, this.diagnosticsState.failoverReason = e, this.clearReconnectTimer(), this.clearHeartbeatTimers(), this.controller?.abort(), this.controller = null, this.setConnectionState("failed"), this.options.onFailover?.(e, this.getDiagnostics()));
  }
  async resolveHeaders() {
    const e = new Headers();
    e.set("Accept", "text/event-stream");
    try {
      return pe(e, await this.options.getHeaders?.()), e;
    } catch {
      throw this.enterFailover("auth_failed"), new Error("auth_failed");
    }
  }
  buildRequestURL(e) {
    const t = typeof globalThis.location?.href == "string" && globalThis.location.href !== "" ? globalThis.location.href : "http://localhost", r = new URL(this.options.url, t);
    return e && this.diagnosticsState.lastEventId && r.searchParams.set("cursor", this.diagnosticsState.lastEventId), this.options.enableClientTuning && (typeof this.options.heartbeatMs == "number" && this.options.heartbeatMs > 0 && r.searchParams.set("heartbeat_ms", String(this.options.heartbeatMs)), typeof this.options.retryMs == "number" && this.options.retryMs > 0 && r.searchParams.set("retry_ms", String(this.options.retryMs))), r.toString();
  }
  computeReconnectDelay(e) {
    const t = this.resolveRetryMs(), r = Math.min(t * 2 ** Math.max(0, e - 1), ue), i = r * me * Math.random();
    return Math.round(r + i);
  }
  resolveRetryMs() {
    return typeof this.serverRetryMs == "number" && this.serverRetryMs > 0 ? this.serverRetryMs : typeof this.options.retryMs == "number" && this.options.retryMs > 0 ? this.options.retryMs : le;
  }
  resolveHeartbeatTimeoutMs() {
    return typeof this.options.heartbeatTimeoutMs == "number" && this.options.heartbeatTimeoutMs > 0 ? this.options.heartbeatTimeoutMs : typeof this.options.heartbeatMs == "number" && this.options.heartbeatMs > 0 ? Math.max(this.options.heartbeatMs * 2, I) : I;
  }
  resolveMaxReconnectAttempts() {
    return typeof this.options.maxReconnectAttempts == "number" && this.options.maxReconnectAttempts >= 0 ? this.options.maxReconnectAttempts : de;
  }
};
function pe(e, t) {
  if (t) {
    if (t instanceof Headers) {
      t.forEach((r, i) => {
        e.set(i, r);
      });
      return;
    }
    if (Array.isArray(t)) {
      for (const [r, i] of t) e.set(r, i);
      return;
    }
    for (const [r, i] of Object.entries(t)) e.set(r, i);
  }
}
function fe(e) {
  const t = e.replace(/\r\n/g, `
`), r = t.split(`

`);
  return r.length === 1 ? {
    frames: [],
    remainder: t
  } : {
    frames: r.slice(0, -1),
    remainder: r[r.length - 1] ?? ""
  };
}
function he(e) {
  const t = e.split(`
`), r = [];
  let i = null, n = "message", a = null;
  for (const o of t) {
    if (o === "" || o.startsWith(":")) continue;
    const l = o.indexOf(":"), c = l === -1 ? o : o.slice(0, l), d = l === -1 ? "" : o.slice(l + 1).replace(/^ /, "");
    switch (c) {
      case "id":
        i = d;
        break;
      case "event":
        n = d || "message";
        break;
      case "data":
        r.push(d);
        break;
      case "retry": {
        const u = Number.parseInt(d, 10);
        a = Number.isNaN(u) ? null : u;
        break;
      }
      default:
        break;
    }
  }
  return r.length === 0 && i === null && a === null && n === "message" ? null : {
    id: i,
    event: n,
    data: r.join(`
`),
    retry: a
  };
}
function ve(e) {
  if (e === "") return null;
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}
function ye(e) {
  return e instanceof Error && e.name === "AbortError";
}
function we(e) {
  return new ge(e);
}
var be = we, _e = be;
function Se(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (String(t.type || "").trim() !== "esign.agreement.changed" || String(t.resource_type || "").trim() !== "esign_agreement") return null;
  const r = String(t.resource_id || "").trim();
  if (!r) return null;
  const i = Array.isArray(t.sections) ? t.sections.map((n) => String(n || "").trim()).filter(Boolean) : [];
  return {
    type: "esign.agreement.changed",
    resource_type: "esign_agreement",
    resource_id: r,
    tenant_id: String(t.tenant_id || "").trim() || void 0,
    org_id: String(t.org_id || "").trim() || void 0,
    correlation_id: String(t.correlation_id || "").trim() || void 0,
    sections: i,
    occurred_at: String(t.occurred_at || "").trim(),
    status: String(t.status || "").trim(),
    message: String(t.message || "").trim() || void 0,
    metadata: t.metadata && typeof t.metadata == "object" ? t.metadata : void 0
  };
}
var xe = class {
  constructor(e) {
    this.listeners = /* @__PURE__ */ new Set(), this.client = _e({
      url: e,
      onEvent: (t) => {
        const r = Se(t.payload);
        r && this.emit({
          type: r.type,
          resourceType: r.resource_type,
          resourceId: r.resource_id,
          tenantId: r.tenant_id,
          orgId: r.org_id,
          correlationId: r.correlation_id,
          sections: r.sections,
          status: r.status,
          message: r.message,
          metadata: r.metadata
        });
      },
      onStreamGap: (t) => {
        this.emit({
          type: "stream_gap",
          reason: String(t.reason || "").trim() || "cursor_gap",
          lastEventId: String(t.last_event_id || "").trim() || void 0,
          requiresGapReconcile: !!t.requires_gap_reconcile
        });
      }
    });
  }
  start() {
    this.client.start();
  }
  stop() {
    this.client.stop();
  }
  attemptRecovery() {
    this.client.attemptRecovery();
  }
  subscribe(e) {
    return this.listeners.add(e), () => {
      this.listeners.delete(e);
    };
  }
  emit(e) {
    this.listeners.forEach((t) => t(e));
  }
}, V = {
  completedClearDelay: 3e3,
  failedClearDelay: 8e3,
  usePageFallback: !0
}, B = {
  review_status: "#agreement-review-status-panel [data-live-status-target]",
  review_config: "#agreement-review-configuration-panel [data-live-status-target]",
  participants: "#review-participants-panel [data-live-status-target]",
  comments: "#review-comment-threads-panel [data-live-status-target]",
  delivery: "#agreement-delivery-panel [data-live-status-target]",
  artifacts: "#agreement-artifacts-panel [data-live-status-target]",
  timeline: "#agreement-timeline [data-live-status-target]"
}, Ee = {
  review_status: "#agreement-review-status-panel",
  review_config: "#agreement-review-configuration-panel",
  participants: "#review-participants-panel",
  comments: "#review-comment-threads-panel",
  delivery: "#agreement-delivery-panel",
  artifacts: "#agreement-artifacts-panel",
  timeline: "#agreement-timeline"
}, Ae = "#agreement-page-status-target", k = {
  submitting: {
    text: "Sending...",
    icon: "spinner",
    colorClass: "text-blue-600",
    ariaLive: "polite"
  },
  accepted: {
    text: "Queued...",
    icon: "clock",
    colorClass: "text-blue-600",
    ariaLive: "polite",
    pulse: !0
  },
  completed: {
    text: "Done",
    icon: "check",
    colorClass: "text-green-600",
    ariaLive: "polite"
  },
  failed: {
    text: "Failed",
    icon: "error",
    colorClass: "text-red-600",
    ariaLive: "assertive"
  },
  stale: {
    text: "Refreshing...",
    icon: "refresh",
    colorClass: "text-gray-500",
    ariaLive: "polite",
    pulse: !0
  },
  retry_scheduled: {
    text: "Retry scheduled...",
    icon: "retry",
    colorClass: "text-orange-600",
    ariaLive: "polite",
    pulse: !0
  }
}, $ = {
  notify_reviewers: {
    submitting: "Notifying...",
    completed: "Notified"
  },
  send_review_reminder_now: {
    submitting: "Sending reminder...",
    completed: "Reminder sent"
  },
  "review_reminder.send_now": {
    submitting: "Sending reminder...",
    completed: "Reminder sent"
  },
  "review_reminder.pause": {
    submitting: "Pausing reminders...",
    completed: "Reminders paused"
  },
  "review_reminder.resume": {
    submitting: "Resuming reminders...",
    completed: "Reminders resumed"
  },
  approve_review_participant_on_behalf: {
    submitting: "Approving...",
    completed: "Approved"
  },
  force_approve_review: {
    submitting: "Force approving...",
    completed: "Force approved"
  },
  create_comment_thread: {
    submitting: "Adding comment...",
    completed: "Comment added"
  },
  reply_comment_thread: {
    submitting: "Adding reply...",
    completed: "Reply added"
  },
  resolve_comment_thread: {
    submitting: "Resolving...",
    completed: "Resolved"
  },
  reopen_comment_thread: {
    submitting: "Reopening...",
    completed: "Reopened"
  },
  resend_signing_request: {
    submitting: "Resending...",
    completed: "Email sent",
    retry_scheduled: "Email queued for retry"
  },
  retry_email: {
    submitting: "Retrying email...",
    completed: "Email sent",
    retry_scheduled: "Email queued for retry"
  },
  retry_job: {
    submitting: "Retrying job...",
    accepted: "Job queued...",
    completed: "Job completed",
    retry_scheduled: "Job retry scheduled"
  },
  generate_certificate: {
    submitting: "Generating certificate...",
    accepted: "Certificate generation queued...",
    completed: "Certificate generated"
  },
  generate_executed_document: {
    submitting: "Generating document...",
    accepted: "Document generation queued...",
    completed: "Document generated"
  }
};
function G(e, t, r) {
  const i = String(e || "").toLowerCase().trim(), n = (d) => {
    if (d)
      switch (t) {
        case "submitting":
          return d.submitting;
        case "accepted":
          return d.accepted;
        case "completed":
          return d.completed;
        case "failed":
          return d.failed;
        case "stale":
          return d.stale;
        case "retry_scheduled":
          return d.retry_scheduled;
        default:
          return;
      }
  }, a = $[i], o = n(a);
  if (o) return o;
  const l = $[i.split(".").pop() || ""], c = n(l);
  return c || r || k[t]?.text || "";
}
var W = {
  spinner: '<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>',
  check: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
  error: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
  clock: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
  refresh: '<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>',
  retry: '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>'
};
function Re(e, t, r = V) {
  const i = {
    target: null,
    section: null,
    participantId: t || null
  };
  if (t) {
    const a = document.querySelector(`[data-participant-id="${t}"][data-review-participant-card]`);
    if (a) {
      const o = a.querySelector("[data-live-status-target]");
      return o ? (i.target = o, i.section = "participants", i) : (i.target = a, i.section = "participants", i);
    }
  }
  const n = e;
  if (n && B[n]) {
    const a = document.querySelector(B[n]);
    if (a)
      return i.target = a, i.section = n, i;
    const o = document.querySelector(Ee[n]);
    if (o) {
      const l = o.querySelector("[data-live-status-target], .flex.items-center.justify-between");
      if (l)
        return i.target = l, i.section = n, i;
    }
  }
  if (r.usePageFallback) {
    const a = document.querySelector(Ae);
    if (a)
      return i.target = a, i;
  }
  return i;
}
function Te(e) {
  const t = String(e || "").toLowerCase();
  return t.includes("review") || t.includes("approve") || t.includes("request_changes") || t.includes("force_approve") ? "review_status" : t.includes("participant") || t.includes("notify_reviewer") || t.includes("reminder") || t.includes("on_behalf") ? "participants" : t.includes("comment") || t.includes("thread") || t.includes("reply") ? "comments" : t.includes("resend") || t.includes("delivery") || t.includes("email") || t.includes("send") ? "delivery" : t.includes("artifact") || t.includes("job") || t.includes("retry_job") || t.includes("retry_artifact") ? "artifacts" : null;
}
function Ce(e, t) {
  const r = k[e.state], i = e.message || G(e.commandName, e.state, r.text), n = document.createElement("span"), a = r.pulse ? "inline-status-pulse" : "";
  return n.className = `inline-status inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${r.colorClass} ${a}`.trim(), n.setAttribute("data-inline-status", t), n.setAttribute("data-status-state", e.state), n.setAttribute("data-command-name", e.commandName || ""), n.setAttribute("role", "status"), n.setAttribute("aria-live", r.ariaLive), n.innerHTML = `${W[r.icon] || ""}<span class="inline-status-text">${f(i)}</span>`, n;
}
function ke(e, t) {
  const r = k[t.state], i = t.message || G(t.commandName, t.state, r.text);
  e.setAttribute("data-status-state", t.state), e.setAttribute("data-command-name", t.commandName || ""), e.setAttribute("aria-live", r.ariaLive);
  const n = r.pulse ? "inline-status-pulse" : "";
  e.className = `inline-status inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${r.colorClass} ${n}`.trim(), e.innerHTML = `${W[r.icon] || ""}<span class="inline-status-text">${f(i)}</span>`;
}
function Le(e) {
  const t = document.querySelector(`[data-inline-status="${e}"]`);
  t && t.remove();
}
function Me() {
  document.querySelectorAll("[data-inline-status]").forEach((e) => e.remove());
}
function De(e = 5e3) {
  const t = Date.now();
  document.querySelectorAll("[data-inline-status]").forEach((r) => {
    const i = r.getAttribute("data-status-state"), n = parseInt(r.getAttribute("data-status-timestamp") || "0", 10);
    (i === "completed" || i === "failed") && n > 0 && t - n > e && r.remove();
  });
}
var Ie = class {
  constructor(e = {}) {
    this.clearTimers = /* @__PURE__ */ new Map(), this.config = {
      ...V,
      ...e
    };
  }
  handleStatusChange(e) {
    const { entry: t } = e;
    this.clearTimer(t.correlationId);
    const { target: r } = Re(t.section || Te(t.commandName), t.participantId, this.config);
    if (!r) return;
    const i = document.querySelector(`[data-inline-status="${t.correlationId}"]`);
    if (i) ke(i, t);
    else {
      const n = Ce(t, t.correlationId);
      n.setAttribute("data-status-timestamp", String(t.timestamp)), this.insertStatusElement(r, n);
    }
    t.state === "completed" && this.config.completedClearDelay > 0 ? this.scheduleRemoval(t.correlationId, this.config.completedClearDelay) : t.state === "failed" && this.config.failedClearDelay > 0 && this.scheduleRemoval(t.correlationId, this.config.failedClearDelay);
  }
  clear() {
    this.clearTimers.forEach((e) => clearTimeout(e)), this.clearTimers.clear(), Me();
  }
  clearTerminalStatuses() {
    document.querySelectorAll("[data-inline-status]").forEach((e) => {
      const t = e.getAttribute("data-status-state");
      (t === "completed" || t === "failed") && e.remove();
    });
  }
  reconcileAfterRefresh() {
    this.clearTerminalStatuses(), De(1e3);
  }
  insertStatusElement(e, t) {
    const r = e.querySelector("[data-live-status-insert]");
    if (r) {
      r.appendChild(t);
      return;
    }
    const i = e.querySelectorAll(".inline-flex.items-center.rounded-full");
    if (i.length > 0) {
      const n = i[0];
      n.parentElement?.insertBefore(t, n);
      return;
    }
    e.appendChild(t);
  }
  scheduleRemoval(e, t) {
    this.clearTimer(e);
    const r = setTimeout(() => {
      Le(e), this.clearTimers.delete(e);
    }, t);
    this.clearTimers.set(e, r);
  }
  clearTimer(e) {
    const t = this.clearTimers.get(e);
    t && (clearTimeout(t), this.clearTimers.delete(e));
  }
};
function Be(e) {
  return new Ie(e);
}
var P = {
  green: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500"
  },
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500"
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500"
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-500"
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500"
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-500"
  },
  gray: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    dot: "bg-gray-400"
  },
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    dot: "bg-indigo-500"
  },
  cyan: {
    bg: "bg-cyan-100",
    text: "text-cyan-700",
    dot: "bg-cyan-500"
  },
  amber: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-500"
  }
}, $e = {
  label: "Event",
  icon: "info-circle",
  color: "gray",
  category: "system",
  priority: 4,
  groupable: !0
};
function s(e, t, r, i, n, a = !1) {
  return {
    label: e,
    icon: t,
    color: r,
    category: i,
    priority: n,
    groupable: a
  };
}
var S = {
  "agreement.created": s("Agreement Created", "plus", "green", "lifecycle", 1),
  "agreement.updated": s("Agreement Updated", "edit-pencil", "blue", "lifecycle", 3, !0),
  "agreement.sent": s("Sent for Signature", "send", "blue", "lifecycle", 1),
  "agreement.resent": s("Invitation Resent", "refresh", "yellow", "lifecycle", 2),
  "agreement.voided": s("Agreement Voided", "cancel", "red", "lifecycle", 1),
  "agreement.declined": s("Agreement Declined", "xmark", "orange", "lifecycle", 1),
  "agreement.expired": s("Agreement Expired", "clock", "purple", "lifecycle", 1),
  "agreement.completed": s("Agreement Completed", "check-circle", "green", "lifecycle", 1),
  "agreement.review_requested": s("Review Requested", "eye", "indigo", "review", 1),
  "agreement.review_approved": s("Review Approved", "check-circle", "green", "review", 1),
  "agreement.review_changes_requested": s("Changes Requested", "edit-pencil", "orange", "review", 2),
  "agreement.review_viewed": s("Reviewed Document", "eye", "purple", "review", 4, !0),
  "agreement.review_notified": s("Reviewers Notified", "bell", "blue", "review", 3, !0),
  "agreement.review_notification_failed": s("Review Notification Failed", "warning-triangle", "red", "review", 2),
  "agreement.review_reminders_paused": s("Reminders Paused", "pause", "yellow", "review", 3),
  "agreement.review_reminders_resumed": s("Reminders Resumed", "play", "green", "review", 3),
  "agreement.review_closed": s("Review Closed", "check", "gray", "review", 2),
  "agreement.review_reopened": s("Review Reopened", "refresh", "indigo", "review", 2),
  "agreement.review_force_approved": s("Review Force Approved", "shield-check", "orange", "review", 2),
  "agreement.review_participant_approved_on_behalf": s("Approved on Behalf", "shield-check", "orange", "review", 2),
  "agreement.comment_thread_created": s("Comment Added", "chat", "blue", "comment", 2),
  "agreement.comment_replied": s("Reply Added", "chat", "blue", "comment", 3, !0),
  "agreement.comment_resolved": s("Comment Resolved", "check", "green", "comment", 2),
  "agreement.comment_reopened": s("Comment Reopened", "refresh", "orange", "comment", 2),
  "agreement.participant_upserted": s("Participant Updated", "user", "blue", "participant", 4, !0),
  "agreement.participant_deleted": s("Participant Removed", "user-minus", "red", "participant", 4, !0),
  "agreement.recipient_upserted": s("Recipient Updated", "user", "blue", "participant", 4, !0),
  "agreement.recipient_removed": s("Recipient Removed", "user-minus", "red", "participant", 4, !0),
  "recipient.added": s("Recipient Added", "user-plus", "green", "participant", 3),
  "recipient.removed": s("Recipient Removed", "user-minus", "red", "participant", 3),
  "recipient.updated": s("Recipient Updated", "user", "blue", "participant", 4, !0),
  "recipient.viewed": s("Document Viewed", "eye", "purple", "lifecycle", 2),
  "recipient.signed": s("Signed", "edit", "green", "lifecycle", 1),
  "recipient.declined": s("Declined to Sign", "xmark", "orange", "lifecycle", 1),
  "recipient.consent": s("Consent Given", "check", "blue", "lifecycle", 2),
  "recipient.submitted": s("Signature Submitted", "check-circle", "green", "lifecycle", 1),
  "signer.viewed": s("Document Viewed", "eye", "purple", "lifecycle", 2),
  "signer.submitted": s("Signature Submitted", "check-circle", "green", "lifecycle", 1),
  "signer.declined": s("Declined to Sign", "xmark", "orange", "lifecycle", 1),
  "signer.consent": s("Consent Given", "check", "blue", "lifecycle", 2),
  "signer.consent_captured": s("Consent Given", "check", "blue", "lifecycle", 2),
  "signer.signature_attached": s("Signature Attached", "edit", "blue", "lifecycle", 2),
  "signer.assets.asset_opened": s("Opened Document", "document", "purple", "lifecycle", 4, !0),
  "signer.assets.contract_viewed": s("Viewed Contract", "eye", "purple", "lifecycle", 4, !0),
  "agreement.field_definition_upserted": s("Field Definition Updated", "document", "gray", "field", 5, !0),
  "agreement.field_definition_deleted": s("Field Definition Removed", "trash", "gray", "field", 5, !0),
  "agreement.field_instance_upserted": s("Field Placement Updated", "document", "gray", "field", 5, !0),
  "agreement.field_instance_deleted": s("Field Placement Removed", "trash", "gray", "field", 5, !0),
  "agreement.field_upserted": s("Field Updated", "edit-pencil", "gray", "field", 5, !0),
  "agreement.field_deleted": s("Field Removed", "trash", "gray", "field", 5, !0),
  "field.created": s("Field Added", "plus", "gray", "field", 4, !0),
  "field.updated": s("Field Updated", "edit-pencil", "gray", "field", 4, !0),
  "field.deleted": s("Field Removed", "trash", "gray", "field", 4, !0),
  "signer.field_value_upserted": s("Field Value Set", "edit-pencil", "blue", "field", 3, !0),
  "field_value.updated": s("Field Value Set", "edit-pencil", "blue", "field", 3, !0),
  "signature.attached": s("Signature Attached", "edit", "blue", "lifecycle", 2),
  "artifact.generated": s("Artifact Generated", "document", "green", "delivery", 2),
  "artifact.executed_generated": s("Executed PDF Generated", "document", "green", "delivery", 2),
  "artifact.certificate_generated": s("Certificate Generated", "document", "green", "delivery", 2),
  "artifact.render_executed": s("Rendered Executed PDF", "document", "gray", "delivery", 5, !0),
  "artifact.pages_rendered": s("Rendered Preview Pages", "document", "gray", "delivery", 5, !0),
  "token.rotated": s("Token Rotated", "refresh", "yellow", "system", 4, !0),
  "token.revoked": s("Token Revoked", "lock", "red", "system", 3),
  "token.created": s("Token Created", "key", "blue", "system", 4, !0),
  "delivery.executed_generated": s("Executed PDF Generated", "document", "green", "delivery", 2),
  "delivery.certificate_generated": s("Certificate Generated", "document", "green", "delivery", 2),
  "delivery.executed_delivered": s("Executed PDF Delivered", "check", "green", "delivery", 2),
  "delivery.certificate_delivered": s("Certificate Delivered", "check", "green", "delivery", 2),
  "delivery.notification_sent": s("Notification Sent", "mail", "blue", "delivery", 3, !0),
  "delivery.notification_failed": s("Notification Failed", "warning-triangle", "red", "delivery", 2),
  "agreement.notification_delivered": s("Notification Delivered", "mail", "green", "delivery", 4, !0),
  "agreement.notification_delivery_resumed": s("Notification Delivery Resumed", "play", "blue", "delivery", 3),
  "agreement.send_notification_failed": s("Send Notification Failed", "warning-triangle", "red", "delivery", 2),
  "agreement.resend_notification_failed": s("Resend Notification Failed", "warning-triangle", "red", "delivery", 2),
  "email.sent": s("Email Sent", "mail", "blue", "delivery", 3, !0),
  "email.failed": s("Email Failed", "warning-triangle", "red", "delivery", 2),
  "email.delivered": s("Email Delivered", "check", "green", "delivery", 4, !0),
  "email.opened": s("Email Opened", "eye", "purple", "delivery", 4, !0),
  "email.bounced": s("Email Bounced", "warning-triangle", "red", "delivery", 2),
  "agreement.placement_run_created": s("Placement Run Created", "cog", "gray", "system", 5, !0),
  "agreement.placement_run_applied": s("Placement Run Applied", "cog", "gray", "system", 5, !0),
  "agreement.send": s("Sending Agreement", "send", "blue", "lifecycle", 2),
  "agreement.send_degraded_preview": s("Sent with Degraded Preview", "warning-triangle", "yellow", "delivery", 3),
  "agreement.incomplete": s("Agreement Incomplete", "warning-triangle", "orange", "lifecycle", 2),
  "signer.stage_activation_workflow_failed": s("Signer Activation Failed", "warning-triangle", "red", "system", 2),
  "signer.completion_workflow_failed": s("Signer Completion Failed", "warning-triangle", "red", "system", 2),
  agreement_created: s("Agreement Created", "plus", "green", "lifecycle", 1),
  agreement_sent: s("Sent for Signature", "send", "blue", "lifecycle", 1),
  agreement_completed: s("Agreement Completed", "check-circle", "green", "lifecycle", 1),
  agreement_voided: s("Agreement Voided", "cancel", "red", "lifecycle", 1),
  agreement_declined: s("Agreement Declined", "xmark", "orange", "lifecycle", 1),
  agreement_expired: s("Agreement Expired", "clock", "purple", "lifecycle", 1)
}, Pe = {
  agreement_created: "agreement.created",
  agreement_updated: "agreement.updated",
  agreement_sent: "agreement.sent",
  agreement_completed: "agreement.completed",
  agreement_voided: "agreement.voided",
  agreement_declined: "agreement.declined",
  agreement_expired: "agreement.expired",
  "email.send": "email.sent",
  "signer.submit": "signer.submitted",
  "signer.complete": "signer.submitted",
  "agreement created": "agreement.created",
  "agreement sent": "agreement.sent",
  "agreement completed": "agreement.completed"
};
function x(e) {
  const t = String(e || "").trim().toLowerCase();
  return Pe[t] || t;
}
function y(e) {
  const t = x(e);
  if (S[t]) return S[t];
  if (S[e]) return S[e];
  const r = Ne(e);
  return {
    ...$e,
    label: r
  };
}
function Ne(e) {
  const t = String(e || "").trim();
  return t && t.replace(/[._]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (r) => r.toUpperCase()).trim() || "Event";
}
function K(e) {
  return P[e] || P.gray;
}
function Rt(e) {
  return y(e).priority <= 3;
}
function Tt(e) {
  return y(e).groupable;
}
var Ct = 3, Fe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, He = /^[0-9a-f]{24,32}$/i, qe = /* @__PURE__ */ new Set([
  "correlation_id",
  "correlationid",
  "session_id",
  "sessionid",
  "trace_id",
  "traceid",
  "span_id",
  "spanid",
  "request_id",
  "requestid"
]), Ue = [
  "status",
  "result",
  "guard_policy",
  "effect_status",
  "notification_status",
  "decision_status",
  "state",
  "outcome"
], ze = /* @__PURE__ */ new Set([
  "participant_id",
  "recipient_id",
  "signer_id",
  "field_definition_id",
  "field_id",
  "review_id",
  "thread_id",
  "reviewer_id",
  "actor_id"
]), Oe = {
  user: "Sender",
  sender: "Sender",
  reviewer: "Reviewer",
  external: "External Reviewer",
  recipient: "Signer",
  signer: "Signer",
  system: "System",
  admin: "Admin",
  automation: "Automation"
}, je = {
  user: "#2563eb",
  sender: "#2563eb",
  reviewer: "#7c3aed",
  external: "#7c3aed",
  recipient: "#059669",
  signer: "#059669",
  system: "#64748b",
  admin: "#dc2626",
  automation: "#64748b"
};
function g(e) {
  if (!e || typeof e != "string") return !1;
  const t = e.trim();
  return Fe.test(t) || He.test(t);
}
function w(e, t) {
  const r = String(e || "").trim(), i = String(t || "").trim();
  return !r || !i ? "" : `${r}:${i}`;
}
function L(e) {
  const t = String(e || "").trim().toLowerCase();
  return Oe[t] || (t ? t.replace(/_/g, " ").replace(/\b\w/g, (r) => r.toUpperCase()) : "Participant");
}
function Y(e) {
  return je[String(e || "").trim().toLowerCase()] || "#64748b";
}
function J(e, t = "P") {
  const r = String(e || "").trim();
  return r ? r.split(/\s+/).map((i) => i[0] || "").join("").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 2) || String(t || "P").trim().slice(0, 2).toUpperCase() || "P" : String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
}
function N(e) {
  return {
    actors: e.actors || {},
    participants: e.participants || [],
    fieldDefinitions: e.field_definitions || [],
    currentUserId: e.current_user_id
  };
}
function M(e, t) {
  if (!t) return null;
  const r = String(t).trim();
  return e.participants.find((i) => {
    const n = String(i.id || "").trim(), a = String(i.recipient_id || "").trim();
    return n === r || a === r;
  }) || null;
}
function X(e, t) {
  if (!t) return null;
  const r = String(t).trim();
  return e.fieldDefinitions.find((i) => String(i.id || "").trim() === r) || null;
}
function Ve(e, t) {
  const r = String(t.actor_type || "").trim(), i = String(t.actor_id || "").trim(), n = [];
  r === "recipient" || r === "signer" ? n.push(w("recipient", i), w("signer", i)) : r === "user" || r === "sender" ? n.push(w("user", i), w("sender", i)) : r === "reviewer" || r === "external" ? n.push(w("reviewer", i), w("external", i)) : n.push(w(r, i));
  const a = n.map((E) => e.actors[E]).find(Boolean) || {}, o = String(a.display_name || a.name || "").trim(), l = String(a.email || "").trim(), c = M(e, i), d = c ? String(c.display_name || c.name || "").trim() : "", u = c ? String(c.email || "").trim() : "", h = e.currentUserId && i === e.currentUserId, m = L(a.role || a.actor_type || r);
  let p = "";
  o && !g(o) ? p = o : l && !g(l) ? p = l : d && !g(d) ? p = d : u && !g(u) ? p = u : h ? p = "You" : m ? p = m : p = "Unknown User";
  const _ = String(a.role || a.actor_type || r || "participant").trim() || "participant", v = String(a.actor_type || r).trim();
  return {
    name: p,
    role: _,
    actor_type: v,
    email: l || u || void 0,
    initials: J(p, m),
    color: Y(v)
  };
}
function Ge(e) {
  const t = e.toLowerCase();
  return !!(qe.has(t) || t.startsWith("_"));
}
function We(e) {
  const t = e.toLowerCase();
  return Ue.some((r) => t.includes(r));
}
function D(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function Ke(e, t, r) {
  if (r == null) return {
    displayValue: "-",
    isResolved: !1
  };
  if (typeof r == "object") return {
    displayValue: "[Complex Data]",
    isResolved: !1
  };
  const i = String(r).trim();
  if (ze.has(t.toLowerCase())) {
    if (t.toLowerCase().includes("participant") || t.toLowerCase().includes("recipient") || t.toLowerCase().includes("signer")) {
      const n = M(e, i);
      if (n) {
        const a = String(n.display_name || n.name || "").trim(), o = String(n.email || "").trim();
        if (a && !g(a)) return {
          displayValue: a,
          isResolved: !0
        };
        if (o && !g(o)) return {
          displayValue: o,
          isResolved: !0
        };
      }
    }
    if (t.toLowerCase().includes("field")) {
      const n = X(e, i);
      if (n) {
        const a = String(n.label || "").trim(), o = String(n.type || "").trim();
        if (a && !g(a)) return {
          displayValue: a,
          isResolved: !0
        };
        if (o && !g(o)) return {
          displayValue: `${D(o)} Field`,
          isResolved: !0
        };
      }
    }
    if (g(i)) return {
      displayValue: "",
      isResolved: !1
    };
  }
  return g(i) ? {
    displayValue: "",
    isResolved: !1
  } : {
    displayValue: i,
    isResolved: !1
  };
}
function Ye(e, t) {
  const r = t.metadata || {}, i = [];
  for (const [n, a] of Object.entries(r)) {
    if (Ge(n)) continue;
    const { displayValue: o, isResolved: l } = Ke(e, n, a);
    o && i.push({
      key: n,
      displayKey: D(n),
      value: a,
      displayValue: o,
      isBadge: We(n),
      isHidden: !1
    });
  }
  return i;
}
function kt(e, t) {
  const r = X(e, t);
  if (!r) return null;
  const i = String(r.label || "").trim();
  if (i && !g(i)) return i;
  const n = String(r.type || "").trim();
  return n && !g(n) ? D(n) + " Field" : null;
}
function Lt(e, t) {
  const r = M(e, t);
  if (!r) return null;
  const i = String(r.display_name || r.name || "").trim();
  if (i && !g(i)) return i;
  const n = String(r.email || "").trim();
  return n && !g(n) ? n : null;
}
var Mt = 300 * 1e3;
function Je(e, t = !1) {
  return [...e].sort((r, i) => {
    const n = new Date(r.created_at || 0).getTime(), a = new Date(i.created_at || 0).getTime();
    return t ? n - a : a - n;
  });
}
function Xe(e, t) {
  const r = x(e.event_type);
  if (r !== x(t.event_type) || !y(r).groupable) return !1;
  const i = new Date(e.created_at || 0).getTime(), n = new Date(t.created_at || 0).getTime();
  return !(Math.abs(i - n) > 3e5);
}
function Ze(e, t) {
  return t === "all" ? !0 : y(e.event_type).priority <= 3;
}
function Qe(e, t) {
  const r = [];
  let i = [], n = "";
  const a = () => {
    if (i.length !== 0) {
      if (i.length === 1) {
        const o = i[0];
        r.push({
          type: "event",
          event: o,
          config: y(o.event_type)
        });
      } else {
        const o = y(n), l = {
          events: [...i],
          config: o,
          eventType: n,
          startTime: i[i.length - 1].created_at,
          endTime: i[0].created_at,
          isExpanded: !1
        };
        r.push({
          type: "group",
          group: l,
          config: o
        });
      }
      i = [], n = "";
    }
  };
  for (const o of e) {
    if (!Ze(o, t)) continue;
    const l = x(o.event_type), c = y(l);
    if (!c.groupable) {
      a(), r.push({
        type: "event",
        event: o,
        config: c
      });
      continue;
    }
    if (t === "condensed" && c.priority < 3) {
      a(), r.push({
        type: "event",
        event: o,
        config: c
      });
      continue;
    }
    i.length === 0 ? (i.push(o), n = l) : n === l && i.length < 20 && Xe(i[i.length - 1], o) ? i.push(o) : (a(), i.push(o), n = l);
  }
  return a(), r;
}
function et(e, t) {
  const r = Je(e, !1), i = Qe(r, t);
  let n = 0, a = 0, o = 0;
  for (const c of i) c.type === "event" ? n++ : c.type === "group" && c.group && (a++, o += c.group.events.length, n += c.group.events.length);
  const l = r.length - n;
  return {
    items: i,
    stats: {
      totalEvents: e.length,
      visibleEvents: n,
      hiddenEvents: l,
      groupCount: a,
      groupedEventCount: o
    }
  };
}
function tt(e) {
  const t = /* @__PURE__ */ new Date(), r = new Date(t);
  return r.setDate(r.getDate() - 1), e.toDateString() === t.toDateString() ? "Today" : e.toDateString() === r.toDateString() ? "Yesterday" : e.toLocaleDateString(void 0, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}
function rt(e) {
  const t = /* @__PURE__ */ new Map();
  for (const r of e) {
    let i;
    if (r.type === "event" && r.event) i = r.event.created_at;
    else if (r.type === "group" && r.group) i = r.group.endTime;
    else continue;
    const n = new Date(i), a = n.toLocaleDateString();
    t.has(a) || t.set(a, {
      dateKey: a,
      dateLabel: tt(n),
      items: []
    }), t.get(a).items.push(r);
  }
  return Array.from(t.values());
}
function Dt(e) {
  return e.filter((t) => y(t.event_type).priority > 3).length;
}
function it(e) {
  const t = f(e.displayKey), r = f(e.displayValue);
  return e.isBadge ? `
      <div class="flex items-center gap-1.5">
        <span class="text-gray-500">${t}:</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">${r}</span>
      </div>
    ` : `
    <div>
      <span class="text-gray-500">${t}:</span>
      <span class="font-medium">${r}</span>
    </div>
  `;
}
function nt(e, t) {
  const r = Ye(t, e);
  if (r.length === 0) return "";
  const i = f(e.id);
  return `
    <button type="button" class="timeline-meta-toggle mt-2 text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
            aria-expanded="false" data-event-id="${i}">
      <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      Details
    </button>
    <div class="timeline-meta-content hidden mt-2 text-xs bg-gray-50 rounded p-2 space-y-1" data-event-content="${i}">
      ${r.map(it).join("")}
    </div>
  `;
}
function Z(e, t, r = !1) {
  const i = y(e.event_type), n = K(i.color), a = Ve(t, e), o = T(e.created_at), l = C(e.created_at), c = nt(e, t), d = f(e.id), u = f(a.name), h = f(i.label);
  return `
    <div class="timeline-entry relative pl-8 pb-6 ${r ? "last:pb-0" : ""}" role="listitem" data-event-id="${d}">
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${n.dot} ring-4 ring-white" aria-hidden="true"></div>
      <div class="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 ${r ? "hidden" : ""}" aria-hidden="true"></div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${n.bg} ${n.text}">
                ${h}
              </span>
            </div>
            <div class="text-sm text-gray-700">
              <span class="font-medium">${u}</span>
            </div>
            ${c}
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs text-gray-500" title="${f(l)}">${f(o)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function at(e, t) {
  const r = e.config, i = K(r.color), n = e.events.length, a = T(e.endTime), o = C(e.endTime), l = f(r.label), c = `group-${e.events[0]?.id || Date.now()}`;
  return `
    <div class="timeline-group relative pl-8 pb-6" role="listitem" data-group-id="${c}">
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${i.dot} ring-4 ring-white" aria-hidden="true"></div>
      <div class="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200" aria-hidden="true"></div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${i.bg} ${i.text}">
                ${l}
              </span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                ${n} events
              </span>
            </div>
            <button type="button" class="timeline-group-toggle text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mt-1"
                    aria-expanded="false" data-group-id="${c}">
              <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
              Show details
            </button>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs text-gray-500" title="${f(o)}">${f(a)}</div>
          </div>
        </div>
        <div class="timeline-group-content hidden mt-3 pt-3 border-t border-gray-100" data-group-content="${c}">
          <!-- Group events will be rendered here when expanded -->
        </div>
      </div>
    </div>
  `;
}
function st(e, t, r = !1) {
  return e.type === "event" && e.event ? Z(e.event, t, r) : e.type === "group" && e.group ? at(e.group, t) : "";
}
function ot(e, t) {
  const r = e.items.map((i, n) => st(i, t, n === e.items.length - 1)).join("");
  return `
    <div class="mb-6">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-8">${f(e.dateLabel)}</div>
      ${r}
    </div>
  `;
}
function F() {
  return ae({
    containerClass: "text-gray-500 py-8",
    bodyClass: "flex flex-col items-center text-center",
    contentClass: "",
    iconHtml: `
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `,
    title: "No activity yet",
    titleClass: "font-medium",
    message: "Timeline events will appear here as the agreement progresses.",
    messageClass: "text-sm"
  });
}
function ct(e) {
  return `
    <div class="text-center py-8 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <p class="font-medium">All current activity is hidden in condensed view.</p>
      <p class="text-sm">${e} ${e === 1 ? "event is" : "events are"} available in all activity.</p>
    </div>
  `;
}
function lt() {
  return se({
    containerClass: "timeline-loading text-gray-500",
    bodyClass: "flex items-center justify-center gap-3 py-8",
    spinnerClass: "w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin",
    text: "Loading timeline...",
    textClass: ""
  });
}
function H(e, t) {
  return e <= 0 || t === "all" ? "" : `
    <div class="timeline-hidden-notice text-center py-3 text-sm text-gray-500 border-t border-gray-100 mt-4">
      <span>${e} system ${e === 1 ? "event" : "events"} hidden.</span>
      <button type="button" class="timeline-show-all-btn ml-1 text-blue-600 hover:text-blue-800 font-medium">
        Show all activity
      </button>
    </div>
  `;
}
function dt(e) {
  const t = e === "condensed";
  return `
    <div class="timeline-view-toggle flex items-center gap-2 text-sm">
      <button type="button" class="timeline-mode-btn px-2 py-1 rounded ${t ? "bg-gray-100 font-medium" : "text-gray-500 hover:text-gray-700"}" data-mode="condensed">
        Condensed
      </button>
      <button type="button" class="timeline-mode-btn px-2 py-1 rounded ${t ? "text-gray-500 hover:text-gray-700" : "bg-gray-100 font-medium"}" data-mode="all">
        All Activity
      </button>
    </div>
  `;
}
function ut(e, t, r, i) {
  return r.totalEvents === 0 ? F() : r.visibleEvents === 0 ? r.hiddenEvents > 0 && i === "condensed" ? `
        ${ct(r.hiddenEvents)}
        ${H(r.hiddenEvents, i)}
      ` : F() : `
    <div class="relative">
      ${e.map((n) => ot(n, t)).join("")}
    </div>
    ${H(r.hiddenEvents, i)}
  `;
}
function Q(e) {
  e.querySelectorAll(".timeline-meta-toggle").forEach((t) => {
    t.addEventListener("click", () => {
      const r = t.getAttribute("data-event-id");
      if (!r) return;
      const i = e.querySelector(`[data-event-content="${r}"]`);
      if (!i) return;
      const n = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!n)), i.classList.toggle("hidden", n);
      const a = t.querySelector("svg");
      a && (a.style.transform = n ? "" : "rotate(180deg)");
    });
  });
}
function mt(e, t, r) {
  e.querySelectorAll(".timeline-group-toggle").forEach((i) => {
    i.addEventListener("click", () => {
      const n = i.getAttribute("data-group-id");
      if (!n) return;
      const a = e.querySelector(`[data-group-content="${n}"]`);
      if (!a) return;
      const o = i.getAttribute("aria-expanded") === "true";
      i.setAttribute("aria-expanded", String(!o)), a.classList.toggle("hidden", o);
      const l = i.querySelector("svg");
      if (l && (l.style.transform = o ? "" : "rotate(180deg)"), i.innerHTML = `
        <svg class="w-3 h-3 transition-transform" style="transform: ${o ? "" : "rotate(180deg)"}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
        ${o ? "Show details" : "Hide details"}
      `, !o && a.children.length === 0) {
        const c = r(n);
        c && (a.innerHTML = c.events.map((d, u) => Z(d, t, u === c.events.length - 1)).join(""), Q(a));
      }
    });
  });
}
var ee = class {
  constructor(e) {
    this.container = null, this.refreshBtn = null, this.viewToggle = null, this.viewMode = "condensed", this.processedItems = [], this.dateGroups = [], this.stats = {
      totalEvents: 0,
      visibleEvents: 0,
      hiddenEvents: 0,
      groupCount: 0,
      groupedEventCount: 0
    }, this.groupMap = /* @__PURE__ */ new Map(), this.config = e, this.bootstrap = e.bootstrap, this.resolverContext = N(this.bootstrap);
  }
  init() {
    if (this.container = document.getElementById(this.config.containerId), this.config.refreshButtonId && (this.refreshBtn = document.getElementById(this.config.refreshButtonId)), this.config.viewToggleId && (this.viewToggle = document.getElementById(this.config.viewToggleId)), !this.container) {
      console.warn(`Timeline container #${this.config.containerId} not found`);
      return;
    }
    this.refreshBtn && this.refreshBtn.addEventListener("click", () => this.refresh()), this.render();
  }
  updateBootstrap(e) {
    this.bootstrap = e, this.resolverContext = N(e), this.render();
  }
  setViewMode(e) {
    this.viewMode !== e && (this.viewMode = e, this.render());
  }
  toggleViewMode() {
    this.setViewMode(this.viewMode === "condensed" ? "all" : "condensed");
  }
  getViewMode() {
    return this.viewMode;
  }
  getStats() {
    return { ...this.stats };
  }
  render() {
    if (!this.container) return;
    const { items: e, stats: t } = et(this.bootstrap.events || [], this.viewMode);
    this.processedItems = e, this.stats = t, this.dateGroups = rt(e), this.groupMap.clear();
    for (const n of e) if (n.type === "group" && n.group) {
      const a = `group-${n.group.events[0]?.id || Date.now()}`;
      this.groupMap.set(a, n.group);
    }
    const r = ut(this.dateGroups, this.resolverContext, t, this.viewMode);
    this.container.innerHTML = r, Q(this.container), mt(this.container, this.resolverContext, (n) => this.groupMap.get(n));
    const i = this.container.querySelector(".timeline-show-all-btn");
    i && i.addEventListener("click", () => this.setViewMode("all")), this.viewToggle && (this.viewToggle.innerHTML = dt(this.viewMode), this.wireViewToggle());
  }
  wireViewToggle() {
    this.viewToggle && this.viewToggle.querySelectorAll(".timeline-mode-btn").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.getAttribute("data-mode");
        (t === "condensed" || t === "all") && this.setViewMode(t);
      });
    });
  }
  showLoading() {
    this.container && (this.container.innerHTML = lt());
  }
  async refresh() {
    if (this.container) {
      this.showLoading();
      try {
        const e = await fetch(window.location.href, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "text/html" }
        });
        if (!e.ok) throw new Error(`Failed to refresh: HTTP ${e.status}`);
        const t = await e.text(), r = new DOMParser().parseFromString(t, "text/html");
        if (r.getElementById("agreement-timeline-bootstrap")?.textContent) try {
          const n = R("agreement-timeline-bootstrap", "agreement-review-bootstrap", {
            agreement_id: this.config.agreementId,
            current_user_id: this.bootstrap.current_user_id
          }, r);
          this.updateBootstrap(n);
          return;
        } catch (n) {
          console.warn("Failed to parse timeline bootstrap:", n);
        }
        const i = this.extractLegacyBootstrap(r);
        if (i) {
          this.updateBootstrap(i);
          return;
        }
        this.render();
      } catch (e) {
        console.error("Timeline refresh failed:", e), this.render();
      }
    }
  }
  extractLegacyBootstrap(e) {
    const t = O("agreement-review-bootstrap", null, { root: e });
    let r = {}, i = [];
    return t && (r = t.actor_map && typeof t.actor_map == "object" ? t.actor_map : {}, i = Array.isArray(t.participants) ? t.participants : []), Object.keys(r).length > 0 || i.length > 0 ? {
      agreement_id: this.config.agreementId,
      events: this.bootstrap.events || [],
      actors: r,
      participants: i,
      field_definitions: this.bootstrap.field_definitions || []
    } : null;
  }
  getGroup(e) {
    return this.groupMap.get(e);
  }
  dispose() {
    this.container = null, this.refreshBtn = null, this.viewToggle = null, this.groupMap.clear();
  }
};
function It(e) {
  const t = new ee(e);
  return t.init(), t;
}
function te(e, t) {
  return !e || typeof e != "object" ? t : {
    agreement_id: String(e.agreement_id || t.agreement_id || "").trim(),
    events: Array.isArray(e.events) ? e.events : t.events,
    actors: e.actors && typeof e.actors == "object" ? e.actors : t.actors,
    participants: Array.isArray(e.participants) ? e.participants : t.participants,
    field_definitions: Array.isArray(e.field_definitions) ? e.field_definitions : t.field_definitions,
    current_user_id: String(e.current_user_id || t.current_user_id || "").trim() || t.current_user_id
  };
}
function Bt(e, t) {
  const r = {
    agreement_id: t?.agreement_id || "",
    events: t?.events || [],
    actors: t?.actors || {},
    participants: t?.participants || [],
    field_definitions: t?.field_definitions || [],
    current_user_id: t?.current_user_id
  };
  return te(O(e, null, { onError: (i) => {
    console.warn(`Failed to parse ${e}:`, i);
  } }), r);
}
function gt(e, t) {
  if (!t || typeof t != "object") return e;
  const r = {
    ...t.actor_map && typeof t.actor_map == "object" ? t.actor_map : {},
    ...e.actors
  }, i = new Set(e.participants.map((a) => String(a.id || "").trim()).filter(Boolean)), n = Array.isArray(t.participants) ? t.participants.filter((a) => {
    const o = String(a?.id || "").trim();
    return o && !i.has(o);
  }) : [];
  return {
    ...e,
    actors: r,
    participants: [...e.participants, ...n]
  };
}
function pt(e, t, r = document) {
  return gt(e, j(`#${t}`, null, {
    root: r,
    onError: (i) => {
      console.warn(`Failed to parse ${t}:`, i);
    }
  }));
}
function R(e, t, r, i = document) {
  const n = {
    agreement_id: r?.agreement_id || "",
    events: r?.events || [],
    actors: r?.actors || {},
    participants: r?.participants || [],
    field_definitions: r?.field_definitions || [],
    current_user_id: r?.current_user_id
  };
  return pt(te(j(`#${e}`, null, {
    root: i,
    onError: (a) => {
      console.warn(`Failed to parse ${e}:`, a);
    }
  }), n), t, i);
}
function q(e = document) {
  e.querySelectorAll("[data-timestamp]").forEach((t) => {
    if (t.classList.contains("recipient-timestamp")) return;
    const r = t.getAttribute("data-timestamp");
    r && (t.textContent = C(r));
  }), e.querySelectorAll(".recipient-timestamp").forEach((t) => {
    const r = t.getAttribute("data-timestamp");
    r && (t.textContent = T(r));
  });
}
function ft(e = document) {
  e.addEventListener("click", (t) => {
    const r = t.target;
    if (!(r instanceof Element)) return;
    const i = r.closest(".collapsible-expand-trigger");
    if (i) {
      const c = i.closest(".collapsible-trigger");
      if (c) {
        const d = c.getAttribute("aria-controls"), u = d ? document.getElementById(d) : null;
        u && (c.setAttribute("aria-expanded", "true"), u.classList.add("expanded"));
      }
      return;
    }
    if (r.closest(".collapsible-header-actions button, .collapsible-header-actions [data-command-name]")) return;
    const n = r.closest(".collapsible-trigger");
    if (!n) return;
    const a = n.getAttribute("aria-controls"), o = a ? document.getElementById(a) : null;
    if (!o) return;
    const l = n.getAttribute("aria-expanded") === "true";
    n.setAttribute("aria-expanded", String(!l)), o.classList.toggle("expanded", !l);
  });
}
function b(e, t) {
  const r = String(e || "").trim(), i = String(t || "").trim();
  return !r || !i ? "" : `${r}:${i}`;
}
function ht(e, t) {
  if (!t) return null;
  const r = String(t).trim();
  return e.find((i) => {
    const n = String(i.id || "").trim(), a = String(i.recipient_id || "").trim();
    return n === r || a === r;
  }) || null;
}
function A(e, t, r) {
  const i = r.actor_map && typeof r.actor_map == "object" ? r.actor_map : {}, n = Array.isArray(r.participants) ? r.participants : [], a = String(e || "").trim(), o = String(t || "").trim(), l = [];
  a === "recipient" || a === "signer" ? l.push(b("recipient", t), b("signer", t)) : a === "user" || a === "sender" ? l.push(b("user", t), b("sender", t)) : a === "reviewer" || a === "external" ? l.push(b("reviewer", t), b("external", t)) : l.push(b(a, t));
  const c = l.map((E) => i[E]).find(Boolean) || {}, d = String(c.display_name || c.name || "").trim(), u = String(c.email || "").trim(), h = ht(n, o), m = h ? String(h.display_name || h.name || "").trim() : "", p = h ? String(h.email || "").trim() : "", _ = L(c.role || c.actor_type || a);
  let v = "";
  return d && !g(d) ? v = d : u && !g(u) ? v = u : m && !g(m) ? v = m : p && !g(p) ? v = p : _ ? v = _ : v = "Unknown User", {
    name: v,
    role: String(c.role || c.actor_type || a || "participant").trim() || "participant",
    actor_type: String(c.actor_type || a).trim()
  };
}
function U(e) {
  document.querySelectorAll("[data-review-actor-avatar]").forEach((t) => {
    const r = A(t.getAttribute("data-actor-type") || "", t.getAttribute("data-actor-id") || "", e), i = Y(r.actor_type);
    t.textContent = J(r.name, r.role), t.style.backgroundColor = i, t.style.color = "#ffffff";
  }), document.querySelectorAll("[data-review-actor-name]").forEach((t) => {
    t.textContent = A(t.getAttribute("data-actor-type") || "", t.getAttribute("data-actor-id") || "", e).name;
  }), document.querySelectorAll("[data-review-actor-role]").forEach((t) => {
    const r = A(t.getAttribute("data-actor-type") || "", t.getAttribute("data-actor-id") || "", e);
    t.textContent = L(r.role || r.actor_type);
  });
}
function vt(e, t, r = document) {
  return ce(e, t, r, e);
}
var z = {
  status: "none",
  gate: "approve_before_send",
  comments_enabled: !1,
  review_id: "",
  override_active: !1,
  override_reason: "",
  override_by_user_id: "",
  override_by_display_name: "",
  override_at: "",
  actor_map: {},
  participants: []
}, yt = {
  review_status: ["#agreement-review-status-panel"],
  review_config: ["#agreement-review-configuration-panel", "#agreement-review-bootstrap"],
  participants: [
    "#review-participants-panel",
    "#agreement-participants-panel",
    "#participant-progress-panel"
  ],
  comments: ["#review-comment-threads-panel", "#agreement-review-bootstrap"],
  delivery: ["#agreement-delivery-panel"],
  artifacts: ["#agreement-artifacts-panel", "#download-status-notice-static"],
  timeline: ["#agreement-timeline-bootstrap"]
}, re = class {
  constructor(e) {
    this.timelineController = null, this.commandRuntimeController = null, this.feedbackAdapter = null, this.inlineStatusManager = null, this.inlineStatusUnsubscribe = null, this.initialized = !1, this.clickHandler = (t) => {
      this.handleDocumentClick(t);
    }, this.changeHandler = (t) => {
      this.handleDocumentChange(t);
    }, this.config = e, this.reviewBootstrap = { ...z };
  }
  init() {
    this.initialized || (this.initialized = !0, this.hydrateReviewBootstrap(), q(), ft(), U(this.reviewBootstrap), this.initializeReviewWorkspace(), this.syncAgreementThreadAnchorFields(), this.initializeDeliveryState(), this.initInlineStatusManager(), this.initFeedbackAdapter(), this.initCommandRuntime(), this.feedbackAdapter?.start(), document.addEventListener("click", this.clickHandler), document.addEventListener("change", this.changeHandler), this.initTimeline());
  }
  initTimeline() {
    this.timelineController = new ee({
      containerId: "agreement-timeline",
      refreshButtonId: "timeline-refresh",
      viewToggleId: "timeline-view-toggle",
      bootstrap: R("agreement-timeline-bootstrap", "agreement-review-bootstrap", { agreement_id: this.config.agreementId }),
      basePath: this.config.basePath,
      apiBasePath: this.config.apiBasePath,
      agreementId: this.config.agreementId,
      panelName: this.config.panelName
    }), this.timelineController.init();
  }
  hydrateReviewBootstrap(e = document) {
    const t = vt("agreement-review-bootstrap", z, e);
    Object.keys(this.reviewBootstrap).forEach((r) => {
      delete this.reviewBootstrap[r];
    }), Object.assign(this.reviewBootstrap, t);
  }
  getReviewBootstrap() {
    return this.reviewBootstrap;
  }
  onCommandRuntimeRefresh(e = document) {
    if (this.hydrateReviewBootstrap(e), this.initializeReviewWorkspace(), U(this.reviewBootstrap), q(e), this.syncAgreementThreadAnchorFields(), e.querySelector("#agreement-timeline-bootstrap")?.textContent && this.timelineController) try {
      const t = R("agreement-timeline-bootstrap", "agreement-review-bootstrap", { agreement_id: this.config.agreementId }, e);
      this.timelineController.updateBootstrap(t);
    } catch {
    }
  }
  resolveScopeParams() {
    const e = new URLSearchParams(window.location.search || "");
    return {
      tenantId: (this.config.tenantId || e.get("tenant_id") || "").trim(),
      orgId: (this.config.orgId || e.get("org_id") || "").trim()
    };
  }
  buildScopedURL(e) {
    const t = new URL(e, window.location.origin), { tenantId: r, orgId: i } = this.resolveScopeParams();
    return r && t.searchParams.set("tenant_id", r), i && t.searchParams.set("org_id", i), t.toString();
  }
  buildAssetDownloadURL(e) {
    const t = this.config.panelName || "esign_agreements", r = new URL(`${this.config.apiBasePath}/panels/${t}/${this.config.agreementId}/artifact/${e}`, window.location.origin), { tenantId: i, orgId: n } = this.resolveScopeParams();
    return i && r.searchParams.set("tenant_id", i), n && r.searchParams.set("org_id", n), r.searchParams.set("disposition", "attachment"), r.toString();
  }
  async refreshTimeline() {
    this.timelineController && await this.timelineController.refresh();
  }
  get panelName() {
    return this.config.panelName || "esign_agreements";
  }
  notifySuccess(e) {
    const t = window.toastManager;
    t?.success && t.success(e);
  }
  notifyError(e) {
    const t = window.toastManager;
    if (t?.error) {
      t.error(e);
      return;
    }
    window.alert(e);
  }
  getReviewRecipientRows() {
    return Array.from(document.querySelectorAll("[data-review-recipient-row]"));
  }
  getExternalReviewersContainer() {
    return document.getElementById("agreement-external-reviewers");
  }
  normalizeParticipantType(e) {
    return String(e || "").trim().toLowerCase();
  }
  normalizeRecipientParticipant(e) {
    if (!e.querySelector("[data-review-recipient-enabled]")?.checked) return null;
    const t = String(e.getAttribute("data-recipient-id") || "").trim();
    return t ? {
      participant_type: "recipient",
      recipient_id: t,
      can_comment: e.querySelector("[data-review-recipient-comment]")?.checked ?? !0,
      can_approve: e.querySelector("[data-review-recipient-approve]")?.checked ?? !0
    } : null;
  }
  collectReviewParticipants() {
    const e = [];
    return this.getReviewRecipientRows().forEach((t) => {
      const r = this.normalizeRecipientParticipant(t);
      r && e.push(r);
    }), Array.from(document.querySelectorAll("[data-review-external-row]")).forEach((t) => {
      const r = String(t.querySelector("[data-review-external-email]")?.value || "").trim();
      r && e.push({
        participant_type: "external",
        email: r,
        display_name: String(t.querySelector("[data-review-external-name]")?.value || "").trim(),
        can_comment: t.querySelector("[data-review-external-comment]")?.checked ?? !0,
        can_approve: t.querySelector("[data-review-external-approve]")?.checked ?? !0
      });
    }), e;
  }
  syncExternalReviewersEmptyState() {
    const e = document.getElementById("agreement-external-reviewers-empty"), t = this.getExternalReviewersContainer();
    if (!e) return;
    const r = !!t?.querySelector("[data-review-external-row]");
    e.classList.toggle("hidden", r);
  }
  resetExternalReviewerRows() {
    const e = this.getExternalReviewersContainer();
    e && (e.innerHTML = "", this.syncExternalReviewersEmptyState());
  }
  appendExternalReviewerRow(e = {}) {
    const t = this.getExternalReviewersContainer(), r = document.getElementById("agreement-external-reviewer-template");
    if (!t || !r?.content) return;
    const i = document.importNode(r.content, !0), n = i.querySelector("[data-review-external-row]");
    if (!n) return;
    const a = n.querySelector("[data-review-external-name]"), o = n.querySelector("[data-review-external-email]"), l = n.querySelector("[data-review-external-comment]"), c = n.querySelector("[data-review-external-approve]");
    a && (a.value = String(e.display_name || e.name || "").trim()), o && (o.value = String(e.email || "").trim()), l && (l.checked = e.can_comment !== !1), c && (c.checked = e.can_approve !== !1), t.appendChild(i), this.syncExternalReviewersEmptyState();
  }
  initializeReviewWorkspace() {
    const e = document.getElementById("agreement-review-gate"), t = document.getElementById("agreement-review-comments-enabled");
    e && (e.value = String(this.reviewBootstrap.gate || "approve_before_send").trim() || "approve_before_send"), t && (t.checked = !!this.reviewBootstrap.comments_enabled);
    const r = Array.isArray(this.reviewBootstrap.participants) ? this.reviewBootstrap.participants : [];
    this.resetExternalReviewerRows(), this.getReviewRecipientRows().forEach((i) => {
      const n = String(i.getAttribute("data-recipient-id") || "").trim(), a = i.querySelector("[data-review-recipient-enabled]"), o = i.querySelector("[data-review-recipient-comment]"), l = i.querySelector("[data-review-recipient-approve]"), c = r.find((d) => this.normalizeParticipantType(d?.participant_type) === "recipient" && String(d?.recipient_id || "").trim() === n);
      a && (a.checked = !!c), o && (o.checked = c ? !!c.can_comment : !0), l && (l.checked = c ? !!c.can_approve : !0);
    }), r.filter((i) => this.normalizeParticipantType(i?.participant_type) === "external").forEach((i) => this.appendExternalReviewerRow(i)), this.syncExternalReviewersEmptyState();
  }
  syncAgreementThreadAnchorFields() {
    const e = String(document.getElementById("agreement-thread-anchor-type")?.value || "agreement").trim() || "agreement";
    document.getElementById("agreement-thread-page-wrap")?.classList.toggle("hidden", e !== "page"), document.getElementById("agreement-thread-field-wrap")?.classList.toggle("hidden", e !== "field");
  }
  syncBootstrapScriptContent(e, t) {
    const r = document.getElementById(e), i = t.getElementById(e);
    r && i && (r.textContent = i.textContent || "");
  }
  initInlineStatusManager() {
    this.inlineStatusManager = Be({
      completedClearDelay: 3e3,
      failedClearDelay: 8e3,
      usePageFallback: !0
    });
  }
  initFeedbackAdapter() {
    const e = String(this.config.feedback?.sseEndpoint || "").trim();
    this.feedbackAdapter?.stop(), this.feedbackAdapter = e ? new xe(e) : null;
  }
  resolveLiveSelectors(e) {
    const t = /* @__PURE__ */ new Set();
    return e.forEach((r) => {
      (yt[r] || []).forEach((i) => {
        t.add(i);
      });
    }), Array.from(t);
  }
  allLiveSelectors() {
    return Array.from(/* @__PURE__ */ new Set([
      ...this.resolveLiveSelectors([
        "review_status",
        "review_config",
        "participants",
        "comments",
        "delivery",
        "artifacts",
        "timeline"
      ]),
      "#agreement-review-bootstrap",
      "#agreement-timeline-bootstrap"
    ]));
  }
  matchesAgreementFeedback(e) {
    if (e.type !== "esign.agreement.changed" || e.resourceType !== "esign_agreement" || String(e.resourceId || "").trim() !== this.config.agreementId) return !1;
    const { tenantId: t, orgId: r } = this.resolveScopeParams();
    return !(t && String(e.tenantId || "").trim() && String(e.tenantId || "").trim() !== t || r && String(e.orgId || "").trim() && String(e.orgId || "").trim() !== r);
  }
  async reconcileAgreementFeedback(e) {
    if (!this.matchesAgreementFeedback(e.event)) return;
    const t = Array.isArray(e.event.sections) ? e.event.sections : [], r = new Set(e.pending?.refreshSelectors || []);
    this.resolveLiveSelectors(t).forEach((i) => {
      r.add(i);
    }), r.add("#agreement-review-bootstrap"), r.add("#agreement-timeline-bootstrap"), r.size !== 0 && await e.controller.refreshSelectors(Array.from(r));
  }
  async reconcileAgreementStreamGap(e) {
    await e.controller.refreshSelectors(this.allLiveSelectors()), this.feedbackAdapter?.attemptRecovery();
  }
  async dispatchAgreementCommand(e) {
    return this.commandRuntimeController ? (await this.commandRuntimeController.dispatch(e)).success : !1;
  }
  initCommandRuntime() {
    const e = document.getElementById("agreement-review-command-region");
    e && (this.inlineStatusUnsubscribe?.(), this.commandRuntimeController?.destroy(), this.commandRuntimeController = oe({
      mount: e,
      apiBasePath: this.config.apiBasePath,
      panelName: this.panelName,
      recordId: this.config.agreementId,
      rpcEndpoint: `${this.config.apiBasePath}/rpc`,
      tenantId: this.config.tenantId,
      orgId: this.config.orgId,
      feedback: this.feedbackAdapter ? {
        adapter: this.feedbackAdapter,
        onEvent: (t) => this.reconcileAgreementFeedback(t),
        onStreamGap: (t) => this.reconcileAgreementStreamGap(t)
      } : void 0,
      onAfterRefresh: ({ sourceDocument: t }) => {
        this.syncBootstrapScriptContent("agreement-review-bootstrap", t), this.syncBootstrapScriptContent("agreement-timeline-bootstrap", t), this.inlineStatusManager?.reconcileAfterRefresh(), this.onCommandRuntimeRefresh(document);
      }
    }), this.commandRuntimeController && this.inlineStatusManager && (this.inlineStatusUnsubscribe = this.commandRuntimeController.subscribeToInlineStatus((t) => this.inlineStatusManager?.handleStatusChange(t))));
  }
  async executeAction(e, t = {}) {
    const r = await ie(this.buildScopedURL(`${this.config.apiBasePath}/panels/${this.panelName}/actions/${e}`), {
      id: this.config.agreementId,
      ...t
    }, { credentials: "same-origin" });
    if (!r.success || r.error) {
      const i = ne(r.error || {
        textCode: null,
        message: `${e} failed`,
        metadata: null,
        fields: null,
        validationErrors: null
      }, `${e} failed`);
      throw new Error(i);
    }
  }
  async executeActionAndReload(e, t = {}, r = `${e} completed successfully`) {
    await this.executeAction(e, t), this.notifySuccess(r), window.location.reload();
  }
  setElementBusy(e, t) {
    e && ((e instanceof HTMLButtonElement || e instanceof HTMLInputElement) && (e.disabled = t), t ? e.setAttribute("aria-busy", "true") : e.removeAttribute("aria-busy"));
  }
  async submitAgreementReview(e) {
    if (e?.getAttribute("aria-busy") === "true") return;
    const t = document.getElementById("agreement-review-gate"), r = document.getElementById("agreement-review-comments-enabled"), i = {
      gate: String(t?.value || "approve_before_send").trim() || "approve_before_send",
      comments_enabled: r?.checked ?? !1,
      review_participants: this.collectReviewParticipants()
    }, n = String(this.reviewBootstrap.status || "").trim().toLowerCase(), a = n && n !== "none" && n !== "in_review" ? "reopen_review" : "request_review";
    this.setElementBusy(e, !0);
    try {
      await this.dispatchAgreementCommand({
        trigger: e || void 0,
        submitter: e || void 0,
        commandName: a,
        dispatchName: `esign.agreements.${a}`,
        transport: "rpc",
        payload: i,
        successMessage: a === "reopen_review" ? "Review reopened" : "Review requested",
        fallbackMessage: "Unable to submit review",
        refreshSelectors: [
          "#agreement-review-status-panel",
          "#agreement-review-configuration-panel",
          "#review-participants-panel",
          "#review-comment-threads-panel",
          "#agreement-review-bootstrap",
          "#agreement-timeline-bootstrap"
        ]
      });
    } finally {
      this.setElementBusy(e, !1);
    }
  }
  resolveDownloadFilename(e, t) {
    return (e.headers.get("content-disposition") || "").match(/filename="?([^"]+)"?/i)?.[1] || t;
  }
  showDownloadNotice(e, t = "warning") {
    const r = document.getElementById("download-status-notice-dynamic");
    r && (document.getElementById("download-status-notice-static")?.classList.add("hidden"), r.className = `mx-6 mt-6 rounded-lg border p-4 text-sm ${t === "success" ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`, r.textContent = e, r.classList.remove("hidden"));
  }
  getExecutedDownloadButtons() {
    return Array.from(document.querySelectorAll('[data-action="download-executed"]'));
  }
  markExecutedDownloadUnavailable(e) {
    const t = '<svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    this.getExecutedDownloadButtons().forEach((r) => {
      r.dataset.downloadState = "unavailable", r.disabled = !0, r.setAttribute("aria-disabled", "true"), r.classList.remove("btn-primary"), r.classList.add("btn-warning"), r.innerHTML = `${t}Unable To Download Package`, r.setAttribute("title", e), r.setAttribute("aria-label", "Executed completion package is unavailable");
    }), e && this.showDownloadNotice(e, "warning");
  }
  setExecutedDownloadLoading(e) {
    const t = '<svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>', r = '<svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Download Completion Package';
    this.getExecutedDownloadButtons().forEach((i) => {
      (i.dataset.downloadState || "").toLowerCase() !== "unavailable" && (i.disabled = e, i.innerHTML = e ? `${t}Preparing package...` : r);
    });
  }
  initializeDeliveryState() {
    this.config.delivery?.executed_applicable && String(this.config.agreementStatus || "").toLowerCase() === "completed" && String(this.config.delivery.executed_status || "").toLowerCase() !== "ready" && !String(this.config.delivery.executed_object_key || "").trim() && this.markExecutedDownloadUnavailable("Executed completion package is still unavailable for this agreement. Artifact generation may still be running.");
  }
  async fetchAndDownloadAsset(e, t, r) {
    const i = await fetch(this.buildAssetDownloadURL(e), {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/pdf" }
    });
    if (!i.ok) throw new Error(`${r} is not available (HTTP ${i.status}). Refresh delivery status and try again.`);
    if (!(i.headers.get("content-type") || "").toLowerCase().includes("application/pdf")) throw new Error(`${r} is unavailable because the response is not a PDF.`);
    const n = await i.blob();
    if (!n || n.size === 0) throw new Error(`${r} is unavailable because the file is empty.`);
    const a = this.resolveDownloadFilename(i, t), o = URL.createObjectURL(n), l = document.createElement("a");
    l.href = o, l.download = a, document.body.appendChild(l), l.click(), l.remove(), setTimeout(() => URL.revokeObjectURL(o), 1e3);
  }
  async handleDocumentClick(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("#agreement-add-external-reviewer-btn")) {
      e.preventDefault(), this.appendExternalReviewerRow();
      return;
    }
    const r = t.closest("[data-review-external-remove]");
    if (r) {
      e.preventDefault(), r.closest("[data-review-external-row]")?.remove(), this.syncExternalReviewersEmptyState();
      return;
    }
    const i = t.closest("#agreement-submit-review-btn");
    if (i) {
      e.preventDefault(), await this.submitAgreementReview(i);
      return;
    }
    const n = t.closest('[data-action="resend-recipient"], [data-action="resend-participant"]');
    if (n) {
      e.preventDefault();
      const m = n.getAttribute("data-recipient-id") || n.getAttribute("data-participant-id");
      if (!m) {
        this.notifyError("Recipient ID is missing");
        return;
      }
      try {
        await this.dispatchAgreementCommand({
          trigger: n,
          submitter: n,
          commandName: "resend",
          dispatchName: "esign.agreements.resend",
          transport: "rpc",
          payload: { recipient_id: m },
          successMessage: "Recipient notification resent",
          fallbackMessage: "Unable to resend recipient notification",
          refreshSelectors: [
            "#agreement-delivery-panel",
            "#agreement-artifacts-panel",
            "#agreement-participants-panel"
          ]
        });
      } finally {
        n.removeAttribute("aria-busy");
      }
      return;
    }
    const a = t.closest('[data-action="rotate-token"]');
    if (a) {
      e.preventDefault();
      const m = a.getAttribute("data-recipient-id") || a.getAttribute("data-participant-id");
      if (!m) {
        this.notifyError("Recipient ID is missing");
        return;
      }
      try {
        await this.dispatchAgreementCommand({
          trigger: a,
          submitter: a,
          commandName: "rotate_token",
          dispatchName: "esign.tokens.rotate",
          transport: "rpc",
          payload: { recipient_id: m },
          successMessage: "Recipient token rotated",
          fallbackMessage: "Unable to rotate token",
          refreshSelectors: [
            "#agreement-delivery-panel",
            "#agreement-artifacts-panel",
            "#agreement-participants-panel"
          ]
        });
      } finally {
        a.removeAttribute("aria-busy");
      }
      return;
    }
    const o = t.closest('[data-action="download-executed"]');
    if (o) {
      if (e.preventDefault(), (o.dataset.downloadState || "").toLowerCase() === "unavailable") {
        this.showDownloadNotice("Executed completion package is still unavailable for this agreement. Refresh delivery status and try again.", "warning");
        return;
      }
      this.setExecutedDownloadLoading(!0);
      try {
        await this.fetchAndDownloadAsset("executed", `${this.config.agreementId}-executed.pdf`, "Executed completion package"), this.showDownloadNotice("Executed completion package downloaded successfully.", "success");
      } catch (m) {
        this.markExecutedDownloadUnavailable(m instanceof Error ? m.message : "Unable To Download Package");
      } finally {
        this.setExecutedDownloadLoading(!1);
      }
      return;
    }
    const l = t.closest('[data-action="download-certificate"]');
    if (l) {
      e.preventDefault();
      const m = l.innerHTML;
      l.disabled = !0, l.innerHTML = '<svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Preparing...';
      try {
        await this.fetchAndDownloadAsset("certificate", `${this.config.agreementId}-certificate.pdf`, "Standalone audit certificate"), this.showDownloadNotice("Standalone audit certificate downloaded successfully.", "success");
      } catch (p) {
        this.showDownloadNotice(p instanceof Error ? p.message : "Unable to download standalone audit certificate.", "warning");
      } finally {
        l.disabled = !1, l.innerHTML = m;
      }
      return;
    }
    const c = t.closest('[data-action="retry-email"]');
    if (c) {
      e.preventDefault();
      const m = c.innerHTML;
      c.disabled = !0, c.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.dispatchAgreementCommand({
          trigger: c,
          submitter: c,
          transport: "action",
          commandName: "retry_email",
          payload: {
            email_id: c.getAttribute("data-email-id") || "",
            recipient_id: c.getAttribute("data-recipient-id") || ""
          },
          successMessage: "Email retry queued",
          fallbackMessage: "Unable to retry email",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel"]
        });
      } finally {
        c.disabled = !1, c.innerHTML = m;
      }
      return;
    }
    const d = t.closest('[data-action="retry-job"]');
    if (d) {
      e.preventDefault();
      const m = d.innerHTML;
      d.disabled = !0, d.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.dispatchAgreementCommand({
          trigger: d,
          submitter: d,
          transport: "action",
          commandName: "retry_job",
          payload: {
            job_id: d.getAttribute("data-job-id") || "",
            job_type: d.getAttribute("data-job-type") || ""
          },
          successMessage: "Job retry queued",
          fallbackMessage: "Unable to retry job",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel"]
        });
      } finally {
        d.disabled = !1, d.innerHTML = m;
      }
      return;
    }
    const u = t.closest('[data-action="retry-artifact"]');
    if (u) {
      e.preventDefault();
      const m = u.innerHTML;
      u.disabled = !0, u.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.dispatchAgreementCommand({
          trigger: u,
          submitter: u,
          transport: "action",
          commandName: "retry_artifact",
          payload: { artifact_type: u.getAttribute("data-artifact-type") || "" },
          successMessage: "Artifact retry queued",
          fallbackMessage: "Unable to retry artifact generation",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel"]
        });
      } finally {
        u.disabled = !1, u.innerHTML = m;
      }
      return;
    }
    const h = t.closest("#delivery-refresh");
    h && (e.preventDefault(), await this.commandRuntimeController?.refreshSelectors(this.allLiveSelectors(), h), this.feedbackAdapter?.attemptRecovery());
  }
  handleDocumentChange(e) {
    const t = e.target;
    t instanceof Element && t.id === "agreement-thread-anchor-type" && this.syncAgreementThreadAnchorFields();
  }
  dispose() {
    document.removeEventListener("click", this.clickHandler), document.removeEventListener("change", this.changeHandler), this.inlineStatusUnsubscribe?.(), this.inlineStatusUnsubscribe = null, this.inlineStatusManager?.clear(), this.inlineStatusManager = null, this.commandRuntimeController?.destroy(), this.commandRuntimeController = null, this.feedbackAdapter?.stop(), this.feedbackAdapter = null, this.timelineController && (this.timelineController.dispose(), this.timelineController = null), this.initialized = !1;
  }
};
function $t(e) {
  if (!e)
    return console.warn("Agreement detail page config not provided"), null;
  const t = new re(e);
  return document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => t.init()) : t.init(), t;
}
function Pt(e) {
  const t = new re(e);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => t.init()) : t.init(), window.__agreementDetailController = t;
}
function Nt() {
  return window.__agreementDetailController || null;
}
export {
  Be as $,
  Ve as A,
  y as B,
  et as C,
  J as D,
  Y as E,
  $e as F,
  Ie as G,
  Rt as H,
  S as I,
  B as J,
  Ae as K,
  P as L,
  Ye as M,
  Lt as N,
  L as O,
  Ct as P,
  Te as Q,
  Ne as R,
  rt as S,
  N as T,
  $ as U,
  Tt as V,
  V as W,
  Me as X,
  k as Y,
  De as Z,
  Bt as _,
  q as a,
  Dt as b,
  A as c,
  ft as d,
  Ce as et,
  ee as f,
  R as g,
  gt as h,
  ht as i,
  ke as it,
  kt as j,
  g as k,
  b as l,
  pt as m,
  U as n,
  Le as nt,
  Nt as o,
  It as p,
  Ee as q,
  Pt as r,
  Re as rt,
  $t as s,
  re as t,
  G as tt,
  vt as u,
  ct as v,
  w,
  tt as x,
  ut as y,
  K as z
};

//# sourceMappingURL=agreement-detail-COcsN1xo.js.map
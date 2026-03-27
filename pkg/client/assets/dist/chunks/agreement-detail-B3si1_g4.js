import "./provenance-card-BnOi6ubz.js";
import { escapeHTML as v } from "../shared/html.js";
import { i as re } from "./command-runtime-DiUPApH6.js";
import { executeActionRequest as ne, formatStructuredErrorForDisplay as ie } from "../toast/error-helpers.js";
var ae = 3e3, $ = 45e3, se = 5, oe = 3e4, ce = 0.2, le = class {
  constructor(r) {
    if (this.options = r, this.running = !1, this.connectLoop = null, this.controller = null, this.heartbeatDegradeTimer = null, this.heartbeatFailoverTimer = null, this.reconnectTimer = null, this.reconnectWaiterResolve = null, this.reconnectAttempt = 0, this.serverRetryMs = null, this.recoveryPending = !1, !r.url || r.url.trim() === "")
      throw new Error("go-router SSE client requires a url");
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
      streamUrl: r.url
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
  triggerFailover(r) {
    this.enterFailover(r);
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
      const r = this.reconnectAttempt > 0;
      this.setConnectionState(r ? "reconnecting" : "connecting");
      try {
        const e = this.buildRequestURL(r);
        this.diagnosticsState.streamUrl = e;
        const t = await this.resolveHeaders();
        if (!this.running)
          return;
        this.controller = new AbortController();
        const n = await fetch(e, {
          method: "GET",
          headers: t,
          signal: this.controller.signal
        });
        if (n.status === 401 || n.status === 403) {
          this.enterFailover("auth_failed");
          return;
        }
        if (!n.ok)
          throw new Error(`SSE request failed with status ${n.status}`);
        if (!n.body)
          throw new Error("SSE response body is not readable");
        if (this.reconnectAttempt = 0, this.diagnosticsState.reconnectAttempts = 0, this.setConnectionState("connected"), this.armHeartbeatTimers(), this.recoveryPending && (this.recoveryPending = !1, this.options.onRecovery?.(this.getDiagnostics())), await this.consume(n.body), !this.running || this.diagnosticsState.failoverTriggered)
          return;
        await this.scheduleReconnect();
      } catch (e) {
        if (!this.running || this.diagnosticsState.failoverTriggered || ge(e) && !this.running)
          return;
        await this.scheduleReconnect();
      } finally {
        this.controller = null, this.clearHeartbeatTimers();
      }
    }
  }
  async consume(r) {
    const e = r.getReader(), t = new TextDecoder();
    let n = "";
    try {
      for (; this.running; ) {
        const { done: i, value: a } = await e.read();
        if (i)
          return;
        n += t.decode(a, { stream: !0 });
        const s = ue(n);
        n = s.remainder;
        for (const c of s.frames) {
          const l = me(c);
          if (l && (this.dispatch(l), !this.running || this.diagnosticsState.failoverTriggered))
            return;
        }
      }
    } finally {
      e.releaseLock();
    }
  }
  dispatch(r) {
    if (r.retry !== null && r.retry > 0 && (this.serverRetryMs = r.retry), r.data === "" && r.id === null && r.event === "message")
      return;
    const e = pe(r.data);
    switch (r.event) {
      case "heartbeat":
        this.handleHeartbeat(e);
        return;
      case "stream_gap":
        this.handleStreamGap(e);
        return;
      default:
        this.handleDomainEvent({
          id: r.id,
          name: r.event || "message",
          payload: e
        });
    }
  }
  handleDomainEvent(r) {
    r.id && (this.diagnosticsState.lastEventId = r.id), this.diagnosticsState.totalEventsReceived += 1, this.diagnosticsState.lastEventAt = (/* @__PURE__ */ new Date()).toISOString(), this.options.onEvent?.(r);
  }
  handleHeartbeat(r) {
    this.diagnosticsState.lastHeartbeatAt = r.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(), this.diagnosticsState.connectionState === "degraded" && this.setConnectionState("connected"), this.armHeartbeatTimers(), this.options.onHeartbeat?.(r);
  }
  handleStreamGap(r) {
    this.diagnosticsState.gapEventsReceived += 1, this.options.onStreamGap?.(r), this.options.onRequestSnapshot?.(), this.enterFailover("stream_gap");
  }
  armHeartbeatTimers() {
    const r = this.resolveHeartbeatTimeoutMs();
    r <= 0 || (this.clearHeartbeatTimers(), this.heartbeatDegradeTimer = setTimeout(() => {
      !this.running || this.diagnosticsState.failoverTriggered || (this.setConnectionState("degraded"), this.heartbeatFailoverTimer = setTimeout(() => {
        !this.running || this.diagnosticsState.failoverTriggered || this.diagnosticsState.connectionState === "degraded" && this.enterFailover("heartbeat_timeout");
      }, r));
    }, r));
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
    const r = this.computeReconnectDelay(this.reconnectAttempt);
    await new Promise((e) => {
      this.clearReconnectTimer(), this.reconnectWaiterResolve = () => {
        this.reconnectWaiterResolve = null, e();
      }, this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null, this.reconnectWaiterResolve?.();
      }, r);
    });
  }
  clearReconnectTimer() {
    if (this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.reconnectWaiterResolve) {
      const r = this.reconnectWaiterResolve;
      this.reconnectWaiterResolve = null, r();
    }
  }
  setConnectionState(r) {
    this.diagnosticsState.connectionState !== r && (this.diagnosticsState.connectionState = r, this.options.onConnectionStateChange?.(r, this.getDiagnostics()));
  }
  enterFailover(r) {
    this.diagnosticsState.failoverTriggered || (this.running = !1, this.diagnosticsState.failoverTriggered = !0, this.diagnosticsState.failoverReason = r, this.clearReconnectTimer(), this.clearHeartbeatTimers(), this.controller?.abort(), this.controller = null, this.setConnectionState("failed"), this.options.onFailover?.(r, this.getDiagnostics()));
  }
  async resolveHeaders() {
    const r = new Headers();
    r.set("Accept", "text/event-stream");
    try {
      const e = await this.options.getHeaders?.();
      return de(r, e), r;
    } catch {
      throw this.enterFailover("auth_failed"), new Error("auth_failed");
    }
  }
  buildRequestURL(r) {
    const e = typeof globalThis.location?.href == "string" && globalThis.location.href !== "" ? globalThis.location.href : "http://localhost", t = new URL(this.options.url, e);
    return r && this.diagnosticsState.lastEventId && t.searchParams.set("cursor", this.diagnosticsState.lastEventId), this.options.enableClientTuning && (typeof this.options.heartbeatMs == "number" && this.options.heartbeatMs > 0 && t.searchParams.set("heartbeat_ms", String(this.options.heartbeatMs)), typeof this.options.retryMs == "number" && this.options.retryMs > 0 && t.searchParams.set("retry_ms", String(this.options.retryMs))), t.toString();
  }
  computeReconnectDelay(r) {
    const e = this.resolveRetryMs(), t = Math.min(e * 2 ** Math.max(0, r - 1), oe), n = t * ce * Math.random();
    return Math.round(t + n);
  }
  resolveRetryMs() {
    return typeof this.serverRetryMs == "number" && this.serverRetryMs > 0 ? this.serverRetryMs : typeof this.options.retryMs == "number" && this.options.retryMs > 0 ? this.options.retryMs : ae;
  }
  resolveHeartbeatTimeoutMs() {
    return typeof this.options.heartbeatTimeoutMs == "number" && this.options.heartbeatTimeoutMs > 0 ? this.options.heartbeatTimeoutMs : typeof this.options.heartbeatMs == "number" && this.options.heartbeatMs > 0 ? Math.max(this.options.heartbeatMs * 2, $) : $;
  }
  resolveMaxReconnectAttempts() {
    return typeof this.options.maxReconnectAttempts == "number" && this.options.maxReconnectAttempts >= 0 ? this.options.maxReconnectAttempts : se;
  }
};
function de(r, e) {
  if (e) {
    if (e instanceof Headers) {
      e.forEach((t, n) => {
        r.set(n, t);
      });
      return;
    }
    if (Array.isArray(e)) {
      for (const [t, n] of e)
        r.set(t, n);
      return;
    }
    for (const [t, n] of Object.entries(e))
      r.set(t, n);
  }
}
function ue(r) {
  const e = r.replace(/\r\n/g, `
`), t = e.split(`

`);
  return t.length === 1 ? { frames: [], remainder: e } : {
    frames: t.slice(0, -1),
    remainder: t[t.length - 1] ?? ""
  };
}
function me(r) {
  const e = r.split(`
`), t = [];
  let n = null, i = "message", a = null;
  for (const s of e) {
    if (s === "" || s.startsWith(":"))
      continue;
    const c = s.indexOf(":"), l = c === -1 ? s : s.slice(0, c), d = c === -1 ? "" : s.slice(c + 1).replace(/^ /, "");
    switch (l) {
      case "id":
        n = d;
        break;
      case "event":
        i = d || "message";
        break;
      case "data":
        t.push(d);
        break;
      case "retry": {
        const u = Number.parseInt(d, 10);
        a = Number.isNaN(u) ? null : u;
        break;
      }
    }
  }
  return t.length === 0 && n === null && a === null && i === "message" ? null : {
    id: n,
    event: i,
    data: t.join(`
`),
    retry: a
  };
}
function pe(r) {
  if (r === "")
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return r;
  }
}
function ge(r) {
  return r instanceof Error && r.name === "AbortError";
}
function fe(r) {
  return new le(r);
}
var he = fe;
const ve = he;
function ye(r) {
  if (!r || typeof r != "object")
    return null;
  const e = r;
  if (String(e.type || "").trim() !== "esign.agreement.changed" || String(e.resource_type || "").trim() !== "esign_agreement")
    return null;
  const t = String(e.resource_id || "").trim();
  if (!t)
    return null;
  const n = Array.isArray(e.sections) ? e.sections.map((i) => String(i || "").trim()).filter(Boolean) : [];
  return {
    type: "esign.agreement.changed",
    resource_type: "esign_agreement",
    resource_id: t,
    tenant_id: String(e.tenant_id || "").trim() || void 0,
    org_id: String(e.org_id || "").trim() || void 0,
    correlation_id: String(e.correlation_id || "").trim() || void 0,
    sections: n,
    occurred_at: String(e.occurred_at || "").trim(),
    status: String(e.status || "").trim(),
    message: String(e.message || "").trim() || void 0,
    metadata: e.metadata && typeof e.metadata == "object" ? e.metadata : void 0
  };
}
class we {
  constructor(e) {
    this.listeners = /* @__PURE__ */ new Set(), this.client = ve({
      url: e,
      onEvent: (t) => {
        const n = ye(t.payload);
        n && this.emit({
          type: n.type,
          resourceType: n.resource_type,
          resourceId: n.resource_id,
          tenantId: n.tenant_id,
          orgId: n.org_id,
          correlationId: n.correlation_id,
          sections: n.sections,
          status: n.status,
          message: n.message,
          metadata: n.metadata
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
}
const V = {
  completedClearDelay: 3e3,
  failedClearDelay: 8e3,
  usePageFallback: !0
}, N = {
  review_status: "#agreement-review-status-panel [data-live-status-target]",
  review_config: "#agreement-review-configuration-panel [data-live-status-target]",
  participants: "#review-participants-panel [data-live-status-target]",
  comments: "#review-comment-threads-panel [data-live-status-target]",
  delivery: "#agreement-delivery-panel [data-live-status-target]",
  artifacts: "#agreement-artifacts-panel [data-live-status-target]",
  timeline: "#agreement-timeline [data-live-status-target]"
}, be = {
  review_status: "#agreement-review-status-panel",
  review_config: "#agreement-review-configuration-panel",
  participants: "#review-participants-panel",
  comments: "#review-comment-threads-panel",
  delivery: "#agreement-delivery-panel",
  artifacts: "#agreement-artifacts-panel",
  timeline: "#agreement-timeline"
}, _e = "#agreement-page-status-target", k = {
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
}, P = {
  // Review reminder commands
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
  // Approval commands
  approve_review_participant_on_behalf: {
    submitting: "Approving...",
    completed: "Approved"
  },
  force_approve_review: {
    submitting: "Force approving...",
    completed: "Force approved"
  },
  // Comment commands
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
  // Delivery commands
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
  // Artifact commands
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
function G(r, e, t) {
  const n = String(r || "").toLowerCase().trim(), i = (u) => {
    if (u)
      switch (e) {
        case "submitting":
          return u.submitting;
        case "accepted":
          return u.accepted;
        case "completed":
          return u.completed;
        case "failed":
          return u.failed;
        case "stale":
          return u.stale;
        case "retry_scheduled":
          return u.retry_scheduled;
        default:
          return;
      }
  }, a = P[n], s = i(a);
  if (s)
    return s;
  const c = n.split(".").pop() || "", l = P[c], d = i(l);
  return d || t || k[e]?.text || "";
}
const J = {
  spinner: '<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>',
  check: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
  error: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
  clock: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
  refresh: '<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>',
  retry: '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>'
};
function Se(r, e, t = V) {
  const n = {
    target: null,
    section: null,
    participantId: e || null
  };
  if (e) {
    const a = document.querySelector(
      `[data-participant-id="${e}"][data-review-participant-card]`
    );
    if (a) {
      const s = a.querySelector("[data-live-status-target]");
      return s ? (n.target = s, n.section = "participants", n) : (n.target = a, n.section = "participants", n);
    }
  }
  const i = r;
  if (i && N[i]) {
    const a = document.querySelector(
      N[i]
    );
    if (a)
      return n.target = a, n.section = i, n;
    const s = document.querySelector(
      be[i]
    );
    if (s) {
      const c = s.querySelector(
        "[data-live-status-target], .flex.items-center.justify-between"
      );
      if (c)
        return n.target = c, n.section = i, n;
    }
  }
  if (t.usePageFallback) {
    const a = document.querySelector(_e);
    if (a)
      return n.target = a, n;
  }
  return n;
}
function xe(r) {
  const e = String(r || "").toLowerCase();
  return e.includes("review") || e.includes("approve") || e.includes("request_changes") || e.includes("force_approve") ? "review_status" : e.includes("participant") || e.includes("notify_reviewer") || e.includes("reminder") || e.includes("on_behalf") ? "participants" : e.includes("comment") || e.includes("thread") || e.includes("reply") ? "comments" : e.includes("resend") || e.includes("delivery") || e.includes("email") || e.includes("send") ? "delivery" : e.includes("artifact") || e.includes("job") || e.includes("retry_job") || e.includes("retry_artifact") ? "artifacts" : null;
}
function Ee(r, e) {
  const t = k[r.state], n = r.message || G(r.commandName, r.state, t.text), i = document.createElement("span"), a = t.pulse ? "inline-status-pulse" : "";
  i.className = `inline-status inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${t.colorClass} ${a}`.trim(), i.setAttribute("data-inline-status", e), i.setAttribute("data-status-state", r.state), i.setAttribute("data-command-name", r.commandName || ""), i.setAttribute("role", "status"), i.setAttribute("aria-live", t.ariaLive);
  const s = J[t.icon] || "";
  return i.innerHTML = `${s}<span class="inline-status-text">${v(n)}</span>`, i;
}
function Ae(r, e) {
  const t = k[e.state], n = e.message || G(e.commandName, e.state, t.text);
  r.setAttribute("data-status-state", e.state), r.setAttribute("data-command-name", e.commandName || ""), r.setAttribute("aria-live", t.ariaLive);
  const i = t.pulse ? "inline-status-pulse" : "";
  r.className = `inline-status inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${t.colorClass} ${i}`.trim();
  const a = J[t.icon] || "";
  r.innerHTML = `${a}<span class="inline-status-text">${v(n)}</span>`;
}
function Te(r) {
  const e = document.querySelector(`[data-inline-status="${r}"]`);
  e && e.remove();
}
function Re() {
  document.querySelectorAll("[data-inline-status]").forEach((r) => r.remove());
}
function Ce(r = 5e3) {
  const e = Date.now();
  document.querySelectorAll("[data-inline-status]").forEach((t) => {
    const n = t.getAttribute("data-status-state"), i = parseInt(t.getAttribute("data-status-timestamp") || "0", 10);
    (n === "completed" || n === "failed") && i > 0 && e - i > r && t.remove();
  });
}
class ke {
  constructor(e = {}) {
    this.clearTimers = /* @__PURE__ */ new Map(), this.config = { ...V, ...e };
  }
  /**
   * Handle a status change event from the command runtime
   */
  handleStatusChange(e) {
    const { entry: t } = e;
    this.clearTimer(t.correlationId);
    const n = t.section || xe(t.commandName), { target: i } = Se(n, t.participantId, this.config);
    if (!i)
      return;
    const a = document.querySelector(
      `[data-inline-status="${t.correlationId}"]`
    );
    if (a)
      Ae(a, t);
    else {
      const s = Ee(t, t.correlationId);
      s.setAttribute("data-status-timestamp", String(t.timestamp)), this.insertStatusElement(i, s);
    }
    t.state === "completed" && this.config.completedClearDelay > 0 ? this.scheduleRemoval(t.correlationId, this.config.completedClearDelay) : t.state === "failed" && this.config.failedClearDelay > 0 && this.scheduleRemoval(t.correlationId, this.config.failedClearDelay);
  }
  /**
   * Clear all statuses and timers
   */
  clear() {
    this.clearTimers.forEach((e) => clearTimeout(e)), this.clearTimers.clear(), Re();
  }
  /**
   * Clear completed/failed statuses that may have lingered
   */
  clearTerminalStatuses() {
    document.querySelectorAll("[data-inline-status]").forEach((e) => {
      const t = e.getAttribute("data-status-state");
      (t === "completed" || t === "failed") && e.remove();
    });
  }
  /**
   * Called after a fragment refresh to clean up stale statuses
   */
  reconcileAfterRefresh() {
    this.clearTerminalStatuses(), Ce(1e3);
  }
  insertStatusElement(e, t) {
    const n = e.querySelector("[data-live-status-insert]");
    if (n) {
      n.appendChild(t);
      return;
    }
    const i = e.querySelectorAll(".inline-flex.items-center.rounded-full");
    if (i.length > 0) {
      const a = i[0];
      a.parentElement?.insertBefore(t, a);
      return;
    }
    e.appendChild(t);
  }
  scheduleRemoval(e, t) {
    this.clearTimer(e);
    const n = setTimeout(() => {
      Te(e), this.clearTimers.delete(e);
    }, t);
    this.clearTimers.set(e, n);
  }
  clearTimer(e) {
    const t = this.clearTimers.get(e);
    t && (clearTimeout(t), this.clearTimers.delete(e));
  }
}
function Me(r) {
  return new ke(r);
}
const H = {
  green: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  red: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  orange: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  gray: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" }
}, Le = {
  label: "Event",
  icon: "info-circle",
  color: "gray",
  category: "system",
  priority: 4,
  groupable: !0
};
function o(r, e, t, n, i, a = !1) {
  return { label: r, icon: e, color: t, category: n, priority: i, groupable: a };
}
const S = {
  // ===== Agreement Lifecycle (Priority 1-2) =====
  "agreement.created": o("Agreement Created", "plus", "green", "lifecycle", 1),
  "agreement.updated": o("Agreement Updated", "edit-pencil", "blue", "lifecycle", 3, !0),
  "agreement.sent": o("Sent for Signature", "send", "blue", "lifecycle", 1),
  "agreement.resent": o("Invitation Resent", "refresh", "yellow", "lifecycle", 2),
  "agreement.voided": o("Agreement Voided", "cancel", "red", "lifecycle", 1),
  "agreement.declined": o("Agreement Declined", "xmark", "orange", "lifecycle", 1),
  "agreement.expired": o("Agreement Expired", "clock", "purple", "lifecycle", 1),
  "agreement.completed": o("Agreement Completed", "check-circle", "green", "lifecycle", 1),
  // ===== Review Lifecycle (Priority 1-3) =====
  "agreement.review_requested": o("Review Requested", "eye", "indigo", "review", 1),
  "agreement.review_approved": o("Review Approved", "check-circle", "green", "review", 1),
  "agreement.review_changes_requested": o("Changes Requested", "edit-pencil", "orange", "review", 2),
  "agreement.review_viewed": o("Reviewed Document", "eye", "purple", "review", 4, !0),
  "agreement.review_notified": o("Reviewers Notified", "bell", "blue", "review", 3, !0),
  "agreement.review_notification_failed": o("Review Notification Failed", "warning-triangle", "red", "review", 2),
  "agreement.review_reminders_paused": o("Reminders Paused", "pause", "yellow", "review", 3),
  "agreement.review_reminders_resumed": o("Reminders Resumed", "play", "green", "review", 3),
  "agreement.review_closed": o("Review Closed", "check", "gray", "review", 2),
  "agreement.review_reopened": o("Review Reopened", "refresh", "indigo", "review", 2),
  "agreement.review_force_approved": o("Review Force Approved", "shield-check", "orange", "review", 2),
  "agreement.review_participant_approved_on_behalf": o("Approved on Behalf", "shield-check", "orange", "review", 2),
  // ===== Comment Thread Lifecycle (Priority 2-3) =====
  "agreement.comment_thread_created": o("Comment Added", "chat", "blue", "comment", 2),
  "agreement.comment_replied": o("Reply Added", "chat", "blue", "comment", 3, !0),
  "agreement.comment_resolved": o("Comment Resolved", "check", "green", "comment", 2),
  "agreement.comment_reopened": o("Comment Reopened", "refresh", "orange", "comment", 2),
  // ===== Participant & Recipient Mutations (Priority 3-4) =====
  "agreement.participant_upserted": o("Participant Updated", "user", "blue", "participant", 4, !0),
  "agreement.participant_deleted": o("Participant Removed", "user-minus", "red", "participant", 4, !0),
  "agreement.recipient_upserted": o("Recipient Updated", "user", "blue", "participant", 4, !0),
  "agreement.recipient_removed": o("Recipient Removed", "user-minus", "red", "participant", 4, !0),
  "recipient.added": o("Recipient Added", "user-plus", "green", "participant", 3),
  "recipient.removed": o("Recipient Removed", "user-minus", "red", "participant", 3),
  "recipient.updated": o("Recipient Updated", "user", "blue", "participant", 4, !0),
  // ===== Recipient Actions (Priority 1-2) =====
  "recipient.viewed": o("Document Viewed", "eye", "purple", "lifecycle", 2),
  "recipient.signed": o("Signed", "edit", "green", "lifecycle", 1),
  "recipient.declined": o("Declined to Sign", "xmark", "orange", "lifecycle", 1),
  "recipient.consent": o("Consent Given", "check", "blue", "lifecycle", 2),
  "recipient.submitted": o("Signature Submitted", "check-circle", "green", "lifecycle", 1),
  "signer.viewed": o("Document Viewed", "eye", "purple", "lifecycle", 2),
  "signer.submitted": o("Signature Submitted", "check-circle", "green", "lifecycle", 1),
  "signer.declined": o("Declined to Sign", "xmark", "orange", "lifecycle", 1),
  "signer.consent": o("Consent Given", "check", "blue", "lifecycle", 2),
  "signer.consent_captured": o("Consent Given", "check", "blue", "lifecycle", 2),
  "signer.signature_attached": o("Signature Attached", "edit", "blue", "lifecycle", 2),
  "signer.assets.asset_opened": o("Opened Document", "document", "purple", "lifecycle", 4, !0),
  "signer.assets.contract_viewed": o("Viewed Contract", "eye", "purple", "lifecycle", 4, !0),
  // ===== Field Definitions & Instances (Priority 4-5) =====
  "agreement.field_definition_upserted": o("Field Definition Updated", "document", "gray", "field", 5, !0),
  "agreement.field_definition_deleted": o("Field Definition Removed", "trash", "gray", "field", 5, !0),
  "agreement.field_instance_upserted": o("Field Placement Updated", "document", "gray", "field", 5, !0),
  "agreement.field_instance_deleted": o("Field Placement Removed", "trash", "gray", "field", 5, !0),
  "agreement.field_upserted": o("Field Updated", "edit-pencil", "gray", "field", 5, !0),
  "agreement.field_deleted": o("Field Removed", "trash", "gray", "field", 5, !0),
  "field.created": o("Field Added", "plus", "gray", "field", 4, !0),
  "field.updated": o("Field Updated", "edit-pencil", "gray", "field", 4, !0),
  "field.deleted": o("Field Removed", "trash", "gray", "field", 4, !0),
  // ===== Signer Field Values (Priority 2-3) =====
  "signer.field_value_upserted": o("Field Value Set", "edit-pencil", "blue", "field", 3, !0),
  "field_value.updated": o("Field Value Set", "edit-pencil", "blue", "field", 3, !0),
  // ===== Signature Artifacts (Priority 2) =====
  "signature.attached": o("Signature Attached", "edit", "blue", "lifecycle", 2),
  "artifact.generated": o("Artifact Generated", "document", "green", "delivery", 2),
  "artifact.executed_generated": o("Executed PDF Generated", "document", "green", "delivery", 2),
  "artifact.certificate_generated": o("Certificate Generated", "document", "green", "delivery", 2),
  "artifact.render_executed": o("Rendered Executed PDF", "document", "gray", "delivery", 5, !0),
  "artifact.pages_rendered": o("Rendered Preview Pages", "document", "gray", "delivery", 5, !0),
  // ===== Token Events (Priority 4-5) =====
  "token.rotated": o("Token Rotated", "refresh", "yellow", "system", 4, !0),
  "token.revoked": o("Token Revoked", "lock", "red", "system", 3),
  "token.created": o("Token Created", "key", "blue", "system", 4, !0),
  // ===== Delivery Events (Priority 2-4) =====
  "delivery.executed_generated": o("Executed PDF Generated", "document", "green", "delivery", 2),
  "delivery.certificate_generated": o("Certificate Generated", "document", "green", "delivery", 2),
  "delivery.executed_delivered": o("Executed PDF Delivered", "check", "green", "delivery", 2),
  "delivery.certificate_delivered": o("Certificate Delivered", "check", "green", "delivery", 2),
  "delivery.notification_sent": o("Notification Sent", "mail", "blue", "delivery", 3, !0),
  "delivery.notification_failed": o("Notification Failed", "warning-triangle", "red", "delivery", 2),
  "agreement.notification_delivered": o("Notification Delivered", "mail", "green", "delivery", 4, !0),
  "agreement.notification_delivery_resumed": o("Notification Delivery Resumed", "play", "blue", "delivery", 3),
  "agreement.send_notification_failed": o("Send Notification Failed", "warning-triangle", "red", "delivery", 2),
  "agreement.resend_notification_failed": o("Resend Notification Failed", "warning-triangle", "red", "delivery", 2),
  // ===== Email Events (Priority 3-4) =====
  "email.sent": o("Email Sent", "mail", "blue", "delivery", 3, !0),
  "email.failed": o("Email Failed", "warning-triangle", "red", "delivery", 2),
  "email.delivered": o("Email Delivered", "check", "green", "delivery", 4, !0),
  "email.opened": o("Email Opened", "eye", "purple", "delivery", 4, !0),
  "email.bounced": o("Email Bounced", "warning-triangle", "red", "delivery", 2),
  // ===== Placement / System Workflow (Priority 5) =====
  "agreement.placement_run_created": o("Placement Run Created", "cog", "gray", "system", 5, !0),
  "agreement.placement_run_applied": o("Placement Run Applied", "cog", "gray", "system", 5, !0),
  "agreement.send": o("Sending Agreement", "send", "blue", "lifecycle", 2),
  "agreement.send_degraded_preview": o("Sent with Degraded Preview", "warning-triangle", "yellow", "delivery", 3),
  "agreement.incomplete": o("Agreement Incomplete", "warning-triangle", "orange", "lifecycle", 2),
  "signer.stage_activation_workflow_failed": o("Signer Activation Failed", "warning-triangle", "red", "system", 2),
  "signer.completion_workflow_failed": o("Signer Completion Failed", "warning-triangle", "red", "system", 2),
  // ===== Legacy/Compatibility Event Names =====
  // These map older event formats to canonical display configs
  agreement_created: o("Agreement Created", "plus", "green", "lifecycle", 1),
  agreement_sent: o("Sent for Signature", "send", "blue", "lifecycle", 1),
  agreement_completed: o("Agreement Completed", "check-circle", "green", "lifecycle", 1),
  agreement_voided: o("Agreement Voided", "cancel", "red", "lifecycle", 1),
  agreement_declined: o("Agreement Declined", "xmark", "orange", "lifecycle", 1),
  agreement_expired: o("Agreement Expired", "clock", "purple", "lifecycle", 1)
}, De = {
  // Underscore to dot conversions
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
  // Space-separated (unlikely but defensive)
  "agreement created": "agreement.created",
  "agreement sent": "agreement.sent",
  "agreement completed": "agreement.completed"
};
function x(r) {
  const e = String(r || "").trim().toLowerCase();
  return De[e] || e;
}
function w(r) {
  const e = x(r);
  if (S[e])
    return S[e];
  if (S[r])
    return S[r];
  const t = Ie(r);
  return {
    ...Le,
    label: t
  };
}
function Ie(r) {
  const e = String(r || "").trim();
  return e && e.replace(/[._]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (t) => t.toUpperCase()).trim() || "Event";
}
function W(r) {
  return H[r] || H.gray;
}
function St(r) {
  return w(r).priority <= 3;
}
function xt(r) {
  return w(r).groupable;
}
const M = 3, Be = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, $e = /^[0-9a-f]{24,32}$/i, Ne = /* @__PURE__ */ new Set([
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
]), Pe = [
  "status",
  "result",
  "guard_policy",
  "effect_status",
  "notification_status",
  "decision_status",
  "state",
  "outcome"
], He = /* @__PURE__ */ new Set([
  "participant_id",
  "recipient_id",
  "signer_id",
  "field_definition_id",
  "field_id",
  "review_id",
  "thread_id",
  "reviewer_id",
  "actor_id"
]), Fe = {
  user: "Sender",
  sender: "Sender",
  reviewer: "Reviewer",
  external: "External Reviewer",
  recipient: "Signer",
  signer: "Signer",
  system: "System",
  admin: "Admin",
  automation: "Automation"
}, qe = {
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
function g(r) {
  if (!r || typeof r != "string")
    return !1;
  const e = r.trim();
  return Be.test(e) || $e.test(e);
}
function b(r, e) {
  const t = String(r || "").trim(), n = String(e || "").trim();
  return !t || !n ? "" : `${t}:${n}`;
}
function L(r) {
  const e = String(r || "").trim().toLowerCase();
  return Fe[e] || (e ? e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase()) : "Participant");
}
function K(r) {
  const e = String(r || "").trim().toLowerCase();
  return qe[e] || "#64748b";
}
function Y(r, e = "P") {
  const t = String(r || "").trim();
  return t ? t.split(/\s+/).map((i) => i[0] || "").join("").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 2) || String(e || "P").trim().slice(0, 2).toUpperCase() || "P" : String(e || "P").trim().slice(0, 2).toUpperCase() || "P";
}
function F(r) {
  return {
    actors: r.actors || {},
    participants: r.participants || [],
    fieldDefinitions: r.field_definitions || [],
    currentUserId: r.current_user_id
  };
}
function D(r, e) {
  if (!e)
    return null;
  const t = String(e).trim();
  return r.participants.find((n) => {
    const i = String(n.id || "").trim(), a = String(n.recipient_id || "").trim();
    return i === t || a === t;
  }) || null;
}
function X(r, e) {
  if (!e)
    return null;
  const t = String(e).trim();
  return r.fieldDefinitions.find((n) => String(n.id || "").trim() === t) || null;
}
function Ue(r, e) {
  const t = String(e.actor_type || "").trim(), n = String(e.actor_id || "").trim(), i = [];
  t === "recipient" || t === "signer" ? i.push(b("recipient", n), b("signer", n)) : t === "user" || t === "sender" ? i.push(b("user", n), b("sender", n)) : t === "reviewer" || t === "external" ? i.push(b("reviewer", n), b("external", n)) : i.push(b(t, n));
  const a = i.map((A) => r.actors[A]).find(Boolean) || {}, s = String(a.display_name || a.name || "").trim(), c = String(a.email || "").trim(), l = D(r, n), d = l ? String(l.display_name || l.name || "").trim() : "", u = l ? String(l.email || "").trim() : "", m = r.currentUserId && n === r.currentUserId, f = L(a.role || a.actor_type || t);
  let h = "";
  s && !g(s) ? h = s : c && !g(c) ? h = c : d && !g(d) ? h = d : u && !g(u) ? h = u : m ? h = "You" : f ? h = f : h = "Unknown User";
  const p = String(a.role || a.actor_type || t || "participant").trim() || "participant", y = String(a.actor_type || t).trim();
  return {
    name: h,
    role: p,
    actor_type: y,
    email: c || u || void 0,
    initials: Y(h, f),
    color: K(y)
  };
}
function ze(r) {
  const e = r.toLowerCase();
  return !!(Ne.has(e) || e.startsWith("_"));
}
function Oe(r) {
  const e = r.toLowerCase();
  return Pe.some((t) => e.includes(t));
}
function I(r) {
  return r.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function je(r, e, t) {
  if (t == null)
    return { displayValue: "-", isResolved: !1 };
  if (typeof t == "object")
    return { displayValue: "[Complex Data]", isResolved: !1 };
  const n = String(t).trim();
  if (He.has(e.toLowerCase())) {
    if (e.toLowerCase().includes("participant") || e.toLowerCase().includes("recipient") || e.toLowerCase().includes("signer")) {
      const i = D(r, n);
      if (i) {
        const a = String(i.display_name || i.name || "").trim(), s = String(i.email || "").trim();
        if (a && !g(a))
          return { displayValue: a, isResolved: !0 };
        if (s && !g(s))
          return { displayValue: s, isResolved: !0 };
      }
    }
    if (e.toLowerCase().includes("field")) {
      const i = X(r, n);
      if (i) {
        const a = String(i.label || "").trim(), s = String(i.type || "").trim();
        if (a && !g(a))
          return { displayValue: a, isResolved: !0 };
        if (s && !g(s))
          return { displayValue: `${I(s)} Field`, isResolved: !0 };
      }
    }
    if (g(n))
      return { displayValue: "", isResolved: !1 };
  }
  return g(n) ? { displayValue: "", isResolved: !1 } : { displayValue: n, isResolved: !1 };
}
function Ve(r, e) {
  const t = e.metadata || {}, n = [];
  for (const [i, a] of Object.entries(t)) {
    if (ze(i))
      continue;
    const { displayValue: s, isResolved: c } = je(r, i, a);
    s && n.push({
      key: i,
      displayKey: I(i),
      value: a,
      displayValue: s,
      isBadge: Oe(i),
      isHidden: !1
    });
  }
  return n;
}
function Et(r, e) {
  const t = X(r, e);
  if (!t)
    return null;
  const n = String(t.label || "").trim();
  if (n && !g(n))
    return n;
  const i = String(t.type || "").trim();
  return i && !g(i) ? I(i) + " Field" : null;
}
function At(r, e) {
  const t = D(r, e);
  if (!t)
    return null;
  const n = String(t.display_name || t.name || "").trim();
  if (n && !g(n))
    return n;
  const i = String(t.email || "").trim();
  return i && !g(i) ? i : null;
}
const Ge = 5 * 60 * 1e3, Je = 20;
function We(r, e = !1) {
  return [...r].sort((t, n) => {
    const i = new Date(t.created_at || 0).getTime(), a = new Date(n.created_at || 0).getTime();
    return e ? i - a : a - i;
  });
}
function Ke(r, e) {
  const t = x(r.event_type), n = x(e.event_type);
  if (t !== n || !w(t).groupable)
    return !1;
  const a = new Date(r.created_at || 0).getTime(), s = new Date(e.created_at || 0).getTime();
  return !(Math.abs(a - s) > Ge);
}
function Ye(r, e) {
  return e === "all" ? !0 : w(r.event_type).priority <= M;
}
function Xe(r, e) {
  const t = [];
  let n = [], i = "";
  const a = () => {
    if (n.length !== 0) {
      if (n.length === 1) {
        const s = n[0];
        t.push({
          type: "event",
          event: s,
          config: w(s.event_type)
        });
      } else {
        const s = w(i), c = {
          events: [...n],
          config: s,
          eventType: i,
          startTime: n[n.length - 1].created_at,
          endTime: n[0].created_at,
          isExpanded: !1
        };
        t.push({
          type: "group",
          group: c,
          config: s
        });
      }
      n = [], i = "";
    }
  };
  for (const s of r) {
    if (!Ye(s, e))
      continue;
    const c = x(s.event_type), l = w(c);
    if (!l.groupable) {
      a(), t.push({
        type: "event",
        event: s,
        config: l
      });
      continue;
    }
    if (e === "condensed" && l.priority < M) {
      a(), t.push({
        type: "event",
        event: s,
        config: l
      });
      continue;
    }
    n.length === 0 ? (n.push(s), i = c) : i === c && n.length < Je && Ke(n[n.length - 1], s) ? n.push(s) : (a(), n.push(s), i = c);
  }
  return a(), t;
}
function Ze(r, e) {
  const t = We(r, !1), n = Xe(t, e);
  let i = 0, a = 0, s = 0;
  for (const l of n)
    l.type === "event" ? i++ : l.type === "group" && l.group && (a++, s += l.group.events.length, i += l.group.events.length);
  const c = t.length - i;
  return {
    items: n,
    stats: {
      totalEvents: r.length,
      visibleEvents: i,
      hiddenEvents: c,
      groupCount: a,
      groupedEventCount: s
    }
  };
}
function Qe(r) {
  const e = /* @__PURE__ */ new Date(), t = new Date(e);
  return t.setDate(t.getDate() - 1), r.toDateString() === e.toDateString() ? "Today" : r.toDateString() === t.toDateString() ? "Yesterday" : r.toLocaleDateString(void 0, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}
function et(r) {
  const e = /* @__PURE__ */ new Map();
  for (const t of r) {
    let n;
    if (t.type === "event" && t.event)
      n = t.event.created_at;
    else if (t.type === "group" && t.group)
      n = t.group.endTime;
    else
      continue;
    const i = new Date(n), a = i.toLocaleDateString();
    e.has(a) || e.set(a, {
      dateKey: a,
      dateLabel: Qe(i),
      items: []
    }), e.get(a).items.push(t);
  }
  return Array.from(e.values());
}
function Tt(r) {
  return r.filter((e) => w(e.event_type).priority > M).length;
}
function E(r) {
  if (!r)
    return "-";
  try {
    const e = new Date(r);
    return e.toLocaleDateString() + " at " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return r;
  }
}
function B(r) {
  if (!r)
    return "";
  try {
    const e = new Date(r), n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), i = Math.floor(n / 6e4), a = Math.floor(n / 36e5), s = Math.floor(n / 864e5);
    return i < 1 ? "just now" : i < 60 ? `${i}m ago` : a < 24 ? `${a}h ago` : s < 7 ? `${s}d ago` : E(r);
  } catch {
    return r;
  }
}
function tt(r) {
  const e = v(r.displayKey), t = v(r.displayValue);
  return r.isBadge ? `
      <div class="flex items-center gap-1.5">
        <span class="text-gray-500">${e}:</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">${t}</span>
      </div>
    ` : `
    <div>
      <span class="text-gray-500">${e}:</span>
      <span class="font-medium">${t}</span>
    </div>
  `;
}
function rt(r, e) {
  const t = Ve(e, r);
  if (t.length === 0)
    return "";
  const n = v(r.id), i = t.map(tt).join("");
  return `
    <button type="button" class="timeline-meta-toggle mt-2 text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
            aria-expanded="false" data-event-id="${n}">
      <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      Details
    </button>
    <div class="timeline-meta-content hidden mt-2 text-xs bg-gray-50 rounded p-2 space-y-1" data-event-content="${n}">
      ${i}
    </div>
  `;
}
function Z(r, e, t = !1) {
  const n = w(r.event_type), i = W(n.color), a = Ue(e, r), s = B(r.created_at), c = E(r.created_at), l = rt(r, e), d = v(r.id), u = v(a.name), m = v(n.label);
  return `
    <div class="timeline-entry relative pl-8 pb-6 ${t ? "last:pb-0" : ""}" role="listitem" data-event-id="${d}">
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${i.dot} ring-4 ring-white" aria-hidden="true"></div>
      <div class="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 ${t ? "hidden" : ""}" aria-hidden="true"></div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${i.bg} ${i.text}">
                ${m}
              </span>
            </div>
            <div class="text-sm text-gray-700">
              <span class="font-medium">${u}</span>
            </div>
            ${l}
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs text-gray-500" title="${v(c)}">${v(s)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function nt(r, e) {
  const t = r.config, n = W(t.color), i = r.events.length, a = B(r.endTime), s = E(r.endTime), c = v(t.label), l = `group-${r.events[0]?.id || Date.now()}`;
  return `
    <div class="timeline-group relative pl-8 pb-6" role="listitem" data-group-id="${l}">
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${n.dot} ring-4 ring-white" aria-hidden="true"></div>
      <div class="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200" aria-hidden="true"></div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${n.bg} ${n.text}">
                ${c}
              </span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                ${i} events
              </span>
            </div>
            <button type="button" class="timeline-group-toggle text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mt-1"
                    aria-expanded="false" data-group-id="${l}">
              <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
              Show details
            </button>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs text-gray-500" title="${v(s)}">${v(a)}</div>
          </div>
        </div>
        <div class="timeline-group-content hidden mt-3 pt-3 border-t border-gray-100" data-group-content="${l}">
          <!-- Group events will be rendered here when expanded -->
        </div>
      </div>
    </div>
  `;
}
function it(r, e, t = !1) {
  return r.type === "event" && r.event ? Z(r.event, e, t) : r.type === "group" && r.group ? nt(r.group) : "";
}
function at(r, e) {
  const t = r.items.map((n, i) => it(n, e, i === r.items.length - 1)).join("");
  return `
    <div class="mb-6">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-8">${v(r.dateLabel)}</div>
      ${t}
    </div>
  `;
}
function q() {
  return `
    <div class="text-center py-8 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="font-medium">No activity yet</p>
      <p class="text-sm">Timeline events will appear here as the agreement progresses.</p>
    </div>
  `;
}
function st(r) {
  return `
    <div class="text-center py-8 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <p class="font-medium">All current activity is hidden in condensed view.</p>
      <p class="text-sm">${r} ${r === 1 ? "event is" : "events are"} available in all activity.</p>
    </div>
  `;
}
function ot() {
  return `
    <div class="timeline-loading flex items-center justify-center gap-3 py-8 text-gray-500">
      <div class="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      <span>Loading timeline...</span>
    </div>
  `;
}
function U(r, e) {
  return r <= 0 || e === "all" ? "" : `
    <div class="timeline-hidden-notice text-center py-3 text-sm text-gray-500 border-t border-gray-100 mt-4">
      <span>${r} system ${r === 1 ? "event" : "events"} hidden.</span>
      <button type="button" class="timeline-show-all-btn ml-1 text-blue-600 hover:text-blue-800 font-medium">
        Show all activity
      </button>
    </div>
  `;
}
function ct(r) {
  const e = r === "condensed";
  return `
    <div class="timeline-view-toggle flex items-center gap-2 text-sm">
      <button type="button" class="timeline-mode-btn px-2 py-1 rounded ${e ? "bg-gray-100 font-medium" : "text-gray-500 hover:text-gray-700"}" data-mode="condensed">
        Condensed
      </button>
      <button type="button" class="timeline-mode-btn px-2 py-1 rounded ${e ? "text-gray-500 hover:text-gray-700" : "bg-gray-100 font-medium"}" data-mode="all">
        All Activity
      </button>
    </div>
  `;
}
function lt(r, e, t, n) {
  if (t.totalEvents === 0)
    return q();
  if (t.visibleEvents === 0)
    return t.hiddenEvents > 0 && n === "condensed" ? `
        ${st(t.hiddenEvents)}
        ${U(t.hiddenEvents, n)}
      ` : q();
  const i = r.map((s) => at(s, e)).join(""), a = U(t.hiddenEvents, n);
  return `
    <div class="relative">
      ${i}
    </div>
    ${a}
  `;
}
function Q(r) {
  r.querySelectorAll(".timeline-meta-toggle").forEach((e) => {
    e.addEventListener("click", () => {
      const t = e.getAttribute("data-event-id");
      if (!t) return;
      const n = r.querySelector(`[data-event-content="${t}"]`);
      if (!n) return;
      const i = e.getAttribute("aria-expanded") === "true";
      e.setAttribute("aria-expanded", String(!i)), n.classList.toggle("hidden", i);
      const a = e.querySelector("svg");
      a && (a.style.transform = i ? "" : "rotate(180deg)");
    });
  });
}
function dt(r, e, t) {
  r.querySelectorAll(".timeline-group-toggle").forEach((n) => {
    n.addEventListener("click", () => {
      const i = n.getAttribute("data-group-id");
      if (!i) return;
      const a = r.querySelector(`[data-group-content="${i}"]`);
      if (!a) return;
      const s = n.getAttribute("aria-expanded") === "true";
      n.setAttribute("aria-expanded", String(!s)), a.classList.toggle("hidden", s);
      const c = n.querySelector("svg");
      if (c && (c.style.transform = s ? "" : "rotate(180deg)"), n.innerHTML = `
        <svg class="w-3 h-3 transition-transform" style="transform: ${s ? "" : "rotate(180deg)"}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
        ${s ? "Show details" : "Hide details"}
      `, !s && a.children.length === 0) {
        const l = t(i);
        if (l) {
          const d = l.events.map((u, m) => Z(u, e, m === l.events.length - 1)).join("");
          a.innerHTML = d, Q(a);
        }
      }
    });
  });
}
class ee {
  constructor(e) {
    this.container = null, this.refreshBtn = null, this.viewToggle = null, this.viewMode = "condensed", this.processedItems = [], this.dateGroups = [], this.stats = {
      totalEvents: 0,
      visibleEvents: 0,
      hiddenEvents: 0,
      groupCount: 0,
      groupedEventCount: 0
    }, this.groupMap = /* @__PURE__ */ new Map(), this.config = e, this.bootstrap = e.bootstrap, this.resolverContext = F(this.bootstrap);
  }
  /**
   * Initialize the timeline controller
   */
  init() {
    if (this.container = document.getElementById(this.config.containerId), this.config.refreshButtonId && (this.refreshBtn = document.getElementById(this.config.refreshButtonId)), this.config.viewToggleId && (this.viewToggle = document.getElementById(this.config.viewToggleId)), !this.container) {
      console.warn(`Timeline container #${this.config.containerId} not found`);
      return;
    }
    this.refreshBtn && this.refreshBtn.addEventListener("click", () => this.refresh()), this.render();
  }
  /**
   * Update bootstrap data and re-render
   */
  updateBootstrap(e) {
    this.bootstrap = e, this.resolverContext = F(e), this.render();
  }
  /**
   * Set view mode and re-render
   */
  setViewMode(e) {
    this.viewMode !== e && (this.viewMode = e, this.render());
  }
  /**
   * Toggle view mode
   */
  toggleViewMode() {
    this.setViewMode(this.viewMode === "condensed" ? "all" : "condensed");
  }
  /**
   * Get current view mode
   */
  getViewMode() {
    return this.viewMode;
  }
  /**
   * Get current stats
   */
  getStats() {
    return { ...this.stats };
  }
  /**
   * Render the timeline
   */
  render() {
    if (!this.container)
      return;
    const e = this.bootstrap.events || [], { items: t, stats: n } = Ze(e, this.viewMode);
    this.processedItems = t, this.stats = n, this.dateGroups = et(t), this.groupMap.clear();
    for (const s of t)
      if (s.type === "group" && s.group) {
        const c = `group-${s.group.events[0]?.id || Date.now()}`;
        this.groupMap.set(c, s.group);
      }
    const i = lt(this.dateGroups, this.resolverContext, n, this.viewMode);
    this.container.innerHTML = i, Q(this.container), dt(
      this.container,
      this.resolverContext,
      (s) => this.groupMap.get(s)
    );
    const a = this.container.querySelector(".timeline-show-all-btn");
    a && a.addEventListener("click", () => this.setViewMode("all")), this.viewToggle && (this.viewToggle.innerHTML = ct(this.viewMode), this.wireViewToggle());
  }
  /**
   * Wire up view mode toggle buttons
   */
  wireViewToggle() {
    this.viewToggle && this.viewToggle.querySelectorAll(".timeline-mode-btn").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.getAttribute("data-mode");
        (t === "condensed" || t === "all") && this.setViewMode(t);
      });
    });
  }
  /**
   * Show loading state
   */
  showLoading() {
    this.container && (this.container.innerHTML = ot());
  }
  /**
   * Refresh timeline data
   *
   * This fetches the current page, extracts the timeline bootstrap, and re-renders.
   */
  async refresh() {
    if (this.container) {
      this.showLoading();
      try {
        const e = await fetch(window.location.href, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "text/html"
          }
        });
        if (!e.ok)
          throw new Error(`Failed to refresh: HTTP ${e.status}`);
        const t = await e.text(), i = new DOMParser().parseFromString(t, "text/html");
        if (i.getElementById("agreement-timeline-bootstrap")?.textContent)
          try {
            const c = C(
              "agreement-timeline-bootstrap",
              "agreement-review-bootstrap",
              {
                agreement_id: this.config.agreementId,
                current_user_id: this.bootstrap.current_user_id
              },
              i
            );
            this.updateBootstrap(c);
            return;
          } catch (c) {
            console.warn("Failed to parse timeline bootstrap:", c);
          }
        const s = this.extractLegacyBootstrap(i);
        if (s) {
          this.updateBootstrap(s);
          return;
        }
        this.render();
      } catch (e) {
        console.error("Timeline refresh failed:", e), this.render();
      }
    }
  }
  /**
   * Extract timeline data from legacy inline format (for backwards compatibility)
   */
  extractLegacyBootstrap(e) {
    const t = e.getElementById("agreement-review-bootstrap");
    let n = {}, i = [];
    if (t?.textContent)
      try {
        const a = JSON.parse(t.textContent);
        n = a.actor_map || {}, i = a.participants || [];
      } catch {
      }
    return Object.keys(n).length > 0 || i.length > 0 ? {
      agreement_id: this.config.agreementId,
      events: this.bootstrap.events || [],
      actors: n,
      participants: i,
      field_definitions: this.bootstrap.field_definitions || []
    } : null;
  }
  /**
   * Get the group for a given ID
   */
  getGroup(e) {
    return this.groupMap.get(e);
  }
  /**
   * Dispose of the controller
   */
  dispose() {
    this.container = null, this.refreshBtn = null, this.viewToggle = null, this.groupMap.clear();
  }
}
function Rt(r) {
  const e = new ee(r);
  return e.init(), e;
}
function Ct(r, e) {
  const t = document.getElementById(r), n = {
    agreement_id: e?.agreement_id || "",
    events: e?.events || [],
    actors: e?.actors || {},
    participants: e?.participants || [],
    field_definitions: e?.field_definitions || [],
    current_user_id: e?.current_user_id
  };
  if (!t?.textContent)
    return n;
  try {
    const i = JSON.parse(t.textContent);
    return {
      agreement_id: i.agreement_id || n.agreement_id,
      events: Array.isArray(i.events) ? i.events : n.events,
      actors: i.actors && typeof i.actors == "object" ? i.actors : n.actors,
      participants: Array.isArray(i.participants) ? i.participants : n.participants,
      field_definitions: Array.isArray(i.field_definitions) ? i.field_definitions : n.field_definitions,
      current_user_id: i.current_user_id || n.current_user_id
    };
  } catch (i) {
    return console.warn(`Failed to parse ${r}:`, i), n;
  }
}
function ut(r, e) {
  if (!e || typeof e != "object")
    return r;
  const t = {
    ...e.actor_map && typeof e.actor_map == "object" ? e.actor_map : {},
    ...r.actors
  }, n = new Set(
    r.participants.map((a) => String(a.id || "").trim()).filter(Boolean)
  ), i = Array.isArray(e.participants) ? e.participants.filter((a) => {
    const s = String(a?.id || "").trim();
    return s && !n.has(s);
  }) : [];
  return {
    ...r,
    actors: t,
    participants: [...r.participants, ...i]
  };
}
function T(r, e, t = document) {
  const n = t.querySelector(`#${e}`);
  if (!n?.textContent)
    return r;
  try {
    const i = JSON.parse(n.textContent);
    return ut(r, i);
  } catch (i) {
    return console.warn(`Failed to parse ${e}:`, i), r;
  }
}
function C(r, e, t, n = document) {
  const i = {
    agreement_id: t?.agreement_id || "",
    events: t?.events || [],
    actors: t?.actors || {},
    participants: t?.participants || [],
    field_definitions: t?.field_definitions || [],
    current_user_id: t?.current_user_id
  }, a = n.querySelector(`#${r}`);
  if (!a?.textContent)
    return T(i, e, n);
  try {
    const s = JSON.parse(a.textContent);
    return T({
      agreement_id: s.agreement_id || i.agreement_id,
      events: Array.isArray(s.events) ? s.events : i.events,
      actors: s.actors && typeof s.actors == "object" ? s.actors : i.actors,
      participants: Array.isArray(s.participants) ? s.participants : i.participants,
      field_definitions: Array.isArray(s.field_definitions) ? s.field_definitions : i.field_definitions,
      current_user_id: s.current_user_id || i.current_user_id
    }, e, n);
  } catch (s) {
    return console.warn(`Failed to parse ${r}:`, s), T(i, e, n);
  }
}
function mt(r) {
  return E(r);
}
function pt(r) {
  return B(r);
}
function z(r = document) {
  r.querySelectorAll("[data-timestamp]").forEach((e) => {
    if (e.classList.contains("recipient-timestamp"))
      return;
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = mt(t));
  }), r.querySelectorAll(".recipient-timestamp").forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = pt(t));
  });
}
function gt(r = document) {
  r.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element))
      return;
    const n = t.closest(".collapsible-expand-trigger");
    if (n) {
      const d = n.closest(".collapsible-trigger");
      if (d) {
        const u = d.getAttribute("aria-controls"), m = u ? document.getElementById(u) : null;
        m && (d.setAttribute("aria-expanded", "true"), m.classList.add("expanded"));
      }
      return;
    }
    if (t.closest(".collapsible-header-actions button, .collapsible-header-actions [data-command-name]"))
      return;
    const a = t.closest(".collapsible-trigger");
    if (!a)
      return;
    const s = a.getAttribute("aria-controls"), c = s ? document.getElementById(s) : null;
    if (!c)
      return;
    const l = a.getAttribute("aria-expanded") === "true";
    a.setAttribute("aria-expanded", String(!l)), c.classList.toggle("expanded", !l);
  });
}
function _(r, e) {
  const t = String(r || "").trim(), n = String(e || "").trim();
  return !t || !n ? "" : `${t}:${n}`;
}
function ft(r, e) {
  if (!e)
    return null;
  const t = String(e).trim();
  return r.find((n) => {
    const i = String(n.id || "").trim(), a = String(n.recipient_id || "").trim();
    return i === t || a === t;
  }) || null;
}
function R(r, e, t) {
  const n = t.actor_map && typeof t.actor_map == "object" ? t.actor_map : {}, i = Array.isArray(t.participants) ? t.participants : [], a = String(r || "").trim(), s = String(e || "").trim(), c = [];
  a === "recipient" || a === "signer" ? c.push(_("recipient", e), _("signer", e)) : a === "user" || a === "sender" ? c.push(_("user", e), _("sender", e)) : a === "reviewer" || a === "external" ? c.push(_("reviewer", e), _("external", e)) : c.push(_(a, e));
  const l = c.map((A) => n[A]).find(Boolean) || {}, d = String(l.display_name || l.name || "").trim(), u = String(l.email || "").trim(), m = ft(i, s), f = m ? String(m.display_name || m.name || "").trim() : "", h = m ? String(m.email || "").trim() : "", p = L(l.role || l.actor_type || a);
  let y = "";
  return d && !g(d) ? y = d : u && !g(u) ? y = u : f && !g(f) ? y = f : h && !g(h) ? y = h : p ? y = p : y = "Unknown User", {
    name: y,
    role: String(l.role || l.actor_type || a || "participant").trim() || "participant",
    actor_type: String(l.actor_type || a).trim()
  };
}
function O(r) {
  document.querySelectorAll("[data-review-actor-avatar]").forEach((e) => {
    const t = e.getAttribute("data-actor-type") || "", n = e.getAttribute("data-actor-id") || "", i = R(t, n, r), a = K(i.actor_type), s = Y(i.name, i.role);
    e.textContent = s, e.style.backgroundColor = a, e.style.color = "#ffffff";
  }), document.querySelectorAll("[data-review-actor-name]").forEach((e) => {
    const t = e.getAttribute("data-actor-type") || "", n = e.getAttribute("data-actor-id") || "", i = R(t, n, r);
    e.textContent = i.name;
  }), document.querySelectorAll("[data-review-actor-role]").forEach((e) => {
    const t = e.getAttribute("data-actor-type") || "", n = e.getAttribute("data-actor-id") || "", i = R(t, n, r);
    e.textContent = L(i.role || i.actor_type);
  });
}
function ht(r, e, t = document) {
  const n = t.querySelector(`#${r}`);
  if (!n?.textContent)
    return e;
  try {
    return JSON.parse(n.textContent);
  } catch (i) {
    return console.warn(`Unable to parse ${r}`, i), e;
  }
}
const j = {
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
}, vt = {
  review_status: ["#agreement-review-status-panel"],
  review_config: ["#agreement-review-configuration-panel", "#agreement-review-bootstrap"],
  participants: ["#review-participants-panel", "#agreement-participants-panel", "#participant-progress-panel"],
  comments: ["#review-comment-threads-panel", "#agreement-review-bootstrap"],
  delivery: ["#agreement-delivery-panel"],
  artifacts: ["#agreement-artifacts-panel", "#download-status-notice-static"],
  timeline: ["#agreement-timeline-bootstrap"]
};
class te {
  constructor(e) {
    this.timelineController = null, this.commandRuntimeController = null, this.feedbackAdapter = null, this.inlineStatusManager = null, this.inlineStatusUnsubscribe = null, this.initialized = !1, this.clickHandler = (t) => {
      this.handleDocumentClick(t);
    }, this.changeHandler = (t) => {
      this.handleDocumentChange(t);
    }, this.config = e, this.reviewBootstrap = { ...j };
  }
  /**
   * Initialize the page controller
   */
  init() {
    this.initialized || (this.initialized = !0, this.hydrateReviewBootstrap(), z(), gt(), O(this.reviewBootstrap), this.initializeReviewWorkspace(), this.syncAgreementThreadAnchorFields(), this.initializeDeliveryState(), this.initInlineStatusManager(), this.initFeedbackAdapter(), this.initCommandRuntime(), this.feedbackAdapter?.start(), document.addEventListener("click", this.clickHandler), document.addEventListener("change", this.changeHandler), this.initTimeline());
  }
  /**
   * Initialize the timeline controller
   */
  initTimeline() {
    const e = C(
      "agreement-timeline-bootstrap",
      "agreement-review-bootstrap",
      {
        agreement_id: this.config.agreementId
      }
    );
    this.timelineController = new ee({
      containerId: "agreement-timeline",
      refreshButtonId: "timeline-refresh",
      viewToggleId: "timeline-view-toggle",
      bootstrap: e,
      basePath: this.config.basePath,
      apiBasePath: this.config.apiBasePath,
      agreementId: this.config.agreementId,
      panelName: this.config.panelName
    }), this.timelineController.init();
  }
  /**
   * Hydrate review bootstrap from JSON script
   */
  hydrateReviewBootstrap(e = document) {
    const t = ht(
      "agreement-review-bootstrap",
      j,
      e
    );
    Object.keys(this.reviewBootstrap).forEach((n) => {
      delete this.reviewBootstrap[n];
    }), Object.assign(this.reviewBootstrap, t);
  }
  /**
   * Get the current review bootstrap
   */
  getReviewBootstrap() {
    return this.reviewBootstrap;
  }
  /**
   * Refresh after command runtime update
   */
  onCommandRuntimeRefresh(e = document) {
    if (this.hydrateReviewBootstrap(e), this.initializeReviewWorkspace(), O(this.reviewBootstrap), z(e), this.syncAgreementThreadAnchorFields(), e.querySelector("#agreement-timeline-bootstrap")?.textContent && this.timelineController)
      try {
        const n = C(
          "agreement-timeline-bootstrap",
          "agreement-review-bootstrap",
          { agreement_id: this.config.agreementId },
          e
        );
        this.timelineController.updateBootstrap(n);
      } catch {
      }
  }
  /**
   * Get scope params from URL and resource
   */
  resolveScopeParams() {
    const e = new URLSearchParams(window.location.search || ""), t = (this.config.tenantId || e.get("tenant_id") || "").trim(), n = (this.config.orgId || e.get("org_id") || "").trim();
    return { tenantId: t, orgId: n };
  }
  /**
   * Build a scoped URL with tenant/org params
   */
  buildScopedURL(e) {
    const t = new URL(e, window.location.origin), { tenantId: n, orgId: i } = this.resolveScopeParams();
    return n && t.searchParams.set("tenant_id", n), i && t.searchParams.set("org_id", i), t.toString();
  }
  /**
   * Build asset download URL
   */
  buildAssetDownloadURL(e) {
    const t = this.config.panelName || "esign_agreements", n = new URL(
      `${this.config.apiBasePath}/panels/${t}/${this.config.agreementId}/artifact/${e}`,
      window.location.origin
    ), { tenantId: i, orgId: a } = this.resolveScopeParams();
    return i && n.searchParams.set("tenant_id", i), a && n.searchParams.set("org_id", a), n.searchParams.set("disposition", "attachment"), n.toString();
  }
  /**
   * Refresh the timeline
   */
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
    if (!e.querySelector("[data-review-recipient-enabled]")?.checked)
      return null;
    const n = String(e.getAttribute("data-recipient-id") || "").trim();
    return n ? {
      participant_type: "recipient",
      recipient_id: n,
      can_comment: e.querySelector("[data-review-recipient-comment]")?.checked ?? !0,
      can_approve: e.querySelector("[data-review-recipient-approve]")?.checked ?? !0
    } : null;
  }
  collectReviewParticipants() {
    const e = [];
    return this.getReviewRecipientRows().forEach((n) => {
      const i = this.normalizeRecipientParticipant(n);
      i && e.push(i);
    }), Array.from(
      document.querySelectorAll("[data-review-external-row]")
    ).forEach((n) => {
      const i = String(
        n.querySelector("[data-review-external-email]")?.value || ""
      ).trim();
      i && e.push({
        participant_type: "external",
        email: i,
        display_name: String(
          n.querySelector("[data-review-external-name]")?.value || ""
        ).trim(),
        can_comment: n.querySelector("[data-review-external-comment]")?.checked ?? !0,
        can_approve: n.querySelector("[data-review-external-approve]")?.checked ?? !0
      });
    }), e;
  }
  syncExternalReviewersEmptyState() {
    const e = document.getElementById("agreement-external-reviewers-empty"), t = this.getExternalReviewersContainer();
    if (!e)
      return;
    const n = !!t?.querySelector("[data-review-external-row]");
    e.classList.toggle("hidden", n);
  }
  resetExternalReviewerRows() {
    const e = this.getExternalReviewersContainer();
    e && (e.innerHTML = "", this.syncExternalReviewersEmptyState());
  }
  appendExternalReviewerRow(e = {}) {
    const t = this.getExternalReviewersContainer(), n = document.getElementById("agreement-external-reviewer-template");
    if (!t || !n?.content)
      return;
    const i = document.importNode(n.content, !0), a = i.querySelector("[data-review-external-row]");
    if (!a)
      return;
    const s = a.querySelector("[data-review-external-name]"), c = a.querySelector("[data-review-external-email]"), l = a.querySelector("[data-review-external-comment]"), d = a.querySelector("[data-review-external-approve]");
    s && (s.value = String(e.display_name || e.name || "").trim()), c && (c.value = String(e.email || "").trim()), l && (l.checked = e.can_comment !== !1), d && (d.checked = e.can_approve !== !1), t.appendChild(i), this.syncExternalReviewersEmptyState();
  }
  initializeReviewWorkspace() {
    const e = document.getElementById("agreement-review-gate"), t = document.getElementById("agreement-review-comments-enabled");
    e && (e.value = String(this.reviewBootstrap.gate || "approve_before_send").trim() || "approve_before_send"), t && (t.checked = !!this.reviewBootstrap.comments_enabled);
    const n = Array.isArray(this.reviewBootstrap.participants) ? this.reviewBootstrap.participants : [];
    this.resetExternalReviewerRows(), this.getReviewRecipientRows().forEach((i) => {
      const a = String(i.getAttribute("data-recipient-id") || "").trim(), s = i.querySelector("[data-review-recipient-enabled]"), c = i.querySelector("[data-review-recipient-comment]"), l = i.querySelector("[data-review-recipient-approve]"), d = n.find(
        (u) => this.normalizeParticipantType(u?.participant_type) === "recipient" && String(u?.recipient_id || "").trim() === a
      );
      s && (s.checked = !!d), c && (c.checked = d ? !!d.can_comment : !0), l && (l.checked = d ? !!d.can_approve : !0);
    }), n.filter((i) => this.normalizeParticipantType(i?.participant_type) === "external").forEach((i) => this.appendExternalReviewerRow(i)), this.syncExternalReviewersEmptyState();
  }
  syncAgreementThreadAnchorFields() {
    const e = String(
      document.getElementById("agreement-thread-anchor-type")?.value || "agreement"
    ).trim() || "agreement";
    document.getElementById("agreement-thread-page-wrap")?.classList.toggle("hidden", e !== "page"), document.getElementById("agreement-thread-field-wrap")?.classList.toggle("hidden", e !== "field");
  }
  syncBootstrapScriptContent(e, t) {
    const n = document.getElementById(e), i = t.getElementById(e);
    n && i && (n.textContent = i.textContent || "");
  }
  initInlineStatusManager() {
    this.inlineStatusManager = Me({
      completedClearDelay: 3e3,
      failedClearDelay: 8e3,
      usePageFallback: !0
    });
  }
  initFeedbackAdapter() {
    const e = String(this.config.feedback?.sseEndpoint || "").trim();
    this.feedbackAdapter?.stop(), this.feedbackAdapter = e ? new we(e) : null;
  }
  resolveLiveSelectors(e) {
    const t = /* @__PURE__ */ new Set();
    return e.forEach((n) => {
      (vt[n] || []).forEach((i) => {
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
    if (e.type !== "esign.agreement.changed" || e.resourceType !== "esign_agreement" || String(e.resourceId || "").trim() !== this.config.agreementId)
      return !1;
    const { tenantId: t, orgId: n } = this.resolveScopeParams();
    return !(t && String(e.tenantId || "").trim() && String(e.tenantId || "").trim() !== t || n && String(e.orgId || "").trim() && String(e.orgId || "").trim() !== n);
  }
  async reconcileAgreementFeedback(e) {
    if (!this.matchesAgreementFeedback(e.event))
      return;
    const t = Array.isArray(e.event.sections) ? e.event.sections : [], n = new Set(e.pending?.refreshSelectors || []);
    this.resolveLiveSelectors(t).forEach((i) => {
      n.add(i);
    }), n.add("#agreement-review-bootstrap"), n.add("#agreement-timeline-bootstrap"), n.size !== 0 && await e.controller.refreshSelectors(Array.from(n));
  }
  async reconcileAgreementStreamGap(e) {
    await e.controller.refreshSelectors(this.allLiveSelectors()), this.feedbackAdapter?.attemptRecovery();
  }
  async dispatchAgreementCommand(e) {
    return this.commandRuntimeController ? (await this.commandRuntimeController.dispatch(e)).success : !1;
  }
  initCommandRuntime() {
    const e = document.getElementById("agreement-review-command-region");
    e && (this.inlineStatusUnsubscribe?.(), this.commandRuntimeController?.destroy(), this.commandRuntimeController = re({
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
    }), this.commandRuntimeController && this.inlineStatusManager && (this.inlineStatusUnsubscribe = this.commandRuntimeController.subscribeToInlineStatus(
      (t) => this.inlineStatusManager?.handleStatusChange(t)
    )));
  }
  async executeAction(e, t = {}) {
    const n = this.buildScopedURL(
      `${this.config.apiBasePath}/panels/${this.panelName}/actions/${e}`
    ), i = await ne(
      n,
      { id: this.config.agreementId, ...t },
      { credentials: "same-origin" }
    );
    if (!i.success || i.error) {
      const a = ie(i.error || {
        textCode: null,
        message: `${e} failed`,
        metadata: null,
        fields: null
      }, `${e} failed`);
      throw new Error(a);
    }
  }
  async executeActionAndReload(e, t = {}, n = `${e} completed successfully`) {
    await this.executeAction(e, t), this.notifySuccess(n), window.location.reload();
  }
  setElementBusy(e, t) {
    e && ((e instanceof HTMLButtonElement || e instanceof HTMLInputElement) && (e.disabled = t), t ? e.setAttribute("aria-busy", "true") : e.removeAttribute("aria-busy"));
  }
  async submitAgreementReview(e) {
    if (e?.getAttribute("aria-busy") === "true")
      return;
    const t = document.getElementById("agreement-review-gate"), n = document.getElementById("agreement-review-comments-enabled"), i = {
      gate: String(t?.value || "approve_before_send").trim() || "approve_before_send",
      comments_enabled: n?.checked ?? !1,
      review_participants: this.collectReviewParticipants()
    }, a = String(this.reviewBootstrap.status || "").trim().toLowerCase(), s = a && a !== "none" && a !== "in_review" ? "reopen_review" : "request_review";
    this.setElementBusy(e, !0);
    try {
      await this.dispatchAgreementCommand({
        trigger: e || void 0,
        submitter: e || void 0,
        commandName: s,
        dispatchName: `esign.agreements.${s}`,
        transport: "rpc",
        payload: i,
        successMessage: s === "reopen_review" ? "Review reopened" : "Review requested",
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
    const n = document.getElementById("download-status-notice-dynamic");
    n && (document.getElementById("download-status-notice-static")?.classList.add("hidden"), n.className = `mx-6 mt-6 rounded-lg border p-4 text-sm ${t === "success" ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`, n.textContent = e, n.classList.remove("hidden"));
  }
  getExecutedDownloadButtons() {
    return Array.from(
      document.querySelectorAll('[data-action="download-executed"]')
    );
  }
  markExecutedDownloadUnavailable(e) {
    const t = '<svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    this.getExecutedDownloadButtons().forEach((n) => {
      n.dataset.downloadState = "unavailable", n.disabled = !0, n.setAttribute("aria-disabled", "true"), n.classList.remove("btn-primary"), n.classList.add("btn-warning"), n.innerHTML = `${t}Unable To Download Package`, n.setAttribute("title", e), n.setAttribute("aria-label", "Executed completion package is unavailable");
    }), e && this.showDownloadNotice(e, "warning");
  }
  setExecutedDownloadLoading(e) {
    const t = '<svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>', n = '<svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Download Completion Package';
    this.getExecutedDownloadButtons().forEach((i) => {
      (i.dataset.downloadState || "").toLowerCase() !== "unavailable" && (i.disabled = e, i.innerHTML = e ? `${t}Preparing package...` : n);
    });
  }
  initializeDeliveryState() {
    this.config.delivery?.executed_applicable && String(this.config.agreementStatus || "").toLowerCase() === "completed" && String(this.config.delivery.executed_status || "").toLowerCase() !== "ready" && !String(this.config.delivery.executed_object_key || "").trim() && this.markExecutedDownloadUnavailable(
      "Executed completion package is still unavailable for this agreement. Artifact generation may still be running."
    );
  }
  async fetchAndDownloadAsset(e, t, n) {
    const i = await fetch(this.buildAssetDownloadURL(e), {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/pdf"
      }
    });
    if (!i.ok)
      throw new Error(`${n} is not available (HTTP ${i.status}). Refresh delivery status and try again.`);
    if (!(i.headers.get("content-type") || "").toLowerCase().includes("application/pdf"))
      throw new Error(`${n} is unavailable because the response is not a PDF.`);
    const s = await i.blob();
    if (!s || s.size === 0)
      throw new Error(`${n} is unavailable because the file is empty.`);
    const c = this.resolveDownloadFilename(i, t), l = URL.createObjectURL(s), d = document.createElement("a");
    d.href = l, d.download = c, document.body.appendChild(d), d.click(), d.remove(), setTimeout(() => URL.revokeObjectURL(l), 1e3);
  }
  async handleDocumentClick(e) {
    const t = e.target;
    if (!(t instanceof Element))
      return;
    if (t.closest("#agreement-add-external-reviewer-btn")) {
      e.preventDefault(), this.appendExternalReviewerRow();
      return;
    }
    const i = t.closest("[data-review-external-remove]");
    if (i) {
      e.preventDefault(), i.closest("[data-review-external-row]")?.remove(), this.syncExternalReviewersEmptyState();
      return;
    }
    const a = t.closest("#agreement-submit-review-btn");
    if (a) {
      e.preventDefault(), await this.submitAgreementReview(a);
      return;
    }
    const s = t.closest('[data-action="resend-recipient"], [data-action="resend-participant"]');
    if (s) {
      e.preventDefault();
      const p = s.getAttribute("data-recipient-id") || s.getAttribute("data-participant-id");
      if (!p) {
        this.notifyError("Recipient ID is missing");
        return;
      }
      try {
        await this.dispatchAgreementCommand({
          trigger: s,
          submitter: s,
          commandName: "resend",
          dispatchName: "esign.agreements.resend",
          transport: "rpc",
          payload: { recipient_id: p },
          successMessage: "Recipient notification resent",
          fallbackMessage: "Unable to resend recipient notification",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel", "#agreement-participants-panel"]
        });
      } finally {
        s.removeAttribute("aria-busy");
      }
      return;
    }
    const c = t.closest('[data-action="rotate-token"]');
    if (c) {
      e.preventDefault();
      const p = c.getAttribute("data-recipient-id") || c.getAttribute("data-participant-id");
      if (!p) {
        this.notifyError("Recipient ID is missing");
        return;
      }
      try {
        await this.dispatchAgreementCommand({
          trigger: c,
          submitter: c,
          commandName: "rotate_token",
          dispatchName: "esign.tokens.rotate",
          transport: "rpc",
          payload: { recipient_id: p },
          successMessage: "Recipient token rotated",
          fallbackMessage: "Unable to rotate token",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel", "#agreement-participants-panel"]
        });
      } finally {
        c.removeAttribute("aria-busy");
      }
      return;
    }
    const l = t.closest('[data-action="download-executed"]');
    if (l) {
      if (e.preventDefault(), (l.dataset.downloadState || "").toLowerCase() === "unavailable") {
        this.showDownloadNotice(
          "Executed completion package is still unavailable for this agreement. Refresh delivery status and try again.",
          "warning"
        );
        return;
      }
      this.setExecutedDownloadLoading(!0);
      try {
        await this.fetchAndDownloadAsset(
          "executed",
          `${this.config.agreementId}-executed.pdf`,
          "Executed completion package"
        ), this.showDownloadNotice("Executed completion package downloaded successfully.", "success");
      } catch (p) {
        this.markExecutedDownloadUnavailable(
          p instanceof Error ? p.message : "Unable To Download Package"
        );
      } finally {
        this.setExecutedDownloadLoading(!1);
      }
      return;
    }
    const d = t.closest('[data-action="download-certificate"]');
    if (d) {
      e.preventDefault();
      const p = d.innerHTML;
      d.disabled = !0, d.innerHTML = '<svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Preparing...';
      try {
        await this.fetchAndDownloadAsset(
          "certificate",
          `${this.config.agreementId}-certificate.pdf`,
          "Standalone audit certificate"
        ), this.showDownloadNotice("Standalone audit certificate downloaded successfully.", "success");
      } catch (y) {
        this.showDownloadNotice(
          y instanceof Error ? y.message : "Unable to download standalone audit certificate.",
          "warning"
        );
      } finally {
        d.disabled = !1, d.innerHTML = p;
      }
      return;
    }
    const u = t.closest('[data-action="retry-email"]');
    if (u) {
      e.preventDefault();
      const p = u.innerHTML;
      u.disabled = !0, u.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.dispatchAgreementCommand({
          trigger: u,
          submitter: u,
          transport: "action",
          commandName: "retry_email",
          payload: {
            email_id: u.getAttribute("data-email-id") || "",
            recipient_id: u.getAttribute("data-recipient-id") || ""
          },
          successMessage: "Email retry queued",
          fallbackMessage: "Unable to retry email",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel"]
        });
      } finally {
        u.disabled = !1, u.innerHTML = p;
      }
      return;
    }
    const m = t.closest('[data-action="retry-job"]');
    if (m) {
      e.preventDefault();
      const p = m.innerHTML;
      m.disabled = !0, m.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.dispatchAgreementCommand({
          trigger: m,
          submitter: m,
          transport: "action",
          commandName: "retry_job",
          payload: {
            job_id: m.getAttribute("data-job-id") || "",
            job_type: m.getAttribute("data-job-type") || ""
          },
          successMessage: "Job retry queued",
          fallbackMessage: "Unable to retry job",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel"]
        });
      } finally {
        m.disabled = !1, m.innerHTML = p;
      }
      return;
    }
    const f = t.closest('[data-action="retry-artifact"]');
    if (f) {
      e.preventDefault();
      const p = f.innerHTML;
      f.disabled = !0, f.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.dispatchAgreementCommand({
          trigger: f,
          submitter: f,
          transport: "action",
          commandName: "retry_artifact",
          payload: {
            artifact_type: f.getAttribute("data-artifact-type") || ""
          },
          successMessage: "Artifact retry queued",
          fallbackMessage: "Unable to retry artifact generation",
          refreshSelectors: ["#agreement-delivery-panel", "#agreement-artifacts-panel"]
        });
      } finally {
        f.disabled = !1, f.innerHTML = p;
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
  /**
   * Dispose the controller
   */
  dispose() {
    document.removeEventListener("click", this.clickHandler), document.removeEventListener("change", this.changeHandler), this.inlineStatusUnsubscribe?.(), this.inlineStatusUnsubscribe = null, this.inlineStatusManager?.clear(), this.inlineStatusManager = null, this.commandRuntimeController?.destroy(), this.commandRuntimeController = null, this.feedbackAdapter?.stop(), this.feedbackAdapter = null, this.timelineController && (this.timelineController.dispose(), this.timelineController = null), this.initialized = !1;
  }
}
function kt(r) {
  if (!r)
    return console.warn("Agreement detail page config not provided"), null;
  const e = new te(r);
  return document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => e.init()) : e.init(), e;
}
function Mt(r) {
  const e = new te(r);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => e.init()) : e.init(), window.__agreementDetailController = e;
}
function Lt() {
  return window.__agreementDetailController || null;
}
export {
  ee as $,
  te as A,
  Ie as B,
  P as C,
  V as D,
  S as E,
  W as F,
  St as G,
  xt as H,
  ke as I,
  b as J,
  L as K,
  K as L,
  Y as M,
  F as N,
  Ue as O,
  _e as P,
  Ve as Q,
  Et as R,
  N as S,
  H as T,
  At as U,
  Ze as V,
  et as W,
  Tt as X,
  Qe as Y,
  lt as Z,
  st as _,
  z as a,
  Rt as a0,
  Ct as a1,
  C as a2,
  ut as a3,
  T as a4,
  pt as a5,
  Mt as b,
  R as c,
  O as d,
  ft as e,
  mt as f,
  Lt as g,
  Me as h,
  kt as i,
  Se as j,
  xe as k,
  g as l,
  Ee as m,
  Te as n,
  Re as o,
  Ce as p,
  G as q,
  _ as r,
  ht as s,
  be as t,
  Ae as u,
  k as v,
  gt as w,
  Le as x,
  M as y,
  w as z
};
//# sourceMappingURL=agreement-detail-B3si1_g4.js.map

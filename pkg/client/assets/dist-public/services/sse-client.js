var d = 3e3, u = 45e3, g = 5, f = 3e4, m = 0.2, p = class {
  constructor(t) {
    if (this.options = t, this.running = !1, this.connectLoop = null, this.controller = null, this.heartbeatDegradeTimer = null, this.heartbeatFailoverTimer = null, this.reconnectTimer = null, this.reconnectWaiterResolve = null, this.reconnectAttempt = 0, this.serverRetryMs = null, this.recoveryPending = !1, !t.url || t.url.trim() === "") throw new Error("go-admin SSE client requires a url");
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
      streamUrl: t.url
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
  triggerFailover(t) {
    this.enterFailover(t);
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
      const t = this.reconnectAttempt > 0;
      this.setConnectionState(t ? "reconnecting" : "connecting");
      try {
        const e = this.buildRequestURL(t);
        this.diagnosticsState.streamUrl = e;
        const i = await this.resolveHeaders();
        if (!this.running) return;
        this.controller = new AbortController();
        const n = await fetch(e, {
          method: "GET",
          headers: i,
          signal: this.controller.signal
        });
        if (n.status === 401 || n.status === 403) {
          this.enterFailover("auth_failed");
          return;
        }
        if (!n.ok) throw new Error(`SSE request failed with status ${n.status}`);
        if (!n.body) throw new Error("SSE response body is not readable");
        if (this.reconnectAttempt = 0, this.diagnosticsState.reconnectAttempts = 0, this.setConnectionState("connected"), this.armHeartbeatTimers(), this.recoveryPending && (this.recoveryPending = !1, this.options.onRecovery?.(this.getDiagnostics())), await this.consume(n.body), !this.running || this.diagnosticsState.failoverTriggered) return;
        await this.scheduleReconnect();
      } catch (e) {
        if (!this.running || this.diagnosticsState.failoverTriggered || y(e) && !this.running) return;
        await this.scheduleReconnect();
      } finally {
        this.controller = null, this.clearHeartbeatTimers();
      }
    }
  }
  async consume(t) {
    const e = t.getReader(), i = new TextDecoder();
    let n = "";
    try {
      for (; this.running; ) {
        const { done: a, value: o } = await e.read();
        if (a) return;
        n += i.decode(o, { stream: !0 });
        const r = T(n);
        n = r.remainder;
        for (const s of r.frames) {
          const c = S(s);
          if (c && (this.dispatch(c), !this.running || this.diagnosticsState.failoverTriggered))
            return;
        }
      }
    } finally {
      e.releaseLock();
    }
  }
  dispatch(t) {
    if (t.retry !== null && t.retry > 0 && (this.serverRetryMs = t.retry), t.data === "" && t.id === null && t.event === "message") return;
    const e = b(t.data);
    switch (t.event) {
      case "heartbeat":
        this.handleHeartbeat(e);
        return;
      case "stream_gap":
        this.handleStreamGap(e);
        return;
      default:
        this.handleDomainEvent({
          id: t.id,
          name: t.event || "message",
          payload: e
        });
    }
  }
  handleDomainEvent(t) {
    t.id && (this.diagnosticsState.lastEventId = t.id), this.diagnosticsState.totalEventsReceived += 1, this.diagnosticsState.lastEventAt = (/* @__PURE__ */ new Date()).toISOString(), this.options.onEvent?.(t);
  }
  handleHeartbeat(t) {
    this.diagnosticsState.lastHeartbeatAt = t.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(), this.diagnosticsState.connectionState === "degraded" && this.setConnectionState("connected"), this.armHeartbeatTimers(), this.options.onHeartbeat?.(t);
  }
  handleStreamGap(t) {
    this.diagnosticsState.gapEventsReceived += 1, this.options.onStreamGap?.(t), this.options.onRequestSnapshot?.(), this.enterFailover("stream_gap");
  }
  armHeartbeatTimers() {
    const t = this.resolveHeartbeatTimeoutMs();
    t <= 0 || (this.clearHeartbeatTimers(), this.heartbeatDegradeTimer = setTimeout(() => {
      !this.running || this.diagnosticsState.failoverTriggered || (this.setConnectionState("degraded"), this.heartbeatFailoverTimer = setTimeout(() => {
        !this.running || this.diagnosticsState.failoverTriggered || this.diagnosticsState.connectionState === "degraded" && this.enterFailover("heartbeat_timeout");
      }, t));
    }, t));
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
    const t = this.computeReconnectDelay(this.reconnectAttempt);
    await new Promise((e) => {
      this.clearReconnectTimer(), this.reconnectWaiterResolve = () => {
        this.reconnectWaiterResolve = null, e();
      }, this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null, this.reconnectWaiterResolve?.();
      }, t);
    });
  }
  clearReconnectTimer() {
    if (this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.reconnectWaiterResolve) {
      const t = this.reconnectWaiterResolve;
      this.reconnectWaiterResolve = null, t();
    }
  }
  setConnectionState(t) {
    this.diagnosticsState.connectionState !== t && (this.diagnosticsState.connectionState = t, this.options.onConnectionStateChange?.(t, this.getDiagnostics()));
  }
  enterFailover(t) {
    this.diagnosticsState.failoverTriggered || (this.running = !1, this.diagnosticsState.failoverTriggered = !0, this.diagnosticsState.failoverReason = t, this.clearReconnectTimer(), this.clearHeartbeatTimers(), this.controller?.abort(), this.controller = null, this.setConnectionState("failed"), this.options.onFailover?.(t, this.getDiagnostics()));
  }
  async resolveHeaders() {
    const t = new Headers();
    t.set("Accept", "text/event-stream");
    try {
      return v(t, await this.options.getHeaders?.()), t;
    } catch {
      throw this.enterFailover("auth_failed"), new Error("auth_failed");
    }
  }
  buildRequestURL(t) {
    const e = typeof globalThis.location?.href == "string" && globalThis.location.href !== "" ? globalThis.location.href : "http://localhost", i = new URL(this.options.url, e);
    return t && this.diagnosticsState.lastEventId && i.searchParams.set("cursor", this.diagnosticsState.lastEventId), this.options.enableClientTuning && (typeof this.options.heartbeatMs == "number" && this.options.heartbeatMs > 0 && i.searchParams.set("heartbeat_ms", String(this.options.heartbeatMs)), typeof this.options.retryMs == "number" && this.options.retryMs > 0 && i.searchParams.set("retry_ms", String(this.options.retryMs))), i.toString();
  }
  computeReconnectDelay(t) {
    const e = this.resolveRetryMs(), i = Math.min(e * 2 ** Math.max(0, t - 1), f), n = i * m * Math.random();
    return Math.round(i + n);
  }
  resolveRetryMs() {
    return typeof this.serverRetryMs == "number" && this.serverRetryMs > 0 ? this.serverRetryMs : typeof this.options.retryMs == "number" && this.options.retryMs > 0 ? this.options.retryMs : d;
  }
  resolveHeartbeatTimeoutMs() {
    return typeof this.options.heartbeatTimeoutMs == "number" && this.options.heartbeatTimeoutMs > 0 ? this.options.heartbeatTimeoutMs : typeof this.options.heartbeatMs == "number" && this.options.heartbeatMs > 0 ? Math.max(this.options.heartbeatMs * 2, u) : u;
  }
  resolveMaxReconnectAttempts() {
    return typeof this.options.maxReconnectAttempts == "number" && this.options.maxReconnectAttempts >= 0 ? this.options.maxReconnectAttempts : g;
  }
};
function v(t, e) {
  if (e) {
    if (e instanceof Headers) {
      e.forEach((i, n) => {
        t.set(n, i);
      });
      return;
    }
    if (Array.isArray(e)) {
      for (const [i, n] of e) t.set(i, n);
      return;
    }
    for (const [i, n] of Object.entries(e)) t.set(i, n);
  }
}
function T(t) {
  const e = t.replace(/\r\n/g, `
`), i = e.split(`

`);
  return i.length === 1 ? {
    frames: [],
    remainder: e
  } : {
    frames: i.slice(0, -1),
    remainder: i[i.length - 1] ?? ""
  };
}
function S(t) {
  const e = t.split(`
`), i = [];
  let n = null, a = "message", o = null;
  for (const r of e) {
    if (r === "" || r.startsWith(":")) continue;
    const s = r.indexOf(":"), c = s === -1 ? r : r.slice(0, s), h = s === -1 ? "" : r.slice(s + 1).replace(/^ /, "");
    switch (c) {
      case "id":
        n = h;
        break;
      case "event":
        a = h || "message";
        break;
      case "data":
        i.push(h);
        break;
      case "retry": {
        const l = Number.parseInt(h, 10);
        o = Number.isNaN(l) ? null : l;
        break;
      }
    }
  }
  return i.length === 0 && n === null && o === null && a === "message" ? null : {
    id: n,
    event: a,
    data: i.join(`
`),
    retry: o
  };
}
function b(t) {
  if (t === "") return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function y(t) {
  return t instanceof Error && t.name === "AbortError";
}
function R(t) {
  return new p(t);
}
export {
  R as createSSEClient,
  R as default
};

//# sourceMappingURL=sse-client.js.map
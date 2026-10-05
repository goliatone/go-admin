var c = "go-admin:console:";
function m(t, n) {
  return `${c}${t}:${n}`;
}
var r = 1e3, a = 12e3, h = 8, l = 1, u = 1e4;
function d(t) {
  const n = (t || "").trim();
  if (!n) return "";
  if (/^wss?:\/\//i.test(n)) return n;
  if (typeof window > "u" || !window.location) return "";
  try {
    const e = new URL(n, window.location.href);
    if (e.protocol === "http:" || e.protocol === "https:")
      return e.protocol = e.protocol === "https:" ? "wss:" : "ws:", e.toString();
  } catch {
    return "";
  }
  return "";
}
var p = class {
  constructor(t) {
    this.ws = null, this.reconnectTimer = null, this.reconnectStabilityTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.connectionEpoch = 0, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = t;
  }
  getWebSocketURL() {
    return d(this.options.url || "");
  }
  handleMessage(t) {
    this.options.onMessage?.(t);
  }
  handleSocketClosed() {
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.manualClose = !1;
    const t = this.getWebSocketURL();
    if (!t) {
      this.setStatus("error");
      return;
    }
    const n = ++this.connectionEpoch, e = new WebSocket(t);
    this.ws = e, e.onopen = () => {
      this.ws === e && (this.hasConnected = !0, this.scheduleReconnectBudgetReset(e), this.setStatus("connected"), this.flushPending());
    }, e.onmessage = (s) => {
      if (this.ws === e && !(!s || typeof s.data != "string"))
        try {
          this.handleMessage(JSON.parse(s.data));
        } catch {
        }
    }, e.onclose = async (s) => {
      if (this.ws !== e) return;
      if (this.clearReconnectStabilityTimer(), this.handleSocketClosed(), this.ws = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.options.onClose?.(s);
      let i = !0;
      try {
        i = await (this.options.shouldReconnect?.(s) ?? !0);
      } catch {
        i = !1;
      }
      if (!(this.manualClose || this.ws !== null || this.connectionEpoch !== n)) {
        if (!i) {
          this.setStatus("disconnected");
          return;
        }
        this.setStatus("reconnecting"), this.scheduleReconnect();
      }
    }, e.onerror = (s) => {
      this.ws === e && (this.options.onError?.(s), this.setStatus("error"));
    };
  }
  close() {
    this.connectionEpoch += 1, this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.clearReconnectStabilityTimer(), this.ws && this.ws.close();
  }
  sendCommand(t) {
    if (!(!t || !t.type)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(t));
        return;
      }
      this.pendingCommands.push(t);
    }
  }
  clearPendingCommands() {
    this.pendingCommands = [];
  }
  getStatus() {
    return this.status;
  }
  setStatus(t) {
    this.status !== t && (this.status = t, this.options.onStatusChange?.(t));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0) return;
    const t = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const n of t) this.ws.send(JSON.stringify(n));
  }
  clearReconnectStabilityTimer() {
    this.reconnectStabilityTimer !== null && (window.clearTimeout(this.reconnectStabilityTimer), this.reconnectStabilityTimer = null);
  }
  scheduleReconnectBudgetReset(t) {
    this.clearReconnectStabilityTimer();
    const n = Math.max(this.options.reconnectStabilityMs ?? u, 0);
    this.reconnectStabilityTimer = window.setTimeout(() => {
      this.reconnectStabilityTimer = null, this.ws === t && t.readyState === WebSocket.OPEN && (this.reconnectAttempts = 0);
    }, n);
  }
  scheduleReconnect() {
    const t = this.hasConnected ? this.options.maxReconnectAttempts ?? h : this.options.maxInitialReconnectAttempts ?? l, n = this.options.reconnectDelayMs ?? r, e = this.options.maxReconnectDelayMs ?? a;
    if (this.reconnectAttempts >= t) {
      this.setStatus("disconnected");
      return;
    }
    const s = this.reconnectAttempts, i = Math.min(n * Math.pow(2, s), e), o = i * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, i + o);
  }
};
export {
  d as n,
  m as r,
  p as t
};

//# sourceMappingURL=live-stream-BGAv0d6b.js.map
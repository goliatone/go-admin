var c = 1e3, r = 12e3, a = 8, h = 1, l = 1e4;
function u(t) {
  const e = (t || "").trim();
  if (!e) return "";
  if (/^wss?:\/\//i.test(e)) return e;
  if (typeof window > "u" || !window.location) return "";
  try {
    const s = new URL(e, window.location.href);
    if (s.protocol === "http:" || s.protocol === "https:")
      return s.protocol = s.protocol === "https:" ? "wss:" : "ws:", s.toString();
  } catch {
    return "";
  }
  return "";
}
var d = class {
  constructor(t) {
    this.ws = null, this.reconnectTimer = null, this.reconnectStabilityTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = t;
  }
  getWebSocketURL() {
    return u(this.options.url || "");
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
    const e = new WebSocket(t);
    this.ws = e, e.onopen = () => {
      this.ws === e && (this.hasConnected = !0, this.scheduleReconnectBudgetReset(e), this.setStatus("connected"), this.flushPending());
    }, e.onmessage = (s) => {
      if (this.ws === e && !(!s || typeof s.data != "string"))
        try {
          this.handleMessage(JSON.parse(s.data));
        } catch {
        }
    }, e.onclose = (s) => {
      if (this.ws === e) {
        if (this.clearReconnectStabilityTimer(), this.handleSocketClosed(), this.ws = null, this.manualClose) {
          this.setStatus("disconnected");
          return;
        }
        if (this.options.onClose?.(s), this.options.shouldReconnect && !this.options.shouldReconnect(s)) {
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
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.clearReconnectStabilityTimer(), this.ws && this.ws.close();
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
    for (const e of t) this.ws.send(JSON.stringify(e));
  }
  clearReconnectStabilityTimer() {
    this.reconnectStabilityTimer !== null && (window.clearTimeout(this.reconnectStabilityTimer), this.reconnectStabilityTimer = null);
  }
  scheduleReconnectBudgetReset(t) {
    this.clearReconnectStabilityTimer();
    const e = Math.max(this.options.reconnectStabilityMs ?? l, 0);
    this.reconnectStabilityTimer = window.setTimeout(() => {
      this.reconnectStabilityTimer = null, this.ws === t && t.readyState === WebSocket.OPEN && (this.reconnectAttempts = 0);
    }, e);
  }
  scheduleReconnect() {
    const t = this.hasConnected ? this.options.maxReconnectAttempts ?? a : this.options.maxInitialReconnectAttempts ?? h, e = this.options.reconnectDelayMs ?? c, s = this.options.maxReconnectDelayMs ?? r;
    if (this.reconnectAttempts >= t) {
      this.setStatus("disconnected");
      return;
    }
    const i = this.reconnectAttempts, n = Math.min(e * Math.pow(2, i), s), o = n * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, n + o);
  }
};
export {
  u as n,
  d as t
};

//# sourceMappingURL=live-stream-BMaW00QB.js.map
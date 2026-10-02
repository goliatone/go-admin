var c = "go-admin:console:";
function m(t, e) {
  return `${c}${t}:${e}`;
}
var r = 1e3, a = 12e3, h = 8, l = 1, u = 1e4;
function d(t) {
  const e = (t || "").trim();
  if (!e) return "";
  if (/^wss?:\/\//i.test(e)) return e;
  if (typeof window > "u" || !window.location) return "";
  try {
    const n = new URL(e, window.location.href);
    if (n.protocol === "http:" || n.protocol === "https:")
      return n.protocol = n.protocol === "https:" ? "wss:" : "ws:", n.toString();
  } catch {
    return "";
  }
  return "";
}
var f = class {
  constructor(t) {
    this.ws = null, this.reconnectTimer = null, this.reconnectStabilityTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.options = t;
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
    const e = new WebSocket(t);
    this.ws = e, e.onopen = () => {
      this.ws === e && (this.hasConnected = !0, this.scheduleReconnectBudgetReset(e), this.setStatus("connected"), this.flushPending());
    }, e.onmessage = (n) => {
      if (this.ws === e && !(!n || typeof n.data != "string"))
        try {
          this.handleMessage(JSON.parse(n.data));
        } catch {
        }
    }, e.onclose = (n) => {
      if (this.ws === e) {
        if (this.clearReconnectStabilityTimer(), this.handleSocketClosed(), this.ws = null, this.manualClose) {
          this.setStatus("disconnected");
          return;
        }
        if (this.options.onClose?.(n), this.options.shouldReconnect && !this.options.shouldReconnect(n)) {
          this.setStatus("disconnected");
          return;
        }
        this.setStatus("reconnecting"), this.scheduleReconnect();
      }
    }, e.onerror = (n) => {
      this.ws === e && (this.options.onError?.(n), this.setStatus("error"));
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
    const e = Math.max(this.options.reconnectStabilityMs ?? u, 0);
    this.reconnectStabilityTimer = window.setTimeout(() => {
      this.reconnectStabilityTimer = null, this.ws === t && t.readyState === WebSocket.OPEN && (this.reconnectAttempts = 0);
    }, e);
  }
  scheduleReconnect() {
    const t = this.hasConnected ? this.options.maxReconnectAttempts ?? h : this.options.maxInitialReconnectAttempts ?? l, e = this.options.reconnectDelayMs ?? r, n = this.options.maxReconnectDelayMs ?? a;
    if (this.reconnectAttempts >= t) {
      this.setStatus("disconnected");
      return;
    }
    const i = this.reconnectAttempts, s = Math.min(e * Math.pow(2, i), n), o = s * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, s + o);
  }
};
export {
  d as n,
  m as r,
  f as t
};

//# sourceMappingURL=live-stream-CyiSPucB.js.map
const a = (e) => {
  const t = (e || "").trim();
  return t ? t.startsWith("/") ? t.replace(/\/+$/, "") : `/${t.replace(/\/+$/, "")}` : "";
}, r = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", s = a(e);
  return `${t}//${window.location.host}${s}/ws`;
};
class h {
  constructor(t) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.options = t;
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;
    this.manualClose = !1;
    const t = r(this.options.basePath);
    this.ws = new WebSocket(t), this.ws.onopen = () => {
      this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (s) => {
      if (!(!s || typeof s.data != "string"))
        try {
          const n = JSON.parse(s.data);
          this.options.onEvent?.(n);
        } catch {
        }
    }, this.ws.onclose = () => {
      if (this.ws = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting"), this.scheduleReconnect();
    }, this.ws.onerror = (s) => {
      this.options.onError?.(s), this.setStatus("error");
    };
  }
  close() {
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.ws && this.ws.close();
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
  subscribe(t) {
    this.sendCommand({ type: "subscribe", panels: t });
  }
  unsubscribe(t) {
    this.sendCommand({ type: "unsubscribe", panels: t });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(t) {
    this.sendCommand({ type: "clear", panels: t });
  }
  getStatus() {
    return this.status;
  }
  setStatus(t) {
    this.status !== t && (this.status = t, this.options.onStatusChange?.(t));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0)
      return;
    const t = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const s of t)
      this.ws.send(JSON.stringify(s));
  }
  scheduleReconnect() {
    const t = this.options.maxReconnectAttempts ?? 8, s = this.options.reconnectDelayMs ?? 1e3, n = this.options.maxReconnectDelayMs ?? 12e3;
    if (this.reconnectAttempts >= t) {
      this.setStatus("disconnected");
      return;
    }
    const i = this.reconnectAttempts, o = Math.min(s * Math.pow(2, i), n), c = o * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, o + c);
  }
}
export {
  h as D
};
//# sourceMappingURL=debug-stream-DXYTUS6I.js.map

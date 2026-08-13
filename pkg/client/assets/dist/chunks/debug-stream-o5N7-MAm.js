import { normalizeDebugBasePath as l } from "../debug/shared/path-helpers.js";
var d = 1e3, f = 12e3, p = 8, m = 1, k = 1e4, T = 3e4, y = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", s = l(e);
  return `${t}//${window.location.host}${s}/ws`;
}, b = (e, t, s) => {
  const n = e.trim();
  if (!n || !t || !s) return e;
  const [i, r] = n.split("#"), o = `${i}${i.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return r ? `${o}#${r}` : o;
}, S = (e) => {
  if (!e) return null;
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), s = t.padEnd(t.length + (4 - (t.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(s);
  } catch {
    return null;
  }
  return null;
}, w = (e) => {
  if (!e) return null;
  const t = e.split(".");
  if (t.length < 2) return null;
  const s = S(t[1]);
  if (!s) return null;
  try {
    const n = JSON.parse(s);
    if (typeof n.exp == "number") return n.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, R = (e, t) => {
  if (t) {
    if (typeof t.expiresInMs == "number" && t.expiresInMs > 0) return Date.now() + t.expiresInMs;
    const s = t.expiresAt ?? t.expires_at;
    if (typeof s == "number") return s;
    if (typeof s == "string") {
      const n = new Date(s);
      if (!Number.isNaN(n.getTime())) return n.getTime();
    }
  }
  return w(e);
}, g = class {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectStabilityTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.hasConnected = !1, this.snapshotRecoveryPending = !1, this.options = e;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : y(this.options.basePath || "");
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.manualClose = !1;
    const e = this.getWebSocketURL();
    if (!e) {
      this.setStatus("error");
      return;
    }
    const t = new WebSocket(e);
    this.ws = t, t.onopen = () => {
      this.ws === t && (this.hasConnected = !0, this.scheduleReconnectBudgetReset(t), this.setStatus("connected"), this.flushPending());
    }, t.onmessage = (s) => {
      if (this.ws === t && !(!s || typeof s.data != "string"))
        try {
          const n = JSON.parse(s.data);
          if (n?.type === "snapshot_invalidated") {
            this.snapshotRecoveryPending || (this.snapshotRecoveryPending = !0, this.requestSnapshot()), this.options.onSnapshotInvalidated?.();
            return;
          }
          n?.type === "snapshot" && (this.snapshotRecoveryPending = !1), this.options.onEvent?.(n);
        } catch {
        }
    }, t.onclose = () => {
      if (this.ws === t) {
        if (this.clearReconnectStabilityTimer(), this.snapshotRecoveryPending = !1, this.ws = null, this.manualClose) {
          this.setStatus("disconnected");
          return;
        }
        this.setStatus("reconnecting"), this.scheduleReconnect();
      }
    }, t.onerror = (s) => {
      this.ws === t && (this.options.onError?.(s), this.setStatus("error"));
    };
  }
  close() {
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.clearReconnectStabilityTimer(), this.ws && this.ws.close();
  }
  sendCommand(e) {
    if (!(!e || !e.type)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(e));
        return;
      }
      this.pendingCommands.push(e);
    }
  }
  subscribe(e) {
    this.sendCommand({
      type: "subscribe",
      panels: e
    });
  }
  unsubscribe(e) {
    this.sendCommand({
      type: "unsubscribe",
      panels: e
    });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(e) {
    this.sendCommand({
      type: "clear",
      panels: e
    });
  }
  getStatus() {
    return this.status;
  }
  setStatus(e) {
    this.status !== e && (this.status = e, this.options.onStatusChange?.(e));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0) return;
    const e = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const t of e) this.ws.send(JSON.stringify(t));
  }
  clearReconnectStabilityTimer() {
    this.reconnectStabilityTimer !== null && (window.clearTimeout(this.reconnectStabilityTimer), this.reconnectStabilityTimer = null);
  }
  scheduleReconnectBudgetReset(e) {
    this.clearReconnectStabilityTimer();
    const t = Math.max(this.options.reconnectStabilityMs ?? k, 0);
    this.reconnectStabilityTimer = window.setTimeout(() => {
      this.reconnectStabilityTimer = null, this.ws === e && e.readyState === WebSocket.OPEN && (this.reconnectAttempts = 0);
    }, t);
  }
  scheduleReconnect() {
    const e = this.hasConnected ? this.options.maxReconnectAttempts ?? p : this.options.maxInitialReconnectAttempts ?? m, t = this.options.reconnectDelayMs ?? d, s = this.options.maxReconnectDelayMs ?? f;
    if (this.reconnectAttempts >= e) {
      this.setStatus("disconnected");
      return;
    }
    const n = this.reconnectAttempts, i = Math.min(t * Math.pow(2, n), s), r = i * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null, this.connect();
    }, i + r);
  }
}, v = class extends g {
  constructor(e) {
    const { url: t, authToken: s, tokenProvider: n, tokenRefreshBufferMs: i, tokenParam: r, appId: o, onEvent: h, ...c } = e, u = (a) => {
      if (o && a && !a.app_id) {
        h?.({
          ...a,
          app_id: o
        });
        return;
      }
      h?.(a);
    };
    super({
      ...c,
      url: t,
      onEvent: u
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = t, this.tokenProvider = n, this.tokenRefreshBufferMs = i ?? T, this.tokenParam = r || "token", s && this.setToken(s);
  }
  getWebSocketURL() {
    return this.authToken ? b(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
  }
  connect() {
    this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) || this.ensureToken().then((e) => {
      e && super.connect();
    });
  }
  close() {
    this.clearTokenRefresh(), super.close();
  }
  clearTokenRefresh() {
    this.tokenRefreshTimer !== null && (clearTimeout(this.tokenRefreshTimer), this.tokenRefreshTimer = null);
  }
  scheduleTokenRefresh() {
    if (!this.tokenExpiresAt || !this.tokenProvider) return;
    const e = Math.max(this.tokenExpiresAt - Date.now() - this.tokenRefreshBufferMs, 0);
    this.clearTokenRefresh(), this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
    }, e);
  }
  setToken(e, t) {
    this.authToken = e, this.tokenExpiresAt = R(e, t), this.scheduleTokenRefresh();
  }
  tokenNeedsRefresh() {
    return this.tokenExpiresAt ? Date.now() + this.tokenRefreshBufferMs >= this.tokenExpiresAt : !1;
  }
  async ensureToken() {
    return this.tokenProvider ? this.authToken && !this.tokenNeedsRefresh() ? !0 : this.refreshToken() : this.authToken != null;
  }
  async refreshToken() {
    if (!this.tokenProvider) return this.authToken != null;
    try {
      const e = await this.tokenProvider();
      return !e || !e.token ? (this.setStatus("error"), !1) : (this.setToken(e.token, e), this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.close(), !0);
    } catch {
      return this.setStatus("error"), !1;
    }
  }
};
export {
  v as n,
  g as t
};

//# sourceMappingURL=debug-stream-o5N7-MAm.js.map
import { t as p } from "./live-stream-BMaW00QB.js";
import { normalizeDebugBasePath as c } from "../debug/shared/path-helpers.js";
var d = 3e4, f = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", s = c(e);
  return `${t}//${window.location.host}${s}/ws`;
}, k = (e, t, s) => {
  const r = e.trim();
  if (!r || !t || !s) return e;
  const [o, i] = r.split("#"), n = `${o}${o.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return i ? `${n}#${i}` : n;
}, m = (e) => {
  if (!e) return null;
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), s = t.padEnd(t.length + (4 - (t.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(s);
  } catch {
    return null;
  }
  return null;
}, T = (e) => {
  if (!e) return null;
  const t = e.split(".");
  if (t.length < 2) return null;
  const s = m(t[1]);
  if (!s) return null;
  try {
    const r = JSON.parse(s);
    if (typeof r.exp == "number") return r.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, b = (e, t) => {
  if (t) {
    if (typeof t.expiresInMs == "number" && t.expiresInMs > 0) return Date.now() + t.expiresInMs;
    const s = t.expiresAt ?? t.expires_at;
    if (typeof s == "number") return s;
    if (typeof s == "string") {
      const r = new Date(s);
      if (!Number.isNaN(r.getTime())) return r.getTime();
    }
  }
  return T(e);
}, y = class extends p {
  constructor(e) {
    super(e), this.snapshotRecoveryPending = !1;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : f(this.options.basePath || "");
  }
  handleMessage(e) {
    const t = e;
    if (t?.type === "snapshot_invalidated") {
      this.snapshotRecoveryPending || (this.snapshotRecoveryPending = !0, this.requestSnapshot()), this.options.onSnapshotInvalidated?.();
      return;
    }
    t?.type === "snapshot" && (this.snapshotRecoveryPending = !1), this.options.onEvent?.(t);
  }
  handleSocketClosed() {
    this.snapshotRecoveryPending = !1;
  }
  sendCommand(e) {
    super.sendCommand(e);
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
    return super.getStatus();
  }
  setStatus(e) {
    super.setStatus(e);
  }
}, g = class extends y {
  constructor(e) {
    const { url: t, authToken: s, tokenProvider: r, tokenRefreshBufferMs: o, tokenParam: i, appId: n, onEvent: h, ...u } = e, l = (a) => {
      if (n && a && !a.app_id) {
        h?.({
          ...a,
          app_id: n
        });
        return;
      }
      h?.(a);
    };
    super({
      ...u,
      url: t,
      onEvent: l
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = t, this.tokenProvider = r, this.tokenRefreshBufferMs = o ?? d, this.tokenParam = i || "token", s && this.setToken(s);
  }
  getWebSocketURL() {
    return this.authToken ? k(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
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
    this.authToken = e, this.tokenExpiresAt = b(e, t), this.scheduleTokenRefresh();
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
function S(e) {
  let t = null;
  return {
    load: () => (t || (t = e().catch((s) => {
      throw t = null, s;
    })), t),
    reset: () => {
      t = null;
    }
  };
}
export {
  y as n,
  g as r,
  S as t
};

//# sourceMappingURL=capability-loader-DZC_IOL_.js.map
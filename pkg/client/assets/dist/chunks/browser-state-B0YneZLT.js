import { r as f, t as p } from "./live-stream-BGAv0d6b.js";
import { normalizeDebugBasePath as d } from "../debug/shared/path-helpers.js";
var k = 3e4, m = (e) => {
  const t = window.location.protocol === "https:" ? "wss:" : "ws:", s = d(e);
  return `${t}//${window.location.host}${s}/ws`;
}, T = (e, t, s) => {
  const r = e.trim();
  if (!r || !t || !s) return e;
  const [n, o] = r.split("#"), i = `${n}${n.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return o ? `${i}#${o}` : i;
}, b = (e) => {
  if (!e) return null;
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), s = t.padEnd(t.length + (4 - (t.length % 4 || 4)) % 4, "=");
  try {
    if (typeof globalThis.atob == "function") return globalThis.atob(s);
  } catch {
    return null;
  }
  return null;
}, y = (e) => {
  if (!e) return null;
  const t = e.split(".");
  if (t.length < 2) return null;
  const s = b(t[1]);
  if (!s) return null;
  try {
    const r = JSON.parse(s);
    if (typeof r.exp == "number") return r.exp * 1e3;
  } catch {
    return null;
  }
  return null;
}, g = (e, t) => {
  if (t) {
    if (typeof t.expiresInMs == "number" && t.expiresInMs > 0) return Date.now() + t.expiresInMs;
    const s = t.expiresAt ?? t.expires_at;
    if (typeof s == "number") return s;
    if (typeof s == "string") {
      const r = new Date(s);
      if (!Number.isNaN(r.getTime())) return r.getTime();
    }
  }
  return y(e);
}, R = class extends p {
  constructor(e) {
    super(e), this.snapshotRecoveryPending = !1;
  }
  getWebSocketURL() {
    return this.options.url ? this.options.url : m(this.options.basePath || "");
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
}, w = class extends R {
  constructor(e) {
    const { url: t, authToken: s, tokenProvider: r, tokenRefreshBufferMs: n, tokenParam: o, appId: i, onEvent: u, ...l } = e, c = (a) => {
      if (i && a && !a.app_id) {
        u?.({
          ...a,
          app_id: i
        });
        return;
      }
      u?.(a);
    };
    super({
      ...l,
      url: t,
      onEvent: c
    }), this.authToken = null, this.tokenRefreshTimer = null, this.tokenExpiresAt = null, this.baseUrl = t, this.tokenProvider = r, this.tokenRefreshBufferMs = n ?? k, this.tokenParam = o || "token", s && this.setToken(s);
  }
  getWebSocketURL() {
    return this.authToken ? T(this.baseUrl, this.tokenParam, this.authToken) : this.baseUrl;
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
    this.authToken = e, this.tokenExpiresAt = g(e, t), this.scheduleTokenRefresh();
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
function x(e) {
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
function h(e, t) {
  try {
    return t ? (e === "local" ? t.local : t.session) ?? null : (e === "local" ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}
function P(e, t = null) {
  const s = typeof e == "string" ? e.trim() : "", r = (n) => s ? f(s, n) : n;
  return {
    scoped: s !== "",
    get: (n, o = "local") => {
      try {
        return h(o, t)?.getItem(r(n)) ?? null;
      } catch {
        return null;
      }
    },
    set: (n, o, i = "local") => {
      try {
        h(i, t)?.setItem(r(n), o);
      } catch {
      }
    },
    remove: (n, o = "local") => {
      try {
        h(o, t)?.removeItem(r(n));
      } catch {
      }
    }
  };
}
export {
  w as i,
  x as n,
  R as r,
  P as t
};

//# sourceMappingURL=browser-state-B0YneZLT.js.map
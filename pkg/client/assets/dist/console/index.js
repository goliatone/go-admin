import { escapeAttribute as v, escapeHTML as b } from "../shared/html.js";
import { httpRequest as q, readExpectedHTTPJSON as H, readHTTPStructuredErrorResult as j } from "../shared/transport/http-client.js";
import { C as B, S as W, _ as ke, a as f, b as R, d as Le, g as De, h as Me, i as Fe, l as $e, n as Oe, o as Ne, r as U, y as C } from "../chunks/hydrate-mOOlPiY2.js";
import { a as Y, c as Ie, d as qe, i as J, l as He, o as je, r as Be, s as We, u as Ue } from "../chunks/avatar-DIbK-LSg.js";
import { n as Je, t as z } from "../chunks/live-stream-BMaW00QB.js";
import { i as Ke, n as Ve, r as K, t as Ge } from "../chunks/actions-zb2HbM0q.js";
var V = 1e3, G = 500, X = /* @__PURE__ */ new Set([
  "upsert",
  "delete",
  "invalidate"
]), Q = [
  "console_id",
  "application_id",
  "environment_id",
  "actor_id",
  "scope_key"
];
function S(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function m(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function h(e) {
  return typeof e == "string" ? e.trim() : "";
}
function E(e) {
  const t = S(e) ? e : {};
  return {
    console_id: h(t.console_id),
    application_id: h(t.application_id),
    environment_id: h(t.environment_id),
    actor_id: h(t.actor_id),
    scope_key: h(t.scope_key)
  };
}
function _(e, t) {
  const s = E(t);
  return Q.every((i) => e[i] === s[i]);
}
function Z(e) {
  if (!S(e)) return null;
  const t = h(e.record_key);
  if (!t) return null;
  const s = {
    record_key: t,
    revision: m(e.revision) ?? 0,
    data: e.data
  }, i = h(e.target_id);
  i && (s.target_id = i);
  const r = m(e.generation);
  return r !== null && (s.generation = r), s;
}
function T(e, t) {
  return `${e}\0${t}`;
}
var ee = class {
  constructor(e) {
    this.panels = /* @__PURE__ */ new Map(), this.generations = /* @__PURE__ */ new Map(), this.lastSequence = null, this.recovering = !0, this.buffer = [], this.bufferOverflowed = !1, this.identity = E(e.identity), this.sequenceMode = e.sequenceMode === "contiguous" ? "contiguous" : "monotonic", this.maxBufferedEvents = Math.max(1, e.maxBufferedEvents ?? V), this.maxRecordsPerPanel = Math.max(1, e.maxRecordsPerPanel ?? G);
  }
  watermark() {
    return this.lastSequence;
  }
  isRecovering() {
    return this.recovering;
  }
  panelIds() {
    return Array.from(this.panels.keys());
  }
  hasPanel(e) {
    return this.panels.has(e);
  }
  records(e) {
    const t = this.panels.get(e);
    return t ? Array.from(t.values()) : [];
  }
  beginRecovery() {
    this.recovering = !0;
  }
  clear() {
    this.panels.clear(), this.generations.clear(), this.lastSequence = null, this.buffer = [], this.bufferOverflowed = !1, this.recovering = !0;
  }
  applySnapshot(e) {
    if (!S(e) || !Array.isArray(e.panels)) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    const t = m(e.watermark);
    if (t === null || t < 0) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    if (!_(this.identity, e)) return {
      ok: !1,
      reason: "foreign",
      replayed: 0,
      needsRecovery: !1
    };
    const s = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
    for (const l of e.panels) {
      const c = S(l) ? h(l.id).toLowerCase() : "";
      if (!c || s.has(c)) continue;
      const y = /* @__PURE__ */ new Map(), x = Array.isArray(l.records) ? l.records : [];
      for (const I of x) {
        const u = Z(I);
        if (u && (y.delete(u.record_key), y.set(u.record_key, u), u.target_id && u.generation !== void 0)) {
          const P = T(c, u.target_id);
          i.set(P, Math.max(i.get(P) ?? u.generation, u.generation));
        }
      }
      w(y, this.maxRecordsPerPanel), s.set(c, y);
    }
    this.panels = s, this.generations = i, this.lastSequence = t, this.recovering = !1;
    const r = [...this.buffer].sort((l, c) => l.sequence - c.sequence), n = this.bufferOverflowed;
    this.buffer = [], this.bufferOverflowed = !1;
    let o = 0, a = !1;
    for (const l of r) {
      const c = this.applyEvent(l);
      c === "applied" ? o += 1 : (c === "gap" || c === "invalidated") && (a = !0);
    }
    return n && !a && (a = !0, this.recovering = !0), {
      ok: !0,
      replayed: o,
      needsRecovery: a
    };
  }
  applyEvent(e) {
    if (!S(e)) return "malformed";
    const t = m(e.sequence), s = h(e.kind);
    return t === null || !X.has(s) ? "malformed" : _(this.identity, e) ? s === "invalidate" ? (this.recovering = !0, "invalidated") : this.recovering || this.lastSequence === null ? (this.bufferEvent(e), "buffered") : t <= this.lastSequence ? "duplicate" : this.sequenceMode === "contiguous" && t > this.lastSequence + 1 ? (this.recovering = !0, this.bufferEvent(e), "gap") : (this.lastSequence = t, this.applyRecordEvent(e, s)) : "foreign";
  }
  bufferEvent(e) {
    this.buffer.length >= this.maxBufferedEvents && (this.buffer.shift(), this.bufferOverflowed = !0), this.buffer.push(e);
  }
  acceptGeneration(e, t, s) {
    if (!t || s === null) return !0;
    const i = T(e, t), r = this.generations.get(i);
    return r !== void 0 && s < r ? !1 : (this.generations.set(i, s), !0);
  }
  applyRecordEvent(e, t) {
    const s = h(e.panel_id).toLowerCase(), i = this.panels.get(s);
    if (!i) return "foreign";
    const r = h(e.record_key);
    if (!r) return "malformed";
    const n = h(e.target_id), o = m(e.generation);
    if (!this.acceptGeneration(s, n, o)) return "stale";
    const a = i.get(r), l = m(e.revision);
    if (l !== null && a && l <= a.revision) return "stale";
    if (t === "delete") return a && i.delete(r) ? "applied" : "stale";
    const c = {
      record_key: r,
      revision: l ?? (a ? a.revision + 1 : 0),
      data: e.data
    };
    return n && (c.target_id = n), o !== null && (c.generation = o), i.set(r, c), w(i, this.maxRecordsPerPanel), "applied";
  }
};
function w(e, t) {
  for (; e.size > t; ) {
    const s = e.keys().next().value;
    if (s === void 0) return;
    e.delete(s);
  }
}
var te = "go-admin:console:";
function se(e) {
  return JSON.stringify({
    console_id: e.console_id,
    application_id: e.application_id,
    environment_id: e.environment_id,
    actor_id: e.actor_id,
    scope_key: e.scope_key
  });
}
function ie(e) {
  try {
    return (e === "local" ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}
var re = class {
  constructor(e, t = null) {
    this.prefix = `${te}${e}:`, this.provider = t;
  }
  keyFor(e) {
    return `${this.prefix}${e}`;
  }
  get(e, t = "local") {
    const s = this.storage(t);
    if (!s) return null;
    try {
      return s.getItem(this.keyFor(e));
    } catch {
      return null;
    }
  }
  set(e, t, s = "local") {
    const i = this.storage(s);
    if (!i) return !1;
    try {
      return i.setItem(this.keyFor(e), t), !0;
    } catch {
      return !1;
    }
  }
  remove(e, t = "local") {
    const s = this.storage(t);
    if (s)
      try {
        s.removeItem(this.keyFor(e));
      } catch {
      }
  }
  getJSON(e, t = "local") {
    const s = this.get(e, t);
    if (s === null) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  setJSON(e, t, s = "local") {
    let i;
    try {
      i = JSON.stringify(t);
    } catch {
      return !1;
    }
    return this.set(e, i, s);
  }
  clear() {
    for (const e of ["local", "session"]) {
      const t = this.storage(e);
      if (t)
        try {
          const s = [];
          for (let i = 0; i < t.length; i += 1) {
            const r = t.key(i);
            r && r.startsWith(this.prefix) && s.push(r);
          }
          s.forEach((i) => t.removeItem(i));
        } catch {
        }
    }
  }
  migrateLegacy(e) {
    let t = 0;
    return e.forEach(({ legacyKey: s, key: i, area: r }) => {
      const n = this.storage(r);
      if (!(!n || !s))
        try {
          const o = n.getItem(s);
          if (o === null) return;
          n.getItem(this.keyFor(i)) === null && (n.setItem(this.keyFor(i), o), t += 1), n.removeItem(s);
        } catch {
        }
    }), t;
  }
  storage(e) {
    return this.provider ? (e === "local" ? this.provider.local : this.provider.session) ?? null : ie(e);
  }
}, ne = /* @__PURE__ */ new Set([
  "retry",
  "reload",
  "none"
]);
function k(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return {};
  const t = {};
  return Object.entries(e).forEach(([s, i]) => {
    if (typeof i == "string" && i.trim()) t[s] = i.trim();
    else if (Array.isArray(i)) {
      const r = i.filter((n) => typeof n == "string" && n.trim()).join("; ");
      r && (t[s] = r);
    }
  }), t;
}
function oe(e) {
  return e === 401 ? "reload" : e === 0 || e === 408 || e === 429 || e >= 500 ? "retry" : "none";
}
async function ae(e, t) {
  const s = await j(e, t, { appendStatusToFallback: !1 }), i = s.payload && typeof s.payload == "object" ? s.payload : {}, r = s.details || {}, n = {
    ...k(i.fields),
    ...k(r.fields)
  }, o = String(r.action ?? i.action ?? "").trim().toLowerCase(), a = typeof s.message == "string" && s.message.trim() && s.message.length <= 500 ? s.message.trim() : t;
  return {
    status: e.status,
    code: s.code || (e.status === 401 ? "UNAUTHORIZED" : e.status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message: a,
    fields: n,
    action: ne.has(o) ? o : oe(e.status)
  };
}
function ce(e) {
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: e,
    fields: {},
    action: "retry"
  };
}
async function L(e, t) {
  const { timeoutMs: s = 1e4, fallbackError: i, signal: r, ...n } = t, o = typeof AbortController < "u" ? new AbortController() : null, a = () => o?.abort();
  let l;
  r && (r.aborted ? a() : r.addEventListener("abort", a, { once: !0 })), o && s > 0 && (l = setTimeout(a, s));
  try {
    const c = await q(e, {
      credentials: "same-origin",
      ...n,
      signal: o?.signal ?? r
    });
    if (!c.ok) return {
      ok: !1,
      status: c.status,
      error: await ae(c, i)
    };
    const y = await H(c);
    return {
      ok: !0,
      status: c.status,
      value: y
    };
  } catch (c) {
    return c && typeof c == "object" && c.name === "HTTPAuthenticationRequiredError" ? {
      ok: !1,
      status: 401,
      error: {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Your session expired. Sign in again to continue.",
        fields: {},
        action: "reload"
      }
    } : {
      ok: !1,
      status: 0,
      error: ce(i)
    };
  } finally {
    l !== void 0 && clearTimeout(l), r?.removeEventListener("abort", a);
  }
}
function le(e, t) {
  let s = e;
  return Object.entries(t).forEach(([i, r]) => {
    const n = encodeURIComponent(r), o = i.replace(/_id$|_key$/, "");
    s = s.split(`{${i}}`).join(n).split(`{${o}}`).join(n).replace(new RegExp(`:${i}(?=$|[/?#.])`, "g"), () => n).replace(new RegExp(`:${o}(?=$|[/?#.])`, "g"), () => n);
  }), s;
}
var A = "[data-console-root]", he = 'script[type="application/json"][data-console-bootstrap]', de = /* @__PURE__ */ new Set([
  "table",
  "status_list",
  "timeline"
]), D = /* @__PURE__ */ new Set([
  1008,
  4401,
  4403
]), ue = [
  1e3,
  2e3,
  5e3,
  1e4,
  3e4
], M = "active-panel", fe = 16, pe = 5e3, ye = 3, me = 6e4, g = /* @__PURE__ */ new WeakMap(), ge = 0;
function p(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function d(e) {
  return typeof e == "string" ? e.trim() : "";
}
function ve(e) {
  if (!p(e)) return null;
  const t = d(e.snapshot);
  return t ? {
    page: d(e.page) || void 0,
    panels: d(e.panels) || void 0,
    snapshot: t,
    actions: d(e.actions) || void 0,
    preferences: d(e.preferences) || void 0,
    live: d(e.live) || void 0,
    lookup: d(e.lookup) || void 0
  } : null;
}
function be(e) {
  const t = Array.from(e.querySelectorAll(he)).find((s) => s.closest(A) === e);
  if (!t) return null;
  try {
    return N(JSON.parse(t.textContent || ""));
  } catch {
    return null;
  }
}
function N(e) {
  if (!p(e)) return null;
  const t = E(e), s = ve(e.urls);
  return !t.console_id || !s ? null : {
    ...t,
    title: d(e.title) || void 0,
    urls: s,
    preferences_namespace: d(e.preferences_namespace) || void 0,
    snapshot: p(e.snapshot) ? e.snapshot : void 0
  };
}
function Se(e) {
  return typeof e.watermark == "number" && Array.isArray(e.panels) && typeof e.console_id == "string";
}
function Ae(e, t, s) {
  const [i, r] = e.split("#"), n = `${i}${i.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return r === void 0 ? n : `${n}#${r}`;
}
function F(e) {
  return p(e) && typeof e.sequence == "number" && typeof e.kind == "string" && typeof e.console_id == "string";
}
function $(e) {
  const t = globalThis.CSS?.escape;
  return t ? t(e) : e.replace(/["\\]/g, "\\$&");
}
function Ee(e) {
  if (typeof requestAnimationFrame == "function") {
    const s = requestAnimationFrame(() => e());
    return () => cancelAnimationFrame(s);
  }
  const t = setTimeout(e, fe);
  return () => clearTimeout(t);
}
var Pe = class {
  constructor(e, t, s = {}) {
    this.serverDefinitions = /* @__PURE__ */ new Map(), this.filterState = /* @__PURE__ */ new Map(), this.actionResults = /* @__PURE__ */ new Map(), this.controllers = /* @__PURE__ */ new Set(), this.cleanup = [], this.state = "loading", this.connection = "offline", this.activePanel = "", this.policyCloses = [], this.stream = null, this.recoveryPromise = null, this.recoveryPending = !1, this.recoveryAttempts = 0, this.recoveryTimer = null, this.cancelFrame = null, this.dirtyPanels = /* @__PURE__ */ new Set(), this.structureDirty = !1, this.livePanels = [], this.snapshotWaitTimer = null, this.definitionSignatures = /* @__PURE__ */ new Map(), this.notice = {
      kind: "loading",
      message: "Loading console…",
      action: "none"
    }, this.root = e, this.bootstrap = t, this.options = s, this.styles = s.styles || B, this.identity = E(t), this.idScope = `console-${ge += 1}`, this.registry = J(), this.store = new ee({
      identity: this.identity,
      sequenceMode: "monotonic"
    }), this.preferences = new re(t.preferences_namespace || se(this.identity), s.storage ?? null), (s.panels || []).forEach((i) => this.registry.register(i)), this.root.classList.add("console-root"), this.regions = this.ensureRegions(), this.bindEvents(), this.root.dataset.consoleState = "loading", this.root.dataset.consoleSync = "recovering", this.render(), this.start();
  }
  getState() {
    return this.state;
  }
  getConnectionState() {
    return this.connection;
  }
  getPanels() {
    return this.visiblePanels();
  }
  getActivePanel() {
    return this.activePanel;
  }
  getPanelData(e) {
    return this.panelData(f(e));
  }
  selectPanel(e, t = !1) {
    const s = f(e);
    return !s || !this.visiblePanels().includes(s) || this.state === "disposed" ? !1 : (s !== this.activePanel && (this.activePanel = s, this.preferences.set(M, s, "session"), this.renderTabs(), this.renderFilters(), this.renderPanel(!0)), t && this.tabButton(s)?.focus(), !0);
  }
  refresh() {
    this.recoveryAttempts = 0, this.policyCloses = [];
    const e = this.recover();
    return (!this.stream || this.stream.getStatus() === "disconnected") && e.then(() => {
      !this.isClosed() && this.state === "ready" && (!this.stream || this.stream.getStatus() === "disconnected") && (this.closeLive(), this.connectLive());
    }), e;
  }
  destroy() {
    this.state !== "disposed" && (this.state = "disposed", this.closeLive(), this.controllers.forEach((e) => e.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.cancelFrame?.(), this.cancelFrame = null, this.cleanup.splice(0).forEach((e) => e()), this.registry.dispose(), this.store.clear(), this.serverDefinitions.clear(), this.actionResults.clear(), this.filterState.clear(), g.get(this.root) === this && g.delete(this.root), this.root.dataset.consoleState = "disposed");
  }
  async start() {
    this.bootstrap.snapshot ? this.acceptSnapshot(this.bootstrap.snapshot) : await this.recover(), !this.isClosed() && this.connectLive();
  }
  isClosed() {
    return this.state === "disposed" || this.state === "denied";
  }
  recover() {
    if (this.isClosed()) return Promise.resolve();
    if (this.recoveryPromise)
      return this.recoveryPending = !0, this.recoveryPromise;
    const e = this.runRecovery().finally(() => {
      this.recoveryPromise === e && (this.recoveryPromise = null);
    });
    return this.recoveryPromise = e, e;
  }
  async runRecovery() {
    for (; ; ) {
      if (this.isClosed()) return;
      this.recoveryTimer !== null && (clearTimeout(this.recoveryTimer), this.recoveryTimer = null), this.recoveryPending = !1, this.store.beginRecovery(), this.root.dataset.consoleSync = "recovering";
      const e = new AbortController();
      this.controllers.add(e);
      const t = await L(this.bootstrap.urls.snapshot, {
        method: "GET",
        signal: e.signal,
        timeoutMs: this.options.requestTimeoutMs,
        fallbackError: "Unable to load console data."
      });
      if (this.controllers.delete(e), this.isClosed()) return;
      if (!t.ok) {
        t.status === 401 || t.status === 403 ? this.deny(t.error) : this.scheduleRecoveryRetry(t.error.message);
        return;
      }
      if (this.acceptSnapshot(t.value)) {
        if (this.isClosed()) return;
        if (this.recoveryAttempts += 1, this.recoveryAttempts > this.maxRecoveryAttempts()) {
          this.recoveryAttempts = 0, this.setNotice("error", "Live updates are out of sync. Refresh to load the latest data.", "retry");
          return;
        }
        continue;
      }
      if (this.recoveryAttempts = 0, !this.recoveryPending || this.isClosed()) return;
    }
  }
  maxRecoveryAttempts() {
    return Math.max(1, this.options.maxRecoveryAttempts ?? 5);
  }
  scheduleRecoveryRetry(e) {
    const t = this.options.recoveryDelaysMs || ue, s = this.recoveryAttempts;
    if (this.recoveryAttempts += 1, s >= this.maxRecoveryAttempts() || t.length === 0) {
      this.recoveryAttempts = 0, this.setState(this.state === "loading" ? "error" : this.state), this.setNotice("error", e, "retry");
      return;
    }
    this.state === "loading" && this.setNotice("loading", `${e} Retrying…`, "none");
    const i = t[Math.min(s, t.length - 1)];
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null, this.recover();
    }, Math.max(0, i));
  }
  acceptSnapshot(e) {
    const t = this.store.applySnapshot(e);
    return t.ok ? (this.syncDefinitions(e.panels), this.setState("ready"), this.root.dataset.consoleSync = t.needsRecovery ? "recovering" : "current", this.setNotice("none", "", "none"), this.syncSubscription(), this.structureDirty = !0, this.flush(), t.needsRecovery) : (t.reason === "foreign" ? this.deny({
      status: 409,
      code: "IDENTITY_CHANGED",
      message: "Your console session changed. Reload to continue.",
      fields: {},
      action: "reload"
    }) : (this.setState(this.state === "loading" ? "error" : this.state), this.setNotice("error", "The console received malformed data.", "retry")), !1);
  }
  syncDefinitions(e) {
    const t = /* @__PURE__ */ new Set();
    e.forEach((i) => {
      const r = f(i?.id);
      if (!r || t.has(r)) return;
      t.add(r);
      const { records: n, ...o } = i, a = W(JSON.stringify(o));
      if (this.definitionSignatures.get(r) === a && this.registry.has(r)) return;
      this.definitionSignatures.set(r, a), this.serverDefinitions.set(r, o);
      const l = U(o, {
        consoleRenderer: this.options.renderers?.[r],
        styles: this.styles
      });
      l && this.registry.registerServerDefinition(l);
    });
    for (const i of Array.from(this.serverDefinitions.keys())) t.has(i) || (this.serverDefinitions.delete(i), this.definitionSignatures.delete(i), this.filterState.delete(i), this.actionResults.delete(i), this.registry.isServerDefinition(i) && this.registry.unregister(i));
    const s = this.visiblePanels();
    if (!s.includes(this.activePanel)) {
      const i = f(this.preferences.get(M, "session"));
      this.activePanel = s.includes(i) ? i : s[0] || "";
    }
  }
  connectLive() {
    const e = this.bootstrap.urls.live;
    if (!e || this.options.live === !1 || this.isClosed()) {
      this.setConnection("offline");
      return;
    }
    const t = this.store.panelIds();
    this.livePanels = t;
    const s = new z({
      ...this.options.liveOptions || {},
      url: Ae(e, "panels", t.join(",")),
      onMessage: (i) => {
        this.stream === s && this.handleLiveMessage(i);
      },
      onStatusChange: (i) => {
        this.stream === s && this.handleLiveStatus(i);
      },
      onClose: (i) => {
        this.stream === s && D.has(i.code) && this.verifyAccessAfterClose();
      },
      shouldReconnect: (i) => !D.has(i.code)
    });
    this.stream = s, s.connect();
  }
  closeLive() {
    const e = this.stream;
    this.stream = null, this.clearSnapshotWait(), e?.close();
  }
  handleLiveStatus(e) {
    this.isClosed() || (this.setConnection(e), e === "connected" ? this.awaitStreamSnapshot() : e === "disconnected" && (this.clearSnapshotWait(), this.recover()));
  }
  awaitStreamSnapshot() {
    this.store.beginRecovery(), this.root.dataset.consoleSync = "recovering", this.clearSnapshotWait(), this.snapshotWaitTimer = setTimeout(() => {
      this.snapshotWaitTimer = null, this.recover();
    }, Math.max(0, this.options.snapshotWaitMs ?? pe));
  }
  clearSnapshotWait() {
    this.snapshotWaitTimer !== null && (clearTimeout(this.snapshotWaitTimer), this.snapshotWaitTimer = null);
  }
  syncSubscription() {
    this.stream && this.store.panelIds().some((e) => !this.livePanels.includes(e)) && (this.closeLive(), this.connectLive());
  }
  async verifyAccessAfterClose() {
    if (this.isClosed()) return;
    this.closeLive();
    const e = Date.now();
    if (this.policyCloses = this.policyCloses.filter((t) => e - t < me), this.policyCloses.push(e), await this.recover(), !(this.isClosed() || this.state !== "ready")) {
      if (this.policyCloses.length > ye) {
        this.setConnection("disconnected"), this.setNotice("error", "Live updates stopped. Refresh to load the latest data.", "retry");
        return;
      }
      this.connectLive();
    }
  }
  handleLiveMessage(e) {
    if (this.isClosed() || !p(e)) return;
    if (Se(e)) {
      this.clearSnapshotWait(), this.acceptSnapshot(e) && this.recover();
      return;
    }
    if (!F(e)) return;
    const t = this.store.applyEvent(e);
    t === "applied" ? this.markPanelDirty(f(e.panel_id)) : t === "invalidated" ? this.awaitStreamSnapshot() : t === "gap" && this.recover();
  }
  deny(e) {
    if (this.state === "disposed") return;
    this.state = "denied", this.root.dataset.consoleState = "denied", this.closeLive(), this.controllers.forEach((s) => s.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.recoveryPending = !1, this.store.clear(), this.registry.clearServerDefinitions(), this.serverDefinitions.clear(), this.definitionSignatures.clear(), this.livePanels = [], this.actionResults.clear(), this.filterState.clear(), this.preferences.clear(), this.activePanel = "", this.setConnection("offline");
    const t = e.status === 401 ? "Your session expired. Sign in again to continue." : e.code === "IDENTITY_CHANGED" ? e.message : "You do not have access to this console.";
    this.setNotice("denied", t, "reload"), this.structureDirty = !0, this.flush();
  }
  declaredAction(e, t) {
    return !!this.serverDefinitions.get(e)?.ui?.actions?.some((i) => f(i.id) === t);
  }
  confirmAction(e) {
    const t = d(e.dataset.actionConfirm);
    return e.dataset.actionRequiresConfirm !== "true" && !t ? !0 : (this.options.confirm || ((s) => window.confirm(s)))(t || "Run this action?");
  }
  async runAction(e, t) {
    const s = f(e.dataset.panelId), i = f(e.dataset.actionId), r = this.bootstrap.urls.actions;
    if (this.state !== "ready" || !r || !s || !i || !this.visiblePanels().includes(s) || !this.declaredAction(s, i) || !this.confirmAction(e)) return;
    const n = K(e), o = le(r, {
      panel_id: s,
      action_id: i
    });
    t && (t.disabled = !0), this.clearFieldErrors(e);
    const a = new AbortController();
    this.controllers.add(a);
    const l = await L(o, {
      method: "POST",
      json: n,
      signal: a.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Action failed."
    });
    this.controllers.delete(a), t && (t.disabled = !1), !this.isClosed() && (l.ok ? this.applyActionResult(e, s, i, l.value) : this.applyActionFailure(e, s, i, l.status, l.error));
  }
  applyActionFailure(e, t, s, i, r) {
    if (i === 401) {
      this.deny(r);
      return;
    }
    const n = i === 403 ? "You are not allowed to run this action." : r.message;
    this.showFieldErrors(e, r.fields), this.showActionResult(t, {
      status: "error",
      message: n,
      actionID: s
    }), i === 403 && this.refresh();
  }
  applyActionResult(e, t, s, i) {
    const r = p(i) ? i : {}, n = r.ok === !1;
    n && p(r.errors) && this.showFieldErrors(e, Object.fromEntries(Object.entries(r.errors).map(([o, a]) => [o, typeof a == "string" ? a : C(a, { nullAsEmptyObject: !1 })]))), this.showActionResult(t, {
      status: n ? "error" : "ok",
      message: d(r.message) || (n ? "Action failed." : "Action complete."),
      actionID: s,
      data: r.data
    }), F(r.event) && this.handleLiveMessage(r.event), r.refresh && this.refresh();
  }
  showActionResult(e, t) {
    this.actionResults.set(e, t), e === this.activePanel && this.renderActionResult();
  }
  renderActionResult() {
    const e = this.actionResults.get(this.activePanel), t = Array.from(this.regions.panel.querySelectorAll("[data-panel-action-result]")).find((r) => r.dataset.panelActionResult === this.activePanel);
    if (!t) return;
    if (!e) {
      t.innerHTML = "";
      return;
    }
    const s = e.status === "error" ? this.styles.badgeError : this.styles.badge, i = e.data === void 0 ? "" : `<pre class="${this.styles.jsonPanel}">${b(C(e.data, { nullAsEmptyObject: !1 }))}</pre>`;
    t.innerHTML = `<div class="${s}" role="${e.status === "error" ? "alert" : "status"}">${b(e.message)}</div>${i}`;
  }
  clearFieldErrors(e) {
    e.querySelectorAll("[data-action-field-error]").forEach((t) => {
      t.textContent = "", t.hidden = !0;
    });
  }
  showFieldErrors(e, t) {
    Object.entries(t).forEach(([s, i]) => {
      const r = s.trim(), n = Array.from(e.querySelectorAll("[data-action-field-error]")).find((o) => o.dataset.actionFieldError === r || o.dataset.actionFieldName === r || o.dataset.actionFieldError === `payload.${r}`);
      n && (n.textContent = i, n.hidden = !1);
    });
  }
  ensureRegions() {
    const e = (o) => Array.from(this.root.querySelectorAll(o)).find((a) => a.closest(A) === this.root) || null, t = (o, a, l) => {
      const c = this.root.ownerDocument.createElement(o);
      return c.setAttribute(a, ""), c.className = l, this.root.appendChild(c), c;
    }, s = e("[data-console-notice]") || t("div", "data-console-notice", "console-notice"), i = e("[data-console-tabs]") || t("nav", "data-console-tabs", "console-tabs"), r = e("[data-console-filters]") || t("div", "data-console-filters", "console-filters"), n = e("[data-console-panel]") || t("section", "data-console-panel", "console-panel");
    return i.setAttribute("role", "tablist"), i.hasAttribute("aria-label") || i.setAttribute("aria-label", this.bootstrap.title || "Console panels"), n.id = n.id || `${this.idScope}-panel`, n.setAttribute("role", "tabpanel"), n.tabIndex = 0, {
      tabs: i,
      filters: r,
      panel: n,
      notice: s,
      connection: e("[data-console-connection]"),
      status: e("[data-console-status]")
    };
  }
  listen(e, t, s) {
    e.addEventListener(t, s), this.cleanup.push(() => e.removeEventListener(t, s));
  }
  bindEvents() {
    const { tabs: e, panel: t, filters: s } = this.regions;
    this.listen(e, "click", (i) => {
      const r = i.target?.closest("[data-console-tab]");
      r && e.contains(r) && this.selectPanel(r.dataset.consoleTab || "", !0);
    }), this.listen(e, "keydown", (i) => this.handleTabKeydown(i)), this.listen(s, "input", () => this.updateFilters()), this.listen(s, "change", () => this.updateFilters()), this.listen(t, "click", (i) => {
      const r = i.target?.closest("[data-panel-action]");
      !r || !t.contains(r) || r.disabled || (i.preventDefault(), this.runAction(r, r));
    }), this.listen(t, "submit", (i) => {
      const r = i.target?.closest("form[data-panel-action-form]");
      if (!r || !t.contains(r)) return;
      i.preventDefault();
      const n = r.querySelector('button[type="submit"]');
      n?.disabled || this.runAction(r, n);
    }), this.listen(t, "change", (i) => {
      const r = i.target?.closest("[data-panel-action-picker]");
      r && t.contains(r) && this.updateActionPicker(r);
    }), this.listen(this.root, "click", (i) => {
      const r = i.target?.closest("[data-console-action]");
      if (!r || r.closest(A) !== this.root) return;
      const n = r.dataset.consoleAction;
      n === "retry" || n === "refresh" ? (i.preventDefault(), this.refresh()) : n === "reload" && (i.preventDefault(), this.root.ownerDocument.defaultView?.location.reload());
    });
  }
  handleTabKeydown(e) {
    const t = this.visiblePanels(), s = t.indexOf(this.activePanel);
    if (s < 0 || t.length === 0) return;
    let i = -1;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        i = (s + 1) % t.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        i = (s - 1 + t.length) % t.length;
        break;
      case "Home":
        i = 0;
        break;
      case "End":
        i = t.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault(), this.selectPanel(t[i], !0);
  }
  updateActionPicker(e) {
    const t = e.closest("[data-panel-action-launcher]");
    t && t.querySelectorAll("[data-panel-action-choice]").forEach((s) => {
      s.hidden = s.dataset.panelActionChoice !== e.value;
    });
  }
  updateFilters() {
    const e = this.activePanel, t = this.registry.get(e);
    if (!t?.renderFilters) return;
    const s = this.filterStateFor(e, t), i = p(s) ? { ...s } : {};
    this.regions.filters.querySelectorAll("[data-filter]").forEach((r) => {
      const n = r.dataset.filter || "";
      n && (i[n] = r instanceof HTMLInputElement && r.type === "checkbox" ? r.checked : r.value);
    }), this.filterState.set(e, i), this.renderPanel(!1);
  }
  filterStateFor(e, t) {
    if (!this.filterState.has(e)) {
      const s = t.defaultFilters;
      this.filterState.set(e, p(s) ? { ...s } : s ?? {});
    }
    return this.filterState.get(e);
  }
  markPanelDirty(e) {
    this.dirtyPanels.add(e), !this.cancelFrame && (this.cancelFrame = Ee(() => {
      this.cancelFrame = null, this.flush();
    }));
  }
  flush() {
    if (this.state === "disposed") return;
    if (this.structureDirty) {
      this.structureDirty = !1, this.dirtyPanels.clear(), this.renderNotice(), this.renderConnection(), this.renderTabs(), this.panelMounted(this.activePanel) ? this.renderPanel(!1) : (this.renderFilters(), this.renderPanel(!0));
      return;
    }
    const e = Array.from(this.dirtyPanels);
    this.dirtyPanels.clear(), e.length !== 0 && (this.updateCounts(), e.includes(this.activePanel) && this.renderPanel(!1));
  }
  render() {
    this.renderNotice(), this.renderConnection(), this.renderTabs(), this.renderFilters(), this.renderPanel(!0);
  }
  visiblePanels() {
    return this.store.panelIds().filter((e) => this.registry.has(e));
  }
  tabButton(e) {
    return this.regions.tabs.querySelector(`[data-console-tab="${$(e)}"]`);
  }
  renderTabs() {
    const e = this.visiblePanels(), t = this.root.ownerDocument.activeElement, s = t instanceof HTMLElement && this.regions.tabs.contains(t) && t.dataset.consoleTab || "";
    this.regions.tabs.hidden = e.length === 0, this.regions.tabs.innerHTML = e.map((i) => {
      const r = this.registry.get(i), n = i === this.activePanel, o = this.panelCount(i, r);
      return `<button type="button" class="console-tab${n ? " console-tab--active" : ""}" role="tab" id="${v(`${this.idScope}-tab-${i}`)}" aria-selected="${n ? "true" : "false"}" aria-controls="${v(this.regions.panel.id)}" tabindex="${n ? "0" : "-1"}" data-console-tab="${v(i)}"><span class="console-tab__label">${b(r?.label || i)}</span><span class="console-tab__count" data-console-tab-count="${v(i)}">${b(R(o))}</span></button>`;
    }).join(""), this.activePanel ? this.regions.panel.setAttribute("aria-labelledby", `${this.idScope}-tab-${this.activePanel}`) : this.regions.panel.removeAttribute("aria-labelledby"), s && this.tabButton(e.includes(s) ? s : this.activePanel)?.focus();
  }
  updateCounts() {
    this.visiblePanels().forEach((e) => {
      const t = this.regions.tabs.querySelector(`[data-console-tab-count="${$(e)}"]`);
      t && (t.textContent = R(this.panelCount(e, this.registry.get(e))));
    });
  }
  panelCount(e, t) {
    const s = this.panelData(e);
    return t?.getCount ? t.getCount(s) : Y(s);
  }
  panelData(e) {
    const t = this.store.records(e), s = this.serverDefinitions.get(e), i = s?.ui?.views?.console || s?.ui?.views?.toolbar, r = f(i?.renderer);
    return t.length === 1 && !de.has(r) ? t[0].data : t.map((n) => n.data);
  }
  renderFilters() {
    const e = this.registry.get(this.activePanel);
    if (!e?.renderFilters || e.showFilters === !1 || this.state !== "ready") {
      this.regions.filters.innerHTML = "", this.regions.filters.hidden = !0;
      return;
    }
    const t = e.renderFilters(this.filterStateFor(this.activePanel, e));
    this.regions.filters.innerHTML = t, this.regions.filters.hidden = !t;
  }
  renderOptions() {
    return { idScope: this.idScope };
  }
  panelMounted(e) {
    const t = this.regions.panel;
    return !!e && t.dataset.consolePanelId === e && t.dataset.consoleDefinition === (this.definitionSignatures.get(e) || "");
  }
  renderPanel(e) {
    const t = this.regions.panel, s = this.activePanel, i = s ? this.registry.get(s) : void 0;
    if (!i || this.state !== "ready") {
      t.innerHTML = this.state === "ready" ? `<div class="${this.styles.emptyState}">No panels are available.</div>` : "", t.dataset.consolePanelId = "";
      return;
    }
    let r = this.panelData(s);
    i.applyFilters && (r = i.applyFilters(r, this.filterStateFor(s, i)));
    const n = this.renderOptions();
    if (i.renderActions && i.renderBody) {
      const o = t.querySelector(":scope > [data-console-panel-body]");
      if (!e && o && this.panelMounted(s)) {
        o.innerHTML = i.renderBody(r, this.styles, n);
        return;
      }
      t.innerHTML = `<div class="console-panel__actions" data-console-panel-actions>${i.renderActions(this.styles, n)}</div><div class="console-panel__body" data-console-panel-body>${i.renderBody(r, this.styles, n)}</div><div class="console-panel__result" data-panel-action-result="${v(s)}" aria-live="polite"></div>`;
    } else t.innerHTML = (i.renderConsole || i.render)(r, this.styles, n);
    t.dataset.consolePanelId = s, t.dataset.consoleDefinition = this.definitionSignatures.get(s) || "", t.querySelectorAll("[data-panel-action-picker]").forEach((o) => this.updateActionPicker(o)), this.renderActionResult();
  }
  setState(e) {
    this.state === "disposed" || this.state === "denied" || (this.state = e, this.root.dataset.consoleState = e);
  }
  setConnection(e) {
    this.connection = e, this.renderConnection();
  }
  renderConnection() {
    const e = {
      connected: "Live",
      reconnecting: "Reconnecting",
      disconnected: "Disconnected",
      error: "Connection error",
      offline: "Not live"
    };
    this.root.dataset.consoleConnection = this.connection, this.regions.status && (this.regions.status.dataset.status = this.connection), this.regions.connection && (this.regions.connection.textContent = e[this.connection]);
  }
  setNotice(e, t, s) {
    this.notice = {
      kind: e,
      message: t,
      action: s
    }, this.renderNotice();
  }
  renderNotice() {
    const { kind: e, message: t, action: s } = this.notice, i = this.regions.notice;
    if (i.dataset.consoleNotice = e, e === "none" || !t) {
      i.hidden = !0, i.innerHTML = "", i.removeAttribute("role");
      return;
    }
    i.hidden = !1, i.setAttribute("role", e === "error" || e === "denied" ? "alert" : "status");
    const r = s === "none" ? "" : ` <button type="button" class="console-btn" data-console-action="${s}">${s === "reload" ? "Reload" : "Retry"}</button>`;
    i.innerHTML = `<span class="console-notice__message">${b(t)}</span>${r}`;
  }
};
function Re(e, t = {}) {
  const s = g.get(e);
  if (s) return s;
  const i = t.bootstrap ? N(t.bootstrap) : be(e);
  if (!i)
    return e.dataset.consoleState = "error", null;
  const r = new Pe(e, i, t);
  return g.set(e, r), r;
}
function Xe(e) {
  return g.get(e) || null;
}
function Qe(e) {
  g.get(e)?.destroy();
}
function Ce(e = document, t = {}) {
  return Array.from(e.querySelectorAll(`${A}:not([data-console-manual])`)).map((s) => Re(s, t)).filter((s) => s !== null);
}
var Ze = "1", O = () => {
  Ce(document);
};
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", O, { once: !0 }) : O());
export {
  z as ConsoleLiveStream,
  re as ConsolePreferences,
  ee as ConsoleRecordStore,
  Pe as ConsoleRuntime,
  Ze as PANEL_UI_SCHEMA_VERSION,
  Be as PanelRegistry,
  Ge as applyPanelActionNavigation,
  Ve as applyPanelActionPayload,
  K as buildPanelActionPayload,
  se as consoleIdentityNamespace,
  B as consoleStyleConfig,
  J as createPanelRegistry,
  Y as defaultGetCount,
  je as defaultHandleEvent,
  Qe as disposeConsole,
  v as escapeAttribute,
  b as escapeHTML,
  Oe as fetchServerPanelDefinitions,
  Xe as getMountedConsole,
  We as getPanelCount,
  Ie as getPanelData,
  He as getSnapshotKey,
  Ne as isSchemaListRenderer,
  Re as mountConsole,
  Ce as mountConsoles,
  E as normalizeConsoleIdentity,
  Ue as normalizeEventTypes,
  Ke as panelActionHasSensitiveFields,
  U as panelDefinitionFromServer,
  be as readConsoleBootstrap,
  Fe as registerServerPanelDefinitions,
  De as renderJSONPanel,
  ke as renderJSONViewer,
  qe as renderPanelContent,
  $e as renderSchemaListRow,
  Le as renderSchemaPanelView,
  Je as resolveLiveURL,
  _ as sameConsoleIdentity,
  Me as schemaRowKey
};

//# sourceMappingURL=index.js.map
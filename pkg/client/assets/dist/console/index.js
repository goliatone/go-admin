import { escapeAttribute as v, escapeHTML as b } from "../shared/html.js";
import { httpRequest as B, readExpectedHTTPJSON as W, readHTTPStructuredErrorResult as U } from "../shared/transport/http-client.js";
import { C as Y, S as K, _ as $e, a as p, b as C, d as Ne, g as xe, h as qe, i as Ie, l as He, n as je, o as Be, r as z, y as R } from "../chunks/hydrate-mOOlPiY2.js";
import { a as J, c as Ue, d as Ye, i as V, l as Ke, o as ze, r as Je, s as Ve, u as Ge } from "../chunks/avatar-DIbK-LSg.js";
import { n as Xe, r as G, t as Q } from "../chunks/live-stream-CyiSPucB.js";
import { i as et, n as tt, r as X, t as st } from "../chunks/actions-zb2HbM0q.js";
var Z = 1e3, ee = 500, te = /* @__PURE__ */ new Set([
  "upsert",
  "delete",
  "invalidate"
]), se = [
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
function d(e) {
  return typeof e == "string" ? e.trim() : "";
}
function E(e) {
  const t = S(e) ? e : {};
  return {
    console_id: d(t.console_id),
    application_id: d(t.application_id),
    environment_id: d(t.environment_id),
    actor_id: d(t.actor_id),
    scope_key: d(t.scope_key)
  };
}
function _(e, t) {
  const s = E(t);
  return se.every((i) => e[i] === s[i]);
}
function ie(e) {
  if (!S(e)) return null;
  const t = d(e.record_key);
  if (!t) return null;
  const s = {
    record_key: t,
    revision: m(e.revision) ?? 0,
    data: e.data
  }, i = d(e.target_id);
  i && (s.target_id = i);
  const n = m(e.generation);
  return n !== null && (s.generation = n), s;
}
function T(e, t) {
  return `${e}\0${t}`;
}
var ne = class {
  constructor(e) {
    this.panels = /* @__PURE__ */ new Map(), this.generations = /* @__PURE__ */ new Map(), this.lastSequence = null, this.recovering = !0, this.buffer = [], this.bufferOverflowed = !1, this.identity = E(e.identity), this.sequenceMode = e.sequenceMode === "contiguous" ? "contiguous" : "monotonic", this.maxBufferedEvents = Math.max(1, e.maxBufferedEvents ?? Z), this.maxRecordsPerPanel = Math.max(1, e.maxRecordsPerPanel ?? ee);
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
    for (const c of e.panels) {
      const l = S(c) ? d(c.id).toLowerCase() : "";
      if (!l || s.has(l)) continue;
      const y = /* @__PURE__ */ new Map(), H = Array.isArray(c.records) ? c.records : [];
      for (const j of H) {
        const f = ie(j);
        if (f && (y.delete(f.record_key), y.set(f.record_key, f), f.target_id && f.generation !== void 0)) {
          const P = T(l, f.target_id);
          i.set(P, Math.max(i.get(P) ?? f.generation, f.generation));
        }
      }
      w(y, this.maxRecordsPerPanel), s.set(l, y);
    }
    this.panels = s, this.generations = i, this.lastSequence = t, this.recovering = !1;
    const n = [...this.buffer].sort((c, l) => c.sequence - l.sequence), r = this.bufferOverflowed;
    this.buffer = [], this.bufferOverflowed = !1;
    let o = 0, a = !1;
    for (const c of n) {
      const l = this.applyEvent(c);
      l === "applied" ? o += 1 : (l === "gap" || l === "invalidated") && (a = !0);
    }
    return r && !a && (a = !0, this.recovering = !0), {
      ok: !0,
      replayed: o,
      needsRecovery: a
    };
  }
  applyEvent(e) {
    if (!S(e)) return "malformed";
    const t = m(e.sequence), s = d(e.kind);
    return t === null || !te.has(s) ? "malformed" : _(this.identity, e) ? s === "invalidate" ? (this.recovering = !0, "invalidated") : this.recovering || this.lastSequence === null ? (this.bufferEvent(e), "buffered") : t <= this.lastSequence ? "duplicate" : this.sequenceMode === "contiguous" && t > this.lastSequence + 1 ? (this.recovering = !0, this.bufferEvent(e), "gap") : (this.lastSequence = t, this.applyRecordEvent(e, s)) : "foreign";
  }
  bufferEvent(e) {
    this.buffer.length >= this.maxBufferedEvents && (this.buffer.shift(), this.bufferOverflowed = !0), this.buffer.push(e);
  }
  acceptGeneration(e, t, s) {
    if (!t || s === null) return !0;
    const i = T(e, t), n = this.generations.get(i);
    return n !== void 0 && s < n ? !1 : (this.generations.set(i, s), !0);
  }
  applyRecordEvent(e, t) {
    const s = d(e.panel_id).toLowerCase(), i = this.panels.get(s);
    if (!i) return "foreign";
    const n = d(e.record_key);
    if (!n) return "malformed";
    const r = d(e.target_id), o = m(e.generation);
    if (!this.acceptGeneration(s, r, o)) return "stale";
    const a = i.get(n), c = m(e.revision);
    if (c !== null && a && c <= a.revision) return "stale";
    if (t === "delete") return a && i.delete(n) ? "applied" : "stale";
    const l = {
      record_key: n,
      revision: c ?? (a ? a.revision + 1 : 0),
      data: e.data
    };
    return r && (l.target_id = r), o !== null && (l.generation = o), i.set(n, l), w(i, this.maxRecordsPerPanel), "applied";
  }
};
function w(e, t) {
  for (; e.size > t; ) {
    const s = e.keys().next().value;
    if (s === void 0) return;
    e.delete(s);
  }
}
function re(e) {
  return JSON.stringify({
    console_id: e.console_id,
    application_id: e.application_id,
    environment_id: e.environment_id,
    actor_id: e.actor_id,
    scope_key: e.scope_key
  });
}
function oe(e) {
  try {
    return (e === "local" ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}
var ae = class {
  constructor(e, t = null) {
    this.prefix = G(e, ""), this.provider = t;
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
  clear() {
    for (const e of ["local", "session"]) {
      const t = this.storage(e);
      if (t)
        try {
          const s = [];
          for (let i = 0; i < t.length; i += 1) {
            const n = t.key(i);
            n && n.startsWith(this.prefix) && s.push(n);
          }
          s.forEach((i) => t.removeItem(i));
        } catch {
        }
    }
  }
  storage(e) {
    return this.provider ? (e === "local" ? this.provider.local : this.provider.session) ?? null : oe(e);
  }
}, le = /* @__PURE__ */ new Set([
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
      const n = i.filter((r) => typeof r == "string" && r.trim()).join("; ");
      n && (t[s] = n);
    }
  }), t;
}
function ce(e) {
  return e === 401 ? "reload" : e === 0 || e === 408 || e === 429 || e >= 500 ? "retry" : "none";
}
async function he(e, t) {
  const s = await U(e, t, { appendStatusToFallback: !1 }), i = s.payload && typeof s.payload == "object" ? s.payload : {}, n = s.details || {}, r = {
    ...k(i.fields),
    ...k(n.fields)
  }, o = String(n.action ?? i.action ?? "").trim().toLowerCase(), a = typeof s.message == "string" && s.message.trim() && s.message.length <= 500 ? s.message.trim() : t;
  return {
    status: e.status,
    code: s.code || (e.status === 401 ? "UNAUTHORIZED" : e.status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message: a,
    fields: r,
    action: le.has(o) ? o : ce(e.status)
  };
}
function de(e) {
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: e,
    fields: {},
    action: "retry"
  };
}
async function L(e, t) {
  const { timeoutMs: s = 1e4, fallbackError: i, signal: n, ...r } = t, o = typeof AbortController < "u" ? new AbortController() : null, a = () => o?.abort();
  let c;
  n && (n.aborted ? a() : n.addEventListener("abort", a, { once: !0 })), o && s > 0 && (c = setTimeout(a, s));
  try {
    const l = await B(e, {
      credentials: "same-origin",
      ...r,
      signal: o?.signal ?? n
    });
    if (!l.ok) return {
      ok: !1,
      status: l.status,
      error: await he(l, i)
    };
    const y = await W(l);
    return {
      ok: !0,
      status: l.status,
      value: y
    };
  } catch (l) {
    return l && typeof l == "object" && l.name === "HTTPAuthenticationRequiredError" ? {
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
      error: de(i)
    };
  } finally {
    c !== void 0 && clearTimeout(c), n?.removeEventListener("abort", a);
  }
}
function ue(e, t) {
  let s = e;
  return Object.entries(t).forEach(([i, n]) => {
    const r = encodeURIComponent(n), o = i.replace(/_id$|_key$/, "");
    s = s.split(`{${i}}`).join(r).split(`{${o}}`).join(r).replace(new RegExp(`:${i}(?=$|[/?#.])`, "g"), () => r).replace(new RegExp(`:${o}(?=$|[/?#.])`, "g"), () => r);
  }), s;
}
var A = "[data-console-root]", fe = 'script[type="application/json"][data-console-bootstrap]', pe = 'script[type="application/json"][data-console-widget]', ye = /* @__PURE__ */ new Set([
  "table",
  "status_list",
  "timeline"
]), D = /* @__PURE__ */ new Set([
  1008,
  4401,
  4403
]), me = [
  1e3,
  2e3,
  5e3,
  1e4,
  3e4
], M = "active-panel", ge = 16, ve = 5e3, be = 3, Se = 6e4, g = /* @__PURE__ */ new WeakMap(), Ae = 0;
function u(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function h(e) {
  return typeof e == "string" ? e.trim() : "";
}
function Ee(e) {
  if (!u(e)) return null;
  const t = h(e.snapshot);
  return t ? {
    page: h(e.page) || void 0,
    panels: h(e.panels) || void 0,
    snapshot: t,
    actions: h(e.actions) || void 0,
    preferences: h(e.preferences) || void 0,
    live: h(e.live) || void 0,
    lookup: h(e.lookup) || void 0
  } : null;
}
function Pe(e) {
  const t = Array.from(e.querySelectorAll(fe)).find((s) => s.closest(A) === e);
  if (!t) return null;
  try {
    return q(JSON.parse(t.textContent || ""));
  } catch {
    return null;
  }
}
function Ce(e) {
  const t = Array.from(e.querySelectorAll(pe)).find((s) => s.closest(A) === e);
  if (!t) return null;
  try {
    const s = JSON.parse(t.textContent || "");
    if (!u(s) || !u(s.panel)) return null;
    const i = E(s), n = typeof s.watermark == "number" ? s.watermark : 0;
    return i.console_id ? {
      ...i,
      title: h(s.panel.label) || void 0,
      urls: { snapshot: "" },
      snapshot: {
        ...i,
        watermark: n,
        panels: [s.panel]
      }
    } : null;
  } catch {
    return null;
  }
}
function q(e) {
  if (!u(e)) return null;
  const t = E(e), s = Ee(e.urls);
  return !t.console_id || !s ? null : {
    ...t,
    title: h(e.title) || void 0,
    urls: s,
    preferences_namespace: h(e.preferences_namespace) || void 0,
    snapshot: u(e.snapshot) ? e.snapshot : void 0
  };
}
function Re(e) {
  return typeof e.watermark == "number" && Array.isArray(e.panels) && typeof e.console_id == "string";
}
function _e(e, t, s) {
  const [i, n] = e.split("#"), r = `${i}${i.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return n === void 0 ? r : `${r}#${n}`;
}
function O(e) {
  return u(e) && typeof e.sequence == "number" && typeof e.kind == "string" && typeof e.console_id == "string";
}
function F(e) {
  const t = globalThis.CSS?.escape;
  return t ? t(e) : e.replace(/["\\]/g, "\\$&");
}
function Te(e) {
  if (typeof requestAnimationFrame == "function") {
    const s = requestAnimationFrame(() => e());
    return () => cancelAnimationFrame(s);
  }
  const t = setTimeout(e, ge);
  return () => clearTimeout(t);
}
var we = class {
  constructor(e, t, s = {}) {
    this.serverDefinitions = /* @__PURE__ */ new Map(), this.filterState = /* @__PURE__ */ new Map(), this.actionResults = /* @__PURE__ */ new Map(), this.controllers = /* @__PURE__ */ new Set(), this.cleanup = [], this.state = "loading", this.connection = "offline", this.activePanel = "", this.policyCloses = [], this.stream = null, this.recoveryPromise = null, this.recoveryPending = !1, this.recoveryAttempts = 0, this.recoveryTimer = null, this.cancelFrame = null, this.dirtyPanels = /* @__PURE__ */ new Set(), this.structureDirty = !1, this.livePanels = [], this.snapshotWaitTimer = null, this.definitionSignatures = /* @__PURE__ */ new Map(), this.notice = {
      kind: "loading",
      message: "Loading console…",
      action: "none"
    }, this.root = e, this.bootstrap = t, this.options = s, this.styles = s.styles || Y, this.identity = E(t), this.idScope = `console-${Ae += 1}`, this.registry = V(), this.store = new ne({
      identity: this.identity,
      sequenceMode: "monotonic"
    }), this.preferences = new ae(t.preferences_namespace || re(this.identity), s.storage ?? null), (s.panels || []).forEach((i) => this.registry.register(i)), this.root.classList.add("console-root"), this.regions = this.ensureRegions(), this.bindEvents(), this.root.dataset.consoleState = "loading", this.root.dataset.consoleSync = "recovering", this.render(), this.start();
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
    return this.panelData(p(e));
  }
  selectPanel(e, t = !1) {
    const s = p(e);
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
    this.bootstrap.snapshot ? this.acceptSnapshot(this.bootstrap.snapshot) : await this.recover(), !(this.isClosed() || this.options.display) && this.connectLive();
  }
  isClosed() {
    return this.state === "disposed" || this.state === "denied";
  }
  recover() {
    if (this.isClosed() || this.options.display || !this.bootstrap.urls.snapshot) return Promise.resolve();
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
    const t = this.options.recoveryDelaysMs || me, s = this.recoveryAttempts;
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
      const n = p(i?.id);
      if (!n || t.has(n)) return;
      t.add(n);
      const { records: r, ...o } = i, a = K(JSON.stringify(o));
      if (this.definitionSignatures.get(n) === a && this.registry.has(n)) return;
      this.definitionSignatures.set(n, a), this.serverDefinitions.set(n, o);
      const c = z(o, {
        consoleRenderer: this.options.renderers?.[n],
        styles: this.styles
      });
      c && this.registry.registerServerDefinition(c);
    });
    for (const i of Array.from(this.serverDefinitions.keys())) t.has(i) || (this.serverDefinitions.delete(i), this.definitionSignatures.delete(i), this.filterState.delete(i), this.actionResults.delete(i), this.registry.isServerDefinition(i) && this.registry.unregister(i));
    const s = this.visiblePanels();
    if (!s.includes(this.activePanel)) {
      const i = p(this.preferences.get(M, "session"));
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
    const s = new Q({
      ...this.options.liveOptions || {},
      url: _e(e, "panels", t.join(",")),
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
    }, Math.max(0, this.options.snapshotWaitMs ?? ve));
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
    if (this.policyCloses = this.policyCloses.filter((t) => e - t < Se), this.policyCloses.push(e), await this.recover(), !(this.isClosed() || this.state !== "ready")) {
      if (this.policyCloses.length > be) {
        this.setConnection("disconnected"), this.setNotice("error", "Live updates stopped. Refresh to load the latest data.", "retry");
        return;
      }
      this.connectLive();
    }
  }
  handleLiveMessage(e) {
    if (this.isClosed() || !u(e)) return;
    if (Re(e)) {
      this.clearSnapshotWait(), this.acceptSnapshot(e) && this.recover();
      return;
    }
    if (!O(e)) return;
    const t = this.store.applyEvent(e);
    t === "applied" ? this.markPanelDirty(p(e.panel_id)) : t === "invalidated" ? this.awaitStreamSnapshot() : t === "gap" && this.recover();
  }
  deny(e) {
    if (this.state === "disposed") return;
    this.state = "denied", this.root.dataset.consoleState = "denied", this.closeLive(), this.controllers.forEach((s) => s.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.recoveryPending = !1, this.store.clear(), this.registry.clearServerDefinitions(), this.serverDefinitions.clear(), this.definitionSignatures.clear(), this.livePanels = [], this.actionResults.clear(), this.filterState.clear(), this.preferences.clear(), this.activePanel = "", this.setConnection("offline");
    const t = e.status === 401 ? "Your session expired. Sign in again to continue." : e.code === "IDENTITY_CHANGED" ? e.message : "You do not have access to this console.";
    this.setNotice("denied", t, "reload"), this.structureDirty = !0, this.flush();
  }
  declaredAction(e, t) {
    return !!this.serverDefinitions.get(e)?.ui?.actions?.some((i) => p(i.id) === t);
  }
  confirmAction(e) {
    const t = h(e.dataset.actionConfirm);
    return e.dataset.actionRequiresConfirm !== "true" && !t ? !0 : (this.options.confirm || ((s) => window.confirm(s)))(t || "Run this action?");
  }
  async runAction(e, t) {
    const s = p(e.dataset.panelId), i = p(e.dataset.actionId), n = this.bootstrap.urls.actions;
    if (this.state !== "ready" || this.options.display || !n || !s || !i || !this.visiblePanels().includes(s) || !this.declaredAction(s, i) || !this.confirmAction(e)) return;
    const r = X(e), o = ue(n, {
      panel_id: s,
      action_id: i
    });
    t && (t.disabled = !0), this.clearFieldErrors(e);
    const a = new AbortController();
    this.controllers.add(a);
    const c = await L(o, {
      method: "POST",
      json: r,
      signal: a.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Action failed."
    });
    this.controllers.delete(a), t && (t.disabled = !1), !this.isClosed() && (c.ok ? this.applyActionResult(e, s, i, c.value) : this.applyActionFailure(e, s, i, c.status, c.error));
  }
  applyActionFailure(e, t, s, i, n) {
    if (i === 401) {
      this.deny(n);
      return;
    }
    const r = i === 403 ? "You are not allowed to run this action." : n.message;
    this.showFieldErrors(e, n.fields), this.showActionResult(t, {
      status: "error",
      message: r,
      actionID: s
    }), i === 403 && this.refresh();
  }
  applyActionResult(e, t, s, i) {
    const n = u(i) ? i : {}, r = n.ok === !1;
    r && u(n.errors) && this.showFieldErrors(e, Object.fromEntries(Object.entries(n.errors).map(([o, a]) => [o, typeof a == "string" ? a : R(a, { nullAsEmptyObject: !1 })]))), this.showActionResult(t, {
      status: r ? "error" : "ok",
      message: h(n.message) || (r ? "Action failed." : "Action complete."),
      actionID: s,
      data: n.data
    }), O(n.event) && this.handleLiveMessage(n.event), n.refresh && this.refresh();
  }
  showActionResult(e, t) {
    this.actionResults.set(e, t), e === this.activePanel && this.renderActionResult();
  }
  renderActionResult() {
    const e = this.actionResults.get(this.activePanel), t = Array.from(this.regions.panel.querySelectorAll("[data-panel-action-result]")).find((n) => n.dataset.panelActionResult === this.activePanel);
    if (!t) return;
    if (!e) {
      t.innerHTML = "";
      return;
    }
    const s = e.status === "error" ? this.styles.badgeError : this.styles.badge, i = e.data === void 0 ? "" : `<pre class="${this.styles.jsonPanel}">${b(R(e.data, { nullAsEmptyObject: !1 }))}</pre>`;
    t.innerHTML = `<div class="${s}" role="${e.status === "error" ? "alert" : "status"}">${b(e.message)}</div>${i}`;
  }
  clearFieldErrors(e) {
    e.querySelectorAll("[data-action-field-error]").forEach((t) => {
      t.textContent = "", t.hidden = !0;
    });
  }
  showFieldErrors(e, t) {
    Object.entries(t).forEach(([s, i]) => {
      const n = s.trim(), r = Array.from(e.querySelectorAll("[data-action-field-error]")).find((o) => o.dataset.actionFieldError === n || o.dataset.actionFieldName === n || o.dataset.actionFieldError === `payload.${n}`);
      r && (r.textContent = i, r.hidden = !1);
    });
  }
  ensureRegions() {
    const e = (o) => Array.from(this.root.querySelectorAll(o)).find((a) => a.closest(A) === this.root) || null, t = (o, a, c) => {
      const l = this.root.ownerDocument.createElement(o);
      return l.setAttribute(a, ""), l.className = c, this.root.appendChild(l), l;
    }, s = e("[data-console-notice]") || t("div", "data-console-notice", "console-notice"), i = e("[data-console-tabs]") || t("nav", "data-console-tabs", "console-tabs"), n = e("[data-console-filters]") || t("div", "data-console-filters", "console-filters"), r = e("[data-console-panel]") || t("section", "data-console-panel", "console-panel");
    return i.setAttribute("role", "tablist"), i.hasAttribute("aria-label") || i.setAttribute("aria-label", this.bootstrap.title || "Console panels"), r.id = r.id || `${this.idScope}-panel`, r.setAttribute("role", "tabpanel"), r.tabIndex = 0, {
      tabs: i,
      filters: n,
      panel: r,
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
      const n = i.target?.closest("[data-console-tab]");
      n && e.contains(n) && this.selectPanel(n.dataset.consoleTab || "", !0);
    }), this.listen(e, "keydown", (i) => this.handleTabKeydown(i)), this.listen(s, "input", () => this.updateFilters()), this.listen(s, "change", () => this.updateFilters()), this.listen(t, "click", (i) => {
      const n = i.target?.closest("[data-panel-action]");
      !n || !t.contains(n) || n.disabled || (i.preventDefault(), this.runAction(n, n));
    }), this.listen(t, "submit", (i) => {
      const n = i.target?.closest("form[data-panel-action-form]");
      if (!n || !t.contains(n)) return;
      i.preventDefault();
      const r = n.querySelector('button[type="submit"]');
      r?.disabled || this.runAction(n, r);
    }), this.listen(t, "change", (i) => {
      const n = i.target?.closest("[data-panel-action-picker]");
      n && t.contains(n) && this.updateActionPicker(n);
    }), this.listen(this.root, "click", (i) => {
      const n = i.target?.closest("[data-console-action]");
      if (!n || n.closest(A) !== this.root) return;
      const r = n.dataset.consoleAction;
      r === "retry" || r === "refresh" ? (i.preventDefault(), this.refresh()) : r === "reload" && (i.preventDefault(), this.root.ownerDocument.defaultView?.location.reload());
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
    const s = this.filterStateFor(e, t), i = u(s) ? { ...s } : {};
    this.regions.filters.querySelectorAll("[data-filter]").forEach((n) => {
      const r = n.dataset.filter || "";
      r && (i[r] = n instanceof HTMLInputElement && n.type === "checkbox" ? n.checked : n.value);
    }), this.filterState.set(e, i), this.renderPanel(!1);
  }
  filterStateFor(e, t) {
    if (!this.filterState.has(e)) {
      const s = t.defaultFilters;
      this.filterState.set(e, u(s) ? { ...s } : s ?? {});
    }
    return this.filterState.get(e);
  }
  markPanelDirty(e) {
    this.dirtyPanels.add(e), !this.cancelFrame && (this.cancelFrame = Te(() => {
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
    return this.regions.tabs.querySelector(`[data-console-tab="${F(e)}"]`);
  }
  renderTabs() {
    const e = this.visiblePanels(), t = this.root.ownerDocument.activeElement, s = t instanceof HTMLElement && this.regions.tabs.contains(t) && t.dataset.consoleTab || "";
    this.regions.tabs.hidden = e.length === 0 || !!this.options.display, this.regions.tabs.innerHTML = e.map((i) => {
      const n = this.registry.get(i), r = i === this.activePanel, o = this.panelCount(i, n);
      return `<button type="button" class="console-tab${r ? " console-tab--active" : ""}" role="tab" id="${v(`${this.idScope}-tab-${i}`)}" aria-selected="${r ? "true" : "false"}" aria-controls="${v(this.regions.panel.id)}" tabindex="${r ? "0" : "-1"}" data-console-tab="${v(i)}"><span class="console-tab__label">${b(n?.label || i)}</span><span class="console-tab__count" data-console-tab-count="${v(i)}">${b(C(o))}</span></button>`;
    }).join(""), this.activePanel ? this.regions.panel.setAttribute("aria-labelledby", `${this.idScope}-tab-${this.activePanel}`) : this.regions.panel.removeAttribute("aria-labelledby"), s && this.tabButton(e.includes(s) ? s : this.activePanel)?.focus();
  }
  updateCounts() {
    this.visiblePanels().forEach((e) => {
      const t = this.regions.tabs.querySelector(`[data-console-tab-count="${F(e)}"]`);
      t && (t.textContent = C(this.panelCount(e, this.registry.get(e))));
    });
  }
  panelCount(e, t) {
    const s = this.panelData(e);
    return t?.getCount ? t.getCount(s) : J(s);
  }
  panelData(e) {
    const t = this.store.records(e), s = this.serverDefinitions.get(e), i = s?.ui?.views?.console || s?.ui?.views?.toolbar, n = p(i?.renderer);
    return t.length === 1 && !ye.has(n) ? t[0].data : t.map((r) => r.data);
  }
  renderFilters() {
    const e = this.registry.get(this.activePanel);
    if (!e?.renderFilters || e.showFilters === !1 || this.state !== "ready" || this.options.display) {
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
    let n = this.panelData(s);
    i.applyFilters && (n = i.applyFilters(n, this.filterStateFor(s, i)));
    const r = this.renderOptions();
    if (this.options.display && i.renderBody) {
      t.innerHTML = i.renderBody(n, this.styles, r), t.dataset.consolePanelId = s;
      return;
    }
    if (i.renderActions && i.renderBody) {
      const o = t.querySelector(":scope > [data-console-panel-body]");
      if (!e && o && this.panelMounted(s)) {
        o.innerHTML = i.renderBody(n, this.styles, r);
        return;
      }
      t.innerHTML = `<div class="console-panel__actions" data-console-panel-actions>${i.renderActions(this.styles, r)}</div><div class="console-panel__body" data-console-panel-body>${i.renderBody(n, this.styles, r)}</div><div class="console-panel__result" data-panel-action-result="${v(s)}" aria-live="polite"></div>`;
    } else t.innerHTML = (i.renderConsole || i.render)(n, this.styles, r);
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
    if (i.dataset.consoleNotice = e, e === "none" || !t || this.options.display && e === "loading") {
      i.hidden = !0, i.innerHTML = "", i.removeAttribute("role");
      return;
    }
    i.hidden = !1, i.setAttribute("role", e === "error" || e === "denied" ? "alert" : "status");
    const n = s === "none" ? "" : ` <button type="button" class="console-btn" data-console-action="${s}">${s === "reload" ? "Reload" : "Retry"}</button>`;
    i.innerHTML = `<span class="console-notice__message">${b(t)}</span>${n}`;
  }
};
function I(e, t = {}) {
  const s = g.get(e);
  if (s) return s;
  const i = !!t.display || e.hasAttribute("data-console-display"), n = t.bootstrap ? q(t.bootstrap) : i ? Ce(e) : Pe(e);
  if (!n)
    return e.dataset.consoleState = "error", null;
  const r = new we(e, n, i ? {
    ...t,
    display: !0,
    live: !1
  } : t);
  return g.set(e, r), r;
}
function it(e) {
  return g.get(e) || null;
}
function ke(e) {
  g.get(e)?.destroy();
}
function Le(e = document, t = {}) {
  return Array.from(e.querySelectorAll(`${A}:not([data-console-manual])`)).map((s) => I(s, t)).filter((s) => s !== null);
}
var nt = "1", $ = "[data-console-root]:not([data-console-manual])";
function N(e) {
  if (!(e instanceof HTMLElement)) return [];
  const t = Array.from(e.querySelectorAll($));
  return e.matches($) ? [e, ...t] : t;
}
function De() {
  typeof MutationObserver > "u" || !document.body || new MutationObserver((e) => {
    e.forEach((t) => {
      t.removedNodes.forEach((s) => {
        N(s).forEach((i) => {
          i.isConnected || ke(i);
        });
      }), t.addedNodes.forEach((s) => {
        N(s).forEach((i) => {
          i.isConnected && I(i);
        });
      });
    });
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  });
}
var x = () => {
  Le(document), De();
};
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", x, { once: !0 }) : x());
export {
  Q as ConsoleLiveStream,
  ae as ConsolePreferences,
  ne as ConsoleRecordStore,
  we as ConsoleRuntime,
  nt as PANEL_UI_SCHEMA_VERSION,
  Je as PanelRegistry,
  st as applyPanelActionNavigation,
  tt as applyPanelActionPayload,
  X as buildPanelActionPayload,
  re as consoleIdentityNamespace,
  Y as consoleStyleConfig,
  V as createPanelRegistry,
  J as defaultGetCount,
  ze as defaultHandleEvent,
  ke as disposeConsole,
  v as escapeAttribute,
  b as escapeHTML,
  je as fetchServerPanelDefinitions,
  it as getMountedConsole,
  Ve as getPanelCount,
  Ue as getPanelData,
  Ke as getSnapshotKey,
  Be as isSchemaListRenderer,
  I as mountConsole,
  Le as mountConsoles,
  E as normalizeConsoleIdentity,
  Ge as normalizeEventTypes,
  et as panelActionHasSensitiveFields,
  z as panelDefinitionFromServer,
  Pe as readConsoleBootstrap,
  Ce as readConsoleWidgetBootstrap,
  Ie as registerServerPanelDefinitions,
  xe as renderJSONPanel,
  $e as renderJSONViewer,
  Ye as renderPanelContent,
  He as renderSchemaListRow,
  Ne as renderSchemaPanelView,
  Xe as resolveLiveURL,
  _ as sameConsoleIdentity,
  qe as schemaRowKey
};

//# sourceMappingURL=index.js.map
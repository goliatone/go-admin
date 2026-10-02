import { escapeAttribute as v, escapeHTML as b } from "../shared/html.js";
import { httpRequest as I, readExpectedHTTPJSON as H, readHTTPStructuredErrorResult as B } from "../shared/transport/http-client.js";
import { C as j, S as W, _ as $e, a as p, b as R, d as Ne, g as xe, h as qe, i as Ie, l as He, n as Be, o as je, r as U, y as P } from "../chunks/hydrate-mOOlPiY2.js";
import { a as Y, c as Ue, d as Ye, i as G, l as Ge, o as Ke, r as ze, s as Je, u as Ve } from "../chunks/avatar-DIbK-LSg.js";
import { n as Xe, r as K, t as z } from "../chunks/live-stream-CyiSPucB.js";
import { i as et, n as tt, r as J, t as st } from "../chunks/actions-zb2HbM0q.js";
var V = 1e3, Q = 500, X = /* @__PURE__ */ new Set([
  "upsert",
  "delete",
  "invalidate"
]), Z = [
  "console_id",
  "application_id",
  "environment_id",
  "actor_id",
  "scope_key"
];
function S(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function y(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function d(e) {
  return typeof e == "string" ? e.trim() : "";
}
function A(e) {
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
  const s = A(t);
  return Z.every((r) => e[r] === s[r]);
}
function ee(e) {
  if (!S(e)) return null;
  const t = d(e.record_key);
  if (!t) return null;
  const s = {
    record_key: t,
    revision: y(e.revision) ?? 0,
    data: e.data
  }, r = d(e.target_id);
  r && (s.target_id = r);
  const i = y(e.generation);
  return i !== null && (s.generation = i), s;
}
function $(e, t) {
  return `${e}\0${t}`;
}
function te(e, t) {
  const s = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  for (const i of e) {
    const n = S(i) ? d(i.id).toLowerCase() : "";
    if (!n || s.has(n)) continue;
    const o = /* @__PURE__ */ new Map(), a = Array.isArray(i.records) ? i.records : [];
    for (const c of a) {
      const l = ee(c);
      if (l && (o.delete(l.record_key), o.set(l.record_key, l), l.target_id && l.generation !== void 0)) {
        const f = $(n, l.target_id);
        r.set(f, Math.max(r.get(f) ?? l.generation, l.generation));
      }
    }
    N(o, t), s.set(n, o);
  }
  return {
    panels: s,
    generations: r
  };
}
var se = class {
  constructor(e) {
    this.panels = /* @__PURE__ */ new Map(), this.generations = /* @__PURE__ */ new Map(), this.lastSequence = null, this.recovering = !0, this.buffer = [], this.bufferOverflowed = !1, this.identity = A(e.identity), this.sequenceMode = e.sequenceMode === "contiguous" ? "contiguous" : "monotonic", this.maxBufferedEvents = Math.max(1, e.maxBufferedEvents ?? V), this.maxRecordsPerPanel = Math.max(1, e.maxRecordsPerPanel ?? Q);
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
  discardBuffered() {
    this.buffer = [], this.bufferOverflowed = !1;
  }
  applySnapshot(e, t = {}) {
    if (!S(e) || !Array.isArray(e.panels)) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    const s = y(e.watermark);
    if (s === null || s < 0) return {
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
    if (!t.rewind && this.lastSequence !== null && s < this.lastSequence) return {
      ok: !1,
      reason: "stale",
      replayed: 0,
      needsRecovery: this.recovering
    };
    const { panels: r, generations: i } = te(e.panels, this.maxRecordsPerPanel);
    this.panels = r, this.generations = i, this.lastSequence = s, this.recovering = !1;
    const n = [...this.buffer].sort((l, f) => l.sequence - f.sequence), o = this.bufferOverflowed;
    this.buffer = [], this.bufferOverflowed = !1;
    let a = 0, c = !1;
    for (const l of n) {
      const f = this.applyEvent(l);
      f === "applied" ? a += 1 : (f === "gap" || f === "invalidated") && (c = !0);
    }
    return o && !c && (c = !0, this.recovering = !0), {
      ok: !0,
      replayed: a,
      needsRecovery: c
    };
  }
  applyEvent(e) {
    if (!S(e)) return "malformed";
    const t = y(e.sequence), s = d(e.kind);
    return t === null || !X.has(s) ? "malformed" : _(this.identity, e) ? s === "invalidate" ? (this.recovering = !0, "invalidated") : this.recovering || this.lastSequence === null ? (this.bufferEvent(e), "buffered") : t <= this.lastSequence ? "duplicate" : this.sequenceMode === "contiguous" && t > this.lastSequence + 1 ? (this.recovering = !0, this.bufferEvent(e), "gap") : (this.lastSequence = t, this.applyRecordEvent(e, s)) : "foreign";
  }
  bufferEvent(e) {
    this.buffer.length >= this.maxBufferedEvents && (this.buffer.shift(), this.bufferOverflowed = !0), this.buffer.push(e);
  }
  acceptGeneration(e, t, s) {
    if (!t || s === null) return !0;
    const r = $(e, t), i = this.generations.get(r);
    return i !== void 0 && s < i ? !1 : (this.generations.set(r, s), !0);
  }
  applyRecordEvent(e, t) {
    const s = d(e.panel_id).toLowerCase(), r = this.panels.get(s);
    if (!r) return "foreign";
    const i = d(e.record_key);
    if (!i) return "malformed";
    const n = d(e.target_id), o = y(e.generation);
    if (!this.acceptGeneration(s, n, o)) return "stale";
    const a = r.get(i), c = y(e.revision);
    if (c !== null && a && c <= a.revision) return "stale";
    if (t === "delete") return a && r.delete(i) ? "applied" : "stale";
    const l = {
      record_key: i,
      revision: c ?? (a ? a.revision + 1 : 0),
      data: e.data
    };
    return n && (l.target_id = n), o !== null && (l.generation = o), r.set(i, l), N(r, this.maxRecordsPerPanel), "applied";
  }
};
function N(e, t) {
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
function ie(e) {
  try {
    return (e === "local" ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}
var ne = class {
  constructor(e, t = null) {
    this.prefix = K(e, ""), this.provider = t;
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
    const r = this.storage(s);
    if (!r) return !1;
    try {
      return r.setItem(this.keyFor(e), t), !0;
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
          for (let r = 0; r < t.length; r += 1) {
            const i = t.key(r);
            i && i.startsWith(this.prefix) && s.push(i);
          }
          s.forEach((r) => t.removeItem(r));
        } catch {
        }
    }
  }
  storage(e) {
    return this.provider ? (e === "local" ? this.provider.local : this.provider.session) ?? null : ie(e);
  }
}, oe = /* @__PURE__ */ new Set([
  "retry",
  "reload",
  "none"
]);
function T(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return {};
  const t = {};
  return Object.entries(e).forEach(([s, r]) => {
    if (typeof r == "string" && r.trim()) t[s] = r.trim();
    else if (Array.isArray(r)) {
      const i = r.filter((n) => typeof n == "string" && n.trim()).join("; ");
      i && (t[s] = i);
    }
  }), t;
}
function ae(e) {
  return e === 401 ? "reload" : e === 0 || e === 408 || e === 429 || e >= 500 ? "retry" : "none";
}
async function le(e, t) {
  const s = await B(e, t, { appendStatusToFallback: !1 }), r = s.payload && typeof s.payload == "object" ? s.payload : {}, i = s.details || {}, n = {
    ...T(r.fields),
    ...T(i.fields)
  }, o = String(i.action ?? r.action ?? "").trim().toLowerCase(), a = typeof s.message == "string" && s.message.trim() && s.message.length <= 500 ? s.message.trim() : t;
  return {
    status: e.status,
    code: s.code || (e.status === 401 ? "UNAUTHORIZED" : e.status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message: a,
    fields: n,
    action: oe.has(o) ? o : ae(e.status)
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
async function w(e, t) {
  const { timeoutMs: s = 1e4, fallbackError: r, signal: i, ...n } = t, o = typeof AbortController < "u" ? new AbortController() : null, a = () => o?.abort();
  let c;
  i && (i.aborted ? a() : i.addEventListener("abort", a, { once: !0 })), o && s > 0 && (c = setTimeout(a, s));
  try {
    const l = await I(e, {
      credentials: "same-origin",
      ...n,
      signal: o?.signal ?? i
    });
    if (!l.ok) return {
      ok: !1,
      status: l.status,
      error: await le(l, r)
    };
    const f = await H(l);
    return {
      ok: !0,
      status: l.status,
      value: f
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
      error: ce(r)
    };
  } finally {
    c !== void 0 && clearTimeout(c), i?.removeEventListener("abort", a);
  }
}
function he(e, t) {
  let s = e;
  return Object.entries(t).forEach(([r, i]) => {
    const n = encodeURIComponent(i), o = r.replace(/_id$|_key$/, "");
    s = s.split(`{${r}}`).join(n).split(`{${o}}`).join(n).replace(new RegExp(`:${r}(?=$|[/?#.])`, "g"), () => n).replace(new RegExp(`:${o}(?=$|[/?#.])`, "g"), () => n);
  }), s;
}
var g = "[data-console-root]", de = "[data-console-page-actions][data-console-for]", ue = 'script[type="application/json"][data-console-bootstrap]', fe = 'script[type="application/json"][data-console-widget]', pe = /* @__PURE__ */ new Set([
  "table",
  "status_list",
  "timeline"
]), L = /* @__PURE__ */ new Set([
  1008,
  4401,
  4403
]), ye = [
  1e3,
  2e3,
  5e3,
  1e4,
  3e4
], k = "active-panel", ge = 16, me = 5e3, ve = 100, be = 3, Se = 6e4, m = /* @__PURE__ */ new WeakMap(), E = /* @__PURE__ */ new WeakMap(), Ae = 0;
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
function Ce(e) {
  const t = Array.from(e.querySelectorAll(ue)).find((s) => s.closest(g) === e);
  if (!t) return null;
  try {
    return x(JSON.parse(t.textContent || ""));
  } catch {
    return null;
  }
}
function Re(e) {
  const t = Array.from(e.querySelectorAll(fe)).find((s) => s.closest(g) === e);
  if (!t) return null;
  try {
    const s = JSON.parse(t.textContent || "");
    if (!u(s) || !u(s.panel)) return null;
    const r = A(s), i = typeof s.watermark == "number" ? s.watermark : 0;
    return r.console_id ? {
      ...r,
      title: h(s.panel.label) || void 0,
      urls: { snapshot: "" },
      snapshot: {
        ...r,
        watermark: i,
        panels: [s.panel]
      }
    } : null;
  } catch {
    return null;
  }
}
function x(e) {
  if (!u(e)) return null;
  const t = A(e), s = Ee(e.urls);
  return !t.console_id || !s ? null : {
    ...t,
    title: h(e.title) || void 0,
    urls: s,
    preferences_namespace: h(e.preferences_namespace) || void 0,
    snapshot: u(e.snapshot) ? e.snapshot : void 0
  };
}
function Pe(e) {
  return typeof e.watermark == "number" && Array.isArray(e.panels) && typeof e.console_id == "string";
}
function _e(e, t, s) {
  const [r, i] = e.split("#"), n = `${r}${r.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return i === void 0 ? n : `${n}#${i}`;
}
function D(e) {
  return u(e) && typeof e.sequence == "number" && typeof e.kind == "string" && typeof e.console_id == "string";
}
function C(e) {
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
    this.serverDefinitions = /* @__PURE__ */ new Map(), this.filterState = /* @__PURE__ */ new Map(), this.actionResults = /* @__PURE__ */ new Map(), this.controllers = /* @__PURE__ */ new Set(), this.cleanup = [], this.state = "loading", this.connection = "offline", this.activePanel = "", this.policyCloses = [], this.stream = null, this.recoveryPromise = null, this.recoveryPending = !1, this.snapshotEpoch = 0, this.freshStreamSnapshot = !1, this.recoveryAttempts = 0, this.recoveryTimer = null, this.cancelFrame = null, this.dirtyPanels = /* @__PURE__ */ new Set(), this.structureDirty = !1, this.livePanels = [], this.snapshotWaitTimer = null, this.definitionSignatures = /* @__PURE__ */ new Map(), this.notice = {
      kind: "loading",
      message: "Loading console…",
      action: "none"
    }, this.root = e, this.bootstrap = t, this.options = s, this.styles = s.styles || j, this.identity = A(t), this.idScope = `console-${Ae += 1}`, this.registry = G(), this.store = new se({
      identity: this.identity,
      sequenceMode: "monotonic"
    }), this.preferences = new ne(t.preferences_namespace || re(this.identity), s.storage ?? null), (s.panels || []).forEach((r) => this.registry.register(r)), this.root.classList.add("console-root"), this.regions = this.ensureRegions(), this.bindEvents(), this.root.dataset.consoleState = "loading", this.root.dataset.consoleSync = "recovering", this.render(), this.start();
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
    return !s || !this.visiblePanels().includes(s) || this.state === "disposed" ? !1 : (s !== this.activePanel && (this.activePanel = s, this.preferences.set(k, s, "session"), this.renderTabs(), this.renderFilters(), this.renderPanel(!0)), t && this.tabButton(s)?.focus(), !0);
  }
  refresh() {
    this.recoveryAttempts = 0, this.policyCloses = [];
    const e = this.recover();
    return (!this.stream || this.stream.getStatus() === "disconnected") && e.then(() => {
      !this.isClosed() && this.state === "ready" && (!this.stream || this.stream.getStatus() === "disconnected") && (this.closeLive(), this.connectLive());
    }), e;
  }
  destroy() {
    this.state !== "disposed" && (this.state = "disposed", this.closeLive(), this.controllers.forEach((e) => e.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.cancelFrame?.(), this.cancelFrame = null, this.cleanup.splice(0).forEach((e) => e()), this.releaseHeaderControls(), this.registry.dispose(), this.store.clear(), this.serverDefinitions.clear(), this.actionResults.clear(), this.filterState.clear(), m.get(this.root) === this && m.delete(this.root), this.root.dataset.consoleState = "disposed");
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
      const e = this.snapshotEpoch, t = new AbortController();
      this.controllers.add(t);
      const s = await w(this.bootstrap.urls.snapshot, {
        method: "GET",
        signal: t.signal,
        timeoutMs: this.options.requestTimeoutMs,
        fallbackError: "Unable to load console data."
      });
      if (this.controllers.delete(t), this.isClosed()) return;
      if (e !== this.snapshotEpoch) {
        if (this.recoveryPending) continue;
        return;
      }
      if (!s.ok) {
        s.status === 401 || s.status === 403 ? this.deny(s.error) : this.scheduleRecoveryRetry(s.error.message);
        return;
      }
      if (this.acceptSnapshot(s.value, !this.liveConfigured())) {
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
    const t = this.options.recoveryDelaysMs || ye, s = this.recoveryAttempts;
    if (this.recoveryAttempts += 1, s >= this.maxRecoveryAttempts() || t.length === 0) {
      this.recoveryAttempts = 0, this.setState(this.state === "loading" ? "error" : this.state), this.setNotice("error", e, "retry");
      return;
    }
    this.state === "loading" && this.setNotice("loading", `${e} Retrying…`, "none");
    const r = t[Math.min(s, t.length - 1)];
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null, this.recover();
    }, Math.max(0, r));
  }
  acceptSnapshot(e, t = !1) {
    const s = this.store.applySnapshot(e, { rewind: t });
    return s.ok ? (this.snapshotEpoch += 1, this.syncDefinitions(e.panels), this.setState("ready"), this.root.dataset.consoleSync = s.needsRecovery ? "recovering" : "current", this.setNotice("none", "", "none"), this.syncSubscription(), this.structureDirty = !0, this.flush(), s.needsRecovery) : s.reason === "stale" ? s.needsRecovery : (s.reason === "foreign" ? this.deny({
      status: 409,
      code: "IDENTITY_CHANGED",
      message: "Your console session changed. Reload to continue.",
      fields: {},
      action: "reload"
    }) : (this.setState(this.state === "loading" ? "error" : this.state), this.setNotice("error", "The console received malformed data.", "retry")), !1);
  }
  syncDefinitions(e) {
    const t = /* @__PURE__ */ new Set();
    e.forEach((r) => {
      const i = p(r?.id);
      if (!i || t.has(i)) return;
      t.add(i);
      const { records: n, ...o } = r, a = W(JSON.stringify(o));
      if (this.definitionSignatures.get(i) === a && this.registry.has(i)) return;
      this.definitionSignatures.set(i, a), this.serverDefinitions.set(i, o);
      const c = U(o, {
        consoleRenderer: this.options.renderers?.[i],
        styles: this.styles
      });
      c && this.registry.registerServerDefinition(c);
    });
    for (const r of Array.from(this.serverDefinitions.keys())) t.has(r) || (this.serverDefinitions.delete(r), this.definitionSignatures.delete(r), this.filterState.delete(r), this.actionResults.delete(r), this.registry.isServerDefinition(r) && this.registry.unregister(r));
    const s = this.visiblePanels();
    if (!s.includes(this.activePanel)) {
      const r = p(this.preferences.get(k, "session"));
      this.activePanel = s.includes(r) ? r : s[0] || "";
    }
  }
  liveConfigured() {
    return !!this.bootstrap.urls.live && this.options.live !== !1;
  }
  connectLive() {
    const e = this.bootstrap.urls.live;
    if (!e || !this.liveConfigured() || this.isClosed()) {
      this.setConnection("offline");
      return;
    }
    const t = this.byDeclaredOrder(this.store.panelIds());
    this.livePanels = t;
    const s = new z({
      ...this.options.liveOptions || {},
      url: _e(e, "panels", t.join(",")),
      onMessage: (r) => {
        this.stream === s && this.handleLiveMessage(r);
      },
      onStatusChange: (r) => {
        this.stream === s && this.handleLiveStatus(r);
      },
      onClose: (r) => {
        this.stream === s && L.has(r.code) && this.verifyAccessAfterClose();
      },
      shouldReconnect: (r) => !L.has(r.code)
    });
    this.stream = s, s.connect();
  }
  closeLive() {
    const e = this.stream;
    this.stream = null, this.freshStreamSnapshot = !1, this.clearSnapshotWait(), e?.close();
  }
  handleLiveStatus(e) {
    this.isClosed() || (this.setConnection(e), e === "connected" ? (this.store.discardBuffered(), this.freshStreamSnapshot = !0, this.awaitStreamSnapshot()) : e === "disconnected" && (this.clearSnapshotWait(), this.recover()));
  }
  awaitStreamSnapshot() {
    this.store.beginRecovery(), this.root.dataset.consoleSync = "recovering", this.clearSnapshotWait(), this.snapshotWaitTimer = setTimeout(() => {
      this.snapshotWaitTimer = null, this.recover();
    }, Math.max(0, this.options.snapshotWaitMs ?? me));
  }
  clearSnapshotWait() {
    this.snapshotWaitTimer !== null && (clearTimeout(this.snapshotWaitTimer), this.snapshotWaitTimer = null);
  }
  syncSubscription() {
    if (!this.stream) return;
    const e = this.store.panelIds();
    (e.length !== this.livePanels.length || e.some((t) => !this.livePanels.includes(t))) && (this.closeLive(), this.connectLive());
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
    if (Pe(e)) {
      this.clearSnapshotWait();
      const s = this.freshStreamSnapshot;
      this.freshStreamSnapshot = !1, this.acceptSnapshot(e, s) && this.recover();
      return;
    }
    if (!D(e)) return;
    const t = this.store.applyEvent(e);
    t === "applied" ? this.markPanelDirty(p(e.panel_id)) : t === "invalidated" ? (this.snapshotEpoch += 1, this.awaitStreamSnapshot()) : t === "gap" && this.recover();
  }
  deny(e) {
    if (this.state === "disposed") return;
    this.state = "denied", this.root.dataset.consoleState = "denied", this.closeLive(), this.controllers.forEach((s) => s.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.recoveryPending = !1, this.store.clear(), this.registry.clearServerDefinitions(), this.serverDefinitions.clear(), this.definitionSignatures.clear(), this.livePanels = [], this.actionResults.clear(), this.filterState.clear(), this.preferences.clear(), this.activePanel = "", this.setConnection("offline"), this.setRefreshEnabled(!1);
    const t = e.status === 401 ? "Your session expired. Sign in again to continue." : e.code === "IDENTITY_CHANGED" ? e.message : "You do not have access to this console.";
    this.setNotice("denied", t, "reload"), this.structureDirty = !0, this.flush();
  }
  declaredAction(e, t) {
    return !!this.serverDefinitions.get(e)?.ui?.actions?.some((r) => p(r.id) === t);
  }
  confirmAction(e) {
    const t = h(e.dataset.actionConfirm);
    return e.dataset.actionRequiresConfirm !== "true" && !t ? !0 : (this.options.confirm || ((s) => window.confirm(s)))(t || "Run this action?");
  }
  async runAction(e, t) {
    const s = p(e.dataset.panelId), r = p(e.dataset.actionId), i = this.bootstrap.urls.actions;
    if (this.state !== "ready" || this.options.display || !i || !s || !r || !this.visiblePanels().includes(s) || !this.declaredAction(s, r) || !this.confirmAction(e)) return;
    const n = J(e), o = he(i, {
      panel_id: s,
      action_id: r
    });
    t && (t.disabled = !0), this.clearFieldErrors(e);
    const a = new AbortController();
    this.controllers.add(a);
    const c = await w(o, {
      method: "POST",
      json: n,
      signal: a.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Action failed."
    });
    this.controllers.delete(a), t && (t.disabled = !1), !this.isClosed() && (c.ok ? this.applyActionResult(e, s, r, c.value) : this.applyActionFailure(e, s, r, c.status, c.error));
  }
  applyActionFailure(e, t, s, r, i) {
    if (r === 401) {
      this.deny(i);
      return;
    }
    const n = r === 403 ? "You are not allowed to run this action." : i.message;
    this.showFieldErrors(e, i.fields), this.showActionResult(t, {
      status: "error",
      message: n,
      actionID: s
    }), r === 403 && this.refresh();
  }
  applyActionResult(e, t, s, r) {
    const i = u(r) ? r : {}, n = i.ok === !1;
    n && u(i.errors) && this.showFieldErrors(e, Object.fromEntries(Object.entries(i.errors).map(([o, a]) => [o, typeof a == "string" ? a : P(a, { nullAsEmptyObject: !1 })]))), this.showActionResult(t, {
      status: n ? "error" : "ok",
      message: h(i.message) || (n ? "Action failed." : "Action complete."),
      actionID: s,
      data: i.data
    }), D(i.event) && this.handleLiveMessage(i.event), i.refresh && this.refresh();
  }
  showActionResult(e, t) {
    this.actionResults.set(e, t), e === this.activePanel && this.renderActionResult();
  }
  renderActionResult() {
    const e = this.actionResults.get(this.activePanel), t = Array.from(this.regions.panel.querySelectorAll("[data-panel-action-result]")).find((i) => i.dataset.panelActionResult === this.activePanel);
    if (!t) return;
    if (!e) {
      t.innerHTML = "";
      return;
    }
    const s = e.status === "error" ? this.styles.badgeError : this.styles.badge, r = e.data === void 0 ? "" : `<pre class="${this.styles.jsonPanel}">${b(P(e.data, { nullAsEmptyObject: !1 }))}</pre>`;
    t.innerHTML = `<div class="${s}" role="${e.status === "error" ? "alert" : "status"}">${b(e.message)}</div>${r}`;
  }
  clearFieldErrors(e) {
    e.querySelectorAll("[data-action-field-error]").forEach((t) => {
      t.textContent = "", t.hidden = !0;
    });
  }
  showFieldErrors(e, t) {
    Object.entries(t).forEach(([s, r]) => {
      const i = s.trim(), n = Array.from(e.querySelectorAll("[data-action-field-error]")).find((o) => o.dataset.actionFieldError === i || o.dataset.actionFieldName === i || o.dataset.actionFieldError === `payload.${i}`);
      n && (n.textContent = r, n.hidden = !1);
    });
  }
  ensureRegions() {
    const e = (o) => Array.from(this.root.querySelectorAll(o)).find((a) => a.closest(g) === this.root) || null, t = (o, a, c) => {
      const l = this.root.ownerDocument.createElement(o);
      return l.setAttribute(a, ""), l.className = c, this.root.appendChild(l), l;
    }, s = e("[data-console-notice]") || t("div", "data-console-notice", "console-notice"), r = e("[data-console-tabs]") || t("nav", "data-console-tabs", "console-tabs"), i = e("[data-console-filters]") || t("div", "data-console-filters", "console-filters"), n = e("[data-console-panel]") || t("section", "data-console-panel", "console-panel");
    return r.setAttribute("role", "tablist"), r.hasAttribute("aria-label") || r.setAttribute("aria-label", this.bootstrap.title || "Console panels"), n.id = n.id || `${this.idScope}-panel`, n.setAttribute("role", "tabpanel"), n.tabIndex = 0, {
      tabs: r,
      filters: i,
      panel: n,
      notice: s,
      ...this.resolveHeaderControls(e)
    };
  }
  resolveHeaderControls(e) {
    const t = e("[data-console-connection]"), s = e("[data-console-status]"), r = e('button[data-console-action="refresh"]');
    if (t || s || r)
      return this.root.dataset.consoleControls = "root", {
        connection: t,
        status: s,
        refresh: r,
        pageControls: null
      };
    const i = this.options.display ? null : this.pageControlsGroup();
    return i ? (E.set(i, this), this.root.dataset.consoleControls = "page", {
      connection: i.querySelector("[data-console-connection]"),
      status: i.querySelector("[data-console-status]"),
      refresh: i.querySelector('button[data-console-action="refresh"]'),
      pageControls: i
    }) : {
      connection: null,
      status: null,
      refresh: null,
      pageControls: null
    };
  }
  pageControlsGroup() {
    const e = this.root.id, t = this.root.ownerDocument, s = e ? Array.from(t.querySelectorAll(de)).filter((r) => r.getAttribute("data-console-for") === e && !r.closest(g)) : [];
    return s.length === 0 ? (this.root.dataset.consoleControls = "none", null) : t.querySelectorAll(`[id="${C(e)}"]`).length !== 1 || s.length !== 1 || E.has(s[0]) ? (this.root.dataset.consoleControls = "ambiguous", null) : s[0];
  }
  setRefreshEnabled(e) {
    const t = this.regions.refresh;
    t && (t.disabled = !e);
  }
  releaseHeaderControls() {
    this.connection = "offline", this.renderConnection(), this.setRefreshEnabled(!1);
    const e = this.regions.pageControls;
    e && E.get(e) === this && E.delete(e);
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
      const o = n.querySelector('button[type="submit"]');
      o?.disabled || this.runAction(n, o);
    }), this.listen(t, "change", (i) => {
      const n = i.target?.closest("[data-panel-action-picker]");
      n && t.contains(n) && this.updateActionPicker(n);
    }), this.listen(this.root, "click", (i) => {
      const n = i.target?.closest("[data-console-action]");
      if (!n || n.closest(g) !== this.root) return;
      const o = n.dataset.consoleAction;
      o === "retry" || o === "refresh" ? (i.preventDefault(), this.refresh()) : o === "reload" && (i.preventDefault(), this.root.ownerDocument.defaultView?.location.reload());
    });
    const r = this.regions.pageControls ? this.regions.refresh : null;
    r && this.listen(r, "click", (i) => {
      i.preventDefault(), r.disabled || this.refresh();
    }), this.setRefreshEnabled(!0);
  }
  handleTabKeydown(e) {
    const t = this.visiblePanels(), s = t.indexOf(this.activePanel);
    if (s < 0 || t.length === 0) return;
    let r = -1;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        r = (s + 1) % t.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        r = (s - 1 + t.length) % t.length;
        break;
      case "Home":
        r = 0;
        break;
      case "End":
        r = t.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault(), this.selectPanel(t[r], !0);
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
    const s = this.filterStateFor(e, t), r = u(s) ? { ...s } : {};
    this.regions.filters.querySelectorAll("[data-filter]").forEach((i) => {
      const n = i.dataset.filter || "";
      n && (r[n] = i instanceof HTMLInputElement && i.type === "checkbox" ? i.checked : i.value);
    }), this.filterState.set(e, r), this.renderPanel(!1);
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
    return this.byDeclaredOrder(this.store.panelIds()).filter((e) => this.registry.has(e));
  }
  byDeclaredOrder(e) {
    const t = (s) => {
      const r = this.serverDefinitions.get(s)?.order ?? this.registry.get(s)?.order;
      return typeof r == "number" && Number.isFinite(r) ? r : ve;
    };
    return e.map((s, r) => ({
      id: s,
      index: r,
      order: t(s)
    })).sort((s, r) => s.order - r.order || s.index - r.index).map((s) => s.id);
  }
  tabButton(e) {
    return this.regions.tabs.querySelector(`[data-console-tab="${C(e)}"]`);
  }
  renderTabs() {
    const e = this.visiblePanels(), t = this.root.ownerDocument.activeElement, s = t instanceof HTMLElement && this.regions.tabs.contains(t) && t.dataset.consoleTab || "";
    this.regions.tabs.hidden = e.length === 0 || !!this.options.display, this.regions.tabs.innerHTML = e.map((r) => {
      const i = this.registry.get(r), n = r === this.activePanel, o = this.panelCount(r, i);
      return `<button type="button" class="console-tab${n ? " console-tab--active" : ""}" role="tab" id="${v(`${this.idScope}-tab-${r}`)}" aria-selected="${n ? "true" : "false"}" aria-controls="${v(this.regions.panel.id)}" tabindex="${n ? "0" : "-1"}" data-console-tab="${v(r)}"><span class="console-tab__label">${b(i?.label || r)}</span><span class="console-tab__count" data-console-tab-count="${v(r)}">${b(R(o))}</span></button>`;
    }).join(""), this.activePanel ? this.regions.panel.setAttribute("aria-labelledby", `${this.idScope}-tab-${this.activePanel}`) : this.regions.panel.removeAttribute("aria-labelledby"), s && this.tabButton(e.includes(s) ? s : this.activePanel)?.focus();
  }
  updateCounts() {
    this.visiblePanels().forEach((e) => {
      const t = this.regions.tabs.querySelector(`[data-console-tab-count="${C(e)}"]`);
      t && (t.textContent = R(this.panelCount(e, this.registry.get(e))));
    });
  }
  panelCount(e, t) {
    const s = this.panelData(e);
    return t?.getCount ? t.getCount(s) : Y(s);
  }
  panelData(e) {
    const t = this.store.records(e), s = this.serverDefinitions.get(e), r = s?.ui?.views?.console || s?.ui?.views?.toolbar, i = p(r?.renderer);
    return t.length === 1 && !pe.has(i) ? t[0].data : t.map((n) => n.data);
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
    const t = this.regions.panel, s = this.activePanel, r = s ? this.registry.get(s) : void 0;
    if (!r || this.state !== "ready") {
      t.innerHTML = this.state === "ready" ? `<div class="${this.styles.emptyState}">No panels are available.</div>` : "", t.dataset.consolePanelId = "";
      return;
    }
    let i = this.panelData(s);
    r.applyFilters && (i = r.applyFilters(i, this.filterStateFor(s, r)));
    const n = this.renderOptions();
    if (this.options.display && r.renderBody) {
      t.innerHTML = r.renderBody(i, this.styles, n), t.dataset.consolePanelId = s;
      return;
    }
    if (r.renderActions && r.renderBody) {
      const o = t.querySelector(":scope > [data-console-panel-body]");
      if (!e && o && this.panelMounted(s)) {
        o.innerHTML = r.renderBody(i, this.styles, n);
        return;
      }
      t.innerHTML = `<div class="console-panel__actions" data-console-panel-actions>${r.renderActions(this.styles, n)}</div><div class="console-panel__body" data-console-panel-body>${r.renderBody(i, this.styles, n)}</div><div class="console-panel__result" data-panel-action-result="${v(s)}" aria-live="polite"></div>`;
    } else t.innerHTML = (r.renderConsole || r.render)(i, this.styles, n);
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
    this.root.dataset.consoleLive = this.connection, this.regions.status && (this.regions.status.dataset.status = this.connection), this.regions.connection && (this.regions.connection.textContent = e[this.connection]);
  }
  setNotice(e, t, s) {
    this.notice = {
      kind: e,
      message: t,
      action: s
    }, this.renderNotice();
  }
  renderNotice() {
    const { kind: e, message: t, action: s } = this.notice, r = this.regions.notice;
    if (r.dataset.consoleNotice = e, e === "none" || !t || this.options.display && e === "loading") {
      r.hidden = !0, r.innerHTML = "", r.removeAttribute("role");
      return;
    }
    r.hidden = !1, r.setAttribute("role", e === "error" || e === "denied" ? "alert" : "status");
    const i = s === "none" ? "" : ` <button type="button" class="console-btn" data-console-action="${s}">${s === "reload" ? "Reload" : "Retry"}</button>`;
    r.innerHTML = `<span class="console-notice__message">${b(t)}</span>${i}`;
  }
};
function q(e, t = {}) {
  const s = m.get(e);
  if (s) return s;
  const r = !!t.display || e.hasAttribute("data-console-display"), i = t.bootstrap ? x(t.bootstrap) : r ? Re(e) : Ce(e);
  if (!i)
    return e.dataset.consoleState = "error", null;
  const n = new we(e, i, r ? {
    ...t,
    display: !0,
    live: !1
  } : t);
  return m.set(e, n), n;
}
function rt(e) {
  return m.get(e) || null;
}
function Le(e) {
  m.get(e)?.destroy();
}
function ke(e = document, t = {}) {
  return Array.from(e.querySelectorAll(`${g}:not([data-console-manual])`)).map((s) => q(s, t)).filter((s) => s !== null);
}
var it = "1", O = "[data-console-root]:not([data-console-manual])";
function M(e) {
  if (!(e instanceof HTMLElement)) return [];
  const t = Array.from(e.querySelectorAll(O));
  return e.matches(O) ? [e, ...t] : t;
}
function De() {
  typeof MutationObserver > "u" || !document.body || new MutationObserver((e) => {
    e.forEach((t) => {
      t.removedNodes.forEach((s) => {
        M(s).forEach((r) => {
          r.isConnected || Le(r);
        });
      }), t.addedNodes.forEach((s) => {
        M(s).forEach((r) => {
          r.isConnected && q(r);
        });
      });
    });
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  });
}
var F = () => {
  ke(document), De();
};
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", F, { once: !0 }) : F());
export {
  z as ConsoleLiveStream,
  ne as ConsolePreferences,
  se as ConsoleRecordStore,
  we as ConsoleRuntime,
  it as PANEL_UI_SCHEMA_VERSION,
  ze as PanelRegistry,
  st as applyPanelActionNavigation,
  tt as applyPanelActionPayload,
  J as buildPanelActionPayload,
  re as consoleIdentityNamespace,
  j as consoleStyleConfig,
  G as createPanelRegistry,
  Y as defaultGetCount,
  Ke as defaultHandleEvent,
  Le as disposeConsole,
  v as escapeAttribute,
  b as escapeHTML,
  Be as fetchServerPanelDefinitions,
  rt as getMountedConsole,
  Je as getPanelCount,
  Ue as getPanelData,
  Ge as getSnapshotKey,
  je as isSchemaListRenderer,
  q as mountConsole,
  ke as mountConsoles,
  A as normalizeConsoleIdentity,
  Ve as normalizeEventTypes,
  et as panelActionHasSensitiveFields,
  U as panelDefinitionFromServer,
  Ce as readConsoleBootstrap,
  Re as readConsoleWidgetBootstrap,
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
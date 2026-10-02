import { escapeAttribute as g, escapeHTML as v } from "../shared/html.js";
import { httpRequest as q, readExpectedHTTPJSON as I, readHTTPStructuredErrorResult as H } from "../shared/transport/http-client.js";
import { C as B, S as j, _ as Oe, a as p, b as E, d as Fe, g as $e, h as Ne, i as xe, l as qe, n as Ie, o as He, r as W, y as P } from "../chunks/hydrate-mOOlPiY2.js";
import { a as U, c as je, d as We, i as Y, l as Ue, o as Ye, r as Ke, s as ze, u as Je } from "../chunks/avatar-DIbK-LSg.js";
import { n as Ge, r as K, t as z } from "../chunks/live-stream-CyiSPucB.js";
import { i as Xe, n as Ze, r as J, t as et } from "../chunks/actions-zb2HbM0q.js";
var V = 1e3, G = 500, Q = /* @__PURE__ */ new Set([
  "upsert",
  "delete",
  "invalidate"
]), X = [
  "console_id",
  "application_id",
  "environment_id",
  "actor_id",
  "scope_key"
];
function b(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function y(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function d(e) {
  return typeof e == "string" ? e.trim() : "";
}
function A(e) {
  const t = b(e) ? e : {};
  return {
    console_id: d(t.console_id),
    application_id: d(t.application_id),
    environment_id: d(t.environment_id),
    actor_id: d(t.actor_id),
    scope_key: d(t.scope_key)
  };
}
function R(e, t) {
  const s = A(t);
  return X.every((i) => e[i] === s[i]);
}
function Z(e) {
  if (!b(e)) return null;
  const t = d(e.record_key);
  if (!t) return null;
  const s = {
    record_key: t,
    revision: y(e.revision) ?? 0,
    data: e.data
  }, i = d(e.target_id);
  i && (s.target_id = i);
  const r = y(e.generation);
  return r !== null && (s.generation = r), s;
}
function F(e, t) {
  return `${e}\0${t}`;
}
function ee(e, t) {
  const s = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  for (const r of e) {
    const n = b(r) ? d(r.id).toLowerCase() : "";
    if (!n || s.has(n)) continue;
    const o = /* @__PURE__ */ new Map(), a = Array.isArray(r.records) ? r.records : [];
    for (const c of a) {
      const l = Z(c);
      if (l && (o.delete(l.record_key), o.set(l.record_key, l), l.target_id && l.generation !== void 0)) {
        const f = F(n, l.target_id);
        i.set(f, Math.max(i.get(f) ?? l.generation, l.generation));
      }
    }
    $(o, t), s.set(n, o);
  }
  return {
    panels: s,
    generations: i
  };
}
var te = class {
  constructor(e) {
    this.panels = /* @__PURE__ */ new Map(), this.generations = /* @__PURE__ */ new Map(), this.lastSequence = null, this.recovering = !0, this.buffer = [], this.bufferOverflowed = !1, this.identity = A(e.identity), this.sequenceMode = e.sequenceMode === "contiguous" ? "contiguous" : "monotonic", this.maxBufferedEvents = Math.max(1, e.maxBufferedEvents ?? V), this.maxRecordsPerPanel = Math.max(1, e.maxRecordsPerPanel ?? G);
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
    if (!b(e) || !Array.isArray(e.panels)) return {
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
    if (!R(this.identity, e)) return {
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
    const { panels: i, generations: r } = ee(e.panels, this.maxRecordsPerPanel);
    this.panels = i, this.generations = r, this.lastSequence = s, this.recovering = !1;
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
    if (!b(e)) return "malformed";
    const t = y(e.sequence), s = d(e.kind);
    return t === null || !Q.has(s) ? "malformed" : R(this.identity, e) ? s === "invalidate" ? (this.recovering = !0, "invalidated") : this.recovering || this.lastSequence === null ? (this.bufferEvent(e), "buffered") : t <= this.lastSequence ? "duplicate" : this.sequenceMode === "contiguous" && t > this.lastSequence + 1 ? (this.recovering = !0, this.bufferEvent(e), "gap") : (this.lastSequence = t, this.applyRecordEvent(e, s)) : "foreign";
  }
  bufferEvent(e) {
    this.buffer.length >= this.maxBufferedEvents && (this.buffer.shift(), this.bufferOverflowed = !0), this.buffer.push(e);
  }
  acceptGeneration(e, t, s) {
    if (!t || s === null) return !0;
    const i = F(e, t), r = this.generations.get(i);
    return r !== void 0 && s < r ? !1 : (this.generations.set(i, s), !0);
  }
  applyRecordEvent(e, t) {
    const s = d(e.panel_id).toLowerCase(), i = this.panels.get(s);
    if (!i) return "foreign";
    const r = d(e.record_key);
    if (!r) return "malformed";
    const n = d(e.target_id), o = y(e.generation);
    if (!this.acceptGeneration(s, n, o)) return "stale";
    const a = i.get(r), c = y(e.revision);
    if (c !== null && a && c <= a.revision) return "stale";
    if (t === "delete") return a && i.delete(r) ? "applied" : "stale";
    const l = {
      record_key: r,
      revision: c ?? (a ? a.revision + 1 : 0),
      data: e.data
    };
    return n && (l.target_id = n), o !== null && (l.generation = o), i.set(r, l), $(i, this.maxRecordsPerPanel), "applied";
  }
};
function $(e, t) {
  for (; e.size > t; ) {
    const s = e.keys().next().value;
    if (s === void 0) return;
    e.delete(s);
  }
}
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
            const r = t.key(i);
            r && r.startsWith(this.prefix) && s.push(r);
          }
          s.forEach((i) => t.removeItem(i));
        } catch {
        }
    }
  }
  storage(e) {
    return this.provider ? (e === "local" ? this.provider.local : this.provider.session) ?? null : ie(e);
  }
}, ne = /* @__PURE__ */ new Set([
  "retry",
  "reload",
  "none"
]);
function C(e) {
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
  const s = await H(e, t, { appendStatusToFallback: !1 }), i = s.payload && typeof s.payload == "object" ? s.payload : {}, r = s.details || {}, n = {
    ...C(i.fields),
    ...C(r.fields)
  }, o = String(r.action ?? i.action ?? "").trim().toLowerCase(), a = typeof s.message == "string" && s.message.trim() && s.message.length <= 500 ? s.message.trim() : t;
  return {
    status: e.status,
    code: s.code || (e.status === 401 ? "UNAUTHORIZED" : e.status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message: a,
    fields: n,
    action: ne.has(o) ? o : oe(e.status)
  };
}
function le(e) {
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: e,
    fields: {},
    action: "retry"
  };
}
async function _(e, t) {
  const { timeoutMs: s = 1e4, fallbackError: i, signal: r, ...n } = t, o = typeof AbortController < "u" ? new AbortController() : null, a = () => o?.abort();
  let c;
  r && (r.aborted ? a() : r.addEventListener("abort", a, { once: !0 })), o && s > 0 && (c = setTimeout(a, s));
  try {
    const l = await q(e, {
      credentials: "same-origin",
      ...n,
      signal: o?.signal ?? r
    });
    if (!l.ok) return {
      ok: !1,
      status: l.status,
      error: await ae(l, i)
    };
    const f = await I(l);
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
      error: le(i)
    };
  } finally {
    c !== void 0 && clearTimeout(c), r?.removeEventListener("abort", a);
  }
}
function ce(e, t) {
  let s = e;
  return Object.entries(t).forEach(([i, r]) => {
    const n = encodeURIComponent(r), o = i.replace(/_id$|_key$/, "");
    s = s.split(`{${i}}`).join(n).split(`{${o}}`).join(n).replace(new RegExp(`:${i}(?=$|[/?#.])`, "g"), () => n).replace(new RegExp(`:${o}(?=$|[/?#.])`, "g"), () => n);
  }), s;
}
var S = "[data-console-root]", he = 'script[type="application/json"][data-console-bootstrap]', de = 'script[type="application/json"][data-console-widget]', ue = /* @__PURE__ */ new Set([
  "table",
  "status_list",
  "timeline"
]), T = /* @__PURE__ */ new Set([
  1008,
  4401,
  4403
]), fe = [
  1e3,
  2e3,
  5e3,
  1e4,
  3e4
], w = "active-panel", pe = 16, ye = 5e3, me = 100, ge = 3, ve = 6e4, m = /* @__PURE__ */ new WeakMap(), be = 0;
function u(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function h(e) {
  return typeof e == "string" ? e.trim() : "";
}
function Se(e) {
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
function Ae(e) {
  const t = Array.from(e.querySelectorAll(he)).find((s) => s.closest(S) === e);
  if (!t) return null;
  try {
    return N(JSON.parse(t.textContent || ""));
  } catch {
    return null;
  }
}
function Ee(e) {
  const t = Array.from(e.querySelectorAll(de)).find((s) => s.closest(S) === e);
  if (!t) return null;
  try {
    const s = JSON.parse(t.textContent || "");
    if (!u(s) || !u(s.panel)) return null;
    const i = A(s), r = typeof s.watermark == "number" ? s.watermark : 0;
    return i.console_id ? {
      ...i,
      title: h(s.panel.label) || void 0,
      urls: { snapshot: "" },
      snapshot: {
        ...i,
        watermark: r,
        panels: [s.panel]
      }
    } : null;
  } catch {
    return null;
  }
}
function N(e) {
  if (!u(e)) return null;
  const t = A(e), s = Se(e.urls);
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
function Re(e, t, s) {
  const [i, r] = e.split("#"), n = `${i}${i.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return r === void 0 ? n : `${n}#${r}`;
}
function L(e) {
  return u(e) && typeof e.sequence == "number" && typeof e.kind == "string" && typeof e.console_id == "string";
}
function k(e) {
  const t = globalThis.CSS?.escape;
  return t ? t(e) : e.replace(/["\\]/g, "\\$&");
}
function Ce(e) {
  if (typeof requestAnimationFrame == "function") {
    const s = requestAnimationFrame(() => e());
    return () => cancelAnimationFrame(s);
  }
  const t = setTimeout(e, pe);
  return () => clearTimeout(t);
}
var _e = class {
  constructor(e, t, s = {}) {
    this.serverDefinitions = /* @__PURE__ */ new Map(), this.filterState = /* @__PURE__ */ new Map(), this.actionResults = /* @__PURE__ */ new Map(), this.controllers = /* @__PURE__ */ new Set(), this.cleanup = [], this.state = "loading", this.connection = "offline", this.activePanel = "", this.policyCloses = [], this.stream = null, this.recoveryPromise = null, this.recoveryPending = !1, this.snapshotEpoch = 0, this.freshStreamSnapshot = !1, this.recoveryAttempts = 0, this.recoveryTimer = null, this.cancelFrame = null, this.dirtyPanels = /* @__PURE__ */ new Set(), this.structureDirty = !1, this.livePanels = [], this.snapshotWaitTimer = null, this.definitionSignatures = /* @__PURE__ */ new Map(), this.notice = {
      kind: "loading",
      message: "Loading console…",
      action: "none"
    }, this.root = e, this.bootstrap = t, this.options = s, this.styles = s.styles || B, this.identity = A(t), this.idScope = `console-${be += 1}`, this.registry = Y(), this.store = new te({
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
    return this.panelData(p(e));
  }
  selectPanel(e, t = !1) {
    const s = p(e);
    return !s || !this.visiblePanels().includes(s) || this.state === "disposed" ? !1 : (s !== this.activePanel && (this.activePanel = s, this.preferences.set(w, s, "session"), this.renderTabs(), this.renderFilters(), this.renderPanel(!0)), t && this.tabButton(s)?.focus(), !0);
  }
  refresh() {
    this.recoveryAttempts = 0, this.policyCloses = [];
    const e = this.recover();
    return (!this.stream || this.stream.getStatus() === "disconnected") && e.then(() => {
      !this.isClosed() && this.state === "ready" && (!this.stream || this.stream.getStatus() === "disconnected") && (this.closeLive(), this.connectLive());
    }), e;
  }
  destroy() {
    this.state !== "disposed" && (this.state = "disposed", this.closeLive(), this.controllers.forEach((e) => e.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.cancelFrame?.(), this.cancelFrame = null, this.cleanup.splice(0).forEach((e) => e()), this.registry.dispose(), this.store.clear(), this.serverDefinitions.clear(), this.actionResults.clear(), this.filterState.clear(), m.get(this.root) === this && m.delete(this.root), this.root.dataset.consoleState = "disposed");
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
      const s = await _(this.bootstrap.urls.snapshot, {
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
    const t = this.options.recoveryDelaysMs || fe, s = this.recoveryAttempts;
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
    e.forEach((i) => {
      const r = p(i?.id);
      if (!r || t.has(r)) return;
      t.add(r);
      const { records: n, ...o } = i, a = j(JSON.stringify(o));
      if (this.definitionSignatures.get(r) === a && this.registry.has(r)) return;
      this.definitionSignatures.set(r, a), this.serverDefinitions.set(r, o);
      const c = W(o, {
        consoleRenderer: this.options.renderers?.[r],
        styles: this.styles
      });
      c && this.registry.registerServerDefinition(c);
    });
    for (const i of Array.from(this.serverDefinitions.keys())) t.has(i) || (this.serverDefinitions.delete(i), this.definitionSignatures.delete(i), this.filterState.delete(i), this.actionResults.delete(i), this.registry.isServerDefinition(i) && this.registry.unregister(i));
    const s = this.visiblePanels();
    if (!s.includes(this.activePanel)) {
      const i = p(this.preferences.get(w, "session"));
      this.activePanel = s.includes(i) ? i : s[0] || "";
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
      url: Re(e, "panels", t.join(",")),
      onMessage: (i) => {
        this.stream === s && this.handleLiveMessage(i);
      },
      onStatusChange: (i) => {
        this.stream === s && this.handleLiveStatus(i);
      },
      onClose: (i) => {
        this.stream === s && T.has(i.code) && this.verifyAccessAfterClose();
      },
      shouldReconnect: (i) => !T.has(i.code)
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
    }, Math.max(0, this.options.snapshotWaitMs ?? ye));
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
    if (this.policyCloses = this.policyCloses.filter((t) => e - t < ve), this.policyCloses.push(e), await this.recover(), !(this.isClosed() || this.state !== "ready")) {
      if (this.policyCloses.length > ge) {
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
    if (!L(e)) return;
    const t = this.store.applyEvent(e);
    t === "applied" ? this.markPanelDirty(p(e.panel_id)) : t === "invalidated" ? (this.snapshotEpoch += 1, this.awaitStreamSnapshot()) : t === "gap" && this.recover();
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
    const s = p(e.dataset.panelId), i = p(e.dataset.actionId), r = this.bootstrap.urls.actions;
    if (this.state !== "ready" || this.options.display || !r || !s || !i || !this.visiblePanels().includes(s) || !this.declaredAction(s, i) || !this.confirmAction(e)) return;
    const n = J(e), o = ce(r, {
      panel_id: s,
      action_id: i
    });
    t && (t.disabled = !0), this.clearFieldErrors(e);
    const a = new AbortController();
    this.controllers.add(a);
    const c = await _(o, {
      method: "POST",
      json: n,
      signal: a.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Action failed."
    });
    this.controllers.delete(a), t && (t.disabled = !1), !this.isClosed() && (c.ok ? this.applyActionResult(e, s, i, c.value) : this.applyActionFailure(e, s, i, c.status, c.error));
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
    const r = u(i) ? i : {}, n = r.ok === !1;
    n && u(r.errors) && this.showFieldErrors(e, Object.fromEntries(Object.entries(r.errors).map(([o, a]) => [o, typeof a == "string" ? a : P(a, { nullAsEmptyObject: !1 })]))), this.showActionResult(t, {
      status: n ? "error" : "ok",
      message: h(r.message) || (n ? "Action failed." : "Action complete."),
      actionID: s,
      data: r.data
    }), L(r.event) && this.handleLiveMessage(r.event), r.refresh && this.refresh();
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
    const s = e.status === "error" ? this.styles.badgeError : this.styles.badge, i = e.data === void 0 ? "" : `<pre class="${this.styles.jsonPanel}">${v(P(e.data, { nullAsEmptyObject: !1 }))}</pre>`;
    t.innerHTML = `<div class="${s}" role="${e.status === "error" ? "alert" : "status"}">${v(e.message)}</div>${i}`;
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
    const e = (o) => Array.from(this.root.querySelectorAll(o)).find((a) => a.closest(S) === this.root) || null, t = (o, a, c) => {
      const l = this.root.ownerDocument.createElement(o);
      return l.setAttribute(a, ""), l.className = c, this.root.appendChild(l), l;
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
      if (!r || r.closest(S) !== this.root) return;
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
    const s = this.filterStateFor(e, t), i = u(s) ? { ...s } : {};
    this.regions.filters.querySelectorAll("[data-filter]").forEach((r) => {
      const n = r.dataset.filter || "";
      n && (i[n] = r instanceof HTMLInputElement && r.type === "checkbox" ? r.checked : r.value);
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
    this.dirtyPanels.add(e), !this.cancelFrame && (this.cancelFrame = Ce(() => {
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
      const i = this.serverDefinitions.get(s)?.order ?? this.registry.get(s)?.order;
      return typeof i == "number" && Number.isFinite(i) ? i : me;
    };
    return e.map((s, i) => ({
      id: s,
      index: i,
      order: t(s)
    })).sort((s, i) => s.order - i.order || s.index - i.index).map((s) => s.id);
  }
  tabButton(e) {
    return this.regions.tabs.querySelector(`[data-console-tab="${k(e)}"]`);
  }
  renderTabs() {
    const e = this.visiblePanels(), t = this.root.ownerDocument.activeElement, s = t instanceof HTMLElement && this.regions.tabs.contains(t) && t.dataset.consoleTab || "";
    this.regions.tabs.hidden = e.length === 0 || !!this.options.display, this.regions.tabs.innerHTML = e.map((i) => {
      const r = this.registry.get(i), n = i === this.activePanel, o = this.panelCount(i, r);
      return `<button type="button" class="console-tab${n ? " console-tab--active" : ""}" role="tab" id="${g(`${this.idScope}-tab-${i}`)}" aria-selected="${n ? "true" : "false"}" aria-controls="${g(this.regions.panel.id)}" tabindex="${n ? "0" : "-1"}" data-console-tab="${g(i)}"><span class="console-tab__label">${v(r?.label || i)}</span><span class="console-tab__count" data-console-tab-count="${g(i)}">${v(E(o))}</span></button>`;
    }).join(""), this.activePanel ? this.regions.panel.setAttribute("aria-labelledby", `${this.idScope}-tab-${this.activePanel}`) : this.regions.panel.removeAttribute("aria-labelledby"), s && this.tabButton(e.includes(s) ? s : this.activePanel)?.focus();
  }
  updateCounts() {
    this.visiblePanels().forEach((e) => {
      const t = this.regions.tabs.querySelector(`[data-console-tab-count="${k(e)}"]`);
      t && (t.textContent = E(this.panelCount(e, this.registry.get(e))));
    });
  }
  panelCount(e, t) {
    const s = this.panelData(e);
    return t?.getCount ? t.getCount(s) : U(s);
  }
  panelData(e) {
    const t = this.store.records(e), s = this.serverDefinitions.get(e), i = s?.ui?.views?.console || s?.ui?.views?.toolbar, r = p(i?.renderer);
    return t.length === 1 && !ue.has(r) ? t[0].data : t.map((n) => n.data);
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
    let r = this.panelData(s);
    i.applyFilters && (r = i.applyFilters(r, this.filterStateFor(s, i)));
    const n = this.renderOptions();
    if (this.options.display && i.renderBody) {
      t.innerHTML = i.renderBody(r, this.styles, n), t.dataset.consolePanelId = s;
      return;
    }
    if (i.renderActions && i.renderBody) {
      const o = t.querySelector(":scope > [data-console-panel-body]");
      if (!e && o && this.panelMounted(s)) {
        o.innerHTML = i.renderBody(r, this.styles, n);
        return;
      }
      t.innerHTML = `<div class="console-panel__actions" data-console-panel-actions>${i.renderActions(this.styles, n)}</div><div class="console-panel__body" data-console-panel-body>${i.renderBody(r, this.styles, n)}</div><div class="console-panel__result" data-panel-action-result="${g(s)}" aria-live="polite"></div>`;
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
    const { kind: e, message: t, action: s } = this.notice, i = this.regions.notice;
    if (i.dataset.consoleNotice = e, e === "none" || !t || this.options.display && e === "loading") {
      i.hidden = !0, i.innerHTML = "", i.removeAttribute("role");
      return;
    }
    i.hidden = !1, i.setAttribute("role", e === "error" || e === "denied" ? "alert" : "status");
    const r = s === "none" ? "" : ` <button type="button" class="console-btn" data-console-action="${s}">${s === "reload" ? "Reload" : "Retry"}</button>`;
    i.innerHTML = `<span class="console-notice__message">${v(t)}</span>${r}`;
  }
};
function x(e, t = {}) {
  const s = m.get(e);
  if (s) return s;
  const i = !!t.display || e.hasAttribute("data-console-display"), r = t.bootstrap ? N(t.bootstrap) : i ? Ee(e) : Ae(e);
  if (!r)
    return e.dataset.consoleState = "error", null;
  const n = new _e(e, r, i ? {
    ...t,
    display: !0,
    live: !1
  } : t);
  return m.set(e, n), n;
}
function tt(e) {
  return m.get(e) || null;
}
function Te(e) {
  m.get(e)?.destroy();
}
function we(e = document, t = {}) {
  return Array.from(e.querySelectorAll(`${S}:not([data-console-manual])`)).map((s) => x(s, t)).filter((s) => s !== null);
}
var st = "1", D = "[data-console-root]:not([data-console-manual])";
function M(e) {
  if (!(e instanceof HTMLElement)) return [];
  const t = Array.from(e.querySelectorAll(D));
  return e.matches(D) ? [e, ...t] : t;
}
function Le() {
  typeof MutationObserver > "u" || !document.body || new MutationObserver((e) => {
    e.forEach((t) => {
      t.removedNodes.forEach((s) => {
        M(s).forEach((i) => {
          i.isConnected || Te(i);
        });
      }), t.addedNodes.forEach((s) => {
        M(s).forEach((i) => {
          i.isConnected && x(i);
        });
      });
    });
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  });
}
var O = () => {
  we(document), Le();
};
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", O, { once: !0 }) : O());
export {
  z as ConsoleLiveStream,
  re as ConsolePreferences,
  te as ConsoleRecordStore,
  _e as ConsoleRuntime,
  st as PANEL_UI_SCHEMA_VERSION,
  Ke as PanelRegistry,
  et as applyPanelActionNavigation,
  Ze as applyPanelActionPayload,
  J as buildPanelActionPayload,
  se as consoleIdentityNamespace,
  B as consoleStyleConfig,
  Y as createPanelRegistry,
  U as defaultGetCount,
  Ye as defaultHandleEvent,
  Te as disposeConsole,
  g as escapeAttribute,
  v as escapeHTML,
  Ie as fetchServerPanelDefinitions,
  tt as getMountedConsole,
  ze as getPanelCount,
  je as getPanelData,
  Ue as getSnapshotKey,
  He as isSchemaListRenderer,
  x as mountConsole,
  we as mountConsoles,
  A as normalizeConsoleIdentity,
  Je as normalizeEventTypes,
  Xe as panelActionHasSensitiveFields,
  W as panelDefinitionFromServer,
  Ae as readConsoleBootstrap,
  Ee as readConsoleWidgetBootstrap,
  xe as registerServerPanelDefinitions,
  $e as renderJSONPanel,
  Oe as renderJSONViewer,
  We as renderPanelContent,
  qe as renderSchemaListRow,
  Fe as renderSchemaPanelView,
  Ge as resolveLiveURL,
  R as sameConsoleIdentity,
  Ne as schemaRowKey
};

//# sourceMappingURL=index.js.map
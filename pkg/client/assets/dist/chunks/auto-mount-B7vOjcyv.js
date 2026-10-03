import { escapeAttribute as p, escapeHTML as g } from "../shared/html.js";
import { n as ve, t as we } from "./modal-coordinator-HTtA8-3F.js";
import { a as Q, r as X } from "./busy-D8dMtGI2.js";
import { S as Se, d as Z, f as Ae, g as ee, h as ue, l as ke, n as Ee, p as te, t as q, u as _e, v as M, y as Ce } from "./rich-C-60Te1B.js";
import { a as De, i as Re } from "./avatar-DIbK-LSg.js";
import { r as qe, t as Te } from "./live-stream-CyiSPucB.js";
import { n as G, t as O } from "./http-B2ojv2Fu.js";
import { a as h, o as Fe, r as Le } from "./hydrate-CnDSPe87.js";
import { a as x, n as Pe, r as B } from "./actions-wQfzbd0C.js";
var Ie = 1e3, Oe = 500, $e = /* @__PURE__ */ new Set([
  "upsert",
  "delete",
  "invalidate"
]), Ne = [
  "console_id",
  "application_id",
  "environment_id",
  "actor_id",
  "scope_key"
];
function T(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function D(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function b(e) {
  return typeof e == "string" ? e.trim() : "";
}
function L(e) {
  const t = T(e) ? e : {};
  return {
    console_id: b(t.console_id),
    application_id: b(t.application_id),
    environment_id: b(t.environment_id),
    actor_id: b(t.actor_id),
    scope_key: b(t.scope_key)
  };
}
function se(e, t) {
  const s = L(t);
  return Ne.every((i) => e[i] === s[i]);
}
function Me(e) {
  if (!T(e)) return null;
  const t = b(e.record_key);
  if (!t) return null;
  const s = {
    record_key: t,
    revision: D(e.revision) ?? 0,
    data: e.data
  }, i = b(e.target_id);
  i && (s.target_id = i);
  const n = D(e.generation);
  return n !== null && (s.generation = n), s;
}
function he(e, t) {
  return `${e}\0${t}`;
}
function xe(e, t) {
  const s = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  for (const n of e) {
    const r = T(n) ? b(n.id).toLowerCase() : "";
    if (!r || s.has(r)) continue;
    const o = /* @__PURE__ */ new Map(), a = Array.isArray(n.records) ? n.records : [];
    for (const l of a) {
      const c = Me(l);
      if (c && (o.delete(c.record_key), o.set(c.record_key, c), c.target_id && c.generation !== void 0)) {
        const u = he(r, c.target_id);
        i.set(u, Math.max(i.get(u) ?? c.generation, c.generation));
      }
    }
    fe(o, t), s.set(r, o);
  }
  return {
    panels: s,
    generations: i
  };
}
var Be = class {
  constructor(e) {
    this.panels = /* @__PURE__ */ new Map(), this.generations = /* @__PURE__ */ new Map(), this.lastSequence = null, this.recovering = !0, this.buffer = [], this.bufferOverflowed = !1, this.identity = L(e.identity), this.sequenceMode = e.sequenceMode === "contiguous" ? "contiguous" : "monotonic", this.maxBufferedEvents = Math.max(1, e.maxBufferedEvents ?? Ie), this.maxRecordsPerPanel = Math.max(1, e.maxRecordsPerPanel ?? Oe);
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
    if (!T(e) || !Array.isArray(e.panels)) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    const s = D(e.watermark);
    if (s === null || s < 0) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    if (!se(this.identity, e)) return {
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
    const { panels: i, generations: n } = xe(e.panels, this.maxRecordsPerPanel);
    this.panels = i, this.generations = n, this.lastSequence = s, this.recovering = !1;
    const r = [...this.buffer].sort((c, u) => c.sequence - u.sequence), o = this.bufferOverflowed;
    this.buffer = [], this.bufferOverflowed = !1;
    let a = 0, l = !1;
    for (const c of r) {
      const u = this.applyEvent(c);
      u === "applied" ? a += 1 : (u === "gap" || u === "invalidated") && (l = !0);
    }
    return o && !l && (l = !0, this.recovering = !0), {
      ok: !0,
      replayed: a,
      needsRecovery: l
    };
  }
  applyEvent(e) {
    if (!T(e)) return "malformed";
    const t = D(e.sequence), s = b(e.kind);
    return t === null || !$e.has(s) ? "malformed" : se(this.identity, e) ? s === "invalidate" ? (this.recovering = !0, "invalidated") : this.recovering || this.lastSequence === null ? (this.bufferEvent(e), "buffered") : t <= this.lastSequence ? "duplicate" : this.sequenceMode === "contiguous" && t > this.lastSequence + 1 ? (this.recovering = !0, this.bufferEvent(e), "gap") : (this.lastSequence = t, this.applyRecordEvent(e, s)) : "foreign";
  }
  bufferEvent(e) {
    this.buffer.length >= this.maxBufferedEvents && (this.buffer.shift(), this.bufferOverflowed = !0), this.buffer.push(e);
  }
  acceptGeneration(e, t, s) {
    if (!t || s === null) return !0;
    const i = he(e, t), n = this.generations.get(i);
    return n !== void 0 && s < n ? !1 : (this.generations.set(i, s), !0);
  }
  applyRecordEvent(e, t) {
    const s = b(e.panel_id).toLowerCase(), i = this.panels.get(s);
    if (!i) return "foreign";
    const n = b(e.record_key);
    if (!n) return "malformed";
    const r = b(e.target_id), o = D(e.generation);
    if (!this.acceptGeneration(s, r, o)) return "stale";
    const a = i.get(n), l = D(e.revision);
    if (l !== null && a && l <= a.revision) return "stale";
    if (t === "delete") return a && i.delete(n) ? "applied" : "stale";
    const c = {
      record_key: n,
      revision: l ?? (a ? a.revision + 1 : 0),
      data: e.data
    };
    return r && (c.target_id = r), o !== null && (c.generation = o), i.set(n, c), fe(i, this.maxRecordsPerPanel), "applied";
  }
};
function fe(e, t) {
  for (; e.size > t; ) {
    const s = e.keys().next().value;
    if (s === void 0) return;
    e.delete(s);
  }
}
function He(e) {
  return JSON.stringify({
    console_id: e.console_id,
    application_id: e.application_id,
    environment_id: e.environment_id,
    actor_id: e.actor_id,
    scope_key: e.scope_key
  });
}
function Ue(e) {
  try {
    return (e === "local" ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}
var We = class {
  constructor(e, t = null) {
    this.prefix = qe(e, ""), this.provider = t;
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
    return this.provider ? (e === "local" ? this.provider.local : this.provider.session) ?? null : Ue(e);
  }
}, pe = "This browser cannot create a request ID. Use a current browser to run this action.", Ve = "This request is still being sent.", H = "The earlier request may have been received. Check its status before starting new work.", je = "The earlier request can no longer be confirmed. Start a new request to continue.", Ge = "The earlier request’s state is unknown. Check again, or start a new request.", Ke = "This request was restored without all of its input. Check its status or start a new request.", K = 8192, Je = 864e5, me = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function P(e = globalThis.crypto) {
  try {
    if (typeof e?.randomUUID == "function") {
      const t = e.randomUUID().toLowerCase();
      if (me.test(t)) return t;
    }
    if (typeof e?.getRandomValues == "function") {
      const t = e.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
      if (!t) return "";
      t[6] = t[6] & 15 | 64, t[8] = t[8] & 63 | 128;
      const s = Array.from(t, (i) => i.toString(16).padStart(2, "0")).join("");
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
    }
  } catch {
  }
  return "";
}
function F(e) {
  return typeof e == "string" && me.test(e);
}
function J(e) {
  return Array.isArray(e) ? `[${e.map((t) => J(t)).join(",")}]` : e && typeof e == "object" ? `{${Object.entries(e).filter(([, t]) => t !== void 0).sort(([t], [s]) => t < s ? -1 : t > s ? 1 : 0).map(([t, s]) => `${JSON.stringify(t)}:${J(s)}`).join(",")}}` : JSON.stringify(e ?? null);
}
function f(e, t) {
  return `${e}\0${t}`;
}
function ye(e, t, s = P) {
  return {
    panelID: e,
    actionID: t,
    nextID: s(),
    current: null
  };
}
function U(e) {
  return !!e && e.state !== "resolved";
}
function ge(e, t = Date.now()) {
  if (e.partial || ![
    "uncertain",
    "unclaimed",
    "resolved"
  ].includes(e.state)) return !1;
  const s = Date.parse(e.retryUntil || "");
  return Number.isFinite(s) && t < s;
}
function Ye(e, t, s, i = Date.now()) {
  const n = typeof s == "string" ? Date.parse(s) : NaN;
  return e.retryUntil = Number.isFinite(n) ? new Date(n).toISOString() : void 0, t === "claimed" ? e.state = "resolved" : t === "unclaimed" && Number.isFinite(n) ? e.state = i < n ? "unclaimed" : "expired" : e.state = t === "unclaimed" || t === "unknown" ? "unknown" : "expired", e.state;
}
function ie(e, t, s) {
  const i = e.current;
  return i && i.state === "pending" ? {
    kind: "blocked",
    reason: Ve
  } : i && i.state === "checking" ? {
    kind: "blocked",
    reason: H,
    check: !0
  } : i && i.mode === t && i.signature === s ? i.state === "expired" ? {
    kind: "blocked",
    reason: je
  } : i.state === "unknown" ? {
    kind: "blocked",
    reason: Ge,
    check: !0
  } : i.partial ? {
    kind: "blocked",
    reason: Ke,
    check: !0
  } : ge(i) ? {
    kind: "replay",
    request: i
  } : {
    kind: "blocked",
    reason: H,
    check: !0
  } : i && i.state === "uncertain" ? {
    kind: "blocked",
    reason: H,
    check: !0
  } : F(e.nextID) ? {
    kind: "new",
    id: e.nextID
  } : {
    kind: "blocked",
    reason: pe
  };
}
function ze(e, t, s, i, n, r, o = P, a = /* @__PURE__ */ new Date()) {
  const l = {
    id: t,
    mode: s,
    payload: JSON.parse(JSON.stringify(i)),
    signature: n,
    submittedAt: a.toISOString(),
    scope: r,
    state: "pending"
  };
  return e.current = l, e.nextID === t && (e.nextID = o()), l;
}
function Qe(e, t = P) {
  const s = e.current;
  return s && (s.state === "pending" || s.state === "checking" || s.state === "uncertain") ? !1 : (e.current = null, F(e.nextID) || (e.nextID = t()), !0);
}
function Xe(e) {
  return e.current?.id || e.nextID;
}
function ne(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function _(e) {
  return typeof e == "string" ? e.trim() : "";
}
function Ze(e, t) {
  if (!ne(e)) return null;
  const s = {
    panel_id: _(e.panel_id).toLowerCase(),
    action_id: _(e.action_id).toLowerCase(),
    request_id: _(e.request_id).toLowerCase(),
    mode: e.mode === "secondary" ? "secondary" : "primary",
    scope: _(e.scope).slice(0, 200),
    submitted_at: _(e.submitted_at),
    signature: typeof e.signature == "string" ? e.signature.slice(0, K) : "",
    state: [
      "pending",
      "uncertain",
      "checking",
      "unclaimed",
      "unknown",
      "expired"
    ].includes(e.state) ? e.state : "uncertain",
    payload: ne(e.payload) ? e.payload : void 0,
    retry_until: _(e.retry_until) || void 0
  }, i = Date.parse(s.submitted_at);
  return !s.panel_id || !s.action_id || !F(s.request_id) || Number.isNaN(i) || t - i > Je || i - t > 3e5 ? null : s;
}
var et = class {
  constructor(e) {
    this.store = e;
  }
  entries(e = Date.now()) {
    const t = this.store?.get();
    if (!t) return [];
    try {
      const s = JSON.parse(t);
      return Array.isArray(s) ? s.map((i) => Ze(i, e)).filter((i) => i !== null).slice(-16) : [];
    } catch {
      return [];
    }
  }
  put(e, t, s) {
    if (!this.store) return !1;
    const i = {
      panel_id: e.panelID,
      action_id: e.actionID,
      request_id: t.id,
      mode: t.mode,
      scope: t.scope,
      submitted_at: t.submittedAt,
      signature: t.signature,
      state: t.state === "resolved" ? "uncertain" : t.state,
      retry_until: t.retryUntil
    }, n = JSON.stringify(t.payload);
    !s && !t.partial && n.length <= K && i.signature.length <= K ? i.payload = JSON.parse(n) : i.signature = "";
    const r = this.entries().filter((o) => o.request_id !== i.request_id && !(o.panel_id === i.panel_id && o.action_id === i.action_id));
    return r.push(i), this.write(r.slice(-16));
  }
  remove(e) {
    if (!this.store) return;
    const t = this.entries(), s = t.filter((i) => i.request_id !== e);
    s.length !== t.length && this.write(s);
  }
  clear() {
    this.store?.remove();
  }
  write(e) {
    return this.store ? e.length === 0 ? (this.store.remove(), !0) : this.store.set(JSON.stringify(e)) : !1;
  }
};
function tt(e, t = P) {
  const s = ye(e.panel_id, e.action_id, t);
  return s.current = {
    id: e.request_id,
    mode: e.mode,
    payload: e.payload || {},
    signature: e.signature,
    submittedAt: e.submitted_at,
    scope: e.scope,
    state: e.state === "expired" ? "expired" : "uncertain",
    retryUntil: e.retry_until,
    partial: !e.payload || !e.signature
  }, s;
}
var st = 16, it = class {
  constructor(e) {
    this.layer = null, this.closed = !1, this.releaseListeners = [], this.options = e, this.panelID = e.panelID, this.actionID = e.actionID;
    const t = e.root.ownerDocument, s = `${e.id}-title`, i = t.createElement("div");
    i.className = "console-drawer-layer", i.setAttribute("data-console-drawer-layer", ""), i.dataset.state = "opening", i.innerHTML = `
      <div class="console-drawer__backdrop" data-drawer-backdrop></div>
      <aside class="console-drawer" role="dialog" aria-modal="true" aria-labelledby="${p(s)}" data-console-drawer data-panel-id="${p(e.panelID)}" data-action-id="${p(e.actionID)}">
        <header class="console-drawer__header">
          <div class="console-drawer__heading">
            ${e.eyebrow ? `<p class="console-drawer__eyebrow">${g(e.eyebrow)}</p>` : ""}
            <h2 class="console-drawer__title" id="${p(s)}">${g(e.title)}</h2>
          </div>
          <button type="button" class="console-btn console-btn--ghost console-btn--icon" data-drawer-close aria-label="Close"><span aria-hidden="true">×</span></button>
        </header>
        ${e.body}
      </aside>
    `, this.element = i, this.dialog = i.querySelector("[data-console-drawer]"), e.root.appendChild(i), this.layer = ve({
      container: this.dialog,
      zIndexTarget: i,
      initialFocus: null,
      returnFocus: null,
      dismissOnEscape: !0,
      onEscape: () => this.close(),
      lockBodyScroll: !0
    }), this.listen(this.dialog, "keydown", (r) => {
      const o = r;
      if (o.key !== "Tab" || o.defaultPrevented || o.altKey || o.ctrlKey || o.metaKey) return;
      const a = we(this.dialog);
      if (a.length === 0) return;
      const l = a.indexOf(t.activeElement), c = a.length - 1, u = o.shiftKey ? l <= 0 ? c : l - 1 : l < 0 || l === c ? 0 : l + 1;
      o.preventDefault(), a[u].focus();
    }), this.listen(i, "click", (r) => {
      const o = r.target;
      (o?.closest("[data-drawer-close], [data-drawer-cancel]") || o?.hasAttribute("data-drawer-backdrop")) && (r.preventDefault(), this.close());
    });
    const n = () => {
      this.closed || (i.dataset.state = "open");
    };
    typeof requestAnimationFrame == "function" ? requestAnimationFrame(n) : setTimeout(n, st), this.focusInitial();
  }
  isOpen() {
    return !this.closed;
  }
  focusInitial() {
    const e = this.dialog.querySelector('input:not([type="hidden"]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-submitter="primary"]:not([disabled])');
    this.layer?.focusInitial(e || void 0);
  }
  close(e = !0) {
    if (this.closed) return;
    this.closed = !0, this.releaseListeners.splice(0).forEach((s) => s());
    const t = this.layer;
    if (this.layer = null, t?.release({ restoreFocus: !1 }), this.element.remove(), e) {
      const s = this.options.root.ownerDocument, i = s.activeElement;
      if (!i || i === s.body || !i.isConnected) {
        const n = this.options.invoker;
        (n && n.isConnected && !n.closest("[hidden]") ? n : this.options.fallbackFocus())?.focus({ preventScroll: !1 });
      }
    }
    this.options.onClose?.();
  }
  listen(e, t, s) {
    e.addEventListener(t, s), this.releaseListeners.push(() => e.removeEventListener(t, s));
  }
}, y = "[data-console-root]", nt = "[data-console-page-actions][data-console-for]", rt = 'script[type="application/json"][data-console-bootstrap]', ot = 'script[type="application/json"][data-console-widget]', at = /* @__PURE__ */ new Set([
  "table",
  "status_list",
  "timeline"
]), re = /* @__PURE__ */ new Set([
  1008,
  4401,
  4403
]), lt = [
  1e3,
  2e3,
  5e3,
  1e4,
  3e4
], oe = "active-panel", ct = 16, dt = 5e3, ut = 100, ht = 3, ft = 6e4, W = "requests", pt = /* @__PURE__ */ new Set([
  0,
  500,
  502,
  503,
  504
]), mt = 500, yt = 25, gt = 250, C = "This action is no longer available.", ae = "[data-console-action-ref], [data-console-panel-link], [data-console-record-link], [data-console-banner-dismiss], [data-copy-trigger]", bt = "[data-advanced-toggle], [data-copy-request-id], [data-new-request], [data-request-check], [data-request-resubmit], [data-request-new], [data-option-more]", R = /* @__PURE__ */ new WeakMap(), $ = /* @__PURE__ */ new WeakMap(), vt = 0;
function m(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function d(e) {
  return typeof e == "string" ? e.trim() : "";
}
function wt(e) {
  if (!m(e)) return null;
  const t = d(e.snapshot);
  return t ? {
    page: d(e.page) || void 0,
    panels: d(e.panels) || void 0,
    snapshot: t,
    actions: d(e.actions) || void 0,
    preferences: d(e.preferences) || void 0,
    live: d(e.live) || void 0,
    lookup: d(e.lookup) || void 0,
    options: d(e.options) || void 0,
    requests: d(e.requests) || void 0
  } : null;
}
function St(e) {
  const t = Array.from(e.querySelectorAll(rt)).find((s) => s.closest(y) === e);
  if (!t) return null;
  try {
    return be(JSON.parse(t.textContent || ""));
  } catch {
    return null;
  }
}
function At(e) {
  const t = Array.from(e.querySelectorAll(ot)).find((s) => s.closest(y) === e);
  if (!t) return null;
  try {
    const s = JSON.parse(t.textContent || "");
    if (!m(s) || !m(s.panel)) return null;
    const i = L(s), n = typeof s.watermark == "number" ? s.watermark : 0;
    return i.console_id ? {
      ...i,
      title: d(s.panel.label) || void 0,
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
function be(e) {
  if (!m(e)) return null;
  const t = L(e), s = wt(e.urls);
  return !t.console_id || !s ? null : {
    ...t,
    title: d(e.title) || void 0,
    urls: s,
    preferences_namespace: d(e.preferences_namespace) || void 0,
    snapshot: m(e.snapshot) ? e.snapshot : void 0
  };
}
function kt(e) {
  return typeof e.watermark == "number" && Array.isArray(e.panels) && typeof e.console_id == "string";
}
function w(e, t, s) {
  const [i, n] = e.split("#"), r = `${i}${i.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return n === void 0 ? r : `${r}#${n}`;
}
function le(e) {
  return m(e) && typeof e.sequence == "number" && typeof e.kind == "string" && typeof e.console_id == "string";
}
function Et(e, t) {
  let s = w(e, "limit", String(yt));
  return t.query && (s = w(s, "q", t.query.slice(0, 120))), t.cursor && (s = w(s, "cursor", t.cursor)), t.pinned && (s = w(s, "value", t.pinned)), s;
}
function V(e) {
  if (!m(e)) return "";
  const t = d(e.value);
  if (!t) return "";
  const s = d(e.description);
  return `<option value="${p(t)}"${e.disabled === !0 ? " disabled" : ""}${s ? ` title="${p(s)}"` : ""}>${g(d(e.label) || t)}</option>`;
}
function _t(e, t, s, i) {
  const n = new Set(Array.from(e.options).map((l) => l.value)), r = (Array.isArray(t.items) ? t.items : []).filter((l) => !s || !n.has(d(l?.value))), o = (Array.isArray(t.selected) ? t.selected : []).filter((l) => !r.some((c) => d(c?.value) === d(l?.value)));
  s ? e.insertAdjacentHTML("beforeend", r.map(V).join("")) : (e.innerHTML = `<option value="">${r.length || o.length ? "Select…" : "No options available"}</option>` + o.map(V).join("") + r.map(V).join(""), i && Array.from(e.options).some((l) => l.value === i) && (e.value = i), delete e.dataset.pendingValue);
  const a = d(t.next_cursor);
  return a ? e.dataset.nextCursor = a : delete e.dataset.nextCursor, a;
}
function ce(e, t) {
  e.setAttribute("aria-expanded", t ? "true" : "false");
  const s = e.closest("[data-expanded]");
  s && (s.dataset.expanded = t ? "true" : "false");
}
function Ct(e, t, s) {
  let i = G(e, {
    panel_id: t.panelID,
    request_id: s.id
  });
  return i = w(i, "action", t.actionID), s.scope && (i = w(i, "scope", s.scope)), w(i, "submitted_at", s.submittedAt);
}
function Dt(e) {
  return `<code class="console-kv__mono" title="${p(e)}">${g(e.slice(0, 8))}</code>`;
}
function k(e, t, s = !1) {
  return `<button type="button" class="console-btn console-btn--sm${s ? " console-btn--ghost" : ""}" ${e}>${g(t)}</button>`;
}
function Rt(e, t) {
  if (!e) return {
    message: "",
    actions: "",
    tone: "info"
  };
  const s = Dt(e.id), i = e.partial ? "" : k("data-request-resubmit", "Resubmit unchanged");
  switch (e.state) {
    case "pending":
      return {
        message: `Sending request ${s}…`,
        actions: "",
        tone: "info"
      };
    case "checking":
      return {
        message: `Checking request ${s}…`,
        actions: "",
        tone: "info"
      };
    case "uncertain":
      return {
        message: `Request ${s} may not have been received. Check its status before starting new work.`,
        actions: k("data-request-check", "Check status") + i,
        tone: "warning"
      };
    case "unclaimed":
      return {
        message: `Request ${s} was not received.`,
        actions: i + k("data-request-new", "Start new request", !0),
        tone: "warning"
      };
    case "unknown":
      return {
        message: g(e.message || "The state of this request is unknown."),
        actions: k("data-request-check", "Check again") + k("data-request-new", "Start new request", !0),
        tone: "warning"
      };
    case "expired":
      return {
        message: `${g(e.message || "This request can no longer be confirmed.")} Start a new request to continue.`,
        actions: k("data-request-new", "Start new request"),
        tone: "warning"
      };
    default:
      return t ? {
        message: "",
        actions: "",
        tone: "info"
      } : {
        message: `Submitting unchanged input repeats request ${s}. Choose New request to start new work.`,
        actions: "",
        tone: "neutral"
      };
  }
}
function qt(e) {
  return e.ok !== !1 || !m(e.errors) ? {} : Object.fromEntries(Object.entries(e.errors).map(([t, s]) => [t, typeof s == "string" ? s : ue(s, { nullAsEmptyObject: !1 })]));
}
function Tt(e, t, s, i) {
  const n = e.ok === !1, r = n ? "Action failed." : e.planned ? "Planned. Nothing changed." : "Action complete.", o = m(e.record) ? e.record : null, a = d(o?.record_key);
  return {
    status: n ? "error" : "ok",
    tone: q(e.tone) || (n ? "error" : e.planned ? "planned" : "success"),
    message: d(e.message) || r,
    actionID: s,
    data: e.data,
    requestID: i?.id,
    record: a ? {
      panelId: h(o?.panel_id) || t,
      recordKey: a
    } : void 0,
    followUp: Array.isArray(e.follow_up) ? e.follow_up : void 0
  };
}
function Ft(e) {
  const t = e instanceof HTMLInputElement && e.type === "checkbox", s = t ? "" : e.value.trim();
  if (!t && !s && e.hasAttribute("required")) return "Enter a value.";
  const i = d(e.dataset.actionFieldKind).toLowerCase();
  if (!s || i !== "number" && i !== "integer") return "";
  const n = Number(s);
  if (!Number.isFinite(n) || i === "integer" && !Number.isInteger(n)) return i === "integer" ? "Enter a whole number." : "Enter a number.";
  const r = e.getAttribute("min"), o = e.getAttribute("max");
  return r !== null && n < Number(r) ? `Enter ${r} or more.` : o !== null && n > Number(o) ? `Enter ${o} or less.` : "";
}
function j(e) {
  const t = globalThis.CSS?.escape;
  return t ? t(e) : e.replace(/["\\]/g, "\\$&");
}
function Lt(e) {
  if (typeof requestAnimationFrame == "function") {
    const s = requestAnimationFrame(() => e());
    return () => cancelAnimationFrame(s);
  }
  const t = setTimeout(e, ct);
  return () => clearTimeout(t);
}
var Pt = class {
  constructor(e, t, s = {}) {
    this.serverDefinitions = /* @__PURE__ */ new Map(), this.filterState = /* @__PURE__ */ new Map(), this.actionResults = /* @__PURE__ */ new Map(), this.drafts = /* @__PURE__ */ new Map(), this.inFlight = /* @__PURE__ */ new Map(), this.workingValues = /* @__PURE__ */ new Map(), this.notified = /* @__PURE__ */ new Set(), this.controllers = /* @__PURE__ */ new Set(), this.cleanup = [], this.state = "loading", this.connection = "offline", this.activePanel = "", this.policyCloses = [], this.stream = null, this.recoveryPromise = null, this.recoveryPending = !1, this.snapshotEpoch = 0, this.freshStreamSnapshot = !1, this.recoveryAttempts = 0, this.recoveryTimer = null, this.cancelFrame = null, this.dirtyPanels = /* @__PURE__ */ new Set(), this.structureDirty = !1, this.livePanels = [], this.snapshotWaitTimer = null, this.definitionSignatures = /* @__PURE__ */ new Map(), this.drawer = null, this.clientOutdated = !1, this.requestsRestored = !1, this.highlight = null, this.notice = {
      kind: "loading",
      message: "Loading console…",
      action: "none"
    }, this.root = e, this.bootstrap = t, this.options = s, this.styles = s.styles || Se, this.identity = L(t), this.idScope = `console-${vt += 1}`, this.registry = Re(), this.store = new Be({
      identity: this.identity,
      sequenceMode: "monotonic"
    }), this.preferences = new We(t.preferences_namespace || He(this.identity), s.storage ?? null), this.generate = s.generateRequestID || (() => P()), this.ledger = new et({
      get: () => this.preferences.get(W, "session"),
      set: (i) => this.preferences.set(W, i, "session"),
      remove: () => this.preferences.remove(W, "session")
    }), (s.panels || []).forEach((i) => this.registry.register(i)), this.root.classList.add("console-root"), this.regions = this.ensureRegions(), this.bindEvents(), this.root.dataset.consoleState = "loading", this.root.dataset.consoleSync = "recovering", this.render(), this.start();
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
    return this.panelData(h(e));
  }
  selectPanel(e, t = !1) {
    const s = h(e);
    return !s || !this.visiblePanels().includes(s) || this.state === "disposed" ? !1 : (s !== this.activePanel && (this.activePanel = s, this.preferences.set(oe, s, "session"), this.renderTabs(), this.renderFilters(), this.renderPanel(!0)), t && this.tabButton(s)?.focus(), !0);
  }
  refresh() {
    this.recoveryAttempts = 0, this.policyCloses = [];
    const e = this.recover();
    return (!this.stream || this.stream.getStatus() === "disconnected") && e.then(() => {
      !this.isClosed() && this.state === "ready" && (!this.stream || this.stream.getStatus() === "disconnected") && (this.closeLive(), this.connectLive());
    }), e;
  }
  destroy() {
    this.state !== "disposed" && (this.state = "disposed", this.closeLive(), this.controllers.forEach((e) => e.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.cancelFrame?.(), this.cancelFrame = null, this.cleanup.splice(0).forEach((e) => e()), this.closeDrawer(!1), this.releaseHeaderControls(), this.registry.dispose(), this.store.clear(), this.serverDefinitions.clear(), this.actionResults.clear(), this.filterState.clear(), this.drafts.clear(), this.inFlight.clear(), this.workingValues.clear(), R.get(this.root) === this && R.delete(this.root), this.root.dataset.consoleState = "disposed", this.emitChange([], !1));
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
      const s = await O(this.bootstrap.urls.snapshot, {
        method: "GET",
        headers: this.requestHeaders(),
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
    const t = this.options.recoveryDelaysMs || lt, s = this.recoveryAttempts;
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
    return s.ok ? (this.snapshotEpoch += 1, this.syncDefinitions(e.panels), this.rememberNotifications(), this.setState("ready"), this.root.dataset.consoleSync = s.needsRecovery ? "recovering" : "current", this.setNotice("none", "", "none"), this.syncSubscription(), this.structureDirty = !0, this.flush(), this.restoreRequests(), s.needsRecovery) : s.reason === "stale" ? s.needsRecovery : (s.reason === "foreign" ? this.deny({
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
      const n = h(i?.id);
      if (!n || t.has(n)) return;
      t.add(n);
      const { records: r, ...o } = i, a = this.options.display && o.ui?.actions ? {
        ...o,
        ui: {
          ...o.ui,
          actions: []
        }
      } : o, l = M(JSON.stringify(a));
      if (this.definitionSignatures.get(n) === l && this.registry.has(n)) return;
      this.definitionSignatures.set(n, l), this.serverDefinitions.set(n, a);
      const c = Le(a, {
        consoleRenderer: this.options.renderers?.[n],
        styles: this.styles
      });
      c && this.registry.registerServerDefinition(c);
    });
    for (const i of Array.from(this.serverDefinitions.keys())) t.has(i) || (this.serverDefinitions.delete(i), this.definitionSignatures.delete(i), this.filterState.delete(i), this.actionResults.delete(i), this.registry.isServerDefinition(i) && this.registry.unregister(i), this.forgetPanelRequests(i));
    this.syncDrawerAvailability();
    const s = this.visiblePanels();
    if (!s.includes(this.activePanel)) {
      const i = h(this.preferences.get(oe, "session"));
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
    const s = new Te({
      ...this.options.liveOptions || {},
      url: w(w(e, "panels", t.join(",")), _e, te()),
      onMessage: (i) => {
        this.stream === s && this.handleLiveMessage(i);
      },
      onStatusChange: (i) => {
        this.stream === s && this.handleLiveStatus(i);
      },
      onClose: (i) => {
        this.stream === s && re.has(i.code) && this.verifyAccessAfterClose();
      },
      shouldReconnect: (i) => !re.has(i.code)
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
    }, Math.max(0, this.options.snapshotWaitMs ?? dt));
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
    if (this.policyCloses = this.policyCloses.filter((t) => e - t < ft), this.policyCloses.push(e), await this.recover(), !(this.isClosed() || this.state !== "ready")) {
      if (this.policyCloses.length > ht) {
        this.setConnection("disconnected"), this.setNotice("error", "Live updates stopped. Refresh to load the latest data.", "retry");
        return;
      }
      this.connectLive();
    }
  }
  handleLiveMessage(e) {
    if (this.isClosed() || !m(e)) return;
    if (kt(e)) {
      this.clearSnapshotWait();
      const s = this.freshStreamSnapshot;
      this.freshStreamSnapshot = !1, this.acceptSnapshot(e, s) && this.recover();
      return;
    }
    if (!le(e)) return;
    const t = this.store.applyEvent(e);
    t === "applied" ? (this.notifyBackground(e), this.markPanelDirty(h(e.panel_id))) : t === "invalidated" ? (this.snapshotEpoch += 1, this.awaitStreamSnapshot()) : t === "gap" && this.recover();
  }
  deny(e) {
    if (this.state === "disposed") return;
    this.state = "denied", this.root.dataset.consoleState = "denied", this.closeLive(), this.controllers.forEach((s) => s.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.recoveryPending = !1, this.store.clear(), this.registry.clearServerDefinitions(), this.serverDefinitions.clear(), this.definitionSignatures.clear(), this.livePanels = [], this.actionResults.clear(), this.filterState.clear(), this.closeDrawer(!1), this.drafts.clear(), this.inFlight.clear(), this.workingValues.clear(), this.highlight = null, this.preferences.clear(), this.activePanel = "", this.setConnection("offline"), this.setRefreshEnabled(!1);
    const t = e.status === 401 ? "Your session expired. Sign in again to continue." : e.code === "IDENTITY_CHANGED" ? e.message : "You do not have access to this console.";
    this.setNotice("denied", t, "reload"), this.structureDirty = !0, this.flush();
  }
  requestHeaders() {
    return { [ke]: te() };
  }
  actionDeclaration(e, t) {
    if (!(!e || !t))
      return this.serverDefinitions.get(e)?.ui?.actions?.find((s) => h(s.id) === t);
  }
  executableAction(e, t) {
    if (this.state !== "ready" || this.options.display || !this.visiblePanels().includes(e)) return null;
    const s = this.actionDeclaration(e, t);
    return s && s.hidden !== !0 && Ae(s).executable ? s : null;
  }
  actionTarget(e) {
    return {
      panelId: h(e.dataset.panelId),
      actionId: h(e.dataset.actionId)
    };
  }
  ownsControl(e) {
    return e.closest(y) !== this.root ? !1 : this.regions.panel.contains(e) || !!this.drawer?.element.contains(e);
  }
  confirmationFor(e, t) {
    const s = e.confirmation, i = d(e.confirm_text) || d(t?.dataset.actionConfirm);
    if (!(s || e.requires_confirm === !0 || t?.dataset.actionRequiresConfirm === "true" || i)) return null;
    const n = d(e.label) || h(e.id);
    return {
      title: d(s?.title) || n || "Confirm action",
      message: d(s?.message) || i || "Run this action?",
      changes: s?.changes,
      note: d(s?.note) || void 0,
      confirmLabel: d(s?.confirm_label) || d(e.submit_label) || n || "Confirm",
      tone: d(s?.tone) || void 0
    };
  }
  async confirmWith(e) {
    if (this.options.confirm) try {
      return !!await this.options.confirm(e.message, e);
    } catch {
      return !1;
    }
    try {
      const { confirmConsoleAction: t } = await import("./confirm-C_6eUg1X.js");
      return await t(e);
    } catch {
      return !1;
    }
  }
  actionNeedsForm(e) {
    const t = h(e.secondary_submit?.field);
    return (e.fields || []).some((s) => h(s.kind) !== "hidden" && h(s.name) !== t) || !!e.secondary_submit || !!e.drawer;
  }
  applySubmitter(e, t, s) {
    const i = t.secondary_submit, n = h(i?.field);
    (t.fields || []).forEach((r) => {
      const o = h(r.name), a = h(r.kind) === "hidden";
      if (!o || !a && o !== n) return;
      const l = d(r.payload_path) || o;
      o === n && s === "secondary" ? x(e, l, i?.value) : r.default !== void 0 && r.default !== null && typeof r.default != "object" && x(e, l, r.default);
    });
  }
  composeWorkflowPayload(e, t, s) {
    const i = e.payload && typeof e.payload == "object" && !Array.isArray(e.payload) ? e.payload : {}, n = B(t, {
      base: i,
      skipGenerated: !0
    });
    this.applySubmitter(n, e, s);
    const r = (e.fields || []).filter((o) => h(o.generate) === "request_id").map((o) => d(o.payload_path) || h(o.name)).filter(Boolean);
    return {
      payload: n,
      signature: J(n),
      generated: r
    };
  }
  hasSensitiveInput(e, t) {
    return (this.actionDeclaration(e, t)?.fields || []).some((s) => s.sensitive === !0);
  }
  draftFor(e, t) {
    const s = f(e, t);
    let i = this.drafts.get(s);
    return i || (i = ye(e, t, this.generate), this.drafts.set(s, i)), i;
  }
  mountedForms(e, t) {
    const s = [this.regions.panel, this.drawer?.element].filter((n) => !!n), i = [];
    return s.forEach((n) => {
      n.querySelectorAll("form[data-panel-action-form]").forEach((r) => {
        if (r.closest(y) !== this.root) return;
        const o = this.actionTarget(r);
        e && (o.panelId !== e || o.actionId !== t) || i.push(r);
      });
    }), i;
  }
  mountedForm(e, t, s) {
    if (s?.isConnected) return s;
    const i = this.mountedForms(e, t);
    return i.find((n) => this.drawer?.element.contains(n)) || i[0] || null;
  }
  async runButtonAction(e) {
    const { panelId: t, actionId: s } = this.actionTarget(e), i = this.executableAction(t, s);
    if (!i || !this.bootstrap.urls.actions || this.inFlight.has(f(t, s))) return;
    if (this.clientOutdated) {
      this.showOutdated(t, s);
      return;
    }
    const n = this.confirmationFor(i, e);
    n && !await this.confirmWith(n) || this.executableAction(t, s) && await this.dispatch({
      panelId: t,
      actionId: s,
      payload: B(e),
      mode: "primary",
      form: null
    });
  }
  activateActionRef(e) {
    if (e.getAttribute("aria-disabled") === "true" || e.hasAttribute("data-action-unavailable")) return;
    const { panelId: t, actionId: s } = this.actionTarget(e);
    if (t !== this.activePanel) return;
    const i = this.executableAction(t, s);
    if (!i) {
      this.showActionResult(this.activePanel, {
        status: "error",
        tone: "warning",
        message: C,
        actionID: s
      }, !0);
      return;
    }
    const n = U(this.drafts.get(f(t, s))?.current);
    if (this.actionNeedsForm(i) || n) {
      this.openDrawer(t, s, i, e);
      return;
    }
    (async () => {
      if (this.clientOutdated) {
        this.showOutdated(t, s);
        return;
      }
      if (this.inFlight.has(f(t, s))) return;
      const r = this.confirmationFor(i);
      if (r && !await this.confirmWith(r)) return;
      const o = this.executableAction(t, s);
      if (!o) return;
      const a = o.payload && typeof o.payload == "object" && !Array.isArray(o.payload) ? JSON.parse(JSON.stringify(o.payload)) : {};
      this.applySubmitter(a, o, "primary"), await this.dispatch({
        panelId: t,
        actionId: s,
        payload: a,
        mode: "primary",
        form: null
      });
    })();
  }
  async submitForm(e, t) {
    const { panelId: s, actionId: i } = this.actionTarget(e);
    if (!this.bootstrap.urls.actions || !s || !i || this.inFlight.has(f(s, i))) return;
    const n = this.executableAction(s, i);
    if (!n) {
      this.setFormMessage(e, C, "warning");
      return;
    }
    if (this.clientOutdated) {
      this.setFormMessage(e, Z, "warning"), this.showOutdated(s, i);
      return;
    }
    const r = t?.dataset.submitter === "secondary" && n.secondary_submit ? "secondary" : "primary";
    if (e.querySelector("[data-action-field-generated]")) {
      await this.submitWorkflowForm(e, n, s, i, r);
      return;
    }
    const o = this.confirmationFor(n, e);
    if (o && !await this.confirmWith(o) || !this.executableAction(s, i)) return;
    const a = B(e);
    n.secondary_submit && this.applySubmitter(a, n, r), await this.dispatch({
      panelId: s,
      actionId: i,
      payload: a,
      mode: r,
      form: e
    });
  }
  async submitWorkflowForm(e, t, s, i, n) {
    let r = e;
    const o = this.draftFor(s, i);
    this.clearFieldErrors(r);
    const a = this.validateWorkflowForm(r);
    if (Object.keys(a).length > 0) {
      this.showFieldErrors(r, a);
      const A = r.querySelector('[aria-invalid="true"]'), I = A?.closest("[data-expanded]")?.querySelector("[data-advanced-toggle]");
      I && ce(I, !0), A?.focus();
      return;
    }
    let l = t, c = this.composeWorkflowPayload(l, r, n), u = ie(o, n, c.signature);
    if (u.kind === "blocked") {
      await this.handleBlockedRequest(o, u.reason, u.check, n, c.signature);
      return;
    }
    if (u.kind === "replay") {
      await this.sendRequest(o, u.request, r);
      return;
    }
    const E = this.confirmationFor(l, r);
    if (E) {
      const A = f(s, i);
      if (l.confirmation) {
        if (this.inFlight.set(A, n), this.syncBusy(), await this.refresh(), this.inFlight.delete(A), this.syncBusy(), this.isClosed()) return;
        const z = this.executableAction(s, i);
        if (r = this.mountedForm(s, i, r) || r, this.root.dataset.consoleSync !== "current") {
          this.setFormMessage(r, "The current state could not be loaded. Try again.", "warning");
          return;
        }
        if (!z) {
          this.setFormMessage(r, C, "warning");
          return;
        }
        l = z, c = this.composeWorkflowPayload(l, r, n);
      }
      const I = this.confirmationFor(l, r) || E;
      if (!await this.confirmWith(I) || this.isClosed()) return;
      if (!this.executableAction(s, i)) {
        this.setFormMessage(this.mountedForm(s, i, r) || r, C, "warning");
        return;
      }
      if (u = ie(o, n, c.signature), u.kind === "blocked") {
        await this.handleBlockedRequest(o, u.reason, u.check, n, c.signature);
        return;
      }
      if (u.kind === "replay") {
        await this.sendRequest(o, u.request, r);
        return;
      }
    }
    const S = u.kind === "new" ? u.id : "";
    if (!S) return;
    const v = c.payload;
    c.generated.forEach((A) => x(v, A, S));
    const N = ze(o, S, n, v, c.signature, d(l.request_scope), this.generate);
    await this.sendRequest(o, N, r);
  }
  async handleBlockedRequest(e, t, s, i, n) {
    this.renderRequestState(e, t), s && e.current?.signature === n && e.current.mode === i && await this.checkRequest(e);
  }
  validateWorkflowForm(e) {
    const t = {};
    return e.querySelectorAll("[data-action-field]").forEach((s) => {
      if (!(s instanceof HTMLInputElement || s instanceof HTMLSelectElement || s instanceof HTMLTextAreaElement) || s.disabled || s.hasAttribute("data-action-field-generated")) return;
      const i = s.closest("[hidden]");
      if (i && e.contains(i)) return;
      const n = Ft(s);
      n && (t[d(s.dataset.actionFieldPath) || d(s.dataset.actionField)] = n);
    }), t;
  }
  async sendRequest(e, t, s) {
    if (t.state !== "pending" && !ge(t)) {
      await this.checkRequest(e);
      return;
    }
    t.state = "pending", t.message = void 0, this.ledger.put(e, t, this.hasSensitiveInput(e.panelID, e.actionID)), this.renderRequestState(e), await this.dispatch({
      panelId: e.panelID,
      actionId: e.actionID,
      payload: t.payload,
      mode: t.mode,
      form: s,
      draft: e,
      request: t
    });
  }
  async dispatch(e) {
    const { panelId: t, actionId: s, payload: i, mode: n } = e, r = f(t, s), o = G(this.bootstrap.urls.actions || "", {
      panel_id: t,
      action_id: s
    });
    if (!o) return;
    this.inFlight.set(r, n), this.syncBusy(), e.form && this.clearFieldErrors(e.form);
    const a = new AbortController();
    this.controllers.add(a);
    const l = await O(o, {
      method: "POST",
      json: i,
      headers: this.requestHeaders(),
      signal: a.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Action failed."
    });
    if (this.controllers.delete(a), this.inFlight.delete(r), this.isClosed()) return;
    this.syncBusy();
    const c = this.mountedForm(t, s, e.form);
    e.draft && e.request && this.settleRequest(e.draft, e.request, l), l.ok ? this.applyActionResult(c, t, s, l.value, e.request) : this.applyActionFailure(c, t, s, l.status, l.error, e.request);
  }
  settleRequest(e, t, s) {
    e.current === t && (!s.ok && pt.has(s.status) ? (t.state = "uncertain", t.message = "This request may not have been received.", this.ledger.put(e, t, this.hasSensitiveInput(e.panelID, e.actionID))) : (t.state = "resolved", t.message = void 0, this.ledger.remove(t.id)), this.renderRequestState(e));
  }
  applyActionFailure(e, t, s, i, n, r) {
    if (i === 401) {
      this.deny(n);
      return;
    }
    if (n.code === "CONSOLE_CLIENT_OUTDATED") {
      this.clientOutdated = !0, this.root.dataset.consoleOutdated = "true", this.closeDrawerFor(t, s), this.showActionResult(t, {
        status: "error",
        tone: "warning",
        message: n.message || "This console was updated. Reload the page to use this action.",
        actionID: s,
        reload: !0
      }, !0);
      return;
    }
    if (r && r.state === "uncertain") {
      this.drawerFor(t, s) || this.showActionResult(t, {
        status: "error",
        tone: "warning",
        message: "We could not confirm this request was received. Check its status before starting new work.",
        actionID: s,
        requestID: r.id,
        checkRequest: !0
      }, !0);
      return;
    }
    const o = Object.keys(n.fields).length > 0;
    e && o && this.showFieldErrors(e, n.fields);
    const a = i === 403 ? "You are not allowed to run this action." : n.message;
    o && e && this.drawerFor(t, s) ? this.setFormMessage(e, a, "error") : (this.closeDrawerFor(t, s), this.showActionResult(t, {
      status: "error",
      tone: "error",
      message: a,
      actionID: s,
      requestID: r?.id
    }, !0)), i === 403 && this.refresh();
  }
  applyActionResult(e, t, s, i, n, r = !0) {
    const o = m(i) ? i : {}, a = qt(o);
    e && Object.keys(a).length > 0 && this.showFieldErrors(e, a);
    const l = Tt(o, t, s, n);
    if (e && Object.keys(a).length > 0 && this.drawerFor(t, s) ? this.setFormMessage(e, l.message, "error") : (this.closeDrawerFor(t, s), this.showActionResult(t, l, r), l.record && l.record.panelId === t && (this.highlight = { ...l.record }, this.applyHighlight(!0))), le(o.event)) {
      const c = this.notificationOf(h(o.event.panel_id), o.event.data);
      c && this.remember(c.id), this.handleLiveMessage(o.event);
    }
    o.refresh && this.refresh();
  }
  showOutdated(e, t) {
    this.showActionResult(e || this.activePanel, {
      status: "error",
      tone: "warning",
      message: Z,
      actionID: t,
      reload: !0
    }, !0);
  }
  showActionResult(e, t, s = !1) {
    e && (this.actionResults.set(e, t), e === this.activePanel && this.renderActionResult(s));
  }
  renderActionResult(e = !1) {
    const t = this.actionResults.get(this.activePanel), s = Array.from(this.regions.panel.querySelectorAll("[data-panel-action-result]")).find((E) => E.dataset.panelActionResult === this.activePanel);
    if (!s) return;
    if (!t) {
      s.innerHTML = "";
      return;
    }
    const i = q(t.tone) || (t.status === "error" ? "error" : "success"), n = this.serverDefinitions.get(this.activePanel), r = t.requestID ? `<p class="console-banner__meta">Request <code class="console-kv__mono" title="${p(t.requestID)}">${g(t.requestID.slice(0, 8))}</code></p>` : "", o = t.record && this.visiblePanels().includes(t.record.panelId) ? `<button type="button" class="console-btn console-btn--sm" data-console-record-link data-panel-id="${p(t.record.panelId)}" data-record-key="${p(t.record.recordKey)}">View</button>` : "", a = t.followUp ? Ee(t.followUp, n, this.styles) : "", l = t.checkRequest && t.requestID ? `<button type="button" class="console-btn console-btn--sm" data-request-check data-panel-id="${p(this.activePanel)}" data-action-id="${p(t.actionID)}">Check status</button>` : "", c = t.reload ? '<button type="button" class="console-btn console-btn--sm" data-console-action="reload">Reload</button>' : "", u = t.data === void 0 ? "" : `<details class="console-banner__details"><summary>Details</summary><pre class="${this.styles.jsonPanel}">${g(ue(t.data, { nullAsEmptyObject: !1 }))}</pre></details>`;
    s.innerHTML = `<div class="console-banner" data-console-banner data-tone="${i}" data-status="${t.status}" role="${t.status === "error" ? "alert" : "status"}" tabindex="-1"><div class="console-banner__body"><p class="console-banner__message">${g(t.message)}</p>${r}${u}</div><div class="console-banner__actions">${o}${l}${a}${c}<button type="button" class="console-btn console-btn--ghost console-btn--sm console-btn--icon" data-console-banner-dismiss aria-label="Dismiss"><span aria-hidden="true">×</span></button></div></div>`, e && s.querySelector("[data-console-banner]")?.focus();
  }
  dismissActionResult() {
    this.actionResults.delete(this.activePanel), this.highlight = null, this.renderActionResult(), this.applyHighlight(), this.regions.panel.focus();
  }
  applyHighlight(e = !1) {
    this.regions.panel.querySelectorAll("[data-console-highlight]").forEach((i) => {
      i.removeAttribute("data-console-highlight");
    });
    const t = this.highlight;
    if (!t || t.panelId !== this.activePanel) return null;
    const s = Array.from(this.regions.panel.querySelectorAll("[data-row-key]")).find((i) => i.dataset.rowKey === t.recordKey && i.closest(y) === this.root) || null;
    return s ? (s.setAttribute("data-console-highlight", ""), e && s.scrollIntoView?.({ block: "nearest" }), s) : null;
  }
  openRecord(e, t) {
    if (!this.visiblePanels().includes(e) || !t) return;
    this.highlight = {
      panelId: e,
      recordKey: t
    }, this.selectPanel(e);
    const s = this.applyHighlight(!0);
    s ? (s.hasAttribute("tabindex") || (s.tabIndex = -1), s.focus()) : this.regions.panel.focus();
  }
  clearFieldErrors(e) {
    e.querySelectorAll("[data-action-field-error]").forEach((s) => {
      s.textContent = "", s.hidden = !0;
    }), e.querySelectorAll('[aria-invalid="true"]').forEach((s) => s.removeAttribute("aria-invalid"));
    const t = e.querySelector("[data-form-message]");
    t && t.remove();
  }
  showFieldErrors(e, t) {
    Object.entries(t).forEach(([s, i]) => {
      const n = s.trim(), r = Array.from(e.querySelectorAll("[data-action-field-error]")).find((o) => o.dataset.actionFieldError === n || o.dataset.actionFieldName === n || o.dataset.actionFieldError === `payload.${n}`);
      r && (r.textContent = i, r.hidden = !1, Array.from(e.querySelectorAll("[data-action-field]")).find((o) => (o.dataset.actionFieldPath || o.dataset.actionField) === r.dataset.actionFieldError)?.setAttribute("aria-invalid", "true"));
    });
  }
  setFormMessage(e, t, s) {
    e.querySelector("[data-form-message]")?.remove();
    const i = e.ownerDocument.createElement("p");
    i.className = "console-form__message", i.setAttribute("data-form-message", ""), i.setAttribute("role", s === "error" ? "alert" : "status"), i.dataset.tone = q(s) || "warning", i.textContent = t;
    const n = e.querySelector(".console-form__actions, .console-drawer__footer");
    n?.parentElement ? n.parentElement.insertBefore(i, n) : e.appendChild(i);
  }
  renderRequestState(e, t = "") {
    this.mountedForms(e.panelID, e.actionID).forEach((s) => this.renderFormRequest(s, e, t)), this.syncBusy();
  }
  renderFormRequest(e, t, s = "") {
    const i = Xe(t);
    e.querySelectorAll("input[data-action-field-generated]").forEach((u) => {
      u.value = i;
    });
    const n = !F(i);
    e.querySelectorAll("button[data-submitter]").forEach((u) => {
      n ? (u.disabled = !0, u.dataset.requestDisabled = "true") : u.dataset.requestDisabled === "true" && (delete u.dataset.requestDisabled, u.disabled = !1);
    });
    const r = e.querySelector("[data-request-status]");
    if (!r) return;
    const o = t.current;
    let { message: a, actions: l, tone: c } = n ? {
      message: pe,
      actions: "",
      tone: "warning"
    } : Rt(o, !!e.closest("[data-console-drawer]"));
    s && (c = "warning", a = a ? `${a} ${g(s)}` : g(s), o?.state === "uncertain" && !l.includes("data-request-check") && (l = k("data-request-check", "Check status") + l)), r.hidden = !a, r.dataset.tone = c, r.dataset.state = o?.state || "draft", r.setAttribute("role", c === "warning" ? "alert" : "status"), r.innerHTML = a ? `<p class="console-request-status__message">${a}</p>${l ? `<div class="console-request-status__actions">${l}</div>` : ""}` : "";
  }
  async checkRequest(e, t = !0) {
    const s = e.current;
    if (!s || s.state === "pending" || s.state === "checking" || this.isClosed()) return;
    const i = this.bootstrap.urls.requests;
    if (!i) {
      s.state = "expired", s.message = "This console cannot confirm earlier requests.", this.ledger.put(e, s, !0), this.renderRequestState(e);
      return;
    }
    const n = s.state;
    s.state = "checking", this.renderRequestState(e);
    const r = new AbortController();
    this.controllers.add(r);
    const o = await O(Ct(i, e, s), {
      method: "GET",
      headers: this.requestHeaders(),
      signal: r.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Unable to check this request."
    });
    if (this.controllers.delete(r), this.isClosed() || e.current !== s) return;
    if (!o.ok) {
      this.applyFailedCheck(e, s, n, o.status, o.error);
      return;
    }
    const a = d(o.value?.status).toLowerCase();
    if (s.state = Ye(s, a, o.value?.retry_until), a === "claimed") {
      this.ledger.remove(s.id), this.renderRequestState(e);
      const c = m(o.value.result) ? o.value.result : { message: d(o.value.message) || "The request was received." };
      this.applyActionResult(null, e.panelID, e.actionID, c, s, t);
      return;
    }
    const l = s.state === "unclaimed" || s.state === "unknown";
    if (s.message = d(o.value.message) || void 0, !this.actionDeclaration(e.panelID, e.actionID)) {
      this.settleWithdrawnRequest(e, s);
      return;
    }
    this.ledger.put(e, s, !l || this.hasSensitiveInput(e.panelID, e.actionID)), this.renderRequestState(e);
  }
  settleWithdrawnRequest(e, t) {
    this.ledger.remove(t.id), this.drafts.delete(f(e.panelID, e.actionID));
    const s = t.message ? ` ${t.message}` : "";
    this.showActionResult(e.panelID, {
      status: "error",
      tone: "warning",
      message: `An earlier request could not be confirmed and its action is no longer offered.${s}`,
      actionID: e.actionID,
      requestID: t.id
    });
  }
  applyFailedCheck(e, t, s, i, n) {
    if (i === 401) {
      this.deny(n);
      return;
    }
    const r = i === 403 || i === 404;
    r ? (t.state = "expired", t.message = "This request’s status cannot be checked.", this.ledger.put(e, t, !0)) : (t.state = s === "unknown" ? s : "uncertain", t.retryUntil = void 0, t.message = n.message), this.renderRequestState(e, r ? "" : "The status check failed. Try again.");
  }
  async resubmitRequest(e) {
    const t = e.current;
    if (!(!t || t.partial || t.state !== "uncertain" && t.state !== "unclaimed")) {
      if (!this.executableAction(e.panelID, e.actionID)) {
        this.renderRequestState(e, C);
        return;
      }
      this.clientOutdated || this.inFlight.has(f(e.panelID, e.actionID)) || await this.sendRequest(e, t, this.mountedForm(e.panelID, e.actionID, null));
    }
  }
  beginNewRequest(e) {
    const t = e.current;
    if (!Qe(e, this.generate)) {
      this.renderRequestState(e, "Check the earlier request before starting new work.");
      return;
    }
    t && this.ledger.remove(t.id), e.nextID = this.generate(), this.renderRequestState(e);
  }
  restoreRequests() {
    this.requestsRestored || this.options.display || this.state !== "ready" || (this.requestsRestored = !0, this.ledger.entries().forEach((e) => {
      if (!this.serverDefinitions.has(e.panel_id)) {
        this.ledger.remove(e.request_id);
        return;
      }
      const t = f(e.panel_id, e.action_id);
      if (this.drafts.get(t)?.current) return;
      const s = tt(e, this.generate);
      this.drafts.set(t, s), this.renderRequestState(s), s.current?.state !== "expired" && this.checkRequest(s, !1);
    }));
  }
  forgetPanelRequests(e) {
    for (const [t, s] of Array.from(this.drafts.entries()))
      s.panelID === e && (s.current && this.ledger.remove(s.current.id), this.drafts.delete(t), this.workingValues.delete(t));
    this.drawer?.panelID === e && this.closeDrawer(!1);
  }
  mountForms(e) {
    e.querySelectorAll("form[data-panel-action-form]").forEach((t) => {
      if (t.closest(y) !== this.root) return;
      const { panelId: s, actionId: i } = this.actionTarget(t), n = f(s, i), r = t.querySelector("[data-action-field-generated]") ? this.draftFor(s, i) : null, o = this.workingValues.get(n);
      r?.current && U(r.current) && !r.current.partial ? Pe(t, r.current.payload) : o && this.applyWorkingValues(t, o), r && this.renderFormRequest(t, r), t.querySelectorAll("select[data-option-paginated]").forEach((a) => {
        this.loadOptions(t, a, !1);
      });
    }), this.syncBusy();
  }
  captureWorkingValues(e) {
    e.querySelectorAll("form[data-panel-action-form]").forEach((t) => {
      if (t.closest(y) !== this.root) return;
      const { panelId: s, actionId: i } = this.actionTarget(t), n = {};
      t.querySelectorAll("[data-action-field]").forEach((r) => {
        const o = d(r.dataset.actionField);
        !o || r.hasAttribute("data-action-field-generated") || r.dataset.actionFieldSensitive === "true" || (r instanceof HTMLInputElement && r.type === "checkbox" ? n[o] = r.checked : (r instanceof HTMLInputElement || r instanceof HTMLSelectElement || r instanceof HTMLTextAreaElement) && (n[o] = r.value));
      }), this.workingValues.set(f(s, i), n);
    });
  }
  applyWorkingValues(e, t) {
    e.querySelectorAll("[data-action-field]").forEach((s) => {
      const i = d(s.dataset.actionField);
      if (!i || !(i in t) || s.hasAttribute("data-action-field-generated")) return;
      const n = t[i];
      s instanceof HTMLInputElement && s.type === "checkbox" ? s.checked = n === !0 : s instanceof HTMLSelectElement && s.hasAttribute("data-option-paginated") ? s.dataset.pendingValue = String(n) : (s instanceof HTMLInputElement || s instanceof HTMLSelectElement || s instanceof HTMLTextAreaElement) && (s.value = String(n));
    });
  }
  syncBusy() {
    this.mountedForms().forEach((e) => {
      const { panelId: t, actionId: s } = this.actionTarget(e), i = this.inFlight.get(f(t, s));
      if (i === void 0) {
        e.dataset.busy === "true" && X(e);
        return;
      }
      if (e.dataset.busy === "true") return;
      const n = Array.from(e.querySelectorAll('button[type="submit"]')), r = e.querySelector(`button[data-submitter="${i}"]`) || n[n.length - 1] || null;
      Q(e, {
        controls: n,
        includeDescendantControls: !1,
        submitter: r,
        indicator: "submitter",
        label: "Working…",
        generateSpinner: !0
      });
    }), this.regions.panel.querySelectorAll("button[data-panel-action]").forEach((e) => {
      if (e.closest(y) !== this.root) return;
      const { panelId: t, actionId: s } = this.actionTarget(e), i = this.inFlight.has(f(t, s));
      i && e.dataset.busy !== "true" ? Q(e, {
        label: "Working…",
        generateSpinner: !0
      }) : !i && e.dataset.busy === "true" && X(e);
    });
  }
  drawerFor(e, t) {
    const s = this.drawer;
    return s && s.isOpen() && s.panelID === e && s.actionID === t ? s : null;
  }
  openDrawer(e, t, s, i) {
    this.closeDrawer(!1);
    const n = Fe(e, t, s, this.styles, this.renderOptions(), "drawer"), r = new it({
      root: this.root,
      id: `${this.idScope}-drawer-${M(`${e}/${t}`)}`,
      panelID: e,
      actionID: t,
      title: d(s.drawer?.title) || d(s.label) || t,
      eyebrow: d(s.drawer?.eyebrow) || void 0,
      body: n,
      invoker: i,
      fallbackFocus: () => this.focusFallback(e, t),
      onClose: () => {
        this.drawer === r && (this.drawer = null), this.releaseDraftAfterClose(e, t);
      }
    });
    this.drawer = r, this.mountForms(r.element), r.focusInitial();
  }
  closeDrawerFor(e, t) {
    this.drawerFor(e, t) && this.closeDrawer(!0);
  }
  closeDrawer(e) {
    const t = this.drawer;
    this.drawer = null, t?.close(e);
  }
  releaseDraftAfterClose(e, t) {
    const s = f(e, t), i = this.drafts.get(s);
    i && !U(i.current) && !this.inFlight.has(s) && !this.mountedForms(e, t).length && this.drafts.delete(s), this.workingValues.delete(s);
  }
  focusFallback(e, t) {
    return Array.from(this.regions.panel.querySelectorAll("[data-console-action-ref], [data-panel-action]")).find((s) => s.closest(y) === this.root && h(s.dataset.panelId) === e && h(s.dataset.actionId) === t && !s.closest("[hidden]")) || this.regions.panel;
  }
  syncDrawerAvailability() {
    const e = this.drawer;
    if (!e?.isOpen()) return;
    const t = e.element.querySelector("form[data-panel-action-form]"), s = !!this.executableAction(e.panelID, e.actionID);
    e.element.querySelectorAll("button[data-submitter]").forEach((i) => {
      s ? i.dataset.withdrawn === "true" && (delete i.dataset.withdrawn, this.inFlight.has(f(e.panelID, e.actionID)) || (i.disabled = !1)) : (i.disabled = !0, i.dataset.withdrawn = "true");
    }), t && !s && !t.querySelector("[data-form-message]") && this.setFormMessage(t, C, "warning");
  }
  async loadOptions(e, t, s) {
    const { panelId: i, actionId: n } = this.actionTarget(e), r = this.bootstrap.urls.options, o = d(t.dataset.actionField), a = t.closest("[data-field-name]") || e, l = a.querySelector("[data-option-more]");
    if (!r || !o || this.isClosed()) {
      t.innerHTML = '<option value="">Options are unavailable</option>';
      return;
    }
    const c = String(Number(t.dataset.optionSequence || "0") + 1);
    t.dataset.optionSequence = c;
    const u = t.dataset.pendingValue ?? (s ? "" : t.value), E = Et(G(r, {
      panel_id: i,
      action_id: n,
      field: o
    }), {
      query: d(a.querySelector("[data-option-search]")?.value),
      cursor: s && t.dataset.nextCursor || "",
      pinned: s ? "" : u
    });
    l && (l.disabled = !0), t.setAttribute("aria-busy", "true");
    const S = new AbortController();
    this.controllers.add(S);
    const v = await O(E, {
      method: "GET",
      headers: this.requestHeaders(),
      signal: S.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Unable to load options."
    });
    if (this.controllers.delete(S), this.isClosed() || t.dataset.optionSequence !== c) return;
    if (t.removeAttribute("aria-busy"), l && (l.disabled = !1), !v.ok) {
      if (v.status === 401) {
        this.deny(v.error);
        return;
      }
      s || (t.innerHTML = '<option value="">Options could not be loaded</option>'), this.showFieldErrors(e, { [d(t.dataset.actionFieldPath) || o]: v.error.message });
      return;
    }
    const N = _t(t, m(v.value) ? v.value : {}, s, u);
    l && (l.hidden = !N);
  }
  notificationOf(e, t) {
    const s = this.serverDefinitions.get(e)?.ui?.views?.console, i = d(s?.options?.notify_bind);
    if (!i) return null;
    const n = Ce(t, i);
    if (!m(n)) return null;
    const r = d(n.id), o = d(n.message);
    return !r || !o || r.length > 200 || o.length > 300 ? null : {
      id: `${e}\0${r}`,
      message: o,
      tone: q(n.tone) || "info"
    };
  }
  remember(e) {
    if (this.notified.has(e)) return !1;
    if (this.notified.add(e), this.notified.size > mt) {
      const t = this.notified.values().next().value;
      t !== void 0 && this.notified.delete(t);
    }
    return !0;
  }
  rememberNotifications() {
    this.store.panelIds().forEach((e) => {
      this.store.records(e).forEach((t) => {
        const s = this.notificationOf(e, t.data);
        s && this.remember(s.id);
      });
    });
  }
  notifyBackground(e) {
    if (e.kind !== "upsert" || this.options.display) return;
    const t = this.notificationOf(h(e.panel_id), e.data);
    !t || !this.remember(t.id) || this.toast(t.tone, t.message);
  }
  toast(e, t) {
    if (this.options.notify) {
      this.options.notify(e, t);
      return;
    }
    const s = e === "error" || e === "warning" || e === "success" ? e : "info", i = this.root.ownerDocument.defaultView;
    if (typeof i?.toastManager?.show == "function") {
      i.toastManager.show({
        message: t,
        type: s,
        dismissible: !0,
        duration: s === "error" ? 0 : void 0
      });
      return;
    }
    const n = i?.notify?.[s];
    if (typeof n == "function") {
      n(t);
      return;
    }
    let r = Array.from(this.root.querySelectorAll("[data-console-toasts]")).find((a) => a.closest(y) === this.root);
    r || (r = this.root.ownerDocument.createElement("div"), r.className = "console-toasts", r.setAttribute("data-console-toasts", ""), r.setAttribute("role", "status"), r.setAttribute("aria-live", "polite"), this.root.appendChild(r));
    const o = this.root.ownerDocument.createElement("p");
    for (o.className = "console-toast", o.dataset.tone = s, o.textContent = t, r.appendChild(o); r.children.length > 3; ) r.firstElementChild?.remove();
    setTimeout(() => o.remove(), 8e3);
  }
  ensureRegions() {
    const e = (o) => Array.from(this.root.querySelectorAll(o)).find((a) => a.closest(y) === this.root) || null, t = (o, a, l) => {
      const c = this.root.ownerDocument.createElement(o);
      return c.setAttribute(a, ""), c.className = l, this.root.appendChild(c), c;
    }, s = e("[data-console-notice]") || t("div", "data-console-notice", "console-notice"), i = e("[data-console-tabs]") || t("nav", "data-console-tabs", "console-tabs"), n = e("[data-console-filters]") || t("div", "data-console-filters", "console-filters"), r = e("[data-console-panel]") || t("section", "data-console-panel", "console-panel");
    return i.setAttribute("role", "tablist"), i.hasAttribute("aria-label") || i.setAttribute("aria-label", this.bootstrap.title || "Console panels"), r.id = r.id || `${this.idScope}-panel`, r.setAttribute("role", "tabpanel"), r.tabIndex = 0, {
      tabs: i,
      filters: n,
      panel: r,
      notice: s,
      ...this.resolveHeaderControls(e)
    };
  }
  resolveHeaderControls(e) {
    const t = e("[data-console-connection]"), s = e("[data-console-status]"), i = e('button[data-console-action="refresh"]');
    if (t || s || i)
      return this.root.dataset.consoleControls = "root", {
        connection: t,
        status: s,
        refresh: i,
        pageControls: null
      };
    this.options.display && (this.root.dataset.consoleControls = "none");
    const n = this.options.display ? null : this.pageControlsGroup();
    return n ? ($.set(n, this), this.root.dataset.consoleControls = "page", {
      connection: n.querySelector("[data-console-connection]"),
      status: n.querySelector("[data-console-status]"),
      refresh: n.querySelector('button[data-console-action="refresh"]'),
      pageControls: n
    }) : {
      connection: null,
      status: null,
      refresh: null,
      pageControls: null
    };
  }
  pageControlsGroup() {
    const e = this.root.id, t = this.root.ownerDocument, s = e ? Array.from(t.querySelectorAll(nt)).filter((i) => i.getAttribute("data-console-for") === e && !i.closest(y)) : [];
    return s.length === 0 ? (this.root.dataset.consoleControls = "none", null) : t.querySelectorAll(`[id="${j(e)}"]`).length !== 1 || s.length !== 1 || $.has(s[0]) ? (this.root.dataset.consoleControls = "ambiguous", null) : s[0];
  }
  setRefreshEnabled(e) {
    const t = this.regions.refresh;
    t && (t.disabled = !e);
  }
  releaseHeaderControls() {
    this.connection = "offline", this.renderConnection(), this.setRefreshEnabled(!1);
    const e = this.regions.pageControls;
    e && $.get(e) === this && $.delete(e);
  }
  listen(e, t, s) {
    e.addEventListener(t, s), this.cleanup.push(() => e.removeEventListener(t, s));
  }
  bindEvents() {
    const { tabs: e, panel: t, filters: s } = this.regions;
    this.listen(e, "click", (n) => {
      const r = n.target?.closest("[data-console-tab]");
      r && e.contains(r) && this.selectPanel(r.dataset.consoleTab || "", !0);
    }), this.listen(e, "keydown", (n) => this.handleTabKeydown(n)), this.listen(s, "input", () => this.updateFilters()), this.listen(s, "change", () => this.updateFilters()), this.listen(t, "click", (n) => {
      const r = n.target?.closest("[data-panel-action]");
      !r || !t.contains(r) || r.disabled || r.closest(y) !== this.root || (n.preventDefault(), this.runButtonAction(r));
    }), this.listen(this.root, "submit", (n) => {
      const r = n.target?.closest("form[data-panel-action-form]");
      if (!r || !this.ownsControl(r)) return;
      n.preventDefault();
      const o = n.submitter;
      o instanceof HTMLButtonElement && o.disabled || this.submitForm(r, o instanceof HTMLElement ? o : null);
    }), this.listen(t, "change", (n) => {
      const r = n.target?.closest("[data-panel-action-picker]");
      r && t.contains(r) && this.updateActionPicker(r);
    }), this.listen(this.root, "input", (n) => {
      const r = n.target?.closest("input[data-option-search]");
      if (!r || !this.ownsControl(r)) return;
      const o = r.closest("form[data-panel-action-form]"), a = r.closest("[data-field-name]")?.querySelector("select[data-option-paginated]");
      if (!o || !a) return;
      const l = Number(r.dataset.searchTimer || "0");
      l && clearTimeout(l);
      const c = setTimeout(() => {
        this.loadOptions(o, a, !1);
      }, gt);
      r.dataset.searchTimer = String(c);
    }), this.listen(this.root, "click", (n) => {
      const r = n.target?.closest("[data-console-action]");
      if (!r || r.closest(y) !== this.root) return;
      const o = r.dataset.consoleAction;
      o === "retry" || o === "refresh" ? (n.preventDefault(), this.refresh()) : o === "reload" && (n.preventDefault(), this.root.ownerDocument.defaultView?.location.reload());
    }), this.listen(this.root, "click", (n) => this.handleControlClick(n));
    const i = this.regions.pageControls ? this.regions.refresh : null;
    i && this.listen(i, "click", (n) => {
      n.preventDefault(), i.disabled || this.refresh();
    }), this.setRefreshEnabled(!0);
  }
  handleControlClick(e) {
    const t = e.target, s = t?.closest(ae) || t?.closest(bt);
    !s || !this.ownsControl(s) || (e.preventDefault(), s.matches(ae) ? this.handleNavigationControl(s) : this.handleRequestControl(s));
  }
  handleNavigationControl(e) {
    if (e.matches("[data-console-action-ref]")) this.activateActionRef(e);
    else if (e.matches("[data-console-panel-link]")) this.selectPanel(e.dataset.consolePanelLink || "", !0);
    else if (e.matches("[data-console-record-link]")) this.openRecord(h(e.dataset.panelId), d(e.dataset.recordKey));
    else if (e.matches("[data-console-banner-dismiss]")) this.dismissActionResult();
    else {
      const t = e.closest("[data-copy-content]")?.getAttribute("data-copy-content") || "";
      t && this.copyText(t, e);
    }
  }
  handleRequestControl(e) {
    if (e.matches("[data-advanced-toggle]")) {
      ce(e, e.getAttribute("aria-expanded") !== "true");
      return;
    }
    const t = e.closest("form[data-panel-action-form]") || e;
    if (e.matches("[data-option-more]")) {
      const r = e.closest("[data-field-name]")?.querySelector("select[data-option-paginated]");
      t instanceof HTMLFormElement && r && this.loadOptions(t, r, !0);
      return;
    }
    if (e.matches("[data-copy-request-id]")) {
      const r = t.querySelector("input[data-action-field-generated]")?.value || "";
      F(r) && this.copyText(r, e);
      return;
    }
    const { panelId: s, actionId: i } = this.actionTarget(t), n = this.drafts.get(f(s, i));
    n && (e.matches("[data-request-check]") ? this.checkRequest(n) : e.matches("[data-request-resubmit]") ? this.resubmitRequest(n) : this.beginNewRequest(n));
  }
  async copyText(e, t) {
    const s = this.root.ownerDocument;
    let i = !1;
    try {
      const r = s.defaultView?.navigator?.clipboard;
      r && typeof r.writeText == "function" && (await r.writeText(e), i = !0);
    } catch {
      i = !1;
    }
    if (!i) {
      const r = s.createElement("textarea");
      r.value = e, r.setAttribute("readonly", ""), r.style.position = "fixed", r.style.opacity = "0", s.body.appendChild(r), r.select();
      try {
        i = typeof s.execCommand == "function" && s.execCommand("copy");
      } catch {
        i = !1;
      }
      r.remove(), t.focus();
    }
    if (!t.isConnected) return;
    const n = t.dataset.copyLabel ?? t.textContent ?? "";
    t.dataset.copyLabel = n, t.dataset.copied = i ? "true" : "false", t.textContent = i ? "Copied" : "Copy failed", setTimeout(() => {
      t.isConnected && (t.textContent = t.dataset.copyLabel ?? n, delete t.dataset.copied, delete t.dataset.copyLabel);
    }, 1500);
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
    const s = this.filterStateFor(e, t), i = m(s) ? { ...s } : {};
    this.regions.filters.querySelectorAll("[data-filter]").forEach((n) => {
      const r = n.dataset.filter || "";
      r && (i[r] = n instanceof HTMLInputElement && n.type === "checkbox" ? n.checked : n.value);
    }), this.filterState.set(e, i), this.renderPanel(!1);
  }
  filterStateFor(e, t) {
    if (!this.filterState.has(e)) {
      const s = t.defaultFilters;
      this.filterState.set(e, m(s) ? { ...s } : s ?? {});
    }
    return this.filterState.get(e);
  }
  markPanelDirty(e) {
    this.dirtyPanels.add(e), !this.cancelFrame && (this.cancelFrame = Lt(() => {
      this.cancelFrame = null, this.flush();
    }));
  }
  flush() {
    if (this.state === "disposed") return;
    if (this.structureDirty) {
      this.structureDirty = !1, this.dirtyPanels.clear(), this.renderNotice(), this.renderConnection(), this.renderTabs(), this.panelMounted(this.activePanel) ? this.renderPanel(!1) : (this.renderFilters(), this.renderPanel(!0)), this.emitChange(this.store.panelIds(), this.state === "ready");
      return;
    }
    const e = Array.from(this.dirtyPanels);
    this.dirtyPanels.clear(), e.length !== 0 && (this.updateCounts(), e.includes(this.activePanel) && this.renderPanel(!1), this.emitChange(e, !1));
  }
  emitChange(e, t) {
    const s = this.options.onChange;
    if (s)
      try {
        s({
          state: this.state,
          panels: [...e],
          snapshot: t
        });
      } catch {
      }
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
      return typeof i == "number" && Number.isFinite(i) ? i : ut;
    };
    return e.map((s, i) => ({
      id: s,
      index: i,
      order: t(s)
    })).sort((s, i) => s.order - i.order || s.index - i.index).map((s) => s.id);
  }
  tabButton(e) {
    return this.regions.tabs.querySelector(`[data-console-tab="${j(e)}"]`);
  }
  renderTabs() {
    const e = this.visiblePanels(), t = this.root.ownerDocument.activeElement, s = t instanceof HTMLElement && this.regions.tabs.contains(t) && t.dataset.consoleTab || "";
    this.regions.tabs.hidden = e.length === 0 || !!this.options.display, this.regions.tabs.innerHTML = e.map((i) => {
      const n = this.registry.get(i), r = i === this.activePanel, o = this.panelCount(i, n), a = this.panelCountTone(i, n), l = n?.hideCount ? n.hideCount(o) : !1;
      return `<button type="button" class="console-tab${r ? " console-tab--active" : ""}" role="tab" id="${p(`${this.idScope}-tab-${i}`)}" aria-selected="${r ? "true" : "false"}" aria-controls="${p(this.regions.panel.id)}" tabindex="${r ? "0" : "-1"}" data-console-tab="${p(i)}"><span class="console-tab__label">${g(n?.label || i)}</span><span class="console-tab__count" data-console-tab-count="${p(i)}"${a ? ` data-tone="${a}"` : ""}${l ? " hidden" : ""}>${g(ee(o))}</span></button>`;
    }).join(""), this.activePanel ? this.regions.panel.setAttribute("aria-labelledby", `${this.idScope}-tab-${this.activePanel}`) : this.regions.panel.removeAttribute("aria-labelledby"), s && this.tabButton(e.includes(s) ? s : this.activePanel)?.focus();
  }
  updateCounts() {
    this.visiblePanels().forEach((e) => {
      const t = this.regions.tabs.querySelector(`[data-console-tab-count="${j(e)}"]`);
      if (!t) return;
      const s = this.registry.get(e), i = this.panelCount(e, s), n = this.panelCountTone(e, s);
      t.textContent = ee(i), t.hidden = s?.hideCount ? s.hideCount(i) : !1, n ? t.dataset.tone = n : delete t.dataset.tone;
    });
  }
  panelCount(e, t) {
    const s = this.panelData(e);
    return t?.getCount ? t.getCount(s) : De(s);
  }
  panelCountTone(e, t) {
    return t?.getCountTone ? q(t.getCountTone(this.panelData(e))) : "";
  }
  panelData(e) {
    const t = this.store.records(e), s = this.serverDefinitions.get(e), i = s?.ui?.views?.console || s?.ui?.views?.toolbar, n = h(i?.renderer);
    return t.length === 1 && !at.has(n) ? t[0].data : t.map((r) => r.data);
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
        o.innerHTML = i.renderBody(n, this.styles, r), this.applyHighlight();
        return;
      }
      this.captureWorkingValues(t);
      const a = i.renderActions(this.styles, r);
      t.innerHTML = `<div class="console-panel__result" data-panel-action-result="${p(s)}"></div>${a.trim() ? `<div class="console-panel__actions" data-console-panel-actions>${a}</div>` : '<div class="console-panel__actions" data-console-panel-actions hidden></div>'}<div class="console-panel__body" data-console-panel-body>${i.renderBody(n, this.styles, r)}</div>`;
    } else {
      const o = M(JSON.stringify(n ?? null));
      if (!e && this.panelMounted(s) && t.dataset.consoleData === o) return;
      this.captureWorkingValues(t), t.innerHTML = (i.renderConsole || i.render)(n, this.styles, r), t.dataset.consoleData = o;
    }
    t.dataset.consolePanelId = s, t.dataset.consoleDefinition = this.definitionSignatures.get(s) || "", t.querySelectorAll("[data-panel-action-picker]").forEach((o) => this.updateActionPicker(o)), this.mountForms(t), this.renderActionResult(), this.applyHighlight();
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
    const n = s === "none" ? "" : ` <button type="button" class="console-btn" data-console-action="${s}">${s === "reload" ? "Reload" : "Retry"}</button>`;
    i.innerHTML = `<span class="console-notice__message">${g(t)}</span>${n}`;
  }
};
function It(e, t = {}) {
  const s = R.get(e);
  if (s) return s;
  const i = !!t.display || e.hasAttribute("data-console-display"), n = t.bootstrap ? be(t.bootstrap) : i ? At(e) : St(e);
  if (!n)
    return e.dataset.consoleState = "error", null;
  const r = new Pt(e, n, i ? {
    ...t,
    display: !0,
    live: !1
  } : t);
  return R.set(e, r), r;
}
function jt(e) {
  return R.get(e) || null;
}
function Gt(e) {
  R.get(e)?.destroy();
}
function Kt(e = document, t = {}) {
  return Array.from(e.querySelectorAll(`${y}:not([data-console-manual])`)).map((s) => It(s, t)).filter((s) => s !== null);
}
var Y = "[data-console-root]:not([data-console-manual])";
function de(e) {
  if (!(e instanceof HTMLElement)) return [];
  const t = Array.from(e.querySelectorAll(Y));
  return e.matches(Y) ? [e, ...t] : t;
}
function Ot(e) {
  typeof MutationObserver > "u" || !document.body || new MutationObserver((t) => {
    t.forEach((s) => {
      s.removedNodes.forEach((i) => {
        de(i).forEach((n) => {
          n.isConnected || e.dispose(n);
        });
      }), s.addedNodes.forEach((i) => {
        de(i).forEach((n) => {
          n.isConnected && e.mount(n);
        });
      });
    });
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  });
}
function Jt(e) {
  if (typeof document > "u") return;
  const t = () => {
    document.querySelectorAll(Y).forEach((s) => e.mount(s)), Ot(e);
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
export {
  It as a,
  At as c,
  We as d,
  He as f,
  se as h,
  jt as i,
  it as l,
  L as m,
  Pt as n,
  Kt as o,
  Be as p,
  Gt as r,
  St as s,
  Jt as t,
  P as u
};

//# sourceMappingURL=auto-mount-B7vOjcyv.js.map
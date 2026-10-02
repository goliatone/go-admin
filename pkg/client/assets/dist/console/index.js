import { escapeAttribute as p, escapeHTML as g } from "../shared/html.js";
import { n as Se, t as Ae } from "../chunks/modal-coordinator-HTtA8-3F.js";
import { httpRequest as Ee, readExpectedHTTPJSON as _e, readHTTPStructuredErrorResult as ke } from "../shared/transport/http-client.js";
import { a as Y, r as z } from "../chunks/busy-D8dMtGI2.js";
import { S as Ce, d as Q, f as Re, g as X, h as fe, l as Te, n as De, p as Z, t as D, u as qe, v as ee, y as Fe } from "../chunks/rich-C-60Te1B.js";
import { a as Pe, c as Zt, d as es, i as Le, l as ts, o as ss, r as rs, s as ns, u as is } from "../chunks/avatar-DIbK-LSg.js";
import { n as as, r as Ie, t as Oe } from "../chunks/live-stream-CyiSPucB.js";
import { _ as cs, a as h, f as ds, g as us, i as hs, n as fs, o as $e, r as Ne, s as ps, u as ms, v as ys } from "../chunks/hydrate-CnDSPe87.js";
import { a as x, i as bs, n as xe, r as M, t as vs } from "../chunks/actions-wQfzbd0C.js";
var Me = 1e3, He = 500, Be = /* @__PURE__ */ new Set([
  "upsert",
  "delete",
  "invalidate"
]), Ue = [
  "console_id",
  "application_id",
  "environment_id",
  "actor_id",
  "scope_key"
];
function q(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function C(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function b(e) {
  return typeof e == "string" ? e.trim() : "";
}
function P(e) {
  const t = q(e) ? e : {};
  return {
    console_id: b(t.console_id),
    application_id: b(t.application_id),
    environment_id: b(t.environment_id),
    actor_id: b(t.actor_id),
    scope_key: b(t.scope_key)
  };
}
function te(e, t) {
  const s = P(t);
  return Ue.every((r) => e[r] === s[r]);
}
function We(e) {
  if (!q(e)) return null;
  const t = b(e.record_key);
  if (!t) return null;
  const s = {
    record_key: t,
    revision: C(e.revision) ?? 0,
    data: e.data
  }, r = b(e.target_id);
  r && (s.target_id = r);
  const n = C(e.generation);
  return n !== null && (s.generation = n), s;
}
function pe(e, t) {
  return `${e}\0${t}`;
}
function je(e, t) {
  const s = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  for (const n of e) {
    const i = q(n) ? b(n.id).toLowerCase() : "";
    if (!i || s.has(i)) continue;
    const o = /* @__PURE__ */ new Map(), a = Array.isArray(n.records) ? n.records : [];
    for (const l of a) {
      const c = We(l);
      if (c && (o.delete(c.record_key), o.set(c.record_key, c), c.target_id && c.generation !== void 0)) {
        const u = pe(i, c.target_id);
        r.set(u, Math.max(r.get(u) ?? c.generation, c.generation));
      }
    }
    me(o, t), s.set(i, o);
  }
  return {
    panels: s,
    generations: r
  };
}
var Ve = class {
  constructor(e) {
    this.panels = /* @__PURE__ */ new Map(), this.generations = /* @__PURE__ */ new Map(), this.lastSequence = null, this.recovering = !0, this.buffer = [], this.bufferOverflowed = !1, this.identity = P(e.identity), this.sequenceMode = e.sequenceMode === "contiguous" ? "contiguous" : "monotonic", this.maxBufferedEvents = Math.max(1, e.maxBufferedEvents ?? Me), this.maxRecordsPerPanel = Math.max(1, e.maxRecordsPerPanel ?? He);
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
    if (!q(e) || !Array.isArray(e.panels)) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    const s = C(e.watermark);
    if (s === null || s < 0) return {
      ok: !1,
      reason: "malformed",
      replayed: 0,
      needsRecovery: !1
    };
    if (!te(this.identity, e)) return {
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
    const { panels: r, generations: n } = je(e.panels, this.maxRecordsPerPanel);
    this.panels = r, this.generations = n, this.lastSequence = s, this.recovering = !1;
    const i = [...this.buffer].sort((c, u) => c.sequence - u.sequence), o = this.bufferOverflowed;
    this.buffer = [], this.bufferOverflowed = !1;
    let a = 0, l = !1;
    for (const c of i) {
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
    if (!q(e)) return "malformed";
    const t = C(e.sequence), s = b(e.kind);
    return t === null || !Be.has(s) ? "malformed" : te(this.identity, e) ? s === "invalidate" ? (this.recovering = !0, "invalidated") : this.recovering || this.lastSequence === null ? (this.bufferEvent(e), "buffered") : t <= this.lastSequence ? "duplicate" : this.sequenceMode === "contiguous" && t > this.lastSequence + 1 ? (this.recovering = !0, this.bufferEvent(e), "gap") : (this.lastSequence = t, this.applyRecordEvent(e, s)) : "foreign";
  }
  bufferEvent(e) {
    this.buffer.length >= this.maxBufferedEvents && (this.buffer.shift(), this.bufferOverflowed = !0), this.buffer.push(e);
  }
  acceptGeneration(e, t, s) {
    if (!t || s === null) return !0;
    const r = pe(e, t), n = this.generations.get(r);
    return n !== void 0 && s < n ? !1 : (this.generations.set(r, s), !0);
  }
  applyRecordEvent(e, t) {
    const s = b(e.panel_id).toLowerCase(), r = this.panels.get(s);
    if (!r) return "foreign";
    const n = b(e.record_key);
    if (!n) return "malformed";
    const i = b(e.target_id), o = C(e.generation);
    if (!this.acceptGeneration(s, i, o)) return "stale";
    const a = r.get(n), l = C(e.revision);
    if (l !== null && a && l <= a.revision) return "stale";
    if (t === "delete") return a && r.delete(n) ? "applied" : "stale";
    const c = {
      record_key: n,
      revision: l ?? (a ? a.revision + 1 : 0),
      data: e.data
    };
    return i && (c.target_id = i), o !== null && (c.generation = o), r.set(n, c), me(r, this.maxRecordsPerPanel), "applied";
  }
};
function me(e, t) {
  for (; e.size > t; ) {
    const s = e.keys().next().value;
    if (s === void 0) return;
    e.delete(s);
  }
}
function Ke(e) {
  return JSON.stringify({
    console_id: e.console_id,
    application_id: e.application_id,
    environment_id: e.environment_id,
    actor_id: e.actor_id,
    scope_key: e.scope_key
  });
}
function Ge(e) {
  try {
    return (e === "local" ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}
var Je = class {
  constructor(e, t = null) {
    this.prefix = Ie(e, ""), this.provider = t;
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
            const n = t.key(r);
            n && n.startsWith(this.prefix) && s.push(n);
          }
          s.forEach((r) => t.removeItem(r));
        } catch {
        }
    }
  }
  storage(e) {
    return this.provider ? (e === "local" ? this.provider.local : this.provider.session) ?? null : Ge(e);
  }
}, Ye = /* @__PURE__ */ new Set([
  "retry",
  "reload",
  "none"
]);
function H(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return {};
  const t = {};
  return Object.entries(e).forEach(([s, r]) => {
    if (typeof r == "string" && r.trim()) t[s] = r.trim();
    else if (Array.isArray(r)) {
      const n = r.filter((i) => typeof i == "string" && i.trim()).join("; ");
      n && (t[s] = n);
    }
  }), t;
}
function ze(e) {
  return e === 401 ? "reload" : e === 0 || e === 408 || e === 429 || e >= 500 ? "retry" : "none";
}
function Qe(e) {
  if (!Array.isArray(e)) return {};
  const t = {};
  return e.slice(0, 50).forEach((s) => {
    if (!s || typeof s != "object") return;
    const r = s.field, n = s.message;
    typeof r == "string" && r.trim() && typeof n == "string" && n.trim() && (t[r.trim()] = t[r.trim()] ? `${t[r.trim()]}; ${n.trim()}` : n.trim());
  }), t;
}
var Xe = /^[A-Z][A-Z0-9_]{0,63}$/;
async function Ze(e, t) {
  const s = await ke(e, t, { appendStatusToFallback: !1 }), r = s.payload && typeof s.payload == "object" ? s.payload : {}, n = r.error && typeof r.error == "object" && !Array.isArray(r.error) ? r.error : {}, i = n.metadata && typeof n.metadata == "object" && !Array.isArray(n.metadata) ? n.metadata : {}, o = s.details || {}, a = {
    ...H(r.fields),
    ...H(o.fields),
    ...Qe(n.validation_errors),
    ...H(i.fields)
  }, l = String(i.action ?? o.action ?? r.action ?? "").trim().toLowerCase(), c = typeof s.message == "string" && s.message.trim() && s.message.length <= 500 ? s.message.trim() : t, u = typeof n.text_code == "string" && Xe.test(n.text_code.trim()) ? n.text_code.trim() : "";
  return {
    status: e.status,
    code: u || s.code || (e.status === 401 ? "UNAUTHORIZED" : e.status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message: c,
    fields: a,
    action: Ye.has(l) ? l : ze(e.status)
  };
}
function et(e) {
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: e,
    fields: {},
    action: "retry"
  };
}
async function O(e, t) {
  const { timeoutMs: s = 1e4, fallbackError: r, signal: n, ...i } = t, o = typeof AbortController < "u" ? new AbortController() : null, a = () => o?.abort();
  let l;
  n && (n.aborted ? a() : n.addEventListener("abort", a, { once: !0 })), o && s > 0 && (l = setTimeout(a, s));
  try {
    const c = await Ee(e, {
      credentials: "same-origin",
      ...i,
      signal: o?.signal ?? n
    });
    if (!c.ok) return {
      ok: !1,
      status: c.status,
      error: await Ze(c, r)
    };
    const u = await _e(c);
    return {
      ok: !0,
      status: c.status,
      value: u
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
      error: et(r)
    };
  } finally {
    l !== void 0 && clearTimeout(l), n?.removeEventListener("abort", a);
  }
}
function V(e, t) {
  let s = e;
  return Object.entries(t).forEach(([r, n]) => {
    const i = encodeURIComponent(n), o = r.replace(/_id$|_key$/, "");
    s = s.split(`{${r}}`).join(i).split(`{${o}}`).join(i).replace(new RegExp(`:${r}(?=$|[/?#.])`, "g"), () => i).replace(new RegExp(`:${o}(?=$|[/?#.])`, "g"), () => i);
  }), s;
}
var ye = "This browser cannot create a request ID. Use a current browser to run this action.", tt = "This request is still being sent.", se = "The earlier request may have been received. Check its status before starting new work.", st = "The earlier request can no longer be confirmed. Start a new request to continue.", rt = "The earlier request’s state is unknown. Check again, or start a new request.", nt = "This request was restored without all of its input. Check its status or start a new request.", K = 8192, it = 864e5, ge = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function L(e = globalThis.crypto) {
  try {
    if (typeof e?.randomUUID == "function") {
      const t = e.randomUUID().toLowerCase();
      if (ge.test(t)) return t;
    }
    if (typeof e?.getRandomValues == "function") {
      const t = e.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
      if (!t) return "";
      t[6] = t[6] & 15 | 64, t[8] = t[8] & 63 | 128;
      const s = Array.from(t, (r) => r.toString(16).padStart(2, "0")).join("");
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
    }
  } catch {
  }
  return "";
}
function F(e) {
  return typeof e == "string" && ge.test(e);
}
function G(e) {
  return Array.isArray(e) ? `[${e.map((t) => G(t)).join(",")}]` : e && typeof e == "object" ? `{${Object.entries(e).filter(([, t]) => t !== void 0).sort(([t], [s]) => t < s ? -1 : t > s ? 1 : 0).map(([t, s]) => `${JSON.stringify(t)}:${G(s)}`).join(",")}}` : JSON.stringify(e ?? null);
}
function f(e, t) {
  return `${e}\0${t}`;
}
function be(e, t, s = L) {
  return {
    panelID: e,
    actionID: t,
    nextID: s(),
    current: null
  };
}
function B(e) {
  return !!e && e.state !== "resolved";
}
function re(e, t, s) {
  const r = e.current;
  return r && r.state === "pending" ? {
    kind: "blocked",
    reason: tt
  } : r && r.state === "checking" ? {
    kind: "blocked",
    reason: se,
    check: !0
  } : r && r.mode === t && r.signature === s ? r.state === "expired" ? {
    kind: "blocked",
    reason: st
  } : r.state === "unknown" ? {
    kind: "blocked",
    reason: rt,
    check: !0
  } : r.partial ? {
    kind: "blocked",
    reason: nt,
    check: !0
  } : {
    kind: "replay",
    request: r
  } : r && r.state === "uncertain" ? {
    kind: "blocked",
    reason: se,
    check: !0
  } : F(e.nextID) ? {
    kind: "new",
    id: e.nextID
  } : {
    kind: "blocked",
    reason: ye
  };
}
function ot(e, t, s, r, n, i, o = L, a = /* @__PURE__ */ new Date()) {
  const l = {
    id: t,
    mode: s,
    payload: JSON.parse(JSON.stringify(r)),
    signature: n,
    submittedAt: a.toISOString(),
    scope: i,
    state: "pending"
  };
  return e.current = l, e.nextID === t && (e.nextID = o()), l;
}
function at(e, t = L) {
  const s = e.current;
  return s && (s.state === "pending" || s.state === "checking" || s.state === "uncertain") ? !1 : (e.current = null, F(e.nextID) || (e.nextID = t()), !0);
}
function lt(e) {
  return e.current?.id || e.nextID;
}
function ne(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function T(e) {
  return typeof e == "string" ? e.trim() : "";
}
function ct(e, t) {
  if (!ne(e)) return null;
  const s = {
    panel_id: T(e.panel_id).toLowerCase(),
    action_id: T(e.action_id).toLowerCase(),
    request_id: T(e.request_id).toLowerCase(),
    mode: e.mode === "secondary" ? "secondary" : "primary",
    scope: T(e.scope).slice(0, 200),
    submitted_at: T(e.submitted_at),
    signature: typeof e.signature == "string" ? e.signature.slice(0, K) : "",
    state: [
      "pending",
      "uncertain",
      "checking",
      "unclaimed",
      "unknown",
      "expired"
    ].includes(e.state) ? e.state : "uncertain",
    payload: ne(e.payload) ? e.payload : void 0
  }, r = Date.parse(s.submitted_at);
  return !s.panel_id || !s.action_id || !F(s.request_id) || Number.isNaN(r) || t - r > it || r - t > 3e5 ? null : s;
}
var dt = class {
  constructor(e) {
    this.store = e;
  }
  entries(e = Date.now()) {
    const t = this.store?.get();
    if (!t) return [];
    try {
      const s = JSON.parse(t);
      return Array.isArray(s) ? s.map((r) => ct(r, e)).filter((r) => r !== null).slice(-16) : [];
    } catch {
      return [];
    }
  }
  put(e, t, s) {
    if (!this.store) return !1;
    const r = {
      panel_id: e.panelID,
      action_id: e.actionID,
      request_id: t.id,
      mode: t.mode,
      scope: t.scope,
      submitted_at: t.submittedAt,
      signature: t.signature,
      state: t.state === "resolved" ? "uncertain" : t.state
    }, n = JSON.stringify(t.payload);
    !s && !t.partial && n.length <= K && r.signature.length <= K ? r.payload = JSON.parse(n) : r.signature = "";
    const i = this.entries().filter((o) => o.request_id !== r.request_id && !(o.panel_id === r.panel_id && o.action_id === r.action_id));
    return i.push(r), this.write(i.slice(-16));
  }
  remove(e) {
    if (!this.store) return;
    const t = this.entries(), s = t.filter((r) => r.request_id !== e);
    s.length !== t.length && this.write(s);
  }
  clear() {
    this.store?.remove();
  }
  write(e) {
    return this.store ? e.length === 0 ? (this.store.remove(), !0) : this.store.set(JSON.stringify(e)) : !1;
  }
};
function ut(e, t = L) {
  const s = be(e.panel_id, e.action_id, t);
  return s.current = {
    id: e.request_id,
    mode: e.mode,
    payload: e.payload || {},
    signature: e.signature,
    submittedAt: e.submitted_at,
    scope: e.scope,
    state: e.state === "expired" || e.state === "unclaimed" || e.state === "unknown" ? e.state : "uncertain",
    partial: !e.payload || !e.signature
  }, s;
}
var ht = 16, ft = class {
  constructor(e) {
    this.layer = null, this.closed = !1, this.releaseListeners = [], this.options = e, this.panelID = e.panelID, this.actionID = e.actionID;
    const t = e.root.ownerDocument, s = `${e.id}-title`, r = t.createElement("div");
    r.className = "console-drawer-layer", r.setAttribute("data-console-drawer-layer", ""), r.dataset.state = "opening", r.innerHTML = `
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
    `, this.element = r, this.dialog = r.querySelector("[data-console-drawer]"), e.root.appendChild(r), this.layer = Se({
      container: this.dialog,
      zIndexTarget: r,
      initialFocus: null,
      returnFocus: null,
      dismissOnEscape: !0,
      onEscape: () => this.close(),
      lockBodyScroll: !0
    }), this.listen(this.dialog, "keydown", (i) => {
      const o = i;
      if (o.key !== "Tab" || o.defaultPrevented || o.altKey || o.ctrlKey || o.metaKey) return;
      const a = Ae(this.dialog);
      if (a.length === 0) return;
      const l = a.indexOf(t.activeElement), c = a.length - 1, u = o.shiftKey ? l <= 0 ? c : l - 1 : l < 0 || l === c ? 0 : l + 1;
      o.preventDefault(), a[u].focus();
    }), this.listen(r, "click", (i) => {
      const o = i.target;
      (o?.closest("[data-drawer-close], [data-drawer-cancel]") || o?.hasAttribute("data-drawer-backdrop")) && (i.preventDefault(), this.close());
    });
    const n = () => {
      this.closed || (r.dataset.state = "open");
    };
    typeof requestAnimationFrame == "function" ? requestAnimationFrame(n) : setTimeout(n, ht), this.focusInitial();
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
      const s = this.options.root.ownerDocument, r = s.activeElement;
      if (!r || r === s.body || !r.isConnected) {
        const n = this.options.invoker;
        (n && n.isConnected && !n.closest("[hidden]") ? n : this.options.fallbackFocus())?.focus({ preventScroll: !1 });
      }
    }
    this.options.onClose?.();
  }
  listen(e, t, s) {
    e.addEventListener(t, s), this.releaseListeners.push(() => e.removeEventListener(t, s));
  }
}, y = "[data-console-root]", pt = "[data-console-page-actions][data-console-for]", mt = 'script[type="application/json"][data-console-bootstrap]', yt = 'script[type="application/json"][data-console-widget]', gt = /* @__PURE__ */ new Set([
  "table",
  "status_list",
  "timeline"
]), ie = /* @__PURE__ */ new Set([
  1008,
  4401,
  4403
]), bt = [
  1e3,
  2e3,
  5e3,
  1e4,
  3e4
], oe = "active-panel", vt = 16, wt = 5e3, St = 100, At = 3, Et = 6e4, U = "requests", _t = /* @__PURE__ */ new Set([
  0,
  500,
  502,
  503,
  504
]), kt = 500, Ct = 25, Rt = 250, k = "This action is no longer available.", ae = "[data-console-action-ref], [data-console-panel-link], [data-console-record-link], [data-console-banner-dismiss], [data-copy-trigger]", Tt = "[data-advanced-toggle], [data-copy-request-id], [data-new-request], [data-request-check], [data-request-resubmit], [data-request-new], [data-option-more]", R = /* @__PURE__ */ new WeakMap(), $ = /* @__PURE__ */ new WeakMap(), Dt = 0;
function m(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function d(e) {
  return typeof e == "string" ? e.trim() : "";
}
function qt(e) {
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
function Ft(e) {
  const t = Array.from(e.querySelectorAll(mt)).find((s) => s.closest(y) === e);
  if (!t) return null;
  try {
    return ve(JSON.parse(t.textContent || ""));
  } catch {
    return null;
  }
}
function Pt(e) {
  const t = Array.from(e.querySelectorAll(yt)).find((s) => s.closest(y) === e);
  if (!t) return null;
  try {
    const s = JSON.parse(t.textContent || "");
    if (!m(s) || !m(s.panel)) return null;
    const r = P(s), n = typeof s.watermark == "number" ? s.watermark : 0;
    return r.console_id ? {
      ...r,
      title: d(s.panel.label) || void 0,
      urls: { snapshot: "" },
      snapshot: {
        ...r,
        watermark: n,
        panels: [s.panel]
      }
    } : null;
  } catch {
    return null;
  }
}
function ve(e) {
  if (!m(e)) return null;
  const t = P(e), s = qt(e.urls);
  return !t.console_id || !s ? null : {
    ...t,
    title: d(e.title) || void 0,
    urls: s,
    preferences_namespace: d(e.preferences_namespace) || void 0,
    snapshot: m(e.snapshot) ? e.snapshot : void 0
  };
}
function Lt(e) {
  return typeof e.watermark == "number" && Array.isArray(e.panels) && typeof e.console_id == "string";
}
function w(e, t, s) {
  const [r, n] = e.split("#"), i = `${r}${r.includes("?") ? "&" : "?"}${encodeURIComponent(t)}=${encodeURIComponent(s)}`;
  return n === void 0 ? i : `${i}#${n}`;
}
function le(e) {
  return m(e) && typeof e.sequence == "number" && typeof e.kind == "string" && typeof e.console_id == "string";
}
function It(e, t) {
  let s = w(e, "limit", String(Ct));
  return t.query && (s = w(s, "q", t.query.slice(0, 120))), t.cursor && (s = w(s, "cursor", t.cursor)), t.pinned && (s = w(s, "value", t.pinned)), s;
}
function W(e) {
  if (!m(e)) return "";
  const t = d(e.value);
  if (!t) return "";
  const s = d(e.description);
  return `<option value="${p(t)}"${e.disabled === !0 ? " disabled" : ""}${s ? ` title="${p(s)}"` : ""}>${g(d(e.label) || t)}</option>`;
}
function Ot(e, t, s, r) {
  const n = new Set(Array.from(e.options).map((l) => l.value)), i = (Array.isArray(t.items) ? t.items : []).filter((l) => !s || !n.has(d(l?.value))), o = (Array.isArray(t.selected) ? t.selected : []).filter((l) => !i.some((c) => d(c?.value) === d(l?.value)));
  s ? e.insertAdjacentHTML("beforeend", i.map(W).join("")) : (e.innerHTML = `<option value="">${i.length || o.length ? "Select…" : "No options available"}</option>` + o.map(W).join("") + i.map(W).join(""), r && Array.from(e.options).some((l) => l.value === r) && (e.value = r), delete e.dataset.pendingValue);
  const a = d(t.next_cursor);
  return a ? e.dataset.nextCursor = a : delete e.dataset.nextCursor, a;
}
function ce(e, t) {
  e.setAttribute("aria-expanded", t ? "true" : "false");
  const s = e.closest("[data-expanded]");
  s && (s.dataset.expanded = t ? "true" : "false");
}
function $t(e, t, s) {
  let r = V(e, {
    panel_id: t.panelID,
    request_id: s.id
  });
  return r = w(r, "action", t.actionID), s.scope && (r = w(r, "scope", s.scope)), w(r, "submitted_at", s.submittedAt);
}
function Nt(e) {
  return `<code class="console-kv__mono" title="${p(e)}">${g(e.slice(0, 8))}</code>`;
}
function E(e, t, s = !1) {
  return `<button type="button" class="console-btn console-btn--sm${s ? " console-btn--ghost" : ""}" ${e}>${g(t)}</button>`;
}
function xt(e, t) {
  if (!e) return {
    message: "",
    actions: "",
    tone: "info"
  };
  const s = Nt(e.id), r = e.partial ? "" : E("data-request-resubmit", "Resubmit unchanged");
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
        actions: E("data-request-check", "Check status") + r,
        tone: "warning"
      };
    case "unclaimed":
      return {
        message: `Request ${s} was not received.`,
        actions: r + E("data-request-new", "Start new request", !0),
        tone: "warning"
      };
    case "unknown":
      return {
        message: g(e.message || "The state of this request is unknown."),
        actions: E("data-request-check", "Check again") + E("data-request-new", "Start new request", !0),
        tone: "warning"
      };
    case "expired":
      return {
        message: `${g(e.message || "This request can no longer be confirmed.")} Start a new request to continue.`,
        actions: E("data-request-new", "Start new request"),
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
function Mt(e) {
  return e.ok !== !1 || !m(e.errors) ? {} : Object.fromEntries(Object.entries(e.errors).map(([t, s]) => [t, typeof s == "string" ? s : fe(s, { nullAsEmptyObject: !1 })]));
}
function Ht(e, t, s, r) {
  const n = e.ok === !1, i = n ? "Action failed." : e.planned ? "Planned. Nothing changed." : "Action complete.", o = m(e.record) ? e.record : null, a = d(o?.record_key);
  return {
    status: n ? "error" : "ok",
    tone: D(e.tone) || (n ? "error" : e.planned ? "planned" : "success"),
    message: d(e.message) || i,
    actionID: s,
    data: e.data,
    requestID: r?.id,
    record: a ? {
      panelId: h(o?.panel_id) || t,
      recordKey: a
    } : void 0,
    followUp: Array.isArray(e.follow_up) ? e.follow_up : void 0
  };
}
function Bt(e) {
  const t = e instanceof HTMLInputElement && e.type === "checkbox", s = t ? "" : e.value.trim();
  if (!t && !s && e.hasAttribute("required")) return "Enter a value.";
  const r = d(e.dataset.actionFieldKind).toLowerCase();
  if (!s || r !== "number" && r !== "integer") return "";
  const n = Number(s);
  if (!Number.isFinite(n) || r === "integer" && !Number.isInteger(n)) return r === "integer" ? "Enter a whole number." : "Enter a number.";
  const i = e.getAttribute("min"), o = e.getAttribute("max");
  return i !== null && n < Number(i) ? `Enter ${i} or more.` : o !== null && n > Number(o) ? `Enter ${o} or less.` : "";
}
function j(e) {
  const t = globalThis.CSS?.escape;
  return t ? t(e) : e.replace(/["\\]/g, "\\$&");
}
function Ut(e) {
  if (typeof requestAnimationFrame == "function") {
    const s = requestAnimationFrame(() => e());
    return () => cancelAnimationFrame(s);
  }
  const t = setTimeout(e, vt);
  return () => clearTimeout(t);
}
var Wt = class {
  constructor(e, t, s = {}) {
    this.serverDefinitions = /* @__PURE__ */ new Map(), this.filterState = /* @__PURE__ */ new Map(), this.actionResults = /* @__PURE__ */ new Map(), this.drafts = /* @__PURE__ */ new Map(), this.inFlight = /* @__PURE__ */ new Map(), this.workingValues = /* @__PURE__ */ new Map(), this.notified = /* @__PURE__ */ new Set(), this.controllers = /* @__PURE__ */ new Set(), this.cleanup = [], this.state = "loading", this.connection = "offline", this.activePanel = "", this.policyCloses = [], this.stream = null, this.recoveryPromise = null, this.recoveryPending = !1, this.snapshotEpoch = 0, this.freshStreamSnapshot = !1, this.recoveryAttempts = 0, this.recoveryTimer = null, this.cancelFrame = null, this.dirtyPanels = /* @__PURE__ */ new Set(), this.structureDirty = !1, this.livePanels = [], this.snapshotWaitTimer = null, this.definitionSignatures = /* @__PURE__ */ new Map(), this.drawer = null, this.clientOutdated = !1, this.requestsRestored = !1, this.highlight = null, this.notice = {
      kind: "loading",
      message: "Loading console…",
      action: "none"
    }, this.root = e, this.bootstrap = t, this.options = s, this.styles = s.styles || Ce, this.identity = P(t), this.idScope = `console-${Dt += 1}`, this.registry = Le(), this.store = new Ve({
      identity: this.identity,
      sequenceMode: "monotonic"
    }), this.preferences = new Je(t.preferences_namespace || Ke(this.identity), s.storage ?? null), this.generate = s.generateRequestID || (() => L()), this.ledger = new dt({
      get: () => this.preferences.get(U, "session"),
      set: (r) => this.preferences.set(U, r, "session"),
      remove: () => this.preferences.remove(U, "session")
    }), (s.panels || []).forEach((r) => this.registry.register(r)), this.root.classList.add("console-root"), this.regions = this.ensureRegions(), this.bindEvents(), this.root.dataset.consoleState = "loading", this.root.dataset.consoleSync = "recovering", this.render(), this.start();
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
    this.state !== "disposed" && (this.state = "disposed", this.closeLive(), this.controllers.forEach((e) => e.abort()), this.controllers.clear(), this.recoveryTimer !== null && clearTimeout(this.recoveryTimer), this.recoveryTimer = null, this.cancelFrame?.(), this.cancelFrame = null, this.cleanup.splice(0).forEach((e) => e()), this.closeDrawer(!1), this.releaseHeaderControls(), this.registry.dispose(), this.store.clear(), this.serverDefinitions.clear(), this.actionResults.clear(), this.filterState.clear(), this.drafts.clear(), this.inFlight.clear(), this.workingValues.clear(), R.get(this.root) === this && R.delete(this.root), this.root.dataset.consoleState = "disposed");
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
    const t = this.options.recoveryDelaysMs || bt, s = this.recoveryAttempts;
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
    e.forEach((r) => {
      const n = h(r?.id);
      if (!n || t.has(n)) return;
      t.add(n);
      const { records: i, ...o } = r, a = this.options.display && o.ui?.actions ? {
        ...o,
        ui: {
          ...o.ui,
          actions: []
        }
      } : o, l = ee(JSON.stringify(a));
      if (this.definitionSignatures.get(n) === l && this.registry.has(n)) return;
      this.definitionSignatures.set(n, l), this.serverDefinitions.set(n, a);
      const c = Ne(a, {
        consoleRenderer: this.options.renderers?.[n],
        styles: this.styles
      });
      c && this.registry.registerServerDefinition(c);
    });
    for (const r of Array.from(this.serverDefinitions.keys())) t.has(r) || (this.serverDefinitions.delete(r), this.definitionSignatures.delete(r), this.filterState.delete(r), this.actionResults.delete(r), this.registry.isServerDefinition(r) && this.registry.unregister(r), this.forgetPanelRequests(r));
    this.syncDrawerAvailability();
    const s = this.visiblePanels();
    if (!s.includes(this.activePanel)) {
      const r = h(this.preferences.get(oe, "session"));
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
    const s = new Oe({
      ...this.options.liveOptions || {},
      url: w(w(e, "panels", t.join(",")), qe, Z()),
      onMessage: (r) => {
        this.stream === s && this.handleLiveMessage(r);
      },
      onStatusChange: (r) => {
        this.stream === s && this.handleLiveStatus(r);
      },
      onClose: (r) => {
        this.stream === s && ie.has(r.code) && this.verifyAccessAfterClose();
      },
      shouldReconnect: (r) => !ie.has(r.code)
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
    }, Math.max(0, this.options.snapshotWaitMs ?? wt));
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
    if (this.policyCloses = this.policyCloses.filter((t) => e - t < Et), this.policyCloses.push(e), await this.recover(), !(this.isClosed() || this.state !== "ready")) {
      if (this.policyCloses.length > At) {
        this.setConnection("disconnected"), this.setNotice("error", "Live updates stopped. Refresh to load the latest data.", "retry");
        return;
      }
      this.connectLive();
    }
  }
  handleLiveMessage(e) {
    if (this.isClosed() || !m(e)) return;
    if (Lt(e)) {
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
    return { [Te]: Z() };
  }
  actionDeclaration(e, t) {
    if (!(!e || !t))
      return this.serverDefinitions.get(e)?.ui?.actions?.find((s) => h(s.id) === t);
  }
  executableAction(e, t) {
    if (this.state !== "ready" || this.options.display || !this.visiblePanels().includes(e)) return null;
    const s = this.actionDeclaration(e, t);
    return s && s.hidden !== !0 && Re(s).executable ? s : null;
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
    const s = e.confirmation, r = d(e.confirm_text) || d(t?.dataset.actionConfirm);
    if (!(s || e.requires_confirm === !0 || t?.dataset.actionRequiresConfirm === "true" || r)) return null;
    const n = d(e.label) || h(e.id);
    return {
      title: d(s?.title) || n || "Confirm action",
      message: d(s?.message) || r || "Run this action?",
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
      const { confirmConsoleAction: t } = await import("../chunks/confirm-C_6eUg1X.js");
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
    const r = t.secondary_submit, n = h(r?.field);
    (t.fields || []).forEach((i) => {
      const o = h(i.name), a = h(i.kind) === "hidden";
      if (!o || !a && o !== n) return;
      const l = d(i.payload_path) || o;
      o === n && s === "secondary" ? x(e, l, r?.value) : i.default !== void 0 && i.default !== null && typeof i.default != "object" && x(e, l, i.default);
    });
  }
  composeWorkflowPayload(e, t, s) {
    const r = e.payload && typeof e.payload == "object" && !Array.isArray(e.payload) ? e.payload : {}, n = M(t, {
      base: r,
      skipGenerated: !0
    });
    this.applySubmitter(n, e, s);
    const i = (e.fields || []).filter((o) => h(o.generate) === "request_id").map((o) => d(o.payload_path) || h(o.name)).filter(Boolean);
    return {
      payload: n,
      signature: G(n),
      generated: i
    };
  }
  hasSensitiveInput(e, t) {
    return (this.actionDeclaration(e, t)?.fields || []).some((s) => s.sensitive === !0);
  }
  draftFor(e, t) {
    const s = f(e, t);
    let r = this.drafts.get(s);
    return r || (r = be(e, t, this.generate), this.drafts.set(s, r)), r;
  }
  mountedForms(e, t) {
    const s = [this.regions.panel, this.drawer?.element].filter((n) => !!n), r = [];
    return s.forEach((n) => {
      n.querySelectorAll("form[data-panel-action-form]").forEach((i) => {
        if (i.closest(y) !== this.root) return;
        const o = this.actionTarget(i);
        e && (o.panelId !== e || o.actionId !== t) || r.push(i);
      });
    }), r;
  }
  mountedForm(e, t, s) {
    if (s?.isConnected) return s;
    const r = this.mountedForms(e, t);
    return r.find((n) => this.drawer?.element.contains(n)) || r[0] || null;
  }
  async runButtonAction(e) {
    const { panelId: t, actionId: s } = this.actionTarget(e), r = this.executableAction(t, s);
    if (!r || !this.bootstrap.urls.actions || this.inFlight.has(f(t, s))) return;
    if (this.clientOutdated) {
      this.showOutdated(t, s);
      return;
    }
    const n = this.confirmationFor(r, e);
    n && !await this.confirmWith(n) || this.executableAction(t, s) && await this.dispatch({
      panelId: t,
      actionId: s,
      payload: M(e),
      mode: "primary",
      form: null
    });
  }
  activateActionRef(e) {
    if (e.getAttribute("aria-disabled") === "true" || e.hasAttribute("data-action-unavailable")) return;
    const { panelId: t, actionId: s } = this.actionTarget(e);
    if (t !== this.activePanel) return;
    const r = this.executableAction(t, s);
    if (!r) {
      this.showActionResult(this.activePanel, {
        status: "error",
        tone: "warning",
        message: k,
        actionID: s
      }, !0);
      return;
    }
    const n = B(this.drafts.get(f(t, s))?.current);
    if (this.actionNeedsForm(r) || n) {
      this.openDrawer(t, s, r, e);
      return;
    }
    (async () => {
      if (this.clientOutdated) {
        this.showOutdated(t, s);
        return;
      }
      if (this.inFlight.has(f(t, s))) return;
      const i = this.confirmationFor(r);
      if (i && !await this.confirmWith(i)) return;
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
    const { panelId: s, actionId: r } = this.actionTarget(e);
    if (!this.bootstrap.urls.actions || !s || !r || this.inFlight.has(f(s, r))) return;
    const n = this.executableAction(s, r);
    if (!n) {
      this.setFormMessage(e, k, "warning");
      return;
    }
    if (this.clientOutdated) {
      this.setFormMessage(e, Q, "warning"), this.showOutdated(s, r);
      return;
    }
    const i = t?.dataset.submitter === "secondary" && n.secondary_submit ? "secondary" : "primary";
    if (e.querySelector("[data-action-field-generated]")) {
      await this.submitWorkflowForm(e, n, s, r, i);
      return;
    }
    const o = this.confirmationFor(n, e);
    if (o && !await this.confirmWith(o) || !this.executableAction(s, r)) return;
    const a = M(e);
    n.secondary_submit && this.applySubmitter(a, n, i), await this.dispatch({
      panelId: s,
      actionId: r,
      payload: a,
      mode: i,
      form: e
    });
  }
  async submitWorkflowForm(e, t, s, r, n) {
    let i = e;
    const o = this.draftFor(s, r);
    this.clearFieldErrors(i);
    const a = this.validateWorkflowForm(i);
    if (Object.keys(a).length > 0) {
      this.showFieldErrors(i, a);
      const A = i.querySelector('[aria-invalid="true"]'), I = A?.closest("[data-expanded]")?.querySelector("[data-advanced-toggle]");
      I && ce(I, !0), A?.focus();
      return;
    }
    let l = t, c = this.composeWorkflowPayload(l, i, n), u = re(o, n, c.signature);
    if (u.kind === "blocked") {
      this.renderRequestState(o, u.reason);
      return;
    }
    if (u.kind === "replay") {
      await this.sendRequest(o, u.request, i);
      return;
    }
    const _ = this.confirmationFor(l, i);
    if (_) {
      const A = f(s, r);
      if (l.confirmation) {
        if (this.inFlight.set(A, n), this.syncBusy(), await this.refresh(), this.inFlight.delete(A), this.syncBusy(), this.isClosed()) return;
        const J = this.executableAction(s, r);
        if (i = this.mountedForm(s, r, i) || i, this.root.dataset.consoleSync !== "current") {
          this.setFormMessage(i, "The current state could not be loaded. Try again.", "warning");
          return;
        }
        if (!J) {
          this.setFormMessage(i, k, "warning");
          return;
        }
        l = J, c = this.composeWorkflowPayload(l, i, n);
      }
      const I = this.confirmationFor(l, i) || _;
      if (!await this.confirmWith(I) || this.isClosed()) return;
      if (!this.executableAction(s, r)) {
        this.setFormMessage(this.mountedForm(s, r, i) || i, k, "warning");
        return;
      }
      if (u = re(o, n, c.signature), u.kind === "blocked") {
        this.renderRequestState(o, u.reason);
        return;
      }
      if (u.kind === "replay") {
        await this.sendRequest(o, u.request, i);
        return;
      }
    }
    const S = u.kind === "new" ? u.id : "";
    if (!S) return;
    const v = c.payload;
    c.generated.forEach((A) => x(v, A, S));
    const N = ot(o, S, n, v, c.signature, d(l.request_scope), this.generate);
    await this.sendRequest(o, N, i);
  }
  validateWorkflowForm(e) {
    const t = {};
    return e.querySelectorAll("[data-action-field]").forEach((s) => {
      if (!(s instanceof HTMLInputElement || s instanceof HTMLSelectElement || s instanceof HTMLTextAreaElement) || s.disabled || s.hasAttribute("data-action-field-generated")) return;
      const r = s.closest("[hidden]");
      if (r && e.contains(r)) return;
      const n = Bt(s);
      n && (t[d(s.dataset.actionFieldPath) || d(s.dataset.actionField)] = n);
    }), t;
  }
  async sendRequest(e, t, s) {
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
    const { panelId: t, actionId: s, payload: r, mode: n } = e, i = f(t, s), o = V(this.bootstrap.urls.actions || "", {
      panel_id: t,
      action_id: s
    });
    if (!o) return;
    this.inFlight.set(i, n), this.syncBusy(), e.form && this.clearFieldErrors(e.form);
    const a = new AbortController();
    this.controllers.add(a);
    const l = await O(o, {
      method: "POST",
      json: r,
      headers: this.requestHeaders(),
      signal: a.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Action failed."
    });
    if (this.controllers.delete(a), this.inFlight.delete(i), this.isClosed()) return;
    this.syncBusy();
    const c = this.mountedForm(t, s, e.form);
    e.draft && e.request && this.settleRequest(e.draft, e.request, l), l.ok ? this.applyActionResult(c, t, s, l.value, e.request) : this.applyActionFailure(c, t, s, l.status, l.error, e.request);
  }
  settleRequest(e, t, s) {
    e.current === t && (!s.ok && _t.has(s.status) ? (t.state = "uncertain", t.message = "This request may not have been received.", this.ledger.put(e, t, this.hasSensitiveInput(e.panelID, e.actionID))) : (t.state = "resolved", t.message = void 0, this.ledger.remove(t.id)), this.renderRequestState(e));
  }
  applyActionFailure(e, t, s, r, n, i) {
    if (r === 401) {
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
    if (i && i.state === "uncertain") {
      this.drawerFor(t, s) || this.showActionResult(t, {
        status: "error",
        tone: "warning",
        message: "We could not confirm this request was received. Check its status before starting new work.",
        actionID: s,
        requestID: i.id,
        checkRequest: !0
      }, !0);
      return;
    }
    const o = Object.keys(n.fields).length > 0;
    e && o && this.showFieldErrors(e, n.fields);
    const a = r === 403 ? "You are not allowed to run this action." : n.message;
    o && e && this.drawerFor(t, s) ? this.setFormMessage(e, a, "error") : (this.closeDrawerFor(t, s), this.showActionResult(t, {
      status: "error",
      tone: "error",
      message: a,
      actionID: s,
      requestID: i?.id
    }, !0)), r === 403 && this.refresh();
  }
  applyActionResult(e, t, s, r, n, i = !0) {
    const o = m(r) ? r : {}, a = Mt(o);
    e && Object.keys(a).length > 0 && this.showFieldErrors(e, a);
    const l = Ht(o, t, s, n);
    if (e && Object.keys(a).length > 0 && this.drawerFor(t, s) ? this.setFormMessage(e, l.message, "error") : (this.closeDrawerFor(t, s), this.showActionResult(t, l, i), l.record && l.record.panelId === t && (this.highlight = { ...l.record }, this.applyHighlight(!0))), le(o.event)) {
      const c = this.notificationOf(h(o.event.panel_id), o.event.data);
      c && this.remember(c.id), this.handleLiveMessage(o.event);
    }
    o.refresh && this.refresh();
  }
  showOutdated(e, t) {
    this.showActionResult(e || this.activePanel, {
      status: "error",
      tone: "warning",
      message: Q,
      actionID: t,
      reload: !0
    }, !0);
  }
  showActionResult(e, t, s = !1) {
    e && (this.actionResults.set(e, t), e === this.activePanel && this.renderActionResult(s));
  }
  renderActionResult(e = !1) {
    const t = this.actionResults.get(this.activePanel), s = Array.from(this.regions.panel.querySelectorAll("[data-panel-action-result]")).find((_) => _.dataset.panelActionResult === this.activePanel);
    if (!s) return;
    if (!t) {
      s.innerHTML = "";
      return;
    }
    const r = D(t.tone) || (t.status === "error" ? "error" : "success"), n = this.serverDefinitions.get(this.activePanel), i = t.requestID ? `<p class="console-banner__meta">Request <code class="console-kv__mono" title="${p(t.requestID)}">${g(t.requestID.slice(0, 8))}</code></p>` : "", o = t.record && this.visiblePanels().includes(t.record.panelId) ? `<button type="button" class="console-btn console-btn--sm" data-console-record-link data-panel-id="${p(t.record.panelId)}" data-record-key="${p(t.record.recordKey)}">View</button>` : "", a = t.followUp ? De(t.followUp, n, this.styles) : "", l = t.checkRequest && t.requestID ? `<button type="button" class="console-btn console-btn--sm" data-request-check data-panel-id="${p(this.activePanel)}" data-action-id="${p(t.actionID)}">Check status</button>` : "", c = t.reload ? '<button type="button" class="console-btn console-btn--sm" data-console-action="reload">Reload</button>' : "", u = t.data === void 0 ? "" : `<details class="console-banner__details"><summary>Details</summary><pre class="${this.styles.jsonPanel}">${g(fe(t.data, { nullAsEmptyObject: !1 }))}</pre></details>`;
    s.innerHTML = `<div class="console-banner" data-console-banner data-tone="${r}" data-status="${t.status}" role="${t.status === "error" ? "alert" : "status"}" tabindex="-1"><div class="console-banner__body"><p class="console-banner__message">${g(t.message)}</p>${i}${u}</div><div class="console-banner__actions">${o}${l}${a}${c}<button type="button" class="console-btn console-btn--ghost console-btn--sm console-btn--icon" data-console-banner-dismiss aria-label="Dismiss"><span aria-hidden="true">×</span></button></div></div>`, e && s.querySelector("[data-console-banner]")?.focus();
  }
  dismissActionResult() {
    this.actionResults.delete(this.activePanel), this.highlight = null, this.renderActionResult(), this.applyHighlight(), this.regions.panel.focus();
  }
  applyHighlight(e = !1) {
    this.regions.panel.querySelectorAll("[data-console-highlight]").forEach((r) => {
      r.removeAttribute("data-console-highlight");
    });
    const t = this.highlight;
    if (!t || t.panelId !== this.activePanel) return null;
    const s = Array.from(this.regions.panel.querySelectorAll("[data-row-key]")).find((r) => r.dataset.rowKey === t.recordKey && r.closest(y) === this.root) || null;
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
    Object.entries(t).forEach(([s, r]) => {
      const n = s.trim(), i = Array.from(e.querySelectorAll("[data-action-field-error]")).find((o) => o.dataset.actionFieldError === n || o.dataset.actionFieldName === n || o.dataset.actionFieldError === `payload.${n}`);
      i && (i.textContent = r, i.hidden = !1, Array.from(e.querySelectorAll("[data-action-field]")).find((o) => (o.dataset.actionFieldPath || o.dataset.actionField) === i.dataset.actionFieldError)?.setAttribute("aria-invalid", "true"));
    });
  }
  setFormMessage(e, t, s) {
    e.querySelector("[data-form-message]")?.remove();
    const r = e.ownerDocument.createElement("p");
    r.className = "console-form__message", r.setAttribute("data-form-message", ""), r.setAttribute("role", s === "error" ? "alert" : "status"), r.dataset.tone = D(s) || "warning", r.textContent = t;
    const n = e.querySelector(".console-form__actions, .console-drawer__footer");
    n?.parentElement ? n.parentElement.insertBefore(r, n) : e.appendChild(r);
  }
  renderRequestState(e, t = "") {
    this.mountedForms(e.panelID, e.actionID).forEach((s) => this.renderFormRequest(s, e, t)), this.syncBusy();
  }
  renderFormRequest(e, t, s = "") {
    const r = lt(t);
    e.querySelectorAll("input[data-action-field-generated]").forEach((u) => {
      u.value = r;
    });
    const n = !F(r);
    e.querySelectorAll("button[data-submitter]").forEach((u) => {
      n ? (u.disabled = !0, u.dataset.requestDisabled = "true") : u.dataset.requestDisabled === "true" && (delete u.dataset.requestDisabled, u.disabled = !1);
    });
    const i = e.querySelector("[data-request-status]");
    if (!i) return;
    const o = t.current;
    let { message: a, actions: l, tone: c } = n ? {
      message: ye,
      actions: "",
      tone: "warning"
    } : xt(o, !!e.closest("[data-console-drawer]"));
    s && (c = "warning", a = a ? `${a} ${g(s)}` : g(s), o?.state === "uncertain" && !l.includes("data-request-check") && (l = E("data-request-check", "Check status") + l)), i.hidden = !a, i.dataset.tone = c, i.dataset.state = o?.state || "draft", i.setAttribute("role", c === "warning" ? "alert" : "status"), i.innerHTML = a ? `<p class="console-request-status__message">${a}</p>${l ? `<div class="console-request-status__actions">${l}</div>` : ""}` : "";
  }
  async checkRequest(e, t = !0) {
    const s = e.current;
    if (!s || s.state === "pending" || s.state === "checking" || this.isClosed()) return;
    const r = this.bootstrap.urls.requests;
    if (!r) {
      s.state = "expired", s.message = "This console cannot confirm earlier requests.", this.ledger.put(e, s, !0), this.renderRequestState(e);
      return;
    }
    const n = s.state;
    s.state = "checking", this.renderRequestState(e);
    const i = new AbortController();
    this.controllers.add(i);
    const o = await O($t(r, e, s), {
      method: "GET",
      headers: this.requestHeaders(),
      signal: i.signal,
      timeoutMs: this.options.requestTimeoutMs,
      fallbackError: "Unable to check this request."
    });
    if (this.controllers.delete(i), this.isClosed() || e.current !== s) return;
    if (!o.ok) {
      this.applyFailedCheck(e, s, n, o.status, o.error);
      return;
    }
    const a = d(o.value?.status).toLowerCase();
    if (a === "claimed") {
      s.state = "resolved", this.ledger.remove(s.id), this.renderRequestState(e);
      const c = m(o.value.result) ? o.value.result : { message: d(o.value.message) || "The request was received." };
      this.applyActionResult(null, e.panelID, e.actionID, c, s, t);
      return;
    }
    const l = a === "unclaimed" || a === "unknown";
    if (s.state = l ? a : "expired", s.message = d(o.value.message) || void 0, !this.actionDeclaration(e.panelID, e.actionID)) {
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
  applyFailedCheck(e, t, s, r, n) {
    if (r === 401) {
      this.deny(n);
      return;
    }
    const i = r === 403 || r === 404;
    i ? (t.state = "expired", t.message = "This request’s status cannot be checked.", this.ledger.put(e, t, !0)) : (t.state = s === "unclaimed" || s === "unknown" ? s : "uncertain", t.message = n.message), this.renderRequestState(e, i ? "" : "The status check failed. Try again.");
  }
  async resubmitRequest(e) {
    const t = e.current;
    if (!(!t || t.partial || t.state !== "uncertain" && t.state !== "unclaimed")) {
      if (!this.executableAction(e.panelID, e.actionID)) {
        this.renderRequestState(e, k);
        return;
      }
      this.clientOutdated || this.inFlight.has(f(e.panelID, e.actionID)) || await this.sendRequest(e, t, this.mountedForm(e.panelID, e.actionID, null));
    }
  }
  beginNewRequest(e) {
    const t = e.current;
    if (!at(e, this.generate)) {
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
      const s = ut(e, this.generate);
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
      const { panelId: s, actionId: r } = this.actionTarget(t), n = f(s, r), i = t.querySelector("[data-action-field-generated]") ? this.draftFor(s, r) : null, o = this.workingValues.get(n);
      i?.current && B(i.current) && !i.current.partial ? xe(t, i.current.payload) : o && this.applyWorkingValues(t, o), i && this.renderFormRequest(t, i), t.querySelectorAll("select[data-option-paginated]").forEach((a) => {
        this.loadOptions(t, a, !1);
      });
    }), this.syncBusy();
  }
  captureWorkingValues(e) {
    e.querySelectorAll("form[data-panel-action-form]").forEach((t) => {
      if (t.closest(y) !== this.root) return;
      const { panelId: s, actionId: r } = this.actionTarget(t), n = {};
      t.querySelectorAll("[data-action-field]").forEach((i) => {
        const o = d(i.dataset.actionField);
        !o || i.hasAttribute("data-action-field-generated") || i.dataset.actionFieldSensitive === "true" || (i instanceof HTMLInputElement && i.type === "checkbox" ? n[o] = i.checked : (i instanceof HTMLInputElement || i instanceof HTMLSelectElement || i instanceof HTMLTextAreaElement) && (n[o] = i.value));
      }), this.workingValues.set(f(s, r), n);
    });
  }
  applyWorkingValues(e, t) {
    e.querySelectorAll("[data-action-field]").forEach((s) => {
      const r = d(s.dataset.actionField);
      if (!r || !(r in t) || s.hasAttribute("data-action-field-generated")) return;
      const n = t[r];
      s instanceof HTMLInputElement && s.type === "checkbox" ? s.checked = n === !0 : s instanceof HTMLSelectElement && s.hasAttribute("data-option-paginated") ? s.dataset.pendingValue = String(n) : (s instanceof HTMLInputElement || s instanceof HTMLSelectElement || s instanceof HTMLTextAreaElement) && (s.value = String(n));
    });
  }
  syncBusy() {
    this.mountedForms().forEach((e) => {
      const { panelId: t, actionId: s } = this.actionTarget(e), r = this.inFlight.get(f(t, s));
      if (r === void 0) {
        e.dataset.busy === "true" && z(e);
        return;
      }
      if (e.dataset.busy === "true") return;
      const n = Array.from(e.querySelectorAll('button[type="submit"]')), i = e.querySelector(`button[data-submitter="${r}"]`) || n[n.length - 1] || null;
      Y(e, {
        controls: n,
        includeDescendantControls: !1,
        submitter: i,
        indicator: "submitter",
        label: "Working…",
        generateSpinner: !0
      });
    }), this.regions.panel.querySelectorAll("button[data-panel-action]").forEach((e) => {
      if (e.closest(y) !== this.root) return;
      const { panelId: t, actionId: s } = this.actionTarget(e), r = this.inFlight.has(f(t, s));
      r && e.dataset.busy !== "true" ? Y(e, {
        label: "Working…",
        generateSpinner: !0
      }) : !r && e.dataset.busy === "true" && z(e);
    });
  }
  drawerFor(e, t) {
    const s = this.drawer;
    return s && s.isOpen() && s.panelID === e && s.actionID === t ? s : null;
  }
  openDrawer(e, t, s, r) {
    this.closeDrawer(!1);
    const n = $e(e, t, s, this.styles, this.renderOptions(), "drawer"), i = new ft({
      root: this.root,
      id: `${this.idScope}-drawer-${ee(`${e}/${t}`)}`,
      panelID: e,
      actionID: t,
      title: d(s.drawer?.title) || d(s.label) || t,
      eyebrow: d(s.drawer?.eyebrow) || void 0,
      body: n,
      invoker: r,
      fallbackFocus: () => this.focusFallback(e, t),
      onClose: () => {
        this.drawer === i && (this.drawer = null), this.releaseDraftAfterClose(e, t);
      }
    });
    this.drawer = i, this.mountForms(i.element), i.focusInitial();
  }
  closeDrawerFor(e, t) {
    this.drawerFor(e, t) && this.closeDrawer(!0);
  }
  closeDrawer(e) {
    const t = this.drawer;
    this.drawer = null, t?.close(e);
  }
  releaseDraftAfterClose(e, t) {
    const s = f(e, t), r = this.drafts.get(s);
    r && !B(r.current) && !this.inFlight.has(s) && !this.mountedForms(e, t).length && this.drafts.delete(s), this.workingValues.delete(s);
  }
  focusFallback(e, t) {
    return Array.from(this.regions.panel.querySelectorAll("[data-console-action-ref], [data-panel-action]")).find((s) => s.closest(y) === this.root && h(s.dataset.panelId) === e && h(s.dataset.actionId) === t && !s.closest("[hidden]")) || this.regions.panel;
  }
  syncDrawerAvailability() {
    const e = this.drawer;
    if (!e?.isOpen()) return;
    const t = e.element.querySelector("form[data-panel-action-form]"), s = !!this.executableAction(e.panelID, e.actionID);
    e.element.querySelectorAll("button[data-submitter]").forEach((r) => {
      s ? r.dataset.withdrawn === "true" && (delete r.dataset.withdrawn, this.inFlight.has(f(e.panelID, e.actionID)) || (r.disabled = !1)) : (r.disabled = !0, r.dataset.withdrawn = "true");
    }), t && !s && !t.querySelector("[data-form-message]") && this.setFormMessage(t, k, "warning");
  }
  async loadOptions(e, t, s) {
    const { panelId: r, actionId: n } = this.actionTarget(e), i = this.bootstrap.urls.options, o = d(t.dataset.actionField), a = t.closest("[data-field-name]") || e, l = a.querySelector("[data-option-more]");
    if (!i || !o || this.isClosed()) {
      t.innerHTML = '<option value="">Options are unavailable</option>';
      return;
    }
    const c = String(Number(t.dataset.optionSequence || "0") + 1);
    t.dataset.optionSequence = c;
    const u = t.dataset.pendingValue ?? (s ? "" : t.value), _ = It(V(i, {
      panel_id: r,
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
    const v = await O(_, {
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
    const N = Ot(t, m(v.value) ? v.value : {}, s, u);
    l && (l.hidden = !N);
  }
  notificationOf(e, t) {
    const s = this.serverDefinitions.get(e)?.ui?.views?.console, r = d(s?.options?.notify_bind);
    if (!r) return null;
    const n = Fe(t, r);
    if (!m(n)) return null;
    const i = d(n.id), o = d(n.message);
    return !i || !o || i.length > 200 || o.length > 300 ? null : {
      id: `${e}\0${i}`,
      message: o,
      tone: D(n.tone) || "info"
    };
  }
  remember(e) {
    if (this.notified.has(e)) return !1;
    if (this.notified.add(e), this.notified.size > kt) {
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
    const s = e === "error" || e === "warning" || e === "success" ? e : "info", r = this.root.ownerDocument.defaultView;
    if (typeof r?.toastManager?.show == "function") {
      r.toastManager.show({
        message: t,
        type: s,
        dismissible: !0,
        duration: s === "error" ? 0 : void 0
      });
      return;
    }
    const n = r?.notify?.[s];
    if (typeof n == "function") {
      n(t);
      return;
    }
    let i = Array.from(this.root.querySelectorAll("[data-console-toasts]")).find((a) => a.closest(y) === this.root);
    i || (i = this.root.ownerDocument.createElement("div"), i.className = "console-toasts", i.setAttribute("data-console-toasts", ""), i.setAttribute("role", "status"), i.setAttribute("aria-live", "polite"), this.root.appendChild(i));
    const o = this.root.ownerDocument.createElement("p");
    for (o.className = "console-toast", o.dataset.tone = s, o.textContent = t, i.appendChild(o); i.children.length > 3; ) i.firstElementChild?.remove();
    setTimeout(() => o.remove(), 8e3);
  }
  ensureRegions() {
    const e = (o) => Array.from(this.root.querySelectorAll(o)).find((a) => a.closest(y) === this.root) || null, t = (o, a, l) => {
      const c = this.root.ownerDocument.createElement(o);
      return c.setAttribute(a, ""), c.className = l, this.root.appendChild(c), c;
    }, s = e("[data-console-notice]") || t("div", "data-console-notice", "console-notice"), r = e("[data-console-tabs]") || t("nav", "data-console-tabs", "console-tabs"), n = e("[data-console-filters]") || t("div", "data-console-filters", "console-filters"), i = e("[data-console-panel]") || t("section", "data-console-panel", "console-panel");
    return r.setAttribute("role", "tablist"), r.hasAttribute("aria-label") || r.setAttribute("aria-label", this.bootstrap.title || "Console panels"), i.id = i.id || `${this.idScope}-panel`, i.setAttribute("role", "tabpanel"), i.tabIndex = 0, {
      tabs: r,
      filters: n,
      panel: i,
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
    const e = this.root.id, t = this.root.ownerDocument, s = e ? Array.from(t.querySelectorAll(pt)).filter((r) => r.getAttribute("data-console-for") === e && !r.closest(y)) : [];
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
      const i = n.target?.closest("[data-console-tab]");
      i && e.contains(i) && this.selectPanel(i.dataset.consoleTab || "", !0);
    }), this.listen(e, "keydown", (n) => this.handleTabKeydown(n)), this.listen(s, "input", () => this.updateFilters()), this.listen(s, "change", () => this.updateFilters()), this.listen(t, "click", (n) => {
      const i = n.target?.closest("[data-panel-action]");
      !i || !t.contains(i) || i.disabled || i.closest(y) !== this.root || (n.preventDefault(), this.runButtonAction(i));
    }), this.listen(this.root, "submit", (n) => {
      const i = n.target?.closest("form[data-panel-action-form]");
      if (!i || !this.ownsControl(i)) return;
      n.preventDefault();
      const o = n.submitter;
      o instanceof HTMLButtonElement && o.disabled || this.submitForm(i, o instanceof HTMLElement ? o : null);
    }), this.listen(t, "change", (n) => {
      const i = n.target?.closest("[data-panel-action-picker]");
      i && t.contains(i) && this.updateActionPicker(i);
    }), this.listen(this.root, "input", (n) => {
      const i = n.target?.closest("input[data-option-search]");
      if (!i || !this.ownsControl(i)) return;
      const o = i.closest("form[data-panel-action-form]"), a = i.closest("[data-field-name]")?.querySelector("select[data-option-paginated]");
      if (!o || !a) return;
      const l = Number(i.dataset.searchTimer || "0");
      l && clearTimeout(l);
      const c = setTimeout(() => {
        this.loadOptions(o, a, !1);
      }, Rt);
      i.dataset.searchTimer = String(c);
    }), this.listen(this.root, "click", (n) => {
      const i = n.target?.closest("[data-console-action]");
      if (!i || i.closest(y) !== this.root) return;
      const o = i.dataset.consoleAction;
      o === "retry" || o === "refresh" ? (n.preventDefault(), this.refresh()) : o === "reload" && (n.preventDefault(), this.root.ownerDocument.defaultView?.location.reload());
    }), this.listen(this.root, "click", (n) => this.handleControlClick(n));
    const r = this.regions.pageControls ? this.regions.refresh : null;
    r && this.listen(r, "click", (n) => {
      n.preventDefault(), r.disabled || this.refresh();
    }), this.setRefreshEnabled(!0);
  }
  handleControlClick(e) {
    const t = e.target, s = t?.closest(ae) || t?.closest(Tt);
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
      const i = e.closest("[data-field-name]")?.querySelector("select[data-option-paginated]");
      t instanceof HTMLFormElement && i && this.loadOptions(t, i, !0);
      return;
    }
    if (e.matches("[data-copy-request-id]")) {
      const i = t.querySelector("input[data-action-field-generated]")?.value || "";
      F(i) && this.copyText(i, e);
      return;
    }
    const { panelId: s, actionId: r } = this.actionTarget(t), n = this.drafts.get(f(s, r));
    n && (e.matches("[data-request-check]") ? this.checkRequest(n) : e.matches("[data-request-resubmit]") ? this.resubmitRequest(n) : this.beginNewRequest(n));
  }
  async copyText(e, t) {
    const s = this.root.ownerDocument;
    let r = !1;
    try {
      const i = s.defaultView?.navigator?.clipboard;
      i && typeof i.writeText == "function" && (await i.writeText(e), r = !0);
    } catch {
      r = !1;
    }
    if (!r) {
      const i = s.createElement("textarea");
      i.value = e, i.setAttribute("readonly", ""), i.style.position = "fixed", i.style.opacity = "0", s.body.appendChild(i), i.select();
      try {
        r = typeof s.execCommand == "function" && s.execCommand("copy");
      } catch {
        r = !1;
      }
      i.remove(), t.focus();
    }
    if (!t.isConnected) return;
    const n = t.dataset.copyLabel ?? t.textContent ?? "";
    t.dataset.copyLabel = n, t.dataset.copied = r ? "true" : "false", t.textContent = r ? "Copied" : "Copy failed", setTimeout(() => {
      t.isConnected && (t.textContent = t.dataset.copyLabel ?? n, delete t.dataset.copied, delete t.dataset.copyLabel);
    }, 1500);
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
    const s = this.filterStateFor(e, t), r = m(s) ? { ...s } : {};
    this.regions.filters.querySelectorAll("[data-filter]").forEach((n) => {
      const i = n.dataset.filter || "";
      i && (r[i] = n instanceof HTMLInputElement && n.type === "checkbox" ? n.checked : n.value);
    }), this.filterState.set(e, r), this.renderPanel(!1);
  }
  filterStateFor(e, t) {
    if (!this.filterState.has(e)) {
      const s = t.defaultFilters;
      this.filterState.set(e, m(s) ? { ...s } : s ?? {});
    }
    return this.filterState.get(e);
  }
  markPanelDirty(e) {
    this.dirtyPanels.add(e), !this.cancelFrame && (this.cancelFrame = Ut(() => {
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
      return typeof r == "number" && Number.isFinite(r) ? r : St;
    };
    return e.map((s, r) => ({
      id: s,
      index: r,
      order: t(s)
    })).sort((s, r) => s.order - r.order || s.index - r.index).map((s) => s.id);
  }
  tabButton(e) {
    return this.regions.tabs.querySelector(`[data-console-tab="${j(e)}"]`);
  }
  renderTabs() {
    const e = this.visiblePanels(), t = this.root.ownerDocument.activeElement, s = t instanceof HTMLElement && this.regions.tabs.contains(t) && t.dataset.consoleTab || "";
    this.regions.tabs.hidden = e.length === 0 || !!this.options.display, this.regions.tabs.innerHTML = e.map((r) => {
      const n = this.registry.get(r), i = r === this.activePanel, o = this.panelCount(r, n), a = this.panelCountTone(r, n), l = n?.hideCount ? n.hideCount(o) : !1;
      return `<button type="button" class="console-tab${i ? " console-tab--active" : ""}" role="tab" id="${p(`${this.idScope}-tab-${r}`)}" aria-selected="${i ? "true" : "false"}" aria-controls="${p(this.regions.panel.id)}" tabindex="${i ? "0" : "-1"}" data-console-tab="${p(r)}"><span class="console-tab__label">${g(n?.label || r)}</span><span class="console-tab__count" data-console-tab-count="${p(r)}"${a ? ` data-tone="${a}"` : ""}${l ? " hidden" : ""}>${g(X(o))}</span></button>`;
    }).join(""), this.activePanel ? this.regions.panel.setAttribute("aria-labelledby", `${this.idScope}-tab-${this.activePanel}`) : this.regions.panel.removeAttribute("aria-labelledby"), s && this.tabButton(e.includes(s) ? s : this.activePanel)?.focus();
  }
  updateCounts() {
    this.visiblePanels().forEach((e) => {
      const t = this.regions.tabs.querySelector(`[data-console-tab-count="${j(e)}"]`);
      if (!t) return;
      const s = this.registry.get(e), r = this.panelCount(e, s), n = this.panelCountTone(e, s);
      t.textContent = X(r), t.hidden = s?.hideCount ? s.hideCount(r) : !1, n ? t.dataset.tone = n : delete t.dataset.tone;
    });
  }
  panelCount(e, t) {
    const s = this.panelData(e);
    return t?.getCount ? t.getCount(s) : Pe(s);
  }
  panelCountTone(e, t) {
    return t?.getCountTone ? D(t.getCountTone(this.panelData(e))) : "";
  }
  panelData(e) {
    const t = this.store.records(e), s = this.serverDefinitions.get(e), r = s?.ui?.views?.console || s?.ui?.views?.toolbar, n = h(r?.renderer);
    return t.length === 1 && !gt.has(n) ? t[0].data : t.map((i) => i.data);
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
    let n = this.panelData(s);
    r.applyFilters && (n = r.applyFilters(n, this.filterStateFor(s, r)));
    const i = this.renderOptions();
    if (this.options.display && r.renderBody) {
      t.innerHTML = r.renderBody(n, this.styles, i), t.dataset.consolePanelId = s;
      return;
    }
    if (r.renderActions && r.renderBody) {
      const o = t.querySelector(":scope > [data-console-panel-body]");
      if (!e && o && this.panelMounted(s)) {
        o.innerHTML = r.renderBody(n, this.styles, i), this.applyHighlight();
        return;
      }
      this.captureWorkingValues(t);
      const a = r.renderActions(this.styles, i);
      t.innerHTML = `<div class="console-panel__result" data-panel-action-result="${p(s)}"></div>${a.trim() ? `<div class="console-panel__actions" data-console-panel-actions>${a}</div>` : '<div class="console-panel__actions" data-console-panel-actions hidden></div>'}<div class="console-panel__body" data-console-panel-body>${r.renderBody(n, this.styles, i)}</div>`;
    } else
      this.captureWorkingValues(t), t.innerHTML = (r.renderConsole || r.render)(n, this.styles, i);
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
    const { kind: e, message: t, action: s } = this.notice, r = this.regions.notice;
    if (r.dataset.consoleNotice = e, e === "none" || !t || this.options.display && e === "loading") {
      r.hidden = !0, r.innerHTML = "", r.removeAttribute("role");
      return;
    }
    r.hidden = !1, r.setAttribute("role", e === "error" || e === "denied" ? "alert" : "status");
    const n = s === "none" ? "" : ` <button type="button" class="console-btn" data-console-action="${s}">${s === "reload" ? "Reload" : "Retry"}</button>`;
    r.innerHTML = `<span class="console-notice__message">${g(t)}</span>${n}`;
  }
};
function we(e, t = {}) {
  const s = R.get(e);
  if (s) return s;
  const r = !!t.display || e.hasAttribute("data-console-display"), n = t.bootstrap ? ve(t.bootstrap) : r ? Pt(e) : Ft(e);
  if (!n)
    return e.dataset.consoleState = "error", null;
  const i = new Wt(e, n, r ? {
    ...t,
    display: !0,
    live: !1
  } : t);
  return R.set(e, i), i;
}
function ws(e) {
  return R.get(e) || null;
}
function jt(e) {
  R.get(e)?.destroy();
}
function Vt(e = document, t = {}) {
  return Array.from(e.querySelectorAll(`${y}:not([data-console-manual])`)).map((s) => we(s, t)).filter((s) => s !== null);
}
var Ss = "1", de = "[data-console-root]:not([data-console-manual])";
function ue(e) {
  if (!(e instanceof HTMLElement)) return [];
  const t = Array.from(e.querySelectorAll(de));
  return e.matches(de) ? [e, ...t] : t;
}
function Kt() {
  typeof MutationObserver > "u" || !document.body || new MutationObserver((e) => {
    e.forEach((t) => {
      t.removedNodes.forEach((s) => {
        ue(s).forEach((r) => {
          r.isConnected || jt(r);
        });
      }), t.addedNodes.forEach((s) => {
        ue(s).forEach((r) => {
          r.isConnected && we(r);
        });
      });
    });
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  });
}
var he = () => {
  Vt(document), Kt();
};
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", he, { once: !0 }) : he());
export {
  Oe as ConsoleLiveStream,
  Je as ConsolePreferences,
  Ve as ConsoleRecordStore,
  Wt as ConsoleRuntime,
  Ss as PANEL_UI_SCHEMA_VERSION,
  rs as PanelRegistry,
  vs as applyPanelActionNavigation,
  xe as applyPanelActionPayload,
  M as buildPanelActionPayload,
  Ke as consoleIdentityNamespace,
  Ce as consoleStyleConfig,
  Le as createPanelRegistry,
  Pe as defaultGetCount,
  ss as defaultHandleEvent,
  jt as disposeConsole,
  p as escapeAttribute,
  g as escapeHTML,
  fs as fetchServerPanelDefinitions,
  ws as getMountedConsole,
  ns as getPanelCount,
  Zt as getPanelData,
  ts as getSnapshotKey,
  ps as isSchemaListRenderer,
  we as mountConsole,
  Vt as mountConsoles,
  P as normalizeConsoleIdentity,
  is as normalizeEventTypes,
  bs as panelActionHasSensitiveFields,
  Ne as panelDefinitionFromServer,
  Ft as readConsoleBootstrap,
  Pt as readConsoleWidgetBootstrap,
  hs as registerServerPanelDefinitions,
  cs as renderJSONPanel,
  ys as renderJSONViewer,
  es as renderPanelContent,
  ms as renderSchemaListRow,
  ds as renderSchemaPanelView,
  as as resolveLiveURL,
  te as sameConsoleIdentity,
  us as schemaRowKey
};

//# sourceMappingURL=index.js.map
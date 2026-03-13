const pe = "@goliatone/sync-core", he = "0.0.0-phase5";
function R(e) {
  return e == null ? e : typeof structuredClone == "function" ? structuredClone(e) : I(e);
}
function I(e) {
  if (Array.isArray(e))
    return e.map((t) => I(t));
  if (e instanceof Date)
    return new Date(e.getTime());
  if (N(e)) {
    const t = {};
    for (const [i, a] of Object.entries(e))
      t[i] = I(a);
    return t;
  }
  return e;
}
function N(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
const k = /* @__PURE__ */ new Set([
  "RATE_LIMITED",
  "TEMPORARY_FAILURE",
  "TRANSPORT_UNAVAILABLE"
]), A = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2e3,
  jitterRatio: 0.2
};
function U(e) {
  const t = e.cache ?? P(), i = z(e.retry), a = e.random ?? Math.random, o = e.wait ?? X, r = /* @__PURE__ */ new Map();
  return {
    resource(n) {
      const s = l(n);
      return {
        getSnapshot() {
          return p(s.state.snapshot);
        },
        getState() {
          return b(s.state);
        },
        subscribe(u) {
          return s.listeners.add(u), u(b(s.state)), () => {
            s.listeners.delete(u);
          };
        },
        async load() {
          return s.state.snapshot && !s.state.invalidated ? g(s.state.snapshot) : c(s, "load", !1);
        },
        async mutate(u) {
          return f(s, u);
        },
        invalidate(u) {
          d(s, u);
        },
        async refresh(u) {
          return c(s, "refresh", u?.force ?? !1);
        }
      };
    },
    getState(n) {
      const s = r.get(E(n));
      return s ? b(s.state) : null;
    },
    invalidate(n, s) {
      d(l(n), s);
    }
  };
  function l(n) {
    const s = E(n), u = r.get(s);
    if (u)
      return u;
    const h = t.get(n), w = {
      ref: y(n),
      key: s,
      state: {
        ref: y(n),
        status: h?.snapshot ? "ready" : "idle",
        snapshot: p(h?.snapshot ?? null),
        invalidated: h?.invalidated ?? !1,
        invalidationReason: h?.invalidationReason,
        queueDepth: 0,
        error: null,
        conflict: null
      },
      listeners: /* @__PURE__ */ new Set(),
      inFlightLoad: null,
      loadRequestID: 0,
      queue: [],
      processingQueue: !1
    };
    return r.set(s, w), w;
  }
  function d(n, s) {
    const u = t.invalidate(n.ref, s);
    n.state = {
      ...n.state,
      invalidated: u.invalidated,
      invalidationReason: u.invalidationReason
    }, v(n);
  }
  async function c(n, s, u) {
    if (n.inFlightLoad && !u)
      return n.inFlightLoad;
    const h = n.loadRequestID + 1;
    n.loadRequestID = h, n.state = {
      ...n.state,
      status: n.state.snapshot ? "refreshing" : "loading",
      error: null,
      conflict: null
    }, v(n);
    const w = e.transport.load(y(n.ref)).then((S) => {
      const m = g(S);
      return h !== n.loadRequestID ? n.inFlightLoad ? n.inFlightLoad : g(n.state.snapshot ?? m) : (t.set(n.ref, m), n.state = {
        ...n.state,
        status: "ready",
        snapshot: m,
        invalidated: !1,
        invalidationReason: void 0,
        error: null,
        conflict: null
      }, v(n), g(m));
    }).catch((S) => {
      const m = _(n.ref, S, n.state.snapshot);
      if (h !== n.loadRequestID) {
        if (n.inFlightLoad)
          return n.inFlightLoad;
        if (n.state.snapshot && !n.state.invalidated)
          return g(n.state.snapshot);
        throw m;
      }
      throw n.state = {
        ...n.state,
        status: m.conflict ? "conflict" : "error",
        error: m,
        conflict: m.conflict ?? null
      }, v(n), m;
    }).finally(() => {
      n.inFlightLoad === w && (n.inFlightLoad = null);
    });
    return n.inFlightLoad = w, w;
  }
  async function f(n, s) {
    const u = W();
    return n.queue.push({
      input: s,
      resolve: u.resolve,
      reject: u.reject
    }), n.state = {
      ...n.state,
      queueDepth: n.queue.length
    }, v(n), K(n, e.transport, t, i, a, o), u.promise;
  }
}
function ye(e) {
  return U(e).resource(e.ref);
}
function P() {
  const e = /* @__PURE__ */ new Map();
  return {
    get(t) {
      const i = e.get(E(t));
      return i ? {
        ref: y(i.ref),
        snapshot: p(i.snapshot),
        invalidated: i.invalidated,
        invalidationReason: i.invalidationReason
      } : null;
    },
    set(t, i) {
      const a = E(t), o = {
        ref: y(t),
        snapshot: p(i),
        invalidated: !1,
        invalidationReason: void 0
      };
      return e.set(a, o), {
        ref: y(o.ref),
        snapshot: p(o.snapshot),
        invalidated: o.invalidated,
        invalidationReason: o.invalidationReason
      };
    },
    invalidate(t, i) {
      const a = E(t), o = e.get(a), r = {
        ref: y(t),
        snapshot: p(o?.snapshot ?? null),
        invalidated: !0,
        invalidationReason: i
      };
      return e.set(a, r), {
        ref: y(r.ref),
        snapshot: p(r.snapshot),
        invalidated: r.invalidated,
        invalidationReason: r.invalidationReason
      };
    },
    clear(t) {
      e.delete(E(t));
    }
  };
}
function E(e) {
  return [
    encodeURIComponent(e.kind),
    encodeURIComponent(e.id),
    Q(e.scope)
  ].join("::");
}
function _(e, t, i) {
  if (B(t)) {
    const a = H(t, i);
    return {
      code: t.code,
      message: t.message,
      details: R(t.details),
      currentRevision: t.currentRevision,
      resource: p(t.resource ?? null) ?? void 0,
      retriable: !a && k.has(t.code),
      cause: t,
      conflict: a ?? void 0
    };
  }
  return {
    code: "TEMPORARY_FAILURE",
    message: t instanceof Error ? t.message : "sync operation failed",
    retriable: !0,
    cause: t
  };
}
function B(e) {
  return !!e && typeof e == "object" && typeof e.code == "string";
}
async function K(e, t, i, a, o, r) {
  if (!e.processingQueue) {
    e.processingQueue = !0;
    try {
      for (; e.queue.length > 0; ) {
        const l = e.queue[0];
        e.state = {
          ...e.state,
          status: "saving",
          error: null,
          conflict: null,
          queueDepth: e.queue.length
        }, v(e);
        try {
          const d = Y(e, l.input), c = await V(
            e,
            t,
            d,
            a,
            o,
            r
          ), f = g(c.snapshot);
          $(i, e, f), e.queue.shift(), e.state = {
            ...e.state,
            status: e.queue.length > 0 ? "saving" : "ready",
            snapshot: f,
            invalidated: !1,
            invalidationReason: void 0,
            queueDepth: e.queue.length,
            error: null,
            conflict: null
          }, v(e), l.resolve({
            snapshot: g(f),
            applied: c.applied,
            replay: c.replay
          });
          continue;
        } catch (d) {
          const c = _(e.ref, d, e.state.snapshot), f = c.conflict ? "conflict" : "error";
          e.state = {
            ...e.state,
            status: f,
            queueDepth: 0,
            error: c,
            conflict: c.conflict ?? null
          };
          const n = e.queue.splice(0);
          v(e);
          for (const s of n)
            s.reject(c);
        }
      }
    } finally {
      e.processingQueue = !1;
    }
  }
}
async function V(e, t, i, a, o, r) {
  let l = 0, d;
  for (; l < a.maxAttempts; )
    try {
      return await t.mutate(i);
    } catch (c) {
      const f = _(e.ref, c, e.state.snapshot);
      if (d = f, l += 1, !f.retriable || l >= a.maxAttempts)
        throw f;
      await r(G(l, a, o));
    }
  throw d ?? new Error("mutation queue exhausted retries");
}
function $(e, t, i) {
  const a = e.set(t.ref, i);
  t.state = {
    ...t.state,
    snapshot: p(a.snapshot),
    invalidated: !1,
    invalidationReason: void 0
  };
}
function z(e) {
  return {
    maxAttempts: e?.maxAttempts ?? A.maxAttempts,
    baseDelayMs: e?.baseDelayMs ?? A.baseDelayMs,
    maxDelayMs: e?.maxDelayMs ?? A.maxDelayMs,
    jitterRatio: e?.jitterRatio ?? A.jitterRatio
  };
}
function Y(e, t) {
  const i = "ref" in t && t.ref ? t.ref : e.ref;
  if (E(i) !== e.key)
    throw D("mutation request ref must match the bound sync resource");
  const a = t.expectedRevision ?? e.state.snapshot?.revision;
  if (a === void 0)
    throw D("resource must be loaded before mutate unless expectedRevision is provided");
  return {
    ref: y(e.ref),
    operation: t.operation,
    payload: R(t.payload),
    expectedRevision: a,
    idempotencyKey: t.idempotencyKey,
    metadata: t.metadata ? R(t.metadata) : void 0
  };
}
function G(e, t, i) {
  const a = Math.min(
    t.maxDelayMs,
    t.baseDelayMs * 2 ** Math.max(0, e - 1)
  );
  if (t.jitterRatio <= 0)
    return a;
  const o = a * t.jitterRatio, r = (i() * 2 - 1) * o;
  return Math.max(0, Math.round(a + r));
}
function H(e, t) {
  return e.code !== "STALE_REVISION" ? null : {
    code: "STALE_REVISION",
    message: e.message,
    currentRevision: e.currentRevision,
    latestSnapshot: p(e.resource ?? null),
    staleSnapshot: p(t)
  };
}
function v(e) {
  const t = b(e.state);
  for (const i of e.listeners)
    i(t);
}
function Q(e) {
  return e ? Object.keys(e).sort().map((t) => `${encodeURIComponent(t)}=${encodeURIComponent(e[t] ?? "")}`).join("&") : "";
}
function W() {
  let e, t;
  return { promise: new Promise((a, o) => {
    e = a, t = o;
  }), resolve: e, reject: t };
}
function b(e) {
  return {
    ref: y(e.ref),
    status: e.status,
    snapshot: p(e.snapshot),
    invalidated: e.invalidated,
    invalidationReason: e.invalidationReason,
    queueDepth: e.queueDepth,
    error: J(e.error),
    conflict: q(e.conflict)
  };
}
function J(e) {
  return e ? {
    code: e.code,
    message: e.message,
    details: O(e.details) ? { ...e.details } : e.details,
    currentRevision: e.currentRevision,
    resource: p(e.resource ?? null) ?? void 0,
    retriable: e.retriable,
    cause: e.cause,
    conflict: q(e.conflict ?? null) ?? void 0
  } : null;
}
function q(e) {
  return e ? {
    code: e.code,
    message: e.message,
    currentRevision: e.currentRevision,
    latestSnapshot: p(e.latestSnapshot),
    staleSnapshot: p(e.staleSnapshot)
  } : null;
}
function g(e) {
  return p(e);
}
function p(e) {
  return e ? {
    ref: y(e.ref),
    data: R(e.data),
    revision: e.revision,
    updatedAt: e.updatedAt,
    metadata: O(e.metadata) ? R(e.metadata) : e.metadata
  } : null;
}
function y(e) {
  return {
    kind: e.kind,
    id: e.id,
    scope: e.scope ? { ...e.scope } : void 0
  };
}
function O(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function X(e) {
  return new Promise((t) => {
    setTimeout(t, e);
  });
}
function D(e) {
  return {
    code: "INVALID_MUTATION",
    message: e
  };
}
function Z(e, t) {
  const i = T(t, "read envelope");
  return L(e, i);
}
function ee(e, t) {
  const i = T(t, "mutation envelope");
  if (typeof i.applied != "boolean")
    throw new TypeError("mutation envelope must include boolean applied");
  if (typeof i.replay != "boolean")
    throw new TypeError("mutation envelope must include boolean replay");
  return {
    snapshot: L(e, i),
    applied: i.applied,
    replay: i.replay
  };
}
function te(e, t) {
  const i = T(t, "error envelope"), a = T(i.error, "error envelope.error");
  if (typeof a.code != "string" || a.code.trim() === "")
    throw new TypeError("error envelope must include string code");
  if (typeof a.message != "string" || a.message.trim() === "")
    throw new TypeError("error envelope must include string message");
  const o = M(a.details) ? a.details : void 0, r = o?.resource, l = typeof o?.current_revision == "number" ? o.current_revision : void 0;
  return {
    code: a.code,
    message: a.message,
    details: R(o),
    currentRevision: l,
    resource: r ? L(e, r) : void 0
  };
}
function L(e, t) {
  if (typeof t.revision != "number" || Number.isNaN(t.revision))
    throw new TypeError("read envelope must include numeric revision");
  if (typeof t.updated_at != "string" || t.updated_at.trim() === "")
    throw new TypeError("read envelope must include string updated_at");
  return {
    ref: ne(e),
    data: R(t.data),
    revision: t.revision,
    updatedAt: t.updated_at,
    metadata: M(t.metadata) ? R(t.metadata) : void 0
  };
}
function ne(e) {
  return {
    kind: e.kind,
    id: e.id,
    scope: e.scope ? { ...e.scope } : void 0
  };
}
function T(e, t) {
  if (!M(e))
    throw new TypeError(`${t} must be an object`);
  return e;
}
function M(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function me(e = {}) {
  const t = ae(e.fetch);
  return {
    async load(a) {
      const o = await i(a, "GET", x(a, e.baseURL), void 0);
      return Z(a, o);
    },
    async mutate(a) {
      const o = re(a, e.actionOperations) ? "POST" : "PATCH", r = await i(
        a.ref,
        o,
        oe(a.ref, a.operation, o, e.baseURL),
        {
          operation: o === "PATCH" ? a.operation : void 0,
          payload: a.payload ?? null,
          expected_revision: a.expectedRevision,
          idempotency_key: a.idempotencyKey,
          metadata: a.metadata
        },
        a
      );
      return ee(a.ref, r);
    }
  };
  async function i(a, o, r, l, d) {
    const c = {
      requestKind: d ? "mutate" : "load",
      method: o,
      ref: C(a),
      input: d ? F(d) : void 0
    }, f = await ie(e.headers, c), n = {
      method: o,
      credentials: e.credentials,
      headers: f
    };
    l !== void 0 && (n.body = JSON.stringify(l), n.headers = {
      ...f,
      "Content-Type": "application/json"
    });
    let s;
    try {
      s = await t(r, n);
    } catch (h) {
      throw {
        code: "TRANSPORT_UNAVAILABLE",
        message: h instanceof Error ? h.message : "sync transport unavailable"
      };
    }
    const u = await se(s);
    if (s.ok)
      return u;
    if (u !== void 0)
      try {
        throw te(a, u);
      } catch (h) {
        if (ce(h))
          throw h;
      }
    throw {
      code: ue(s.status),
      message: `sync request failed with status ${s.status}`
    };
  }
}
function ae(e) {
  if (e)
    return e;
  if (typeof globalThis.fetch == "function")
    return globalThis.fetch.bind(globalThis);
  throw new TypeError("createFetchSyncTransport requires a fetch implementation");
}
async function ie(e, t) {
  return {
    Accept: "application/json",
    ...typeof e == "function" ? await e(t) : e ?? {}
  };
}
async function se(e) {
  const t = await e.text();
  if (t.trim())
    try {
      return JSON.parse(t);
    } catch {
      return;
    }
}
function x(e, t = "") {
  return j(t, "sync", "resources", e.kind, e.id);
}
function oe(e, t, i, a = "") {
  return i === "POST" ? j(a, "sync", "resources", e.kind, e.id, "actions", t) : x(e, a);
}
function j(e, ...t) {
  const i = e.replace(/\/+$/, ""), a = t.map((o) => encodeURIComponent(o.trim())).join("/");
  return i ? `${i}/${a}` : `/${a}`;
}
function re(e, t) {
  return typeof t == "function" ? t(F(e)) : Array.isArray(t) && t.length > 0 ? t.includes(e.operation) : typeof e.idempotencyKey == "string" && e.idempotencyKey.trim() !== "";
}
function ue(e) {
  return e === 400 ? "INVALID_MUTATION" : e === 404 ? "NOT_FOUND" : e === 409 ? "STALE_REVISION" : e === 429 ? "RATE_LIMITED" : (e >= 500, "TEMPORARY_FAILURE");
}
function C(e) {
  return {
    kind: e.kind,
    id: e.id,
    scope: e.scope ? { ...e.scope } : void 0
  };
}
function F(e) {
  return {
    ref: C(e.ref),
    operation: e.operation,
    payload: e.payload,
    expectedRevision: e.expectedRevision,
    idempotencyKey: e.idempotencyKey,
    metadata: e.metadata ? { ...e.metadata } : void 0
  };
}
function ce(e) {
  return !!e && typeof e == "object" && typeof e.code == "string" && typeof e.message == "string";
}
function ve(e, t = {}) {
  const i = t.focusTarget ?? le(), a = t.visibilityTarget ?? de(), o = {
    force: t.refreshOptions?.force ?? !0
  };
  let r = !1, l = null;
  const d = () => {
    !r || !fe(a) || c("window_focus").catch(() => {
    });
  };
  return {
    async start() {
      return !r && i && i.addEventListener("focus", d), r = !0, c("initial_load");
    },
    stop() {
      r && i && i.removeEventListener("focus", d), r = !1;
    },
    trigger(n) {
      return c(n);
    },
    refreshOnRouteReentry() {
      return c("route_reentry");
    },
    refreshOnFocus() {
      return c("window_focus");
    },
    refreshAfterConflictAcknowledgement() {
      return c("conflict_acknowledged");
    }
  };
  function c(n) {
    return l || (l = f(n).catch((s) => {
      throw t.onError?.(s, n), s;
    }).finally(() => {
      l = null;
    }), l);
  }
  async function f(n) {
    const s = e.getSnapshot() !== null;
    return n === "initial_load" && !s || !s ? e.load() : e.refresh(o);
  }
}
function le() {
  return globalThis.window ?? null;
}
function de() {
  return globalThis.document ?? null;
}
function fe(e) {
  return !e || typeof e.visibilityState != "string" ? !0 : e.visibilityState !== "hidden";
}
export {
  A as DEFAULT_RETRY_POLICY,
  pe as SYNC_CORE_PACKAGE_NAME,
  he as SYNC_CORE_PACKAGE_VERSION,
  me as createFetchSyncTransport,
  P as createInMemoryCache,
  ve as createRefreshPolicy,
  E as createResourceKey,
  U as createSyncEngine,
  ye as createSyncResource,
  B as isSyncEnvelopeError,
  _ as normalizeSyncError,
  te as parseErrorEnvelope,
  ee as parseMutationEnvelope,
  Z as parseReadEnvelope
};

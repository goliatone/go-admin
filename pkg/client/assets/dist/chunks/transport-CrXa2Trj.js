import { httpRequest as S, readExpectedHTTPJSON as P } from "../shared/transport/http-client.js";
import { _ as E, d as I, f as b, g as h, m as w, n as R, t as O, u as l, v as f } from "./transport-DVxB6IT1.js";
var m = {
  surfaces: 16,
  sessions: 4,
  labelBytes: 128,
  idBytes: 128,
  urlBytes: 4096,
  defaultLifetimeMinutes: 15,
  maxLifetimeMinutes: 30
}, x = [
  "ready",
  "unavailable",
  "expired",
  "closed"
], N = ["screen", "report"], j = [
  "not_supported",
  "runtime_unavailable",
  "no_readable_surfaces"
], C = /[\u0000-\u001f\u007f]/;
function y(e) {
  return typeof e != "string" || !e || e !== e.trim() || e.length > m.idBytes || C.test(e) ? "" : e;
}
function k(e) {
  const r = f(e);
  return !r || r.length > m.urlBytes || !r.startsWith("/") || r.startsWith("//") || /[\\\s]/.test(r) ? "" : r;
}
function L(e) {
  if (!l(e)) return null;
  const r = y(e.id), n = f(e.label), t = b(e.kind, N);
  return !r || !n || n.length > m.labelBytes || !t ? null : {
    id: r,
    label: n,
    kind: t
  };
}
function u(e) {
  return typeof e == "boolean" ? e : null;
}
function M(e) {
  if (e == null) return {
    durable: !1,
    isolation: !1,
    read_only: !1,
    retention: !1,
    cleanup: !1
  };
  if (!l(e)) return null;
  const r = {
    durable: u(e.durable),
    isolation: u(e.isolation),
    read_only: u(e.read_only),
    retention: u(e.retention),
    cleanup: u(e.cleanup)
  };
  return Object.values(r).every((n) => n !== null) ? r : null;
}
function W(e) {
  return e.durable && e.isolation && e.read_only && e.retention && e.cleanup;
}
function q(e) {
  if (!l(e)) return null;
  const r = u(e.supported), n = I(e.surfaces, m.surfaces, L), t = M(e.guarantees);
  return r === null || !n || !t || new Set(n.map((o) => o.id)).size !== n.length ? null : r ? n.length === 0 || !W(t) ? null : {
    supported: r,
    reason: "",
    surfaces: n,
    guarantees: t
  } : {
    supported: r,
    reason: f(e.reason) ? b(e.reason, j) || "unknown" : "not_supported",
    surfaces: [],
    guarantees: t
  };
}
function _(e, r, n, t = "") {
  if (!l(e)) return null;
  const o = w(e.selection), c = y(e.session_id), s = y(e.surface_id), i = b(e.state, x), a = f(e.expires_at);
  if (!o || h(o) !== h(r) || !c || t && c !== t || s !== n || !i || e.read_only !== !0 || !a || Number.isNaN(Date.parse(a))) return null;
  const T = i === "ready" ? k(e.launch_url) : "";
  return i === "ready" && !T ? null : {
    session_id: c,
    selection: o,
    surface_id: s,
    state: i,
    expires_at: a,
    launch_url: T,
    return_url: k(e.return_url),
    read_only: !0
  };
}
function B(e) {
  return {
    selection: E(e.selection),
    surface_id: e.surface_id,
    request_id: e.request_id
  };
}
var A = O;
function U(e, r = "") {
  const n = r.trim().toLowerCase();
  return e === 409 ? n === "busy" ? "busy" : n === "fingerprint_conflict" ? "conflict" : "stale" : e === 400 && n.includes("csrf") ? "expired" : R(e);
}
async function $(e) {
  try {
    const r = await e.json(), n = l(r) && l(r.error) ? r.error : {};
    return f(n.text_code).slice(0, 64);
  } catch {
    return "";
  }
}
async function d(e, r, n) {
  const t = new AbortController(), o = () => t.abort();
  r.signal.aborted ? o() : r.signal.addEventListener("abort", o, { once: !0 });
  const c = setTimeout(o, A);
  try {
    const s = await S(e, {
      method: r.method,
      credentials: "same-origin",
      signal: t.signal,
      ...r.json === void 0 ? {} : { json: r.json }
    });
    if (!s.ok) return {
      ok: !1,
      failure: {
        kind: U(s.status, await $(s)),
        status: s.status
      }
    };
    const i = n(await P(s));
    if (i === null) return {
      ok: !1,
      failure: {
        kind: "malformed",
        status: s.status
      }
    };
    const a = Date.parse(s.headers.get("date") || "");
    return Number.isFinite(a) ? {
      ok: !0,
      value: i,
      serverTime: a
    } : {
      ok: !0,
      value: i
    };
  } catch (s) {
    if (r.signal.aborted) return {
      ok: !1,
      failure: {
        kind: "canceled",
        status: 0
      }
    };
    if (t.signal.aborted) return {
      ok: !1,
      failure: {
        kind: "timeout",
        status: 0
      }
    };
    const i = s && typeof s == "object" ? s.name : "";
    return i === "HTTPAuthenticationRequiredError" ? {
      ok: !1,
      failure: {
        kind: "expired",
        status: 401
      }
    } : i === "HTTPResponseProtocolError" ? {
      ok: !1,
      failure: {
        kind: "malformed",
        status: s.status || 0
      }
    } : {
      ok: !1,
      failure: {
        kind: "network",
        status: 0
      }
    };
  } finally {
    clearTimeout(c), r.signal.removeEventListener("abort", o);
  }
}
function D(e, r) {
  const n = `selection=${encodeURIComponent(JSON.stringify(E(r)))}`;
  return `${e}${e.includes("?") ? "&" : "?"}${n}`;
}
function g(e, r) {
  return e.replace(/:session(?=$|[/?#])/, () => encodeURIComponent(r));
}
function F(e) {
  return {
    capabilities(r, n) {
      return d(D(e.capabilities, r), {
        method: "GET",
        signal: n
      }, q);
    },
    open(r, n) {
      return d(e.open, {
        method: "POST",
        json: B(r),
        signal: n
      }, (t) => _(t, r.selection, r.surface_id));
    },
    session(r, n) {
      return d(g(e.session, r.sessionId), {
        method: "GET",
        signal: n
      }, (t) => _(t, r.selection, r.surfaceId, r.sessionId));
    },
    close(r, n) {
      return d(g(e.close, r.sessionId), {
        method: "POST",
        json: {},
        signal: n
      }, (t) => _(t, r.selection, r.surfaceId, r.sessionId));
    }
  };
}
var p = () => Promise.resolve({
  ok: !1,
  failure: {
    kind: "unconfigured",
    status: 0
  }
}), V = {
  capabilities: () => p(),
  open: () => p(),
  session: () => p(),
  close: () => p()
};
export {
  V as a,
  B as c,
  y as d,
  k as f,
  g as i,
  q as l,
  U as n,
  m as o,
  W as p,
  F as r,
  x as s,
  A as t,
  _ as u
};

//# sourceMappingURL=transport-CrXa2Trj.js.map
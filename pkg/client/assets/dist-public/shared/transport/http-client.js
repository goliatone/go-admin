var l = class extends Error {
  constructor(e) {
    super("Authentication required. Please sign in and try again."), this.name = "HTTPAuthenticationRequiredError", this.loginURL = e;
  }
}, u = class extends Error {
  constructor(e, t, r) {
    super(e), this.name = "HTTPResponseProtocolError", this.status = t.status, this.contentType = r, this.responseURL = t.url;
  }
}, T = /* @__PURE__ */ new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
]);
function y() {
  return typeof document > "u" || !document?.querySelector ? "" : document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
}
function h(e) {
  const t = String(e || "GET").trim().toUpperCase() || "GET";
  return T.has(t);
}
function m(e) {
  return typeof e == "string" ? e : e instanceof URL ? e.toString() : typeof Request < "u" && e instanceof Request ? e.url : "";
}
function p(e, t) {
  return typeof t.method == "string" && t.method.trim() ? t.method : typeof Request < "u" && e instanceof Request ? e.method : "GET";
}
function g(e, t) {
  return t !== void 0 ? new Headers(t) : typeof Request < "u" && e instanceof Request ? new Headers(e.headers) : new Headers();
}
function R(e) {
  const t = m(e).trim();
  if (!t) return !1;
  if (typeof location > "u" || !location?.origin) return !/^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|[/\\]{2})/.test(t);
  try {
    const r = typeof location.href == "string" && location.href ? location.href : `${location.origin}/`;
    return new URL(t, r).origin === location.origin;
  } catch {
    return !1;
  }
}
function w(e, t, r) {
  if (!h(p(e, t)) || r.has("X-CSRF-Token") || !R(e)) return;
  const n = y();
  n && r.set("X-CSRF-Token", n);
}
async function S(e, t, r = {}) {
  const { json: n, idempotencyKey: o, accept: i, headers: c, ...a } = r, s = g(t, c);
  return i ? s.set("Accept", i) : s.has("Accept") || s.set("Accept", "application/json"), o && o.trim() && s.set("X-Idempotency-Key", o.trim()), n !== void 0 && (s.has("Content-Type") || s.set("Content-Type", "application/json"), a.body = JSON.stringify(n)), w(t, a, s), e(t, {
    ...a,
    headers: s
  });
}
async function P(e, t = {}) {
  return S(fetch.bind(globalThis), e, t);
}
function E(e) {
  if (!e || typeof e != "object") return "";
  if (typeof e.error == "string" && e.error.trim()) return e.error.trim();
  if (e.error && typeof e.error == "object") {
    const t = e.error.message;
    if (typeof t == "string" && t.trim()) return t.trim();
  }
  return typeof e.message == "string" && e.message.trim() ? e.message.trim() : "";
}
function H(e) {
  if (!e || typeof e != "object") return "";
  if (e.error && typeof e.error == "object") {
    const t = e.error.code;
    if (typeof t == "string" && t.trim()) return t.trim();
  }
  return typeof e.code == "string" && e.code.trim() ? e.code.trim() : "";
}
function j(e) {
  if (!e || typeof e != "object" || !e.error || typeof e.error != "object") return {};
  const t = e.error.details;
  return t && typeof t == "object" && !Array.isArray(t) ? t : {};
}
function f(e) {
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}
async function O(e) {
  const t = e.headers.get("content-type") ?? "";
  try {
    const r = (await e.text()).trim();
    if (!r) return {
      payload: null,
      rawText: "",
      contentType: t
    };
    if (t.includes("json")) {
      const n = f(r);
      if (n !== null) return {
        payload: n,
        rawText: r,
        contentType: t
      };
    }
    return {
      payload: r,
      rawText: r,
      contentType: t
    };
  } catch {
    return {
      payload: null,
      rawText: "",
      contentType: t
    };
  }
}
async function q(e, t) {
  try {
    const r = await e.json();
    return r === void 0 ? t : r;
  } catch {
    return t;
  }
}
async function x(e) {
  return await e.json();
}
async function v(e) {
  const t = (e.headers.get("content-type") || "").trim().toLowerCase(), r = String(e.url || "").trim();
  if (e.redirected && t.includes("text/html") && A(r)) throw new l(r);
  if (!b(t)) throw new u(`Expected a JSON response but received ${t || "an unspecified content type"}.`, e, t);
  try {
    return await e.json();
  } catch {
    throw new u("Expected a valid JSON response.", e, t);
  }
}
function b(e) {
  const t = e.split(";", 1)[0]?.trim() || "";
  return t === "application/json" || t.endsWith("+json");
}
function A(e) {
  if (!e) return !1;
  try {
    const t = typeof location < "u" && location?.origin ? location.origin : "http://localhost", r = new URL(e, t).pathname.toLowerCase().replace(/\/+$/g, "");
    return r === "/login" || r.endsWith("/login") || r.endsWith("/sign-in") || r.endsWith("/signin");
  } catch {
    return !1;
  }
}
async function L(e) {
  const t = await q(e, {});
  return !t || typeof t != "object" || Array.isArray(t) ? {} : t;
}
async function d(e, t = "Request failed", r = {}) {
  const n = r.appendStatusToFallback !== !1;
  try {
    const o = (await e.text()).trim();
    if (o) {
      const i = f(o);
      if (i && typeof i == "object") {
        const c = E(i);
        if (c) return {
          message: c,
          payload: i,
          rawText: o
        };
      }
      return {
        message: o,
        payload: i,
        rawText: o
      };
    }
  } catch {
  }
  return {
    message: n ? `${t}: ${e.status}` : t,
    payload: null,
    rawText: ""
  };
}
async function C(e, t = "Request failed", r = {}) {
  return (await d(e, t, r)).message;
}
async function J(e, t = "Request failed", r = {}) {
  const n = await d(e, t, r), o = n.payload && typeof n.payload == "object" ? n.payload : null;
  return {
    ...n,
    code: H(o),
    details: j(o)
  };
}
async function N(e, t = {}) {
  const r = await P(e, t);
  if (!r.ok) throw new Error(await C(r));
  return x(r);
}
export {
  l as HTTPAuthenticationRequiredError,
  u as HTTPResponseProtocolError,
  w as appendCSRFHeader,
  N as httpJSON,
  P as httpRequest,
  S as httpRequestWith,
  y as readCSRFToken,
  v as readExpectedHTTPJSON,
  C as readHTTPError,
  d as readHTTPErrorResult,
  x as readHTTPJSON,
  L as readHTTPJSONObject,
  q as readHTTPJSONValue,
  O as readHTTPResponsePayload,
  J as readHTTPStructuredErrorResult
};

//# sourceMappingURL=http-client.js.map
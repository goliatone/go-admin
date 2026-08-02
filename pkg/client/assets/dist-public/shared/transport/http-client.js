var T = class extends Error {
  constructor(t) {
    super("Authentication required. Please sign in and try again."), this.name = "HTTPAuthenticationRequiredError", this.loginURL = t;
  }
}, u = class extends Error {
  constructor(t, e, r) {
    super(t), this.name = "HTTPResponseProtocolError", this.status = e.status, this.contentType = r, this.responseURL = e.url;
  }
}, l = /* @__PURE__ */ new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
]);
function p() {
  return typeof document > "u" || !document?.querySelector ? "" : document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
}
function y(t) {
  const e = String(t || "GET").trim().toUpperCase() || "GET";
  return l.has(e);
}
function m(t) {
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t)) return !0;
  if (typeof location > "u" || !location?.origin) return !1;
  try {
    return new URL(t, location.origin).origin === location.origin;
  } catch {
    return !1;
  }
}
function h(t, e, r) {
  if (!y(e.method) || r.has("X-CSRF-Token") || !m(t)) return;
  const n = p();
  n && r.set("X-CSRF-Token", n);
}
async function g(t, e = {}) {
  const { json: r, idempotencyKey: n, accept: o, headers: s, ...c } = e, i = new Headers(s || {});
  o ? i.set("Accept", o) : i.has("Accept") || i.set("Accept", "application/json"), n && n.trim() && i.set("X-Idempotency-Key", n.trim());
  let a = c.body;
  return r !== void 0 && (i.has("Content-Type") || i.set("Content-Type", "application/json"), a = JSON.stringify(r)), h(t, c, i), fetch(t, {
    ...c,
    headers: i,
    body: a
  });
}
function w(t) {
  if (!t || typeof t != "object") return "";
  if (typeof t.error == "string" && t.error.trim()) return t.error.trim();
  if (t.error && typeof t.error == "object") {
    const e = t.error.message;
    if (typeof e == "string" && e.trim()) return e.trim();
  }
  return typeof t.message == "string" && t.message.trim() ? t.message.trim() : "";
}
function P(t) {
  if (!t || typeof t != "object") return "";
  if (t.error && typeof t.error == "object") {
    const e = t.error.code;
    if (typeof e == "string" && e.trim()) return e.trim();
  }
  return typeof t.code == "string" && t.code.trim() ? t.code.trim() : "";
}
function S(t) {
  if (!t || typeof t != "object" || !t.error || typeof t.error != "object") return {};
  const e = t.error.details;
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function f(t) {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
async function b(t) {
  const e = t.headers.get("content-type") ?? "";
  try {
    const r = (await t.text()).trim();
    if (!r) return {
      payload: null,
      rawText: "",
      contentType: e
    };
    if (e.includes("json")) {
      const n = f(r);
      if (n !== null) return {
        payload: n,
        rawText: r,
        contentType: e
      };
    }
    return {
      payload: r,
      rawText: r,
      contentType: e
    };
  } catch {
    return {
      payload: null,
      rawText: "",
      contentType: e
    };
  }
}
async function E(t, e) {
  try {
    const r = await t.json();
    return r === void 0 ? e : r;
  } catch {
    return e;
  }
}
async function R(t) {
  return await t.json();
}
async function A(t) {
  const e = (t.headers.get("content-type") || "").trim().toLowerCase(), r = String(t.url || "").trim();
  if (t.redirected && e.includes("text/html") && x(r)) throw new T(r);
  if (!j(e)) throw new u(`Expected a JSON response but received ${e || "an unspecified content type"}.`, t, e);
  try {
    return await t.json();
  } catch {
    throw new u("Expected a valid JSON response.", t, e);
  }
}
function j(t) {
  const e = t.split(";", 1)[0]?.trim() || "";
  return e === "application/json" || e.endsWith("+json");
}
function x(t) {
  if (!t) return !1;
  try {
    const e = typeof location < "u" && location?.origin ? location.origin : "http://localhost", r = new URL(t, e).pathname.toLowerCase().replace(/\/+$/g, "");
    return r === "/login" || r.endsWith("/login") || r.endsWith("/sign-in") || r.endsWith("/signin");
  } catch {
    return !1;
  }
}
async function C(t) {
  const e = await E(t, {});
  return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
}
async function d(t, e = "Request failed", r = {}) {
  const n = r.appendStatusToFallback !== !1;
  try {
    const o = (await t.text()).trim();
    if (o) {
      const s = f(o);
      if (s && typeof s == "object") {
        const c = w(s);
        if (c) return {
          message: c,
          payload: s,
          rawText: o
        };
      }
      return {
        message: o,
        payload: s,
        rawText: o
      };
    }
  } catch {
  }
  return {
    message: n ? `${e}: ${t.status}` : e,
    payload: null,
    rawText: ""
  };
}
async function H(t, e = "Request failed", r = {}) {
  return (await d(t, e, r)).message;
}
async function O(t, e = "Request failed", r = {}) {
  const n = await d(t, e, r), o = n.payload && typeof n.payload == "object" ? n.payload : null;
  return {
    ...n,
    code: P(o),
    details: S(o)
  };
}
async function q(t, e = {}) {
  const r = await g(t, e);
  if (!r.ok) throw new Error(await H(r));
  return R(r);
}
export {
  T as HTTPAuthenticationRequiredError,
  u as HTTPResponseProtocolError,
  h as appendCSRFHeader,
  q as httpJSON,
  g as httpRequest,
  p as readCSRFToken,
  A as readExpectedHTTPJSON,
  H as readHTTPError,
  d as readHTTPErrorResult,
  R as readHTTPJSON,
  C as readHTTPJSONObject,
  E as readHTTPJSONValue,
  b as readHTTPResponsePayload,
  O as readHTTPStructuredErrorResult
};

//# sourceMappingURL=http-client.js.map
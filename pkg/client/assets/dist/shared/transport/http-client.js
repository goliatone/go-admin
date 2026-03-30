const d = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
function T() {
  return typeof document > "u" || !document?.querySelector ? "" : document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
}
function y(t) {
  const e = String(t || "GET").trim().toUpperCase() || "GET";
  return d.has(e);
}
function m(t) {
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t))
    return !0;
  if (typeof location > "u" || !location?.origin)
    return !1;
  try {
    return new URL(t, location.origin).origin === location.origin;
  } catch {
    return !1;
  }
}
function l(t, e, r) {
  if (!y(e.method) || r.has("X-CSRF-Token") || !m(t))
    return;
  const n = T();
  n && r.set("X-CSRF-Token", n);
}
async function p(t, e = {}) {
  const {
    json: r,
    idempotencyKey: n,
    accept: i,
    headers: c,
    ...s
  } = e, o = new Headers(c || {});
  i ? o.set("Accept", i) : o.has("Accept") || o.set("Accept", "application/json"), n && n.trim() && o.set("X-Idempotency-Key", n.trim());
  let a = s.body;
  return r !== void 0 && (o.has("Content-Type") || o.set("Content-Type", "application/json"), a = JSON.stringify(r)), l(t, s, o), fetch(t, {
    ...s,
    headers: o,
    body: a
  });
}
function g(t) {
  if (!t || typeof t != "object")
    return "";
  if (typeof t.error == "string" && t.error.trim())
    return t.error.trim();
  if (t.error && typeof t.error == "object") {
    const e = t.error.message;
    if (typeof e == "string" && e.trim())
      return e.trim();
  }
  return typeof t.message == "string" && t.message.trim() ? t.message.trim() : "";
}
function w(t) {
  if (!t || typeof t != "object")
    return "";
  if (t.error && typeof t.error == "object") {
    const e = t.error.code;
    if (typeof e == "string" && e.trim())
      return e.trim();
  }
  return typeof t.code == "string" && t.code.trim() ? t.code.trim() : "";
}
function S(t) {
  if (!t || typeof t != "object" || !t.error || typeof t.error != "object")
    return {};
  const e = t.error.details;
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function u(t) {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
async function P(t) {
  const e = t.headers.get("content-type") ?? "";
  try {
    const n = (await t.text()).trim();
    if (!n)
      return {
        payload: null,
        rawText: "",
        contentType: e
      };
    if (e.includes("json")) {
      const i = u(n);
      if (i !== null)
        return {
          payload: i,
          rawText: n,
          contentType: e
        };
    }
    return {
      payload: n,
      rawText: n,
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
async function h(t, e) {
  try {
    const r = await t.json();
    return r === void 0 ? e : r;
  } catch {
    return e;
  }
}
async function x(t) {
  return await t.json();
}
async function H(t) {
  const e = await h(t, {});
  return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
}
async function f(t, e = "Request failed", r = {}) {
  const n = r.appendStatusToFallback !== !1;
  try {
    const c = (await t.text()).trim();
    if (c) {
      const s = u(c);
      if (s && typeof s == "object") {
        const o = g(s);
        if (o)
          return {
            message: o,
            payload: s,
            rawText: c
          };
      }
      return {
        message: c,
        payload: s,
        rawText: c
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
async function j(t, e = "Request failed", r = {}) {
  return (await f(t, e, r)).message;
}
async function b(t, e = "Request failed", r = {}) {
  const n = await f(t, e, r), i = n.payload && typeof n.payload == "object" ? n.payload : null;
  return {
    ...n,
    code: w(i),
    details: S(i)
  };
}
async function E(t, e = {}) {
  const r = await p(t, e);
  if (!r.ok)
    throw new Error(await j(r));
  return x(r);
}
export {
  l as appendCSRFHeader,
  E as httpJSON,
  p as httpRequest,
  T as readCSRFToken,
  j as readHTTPError,
  f as readHTTPErrorResult,
  x as readHTTPJSON,
  H as readHTTPJSONObject,
  h as readHTTPJSONValue,
  P as readHTTPResponsePayload,
  b as readHTTPStructuredErrorResult
};
//# sourceMappingURL=http-client.js.map

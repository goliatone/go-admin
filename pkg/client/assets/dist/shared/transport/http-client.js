var d = /* @__PURE__ */ new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
]);
function T() {
  return typeof document > "u" || !document?.querySelector ? "" : document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
}
function y(e) {
  const t = String(e || "GET").trim().toUpperCase() || "GET";
  return d.has(t);
}
function m(e) {
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(e)) return !0;
  if (typeof location > "u" || !location?.origin) return !1;
  try {
    return new URL(e, location.origin).origin === location.origin;
  } catch {
    return !1;
  }
}
function l(e, t, r) {
  if (!y(t.method) || r.has("X-CSRF-Token") || !m(e)) return;
  const n = T();
  n && r.set("X-CSRF-Token", n);
}
async function p(e, t = {}) {
  const { json: r, idempotencyKey: n, accept: o, headers: s, ...c } = t, i = new Headers(s || {});
  o ? i.set("Accept", o) : i.has("Accept") || i.set("Accept", "application/json"), n && n.trim() && i.set("X-Idempotency-Key", n.trim());
  let a = c.body;
  return r !== void 0 && (i.has("Content-Type") || i.set("Content-Type", "application/json"), a = JSON.stringify(r)), l(e, c, i), fetch(e, {
    ...c,
    headers: i,
    body: a
  });
}
function g(e) {
  if (!e || typeof e != "object") return "";
  if (typeof e.error == "string" && e.error.trim()) return e.error.trim();
  if (e.error && typeof e.error == "object") {
    const t = e.error.message;
    if (typeof t == "string" && t.trim()) return t.trim();
  }
  return typeof e.message == "string" && e.message.trim() ? e.message.trim() : "";
}
function w(e) {
  if (!e || typeof e != "object") return "";
  if (e.error && typeof e.error == "object") {
    const t = e.error.code;
    if (typeof t == "string" && t.trim()) return t.trim();
  }
  return typeof e.code == "string" && e.code.trim() ? e.code.trim() : "";
}
function S(e) {
  if (!e || typeof e != "object" || !e.error || typeof e.error != "object") return {};
  const t = e.error.details;
  return t && typeof t == "object" && !Array.isArray(t) ? t : {};
}
function u(e) {
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}
async function H(e) {
  const t = e.headers.get("content-type") ?? "";
  try {
    const r = (await e.text()).trim();
    if (!r) return {
      payload: null,
      rawText: "",
      contentType: t
    };
    if (t.includes("json")) {
      const n = u(r);
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
async function h(e, t) {
  try {
    const r = await e.json();
    return r === void 0 ? t : r;
  } catch {
    return t;
  }
}
async function j(e) {
  return await e.json();
}
async function b(e) {
  const t = await h(e, {});
  return !t || typeof t != "object" || Array.isArray(t) ? {} : t;
}
async function f(e, t = "Request failed", r = {}) {
  const n = r.appendStatusToFallback !== !1;
  try {
    const o = (await e.text()).trim();
    if (o) {
      const s = u(o);
      if (s && typeof s == "object") {
        const c = g(s);
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
    message: n ? `${t}: ${e.status}` : t,
    payload: null,
    rawText: ""
  };
}
async function P(e, t = "Request failed", r = {}) {
  return (await f(e, t, r)).message;
}
async function x(e, t = "Request failed", r = {}) {
  const n = await f(e, t, r), o = n.payload && typeof n.payload == "object" ? n.payload : null;
  return {
    ...n,
    code: w(o),
    details: S(o)
  };
}
async function E(e, t = {}) {
  const r = await p(e, t);
  if (!r.ok) throw new Error(await P(r));
  return j(r);
}
export {
  l as appendCSRFHeader,
  E as httpJSON,
  p as httpRequest,
  T as readCSRFToken,
  P as readHTTPError,
  f as readHTTPErrorResult,
  j as readHTTPJSON,
  b as readHTTPJSONObject,
  h as readHTTPJSONValue,
  H as readHTTPResponsePayload,
  x as readHTTPStructuredErrorResult
};

//# sourceMappingURL=http-client.js.map
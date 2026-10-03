import { httpRequest as u, readExpectedHTTPJSON as y, readHTTPStructuredErrorResult as p } from "../shared/transport/http-client.js";
var m = /* @__PURE__ */ new Set([
  "retry",
  "reload",
  "none"
]);
function f(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return {};
  const n = {};
  return Object.entries(t).forEach(([r, e]) => {
    if (typeof e == "string" && e.trim()) n[r] = e.trim();
    else if (Array.isArray(e)) {
      const o = e.filter((a) => typeof a == "string" && a.trim()).join("; ");
      o && (n[r] = o);
    }
  }), n;
}
function E(t) {
  return t === 401 ? "reload" : t === 0 || t === 408 || t === 429 || t >= 500 ? "retry" : "none";
}
function g(t) {
  if (!Array.isArray(t)) return {};
  const n = {};
  return t.slice(0, 50).forEach((r) => {
    if (!r || typeof r != "object") return;
    const e = r.field, o = r.message;
    typeof e == "string" && e.trim() && typeof o == "string" && o.trim() && (n[e.trim()] = n[e.trim()] ? `${n[e.trim()]}; ${o.trim()}` : o.trim());
  }), n;
}
var A = /^[A-Z][A-Z0-9_]{0,63}$/;
async function R(t, n) {
  const r = await p(t, n, { appendStatusToFallback: !1 }), e = r.payload && typeof r.payload == "object" ? r.payload : {}, o = e.error && typeof e.error == "object" && !Array.isArray(e.error) ? e.error : {}, a = o.metadata && typeof o.metadata == "object" && !Array.isArray(o.metadata) ? o.metadata : {}, s = r.details || {}, c = {
    ...f(e.fields),
    ...f(s.fields),
    ...g(o.validation_errors),
    ...f(a.fields)
  }, l = String(a.action ?? s.action ?? e.action ?? "").trim().toLowerCase(), i = typeof r.message == "string" && r.message.trim() && r.message.length <= 500 ? r.message.trim() : n, d = typeof o.text_code == "string" && A.test(o.text_code.trim()) ? o.text_code.trim() : "";
  return {
    status: t.status,
    code: d || r.code || (t.status === 401 ? "UNAUTHORIZED" : t.status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message: i,
    fields: c,
    action: m.has(l) ? l : E(t.status)
  };
}
function T(t) {
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: t,
    fields: {},
    action: "retry"
  };
}
async function j(t, n) {
  const { timeoutMs: r = 1e4, fallbackError: e, signal: o, ...a } = n, s = typeof AbortController < "u" ? new AbortController() : null, c = () => s?.abort();
  let l;
  o && (o.aborted ? c() : o.addEventListener("abort", c, { once: !0 })), s && r > 0 && (l = setTimeout(c, r));
  try {
    const i = await u(t, {
      credentials: "same-origin",
      ...a,
      signal: s?.signal ?? o
    });
    if (!i.ok) return {
      ok: !1,
      status: i.status,
      error: await R(i, e)
    };
    const d = await y(i);
    return {
      ok: !0,
      status: i.status,
      value: d
    };
  } catch (i) {
    return i && typeof i == "object" && i.name === "HTTPAuthenticationRequiredError" ? {
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
      error: T(e)
    };
  } finally {
    l !== void 0 && clearTimeout(l), o?.removeEventListener("abort", c);
  }
}
function _(t, n) {
  let r = t;
  return Object.entries(n).forEach(([e, o]) => {
    const a = encodeURIComponent(o), s = e.replace(/_id$|_key$/, "");
    r = r.split(`{${e}}`).join(a).split(`{${s}}`).join(a).replace(new RegExp(`:${e}(?=$|[/?#.])`, "g"), () => a).replace(new RegExp(`:${s}(?=$|[/?#.])`, "g"), () => a);
  }), r;
}
export {
  _ as n,
  j as t
};

//# sourceMappingURL=http-B2ojv2Fu.js.map
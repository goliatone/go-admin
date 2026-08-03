import { appendCSRFHeader as b } from "./transport/http-client.js";
import { d as D, n as H, p as C, u as L } from "../chunks/behaviors-3r2n03MZ.js";
var Y = "X-Enhanced-Action", ee = "application/vnd.admin.enhanced+json", te = "1";
function ne(e = document, t = {}) {
  const n = t.document ?? Z(e), a = (o) => {
    const r = O(o.target, n);
    if (!(!r || !r.matches("form[data-enhance-action]")) && y(t.fetch ?? globalThis.fetch, r.ownerDocument)) {
      if (L(r)) {
        o.preventDefault();
        return;
      }
      o.preventDefault(), R(r, o.submitter, {
        ...t,
        document: n
      });
    }
  };
  return e.addEventListener("submit", a), { destroy() {
    e.removeEventListener("submit", a);
  } };
}
async function R(e, t, n = {}) {
  const a = n.fetch ?? globalThis.fetch;
  if (!y(a, e.ownerDocument)) return null;
  const o = $(e, t);
  if (!o) return null;
  const r = j(e, t), i = A(e.ownerDocument), c = w(e.ownerDocument), u = new i(e);
  P(u, t);
  const l = I(o, r, u);
  z(e);
  const m = new c();
  m.set(U(n), _(n)), m.set("Accept", B(n)), b(l, { method: r }, m);
  const S = C(e, { submitter: t });
  try {
    const f = await a(l, {
      method: r,
      headers: m,
      body: r === "GET" || r === "HEAD" ? void 0 : u,
      credentials: "same-origin"
    }), d = await q(f, n), s = d.envelope;
    return d.navigationURL && f.ok ? (V(d.navigationURL, n, e.ownerDocument), s) : !f.ok || s.ok === !1 ? (g(e, s), p(s, n.toast), T(s, n.document ?? e.ownerDocument), s) : (await F(s, n), s);
  } catch (f) {
    const d = f instanceof Error ? f.message : "Request failed", s = {
      ok: !1,
      error: { message: d },
      toasts: [{
        type: "error",
        message: d
      }]
    };
    return g(e, s), p(s, n.toast), s;
  } finally {
    S.reset();
  }
}
async function F(e, t = {}) {
  const n = t.document ?? globalThis.document, a = [], o = [];
  for (const r of e.fragments ?? []) {
    const i = E(n, r);
    i && (a.push(r), o.push(i));
  }
  a.length > 0 && (await X(t, o), await t.onFragmentsApplied?.(a), J(n, a, o)), p(e, t.toast), T(e, n);
}
function re(e, t) {
  return !!E(e, t);
}
function E(e, t) {
  const n = String(t.selector ?? "").trim(), a = String(t.html ?? "").trim(), o = String(t.mode ?? "replace").trim() || "replace";
  if (!n || !a || o !== "replace") return null;
  const r = e.querySelector(n);
  if (!r) return null;
  const i = e.createElement("template");
  i.innerHTML = a;
  const c = i.content.firstElementChild;
  return c ? (r.replaceWith(c), c) : null;
}
function y(e, t) {
  return typeof e == "function" && !!A(t) && !!w(t);
}
async function q(e, t = {}) {
  const n = e.headers?.get("Content-Type") ?? "", a = M(n, t), o = k(n);
  if (!a && !o) {
    const r = x(e);
    return e.ok && r ? {
      enhanced: !1,
      navigationURL: r,
      envelope: {
        ok: !0,
        redirect: r
      }
    } : {
      enhanced: !1,
      envelope: {
        ok: !1,
        error: { message: e.ok ? "Expected an enhanced action response." : `Request failed (${e.status})` }
      }
    };
  }
  try {
    const r = await e.json();
    if (r && typeof r == "object" && !Array.isArray(r) && (a || N(r)))
      return {
        enhanced: !0,
        envelope: r
      };
  } catch {
  }
  return {
    enhanced: a,
    envelope: {
      ok: !1,
      error: { message: e.ok ? "Expected an enhanced action response." : `Request failed (${e.status})` }
    }
  };
}
function M(e, t = {}) {
  const n = h(e);
  return n ? (String(t.accept ?? "").trim() || "application/vnd.admin.enhanced+json").split(",").map(h).filter(Boolean).includes(n) : !1;
}
function k(e) {
  return h(e) === "application/json";
}
function h(e) {
  return String(e ?? "").split(";", 1)[0].trim().toLowerCase();
}
function N(e) {
  return e.version !== 1 ? !1 : [
    "ok",
    "toast",
    "toasts",
    "fragments",
    "focus",
    "redirect",
    "error"
  ].some((t) => Object.prototype.hasOwnProperty.call(e, t));
}
function x(e) {
  const t = String(e.url ?? "").trim();
  return !t || !e.redirected ? "" : t;
}
function V(e, t, n) {
  if (typeof t.navigate == "function") {
    t.navigate(e);
    return;
  }
  n.defaultView?.location.assign(e);
}
function $(e, t) {
  return t?.getAttribute("formaction")?.trim() || e.getAttribute("action")?.trim() || e.action || "";
}
function j(e, t) {
  return (t?.getAttribute("formmethod")?.trim() || e.getAttribute("method") || e.method || "GET").trim().toUpperCase() || "GET";
}
function O(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function A(e) {
  return e?.defaultView?.FormData ?? globalThis.FormData;
}
function w(e) {
  return e?.defaultView?.Headers ?? globalThis.Headers;
}
function U(e) {
  return String(e.requestHeader || e.request_header || "X-Enhanced-Action").trim() || "X-Enhanced-Action";
}
function _(e) {
  return String(e.requestHeaderValue || e.request_header_value || "1").trim() || "1";
}
function B(e) {
  return String(e.accept || "application/vnd.admin.enhanced+json").trim() || "application/vnd.admin.enhanced+json";
}
function I(e, t, n) {
  if (t !== "GET" && t !== "HEAD") return e;
  const a = new URLSearchParams();
  n.forEach((r, i) => {
    a.append(i, typeof r == "string" ? r : r.name);
  });
  const o = a.toString();
  if (!o) return e;
  try {
    const r = typeof location < "u" && location?.href ? location.href : void 0, i = new URL(e, r);
    return a.forEach((c, u) => {
      i.searchParams.append(u, c);
    }), /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(e) || e.startsWith("//") ? i.toString() : `${i.pathname}${i.search}${i.hash}`;
  } catch {
    const r = e.indexOf("#"), i = r >= 0 ? e.slice(0, r) : e, c = r >= 0 ? e.slice(r) : "";
    return `${i}${i.includes("?") ? "&" : "?"}${o}${c}`;
  }
}
function P(e, t) {
  if (!G(t)) return;
  const n = t.getAttribute("name")?.trim();
  !n || e.has(n) || e.append(n, t.getAttribute("value") ?? "");
}
function G(e) {
  if (!e) return !1;
  const t = e.ownerDocument?.defaultView;
  return t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement ? !0 : typeof HTMLInputElement < "u" && e instanceof HTMLInputElement;
}
function p(e, t) {
  const n = t ?? v().toastManager, a = [...e.toasts ?? []];
  e.toast && a.unshift(e.toast);
  for (const o of a) {
    const r = String(o.message ?? "").trim();
    if (!r) continue;
    const i = String(o.type ?? "info").trim() || "info", c = n?.[i];
    typeof c == "function" ? c.call(n, r) : typeof n?.show == "function" && n.show(r, i);
  }
}
function T(e, t) {
  const n = String(e.focus ?? "").trim();
  n && t.querySelector(n)?.focus?.();
}
function z(e) {
  for (const a of Array.from(e.querySelectorAll("[data-enhance-generated-error]"))) a.remove();
  for (const a of Array.from(e.querySelectorAll('[aria-invalid="true"]'))) a.removeAttribute("aria-invalid");
  const t = e.getAttribute("data-enhance-error-target")?.trim(), n = t ? e.ownerDocument.querySelector(t) : null;
  n && (n.textContent = "", n.setAttribute("hidden", ""));
}
function g(e, t) {
  const n = t.error?.fields ?? {};
  for (const [i, c] of Object.entries(n)) {
    const u = e.querySelector(`[name="${W(i)}"]`);
    if (!u) continue;
    u.setAttribute("aria-invalid", "true");
    const l = e.ownerDocument.createElement("div");
    l.setAttribute("data-enhance-generated-error", "true"), l.setAttribute("data-enhance-field-error-for", i), l.className = "mt-1 text-xs text-rose-600", l.textContent = c, u.insertAdjacentElement("afterend", l);
  }
  const a = String(t.error?.message ?? "").trim();
  if (!a) return;
  const o = e.getAttribute("data-enhance-error-target")?.trim(), r = o ? e.ownerDocument.querySelector(o) : null;
  r && (r.textContent = a, r.removeAttribute("hidden"));
}
function W(e) {
  const t = globalThis.CSS;
  return typeof t?.escape == "function" ? t.escape(e) : e.replace(/["\\]/g, "\\$&");
}
async function X(e, t) {
  for (const a of t)
    H(a, { window: a.ownerDocument.defaultView ?? void 0 }), D(a);
  const n = v().FormgenRelationships;
  typeof n?.initRelationships == "function" && await n.initRelationships();
}
function v() {
  return globalThis.window ?? {};
}
function J(e, t, n) {
  const a = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: {
      fragments: t,
      roots: n
    }
  });
  e.dispatchEvent(a);
}
function Z(e) {
  return e instanceof Document ? e : e.ownerDocument;
}
export {
  ee as ENHANCED_ACTION_ACCEPT,
  Y as ENHANCED_ACTION_HEADER,
  te as ENHANCED_ACTION_HEADER_VALUE,
  F as applyEnhancedEnvelope,
  re as applyEnhancedFragment,
  ne as initEnhancedActions,
  R as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
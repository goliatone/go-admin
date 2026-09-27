import { httpRequestWith as C } from "./transport/http-client.js";
import { d as $, n as P, p as G, u as W } from "../chunks/behaviors-Cm8MaHXi.js";
var fe = "X-Enhanced-Action", me = "application/vnd.admin.enhanced+json", he = "1";
function pe(e = document, t = {}) {
  const n = t.document ?? oe(e), a = (r) => {
    const o = Y(r.target, n);
    if (!(!o || !o.matches("form[data-enhance-action]")) && g(t.fetch ?? globalThis.fetch, o.ownerDocument)) {
      if (D(o)) {
        r.preventDefault(), A(o), B(o, {
          ...t,
          document: n
        });
        return;
      }
      if (W(o)) {
        r.preventDefault();
        return;
      }
      r.preventDefault(), z(o, r.submitter, {
        ...t,
        document: n
      });
    }
  }, c = (r) => {
    const o = ie(r.target);
    !o || !o.matches("form[data-enhance-action]") || !D(o) || g(t.fetch ?? globalThis.fetch, o.ownerDocument) && se(o, r.target, {
      ...t,
      document: n
    });
  };
  return e.addEventListener("submit", a), e.addEventListener("input", c), { destroy() {
    e.removeEventListener("submit", a), e.removeEventListener("input", c);
  } };
}
async function z(e, t, n = {}) {
  const a = n.fetch ?? globalThis.fetch;
  if (!g(a, e.ownerDocument)) return null;
  const c = F(e, t);
  if (!c) return null;
  const r = k(e, t), o = T(e.ownerDocument), i = L(e.ownerDocument), l = new o(e);
  ee(l, t);
  const d = x(c, r, l);
  _(e);
  const h = new i();
  h.set(M(n), U(n)), h.set("Accept", N(n));
  const p = G(e, {
    submitter: t,
    indicator: e.getAttribute("data-busy-indicator")?.trim() === "submitter" ? "submitter" : "all"
  });
  try {
    const f = await C(a, d, {
      method: r,
      headers: h,
      body: r === "GET" || r === "HEAD" ? void 0 : te(e, t, l),
      credentials: "same-origin"
    }), u = await H(f, n), s = u.envelope;
    if (u.navigationURL && f.ok)
      return Q(u.navigationURL, n, e.ownerDocument), s;
    if (!f.ok || s.ok === !1) {
      const m = n.document ?? e.ownerDocument;
      return await b(s, n, m), y(e, s), E(s, n.toast), V(s, m), s;
    }
    return await R(s, n), s;
  } catch (f) {
    const u = f instanceof Error ? f.message : "Request failed", s = {
      ok: !1,
      error: { message: u },
      toasts: [{
        type: "error",
        message: u
      }]
    };
    return y(e, s), E(s, n.toast), s;
  } finally {
    p.reset();
  }
}
async function R(e, t = {}) {
  const n = t.document ?? globalThis.document;
  await b(e, t, n), E(e, t.toast), V(e, n);
}
async function b(e, t, n) {
  const a = [], c = [];
  for (const r of e.fragments ?? []) {
    const o = q(n, r);
    o && (a.push(r), c.push(o));
  }
  a.length > 0 && (await re(t, c), await t.onFragmentsApplied?.(a), ae(n, a, c));
}
function ge(e, t) {
  return !!q(e, t);
}
function q(e, t) {
  const n = String(t.selector ?? "").trim(), a = String(t.html ?? "").trim(), c = String(t.mode ?? "replace").trim() || "replace";
  if (!n || !a || c !== "replace") return null;
  const r = e.querySelector(n);
  if (!r) return null;
  const o = e.createElement("template");
  o.innerHTML = a;
  const i = o.content.firstElementChild;
  return i ? (r.replaceWith(i), i) : null;
}
function g(e, t) {
  return typeof e == "function" && !!T(t) && !!L(t);
}
async function H(e, t = {}) {
  const n = e.headers?.get("Content-Type") ?? "", a = X(n, t), c = J(n);
  if (!a && !c) {
    const r = K(e);
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
    if (r && typeof r == "object" && !Array.isArray(r) && (a || Z(r)))
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
function X(e, t = {}) {
  const n = v(e);
  return n ? (String(t.accept ?? "").trim() || "application/vnd.admin.enhanced+json").split(",").map(v).filter(Boolean).includes(n) : !1;
}
function J(e) {
  return v(e) === "application/json";
}
function v(e) {
  return String(e ?? "").split(";", 1)[0].trim().toLowerCase();
}
function Z(e) {
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
function K(e) {
  const t = String(e.url ?? "").trim();
  return !t || !e.redirected ? "" : t;
}
function Q(e, t, n) {
  if (typeof t.navigate == "function") {
    t.navigate(e);
    return;
  }
  n.defaultView?.location.assign(e);
}
function F(e, t) {
  return t?.getAttribute("formaction")?.trim() || e.getAttribute("action")?.trim() || e.action || "";
}
function k(e, t) {
  return (t?.getAttribute("formmethod")?.trim() || e.getAttribute("method") || e.method || "GET").trim().toUpperCase() || "GET";
}
function Y(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function T(e) {
  return e?.defaultView?.FormData ?? globalThis.FormData;
}
function L(e) {
  return e?.defaultView?.Headers ?? globalThis.Headers;
}
function M(e) {
  return String(e.requestHeader || e.request_header || "X-Enhanced-Action").trim() || "X-Enhanced-Action";
}
function U(e) {
  return String(e.requestHeaderValue || e.request_header_value || "1").trim() || "1";
}
function N(e) {
  return String(e.accept || "application/vnd.admin.enhanced+json").trim() || "application/vnd.admin.enhanced+json";
}
function x(e, t, n) {
  if (t !== "GET" && t !== "HEAD") return e;
  const a = new URLSearchParams();
  n.forEach((r, o) => {
    a.append(o, typeof r == "string" ? r : r.name);
  });
  const c = a.toString();
  if (!c) return e;
  try {
    const r = typeof location < "u" && location?.href ? location.href : void 0, o = new URL(e, r);
    return a.forEach((i, l) => {
      o.searchParams.append(l, i);
    }), /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(e) || e.startsWith("//") ? o.toString() : `${o.pathname}${o.search}${o.hash}`;
  } catch {
    const r = e.indexOf("#"), o = r >= 0 ? e.slice(0, r) : e, i = r >= 0 ? e.slice(r) : "";
    return `${o}${o.includes("?") ? "&" : "?"}${c}${i}`;
  }
}
function ee(e, t) {
  if (!I(t)) return;
  const n = t.getAttribute("name")?.trim();
  !n || e.has(n) || e.append(n, t.getAttribute("value") ?? "");
}
function te(e, t, n) {
  if (((I(t) ? t.getAttribute("formenctype")?.trim() : "") || e.getAttribute("enctype") || "").trim().toLowerCase() === "multipart/form-data") return n;
  const a = new URLSearchParams();
  return n.forEach((c, r) => {
    a.append(r, typeof c == "string" ? c : c.name);
  }), a;
}
function I(e) {
  if (!e) return !1;
  const t = e.ownerDocument?.defaultView;
  return t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement ? !0 : typeof HTMLInputElement < "u" && e instanceof HTMLInputElement;
}
function E(e, t) {
  const n = t ?? O().toastManager, a = [...e.toasts ?? []];
  e.toast && a.unshift(e.toast);
  for (const c of a) {
    const r = String(c.message ?? "").trim();
    if (!r) continue;
    const o = String(c.type ?? "info").trim() || "info", i = n?.[o];
    typeof i == "function" ? i.call(n, r) : typeof n?.show == "function" && n.show(r, o);
  }
}
function V(e, t) {
  const n = String(e.focus ?? "").trim();
  n && t.querySelector(n)?.focus?.();
}
function _(e) {
  for (const a of Array.from(e.querySelectorAll("[data-enhance-generated-error]"))) a.remove();
  for (const a of Array.from(e.querySelectorAll('[aria-invalid="true"]'))) a.removeAttribute("aria-invalid");
  const t = e.getAttribute("data-enhance-error-target")?.trim(), n = t ? e.ownerDocument.querySelector(t) : null;
  n && (n.textContent = "", n.setAttribute("hidden", ""));
}
function y(e, t) {
  const n = t.error?.fields ?? {};
  for (const [o, i] of Object.entries(n)) {
    const l = e.querySelector(`[name="${ne(o)}"]`);
    if (!l) continue;
    l.setAttribute("aria-invalid", "true");
    const d = e.ownerDocument.createElement("div");
    d.setAttribute("data-enhance-generated-error", "true"), d.setAttribute("data-enhance-field-error-for", o), d.className = "mt-1 text-xs text-rose-600", d.textContent = i, l.insertAdjacentElement("afterend", d);
  }
  const a = String(t.error?.message ?? "").trim();
  if (!a) return;
  const c = e.getAttribute("data-enhance-error-target")?.trim(), r = c ? e.ownerDocument.querySelector(c) : null;
  r && (r.textContent = a, r.removeAttribute("hidden"));
}
function ne(e) {
  const t = globalThis.CSS;
  return typeof t?.escape == "function" ? t.escape(e) : e.replace(/["\\]/g, "\\$&");
}
async function re(e, t) {
  for (const a of t)
    P(a, { window: a.ownerDocument.defaultView ?? void 0 }), $(a);
  const n = O().FormgenRelationships;
  typeof n?.initRelationships == "function" && await n.initRelationships();
}
function O() {
  return globalThis.window ?? {};
}
function ae(e, t, n) {
  const a = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: {
      fragments: t,
      roots: n
    }
  });
  e.dispatchEvent(a);
}
function oe(e) {
  return e instanceof Document ? e : e.ownerDocument;
}
var ce = 180, w = /* @__PURE__ */ new WeakMap();
function D(e) {
  return e.hasAttribute("data-enhance-live") && k(e, null) === "GET";
}
function j(e) {
  let t = w.get(e);
  return t || (t = { sequence: 0 }, w.set(e, t)), t;
}
function A(e) {
  const t = w.get(e);
  t?.timer !== void 0 && (clearTimeout(t.timer), t.timer = void 0);
}
function ie(e) {
  const t = e;
  return t && t.form ? t.form : null;
}
function S(e, t) {
  const n = Number.parseInt(String(e ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : t;
}
function se(e, t, n) {
  const a = S(e.dataset.enhanceLiveMin, 1), c = t?.value;
  if (typeof c == "string" && t.type !== "radio" && t.type !== "checkbox") {
    const i = c.trim().length;
    if (i > 0 && i < a) {
      A(e);
      return;
    }
  }
  const r = j(e);
  A(e);
  const o = S(e.dataset.enhanceLiveDebounce, n.liveDebounceMs ?? ce);
  r.timer = setTimeout(() => {
    r.timer = void 0, B(e, n);
  }, o);
}
async function B(e, t) {
  const n = t.fetch ?? globalThis.fetch;
  if (!g(n, e.ownerDocument)) return;
  const a = F(e, null);
  if (!a) return;
  const c = T(e.ownerDocument), r = L(e.ownerDocument), o = x(a, "GET", new c(e)), i = j(e);
  if (o === i.lastURL) return;
  i.controller?.abort();
  const l = e.ownerDocument.defaultView?.AbortController ?? globalThis.AbortController, d = typeof l == "function" ? new l() : void 0;
  i.controller = d, i.lastURL = o;
  const h = ++i.sequence, p = t.document ?? e.ownerDocument, f = new r();
  f.set(M(t), U(t)), f.set("Accept", N(t)), e.setAttribute("aria-busy", "true"), e.dataset.enhanceLivePending = "true", _(e);
  try {
    const u = await C(n, o, {
      method: "GET",
      headers: f,
      credentials: "same-origin",
      signal: d?.signal
    }), s = await H(u, t);
    if (h !== i.sequence) return;
    const m = s.navigationURL ? {
      ok: !1,
      error: { message: "Expected an enhanced action response." }
    } : s.envelope;
    if (!u.ok || m.ok === !1) {
      i.lastURL = void 0, await b(m, t, p), y(e, m), E(m, t.toast);
      return;
    }
    await R(m, {
      ...t,
      document: p
    });
  } catch (u) {
    if (h !== i.sequence || ue(u)) return;
    i.lastURL = void 0, y(e, {
      ok: !1,
      error: { message: u instanceof Error ? u.message : "Request failed" }
    });
  } finally {
    h === i.sequence && (e.removeAttribute("aria-busy"), delete e.dataset.enhanceLivePending);
  }
}
function ue(e) {
  return !!e && typeof e == "object" && e.name === "AbortError";
}
export {
  me as ENHANCED_ACTION_ACCEPT,
  fe as ENHANCED_ACTION_HEADER,
  he as ENHANCED_ACTION_HEADER_VALUE,
  R as applyEnhancedEnvelope,
  ge as applyEnhancedFragment,
  pe as initEnhancedActions,
  z as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
import { appendCSRFHeader as v } from "./transport/http-client.js";
var W = "X-Enhanced-Action", X = "application/vnd.admin.enhanced+json", Z = "1";
function J(e = document, t = {}) {
  const n = t.document ?? G(e), r = (i) => {
    const a = M(i.target, n);
    !a || !a.matches("form[data-enhance-action]") || g(t.fetch ?? globalThis.fetch, a.ownerDocument) && (i.preventDefault(), T(a, i.submitter, {
      ...t,
      document: n
    }));
  };
  return e.addEventListener("submit", r), { destroy() {
    e.removeEventListener("submit", r);
  } };
}
async function T(e, t, n = {}) {
  const r = n.fetch ?? globalThis.fetch;
  if (!g(r, e.ownerDocument)) return null;
  const i = F(e, t);
  if (!i) return null;
  const a = q(e, t), o = E(e.ownerDocument), c = y(e.ownerDocument), u = new o(e);
  U(u, t);
  const l = $(i, a, u);
  _(e);
  const m = new c();
  m.set(k(n), x(n)), m.set("Accept", N(n)), v(l, { method: a }, m);
  const w = I(e, !0);
  try {
    const d = await r(l, {
      method: a,
      headers: m,
      body: a === "GET" || a === "HEAD" ? void 0 : u,
      credentials: "same-origin"
    }), f = await D(d), s = f.envelope;
    return f.navigationURL && d.ok ? (R(f.navigationURL, n, e.ownerDocument), s) : !d.ok || s.ok === !1 ? (p(e, s), h(s, n.toast), A(s, n.document ?? e.ownerDocument), s) : (await S(s, n), s);
  } catch (d) {
    const f = d instanceof Error ? d.message : "Request failed", s = {
      ok: !1,
      error: { message: f },
      toasts: [{
        type: "error",
        message: f
      }]
    };
    return p(e, s), h(s, n.toast), s;
  } finally {
    V(e, w);
  }
}
async function S(e, t = {}) {
  const n = t.document ?? globalThis.document, r = [];
  for (const i of e.fragments ?? []) H(n, i) && r.push(i);
  r.length > 0 && (await O(t), await t.onFragmentsApplied?.(r), z(n, r)), h(e, t.toast), A(e, n);
}
function H(e, t) {
  const n = String(t.selector ?? "").trim(), r = String(t.html ?? "").trim(), i = String(t.mode ?? "replace").trim() || "replace";
  if (!n || !r || i !== "replace") return !1;
  const a = e.querySelector(n);
  if (!a) return !1;
  const o = e.createElement("template");
  o.innerHTML = r;
  const c = o.content.firstElementChild;
  return c ? (a.replaceWith(c), !0) : !1;
}
function g(e, t) {
  return typeof e == "function" && !!E(t) && !!y(t);
}
async function D(e) {
  if (!L(e.headers?.get("Content-Type") ?? "")) {
    const t = C(e);
    return e.ok && t ? {
      enhanced: !1,
      navigationURL: t,
      envelope: {
        ok: !0,
        redirect: t
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
    const t = await e.json();
    if (t && typeof t == "object" && !Array.isArray(t)) return {
      enhanced: !0,
      envelope: t
    };
  } catch {
  }
  return {
    enhanced: !0,
    envelope: {
      ok: e.ok,
      error: e.ok ? void 0 : { message: `Request failed (${e.status})` }
    }
  };
}
function L(e) {
  const t = e.toLowerCase();
  return t.includes("json") || t.includes("application/vnd.admin.enhanced+json");
}
function C(e) {
  const t = String(e.url ?? "").trim();
  return !t || !e.redirected ? "" : t;
}
function R(e, t, n) {
  if (typeof t.navigate == "function") {
    t.navigate(e);
    return;
  }
  n.defaultView?.location.assign(e);
}
function F(e, t) {
  return t?.getAttribute("formaction")?.trim() || e.getAttribute("action")?.trim() || e.action || "";
}
function q(e, t) {
  return (t?.getAttribute("formmethod")?.trim() || e.getAttribute("method") || e.method || "GET").trim().toUpperCase() || "GET";
}
function M(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function E(e) {
  return e?.defaultView?.FormData ?? globalThis.FormData;
}
function y(e) {
  return e?.defaultView?.Headers ?? globalThis.Headers;
}
function k(e) {
  return String(e.requestHeader || "X-Enhanced-Action").trim() || "X-Enhanced-Action";
}
function x(e) {
  return String(e.requestHeaderValue || "1").trim() || "1";
}
function N(e) {
  return String(e.accept || "application/vnd.admin.enhanced+json").trim() || "application/vnd.admin.enhanced+json";
}
function $(e, t, n) {
  if (t !== "GET" && t !== "HEAD") return e;
  const r = new URLSearchParams();
  n.forEach((a, o) => {
    r.append(o, typeof a == "string" ? a : a.name);
  });
  const i = r.toString();
  if (!i) return e;
  try {
    const a = typeof location < "u" && location?.href ? location.href : void 0, o = new URL(e, a);
    return r.forEach((c, u) => {
      o.searchParams.append(u, c);
    }), /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(e) || e.startsWith("//") ? o.toString() : `${o.pathname}${o.search}${o.hash}`;
  } catch {
    const a = e.indexOf("#"), o = a >= 0 ? e.slice(0, a) : e, c = a >= 0 ? e.slice(a) : "";
    return `${o}${o.includes("?") ? "&" : "?"}${i}${c}`;
  }
}
function U(e, t) {
  if (!j(t)) return;
  const n = t.getAttribute("name")?.trim();
  !n || e.has(n) || e.append(n, t.getAttribute("value") ?? "");
}
function j(e) {
  if (!e) return !1;
  const t = e.ownerDocument?.defaultView;
  return t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement ? !0 : typeof HTMLInputElement < "u" && e instanceof HTMLInputElement;
}
function I(e, t) {
  const n = {
    controls: [],
    busy: e.getAttribute("aria-busy")
  };
  e.setAttribute("aria-busy", t ? "true" : "false");
  for (const r of Array.from(e.querySelectorAll('button, input[type="submit"], input[type="button"]')))
    n.controls.push({
      control: r,
      disabled: r.disabled
    }), r.disabled = t || r.disabled;
  return n;
}
function V(e, t) {
  t.busy === null ? e.removeAttribute("aria-busy") : e.setAttribute("aria-busy", t.busy);
  for (const n of t.controls) n.control.disabled = n.disabled;
}
function h(e, t) {
  const n = t ?? b().toastManager, r = [...e.toasts ?? []];
  e.toast && r.unshift(e.toast);
  for (const i of r) {
    const a = String(i.message ?? "").trim();
    if (!a) continue;
    const o = String(i.type ?? "info").trim() || "info", c = n?.[o];
    typeof c == "function" ? c.call(n, a) : typeof n?.show == "function" && n.show(a, o);
  }
}
function A(e, t) {
  const n = String(e.focus ?? "").trim();
  n && t.querySelector(n)?.focus?.();
}
function _(e) {
  for (const r of Array.from(e.querySelectorAll("[data-enhance-generated-error]"))) r.remove();
  for (const r of Array.from(e.querySelectorAll('[aria-invalid="true"]'))) r.removeAttribute("aria-invalid");
  const t = e.getAttribute("data-enhance-error-target")?.trim(), n = t ? e.ownerDocument.querySelector(t) : null;
  n && (n.textContent = "", n.setAttribute("hidden", ""));
}
function p(e, t) {
  const n = t.error?.fields ?? {};
  for (const [o, c] of Object.entries(n)) {
    const u = e.querySelector(`[name="${B(o)}"]`);
    if (!u) continue;
    u.setAttribute("aria-invalid", "true");
    const l = e.ownerDocument.createElement("div");
    l.setAttribute("data-enhance-generated-error", "true"), l.setAttribute("data-enhance-field-error-for", o), l.className = "mt-1 text-xs text-rose-600", l.textContent = c, u.insertAdjacentElement("afterend", l);
  }
  const r = String(t.error?.message ?? "").trim();
  if (!r) return;
  const i = e.getAttribute("data-enhance-error-target")?.trim(), a = i ? e.ownerDocument.querySelector(i) : null;
  a && (a.textContent = r, a.removeAttribute("hidden"));
}
function B(e) {
  const t = globalThis.CSS;
  return typeof t?.escape == "function" ? t.escape(e) : e.replace(/["\\]/g, "\\$&");
}
async function O(e) {
  const t = b().FormgenRelationships;
  typeof t?.initRelationships == "function" && await t.initRelationships();
}
function b() {
  return globalThis.window ?? {};
}
function z(e, t) {
  const n = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: { fragments: t }
  });
  e.dispatchEvent(n);
}
function G(e) {
  return e instanceof Document ? e : e.ownerDocument;
}
export {
  X as ENHANCED_ACTION_ACCEPT,
  W as ENHANCED_ACTION_HEADER,
  Z as ENHANCED_ACTION_HEADER_VALUE,
  S as applyEnhancedEnvelope,
  H as applyEnhancedFragment,
  J as initEnhancedActions,
  T as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
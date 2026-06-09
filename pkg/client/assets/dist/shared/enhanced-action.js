import { appendCSRFHeader as v } from "./transport/http-client.js";
var Z = "X-Enhanced-Action", K = "application/vnd.admin.enhanced+json", Q = "1";
function Y(e = document, t = {}) {
  const n = t.document ?? X(e), a = (o) => {
    const r = x(o.target, n);
    !r || !r.matches("form[data-enhance-action]") || E(t.fetch ?? globalThis.fetch, r.ownerDocument) && (o.preventDefault(), S(r, o.submitter, {
      ...t,
      document: n
    }));
  };
  return e.addEventListener("submit", a), { destroy() {
    e.removeEventListener("submit", a);
  } };
}
async function S(e, t, n = {}) {
  const a = n.fetch ?? globalThis.fetch;
  if (!E(a, e.ownerDocument)) return null;
  const o = k(e, t);
  if (!o) return null;
  const r = N(e, t), i = y(e.ownerDocument), c = A(e.ownerDocument), u = new i(e);
  V(u, t);
  const l = U(o, r, u);
  P(e);
  const m = new c();
  m.set($(n), j(n)), m.set("Accept", O(n)), v(l, { method: r }, m);
  const T = I(e, !0);
  try {
    const d = await a(l, {
      method: r,
      headers: m,
      body: r === "GET" || r === "HEAD" ? void 0 : u,
      credentials: "same-origin"
    }), f = await D(d, n), s = f.envelope;
    return f.navigationURL && d.ok ? (M(f.navigationURL, n, e.ownerDocument), s) : !d.ok || s.ok === !1 ? (g(e, s), p(s, n.toast), b(s, n.document ?? e.ownerDocument), s) : (await H(s, n), s);
  } catch (d) {
    const f = d instanceof Error ? d.message : "Request failed", s = {
      ok: !1,
      error: { message: f },
      toasts: [{
        type: "error",
        message: f
      }]
    };
    return g(e, s), p(s, n.toast), s;
  } finally {
    B(e, T);
  }
}
async function H(e, t = {}) {
  const n = t.document ?? globalThis.document, a = [];
  for (const o of e.fragments ?? []) C(n, o) && a.push(o);
  a.length > 0 && (await z(t), await t.onFragmentsApplied?.(a), W(n, a)), p(e, t.toast), b(e, n);
}
function C(e, t) {
  const n = String(t.selector ?? "").trim(), a = String(t.html ?? "").trim(), o = String(t.mode ?? "replace").trim() || "replace";
  if (!n || !a || o !== "replace") return !1;
  const r = e.querySelector(n);
  if (!r) return !1;
  const i = e.createElement("template");
  i.innerHTML = a;
  const c = i.content.firstElementChild;
  return c ? (r.replaceWith(c), !0) : !1;
}
function E(e, t) {
  return typeof e == "function" && !!y(t) && !!A(t);
}
async function D(e, t = {}) {
  const n = e.headers?.get("Content-Type") ?? "", a = L(n, t), o = R(n);
  if (!a && !o) {
    const r = F(e);
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
    if (r && typeof r == "object" && !Array.isArray(r) && (a || q(r)))
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
function L(e, t = {}) {
  const n = h(e);
  return n ? (String(t.accept ?? "").trim() || "application/vnd.admin.enhanced+json").split(",").map(h).filter(Boolean).includes(n) : !1;
}
function R(e) {
  return h(e) === "application/json";
}
function h(e) {
  return String(e ?? "").split(";", 1)[0].trim().toLowerCase();
}
function q(e) {
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
function F(e) {
  const t = String(e.url ?? "").trim();
  return !t || !e.redirected ? "" : t;
}
function M(e, t, n) {
  if (typeof t.navigate == "function") {
    t.navigate(e);
    return;
  }
  n.defaultView?.location.assign(e);
}
function k(e, t) {
  return t?.getAttribute("formaction")?.trim() || e.getAttribute("action")?.trim() || e.action || "";
}
function N(e, t) {
  return (t?.getAttribute("formmethod")?.trim() || e.getAttribute("method") || e.method || "GET").trim().toUpperCase() || "GET";
}
function x(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function y(e) {
  return e?.defaultView?.FormData ?? globalThis.FormData;
}
function A(e) {
  return e?.defaultView?.Headers ?? globalThis.Headers;
}
function $(e) {
  return String(e.requestHeader || e.request_header || "X-Enhanced-Action").trim() || "X-Enhanced-Action";
}
function j(e) {
  return String(e.requestHeaderValue || e.request_header_value || "1").trim() || "1";
}
function O(e) {
  return String(e.accept || "application/vnd.admin.enhanced+json").trim() || "application/vnd.admin.enhanced+json";
}
function U(e, t, n) {
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
function V(e, t) {
  if (!_(t)) return;
  const n = t.getAttribute("name")?.trim();
  !n || e.has(n) || e.append(n, t.getAttribute("value") ?? "");
}
function _(e) {
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
  for (const a of Array.from(e.querySelectorAll('button, input[type="submit"], input[type="button"]')))
    n.controls.push({
      control: a,
      disabled: a.disabled
    }), a.disabled = t || a.disabled;
  return n;
}
function B(e, t) {
  t.busy === null ? e.removeAttribute("aria-busy") : e.setAttribute("aria-busy", t.busy);
  for (const n of t.controls) n.control.disabled = n.disabled;
}
function p(e, t) {
  const n = t ?? w().toastManager, a = [...e.toasts ?? []];
  e.toast && a.unshift(e.toast);
  for (const o of a) {
    const r = String(o.message ?? "").trim();
    if (!r) continue;
    const i = String(o.type ?? "info").trim() || "info", c = n?.[i];
    typeof c == "function" ? c.call(n, r) : typeof n?.show == "function" && n.show(r, i);
  }
}
function b(e, t) {
  const n = String(e.focus ?? "").trim();
  n && t.querySelector(n)?.focus?.();
}
function P(e) {
  for (const a of Array.from(e.querySelectorAll("[data-enhance-generated-error]"))) a.remove();
  for (const a of Array.from(e.querySelectorAll('[aria-invalid="true"]'))) a.removeAttribute("aria-invalid");
  const t = e.getAttribute("data-enhance-error-target")?.trim(), n = t ? e.ownerDocument.querySelector(t) : null;
  n && (n.textContent = "", n.setAttribute("hidden", ""));
}
function g(e, t) {
  const n = t.error?.fields ?? {};
  for (const [i, c] of Object.entries(n)) {
    const u = e.querySelector(`[name="${G(i)}"]`);
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
function G(e) {
  const t = globalThis.CSS;
  return typeof t?.escape == "function" ? t.escape(e) : e.replace(/["\\]/g, "\\$&");
}
async function z(e) {
  const t = w().FormgenRelationships;
  typeof t?.initRelationships == "function" && await t.initRelationships();
}
function w() {
  return globalThis.window ?? {};
}
function W(e, t) {
  const n = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: { fragments: t }
  });
  e.dispatchEvent(n);
}
function X(e) {
  return e instanceof Document ? e : e.ownerDocument;
}
export {
  K as ENHANCED_ACTION_ACCEPT,
  Z as ENHANCED_ACTION_HEADER,
  Q as ENHANCED_ACTION_HEADER_VALUE,
  H as applyEnhancedEnvelope,
  C as applyEnhancedFragment,
  Y as initEnhancedActions,
  S as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
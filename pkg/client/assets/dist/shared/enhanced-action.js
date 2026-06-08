import { appendCSRFHeader as T } from "./transport/http-client.js";
var G = "X-Enhanced-Action", z = "application/vnd.admin.enhanced+json", P = "1";
function W(e = document, t = {}) {
  const n = t.document ?? U(e), o = (i) => {
    const r = F(i.target, n);
    !r || !r.matches("form[data-enhance-action]") || E(t.fetch ?? globalThis.fetch, r.ownerDocument) && (i.preventDefault(), H(r, i.submitter, {
      ...t,
      document: n
    }));
  };
  return e.addEventListener("submit", o), { destroy() {
    e.removeEventListener("submit", o);
  } };
}
async function H(e, t, n = {}) {
  const o = n.fetch ?? globalThis.fetch;
  if (!E(o, e.ownerDocument)) return null;
  const i = C(e, t);
  if (!i) return null;
  const r = L(e, t), a = g(e.ownerDocument), c = y(e.ownerDocument), u = new a(e);
  $(u, t);
  const l = N(i, r, u);
  j(e);
  const d = new c();
  d.set(q(n), M(n)), d.set("Accept", R(n)), T(l, { method: r }, d);
  const w = I(e, !0);
  try {
    const f = await o(l, {
      method: r,
      headers: d,
      body: r === "GET" || r === "HEAD" ? void 0 : u,
      credentials: "same-origin"
    }), s = await v(f);
    return !f.ok || s.ok === !1 ? (p(e, s), h(s, n.toast), A(s, n.document ?? e.ownerDocument), s) : (await S(s, n), s);
  } catch (f) {
    const s = f instanceof Error ? f.message : "Request failed", m = {
      ok: !1,
      error: { message: s },
      toasts: [{
        type: "error",
        message: s
      }]
    };
    return p(e, m), h(m, n.toast), m;
  } finally {
    V(e, w);
  }
}
async function S(e, t = {}) {
  const n = t.document ?? globalThis.document, o = [];
  for (const i of e.fragments ?? []) D(n, i) && o.push(i);
  o.length > 0 && (await _(t), await t.onFragmentsApplied?.(o), B(n, o)), h(e, t.toast), A(e, n);
}
function D(e, t) {
  const n = String(t.selector ?? "").trim(), o = String(t.html ?? "").trim(), i = String(t.mode ?? "replace").trim() || "replace";
  if (!n || !o || i !== "replace") return !1;
  const r = e.querySelector(n);
  if (!r) return !1;
  const a = e.createElement("template");
  a.innerHTML = o;
  const c = a.content.firstElementChild;
  return c ? (r.replaceWith(c), !0) : !1;
}
function E(e, t) {
  return typeof e == "function" && !!g(t) && !!y(t);
}
async function v(e) {
  try {
    const t = await e.json();
    if (t && typeof t == "object" && !Array.isArray(t)) return t;
  } catch {
  }
  return {
    ok: e.ok,
    error: e.ok ? void 0 : { message: `Request failed (${e.status})` }
  };
}
function C(e, t) {
  return t?.getAttribute("formaction")?.trim() || e.getAttribute("action")?.trim() || e.action || "";
}
function L(e, t) {
  return (t?.getAttribute("formmethod")?.trim() || e.getAttribute("method") || e.method || "GET").trim().toUpperCase() || "GET";
}
function F(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function g(e) {
  return e?.defaultView?.FormData ?? globalThis.FormData;
}
function y(e) {
  return e?.defaultView?.Headers ?? globalThis.Headers;
}
function q(e) {
  return String(e.requestHeader || "X-Enhanced-Action").trim() || "X-Enhanced-Action";
}
function M(e) {
  return String(e.requestHeaderValue || "1").trim() || "1";
}
function R(e) {
  return String(e.accept || "application/vnd.admin.enhanced+json").trim() || "application/vnd.admin.enhanced+json";
}
function N(e, t, n) {
  if (t !== "GET" && t !== "HEAD") return e;
  const o = new URLSearchParams();
  n.forEach((r, a) => {
    o.append(a, typeof r == "string" ? r : r.name);
  });
  const i = o.toString();
  if (!i) return e;
  try {
    const r = typeof location < "u" && location?.href ? location.href : void 0, a = new URL(e, r);
    return o.forEach((c, u) => {
      a.searchParams.append(u, c);
    }), /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(e) || e.startsWith("//") ? a.toString() : `${a.pathname}${a.search}${a.hash}`;
  } catch {
    const r = e.indexOf("#"), a = r >= 0 ? e.slice(0, r) : e, c = r >= 0 ? e.slice(r) : "";
    return `${a}${a.includes("?") ? "&" : "?"}${i}${c}`;
  }
}
function $(e, t) {
  if (!x(t)) return;
  const n = t.getAttribute("name")?.trim();
  !n || e.has(n) || e.append(n, t.getAttribute("value") ?? "");
}
function x(e) {
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
  for (const o of Array.from(e.querySelectorAll('button, input[type="submit"], input[type="button"]')))
    n.controls.push({
      control: o,
      disabled: o.disabled
    }), o.disabled = t || o.disabled;
  return n;
}
function V(e, t) {
  t.busy === null ? e.removeAttribute("aria-busy") : e.setAttribute("aria-busy", t.busy);
  for (const n of t.controls) n.control.disabled = n.disabled;
}
function h(e, t) {
  const n = t ?? b().toastManager, o = [...e.toasts ?? []];
  e.toast && o.unshift(e.toast);
  for (const i of o) {
    const r = String(i.message ?? "").trim();
    if (!r) continue;
    const a = String(i.type ?? "info").trim() || "info", c = n?.[a];
    typeof c == "function" ? c.call(n, r) : typeof n?.show == "function" && n.show(r, a);
  }
}
function A(e, t) {
  const n = String(e.focus ?? "").trim();
  n && t.querySelector(n)?.focus?.();
}
function j(e) {
  for (const t of Array.from(e.querySelectorAll("[data-enhance-generated-error]"))) t.remove();
  for (const t of Array.from(e.querySelectorAll('[aria-invalid="true"]'))) t.removeAttribute("aria-invalid");
}
function p(e, t) {
  const n = t.error?.fields ?? {};
  for (const [a, c] of Object.entries(n)) {
    const u = e.querySelector(`[name="${k(a)}"]`);
    if (!u) continue;
    u.setAttribute("aria-invalid", "true");
    const l = e.ownerDocument.createElement("div");
    l.setAttribute("data-enhance-generated-error", "true"), l.setAttribute("data-enhance-field-error-for", a), l.className = "mt-1 text-xs text-rose-600", l.textContent = c, u.insertAdjacentElement("afterend", l);
  }
  const o = String(t.error?.message ?? "").trim();
  if (!o) return;
  const i = e.getAttribute("data-enhance-error-target")?.trim(), r = i ? e.ownerDocument.querySelector(i) : null;
  r && (r.textContent = o, r.removeAttribute("hidden"));
}
function k(e) {
  const t = globalThis.CSS;
  return typeof t?.escape == "function" ? t.escape(e) : e.replace(/["\\]/g, "\\$&");
}
async function _(e) {
  const t = b().FormgenRelationships;
  typeof t?.initRelationships == "function" && await t.initRelationships();
}
function b() {
  return globalThis.window ?? {};
}
function B(e, t) {
  const n = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: { fragments: t }
  });
  e.dispatchEvent(n);
}
function U(e) {
  return e instanceof Document ? e : e.ownerDocument;
}
export {
  z as ENHANCED_ACTION_ACCEPT,
  G as ENHANCED_ACTION_HEADER,
  P as ENHANCED_ACTION_HEADER_VALUE,
  S as applyEnhancedEnvelope,
  D as applyEnhancedFragment,
  W as initEnhancedActions,
  H as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
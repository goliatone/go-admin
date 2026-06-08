import { appendCSRFHeader as T } from "./transport/http-client.js";
var S = "X-GoAdmin-Enhance", D = "application/vnd.go-admin.enhanced+json";
function O(t = document, e = {}) {
  const n = e.document ?? U(t), o = (i) => {
    const r = R(i.target, n);
    !r || !r.matches("form[data-enhance-action]") || E(e.fetch ?? globalThis.fetch, r.ownerDocument) && (i.preventDefault(), H(r, i.submitter, {
      ...e,
      document: n
    }));
  };
  return t.addEventListener("submit", o), { destroy() {
    t.removeEventListener("submit", o);
  } };
}
async function H(t, e, n = {}) {
  const o = n.fetch ?? globalThis.fetch;
  if (!E(o, t.ownerDocument)) return null;
  const i = F(t, e);
  if (!i) return null;
  const r = M(t, e), a = g(t.ownerDocument), s = y(t.ownerDocument), u = new a(t);
  $(u, e);
  const l = q(i, r, u);
  N(t);
  const d = new s();
  d.set(S, "1"), d.set("Accept", D), T(l, { method: r }, d);
  const w = I(t, !0);
  try {
    const f = await o(l, {
      method: r,
      headers: d,
      body: r === "GET" || r === "HEAD" ? void 0 : u,
      credentials: "same-origin"
    }), c = await C(f);
    return !f.ok || c.ok === !1 ? (p(t, c), h(c, n.toast), b(c, n.document ?? t.ownerDocument), c) : (await v(c, n), c);
  } catch (f) {
    const c = f instanceof Error ? f.message : "Request failed", m = {
      ok: !1,
      error: { message: c },
      toasts: [{
        type: "error",
        message: c
      }]
    };
    return p(t, m), h(m, n.toast), m;
  } finally {
    k(t, w);
  }
}
async function v(t, e = {}) {
  const n = e.document ?? globalThis.document, o = [];
  for (const i of t.fragments ?? []) L(n, i) && o.push(i);
  o.length > 0 && (await j(e), await e.onFragmentsApplied?.(o), G(n, o)), h(t, e.toast), b(t, n);
}
function L(t, e) {
  const n = String(e.selector ?? "").trim(), o = String(e.html ?? "").trim(), i = String(e.mode ?? "replace").trim() || "replace";
  if (!n || !o || i !== "replace") return !1;
  const r = t.querySelector(n);
  if (!r) return !1;
  const a = t.createElement("template");
  a.innerHTML = o;
  const s = a.content.firstElementChild;
  return s ? (r.replaceWith(s), !0) : !1;
}
function E(t, e) {
  return typeof t == "function" && !!g(e) && !!y(e);
}
async function C(t) {
  try {
    const e = await t.json();
    if (e && typeof e == "object" && !Array.isArray(e)) return e;
  } catch {
  }
  return {
    ok: t.ok,
    error: t.ok ? void 0 : { message: `Request failed (${t.status})` }
  };
}
function F(t, e) {
  return e?.getAttribute("formaction")?.trim() || t.getAttribute("action")?.trim() || t.action || "";
}
function M(t, e) {
  return (e?.getAttribute("formmethod")?.trim() || t.getAttribute("method") || t.method || "GET").trim().toUpperCase() || "GET";
}
function R(t, e) {
  const n = e.defaultView;
  return n?.HTMLFormElement && t instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement ? t : null;
}
function g(t) {
  return t?.defaultView?.FormData ?? globalThis.FormData;
}
function y(t) {
  return t?.defaultView?.Headers ?? globalThis.Headers;
}
function q(t, e, n) {
  if (e !== "GET" && e !== "HEAD") return t;
  const o = new URLSearchParams();
  n.forEach((r, a) => {
    o.append(a, typeof r == "string" ? r : r.name);
  });
  const i = o.toString();
  if (!i) return t;
  try {
    const r = typeof location < "u" && location?.href ? location.href : void 0, a = new URL(t, r);
    return o.forEach((s, u) => {
      a.searchParams.append(u, s);
    }), /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t) || t.startsWith("//") ? a.toString() : `${a.pathname}${a.search}${a.hash}`;
  } catch {
    const r = t.indexOf("#"), a = r >= 0 ? t.slice(0, r) : t, s = r >= 0 ? t.slice(r) : "";
    return `${a}${a.includes("?") ? "&" : "?"}${i}${s}`;
  }
}
function $(t, e) {
  if (!x(e)) return;
  const n = e.getAttribute("name")?.trim();
  !n || t.has(n) || t.append(n, e.getAttribute("value") ?? "");
}
function x(t) {
  if (!t) return !1;
  const e = t.ownerDocument?.defaultView;
  return e?.HTMLButtonElement && t instanceof e.HTMLButtonElement || e?.HTMLInputElement && t instanceof e.HTMLInputElement || typeof HTMLButtonElement < "u" && t instanceof HTMLButtonElement ? !0 : typeof HTMLInputElement < "u" && t instanceof HTMLInputElement;
}
function I(t, e) {
  const n = {
    controls: [],
    busy: t.getAttribute("aria-busy")
  };
  t.setAttribute("aria-busy", e ? "true" : "false");
  for (const o of Array.from(t.querySelectorAll('button, input[type="submit"], input[type="button"]')))
    n.controls.push({
      control: o,
      disabled: o.disabled
    }), o.disabled = e || o.disabled;
  return n;
}
function k(t, e) {
  e.busy === null ? t.removeAttribute("aria-busy") : t.setAttribute("aria-busy", e.busy);
  for (const n of e.controls) n.control.disabled = n.disabled;
}
function h(t, e) {
  const n = e ?? A().toastManager, o = [...t.toasts ?? []];
  t.toast && o.unshift(t.toast);
  for (const i of o) {
    const r = String(i.message ?? "").trim();
    if (!r) continue;
    const a = String(i.type ?? "info").trim() || "info", s = n?.[a];
    typeof s == "function" ? s.call(n, r) : typeof n?.show == "function" && n.show(r, a);
  }
}
function b(t, e) {
  const n = String(t.focus ?? "").trim();
  n && e.querySelector(n)?.focus?.();
}
function N(t) {
  for (const e of Array.from(t.querySelectorAll("[data-enhance-generated-error]"))) e.remove();
  for (const e of Array.from(t.querySelectorAll('[aria-invalid="true"]'))) e.removeAttribute("aria-invalid");
}
function p(t, e) {
  const n = e.error?.fields ?? {};
  for (const [a, s] of Object.entries(n)) {
    const u = t.querySelector(`[name="${B(a)}"]`);
    if (!u) continue;
    u.setAttribute("aria-invalid", "true");
    const l = t.ownerDocument.createElement("div");
    l.setAttribute("data-enhance-generated-error", "true"), l.setAttribute("data-enhance-field-error-for", a), l.className = "mt-1 text-xs text-rose-600", l.textContent = s, u.insertAdjacentElement("afterend", l);
  }
  const o = String(e.error?.message ?? "").trim();
  if (!o) return;
  const i = t.getAttribute("data-enhance-error-target")?.trim(), r = i ? t.ownerDocument.querySelector(i) : null;
  r && (r.textContent = o, r.removeAttribute("hidden"));
}
function B(t) {
  const e = globalThis.CSS;
  return typeof e?.escape == "function" ? e.escape(t) : t.replace(/["\\]/g, "\\$&");
}
async function j(t) {
  const e = A().FormgenRelationships;
  typeof e?.initRelationships == "function" && await e.initRelationships();
}
function A() {
  return globalThis.window ?? {};
}
function G(t, e) {
  const n = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: { fragments: e }
  });
  t.dispatchEvent(n);
}
function U(t) {
  return t instanceof Document ? t : t.ownerDocument;
}
export {
  D as ENHANCED_ACTION_ACCEPT,
  S as ENHANCED_ACTION_HEADER,
  v as applyEnhancedEnvelope,
  L as applyEnhancedFragment,
  O as initEnhancedActions,
  H as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
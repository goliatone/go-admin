import { httpRequestWith as V } from "./transport/http-client.js";
import { a as x, i as y, n as _, o as O, r as ut, s as ct, t as $ } from "../chunks/busy-MPizSUwt.js";
var lt = '[data-behavior~="navigation-busy"]', P = "[data-navigation-busy-trigger]", b = /* @__PURE__ */ new WeakMap(), p = /* @__PURE__ */ new WeakSet();
function ft(t, e, n) {
  if (p.has(t)) return !0;
  const r = gt(t.target, e);
  if (!r) return !1;
  const o = j(r, e);
  return !o || !bt(r, t, n) ? !1 : A(o) ? (p.add(t), t.preventDefault(), !0) : (p.add(t), W(o, r), !0);
}
function dt(t, e, n) {
  if (p.has(t)) return !0;
  const r = pt(t.target, e);
  if (!r) return !1;
  const o = j(r, e);
  if (!o || t.defaultPrevented || r.matches("form[data-enhance-action]")) return !1;
  const i = Tt(t, r);
  return x(r, i) || !Et(r, i) || !O(r, i) && typeof r.checkValidity == "function" && !r.checkValidity() ? !1 : A(o) ? (p.add(t), t.preventDefault(), !0) : (p.add(t), W(o, r, i), !0);
}
function A(t) {
  return !!t && (b.has(t) || t.dataset.navigationBusyActive === "true");
}
function mt(t) {
  if (!t) return;
  const e = b.get(t);
  if (!e) {
    t.dataset.navigationBusyActive === "true" && delete t.dataset.navigationBusyActive;
    return;
  }
  e.rootBusy.reset(), e.formBusy?.reset(), k(t, "navigationBusyActive", e.active);
  for (const n of e.triggers)
    Rt(n.element, "aria-disabled", n.ariaDisabled), k(n.element, "navigationBusyTriggerActive", n.active);
  e.status && (e.status.element.hidden = e.status.hidden, e.status.labelTarget && (e.status.labelTarget.textContent = e.status.labelText)), b.delete(t);
}
function ht(t = document) {
  const e = [];
  Dt(t) && A(t) && e.push(t), t.querySelectorAll('[data-navigation-busy-active="true"]').forEach((n) => {
    e.push(n);
  });
  for (const n of Array.from(new Set(e))) mt(n);
}
function W(t, e, n = null) {
  if (A(t)) return;
  const r = G(e) ? e : null, o = r && r !== t ? y(r, { submitter: n }) : null, i = y(t, r === t ? { submitter: n } : {
    controls: Array.from(t.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]')),
    includeDescendantControls: !1
  }), a = yt(t).map((f) => ({
    element: f,
    ariaDisabled: f.getAttribute("aria-disabled"),
    active: f.dataset.navigationBusyTriggerActive
  }));
  for (const f of a)
    f.element.setAttribute("aria-disabled", "true"), f.element === e && (f.element.dataset.navigationBusyTriggerActive = "true");
  const s = Lt(t), l = s?.querySelector("[data-navigation-busy-label-target]") ?? null, c = s ? {
    element: s,
    hidden: s.hidden,
    labelTarget: l,
    labelText: l?.textContent ?? null
  } : null;
  c && (c.labelTarget && (c.labelTarget.textContent = At(t, e)), c.element.hidden = !1);
  const u = {
    root: t,
    active: t.dataset.navigationBusyActive,
    rootBusy: i,
    formBusy: o,
    triggers: a,
    status: c
  };
  t.dataset.navigationBusyActive = "true", b.set(t, u);
}
function gt(t, e) {
  if (!St(t)) return null;
  const n = t.closest(`a[href]${P}`);
  return n && R(e, n) ? n : null;
}
function pt(t, e) {
  return !G(t) || !t.matches("form[data-navigation-busy-trigger]") ? null : R(e, t) ? t : null;
}
function j(t, e) {
  const n = t.closest(lt);
  return n && R(e, n) ? n : null;
}
function yt(t) {
  const e = Array.from(t.querySelectorAll(P));
  return t.matches("[data-navigation-busy-trigger]") && e.unshift(t), e;
}
function bt(t, e, n) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || t.hasAttribute("download") || t.hasAttribute("data-navigation-busy-skip") || ct(t.ownerDocument, t.getAttribute("target"))) return !1;
  const r = t.getAttribute("href")?.trim() ?? "";
  if (!r || r.startsWith("#")) return !1;
  try {
    const o = n?.location?.href || t.ownerDocument.URL, i = new URL(r, o);
    if (i.protocol !== "http:" && i.protocol !== "https:") return !1;
    if (n?.location) {
      const a = new URL(n.location.href);
      if (i.origin === a.origin && i.pathname === a.pathname && i.search === a.search && (i.hash || a.hash)) return !1;
    }
  } catch {
    return !1;
  }
  return !0;
}
function Et(t, e) {
  if (vt(t, e) === "dialog") return !1;
  const n = wt(t, e);
  return n !== null && (n.protocol === "http:" || n.protocol === "https:");
}
function vt(t, e) {
  const n = e?.hasAttribute("formmethod") ? e.getAttribute("formmethod") : t.getAttribute("method"), r = String(n ?? "").trim().toLowerCase();
  return r === "post" || r === "dialog" ? r : "get";
}
function wt(t, e) {
  const n = e?.hasAttribute("formaction") ? e.getAttribute("formaction") : t.getAttribute("action"), r = String(n ?? "").trim() || t.ownerDocument.URL;
  try {
    return new URL(r, t.ownerDocument.baseURI || t.ownerDocument.URL);
  } catch {
    return null;
  }
}
function At(t, e) {
  return String(e.getAttribute("data-navigation-busy-label") || t.getAttribute("data-navigation-busy-label") || "Loading...").trim();
}
function Lt(t) {
  const e = t.getAttribute("data-navigation-busy-status-target")?.trim() ?? "";
  if (e) try {
    return t.ownerDocument.querySelector(e);
  } catch {
    return null;
  }
  return t.querySelector("[data-navigation-busy-status]");
}
function Tt(t, e) {
  const n = t.submitter;
  if (!n) return null;
  const r = e.ownerDocument.defaultView;
  return (r?.HTMLButtonElement && n instanceof r.HTMLButtonElement || r?.HTMLInputElement && n instanceof r.HTMLInputElement || typeof HTMLButtonElement < "u" && n instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && n instanceof HTMLInputElement) && n.form === e ? n : null;
}
function St(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.Element && t instanceof e.Element || typeof Element < "u" && t instanceof Element);
}
function Dt(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLElement && t instanceof e.HTMLElement || typeof HTMLElement < "u" && t instanceof HTMLElement);
}
function G(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLFormElement && t instanceof e.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement);
}
function R(t, e) {
  return t === e || t.contains(e);
}
function Rt(t, e, n) {
  if (n === null) {
    t.removeAttribute(e);
    return;
  }
  t.setAttribute(e, n);
}
function k(t, e, n) {
  if (n === void 0) {
    delete t.dataset[e];
    return;
  }
  t.dataset[e] = n;
}
var Ft = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]', F = /* @__PURE__ */ new WeakMap(), q = /* @__PURE__ */ new WeakSet();
function H(t = document, e = {}) {
  const n = F.get(t) ?? Ht(t, e), r = Mt(n, e);
  return e.listenForFragments !== !1 && Bt(n), r.controller;
}
function Ht(t, e) {
  const n = kt(t), r = e.window ?? n.defaultView ?? window, o = (c) => {
    ft(c, t, r);
  }, i = (c) => {
    if (dt(c, t, r)) return;
    const u = qt(c.target, n), f = u ? Ct(u, l.submitRules) : null;
    if (!u || !f || c.defaultPrevented || u.matches("form[data-enhance-action]") || q.has(c)) return;
    if ($(u)) {
      c.preventDefault();
      return;
    }
    const m = Ut(c, u, n);
    !O(u, m) && typeof u.checkValidity == "function" && !u.checkValidity() || (q.add(c), y(u, {
      submitter: m,
      compatibilitySubmitLoading: f.compatibilitySubmitLoading || u.hasAttribute("data-submit-loading-form")
    }), x(u, m) && r?.setTimeout(() => {
      _(u);
    }, 0));
  }, a = () => {
    L(t);
  }, l = {
    root: t,
    doc: n,
    win: r,
    submitRules: [],
    fragmentListenerAttached: !1,
    handleClick: o,
    handleSubmit: i,
    handlePageShow: a,
    handleFragmentsApplied: (c) => {
      const u = c.detail;
      if (Array.isArray(u?.roots) && u.roots.length > 0) {
        u.roots.forEach((f) => U(l, f));
        return;
      }
      if (u?.root) {
        U(l, u.root);
        return;
      }
      l.submitRules.forEach((f) => {
        H(t, {
          submitBusySelector: f.selector,
          compatibilitySubmitLoading: f.compatibilitySubmitLoading,
          window: r ?? void 0,
          listenForFragments: !1
        });
      });
    }
  };
  return t.addEventListener("click", o), t.addEventListener("submit", i), r?.addEventListener("pageshow", a), F.set(t, l), l;
}
function Mt(t, e) {
  const n = e.submitBusySelector || Ft, r = e.compatibilitySubmitLoading === !0, o = `${n}
${r ? "compat" : "standard"}`, i = t.submitRules.find((s) => s.key === o);
  if (i) return i;
  const a = {
    key: o,
    selector: n,
    compatibilitySubmitLoading: r,
    controller: {
      reset() {
        L(t.root);
      },
      destroy() {
        const s = t.submitRules.findIndex((l) => l.key === o);
        s >= 0 && t.submitRules.splice(s, 1), t.submitRules.length === 0 && (L(t.root), t.root.removeEventListener("click", t.handleClick), t.root.removeEventListener("submit", t.handleSubmit), t.win?.removeEventListener("pageshow", t.handlePageShow), t.doc.removeEventListener("go-admin:enhanced-fragments-applied", t.handleFragmentsApplied), F.delete(t.root));
      }
    }
  };
  return t.submitRules.push(a), a;
}
function Bt(t) {
  t.fragmentListenerAttached || (t.doc.addEventListener("go-admin:enhanced-fragments-applied", t.handleFragmentsApplied), t.fragmentListenerAttached = !0);
}
function U(t, e) {
  t.submitRules.forEach((n) => {
    H(e, {
      submitBusySelector: n.selector,
      compatibilitySubmitLoading: n.compatibilitySubmitLoading,
      window: t.win ?? void 0,
      listenForFragments: !1
    });
  });
}
function Ct(t, e) {
  let n = null;
  for (const r of e)
    if (t.matches(r.selector)) {
      if (r.compatibilitySubmitLoading) return r;
      n = n ?? r;
    }
  return n;
}
function L(t = document) {
  ht(t), ut(t);
}
function kt(t) {
  return t.nodeType === 9 ? t : t.ownerDocument || document;
}
function qt(t, e) {
  const n = e.defaultView;
  return n?.HTMLFormElement && t instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement ? t : null;
}
function Ut(t, e, n) {
  const r = t.submitter;
  if (!r) return null;
  const o = n.defaultView;
  return (o?.HTMLButtonElement && r instanceof o.HTMLButtonElement || o?.HTMLInputElement && r instanceof o.HTMLInputElement || typeof HTMLButtonElement < "u" && r instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && r instanceof HTMLInputElement) && r.form === e ? r : null;
}
var ee = "X-Enhanced-Action", ne = "application/vnd.admin.enhanced+json", re = "1";
function ie(t = document, e = {}) {
  const n = e.document ?? zt(t), r = (i) => {
    const a = $t(i.target, n);
    if (!(!a || !a.matches("form[data-enhance-action]")) && E(e.fetch ?? globalThis.fetch, a.ownerDocument)) {
      if (N(a)) {
        i.preventDefault(), D(a), st(a, {
          ...e,
          document: n
        });
        return;
      }
      if ($(a)) {
        i.preventDefault();
        return;
      }
      i.preventDefault(), Nt(a, i.submitter, {
        ...e,
        document: n
      });
    }
  }, o = (i) => {
    const a = Yt(i.target);
    !a || !a.matches("form[data-enhance-action]") || !N(a) || E(e.fetch ?? globalThis.fetch, a.ownerDocument) && Jt(a, i.target, {
      ...e,
      document: n
    });
  };
  return t.addEventListener("submit", r), t.addEventListener("input", o), { destroy() {
    t.removeEventListener("submit", r), t.removeEventListener("input", o);
  } };
}
async function Nt(t, e, n = {}) {
  const r = n.fetch ?? globalThis.fetch;
  if (!E(r, t.ownerDocument)) return null;
  const o = Y(t, e);
  if (!o) return null;
  const i = J(t, e), a = B(t.ownerDocument), s = C(t.ownerDocument), l = new a(t);
  Pt(l, e);
  const c = et(o, i, l);
  it(t);
  const u = new s();
  u.set(Z(n), Q(n)), u.set("Accept", tt(n));
  const f = y(t, {
    submitter: e,
    indicator: t.getAttribute("data-busy-indicator")?.trim() === "submitter" ? "submitter" : "all"
  });
  try {
    const m = await V(r, c, {
      method: i,
      headers: u,
      body: i === "GET" || i === "HEAD" ? void 0 : Wt(t, e, l),
      credentials: "same-origin"
    }), h = await X(m, n), d = h.envelope;
    if (h.navigationURL && m.ok)
      return Ot(h.navigationURL, n, t.ownerDocument), d;
    if (!m.ok || d.ok === !1) {
      const g = n.document ?? t.ownerDocument;
      return await M(d, n, g), w(t, d), v(d, n.toast), rt(d, g), d;
    }
    return await K(d, n), d;
  } catch (m) {
    const h = m instanceof Error ? m.message : "Request failed", d = {
      ok: !1,
      error: { message: h },
      toasts: [{
        type: "error",
        message: h
      }]
    };
    return w(t, d), v(d, n.toast), d;
  } finally {
    f.reset();
  }
}
async function K(t, e = {}) {
  const n = e.document ?? globalThis.document;
  await M(t, e, n), v(t, e.toast), rt(t, n);
}
async function M(t, e, n) {
  const r = [], o = [];
  for (const i of t.fragments ?? []) {
    const a = z(n, i);
    a && (r.push(i), o.push(a));
  }
  r.length > 0 && (await Gt(e, o), await e.onFragmentsApplied?.(r), Kt(n, r, o));
}
function ae(t, e) {
  return !!z(t, e);
}
function z(t, e) {
  const n = String(e.selector ?? "").trim(), r = String(e.html ?? "").trim(), o = String(e.mode ?? "replace").trim() || "replace";
  if (!n || !r || o !== "replace") return null;
  const i = t.querySelector(n);
  if (!i) return null;
  const a = t.createElement("template");
  a.innerHTML = r;
  const s = a.content.firstElementChild;
  return s ? (i.replaceWith(s), s) : null;
}
function E(t, e) {
  return typeof t == "function" && !!B(e) && !!C(e);
}
async function X(t, e = {}) {
  const n = t.headers?.get("Content-Type") ?? "", r = It(n, e), o = Vt(n);
  if (!r && !o) {
    const i = _t(t);
    return t.ok && i ? {
      enhanced: !1,
      navigationURL: i,
      envelope: {
        ok: !0,
        redirect: i
      }
    } : {
      enhanced: !1,
      envelope: {
        ok: !1,
        error: { message: t.ok ? "Expected an enhanced action response." : `Request failed (${t.status})` }
      }
    };
  }
  try {
    const i = await t.json();
    if (i && typeof i == "object" && !Array.isArray(i) && (r || xt(i)))
      return {
        enhanced: !0,
        envelope: i
      };
  } catch {
  }
  return {
    enhanced: r,
    envelope: {
      ok: !1,
      error: { message: t.ok ? "Expected an enhanced action response." : `Request failed (${t.status})` }
    }
  };
}
function It(t, e = {}) {
  const n = T(t);
  return n ? (String(e.accept ?? "").trim() || "application/vnd.admin.enhanced+json").split(",").map(T).filter(Boolean).includes(n) : !1;
}
function Vt(t) {
  return T(t) === "application/json";
}
function T(t) {
  return String(t ?? "").split(";", 1)[0].trim().toLowerCase();
}
function xt(t) {
  return t.version !== 1 ? !1 : [
    "ok",
    "toast",
    "toasts",
    "fragments",
    "focus",
    "redirect",
    "error"
  ].some((e) => Object.prototype.hasOwnProperty.call(t, e));
}
function _t(t) {
  const e = String(t.url ?? "").trim();
  return !e || !t.redirected ? "" : e;
}
function Ot(t, e, n) {
  if (typeof e.navigate == "function") {
    e.navigate(t);
    return;
  }
  n.defaultView?.location.assign(t);
}
function Y(t, e) {
  return e?.getAttribute("formaction")?.trim() || t.getAttribute("action")?.trim() || t.action || "";
}
function J(t, e) {
  return (e?.getAttribute("formmethod")?.trim() || t.getAttribute("method") || t.method || "GET").trim().toUpperCase() || "GET";
}
function $t(t, e) {
  const n = e.defaultView;
  return n?.HTMLFormElement && t instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement ? t : null;
}
function B(t) {
  return t?.defaultView?.FormData ?? globalThis.FormData;
}
function C(t) {
  return t?.defaultView?.Headers ?? globalThis.Headers;
}
function Z(t) {
  return String(t.requestHeader || t.request_header || "X-Enhanced-Action").trim() || "X-Enhanced-Action";
}
function Q(t) {
  return String(t.requestHeaderValue || t.request_header_value || "1").trim() || "1";
}
function tt(t) {
  return String(t.accept || "application/vnd.admin.enhanced+json").trim() || "application/vnd.admin.enhanced+json";
}
function et(t, e, n) {
  if (e !== "GET" && e !== "HEAD") return t;
  const r = new URLSearchParams();
  n.forEach((i, a) => {
    r.append(a, typeof i == "string" ? i : i.name);
  });
  const o = r.toString();
  if (!o) return t;
  try {
    const i = typeof location < "u" && location?.href ? location.href : void 0, a = new URL(t, i);
    return r.forEach((s, l) => {
      a.searchParams.append(l, s);
    }), /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t) || t.startsWith("//") ? a.toString() : `${a.pathname}${a.search}${a.hash}`;
  } catch {
    const i = t.indexOf("#"), a = i >= 0 ? t.slice(0, i) : t, s = i >= 0 ? t.slice(i) : "";
    return `${a}${a.includes("?") ? "&" : "?"}${o}${s}`;
  }
}
function Pt(t, e) {
  if (!nt(e)) return;
  const n = e.getAttribute("name")?.trim();
  !n || t.has(n) || t.append(n, e.getAttribute("value") ?? "");
}
function Wt(t, e, n) {
  if (((nt(e) ? e.getAttribute("formenctype")?.trim() : "") || t.getAttribute("enctype") || "").trim().toLowerCase() === "multipart/form-data") return n;
  const r = new URLSearchParams();
  return n.forEach((o, i) => {
    r.append(i, typeof o == "string" ? o : o.name);
  }), r;
}
function nt(t) {
  if (!t) return !1;
  const e = t.ownerDocument?.defaultView;
  return e?.HTMLButtonElement && t instanceof e.HTMLButtonElement || e?.HTMLInputElement && t instanceof e.HTMLInputElement || typeof HTMLButtonElement < "u" && t instanceof HTMLButtonElement ? !0 : typeof HTMLInputElement < "u" && t instanceof HTMLInputElement;
}
function v(t, e) {
  const n = e ?? at().toastManager, r = [...t.toasts ?? []];
  t.toast && r.unshift(t.toast);
  for (const o of r) {
    const i = String(o.message ?? "").trim();
    if (!i) continue;
    const a = String(o.type ?? "info").trim() || "info", s = n?.[a];
    typeof s == "function" ? s.call(n, i) : typeof n?.show == "function" && n.show(i, a);
  }
}
function rt(t, e) {
  const n = String(t.focus ?? "").trim();
  n && e.querySelector(n)?.focus?.();
}
function it(t) {
  for (const r of Array.from(t.querySelectorAll("[data-enhance-generated-error]"))) r.remove();
  for (const r of Array.from(t.querySelectorAll('[aria-invalid="true"]'))) r.removeAttribute("aria-invalid");
  const e = t.getAttribute("data-enhance-error-target")?.trim(), n = e ? t.ownerDocument.querySelector(e) : null;
  n && (n.textContent = "", n.setAttribute("hidden", ""));
}
function w(t, e) {
  const n = e.error?.fields ?? {};
  for (const [a, s] of Object.entries(n)) {
    const l = t.querySelector(`[name="${jt(a)}"]`);
    if (!l) continue;
    l.setAttribute("aria-invalid", "true");
    const c = t.ownerDocument.createElement("div");
    c.setAttribute("data-enhance-generated-error", "true"), c.setAttribute("data-enhance-field-error-for", a), c.className = "mt-1 text-xs text-rose-600", c.textContent = s, l.insertAdjacentElement("afterend", c);
  }
  const r = String(e.error?.message ?? "").trim();
  if (!r) return;
  const o = t.getAttribute("data-enhance-error-target")?.trim(), i = o ? t.ownerDocument.querySelector(o) : null;
  i && (i.textContent = r, i.removeAttribute("hidden"));
}
function jt(t) {
  const e = globalThis.CSS;
  return typeof e?.escape == "function" ? e.escape(t) : t.replace(/["\\]/g, "\\$&");
}
async function Gt(t, e) {
  for (const r of e)
    H(r, { window: r.ownerDocument.defaultView ?? void 0 }), _(r);
  const n = at().FormgenRelationships;
  typeof n?.initRelationships == "function" && await n.initRelationships();
}
function at() {
  return globalThis.window ?? {};
}
function Kt(t, e, n) {
  const r = new CustomEvent("go-admin:enhanced-fragments-applied", {
    bubbles: !0,
    detail: {
      fragments: e,
      roots: n
    }
  });
  t.dispatchEvent(r);
}
function zt(t) {
  return t instanceof Document ? t : t.ownerDocument;
}
var Xt = 180, S = /* @__PURE__ */ new WeakMap();
function N(t) {
  return t.hasAttribute("data-enhance-live") && J(t, null) === "GET";
}
function ot(t) {
  let e = S.get(t);
  return e || (e = { sequence: 0 }, S.set(t, e)), e;
}
function D(t) {
  const e = S.get(t);
  e?.timer !== void 0 && (clearTimeout(e.timer), e.timer = void 0);
}
function Yt(t) {
  const e = t;
  return e && e.form ? e.form : null;
}
function I(t, e) {
  const n = Number.parseInt(String(t ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : e;
}
function Jt(t, e, n) {
  const r = I(t.dataset.enhanceLiveMin, 1), o = e?.value;
  if (typeof o == "string" && e.type !== "radio" && e.type !== "checkbox") {
    const s = o.trim().length;
    if (s > 0 && s < r) {
      D(t);
      return;
    }
  }
  const i = ot(t);
  D(t);
  const a = I(t.dataset.enhanceLiveDebounce, n.liveDebounceMs ?? Xt);
  i.timer = setTimeout(() => {
    i.timer = void 0, st(t, n);
  }, a);
}
async function st(t, e) {
  const n = e.fetch ?? globalThis.fetch;
  if (!E(n, t.ownerDocument)) return;
  const r = Y(t, null);
  if (!r) return;
  const o = B(t.ownerDocument), i = C(t.ownerDocument), a = et(r, "GET", new o(t)), s = ot(t);
  if (a === s.lastURL) return;
  s.controller?.abort();
  const l = t.ownerDocument.defaultView?.AbortController ?? globalThis.AbortController, c = typeof l == "function" ? new l() : void 0;
  s.controller = c, s.lastURL = a;
  const u = ++s.sequence, f = e.document ?? t.ownerDocument, m = new i();
  m.set(Z(e), Q(e)), m.set("Accept", tt(e)), t.setAttribute("aria-busy", "true"), t.dataset.enhanceLivePending = "true", it(t);
  try {
    const h = await V(n, a, {
      method: "GET",
      headers: m,
      credentials: "same-origin",
      signal: c?.signal
    }), d = await X(h, e);
    if (u !== s.sequence) return;
    const g = d.navigationURL ? {
      ok: !1,
      error: { message: "Expected an enhanced action response." }
    } : d.envelope;
    if (!h.ok || g.ok === !1) {
      s.lastURL = void 0, await M(g, e, f), w(t, g), v(g, e.toast);
      return;
    }
    await K(g, {
      ...e,
      document: f
    });
  } catch (h) {
    if (u !== s.sequence || Zt(h)) return;
    s.lastURL = void 0, w(t, {
      ok: !1,
      error: { message: h instanceof Error ? h.message : "Request failed" }
    });
  } finally {
    u === s.sequence && (t.removeAttribute("aria-busy"), delete t.dataset.enhanceLivePending);
  }
}
function Zt(t) {
  return !!t && typeof t == "object" && t.name === "AbortError";
}
export {
  ne as ENHANCED_ACTION_ACCEPT,
  ee as ENHANCED_ACTION_HEADER,
  re as ENHANCED_ACTION_HEADER_VALUE,
  K as applyEnhancedEnvelope,
  ae as applyEnhancedFragment,
  ie as initEnhancedActions,
  Nt as submitEnhancedForm
};

//# sourceMappingURL=enhanced-action.js.map
import { escapeAttribute as j, escapeHTML as L } from "../shared/html.js";
import { L as F, T as B, g as C, w as _ } from "./action-execution-BD_-_Uw1.js";
function U(s, a, e) {
  const t = a.toLowerCase();
  if (s === "status") {
    const i = [
      "status-chip",
      `status-chip--${F(t)}`,
      "status-badge"
    ];
    return e === "sm" && i.push("status-chip--sm", "status-badge--sm"), i.push(`status-${t}`), i.join(" ");
  }
  const l = s === "role" ? "role-badge" : "badge", r = s === "role" ? "role" : "badge", n = [l];
  return e === "sm" && n.push(`${l}--sm`), n.push(`${r}-${t}`), n.join(" ");
}
function N(s, a, e, t) {
  const l = [U(a, e, t?.size)];
  t?.uppercase && l.push("badge--uppercase"), t?.extraClass && l.push(t.extraClass);
  let r = "";
  t?.attrs && (r = Object.entries(t.attrs).map(([i, o]) => o === "" ? ` ${i}` : ` ${i}="${j(o)}"`).join(""));
  const n = a === "status" ? ` data-tone="${F(e)}"` : "";
  return `<span class="${l.join(" ")}"${n}${r}>${L(s)}</span>`;
}
var O = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', V = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function G(s, a) {
  const e = s ? a?.trueLabel ?? "Yes" : a?.falseLabel ?? "No";
  return `<span class="badge badge-${s ? "boolean-true" : "boolean-false"}">${s ? O : V}${L(e)}</span>`;
}
function x(s) {
  const a = {
    requestedLocale: null,
    resolvedLocale: null,
    availableLocales: [],
    missingRequestedLocale: !1,
    fallbackUsed: !1,
    familyId: null,
    status: null,
    entityType: null,
    recordId: null
  };
  return !s || typeof s != "object" || (a.requestedLocale = g(s, ["requested_locale"]), a.resolvedLocale = g(s, ["resolved_locale", "locale"]), a.availableLocales = K(s, ["available_locales"]), a.missingRequestedLocale = M(s, ["missing_requested_locale"]), a.fallbackUsed = M(s, ["fallback_used"]), a.familyId = g(s, ["family_id"]), a.status = g(s, ["status"]), a.entityType = g(s, [
    "entity_type",
    "type",
    "_type"
  ]), a.recordId = g(s, ["id"]), !a.fallbackUsed && a.requestedLocale && a.resolvedLocale && (a.fallbackUsed = a.requestedLocale !== a.resolvedLocale), !a.missingRequestedLocale && a.fallbackUsed && (a.missingRequestedLocale = !0)), a;
}
function J(s) {
  const a = x(s);
  return a.fallbackUsed || a.missingRequestedLocale;
}
function Q(s) {
  const a = x(s);
  return a.familyId !== null || a.resolvedLocale !== null || a.availableLocales.length > 0;
}
function m(s, a = {}, e = "neutral") {
  const t = s.trim();
  if (!t) return "";
  const { size: l = "sm", extraClass: r = "" } = a;
  return `<span class="inline-flex items-center rounded-full border font-medium ${l === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${e === "info" ? "bg-blue-50 text-blue-700 border-blue-200" : e === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"} ${r}">${L(t)}</span>`;
}
function k(s, a) {
  if (!s || typeof s != "object" || Array.isArray(s)) return null;
  const e = s, t = e[a];
  return t && typeof t == "object" && !Array.isArray(t) ? t : e;
}
function y(s, a) {
  for (const e of a) {
    const t = s[e];
    if (typeof t == "string" && t.trim()) return t.trim();
  }
  return "";
}
function $(s, a) {
  for (const e of a) {
    const t = s[e];
    if (typeof t == "number" && Number.isFinite(t)) return Math.trunc(t);
    if (typeof t == "string" && t.trim()) {
      const l = Number(t);
      if (Number.isFinite(l)) return Math.trunc(l);
    }
  }
  return null;
}
function z(s) {
  const a = typeof s.family_member_count == "number" ? Math.trunc(s.family_member_count) : Number(s.family_member_count);
  if (Number.isFinite(a) && a > 0) return Math.trunc(a);
  const e = p(s);
  if (e.availableLocales.length > 0) return e.availableLocales.length;
  const t = x(s);
  return t.availableLocales.length > 0 ? t.availableLocales.length : t.resolvedLocale ? 1 : null;
}
function ee(s, a = {}) {
  const e = typeof s.translation_family_url == "string" ? s.translation_family_url.trim() : "";
  if (!e) return '<span class="text-gray-400">-</span>';
  const t = z(s), l = t && t > 0 ? m(`${t} ${t === 1 ? "locale" : "locales"}`, a, "info") : "";
  return `
    <div class="inline-flex items-center gap-2">
      <a href="${j(e)}" class="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">View family</a>
      ${l}
    </div>
  `.trim();
}
function se(s, a = {}) {
  const e = z(s);
  return !e || e <= 0 ? '<span class="text-gray-400">-</span>' : m(`${e} ${e === 1 ? "locale" : "locales"}`, a, "info");
}
function ae(s, a = {}) {
  const e = k(s, "translation_assignment_summary");
  if (!e) return '<span class="text-gray-400">-</span>';
  const t = y(e, ["status"]), l = y(e, ["label"]), r = y(e, ["assignee_id"]), n = y(e, ["priority"]), i = $(e, ["active_count", "open_count"]), o = [];
  return t ? o.push(_(t, {
    domain: "queue",
    size: "sm",
    showIcon: !1
  })) : l && o.push(m(l, a, "info")), i !== null && i >= 0 && o.push(m(`${i} active`, a, "neutral")), r && o.push(m(`@${r}`, a, "neutral")), n && o.push(m(n, a, n === "urgent" || n === "high" ? "warning" : "neutral")), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${o.join("")}</div>`;
}
function te(s, a = {}) {
  const e = k(s, "translation_exchange_summary");
  if (!e) return '<span class="text-gray-400">-</span>';
  const t = y(e, ["status", "last_job_status"]), l = y(e, ["label", "last_job_label"]), r = $(e, ["pending_count"]), n = $(e, ["error_count"]), i = [];
  return t ? i.push(_(t, {
    domain: "exchange",
    size: "sm",
    showIcon: !1
  })) : l && i.push(m(l, a, "info")), r !== null && r >= 0 && i.push(m(`${r} pending`, a, "neutral")), n !== null && n > 0 && i.push(m(`${n} errors`, a, "warning")), i.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${i.join("")}</div>`;
}
function p(s) {
  const a = {
    familyId: null,
    requiredLocales: [],
    availableLocales: [],
    missingRequiredLocales: [],
    missingRequiredFieldsByLocale: {},
    readinessState: null,
    readyForTransition: {},
    evaluatedChannel: null,
    hasReadinessMetadata: !1
  };
  if (!s || typeof s != "object") return a;
  const e = s.translation_readiness;
  if (e && typeof e == "object") {
    a.hasReadinessMetadata = !0, a.familyId = g(s, ["translation_readiness.family_id", "family_id"]), a.requiredLocales = Array.isArray(e.required_locales) ? e.required_locales.filter((n) => typeof n == "string") : [], a.availableLocales = Array.isArray(e.available_locales) ? e.available_locales.filter((n) => typeof n == "string") : [], a.missingRequiredLocales = Array.isArray(e.missing_required_locales) ? e.missing_required_locales.filter((n) => typeof n == "string") : [];
    const t = e.missing_required_fields_by_locale;
    if (t && typeof t == "object" && !Array.isArray(t))
      for (const [n, i] of Object.entries(t)) Array.isArray(i) && (a.missingRequiredFieldsByLocale[n] = i.filter((o) => typeof o == "string"));
    const l = e.readiness_state;
    typeof l == "string" && H(l) && (a.readinessState = l);
    const r = e.ready_for_transition;
    if (r && typeof r == "object" && !Array.isArray(r))
      for (const [n, i] of Object.entries(r)) typeof i == "boolean" && (a.readyForTransition[n] = i);
    a.evaluatedChannel = typeof e.evaluated_channel == "string" ? e.evaluated_channel : null;
  }
  return a;
}
function ne(s) {
  return p(s).hasReadinessMetadata;
}
function le(s, a) {
  return p(s).readyForTransition[a] === !0;
}
function H(s) {
  return [
    "ready",
    "missing_locales",
    "missing_fields",
    "missing_locales_and_fields"
  ].includes(s);
}
function S(s, a = {}) {
  const e = "resolvedLocale" in s ? s : x(s), { showFallbackIndicator: t = !0, size: l = "default", extraClass: r = "" } = a;
  if (!e.resolvedLocale) return "";
  const n = e.resolvedLocale.toUpperCase(), i = e.fallbackUsed || e.missingRequestedLocale, o = `inline-flex items-center gap-1 rounded font-medium ${l === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return i && t ? `<span class="${o} bg-amber-100 text-amber-800 ${r}"
                  title="Showing ${e.resolvedLocale} content (${e.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${n}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${n}
    </span>` : `<span class="${o} bg-blue-100 text-blue-800 ${r}"
                title="Locale: ${n}"
                aria-label="Locale: ${n}">
    ${n}
  </span>`;
}
function D(s, a = {}) {
  const e = "resolvedLocale" in s ? s : x(s), { maxLocales: t = 3, size: l = "default" } = a;
  if (e.availableLocales.length === 0) return "";
  const r = l === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", n = l === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", i = e.availableLocales.slice(0, t), o = e.availableLocales.length - t, c = i.map((d) => `<span class="${d === e.resolvedLocale ? `${n} rounded bg-blue-100 text-blue-700 font-medium` : `${n} rounded bg-gray-100 text-gray-600`}">${d.toUpperCase()}</span>`).join(""), u = o > 0 ? `<span class="${n} rounded bg-gray-100 text-gray-500">+${o}</span>` : "";
  return `<span class="inline-flex items-center ${r}"
                title="Available locales: ${e.availableLocales.join(", ")}"
                aria-label="Available locales: ${e.availableLocales.join(", ")}">
    ${c}${u}
  </span>`;
}
function E(s, a = {}) {
  const e = "resolvedLocale" in s ? s : x(s), { showResolvedLocale: t = !0, size: l = "default" } = a, r = [];
  return t && e.resolvedLocale && r.push(S(e, {
    size: l,
    showFallbackIndicator: !0
  })), e.availableLocales.length > 1 && r.push(D(e, {
    ...a,
    size: l
  })), r.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${l === "sm" ? "gap-1" : "gap-2"}">${r.join("")}</div>`;
}
function ie(s, a = "default") {
  if (!s) return "";
  const e = s.trim();
  if (C(e) !== null) return _(e, { size: a === "sm" ? "sm" : "default" });
  const t = e.toLowerCase();
  return N(s, "status", t, { size: a === "sm" ? "sm" : void 0 });
}
function re(s, a = {}) {
  const e = p(s);
  if (!e.hasReadinessMetadata) return "";
  const { size: t = "default", showDetailedTooltip: l = !0, extraClass: r = "" } = a, n = `inline-flex items-center gap-1 rounded font-medium ${t === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, i = e.readinessState || "ready", { icon: o, label: c, bgClass: u, textClass: d, tooltip: f } = Z(i, e, l);
  return `<span class="${n} ${u} ${d} ${r}"
                title="${f}"
                aria-label="${c}"
                data-readiness-state="${i}">
    ${o}
    <span>${c}</span>
  </span>`;
}
function oe(s, a = {}) {
  const e = p(s);
  if (!e.hasReadinessMetadata) return "";
  const t = e.readyForTransition.publish === !0, { size: l = "default", extraClass: r = "" } = a, n = l === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (t) return `<span class="inline-flex items-center gap-1 rounded font-medium ${n} bg-green-100 text-green-700 ${r}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const i = e.missingRequiredLocales.length;
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${n} bg-amber-100 text-amber-700 ${r}"
                title="${i > 0 ? `Missing translations: ${e.missingRequiredLocales.join(", ")}` : "Not ready to publish"}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${i > 0 ? `${i} missing` : "Not ready"}
  </span>`;
}
function ce(s, a = {}) {
  const e = p(s);
  if (!e.hasReadinessMetadata || e.requiredLocales.length === 0) return "";
  const { size: t = "default", extraClass: l = "" } = a, r = t === "sm" ? "text-xs" : "text-sm", n = e.requiredLocales.length, i = e.availableLocales.filter((o) => e.requiredLocales.includes(o)).length;
  return `<span class="${r} ${n > 0 && i === n ? "text-green-600" : i > 0 ? "text-amber-600" : "text-gray-500"} font-medium ${l}"
                title="Locale completeness: ${i} of ${n} required locales available"
                aria-label="${i} of ${n} locales">
    ${i}/${n}
  </span>`;
}
function ue(s, a = {}) {
  const e = p(s);
  if (!e.hasReadinessMetadata || e.readinessState === "ready") return "";
  const { size: t = "default", extraClass: l = "" } = a, r = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", n = e.missingRequiredLocales.length, i = n > 0, o = Object.keys(e.missingRequiredFieldsByLocale).length > 0;
  let c = "", u = "", d = "";
  if (i && o ? (c = "missing_locales_and_fields", u = `${n} missing`, d = `Missing translations: ${e.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : i ? (c = "missing_locales", u = `${n} missing`, d = `Missing translations: ${e.missingRequiredLocales.join(", ")}`) : o && (c = "missing_fields", u = "Incomplete", d = `Incomplete fields in: ${Object.keys(e.missingRequiredFieldsByLocale).join(", ")}`), !u) return "";
  const f = C(c, "core");
  return `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${r} ${f?.bgClass || "bg-amber-50"} ${f?.textClass || "text-amber-700"} ${l}"
                title="${d}"
                aria-label="${d}"
                data-missing-translations="true"
                data-missing-count="${n}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>`;
}
function de(s) {
  const a = p(s);
  return a.hasReadinessMetadata ? a.readinessState !== "ready" : !1;
}
function fe(s) {
  return p(s).missingRequiredLocales.length;
}
function Z(s, a, e) {
  const t = C(s, "core"), l = t ? B(t, "sm") : "", r = t?.bgClass || "bg-gray-100", n = t?.textClass || "text-gray-600", i = t?.label || "Unknown", o = t?.description || "Unknown readiness state";
  switch (s) {
    case "ready":
      return {
        icon: l,
        label: i,
        bgClass: r,
        textClass: n,
        tooltip: o
      };
    case "missing_locales": {
      const c = a.missingRequiredLocales, u = e && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: l,
        label: `${c.length} missing`,
        bgClass: r,
        textClass: n,
        tooltip: u
      };
    }
    case "missing_fields": {
      const c = Object.keys(a.missingRequiredFieldsByLocale);
      return {
        icon: l,
        label: "Incomplete",
        bgClass: r,
        textClass: n,
        tooltip: e && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields"
      };
    }
    case "missing_locales_and_fields": {
      const c = a.missingRequiredLocales, u = Object.keys(a.missingRequiredFieldsByLocale), d = [];
      return c.length > 0 && d.push(`Missing: ${c.join(", ")}`), u.length > 0 && d.push(`Incomplete: ${u.join(", ")}`), {
        icon: l,
        label: "Not ready",
        bgClass: r,
        textClass: n,
        tooltip: e ? d.join("; ") : "Missing translations and incomplete fields"
      };
    }
    default:
      return {
        icon: l,
        label: i,
        bgClass: r,
        textClass: n,
        tooltip: o
      };
  }
}
function W(s, a = {}) {
  const { size: e = "sm", maxLocales: t = 5, showLabels: l = !1 } = a, r = p(s);
  if (!r.hasReadinessMetadata) return '<span class="text-gray-400">-</span>';
  const { requiredLocales: n, availableLocales: i, missingRequiredFieldsByLocale: o } = r, c = n.length > 0 ? n : i;
  if (c.length === 0) return '<span class="text-gray-400">-</span>';
  const u = new Set(i), d = Y(o);
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${c.slice(0, t).map((f) => {
    const R = u.has(f), w = R && d.has(f), A = R && !w;
    let h, v, b;
    A ? (h = "bg-green-100 text-green-700 border-green-300", v = "●", b = "Complete") : w ? (h = "bg-amber-100 text-amber-700 border-amber-300", v = "◐", b = "Incomplete") : (h = "bg-white text-gray-400 border-gray-300 border-dashed", v = "○", b = "Missing");
    const I = e === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", T = l ? `<span class="font-medium">${f.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${I} rounded border ${h}"
              title="${f.toUpperCase()}: ${b}"
              aria-label="${f.toUpperCase()}: ${b}"
              data-locale="${f}"
              data-state="${b.toLowerCase()}">
          ${T}
          <span aria-hidden="true">${v}</span>
        </span>
      `;
  }).join("")}${c.length > t ? `<span class="text-[10px] text-gray-500" title="${c.length - t} more locales">+${c.length - t}</span>` : ""}</div>`;
}
function Y(s) {
  const a = /* @__PURE__ */ new Set();
  if (s && typeof s == "object")
    for (const [e, t] of Object.entries(s)) Array.isArray(t) && t.length > 0 && a.add(e);
  return a;
}
function pe(s = {}) {
  return (a, e, t) => W(e, s);
}
function me(s, a = {}) {
  if (!s.fallbackUsed && !s.missingRequestedLocale) return "";
  const { showCreateButton: e = !0, createTranslationUrl: t, panelName: l } = a, r = s.requestedLocale || "requested locale", n = s.resolvedLocale || "default", i = e ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${s.requestedLocale || ""}"
            data-panel="${l || ""}"
            data-record-id="${s.recordId || ""}"
            ${t ? `data-url="${t}"` : ""}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${r.toUpperCase()} translation
    </button>
  ` : "";
  return `
    <div class="fallback-warning bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
         role="alert"
         aria-live="polite"
         data-fallback-mode="true"
         data-requested-locale="${s.requestedLocale || ""}"
         data-resolved-locale="${s.resolvedLocale || ""}">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-amber-800">
            Viewing fallback content
          </h3>
          <p class="mt-1 text-sm text-amber-700">
            The <strong>${r.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${n.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${i ? `<div class="mt-3">${i}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function ge(s = {}) {
  return (a, e, t) => E(e, s);
}
function be(s = {}) {
  return (a, e, t) => S(e, s);
}
function g(s, a) {
  for (const e of a) {
    const t = q(s, e);
    if (typeof t == "string" && t.trim()) return t;
  }
  return null;
}
function K(s, a) {
  for (const e of a) {
    const t = q(s, e);
    if (Array.isArray(t)) return t.filter((l) => typeof l == "string");
  }
  return [];
}
function M(s, a) {
  for (const e of a) {
    const t = q(s, e);
    if (typeof t == "boolean") return t;
    if (t === "true") return !0;
    if (t === "false") return !1;
  }
  return !1;
}
function q(s, a) {
  const e = a.split(".");
  let t = s;
  for (const l of e) {
    if (t == null || typeof t != "object") return;
    t = t[l];
  }
  return t;
}
export {
  se as C,
  G as D,
  N as E,
  ee as S,
  E as T,
  oe as _,
  p as a,
  ae as b,
  Q as c,
  le as d,
  D as f,
  ue as g,
  ce as h,
  x as i,
  ne as l,
  S as m,
  pe as n,
  fe as o,
  me as p,
  ge as r,
  de as s,
  be as t,
  J as u,
  re as v,
  W as w,
  te as x,
  ie as y
};

//# sourceMappingURL=translation-context-H88GQogn.js.map
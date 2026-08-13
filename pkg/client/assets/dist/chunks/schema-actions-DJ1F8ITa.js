import { createLogger as D } from "../shared/logger.js";
import { createStructuredActionError as L, executeActionRequest as O, extractTranslationBlocker as P, formatStructuredErrorForDisplay as R, isTranslationBlocker as $ } from "../toast/error-helpers.js";
import { n as F, t as q } from "./action-execution-CY7Ol7m3.js";
import { F as I, u as E } from "./translation-status-vocabulary-NKPjpKF9.js";
var x = D("DataGrid");
function N(e) {
  const t = e.trim(), n = t.indexOf("?");
  return n === -1 ? {
    path: t,
    query: ""
  } : {
    path: t.slice(0, n),
    query: t.slice(n + 1)
  };
}
function g(e, t, n = "", r = "") {
  const { path: o, query: i } = N(e), s = o.replace(/\/+$/, ""), a = n.replace(/^\/+/, "");
  let c = `${s}/${encodeURIComponent(t)}`;
  a && (c += `/${a}`);
  const l = [];
  return i && l.push(i), r && l.push(r), l.length > 0 ? `${c}?${l.join("&")}` : c;
}
var v = {
  view: 100,
  view_family: 150,
  edit: 200,
  duplicate: 300,
  create_translation: 400,
  publish: 500,
  unpublish: 600,
  submit: 700,
  approve: 800,
  reject: 900,
  archive: 1e3,
  restore: 1100,
  delete: 9e3
}, j = 5e3, k = class {
  constructor(e) {
    this.seenActions = /* @__PURE__ */ new Set(), this.config = {
      useDefaultFallback: !0,
      appendDefaultActions: !1,
      actionContext: "row",
      ...e
    };
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || null;
  }
  buildRowActions(e, t) {
    this.seenActions.clear();
    const n = [];
    let r = 0;
    const o = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const i of t) {
        if (!i.name) continue;
        const s = this.resolveRecordActionState(e, i.name);
        if (!this.shouldIncludeAction(e, i, s)) continue;
        const a = i.name.toLowerCase();
        if (this.seenActions.has(a)) continue;
        this.seenActions.add(a);
        const c = this.normalizeContextBoundActionState(e, i, s), l = this.buildActionFromSchema(e, i, o, c);
        l && n.push({
          action: l,
          name: i.name,
          order: this.resolveActionOrder(i.name, i.order),
          insertionIndex: r++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(n, e, o, r);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(n, e, o, r);
    return n.sort((i, s) => i.order !== s.order ? i.order - s.order : i.insertionIndex - s.insertionIndex), n.map((i) => i.action);
  }
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t)) return t;
    const n = e.toLowerCase();
    return this.config.actionOrderOverride?.[n] !== void 0 ? this.config.actionOrderOverride[n] : v[n] !== void 0 ? v[n] : j;
  }
  buildActionFromSchema(e, t, n, r) {
    const o = t.name, i = t.label || t.label_key || o, s = t.variant || "secondary", a = t.icon, c = this.isNavigationAction(t), l = o === "delete";
    return c ? this.applyActionState(this.buildNavigationAction(e, t, i, s, a, n), r) : l ? this.applyActionState(this.buildDeleteAction(e, i, s, a), r) : this.applyActionState(this.buildPostAction(e, t, i, s, a), r);
  }
  isNavigationAction(e) {
    return e.type === "navigation" || e.href ? !0 : [
      "view",
      "edit",
      "show",
      "details"
    ].includes(e.name.toLowerCase());
  }
  shouldIncludeAction(e, t, n) {
    return this.matchesActionScope(t.scope) ? this.missingRequiredContext(e, t).length === 0 ? !0 : n !== null : !1;
  }
  resolveRecordActionState(e, t) {
    return I(e, t);
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1) return e;
    const n = this.disabledReason(t);
    return {
      ...e,
      disabled: !0,
      disabledReason: n,
      disabledReasonCode: typeof t.reason_code == "string" ? t.reason_code : void 0,
      disabledSeverity: typeof t.severity == "string" ? t.severity : void 0,
      disabledKind: typeof t.kind == "string" ? t.kind : void 0,
      remediation: this.normalizeRemediation(t.remediation)
    };
  }
  normalizeRemediation(e) {
    if (!e || typeof e != "object") return null;
    const t = typeof e.label == "string" ? e.label.trim() : "", n = typeof e.href == "string" ? e.href.trim() : "", r = typeof e.kind == "string" ? e.kind.trim() : "";
    return !t && !n && !r ? null : {
      ...t ? { label: t } : {},
      ...n ? { href: n } : {},
      ...r ? { kind: r } : {}
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t) return t;
    const n = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (n) {
      const r = E({ reason_code: n });
      if (r?.message) return r.message;
    }
    switch (n.toLowerCase()) {
      case "workflow_transition_not_available":
      case "invalid_status":
        return "Action is not available in the current workflow state.";
      case "permission_denied":
        return "You do not have permission to execute this action.";
      case "missing_context_required":
      case "missing_context":
        return "Action is unavailable because required record context is missing.";
      case "translation_missing":
        return "Required translations are missing.";
      case "feature_disabled":
        return "This feature is currently disabled.";
      default:
        return "Action is currently unavailable.";
    }
  }
  matchesActionScope(e) {
    const t = typeof e == "string" ? e.trim().toLowerCase() : "";
    return !t || t === "all" ? !0 : t === (this.config.actionContext || "row").toLowerCase();
  }
  missingRequiredContext(e, t) {
    const n = Array.isArray(t.context_required) ? t.context_required : [];
    if (n.length === 0) return [];
    const r = [];
    for (const o of n) {
      const i = typeof o == "string" ? o.trim() : "";
      if (!i) continue;
      const s = this.resolveRecordContextValue(e, i);
      this.isEmptyPayloadValue(s) && r.push(i);
    }
    return r;
  }
  normalizeContextBoundActionState(e, t, n) {
    const r = this.missingRequiredContext(e, t);
    return r.length === 0 || n && n.enabled === !1 ? n : {
      enabled: !1,
      reason: "record does not include required context for this action",
      reason_code: "missing_context_required",
      metadata: {
        missing_context_fields: r,
        required_context_fields: Array.isArray(t.context_required) ? [...t.context_required] : []
      }
    };
  }
  resolveRecordContextValue(e, t) {
    const n = t.trim();
    if (!n) return;
    if (!n.includes(".")) return e[n];
    const r = n.split(".").map((i) => i.trim()).filter(Boolean);
    if (r.length === 0) return;
    let o = e;
    for (const i of r) {
      if (!o || typeof o != "object" || Array.isArray(o)) return;
      o = o[i];
    }
    return o;
  }
  buildNavigationAction(e, t, n, r, o, i) {
    const s = String(e.id || ""), a = this.config.actionBasePath;
    let c;
    if (t.href) {
      const l = this.interpolateHrefTemplate(t.href, e, s);
      i ? c = l.includes("?") ? `${l}&${i}` : `${l}?${i}` : c = l;
    } else t.name === "edit" ? c = g(a, s, "edit", i) : c = g(a, s, "", i);
    return {
      id: t.name,
      label: n,
      icon: o || this.getDefaultIcon(t.name),
      variant: r,
      action: () => {
        window.location.href = c;
      }
    };
  }
  interpolateHrefTemplate(e, t, n) {
    const r = e.trim();
    return r && r.replace(/\{([^}]+)\}/g, (o, i) => {
      const s = String(i || "").trim();
      if (!s) return "";
      if (s === "id") return n;
      const a = this.resolveRecordContextValue(t, s);
      return a == null ? "" : String(a);
    });
  }
  buildDeleteAction(e, t, n, r) {
    const o = String(e.id || ""), i = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: r || "trash",
      variant: n === "secondary" ? "danger" : n,
      action: async () => {
        await q({
          endpoint: `${i}/${o}`,
          fallbackMessage: "Delete failed",
          onSuccess: async (s) => {
            this.config.onActionSuccess?.("delete", {
              success: !0,
              data: s.data
            });
          },
          onError: async (s) => {
            this.config.onActionError?.("delete", s);
          },
          reconcileOnDomainFailure: async (s) => {
            s.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure("delete", s);
          }
        });
      }
    };
  }
  buildPostAction(e, t, n, r, o) {
    const i = String(e.id || ""), s = t.name, a = `${this.config.apiEndpoint}/actions/${s}`;
    return {
      id: s,
      label: n,
      icon: o || this.getDefaultIcon(s),
      variant: r,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const c = await this.buildActionPayload(e, t);
        c !== null && await this.executePostAction({
          actionName: s,
          endpoint: a,
          payload: c,
          recordId: i
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await O(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && $(t.error)) {
      const n = P(t.error);
      if (n && this.config.onTranslationBlocker) {
        const r = { ...e.payload }, o = this.getContentChannel() || n.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...n,
          channel: o,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...r },
            recordId: e.recordId
          })
        }), {
          success: !1,
          error: t.error
        };
      }
    }
    return await this.handleStructuredActionFailure(e.actionName, t, `${e.actionName} failed`), {
      success: !1,
      error: t.error
    };
  }
  handleActionRedirectSuccess(e) {
    if (!e || typeof window > "u") return !1;
    const t = typeof e.redirect_path == "string" ? e.redirect_path.trim() : "";
    if (t)
      return window.location.href = t, !0;
    const n = typeof e.redirect_record_id == "string" ? e.redirect_record_id.trim() : "";
    if (!n) return !1;
    const r = e.redirect_to_edit === !0 || e.mode === "redirect", o = this.buildQueryContext(), i = g(this.config.actionBasePath, n, r ? "edit" : "", o);
    return window.location.href = i, !0;
  }
  async handleStructuredActionFailure(e, t, n) {
    if (!t.error) return t;
    const r = this.buildActionErrorMessage(e, t.error), o = {
      ...t.error,
      message: r
    };
    throw o.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, o), this.config.onActionError?.(e, o), L(o, n, !!this.config.onActionError);
  }
  handleCreateTranslationSuccess(e, t) {
    const n = typeof e.id == "string" ? e.id : String(e.id || ""), r = typeof e.locale == "string" ? e.locale : "";
    if (!n) {
      x.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const o = this.config.actionBasePath, i = new URLSearchParams();
    r && i.set("locale", r);
    const s = this.getContentChannel();
    s && i.set("channel", s);
    const a = i.toString(), c = `${o}/${n}/edit${a ? `?${a}` : ""}`, l = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", h = this.localeLabel(r || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${h} translation created`, { action: {
      label: `View ${l.toUpperCase()}`,
      handler: () => {
        const u = new URLSearchParams();
        u.set("locale", l), s && u.set("channel", s);
        const p = typeof t.id == "string" ? t.id : String(t.id || n);
        window.location.href = `${o}/${p}/edit?${u.toString()}`;
      }
    } }) : x.debug(`[SchemaActionBuilder] Translation created: ${r}`), window.location.href = c;
  }
  async buildActionPayload(e, t) {
    const n = t.name.trim().toLowerCase(), r = { id: e.id };
    this.config.locale && n !== "create_translation" && (r.locale = this.config.locale);
    const o = this.getContentChannel();
    if (o && (r.channel = o), this.config.panelName && (r.policy_entity = this.config.panelName), r.expected_version === void 0) {
      const l = this.resolveExpectedVersion(e);
      l !== null && (r.expected_version = l);
    }
    const i = this.normalizePayloadSchema(t.payload_schema), s = this.collectRequiredFields(t.payload_required, i);
    if (n === "create_translation" && this.applySchemaTranslationContext(r, e, i), i?.properties)
      for (const [l, h] of Object.entries(i.properties)) r[l] === void 0 && h.default !== void 0 && (r[l] = h.default);
    s.includes("idempotency_key") && this.isEmptyPayloadValue(r.idempotency_key) && (r.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const a = s.filter((l) => this.isEmptyPayloadValue(r[l]));
    if (a.length === 0) return r;
    const c = await this.promptForPayload(t, a, i, r, e);
    if (c === null) return null;
    for (const l of a) {
      const h = i?.properties?.[l], u = c[l] ?? "", p = this.coercePromptValue(u, l, h);
      if (p.error) throw new Error(p.error);
      r[l] = p.value;
    }
    return r;
  }
  async promptForPayload(e, t, n, r, o) {
    if (t.length === 0) return {};
    const i = t.map((s) => {
      const a = n?.properties?.[s];
      return {
        name: s,
        label: a?.title || s,
        description: a?.description,
        value: this.stringifyDefault(r[s] ?? a?.default),
        type: a?.type || "string",
        options: this.buildFieldOptions(s, e.name, a, o, r)
      };
    });
    return await F.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: i
    });
  }
  buildFieldOptions(e, t, n, r, o) {
    const i = this.deriveCreateTranslationLocaleOptions(e, t, r, n, o);
    if (i && i.length > 0) return i;
    if (!n) return;
    if (n.oneOf) return n.oneOf.filter((a) => a && "const" in a).map((a) => ({
      value: this.stringifyDefault(a.const),
      label: a.title || this.stringifyDefault(a.const)
    }));
    if (n.enum) return n.enum.map((a) => ({
      value: this.stringifyDefault(a),
      label: this.stringifyDefault(a)
    }));
    const s = this.buildExtensionFieldOptions(n);
    if (s && s.length > 0) return s;
  }
  buildExtensionFieldOptions(e) {
    const t = e, n = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(n) || n.length === 0) return;
    const r = [];
    for (const o of n) {
      if (typeof o == "string") {
        const l = this.stringifyDefault(o);
        if (!l) continue;
        r.push({
          value: l,
          label: l
        });
        continue;
      }
      if (!o || typeof o != "object") continue;
      const i = o.value, s = this.stringifyDefault(i);
      if (!s) continue;
      const a = o.label, c = this.stringifyDefault(a) || s;
      r.push({
        value: s,
        label: c
      });
    }
    return r.length > 0 ? r : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, n, r, o) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !n || typeof n != "object") return;
    const i = this.asObject(n.translation_readiness), s = o && typeof o == "object" ? o : {};
    let a = this.asStringArray(s.missing_locales);
    if (a.length === 0 && (a = this.asStringArray(i?.missing_required_locales)), a.length === 0 && (a = this.asStringArray(n.missing_locales)), a.length === 0 && i) {
      const f = this.asStringArray(i.required_locales), d = new Set(this.asStringArray(i.available_locales));
      a = f.filter((m) => !d.has(m));
    }
    const c = this.asStringArray(r?.enum);
    if (c.length > 0) {
      const f = new Set(c);
      a = a.filter((d) => f.has(d));
    }
    if (a.length === 0) return;
    const l = this.extractStringField(s, "recommended_locale") || this.extractStringField(n, "recommended_locale") || this.extractStringField(i || {}, "recommended_locale"), h = this.asStringArray(s.required_for_publish ?? n.required_for_publish ?? i?.required_for_publish ?? i?.required_locales), u = this.asStringArray(s.existing_locales ?? n.existing_locales ?? i?.available_locales), p = this.createTranslationLocaleLabelMap(r), w = /* @__PURE__ */ new Set(), y = [];
    for (const f of a) {
      const d = f.trim().toLowerCase();
      if (!d || w.has(d)) continue;
      w.add(d);
      const m = l?.toLowerCase() === d, _ = h.includes(d), b = [];
      _ && b.push("Required for publishing"), u.length > 0 && b.push(`${u.length} translation${u.length > 1 ? "s" : ""} exist`);
      const S = b.length > 0 ? b.join(" • ") : void 0, C = p[d] || this.localeLabel(d);
      let A = `${d.toUpperCase()} - ${C}`;
      m && (A += " (recommended)"), y.push({
        value: d,
        label: A,
        description: S,
        recommended: m
      });
    }
    return y.sort((f, d) => f.recommended && !d.recommended ? -1 : !f.recommended && d.recommended ? 1 : f.value.localeCompare(d.value)), y.length > 0 ? y : void 0;
  }
  applySchemaTranslationContext(e, t, n) {
    if (!n) return;
    const r = this.extractTranslationContextMap(n);
    if (Object.keys(r).length !== 0)
      for (const [o, i] of Object.entries(r)) {
        const s = o.trim(), a = i.trim();
        if (!s || !a || !this.isEmptyPayloadValue(e[s])) continue;
        const c = this.resolveRecordContextValue(t, a);
        c != null && (e[s] = this.clonePayloadValue(c));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t)) return {};
    const n = {};
    for (const [r, o] of Object.entries(t)) {
      const i = r.trim(), s = typeof o == "string" ? o.trim() : "";
      !i || !s || (n[i] = s);
    }
    return n;
  }
  clonePayloadValue(e) {
    return Array.isArray(e) ? e.map((t) => this.clonePayloadValue(t)) : e && typeof e == "object" ? { ...e } : e;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e) return t;
    if (Array.isArray(e.oneOf)) for (const o of e.oneOf) {
      const i = this.stringifyDefault(o?.const).trim().toLowerCase();
      if (!i) continue;
      const s = this.stringifyDefault(o?.title).trim();
      s && (t[i] = s);
    }
    const n = e, r = n["x-options"] ?? n.x_options ?? n.xOptions;
    if (Array.isArray(r)) for (const o of r) {
      if (!o || typeof o != "object") continue;
      const i = this.stringifyDefault(o.value).trim().toLowerCase(), s = this.stringifyDefault(o.label).trim();
      i && s && (t[i] = s);
    }
    return t;
  }
  extractStringField(e, t) {
    const n = e[t];
    return typeof n == "string" && n.trim() ? n.trim() : null;
  }
  resolveExpectedVersion(e) {
    const t = [
      e.expected_version,
      e.expectedVersion,
      e.version,
      e._version
    ];
    for (const n of t) {
      if (typeof n == "number" && Number.isFinite(n) && n > 0) return n;
      if (typeof n == "string") {
        const r = n.trim();
        if (!r) continue;
        const o = Number(r);
        if (Number.isFinite(o) && o > 0) return r;
      }
    }
    return null;
  }
  asObject(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? null : e;
  }
  asStringArray(e) {
    return Array.isArray(e) ? e.filter((t) => typeof t == "string").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0) : [];
  }
  localeLabel(e) {
    return {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese"
    }[e] || e.toUpperCase();
  }
  stringifyDefault(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "object") try {
      return JSON.stringify(e);
    } catch {
      return "";
    }
    return String(e);
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let n;
    if (t && typeof t == "object" && !Array.isArray(t)) {
      n = {};
      for (const [a, c] of Object.entries(t)) c && typeof c == "object" && !Array.isArray(c) && (n[a] = c);
    }
    const r = e.required, o = Array.isArray(r) ? r.filter((a) => typeof a == "string").map((a) => a.trim()).filter((a) => a.length > 0) : void 0, i = e["x-translation-context"] ?? e.x_translation_context, s = i && typeof i == "object" && !Array.isArray(i) ? i : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: o,
      properties: n,
      ...s ? { "x-translation-context": s } : {}
    };
  }
  collectRequiredFields(e, t) {
    const n = [], r = /* @__PURE__ */ new Set(), o = (i) => {
      const s = i.trim();
      !s || r.has(s) || (r.add(s), n.push(s));
    };
    return Array.isArray(e) && e.forEach((i) => o(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => o(String(i))), n;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const n = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), r = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), o = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${n || "action"}-${r || "record"}-${o}`;
  }
  coercePromptValue(e, t, n) {
    const r = typeof e == "string" ? e.trim() : String(e ?? "").trim(), o = typeof n?.type == "string" ? n.type.toLowerCase() : "string";
    if (r.length === 0) return { value: r };
    if (o === "number" || o === "integer") {
      const i = Number(r);
      return Number.isFinite(i) ? { value: o === "integer" ? Math.trunc(i) : i } : {
        value: null,
        error: `${t} must be a valid number`
      };
    }
    if (o === "boolean") {
      const i = r.toLowerCase();
      return i === "true" || i === "1" || i === "yes" ? { value: !0 } : i === "false" || i === "0" || i === "no" ? { value: !1 } : {
        value: null,
        error: `${t} must be true or false`
      };
    }
    if (o === "array" || o === "object") try {
      return { value: JSON.parse(r) };
    } catch {
      return {
        value: null,
        error: `${t} must be valid JSON (${o === "array" ? "[...]" : "{...}"})`
      };
    }
    return { value: r };
  }
  buildActionErrorMessage(e, t) {
    return R(t, `${e} failed`);
  }
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  appendDefaultActions(e, t, n) {
    const r = String(t.id || ""), o = this.config.actionBasePath, i = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = g(o, r, "", n);
          }
        }
      },
      {
        name: "edit",
        button: {
          id: "edit",
          label: "Edit",
          icon: "edit",
          variant: "primary",
          action: () => {
            window.location.href = g(o, r, "edit", n);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const s of i) this.seenActions.has(s.name) || (this.seenActions.add(s.name), e.push(s.button));
  }
  appendDefaultActionsOrdered(e, t, n, r) {
    const o = String(t.id || ""), i = this.config.actionBasePath, s = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = g(i, o, "", n);
          }
        }
      },
      {
        name: "edit",
        button: {
          id: "edit",
          label: "Edit",
          icon: "edit",
          variant: "primary",
          action: () => {
            window.location.href = g(i, o, "edit", n);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let a = r;
    for (const c of s) this.seenActions.has(c.name) || (this.seenActions.add(c.name), e.push({
      action: c.button,
      name: c.name,
      order: this.resolveActionOrder(c.name, void 0),
      insertionIndex: a++
    }));
  }
  getDefaultIcon(e) {
    return {
      view: "eye",
      edit: "edit",
      delete: "trash",
      publish: "check-circle",
      unpublish: "x-circle",
      archive: "archive",
      restore: "archive",
      duplicate: "copy",
      create_translation: "copy",
      view_family: "git-branch",
      approve: "check-circle",
      reject: "x-circle",
      submit: "check-circle"
    }[e.toLowerCase()];
  }
};
function U(e, t, n) {
  return new k(n).buildRowActions(e, t);
}
function M(e) {
  return e.schema?.actions;
}
export {
  U as n,
  M as r,
  k as t
};

//# sourceMappingURL=schema-actions-DJ1F8ITa.js.map
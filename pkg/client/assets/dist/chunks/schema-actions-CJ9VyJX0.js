import { createLogger as A } from "../shared/logger.js";
import { t as x } from "./modal-ClEsOn-S.js";
import { createStructuredActionError as v, executeActionRequest as _, extractTranslationBlocker as S, formatStructuredErrorForDisplay as C, isTranslationBlocker as D } from "../toast/error-helpers.js";
import { n as L, t as O } from "./action-execution-Bc4l1JsL.js";
import { F as P, u as R } from "./translation-status-vocabulary-NKPjpKF9.js";
var y = A("DataGrid");
function $(e) {
  const t = e.trim(), n = t.indexOf("?");
  return n === -1 ? {
    path: t,
    query: ""
  } : {
    path: t.slice(0, n),
    query: t.slice(n + 1)
  };
}
function m(e, t, n = "", i = "") {
  const { path: o, query: r } = $(e), s = o.replace(/\/+$/, ""), a = n.replace(/^\/+/, "");
  let c = `${s}/${encodeURIComponent(t)}`;
  a && (c += `/${a}`);
  const l = [];
  return r && l.push(r), i && l.push(i), l.length > 0 ? `${c}?${l.join("&")}` : c;
}
var b = {
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
}, F = 5e3, q = class {
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
    let i = 0;
    const o = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const r of t) {
        if (!r.name) continue;
        const s = this.resolveRecordActionState(e, r.name);
        if (!this.shouldIncludeAction(e, r, s)) continue;
        const a = r.name.toLowerCase();
        if (this.seenActions.has(a)) continue;
        this.seenActions.add(a);
        const c = this.normalizeContextBoundActionState(e, r, s), l = this.buildActionFromSchema(e, r, o, c);
        l && n.push({
          action: l,
          name: r.name,
          order: this.resolveActionOrder(r.name, r.order),
          insertionIndex: i++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(n, e, o, i);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(n, e, o, i);
    return n.sort((r, s) => r.order !== s.order ? r.order - s.order : r.insertionIndex - s.insertionIndex), n.map((r) => r.action);
  }
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t)) return t;
    const n = e.toLowerCase();
    return this.config.actionOrderOverride?.[n] !== void 0 ? this.config.actionOrderOverride[n] : b[n] !== void 0 ? b[n] : F;
  }
  buildActionFromSchema(e, t, n, i) {
    const o = t.name, r = t.label || t.label_key || o, s = t.variant || "secondary", a = t.icon, c = this.isNavigationAction(t), l = o === "delete";
    return c ? this.applyActionState(this.buildNavigationAction(e, t, r, s, a, n), i) : l ? this.applyActionState(this.buildDeleteAction(e, r, s, a), i) : this.applyActionState(this.buildPostAction(e, t, r, s, a), i);
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
    return P(e, t);
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
    const t = typeof e.label == "string" ? e.label.trim() : "", n = typeof e.href == "string" ? e.href.trim() : "", i = typeof e.kind == "string" ? e.kind.trim() : "";
    return !t && !n && !i ? null : {
      ...t ? { label: t } : {},
      ...n ? { href: n } : {},
      ...i ? { kind: i } : {}
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t) return t;
    const n = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (n) {
      const i = R({ reason_code: n });
      if (i?.message) return i.message;
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
    const i = [];
    for (const o of n) {
      const r = typeof o == "string" ? o.trim() : "";
      if (!r) continue;
      const s = this.resolveRecordContextValue(e, r);
      this.isEmptyPayloadValue(s) && i.push(r);
    }
    return i;
  }
  normalizeContextBoundActionState(e, t, n) {
    const i = this.missingRequiredContext(e, t);
    return i.length === 0 || n && n.enabled === !1 ? n : {
      enabled: !1,
      reason: "record does not include required context for this action",
      reason_code: "missing_context_required",
      metadata: {
        missing_context_fields: i,
        required_context_fields: Array.isArray(t.context_required) ? [...t.context_required] : []
      }
    };
  }
  resolveRecordContextValue(e, t) {
    const n = t.trim();
    if (!n) return;
    if (!n.includes(".")) return e[n];
    const i = n.split(".").map((r) => r.trim()).filter(Boolean);
    if (i.length === 0) return;
    let o = e;
    for (const r of i) {
      if (!o || typeof o != "object" || Array.isArray(o)) return;
      o = o[r];
    }
    return o;
  }
  buildNavigationAction(e, t, n, i, o, r) {
    const s = String(e.id || ""), a = this.config.actionBasePath;
    let c;
    if (t.href) {
      const l = this.interpolateHrefTemplate(t.href, e, s);
      r ? c = l.includes("?") ? `${l}&${r}` : `${l}?${r}` : c = l;
    } else t.name === "edit" ? c = m(a, s, "edit", r) : c = m(a, s, "", r);
    return {
      id: t.name,
      label: n,
      icon: o || this.getDefaultIcon(t.name),
      variant: i,
      action: () => {
        window.location.href = c;
      }
    };
  }
  interpolateHrefTemplate(e, t, n) {
    const i = e.trim();
    return i && i.replace(/\{([^}]+)\}/g, (o, r) => {
      const s = String(r || "").trim();
      if (!s) return "";
      if (s === "id") return n;
      const a = this.resolveRecordContextValue(t, s);
      return a == null ? "" : String(a);
    });
  }
  buildDeleteAction(e, t, n, i) {
    const o = String(e.id || ""), r = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: i || "trash",
      variant: n === "secondary" ? "danger" : n,
      action: async () => {
        await O({
          endpoint: `${r}/${o}`,
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
  buildPostAction(e, t, n, i, o) {
    const r = String(e.id || ""), s = t.name, a = `${this.config.apiEndpoint}/actions/${s}`;
    return {
      id: s,
      label: n,
      icon: o || this.getDefaultIcon(s),
      variant: i,
      action: async () => {
        if (t.confirm && !await x.confirm(t.confirm, {
          title: `Confirm ${n}`,
          confirmText: n,
          confirmVariant: i === "danger" ? "danger" : "primary"
        }))
          return;
        const c = await this.buildActionPayload(e, t);
        c !== null && await this.executePostAction({
          actionName: s,
          endpoint: a,
          payload: c,
          recordId: r
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await _(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && D(t.error)) {
      const n = S(t.error);
      if (n && this.config.onTranslationBlocker) {
        const i = { ...e.payload }, o = this.getContentChannel() || n.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...n,
          channel: o,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...i },
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
    const i = e.redirect_to_edit === !0 || e.mode === "redirect", o = this.buildQueryContext(), r = m(this.config.actionBasePath, n, i ? "edit" : "", o);
    return window.location.href = r, !0;
  }
  async handleStructuredActionFailure(e, t, n) {
    if (!t.error) return t;
    const i = this.buildActionErrorMessage(e, t.error), o = {
      ...t.error,
      message: i
    };
    throw o.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, o), this.config.onActionError?.(e, o), v(o, n, !!this.config.onActionError);
  }
  handleCreateTranslationSuccess(e, t) {
    const n = typeof e.id == "string" ? e.id : String(e.id || ""), i = typeof e.locale == "string" ? e.locale : "";
    if (!n) {
      y.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const o = this.config.actionBasePath, r = new URLSearchParams();
    i && r.set("locale", i);
    const s = this.getContentChannel();
    s && r.set("channel", s);
    const a = r.toString(), c = `${o}/${n}/edit${a ? `?${a}` : ""}`, l = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", u = this.localeLabel(i || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${u} translation created`, { action: {
      label: `View ${l.toUpperCase()}`,
      handler: () => {
        const d = new URLSearchParams();
        d.set("locale", l), s && d.set("channel", s);
        const h = typeof t.id == "string" ? t.id : String(t.id || n);
        window.location.href = `${o}/${h}/edit?${d.toString()}`;
      }
    } }) : y.debug(`[SchemaActionBuilder] Translation created: ${i}`), window.location.href = c;
  }
  async buildActionPayload(e, t) {
    const n = t.name.trim().toLowerCase(), i = { id: e.id };
    this.config.locale && n !== "create_translation" && (i.locale = this.config.locale);
    const o = this.getContentChannel();
    if (o && (i.channel = o), this.config.panelName && (i.policy_entity = this.config.panelName), i.expected_version === void 0) {
      const l = this.resolveExpectedVersion(e);
      l !== null && (i.expected_version = l);
    }
    const r = this.normalizePayloadSchema(t.payload_schema), s = this.collectRequiredFields(t.payload_required, r);
    if (n === "create_translation" && this.applySchemaTranslationContext(i, e, r), r?.properties)
      for (const [l, u] of Object.entries(r.properties)) i[l] === void 0 && u.default !== void 0 && (i[l] = u.default);
    s.includes("idempotency_key") && this.isEmptyPayloadValue(i.idempotency_key) && (i.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const a = s.filter((l) => this.isEmptyPayloadValue(i[l]));
    if (a.length === 0) return i;
    const c = await this.promptForPayload(t, a, r, i, e);
    if (c === null) return null;
    for (const l of a) {
      const u = r?.properties?.[l], d = c[l] ?? "", h = this.coercePromptValue(d, l, u);
      if (h.error) throw new Error(h.error);
      i[l] = h.value;
    }
    return i;
  }
  async promptForPayload(e, t, n, i, o) {
    if (t.length === 0) return {};
    const r = t.map((s) => {
      const a = n?.properties?.[s];
      return {
        name: s,
        label: a?.title || s,
        description: a?.description,
        value: this.stringifyDefault(i[s] ?? a?.default),
        type: a?.type || "string",
        options: this.buildFieldOptions(s, e.name, a, o, i)
      };
    });
    return await L.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: r
    });
  }
  buildFieldOptions(e, t, n, i, o) {
    const r = this.deriveCreateTranslationLocaleOptions(e, t, i, n, o);
    if (r && r.length > 0) return r;
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
    const i = [];
    for (const o of n) {
      if (typeof o == "string") {
        const l = this.stringifyDefault(o);
        if (!l) continue;
        i.push({
          value: l,
          label: l
        });
        continue;
      }
      if (!o || typeof o != "object") continue;
      const r = o.value, s = this.stringifyDefault(r);
      if (!s) continue;
      const a = o.label, c = this.stringifyDefault(a) || s;
      i.push({
        value: s,
        label: c
      });
    }
    return i.length > 0 ? i : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, n, i, o) {
    if (!this.isCreateTranslationLocaleField(e, t, n)) return;
    const r = this.asObject(n.translation_readiness), s = o && typeof o == "object" ? o : {};
    let a = this.asStringArray(s.missing_locales);
    if (a.length === 0 && (a = this.asStringArray(r?.missing_required_locales)), a.length === 0 && (a = this.asStringArray(n.missing_locales)), a.length === 0 && r) {
      const f = this.asStringArray(r.required_locales), p = new Set(this.asStringArray(r.available_locales));
      a = f.filter((w) => !p.has(w));
    }
    const c = this.asStringArray(i?.enum);
    if (c.length > 0) {
      const f = new Set(c);
      a = a.filter((p) => f.has(p));
    }
    if (a.length === 0) return;
    const l = this.extractStringField(s, "recommended_locale") || this.extractStringField(n, "recommended_locale") || this.extractStringField(r || {}, "recommended_locale"), u = this.asStringArray(s.required_for_publish ?? n.required_for_publish ?? r?.required_for_publish ?? r?.required_locales), d = this.asStringArray(s.existing_locales ?? n.existing_locales ?? r?.available_locales), h = this.createTranslationLocaleLabelMap(i), g = this.buildCreateTranslationLocaleOptions(a, l, u, d, h);
    return g.sort((f, p) => f.recommended && !p.recommended ? -1 : !f.recommended && p.recommended ? 1 : f.value.localeCompare(p.value)), g.length > 0 ? g : void 0;
  }
  isCreateTranslationLocaleField(e, t, n) {
    return e.trim().toLowerCase() === "locale" && t.trim().toLowerCase() === "create_translation" && !!n && typeof n == "object";
  }
  buildCreateTranslationLocaleOptions(e, t, n, i, o) {
    const r = /* @__PURE__ */ new Set(), s = [];
    for (const a of e) {
      const c = a.trim().toLowerCase();
      if (!c || r.has(c)) continue;
      r.add(c);
      const l = t?.toLowerCase() === c, u = n.includes(c), d = [];
      u && d.push("Required for publishing"), i.length > 0 && d.push(`${i.length} translation${i.length > 1 ? "s" : ""} exist`);
      const h = d.length > 0 ? d.join(" • ") : void 0, g = o[c] || this.localeLabel(c);
      let f = `${c.toUpperCase()} - ${g}`;
      l && (f += " (recommended)"), s.push({
        value: c,
        label: f,
        description: h,
        recommended: l
      });
    }
    return s;
  }
  applySchemaTranslationContext(e, t, n) {
    if (!n) return;
    const i = this.extractTranslationContextMap(n);
    if (Object.keys(i).length !== 0)
      for (const [o, r] of Object.entries(i)) {
        const s = o.trim(), a = r.trim();
        if (!s || !a || !this.isEmptyPayloadValue(e[s])) continue;
        const c = this.resolveRecordContextValue(t, a);
        c != null && (e[s] = this.clonePayloadValue(c));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t)) return {};
    const n = {};
    for (const [i, o] of Object.entries(t)) {
      const r = i.trim(), s = typeof o == "string" ? o.trim() : "";
      !r || !s || (n[r] = s);
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
      const r = this.stringifyDefault(o?.const).trim().toLowerCase();
      if (!r) continue;
      const s = this.stringifyDefault(o?.title).trim();
      s && (t[r] = s);
    }
    const n = e, i = n["x-options"] ?? n.x_options ?? n.xOptions;
    if (Array.isArray(i)) for (const o of i) {
      if (!o || typeof o != "object") continue;
      const r = this.stringifyDefault(o.value).trim().toLowerCase(), s = this.stringifyDefault(o.label).trim();
      r && s && (t[r] = s);
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
        const i = n.trim();
        if (!i) continue;
        const o = Number(i);
        if (Number.isFinite(o) && o > 0) return i;
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
    const i = e.required, o = Array.isArray(i) ? i.filter((a) => typeof a == "string").map((a) => a.trim()).filter((a) => a.length > 0) : void 0, r = e["x-translation-context"] ?? e.x_translation_context, s = r && typeof r == "object" && !Array.isArray(r) ? r : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: o,
      properties: n,
      ...s ? { "x-translation-context": s } : {}
    };
  }
  collectRequiredFields(e, t) {
    const n = [], i = /* @__PURE__ */ new Set(), o = (r) => {
      const s = r.trim();
      !s || i.has(s) || (i.add(s), n.push(s));
    };
    return Array.isArray(e) && e.forEach((r) => o(String(r))), Array.isArray(t?.required) && t.required.forEach((r) => o(String(r))), n;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const n = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), i = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), o = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${n || "action"}-${i || "record"}-${o}`;
  }
  coercePromptValue(e, t, n) {
    const i = typeof e == "string" ? e.trim() : String(e ?? "").trim(), o = typeof n?.type == "string" ? n.type.toLowerCase() : "string";
    if (i.length === 0) return { value: i };
    if (o === "number" || o === "integer") {
      const r = Number(i);
      return Number.isFinite(r) ? { value: o === "integer" ? Math.trunc(r) : r } : {
        value: null,
        error: `${t} must be a valid number`
      };
    }
    if (o === "boolean") {
      const r = i.toLowerCase();
      return r === "true" || r === "1" || r === "yes" ? { value: !0 } : r === "false" || r === "0" || r === "no" ? { value: !1 } : {
        value: null,
        error: `${t} must be true or false`
      };
    }
    if (o === "array" || o === "object") try {
      return { value: JSON.parse(i) };
    } catch {
      return {
        value: null,
        error: `${t} must be valid JSON (${o === "array" ? "[...]" : "{...}"})`
      };
    }
    return { value: i };
  }
  buildActionErrorMessage(e, t) {
    return C(t, `${e} failed`);
  }
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  appendDefaultActions(e, t, n) {
    const i = String(t.id || ""), o = this.config.actionBasePath, r = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = m(o, i, "", n);
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
            window.location.href = m(o, i, "edit", n);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const s of r) this.seenActions.has(s.name) || (this.seenActions.add(s.name), e.push(s.button));
  }
  appendDefaultActionsOrdered(e, t, n, i) {
    const o = String(t.id || ""), r = this.config.actionBasePath, s = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = m(r, o, "", n);
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
            window.location.href = m(r, o, "edit", n);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let a = i;
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
function k(e, t, n) {
  return new q(n).buildRowActions(e, t);
}
function V(e) {
  return e.schema?.actions;
}
export {
  k as n,
  V as r,
  q as t
};

//# sourceMappingURL=schema-actions-CJ9VyJX0.js.map
import { t as Qt } from "../chunks/icon-renderer-BSHLmdoQ.js";
import { i as f, n as Ze, r as Oe } from "../chunks/modal-Bj9YWM2D.js";
import { t as G } from "../chunks/toast-manager-CLcahrEa.js";
import { createStructuredActionError as se, executeActionRequest as Ae, executeStructuredRequest as et, extractErrorMessage as Wt, extractExchangeError as Li, extractTranslationBlocker as Xt, formatStructuredErrorForDisplay as N, generateExchangeReport as _i, getStructuredActionError as z, groupRowResultsByStatus as Ri, isExchangeError as Di, isHandledActionError as M, isTranslationBlocker as Zt, parseImportResult as Ii } from "../toast/error-helpers.js";
import { n as er, t as ae } from "../chunks/badge-DARlE9j4.js";
import { t as ie } from "../chunks/date-utils-DMGK0YYp.js";
import { A as tt, C as H, D as Bi, E as Fi, F as rt, M as tr, N as nt, O as qi, P as rr, S as Oi, T as ji, _ as zi, a as Ni, b as Gi, c as Hi, d as Ui, f as Vi, g as Ki, h as st, i as Ji, j as at, k as Yi, l as Qi, m as it, n as Wi, o as Xi, p as Zi, r as eo, s as to, t as ro, u as ot, v as no, w as nr, x as sr, y as so } from "../chunks/translation-status-vocabulary-DDCX-Bio.js";
import { n as ar, t as I } from "../chunks/http-client-DiXyH5DW.js";
import { t as ir } from "../chunks/sortable.esm-G5PYYtV9.js";
import { r as or, t as lr } from "../chunks/translation-contracts-NuS3GLjo.js";
var cr = class lt extends Ze {
  constructor(t, r, n) {
    super({
      size: "md",
      initialFocus: "[data-payload-field]",
      lockBodyScroll: !1
    }), this.resolved = !1, this.config = t, this.onConfirm = r, this.onCancel = n;
  }
  static prompt(t) {
    return new Promise((r) => {
      new lt(t, (n) => r(n), () => r(null)).show();
    });
  }
  renderContent() {
    const t = this.config.fields.map((r) => this.renderField(r)).join("");
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${f(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${t}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${f(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${f(this.config.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const t = this.container?.querySelector("[data-payload-form]"), r = this.container?.querySelector("[data-payload-cancel]"), n = () => {
      this.clearErrors();
      const s = {};
      let a = null;
      for (const i of this.config.fields) {
        const o = this.container?.querySelector(`[data-payload-field="${i.name}"]`);
        if (!o) continue;
        const l = o.value.trim();
        s[i.name] = l, l || (a || (a = o), this.showFieldError(i.name, "This field is required."));
      }
      if (a) {
        a.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(s), this.hide();
    };
    t?.addEventListener("submit", (s) => {
      s.preventDefault(), n();
    }), r?.addEventListener("click", () => {
      this.hide();
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(t) {
    const r = t.description ? `<p class="text-xs text-gray-500 mt-1">${f(t.description)}</p>` : "", n = t.options && t.options.length > 0 ? this.renderSelect(t) : this.renderInput(t);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${t.name}">
          ${f(t.label)}
        </label>
        ${n}
        ${r}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${t.name}"></p>
      </div>
    `;
  }
  renderSelect(t) {
    const r = t.value, n = (t.options || []).map((s) => {
      const a = s.value === r ? " selected" : "";
      return `<option value="${f(s.value)}"${a}>${f(s.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${t.name}"
              data-payload-field="${t.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${n}
      </select>
    `;
  }
  renderInput(t) {
    const r = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300";
    if (t.type === "array" || t.type === "object") return `
        <textarea id="payload-field-${t.name}"
                  data-payload-field="${t.name}"
                  rows="4"
                  class="${r}"
                  placeholder="${t.type === "array" ? "[...]" : "{...}"}">${f(t.value)}</textarea>
      `;
    const n = t.type === "integer" || t.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${t.name}"
             type="${n}"
             data-payload-field="${t.name}"
             value="${f(t.value)}"
             class="${r}" />
    `;
  }
  clearErrors() {
    this.container?.querySelectorAll("[data-payload-error]")?.forEach((t) => {
      t.textContent = "", t.classList.add("hidden");
    });
  }
  showFieldError(t, r) {
    const n = this.container?.querySelector(`[data-payload-error="${t}"]`);
    n && (n.textContent = r, n.classList.remove("hidden"));
  }
}, dr = class {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new G(), this.actionKeys = /* @__PURE__ */ new WeakMap(), this.actionKeySeq = 0;
  }
  renderRowActions(e, t) {
    if (this.mode === "dropdown") return this.renderRowActionsDropdown(e, t);
    const r = t.filter((n) => !n.condition || n.condition(e));
    return r.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${r.map((n) => {
      const s = this.getVariantClass(n.variant || "secondary"), a = n.icon ? this.renderIcon(n.icon) : "", i = n.className || "", o = n.disabled === !0, l = this.getActionKey(n), c = o ? "opacity-50 cursor-not-allowed" : "", d = o ? 'aria-disabled="true"' : "", u = o && n.disabledReason ? `${l}-disabled-reason` : "", p = u ? `aria-describedby="${u}"` : "", h = o && n.disabledReason ? `${n.label} unavailable: ${n.disabledReason}` : n.label, y = u ? `<span id="${u}" class="sr-only">${this.escapeHtml(n.disabledReason || "Action unavailable")}</span>` : "", g = n.disabledReason ? `title="${this.escapeHtml(n.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${s} ${i} ${c}"
          data-action-id="${this.sanitize(n.label)}"
          data-action-key="${l}"
          data-record-id="${e.id}"
          data-disabled="${o}"
          ${d}
          aria-label="${this.escapeHtml(h)}"
          ${p}
          ${g}
        >
          ${a}
          ${this.sanitize(n.label)}
        </button>
        ${y}
      `;
    }).join("")}</div>`;
  }
  renderRowActionsDropdown(e, t) {
    const r = t.filter((a) => !a.condition || a.condition(e));
    if (r.length === 0) return '<div class="text-sm text-gray-400">No actions</div>';
    const n = `actions-menu-${e.id}`, s = this.buildDropdownItems(e, r);
    return `
      <div class="relative actions-dropdown" data-dropdown>
        <button type="button"
                class="actions-menu-trigger p-2 hover:bg-gray-100 rounded-md transition-colors"
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false">
          ${this.renderDotsIcon()}
        </button>

        <div id="${n}"
             class="actions-menu hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
             role="menu"
             aria-orientation="vertical">
          ${s}
        </div>
      </div>
    `;
  }
  buildDropdownItems(e, t) {
    return t.map((r, n) => {
      const s = r.variant === "danger", a = r.disabled === !0, i = this.getActionKey(r), o = r.icon ? this.renderIcon(r.icon) : "", l = this.shouldShowDivider(r, n, t), c = a ? (r.disabledReason || "Action unavailable").trim() : "", d = c ? `${i}-disabled-reason` : "", u = l ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", p = a ? "action-item text-gray-400 cursor-not-allowed" : s ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", h = a ? 'aria-disabled="true"' : "", y = d ? `aria-describedby="${d}"` : "", g = c ? `${r.label} unavailable: ${c}` : r.label, m = r.disabledReason ? `title="${this.escapeHtml(r.disabledReason)}"` : "", $ = c ? `<span id="${d}" class="action-item-reason text-xs leading-5 text-gray-500">${this.escapeHtml(c)}</span>` : "";
      return `
        ${u}
        <button type="button"
                class="${p} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(r.label)}"
                data-action-key="${i}"
                data-record-id="${e.id}"
                data-disabled="${a}"
                role="menuitem"
                ${h}
                aria-label="${this.escapeHtml(g)}"
                ${y}
                ${m}>
          <span class="flex-shrink-0 w-5 h-5">${o}</span>
          <span class="flex min-w-0 flex-1 flex-col items-start">
            <span class="text-sm font-medium">${this.escapeHtml(r.label)}</span>
            ${$}
          </span>
        </button>
      `;
    }).join("");
  }
  shouldShowDivider(e, t, r) {
    return t === 0 ? !1 : e.variant === "danger" ? !0 : [
      "download",
      "archive",
      "delete",
      "remove"
    ].some((n) => e.label.toLowerCase().includes(n));
  }
  renderDotsIcon() {
    return `
      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
    `;
  }
  renderDefaultActions(e, t) {
    return '<div class="text-sm text-gray-400">Use core.ts for default actions</div>';
  }
  attachRowActionListeners(e, t, r) {
    t.forEach((n) => {
      const s = this.getActionKey(n);
      e.querySelectorAll(`[data-action-key="${s}"]`).forEach((a) => {
        const i = a, o = r[i.dataset.recordId];
        o && i.addEventListener("click", async (l) => {
          if (l.preventDefault(), !(i.getAttribute("aria-disabled") === "true" || i.dataset.disabled === "true"))
            try {
              await n.action(o);
            } catch (c) {
              console.error(`Action "${n.label}" failed:`, c);
              const d = c instanceof Error ? c.message : `Action "${n.label}" failed`;
              this.notifier.error(d);
            }
        });
      });
    });
  }
  renderBulkActionsToolbar(e) {
    const t = document.createElement("div");
    t.id = "bulk-actions-bar", t.className = "hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4";
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const n = document.createElement("div");
    n.className = "flex gap-2 flex-1", e.forEach((a) => {
      const i = document.createElement("button");
      i.type = "button", i.className = "btn btn-sm btn-primary", i.dataset.bulkAction = a.id, a.icon ? i.innerHTML = `${this.renderIcon(a.icon)} ${a.label}` : i.textContent = a.label, n.appendChild(i);
    }), t.appendChild(n);
    const s = document.createElement("button");
    return s.type = "button", s.className = "btn btn-sm btn-secondary", s.id = "clear-selection-btn", s.textContent = "Clear Selection", t.appendChild(s), t;
  }
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      console.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const n = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(n)) return;
    }
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const n = await et(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        }, async (a) => ({
          success: !0,
          data: await a.json().catch(() => {
          })
        }));
        if (!n.success) {
          const a = n.error, i = a ? N(a, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(i), a ? se(a, `Bulk action '${e.id}' failed`, !0) : se({
            textCode: null,
            message: i,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const s = n.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, s, t.length)), e.onSuccess && e.onSuccess(s);
      } catch (n) {
        if (console.error(`Bulk action "${e.id}" failed:`, n), !e.onError && !M(n)) {
          const s = n instanceof Error ? n.message : "Bulk action failed";
          this.notifier.error(s);
        }
        throw e.onError && e.onError(n), n;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([i, o]) => {
      r[i] === void 0 && o && o.default !== void 0 && (r[i] = o.default);
    });
    const s = this.collectRequiredFields(e.payloadRequired, n).filter((i) => i !== "ids" && this.isEmptyPayloadValue(r[i]));
    if (s.length === 0) return r;
    const a = await this.requestRequiredFields(e, s, n, r);
    if (a === null) return null;
    for (const i of s) {
      const o = n?.properties?.[i], l = a[i] ?? "", c = this.coercePromptValue(l, i, o);
      if (c.error)
        return this.notifier.error(c.error), null;
      r[i] = c.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), s = (a) => {
      const i = a.trim();
      !i || n.has(i) || (n.add(i), r.push(i));
    };
    return Array.isArray(e) && e.forEach((a) => s(String(a))), Array.isArray(t?.required) && t.required.forEach((a) => s(String(a))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object") return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([n, s]) => {
      s && typeof s == "object" && (r[n] = s);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, n) {
    const s = t.map((a) => {
      const i = r?.properties?.[a], o = typeof i?.type == "string" ? i.type.toLowerCase() : "string";
      return {
        name: a,
        label: (i?.title || a).trim(),
        description: (i?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[a] !== void 0 ? n[a] : i?.default),
        type: o,
        options: this.buildSchemaOptions(i)
      };
    });
    return cr.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: s
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((r) => r && Object.prototype.hasOwnProperty.call(r, "const")).map((r) => {
          const n = this.stringifyPromptDefault(r.const);
          return {
            value: n,
            label: typeof r.title == "string" && r.title.trim() ? r.title.trim() : n
          };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((r) => {
          const n = this.stringifyPromptDefault(r);
          return {
            value: n,
            label: n
          };
        });
        return t.length > 0 ? t : void 0;
      }
      if (typeof e.type == "string" && e.type.toLowerCase() === "boolean") return [{
        value: "true",
        label: "True"
      }, {
        value: "false",
        label: "False"
      }];
    }
  }
  stringifyPromptDefault(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "number" || typeof e == "boolean") return String(e);
    try {
      return JSON.stringify(e);
    } catch {
      return "";
    }
  }
  coercePromptValue(e, t, r) {
    if (Array.isArray(r?.oneOf) && r.oneOf.length > 0) {
      const a = r.oneOf.find((i) => i && Object.prototype.hasOwnProperty.call(i, "const") && this.stringifyPromptDefault(i.const) === e);
      return !a || !Object.prototype.hasOwnProperty.call(a, "const") ? {
        value: e,
        error: `${t} must be one of: ${r.oneOf.map((i) => typeof i?.title == "string" && i.title.trim() ? i.title.trim() : this.stringifyPromptDefault(i.const)).filter((i) => i !== "").join(", ")}`
      } : { value: a.const };
    }
    const n = (r?.type || "string").toLowerCase();
    if (e === "") return { value: "" };
    let s = e;
    switch (n) {
      case "integer": {
        const a = Number.parseInt(e, 10);
        if (Number.isNaN(a)) return {
          value: e,
          error: `${t} must be an integer.`
        };
        s = a;
        break;
      }
      case "number": {
        const a = Number.parseFloat(e);
        if (Number.isNaN(a)) return {
          value: e,
          error: `${t} must be a number.`
        };
        s = a;
        break;
      }
      case "boolean": {
        const a = e.toLowerCase();
        if ([
          "true",
          "1",
          "yes",
          "y",
          "on"
        ].includes(a)) {
          s = !0;
          break;
        }
        if ([
          "false",
          "0",
          "no",
          "n",
          "off"
        ].includes(a)) {
          s = !1;
          break;
        }
        return {
          value: e,
          error: `${t} must be true/false.`
        };
      }
      case "array":
      case "object":
        try {
          const a = JSON.parse(e);
          if (n === "array" && !Array.isArray(a)) return {
            value: e,
            error: `${t} must be a JSON array.`
          };
          if (n === "object" && (a === null || Array.isArray(a) || typeof a != "object")) return {
            value: e,
            error: `${t} must be a JSON object.`
          };
          s = a;
        } catch {
          return {
            value: e,
            error: `${t} must be valid JSON.`
          };
        }
        break;
      default:
        s = e;
    }
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((a) => a === s || String(a) === String(s)) ? {
      value: s,
      error: `${t} must be one of: ${r.enum.map((a) => String(a)).join(", ")}`
    } : { value: s };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const n = e.label || e.id || "Bulk action", s = t && typeof t == "object" ? t.summary : null, a = s && typeof s.succeeded == "number" ? s.succeeded : typeof t?.processed == "number" ? t.processed : r, i = s && typeof s.failed == "number" ? s.failed : 0;
    return i > 0 ? `${n} completed: ${a} succeeded, ${i} failed.` : `${n} completed for ${a} item${a === 1 ? "" : "s"}.`;
  }
  getVariantClass(e) {
    return {
      primary: "btn-primary",
      secondary: "btn-secondary",
      danger: "btn-danger",
      success: "btn-success",
      warning: "btn-warning"
    }[e] || "btn-secondary";
  }
  renderIcon(e) {
    return {
      eye: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
      edit: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
      trash: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
      "check-circle": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      pause: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      "pause-circle": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      "x-circle": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      key: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
      archive: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>',
      download: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
      copy: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
      "user-badge": '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
    }[e] || "";
  }
  getActionKey(e) {
    const t = this.actionKeys.get(e);
    if (t) return t;
    const r = typeof e.id == "string" ? e.id.trim() : "", n = r ? `id-${this.sanitize(r)}` : `auto-${++this.actionKeySeq}`;
    return this.actionKeys.set(e, n), n;
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
  escapeHtml(e) {
    return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
};
function P(e) {
  const t = {
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
  return !e || typeof e != "object" || (t.requestedLocale = F(e, ["requested_locale"]), t.resolvedLocale = F(e, ["resolved_locale", "locale"]), t.availableLocales = vr(e, ["available_locales"]), t.missingRequestedLocale = ze(e, ["missing_requested_locale"]), t.fallbackUsed = ze(e, ["fallback_used"]), t.familyId = F(e, ["family_id"]), t.status = F(e, ["status"]), t.entityType = F(e, [
    "entity_type",
    "type",
    "_type"
  ]), t.recordId = F(e, ["id"]), !t.fallbackUsed && t.requestedLocale && t.resolvedLocale && (t.fallbackUsed = t.requestedLocale !== t.resolvedLocale), !t.missingRequestedLocale && t.fallbackUsed && (t.missingRequestedLocale = !0)), t;
}
function lo(e) {
  const t = P(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function co(e) {
  const t = P(e);
  return t.familyId !== null || t.resolvedLocale !== null || t.availableLocales.length > 0;
}
function ct(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function ur(e) {
  return ct(e).replace(/"/g, "&quot;");
}
function D(e, t = {}, r = "neutral") {
  const n = e.trim();
  if (!n) return "";
  const { size: s = "sm", extraClass: a = "" } = t;
  return `<span class="inline-flex items-center rounded-full border font-medium ${s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${r === "info" ? "bg-blue-50 text-blue-700 border-blue-200" : r === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"} ${a}">${ct(n)}</span>`;
}
function dt(e, t) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const r = e, n = r[t];
  return n && typeof n == "object" && !Array.isArray(n) ? n : r;
}
function j(e, t) {
  for (const r of t) {
    const n = e[r];
    if (typeof n == "string" && n.trim()) return n.trim();
  }
  return "";
}
function ve(e, t) {
  for (const r of t) {
    const n = e[r];
    if (typeof n == "number" && Number.isFinite(n)) return Math.trunc(n);
    if (typeof n == "string" && n.trim()) {
      const s = Number(n);
      if (Number.isFinite(s)) return Math.trunc(s);
    }
  }
  return null;
}
function ut(e) {
  const t = typeof e.family_member_count == "number" ? Math.trunc(e.family_member_count) : Number(e.family_member_count);
  if (Number.isFinite(t) && t > 0) return Math.trunc(t);
  const r = A(e);
  if (r.availableLocales.length > 0) return r.availableLocales.length;
  const n = P(e);
  return n.availableLocales.length > 0 ? n.availableLocales.length : n.resolvedLocale ? 1 : null;
}
function uo(e, t = {}) {
  const r = typeof e.translation_family_url == "string" ? e.translation_family_url.trim() : "";
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = ut(e), s = n && n > 0 ? D(`${n} ${n === 1 ? "locale" : "locales"}`, t, "info") : "";
  return `
    <div class="inline-flex items-center gap-2">
      <a href="${ur(r)}" class="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">View family</a>
      ${s}
    </div>
  `.trim();
}
function po(e, t = {}) {
  const r = ut(e);
  return !r || r <= 0 ? '<span class="text-gray-400">-</span>' : D(`${r} ${r === 1 ? "locale" : "locales"}`, t, "info");
}
function ho(e, t = {}) {
  const r = dt(e, "translation_assignment_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = j(r, ["status"]), s = j(r, ["label"]), a = j(r, ["assignee_id"]), i = j(r, ["priority"]), o = ve(r, ["active_count", "open_count"]), l = [];
  return n ? l.push(H(n, {
    domain: "queue",
    size: "sm",
    showIcon: !1
  })) : s && l.push(D(s, t, "info")), o !== null && o >= 0 && l.push(D(`${o} active`, t, "neutral")), a && l.push(D(`@${a}`, t, "neutral")), i && l.push(D(i, t, i === "urgent" || i === "high" ? "warning" : "neutral")), l.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${l.join("")}</div>`;
}
function fo(e, t = {}) {
  const r = dt(e, "translation_exchange_summary");
  if (!r) return '<span class="text-gray-400">-</span>';
  const n = j(r, ["status", "last_job_status"]), s = j(r, ["label", "last_job_label"]), a = ve(r, ["pending_count"]), i = ve(r, ["error_count"]), o = [];
  return n ? o.push(H(n, {
    domain: "exchange",
    size: "sm",
    showIcon: !1
  })) : s && o.push(D(s, t, "info")), a !== null && a >= 0 && o.push(D(`${a} pending`, t, "neutral")), i !== null && i > 0 && o.push(D(`${i} errors`, t, "warning")), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${o.join("")}</div>`;
}
function A(e) {
  const t = {
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
  if (!e || typeof e != "object") return t;
  const r = e.translation_readiness;
  if (r && typeof r == "object") {
    t.hasReadinessMetadata = !0, t.familyId = F(e, ["translation_readiness.family_id", "family_id"]), t.requiredLocales = Array.isArray(r.required_locales) ? r.required_locales.filter((i) => typeof i == "string") : [], t.availableLocales = Array.isArray(r.available_locales) ? r.available_locales.filter((i) => typeof i == "string") : [], t.missingRequiredLocales = Array.isArray(r.missing_required_locales) ? r.missing_required_locales.filter((i) => typeof i == "string") : [];
    const n = r.missing_required_fields_by_locale;
    if (n && typeof n == "object" && !Array.isArray(n))
      for (const [i, o] of Object.entries(n)) Array.isArray(o) && (t.missingRequiredFieldsByLocale[i] = o.filter((l) => typeof l == "string"));
    const s = r.readiness_state;
    typeof s == "string" && pr(s) && (t.readinessState = s);
    const a = r.ready_for_transition;
    if (a && typeof a == "object" && !Array.isArray(a))
      for (const [i, o] of Object.entries(a)) typeof o == "boolean" && (t.readyForTransition[i] = o);
    t.evaluatedChannel = typeof r.evaluated_channel == "string" ? r.evaluated_channel : null;
  }
  return t;
}
function mo(e) {
  return A(e).hasReadinessMetadata;
}
function go(e, t) {
  return A(e).readyForTransition[t] === !0;
}
function pr(e) {
  return [
    "ready",
    "missing_locales",
    "missing_fields",
    "missing_locales_and_fields"
  ].includes(e);
}
function pt(e, t = {}) {
  const r = "resolvedLocale" in e ? e : P(e), { showFallbackIndicator: n = !0, size: s = "default", extraClass: a = "" } = t;
  if (!r.resolvedLocale) return "";
  const i = r.resolvedLocale.toUpperCase(), o = r.fallbackUsed || r.missingRequestedLocale, l = `inline-flex items-center gap-1 rounded font-medium ${s === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return o && n ? `<span class="${l} bg-amber-100 text-amber-800 ${a}"
                  title="Showing ${r.resolvedLocale} content (${r.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${i}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${i}
    </span>` : `<span class="${l} bg-blue-100 text-blue-800 ${a}"
                title="Locale: ${i}"
                aria-label="Locale: ${i}">
    ${i}
  </span>`;
}
function hr(e, t = {}) {
  const r = "resolvedLocale" in e ? e : P(e), { maxLocales: n = 3, size: s = "default" } = t;
  if (r.availableLocales.length === 0) return "";
  const a = s === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", i = s === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", o = r.availableLocales.slice(0, n), l = r.availableLocales.length - n, c = o.map((u) => `<span class="${u === r.resolvedLocale ? `${i} rounded bg-blue-100 text-blue-700 font-medium` : `${i} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${i} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${a}"
                title="Available locales: ${r.availableLocales.join(", ")}"
                aria-label="Available locales: ${r.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function fr(e, t = {}) {
  const r = "resolvedLocale" in e ? e : P(e), { showResolvedLocale: n = !0, size: s = "default" } = t, a = [];
  return n && r.resolvedLocale && a.push(pt(r, {
    size: s,
    showFallbackIndicator: !0
  })), r.availableLocales.length > 1 && a.push(hr(r, {
    ...t,
    size: s
  })), a.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${s === "sm" ? "gap-1" : "gap-2"}">${a.join("")}</div>`;
}
function bo(e, t = "default") {
  if (!e) return "";
  const r = e.trim();
  return st(r) !== null ? H(r, { size: t === "sm" ? "sm" : "default" }) : ae(e, "status", r.toLowerCase(), { size: t === "sm" ? "sm" : void 0 });
}
function yo(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata) return "";
  const { size: n = "default", showDetailedTooltip: s = !0, extraClass: a = "" } = t, i = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, o = r.readinessState || "ready", { icon: l, label: c, bgClass: d, textClass: u, tooltip: p } = mr(o, r, s);
  return `<span class="${i} ${d} ${u} ${a}"
                title="${p}"
                aria-label="${c}"
                data-readiness-state="${o}">
    ${l}
    <span>${c}</span>
  </span>`;
}
function vo(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata) return "";
  const n = r.readyForTransition.publish === !0, { size: s = "default", extraClass: a = "" } = t, i = s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (n) return `<span class="inline-flex items-center gap-1 rounded font-medium ${i} bg-green-100 text-green-700 ${a}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const o = r.missingRequiredLocales.length;
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${i} bg-amber-100 text-amber-700 ${a}"
                title="${o > 0 ? `Missing translations: ${r.missingRequiredLocales.join(", ")}` : "Not ready to publish"}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${o > 0 ? `${o} missing` : "Not ready"}
  </span>`;
}
function wo(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata || r.requiredLocales.length === 0) return "";
  const { size: n = "default", extraClass: s = "" } = t, a = n === "sm" ? "text-xs" : "text-sm", i = r.requiredLocales.length, o = r.availableLocales.filter((l) => r.requiredLocales.includes(l)).length;
  return `<span class="${a} ${i > 0 && o === i ? "text-green-600" : o > 0 ? "text-amber-600" : "text-gray-500"} font-medium ${s}"
                title="Locale completeness: ${o} of ${i} required locales available"
                aria-label="${o} of ${i} locales">
    ${o}/${i}
  </span>`;
}
function xo(e, t = {}) {
  const r = A(e);
  if (!r.hasReadinessMetadata || r.readinessState === "ready") return "";
  const { size: n = "default", extraClass: s = "" } = t, a = n === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", i = r.missingRequiredLocales.length, o = i > 0, l = Object.keys(r.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", u = "", p = "";
  return o && l ? (c = "bg-red-100", d = "text-red-800", u = `${i} missing`, p = `Missing translations: ${r.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : o ? (c = "bg-amber-100", d = "text-amber-800", u = `${i} missing`, p = `Missing translations: ${r.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", u = "Incomplete", p = `Incomplete fields in: ${Object.keys(r.missingRequiredFieldsByLocale).join(", ")}`), u ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${a} ${c} ${d} ${s}"
                title="${p}"
                aria-label="${p}"
                data-missing-translations="true"
                data-missing-count="${i}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>` : "";
}
function So(e) {
  const t = A(e);
  return t.hasReadinessMetadata ? t.readinessState !== "ready" : !1;
}
function $o(e) {
  return A(e).missingRequiredLocales.length;
}
function mr(e, t, r) {
  const n = st(e, "core"), s = n ? nr(n, "sm") : "", a = n?.bgClass || "bg-gray-100", i = n?.textClass || "text-gray-600", o = n?.label || "Unknown", l = n?.description || "Unknown readiness state";
  switch (e) {
    case "ready":
      return {
        icon: s,
        label: o,
        bgClass: a,
        textClass: i,
        tooltip: l
      };
    case "missing_locales": {
      const c = t.missingRequiredLocales, d = r && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: s,
        label: `${c.length} missing`,
        bgClass: a,
        textClass: i,
        tooltip: d
      };
    }
    case "missing_fields": {
      const c = Object.keys(t.missingRequiredFieldsByLocale);
      return {
        icon: s,
        label: "Incomplete",
        bgClass: a,
        textClass: i,
        tooltip: r && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields"
      };
    }
    case "missing_locales_and_fields": {
      const c = t.missingRequiredLocales, d = Object.keys(t.missingRequiredFieldsByLocale), u = [];
      return c.length > 0 && u.push(`Missing: ${c.join(", ")}`), d.length > 0 && u.push(`Incomplete: ${d.join(", ")}`), {
        icon: s,
        label: "Not ready",
        bgClass: a,
        textClass: i,
        tooltip: r ? u.join("; ") : "Missing translations and incomplete fields"
      };
    }
    default:
      return {
        icon: s,
        label: o,
        bgClass: a,
        textClass: i,
        tooltip: l
      };
  }
}
function gr(e, t = {}) {
  const { size: r = "sm", maxLocales: n = 5, showLabels: s = !1 } = t, a = A(e);
  if (!a.hasReadinessMetadata) return '<span class="text-gray-400">-</span>';
  const { requiredLocales: i, availableLocales: o, missingRequiredFieldsByLocale: l } = a, c = i.length > 0 ? i : o;
  if (c.length === 0) return '<span class="text-gray-400">-</span>';
  const d = new Set(o), u = br(l);
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${c.slice(0, n).map((p) => {
    const h = d.has(p), y = h && u.has(p), g = h && !y;
    let m, $, E;
    g ? (m = "bg-green-100 text-green-700 border-green-300", $ = "●", E = "Complete") : y ? (m = "bg-amber-100 text-amber-700 border-amber-300", $ = "◐", E = "Incomplete") : (m = "bg-white text-gray-400 border-gray-300 border-dashed", $ = "○", E = "Missing");
    const v = r === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", U = s ? `<span class="font-medium">${p.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${v} rounded border ${m}"
              title="${p.toUpperCase()}: ${E}"
              aria-label="${p.toUpperCase()}: ${E}"
              data-locale="${p}"
              data-state="${E.toLowerCase()}">
          ${U}
          <span aria-hidden="true">${$}</span>
        </span>
      `;
  }).join("")}${c.length > n ? `<span class="text-[10px] text-gray-500" title="${c.length - n} more locales">+${c.length - n}</span>` : ""}</div>`;
}
function br(e) {
  const t = /* @__PURE__ */ new Set();
  if (e && typeof e == "object")
    for (const [r, n] of Object.entries(e)) Array.isArray(n) && n.length > 0 && t.add(r);
  return t;
}
function Co(e = {}) {
  return (t, r, n) => gr(r, e);
}
function ko(e, t = {}) {
  if (!e.fallbackUsed && !e.missingRequestedLocale) return "";
  const { showCreateButton: r = !0, createTranslationUrl: n, panelName: s } = t, a = e.requestedLocale || "requested locale", i = e.resolvedLocale || "default", o = r ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${e.requestedLocale || ""}"
            data-panel="${s || ""}"
            data-record-id="${e.recordId || ""}"
            ${n ? `data-url="${n}"` : ""}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${a.toUpperCase()} translation
    </button>
  ` : "";
  return `
    <div class="fallback-warning bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
         role="alert"
         aria-live="polite"
         data-fallback-mode="true"
         data-requested-locale="${e.requestedLocale || ""}"
         data-resolved-locale="${e.resolvedLocale || ""}">
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
            The <strong>${a.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${i.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${o ? `<div class="mt-3">${o}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function je(e = {}) {
  return (t, r, n) => fr(r, e);
}
function yr(e = {}) {
  return (t, r, n) => pt(r, e);
}
function F(e, t) {
  for (const r of t) {
    const n = Ee(e, r);
    if (typeof n == "string" && n.trim()) return n;
  }
  return null;
}
function vr(e, t) {
  for (const r of t) {
    const n = Ee(e, r);
    if (Array.isArray(n)) return n.filter((s) => typeof s == "string");
  }
  return [];
}
function ze(e, t) {
  for (const r of t) {
    const n = Ee(e, r);
    if (typeof n == "boolean") return n;
    if (n === "true") return !0;
    if (n === "false") return !1;
  }
  return !1;
}
function Ee(e, t) {
  const r = t.split(".");
  let n = e;
  for (const s of r) {
    if (n == null || typeof n != "object") return;
    n = n[s];
  }
  return n;
}
var R = '<span class="text-gray-400">-</span>', wr = [
  "name",
  "label",
  "title",
  "slug",
  "id",
  "code",
  "key",
  "value",
  "type",
  "blockType",
  "block_type"
];
function V(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function xr(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function Sr(e) {
  const t = [], r = (s) => {
    if (typeof s != "string") return;
    const a = s.trim();
    !a || t.includes(a) || t.push(a);
  };
  r(e.display_key), r(e.displayKey);
  const n = e.display_keys ?? e.displayKeys;
  return Array.isArray(n) && n.forEach(r), t;
}
function $r(e, t) {
  if (!t) return;
  if (Object.prototype.hasOwnProperty.call(e, t)) return e[t];
  if (!t.includes(".")) return;
  const r = t.split(".");
  let n = e;
  for (const s of r) {
    if (!n || typeof n != "object" || Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, s)) return;
    n = n[s];
  }
  return n;
}
function Cr(e) {
  if (e == null) return "";
  switch (typeof e) {
    case "string":
      return e.trim();
    case "number":
    case "bigint":
      return String(e);
    case "boolean":
      return e ? "true" : "false";
    default:
      return "";
  }
}
function we(e, t) {
  if (e == null) return "";
  if (Array.isArray(e)) return xe(e, t);
  if (typeof e != "object") return String(e);
  const r = [...Sr(t), ...wr], n = /* @__PURE__ */ new Set();
  for (const s of r) {
    if (n.has(s)) continue;
    n.add(s);
    const a = Cr($r(e, s));
    if (a) return a;
  }
  return xr(e);
}
function xe(e, t) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const r = e.map((i) => we(i, t).trim()).filter(Boolean);
  if (r.length === 0) return "";
  const n = Number(t.preview_limit ?? t.previewLimit ?? 3), s = Number.isFinite(n) && n > 0 ? Math.floor(n) : 3, a = r.slice(0, s);
  return r.length <= s ? a.join(", ") : `${a.join(", ")} +${r.length - s} more`;
}
function kr(e, t, r, n) {
  const s = e[t] ?? e[r] ?? n, a = Number(s);
  return Number.isFinite(a) && a > 0 ? Math.floor(a) : n;
}
function Ar(e, t, r, n) {
  const s = e[t] ?? e[r];
  return s == null ? n : typeof s == "boolean" ? s : typeof s == "string" ? s.toLowerCase() === "true" || s === "1" : !!s;
}
function Er(e, t, r, n) {
  const s = e[t] ?? e[r];
  return s == null ? n : String(s).trim() || n;
}
function Lr(e) {
  if (e == null) return "";
  if (typeof e == "string") return e.trim();
  if (typeof e != "object") return String(e).trim();
  for (const t of [
    "_type",
    "type",
    "blockType",
    "block_type"
  ]) {
    const r = e[t];
    if (typeof r == "string" && r.trim()) return r.trim();
  }
  return "";
}
function _r(e) {
  switch (e) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}
var Rr = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null) return R;
      if (typeof e == "boolean") return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = xe(e, {});
        return t ? V(t) : R;
      }
      if (typeof e == "object") {
        const t = we(e, {});
        return t ? V(t) : R;
      }
      return String(e);
    }, this.registerDefaultRenderers();
  }
  register(e, t) {
    this.renderers.set(e, t);
  }
  get(e) {
    return this.renderers.get(e) || this.defaultRenderer;
  }
  has(e) {
    return this.renderers.has(e);
  }
  registerDefaultRenderers() {
    this.renderers.set("_badge", (e) => {
      const t = String(e).toLowerCase();
      return ae(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = ie(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = ie(e);
      return t ? t.toLocaleString() : String(e);
    }), this.renderers.set("_boolean", (e) => `<div class="flex justify-center">${e ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'}</div>`), this.renderers.set("_link", (e, t) => e ? `<a href="${t.url || t.link || "#"}" class="text-blue-600 hover:text-blue-800 underline">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_email", (e) => e ? `<a href="mailto:${e}" class="text-blue-600 hover:text-blue-800">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_url", (e) => e ? `<a href="${e}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
        ${e}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_number", (e) => e == null ? '<span class="text-gray-400">-</span>' : Number(e).toLocaleString()), this.renderers.set("_currency", (e) => e == null ? '<span class="text-gray-400">-</span>' : new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(e))), this.renderers.set("_percentage", (e) => e == null ? '<span class="text-gray-400">-</span>' : `${Number(e).toFixed(2)}%`), this.renderers.set("_filesize", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Number(e), r = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
      ];
      if (t === 0) return "0 Bytes";
      const n = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, n)).toFixed(2)} ${r[n]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), r = 50;
      return t.length <= r ? t : `<span title="${t}">${t.substring(0, r)}...</span>`;
    }), this.renderers.set("_array", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0) return R;
      const s = xe(e, n?.options || {});
      return s ? V(s) : R;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null) return R;
      const s = we(e, n?.options || {});
      return s ? V(s) : R;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map((t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0) return R;
      const s = n?.options || {}, a = kr(s, "max_visible", "maxVisible", 3), i = Ar(s, "show_count", "showCount", !0), o = Er(s, "chip_variant", "chipVariant", "default"), l = s.block_icons_map || s.blockIconsMap || {}, c = [], d = e.slice(0, a);
      for (const h of d) {
        const y = Lr(h);
        if (!y) continue;
        const g = Qt(l[y] || "view-grid", {
          size: "14px",
          extraClass: "flex-shrink-0"
        }), m = _r(o);
        c.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${m}">${g}<span>${V(y)}</span></span>`);
      }
      if (c.length === 0) return R;
      const u = e.length - a;
      let p = "";
      return i && u > 0 && (p = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${u} more</span>`), `<div class="flex flex-wrap gap-1">${c.join("")}${p}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}, Ao = {
  statusBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return ae(String(t), "status", r);
  },
  roleBadge: (e) => (t) => {
    const r = String(t).toLowerCase();
    return ae(String(t), "role", r);
  },
  userInfo: (e, t) => {
    const r = e || t.name || t.username || "-", n = t.email || "";
    return n ? `<div><div class="font-medium text-gray-900">${r}</div><div class="text-sm text-gray-500">${n}</div></div>` : `<div class="font-medium text-gray-900">${r}</div>`;
  },
  booleanChip: (e) => (t) => er(!!t, e),
  relativeTime: (e) => {
    if (!e) return '<span class="text-gray-400">-</span>';
    const t = ie(e);
    if (!t) return String(e);
    const r = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(r / 6e4), s = Math.floor(r / 36e5), a = Math.floor(r / 864e5);
    return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : s < 24 ? `${s} hour${s > 1 ? "s" : ""} ago` : a < 30 ? `${a} day${a > 1 ? "s" : ""} ago` : t.toLocaleDateString();
  },
  localeBadge: yr(),
  translationStatus: je(),
  translationStatusCompact: je({
    size: "sm",
    maxLocales: 2
  })
}, Dr = "datagrid.state.", he = "datagrid.share.", ht = "datagrid.share.index", Ir = 20;
function Pr(e) {
  return String(e || "").trim() || "default";
}
function fe(e, t = {}) {
  if (!Array.isArray(e)) return;
  const r = e.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
  return r.length === 0 ? t.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(r));
}
function Y(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  (t.viewMode === "flat" || t.viewMode === "grouped" || t.viewMode === "matrix") && (r.viewMode = t.viewMode), (t.expandMode === "all" || t.expandMode === "none" || t.expandMode === "explicit") && (r.expandMode = t.expandMode);
  const n = fe(t.expandedGroups, { allowEmpty: !0 });
  n !== void 0 && (r.expandedGroups = n);
  const s = fe(t.hiddenColumns, { allowEmpty: !0 });
  s !== void 0 && (r.hiddenColumns = s);
  const a = fe(t.columnOrder);
  return a && (r.columnOrder = a), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function Ne(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = { version: 1 };
  if (typeof t.search == "string") {
    const s = t.search.trim();
    s && (r.search = s);
  }
  typeof t.page == "number" && Number.isFinite(t.page) && (r.page = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (r.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (r.filters = t.filters), Array.isArray(t.sort) && (r.sort = t.sort);
  const n = Y(t.persisted);
  return n && (r.persisted = n), typeof t.updatedAt == "number" && Number.isFinite(t.updatedAt) && (r.updatedAt = t.updatedAt), r;
}
function Mr(e) {
  const t = String(e || "").trim();
  return t ? t.replace(/\/+$/, "") : "/api/panels/preferences";
}
function Tr(e) {
  return String(e || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function Br() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 16);
}
function Fr(e) {
  try {
    const t = localStorage.getItem(ht);
    if (!t) return [];
    const r = JSON.parse(t);
    if (!Array.isArray(r)) return [];
    const n = r.map((s) => {
      if (!s || typeof s != "object" || Array.isArray(s)) return null;
      const a = s, i = typeof a.token == "string" ? a.token.trim() : "", o = typeof a.updatedAt == "number" ? a.updatedAt : 0;
      return !i || !Number.isFinite(o) ? null : {
        token: i,
        updatedAt: o
      };
    }).filter((s) => s !== null).sort((s, a) => a.updatedAt - s.updatedAt);
    return n.length <= e ? n : n.slice(0, e);
  } catch {
    return [];
  }
}
function qr(e) {
  try {
    localStorage.setItem(ht, JSON.stringify(e));
  } catch {
  }
}
var ft = class {
  constructor(e) {
    const t = Pr(e.key);
    this.key = t, this.persistedStorageKey = `${Dr}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || Ir);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? Y(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = Y(e);
    if (t) {
      t.updatedAt || (t.updatedAt = Date.now());
      try {
        localStorage.setItem(this.persistedStorageKey, JSON.stringify(t));
      } catch {
      }
    }
  }
  clearPersistedState() {
    try {
      localStorage.removeItem(this.persistedStorageKey);
    } catch {
    }
  }
  createShareState(e) {
    const t = Ne(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const r = Br(), n = `${he}${r}`;
    try {
      localStorage.setItem(n, JSON.stringify(t));
      const s = Fr(this.maxShareEntries).filter((a) => a.token !== r);
      for (s.unshift({
        token: r,
        updatedAt: t.updatedAt
      }); s.length > this.maxShareEntries; ) {
        const a = s.pop();
        a && localStorage.removeItem(`${he}${a.token}`);
      }
      return qr(s), r;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const r = localStorage.getItem(`${he}${t}`);
      return r ? Ne(JSON.parse(r)) : null;
    } catch {
      return null;
    }
  }
}, Or = class extends ft {
  constructor(e) {
    super(e), this.syncTimeout = null, this.preferencesEndpoint = Mr(e.preferencesEndpoint), this.resource = Tr(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3);
  }
  get serverStateKey() {
    return `ui.datagrid.${this.resource}.state`;
  }
  async hydrate() {
    try {
      const e = this.buildKeysQueryURL(this.serverStateKey), t = await fetch(e, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!t.ok) return;
      const r = await t.json(), n = this.extractFirstRecord(r);
      if (!n) return;
      const s = this.extractMap(n.effective), a = this.extractMap(n.raw), i = Y(s[this.serverStateKey] ?? a[this.serverStateKey]);
      i && super.savePersistedState(i);
    } catch {
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = Y(e);
    t && this.scheduleServerSync(t);
  }
  clearPersistedState() {
    super.clearPersistedState(), this.scheduleServerClear();
  }
  scheduleServerSync(e) {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncToServer(e);
    }, this.syncDebounceMs);
  }
  scheduleServerClear() {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.clearServerState();
    }, this.syncDebounceMs);
  }
  async syncToServer(e) {
    try {
      await fetch(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ raw: { [this.serverStateKey]: e } })
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await fetch(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ clear_raw_keys: [this.serverStateKey] })
      });
    } catch {
    }
  }
  buildKeysQueryURL(e) {
    const t = this.preferencesEndpoint.includes("?") ? "&" : "?";
    return `${this.preferencesEndpoint}${t}keys=${encodeURIComponent(e)}`;
  }
  extractFirstRecord(e) {
    if (!e || typeof e != "object" || Array.isArray(e)) return null;
    const t = e, r = Array.isArray(t.records) ? t.records : Array.isArray(t.data) ? t.data : [];
    if (r.length === 0) return null;
    const n = r[0];
    return !n || typeof n != "object" || Array.isArray(n) ? null : n;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
};
function jr(e) {
  return (e.mode || "local") === "preferences" ? new Or(e) : new ft(e);
}
function zr(e, t = {}) {
  const { groupByField: r = "family_id", defaultExpanded: n = !0, expandMode: s = "explicit", expandedGroups: a = /* @__PURE__ */ new Set() } = t, i = /* @__PURE__ */ new Map(), o = [];
  for (const c of e) {
    const d = Jr(c, r);
    if (d) {
      const u = i.get(d);
      u ? u.push(c) : i.set(d, [c]);
    } else o.push(c);
  }
  const l = [];
  for (const [c, d] of i) {
    const u = wt(d), p = gt(c, s, a, n);
    l.push({
      groupId: c,
      records: d,
      summary: u,
      expanded: p,
      summaryFromBackend: !1
    });
  }
  return l.sort((c, d) => e.indexOf(c.records[0]) - e.indexOf(d.records[0])), {
    groups: l,
    ungrouped: o,
    totalGroups: l.length,
    totalRecords: e.length
  };
}
function mt(e) {
  if (e.length === 0) return !1;
  let t = !1;
  for (const r of e) {
    if (Gr(r)) {
      t = !0;
      continue;
    }
    if (bt(r)) {
      t = !0;
      continue;
    }
    return !1;
  }
  return t;
}
function Nr(e, t = {}) {
  const { defaultExpanded: r = !0, expandMode: n = "explicit", expandedGroups: s = /* @__PURE__ */ new Set() } = t;
  if (!mt(e)) return null;
  const a = [], i = [];
  let o = 0;
  for (const l of e) {
    if (bt(l)) {
      i.push({ ...l }), o += 1;
      continue;
    }
    const c = Hr(l);
    if (!c) return null;
    const d = vt(l), u = Vr(l, d), p = gt(c, n, s, r);
    a.push({
      groupId: c,
      displayLabel: Kr(l, d),
      records: d,
      summary: u,
      expanded: p,
      summaryFromBackend: Ur(l)
    }), o += d.length;
  }
  return {
    groups: a,
    ungrouped: i,
    totalGroups: a.length,
    totalRecords: o
  };
}
function gt(e, t, r, n) {
  return t === "all" ? !r.has(e) : t === "none" ? r.has(e) : r.size === 0 ? n : r.has(e);
}
function Gr(e) {
  const t = e, r = typeof t.group_by == "string" ? t.group_by.trim().toLowerCase() : "", n = yt(e);
  if (!(r === "family_id" || n === "group")) return !1;
  const s = vt(e);
  return Array.isArray(s);
}
function bt(e) {
  return yt(e) === "ungrouped";
}
function yt(e) {
  const t = e._group;
  if (!t || typeof t != "object" || Array.isArray(t)) return "";
  const r = t.row_type;
  return typeof r == "string" ? r.trim().toLowerCase() : "";
}
function Hr(e) {
  const t = e.family_id;
  if (typeof t == "string" && t.trim()) return t.trim();
  const r = e._group;
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  const n = r.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function vt(e) {
  const t = e, r = Array.isArray(t.records) ? t.records : t.children;
  if (Array.isArray(r)) {
    const s = r.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a }));
    if (s.length > 0) return s;
  }
  const n = t.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function Ur(e) {
  const t = e.family_summary;
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function Vr(e, t) {
  const r = e.family_summary;
  if (!r || typeof r != "object" || Array.isArray(r)) return wt(t);
  const n = r, s = Array.isArray(n.available_locales) ? n.available_locales.filter(O) : [], a = Array.isArray(n.missing_locales) ? n.missing_locales.filter(O) : [], i = xt(n.readiness_state) ? n.readiness_state : null, o = Math.max(t.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : o,
    availableLocales: s,
    missingLocales: a,
    readinessState: i,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function Kr(e, t) {
  const r = e.family_label;
  if (typeof r == "string" && r.trim()) return r.trim();
  const n = e.family_summary;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const o = n.group_label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const s = e._group;
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const o = s.label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const a = [], i = e.parent;
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const o = i;
    a.push(o.title, o.name, o.slug, o.path);
  }
  t.length > 0 && a.push(t[0].title, t[0].name, t[0].slug, t[0].path);
  for (const o of a) if (typeof o == "string" && o.trim()) return o.trim();
}
function Jr(e, t) {
  const r = e[t];
  return typeof r == "string" && r.trim() ? r : null;
}
function wt(e) {
  const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  let n = !1, s = 0;
  for (const i of e) {
    const o = i.translation_readiness;
    if (o) {
      const c = o.available_locales, d = o.missing_required_locales, u = o.readiness_state;
      Array.isArray(c) && c.filter(O).forEach((p) => t.add(p)), Array.isArray(d) && d.filter(O).forEach((p) => r.add(p)), (u === "missing_fields" || u === "missing_locales_and_fields") && (n = !0), u === "ready" && s++;
    }
    const l = i.available_locales;
    Array.isArray(l) && l.filter(O).forEach((c) => t.add(c));
  }
  let a = null;
  if (e.length > 0) {
    const i = s === e.length, o = r.size > 0;
    i ? a = "ready" : o && n ? a = "missing_locales_and_fields" : o ? a = "missing_locales" : n && (a = "missing_fields");
  }
  return {
    totalItems: e.length,
    availableLocales: Array.from(t),
    missingLocales: Array.from(r),
    readinessState: a,
    readyForPublish: a === "ready"
  };
}
function O(e) {
  return typeof e == "string";
}
function Yr(e, t) {
  const r = e.groups.map((n) => {
    const s = t.get(n.groupId);
    return s ? {
      ...n,
      summary: {
        ...n.summary,
        ...s
      },
      summaryFromBackend: !0
    } : n;
  });
  return {
    ...e,
    groups: r
  };
}
function Qr(e) {
  const t = /* @__PURE__ */ new Map(), r = e.group_summaries;
  if (!r || typeof r != "object" || Array.isArray(r)) return t;
  for (const [n, s] of Object.entries(r)) if (s && typeof s == "object") {
    const a = s;
    t.set(n, {
      totalItems: typeof a.total_items == "number" ? a.total_items : void 0,
      availableLocales: Array.isArray(a.available_locales) ? a.available_locales.filter(O) : void 0,
      missingLocales: Array.isArray(a.missing_locales) ? a.missing_locales.filter(O) : void 0,
      readinessState: xt(a.readiness_state) ? a.readiness_state : void 0,
      readyForPublish: typeof a.ready_for_publish == "boolean" ? a.ready_for_publish : void 0
    });
  }
  return t;
}
function xt(e) {
  return e === "ready" || e === "missing_locales" || e === "missing_fields" || e === "missing_locales_and_fields";
}
var oe = "datagrid-expand-state-";
function Se(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const r of e) {
    const n = _e(r);
    if (n && !t.includes(n)) {
      if (t.length >= Le) break;
      t.push(n);
    }
  }
  return t;
}
function St(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? {
      version: 2,
      mode: "explicit",
      ids: Se(t)
    } : !t || typeof t != "object" || Array.isArray(t) ? null : {
      version: 2,
      mode: te(t.mode, "explicit"),
      ids: Se(t.ids)
    };
  } catch {
    return null;
  }
}
function Wr(e) {
  try {
    const t = oe + e, r = St(localStorage.getItem(t));
    if (r) return new Set(r.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Xr(e) {
  try {
    const t = oe + e, r = St(localStorage.getItem(t));
    if (r) return r.mode;
  } catch {
  }
  return "explicit";
}
function Zr(e) {
  try {
    const t = oe + e;
    return localStorage.getItem(t) !== null;
  } catch {
    return !1;
  }
}
function Eo(e, t, r = "explicit") {
  try {
    const n = oe + e, s = Se(Array.from(t)), a = {
      version: 2,
      mode: te(r, "explicit"),
      ids: s
    };
    localStorage.setItem(n, JSON.stringify(a));
  } catch {
  }
}
function Lo(e, t) {
  const r = e.groups.map((n) => n.groupId === t ? {
    ...n,
    expanded: !n.expanded
  } : n);
  return {
    ...e,
    groups: r
  };
}
function _o(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !0
  }));
  return {
    ...e,
    groups: t
  };
}
function Ro(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !1
  }));
  return {
    ...e,
    groups: t
  };
}
function Do(e) {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.groups) r.expanded && t.add(r.groupId);
  return t;
}
var $t = "datagrid-view-mode-", Le = 200, en = 256;
function te(e, t = "explicit") {
  return e === "all" || e === "none" || e === "explicit" ? e : t;
}
function tn(e) {
  try {
    const t = $t + e, r = localStorage.getItem(t);
    if (r && Ct(r)) return r;
  } catch {
  }
  return null;
}
function Io(e, t) {
  try {
    const r = $t + e;
    localStorage.setItem(r, t);
  } catch {
  }
}
function Ct(e) {
  return e === "flat" || e === "grouped" || e === "matrix";
}
function kt(e) {
  return e && Ct(e) ? e : null;
}
function Po(e) {
  if (!(e instanceof Set) || e.size === 0) return "";
  const t = Array.from(new Set(Array.from(e).map((r) => _e(r)).filter((r) => r !== null))).slice(0, Le).sort();
  return t.length === 0 ? "" : t.map((r) => encodeURIComponent(r)).join(",");
}
function rn(e) {
  const t = /* @__PURE__ */ new Set();
  if (!e) return t;
  const r = e.split(",");
  for (const n of r) {
    if (t.size >= Le) break;
    if (!n) continue;
    let s = "";
    try {
      s = decodeURIComponent(n);
    } catch {
      continue;
    }
    const a = _e(s);
    a && t.add(a);
  }
  return t;
}
function _e(e) {
  if (typeof e != "string") return null;
  let t = e.trim();
  if (!t) return null;
  if (t.includes("%")) try {
    const r = decodeURIComponent(t);
    typeof r == "string" && r.trim() && (t = r.trim());
  } catch {
  }
  return t.length > en ? null : t;
}
function nn(e, t = {}) {
  const { summary: r } = e, { size: n = "sm" } = t, s = n === "sm" ? "text-xs" : "text-sm", a = r.availableLocales.length, i = a + r.missingLocales.length;
  let o = "";
  if (r.readinessState) {
    const d = sn(r.readinessState);
    o = `
      <span class="${s} px-1.5 py-0.5 rounded ${d.bgClass} ${d.textClass}"
            title="${d.description}">
        ${d.icon} ${d.label}
      </span>
    `;
  }
  const l = i > 0 ? `<span class="${s} text-gray-500">${a}/${i} locales</span>` : "", c = `<span class="${s} text-gray-500">${r.totalItems} item${r.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${o}
      ${l}
      ${c}
    </div>
  `;
}
function sn(e) {
  switch (e) {
    case "ready":
      return {
        icon: "●",
        label: "Ready",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        description: "All translations complete"
      };
    case "missing_locales":
      return {
        icon: "○",
        label: "Missing",
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        description: "Missing required locale translations"
      };
    case "missing_fields":
      return {
        icon: "◐",
        label: "Incomplete",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        description: "Has translations but missing required fields"
      };
    case "missing_locales_and_fields":
      return {
        icon: "⚠",
        label: "Not Ready",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        description: "Missing translations and required fields"
      };
    default:
      return {
        icon: "?",
        label: "Unknown",
        bgClass: "bg-gray-100",
        textClass: "text-gray-700",
        description: "Status unknown"
      };
  }
}
function an(e) {
  if (typeof e.displayLabel == "string" && e.displayLabel.trim()) return e.displayLabel.trim();
  if (e.groupId.startsWith("ungrouped:")) return "Ungrouped Records";
  if (e.records.length > 0) {
    const t = e.records[0];
    for (const r of [
      "title",
      "name",
      "label",
      "subject"
    ]) {
      const n = t[r];
      if (typeof n == "string" && n.trim()) {
        const s = n.trim();
        return s.length > 60 ? s.slice(0, 57) + "..." : s;
      }
    }
  }
  return `Translation Group (${e.groupId.length > 8 ? e.groupId.slice(0, 8) + "..." : e.groupId})`;
}
function on(e, t, r = {}) {
  const { showExpandIcon: n = !0 } = r, s = n ? `<span class="expand-icon mr-2" aria-hidden="true">${e.expanded ? "▼" : "▶"}</span>` : "", a = nn(e), i = Re(an(e)), o = e.records.length, l = o > 1 ? `<span class="ml-2 text-xs text-gray-500">(${o} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${ln(e.groupId)}"
        data-expanded="${e.expanded}"
        role="row"
        aria-expanded="${e.expanded}"
        tabindex="0">
      <td colspan="${t + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${s}
            <span class="font-medium text-gray-700">${i}</span>
            ${l}
          </div>
          ${a}
        </div>
      </td>
    </tr>
  `;
}
function Re(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ln(e) {
  return Re(e);
}
function cn(e) {
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No translation groups</h3>
          <p class="mt-1 text-sm text-gray-500">No grouped translations found for this content type.</p>
        </div>
      </td>
    </tr>
  `;
}
function Mo(e) {
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="flex items-center justify-center">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-500">Loading groups...</span>
        </div>
      </td>
    </tr>
  `;
}
function To(e, t, r) {
  const n = r ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${Re(t)}</p>
          ${n}
        </div>
      </td>
    </tr>
  `;
}
function dn(e = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < e;
}
function De(e, t = 768) {
  return dn(t) && e === "grouped" ? "flat" : e;
}
var Q = "search", W = "page", X = "perPage", Z = "filters", ee = "sort", le = "state", Ie = "hiddenColumns", ce = "view_mode", Pe = "expanded_groups", Me = [
  Q,
  W,
  X,
  Z,
  ee,
  le,
  Ie,
  ce,
  Pe
], un = 1800;
function Ge(e, t) {
  const r = t.toString();
  return r ? `${e}?${r}` : e;
}
function pn(e, t) {
  for (const r of t) e.delete(r);
}
function hn(e) {
  return {
    maxURLLength: Math.max(256, e.config.urlState?.maxURLLength || 1800),
    maxFiltersLength: Math.max(64, e.config.urlState?.maxFiltersLength || 600),
    enableStateToken: e.config.urlState?.enableStateToken !== !1
  };
}
function fn(e, t, r) {
  const n = String(t || "").trim();
  if (!n) return null;
  try {
    const s = JSON.parse(n);
    return Array.isArray(s) ? s : (console.warn(`[DataGrid] Invalid ${r} payload in URL (expected array)`), null);
  } catch (s) {
    return console.warn(`[DataGrid] Failed to parse ${r} payload from URL:`, s), null;
  }
}
function mn(e, t, r = {}) {
  const n = r.merge === !0, s = new Set(e.config.columns.map((o) => o.field)), a = Array.isArray(t.hiddenColumns) ? new Set(t.hiddenColumns.map((o) => String(o || "").trim()).filter((o) => o.length > 0 && s.has(o))) : null;
  a ? (e.state.hiddenColumns = a, e.hasPersistedHiddenColumnState = !0) : n || (e.state.hiddenColumns = new Set(e.config.columns.filter((o) => o.hidden).map((o) => o.field)), e.hasPersistedHiddenColumnState = !1);
  const i = Array.isArray(t.columnOrder) ? t.columnOrder.map((o) => String(o || "").trim()).filter((o) => o.length > 0 && s.has(o)) : null;
  if (i && i.length > 0) {
    const o = e.mergeColumnOrder(i);
    e.state.columnOrder = o, e.hasPersistedColumnOrderState = !0, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((c) => c.field).join("|") !== o.join("|");
    const l = new Map(e.config.columns.map((c) => [c.field, c]));
    e.config.columns = o.map((c) => l.get(c)).filter((c) => c !== void 0);
  } else n || (e.state.columnOrder = e.config.columns.map((o) => o.field), e.hasPersistedColumnOrderState = !1, e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1);
  if (e.config.enableGroupedMode) {
    if (t.viewMode) {
      const o = kt(t.viewMode);
      o && (e.state.viewMode = De(o));
    }
    e.state.expandMode = te(t.expandMode, e.state.expandMode), Array.isArray(t.expandedGroups) ? (e.state.expandedGroups = new Set(t.expandedGroups.map((o) => String(o || "").trim()).filter(Boolean)), e.state.hasPersistedExpandState = !0) : t.expandMode !== void 0 && (e.state.hasPersistedExpandState = !0);
  }
}
function gn(e, t) {
  t.persisted && e.applyPersistedStateSnapshot(t.persisted, { merge: !0 }), typeof t.search == "string" && (e.state.search = t.search), typeof t.page == "number" && Number.isFinite(t.page) && (e.state.currentPage = Math.max(1, Math.trunc(t.page))), typeof t.perPage == "number" && Number.isFinite(t.perPage) && (e.state.perPage = Math.max(1, Math.trunc(t.perPage))), Array.isArray(t.filters) && (e.state.filters = t.filters), Array.isArray(t.sort) && (e.state.sort = t.sort);
}
function bn(e) {
  const t = {
    version: 1,
    hiddenColumns: Array.from(e.state.hiddenColumns),
    columnOrder: [...e.state.columnOrder],
    updatedAt: Date.now()
  };
  return e.config.enableGroupedMode && (t.viewMode = e.state.viewMode, t.expandMode = e.state.expandMode, t.expandedGroups = Array.from(e.state.expandedGroups)), t;
}
function yn(e) {
  return {
    version: 1,
    search: e.state.search || void 0,
    page: e.state.currentPage > 1 ? e.state.currentPage : void 0,
    perPage: e.state.perPage !== (e.config.perPage || 10) ? e.state.perPage : void 0,
    filters: e.state.filters.length > 0 ? [...e.state.filters] : void 0,
    sort: e.state.sort.length > 0 ? [...e.state.sort] : void 0,
    persisted: e.buildPersistedStateSnapshot(),
    updatedAt: Date.now()
  };
}
function vn(e) {
  e.stateStore.savePersistedState(e.buildPersistedStateSnapshot());
}
function wn(e) {
  const t = new URLSearchParams(window.location.search);
  e.didRestoreColumnOrder = !1, e.shouldReorderDOMOnRestore = !1, e.hasURLStateOverrides = Me.some((c) => t.has(c));
  const r = t.get(le);
  if (r) {
    const c = e.stateStore.resolveShareState(r);
    c && e.applyShareStateSnapshot(c);
  }
  const n = t.get(Q);
  if (n) {
    e.state.search = n;
    const c = document.querySelector(e.selectors.searchInput);
    c && (c.value = n);
  }
  const s = t.get(W);
  if (s) {
    const c = parseInt(s, 10);
    e.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const a = t.get(X);
  if (a) {
    const c = parseInt(a, 10), d = e.config.perPage || 10;
    e.state.perPage = Number.isNaN(c) ? d : Math.max(1, c);
    const u = document.querySelector(e.selectors.perPageSelect);
    u && (u.value = String(e.state.perPage));
  }
  const i = t.get(Z);
  if (i) {
    const c = e.parseJSONArray(i, "filters");
    c && (e.state.filters = c);
  }
  const o = t.get(ee);
  if (o) {
    const c = e.parseJSONArray(o, "sort");
    c && (e.state.sort = c);
  }
  if (e.config.enableGroupedMode) {
    const c = kt(t.get(ce));
    c && (e.state.viewMode = De(c)), t.has("expanded_groups") && (e.state.expandedGroups = rn(t.get(Pe)), e.state.expandMode = "explicit", e.state.hasPersistedExpandState = !0);
  }
  const l = t.get(Ie);
  if (l) {
    const c = e.parseJSONArray(l, "hidden columns");
    if (c) {
      const d = new Set(e.config.columns.map((u) => u.field));
      e.state.hiddenColumns = new Set(c.map((u) => typeof u == "string" ? u.trim() : "").filter((u) => u.length > 0 && d.has(u)));
    }
  } else if (!e.hasPersistedHiddenColumnState && e.config.behaviors?.columnVisibility) {
    const c = e.config.columns.map((u) => u.field), d = e.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(c);
    d.size > 0 && (e.state.hiddenColumns = d);
  }
  if (!e.hasPersistedColumnOrderState && e.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const c = e.config.columns.map((u) => u.field), d = e.config.behaviors.columnVisibility.loadColumnOrderFromCache(c);
    if (d && d.length > 0) {
      const u = e.mergeColumnOrder(d);
      e.state.columnOrder = u, e.didRestoreColumnOrder = !0, e.shouldReorderDOMOnRestore = e.defaultColumns.map((h) => h.field).join("|") !== u.join("|");
      const p = new Map(e.config.columns.map((h) => [h.field, h]));
      e.config.columns = u.map((h) => p.get(h)).filter((h) => h !== void 0);
    }
  }
  e.persistStateSnapshot(), console.log("[DataGrid] State restored from URL:", e.state), setTimeout(() => {
    e.applyRestoredState();
  }, 0);
}
function xn(e) {
  const t = document.querySelector(e.selectors.searchInput);
  t && (t.value = e.state.search);
  const r = document.querySelector(e.selectors.perPageSelect);
  r && (r.value = String(e.state.perPage)), e.state.filters.length > 0 && e.state.filters.forEach((s) => {
    const a = document.querySelector(`[data-filter-column="${s.column}"]`);
    a && (a.value = String(s.value));
  }), e.didRestoreColumnOrder && e.shouldReorderDOMOnRestore && e.reorderTableColumns(e.state.columnOrder);
  const n = e.config.columns.filter((s) => !e.state.hiddenColumns.has(s.field)).map((s) => s.field);
  e.updateColumnVisibility(n, !0), e.state.sort.length > 0 && e.updateSortIndicators();
}
function Sn(e, t = {}) {
  e.persistStateSnapshot();
  const r = e.getURLStateConfig(), n = new URLSearchParams(window.location.search);
  pn(n, Me), e.state.search && n.set(Q, e.state.search), e.state.currentPage > 1 && n.set(W, String(e.state.currentPage)), e.state.perPage !== (e.config.perPage || 10) && n.set(X, String(e.state.perPage));
  let s = !1;
  if (e.state.filters.length > 0) {
    const o = JSON.stringify(e.state.filters);
    o.length <= r.maxFiltersLength ? n.set(Z, o) : s = !0;
  }
  e.state.sort.length > 0 && n.set(ee, JSON.stringify(e.state.sort)), e.config.enableGroupedMode && n.set(ce, e.state.viewMode);
  let a = Ge(window.location.pathname, n);
  const i = a.length > r.maxURLLength;
  if (r.enableStateToken && (s || i)) {
    n.delete(Q), n.delete(W), n.delete(X), n.delete(Z), n.delete(ee);
    const o = e.stateStore.createShareState(e.buildShareStateSnapshot());
    o && n.set(le, o), a = Ge(window.location.pathname, n);
  }
  t.replace ? window.history.replaceState({}, "", a) : window.history.pushState({}, "", a), console.log("[DataGrid] URL updated:", a);
}
async function $n(e) {
  console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(e.state.sort)), e.abortController && e.abortController.abort(), e.abortController = new AbortController();
  try {
    const t = await I(e.buildApiUrl(), {
      signal: e.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!t.ok) {
      if (e.handleGroupedModeStatusFallback(t.status)) return;
      throw new Error(`HTTP error! status: ${t.status}`);
    }
    const r = await t.json(), n = rr(r) || r;
    console.log("[DataGrid] API Response:", n), console.log("[DataGrid] API Response data array:", n.data), console.log("[DataGrid] API Response total:", n.total, "count:", n.count, "$meta:", n.$meta);
    const s = n.data || n.records || [];
    if (e.handleGroupedModePayloadFallback(s)) return;
    e.lastSchema = n.schema || null, e.lastForm = n.form || null, e.setBulkActionState(n.$meta?.bulk_action_state || null, n.schema?.bulk_action_state_config || null);
    const a = e.getResponseTotal(n);
    if (e.normalizePagination(a)) return e.refresh();
    console.log("[DataGrid] About to call renderData()..."), e.renderData(n), console.log("[DataGrid] renderData() completed"), e.updatePaginationUI(n), e.updateBulkActionsBar(), console.log("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (t) {
    if (t instanceof Error && t.name === "AbortError") {
      console.log("[DataGrid] Request aborted");
      return;
    }
    console.error("[DataGrid] Error fetching data:", t), e.showError("Failed to load data");
  }
}
function Cn(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  Object.entries(r).forEach(([s, a]) => {
    a != null && t.append(s, String(a));
  });
  const n = `${e.config.apiEndpoint}?${t.toString()}`;
  return console.log(`[DataGrid] API URL: ${n}`), n;
}
function kn(e) {
  const t = new URLSearchParams(), r = e.buildQueryParams();
  return Object.entries(r).forEach(([n, s]) => {
    s != null && t.append(n, String(s));
  }), t.toString();
}
function An(e) {
  const t = {};
  if (e.config.behaviors?.pagination) {
    const r = e.config.behaviors.pagination.buildQuery(e.state.currentPage, e.state.perPage);
    Object.assign(t, r);
  }
  if (e.state.search && e.config.behaviors?.search) {
    const r = e.config.behaviors.search.buildQuery(e.state.search);
    Object.assign(t, r);
  }
  if (e.state.filters.length > 0 && e.config.behaviors?.filter) {
    const r = e.config.behaviors.filter.buildFilters(e.state.filters);
    Object.assign(t, r);
  }
  if (e.state.sort.length > 0 && e.config.behaviors?.sort) {
    const r = e.config.behaviors.sort.buildQuery(e.state.sort);
    Object.assign(t, r);
  }
  return e.isGroupedViewActive() && (t.group_by = e.config.groupByField || "family_id"), t;
}
function En(e, t) {
  return t.total !== void 0 && t.total !== null ? t.total : t.$meta?.count !== void 0 && t.$meta?.count !== null ? t.$meta.count : t.count !== void 0 && t.count !== null ? t.count : null;
}
function Ln(e, t) {
  if (t === null) return !1;
  const r = Math.max(1, e.state.perPage || e.config.perPage || 10), n = Math.max(1, Math.ceil(t / r));
  let s = e.state.currentPage;
  t === 0 ? s = 1 : s > n ? s = n : s < 1 && (s = 1);
  const a = r !== e.state.perPage || s !== e.state.currentPage;
  return a && (e.state.perPage = r, e.state.currentPage = s, e.pushStateToURL()), t === 0 ? !1 : a;
}
async function _n(e, t) {
  const r = await I(`${e.config.apiEndpoint}/${t}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!r.ok) throw new Error(`Detail request failed: ${r.status}`);
  const n = await r.json(), s = e.normalizeDetailResponse(n);
  return s.schema && (e.lastSchema = s.schema), s.form && (e.lastForm = s.form), {
    ...s,
    tabs: s.schema?.tabs || []
  };
}
function Rn(e, t) {
  const r = nt(t) || t;
  if (r && typeof r == "object" && "data" in r) {
    const n = r;
    return {
      data: n.data,
      schema: n.schema,
      form: n.form
    };
  }
  return { data: t };
}
function Dn(e) {
  return e.lastSchema;
}
function In(e) {
  return e.lastForm;
}
function Pn(e) {
  return e.lastSchema?.tabs || [];
}
function Mn(e, t, r, n) {
  const s = e.config.groupByField || "family_id", a = r.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let i = Nr(a, {
    groupByField: s,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  });
  i || (i = zr(a, {
    groupByField: s,
    defaultExpanded: !e.state.hasPersistedExpandState,
    expandMode: e.state.expandMode,
    expandedGroups: e.state.expandedGroups
  }));
  const o = Qr(t);
  o.size > 0 && (i = Yr(i, o)), e.state.groupedData = i;
  const l = e.config.columns.length;
  for (const c of i.groups) {
    const d = on(c, l);
    n.insertAdjacentHTML("beforeend", d);
    const u = n.lastElementChild;
    u && (u.addEventListener("click", () => e.toggleGroup(c.groupId)), u.addEventListener("keydown", (p) => {
      (p.key === "Enter" || p.key === " ") && (p.preventDefault(), e.toggleGroup(c.groupId));
    }));
    for (const p of c.records) {
      p.id && (e.recordsById[p.id] = p);
      const h = e.createTableRow(p);
      h.dataset.groupId = c.groupId, h.classList.add("group-child-row"), c.expanded || (h.style.display = "none"), n.appendChild(h);
    }
  }
  for (const c of i.ungrouped) {
    c.id && (e.recordsById[c.id] = c);
    const d = e.createTableRow(c);
    n.appendChild(d);
  }
  console.log(`[DataGrid] Rendered ${i.groups.length} groups, ${i.ungrouped.length} ungrouped`);
}
function Tn(e) {
  return e.config.enableGroupedMode ? e.state.viewMode === "grouped" || e.state.viewMode === "matrix" : !1;
}
function Bn(e, t) {
  e.isGroupedViewActive() && (e.state.viewMode = "flat", e.state.groupedData = null, e.pushStateToURL({ replace: !0 }), e.notify(t, "warning"), e.refresh());
}
function Fn(e, t) {
  return !e.isGroupedViewActive() || ![
    400,
    404,
    405,
    422
  ].includes(t) ? !1 : (e.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function qn(e, t) {
  if (!e.isGroupedViewActive() || t.length === 0) return !1;
  const r = t.filter((n) => !!n && typeof n == "object" && !Array.isArray(n));
  return r.length !== t.length || !mt(r) ? (e.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function On(e, t) {
  if (!e.state.groupedData) return;
  const r = String(t || "").trim();
  if (!r) return;
  const n = e.isGroupExpandedByState(r, !e.state.hasPersistedExpandState);
  e.state.expandMode === "all" ? n ? e.state.expandedGroups.add(r) : e.state.expandedGroups.delete(r) : e.state.expandMode === "none" ? n ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r) : (!e.state.hasPersistedExpandState && e.state.expandedGroups.size === 0 && (e.state.expandedGroups = new Set(e.state.groupedData.groups.map((a) => a.groupId))), e.state.expandedGroups.has(r) ? e.state.expandedGroups.delete(r) : e.state.expandedGroups.add(r)), e.state.hasPersistedExpandState = !0;
  const s = e.state.groupedData.groups.find((a) => a.groupId === r);
  s && (s.expanded = e.isGroupExpandedByState(r)), e.updateGroupVisibility(r), e.pushStateToURL({ replace: !0 });
}
function jn(e, t) {
  if (!e.config.enableGroupedMode) return;
  const r = new Set((t || []).map((n) => String(n || "").trim()).filter(Boolean));
  e.state.expandMode = "explicit", e.state.expandedGroups = r, e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh();
}
function zn(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "all", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Nn(e) {
  e.config.enableGroupedMode && (e.state.expandMode = "none", e.state.expandedGroups.clear(), e.state.hasPersistedExpandState = !0, e.updateGroupedRowsFromState(), e.pushStateToURL({ replace: !0 }), !e.state.groupedData && e.isGroupedViewActive() && e.refresh());
}
function Gn(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) return;
  const n = r.querySelector(`tr[data-group-id="${t}"]`);
  if (!n) return;
  const s = e.isGroupExpandedByState(t);
  n.dataset.expanded = String(s), n.setAttribute("aria-expanded", String(s));
  const a = n.querySelector(".expand-icon");
  a && (a.textContent = s ? "▼" : "▶"), r.querySelectorAll(`tr.group-child-row[data-group-id="${t}"]`).forEach((i) => {
    i.style.display = s ? "" : "none";
  });
}
function Hn(e) {
  if (e.state.groupedData)
    for (const t of e.state.groupedData.groups)
      t.expanded = e.isGroupExpandedByState(t.groupId), e.updateGroupVisibility(t.groupId);
}
function Un(e, t, r = !1) {
  const n = te(e.state.expandMode, "explicit");
  return n === "all" ? !e.state.expandedGroups.has(t) : n === "none" ? e.state.expandedGroups.has(t) : e.state.expandedGroups.size === 0 ? r : e.state.expandedGroups.has(t);
}
function Vn(e, t) {
  if (!e.config.enableGroupedMode) {
    console.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const r = De(t);
  e.state.viewMode = r, r === "flat" && (e.state.groupedData = null), e.pushStateToURL(), e.refresh();
}
function Kn(e) {
  return e.state.viewMode;
}
function Jn(e) {
  return e.state.groupedData;
}
function Yn(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function Qn(e) {
  const t = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", r = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (e.notifier?.confirm) return e.notifier.confirm(t, {
    title: r,
    confirmText: "Delete",
    cancelText: "Cancel"
  });
  const n = globalThis.window;
  return n && typeof n.confirm == "function" ? n.confirm(t) : !0;
}
async function At(e) {
  if (!await Qn(e)) return null;
  const t = await et(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (t.success)
    return await e.onSuccess?.(t), t;
  const r = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", n = t.error || Yn(r), s = {
    ...n,
    message: N(n, r)
  };
  throw s.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(s), await e.onError?.(s), se(s, r, !!e.onError);
}
function Wn(e, t, r = !1) {
  if (!e.tableEl) return;
  const n = new Set(t);
  e.state.hiddenColumns.clear(), e.config.columns.forEach((s) => {
    n.has(s.field) || e.state.hiddenColumns.add(s.field);
  }), r || e.pushStateToURL(), e.tableEl.querySelectorAll("thead th[data-column]").forEach((s) => {
    const a = s.dataset.column;
    a && (s.style.display = n.has(a) ? "" : "none");
  }), e.tableEl.querySelectorAll("tbody td[data-column]").forEach((s) => {
    const a = s.dataset.column;
    a && (s.style.display = n.has(a) ? "" : "none");
  }), e.syncColumnVisibilityCheckboxes();
}
function Xn(e) {
  if (e.columnManager) {
    e.columnManager.syncWithGridState();
    return;
  }
  const t = document.querySelector(e.selectors.columnToggleMenu);
  t && e.config.columns.forEach((r) => {
    const n = t.querySelector(`input[data-column="${r.field}"]`);
    n && (n.checked = !e.state.hiddenColumns.has(r.field));
  });
}
function Zn(e, t) {
  const r = e.tableEl?.querySelector("tbody");
  if (!r) {
    console.error("[DataGrid] tbody not found!");
    return;
  }
  r.innerHTML = "";
  const n = t.data || t.records || [];
  console.log(`[DataGrid] renderData() called with ${n.length} items`), console.log("[DataGrid] First 3 items:", n.slice(0, 3));
  const s = e.getResponseTotal(t);
  if (e.state.totalRows = s ?? n.length, n.length === 0) {
    e.isGroupedViewActive() ? r.innerHTML = cn(e.config.columns.length) : r.innerHTML = `
          <tr>
            <td colspan="${e.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
    return;
  }
  e.recordsById = {}, e.isGroupedViewActive() ? e.renderGroupedData(t, n, r) : e.renderFlatData(n, r), e.state.hiddenColumns.size > 0 && r.querySelectorAll("td[data-column]").forEach((a) => {
    const i = a.dataset.column;
    i && e.state.hiddenColumns.has(i) && (a.style.display = "none");
  }), e.updateSelectionBindings();
}
function es(e, t, r) {
  t.forEach((n, s) => {
    console.log(`[DataGrid] Rendering row ${s + 1}: id=${n.id}`), n.id && (e.recordsById[n.id] = n);
    const a = e.createTableRow(n);
    r.appendChild(a);
  }), console.log(`[DataGrid] Finished appending ${t.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", r.children.length);
}
function ts(e, t) {
  const r = t.rendererOptions ?? t.renderer_options;
  return !r || typeof r != "object" || Array.isArray(r) ? {} : r;
}
function rs(e, t) {
  const r = document.createElement("tr");
  let n = ["hover:bg-gray-50"];
  e.config.rowClassProvider && (n = n.concat(e.config.rowClassProvider(t))), r.className = n.join(" ");
  const s = document.createElement("td");
  s.className = "px-6 py-4 whitespace-nowrap", s.dataset.role = "selection", s.dataset.fixed = "left", s.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${t.id}">
        <span class="sr-only">Select</span>
      </label>
    `, r.appendChild(s), e.config.columns.forEach((o) => {
    const l = document.createElement("td");
    l.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", o.field);
    const c = t[o.field], d = typeof o.renderer == "string" ? o.renderer.trim() : "", u = { options: e.resolveRendererOptions(o) };
    if (o.render) l.innerHTML = o.render(c, t);
    else if (e.cellRendererRegistry.has(o.field)) l.innerHTML = e.cellRendererRegistry.get(o.field)(c, t, o.field, u);
    else if (d && e.cellRendererRegistry.has(d)) l.innerHTML = e.cellRendererRegistry.get(d)(c, t, o.field, u);
    else if (c == null) l.textContent = "-";
    else if (o.field.includes("_at")) {
      const p = ie(c);
      l.textContent = p ? p.toLocaleDateString() : String(c);
    } else l.textContent = String(c);
    r.appendChild(l);
  });
  const a = e.config.actionBasePath || e.config.apiEndpoint, i = document.createElement("td");
  if (i.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", i.dataset.role = "actions", i.dataset.fixed = "right", e.config.rowActions) {
    const o = e.config.rowActions(t);
    i.innerHTML = e.actionRenderer.renderRowActions(t, o), o.forEach((l) => {
      const c = e.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
      l.disabled || d && d.addEventListener("click", async (u) => {
        if (u.preventDefault(), !d.disabled)
          try {
            await l.action(t);
          } catch (p) {
            if (console.error(`Action "${l.label}" failed:`, p), z(p)?.textCode && await e.refresh(), !M(p)) {
              const h = p instanceof Error ? p.message : `Action "${l.label}" failed`;
              e.notify(h, "error");
            }
          }
      });
    });
  } else if (e.config.useDefaultActions !== !1) {
    const o = [
      {
        label: "View",
        icon: "eye",
        action: () => {
          window.location.href = `${a}/${t.id}`;
        },
        variant: "secondary"
      },
      {
        label: "Edit",
        icon: "edit",
        action: () => {
          window.location.href = `${a}/${t.id}/edit`;
        },
        variant: "primary"
      },
      {
        label: "Delete",
        icon: "trash",
        action: async () => {
          await e.handleDelete(t.id);
        },
        variant: "danger"
      }
    ];
    i.innerHTML = e.actionRenderer.renderRowActions(t, o), o.forEach((l) => {
      const c = e.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
      d && d.addEventListener("click", async (u) => {
        if (u.preventDefault(), u.stopPropagation(), !d.disabled)
          try {
            await l.action();
          } catch (p) {
            if (console.error(`Action "${l.label}" failed:`, p), z(p)?.textCode && await e.refresh(), !M(p)) {
              const h = p instanceof Error ? p.message : `Action "${l.label}" failed`;
              e.notify(h, "error");
            }
          }
      });
    });
  }
  return r.appendChild(i), r;
}
function ns(e, t) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function ss(e, t) {
  try {
    await At({
      endpoint: `${e.config.apiEndpoint}/${t}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await e.refresh();
      },
      onError: (r) => {
        e.showError(N(r, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await e.refresh();
      },
      notifier: { confirm: async (r, n) => e.confirmAction(r, n) }
    });
  } catch (r) {
    console.error("Error deleting item:", r), M(r) || e.showError(r instanceof Error ? r.message : "Failed to delete item");
  }
}
function as(e, t) {
  const r = e.getResponseTotal(t) ?? e.state.totalRows, n = e.state.perPage * (e.state.currentPage - 1), s = r === 0 ? 0 : n + 1, a = Math.min(n + e.state.perPage, r), i = document.querySelector(e.selectors.tableInfoStart), o = document.querySelector(e.selectors.tableInfoEnd), l = document.querySelector(e.selectors.tableInfoTotal);
  i && (i.textContent = String(s)), o && (o.textContent = String(a)), l && (l.textContent = String(r)), e.renderPaginationButtons(r);
}
function is(e, t) {
  const r = document.querySelector(e.selectors.paginationContainer);
  if (!r) return;
  const n = Math.ceil(t / e.state.perPage);
  if (n <= 1) {
    r.innerHTML = "";
    return;
  }
  const s = [], a = e.state.currentPage;
  s.push(`
      <button type="button"
              data-page="${a - 1}"
              ${a === 1 ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);
  const i = 5;
  let o = Math.max(1, a - Math.floor(i / 2)), l = Math.min(n, o + i - 1);
  l - o < i - 1 && (o = Math.max(1, l - i + 1));
  for (let c = o; c <= l; c++) {
    const d = c === a;
    s.push(`
        <button type="button"
                data-page="${c}"
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${d ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} py-2 px-3 text-sm rounded-lg">
          ${c}
        </button>
      `);
  }
  s.push(`
      <button type="button"
              data-page="${a + 1}"
              ${a === n ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), r.innerHTML = s.join(""), r.querySelectorAll("[data-page]").forEach((c) => {
    c.addEventListener("click", async () => {
      const d = parseInt(c.dataset.page || "1", 10);
      d >= 1 && d <= n && (e.state.currentPage = d, e.pushStateToURL(), e.config.behaviors?.pagination ? await e.config.behaviors.pagination.onPageChange(d, e) : await e.refresh());
    });
  });
}
var os = class {
  constructor(e) {
    this.sortable = null, this.searchInput = null, this.columnListEl = null, this.countBadgeEl = null, this.container = e.container, this.grid = e.grid, this.onReorder = e.onReorder, this.onToggle = e.onToggle, this.onReset = e.onReset, this.initialize();
  }
  initialize() {
    this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  render() {
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns;
    this.container.innerHTML = "";
    const r = this.createHeader(e.length, e.length - t.size);
    this.container.appendChild(r);
    const n = document.createElement("div");
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((a) => {
      const i = this.createColumnItem(a.field, a.label || a.field, !t.has(a.field));
      n.appendChild(i);
    }), this.container.appendChild(n);
    const s = this.createFooter();
    this.container.appendChild(s);
  }
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "column-search-icon"), s.setAttribute("viewBox", "0 0 24 24"), s.setAttribute("fill", "none"), s.setAttribute("stroke", "currentColor"), s.setAttribute("stroke-width", "2");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    a.setAttribute("cx", "11"), a.setAttribute("cy", "11"), a.setAttribute("r", "8");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    i.setAttribute("d", "m21 21-4.3-4.3"), s.appendChild(a), s.appendChild(i);
    const o = document.createElement("input");
    o.type = "text", o.className = "column-search-input", o.placeholder = "Filter columns...", o.setAttribute("aria-label", "Filter columns"), this.searchInput = o, o.addEventListener("input", () => {
      this.filterColumns(o.value);
    }), n.appendChild(s), n.appendChild(o);
    const l = document.createElement("span");
    return l.className = "column-count-badge", l.textContent = `${t} of ${e}`, l.setAttribute("aria-live", "polite"), this.countBadgeEl = l, r.appendChild(n), r.appendChild(l), r;
  }
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((r) => {
      const n = r.querySelector(".column-label")?.textContent?.toLowerCase() || "", s = t === "" || n.includes(t);
      r.style.display = s ? "" : "none";
    }), this.updateScrollShadows();
  }
  updateCountBadge() {
    if (!this.countBadgeEl) return;
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns, r = e.length - t.size;
    this.countBadgeEl.textContent = `${r} of ${e.length}`;
  }
  setupScrollShadows() {
    this.columnListEl && (this.updateScrollShadows(), this.columnListEl.addEventListener("scroll", () => {
      this.updateScrollShadows();
    }), new ResizeObserver(() => {
      this.updateScrollShadows();
    }).observe(this.columnListEl));
  }
  updateScrollShadows() {
    if (!this.columnListEl) return;
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, n = e.clientHeight, s = r > n, a = s && t > 0, i = s && t + n < r - 1;
    e.classList.toggle("column-list--shadow-top", a), e.classList.toggle("column-list--shadow-bottom", i);
  }
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    r.setAttribute("class", "column-reset-icon"), r.setAttribute("viewBox", "0 0 24 24"), r.setAttribute("fill", "none"), r.setAttribute("stroke", "currentColor"), r.setAttribute("stroke-width", "2"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-linejoin", "round");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(s);
    const a = document.createElement("span");
    return a.textContent = "Reset to Default", t.appendChild(r), t.appendChild(a), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  createColumnItem(e, t, r) {
    const n = `column-item-${e}`, s = `column-switch-${e}`, a = document.createElement("div");
    a.className = "column-item", a.id = n, a.dataset.column = e, a.setAttribute("role", "listitem");
    const i = document.createElement("div");
    i.className = "column-item-content";
    const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    o.setAttribute("class", "drag-handle"), o.setAttribute("viewBox", "0 0 20 20"), o.setAttribute("fill", "currentColor"), o.setAttribute("aria-hidden", "true"), o.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([h, y]) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", String(h)), g.setAttribute("cy", String(y)), g.setAttribute("r", "1.5"), o.appendChild(g);
    });
    const l = document.createElement("span");
    l.className = "column-label", l.id = `${n}-label`, l.textContent = t, i.appendChild(o), i.appendChild(l);
    const c = document.createElement("label");
    c.className = "column-switch", c.htmlFor = s;
    const d = document.createElement("input");
    d.type = "checkbox", d.id = s, d.dataset.column = e, d.checked = r, d.setAttribute("role", "switch"), d.setAttribute("aria-checked", String(r)), d.setAttribute("aria-labelledby", `${n}-label`), d.setAttribute("aria-describedby", `${n}-desc`);
    const u = document.createElement("span");
    u.id = `${n}-desc`, u.className = "sr-only", u.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const p = document.createElement("span");
    return p.className = "column-switch-slider", p.setAttribute("aria-hidden", "true"), c.appendChild(d), c.appendChild(p), a.appendChild(i), a.appendChild(c), a.appendChild(u), a;
  }
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = ir.create(e, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "column-item-ghost",
      dragClass: "column-item-drag",
      chosenClass: "column-item-chosen",
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: !0,
      onEnd: () => {
        const t = e.querySelectorAll(".column-item"), r = Array.from(t).map((n) => n.dataset.column);
        this.onReorder && this.onReorder(r), this.grid.reorderColumns(r), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(r, this.grid);
      }
    });
  }
  bindSwitchToggles() {
    this.container.querySelectorAll('input[type="checkbox"]').forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.dataset.column;
        if (!t) return;
        const r = e.checked;
        e.setAttribute("aria-checked", String(r));
        const n = `column-item-${t}-desc`, s = this.container.querySelector(`#${n}`);
        s && (s.textContent = `Press Space or Enter to toggle ${this.container.querySelector(`#column-item-${t}-label`)?.textContent || t} column visibility. Currently ${r ? "visible" : "hidden"}.`), this.onToggle && this.onToggle(t, r), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(t, this.grid), this.updateCountBadge();
      });
    });
  }
  updateSwitchState(e, t) {
    const r = this.container.querySelector(`input[type="checkbox"][data-column="${e}"]`);
    r && (r.checked = t, r.setAttribute("aria-checked", String(t)));
  }
  syncWithGridState() {
    const e = this.grid.state.hiddenColumns;
    this.grid.config.columns.forEach((t) => {
      this.updateSwitchState(t.field, !e.has(t.field));
    }), this.updateCountBadge();
  }
  getColumnOrder() {
    const e = this.container.querySelectorAll(".column-item");
    return Array.from(e).map((t) => t.dataset.column);
  }
  refresh() {
    this.destroy(), this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  destroy() {
    this.sortable && (this.sortable.destroy(), this.sortable = null);
  }
};
function ls(e, t, r, n, s) {
  const a = (i) => {
    const o = i.target;
    if (!o) return;
    const l = o.closest(r);
    !l || !(l instanceof HTMLElement) || n(i, l);
  };
  return e.addEventListener(t, a, s), () => e.removeEventListener(t, a, s);
}
function cs(e) {
  const t = document.querySelector(e.selectors.searchInput);
  if (!t) {
    console.warn(`[DataGrid] Search input not found: ${e.selectors.searchInput}`);
    return;
  }
  console.log(`[DataGrid] Search input bound to: ${e.selectors.searchInput}`);
  const r = document.getElementById("clear-search-btn"), n = () => {
    r && (t.value.trim() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  };
  t.addEventListener("input", () => {
    n(), e.searchTimeout && clearTimeout(e.searchTimeout), e.searchTimeout = window.setTimeout(async () => {
      console.log(`[DataGrid] Search triggered: "${t.value}"`), e.state.search = t.value, e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch(t.value, e) : (e.resetPagination(), await e.refresh());
    }, e.config.searchDelay);
  }), r && r.addEventListener("click", async () => {
    t.value = "", t.focus(), n(), e.state.search = "", e.pushStateToURL(), e.config.behaviors?.search ? await e.config.behaviors.search.onSearch("", e) : (e.resetPagination(), await e.refresh());
  }), n();
}
function ds(e) {
  const t = document.querySelector(e.selectors.perPageSelect);
  t && t.addEventListener("change", async () => {
    e.state.perPage = parseInt(t.value, 10), e.resetPagination(), e.pushStateToURL(), await e.refresh();
  });
}
function us(e) {
  document.querySelectorAll(e.selectors.filterRow).forEach((t) => {
    const r = async () => {
      const n = t.dataset.filterColumn, s = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", a = t instanceof HTMLSelectElement ? "eq" : s === "" || s === "text" || s === "search" || s === "email" || s === "tel" || s === "url" ? "ilike" : "eq", i = t.dataset.filterOperator || a, o = t.value;
      if (!n) return;
      const l = e.state.filters.findIndex((c) => c.column === n);
      if (o) {
        const c = {
          column: n,
          operator: i,
          value: o
        };
        l >= 0 ? e.state.filters[l] = c : e.state.filters.push(c);
      } else l >= 0 && e.state.filters.splice(l, 1);
      e.pushStateToURL(), e.config.behaviors?.filter ? await e.config.behaviors.filter.onFilterChange(n, o, e) : (e.resetPagination(), await e.refresh());
    };
    t.addEventListener("input", r), t.addEventListener("change", r);
  });
}
function ps(e) {
  const t = document.querySelector(e.selectors.columnToggleBtn), r = document.querySelector(e.selectors.columnToggleMenu);
  !t || !r || (e.columnManager = new os({
    container: r,
    grid: e,
    onToggle: (n, s) => {
      console.log(`[DataGrid] Column ${n} visibility toggled to ${s}`);
    },
    onReorder: (n) => {
      console.log("[DataGrid] Columns reordered:", n);
    }
  }));
}
function hs(e) {
  const t = document.querySelector(e.selectors.exportMenu);
  if (!t) return;
  const r = t.querySelectorAll("[data-export-format]");
  r.forEach((n) => {
    n.addEventListener("click", async () => {
      const s = n.dataset.exportFormat;
      if (!s || !e.config.behaviors?.export) return;
      const a = e.config.behaviors.export.getConcurrency?.() || "single", i = [];
      a === "single" ? r.forEach((d) => i.push(d)) : a === "per-format" && i.push(n);
      const o = (d) => {
        const u = d.querySelector(".export-icon"), p = d.querySelector(".export-spinner");
        u && u.classList.add("hidden"), p && p.classList.remove("hidden");
      }, l = (d) => {
        const u = d.querySelector(".export-icon"), p = d.querySelector(".export-spinner");
        u && u.classList.remove("hidden"), p && p.classList.add("hidden");
      };
      i.forEach((d) => {
        d.setAttribute("data-export-loading", "true"), d.disabled = !0, o(d);
      });
      const c = a === "none";
      c && (n.setAttribute("data-export-loading", "true"), o(n));
      try {
        await e.config.behaviors.export.export(s, e);
      } catch (d) {
        console.error("[DataGrid] Export failed:", d);
      } finally {
        i.forEach((d) => {
          d.removeAttribute("data-export-loading"), d.disabled = !1, l(d);
        }), c && (n.removeAttribute("data-export-loading"), l(n));
      }
    });
  });
}
function fs(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    t.addEventListener("click", async (r) => {
      r.preventDefault(), r.stopPropagation();
      const n = t.dataset.sortColumn;
      if (!n) return;
      console.log(`[DataGrid] Sort button clicked for field: ${n}`);
      const s = e.state.sort.find((i) => i.field === n);
      let a = null;
      s ? s.direction === "asc" ? (a = "desc", s.direction = a) : (e.state.sort = e.state.sort.filter((i) => i.field !== n), a = null, console.log(`[DataGrid] Sort cleared for field: ${n}`)) : (a = "asc", e.state.sort = [{
        field: n,
        direction: a
      }]), console.log("[DataGrid] New sort state:", e.state.sort), e.pushStateToURL(), a !== null && e.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await e.config.behaviors.sort.onSort(n, a, e)) : (console.log("[DataGrid] Calling refresh() for sort"), await e.refresh()), console.log("[DataGrid] Updating sort indicators"), e.updateSortIndicators();
    });
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    t.addEventListener("click", async () => {
      const r = t.dataset.sort;
      if (!r) return;
      const n = e.state.sort.find((a) => a.field === r);
      let s = null;
      n ? n.direction === "asc" ? (s = "desc", n.direction = s) : (e.state.sort = e.state.sort.filter((a) => a.field !== r), s = null) : (s = "asc", e.state.sort = [{
        field: r,
        direction: s
      }]), e.pushStateToURL(), s !== null && e.config.behaviors?.sort ? await e.config.behaviors.sort.onSort(r, s, e) : await e.refresh(), e.updateSortIndicators();
    });
  }));
}
function ms(e) {
  e.tableEl && (e.tableEl.querySelectorAll("[data-sort-column]").forEach((t) => {
    const r = t.dataset.sortColumn;
    if (!r) return;
    const n = e.state.sort.find((a) => a.field === r), s = t.querySelector("svg");
    s && (n ? (t.classList.remove("opacity-0"), t.classList.add("opacity-100"), n.direction === "asc" ? (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400")) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400"))) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', s.classList.remove("text-blue-600"), s.classList.add("text-gray-400")));
  }), e.tableEl.querySelectorAll("[data-sort]").forEach((t) => {
    const r = t.dataset.sort, n = e.state.sort.find((a) => a.field === r), s = t.querySelector(".sort-indicator");
    s && (s.textContent = n ? n.direction === "asc" ? "↑" : "↓" : "");
  }));
}
function gs(e) {
  const t = document.querySelector(e.selectors.selectAllCheckbox);
  t && t.addEventListener("change", () => {
    document.querySelectorAll(e.selectors.rowCheckboxes).forEach((r) => {
      r.checked = t.checked;
      const n = r.dataset.id;
      n && (t.checked ? e.state.selectedRows.add(n) : e.state.selectedRows.delete(n));
    }), e.updateBulkActionsBar();
  }), e.updateSelectionBindings();
}
function bs(e) {
  document.querySelectorAll(e.selectors.rowCheckboxes).forEach((t) => {
    const r = t.dataset.id;
    r && (t.checked = e.state.selectedRows.has(r)), t.addEventListener("change", () => {
      r && (t.checked ? e.state.selectedRows.add(r) : e.state.selectedRows.delete(r)), e.updateBulkActionsBar();
    });
  });
}
function Et() {
  return Array.from(document.querySelectorAll("[data-bulk-action]"));
}
function ys(e) {
  if (!e) return null;
  let t = e.querySelector("[data-bulk-action-state-reasons]");
  return t || (t = document.createElement("div"), t.dataset.bulkActionStateReasons = "true", t.className = "hidden mt-3 text-sm text-gray-700", e.appendChild(t), t);
}
function Lt(e) {
  const t = ys(document.getElementById("bulk-actions-overlay"));
  if (t) {
    if (!e.length) {
      t.classList.add("hidden"), t.innerHTML = "";
      return;
    }
    t.classList.remove("hidden"), t.innerHTML = e.map((r) => `
    <div data-bulk-action-reason-item="${r.actionId}" class="mt-1">
      <span class="font-medium">${r.label}:</span> ${r.reason}
    </div>
  `).join("");
  }
}
function vs(e, t, r) {
  const n = t?.enabled === !1, s = typeof t?.reason == "string" ? t.reason.trim() : "";
  return e.dataset.disabled = n ? "true" : "false", e.setAttribute("aria-disabled", n ? "true" : "false"), e.dataset.bulkState = n ? "disabled" : "enabled", e.classList.toggle("opacity-50", n), e.classList.toggle("cursor-not-allowed", n), n && s ? (e.setAttribute("title", s), {
    actionId: e.dataset.bulkAction || "",
    label: r,
    reason: s
  }) : (e.removeAttribute("title"), null);
}
function ws(e) {
  const t = Et(), r = "Checking selected records...", n = [];
  t.forEach((s) => {
    s.dataset.disabled = "true", s.dataset.bulkState = "loading", s.setAttribute("aria-disabled", "true"), s.setAttribute("title", r), s.classList.add("opacity-50", "cursor-not-allowed"), n.push({
      actionId: s.dataset.bulkAction || "",
      label: s.textContent?.trim() || s.dataset.bulkAction || "Action",
      reason: r
    });
  }), Lt(n);
}
function _t(e) {
  return tt(e.bulkActionStateConfig);
}
function xs(e, t, r) {
  e.bulkActionState = at(t), e.bulkActionStateConfig = tt(r), e.applyBulkActionState(e.bulkActionState);
}
function Ss(e, t) {
  const r = at(t);
  e.bulkActionState = r;
  const n = [];
  Et().forEach((s) => {
    const a = s.dataset.bulkAction;
    if (!a) return;
    const i = vs(s, r[a] || null, s.textContent?.trim() || a);
    i && n.push(i);
  }), Lt(n);
}
async function $s(e) {
  const t = _t(e), r = typeof t?.selection_state_endpoint == "string" ? t.selection_state_endpoint.trim() : "";
  if (!r) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  const n = Array.from(e.state.selectedRows);
  if (!n.length) {
    e.applyBulkActionState(e.bulkActionState);
    return;
  }
  e.bulkActionStateAbortController && e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = new AbortController(), e.bulkActionStateRequestSeq += 1;
  const s = e.bulkActionStateRequestSeq, a = typeof e.buildQueryString == "function" ? e.buildQueryString() : "", i = a ? `${r}${r.includes("?") ? "&" : "?"}${a}` : r;
  try {
    const o = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      signal: e.bulkActionStateAbortController.signal,
      body: JSON.stringify({ ids: n })
    });
    if (!o.ok) throw new Error(`Bulk action state request failed: ${o.status}`);
    const l = tr(await o.json());
    if (!l || s !== e.bulkActionStateRequestSeq) return;
    e.applyBulkActionState({
      ...e.bulkActionState,
      ...l.bulk_action_state
    });
  } catch (o) {
    if (o instanceof Error && o.name === "AbortError") return;
    console.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", o), s === e.bulkActionStateRequestSeq && e.applyBulkActionState(e.bulkActionState);
  }
}
function Cs(e) {
  e.bulkActionStateDebounce && (clearTimeout(e.bulkActionStateDebounce), e.bulkActionStateDebounce = null);
  const t = _t(e), r = e.state.selectedRows.size;
  if (!t?.selection_sensitive || !t.selection_state_endpoint || r === 0) {
    e.bulkActionStateAbortController && (e.bulkActionStateAbortController.abort(), e.bulkActionStateAbortController = null), e.applyBulkActionState(e.bulkActionState);
    return;
  }
  ws(e);
  const n = typeof t.debounce_ms == "number" ? t.debounce_ms : 150;
  e.bulkActionStateDebounce = window.setTimeout(() => {
    e.bulkActionStateDebounce = null, $s(e);
  }, n);
}
function ks(e) {
  const t = document.getElementById("bulk-actions-overlay")?.dataset?.bulkBase || "";
  document.querySelectorAll("[data-bulk-action]").forEach((n) => {
    n.addEventListener("click", async () => {
      const s = n, a = s.dataset.bulkAction;
      if (!a || s.getAttribute("aria-disabled") === "true" || s.dataset.disabled === "true") return;
      const i = Array.from(e.state.selectedRows);
      if (i.length === 0) {
        e.notify("Please select items first", "warning");
        return;
      }
      if (e.config.bulkActions) {
        const o = e.config.bulkActions.find((l) => l.id === a);
        if (o) {
          try {
            await e.actionRenderer.executeBulkAction(o, i), e.state.selectedRows.clear(), e.updateBulkActionsBar(), await e.refresh();
          } catch (l) {
            console.error("Bulk action failed:", l), z(l)?.textCode && await e.refresh(), M(l) || e.showError(l instanceof Error ? l.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const o = `${t}/${a}`, l = s.dataset.bulkConfirm, c = e.parseDatasetStringArray(s.dataset.bulkPayloadRequired), d = e.parseDatasetObject(s.dataset.bulkPayloadSchema), u = {
          id: a,
          label: s.textContent?.trim() || a,
          endpoint: o,
          confirm: l,
          payloadRequired: c,
          payloadSchema: d
        };
        try {
          await e.actionRenderer.executeBulkAction(u, i), e.state.selectedRows.clear(), e.updateBulkActionsBar(), await e.refresh();
        } catch (p) {
          console.error("Bulk action failed:", p), z(p)?.textCode && await e.refresh(), M(p) || e.showError(p instanceof Error ? p.message : "Bulk action failed");
        }
        return;
      }
      if (e.config.behaviors?.bulkActions) try {
        await e.config.behaviors.bulkActions.execute(a, i, e), e.state.selectedRows.clear(), e.updateBulkActionsBar();
      } catch (o) {
        console.error("Bulk action failed:", o), z(o)?.textCode && await e.refresh(), M(o) || e.showError(o instanceof Error ? o.message : "Bulk action failed");
      }
    });
  });
  const r = document.getElementById("clear-selection-btn");
  r && r.addEventListener("click", () => {
    e.state.selectedRows.clear(), e.updateBulkActionsBar(), document.querySelectorAll(".table-checkbox").forEach((s) => s.checked = !1);
    const n = document.querySelector(e.selectors.selectAllCheckbox);
    n && (n.checked = !1);
  }), e.bindOverflowMenu();
}
function As(e) {
  const t = document.getElementById("bulk-more-btn"), r = document.getElementById("bulk-overflow-menu");
  !t || !r || (t.addEventListener("click", (n) => {
    n.stopPropagation(), r.classList.toggle("hidden");
  }), document.addEventListener("click", () => {
    r.classList.add("hidden");
  }), document.addEventListener("keydown", (n) => {
    n.key === "Escape" && r.classList.add("hidden");
  }), r.addEventListener("click", (n) => {
    n.stopPropagation();
  }));
}
function Es(e) {
  const t = document.getElementById("bulk-actions-overlay"), r = document.getElementById("selected-count"), n = e.state.selectedRows.size;
  if (console.log("[DataGrid] updateBulkActionsBar - overlay:", t, "countEl:", r, "count:", n), !t || !r) {
    console.error("[DataGrid] Missing bulk actions elements!");
    return;
  }
  r.textContent = String(n), n > 0 ? (t.classList.remove("hidden"), t.offsetHeight) : t.classList.add("hidden"), e.syncBulkActionState();
}
function Ls(e) {
  const t = document.getElementById("bulk-clear-selection");
  console.log("[DataGrid] Binding clear button:", t), t ? t.addEventListener("click", () => {
    console.log("[DataGrid] Clear button clicked!"), e.clearSelection();
  }) : console.error("[DataGrid] Clear button not found!");
}
function _s(e) {
  console.log("[DataGrid] Clearing selection..."), e.state.selectedRows.clear();
  const t = document.querySelector(e.selectors.selectAllCheckbox);
  t && (t.checked = !1), e.updateBulkActionsBar(), e.updateSelectionBindings();
}
function Rs(e, t, r) {
  const n = t.getBoundingClientRect(), s = r.offsetHeight || 300, a = window.innerHeight - n.bottom, i = n.top, o = a < s && i > a, l = n.right - (r.offsetWidth || 224);
  r.style.left = `${Math.max(10, l)}px`, o ? (r.style.top = `${n.top - s - 8}px`, r.style.bottom = "auto") : (r.style.top = `${n.bottom + 8}px`, r.style.bottom = "auto");
}
function Ds(e) {
  e.dropdownAbortController && e.dropdownAbortController.abort(), e.dropdownAbortController = new AbortController();
  const { signal: t } = e.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((r) => {
    const n = r.dataset.dropdownToggle, s = document.getElementById(n || "");
    s && !s.classList.contains("hidden") && s.classList.add("hidden");
  }), ls(document, "click", "[data-dropdown-toggle]", (r, n) => {
    r.stopPropagation();
    const s = n.dataset.dropdownToggle, a = document.getElementById(s || "");
    a && (document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
      const o = i.dataset.dropdownToggle, l = document.getElementById(o || "");
      l && l !== a && l.classList.add("hidden");
    }), a.classList.toggle("hidden"));
  }, { signal: t }), document.addEventListener("click", (r) => {
    const n = r.target.closest("[data-dropdown-trigger]");
    if (n) {
      r.stopPropagation();
      const s = n.closest("[data-dropdown]")?.querySelector(".actions-menu");
      document.querySelectorAll(".actions-menu").forEach((i) => {
        i !== s && i.classList.add("hidden");
      });
      const a = s?.classList.contains("hidden");
      s?.classList.toggle("hidden"), n.setAttribute("aria-expanded", a ? "true" : "false"), a && s && e.positionDropdownMenu(n, s);
    } else r.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach((s) => s.classList.add("hidden")), document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
      const a = s.dataset.dropdownToggle, i = document.getElementById(a || "");
      i && i.classList.add("hidden");
    }));
  }, { signal: t }), document.addEventListener("keydown", (r) => {
    r.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((n) => {
      n.classList.add("hidden");
      const s = n.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
      s && s.setAttribute("aria-expanded", "false");
    }), document.querySelectorAll("[data-dropdown-toggle]").forEach((n) => {
      const s = n.dataset.dropdownToggle, a = document.getElementById(s || "");
      a && a.classList.add("hidden");
    }));
  }, { signal: t });
}
function Is(e, t) {
  console.error(t), e.notifier.error(t);
}
function Ps(e, t, r) {
  e.notifier.show({
    message: t,
    type: r
  });
}
async function Ms(e, t) {
  return e.notifier.confirm(t);
}
async function Ts(e, t) {
  return t instanceof Response ? Wt(t) : t instanceof Error ? t.message : "An unexpected error occurred";
}
function Bs(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      if (!Array.isArray(r)) return;
      const n = r.map((s) => typeof s == "string" ? s.trim() : "").filter((s) => s.length > 0);
      return n.length > 0 ? n : void 0;
    } catch (r) {
      console.warn("[DataGrid] Failed to parse bulk payload_required:", r);
      return;
    }
}
function Fs(e, t) {
  if (t)
    try {
      const r = JSON.parse(t);
      return !r || typeof r != "object" || Array.isArray(r) ? void 0 : r;
    } catch (r) {
      console.warn("[DataGrid] Failed to parse bulk payload_schema:", r);
      return;
    }
}
function qs(e, t) {
  if (!e.tableEl) return;
  const r = e.mergeColumnOrder(t);
  e.state.columnOrder = r;
  const n = new Map(e.config.columns.map((s) => [s.field, s]));
  e.config.columns = r.map((s) => n.get(s)).filter((s) => s !== void 0), e.reorderTableColumns(r), e.persistStateSnapshot(), console.log("[DataGrid] Columns reordered:", r);
}
function Os(e) {
  e.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), e.config.columns = e.defaultColumns.map((r) => ({ ...r })), e.state.columnOrder = e.config.columns.map((r) => r.field);
  const t = e.config.columns.filter((r) => !r.hidden).map((r) => r.field);
  e.tableEl ? (e.reorderTableColumns(e.state.columnOrder), e.updateColumnVisibility(t)) : (e.state.hiddenColumns = new Set(e.config.columns.filter((r) => r.hidden).map((r) => r.field)), e.persistStateSnapshot()), e.columnManager && (e.columnManager.refresh(), e.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
}
function js(e, t) {
  const r = new Set(e.config.columns.map((i) => i.field)), n = new Set(t), s = t.filter((i) => r.has(i)), a = e.config.columns.map((i) => i.field).filter((i) => !n.has(i));
  return [...s, ...a];
}
function zs(e, t) {
  if (!e.tableEl) return;
  const r = e.tableEl.querySelector("thead tr:first-child");
  r && e.reorderRowCells(r, t, "th");
  const n = e.tableEl.querySelector("#filter-row");
  n && e.reorderRowCells(n, t, "th"), e.tableEl.querySelectorAll("tbody tr").forEach((s) => {
    e.reorderRowCells(s, t, "td");
  });
}
function Ns(e, t, r, n) {
  const s = Array.from(t.querySelectorAll(`${n}[data-column]`)), a = new Map(s.map((d) => [d.dataset.column, d])), i = Array.from(t.querySelectorAll(n)), o = t.querySelector(`${n}[data-role="selection"]`) || i.find((d) => d.querySelector('input[type="checkbox"]')), l = t.querySelector(`${n}[data-role="actions"]`) || i.find((d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))), c = [];
  o && c.push(o), r.forEach((d) => {
    const u = a.get(d);
    u && c.push(u);
  }), l && c.push(l), c.forEach((d) => {
    t.appendChild(d);
  });
}
var k, Rt = class {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new G(), this.selectors = {
      table: `#${e.tableId}`,
      searchInput: "#table-search",
      perPageSelect: "#table-per-page",
      filterRow: "[data-filter-column]",
      columnToggleBtn: "#column-toggle-btn",
      columnToggleMenu: "#column-toggle-menu",
      exportBtn: "#export-btn",
      exportMenu: "#export-menu",
      paginationContainer: "#table-pagination",
      tableInfoStart: "#table-info-start",
      tableInfoEnd: "#table-info-end",
      tableInfoTotal: "#table-info-total",
      selectAllCheckbox: "#table-checkbox-all",
      rowCheckboxes: ".table-checkbox",
      bulkActionsBar: "#bulk-actions-bar",
      selectedCount: "#selected-count",
      ...e.selectors
    };
    const t = this.config.panelId || this.config.tableId;
    this.stateStore = this.config.stateStore || jr({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const r = this.stateStore.loadPersistedState(), n = new Set(this.config.columns.map((v) => v.field)), s = new Set(this.config.columns.filter((v) => v.hidden).map((v) => v.field)), a = !!r && Array.isArray(r.hiddenColumns);
    this.hasPersistedHiddenColumnState = a;
    const i = new Set((r?.hiddenColumns || []).filter((v) => n.has(v))), o = this.config.columns.map((v) => v.field), l = !!r && Array.isArray(r.columnOrder) && r.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = l;
    const c = (r?.columnOrder || []).filter((v) => n.has(v)), d = l ? [...c, ...o.filter((v) => !c.includes(v))] : o, u = this.config.enableGroupedMode ? Zr(t) : !1, p = this.config.enableGroupedMode ? tn(t) : null, h = this.config.enableGroupedMode ? Xr(t) : "explicit", y = this.config.enableGroupedMode ? Wr(t) : /* @__PURE__ */ new Set(), g = te(r?.expandMode, h), m = new Set((r?.expandedGroups || Array.from(y)).map((v) => String(v).trim()).filter(Boolean)), $ = this.config.enableGroupedMode ? r?.expandMode !== void 0 || m.size > 0 || u : !1, E = (this.config.enableGroupedMode ? r?.viewMode || p : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: a ? i : s,
      columnOrder: d,
      viewMode: E,
      expandMode: g,
      groupedData: null,
      expandedGroups: m,
      hasPersistedExpandState: $
    }, this.actionRenderer = new dr({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
    }), this.cellRendererRegistry = new Rr(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([v, U]) => {
      this.cellRendererRegistry.register(v, U);
    }), this.defaultColumns = this.config.columns.map((v) => ({ ...v }));
  }
  init() {
    if (console.log("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log("[DataGrid] Table element found:", this.tableEl), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refresh(), typeof this.stateStore.hydrate == "function" && this.stateStore.hydrate().then(() => {
      if (this.hasURLStateOverrides) return;
      const e = this.stateStore.loadPersistedState();
      e && (this.applyPersistedStateSnapshot(e, { merge: !0 }), this.applyRestoredState(), this.pushStateToURL({ replace: !0 }), this.refresh());
    }).catch(() => {
    });
  }
  getURLStateConfig() {
    return hn(this);
  }
  parseJSONArray(e, t) {
    return fn(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    mn(this, e, t);
  }
  applyShareStateSnapshot(e) {
    gn(this, e);
  }
  buildPersistedStateSnapshot() {
    return bn(this);
  }
  buildShareStateSnapshot() {
    return yn(this);
  }
  persistStateSnapshot() {
    vn(this);
  }
  restoreStateFromURL() {
    wn(this);
  }
  applyRestoredState() {
    xn(this);
  }
  pushStateToURL(e = {}) {
    Sn(this, e);
  }
  syncURL() {
    this.pushStateToURL();
  }
  async refresh() {
    return $n(this);
  }
  buildApiUrl() {
    return Cn(this);
  }
  buildQueryString() {
    return kn(this);
  }
  buildQueryParams() {
    return An(this);
  }
  getResponseTotal(e) {
    return En(this, e);
  }
  normalizePagination(e) {
    return Ln(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    Wn(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    Xn(this);
  }
  renderData(e) {
    Zn(this, e);
  }
  renderFlatData(e, t) {
    es(this, e, t);
  }
  renderGroupedData(e, t, r) {
    Mn(this, e, t, r);
  }
  isGroupedViewActive() {
    return Tn(this);
  }
  fallbackGroupedMode(e) {
    Bn(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return Fn(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return qn(this, e);
  }
  toggleGroup(e) {
    On(this, e);
  }
  setExpandedGroups(e) {
    jn(this, e);
  }
  expandAllGroups() {
    zn(this);
  }
  collapseAllGroups() {
    Nn(this);
  }
  updateGroupVisibility(e) {
    Gn(this, e);
  }
  updateGroupedRowsFromState() {
    Hn(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Un(this, e, t);
  }
  setViewMode(e) {
    Vn(this, e);
  }
  getViewMode() {
    return Kn(this);
  }
  getGroupedData() {
    return Jn(this);
  }
  async fetchDetail(e) {
    return _n(this, e);
  }
  getSchema() {
    return Dn(this);
  }
  getForm() {
    return In(this);
  }
  getTabs() {
    return Pn(this);
  }
  normalizeDetailResponse(e) {
    return Rn(this, e);
  }
  resolveRendererOptions(e) {
    return ts(this, e);
  }
  createTableRow(e) {
    return rs(this, e);
  }
  sanitizeActionId(e) {
    return ns(this, e);
  }
  async handleDelete(e) {
    return ss(this, e);
  }
  updatePaginationUI(e) {
    as(this, e);
  }
  renderPaginationButtons(e) {
    is(this, e);
  }
  bindSearchInput() {
    cs(this);
  }
  bindPerPageSelect() {
    ds(this);
  }
  bindFilterInputs() {
    us(this);
  }
  bindColumnVisibility() {
    ps(this);
  }
  bindExportButtons() {
    hs(this);
  }
  bindSorting() {
    fs(this);
  }
  updateSortIndicators() {
    ms(this);
  }
  bindSelection() {
    gs(this);
  }
  updateSelectionBindings() {
    bs(this);
  }
  bindBulkActions() {
    ks(this);
  }
  bindOverflowMenu() {
    As(this);
  }
  updateBulkActionsBar() {
    Es(this);
  }
  setBulkActionState(e, t) {
    xs(this, e, t);
  }
  applyBulkActionState(e) {
    Ss(this, e);
  }
  syncBulkActionState() {
    Cs(this);
  }
  bindBulkClearButton() {
    Ls(this);
  }
  clearSelection() {
    _s(this);
  }
  positionDropdownMenu(e, t) {
    Rs(this, e, t);
  }
  bindDropdownToggles() {
    Ds(this);
  }
  showError(e) {
    Is(this, e);
  }
  notify(e, t) {
    Ps(this, e, t);
  }
  async confirmAction(e) {
    return Ms(this, e);
  }
  async extractError(e) {
    return Ts(this, e);
  }
  parseDatasetStringArray(e) {
    return Bs(this, e);
  }
  parseDatasetObject(e) {
    return Fs(this, e);
  }
  reorderColumns(e) {
    qs(this, e);
  }
  resetColumnsToDefault() {
    Os(this);
  }
  mergeColumnOrder(e) {
    return js(this, e);
  }
  reorderTableColumns(e) {
    zs(this, e);
  }
  reorderRowCells(e, t, r) {
    Ns(this, e, t, r);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), console.log("[DataGrid] Instance destroyed");
  }
};
k = Rt;
k.URL_KEY_SEARCH = Q;
k.URL_KEY_PAGE = W;
k.URL_KEY_PER_PAGE = X;
k.URL_KEY_FILTERS = Z;
k.URL_KEY_SORT = ee;
k.URL_KEY_STATE = le;
k.URL_KEY_HIDDEN_COLUMNS = Ie;
k.URL_KEY_VIEW_MODE = ce;
k.URL_KEY_EXPANDED_GROUPS = Pe;
k.MANAGED_URL_KEYS = Me;
k.DEFAULT_MAX_URL_LENGTH = un;
k.DEFAULT_MAX_FILTERS_LENGTH = 600;
typeof window < "u" && (window.DataGrid = Rt);
var He = {
  text: [
    {
      label: "contains",
      value: "ilike"
    },
    {
      label: "equals",
      value: "eq"
    },
    {
      label: "starts with",
      value: "starts"
    },
    {
      label: "ends with",
      value: "ends"
    },
    {
      label: "not equals",
      value: "ne"
    }
  ],
  number: [
    {
      label: "equals",
      value: "eq"
    },
    {
      label: "not equals",
      value: "ne"
    },
    {
      label: "greater than",
      value: "gt"
    },
    {
      label: "less than",
      value: "lt"
    },
    {
      label: "between",
      value: "between"
    }
  ],
  select: [{
    label: "equals",
    value: "eq"
  }, {
    label: "not equals",
    value: "ne"
  }],
  date: [
    {
      label: "on",
      value: "eq"
    },
    {
      label: "before",
      value: "lt"
    },
    {
      label: "after",
      value: "gt"
    },
    {
      label: "between",
      value: "between"
    }
  ]
}, Bo = class {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new G();
  }
  init() {
    if (this.modal = document.getElementById("advanced-search-modal"), this.container = document.getElementById("search-criteria-container"), this.searchInput = document.getElementById("table-search"), this.clearBtn = document.getElementById("search-clear-btn"), !this.modal || !this.container) {
      console.error("[AdvancedSearch] Required elements not found");
      return;
    }
    this.restoreCriteriaFromURL(), this.criteria.length > 0 && (this.renderCriteria(), this.renderChips()), this.bindEvents(), this.bindClearButton();
  }
  restoreCriteriaFromURL() {
    const e = new URLSearchParams(window.location.search).get("filters");
    if (e) try {
      this.criteria = JSON.parse(e).map((t) => ({
        field: t.column,
        operator: t.operator || "ilike",
        value: t.value,
        logic: "and"
      })), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria);
    } catch (t) {
      console.warn("[AdvancedSearch] Failed to parse filters from URL:", t);
    }
  }
  pushCriteriaToURL() {
    const e = new URLSearchParams(window.location.search);
    this.criteria.length > 0 ? e.set("advancedSearch", JSON.stringify(this.criteria)) : e.delete("advancedSearch");
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[AdvancedSearch] URL updated with criteria");
  }
  bindEvents() {
    document.getElementById("advanced-search-btn")?.addEventListener("click", () => this.open());
    const e = document.getElementById("advanced-search-close"), t = document.getElementById("advanced-search-cancel"), r = document.getElementById("advanced-search-overlay");
    e?.addEventListener("click", () => this.close()), t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const n = document.getElementById("save-search-preset-btn"), s = document.getElementById("load-search-preset-btn");
    n?.addEventListener("click", () => this.savePreset()), s?.addEventListener("click", () => this.loadPreset());
  }
  bindClearButton() {
    if (!this.searchInput || !this.clearBtn) return;
    const e = () => {
      this.searchInput.value.trim() ? this.clearBtn.classList.remove("hidden") : this.clearBtn.classList.add("hidden");
    };
    this.searchInput.addEventListener("input", e), this.clearBtn.addEventListener("click", () => {
      this.searchInput && (this.searchInput.value = "", this.clearBtn.classList.add("hidden"), this.clearAllChips());
    }), e();
  }
  open() {
    this.modal && (this.modal.classList.remove("hidden"), this.criteria.length === 0 ? this.addCriterion() : this.renderCriteria());
  }
  close() {
    this.modal && this.modal.classList.add("hidden");
  }
  addCriterion(e) {
    const t = {
      field: e?.field || this.config.fields[0]?.name || "",
      operator: e?.operator || "ilike",
      value: e?.value || "",
      logic: e?.logic || "and"
    };
    this.criteria.push(t), this.renderCriteria();
  }
  removeCriterion(e) {
    this.criteria.splice(e, 1), this.renderCriteria();
  }
  renderCriteria() {
    this.container && (this.container.innerHTML = "", this.criteria.forEach((e, t) => {
      const r = document.createElement("div"), n = this.createCriterionRow(e, t);
      if (r.appendChild(n), t < this.criteria.length - 1) {
        const s = this.createLogicConnector(t);
        r.appendChild(s);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((s) => s.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((s) => `
          <option value="${s.name}" ${s.name === e.field ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(n).map((s) => `
          <option value="${s.value}" ${s.value === e.operator ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(n, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, r.querySelectorAll("select, input").forEach((s) => {
      s.addEventListener("change", (a) => this.updateCriterion(a.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((n) => `
            <option value="${n.value}" ${n.value === t.value ? "selected" : ""}>${n.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-criterion-index="${r}"
             data-criterion-part="value"
             value="${t.value}"
             placeholder="Enter value..."
             class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
    `;
  }
  createLogicConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center gap-2 py-2";
    const r = this.criteria[e].logic || "and";
    return t.innerHTML = `
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded border ${r === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        And
      </button>
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded border ${r === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        Or
      </button>
    `, t.querySelectorAll("[data-logic-index]").forEach((n) => {
      n.addEventListener("click", (s) => {
        const a = s.target, i = parseInt(a.dataset.logicIndex || "0", 10), o = a.dataset.logicValue;
        this.criteria[i].logic = o, this.renderCriteria();
      });
    }), t;
  }
  updateCriterion(e) {
    const t = parseInt(e.dataset.criterionIndex || "0", 10), r = e.dataset.criterionPart;
    if (!this.criteria[t]) return;
    const n = e.value;
    r === "field" ? (this.criteria[t].field = n, this.renderCriteria()) : r === "operator" ? this.criteria[t].operator = n : r === "value" && (this.criteria[t].value = n);
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({
      label: t,
      value: t
    })) : He[e.type] || He.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Oe({
      title: "Save Search Preset",
      label: "Preset name",
      placeholder: "e.g. Active users filter",
      confirmLabel: "Save",
      onConfirm: (e) => {
        const t = this.loadPresetsFromStorage();
        t[e] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(t)), this.notifier.success(`Preset "${e}" saved!`);
      }
    }).show();
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    new Oe({
      title: "Load Search Preset",
      label: `Available presets: ${t.join(", ")}`,
      placeholder: "Enter preset name",
      confirmLabel: "Load",
      onConfirm: (r) => {
        if (!e[r]) {
          this.notifier.warning(`Preset "${r}" not found.`);
          return;
        }
        this.criteria = e[r], this.renderCriteria();
      }
    }).show();
  }
  loadPresetsFromStorage() {
    try {
      const e = localStorage.getItem("search_presets");
      return e ? JSON.parse(e) : {};
    } catch {
      return {};
    }
  }
  getCriteria() {
    return this.criteria;
  }
  setCriteria(e) {
    this.criteria = e, this.renderCriteria(), this.renderChips();
  }
  renderChips() {
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), r = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), r && r.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, s) => {
        const a = this.createChip(n, s);
        e.appendChild(a);
      });
    }
  }
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200", r.innerHTML = `
      <span>${this.config.fields.find((s) => s.name === e.field)?.label || e.field} ${e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const n = r.querySelector("[data-chip-index]");
    return n && n.addEventListener("click", () => {
      this.removeChip(t);
    }), r;
  }
  removeChip(e) {
    this.criteria.splice(e, 1), this.renderCriteria(), this.renderChips(), this.config.onSearch(this.criteria);
  }
  clearAllChips() {
    this.criteria = [], this.renderCriteria(), this.renderChips(), this.config.onClear && this.config.onClear();
  }
}, Ue = {
  text: [
    {
      label: "contains",
      value: "ilike"
    },
    {
      label: "is",
      value: "eq"
    },
    {
      label: "is not",
      value: "ne"
    }
  ],
  number: [
    {
      label: "equals",
      value: "eq"
    },
    {
      label: "not equals",
      value: "ne"
    },
    {
      label: "greater than",
      value: "gt"
    },
    {
      label: "less than",
      value: "lt"
    },
    {
      label: "greater than or equal",
      value: "gte"
    },
    {
      label: "less than or equal",
      value: "lte"
    }
  ],
  date: [
    {
      label: "is",
      value: "eq"
    },
    {
      label: "before",
      value: "lt"
    },
    {
      label: "after",
      value: "gt"
    }
  ],
  select: [{
    label: "is",
    value: "eq"
  }, {
    label: "is not",
    value: "ne"
  }]
}, Fo = class {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new G(), this.structure = {
      groups: [],
      groupLogic: []
    }, this.init();
  }
  init() {
    if (this.panel = document.getElementById("filter-panel"), this.overlay = document.getElementById("filter-overlay"), this.previewElement = document.getElementById("filter-preview-text"), !this.panel) {
      console.error("[FilterBuilder] Panel element not found");
      return;
    }
    this.buildPanelStructure();
    const e = document.getElementById("filter-toggle-btn");
    e && e.addEventListener("click", () => this.toggle());
    const t = document.getElementById("clear-filters-btn");
    t && t.addEventListener("click", () => this.clearFilters()), this.overlay && this.overlay.addEventListener("click", () => this.close()), document.addEventListener("keydown", (r) => {
      r.key === "Escape" && !this.panel.classList.contains("hidden") && this.close();
    }), this.restoreFromURL();
  }
  buildPanelStructure() {
    this.panel && (this.panel.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-900">Filters</h3>
        <div class="flex gap-2">
          <button type="button" id="saved-filters-btn" class="text-sm text-blue-600 hover:text-blue-800">
            Saved filters ▾
          </button>
          <button type="button" id="edit-sql-btn" class="text-sm text-blue-600 hover:text-blue-800">
            Edit as SQL
          </button>
        </div>
      </div>

      <!-- Filter Groups Container -->
      <div id="filter-groups-container" class="space-y-3 mb-4">
        <!-- Groups will be rendered here -->
      </div>

      <!-- Add Group Button -->
      <button type="button" id="add-group-btn" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        AND
      </button>

      <!-- SQL Preview -->
      <div class="border-t border-gray-200 pt-3 mb-4">
        <div class="text-xs text-gray-500 mb-1">Preview:</div>
        <div id="sql-preview" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          No filters applied
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between border-t border-gray-200 pt-4">
        <div class="flex gap-2">
          <input type="text" id="save-filter-name" placeholder="Type a name here" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
          <button type="button" id="save-filter-btn" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
            Save filter
          </button>
        </div>
        <div class="flex gap-2">
          <button type="button" id="clear-all-btn" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
            Clear all
          </button>
          <button type="button" id="apply-filter-btn" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            Apply filter
          </button>
        </div>
      </div>
    `, this.container = document.getElementById("filter-groups-container"), this.sqlPreviewElement = document.getElementById("sql-preview"), this.bindActions(), this.structure.groups.length === 0 && this.addGroup());
  }
  bindActions() {
    const e = document.getElementById("add-group-btn"), t = document.getElementById("apply-filter-btn"), r = document.getElementById("clear-all-btn"), n = document.getElementById("save-filter-btn");
    e && e.addEventListener("click", () => this.addGroup()), t && t.addEventListener("click", () => this.applyFilters()), r && r.addEventListener("click", () => this.clearAll()), n && n.addEventListener("click", () => this.saveFilter());
  }
  addGroup() {
    const e = {
      conditions: [this.createEmptyCondition()],
      logic: "or"
    };
    this.structure.groups.push(e), this.structure.groups.length > 1 && this.structure.groupLogic.push("and"), this.render();
  }
  createEmptyCondition() {
    return {
      field: this.config.fields[0].name,
      operator: "ilike",
      value: ""
    };
  }
  render() {
    this.container && (this.container.innerHTML = "", this.structure.groups.forEach((e, t) => {
      const r = this.createGroupElement(e, t);
      if (this.container.appendChild(r), t < this.structure.groups.length - 1) {
        const n = this.createGroupConnector(t);
        this.container.appendChild(n);
      }
    }), this.updatePreview());
  }
  createGroupElement(e, t) {
    const r = document.createElement("div");
    r.className = "border border-gray-200 rounded-lg p-3 bg-gray-50";
    const n = document.createElement("div");
    n.className = "flex justify-end mb-2", n.innerHTML = `
      <button type="button" data-remove-group="${t}" class="text-xs text-red-600 hover:text-red-800">
        Remove group
      </button>
    `, r.appendChild(n), e.conditions.forEach((a, i) => {
      const o = this.createConditionElement(a, t, i);
      if (r.appendChild(o), i < e.conditions.length - 1) {
        const l = this.createConditionConnector(t, i, e.logic);
        r.appendChild(l);
      }
    });
    const s = document.createElement("button");
    return s.type = "button", s.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", s.dataset.addCondition = String(t), s.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, r.appendChild(s), this.bindGroupEvents(r, t), r;
  }
  createConditionElement(e, t, r) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const s = this.config.fields.find((a) => a.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${r}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((a) => `
          <option value="${a.name}" ${a.name === e.field ? "selected" : ""}>${a.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${r}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(s).map((a) => `
          <option value="${a.value}" ${a.value === e.operator ? "selected" : ""}>${a.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(s, e, t, r)}

      <button type="button" data-remove-cond="${t}-${r}" class="text-red-600 hover:text-red-800">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>

      <button type="button" data-add-cond-or="${t}-${r}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add OR condition">
        OR
      </button>

      <button type="button" data-add-cond-and="${t}-${r}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add AND condition">
        AND
      </button>
    `, n;
  }
  renderValueInput(e, t, r, n) {
    return e.type === "select" && e.options ? `
        <select data-cond="${r}-${n}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${e.options.map((s) => `
            <option value="${s.value}" ${s.value === t.value ? "selected" : ""}>${s.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-cond="${r}-${n}-value"
             value="${t.value || ""}"
             placeholder="Enter value..."
             class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  createConditionConnector(e, t, r) {
    const n = document.createElement("div");
    return n.className = "flex items-center justify-center my-1", n.innerHTML = `
      <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">
        ${r.toUpperCase()}
      </span>
    `, n;
  }
  createGroupConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center py-2";
    const r = this.structure.groupLogic[e] || "and";
    return t.innerHTML = `
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded-l border ${r === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        AND
      </button>
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded-r border ${r === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        OR
      </button>
    `, t.querySelectorAll("[data-group-logic]").forEach((n) => {
      n.addEventListener("click", (s) => {
        const a = s.target, i = parseInt(a.dataset.groupLogic || "0", 10), o = a.dataset.logicValue;
        this.structure.groupLogic[i] = o, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((s) => {
      const a = s, [i, o, l] = a.dataset.cond.split("-"), c = parseInt(i, 10), d = parseInt(o, 10);
      a.addEventListener("change", () => {
        l === "field" ? (this.structure.groups[c].conditions[d].field = a.value, this.render()) : l === "operator" ? (this.structure.groups[c].conditions[d].operator = a.value, this.updatePreview()) : l === "value" && (this.structure.groups[c].conditions[d].value = a.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((s) => {
      s.addEventListener("click", (a) => {
        const i = a.target.closest("[data-remove-cond]");
        if (!i) return;
        const [o, l] = i.dataset.removeCond.split("-").map(Number);
        this.removeCondition(o, l);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((s) => {
      s.addEventListener("click", (a) => {
        const i = a.target, o = i.dataset.addCondOr !== void 0, l = o ? i.dataset.addCondOr : i.dataset.addCondAnd;
        if (!l) return;
        const [c] = l.split("-").map(Number);
        this.structure.groups[c].logic = o ? "or" : "and", this.addCondition(c);
      });
    });
  }
  addCondition(e) {
    this.structure.groups[e].conditions.push(this.createEmptyCondition()), this.render();
  }
  removeCondition(e, t) {
    const r = this.structure.groups[e];
    r.conditions.splice(t, 1), r.conditions.length === 0 ? this.removeGroup(e) : this.render();
  }
  removeGroup(e) {
    this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.length > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 ? this.addGroup() : this.render();
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({
      label: t,
      value: t
    })) : Ue[e.type] || Ue.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || "No filters applied"), this.previewElement && (this.previewElement.textContent = t);
    const r = document.getElementById("applied-filter-preview");
    r && (this.hasActiveFilters() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  }
  hasActiveFilters() {
    return this.structure.groups.some((e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0));
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const s = n.operator.toUpperCase(), a = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${s === "ILIKE" ? "ILIKE" : s === "EQ" ? "=" : s} ${a}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => n === 0 ? r : `${t} ${(this.structure.groupLogic[n - 1] || "and").toUpperCase()} ${r}`, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const s = this.config.fields.find((a) => a.name === n.field);
        return `${s?.label || n.field} ${this.getOperatorsForField(s).find((a) => a.value === n.operator)?.label || n.operator} "${n.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => n === 0 ? r : `${t} ${(this.structure.groupLogic[n - 1] || "and").toUpperCase()} ${r}`, "");
  }
  applyFilters() {
    this.config.onApply(this.structure), this.close();
  }
  clearAll() {
    this.structure = {
      groups: [],
      groupLogic: []
    }, this.addGroup(), this.updatePreview();
  }
  clearFilters() {
    this.clearAll(), this.config.onClear(), this.updatePreview();
  }
  saveFilter() {
    const e = document.getElementById("save-filter-name"), t = e?.value.trim();
    if (!t) {
      this.notifier.warning("Please enter a name for the filter");
      return;
    }
    const r = this.getSavedFilters();
    r[t] = this.structure, localStorage.setItem("saved_filters", JSON.stringify(r)), this.notifier.success(`Filter "${t}" saved!`), e && (e.value = "");
  }
  getSavedFilters() {
    try {
      const e = localStorage.getItem("saved_filters");
      return e ? JSON.parse(e) : {};
    } catch {
      return {};
    }
  }
  toggle() {
    this.panel?.classList.contains("hidden") ? this.open() : this.close();
  }
  open() {
    const e = document.getElementById("filter-toggle-btn");
    if (e && this.panel) {
      const t = e.getBoundingClientRect();
      this.panel.style.top = `${t.bottom + 8}px`, this.panel.style.left = `${t.left}px`;
    }
    this.panel?.classList.remove("hidden"), this.overlay?.classList.remove("hidden");
  }
  close() {
    this.panel?.classList.add("hidden"), this.overlay?.classList.add("hidden");
  }
  restoreFromURL() {
    const e = new URLSearchParams(window.location.search).get("filters");
    if (e) try {
      const t = JSON.parse(e);
      Array.isArray(t) && t.length > 0 && (this.structure = this.convertLegacyFilters(t), this.render());
    } catch (t) {
      console.warn("[FilterBuilder] Failed to parse filters from URL:", t);
    }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((n) => {
      const s = n.column;
      t.has(s) || t.set(s, []), t.get(s).push(n);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((s) => ({
          field: s.column,
          operator: s.operator || "ilike",
          value: s.value
        })),
        logic: n.length > 1 ? "or" : "and"
      });
    }), {
      groups: r,
      groupLogic: new Array(r.length - 1).fill("and")
    };
  }
  getStructure() {
    return this.structure;
  }
  setStructure(e) {
    this.structure = e, this.render();
  }
}, qo = class {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0) throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "") return {};
    const t = {}, r = e.trim();
    return this.searchableFields.forEach((n) => {
      t[`${n}__ilike`] = `%${r}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}, Oo = class {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "") return;
      const s = n.operator || "eq", a = n.column;
      r.has(a) || r.set(a, {
        operator: s,
        values: []
      }), r.get(a).values.push(n.value);
    }), r.forEach((n, s) => {
      if (n.values.length === 1) {
        const a = n.operator === "eq" ? s : `${s}__${n.operator}`;
        t[a] = n.values[0];
      } else n.operator === "ilike" ? t[`${s}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${s}__in`] = n.values.join(",") : t[`${s}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}, jo = class {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}, zo = class {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((t) => `${t.field} ${t.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}, No = class {
  constructor(e) {
    if (!e || !e.endpoint) throw new Error("export endpoint is required");
    if (!e.definition && !e.resource) throw new Error("export definition or resource is required");
    this.config = e;
  }
  getEndpoint() {
    return this.config.endpoint;
  }
  getConcurrency() {
    return this.config.concurrency || "single";
  }
  async export(e, t) {
    if (!t) throw new Error("datagrid instance is required");
    const r = Gs(t, this.config, e);
    r.delivery = Hs(this.config, e);
    let n;
    try {
      n = await I(this.getEndpoint(), {
        method: "POST",
        json: r,
        headers: { Accept: "application/json,application/octet-stream" }
      });
    } catch (s) {
      throw T(t, "error", s instanceof Error ? s.message : "Network error during export"), s;
    }
    if (n.status === 202) {
      const s = await n.json().catch(() => ({}));
      T(t, "info", "Export queued. You can download it when ready.");
      const a = s?.status_url || "";
      if (a) {
        const i = Ks(s, a);
        try {
          await Js(a, {
            intervalMs: Us(this.config),
            timeoutMs: Vs(this.config)
          });
          const o = await I(i, {
            method: "GET",
            headers: { Accept: "application/octet-stream" }
          });
          if (!o.ok) {
            const l = await $e(o);
            throw T(t, "error", l), new Error(l);
          }
          await Ke(o, r.definition || r.resource || "export", r.format), T(t, "success", "Export ready.");
          return;
        } catch (o) {
          throw T(t, "error", o instanceof Error ? o.message : "Export failed"), o;
        }
      }
      if (s?.download_url) {
        window.open(s.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const s = await $e(n);
      throw T(t, "error", s), new Error(s);
    }
    await Ke(n, r.definition || r.resource || "export", r.format), T(t, "success", "Export ready.");
  }
};
function Gs(e, t, r) {
  const n = ra(r), s = Qs(e, t), a = Ws(e, t), i = {
    format: n,
    query: Zs(Xs(e)),
    selection: s,
    columns: a,
    delivery: t.delivery || "auto"
  };
  t.definition && (i.definition = t.definition), t.resource && (i.resource = t.resource);
  const o = t.sourceVariant || t.variant;
  return o && (i.source_variant = o), i;
}
function Hs(e, t) {
  return e.delivery ? e.delivery : (e.asyncFormats && e.asyncFormats.length > 0 ? e.asyncFormats : ["pdf"]).includes(t) ? "async" : "auto";
}
function Us(e) {
  const t = Number(e.statusPollIntervalMs);
  return Number.isFinite(t) && t > 0 ? t : 2e3;
}
function Vs(e) {
  const t = Number(e.statusPollTimeoutMs);
  return Number.isFinite(t) && t >= 0 ? t : 3e5;
}
function Ks(e, t) {
  return e?.download_url ? e.download_url : `${t.replace(/\/+$/, "")}/download`;
}
async function Js(e, t) {
  const r = Date.now(), n = Math.max(250, t.intervalMs);
  for (; ; ) {
    const s = await I(e, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!s.ok) {
      const o = await $e(s);
      throw new Error(o);
    }
    const a = await s.json().catch(() => ({})), i = String(a?.state || "").toLowerCase();
    if (i === "completed") return a;
    if (i === "failed") throw new Error("Export failed");
    if (i === "canceled") throw new Error("Export canceled");
    if (i === "deleted") throw new Error("Export deleted");
    if (t.timeoutMs > 0 && Date.now() - r > t.timeoutMs) throw new Error("Export status timed out");
    await Ys(n);
  }
}
function Ys(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Qs(e, t) {
  if (t.selection?.mode) return t.selection;
  const r = Array.from(e.state.selectedRows || []), n = r.length > 0 ? "ids" : "all";
  return {
    mode: n,
    ids: n === "ids" ? r : []
  };
}
function Ws(e, t) {
  if (Array.isArray(t.columns) && t.columns.length > 0) return t.columns.slice();
  const r = e.state?.hiddenColumns ? new Set(e.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(e.state?.columnOrder) && e.state.columnOrder.length > 0 ? e.state.columnOrder : e.config.columns.map((n) => n.field)).filter((n) => !r.has(n));
}
function Xs(e) {
  const t = {}, r = e.config.behaviors || {};
  return r.pagination && Object.assign(t, r.pagination.buildQuery(e.state.currentPage, e.state.perPage)), e.state.search && r.search && Object.assign(t, r.search.buildQuery(e.state.search)), e.state.filters.length > 0 && r.filter && Object.assign(t, r.filter.buildFilters(e.state.filters)), e.state.sort.length > 0 && r.sort && Object.assign(t, r.sort.buildQuery(e.state.sort)), t;
}
function Zs(e) {
  const t = {}, r = [];
  return Object.entries(e).forEach(([n, s]) => {
    if (s == null || s === "") return;
    switch (n) {
      case "limit":
        t.limit = Ve(s);
        return;
      case "offset":
        t.offset = Ve(s);
        return;
      case "order":
      case "sort":
        t.sort = ta(String(s));
        return;
      case "q":
      case "search":
        t.search = String(s);
        return;
      default:
        break;
    }
    const { field: a, op: i } = ea(n);
    a && r.push({
      field: a,
      op: i,
      value: s
    });
  }), r.length > 0 && (t.filters = r), t;
}
function ea(e) {
  const t = e.split("__");
  return {
    field: t[0]?.trim() || "",
    op: t[1]?.trim() || "eq"
  };
}
function ta(e) {
  return e ? e.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
    const r = t.split(/\s+/);
    return {
      field: r[0] || "",
      desc: (r[1] || "asc").toLowerCase() === "desc"
    };
  }).filter((t) => t.field) : [];
}
function ra(e) {
  const t = String(e || "").trim().toLowerCase();
  return t === "excel" || t === "xls" ? "xlsx" : t || "csv";
}
function Ve(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
async function Ke(e, t, r) {
  const n = await e.blob(), s = na(e, t, r), a = URL.createObjectURL(n), i = document.createElement("a");
  i.href = a, i.download = s, i.rel = "noopener", document.body.appendChild(i), i.click(), i.remove(), URL.revokeObjectURL(a);
}
function na(e, t, r) {
  const n = e.headers.get("content-disposition") || "", s = `${t}.${r}`;
  return sa(n) || s;
}
function sa(e) {
  if (!e) return null;
  const t = e.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (t && t[1]) return decodeURIComponent(t[1].replace(/"/g, "").trim());
  const r = e.match(/filename="?([^";]+)"?/i);
  return r && r[1] ? r[1].trim() : null;
}
async function $e(e) {
  if ((e.headers.get("content-type") || "").includes("application/json")) {
    const r = await e.json().catch(() => ({}));
    if (r?.error?.message) return r.error.message;
    if (r?.message) return r.message;
  }
  const t = await e.text().catch(() => "");
  return t || `Export failed (${e.status})`;
}
function T(e, t, r) {
  const n = e.config.notifier;
  if (n && typeof n[t] == "function") {
    n[t](r);
    return;
  }
  const s = window.toastManager;
  if (s && typeof s[t] == "function") {
    s[t](r);
    return;
  }
  t === "error" && alert(r);
}
var Go = class {
  constructor(e) {
    this.baseEndpoint = e;
  }
  getActionEndpoint(e) {
    return `${this.getPluralEndpoint()}/bulk/${e}`;
  }
  getPluralEndpoint() {
    return this.baseEndpoint.endsWith("s") ? this.baseEndpoint : `${this.baseEndpoint}s`;
  }
  async execute(e, t, r) {
    const n = await I(this.getActionEndpoint(e), {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!n.ok) {
      const s = await ar(n, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${s}`);
    }
    await r.refresh();
  }
};
function aa(e) {
  const t = (e || "").trim();
  return !t || t === "/" ? "" : "/" + t.replace(/^\/+|\/+$/g, "");
}
function ia(e) {
  const t = (e || "").trim();
  return !t || t === "/" ? "" : t.replace(/\/+$/, "");
}
function Dt(e) {
  return typeof e == "object" && e !== null && "version" in e && e.version === 2;
}
var oa = class {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  toggleColumn(e, t) {
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((i) => i.field === e ? !r : !t.state.hiddenColumns.has(i.field)).map((i) => i.field), s = {};
    t.config.columns.forEach((i) => {
      s[i.field] = n.includes(i.field);
    });
    const a = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: s,
      order: a.length > 0 ? a : void 0
    }), t.updateColumnVisibility(n);
  }
  reorderColumns(e, t) {
    const r = {};
    t.config.columns.forEach((n) => {
      r[n.field] = !t.state.hiddenColumns.has(n.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: r,
      order: e
    }), console.log("[ColumnVisibility] Order saved:", e);
  }
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order) return [];
      const r = new Set(e), n = t.order.filter((s) => r.has(s));
      return this.cachedOrder = n, console.log("[ColumnVisibility] Order loaded from cache:", n), n;
    } catch (t) {
      return console.warn("Failed to load column order from cache:", t), [];
    }
  }
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const r = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([s, a]) => {
        !a && r.has(s) && n.add(s);
      }), n;
    } catch (t) {
      return console.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (Dt(t)) return t;
      const r = {
        version: 2,
        visibility: t
      };
      return console.log("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(r), r;
    } catch (e) {
      return console.warn("Failed to load column preferences:", e), null;
    }
  }
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      console.warn("Failed to save column preferences:", t);
    }
  }
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, console.log("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      console.warn("Failed to clear column preferences:", e);
    }
  }
}, Ho = class extends oa {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = aa(t.basePath), s = ia(t.apiBasePath);
    t.preferencesEndpoint ? this.preferencesEndpoint = t.preferencesEndpoint : s ? this.preferencesEndpoint = `${s}/panels/preferences` : n ? this.preferencesEndpoint = `${n}/api/panels/preferences` : this.preferencesEndpoint = "/api/panels/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
  }
  get serverPrefsKey() {
    return `ui.datagrid.${this.resource}.columns`;
  }
  toggleColumn(e, t) {
    super.toggleColumn(e, t), this.scheduleServerSync(t);
  }
  reorderColumns(e, t) {
    super.reorderColumns(e, t), this.scheduleServerSync(t);
  }
  async loadFromServer() {
    try {
      const e = await I(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!e.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", e.status), null;
      const t = (await e.json()).records || [];
      if (t.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const r = t[0]?.raw;
      if (!r || !r[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const n = r[this.serverPrefsKey];
      return Dt(n) ? (this.serverPrefs = n, this.savePrefs(n), console.log("[ServerColumnVisibility] Loaded prefs from server:", n), n) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", n), null);
    } catch (e) {
      return console.warn("[ServerColumnVisibility] Error loading server prefs:", e), null;
    }
  }
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([s, a]) => {
        a || r.add(s);
      });
      const n = new Set(e);
      return {
        hiddenColumns: r,
        columnOrder: (t.order || []).filter((s) => n.has(s))
      };
    }
    return {
      hiddenColumns: this.loadHiddenColumnsFromCache(e),
      columnOrder: this.loadColumnOrderFromCache(e)
    };
  }
  scheduleServerSync(e) {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncToServer(e);
    }, this.syncDebounce);
  }
  async syncToServer(e) {
    const t = {};
    e.config.columns.forEach((n) => {
      t[n.field] = !e.state.hiddenColumns.has(n.field);
    });
    const r = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const n = await I(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: r } }
      });
      if (!n.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", n.status);
        return;
      }
      this.serverPrefs = r, console.log("[ServerColumnVisibility] Synced prefs to server:", r);
    } catch (n) {
      console.warn("[ServerColumnVisibility] Error syncing to server:", n);
    }
  }
  clearSavedPrefs() {
    super.clearSavedPrefs(), this.serverPrefs = null, this.clearServerPrefs();
  }
  async clearServerPrefs() {
    try {
      const e = await I(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: { raw: { [this.serverPrefsKey]: null } }
      });
      if (!e.ok) {
        console.warn("[ServerColumnVisibility] Failed to clear server prefs:", e.status);
        return;
      }
      console.log("[ServerColumnVisibility] Server prefs cleared");
    } catch (e) {
      console.warn("[ServerColumnVisibility] Error clearing server prefs:", e);
    }
  }
}, la = { async prompt(e) {
  const { PayloadInputModal: t } = await import("../chunks/payload-modal-C-xEENUz.js");
  return t.prompt(e);
} };
function ca(e) {
  const t = e.trim(), r = t.indexOf("?");
  return r === -1 ? {
    path: t,
    query: ""
  } : {
    path: t.slice(0, r),
    query: t.slice(r + 1)
  };
}
function B(e, t, r = "", n = "") {
  const { path: s, query: a } = ca(e), i = s.replace(/\/+$/, ""), o = r.replace(/^\/+/, "");
  let l = `${i}/${encodeURIComponent(t)}`;
  o && (l += `/${o}`);
  const c = [];
  return a && c.push(a), n && c.push(n), c.length > 0 ? `${l}?${c.join("&")}` : l;
}
var Je = {
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
}, da = 5e3, It = class {
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
    const r = [];
    let n = 0;
    const s = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const a of t) {
        if (!a.name) continue;
        const i = this.resolveRecordActionState(e, a.name);
        if (!this.shouldIncludeAction(e, a, i)) continue;
        const o = a.name.toLowerCase();
        if (this.seenActions.has(o)) continue;
        this.seenActions.add(o);
        const l = this.normalizeContextBoundActionState(e, a, i), c = this.buildActionFromSchema(e, a, s, l);
        c && r.push({
          action: c,
          name: a.name,
          order: this.resolveActionOrder(a.name, a.order),
          insertionIndex: n++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, s, n);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, s, n);
    return r.sort((a, i) => a.order !== i.order ? a.order - i.order : a.insertionIndex - i.insertionIndex), r.map((a) => a.action);
  }
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t)) return t;
    const r = e.toLowerCase();
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : Je[r] !== void 0 ? Je[r] : da;
  }
  buildActionFromSchema(e, t, r, n) {
    const s = t.name, a = t.label || t.label_key || s, i = t.variant || "secondary", o = t.icon, l = this.isNavigationAction(t), c = s === "delete";
    return l ? this.applyActionState(this.buildNavigationAction(e, t, a, i, o, r), n) : c ? this.applyActionState(this.buildDeleteAction(e, a, i, o), n) : this.applyActionState(this.buildPostAction(e, t, a, i, o), n);
  }
  isNavigationAction(e) {
    return e.type === "navigation" || e.href ? !0 : [
      "view",
      "edit",
      "show",
      "details"
    ].includes(e.name.toLowerCase());
  }
  shouldIncludeAction(e, t, r) {
    return this.matchesActionScope(t.scope) ? this.missingRequiredContext(e, t).length === 0 ? !0 : r !== null : !1;
  }
  resolveRecordActionState(e, t) {
    return rt(e, t);
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1) return e;
    const r = this.disabledReason(t);
    return {
      ...e,
      disabled: !0,
      disabledReason: r,
      disabledReasonCode: typeof t.reason_code == "string" ? t.reason_code : void 0,
      disabledSeverity: typeof t.severity == "string" ? t.severity : void 0,
      disabledKind: typeof t.kind == "string" ? t.kind : void 0,
      remediation: this.normalizeRemediation(t.remediation)
    };
  }
  normalizeRemediation(e) {
    if (!e || typeof e != "object") return null;
    const t = typeof e.label == "string" ? e.label.trim() : "", r = typeof e.href == "string" ? e.href.trim() : "", n = typeof e.kind == "string" ? e.kind.trim() : "";
    return !t && !r && !n ? null : {
      ...t ? { label: t } : {},
      ...r ? { href: r } : {},
      ...n ? { kind: n } : {}
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t) return t;
    const r = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (r) {
      const n = ot({ reason_code: r });
      if (n?.message) return n.message;
    }
    switch (r.toLowerCase()) {
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
    const r = Array.isArray(t.context_required) ? t.context_required : [];
    if (r.length === 0) return [];
    const n = [];
    for (const s of r) {
      const a = typeof s == "string" ? s.trim() : "";
      if (!a) continue;
      const i = this.resolveRecordContextValue(e, a);
      this.isEmptyPayloadValue(i) && n.push(a);
    }
    return n;
  }
  normalizeContextBoundActionState(e, t, r) {
    const n = this.missingRequiredContext(e, t);
    return n.length === 0 || r && r.enabled === !1 ? r : {
      enabled: !1,
      reason: "record does not include required context for this action",
      reason_code: "missing_context_required",
      metadata: {
        missing_context_fields: n,
        required_context_fields: Array.isArray(t.context_required) ? [...t.context_required] : []
      }
    };
  }
  resolveRecordContextValue(e, t) {
    const r = t.trim();
    if (!r) return;
    if (!r.includes(".")) return e[r];
    const n = r.split(".").map((a) => a.trim()).filter(Boolean);
    if (n.length === 0) return;
    let s = e;
    for (const a of n) {
      if (!s || typeof s != "object" || Array.isArray(s)) return;
      s = s[a];
    }
    return s;
  }
  buildNavigationAction(e, t, r, n, s, a) {
    const i = String(e.id || ""), o = this.config.actionBasePath;
    let l;
    if (t.href) {
      const c = this.interpolateHrefTemplate(t.href, e, i);
      a ? l = c.includes("?") ? `${c}&${a}` : `${c}?${a}` : l = c;
    } else t.name === "edit" ? l = B(o, i, "edit", a) : l = B(o, i, "", a);
    return {
      id: t.name,
      label: r,
      icon: s || this.getDefaultIcon(t.name),
      variant: n,
      action: () => {
        window.location.href = l;
      }
    };
  }
  interpolateHrefTemplate(e, t, r) {
    const n = e.trim();
    return n && n.replace(/\{([^}]+)\}/g, (s, a) => {
      const i = String(a || "").trim();
      if (!i) return "";
      if (i === "id") return r;
      const o = this.resolveRecordContextValue(t, i);
      return o == null ? "" : String(o);
    });
  }
  buildDeleteAction(e, t, r, n) {
    const s = String(e.id || ""), a = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: n || "trash",
      variant: r === "secondary" ? "danger" : r,
      action: async () => {
        await At({
          endpoint: `${a}/${s}`,
          fallbackMessage: "Delete failed",
          onSuccess: async (i) => {
            this.config.onActionSuccess?.("delete", {
              success: !0,
              data: i.data
            });
          },
          onError: async (i) => {
            this.config.onActionError?.("delete", i);
          },
          reconcileOnDomainFailure: async (i) => {
            i.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure("delete", i);
          }
        });
      }
    };
  }
  buildPostAction(e, t, r, n, s) {
    const a = String(e.id || ""), i = t.name, o = `${this.config.apiEndpoint}/actions/${i}`;
    return {
      id: i,
      label: r,
      icon: s || this.getDefaultIcon(i),
      variant: n,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const l = await this.buildActionPayload(e, t);
        l !== null && await this.executePostAction({
          actionName: i,
          endpoint: o,
          payload: l,
          recordId: a
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await Ae(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && Zt(t.error)) {
      const r = Xt(t.error);
      if (r && this.config.onTranslationBlocker) {
        const n = { ...e.payload }, s = this.getContentChannel() || r.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...r,
          channel: s,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...n },
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
    const r = typeof e.redirect_record_id == "string" ? e.redirect_record_id.trim() : "";
    if (!r) return !1;
    const n = e.redirect_to_edit === !0 || e.mode === "redirect", s = this.buildQueryContext(), a = B(this.config.actionBasePath, r, n ? "edit" : "", s);
    return window.location.href = a, !0;
  }
  async handleStructuredActionFailure(e, t, r) {
    if (!t.error) return t;
    const n = this.buildActionErrorMessage(e, t.error), s = {
      ...t.error,
      message: n
    };
    throw s.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, s), this.config.onActionError?.(e, s), se(s, r, !!this.config.onActionError);
  }
  handleCreateTranslationSuccess(e, t) {
    const r = typeof e.id == "string" ? e.id : String(e.id || ""), n = typeof e.locale == "string" ? e.locale : "";
    if (!r) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const s = this.config.actionBasePath, a = new URLSearchParams();
    n && a.set("locale", n);
    const i = this.getContentChannel();
    i && a.set("channel", i);
    const o = a.toString(), l = `${s}/${r}/edit${o ? `?${o}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(n || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, { action: {
      label: `View ${c.toUpperCase()}`,
      handler: () => {
        const u = new URLSearchParams();
        u.set("locale", c), i && u.set("channel", i);
        const p = typeof t.id == "string" ? t.id : String(t.id || r);
        window.location.href = `${s}/${p}/edit?${u.toString()}`;
      }
    } }) : console.log(`[SchemaActionBuilder] Translation created: ${n}`), window.location.href = l;
  }
  async buildActionPayload(e, t) {
    const r = t.name.trim().toLowerCase(), n = { id: e.id };
    this.config.locale && r !== "create_translation" && (n.locale = this.config.locale);
    const s = this.getContentChannel();
    if (s && (n.channel = s), this.config.panelName && (n.policy_entity = this.config.panelName), n.expected_version === void 0) {
      const c = this.resolveExpectedVersion(e);
      c !== null && (n.expected_version = c);
    }
    const a = this.normalizePayloadSchema(t.payload_schema), i = this.collectRequiredFields(t.payload_required, a);
    if (r === "create_translation" && this.applySchemaTranslationContext(n, e, a), a?.properties)
      for (const [c, d] of Object.entries(a.properties)) n[c] === void 0 && d.default !== void 0 && (n[c] = d.default);
    i.includes("idempotency_key") && this.isEmptyPayloadValue(n.idempotency_key) && (n.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const o = i.filter((c) => this.isEmptyPayloadValue(n[c]));
    if (o.length === 0) return n;
    const l = await this.promptForPayload(t, o, a, n, e);
    if (l === null) return null;
    for (const c of o) {
      const d = a?.properties?.[c], u = l[c] ?? "", p = this.coercePromptValue(u, c, d);
      if (p.error) throw new Error(p.error);
      n[c] = p.value;
    }
    return n;
  }
  async promptForPayload(e, t, r, n, s) {
    if (t.length === 0) return {};
    const a = t.map((i) => {
      const o = r?.properties?.[i];
      return {
        name: i,
        label: o?.title || i,
        description: o?.description,
        value: this.stringifyDefault(n[i] ?? o?.default),
        type: o?.type || "string",
        options: this.buildFieldOptions(i, e.name, o, s, n)
      };
    });
    return await la.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: a
    });
  }
  buildFieldOptions(e, t, r, n, s) {
    const a = this.deriveCreateTranslationLocaleOptions(e, t, n, r, s);
    if (a && a.length > 0) return a;
    if (!r) return;
    if (r.oneOf) return r.oneOf.filter((o) => o && "const" in o).map((o) => ({
      value: this.stringifyDefault(o.const),
      label: o.title || this.stringifyDefault(o.const)
    }));
    if (r.enum) return r.enum.map((o) => ({
      value: this.stringifyDefault(o),
      label: this.stringifyDefault(o)
    }));
    const i = this.buildExtensionFieldOptions(r);
    if (i && i.length > 0) return i;
  }
  buildExtensionFieldOptions(e) {
    const t = e, r = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(r) || r.length === 0) return;
    const n = [];
    for (const s of r) {
      if (typeof s == "string") {
        const c = this.stringifyDefault(s);
        if (!c) continue;
        n.push({
          value: c,
          label: c
        });
        continue;
      }
      if (!s || typeof s != "object") continue;
      const a = s.value, i = this.stringifyDefault(a);
      if (!i) continue;
      const o = s.label, l = this.stringifyDefault(o) || i;
      n.push({
        value: i,
        label: l
      });
    }
    return n.length > 0 ? n : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r, n, s) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object") return;
    const a = this.asObject(r.translation_readiness), i = s && typeof s == "object" ? s : {};
    let o = this.asStringArray(i.missing_locales);
    if (o.length === 0 && (o = this.asStringArray(a?.missing_required_locales)), o.length === 0 && (o = this.asStringArray(r.missing_locales)), o.length === 0 && a) {
      const g = this.asStringArray(a.required_locales), m = new Set(this.asStringArray(a.available_locales));
      o = g.filter(($) => !m.has($));
    }
    const l = this.asStringArray(n?.enum);
    if (l.length > 0) {
      const g = new Set(l);
      o = o.filter((m) => g.has(m));
    }
    if (o.length === 0) return;
    const c = this.extractStringField(i, "recommended_locale") || this.extractStringField(r, "recommended_locale") || this.extractStringField(a || {}, "recommended_locale"), d = this.asStringArray(i.required_for_publish ?? r.required_for_publish ?? a?.required_for_publish ?? a?.required_locales), u = this.asStringArray(i.existing_locales ?? r.existing_locales ?? a?.available_locales), p = this.createTranslationLocaleLabelMap(n), h = /* @__PURE__ */ new Set(), y = [];
    for (const g of o) {
      const m = g.trim().toLowerCase();
      if (!m || h.has(m)) continue;
      h.add(m);
      const $ = c?.toLowerCase() === m, E = d.includes(m), v = [];
      E && v.push("Required for publishing"), u.length > 0 && v.push(`${u.length} translation${u.length > 1 ? "s" : ""} exist`);
      const U = v.length > 0 ? v.join(" • ") : void 0, Yt = p[m] || this.localeLabel(m);
      let qe = `${m.toUpperCase()} - ${Yt}`;
      $ && (qe += " (recommended)"), y.push({
        value: m,
        label: qe,
        description: U,
        recommended: $
      });
    }
    return y.sort((g, m) => g.recommended && !m.recommended ? -1 : !g.recommended && m.recommended ? 1 : g.value.localeCompare(m.value)), y.length > 0 ? y : void 0;
  }
  applySchemaTranslationContext(e, t, r) {
    if (!r) return;
    const n = this.extractTranslationContextMap(r);
    if (Object.keys(n).length !== 0)
      for (const [s, a] of Object.entries(n)) {
        const i = s.trim(), o = a.trim();
        if (!i || !o || !this.isEmptyPayloadValue(e[i])) continue;
        const l = this.resolveRecordContextValue(t, o);
        l != null && (e[i] = this.clonePayloadValue(l));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t)) return {};
    const r = {};
    for (const [n, s] of Object.entries(t)) {
      const a = n.trim(), i = typeof s == "string" ? s.trim() : "";
      !a || !i || (r[a] = i);
    }
    return r;
  }
  clonePayloadValue(e) {
    return Array.isArray(e) ? e.map((t) => this.clonePayloadValue(t)) : e && typeof e == "object" ? { ...e } : e;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e) return t;
    if (Array.isArray(e.oneOf)) for (const s of e.oneOf) {
      const a = this.stringifyDefault(s?.const).trim().toLowerCase();
      if (!a) continue;
      const i = this.stringifyDefault(s?.title).trim();
      i && (t[a] = i);
    }
    const r = e, n = r["x-options"] ?? r.x_options ?? r.xOptions;
    if (Array.isArray(n)) for (const s of n) {
      if (!s || typeof s != "object") continue;
      const a = this.stringifyDefault(s.value).trim().toLowerCase(), i = this.stringifyDefault(s.label).trim();
      a && i && (t[a] = i);
    }
    return t;
  }
  extractStringField(e, t) {
    const r = e[t];
    return typeof r == "string" && r.trim() ? r.trim() : null;
  }
  resolveExpectedVersion(e) {
    const t = [
      e.expected_version,
      e.expectedVersion,
      e.version,
      e._version
    ];
    for (const r of t) {
      if (typeof r == "number" && Number.isFinite(r) && r > 0) return r;
      if (typeof r == "string") {
        const n = r.trim();
        if (!n) continue;
        const s = Number(n);
        if (Number.isFinite(s) && s > 0) return n;
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
    let r;
    if (t && typeof t == "object" && !Array.isArray(t)) {
      r = {};
      for (const [o, l] of Object.entries(t)) l && typeof l == "object" && !Array.isArray(l) && (r[o] = l);
    }
    const n = e.required, s = Array.isArray(n) ? n.filter((o) => typeof o == "string").map((o) => o.trim()).filter((o) => o.length > 0) : void 0, a = e["x-translation-context"] ?? e.x_translation_context, i = a && typeof a == "object" && !Array.isArray(a) ? a : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: s,
      properties: r,
      ...i ? { "x-translation-context": i } : {}
    };
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), s = (a) => {
      const i = a.trim();
      !i || n.has(i) || (n.add(i), r.push(i));
    };
    return Array.isArray(e) && e.forEach((a) => s(String(a))), Array.isArray(t?.required) && t.required.forEach((a) => s(String(a))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), s = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${n || "record"}-${s}`;
  }
  coercePromptValue(e, t, r) {
    const n = typeof e == "string" ? e.trim() : String(e ?? "").trim(), s = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (n.length === 0) return { value: n };
    if (s === "number" || s === "integer") {
      const a = Number(n);
      return Number.isFinite(a) ? { value: s === "integer" ? Math.trunc(a) : a } : {
        value: null,
        error: `${t} must be a valid number`
      };
    }
    if (s === "boolean") {
      const a = n.toLowerCase();
      return a === "true" || a === "1" || a === "yes" ? { value: !0 } : a === "false" || a === "0" || a === "no" ? { value: !1 } : {
        value: null,
        error: `${t} must be true or false`
      };
    }
    if (s === "array" || s === "object") try {
      return { value: JSON.parse(n) };
    } catch {
      return {
        value: null,
        error: `${t} must be valid JSON (${s === "array" ? "[...]" : "{...}"})`
      };
    }
    return { value: n };
  }
  buildActionErrorMessage(e, t) {
    return N(t, `${e} failed`);
  }
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  appendDefaultActions(e, t, r) {
    const n = String(t.id || ""), s = this.config.actionBasePath, a = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = B(s, n, "", r);
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
            window.location.href = B(s, n, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const i of a) this.seenActions.has(i.name) || (this.seenActions.add(i.name), e.push(i.button));
  }
  appendDefaultActionsOrdered(e, t, r, n) {
    const s = String(t.id || ""), a = this.config.actionBasePath, i = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = B(a, s, "", r);
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
            window.location.href = B(a, s, "edit", r);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let o = n;
    for (const l of i) this.seenActions.has(l.name) || (this.seenActions.add(l.name), e.push({
      action: l.button,
      name: l.name,
      order: this.resolveActionOrder(l.name, void 0),
      insertionIndex: o++
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
function Uo(e, t, r) {
  return new It(r).buildRowActions(e, t);
}
function Vo(e) {
  return e.schema?.actions;
}
function ua() {
  const e = globalThis.window;
  return e?.toastManager ? e.toastManager : new G();
}
function w(e) {
  return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Ce(e, t) {
  return (typeof e.id == "string" && e.id.trim() ? e.id.trim() : `${e.label}-${t + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `action-${t + 1}`;
}
function pa(e, t) {
  const r = "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  if (t) return `${r} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 focus:ring-gray-300`;
  switch ((e.variant || "secondary").toLowerCase()) {
    case "primary":
      return `${r} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    case "danger":
      return `${r} border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case "success":
      return `${r} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
    case "warning":
      return `${r} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`;
    default:
      return `${r} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`;
  }
}
function ha(e, t) {
  const r = "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors";
  if (t) return `${r} cursor-not-allowed text-gray-400`;
  switch ((e.variant || "secondary").toLowerCase()) {
    case "danger":
      return `${r} text-red-600 hover:bg-red-50`;
    case "success":
      return `${r} text-emerald-600 hover:bg-emerald-50`;
    case "warning":
      return `${r} text-amber-600 hover:bg-amber-50`;
    default:
      return `${r} text-gray-700 hover:bg-gray-50`;
  }
}
function Ye(e) {
  return {
    edit: "iconoir-edit-pencil",
    delete: "iconoir-trash",
    publish: "iconoir-cloud-upload",
    unpublish: "iconoir-cloud-download",
    submit_for_approval: "iconoir-send",
    approve: "iconoir-check-circle",
    reject: "iconoir-xmark-circle",
    archive: "iconoir-archive",
    restore: "iconoir-refresh",
    duplicate: "iconoir-copy",
    add_translation: "iconoir-translate",
    create_translation: "iconoir-translate"
  }[String(e.id || "").toLowerCase().replace(/[^a-z_]/g, "_")] || "";
}
function fa(e) {
  const t = e.findIndex((n) => String(n.id || "").toLowerCase() === "edit");
  if (t >= 0) return {
    primary: e[t],
    rest: [...e.slice(0, t), ...e.slice(t + 1)]
  };
  const r = e.findIndex((n) => (n.variant || "").toLowerCase() === "primary");
  return r >= 0 ? {
    primary: e[r],
    rest: [...e.slice(0, r), ...e.slice(r + 1)]
  } : e.length === 1 ? {
    primary: e[0],
    rest: []
  } : {
    primary: null,
    rest: e
  };
}
function ma(e) {
  if (e.length === 0) return "";
  const { primary: t, rest: r } = fa(e);
  let n = "";
  if (t) {
    const a = t.disabled === !0, i = Ce(t, 0), o = Ye(t), l = a ? (t.disabledReason || "Action unavailable").trim() : "", c = l ? `detail-action-reason-${i}` : "", d = c ? `aria-describedby="${c}"` : "", u = l ? `${t.label} unavailable: ${l}` : t.label, p = a && t.remediation?.href && t.remediation?.label ? `
          <a
            href="${w(t.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${w(i)}"
          >
            ${w(t.remediation.label.trim())}
          </a>
        ` : "", h = l ? `title="${w(l)}"` : "", y = a && l ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${w(l)}"
           data-detail-action-reason="${w(i)}"
           id="detail-action-reason-${w(i)}"
         >?</span>` : "";
    n = `
      <div data-detail-action-card="${w(i)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${pa(t, a)}"
          data-detail-action-button="${w(i)}"
          data-detail-action-name="${w(t.id || t.label)}"
          data-disabled="${a}"
          aria-disabled="${a ? "true" : "false"}"
          aria-label="${w(u)}"
          ${d}
          ${h}
        >
          ${o ? `<i class="${o}"></i>` : ""}
          ${w(t.label)}
          ${y}
        </button>
        ${a && p ? p : ""}
      </div>
    `;
  }
  let s = "";
  return r.length > 0 && (s = `
      <div class="relative" data-detail-actions-dropdown>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-detail-actions-dropdown-trigger
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="More actions"
        >
          <i class="iconoir-more-horiz text-lg"></i>
        </button>
        <div
          class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 hidden"
          data-detail-actions-dropdown-menu
          role="menu"
          aria-orientation="vertical"
        >
          ${r.map((a, i) => {
    const o = a.disabled === !0, l = Ce(a, t ? i + 1 : i), c = Ye(a), d = o ? (a.disabledReason || "Action unavailable").trim() : "", u = d ? `detail-action-reason-${l}` : "", p = u ? `aria-describedby="${u}"` : "", h = d ? `${a.label} unavailable: ${d}` : a.label, y = a.variant === "danger" && i > 0 ? '<div class="my-1 border-t border-gray-100"></div>' : "", g = d ? `title="${w(d)}"` : "", m = o && a.remediation?.href && a.remediation?.label ? `
            <a
              href="${w(a.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${w(l)}"
            >
              ${w(a.remediation.label.trim())}
            </a>
          ` : "", $ = o && d ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${w(d)}"
             data-detail-action-reason="${w(l)}"
             id="detail-action-reason-${w(l)}"
           >?</span>` : "";
    return `
        ${y}
        <div data-detail-action-card="${w(l)}" class="space-y-1">
          <button
            type="button"
            class="${ha(a, o)}"
            data-detail-action-button="${w(l)}"
            data-detail-action-name="${w(a.id || a.label)}"
            data-disabled="${o}"
            aria-disabled="${o ? "true" : "false"}"
            aria-label="${w(h)}"
            ${p}
            ${g}
          >
            ${c ? `<i class="${c} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${w(a.label)}</span>
            ${$}
            ${o ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ""}
          </button>
          ${o && m ? m : ""}
        </div>
      `;
  }).join("")}
        </div>
      </div>
    `), `
    <div class="flex items-start gap-2" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${n}
      ${s}
    </div>
  `;
}
var ga = class {
  constructor(e) {
    this.actions = [], this.record = null, this.documentClickHandler = null, this.documentKeydownHandler = null, this.mount = e.mount, this.notifier = e.notifier || ua(), this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
  }
  async init() {
    this.mount && (this.mount.setAttribute("aria-busy", "true"), await this.refresh());
  }
  async refresh() {
    this.cleanupDocumentListeners();
    const e = await this.fetchDetailPayload();
    if (!e) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const t = e.data && typeof e.data == "object" ? e.data : null, r = Array.isArray(e.schema?.actions) ? e.schema.actions : [];
    if (!t || r.length === 0) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const n = this.panelName(), s = this.recordID(), a = this.panelBasePath(), i = `${this.apiBasePath()}/panels/${encodeURIComponent(n)}`, o = new URLSearchParams(window.location.search), l = new It({
      apiEndpoint: i,
      actionBasePath: a,
      panelName: n,
      locale: o.get("locale") || void 0,
      channel: o.get("channel") || o.get("environment") || void 0,
      actionContext: "detail",
      onActionSuccess: async (c) => {
        if (c === "delete") {
          const d = this.backHref();
          if (d) {
            window.location.assign(d);
            return;
          }
          window.location.assign(a);
          return;
        }
        await this.refresh();
      },
      onActionError: (c, d) => {
        this.notifier.error(N(d, `${c} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      }
    });
    this.record = t, this.actions = l.buildRowActions(t, r), this.mount.innerHTML = ma(this.actions), this.mount.setAttribute("aria-busy", "false"), this.attachListeners(s), this.attachDropdownListeners();
  }
  async fetchDetailPayload() {
    const e = this.detailEndpoint();
    if (!e) return null;
    const t = await this.fetchImpl(e, { headers: { Accept: "application/json" } });
    if (!t.ok)
      return this.notifier.error(`Actions unavailable (${t.status})`), null;
    const r = await t.json().catch(() => null);
    return !r || typeof r != "object" ? null : nt(r);
  }
  attachListeners(e) {
    this.actions.forEach((t, r) => {
      const n = Ce(t, r), s = this.mount.querySelector(`[data-detail-action-button="${n}"]`);
      s && s.addEventListener("click", async (a) => {
        if (a.preventDefault(), !(s.getAttribute("aria-disabled") === "true" || s.dataset.disabled === "true"))
          try {
            await t.action({
              ...this.record || {},
              id: e
            });
          } catch (i) {
            if (!M(i)) {
              const o = z(i), l = o ? N(o, `${t.label} failed`) : i instanceof Error ? i.message : `${t.label} failed`;
              this.notifier.error(l);
            }
          }
      });
    });
  }
  cleanupDocumentListeners() {
    this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null), this.documentKeydownHandler && (document.removeEventListener("keydown", this.documentKeydownHandler), this.documentKeydownHandler = null);
  }
  attachDropdownListeners() {
    const e = this.mount.querySelector("[data-detail-actions-dropdown]");
    if (!e) return;
    const t = e.querySelector("[data-detail-actions-dropdown-trigger]"), r = e.querySelector("[data-detail-actions-dropdown-menu]");
    !t || !r || (t.addEventListener("click", (n) => {
      n.preventDefault(), n.stopPropagation(), r.classList.contains("hidden") ? this.openDropdown(t, r) : this.closeDropdown(t, r);
    }), this.documentClickHandler = (n) => {
      e.contains(n.target) || this.closeDropdown(t, r);
    }, document.addEventListener("click", this.documentClickHandler), this.documentKeydownHandler = (n) => {
      n.key === "Escape" && !r.classList.contains("hidden") && (this.closeDropdown(t, r), t.focus());
    }, document.addEventListener("keydown", this.documentKeydownHandler), r.querySelectorAll("[data-detail-action-button]").forEach((n) => {
      n.addEventListener("click", (s) => {
        if (n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") {
          s.preventDefault();
          return;
        }
        this.closeDropdown(t, r);
      });
    }));
  }
  openDropdown(e, t) {
    t.classList.remove("hidden"), e.setAttribute("aria-expanded", "true");
  }
  closeDropdown(e, t) {
    t.classList.add("hidden"), e.setAttribute("aria-expanded", "false");
  }
  detailEndpoint() {
    const e = this.panelName(), t = this.recordID();
    if (!e || !t) return "";
    const r = new URLSearchParams(window.location.search), n = r.get("locale"), s = r.get("channel") || r.get("environment"), a = `${this.apiBasePath()}/panels/${encodeURIComponent(e)}/${encodeURIComponent(t)}`;
    if (!n && !s) return a;
    const i = new URLSearchParams();
    return n && i.set("locale", n), s && i.set("channel", s), `${a}?${i.toString()}`;
  }
  apiBasePath() {
    return String(this.mount.dataset.apiBasePath || "").trim().replace(/\/$/, "");
  }
  panelBasePath() {
    const e = String(this.mount.dataset.panelBasePath || "").trim();
    return e ? e.replace(/\/$/, "") : `${String(this.mount.dataset.basePath || "").trim().replace(/\/$/, "")}/${this.panelName()}`.replace(/\/{2,}/g, "/");
  }
  backHref() {
    return String(this.mount.dataset.backHref || "").trim();
  }
  panelName() {
    return String(this.mount.dataset.panel || "").trim();
  }
  recordID() {
    return String(this.mount.dataset.recordId || "").trim();
  }
};
async function Ko(e = document) {
  const t = Array.from(e.querySelectorAll("[data-panel-detail-actions]")), r = [];
  for (const n of t) {
    const s = new ga({ mount: n });
    r.push(s), await s.init();
  }
  return r;
}
var ba = class Pt extends Ze {
  constructor(t) {
    super({
      size: "lg",
      initialFocus: "[data-blocker-action]",
      lockBodyScroll: !0,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0
    }), this.localeStates = /* @__PURE__ */ new Map(), this.resolved = !1, this.config = t;
    for (const r of t.missingLocales) this.localeStates.set(r, {
      loading: !1,
      created: !1
    });
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || null;
  }
  static showBlocker(t) {
    return new Promise((r) => {
      const n = t.onDismiss;
      new Pt({
        ...t,
        onDismiss: () => {
          n?.(), r();
        }
      }).show();
    });
  }
  renderContent() {
    const t = this.config.transition || "complete action", r = this.config.entityType || "content", n = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
    return `
      <div class="flex flex-col" role="dialog" aria-labelledby="blocker-title" aria-describedby="blocker-description">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/40">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h2 id="blocker-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Cannot ${f(t)} ${f(r)}
              </h2>
              <p id="blocker-description" class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${this.renderDescription(n)}
              </p>
            </div>
          </div>
        </div>

        <!-- Missing Locales List -->
        <div class="px-6 py-4 max-h-[50vh] overflow-y-auto">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" id="locales-heading">
            Missing translations (${this.config.missingLocales.length}):
          </p>
          <ul class="space-y-3" role="list" aria-labelledby="locales-heading">
            ${this.config.missingLocales.map((s) => this.renderLocaleItem(s)).join("")}
          </ul>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button type="button"
                  data-blocker-dismiss
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors">
            Close
          </button>
          <button type="button"
                  data-blocker-retry
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-describedby="retry-hint">
            Retry ${f(t)}
          </button>
        </div>
        <p id="retry-hint" class="sr-only">Retry the blocked action after creating missing translations</p>
      </div>
    `;
  }
  renderDescription(t) {
    return t ? "Required translations are missing or incomplete. Create or complete the translations listed below." : "Required translations are missing. Create the translations listed below to continue.";
  }
  renderLocaleItem(t) {
    const r = this.localeStates.get(t) || {
      loading: !1,
      created: !1
    }, n = this.config.missingFieldsByLocale?.[t], s = Array.isArray(n) && n.length > 0, a = this.getLocaleLabel(t), i = r.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${r.loading ? "opacity-50" : ""}"
          data-locale-item="${f(t)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${f(t)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${f(a)}
              </span>
              ${r.created ? `
                <span class="inline-flex items-center text-xs text-green-600 dark:text-green-400" role="status">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Created
                </span>
              ` : ""}
            </div>
            ${s ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${n.map((o) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${f(o)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${r.created ? this.renderOpenButton(t, r.newRecordId) : this.renderCreateButton(t, i)}
            ${this.renderOpenButton(t, void 0, r.created)}
          </div>
        </div>
        ${r.loading ? `
          <div class="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Creating translation...
          </div>
        ` : ""}
      </li>
    `;
  }
  renderCreateButton(t, r) {
    return `
      <button type="button"
              data-blocker-action="create"
              data-locale="${f(t)}"
              ${r}
              class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Create ${this.getLocaleLabel(t)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Create
      </button>
    `;
  }
  renderOpenButton(t, r, n = !1) {
    if (n) return "";
    const s = this.config.navigationBasePath, a = r || this.config.recordId, i = new URLSearchParams();
    i.set("locale", t);
    const o = this.getContentChannel();
    return o && i.set("channel", o), `
      <a href="${f(`${s}/${a}/edit?${i.toString()}`)}"
         data-blocker-action="open"
         data-locale="${f(t)}"
         class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
         aria-label="Open ${this.getLocaleLabel(t)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open
      </a>
    `;
  }
  getLocaleLabel(t) {
    return {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      ru: "Russian",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      da: "Danish",
      no: "Norwegian",
      fi: "Finnish"
    }[t.toLowerCase()] || t.toUpperCase();
  }
  bindContentEvents() {
    this.container?.querySelector("[data-blocker-dismiss]")?.addEventListener("click", () => {
      this.dismiss();
    }), this.container?.querySelector("[data-blocker-retry]")?.addEventListener("click", async () => {
      await this.handleRetry();
    }), this.container?.querySelectorAll('[data-blocker-action="create"]')?.forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.getAttribute("data-locale");
        n && this.handleCreateTranslation(n);
      });
    });
    const t = this.container?.querySelectorAll("[data-locale-item]");
    t?.forEach((r, n) => {
      r.addEventListener("keydown", (s) => {
        s.key === "ArrowDown" && n < t.length - 1 ? (s.preventDefault(), t[n + 1].querySelector("[data-blocker-action]")?.focus()) : s.key === "ArrowUp" && n > 0 && (s.preventDefault(), t[n - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(t) {
    const r = this.localeStates.get(t);
    if (!(!r || r.loading || r.created)) {
      r.loading = !0, this.updateLocaleItemUI(t);
      try {
        const n = {
          id: this.config.recordId,
          locale: t
        }, s = this.getContentChannel();
        s && (n.channel = s), this.config.panelName && (n.policy_entity = this.config.panelName);
        const a = await Ae(`${this.config.apiEndpoint}/actions/create_translation`, n);
        if (a.success) {
          r.loading = !1, r.created = !0, a.data?.id && (r.newRecordId = String(a.data.id)), this.updateLocaleItemUI(t);
          const i = {
            id: r.newRecordId || this.config.recordId,
            locale: t,
            status: String(a.data?.status || "draft"),
            family_id: a.data?.family_id ? String(a.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(t, i);
        } else {
          r.loading = !1, this.updateLocaleItemUI(t);
          const i = a.error?.message || "Failed to create translation";
          this.config.onError?.(i);
        }
      } catch (n) {
        r.loading = !1, this.updateLocaleItemUI(t);
        const s = n instanceof Error ? n.message : "Failed to create translation";
        this.config.onError?.(s);
      }
    }
  }
  updateLocaleItemUI(t) {
    const r = this.container?.querySelector(`[data-locale-item="${t}"]`);
    if (!r || !this.localeStates.get(t)) return;
    const n = r.parentElement;
    if (!n) return;
    const s = document.createElement("div");
    s.innerHTML = this.renderLocaleItem(t);
    const a = s.firstElementChild;
    a && (n.replaceChild(a, r), a.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
      this.handleCreateTranslation(t);
    }));
  }
  async handleRetry() {
    if (this.resolved = !0, this.hide(), !!this.config.onRetry)
      try {
        await this.config.onRetry();
      } catch (t) {
        const r = t instanceof Error ? t.message : "Retry failed";
        this.config.onError?.(r);
      }
  }
  dismiss() {
    this.resolved = !0, this.config.onDismiss?.(), this.hide();
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.config.onDismiss?.()), !0;
  }
};
async function Jo(e) {
  try {
    await ba.showBlocker(e);
  } catch (t) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", t);
    const r = `Cannot ${e.transition || "complete action"}: Missing translations for ${e.missingLocales.join(", ")}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(r) : alert(r);
  }
}
var ya = [
  {
    key: "ready",
    label: "Ready",
    icon: "●",
    colorClass: "text-green-500",
    description: "All required translations are complete"
  },
  {
    key: "incomplete",
    label: "Incomplete",
    icon: "◐",
    colorClass: "text-amber-500",
    description: "Has translations but missing required fields"
  },
  {
    key: "missing",
    label: "Missing",
    icon: "○",
    colorClass: "text-red-500",
    description: "Missing required locale translations"
  },
  {
    key: "fallback",
    label: "Fallback",
    icon: "⚠",
    colorClass: "text-amber-600",
    description: "Viewing fallback content or stale data"
  }
], Mt = class {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || ya
    }, this.container = t;
  }
  render() {
    if (!this.container) {
      console.warn("[StatusLegend] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML();
  }
  buildHTML() {
    const { title: e, orientation: t, size: r, items: n, containerClass: s } = this.config, a = t === "vertical", i = r === "sm", o = a ? "flex-col" : "flex-row flex-wrap", l = i ? "gap-2" : "gap-4", c = i ? "text-xs" : "text-sm", d = i ? "text-sm" : "text-base";
    return `
      <div class="status-legend inline-flex items-center ${o} ${l} ${s}"
           role="list"
           aria-label="Translation status legend">
        ${e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${c}">${this.escapeHtml(e)}</span>` : ""}
        ${n.map((u) => this.renderItem(u, d, c)).join("")}
      </div>
    `;
  }
  renderItem(e, t, r) {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${this.escapeHtml(e.description)}"
           aria-label="${this.escapeHtml(e.label)}: ${this.escapeHtml(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${r}">${this.escapeHtml(e.label)}</span>
      </div>
    `;
  }
  setItems(e) {
    this.config.items = e, this.render();
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
};
function va(e) {
  const t = new Mt(e);
  return t.render(), t;
}
function Yo() {
  const e = document.querySelectorAll("[data-status-legend]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-status-legend-init")) return;
    const n = va({
      container: r,
      orientation: r.dataset.orientation || "horizontal",
      size: r.dataset.size || "default",
      title: r.dataset.title || ""
    });
    r.setAttribute("data-status-legend-init", "true"), t.push(n);
  }), t;
}
function Qo(e = {}) {
  return new Mt({
    container: document.createElement("div"),
    ...e
  }).buildHTML();
}
var Tt = [
  {
    key: "all",
    label: "All",
    field: "",
    value: "",
    icon: "○",
    styleClass: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    description: "Show all records"
  },
  {
    key: "ready",
    label: "Ready",
    field: "readiness_state",
    value: "ready",
    icon: "●",
    styleClass: "bg-green-100 text-green-700 hover:bg-green-200",
    description: "All translations complete"
  },
  {
    key: "missing_locales",
    label: "Missing",
    field: "readiness_state",
    value: "missing_locales",
    icon: "○",
    styleClass: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    description: "Missing required locale translations"
  },
  {
    key: "missing_fields",
    label: "Incomplete",
    field: "readiness_state",
    value: "missing_fields",
    icon: "◐",
    styleClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    description: "Has translations but missing required fields"
  },
  {
    key: "fallback",
    label: "Fallback",
    field: "fallback_used",
    value: "true",
    icon: "⚠",
    styleClass: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    description: "Records currently viewed in fallback mode"
  }
], wa = class {
  constructor(e) {
    if (this.container = null, this.config = e, this.container = typeof e.container == "string" ? document.querySelector(e.container) : e.container, this.state = {
      activeKey: null,
      capabilities: /* @__PURE__ */ new Map()
    }, e.capabilities) for (const t of e.capabilities) this.state.capabilities.set(t.key, t);
    for (const t of e.filters) this.state.capabilities.has(t.key) || this.state.capabilities.set(t.key, {
      key: t.key,
      supported: !0
    });
    this.render();
  }
  render() {
    if (!this.container) {
      console.warn("[QuickFilters] Container not found");
      return;
    }
    const { size: e = "default", containerClass: t = "" } = this.config, r = e === "sm" ? "text-xs" : "text-sm", n = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", s = this.config.filters.map((a) => this.renderFilterButton(a, r, n)).join("");
    this.container.innerHTML = `
      <div class="quick-filters inline-flex items-center gap-1 flex-wrap ${t}"
           role="group"
           aria-label="Quick filters">
        ${s}
      </div>
    `, this.bindEventListeners();
  }
  renderFilterButton(e, t, r) {
    const n = this.state.capabilities.get(e.key), s = n?.supported !== !1, a = this.state.activeKey === e.key, i = n?.disabledReason || "Filter not available", o = `inline-flex items-center gap-1 ${r} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let l, c;
    s ? a ? (l = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, c = 'aria-pressed="true"') : (l = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", c = 'aria-pressed="false"') : (l = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", c = `aria-disabled="true" title="${ke(i)}"`);
    const d = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${o} ${l}"
              data-filter-key="${ke(e.key)}"
              ${c}
              ${s ? "" : "disabled"}>
        ${d}
        <span>${Te(e.label)}</span>
      </button>
    `;
  }
  bindEventListeners() {
    this.container && this.container.querySelectorAll(".quick-filter-btn").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.filterKey;
        t && !e.disabled && this.selectFilter(t);
      });
    });
  }
  selectFilter(e) {
    const t = this.config.filters.find((r) => r.key === e);
    if (!t) {
      console.warn(`[QuickFilters] Filter not found: ${e}`);
      return;
    }
    if (this.state.capabilities.get(e)?.supported === !1) {
      console.warn(`[QuickFilters] Filter not supported: ${e}`);
      return;
    }
    if (this.state.activeKey === e) {
      this.clearFilter();
      return;
    }
    this.state.activeKey = e, this.render(), t.field === "" ? this.config.onFilterSelect(null) : this.config.onFilterSelect(t);
  }
  clearFilter() {
    this.state.activeKey = null, this.render(), this.config.onFilterSelect(null);
  }
  updateCapabilities(e) {
    for (const t of e) this.state.capabilities.set(t.key, t);
    this.render();
  }
  setCapability(e, t, r) {
    this.state.capabilities.set(e, {
      key: e,
      supported: t,
      disabledReason: r
    }), this.render();
  }
  getActiveFilter() {
    return this.state.activeKey && this.config.filters.find((e) => e.key === this.state.activeKey) || null;
  }
  setActiveFilter(e) {
    this.state.activeKey = e, this.render();
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
};
function xa(e, t, r = {}) {
  return new wa({
    container: e,
    filters: Tt,
    onFilterSelect: t,
    ...r
  });
}
function Wo(e) {
  const t = document.querySelectorAll("[data-quick-filters]"), r = [];
  return t.forEach((n) => {
    if (n.hasAttribute("data-quick-filters-init")) return;
    const s = xa(n, (a) => e(a, n), { size: n.dataset.size || "default" });
    n.setAttribute("data-quick-filters-init", "true"), r.push(s);
  }), r;
}
function Xo(e = {}) {
  const { filters: t = Tt, activeKey: r = null, capabilities: n = [], size: s = "default", containerClass: a = "" } = e, i = s === "sm" ? "text-xs" : "text-sm", o = s === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const c of n) l.set(c.key, c);
  return `<div class="quick-filters inline-flex items-center gap-1 flex-wrap ${a}">${t.map((c) => {
    const d = l.get(c.key), u = d?.supported !== !1, p = r === c.key, h = d?.disabledReason || "Filter not available", y = `inline-flex items-center gap-1 ${o} ${i} rounded-full font-medium`;
    let g;
    u ? p ? g = `${c.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : g = c.styleClass || "bg-gray-100 text-gray-700" : g = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const m = c.icon ? `<span>${c.icon}</span>` : "", $ = u ? "" : `title="${ke(h)}"`;
    return `<span class="${y} ${g}" ${$}>${m}<span>${Te(c.label)}</span></span>`;
  }).join("")}</div>`;
}
function Te(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ke(e) {
  return Te(e);
}
var me = "go-admin:translation-panel-expanded", Sa = class {
  constructor(e) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...e,
      storageKey: e.storageKey || me
    };
  }
  init() {
    if (this.toggleButton = document.getElementById(this.config.toggleButtonId), this.panelElement = document.getElementById(this.config.panelId), this.expandAllButton = this.config.expandAllBtnId ? document.getElementById(this.config.expandAllBtnId) : null, this.collapseAllButton = this.config.collapseAllBtnId ? document.getElementById(this.config.collapseAllBtnId) : null, this.groupControls = this.config.groupControlsId ? document.getElementById(this.config.groupControlsId) : null, this.viewModeButtons = Array.from(document.querySelectorAll(this.config.viewModeSelector)), !this.toggleButton || !this.panelElement) return;
    this.boundToggleHandler = (t) => {
      t.preventDefault(), this.toggle();
    }, this.toggleButton.addEventListener("click", this.boundToggleHandler);
    const e = this.getPersistedExpandedState();
    this.setExpanded(e, !1);
  }
  toggle() {
    this.setExpanded(!this.expanded, !0);
  }
  expand() {
    this.setExpanded(!0, !0);
  }
  collapse() {
    this.setExpanded(!1, !0);
  }
  isExpanded() {
    return this.expanded;
  }
  onViewModeChange(e) {
    const t = e === "grouped" || e === "matrix";
    this.groupControls ? this.groupControls.classList.toggle("hidden", !t) : (this.expandAllButton && this.expandAllButton.classList.toggle("hidden", !t), this.collapseAllButton && this.collapseAllButton.classList.toggle("hidden", !t)), this.dispatchViewModeEvent(e);
  }
  destroy() {
    this.toggleButton && this.boundToggleHandler && this.toggleButton.removeEventListener("click", this.boundToggleHandler), this.boundToggleHandler = null, this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [];
  }
  setExpanded(e, t) {
    if (this.expanded = e, this.panelElement && this.panelElement.classList.toggle("hidden", !e), this.toggleButton) {
      this.toggleButton.setAttribute("aria-expanded", e ? "true" : "false"), this.toggleButton.classList.toggle("bg-blue-50", e), this.toggleButton.classList.toggle("border-blue-300", e), this.toggleButton.classList.toggle("text-blue-700", e), this.toggleButton.classList.toggle("bg-white", !e), this.toggleButton.classList.toggle("border-gray-200", !e), this.toggleButton.classList.toggle("text-gray-800", !e);
      const r = this.toggleButton.querySelector("[data-chevron]");
      r && r.classList.toggle("rotate-180", e);
    }
    t && this.persistExpandedState(e), this.dispatchToggleEvent(e);
  }
  getPersistedExpandedState() {
    if (typeof window > "u" || !window.localStorage) return !1;
    try {
      return window.localStorage.getItem(this.config.storageKey || me) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(e) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || me, e ? "true" : "false");
      } catch {
      }
  }
  dispatchToggleEvent(e) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:toggle", { detail: { expanded: e } }));
  }
  dispatchViewModeEvent(e) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:view-mode", { detail: {
      mode: e,
      buttonCount: this.viewModeButtons.length
    } }));
  }
};
function Zo(e) {
  return new Sa(e);
}
async function $a(e, t, r = {}) {
  const { apiEndpoint: n, notifier: s = new G(), maxFailuresToShow: a = 5 } = e, i = `${n}/bulk/create-missing-translations`;
  try {
    const o = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        ids: t,
        locales: r.locales
      })
    });
    if (!o.ok) {
      const c = await o.text();
      let d = `Request failed: ${o.status}`;
      try {
        const u = JSON.parse(c);
        d = u.error || u.message || d;
      } catch {
        c && (d = c);
      }
      throw new Error(d);
    }
    const l = Ca(await o.json(), a);
    return ka(l, s), e.onSuccess && e.onSuccess(l), l;
  } catch (o) {
    const l = o instanceof Error ? o : new Error(String(o));
    throw s.error(`Failed to create translations: ${l.message}`), e.onError && e.onError(l), l;
  }
}
function Ca(e, t) {
  const r = e.data || [], n = e.created_count ?? r.filter((i) => i.success).length, s = e.failed_count ?? r.filter((i) => !i.success).length, a = e.skipped_count ?? 0;
  return {
    total: e.total ?? r.length,
    created: n,
    failed: s,
    skipped: a,
    failures: r.filter((i) => !i.success && i.error).slice(0, t).map((i) => ({
      id: i.id,
      locale: i.locale,
      error: i.error || "Unknown error"
    }))
  };
}
function ka(e, t) {
  const { created: r, failed: n, skipped: s, total: a } = e;
  if (a === 0) {
    t.info("No translations to create");
    return;
  }
  n === 0 ? r > 0 ? t.success(`Created ${r} translation${r !== 1 ? "s" : ""}${s > 0 ? ` (${s} skipped)` : ""}`) : s > 0 && t.info(`All ${s} translation${s !== 1 ? "s" : ""} already exist`) : r === 0 ? t.error(`Failed to create ${n} translation${n !== 1 ? "s" : ""}`) : t.warning(`Created ${r}, failed ${n}${s > 0 ? `, skipped ${s}` : ""}`);
}
function el(e) {
  const { created: t, failed: r, skipped: n, total: s, failures: a } = e, i = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${t}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${r > 0 ? "bg-red-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${r > 0 ? "text-red-700" : "text-gray-400"}">${r}</div>
        <div class="text-sm ${r > 0 ? "text-red-600" : "text-gray-500"}">Failed</div>
      </div>
      <div class="text-center p-3 ${n > 0 ? "bg-yellow-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${n > 0 ? "text-yellow-700" : "text-gray-400"}">${n}</div>
        <div class="text-sm ${n > 0 ? "text-yellow-600" : "text-gray-500"}">Skipped</div>
      </div>
    </div>
  `;
  let o = "";
  return a.length > 0 && (o = `
      <div class="mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Failure Details</h4>
        <div class="border rounded overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Locale</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${a.map((l) => `
        <tr>
          <td class="px-3 py-2 text-sm text-gray-700">${ge(l.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${ge(l.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${ge(l.error)}</td>
        </tr>
      `).join("")}
            </tbody>
          </table>
        </div>
        ${r > a.length ? `<p class="mt-2 text-sm text-gray-500">Showing ${a.length} of ${r} failures</p>` : ""}
      </div>
    `), `
    <div class="bulk-result-summary">
      <div class="mb-4 text-sm text-gray-600">
        Processed ${s} item${s !== 1 ? "s" : ""}
      </div>
      ${i}
      ${o}
    </div>
  `;
}
function tl(e) {
  const { created: t, failed: r, skipped: n } = e, s = [];
  return t > 0 && s.push(`<span class="text-green-600">+${t}</span>`), r > 0 && s.push(`<span class="text-red-600">${r} failed</span>`), n > 0 && s.push(`<span class="text-yellow-600">${n} skipped</span>`), s.join(" · ");
}
function rl(e, t, r) {
  return async (n) => $a({
    apiEndpoint: e,
    notifier: t,
    onSuccess: r
  }, n);
}
function ge(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
var Aa = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish"
};
function _(e) {
  return Aa[e.toLowerCase()] || e.toUpperCase();
}
var de = class {
  constructor(e) {
    this.element = null, this.config = {
      size: "sm",
      mode: "chip",
      localeExists: !1,
      ...e
    }, this.state = {
      loading: !1,
      created: !1,
      error: null
    };
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || void 0;
  }
  render() {
    const { locale: e, size: t, mode: r, localeExists: n } = this.config, { loading: s, created: a, error: i } = this.state, o = _(e), l = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", c = r === "button" ? "rounded-lg" : "rounded-full";
    let d, u = "";
    s ? (d = "bg-gray-100 text-gray-600 border-gray-300", u = this.renderSpinner()) : a ? (d = "bg-green-100 text-green-700 border-green-300", u = this.renderCheckIcon()) : i ? (d = "bg-red-100 text-red-700 border-red-300", u = this.renderErrorIcon()) : n ? d = "bg-blue-100 text-blue-700 border-blue-300" : d = "bg-amber-100 text-amber-700 border-amber-300";
    const p = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${l} ${c} border ${d}"
           data-locale-action="${f(e)}"
           data-locale-exists="${n}"
           data-loading="${s}"
           data-created="${a}"
           role="group"
           aria-label="${o} translation">
        ${u}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${f(e)}</span>
        <span class="sr-only">${o}</span>
        ${p}
      </div>
    `;
  }
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: n, created: s } = this.state, a = r === "sm" ? "p-0.5" : "p-1", i = r === "sm" ? "w-3 h-3" : "w-4 h-4", o = [];
    if (!t && !s && !n && o.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${a} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${f(e)}"
                aria-label="Create ${_(e)} translation"
                title="Create ${_(e)} translation">
          <svg class="${i}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || s) {
      const l = s ? "hover:bg-green-200" : "hover:bg-blue-200", c = s ? "focus:ring-green-500" : "focus:ring-blue-500";
      o.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${a} rounded ${l} focus:outline-none focus:ring-1 ${c} transition-colors"
                data-action="open"
                data-locale="${f(e)}"
                aria-label="Open ${_(e)} translation"
                title="Open ${_(e)} translation">
          <svg class="${i}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
      `);
    }
    return o.join("");
  }
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector(`[data-locale-action="${this.config.locale}"]`), this.bindEvents();
  }
  bindEvents() {
    if (!this.element) return;
    const e = this.element.querySelector('[data-action="create"]'), t = this.element.querySelector('[data-action="open"]');
    e?.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.handleOpen();
    });
  }
  async handleCreate() {
    if (!(this.state.loading || this.state.created)) {
      this.setState({
        loading: !0,
        error: null
      });
      try {
        const e = {
          id: this.config.recordId,
          locale: this.config.locale
        }, t = this.getContentChannel();
        t && (e.channel = t), this.config.panelName && (e.policy_entity = this.config.panelName);
        const r = await Ae(`${this.config.apiEndpoint}/actions/create_translation`, e);
        if (r.success) {
          const n = r.data?.id ? String(r.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: n
          });
          const s = {
            id: n || this.config.recordId,
            locale: this.config.locale,
            status: String(r.data?.status || "draft"),
            familyId: r.data?.family_id ? String(r.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, s);
        } else {
          const n = r.error?.message || "Failed to create translation";
          this.setState({
            loading: !1,
            error: n
          }), this.config.onError?.(this.config.locale, n);
        }
      } catch (e) {
        const t = e instanceof Error ? e.message : "Failed to create translation";
        this.setState({
          loading: !1,
          error: t
        }), this.config.onError?.(this.config.locale, t);
      }
    }
  }
  handleOpen() {
    const { locale: e, navigationBasePath: t, recordId: r } = this.config, { newRecordId: n } = this.state, s = n || r, a = new URLSearchParams();
    a.set("locale", e);
    const i = this.getContentChannel();
    i && a.set("channel", i);
    const o = `${t}/${s}/edit?${a.toString()}`;
    this.config.onOpen?.(e, o), window.location.href = o;
  }
  setState(e) {
    if (this.state = {
      ...this.state,
      ...e
    }, this.element) {
      const t = this.element.parentElement;
      t && this.mount(t);
    }
  }
  renderSpinner() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"} animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    `;
  }
  renderCheckIcon() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    `;
  }
  renderErrorIcon() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    `;
  }
  getState() {
    return { ...this.state };
  }
};
function Bt(e) {
  return new de(e).render();
}
function nl(e, t) {
  return e.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${e.map((r) => Bt({
    ...t,
    locale: r
  })).join("")}
    </div>
  `;
}
function sl(e, t) {
  const r = /* @__PURE__ */ new Map();
  return e.querySelectorAll("[data-locale-action]").forEach((n) => {
    const s = n.getAttribute("data-locale-action");
    if (!s) return;
    const a = n.getAttribute("data-locale-exists") === "true", i = new de({
      ...t,
      locale: s,
      localeExists: a
    }), o = n.parentElement;
    o && (i.mount(o), r.set(s, i));
  }), r;
}
function Qe(e, t, r, n) {
  const s = new URLSearchParams();
  s.set("locale", r);
  const a = String(n ?? "").trim();
  return a && s.set("channel", a), `${e}/${t}/edit?${s.toString()}`;
}
var Be = class {
  constructor(e) {
    this.element = null, this.localeChip = null, this.config = {
      showFormLockMessage: !0,
      ...e
    };
  }
  isInFallbackMode() {
    const { context: e } = this.config;
    return e.fallbackUsed || e.missingRequestedLocale;
  }
  getFormLockState() {
    const { context: e } = this.config;
    return this.isInFallbackMode() ? {
      locked: !0,
      reason: this.config.formLockMessage || `The ${e.requestedLocale?.toUpperCase() || "requested"} translation doesn't exist. Create it to enable editing.`,
      missingLocale: e.requestedLocale,
      fallbackLocale: e.resolvedLocale
    } : {
      locked: !1,
      reason: null,
      missingLocale: null,
      fallbackLocale: null
    };
  }
  render() {
    if (!this.isInFallbackMode()) return "";
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", n = e.resolvedLocale || "default", s = _(r), a = _(n), i = this.renderPrimaryCta(), o = this.renderSecondaryCta(), l = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${f(r)}"
           data-resolved-locale="${f(n)}">
        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Warning Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-amber-800">
                Viewing fallback content
              </h3>
              <p class="mt-1 text-sm text-amber-700">
                The <strong class="font-medium">${f(s)}</strong> (${f(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${f(a)}</strong> (${f(n.toUpperCase())}).
              </p>

              ${l}

              <!-- Actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                ${i}
                ${o}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderPrimaryCta() {
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: n, channel: s } = this.config, a = e.requestedLocale, i = String(s ?? "").trim();
    return !a || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${f(a)}"
              data-record-id="${f(e.recordId)}"
              data-api-endpoint="${f(t)}"
              data-panel="${f(n || "")}"
              data-channel="${f(i)}"
              aria-label="Create ${_(a)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${f(a.toUpperCase())} translation
      </button>
    `;
  }
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, channel: r } = this.config, n = e.resolvedLocale;
    return !n || !e.recordId ? "" : `
      <a href="${f(Qe(t, e.recordId, n, r))}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${f(n)}"
         aria-label="Open ${_(n)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${f(n.toUpperCase())} (source)
      </a>
    `;
  }
  renderFormLockMessage() {
    return `
      <p class="mt-2 text-sm text-amber-600 flex items-center gap-1.5">
        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span>Editing is disabled until you create the missing translation.</span>
      </p>
    `;
  }
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector("[data-fallback-banner]"), this.bindEvents();
  }
  bindEvents() {
    if (!this.element) return;
    const e = this.element.querySelector('[data-action="create-translation"]'), t = this.element.querySelector('[data-action="open-source"]');
    e?.addEventListener("click", async (r) => {
      r.preventDefault(), await this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      const n = t.getAttribute("data-locale"), s = t.getAttribute("href");
      n && s && this.config.onOpenSource?.(n, s);
    });
  }
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, channel: n, navigationBasePath: s } = this.config, a = e.requestedLocale, i = e.recordId, o = String(n ?? "").trim() || void 0;
    !a || !i || await new de({
      locale: a,
      recordId: i,
      apiEndpoint: t,
      navigationBasePath: s,
      panelName: r,
      channel: o,
      localeExists: !1,
      onCreateSuccess: (l, c) => {
        this.config.onCreateSuccess?.(l, c);
        const d = Qe(s, c.id, l, o);
        window.location.href = d;
      },
      onError: (l, c) => {
        this.config.onError?.(c);
      }
    }).handleCreate();
  }
};
function Ea(e, t) {
  if (!t.locked) {
    La(e);
    return;
  }
  if (e.classList.add("form-locked", "pointer-events-none", "opacity-75"), e.setAttribute("data-form-locked", "true"), e.setAttribute("data-lock-reason", t.reason || ""), e.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !e.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", t.reason || "Form is locked"), window.getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.appendChild(r);
  }
}
function La(e) {
  e.classList.remove("form-locked", "pointer-events-none", "opacity-75"), e.removeAttribute("data-form-locked"), e.removeAttribute("data-lock-reason"), e.querySelectorAll('[data-was-enabled="true"]').forEach((t) => {
    t.removeAttribute("disabled"), t.removeAttribute("data-was-enabled"), t.removeAttribute("aria-disabled");
  }), e.querySelector("[data-form-lock-overlay]")?.remove();
}
function al(e) {
  return e.getAttribute("data-form-locked") === "true";
}
function il(e) {
  return e.getAttribute("data-lock-reason");
}
function ol(e, t) {
  const r = P(e);
  return new Be({
    ...t,
    context: r
  }).render();
}
function ll(e) {
  const t = P(e);
  return t.fallbackUsed || t.missingRequestedLocale;
}
function cl(e, t) {
  const r = new Be(t);
  return r.mount(e), r;
}
function dl(e, t) {
  const r = new Be({
    context: P(t),
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return Ea(e, r), r;
}
var Ft = class {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = A(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  extractActionState(e, t) {
    return rt(e, t);
  }
  isCreateActionEnabled() {
    return this.actionState ? this.actionState.enabled : !0;
  }
  getDisabledReason() {
    if (this.isCreateActionEnabled()) return null;
    if (this.actionState?.reason) return this.actionState.reason;
    const e = ot({ reason_code: this.actionState?.reason_code });
    if (e?.message) return e.message;
    const t = String(this.actionState?.reason_code || "").trim().toLowerCase();
    return t === "workflow_transition_not_available" ? "Translation creation is not available in the current workflow state." : t === "permission_denied" ? "You do not have permission to create translations." : "Translation creation is currently unavailable.";
  }
  getMissingLocales() {
    return this.readiness.hasReadinessMetadata ? this.readiness.missingRequiredLocales.slice(0, this.config.maxChips) : [];
  }
  getOverflowCount() {
    if (!this.readiness.hasReadinessMetadata) return 0;
    const e = this.readiness.missingRequiredLocales.length;
    return Math.max(0, e - (this.config.maxChips || 3));
  }
  render() {
    const e = this.getMissingLocales();
    if (e.length === 0) return "";
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), n = this.getOverflowCount(), s = e.map((i) => this.renderChip(i, t, r)).join(""), a = n > 0 ? this.renderOverflow(n) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${f(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${s}${a}
      </div>
    `;
  }
  renderChip(e, t, r) {
    const { recordId: n, apiEndpoint: s, navigationBasePath: a, panelName: i, channel: o, size: l } = this.config, c = String(o ?? "").trim() || void 0;
    return t ? Bt({
      locale: e,
      recordId: n,
      apiEndpoint: s,
      navigationBasePath: a,
      panelName: i,
      channel: c,
      localeExists: !1,
      size: l,
      mode: "chip",
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError
    }) : this.renderDisabledChip(e, r, l);
  }
  renderDisabledChip(e, t, r) {
    const n = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", s = t || "Translation creation unavailable", a = _(e);
    return `
      <div class="inline-flex items-center gap-1 ${n} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${f(e)}"
           data-disabled="true"
           title="${f(s)}"
           role="listitem"
           aria-label="${a} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${f(e)}</span>
      </div>
    `;
  }
  renderOverflow(e) {
    const { size: t } = this.config;
    return `
      <span class="${t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5"} rounded text-gray-500 font-medium"
            title="Also missing: ${f(this.readiness.missingRequiredLocales.join(", ").toUpperCase())}"
            aria-label="${e} more missing translations">
        +${e}
      </span>
    `;
  }
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector("[data-inline-locale-chips]"), this.bindEvents();
  }
  bindEvents() {
    !this.element || !this.isCreateActionEnabled() || this.element.querySelectorAll("[data-locale-action]").forEach((e) => {
      const t = e.getAttribute("data-locale-action");
      if (!t) return;
      const r = new de({
        locale: t,
        recordId: this.config.recordId,
        apiEndpoint: this.config.apiEndpoint,
        navigationBasePath: this.config.navigationBasePath,
        panelName: this.config.panelName,
        channel: String(this.config.channel ?? "").trim() || void 0,
        localeExists: !1,
        size: this.config.size,
        onCreateSuccess: this.config.onCreateSuccess,
        onError: this.config.onError
      });
      this.chips.set(t, r), e.querySelector('[data-action="create"]')?.addEventListener("click", async (n) => {
        n.preventDefault(), n.stopPropagation(), await r.handleCreate();
      }), e.querySelector('[data-action="open"]')?.addEventListener("click", (n) => {
        n.preventDefault(), n.stopPropagation(), r.handleOpen();
      });
    });
  }
  getChip(e) {
    return this.chips.get(e);
  }
};
function _a(e, t) {
  const r = String(e.id || "");
  return r ? new Ft(e, {
    ...t,
    recordId: r
  }).render() : "";
}
function ul(e) {
  const t = A(e);
  return t.hasReadinessMetadata && t.missingRequiredLocales.length > 0;
}
function pl(e, t, r) {
  const n = String(t.id || ""), s = new Ft(t, {
    ...r,
    recordId: n
  });
  return s.mount(e), s;
}
function hl(e) {
  return (t, r, n) => _a(r, e);
}
function ue() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function Ra() {
  return ue() ? "⌘" : "Ctrl";
}
function Da(e) {
  if (ue()) switch (e) {
    case "ctrl":
      return "⌃";
    case "alt":
      return "⌥";
    case "shift":
      return "⇧";
    case "meta":
      return "⌘";
  }
  switch (e) {
    case "ctrl":
      return "Ctrl";
    case "alt":
      return "Alt";
    case "shift":
      return "Shift";
    case "meta":
      return "Win";
  }
}
function qt(e) {
  const t = e.modifiers.map(Da), r = Ia(e.key);
  return ue() ? [...t, r].join("") : [...t, r].join("+");
}
function Ia(e) {
  return {
    Enter: "↵",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    " ": "Space",
    "[": "[",
    "]": "]"
  }[e] || e.toUpperCase();
}
var Ot = class {
  constructor(e = {}) {
    this.shortcuts = /* @__PURE__ */ new Map(), this.keydownHandler = null, this.boundElement = null, this.config = {
      enabled: !0,
      context: "global",
      ...e
    };
  }
  register(e, t = {}) {
    const { override: r = !1 } = t;
    if (this.shortcuts.has(e.id) && !r) {
      console.warn(`[KeyboardShortcuts] Shortcut "${e.id}" already registered`);
      return;
    }
    this.shortcuts.set(e.id, {
      enabled: !0,
      context: "global",
      preventDefault: !0,
      allowInInput: !1,
      ...e
    });
  }
  unregister(e) {
    return this.shortcuts.delete(e);
  }
  setEnabled(e, t) {
    const r = this.shortcuts.get(e);
    r && (r.enabled = t);
  }
  setContext(e) {
    this.config.context = e;
  }
  getContext() {
    return this.config.context || "global";
  }
  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }
  getShortcutsByCategory(e) {
    return this.getShortcuts().filter((t) => t.category === e);
  }
  getShortcutsGroupedByCategory() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.shortcuts.values()) {
      const r = e.get(t.category) || [];
      r.push(t), e.set(t.category, r);
    }
    return e;
  }
  bind(e = document) {
    this.keydownHandler && this.unbind(), this.keydownHandler = (t) => {
      this.handleKeydown(t);
    }, this.boundElement = e, e.addEventListener("keydown", this.keydownHandler);
  }
  unbind() {
    this.keydownHandler && this.boundElement && (this.boundElement.removeEventListener("keydown", this.keydownHandler), this.keydownHandler = null, this.boundElement = null);
  }
  handleKeydown(e) {
    if (!this.config.enabled) return;
    if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey && !this.isInputFocused(e)) {
      e.preventDefault(), this.config.onHelpRequested?.();
      return;
    }
    const t = this.findMatchingShortcut(e);
    if (t && t.enabled && !(t.context !== "global" && t.context !== this.config.context) && !(!t.allowInInput && this.isInputFocused(e))) {
      t.preventDefault && e.preventDefault(), this.config.onShortcutTriggered?.(t);
      try {
        const r = t.handler(e);
        r instanceof Promise && r.catch((n) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, n);
        });
      } catch (r) {
        console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, r);
      }
    }
  }
  findMatchingShortcut(e) {
    for (const t of this.shortcuts.values()) if (this.matchesEvent(t, e)) return t;
    return null;
  }
  matchesEvent(e, t) {
    const r = t.key.toLowerCase(), n = e.key.toLowerCase();
    if (r !== n && t.code.toLowerCase() !== n) return !1;
    const s = ue(), a = new Set(e.modifiers), i = a.has("ctrl"), o = a.has("meta"), l = a.has("alt"), c = a.has("shift");
    return !(i && !(s ? t.metaKey : t.ctrlKey) || o && !s && !t.metaKey || l && !t.altKey || c && !t.shiftKey || !i && !o && (s ? t.metaKey : t.ctrlKey) || !l && t.altKey || !c && t.shiftKey);
  }
  isInputFocused(e) {
    const t = e.target;
    if (!t) return !1;
    const r = t.tagName.toLowerCase();
    return !!(r === "input" || r === "textarea" || r === "select" || t.isContentEditable);
  }
  destroy() {
    this.unbind(), this.shortcuts.clear();
  }
};
function Pa(e) {
  const t = [];
  return e.onSave && t.push({
    id: "save",
    description: "Save changes",
    category: "save",
    key: "s",
    modifiers: ["ctrl"],
    handler: e.onSave,
    context: "form"
  }), e.onPublish && t.push({
    id: "publish",
    description: "Publish content",
    category: "actions",
    key: "p",
    modifiers: ["ctrl", "shift"],
    handler: e.onPublish,
    context: "form"
  }), e.onLocalePicker && t.push({
    id: "locale-picker",
    description: "Open locale picker",
    category: "locale",
    key: "l",
    modifiers: ["ctrl", "shift"],
    handler: e.onLocalePicker
  }), e.onPrevLocale && t.push({
    id: "prev-locale",
    description: "Switch to previous locale",
    category: "locale",
    key: "[",
    modifiers: ["ctrl"],
    handler: e.onPrevLocale
  }), e.onNextLocale && t.push({
    id: "next-locale",
    description: "Switch to next locale",
    category: "locale",
    key: "]",
    modifiers: ["ctrl"],
    handler: e.onNextLocale
  }), e.onCreateTranslation && t.push({
    id: "create-translation",
    description: "Create new translation",
    category: "actions",
    key: "t",
    modifiers: ["ctrl", "shift"],
    handler: e.onCreateTranslation
  }), t;
}
function fl(e) {
  const t = /* @__PURE__ */ new Map();
  for (const a of e) {
    if (a.enabled === !1) continue;
    const i = t.get(a.category) || [];
    i.push(a), t.set(a.category, i);
  }
  const r = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, n = [
    "save",
    "locale",
    "navigation",
    "actions",
    "help",
    "other"
  ];
  let s = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const a of n) {
    const i = t.get(a);
    if (!(!i || i.length === 0)) {
      s += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${r[a]}</h4>
        <dl class="space-y-1">
    `;
      for (const o of i) {
        const l = qt(o);
        s += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${q(o.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${q(l)}</kbd>
            </dd>
          </div>
      `;
      }
      s += `
        </dl>
      </div>
    `;
    }
  }
  return s += "</div>", s;
}
function q(e) {
  const t = typeof document < "u" ? document.createElement("div") : null;
  return t ? (t.textContent = e, t.innerHTML) : e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var jt = "admin_keyboard_shortcuts_settings", zt = "admin_keyboard_shortcuts_hint_dismissed", ne = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function pe() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function Ma() {
  const e = pe();
  if (!e) return { ...ne };
  try {
    const t = e.getItem(jt);
    if (!t) return { ...ne };
    const r = JSON.parse(t);
    return {
      enabled: typeof r.enabled == "boolean" ? r.enabled : !0,
      shortcuts: typeof r.shortcuts == "object" && r.shortcuts !== null ? r.shortcuts : {},
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...ne };
  }
}
function ml(e) {
  const t = pe();
  if (t)
    try {
      const r = {
        ...e,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      t.setItem(jt, JSON.stringify(r));
    } catch {
    }
}
function Ta() {
  const e = pe();
  return e ? e.getItem(zt) === "true" : !1;
}
function Ba() {
  const e = pe();
  if (e)
    try {
      e.setItem(zt, "true");
    } catch {
    }
}
function Fa(e) {
  if (Ta()) return null;
  const { container: t, position: r = "bottom", onDismiss: n, onShowHelp: s, autoDismissMs: a = 1e4 } = e, i = document.createElement("div");
  i.className = `shortcuts-discovery-hint fixed ${r === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, i.setAttribute("role", "alert"), i.setAttribute("aria-live", "polite"), i.innerHTML = `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            Keyboard shortcuts available
          </p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Press <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">?</kbd>
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${Ra()}+S</kbd> to save.
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button type="button" data-hint-action="show-help"
                    class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:underline">
              View shortcuts
            </button>
            <span class="text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
            <button type="button" data-hint-action="dismiss"
                    class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline">
              Don't show again
            </button>
          </div>
        </div>
        <button type="button" data-hint-action="close" aria-label="Close hint"
                class="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  const o = (l) => {
    l && Ba(), i.remove(), n?.();
  };
  return i.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    o(!0), s?.();
  }), i.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    o(!0);
  }), i.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    o(!1);
  }), a > 0 && setTimeout(() => {
    i.parentElement && o(!1);
  }, a), t.appendChild(i), i;
}
function gl(e) {
  const { container: t, shortcuts: r, settings: n, onSettingsChange: s } = e, a = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, i = /* @__PURE__ */ new Map();
  for (const c of r) {
    const d = i.get(c.category) || [];
    d.push(c), i.set(c.category, d);
  }
  const o = [
    "save",
    "locale",
    "navigation",
    "actions",
    "help",
    "other"
  ];
  let l = `
    <div class="shortcuts-settings space-y-6">
      <!-- Global toggle -->
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label for="shortcuts-global-toggle" class="text-sm font-medium text-gray-900 dark:text-white">
            Enable keyboard shortcuts
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Turn off to disable all keyboard shortcuts
          </p>
        </div>
        <button type="button"
                id="shortcuts-global-toggle"
                role="switch"
                aria-checked="${n.enabled}"
                data-settings-action="toggle-global"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${n.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}">
          <span class="sr-only">Enable keyboard shortcuts</span>
          <span aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${n.enabled ? "translate-x-5" : "translate-x-0"}"></span>
        </button>
      </div>

      <!-- Per-shortcut toggles -->
      <div class="${n.enabled ? "" : "opacity-50 pointer-events-none"}" data-shortcuts-list>
  `;
  for (const c of o) {
    const d = i.get(c);
    if (!(!d || d.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${a[c]}
        </h4>
        <div class="space-y-1">
    `;
      for (const u of d) {
        const p = n.shortcuts[u.id] !== !1, h = qt(u);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${q(h)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${q(u.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${q(u.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${q(u.id)}"
                 ${p ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${q(u.description)} shortcut">
        </div>
      `;
      }
      l += `
        </div>
      </div>
    `;
    }
  }
  l += `
      </div>

      <!-- Reset button -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button"
                data-settings-action="reset"
                class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline">
          Reset to defaults
        </button>
      </div>
    </div>
  `, t.innerHTML = l, t.querySelector('[data-settings-action="toggle-global"]')?.addEventListener("click", () => {
    s({
      ...n,
      enabled: !n.enabled
    });
  }), t.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((c) => {
    c.addEventListener("change", () => {
      const d = c.getAttribute("data-shortcut-id");
      d && s({
        ...n,
        shortcuts: {
          ...n.shortcuts,
          [d]: c.checked
        }
      });
    });
  }), t.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    s({ ...ne });
  });
}
function qa(e, t) {
  const r = e;
  r.config && (r.config.enabled = t.enabled);
  for (const n of e.getShortcuts()) {
    const s = t.shortcuts[n.id] !== !1;
    e.setEnabled(n.id, s);
  }
}
var be = null;
function bl() {
  return be || (be = new Ot()), be;
}
function Oa(e, t) {
  const r = Ma(), n = new Ot({
    ...t,
    enabled: r.enabled
  }), s = Pa(e);
  for (const a of s) n.register(a);
  return qa(n, r), n.bind(), n;
}
function yl(e, t) {
  const r = Oa(e, t);
  return t.hintContainer && Fa({
    container: t.hintContainer,
    onShowHelp: t.onShowHelp,
    onDismiss: () => {
    }
  }), r;
}
var ja = 1500, za = 2e3, Fe = "autosave", J = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Na = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
}, Nt = class {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? ja,
      savedDurationMs: e.savedDurationMs ?? za,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Fe,
      labels: {
        ...J,
        ...e.labels
      },
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: {
        ...Na,
        ...e.conflictLabels
      }
    };
  }
  getState() {
    return this.state;
  }
  hasPendingChanges() {
    return this.isDirty || this.pendingData !== null;
  }
  getLastError() {
    return this.lastError;
  }
  markDirty(e) {
    this.isDirty = !0, this.pendingData = e, this.lastError = null, this.cancelDebounce(), this.config.onSave && (this.debounceTimer = setTimeout(() => {
      this.save();
    }, this.config.debounceMs)), (this.state === "saved" || this.state === "idle") && this.cancelSavedTimer(), this.render();
  }
  markClean() {
    this.isDirty = !1, this.pendingData = null, this.cancelDebounce(), this.setState("idle");
  }
  async save() {
    if (!this.config.onSave || !this.isDirty && this.pendingData === null) return !0;
    this.cancelDebounce();
    const e = this.pendingData;
    this.setState("saving");
    try {
      return await this.config.onSave(e), this.isDirty = !1, this.pendingData = null, this.lastError = null, this.conflictInfo = null, this.setState("saved"), this.savedTimer = setTimeout(() => {
        this.state === "saved" && this.setState("idle");
      }, this.config.savedDurationMs), !0;
    } catch (t) {
      return this.lastError = t instanceof Error ? t : new Error(String(t)), this.config.enableConflictDetection && this.isConflictError(t) ? (this.conflictInfo = this.extractConflictInfo(t), this.setState("conflict"), !1) : (this.setState("error"), !1);
    }
  }
  async retry() {
    return this.state !== "error" && this.state !== "conflict" ? !0 : (this.conflictInfo = null, this.save());
  }
  getConflictInfo() {
    return this.conflictInfo;
  }
  isInConflict() {
    return this.state === "conflict" && this.conflictInfo !== null;
  }
  async resolveWithServerVersion() {
    if (!this.isInConflict() || !this.conflictInfo) return;
    const e = this.conflictInfo;
    let t = e.latestServerState;
    if (!t && e.latestStatePath && this.config.fetchServerState) try {
      t = await this.config.fetchServerState(e.latestStatePath);
    } catch {
      this.lastError = /* @__PURE__ */ new Error("Failed to fetch server version"), this.setState("error");
      return;
    }
    const r = {
      action: "use_server",
      serverState: t,
      localData: this.pendingData,
      conflict: e
    };
    if (this.isDirty = !1, this.pendingData = null, this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve) try {
      await this.config.onConflictResolve(r);
    } catch {
    }
  }
  async resolveWithForceSave() {
    if (!this.isInConflict() || !this.conflictInfo) return !0;
    if (!this.config.allowForceSave) return !1;
    const e = this.conflictInfo, t = {
      action: "force_save",
      localData: this.pendingData,
      conflict: e
    };
    if (this.config.onConflictResolve) try {
      await this.config.onConflictResolve(t);
    } catch {
    }
    return this.conflictInfo = null, this.save();
  }
  dismissConflict() {
    if (!this.isInConflict() || !this.conflictInfo) return;
    const e = this.conflictInfo, t = {
      action: "dismiss",
      localData: this.pendingData,
      conflict: e
    };
    if (this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve) try {
      this.config.onConflictResolve(t);
    } catch {
    }
  }
  isConflictError(e) {
    if (!e) return !1;
    const t = e;
    return !!(t.code === "AUTOSAVE_CONFLICT" || t.text_code === "AUTOSAVE_CONFLICT" || t.name === "AutosaveConflictError" || (e instanceof Error ? e.message : String(e)).toLowerCase().includes("autosave conflict"));
  }
  extractConflictInfo(e) {
    const t = e, r = t.metadata;
    return r ? {
      version: r.version || "",
      expectedVersion: r.expected_version || "",
      latestStatePath: r.latest_state_path,
      latestServerState: r.latest_server_state,
      entityId: r.entity_id,
      panel: r.panel
    } : {
      version: t.version || "",
      expectedVersion: t.expectedVersion || "",
      latestStatePath: t.latestStatePath,
      latestServerState: t.latestServerState,
      entityId: t.entityId,
      panel: t.panel
    };
  }
  onStateChange(e) {
    return this.listeners.push(e), () => {
      const t = this.listeners.indexOf(e);
      t >= 0 && this.listeners.splice(t, 1);
    };
  }
  renderIndicator() {
    const e = this.config.classPrefix, t = this.config.labels, r = `${e}--${this.state}`, n = t[this.state] || "", s = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${r}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${s}</span>
      <span class="${e}__label">${n}</span>
      ${this.state === "error" ? `<button type="button" class="${e}__retry" aria-label="Retry save">Retry</button>` : ""}
    </div>`;
  }
  renderConflictUI() {
    const e = this.config.classPrefix, t = this.config.conflictLabels;
    return `<div class="${e} ${e}--conflict" role="alertdialog" aria-labelledby="${e}-conflict-title" aria-describedby="${e}-conflict-desc">
      <div class="${e}__conflict-header">
        <span class="${e}__icon">${this.getStateIcon()}</span>
        <span id="${e}-conflict-title" class="${e}__conflict-title">${t.title}</span>
      </div>
      <p id="${e}-conflict-desc" class="${e}__conflict-message">${t.message}</p>
      <div class="${e}__conflict-actions">
        <button type="button" class="${e}__conflict-use-server" aria-label="${t.useServer}">
          ${t.useServer}
        </button>
        ${this.config.allowForceSave ? `
          <button type="button" class="${e}__conflict-force-save" aria-label="${t.forceSave}">
            ${t.forceSave}
          </button>
        ` : ""}
        <button type="button" class="${e}__conflict-dismiss" aria-label="${t.dismiss}">
          ${t.dismiss}
        </button>
      </div>
    </div>`;
  }
  render() {
    this.config.container && (this.config.container.innerHTML = this.renderIndicator(), this.bindRetryButton(), this.bindConflictButtons());
  }
  destroy() {
    this.cancelDebounce(), this.cancelSavedTimer(), this.listeners = [];
  }
  setState(e) {
    if (e === this.state) return;
    const t = this.state;
    this.state = e;
    const r = {
      previousState: t,
      currentState: e,
      error: this.lastError ?? void 0,
      data: this.pendingData ?? void 0
    };
    for (const n of this.listeners) try {
      n(r);
    } catch {
    }
    this.config.showToasts && this.config.notifier && this.showToast(e), this.render();
  }
  showToast(e) {
    const t = this.config.notifier;
    if (t)
      switch (e) {
        case "saved":
          t.success(this.config.labels.saved ?? J.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? J.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? J.conflict);
          break;
      }
  }
  getStateIcon() {
    switch (this.state) {
      case "saving":
        return `<svg class="${this.config.classPrefix}__spinner" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="28" stroke-dashoffset="7">
            <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>`;
      case "saved":
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      case "error":
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
          <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
      case "conflict":
        return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
      default:
        return "";
    }
  }
  bindConflictButtons() {
    if (!this.config.container || this.state !== "conflict") return;
    const e = this.config.classPrefix, t = this.config.container.querySelector(`.${e}__conflict-use-server`);
    t && t.addEventListener("click", () => this.resolveWithServerVersion());
    const r = this.config.container.querySelector(`.${e}__conflict-force-save`);
    r && r.addEventListener("click", () => this.resolveWithForceSave());
    const n = this.config.container.querySelector(`.${e}__conflict-dismiss`);
    n && n.addEventListener("click", () => this.dismissConflict());
  }
  cancelDebounce() {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
  }
  cancelSavedTimer() {
    this.savedTimer && (clearTimeout(this.savedTimer), this.savedTimer = null);
  }
  bindRetryButton() {
    if (!this.config.container) return;
    const e = this.config.container.querySelector(`.${this.config.classPrefix}__retry`);
    e && e.addEventListener("click", () => this.retry());
  }
};
function vl(e) {
  return new Nt({
    debounceMs: 1500,
    savedDurationMs: 2e3,
    showToasts: !1,
    labels: {
      idle: "",
      saving: "Saving...",
      saved: "All changes saved",
      error: "Failed to save",
      conflict: "Conflict detected"
    },
    enableConflictDetection: !0,
    allowForceSave: !0,
    ...e
  });
}
function wl(e, t = {}) {
  const r = t.classPrefix ?? Fe, n = {
    ...J,
    ...t.labels
  }[e] || "";
  let s = "";
  switch (e) {
    case "saving":
      s = `<span class="${r}__spinner"></span>`;
      break;
    case "saved":
      s = `<span class="${r}__check">✓</span>`;
      break;
    case "error":
      s = `<span class="${r}__error">!</span>`;
      break;
    case "conflict":
      s = `<span class="${r}__conflict-icon">⚠</span>`;
      break;
  }
  return `<div class="${r} ${r}--${e}" role="status" aria-live="polite">
    ${s}
    <span class="${r}__label">${n}</span>
  </div>`;
}
function xl(e = Fe) {
  return `
    .${e} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${e}--idle {
      opacity: 0;
    }

    .${e}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${e}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${e}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${e}__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .${e}__icon svg {
      width: 100%;
      height: 100%;
    }

    .${e}__spinner {
      animation: ${e}-spin 1s linear infinite;
    }

    .${e}__retry {
      margin-left: 0.5rem;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-retry-color, #3b82f6);
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${e}__retry:hover {
      background-color: var(--autosave-retry-hover-bg, rgba(59, 130, 246, 0.1));
    }

    @keyframes ${e}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Conflict state styles (TX-074) */
    .${e}--conflict {
      color: var(--autosave-conflict-color, #f59e0b);
      padding: 0.75rem;
      background: var(--autosave-conflict-bg, #fffbeb);
      border: 1px solid var(--autosave-conflict-border, #fcd34d);
      border-radius: 0.5rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .${e}__conflict-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .${e}__conflict-title {
      font-weight: 600;
      color: var(--autosave-conflict-title-color, #92400e);
    }

    .${e}__conflict-message {
      font-size: 0.75rem;
      color: var(--autosave-conflict-message-color, #78350f);
      margin: 0;
    }

    .${e}__conflict-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .${e}__conflict-actions button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${e}__conflict-use-server {
      color: white;
      background: var(--autosave-conflict-use-server-bg, #3b82f6);
      border: none;
    }

    .${e}__conflict-use-server:hover {
      background: var(--autosave-conflict-use-server-hover-bg, #2563eb);
    }

    .${e}__conflict-force-save {
      color: var(--autosave-conflict-force-color, #ef4444);
      background: transparent;
      border: 1px solid currentColor;
    }

    .${e}__conflict-force-save:hover {
      background: var(--autosave-conflict-force-hover-bg, rgba(239, 68, 68, 0.1));
    }

    .${e}__conflict-dismiss {
      color: var(--autosave-conflict-dismiss-color, #6b7280);
      background: transparent;
      border: 1px solid var(--autosave-conflict-dismiss-border, #d1d5db);
    }

    .${e}__conflict-dismiss:hover {
      background: var(--autosave-conflict-dismiss-hover-bg, #f3f4f6);
    }
  `;
}
function Sl(e, t) {
  const { watchFields: r, indicatorSelector: n, ...s } = t;
  let a = s.container;
  !a && n && (a = e.querySelector(n) ?? void 0);
  const i = new Nt({
    ...s,
    container: a
  }), o = () => {
    const p = new FormData(e), h = {};
    return p.forEach((y, g) => {
      h[g] = y;
    }), h;
  }, l = (p) => {
    const h = p.target;
    if (h) {
      if (r && r.length > 0) {
        const y = h.name;
        if (!y || !r.includes(y)) return;
      }
      i.markDirty(o());
    }
  };
  e.addEventListener("input", l), e.addEventListener("change", l), e.addEventListener("submit", async (p) => {
    i.hasPendingChanges() && (p.preventDefault(), await i.save() && e.submit());
  });
  const c = (p) => {
    i.hasPendingChanges() && (p.preventDefault(), p.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const d = () => {
    document.hidden && i.hasPendingChanges() && i.save();
  };
  document.addEventListener("visibilitychange", d);
  const u = i.destroy.bind(i);
  return i.destroy = () => {
    e.removeEventListener("input", l), e.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), u();
  }, i;
}
var Gt = "char-counter", Ga = "interpolation-preview", Ht = "dir-toggle", Ut = [
  {
    pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g,
    name: "Mustache",
    example: "{{name}}"
  },
  {
    pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g,
    name: "ICU",
    example: "{name}"
  },
  {
    pattern: /%(\d+\$)?[sdfc]/g,
    name: "Printf",
    example: "%s"
  },
  {
    pattern: /%\((\w+)\)[sdf]/g,
    name: "Named Printf",
    example: "%(name)s"
  },
  {
    pattern: /\$\{(\w+)\}/g,
    name: "Template Literal",
    example: "${name}"
  }
], Ha = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
}, Ua = class {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Gt,
      formatDisplay: e.formatDisplay ?? this.defaultFormatDisplay.bind(this)
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  getCount() {
    return this.config.input.value.length;
  }
  getSeverity() {
    const e = this.getCount(), t = [...this.config.thresholds].sort((r, n) => n.limit - r.limit);
    for (const r of t) if (e >= r.limit) return r.severity;
    return null;
  }
  update() {
    const e = this.getCount(), t = this.getSeverity(), r = this.config.hardLimit ?? this.config.softLimit;
    this.config.enforceHardLimit && this.config.hardLimit && e > this.config.hardLimit && (this.config.input.value = this.config.input.value.slice(0, this.config.hardLimit)), this.counterEl && (this.counterEl.textContent = this.config.formatDisplay(e, r), this.counterEl.className = this.buildCounterClasses(t), this.counterEl.setAttribute("aria-live", "polite"), t === "error" ? this.counterEl.setAttribute("role", "alert") : this.counterEl.removeAttribute("role"));
  }
  render() {
    const e = this.getCount(), t = this.getSeverity(), r = this.config.hardLimit ?? this.config.softLimit;
    return `<span class="${this.buildCounterClasses(t)}" aria-live="polite">${this.config.formatDisplay(e, r)}</span>`;
  }
  destroy() {
    this.config.input.removeEventListener("input", this.boundUpdate), this.config.input.removeEventListener("change", this.boundUpdate), this.counterEl?.parentElement && this.counterEl.parentElement.removeChild(this.counterEl);
  }
  init() {
    this.counterEl = document.createElement("span"), this.counterEl.className = this.buildCounterClasses(null), this.config.container ? this.config.container.appendChild(this.counterEl) : this.config.input.parentElement?.insertBefore(this.counterEl, this.config.input.nextSibling), this.config.input.addEventListener("input", this.boundUpdate), this.config.input.addEventListener("change", this.boundUpdate), this.update();
  }
  buildDefaultThresholds(e) {
    const t = [];
    return e.softLimit && t.push({
      limit: e.softLimit,
      severity: "warning",
      message: `Approaching limit (${e.softLimit} characters)`
    }), e.hardLimit && t.push({
      limit: e.hardLimit,
      severity: "error",
      message: `Maximum limit reached (${e.hardLimit} characters)`
    }), t;
  }
  buildCounterClasses(e) {
    const t = this.config.classPrefix, r = [t];
    return e && r.push(`${t}--${e}`), r.join(" ");
  }
  defaultFormatDisplay(e, t) {
    return t ? `${e} / ${t}` : `${e}`;
  }
}, Va = class {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? Ha,
      patterns: [...Ut, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Ga
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  getMatches() {
    const e = this.config.input.value, t = [];
    for (const r of this.config.patterns) {
      r.pattern.lastIndex = 0;
      let n;
      for (; (n = r.pattern.exec(e)) !== null; ) t.push({
        pattern: r.name,
        variable: n[1] ?? n[0],
        start: n.index,
        end: n.index + n[0].length
      });
    }
    return t;
  }
  getPreviewText() {
    let e = this.config.input.value;
    for (const t of this.config.patterns)
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (r, n) => {
        const s = (n ?? r).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [a, i] of Object.entries(this.config.sampleValues)) if (a.toLowerCase() === s) return i;
        return r;
      });
    return e;
  }
  update() {
    if (this.previewEl) {
      if (!(this.getMatches().length > 0)) {
        this.previewEl.classList.add(`${this.config.classPrefix}--empty`), this.previewEl.innerHTML = "";
        return;
      }
      this.previewEl.classList.remove(`${this.config.classPrefix}--empty`), this.config.highlightVariables ? this.previewEl.innerHTML = this.renderHighlightedPreview() : this.previewEl.textContent = this.getPreviewText();
    }
  }
  renderHighlightedPreview() {
    const e = this.config.input.value, t = this.getMatches(), r = this.config.classPrefix;
    if (t.length === 0) return this.escapeHtml(e);
    t.sort((a, i) => a.start - i.start);
    let n = "", s = 0;
    for (const a of t) {
      n += this.escapeHtml(e.slice(s, a.start));
      const i = this.getSampleValue(a.variable), o = e.slice(a.start, a.end);
      n += `<span class="${r}__variable" title="${this.escapeHtml(o)}">${this.escapeHtml(i ?? o)}</span>`, s = a.end;
    }
    return n += this.escapeHtml(e.slice(s)), n;
  }
  render() {
    const e = this.config.classPrefix;
    return `<div class="${e}${this.getMatches().length === 0 ? ` ${e}--empty` : ""}">
      <span class="${e}__label">Preview:</span>
      <span class="${e}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : this.escapeHtml(this.getPreviewText())}</span>
    </div>`;
  }
  destroy() {
    this.config.input.removeEventListener("input", this.boundUpdate), this.previewEl?.parentElement && this.previewEl.parentElement.removeChild(this.previewEl);
  }
  init() {
    this.previewEl = document.createElement("div"), this.previewEl.className = this.config.classPrefix, this.config.container ? this.config.container.appendChild(this.previewEl) : this.config.input.parentElement?.appendChild(this.previewEl), this.config.input.addEventListener("input", this.boundUpdate), this.update();
  }
  getSampleValue(e) {
    const t = e.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (const [r, n] of Object.entries(this.config.sampleValues)) if (r.toLowerCase() === t) return n;
    return null;
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}, Ka = class {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Ht,
      onChange: e.onChange
    }, this.currentDirection = this.resolveInitialDirection(), this.init();
  }
  getDirection() {
    return this.currentDirection;
  }
  setDirection(e) {
    if (e !== this.currentDirection) {
      if (this.currentDirection = e, this.config.input.dir = e, this.config.input.style.textAlign = e === "rtl" ? "right" : "left", this.config.persistenceKey) try {
        localStorage.setItem(this.config.persistenceKey, e);
      } catch {
      }
      this.updateToggle(), this.config.onChange?.(e);
    }
  }
  toggle() {
    this.setDirection(this.currentDirection === "ltr" ? "rtl" : "ltr");
  }
  render() {
    const e = this.config.classPrefix, t = this.currentDirection === "rtl";
    return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${t ? "RTL" : "LTR"})">
      <span class="${e}__icon">${t ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${e}__label">${t ? "RTL" : "LTR"}</span>
    </button>`;
  }
  destroy() {
    this.toggleEl?.parentElement && this.toggleEl.parentElement.removeChild(this.toggleEl);
  }
  init() {
    this.config.input.dir = this.currentDirection, this.config.input.style.textAlign = this.currentDirection === "rtl" ? "right" : "left", this.toggleEl = document.createElement("button"), this.toggleEl.type = "button", this.toggleEl.className = this.config.classPrefix, this.updateToggle(), this.toggleEl.addEventListener("click", () => this.toggle()), this.config.container ? this.config.container.appendChild(this.toggleEl) : this.config.input.parentElement?.appendChild(this.toggleEl);
  }
  resolveInitialDirection() {
    if (this.config.persistenceKey) try {
      const e = localStorage.getItem(this.config.persistenceKey);
      if (e === "ltr" || e === "rtl") return e;
    } catch {
    }
    return this.config.initialDirection === "ltr" || this.config.initialDirection === "rtl" ? this.config.initialDirection : this.config.input.dir === "rtl" || document.dir === "rtl" || document.documentElement.dir === "rtl" ? "rtl" : "ltr";
  }
  updateToggle() {
    if (!this.toggleEl) return;
    const e = this.currentDirection === "rtl";
    this.toggleEl.setAttribute("aria-pressed", String(e)), this.toggleEl.setAttribute("title", `Toggle text direction (${e ? "RTL" : "LTR"})`), this.toggleEl.innerHTML = `
      <span class="${this.config.classPrefix}__icon">${e ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${this.config.classPrefix}__label">${e ? "RTL" : "LTR"}</span>
    `;
  }
  ltrIcon() {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  rtlIcon() {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
};
function $l(e, t = {}) {
  const r = [], n = [], s = [];
  for (const a of t.charCounterFields ?? []) {
    const i = e.querySelector(`[name="${a}"]`);
    i && r.push(new Ua({
      input: i,
      ...t.charCounterConfig
    }));
  }
  for (const a of t.interpolationFields ?? []) {
    const i = e.querySelector(`[name="${a}"]`);
    i && n.push(new Va({
      input: i,
      ...t.interpolationConfig
    }));
  }
  for (const a of t.directionToggleFields ?? []) {
    const i = e.querySelector(`[name="${a}"]`);
    i && s.push(new Ka({
      input: i,
      persistenceKey: `dir-${a}`,
      ...t.directionToggleConfig
    }));
  }
  return {
    counters: r,
    previews: n,
    toggles: s,
    destroy: () => {
      r.forEach((a) => a.destroy()), n.forEach((a) => a.destroy()), s.forEach((a) => a.destroy());
    }
  };
}
function Cl(e, t, r, n = Gt) {
  const s = [n];
  r && s.push(`${n}--${r}`);
  const a = t ? `${e} / ${t}` : `${e}`;
  return `<span class="${s.join(" ")}" aria-live="polite">${a}</span>`;
}
function kl(e, t = Ht) {
  const r = e === "rtl", n = r ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${t}" aria-pressed="${r}" title="Toggle text direction (${e.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${n}</svg>
    <span class="${t}__label">${e.toUpperCase()}</span>
  </button>`;
}
function Al() {
  return `
    /* Character Counter */
    .char-counter {
      display: inline-flex;
      font-size: 0.75rem;
      color: var(--char-counter-color, #6b7280);
      margin-left: 0.5rem;
    }

    .char-counter--warning {
      color: var(--char-counter-warning-color, #f59e0b);
    }

    .char-counter--error {
      color: var(--char-counter-error-color, #ef4444);
      font-weight: 500;
    }

    /* Interpolation Preview */
    .interpolation-preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--preview-bg, #f9fafb);
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .interpolation-preview--empty {
      display: none;
    }

    .interpolation-preview__label {
      color: var(--preview-label-color, #6b7280);
      font-size: 0.75rem;
      margin-right: 0.5rem;
    }

    .interpolation-preview__variable {
      background: var(--preview-variable-bg, #e0f2fe);
      color: var(--preview-variable-color, #0369a1);
      padding: 0.125rem 0.25rem;
      border-radius: 0.125rem;
      font-family: monospace;
    }

    /* Direction Toggle */
    .dir-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      color: var(--dir-toggle-color, #374151);
      background: var(--dir-toggle-bg, #f3f4f6);
      border: 1px solid var(--dir-toggle-border, #d1d5db);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .dir-toggle:hover {
      background: var(--dir-toggle-hover-bg, #e5e7eb);
    }

    .dir-toggle[aria-pressed="true"] {
      background: var(--dir-toggle-active-bg, #dbeafe);
      border-color: var(--dir-toggle-active-border, #93c5fd);
      color: var(--dir-toggle-active-color, #1d4ed8);
    }

    .dir-toggle__icon {
      display: inline-flex;
    }

    .dir-toggle__label {
      font-weight: 500;
    }
  `;
}
function El(e, t = Ut) {
  const r = [];
  for (const n of t) {
    n.pattern.lastIndex = 0;
    let s;
    for (; (s = n.pattern.exec(e)) !== null; ) r.push({
      pattern: n.name,
      variable: s[1] ?? s[0],
      start: s.index,
      end: s.index + s[0].length
    });
  }
  return r;
}
function Ll(e, t, r) {
  return r && e >= r ? "error" : t && e >= t ? "warning" : null;
}
function _l(e) {
  return typeof e == "string" && [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(e) ? e : "none";
}
function Ja(e) {
  return e === "core+exchange" || e === "full";
}
function Ya(e) {
  return e === "core+queue" || e === "full";
}
function Rl(e) {
  return e !== "none";
}
function Qa(e) {
  return !e || typeof e != "object" ? null : or(e);
}
var Vt = class {
  constructor(e) {
    this.capabilities = e;
  }
  getMode() {
    return this.capabilities.profile;
  }
  getCapabilities() {
    return this.capabilities;
  }
  isModuleEnabledByMode(e) {
    const t = this.capabilities.profile;
    return e === "exchange" ? Ja(t) : Ya(t);
  }
  getModuleState(e) {
    return this.capabilities.modules[e] || null;
  }
  getActionState(e, t) {
    const r = this.getModuleState(e);
    return r && r.actions[t] || null;
  }
  gateNavItem(e) {
    const t = this.getModuleState(e.module);
    if (!t) return {
      visible: !1,
      enabled: !1,
      reason: `${e.module} module not configured`,
      reasonCode: "MODULE_NOT_CONFIGURED"
    };
    if (!t.enabled) return {
      visible: !1,
      enabled: !1,
      reason: t.entry.reason || "Module disabled by capability mode",
      reasonCode: t.entry.reason_code || "FEATURE_DISABLED"
    };
    if (!t.visible) return {
      visible: !1,
      enabled: !1,
      reason: t.entry.reason || "Module hidden by capability metadata",
      reasonCode: t.entry.reason_code || "FEATURE_DISABLED",
      permission: t.entry.permission
    };
    if (!t.entry.enabled) return {
      visible: !0,
      enabled: !1,
      reason: t.entry.reason || "Missing module view permission",
      reasonCode: t.entry.reason_code || "PERMISSION_DENIED",
      permission: t.entry.permission
    };
    if (e.action) {
      const r = t.actions[e.action];
      if (!r) return {
        visible: !0,
        enabled: !1,
        reason: `Action ${e.action} not configured`,
        reasonCode: "ACTION_NOT_CONFIGURED"
      };
      if (!r.enabled) return {
        visible: !0,
        enabled: !1,
        reason: r.reason || `Missing ${e.action} permission`,
        reasonCode: r.reason_code || "PERMISSION_DENIED",
        permission: r.permission
      };
    }
    return {
      visible: !0,
      enabled: !0
    };
  }
  gateAction(e, t) {
    return this.gateNavItem({
      module: e,
      action: t
    });
  }
  canAccessExchange() {
    const e = this.gateNavItem({ module: "exchange" });
    return e.visible && e.enabled;
  }
  canAccessQueue() {
    const e = this.gateNavItem({ module: "queue" });
    return e.visible && e.enabled;
  }
  getRoute(e) {
    return this.capabilities.routes[e] || null;
  }
  isFeatureEnabled(e) {
    return this.capabilities.features[e] === !0;
  }
};
function We(e) {
  const t = Qa(e);
  return t ? new Vt(t) : null;
}
function Dl() {
  return new Vt({ ...lr });
}
function Il(e) {
  return e.visible ? e.enabled ? "" : `aria-disabled="true"${e.reason ? ` title="${Kt(e.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function Wa(e) {
  if (e.enabled || !e.reason) return "";
  const t = (e.reasonCode || "").trim();
  return t ? sr(t, {
    size: "sm",
    showFullMessage: !0
  }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${Kt(e.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${Xa(e.reason)}
    </span>
  `.trim();
}
function Xa(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Kt(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Pl() {
  return `
    /* Capability Gate Styles */
    .capability-gate-reason {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
      white-space: nowrap;
    }

    .capability-gate-disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }

    .capability-gate-disabled:focus-visible {
      pointer-events: auto;
    }

    [aria-disabled="true"].capability-gate-action {
      opacity: 0.6;
      cursor: not-allowed;
    }

    [aria-disabled="true"].capability-gate-action:hover {
      background-color: inherit;
    }

    .capability-gate-hidden {
      display: none !important;
    }
  `;
}
function Za(e, t) {
  if (!t.visible) {
    e.style.display = "none", e.setAttribute("aria-hidden", "true");
    return;
  }
  e.style.display = "", e.removeAttribute("aria-hidden"), t.enabled ? (e.removeAttribute("aria-disabled"), e.classList.remove("capability-gate-disabled"), e.removeAttribute("title"), delete e.dataset.reasonCode, e.removeEventListener("click", Xe, !0)) : (e.setAttribute("aria-disabled", "true"), e.classList.add("capability-gate-disabled"), t.reason && (e.setAttribute("title", t.reason), e.dataset.reasonCode = t.reasonCode || ""), e.addEventListener("click", Xe, !0));
}
function Xe(e) {
  e.currentTarget.getAttribute("aria-disabled") === "true" && (e.preventDefault(), e.stopPropagation());
}
function Ml(e, t) {
  e.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const n = r.dataset.capabilityGate;
    if (n)
      try {
        const s = JSON.parse(n);
        Za(r, t.gateNavItem(s));
      } catch {
        console.warn("Invalid capability gate config:", n);
      }
  });
}
var ei = {
  title: "My Translation Work",
  myAssignments: "My Assignments",
  dueSoon: "Due Soon",
  needsReview: "Needs Review",
  all: "All",
  overdue: "Overdue",
  onTrack: "On Track",
  noAssignments: "No assignments",
  noAssignmentsDescription: "You have no translation assignments at this time.",
  loading: "Loading assignments...",
  error: "Failed to load assignments",
  retry: "Retry",
  submitForReview: "Submit for Review",
  approve: "Approve",
  reject: "Reject",
  openAssignment: "Open",
  dueDate: "Due Date",
  priority: "Priority",
  status: "Status",
  targetLocale: "Target",
  sourceTitle: "Content"
}, ti = [
  {
    id: "all",
    label: "All",
    filters: {}
  },
  {
    id: "in_progress",
    label: "In Progress",
    filters: { status: "in_progress" }
  },
  {
    id: "due_soon",
    label: "Due Soon",
    filters: { status: "in_progress" }
  },
  {
    id: "review",
    label: "Needs Review",
    filters: { status: "review" }
  }
], ri = class {
  constructor(e) {
    this.container = null, this.state = "loading", this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || ti,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: {
        ...ei,
        ...e.labels || {}
      }
    };
  }
  mount(e) {
    if (this.container = e, this.config.capabilityGate) {
      if (this.gateResult = this.config.capabilityGate.gateNavItem({ module: "queue" }), !this.gateResult.visible) {
        this.container.setAttribute("aria-hidden", "true"), this.container.style.display = "none";
        return;
      }
      if (!this.gateResult.enabled) {
        this.state = "disabled", this.render();
        return;
      }
    }
    this.render(), this.loadData(), this.config.refreshInterval > 0 && this.startAutoRefresh();
  }
  unmount() {
    this.stopAutoRefresh(), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async refresh() {
    await this.loadData();
  }
  setActivePreset(e) {
    this.activePreset = e, this.loadData();
  }
  getState() {
    return this.state;
  }
  getData() {
    return this.data;
  }
  startAutoRefresh() {
    this.refreshTimer || (this.refreshTimer = window.setInterval(() => {
      this.loadData();
    }, this.config.refreshInterval));
  }
  stopAutoRefresh() {
    this.refreshTimer && (window.clearInterval(this.refreshTimer), this.refreshTimer = null);
  }
  async loadData() {
    this.state = "loading", this.render();
    try {
      const e = this.config.filterPresets.find((s) => s.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), r = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, n = await fetch(r, { headers: { Accept: "application/json" } });
      if (!n.ok) throw new Error(`Failed to load: ${n.status}`);
      this.data = await n.json(), this.state = this.data.assignments.length === 0 ? "empty" : "loaded", this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error";
    }
    this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="translator-dashboard" role="region" aria-label="${x(e.title)}">
        ${this.renderHeader()}
        ${this.renderSummaryCards()}
        ${this.renderFilterBar()}
        ${this.renderContent()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    return `
      <div class="dashboard-header">
        <h2 class="dashboard-title">${x(e.title)}</h2>
        <button type="button" class="dashboard-refresh-btn" aria-label="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-1.621-6.01a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H10.51a.75.75 0 000 1.5h4.243a.75.75 0 00.75-.75V3.295a.75.75 0 00-1.5 0v2.43l-.311-.311z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;
  }
  renderSummaryCards() {
    if (this.state === "loading" || !this.data) return this.renderSummaryLoading();
    const e = this.data.summary, t = this.config.labels;
    return `
      <div class="dashboard-summary-cards" role="list" aria-label="Work summary">
        ${this.renderSummaryCard("total", t.myAssignments, e.total, "text-blue-600 bg-blue-50")}
        ${this.renderSummaryCard("overdue", t.overdue, e.overdue, "text-red-600 bg-red-50")}
        ${this.renderSummaryCard("due_soon", t.dueSoon, e.due_soon, "text-amber-600 bg-amber-50")}
        ${this.renderSummaryCard("review", t.needsReview, e.review, "text-purple-600 bg-purple-50")}
      </div>
    `;
  }
  renderSummaryCard(e, t, r, n) {
    return `
      <div class="summary-card ${n}" role="listitem" data-summary="${e}">
        <div class="summary-count">${r}</div>
        <div class="summary-label">${x(t)}</div>
      </div>
    `;
  }
  renderSummaryLoading() {
    return `
      <div class="dashboard-summary-cards loading" role="list" aria-busy="true">
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
      </div>
    `;
  }
  renderFilterBar() {
    return `
      <div class="dashboard-filter-bar" role="tablist" aria-label="Filter assignments">
        ${this.config.filterPresets.map((e) => this.renderFilterPreset(e)).join("")}
      </div>
    `;
  }
  renderFilterPreset(e) {
    const t = this.activePreset === e.id, r = e.badge?.() ?? null, n = r !== null ? `<span class="filter-badge">${r}</span>` : "";
    return `
      <button type="button"
              class="filter-preset ${t ? "active" : ""}"
              role="tab"
              aria-selected="${t}"
              data-preset="${e.id}">
        ${e.icon || ""}
        <span class="filter-label">${x(e.label)}</span>
        ${n}
      </button>
    `;
  }
  renderContent() {
    switch (this.state) {
      case "disabled":
        return this.renderDisabled();
      case "loading":
        return this.renderLoading();
      case "error":
        return this.renderError();
      case "empty":
        return this.renderEmpty();
      case "loaded":
        return this.renderAssignmentList();
      default:
        return "";
    }
  }
  renderLoading() {
    const e = this.config.labels;
    return `
      <div class="dashboard-loading" role="status" aria-busy="true">
        <div class="loading-spinner"></div>
        <p>${x(e.loading)}</p>
      </div>
    `;
  }
  renderError() {
    const e = this.config.labels;
    return `
      <div class="dashboard-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10 text-red-500">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <p class="error-message">${x(e.error)}</p>
        ${this.error ? `<p class="error-detail">${x(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${x(e.retry)}</button>
      </div>
    `;
  }
  renderEmpty() {
    const e = this.config.labels;
    return `
      <div class="dashboard-empty" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
          <path fill-rule="evenodd" d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm11 2A1.5 1.5 0 0012 6.5v7a1.5 1.5 0 001.5 1.5h4a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0017.5 5h-4zm-10 7A1.5 1.5 0 002 13.5v2A1.5 1.5 0 003.5 17h5A1.5 1.5 0 0010 15.5v-2A1.5 1.5 0 008.5 12h-5z" clip-rule="evenodd" />
        </svg>
        <p class="empty-title">${x(e.noAssignments)}</p>
        <p class="empty-description">${x(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? Wa(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${x(e)}</p>
        ${t}
        <p class="disabled-help-text">
          Contact your administrator if you believe you should have access to this feature.
        </p>
      </div>
    `;
  }
  renderAssignmentList() {
    if (!this.data) return "";
    const e = this.config.labels;
    let t = this.data.assignments;
    return this.activePreset === "due_soon" && (t = t.filter((r) => r.due_state === "due_soon" || r.due_state === "overdue")), t.length === 0 ? this.renderEmpty() : `
      <div class="dashboard-assignment-list">
        <table class="assignment-table" role="grid" aria-label="Translation assignments">
          <thead>
            <tr>
              <th scope="col">${x(e.sourceTitle)}</th>
              <th scope="col">${x(e.targetLocale)}</th>
              <th scope="col">${x(e.status)}</th>
              <th scope="col">${x(e.dueDate)}</th>
              <th scope="col">${x(e.priority)}</th>
              <th scope="col" class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${t.map((r) => this.renderAssignmentRow(r)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderAssignmentRow(e) {
    this.config.labels;
    const t = ni(e.due_state), r = si(e.priority), n = H(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), s = e.due_date ? ii(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${K(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${x(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${x(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${x(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${x(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${n}
        </td>
        <td class="due-cell ${t}">
          ${s}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${r}">${x(ai(e.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(e)}
        </td>
      </tr>
    `;
  }
  renderAssignmentActions(e) {
    const t = this.config.labels, r = [], n = typeof this.config.onActionClick == "function";
    r.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${K(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const s = e.review_actions;
    return n && e.queue_state === "in_progress" && s.submit_review.enabled && r.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${K(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), n && e.queue_state === "review" && (s.approve.enabled && r.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${K(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), s.reject.enabled && r.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${K(t.reject)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        `)), `<div class="action-buttons">${r.join("")}</div>`;
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".dashboard-refresh-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelectorAll(".filter-preset").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.preset;
        t && this.setActivePreset(t);
      });
    }), this.container.querySelectorAll(".assignment-row").forEach((e) => {
      const t = e.dataset.assignmentId;
      if (!t || !this.data) return;
      const r = this.data.assignments.find((n) => n.id === t);
      r && (e.querySelectorAll(".action-btn").forEach((n) => {
        n.addEventListener("click", async (s) => {
          s.stopPropagation();
          const a = n.dataset.action;
          a && (a === "open" ? this.openAssignment(r) : typeof this.config.onActionClick == "function" && await this.config.onActionClick(a, r));
        });
      }), e.addEventListener("click", () => {
        this.openAssignment(r);
      }));
    }), this.container.querySelectorAll(".summary-card").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.summary;
        t === "review" ? this.setActivePreset("review") : t === "due_soon" || t === "overdue" ? this.setActivePreset("due_soon") : this.setActivePreset("all");
      });
    }));
  }
  openAssignment(e) {
    if (typeof this.config.onAssignmentClick == "function") {
      this.config.onAssignmentClick(e);
      return;
    }
    const t = this.buildAssignmentEditURL(e);
    !t || typeof window > "u" || (window.location.href = t);
  }
  buildAssignmentEditURL(e) {
    const t = this.config.panelBaseUrl.trim().replace(/\/+$/, "");
    if (!t) return "";
    const r = e.entity_type.trim(), n = e.target_record_id.trim() || e.source_record_id.trim();
    return !r || !n ? "" : `${t}/${encodeURIComponent(r)}/${encodeURIComponent(n)}/edit`;
  }
};
function x(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function K(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ni(e) {
  switch (e) {
    case "overdue":
      return "due-overdue";
    case "due_soon":
      return "due-soon";
    case "on_track":
      return "due-on-track";
    default:
      return "";
  }
}
function si(e) {
  switch (e) {
    case "urgent":
      return "priority-urgent";
    case "high":
      return "priority-high";
    case "normal":
      return "priority-normal";
    case "low":
      return "priority-low";
    default:
      return "priority-normal";
  }
}
function ai(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
function ii(e) {
  const t = /* @__PURE__ */ new Date(), r = e.getTime() - t.getTime(), n = Math.ceil(r / (1e3 * 60 * 60 * 24));
  return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n <= 7 ? `${n}d` : e.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  });
}
function Tl() {
  return `
    /* Translator Dashboard Styles */
    .translator-dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .dashboard-refresh-btn {
      padding: 0.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      border-radius: 0.25rem;
      transition: color 0.2s, background 0.2s;
    }

    .dashboard-refresh-btn:hover {
      color: #374151;
      background: #f3f4f6;
    }

    /* Summary Cards */
    .dashboard-summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }

    .summary-card {
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .summary-count {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
    }

    .summary-label {
      font-size: 0.875rem;
      margin-top: 0.25rem;
      opacity: 0.8;
    }

    /* Filter Bar */
    .dashboard-filter-bar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.75rem;
    }

    .filter-preset {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s;
    }

    .filter-preset:hover {
      border-color: #d1d5db;
      color: #374151;
    }

    .filter-preset.active {
      border-color: #2563eb;
      background: #eff6ff;
      color: #2563eb;
    }

    .filter-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: #e5e7eb;
      border-radius: 9999px;
    }

    .filter-preset.active .filter-badge {
      background: #dbeafe;
    }

    /* Loading State */
    .dashboard-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error State */
    .dashboard-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .error-message {
      font-weight: 500;
      color: #dc2626;
      margin: 1rem 0 0.5rem;
    }

    .error-detail {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 1rem;
    }

    .retry-btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      color: #374151;
      transition: all 0.2s;
    }

    .retry-btn:hover {
      background: #f3f4f6;
    }

    /* Empty State */
    .dashboard-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .empty-title {
      font-weight: 500;
      color: #374151;
      margin: 1rem 0 0.5rem;
    }

    .empty-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    /* Disabled State (TX-101: visible-disabled module UX) */
    .dashboard-disabled {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
      background: #f9fafb;
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      opacity: 0.9;
    }

    .disabled-icon {
      margin-bottom: 1rem;
    }

    .disabled-title {
      font-weight: 600;
      color: #4b5563;
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }

    .disabled-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 1rem;
      max-width: 300px;
    }

    .disabled-help-text {
      font-size: 0.75rem;
      color: #9ca3af;
      margin: 1rem 0 0;
      max-width: 300px;
    }

    /* Assignment Table */
    .dashboard-assignment-list {
      overflow-x: auto;
    }

    .assignment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .assignment-table th {
      text-align: left;
      padding: 0.75rem;
      font-weight: 500;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }

    .assignment-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .assignment-row {
      cursor: pointer;
      transition: background 0.2s;
    }

    .assignment-row:hover {
      background: #f9fafb;
    }

    .title-cell .title-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .source-title {
      font-weight: 500;
      color: #1f2937;
    }

    .entity-type {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .locale-cell {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .locale-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 0.25rem;
    }

    .locale-badge.source {
      background: #f3f4f6;
      color: #6b7280;
    }

    .locale-arrow {
      color: #9ca3af;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .status-pending { background: #f3f4f6; color: #6b7280; }
    .status-assigned { background: #e0e7ff; color: #4338ca; }
    .status-in-progress { background: #dbeafe; color: #1d4ed8; }
    .status-review { background: #fae8ff; color: #a21caf; }
    .status-approved { background: #d1fae5; color: #059669; }
    .status-published { background: #d1fae5; color: #047857; }
    .status-archived { background: #e5e7eb; color: #6b7280; }

    .due-overdue { color: #dc2626; font-weight: 500; }
    .due-soon { color: #d97706; }
    .due-on-track { color: #059669; }

    .priority-indicator {
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-urgent { color: #dc2626; }
    .priority-high { color: #d97706; }
    .priority-normal { color: #6b7280; }
    .priority-low { color: #9ca3af; }

    .actions-col { width: 100px; text-align: right; }
    .actions-cell { text-align: right; }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.25rem;
    }

    .action-btn {
      padding: 0.375rem;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 0.25rem;
      color: #6b7280;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .open-btn:hover { color: #2563eb; }
    .submit-review-btn:hover { color: #7c3aed; }
    .approve-btn:hover { color: #059669; }
    .reject-btn:hover { color: #dc2626; }

    /* Responsive */
    @media (max-width: 640px) {
      .translator-dashboard {
        padding: 1rem;
      }

      .dashboard-summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .assignment-table th:nth-child(4),
      .assignment-table td:nth-child(4),
      .assignment-table th:nth-child(5),
      .assignment-table td:nth-child(5) {
        display: none;
      }
    }
  `;
}
function oi(e, t) {
  const r = new ri(t);
  return r.mount(e), r;
}
function Bl(e) {
  return li(e);
}
function li(e, t = {}) {
  const r = e.dataset.myWorkEndpoint;
  if (!r)
    return console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const n = ci(t);
  return oi(e, {
    myWorkEndpoint: r,
    panelBaseUrl: e.dataset.panelBaseUrl,
    queueEndpoint: e.dataset.queueEndpoint,
    refreshInterval: parseInt(e.dataset.refreshInterval || "0", 10),
    capabilityGate: n || void 0
  });
}
function ci(e) {
  if (e.capabilityGate) return e.capabilityGate;
  if (e.capabilitiesPayload !== void 0) return We(e.capabilitiesPayload);
  const t = di();
  return t === null ? null : We(t);
}
function di() {
  if (typeof window < "u") {
    const e = window.__TRANSLATION_CAPABILITIES__;
    if (e && typeof e == "object") return e;
  }
  if (typeof document < "u") {
    const e = document.querySelector("script[data-translation-capabilities]");
    if (e && e.textContent) try {
      return JSON.parse(e.textContent);
    } catch {
      return null;
    }
  }
  return null;
}
var ui = {
  title: "Import Translations",
  selectFile: "Select file or paste data",
  validateButton: "Validate",
  applyButton: "Apply",
  cancelButton: "Cancel",
  selectAll: "Select All",
  deselectAll: "Deselect All",
  selectedCount: "selected",
  previewTitle: "Preview",
  conflictResolution: "Conflict Resolution",
  keepCurrent: "Keep Current",
  acceptIncoming: "Accept Incoming",
  skip: "Skip",
  force: "Force",
  success: "Success",
  error: "Error",
  conflict: "Conflict",
  skipped: "Skipped",
  validating: "Validating...",
  applying: "Applying...",
  noRowsSelected: "No rows selected",
  applyDisabledReason: "Missing import.apply permission",
  resource: "Resource",
  field: "Field",
  status: "Status",
  sourceText: "Source",
  translatedText: "Translation",
  conflictDetails: "Conflict Details",
  allowCreateMissing: "Create missing translations",
  continueOnError: "Continue on error",
  dryRun: "Dry run (preview only)"
}, pi = class {
  constructor(e) {
    this.container = null, this.state = "idle", this.validationResult = null, this.previewRows = [], this.selection = {
      selected: /* @__PURE__ */ new Set(),
      excluded: /* @__PURE__ */ new Set(),
      allSelected: !1
    }, this.applyOptions = {
      allowCreateMissing: !1,
      continueOnError: !1,
      dryRun: !1,
      async: !1
    }, this.error = null, this.file = null, this.rawData = "";
    const t = {
      ...ui,
      ...e.labels || {}
    };
    this.config = {
      validateEndpoint: e.validateEndpoint,
      applyEndpoint: e.applyEndpoint,
      capabilityGate: e.capabilityGate,
      onValidationComplete: e.onValidationComplete,
      onApplyComplete: e.onApplyComplete,
      onError: e.onError,
      labels: t
    };
  }
  mount(e) {
    this.container = e, this.render();
  }
  unmount() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getState() {
    return this.state;
  }
  getValidationResult() {
    return this.validationResult;
  }
  getSelectedIndices() {
    return this.selection.allSelected ? this.previewRows.filter((e) => !this.selection.excluded.has(e.index)).map((e) => e.index) : Array.from(this.selection.selected);
  }
  setFile(e) {
    this.file = e, this.rawData = "", this.render();
  }
  setRawData(e) {
    this.rawData = e, this.file = null, this.render();
  }
  async validate() {
    this.state = "validating", this.error = null, this.render();
    try {
      const e = new FormData();
      if (this.file) e.append("file", this.file);
      else if (this.rawData) {
        const n = await fetch(this.config.validateEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: this.rawData
        });
        if (!n.ok) throw new Error(`Validation failed: ${n.status}`);
        const s = await n.json();
        return this.handleValidationResult(s), s;
      } else throw new Error("No file or data to validate");
      const t = await fetch(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok) throw new Error(`Validation failed: ${t.status}`);
      const r = await t.json();
      return this.handleValidationResult(r), r;
    } catch (e) {
      return this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  async apply(e) {
    const t = {
      ...this.applyOptions,
      ...e
    }, r = t.selectedIndices || this.getSelectedIndices();
    if (r.length === 0)
      return this.error = new Error(this.config.labels.noRowsSelected), this.render(), null;
    if (this.config.capabilityGate) {
      const n = this.config.capabilityGate.gateAction("exchange", "import.apply");
      if (!n.enabled)
        return this.error = new Error(n.reason || this.config.labels.applyDisabledReason), this.render(), null;
    }
    this.state = "applying", this.error = null, this.render();
    try {
      const n = {
        rows: (this.validationResult?.results.filter((i) => r.includes(i.index)) || []).map((i) => {
          const o = this.previewRows.find((l) => l.index === i.index);
          return {
            ...i,
            resolution: o?.resolution
          };
        }),
        allow_create_missing: t.allowCreateMissing,
        allow_source_hash_override: t.allowSourceHashOverride,
        continue_on_error: t.continueOnError,
        dry_run: t.dryRun,
        async: t.async
      }, s = await fetch(this.config.applyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(n)
      });
      if (!s.ok) throw new Error(`Apply failed: ${s.status}`);
      const a = await s.json();
      return this.state = "applied", this.config.onApplyComplete?.(a), this.render(), a;
    } catch (n) {
      return this.error = n instanceof Error ? n : new Error(String(n)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  toggleRowSelection(e) {
    this.selection.allSelected ? this.selection.excluded.has(e) ? this.selection.excluded.delete(e) : this.selection.excluded.add(e) : this.selection.selected.has(e) ? this.selection.selected.delete(e) : this.selection.selected.add(e), this.updatePreviewRowSelection(), this.render();
  }
  selectAll() {
    this.selection.allSelected = !0, this.selection.excluded.clear(), this.updatePreviewRowSelection(), this.render();
  }
  deselectAll() {
    this.selection.allSelected = !1, this.selection.selected.clear(), this.selection.excluded.clear(), this.updatePreviewRowSelection(), this.render();
  }
  setRowResolution(e, t) {
    const r = this.previewRows.find((n) => n.index === e);
    r && (r.resolution = t, this.render());
  }
  setApplyOption(e, t) {
    this.applyOptions[e] = t, this.render();
  }
  reset() {
    this.state = "idle", this.validationResult = null, this.previewRows = [], this.selection = {
      selected: /* @__PURE__ */ new Set(),
      excluded: /* @__PURE__ */ new Set(),
      allSelected: !1
    }, this.error = null, this.file = null, this.rawData = "", this.render();
  }
  handleValidationResult(e) {
    this.validationResult = e, this.previewRows = e.results.map((t) => ({
      ...t,
      isSelected: t.status !== "error",
      resolution: t.status === "conflict" ? "skip" : void 0
    })), this.selection.allSelected = !0, this.selection.excluded = new Set(e.results.filter((t) => t.status === "error").map((t) => t.index)), this.state = "validated", this.config.onValidationComplete?.(e), this.render();
  }
  updatePreviewRowSelection() {
    this.previewRows = this.previewRows.map((e) => ({
      ...e,
      isSelected: this.selection.allSelected ? !this.selection.excluded.has(e.index) : this.selection.selected.has(e.index)
    }));
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="exchange-import" role="dialog" aria-label="${b(e.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    return `
      <div class="import-header">
        <h3 class="import-title">${b(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${b(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${b(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${b(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${b(t.skipped)}</span>
      </div>
    `;
  }
  renderContent() {
    switch (this.state) {
      case "idle":
        return this.renderFileInput();
      case "validating":
        return this.renderLoading(this.config.labels.validating);
      case "validated":
        return this.renderPreviewGrid();
      case "applying":
        return this.renderLoading(this.config.labels.applying);
      case "applied":
        return this.renderApplyResult();
      case "error":
        return this.renderError();
      default:
        return "";
    }
  }
  renderFileInput() {
    const e = this.config.labels;
    return `
      <div class="import-file-input">
        <label class="file-dropzone">
          <input type="file" accept=".csv,.json" class="file-input" />
          <span class="dropzone-text">${b(e.selectFile)}</span>
        </label>
        <div class="or-divider">or</div>
        <textarea class="data-input" placeholder="Paste JSON or CSV data here..." rows="5"></textarea>
      </div>
    `;
  }
  renderLoading(e) {
    return `
      <div class="import-loading" role="status" aria-busy="true">
        <div class="loading-spinner"></div>
        <p>${b(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, r = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${b(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${b(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${r} ${b(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${b(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${b(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${b(e.dryRun)}
            </label>
          </div>
        </div>
        <div class="preview-grid-container">
          <table class="preview-grid" role="grid">
            <thead>
              <tr>
                <th scope="col" class="select-col">
                  <input type="checkbox" class="select-all-checkbox" ${this.selection.allSelected && this.selection.excluded.size === 0 ? "checked" : ""} />
                </th>
                <th scope="col">${b(e.resource)}</th>
                <th scope="col">${b(e.field)}</th>
                <th scope="col">${b(e.status)}</th>
                <th scope="col">${b(e.translatedText)}</th>
                <th scope="col">${b(e.conflictResolution)}</th>
              </tr>
            </thead>
            <tbody>
              ${this.previewRows.map((n) => this.renderPreviewRow(n)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  renderPreviewRow(e) {
    this.config.labels;
    const t = it(e.status, "exchange"), r = e.status === "error", n = H(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${r ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${b(e.resource)}</span>
          <span class="entity-id">${b(e.entityId)}</span>
        </td>
        <td class="field-cell">${b(e.fieldPath)}</td>
        <td class="status-cell">
          ${n}
          ${e.error ? `<span class="error-message" title="${re(e.error)}">${b(hi(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${re(e.targetLocale)}">${b(e.targetLocale)}</span>
        </td>
        <td class="resolution-cell">
          ${e.status === "conflict" ? this.renderConflictResolution(e) : "-"}
        </td>
      </tr>
    `;
  }
  renderConflictResolution(e) {
    const t = this.config.labels, r = e.resolution || "skip";
    return `
      <select class="resolution-select" data-index="${e.index}">
        <option value="skip" ${r === "skip" ? "selected" : ""}>${b(t.skip)}</option>
        <option value="keep_current" ${r === "keep_current" ? "selected" : ""}>${b(t.keepCurrent)}</option>
        <option value="accept_incoming" ${r === "accept_incoming" ? "selected" : ""}>${b(t.acceptIncoming)}</option>
        <option value="force" ${r === "force" ? "selected" : ""}>${b(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${re(t.conflictDetails)}">?</button>` : ""}
    `;
  }
  renderApplyResult() {
    return this.config.labels, `
      <div class="import-applied">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-green-500">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
        </svg>
        <p class="applied-message">Import completed successfully</p>
        <button type="button" class="reset-btn">Import Another</button>
      </div>
    `;
  }
  renderError() {
    const e = this.config.labels;
    return `
      <div class="import-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10 text-red-500">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <p class="error-message">${b(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${b(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, r = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${b(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${b(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !r.enabled ? "disabled" : ""}
                  ${r.enabled ? "" : `aria-disabled="true" title="${re(r.reason || e.applyDisabledReason)}"`}>
            ${b(e.applyButton)}
          </button>
        ` : ""}
      </div>
    `;
  }
  getApplyGate() {
    return this.config.capabilityGate ? this.config.capabilityGate.gateAction("exchange", "import.apply") : {
      visible: !0,
      enabled: !0
    };
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".file-input")?.addEventListener("change", (e) => {
      const t = e.target;
      t.files?.[0] && this.setFile(t.files[0]);
    }), this.container.querySelector(".data-input")?.addEventListener("input", (e) => {
      this.rawData = e.target.value;
    }), this.container.querySelector(".validate-btn")?.addEventListener("click", () => this.validate()), this.container.querySelector(".apply-btn")?.addEventListener("click", () => this.apply()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".reset-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".select-all-btn")?.addEventListener("click", () => this.selectAll()), this.container.querySelector(".deselect-all-btn")?.addEventListener("click", () => this.deselectAll()), this.container.querySelector(".select-all-checkbox")?.addEventListener("change", (e) => {
      e.target.checked ? this.selectAll() : this.deselectAll();
    }), this.container.querySelectorAll(".row-checkbox").forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.closest(".preview-row"), r = parseInt(t?.dataset.index || "", 10);
        isNaN(r) || this.toggleRowSelection(r);
      });
    }), this.container.querySelectorAll(".resolution-select").forEach((e) => {
      e.addEventListener("change", () => {
        const t = parseInt(e.dataset.index || "", 10);
        isNaN(t) || this.setRowResolution(t, e.value);
      });
    }), this.container.querySelectorAll(".option-checkbox input").forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.name;
        t && this.setApplyOption(t, e.checked);
      });
    }));
  }
};
function b(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function re(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function hi(e, t) {
  return e.length <= t ? e : e.slice(0, t - 3) + "...";
}
function Fl() {
  return `
    /* Exchange Import Styles */
    .exchange-import {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-height: 80vh;
      overflow: hidden;
    }

    .import-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .import-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .import-summary-badges {
      display: flex;
      gap: 0.5rem;
    }

    .summary-badge {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .summary-badge.success { background: #d1fae5; color: #059669; }
    .summary-badge.error { background: #fee2e2; color: #dc2626; }
    .summary-badge.conflict { background: #fef3c7; color: #d97706; }
    .summary-badge.skipped { background: #f3f4f6; color: #6b7280; }

    /* File Input */
    .import-file-input {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .file-dropzone {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }

    .file-dropzone:hover {
      border-color: #2563eb;
      background: #eff6ff;
    }

    .file-input {
      display: none;
    }

    .dropzone-text {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .or-divider {
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .data-input {
      width: 100%;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      resize: vertical;
    }

    /* Loading */
    .import-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Preview Grid */
    .import-preview {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      overflow: hidden;
    }

    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .selection-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .selection-count {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .import-options {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .option-checkbox {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: #374151;
      cursor: pointer;
    }

    .preview-grid-container {
      flex: 1;
      overflow: auto;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }

    .preview-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .preview-grid th {
      position: sticky;
      top: 0;
      background: #f9fafb;
      padding: 0.75rem 0.5rem;
      text-align: left;
      font-weight: 500;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }

    .preview-grid td {
      padding: 0.5rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .preview-row.selected {
      background: #eff6ff;
    }

    .preview-row.status-error {
      opacity: 0.6;
    }

    .select-col {
      width: 40px;
      text-align: center;
    }

    .resource-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .resource-type {
      font-weight: 500;
      color: #1f2937;
    }

    .entity-id {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
    }

    .status-badge.status-success { background: #d1fae5; color: #059669; }
    .status-badge.status-error { background: #fee2e2; color: #dc2626; }
    .status-badge.status-conflict { background: #fef3c7; color: #d97706; }
    .status-badge.status-skipped { background: #f3f4f6; color: #6b7280; }

    .error-message {
      display: block;
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 0.125rem;
    }

    .resolution-select {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
    }

    .conflict-details-btn {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      background: white;
      cursor: pointer;
      margin-left: 0.25rem;
    }

    /* Applied / Error states */
    .import-applied,
    .import-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .applied-message,
    .error-message {
      font-weight: 500;
      margin: 1rem 0;
    }

    .import-applied .applied-message { color: #059669; }
    .import-error .error-message { color: #dc2626; }

    /* Footer */
    .import-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .cancel-btn,
    .validate-btn,
    .apply-btn,
    .reset-btn,
    .select-all-btn,
    .deselect-all-btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cancel-btn,
    .reset-btn,
    .select-all-btn,
    .deselect-all-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-btn:hover,
    .reset-btn:hover,
    .select-all-btn:hover,
    .deselect-all-btn:hover {
      background: #f3f4f6;
    }

    .validate-btn,
    .apply-btn {
      background: #2563eb;
      border: none;
      color: white;
    }

    .validate-btn:hover,
    .apply-btn:hover {
      background: #1d4ed8;
    }

    .validate-btn:disabled,
    .apply-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .apply-btn[aria-disabled="true"] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
}
function fi(e, t) {
  const r = new pi(t);
  return r.mount(e), r;
}
function ql(e) {
  const t = e.dataset.validateEndpoint, r = e.dataset.applyEndpoint;
  return !t || !r ? (console.warn("ExchangeImport: Missing required data attributes"), null) : fi(e, {
    validateEndpoint: t,
    applyEndpoint: r
  });
}
var mi = {
  title: "Job Progress",
  running: "In Progress",
  completed: "Completed",
  failed: "Failed",
  processed: "Processed",
  succeeded: "Succeeded",
  failedCount: "Failed",
  resume: "Resume",
  cancel: "Cancel",
  retry: "Retry",
  dismiss: "Dismiss",
  noActiveJob: "No active job",
  pollingPaused: "Polling paused",
  pollingStopped: "Polling stopped",
  jobId: "Job ID",
  startedAt: "Started",
  elapsed: "Elapsed",
  conflicts: "Conflicts"
}, gi = 2e3, bi = 300, yi = "async_job_", Jt = class {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = {
      ...mi,
      ...e.labels || {}
    };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || yi,
      pollInterval: e.pollInterval || gi,
      maxPollAttempts: e.maxPollAttempts || bi,
      onComplete: e.onComplete,
      onFailed: e.onFailed,
      onError: e.onError,
      onProgress: e.onProgress,
      labels: t,
      autoStart: e.autoStart !== !1
    };
  }
  mount(e) {
    this.container = e, this.render();
  }
  unmount() {
    this.stopPolling(), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getJob() {
    return this.job;
  }
  getPollingState() {
    return this.pollingState;
  }
  setJob(e) {
    this.job = e, this.startTime = /* @__PURE__ */ new Date(), this.pollAttempts = 0, this.error = null, this.persistJob(e), this.config.autoStart && e.status === "running" ? this.startPolling() : this.render();
  }
  startFromEnvelope(e) {
    this.setJob(e);
  }
  resumeFromStorage(e) {
    const t = this.loadPersistedJob(e);
    return t ? (this.job = {
      id: t.jobId,
      kind: t.kind,
      status: "running",
      poll_endpoint: t.pollEndpoint,
      progress: {
        processed: 0,
        succeeded: 0,
        failed: 0
      },
      created_at: t.startedAt,
      updated_at: t.lastPolledAt || t.startedAt
    }, this.startTime = new Date(t.startedAt), this.pollAttempts = 0, this.error = null, this.config.autoStart && this.startPolling(), !0) : !1;
  }
  hasPersistedJob(e) {
    return this.loadPersistedJob(e) !== null;
  }
  startPolling() {
    this.job && this.pollingState !== "polling" && (this.pollingState = "polling", this.error = null, this.schedulePoll(), this.render());
  }
  pausePolling() {
    this.pollingState === "polling" && (this.pollingState = "paused", this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.render());
  }
  stopPolling() {
    this.pollingState = "stopped", this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.clearPersistedJob(this.job?.kind || ""), this.render();
  }
  resumePolling() {
    this.pollingState === "paused" && (this.pollingState = "polling", this.schedulePoll(), this.render());
  }
  reset() {
    this.stopPolling(), this.job = null, this.pollingState = "idle", this.pollAttempts = 0, this.startTime = null, this.error = null, this.render();
  }
  retry() {
    this.job && (this.pollAttempts = 0, this.error = null, this.startPolling());
  }
  schedulePoll() {
    this.pollingState === "polling" && (this.pollTimer = setTimeout(() => {
      this.poll();
    }, this.config.pollInterval));
  }
  async poll() {
    if (!(!this.job || this.pollingState !== "polling")) {
      this.pollAttempts++;
      try {
        const e = await fetch(this.job.poll_endpoint, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!e.ok) throw new Error(`Poll failed: ${e.status}`);
        const t = await e.json();
        this.handlePollResponse(t);
      } catch (e) {
        this.handlePollError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }
  handlePollResponse(e) {
    if (this.job = e, this.updatePersistedJob(e), this.config.onProgress?.(e), e.status === "completed") {
      this.pollingState = "stopped", this.clearPersistedJob(e.kind), this.config.onComplete?.(e), this.render();
      return;
    }
    if (e.status === "failed") {
      this.pollingState = "stopped", this.clearPersistedJob(e.kind), this.config.onFailed?.(e), this.render();
      return;
    }
    if (this.pollAttempts >= this.config.maxPollAttempts) {
      this.error = /* @__PURE__ */ new Error("Max polling attempts reached"), this.pollingState = "stopped", this.config.onError?.(this.error), this.render();
      return;
    }
    this.render(), this.schedulePoll();
  }
  handlePollError(e) {
    this.error = e, this.pollingState = "paused", this.config.onError?.(e), this.render();
  }
  getStorageKey(e) {
    return `${this.config.storageKeyPrefix}${e}`;
  }
  persistJob(e) {
    try {
      const t = {
        jobId: e.id,
        kind: e.kind,
        pollEndpoint: e.poll_endpoint,
        startedAt: e.created_at
      };
      localStorage.setItem(this.getStorageKey(e.kind), JSON.stringify(t));
    } catch {
    }
  }
  updatePersistedJob(e) {
    try {
      const t = this.getStorageKey(e.kind), r = localStorage.getItem(t);
      if (r) {
        const n = JSON.parse(r);
        n.lastPolledAt = (/* @__PURE__ */ new Date()).toISOString(), localStorage.setItem(t, JSON.stringify(n));
      }
    } catch {
    }
  }
  clearPersistedJob(e) {
    try {
      localStorage.removeItem(this.getStorageKey(e));
    } catch {
    }
  }
  loadPersistedJob(e) {
    try {
      const t = localStorage.getItem(this.getStorageKey(e));
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="async-progress" role="region" aria-label="${S(e.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    if (!this.job) return `
        <div class="progress-header idle">
          <h4 class="progress-title">${S(e.title)}</h4>
          <span class="progress-status">${S(e.noActiveJob)}</span>
        </div>
      `;
    const t = it(this.job.status, "exchange"), r = this.getStatusLabel(), n = this.pollingState === "paused" ? `<span class="progress-status ${t}">${S(r)}</span>` : H(this.job.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${S(e.title)}</h4>
        ${n}
      </div>
    `;
  }
  renderContent() {
    if (!this.job) return "";
    const e = this.config.labels, t = this.job.progress;
    t.total || t.processed + 1;
    const r = t.total ? Math.round(t.processed / t.total * 100) : null;
    return `
      <div class="progress-content">
        ${this.renderProgressBar(r)}
        <div class="progress-counters">
          <span class="counter processed">
            <span class="counter-label">${S(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${S(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${S(e.failedCount)}:</span>
            <span class="counter-value">${t.failed}</span>
          </span>
        </div>
        ${this.renderJobInfo()}
        ${this.renderConflictSummary()}
        ${this.renderError()}
      </div>
    `;
  }
  renderProgressBar(e) {
    return e === null ? `
        <div class="progress-bar-container">
          <div class="progress-bar indeterminate" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      ` : `
      <div class="progress-bar-container">
        <div class="progress-bar"
             role="progressbar"
             aria-valuenow="${e}"
             aria-valuemin="0"
             aria-valuemax="100"
             style="width: ${e}%">
        </div>
        <span class="progress-percentage">${e}%</span>
      </div>
    `;
  }
  renderJobInfo() {
    if (!this.job) return "";
    const e = this.config.labels, t = this.getElapsedTime();
    return `
      <div class="progress-info">
        <span class="info-item">
          <span class="info-label">${S(e.jobId)}:</span>
          <code class="info-value">${S(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${S(e.elapsed)}:</span>
            <span class="info-value">${S(t)}</span>
          </span>
        ` : ""}
      </div>
    `;
  }
  renderConflictSummary() {
    if (!this.job?.conflict_summary || this.job.conflict_summary.total === 0) return "";
    const e = this.config.labels, t = this.job.conflict_summary;
    return `
      <div class="progress-conflicts">
        <span class="conflicts-header">
          <span class="conflicts-label">${S(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([r, n]) => `
              <span class="conflict-type">
                <span class="type-name">${S(r)}:</span>
                <span class="type-count">${n}</span>
              </span>
            `).join("")}
        </div>
      </div>
    `;
  }
  renderError() {
    const e = this.error?.message || this.job?.error;
    return e ? `
      <div class="progress-error" role="alert">
        <span class="error-message">${S(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${S(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${S(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${S(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${S(e.dismiss)}</button>`), t.length === 0 ? "" : `
      <div class="progress-footer">
        ${t.join("")}
      </div>
    `;
  }
  getStatusLabel() {
    const e = this.config.labels;
    if (this.pollingState === "paused") return e.pollingPaused;
    if (this.pollingState === "stopped" && !this.job?.status) return e.pollingStopped;
    switch (this.job?.status) {
      case "running":
        return e.running;
      case "completed":
        return e.completed;
      case "failed":
        return e.failed;
      default:
        return "";
    }
  }
  getElapsedTime() {
    if (!this.startTime) return null;
    const e = (/* @__PURE__ */ new Date()).getTime() - this.startTime.getTime(), t = Math.floor(e / 1e3);
    if (t < 60) return `${t}s`;
    const r = Math.floor(t / 60), n = t % 60;
    return r < 60 ? `${r}m ${n}s` : `${Math.floor(r / 60)}h ${r % 60}m`;
  }
  attachEventListeners() {
    this.container && (this.container.querySelector(".resume-btn")?.addEventListener("click", () => this.resumePolling()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.stopPolling()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.retry()), this.container.querySelector(".dismiss-btn")?.addEventListener("click", () => this.reset()));
  }
};
function S(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Ol() {
  return `
    /* Async Progress Styles */
    .async-progress {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .progress-status {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .progress-status.status-running {
      background: #dbeafe;
      color: #2563eb;
    }

    .progress-status.status-completed {
      background: #d1fae5;
      color: #059669;
    }

    .progress-status.status-failed {
      background: #fee2e2;
      color: #dc2626;
    }

    .progress-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Progress Bar */
    .progress-bar-container {
      position: relative;
      height: 8px;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #2563eb;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .progress-bar.indeterminate {
      width: 30%;
      animation: progress-indeterminate 1.5s infinite ease-in-out;
    }

    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(200%); }
      100% { transform: translateX(-100%); }
    }

    .progress-percentage {
      position: absolute;
      right: 0;
      top: 12px;
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* Counters */
    .progress-counters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .counter {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .counter-label {
      color: #6b7280;
    }

    .counter-value {
      font-weight: 500;
      color: #1f2937;
    }

    .counter.succeeded .counter-value {
      color: #059669;
    }

    .counter.failed .counter-value {
      color: #dc2626;
    }

    /* Job Info */
    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3f4f6;
    }

    .info-item {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
    }

    .info-label {
      color: #9ca3af;
    }

    .info-value {
      color: #6b7280;
    }

    .info-value code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
    }

    /* Conflicts */
    .progress-conflicts {
      padding: 0.5rem;
      background: #fef3c7;
      border-radius: 0.375rem;
    }

    .conflicts-header {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #92400e;
    }

    .conflicts-by-type {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .conflict-type {
      font-size: 0.75rem;
      color: #b45309;
    }

    /* Error */
    .progress-error {
      padding: 0.5rem;
      background: #fee2e2;
      border-radius: 0.375rem;
    }

    .progress-error .error-message {
      font-size: 0.875rem;
      color: #dc2626;
    }

    /* Footer */
    .progress-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .resume-btn,
    .cancel-btn,
    .retry-btn,
    .dismiss-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .resume-btn,
    .retry-btn {
      background: #2563eb;
      border: none;
      color: white;
    }

    .resume-btn:hover,
    .retry-btn:hover {
      background: #1d4ed8;
    }

    .cancel-btn,
    .dismiss-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-btn:hover,
    .dismiss-btn:hover {
      background: #f3f4f6;
    }
  `;
}
function vi(e, t) {
  const r = new Jt(t);
  return r.mount(e), r;
}
function jl(e) {
  return vi(e, {
    pollInterval: e.dataset.pollInterval ? parseInt(e.dataset.pollInterval, 10) : void 0,
    autoStart: e.dataset.autoStart !== "false"
  });
}
function zl(e, t) {
  const r = new Jt(t);
  return r.hasPersistedJob(e) ? r : null;
}
var ye = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function wi(e) {
  const t = {
    sourceHash: null,
    sourceVersion: null,
    changedFieldsSummary: {
      count: 0,
      fields: []
    },
    hasDrift: !1
  };
  if (!e || typeof e != "object") return t;
  const r = e.source_target_drift;
  if (r && typeof r == "object") {
    t.sourceHash = typeof r.source_hash == "string" ? r.source_hash : null, t.sourceVersion = typeof r.source_version == "string" ? r.source_version : null;
    const n = r.changed_fields_summary;
    n && typeof n == "object" && (t.changedFieldsSummary.count = typeof n.count == "number" ? n.count : 0, t.changedFieldsSummary.fields = Array.isArray(n.fields) ? n.fields.filter((s) => typeof s == "string") : []), t.hasDrift = t.changedFieldsSummary.count > 0 || t.changedFieldsSummary.fields.length > 0;
  }
  return t;
}
function xi(e, t) {
  return !e || !e.hasDrift ? !1 : e.changedFieldsSummary.fields.some((r) => r.toLowerCase() === t.toLowerCase());
}
function Nl(e) {
  return !e || !e.hasDrift ? [] : [...e.changedFieldsSummary.fields];
}
var Si = class {
  constructor(e) {
    this.container = null, this.driftAcknowledged = !1;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      fields: e.fields,
      drift: e.drift,
      sourceLocale: e.sourceLocale,
      targetLocale: e.targetLocale,
      panelName: e.panelName,
      recordId: e.recordId,
      basePath: e.basePath || "/admin",
      onChange: e.onChange,
      onDriftAcknowledge: e.onDriftAcknowledge,
      onCopySource: e.onCopySource,
      labels: {
        ...ye,
        ...e.labels
      }
    }, this.container = t;
  }
  render() {
    if (!this.container) {
      console.warn("[SideBySideEditor] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML(), this.attachEventListeners();
  }
  buildHTML() {
    const { drift: e, labels: t, sourceLocale: r, targetLocale: n, fields: s } = this.config, a = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", i = s.map((o) => this.renderFieldRow(o, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${r}" data-target-locale="${n}">
        ${a}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${L(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${r.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${L(t.targetColumn)}</span>
              <span class="sbs-locale-badge">${n.toUpperCase()}</span>
            </div>
          </div>
          <div class="sbs-fields">
            ${i}
          </div>
        </div>
      </div>
    `;
  }
  renderDriftBanner(e, t) {
    const r = {
      ...ye,
      ...t
    }, n = e.changedFieldsSummary.count, s = e.changedFieldsSummary.fields, a = s.length > 0 ? `<ul class="sbs-drift-fields-list">${s.map((i) => `<li>${L(i)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${L(r.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${L(r.driftBannerDescription)}
            ${n > 0 ? `<span class="sbs-drift-count">${n} field${n !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${a}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${L(r.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  renderFieldRow(e, t) {
    const r = {
      ...ye,
      ...t
    }, n = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${L(r.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", s = this.renderSourceField(e), a = this.renderTargetField(e), i = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${C(e.key)}"
              title="${C(r.copySourceButton)}"
              aria-label="${C(r.copySourceButton)} for ${C(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${C(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${L(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${n}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${s}
          </div>
          <div class="sbs-field-actions">
            ${i}
          </div>
          <div class="sbs-target-field">
            ${a}
          </div>
        </div>
      </div>
    `;
  }
  renderSourceField(e) {
    const t = L(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${C(e.key)}"
             aria-label="Source: ${C(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${C(e.key)}"
           aria-label="Source: ${C(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  renderTargetField(e) {
    const t = L(e.targetValue || ""), r = e.placeholder ? `placeholder="${C(e.placeholder)}"` : "", n = e.required ? "required" : "", s = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${C(e.key)}"
                  data-field="${C(e.key)}"
                  aria-label="Translation: ${C(e.label)}"
                  ${r}
                  ${n}
                  ${s}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${C(e.key)}"
             data-field="${C(e.key)}"
             value="${t}"
             aria-label="Translation: ${C(e.label)}"
             ${r}
             ${n}
             ${s}>
    `;
  }
  shouldShowDriftBanner() {
    return !this.driftAcknowledged && this.config.drift !== null && this.config.drift.hasDrift;
  }
  attachEventListeners() {
    if (!this.container) return;
    const e = this.container.querySelector('[data-action="acknowledge-drift"]');
    e && e.addEventListener("click", () => this.acknowledgeDrift()), this.container.querySelectorAll('[data-action="copy-source"]').forEach((t) => {
      t.addEventListener("click", (r) => {
        const n = r.currentTarget.dataset.field;
        n && this.copySourceToTarget(n);
      });
    }), this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      t.addEventListener("input", (r) => {
        const n = r.target, s = n.dataset.field;
        s && this.config.onChange && this.config.onChange(s, n.value);
      });
    });
  }
  acknowledgeDrift() {
    this.driftAcknowledged = !0;
    const e = this.container?.querySelector("[data-drift-banner]");
    e && (e.classList.add("sbs-drift-acknowledged"), setTimeout(() => e.remove(), 300)), this.config.onDriftAcknowledge && this.config.onDriftAcknowledge();
  }
  copySourceToTarget(e) {
    const t = this.config.fields.find((n) => n.key === e);
    if (!t) return;
    const r = this.container?.querySelector(`.sbs-target-input[data-field="${e}"]`);
    if (r) {
      r.value = t.sourceValue || "";
      const n = new Event("input", { bubbles: !0 });
      r.dispatchEvent(n);
    }
    this.config.onCopySource && this.config.onCopySource(e);
  }
  getValues() {
    const e = {};
    return this.container && this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      const r = t.dataset.field;
      r && (e[r] = t.value);
    }), e;
  }
  setValue(e, t) {
    const r = this.container?.querySelector(`.sbs-target-input[data-field="${e}"]`);
    r && (r.value = t);
  }
  setFields(e) {
    this.config.fields = e, this.render();
  }
  setDrift(e) {
    this.config.drift = e, this.driftAcknowledged = !1, this.render();
  }
  isDriftAcknowledged() {
    return this.driftAcknowledged;
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
};
function $i(e) {
  const t = new Si(e);
  return t.render(), t;
}
function Gl(e, t, r, n, s) {
  const a = wi(t);
  return $i({
    container: e,
    fields: n.map((i) => ({
      key: i,
      label: i.replace(/_/g, " ").replace(/\b\w/g, (o) => o.toUpperCase()),
      type: "text",
      hasSourceChanged: xi(a, i),
      sourceValue: String(r[i] || ""),
      targetValue: String(t[i] || ""),
      sourceLocale: s.sourceLocale || "en",
      targetLocale: s.targetLocale || ""
    })),
    drift: a,
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || "",
    panelName: s.panelName || "",
    recordId: s.recordId || "",
    ...s
  });
}
function Hl() {
  return `
    /* Side-by-Side Editor Styles */
    .side-by-side-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }

    /* Drift Banner */
    .sbs-drift-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 0.5rem;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .sbs-drift-banner.sbs-drift-acknowledged {
      opacity: 0;
      transform: translateY(-0.5rem);
    }

    .sbs-drift-icon {
      flex-shrink: 0;
      color: #d97706;
    }

    .sbs-drift-content {
      flex: 1;
    }

    .sbs-drift-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 0.25rem 0;
    }

    .sbs-drift-description {
      font-size: 0.875rem;
      color: #b45309;
      margin: 0;
    }

    .sbs-drift-count {
      font-weight: 500;
    }

    .sbs-drift-fields-list {
      margin: 0.5rem 0 0 0;
      padding-left: 1.25rem;
      font-size: 0.75rem;
      color: #92400e;
    }

    .sbs-drift-actions {
      flex-shrink: 0;
    }

    .sbs-drift-acknowledge {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #92400e;
      background-color: white;
      border: 1px solid #fcd34d;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .sbs-drift-acknowledge:hover {
      background-color: #fef3c7;
    }

    /* Columns Layout */
    .sbs-columns {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .sbs-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-column-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
    }

    .sbs-source-header {
      border-right: 1px solid #e5e7eb;
    }

    .sbs-target-header {
      padding-left: calc(1rem + 2.5rem); /* Account for copy button column */
    }

    .sbs-column-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sbs-locale-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      background-color: #e5e7eb;
      color: #4b5563;
      border-radius: 0.25rem;
    }

    /* Fields */
    .sbs-fields {
      display: flex;
      flex-direction: column;
    }

    .sbs-field-row {
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-field-row:last-child {
      border-bottom: none;
    }

    .sbs-field-row.sbs-field-changed-row {
      background-color: #fffbeb;
    }

    .sbs-field-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .sbs-required {
      color: #dc2626;
    }

    .sbs-field-changed {
      display: flex;
      align-items: center;
    }

    .sbs-field-content {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      min-height: 5rem;
    }

    .sbs-source-field,
    .sbs-target-field {
      padding: 0.75rem 1rem;
    }

    .sbs-source-field {
      background-color: #f9fafb;
      border-right: 1px solid #e5e7eb;
    }

    .sbs-source-content {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .sbs-empty {
      font-style: italic;
      color: #9ca3af;
    }

    .sbs-field-actions {
      display: flex;
      align-items: flex-start;
      padding: 0.75rem 0.5rem;
      background-color: #f3f4f6;
      border-right: 1px solid #e5e7eb;
    }

    .sbs-copy-source {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      color: #6b7280;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sbs-copy-source:hover {
      color: #3b82f6;
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .sbs-target-input {
      width: 100%;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #111827;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      padding: 0.5rem 0.75rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .sbs-target-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .sbs-textarea-input {
      min-height: 6rem;
      resize: vertical;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sbs-header {
        display: none;
      }

      .sbs-field-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .sbs-source-field,
      .sbs-field-actions,
      .sbs-target-field {
        border: none;
        padding: 0.5rem 1rem;
      }

      .sbs-source-field {
        background-color: #f9fafb;
        border-radius: 0.375rem;
      }

      .sbs-source-field::before {
        content: 'Source';
        display: block;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .sbs-target-field::before {
        content: 'Translation';
        display: block;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .sbs-field-actions {
        background: transparent;
        padding: 0 1rem;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .sbs-drift-banner {
        background-color: #451a03;
        border-color: #92400e;
      }

      .sbs-drift-title {
        color: #fcd34d;
      }

      .sbs-drift-description {
        color: #fbbf24;
      }

      .sbs-drift-acknowledge {
        background-color: #1f2937;
        border-color: #92400e;
        color: #fcd34d;
      }

      .sbs-columns {
        border-color: #374151;
      }

      .sbs-header,
      .sbs-field-header,
      .sbs-source-field {
        background-color: #1f2937;
      }

      .sbs-column-title,
      .sbs-field-label {
        color: #e5e7eb;
      }

      .sbs-locale-badge {
        background-color: #374151;
        color: #d1d5db;
      }

      .sbs-source-content {
        color: #9ca3af;
      }

      .sbs-field-actions {
        background-color: #111827;
      }

      .sbs-copy-source {
        background-color: #1f2937;
        border-color: #4b5563;
        color: #9ca3af;
      }

      .sbs-target-input {
        background-color: #1f2937;
        border-color: #4b5563;
        color: #f3f4f6;
      }

      .sbs-field-row.sbs-field-changed-row {
        background-color: #451a03;
      }
    }
  `;
}
function L(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function C(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export {
  dr as ActionRenderer,
  Bo as AdvancedSearch,
  Jt as AsyncProgress,
  Nt as AutosaveIndicator,
  ro as CORE_READINESS_DISPLAY,
  Vt as CapabilityGate,
  Rr as CellRendererRegistry,
  Ua as CharacterCounter,
  os as ColumnManager,
  Ao as CommonRenderers,
  ti as DEFAULT_FILTER_PRESETS,
  Ut as DEFAULT_INTERPOLATION_PATTERNS,
  Ha as DEFAULT_SAMPLE_VALUES,
  ye as DEFAULT_SIDE_BY_SIDE_LABELS,
  ya as DEFAULT_STATUS_LEGEND_ITEMS,
  Tt as DEFAULT_TRANSLATION_QUICK_FILTERS,
  Wi as DISABLED_REASON_DISPLAY,
  Rt as DataGrid,
  oa as DefaultColumnVisibilityBehavior,
  ga as DetailActionsController,
  Ka as DirectionToggle,
  eo as EXCHANGE_JOB_STATUS_DISPLAY,
  Ji as EXCHANGE_ROW_STATUS_DISPLAY,
  pi as ExchangeImport,
  Be as FallbackBanner,
  Fo as FilterBuilder,
  Go as GoCrudBulkActionBehavior,
  No as GoCrudExportBehavior,
  Oo as GoCrudFilterBehavior,
  jo as GoCrudPaginationBehavior,
  qo as GoCrudSearchBehavior,
  zo as GoCrudSortBehavior,
  Ft as InlineLocaleChips,
  Va as InterpolationPreview,
  Ot as KeyboardShortcutRegistry,
  ft as LocalDataGridStateStore,
  de as LocaleActionChip,
  la as PayloadInputModal,
  Or as PreferencesDataGridStateStore,
  Ni as QUEUE_CONTENT_STATE_DISPLAY,
  Xi as QUEUE_DUE_STATE_DISPLAY,
  to as QUEUE_STATE_DISPLAY,
  wa as QuickFilters,
  It as SchemaActionBuilder,
  Ho as ServerColumnVisibilityBehavior,
  Si as SideBySideEditor,
  Mt as StatusLegend,
  ba as TranslationBlockerModal,
  Sa as TranslationPanel,
  ri as TranslatorDashboard,
  Ea as applyFormLock,
  Za as applyGateToElement,
  qa as applyShortcutSettings,
  Qe as buildLocaleEditUrl,
  Uo as buildSchemaRowActions,
  zl as checkForPersistedJob,
  Ro as collapseAllGroups,
  vi as createAsyncProgress,
  rl as createBulkCreateMissingHandler,
  We as createCapabilityGate,
  jr as createDataGridStateStore,
  Dl as createEmptyCapabilityGate,
  fi as createExchangeImport,
  hl as createInlineLocaleChipsRenderer,
  yr as createLocaleBadgeRenderer,
  Hi as createReasonCodeCellRenderer,
  $i as createSideBySideEditor,
  Qi as createStatusCellRenderer,
  va as createStatusLegend,
  vl as createTranslationAutosave,
  Co as createTranslationMatrixRenderer,
  Zo as createTranslationPanel,
  xa as createTranslationQuickFilters,
  Pa as createTranslationShortcuts,
  je as createTranslationStatusRenderer,
  oi as createTranslatorDashboard,
  rn as decodeExpandedGroupsToken,
  El as detectInterpolations,
  Ba as dismissShortcutHint,
  Po as encodeExpandedGroupsToken,
  $a as executeBulkCreateMissing,
  _o as expandAllGroups,
  Qr as extractBackendSummaries,
  Qa as extractCapabilities,
  Li as extractExchangeError,
  Vo as extractSchemaActions,
  wi as extractSourceTargetDrift,
  P as extractTranslationContext,
  A as extractTranslationReadiness,
  qt as formatShortcutDisplay,
  _i as generateExchangeReport,
  ot as getActionBlockDisplay,
  Ui as getAllReasonCodes,
  Ol as getAsyncProgressStyles,
  xl as getAutosaveIndicatorStyles,
  Pl as getCapabilityGateStyles,
  Nl as getChangedFields,
  Ll as getCharCountSeverity,
  bl as getDefaultShortcutRegistry,
  Vi as getDisabledReasonDisplay,
  Fl as getExchangeImportStyles,
  Do as getExpandedGroupIds,
  Al as getFieldHelperStyles,
  il as getFormLockReason,
  _ as getLocaleLabel,
  $o as getMissingTranslationsCount,
  Da as getModifierSymbol,
  Wr as getPersistedExpandState,
  tn as getPersistedViewMode,
  Ra as getPrimaryModifierLabel,
  Zi as getSeverityCssClass,
  Hl as getSideBySideEditorStyles,
  it as getStatusCssClass,
  st as getStatusDisplay,
  Ki as getStatusVocabularyStyles,
  zi as getStatusesForDomain,
  Tl as getTranslatorDashboardStyles,
  De as getViewModeForViewport,
  Ri as groupRowResultsByStatus,
  ss as handleDelete,
  mt as hasBackendGroupedRows,
  xi as hasFieldDrift,
  So as hasMissingTranslations,
  co as hasTranslationContext,
  mo as hasTranslationReadiness,
  jl as initAsyncProgress,
  Ml as initCapabilityGating,
  ql as initExchangeImport,
  cl as initFallbackBanner,
  $l as initFieldHelpers,
  Sl as initFormAutosave,
  dl as initFormLock,
  pl as initInlineLocaleChips,
  Oa as initKeyboardShortcuts,
  yl as initKeyboardShortcutsWithDiscovery,
  sl as initLocaleActionChips,
  Ko as initPanelDetailActions,
  Wo as initQuickFilters,
  Gl as initSideBySideEditorFromRecord,
  Yo as initStatusLegends,
  Bl as initTranslatorDashboard,
  li as initTranslatorDashboardWithOptions,
  no as initializeVocabularyFromPayload,
  Rl as isCoreEnabled,
  Ja as isExchangeEnabled,
  Di as isExchangeError,
  al as isFormLocked,
  lo as isInFallbackMode,
  ue as isMacPlatform,
  dn as isNarrowViewport,
  Ya as isQueueEnabled,
  go as isReadyForTransition,
  Ta as isShortcutHintDismissed,
  so as isValidReasonCode,
  Gi as isValidStatus,
  Ma as loadShortcutSettings,
  Yr as mergeBackendSummaries,
  ji as normalizeActionBlockCode,
  Fi as normalizeActionState,
  Bi as normalizeActionStateMap,
  qi as normalizeActionStateMeta,
  Yi as normalizeActionStateRecord,
  Nr as normalizeBackendGroupedRows,
  tt as normalizeBulkActionStateConfig,
  at as normalizeBulkActionStateMap,
  tr as normalizeBulkActionStateResponse,
  nt as normalizeDetailActionStatePayload,
  rr as normalizeListActionStatePayload,
  _l as parseCapabilityMode,
  Ii as parseImportResult,
  kt as parseViewMode,
  Eo as persistExpandState,
  Io as persistViewMode,
  La as removeFormLock,
  wl as renderAutosaveIndicator,
  hr as renderAvailableLocalesIndicator,
  tl as renderBulkResultInline,
  el as renderBulkResultSummary,
  Cl as renderCharacterCounter,
  ma as renderDetailActions,
  kl as renderDirectionToggle,
  Wa as renderDisabledReasonBadge,
  Fa as renderDiscoveryHint,
  ol as renderFallbackBannerFromRecord,
  ko as renderFallbackWarning,
  Il as renderGateAriaAttributes,
  on as renderGroupHeaderRow,
  nn as renderGroupHeaderSummary,
  cn as renderGroupedEmptyState,
  To as renderGroupedErrorState,
  Mo as renderGroupedLoadingState,
  _a as renderInlineLocaleChips,
  Bt as renderLocaleActionChip,
  nl as renderLocaleActionList,
  pt as renderLocaleBadge,
  wo as renderLocaleCompleteness,
  xo as renderMissingTranslationsBadge,
  vo as renderPublishReadinessBadge,
  Xo as renderQuickFiltersHTML,
  yo as renderReadinessIndicator,
  sr as renderReasonCodeBadge,
  Oi as renderReasonCodeIndicator,
  gl as renderShortcutSettingsUI,
  fl as renderShortcutsHelpContent,
  bo as renderStatusBadge,
  Qo as renderStatusLegendHTML,
  ho as renderTranslationAssignmentSummary,
  fo as renderTranslationExchangeSummary,
  uo as renderTranslationFamilyLink,
  po as renderTranslationFamilyMemberCount,
  gr as renderTranslationMatrixCell,
  fr as renderTranslationStatusCell,
  H as renderVocabularyStatusBadge,
  nr as renderVocabularyStatusIcon,
  rt as resolveActionState,
  ml as saveShortcutSettings,
  ll as shouldShowFallbackBanner,
  ul as shouldShowInlineLocaleChips,
  Jo as showTranslationBlocker,
  Lo as toggleGroupExpand,
  zr as transformToGroups
};

//# sourceMappingURL=index.js.map
import { F as O } from "../chunks/toast-manager-BXE4J35T.js";
import { executeStructuredRequest as Ue, formatStructuredErrorForDisplay as q, createStructuredActionError as W, isHandledActionError as R, getStructuredActionError as F, extractErrorMessage as qt, executeActionRequest as ve, isTranslationBlocker as Ot, extractTranslationBlocker as jt } from "../toast/error-helpers.js";
import { extractExchangeError as nl, generateExchangeReport as sl, groupRowResultsByStatus as ol, isExchangeError as il, parseImportResult as al } from "../toast/error-helpers.js";
import { M as He, T as Re } from "../chunks/modal-8-n6PAK8.js";
import { escapeHTML as u, escapeAttribute as b } from "../shared/html.js";
import { b as X, a as zt } from "../chunks/badge-CH1Zu3Xp.js";
import { p as Z } from "../chunks/date-utils-Ch6PxlHn.js";
import { r as Nt } from "../chunks/icon-renderer-FL11lsYV.js";
import { g as Ve, r as j, a as Gt, n as Ut, b as Ke, c as Je, d as Ye, e as Ht, f as Qe, h as We, i as Vt, j as Xe } from "../chunks/translation-status-vocabulary-BA9o2n8M.js";
import { C as cl, D as dl, t as ul, E as pl, q as hl, s as fl, Q as ml, F as gl, B as bl, y as yl, u as vl, z as wl, H as xl, x as Sl, G as Cl, w as $l, v as kl, k as Al, l as El, m as Ll, p as _l, o as Rl, A as Il } from "../chunks/translation-status-vocabulary-BA9o2n8M.js";
import { h as $, r as Kt } from "../chunks/http-client-DZnuedzQ.js";
import { S as Jt } from "../chunks/sortable.esm-DOKudrbz.js";
import { e as Yt, E as Qt } from "../chunks/index-YiVxcMWC.js";
let Wt = class Ze extends He {
  constructor(e, t, n) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = n;
  }
  static prompt(e) {
    return new Promise((t) => {
      new Ze(
        e,
        (s) => t(s),
        () => t(null)
      ).show();
    });
  }
  renderContent() {
    const e = this.config.fields.map((t) => this.renderField(t)).join("");
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${u(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${u(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${u(this.config.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), n = () => {
      this.clearErrors();
      const s = {};
      let o = null;
      for (const i of this.config.fields) {
        const a = this.container?.querySelector(
          `[data-payload-field="${i.name}"]`
        );
        if (!a)
          continue;
        const l = a.value.trim();
        s[i.name] = l, l || (o || (o = a), this.showFieldError(i.name, "This field is required."));
      }
      if (o) {
        o.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(s), this.hide();
    };
    e?.addEventListener("submit", (s) => {
      s.preventDefault(), n();
    }), t?.addEventListener("click", () => {
      this.hide();
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${u(e.description)}</p>` : "", n = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${u(e.label)}
        </label>
        ${n}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, s = (e.options || []).map((o) => {
      const i = o.value === t ? " selected" : "";
      return `<option value="${u(o.value)}"${i}>${u(o.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${e.name}"
              data-payload-field="${e.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${s}
      </select>
    `;
  }
  renderInput(e) {
    const t = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300";
    if (e.type === "array" || e.type === "object")
      return `
        <textarea id="payload-field-${e.name}"
                  data-payload-field="${e.name}"
                  rows="4"
                  class="${t}"
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${u(e.value)}</textarea>
      `;
    const n = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${n}"
             data-payload-field="${e.name}"
             value="${u(e.value)}"
             class="${t}" />
    `;
  }
  clearErrors() {
    this.container?.querySelectorAll("[data-payload-error]")?.forEach((t) => {
      t.textContent = "", t.classList.add("hidden");
    });
  }
  showFieldError(e, t) {
    const n = this.container?.querySelector(`[data-payload-error="${e}"]`);
    n && (n.textContent = t, n.classList.remove("hidden"));
  }
};
class Xt {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new O(), this.actionKeys = /* @__PURE__ */ new WeakMap(), this.actionKeySeq = 0;
  }
  /**
   * Render row actions as HTML
   */
  renderRowActions(e, t) {
    if (this.mode === "dropdown")
      return this.renderRowActionsDropdown(e, t);
    const n = t.filter(
      (o) => !o.condition || o.condition(e)
    );
    return n.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${n.map((o) => {
      const i = this.getVariantClass(o.variant || "secondary"), a = o.icon ? this.renderIcon(o.icon) : "", l = o.className || "", c = o.disabled === !0, d = this.getActionKey(o), p = c ? "opacity-50 cursor-not-allowed" : "", h = c ? 'aria-disabled="true"' : "", f = c && o.disabledReason ? `${d}-disabled-reason` : "", m = f ? `aria-describedby="${f}"` : "", y = c && o.disabledReason ? `${o.label} unavailable: ${o.disabledReason}` : o.label, v = f ? `<span id="${f}" class="sr-only">${u(o.disabledReason || "Action unavailable")}</span>` : "", g = o.disabledReason ? `title="${u(o.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${i} ${l} ${p}"
          data-action-id="${this.sanitize(o.label)}"
          data-action-key="${d}"
          data-record-id="${e.id}"
          data-disabled="${c}"
          ${h}
          aria-label="${u(y)}"
          ${m}
          ${g}
        >
          ${a}
          ${this.sanitize(o.label)}
        </button>
        ${v}
      `;
    }).join("")}</div>`;
  }
  /**
   * Render row actions as dropdown menu
   */
  renderRowActionsDropdown(e, t) {
    const n = t.filter(
      (i) => !i.condition || i.condition(e)
    );
    if (n.length === 0)
      return '<div class="text-sm text-gray-400">No actions</div>';
    const s = `actions-menu-${e.id}`, o = this.buildDropdownItems(e, n);
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

        <div id="${s}"
             class="actions-menu hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
             role="menu"
             aria-orientation="vertical">
          ${o}
        </div>
      </div>
    `;
  }
  /**
   * Build dropdown menu items HTML
   */
  buildDropdownItems(e, t) {
    return t.map((n, s) => {
      const o = n.variant === "danger", i = n.disabled === !0, a = this.getActionKey(n), l = n.icon ? this.renderIcon(n.icon) : "", c = this.shouldShowDivider(n, s, t), d = i ? (n.disabledReason || "Action unavailable").trim() : "", p = d ? `${a}-disabled-reason` : "", h = c ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", f = i ? "action-item text-gray-400 cursor-not-allowed" : o ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", m = i ? 'aria-disabled="true"' : "", y = p ? `aria-describedby="${p}"` : "", v = d ? `${n.label} unavailable: ${d}` : n.label, g = n.disabledReason ? `title="${u(n.disabledReason)}"` : "", x = d ? `<span id="${p}" class="action-item-reason text-xs leading-5 text-gray-500">${u(d)}</span>` : "";
      return `
        ${h}
        <button type="button"
                class="${f} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(n.label)}"
                data-action-key="${a}"
                data-record-id="${e.id}"
                data-disabled="${i}"
                role="menuitem"
                ${m}
                aria-label="${u(v)}"
                ${y}
                ${g}>
          <span class="flex-shrink-0 w-5 h-5">${l}</span>
          <span class="flex min-w-0 flex-1 flex-col items-start">
            <span class="text-sm font-medium">${u(n.label)}</span>
            ${x}
          </span>
        </button>
      `;
    }).join("");
  }
  /**
   * Determine if divider should be shown before action
   */
  shouldShowDivider(e, t, n) {
    return t === 0 ? !1 : e.variant === "danger" ? !0 : ["download", "archive", "delete", "remove"].some(
      (o) => e.label.toLowerCase().includes(o)
    );
  }
  /**
   * Render three-dot vertical icon
   */
  renderDotsIcon() {
    return `
      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
    `;
  }
  /**
   * Render default actions (view, edit, delete)
   * NOTE: This method is deprecated - default actions are now handled in core.ts
   * Kept for backward compatibility
   */
  renderDefaultActions(e, t) {
    return '<div class="text-sm text-gray-400">Use core.ts for default actions</div>';
  }
  /**
   * Attach event listeners for row actions
   */
  attachRowActionListeners(e, t, n) {
    t.forEach((s) => {
      const o = this.getActionKey(s);
      e.querySelectorAll(
        `[data-action-key="${o}"]`
      ).forEach((a) => {
        const l = a, c = l.dataset.recordId, d = n[c];
        d && l.addEventListener("click", async (p) => {
          if (p.preventDefault(), !(l.getAttribute("aria-disabled") === "true" || l.dataset.disabled === "true"))
            try {
              await s.action(d);
            } catch (h) {
              console.error(`Action "${s.label}" failed:`, h);
              const f = h instanceof Error ? h.message : `Action "${s.label}" failed`;
              this.notifier.error(f);
            }
        });
      });
    });
  }
  /**
   * Render bulk actions toolbar
   */
  renderBulkActionsToolbar(e) {
    const t = document.createElement("div");
    t.id = "bulk-actions-bar", t.className = "hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4";
    const n = document.createElement("span");
    n.className = "text-sm font-medium text-blue-900", n.id = "selected-count", n.textContent = "0 items selected", t.appendChild(n);
    const s = document.createElement("div");
    s.className = "flex gap-2 flex-1", e.forEach((i) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = i.id, i.icon ? a.innerHTML = `${this.renderIcon(i.icon)} ${i.label}` : a.textContent = i.label, s.appendChild(a);
    }), t.appendChild(s);
    const o = document.createElement("button");
    return o.type = "button", o.className = "btn btn-sm btn-secondary", o.id = "clear-selection-btn", o.textContent = "Clear Selection", t.appendChild(o), t;
  }
  /**
   * Execute bulk action
   */
  async executeBulkAction(e, t) {
    if (e.guard && !e.guard(t)) {
      console.warn(`Bulk action "${e.id}" guard failed`);
      return;
    }
    if (e.confirm) {
      const s = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(s))
        return;
    }
    const n = await this.resolveBulkActionPayload(e, t);
    if (n !== null)
      try {
        const s = await Ue(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(n)
        }, async (i) => ({
          success: !0,
          data: await i.json().catch(() => {
          })
        }));
        if (!s.success) {
          const i = s.error, a = i ? q(i, `Bulk action '${e.id}' failed`) : `Bulk action '${e.id}' failed`;
          throw e.onError || this.notifier.error(a), i ? W(i, `Bulk action '${e.id}' failed`, !0) : W({
            textCode: null,
            message: a,
            metadata: null,
            fields: null,
            validationErrors: null
          }, `Bulk action '${e.id}' failed`, !0);
        }
        const o = s.data;
        this.notifier.success(this.buildBulkSuccessMessage(e, o, t.length)), e.onSuccess && e.onSuccess(o);
      } catch (s) {
        if (console.error(`Bulk action "${e.id}" failed:`, s), !e.onError && !R(s)) {
          const o = s instanceof Error ? s.message : "Bulk action failed";
          this.notifier.error(o);
        }
        throw e.onError && e.onError(s), s;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const n = {
      ...e.payload || {},
      ids: t
    }, s = this.normalizePayloadSchema(e.payloadSchema);
    s?.properties && Object.entries(s.properties).forEach(([l, c]) => {
      n[l] === void 0 && c && c.default !== void 0 && (n[l] = c.default);
    });
    const i = this.collectRequiredFields(e.payloadRequired, s).filter((l) => l !== "ids" && this.isEmptyPayloadValue(n[l]));
    if (i.length === 0)
      return n;
    const a = await this.requestRequiredFields(e, i, s, n);
    if (a === null)
      return null;
    for (const l of i) {
      const c = s?.properties?.[l], d = a[l] ?? "", p = this.coercePromptValue(d, l, c);
      if (p.error)
        return this.notifier.error(p.error), null;
      n[l] = p.value;
    }
    return n;
  }
  collectRequiredFields(e, t) {
    const n = [], s = /* @__PURE__ */ new Set(), o = (i) => {
      const a = i.trim();
      !a || s.has(a) || (s.add(a), n.push(a));
    };
    return Array.isArray(e) && e.forEach((i) => o(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => o(String(i))), n;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e.properties;
    let n;
    return t && typeof t == "object" && (n = {}, Object.entries(t).forEach(([s, o]) => {
      o && typeof o == "object" && (n[s] = o);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: n
    };
  }
  async requestRequiredFields(e, t, n, s) {
    const o = t.map((i) => {
      const a = n?.properties?.[i], l = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: i,
        label: (a?.title || i).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(s[i] !== void 0 ? s[i] : a?.default),
        type: l,
        options: this.buildSchemaOptions(a)
      };
    });
    return Wt.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: o
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((n) => n && Object.prototype.hasOwnProperty.call(n, "const")).map((n) => {
          const s = this.stringifyPromptDefault(n.const), o = typeof n.title == "string" && n.title.trim() ? n.title.trim() : s;
          return { value: s, label: o };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((n) => {
          const s = this.stringifyPromptDefault(n);
          return { value: s, label: s };
        });
        return t.length > 0 ? t : void 0;
      }
      if (typeof e.type == "string" && e.type.toLowerCase() === "boolean")
        return [
          { value: "true", label: "True" },
          { value: "false", label: "False" }
        ];
    }
  }
  stringifyPromptDefault(e) {
    if (e == null)
      return "";
    if (typeof e == "string")
      return e;
    if (typeof e == "number" || typeof e == "boolean")
      return String(e);
    try {
      return JSON.stringify(e);
    } catch {
      return "";
    }
  }
  coercePromptValue(e, t, n) {
    if (Array.isArray(n?.oneOf) && n.oneOf.length > 0) {
      const i = n.oneOf.find(
        (a) => a && Object.prototype.hasOwnProperty.call(a, "const") && this.stringifyPromptDefault(a.const) === e
      );
      if (!i || !Object.prototype.hasOwnProperty.call(i, "const")) {
        const a = n.oneOf.map((l) => typeof l?.title == "string" && l.title.trim() ? l.title.trim() : this.stringifyPromptDefault(l.const)).filter((l) => l !== "").join(", ");
        return { value: e, error: `${t} must be one of: ${a}` };
      }
      return { value: i.const };
    }
    const s = (n?.type || "string").toLowerCase();
    if (e === "")
      return { value: "" };
    let o = e;
    switch (s) {
      case "integer": {
        const i = Number.parseInt(e, 10);
        if (Number.isNaN(i))
          return { value: e, error: `${t} must be an integer.` };
        o = i;
        break;
      }
      case "number": {
        const i = Number.parseFloat(e);
        if (Number.isNaN(i))
          return { value: e, error: `${t} must be a number.` };
        o = i;
        break;
      }
      case "boolean": {
        const i = e.toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(i)) {
          o = !0;
          break;
        }
        if (["false", "0", "no", "n", "off"].includes(i)) {
          o = !1;
          break;
        }
        return { value: e, error: `${t} must be true/false.` };
      }
      case "array":
      case "object": {
        try {
          const i = JSON.parse(e);
          if (s === "array" && !Array.isArray(i))
            return { value: e, error: `${t} must be a JSON array.` };
          if (s === "object" && (i === null || Array.isArray(i) || typeof i != "object"))
            return { value: e, error: `${t} must be a JSON object.` };
          o = i;
        } catch {
          return { value: e, error: `${t} must be valid JSON.` };
        }
        break;
      }
      default:
        o = e;
    }
    return Array.isArray(n?.enum) && n.enum.length > 0 && !n.enum.some((a) => a === o || String(a) === String(o)) ? { value: o, error: `${t} must be one of: ${n.enum.map((a) => String(a)).join(", ")}` } : { value: o };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, n) {
    const s = e.label || e.id || "Bulk action", o = t && typeof t == "object" ? t.summary : null, i = o && typeof o.succeeded == "number" ? o.succeeded : typeof t?.processed == "number" ? t.processed : n, a = o && typeof o.failed == "number" ? o.failed : 0;
    return a > 0 ? `${s} completed: ${i} succeeded, ${a} failed.` : `${s} completed for ${i} item${i === 1 ? "" : "s"}.`;
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
    if (t)
      return t;
    const n = typeof e.id == "string" ? e.id.trim() : "", s = n ? `id-${this.sanitize(n)}` : `auto-${++this.actionKeySeq}`;
    return this.actionKeys.set(e, s), s;
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
}
function _(r) {
  const e = {
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
  return !r || typeof r != "object" || (e.requestedLocale = P(r, [
    "requested_locale"
  ]), e.resolvedLocale = P(r, [
    "resolved_locale",
    "locale"
  ]), e.availableLocales = ir(r, [
    "available_locales"
  ]), e.missingRequestedLocale = Be(r, [
    "missing_requested_locale"
  ]), e.fallbackUsed = Be(r, [
    "fallback_used"
  ]), e.familyId = P(r, [
    "family_id"
  ]), e.status = P(r, ["status"]), e.entityType = P(r, ["entity_type", "type", "_type"]), e.recordId = P(r, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function vi(r) {
  const e = _(r);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function wi(r) {
  const e = _(r);
  return e.familyId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function L(r, e = {}, t = "neutral") {
  const n = r.trim();
  if (!n)
    return "";
  const { size: s = "sm", extraClass: o = "" } = e;
  return `<span class="inline-flex items-center rounded-full border font-medium ${s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${t === "info" ? "bg-blue-50 text-blue-700 border-blue-200" : t === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"} ${o}">${u(n)}</span>`;
}
function et(r, e) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const t = r, n = t[e];
  return n && typeof n == "object" && !Array.isArray(n) ? n : t;
}
function D(r, e) {
  for (const t of e) {
    const n = r[t];
    if (typeof n == "string" && n.trim())
      return n.trim();
  }
  return "";
}
function pe(r, e) {
  for (const t of e) {
    const n = r[t];
    if (typeof n == "number" && Number.isFinite(n))
      return Math.trunc(n);
    if (typeof n == "string" && n.trim()) {
      const s = Number(n);
      if (Number.isFinite(s))
        return Math.trunc(s);
    }
  }
  return null;
}
function tt(r) {
  const e = typeof r.family_member_count == "number" ? Math.trunc(r.family_member_count) : Number(r.family_member_count);
  if (Number.isFinite(e) && e > 0)
    return Math.trunc(e);
  const t = k(r);
  if (t.availableLocales.length > 0)
    return t.availableLocales.length;
  const n = _(r);
  return n.availableLocales.length > 0 ? n.availableLocales.length : n.resolvedLocale ? 1 : null;
}
function xi(r, e = {}) {
  const t = typeof r.translation_family_url == "string" ? r.translation_family_url.trim() : "";
  if (!t)
    return '<span class="text-gray-400">-</span>';
  const n = tt(r), s = n && n > 0 ? L(`${n} ${n === 1 ? "locale" : "locales"}`, e, "info") : "";
  return `
    <div class="inline-flex items-center gap-2">
      <a href="${b(t)}" class="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">View family</a>
      ${s}
    </div>
  `.trim();
}
function Si(r, e = {}) {
  const t = tt(r);
  return !t || t <= 0 ? '<span class="text-gray-400">-</span>' : L(`${t} ${t === 1 ? "locale" : "locales"}`, e, "info");
}
function Ci(r, e = {}) {
  const t = et(r, "translation_assignment_summary");
  if (!t)
    return '<span class="text-gray-400">-</span>';
  const n = D(t, ["status"]), s = D(t, ["label"]), o = D(t, ["assignee_id"]), i = D(t, ["priority"]), a = pe(t, ["active_count", "open_count"]), l = [];
  return n ? l.push(j(n, { domain: "queue", size: "sm", showIcon: !1 })) : s && l.push(L(s, e, "info")), a !== null && a >= 0 && l.push(L(`${a} active`, e, "neutral")), o && l.push(L(`@${o}`, e, "neutral")), i && l.push(L(i, e, i === "urgent" || i === "high" ? "warning" : "neutral")), l.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${l.join("")}</div>`;
}
function $i(r, e = {}) {
  const t = et(r, "translation_exchange_summary");
  if (!t)
    return '<span class="text-gray-400">-</span>';
  const n = D(t, ["status", "last_job_status"]), s = D(t, ["label", "last_job_label"]), o = pe(t, ["pending_count"]), i = pe(t, ["error_count"]), a = [];
  return n ? a.push(j(n, { domain: "exchange", size: "sm", showIcon: !1 })) : s && a.push(L(s, e, "info")), o !== null && o >= 0 && a.push(L(`${o} pending`, e, "neutral")), i !== null && i > 0 && a.push(L(`${i} errors`, e, "warning")), a.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="inline-flex items-center gap-1.5 flex-wrap">${a.join("")}</div>`;
}
function k(r) {
  const e = {
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
  if (!r || typeof r != "object")
    return e;
  const t = r.translation_readiness;
  if (t && typeof t == "object") {
    e.hasReadinessMetadata = !0, e.familyId = P(r, [
      "translation_readiness.family_id",
      "family_id"
    ]), e.requiredLocales = Array.isArray(t.required_locales) ? t.required_locales.filter((i) => typeof i == "string") : [], e.availableLocales = Array.isArray(t.available_locales) ? t.available_locales.filter((i) => typeof i == "string") : [], e.missingRequiredLocales = Array.isArray(t.missing_required_locales) ? t.missing_required_locales.filter((i) => typeof i == "string") : [];
    const n = t.missing_required_fields_by_locale;
    if (n && typeof n == "object" && !Array.isArray(n))
      for (const [i, a] of Object.entries(n))
        Array.isArray(a) && (e.missingRequiredFieldsByLocale[i] = a.filter(
          (l) => typeof l == "string"
        ));
    const s = t.readiness_state;
    typeof s == "string" && Zt(s) && (e.readinessState = s);
    const o = t.ready_for_transition;
    if (o && typeof o == "object" && !Array.isArray(o))
      for (const [i, a] of Object.entries(o))
        typeof a == "boolean" && (e.readyForTransition[i] = a);
    e.evaluatedChannel = typeof t.evaluated_channel == "string" ? t.evaluated_channel : null;
  }
  return e;
}
function ki(r) {
  return k(r).hasReadinessMetadata;
}
function Ai(r, e) {
  return k(r).readyForTransition[e] === !0;
}
function Zt(r) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(r);
}
function rt(r, e = {}) {
  const t = "resolvedLocale" in r ? r : _(r), { showFallbackIndicator: n = !0, size: s = "default", extraClass: o = "" } = e;
  if (!t.resolvedLocale)
    return "";
  const i = t.resolvedLocale.toUpperCase(), a = t.fallbackUsed || t.missingRequestedLocale, c = `inline-flex items-center gap-1 rounded font-medium ${s === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return a && n ? `<span class="${c} bg-amber-100 text-amber-800 ${o}"
                  title="Showing ${t.resolvedLocale} content (${t.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${i}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${i}
    </span>` : `<span class="${c} bg-blue-100 text-blue-800 ${o}"
                title="Locale: ${i}"
                aria-label="Locale: ${i}">
    ${i}
  </span>`;
}
function er(r, e = {}) {
  const t = "resolvedLocale" in r ? r : _(r), { maxLocales: n = 3, size: s = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const o = s === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", i = s === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, n), l = t.availableLocales.length - n, c = a.map((p) => `<span class="${p === t.resolvedLocale ? `${i} rounded bg-blue-100 text-blue-700 font-medium` : `${i} rounded bg-gray-100 text-gray-600`}">${p.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${i} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${o}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function tr(r, e = {}) {
  const t = "resolvedLocale" in r ? r : _(r), { showResolvedLocale: n = !0, size: s = "default" } = e, o = [];
  return n && t.resolvedLocale && o.push(rt(t, { size: s, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && o.push(er(t, { ...e, size: s })), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${s === "sm" ? "gap-1" : "gap-2"}">${o.join("")}</div>`;
}
function Ei(r, e = "default") {
  if (!r)
    return "";
  const t = r.trim();
  if (Ve(t) !== null)
    return j(t, { size: e === "sm" ? "sm" : "default" });
  const n = t.toLowerCase();
  return X(r, "status", n, { size: e === "sm" ? "sm" : void 0 });
}
function Li(r, e = {}) {
  const t = k(r);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: n = "default", showDetailedTooltip: s = !0, extraClass: o = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: p, textClass: h, tooltip: f } = rr(l, t, s);
  return `<span class="${a} ${p} ${h} ${o}"
                title="${f}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function _i(r, e = {}) {
  const t = k(r);
  if (!t.hasReadinessMetadata)
    return "";
  const n = t.readyForTransition.publish === !0, { size: s = "default", extraClass: o = "" } = e, i = s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (n)
    return `<span class="inline-flex items-center gap-1 rounded font-medium ${i} bg-green-100 text-green-700 ${o}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const a = t.missingRequiredLocales.length, l = a > 0 ? `Missing translations: ${t.missingRequiredLocales.join(", ")}` : "Not ready to publish";
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${i} bg-amber-100 text-amber-700 ${o}"
                title="${l}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${a > 0 ? `${a} missing` : "Not ready"}
  </span>`;
}
function Ri(r, e = {}) {
  const t = k(r);
  if (!t.hasReadinessMetadata || t.requiredLocales.length === 0)
    return "";
  const { size: n = "default", extraClass: s = "" } = e, o = n === "sm" ? "text-xs" : "text-sm", i = t.requiredLocales.length, a = t.availableLocales.filter(
    (d) => t.requiredLocales.includes(d)
  ).length, c = i > 0 && a === i ? "text-green-600" : a > 0 ? "text-amber-600" : "text-gray-500";
  return `<span class="${o} ${c} font-medium ${s}"
                title="Locale completeness: ${a} of ${i} required locales available"
                aria-label="${a} of ${i} locales">
    ${a}/${i}
  </span>`;
}
function Ii(r, e = {}) {
  const t = k(r);
  if (!t.hasReadinessMetadata || t.readinessState === "ready")
    return "";
  const { size: n = "default", extraClass: s = "" } = e, o = n === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", i = t.missingRequiredLocales.length, a = i > 0, l = Object.keys(t.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", p = "", h = "";
  return a && l ? (c = "bg-red-100", d = "text-red-800", p = `${i} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : a ? (c = "bg-amber-100", d = "text-amber-800", p = `${i} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", p = "Incomplete", h = `Incomplete fields in: ${Object.keys(t.missingRequiredFieldsByLocale).join(", ")}`), p ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${o} ${c} ${d} ${s}"
                title="${h}"
                aria-label="${h}"
                data-missing-translations="true"
                data-missing-count="${i}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${p}</span>
  </span>` : "";
}
function Bi(r) {
  const e = k(r);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function Mi(r) {
  return k(r).missingRequiredLocales.length;
}
function rr(r, e, t) {
  const n = Ve(r, "core"), s = n ? Gt(n, "sm") : "", o = n?.bgClass || "bg-gray-100", i = n?.textClass || "text-gray-600", a = n?.label || "Unknown", l = n?.description || "Unknown readiness state";
  switch (r) {
    case "ready":
      return {
        icon: s,
        label: a,
        bgClass: o,
        textClass: i,
        tooltip: l
      };
    case "missing_locales": {
      const c = e.missingRequiredLocales, d = t && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: s,
        label: `${c.length} missing`,
        bgClass: o,
        textClass: i,
        tooltip: d
      };
    }
    case "missing_fields": {
      const c = Object.keys(e.missingRequiredFieldsByLocale), d = t && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields";
      return {
        icon: s,
        label: "Incomplete",
        bgClass: o,
        textClass: i,
        tooltip: d
      };
    }
    case "missing_locales_and_fields": {
      const c = e.missingRequiredLocales, d = Object.keys(e.missingRequiredFieldsByLocale), p = [];
      c.length > 0 && p.push(`Missing: ${c.join(", ")}`), d.length > 0 && p.push(`Incomplete: ${d.join(", ")}`);
      const h = t ? p.join("; ") : "Missing translations and incomplete fields";
      return {
        icon: s,
        label: "Not ready",
        bgClass: o,
        textClass: i,
        tooltip: h
      };
    }
    default:
      return {
        icon: s,
        label: a,
        bgClass: o,
        textClass: i,
        tooltip: l
      };
  }
}
function nr(r, e = {}) {
  const { size: t = "sm", maxLocales: n = 5, showLabels: s = !1 } = e, o = k(r);
  if (!o.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: i, availableLocales: a, missingRequiredFieldsByLocale: l } = o, c = i.length > 0 ? i : a;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(a), p = sr(l), h = c.slice(0, n).map((m) => {
    const y = d.has(m), v = y && p.has(m), g = y && !v;
    let x, I, C;
    g ? (x = "bg-green-100 text-green-700 border-green-300", I = "●", C = "Complete") : v ? (x = "bg-amber-100 text-amber-700 border-amber-300", I = "◐", C = "Incomplete") : (x = "bg-white text-gray-400 border-gray-300 border-dashed", I = "○", C = "Missing");
    const w = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", z = s ? `<span class="font-medium">${m.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${w} rounded border ${x}"
              title="${m.toUpperCase()}: ${C}"
              aria-label="${m.toUpperCase()}: ${C}"
              data-locale="${m}"
              data-state="${C.toLowerCase()}">
          ${z}
          <span aria-hidden="true">${I}</span>
        </span>
      `;
  }).join(""), f = c.length > n ? `<span class="text-[10px] text-gray-500" title="${c.length - n} more locales">+${c.length - n}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${h}${f}</div>`;
}
function sr(r) {
  const e = /* @__PURE__ */ new Set();
  if (r && typeof r == "object")
    for (const [t, n] of Object.entries(r))
      Array.isArray(n) && n.length > 0 && e.add(t);
  return e;
}
function Pi(r = {}) {
  return (e, t, n) => nr(t, r);
}
function Ti(r, e = {}) {
  if (!r.fallbackUsed && !r.missingRequestedLocale)
    return "";
  const { showCreateButton: t = !0, createTranslationUrl: n, panelName: s } = e, o = r.requestedLocale || "requested locale", i = r.resolvedLocale || "default", a = t ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${r.requestedLocale || ""}"
            data-panel="${s || ""}"
            data-record-id="${r.recordId || ""}"
            ${n ? `data-url="${n}"` : ""}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${o.toUpperCase()} translation
    </button>
  ` : "";
  return `
    <div class="fallback-warning bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
         role="alert"
         aria-live="polite"
         data-fallback-mode="true"
         data-requested-locale="${r.requestedLocale || ""}"
         data-resolved-locale="${r.resolvedLocale || ""}">
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
            The <strong>${o.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${i.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${a ? `<div class="mt-3">${a}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function Ie(r = {}) {
  return (e, t, n) => tr(t, r);
}
function or(r = {}) {
  return (e, t, n) => rt(t, r);
}
function P(r, e) {
  for (const t of e) {
    const n = we(r, t);
    if (typeof n == "string" && n.trim())
      return n;
  }
  return null;
}
function ir(r, e) {
  for (const t of e) {
    const n = we(r, t);
    if (Array.isArray(n))
      return n.filter((s) => typeof s == "string");
  }
  return [];
}
function Be(r, e) {
  for (const t of e) {
    const n = we(r, t);
    if (typeof n == "boolean")
      return n;
    if (n === "true") return !0;
    if (n === "false") return !1;
  }
  return !1;
}
function we(r, e) {
  const t = e.split(".");
  let n = r;
  for (const s of t) {
    if (n == null || typeof n != "object")
      return;
    n = n[s];
  }
  return n;
}
const E = '<span class="text-gray-400">-</span>', ar = [
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
function lr(r) {
  try {
    return JSON.stringify(r);
  } catch {
    return String(r);
  }
}
function cr(r) {
  const e = [], t = (s) => {
    if (typeof s != "string") return;
    const o = s.trim();
    !o || e.includes(o) || e.push(o);
  };
  t(r.display_key), t(r.displayKey);
  const n = r.display_keys ?? r.displayKeys;
  return Array.isArray(n) && n.forEach(t), e;
}
function dr(r, e) {
  if (!e) return;
  if (Object.prototype.hasOwnProperty.call(r, e))
    return r[e];
  if (!e.includes("."))
    return;
  const t = e.split(".");
  let n = r;
  for (const s of t) {
    if (!n || typeof n != "object" || Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, s))
      return;
    n = n[s];
  }
  return n;
}
function ur(r) {
  if (r == null)
    return "";
  switch (typeof r) {
    case "string":
      return r.trim();
    case "number":
    case "bigint":
      return String(r);
    case "boolean":
      return r ? "true" : "false";
    default:
      return "";
  }
}
function he(r, e) {
  if (r == null)
    return "";
  if (Array.isArray(r))
    return fe(r, e);
  if (typeof r != "object")
    return String(r);
  const n = [...cr(e), ...ar], s = /* @__PURE__ */ new Set();
  for (const o of n) {
    if (s.has(o)) continue;
    s.add(o);
    const i = dr(r, o), a = ur(i);
    if (a)
      return a;
  }
  return lr(r);
}
function fe(r, e) {
  if (!Array.isArray(r) || r.length === 0)
    return "";
  const t = r.map((i) => he(i, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const n = Number(e.preview_limit ?? e.previewLimit ?? 3), s = Number.isFinite(n) && n > 0 ? Math.floor(n) : 3, o = t.slice(0, s);
  return t.length <= s ? o.join(", ") : `${o.join(", ")} +${t.length - s} more`;
}
function pr(r, e, t, n) {
  const s = r[e] ?? r[t] ?? n, o = Number(s);
  return Number.isFinite(o) && o > 0 ? Math.floor(o) : n;
}
function hr(r, e, t, n) {
  const s = r[e] ?? r[t];
  return s == null ? n : typeof s == "boolean" ? s : typeof s == "string" ? s.toLowerCase() === "true" || s === "1" : !!s;
}
function fr(r, e, t, n) {
  const s = r[e] ?? r[t];
  return s == null ? n : String(s).trim() || n;
}
function mr(r) {
  if (r == null)
    return "";
  if (typeof r == "string")
    return r.trim();
  if (typeof r != "object")
    return String(r).trim();
  const e = ["_type", "type", "blockType", "block_type"];
  for (const t of e) {
    const n = r[t];
    if (typeof n == "string" && n.trim())
      return n.trim();
  }
  return "";
}
function gr(r) {
  switch (r) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    case "default":
    default:
      return "bg-blue-50 text-blue-700";
  }
}
class br {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return E;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = fe(e, {});
        return t ? u(t) : E;
      }
      if (typeof e == "object") {
        const t = he(e, {});
        return t ? u(t) : E;
      }
      return String(e);
    }, this.registerDefaultRenderers();
  }
  /**
   * Register a custom renderer for a column
   */
  register(e, t) {
    this.renderers.set(e, t);
  }
  /**
   * Get renderer for a column (fallback to default)
   */
  get(e) {
    return this.renderers.get(e) || this.defaultRenderer;
  }
  /**
   * Check if a custom renderer exists
   */
  has(e) {
    return this.renderers.has(e);
  }
  /**
   * Register built-in renderers
   */
  registerDefaultRenderers() {
    this.renderers.set("_badge", (e) => {
      const t = String(e).toLowerCase();
      return X(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Z(e);
      return t ? t.toLocaleDateString() : String(e);
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Z(e);
      return t ? t.toLocaleString() : String(e);
    }), this.renderers.set("_boolean", (e) => `<div class="flex justify-center">${!!e ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'}</div>`), this.renderers.set("_link", (e, t) => e ? `<a href="${t.url || t.link || "#"}" class="text-blue-600 hover:text-blue-800 underline">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_email", (e) => e ? `<a href="mailto:${e}" class="text-blue-600 hover:text-blue-800">${e}</a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_url", (e) => e ? `<a href="${e}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
        ${e}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>` : '<span class="text-gray-400">-</span>'), this.renderers.set("_number", (e) => e == null ? '<span class="text-gray-400">-</span>' : Number(e).toLocaleString()), this.renderers.set("_currency", (e) => e == null ? '<span class="text-gray-400">-</span>' : new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(e))), this.renderers.set("_percentage", (e) => e == null ? '<span class="text-gray-400">-</span>' : `${Number(e).toFixed(2)}%`), this.renderers.set("_filesize", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = Number(e), n = ["Bytes", "KB", "MB", "GB", "TB"];
      if (t === 0) return "0 Bytes";
      const s = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, s)).toFixed(2)} ${n[s]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), n = 50;
      return t.length <= n ? t : `<span title="${t}">${t.substring(0, n)}...</span>`;
    }), this.renderers.set("_array", (e, t, n, s) => {
      if (!Array.isArray(e) || e.length === 0)
        return E;
      const o = s?.options || {}, i = fe(e, o);
      return i ? u(i) : E;
    }), this.renderers.set("_object", (e, t, n, s) => {
      if (e == null)
        return E;
      const o = s?.options || {}, i = he(e, o);
      return i ? u(i) : E;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, n, s) => {
      if (!Array.isArray(e) || e.length === 0)
        return E;
      const o = s?.options || {}, i = pr(o, "max_visible", "maxVisible", 3), a = hr(o, "show_count", "showCount", !0), l = fr(o, "chip_variant", "chipVariant", "default"), c = o.block_icons_map || o.blockIconsMap || {}, d = [], p = e.slice(0, i);
      for (const m of p) {
        const y = mr(m);
        if (!y) continue;
        const v = c[y] || "view-grid", g = Nt(v, { size: "14px", extraClass: "flex-shrink-0" }), x = gr(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${x}">${g}<span>${u(y)}</span></span>`
        );
      }
      if (d.length === 0)
        return E;
      const h = e.length - i;
      let f = "";
      return a && h > 0 && (f = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${f}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const n = t.name || t.username || t.email || "U", s = n.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${n}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${s}</div>`;
    });
  }
}
const Di = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (r) => (e) => {
    const t = String(e).toLowerCase();
    return X(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (r) => (e) => {
    const t = String(e).toLowerCase();
    return X(String(e), "role", t);
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (r, e) => {
    const t = r || e.name || e.username || "-", n = e.email || "";
    return n ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${n}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (r) => (e) => zt(!!e, r),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (r) => {
    if (!r) return '<span class="text-gray-400">-</span>';
    const e = Z(r);
    if (!e)
      return String(r);
    const n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(n / 6e4), o = Math.floor(n / 36e5), i = Math.floor(n / 864e5);
    return s < 1 ? "Just now" : s < 60 ? `${s} minute${s > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : i < 30 ? `${i} day${i > 1 ? "s" : ""} ago` : e.toLocaleDateString();
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: or(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: Ie(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: Ie({ size: "sm", maxLocales: 2 })
}, yr = "datagrid.state.", ae = "datagrid.share.", nt = "datagrid.share.index", vr = 20;
function wr(r) {
  return String(r || "").trim() || "default";
}
function le(r, e = {}) {
  if (!Array.isArray(r)) return;
  const t = r.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
  return t.length === 0 ? e.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(t));
}
function G(r) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const e = r, t = { version: 1 };
  (e.viewMode === "flat" || e.viewMode === "grouped" || e.viewMode === "matrix") && (t.viewMode = e.viewMode), (e.expandMode === "all" || e.expandMode === "none" || e.expandMode === "explicit") && (t.expandMode = e.expandMode);
  const n = le(e.expandedGroups, { allowEmpty: !0 });
  n !== void 0 && (t.expandedGroups = n);
  const s = le(e.hiddenColumns, { allowEmpty: !0 });
  s !== void 0 && (t.hiddenColumns = s);
  const o = le(e.columnOrder);
  return o && (t.columnOrder = o), typeof e.updatedAt == "number" && Number.isFinite(e.updatedAt) && (t.updatedAt = e.updatedAt), t;
}
function Me(r) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const e = r, t = { version: 1 };
  if (typeof e.search == "string") {
    const s = e.search.trim();
    s && (t.search = s);
  }
  typeof e.page == "number" && Number.isFinite(e.page) && (t.page = Math.max(1, Math.trunc(e.page))), typeof e.perPage == "number" && Number.isFinite(e.perPage) && (t.perPage = Math.max(1, Math.trunc(e.perPage))), Array.isArray(e.filters) && (t.filters = e.filters), Array.isArray(e.sort) && (t.sort = e.sort);
  const n = G(e.persisted);
  return n && (t.persisted = n), typeof e.updatedAt == "number" && Number.isFinite(e.updatedAt) && (t.updatedAt = e.updatedAt), t;
}
function xr(r) {
  const e = String(r || "").trim();
  return e ? e.replace(/\/+$/, "") : "/api/panels/preferences";
}
function Sr(r) {
  return String(r || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function Cr() {
  const r = Date.now().toString(36), e = Math.random().toString(36).slice(2, 10);
  return `${r}${e}`.slice(0, 16);
}
function $r(r) {
  try {
    const e = localStorage.getItem(nt);
    if (!e) return [];
    const t = JSON.parse(e);
    if (!Array.isArray(t)) return [];
    const n = t.map((s) => {
      if (!s || typeof s != "object" || Array.isArray(s)) return null;
      const o = s, i = typeof o.token == "string" ? o.token.trim() : "", a = typeof o.updatedAt == "number" ? o.updatedAt : 0;
      return !i || !Number.isFinite(a) ? null : { token: i, updatedAt: a };
    }).filter((s) => s !== null).sort((s, o) => o.updatedAt - s.updatedAt);
    return n.length <= r ? n : n.slice(0, r);
  } catch {
    return [];
  }
}
function kr(r) {
  try {
    localStorage.setItem(nt, JSON.stringify(r));
  } catch {
  }
}
class st {
  constructor(e) {
    const t = wr(e.key);
    this.key = t, this.persistedStorageKey = `${yr}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || vr);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? G(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = G(e);
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
    const t = Me(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const n = Cr(), s = `${ae}${n}`;
    try {
      localStorage.setItem(s, JSON.stringify(t));
      const o = $r(this.maxShareEntries).filter((i) => i.token !== n);
      for (o.unshift({ token: n, updatedAt: t.updatedAt }); o.length > this.maxShareEntries; ) {
        const i = o.pop();
        i && localStorage.removeItem(`${ae}${i.token}`);
      }
      return kr(o), n;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const n = localStorage.getItem(`${ae}${t}`);
      return n ? Me(JSON.parse(n)) : null;
    } catch {
      return null;
    }
  }
}
class Ar extends st {
  constructor(e) {
    super(e), this.syncTimeout = null, this.preferencesEndpoint = xr(e.preferencesEndpoint), this.resource = Sr(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3);
  }
  get serverStateKey() {
    return `ui.datagrid.${this.resource}.state`;
  }
  async hydrate() {
    try {
      const e = this.buildKeysQueryURL(this.serverStateKey), t = await fetch(e, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      if (!t.ok)
        return;
      const n = await t.json(), s = this.extractFirstRecord(n);
      if (!s) return;
      const o = this.extractMap(s.effective), i = this.extractMap(s.raw), a = o[this.serverStateKey] ?? i[this.serverStateKey], l = G(a);
      l && super.savePersistedState(l);
    } catch {
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = G(e);
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
      await $(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: {
          raw: {
            [this.serverStateKey]: e
          }
        }
      });
    } catch {
    }
  }
  async clearServerState() {
    try {
      await $(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        json: {
          clear_raw_keys: [this.serverStateKey]
        }
      });
    } catch {
    }
  }
  buildKeysQueryURL(e) {
    const t = this.preferencesEndpoint.includes("?") ? "&" : "?";
    return `${this.preferencesEndpoint}${t}keys=${encodeURIComponent(e)}`;
  }
  extractFirstRecord(e) {
    if (!e || typeof e != "object" || Array.isArray(e))
      return null;
    const t = e, n = Array.isArray(t.records) ? t.records : Array.isArray(t.data) ? t.data : [];
    if (n.length === 0) return null;
    const s = n[0];
    return !s || typeof s != "object" || Array.isArray(s) ? null : s;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
}
function Er(r) {
  return (r.mode || "local") === "preferences" ? new Ar(r) : new st(r);
}
function Lr(r, e = {}) {
  const {
    groupByField: t = "family_id",
    defaultExpanded: n = !0,
    expandMode: s = "explicit",
    expandedGroups: o = /* @__PURE__ */ new Set()
  } = e, i = /* @__PURE__ */ new Map(), a = [];
  for (const c of r) {
    const d = Tr(c, t);
    if (d) {
      const p = i.get(d);
      p ? p.push(c) : i.set(d, [c]);
    } else
      a.push(c);
  }
  const l = [];
  for (const [c, d] of i) {
    const p = dt(d), h = it(c, s, o, n);
    l.push({
      groupId: c,
      records: d,
      summary: p,
      expanded: h,
      summaryFromBackend: !1
      // We're computing client-side here
    });
  }
  return l.sort((c, d) => {
    const p = r.indexOf(c.records[0]), h = r.indexOf(d.records[0]);
    return p - h;
  }), {
    groups: l,
    ungrouped: a,
    totalGroups: l.length,
    totalRecords: r.length
  };
}
function ot(r) {
  if (r.length === 0)
    return !1;
  let e = !1;
  for (const t of r) {
    if (Rr(t)) {
      e = !0;
      continue;
    }
    if (at(t)) {
      e = !0;
      continue;
    }
    return !1;
  }
  return e;
}
function _r(r, e = {}) {
  const {
    defaultExpanded: t = !0,
    expandMode: n = "explicit",
    expandedGroups: s = /* @__PURE__ */ new Set()
  } = e;
  if (!ot(r))
    return null;
  const o = [], i = [];
  let a = 0;
  for (const l of r) {
    if (at(l)) {
      i.push({ ...l }), a += 1;
      continue;
    }
    const c = Ir(l);
    if (!c)
      return null;
    const d = ct(l), p = Mr(l, d), h = it(c, n, s, t);
    o.push({
      groupId: c,
      displayLabel: Pr(l, d),
      records: d,
      summary: p,
      expanded: h,
      summaryFromBackend: Br(l)
    }), a += d.length;
  }
  return {
    groups: o,
    ungrouped: i,
    totalGroups: o.length,
    totalRecords: a
  };
}
function it(r, e, t, n) {
  return e === "all" ? !t.has(r) : e === "none" ? t.has(r) : t.size === 0 ? n : t.has(r);
}
function Rr(r) {
  const e = r, t = typeof e.group_by == "string" ? e.group_by.trim().toLowerCase() : "", n = lt(r);
  if (!(t === "family_id" || n === "group"))
    return !1;
  const o = ct(r);
  return Array.isArray(o);
}
function at(r) {
  return lt(r) === "ungrouped";
}
function lt(r) {
  const e = r._group;
  if (!e || typeof e != "object" || Array.isArray(e))
    return "";
  const t = e.row_type;
  return typeof t == "string" ? t.trim().toLowerCase() : "";
}
function Ir(r) {
  const e = r.family_id;
  if (typeof e == "string" && e.trim())
    return e.trim();
  const t = r._group;
  if (!t || typeof t != "object" || Array.isArray(t))
    return null;
  const n = t.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function ct(r) {
  const e = r, t = Array.isArray(e.records) ? e.records : e.children;
  if (Array.isArray(t)) {
    const s = t.filter((o) => !!o && typeof o == "object" && !Array.isArray(o)).map((o) => ({ ...o }));
    if (s.length > 0)
      return s;
  }
  const n = e.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function Br(r) {
  const e = r.family_summary;
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function Mr(r, e) {
  const t = r.family_summary;
  if (!t || typeof t != "object" || Array.isArray(t))
    return dt(e);
  const n = t, s = Array.isArray(n.available_locales) ? n.available_locales.filter(T) : [], o = Array.isArray(n.missing_locales) ? n.missing_locales.filter(T) : [], i = ut(n.readiness_state) ? n.readiness_state : null, a = Math.max(e.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : a,
    availableLocales: s,
    missingLocales: o,
    readinessState: i,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function Pr(r, e) {
  const t = r.family_label;
  if (typeof t == "string" && t.trim())
    return t.trim();
  const n = r.family_summary;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const a = n.group_label;
    if (typeof a == "string" && a.trim())
      return a.trim();
  }
  const s = r._group;
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const a = s.label;
    if (typeof a == "string" && a.trim())
      return a.trim();
  }
  const o = [], i = r.parent;
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const a = i;
    o.push(a.title, a.name, a.slug, a.path);
  }
  e.length > 0 && o.push(e[0].title, e[0].name, e[0].slug, e[0].path);
  for (const a of o)
    if (typeof a == "string" && a.trim())
      return a.trim();
}
function Tr(r, e) {
  const t = r[e];
  return typeof t == "string" && t.trim() ? t : null;
}
function dt(r) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let n = !1, s = 0;
  for (const i of r) {
    const a = i.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, p = a.readiness_state;
      Array.isArray(c) && c.filter(T).forEach((h) => e.add(h)), Array.isArray(d) && d.filter(T).forEach((h) => t.add(h)), (p === "missing_fields" || p === "missing_locales_and_fields") && (n = !0), p === "ready" && s++;
    }
    const l = i.available_locales;
    Array.isArray(l) && l.filter(T).forEach((c) => e.add(c));
  }
  let o = null;
  if (r.length > 0) {
    const i = s === r.length, a = t.size > 0;
    i ? o = "ready" : a && n ? o = "missing_locales_and_fields" : a ? o = "missing_locales" : n && (o = "missing_fields");
  }
  return {
    totalItems: r.length,
    availableLocales: Array.from(e),
    missingLocales: Array.from(t),
    readinessState: o,
    readyForPublish: o === "ready"
  };
}
function T(r) {
  return typeof r == "string";
}
function Dr(r, e) {
  const t = r.groups.map((n) => {
    const s = e.get(n.groupId);
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
    ...r,
    groups: t
  };
}
function Fr(r) {
  const e = /* @__PURE__ */ new Map(), t = r.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [n, s] of Object.entries(t))
    if (s && typeof s == "object") {
      const o = s;
      e.set(n, {
        totalItems: typeof o.total_items == "number" ? o.total_items : void 0,
        availableLocales: Array.isArray(o.available_locales) ? o.available_locales.filter(T) : void 0,
        missingLocales: Array.isArray(o.missing_locales) ? o.missing_locales.filter(T) : void 0,
        readinessState: ut(o.readiness_state) ? o.readiness_state : void 0,
        readyForPublish: typeof o.ready_for_publish == "boolean" ? o.ready_for_publish : void 0
      });
    }
  return e;
}
function ut(r) {
  return r === "ready" || r === "missing_locales" || r === "missing_fields" || r === "missing_locales_and_fields";
}
const te = "datagrid-expand-state-";
function me(r) {
  if (!Array.isArray(r))
    return [];
  const e = [];
  for (const t of r) {
    const n = Se(t);
    if (n && !e.includes(n)) {
      if (e.length >= xe) break;
      e.push(n);
    }
  }
  return e;
}
function pt(r) {
  if (!r)
    return null;
  try {
    const e = JSON.parse(r);
    if (Array.isArray(e))
      return {
        version: 2,
        mode: "explicit",
        ids: me(e)
      };
    if (!e || typeof e != "object" || Array.isArray(e))
      return null;
    const t = Y(e.mode, "explicit"), n = me(e.ids);
    return { version: 2, mode: t, ids: n };
  } catch {
    return null;
  }
}
function qr(r) {
  try {
    const e = te + r, t = pt(localStorage.getItem(e));
    if (t)
      return new Set(t.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Or(r) {
  try {
    const e = te + r, t = pt(localStorage.getItem(e));
    if (t)
      return t.mode;
  } catch {
  }
  return "explicit";
}
function jr(r) {
  try {
    const e = te + r;
    return localStorage.getItem(e) !== null;
  } catch {
    return !1;
  }
}
function Fi(r, e, t = "explicit") {
  try {
    const n = te + r, s = me(Array.from(e)), o = {
      version: 2,
      mode: Y(t, "explicit"),
      ids: s
    };
    localStorage.setItem(n, JSON.stringify(o));
  } catch {
  }
}
function qi(r, e) {
  const t = r.groups.map((n) => n.groupId === e ? { ...n, expanded: !n.expanded } : n);
  return { ...r, groups: t };
}
function Oi(r) {
  const e = r.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...r, groups: e };
}
function ji(r) {
  const e = r.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...r, groups: e };
}
function zi(r) {
  const e = /* @__PURE__ */ new Set();
  for (const t of r.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const ht = "datagrid-view-mode-", xe = 200, zr = 256;
function Y(r, e = "explicit") {
  return r === "all" || r === "none" || r === "explicit" ? r : e;
}
function Nr(r) {
  try {
    const e = ht + r, t = localStorage.getItem(e);
    if (t && ft(t))
      return t;
  } catch {
  }
  return null;
}
function Ni(r, e) {
  try {
    const t = ht + r;
    localStorage.setItem(t, e);
  } catch {
  }
}
function ft(r) {
  return r === "flat" || r === "grouped" || r === "matrix";
}
function mt(r) {
  return r && ft(r) ? r : null;
}
function Gi(r) {
  if (!(r instanceof Set) || r.size === 0)
    return "";
  const e = Array.from(new Set(
    Array.from(r).map((t) => Se(t)).filter((t) => t !== null)
  )).slice(0, xe).sort();
  return e.length === 0 ? "" : e.map((t) => encodeURIComponent(t)).join(",");
}
function Gr(r) {
  const e = /* @__PURE__ */ new Set();
  if (!r)
    return e;
  const t = r.split(",");
  for (const n of t) {
    if (e.size >= xe)
      break;
    if (!n)
      continue;
    let s = "";
    try {
      s = decodeURIComponent(n);
    } catch {
      continue;
    }
    const o = Se(s);
    o && e.add(o);
  }
  return e;
}
function Se(r) {
  if (typeof r != "string")
    return null;
  let e = r.trim();
  if (!e)
    return null;
  if (e.includes("%"))
    try {
      const t = decodeURIComponent(e);
      typeof t == "string" && t.trim() && (e = t.trim());
    } catch {
    }
  return e.length > zr ? null : e;
}
function Ur(r, e = {}) {
  const { summary: t } = r, { size: n = "sm" } = e, s = n === "sm" ? "text-xs" : "text-sm", o = t.availableLocales.length, i = t.missingLocales.length, a = o + i;
  let l = "";
  if (t.readinessState) {
    const p = Hr(t.readinessState);
    l = `
      <span class="${s} px-1.5 py-0.5 rounded ${p.bgClass} ${p.textClass}"
            title="${p.description}">
        ${p.icon} ${p.label}
      </span>
    `;
  }
  const c = a > 0 ? `<span class="${s} text-gray-500">${o}/${a} locales</span>` : "", d = `<span class="${s} text-gray-500">${t.totalItems} item${t.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${l}
      ${c}
      ${d}
    </div>
  `;
}
function Hr(r) {
  switch (r) {
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
function Vr(r) {
  if (typeof r.displayLabel == "string" && r.displayLabel.trim())
    return r.displayLabel.trim();
  if (r.groupId.startsWith("ungrouped:"))
    return "Ungrouped Records";
  if (r.records.length > 0) {
    const t = r.records[0];
    for (const n of ["title", "name", "label", "subject"]) {
      const s = t[n];
      if (typeof s == "string" && s.trim()) {
        const o = s.trim();
        return o.length > 60 ? o.slice(0, 57) + "..." : o;
      }
    }
  }
  return `Translation Group (${r.groupId.length > 8 ? r.groupId.slice(0, 8) + "..." : r.groupId})`;
}
function Kr(r, e, t = {}) {
  const { showExpandIcon: n = !0 } = t, s = n ? `<span class="expand-icon mr-2" aria-hidden="true">${r.expanded ? "▼" : "▶"}</span>` : "", o = Ur(r), i = u(Vr(r)), a = r.records.length, l = a > 1 ? `<span class="ml-2 text-xs text-gray-500">(${a} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${b(r.groupId)}"
        data-expanded="${r.expanded}"
        role="row"
        aria-expanded="${r.expanded}"
        tabindex="0">
      <td colspan="${e + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${s}
            <span class="font-medium text-gray-700">${i}</span>
            ${l}
          </div>
          ${o}
        </div>
      </td>
    </tr>
  `;
}
function Jr(r) {
  return `
    <tr>
      <td colspan="${r + 2}" class="px-6 py-12 text-center">
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
function Ui(r) {
  return `
    <tr>
      <td colspan="${r + 2}" class="px-6 py-12 text-center">
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
function Hi(r, e, t) {
  const n = t ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${r + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${u(e)}</p>
          ${n}
        </div>
      </td>
    </tr>
  `;
}
function Yr(r = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < r;
}
function Ce(r, e = 768) {
  return Yr(e) && r === "grouped" ? "flat" : r;
}
const U = "search", H = "page", V = "perPage", K = "filters", J = "sort", re = "state", $e = "hiddenColumns", ne = "view_mode", ee = "expanded_groups", ke = [
  U,
  H,
  V,
  K,
  J,
  re,
  $e,
  ne,
  ee
], gt = 1800, bt = 600;
function Pe(r, e) {
  const t = e.toString();
  return t ? `${r}?${t}` : r;
}
function Qr(r, e) {
  for (const t of e)
    r.delete(t);
}
function Wr(r) {
  const e = Math.max(
    256,
    r.config.urlState?.maxURLLength || gt
  ), t = Math.max(
    64,
    r.config.urlState?.maxFiltersLength || bt
  ), n = r.config.urlState?.enableStateToken !== !1;
  return {
    maxURLLength: e,
    maxFiltersLength: t,
    enableStateToken: n
  };
}
function Xr(r, e, t) {
  const n = String(e || "").trim();
  if (!n)
    return null;
  try {
    const s = JSON.parse(n);
    return Array.isArray(s) ? s : (console.warn(`[DataGrid] Invalid ${t} payload in URL (expected array)`), null);
  } catch (s) {
    return console.warn(`[DataGrid] Failed to parse ${t} payload from URL:`, s), null;
  }
}
function Zr(r, e, t = {}) {
  const n = t.merge === !0, s = new Set(r.config.columns.map((a) => a.field)), o = Array.isArray(e.hiddenColumns) ? new Set(
    e.hiddenColumns.map((a) => String(a || "").trim()).filter((a) => a.length > 0 && s.has(a))
  ) : null;
  o ? (r.state.hiddenColumns = o, r.hasPersistedHiddenColumnState = !0) : n || (r.state.hiddenColumns = new Set(
    r.config.columns.filter((a) => a.hidden).map((a) => a.field)
  ), r.hasPersistedHiddenColumnState = !1);
  const i = Array.isArray(e.columnOrder) ? e.columnOrder.map((a) => String(a || "").trim()).filter((a) => a.length > 0 && s.has(a)) : null;
  if (i && i.length > 0) {
    const a = r.mergeColumnOrder(i);
    r.state.columnOrder = a, r.hasPersistedColumnOrderState = !0, r.didRestoreColumnOrder = !0;
    const l = r.defaultColumns.map((d) => d.field);
    r.shouldReorderDOMOnRestore = l.join("|") !== a.join("|");
    const c = new Map(r.config.columns.map((d) => [d.field, d]));
    r.config.columns = a.map((d) => c.get(d)).filter((d) => d !== void 0);
  } else n || (r.state.columnOrder = r.config.columns.map((a) => a.field), r.hasPersistedColumnOrderState = !1, r.didRestoreColumnOrder = !1, r.shouldReorderDOMOnRestore = !1);
  if (r.config.enableGroupedMode) {
    if (e.viewMode) {
      const a = mt(e.viewMode);
      a && (r.state.viewMode = Ce(a));
    }
    r.state.expandMode = Y(e.expandMode, r.state.expandMode), Array.isArray(e.expandedGroups) ? (r.state.expandedGroups = new Set(
      e.expandedGroups.map((a) => String(a || "").trim()).filter(Boolean)
    ), r.state.hasPersistedExpandState = !0) : e.expandMode !== void 0 && (r.state.hasPersistedExpandState = !0);
  }
}
function en(r, e) {
  e.persisted && r.applyPersistedStateSnapshot(e.persisted, { merge: !0 }), typeof e.search == "string" && (r.state.search = e.search), typeof e.page == "number" && Number.isFinite(e.page) && (r.state.currentPage = Math.max(1, Math.trunc(e.page))), typeof e.perPage == "number" && Number.isFinite(e.perPage) && (r.state.perPage = Math.max(1, Math.trunc(e.perPage))), Array.isArray(e.filters) && (r.state.filters = e.filters), Array.isArray(e.sort) && (r.state.sort = e.sort);
}
function tn(r) {
  const e = {
    version: 1,
    hiddenColumns: Array.from(r.state.hiddenColumns),
    columnOrder: [...r.state.columnOrder],
    updatedAt: Date.now()
  };
  return r.config.enableGroupedMode && (e.viewMode = r.state.viewMode, e.expandMode = r.state.expandMode, e.expandedGroups = Array.from(r.state.expandedGroups)), e;
}
function rn(r) {
  return {
    version: 1,
    search: r.state.search || void 0,
    page: r.state.currentPage > 1 ? r.state.currentPage : void 0,
    perPage: r.state.perPage !== (r.config.perPage || 10) ? r.state.perPage : void 0,
    filters: r.state.filters.length > 0 ? [...r.state.filters] : void 0,
    sort: r.state.sort.length > 0 ? [...r.state.sort] : void 0,
    persisted: r.buildPersistedStateSnapshot(),
    updatedAt: Date.now()
  };
}
function nn(r) {
  r.stateStore.savePersistedState(r.buildPersistedStateSnapshot());
}
function sn(r) {
  const e = new URLSearchParams(window.location.search);
  r.didRestoreColumnOrder = !1, r.shouldReorderDOMOnRestore = !1, r.hasURLStateOverrides = ke.some((c) => e.has(c));
  const t = e.get(re);
  if (t) {
    const c = r.stateStore.resolveShareState(t);
    c && r.applyShareStateSnapshot(c);
  }
  const n = e.get(U);
  if (n) {
    r.state.search = n;
    const c = document.querySelector(r.selectors.searchInput);
    c && (c.value = n);
  }
  const s = e.get(H);
  if (s) {
    const c = parseInt(s, 10);
    r.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const o = e.get(V);
  if (o) {
    const c = parseInt(o, 10), d = r.config.perPage || 10;
    r.state.perPage = Number.isNaN(c) ? d : Math.max(1, c);
    const p = document.querySelector(r.selectors.perPageSelect);
    p && (p.value = String(r.state.perPage));
  }
  const i = e.get(K);
  if (i) {
    const c = r.parseJSONArray(i, "filters");
    c && (r.state.filters = c);
  }
  const a = e.get(J);
  if (a) {
    const c = r.parseJSONArray(a, "sort");
    c && (r.state.sort = c);
  }
  if (r.config.enableGroupedMode) {
    const c = mt(e.get(ne));
    c && (r.state.viewMode = Ce(c)), e.has(ee) && (r.state.expandedGroups = Gr(
      e.get(ee)
    ), r.state.expandMode = "explicit", r.state.hasPersistedExpandState = !0);
  }
  const l = e.get($e);
  if (l) {
    const c = r.parseJSONArray(l, "hidden columns");
    if (c) {
      const d = new Set(r.config.columns.map((p) => p.field));
      r.state.hiddenColumns = new Set(
        c.map((p) => typeof p == "string" ? p.trim() : "").filter((p) => p.length > 0 && d.has(p))
      );
    }
  } else if (!r.hasPersistedHiddenColumnState && r.config.behaviors?.columnVisibility) {
    const c = r.config.columns.map((p) => p.field), d = r.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(c);
    d.size > 0 && (r.state.hiddenColumns = d);
  }
  if (!r.hasPersistedColumnOrderState && r.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const c = r.config.columns.map((p) => p.field), d = r.config.behaviors.columnVisibility.loadColumnOrderFromCache(c);
    if (d && d.length > 0) {
      const p = r.mergeColumnOrder(d);
      r.state.columnOrder = p, r.didRestoreColumnOrder = !0;
      const h = r.defaultColumns.map((m) => m.field);
      r.shouldReorderDOMOnRestore = h.join("|") !== p.join("|");
      const f = new Map(r.config.columns.map((m) => [m.field, m]));
      r.config.columns = p.map((m) => f.get(m)).filter((m) => m !== void 0);
    }
  }
  r.persistStateSnapshot(), console.log("[DataGrid] State restored from URL:", r.state), setTimeout(() => {
    r.applyRestoredState();
  }, 0);
}
function on(r) {
  const e = document.querySelector(r.selectors.searchInput);
  e && (e.value = r.state.search);
  const t = document.querySelector(r.selectors.perPageSelect);
  t && (t.value = String(r.state.perPage)), r.state.filters.length > 0 && r.state.filters.forEach((s) => {
    const o = document.querySelector(
      `[data-filter-column="${s.column}"]`
    );
    o && (o.value = String(s.value));
  }), r.didRestoreColumnOrder && r.shouldReorderDOMOnRestore && r.reorderTableColumns(r.state.columnOrder);
  const n = r.config.columns.filter((s) => !r.state.hiddenColumns.has(s.field)).map((s) => s.field);
  r.updateColumnVisibility(n, !0), r.state.sort.length > 0 && r.updateSortIndicators();
}
function an(r, e = {}) {
  r.persistStateSnapshot();
  const t = r.getURLStateConfig(), n = new URLSearchParams(window.location.search);
  Qr(n, ke), r.state.search && n.set(U, r.state.search), r.state.currentPage > 1 && n.set(H, String(r.state.currentPage)), r.state.perPage !== (r.config.perPage || 10) && n.set(V, String(r.state.perPage));
  let s = !1;
  if (r.state.filters.length > 0) {
    const a = JSON.stringify(r.state.filters);
    a.length <= t.maxFiltersLength ? n.set(K, a) : s = !0;
  }
  r.state.sort.length > 0 && n.set(J, JSON.stringify(r.state.sort)), r.config.enableGroupedMode && n.set(ne, r.state.viewMode);
  let o = Pe(window.location.pathname, n);
  const i = o.length > t.maxURLLength;
  if (t.enableStateToken && (s || i)) {
    n.delete(U), n.delete(H), n.delete(V), n.delete(K), n.delete(J);
    const a = r.stateStore.createShareState(r.buildShareStateSnapshot());
    a && n.set(re, a), o = Pe(window.location.pathname, n);
  }
  e.replace ? window.history.replaceState({}, "", o) : window.history.pushState({}, "", o), console.log("[DataGrid] URL updated:", o);
}
async function ln(r) {
  console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(r.state.sort)), r.abortController && r.abortController.abort(), r.abortController = new AbortController();
  try {
    const e = r.buildApiUrl(), t = await $(e, {
      signal: r.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!t.ok) {
      if (r.handleGroupedModeStatusFallback(t.status))
        return;
      throw new Error(`HTTP error! status: ${t.status}`);
    }
    const n = await t.json(), s = Ut(n) || n;
    console.log("[DataGrid] API Response:", s), console.log("[DataGrid] API Response data array:", s.data), console.log("[DataGrid] API Response total:", s.total, "count:", s.count, "$meta:", s.$meta);
    const o = s.data || s.records || [];
    if (r.handleGroupedModePayloadFallback(o))
      return;
    r.lastSchema = s.schema || null, r.lastForm = s.form || null, r.setBulkActionState(s.$meta?.bulk_action_state || null, s.schema?.bulk_action_state_config || null);
    const i = r.getResponseTotal(s);
    if (r.normalizePagination(i))
      return r.refresh();
    console.log("[DataGrid] About to call renderData()..."), r.renderData(s), console.log("[DataGrid] renderData() completed"), r.updatePaginationUI(s), r.updateBulkActionsBar(), console.log("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.log("[DataGrid] Request aborted");
      return;
    }
    console.error("[DataGrid] Error fetching data:", e), r.showError("Failed to load data");
  }
}
function cn(r) {
  const e = new URLSearchParams(), t = r.buildQueryParams();
  Object.entries(t).forEach(([s, o]) => {
    o != null && e.append(s, String(o));
  });
  const n = `${r.config.apiEndpoint}?${e.toString()}`;
  return console.log(`[DataGrid] API URL: ${n}`), n;
}
function dn(r) {
  const e = new URLSearchParams(), t = r.buildQueryParams();
  return Object.entries(t).forEach(([n, s]) => {
    s != null && e.append(n, String(s));
  }), e.toString();
}
function un(r) {
  const e = {};
  if (r.config.behaviors?.pagination) {
    const t = r.config.behaviors.pagination.buildQuery(
      r.state.currentPage,
      r.state.perPage
    );
    Object.assign(e, t);
  }
  if (r.state.search && r.config.behaviors?.search) {
    const t = r.config.behaviors.search.buildQuery(r.state.search);
    Object.assign(e, t);
  }
  if (r.state.filters.length > 0 && r.config.behaviors?.filter) {
    const t = r.config.behaviors.filter.buildFilters(r.state.filters);
    Object.assign(e, t);
  }
  if (r.state.sort.length > 0 && r.config.behaviors?.sort) {
    const t = r.config.behaviors.sort.buildQuery(r.state.sort);
    Object.assign(e, t);
  }
  return r.isGroupedViewActive() && (e.group_by = r.config.groupByField || "family_id"), e;
}
function pn(r, e) {
  return e.total !== void 0 && e.total !== null ? e.total : e.$meta?.count !== void 0 && e.$meta?.count !== null ? e.$meta.count : e.count !== void 0 && e.count !== null ? e.count : null;
}
function hn(r, e) {
  if (e === null)
    return !1;
  const t = Math.max(1, r.state.perPage || r.config.perPage || 10), n = Math.max(1, Math.ceil(e / t));
  let s = r.state.currentPage;
  e === 0 ? s = 1 : s > n ? s = n : s < 1 && (s = 1);
  const o = t !== r.state.perPage || s !== r.state.currentPage;
  return o && (r.state.perPage = t, r.state.currentPage = s, r.pushStateToURL()), e === 0 ? !1 : o;
}
async function fn(r, e) {
  const t = await $(`${r.config.apiEndpoint}/${e}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!t.ok)
    throw new Error(`Detail request failed: ${t.status}`);
  const n = await t.json(), s = r.normalizeDetailResponse(n);
  return s.schema && (r.lastSchema = s.schema), s.form && (r.lastForm = s.form), {
    ...s,
    tabs: s.schema?.tabs || []
  };
}
function mn(r, e) {
  const t = Ke(e) || e;
  if (t && typeof t == "object" && "data" in t) {
    const n = t;
    return {
      data: n.data,
      schema: n.schema,
      form: n.form
    };
  }
  return { data: e };
}
function gn(r) {
  return r.lastSchema;
}
function bn(r) {
  return r.lastForm;
}
function yn(r) {
  return r.lastSchema?.tabs || [];
}
function vn(r, e, t, n) {
  const s = r.config.groupByField || "family_id", o = t.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let i = _r(o, {
    defaultExpanded: !r.state.hasPersistedExpandState,
    expandMode: r.state.expandMode,
    expandedGroups: r.state.expandedGroups
  });
  i || (i = Lr(o, {
    groupByField: s,
    defaultExpanded: !r.state.hasPersistedExpandState,
    expandMode: r.state.expandMode,
    expandedGroups: r.state.expandedGroups
  }));
  const a = Fr(e);
  a.size > 0 && (i = Dr(i, a)), r.state.groupedData = i;
  const l = r.config.columns.length;
  for (const c of i.groups) {
    const d = Kr(c, l);
    n.insertAdjacentHTML("beforeend", d);
    const p = n.lastElementChild;
    p && (p.addEventListener("click", () => r.toggleGroup(c.groupId)), p.addEventListener("keydown", (h) => {
      (h.key === "Enter" || h.key === " ") && (h.preventDefault(), r.toggleGroup(c.groupId));
    }));
    for (const h of c.records) {
      h.id && (r.recordsById[h.id] = h);
      const f = r.createTableRow(h);
      f.dataset.groupId = c.groupId, f.classList.add("group-child-row"), c.expanded || (f.style.display = "none"), n.appendChild(f);
    }
  }
  for (const c of i.ungrouped) {
    c.id && (r.recordsById[c.id] = c);
    const d = r.createTableRow(c);
    n.appendChild(d);
  }
  console.log(`[DataGrid] Rendered ${i.groups.length} groups, ${i.ungrouped.length} ungrouped`);
}
function wn(r) {
  return r.config.enableGroupedMode ? r.state.viewMode === "grouped" || r.state.viewMode === "matrix" : !1;
}
function xn(r, e) {
  r.isGroupedViewActive() && (r.state.viewMode = "flat", r.state.groupedData = null, r.pushStateToURL({ replace: !0 }), r.notify(e, "warning"), r.refresh());
}
function Sn(r, e) {
  return !r.isGroupedViewActive() || ![400, 404, 405, 422].includes(e) ? !1 : (r.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function Cn(r, e) {
  if (!r.isGroupedViewActive() || e.length === 0)
    return !1;
  const t = e.filter((n) => !!n && typeof n == "object" && !Array.isArray(n));
  return t.length !== e.length || !ot(t) ? (r.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function $n(r, e) {
  if (!r.state.groupedData) return;
  const t = String(e || "").trim();
  if (!t) return;
  const n = r.isGroupExpandedByState(t, !r.state.hasPersistedExpandState);
  r.state.expandMode === "all" ? n ? r.state.expandedGroups.add(t) : r.state.expandedGroups.delete(t) : r.state.expandMode === "none" ? n ? r.state.expandedGroups.delete(t) : r.state.expandedGroups.add(t) : (!r.state.hasPersistedExpandState && r.state.expandedGroups.size === 0 && (r.state.expandedGroups = new Set(r.state.groupedData.groups.map((o) => o.groupId))), r.state.expandedGroups.has(t) ? r.state.expandedGroups.delete(t) : r.state.expandedGroups.add(t)), r.state.hasPersistedExpandState = !0;
  const s = r.state.groupedData.groups.find((o) => o.groupId === t);
  s && (s.expanded = r.isGroupExpandedByState(t)), r.updateGroupVisibility(t), r.pushStateToURL({ replace: !0 });
}
function kn(r, e) {
  if (!r.config.enableGroupedMode)
    return;
  const t = new Set(
    (e || []).map((n) => String(n || "").trim()).filter(Boolean)
  );
  r.state.expandMode = "explicit", r.state.expandedGroups = t, r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh();
}
function An(r) {
  r.config.enableGroupedMode && (r.state.expandMode = "all", r.state.expandedGroups.clear(), r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh());
}
function En(r) {
  r.config.enableGroupedMode && (r.state.expandMode = "none", r.state.expandedGroups.clear(), r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh());
}
function Ln(r, e) {
  const t = r.tableEl?.querySelector("tbody");
  if (!t) return;
  const n = t.querySelector(`tr[data-group-id="${e}"]`);
  if (!n) return;
  const s = r.isGroupExpandedByState(e);
  n.dataset.expanded = String(s), n.setAttribute("aria-expanded", String(s));
  const o = n.querySelector(".expand-icon");
  o && (o.textContent = s ? "▼" : "▶"), t.querySelectorAll(`tr.group-child-row[data-group-id="${e}"]`).forEach((a) => {
    a.style.display = s ? "" : "none";
  });
}
function _n(r) {
  if (r.state.groupedData)
    for (const e of r.state.groupedData.groups)
      e.expanded = r.isGroupExpandedByState(e.groupId), r.updateGroupVisibility(e.groupId);
}
function Rn(r, e, t = !1) {
  const n = Y(r.state.expandMode, "explicit");
  return n === "all" ? !r.state.expandedGroups.has(e) : n === "none" ? r.state.expandedGroups.has(e) : r.state.expandedGroups.size === 0 ? t : r.state.expandedGroups.has(e);
}
function In(r, e) {
  if (!r.config.enableGroupedMode) {
    console.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const t = Ce(e);
  r.state.viewMode = t, t === "flat" && (r.state.groupedData = null), r.pushStateToURL(), r.refresh();
}
function Bn(r) {
  return r.state.viewMode;
}
function Mn(r) {
  return r.state.groupedData;
}
function Pn(r) {
  return {
    textCode: null,
    message: r,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function Tn(r) {
  const e = String(r.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", t = String(r.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (r.notifier?.confirm)
    return r.notifier.confirm(e, {
      title: t,
      confirmText: "Delete",
      cancelText: "Cancel"
    });
  const n = globalThis.window;
  return n && typeof n.confirm == "function" ? n.confirm(e) : !0;
}
async function yt(r) {
  if (!await Tn(r))
    return null;
  const t = await Ue(r.endpoint, {
    method: "DELETE",
    headers: {
      Accept: "application/json"
    }
  });
  if (t.success)
    return await r.onSuccess?.(t), t;
  const n = String(r.fallbackMessage || "Delete failed").trim() || "Delete failed", s = t.error || Pn(n), o = {
    ...s,
    message: q(s, n)
  };
  throw o.textCode && r.reconcileOnDomainFailure && await r.reconcileOnDomainFailure(o), await r.onError?.(o), W(o, n, !!r.onError);
}
function Dn(r, e, t = !1) {
  if (!r.tableEl) return;
  const n = new Set(e);
  r.state.hiddenColumns.clear(), r.config.columns.forEach((i) => {
    n.has(i.field) || r.state.hiddenColumns.add(i.field);
  }), t || r.pushStateToURL(), r.tableEl.querySelectorAll("thead th[data-column]").forEach((i) => {
    const a = i.dataset.column;
    a && (i.style.display = n.has(a) ? "" : "none");
  }), r.tableEl.querySelectorAll("tbody td[data-column]").forEach((i) => {
    const a = i.dataset.column;
    a && (i.style.display = n.has(a) ? "" : "none");
  }), r.syncColumnVisibilityCheckboxes();
}
function Fn(r) {
  if (r.columnManager) {
    r.columnManager.syncWithGridState();
    return;
  }
  const e = document.querySelector(r.selectors.columnToggleMenu);
  e && r.config.columns.forEach((t) => {
    const n = e.querySelector(
      `input[data-column="${t.field}"]`
    );
    n && (n.checked = !r.state.hiddenColumns.has(t.field));
  });
}
function qn(r, e) {
  const t = r.tableEl?.querySelector("tbody");
  if (!t) {
    console.error("[DataGrid] tbody not found!");
    return;
  }
  t.innerHTML = "";
  const n = e.data || e.records || [];
  console.log(`[DataGrid] renderData() called with ${n.length} items`), console.log("[DataGrid] First 3 items:", n.slice(0, 3));
  const s = r.getResponseTotal(e);
  if (r.state.totalRows = s ?? n.length, n.length === 0) {
    r.isGroupedViewActive() ? t.innerHTML = Jr(r.config.columns.length) : t.innerHTML = `
          <tr>
            <td colspan="${r.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
    return;
  }
  r.recordsById = {}, r.isGroupedViewActive() ? r.renderGroupedData(e, n, t) : r.renderFlatData(n, t), r.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((i) => {
    const a = i.dataset.column;
    a && r.state.hiddenColumns.has(a) && (i.style.display = "none");
  }), r.updateSelectionBindings();
}
function On(r, e, t) {
  e.forEach((n, s) => {
    console.log(`[DataGrid] Rendering row ${s + 1}: id=${n.id}`), n.id && (r.recordsById[n.id] = n);
    const o = r.createTableRow(n);
    t.appendChild(o);
  }), console.log(`[DataGrid] Finished appending ${e.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length);
}
function jn(r, e) {
  const t = e.rendererOptions ?? e.renderer_options;
  return !t || typeof t != "object" || Array.isArray(t) ? {} : t;
}
function zn(r, e) {
  const t = document.createElement("tr");
  let n = ["hover:bg-gray-50"];
  r.config.rowClassProvider && (n = n.concat(r.config.rowClassProvider(e))), t.className = n.join(" ");
  const s = document.createElement("td");
  s.className = "px-6 py-4 whitespace-nowrap", s.dataset.role = "selection", s.dataset.fixed = "left", s.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${e.id}">
        <span class="sr-only">Select</span>
      </label>
    `, t.appendChild(s), r.config.columns.forEach((a) => {
    const l = document.createElement("td");
    l.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", a.field);
    const c = e[a.field], d = typeof a.renderer == "string" ? a.renderer.trim() : "", p = {
      options: r.resolveRendererOptions(a)
    };
    if (a.render)
      l.innerHTML = a.render(c, e);
    else if (r.cellRendererRegistry.has(a.field)) {
      const h = r.cellRendererRegistry.get(a.field);
      l.innerHTML = h(c, e, a.field, p);
    } else if (d && r.cellRendererRegistry.has(d)) {
      const h = r.cellRendererRegistry.get(d);
      l.innerHTML = h(c, e, a.field, p);
    } else if (c == null)
      l.textContent = "-";
    else if (a.field.includes("_at")) {
      const h = Z(c);
      l.textContent = h ? h.toLocaleDateString() : String(c);
    } else
      l.textContent = String(c);
    t.appendChild(l);
  });
  const o = r.config.actionBasePath || r.config.apiEndpoint, i = document.createElement("td");
  if (i.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", i.dataset.role = "actions", i.dataset.fixed = "right", r.config.rowActions) {
    const a = r.config.rowActions(e);
    i.innerHTML = r.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
      const c = r.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
      l.disabled || d && d.addEventListener("click", async (p) => {
        if (p.preventDefault(), !d.disabled)
          try {
            await l.action(e);
          } catch (h) {
            if (console.error(`Action "${l.label}" failed:`, h), F(h)?.textCode && await r.refresh(), !R(h)) {
              const m = h instanceof Error ? h.message : `Action "${l.label}" failed`;
              r.notify(m, "error");
            }
          }
      });
    });
  } else if (r.config.useDefaultActions !== !1) {
    const a = [
      {
        label: "View",
        icon: "eye",
        action: () => {
          window.location.href = `${o}/${e.id}`;
        },
        variant: "secondary"
      },
      {
        label: "Edit",
        icon: "edit",
        action: () => {
          window.location.href = `${o}/${e.id}/edit`;
        },
        variant: "primary"
      },
      {
        label: "Delete",
        icon: "trash",
        action: async () => {
          await r.handleDelete(e.id);
        },
        variant: "danger"
      }
    ];
    i.innerHTML = r.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
      const c = r.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
      d && d.addEventListener("click", async (p) => {
        if (p.preventDefault(), p.stopPropagation(), !d.disabled)
          try {
            await l.action();
          } catch (h) {
            if (console.error(`Action "${l.label}" failed:`, h), F(h)?.textCode && await r.refresh(), !R(h)) {
              const m = h instanceof Error ? h.message : `Action "${l.label}" failed`;
              r.notify(m, "error");
            }
          }
      });
    });
  }
  return t.appendChild(i), t;
}
function Nn(r, e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function Gn(r, e) {
  try {
    await yt({
      endpoint: `${r.config.apiEndpoint}/${e}`,
      confirmMessage: "Are you sure you want to delete this item?",
      confirmTitle: "Confirm Delete",
      onSuccess: async () => {
        await r.refresh();
      },
      onError: (t) => {
        r.showError(q(t, "Delete failed"));
      },
      reconcileOnDomainFailure: async () => {
        await r.refresh();
      },
      notifier: {
        confirm: async (t, n) => r.confirmAction(t, n)
      }
    });
  } catch (t) {
    console.error("Error deleting item:", t), R(t) || r.showError(t instanceof Error ? t.message : "Failed to delete item");
  }
}
function Un(r, e) {
  const t = r.getResponseTotal(e) ?? r.state.totalRows, n = r.state.perPage * (r.state.currentPage - 1), s = t === 0 ? 0 : n + 1, o = Math.min(n + r.state.perPage, t), i = document.querySelector(r.selectors.tableInfoStart), a = document.querySelector(r.selectors.tableInfoEnd), l = document.querySelector(r.selectors.tableInfoTotal);
  i && (i.textContent = String(s)), a && (a.textContent = String(o)), l && (l.textContent = String(t)), r.renderPaginationButtons(t);
}
function Hn(r, e) {
  const t = document.querySelector(r.selectors.paginationContainer);
  if (!t) return;
  const n = Math.ceil(e / r.state.perPage);
  if (n <= 1) {
    t.innerHTML = "";
    return;
  }
  const s = [], o = r.state.currentPage;
  s.push(`
      <button type="button"
              data-page="${o - 1}"
              ${o === 1 ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);
  const i = 5;
  let a = Math.max(1, o - Math.floor(i / 2)), l = Math.min(n, a + i - 1);
  l - a < i - 1 && (a = Math.max(1, l - i + 1));
  for (let c = a; c <= l; c++) {
    const d = c === o;
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
              data-page="${o + 1}"
              ${o === n ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), t.innerHTML = s.join(""), t.querySelectorAll("[data-page]").forEach((c) => {
    c.addEventListener("click", async () => {
      const d = parseInt(c.dataset.page || "1", 10);
      d >= 1 && d <= n && (r.state.currentPage = d, r.pushStateToURL(), r.config.behaviors?.pagination ? await r.config.behaviors.pagination.onPageChange(d, r) : await r.refresh());
    });
  });
}
class Vn {
  constructor(e) {
    this.sortable = null, this.searchInput = null, this.columnListEl = null, this.countBadgeEl = null, this.container = e.container, this.grid = e.grid, this.onReorder = e.onReorder, this.onToggle = e.onToggle, this.onReset = e.onReset, this.initialize();
  }
  initialize() {
    this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  /**
   * Render column items using safe DOM construction
   * Uses textContent for labels to prevent XSS
   */
  render() {
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns;
    this.container.innerHTML = "";
    const n = this.createHeader(e.length, e.length - t.size);
    this.container.appendChild(n);
    const s = document.createElement("div");
    s.className = "column-list", s.setAttribute("role", "list"), s.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = s, e.forEach((i) => {
      const a = this.createColumnItem(i.field, i.label || i.field, !t.has(i.field));
      s.appendChild(a);
    }), this.container.appendChild(s);
    const o = this.createFooter();
    this.container.appendChild(o);
  }
  /**
   * Create header with search input and count badge
   */
  createHeader(e, t) {
    const n = document.createElement("div");
    n.className = "column-manager-header";
    const s = document.createElement("div");
    s.className = "column-search-container";
    const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    o.setAttribute("class", "column-search-icon"), o.setAttribute("viewBox", "0 0 24 24"), o.setAttribute("fill", "none"), o.setAttribute("stroke", "currentColor"), o.setAttribute("stroke-width", "2");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    i.setAttribute("cx", "11"), i.setAttribute("cy", "11"), i.setAttribute("r", "8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "m21 21-4.3-4.3"), o.appendChild(i), o.appendChild(a);
    const l = document.createElement("input");
    l.type = "text", l.className = "column-search-input", l.placeholder = "Filter columns...", l.setAttribute("aria-label", "Filter columns"), this.searchInput = l, l.addEventListener("input", () => {
      this.filterColumns(l.value);
    }), s.appendChild(o), s.appendChild(l);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, n.appendChild(s), n.appendChild(c), n;
  }
  /**
   * Filter columns by search term
   */
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((s) => {
      const o = s.querySelector(".column-label")?.textContent?.toLowerCase() || "", i = t === "" || o.includes(t);
      s.style.display = i ? "" : "none";
    }), this.updateScrollShadows();
  }
  /**
   * Update the count badge
   */
  updateCountBadge() {
    if (!this.countBadgeEl) return;
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns, n = e.length - t.size;
    this.countBadgeEl.textContent = `${n} of ${e.length}`;
  }
  /**
   * Setup scroll shadow detection on the column list
   */
  setupScrollShadows() {
    if (!this.columnListEl) return;
    this.updateScrollShadows(), this.columnListEl.addEventListener("scroll", () => {
      this.updateScrollShadows();
    }), new ResizeObserver(() => {
      this.updateScrollShadows();
    }).observe(this.columnListEl);
  }
  /**
   * Update scroll shadow classes based on scroll position
   */
  updateScrollShadows() {
    if (!this.columnListEl) return;
    const e = this.columnListEl, t = e.scrollTop, n = e.scrollHeight, s = e.clientHeight, o = n > s, i = o && t > 0, a = o && t + s < n - 1;
    e.classList.toggle("column-list--shadow-top", i), e.classList.toggle("column-list--shadow-bottom", a);
  }
  /**
   * Create footer with Reset to Default button
   */
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    n.setAttribute("class", "column-reset-icon"), n.setAttribute("viewBox", "0 0 24 24"), n.setAttribute("fill", "none"), n.setAttribute("stroke", "currentColor"), n.setAttribute("stroke-width", "2"), n.setAttribute("stroke-linecap", "round"), n.setAttribute("stroke-linejoin", "round");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
    o.setAttribute("d", "M3 3v5h5"), n.appendChild(s), n.appendChild(o);
    const i = document.createElement("span");
    return i.textContent = "Reset to Default", t.appendChild(n), t.appendChild(i), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  /**
   * Handle reset button click
   */
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.(), this.searchInput && (this.searchInput.value = "", this.filterColumns("")), this.updateCountBadge();
  }
  /**
   * Create a single column item element
   * Uses DOM APIs with textContent for safe label rendering
   * Includes full ARIA support for accessibility
   */
  createColumnItem(e, t, n) {
    const s = `column-item-${e}`, o = `column-switch-${e}`, i = document.createElement("div");
    i.className = "column-item", i.id = s, i.dataset.column = e, i.setAttribute("role", "listitem");
    const a = document.createElement("div");
    a.className = "column-item-content";
    const l = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    l.setAttribute("class", "drag-handle"), l.setAttribute("viewBox", "0 0 20 20"), l.setAttribute("fill", "currentColor"), l.setAttribute("aria-hidden", "true"), l.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([y, v]) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", String(y)), g.setAttribute("cy", String(v)), g.setAttribute("r", "1.5"), l.appendChild(g);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${s}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const p = document.createElement("label");
    p.className = "column-switch", p.htmlFor = o;
    const h = document.createElement("input");
    h.type = "checkbox", h.id = o, h.dataset.column = e, h.checked = n, h.setAttribute("role", "switch"), h.setAttribute("aria-checked", String(n)), h.setAttribute("aria-labelledby", `${s}-label`), h.setAttribute("aria-describedby", `${s}-desc`);
    const f = document.createElement("span");
    f.id = `${s}-desc`, f.className = "sr-only", f.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${n ? "visible" : "hidden"}.`;
    const m = document.createElement("span");
    return m.className = "column-switch-slider", m.setAttribute("aria-hidden", "true"), p.appendChild(h), p.appendChild(m), i.appendChild(a), i.appendChild(p), i.appendChild(f), i;
  }
  /**
   * Setup SortableJS for drag-and-drop reordering
   */
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = Jt.create(e, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "column-item-ghost",
      dragClass: "column-item-drag",
      chosenClass: "column-item-chosen",
      // Touch handling for mobile
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: !0,
      onEnd: () => {
        const t = e.querySelectorAll(".column-item"), n = Array.from(t).map(
          (s) => s.dataset.column
        );
        this.onReorder && this.onReorder(n), this.grid.reorderColumns(n), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(n, this.grid);
      }
    });
  }
  /**
   * Bind change events for visibility switches
   * Includes ARIA state updates for accessibility
   */
  bindSwitchToggles() {
    this.container.querySelectorAll('input[type="checkbox"]').forEach((t) => {
      t.addEventListener("change", () => {
        const n = t.dataset.column;
        if (!n) return;
        const s = t.checked;
        t.setAttribute("aria-checked", String(s));
        const o = `column-item-${n}-desc`, i = this.container.querySelector(`#${o}`);
        if (i) {
          const a = this.container.querySelector(`#column-item-${n}-label`)?.textContent || n;
          i.textContent = `Press Space or Enter to toggle ${a} column visibility. Currently ${s ? "visible" : "hidden"}.`;
        }
        this.onToggle && this.onToggle(n, s), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(n, this.grid), this.updateCountBadge();
      });
    });
  }
  /**
   * Update the switch state for a specific column
   * Called when visibility changes externally (e.g., URL restore)
   * Also updates ARIA attributes for accessibility
   */
  updateSwitchState(e, t) {
    const n = this.container.querySelector(
      `input[type="checkbox"][data-column="${e}"]`
    );
    n && (n.checked = t, n.setAttribute("aria-checked", String(t)));
  }
  /**
   * Sync all switch states with current grid state
   */
  syncWithGridState() {
    const e = this.grid.state.hiddenColumns;
    this.grid.config.columns.forEach((t) => {
      this.updateSwitchState(t.field, !e.has(t.field));
    }), this.updateCountBadge();
  }
  /**
   * Get the current column order from the DOM
   */
  getColumnOrder() {
    const e = this.container.querySelectorAll(".column-item");
    return Array.from(e).map((t) => t.dataset.column);
  }
  /**
   * Re-render the column list (e.g., after columns change)
   */
  refresh() {
    this.destroy(), this.render(), this.setupDragAndDrop(), this.bindSwitchToggles(), this.setupScrollShadows();
  }
  /**
   * Cleanup - destroy SortableJS instance
   */
  destroy() {
    this.sortable && (this.sortable.destroy(), this.sortable = null);
  }
}
function Kn(r, e, t, n, s) {
  const o = (i) => {
    const a = i.target;
    if (!a)
      return;
    const l = a.closest(t);
    !l || !(l instanceof HTMLElement) || n(i, l);
  };
  return r.addEventListener(e, o, s), () => r.removeEventListener(e, o, s);
}
function Jn(r) {
  const e = document.querySelector(r.selectors.searchInput);
  if (!e) {
    console.warn(`[DataGrid] Search input not found: ${r.selectors.searchInput}`);
    return;
  }
  console.log(`[DataGrid] Search input bound to: ${r.selectors.searchInput}`);
  const t = document.getElementById("clear-search-btn"), n = () => {
    t && (e.value.trim() ? t.classList.remove("hidden") : t.classList.add("hidden"));
  };
  e.addEventListener("input", () => {
    n(), r.searchTimeout && clearTimeout(r.searchTimeout), r.searchTimeout = window.setTimeout(async () => {
      console.log(`[DataGrid] Search triggered: "${e.value}"`), r.state.search = e.value, r.pushStateToURL(), r.config.behaviors?.search ? await r.config.behaviors.search.onSearch(e.value, r) : (r.resetPagination(), await r.refresh());
    }, r.config.searchDelay);
  }), t && t.addEventListener("click", async () => {
    e.value = "", e.focus(), n(), r.state.search = "", r.pushStateToURL(), r.config.behaviors?.search ? await r.config.behaviors.search.onSearch("", r) : (r.resetPagination(), await r.refresh());
  }), n();
}
function Yn(r) {
  const e = document.querySelector(r.selectors.perPageSelect);
  e && e.addEventListener("change", async () => {
    r.state.perPage = parseInt(e.value, 10), r.resetPagination(), r.pushStateToURL(), await r.refresh();
  });
}
function Qn(r) {
  document.querySelectorAll(r.selectors.filterRow).forEach((t) => {
    const n = async () => {
      const s = t.dataset.filterColumn, o = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", i = t instanceof HTMLSelectElement ? "eq" : o === "" || o === "text" || o === "search" || o === "email" || o === "tel" || o === "url" ? "ilike" : "eq", a = t.dataset.filterOperator || i, l = t.value;
      if (!s) return;
      const c = r.state.filters.findIndex((d) => d.column === s);
      if (l) {
        const d = { column: s, operator: a, value: l };
        c >= 0 ? r.state.filters[c] = d : r.state.filters.push(d);
      } else
        c >= 0 && r.state.filters.splice(c, 1);
      r.pushStateToURL(), r.config.behaviors?.filter ? await r.config.behaviors.filter.onFilterChange(s, l, r) : (r.resetPagination(), await r.refresh());
    };
    t.addEventListener("input", n), t.addEventListener("change", n);
  });
}
function Wn(r) {
  const e = document.querySelector(r.selectors.columnToggleBtn), t = document.querySelector(r.selectors.columnToggleMenu);
  !e || !t || (r.columnManager = new Vn({
    container: t,
    grid: r,
    onToggle: (n, s) => {
      console.log(`[DataGrid] Column ${n} visibility toggled to ${s}`);
    },
    onReorder: (n) => {
      console.log("[DataGrid] Columns reordered:", n);
    }
  }));
}
function Xn(r) {
  const e = document.querySelector(r.selectors.exportMenu);
  if (!e) return;
  const t = e.querySelectorAll("[data-export-format]");
  t.forEach((n) => {
    n.addEventListener("click", async () => {
      const s = n.dataset.exportFormat;
      if (!s || !r.config.behaviors?.export) return;
      const o = r.config.behaviors.export.getConcurrency?.() || "single", i = [];
      o === "single" ? t.forEach((d) => i.push(d)) : o === "per-format" && i.push(n);
      const a = (d) => {
        const p = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
        p && p.classList.add("hidden"), h && h.classList.remove("hidden");
      }, l = (d) => {
        const p = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
        p && p.classList.remove("hidden"), h && h.classList.add("hidden");
      };
      i.forEach((d) => {
        d.setAttribute("data-export-loading", "true"), d.disabled = !0, a(d);
      });
      const c = o === "none";
      c && (n.setAttribute("data-export-loading", "true"), a(n));
      try {
        await r.config.behaviors.export.export(s, r);
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
function Zn(r) {
  if (!r.tableEl) return;
  r.tableEl.querySelectorAll("[data-sort-column]").forEach((n) => {
    n.addEventListener("click", async (s) => {
      s.preventDefault(), s.stopPropagation();
      const o = n.dataset.sortColumn;
      if (!o) return;
      console.log(`[DataGrid] Sort button clicked for field: ${o}`);
      const i = r.state.sort.find((l) => l.field === o);
      let a = null;
      i ? i.direction === "asc" ? (a = "desc", i.direction = a) : (r.state.sort = r.state.sort.filter((l) => l.field !== o), a = null, console.log(`[DataGrid] Sort cleared for field: ${o}`)) : (a = "asc", r.state.sort = [{ field: o, direction: a }]), console.log("[DataGrid] New sort state:", r.state.sort), r.pushStateToURL(), a !== null && r.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await r.config.behaviors.sort.onSort(o, a, r)) : (console.log("[DataGrid] Calling refresh() for sort"), await r.refresh()), console.log("[DataGrid] Updating sort indicators"), r.updateSortIndicators();
    });
  }), r.tableEl.querySelectorAll("[data-sort]").forEach((n) => {
    n.addEventListener("click", async () => {
      const s = n.dataset.sort;
      if (!s) return;
      const o = r.state.sort.find((a) => a.field === s);
      let i = null;
      o ? o.direction === "asc" ? (i = "desc", o.direction = i) : (r.state.sort = r.state.sort.filter((a) => a.field !== s), i = null) : (i = "asc", r.state.sort = [{ field: s, direction: i }]), r.pushStateToURL(), i !== null && r.config.behaviors?.sort ? await r.config.behaviors.sort.onSort(s, i, r) : await r.refresh(), r.updateSortIndicators();
    });
  });
}
function es(r) {
  if (!r.tableEl) return;
  r.tableEl.querySelectorAll("[data-sort-column]").forEach((n) => {
    const s = n.dataset.sortColumn;
    if (!s) return;
    const o = r.state.sort.find((a) => a.field === s), i = n.querySelector("svg");
    i && (o ? (n.classList.remove("opacity-0"), n.classList.add("opacity-100"), o.direction === "asc" ? (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', i.classList.add("text-blue-600"), i.classList.remove("text-gray-400")) : (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', i.classList.add("text-blue-600"), i.classList.remove("text-gray-400"))) : (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', i.classList.remove("text-blue-600"), i.classList.add("text-gray-400")));
  }), r.tableEl.querySelectorAll("[data-sort]").forEach((n) => {
    const s = n.dataset.sort, o = r.state.sort.find((a) => a.field === s), i = n.querySelector(".sort-indicator");
    i && (i.textContent = o ? o.direction === "asc" ? "↑" : "↓" : "");
  });
}
function ts(r) {
  const e = document.querySelector(r.selectors.selectAllCheckbox);
  e && e.addEventListener("change", () => {
    document.querySelectorAll(r.selectors.rowCheckboxes).forEach((n) => {
      n.checked = e.checked;
      const s = n.dataset.id;
      s && (e.checked ? r.state.selectedRows.add(s) : r.state.selectedRows.delete(s));
    }), r.updateBulkActionsBar();
  }), r.updateSelectionBindings();
}
function rs(r) {
  document.querySelectorAll(r.selectors.rowCheckboxes).forEach((t) => {
    const n = t.dataset.id;
    n && (t.checked = r.state.selectedRows.has(n)), t.addEventListener("change", () => {
      n && (t.checked ? r.state.selectedRows.add(n) : r.state.selectedRows.delete(n)), r.updateBulkActionsBar();
    });
  });
}
function vt() {
  return Array.from(document.querySelectorAll("[data-bulk-action]"));
}
function ns(r) {
  if (!r)
    return null;
  let e = r.querySelector("[data-bulk-action-state-reasons]");
  return e || (e = document.createElement("div"), e.dataset.bulkActionStateReasons = "true", e.className = "hidden mt-3 text-sm text-gray-700", r.appendChild(e), e);
}
function wt(r) {
  const e = document.getElementById("bulk-actions-overlay"), t = ns(e);
  if (t) {
    if (!r.length) {
      t.classList.add("hidden"), t.innerHTML = "";
      return;
    }
    t.classList.remove("hidden"), t.innerHTML = r.map((n) => `
    <div data-bulk-action-reason-item="${n.actionId}" class="mt-1">
      <span class="font-medium">${n.label}:</span> ${n.reason}
    </div>
  `).join("");
  }
}
function ss(r, e, t) {
  const n = e?.enabled === !1, s = typeof e?.reason == "string" ? e.reason.trim() : "";
  return r.dataset.disabled = n ? "true" : "false", r.setAttribute("aria-disabled", n ? "true" : "false"), r.dataset.bulkState = n ? "disabled" : "enabled", r.classList.toggle("opacity-50", n), r.classList.toggle("cursor-not-allowed", n), n && s ? (r.setAttribute("title", s), {
    actionId: r.dataset.bulkAction || "",
    label: t,
    reason: s
  }) : (r.removeAttribute("title"), null);
}
function os(r) {
  const e = vt(), t = "Checking selected records...", n = [];
  e.forEach((s) => {
    s.dataset.disabled = "true", s.dataset.bulkState = "loading", s.setAttribute("aria-disabled", "true"), s.setAttribute("title", t), s.classList.add("opacity-50", "cursor-not-allowed"), n.push({
      actionId: s.dataset.bulkAction || "",
      label: s.textContent?.trim() || s.dataset.bulkAction || "Action",
      reason: t
    });
  }), wt(n);
}
function xt(r) {
  return Ye(r.bulkActionStateConfig);
}
function is(r, e, t) {
  r.bulkActionState = Je(e), r.bulkActionStateConfig = Ye(t), r.applyBulkActionState(r.bulkActionState);
}
function as(r, e) {
  const t = Je(e);
  r.bulkActionState = t;
  const n = [];
  vt().forEach((s) => {
    const o = s.dataset.bulkAction;
    if (!o)
      return;
    const i = ss(
      s,
      t[o] || null,
      s.textContent?.trim() || o
    );
    i && n.push(i);
  }), wt(n);
}
async function ls(r) {
  const e = xt(r), t = typeof e?.selection_state_endpoint == "string" ? e.selection_state_endpoint.trim() : "";
  if (!t) {
    r.applyBulkActionState(r.bulkActionState);
    return;
  }
  const n = Array.from(r.state.selectedRows);
  if (!n.length) {
    r.applyBulkActionState(r.bulkActionState);
    return;
  }
  r.bulkActionStateAbortController && r.bulkActionStateAbortController.abort(), r.bulkActionStateAbortController = new AbortController(), r.bulkActionStateRequestSeq += 1;
  const s = r.bulkActionStateRequestSeq, o = typeof r.buildQueryString == "function" ? r.buildQueryString() : "", i = o ? `${t}${t.includes("?") ? "&" : "?"}${o}` : t;
  try {
    const a = await $(i, {
      method: "POST",
      signal: r.bulkActionStateAbortController.signal,
      json: { ids: n }
    });
    if (!a.ok)
      throw new Error(`Bulk action state request failed: ${a.status}`);
    const l = Ht(await a.json());
    if (!l || s !== r.bulkActionStateRequestSeq)
      return;
    r.applyBulkActionState({
      ...r.bulkActionState,
      ...l.bulk_action_state
    });
  } catch (a) {
    if (a instanceof Error && a.name === "AbortError")
      return;
    console.warn("[DataGrid] Failed to refresh selection-sensitive bulk action state:", a), s === r.bulkActionStateRequestSeq && r.applyBulkActionState(r.bulkActionState);
  }
}
function cs(r) {
  r.bulkActionStateDebounce && (clearTimeout(r.bulkActionStateDebounce), r.bulkActionStateDebounce = null);
  const e = xt(r), t = r.state.selectedRows.size;
  if (!e?.selection_sensitive || !e.selection_state_endpoint || t === 0) {
    r.bulkActionStateAbortController && (r.bulkActionStateAbortController.abort(), r.bulkActionStateAbortController = null), r.applyBulkActionState(r.bulkActionState);
    return;
  }
  os();
  const n = typeof e.debounce_ms == "number" ? e.debounce_ms : 150;
  r.bulkActionStateDebounce = window.setTimeout(() => {
    r.bulkActionStateDebounce = null, ls(r);
  }, n);
}
function ds(r) {
  const t = document.getElementById("bulk-actions-overlay")?.dataset?.bulkBase || "";
  document.querySelectorAll("[data-bulk-action]").forEach((o) => {
    o.addEventListener("click", async () => {
      const i = o, a = i.dataset.bulkAction;
      if (!a || i.getAttribute("aria-disabled") === "true" || i.dataset.disabled === "true")
        return;
      const l = Array.from(r.state.selectedRows);
      if (l.length === 0) {
        r.notify("Please select items first", "warning");
        return;
      }
      if (r.config.bulkActions) {
        const c = r.config.bulkActions.find((d) => d.id === a);
        if (c) {
          try {
            await r.actionRenderer.executeBulkAction(c, l), r.state.selectedRows.clear(), r.updateBulkActionsBar(), await r.refresh();
          } catch (d) {
            console.error("Bulk action failed:", d), F(d)?.textCode && await r.refresh(), R(d) || r.showError(d instanceof Error ? d.message : "Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const c = `${t}/${a}`, d = i.dataset.bulkConfirm, p = r.parseDatasetStringArray(i.dataset.bulkPayloadRequired), h = r.parseDatasetObject(i.dataset.bulkPayloadSchema), f = {
          id: a,
          label: i.textContent?.trim() || a,
          endpoint: c,
          confirm: d,
          payloadRequired: p,
          payloadSchema: h
        };
        try {
          await r.actionRenderer.executeBulkAction(f, l), r.state.selectedRows.clear(), r.updateBulkActionsBar(), await r.refresh();
        } catch (m) {
          console.error("Bulk action failed:", m), F(m)?.textCode && await r.refresh(), R(m) || r.showError(m instanceof Error ? m.message : "Bulk action failed");
        }
        return;
      }
      if (r.config.behaviors?.bulkActions)
        try {
          await r.config.behaviors.bulkActions.execute(a, l, r), r.state.selectedRows.clear(), r.updateBulkActionsBar();
        } catch (c) {
          console.error("Bulk action failed:", c), F(c)?.textCode && await r.refresh(), R(c) || r.showError(c instanceof Error ? c.message : "Bulk action failed");
        }
    });
  });
  const s = document.getElementById("clear-selection-btn");
  s && s.addEventListener("click", () => {
    r.state.selectedRows.clear(), r.updateBulkActionsBar(), document.querySelectorAll(".table-checkbox").forEach((a) => a.checked = !1);
    const i = document.querySelector(r.selectors.selectAllCheckbox);
    i && (i.checked = !1);
  }), r.bindOverflowMenu();
}
function us(r) {
  const e = document.getElementById("bulk-more-btn"), t = document.getElementById("bulk-overflow-menu");
  !e || !t || (e.addEventListener("click", (n) => {
    n.stopPropagation(), t.classList.toggle("hidden");
  }), document.addEventListener("click", () => {
    t.classList.add("hidden");
  }), document.addEventListener("keydown", (n) => {
    n.key === "Escape" && t.classList.add("hidden");
  }), t.addEventListener("click", (n) => {
    n.stopPropagation();
  }));
}
function ps(r) {
  const e = document.getElementById("bulk-actions-overlay"), t = document.getElementById("selected-count"), n = r.state.selectedRows.size;
  if (console.log("[DataGrid] updateBulkActionsBar - overlay:", e, "countEl:", t, "count:", n), !e || !t) {
    console.error("[DataGrid] Missing bulk actions elements!");
    return;
  }
  t.textContent = String(n), n > 0 ? (e.classList.remove("hidden"), e.offsetHeight) : e.classList.add("hidden"), r.syncBulkActionState();
}
function hs(r) {
  const e = document.getElementById("bulk-clear-selection");
  console.log("[DataGrid] Binding clear button:", e), e ? e.addEventListener("click", () => {
    console.log("[DataGrid] Clear button clicked!"), r.clearSelection();
  }) : console.error("[DataGrid] Clear button not found!");
}
function fs(r) {
  console.log("[DataGrid] Clearing selection..."), r.state.selectedRows.clear();
  const e = document.querySelector(r.selectors.selectAllCheckbox);
  e && (e.checked = !1), r.updateBulkActionsBar(), r.updateSelectionBindings();
}
function ms(r, e, t) {
  const n = e.getBoundingClientRect(), s = t.offsetHeight || 300, i = window.innerHeight - n.bottom, a = n.top, l = i < s && a > i, c = n.right - (t.offsetWidth || 224);
  t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${n.top - s - 8}px`, t.style.bottom = "auto") : (t.style.top = `${n.bottom + 8}px`, t.style.bottom = "auto");
}
function gs(r) {
  r.dropdownAbortController && r.dropdownAbortController.abort(), r.dropdownAbortController = new AbortController();
  const { signal: e } = r.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
    const n = t.dataset.dropdownToggle, s = document.getElementById(n || "");
    s && !s.classList.contains("hidden") && s.classList.add("hidden");
  }), Kn(document, "click", "[data-dropdown-toggle]", (t, n) => {
    t.stopPropagation();
    const s = n.dataset.dropdownToggle, o = document.getElementById(s || "");
    o && (document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
      const a = i.dataset.dropdownToggle, l = document.getElementById(a || "");
      l && l !== o && l.classList.add("hidden");
    }), o.classList.toggle("hidden"));
  }, { signal: e }), document.addEventListener("click", (t) => {
    const n = t.target.closest("[data-dropdown-trigger]");
    if (n) {
      t.stopPropagation();
      const o = n.closest("[data-dropdown]")?.querySelector(".actions-menu");
      document.querySelectorAll(".actions-menu").forEach((a) => {
        a !== o && a.classList.add("hidden");
      });
      const i = o?.classList.contains("hidden");
      o?.classList.toggle("hidden"), n.setAttribute("aria-expanded", i ? "true" : "false"), i && o && r.positionDropdownMenu(n, o);
    } else
      t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
        (o) => o.classList.add("hidden")
      ), document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
        const i = o.dataset.dropdownToggle, a = document.getElementById(i || "");
        a && a.classList.add("hidden");
      }));
  }, { signal: e }), document.addEventListener("keydown", (t) => {
    t.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((n) => {
      n.classList.add("hidden");
      const s = n.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
      s && s.setAttribute("aria-expanded", "false");
    }), document.querySelectorAll("[data-dropdown-toggle]").forEach((n) => {
      const s = n.dataset.dropdownToggle, o = document.getElementById(s || "");
      o && o.classList.add("hidden");
    }));
  }, { signal: e });
}
function bs(r, e) {
  console.error(e), r.notifier.error(e);
}
function ys(r, e, t) {
  r.notifier.show({ message: e, type: t });
}
async function vs(r, e) {
  return r.notifier.confirm(e);
}
async function ws(r, e) {
  return e instanceof Response ? qt(e) : e instanceof Error ? e.message : "An unexpected error occurred";
}
function xs(r, e) {
  if (e)
    try {
      const t = JSON.parse(e);
      if (!Array.isArray(t))
        return;
      const n = t.map((s) => typeof s == "string" ? s.trim() : "").filter((s) => s.length > 0);
      return n.length > 0 ? n : void 0;
    } catch (t) {
      console.warn("[DataGrid] Failed to parse bulk payload_required:", t);
      return;
    }
}
function Ss(r, e) {
  if (e)
    try {
      const t = JSON.parse(e);
      return !t || typeof t != "object" || Array.isArray(t) ? void 0 : t;
    } catch (t) {
      console.warn("[DataGrid] Failed to parse bulk payload_schema:", t);
      return;
    }
}
function Cs(r, e) {
  if (!r.tableEl) return;
  const t = r.mergeColumnOrder(e);
  r.state.columnOrder = t;
  const n = new Map(r.config.columns.map((s) => [s.field, s]));
  r.config.columns = t.map((s) => n.get(s)).filter((s) => s !== void 0), r.reorderTableColumns(t), r.persistStateSnapshot(), console.log("[DataGrid] Columns reordered:", t);
}
function $s(r) {
  r.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), r.config.columns = r.defaultColumns.map((t) => ({ ...t })), r.state.columnOrder = r.config.columns.map((t) => t.field);
  const e = r.config.columns.filter((t) => !t.hidden).map((t) => t.field);
  r.tableEl ? (r.reorderTableColumns(r.state.columnOrder), r.updateColumnVisibility(e)) : (r.state.hiddenColumns = new Set(
    r.config.columns.filter((t) => t.hidden).map((t) => t.field)
  ), r.persistStateSnapshot()), r.columnManager && (r.columnManager.refresh(), r.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
}
function ks(r, e) {
  const t = new Set(r.config.columns.map((i) => i.field)), n = new Set(e), s = e.filter((i) => t.has(i)), o = r.config.columns.map((i) => i.field).filter((i) => !n.has(i));
  return [...s, ...o];
}
function As(r, e) {
  if (!r.tableEl) return;
  const t = r.tableEl.querySelector("thead tr:first-child");
  t && r.reorderRowCells(t, e, "th");
  const n = r.tableEl.querySelector("#filter-row");
  n && r.reorderRowCells(n, e, "th"), r.tableEl.querySelectorAll("tbody tr").forEach((o) => {
    r.reorderRowCells(o, e, "td");
  });
}
function Es(r, e, t, n) {
  const s = Array.from(e.querySelectorAll(`${n}[data-column]`)), o = new Map(
    s.map((d) => [d.dataset.column, d])
  ), i = Array.from(e.querySelectorAll(n)), a = e.querySelector(`${n}[data-role="selection"]`) || i.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${n}[data-role="actions"]`) || i.find(
    (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
  ), c = [];
  a && c.push(a), t.forEach((d) => {
    const p = o.get(d);
    p && c.push(p);
  }), l && c.push(l), c.forEach((d) => {
    e.appendChild(d);
  });
}
const S = class S {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.bulkActionState = {}, this.bulkActionStateConfig = null, this.bulkActionStateDebounce = null, this.bulkActionStateAbortController = null, this.bulkActionStateRequestSeq = 0, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new O(), this.selectors = {
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
    this.stateStore = this.config.stateStore || Er({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const n = this.stateStore.loadPersistedState(), s = new Set(this.config.columns.map((w) => w.field)), o = new Set(
      this.config.columns.filter((w) => w.hidden).map((w) => w.field)
    ), i = !!n && Array.isArray(n.hiddenColumns);
    this.hasPersistedHiddenColumnState = i;
    const a = new Set(
      (n?.hiddenColumns || []).filter((w) => s.has(w))
    ), l = this.config.columns.map((w) => w.field), c = !!n && Array.isArray(n.columnOrder) && n.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = c;
    const d = (n?.columnOrder || []).filter((w) => s.has(w)), p = c ? [...d, ...l.filter((w) => !d.includes(w))] : l, h = this.config.enableGroupedMode ? jr(t) : !1, f = this.config.enableGroupedMode ? Nr(t) : null, m = this.config.enableGroupedMode ? Or(t) : "explicit", y = this.config.enableGroupedMode ? qr(t) : /* @__PURE__ */ new Set(), v = Y(
      n?.expandMode,
      m
    ), g = new Set(
      (n?.expandedGroups || Array.from(y)).map((w) => String(w).trim()).filter(Boolean)
    ), x = this.config.enableGroupedMode ? n?.expandMode !== void 0 || g.size > 0 || h : !1, C = (this.config.enableGroupedMode ? n?.viewMode || f : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: i ? a : o,
      columnOrder: p,
      viewMode: C,
      expandMode: v,
      groupedData: null,
      expandedGroups: g,
      hasPersistedExpandState: x
    }, this.actionRenderer = new Xt({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
    }), this.cellRendererRegistry = new br(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([w, z]) => {
      this.cellRendererRegistry.register(w, z);
    }), this.defaultColumns = this.config.columns.map((w) => ({ ...w }));
  }
  init() {
    if (console.log("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log("[DataGrid] Table element found:", this.tableEl), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refresh(), typeof this.stateStore.hydrate == "function" && this.stateStore.hydrate().then(() => {
      if (this.hasURLStateOverrides)
        return;
      const e = this.stateStore.loadPersistedState();
      e && (this.applyPersistedStateSnapshot(e, { merge: !0 }), this.applyRestoredState(), this.pushStateToURL({ replace: !0 }), this.refresh());
    }).catch(() => {
    });
  }
  getURLStateConfig() {
    return Wr(this);
  }
  parseJSONArray(e, t) {
    return Xr(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    Zr(this, e, t);
  }
  applyShareStateSnapshot(e) {
    en(this, e);
  }
  buildPersistedStateSnapshot() {
    return tn(this);
  }
  buildShareStateSnapshot() {
    return rn(this);
  }
  persistStateSnapshot() {
    nn(this);
  }
  restoreStateFromURL() {
    sn(this);
  }
  applyRestoredState() {
    on(this);
  }
  pushStateToURL(e = {}) {
    an(this, e);
  }
  syncURL() {
    this.pushStateToURL();
  }
  async refresh() {
    return ln(this);
  }
  buildApiUrl() {
    return cn(this);
  }
  buildQueryString() {
    return dn(this);
  }
  buildQueryParams() {
    return un(this);
  }
  getResponseTotal(e) {
    return pn(this, e);
  }
  normalizePagination(e) {
    return hn(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    Dn(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    Fn(this);
  }
  renderData(e) {
    qn(this, e);
  }
  renderFlatData(e, t) {
    On(this, e, t);
  }
  renderGroupedData(e, t, n) {
    vn(this, e, t, n);
  }
  isGroupedViewActive() {
    return wn(this);
  }
  fallbackGroupedMode(e) {
    xn(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return Sn(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return Cn(this, e);
  }
  toggleGroup(e) {
    $n(this, e);
  }
  setExpandedGroups(e) {
    kn(this, e);
  }
  expandAllGroups() {
    An(this);
  }
  collapseAllGroups() {
    En(this);
  }
  updateGroupVisibility(e) {
    Ln(this, e);
  }
  updateGroupedRowsFromState() {
    _n(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Rn(this, e, t);
  }
  setViewMode(e) {
    In(this, e);
  }
  getViewMode() {
    return Bn(this);
  }
  getGroupedData() {
    return Mn(this);
  }
  async fetchDetail(e) {
    return fn(this, e);
  }
  getSchema() {
    return gn(this);
  }
  getForm() {
    return bn(this);
  }
  getTabs() {
    return yn(this);
  }
  normalizeDetailResponse(e) {
    return mn(this, e);
  }
  resolveRendererOptions(e) {
    return jn(this, e);
  }
  createTableRow(e) {
    return zn(this, e);
  }
  sanitizeActionId(e) {
    return Nn(this, e);
  }
  async handleDelete(e) {
    return Gn(this, e);
  }
  updatePaginationUI(e) {
    Un(this, e);
  }
  renderPaginationButtons(e) {
    Hn(this, e);
  }
  bindSearchInput() {
    Jn(this);
  }
  bindPerPageSelect() {
    Yn(this);
  }
  bindFilterInputs() {
    Qn(this);
  }
  bindColumnVisibility() {
    Wn(this);
  }
  bindExportButtons() {
    Xn(this);
  }
  bindSorting() {
    Zn(this);
  }
  updateSortIndicators() {
    es(this);
  }
  bindSelection() {
    ts(this);
  }
  updateSelectionBindings() {
    rs(this);
  }
  bindBulkActions() {
    ds(this);
  }
  bindOverflowMenu() {
    us();
  }
  updateBulkActionsBar() {
    ps(this);
  }
  setBulkActionState(e, t) {
    is(this, e, t);
  }
  applyBulkActionState(e) {
    as(this, e);
  }
  syncBulkActionState() {
    cs(this);
  }
  bindBulkClearButton() {
    hs(this);
  }
  clearSelection() {
    fs(this);
  }
  positionDropdownMenu(e, t) {
    ms(this, e, t);
  }
  bindDropdownToggles() {
    gs(this);
  }
  showError(e) {
    bs(this, e);
  }
  notify(e, t) {
    ys(this, e, t);
  }
  async confirmAction(e) {
    return vs(this, e);
  }
  async extractError(e) {
    return ws(this, e);
  }
  parseDatasetStringArray(e) {
    return xs(this, e);
  }
  parseDatasetObject(e) {
    return Ss(this, e);
  }
  reorderColumns(e) {
    Cs(this, e);
  }
  resetColumnsToDefault() {
    $s(this);
  }
  mergeColumnOrder(e) {
    return ks(this, e);
  }
  reorderTableColumns(e) {
    As(this, e);
  }
  reorderRowCells(e, t, n) {
    Es(this, e, t, n);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.bulkActionStateAbortController && (this.bulkActionStateAbortController.abort(), this.bulkActionStateAbortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), this.bulkActionStateDebounce && (clearTimeout(this.bulkActionStateDebounce), this.bulkActionStateDebounce = null), console.log("[DataGrid] Instance destroyed");
  }
};
S.URL_KEY_SEARCH = U, S.URL_KEY_PAGE = H, S.URL_KEY_PER_PAGE = V, S.URL_KEY_FILTERS = K, S.URL_KEY_SORT = J, S.URL_KEY_STATE = re, S.URL_KEY_HIDDEN_COLUMNS = $e, S.URL_KEY_VIEW_MODE = ne, S.URL_KEY_EXPANDED_GROUPS = ee, S.MANAGED_URL_KEYS = ke, S.DEFAULT_MAX_URL_LENGTH = gt, S.DEFAULT_MAX_FILTERS_LENGTH = bt;
let ge = S;
typeof window < "u" && (window.DataGrid = ge);
const Te = {
  text: [
    { label: "contains", value: "ilike" },
    { label: "equals", value: "eq" },
    { label: "starts with", value: "starts" },
    { label: "ends with", value: "ends" },
    { label: "not equals", value: "ne" }
  ],
  number: [
    { label: "equals", value: "eq" },
    { label: "not equals", value: "ne" },
    { label: "greater than", value: "gt" },
    { label: "less than", value: "lt" },
    { label: "between", value: "between" }
  ],
  select: [
    { label: "equals", value: "eq" },
    { label: "not equals", value: "ne" }
  ],
  date: [
    { label: "on", value: "eq" },
    { label: "before", value: "lt" },
    { label: "after", value: "gt" },
    { label: "between", value: "between" }
  ]
};
class Vi {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new O();
  }
  init() {
    if (this.modal = document.getElementById("advanced-search-modal"), this.container = document.getElementById("search-criteria-container"), this.searchInput = document.getElementById("table-search"), this.clearBtn = document.getElementById("search-clear-btn"), !this.modal || !this.container) {
      console.error("[AdvancedSearch] Required elements not found");
      return;
    }
    this.restoreCriteriaFromURL(), this.criteria.length > 0 && (this.renderCriteria(), this.renderChips()), this.bindEvents(), this.bindClearButton();
  }
  /**
   * Restore advanced search criteria from URL
   */
  restoreCriteriaFromURL() {
    const t = new URLSearchParams(window.location.search).get("filters");
    if (t)
      try {
        const n = JSON.parse(t);
        this.criteria = n.map((s) => ({
          field: s.column,
          operator: s.operator || "ilike",
          value: s.value,
          logic: "and"
          // Default logic connector
        })), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria);
      } catch (n) {
        console.warn("[AdvancedSearch] Failed to parse filters from URL:", n);
      }
  }
  /**
   * Push criteria to URL
   */
  pushCriteriaToURL() {
    const e = new URLSearchParams(window.location.search);
    this.criteria.length > 0 ? e.set("advancedSearch", JSON.stringify(this.criteria)) : e.delete("advancedSearch");
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[AdvancedSearch] URL updated with criteria");
  }
  bindEvents() {
    document.getElementById("advanced-search-btn")?.addEventListener("click", () => this.open());
    const t = document.getElementById("advanced-search-close"), n = document.getElementById("advanced-search-cancel"), s = document.getElementById("advanced-search-overlay");
    t?.addEventListener("click", () => this.close()), n?.addEventListener("click", () => this.close()), s?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const a = document.getElementById("save-search-preset-btn"), l = document.getElementById("load-search-preset-btn");
    a?.addEventListener("click", () => this.savePreset()), l?.addEventListener("click", () => this.loadPreset());
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
      const n = document.createElement("div"), s = this.createCriterionRow(e, t);
      if (n.appendChild(s), t < this.criteria.length - 1) {
        const o = this.createLogicConnector(t);
        n.appendChild(o);
      }
      this.container.appendChild(n);
    }));
  }
  createCriterionRow(e, t) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 py-3";
    const s = this.config.fields.find((o) => o.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((o) => `
          <option value="${o.name}" ${o.name === e.field ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(s).map((o) => `
          <option value="${o.value}" ${o.value === e.operator ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(s, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, n.querySelectorAll("select, input").forEach((o) => {
      o.addEventListener("change", (i) => this.updateCriterion(i.target));
    }), n.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), n;
  }
  createValueInput(e, t, n) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${n}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((o) => `
            <option value="${o.value}" ${o.value === t.value ? "selected" : ""}>${o.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-criterion-index="${n}"
             data-criterion-part="value"
             value="${t.value}"
             placeholder="Enter value..."
             class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
    `;
  }
  createLogicConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center gap-2 py-2";
    const n = this.criteria[e].logic || "and";
    return t.innerHTML = `
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded border ${n === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        And
      </button>
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded border ${n === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        Or
      </button>
    `, t.querySelectorAll("[data-logic-index]").forEach((s) => {
      s.addEventListener("click", (o) => {
        const i = o.target, a = parseInt(i.dataset.logicIndex || "0", 10), l = i.dataset.logicValue;
        this.criteria[a].logic = l, this.renderCriteria();
      });
    }), t;
  }
  updateCriterion(e) {
    const t = parseInt(e.dataset.criterionIndex || "0", 10), n = e.dataset.criterionPart;
    if (!this.criteria[t]) return;
    const s = e.value;
    n === "field" ? (this.criteria[t].field = s, this.renderCriteria()) : n === "operator" ? this.criteria[t].operator = s : n === "value" && (this.criteria[t].value = s);
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Te[e.type] || Te.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Re({
      title: "Save Search Preset",
      label: "Preset name",
      placeholder: "e.g. Active users filter",
      confirmLabel: "Save",
      onConfirm: (t) => {
        const n = this.loadPresetsFromStorage();
        n[t] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(n)), this.notifier.success(`Preset "${t}" saved!`);
      }
    }).show();
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    new Re({
      title: "Load Search Preset",
      label: `Available presets: ${t.join(", ")}`,
      placeholder: "Enter preset name",
      confirmLabel: "Load",
      onConfirm: (s) => {
        if (!e[s]) {
          this.notifier.warning(`Preset "${s}" not found.`);
          return;
        }
        this.criteria = e[s], this.renderCriteria();
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
  /**
   * Render filter chips in the search input
   */
  renderChips() {
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), n = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), n && n.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), n && n.classList.remove("hidden"), this.criteria.forEach((s, o) => {
        const i = this.createChip(s, o);
        e.appendChild(i);
      });
    }
  }
  /**
   * Create a single filter chip
   */
  createChip(e, t) {
    const n = document.createElement("div");
    n.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200";
    const o = this.config.fields.find((l) => l.name === e.field)?.label || e.field, i = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    n.innerHTML = `
      <span>${o} ${i} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const a = n.querySelector("[data-chip-index]");
    return a && a.addEventListener("click", () => {
      this.removeChip(t);
    }), n;
  }
  /**
   * Remove a chip and update filters
   */
  removeChip(e) {
    this.criteria.splice(e, 1), this.renderCriteria(), this.renderChips(), this.config.onSearch(this.criteria);
  }
  /**
   * Clear all chips
   */
  clearAllChips() {
    this.criteria = [], this.renderCriteria(), this.renderChips(), this.config.onClear && this.config.onClear();
  }
}
const De = {
  text: [
    { label: "contains", value: "ilike" },
    { label: "is", value: "eq" },
    { label: "is not", value: "ne" }
  ],
  number: [
    { label: "equals", value: "eq" },
    { label: "not equals", value: "ne" },
    { label: "greater than", value: "gt" },
    { label: "less than", value: "lt" },
    { label: "greater than or equal", value: "gte" },
    { label: "less than or equal", value: "lte" }
  ],
  date: [
    { label: "is", value: "eq" },
    { label: "before", value: "lt" },
    { label: "after", value: "gt" }
  ],
  select: [
    { label: "is", value: "eq" },
    { label: "is not", value: "ne" }
  ]
};
class Ki {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new O(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    t && t.addEventListener("click", () => this.clearFilters()), this.overlay && this.overlay.addEventListener("click", () => this.close()), document.addEventListener("keydown", (n) => {
      n.key === "Escape" && !this.panel.classList.contains("hidden") && this.close();
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
    const e = document.getElementById("add-group-btn"), t = document.getElementById("apply-filter-btn"), n = document.getElementById("clear-all-btn"), s = document.getElementById("save-filter-btn");
    e && e.addEventListener("click", () => this.addGroup()), t && t.addEventListener("click", () => this.applyFilters()), n && n.addEventListener("click", () => this.clearAll()), s && s.addEventListener("click", () => this.saveFilter());
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
      const n = this.createGroupElement(e, t);
      if (this.container.appendChild(n), t < this.structure.groups.length - 1) {
        const s = this.createGroupConnector(t);
        this.container.appendChild(s);
      }
    }), this.updatePreview());
  }
  createGroupElement(e, t) {
    const n = document.createElement("div");
    n.className = "border border-gray-200 rounded-lg p-3 bg-gray-50";
    const s = document.createElement("div");
    s.className = "flex justify-end mb-2", s.innerHTML = `
      <button type="button" data-remove-group="${t}" class="text-xs text-red-600 hover:text-red-800">
        Remove group
      </button>
    `, n.appendChild(s), e.conditions.forEach((i, a) => {
      const l = this.createConditionElement(i, t, a);
      if (n.appendChild(l), a < e.conditions.length - 1) {
        const c = this.createConditionConnector(t, a, e.logic);
        n.appendChild(c);
      }
    });
    const o = document.createElement("button");
    return o.type = "button", o.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", o.dataset.addCondition = String(t), o.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, n.appendChild(o), this.bindGroupEvents(n, t), n;
  }
  createConditionElement(e, t, n) {
    const s = document.createElement("div");
    s.className = "flex items-center gap-2 mb-2";
    const o = this.config.fields.find((i) => i.name === e.field) || this.config.fields[0];
    return s.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${n}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((i) => `
          <option value="${i.name}" ${i.name === e.field ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${n}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(o).map((i) => `
          <option value="${i.value}" ${i.value === e.operator ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(o, e, t, n)}

      <button type="button" data-remove-cond="${t}-${n}" class="text-red-600 hover:text-red-800">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>

      <button type="button" data-add-cond-or="${t}-${n}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add OR condition">
        OR
      </button>

      <button type="button" data-add-cond-and="${t}-${n}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add AND condition">
        AND
      </button>
    `, s;
  }
  renderValueInput(e, t, n, s) {
    return e.type === "select" && e.options ? `
        <select data-cond="${n}-${s}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${e.options.map((i) => `
            <option value="${i.value}" ${i.value === t.value ? "selected" : ""}>${i.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-cond="${n}-${s}-value"
             value="${t.value || ""}"
             placeholder="Enter value..."
             class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  createConditionConnector(e, t, n) {
    const s = document.createElement("div");
    return s.className = "flex items-center justify-center my-1", s.innerHTML = `
      <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">
        ${n.toUpperCase()}
      </span>
    `, s;
  }
  createGroupConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center py-2";
    const n = this.structure.groupLogic[e] || "and";
    return t.innerHTML = `
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded-l border ${n === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        AND
      </button>
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded-r border ${n === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        OR
      </button>
    `, t.querySelectorAll("[data-group-logic]").forEach((s) => {
      s.addEventListener("click", (o) => {
        const i = o.target, a = parseInt(i.dataset.groupLogic || "0", 10), l = i.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const n = e.querySelector(`[data-remove-group="${t}"]`);
    n && n.addEventListener("click", () => this.removeGroup(t));
    const s = e.querySelector(`[data-add-condition="${t}"]`);
    s && s.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((o) => {
      const i = o, [a, l, c] = i.dataset.cond.split("-"), d = parseInt(a, 10), p = parseInt(l, 10);
      i.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[p].field = i.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[p].operator = i.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[p].value = i.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((o) => {
      o.addEventListener("click", (i) => {
        const l = i.target.closest("[data-remove-cond]");
        if (!l) return;
        const [c, d] = l.dataset.removeCond.split("-").map(Number);
        this.removeCondition(c, d);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((o) => {
      o.addEventListener("click", (i) => {
        const a = i.target, l = a.dataset.addCondOr !== void 0, c = l ? a.dataset.addCondOr : a.dataset.addCondAnd;
        if (!c) return;
        const [d] = c.split("-").map(Number);
        this.structure.groups[d].logic = l ? "or" : "and", this.addCondition(d);
      });
    });
  }
  addCondition(e) {
    this.structure.groups[e].conditions.push(this.createEmptyCondition()), this.render();
  }
  removeCondition(e, t) {
    const n = this.structure.groups[e];
    n.conditions.splice(t, 1), n.conditions.length === 0 ? this.removeGroup(e) : this.render();
  }
  removeGroup(e) {
    this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.length > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 ? this.addGroup() : this.render();
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : De[e.type] || De.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || "No filters applied"), this.previewElement && (this.previewElement.textContent = t);
    const n = document.getElementById("applied-filter-preview");
    n && (this.hasActiveFilters() ? n.classList.remove("hidden") : n.classList.add("hidden"));
  }
  hasActiveFilters() {
    return this.structure.groups.some(
      (e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0)
    );
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t) => {
      const n = t.conditions.filter((s) => s.value !== "" && s.value !== null).map((s) => {
        const o = s.operator.toUpperCase(), i = typeof s.value == "string" ? `'${s.value}'` : s.value;
        return `${s.field} ${o === "ILIKE" ? "ILIKE" : o === "EQ" ? "=" : o} ${i}`;
      });
      return n.length === 0 ? "" : n.length === 1 ? n[0] : `( ${n.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, n, s) => {
      if (s === 0) return n;
      const o = this.structure.groupLogic[s - 1] || "and";
      return `${t} ${o.toUpperCase()} ${n}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const n = t.conditions.filter((s) => s.value !== "" && s.value !== null).map((s) => {
        const o = this.config.fields.find((l) => l.name === s.field), i = o?.label || s.field, a = this.getOperatorsForField(o).find((l) => l.value === s.operator)?.label || s.operator;
        return `${i} ${a} "${s.value}"`;
      });
      return n.length === 0 ? "" : n.length === 1 ? n[0] : `( ${n.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, n, s) => {
      if (s === 0) return n;
      const o = this.structure.groupLogic[s - 1] || "and";
      return `${t} ${o.toUpperCase()} ${n}`;
    }, "");
  }
  applyFilters() {
    this.config.onApply(this.structure), this.close();
  }
  clearAll() {
    this.structure = { groups: [], groupLogic: [] }, this.addGroup(), this.updatePreview();
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
    const n = this.getSavedFilters();
    n[t] = this.structure, localStorage.setItem("saved_filters", JSON.stringify(n)), this.notifier.success(`Filter "${t}" saved!`), e && (e.value = "");
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
    const t = new URLSearchParams(window.location.search).get("filters");
    if (t)
      try {
        const n = JSON.parse(t);
        Array.isArray(n) && n.length > 0 && (this.structure = this.convertLegacyFilters(n), this.render());
      } catch (n) {
        console.warn("[FilterBuilder] Failed to parse filters from URL:", n);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((s) => {
      const o = s.column;
      t.has(o) || t.set(o, []), t.get(o).push(s);
    });
    const n = [];
    return t.forEach((s) => {
      n.push({
        conditions: s.map((o) => ({
          field: o.column,
          operator: o.operator || "ilike",
          value: o.value
        })),
        logic: s.length > 1 ? "or" : "and"
      });
    }), {
      groups: n,
      groupLogic: new Array(n.length - 1).fill("and")
    };
  }
  getStructure() {
    return this.structure;
  }
  setStructure(e) {
    this.structure = e, this.render();
  }
}
class Ji {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0)
      throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "")
      return {};
    const t = {}, n = e.trim();
    return this.searchableFields.forEach((s) => {
      t[`${s}__ilike`] = `%${n}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
class Yi {
  buildFilters(e) {
    const t = {}, n = /* @__PURE__ */ new Map();
    return e.forEach((s) => {
      if (s.value === null || s.value === void 0 || s.value === "")
        return;
      const o = s.operator || "eq", i = s.column;
      n.has(i) || n.set(i, { operator: o, values: [] }), n.get(i).values.push(s.value);
    }), n.forEach((s, o) => {
      if (s.values.length === 1) {
        const i = s.operator === "eq" ? o : `${o}__${s.operator}`;
        t[i] = s.values[0];
      } else
        s.operator === "ilike" ? t[`${o}__ilike`] = s.values.join(",") : s.operator === "eq" ? t[`${o}__in`] = s.values.join(",") : t[`${o}__${s.operator}`] = s.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, n) {
    n.resetPagination(), await n.refresh();
  }
}
class Qi {
  buildQuery(e, t) {
    return {
      limit: t,
      offset: (e - 1) * t
    };
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}
class Wi {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((n) => `${n.field} ${n.direction}`).join(",") };
  }
  async onSort(e, t, n) {
    await n.refresh();
  }
}
class Xi {
  constructor(e) {
    if (!e || !e.endpoint)
      throw new Error("export endpoint is required");
    if (!e.definition && !e.resource)
      throw new Error("export definition or resource is required");
    this.config = e;
  }
  getEndpoint() {
    return this.config.endpoint;
  }
  getConcurrency() {
    return this.config.concurrency || "single";
  }
  async export(e, t) {
    if (!t)
      throw new Error("datagrid instance is required");
    const n = Ls(t, this.config, e);
    n.delivery = _s(this.config, e);
    let s;
    try {
      s = await $(this.getEndpoint(), {
        method: "POST",
        json: n,
        headers: {
          Accept: "application/json,application/octet-stream"
        }
      });
    } catch (o) {
      const i = o instanceof Error ? o.message : "Network error during export";
      throw B(t, "error", i), o;
    }
    if (s.status === 202) {
      const o = await s.json().catch(() => ({}));
      B(t, "info", "Export queued. You can download it when ready.");
      const i = o?.status_url || "";
      if (i) {
        const a = Bs(o, i);
        try {
          await Ms(i, {
            intervalMs: Rs(this.config),
            timeoutMs: Is(this.config)
          });
          const l = await $(a, {
            method: "GET",
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await be(l);
            throw B(t, "error", c), new Error(c);
          }
          await qe(l, n.definition || n.resource || "export", n.format), B(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw B(t, "error", c), l;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!s.ok) {
      const o = await be(s);
      throw B(t, "error", o), new Error(o);
    }
    await qe(s, n.definition || n.resource || "export", n.format), B(t, "success", "Export ready.");
  }
}
function Ls(r, e, t) {
  const n = zs(t), s = Ts(r, e), o = Ds(r, e), i = Fs(r), a = qs(i), l = {
    format: n,
    query: a,
    selection: s,
    columns: o,
    delivery: e.delivery || "auto"
  };
  e.definition && (l.definition = e.definition), e.resource && (l.resource = e.resource);
  const c = e.sourceVariant || e.variant;
  return c && (l.source_variant = c), l;
}
function _s(r, e) {
  return r.delivery ? r.delivery : (r.asyncFormats && r.asyncFormats.length > 0 ? r.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function Rs(r) {
  const e = Number(r.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function Is(r) {
  const e = Number(r.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function Bs(r, e) {
  return r?.download_url ? r.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function Ms(r, e) {
  const t = Date.now(), n = Math.max(250, e.intervalMs);
  for (; ; ) {
    const s = await $(r, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });
    if (!s.ok) {
      const a = await be(s);
      throw new Error(a);
    }
    const o = await s.json().catch(() => ({})), i = String(o?.state || "").toLowerCase();
    if (i === "completed")
      return o;
    if (i === "failed")
      throw new Error("Export failed");
    if (i === "canceled")
      throw new Error("Export canceled");
    if (i === "deleted")
      throw new Error("Export deleted");
    if (e.timeoutMs > 0 && Date.now() - t > e.timeoutMs)
      throw new Error("Export status timed out");
    await Ps(n);
  }
}
function Ps(r) {
  return new Promise((e) => setTimeout(e, r));
}
function Ts(r, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(r.state.selectedRows || []), n = t.length > 0 ? "ids" : "all";
  return {
    mode: n,
    ids: n === "ids" ? t : []
  };
}
function Ds(r, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = r.state?.hiddenColumns ? new Set(r.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(r.state?.columnOrder) && r.state.columnOrder.length > 0 ? r.state.columnOrder : r.config.columns.map((s) => s.field)).filter((s) => !t.has(s));
}
function Fs(r) {
  const e = {}, t = r.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(r.state.currentPage, r.state.perPage)), r.state.search && t.search && Object.assign(e, t.search.buildQuery(r.state.search)), r.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(r.state.filters)), r.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(r.state.sort)), e;
}
function qs(r) {
  const e = {}, t = [];
  return Object.entries(r).forEach(([n, s]) => {
    if (s == null || s === "")
      return;
    switch (n) {
      case "limit":
        e.limit = Fe(s);
        return;
      case "offset":
        e.offset = Fe(s);
        return;
      case "order":
      case "sort":
        e.sort = js(String(s));
        return;
      case "q":
      case "search":
        e.search = String(s);
        return;
    }
    const { field: o, op: i } = Os(n);
    o && t.push({ field: o, op: i, value: s });
  }), t.length > 0 && (e.filters = t), e;
}
function Os(r) {
  const e = r.split("__"), t = e[0]?.trim() || "", n = e[1]?.trim() || "eq";
  return { field: t, op: n };
}
function js(r) {
  return r ? r.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), n = t[0] || "", s = t[1] || "asc";
    return { field: n, desc: s.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function zs(r) {
  const e = String(r || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function Fe(r) {
  const e = Number(r);
  return Number.isFinite(e) ? e : 0;
}
async function qe(r, e, t) {
  const n = await r.blob(), s = Ns(r, e, t), o = URL.createObjectURL(n), i = document.createElement("a");
  i.href = o, i.download = s, i.rel = "noopener", document.body.appendChild(i), i.click(), i.remove(), URL.revokeObjectURL(o);
}
function Ns(r, e, t) {
  const n = r.headers.get("content-disposition") || "", s = `${e}.${t}`;
  return Gs(n) || s;
}
function Gs(r) {
  if (!r) return null;
  const e = r.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = r.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function be(r) {
  if ((r.headers.get("content-type") || "").includes("application/json")) {
    const n = await r.json().catch(() => ({}));
    if (n?.error?.message)
      return n.error.message;
    if (n?.message)
      return n.message;
  }
  const t = await r.text().catch(() => "");
  return t || `Export failed (${r.status})`;
}
function B(r, e, t) {
  const n = r.config.notifier;
  if (n && typeof n[e] == "function") {
    n[e](t);
    return;
  }
  const s = window.toastManager;
  if (s && typeof s[e] == "function") {
    s[e](t);
    return;
  }
  e === "error" && alert(t);
}
class Zi {
  constructor(e) {
    this.baseEndpoint = e;
  }
  getActionEndpoint(e) {
    return `${this.getPluralEndpoint()}/bulk/${e}`;
  }
  getPluralEndpoint() {
    return this.baseEndpoint.endsWith("s") ? this.baseEndpoint : `${this.baseEndpoint}s`;
  }
  async execute(e, t, n) {
    const s = this.getActionEndpoint(e), o = await $(s, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!o.ok) {
      const i = await Kt(o, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${i}`);
    }
    await n.refresh();
  }
}
function Us(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function Hs(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function St(r) {
  return typeof r == "object" && r !== null && "version" in r && r.version === 2;
}
class Vs {
  constructor(e, t = "datatable_columns") {
    this.cachedOrder = null, this.storageKey = t;
  }
  /**
   * Get visible columns from grid state (single source of truth)
   */
  getVisibleColumns(e) {
    return e.config.columns.filter((t) => !e.state.hiddenColumns.has(t.field)).map((t) => t.field);
  }
  /**
   * Toggle column visibility based on current grid state
   * Preserves column order when writing visibility updates
   */
  toggleColumn(e, t) {
    const n = !t.state.hiddenColumns.has(e), s = t.config.columns.filter((a) => a.field === e ? !n : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), o = {};
    t.config.columns.forEach((a) => {
      o[a.field] = s.includes(a.field);
    });
    const i = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: o,
      order: i.length > 0 ? i : void 0
    }), t.updateColumnVisibility(s);
  }
  /**
   * Reorder columns and persist to storage
   * Stores both visibility and order in V2 format
   */
  reorderColumns(e, t) {
    const n = {};
    t.config.columns.forEach((s) => {
      n[s.field] = !t.state.hiddenColumns.has(s.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: n,
      order: e
    }), console.log("[ColumnVisibility] Order saved:", e);
  }
  /**
   * Load column order from cache (localStorage)
   * Validates order against current columns (drops missing, doesn't append new)
   * New columns are appended by DataGrid.mergeColumnOrder()
   */
  loadColumnOrderFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t || !t.order)
        return [];
      const n = new Set(e), s = t.order.filter((o) => n.has(o));
      return this.cachedOrder = s, console.log("[ColumnVisibility] Order loaded from cache:", s), s;
    } catch (t) {
      return console.warn("Failed to load column order from cache:", t), [];
    }
  }
  /**
   * Load saved visibility state from localStorage
   * Returns hiddenColumns Set to be merged with URL state
   * Handles both V1 and V2 formats (migrates V1 automatically)
   * Filters out stale columns that no longer exist in allColumns
   */
  loadHiddenColumnsFromCache(e) {
    try {
      const t = this.loadPrefs();
      if (!t) return /* @__PURE__ */ new Set();
      const n = new Set(e), s = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([o, i]) => {
        !i && n.has(o) && s.add(o);
      }), s;
    } catch (t) {
      return console.warn("Failed to load column visibility state:", t), /* @__PURE__ */ new Set();
    }
  }
  /**
   * Load preferences from localStorage with V1->V2 migration
   */
  loadPrefs() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return null;
      const t = JSON.parse(e);
      if (St(t))
        return t;
      const s = {
        version: 2,
        visibility: t
        // order is undefined - will be populated on first reorder
      };
      return console.log("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(s), s;
    } catch (e) {
      return console.warn("Failed to load column preferences:", e), null;
    }
  }
  /**
   * Save V2 preferences to localStorage
   */
  savePrefs(e) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(e));
    } catch (t) {
      console.warn("Failed to save column preferences:", t);
    }
  }
  /**
   * Clear saved preferences from localStorage
   * Called when user clicks "Reset to Default"
   */
  clearSavedPrefs() {
    try {
      localStorage.removeItem(this.storageKey), this.cachedOrder = null, console.log("[ColumnVisibility] Preferences cleared");
    } catch (e) {
      console.warn("Failed to clear column preferences:", e);
    }
  }
}
class ea extends Vs {
  constructor(e, t) {
    const n = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, n), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const s = Us(t.basePath), o = Hs(t.apiBasePath);
    t.preferencesEndpoint ? this.preferencesEndpoint = t.preferencesEndpoint : o ? this.preferencesEndpoint = `${o}/panels/preferences` : s ? this.preferencesEndpoint = `${s}/api/panels/preferences` : this.preferencesEndpoint = "/api/panels/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
  }
  /**
   * Get the server preference key for this resource
   */
  get serverPrefsKey() {
    return `ui.datagrid.${this.resource}.columns`;
  }
  /**
   * Toggle column visibility and sync to server
   */
  toggleColumn(e, t) {
    super.toggleColumn(e, t), this.scheduleServerSync(t);
  }
  /**
   * Reorder columns and sync to server
   */
  reorderColumns(e, t) {
    super.reorderColumns(e, t), this.scheduleServerSync(t);
  }
  /**
   * Load preferences from server
   * Call this before DataGrid.init() to hydrate state from server
   * Returns the V2 prefs if found, null otherwise
   */
  async loadFromServer() {
    try {
      const e = await $(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      if (!e.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", e.status), null;
      const n = (await e.json()).records || [];
      if (n.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const s = n[0]?.raw;
      if (!s || !s[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const o = s[this.serverPrefsKey];
      return St(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
    } catch (e) {
      return console.warn("[ServerColumnVisibility] Error loading server prefs:", e), null;
    }
  }
  /**
   * Get initial column prefs (server takes precedence over localStorage)
   * Call this after loadFromServer() to get the prefs to use
   */
  getInitialPrefs(e) {
    const t = this.serverPrefs;
    if (t) {
      const n = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([i, a]) => {
        a || n.add(i);
      });
      const s = new Set(e), o = (t.order || []).filter((i) => s.has(i));
      return {
        hiddenColumns: n,
        columnOrder: o
      };
    }
    return {
      hiddenColumns: this.loadHiddenColumnsFromCache(e),
      columnOrder: this.loadColumnOrderFromCache(e)
    };
  }
  /**
   * Schedule a debounced sync to server
   */
  scheduleServerSync(e) {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => {
      this.syncToServer(e);
    }, this.syncDebounce);
  }
  /**
   * Sync current preferences to server
   */
  async syncToServer(e) {
    const t = {};
    e.config.columns.forEach((s) => {
      t[s.field] = !e.state.hiddenColumns.has(s.field);
    });
    const n = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const s = await $(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: {
          raw: {
            [this.serverPrefsKey]: n
          }
        }
      });
      if (!s.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", s.status);
        return;
      }
      this.serverPrefs = n, console.log("[ServerColumnVisibility] Synced prefs to server:", n);
    } catch (s) {
      console.warn("[ServerColumnVisibility] Error syncing to server:", s);
    }
  }
  /**
   * Clear saved preferences from both localStorage and server
   * Called when user clicks "Reset to Default"
   */
  clearSavedPrefs() {
    super.clearSavedPrefs(), this.serverPrefs = null, this.clearServerPrefs();
  }
  /**
   * Clear preferences on server
   */
  async clearServerPrefs() {
    try {
      const e = await $(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        json: {
          raw: {
            [this.serverPrefsKey]: null
          }
        }
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
}
const Ks = {
  async prompt(r) {
    const { PayloadInputModal: e } = await import("../chunks/payload-modal-DZcXW2Ox.js");
    return e.prompt(r);
  }
};
function Js(r) {
  const e = r.trim(), t = e.indexOf("?");
  return t === -1 ? { path: e, query: "" } : {
    path: e.slice(0, t),
    query: e.slice(t + 1)
  };
}
function M(r, e, t = "", n = "") {
  const { path: s, query: o } = Js(r), i = s.replace(/\/+$/, ""), a = t.replace(/^\/+/, "");
  let l = `${i}/${encodeURIComponent(e)}`;
  a && (l += `/${a}`);
  const c = [];
  return o && c.push(o), n && c.push(n), c.length > 0 ? `${l}?${c.join("&")}` : l;
}
const Oe = {
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
  // Destructive actions last
}, Ys = 5e3;
class Ct {
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
  /**
   * Build row actions for a record from schema.actions
   *
   * @param record - The data record
   * @param schemaActions - Actions from schema.actions (may be undefined)
   * @returns Array of ActionButton for rendering
   */
  buildRowActions(e, t) {
    this.seenActions.clear();
    const n = [];
    let s = 0;
    const o = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const i of t) {
        if (!i.name) continue;
        const a = this.resolveRecordActionState(e, i.name);
        if (!this.shouldIncludeAction(e, i, a)) continue;
        const l = i.name.toLowerCase();
        if (this.seenActions.has(l)) continue;
        this.seenActions.add(l);
        const c = this.normalizeContextBoundActionState(e, i, a), d = this.buildActionFromSchema(e, i, o, c);
        d && n.push({
          action: d,
          name: i.name,
          order: this.resolveActionOrder(i.name, i.order),
          insertionIndex: s++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(n, e, o, s);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(n, e, o, s);
    return n.sort((i, a) => i.order !== a.order ? i.order - a.order : i.insertionIndex - a.insertionIndex), n.map((i) => i.action);
  }
  /**
   * Resolve action order using precedence:
   * 1. schema.actions[*].order (server authoritative)
   * 2. actionOrderOverride (optional client override)
   * 3. stable fallback map
   * 4. default order
   */
  resolveActionOrder(e, t) {
    if (typeof t == "number" && Number.isFinite(t))
      return t;
    const n = e.toLowerCase();
    return this.config.actionOrderOverride?.[n] !== void 0 ? this.config.actionOrderOverride[n] : Oe[n] !== void 0 ? Oe[n] : Ys;
  }
  /**
   * Build a single action from schema definition
   */
  buildActionFromSchema(e, t, n, s) {
    const o = t.name, i = t.label || t.label_key || o, a = t.variant || "secondary", l = t.icon, c = this.isNavigationAction(t), d = o === "delete";
    return c ? this.applyActionState(
      this.buildNavigationAction(e, t, i, a, l, n),
      s
    ) : d ? this.applyActionState(this.buildDeleteAction(e, i, a, l), s) : this.applyActionState(this.buildPostAction(e, t, i, a, l), s);
  }
  /**
   * Check if action is a navigation action
   */
  isNavigationAction(e) {
    return e.type === "navigation" || e.href ? !0 : ["view", "edit", "show", "details"].includes(e.name.toLowerCase());
  }
  shouldIncludeAction(e, t, n) {
    return this.matchesActionScope(t.scope) ? this.missingRequiredContext(e, t).length === 0 ? !0 : n !== null : !1;
  }
  resolveRecordActionState(e, t) {
    return Qe(e, t);
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1)
      return e;
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
    if (!e || typeof e != "object")
      return null;
    const t = typeof e.label == "string" ? e.label.trim() : "", n = typeof e.href == "string" ? e.href.trim() : "", s = typeof e.kind == "string" ? e.kind.trim() : "";
    return !t && !n && !s ? null : {
      ...t ? { label: t } : {},
      ...n ? { href: n } : {},
      ...s ? { kind: s } : {}
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t)
      return t;
    const n = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (n) {
      const s = We({ reason_code: n });
      if (s?.message)
        return s.message;
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
    if (!t || t === "all")
      return !0;
    const n = (this.config.actionContext || "row").toLowerCase();
    return t === n;
  }
  missingRequiredContext(e, t) {
    const n = Array.isArray(t.context_required) ? t.context_required : [];
    if (n.length === 0)
      return [];
    const s = [];
    for (const o of n) {
      const i = typeof o == "string" ? o.trim() : "";
      if (!i)
        continue;
      const a = this.resolveRecordContextValue(e, i);
      this.isEmptyPayloadValue(a) && s.push(i);
    }
    return s;
  }
  normalizeContextBoundActionState(e, t, n) {
    const s = this.missingRequiredContext(e, t);
    return s.length === 0 || n && n.enabled === !1 ? n : {
      enabled: !1,
      reason: "record does not include required context for this action",
      reason_code: "missing_context_required",
      metadata: {
        missing_context_fields: s,
        required_context_fields: Array.isArray(t.context_required) ? [...t.context_required] : []
      }
    };
  }
  resolveRecordContextValue(e, t) {
    const n = t.trim();
    if (!n) return;
    if (!n.includes("."))
      return e[n];
    const s = n.split(".").map((i) => i.trim()).filter(Boolean);
    if (s.length === 0) return;
    let o = e;
    for (const i of s) {
      if (!o || typeof o != "object" || Array.isArray(o))
        return;
      o = o[i];
    }
    return o;
  }
  /**
   * Build navigation action (view, edit, etc.)
   */
  buildNavigationAction(e, t, n, s, o, i) {
    const a = String(e.id || ""), l = this.config.actionBasePath;
    let c;
    if (t.href) {
      const d = this.interpolateHrefTemplate(t.href, e, a);
      i ? c = d.includes("?") ? `${d}&${i}` : `${d}?${i}` : c = d;
    } else t.name === "edit" ? c = M(l, a, "edit", i) : c = M(l, a, "", i);
    return {
      id: t.name,
      label: n,
      icon: o || this.getDefaultIcon(t.name),
      variant: s,
      action: () => {
        window.location.href = c;
      }
    };
  }
  interpolateHrefTemplate(e, t, n) {
    const s = e.trim();
    return s && s.replace(/\{([^}]+)\}/g, (o, i) => {
      const a = String(i || "").trim();
      if (!a)
        return "";
      if (a === "id")
        return n;
      const l = this.resolveRecordContextValue(t, a);
      return l == null ? "" : String(l);
    });
  }
  /**
   * Build delete action with confirmation
   */
  buildDeleteAction(e, t, n, s) {
    const o = String(e.id || ""), i = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: s || "trash",
      variant: n === "secondary" ? "danger" : n,
      action: async () => {
        await yt({
          endpoint: `${i}/${o}`,
          fallbackMessage: "Delete failed",
          onSuccess: async (a) => {
            this.config.onActionSuccess?.("delete", {
              success: !0,
              data: a.data
            });
          },
          onError: async (a) => {
            this.config.onActionError?.("delete", a);
          },
          reconcileOnDomainFailure: async (a) => {
            a.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure("delete", a);
          }
        });
      }
    };
  }
  /**
   * Build POST action for workflow/panel actions
   */
  buildPostAction(e, t, n, s, o) {
    const i = String(e.id || ""), a = t.name, l = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      id: a,
      label: n,
      icon: o || this.getDefaultIcon(a),
      variant: s,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const c = await this.buildActionPayload(e, t);
        c !== null && await this.executePostAction({
          actionName: a,
          endpoint: l,
          payload: c,
          recordId: i
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await ve(e.endpoint, e.payload);
    if (t.success)
      return e.actionName.toLowerCase() === "create_translation" && t.data ? (this.handleCreateTranslationSuccess(t.data, e.payload), t) : (this.handleActionRedirectSuccess(t.data) || this.config.onActionSuccess?.(e.actionName, t), t);
    if (t.error && Ot(t.error)) {
      const n = jt(t.error);
      if (n && this.config.onTranslationBlocker) {
        const s = { ...e.payload }, o = this.getContentChannel() || n.channel || null;
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...n,
          channel: o,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...s },
            recordId: e.recordId
          })
        }), { success: !1, error: t.error };
      }
    }
    return await this.handleStructuredActionFailure(e.actionName, t, `${e.actionName} failed`), { success: !1, error: t.error };
  }
  handleActionRedirectSuccess(e) {
    if (!e || typeof window > "u")
      return !1;
    const t = typeof e.redirect_path == "string" ? e.redirect_path.trim() : "";
    if (t)
      return window.location.href = t, !0;
    const n = typeof e.redirect_record_id == "string" ? e.redirect_record_id.trim() : "";
    if (!n)
      return !1;
    const s = e.redirect_to_edit === !0 || e.mode === "redirect", o = this.buildQueryContext(), i = M(
      this.config.actionBasePath,
      n,
      s ? "edit" : "",
      o
    );
    return window.location.href = i, !0;
  }
  async handleStructuredActionFailure(e, t, n) {
    if (!t.error)
      return t;
    const s = this.buildActionErrorMessage(e, t.error), o = {
      ...t.error,
      message: s
    };
    throw o.textCode && this.config.reconcileOnDomainFailure && await this.config.reconcileOnDomainFailure(e, o), this.config.onActionError?.(e, o), W(o, n, !!this.config.onActionError);
  }
  /**
   * Handle successful create_translation action:
   * - Show success toast with source locale shortcut
   * - Redirect to new locale edit page
   */
  handleCreateTranslationSuccess(e, t) {
    const n = typeof e.id == "string" ? e.id : String(e.id || ""), s = typeof e.locale == "string" ? e.locale : "";
    if (!n) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const o = this.config.actionBasePath, i = new URLSearchParams();
    s && i.set("locale", s);
    const a = this.getContentChannel();
    a && i.set("channel", a);
    const l = i.toString(), c = `${o}/${n}/edit${l ? `?${l}` : ""}`, d = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", p = this.localeLabel(s || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${p} translation created`, {
      action: {
        label: `View ${d.toUpperCase()}`,
        handler: () => {
          const f = new URLSearchParams();
          f.set("locale", d), a && f.set("channel", a);
          const m = typeof t.id == "string" ? t.id : String(t.id || n);
          window.location.href = `${o}/${m}/edit?${f.toString()}`;
        }
      }
    }) : console.log(`[SchemaActionBuilder] Translation created: ${s}`), window.location.href = c;
  }
  /**
   * Build action payload from record and schema
   */
  async buildActionPayload(e, t) {
    const n = t.name.trim().toLowerCase(), s = {
      id: e.id
    };
    this.config.locale && n !== "create_translation" && (s.locale = this.config.locale);
    const o = this.getContentChannel();
    if (o && (s.channel = o), this.config.panelName && (s.policy_entity = this.config.panelName), s.expected_version === void 0) {
      const d = this.resolveExpectedVersion(e);
      d !== null && (s.expected_version = d);
    }
    const i = this.normalizePayloadSchema(t.payload_schema), a = this.collectRequiredFields(t.payload_required, i);
    if (n === "create_translation" && this.applySchemaTranslationContext(s, e, i), i?.properties)
      for (const [d, p] of Object.entries(i.properties))
        s[d] === void 0 && p.default !== void 0 && (s[d] = p.default);
    a.includes("idempotency_key") && this.isEmptyPayloadValue(s.idempotency_key) && (s.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const l = a.filter((d) => this.isEmptyPayloadValue(s[d]));
    if (l.length === 0)
      return s;
    const c = await this.promptForPayload(t, l, i, s, e);
    if (c === null)
      return null;
    for (const d of l) {
      const p = i?.properties?.[d], h = c[d] ?? "", f = this.coercePromptValue(h, d, p);
      if (f.error)
        throw new Error(f.error);
      s[d] = f.value;
    }
    return s;
  }
  /**
   * Prompt user for required payload values
   * Uses the lazy payload modal proxy.
   */
  async promptForPayload(e, t, n, s, o) {
    if (t.length === 0)
      return {};
    const i = t.map((l) => {
      const c = n?.properties?.[l];
      return {
        name: l,
        label: c?.title || l,
        description: c?.description,
        value: this.stringifyDefault(s[l] ?? c?.default),
        type: c?.type || "string",
        options: this.buildFieldOptions(l, e.name, c, o, s)
      };
    });
    return await Ks.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: i
    });
  }
  /**
   * Build field options from schema property
   */
  buildFieldOptions(e, t, n, s, o) {
    const i = this.deriveCreateTranslationLocaleOptions(e, t, s, n, o);
    if (i && i.length > 0)
      return i;
    if (!n)
      return;
    if (n.oneOf)
      return n.oneOf.filter((l) => l && "const" in l).map((l) => ({
        value: this.stringifyDefault(l.const),
        label: l.title || this.stringifyDefault(l.const)
      }));
    if (n.enum)
      return n.enum.map((l) => ({
        value: this.stringifyDefault(l),
        label: this.stringifyDefault(l)
      }));
    const a = this.buildExtensionFieldOptions(n);
    if (a && a.length > 0)
      return a;
  }
  buildExtensionFieldOptions(e) {
    const t = e, n = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(n) || n.length === 0)
      return;
    const s = [];
    for (const o of n) {
      if (typeof o == "string") {
        const d = this.stringifyDefault(o);
        if (!d)
          continue;
        s.push({ value: d, label: d });
        continue;
      }
      if (!o || typeof o != "object")
        continue;
      const i = o.value, a = this.stringifyDefault(i);
      if (!a)
        continue;
      const l = o.label, c = this.stringifyDefault(l) || a;
      s.push({ value: a, label: c });
    }
    return s.length > 0 ? s : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, n, s, o) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !n || typeof n != "object")
      return;
    const i = this.asObject(n.translation_readiness), a = o && typeof o == "object" ? o : {};
    let l = this.asStringArray(a.missing_locales);
    if (l.length === 0 && (l = this.asStringArray(i?.missing_required_locales)), l.length === 0 && (l = this.asStringArray(n.missing_locales)), l.length === 0 && i) {
      const v = this.asStringArray(i.required_locales), g = new Set(this.asStringArray(i.available_locales));
      l = v.filter((x) => !g.has(x));
    }
    const c = this.asStringArray(s?.enum);
    if (c.length > 0) {
      const v = new Set(c);
      l = l.filter((g) => v.has(g));
    }
    if (l.length === 0)
      return;
    const d = this.extractStringField(a, "recommended_locale") || this.extractStringField(n, "recommended_locale") || this.extractStringField(i || {}, "recommended_locale"), p = this.asStringArray(
      a.required_for_publish ?? n.required_for_publish ?? i?.required_for_publish ?? i?.required_locales
    ), h = this.asStringArray(
      a.existing_locales ?? n.existing_locales ?? i?.available_locales
    ), f = this.createTranslationLocaleLabelMap(s), m = /* @__PURE__ */ new Set(), y = [];
    for (const v of l) {
      const g = v.trim().toLowerCase();
      if (!g || m.has(g))
        continue;
      m.add(g);
      const x = d?.toLowerCase() === g, I = p.includes(g), C = [];
      I && C.push("Required for publishing"), h.length > 0 && C.push(`${h.length} translation${h.length > 1 ? "s" : ""} exist`);
      const w = C.length > 0 ? C.join(" • ") : void 0, z = f[g] || this.localeLabel(g);
      let _e = `${g.toUpperCase()} - ${z}`;
      x && (_e += " (recommended)"), y.push({
        value: g,
        label: _e,
        description: w,
        recommended: x
      });
    }
    return y.sort((v, g) => v.recommended && !g.recommended ? -1 : !v.recommended && g.recommended ? 1 : v.value.localeCompare(g.value)), y.length > 0 ? y : void 0;
  }
  applySchemaTranslationContext(e, t, n) {
    if (!n)
      return;
    const s = this.extractTranslationContextMap(n);
    if (Object.keys(s).length !== 0)
      for (const [o, i] of Object.entries(s)) {
        const a = o.trim(), l = i.trim();
        if (!a || !l || !this.isEmptyPayloadValue(e[a]))
          continue;
        const c = this.resolveRecordContextValue(t, l);
        c != null && (e[a] = this.clonePayloadValue(c));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t))
      return {};
    const n = {};
    for (const [s, o] of Object.entries(t)) {
      const i = s.trim(), a = typeof o == "string" ? o.trim() : "";
      !i || !a || (n[i] = a);
    }
    return n;
  }
  clonePayloadValue(e) {
    return Array.isArray(e) ? e.map((t) => this.clonePayloadValue(t)) : e && typeof e == "object" ? { ...e } : e;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e)
      return t;
    if (Array.isArray(e.oneOf))
      for (const o of e.oneOf) {
        const i = this.stringifyDefault(o?.const).trim().toLowerCase();
        if (!i)
          continue;
        const a = this.stringifyDefault(o?.title).trim();
        a && (t[i] = a);
      }
    const n = e, s = n["x-options"] ?? n.x_options ?? n.xOptions;
    if (Array.isArray(s))
      for (const o of s) {
        if (!o || typeof o != "object")
          continue;
        const i = this.stringifyDefault(o.value).trim().toLowerCase(), a = this.stringifyDefault(o.label).trim();
        i && a && (t[i] = a);
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
      if (typeof n == "number" && Number.isFinite(n) && n > 0)
        return n;
      if (typeof n == "string") {
        const s = n.trim();
        if (!s)
          continue;
        const o = Number(s);
        if (Number.isFinite(o) && o > 0)
          return s;
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
  /**
   * Stringify default value for form input
   */
  stringifyDefault(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "object")
      try {
        return JSON.stringify(e);
      } catch {
        return "";
      }
    return String(e);
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e.properties;
    let n;
    if (t && typeof t == "object" && !Array.isArray(t)) {
      n = {};
      for (const [l, c] of Object.entries(t))
        c && typeof c == "object" && !Array.isArray(c) && (n[l] = c);
    }
    const s = e.required, o = Array.isArray(s) ? s.filter((l) => typeof l == "string").map((l) => l.trim()).filter((l) => l.length > 0) : void 0, i = e["x-translation-context"] ?? e.x_translation_context, a = i && typeof i == "object" && !Array.isArray(i) ? i : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: o,
      properties: n,
      ...a ? { "x-translation-context": a } : {}
    };
  }
  collectRequiredFields(e, t) {
    const n = [], s = /* @__PURE__ */ new Set(), o = (i) => {
      const a = i.trim();
      !a || s.has(a) || (s.add(a), n.push(a));
    };
    return Array.isArray(e) && e.forEach((i) => o(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => o(String(i))), n;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const n = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), s = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), o = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${n || "action"}-${s || "record"}-${o}`;
  }
  coercePromptValue(e, t, n) {
    const s = typeof e == "string" ? e.trim() : String(e ?? "").trim(), o = typeof n?.type == "string" ? n.type.toLowerCase() : "string";
    if (s.length === 0)
      return { value: s };
    if (o === "number" || o === "integer") {
      const i = Number(s);
      return Number.isFinite(i) ? { value: o === "integer" ? Math.trunc(i) : i } : { value: null, error: `${t} must be a valid number` };
    }
    if (o === "boolean") {
      const i = s.toLowerCase();
      return i === "true" || i === "1" || i === "yes" ? { value: !0 } : i === "false" || i === "0" || i === "no" ? { value: !1 } : { value: null, error: `${t} must be true or false` };
    }
    if (o === "array" || o === "object")
      try {
        return { value: JSON.parse(s) };
      } catch {
        return { value: null, error: `${t} must be valid JSON (${o === "array" ? "[...]" : "{...}"})` };
      }
    return { value: s };
  }
  buildActionErrorMessage(e, t) {
    return q(t, `${e} failed`);
  }
  /**
   * Build URL query context from locale/channel
   */
  buildQueryContext() {
    const e = new URLSearchParams();
    this.config.locale && e.set("locale", this.config.locale);
    const t = this.getContentChannel();
    return t && e.set("channel", t), e.toString();
  }
  /**
   * Append default actions (view, edit, delete) avoiding duplicates
   */
  appendDefaultActions(e, t, n) {
    const s = String(t.id || ""), o = this.config.actionBasePath, i = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = M(o, s, "", n);
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
            window.location.href = M(o, s, "edit", n);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    for (const a of i)
      this.seenActions.has(a.name) || (this.seenActions.add(a.name), e.push(a.button));
  }
  /**
   * Append default actions with ordering metadata
   */
  appendDefaultActionsOrdered(e, t, n, s) {
    const o = String(t.id || ""), i = this.config.actionBasePath, a = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            window.location.href = M(i, o, "", n);
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
            window.location.href = M(i, o, "edit", n);
          }
        }
      },
      {
        name: "delete",
        button: this.buildDeleteAction(t, "Delete", "danger", "trash")
      }
    ];
    let l = s;
    for (const c of a)
      this.seenActions.has(c.name) || (this.seenActions.add(c.name), e.push({
        action: c.button,
        name: c.name,
        order: this.resolveActionOrder(c.name, void 0),
        insertionIndex: l++
      }));
  }
  /**
   * Get default icon for action by name
   */
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
}
function ta(r, e, t) {
  return new Ct(t).buildRowActions(r, e);
}
function ra(r) {
  return r.schema?.actions;
}
function Qs() {
  const r = globalThis.window;
  return r?.toastManager ? r.toastManager : new O();
}
function ye(r, e) {
  return (typeof r.id == "string" && r.id.trim() ? r.id.trim() : `${r.label}-${e + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `action-${e + 1}`;
}
function Ws(r, e) {
  const t = "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  if (e)
    return `${t} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 focus:ring-gray-300`;
  switch ((r.variant || "secondary").toLowerCase()) {
    case "primary":
      return `${t} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    case "danger":
      return `${t} border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case "success":
      return `${t} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
    case "warning":
      return `${t} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`;
    default:
      return `${t} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`;
  }
}
function Xs(r, e) {
  const t = "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors";
  if (e)
    return `${t} cursor-not-allowed text-gray-400`;
  switch ((r.variant || "secondary").toLowerCase()) {
    case "danger":
      return `${t} text-red-600 hover:bg-red-50`;
    case "success":
      return `${t} text-emerald-600 hover:bg-emerald-50`;
    case "warning":
      return `${t} text-amber-600 hover:bg-amber-50`;
    default:
      return `${t} text-gray-700 hover:bg-gray-50`;
  }
}
function je(r) {
  const e = {
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
  }, t = String(r.id || "").toLowerCase().replace(/[^a-z_]/g, "_");
  return e[t] || "";
}
function Zs(r) {
  const e = r.findIndex((n) => String(n.id || "").toLowerCase() === "edit");
  if (e >= 0)
    return {
      primary: r[e],
      rest: [...r.slice(0, e), ...r.slice(e + 1)]
    };
  const t = r.findIndex((n) => (n.variant || "").toLowerCase() === "primary");
  return t >= 0 ? {
    primary: r[t],
    rest: [...r.slice(0, t), ...r.slice(t + 1)]
  } : r.length === 1 ? { primary: r[0], rest: [] } : { primary: null, rest: r };
}
function eo(r) {
  if (r.length === 0)
    return "";
  const { primary: e, rest: t } = Zs(r);
  let n = "";
  if (e) {
    const o = e.disabled === !0, i = ye(e, 0), a = je(e), l = o ? (e.disabledReason || "Action unavailable").trim() : "", c = l ? `detail-action-reason-${i}` : "", d = c ? `aria-describedby="${c}"` : "", p = l ? `${e.label} unavailable: ${l}` : e.label, h = o && e.remediation?.href && e.remediation?.label ? `
          <a
            href="${u(e.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${u(i)}"
          >
            ${u(e.remediation.label.trim())}
          </a>
        ` : "", f = l ? `title="${u(l)}"` : "", m = o && l ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${u(l)}"
           aria-hidden="true"
         >?</span>
         <span class="sr-only" data-detail-action-reason="${u(i)}" id="detail-action-reason-${u(i)}">${u(l)}</span>` : "";
    n = `
      <div data-detail-action-card="${u(i)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${Ws(e, o)}"
          data-detail-action-button="${u(i)}"
          data-detail-action-name="${u(e.id || e.label)}"
          data-disabled="${o}"
          aria-disabled="${o ? "true" : "false"}"
          aria-label="${u(p)}"
          ${d}
          ${f}
        >
          ${a ? `<i class="${a}"></i>` : ""}
          ${u(e.label)}
          ${m}
        </button>
        ${o && h ? h : ""}
      </div>
    `;
  }
  let s = "";
  return t.length > 0 && (s = `
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
          ${t.map((i, a) => {
    const l = i.disabled === !0, c = ye(i, e ? a + 1 : a), d = je(i), p = l ? (i.disabledReason || "Action unavailable").trim() : "", h = p ? `detail-action-reason-${c}` : "", f = h ? `aria-describedby="${h}"` : "", m = p ? `${i.label} unavailable: ${p}` : i.label, y = i.variant === "danger" && a > 0 ? '<div class="my-1 border-t border-gray-100"></div>' : "", v = p ? `title="${u(p)}"` : "", g = l && i.remediation?.href && i.remediation?.label ? `
            <a
              href="${u(i.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${u(c)}"
            >
              ${u(i.remediation.label.trim())}
            </a>
          ` : "", x = l && p ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${u(p)}"
             aria-hidden="true"
           >?</span>
           <span class="sr-only" data-detail-action-reason="${u(c)}" id="detail-action-reason-${u(c)}">${u(p)}</span>` : "";
    return `
        ${y}
        <div data-detail-action-card="${u(c)}" class="space-y-1">
          <button
            type="button"
            class="${Xs(i, l)}"
            data-detail-action-button="${u(c)}"
            data-detail-action-name="${u(i.id || i.label)}"
            data-disabled="${l}"
            aria-disabled="${l ? "true" : "false"}"
            aria-label="${u(m)}"
            ${f}
            ${v}
          >
            ${d ? `<i class="${d} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${u(i.label)}</span>
            ${x}
            ${l ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ""}
          </button>
          ${l && g ? g : ""}
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
class to {
  constructor(e) {
    this.actions = [], this.record = null, this.documentClickHandler = null, this.documentKeydownHandler = null, this.mount = e.mount, this.notifier = e.notifier || Qs(), this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
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
    const t = e.data && typeof e.data == "object" ? e.data : null, n = Array.isArray(e.schema?.actions) ? e.schema.actions : [];
    if (!t || n.length === 0) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const s = this.panelName(), o = this.recordID(), i = this.panelBasePath(), a = `${this.apiBasePath()}/panels/${encodeURIComponent(s)}`, l = new URLSearchParams(window.location.search), c = l.get("locale") || void 0, d = l.get("channel") || l.get("environment") || void 0, p = new Ct({
      apiEndpoint: a,
      actionBasePath: i,
      panelName: s,
      locale: c,
      channel: d,
      actionContext: "detail",
      onActionSuccess: async (h) => {
        if (h === "delete") {
          const f = this.backHref();
          if (f) {
            window.location.assign(f);
            return;
          }
          window.location.assign(i);
          return;
        }
        await this.refresh();
      },
      onActionError: (h, f) => {
        this.notifier.error(q(f, `${h} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      }
    });
    this.record = t, this.actions = p.buildRowActions(t, n), this.mount.innerHTML = eo(this.actions), this.mount.setAttribute("aria-busy", "false"), this.attachListeners(o), this.attachDropdownListeners();
  }
  async fetchDetailPayload() {
    const e = this.detailEndpoint();
    if (!e)
      return null;
    const t = await this.fetchImpl(e, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!t.ok)
      return this.notifier.error(`Actions unavailable (${t.status})`), null;
    const n = await t.json().catch(() => null);
    return !n || typeof n != "object" ? null : Ke(n);
  }
  attachListeners(e) {
    this.actions.forEach((t, n) => {
      const s = ye(t, n), o = this.mount.querySelector(`[data-detail-action-button="${s}"]`);
      o && o.addEventListener("click", async (i) => {
        if (i.preventDefault(), !(o.getAttribute("aria-disabled") === "true" || o.dataset.disabled === "true"))
          try {
            await t.action({
              ...this.record || {},
              id: e
            });
          } catch (a) {
            if (!R(a)) {
              const l = F(a), c = l ? q(l, `${t.label} failed`) : a instanceof Error ? a.message : `${t.label} failed`;
              this.notifier.error(c);
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
    if (!e)
      return;
    const t = e.querySelector("[data-detail-actions-dropdown-trigger]"), n = e.querySelector("[data-detail-actions-dropdown-menu]");
    !t || !n || (t.addEventListener("click", (s) => {
      s.preventDefault(), s.stopPropagation(), !n.classList.contains("hidden") ? this.closeDropdown(t, n) : this.openDropdown(t, n);
    }), this.documentClickHandler = (s) => {
      e.contains(s.target) || this.closeDropdown(t, n);
    }, document.addEventListener("click", this.documentClickHandler), this.documentKeydownHandler = (s) => {
      s.key === "Escape" && !n.classList.contains("hidden") && (this.closeDropdown(t, n), t.focus());
    }, document.addEventListener("keydown", this.documentKeydownHandler), n.querySelectorAll("[data-detail-action-button]").forEach((s) => {
      s.addEventListener("click", (o) => {
        if (s.getAttribute("aria-disabled") === "true" || s.dataset.disabled === "true") {
          o.preventDefault();
          return;
        }
        this.closeDropdown(t, n);
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
    if (!e || !t)
      return "";
    const n = new URLSearchParams(window.location.search), s = n.get("locale"), o = n.get("channel") || n.get("environment"), i = `${this.apiBasePath()}/panels/${encodeURIComponent(e)}/${encodeURIComponent(t)}`;
    if (!s && !o)
      return i;
    const a = new URLSearchParams();
    return s && a.set("locale", s), o && a.set("channel", o), `${i}?${a.toString()}`;
  }
  apiBasePath() {
    return String(this.mount.dataset.apiBasePath || "").trim().replace(/\/$/, "");
  }
  panelBasePath() {
    const e = String(this.mount.dataset.panelBasePath || "").trim();
    if (e)
      return e.replace(/\/$/, "");
    const t = String(this.mount.dataset.basePath || "").trim().replace(/\/$/, ""), n = this.panelName();
    return `${t}/${n}`.replace(/\/{2,}/g, "/");
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
}
async function na(r = document) {
  const e = Array.from(r.querySelectorAll("[data-panel-detail-actions]")), t = [];
  for (const n of e) {
    const s = new to({ mount: n });
    t.push(s), await s.init();
  }
  return t;
}
class Ae extends He {
  constructor(e) {
    super({
      size: "lg",
      initialFocus: "[data-blocker-action]",
      lockBodyScroll: !0,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0
    }), this.localeStates = /* @__PURE__ */ new Map(), this.resolved = !1, this.config = e;
    for (const t of e.missingLocales)
      this.localeStates.set(t, { loading: !1, created: !1 });
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || null;
  }
  /**
   * Show the translation blocker modal.
   * Returns a promise that resolves when the modal is closed.
   */
  static showBlocker(e) {
    return new Promise((t) => {
      const n = e.onDismiss;
      new Ae({
        ...e,
        onDismiss: () => {
          n?.(), t();
        }
      }).show();
    });
  }
  renderContent() {
    const e = this.config.transition || "complete action", t = this.config.entityType || "content", n = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
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
                Cannot ${u(e)} ${u(t)}
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
            Retry ${u(e)}
          </button>
        </div>
        <p id="retry-hint" class="sr-only">Retry the blocked action after creating missing translations</p>
      </div>
    `;
  }
  renderDescription(e) {
    return e ? "Required translations are missing or incomplete. Create or complete the translations listed below." : "Required translations are missing. Create the translations listed below to continue.";
  }
  renderLocaleItem(e) {
    const t = this.localeStates.get(e) || { loading: !1, created: !1 }, n = this.config.missingFieldsByLocale?.[e], s = Array.isArray(n) && n.length > 0, o = this.getLocaleLabel(e), i = t.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${t.loading ? "opacity-50" : ""}"
          data-locale-item="${u(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${u(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${u(o)}
              </span>
              ${t.created ? `
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
                  ${n.map((l) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${u(l)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${t.created ? this.renderOpenButton(e, t.newRecordId) : this.renderCreateButton(e, i)}
            ${this.renderOpenButton(e, void 0, t.created)}
          </div>
        </div>
        ${t.loading ? `
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
  renderCreateButton(e, t) {
    return `
      <button type="button"
              data-blocker-action="create"
              data-locale="${u(e)}"
              ${t}
              class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Create ${this.getLocaleLabel(e)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Create
      </button>
    `;
  }
  renderOpenButton(e, t, n = !1) {
    if (n) return "";
    const s = this.config.navigationBasePath, o = t || this.config.recordId, i = new URLSearchParams();
    i.set("locale", e);
    const a = this.getContentChannel();
    a && i.set("channel", a);
    const l = `${s}/${o}/edit?${i.toString()}`;
    return `
      <a href="${u(l)}"
         data-blocker-action="open"
         data-locale="${u(e)}"
         class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
         aria-label="Open ${this.getLocaleLabel(e)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open
      </a>
    `;
  }
  getLocaleLabel(e) {
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
    }[e.toLowerCase()] || e.toUpperCase();
  }
  bindContentEvents() {
    this.container?.querySelector("[data-blocker-dismiss]")?.addEventListener("click", () => {
      this.dismiss();
    }), this.container?.querySelector("[data-blocker-retry]")?.addEventListener("click", async () => {
      await this.handleRetry();
    }), this.container?.querySelectorAll('[data-blocker-action="create"]')?.forEach((o) => {
      o.addEventListener("click", () => {
        const i = o.getAttribute("data-locale");
        i && this.handleCreateTranslation(i);
      });
    });
    const s = this.container?.querySelectorAll("[data-locale-item]");
    s?.forEach((o, i) => {
      o.addEventListener("keydown", (a) => {
        a.key === "ArrowDown" && i < s.length - 1 ? (a.preventDefault(), s[i + 1].querySelector("[data-blocker-action]")?.focus()) : a.key === "ArrowUp" && i > 0 && (a.preventDefault(), s[i - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(e) {
    const t = this.localeStates.get(e);
    if (!(!t || t.loading || t.created)) {
      t.loading = !0, this.updateLocaleItemUI(e);
      try {
        const n = {
          id: this.config.recordId,
          locale: e
        }, s = this.getContentChannel();
        s && (n.channel = s), this.config.panelName && (n.policy_entity = this.config.panelName);
        const o = `${this.config.apiEndpoint}/actions/create_translation`, i = await ve(o, n);
        if (i.success) {
          t.loading = !1, t.created = !0, i.data?.id && (t.newRecordId = String(i.data.id)), this.updateLocaleItemUI(e);
          const a = {
            id: t.newRecordId || this.config.recordId,
            locale: e,
            status: String(i.data?.status || "draft"),
            family_id: i.data?.family_id ? String(i.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(e, a);
        } else {
          t.loading = !1, this.updateLocaleItemUI(e);
          const a = i.error?.message || "Failed to create translation";
          this.config.onError?.(a);
        }
      } catch (n) {
        t.loading = !1, this.updateLocaleItemUI(e);
        const s = n instanceof Error ? n.message : "Failed to create translation";
        this.config.onError?.(s);
      }
    }
  }
  updateLocaleItemUI(e) {
    const t = this.container?.querySelector(`[data-locale-item="${e}"]`);
    if (!t || !this.localeStates.get(e)) return;
    const s = t.parentElement;
    if (!s) return;
    const o = document.createElement("div");
    o.innerHTML = this.renderLocaleItem(e);
    const i = o.firstElementChild;
    i && (s.replaceChild(i, t), i.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
      this.handleCreateTranslation(e);
    }));
  }
  async handleRetry() {
    if (this.resolved = !0, this.hide(), !!this.config.onRetry)
      try {
        await this.config.onRetry();
      } catch (e) {
        const t = e instanceof Error ? e.message : "Retry failed";
        this.config.onError?.(t);
      }
  }
  dismiss() {
    this.resolved = !0, this.config.onDismiss?.(), this.hide();
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.config.onDismiss?.()), !0;
  }
}
async function sa(r) {
  try {
    await Ae.showBlocker(r);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = r.transition || "complete action", n = r.missingLocales.join(", "), s = `Cannot ${t}: Missing translations for ${n}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(s) : alert(s);
  }
}
const ro = [
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
];
class $t {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || ro
    }, this.container = t;
  }
  /**
   * Render the legend into the container
   */
  render() {
    if (!this.container) {
      console.warn("[StatusLegend] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML();
  }
  /**
   * Build HTML for the legend
   */
  buildHTML() {
    const { title: e, orientation: t, size: n, items: s, containerClass: o } = this.config, i = t === "vertical", a = n === "sm", l = i ? "flex-col" : "flex-row flex-wrap", c = a ? "gap-2" : "gap-4", d = a ? "text-xs" : "text-sm", p = a ? "text-sm" : "text-base", h = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${u(e)}</span>` : "", f = s.map((m) => this.renderItem(m, p, d)).join("");
    return `
      <div class="status-legend inline-flex items-center ${l} ${c} ${o}"
           role="list"
           aria-label="Translation status legend">
        ${h}
        ${f}
      </div>
    `;
  }
  /**
   * Render a single legend item
   */
  renderItem(e, t, n) {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${u(e.description)}"
           aria-label="${u(e.label)}: ${u(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${n}">${u(e.label)}</span>
      </div>
    `;
  }
  /**
   * Update items and re-render
   */
  setItems(e) {
    this.config.items = e, this.render();
  }
  /**
   * Destroy the legend
   */
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
}
function no(r) {
  const e = new $t(r);
  return e.render(), e;
}
function oa() {
  const r = document.querySelectorAll("[data-status-legend]"), e = [];
  return r.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const n = t.dataset.orientation || "horizontal", s = t.dataset.size || "default", o = t.dataset.title || "", i = no({
      container: t,
      orientation: n,
      size: s,
      title: o
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(i);
  }), e;
}
function ia(r = {}) {
  const e = document.createElement("div");
  return new $t({
    container: e,
    ...r
  }).buildHTML();
}
const kt = [
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
];
class so {
  constructor(e) {
    if (this.container = null, this.config = e, this.container = typeof e.container == "string" ? document.querySelector(e.container) : e.container, this.state = {
      activeKey: null,
      capabilities: /* @__PURE__ */ new Map()
    }, e.capabilities)
      for (const t of e.capabilities)
        this.state.capabilities.set(t.key, t);
    for (const t of e.filters)
      this.state.capabilities.has(t.key) || this.state.capabilities.set(t.key, { key: t.key, supported: !0 });
    this.render();
  }
  /**
   * Render the quick filters
   */
  render() {
    if (!this.container) {
      console.warn("[QuickFilters] Container not found");
      return;
    }
    const { size: e = "default", containerClass: t = "" } = this.config, n = e === "sm" ? "text-xs" : "text-sm", s = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", o = this.config.filters.map((i) => this.renderFilterButton(i, n, s)).join("");
    this.container.innerHTML = `
      <div class="quick-filters inline-flex items-center gap-1 flex-wrap ${t}"
           role="group"
           aria-label="Quick filters">
        ${o}
      </div>
    `, this.bindEventListeners();
  }
  /**
   * Render a single filter button
   */
  renderFilterButton(e, t, n) {
    const s = this.state.capabilities.get(e.key), o = s?.supported !== !1, i = this.state.activeKey === e.key, a = s?.disabledReason || "Filter not available", l = `inline-flex items-center gap-1 ${n} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let c, d;
    o ? i ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${b(a)}"`);
    const p = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${b(e.key)}"
              ${d}
              ${o ? "" : "disabled"}>
        ${p}
        <span>${u(e.label)}</span>
      </button>
    `;
  }
  /**
   * Bind event listeners to filter buttons
   */
  bindEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll(".quick-filter-btn").forEach((t) => {
      t.addEventListener("click", () => {
        const n = t.dataset.filterKey;
        n && !t.disabled && this.selectFilter(n);
      });
    });
  }
  /**
   * Select a filter by key
   */
  selectFilter(e) {
    const t = this.config.filters.find((s) => s.key === e);
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
  /**
   * Clear the active filter
   */
  clearFilter() {
    this.state.activeKey = null, this.render(), this.config.onFilterSelect(null);
  }
  /**
   * Update filter capabilities
   */
  updateCapabilities(e) {
    for (const t of e)
      this.state.capabilities.set(t.key, t);
    this.render();
  }
  /**
   * Set a specific capability
   */
  setCapability(e, t, n) {
    this.state.capabilities.set(e, { key: e, supported: t, disabledReason: n }), this.render();
  }
  /**
   * Get current active filter
   */
  getActiveFilter() {
    return this.state.activeKey && this.config.filters.find((e) => e.key === this.state.activeKey) || null;
  }
  /**
   * Set active filter programmatically
   */
  setActiveFilter(e) {
    this.state.activeKey = e, this.render();
  }
  /**
   * Destroy the component
   */
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
}
function oo(r, e, t = {}) {
  return new so({
    container: r,
    filters: kt,
    onFilterSelect: e,
    ...t
  });
}
function aa(r) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((n) => {
    if (n.hasAttribute("data-quick-filters-init"))
      return;
    const s = n.dataset.size || "default", o = oo(
      n,
      (i) => r(i, n),
      { size: s }
    );
    n.setAttribute("data-quick-filters-init", "true"), t.push(o);
  }), t;
}
function la(r = {}) {
  const {
    filters: e = kt,
    activeKey: t = null,
    capabilities: n = [],
    size: s = "default",
    containerClass: o = ""
  } = r, i = s === "sm" ? "text-xs" : "text-sm", a = s === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const d of n)
    l.set(d.key, d);
  const c = e.map((d) => {
    const p = l.get(d.key), h = p?.supported !== !1, f = t === d.key, m = p?.disabledReason || "Filter not available", y = `inline-flex items-center gap-1 ${a} ${i} rounded-full font-medium`;
    let v;
    h ? f ? v = `${d.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : v = d.styleClass || "bg-gray-100 text-gray-700" : v = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const g = d.icon ? `<span>${d.icon}</span>` : "", x = h ? "" : `title="${b(m)}"`;
    return `<span class="${y} ${v}" ${x}>${g}<span>${u(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-1 flex-wrap ${o}">${c}</div>`;
}
const ce = "go-admin:translation-panel-expanded";
class io {
  constructor(e) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...e,
      storageKey: e.storageKey || ce
    };
  }
  init() {
    if (this.toggleButton = document.getElementById(this.config.toggleButtonId), this.panelElement = document.getElementById(this.config.panelId), this.expandAllButton = this.config.expandAllBtnId ? document.getElementById(this.config.expandAllBtnId) : null, this.collapseAllButton = this.config.collapseAllBtnId ? document.getElementById(this.config.collapseAllBtnId) : null, this.groupControls = this.config.groupControlsId ? document.getElementById(this.config.groupControlsId) : null, this.viewModeButtons = Array.from(
      document.querySelectorAll(this.config.viewModeSelector)
    ), !this.toggleButton || !this.panelElement)
      return;
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
      const n = this.toggleButton.querySelector("[data-chevron]");
      n && n.classList.toggle("rotate-180", e);
    }
    t && this.persistExpandedState(e), this.dispatchToggleEvent(e);
  }
  getPersistedExpandedState() {
    if (typeof window > "u" || !window.localStorage)
      return !1;
    try {
      return window.localStorage.getItem(this.config.storageKey || ce) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(e) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || ce, e ? "true" : "false");
      } catch {
      }
  }
  dispatchToggleEvent(e) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:toggle", {
      detail: {
        expanded: e
      }
    }));
  }
  dispatchViewModeEvent(e) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:view-mode", {
      detail: {
        mode: e,
        buttonCount: this.viewModeButtons.length
      }
    }));
  }
}
function ca(r) {
  return new io(r);
}
async function ao(r, e, t = {}) {
  const { apiEndpoint: n, notifier: s = new O(), maxFailuresToShow: o = 5 } = r, i = `${n}/bulk/create-missing-translations`;
  try {
    const a = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        ids: e,
        locales: t.locales
      })
    });
    if (!a.ok) {
      const d = await a.text();
      let p = `Request failed: ${a.status}`;
      try {
        const h = JSON.parse(d);
        p = h.error || h.message || p;
      } catch {
        d && (p = d);
      }
      throw new Error(p);
    }
    const l = await a.json(), c = lo(l, o);
    return co(c, s), r.onSuccess && r.onSuccess(c), c;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw s.error(`Failed to create translations: ${l.message}`), r.onError && r.onError(l), l;
  }
}
function lo(r, e) {
  const t = r.data || [], n = r.created_count ?? t.filter((l) => l.success).length, s = r.failed_count ?? t.filter((l) => !l.success).length, o = r.skipped_count ?? 0, i = r.total ?? t.length, a = t.filter((l) => !l.success && l.error).slice(0, e).map((l) => ({
    id: l.id,
    locale: l.locale,
    error: l.error || "Unknown error"
  }));
  return {
    total: i,
    created: n,
    failed: s,
    skipped: o,
    failures: a
  };
}
function co(r, e) {
  const { created: t, failed: n, skipped: s, total: o } = r;
  if (o === 0) {
    e.info("No translations to create");
    return;
  }
  n === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${s > 0 ? ` (${s} skipped)` : ""}`) : s > 0 && e.info(`All ${s} translation${s !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${n} translation${n !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${n}${s > 0 ? `, skipped ${s}` : ""}`
  );
}
function da(r) {
  const { created: e, failed: t, skipped: n, total: s, failures: o } = r, i = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${e}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${t > 0 ? "bg-red-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${t > 0 ? "text-red-700" : "text-gray-400"}">${t}</div>
        <div class="text-sm ${t > 0 ? "text-red-600" : "text-gray-500"}">Failed</div>
      </div>
      <div class="text-center p-3 ${n > 0 ? "bg-yellow-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${n > 0 ? "text-yellow-700" : "text-gray-400"}">${n}</div>
        <div class="text-sm ${n > 0 ? "text-yellow-600" : "text-gray-500"}">Skipped</div>
      </div>
    </div>
  `;
  let a = "";
  return o.length > 0 && (a = `
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
              ${o.map(
    (c) => `
        <tr>
          <td class="px-3 py-2 text-sm text-gray-700">${u(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${u(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${u(c.error)}</td>
        </tr>
      `
  ).join("")}
            </tbody>
          </table>
        </div>
        ${t > o.length ? `<p class="mt-2 text-sm text-gray-500">Showing ${o.length} of ${t} failures</p>` : ""}
      </div>
    `), `
    <div class="bulk-result-summary">
      <div class="mb-4 text-sm text-gray-600">
        Processed ${s} item${s !== 1 ? "s" : ""}
      </div>
      ${i}
      ${a}
    </div>
  `;
}
function ua(r) {
  const { created: e, failed: t, skipped: n } = r, s = [];
  return e > 0 && s.push(`<span class="text-green-600">+${e}</span>`), t > 0 && s.push(`<span class="text-red-600">${t} failed</span>`), n > 0 && s.push(`<span class="text-yellow-600">${n} skipped</span>`), s.join(" · ");
}
function pa(r, e, t) {
  return async (n) => ao(
    {
      apiEndpoint: r,
      notifier: e,
      onSuccess: t
    },
    n
  );
}
const uo = {
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
function A(r) {
  const e = r.toLowerCase();
  return uo[e] || r.toUpperCase();
}
class se {
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
  /**
   * Render the locale action chip as HTML string.
   * Use when generating static HTML.
   */
  render() {
    const { locale: e, size: t, mode: n, localeExists: s } = this.config, { loading: o, created: i, error: a } = this.state, l = A(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = n === "button" ? "rounded-lg" : "rounded-full";
    let p, h = "";
    o ? (p = "bg-gray-100 text-gray-600 border-gray-300", h = this.renderSpinner()) : i ? (p = "bg-green-100 text-green-700 border-green-300", h = this.renderCheckIcon()) : a ? (p = "bg-red-100 text-red-700 border-red-300", h = this.renderErrorIcon()) : s ? p = "bg-blue-100 text-blue-700 border-blue-300" : p = "bg-amber-100 text-amber-700 border-amber-300";
    const f = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${c} ${d} border ${p}"
           data-locale-action="${u(e)}"
           data-locale-exists="${s}"
           data-loading="${o}"
           data-created="${i}"
           role="group"
           aria-label="${l} translation">
        ${h}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${u(e)}</span>
        <span class="sr-only">${l}</span>
        ${f}
      </div>
    `;
  }
  /**
   * Render action buttons (create/open).
   */
  renderActions() {
    const { locale: e, localeExists: t, size: n } = this.config, { loading: s, created: o } = this.state, i = n === "sm" ? "p-0.5" : "p-1", a = n === "sm" ? "w-3 h-3" : "w-4 h-4", l = [];
    if (!t && !o && !s && l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${u(e)}"
                aria-label="Create ${A(e)} translation"
                title="Create ${A(e)} translation">
          <svg class="${a}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || o) {
      const c = o ? "hover:bg-green-200" : "hover:bg-blue-200", d = o ? "focus:ring-green-500" : "focus:ring-blue-500";
      l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded ${c} focus:outline-none focus:ring-1 ${d} transition-colors"
                data-action="open"
                data-locale="${u(e)}"
                aria-label="Open ${A(e)} translation"
                title="Open ${A(e)} translation">
          <svg class="${a}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
      `);
    }
    return l.join("");
  }
  /**
   * Mount the component to a container element and bind events.
   */
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector(`[data-locale-action="${this.config.locale}"]`), this.bindEvents();
  }
  /**
   * Bind event handlers to action buttons.
   */
  bindEvents() {
    if (!this.element) return;
    const e = this.element.querySelector('[data-action="create"]'), t = this.element.querySelector('[data-action="open"]');
    e?.addEventListener("click", (n) => {
      n.preventDefault(), n.stopPropagation(), this.handleCreate();
    }), t?.addEventListener("click", (n) => {
      n.preventDefault(), n.stopPropagation(), this.handleOpen();
    });
  }
  /**
   * Handle create translation action.
   */
  async handleCreate() {
    if (!(this.state.loading || this.state.created)) {
      this.setState({ loading: !0, error: null });
      try {
        const e = {
          id: this.config.recordId,
          locale: this.config.locale
        }, t = this.getContentChannel();
        t && (e.channel = t), this.config.panelName && (e.policy_entity = this.config.panelName);
        const n = `${this.config.apiEndpoint}/actions/create_translation`, s = await ve(n, e);
        if (s.success) {
          const o = s.data?.id ? String(s.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: o
          });
          const i = {
            id: o || this.config.recordId,
            locale: this.config.locale,
            status: String(s.data?.status || "draft"),
            familyId: s.data?.family_id ? String(s.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, i);
        } else {
          const o = s.error?.message || "Failed to create translation";
          this.setState({ loading: !1, error: o }), this.config.onError?.(this.config.locale, o);
        }
      } catch (e) {
        const t = e instanceof Error ? e.message : "Failed to create translation";
        this.setState({ loading: !1, error: t }), this.config.onError?.(this.config.locale, t);
      }
    }
  }
  /**
   * Handle open translation action.
   */
  handleOpen() {
    const { locale: e, navigationBasePath: t, recordId: n } = this.config, { newRecordId: s } = this.state, o = s || n, i = new URLSearchParams();
    i.set("locale", e);
    const a = this.getContentChannel();
    a && i.set("channel", a);
    const l = `${t}/${o}/edit?${i.toString()}`;
    this.config.onOpen?.(e, l), window.location.href = l;
  }
  /**
   * Update component state and re-render.
   */
  setState(e) {
    if (this.state = { ...this.state, ...e }, this.element) {
      const t = this.element.parentElement;
      t && this.mount(t);
    }
  }
  /**
   * Render spinner icon for loading state.
   */
  renderSpinner() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"} animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    `;
  }
  /**
   * Render check icon for success state.
   */
  renderCheckIcon() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    `;
  }
  /**
   * Render error icon for error state.
   */
  renderErrorIcon() {
    return `
      <svg class="${this.config.size === "sm" ? "w-3 h-3" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    `;
  }
  /**
   * Get current state (for testing/inspection).
   */
  getState() {
    return { ...this.state };
  }
}
function At(r) {
  return new se(r).render();
}
function ha(r, e) {
  return r.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${r.map((n) => {
    const s = { ...e, locale: n };
    return At(s);
  }).join("")}
    </div>
  `;
}
function fa(r, e) {
  const t = /* @__PURE__ */ new Map();
  return r.querySelectorAll("[data-locale-action]").forEach((s) => {
    const o = s.getAttribute("data-locale-action");
    if (!o) return;
    const i = s.getAttribute("data-locale-exists") === "true", a = { ...e, locale: o, localeExists: i }, l = new se(a), c = s.parentElement;
    c && (l.mount(c), t.set(o, l));
  }), t;
}
function ze(r, e, t, n) {
  const s = new URLSearchParams();
  s.set("locale", t);
  const o = String(n ?? "").trim();
  return o && s.set("channel", o), `${r}/${e}/edit?${s.toString()}`;
}
class Ee {
  constructor(e) {
    this.element = null, this.localeChip = null, this.config = {
      showFormLockMessage: !0,
      ...e
    };
  }
  /**
   * Check if fallback mode is active.
   */
  isInFallbackMode() {
    const { context: e } = this.config;
    return e.fallbackUsed || e.missingRequestedLocale;
  }
  /**
   * Get form lock state.
   */
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
  /**
   * Render the fallback banner as HTML string.
   */
  render() {
    if (!this.isInFallbackMode())
      return "";
    const { context: e, showFormLockMessage: t } = this.config, n = e.requestedLocale || "requested", s = e.resolvedLocale || "default", o = A(n), i = A(s), a = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${u(n)}"
           data-resolved-locale="${u(s)}">
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
                The <strong class="font-medium">${u(o)}</strong> (${u(n.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${u(i)}</strong> (${u(s.toUpperCase())}).
              </p>

              ${c}

              <!-- Actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                ${a}
                ${l}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render the primary CTA (Create missing locale).
   */
  renderPrimaryCta() {
    const { context: e, apiEndpoint: t, navigationBasePath: n, panelName: s, channel: o } = this.config, i = e.requestedLocale, a = String(o ?? "").trim();
    return !i || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${u(i)}"
              data-record-id="${u(e.recordId)}"
              data-api-endpoint="${u(t)}"
              data-panel="${u(s || "")}"
              data-channel="${u(a)}"
              aria-label="Create ${A(i)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${u(i.toUpperCase())} translation
      </button>
    `;
  }
  /**
   * Render the secondary CTA (Open source locale).
   */
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, channel: n } = this.config, s = e.resolvedLocale;
    if (!s || !e.recordId)
      return "";
    const o = ze(t, e.recordId, s, n);
    return `
      <a href="${u(o)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${u(s)}"
         aria-label="Open ${A(s)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${u(s.toUpperCase())} (source)
      </a>
    `;
  }
  /**
   * Render the form lock message.
   */
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
  /**
   * Mount the banner to a container and bind events.
   */
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector("[data-fallback-banner]"), this.bindEvents();
  }
  /**
   * Bind event handlers.
   */
  bindEvents() {
    if (!this.element) return;
    const e = this.element.querySelector('[data-action="create-translation"]'), t = this.element.querySelector('[data-action="open-source"]');
    e?.addEventListener("click", async (n) => {
      n.preventDefault(), await this.handleCreate();
    }), t?.addEventListener("click", (n) => {
      const s = t.getAttribute("data-locale"), o = t.getAttribute("href");
      s && o && this.config.onOpenSource?.(s, o);
    });
  }
  /**
   * Handle create translation action.
   */
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: n, channel: s, navigationBasePath: o } = this.config, i = e.requestedLocale, a = e.recordId, l = String(s ?? "").trim() || void 0;
    if (!i || !a) return;
    await new se({
      locale: i,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: o,
      panelName: n,
      channel: l,
      localeExists: !1,
      onCreateSuccess: (d, p) => {
        this.config.onCreateSuccess?.(d, p);
        const h = ze(o, p.id, d, l);
        window.location.href = h;
      },
      onError: (d, p) => {
        this.config.onError?.(p);
      }
    }).handleCreate();
  }
}
function po(r, e) {
  if (!e.locked) {
    ho(r);
    return;
  }
  if (r.classList.add("form-locked", "pointer-events-none", "opacity-75"), r.setAttribute("data-form-locked", "true"), r.setAttribute("data-lock-reason", e.reason || ""), r.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((n) => {
    n.setAttribute("disabled", "true"), n.setAttribute("data-was-enabled", "true"), n.setAttribute("aria-disabled", "true");
  }), !r.querySelector("[data-form-lock-overlay]")) {
    const n = document.createElement("div");
    n.setAttribute("data-form-lock-overlay", "true"), n.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", n.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(r).position === "static" && (r.style.position = "relative"), r.appendChild(n);
  }
}
function ho(r) {
  r.classList.remove("form-locked", "pointer-events-none", "opacity-75"), r.removeAttribute("data-form-locked"), r.removeAttribute("data-lock-reason"), r.querySelectorAll('[data-was-enabled="true"]').forEach((n) => {
    n.removeAttribute("disabled"), n.removeAttribute("data-was-enabled"), n.removeAttribute("aria-disabled");
  }), r.querySelector("[data-form-lock-overlay]")?.remove();
}
function ma(r) {
  return r.getAttribute("data-form-locked") === "true";
}
function ga(r) {
  return r.getAttribute("data-lock-reason");
}
function ba(r, e) {
  const t = _(r);
  return new Ee({ ...e, context: t }).render();
}
function ya(r) {
  const e = _(r);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function va(r, e) {
  const t = new Ee(e);
  return t.mount(r), t;
}
function wa(r, e) {
  const t = _(e), s = new Ee({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return po(r, s), s;
}
class Et {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = k(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  /**
   * Extract action state for a specific action from the record.
   */
  extractActionState(e, t) {
    return Qe(e, t);
  }
  /**
   * Check if the create_translation action is enabled.
   */
  isCreateActionEnabled() {
    return this.actionState ? this.actionState.enabled : !0;
  }
  /**
   * Get the disabled reason if create action is disabled.
   */
  getDisabledReason() {
    if (this.isCreateActionEnabled())
      return null;
    if (this.actionState?.reason)
      return this.actionState.reason;
    const e = We({ reason_code: this.actionState?.reason_code });
    if (e?.message)
      return e.message;
    const t = String(this.actionState?.reason_code || "").trim().toLowerCase();
    return t === "workflow_transition_not_available" ? "Translation creation is not available in the current workflow state." : t === "permission_denied" ? "You do not have permission to create translations." : "Translation creation is currently unavailable.";
  }
  /**
   * Get missing locales to display as chips.
   */
  getMissingLocales() {
    return this.readiness.hasReadinessMetadata ? this.readiness.missingRequiredLocales.slice(0, this.config.maxChips) : [];
  }
  /**
   * Get count of overflow locales (not displayed).
   */
  getOverflowCount() {
    if (!this.readiness.hasReadinessMetadata)
      return 0;
    const e = this.readiness.missingRequiredLocales.length;
    return Math.max(0, e - (this.config.maxChips || 3));
  }
  /**
   * Render the inline locale chips as HTML string.
   */
  render() {
    const e = this.getMissingLocales();
    if (e.length === 0)
      return "";
    const t = this.isCreateActionEnabled(), n = this.getDisabledReason(), s = this.getOverflowCount(), o = e.map(
      (l) => this.renderChip(l, t, n)
    ).join(""), i = s > 0 ? this.renderOverflow(s) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${u(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${o}${i}
      </div>
    `;
  }
  /**
   * Render a single locale chip.
   */
  renderChip(e, t, n) {
    const { recordId: s, apiEndpoint: o, navigationBasePath: i, panelName: a, channel: l, size: c } = this.config, d = String(l ?? "").trim() || void 0;
    return t ? At({
      locale: e,
      recordId: s,
      apiEndpoint: o,
      navigationBasePath: i,
      panelName: a,
      channel: d,
      localeExists: !1,
      size: c,
      mode: "chip",
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError
    }) : this.renderDisabledChip(e, n, c);
  }
  /**
   * Render a disabled locale chip (no action buttons).
   */
  renderDisabledChip(e, t, n) {
    const s = n === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", o = t || "Translation creation unavailable", i = A(e);
    return `
      <div class="inline-flex items-center gap-1 ${s} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${u(e)}"
           data-disabled="true"
           title="${u(o)}"
           role="listitem"
           aria-label="${i} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${u(e)}</span>
      </div>
    `;
  }
  /**
   * Render overflow indicator.
   */
  renderOverflow(e) {
    const { size: t } = this.config, n = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", s = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${n} rounded text-gray-500 font-medium"
            title="Also missing: ${u(s)}"
            aria-label="${e} more missing translations">
        +${e}
      </span>
    `;
  }
  /**
   * Mount the component and bind events.
   */
  mount(e) {
    e.innerHTML = this.render(), this.element = e.querySelector("[data-inline-locale-chips]"), this.bindEvents();
  }
  /**
   * Bind event handlers for actionable chips.
   */
  bindEvents() {
    if (!this.element || !this.isCreateActionEnabled()) return;
    this.element.querySelectorAll("[data-locale-action]").forEach((t) => {
      const n = t.getAttribute("data-locale-action");
      if (!n) return;
      const s = new se({
        locale: n,
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
      this.chips.set(n, s), t.querySelector('[data-action="create"]')?.addEventListener("click", async (a) => {
        a.preventDefault(), a.stopPropagation(), await s.handleCreate();
      }), t.querySelector('[data-action="open"]')?.addEventListener("click", (a) => {
        a.preventDefault(), a.stopPropagation(), s.handleOpen();
      });
    });
  }
  /**
   * Get chip instance by locale (for testing/inspection).
   */
  getChip(e) {
    return this.chips.get(e);
  }
}
function fo(r, e) {
  const t = String(r.id || "");
  return t ? new Et(r, { ...e, recordId: t }).render() : "";
}
function xa(r) {
  const e = k(r);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function Sa(r, e, t) {
  const n = String(e.id || ""), s = new Et(e, { ...t, recordId: n });
  return s.mount(r), s;
}
function Ca(r) {
  return (e, t, n) => fo(t, r);
}
function oe() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function mo() {
  return oe() ? "⌘" : "Ctrl";
}
function go(r) {
  if (oe())
    switch (r) {
      case "ctrl":
        return "⌃";
      case "alt":
        return "⌥";
      case "shift":
        return "⇧";
      case "meta":
        return "⌘";
    }
  switch (r) {
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
function Lt(r) {
  const e = r.modifiers.map(go), t = bo(r.key);
  return oe() ? [...e, t].join("") : [...e, t].join("+");
}
function bo(r) {
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
  }[r] || r.toUpperCase();
}
class _t {
  constructor(e = {}) {
    this.shortcuts = /* @__PURE__ */ new Map(), this.keydownHandler = null, this.boundElement = null, this.config = {
      enabled: !0,
      context: "global",
      ...e
    };
  }
  /**
   * Register a keyboard shortcut.
   */
  register(e, t = {}) {
    const { override: n = !1 } = t;
    if (this.shortcuts.has(e.id) && !n) {
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
  /**
   * Unregister a keyboard shortcut by ID.
   */
  unregister(e) {
    return this.shortcuts.delete(e);
  }
  /**
   * Enable or disable a specific shortcut.
   */
  setEnabled(e, t) {
    const n = this.shortcuts.get(e);
    n && (n.enabled = t);
  }
  /**
   * Set the current active context.
   */
  setContext(e) {
    this.config.context = e;
  }
  /**
   * Get the current context.
   */
  getContext() {
    return this.config.context || "global";
  }
  /**
   * Get all registered shortcuts.
   */
  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }
  /**
   * Get shortcuts by category.
   */
  getShortcutsByCategory(e) {
    return this.getShortcuts().filter((t) => t.category === e);
  }
  /**
   * Get shortcuts grouped by category.
   */
  getShortcutsGroupedByCategory() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.shortcuts.values()) {
      const n = e.get(t.category) || [];
      n.push(t), e.set(t.category, n);
    }
    return e;
  }
  /**
   * Bind keyboard event listeners.
   */
  bind(e = document) {
    this.keydownHandler && this.unbind(), this.keydownHandler = (t) => {
      this.handleKeydown(t);
    }, this.boundElement = e, e.addEventListener("keydown", this.keydownHandler);
  }
  /**
   * Unbind keyboard event listeners.
   */
  unbind() {
    this.keydownHandler && this.boundElement && (this.boundElement.removeEventListener("keydown", this.keydownHandler), this.keydownHandler = null, this.boundElement = null);
  }
  /**
   * Handle keydown event.
   */
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
        const n = t.handler(e);
        n instanceof Promise && n.catch((s) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, s);
        });
      } catch (n) {
        console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, n);
      }
    }
  }
  /**
   * Find a shortcut matching the given keyboard event.
   */
  findMatchingShortcut(e) {
    for (const t of this.shortcuts.values())
      if (this.matchesEvent(t, e))
        return t;
    return null;
  }
  /**
   * Check if a shortcut matches a keyboard event.
   */
  matchesEvent(e, t) {
    const n = t.key.toLowerCase(), s = e.key.toLowerCase();
    if (n !== s && t.code.toLowerCase() !== s)
      return !1;
    const o = oe(), i = new Set(e.modifiers), a = i.has("ctrl"), l = i.has("meta"), c = i.has("alt"), d = i.has("shift");
    return !(a && !(o ? t.metaKey : t.ctrlKey) || l && !o && !t.metaKey || c && !t.altKey || d && !t.shiftKey || !a && !l && (o ? t.metaKey : t.ctrlKey) || !c && t.altKey || !d && t.shiftKey);
  }
  /**
   * Check if an input element is focused.
   */
  isInputFocused(e) {
    const t = e.target;
    if (!t) return !1;
    const n = t.tagName.toLowerCase();
    return !!(n === "input" || n === "textarea" || n === "select" || t.isContentEditable);
  }
  /**
   * Destroy the registry and clean up.
   */
  destroy() {
    this.unbind(), this.shortcuts.clear();
  }
}
function yo(r) {
  const e = [];
  return r.onSave && e.push({
    id: "save",
    description: "Save changes",
    category: "save",
    key: "s",
    modifiers: ["ctrl"],
    handler: r.onSave,
    context: "form"
  }), r.onPublish && e.push({
    id: "publish",
    description: "Publish content",
    category: "actions",
    key: "p",
    modifiers: ["ctrl", "shift"],
    handler: r.onPublish,
    context: "form"
  }), r.onLocalePicker && e.push({
    id: "locale-picker",
    description: "Open locale picker",
    category: "locale",
    key: "l",
    modifiers: ["ctrl", "shift"],
    handler: r.onLocalePicker
  }), r.onPrevLocale && e.push({
    id: "prev-locale",
    description: "Switch to previous locale",
    category: "locale",
    key: "[",
    modifiers: ["ctrl"],
    handler: r.onPrevLocale
  }), r.onNextLocale && e.push({
    id: "next-locale",
    description: "Switch to next locale",
    category: "locale",
    key: "]",
    modifiers: ["ctrl"],
    handler: r.onNextLocale
  }), r.onCreateTranslation && e.push({
    id: "create-translation",
    description: "Create new translation",
    category: "actions",
    key: "t",
    modifiers: ["ctrl", "shift"],
    handler: r.onCreateTranslation
  }), e;
}
function $a(r) {
  const e = /* @__PURE__ */ new Map();
  for (const o of r) {
    if (o.enabled === !1) continue;
    const i = e.get(o.category) || [];
    i.push(o), e.set(o.category, i);
  }
  const t = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, n = ["save", "locale", "navigation", "actions", "help", "other"];
  let s = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const o of n) {
    const i = e.get(o);
    if (!(!i || i.length === 0)) {
      s += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${t[o]}</h4>
        <dl class="space-y-1">
    `;
      for (const a of i) {
        const l = Lt(a);
        s += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${u(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${u(l)}</kbd>
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
const Rt = "admin_keyboard_shortcuts_settings", It = "admin_keyboard_shortcuts_hint_dismissed", Q = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function ie() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function vo() {
  const r = ie();
  if (!r)
    return { ...Q };
  try {
    const e = r.getItem(Rt);
    if (!e)
      return { ...Q };
    const t = JSON.parse(e);
    return {
      enabled: typeof t.enabled == "boolean" ? t.enabled : !0,
      shortcuts: typeof t.shortcuts == "object" && t.shortcuts !== null ? t.shortcuts : {},
      updatedAt: typeof t.updatedAt == "string" ? t.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...Q };
  }
}
function ka(r) {
  const e = ie();
  if (e)
    try {
      const t = {
        ...r,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      e.setItem(Rt, JSON.stringify(t));
    } catch {
    }
}
function wo() {
  const r = ie();
  return r ? r.getItem(It) === "true" : !1;
}
function xo() {
  const r = ie();
  if (r)
    try {
      r.setItem(It, "true");
    } catch {
    }
}
function So(r) {
  if (wo())
    return null;
  const { container: e, position: t = "bottom", onDismiss: n, onShowHelp: s, autoDismissMs: o = 1e4 } = r, i = document.createElement("div");
  i.className = `shortcuts-discovery-hint fixed ${t === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, i.setAttribute("role", "alert"), i.setAttribute("aria-live", "polite");
  const a = mo();
  i.innerHTML = `
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
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${a}+S</kbd> to save.
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
  const l = (c) => {
    c && xo(), i.remove(), n?.();
  };
  return i.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    l(!0), s?.();
  }), i.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    l(!0);
  }), i.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    l(!1);
  }), o > 0 && setTimeout(() => {
    i.parentElement && l(!1);
  }, o), e.appendChild(i), i;
}
function Aa(r) {
  const { container: e, shortcuts: t, settings: n, onSettingsChange: s } = r, o = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, i = /* @__PURE__ */ new Map();
  for (const h of t) {
    const f = i.get(h.category) || [];
    f.push(h), i.set(h.category, f);
  }
  const a = ["save", "locale", "navigation", "actions", "help", "other"];
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
  for (const h of a) {
    const f = i.get(h);
    if (!(!f || f.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${o[h]}
        </h4>
        <div class="space-y-1">
    `;
      for (const m of f) {
        const y = n.shortcuts[m.id] !== !1, v = Lt(m);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${u(v)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${u(m.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${u(m.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${u(m.id)}"
                 ${y ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${u(m.description)} shortcut">
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
  `, e.innerHTML = l, e.querySelector('[data-settings-action="toggle-global"]')?.addEventListener("click", () => {
    const h = {
      ...n,
      enabled: !n.enabled
    };
    s(h);
  }), e.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((h) => {
    h.addEventListener("change", () => {
      const f = h.getAttribute("data-shortcut-id");
      if (!f) return;
      const m = {
        ...n,
        shortcuts: {
          ...n.shortcuts,
          [f]: h.checked
        }
      };
      s(m);
    });
  }), e.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    s({ ...Q });
  });
}
function Co(r, e) {
  const t = r;
  t.config && (t.config.enabled = e.enabled);
  for (const n of r.getShortcuts()) {
    const s = e.shortcuts[n.id] !== !1;
    r.setEnabled(n.id, s);
  }
}
let de = null;
function Ea() {
  return de || (de = new _t()), de;
}
function $o(r, e) {
  const t = vo(), n = new _t({
    ...e,
    enabled: t.enabled
  }), s = yo(r);
  for (const o of s)
    n.register(o);
  return Co(n, t), n.bind(), n;
}
function La(r, e) {
  const t = $o(r, e);
  return e.hintContainer && So({
    container: e.hintContainer,
    onShowHelp: e.onShowHelp,
    onDismiss: () => {
    }
  }), t;
}
const ko = 1500, Ao = 2e3, Le = "autosave", N = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Eo = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
};
class Bt {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? ko,
      savedDurationMs: e.savedDurationMs ?? Ao,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Le,
      labels: { ...N, ...e.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: { ...Eo, ...e.conflictLabels }
    };
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  /**
   * Get current autosave state.
   */
  getState() {
    return this.state;
  }
  /**
   * Check if there are unsaved changes.
   */
  hasPendingChanges() {
    return this.isDirty || this.pendingData !== null;
  }
  /**
   * Get the last error that occurred during save.
   */
  getLastError() {
    return this.lastError;
  }
  /**
   * Mark form as dirty with new data. Triggers debounced autosave.
   */
  markDirty(e) {
    this.isDirty = !0, this.pendingData = e, this.lastError = null, this.cancelDebounce(), this.config.onSave && (this.debounceTimer = setTimeout(() => {
      this.save();
    }, this.config.debounceMs)), (this.state === "saved" || this.state === "idle") && this.cancelSavedTimer(), this.render();
  }
  /**
   * Mark form as clean (no pending changes).
   */
  markClean() {
    this.isDirty = !1, this.pendingData = null, this.cancelDebounce(), this.setState("idle");
  }
  /**
   * Trigger save immediately (bypassing debounce).
   */
  async save() {
    if (!this.config.onSave || !this.isDirty && this.pendingData === null)
      return !0;
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
  /**
   * Retry a failed save.
   */
  async retry() {
    return this.state !== "error" && this.state !== "conflict" ? !0 : (this.conflictInfo = null, this.save());
  }
  // ---------------------------------------------------------------------------
  // Conflict Handling (TX-074)
  // ---------------------------------------------------------------------------
  /**
   * Get current conflict info if in conflict state.
   */
  getConflictInfo() {
    return this.conflictInfo;
  }
  /**
   * Check if in conflict state.
   */
  isInConflict() {
    return this.state === "conflict" && this.conflictInfo !== null;
  }
  /**
   * Resolve conflict by using server version (discard local changes).
   */
  async resolveWithServerVersion() {
    if (!this.isInConflict() || !this.conflictInfo) return;
    const e = this.conflictInfo;
    let t = e.latestServerState;
    if (!t && e.latestStatePath && this.config.fetchServerState)
      try {
        t = await this.config.fetchServerState(e.latestStatePath);
      } catch {
        this.lastError = new Error("Failed to fetch server version"), this.setState("error");
        return;
      }
    const n = {
      action: "use_server",
      serverState: t,
      localData: this.pendingData,
      conflict: e
    };
    if (this.isDirty = !1, this.pendingData = null, this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve)
      try {
        await this.config.onConflictResolve(n);
      } catch {
      }
  }
  /**
   * Resolve conflict by forcing save (overwrite server version).
   */
  async resolveWithForceSave() {
    if (!this.isInConflict() || !this.conflictInfo) return !0;
    if (!this.config.allowForceSave) return !1;
    const e = this.conflictInfo, t = {
      action: "force_save",
      localData: this.pendingData,
      conflict: e
    };
    if (this.config.onConflictResolve)
      try {
        await this.config.onConflictResolve(t);
      } catch {
      }
    return this.conflictInfo = null, this.save();
  }
  /**
   * Dismiss conflict without resolving (keep local changes but don't save).
   */
  dismissConflict() {
    if (!this.isInConflict() || !this.conflictInfo) return;
    const e = this.conflictInfo, t = {
      action: "dismiss",
      localData: this.pendingData,
      conflict: e
    };
    if (this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve)
      try {
        this.config.onConflictResolve(t);
      } catch {
      }
  }
  /**
   * Check if an error is an autosave conflict error.
   */
  isConflictError(e) {
    if (!e) return !1;
    const t = e;
    return !!(t.code === "AUTOSAVE_CONFLICT" || t.text_code === "AUTOSAVE_CONFLICT" || t.name === "AutosaveConflictError" || (e instanceof Error ? e.message : String(e)).toLowerCase().includes("autosave conflict"));
  }
  /**
   * Extract conflict info from an error.
   */
  extractConflictInfo(e) {
    const t = e, n = t.metadata;
    return n ? {
      version: n.version || "",
      expectedVersion: n.expected_version || "",
      latestStatePath: n.latest_state_path,
      latestServerState: n.latest_server_state,
      entityId: n.entity_id,
      panel: n.panel
    } : {
      version: t.version || "",
      expectedVersion: t.expectedVersion || "",
      latestStatePath: t.latestStatePath,
      latestServerState: t.latestServerState,
      entityId: t.entityId,
      panel: t.panel
    };
  }
  /**
   * Add a state change listener.
   */
  onStateChange(e) {
    return this.listeners.push(e), () => {
      const t = this.listeners.indexOf(e);
      t >= 0 && this.listeners.splice(t, 1);
    };
  }
  /**
   * Render the indicator HTML.
   * Call this to get HTML string for manual rendering.
   */
  renderIndicator() {
    const e = this.config.classPrefix, t = this.config.labels, n = `${e}--${this.state}`, s = t[this.state] || "", o = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${n}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${o}</span>
      <span class="${e}__label">${s}</span>
      ${this.state === "error" ? `<button type="button" class="${e}__retry" aria-label="Retry save">Retry</button>` : ""}
    </div>`;
  }
  /**
   * Render conflict recovery UI (TX-074).
   */
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
  /**
   * Render indicator into configured container.
   */
  render() {
    this.config.container && (this.config.container.innerHTML = this.renderIndicator(), this.bindRetryButton(), this.bindConflictButtons());
  }
  /**
   * Clean up timers and listeners.
   */
  destroy() {
    this.cancelDebounce(), this.cancelSavedTimer(), this.listeners = [];
  }
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  setState(e) {
    if (e === this.state) return;
    const t = this.state;
    this.state = e;
    const n = {
      previousState: t,
      currentState: e,
      error: this.lastError ?? void 0,
      data: this.pendingData ?? void 0
    };
    for (const s of this.listeners)
      try {
        s(n);
      } catch {
      }
    this.config.showToasts && this.config.notifier && this.showToast(e), this.render();
  }
  showToast(e) {
    const t = this.config.notifier;
    if (t)
      switch (e) {
        case "saved":
          t.success(this.config.labels.saved ?? N.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? N.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? N.conflict);
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
    const n = this.config.container.querySelector(`.${e}__conflict-force-save`);
    n && n.addEventListener("click", () => this.resolveWithForceSave());
    const s = this.config.container.querySelector(`.${e}__conflict-dismiss`);
    s && s.addEventListener("click", () => this.dismissConflict());
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
}
function _a(r) {
  return new Bt({
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
    // Enable conflict detection by default for translation forms (TX-074)
    enableConflictDetection: !0,
    allowForceSave: !0,
    ...r
  });
}
function Ra(r, e = {}) {
  const t = e.classPrefix ?? Le, s = { ...N, ...e.labels }[r] || "";
  let o = "";
  switch (r) {
    case "saving":
      o = `<span class="${t}__spinner"></span>`;
      break;
    case "saved":
      o = `<span class="${t}__check">✓</span>`;
      break;
    case "error":
      o = `<span class="${t}__error">!</span>`;
      break;
    case "conflict":
      o = `<span class="${t}__conflict-icon">⚠</span>`;
      break;
  }
  return `<div class="${t} ${t}--${r}" role="status" aria-live="polite">
    ${o}
    <span class="${t}__label">${s}</span>
  </div>`;
}
function Ia(r = Le) {
  return `
    .${r} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${r}--idle {
      opacity: 0;
    }

    .${r}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${r}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${r}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${r}__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .${r}__icon svg {
      width: 100%;
      height: 100%;
    }

    .${r}__spinner {
      animation: ${r}-spin 1s linear infinite;
    }

    .${r}__retry {
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

    .${r}__retry:hover {
      background-color: var(--autosave-retry-hover-bg, rgba(59, 130, 246, 0.1));
    }

    @keyframes ${r}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Conflict state styles (TX-074) */
    .${r}--conflict {
      color: var(--autosave-conflict-color, #f59e0b);
      padding: 0.75rem;
      background: var(--autosave-conflict-bg, #fffbeb);
      border: 1px solid var(--autosave-conflict-border, #fcd34d);
      border-radius: 0.5rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .${r}__conflict-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .${r}__conflict-title {
      font-weight: 600;
      color: var(--autosave-conflict-title-color, #92400e);
    }

    .${r}__conflict-message {
      font-size: 0.75rem;
      color: var(--autosave-conflict-message-color, #78350f);
      margin: 0;
    }

    .${r}__conflict-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .${r}__conflict-actions button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${r}__conflict-use-server {
      color: white;
      background: var(--autosave-conflict-use-server-bg, #3b82f6);
      border: none;
    }

    .${r}__conflict-use-server:hover {
      background: var(--autosave-conflict-use-server-hover-bg, #2563eb);
    }

    .${r}__conflict-force-save {
      color: var(--autosave-conflict-force-color, #ef4444);
      background: transparent;
      border: 1px solid currentColor;
    }

    .${r}__conflict-force-save:hover {
      background: var(--autosave-conflict-force-hover-bg, rgba(239, 68, 68, 0.1));
    }

    .${r}__conflict-dismiss {
      color: var(--autosave-conflict-dismiss-color, #6b7280);
      background: transparent;
      border: 1px solid var(--autosave-conflict-dismiss-border, #d1d5db);
    }

    .${r}__conflict-dismiss:hover {
      background: var(--autosave-conflict-dismiss-hover-bg, #f3f4f6);
    }
  `;
}
function Ba(r, e) {
  const { watchFields: t, indicatorSelector: n, ...s } = e;
  let o = s.container;
  !o && n && (o = r.querySelector(n) ?? void 0);
  const i = new Bt({
    ...s,
    container: o
  }), a = () => {
    const h = new FormData(r), f = {};
    return h.forEach((m, y) => {
      f[y] = m;
    }), f;
  }, l = (h) => {
    const f = h.target;
    if (f) {
      if (t && t.length > 0) {
        const m = f.name;
        if (!m || !t.includes(m))
          return;
      }
      i.markDirty(a());
    }
  };
  r.addEventListener("input", l), r.addEventListener("change", l), r.addEventListener("submit", async (h) => {
    i.hasPendingChanges() && (h.preventDefault(), await i.save() && r.submit());
  });
  const c = (h) => {
    i.hasPendingChanges() && (h.preventDefault(), h.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const d = () => {
    document.hidden && i.hasPendingChanges() && i.save();
  };
  document.addEventListener("visibilitychange", d);
  const p = i.destroy.bind(i);
  return i.destroy = () => {
    r.removeEventListener("input", l), r.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), p();
  }, i;
}
const Mt = "char-counter", Lo = "interpolation-preview", Pt = "dir-toggle", Tt = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: "Mustache", example: "{{name}}" },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: "ICU", example: "{name}" },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: "Printf", example: "%s" },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: "Named Printf", example: "%(name)s" },
  { pattern: /\$\{(\w+)\}/g, name: "Template Literal", example: "${name}" }
], _o = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
};
class Ro {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Mt,
      formatDisplay: e.formatDisplay ?? this.defaultFormatDisplay.bind(this)
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  /**
   * Get current character count.
   */
  getCount() {
    return this.config.input.value.length;
  }
  /**
   * Get current severity based on thresholds.
   */
  getSeverity() {
    const e = this.getCount(), t = [...this.config.thresholds].sort((n, s) => s.limit - n.limit);
    for (const n of t)
      if (e >= n.limit)
        return n.severity;
    return null;
  }
  /**
   * Update the counter display.
   */
  update() {
    const e = this.getCount(), t = this.getSeverity(), n = this.config.hardLimit ?? this.config.softLimit;
    this.config.enforceHardLimit && this.config.hardLimit && e > this.config.hardLimit && (this.config.input.value = this.config.input.value.slice(0, this.config.hardLimit)), this.counterEl && (this.counterEl.textContent = this.config.formatDisplay(e, n), this.counterEl.className = this.buildCounterClasses(t), this.counterEl.setAttribute("aria-live", "polite"), t === "error" ? this.counterEl.setAttribute("role", "alert") : this.counterEl.removeAttribute("role"));
  }
  /**
   * Render the counter HTML.
   */
  render() {
    const e = this.getCount(), t = this.getSeverity(), n = this.config.hardLimit ?? this.config.softLimit;
    return `<span class="${this.buildCounterClasses(t)}" aria-live="polite">${this.config.formatDisplay(e, n)}</span>`;
  }
  /**
   * Clean up event listeners.
   */
  destroy() {
    this.config.input.removeEventListener("input", this.boundUpdate), this.config.input.removeEventListener("change", this.boundUpdate), this.counterEl?.parentElement && this.counterEl.parentElement.removeChild(this.counterEl);
  }
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  init() {
    this.counterEl = document.createElement("span"), this.counterEl.className = this.buildCounterClasses(null), this.config.container ? this.config.container.appendChild(this.counterEl) : this.config.input.parentElement?.insertBefore(
      this.counterEl,
      this.config.input.nextSibling
    ), this.config.input.addEventListener("input", this.boundUpdate), this.config.input.addEventListener("change", this.boundUpdate), this.update();
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
    const t = this.config.classPrefix, n = [t];
    return e && n.push(`${t}--${e}`), n.join(" ");
  }
  defaultFormatDisplay(e, t) {
    return t ? `${e} / ${t}` : `${e}`;
  }
}
class Io {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? _o,
      patterns: [...Tt, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Lo
    }, this.boundUpdate = this.update.bind(this), this.init();
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  /**
   * Get all interpolation matches in the current text.
   */
  getMatches() {
    const e = this.config.input.value, t = [];
    for (const n of this.config.patterns) {
      n.pattern.lastIndex = 0;
      let s;
      for (; (s = n.pattern.exec(e)) !== null; )
        t.push({
          pattern: n.name,
          variable: s[1] ?? s[0],
          start: s.index,
          end: s.index + s[0].length
        });
    }
    return t;
  }
  /**
   * Get preview text with sample values substituted.
   */
  getPreviewText() {
    let e = this.config.input.value;
    for (const t of this.config.patterns)
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (n, s) => {
        const i = (s ?? n).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [a, l] of Object.entries(this.config.sampleValues))
          if (a.toLowerCase() === i)
            return l;
        return n;
      });
    return e;
  }
  /**
   * Update the preview display.
   */
  update() {
    if (!this.previewEl) return;
    if (!(this.getMatches().length > 0)) {
      this.previewEl.classList.add(`${this.config.classPrefix}--empty`), this.previewEl.innerHTML = "";
      return;
    }
    this.previewEl.classList.remove(`${this.config.classPrefix}--empty`), this.config.highlightVariables ? this.previewEl.innerHTML = this.renderHighlightedPreview() : this.previewEl.textContent = this.getPreviewText();
  }
  /**
   * Render preview with highlighted variables.
   */
  renderHighlightedPreview() {
    const e = this.config.input.value, t = this.getMatches(), n = this.config.classPrefix;
    if (t.length === 0)
      return u(e);
    t.sort((i, a) => i.start - a.start);
    let s = "", o = 0;
    for (const i of t) {
      s += u(e.slice(o, i.start));
      const a = this.getSampleValue(i.variable), l = e.slice(i.start, i.end);
      s += `<span class="${n}__variable" title="${u(l)}">${u(a ?? l)}</span>`, o = i.end;
    }
    return s += u(e.slice(o)), s;
  }
  /**
   * Render the preview HTML structure.
   */
  render() {
    const e = this.config.classPrefix, n = this.getMatches().length === 0;
    return `<div class="${e}${n ? ` ${e}--empty` : ""}">
      <span class="${e}__label">Preview:</span>
      <span class="${e}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : u(this.getPreviewText())}</span>
    </div>`;
  }
  /**
   * Clean up event listeners.
   */
  destroy() {
    this.config.input.removeEventListener("input", this.boundUpdate), this.previewEl?.parentElement && this.previewEl.parentElement.removeChild(this.previewEl);
  }
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  init() {
    this.previewEl = document.createElement("div"), this.previewEl.className = this.config.classPrefix, this.config.container ? this.config.container.appendChild(this.previewEl) : this.config.input.parentElement?.appendChild(this.previewEl), this.config.input.addEventListener("input", this.boundUpdate), this.update();
  }
  getSampleValue(e) {
    const t = e.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (const [n, s] of Object.entries(this.config.sampleValues))
      if (n.toLowerCase() === t)
        return s;
    return null;
  }
}
class Bo {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Pt,
      onChange: e.onChange
    }, this.currentDirection = this.resolveInitialDirection(), this.init();
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  /**
   * Get current text direction.
   */
  getDirection() {
    return this.currentDirection;
  }
  /**
   * Set text direction.
   */
  setDirection(e) {
    if (e !== this.currentDirection) {
      if (this.currentDirection = e, this.config.input.dir = e, this.config.input.style.textAlign = e === "rtl" ? "right" : "left", this.config.persistenceKey)
        try {
          localStorage.setItem(this.config.persistenceKey, e);
        } catch {
        }
      this.updateToggle(), this.config.onChange?.(e);
    }
  }
  /**
   * Toggle between LTR and RTL.
   */
  toggle() {
    this.setDirection(this.currentDirection === "ltr" ? "rtl" : "ltr");
  }
  /**
   * Render the toggle button HTML.
   */
  render() {
    const e = this.config.classPrefix, t = this.currentDirection === "rtl";
    return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${t ? "RTL" : "LTR"})">
      <span class="${e}__icon">${t ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${e}__label">${t ? "RTL" : "LTR"}</span>
    </button>`;
  }
  /**
   * Clean up.
   */
  destroy() {
    this.toggleEl?.parentElement && this.toggleEl.parentElement.removeChild(this.toggleEl);
  }
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  init() {
    this.config.input.dir = this.currentDirection, this.config.input.style.textAlign = this.currentDirection === "rtl" ? "right" : "left", this.toggleEl = document.createElement("button"), this.toggleEl.type = "button", this.toggleEl.className = this.config.classPrefix, this.updateToggle(), this.toggleEl.addEventListener("click", () => this.toggle()), this.config.container ? this.config.container.appendChild(this.toggleEl) : this.config.input.parentElement?.appendChild(this.toggleEl);
  }
  resolveInitialDirection() {
    if (this.config.persistenceKey)
      try {
        const e = localStorage.getItem(this.config.persistenceKey);
        if (e === "ltr" || e === "rtl")
          return e;
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
}
function Ma(r, e = {}) {
  const t = [], n = [], s = [];
  for (const o of e.charCounterFields ?? []) {
    const i = r.querySelector(`[name="${o}"]`);
    i && t.push(new Ro({
      input: i,
      ...e.charCounterConfig
    }));
  }
  for (const o of e.interpolationFields ?? []) {
    const i = r.querySelector(`[name="${o}"]`);
    i && n.push(new Io({
      input: i,
      ...e.interpolationConfig
    }));
  }
  for (const o of e.directionToggleFields ?? []) {
    const i = r.querySelector(`[name="${o}"]`);
    i && s.push(new Bo({
      input: i,
      persistenceKey: `dir-${o}`,
      ...e.directionToggleConfig
    }));
  }
  return {
    counters: t,
    previews: n,
    toggles: s,
    destroy: () => {
      t.forEach((o) => o.destroy()), n.forEach((o) => o.destroy()), s.forEach((o) => o.destroy());
    }
  };
}
function Pa(r, e, t, n = Mt) {
  const s = [n];
  t && s.push(`${n}--${t}`);
  const o = e ? `${r} / ${e}` : `${r}`;
  return `<span class="${s.join(" ")}" aria-live="polite">${o}</span>`;
}
function Ta(r, e = Pt) {
  const t = r === "rtl", n = t ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${r.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${n}</svg>
    <span class="${e}__label">${r.toUpperCase()}</span>
  </button>`;
}
function Da() {
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
function Fa(r, e = Tt) {
  const t = [];
  for (const n of e) {
    n.pattern.lastIndex = 0;
    let s;
    for (; (s = n.pattern.exec(r)) !== null; )
      t.push({
        pattern: n.name,
        variable: s[1] ?? s[0],
        start: s.index,
        end: s.index + s[0].length
      });
  }
  return t;
}
function qa(r, e, t) {
  return t && r >= t ? "error" : e && r >= e ? "warning" : null;
}
function Oa(r) {
  return typeof r == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(r) ? r : "none";
}
function Mo(r) {
  return r === "core+exchange" || r === "full";
}
function Po(r) {
  return r === "core+queue" || r === "full";
}
function ja(r) {
  return r !== "none";
}
function To(r) {
  return !r || typeof r != "object" ? null : Yt(r);
}
class Dt {
  constructor(e) {
    this.capabilities = e;
  }
  /**
   * Get the current capability mode
   */
  getMode() {
    return this.capabilities.profile;
  }
  /**
   * Get all capabilities
   */
  getCapabilities() {
    return this.capabilities;
  }
  /**
   * Check if a module is enabled by capability mode
   */
  isModuleEnabledByMode(e) {
    const t = this.capabilities.profile;
    return e === "exchange" ? Mo(t) : Po(t);
  }
  /**
   * Get module state from capabilities
   */
  getModuleState(e) {
    return this.capabilities.modules[e] || null;
  }
  /**
   * Get action state from a module
   */
  getActionState(e, t) {
    const n = this.getModuleState(e);
    return n && n.actions[t] || null;
  }
  /**
   * Gate a navigation item.
   * Returns visibility/enabled state for rendering.
   *
   * Rule:
   * - backend visible=false => hidden
   * - backend visible=true + entry/action denied => visible-disabled
   */
  gateNavItem(e) {
    const t = this.getModuleState(e.module);
    if (!t)
      return {
        visible: !1,
        enabled: !1,
        reason: `${e.module} module not configured`,
        reasonCode: "MODULE_NOT_CONFIGURED"
      };
    if (!t.enabled)
      return {
        visible: !1,
        enabled: !1,
        reason: t.entry.reason || "Module disabled by capability mode",
        reasonCode: t.entry.reason_code || "FEATURE_DISABLED"
      };
    if (!t.visible)
      return {
        visible: !1,
        enabled: !1,
        reason: t.entry.reason || "Module hidden by capability metadata",
        reasonCode: t.entry.reason_code || "FEATURE_DISABLED",
        permission: t.entry.permission
      };
    if (!t.entry.enabled)
      return {
        visible: !0,
        enabled: !1,
        reason: t.entry.reason || "Missing module view permission",
        reasonCode: t.entry.reason_code || "PERMISSION_DENIED",
        permission: t.entry.permission
      };
    if (e.action) {
      const n = t.actions[e.action];
      if (!n)
        return {
          visible: !0,
          enabled: !1,
          reason: `Action ${e.action} not configured`,
          reasonCode: "ACTION_NOT_CONFIGURED"
        };
      if (!n.enabled)
        return {
          visible: !0,
          enabled: !1,
          reason: n.reason || `Missing ${e.action} permission`,
          reasonCode: n.reason_code || "PERMISSION_DENIED",
          permission: n.permission
        };
    }
    return {
      visible: !0,
      enabled: !0
    };
  }
  /**
   * Gate an action control.
   * Returns visibility/enabled state for rendering action buttons.
   */
  gateAction(e, t) {
    return this.gateNavItem({ module: e, action: t });
  }
  /**
   * Check if exchange module is accessible (visible and entry enabled)
   */
  canAccessExchange() {
    const e = this.gateNavItem({ module: "exchange" });
    return e.visible && e.enabled;
  }
  /**
   * Check if queue module is accessible (visible and entry enabled)
   */
  canAccessQueue() {
    const e = this.gateNavItem({ module: "queue" });
    return e.visible && e.enabled;
  }
  /**
   * Get route URL for a given key
   */
  getRoute(e) {
    return this.capabilities.routes[e] || null;
  }
  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(e) {
    return this.capabilities.features[e] === !0;
  }
}
function Ne(r) {
  const e = To(r);
  return e ? new Dt(e) : null;
}
function za() {
  return new Dt({ ...Qt });
}
function Na(r) {
  return r.visible ? r.enabled ? "" : `aria-disabled="true"${r.reason ? ` title="${b(r.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function Do(r) {
  if (r.enabled || !r.reason)
    return "";
  const e = (r.reasonCode || "").trim();
  return e ? Vt(e, { size: "sm", showFullMessage: !0 }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${b(r.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${u(r.reason)}
    </span>
  `.trim();
}
function Ga() {
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
function Fo(r, e) {
  if (!e.visible) {
    r.style.display = "none", r.setAttribute("aria-hidden", "true");
    return;
  }
  r.style.display = "", r.removeAttribute("aria-hidden"), e.enabled ? (r.removeAttribute("aria-disabled"), r.classList.remove("capability-gate-disabled"), r.removeAttribute("title"), delete r.dataset.reasonCode, r.removeEventListener("click", Ge, !0)) : (r.setAttribute("aria-disabled", "true"), r.classList.add("capability-gate-disabled"), e.reason && (r.setAttribute("title", e.reason), r.dataset.reasonCode = e.reasonCode || ""), r.addEventListener("click", Ge, !0));
}
function Ge(r) {
  r.currentTarget.getAttribute("aria-disabled") === "true" && (r.preventDefault(), r.stopPropagation());
}
function Ua(r, e) {
  r.querySelectorAll("[data-capability-gate]").forEach((n) => {
    const s = n.dataset.capabilityGate;
    if (s)
      try {
        const o = JSON.parse(s), i = e.gateNavItem(o);
        Fo(n, i);
      } catch {
        console.warn("Invalid capability gate config:", s);
      }
  });
}
const qo = {
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
}, Oo = [
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
    // Due soon is filtered client-side
  },
  {
    id: "review",
    label: "Needs Review",
    filters: { status: "review" }
  }
];
class jo {
  constructor(e) {
    this.container = null, this.state = "loading", this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || Oo,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: { ...qo, ...e.labels || {} }
    };
  }
  /**
   * Mount the dashboard to a container element.
   *
   * If a capabilityGate is configured, checks queue module access first.
   * If permission is denied, renders a visible-disabled state with reason
   * instead of attempting to load data.
   */
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
  /**
   * Unmount and cleanup
   */
  unmount() {
    this.stopAutoRefresh(), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  /**
   * Refresh dashboard data
   */
  async refresh() {
    await this.loadData();
  }
  /**
   * Set active filter preset
   */
  setActivePreset(e) {
    this.activePreset = e, this.loadData();
  }
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  /**
   * Get current data
   */
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
      const e = this.config.filterPresets.find((o) => o.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), n = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, s = await fetch(n, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!s.ok)
        throw new Error(`Failed to load: ${s.status}`);
      this.data = await s.json(), this.state = this.data.assignments.length === 0 ? "empty" : "loaded", this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error";
    }
    this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="translator-dashboard" role="region" aria-label="${u(e.title)}">
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
        <h2 class="dashboard-title">${u(e.title)}</h2>
        <button type="button" class="dashboard-refresh-btn" aria-label="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-1.621-6.01a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H10.51a.75.75 0 000 1.5h4.243a.75.75 0 00.75-.75V3.295a.75.75 0 00-1.5 0v2.43l-.311-.311z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;
  }
  renderSummaryCards() {
    if (this.state === "loading" || !this.data)
      return this.renderSummaryLoading();
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
  renderSummaryCard(e, t, n, s) {
    return `
      <div class="summary-card ${s}" role="listitem" data-summary="${e}">
        <div class="summary-count">${n}</div>
        <div class="summary-label">${u(t)}</div>
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
    const t = this.activePreset === e.id, n = e.badge?.() ?? null, s = n !== null ? `<span class="filter-badge">${n}</span>` : "";
    return `
      <button type="button"
              class="filter-preset ${t ? "active" : ""}"
              role="tab"
              aria-selected="${t}"
              data-preset="${e.id}">
        ${e.icon || ""}
        <span class="filter-label">${u(e.label)}</span>
        ${s}
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
        <p>${u(e.loading)}</p>
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
        <p class="error-message">${u(e.error)}</p>
        ${this.error ? `<p class="error-detail">${u(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${u(e.retry)}</button>
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
        <p class="empty-title">${u(e.noAssignments)}</p>
        <p class="empty-description">${u(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  /**
   * Render disabled state (TX-101: visible-disabled module/dashboard UX).
   * Shows the dashboard structure but with disabled controls and a reason badge.
   * This is distinct from error state (transport failure) and empty state (no data).
   */
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? Do(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${u(e)}</p>
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
    return this.activePreset === "due_soon" && (t = t.filter((n) => n.due_state === "due_soon" || n.due_state === "overdue")), t.length === 0 ? this.renderEmpty() : `
      <div class="dashboard-assignment-list">
        <table class="assignment-table" role="grid" aria-label="Translation assignments">
          <thead>
            <tr>
              <th scope="col">${u(e.sourceTitle)}</th>
              <th scope="col">${u(e.targetLocale)}</th>
              <th scope="col">${u(e.status)}</th>
              <th scope="col">${u(e.dueDate)}</th>
              <th scope="col">${u(e.priority)}</th>
              <th scope="col" class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${t.map((n) => this.renderAssignmentRow(n)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderAssignmentRow(e) {
    this.config.labels;
    const t = zo(e.due_state), n = No(e.priority), s = j(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), o = e.due_date ? Uo(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${b(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${u(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${u(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${u(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${u(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${s}
        </td>
        <td class="due-cell ${t}">
          ${o}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${n}">${u(Go(e.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(e)}
        </td>
      </tr>
    `;
  }
  renderAssignmentActions(e) {
    const t = this.config.labels, n = [], s = typeof this.config.onActionClick == "function";
    n.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${b(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const o = e.review_actions;
    return s && e.queue_state === "in_progress" && o.submit_review.enabled && n.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${b(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), s && e.queue_state === "review" && (o.approve.enabled && n.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${b(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), o.reject.enabled && n.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${b(t.reject)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        `)), `<div class="action-buttons">${n.join("")}</div>`;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".dashboard-refresh-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelectorAll(".filter-preset").forEach((i) => {
      i.addEventListener("click", () => {
        const a = i.dataset.preset;
        a && this.setActivePreset(a);
      });
    }), this.container.querySelectorAll(".assignment-row").forEach((i) => {
      const a = i.dataset.assignmentId;
      if (!a || !this.data) return;
      const l = this.data.assignments.find((d) => d.id === a);
      if (!l) return;
      i.querySelectorAll(".action-btn").forEach((d) => {
        d.addEventListener("click", async (p) => {
          p.stopPropagation();
          const h = d.dataset.action;
          h && (h === "open" ? this.openAssignment(l) : typeof this.config.onActionClick == "function" && await this.config.onActionClick(h, l));
        });
      }), i.addEventListener("click", () => {
        this.openAssignment(l);
      });
    }), this.container.querySelectorAll(".summary-card").forEach((i) => {
      i.addEventListener("click", () => {
        const a = i.dataset.summary;
        a === "review" ? this.setActivePreset("review") : a === "due_soon" || a === "overdue" ? this.setActivePreset("due_soon") : this.setActivePreset("all");
      });
    });
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
    if (!t)
      return "";
    const n = e.entity_type.trim(), s = e.target_record_id.trim() || e.source_record_id.trim();
    return !n || !s ? "" : `${t}/${encodeURIComponent(n)}/${encodeURIComponent(s)}/edit`;
  }
}
function zo(r) {
  switch (r) {
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
function No(r) {
  switch (r) {
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
function Go(r) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function Uo(r) {
  const e = /* @__PURE__ */ new Date(), t = r.getTime() - e.getTime(), n = Math.ceil(t / (1e3 * 60 * 60 * 24));
  return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n <= 7 ? `${n}d` : r.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function Ha() {
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
function Ho(r, e) {
  const t = new jo(e);
  return t.mount(r), t;
}
function Va(r) {
  return Vo(r);
}
function Vo(r, e = {}) {
  const t = r.dataset.myWorkEndpoint;
  if (!t)
    return console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const n = Ko(e);
  return Ho(r, {
    myWorkEndpoint: t,
    panelBaseUrl: r.dataset.panelBaseUrl,
    queueEndpoint: r.dataset.queueEndpoint,
    refreshInterval: parseInt(r.dataset.refreshInterval || "0", 10),
    capabilityGate: n || void 0
  });
}
function Ko(r) {
  if (r.capabilityGate)
    return r.capabilityGate;
  if (r.capabilitiesPayload !== void 0)
    return Ne(r.capabilitiesPayload);
  const e = Jo();
  return e === null ? null : Ne(e);
}
function Jo() {
  if (typeof window < "u") {
    const r = window.__TRANSLATION_CAPABILITIES__;
    if (r && typeof r == "object")
      return r;
  }
  if (typeof document < "u") {
    const r = document.querySelector("script[data-translation-capabilities]");
    if (r && r.textContent)
      try {
        return JSON.parse(r.textContent);
      } catch {
        return null;
      }
  }
  return null;
}
const Yo = {
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
};
class Qo {
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
    const t = { ...Yo, ...e.labels || {} };
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
  /**
   * Mount the component to a container
   */
  mount(e) {
    this.container = e, this.render();
  }
  /**
   * Unmount and cleanup
   */
  unmount() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  /**
   * Get validation result
   */
  getValidationResult() {
    return this.validationResult;
  }
  /**
   * Get selected row indices
   */
  getSelectedIndices() {
    return this.selection.allSelected ? this.previewRows.filter((e) => !this.selection.excluded.has(e.index)).map((e) => e.index) : Array.from(this.selection.selected);
  }
  /**
   * Set file for import
   */
  setFile(e) {
    this.file = e, this.rawData = "", this.render();
  }
  /**
   * Set raw data for import
   */
  setRawData(e) {
    this.rawData = e, this.file = null, this.render();
  }
  /**
   * Validate the import data
   */
  async validate() {
    this.state = "validating", this.error = null, this.render();
    try {
      const e = new FormData();
      if (this.file)
        e.append("file", this.file);
      else if (this.rawData) {
        const s = await fetch(this.config.validateEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: this.rawData
        });
        if (!s.ok)
          throw new Error(`Validation failed: ${s.status}`);
        const o = await s.json();
        return this.handleValidationResult(o), o;
      } else
        throw new Error("No file or data to validate");
      const t = await fetch(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok)
        throw new Error(`Validation failed: ${t.status}`);
      const n = await t.json();
      return this.handleValidationResult(n), n;
    } catch (e) {
      return this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  /**
   * Apply the import with selected rows
   */
  async apply(e) {
    const t = { ...this.applyOptions, ...e }, n = t.selectedIndices || this.getSelectedIndices();
    if (n.length === 0)
      return this.error = new Error(this.config.labels.noRowsSelected), this.render(), null;
    if (this.config.capabilityGate) {
      const s = this.config.capabilityGate.gateAction("exchange", "import.apply");
      if (!s.enabled)
        return this.error = new Error(s.reason || this.config.labels.applyDisabledReason), this.render(), null;
    }
    this.state = "applying", this.error = null, this.render();
    try {
      const i = {
        rows: (this.validationResult?.results.filter(
          (c) => n.includes(c.index)
        ) || []).map((c) => {
          const d = this.previewRows.find((p) => p.index === c.index);
          return {
            ...c,
            resolution: d?.resolution
          };
        }),
        allow_create_missing: t.allowCreateMissing,
        allow_source_hash_override: t.allowSourceHashOverride,
        continue_on_error: t.continueOnError,
        dry_run: t.dryRun,
        async: t.async
      }, a = await fetch(this.config.applyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(i)
      });
      if (!a.ok)
        throw new Error(`Apply failed: ${a.status}`);
      const l = await a.json();
      return this.state = "applied", this.config.onApplyComplete?.(l), this.render(), l;
    } catch (s) {
      return this.error = s instanceof Error ? s : new Error(String(s)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  /**
   * Toggle row selection
   */
  toggleRowSelection(e) {
    this.selection.allSelected ? this.selection.excluded.has(e) ? this.selection.excluded.delete(e) : this.selection.excluded.add(e) : this.selection.selected.has(e) ? this.selection.selected.delete(e) : this.selection.selected.add(e), this.updatePreviewRowSelection(), this.render();
  }
  /**
   * Select all rows
   */
  selectAll() {
    this.selection.allSelected = !0, this.selection.excluded.clear(), this.updatePreviewRowSelection(), this.render();
  }
  /**
   * Deselect all rows
   */
  deselectAll() {
    this.selection.allSelected = !1, this.selection.selected.clear(), this.selection.excluded.clear(), this.updatePreviewRowSelection(), this.render();
  }
  /**
   * Set resolution for a row
   */
  setRowResolution(e, t) {
    const n = this.previewRows.find((s) => s.index === e);
    n && (n.resolution = t, this.render());
  }
  /**
   * Set apply option
   */
  setApplyOption(e, t) {
    this.applyOptions[e] = t, this.render();
  }
  /**
   * Reset to idle state
   */
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
    })), this.selection.allSelected = !0, this.selection.excluded = new Set(
      e.results.filter((t) => t.status === "error").map((t) => t.index)
    ), this.state = "validated", this.config.onValidationComplete?.(e), this.render();
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
      <div class="exchange-import" role="dialog" aria-label="${u(e.title)}">
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
        <h3 class="import-title">${u(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${u(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${u(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${u(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${u(t.skipped)}</span>
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
          <span class="dropzone-text">${u(e.selectFile)}</span>
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
        <p>${u(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, n = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${u(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${u(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${n} ${u(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${u(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${u(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${u(e.dryRun)}
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
                <th scope="col">${u(e.resource)}</th>
                <th scope="col">${u(e.field)}</th>
                <th scope="col">${u(e.status)}</th>
                <th scope="col">${u(e.translatedText)}</th>
                <th scope="col">${u(e.conflictResolution)}</th>
              </tr>
            </thead>
            <tbody>
              ${this.previewRows.map((s) => this.renderPreviewRow(s)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  renderPreviewRow(e) {
    this.config.labels;
    const t = Xe(e.status, "exchange"), n = e.status === "error", s = j(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${n ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${u(e.resource)}</span>
          <span class="entity-id">${u(e.entityId)}</span>
        </td>
        <td class="field-cell">${u(e.fieldPath)}</td>
        <td class="status-cell">
          ${s}
          ${e.error ? `<span class="error-message" title="${b(e.error)}">${u(Wo(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${b(e.targetLocale)}">${u(e.targetLocale)}</span>
        </td>
        <td class="resolution-cell">
          ${e.status === "conflict" ? this.renderConflictResolution(e) : "-"}
        </td>
      </tr>
    `;
  }
  renderConflictResolution(e) {
    const t = this.config.labels, n = e.resolution || "skip";
    return `
      <select class="resolution-select" data-index="${e.index}">
        <option value="skip" ${n === "skip" ? "selected" : ""}>${u(t.skip)}</option>
        <option value="keep_current" ${n === "keep_current" ? "selected" : ""}>${u(t.keepCurrent)}</option>
        <option value="accept_incoming" ${n === "accept_incoming" ? "selected" : ""}>${u(t.acceptIncoming)}</option>
        <option value="force" ${n === "force" ? "selected" : ""}>${u(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${b(t.conflictDetails)}">?</button>` : ""}
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
        <p class="error-message">${u(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${u(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, n = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${u(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${u(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !n.enabled ? "disabled" : ""}
                  ${n.enabled ? "" : `aria-disabled="true" title="${b(n.reason || e.applyDisabledReason)}"`}>
            ${u(e.applyButton)}
          </button>
        ` : ""}
      </div>
    `;
  }
  getApplyGate() {
    return this.config.capabilityGate ? this.config.capabilityGate.gateAction("exchange", "import.apply") : { visible: !0, enabled: !0 };
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".file-input")?.addEventListener("change", (f) => {
      const m = f.target;
      m.files?.[0] && this.setFile(m.files[0]);
    }), this.container.querySelector(".data-input")?.addEventListener("input", (f) => {
      const m = f.target;
      this.rawData = m.value;
    }), this.container.querySelector(".validate-btn")?.addEventListener("click", () => this.validate()), this.container.querySelector(".apply-btn")?.addEventListener("click", () => this.apply()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".reset-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".select-all-btn")?.addEventListener("click", () => this.selectAll()), this.container.querySelector(".deselect-all-btn")?.addEventListener("click", () => this.deselectAll()), this.container.querySelector(".select-all-checkbox")?.addEventListener("change", (f) => {
      f.target.checked ? this.selectAll() : this.deselectAll();
    }), this.container.querySelectorAll(".row-checkbox").forEach((f) => {
      f.addEventListener("change", () => {
        const m = f.closest(".preview-row"), y = parseInt(m?.dataset.index || "", 10);
        isNaN(y) || this.toggleRowSelection(y);
      });
    }), this.container.querySelectorAll(".resolution-select").forEach((f) => {
      f.addEventListener("change", () => {
        const m = parseInt(f.dataset.index || "", 10);
        isNaN(m) || this.setRowResolution(m, f.value);
      });
    }), this.container.querySelectorAll(".option-checkbox input").forEach((f) => {
      f.addEventListener("change", () => {
        const m = f.name;
        m && this.setApplyOption(m, f.checked);
      });
    });
  }
}
function Wo(r, e) {
  return r.length <= e ? r : r.slice(0, e - 3) + "...";
}
function Ka() {
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
function Xo(r, e) {
  const t = new Qo(e);
  return t.mount(r), t;
}
function Ja(r) {
  const e = r.dataset.validateEndpoint, t = r.dataset.applyEndpoint;
  return !e || !t ? (console.warn("ExchangeImport: Missing required data attributes"), null) : Xo(r, {
    validateEndpoint: e,
    applyEndpoint: t
  });
}
const Zo = {
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
}, ei = 2e3, ti = 300, ri = "async_job_";
class Ft {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = { ...Zo, ...e.labels || {} };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || ri,
      pollInterval: e.pollInterval || ei,
      maxPollAttempts: e.maxPollAttempts || ti,
      onComplete: e.onComplete,
      onFailed: e.onFailed,
      onError: e.onError,
      onProgress: e.onProgress,
      labels: t,
      autoStart: e.autoStart !== !1
    };
  }
  /**
   * Mount the component to a container
   */
  mount(e) {
    this.container = e, this.render();
  }
  /**
   * Unmount and cleanup
   */
  unmount() {
    this.stopPolling(), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  /**
   * Get current job
   */
  getJob() {
    return this.job;
  }
  /**
   * Get polling state
   */
  getPollingState() {
    return this.pollingState;
  }
  /**
   * Set a new job to track
   */
  setJob(e) {
    this.job = e, this.startTime = /* @__PURE__ */ new Date(), this.pollAttempts = 0, this.error = null, this.persistJob(e), this.config.autoStart && e.status === "running" ? this.startPolling() : this.render();
  }
  /**
   * Start from a job envelope (initial response)
   */
  startFromEnvelope(e) {
    this.setJob(e);
  }
  /**
   * Resume tracking a persisted job
   */
  resumeFromStorage(e) {
    const t = this.loadPersistedJob(e);
    return t ? (this.job = {
      id: t.jobId,
      kind: t.kind,
      status: "running",
      poll_endpoint: t.pollEndpoint,
      progress: { processed: 0, succeeded: 0, failed: 0 },
      created_at: t.startedAt,
      updated_at: t.lastPolledAt || t.startedAt
    }, this.startTime = new Date(t.startedAt), this.pollAttempts = 0, this.error = null, this.config.autoStart && this.startPolling(), !0) : !1;
  }
  /**
   * Check if there's a persisted job for a kind
   */
  hasPersistedJob(e) {
    return this.loadPersistedJob(e) !== null;
  }
  /**
   * Start polling
   */
  startPolling() {
    this.job && this.pollingState !== "polling" && (this.pollingState = "polling", this.error = null, this.schedulePoll(), this.render());
  }
  /**
   * Pause polling (can be resumed)
   */
  pausePolling() {
    this.pollingState === "polling" && (this.pollingState = "paused", this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.render());
  }
  /**
   * Stop polling (cannot be resumed without new setJob)
   */
  stopPolling() {
    this.pollingState = "stopped", this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.clearPersistedJob(this.job?.kind || ""), this.render();
  }
  /**
   * Resume paused polling
   */
  resumePolling() {
    this.pollingState === "paused" && (this.pollingState = "polling", this.schedulePoll(), this.render());
  }
  /**
   * Reset to initial state
   */
  reset() {
    this.stopPolling(), this.job = null, this.pollingState = "idle", this.pollAttempts = 0, this.startTime = null, this.error = null, this.render();
  }
  /**
   * Retry after failure
   */
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
          headers: {
            Accept: "application/json"
          }
        });
        if (!e.ok)
          throw new Error(`Poll failed: ${e.status}`);
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
      this.error = new Error("Max polling attempts reached"), this.pollingState = "stopped", this.config.onError?.(this.error), this.render();
      return;
    }
    this.render(), this.schedulePoll();
  }
  handlePollError(e) {
    this.error = e, this.pollingState = "paused", this.config.onError?.(e), this.render();
  }
  // Storage helpers
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
      const t = this.getStorageKey(e.kind), n = localStorage.getItem(t);
      if (n) {
        const s = JSON.parse(n);
        s.lastPolledAt = (/* @__PURE__ */ new Date()).toISOString(), localStorage.setItem(t, JSON.stringify(s));
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
  // Rendering
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="async-progress" role="region" aria-label="${u(e.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `, this.attachEventListeners();
  }
  renderHeader() {
    const e = this.config.labels;
    if (!this.job)
      return `
        <div class="progress-header idle">
          <h4 class="progress-title">${u(e.title)}</h4>
          <span class="progress-status">${u(e.noActiveJob)}</span>
        </div>
      `;
    const t = Xe(this.job.status, "exchange"), n = this.getStatusLabel(), s = this.pollingState === "paused" ? `<span class="progress-status ${t}">${u(n)}</span>` : j(this.job.status, { domain: "exchange", size: "sm" });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${u(e.title)}</h4>
        ${s}
      </div>
    `;
  }
  renderContent() {
    if (!this.job)
      return "";
    const e = this.config.labels, t = this.job.progress;
    t.total || t.processed + 1;
    const n = t.total ? Math.round(t.processed / t.total * 100) : null;
    return `
      <div class="progress-content">
        ${this.renderProgressBar(n)}
        <div class="progress-counters">
          <span class="counter processed">
            <span class="counter-label">${u(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${u(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${u(e.failedCount)}:</span>
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
          <span class="info-label">${u(e.jobId)}:</span>
          <code class="info-value">${u(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${u(e.elapsed)}:</span>
            <span class="info-value">${u(t)}</span>
          </span>
        ` : ""}
      </div>
    `;
  }
  renderConflictSummary() {
    if (!this.job?.conflict_summary || this.job.conflict_summary.total === 0)
      return "";
    const e = this.config.labels, t = this.job.conflict_summary;
    return `
      <div class="progress-conflicts">
        <span class="conflicts-header">
          <span class="conflicts-label">${u(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([n, s]) => `
              <span class="conflict-type">
                <span class="type-name">${u(n)}:</span>
                <span class="type-count">${s}</span>
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
        <span class="error-message">${u(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${u(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${u(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${u(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${u(e.dismiss)}</button>`), t.length === 0 ? "" : `
      <div class="progress-footer">
        ${t.join("")}
      </div>
    `;
  }
  getStatusLabel() {
    const e = this.config.labels;
    if (this.pollingState === "paused")
      return e.pollingPaused;
    if (this.pollingState === "stopped" && !this.job?.status)
      return e.pollingStopped;
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
    const t = (/* @__PURE__ */ new Date()).getTime() - this.startTime.getTime(), n = Math.floor(t / 1e3);
    if (n < 60)
      return `${n}s`;
    const s = Math.floor(n / 60), o = n % 60;
    if (s < 60)
      return `${s}m ${o}s`;
    const i = Math.floor(s / 60), a = s % 60;
    return `${i}h ${a}m`;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".resume-btn")?.addEventListener("click", () => this.resumePolling()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.stopPolling()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.retry()), this.container.querySelector(".dismiss-btn")?.addEventListener("click", () => this.reset());
  }
}
function Ya() {
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
function ni(r, e) {
  const t = new Ft(e);
  return t.mount(r), t;
}
function Qa(r) {
  const e = r.dataset.pollInterval ? parseInt(r.dataset.pollInterval, 10) : void 0, t = r.dataset.autoStart !== "false";
  return ni(r, {
    pollInterval: e,
    autoStart: t
  });
}
function Wa(r, e) {
  const t = new Ft(e);
  return t.hasPersistedJob(r) ? t : null;
}
const ue = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function si(r) {
  const e = {
    sourceHash: null,
    sourceVersion: null,
    changedFieldsSummary: { count: 0, fields: [] },
    hasDrift: !1
  };
  if (!r || typeof r != "object")
    return e;
  const t = r.source_target_drift;
  if (t && typeof t == "object") {
    e.sourceHash = typeof t.source_hash == "string" ? t.source_hash : null, e.sourceVersion = typeof t.source_version == "string" ? t.source_version : null;
    const n = t.changed_fields_summary;
    n && typeof n == "object" && (e.changedFieldsSummary.count = typeof n.count == "number" ? n.count : 0, e.changedFieldsSummary.fields = Array.isArray(n.fields) ? n.fields.filter((s) => typeof s == "string") : []), e.hasDrift = e.changedFieldsSummary.count > 0 || e.changedFieldsSummary.fields.length > 0;
  }
  return e;
}
function oi(r, e) {
  return !r || !r.hasDrift ? !1 : r.changedFieldsSummary.fields.some(
    (t) => t.toLowerCase() === e.toLowerCase()
  );
}
function Xa(r) {
  return !r || !r.hasDrift ? [] : [...r.changedFieldsSummary.fields];
}
class ii {
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
      labels: { ...ue, ...e.labels }
    }, this.container = t;
  }
  /**
   * Render the side-by-side editor
   */
  render() {
    if (!this.container) {
      console.warn("[SideBySideEditor] Container not found");
      return;
    }
    this.container.innerHTML = this.buildHTML(), this.attachEventListeners();
  }
  /**
   * Build HTML for the editor
   */
  buildHTML() {
    const { drift: e, labels: t, sourceLocale: n, targetLocale: s, fields: o } = this.config, i = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", a = o.map((l) => this.renderFieldRow(l, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${n}" data-target-locale="${s}">
        ${i}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${u(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${n.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${u(t.targetColumn)}</span>
              <span class="sbs-locale-badge">${s.toUpperCase()}</span>
            </div>
          </div>
          <div class="sbs-fields">
            ${a}
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render the drift warning banner
   */
  renderDriftBanner(e, t) {
    const n = { ...ue, ...t }, s = e.changedFieldsSummary.count, o = e.changedFieldsSummary.fields, i = o.length > 0 ? `<ul class="sbs-drift-fields-list">${o.map((a) => `<li>${u(a)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${u(n.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${u(n.driftBannerDescription)}
            ${s > 0 ? `<span class="sbs-drift-count">${s} field${s !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${i}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${u(n.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  /**
   * Render a single field row
   */
  renderFieldRow(e, t) {
    const n = { ...ue, ...t }, s = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${u(n.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", o = this.renderSourceField(e), i = this.renderTargetField(e), a = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${b(e.key)}"
              title="${b(n.copySourceButton)}"
              aria-label="${b(n.copySourceButton)} for ${b(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${b(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${u(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${s}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${o}
          </div>
          <div class="sbs-field-actions">
            ${a}
          </div>
          <div class="sbs-target-field">
            ${i}
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render source field (read-only)
   */
  renderSourceField(e) {
    const t = u(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${b(e.key)}"
             aria-label="Source: ${b(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${b(e.key)}"
           aria-label="Source: ${b(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  /**
   * Render target field (editable)
   */
  renderTargetField(e) {
    const t = u(e.targetValue || ""), n = e.placeholder ? `placeholder="${b(e.placeholder)}"` : "", s = e.required ? "required" : "", o = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${b(e.key)}"
                  data-field="${b(e.key)}"
                  aria-label="Translation: ${b(e.label)}"
                  ${n}
                  ${s}
                  ${o}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${b(e.key)}"
             data-field="${b(e.key)}"
             value="${t}"
             aria-label="Translation: ${b(e.label)}"
             ${n}
             ${s}
             ${o}>
    `;
  }
  /**
   * Check if drift banner should be shown
   */
  shouldShowDriftBanner() {
    return !this.driftAcknowledged && this.config.drift !== null && this.config.drift.hasDrift;
  }
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;
    const e = this.container.querySelector('[data-action="acknowledge-drift"]');
    e && e.addEventListener("click", () => this.acknowledgeDrift()), this.container.querySelectorAll('[data-action="copy-source"]').forEach((t) => {
      t.addEventListener("click", (n) => {
        const s = n.currentTarget.dataset.field;
        s && this.copySourceToTarget(s);
      });
    }), this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      t.addEventListener("input", (n) => {
        const s = n.target, o = s.dataset.field;
        o && this.config.onChange && this.config.onChange(o, s.value);
      });
    });
  }
  /**
   * Acknowledge drift
   */
  acknowledgeDrift() {
    this.driftAcknowledged = !0;
    const e = this.container?.querySelector("[data-drift-banner]");
    e && (e.classList.add("sbs-drift-acknowledged"), setTimeout(() => e.remove(), 300)), this.config.onDriftAcknowledge && this.config.onDriftAcknowledge();
  }
  /**
   * Copy source value to target field
   */
  copySourceToTarget(e) {
    const t = this.config.fields.find((s) => s.key === e);
    if (!t) return;
    const n = this.container?.querySelector(
      `.sbs-target-input[data-field="${e}"]`
    );
    if (n) {
      n.value = t.sourceValue || "";
      const s = new Event("input", { bubbles: !0 });
      n.dispatchEvent(s);
    }
    this.config.onCopySource && this.config.onCopySource(e);
  }
  /**
   * Get current field values
   */
  getValues() {
    const e = {};
    return this.container && this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      const n = t.dataset.field;
      n && (e[n] = t.value);
    }), e;
  }
  /**
   * Set field value programmatically
   */
  setValue(e, t) {
    const n = this.container?.querySelector(
      `.sbs-target-input[data-field="${e}"]`
    );
    n && (n.value = t);
  }
  /**
   * Update fields and re-render
   */
  setFields(e) {
    this.config.fields = e, this.render();
  }
  /**
   * Update drift metadata
   */
  setDrift(e) {
    this.config.drift = e, this.driftAcknowledged = !1, this.render();
  }
  /**
   * Check if drift is currently acknowledged
   */
  isDriftAcknowledged() {
    return this.driftAcknowledged;
  }
  /**
   * Destroy the editor
   */
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
}
function ai(r) {
  const e = new ii(r);
  return e.render(), e;
}
function Za(r, e, t, n, s) {
  const o = si(e), i = n.map((a) => ({
    key: a,
    label: a.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    type: "text",
    hasSourceChanged: oi(o, a),
    sourceValue: String(t[a] || ""),
    targetValue: String(e[a] || ""),
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || ""
  }));
  return ai({
    container: r,
    fields: i,
    drift: o,
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || "",
    panelName: s.panelName || "",
    recordId: s.recordId || "",
    ...s
  });
}
function el() {
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
export {
  Xt as ActionRenderer,
  Vi as AdvancedSearch,
  Ft as AsyncProgress,
  Bt as AutosaveIndicator,
  cl as CORE_READINESS_DISPLAY,
  Dt as CapabilityGate,
  br as CellRendererRegistry,
  Ro as CharacterCounter,
  Vn as ColumnManager,
  Di as CommonRenderers,
  Oo as DEFAULT_FILTER_PRESETS,
  Tt as DEFAULT_INTERPOLATION_PATTERNS,
  _o as DEFAULT_SAMPLE_VALUES,
  ue as DEFAULT_SIDE_BY_SIDE_LABELS,
  ro as DEFAULT_STATUS_LEGEND_ITEMS,
  kt as DEFAULT_TRANSLATION_QUICK_FILTERS,
  dl as DISABLED_REASON_DISPLAY,
  ge as DataGrid,
  Vs as DefaultColumnVisibilityBehavior,
  to as DetailActionsController,
  Bo as DirectionToggle,
  ul as EXCHANGE_JOB_STATUS_DISPLAY,
  pl as EXCHANGE_ROW_STATUS_DISPLAY,
  Qo as ExchangeImport,
  Ee as FallbackBanner,
  Ki as FilterBuilder,
  Zi as GoCrudBulkActionBehavior,
  Xi as GoCrudExportBehavior,
  Yi as GoCrudFilterBehavior,
  Qi as GoCrudPaginationBehavior,
  Ji as GoCrudSearchBehavior,
  Wi as GoCrudSortBehavior,
  Et as InlineLocaleChips,
  Io as InterpolationPreview,
  _t as KeyboardShortcutRegistry,
  st as LocalDataGridStateStore,
  se as LocaleActionChip,
  Ks as PayloadInputModal,
  Ar as PreferencesDataGridStateStore,
  hl as QUEUE_CONTENT_STATE_DISPLAY,
  fl as QUEUE_DUE_STATE_DISPLAY,
  ml as QUEUE_STATE_DISPLAY,
  so as QuickFilters,
  Ct as SchemaActionBuilder,
  ea as ServerColumnVisibilityBehavior,
  ii as SideBySideEditor,
  $t as StatusLegend,
  Ae as TranslationBlockerModal,
  io as TranslationPanel,
  jo as TranslatorDashboard,
  po as applyFormLock,
  Fo as applyGateToElement,
  Co as applyShortcutSettings,
  ze as buildLocaleEditUrl,
  ta as buildSchemaRowActions,
  Wa as checkForPersistedJob,
  ji as collapseAllGroups,
  ni as createAsyncProgress,
  pa as createBulkCreateMissingHandler,
  Ne as createCapabilityGate,
  Er as createDataGridStateStore,
  za as createEmptyCapabilityGate,
  Xo as createExchangeImport,
  Ca as createInlineLocaleChipsRenderer,
  or as createLocaleBadgeRenderer,
  gl as createReasonCodeCellRenderer,
  ai as createSideBySideEditor,
  bl as createStatusCellRenderer,
  no as createStatusLegend,
  _a as createTranslationAutosave,
  Pi as createTranslationMatrixRenderer,
  ca as createTranslationPanel,
  oo as createTranslationQuickFilters,
  yo as createTranslationShortcuts,
  Ie as createTranslationStatusRenderer,
  Ho as createTranslatorDashboard,
  Gr as decodeExpandedGroupsToken,
  Fa as detectInterpolations,
  xo as dismissShortcutHint,
  Gi as encodeExpandedGroupsToken,
  ao as executeBulkCreateMissing,
  Oi as expandAllGroups,
  Fr as extractBackendSummaries,
  To as extractCapabilities,
  nl as extractExchangeError,
  ra as extractSchemaActions,
  si as extractSourceTargetDrift,
  _ as extractTranslationContext,
  k as extractTranslationReadiness,
  Lt as formatShortcutDisplay,
  sl as generateExchangeReport,
  We as getActionBlockDisplay,
  yl as getAllReasonCodes,
  Ya as getAsyncProgressStyles,
  Ia as getAutosaveIndicatorStyles,
  Ga as getCapabilityGateStyles,
  Xa as getChangedFields,
  qa as getCharCountSeverity,
  Ea as getDefaultShortcutRegistry,
  vl as getDisabledReasonDisplay,
  Ka as getExchangeImportStyles,
  zi as getExpandedGroupIds,
  Da as getFieldHelperStyles,
  ga as getFormLockReason,
  A as getLocaleLabel,
  Mi as getMissingTranslationsCount,
  go as getModifierSymbol,
  qr as getPersistedExpandState,
  Nr as getPersistedViewMode,
  mo as getPrimaryModifierLabel,
  wl as getSeverityCssClass,
  el as getSideBySideEditorStyles,
  Xe as getStatusCssClass,
  Ve as getStatusDisplay,
  xl as getStatusVocabularyStyles,
  Sl as getStatusesForDomain,
  Ha as getTranslatorDashboardStyles,
  Ce as getViewModeForViewport,
  ol as groupRowResultsByStatus,
  Gn as handleDelete,
  ot as hasBackendGroupedRows,
  oi as hasFieldDrift,
  Bi as hasMissingTranslations,
  wi as hasTranslationContext,
  ki as hasTranslationReadiness,
  Qa as initAsyncProgress,
  Ua as initCapabilityGating,
  Ja as initExchangeImport,
  va as initFallbackBanner,
  Ma as initFieldHelpers,
  Ba as initFormAutosave,
  wa as initFormLock,
  Sa as initInlineLocaleChips,
  $o as initKeyboardShortcuts,
  La as initKeyboardShortcutsWithDiscovery,
  fa as initLocaleActionChips,
  na as initPanelDetailActions,
  aa as initQuickFilters,
  Za as initSideBySideEditorFromRecord,
  oa as initStatusLegends,
  Va as initTranslatorDashboard,
  Vo as initTranslatorDashboardWithOptions,
  Cl as initializeVocabularyFromPayload,
  ja as isCoreEnabled,
  Mo as isExchangeEnabled,
  il as isExchangeError,
  ma as isFormLocked,
  vi as isInFallbackMode,
  oe as isMacPlatform,
  Yr as isNarrowViewport,
  Po as isQueueEnabled,
  Ai as isReadyForTransition,
  wo as isShortcutHintDismissed,
  $l as isValidReasonCode,
  kl as isValidStatus,
  vo as loadShortcutSettings,
  Dr as mergeBackendSummaries,
  Al as normalizeActionBlockCode,
  El as normalizeActionState,
  Ll as normalizeActionStateMap,
  _l as normalizeActionStateMeta,
  Rl as normalizeActionStateRecord,
  _r as normalizeBackendGroupedRows,
  Ye as normalizeBulkActionStateConfig,
  Je as normalizeBulkActionStateMap,
  Ht as normalizeBulkActionStateResponse,
  Ke as normalizeDetailActionStatePayload,
  Ut as normalizeListActionStatePayload,
  Oa as parseCapabilityMode,
  al as parseImportResult,
  mt as parseViewMode,
  Fi as persistExpandState,
  Ni as persistViewMode,
  ho as removeFormLock,
  Ra as renderAutosaveIndicator,
  er as renderAvailableLocalesIndicator,
  ua as renderBulkResultInline,
  da as renderBulkResultSummary,
  Pa as renderCharacterCounter,
  eo as renderDetailActions,
  Ta as renderDirectionToggle,
  Do as renderDisabledReasonBadge,
  So as renderDiscoveryHint,
  ba as renderFallbackBannerFromRecord,
  Ti as renderFallbackWarning,
  Na as renderGateAriaAttributes,
  Kr as renderGroupHeaderRow,
  Ur as renderGroupHeaderSummary,
  Jr as renderGroupedEmptyState,
  Hi as renderGroupedErrorState,
  Ui as renderGroupedLoadingState,
  fo as renderInlineLocaleChips,
  At as renderLocaleActionChip,
  ha as renderLocaleActionList,
  rt as renderLocaleBadge,
  Ri as renderLocaleCompleteness,
  Ii as renderMissingTranslationsBadge,
  _i as renderPublishReadinessBadge,
  la as renderQuickFiltersHTML,
  Li as renderReadinessIndicator,
  Vt as renderReasonCodeBadge,
  Il as renderReasonCodeIndicator,
  Aa as renderShortcutSettingsUI,
  $a as renderShortcutsHelpContent,
  Ei as renderStatusBadge,
  ia as renderStatusLegendHTML,
  Ci as renderTranslationAssignmentSummary,
  $i as renderTranslationExchangeSummary,
  xi as renderTranslationFamilyLink,
  Si as renderTranslationFamilyMemberCount,
  nr as renderTranslationMatrixCell,
  tr as renderTranslationStatusCell,
  j as renderVocabularyStatusBadge,
  Gt as renderVocabularyStatusIcon,
  Qe as resolveActionState,
  ka as saveShortcutSettings,
  ya as shouldShowFallbackBanner,
  xa as shouldShowInlineLocaleChips,
  sa as showTranslationBlocker,
  qi as toggleGroupExpand,
  Lr as transformToGroups
};
//# sourceMappingURL=index.js.map

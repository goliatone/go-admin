import { F as W } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as st, executeActionRequest as Re, isTranslationBlocker as Nt, extractTranslationBlocker as Gt, formatStructuredErrorForDisplay as Ht } from "../toast/error-helpers.js";
import { extractExchangeError as Qi, generateExchangeReport as Wi, groupRowResultsByStatus as Xi, isExchangeError as Zi, parseImportResult as el } from "../toast/error-helpers.js";
import { M as nt, e as g, T as Ge } from "../chunks/modal-DXPBR0f5.js";
import { b as re, a as Ut } from "../chunks/badge-CqKzZ9y5.js";
import { r as Vt } from "../chunks/icon-renderer-CRbgoQtj.js";
import { S as Kt } from "../chunks/sortable.esm-DOKudrbz.js";
let Jt = class ot extends nt {
  constructor(e, t, s) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = s;
  }
  static prompt(e) {
    return new Promise((t) => {
      new ot(
        e,
        (n) => t(n),
        () => t(null)
      ).show();
    });
  }
  renderContent() {
    const e = this.config.fields.map((t) => this.renderField(t)).join("");
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${g(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${g(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${g(this.config.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), s = () => {
      this.clearErrors();
      const n = {};
      let o = null;
      for (const a of this.config.fields) {
        const i = this.container?.querySelector(
          `[data-payload-field="${a.name}"]`
        );
        if (!i)
          continue;
        const l = i.value.trim();
        n[a.name] = l, l || (o || (o = i), this.showFieldError(a.name, "This field is required."));
      }
      if (o) {
        o.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(n), this.hide();
    };
    e?.addEventListener("submit", (n) => {
      n.preventDefault(), s();
    }), t?.addEventListener("click", () => {
      this.hide();
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${g(e.description)}</p>` : "", s = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${g(e.label)}
        </label>
        ${s}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, n = (e.options || []).map((o) => {
      const a = o.value === t ? " selected" : "";
      return `<option value="${g(o.value)}"${a}>${g(o.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${e.name}"
              data-payload-field="${e.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${n}
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${g(e.value)}</textarea>
      `;
    const s = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${s}"
             data-payload-field="${e.name}"
             value="${g(e.value)}"
             class="${t}" />
    `;
  }
  clearErrors() {
    this.container?.querySelectorAll("[data-payload-error]")?.forEach((t) => {
      t.textContent = "", t.classList.add("hidden");
    });
  }
  showFieldError(e, t) {
    const s = this.container?.querySelector(`[data-payload-error="${e}"]`);
    s && (s.textContent = t, s.classList.remove("hidden"));
  }
};
class Yt {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new W(), this.actionKeys = /* @__PURE__ */ new WeakMap(), this.actionKeySeq = 0;
  }
  /**
   * Render row actions as HTML
   */
  renderRowActions(e, t) {
    if (this.mode === "dropdown")
      return this.renderRowActionsDropdown(e, t);
    const s = t.filter(
      (o) => !o.condition || o.condition(e)
    );
    return s.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${s.map((o) => {
      const a = this.getVariantClass(o.variant || "secondary"), i = o.icon ? this.renderIcon(o.icon) : "", l = o.className || "", c = o.disabled === !0, d = this.getActionKey(o), u = c ? "opacity-50 cursor-not-allowed" : "", p = c ? 'aria-disabled="true"' : "", h = o.disabledReason ? `title="${this.escapeHtml(o.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${a} ${l} ${u}"
          data-action-id="${this.sanitize(o.label)}"
          data-action-key="${d}"
          data-record-id="${e.id}"
          data-disabled="${c}"
          ${p}
          ${h}
        >
          ${i}
          ${this.sanitize(o.label)}
        </button>
      `;
    }).join("")}</div>`;
  }
  /**
   * Render row actions as dropdown menu
   */
  renderRowActionsDropdown(e, t) {
    const s = t.filter(
      (a) => !a.condition || a.condition(e)
    );
    if (s.length === 0)
      return '<div class="text-sm text-gray-400">No actions</div>';
    const n = `actions-menu-${e.id}`, o = this.buildDropdownItems(e, s);
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
          ${o}
        </div>
      </div>
    `;
  }
  /**
   * Build dropdown menu items HTML
   */
  buildDropdownItems(e, t) {
    return t.map((s, n) => {
      const o = s.variant === "danger", a = s.disabled === !0, i = this.getActionKey(s), l = s.icon ? this.renderIcon(s.icon) : "", d = this.shouldShowDivider(s, n, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", u = a ? "action-item text-gray-400 cursor-not-allowed" : o ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", p = a ? 'aria-disabled="true"' : "", h = s.disabledReason ? `title="${this.escapeHtml(s.disabledReason)}"` : "";
      return `
        ${d}
        <button type="button"
                class="${u} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(s.label)}"
                data-action-key="${i}"
                data-record-id="${e.id}"
                data-disabled="${a}"
                role="menuitem"
                ${p}
                ${h}>
          <span class="flex-shrink-0 w-5 h-5">${l}</span>
          <span class="text-sm font-medium">${this.escapeHtml(s.label)}</span>
        </button>
      `;
    }).join("");
  }
  /**
   * Determine if divider should be shown before action
   */
  shouldShowDivider(e, t, s) {
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
  attachRowActionListeners(e, t, s) {
    t.forEach((n) => {
      const o = this.getActionKey(n);
      e.querySelectorAll(
        `[data-action-key="${o}"]`
      ).forEach((i) => {
        const l = i, c = l.dataset.recordId, d = s[c];
        d && l.addEventListener("click", async (u) => {
          if (u.preventDefault(), !(l.getAttribute("aria-disabled") === "true" || l.dataset.disabled === "true"))
            try {
              await n.action(d);
            } catch (p) {
              console.error(`Action "${n.label}" failed:`, p);
              const h = p instanceof Error ? p.message : `Action "${n.label}" failed`;
              this.notifier.error(h);
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
    const s = document.createElement("span");
    s.className = "text-sm font-medium text-blue-900", s.id = "selected-count", s.textContent = "0 items selected", t.appendChild(s);
    const n = document.createElement("div");
    n.className = "flex gap-2 flex-1", e.forEach((a) => {
      const i = document.createElement("button");
      i.type = "button", i.className = "btn btn-sm btn-primary", i.dataset.bulkAction = a.id, a.icon ? i.innerHTML = `${this.renderIcon(a.icon)} ${a.label}` : i.textContent = a.label, n.appendChild(i);
    }), t.appendChild(n);
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
      const n = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(n))
        return;
    }
    const s = await this.resolveBulkActionPayload(e, t);
    if (s !== null)
      try {
        const n = await fetch(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(s)
        });
        if (!n.ok) {
          const a = await st(n);
          throw this.notifier.error(a), new Error(a);
        }
        const o = await n.json();
        this.notifier.success(this.buildBulkSuccessMessage(e, o, t.length)), e.onSuccess && e.onSuccess(o);
      } catch (n) {
        if (console.error(`Bulk action "${e.id}" failed:`, n), !e.onError) {
          const o = n instanceof Error ? n.message : "Bulk action failed";
          this.notifier.error(o);
        }
        throw e.onError && e.onError(n), n;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const s = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([l, c]) => {
      s[l] === void 0 && c && c.default !== void 0 && (s[l] = c.default);
    });
    const a = this.collectRequiredFields(e.payloadRequired, n).filter((l) => l !== "ids" && this.isEmptyPayloadValue(s[l]));
    if (a.length === 0)
      return s;
    const i = await this.requestRequiredFields(e, a, n, s);
    if (i === null)
      return null;
    for (const l of a) {
      const c = n?.properties?.[l], d = i[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        return this.notifier.error(u.error), null;
      s[l] = u.value;
    }
    return s;
  }
  collectRequiredFields(e, t) {
    const s = [], n = /* @__PURE__ */ new Set(), o = (a) => {
      const i = a.trim();
      !i || n.has(i) || (n.add(i), s.push(i));
    };
    return Array.isArray(e) && e.forEach((a) => o(String(a))), Array.isArray(t?.required) && t.required.forEach((a) => o(String(a))), s;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e.properties;
    let s;
    return t && typeof t == "object" && (s = {}, Object.entries(t).forEach(([n, o]) => {
      o && typeof o == "object" && (s[n] = o);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: s
    };
  }
  async requestRequiredFields(e, t, s, n) {
    const o = t.map((a) => {
      const i = s?.properties?.[a], l = typeof i?.type == "string" ? i.type.toLowerCase() : "string";
      return {
        name: a,
        label: (i?.title || a).trim(),
        description: (i?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[a] !== void 0 ? n[a] : i?.default),
        type: l,
        options: this.buildSchemaOptions(i)
      };
    });
    return Jt.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: o
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((s) => s && Object.prototype.hasOwnProperty.call(s, "const")).map((s) => {
          const n = this.stringifyPromptDefault(s.const), o = typeof s.title == "string" && s.title.trim() ? s.title.trim() : n;
          return { value: n, label: o };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((s) => {
          const n = this.stringifyPromptDefault(s);
          return { value: n, label: n };
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
  coercePromptValue(e, t, s) {
    if (Array.isArray(s?.oneOf) && s.oneOf.length > 0) {
      const a = s.oneOf.find(
        (i) => i && Object.prototype.hasOwnProperty.call(i, "const") && this.stringifyPromptDefault(i.const) === e
      );
      if (!a || !Object.prototype.hasOwnProperty.call(a, "const")) {
        const i = s.oneOf.map((l) => typeof l?.title == "string" && l.title.trim() ? l.title.trim() : this.stringifyPromptDefault(l.const)).filter((l) => l !== "").join(", ");
        return { value: e, error: `${t} must be one of: ${i}` };
      }
      return { value: a.const };
    }
    const n = (s?.type || "string").toLowerCase();
    if (e === "")
      return { value: "" };
    let o = e;
    switch (n) {
      case "integer": {
        const a = Number.parseInt(e, 10);
        if (Number.isNaN(a))
          return { value: e, error: `${t} must be an integer.` };
        o = a;
        break;
      }
      case "number": {
        const a = Number.parseFloat(e);
        if (Number.isNaN(a))
          return { value: e, error: `${t} must be a number.` };
        o = a;
        break;
      }
      case "boolean": {
        const a = e.toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(a)) {
          o = !0;
          break;
        }
        if (["false", "0", "no", "n", "off"].includes(a)) {
          o = !1;
          break;
        }
        return { value: e, error: `${t} must be true/false.` };
      }
      case "array":
      case "object": {
        try {
          const a = JSON.parse(e);
          if (n === "array" && !Array.isArray(a))
            return { value: e, error: `${t} must be a JSON array.` };
          if (n === "object" && (a === null || Array.isArray(a) || typeof a != "object"))
            return { value: e, error: `${t} must be a JSON object.` };
          o = a;
        } catch {
          return { value: e, error: `${t} must be valid JSON.` };
        }
        break;
      }
      default:
        o = e;
    }
    return Array.isArray(s?.enum) && s.enum.length > 0 && !s.enum.some((i) => i === o || String(i) === String(o)) ? { value: o, error: `${t} must be one of: ${s.enum.map((i) => String(i)).join(", ")}` } : { value: o };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, s) {
    const n = e.label || e.id || "Bulk action", o = t && typeof t == "object" ? t.summary : null, a = o && typeof o.succeeded == "number" ? o.succeeded : typeof t?.processed == "number" ? t.processed : s, i = o && typeof o.failed == "number" ? o.failed : 0;
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
    if (t)
      return t;
    const s = typeof e.id == "string" ? e.id.trim() : "", n = s ? `id-${this.sanitize(s)}` : `auto-${++this.actionKeySeq}`;
    return this.actionKeys.set(e, n), n;
  }
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
const y = {
  check: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
  warning: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
  error: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
  info: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
  document: "M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z",
  archive: "M4 3a2 2 0 100 4h12a2 2 0 100-4H4zm0 6a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1H4zm4 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z",
  user: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z",
  play: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
  lock: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z",
  ban: "M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
}, be = {
  ready: {
    label: "Ready",
    shortLabel: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    borderClass: "border-green-300",
    icon: "●",
    iconType: "char",
    severity: "success",
    description: "All required translations are complete"
  },
  missing_locales: {
    label: "Missing Locales",
    shortLabel: "Missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    borderClass: "border-amber-300",
    icon: "○",
    iconType: "char",
    severity: "warning",
    description: "Required locale translations are missing"
  },
  missing_fields: {
    label: "Incomplete Fields",
    shortLabel: "Incomplete",
    colorClass: "bg-yellow-100 text-yellow-700",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-300",
    icon: "◐",
    iconType: "char",
    severity: "warning",
    description: "Some translations have missing required fields"
  },
  missing_locales_and_fields: {
    label: "Not Ready",
    shortLabel: "Not Ready",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    borderClass: "border-red-300",
    icon: "○",
    iconType: "char",
    severity: "error",
    description: "Missing translations and incomplete fields"
  }
}, ye = {
  pending: {
    label: "Pending",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: y.clock,
    iconType: "svg",
    severity: "neutral",
    description: "Waiting to be assigned"
  },
  assigned: {
    label: "Assigned",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: y.user,
    iconType: "svg",
    severity: "info",
    description: "Assigned to a translator"
  },
  in_progress: {
    label: "In Progress",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: y.play,
    iconType: "svg",
    severity: "info",
    description: "Translation in progress"
  },
  review: {
    label: "In Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: y.document,
    iconType: "svg",
    severity: "info",
    description: "Pending review"
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: y.error,
    iconType: "svg",
    severity: "error",
    description: "Translation rejected"
  },
  approved: {
    label: "Approved",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: y.check,
    iconType: "svg",
    severity: "success",
    description: "Translation approved"
  },
  published: {
    label: "Published",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: y.check,
    iconType: "svg",
    severity: "success",
    description: "Translation published"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: y.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Translation archived"
  }
}, ve = {
  draft: {
    label: "Draft",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: y.document,
    iconType: "svg",
    severity: "neutral",
    description: "Draft content"
  },
  review: {
    label: "Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: y.document,
    iconType: "svg",
    severity: "info",
    description: "Content under review"
  },
  ready: {
    label: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: y.check,
    iconType: "svg",
    severity: "success",
    description: "Content ready"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: y.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Content archived"
  }
}, we = {
  overdue: {
    label: "Overdue",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: y.warning,
    iconType: "svg",
    severity: "error",
    description: "Past due date"
  },
  due_soon: {
    label: "Due Soon",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: y.clock,
    iconType: "svg",
    severity: "warning",
    description: "Due within 24 hours"
  },
  on_track: {
    label: "On Track",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: y.check,
    iconType: "svg",
    severity: "success",
    description: "On schedule"
  },
  none: {
    label: "No Due Date",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: y.clock,
    iconType: "svg",
    severity: "neutral",
    description: "No due date set"
  }
}, xe = {
  success: {
    label: "Success",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: y.check,
    iconType: "svg",
    severity: "success",
    description: "Import/export succeeded"
  },
  error: {
    label: "Error",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: y.error,
    iconType: "svg",
    severity: "error",
    description: "Import/export failed"
  },
  conflict: {
    label: "Conflict",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: y.warning,
    iconType: "svg",
    severity: "warning",
    description: "Conflicting changes detected"
  },
  skipped: {
    label: "Skipped",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: y.ban,
    iconType: "svg",
    severity: "neutral",
    description: "Row skipped"
  }
}, Se = {
  running: {
    label: "Running",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: y.play,
    iconType: "svg",
    severity: "info",
    description: "Job in progress"
  },
  completed: {
    label: "Completed",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: y.check,
    iconType: "svg",
    severity: "success",
    description: "Job completed successfully"
  },
  failed: {
    label: "Failed",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: y.error,
    iconType: "svg",
    severity: "error",
    description: "Job failed"
  }
}, Ce = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: y.warning,
    severity: "warning",
    actionable: !0,
    actionLabel: "Create translation"
  },
  INVALID_STATUS: {
    message: "Action not available in current status",
    shortMessage: "Invalid status",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: y.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: y.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: y.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: y.ban,
    severity: "info",
    actionable: !1
  }
};
function j(r, e) {
  const t = r.toLowerCase();
  if ((!e || e === "core") && t in be)
    return be[t];
  if (!e || e === "queue") {
    if (t in ye)
      return ye[t];
    if (t in ve)
      return ve[t];
    if (t in we)
      return we[t];
  }
  if (!e || e === "exchange") {
    if (t in xe)
      return xe[t];
    if (t in Se)
      return Se[t];
  }
  return null;
}
function ne(r) {
  const e = r.toUpperCase();
  return e in Ce ? Ce[e] : null;
}
function la(r, e) {
  return j(r, e) !== null;
}
function ca(r) {
  return ne(r) !== null;
}
function da(r) {
  switch (r) {
    case "core":
      return Object.keys(be);
    case "queue":
      return [
        ...Object.keys(ye),
        ...Object.keys(ve),
        ...Object.keys(we)
      ];
    case "exchange":
      return [
        ...Object.keys(xe),
        ...Object.keys(Se)
      ];
    default:
      return [];
  }
}
function ua() {
  return Object.keys(Ce);
}
function at(r, e) {
  return j(r, e) ? `status-${r.toLowerCase()}` : "";
}
function pa(r, e) {
  const t = j(r, e);
  return t ? `severity-${t.severity}` : "";
}
function X(r, e = {}) {
  const t = j(r, e.domain);
  if (!t)
    return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${L(r)}</span>`;
  const { size: s = "default", showIcon: n = !0, showLabel: o = !0, extraClass: a = "" } = e, i = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs"
  }, l = n ? it(t, s) : "", c = o ? `<span>${L(t.label)}</span>` : "";
  return `<span class="inline-flex items-center ${n && o ? "gap-1" : ""} rounded font-medium ${i[s]} ${t.colorClass} ${a}"
                title="${L(t.description || t.label)}"
                aria-label="${L(t.label)}"
                data-status="${L(r)}">
    ${l}${c}
  </span>`;
}
function it(r, e = "default") {
  const t = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  return r.iconType === "char" ? `<span class="${t[e]} inline-flex items-center justify-center" aria-hidden="true">${r.icon}</span>` : `<svg class="${t[e]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function lt(r, e = {}) {
  const t = ne(r);
  if (!t)
    return `<span class="text-gray-500 text-xs">${L(r)}</span>`;
  const { size: s = "default", showIcon: n = !0, showFullMessage: o = !1, extraClass: a = "" } = e, i = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, c = n ? `<svg class="${s === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
      </svg>` : "", d = o ? t.message : t.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${i[s]} ${t.colorClass} ${a}"
                role="status"
                aria-label="${L(t.message)}"
                data-reason-code="${L(r)}">
    ${c}
    <span>${L(d)}</span>
  </span>`;
}
function ha(r, e) {
  const t = ne(r);
  if (!t)
    return "";
  const s = e || t.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${t.bgClass} ${t.textClass}"
                title="${L(s)}"
                aria-label="${L(t.shortMessage)}"
                data-reason-code="${L(r)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function fa(r = {}) {
  return (e) => typeof e != "string" || !e ? '<span class="text-gray-400">-</span>' : X(e, r);
}
function ga(r = {}) {
  return (e) => typeof e != "string" || !e ? "" : lt(e, r);
}
function ma(r) {
  r.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", r.schema_version);
}
function ba() {
  return `
    /* Status Vocabulary Styles */
    [data-status],
    [data-reason-code] {
      transition: opacity 0.15s ease;
    }

    [data-status]:hover,
    [data-reason-code]:hover {
      opacity: 0.9;
    }

    /* Severity-based animations */
    [data-status="overdue"],
    [data-status="rejected"],
    [data-status="error"],
    [data-status="failed"] {
      animation: pulse-subtle 2s ease-in-out infinite;
    }

    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `;
}
function L(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function P(r) {
  const e = {
    requestedLocale: null,
    resolvedLocale: null,
    availableLocales: [],
    missingRequestedLocale: !1,
    fallbackUsed: !1,
    translationGroupId: null,
    status: null,
    entityType: null,
    recordId: null
  };
  return !r || typeof r != "object" || (e.requestedLocale = F(r, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = F(r, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = sr(r, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = Ue(r, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = Ue(r, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = F(r, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = F(r, ["status"]), e.entityType = F(r, ["entity_type", "type", "_type"]), e.recordId = F(r, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function ya(r) {
  const e = P(r);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function va(r) {
  const e = P(r);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function _(r) {
  const e = {
    translationGroupId: null,
    requiredLocales: [],
    availableLocales: [],
    missingRequiredLocales: [],
    missingRequiredFieldsByLocale: {},
    readinessState: null,
    readyForTransition: {},
    evaluatedEnvironment: null,
    hasReadinessMetadata: !1
  };
  if (!r || typeof r != "object")
    return e;
  const t = r.translation_readiness;
  if (t && typeof t == "object") {
    e.hasReadinessMetadata = !0, e.translationGroupId = F(r, [
      "translation_readiness.translation_group_id",
      "translation_group_id",
      "translation.meta.translation_group_id",
      "content_translation.meta.translation_group_id",
      "translation_context.translation_group_id"
    ]), e.requiredLocales = Array.isArray(t.required_locales) ? t.required_locales.filter((a) => typeof a == "string") : [], e.availableLocales = Array.isArray(t.available_locales) ? t.available_locales.filter((a) => typeof a == "string") : [], e.missingRequiredLocales = Array.isArray(t.missing_required_locales) ? t.missing_required_locales.filter((a) => typeof a == "string") : [];
    const s = t.missing_required_fields_by_locale;
    if (s && typeof s == "object" && !Array.isArray(s))
      for (const [a, i] of Object.entries(s))
        Array.isArray(i) && (e.missingRequiredFieldsByLocale[a] = i.filter(
          (l) => typeof l == "string"
        ));
    const n = t.readiness_state;
    typeof n == "string" && Qt(n) && (e.readinessState = n);
    const o = t.ready_for_transition;
    if (o && typeof o == "object" && !Array.isArray(o))
      for (const [a, i] of Object.entries(o))
        typeof i == "boolean" && (e.readyForTransition[a] = i);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function wa(r) {
  return _(r).hasReadinessMetadata;
}
function xa(r, e) {
  return _(r).readyForTransition[e] === !0;
}
function Qt(r) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(r);
}
function ct(r, e = {}) {
  const t = "resolvedLocale" in r ? r : P(r), { showFallbackIndicator: s = !0, size: n = "default", extraClass: o = "" } = e;
  if (!t.resolvedLocale)
    return "";
  const a = t.resolvedLocale.toUpperCase(), i = t.fallbackUsed || t.missingRequestedLocale, c = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return i && s ? `<span class="${c} bg-amber-100 text-amber-800 ${o}"
                  title="Showing ${t.resolvedLocale} content (${t.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${a}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${a}
    </span>` : `<span class="${c} bg-blue-100 text-blue-800 ${o}"
                title="Locale: ${a}"
                aria-label="Locale: ${a}">
    ${a}
  </span>`;
}
function Wt(r, e = {}) {
  const t = "resolvedLocale" in r ? r : P(r), { maxLocales: s = 3, size: n = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const o = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", a = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", i = t.availableLocales.slice(0, s), l = t.availableLocales.length - s, c = i.map((u) => `<span class="${u === t.resolvedLocale ? `${a} rounded bg-blue-100 text-blue-700 font-medium` : `${a} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${a} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${o}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function Xt(r, e = {}) {
  const t = "resolvedLocale" in r ? r : P(r), { showResolvedLocale: s = !0, size: n = "default" } = e, o = [];
  return s && t.resolvedLocale && o.push(ct(t, { size: n, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && o.push(Wt(t, { ...e, size: n })), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${o.join("")}</div>`;
}
function Sa(r, e = "default") {
  if (!r)
    return "";
  const t = r.trim();
  if (j(t) !== null)
    return X(t, { size: e === "sm" ? "sm" : "default" });
  const s = t.toLowerCase();
  return re(r, "status", s, { size: e === "sm" ? "sm" : void 0 });
}
function Ca(r, e = {}) {
  const t = _(r);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: s = "default", showDetailedTooltip: n = !0, extraClass: o = "" } = e, i = `inline-flex items-center gap-1 rounded font-medium ${s === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: p, tooltip: h } = Zt(l, t, n);
  return `<span class="${i} ${u} ${p} ${o}"
                title="${h}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function $a(r, e = {}) {
  const t = _(r);
  if (!t.hasReadinessMetadata)
    return "";
  const s = t.readyForTransition.publish === !0, { size: n = "default", extraClass: o = "" } = e, a = n === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (s)
    return `<span class="inline-flex items-center gap-1 rounded font-medium ${a} bg-green-100 text-green-700 ${o}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const i = t.missingRequiredLocales.length, l = i > 0 ? `Missing translations: ${t.missingRequiredLocales.join(", ")}` : "Not ready to publish";
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${a} bg-amber-100 text-amber-700 ${o}"
                title="${l}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${i > 0 ? `${i} missing` : "Not ready"}
  </span>`;
}
function Ea(r, e = {}) {
  const t = _(r);
  if (!t.hasReadinessMetadata || t.requiredLocales.length === 0)
    return "";
  const { size: s = "default", extraClass: n = "" } = e, o = s === "sm" ? "text-xs" : "text-sm", a = t.requiredLocales.length, i = t.availableLocales.filter(
    (d) => t.requiredLocales.includes(d)
  ).length, c = a > 0 && i === a ? "text-green-600" : i > 0 ? "text-amber-600" : "text-gray-500";
  return `<span class="${o} ${c} font-medium ${n}"
                title="Locale completeness: ${i} of ${a} required locales available"
                aria-label="${i} of ${a} locales">
    ${i}/${a}
  </span>`;
}
function ka(r, e = {}) {
  const t = _(r);
  if (!t.hasReadinessMetadata || t.readinessState === "ready")
    return "";
  const { size: s = "default", extraClass: n = "" } = e, o = s === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", a = t.missingRequiredLocales.length, i = a > 0, l = Object.keys(t.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", u = "", p = "";
  return i && l ? (c = "bg-red-100", d = "text-red-800", u = `${a} missing`, p = `Missing translations: ${t.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : i ? (c = "bg-amber-100", d = "text-amber-800", u = `${a} missing`, p = `Missing translations: ${t.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", u = "Incomplete", p = `Incomplete fields in: ${Object.keys(t.missingRequiredFieldsByLocale).join(", ")}`), u ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${o} ${c} ${d} ${n}"
                title="${p}"
                aria-label="${p}"
                data-missing-translations="true"
                data-missing-count="${a}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>` : "";
}
function Aa(r) {
  const e = _(r);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function La(r) {
  return _(r).missingRequiredLocales.length;
}
function Zt(r, e, t) {
  const s = j(r, "core"), n = s ? it(s, "sm") : "", o = s?.bgClass || "bg-gray-100", a = s?.textClass || "text-gray-600", i = s?.label || "Unknown", l = s?.description || "Unknown readiness state";
  switch (r) {
    case "ready":
      return {
        icon: n,
        label: i,
        bgClass: o,
        textClass: a,
        tooltip: l
      };
    case "missing_locales": {
      const c = e.missingRequiredLocales, d = t && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: n,
        label: `${c.length} missing`,
        bgClass: o,
        textClass: a,
        tooltip: d
      };
    }
    case "missing_fields": {
      const c = Object.keys(e.missingRequiredFieldsByLocale), d = t && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields";
      return {
        icon: n,
        label: "Incomplete",
        bgClass: o,
        textClass: a,
        tooltip: d
      };
    }
    case "missing_locales_and_fields": {
      const c = e.missingRequiredLocales, d = Object.keys(e.missingRequiredFieldsByLocale), u = [];
      c.length > 0 && u.push(`Missing: ${c.join(", ")}`), d.length > 0 && u.push(`Incomplete: ${d.join(", ")}`);
      const p = t ? u.join("; ") : "Missing translations and incomplete fields";
      return {
        icon: n,
        label: "Not ready",
        bgClass: o,
        textClass: a,
        tooltip: p
      };
    }
    default:
      return {
        icon: n,
        label: i,
        bgClass: o,
        textClass: a,
        tooltip: l
      };
  }
}
function er(r, e = {}) {
  const { size: t = "sm", maxLocales: s = 5, showLabels: n = !1 } = e, o = _(r);
  if (!o.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: a, availableLocales: i, missingRequiredFieldsByLocale: l } = o, c = a.length > 0 ? a : i;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(i), u = tr(l), p = c.slice(0, s).map((f) => {
    const w = d.has(f), v = w && u.has(f), b = w && !v;
    let E, B, A;
    b ? (E = "bg-green-100 text-green-700 border-green-300", B = "●", A = "Complete") : v ? (E = "bg-amber-100 text-amber-700 border-amber-300", B = "◐", A = "Incomplete") : (E = "bg-white text-gray-400 border-gray-300 border-dashed", B = "○", A = "Missing");
    const x = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", z = n ? `<span class="font-medium">${f.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${x} rounded border ${E}"
              title="${f.toUpperCase()}: ${A}"
              aria-label="${f.toUpperCase()}: ${A}"
              data-locale="${f}"
              data-state="${A.toLowerCase()}">
          ${z}
          <span aria-hidden="true">${B}</span>
        </span>
      `;
  }).join(""), h = c.length > s ? `<span class="text-[10px] text-gray-500" title="${c.length - s} more locales">+${c.length - s}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${p}${h}</div>`;
}
function tr(r) {
  const e = /* @__PURE__ */ new Set();
  if (r && typeof r == "object")
    for (const [t, s] of Object.entries(r))
      Array.isArray(s) && s.length > 0 && e.add(t);
  return e;
}
function _a(r = {}) {
  return (e, t, s) => er(t, r);
}
function Ra(r, e = {}) {
  if (!r.fallbackUsed && !r.missingRequestedLocale)
    return "";
  const { showCreateButton: t = !0, createTranslationUrl: s, panelName: n } = e, o = r.requestedLocale || "requested locale", a = r.resolvedLocale || "default", i = t ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${r.requestedLocale || ""}"
            data-panel="${n || ""}"
            data-record-id="${r.recordId || ""}"
            ${s ? `data-url="${s}"` : ""}>
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
            You're viewing content from <strong>${a.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${i ? `<div class="mt-3">${i}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function He(r = {}) {
  return (e, t, s) => Xt(t, r);
}
function rr(r = {}) {
  return (e, t, s) => ct(t, r);
}
function F(r, e) {
  for (const t of e) {
    const s = Te(r, t);
    if (typeof s == "string" && s.trim())
      return s;
  }
  return null;
}
function sr(r, e) {
  for (const t of e) {
    const s = Te(r, t);
    if (Array.isArray(s))
      return s.filter((n) => typeof n == "string");
  }
  return [];
}
function Ue(r, e) {
  for (const t of e) {
    const s = Te(r, t);
    if (typeof s == "boolean")
      return s;
    if (s === "true") return !0;
    if (s === "false") return !1;
  }
  return !1;
}
function Te(r, e) {
  const t = e.split(".");
  let s = r;
  for (const n of t) {
    if (s == null || typeof s != "object")
      return;
    s = s[n];
  }
  return s;
}
const M = '<span class="text-gray-400">-</span>', nr = [
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
function N(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function or(r) {
  try {
    return JSON.stringify(r);
  } catch {
    return String(r);
  }
}
function ar(r) {
  const e = [], t = (n) => {
    if (typeof n != "string") return;
    const o = n.trim();
    !o || e.includes(o) || e.push(o);
  };
  t(r.display_key), t(r.displayKey);
  const s = r.display_keys ?? r.displayKeys;
  return Array.isArray(s) && s.forEach(t), e;
}
function ir(r, e) {
  if (!e) return;
  if (Object.prototype.hasOwnProperty.call(r, e))
    return r[e];
  if (!e.includes("."))
    return;
  const t = e.split(".");
  let s = r;
  for (const n of t) {
    if (!s || typeof s != "object" || Array.isArray(s) || !Object.prototype.hasOwnProperty.call(s, n))
      return;
    s = s[n];
  }
  return s;
}
function lr(r) {
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
function $e(r, e) {
  if (r == null)
    return "";
  if (Array.isArray(r))
    return Ee(r, e);
  if (typeof r != "object")
    return String(r);
  const s = [...ar(e), ...nr], n = /* @__PURE__ */ new Set();
  for (const o of s) {
    if (n.has(o)) continue;
    n.add(o);
    const a = ir(r, o), i = lr(a);
    if (i)
      return i;
  }
  return or(r);
}
function Ee(r, e) {
  if (!Array.isArray(r) || r.length === 0)
    return "";
  const t = r.map((a) => $e(a, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const s = Number(e.preview_limit ?? e.previewLimit ?? 3), n = Number.isFinite(s) && s > 0 ? Math.floor(s) : 3, o = t.slice(0, n);
  return t.length <= n ? o.join(", ") : `${o.join(", ")} +${t.length - n} more`;
}
function cr(r, e, t, s) {
  const n = r[e] ?? r[t] ?? s, o = Number(n);
  return Number.isFinite(o) && o > 0 ? Math.floor(o) : s;
}
function dr(r, e, t, s) {
  const n = r[e] ?? r[t];
  return n == null ? s : typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" || n === "1" : !!n;
}
function ur(r, e, t, s) {
  const n = r[e] ?? r[t];
  return n == null ? s : String(n).trim() || s;
}
function pr(r) {
  if (r == null)
    return "";
  if (typeof r == "string")
    return r.trim();
  if (typeof r != "object")
    return String(r).trim();
  const e = ["_type", "type", "blockType", "block_type"];
  for (const t of e) {
    const s = r[t];
    if (typeof s == "string" && s.trim())
      return s.trim();
  }
  return "";
}
function hr(r) {
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
class fr {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return M;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = Ee(e, {});
        return t ? N(t) : M;
      }
      if (typeof e == "object") {
        const t = $e(e, {});
        return t ? N(t) : M;
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
      return re(String(e), "status", t);
    }), this.renderers.set("_date", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      try {
        return new Date(e).toLocaleDateString();
      } catch {
        return String(e);
      }
    }), this.renderers.set("_datetime", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      try {
        return new Date(e).toLocaleString();
      } catch {
        return String(e);
      }
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
      const t = Number(e), s = ["Bytes", "KB", "MB", "GB", "TB"];
      if (t === 0) return "0 Bytes";
      const n = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, n)).toFixed(2)} ${s[n]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), s = 50;
      return t.length <= s ? t : `<span title="${t}">${t.substring(0, s)}...</span>`;
    }), this.renderers.set("_array", (e, t, s, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return M;
      const o = n?.options || {}, a = Ee(e, o);
      return a ? N(a) : M;
    }), this.renderers.set("_object", (e, t, s, n) => {
      if (e == null)
        return M;
      const o = n?.options || {}, a = $e(e, o);
      return a ? N(a) : M;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, s, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return M;
      const o = n?.options || {}, a = cr(o, "max_visible", "maxVisible", 3), i = dr(o, "show_count", "showCount", !0), l = ur(o, "chip_variant", "chipVariant", "default"), c = o.block_icons_map || o.blockIconsMap || {}, d = [], u = e.slice(0, a);
      for (const f of u) {
        const w = pr(f);
        if (!w) continue;
        const v = c[w] || "view-grid", b = Vt(v, { size: "14px", extraClass: "flex-shrink-0" }), E = hr(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${E}">${b}<span>${N(w)}</span></span>`
        );
      }
      if (d.length === 0)
        return M;
      const p = e.length - a;
      let h = "";
      return i && p > 0 && (h = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${p} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${h}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const s = t.name || t.username || t.email || "U", n = s.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${s}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const Ta = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (r) => (e) => {
    const t = String(e).toLowerCase();
    return re(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (r) => (e) => {
    const t = String(e).toLowerCase();
    return re(String(e), "role", t);
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (r, e) => {
    const t = r || e.name || e.username || "-", s = e.email || "";
    return s ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${s}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (r) => (e) => Ut(!!e, r),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (r) => {
    if (!r) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(r), s = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(s / 6e4), o = Math.floor(s / 36e5), a = Math.floor(s / 864e5);
      return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : a < 30 ? `${a} day${a > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(r);
    }
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: rr(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: He(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: He({ size: "sm", maxLocales: 2 })
}, gr = "datagrid.state.", ue = "datagrid.share.", dt = "datagrid.share.index", mr = 20;
function br(r) {
  return String(r || "").trim() || "default";
}
function pe(r, e = {}) {
  if (!Array.isArray(r)) return;
  const t = r.map((s) => typeof s == "string" ? s.trim() : "").filter((s) => s.length > 0);
  return t.length === 0 ? e.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(t));
}
function U(r) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const e = r, t = { version: 1 };
  (e.viewMode === "flat" || e.viewMode === "grouped" || e.viewMode === "matrix") && (t.viewMode = e.viewMode), (e.expandMode === "all" || e.expandMode === "none" || e.expandMode === "explicit") && (t.expandMode = e.expandMode);
  const s = pe(e.expandedGroups, { allowEmpty: !0 });
  s !== void 0 && (t.expandedGroups = s);
  const n = pe(e.hiddenColumns, { allowEmpty: !0 });
  n !== void 0 && (t.hiddenColumns = n);
  const o = pe(e.columnOrder);
  return o && (t.columnOrder = o), typeof e.updatedAt == "number" && Number.isFinite(e.updatedAt) && (t.updatedAt = e.updatedAt), t;
}
function Ve(r) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const e = r, t = { version: 1 };
  if (typeof e.search == "string") {
    const n = e.search.trim();
    n && (t.search = n);
  }
  typeof e.page == "number" && Number.isFinite(e.page) && (t.page = Math.max(1, Math.trunc(e.page))), typeof e.perPage == "number" && Number.isFinite(e.perPage) && (t.perPage = Math.max(1, Math.trunc(e.perPage))), Array.isArray(e.filters) && (t.filters = e.filters), Array.isArray(e.sort) && (t.sort = e.sort);
  const s = U(e.persisted);
  return s && (t.persisted = s), typeof e.updatedAt == "number" && Number.isFinite(e.updatedAt) && (t.updatedAt = e.updatedAt), t;
}
function yr(r) {
  const e = String(r || "").trim();
  return e ? e.replace(/\/+$/, "") : "/api/panels/preferences";
}
function vr(r) {
  return String(r || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function wr() {
  const r = Date.now().toString(36), e = Math.random().toString(36).slice(2, 10);
  return `${r}${e}`.slice(0, 16);
}
function xr(r) {
  try {
    const e = localStorage.getItem(dt);
    if (!e) return [];
    const t = JSON.parse(e);
    if (!Array.isArray(t)) return [];
    const s = t.map((n) => {
      if (!n || typeof n != "object" || Array.isArray(n)) return null;
      const o = n, a = typeof o.token == "string" ? o.token.trim() : "", i = typeof o.updatedAt == "number" ? o.updatedAt : 0;
      return !a || !Number.isFinite(i) ? null : { token: a, updatedAt: i };
    }).filter((n) => n !== null).sort((n, o) => o.updatedAt - n.updatedAt);
    return s.length <= r ? s : s.slice(0, r);
  } catch {
    return [];
  }
}
function Sr(r) {
  try {
    localStorage.setItem(dt, JSON.stringify(r));
  } catch {
  }
}
class ut {
  constructor(e) {
    const t = br(e.key);
    this.key = t, this.persistedStorageKey = `${gr}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || mr);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? U(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = U(e);
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
    const t = Ve(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const s = wr(), n = `${ue}${s}`;
    try {
      localStorage.setItem(n, JSON.stringify(t));
      const o = xr(this.maxShareEntries).filter((a) => a.token !== s);
      for (o.unshift({ token: s, updatedAt: t.updatedAt }); o.length > this.maxShareEntries; ) {
        const a = o.pop();
        a && localStorage.removeItem(`${ue}${a.token}`);
      }
      return Sr(o), s;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const s = localStorage.getItem(`${ue}${t}`);
      return s ? Ve(JSON.parse(s)) : null;
    } catch {
      return null;
    }
  }
}
class Cr extends ut {
  constructor(e) {
    super(e), this.syncTimeout = null, this.preferencesEndpoint = yr(e.preferencesEndpoint), this.resource = vr(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3);
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
      const s = await t.json(), n = this.extractFirstRecord(s);
      if (!n) return;
      const o = this.extractMap(n.effective), a = this.extractMap(n.raw), i = o[this.serverStateKey] ?? a[this.serverStateKey], l = U(i);
      l && super.savePersistedState(l);
    } catch {
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = U(e);
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
        body: JSON.stringify({
          raw: {
            [this.serverStateKey]: e
          }
        })
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
        body: JSON.stringify({
          clear_raw_keys: [this.serverStateKey]
        })
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
    const t = e, s = Array.isArray(t.records) ? t.records : Array.isArray(t.data) ? t.data : [];
    if (s.length === 0) return null;
    const n = s[0];
    return !n || typeof n != "object" || Array.isArray(n) ? null : n;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
}
function $r(r) {
  return (r.mode || "local") === "preferences" ? new Cr(r) : new ut(r);
}
function Er(r, e = {}) {
  const {
    groupByField: t = "translation_group_id",
    defaultExpanded: s = !0,
    expandMode: n = "explicit",
    expandedGroups: o = /* @__PURE__ */ new Set()
  } = e, a = /* @__PURE__ */ new Map(), i = [];
  for (const c of r) {
    const d = Ir(c, t);
    if (d) {
      const u = a.get(d);
      u ? u.push(c) : a.set(d, [c]);
    } else
      i.push(c);
  }
  const l = [];
  for (const [c, d] of a) {
    const u = bt(d), p = ht(c, n, o, s);
    l.push({
      groupId: c,
      records: d,
      summary: u,
      expanded: p,
      summaryFromBackend: !1
      // We're computing client-side here
    });
  }
  return l.sort((c, d) => {
    const u = r.indexOf(c.records[0]), p = r.indexOf(d.records[0]);
    return u - p;
  }), {
    groups: l,
    ungrouped: i,
    totalGroups: l.length,
    totalRecords: r.length
  };
}
function pt(r) {
  if (r.length === 0)
    return !1;
  let e = !1;
  for (const t of r) {
    if (Ar(t)) {
      e = !0;
      continue;
    }
    if (ft(t)) {
      e = !0;
      continue;
    }
    return !1;
  }
  return e;
}
function kr(r, e = {}) {
  const {
    defaultExpanded: t = !0,
    expandMode: s = "explicit",
    expandedGroups: n = /* @__PURE__ */ new Set()
  } = e;
  if (!pt(r))
    return null;
  const o = [], a = [];
  let i = 0;
  for (const l of r) {
    if (ft(l)) {
      a.push({ ...l }), i += 1;
      continue;
    }
    const c = Lr(l);
    if (!c)
      return null;
    const d = mt(l), u = Rr(l, d), p = ht(c, s, n, t);
    o.push({
      groupId: c,
      displayLabel: Tr(l, d),
      records: d,
      summary: u,
      expanded: p,
      summaryFromBackend: _r(l)
    }), i += d.length;
  }
  return {
    groups: o,
    ungrouped: a,
    totalGroups: o.length,
    totalRecords: i
  };
}
function ht(r, e, t, s) {
  return e === "all" ? !t.has(r) : e === "none" ? t.has(r) : t.size === 0 ? s : t.has(r);
}
function Ar(r) {
  const e = r, t = typeof e.group_by == "string" ? e.group_by.trim().toLowerCase() : "", s = gt(r);
  if (!(t === "translation_group_id" || s === "group"))
    return !1;
  const o = mt(r);
  return Array.isArray(o);
}
function ft(r) {
  return gt(r) === "ungrouped";
}
function gt(r) {
  const e = r._group;
  if (!e || typeof e != "object" || Array.isArray(e))
    return "";
  const t = e.row_type;
  return typeof t == "string" ? t.trim().toLowerCase() : "";
}
function Lr(r) {
  const e = r.translation_group_id;
  if (typeof e == "string" && e.trim())
    return e.trim();
  const t = r._group;
  if (!t || typeof t != "object" || Array.isArray(t))
    return null;
  const s = t.id;
  return typeof s == "string" && s.trim() ? s.trim() : null;
}
function mt(r) {
  const e = r, t = Array.isArray(e.records) ? e.records : e.children;
  if (Array.isArray(t)) {
    const n = t.filter((o) => !!o && typeof o == "object" && !Array.isArray(o)).map((o) => ({ ...o }));
    if (n.length > 0)
      return n;
  }
  const s = e.parent;
  return s && typeof s == "object" && !Array.isArray(s) ? [{ ...s }] : [];
}
function _r(r) {
  const e = r.translation_group_summary;
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function Rr(r, e) {
  const t = r.translation_group_summary;
  if (!t || typeof t != "object" || Array.isArray(t))
    return bt(e);
  const s = t, n = Array.isArray(s.available_locales) ? s.available_locales.filter(O) : [], o = Array.isArray(s.missing_locales) ? s.missing_locales.filter(O) : [], a = yt(s.readiness_state) ? s.readiness_state : null, i = Math.max(e.length, typeof s.child_count == "number" ? Math.max(s.child_count, 0) : 0);
  return {
    totalItems: typeof s.total_items == "number" ? Math.max(s.total_items, 0) : i,
    availableLocales: n,
    missingLocales: o,
    readinessState: a,
    readyForPublish: typeof s.ready_for_publish == "boolean" ? s.ready_for_publish : null
  };
}
function Tr(r, e) {
  const t = r.translation_group_label;
  if (typeof t == "string" && t.trim())
    return t.trim();
  const s = r.translation_group_summary;
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const i = s.group_label;
    if (typeof i == "string" && i.trim())
      return i.trim();
  }
  const n = r._group;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const i = n.label;
    if (typeof i == "string" && i.trim())
      return i.trim();
  }
  const o = [], a = r.parent;
  if (a && typeof a == "object" && !Array.isArray(a)) {
    const i = a;
    o.push(i.title, i.name, i.slug, i.path);
  }
  e.length > 0 && o.push(e[0].title, e[0].name, e[0].slug, e[0].path);
  for (const i of o)
    if (typeof i == "string" && i.trim())
      return i.trim();
}
function Ir(r, e) {
  const t = r[e];
  if (typeof t == "string" && t.trim())
    return t;
  const s = [
    `translation.meta.${e}`,
    `content_translation.meta.${e}`
  ];
  for (const n of s) {
    const o = Mr(r, n);
    if (typeof o == "string" && o.trim())
      return o;
  }
  return null;
}
function Mr(r, e) {
  const t = e.split(".");
  let s = r;
  for (const n of t) {
    if (s == null || typeof s != "object")
      return;
    s = s[n];
  }
  return s;
}
function bt(r) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let s = !1, n = 0;
  for (const a of r) {
    const i = a.translation_readiness;
    if (i) {
      const c = i.available_locales, d = i.missing_required_locales, u = i.readiness_state;
      Array.isArray(c) && c.filter(O).forEach((p) => e.add(p)), Array.isArray(d) && d.filter(O).forEach((p) => t.add(p)), (u === "missing_fields" || u === "missing_locales_and_fields") && (s = !0), u === "ready" && n++;
    }
    const l = a.available_locales;
    Array.isArray(l) && l.filter(O).forEach((c) => e.add(c));
  }
  let o = null;
  if (r.length > 0) {
    const a = n === r.length, i = t.size > 0;
    a ? o = "ready" : i && s ? o = "missing_locales_and_fields" : i ? o = "missing_locales" : s && (o = "missing_fields");
  }
  return {
    totalItems: r.length,
    availableLocales: Array.from(e),
    missingLocales: Array.from(t),
    readinessState: o,
    readyForPublish: o === "ready"
  };
}
function O(r) {
  return typeof r == "string";
}
function Pr(r, e) {
  const t = r.groups.map((s) => {
    const n = e.get(s.groupId);
    return n ? {
      ...s,
      summary: {
        ...s.summary,
        ...n
      },
      summaryFromBackend: !0
    } : s;
  });
  return {
    ...r,
    groups: t
  };
}
function Br(r) {
  const e = /* @__PURE__ */ new Map(), t = r.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [s, n] of Object.entries(t))
    if (n && typeof n == "object") {
      const o = n;
      e.set(s, {
        totalItems: typeof o.total_items == "number" ? o.total_items : void 0,
        availableLocales: Array.isArray(o.available_locales) ? o.available_locales.filter(O) : void 0,
        missingLocales: Array.isArray(o.missing_locales) ? o.missing_locales.filter(O) : void 0,
        readinessState: yt(o.readiness_state) ? o.readiness_state : void 0,
        readyForPublish: typeof o.ready_for_publish == "boolean" ? o.ready_for_publish : void 0
      });
    }
  return e;
}
function yt(r) {
  return r === "ready" || r === "missing_locales" || r === "missing_fields" || r === "missing_locales_and_fields";
}
const oe = "datagrid-expand-state-";
function ke(r) {
  if (!Array.isArray(r))
    return [];
  const e = [];
  for (const t of r) {
    const s = Me(t);
    if (s && !e.includes(s)) {
      if (e.length >= Ie) break;
      e.push(s);
    }
  }
  return e;
}
function vt(r) {
  if (!r)
    return null;
  try {
    const e = JSON.parse(r);
    if (Array.isArray(e))
      return {
        version: 2,
        mode: "explicit",
        ids: ke(e)
      };
    if (!e || typeof e != "object" || Array.isArray(e))
      return null;
    const t = Z(e.mode, "explicit"), s = ke(e.ids);
    return { version: 2, mode: t, ids: s };
  } catch {
    return null;
  }
}
function Dr(r) {
  try {
    const e = oe + r, t = vt(localStorage.getItem(e));
    if (t)
      return new Set(t.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Fr(r) {
  try {
    const e = oe + r, t = vt(localStorage.getItem(e));
    if (t)
      return t.mode;
  } catch {
  }
  return "explicit";
}
function qr(r) {
  try {
    const e = oe + r;
    return localStorage.getItem(e) !== null;
  } catch {
    return !1;
  }
}
function Ia(r, e, t = "explicit") {
  try {
    const s = oe + r, n = ke(Array.from(e)), o = {
      version: 2,
      mode: Z(t, "explicit"),
      ids: n
    };
    localStorage.setItem(s, JSON.stringify(o));
  } catch {
  }
}
function Ma(r, e) {
  const t = r.groups.map((s) => s.groupId === e ? { ...s, expanded: !s.expanded } : s);
  return { ...r, groups: t };
}
function Pa(r) {
  const e = r.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...r, groups: e };
}
function Ba(r) {
  const e = r.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...r, groups: e };
}
function Da(r) {
  const e = /* @__PURE__ */ new Set();
  for (const t of r.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const wt = "datagrid-view-mode-", Ie = 200, Or = 256;
function Z(r, e = "explicit") {
  return r === "all" || r === "none" || r === "explicit" ? r : e;
}
function jr(r) {
  try {
    const e = wt + r, t = localStorage.getItem(e);
    if (t && xt(t))
      return t;
  } catch {
  }
  return null;
}
function Fa(r, e) {
  try {
    const t = wt + r;
    localStorage.setItem(t, e);
  } catch {
  }
}
function xt(r) {
  return r === "flat" || r === "grouped" || r === "matrix";
}
function St(r) {
  return r && xt(r) ? r : null;
}
function qa(r) {
  if (!(r instanceof Set) || r.size === 0)
    return "";
  const e = Array.from(new Set(
    Array.from(r).map((t) => Me(t)).filter((t) => t !== null)
  )).slice(0, Ie).sort();
  return e.length === 0 ? "" : e.map((t) => encodeURIComponent(t)).join(",");
}
function zr(r) {
  const e = /* @__PURE__ */ new Set();
  if (!r)
    return e;
  const t = r.split(",");
  for (const s of t) {
    if (e.size >= Ie)
      break;
    if (!s)
      continue;
    let n = "";
    try {
      n = decodeURIComponent(s);
    } catch {
      continue;
    }
    const o = Me(n);
    o && e.add(o);
  }
  return e;
}
function Me(r) {
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
  return e.length > Or ? null : e;
}
function Nr(r, e = {}) {
  const { summary: t } = r, { size: s = "sm" } = e, n = s === "sm" ? "text-xs" : "text-sm", o = t.availableLocales.length, a = t.missingLocales.length, i = o + a;
  let l = "";
  if (t.readinessState) {
    const u = Gr(t.readinessState);
    l = `
      <span class="${n} px-1.5 py-0.5 rounded ${u.bgClass} ${u.textClass}"
            title="${u.description}">
        ${u.icon} ${u.label}
      </span>
    `;
  }
  const c = i > 0 ? `<span class="${n} text-gray-500">${o}/${i} locales</span>` : "", d = `<span class="${n} text-gray-500">${t.totalItems} item${t.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${l}
      ${c}
      ${d}
    </div>
  `;
}
function Gr(r) {
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
function Hr(r) {
  if (typeof r.displayLabel == "string" && r.displayLabel.trim())
    return r.displayLabel.trim();
  if (r.groupId.startsWith("ungrouped:"))
    return "Ungrouped Records";
  if (r.records.length > 0) {
    const t = r.records[0];
    for (const s of ["title", "name", "label", "subject"]) {
      const n = t[s];
      if (typeof n == "string" && n.trim()) {
        const o = n.trim();
        return o.length > 60 ? o.slice(0, 57) + "..." : o;
      }
    }
  }
  return `Translation Group (${r.groupId.length > 8 ? r.groupId.slice(0, 8) + "..." : r.groupId})`;
}
function Ur(r, e, t = {}) {
  const { showExpandIcon: s = !0 } = t, n = s ? `<span class="expand-icon mr-2" aria-hidden="true">${r.expanded ? "▼" : "▶"}</span>` : "", o = Nr(r), a = Pe(Hr(r)), i = r.records.length, l = i > 1 ? `<span class="ml-2 text-xs text-gray-500">(${i} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${Vr(r.groupId)}"
        data-expanded="${r.expanded}"
        role="row"
        aria-expanded="${r.expanded}"
        tabindex="0">
      <td colspan="${e + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${n}
            <span class="font-medium text-gray-700">${a}</span>
            ${l}
          </div>
          ${o}
        </div>
      </td>
    </tr>
  `;
}
function Pe(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Vr(r) {
  return Pe(r);
}
function Kr(r) {
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
function Oa(r) {
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
function ja(r, e, t) {
  const s = t ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${r + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${Pe(e)}</p>
          ${s}
        </div>
      </td>
    </tr>
  `;
}
function Jr(r = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < r;
}
function Be(r, e = 768) {
  return Jr(e) && r === "grouped" ? "flat" : r;
}
const V = "search", K = "page", J = "perPage", Y = "filters", Q = "sort", ae = "state", De = "hiddenColumns", ie = "view_mode", se = "expanded_groups", Fe = [
  V,
  K,
  J,
  Y,
  Q,
  ae,
  De,
  ie,
  se
], Ct = 1800, $t = 600;
function Ke(r, e) {
  const t = e.toString();
  return t ? `${r}?${t}` : r;
}
function Yr(r, e) {
  for (const t of e)
    r.delete(t);
}
function Qr(r) {
  const e = Math.max(
    256,
    r.config.urlState?.maxURLLength || Ct
  ), t = Math.max(
    64,
    r.config.urlState?.maxFiltersLength || $t
  ), s = r.config.urlState?.enableStateToken !== !1;
  return {
    maxURLLength: e,
    maxFiltersLength: t,
    enableStateToken: s
  };
}
function Wr(r, e, t) {
  const s = String(e || "").trim();
  if (!s)
    return null;
  try {
    const n = JSON.parse(s);
    return Array.isArray(n) ? n : (console.warn(`[DataGrid] Invalid ${t} payload in URL (expected array)`), null);
  } catch (n) {
    return console.warn(`[DataGrid] Failed to parse ${t} payload from URL:`, n), null;
  }
}
function Xr(r, e, t = {}) {
  const s = t.merge === !0, n = new Set(r.config.columns.map((i) => i.field)), o = Array.isArray(e.hiddenColumns) ? new Set(
    e.hiddenColumns.map((i) => String(i || "").trim()).filter((i) => i.length > 0 && n.has(i))
  ) : null;
  o ? (r.state.hiddenColumns = o, r.hasPersistedHiddenColumnState = !0) : s || (r.state.hiddenColumns = new Set(
    r.config.columns.filter((i) => i.hidden).map((i) => i.field)
  ), r.hasPersistedHiddenColumnState = !1);
  const a = Array.isArray(e.columnOrder) ? e.columnOrder.map((i) => String(i || "").trim()).filter((i) => i.length > 0 && n.has(i)) : null;
  if (a && a.length > 0) {
    const i = r.mergeColumnOrder(a);
    r.state.columnOrder = i, r.hasPersistedColumnOrderState = !0, r.didRestoreColumnOrder = !0;
    const l = r.defaultColumns.map((d) => d.field);
    r.shouldReorderDOMOnRestore = l.join("|") !== i.join("|");
    const c = new Map(r.config.columns.map((d) => [d.field, d]));
    r.config.columns = i.map((d) => c.get(d)).filter((d) => d !== void 0);
  } else s || (r.state.columnOrder = r.config.columns.map((i) => i.field), r.hasPersistedColumnOrderState = !1, r.didRestoreColumnOrder = !1, r.shouldReorderDOMOnRestore = !1);
  if (r.config.enableGroupedMode) {
    if (e.viewMode) {
      const i = St(e.viewMode);
      i && (r.state.viewMode = Be(i));
    }
    r.state.expandMode = Z(e.expandMode, r.state.expandMode), Array.isArray(e.expandedGroups) ? (r.state.expandedGroups = new Set(
      e.expandedGroups.map((i) => String(i || "").trim()).filter(Boolean)
    ), r.state.hasPersistedExpandState = !0) : e.expandMode !== void 0 && (r.state.hasPersistedExpandState = !0);
  }
}
function Zr(r, e) {
  e.persisted && r.applyPersistedStateSnapshot(e.persisted, { merge: !0 }), typeof e.search == "string" && (r.state.search = e.search), typeof e.page == "number" && Number.isFinite(e.page) && (r.state.currentPage = Math.max(1, Math.trunc(e.page))), typeof e.perPage == "number" && Number.isFinite(e.perPage) && (r.state.perPage = Math.max(1, Math.trunc(e.perPage))), Array.isArray(e.filters) && (r.state.filters = e.filters), Array.isArray(e.sort) && (r.state.sort = e.sort);
}
function es(r) {
  const e = {
    version: 1,
    hiddenColumns: Array.from(r.state.hiddenColumns),
    columnOrder: [...r.state.columnOrder],
    updatedAt: Date.now()
  };
  return r.config.enableGroupedMode && (e.viewMode = r.state.viewMode, e.expandMode = r.state.expandMode, e.expandedGroups = Array.from(r.state.expandedGroups)), e;
}
function ts(r) {
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
function rs(r) {
  r.stateStore.savePersistedState(r.buildPersistedStateSnapshot());
}
function ss(r) {
  const e = new URLSearchParams(window.location.search);
  r.didRestoreColumnOrder = !1, r.shouldReorderDOMOnRestore = !1, r.hasURLStateOverrides = Fe.some((c) => e.has(c));
  const t = e.get(ae);
  if (t) {
    const c = r.stateStore.resolveShareState(t);
    c && r.applyShareStateSnapshot(c);
  }
  const s = e.get(V);
  if (s) {
    r.state.search = s;
    const c = document.querySelector(r.selectors.searchInput);
    c && (c.value = s);
  }
  const n = e.get(K);
  if (n) {
    const c = parseInt(n, 10);
    r.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const o = e.get(J);
  if (o) {
    const c = parseInt(o, 10), d = r.config.perPage || 10;
    r.state.perPage = Number.isNaN(c) ? d : Math.max(1, c);
    const u = document.querySelector(r.selectors.perPageSelect);
    u && (u.value = String(r.state.perPage));
  }
  const a = e.get(Y);
  if (a) {
    const c = r.parseJSONArray(a, "filters");
    c && (r.state.filters = c);
  }
  const i = e.get(Q);
  if (i) {
    const c = r.parseJSONArray(i, "sort");
    c && (r.state.sort = c);
  }
  if (r.config.enableGroupedMode) {
    const c = St(e.get(ie));
    c && (r.state.viewMode = Be(c)), e.has(se) && (r.state.expandedGroups = zr(
      e.get(se)
    ), r.state.expandMode = "explicit", r.state.hasPersistedExpandState = !0);
  }
  const l = e.get(De);
  if (l) {
    const c = r.parseJSONArray(l, "hidden columns");
    if (c) {
      const d = new Set(r.config.columns.map((u) => u.field));
      r.state.hiddenColumns = new Set(
        c.map((u) => typeof u == "string" ? u.trim() : "").filter((u) => u.length > 0 && d.has(u))
      );
    }
  } else if (!r.hasPersistedHiddenColumnState && r.config.behaviors?.columnVisibility) {
    const c = r.config.columns.map((u) => u.field), d = r.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(c);
    d.size > 0 && (r.state.hiddenColumns = d);
  }
  if (!r.hasPersistedColumnOrderState && r.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
    const c = r.config.columns.map((u) => u.field), d = r.config.behaviors.columnVisibility.loadColumnOrderFromCache(c);
    if (d && d.length > 0) {
      const u = r.mergeColumnOrder(d);
      r.state.columnOrder = u, r.didRestoreColumnOrder = !0;
      const p = r.defaultColumns.map((f) => f.field);
      r.shouldReorderDOMOnRestore = p.join("|") !== u.join("|");
      const h = new Map(r.config.columns.map((f) => [f.field, f]));
      r.config.columns = u.map((f) => h.get(f)).filter((f) => f !== void 0);
    }
  }
  r.persistStateSnapshot(), console.log("[DataGrid] State restored from URL:", r.state), setTimeout(() => {
    r.applyRestoredState();
  }, 0);
}
function ns(r) {
  const e = document.querySelector(r.selectors.searchInput);
  e && (e.value = r.state.search);
  const t = document.querySelector(r.selectors.perPageSelect);
  t && (t.value = String(r.state.perPage)), r.state.filters.length > 0 && r.state.filters.forEach((n) => {
    const o = document.querySelector(
      `[data-filter-column="${n.column}"]`
    );
    o && (o.value = String(n.value));
  }), r.didRestoreColumnOrder && r.shouldReorderDOMOnRestore && r.reorderTableColumns(r.state.columnOrder);
  const s = r.config.columns.filter((n) => !r.state.hiddenColumns.has(n.field)).map((n) => n.field);
  r.updateColumnVisibility(s, !0), r.state.sort.length > 0 && r.updateSortIndicators();
}
function os(r, e = {}) {
  r.persistStateSnapshot();
  const t = r.getURLStateConfig(), s = new URLSearchParams(window.location.search);
  Yr(s, Fe), r.state.search && s.set(V, r.state.search), r.state.currentPage > 1 && s.set(K, String(r.state.currentPage)), r.state.perPage !== (r.config.perPage || 10) && s.set(J, String(r.state.perPage));
  let n = !1;
  if (r.state.filters.length > 0) {
    const i = JSON.stringify(r.state.filters);
    i.length <= t.maxFiltersLength ? s.set(Y, i) : n = !0;
  }
  r.state.sort.length > 0 && s.set(Q, JSON.stringify(r.state.sort)), r.config.enableGroupedMode && s.set(ie, r.state.viewMode);
  let o = Ke(window.location.pathname, s);
  const a = o.length > t.maxURLLength;
  if (t.enableStateToken && (n || a)) {
    s.delete(V), s.delete(K), s.delete(J), s.delete(Y), s.delete(Q);
    const i = r.stateStore.createShareState(r.buildShareStateSnapshot());
    i && s.set(ae, i), o = Ke(window.location.pathname, s);
  }
  e.replace ? window.history.replaceState({}, "", o) : window.history.pushState({}, "", o), console.log("[DataGrid] URL updated:", o);
}
async function I(r, e = {}) {
  const {
    json: t,
    idempotencyKey: s,
    accept: n,
    headers: o,
    ...a
  } = e, i = new Headers(o || {});
  n ? i.set("Accept", n) : i.has("Accept") || i.set("Accept", "application/json"), s && s.trim() && i.set("X-Idempotency-Key", s.trim());
  let l = a.body;
  return t !== void 0 && (i.has("Content-Type") || i.set("Content-Type", "application/json"), l = JSON.stringify(t)), fetch(r, {
    ...a,
    headers: i,
    body: l
  });
}
async function as(r, e = "Request failed") {
  try {
    const t = await r.text();
    if (t && t.trim())
      return t.trim();
  } catch {
  }
  return `${e}: ${r.status}`;
}
async function is(r) {
  console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(r.state.sort)), r.abortController && r.abortController.abort(), r.abortController = new AbortController();
  try {
    const e = r.buildApiUrl(), t = await I(e, {
      signal: r.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!t.ok) {
      if (r.handleGroupedModeStatusFallback(t.status))
        return;
      throw new Error(`HTTP error! status: ${t.status}`);
    }
    const s = await t.json();
    console.log("[DataGrid] API Response:", s), console.log("[DataGrid] API Response data array:", s.data), console.log("[DataGrid] API Response total:", s.total, "count:", s.count, "$meta:", s.$meta);
    const n = s.data || s.records || [];
    if (r.handleGroupedModePayloadFallback(n))
      return;
    r.lastSchema = s.schema || null, r.lastForm = s.form || null;
    const o = r.getResponseTotal(s);
    if (r.normalizePagination(o))
      return r.refresh();
    console.log("[DataGrid] About to call renderData()..."), r.renderData(s), console.log("[DataGrid] renderData() completed"), r.updatePaginationUI(s), console.log("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.log("[DataGrid] Request aborted");
      return;
    }
    console.error("[DataGrid] Error fetching data:", e), r.showError("Failed to load data");
  }
}
function ls(r) {
  const e = new URLSearchParams(), t = r.buildQueryParams();
  Object.entries(t).forEach(([n, o]) => {
    o != null && e.append(n, String(o));
  });
  const s = `${r.config.apiEndpoint}?${e.toString()}`;
  return console.log(`[DataGrid] API URL: ${s}`), s;
}
function cs(r) {
  const e = new URLSearchParams(), t = r.buildQueryParams();
  return Object.entries(t).forEach(([s, n]) => {
    n != null && e.append(s, String(n));
  }), e.toString();
}
function ds(r) {
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
  return r.isGroupedViewActive() && (e.group_by = r.config.groupByField || "translation_group_id"), e;
}
function us(r, e) {
  return e.total !== void 0 && e.total !== null ? e.total : e.$meta?.count !== void 0 && e.$meta?.count !== null ? e.$meta.count : e.count !== void 0 && e.count !== null ? e.count : null;
}
function ps(r, e) {
  if (e === null)
    return !1;
  const t = Math.max(1, r.state.perPage || r.config.perPage || 10), s = Math.max(1, Math.ceil(e / t));
  let n = r.state.currentPage;
  e === 0 ? n = 1 : n > s ? n = s : n < 1 && (n = 1);
  const o = t !== r.state.perPage || n !== r.state.currentPage;
  return o && (r.state.perPage = t, r.state.currentPage = n, r.pushStateToURL()), e === 0 ? !1 : o;
}
async function hs(r, e) {
  const t = await I(`${r.config.apiEndpoint}/${e}`, {
    method: "GET",
    accept: "application/json"
  });
  if (!t.ok)
    throw new Error(`Detail request failed: ${t.status}`);
  const s = await t.json(), n = r.normalizeDetailResponse(s);
  return n.schema && (r.lastSchema = n.schema), n.form && (r.lastForm = n.form), {
    ...n,
    tabs: n.schema?.tabs || []
  };
}
function fs(r, e) {
  if (e && typeof e == "object" && "data" in e) {
    const t = e;
    return {
      data: t.data,
      schema: t.schema,
      form: t.form
    };
  }
  return { data: e };
}
function gs(r) {
  return r.lastSchema;
}
function ms(r) {
  return r.lastForm;
}
function bs(r) {
  return r.lastSchema?.tabs || [];
}
function ys(r, e, t, s) {
  const n = r.config.groupByField || "translation_group_id", o = t.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let a = kr(o, {
    defaultExpanded: !r.state.hasPersistedExpandState,
    expandMode: r.state.expandMode,
    expandedGroups: r.state.expandedGroups
  });
  a || (a = Er(o, {
    groupByField: n,
    defaultExpanded: !r.state.hasPersistedExpandState,
    expandMode: r.state.expandMode,
    expandedGroups: r.state.expandedGroups
  }));
  const i = Br(e);
  i.size > 0 && (a = Pr(a, i)), r.state.groupedData = a;
  const l = r.config.columns.length;
  for (const c of a.groups) {
    const d = Ur(c, l);
    s.insertAdjacentHTML("beforeend", d);
    const u = s.lastElementChild;
    u && (u.addEventListener("click", () => r.toggleGroup(c.groupId)), u.addEventListener("keydown", (p) => {
      (p.key === "Enter" || p.key === " ") && (p.preventDefault(), r.toggleGroup(c.groupId));
    }));
    for (const p of c.records) {
      p.id && (r.recordsById[p.id] = p);
      const h = r.createTableRow(p);
      h.dataset.groupId = c.groupId, h.classList.add("group-child-row"), c.expanded || (h.style.display = "none"), s.appendChild(h);
    }
  }
  for (const c of a.ungrouped) {
    c.id && (r.recordsById[c.id] = c);
    const d = r.createTableRow(c);
    s.appendChild(d);
  }
  console.log(`[DataGrid] Rendered ${a.groups.length} groups, ${a.ungrouped.length} ungrouped`);
}
function vs(r) {
  return r.config.enableGroupedMode ? r.state.viewMode === "grouped" || r.state.viewMode === "matrix" : !1;
}
function ws(r, e) {
  r.isGroupedViewActive() && (r.state.viewMode = "flat", r.state.groupedData = null, r.pushStateToURL({ replace: !0 }), r.notify(e, "warning"), r.refresh());
}
function xs(r, e) {
  return !r.isGroupedViewActive() || ![400, 404, 405, 422].includes(e) ? !1 : (r.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function Ss(r, e) {
  if (!r.isGroupedViewActive() || e.length === 0)
    return !1;
  const t = e.filter((s) => !!s && typeof s == "object" && !Array.isArray(s));
  return t.length !== e.length || !pt(t) ? (r.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function Cs(r, e) {
  if (!r.state.groupedData) return;
  const t = String(e || "").trim();
  if (!t) return;
  const s = r.isGroupExpandedByState(t, !r.state.hasPersistedExpandState);
  r.state.expandMode === "all" ? s ? r.state.expandedGroups.add(t) : r.state.expandedGroups.delete(t) : r.state.expandMode === "none" ? s ? r.state.expandedGroups.delete(t) : r.state.expandedGroups.add(t) : (!r.state.hasPersistedExpandState && r.state.expandedGroups.size === 0 && (r.state.expandedGroups = new Set(r.state.groupedData.groups.map((o) => o.groupId))), r.state.expandedGroups.has(t) ? r.state.expandedGroups.delete(t) : r.state.expandedGroups.add(t)), r.state.hasPersistedExpandState = !0;
  const n = r.state.groupedData.groups.find((o) => o.groupId === t);
  n && (n.expanded = r.isGroupExpandedByState(t)), r.updateGroupVisibility(t), r.pushStateToURL({ replace: !0 });
}
function $s(r, e) {
  if (!r.config.enableGroupedMode)
    return;
  const t = new Set(
    (e || []).map((s) => String(s || "").trim()).filter(Boolean)
  );
  r.state.expandMode = "explicit", r.state.expandedGroups = t, r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh();
}
function Es(r) {
  r.config.enableGroupedMode && (r.state.expandMode = "all", r.state.expandedGroups.clear(), r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh());
}
function ks(r) {
  r.config.enableGroupedMode && (r.state.expandMode = "none", r.state.expandedGroups.clear(), r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh());
}
function As(r, e) {
  const t = r.tableEl?.querySelector("tbody");
  if (!t) return;
  const s = t.querySelector(`tr[data-group-id="${e}"]`);
  if (!s) return;
  const n = r.isGroupExpandedByState(e);
  s.dataset.expanded = String(n), s.setAttribute("aria-expanded", String(n));
  const o = s.querySelector(".expand-icon");
  o && (o.textContent = n ? "▼" : "▶"), t.querySelectorAll(`tr.group-child-row[data-group-id="${e}"]`).forEach((i) => {
    i.style.display = n ? "" : "none";
  });
}
function Ls(r) {
  if (r.state.groupedData)
    for (const e of r.state.groupedData.groups)
      e.expanded = r.isGroupExpandedByState(e.groupId), r.updateGroupVisibility(e.groupId);
}
function _s(r, e, t = !1) {
  const s = Z(r.state.expandMode, "explicit");
  return s === "all" ? !r.state.expandedGroups.has(e) : s === "none" ? r.state.expandedGroups.has(e) : r.state.expandedGroups.size === 0 ? t : r.state.expandedGroups.has(e);
}
function Rs(r, e) {
  if (!r.config.enableGroupedMode) {
    console.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const t = Be(e);
  r.state.viewMode = t, t === "flat" && (r.state.groupedData = null), r.pushStateToURL(), r.refresh();
}
function Ts(r) {
  return r.state.viewMode;
}
function Is(r) {
  return r.state.groupedData;
}
function Ms(r, e, t = !1) {
  if (!r.tableEl) return;
  const s = new Set(e);
  r.state.hiddenColumns.clear(), r.config.columns.forEach((a) => {
    s.has(a.field) || r.state.hiddenColumns.add(a.field);
  }), t || r.pushStateToURL(), r.tableEl.querySelectorAll("thead th[data-column]").forEach((a) => {
    const i = a.dataset.column;
    i && (a.style.display = s.has(i) ? "" : "none");
  }), r.tableEl.querySelectorAll("tbody td[data-column]").forEach((a) => {
    const i = a.dataset.column;
    i && (a.style.display = s.has(i) ? "" : "none");
  }), r.syncColumnVisibilityCheckboxes();
}
function Ps(r) {
  if (r.columnManager) {
    r.columnManager.syncWithGridState();
    return;
  }
  const e = document.querySelector(r.selectors.columnToggleMenu);
  e && r.config.columns.forEach((t) => {
    const s = e.querySelector(
      `input[data-column="${t.field}"]`
    );
    s && (s.checked = !r.state.hiddenColumns.has(t.field));
  });
}
function Bs(r, e) {
  const t = r.tableEl?.querySelector("tbody");
  if (!t) {
    console.error("[DataGrid] tbody not found!");
    return;
  }
  t.innerHTML = "";
  const s = e.data || e.records || [];
  console.log(`[DataGrid] renderData() called with ${s.length} items`), console.log("[DataGrid] First 3 items:", s.slice(0, 3));
  const n = r.getResponseTotal(e);
  if (r.state.totalRows = n ?? s.length, s.length === 0) {
    r.isGroupedViewActive() ? t.innerHTML = Kr(r.config.columns.length) : t.innerHTML = `
          <tr>
            <td colspan="${r.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
    return;
  }
  r.recordsById = {}, r.isGroupedViewActive() ? r.renderGroupedData(e, s, t) : r.renderFlatData(s, t), r.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((a) => {
    const i = a.dataset.column;
    i && r.state.hiddenColumns.has(i) && (a.style.display = "none");
  }), r.updateSelectionBindings();
}
function Ds(r, e, t) {
  e.forEach((s, n) => {
    console.log(`[DataGrid] Rendering row ${n + 1}: id=${s.id}`), s.id && (r.recordsById[s.id] = s);
    const o = r.createTableRow(s);
    t.appendChild(o);
  }), console.log(`[DataGrid] Finished appending ${e.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length);
}
function Fs(r, e) {
  const t = e.rendererOptions ?? e.renderer_options;
  return !t || typeof t != "object" || Array.isArray(t) ? {} : t;
}
function qs(r, e) {
  const t = document.createElement("tr");
  let s = ["hover:bg-gray-50"];
  r.config.rowClassProvider && (s = s.concat(r.config.rowClassProvider(e))), t.className = s.join(" ");
  const n = document.createElement("td");
  n.className = "px-6 py-4 whitespace-nowrap", n.dataset.role = "selection", n.dataset.fixed = "left", n.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${e.id}">
        <span class="sr-only">Select</span>
      </label>
    `, t.appendChild(n), r.config.columns.forEach((i) => {
    const l = document.createElement("td");
    l.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", i.field);
    const c = e[i.field], d = typeof i.renderer == "string" ? i.renderer.trim() : "", u = {
      options: r.resolveRendererOptions(i)
    };
    if (i.render)
      l.innerHTML = i.render(c, e);
    else if (r.cellRendererRegistry.has(i.field)) {
      const p = r.cellRendererRegistry.get(i.field);
      l.innerHTML = p(c, e, i.field, u);
    } else if (d && r.cellRendererRegistry.has(d)) {
      const p = r.cellRendererRegistry.get(d);
      l.innerHTML = p(c, e, i.field, u);
    } else c == null ? l.textContent = "-" : i.field.includes("_at") ? l.textContent = new Date(c).toLocaleDateString() : l.textContent = String(c);
    t.appendChild(l);
  });
  const o = r.config.actionBasePath || r.config.apiEndpoint, a = document.createElement("td");
  if (a.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", a.dataset.role = "actions", a.dataset.fixed = "right", r.config.rowActions) {
    const i = r.config.rowActions(e);
    a.innerHTML = r.actionRenderer.renderRowActions(e, i), i.forEach((l) => {
      const c = r.sanitizeActionId(l.label), d = a.querySelector(`[data-action-id="${c}"]`);
      l.disabled || d && d.addEventListener("click", async (u) => {
        if (u.preventDefault(), !d.disabled)
          try {
            await l.action(e);
          } catch (p) {
            console.error(`Action "${l.label}" failed:`, p);
            const h = p instanceof Error ? p.message : `Action "${l.label}" failed`;
            r.notify(h, "error");
          }
      });
    });
  } else if (r.config.useDefaultActions !== !1) {
    const i = [
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
    a.innerHTML = r.actionRenderer.renderRowActions(e, i), i.forEach((l) => {
      const c = r.sanitizeActionId(l.label), d = a.querySelector(`[data-action-id="${c}"]`);
      d && d.addEventListener("click", async (u) => {
        if (u.preventDefault(), u.stopPropagation(), !d.disabled)
          try {
            await l.action();
          } catch (p) {
            console.error(`Action "${l.label}" failed:`, p);
            const h = p instanceof Error ? p.message : `Action "${l.label}" failed`;
            r.notify(h, "error");
          }
      });
    });
  }
  return t.appendChild(a), t;
}
function Os(r, e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function js(r, e) {
  if (await r.confirmAction("Are you sure you want to delete this item?"))
    try {
      if (!(await I(`${r.config.apiEndpoint}/${e}`, {
        method: "DELETE",
        accept: "application/json"
      })).ok)
        throw new Error("Delete failed");
      await r.refresh();
    } catch (s) {
      console.error("Error deleting item:", s), r.showError("Failed to delete item");
    }
}
function zs(r, e) {
  const t = r.getResponseTotal(e) ?? r.state.totalRows, s = r.state.perPage * (r.state.currentPage - 1), n = t === 0 ? 0 : s + 1, o = Math.min(s + r.state.perPage, t), a = document.querySelector(r.selectors.tableInfoStart), i = document.querySelector(r.selectors.tableInfoEnd), l = document.querySelector(r.selectors.tableInfoTotal);
  a && (a.textContent = String(n)), i && (i.textContent = String(o)), l && (l.textContent = String(t)), r.renderPaginationButtons(t);
}
function Ns(r, e) {
  const t = document.querySelector(r.selectors.paginationContainer);
  if (!t) return;
  const s = Math.ceil(e / r.state.perPage);
  if (s <= 1) {
    t.innerHTML = "";
    return;
  }
  const n = [], o = r.state.currentPage;
  n.push(`
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
  const a = 5;
  let i = Math.max(1, o - Math.floor(a / 2)), l = Math.min(s, i + a - 1);
  l - i < a - 1 && (i = Math.max(1, l - a + 1));
  for (let c = i; c <= l; c++) {
    const d = c === o;
    n.push(`
        <button type="button"
                data-page="${c}"
                class="min-h-[38px] min-w-[38px] flex justify-center items-center ${d ? "bg-gray-200 text-gray-800 focus:outline-none focus:bg-gray-300" : "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"} py-2 px-3 text-sm rounded-lg">
          ${c}
        </button>
      `);
  }
  n.push(`
      <button type="button"
              data-page="${o + 1}"
              ${o === s ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), t.innerHTML = n.join(""), t.querySelectorAll("[data-page]").forEach((c) => {
    c.addEventListener("click", async () => {
      const d = parseInt(c.dataset.page || "1", 10);
      d >= 1 && d <= s && (r.state.currentPage = d, r.pushStateToURL(), r.config.behaviors?.pagination ? await r.config.behaviors.pagination.onPageChange(d, r) : await r.refresh());
    });
  });
}
class Gs {
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
    const s = this.createHeader(e.length, e.length - t.size);
    this.container.appendChild(s);
    const n = document.createElement("div");
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((a) => {
      const i = this.createColumnItem(a.field, a.label || a.field, !t.has(a.field));
      n.appendChild(i);
    }), this.container.appendChild(n);
    const o = this.createFooter();
    this.container.appendChild(o);
  }
  /**
   * Create header with search input and count badge
   */
  createHeader(e, t) {
    const s = document.createElement("div");
    s.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    o.setAttribute("class", "column-search-icon"), o.setAttribute("viewBox", "0 0 24 24"), o.setAttribute("fill", "none"), o.setAttribute("stroke", "currentColor"), o.setAttribute("stroke-width", "2");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    a.setAttribute("cx", "11"), a.setAttribute("cy", "11"), a.setAttribute("r", "8");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    i.setAttribute("d", "m21 21-4.3-4.3"), o.appendChild(a), o.appendChild(i);
    const l = document.createElement("input");
    l.type = "text", l.className = "column-search-input", l.placeholder = "Filter columns...", l.setAttribute("aria-label", "Filter columns"), this.searchInput = l, l.addEventListener("input", () => {
      this.filterColumns(l.value);
    }), n.appendChild(o), n.appendChild(l);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, s.appendChild(n), s.appendChild(c), s;
  }
  /**
   * Filter columns by search term
   */
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((n) => {
      const o = n.querySelector(".column-label")?.textContent?.toLowerCase() || "", a = t === "" || o.includes(t);
      n.style.display = a ? "" : "none";
    }), this.updateScrollShadows();
  }
  /**
   * Update the count badge
   */
  updateCountBadge() {
    if (!this.countBadgeEl) return;
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns, s = e.length - t.size;
    this.countBadgeEl.textContent = `${s} of ${e.length}`;
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
    const e = this.columnListEl, t = e.scrollTop, s = e.scrollHeight, n = e.clientHeight, o = s > n, a = o && t > 0, i = o && t + n < s - 1;
    e.classList.toggle("column-list--shadow-top", a), e.classList.toggle("column-list--shadow-bottom", i);
  }
  /**
   * Create footer with Reset to Default button
   */
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "column-reset-icon"), s.setAttribute("viewBox", "0 0 24 24"), s.setAttribute("fill", "none"), s.setAttribute("stroke", "currentColor"), s.setAttribute("stroke-width", "2"), s.setAttribute("stroke-linecap", "round"), s.setAttribute("stroke-linejoin", "round");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
    o.setAttribute("d", "M3 3v5h5"), s.appendChild(n), s.appendChild(o);
    const a = document.createElement("span");
    return a.textContent = "Reset to Default", t.appendChild(s), t.appendChild(a), t.addEventListener("click", () => {
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
  createColumnItem(e, t, s) {
    const n = `column-item-${e}`, o = `column-switch-${e}`, a = document.createElement("div");
    a.className = "column-item", a.id = n, a.dataset.column = e, a.setAttribute("role", "listitem");
    const i = document.createElement("div");
    i.className = "column-item-content";
    const l = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    l.setAttribute("class", "drag-handle"), l.setAttribute("viewBox", "0 0 20 20"), l.setAttribute("fill", "currentColor"), l.setAttribute("aria-hidden", "true"), l.setAttribute("focusable", "false"), [
      [5, 4],
      [5, 10],
      [5, 16],
      [11, 4],
      [11, 10],
      [11, 16]
    ].forEach(([w, v]) => {
      const b = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      b.setAttribute("cx", String(w)), b.setAttribute("cy", String(v)), b.setAttribute("r", "1.5"), l.appendChild(b);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, i.appendChild(l), i.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = o;
    const p = document.createElement("input");
    p.type = "checkbox", p.id = o, p.dataset.column = e, p.checked = s, p.setAttribute("role", "switch"), p.setAttribute("aria-checked", String(s)), p.setAttribute("aria-labelledby", `${n}-label`), p.setAttribute("aria-describedby", `${n}-desc`);
    const h = document.createElement("span");
    h.id = `${n}-desc`, h.className = "sr-only", h.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${s ? "visible" : "hidden"}.`;
    const f = document.createElement("span");
    return f.className = "column-switch-slider", f.setAttribute("aria-hidden", "true"), u.appendChild(p), u.appendChild(f), a.appendChild(i), a.appendChild(u), a.appendChild(h), a;
  }
  /**
   * Setup SortableJS for drag-and-drop reordering
   */
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = Kt.create(e, {
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
        const t = e.querySelectorAll(".column-item"), s = Array.from(t).map(
          (n) => n.dataset.column
        );
        this.onReorder && this.onReorder(s), this.grid.reorderColumns(s), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(s, this.grid);
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
        const s = t.dataset.column;
        if (!s) return;
        const n = t.checked;
        t.setAttribute("aria-checked", String(n));
        const o = `column-item-${s}-desc`, a = this.container.querySelector(`#${o}`);
        if (a) {
          const i = this.container.querySelector(`#column-item-${s}-label`)?.textContent || s;
          a.textContent = `Press Space or Enter to toggle ${i} column visibility. Currently ${n ? "visible" : "hidden"}.`;
        }
        this.onToggle && this.onToggle(s, n), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(s, this.grid), this.updateCountBadge();
      });
    });
  }
  /**
   * Update the switch state for a specific column
   * Called when visibility changes externally (e.g., URL restore)
   * Also updates ARIA attributes for accessibility
   */
  updateSwitchState(e, t) {
    const s = this.container.querySelector(
      `input[type="checkbox"][data-column="${e}"]`
    );
    s && (s.checked = t, s.setAttribute("aria-checked", String(t)));
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
function Hs(r, e, t, s, n) {
  const o = (a) => {
    const i = a.target;
    if (!i)
      return;
    const l = i.closest(t);
    !l || !(l instanceof HTMLElement) || s(a, l);
  };
  return r.addEventListener(e, o, n), () => r.removeEventListener(e, o, n);
}
function Us(r) {
  const e = document.querySelector(r.selectors.searchInput);
  if (!e) {
    console.warn(`[DataGrid] Search input not found: ${r.selectors.searchInput}`);
    return;
  }
  console.log(`[DataGrid] Search input bound to: ${r.selectors.searchInput}`);
  const t = document.getElementById("clear-search-btn"), s = () => {
    t && (e.value.trim() ? t.classList.remove("hidden") : t.classList.add("hidden"));
  };
  e.addEventListener("input", () => {
    s(), r.searchTimeout && clearTimeout(r.searchTimeout), r.searchTimeout = window.setTimeout(async () => {
      console.log(`[DataGrid] Search triggered: "${e.value}"`), r.state.search = e.value, r.pushStateToURL(), r.config.behaviors?.search ? await r.config.behaviors.search.onSearch(e.value, r) : (r.resetPagination(), await r.refresh());
    }, r.config.searchDelay);
  }), t && t.addEventListener("click", async () => {
    e.value = "", e.focus(), s(), r.state.search = "", r.pushStateToURL(), r.config.behaviors?.search ? await r.config.behaviors.search.onSearch("", r) : (r.resetPagination(), await r.refresh());
  }), s();
}
function Vs(r) {
  const e = document.querySelector(r.selectors.perPageSelect);
  e && e.addEventListener("change", async () => {
    r.state.perPage = parseInt(e.value, 10), r.resetPagination(), r.pushStateToURL(), await r.refresh();
  });
}
function Ks(r) {
  document.querySelectorAll(r.selectors.filterRow).forEach((t) => {
    const s = async () => {
      const n = t.dataset.filterColumn, o = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", a = t instanceof HTMLSelectElement ? "eq" : o === "" || o === "text" || o === "search" || o === "email" || o === "tel" || o === "url" ? "ilike" : "eq", i = t.dataset.filterOperator || a, l = t.value;
      if (!n) return;
      const c = r.state.filters.findIndex((d) => d.column === n);
      if (l) {
        const d = { column: n, operator: i, value: l };
        c >= 0 ? r.state.filters[c] = d : r.state.filters.push(d);
      } else
        c >= 0 && r.state.filters.splice(c, 1);
      r.pushStateToURL(), r.config.behaviors?.filter ? await r.config.behaviors.filter.onFilterChange(n, l, r) : (r.resetPagination(), await r.refresh());
    };
    t.addEventListener("input", s), t.addEventListener("change", s);
  });
}
function Js(r) {
  const e = document.querySelector(r.selectors.columnToggleBtn), t = document.querySelector(r.selectors.columnToggleMenu);
  !e || !t || (r.columnManager = new Gs({
    container: t,
    grid: r,
    onToggle: (s, n) => {
      console.log(`[DataGrid] Column ${s} visibility toggled to ${n}`);
    },
    onReorder: (s) => {
      console.log("[DataGrid] Columns reordered:", s);
    }
  }));
}
function Ys(r) {
  const e = document.querySelector(r.selectors.exportMenu);
  if (!e) return;
  const t = e.querySelectorAll("[data-export-format]");
  t.forEach((s) => {
    s.addEventListener("click", async () => {
      const n = s.dataset.exportFormat;
      if (!n || !r.config.behaviors?.export) return;
      const o = r.config.behaviors.export.getConcurrency?.() || "single", a = [];
      o === "single" ? t.forEach((d) => a.push(d)) : o === "per-format" && a.push(s);
      const i = (d) => {
        const u = d.querySelector(".export-icon"), p = d.querySelector(".export-spinner");
        u && u.classList.add("hidden"), p && p.classList.remove("hidden");
      }, l = (d) => {
        const u = d.querySelector(".export-icon"), p = d.querySelector(".export-spinner");
        u && u.classList.remove("hidden"), p && p.classList.add("hidden");
      };
      a.forEach((d) => {
        d.setAttribute("data-export-loading", "true"), d.disabled = !0, i(d);
      });
      const c = o === "none";
      c && (s.setAttribute("data-export-loading", "true"), i(s));
      try {
        await r.config.behaviors.export.export(n, r);
      } catch (d) {
        console.error("[DataGrid] Export failed:", d);
      } finally {
        a.forEach((d) => {
          d.removeAttribute("data-export-loading"), d.disabled = !1, l(d);
        }), c && (s.removeAttribute("data-export-loading"), l(s));
      }
    });
  });
}
function Qs(r) {
  if (!r.tableEl) return;
  r.tableEl.querySelectorAll("[data-sort-column]").forEach((s) => {
    s.addEventListener("click", async (n) => {
      n.preventDefault(), n.stopPropagation();
      const o = s.dataset.sortColumn;
      if (!o) return;
      console.log(`[DataGrid] Sort button clicked for field: ${o}`);
      const a = r.state.sort.find((l) => l.field === o);
      let i = null;
      a ? a.direction === "asc" ? (i = "desc", a.direction = i) : (r.state.sort = r.state.sort.filter((l) => l.field !== o), i = null, console.log(`[DataGrid] Sort cleared for field: ${o}`)) : (i = "asc", r.state.sort = [{ field: o, direction: i }]), console.log("[DataGrid] New sort state:", r.state.sort), r.pushStateToURL(), i !== null && r.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await r.config.behaviors.sort.onSort(o, i, r)) : (console.log("[DataGrid] Calling refresh() for sort"), await r.refresh()), console.log("[DataGrid] Updating sort indicators"), r.updateSortIndicators();
    });
  }), r.tableEl.querySelectorAll("[data-sort]").forEach((s) => {
    s.addEventListener("click", async () => {
      const n = s.dataset.sort;
      if (!n) return;
      const o = r.state.sort.find((i) => i.field === n);
      let a = null;
      o ? o.direction === "asc" ? (a = "desc", o.direction = a) : (r.state.sort = r.state.sort.filter((i) => i.field !== n), a = null) : (a = "asc", r.state.sort = [{ field: n, direction: a }]), r.pushStateToURL(), a !== null && r.config.behaviors?.sort ? await r.config.behaviors.sort.onSort(n, a, r) : await r.refresh(), r.updateSortIndicators();
    });
  });
}
function Ws(r) {
  if (!r.tableEl) return;
  r.tableEl.querySelectorAll("[data-sort-column]").forEach((s) => {
    const n = s.dataset.sortColumn;
    if (!n) return;
    const o = r.state.sort.find((i) => i.field === n), a = s.querySelector("svg");
    a && (o ? (s.classList.remove("opacity-0"), s.classList.add("opacity-100"), o.direction === "asc" ? (a.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', a.classList.add("text-blue-600"), a.classList.remove("text-gray-400")) : (a.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', a.classList.add("text-blue-600"), a.classList.remove("text-gray-400"))) : (a.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', a.classList.remove("text-blue-600"), a.classList.add("text-gray-400")));
  }), r.tableEl.querySelectorAll("[data-sort]").forEach((s) => {
    const n = s.dataset.sort, o = r.state.sort.find((i) => i.field === n), a = s.querySelector(".sort-indicator");
    a && (a.textContent = o ? o.direction === "asc" ? "↑" : "↓" : "");
  });
}
function Xs(r) {
  const e = document.querySelector(r.selectors.selectAllCheckbox);
  e && e.addEventListener("change", () => {
    document.querySelectorAll(r.selectors.rowCheckboxes).forEach((s) => {
      s.checked = e.checked;
      const n = s.dataset.id;
      n && (e.checked ? r.state.selectedRows.add(n) : r.state.selectedRows.delete(n));
    }), r.updateBulkActionsBar();
  }), r.updateSelectionBindings();
}
function Zs(r) {
  document.querySelectorAll(r.selectors.rowCheckboxes).forEach((t) => {
    const s = t.dataset.id;
    s && (t.checked = r.state.selectedRows.has(s)), t.addEventListener("change", () => {
      s && (t.checked ? r.state.selectedRows.add(s) : r.state.selectedRows.delete(s)), r.updateBulkActionsBar();
    });
  });
}
function en(r) {
  const t = document.getElementById("bulk-actions-overlay")?.dataset?.bulkBase || "";
  document.querySelectorAll("[data-bulk-action]").forEach((o) => {
    o.addEventListener("click", async () => {
      const a = o, i = a.dataset.bulkAction;
      if (!i) return;
      const l = Array.from(r.state.selectedRows);
      if (l.length === 0) {
        r.notify("Please select items first", "warning");
        return;
      }
      if (r.config.bulkActions) {
        const c = r.config.bulkActions.find((d) => d.id === i);
        if (c) {
          try {
            await r.actionRenderer.executeBulkAction(c, l), r.state.selectedRows.clear(), r.updateBulkActionsBar(), await r.refresh();
          } catch (d) {
            console.error("Bulk action failed:", d), r.showError("Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const c = `${t}/${i}`, d = a.dataset.bulkConfirm, u = r.parseDatasetStringArray(a.dataset.bulkPayloadRequired), p = r.parseDatasetObject(a.dataset.bulkPayloadSchema), h = {
          id: i,
          label: a.textContent?.trim() || i,
          endpoint: c,
          confirm: d,
          payloadRequired: u,
          payloadSchema: p
        };
        try {
          await r.actionRenderer.executeBulkAction(h, l), r.state.selectedRows.clear(), r.updateBulkActionsBar(), await r.refresh();
        } catch (f) {
          console.error("Bulk action failed:", f), r.showError("Bulk action failed");
        }
        return;
      }
      if (r.config.behaviors?.bulkActions)
        try {
          await r.config.behaviors.bulkActions.execute(i, l, r), r.state.selectedRows.clear(), r.updateBulkActionsBar();
        } catch (c) {
          console.error("Bulk action failed:", c), r.showError("Bulk action failed");
        }
    });
  });
  const n = document.getElementById("clear-selection-btn");
  n && n.addEventListener("click", () => {
    r.state.selectedRows.clear(), r.updateBulkActionsBar(), document.querySelectorAll(".table-checkbox").forEach((i) => i.checked = !1);
    const a = document.querySelector(r.selectors.selectAllCheckbox);
    a && (a.checked = !1);
  }), r.bindOverflowMenu();
}
function tn(r) {
  const e = document.getElementById("bulk-more-btn"), t = document.getElementById("bulk-overflow-menu");
  !e || !t || (e.addEventListener("click", (s) => {
    s.stopPropagation(), t.classList.toggle("hidden");
  }), document.addEventListener("click", () => {
    t.classList.add("hidden");
  }), document.addEventListener("keydown", (s) => {
    s.key === "Escape" && t.classList.add("hidden");
  }), t.addEventListener("click", (s) => {
    s.stopPropagation();
  }));
}
function rn(r) {
  const e = document.getElementById("bulk-actions-overlay"), t = document.getElementById("selected-count"), s = r.state.selectedRows.size;
  if (console.log("[DataGrid] updateBulkActionsBar - overlay:", e, "countEl:", t, "count:", s), !e || !t) {
    console.error("[DataGrid] Missing bulk actions elements!");
    return;
  }
  t.textContent = String(s), s > 0 ? (e.classList.remove("hidden"), e.offsetHeight) : e.classList.add("hidden");
}
function sn(r) {
  const e = document.getElementById("bulk-clear-selection");
  console.log("[DataGrid] Binding clear button:", e), e ? e.addEventListener("click", () => {
    console.log("[DataGrid] Clear button clicked!"), r.clearSelection();
  }) : console.error("[DataGrid] Clear button not found!");
}
function nn(r) {
  console.log("[DataGrid] Clearing selection..."), r.state.selectedRows.clear();
  const e = document.querySelector(r.selectors.selectAllCheckbox);
  e && (e.checked = !1), r.updateBulkActionsBar(), r.updateSelectionBindings();
}
function on(r, e, t) {
  const s = e.getBoundingClientRect(), n = t.offsetHeight || 300, a = window.innerHeight - s.bottom, i = s.top, l = a < n && i > a, c = s.right - (t.offsetWidth || 224);
  t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${s.top - n - 8}px`, t.style.bottom = "auto") : (t.style.top = `${s.bottom + 8}px`, t.style.bottom = "auto");
}
function an(r) {
  r.dropdownAbortController && r.dropdownAbortController.abort(), r.dropdownAbortController = new AbortController();
  const { signal: e } = r.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
    const s = t.dataset.dropdownToggle, n = document.getElementById(s || "");
    n && !n.classList.contains("hidden") && n.classList.add("hidden");
  }), Hs(document, "click", "[data-dropdown-toggle]", (t, s) => {
    t.stopPropagation();
    const n = s.dataset.dropdownToggle, o = document.getElementById(n || "");
    o && (document.querySelectorAll("[data-dropdown-toggle]").forEach((a) => {
      const i = a.dataset.dropdownToggle, l = document.getElementById(i || "");
      l && l !== o && l.classList.add("hidden");
    }), o.classList.toggle("hidden"));
  }, { signal: e }), document.addEventListener("click", (t) => {
    const s = t.target.closest("[data-dropdown-trigger]");
    if (s) {
      t.stopPropagation();
      const o = s.closest("[data-dropdown]")?.querySelector(".actions-menu");
      document.querySelectorAll(".actions-menu").forEach((i) => {
        i !== o && i.classList.add("hidden");
      });
      const a = o?.classList.contains("hidden");
      o?.classList.toggle("hidden"), s.setAttribute("aria-expanded", a ? "true" : "false"), a && o && r.positionDropdownMenu(s, o);
    } else
      t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
        (o) => o.classList.add("hidden")
      ), document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
        const a = o.dataset.dropdownToggle, i = document.getElementById(a || "");
        i && i.classList.add("hidden");
      }));
  }, { signal: e }), document.addEventListener("keydown", (t) => {
    t.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((s) => {
      s.classList.add("hidden");
      const n = s.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
      n && n.setAttribute("aria-expanded", "false");
    }), document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
      const n = s.dataset.dropdownToggle, o = document.getElementById(n || "");
      o && o.classList.add("hidden");
    }));
  }, { signal: e });
}
function ln(r, e) {
  console.error(e), r.notifier.error(e);
}
function cn(r, e, t) {
  r.notifier.show({ message: e, type: t });
}
async function dn(r, e) {
  return r.notifier.confirm(e);
}
async function un(r, e) {
  return e instanceof Response ? st(e) : e instanceof Error ? e.message : "An unexpected error occurred";
}
function pn(r, e) {
  if (e)
    try {
      const t = JSON.parse(e);
      if (!Array.isArray(t))
        return;
      const s = t.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
      return s.length > 0 ? s : void 0;
    } catch (t) {
      console.warn("[DataGrid] Failed to parse bulk payload_required:", t);
      return;
    }
}
function hn(r, e) {
  if (e)
    try {
      const t = JSON.parse(e);
      return !t || typeof t != "object" || Array.isArray(t) ? void 0 : t;
    } catch (t) {
      console.warn("[DataGrid] Failed to parse bulk payload_schema:", t);
      return;
    }
}
function fn(r, e) {
  if (!r.tableEl) return;
  const t = r.mergeColumnOrder(e);
  r.state.columnOrder = t;
  const s = new Map(r.config.columns.map((n) => [n.field, n]));
  r.config.columns = t.map((n) => s.get(n)).filter((n) => n !== void 0), r.reorderTableColumns(t), r.persistStateSnapshot(), console.log("[DataGrid] Columns reordered:", t);
}
function gn(r) {
  r.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), r.config.columns = r.defaultColumns.map((t) => ({ ...t })), r.state.columnOrder = r.config.columns.map((t) => t.field);
  const e = r.config.columns.filter((t) => !t.hidden).map((t) => t.field);
  r.tableEl ? (r.reorderTableColumns(r.state.columnOrder), r.updateColumnVisibility(e)) : (r.state.hiddenColumns = new Set(
    r.config.columns.filter((t) => t.hidden).map((t) => t.field)
  ), r.persistStateSnapshot()), r.columnManager && (r.columnManager.refresh(), r.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
}
function mn(r, e) {
  const t = new Set(r.config.columns.map((a) => a.field)), s = new Set(e), n = e.filter((a) => t.has(a)), o = r.config.columns.map((a) => a.field).filter((a) => !s.has(a));
  return [...n, ...o];
}
function bn(r, e) {
  if (!r.tableEl) return;
  const t = r.tableEl.querySelector("thead tr:first-child");
  t && r.reorderRowCells(t, e, "th");
  const s = r.tableEl.querySelector("#filter-row");
  s && r.reorderRowCells(s, e, "th"), r.tableEl.querySelectorAll("tbody tr").forEach((o) => {
    r.reorderRowCells(o, e, "td");
  });
}
function yn(r, e, t, s) {
  const n = Array.from(e.querySelectorAll(`${s}[data-column]`)), o = new Map(
    n.map((d) => [d.dataset.column, d])
  ), a = Array.from(e.querySelectorAll(s)), i = e.querySelector(`${s}[data-role="selection"]`) || a.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${s}[data-role="actions"]`) || a.find(
    (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
  ), c = [];
  i && c.push(i), t.forEach((d) => {
    const u = o.get(d);
    u && c.push(u);
  }), l && c.push(l), c.forEach((d) => {
    e.appendChild(d);
  });
}
const k = class k {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new W(), this.selectors = {
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
    this.stateStore = this.config.stateStore || $r({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const s = this.stateStore.loadPersistedState(), n = new Set(this.config.columns.map((x) => x.field)), o = new Set(
      this.config.columns.filter((x) => x.hidden).map((x) => x.field)
    ), a = !!s && Array.isArray(s.hiddenColumns);
    this.hasPersistedHiddenColumnState = a;
    const i = new Set(
      (s?.hiddenColumns || []).filter((x) => n.has(x))
    ), l = this.config.columns.map((x) => x.field), c = !!s && Array.isArray(s.columnOrder) && s.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = c;
    const d = (s?.columnOrder || []).filter((x) => n.has(x)), u = c ? [...d, ...l.filter((x) => !d.includes(x))] : l, p = this.config.enableGroupedMode ? qr(t) : !1, h = this.config.enableGroupedMode ? jr(t) : null, f = this.config.enableGroupedMode ? Fr(t) : "explicit", w = this.config.enableGroupedMode ? Dr(t) : /* @__PURE__ */ new Set(), v = Z(
      s?.expandMode,
      f
    ), b = new Set(
      (s?.expandedGroups || Array.from(w)).map((x) => String(x).trim()).filter(Boolean)
    ), E = this.config.enableGroupedMode ? s?.expandMode !== void 0 || b.size > 0 || p : !1, A = (this.config.enableGroupedMode ? s?.viewMode || h : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: a ? i : o,
      columnOrder: u,
      viewMode: A,
      expandMode: v,
      groupedData: null,
      expandedGroups: b,
      hasPersistedExpandState: E
    }, this.actionRenderer = new Yt({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
    }), this.cellRendererRegistry = new fr(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([x, z]) => {
      this.cellRendererRegistry.register(x, z);
    }), this.defaultColumns = this.config.columns.map((x) => ({ ...x }));
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
    return Qr(this);
  }
  parseJSONArray(e, t) {
    return Wr(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    Xr(this, e, t);
  }
  applyShareStateSnapshot(e) {
    Zr(this, e);
  }
  buildPersistedStateSnapshot() {
    return es(this);
  }
  buildShareStateSnapshot() {
    return ts(this);
  }
  persistStateSnapshot() {
    rs(this);
  }
  restoreStateFromURL() {
    ss(this);
  }
  applyRestoredState() {
    ns(this);
  }
  pushStateToURL(e = {}) {
    os(this, e);
  }
  syncURL() {
    this.pushStateToURL();
  }
  async refresh() {
    return is(this);
  }
  buildApiUrl() {
    return ls(this);
  }
  buildQueryString() {
    return cs(this);
  }
  buildQueryParams() {
    return ds(this);
  }
  getResponseTotal(e) {
    return us(this, e);
  }
  normalizePagination(e) {
    return ps(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    Ms(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    Ps(this);
  }
  renderData(e) {
    Bs(this, e);
  }
  renderFlatData(e, t) {
    Ds(this, e, t);
  }
  renderGroupedData(e, t, s) {
    ys(this, e, t, s);
  }
  isGroupedViewActive() {
    return vs(this);
  }
  fallbackGroupedMode(e) {
    ws(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return xs(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return Ss(this, e);
  }
  toggleGroup(e) {
    Cs(this, e);
  }
  setExpandedGroups(e) {
    $s(this, e);
  }
  expandAllGroups() {
    Es(this);
  }
  collapseAllGroups() {
    ks(this);
  }
  updateGroupVisibility(e) {
    As(this, e);
  }
  updateGroupedRowsFromState() {
    Ls(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return _s(this, e, t);
  }
  setViewMode(e) {
    Rs(this, e);
  }
  getViewMode() {
    return Ts(this);
  }
  getGroupedData() {
    return Is(this);
  }
  async fetchDetail(e) {
    return hs(this, e);
  }
  getSchema() {
    return gs(this);
  }
  getForm() {
    return ms(this);
  }
  getTabs() {
    return bs(this);
  }
  normalizeDetailResponse(e) {
    return fs(this, e);
  }
  resolveRendererOptions(e) {
    return Fs(this, e);
  }
  createTableRow(e) {
    return qs(this, e);
  }
  sanitizeActionId(e) {
    return Os(this, e);
  }
  async handleDelete(e) {
    return js(this, e);
  }
  updatePaginationUI(e) {
    zs(this, e);
  }
  renderPaginationButtons(e) {
    Ns(this, e);
  }
  bindSearchInput() {
    Us(this);
  }
  bindPerPageSelect() {
    Vs(this);
  }
  bindFilterInputs() {
    Ks(this);
  }
  bindColumnVisibility() {
    Js(this);
  }
  bindExportButtons() {
    Ys(this);
  }
  bindSorting() {
    Qs(this);
  }
  updateSortIndicators() {
    Ws(this);
  }
  bindSelection() {
    Xs(this);
  }
  updateSelectionBindings() {
    Zs(this);
  }
  bindBulkActions() {
    en(this);
  }
  bindOverflowMenu() {
    tn();
  }
  updateBulkActionsBar() {
    rn(this);
  }
  bindBulkClearButton() {
    sn(this);
  }
  clearSelection() {
    nn(this);
  }
  positionDropdownMenu(e, t) {
    on(this, e, t);
  }
  bindDropdownToggles() {
    an(this);
  }
  showError(e) {
    ln(this, e);
  }
  notify(e, t) {
    cn(this, e, t);
  }
  async confirmAction(e) {
    return dn(this, e);
  }
  async extractError(e) {
    return un(this, e);
  }
  parseDatasetStringArray(e) {
    return pn(this, e);
  }
  parseDatasetObject(e) {
    return hn(this, e);
  }
  reorderColumns(e) {
    fn(this, e);
  }
  resetColumnsToDefault() {
    gn(this);
  }
  mergeColumnOrder(e) {
    return mn(this, e);
  }
  reorderTableColumns(e) {
    bn(this, e);
  }
  reorderRowCells(e, t, s) {
    yn(this, e, t, s);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), console.log("[DataGrid] Instance destroyed");
  }
};
k.URL_KEY_SEARCH = V, k.URL_KEY_PAGE = K, k.URL_KEY_PER_PAGE = J, k.URL_KEY_FILTERS = Y, k.URL_KEY_SORT = Q, k.URL_KEY_STATE = ae, k.URL_KEY_HIDDEN_COLUMNS = De, k.URL_KEY_VIEW_MODE = ie, k.URL_KEY_EXPANDED_GROUPS = se, k.MANAGED_URL_KEYS = Fe, k.DEFAULT_MAX_URL_LENGTH = Ct, k.DEFAULT_MAX_FILTERS_LENGTH = $t;
let Ae = k;
typeof window < "u" && (window.DataGrid = Ae);
const Je = {
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
class za {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new W();
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
        const s = JSON.parse(t);
        this.criteria = s.map((n) => ({
          field: n.column,
          operator: n.operator || "ilike",
          value: n.value,
          logic: "and"
          // Default logic connector
        })), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria);
      } catch (s) {
        console.warn("[AdvancedSearch] Failed to parse filters from URL:", s);
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
    const t = document.getElementById("advanced-search-close"), s = document.getElementById("advanced-search-cancel"), n = document.getElementById("advanced-search-overlay");
    t?.addEventListener("click", () => this.close()), s?.addEventListener("click", () => this.close()), n?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
    const i = document.getElementById("save-search-preset-btn"), l = document.getElementById("load-search-preset-btn");
    i?.addEventListener("click", () => this.savePreset()), l?.addEventListener("click", () => this.loadPreset());
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
      const s = document.createElement("div"), n = this.createCriterionRow(e, t);
      if (s.appendChild(n), t < this.criteria.length - 1) {
        const o = this.createLogicConnector(t);
        s.appendChild(o);
      }
      this.container.appendChild(s);
    }));
  }
  createCriterionRow(e, t) {
    const s = document.createElement("div");
    s.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((o) => o.name === e.field) || this.config.fields[0];
    return s.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((o) => `
          <option value="${o.name}" ${o.name === e.field ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(n).map((o) => `
          <option value="${o.value}" ${o.value === e.operator ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(n, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, s.querySelectorAll("select, input").forEach((o) => {
      o.addEventListener("change", (a) => this.updateCriterion(a.target));
    }), s.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), s;
  }
  createValueInput(e, t, s) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${s}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((o) => `
            <option value="${o.value}" ${o.value === t.value ? "selected" : ""}>${o.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-criterion-index="${s}"
             data-criterion-part="value"
             value="${t.value}"
             placeholder="Enter value..."
             class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
    `;
  }
  createLogicConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center gap-2 py-2";
    const s = this.criteria[e].logic || "and";
    return t.innerHTML = `
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded border ${s === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        And
      </button>
      <button type="button"
              data-logic-index="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded border ${s === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        Or
      </button>
    `, t.querySelectorAll("[data-logic-index]").forEach((n) => {
      n.addEventListener("click", (o) => {
        const a = o.target, i = parseInt(a.dataset.logicIndex || "0", 10), l = a.dataset.logicValue;
        this.criteria[i].logic = l, this.renderCriteria();
      });
    }), t;
  }
  updateCriterion(e) {
    const t = parseInt(e.dataset.criterionIndex || "0", 10), s = e.dataset.criterionPart;
    if (!this.criteria[t]) return;
    const n = e.value;
    s === "field" ? (this.criteria[t].field = n, this.renderCriteria()) : s === "operator" ? this.criteria[t].operator = n : s === "value" && (this.criteria[t].value = n);
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Je[e.type] || Je.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Ge({
      title: "Save Search Preset",
      label: "Preset name",
      placeholder: "e.g. Active users filter",
      confirmLabel: "Save",
      onConfirm: (t) => {
        const s = this.loadPresetsFromStorage();
        s[t] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(s)), this.notifier.success(`Preset "${t}" saved!`);
      }
    }).show();
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    new Ge({
      title: "Load Search Preset",
      label: `Available presets: ${t.join(", ")}`,
      placeholder: "Enter preset name",
      confirmLabel: "Load",
      onConfirm: (n) => {
        if (!e[n]) {
          this.notifier.warning(`Preset "${n}" not found.`);
          return;
        }
        this.criteria = e[n], this.renderCriteria();
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
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), s = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), s && s.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), s && s.classList.remove("hidden"), this.criteria.forEach((n, o) => {
        const a = this.createChip(n, o);
        e.appendChild(a);
      });
    }
  }
  /**
   * Create a single filter chip
   */
  createChip(e, t) {
    const s = document.createElement("div");
    s.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200";
    const o = this.config.fields.find((l) => l.name === e.field)?.label || e.field, a = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    s.innerHTML = `
      <span>${o} ${a} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const i = s.querySelector("[data-chip-index]");
    return i && i.addEventListener("click", () => {
      this.removeChip(t);
    }), s;
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
const Ye = {
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
class Na {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new W(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    t && t.addEventListener("click", () => this.clearFilters()), this.overlay && this.overlay.addEventListener("click", () => this.close()), document.addEventListener("keydown", (s) => {
      s.key === "Escape" && !this.panel.classList.contains("hidden") && this.close();
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
    const e = document.getElementById("add-group-btn"), t = document.getElementById("apply-filter-btn"), s = document.getElementById("clear-all-btn"), n = document.getElementById("save-filter-btn");
    e && e.addEventListener("click", () => this.addGroup()), t && t.addEventListener("click", () => this.applyFilters()), s && s.addEventListener("click", () => this.clearAll()), n && n.addEventListener("click", () => this.saveFilter());
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
      const s = this.createGroupElement(e, t);
      if (this.container.appendChild(s), t < this.structure.groups.length - 1) {
        const n = this.createGroupConnector(t);
        this.container.appendChild(n);
      }
    }), this.updatePreview());
  }
  createGroupElement(e, t) {
    const s = document.createElement("div");
    s.className = "border border-gray-200 rounded-lg p-3 bg-gray-50";
    const n = document.createElement("div");
    n.className = "flex justify-end mb-2", n.innerHTML = `
      <button type="button" data-remove-group="${t}" class="text-xs text-red-600 hover:text-red-800">
        Remove group
      </button>
    `, s.appendChild(n), e.conditions.forEach((a, i) => {
      const l = this.createConditionElement(a, t, i);
      if (s.appendChild(l), i < e.conditions.length - 1) {
        const c = this.createConditionConnector(t, i, e.logic);
        s.appendChild(c);
      }
    });
    const o = document.createElement("button");
    return o.type = "button", o.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", o.dataset.addCondition = String(t), o.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, s.appendChild(o), this.bindGroupEvents(s, t), s;
  }
  createConditionElement(e, t, s) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const o = this.config.fields.find((a) => a.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${s}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((a) => `
          <option value="${a.name}" ${a.name === e.field ? "selected" : ""}>${a.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${s}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(o).map((a) => `
          <option value="${a.value}" ${a.value === e.operator ? "selected" : ""}>${a.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(o, e, t, s)}

      <button type="button" data-remove-cond="${t}-${s}" class="text-red-600 hover:text-red-800">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>

      <button type="button" data-add-cond-or="${t}-${s}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add OR condition">
        OR
      </button>

      <button type="button" data-add-cond-and="${t}-${s}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add AND condition">
        AND
      </button>
    `, n;
  }
  renderValueInput(e, t, s, n) {
    return e.type === "select" && e.options ? `
        <select data-cond="${s}-${n}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${e.options.map((a) => `
            <option value="${a.value}" ${a.value === t.value ? "selected" : ""}>${a.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-cond="${s}-${n}-value"
             value="${t.value || ""}"
             placeholder="Enter value..."
             class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  createConditionConnector(e, t, s) {
    const n = document.createElement("div");
    return n.className = "flex items-center justify-center my-1", n.innerHTML = `
      <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">
        ${s.toUpperCase()}
      </span>
    `, n;
  }
  createGroupConnector(e) {
    const t = document.createElement("div");
    t.className = "flex items-center justify-center py-2";
    const s = this.structure.groupLogic[e] || "and";
    return t.innerHTML = `
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded-l border ${s === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        AND
      </button>
      <button type="button"
              data-group-logic="${e}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded-r border ${s === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
        OR
      </button>
    `, t.querySelectorAll("[data-group-logic]").forEach((n) => {
      n.addEventListener("click", (o) => {
        const a = o.target, i = parseInt(a.dataset.groupLogic || "0", 10), l = a.dataset.logicValue;
        this.structure.groupLogic[i] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const s = e.querySelector(`[data-remove-group="${t}"]`);
    s && s.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((o) => {
      const a = o, [i, l, c] = a.dataset.cond.split("-"), d = parseInt(i, 10), u = parseInt(l, 10);
      a.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[u].field = a.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[u].operator = a.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[u].value = a.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((o) => {
      o.addEventListener("click", (a) => {
        const l = a.target.closest("[data-remove-cond]");
        if (!l) return;
        const [c, d] = l.dataset.removeCond.split("-").map(Number);
        this.removeCondition(c, d);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((o) => {
      o.addEventListener("click", (a) => {
        const i = a.target, l = i.dataset.addCondOr !== void 0, c = l ? i.dataset.addCondOr : i.dataset.addCondAnd;
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
    const s = this.structure.groups[e];
    s.conditions.splice(t, 1), s.conditions.length === 0 ? this.removeGroup(e) : this.render();
  }
  removeGroup(e) {
    this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.length > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 ? this.addGroup() : this.render();
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Ye[e.type] || Ye.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || "No filters applied"), this.previewElement && (this.previewElement.textContent = t);
    const s = document.getElementById("applied-filter-preview");
    s && (this.hasActiveFilters() ? s.classList.remove("hidden") : s.classList.add("hidden"));
  }
  hasActiveFilters() {
    return this.structure.groups.some(
      (e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0)
    );
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t) => {
      const s = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const o = n.operator.toUpperCase(), a = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${o === "ILIKE" ? "ILIKE" : o === "EQ" ? "=" : o} ${a}`;
      });
      return s.length === 0 ? "" : s.length === 1 ? s[0] : `( ${s.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, s, n) => {
      if (n === 0) return s;
      const o = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${o.toUpperCase()} ${s}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const s = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const o = this.config.fields.find((l) => l.name === n.field), a = o?.label || n.field, i = this.getOperatorsForField(o).find((l) => l.value === n.operator)?.label || n.operator;
        return `${a} ${i} "${n.value}"`;
      });
      return s.length === 0 ? "" : s.length === 1 ? s[0] : `( ${s.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, s, n) => {
      if (n === 0) return s;
      const o = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${o.toUpperCase()} ${s}`;
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
    const s = this.getSavedFilters();
    s[t] = this.structure, localStorage.setItem("saved_filters", JSON.stringify(s)), this.notifier.success(`Filter "${t}" saved!`), e && (e.value = "");
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
        const s = JSON.parse(t);
        Array.isArray(s) && s.length > 0 && (this.structure = this.convertLegacyFilters(s), this.render());
      } catch (s) {
        console.warn("[FilterBuilder] Failed to parse filters from URL:", s);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((n) => {
      const o = n.column;
      t.has(o) || t.set(o, []), t.get(o).push(n);
    });
    const s = [];
    return t.forEach((n) => {
      s.push({
        conditions: n.map((o) => ({
          field: o.column,
          operator: o.operator || "ilike",
          value: o.value
        })),
        logic: n.length > 1 ? "or" : "and"
      });
    }), {
      groups: s,
      groupLogic: new Array(s.length - 1).fill("and")
    };
  }
  getStructure() {
    return this.structure;
  }
  setStructure(e) {
    this.structure = e, this.render();
  }
}
class Ga {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0)
      throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "")
      return {};
    const t = {}, s = e.trim();
    return this.searchableFields.forEach((n) => {
      t[`${n}__ilike`] = `%${s}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
class Ha {
  buildFilters(e) {
    const t = {}, s = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "")
        return;
      const o = n.operator || "eq", a = n.column;
      s.has(a) || s.set(a, { operator: o, values: [] }), s.get(a).values.push(n.value);
    }), s.forEach((n, o) => {
      if (n.values.length === 1) {
        const a = n.operator === "eq" ? o : `${o}__${n.operator}`;
        t[a] = n.values[0];
      } else
        n.operator === "ilike" ? t[`${o}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${o}__in`] = n.values.join(",") : t[`${o}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, s) {
    s.resetPagination(), await s.refresh();
  }
}
class Ua {
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
class Va {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((s) => `${s.field} ${s.direction}`).join(",") };
  }
  async onSort(e, t, s) {
    await s.refresh();
  }
}
class Ka {
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
    const s = vn(t, this.config, e);
    s.delivery = wn(this.config, e);
    let n;
    try {
      n = await I(this.getEndpoint(), {
        method: "POST",
        json: s,
        headers: {
          Accept: "application/json,application/octet-stream"
        }
      });
    } catch (o) {
      const a = o instanceof Error ? o.message : "Network error during export";
      throw D(t, "error", a), o;
    }
    if (n.status === 202) {
      const o = await n.json().catch(() => ({}));
      D(t, "info", "Export queued. You can download it when ready.");
      const a = o?.status_url || "";
      if (a) {
        const i = Cn(o, a);
        try {
          await $n(a, {
            intervalMs: xn(this.config),
            timeoutMs: Sn(this.config)
          });
          const l = await I(i, {
            method: "GET",
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await Le(l);
            throw D(t, "error", c), new Error(c);
          }
          await We(l, s.definition || s.resource || "export", s.format), D(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw D(t, "error", c), l;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const o = await Le(n);
      throw D(t, "error", o), new Error(o);
    }
    await We(n, s.definition || s.resource || "export", s.format), D(t, "success", "Export ready.");
  }
}
function vn(r, e, t) {
  const s = In(t), n = kn(r, e), o = An(r, e), a = Ln(r), i = _n(a), l = {
    format: s,
    query: i,
    selection: n,
    columns: o,
    delivery: e.delivery || "auto"
  };
  e.definition && (l.definition = e.definition), e.resource && (l.resource = e.resource);
  const c = e.sourceVariant || e.variant;
  return c && (l.source_variant = c), l;
}
function wn(r, e) {
  return r.delivery ? r.delivery : (r.asyncFormats && r.asyncFormats.length > 0 ? r.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function xn(r) {
  const e = Number(r.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function Sn(r) {
  const e = Number(r.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function Cn(r, e) {
  return r?.download_url ? r.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function $n(r, e) {
  const t = Date.now(), s = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await I(r, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const i = await Le(n);
      throw new Error(i);
    }
    const o = await n.json().catch(() => ({})), a = String(o?.state || "").toLowerCase();
    if (a === "completed")
      return o;
    if (a === "failed")
      throw new Error("Export failed");
    if (a === "canceled")
      throw new Error("Export canceled");
    if (a === "deleted")
      throw new Error("Export deleted");
    if (e.timeoutMs > 0 && Date.now() - t > e.timeoutMs)
      throw new Error("Export status timed out");
    await En(s);
  }
}
function En(r) {
  return new Promise((e) => setTimeout(e, r));
}
function kn(r, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(r.state.selectedRows || []), s = t.length > 0 ? "ids" : "all";
  return {
    mode: s,
    ids: s === "ids" ? t : []
  };
}
function An(r, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = r.state?.hiddenColumns ? new Set(r.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(r.state?.columnOrder) && r.state.columnOrder.length > 0 ? r.state.columnOrder : r.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function Ln(r) {
  const e = {}, t = r.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(r.state.currentPage, r.state.perPage)), r.state.search && t.search && Object.assign(e, t.search.buildQuery(r.state.search)), r.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(r.state.filters)), r.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(r.state.sort)), e;
}
function _n(r) {
  const e = {}, t = [];
  return Object.entries(r).forEach(([s, n]) => {
    if (n == null || n === "")
      return;
    switch (s) {
      case "limit":
        e.limit = Qe(n);
        return;
      case "offset":
        e.offset = Qe(n);
        return;
      case "order":
      case "sort":
        e.sort = Tn(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: o, op: a } = Rn(s);
    o && t.push({ field: o, op: a, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function Rn(r) {
  const e = r.split("__"), t = e[0]?.trim() || "", s = e[1]?.trim() || "eq";
  return { field: t, op: s };
}
function Tn(r) {
  return r ? r.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), s = t[0] || "", n = t[1] || "asc";
    return { field: s, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function In(r) {
  const e = String(r || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function Qe(r) {
  const e = Number(r);
  return Number.isFinite(e) ? e : 0;
}
async function We(r, e, t) {
  const s = await r.blob(), n = Mn(r, e, t), o = URL.createObjectURL(s), a = document.createElement("a");
  a.href = o, a.download = n, a.rel = "noopener", document.body.appendChild(a), a.click(), a.remove(), URL.revokeObjectURL(o);
}
function Mn(r, e, t) {
  const s = r.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return Pn(s) || n;
}
function Pn(r) {
  if (!r) return null;
  const e = r.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = r.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function Le(r) {
  if ((r.headers.get("content-type") || "").includes("application/json")) {
    const s = await r.json().catch(() => ({}));
    if (s?.error?.message)
      return s.error.message;
    if (s?.message)
      return s.message;
  }
  const t = await r.text().catch(() => "");
  return t || `Export failed (${r.status})`;
}
function D(r, e, t) {
  const s = r.config.notifier;
  if (s && typeof s[e] == "function") {
    s[e](t);
    return;
  }
  const n = window.toastManager;
  if (n && typeof n[e] == "function") {
    n[e](t);
    return;
  }
  e === "error" && alert(t);
}
class Ja {
  constructor(e) {
    this.baseEndpoint = e;
  }
  getActionEndpoint(e) {
    return `${this.getPluralEndpoint()}/bulk/${e}`;
  }
  getPluralEndpoint() {
    return this.baseEndpoint.endsWith("s") ? this.baseEndpoint : `${this.baseEndpoint}s`;
  }
  async execute(e, t, s) {
    const n = this.getActionEndpoint(e), o = await I(n, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!o.ok) {
      const a = await as(o, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${a}`);
    }
    await s.refresh();
  }
}
function Bn(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function Dn(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function Et(r) {
  return typeof r == "object" && r !== null && "version" in r && r.version === 2;
}
class Fn {
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
    const s = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((i) => i.field === e ? !s : !t.state.hiddenColumns.has(i.field)).map((i) => i.field), o = {};
    t.config.columns.forEach((i) => {
      o[i.field] = n.includes(i.field);
    });
    const a = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: o,
      order: a.length > 0 ? a : void 0
    }), t.updateColumnVisibility(n);
  }
  /**
   * Reorder columns and persist to storage
   * Stores both visibility and order in V2 format
   */
  reorderColumns(e, t) {
    const s = {};
    t.config.columns.forEach((n) => {
      s[n.field] = !t.state.hiddenColumns.has(n.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: s,
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
      const s = new Set(e), n = t.order.filter((o) => s.has(o));
      return this.cachedOrder = n, console.log("[ColumnVisibility] Order loaded from cache:", n), n;
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
      const s = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([o, a]) => {
        !a && s.has(o) && n.add(o);
      }), n;
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
      if (Et(t))
        return t;
      const n = {
        version: 2,
        visibility: t
        // order is undefined - will be populated on first reorder
      };
      return console.log("[ColumnVisibility] Migrating V1 prefs to V2 format"), this.savePrefs(n), n;
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
class Ya extends Fn {
  constructor(e, t) {
    const s = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, s), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = Bn(t.basePath), o = Dn(t.apiBasePath);
    t.preferencesEndpoint ? this.preferencesEndpoint = t.preferencesEndpoint : o ? this.preferencesEndpoint = `${o}/panels/preferences` : n ? this.preferencesEndpoint = `${n}/api/panels/preferences` : this.preferencesEndpoint = "/api/panels/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
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
      const e = await I(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      if (!e.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", e.status), null;
      const s = (await e.json()).records || [];
      if (s.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const n = s[0]?.raw;
      if (!n || !n[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const o = n[this.serverPrefsKey];
      return Et(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
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
      const s = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([a, i]) => {
        i || s.add(a);
      });
      const n = new Set(e), o = (t.order || []).filter((a) => n.has(a));
      return {
        hiddenColumns: s,
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
    e.config.columns.forEach((n) => {
      t[n.field] = !e.state.hiddenColumns.has(n.field);
    });
    const s = {
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
        json: {
          raw: {
            [this.serverPrefsKey]: s
          }
        }
      });
      if (!n.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", n.status);
        return;
      }
      this.serverPrefs = s, console.log("[ServerColumnVisibility] Synced prefs to server:", s);
    } catch (n) {
      console.warn("[ServerColumnVisibility] Error syncing to server:", n);
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
      const e = await I(this.preferencesEndpoint, {
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
const qn = {
  async prompt(r) {
    const { PayloadInputModal: e } = await import("../chunks/payload-modal-2KQOIFny.js");
    return e.prompt(r);
  }
}, Xe = {
  view: 100,
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
}, On = 5e3;
class jn {
  constructor(e) {
    this.seenActions = /* @__PURE__ */ new Set(), this.config = {
      useDefaultFallback: !0,
      appendDefaultActions: !1,
      actionContext: "row",
      ...e
    };
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
    const s = [];
    let n = 0;
    const o = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const a of t) {
        if (!a.name || !this.shouldIncludeAction(e, a)) continue;
        const i = a.name.toLowerCase();
        if (this.seenActions.has(i)) continue;
        this.seenActions.add(i);
        const l = this.resolveRecordActionState(e, a.name), c = this.buildActionFromSchema(e, a, o, l);
        c && s.push({
          action: c,
          name: a.name,
          order: this.resolveActionOrder(a.name, a.order),
          insertionIndex: n++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(s, e, o, n);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(s, e, o, n);
    return s.sort((a, i) => a.order !== i.order ? a.order - i.order : a.insertionIndex - i.insertionIndex), s.map((a) => a.action);
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
    const s = e.toLowerCase();
    return this.config.actionOrderOverride?.[s] !== void 0 ? this.config.actionOrderOverride[s] : Xe[s] !== void 0 ? Xe[s] : On;
  }
  /**
   * Build a single action from schema definition
   */
  buildActionFromSchema(e, t, s, n) {
    const o = t.name, a = t.label || t.label_key || o, i = t.variant || "secondary", l = t.icon, c = this.isNavigationAction(t), d = o === "delete";
    return c ? this.applyActionState(
      this.buildNavigationAction(e, t, a, i, l, s),
      n
    ) : d ? this.applyActionState(this.buildDeleteAction(e, a, i, l), n) : this.applyActionState(this.buildPostAction(e, t, a, i, l), n);
  }
  /**
   * Check if action is a navigation action
   */
  isNavigationAction(e) {
    return e.type === "navigation" || e.href ? !0 : ["view", "edit", "show", "details"].includes(e.name.toLowerCase());
  }
  shouldIncludeAction(e, t) {
    if (!this.matchesActionScope(t.scope))
      return !1;
    const s = Array.isArray(t.context_required) ? t.context_required : [];
    if (s.length === 0)
      return !0;
    for (const n of s) {
      const o = typeof n == "string" ? n.trim() : "";
      if (!o) continue;
      const a = this.resolveRecordContextValue(e, o);
      if (this.isEmptyPayloadValue(a))
        return !1;
    }
    return !0;
  }
  resolveRecordActionState(e, t) {
    const s = e._action_state;
    if (!s || typeof s != "object" || Array.isArray(s))
      return null;
    const n = s[t];
    return !n || typeof n != "object" || Array.isArray(n) ? null : n;
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1)
      return e;
    const s = this.disabledReason(t);
    return {
      ...e,
      disabled: !0,
      disabledReason: s
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t)
      return t;
    const s = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (s) {
      const n = ne(s);
      if (n?.message)
        return n.message;
    }
    switch (s.toLowerCase()) {
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
    const s = (this.config.actionContext || "row").toLowerCase();
    return t === s;
  }
  resolveRecordContextValue(e, t) {
    const s = t.trim();
    if (!s) return;
    if (!s.includes("."))
      return e[s];
    const n = s.split(".").map((a) => a.trim()).filter(Boolean);
    if (n.length === 0) return;
    let o = e;
    for (const a of n) {
      if (!o || typeof o != "object" || Array.isArray(o))
        return;
      o = o[a];
    }
    return o;
  }
  /**
   * Build navigation action (view, edit, etc.)
   */
  buildNavigationAction(e, t, s, n, o, a) {
    const i = String(e.id || ""), l = this.config.actionBasePath;
    let c;
    return t.href ? c = t.href.replace("{id}", i) : t.name === "edit" ? c = `${l}/${i}/edit` : c = `${l}/${i}`, a && (c += c.includes("?") ? `&${a}` : `?${a}`), {
      id: t.name,
      label: s,
      icon: o || this.getDefaultIcon(t.name),
      variant: n,
      action: () => {
        window.location.href = c;
      }
    };
  }
  /**
   * Build delete action with confirmation
   */
  buildDeleteAction(e, t, s, n) {
    const o = String(e.id || ""), a = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: n || "trash",
      variant: s === "secondary" ? "danger" : s,
      action: async () => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        if (!(await fetch(`${a}/${o}`, {
          method: "DELETE",
          headers: { Accept: "application/json" }
        })).ok)
          throw new Error("Delete failed");
      }
    };
  }
  /**
   * Build POST action for workflow/panel actions
   */
  buildPostAction(e, t, s, n, o) {
    const a = String(e.id || ""), i = t.name, l = `${this.config.apiEndpoint}/actions/${i}`;
    return {
      id: i,
      label: s,
      icon: o || this.getDefaultIcon(i),
      variant: n,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const c = await this.buildActionPayload(e, t);
        c !== null && await this.executePostAction({
          actionName: i,
          endpoint: l,
          payload: c,
          recordId: a
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await Re(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (Nt(t.error)) {
      const n = Gt(t.error);
      if (n && this.config.onTranslationBlocker) {
        const o = { ...e.payload };
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...n,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...o },
            recordId: e.recordId
          })
        }), { success: !1, error: t.error };
      }
    }
    const s = this.buildActionErrorMessage(e.actionName, t.error);
    throw this.config.onActionError?.(e.actionName, {
      ...t.error,
      message: s
    }), new Error(s);
  }
  /**
   * Handle successful create_translation action:
   * - Show success toast with source locale shortcut
   * - Redirect to new locale edit page
   */
  handleCreateTranslationSuccess(e, t) {
    const s = typeof e.id == "string" ? e.id : String(e.id || ""), n = typeof e.locale == "string" ? e.locale : "";
    if (!s) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const o = this.config.actionBasePath, a = new URLSearchParams();
    n && a.set("locale", n), this.config.environment && a.set("env", this.config.environment);
    const i = a.toString(), l = `${o}/${s}/edit${i ? `?${i}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(n || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, {
      action: {
        label: `View ${c.toUpperCase()}`,
        handler: () => {
          const p = new URLSearchParams();
          p.set("locale", c), this.config.environment && p.set("env", this.config.environment);
          const h = typeof t.id == "string" ? t.id : String(t.id || s);
          window.location.href = `${o}/${h}/edit?${p.toString()}`;
        }
      }
    }) : console.log(`[SchemaActionBuilder] Translation created: ${n}`), window.location.href = l;
  }
  /**
   * Build action payload from record and schema
   */
  async buildActionPayload(e, t) {
    const s = t.name.trim().toLowerCase(), n = {
      id: e.id
    };
    if (this.config.locale && s !== "create_translation" && (n.locale = this.config.locale), this.config.environment && (n.environment = this.config.environment), this.config.panelName && (n.policy_entity = this.config.panelName), n.expected_version === void 0) {
      const c = this.resolveExpectedVersion(e);
      c !== null && (n.expected_version = c);
    }
    const o = this.normalizePayloadSchema(t.payload_schema), a = this.collectRequiredFields(t.payload_required, o);
    if (s === "create_translation" && this.applySchemaTranslationContext(n, e, o), o?.properties)
      for (const [c, d] of Object.entries(o.properties))
        n[c] === void 0 && d.default !== void 0 && (n[c] = d.default);
    a.includes("idempotency_key") && this.isEmptyPayloadValue(n.idempotency_key) && (n.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const i = a.filter((c) => this.isEmptyPayloadValue(n[c]));
    if (i.length === 0)
      return n;
    const l = await this.promptForPayload(t, i, o, n, e);
    if (l === null)
      return null;
    for (const c of i) {
      const d = o?.properties?.[c], u = l[c] ?? "", p = this.coercePromptValue(u, c, d);
      if (p.error)
        throw new Error(p.error);
      n[c] = p.value;
    }
    return n;
  }
  /**
   * Prompt user for required payload values
   * Uses the lazy payload modal proxy.
   */
  async promptForPayload(e, t, s, n, o) {
    if (t.length === 0)
      return {};
    const a = t.map((l) => {
      const c = s?.properties?.[l];
      return {
        name: l,
        label: c?.title || l,
        description: c?.description,
        value: this.stringifyDefault(n[l] ?? c?.default),
        type: c?.type || "string",
        options: this.buildFieldOptions(l, e.name, c, o, n)
      };
    });
    return await qn.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: a
    });
  }
  /**
   * Build field options from schema property
   */
  buildFieldOptions(e, t, s, n, o) {
    const a = this.deriveCreateTranslationLocaleOptions(e, t, n, s, o);
    if (a && a.length > 0)
      return a;
    if (!s)
      return;
    if (s.oneOf)
      return s.oneOf.filter((l) => l && "const" in l).map((l) => ({
        value: this.stringifyDefault(l.const),
        label: l.title || this.stringifyDefault(l.const)
      }));
    if (s.enum)
      return s.enum.map((l) => ({
        value: this.stringifyDefault(l),
        label: this.stringifyDefault(l)
      }));
    const i = this.buildExtensionFieldOptions(s);
    if (i && i.length > 0)
      return i;
  }
  buildExtensionFieldOptions(e) {
    const t = e, s = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(s) || s.length === 0)
      return;
    const n = [];
    for (const o of s) {
      if (typeof o == "string") {
        const d = this.stringifyDefault(o);
        if (!d)
          continue;
        n.push({ value: d, label: d });
        continue;
      }
      if (!o || typeof o != "object")
        continue;
      const a = o.value, i = this.stringifyDefault(a);
      if (!i)
        continue;
      const l = o.label, c = this.stringifyDefault(l) || i;
      n.push({ value: i, label: c });
    }
    return n.length > 0 ? n : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, s, n, o) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !s || typeof s != "object")
      return;
    const a = this.asObject(s.translation_readiness), i = o && typeof o == "object" ? o : {};
    let l = this.asStringArray(i.missing_locales);
    if (l.length === 0 && (l = this.asStringArray(a?.missing_required_locales)), l.length === 0 && (l = this.asStringArray(s.missing_locales)), l.length === 0 && a) {
      const v = this.asStringArray(a.required_locales), b = new Set(this.asStringArray(a.available_locales));
      l = v.filter((E) => !b.has(E));
    }
    const c = this.asStringArray(n?.enum);
    if (c.length > 0) {
      const v = new Set(c);
      l = l.filter((b) => v.has(b));
    }
    if (l.length === 0)
      return;
    const d = this.extractStringField(i, "recommended_locale") || this.extractStringField(s, "recommended_locale") || this.extractStringField(a || {}, "recommended_locale"), u = this.asStringArray(
      i.required_for_publish ?? s.required_for_publish ?? a?.required_for_publish ?? a?.required_locales
    ), p = this.asStringArray(
      i.existing_locales ?? s.existing_locales ?? a?.available_locales
    ), h = this.createTranslationLocaleLabelMap(n), f = /* @__PURE__ */ new Set(), w = [];
    for (const v of l) {
      const b = v.trim().toLowerCase();
      if (!b || f.has(b))
        continue;
      f.add(b);
      const E = d?.toLowerCase() === b, B = u.includes(b), A = [];
      B && A.push("Required for publishing"), p.length > 0 && A.push(`${p.length} translation${p.length > 1 ? "s" : ""} exist`);
      const x = A.length > 0 ? A.join(" • ") : void 0, z = h[b] || this.localeLabel(b);
      let Ne = `${b.toUpperCase()} - ${z}`;
      E && (Ne += " (recommended)"), w.push({
        value: b,
        label: Ne,
        description: x,
        recommended: E
      });
    }
    return w.sort((v, b) => v.recommended && !b.recommended ? -1 : !v.recommended && b.recommended ? 1 : v.value.localeCompare(b.value)), w.length > 0 ? w : void 0;
  }
  applySchemaTranslationContext(e, t, s) {
    if (!s)
      return;
    const n = this.extractTranslationContextMap(s);
    if (Object.keys(n).length !== 0)
      for (const [o, a] of Object.entries(n)) {
        const i = o.trim(), l = a.trim();
        if (!i || !l || !this.isEmptyPayloadValue(e[i]))
          continue;
        const c = this.resolveRecordContextValue(t, l);
        c != null && (e[i] = this.clonePayloadValue(c));
      }
  }
  extractTranslationContextMap(e) {
    const t = e["x-translation-context"] ?? e.x_translation_context;
    if (!t || typeof t != "object" || Array.isArray(t))
      return {};
    const s = {};
    for (const [n, o] of Object.entries(t)) {
      const a = n.trim(), i = typeof o == "string" ? o.trim() : "";
      !a || !i || (s[a] = i);
    }
    return s;
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
        const a = this.stringifyDefault(o?.const).trim().toLowerCase();
        if (!a)
          continue;
        const i = this.stringifyDefault(o?.title).trim();
        i && (t[a] = i);
      }
    const s = e, n = s["x-options"] ?? s.x_options ?? s.xOptions;
    if (Array.isArray(n))
      for (const o of n) {
        if (!o || typeof o != "object")
          continue;
        const a = this.stringifyDefault(o.value).trim().toLowerCase(), i = this.stringifyDefault(o.label).trim();
        a && i && (t[a] = i);
      }
    return t;
  }
  extractStringField(e, t) {
    const s = e[t];
    return typeof s == "string" && s.trim() ? s.trim() : null;
  }
  resolveExpectedVersion(e) {
    const t = [
      e.expected_version,
      e.expectedVersion,
      e.version,
      e._version
    ];
    for (const s of t) {
      if (typeof s == "number" && Number.isFinite(s) && s > 0)
        return s;
      if (typeof s == "string") {
        const n = s.trim();
        if (!n)
          continue;
        const o = Number(n);
        if (Number.isFinite(o) && o > 0)
          return n;
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
    let s;
    if (t && typeof t == "object" && !Array.isArray(t)) {
      s = {};
      for (const [l, c] of Object.entries(t))
        c && typeof c == "object" && !Array.isArray(c) && (s[l] = c);
    }
    const n = e.required, o = Array.isArray(n) ? n.filter((l) => typeof l == "string").map((l) => l.trim()).filter((l) => l.length > 0) : void 0, a = e["x-translation-context"] ?? e.x_translation_context, i = a && typeof a == "object" && !Array.isArray(a) ? a : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: o,
      properties: s,
      ...i ? { "x-translation-context": i } : {}
    };
  }
  collectRequiredFields(e, t) {
    const s = [], n = /* @__PURE__ */ new Set(), o = (a) => {
      const i = a.trim();
      !i || n.has(i) || (n.add(i), s.push(i));
    };
    return Array.isArray(e) && e.forEach((a) => o(String(a))), Array.isArray(t?.required) && t.required.forEach((a) => o(String(a))), s;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const s = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), o = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${s || "action"}-${n || "record"}-${o}`;
  }
  coercePromptValue(e, t, s) {
    const n = typeof e == "string" ? e.trim() : String(e ?? "").trim(), o = typeof s?.type == "string" ? s.type.toLowerCase() : "string";
    if (n.length === 0)
      return { value: n };
    if (o === "number" || o === "integer") {
      const a = Number(n);
      return Number.isFinite(a) ? { value: o === "integer" ? Math.trunc(a) : a } : { value: null, error: `${t} must be a valid number` };
    }
    if (o === "boolean") {
      const a = n.toLowerCase();
      return a === "true" || a === "1" || a === "yes" ? { value: !0 } : a === "false" || a === "0" || a === "no" ? { value: !1 } : { value: null, error: `${t} must be true or false` };
    }
    if (o === "array" || o === "object")
      try {
        return { value: JSON.parse(n) };
      } catch {
        return { value: null, error: `${t} must be valid JSON (${o === "array" ? "[...]" : "{...}"})` };
      }
    return { value: n };
  }
  buildActionErrorMessage(e, t) {
    return Ht(t, `${e} failed`);
  }
  /**
   * Build URL query context from locale/environment
   */
  buildQueryContext() {
    const e = new URLSearchParams();
    return this.config.locale && e.set("locale", this.config.locale), this.config.environment && e.set("env", this.config.environment), e.toString();
  }
  /**
   * Append default actions (view, edit, delete) avoiding duplicates
   */
  appendDefaultActions(e, t, s) {
    const n = String(t.id || ""), o = this.config.actionBasePath, a = this.config.apiEndpoint, i = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let l = `${o}/${n}`;
            s && (l += `?${s}`), window.location.href = l;
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
            let l = `${o}/${n}/edit`;
            s && (l += `?${s}`), window.location.href = l;
          }
        }
      },
      {
        name: "delete",
        button: {
          id: "delete",
          label: "Delete",
          icon: "trash",
          variant: "danger",
          action: async () => {
            if (!window.confirm("Are you sure you want to delete this item?")) return;
            if (!(await fetch(`${a}/${n}`, {
              method: "DELETE",
              headers: { Accept: "application/json" }
            })).ok)
              throw new Error("Delete failed");
          }
        }
      }
    ];
    for (const l of i)
      this.seenActions.has(l.name) || (this.seenActions.add(l.name), e.push(l.button));
  }
  /**
   * Append default actions with ordering metadata
   */
  appendDefaultActionsOrdered(e, t, s, n) {
    const o = String(t.id || ""), a = this.config.actionBasePath, i = this.config.apiEndpoint, l = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let d = `${a}/${o}`;
            s && (d += `?${s}`), window.location.href = d;
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
            let d = `${a}/${o}/edit`;
            s && (d += `?${s}`), window.location.href = d;
          }
        }
      },
      {
        name: "delete",
        button: {
          id: "delete",
          label: "Delete",
          icon: "trash",
          variant: "danger",
          action: async () => {
            if (!window.confirm("Are you sure you want to delete this item?")) return;
            if (!(await fetch(`${i}/${o}`, {
              method: "DELETE",
              headers: { Accept: "application/json" }
            })).ok)
              throw new Error("Delete failed");
          }
        }
      }
    ];
    let c = n;
    for (const d of l)
      this.seenActions.has(d.name) || (this.seenActions.add(d.name), e.push({
        action: d.button,
        name: d.name,
        order: this.resolveActionOrder(d.name, void 0),
        insertionIndex: c++
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
      approve: "check-circle",
      reject: "x-circle",
      submit: "check-circle"
    }[e.toLowerCase()];
  }
}
function Qa(r, e, t) {
  return new jn(t).buildRowActions(r, e);
}
function Wa(r) {
  return r.schema?.actions;
}
class qe extends nt {
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
  /**
   * Show the translation blocker modal.
   * Returns a promise that resolves when the modal is closed.
   */
  static showBlocker(e) {
    return new Promise((t) => {
      const s = e.onDismiss;
      new qe({
        ...e,
        onDismiss: () => {
          s?.(), t();
        }
      }).show();
    });
  }
  renderContent() {
    const e = this.config.transition || "complete action", t = this.config.entityType || "content", s = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
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
                Cannot ${g(e)} ${g(t)}
              </h2>
              <p id="blocker-description" class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${this.renderDescription(s)}
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
            ${this.config.missingLocales.map((n) => this.renderLocaleItem(n)).join("")}
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
            Retry ${g(e)}
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
    const t = this.localeStates.get(e) || { loading: !1, created: !1 }, s = this.config.missingFieldsByLocale?.[e], n = Array.isArray(s) && s.length > 0, o = this.getLocaleLabel(e), a = t.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${t.loading ? "opacity-50" : ""}"
          data-locale-item="${g(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${g(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${g(o)}
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
            ${n ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${s.map((l) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${g(l)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${t.created ? this.renderOpenButton(e, t.newRecordId) : this.renderCreateButton(e, a)}
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
              data-locale="${g(e)}"
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
  renderOpenButton(e, t, s = !1) {
    if (s) return "";
    const n = this.config.navigationBasePath, o = t || this.config.recordId, a = new URLSearchParams();
    a.set("locale", e), this.config.environment && a.set("env", this.config.environment);
    const i = `${n}/${o}/edit?${a.toString()}`;
    return `
      <a href="${g(i)}"
         data-blocker-action="open"
         data-locale="${g(e)}"
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
        const a = o.getAttribute("data-locale");
        a && this.handleCreateTranslation(a);
      });
    });
    const n = this.container?.querySelectorAll("[data-locale-item]");
    n?.forEach((o, a) => {
      o.addEventListener("keydown", (i) => {
        i.key === "ArrowDown" && a < n.length - 1 ? (i.preventDefault(), n[a + 1].querySelector("[data-blocker-action]")?.focus()) : i.key === "ArrowUp" && a > 0 && (i.preventDefault(), n[a - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(e) {
    const t = this.localeStates.get(e);
    if (!(!t || t.loading || t.created)) {
      t.loading = !0, this.updateLocaleItemUI(e);
      try {
        const s = {
          id: this.config.recordId,
          locale: e
        };
        this.config.environment && (s.environment = this.config.environment), this.config.panelName && (s.policy_entity = this.config.panelName);
        const n = `${this.config.apiEndpoint}/actions/create_translation`, o = await Re(n, s);
        if (o.success) {
          t.loading = !1, t.created = !0, o.data?.id && (t.newRecordId = String(o.data.id)), this.updateLocaleItemUI(e);
          const a = {
            id: t.newRecordId || this.config.recordId,
            locale: e,
            status: String(o.data?.status || "draft"),
            translation_group_id: o.data?.translation_group_id ? String(o.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(e, a);
        } else {
          t.loading = !1, this.updateLocaleItemUI(e);
          const a = o.error?.message || "Failed to create translation";
          this.config.onError?.(a);
        }
      } catch (s) {
        t.loading = !1, this.updateLocaleItemUI(e);
        const n = s instanceof Error ? s.message : "Failed to create translation";
        this.config.onError?.(n);
      }
    }
  }
  updateLocaleItemUI(e) {
    const t = this.container?.querySelector(`[data-locale-item="${e}"]`);
    if (!t || !this.localeStates.get(e)) return;
    const n = t.parentElement;
    if (!n) return;
    const o = document.createElement("div");
    o.innerHTML = this.renderLocaleItem(e);
    const a = o.firstElementChild;
    a && (n.replaceChild(a, t), a.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
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
async function Xa(r) {
  try {
    await qe.showBlocker(r);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = r.transition || "complete action", s = r.missingLocales.join(", "), n = `Cannot ${t}: Missing translations for ${s}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(n) : alert(n);
  }
}
const zn = [
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
class kt {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || zn
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
    const { title: e, orientation: t, size: s, items: n, containerClass: o } = this.config, a = t === "vertical", i = s === "sm", l = a ? "flex-col" : "flex-row flex-wrap", c = i ? "gap-2" : "gap-4", d = i ? "text-xs" : "text-sm", u = i ? "text-sm" : "text-base", p = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${this.escapeHtml(e)}</span>` : "", h = n.map((f) => this.renderItem(f, u, d)).join("");
    return `
      <div class="status-legend inline-flex items-center ${l} ${c} ${o}"
           role="list"
           aria-label="Translation status legend">
        ${p}
        ${h}
      </div>
    `;
  }
  /**
   * Render a single legend item
   */
  renderItem(e, t, s) {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${this.escapeHtml(e.description)}"
           aria-label="${this.escapeHtml(e.label)}: ${this.escapeHtml(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${s}">${this.escapeHtml(e.label)}</span>
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
  /**
   * Escape HTML special characters
   */
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}
function Nn(r) {
  const e = new kt(r);
  return e.render(), e;
}
function Za() {
  const r = document.querySelectorAll("[data-status-legend]"), e = [];
  return r.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const s = t.dataset.orientation || "horizontal", n = t.dataset.size || "default", o = t.dataset.title || "", a = Nn({
      container: t,
      orientation: s,
      size: n,
      title: o
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(a);
  }), e;
}
function ei(r = {}) {
  const e = document.createElement("div");
  return new kt({
    container: e,
    ...r
  }).buildHTML();
}
const At = [
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
class Gn {
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
    const { size: e = "default", containerClass: t = "" } = this.config, s = e === "sm" ? "text-xs" : "text-sm", n = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", o = this.config.filters.map((a) => this.renderFilterButton(a, s, n)).join("");
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
  renderFilterButton(e, t, s) {
    const n = this.state.capabilities.get(e.key), o = n?.supported !== !1, a = this.state.activeKey === e.key, i = n?.disabledReason || "Filter not available", l = `inline-flex items-center gap-1 ${s} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let c, d;
    o ? a ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${_e(i)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${_e(e.key)}"
              ${d}
              ${o ? "" : "disabled"}>
        ${u}
        <span>${Oe(e.label)}</span>
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
        const s = t.dataset.filterKey;
        s && !t.disabled && this.selectFilter(s);
      });
    });
  }
  /**
   * Select a filter by key
   */
  selectFilter(e) {
    const t = this.config.filters.find((n) => n.key === e);
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
  setCapability(e, t, s) {
    this.state.capabilities.set(e, { key: e, supported: t, disabledReason: s }), this.render();
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
function Hn(r, e, t = {}) {
  return new Gn({
    container: r,
    filters: At,
    onFilterSelect: e,
    ...t
  });
}
function ti(r) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((s) => {
    if (s.hasAttribute("data-quick-filters-init"))
      return;
    const n = s.dataset.size || "default", o = Hn(
      s,
      (a) => r(a, s),
      { size: n }
    );
    s.setAttribute("data-quick-filters-init", "true"), t.push(o);
  }), t;
}
function ri(r = {}) {
  const {
    filters: e = At,
    activeKey: t = null,
    capabilities: s = [],
    size: n = "default",
    containerClass: o = ""
  } = r, a = n === "sm" ? "text-xs" : "text-sm", i = n === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const d of s)
    l.set(d.key, d);
  const c = e.map((d) => {
    const u = l.get(d.key), p = u?.supported !== !1, h = t === d.key, f = u?.disabledReason || "Filter not available", w = `inline-flex items-center gap-1 ${i} ${a} rounded-full font-medium`;
    let v;
    p ? h ? v = `${d.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : v = d.styleClass || "bg-gray-100 text-gray-700" : v = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const b = d.icon ? `<span>${d.icon}</span>` : "", E = p ? "" : `title="${_e(f)}"`;
    return `<span class="${w} ${v}" ${E}>${b}<span>${Oe(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-1 flex-wrap ${o}">${c}</div>`;
}
function Oe(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function _e(r) {
  return Oe(r);
}
const he = "go-admin:translation-panel-expanded";
class Un {
  constructor(e) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...e,
      storageKey: e.storageKey || he
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
      const s = this.toggleButton.querySelector("[data-chevron]");
      s && s.classList.toggle("rotate-180", e);
    }
    t && this.persistExpandedState(e), this.dispatchToggleEvent(e);
  }
  getPersistedExpandedState() {
    if (typeof window > "u" || !window.localStorage)
      return !1;
    try {
      return window.localStorage.getItem(this.config.storageKey || he) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(e) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || he, e ? "true" : "false");
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
function si(r) {
  return new Un(r);
}
async function Vn(r, e, t = {}) {
  const { apiEndpoint: s, notifier: n = new W(), maxFailuresToShow: o = 5 } = r, a = `${s}/bulk/create-missing-translations`;
  try {
    const i = await fetch(a, {
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
    if (!i.ok) {
      const d = await i.text();
      let u = `Request failed: ${i.status}`;
      try {
        const p = JSON.parse(d);
        u = p.error || p.message || u;
      } catch {
        d && (u = d);
      }
      throw new Error(u);
    }
    const l = await i.json(), c = Kn(l, o);
    return Jn(c, n), r.onSuccess && r.onSuccess(c), c;
  } catch (i) {
    const l = i instanceof Error ? i : new Error(String(i));
    throw n.error(`Failed to create translations: ${l.message}`), r.onError && r.onError(l), l;
  }
}
function Kn(r, e) {
  const t = r.data || [], s = r.created_count ?? t.filter((l) => l.success).length, n = r.failed_count ?? t.filter((l) => !l.success).length, o = r.skipped_count ?? 0, a = r.total ?? t.length, i = t.filter((l) => !l.success && l.error).slice(0, e).map((l) => ({
    id: l.id,
    locale: l.locale,
    error: l.error || "Unknown error"
  }));
  return {
    total: a,
    created: s,
    failed: n,
    skipped: o,
    failures: i
  };
}
function Jn(r, e) {
  const { created: t, failed: s, skipped: n, total: o } = r;
  if (o === 0) {
    e.info("No translations to create");
    return;
  }
  s === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${n > 0 ? ` (${n} skipped)` : ""}`) : n > 0 && e.info(`All ${n} translation${n !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${s} translation${s !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${s}${n > 0 ? `, skipped ${n}` : ""}`
  );
}
function ni(r) {
  const { created: e, failed: t, skipped: s, total: n, failures: o } = r, a = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${e}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${t > 0 ? "bg-red-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${t > 0 ? "text-red-700" : "text-gray-400"}">${t}</div>
        <div class="text-sm ${t > 0 ? "text-red-600" : "text-gray-500"}">Failed</div>
      </div>
      <div class="text-center p-3 ${s > 0 ? "bg-yellow-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${s > 0 ? "text-yellow-700" : "text-gray-400"}">${s}</div>
        <div class="text-sm ${s > 0 ? "text-yellow-600" : "text-gray-500"}">Skipped</div>
      </div>
    </div>
  `;
  let i = "";
  return o.length > 0 && (i = `
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
          <td class="px-3 py-2 text-sm text-gray-700">${fe(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${fe(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${fe(c.error)}</td>
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
        Processed ${n} item${n !== 1 ? "s" : ""}
      </div>
      ${a}
      ${i}
    </div>
  `;
}
function oi(r) {
  const { created: e, failed: t, skipped: s } = r, n = [];
  return e > 0 && n.push(`<span class="text-green-600">+${e}</span>`), t > 0 && n.push(`<span class="text-red-600">${t} failed</span>`), s > 0 && n.push(`<span class="text-yellow-600">${s} skipped</span>`), n.join(" · ");
}
function ai(r, e, t) {
  return async (s) => Vn(
    {
      apiEndpoint: r,
      notifier: e,
      onSuccess: t
    },
    s
  );
}
function fe(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const Yn = {
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
function T(r) {
  const e = r.toLowerCase();
  return Yn[e] || r.toUpperCase();
}
class le {
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
  /**
   * Render the locale action chip as HTML string.
   * Use when generating static HTML.
   */
  render() {
    const { locale: e, size: t, mode: s, localeExists: n } = this.config, { loading: o, created: a, error: i } = this.state, l = T(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = s === "button" ? "rounded-lg" : "rounded-full";
    let u, p = "";
    o ? (u = "bg-gray-100 text-gray-600 border-gray-300", p = this.renderSpinner()) : a ? (u = "bg-green-100 text-green-700 border-green-300", p = this.renderCheckIcon()) : i ? (u = "bg-red-100 text-red-700 border-red-300", p = this.renderErrorIcon()) : n ? u = "bg-blue-100 text-blue-700 border-blue-300" : u = "bg-amber-100 text-amber-700 border-amber-300";
    const h = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${c} ${d} border ${u}"
           data-locale-action="${g(e)}"
           data-locale-exists="${n}"
           data-loading="${o}"
           data-created="${a}"
           role="group"
           aria-label="${l} translation">
        ${p}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${g(e)}</span>
        <span class="sr-only">${l}</span>
        ${h}
      </div>
    `;
  }
  /**
   * Render action buttons (create/open).
   */
  renderActions() {
    const { locale: e, localeExists: t, size: s } = this.config, { loading: n, created: o } = this.state, a = s === "sm" ? "p-0.5" : "p-1", i = s === "sm" ? "w-3 h-3" : "w-4 h-4", l = [];
    if (!t && !o && !n && l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${a} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${g(e)}"
                aria-label="Create ${T(e)} translation"
                title="Create ${T(e)} translation">
          <svg class="${i}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || o) {
      const c = o ? "hover:bg-green-200" : "hover:bg-blue-200", d = o ? "focus:ring-green-500" : "focus:ring-blue-500";
      l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${a} rounded ${c} focus:outline-none focus:ring-1 ${d} transition-colors"
                data-action="open"
                data-locale="${g(e)}"
                aria-label="Open ${T(e)} translation"
                title="Open ${T(e)} translation">
          <svg class="${i}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
    e?.addEventListener("click", (s) => {
      s.preventDefault(), s.stopPropagation(), this.handleCreate();
    }), t?.addEventListener("click", (s) => {
      s.preventDefault(), s.stopPropagation(), this.handleOpen();
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
        };
        this.config.environment && (e.environment = this.config.environment), this.config.panelName && (e.policy_entity = this.config.panelName);
        const t = `${this.config.apiEndpoint}/actions/create_translation`, s = await Re(t, e);
        if (s.success) {
          const n = s.data?.id ? String(s.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: n
          });
          const o = {
            id: n || this.config.recordId,
            locale: this.config.locale,
            status: String(s.data?.status || "draft"),
            translationGroupId: s.data?.translation_group_id ? String(s.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, o);
        } else {
          const n = s.error?.message || "Failed to create translation";
          this.setState({ loading: !1, error: n }), this.config.onError?.(this.config.locale, n);
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
    const { locale: e, navigationBasePath: t, recordId: s, environment: n } = this.config, { newRecordId: o } = this.state, a = o || s, i = new URLSearchParams();
    i.set("locale", e), n && i.set("env", n);
    const l = `${t}/${a}/edit?${i.toString()}`;
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
function Lt(r) {
  return new le(r).render();
}
function ii(r, e) {
  return r.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${r.map((s) => {
    const n = { ...e, locale: s };
    return Lt(n);
  }).join("")}
    </div>
  `;
}
function li(r, e) {
  const t = /* @__PURE__ */ new Map();
  return r.querySelectorAll("[data-locale-action]").forEach((n) => {
    const o = n.getAttribute("data-locale-action");
    if (!o) return;
    const a = n.getAttribute("data-locale-exists") === "true", i = { ...e, locale: o, localeExists: a }, l = new le(i), c = n.parentElement;
    c && (l.mount(c), t.set(o, l));
  }), t;
}
function Ze(r, e, t, s) {
  const n = new URLSearchParams();
  return n.set("locale", t), s && n.set("env", s), `${r}/${e}/edit?${n.toString()}`;
}
class je {
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
    const { context: e, showFormLockMessage: t } = this.config, s = e.requestedLocale || "requested", n = e.resolvedLocale || "default", o = T(s), a = T(n), i = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${g(s)}"
           data-resolved-locale="${g(n)}">
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
                The <strong class="font-medium">${g(o)}</strong> (${g(s.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${g(a)}</strong> (${g(n.toUpperCase())}).
              </p>

              ${c}

              <!-- Actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                ${i}
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
    const { context: e, apiEndpoint: t, navigationBasePath: s, panelName: n, environment: o } = this.config, a = e.requestedLocale;
    return !a || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${g(a)}"
              data-record-id="${g(e.recordId)}"
              data-api-endpoint="${g(t)}"
              data-panel="${g(n || "")}"
              data-environment="${g(o || "")}"
              aria-label="Create ${T(a)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${g(a.toUpperCase())} translation
      </button>
    `;
  }
  /**
   * Render the secondary CTA (Open source locale).
   */
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, environment: s } = this.config, n = e.resolvedLocale;
    if (!n || !e.recordId)
      return "";
    const o = Ze(t, e.recordId, n, s);
    return `
      <a href="${g(o)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${g(n)}"
         aria-label="Open ${T(n)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${g(n.toUpperCase())} (source)
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
    e?.addEventListener("click", async (s) => {
      s.preventDefault(), await this.handleCreate();
    }), t?.addEventListener("click", (s) => {
      const n = t.getAttribute("data-locale"), o = t.getAttribute("href");
      n && o && this.config.onOpenSource?.(n, o);
    });
  }
  /**
   * Handle create translation action.
   */
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: s, environment: n, navigationBasePath: o } = this.config, a = e.requestedLocale, i = e.recordId;
    if (!a || !i) return;
    await new le({
      locale: a,
      recordId: i,
      apiEndpoint: t,
      navigationBasePath: o,
      panelName: s,
      environment: n,
      localeExists: !1,
      onCreateSuccess: (c, d) => {
        this.config.onCreateSuccess?.(c, d);
        const u = Ze(o, d.id, c, n);
        window.location.href = u;
      },
      onError: (c, d) => {
        this.config.onError?.(d);
      }
    }).handleCreate();
  }
}
function Qn(r, e) {
  if (!e.locked) {
    Wn(r);
    return;
  }
  if (r.classList.add("form-locked", "pointer-events-none", "opacity-75"), r.setAttribute("data-form-locked", "true"), r.setAttribute("data-lock-reason", e.reason || ""), r.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((s) => {
    s.setAttribute("disabled", "true"), s.setAttribute("data-was-enabled", "true"), s.setAttribute("aria-disabled", "true");
  }), !r.querySelector("[data-form-lock-overlay]")) {
    const s = document.createElement("div");
    s.setAttribute("data-form-lock-overlay", "true"), s.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", s.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(r).position === "static" && (r.style.position = "relative"), r.appendChild(s);
  }
}
function Wn(r) {
  r.classList.remove("form-locked", "pointer-events-none", "opacity-75"), r.removeAttribute("data-form-locked"), r.removeAttribute("data-lock-reason"), r.querySelectorAll('[data-was-enabled="true"]').forEach((s) => {
    s.removeAttribute("disabled"), s.removeAttribute("data-was-enabled"), s.removeAttribute("aria-disabled");
  }), r.querySelector("[data-form-lock-overlay]")?.remove();
}
function ci(r) {
  return r.getAttribute("data-form-locked") === "true";
}
function di(r) {
  return r.getAttribute("data-lock-reason");
}
function ui(r, e) {
  const t = P(r);
  return new je({ ...e, context: t }).render();
}
function pi(r) {
  const e = P(r);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function hi(r, e) {
  const t = new je(e);
  return t.mount(r), t;
}
function fi(r, e) {
  const t = P(e), n = new je({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return Qn(r, n), n;
}
class _t {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = _(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  /**
   * Extract action state for a specific action from the record.
   */
  extractActionState(e, t) {
    const s = e._action_state;
    if (!s || typeof s != "object" || Array.isArray(s))
      return null;
    const n = s[t];
    return !n || typeof n != "object" || Array.isArray(n) ? null : n;
  }
  /**
   * Check if the create_translation action is enabled.
   */
  isCreateActionEnabled() {
    return this.actionState ? this.actionState.enabled !== !1 : !0;
  }
  /**
   * Get the disabled reason if create action is disabled.
   */
  getDisabledReason() {
    if (this.isCreateActionEnabled())
      return null;
    if (this.actionState?.reason)
      return this.actionState.reason;
    const e = this.actionState?.reason_code;
    return e === "workflow_transition_not_available" ? "Translation creation is not available in the current workflow state." : e === "permission_denied" ? "You do not have permission to create translations." : "Translation creation is currently unavailable.";
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
    const t = this.isCreateActionEnabled(), s = this.getDisabledReason(), n = this.getOverflowCount(), o = e.map(
      (l) => this.renderChip(l, t, s)
    ).join(""), a = n > 0 ? this.renderOverflow(n) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${g(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${o}${a}
      </div>
    `;
  }
  /**
   * Render a single locale chip.
   */
  renderChip(e, t, s) {
    const { recordId: n, apiEndpoint: o, navigationBasePath: a, panelName: i, environment: l, size: c } = this.config;
    return t ? Lt({
      locale: e,
      recordId: n,
      apiEndpoint: o,
      navigationBasePath: a,
      panelName: i,
      environment: l,
      localeExists: !1,
      size: c,
      mode: "chip",
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError
    }) : this.renderDisabledChip(e, s, c);
  }
  /**
   * Render a disabled locale chip (no action buttons).
   */
  renderDisabledChip(e, t, s) {
    const n = s === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", o = t || "Translation creation unavailable", a = T(e);
    return `
      <div class="inline-flex items-center gap-1 ${n} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${g(e)}"
           data-disabled="true"
           title="${g(o)}"
           role="listitem"
           aria-label="${a} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${g(e)}</span>
      </div>
    `;
  }
  /**
   * Render overflow indicator.
   */
  renderOverflow(e) {
    const { size: t } = this.config, s = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", n = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${s} rounded text-gray-500 font-medium"
            title="Also missing: ${g(n)}"
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
      const s = t.getAttribute("data-locale-action");
      if (!s) return;
      const n = new le({
        locale: s,
        recordId: this.config.recordId,
        apiEndpoint: this.config.apiEndpoint,
        navigationBasePath: this.config.navigationBasePath,
        panelName: this.config.panelName,
        environment: this.config.environment,
        localeExists: !1,
        size: this.config.size,
        onCreateSuccess: this.config.onCreateSuccess,
        onError: this.config.onError
      });
      this.chips.set(s, n), t.querySelector('[data-action="create"]')?.addEventListener("click", async (i) => {
        i.preventDefault(), i.stopPropagation(), await n.handleCreate();
      }), t.querySelector('[data-action="open"]')?.addEventListener("click", (i) => {
        i.preventDefault(), i.stopPropagation(), n.handleOpen();
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
function Xn(r, e) {
  const t = String(r.id || "");
  return t ? new _t(r, { ...e, recordId: t }).render() : "";
}
function gi(r) {
  const e = _(r);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function mi(r, e, t) {
  const s = String(e.id || ""), n = new _t(e, { ...t, recordId: s });
  return n.mount(r), n;
}
function bi(r) {
  return (e, t, s) => Xn(t, r);
}
function ce() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function Zn() {
  return ce() ? "⌘" : "Ctrl";
}
function eo(r) {
  if (ce())
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
function Rt(r) {
  const e = r.modifiers.map(eo), t = to(r.key);
  return ce() ? [...e, t].join("") : [...e, t].join("+");
}
function to(r) {
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
class Tt {
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
    const { override: s = !1 } = t;
    if (this.shortcuts.has(e.id) && !s) {
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
    const s = this.shortcuts.get(e);
    s && (s.enabled = t);
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
      const s = e.get(t.category) || [];
      s.push(t), e.set(t.category, s);
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
        const s = t.handler(e);
        s instanceof Promise && s.catch((n) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, n);
        });
      } catch (s) {
        console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, s);
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
    const s = t.key.toLowerCase(), n = e.key.toLowerCase();
    if (s !== n && t.code.toLowerCase() !== n)
      return !1;
    const o = ce(), a = new Set(e.modifiers), i = a.has("ctrl"), l = a.has("meta"), c = a.has("alt"), d = a.has("shift");
    return !(i && !(o ? t.metaKey : t.ctrlKey) || l && !o && !t.metaKey || c && !t.altKey || d && !t.shiftKey || !i && !l && (o ? t.metaKey : t.ctrlKey) || !c && t.altKey || !d && t.shiftKey);
  }
  /**
   * Check if an input element is focused.
   */
  isInputFocused(e) {
    const t = e.target;
    if (!t) return !1;
    const s = t.tagName.toLowerCase();
    return !!(s === "input" || s === "textarea" || s === "select" || t.isContentEditable);
  }
  /**
   * Destroy the registry and clean up.
   */
  destroy() {
    this.unbind(), this.shortcuts.clear();
  }
}
function ro(r) {
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
function yi(r) {
  const e = /* @__PURE__ */ new Map();
  for (const o of r) {
    if (o.enabled === !1) continue;
    const a = e.get(o.category) || [];
    a.push(o), e.set(o.category, a);
  }
  const t = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, s = ["save", "locale", "navigation", "actions", "help", "other"];
  let n = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const o of s) {
    const a = e.get(o);
    if (!(!a || a.length === 0)) {
      n += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${t[o]}</h4>
        <dl class="space-y-1">
    `;
      for (const i of a) {
        const l = Rt(i);
        n += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${q(i.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${q(l)}</kbd>
            </dd>
          </div>
      `;
      }
      n += `
        </dl>
      </div>
    `;
    }
  }
  return n += "</div>", n;
}
function q(r) {
  const e = typeof document < "u" ? document.createElement("div") : null;
  return e ? (e.textContent = r, e.innerHTML) : r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const It = "admin_keyboard_shortcuts_settings", Mt = "admin_keyboard_shortcuts_hint_dismissed", te = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function de() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function so() {
  const r = de();
  if (!r)
    return { ...te };
  try {
    const e = r.getItem(It);
    if (!e)
      return { ...te };
    const t = JSON.parse(e);
    return {
      enabled: typeof t.enabled == "boolean" ? t.enabled : !0,
      shortcuts: typeof t.shortcuts == "object" && t.shortcuts !== null ? t.shortcuts : {},
      updatedAt: typeof t.updatedAt == "string" ? t.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...te };
  }
}
function vi(r) {
  const e = de();
  if (e)
    try {
      const t = {
        ...r,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      e.setItem(It, JSON.stringify(t));
    } catch {
    }
}
function no() {
  const r = de();
  return r ? r.getItem(Mt) === "true" : !1;
}
function oo() {
  const r = de();
  if (r)
    try {
      r.setItem(Mt, "true");
    } catch {
    }
}
function ao(r) {
  if (no())
    return null;
  const { container: e, position: t = "bottom", onDismiss: s, onShowHelp: n, autoDismissMs: o = 1e4 } = r, a = document.createElement("div");
  a.className = `shortcuts-discovery-hint fixed ${t === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, a.setAttribute("role", "alert"), a.setAttribute("aria-live", "polite");
  const i = Zn();
  a.innerHTML = `
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
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${i}+S</kbd> to save.
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
    c && oo(), a.remove(), s?.();
  };
  return a.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    l(!0), n?.();
  }), a.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    l(!0);
  }), a.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    l(!1);
  }), o > 0 && setTimeout(() => {
    a.parentElement && l(!1);
  }, o), e.appendChild(a), a;
}
function wi(r) {
  const { container: e, shortcuts: t, settings: s, onSettingsChange: n } = r, o = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, a = /* @__PURE__ */ new Map();
  for (const p of t) {
    const h = a.get(p.category) || [];
    h.push(p), a.set(p.category, h);
  }
  const i = ["save", "locale", "navigation", "actions", "help", "other"];
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
                aria-checked="${s.enabled}"
                data-settings-action="toggle-global"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${s.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}">
          <span class="sr-only">Enable keyboard shortcuts</span>
          <span aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${s.enabled ? "translate-x-5" : "translate-x-0"}"></span>
        </button>
      </div>

      <!-- Per-shortcut toggles -->
      <div class="${s.enabled ? "" : "opacity-50 pointer-events-none"}" data-shortcuts-list>
  `;
  for (const p of i) {
    const h = a.get(p);
    if (!(!h || h.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${o[p]}
        </h4>
        <div class="space-y-1">
    `;
      for (const f of h) {
        const w = s.shortcuts[f.id] !== !1, v = Rt(f);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${q(v)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${q(f.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${q(f.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${q(f.id)}"
                 ${w ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${q(f.description)} shortcut">
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
    const p = {
      ...s,
      enabled: !s.enabled
    };
    n(p);
  }), e.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((p) => {
    p.addEventListener("change", () => {
      const h = p.getAttribute("data-shortcut-id");
      if (!h) return;
      const f = {
        ...s,
        shortcuts: {
          ...s.shortcuts,
          [h]: p.checked
        }
      };
      n(f);
    });
  }), e.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    n({ ...te });
  });
}
function io(r, e) {
  const t = r;
  t.config && (t.config.enabled = e.enabled);
  for (const s of r.getShortcuts()) {
    const n = e.shortcuts[s.id] !== !1;
    r.setEnabled(s.id, n);
  }
}
let ge = null;
function xi() {
  return ge || (ge = new Tt()), ge;
}
function lo(r, e) {
  const t = so(), s = new Tt({
    ...e,
    enabled: t.enabled
  }), n = ro(r);
  for (const o of n)
    s.register(o);
  return io(s, t), s.bind(), s;
}
function Si(r, e) {
  const t = lo(r, e);
  return e.hintContainer && ao({
    container: e.hintContainer,
    onShowHelp: e.onShowHelp,
    onDismiss: () => {
    }
  }), t;
}
const co = 1500, uo = 2e3, ze = "autosave", H = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, po = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
};
class Pt {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? co,
      savedDurationMs: e.savedDurationMs ?? uo,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? ze,
      labels: { ...H, ...e.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: { ...po, ...e.conflictLabels }
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
    const s = {
      action: "use_server",
      serverState: t,
      localData: this.pendingData,
      conflict: e
    };
    if (this.isDirty = !1, this.pendingData = null, this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve)
      try {
        await this.config.onConflictResolve(s);
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
    const t = e, s = t.metadata;
    return s ? {
      version: s.version || "",
      expectedVersion: s.expected_version || "",
      latestStatePath: s.latest_state_path,
      latestServerState: s.latest_server_state,
      entityId: s.entity_id,
      panel: s.panel
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
    const e = this.config.classPrefix, t = this.config.labels, s = `${e}--${this.state}`, n = t[this.state] || "", o = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${s}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${o}</span>
      <span class="${e}__label">${n}</span>
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
    const s = {
      previousState: t,
      currentState: e,
      error: this.lastError ?? void 0,
      data: this.pendingData ?? void 0
    };
    for (const n of this.listeners)
      try {
        n(s);
      } catch {
      }
    this.config.showToasts && this.config.notifier && this.showToast(e), this.render();
  }
  showToast(e) {
    const t = this.config.notifier;
    if (t)
      switch (e) {
        case "saved":
          t.success(this.config.labels.saved ?? H.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? H.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? H.conflict);
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
    const s = this.config.container.querySelector(`.${e}__conflict-force-save`);
    s && s.addEventListener("click", () => this.resolveWithForceSave());
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
}
function Ci(r) {
  return new Pt({
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
function $i(r, e = {}) {
  const t = e.classPrefix ?? ze, n = { ...H, ...e.labels }[r] || "";
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
    <span class="${t}__label">${n}</span>
  </div>`;
}
function Ei(r = ze) {
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
function ki(r, e) {
  const { watchFields: t, indicatorSelector: s, ...n } = e;
  let o = n.container;
  !o && s && (o = r.querySelector(s) ?? void 0);
  const a = new Pt({
    ...n,
    container: o
  }), i = () => {
    const p = new FormData(r), h = {};
    return p.forEach((f, w) => {
      h[w] = f;
    }), h;
  }, l = (p) => {
    const h = p.target;
    if (h) {
      if (t && t.length > 0) {
        const f = h.name;
        if (!f || !t.includes(f))
          return;
      }
      a.markDirty(i());
    }
  };
  r.addEventListener("input", l), r.addEventListener("change", l), r.addEventListener("submit", async (p) => {
    a.hasPendingChanges() && (p.preventDefault(), await a.save() && r.submit());
  });
  const c = (p) => {
    a.hasPendingChanges() && (p.preventDefault(), p.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const d = () => {
    document.hidden && a.hasPendingChanges() && a.save();
  };
  document.addEventListener("visibilitychange", d);
  const u = a.destroy.bind(a);
  return a.destroy = () => {
    r.removeEventListener("input", l), r.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), u();
  }, a;
}
const Bt = "char-counter", ho = "interpolation-preview", Dt = "dir-toggle", Ft = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: "Mustache", example: "{{name}}" },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: "ICU", example: "{name}" },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: "Printf", example: "%s" },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: "Named Printf", example: "%(name)s" },
  { pattern: /\$\{(\w+)\}/g, name: "Template Literal", example: "${name}" }
], fo = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
};
class go {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Bt,
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
    const e = this.getCount(), t = [...this.config.thresholds].sort((s, n) => n.limit - s.limit);
    for (const s of t)
      if (e >= s.limit)
        return s.severity;
    return null;
  }
  /**
   * Update the counter display.
   */
  update() {
    const e = this.getCount(), t = this.getSeverity(), s = this.config.hardLimit ?? this.config.softLimit;
    this.config.enforceHardLimit && this.config.hardLimit && e > this.config.hardLimit && (this.config.input.value = this.config.input.value.slice(0, this.config.hardLimit)), this.counterEl && (this.counterEl.textContent = this.config.formatDisplay(e, s), this.counterEl.className = this.buildCounterClasses(t), this.counterEl.setAttribute("aria-live", "polite"), t === "error" ? this.counterEl.setAttribute("role", "alert") : this.counterEl.removeAttribute("role"));
  }
  /**
   * Render the counter HTML.
   */
  render() {
    const e = this.getCount(), t = this.getSeverity(), s = this.config.hardLimit ?? this.config.softLimit;
    return `<span class="${this.buildCounterClasses(t)}" aria-live="polite">${this.config.formatDisplay(e, s)}</span>`;
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
    const t = this.config.classPrefix, s = [t];
    return e && s.push(`${t}--${e}`), s.join(" ");
  }
  defaultFormatDisplay(e, t) {
    return t ? `${e} / ${t}` : `${e}`;
  }
}
class mo {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? fo,
      patterns: [...Ft, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? ho
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
    for (const s of this.config.patterns) {
      s.pattern.lastIndex = 0;
      let n;
      for (; (n = s.pattern.exec(e)) !== null; )
        t.push({
          pattern: s.name,
          variable: n[1] ?? n[0],
          start: n.index,
          end: n.index + n[0].length
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
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (s, n) => {
        const a = (n ?? s).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [i, l] of Object.entries(this.config.sampleValues))
          if (i.toLowerCase() === a)
            return l;
        return s;
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
    const e = this.config.input.value, t = this.getMatches(), s = this.config.classPrefix;
    if (t.length === 0)
      return this.escapeHtml(e);
    t.sort((a, i) => a.start - i.start);
    let n = "", o = 0;
    for (const a of t) {
      n += this.escapeHtml(e.slice(o, a.start));
      const i = this.getSampleValue(a.variable), l = e.slice(a.start, a.end);
      n += `<span class="${s}__variable" title="${this.escapeHtml(l)}">${this.escapeHtml(i ?? l)}</span>`, o = a.end;
    }
    return n += this.escapeHtml(e.slice(o)), n;
  }
  /**
   * Render the preview HTML structure.
   */
  render() {
    const e = this.config.classPrefix, s = this.getMatches().length === 0;
    return `<div class="${e}${s ? ` ${e}--empty` : ""}">
      <span class="${e}__label">Preview:</span>
      <span class="${e}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : this.escapeHtml(this.getPreviewText())}</span>
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
    for (const [s, n] of Object.entries(this.config.sampleValues))
      if (s.toLowerCase() === t)
        return n;
    return null;
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}
class bo {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Dt,
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
function Ai(r, e = {}) {
  const t = [], s = [], n = [];
  for (const o of e.charCounterFields ?? []) {
    const a = r.querySelector(`[name="${o}"]`);
    a && t.push(new go({
      input: a,
      ...e.charCounterConfig
    }));
  }
  for (const o of e.interpolationFields ?? []) {
    const a = r.querySelector(`[name="${o}"]`);
    a && s.push(new mo({
      input: a,
      ...e.interpolationConfig
    }));
  }
  for (const o of e.directionToggleFields ?? []) {
    const a = r.querySelector(`[name="${o}"]`);
    a && n.push(new bo({
      input: a,
      persistenceKey: `dir-${o}`,
      ...e.directionToggleConfig
    }));
  }
  return {
    counters: t,
    previews: s,
    toggles: n,
    destroy: () => {
      t.forEach((o) => o.destroy()), s.forEach((o) => o.destroy()), n.forEach((o) => o.destroy());
    }
  };
}
function Li(r, e, t, s = Bt) {
  const n = [s];
  t && n.push(`${s}--${t}`);
  const o = e ? `${r} / ${e}` : `${r}`;
  return `<span class="${n.join(" ")}" aria-live="polite">${o}</span>`;
}
function _i(r, e = Dt) {
  const t = r === "rtl", s = t ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${r.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${s}</svg>
    <span class="${e}__label">${r.toUpperCase()}</span>
  </button>`;
}
function Ri() {
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
function Ti(r, e = Ft) {
  const t = [];
  for (const s of e) {
    s.pattern.lastIndex = 0;
    let n;
    for (; (n = s.pattern.exec(r)) !== null; )
      t.push({
        pattern: s.name,
        variable: n[1] ?? n[0],
        start: n.index,
        end: n.index + n[0].length
      });
  }
  return t;
}
function Ii(r, e, t) {
  return t && r >= t ? "error" : e && r >= e ? "warning" : null;
}
function yo(r) {
  return typeof r == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(r) ? r : "none";
}
function vo(r) {
  return r === "core+exchange" || r === "full";
}
function wo(r) {
  return r === "core+queue" || r === "full";
}
function Mi(r) {
  return r !== "none";
}
function xo(r) {
  if (!r || typeof r != "object")
    return null;
  const e = r, t = yo(e.profile || e.capability_mode), s = typeof e.schema_version == "number" ? e.schema_version : 0;
  return {
    profile: t,
    capability_mode: t,
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.filter(
      (n) => typeof n == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(n)
    ) : ["none", "core", "core+exchange", "core+queue", "full"],
    schema_version: s,
    modules: So(e.modules),
    features: $o(e.features),
    routes: Eo(e.routes),
    panels: ko(e.panels),
    resolver_keys: Ao(e.resolver_keys),
    warnings: Lo(e.warnings),
    contracts: e.contracts && typeof e.contracts == "object" ? e.contracts : void 0
  };
}
function So(r) {
  if (!r || typeof r != "object")
    return {};
  const e = r, t = {};
  return e.exchange && typeof e.exchange == "object" && (t.exchange = et(e.exchange)), e.queue && typeof e.queue == "object" && (t.queue = et(e.queue)), t;
}
function et(r) {
  if (!r || typeof r != "object")
    return {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1, reason: "Invalid module state", reason_code: "INVALID_STATE" },
      actions: {}
    };
  const e = r;
  return {
    enabled: e.enabled === !0,
    visible: e.visible === !0,
    entry: qt(e.entry),
    actions: Co(e.actions)
  };
}
function qt(r) {
  if (!r || typeof r != "object")
    return { enabled: !1 };
  const e = r;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function Co(r) {
  if (!r || typeof r != "object")
    return {};
  const e = r, t = {};
  for (const [s, n] of Object.entries(e))
    n && typeof n == "object" && (t[s] = qt(n));
  return t;
}
function $o(r) {
  if (!r || typeof r != "object")
    return {};
  const e = r;
  return {
    cms: e.cms === !0,
    dashboard: e.dashboard === !0
  };
}
function Eo(r) {
  if (!r || typeof r != "object")
    return {};
  const e = {}, t = r;
  for (const [s, n] of Object.entries(t))
    typeof n == "string" && (e[s] = n);
  return e;
}
function ko(r) {
  return Array.isArray(r) ? r.filter((e) => typeof e == "string") : [];
}
function Ao(r) {
  return Array.isArray(r) ? r.filter((e) => typeof e == "string") : [];
}
function Lo(r) {
  return Array.isArray(r) ? r.filter((e) => typeof e == "string") : [];
}
class Ot {
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
    return e === "exchange" ? vo(t) : wo(t);
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
    const s = this.getModuleState(e);
    return s && s.actions[t] || null;
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
      const s = t.actions[e.action];
      if (!s)
        return {
          visible: !0,
          enabled: !1,
          reason: `Action ${e.action} not configured`,
          reasonCode: "ACTION_NOT_CONFIGURED"
        };
      if (!s.enabled)
        return {
          visible: !0,
          enabled: !1,
          reason: s.reason || `Missing ${e.action} permission`,
          reasonCode: s.reason_code || "PERMISSION_DENIED",
          permission: s.permission
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
function tt(r) {
  const e = xo(r);
  return e ? new Ot(e) : null;
}
function Pi() {
  return new Ot({
    profile: "none",
    capability_mode: "none",
    supported_profiles: ["none", "core", "core+exchange", "core+queue", "full"],
    schema_version: 0,
    modules: {},
    features: {},
    routes: {},
    panels: [],
    resolver_keys: [],
    warnings: []
  });
}
function Bi(r) {
  return r.visible ? r.enabled ? "" : `aria-disabled="true"${r.reason ? ` title="${jt(r.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function _o(r) {
  if (r.enabled || !r.reason)
    return "";
  const e = (r.reasonCode || "").trim();
  return e ? lt(e, { size: "sm", showFullMessage: !0 }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${jt(r.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${Ro(r.reason)}
    </span>
  `.trim();
}
function Ro(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function jt(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Di() {
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
function To(r, e) {
  if (!e.visible) {
    r.style.display = "none", r.setAttribute("aria-hidden", "true");
    return;
  }
  r.style.display = "", r.removeAttribute("aria-hidden"), e.enabled ? (r.removeAttribute("aria-disabled"), r.classList.remove("capability-gate-disabled"), r.removeAttribute("title"), delete r.dataset.reasonCode, r.removeEventListener("click", rt, !0)) : (r.setAttribute("aria-disabled", "true"), r.classList.add("capability-gate-disabled"), e.reason && (r.setAttribute("title", e.reason), r.dataset.reasonCode = e.reasonCode || ""), r.addEventListener("click", rt, !0));
}
function rt(r) {
  r.currentTarget.getAttribute("aria-disabled") === "true" && (r.preventDefault(), r.stopPropagation());
}
function Fi(r, e) {
  r.querySelectorAll("[data-capability-gate]").forEach((s) => {
    const n = s.dataset.capabilityGate;
    if (n)
      try {
        const o = JSON.parse(n), a = e.gateNavItem(o);
        To(s, a);
      } catch {
        console.warn("Invalid capability gate config:", n);
      }
  });
}
const Io = {
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
}, Mo = [
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
class Po {
  constructor(e) {
    this.container = null, this.state = "loading", this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || Mo,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: { ...Io, ...e.labels || {} }
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
      const e = this.config.filterPresets.find((o) => o.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), s = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, n = await fetch(s, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!n.ok)
        throw new Error(`Failed to load: ${n.status}`);
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
      <div class="translator-dashboard" role="region" aria-label="${S(e.title)}">
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
        <h2 class="dashboard-title">${S(e.title)}</h2>
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
  renderSummaryCard(e, t, s, n) {
    return `
      <div class="summary-card ${n}" role="listitem" data-summary="${e}">
        <div class="summary-count">${s}</div>
        <div class="summary-label">${S(t)}</div>
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
    const t = this.activePreset === e.id, s = e.badge?.() ?? null, n = s !== null ? `<span class="filter-badge">${s}</span>` : "";
    return `
      <button type="button"
              class="filter-preset ${t ? "active" : ""}"
              role="tab"
              aria-selected="${t}"
              data-preset="${e.id}">
        ${e.icon || ""}
        <span class="filter-label">${S(e.label)}</span>
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
        <p>${S(e.loading)}</p>
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
        <p class="error-message">${S(e.error)}</p>
        ${this.error ? `<p class="error-detail">${S(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${S(e.retry)}</button>
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
        <p class="empty-title">${S(e.noAssignments)}</p>
        <p class="empty-description">${S(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  /**
   * Render disabled state (TX-101: visible-disabled module/dashboard UX).
   * Shows the dashboard structure but with disabled controls and a reason badge.
   * This is distinct from error state (transport failure) and empty state (no data).
   */
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? _o(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${S(e)}</p>
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
    return this.activePreset === "due_soon" && (t = t.filter((s) => s.due_state === "due_soon" || s.due_state === "overdue")), t.length === 0 ? this.renderEmpty() : `
      <div class="dashboard-assignment-list">
        <table class="assignment-table" role="grid" aria-label="Translation assignments">
          <thead>
            <tr>
              <th scope="col">${S(e.sourceTitle)}</th>
              <th scope="col">${S(e.targetLocale)}</th>
              <th scope="col">${S(e.status)}</th>
              <th scope="col">${S(e.dueDate)}</th>
              <th scope="col">${S(e.priority)}</th>
              <th scope="col" class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${t.map((s) => this.renderAssignmentRow(s)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderAssignmentRow(e) {
    this.config.labels;
    const t = Bo(e.due_state), s = Do(e.priority), n = X(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), o = e.due_date ? qo(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${G(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${S(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${S(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${S(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${S(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${n}
        </td>
        <td class="due-cell ${t}">
          ${o}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${s}">${S(Fo(e.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(e)}
        </td>
      </tr>
    `;
  }
  renderAssignmentActions(e) {
    const t = this.config.labels, s = [], n = typeof this.config.onActionClick == "function";
    s.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${G(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const o = e.review_actions;
    return n && e.queue_state === "in_progress" && o.submit_review.enabled && s.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${G(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), n && e.queue_state === "review" && (o.approve.enabled && s.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${G(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), o.reject.enabled && s.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${G(t.reject)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        `)), `<div class="action-buttons">${s.join("")}</div>`;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".dashboard-refresh-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelectorAll(".filter-preset").forEach((a) => {
      a.addEventListener("click", () => {
        const i = a.dataset.preset;
        i && this.setActivePreset(i);
      });
    }), this.container.querySelectorAll(".assignment-row").forEach((a) => {
      const i = a.dataset.assignmentId;
      if (!i || !this.data) return;
      const l = this.data.assignments.find((d) => d.id === i);
      if (!l) return;
      a.querySelectorAll(".action-btn").forEach((d) => {
        d.addEventListener("click", async (u) => {
          u.stopPropagation();
          const p = d.dataset.action;
          p && (p === "open" ? this.openAssignment(l) : typeof this.config.onActionClick == "function" && await this.config.onActionClick(p, l));
        });
      }), a.addEventListener("click", () => {
        this.openAssignment(l);
      });
    }), this.container.querySelectorAll(".summary-card").forEach((a) => {
      a.addEventListener("click", () => {
        const i = a.dataset.summary;
        i === "review" ? this.setActivePreset("review") : i === "due_soon" || i === "overdue" ? this.setActivePreset("due_soon") : this.setActivePreset("all");
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
    const s = e.entity_type.trim(), n = e.target_record_id.trim() || e.source_record_id.trim();
    return !s || !n ? "" : `${t}/${encodeURIComponent(s)}/${encodeURIComponent(n)}/edit`;
  }
}
function S(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function G(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Bo(r) {
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
function Do(r) {
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
function Fo(r) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function qo(r) {
  const e = /* @__PURE__ */ new Date(), t = r.getTime() - e.getTime(), s = Math.ceil(t / (1e3 * 60 * 60 * 24));
  return s < 0 ? `${Math.abs(s)}d overdue` : s === 0 ? "Today" : s === 1 ? "Tomorrow" : s <= 7 ? `${s}d` : r.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function qi() {
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
function Oo(r, e) {
  const t = new Po(e);
  return t.mount(r), t;
}
function Oi(r) {
  return jo(r);
}
function jo(r, e = {}) {
  const t = r.dataset.myWorkEndpoint;
  if (!t)
    return console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const s = zo(e);
  return Oo(r, {
    myWorkEndpoint: t,
    panelBaseUrl: r.dataset.panelBaseUrl,
    queueEndpoint: r.dataset.queueEndpoint,
    refreshInterval: parseInt(r.dataset.refreshInterval || "0", 10),
    capabilityGate: s || void 0
  });
}
function zo(r) {
  if (r.capabilityGate)
    return r.capabilityGate;
  if (r.capabilitiesPayload !== void 0)
    return tt(r.capabilitiesPayload);
  const e = No();
  return e === null ? null : tt(e);
}
function No() {
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
const Go = {
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
class Ho {
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
    const t = { ...Go, ...e.labels || {} };
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
        const n = await fetch(this.config.validateEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: this.rawData
        });
        if (!n.ok)
          throw new Error(`Validation failed: ${n.status}`);
        const o = await n.json();
        return this.handleValidationResult(o), o;
      } else
        throw new Error("No file or data to validate");
      const t = await fetch(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok)
        throw new Error(`Validation failed: ${t.status}`);
      const s = await t.json();
      return this.handleValidationResult(s), s;
    } catch (e) {
      return this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  /**
   * Apply the import with selected rows
   */
  async apply(e) {
    const t = { ...this.applyOptions, ...e }, s = t.selectedIndices || this.getSelectedIndices();
    if (s.length === 0)
      return this.error = new Error(this.config.labels.noRowsSelected), this.render(), null;
    if (this.config.capabilityGate) {
      const n = this.config.capabilityGate.gateAction("exchange", "import.apply");
      if (!n.enabled)
        return this.error = new Error(n.reason || this.config.labels.applyDisabledReason), this.render(), null;
    }
    this.state = "applying", this.error = null, this.render();
    try {
      const a = {
        rows: (this.validationResult?.results.filter(
          (c) => s.includes(c.index)
        ) || []).map((c) => {
          const d = this.previewRows.find((u) => u.index === c.index);
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
      }, i = await fetch(this.config.applyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(a)
      });
      if (!i.ok)
        throw new Error(`Apply failed: ${i.status}`);
      const l = await i.json();
      return this.state = "applied", this.config.onApplyComplete?.(l), this.render(), l;
    } catch (n) {
      return this.error = n instanceof Error ? n : new Error(String(n)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
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
    const s = this.previewRows.find((n) => n.index === e);
    s && (s.resolution = t, this.render());
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
      <div class="exchange-import" role="dialog" aria-label="${m(e.title)}">
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
        <h3 class="import-title">${m(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${m(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${m(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${m(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${m(t.skipped)}</span>
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
          <span class="dropzone-text">${m(e.selectFile)}</span>
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
        <p>${m(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, s = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${m(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${m(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${s} ${m(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${m(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${m(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${m(e.dryRun)}
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
                <th scope="col">${m(e.resource)}</th>
                <th scope="col">${m(e.field)}</th>
                <th scope="col">${m(e.status)}</th>
                <th scope="col">${m(e.translatedText)}</th>
                <th scope="col">${m(e.conflictResolution)}</th>
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
    const t = at(e.status, "exchange"), s = e.status === "error", n = X(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${s ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${m(e.resource)}</span>
          <span class="entity-id">${m(e.entityId)}</span>
        </td>
        <td class="field-cell">${m(e.fieldPath)}</td>
        <td class="status-cell">
          ${n}
          ${e.error ? `<span class="error-message" title="${ee(e.error)}">${m(Uo(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${ee(e.targetLocale)}">${m(e.targetLocale)}</span>
        </td>
        <td class="resolution-cell">
          ${e.status === "conflict" ? this.renderConflictResolution(e) : "-"}
        </td>
      </tr>
    `;
  }
  renderConflictResolution(e) {
    const t = this.config.labels, s = e.resolution || "skip";
    return `
      <select class="resolution-select" data-index="${e.index}">
        <option value="skip" ${s === "skip" ? "selected" : ""}>${m(t.skip)}</option>
        <option value="keep_current" ${s === "keep_current" ? "selected" : ""}>${m(t.keepCurrent)}</option>
        <option value="accept_incoming" ${s === "accept_incoming" ? "selected" : ""}>${m(t.acceptIncoming)}</option>
        <option value="force" ${s === "force" ? "selected" : ""}>${m(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${ee(t.conflictDetails)}">?</button>` : ""}
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
        <p class="error-message">${m(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${m(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, s = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${m(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${m(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !s.enabled ? "disabled" : ""}
                  ${s.enabled ? "" : `aria-disabled="true" title="${ee(s.reason || e.applyDisabledReason)}"`}>
            ${m(e.applyButton)}
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
    this.container.querySelector(".file-input")?.addEventListener("change", (h) => {
      const f = h.target;
      f.files?.[0] && this.setFile(f.files[0]);
    }), this.container.querySelector(".data-input")?.addEventListener("input", (h) => {
      const f = h.target;
      this.rawData = f.value;
    }), this.container.querySelector(".validate-btn")?.addEventListener("click", () => this.validate()), this.container.querySelector(".apply-btn")?.addEventListener("click", () => this.apply()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".reset-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".select-all-btn")?.addEventListener("click", () => this.selectAll()), this.container.querySelector(".deselect-all-btn")?.addEventListener("click", () => this.deselectAll()), this.container.querySelector(".select-all-checkbox")?.addEventListener("change", (h) => {
      h.target.checked ? this.selectAll() : this.deselectAll();
    }), this.container.querySelectorAll(".row-checkbox").forEach((h) => {
      h.addEventListener("change", () => {
        const f = h.closest(".preview-row"), w = parseInt(f?.dataset.index || "", 10);
        isNaN(w) || this.toggleRowSelection(w);
      });
    }), this.container.querySelectorAll(".resolution-select").forEach((h) => {
      h.addEventListener("change", () => {
        const f = parseInt(h.dataset.index || "", 10);
        isNaN(f) || this.setRowResolution(f, h.value);
      });
    }), this.container.querySelectorAll(".option-checkbox input").forEach((h) => {
      h.addEventListener("change", () => {
        const f = h.name;
        f && this.setApplyOption(f, h.checked);
      });
    });
  }
}
function m(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ee(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Uo(r, e) {
  return r.length <= e ? r : r.slice(0, e - 3) + "...";
}
function ji() {
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
function Vo(r, e) {
  const t = new Ho(e);
  return t.mount(r), t;
}
function zi(r) {
  const e = r.dataset.validateEndpoint, t = r.dataset.applyEndpoint;
  return !e || !t ? (console.warn("ExchangeImport: Missing required data attributes"), null) : Vo(r, {
    validateEndpoint: e,
    applyEndpoint: t
  });
}
const Ko = {
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
}, Jo = 2e3, Yo = 300, Qo = "async_job_";
class zt {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = { ...Ko, ...e.labels || {} };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || Qo,
      pollInterval: e.pollInterval || Jo,
      maxPollAttempts: e.maxPollAttempts || Yo,
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
      const t = this.getStorageKey(e.kind), s = localStorage.getItem(t);
      if (s) {
        const n = JSON.parse(s);
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
  // Rendering
  render() {
    if (!this.container) return;
    const e = this.config.labels;
    this.container.innerHTML = `
      <div class="async-progress" role="region" aria-label="${C(e.title)}">
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
          <h4 class="progress-title">${C(e.title)}</h4>
          <span class="progress-status">${C(e.noActiveJob)}</span>
        </div>
      `;
    const t = at(this.job.status, "exchange"), s = this.getStatusLabel(), n = this.pollingState === "paused" ? `<span class="progress-status ${t}">${C(s)}</span>` : X(this.job.status, { domain: "exchange", size: "sm" });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${C(e.title)}</h4>
        ${n}
      </div>
    `;
  }
  renderContent() {
    if (!this.job)
      return "";
    const e = this.config.labels, t = this.job.progress;
    t.total || t.processed + 1;
    const s = t.total ? Math.round(t.processed / t.total * 100) : null;
    return `
      <div class="progress-content">
        ${this.renderProgressBar(s)}
        <div class="progress-counters">
          <span class="counter processed">
            <span class="counter-label">${C(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${C(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${C(e.failedCount)}:</span>
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
          <span class="info-label">${C(e.jobId)}:</span>
          <code class="info-value">${C(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${C(e.elapsed)}:</span>
            <span class="info-value">${C(t)}</span>
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
          <span class="conflicts-label">${C(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([s, n]) => `
              <span class="conflict-type">
                <span class="type-name">${C(s)}:</span>
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
        <span class="error-message">${C(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${C(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${C(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${C(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${C(e.dismiss)}</button>`), t.length === 0 ? "" : `
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
    const t = (/* @__PURE__ */ new Date()).getTime() - this.startTime.getTime(), s = Math.floor(t / 1e3);
    if (s < 60)
      return `${s}s`;
    const n = Math.floor(s / 60), o = s % 60;
    if (n < 60)
      return `${n}m ${o}s`;
    const a = Math.floor(n / 60), i = n % 60;
    return `${a}h ${i}m`;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".resume-btn")?.addEventListener("click", () => this.resumePolling()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.stopPolling()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.retry()), this.container.querySelector(".dismiss-btn")?.addEventListener("click", () => this.reset());
  }
}
function C(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Ni() {
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
function Wo(r, e) {
  const t = new zt(e);
  return t.mount(r), t;
}
function Gi(r) {
  const e = r.dataset.pollInterval ? parseInt(r.dataset.pollInterval, 10) : void 0, t = r.dataset.autoStart !== "false";
  return Wo(r, {
    pollInterval: e,
    autoStart: t
  });
}
function Hi(r, e) {
  const t = new zt(e);
  return t.hasPersistedJob(r) ? t : null;
}
const me = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function Xo(r) {
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
    const s = t.changed_fields_summary;
    s && typeof s == "object" && (e.changedFieldsSummary.count = typeof s.count == "number" ? s.count : 0, e.changedFieldsSummary.fields = Array.isArray(s.fields) ? s.fields.filter((n) => typeof n == "string") : []), e.hasDrift = e.changedFieldsSummary.count > 0 || e.changedFieldsSummary.fields.length > 0;
  }
  return e;
}
function Zo(r, e) {
  return !r || !r.hasDrift ? !1 : r.changedFieldsSummary.fields.some(
    (t) => t.toLowerCase() === e.toLowerCase()
  );
}
function Ui(r) {
  return !r || !r.hasDrift ? [] : [...r.changedFieldsSummary.fields];
}
class ea {
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
      labels: { ...me, ...e.labels }
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
    const { drift: e, labels: t, sourceLocale: s, targetLocale: n, fields: o } = this.config, a = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", i = o.map((l) => this.renderFieldRow(l, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${s}" data-target-locale="${n}">
        ${a}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${R(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${s.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${R(t.targetColumn)}</span>
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
  /**
   * Render the drift warning banner
   */
  renderDriftBanner(e, t) {
    const s = { ...me, ...t }, n = e.changedFieldsSummary.count, o = e.changedFieldsSummary.fields, a = o.length > 0 ? `<ul class="sbs-drift-fields-list">${o.map((i) => `<li>${R(i)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${R(s.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${R(s.driftBannerDescription)}
            ${n > 0 ? `<span class="sbs-drift-count">${n} field${n !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${a}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${R(s.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  /**
   * Render a single field row
   */
  renderFieldRow(e, t) {
    const s = { ...me, ...t }, n = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${R(s.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", o = this.renderSourceField(e), a = this.renderTargetField(e), i = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${$(e.key)}"
              title="${$(s.copySourceButton)}"
              aria-label="${$(s.copySourceButton)} for ${$(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${$(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${R(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${n}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${o}
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
  /**
   * Render source field (read-only)
   */
  renderSourceField(e) {
    const t = R(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${$(e.key)}"
             aria-label="Source: ${$(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${$(e.key)}"
           aria-label="Source: ${$(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  /**
   * Render target field (editable)
   */
  renderTargetField(e) {
    const t = R(e.targetValue || ""), s = e.placeholder ? `placeholder="${$(e.placeholder)}"` : "", n = e.required ? "required" : "", o = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${$(e.key)}"
                  data-field="${$(e.key)}"
                  aria-label="Translation: ${$(e.label)}"
                  ${s}
                  ${n}
                  ${o}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${$(e.key)}"
             data-field="${$(e.key)}"
             value="${t}"
             aria-label="Translation: ${$(e.label)}"
             ${s}
             ${n}
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
      t.addEventListener("click", (s) => {
        const n = s.currentTarget.dataset.field;
        n && this.copySourceToTarget(n);
      });
    }), this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      t.addEventListener("input", (s) => {
        const n = s.target, o = n.dataset.field;
        o && this.config.onChange && this.config.onChange(o, n.value);
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
    const t = this.config.fields.find((n) => n.key === e);
    if (!t) return;
    const s = this.container?.querySelector(
      `.sbs-target-input[data-field="${e}"]`
    );
    if (s) {
      s.value = t.sourceValue || "";
      const n = new Event("input", { bubbles: !0 });
      s.dispatchEvent(n);
    }
    this.config.onCopySource && this.config.onCopySource(e);
  }
  /**
   * Get current field values
   */
  getValues() {
    const e = {};
    return this.container && this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      const s = t.dataset.field;
      s && (e[s] = t.value);
    }), e;
  }
  /**
   * Set field value programmatically
   */
  setValue(e, t) {
    const s = this.container?.querySelector(
      `.sbs-target-input[data-field="${e}"]`
    );
    s && (s.value = t);
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
function ta(r) {
  const e = new ea(r);
  return e.render(), e;
}
function Vi(r, e, t, s, n) {
  const o = Xo(e), a = s.map((i) => ({
    key: i,
    label: i.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    type: "text",
    hasSourceChanged: Zo(o, i),
    sourceValue: String(t[i] || ""),
    targetValue: String(e[i] || ""),
    sourceLocale: n.sourceLocale || "en",
    targetLocale: n.targetLocale || ""
  }));
  return ta({
    container: r,
    fields: a,
    drift: o,
    sourceLocale: n.sourceLocale || "en",
    targetLocale: n.targetLocale || "",
    panelName: n.panelName || "",
    recordId: n.recordId || "",
    ...n
  });
}
function Ki() {
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
function R(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function $(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export {
  Yt as ActionRenderer,
  za as AdvancedSearch,
  zt as AsyncProgress,
  Pt as AutosaveIndicator,
  be as CORE_READINESS_DISPLAY,
  Ot as CapabilityGate,
  fr as CellRendererRegistry,
  go as CharacterCounter,
  Gs as ColumnManager,
  Ta as CommonRenderers,
  Mo as DEFAULT_FILTER_PRESETS,
  Ft as DEFAULT_INTERPOLATION_PATTERNS,
  fo as DEFAULT_SAMPLE_VALUES,
  me as DEFAULT_SIDE_BY_SIDE_LABELS,
  zn as DEFAULT_STATUS_LEGEND_ITEMS,
  At as DEFAULT_TRANSLATION_QUICK_FILTERS,
  Ce as DISABLED_REASON_DISPLAY,
  Ae as DataGrid,
  Fn as DefaultColumnVisibilityBehavior,
  bo as DirectionToggle,
  Se as EXCHANGE_JOB_STATUS_DISPLAY,
  xe as EXCHANGE_ROW_STATUS_DISPLAY,
  Ho as ExchangeImport,
  je as FallbackBanner,
  Na as FilterBuilder,
  Ja as GoCrudBulkActionBehavior,
  Ka as GoCrudExportBehavior,
  Ha as GoCrudFilterBehavior,
  Ua as GoCrudPaginationBehavior,
  Ga as GoCrudSearchBehavior,
  Va as GoCrudSortBehavior,
  _t as InlineLocaleChips,
  mo as InterpolationPreview,
  Tt as KeyboardShortcutRegistry,
  ut as LocalDataGridStateStore,
  le as LocaleActionChip,
  qn as PayloadInputModal,
  Cr as PreferencesDataGridStateStore,
  ve as QUEUE_CONTENT_STATE_DISPLAY,
  we as QUEUE_DUE_STATE_DISPLAY,
  ye as QUEUE_STATE_DISPLAY,
  Gn as QuickFilters,
  jn as SchemaActionBuilder,
  Ya as ServerColumnVisibilityBehavior,
  ea as SideBySideEditor,
  kt as StatusLegend,
  qe as TranslationBlockerModal,
  Un as TranslationPanel,
  Po as TranslatorDashboard,
  Qn as applyFormLock,
  To as applyGateToElement,
  io as applyShortcutSettings,
  Ze as buildLocaleEditUrl,
  Qa as buildSchemaRowActions,
  Hi as checkForPersistedJob,
  Ba as collapseAllGroups,
  Wo as createAsyncProgress,
  ai as createBulkCreateMissingHandler,
  tt as createCapabilityGate,
  $r as createDataGridStateStore,
  Pi as createEmptyCapabilityGate,
  Vo as createExchangeImport,
  bi as createInlineLocaleChipsRenderer,
  rr as createLocaleBadgeRenderer,
  ga as createReasonCodeCellRenderer,
  ta as createSideBySideEditor,
  fa as createStatusCellRenderer,
  Nn as createStatusLegend,
  Ci as createTranslationAutosave,
  _a as createTranslationMatrixRenderer,
  si as createTranslationPanel,
  Hn as createTranslationQuickFilters,
  ro as createTranslationShortcuts,
  He as createTranslationStatusRenderer,
  Oo as createTranslatorDashboard,
  zr as decodeExpandedGroupsToken,
  Ti as detectInterpolations,
  oo as dismissShortcutHint,
  qa as encodeExpandedGroupsToken,
  Vn as executeBulkCreateMissing,
  Pa as expandAllGroups,
  Br as extractBackendSummaries,
  xo as extractCapabilities,
  Qi as extractExchangeError,
  Wa as extractSchemaActions,
  Xo as extractSourceTargetDrift,
  P as extractTranslationContext,
  _ as extractTranslationReadiness,
  Rt as formatShortcutDisplay,
  Wi as generateExchangeReport,
  ua as getAllReasonCodes,
  Ni as getAsyncProgressStyles,
  Ei as getAutosaveIndicatorStyles,
  Di as getCapabilityGateStyles,
  Ui as getChangedFields,
  Ii as getCharCountSeverity,
  xi as getDefaultShortcutRegistry,
  ne as getDisabledReasonDisplay,
  ji as getExchangeImportStyles,
  Da as getExpandedGroupIds,
  Ri as getFieldHelperStyles,
  di as getFormLockReason,
  T as getLocaleLabel,
  La as getMissingTranslationsCount,
  eo as getModifierSymbol,
  Dr as getPersistedExpandState,
  jr as getPersistedViewMode,
  Zn as getPrimaryModifierLabel,
  pa as getSeverityCssClass,
  Ki as getSideBySideEditorStyles,
  at as getStatusCssClass,
  j as getStatusDisplay,
  ba as getStatusVocabularyStyles,
  da as getStatusesForDomain,
  qi as getTranslatorDashboardStyles,
  Be as getViewModeForViewport,
  Xi as groupRowResultsByStatus,
  pt as hasBackendGroupedRows,
  Zo as hasFieldDrift,
  Aa as hasMissingTranslations,
  va as hasTranslationContext,
  wa as hasTranslationReadiness,
  Gi as initAsyncProgress,
  Fi as initCapabilityGating,
  zi as initExchangeImport,
  hi as initFallbackBanner,
  Ai as initFieldHelpers,
  ki as initFormAutosave,
  fi as initFormLock,
  mi as initInlineLocaleChips,
  lo as initKeyboardShortcuts,
  Si as initKeyboardShortcutsWithDiscovery,
  li as initLocaleActionChips,
  ti as initQuickFilters,
  Vi as initSideBySideEditorFromRecord,
  Za as initStatusLegends,
  Oi as initTranslatorDashboard,
  jo as initTranslatorDashboardWithOptions,
  ma as initializeVocabularyFromPayload,
  Mi as isCoreEnabled,
  vo as isExchangeEnabled,
  Zi as isExchangeError,
  ci as isFormLocked,
  ya as isInFallbackMode,
  ce as isMacPlatform,
  Jr as isNarrowViewport,
  wo as isQueueEnabled,
  xa as isReadyForTransition,
  no as isShortcutHintDismissed,
  ca as isValidReasonCode,
  la as isValidStatus,
  so as loadShortcutSettings,
  Pr as mergeBackendSummaries,
  kr as normalizeBackendGroupedRows,
  yo as parseCapabilityMode,
  el as parseImportResult,
  St as parseViewMode,
  Ia as persistExpandState,
  Fa as persistViewMode,
  Wn as removeFormLock,
  $i as renderAutosaveIndicator,
  Wt as renderAvailableLocalesIndicator,
  oi as renderBulkResultInline,
  ni as renderBulkResultSummary,
  Li as renderCharacterCounter,
  _i as renderDirectionToggle,
  _o as renderDisabledReasonBadge,
  ao as renderDiscoveryHint,
  ui as renderFallbackBannerFromRecord,
  Ra as renderFallbackWarning,
  Bi as renderGateAriaAttributes,
  Ur as renderGroupHeaderRow,
  Nr as renderGroupHeaderSummary,
  Kr as renderGroupedEmptyState,
  ja as renderGroupedErrorState,
  Oa as renderGroupedLoadingState,
  Xn as renderInlineLocaleChips,
  Lt as renderLocaleActionChip,
  ii as renderLocaleActionList,
  ct as renderLocaleBadge,
  Ea as renderLocaleCompleteness,
  ka as renderMissingTranslationsBadge,
  $a as renderPublishReadinessBadge,
  ri as renderQuickFiltersHTML,
  Ca as renderReadinessIndicator,
  lt as renderReasonCodeBadge,
  ha as renderReasonCodeIndicator,
  wi as renderShortcutSettingsUI,
  yi as renderShortcutsHelpContent,
  Sa as renderStatusBadge,
  ei as renderStatusLegendHTML,
  er as renderTranslationMatrixCell,
  Xt as renderTranslationStatusCell,
  X as renderVocabularyStatusBadge,
  it as renderVocabularyStatusIcon,
  vi as saveShortcutSettings,
  pi as shouldShowFallbackBanner,
  gi as shouldShowInlineLocaleChips,
  Xa as showTranslationBlocker,
  Ma as toggleGroupExpand,
  Er as transformToGroups
};
//# sourceMappingURL=index.js.map

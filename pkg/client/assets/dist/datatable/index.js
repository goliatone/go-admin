import { F as et } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as Yr, executeActionRequest as cr, isTranslationBlocker as Wn, extractTranslationBlocker as Qn, formatStructuredErrorForDisplay as Zn } from "../toast/error-helpers.js";
import { extractExchangeError as kd, generateExchangeReport as Ad, groupRowResultsByStatus as Ld, isExchangeError as _d, parseImportResult as Td } from "../toast/error-helpers.js";
import { M as Xr, e as w, T as kr } from "../chunks/modal-DXPBR0f5.js";
import { b as bt, a as es } from "../chunks/badge-CqKzZ9y5.js";
import { r as ts } from "../chunks/icon-renderer-CRbgoQtj.js";
let rs = class Wr extends Xr {
  constructor(e, t, n) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = n;
  }
  static prompt(e) {
    return new Promise((t) => {
      new Wr(
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
          <h3 class="text-lg font-semibold text-gray-900">${w(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${w(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${w(this.config.confirmLabel ?? "Continue")}
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${w(e.description)}</p>` : "", n = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${w(e.label)}
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
      return `<option value="${w(o.value)}"${i}>${w(o.label)}</option>`;
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${w(e.value)}</textarea>
      `;
    const n = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${n}"
             data-payload-field="${e.name}"
             value="${w(e.value)}"
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
class ns {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new et(), this.actionKeys = /* @__PURE__ */ new WeakMap(), this.actionKeySeq = 0;
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
      const i = this.getVariantClass(o.variant || "secondary"), a = o.icon ? this.renderIcon(o.icon) : "", l = o.className || "", c = o.disabled === !0, d = this.getActionKey(o), u = c ? "opacity-50 cursor-not-allowed" : "", p = c ? 'aria-disabled="true"' : "", f = o.disabledReason ? `title="${this.escapeHtml(o.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${i} ${l} ${u}"
          data-action-id="${this.sanitize(o.label)}"
          data-action-key="${d}"
          data-record-id="${e.id}"
          data-disabled="${c}"
          ${p}
          ${f}
        >
          ${a}
          ${this.sanitize(o.label)}
        </button>
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
      const o = n.variant === "danger", i = n.disabled === !0, a = this.getActionKey(n), l = n.icon ? this.renderIcon(n.icon) : "", d = this.shouldShowDivider(n, s, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", u = i ? "action-item text-gray-400 cursor-not-allowed" : o ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", p = i ? 'aria-disabled="true"' : "", f = n.disabledReason ? `title="${this.escapeHtml(n.disabledReason)}"` : "";
      return `
        ${d}
        <button type="button"
                class="${u} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(n.label)}"
                data-action-key="${a}"
                data-record-id="${e.id}"
                data-disabled="${i}"
                role="menuitem"
                ${p}
                ${f}>
          <span class="flex-shrink-0 w-5 h-5">${l}</span>
          <span class="text-sm font-medium">${this.escapeHtml(n.label)}</span>
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
        d && l.addEventListener("click", async (u) => {
          if (u.preventDefault(), !(l.getAttribute("aria-disabled") === "true" || l.dataset.disabled === "true"))
            try {
              await s.action(d);
            } catch (p) {
              console.error(`Action "${s.label}" failed:`, p);
              const f = p instanceof Error ? p.message : `Action "${s.label}" failed`;
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
        const s = await fetch(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(n)
        });
        if (!s.ok) {
          const i = await Yr(s);
          throw this.notifier.error(i), new Error(i);
        }
        const o = await s.json();
        this.notifier.success(this.buildBulkSuccessMessage(e, o, t.length)), e.onSuccess && e.onSuccess(o);
      } catch (s) {
        if (console.error(`Bulk action "${e.id}" failed:`, s), !e.onError) {
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
      const c = s?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        return this.notifier.error(u.error), null;
      n[l] = u.value;
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
    return rs.prompt({
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
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
const L = {
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
}, Vt = {
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
}, Kt = {
  pending: {
    label: "Pending",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: L.clock,
    iconType: "svg",
    severity: "neutral",
    description: "Waiting to be assigned"
  },
  assigned: {
    label: "Assigned",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: L.user,
    iconType: "svg",
    severity: "info",
    description: "Assigned to a translator"
  },
  in_progress: {
    label: "In Progress",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: L.play,
    iconType: "svg",
    severity: "info",
    description: "Translation in progress"
  },
  review: {
    label: "In Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: L.document,
    iconType: "svg",
    severity: "info",
    description: "Pending review"
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: L.error,
    iconType: "svg",
    severity: "error",
    description: "Translation rejected"
  },
  approved: {
    label: "Approved",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: L.check,
    iconType: "svg",
    severity: "success",
    description: "Translation approved"
  },
  published: {
    label: "Published",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: L.check,
    iconType: "svg",
    severity: "success",
    description: "Translation published"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: L.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Translation archived"
  }
}, Jt = {
  draft: {
    label: "Draft",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: L.document,
    iconType: "svg",
    severity: "neutral",
    description: "Draft content"
  },
  review: {
    label: "Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: L.document,
    iconType: "svg",
    severity: "info",
    description: "Content under review"
  },
  ready: {
    label: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: L.check,
    iconType: "svg",
    severity: "success",
    description: "Content ready"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: L.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Content archived"
  }
}, Yt = {
  overdue: {
    label: "Overdue",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: L.warning,
    iconType: "svg",
    severity: "error",
    description: "Past due date"
  },
  due_soon: {
    label: "Due Soon",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: L.clock,
    iconType: "svg",
    severity: "warning",
    description: "Due within 24 hours"
  },
  on_track: {
    label: "On Track",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: L.check,
    iconType: "svg",
    severity: "success",
    description: "On schedule"
  },
  none: {
    label: "No Due Date",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: L.clock,
    iconType: "svg",
    severity: "neutral",
    description: "No due date set"
  }
}, Xt = {
  success: {
    label: "Success",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: L.check,
    iconType: "svg",
    severity: "success",
    description: "Import/export succeeded"
  },
  error: {
    label: "Error",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: L.error,
    iconType: "svg",
    severity: "error",
    description: "Import/export failed"
  },
  conflict: {
    label: "Conflict",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: L.warning,
    iconType: "svg",
    severity: "warning",
    description: "Conflicting changes detected"
  },
  skipped: {
    label: "Skipped",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: L.ban,
    iconType: "svg",
    severity: "neutral",
    description: "Row skipped"
  }
}, Wt = {
  running: {
    label: "Running",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: L.play,
    iconType: "svg",
    severity: "info",
    description: "Job in progress"
  },
  completed: {
    label: "Completed",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: L.check,
    iconType: "svg",
    severity: "success",
    description: "Job completed successfully"
  },
  failed: {
    label: "Failed",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: L.error,
    iconType: "svg",
    severity: "error",
    description: "Job failed"
  }
}, Qt = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: L.warning,
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
    icon: L.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: L.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: L.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: L.ban,
    severity: "info",
    actionable: !1
  }
};
function De(r, e) {
  const t = r.toLowerCase();
  if ((!e || e === "core") && t in Vt)
    return Vt[t];
  if (!e || e === "queue") {
    if (t in Kt)
      return Kt[t];
    if (t in Jt)
      return Jt[t];
    if (t in Yt)
      return Yt[t];
  }
  if (!e || e === "exchange") {
    if (t in Xt)
      return Xt[t];
    if (t in Wt)
      return Wt[t];
  }
  return null;
}
function Et(r) {
  const e = r.toUpperCase();
  return e in Qt ? Qt[e] : null;
}
function ql(r, e) {
  return De(r, e) !== null;
}
function jl(r) {
  return Et(r) !== null;
}
function Nl(r) {
  switch (r) {
    case "core":
      return Object.keys(Vt);
    case "queue":
      return [
        ...Object.keys(Kt),
        ...Object.keys(Jt),
        ...Object.keys(Yt)
      ];
    case "exchange":
      return [
        ...Object.keys(Xt),
        ...Object.keys(Wt)
      ];
    default:
      return [];
  }
}
function zl() {
  return Object.keys(Qt);
}
function Qr(r, e) {
  return De(r, e) ? `status-${r.toLowerCase()}` : "";
}
function Gl(r, e) {
  const t = De(r, e);
  return t ? `severity-${t.severity}` : "";
}
function tt(r, e = {}) {
  const t = De(r, e.domain);
  if (!t)
    return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${X(r)}</span>`;
  const { size: n = "default", showIcon: s = !0, showLabel: o = !0, extraClass: i = "" } = e, a = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs"
  }, l = s ? Zr(t, n) : "", c = o ? `<span>${X(t.label)}</span>` : "";
  return `<span class="inline-flex items-center ${s && o ? "gap-1" : ""} rounded font-medium ${a[n]} ${t.colorClass} ${i}"
                title="${X(t.description || t.label)}"
                aria-label="${X(t.label)}"
                data-status="${X(r)}">
    ${l}${c}
  </span>`;
}
function Zr(r, e = "default") {
  const t = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  return r.iconType === "char" ? `<span class="${t[e]} inline-flex items-center justify-center" aria-hidden="true">${r.icon}</span>` : `<svg class="${t[e]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function en(r, e = {}) {
  const t = Et(r);
  if (!t)
    return `<span class="text-gray-500 text-xs">${X(r)}</span>`;
  const { size: n = "default", showIcon: s = !0, showFullMessage: o = !1, extraClass: i = "" } = e, a = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, c = s ? `<svg class="${n === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
      </svg>` : "", d = o ? t.message : t.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${a[n]} ${t.colorClass} ${i}"
                role="status"
                aria-label="${X(t.message)}"
                data-reason-code="${X(r)}">
    ${c}
    <span>${X(d)}</span>
  </span>`;
}
function Hl(r, e) {
  const t = Et(r);
  if (!t)
    return "";
  const n = e || t.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${t.bgClass} ${t.textClass}"
                title="${X(n)}"
                aria-label="${X(t.shortMessage)}"
                data-reason-code="${X(r)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function Ul(r = {}) {
  return (e) => typeof e != "string" || !e ? '<span class="text-gray-400">-</span>' : tt(e, r);
}
function Vl(r = {}) {
  return (e) => typeof e != "string" || !e ? "" : en(e, r);
}
function Kl(r) {
  r.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", r.schema_version);
}
function Jl() {
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
function X(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function me(r) {
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
  return !r || typeof r != "object" || (e.requestedLocale = xe(r, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = xe(r, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = us(r, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = Lr(r, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = Lr(r, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = xe(r, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = xe(r, ["status"]), e.entityType = xe(r, ["entity_type", "type", "_type"]), e.recordId = xe(r, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function Yl(r) {
  const e = me(r);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Xl(r) {
  const e = me(r);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function Z(r) {
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
    e.hasReadinessMetadata = !0, e.translationGroupId = xe(r, [
      "translation_readiness.translation_group_id",
      "translation_group_id",
      "translation.meta.translation_group_id",
      "content_translation.meta.translation_group_id",
      "translation_context.translation_group_id"
    ]), e.requiredLocales = Array.isArray(t.required_locales) ? t.required_locales.filter((i) => typeof i == "string") : [], e.availableLocales = Array.isArray(t.available_locales) ? t.available_locales.filter((i) => typeof i == "string") : [], e.missingRequiredLocales = Array.isArray(t.missing_required_locales) ? t.missing_required_locales.filter((i) => typeof i == "string") : [];
    const n = t.missing_required_fields_by_locale;
    if (n && typeof n == "object" && !Array.isArray(n))
      for (const [i, a] of Object.entries(n))
        Array.isArray(a) && (e.missingRequiredFieldsByLocale[i] = a.filter(
          (l) => typeof l == "string"
        ));
    const s = t.readiness_state;
    typeof s == "string" && ss(s) && (e.readinessState = s);
    const o = t.ready_for_transition;
    if (o && typeof o == "object" && !Array.isArray(o))
      for (const [i, a] of Object.entries(o))
        typeof a == "boolean" && (e.readyForTransition[i] = a);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function Wl(r) {
  return Z(r).hasReadinessMetadata;
}
function Ql(r, e) {
  return Z(r).readyForTransition[e] === !0;
}
function ss(r) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(r);
}
function tn(r, e = {}) {
  const t = "resolvedLocale" in r ? r : me(r), { showFallbackIndicator: n = !0, size: s = "default", extraClass: o = "" } = e;
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
function os(r, e = {}) {
  const t = "resolvedLocale" in r ? r : me(r), { maxLocales: n = 3, size: s = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const o = s === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", i = s === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, n), l = t.availableLocales.length - n, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${i} rounded bg-blue-100 text-blue-700 font-medium` : `${i} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${i} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${o}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function is(r, e = {}) {
  const t = "resolvedLocale" in r ? r : me(r), { showResolvedLocale: n = !0, size: s = "default" } = e, o = [];
  return n && t.resolvedLocale && o.push(tn(t, { size: s, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && o.push(os(t, { ...e, size: s })), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${s === "sm" ? "gap-1" : "gap-2"}">${o.join("")}</div>`;
}
function Zl(r, e = "default") {
  if (!r)
    return "";
  const t = r.trim();
  if (De(t) !== null)
    return tt(t, { size: e === "sm" ? "sm" : "default" });
  const n = t.toLowerCase();
  return bt(r, "status", n, { size: e === "sm" ? "sm" : void 0 });
}
function ec(r, e = {}) {
  const t = Z(r);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: n = "default", showDetailedTooltip: s = !0, extraClass: o = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: p, tooltip: f } = as(l, t, s);
  return `<span class="${a} ${u} ${p} ${o}"
                title="${f}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function tc(r, e = {}) {
  const t = Z(r);
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
function rc(r, e = {}) {
  const t = Z(r);
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
function nc(r, e = {}) {
  const t = Z(r);
  if (!t.hasReadinessMetadata || t.readinessState === "ready")
    return "";
  const { size: n = "default", extraClass: s = "" } = e, o = n === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", i = t.missingRequiredLocales.length, a = i > 0, l = Object.keys(t.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", u = "", p = "";
  return a && l ? (c = "bg-red-100", d = "text-red-800", u = `${i} missing`, p = `Missing translations: ${t.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : a ? (c = "bg-amber-100", d = "text-amber-800", u = `${i} missing`, p = `Missing translations: ${t.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", u = "Incomplete", p = `Incomplete fields in: ${Object.keys(t.missingRequiredFieldsByLocale).join(", ")}`), u ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${o} ${c} ${d} ${s}"
                title="${p}"
                aria-label="${p}"
                data-missing-translations="true"
                data-missing-count="${i}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>` : "";
}
function sc(r) {
  const e = Z(r);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function oc(r) {
  return Z(r).missingRequiredLocales.length;
}
function as(r, e, t) {
  const n = De(r, "core"), s = n ? Zr(n, "sm") : "", o = n?.bgClass || "bg-gray-100", i = n?.textClass || "text-gray-600", a = n?.label || "Unknown", l = n?.description || "Unknown readiness state";
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
      const c = e.missingRequiredLocales, d = Object.keys(e.missingRequiredFieldsByLocale), u = [];
      c.length > 0 && u.push(`Missing: ${c.join(", ")}`), d.length > 0 && u.push(`Incomplete: ${d.join(", ")}`);
      const p = t ? u.join("; ") : "Missing translations and incomplete fields";
      return {
        icon: s,
        label: "Not ready",
        bgClass: o,
        textClass: i,
        tooltip: p
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
function ls(r, e = {}) {
  const { size: t = "sm", maxLocales: n = 5, showLabels: s = !1 } = e, o = Z(r);
  if (!o.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: i, availableLocales: a, missingRequiredFieldsByLocale: l } = o, c = i.length > 0 ? i : a;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(a), u = cs(l), p = c.slice(0, n).map((h) => {
    const m = d.has(h), S = m && u.has(h), x = m && !S;
    let k, B, _;
    x ? (k = "bg-green-100 text-green-700 border-green-300", B = "●", _ = "Complete") : S ? (k = "bg-amber-100 text-amber-700 border-amber-300", B = "◐", _ = "Incomplete") : (k = "bg-white text-gray-400 border-gray-300 border-dashed", B = "○", _ = "Missing");
    const A = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", q = s ? `<span class="font-medium">${h.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${A} rounded border ${k}"
              title="${h.toUpperCase()}: ${_}"
              aria-label="${h.toUpperCase()}: ${_}"
              data-locale="${h}"
              data-state="${_.toLowerCase()}">
          ${q}
          <span aria-hidden="true">${B}</span>
        </span>
      `;
  }).join(""), f = c.length > n ? `<span class="text-[10px] text-gray-500" title="${c.length - n} more locales">+${c.length - n}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${p}${f}</div>`;
}
function cs(r) {
  const e = /* @__PURE__ */ new Set();
  if (r && typeof r == "object")
    for (const [t, n] of Object.entries(r))
      Array.isArray(n) && n.length > 0 && e.add(t);
  return e;
}
function ic(r = {}) {
  return (e, t, n) => ls(t, r);
}
function ac(r, e = {}) {
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
function Ar(r = {}) {
  return (e, t, n) => is(t, r);
}
function ds(r = {}) {
  return (e, t, n) => tn(t, r);
}
function xe(r, e) {
  for (const t of e) {
    const n = dr(r, t);
    if (typeof n == "string" && n.trim())
      return n;
  }
  return null;
}
function us(r, e) {
  for (const t of e) {
    const n = dr(r, t);
    if (Array.isArray(n))
      return n.filter((s) => typeof s == "string");
  }
  return [];
}
function Lr(r, e) {
  for (const t of e) {
    const n = dr(r, t);
    if (typeof n == "boolean")
      return n;
    if (n === "true") return !0;
    if (n === "false") return !1;
  }
  return !1;
}
function dr(r, e) {
  const t = e.split(".");
  let n = r;
  for (const s of t) {
    if (n == null || typeof n != "object")
      return;
    n = n[s];
  }
  return n;
}
const ae = '<span class="text-gray-400">-</span>', ps = [
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
function Oe(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fs(r) {
  try {
    return JSON.stringify(r);
  } catch {
    return String(r);
  }
}
function hs(r) {
  const e = [], t = (s) => {
    if (typeof s != "string") return;
    const o = s.trim();
    !o || e.includes(o) || e.push(o);
  };
  t(r.display_key), t(r.displayKey);
  const n = r.display_keys ?? r.displayKeys;
  return Array.isArray(n) && n.forEach(t), e;
}
function gs(r, e) {
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
function ms(r) {
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
function Zt(r, e) {
  if (r == null)
    return "";
  if (Array.isArray(r))
    return er(r, e);
  if (typeof r != "object")
    return String(r);
  const n = [...hs(e), ...ps], s = /* @__PURE__ */ new Set();
  for (const o of n) {
    if (s.has(o)) continue;
    s.add(o);
    const i = gs(r, o), a = ms(i);
    if (a)
      return a;
  }
  return fs(r);
}
function er(r, e) {
  if (!Array.isArray(r) || r.length === 0)
    return "";
  const t = r.map((i) => Zt(i, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const n = Number(e.preview_limit ?? e.previewLimit ?? 3), s = Number.isFinite(n) && n > 0 ? Math.floor(n) : 3, o = t.slice(0, s);
  return t.length <= s ? o.join(", ") : `${o.join(", ")} +${t.length - s} more`;
}
function bs(r, e, t, n) {
  const s = r[e] ?? r[t] ?? n, o = Number(s);
  return Number.isFinite(o) && o > 0 ? Math.floor(o) : n;
}
function ys(r, e, t, n) {
  const s = r[e] ?? r[t];
  return s == null ? n : typeof s == "boolean" ? s : typeof s == "string" ? s.toLowerCase() === "true" || s === "1" : !!s;
}
function vs(r, e, t, n) {
  const s = r[e] ?? r[t];
  return s == null ? n : String(s).trim() || n;
}
function ws(r) {
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
function xs(r) {
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
class Ss {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return ae;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = er(e, {});
        return t ? Oe(t) : ae;
      }
      if (typeof e == "object") {
        const t = Zt(e, {});
        return t ? Oe(t) : ae;
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
      return bt(String(e), "status", t);
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
        return ae;
      const o = s?.options || {}, i = er(e, o);
      return i ? Oe(i) : ae;
    }), this.renderers.set("_object", (e, t, n, s) => {
      if (e == null)
        return ae;
      const o = s?.options || {}, i = Zt(e, o);
      return i ? Oe(i) : ae;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, n, s) => {
      if (!Array.isArray(e) || e.length === 0)
        return ae;
      const o = s?.options || {}, i = bs(o, "max_visible", "maxVisible", 3), a = ys(o, "show_count", "showCount", !0), l = vs(o, "chip_variant", "chipVariant", "default"), c = o.block_icons_map || o.blockIconsMap || {}, d = [], u = e.slice(0, i);
      for (const h of u) {
        const m = ws(h);
        if (!m) continue;
        const S = c[m] || "view-grid", x = ts(S, { size: "14px", extraClass: "flex-shrink-0" }), k = xs(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${k}">${x}<span>${Oe(m)}</span></span>`
        );
      }
      if (d.length === 0)
        return ae;
      const p = e.length - i;
      let f = "";
      return a && p > 0 && (f = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${p} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${f}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const n = t.name || t.username || t.email || "U", s = n.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${n}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${s}</div>`;
    });
  }
}
const lc = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (r) => (e) => {
    const t = String(e).toLowerCase();
    return bt(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (r) => (e) => {
    const t = String(e).toLowerCase();
    return bt(String(e), "role", t);
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
  booleanChip: (r) => (e) => es(!!e, r),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (r) => {
    if (!r) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(r), n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(n / 6e4), o = Math.floor(n / 36e5), i = Math.floor(n / 864e5);
      return s < 1 ? "Just now" : s < 60 ? `${s} minute${s > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : i < 30 ? `${i} day${i > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(r);
    }
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: ds(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: Ar(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: Ar({ size: "sm", maxLocales: 2 })
}, Cs = "datagrid.state.", It = "datagrid.share.", rn = "datagrid.share.index", Es = 20;
function $s(r) {
  return String(r || "").trim() || "default";
}
function Rt(r, e = {}) {
  if (!Array.isArray(r)) return;
  const t = r.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
  return t.length === 0 ? e.allowEmpty === !0 ? [] : void 0 : Array.from(new Set(t));
}
function Je(r) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const e = r, t = { version: 1 };
  (e.viewMode === "flat" || e.viewMode === "grouped" || e.viewMode === "matrix") && (t.viewMode = e.viewMode), (e.expandMode === "all" || e.expandMode === "none" || e.expandMode === "explicit") && (t.expandMode = e.expandMode);
  const n = Rt(e.expandedGroups, { allowEmpty: !0 });
  n !== void 0 && (t.expandedGroups = n);
  const s = Rt(e.hiddenColumns, { allowEmpty: !0 });
  s !== void 0 && (t.hiddenColumns = s);
  const o = Rt(e.columnOrder);
  return o && (t.columnOrder = o), typeof e.updatedAt == "number" && Number.isFinite(e.updatedAt) && (t.updatedAt = e.updatedAt), t;
}
function _r(r) {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const e = r, t = { version: 1 };
  if (typeof e.search == "string") {
    const s = e.search.trim();
    s && (t.search = s);
  }
  typeof e.page == "number" && Number.isFinite(e.page) && (t.page = Math.max(1, Math.trunc(e.page))), typeof e.perPage == "number" && Number.isFinite(e.perPage) && (t.perPage = Math.max(1, Math.trunc(e.perPage))), Array.isArray(e.filters) && (t.filters = e.filters), Array.isArray(e.sort) && (t.sort = e.sort);
  const n = Je(e.persisted);
  return n && (t.persisted = n), typeof e.updatedAt == "number" && Number.isFinite(e.updatedAt) && (t.updatedAt = e.updatedAt), t;
}
function ks(r) {
  const e = String(r || "").trim();
  return e ? e.replace(/\/+$/, "") : "/api/panels/preferences";
}
function As(r) {
  return String(r || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}
function Ls() {
  const r = Date.now().toString(36), e = Math.random().toString(36).slice(2, 10);
  return `${r}${e}`.slice(0, 16);
}
function _s(r) {
  try {
    const e = localStorage.getItem(rn);
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
function Ts(r) {
  try {
    localStorage.setItem(rn, JSON.stringify(r));
  } catch {
  }
}
class nn {
  constructor(e) {
    const t = $s(e.key);
    this.key = t, this.persistedStorageKey = `${Cs}${t}`, this.maxShareEntries = Math.max(1, e.maxShareEntries || Es);
  }
  loadPersistedState() {
    try {
      const e = localStorage.getItem(this.persistedStorageKey);
      return e ? Je(JSON.parse(e)) : null;
    } catch {
      return null;
    }
  }
  savePersistedState(e) {
    const t = Je(e);
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
    const t = _r(e);
    if (!t) return null;
    t.updatedAt || (t.updatedAt = Date.now());
    const n = Ls(), s = `${It}${n}`;
    try {
      localStorage.setItem(s, JSON.stringify(t));
      const o = _s(this.maxShareEntries).filter((i) => i.token !== n);
      for (o.unshift({ token: n, updatedAt: t.updatedAt }); o.length > this.maxShareEntries; ) {
        const i = o.pop();
        i && localStorage.removeItem(`${It}${i.token}`);
      }
      return Ts(o), n;
    } catch {
      return null;
    }
  }
  resolveShareState(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    try {
      const n = localStorage.getItem(`${It}${t}`);
      return n ? _r(JSON.parse(n)) : null;
    } catch {
      return null;
    }
  }
}
class Ds extends nn {
  constructor(e) {
    super(e), this.syncTimeout = null, this.preferencesEndpoint = ks(e.preferencesEndpoint), this.resource = As(e.resource) || this.key, this.syncDebounceMs = Math.max(100, e.syncDebounceMs || 1e3);
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
      const o = this.extractMap(s.effective), i = this.extractMap(s.raw), a = o[this.serverStateKey] ?? i[this.serverStateKey], l = Je(a);
      l && super.savePersistedState(l);
    } catch {
    }
  }
  savePersistedState(e) {
    super.savePersistedState(e);
    const t = Je(e);
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
    const t = e, n = Array.isArray(t.records) ? t.records : Array.isArray(t.data) ? t.data : [];
    if (n.length === 0) return null;
    const s = n[0];
    return !s || typeof s != "object" || Array.isArray(s) ? null : s;
  }
  extractMap(e) {
    return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
  }
}
function Is(r) {
  return (r.mode || "local") === "preferences" ? new Ds(r) : new nn(r);
}
function Rs(r, e = {}) {
  const {
    groupByField: t = "translation_group_id",
    defaultExpanded: n = !0,
    expandMode: s = "explicit",
    expandedGroups: o = /* @__PURE__ */ new Set()
  } = e, i = /* @__PURE__ */ new Map(), a = [];
  for (const c of r) {
    const d = js(c, t);
    if (d) {
      const u = i.get(d);
      u ? u.push(c) : i.set(d, [c]);
    } else
      a.push(c);
  }
  const l = [];
  for (const [c, d] of i) {
    const u = dn(d), p = on(c, s, o, n);
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
    ungrouped: a,
    totalGroups: l.length,
    totalRecords: r.length
  };
}
function sn(r) {
  if (r.length === 0)
    return !1;
  let e = !1;
  for (const t of r) {
    if (Ps(t)) {
      e = !0;
      continue;
    }
    if (an(t)) {
      e = !0;
      continue;
    }
    return !1;
  }
  return e;
}
function Ms(r, e = {}) {
  const {
    defaultExpanded: t = !0,
    expandMode: n = "explicit",
    expandedGroups: s = /* @__PURE__ */ new Set()
  } = e;
  if (!sn(r))
    return null;
  const o = [], i = [];
  let a = 0;
  for (const l of r) {
    if (an(l)) {
      i.push({ ...l }), a += 1;
      continue;
    }
    const c = Bs(l);
    if (!c)
      return null;
    const d = cn(l), u = Fs(l, d), p = on(c, n, s, t);
    o.push({
      groupId: c,
      displayLabel: qs(l, d),
      records: d,
      summary: u,
      expanded: p,
      summaryFromBackend: Os(l)
    }), a += d.length;
  }
  return {
    groups: o,
    ungrouped: i,
    totalGroups: o.length,
    totalRecords: a
  };
}
function on(r, e, t, n) {
  return e === "all" ? !t.has(r) : e === "none" ? t.has(r) : t.size === 0 ? n : t.has(r);
}
function Ps(r) {
  const e = r, t = typeof e.group_by == "string" ? e.group_by.trim().toLowerCase() : "", n = ln(r);
  if (!(t === "translation_group_id" || n === "group"))
    return !1;
  const o = cn(r);
  return Array.isArray(o);
}
function an(r) {
  return ln(r) === "ungrouped";
}
function ln(r) {
  const e = r._group;
  if (!e || typeof e != "object" || Array.isArray(e))
    return "";
  const t = e.row_type;
  return typeof t == "string" ? t.trim().toLowerCase() : "";
}
function Bs(r) {
  const e = r.translation_group_id;
  if (typeof e == "string" && e.trim())
    return e.trim();
  const t = r._group;
  if (!t || typeof t != "object" || Array.isArray(t))
    return null;
  const n = t.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function cn(r) {
  const e = r, t = Array.isArray(e.records) ? e.records : e.children;
  if (Array.isArray(t)) {
    const s = t.filter((o) => !!o && typeof o == "object" && !Array.isArray(o)).map((o) => ({ ...o }));
    if (s.length > 0)
      return s;
  }
  const n = e.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function Os(r) {
  const e = r.translation_group_summary;
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function Fs(r, e) {
  const t = r.translation_group_summary;
  if (!t || typeof t != "object" || Array.isArray(t))
    return dn(e);
  const n = t, s = Array.isArray(n.available_locales) ? n.available_locales.filter(Ee) : [], o = Array.isArray(n.missing_locales) ? n.missing_locales.filter(Ee) : [], i = un(n.readiness_state) ? n.readiness_state : null, a = Math.max(e.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : a,
    availableLocales: s,
    missingLocales: o,
    readinessState: i,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function qs(r, e) {
  const t = r.translation_group_label;
  if (typeof t == "string" && t.trim())
    return t.trim();
  const n = r.translation_group_summary;
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
function js(r, e) {
  const t = r[e];
  if (typeof t == "string" && t.trim())
    return t;
  const n = [
    `translation.meta.${e}`,
    `content_translation.meta.${e}`
  ];
  for (const s of n) {
    const o = Ns(r, s);
    if (typeof o == "string" && o.trim())
      return o;
  }
  return null;
}
function Ns(r, e) {
  const t = e.split(".");
  let n = r;
  for (const s of t) {
    if (n == null || typeof n != "object")
      return;
    n = n[s];
  }
  return n;
}
function dn(r) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let n = !1, s = 0;
  for (const i of r) {
    const a = i.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, u = a.readiness_state;
      Array.isArray(c) && c.filter(Ee).forEach((p) => e.add(p)), Array.isArray(d) && d.filter(Ee).forEach((p) => t.add(p)), (u === "missing_fields" || u === "missing_locales_and_fields") && (n = !0), u === "ready" && s++;
    }
    const l = i.available_locales;
    Array.isArray(l) && l.filter(Ee).forEach((c) => e.add(c));
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
function Ee(r) {
  return typeof r == "string";
}
function zs(r, e) {
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
function Gs(r) {
  const e = /* @__PURE__ */ new Map(), t = r.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [n, s] of Object.entries(t))
    if (s && typeof s == "object") {
      const o = s;
      e.set(n, {
        totalItems: typeof o.total_items == "number" ? o.total_items : void 0,
        availableLocales: Array.isArray(o.available_locales) ? o.available_locales.filter(Ee) : void 0,
        missingLocales: Array.isArray(o.missing_locales) ? o.missing_locales.filter(Ee) : void 0,
        readinessState: un(o.readiness_state) ? o.readiness_state : void 0,
        readyForPublish: typeof o.ready_for_publish == "boolean" ? o.ready_for_publish : void 0
      });
    }
  return e;
}
function un(r) {
  return r === "ready" || r === "missing_locales" || r === "missing_fields" || r === "missing_locales_and_fields";
}
const $t = "datagrid-expand-state-";
function tr(r) {
  if (!Array.isArray(r))
    return [];
  const e = [];
  for (const t of r) {
    const n = pr(t);
    if (n && !e.includes(n)) {
      if (e.length >= ur) break;
      e.push(n);
    }
  }
  return e;
}
function pn(r) {
  if (!r)
    return null;
  try {
    const e = JSON.parse(r);
    if (Array.isArray(e))
      return {
        version: 2,
        mode: "explicit",
        ids: tr(e)
      };
    if (!e || typeof e != "object" || Array.isArray(e))
      return null;
    const t = rt(e.mode, "explicit"), n = tr(e.ids);
    return { version: 2, mode: t, ids: n };
  } catch {
    return null;
  }
}
function Hs(r) {
  try {
    const e = $t + r, t = pn(localStorage.getItem(e));
    if (t)
      return new Set(t.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Us(r) {
  try {
    const e = $t + r, t = pn(localStorage.getItem(e));
    if (t)
      return t.mode;
  } catch {
  }
  return "explicit";
}
function Vs(r) {
  try {
    const e = $t + r;
    return localStorage.getItem(e) !== null;
  } catch {
    return !1;
  }
}
function cc(r, e, t = "explicit") {
  try {
    const n = $t + r, s = tr(Array.from(e)), o = {
      version: 2,
      mode: rt(t, "explicit"),
      ids: s
    };
    localStorage.setItem(n, JSON.stringify(o));
  } catch {
  }
}
function dc(r, e) {
  const t = r.groups.map((n) => n.groupId === e ? { ...n, expanded: !n.expanded } : n);
  return { ...r, groups: t };
}
function uc(r) {
  const e = r.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...r, groups: e };
}
function pc(r) {
  const e = r.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...r, groups: e };
}
function fc(r) {
  const e = /* @__PURE__ */ new Set();
  for (const t of r.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const fn = "datagrid-view-mode-", ur = 200, Ks = 256;
function rt(r, e = "explicit") {
  return r === "all" || r === "none" || r === "explicit" ? r : e;
}
function Js(r) {
  try {
    const e = fn + r, t = localStorage.getItem(e);
    if (t && hn(t))
      return t;
  } catch {
  }
  return null;
}
function hc(r, e) {
  try {
    const t = fn + r;
    localStorage.setItem(t, e);
  } catch {
  }
}
function hn(r) {
  return r === "flat" || r === "grouped" || r === "matrix";
}
function gn(r) {
  return r && hn(r) ? r : null;
}
function gc(r) {
  if (!(r instanceof Set) || r.size === 0)
    return "";
  const e = Array.from(new Set(
    Array.from(r).map((t) => pr(t)).filter((t) => t !== null)
  )).slice(0, ur).sort();
  return e.length === 0 ? "" : e.map((t) => encodeURIComponent(t)).join(",");
}
function Ys(r) {
  const e = /* @__PURE__ */ new Set();
  if (!r)
    return e;
  const t = r.split(",");
  for (const n of t) {
    if (e.size >= ur)
      break;
    if (!n)
      continue;
    let s = "";
    try {
      s = decodeURIComponent(n);
    } catch {
      continue;
    }
    const o = pr(s);
    o && e.add(o);
  }
  return e;
}
function pr(r) {
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
  return e.length > Ks ? null : e;
}
function Xs(r, e = {}) {
  const { summary: t } = r, { size: n = "sm" } = e, s = n === "sm" ? "text-xs" : "text-sm", o = t.availableLocales.length, i = t.missingLocales.length, a = o + i;
  let l = "";
  if (t.readinessState) {
    const u = Ws(t.readinessState);
    l = `
      <span class="${s} px-1.5 py-0.5 rounded ${u.bgClass} ${u.textClass}"
            title="${u.description}">
        ${u.icon} ${u.label}
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
function Ws(r) {
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
function Qs(r) {
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
function Zs(r, e, t = {}) {
  const { showExpandIcon: n = !0 } = t, s = n ? `<span class="expand-icon mr-2" aria-hidden="true">${r.expanded ? "▼" : "▶"}</span>` : "", o = Xs(r), i = fr(Qs(r)), a = r.records.length, l = a > 1 ? `<span class="ml-2 text-xs text-gray-500">(${a} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${eo(r.groupId)}"
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
function fr(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function eo(r) {
  return fr(r);
}
function to(r) {
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
function mc(r) {
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
function bc(r, e, t) {
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
          <p class="mt-1 text-sm text-gray-500">${fr(e)}</p>
          ${n}
        </div>
      </td>
    </tr>
  `;
}
function ro(r = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < r;
}
function hr(r, e = 768) {
  return ro(e) && r === "grouped" ? "flat" : r;
}
const Ye = "search", Xe = "page", We = "perPage", Qe = "filters", Ze = "sort", kt = "state", gr = "hiddenColumns", At = "view_mode", yt = "expanded_groups", mr = [
  Ye,
  Xe,
  We,
  Qe,
  Ze,
  kt,
  gr,
  At,
  yt
], mn = 1800, bn = 600;
function Tr(r, e) {
  const t = e.toString();
  return t ? `${r}?${t}` : r;
}
function no(r, e) {
  for (const t of e)
    r.delete(t);
}
function so(r) {
  const e = Math.max(
    256,
    r.config.urlState?.maxURLLength || mn
  ), t = Math.max(
    64,
    r.config.urlState?.maxFiltersLength || bn
  ), n = r.config.urlState?.enableStateToken !== !1;
  return {
    maxURLLength: e,
    maxFiltersLength: t,
    enableStateToken: n
  };
}
function oo(r, e, t) {
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
function io(r, e, t = {}) {
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
      const a = gn(e.viewMode);
      a && (r.state.viewMode = hr(a));
    }
    r.state.expandMode = rt(e.expandMode, r.state.expandMode), Array.isArray(e.expandedGroups) ? (r.state.expandedGroups = new Set(
      e.expandedGroups.map((a) => String(a || "").trim()).filter(Boolean)
    ), r.state.hasPersistedExpandState = !0) : e.expandMode !== void 0 && (r.state.hasPersistedExpandState = !0);
  }
}
function ao(r, e) {
  e.persisted && r.applyPersistedStateSnapshot(e.persisted, { merge: !0 }), typeof e.search == "string" && (r.state.search = e.search), typeof e.page == "number" && Number.isFinite(e.page) && (r.state.currentPage = Math.max(1, Math.trunc(e.page))), typeof e.perPage == "number" && Number.isFinite(e.perPage) && (r.state.perPage = Math.max(1, Math.trunc(e.perPage))), Array.isArray(e.filters) && (r.state.filters = e.filters), Array.isArray(e.sort) && (r.state.sort = e.sort);
}
function lo(r) {
  const e = {
    version: 1,
    hiddenColumns: Array.from(r.state.hiddenColumns),
    columnOrder: [...r.state.columnOrder],
    updatedAt: Date.now()
  };
  return r.config.enableGroupedMode && (e.viewMode = r.state.viewMode, e.expandMode = r.state.expandMode, e.expandedGroups = Array.from(r.state.expandedGroups)), e;
}
function co(r) {
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
function uo(r) {
  r.stateStore.savePersistedState(r.buildPersistedStateSnapshot());
}
function po(r) {
  const e = new URLSearchParams(window.location.search);
  r.didRestoreColumnOrder = !1, r.shouldReorderDOMOnRestore = !1, r.hasURLStateOverrides = mr.some((c) => e.has(c));
  const t = e.get(kt);
  if (t) {
    const c = r.stateStore.resolveShareState(t);
    c && r.applyShareStateSnapshot(c);
  }
  const n = e.get(Ye);
  if (n) {
    r.state.search = n;
    const c = document.querySelector(r.selectors.searchInput);
    c && (c.value = n);
  }
  const s = e.get(Xe);
  if (s) {
    const c = parseInt(s, 10);
    r.state.currentPage = Number.isNaN(c) ? 1 : Math.max(1, c);
  }
  const o = e.get(We);
  if (o) {
    const c = parseInt(o, 10), d = r.config.perPage || 10;
    r.state.perPage = Number.isNaN(c) ? d : Math.max(1, c);
    const u = document.querySelector(r.selectors.perPageSelect);
    u && (u.value = String(r.state.perPage));
  }
  const i = e.get(Qe);
  if (i) {
    const c = r.parseJSONArray(i, "filters");
    c && (r.state.filters = c);
  }
  const a = e.get(Ze);
  if (a) {
    const c = r.parseJSONArray(a, "sort");
    c && (r.state.sort = c);
  }
  if (r.config.enableGroupedMode) {
    const c = gn(e.get(At));
    c && (r.state.viewMode = hr(c)), e.has(yt) && (r.state.expandedGroups = Ys(
      e.get(yt)
    ), r.state.expandMode = "explicit", r.state.hasPersistedExpandState = !0);
  }
  const l = e.get(gr);
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
      const p = r.defaultColumns.map((h) => h.field);
      r.shouldReorderDOMOnRestore = p.join("|") !== u.join("|");
      const f = new Map(r.config.columns.map((h) => [h.field, h]));
      r.config.columns = u.map((h) => f.get(h)).filter((h) => h !== void 0);
    }
  }
  r.persistStateSnapshot(), console.log("[DataGrid] State restored from URL:", r.state), setTimeout(() => {
    r.applyRestoredState();
  }, 0);
}
function fo(r) {
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
function ho(r, e = {}) {
  r.persistStateSnapshot();
  const t = r.getURLStateConfig(), n = new URLSearchParams(window.location.search);
  no(n, mr), r.state.search && n.set(Ye, r.state.search), r.state.currentPage > 1 && n.set(Xe, String(r.state.currentPage)), r.state.perPage !== (r.config.perPage || 10) && n.set(We, String(r.state.perPage));
  let s = !1;
  if (r.state.filters.length > 0) {
    const a = JSON.stringify(r.state.filters);
    a.length <= t.maxFiltersLength ? n.set(Qe, a) : s = !0;
  }
  r.state.sort.length > 0 && n.set(Ze, JSON.stringify(r.state.sort)), r.config.enableGroupedMode && n.set(At, r.state.viewMode);
  let o = Tr(window.location.pathname, n);
  const i = o.length > t.maxURLLength;
  if (t.enableStateToken && (s || i)) {
    n.delete(Ye), n.delete(Xe), n.delete(We), n.delete(Qe), n.delete(Ze);
    const a = r.stateStore.createShareState(r.buildShareStateSnapshot());
    a && n.set(kt, a), o = Tr(window.location.pathname, n);
  }
  e.replace ? window.history.replaceState({}, "", o) : window.history.pushState({}, "", o), console.log("[DataGrid] URL updated:", o);
}
async function ne(r, e = {}) {
  const {
    json: t,
    idempotencyKey: n,
    accept: s,
    headers: o,
    ...i
  } = e, a = new Headers(o || {});
  s ? a.set("Accept", s) : a.has("Accept") || a.set("Accept", "application/json"), n && n.trim() && a.set("X-Idempotency-Key", n.trim());
  let l = i.body;
  return t !== void 0 && (a.has("Content-Type") || a.set("Content-Type", "application/json"), l = JSON.stringify(t)), fetch(r, {
    ...i,
    headers: a,
    body: l
  });
}
async function go(r, e = "Request failed") {
  try {
    const t = await r.text();
    if (t && t.trim())
      return t.trim();
  } catch {
  }
  return `${e}: ${r.status}`;
}
async function mo(r) {
  console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(r.state.sort)), r.abortController && r.abortController.abort(), r.abortController = new AbortController();
  try {
    const e = r.buildApiUrl(), t = await ne(e, {
      signal: r.abortController.signal,
      method: "GET",
      accept: "application/json"
    });
    if (!t.ok) {
      if (r.handleGroupedModeStatusFallback(t.status))
        return;
      throw new Error(`HTTP error! status: ${t.status}`);
    }
    const n = await t.json();
    console.log("[DataGrid] API Response:", n), console.log("[DataGrid] API Response data array:", n.data), console.log("[DataGrid] API Response total:", n.total, "count:", n.count, "$meta:", n.$meta);
    const s = n.data || n.records || [];
    if (r.handleGroupedModePayloadFallback(s))
      return;
    r.lastSchema = n.schema || null, r.lastForm = n.form || null;
    const o = r.getResponseTotal(n);
    if (r.normalizePagination(o))
      return r.refresh();
    console.log("[DataGrid] About to call renderData()..."), r.renderData(n), console.log("[DataGrid] renderData() completed"), r.updatePaginationUI(n), console.log("[DataGrid] ===== refresh() COMPLETED =====");
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.log("[DataGrid] Request aborted");
      return;
    }
    console.error("[DataGrid] Error fetching data:", e), r.showError("Failed to load data");
  }
}
function bo(r) {
  const e = new URLSearchParams(), t = r.buildQueryParams();
  Object.entries(t).forEach(([s, o]) => {
    o != null && e.append(s, String(o));
  });
  const n = `${r.config.apiEndpoint}?${e.toString()}`;
  return console.log(`[DataGrid] API URL: ${n}`), n;
}
function yo(r) {
  const e = new URLSearchParams(), t = r.buildQueryParams();
  return Object.entries(t).forEach(([n, s]) => {
    s != null && e.append(n, String(s));
  }), e.toString();
}
function vo(r) {
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
function wo(r, e) {
  return e.total !== void 0 && e.total !== null ? e.total : e.$meta?.count !== void 0 && e.$meta?.count !== null ? e.$meta.count : e.count !== void 0 && e.count !== null ? e.count : null;
}
function xo(r, e) {
  if (e === null)
    return !1;
  const t = Math.max(1, r.state.perPage || r.config.perPage || 10), n = Math.max(1, Math.ceil(e / t));
  let s = r.state.currentPage;
  e === 0 ? s = 1 : s > n ? s = n : s < 1 && (s = 1);
  const o = t !== r.state.perPage || s !== r.state.currentPage;
  return o && (r.state.perPage = t, r.state.currentPage = s, r.pushStateToURL()), e === 0 ? !1 : o;
}
async function So(r, e) {
  const t = await ne(`${r.config.apiEndpoint}/${e}`, {
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
function Co(r, e) {
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
function Eo(r) {
  return r.lastSchema;
}
function $o(r) {
  return r.lastForm;
}
function ko(r) {
  return r.lastSchema?.tabs || [];
}
function Ao(r, e, t, n) {
  const s = r.config.groupByField || "translation_group_id", o = t.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
  let i = Ms(o, {
    defaultExpanded: !r.state.hasPersistedExpandState,
    expandMode: r.state.expandMode,
    expandedGroups: r.state.expandedGroups
  });
  i || (i = Rs(o, {
    groupByField: s,
    defaultExpanded: !r.state.hasPersistedExpandState,
    expandMode: r.state.expandMode,
    expandedGroups: r.state.expandedGroups
  }));
  const a = Gs(e);
  a.size > 0 && (i = zs(i, a)), r.state.groupedData = i;
  const l = r.config.columns.length;
  for (const c of i.groups) {
    const d = Zs(c, l);
    n.insertAdjacentHTML("beforeend", d);
    const u = n.lastElementChild;
    u && (u.addEventListener("click", () => r.toggleGroup(c.groupId)), u.addEventListener("keydown", (p) => {
      (p.key === "Enter" || p.key === " ") && (p.preventDefault(), r.toggleGroup(c.groupId));
    }));
    for (const p of c.records) {
      p.id && (r.recordsById[p.id] = p);
      const f = r.createTableRow(p);
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
function Lo(r) {
  return r.config.enableGroupedMode ? r.state.viewMode === "grouped" || r.state.viewMode === "matrix" : !1;
}
function _o(r, e) {
  r.isGroupedViewActive() && (r.state.viewMode = "flat", r.state.groupedData = null, r.pushStateToURL({ replace: !0 }), r.notify(e, "warning"), r.refresh());
}
function To(r, e) {
  return !r.isGroupedViewActive() || ![400, 404, 405, 422].includes(e) ? !1 : (r.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
}
function Do(r, e) {
  if (!r.isGroupedViewActive() || e.length === 0)
    return !1;
  const t = e.filter((n) => !!n && typeof n == "object" && !Array.isArray(n));
  return t.length !== e.length || !sn(t) ? (r.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
}
function Io(r, e) {
  if (!r.state.groupedData) return;
  const t = String(e || "").trim();
  if (!t) return;
  const n = r.isGroupExpandedByState(t, !r.state.hasPersistedExpandState);
  r.state.expandMode === "all" ? n ? r.state.expandedGroups.add(t) : r.state.expandedGroups.delete(t) : r.state.expandMode === "none" ? n ? r.state.expandedGroups.delete(t) : r.state.expandedGroups.add(t) : (!r.state.hasPersistedExpandState && r.state.expandedGroups.size === 0 && (r.state.expandedGroups = new Set(r.state.groupedData.groups.map((o) => o.groupId))), r.state.expandedGroups.has(t) ? r.state.expandedGroups.delete(t) : r.state.expandedGroups.add(t)), r.state.hasPersistedExpandState = !0;
  const s = r.state.groupedData.groups.find((o) => o.groupId === t);
  s && (s.expanded = r.isGroupExpandedByState(t)), r.updateGroupVisibility(t), r.pushStateToURL({ replace: !0 });
}
function Ro(r, e) {
  if (!r.config.enableGroupedMode)
    return;
  const t = new Set(
    (e || []).map((n) => String(n || "").trim()).filter(Boolean)
  );
  r.state.expandMode = "explicit", r.state.expandedGroups = t, r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh();
}
function Mo(r) {
  r.config.enableGroupedMode && (r.state.expandMode = "all", r.state.expandedGroups.clear(), r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh());
}
function Po(r) {
  r.config.enableGroupedMode && (r.state.expandMode = "none", r.state.expandedGroups.clear(), r.state.hasPersistedExpandState = !0, r.updateGroupedRowsFromState(), r.pushStateToURL({ replace: !0 }), !r.state.groupedData && r.isGroupedViewActive() && r.refresh());
}
function Bo(r, e) {
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
function Oo(r) {
  if (r.state.groupedData)
    for (const e of r.state.groupedData.groups)
      e.expanded = r.isGroupExpandedByState(e.groupId), r.updateGroupVisibility(e.groupId);
}
function Fo(r, e, t = !1) {
  const n = rt(r.state.expandMode, "explicit");
  return n === "all" ? !r.state.expandedGroups.has(e) : n === "none" ? r.state.expandedGroups.has(e) : r.state.expandedGroups.size === 0 ? t : r.state.expandedGroups.has(e);
}
function qo(r, e) {
  if (!r.config.enableGroupedMode) {
    console.warn("[DataGrid] Grouped mode not enabled");
    return;
  }
  const t = hr(e);
  r.state.viewMode = t, t === "flat" && (r.state.groupedData = null), r.pushStateToURL(), r.refresh();
}
function jo(r) {
  return r.state.viewMode;
}
function No(r) {
  return r.state.groupedData;
}
function zo(r, e, t = !1) {
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
function Go(r) {
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
function Ho(r, e) {
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
    r.isGroupedViewActive() ? t.innerHTML = to(r.config.columns.length) : t.innerHTML = `
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
function Uo(r, e, t) {
  e.forEach((n, s) => {
    console.log(`[DataGrid] Rendering row ${s + 1}: id=${n.id}`), n.id && (r.recordsById[n.id] = n);
    const o = r.createTableRow(n);
    t.appendChild(o);
  }), console.log(`[DataGrid] Finished appending ${e.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length);
}
function Vo(r, e) {
  const t = e.rendererOptions ?? e.renderer_options;
  return !t || typeof t != "object" || Array.isArray(t) ? {} : t;
}
function Ko(r, e) {
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
    const c = e[a.field], d = typeof a.renderer == "string" ? a.renderer.trim() : "", u = {
      options: r.resolveRendererOptions(a)
    };
    if (a.render)
      l.innerHTML = a.render(c, e);
    else if (r.cellRendererRegistry.has(a.field)) {
      const p = r.cellRendererRegistry.get(a.field);
      l.innerHTML = p(c, e, a.field, u);
    } else if (d && r.cellRendererRegistry.has(d)) {
      const p = r.cellRendererRegistry.get(d);
      l.innerHTML = p(c, e, a.field, u);
    } else c == null ? l.textContent = "-" : a.field.includes("_at") ? l.textContent = new Date(c).toLocaleDateString() : l.textContent = String(c);
    t.appendChild(l);
  });
  const o = r.config.actionBasePath || r.config.apiEndpoint, i = document.createElement("td");
  if (i.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", i.dataset.role = "actions", i.dataset.fixed = "right", r.config.rowActions) {
    const a = r.config.rowActions(e);
    i.innerHTML = r.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
      const c = r.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
      l.disabled || d && d.addEventListener("click", async (u) => {
        if (u.preventDefault(), !d.disabled)
          try {
            await l.action(e);
          } catch (p) {
            console.error(`Action "${l.label}" failed:`, p);
            const f = p instanceof Error ? p.message : `Action "${l.label}" failed`;
            r.notify(f, "error");
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
      d && d.addEventListener("click", async (u) => {
        if (u.preventDefault(), u.stopPropagation(), !d.disabled)
          try {
            await l.action();
          } catch (p) {
            console.error(`Action "${l.label}" failed:`, p);
            const f = p instanceof Error ? p.message : `Action "${l.label}" failed`;
            r.notify(f, "error");
          }
      });
    });
  }
  return t.appendChild(i), t;
}
function Jo(r, e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
async function Yo(r, e) {
  if (await r.confirmAction("Are you sure you want to delete this item?"))
    try {
      if (!(await ne(`${r.config.apiEndpoint}/${e}`, {
        method: "DELETE",
        accept: "application/json"
      })).ok)
        throw new Error("Delete failed");
      await r.refresh();
    } catch (n) {
      console.error("Error deleting item:", n), r.showError("Failed to delete item");
    }
}
function Xo(r, e) {
  const t = r.getResponseTotal(e) ?? r.state.totalRows, n = r.state.perPage * (r.state.currentPage - 1), s = t === 0 ? 0 : n + 1, o = Math.min(n + r.state.perPage, t), i = document.querySelector(r.selectors.tableInfoStart), a = document.querySelector(r.selectors.tableInfoEnd), l = document.querySelector(r.selectors.tableInfoTotal);
  i && (i.textContent = String(s)), a && (a.textContent = String(o)), l && (l.textContent = String(t)), r.renderPaginationButtons(t);
}
function Wo(r, e) {
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
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function Dr(r, e) {
  var t = Object.keys(r);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(r);
    e && (n = n.filter(function(s) {
      return Object.getOwnPropertyDescriptor(r, s).enumerable;
    })), t.push.apply(t, n);
  }
  return t;
}
function oe(r) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Dr(Object(t), !0).forEach(function(n) {
      Qo(r, n, t[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : Dr(Object(t)).forEach(function(n) {
      Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n));
    });
  }
  return r;
}
function ut(r) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? ut = function(e) {
    return typeof e;
  } : ut = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, ut(r);
}
function Qo(r, e, t) {
  return e in r ? Object.defineProperty(r, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : r[e] = t, r;
}
function ce() {
  return ce = Object.assign || function(r) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var n in t)
        Object.prototype.hasOwnProperty.call(t, n) && (r[n] = t[n]);
    }
    return r;
  }, ce.apply(this, arguments);
}
function Zo(r, e) {
  if (r == null) return {};
  var t = {}, n = Object.keys(r), s, o;
  for (o = 0; o < n.length; o++)
    s = n[o], !(e.indexOf(s) >= 0) && (t[s] = r[s]);
  return t;
}
function ei(r, e) {
  if (r == null) return {};
  var t = Zo(r, e), n, s;
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(r);
    for (s = 0; s < o.length; s++)
      n = o[s], !(e.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(r, n) && (t[n] = r[n]);
  }
  return t;
}
var ti = "1.15.6";
function le(r) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(r);
}
var de = le(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), nt = le(/Edge/i), Ir = le(/firefox/i), Ge = le(/safari/i) && !le(/chrome/i) && !le(/android/i), br = le(/iP(ad|od|hone)/i), yn = le(/chrome/i) && le(/android/i), vn = {
  capture: !1,
  passive: !1
};
function E(r, e, t) {
  r.addEventListener(e, t, !de && vn);
}
function C(r, e, t) {
  r.removeEventListener(e, t, !de && vn);
}
function vt(r, e) {
  if (e) {
    if (e[0] === ">" && (e = e.substring(1)), r)
      try {
        if (r.matches)
          return r.matches(e);
        if (r.msMatchesSelector)
          return r.msMatchesSelector(e);
        if (r.webkitMatchesSelector)
          return r.webkitMatchesSelector(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
function wn(r) {
  return r.host && r !== document && r.host.nodeType ? r.host : r.parentNode;
}
function Q(r, e, t, n) {
  if (r) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? r.parentNode === t && vt(r, e) : vt(r, e)) || n && r === t)
        return r;
      if (r === t) break;
    } while (r = wn(r));
  }
  return null;
}
var Rr = /\s+/g;
function K(r, e, t) {
  if (r && e)
    if (r.classList)
      r.classList[t ? "add" : "remove"](e);
    else {
      var n = (" " + r.className + " ").replace(Rr, " ").replace(" " + e + " ", " ");
      r.className = (n + (t ? " " + e : "")).replace(Rr, " ");
    }
}
function b(r, e, t) {
  var n = r && r.style;
  if (n) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(r, "") : r.currentStyle && (t = r.currentStyle), e === void 0 ? t : t[e];
    !(e in n) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), n[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function _e(r, e) {
  var t = "";
  if (typeof r == "string")
    t = r;
  else
    do {
      var n = b(r, "transform");
      n && n !== "none" && (t = n + " " + t);
    } while (!e && (r = r.parentNode));
  var s = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return s && new s(t);
}
function xn(r, e, t) {
  if (r) {
    var n = r.getElementsByTagName(e), s = 0, o = n.length;
    if (t)
      for (; s < o; s++)
        t(n[s], s);
    return n;
  }
  return [];
}
function se() {
  var r = document.scrollingElement;
  return r || document.documentElement;
}
function P(r, e, t, n, s) {
  if (!(!r.getBoundingClientRect && r !== window)) {
    var o, i, a, l, c, d, u;
    if (r !== window && r.parentNode && r !== se() ? (o = r.getBoundingClientRect(), i = o.top, a = o.left, l = o.bottom, c = o.right, d = o.height, u = o.width) : (i = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && r !== window && (s = s || r.parentNode, !de))
      do
        if (s && s.getBoundingClientRect && (b(s, "transform") !== "none" || t && b(s, "position") !== "static")) {
          var p = s.getBoundingClientRect();
          i -= p.top + parseInt(b(s, "border-top-width")), a -= p.left + parseInt(b(s, "border-left-width")), l = i + o.height, c = a + o.width;
          break;
        }
      while (s = s.parentNode);
    if (n && r !== window) {
      var f = _e(s || r), h = f && f.a, m = f && f.d;
      f && (i /= m, a /= h, u /= h, d /= m, l = i + d, c = a + u);
    }
    return {
      top: i,
      left: a,
      bottom: l,
      right: c,
      width: u,
      height: d
    };
  }
}
function Mr(r, e, t) {
  for (var n = ge(r, !0), s = P(r)[e]; n; ) {
    var o = P(n)[t], i = void 0;
    if (i = s >= o, !i) return n;
    if (n === se()) break;
    n = ge(n, !1);
  }
  return !1;
}
function Te(r, e, t, n) {
  for (var s = 0, o = 0, i = r.children; o < i.length; ) {
    if (i[o].style.display !== "none" && i[o] !== y.ghost && (n || i[o] !== y.dragged) && Q(i[o], t.draggable, r, !1)) {
      if (s === e)
        return i[o];
      s++;
    }
    o++;
  }
  return null;
}
function yr(r, e) {
  for (var t = r.lastElementChild; t && (t === y.ghost || b(t, "display") === "none" || e && !vt(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function Y(r, e) {
  var t = 0;
  if (!r || !r.parentNode)
    return -1;
  for (; r = r.previousElementSibling; )
    r.nodeName.toUpperCase() !== "TEMPLATE" && r !== y.clone && (!e || vt(r, e)) && t++;
  return t;
}
function Pr(r) {
  var e = 0, t = 0, n = se();
  if (r)
    do {
      var s = _e(r), o = s.a, i = s.d;
      e += r.scrollLeft * o, t += r.scrollTop * i;
    } while (r !== n && (r = r.parentNode));
  return [e, t];
}
function ri(r, e) {
  for (var t in r)
    if (r.hasOwnProperty(t)) {
      for (var n in e)
        if (e.hasOwnProperty(n) && e[n] === r[t][n]) return Number(t);
    }
  return -1;
}
function ge(r, e) {
  if (!r || !r.getBoundingClientRect) return se();
  var t = r, n = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var s = b(t);
      if (t.clientWidth < t.scrollWidth && (s.overflowX == "auto" || s.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (s.overflowY == "auto" || s.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return se();
        if (n || e) return t;
        n = !0;
      }
    }
  while (t = t.parentNode);
  return se();
}
function ni(r, e) {
  if (r && e)
    for (var t in e)
      e.hasOwnProperty(t) && (r[t] = e[t]);
  return r;
}
function Mt(r, e) {
  return Math.round(r.top) === Math.round(e.top) && Math.round(r.left) === Math.round(e.left) && Math.round(r.height) === Math.round(e.height) && Math.round(r.width) === Math.round(e.width);
}
var He;
function Sn(r, e) {
  return function() {
    if (!He) {
      var t = arguments, n = this;
      t.length === 1 ? r.call(n, t[0]) : r.apply(n, t), He = setTimeout(function() {
        He = void 0;
      }, e);
    }
  };
}
function si() {
  clearTimeout(He), He = void 0;
}
function Cn(r, e, t) {
  r.scrollLeft += e, r.scrollTop += t;
}
function En(r) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(r).cloneNode(!0) : t ? t(r).clone(!0)[0] : r.cloneNode(!0);
}
function $n(r, e, t) {
  var n = {};
  return Array.from(r.children).forEach(function(s) {
    var o, i, a, l;
    if (!(!Q(s, e.draggable, r, !1) || s.animated || s === t)) {
      var c = P(s);
      n.left = Math.min((o = n.left) !== null && o !== void 0 ? o : 1 / 0, c.left), n.top = Math.min((i = n.top) !== null && i !== void 0 ? i : 1 / 0, c.top), n.right = Math.max((a = n.right) !== null && a !== void 0 ? a : -1 / 0, c.right), n.bottom = Math.max((l = n.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), n.width = n.right - n.left, n.height = n.bottom - n.top, n.x = n.left, n.y = n.top, n;
}
var U = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function oi() {
  var r = [], e;
  return {
    captureAnimationState: function() {
      if (r = [], !!this.options.animation) {
        var n = [].slice.call(this.el.children);
        n.forEach(function(s) {
          if (!(b(s, "display") === "none" || s === y.ghost)) {
            r.push({
              target: s,
              rect: P(s)
            });
            var o = oe({}, r[r.length - 1].rect);
            if (s.thisAnimationDuration) {
              var i = _e(s, !0);
              i && (o.top -= i.f, o.left -= i.e);
            }
            s.fromRect = o;
          }
        });
      }
    },
    addAnimationState: function(n) {
      r.push(n);
    },
    removeAnimationState: function(n) {
      r.splice(ri(r, {
        target: n
      }), 1);
    },
    animateAll: function(n) {
      var s = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof n == "function" && n();
        return;
      }
      var o = !1, i = 0;
      r.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = P(c), p = c.prevFromRect, f = c.prevToRect, h = a.rect, m = _e(c, !0);
        m && (u.top -= m.f, u.left -= m.e), c.toRect = u, c.thisAnimationDuration && Mt(p, u) && !Mt(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (h.top - u.top) / (h.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = ai(h, p, f, s.options)), Mt(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = s.options.animation), s.animate(c, h, u, l)), l && (o = !0, i = Math.max(i, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), o ? e = setTimeout(function() {
        typeof n == "function" && n();
      }, i) : typeof n == "function" && n(), r = [];
    },
    animate: function(n, s, o, i) {
      if (i) {
        b(n, "transition", ""), b(n, "transform", "");
        var a = _e(this.el), l = a && a.a, c = a && a.d, d = (s.left - o.left) / (l || 1), u = (s.top - o.top) / (c || 1);
        n.animatingX = !!d, n.animatingY = !!u, b(n, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = ii(n), b(n, "transition", "transform " + i + "ms" + (this.options.easing ? " " + this.options.easing : "")), b(n, "transform", "translate3d(0,0,0)"), typeof n.animated == "number" && clearTimeout(n.animated), n.animated = setTimeout(function() {
          b(n, "transition", ""), b(n, "transform", ""), n.animated = !1, n.animatingX = !1, n.animatingY = !1;
        }, i);
      }
    }
  };
}
function ii(r) {
  return r.offsetWidth;
}
function ai(r, e, t, n) {
  return Math.sqrt(Math.pow(e.top - r.top, 2) + Math.pow(e.left - r.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * n.animation;
}
var $e = [], Pt = {
  initializeByDefault: !0
}, st = {
  mount: function(e) {
    for (var t in Pt)
      Pt.hasOwnProperty(t) && !(t in e) && (e[t] = Pt[t]);
    $e.forEach(function(n) {
      if (n.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), $e.push(e);
  },
  pluginEvent: function(e, t, n) {
    var s = this;
    this.eventCanceled = !1, n.cancel = function() {
      s.eventCanceled = !0;
    };
    var o = e + "Global";
    $e.forEach(function(i) {
      t[i.pluginName] && (t[i.pluginName][o] && t[i.pluginName][o](oe({
        sortable: t
      }, n)), t.options[i.pluginName] && t[i.pluginName][e] && t[i.pluginName][e](oe({
        sortable: t
      }, n)));
    });
  },
  initializePlugins: function(e, t, n, s) {
    $e.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, ce(n, c.defaults);
      }
    });
    for (var o in e.options)
      if (e.options.hasOwnProperty(o)) {
        var i = this.modifyOption(e, o, e.options[o]);
        typeof i < "u" && (e.options[o] = i);
      }
  },
  getEventProperties: function(e, t) {
    var n = {};
    return $e.forEach(function(s) {
      typeof s.eventProperties == "function" && ce(n, s.eventProperties.call(t[s.pluginName], e));
    }), n;
  },
  modifyOption: function(e, t, n) {
    var s;
    return $e.forEach(function(o) {
      e[o.pluginName] && o.optionListeners && typeof o.optionListeners[t] == "function" && (s = o.optionListeners[t].call(e[o.pluginName], n));
    }), s;
  }
};
function li(r) {
  var e = r.sortable, t = r.rootEl, n = r.name, s = r.targetEl, o = r.cloneEl, i = r.toEl, a = r.fromEl, l = r.oldIndex, c = r.newIndex, d = r.oldDraggableIndex, u = r.newDraggableIndex, p = r.originalEvent, f = r.putSortable, h = r.extraEventProperties;
  if (e = e || t && t[U], !!e) {
    var m, S = e.options, x = "on" + n.charAt(0).toUpperCase() + n.substr(1);
    window.CustomEvent && !de && !nt ? m = new CustomEvent(n, {
      bubbles: !0,
      cancelable: !0
    }) : (m = document.createEvent("Event"), m.initEvent(n, !0, !0)), m.to = i || t, m.from = a || t, m.item = s || t, m.clone = o, m.oldIndex = l, m.newIndex = c, m.oldDraggableIndex = d, m.newDraggableIndex = u, m.originalEvent = p, m.pullMode = f ? f.lastPutMode : void 0;
    var k = oe(oe({}, h), st.getEventProperties(n, e));
    for (var B in k)
      m[B] = k[B];
    t && t.dispatchEvent(m), S[x] && S[x].call(e, m);
  }
}
var ci = ["evt"], G = function(e, t) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, s = n.evt, o = ei(n, ci);
  st.pluginEvent.bind(y)(e, t, oe({
    dragEl: g,
    parentEl: I,
    ghostEl: v,
    rootEl: T,
    nextEl: Se,
    lastDownEl: pt,
    cloneEl: D,
    cloneHidden: he,
    dragStarted: qe,
    putSortable: F,
    activeSortable: y.active,
    originalEvent: s,
    oldIndex: Le,
    oldDraggableIndex: Ue,
    newIndex: J,
    newDraggableIndex: fe,
    hideGhostForTarget: _n,
    unhideGhostForTarget: Tn,
    cloneNowHidden: function() {
      he = !0;
    },
    cloneNowShown: function() {
      he = !1;
    },
    dispatchSortableEvent: function(a) {
      z({
        sortable: t,
        name: a,
        originalEvent: s
      });
    }
  }, o));
};
function z(r) {
  li(oe({
    putSortable: F,
    cloneEl: D,
    targetEl: g,
    rootEl: T,
    oldIndex: Le,
    oldDraggableIndex: Ue,
    newIndex: J,
    newDraggableIndex: fe
  }, r));
}
var g, I, v, T, Se, pt, D, he, Le, J, Ue, fe, it, F, Ae = !1, wt = !1, xt = [], ye, W, Bt, Ot, Br, Or, qe, ke, Ve, Ke = !1, at = !1, ft, j, Ft = [], rr = !1, St = [], Lt = typeof document < "u", lt = br, Fr = nt || de ? "cssFloat" : "float", di = Lt && !yn && !br && "draggable" in document.createElement("div"), kn = function() {
  if (Lt) {
    if (de)
      return !1;
    var r = document.createElement("x");
    return r.style.cssText = "pointer-events:auto", r.style.pointerEvents === "auto";
  }
}(), An = function(e, t) {
  var n = b(e), s = parseInt(n.width) - parseInt(n.paddingLeft) - parseInt(n.paddingRight) - parseInt(n.borderLeftWidth) - parseInt(n.borderRightWidth), o = Te(e, 0, t), i = Te(e, 1, t), a = o && b(o), l = i && b(i), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + P(o).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + P(i).width;
  if (n.display === "flex")
    return n.flexDirection === "column" || n.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (n.display === "grid")
    return n.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (o && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return i && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return o && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= s && n[Fr] === "none" || i && n[Fr] === "none" && c + d > s) ? "vertical" : "horizontal";
}, ui = function(e, t, n) {
  var s = n ? e.left : e.top, o = n ? e.right : e.bottom, i = n ? e.width : e.height, a = n ? t.left : t.top, l = n ? t.right : t.bottom, c = n ? t.width : t.height;
  return s === a || o === l || s + i / 2 === a + c / 2;
}, pi = function(e, t) {
  var n;
  return xt.some(function(s) {
    var o = s[U].options.emptyInsertThreshold;
    if (!(!o || yr(s))) {
      var i = P(s), a = e >= i.left - o && e <= i.right + o, l = t >= i.top - o && t <= i.bottom + o;
      if (a && l)
        return n = s;
    }
  }), n;
}, Ln = function(e) {
  function t(o, i) {
    return function(a, l, c, d) {
      var u = a.options.group.name && l.options.group.name && a.options.group.name === l.options.group.name;
      if (o == null && (i || u))
        return !0;
      if (o == null || o === !1)
        return !1;
      if (i && o === "clone")
        return o;
      if (typeof o == "function")
        return t(o(a, l, c, d), i)(a, l, c, d);
      var p = (i ? a : l).options.group.name;
      return o === !0 || typeof o == "string" && o === p || o.join && o.indexOf(p) > -1;
    };
  }
  var n = {}, s = e.group;
  (!s || ut(s) != "object") && (s = {
    name: s
  }), n.name = s.name, n.checkPull = t(s.pull, !0), n.checkPut = t(s.put), n.revertClone = s.revertClone, e.group = n;
}, _n = function() {
  !kn && v && b(v, "display", "none");
}, Tn = function() {
  !kn && v && b(v, "display", "");
};
Lt && !yn && document.addEventListener("click", function(r) {
  if (wt)
    return r.preventDefault(), r.stopPropagation && r.stopPropagation(), r.stopImmediatePropagation && r.stopImmediatePropagation(), wt = !1, !1;
}, !0);
var ve = function(e) {
  if (g) {
    e = e.touches ? e.touches[0] : e;
    var t = pi(e.clientX, e.clientY);
    if (t) {
      var n = {};
      for (var s in e)
        e.hasOwnProperty(s) && (n[s] = e[s]);
      n.target = n.rootEl = t, n.preventDefault = void 0, n.stopPropagation = void 0, t[U]._onDragOver(n);
    }
  }
}, fi = function(e) {
  g && g.parentNode[U]._isOutsideThisEl(e.target);
};
function y(r, e) {
  if (!(r && r.nodeType && r.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(r));
  this.el = r, this.options = e = ce({}, e), r[U] = this;
  var t = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(r.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: !1,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: !0,
    direction: function() {
      return An(r, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(i, a) {
      i.setData("Text", a.textContent);
    },
    dropBubble: !1,
    dragoverBubble: !1,
    dataIdAttr: "data-id",
    delay: 0,
    delayOnTouchOnly: !1,
    touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
    forceFallback: !1,
    fallbackClass: "sortable-fallback",
    fallbackOnBody: !1,
    fallbackTolerance: 0,
    fallbackOffset: {
      x: 0,
      y: 0
    },
    // Disabled on Safari: #1571; Enabled on Safari IOS: #2244
    supportPointer: y.supportPointer !== !1 && "PointerEvent" in window && (!Ge || br),
    emptyInsertThreshold: 5
  };
  st.initializePlugins(this, r, t);
  for (var n in t)
    !(n in e) && (e[n] = t[n]);
  Ln(e);
  for (var s in this)
    s.charAt(0) === "_" && typeof this[s] == "function" && (this[s] = this[s].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : di, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? E(r, "pointerdown", this._onTapStart) : (E(r, "mousedown", this._onTapStart), E(r, "touchstart", this._onTapStart)), this.nativeDraggable && (E(r, "dragover", this), E(r, "dragenter", this)), xt.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), ce(this, oi());
}
y.prototype = /** @lends Sortable.prototype */
{
  constructor: y,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (ke = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, g) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, n = this.el, s = this.options, o = s.preventOnFilter, i = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = s.filter;
      if (xi(n), !g && !(/mousedown|pointerdown/.test(i) && e.button !== 0 || s.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Ge && l && l.tagName.toUpperCase() === "SELECT") && (l = Q(l, s.draggable, n, !1), !(l && l.animated) && pt !== l)) {
        if (Le = Y(l), Ue = Y(l, s.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            z({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: n,
              fromEl: n
            }), G("filter", t, {
              evt: e
            }), o && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = Q(c, u.trim(), n, !1), u)
            return z({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: n,
              toEl: n
            }), G("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          o && e.preventDefault();
          return;
        }
        s.handle && !Q(c, s.handle, n, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, n) {
    var s = this, o = s.el, i = s.options, a = o.ownerDocument, l;
    if (n && !g && n.parentNode === o) {
      var c = P(n);
      if (T = o, g = n, I = g.parentNode, Se = g.nextSibling, pt = n, it = i.group, y.dragged = g, ye = {
        target: g,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, Br = ye.clientX - c.left, Or = ye.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, g.style["will-change"] = "all", l = function() {
        if (G("delayEnded", s, {
          evt: e
        }), y.eventCanceled) {
          s._onDrop();
          return;
        }
        s._disableDelayedDragEvents(), !Ir && s.nativeDraggable && (g.draggable = !0), s._triggerDragStart(e, t), z({
          sortable: s,
          name: "choose",
          originalEvent: e
        }), K(g, i.chosenClass, !0);
      }, i.ignore.split(",").forEach(function(d) {
        xn(g, d.trim(), qt);
      }), E(a, "dragover", ve), E(a, "mousemove", ve), E(a, "touchmove", ve), i.supportPointer ? (E(a, "pointerup", s._onDrop), !this.nativeDraggable && E(a, "pointercancel", s._onDrop)) : (E(a, "mouseup", s._onDrop), E(a, "touchend", s._onDrop), E(a, "touchcancel", s._onDrop)), Ir && this.nativeDraggable && (this.options.touchStartThreshold = 4, g.draggable = !0), G("delayStart", this, {
        evt: e
      }), i.delay && (!i.delayOnTouchOnly || t) && (!this.nativeDraggable || !(nt || de))) {
        if (y.eventCanceled) {
          this._onDrop();
          return;
        }
        i.supportPointer ? (E(a, "pointerup", s._disableDelayedDrag), E(a, "pointercancel", s._disableDelayedDrag)) : (E(a, "mouseup", s._disableDelayedDrag), E(a, "touchend", s._disableDelayedDrag), E(a, "touchcancel", s._disableDelayedDrag)), E(a, "mousemove", s._delayedDragTouchMoveHandler), E(a, "touchmove", s._delayedDragTouchMoveHandler), i.supportPointer && E(a, "pointermove", s._delayedDragTouchMoveHandler), s._dragStartTimer = setTimeout(l, i.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    g && qt(g), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    C(e, "mouseup", this._disableDelayedDrag), C(e, "touchend", this._disableDelayedDrag), C(e, "touchcancel", this._disableDelayedDrag), C(e, "pointerup", this._disableDelayedDrag), C(e, "pointercancel", this._disableDelayedDrag), C(e, "mousemove", this._delayedDragTouchMoveHandler), C(e, "touchmove", this._delayedDragTouchMoveHandler), C(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? E(document, "pointermove", this._onTouchMove) : t ? E(document, "touchmove", this._onTouchMove) : E(document, "mousemove", this._onTouchMove) : (E(g, "dragend", this), E(T, "dragstart", this._onDragStart));
    try {
      document.selection ? ht(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (Ae = !1, T && g) {
      G("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && E(document, "dragover", fi);
      var n = this.options;
      !e && K(g, n.dragClass, !1), K(g, n.ghostClass, !0), y.active = this, e && this._appendGhost(), z({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (W) {
      this._lastX = W.clientX, this._lastY = W.clientY, _n();
      for (var e = document.elementFromPoint(W.clientX, W.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(W.clientX, W.clientY), e !== t); )
        t = e;
      if (g.parentNode[U]._isOutsideThisEl(e), t)
        do {
          if (t[U]) {
            var n = void 0;
            if (n = t[U]._onDragOver({
              clientX: W.clientX,
              clientY: W.clientY,
              target: e,
              rootEl: t
            }), n && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = wn(t));
      Tn();
    }
  },
  _onTouchMove: function(e) {
    if (ye) {
      var t = this.options, n = t.fallbackTolerance, s = t.fallbackOffset, o = e.touches ? e.touches[0] : e, i = v && _e(v, !0), a = v && i && i.a, l = v && i && i.d, c = lt && j && Pr(j), d = (o.clientX - ye.clientX + s.x) / (a || 1) + (c ? c[0] - Ft[0] : 0) / (a || 1), u = (o.clientY - ye.clientY + s.y) / (l || 1) + (c ? c[1] - Ft[1] : 0) / (l || 1);
      if (!y.active && !Ae) {
        if (n && Math.max(Math.abs(o.clientX - this._lastX), Math.abs(o.clientY - this._lastY)) < n)
          return;
        this._onDragStart(e, !0);
      }
      if (v) {
        i ? (i.e += d - (Bt || 0), i.f += u - (Ot || 0)) : i = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var p = "matrix(".concat(i.a, ",").concat(i.b, ",").concat(i.c, ",").concat(i.d, ",").concat(i.e, ",").concat(i.f, ")");
        b(v, "webkitTransform", p), b(v, "mozTransform", p), b(v, "msTransform", p), b(v, "transform", p), Bt = d, Ot = u, W = o;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!v) {
      var e = this.options.fallbackOnBody ? document.body : T, t = P(g, !0, lt, !0, e), n = this.options;
      if (lt) {
        for (j = e; b(j, "position") === "static" && b(j, "transform") === "none" && j !== document; )
          j = j.parentNode;
        j !== document.body && j !== document.documentElement ? (j === document && (j = se()), t.top += j.scrollTop, t.left += j.scrollLeft) : j = se(), Ft = Pr(j);
      }
      v = g.cloneNode(!0), K(v, n.ghostClass, !1), K(v, n.fallbackClass, !0), K(v, n.dragClass, !0), b(v, "transition", ""), b(v, "transform", ""), b(v, "box-sizing", "border-box"), b(v, "margin", 0), b(v, "top", t.top), b(v, "left", t.left), b(v, "width", t.width), b(v, "height", t.height), b(v, "opacity", "0.8"), b(v, "position", lt ? "absolute" : "fixed"), b(v, "zIndex", "100000"), b(v, "pointerEvents", "none"), y.ghost = v, e.appendChild(v), b(v, "transform-origin", Br / parseInt(v.style.width) * 100 + "% " + Or / parseInt(v.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var n = this, s = e.dataTransfer, o = n.options;
    if (G("dragStart", this, {
      evt: e
    }), y.eventCanceled) {
      this._onDrop();
      return;
    }
    G("setupClone", this), y.eventCanceled || (D = En(g), D.removeAttribute("id"), D.draggable = !1, D.style["will-change"] = "", this._hideClone(), K(D, this.options.chosenClass, !1), y.clone = D), n.cloneId = ht(function() {
      G("clone", n), !y.eventCanceled && (n.options.removeCloneOnHide || T.insertBefore(D, g), n._hideClone(), z({
        sortable: n,
        name: "clone"
      }));
    }), !t && K(g, o.dragClass, !0), t ? (wt = !0, n._loopId = setInterval(n._emulateDragOver, 50)) : (C(document, "mouseup", n._onDrop), C(document, "touchend", n._onDrop), C(document, "touchcancel", n._onDrop), s && (s.effectAllowed = "move", o.setData && o.setData.call(n, s, g)), E(document, "drop", n), b(g, "transform", "translateZ(0)")), Ae = !0, n._dragStartId = ht(n._dragStarted.bind(n, t, e)), E(document, "selectstart", n), qe = !0, window.getSelection().removeAllRanges(), Ge && b(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, n = e.target, s, o, i, a = this.options, l = a.group, c = y.active, d = it === l, u = a.sort, p = F || c, f, h = this, m = !1;
    if (rr) return;
    function S(Be, Yn) {
      G(Be, h, oe({
        evt: e,
        isOwner: d,
        axis: f ? "vertical" : "horizontal",
        revert: i,
        dragRect: s,
        targetRect: o,
        canSort: u,
        fromSortable: p,
        target: n,
        completed: k,
        onMove: function($r, Xn) {
          return ct(T, t, g, s, $r, P($r), e, Xn);
        },
        changed: B
      }, Yn));
    }
    function x() {
      S("dragOverAnimationCapture"), h.captureAnimationState(), h !== p && p.captureAnimationState();
    }
    function k(Be) {
      return S("dragOverCompleted", {
        insertion: Be
      }), Be && (d ? c._hideClone() : c._showClone(h), h !== p && (K(g, F ? F.options.ghostClass : c.options.ghostClass, !1), K(g, a.ghostClass, !0)), F !== h && h !== y.active ? F = h : h === y.active && F && (F = null), p === h && (h._ignoreWhileAnimating = n), h.animateAll(function() {
        S("dragOverAnimationComplete"), h._ignoreWhileAnimating = null;
      }), h !== p && (p.animateAll(), p._ignoreWhileAnimating = null)), (n === g && !g.animated || n === t && !n.animated) && (ke = null), !a.dragoverBubble && !e.rootEl && n !== document && (g.parentNode[U]._isOutsideThisEl(e.target), !Be && ve(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), m = !0;
    }
    function B() {
      J = Y(g), fe = Y(g, a.draggable), z({
        sortable: h,
        name: "change",
        toEl: t,
        newIndex: J,
        newDraggableIndex: fe,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), n = Q(n, a.draggable, t, !0), S("dragOver"), y.eventCanceled) return m;
    if (g.contains(e.target) || n.animated && n.animatingX && n.animatingY || h._ignoreWhileAnimating === n)
      return k(!1);
    if (wt = !1, c && !a.disabled && (d ? u || (i = I !== T) : F === this || (this.lastPutMode = it.checkPull(this, c, g, e)) && l.checkPut(this, c, g, e))) {
      if (f = this._getDirection(e, n) === "vertical", s = P(g), S("dragOverValid"), y.eventCanceled) return m;
      if (i)
        return I = T, x(), this._hideClone(), S("revert"), y.eventCanceled || (Se ? T.insertBefore(g, Se) : T.appendChild(g)), k(!0);
      var _ = yr(t, a.draggable);
      if (!_ || bi(e, f, this) && !_.animated) {
        if (_ === g)
          return k(!1);
        if (_ && t === e.target && (n = _), n && (o = P(n)), ct(T, t, g, s, n, o, e, !!n) !== !1)
          return x(), _ && _.nextSibling ? t.insertBefore(g, _.nextSibling) : t.appendChild(g), I = t, B(), k(!0);
      } else if (_ && mi(e, f, this)) {
        var A = Te(t, 0, a, !0);
        if (A === g)
          return k(!1);
        if (n = A, o = P(n), ct(T, t, g, s, n, o, e, !1) !== !1)
          return x(), t.insertBefore(g, A), I = t, B(), k(!0);
      } else if (n.parentNode === t) {
        o = P(n);
        var q = 0, ee, Ie = g.parentNode !== t, V = !ui(g.animated && g.toRect || s, n.animated && n.toRect || o, f), Re = f ? "top" : "left", ue = Mr(n, "top", "top") || Mr(g, "top", "top"), Me = ue ? ue.scrollTop : void 0;
        ke !== n && (ee = o[Re], Ke = !1, at = !V && a.invertSwap || Ie), q = yi(e, n, o, f, V ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, at, ke === n);
        var ie;
        if (q !== 0) {
          var be = Y(g);
          do
            be -= q, ie = I.children[be];
          while (ie && (b(ie, "display") === "none" || ie === v));
        }
        if (q === 0 || ie === n)
          return k(!1);
        ke = n, Ve = q;
        var Pe = n.nextElementSibling, pe = !1;
        pe = q === 1;
        var ot = ct(T, t, g, s, n, o, e, pe);
        if (ot !== !1)
          return (ot === 1 || ot === -1) && (pe = ot === 1), rr = !0, setTimeout(gi, 30), x(), pe && !Pe ? t.appendChild(g) : n.parentNode.insertBefore(g, pe ? Pe : n), ue && Cn(ue, 0, Me - ue.scrollTop), I = g.parentNode, ee !== void 0 && !at && (ft = Math.abs(ee - P(n)[Re])), B(), k(!0);
      }
      if (t.contains(g))
        return k(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    C(document, "mousemove", this._onTouchMove), C(document, "touchmove", this._onTouchMove), C(document, "pointermove", this._onTouchMove), C(document, "dragover", ve), C(document, "mousemove", ve), C(document, "touchmove", ve);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    C(e, "mouseup", this._onDrop), C(e, "touchend", this._onDrop), C(e, "pointerup", this._onDrop), C(e, "pointercancel", this._onDrop), C(e, "touchcancel", this._onDrop), C(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, n = this.options;
    if (J = Y(g), fe = Y(g, n.draggable), G("drop", this, {
      evt: e
    }), I = g && g.parentNode, J = Y(g), fe = Y(g, n.draggable), y.eventCanceled) {
      this._nulling();
      return;
    }
    Ae = !1, at = !1, Ke = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), nr(this.cloneId), nr(this._dragStartId), this.nativeDraggable && (C(document, "drop", this), C(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Ge && b(document.body, "user-select", ""), b(g, "transform", ""), e && (qe && (e.cancelable && e.preventDefault(), !n.dropBubble && e.stopPropagation()), v && v.parentNode && v.parentNode.removeChild(v), (T === I || F && F.lastPutMode !== "clone") && D && D.parentNode && D.parentNode.removeChild(D), g && (this.nativeDraggable && C(g, "dragend", this), qt(g), g.style["will-change"] = "", qe && !Ae && K(g, F ? F.options.ghostClass : this.options.ghostClass, !1), K(g, this.options.chosenClass, !1), z({
      sortable: this,
      name: "unchoose",
      toEl: I,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), T !== I ? (J >= 0 && (z({
      rootEl: I,
      name: "add",
      toEl: I,
      fromEl: T,
      originalEvent: e
    }), z({
      sortable: this,
      name: "remove",
      toEl: I,
      originalEvent: e
    }), z({
      rootEl: I,
      name: "sort",
      toEl: I,
      fromEl: T,
      originalEvent: e
    }), z({
      sortable: this,
      name: "sort",
      toEl: I,
      originalEvent: e
    })), F && F.save()) : J !== Le && J >= 0 && (z({
      sortable: this,
      name: "update",
      toEl: I,
      originalEvent: e
    }), z({
      sortable: this,
      name: "sort",
      toEl: I,
      originalEvent: e
    })), y.active && ((J == null || J === -1) && (J = Le, fe = Ue), z({
      sortable: this,
      name: "end",
      toEl: I,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    G("nulling", this), T = g = I = v = Se = D = pt = he = ye = W = qe = J = fe = Le = Ue = ke = Ve = F = it = y.dragged = y.ghost = y.clone = y.active = null, St.forEach(function(e) {
      e.checked = !0;
    }), St.length = Bt = Ot = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        g && (this._onDragOver(e), hi(e));
        break;
      case "selectstart":
        e.preventDefault();
        break;
    }
  },
  /**
   * Serializes the item into an array of string.
   * @returns {String[]}
   */
  toArray: function() {
    for (var e = [], t, n = this.el.children, s = 0, o = n.length, i = this.options; s < o; s++)
      t = n[s], Q(t, i.draggable, this.el, !1) && e.push(t.getAttribute(i.dataIdAttr) || wi(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var n = {}, s = this.el;
    this.toArray().forEach(function(o, i) {
      var a = s.children[i];
      Q(a, this.options.draggable, s, !1) && (n[o] = a);
    }, this), t && this.captureAnimationState(), e.forEach(function(o) {
      n[o] && (s.removeChild(n[o]), s.appendChild(n[o]));
    }), t && this.animateAll();
  },
  /**
   * Save the current sorting
   */
  save: function() {
    var e = this.options.store;
    e && e.set && e.set(this);
  },
  /**
   * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
   * @param   {HTMLElement}  el
   * @param   {String}       [selector]  default: `options.draggable`
   * @returns {HTMLElement|null}
   */
  closest: function(e, t) {
    return Q(e, t || this.options.draggable, this.el, !1);
  },
  /**
   * Set/get option
   * @param   {string} name
   * @param   {*}      [value]
   * @returns {*}
   */
  option: function(e, t) {
    var n = this.options;
    if (t === void 0)
      return n[e];
    var s = st.modifyOption(this, e, t);
    typeof s < "u" ? n[e] = s : n[e] = t, e === "group" && Ln(n);
  },
  /**
   * Destroy
   */
  destroy: function() {
    G("destroy", this);
    var e = this.el;
    e[U] = null, C(e, "mousedown", this._onTapStart), C(e, "touchstart", this._onTapStart), C(e, "pointerdown", this._onTapStart), this.nativeDraggable && (C(e, "dragover", this), C(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), xt.splice(xt.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!he) {
      if (G("hideClone", this), y.eventCanceled) return;
      b(D, "display", "none"), this.options.removeCloneOnHide && D.parentNode && D.parentNode.removeChild(D), he = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (he) {
      if (G("showClone", this), y.eventCanceled) return;
      g.parentNode == T && !this.options.group.revertClone ? T.insertBefore(D, g) : Se ? T.insertBefore(D, Se) : T.appendChild(D), this.options.group.revertClone && this.animate(g, D), b(D, "display", ""), he = !1;
    }
  }
};
function hi(r) {
  r.dataTransfer && (r.dataTransfer.dropEffect = "move"), r.cancelable && r.preventDefault();
}
function ct(r, e, t, n, s, o, i, a) {
  var l, c = r[U], d = c.options.onMove, u;
  return window.CustomEvent && !de && !nt ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = r, l.dragged = t, l.draggedRect = n, l.related = s || e, l.relatedRect = o || P(e), l.willInsertAfter = a, l.originalEvent = i, r.dispatchEvent(l), d && (u = d.call(c, l, i)), u;
}
function qt(r) {
  r.draggable = !1;
}
function gi() {
  rr = !1;
}
function mi(r, e, t) {
  var n = P(Te(t.el, 0, t.options, !0)), s = $n(t.el, t.options, v), o = 10;
  return e ? r.clientX < s.left - o || r.clientY < n.top && r.clientX < n.right : r.clientY < s.top - o || r.clientY < n.bottom && r.clientX < n.left;
}
function bi(r, e, t) {
  var n = P(yr(t.el, t.options.draggable)), s = $n(t.el, t.options, v), o = 10;
  return e ? r.clientX > s.right + o || r.clientY > n.bottom && r.clientX > n.left : r.clientY > s.bottom + o || r.clientX > n.right && r.clientY > n.top;
}
function yi(r, e, t, n, s, o, i, a) {
  var l = n ? r.clientY : r.clientX, c = n ? t.height : t.width, d = n ? t.top : t.left, u = n ? t.bottom : t.right, p = !1;
  if (!i) {
    if (a && ft < c * s) {
      if (!Ke && (Ve === 1 ? l > d + c * o / 2 : l < u - c * o / 2) && (Ke = !0), Ke)
        p = !0;
      else if (Ve === 1 ? l < d + ft : l > u - ft)
        return -Ve;
    } else if (l > d + c * (1 - s) / 2 && l < u - c * (1 - s) / 2)
      return vi(e);
  }
  return p = p || i, p && (l < d + c * o / 2 || l > u - c * o / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function vi(r) {
  return Y(g) < Y(r) ? 1 : -1;
}
function wi(r) {
  for (var e = r.tagName + r.className + r.src + r.href + r.textContent, t = e.length, n = 0; t--; )
    n += e.charCodeAt(t);
  return n.toString(36);
}
function xi(r) {
  St.length = 0;
  for (var e = r.getElementsByTagName("input"), t = e.length; t--; ) {
    var n = e[t];
    n.checked && St.push(n);
  }
}
function ht(r) {
  return setTimeout(r, 0);
}
function nr(r) {
  return clearTimeout(r);
}
Lt && E(document, "touchmove", function(r) {
  (y.active || Ae) && r.cancelable && r.preventDefault();
});
y.utils = {
  on: E,
  off: C,
  css: b,
  find: xn,
  is: function(e, t) {
    return !!Q(e, t, e, !1);
  },
  extend: ni,
  throttle: Sn,
  closest: Q,
  toggleClass: K,
  clone: En,
  index: Y,
  nextTick: ht,
  cancelNextTick: nr,
  detectDirection: An,
  getChild: Te,
  expando: U
};
y.get = function(r) {
  return r[U];
};
y.mount = function() {
  for (var r = arguments.length, e = new Array(r), t = 0; t < r; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(n) {
    if (!n.prototype || !n.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(n));
    n.utils && (y.utils = oe(oe({}, y.utils), n.utils)), st.mount(n);
  });
};
y.create = function(r, e) {
  return new y(r, e);
};
y.version = ti;
var M = [], je, sr, or = !1, jt, Nt, Ct, Ne;
function Si() {
  function r() {
    this.defaults = {
      scroll: !0,
      forceAutoScrollFallback: !1,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      bubbleScroll: !0
    };
    for (var e in this)
      e.charAt(0) === "_" && typeof this[e] == "function" && (this[e] = this[e].bind(this));
  }
  return r.prototype = {
    dragStarted: function(t) {
      var n = t.originalEvent;
      this.sortable.nativeDraggable ? E(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? E(document, "pointermove", this._handleFallbackAutoScroll) : n.touches ? E(document, "touchmove", this._handleFallbackAutoScroll) : E(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var n = t.originalEvent;
      !this.options.dragOverBubble && !n.rootEl && this._handleAutoScroll(n);
    },
    drop: function() {
      this.sortable.nativeDraggable ? C(document, "dragover", this._handleAutoScroll) : (C(document, "pointermove", this._handleFallbackAutoScroll), C(document, "touchmove", this._handleFallbackAutoScroll), C(document, "mousemove", this._handleFallbackAutoScroll)), qr(), gt(), si();
    },
    nulling: function() {
      Ct = sr = je = or = Ne = jt = Nt = null, M.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, n) {
      var s = this, o = (t.touches ? t.touches[0] : t).clientX, i = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(o, i);
      if (Ct = t, n || this.options.forceAutoScrollFallback || nt || de || Ge) {
        zt(t, this.options, a, n);
        var l = ge(a, !0);
        or && (!Ne || o !== jt || i !== Nt) && (Ne && qr(), Ne = setInterval(function() {
          var c = ge(document.elementFromPoint(o, i), !0);
          c !== l && (l = c, gt()), zt(t, s.options, c, n);
        }, 10), jt = o, Nt = i);
      } else {
        if (!this.options.bubbleScroll || ge(a, !0) === se()) {
          gt();
          return;
        }
        zt(t, this.options, ge(a, !1), !1);
      }
    }
  }, ce(r, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function gt() {
  M.forEach(function(r) {
    clearInterval(r.pid);
  }), M = [];
}
function qr() {
  clearInterval(Ne);
}
var zt = Sn(function(r, e, t, n) {
  if (e.scroll) {
    var s = (r.touches ? r.touches[0] : r).clientX, o = (r.touches ? r.touches[0] : r).clientY, i = e.scrollSensitivity, a = e.scrollSpeed, l = se(), c = !1, d;
    sr !== t && (sr = t, gt(), je = e.scroll, d = e.scrollFn, je === !0 && (je = ge(t, !0)));
    var u = 0, p = je;
    do {
      var f = p, h = P(f), m = h.top, S = h.bottom, x = h.left, k = h.right, B = h.width, _ = h.height, A = void 0, q = void 0, ee = f.scrollWidth, Ie = f.scrollHeight, V = b(f), Re = f.scrollLeft, ue = f.scrollTop;
      f === l ? (A = B < ee && (V.overflowX === "auto" || V.overflowX === "scroll" || V.overflowX === "visible"), q = _ < Ie && (V.overflowY === "auto" || V.overflowY === "scroll" || V.overflowY === "visible")) : (A = B < ee && (V.overflowX === "auto" || V.overflowX === "scroll"), q = _ < Ie && (V.overflowY === "auto" || V.overflowY === "scroll"));
      var Me = A && (Math.abs(k - s) <= i && Re + B < ee) - (Math.abs(x - s) <= i && !!Re), ie = q && (Math.abs(S - o) <= i && ue + _ < Ie) - (Math.abs(m - o) <= i && !!ue);
      if (!M[u])
        for (var be = 0; be <= u; be++)
          M[be] || (M[be] = {});
      (M[u].vx != Me || M[u].vy != ie || M[u].el !== f) && (M[u].el = f, M[u].vx = Me, M[u].vy = ie, clearInterval(M[u].pid), (Me != 0 || ie != 0) && (c = !0, M[u].pid = setInterval(function() {
        n && this.layer === 0 && y.active._onTouchMove(Ct);
        var Pe = M[this.layer].vy ? M[this.layer].vy * a : 0, pe = M[this.layer].vx ? M[this.layer].vx * a : 0;
        typeof d == "function" && d.call(y.dragged.parentNode[U], pe, Pe, r, Ct, M[this.layer].el) !== "continue" || Cn(M[this.layer].el, pe, Pe);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && p !== l && (p = ge(p, !1)));
    or = c;
  }
}, 30), Dn = function(e) {
  var t = e.originalEvent, n = e.putSortable, s = e.dragEl, o = e.activeSortable, i = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = n || o;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (i("spill"), this.onSpill({
      dragEl: s,
      putSortable: n
    }));
  }
};
function vr() {
}
vr.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, n = e.putSortable;
    this.sortable.captureAnimationState(), n && n.captureAnimationState();
    var s = Te(this.sortable.el, this.startIndex, this.options);
    s ? this.sortable.el.insertBefore(t, s) : this.sortable.el.appendChild(t), this.sortable.animateAll(), n && n.animateAll();
  },
  drop: Dn
};
ce(vr, {
  pluginName: "revertOnSpill"
});
function wr() {
}
wr.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, n = e.putSortable, s = n || this.sortable;
    s.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), s.animateAll();
  },
  drop: Dn
};
ce(wr, {
  pluginName: "removeOnSpill"
});
y.mount(new Si());
y.mount(wr, vr);
class Ci {
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
    ].forEach(([m, S]) => {
      const x = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      x.setAttribute("cx", String(m)), x.setAttribute("cy", String(S)), x.setAttribute("r", "1.5"), l.appendChild(x);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${s}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = o;
    const p = document.createElement("input");
    p.type = "checkbox", p.id = o, p.dataset.column = e, p.checked = n, p.setAttribute("role", "switch"), p.setAttribute("aria-checked", String(n)), p.setAttribute("aria-labelledby", `${s}-label`), p.setAttribute("aria-describedby", `${s}-desc`);
    const f = document.createElement("span");
    f.id = `${s}-desc`, f.className = "sr-only", f.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${n ? "visible" : "hidden"}.`;
    const h = document.createElement("span");
    return h.className = "column-switch-slider", h.setAttribute("aria-hidden", "true"), u.appendChild(p), u.appendChild(h), i.appendChild(a), i.appendChild(u), i.appendChild(f), i;
  }
  /**
   * Setup SortableJS for drag-and-drop reordering
   */
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = y.create(e, {
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
function Ei(r, e, t, n, s) {
  const o = (i) => {
    const a = i.target;
    if (!a)
      return;
    const l = a.closest(t);
    !l || !(l instanceof HTMLElement) || n(i, l);
  };
  return r.addEventListener(e, o, s), () => r.removeEventListener(e, o, s);
}
function $i(r) {
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
function ki(r) {
  const e = document.querySelector(r.selectors.perPageSelect);
  e && e.addEventListener("change", async () => {
    r.state.perPage = parseInt(e.value, 10), r.resetPagination(), r.pushStateToURL(), await r.refresh();
  });
}
function Ai(r) {
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
function Li(r) {
  const e = document.querySelector(r.selectors.columnToggleBtn), t = document.querySelector(r.selectors.columnToggleMenu);
  !e || !t || (r.columnManager = new Ci({
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
function _i(r) {
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
        const u = d.querySelector(".export-icon"), p = d.querySelector(".export-spinner");
        u && u.classList.add("hidden"), p && p.classList.remove("hidden");
      }, l = (d) => {
        const u = d.querySelector(".export-icon"), p = d.querySelector(".export-spinner");
        u && u.classList.remove("hidden"), p && p.classList.add("hidden");
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
function Ti(r) {
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
function Di(r) {
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
function Ii(r) {
  const e = document.querySelector(r.selectors.selectAllCheckbox);
  e && e.addEventListener("change", () => {
    document.querySelectorAll(r.selectors.rowCheckboxes).forEach((n) => {
      n.checked = e.checked;
      const s = n.dataset.id;
      s && (e.checked ? r.state.selectedRows.add(s) : r.state.selectedRows.delete(s));
    }), r.updateBulkActionsBar();
  }), r.updateSelectionBindings();
}
function Ri(r) {
  document.querySelectorAll(r.selectors.rowCheckboxes).forEach((t) => {
    const n = t.dataset.id;
    n && (t.checked = r.state.selectedRows.has(n)), t.addEventListener("change", () => {
      n && (t.checked ? r.state.selectedRows.add(n) : r.state.selectedRows.delete(n)), r.updateBulkActionsBar();
    });
  });
}
function Mi(r) {
  const t = document.getElementById("bulk-actions-overlay")?.dataset?.bulkBase || "";
  document.querySelectorAll("[data-bulk-action]").forEach((o) => {
    o.addEventListener("click", async () => {
      const i = o, a = i.dataset.bulkAction;
      if (!a) return;
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
            console.error("Bulk action failed:", d), r.showError("Bulk action failed");
          }
          return;
        }
      }
      if (t) {
        const c = `${t}/${a}`, d = i.dataset.bulkConfirm, u = r.parseDatasetStringArray(i.dataset.bulkPayloadRequired), p = r.parseDatasetObject(i.dataset.bulkPayloadSchema), f = {
          id: a,
          label: i.textContent?.trim() || a,
          endpoint: c,
          confirm: d,
          payloadRequired: u,
          payloadSchema: p
        };
        try {
          await r.actionRenderer.executeBulkAction(f, l), r.state.selectedRows.clear(), r.updateBulkActionsBar(), await r.refresh();
        } catch (h) {
          console.error("Bulk action failed:", h), r.showError("Bulk action failed");
        }
        return;
      }
      if (r.config.behaviors?.bulkActions)
        try {
          await r.config.behaviors.bulkActions.execute(a, l, r), r.state.selectedRows.clear(), r.updateBulkActionsBar();
        } catch (c) {
          console.error("Bulk action failed:", c), r.showError("Bulk action failed");
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
function Pi(r) {
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
function Bi(r) {
  const e = document.getElementById("bulk-actions-overlay"), t = document.getElementById("selected-count"), n = r.state.selectedRows.size;
  if (console.log("[DataGrid] updateBulkActionsBar - overlay:", e, "countEl:", t, "count:", n), !e || !t) {
    console.error("[DataGrid] Missing bulk actions elements!");
    return;
  }
  t.textContent = String(n), n > 0 ? (e.classList.remove("hidden"), e.offsetHeight) : e.classList.add("hidden");
}
function Oi(r) {
  const e = document.getElementById("bulk-clear-selection");
  console.log("[DataGrid] Binding clear button:", e), e ? e.addEventListener("click", () => {
    console.log("[DataGrid] Clear button clicked!"), r.clearSelection();
  }) : console.error("[DataGrid] Clear button not found!");
}
function Fi(r) {
  console.log("[DataGrid] Clearing selection..."), r.state.selectedRows.clear();
  const e = document.querySelector(r.selectors.selectAllCheckbox);
  e && (e.checked = !1), r.updateBulkActionsBar(), r.updateSelectionBindings();
}
function qi(r, e, t) {
  const n = e.getBoundingClientRect(), s = t.offsetHeight || 300, i = window.innerHeight - n.bottom, a = n.top, l = i < s && a > i, c = n.right - (t.offsetWidth || 224);
  t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${n.top - s - 8}px`, t.style.bottom = "auto") : (t.style.top = `${n.bottom + 8}px`, t.style.bottom = "auto");
}
function ji(r) {
  r.dropdownAbortController && r.dropdownAbortController.abort(), r.dropdownAbortController = new AbortController();
  const { signal: e } = r.dropdownAbortController;
  document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
    const n = t.dataset.dropdownToggle, s = document.getElementById(n || "");
    s && !s.classList.contains("hidden") && s.classList.add("hidden");
  }), Ei(document, "click", "[data-dropdown-toggle]", (t, n) => {
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
function Ni(r, e) {
  console.error(e), r.notifier.error(e);
}
function zi(r, e, t) {
  r.notifier.show({ message: e, type: t });
}
async function Gi(r, e) {
  return r.notifier.confirm(e);
}
async function Hi(r, e) {
  return e instanceof Response ? Yr(e) : e instanceof Error ? e.message : "An unexpected error occurred";
}
function Ui(r, e) {
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
function Vi(r, e) {
  if (e)
    try {
      const t = JSON.parse(e);
      return !t || typeof t != "object" || Array.isArray(t) ? void 0 : t;
    } catch (t) {
      console.warn("[DataGrid] Failed to parse bulk payload_schema:", t);
      return;
    }
}
function Ki(r, e) {
  if (!r.tableEl) return;
  const t = r.mergeColumnOrder(e);
  r.state.columnOrder = t;
  const n = new Map(r.config.columns.map((s) => [s.field, s]));
  r.config.columns = t.map((s) => n.get(s)).filter((s) => s !== void 0), r.reorderTableColumns(t), r.persistStateSnapshot(), console.log("[DataGrid] Columns reordered:", t);
}
function Ji(r) {
  r.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), r.config.columns = r.defaultColumns.map((t) => ({ ...t })), r.state.columnOrder = r.config.columns.map((t) => t.field);
  const e = r.config.columns.filter((t) => !t.hidden).map((t) => t.field);
  r.tableEl ? (r.reorderTableColumns(r.state.columnOrder), r.updateColumnVisibility(e)) : (r.state.hiddenColumns = new Set(
    r.config.columns.filter((t) => t.hidden).map((t) => t.field)
  ), r.persistStateSnapshot()), r.columnManager && (r.columnManager.refresh(), r.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
}
function Yi(r, e) {
  const t = new Set(r.config.columns.map((i) => i.field)), n = new Set(e), s = e.filter((i) => t.has(i)), o = r.config.columns.map((i) => i.field).filter((i) => !n.has(i));
  return [...s, ...o];
}
function Xi(r, e) {
  if (!r.tableEl) return;
  const t = r.tableEl.querySelector("thead tr:first-child");
  t && r.reorderRowCells(t, e, "th");
  const n = r.tableEl.querySelector("#filter-row");
  n && r.reorderRowCells(n, e, "th"), r.tableEl.querySelectorAll("tbody tr").forEach((o) => {
    r.reorderRowCells(o, e, "td");
  });
}
function Wi(r, e, t, n) {
  const s = Array.from(e.querySelectorAll(`${n}[data-column]`)), o = new Map(
    s.map((d) => [d.dataset.column, d])
  ), i = Array.from(e.querySelectorAll(n)), a = e.querySelector(`${n}[data-role="selection"]`) || i.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${n}[data-role="actions"]`) || i.find(
    (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
  ), c = [];
  a && c.push(a), t.forEach((d) => {
    const u = o.get(d);
    u && c.push(u);
  }), l && c.push(l), c.forEach((d) => {
    e.appendChild(d);
  });
}
const H = class H {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.hasURLStateOverrides = !1, this.hasPersistedHiddenColumnState = !1, this.hasPersistedColumnOrderState = !1, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new et(), this.selectors = {
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
    this.stateStore = this.config.stateStore || Is({
      key: t,
      ...this.config.stateStoreConfig || {}
    });
    const n = this.stateStore.loadPersistedState(), s = new Set(this.config.columns.map((A) => A.field)), o = new Set(
      this.config.columns.filter((A) => A.hidden).map((A) => A.field)
    ), i = !!n && Array.isArray(n.hiddenColumns);
    this.hasPersistedHiddenColumnState = i;
    const a = new Set(
      (n?.hiddenColumns || []).filter((A) => s.has(A))
    ), l = this.config.columns.map((A) => A.field), c = !!n && Array.isArray(n.columnOrder) && n.columnOrder.length > 0;
    this.hasPersistedColumnOrderState = c;
    const d = (n?.columnOrder || []).filter((A) => s.has(A)), u = c ? [...d, ...l.filter((A) => !d.includes(A))] : l, p = this.config.enableGroupedMode ? Vs(t) : !1, f = this.config.enableGroupedMode ? Js(t) : null, h = this.config.enableGroupedMode ? Us(t) : "explicit", m = this.config.enableGroupedMode ? Hs(t) : /* @__PURE__ */ new Set(), S = rt(
      n?.expandMode,
      h
    ), x = new Set(
      (n?.expandedGroups || Array.from(m)).map((A) => String(A).trim()).filter(Boolean)
    ), k = this.config.enableGroupedMode ? n?.expandMode !== void 0 || x.size > 0 || p : !1, _ = (this.config.enableGroupedMode ? n?.viewMode || f : null) || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: i ? a : o,
      columnOrder: u,
      viewMode: _,
      expandMode: S,
      groupedData: null,
      expandedGroups: x,
      hasPersistedExpandState: k
    }, this.actionRenderer = new ns({
      mode: this.config.actionRenderMode || "dropdown",
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
    }), this.cellRendererRegistry = new Ss(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([A, q]) => {
      this.cellRendererRegistry.register(A, q);
    }), this.defaultColumns = this.config.columns.map((A) => ({ ...A }));
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
    return so(this);
  }
  parseJSONArray(e, t) {
    return oo(this, e, t);
  }
  applyPersistedStateSnapshot(e, t = {}) {
    io(this, e, t);
  }
  applyShareStateSnapshot(e) {
    ao(this, e);
  }
  buildPersistedStateSnapshot() {
    return lo(this);
  }
  buildShareStateSnapshot() {
    return co(this);
  }
  persistStateSnapshot() {
    uo(this);
  }
  restoreStateFromURL() {
    po(this);
  }
  applyRestoredState() {
    fo(this);
  }
  pushStateToURL(e = {}) {
    ho(this, e);
  }
  syncURL() {
    this.pushStateToURL();
  }
  async refresh() {
    return mo(this);
  }
  buildApiUrl() {
    return bo(this);
  }
  buildQueryString() {
    return yo(this);
  }
  buildQueryParams() {
    return vo(this);
  }
  getResponseTotal(e) {
    return wo(this, e);
  }
  normalizePagination(e) {
    return xo(this, e);
  }
  resetPagination() {
    this.state.currentPage = 1;
  }
  updateColumnVisibility(e, t = !1) {
    zo(this, e, t);
  }
  syncColumnVisibilityCheckboxes() {
    Go(this);
  }
  renderData(e) {
    Ho(this, e);
  }
  renderFlatData(e, t) {
    Uo(this, e, t);
  }
  renderGroupedData(e, t, n) {
    Ao(this, e, t, n);
  }
  isGroupedViewActive() {
    return Lo(this);
  }
  fallbackGroupedMode(e) {
    _o(this, e);
  }
  handleGroupedModeStatusFallback(e) {
    return To(this, e);
  }
  handleGroupedModePayloadFallback(e) {
    return Do(this, e);
  }
  toggleGroup(e) {
    Io(this, e);
  }
  setExpandedGroups(e) {
    Ro(this, e);
  }
  expandAllGroups() {
    Mo(this);
  }
  collapseAllGroups() {
    Po(this);
  }
  updateGroupVisibility(e) {
    Bo(this, e);
  }
  updateGroupedRowsFromState() {
    Oo(this);
  }
  isGroupExpandedByState(e, t = !1) {
    return Fo(this, e, t);
  }
  setViewMode(e) {
    qo(this, e);
  }
  getViewMode() {
    return jo(this);
  }
  getGroupedData() {
    return No(this);
  }
  async fetchDetail(e) {
    return So(this, e);
  }
  getSchema() {
    return Eo(this);
  }
  getForm() {
    return $o(this);
  }
  getTabs() {
    return ko(this);
  }
  normalizeDetailResponse(e) {
    return Co(this, e);
  }
  resolveRendererOptions(e) {
    return Vo(this, e);
  }
  createTableRow(e) {
    return Ko(this, e);
  }
  sanitizeActionId(e) {
    return Jo(this, e);
  }
  async handleDelete(e) {
    return Yo(this, e);
  }
  updatePaginationUI(e) {
    Xo(this, e);
  }
  renderPaginationButtons(e) {
    Wo(this, e);
  }
  bindSearchInput() {
    $i(this);
  }
  bindPerPageSelect() {
    ki(this);
  }
  bindFilterInputs() {
    Ai(this);
  }
  bindColumnVisibility() {
    Li(this);
  }
  bindExportButtons() {
    _i(this);
  }
  bindSorting() {
    Ti(this);
  }
  updateSortIndicators() {
    Di(this);
  }
  bindSelection() {
    Ii(this);
  }
  updateSelectionBindings() {
    Ri(this);
  }
  bindBulkActions() {
    Mi(this);
  }
  bindOverflowMenu() {
    Pi();
  }
  updateBulkActionsBar() {
    Bi(this);
  }
  bindBulkClearButton() {
    Oi(this);
  }
  clearSelection() {
    Fi(this);
  }
  positionDropdownMenu(e, t) {
    qi(this, e, t);
  }
  bindDropdownToggles() {
    ji(this);
  }
  showError(e) {
    Ni(this, e);
  }
  notify(e, t) {
    zi(this, e, t);
  }
  async confirmAction(e) {
    return Gi(this, e);
  }
  async extractError(e) {
    return Hi(this, e);
  }
  parseDatasetStringArray(e) {
    return Ui(this, e);
  }
  parseDatasetObject(e) {
    return Vi(this, e);
  }
  reorderColumns(e) {
    Ki(this, e);
  }
  resetColumnsToDefault() {
    Ji(this);
  }
  mergeColumnOrder(e) {
    return Yi(this, e);
  }
  reorderTableColumns(e) {
    Xi(this, e);
  }
  reorderRowCells(e, t, n) {
    Wi(this, e, t, n);
  }
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), console.log("[DataGrid] Instance destroyed");
  }
};
H.URL_KEY_SEARCH = Ye, H.URL_KEY_PAGE = Xe, H.URL_KEY_PER_PAGE = We, H.URL_KEY_FILTERS = Qe, H.URL_KEY_SORT = Ze, H.URL_KEY_STATE = kt, H.URL_KEY_HIDDEN_COLUMNS = gr, H.URL_KEY_VIEW_MODE = At, H.URL_KEY_EXPANDED_GROUPS = yt, H.MANAGED_URL_KEYS = mr, H.DEFAULT_MAX_URL_LENGTH = mn, H.DEFAULT_MAX_FILTERS_LENGTH = bn;
let ir = H;
typeof window < "u" && (window.DataGrid = ir);
const jr = {
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
class yc {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new et();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : jr[e.type] || jr.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new kr({
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
    new kr({
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
const Nr = {
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
class vc {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new et(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
      const i = o, [a, l, c] = i.dataset.cond.split("-"), d = parseInt(a, 10), u = parseInt(l, 10);
      i.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[u].field = i.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[u].operator = i.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[u].value = i.value, this.updatePreview());
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Nr[e.type] || Nr.text;
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
class wc {
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
class xc {
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
class Sc {
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
class Cc {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((n) => `${n.field} ${n.direction}`).join(",") };
  }
  async onSort(e, t, n) {
    await n.refresh();
  }
}
class Ec {
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
    const n = Qi(t, this.config, e);
    n.delivery = Zi(this.config, e);
    let s;
    try {
      s = await ne(this.getEndpoint(), {
        method: "POST",
        json: n,
        headers: {
          Accept: "application/json,application/octet-stream"
        }
      });
    } catch (o) {
      const i = o instanceof Error ? o.message : "Network error during export";
      throw we(t, "error", i), o;
    }
    if (s.status === 202) {
      const o = await s.json().catch(() => ({}));
      we(t, "info", "Export queued. You can download it when ready.");
      const i = o?.status_url || "";
      if (i) {
        const a = ra(o, i);
        try {
          await na(i, {
            intervalMs: ea(this.config),
            timeoutMs: ta(this.config)
          });
          const l = await ne(a, {
            method: "GET",
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await ar(l);
            throw we(t, "error", c), new Error(c);
          }
          await Gr(l, n.definition || n.resource || "export", n.format), we(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw we(t, "error", c), l;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!s.ok) {
      const o = await ar(s);
      throw we(t, "error", o), new Error(o);
    }
    await Gr(s, n.definition || n.resource || "export", n.format), we(t, "success", "Export ready.");
  }
}
function Qi(r, e, t) {
  const n = ua(t), s = oa(r, e), o = ia(r, e), i = aa(r), a = la(i), l = {
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
function Zi(r, e) {
  return r.delivery ? r.delivery : (r.asyncFormats && r.asyncFormats.length > 0 ? r.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function ea(r) {
  const e = Number(r.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function ta(r) {
  const e = Number(r.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function ra(r, e) {
  return r?.download_url ? r.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function na(r, e) {
  const t = Date.now(), n = Math.max(250, e.intervalMs);
  for (; ; ) {
    const s = await ne(r, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });
    if (!s.ok) {
      const a = await ar(s);
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
    await sa(n);
  }
}
function sa(r) {
  return new Promise((e) => setTimeout(e, r));
}
function oa(r, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(r.state.selectedRows || []), n = t.length > 0 ? "ids" : "all";
  return {
    mode: n,
    ids: n === "ids" ? t : []
  };
}
function ia(r, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = r.state?.hiddenColumns ? new Set(r.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(r.state?.columnOrder) && r.state.columnOrder.length > 0 ? r.state.columnOrder : r.config.columns.map((s) => s.field)).filter((s) => !t.has(s));
}
function aa(r) {
  const e = {}, t = r.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(r.state.currentPage, r.state.perPage)), r.state.search && t.search && Object.assign(e, t.search.buildQuery(r.state.search)), r.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(r.state.filters)), r.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(r.state.sort)), e;
}
function la(r) {
  const e = {}, t = [];
  return Object.entries(r).forEach(([n, s]) => {
    if (s == null || s === "")
      return;
    switch (n) {
      case "limit":
        e.limit = zr(s);
        return;
      case "offset":
        e.offset = zr(s);
        return;
      case "order":
      case "sort":
        e.sort = da(String(s));
        return;
      case "q":
      case "search":
        e.search = String(s);
        return;
    }
    const { field: o, op: i } = ca(n);
    o && t.push({ field: o, op: i, value: s });
  }), t.length > 0 && (e.filters = t), e;
}
function ca(r) {
  const e = r.split("__"), t = e[0]?.trim() || "", n = e[1]?.trim() || "eq";
  return { field: t, op: n };
}
function da(r) {
  return r ? r.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), n = t[0] || "", s = t[1] || "asc";
    return { field: n, desc: s.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function ua(r) {
  const e = String(r || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function zr(r) {
  const e = Number(r);
  return Number.isFinite(e) ? e : 0;
}
async function Gr(r, e, t) {
  const n = await r.blob(), s = pa(r, e, t), o = URL.createObjectURL(n), i = document.createElement("a");
  i.href = o, i.download = s, i.rel = "noopener", document.body.appendChild(i), i.click(), i.remove(), URL.revokeObjectURL(o);
}
function pa(r, e, t) {
  const n = r.headers.get("content-disposition") || "", s = `${e}.${t}`;
  return fa(n) || s;
}
function fa(r) {
  if (!r) return null;
  const e = r.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = r.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function ar(r) {
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
function we(r, e, t) {
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
class $c {
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
    const s = this.getActionEndpoint(e), o = await ne(s, {
      method: "POST",
      json: { ids: t },
      accept: "application/json"
    });
    if (!o.ok) {
      const i = await go(o, `Bulk action '${e}' failed`);
      throw new Error(`Bulk action '${e}' failed: ${i}`);
    }
    await n.refresh();
  }
}
function ha(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function ga(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function In(r) {
  return typeof r == "object" && r !== null && "version" in r && r.version === 2;
}
class ma {
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
      if (In(t))
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
class kc extends ma {
  constructor(e, t) {
    const n = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, n), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const s = ha(t.basePath), o = ga(t.apiBasePath);
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
      const e = await ne(this.preferencesEndpoint, {
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
      return In(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
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
      const s = await ne(this.preferencesEndpoint, {
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
      const e = await ne(this.preferencesEndpoint, {
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
const ba = {
  async prompt(r) {
    const { PayloadInputModal: e } = await import("../chunks/payload-modal-2KQOIFny.js");
    return e.prompt(r);
  }
}, Hr = {
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
}, ya = 5e3;
class va {
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
    const n = [];
    let s = 0;
    const o = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const i of t) {
        if (!i.name || !this.shouldIncludeAction(e, i)) continue;
        const a = i.name.toLowerCase();
        if (this.seenActions.has(a)) continue;
        this.seenActions.add(a);
        const l = this.resolveRecordActionState(e, i.name), c = this.buildActionFromSchema(e, i, o, l);
        c && n.push({
          action: c,
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
    return this.config.actionOrderOverride?.[n] !== void 0 ? this.config.actionOrderOverride[n] : Hr[n] !== void 0 ? Hr[n] : ya;
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
  shouldIncludeAction(e, t) {
    if (!this.matchesActionScope(t.scope))
      return !1;
    const n = Array.isArray(t.context_required) ? t.context_required : [];
    if (n.length === 0)
      return !0;
    for (const s of n) {
      const o = typeof s == "string" ? s.trim() : "";
      if (!o) continue;
      const i = this.resolveRecordContextValue(e, o);
      if (this.isEmptyPayloadValue(i))
        return !1;
    }
    return !0;
  }
  resolveRecordActionState(e, t) {
    const n = e._action_state;
    if (!n || typeof n != "object" || Array.isArray(n))
      return null;
    const s = n[t];
    return !s || typeof s != "object" || Array.isArray(s) ? null : s;
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1)
      return e;
    const n = this.disabledReason(t);
    return {
      ...e,
      disabled: !0,
      disabledReason: n
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t)
      return t;
    const n = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (n) {
      const s = Et(n);
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
    return t.href ? c = t.href.replace("{id}", a) : t.name === "edit" ? c = `${l}/${a}/edit` : c = `${l}/${a}`, i && (c += c.includes("?") ? `&${i}` : `?${i}`), {
      id: t.name,
      label: n,
      icon: o || this.getDefaultIcon(t.name),
      variant: s,
      action: () => {
        window.location.href = c;
      }
    };
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
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        if (!(await fetch(`${i}/${o}`, {
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
    const t = await cr(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (Wn(t.error)) {
      const s = Qn(t.error);
      if (s && this.config.onTranslationBlocker) {
        const o = { ...e.payload };
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...s,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...o },
            recordId: e.recordId
          })
        }), { success: !1, error: t.error };
      }
    }
    const n = this.buildActionErrorMessage(e.actionName, t.error);
    throw this.config.onActionError?.(e.actionName, {
      ...t.error,
      message: n
    }), new Error(n);
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
    s && i.set("locale", s), this.config.environment && i.set("env", this.config.environment);
    const a = i.toString(), l = `${o}/${n}/edit${a ? `?${a}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(s || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, {
      action: {
        label: `View ${c.toUpperCase()}`,
        handler: () => {
          const p = new URLSearchParams();
          p.set("locale", c), this.config.environment && p.set("env", this.config.environment);
          const f = typeof t.id == "string" ? t.id : String(t.id || n);
          window.location.href = `${o}/${f}/edit?${p.toString()}`;
        }
      }
    }) : console.log(`[SchemaActionBuilder] Translation created: ${s}`), window.location.href = l;
  }
  /**
   * Build action payload from record and schema
   */
  async buildActionPayload(e, t) {
    const n = t.name.trim().toLowerCase(), s = {
      id: e.id
    };
    this.config.locale && n !== "create_translation" && (s.locale = this.config.locale), this.config.environment && (s.environment = this.config.environment), this.config.panelName && (s.policy_entity = this.config.panelName);
    const o = this.normalizePayloadSchema(t.payload_schema), i = this.collectRequiredFields(t.payload_required, o);
    if (n === "create_translation" && this.applySchemaTranslationContext(s, e, o), o?.properties)
      for (const [c, d] of Object.entries(o.properties))
        s[c] === void 0 && d.default !== void 0 && (s[c] = d.default);
    i.includes("idempotency_key") && this.isEmptyPayloadValue(s.idempotency_key) && (s.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const a = i.filter((c) => this.isEmptyPayloadValue(s[c]));
    if (a.length === 0)
      return s;
    const l = await this.promptForPayload(t, a, o, s, e);
    if (l === null)
      return null;
    for (const c of a) {
      const d = o?.properties?.[c], u = l[c] ?? "", p = this.coercePromptValue(u, c, d);
      if (p.error)
        throw new Error(p.error);
      s[c] = p.value;
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
    return await ba.prompt({
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
      const S = this.asStringArray(i.required_locales), x = new Set(this.asStringArray(i.available_locales));
      l = S.filter((k) => !x.has(k));
    }
    const c = this.asStringArray(s?.enum);
    if (c.length > 0) {
      const S = new Set(c);
      l = l.filter((x) => S.has(x));
    }
    if (l.length === 0)
      return;
    const d = this.extractStringField(a, "recommended_locale") || this.extractStringField(n, "recommended_locale") || this.extractStringField(i || {}, "recommended_locale"), u = this.asStringArray(
      a.required_for_publish ?? n.required_for_publish ?? i?.required_for_publish ?? i?.required_locales
    ), p = this.asStringArray(
      a.existing_locales ?? n.existing_locales ?? i?.available_locales
    ), f = this.createTranslationLocaleLabelMap(s), h = /* @__PURE__ */ new Set(), m = [];
    for (const S of l) {
      const x = S.trim().toLowerCase();
      if (!x || h.has(x))
        continue;
      h.add(x);
      const k = d?.toLowerCase() === x, B = u.includes(x), _ = [];
      B && _.push("Required for publishing"), p.length > 0 && _.push(`${p.length} translation${p.length > 1 ? "s" : ""} exist`);
      const A = _.length > 0 ? _.join(" • ") : void 0, q = f[x] || this.localeLabel(x);
      let ee = `${x.toUpperCase()} - ${q}`;
      k && (ee += " (recommended)"), m.push({
        value: x,
        label: ee,
        description: A,
        recommended: k
      });
    }
    return m.sort((S, x) => S.recommended && !x.recommended ? -1 : !S.recommended && x.recommended ? 1 : S.value.localeCompare(x.value)), m.length > 0 ? m : void 0;
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
    return Zn(t, `${e} failed`);
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
  appendDefaultActions(e, t, n) {
    const s = String(t.id || ""), o = this.config.actionBasePath, i = this.config.apiEndpoint, a = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let l = `${o}/${s}`;
            n && (l += `?${n}`), window.location.href = l;
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
            let l = `${o}/${s}/edit`;
            n && (l += `?${n}`), window.location.href = l;
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
            if (!(await fetch(`${i}/${s}`, {
              method: "DELETE",
              headers: { Accept: "application/json" }
            })).ok)
              throw new Error("Delete failed");
          }
        }
      }
    ];
    for (const l of a)
      this.seenActions.has(l.name) || (this.seenActions.add(l.name), e.push(l.button));
  }
  /**
   * Append default actions with ordering metadata
   */
  appendDefaultActionsOrdered(e, t, n, s) {
    const o = String(t.id || ""), i = this.config.actionBasePath, a = this.config.apiEndpoint, l = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let d = `${i}/${o}`;
            n && (d += `?${n}`), window.location.href = d;
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
            let d = `${i}/${o}/edit`;
            n && (d += `?${n}`), window.location.href = d;
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
            if (!(await fetch(`${a}/${o}`, {
              method: "DELETE",
              headers: { Accept: "application/json" }
            })).ok)
              throw new Error("Delete failed");
          }
        }
      }
    ];
    let c = s;
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
function Ac(r, e, t) {
  return new va(t).buildRowActions(r, e);
}
function Lc(r) {
  return r.schema?.actions;
}
class xr extends Xr {
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
      const n = e.onDismiss;
      new xr({
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
                Cannot ${w(e)} ${w(t)}
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
            Retry ${w(e)}
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
          data-locale-item="${w(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${w(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${w(o)}
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
                      ${w(l)}
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
              data-locale="${w(e)}"
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
    i.set("locale", e), this.config.environment && i.set("env", this.config.environment);
    const a = `${s}/${o}/edit?${i.toString()}`;
    return `
      <a href="${w(a)}"
         data-blocker-action="open"
         data-locale="${w(e)}"
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
        };
        this.config.environment && (n.environment = this.config.environment), this.config.panelName && (n.policy_entity = this.config.panelName);
        const s = `${this.config.apiEndpoint}/actions/create_translation`, o = await cr(s, n);
        if (o.success) {
          t.loading = !1, t.created = !0, o.data?.id && (t.newRecordId = String(o.data.id)), this.updateLocaleItemUI(e);
          const i = {
            id: t.newRecordId || this.config.recordId,
            locale: e,
            status: String(o.data?.status || "draft"),
            translation_group_id: o.data?.translation_group_id ? String(o.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(e, i);
        } else {
          t.loading = !1, this.updateLocaleItemUI(e);
          const i = o.error?.message || "Failed to create translation";
          this.config.onError?.(i);
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
async function _c(r) {
  try {
    await xr.showBlocker(r);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = r.transition || "complete action", n = r.missingLocales.join(", "), s = `Cannot ${t}: Missing translations for ${n}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(s) : alert(s);
  }
}
const wa = [
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
class Rn {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || wa
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
    const { title: e, orientation: t, size: n, items: s, containerClass: o } = this.config, i = t === "vertical", a = n === "sm", l = i ? "flex-col" : "flex-row flex-wrap", c = a ? "gap-2" : "gap-4", d = a ? "text-xs" : "text-sm", u = a ? "text-sm" : "text-base", p = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${this.escapeHtml(e)}</span>` : "", f = s.map((h) => this.renderItem(h, u, d)).join("");
    return `
      <div class="status-legend inline-flex items-center ${l} ${c} ${o}"
           role="list"
           aria-label="Translation status legend">
        ${p}
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
           title="${this.escapeHtml(e.description)}"
           aria-label="${this.escapeHtml(e.label)}: ${this.escapeHtml(e.description)}">
        <span class="${e.colorClass} ${t}" aria-hidden="true">${e.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${n}">${this.escapeHtml(e.label)}</span>
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
function xa(r) {
  const e = new Rn(r);
  return e.render(), e;
}
function Tc() {
  const r = document.querySelectorAll("[data-status-legend]"), e = [];
  return r.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const n = t.dataset.orientation || "horizontal", s = t.dataset.size || "default", o = t.dataset.title || "", i = xa({
      container: t,
      orientation: n,
      size: s,
      title: o
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(i);
  }), e;
}
function Dc(r = {}) {
  const e = document.createElement("div");
  return new Rn({
    container: e,
    ...r
  }).buildHTML();
}
const Mn = [
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
class Sa {
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
      <div class="quick-filters inline-flex items-center gap-2 flex-wrap ${t}"
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
    o ? i ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${lr(a)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${lr(e.key)}"
              ${d}
              ${o ? "" : "disabled"}>
        ${u}
        <span>${Sr(e.label)}</span>
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
function Ca(r, e, t = {}) {
  return new Sa({
    container: r,
    filters: Mn,
    onFilterSelect: e,
    ...t
  });
}
function Ic(r) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((n) => {
    if (n.hasAttribute("data-quick-filters-init"))
      return;
    const s = n.dataset.size || "default", o = Ca(
      n,
      (i) => r(i, n),
      { size: s }
    );
    n.setAttribute("data-quick-filters-init", "true"), t.push(o);
  }), t;
}
function Rc(r = {}) {
  const {
    filters: e = Mn,
    activeKey: t = null,
    capabilities: n = [],
    size: s = "default",
    containerClass: o = ""
  } = r, i = s === "sm" ? "text-xs" : "text-sm", a = s === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const d of n)
    l.set(d.key, d);
  const c = e.map((d) => {
    const u = l.get(d.key), p = u?.supported !== !1, f = t === d.key, h = u?.disabledReason || "Filter not available", m = `inline-flex items-center gap-1 ${a} ${i} rounded-full font-medium`;
    let S;
    p ? f ? S = `${d.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : S = d.styleClass || "bg-gray-100 text-gray-700" : S = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const x = d.icon ? `<span>${d.icon}</span>` : "", k = p ? "" : `title="${lr(h)}"`;
    return `<span class="${m} ${S}" ${k}>${x}<span>${Sr(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-2 flex-wrap ${o}">${c}</div>`;
}
function Sr(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function lr(r) {
  return Sr(r);
}
async function Ea(r, e, t = {}) {
  const { apiEndpoint: n, notifier: s = new et(), maxFailuresToShow: o = 5 } = r, i = `${n}/bulk/create-missing-translations`;
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
      let u = `Request failed: ${a.status}`;
      try {
        const p = JSON.parse(d);
        u = p.error || p.message || u;
      } catch {
        d && (u = d);
      }
      throw new Error(u);
    }
    const l = await a.json(), c = $a(l, o);
    return ka(c, s), r.onSuccess && r.onSuccess(c), c;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw s.error(`Failed to create translations: ${l.message}`), r.onError && r.onError(l), l;
  }
}
function $a(r, e) {
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
function ka(r, e) {
  const { created: t, failed: n, skipped: s, total: o } = r;
  if (o === 0) {
    e.info("No translations to create");
    return;
  }
  n === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${s > 0 ? ` (${s} skipped)` : ""}`) : s > 0 && e.info(`All ${s} translation${s !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${n} translation${n !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${n}${s > 0 ? `, skipped ${s}` : ""}`
  );
}
function Mc(r) {
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
          <td class="px-3 py-2 text-sm text-gray-700">${Gt(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${Gt(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${Gt(c.error)}</td>
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
function Pc(r) {
  const { created: e, failed: t, skipped: n } = r, s = [];
  return e > 0 && s.push(`<span class="text-green-600">+${e}</span>`), t > 0 && s.push(`<span class="text-red-600">${t} failed</span>`), n > 0 && s.push(`<span class="text-yellow-600">${n} skipped</span>`), s.join(" · ");
}
function Bc(r, e, t) {
  return async (n) => Ea(
    {
      apiEndpoint: r,
      notifier: e,
      onSuccess: t
    },
    n
  );
}
function Gt(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const Aa = {
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
function re(r) {
  const e = r.toLowerCase();
  return Aa[e] || r.toUpperCase();
}
class _t {
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
    const { locale: e, size: t, mode: n, localeExists: s } = this.config, { loading: o, created: i, error: a } = this.state, l = re(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = n === "button" ? "rounded-lg" : "rounded-full";
    let u, p = "";
    o ? (u = "bg-gray-100 text-gray-600 border-gray-300", p = this.renderSpinner()) : i ? (u = "bg-green-100 text-green-700 border-green-300", p = this.renderCheckIcon()) : a ? (u = "bg-red-100 text-red-700 border-red-300", p = this.renderErrorIcon()) : s ? u = "bg-blue-100 text-blue-700 border-blue-300" : u = "bg-amber-100 text-amber-700 border-amber-300";
    const f = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${c} ${d} border ${u}"
           data-locale-action="${w(e)}"
           data-locale-exists="${s}"
           data-loading="${o}"
           data-created="${i}"
           role="group"
           aria-label="${l} translation">
        ${p}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${w(e)}</span>
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
                data-locale="${w(e)}"
                aria-label="Create ${re(e)} translation"
                title="Create ${re(e)} translation">
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
                data-locale="${w(e)}"
                aria-label="Open ${re(e)} translation"
                title="Open ${re(e)} translation">
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
        };
        this.config.environment && (e.environment = this.config.environment), this.config.panelName && (e.policy_entity = this.config.panelName);
        const t = `${this.config.apiEndpoint}/actions/create_translation`, n = await cr(t, e);
        if (n.success) {
          const s = n.data?.id ? String(n.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: s
          });
          const o = {
            id: s || this.config.recordId,
            locale: this.config.locale,
            status: String(n.data?.status || "draft"),
            translationGroupId: n.data?.translation_group_id ? String(n.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, o);
        } else {
          const s = n.error?.message || "Failed to create translation";
          this.setState({ loading: !1, error: s }), this.config.onError?.(this.config.locale, s);
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
    const { locale: e, navigationBasePath: t, recordId: n, environment: s } = this.config, { newRecordId: o } = this.state, i = o || n, a = new URLSearchParams();
    a.set("locale", e), s && a.set("env", s);
    const l = `${t}/${i}/edit?${a.toString()}`;
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
function Pn(r) {
  return new _t(r).render();
}
function Oc(r, e) {
  return r.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${r.map((n) => {
    const s = { ...e, locale: n };
    return Pn(s);
  }).join("")}
    </div>
  `;
}
function Fc(r, e) {
  const t = /* @__PURE__ */ new Map();
  return r.querySelectorAll("[data-locale-action]").forEach((s) => {
    const o = s.getAttribute("data-locale-action");
    if (!o) return;
    const i = s.getAttribute("data-locale-exists") === "true", a = { ...e, locale: o, localeExists: i }, l = new _t(a), c = s.parentElement;
    c && (l.mount(c), t.set(o, l));
  }), t;
}
function Ur(r, e, t, n) {
  const s = new URLSearchParams();
  return s.set("locale", t), n && s.set("env", n), `${r}/${e}/edit?${s.toString()}`;
}
class Cr {
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
    const { context: e, showFormLockMessage: t } = this.config, n = e.requestedLocale || "requested", s = e.resolvedLocale || "default", o = re(n), i = re(s), a = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${w(n)}"
           data-resolved-locale="${w(s)}">
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
                The <strong class="font-medium">${w(o)}</strong> (${w(n.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${w(i)}</strong> (${w(s.toUpperCase())}).
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
    const { context: e, apiEndpoint: t, navigationBasePath: n, panelName: s, environment: o } = this.config, i = e.requestedLocale;
    return !i || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${w(i)}"
              data-record-id="${w(e.recordId)}"
              data-api-endpoint="${w(t)}"
              data-panel="${w(s || "")}"
              data-environment="${w(o || "")}"
              aria-label="Create ${re(i)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${w(i.toUpperCase())} translation
      </button>
    `;
  }
  /**
   * Render the secondary CTA (Open source locale).
   */
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, environment: n } = this.config, s = e.resolvedLocale;
    if (!s || !e.recordId)
      return "";
    const o = Ur(t, e.recordId, s, n);
    return `
      <a href="${w(o)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${w(s)}"
         aria-label="Open ${re(s)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${w(s.toUpperCase())} (source)
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
    const { context: e, apiEndpoint: t, panelName: n, environment: s, navigationBasePath: o } = this.config, i = e.requestedLocale, a = e.recordId;
    if (!i || !a) return;
    await new _t({
      locale: i,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: o,
      panelName: n,
      environment: s,
      localeExists: !1,
      onCreateSuccess: (c, d) => {
        this.config.onCreateSuccess?.(c, d);
        const u = Ur(o, d.id, c, s);
        window.location.href = u;
      },
      onError: (c, d) => {
        this.config.onError?.(d);
      }
    }).handleCreate();
  }
}
function La(r, e) {
  if (!e.locked) {
    _a(r);
    return;
  }
  if (r.classList.add("form-locked", "pointer-events-none", "opacity-75"), r.setAttribute("data-form-locked", "true"), r.setAttribute("data-lock-reason", e.reason || ""), r.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((n) => {
    n.setAttribute("disabled", "true"), n.setAttribute("data-was-enabled", "true"), n.setAttribute("aria-disabled", "true");
  }), !r.querySelector("[data-form-lock-overlay]")) {
    const n = document.createElement("div");
    n.setAttribute("data-form-lock-overlay", "true"), n.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", n.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(r).position === "static" && (r.style.position = "relative"), r.appendChild(n);
  }
}
function _a(r) {
  r.classList.remove("form-locked", "pointer-events-none", "opacity-75"), r.removeAttribute("data-form-locked"), r.removeAttribute("data-lock-reason"), r.querySelectorAll('[data-was-enabled="true"]').forEach((n) => {
    n.removeAttribute("disabled"), n.removeAttribute("data-was-enabled"), n.removeAttribute("aria-disabled");
  }), r.querySelector("[data-form-lock-overlay]")?.remove();
}
function qc(r) {
  return r.getAttribute("data-form-locked") === "true";
}
function jc(r) {
  return r.getAttribute("data-lock-reason");
}
function Nc(r, e) {
  const t = me(r);
  return new Cr({ ...e, context: t }).render();
}
function zc(r) {
  const e = me(r);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Gc(r, e) {
  const t = new Cr(e);
  return t.mount(r), t;
}
function Hc(r, e) {
  const t = me(e), s = new Cr({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return La(r, s), s;
}
class Bn {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = Z(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  /**
   * Extract action state for a specific action from the record.
   */
  extractActionState(e, t) {
    const n = e._action_state;
    if (!n || typeof n != "object" || Array.isArray(n))
      return null;
    const s = n[t];
    return !s || typeof s != "object" || Array.isArray(s) ? null : s;
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
    const t = this.isCreateActionEnabled(), n = this.getDisabledReason(), s = this.getOverflowCount(), o = e.map(
      (l) => this.renderChip(l, t, n)
    ).join(""), i = s > 0 ? this.renderOverflow(s) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${w(this.config.recordId)}"
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
    const { recordId: s, apiEndpoint: o, navigationBasePath: i, panelName: a, environment: l, size: c } = this.config;
    return t ? Pn({
      locale: e,
      recordId: s,
      apiEndpoint: o,
      navigationBasePath: i,
      panelName: a,
      environment: l,
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
    const s = n === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", o = t || "Translation creation unavailable", i = re(e);
    return `
      <div class="inline-flex items-center gap-1 ${s} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${w(e)}"
           data-disabled="true"
           title="${w(o)}"
           role="listitem"
           aria-label="${i} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${w(e)}</span>
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
            title="Also missing: ${w(s)}"
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
      const s = new _t({
        locale: n,
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
function Ta(r, e) {
  const t = String(r.id || "");
  return t ? new Bn(r, { ...e, recordId: t }).render() : "";
}
function Uc(r) {
  const e = Z(r);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function Vc(r, e, t) {
  const n = String(e.id || ""), s = new Bn(e, { ...t, recordId: n });
  return s.mount(r), s;
}
function Kc(r) {
  return (e, t, n) => Ta(t, r);
}
function Tt() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function Da() {
  return Tt() ? "⌘" : "Ctrl";
}
function Ia(r) {
  if (Tt())
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
function On(r) {
  const e = r.modifiers.map(Ia), t = Ra(r.key);
  return Tt() ? [...e, t].join("") : [...e, t].join("+");
}
function Ra(r) {
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
class Fn {
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
    const o = Tt(), i = new Set(e.modifiers), a = i.has("ctrl"), l = i.has("meta"), c = i.has("alt"), d = i.has("shift");
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
function Ma(r) {
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
function Jc(r) {
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
        const l = On(a);
        s += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${Ce(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${Ce(l)}</kbd>
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
function Ce(r) {
  const e = typeof document < "u" ? document.createElement("div") : null;
  return e ? (e.textContent = r, e.innerHTML) : r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const qn = "admin_keyboard_shortcuts_settings", jn = "admin_keyboard_shortcuts_hint_dismissed", mt = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function Dt() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function Pa() {
  const r = Dt();
  if (!r)
    return { ...mt };
  try {
    const e = r.getItem(qn);
    if (!e)
      return { ...mt };
    const t = JSON.parse(e);
    return {
      enabled: typeof t.enabled == "boolean" ? t.enabled : !0,
      shortcuts: typeof t.shortcuts == "object" && t.shortcuts !== null ? t.shortcuts : {},
      updatedAt: typeof t.updatedAt == "string" ? t.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...mt };
  }
}
function Yc(r) {
  const e = Dt();
  if (e)
    try {
      const t = {
        ...r,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      e.setItem(qn, JSON.stringify(t));
    } catch {
    }
}
function Ba() {
  const r = Dt();
  return r ? r.getItem(jn) === "true" : !1;
}
function Oa() {
  const r = Dt();
  if (r)
    try {
      r.setItem(jn, "true");
    } catch {
    }
}
function Fa(r) {
  if (Ba())
    return null;
  const { container: e, position: t = "bottom", onDismiss: n, onShowHelp: s, autoDismissMs: o = 1e4 } = r, i = document.createElement("div");
  i.className = `shortcuts-discovery-hint fixed ${t === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, i.setAttribute("role", "alert"), i.setAttribute("aria-live", "polite");
  const a = Da();
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
    c && Oa(), i.remove(), n?.();
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
function Xc(r) {
  const { container: e, shortcuts: t, settings: n, onSettingsChange: s } = r, o = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, i = /* @__PURE__ */ new Map();
  for (const p of t) {
    const f = i.get(p.category) || [];
    f.push(p), i.set(p.category, f);
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
  for (const p of a) {
    const f = i.get(p);
    if (!(!f || f.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${o[p]}
        </h4>
        <div class="space-y-1">
    `;
      for (const h of f) {
        const m = n.shortcuts[h.id] !== !1, S = On(h);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${Ce(S)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${Ce(h.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${Ce(h.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${Ce(h.id)}"
                 ${m ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${Ce(h.description)} shortcut">
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
      ...n,
      enabled: !n.enabled
    };
    s(p);
  }), e.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((p) => {
    p.addEventListener("change", () => {
      const f = p.getAttribute("data-shortcut-id");
      if (!f) return;
      const h = {
        ...n,
        shortcuts: {
          ...n.shortcuts,
          [f]: p.checked
        }
      };
      s(h);
    });
  }), e.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    s({ ...mt });
  });
}
function qa(r, e) {
  const t = r;
  t.config && (t.config.enabled = e.enabled);
  for (const n of r.getShortcuts()) {
    const s = e.shortcuts[n.id] !== !1;
    r.setEnabled(n.id, s);
  }
}
let Ht = null;
function Wc() {
  return Ht || (Ht = new Fn()), Ht;
}
function ja(r, e) {
  const t = Pa(), n = new Fn({
    ...e,
    enabled: t.enabled
  }), s = Ma(r);
  for (const o of s)
    n.register(o);
  return qa(n, t), n.bind(), n;
}
function Qc(r, e) {
  const t = ja(r, e);
  return e.hintContainer && Fa({
    container: e.hintContainer,
    onShowHelp: e.onShowHelp,
    onDismiss: () => {
    }
  }), t;
}
const Na = 1500, za = 2e3, Er = "autosave", ze = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Ga = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
};
class Nn {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? Na,
      savedDurationMs: e.savedDurationMs ?? za,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Er,
      labels: { ...ze, ...e.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: { ...Ga, ...e.conflictLabels }
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
          t.success(this.config.labels.saved ?? ze.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? ze.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? ze.conflict);
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
function Zc(r) {
  return new Nn({
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
function ed(r, e = {}) {
  const t = e.classPrefix ?? Er, s = { ...ze, ...e.labels }[r] || "";
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
function td(r = Er) {
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
function rd(r, e) {
  const { watchFields: t, indicatorSelector: n, ...s } = e;
  let o = s.container;
  !o && n && (o = r.querySelector(n) ?? void 0);
  const i = new Nn({
    ...s,
    container: o
  }), a = () => {
    const p = new FormData(r), f = {};
    return p.forEach((h, m) => {
      f[m] = h;
    }), f;
  }, l = (p) => {
    const f = p.target;
    if (f) {
      if (t && t.length > 0) {
        const h = f.name;
        if (!h || !t.includes(h))
          return;
      }
      i.markDirty(a());
    }
  };
  r.addEventListener("input", l), r.addEventListener("change", l), r.addEventListener("submit", async (p) => {
    i.hasPendingChanges() && (p.preventDefault(), await i.save() && r.submit());
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
    r.removeEventListener("input", l), r.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), u();
  }, i;
}
const zn = "char-counter", Ha = "interpolation-preview", Gn = "dir-toggle", Hn = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: "Mustache", example: "{{name}}" },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: "ICU", example: "{name}" },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: "Printf", example: "%s" },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: "Named Printf", example: "%(name)s" },
  { pattern: /\$\{(\w+)\}/g, name: "Template Literal", example: "${name}" }
], Ua = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
};
class Va {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? zn,
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
class Ka {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? Ua,
      patterns: [...Hn, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Ha
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
      return this.escapeHtml(e);
    t.sort((i, a) => i.start - a.start);
    let s = "", o = 0;
    for (const i of t) {
      s += this.escapeHtml(e.slice(o, i.start));
      const a = this.getSampleValue(i.variable), l = e.slice(i.start, i.end);
      s += `<span class="${n}__variable" title="${this.escapeHtml(l)}">${this.escapeHtml(a ?? l)}</span>`, o = i.end;
    }
    return s += this.escapeHtml(e.slice(o)), s;
  }
  /**
   * Render the preview HTML structure.
   */
  render() {
    const e = this.config.classPrefix, n = this.getMatches().length === 0;
    return `<div class="${e}${n ? ` ${e}--empty` : ""}">
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
    for (const [n, s] of Object.entries(this.config.sampleValues))
      if (n.toLowerCase() === t)
        return s;
    return null;
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}
class Ja {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Gn,
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
function nd(r, e = {}) {
  const t = [], n = [], s = [];
  for (const o of e.charCounterFields ?? []) {
    const i = r.querySelector(`[name="${o}"]`);
    i && t.push(new Va({
      input: i,
      ...e.charCounterConfig
    }));
  }
  for (const o of e.interpolationFields ?? []) {
    const i = r.querySelector(`[name="${o}"]`);
    i && n.push(new Ka({
      input: i,
      ...e.interpolationConfig
    }));
  }
  for (const o of e.directionToggleFields ?? []) {
    const i = r.querySelector(`[name="${o}"]`);
    i && s.push(new Ja({
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
function sd(r, e, t, n = zn) {
  const s = [n];
  t && s.push(`${n}--${t}`);
  const o = e ? `${r} / ${e}` : `${r}`;
  return `<span class="${s.join(" ")}" aria-live="polite">${o}</span>`;
}
function od(r, e = Gn) {
  const t = r === "rtl", n = t ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${r.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${n}</svg>
    <span class="${e}__label">${r.toUpperCase()}</span>
  </button>`;
}
function id() {
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
function ad(r, e = Hn) {
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
function ld(r, e, t) {
  return t && r >= t ? "error" : e && r >= e ? "warning" : null;
}
function Ya(r) {
  return typeof r == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(r) ? r : "none";
}
function Xa(r) {
  return r === "core+exchange" || r === "full";
}
function Wa(r) {
  return r === "core+queue" || r === "full";
}
function cd(r) {
  return r !== "none";
}
function Qa(r) {
  if (!r || typeof r != "object")
    return null;
  const e = r, t = Ya(e.profile || e.capability_mode), n = typeof e.schema_version == "number" ? e.schema_version : 0;
  return {
    profile: t,
    capability_mode: t,
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.filter(
      (s) => typeof s == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(s)
    ) : ["none", "core", "core+exchange", "core+queue", "full"],
    schema_version: n,
    modules: Za(e.modules),
    features: tl(e.features),
    routes: rl(e.routes),
    panels: nl(e.panels),
    resolver_keys: sl(e.resolver_keys),
    warnings: ol(e.warnings),
    contracts: e.contracts && typeof e.contracts == "object" ? e.contracts : void 0
  };
}
function Za(r) {
  if (!r || typeof r != "object")
    return {};
  const e = r, t = {};
  return e.exchange && typeof e.exchange == "object" && (t.exchange = Vr(e.exchange)), e.queue && typeof e.queue == "object" && (t.queue = Vr(e.queue)), t;
}
function Vr(r) {
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
    entry: Un(e.entry),
    actions: el(e.actions)
  };
}
function Un(r) {
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
function el(r) {
  if (!r || typeof r != "object")
    return {};
  const e = r, t = {};
  for (const [n, s] of Object.entries(e))
    s && typeof s == "object" && (t[n] = Un(s));
  return t;
}
function tl(r) {
  if (!r || typeof r != "object")
    return {};
  const e = r;
  return {
    cms: e.cms === !0,
    dashboard: e.dashboard === !0
  };
}
function rl(r) {
  if (!r || typeof r != "object")
    return {};
  const e = {}, t = r;
  for (const [n, s] of Object.entries(t))
    typeof s == "string" && (e[n] = s);
  return e;
}
function nl(r) {
  return Array.isArray(r) ? r.filter((e) => typeof e == "string") : [];
}
function sl(r) {
  return Array.isArray(r) ? r.filter((e) => typeof e == "string") : [];
}
function ol(r) {
  return Array.isArray(r) ? r.filter((e) => typeof e == "string") : [];
}
class Vn {
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
    return e === "exchange" ? Xa(t) : Wa(t);
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
function Kr(r) {
  const e = Qa(r);
  return e ? new Vn(e) : null;
}
function dd() {
  return new Vn({
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
function ud(r) {
  return r.visible ? r.enabled ? "" : `aria-disabled="true"${r.reason ? ` title="${Kn(r.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function il(r) {
  if (r.enabled || !r.reason)
    return "";
  const e = (r.reasonCode || "").trim();
  return e ? en(e, { size: "sm", showFullMessage: !0 }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${Kn(r.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${al(r.reason)}
    </span>
  `.trim();
}
function al(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Kn(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function pd() {
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
function ll(r, e) {
  if (!e.visible) {
    r.style.display = "none", r.setAttribute("aria-hidden", "true");
    return;
  }
  r.style.display = "", r.removeAttribute("aria-hidden"), e.enabled ? (r.removeAttribute("aria-disabled"), r.classList.remove("capability-gate-disabled"), r.removeAttribute("title"), delete r.dataset.reasonCode, r.removeEventListener("click", Jr, !0)) : (r.setAttribute("aria-disabled", "true"), r.classList.add("capability-gate-disabled"), e.reason && (r.setAttribute("title", e.reason), r.dataset.reasonCode = e.reasonCode || ""), r.addEventListener("click", Jr, !0));
}
function Jr(r) {
  r.currentTarget.getAttribute("aria-disabled") === "true" && (r.preventDefault(), r.stopPropagation());
}
function fd(r, e) {
  r.querySelectorAll("[data-capability-gate]").forEach((n) => {
    const s = n.dataset.capabilityGate;
    if (s)
      try {
        const o = JSON.parse(s), i = e.gateNavItem(o);
        ll(n, i);
      } catch {
        console.warn("Invalid capability gate config:", s);
      }
  });
}
const cl = {
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
}, dl = [
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
class ul {
  constructor(e) {
    this.container = null, this.state = "loading", this.gateResult = null, this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || dl,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: { ...cl, ...e.labels || {} }
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
      <div class="translator-dashboard" role="region" aria-label="${R(e.title)}">
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
        <h2 class="dashboard-title">${R(e.title)}</h2>
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
        <div class="summary-label">${R(t)}</div>
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
        <span class="filter-label">${R(e.label)}</span>
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
        <p>${R(e.loading)}</p>
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
        <p class="error-message">${R(e.error)}</p>
        ${this.error ? `<p class="error-detail">${R(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${R(e.retry)}</button>
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
        <p class="empty-title">${R(e.noAssignments)}</p>
        <p class="empty-description">${R(e.noAssignmentsDescription)}</p>
      </div>
    `;
  }
  /**
   * Render disabled state (TX-101: visible-disabled module/dashboard UX).
   * Shows the dashboard structure but with disabled controls and a reason badge.
   * This is distinct from error state (transport failure) and empty state (no data).
   */
  renderDisabled() {
    const e = this.gateResult?.reason || "Access to this feature is not available.", t = this.gateResult ? il(this.gateResult) : "";
    return `
      <div class="dashboard-disabled" role="alert" aria-live="polite">
        <div class="disabled-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="disabled-title">Translator Dashboard Unavailable</p>
        <p class="disabled-description">${R(e)}</p>
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
              <th scope="col">${R(e.sourceTitle)}</th>
              <th scope="col">${R(e.targetLocale)}</th>
              <th scope="col">${R(e.status)}</th>
              <th scope="col">${R(e.dueDate)}</th>
              <th scope="col">${R(e.priority)}</th>
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
    const t = pl(e.due_state), n = fl(e.priority), s = tt(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), o = e.due_date ? gl(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${Fe(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${R(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${R(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${R(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${R(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          ${s}
        </td>
        <td class="due-cell ${t}">
          ${o}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${n}">${R(hl(e.priority))}</span>
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
      <button type="button" class="action-btn open-btn" data-action="open" title="${Fe(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const o = e.review_actions;
    return s && e.queue_state === "in_progress" && o.submit_review.enabled && n.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${Fe(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), s && e.queue_state === "review" && (o.approve.enabled && n.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${Fe(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), o.reject.enabled && n.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${Fe(t.reject)}">
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
        d.addEventListener("click", async (u) => {
          u.stopPropagation();
          const p = d.dataset.action;
          p && (p === "open" ? this.openAssignment(l) : typeof this.config.onActionClick == "function" && await this.config.onActionClick(p, l));
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
function R(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Fe(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function pl(r) {
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
function fl(r) {
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
function hl(r) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function gl(r) {
  const e = /* @__PURE__ */ new Date(), t = r.getTime() - e.getTime(), n = Math.ceil(t / (1e3 * 60 * 60 * 24));
  return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n <= 7 ? `${n}d` : r.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function hd() {
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
function ml(r, e) {
  const t = new ul(e);
  return t.mount(r), t;
}
function gd(r) {
  return bl(r);
}
function bl(r, e = {}) {
  const t = r.dataset.myWorkEndpoint;
  if (!t)
    return console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null;
  const n = yl(e);
  return ml(r, {
    myWorkEndpoint: t,
    panelBaseUrl: r.dataset.panelBaseUrl,
    queueEndpoint: r.dataset.queueEndpoint,
    refreshInterval: parseInt(r.dataset.refreshInterval || "0", 10),
    capabilityGate: n || void 0
  });
}
function yl(r) {
  if (r.capabilityGate)
    return r.capabilityGate;
  if (r.capabilitiesPayload !== void 0)
    return Kr(r.capabilitiesPayload);
  const e = vl();
  return e === null ? null : Kr(e);
}
function vl() {
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
const wl = {
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
class xl {
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
    const t = { ...wl, ...e.labels || {} };
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
      <div class="exchange-import" role="dialog" aria-label="${$(e.title)}">
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
        <h3 class="import-title">${$(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${$(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${$(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${$(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${$(t.skipped)}</span>
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
          <span class="dropzone-text">${$(e.selectFile)}</span>
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
        <p>${$(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, n = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${$(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${$(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${n} ${$(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${$(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${$(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${$(e.dryRun)}
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
                <th scope="col">${$(e.resource)}</th>
                <th scope="col">${$(e.field)}</th>
                <th scope="col">${$(e.status)}</th>
                <th scope="col">${$(e.translatedText)}</th>
                <th scope="col">${$(e.conflictResolution)}</th>
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
    const t = Qr(e.status, "exchange"), n = e.status === "error", s = tt(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${n ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${$(e.resource)}</span>
          <span class="entity-id">${$(e.entityId)}</span>
        </td>
        <td class="field-cell">${$(e.fieldPath)}</td>
        <td class="status-cell">
          ${s}
          ${e.error ? `<span class="error-message" title="${dt(e.error)}">${$(Sl(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${dt(e.targetLocale)}">${$(e.targetLocale)}</span>
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
        <option value="skip" ${n === "skip" ? "selected" : ""}>${$(t.skip)}</option>
        <option value="keep_current" ${n === "keep_current" ? "selected" : ""}>${$(t.keepCurrent)}</option>
        <option value="accept_incoming" ${n === "accept_incoming" ? "selected" : ""}>${$(t.acceptIncoming)}</option>
        <option value="force" ${n === "force" ? "selected" : ""}>${$(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${dt(t.conflictDetails)}">?</button>` : ""}
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
        <p class="error-message">${$(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${$(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, n = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${$(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${$(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !n.enabled ? "disabled" : ""}
                  ${n.enabled ? "" : `aria-disabled="true" title="${dt(n.reason || e.applyDisabledReason)}"`}>
            ${$(e.applyButton)}
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
      const h = f.target;
      h.files?.[0] && this.setFile(h.files[0]);
    }), this.container.querySelector(".data-input")?.addEventListener("input", (f) => {
      const h = f.target;
      this.rawData = h.value;
    }), this.container.querySelector(".validate-btn")?.addEventListener("click", () => this.validate()), this.container.querySelector(".apply-btn")?.addEventListener("click", () => this.apply()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".reset-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".select-all-btn")?.addEventListener("click", () => this.selectAll()), this.container.querySelector(".deselect-all-btn")?.addEventListener("click", () => this.deselectAll()), this.container.querySelector(".select-all-checkbox")?.addEventListener("change", (f) => {
      f.target.checked ? this.selectAll() : this.deselectAll();
    }), this.container.querySelectorAll(".row-checkbox").forEach((f) => {
      f.addEventListener("change", () => {
        const h = f.closest(".preview-row"), m = parseInt(h?.dataset.index || "", 10);
        isNaN(m) || this.toggleRowSelection(m);
      });
    }), this.container.querySelectorAll(".resolution-select").forEach((f) => {
      f.addEventListener("change", () => {
        const h = parseInt(f.dataset.index || "", 10);
        isNaN(h) || this.setRowResolution(h, f.value);
      });
    }), this.container.querySelectorAll(".option-checkbox input").forEach((f) => {
      f.addEventListener("change", () => {
        const h = f.name;
        h && this.setApplyOption(h, f.checked);
      });
    });
  }
}
function $(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function dt(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Sl(r, e) {
  return r.length <= e ? r : r.slice(0, e - 3) + "...";
}
function md() {
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
function Cl(r, e) {
  const t = new xl(e);
  return t.mount(r), t;
}
function bd(r) {
  const e = r.dataset.validateEndpoint, t = r.dataset.applyEndpoint;
  return !e || !t ? (console.warn("ExchangeImport: Missing required data attributes"), null) : Cl(r, {
    validateEndpoint: e,
    applyEndpoint: t
  });
}
const El = {
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
}, $l = 2e3, kl = 300, Al = "async_job_";
class Jn {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = { ...El, ...e.labels || {} };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || Al,
      pollInterval: e.pollInterval || $l,
      maxPollAttempts: e.maxPollAttempts || kl,
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
      <div class="async-progress" role="region" aria-label="${O(e.title)}">
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
          <h4 class="progress-title">${O(e.title)}</h4>
          <span class="progress-status">${O(e.noActiveJob)}</span>
        </div>
      `;
    const t = Qr(this.job.status, "exchange"), n = this.getStatusLabel(), s = this.pollingState === "paused" ? `<span class="progress-status ${t}">${O(n)}</span>` : tt(this.job.status, { domain: "exchange", size: "sm" });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${O(e.title)}</h4>
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
            <span class="counter-label">${O(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${O(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${O(e.failedCount)}:</span>
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
          <span class="info-label">${O(e.jobId)}:</span>
          <code class="info-value">${O(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${O(e.elapsed)}:</span>
            <span class="info-value">${O(t)}</span>
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
          <span class="conflicts-label">${O(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([n, s]) => `
              <span class="conflict-type">
                <span class="type-name">${O(n)}:</span>
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
        <span class="error-message">${O(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${O(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${O(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${O(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${O(e.dismiss)}</button>`), t.length === 0 ? "" : `
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
function O(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function yd() {
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
function Ll(r, e) {
  const t = new Jn(e);
  return t.mount(r), t;
}
function vd(r) {
  const e = r.dataset.pollInterval ? parseInt(r.dataset.pollInterval, 10) : void 0, t = r.dataset.autoStart !== "false";
  return Ll(r, {
    pollInterval: e,
    autoStart: t
  });
}
function wd(r, e) {
  const t = new Jn(e);
  return t.hasPersistedJob(r) ? t : null;
}
const Ut = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function _l(r) {
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
function Tl(r, e) {
  return !r || !r.hasDrift ? !1 : r.changedFieldsSummary.fields.some(
    (t) => t.toLowerCase() === e.toLowerCase()
  );
}
function xd(r) {
  return !r || !r.hasDrift ? [] : [...r.changedFieldsSummary.fields];
}
class Dl {
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
      labels: { ...Ut, ...e.labels }
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
              <span class="sbs-column-title">${te(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${n.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${te(t.targetColumn)}</span>
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
    const n = { ...Ut, ...t }, s = e.changedFieldsSummary.count, o = e.changedFieldsSummary.fields, i = o.length > 0 ? `<ul class="sbs-drift-fields-list">${o.map((a) => `<li>${te(a)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${te(n.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${te(n.driftBannerDescription)}
            ${s > 0 ? `<span class="sbs-drift-count">${s} field${s !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${i}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${te(n.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  /**
   * Render a single field row
   */
  renderFieldRow(e, t) {
    const n = { ...Ut, ...t }, s = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${te(n.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", o = this.renderSourceField(e), i = this.renderTargetField(e), a = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${N(e.key)}"
              title="${N(n.copySourceButton)}"
              aria-label="${N(n.copySourceButton)} for ${N(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${N(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${te(e.label)}
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
    const t = te(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${N(e.key)}"
             aria-label="Source: ${N(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${N(e.key)}"
           aria-label="Source: ${N(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  /**
   * Render target field (editable)
   */
  renderTargetField(e) {
    const t = te(e.targetValue || ""), n = e.placeholder ? `placeholder="${N(e.placeholder)}"` : "", s = e.required ? "required" : "", o = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${N(e.key)}"
                  data-field="${N(e.key)}"
                  aria-label="Translation: ${N(e.label)}"
                  ${n}
                  ${s}
                  ${o}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${N(e.key)}"
             data-field="${N(e.key)}"
             value="${t}"
             aria-label="Translation: ${N(e.label)}"
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
function Il(r) {
  const e = new Dl(r);
  return e.render(), e;
}
function Sd(r, e, t, n, s) {
  const o = _l(e), i = n.map((a) => ({
    key: a,
    label: a.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    type: "text",
    hasSourceChanged: Tl(o, a),
    sourceValue: String(t[a] || ""),
    targetValue: String(e[a] || ""),
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || ""
  }));
  return Il({
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
function Cd() {
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
function te(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function N(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export {
  ns as ActionRenderer,
  yc as AdvancedSearch,
  Jn as AsyncProgress,
  Nn as AutosaveIndicator,
  Vt as CORE_READINESS_DISPLAY,
  Vn as CapabilityGate,
  Ss as CellRendererRegistry,
  Va as CharacterCounter,
  Ci as ColumnManager,
  lc as CommonRenderers,
  dl as DEFAULT_FILTER_PRESETS,
  Hn as DEFAULT_INTERPOLATION_PATTERNS,
  Ua as DEFAULT_SAMPLE_VALUES,
  Ut as DEFAULT_SIDE_BY_SIDE_LABELS,
  wa as DEFAULT_STATUS_LEGEND_ITEMS,
  Mn as DEFAULT_TRANSLATION_QUICK_FILTERS,
  Qt as DISABLED_REASON_DISPLAY,
  ir as DataGrid,
  ma as DefaultColumnVisibilityBehavior,
  Ja as DirectionToggle,
  Wt as EXCHANGE_JOB_STATUS_DISPLAY,
  Xt as EXCHANGE_ROW_STATUS_DISPLAY,
  xl as ExchangeImport,
  Cr as FallbackBanner,
  vc as FilterBuilder,
  $c as GoCrudBulkActionBehavior,
  Ec as GoCrudExportBehavior,
  xc as GoCrudFilterBehavior,
  Sc as GoCrudPaginationBehavior,
  wc as GoCrudSearchBehavior,
  Cc as GoCrudSortBehavior,
  Bn as InlineLocaleChips,
  Ka as InterpolationPreview,
  Fn as KeyboardShortcutRegistry,
  nn as LocalDataGridStateStore,
  _t as LocaleActionChip,
  ba as PayloadInputModal,
  Ds as PreferencesDataGridStateStore,
  Jt as QUEUE_CONTENT_STATE_DISPLAY,
  Yt as QUEUE_DUE_STATE_DISPLAY,
  Kt as QUEUE_STATE_DISPLAY,
  Sa as QuickFilters,
  va as SchemaActionBuilder,
  kc as ServerColumnVisibilityBehavior,
  Dl as SideBySideEditor,
  Rn as StatusLegend,
  xr as TranslationBlockerModal,
  ul as TranslatorDashboard,
  La as applyFormLock,
  ll as applyGateToElement,
  qa as applyShortcutSettings,
  Ur as buildLocaleEditUrl,
  Ac as buildSchemaRowActions,
  wd as checkForPersistedJob,
  pc as collapseAllGroups,
  Ll as createAsyncProgress,
  Bc as createBulkCreateMissingHandler,
  Kr as createCapabilityGate,
  Is as createDataGridStateStore,
  dd as createEmptyCapabilityGate,
  Cl as createExchangeImport,
  Kc as createInlineLocaleChipsRenderer,
  ds as createLocaleBadgeRenderer,
  Vl as createReasonCodeCellRenderer,
  Il as createSideBySideEditor,
  Ul as createStatusCellRenderer,
  xa as createStatusLegend,
  Zc as createTranslationAutosave,
  ic as createTranslationMatrixRenderer,
  Ca as createTranslationQuickFilters,
  Ma as createTranslationShortcuts,
  Ar as createTranslationStatusRenderer,
  ml as createTranslatorDashboard,
  Ys as decodeExpandedGroupsToken,
  ad as detectInterpolations,
  Oa as dismissShortcutHint,
  gc as encodeExpandedGroupsToken,
  Ea as executeBulkCreateMissing,
  uc as expandAllGroups,
  Gs as extractBackendSummaries,
  Qa as extractCapabilities,
  kd as extractExchangeError,
  Lc as extractSchemaActions,
  _l as extractSourceTargetDrift,
  me as extractTranslationContext,
  Z as extractTranslationReadiness,
  On as formatShortcutDisplay,
  Ad as generateExchangeReport,
  zl as getAllReasonCodes,
  yd as getAsyncProgressStyles,
  td as getAutosaveIndicatorStyles,
  pd as getCapabilityGateStyles,
  xd as getChangedFields,
  ld as getCharCountSeverity,
  Wc as getDefaultShortcutRegistry,
  Et as getDisabledReasonDisplay,
  md as getExchangeImportStyles,
  fc as getExpandedGroupIds,
  id as getFieldHelperStyles,
  jc as getFormLockReason,
  re as getLocaleLabel,
  oc as getMissingTranslationsCount,
  Ia as getModifierSymbol,
  Hs as getPersistedExpandState,
  Js as getPersistedViewMode,
  Da as getPrimaryModifierLabel,
  Gl as getSeverityCssClass,
  Cd as getSideBySideEditorStyles,
  Qr as getStatusCssClass,
  De as getStatusDisplay,
  Jl as getStatusVocabularyStyles,
  Nl as getStatusesForDomain,
  hd as getTranslatorDashboardStyles,
  hr as getViewModeForViewport,
  Ld as groupRowResultsByStatus,
  sn as hasBackendGroupedRows,
  Tl as hasFieldDrift,
  sc as hasMissingTranslations,
  Xl as hasTranslationContext,
  Wl as hasTranslationReadiness,
  vd as initAsyncProgress,
  fd as initCapabilityGating,
  bd as initExchangeImport,
  Gc as initFallbackBanner,
  nd as initFieldHelpers,
  rd as initFormAutosave,
  Hc as initFormLock,
  Vc as initInlineLocaleChips,
  ja as initKeyboardShortcuts,
  Qc as initKeyboardShortcutsWithDiscovery,
  Fc as initLocaleActionChips,
  Ic as initQuickFilters,
  Sd as initSideBySideEditorFromRecord,
  Tc as initStatusLegends,
  gd as initTranslatorDashboard,
  bl as initTranslatorDashboardWithOptions,
  Kl as initializeVocabularyFromPayload,
  cd as isCoreEnabled,
  Xa as isExchangeEnabled,
  _d as isExchangeError,
  qc as isFormLocked,
  Yl as isInFallbackMode,
  Tt as isMacPlatform,
  ro as isNarrowViewport,
  Wa as isQueueEnabled,
  Ql as isReadyForTransition,
  Ba as isShortcutHintDismissed,
  jl as isValidReasonCode,
  ql as isValidStatus,
  Pa as loadShortcutSettings,
  zs as mergeBackendSummaries,
  Ms as normalizeBackendGroupedRows,
  Ya as parseCapabilityMode,
  Td as parseImportResult,
  gn as parseViewMode,
  cc as persistExpandState,
  hc as persistViewMode,
  _a as removeFormLock,
  ed as renderAutosaveIndicator,
  os as renderAvailableLocalesIndicator,
  Pc as renderBulkResultInline,
  Mc as renderBulkResultSummary,
  sd as renderCharacterCounter,
  od as renderDirectionToggle,
  il as renderDisabledReasonBadge,
  Fa as renderDiscoveryHint,
  Nc as renderFallbackBannerFromRecord,
  ac as renderFallbackWarning,
  ud as renderGateAriaAttributes,
  Zs as renderGroupHeaderRow,
  Xs as renderGroupHeaderSummary,
  to as renderGroupedEmptyState,
  bc as renderGroupedErrorState,
  mc as renderGroupedLoadingState,
  Ta as renderInlineLocaleChips,
  Pn as renderLocaleActionChip,
  Oc as renderLocaleActionList,
  tn as renderLocaleBadge,
  rc as renderLocaleCompleteness,
  nc as renderMissingTranslationsBadge,
  tc as renderPublishReadinessBadge,
  Rc as renderQuickFiltersHTML,
  ec as renderReadinessIndicator,
  en as renderReasonCodeBadge,
  Hl as renderReasonCodeIndicator,
  Xc as renderShortcutSettingsUI,
  Jc as renderShortcutsHelpContent,
  Zl as renderStatusBadge,
  Dc as renderStatusLegendHTML,
  ls as renderTranslationMatrixCell,
  is as renderTranslationStatusCell,
  tt as renderVocabularyStatusBadge,
  Zr as renderVocabularyStatusIcon,
  Yc as saveShortcutSettings,
  zc as shouldShowFallbackBanner,
  Uc as shouldShowInlineLocaleChips,
  _c as showTranslationBlocker,
  dc as toggleGroupExpand,
  Rs as transformToGroups
};
//# sourceMappingURL=index.js.map

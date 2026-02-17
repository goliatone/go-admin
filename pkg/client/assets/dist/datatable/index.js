import { F as Ve } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as Lr, executeActionRequest as Yt, isTranslationBlocker as Sn, extractTranslationBlocker as Cn, formatStructuredErrorForDisplay as En } from "../toast/error-helpers.js";
import { extractExchangeError as ml, generateExchangeReport as bl, groupRowResultsByStatus as yl, isExchangeError as vl, parseImportResult as wl } from "../toast/error-helpers.js";
import { M as _r, e as w, T as or } from "../chunks/modal-DXPBR0f5.js";
import { b as lt, a as $n } from "../chunks/badge-CqKzZ9y5.js";
import { r as kn } from "../chunks/icon-renderer-CRbgoQtj.js";
let An = class Dr extends _r {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = r;
  }
  static prompt(e) {
    return new Promise((t) => {
      new Dr(
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
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), r = () => {
      this.clearErrors();
      const s = {};
      let i = null;
      for (const o of this.config.fields) {
        const a = this.container?.querySelector(
          `[data-payload-field="${o.name}"]`
        );
        if (!a)
          continue;
        const l = a.value.trim();
        s[o.name] = l, l || (i || (i = a), this.showFieldError(o.name, "This field is required."));
      }
      if (i) {
        i.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(s), this.hide();
    };
    e?.addEventListener("submit", (s) => {
      s.preventDefault(), r();
    }), t?.addEventListener("click", () => {
      this.hide();
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${w(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${w(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, s = (e.options || []).map((i) => {
      const o = i.value === t ? " selected" : "";
      return `<option value="${w(i.value)}"${o}>${w(i.label)}</option>`;
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
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
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
    const r = this.container?.querySelector(`[data-payload-error="${e}"]`);
    r && (r.textContent = t, r.classList.remove("hidden"));
  }
};
class Ln {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Ve(), this.actionKeys = /* @__PURE__ */ new WeakMap(), this.actionKeySeq = 0;
  }
  /**
   * Render row actions as HTML
   */
  renderRowActions(e, t) {
    if (this.mode === "dropdown")
      return this.renderRowActionsDropdown(e, t);
    const r = t.filter(
      (i) => !i.condition || i.condition(e)
    );
    return r.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${r.map((i) => {
      const o = this.getVariantClass(i.variant || "secondary"), a = i.icon ? this.renderIcon(i.icon) : "", l = i.className || "", c = i.disabled === !0, d = this.getActionKey(i), u = c ? "opacity-50 cursor-not-allowed" : "", h = c ? 'aria-disabled="true"' : "", p = i.disabledReason ? `title="${this.escapeHtml(i.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${o} ${l} ${u}"
          data-action-id="${this.sanitize(i.label)}"
          data-action-key="${d}"
          data-record-id="${e.id}"
          data-disabled="${c}"
          ${h}
          ${p}
        >
          ${a}
          ${this.sanitize(i.label)}
        </button>
      `;
    }).join("")}</div>`;
  }
  /**
   * Render row actions as dropdown menu
   */
  renderRowActionsDropdown(e, t) {
    const r = t.filter(
      (o) => !o.condition || o.condition(e)
    );
    if (r.length === 0)
      return '<div class="text-sm text-gray-400">No actions</div>';
    const s = `actions-menu-${e.id}`, i = this.buildDropdownItems(e, r);
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
          ${i}
        </div>
      </div>
    `;
  }
  /**
   * Build dropdown menu items HTML
   */
  buildDropdownItems(e, t) {
    return t.map((r, s) => {
      const i = r.variant === "danger", o = r.disabled === !0, a = this.getActionKey(r), l = r.icon ? this.renderIcon(r.icon) : "", d = this.shouldShowDivider(r, s, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", u = o ? "action-item text-gray-400 cursor-not-allowed" : i ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", h = o ? 'aria-disabled="true"' : "", p = r.disabledReason ? `title="${this.escapeHtml(r.disabledReason)}"` : "";
      return `
        ${d}
        <button type="button"
                class="${u} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(r.label)}"
                data-action-key="${a}"
                data-record-id="${e.id}"
                data-disabled="${o}"
                role="menuitem"
                ${h}
                ${p}>
          <span class="flex-shrink-0 w-5 h-5">${l}</span>
          <span class="text-sm font-medium">${this.escapeHtml(r.label)}</span>
        </button>
      `;
    }).join("");
  }
  /**
   * Determine if divider should be shown before action
   */
  shouldShowDivider(e, t, r) {
    return t === 0 ? !1 : e.variant === "danger" ? !0 : ["download", "archive", "delete", "remove"].some(
      (i) => e.label.toLowerCase().includes(i)
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
  attachRowActionListeners(e, t, r) {
    t.forEach((s) => {
      const i = this.getActionKey(s);
      e.querySelectorAll(
        `[data-action-key="${i}"]`
      ).forEach((a) => {
        const l = a, c = l.dataset.recordId, d = r[c];
        d && l.addEventListener("click", async (u) => {
          if (u.preventDefault(), !(l.getAttribute("aria-disabled") === "true" || l.dataset.disabled === "true"))
            try {
              await s.action(d);
            } catch (h) {
              console.error(`Action "${s.label}" failed:`, h);
              const p = h instanceof Error ? h.message : `Action "${s.label}" failed`;
              this.notifier.error(p);
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
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const s = document.createElement("div");
    s.className = "flex gap-2 flex-1", e.forEach((o) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = o.id, o.icon ? a.innerHTML = `${this.renderIcon(o.icon)} ${o.label}` : a.textContent = o.label, s.appendChild(a);
    }), t.appendChild(s);
    const i = document.createElement("button");
    return i.type = "button", i.className = "btn btn-sm btn-secondary", i.id = "clear-selection-btn", i.textContent = "Clear Selection", t.appendChild(i), t;
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
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const s = await fetch(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        });
        if (!s.ok) {
          const o = await Lr(s);
          throw this.notifier.error(o), new Error(o);
        }
        const i = await s.json();
        this.notifier.success(this.buildBulkSuccessMessage(e, i, t.length)), e.onSuccess && e.onSuccess(i);
      } catch (s) {
        if (console.error(`Bulk action "${e.id}" failed:`, s), !e.onError) {
          const i = s instanceof Error ? s.message : "Bulk action failed";
          this.notifier.error(i);
        }
        throw e.onError && e.onError(s), s;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, s = this.normalizePayloadSchema(e.payloadSchema);
    s?.properties && Object.entries(s.properties).forEach(([l, c]) => {
      r[l] === void 0 && c && c.default !== void 0 && (r[l] = c.default);
    });
    const o = this.collectRequiredFields(e.payloadRequired, s).filter((l) => l !== "ids" && this.isEmptyPayloadValue(r[l]));
    if (o.length === 0)
      return r;
    const a = await this.requestRequiredFields(e, o, s, r);
    if (a === null)
      return null;
    for (const l of o) {
      const c = s?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        return this.notifier.error(u.error), null;
      r[l] = u.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], s = /* @__PURE__ */ new Set(), i = (o) => {
      const a = o.trim();
      !a || s.has(a) || (s.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((o) => i(String(o))), Array.isArray(t?.required) && t.required.forEach((o) => i(String(o))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([s, i]) => {
      i && typeof i == "object" && (r[s] = i);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, s) {
    const i = t.map((o) => {
      const a = r?.properties?.[o], l = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: o,
        label: (a?.title || o).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(s[o] !== void 0 ? s[o] : a?.default),
        type: l,
        options: this.buildSchemaOptions(a)
      };
    });
    return An.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: i
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((r) => r && Object.prototype.hasOwnProperty.call(r, "const")).map((r) => {
          const s = this.stringifyPromptDefault(r.const), i = typeof r.title == "string" && r.title.trim() ? r.title.trim() : s;
          return { value: s, label: i };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((r) => {
          const s = this.stringifyPromptDefault(r);
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
  coercePromptValue(e, t, r) {
    if (Array.isArray(r?.oneOf) && r.oneOf.length > 0) {
      const o = r.oneOf.find(
        (a) => a && Object.prototype.hasOwnProperty.call(a, "const") && this.stringifyPromptDefault(a.const) === e
      );
      if (!o || !Object.prototype.hasOwnProperty.call(o, "const")) {
        const a = r.oneOf.map((l) => typeof l?.title == "string" && l.title.trim() ? l.title.trim() : this.stringifyPromptDefault(l.const)).filter((l) => l !== "").join(", ");
        return { value: e, error: `${t} must be one of: ${a}` };
      }
      return { value: o.const };
    }
    const s = (r?.type || "string").toLowerCase();
    if (e === "")
      return { value: "" };
    let i = e;
    switch (s) {
      case "integer": {
        const o = Number.parseInt(e, 10);
        if (Number.isNaN(o))
          return { value: e, error: `${t} must be an integer.` };
        i = o;
        break;
      }
      case "number": {
        const o = Number.parseFloat(e);
        if (Number.isNaN(o))
          return { value: e, error: `${t} must be a number.` };
        i = o;
        break;
      }
      case "boolean": {
        const o = e.toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(o)) {
          i = !0;
          break;
        }
        if (["false", "0", "no", "n", "off"].includes(o)) {
          i = !1;
          break;
        }
        return { value: e, error: `${t} must be true/false.` };
      }
      case "array":
      case "object": {
        try {
          const o = JSON.parse(e);
          if (s === "array" && !Array.isArray(o))
            return { value: e, error: `${t} must be a JSON array.` };
          if (s === "object" && (o === null || Array.isArray(o) || typeof o != "object"))
            return { value: e, error: `${t} must be a JSON object.` };
          i = o;
        } catch {
          return { value: e, error: `${t} must be valid JSON.` };
        }
        break;
      }
      default:
        i = e;
    }
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((a) => a === i || String(a) === String(i)) ? { value: i, error: `${t} must be one of: ${r.enum.map((a) => String(a)).join(", ")}` } : { value: i };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const s = e.label || e.id || "Bulk action", i = t && typeof t == "object" ? t.summary : null, o = i && typeof i.succeeded == "number" ? i.succeeded : typeof t?.processed == "number" ? t.processed : r, a = i && typeof i.failed == "number" ? i.failed : 0;
    return a > 0 ? `${s} completed: ${o} succeeded, ${a} failed.` : `${s} completed for ${o} item${o === 1 ? "" : "s"}.`;
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
    const r = typeof e.id == "string" ? e.id.trim() : "", s = r ? `id-${this.sanitize(r)}` : `auto-${++this.actionKeySeq}`;
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
const A = {
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
}, It = {
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
}, Rt = {
  pending: {
    label: "Pending",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: A.clock,
    iconType: "svg",
    severity: "neutral",
    description: "Waiting to be assigned"
  },
  assigned: {
    label: "Assigned",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: A.user,
    iconType: "svg",
    severity: "info",
    description: "Assigned to a translator"
  },
  in_progress: {
    label: "In Progress",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: A.play,
    iconType: "svg",
    severity: "info",
    description: "Translation in progress"
  },
  review: {
    label: "In Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: A.document,
    iconType: "svg",
    severity: "info",
    description: "Pending review"
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: A.error,
    iconType: "svg",
    severity: "error",
    description: "Translation rejected"
  },
  approved: {
    label: "Approved",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: A.check,
    iconType: "svg",
    severity: "success",
    description: "Translation approved"
  },
  published: {
    label: "Published",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: A.check,
    iconType: "svg",
    severity: "success",
    description: "Translation published"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: A.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Translation archived"
  }
}, Mt = {
  draft: {
    label: "Draft",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: A.document,
    iconType: "svg",
    severity: "neutral",
    description: "Draft content"
  },
  review: {
    label: "Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: A.document,
    iconType: "svg",
    severity: "info",
    description: "Content under review"
  },
  ready: {
    label: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: A.check,
    iconType: "svg",
    severity: "success",
    description: "Content ready"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: A.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Content archived"
  }
}, Pt = {
  overdue: {
    label: "Overdue",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: A.warning,
    iconType: "svg",
    severity: "error",
    description: "Past due date"
  },
  due_soon: {
    label: "Due Soon",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: A.clock,
    iconType: "svg",
    severity: "warning",
    description: "Due within 24 hours"
  },
  on_track: {
    label: "On Track",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: A.check,
    iconType: "svg",
    severity: "success",
    description: "On schedule"
  },
  none: {
    label: "No Due Date",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: A.clock,
    iconType: "svg",
    severity: "neutral",
    description: "No due date set"
  }
}, Bt = {
  success: {
    label: "Success",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: A.check,
    iconType: "svg",
    severity: "success",
    description: "Import/export succeeded"
  },
  error: {
    label: "Error",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: A.error,
    iconType: "svg",
    severity: "error",
    description: "Import/export failed"
  },
  conflict: {
    label: "Conflict",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: A.warning,
    iconType: "svg",
    severity: "warning",
    description: "Conflicting changes detected"
  },
  skipped: {
    label: "Skipped",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: A.ban,
    iconType: "svg",
    severity: "neutral",
    description: "Row skipped"
  }
}, Ot = {
  running: {
    label: "Running",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: A.play,
    iconType: "svg",
    severity: "info",
    description: "Job in progress"
  },
  completed: {
    label: "Completed",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: A.check,
    iconType: "svg",
    severity: "success",
    description: "Job completed successfully"
  },
  failed: {
    label: "Failed",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: A.error,
    iconType: "svg",
    severity: "error",
    description: "Job failed"
  }
}, Ft = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: A.warning,
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
    icon: A.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: A.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: A.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: A.ban,
    severity: "info",
    actionable: !1
  }
};
function ft(n, e) {
  const t = n.toLowerCase();
  if ((!e || e === "core") && t in It)
    return It[t];
  if (!e || e === "queue") {
    if (t in Rt)
      return Rt[t];
    if (t in Mt)
      return Mt[t];
    if (t in Pt)
      return Pt[t];
  }
  if (!e || e === "exchange") {
    if (t in Bt)
      return Bt[t];
    if (t in Ot)
      return Ot[t];
  }
  return null;
}
function gt(n) {
  const e = n.toUpperCase();
  return e in Ft ? Ft[e] : null;
}
function To(n, e) {
  return ft(n, e) !== null;
}
function Io(n) {
  return gt(n) !== null;
}
function Ro(n) {
  switch (n) {
    case "core":
      return Object.keys(It);
    case "queue":
      return [
        ...Object.keys(Rt),
        ...Object.keys(Mt),
        ...Object.keys(Pt)
      ];
    case "exchange":
      return [
        ...Object.keys(Bt),
        ...Object.keys(Ot)
      ];
    default:
      return [];
  }
}
function Mo() {
  return Object.keys(Ft);
}
function Ke(n, e = {}) {
  const t = ft(n, e.domain);
  if (!t)
    return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${X(n)}</span>`;
  const { size: r = "default", showIcon: s = !0, showLabel: i = !0, extraClass: o = "" } = e, a = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs"
  }, l = s ? Tr(t, r) : "", c = i ? `<span>${X(t.label)}</span>` : "";
  return `<span class="inline-flex items-center ${s && i ? "gap-1" : ""} rounded font-medium ${a[r]} ${t.colorClass} ${o}"
                title="${X(t.description || t.label)}"
                aria-label="${X(t.label)}"
                data-status="${X(n)}">
    ${l}${c}
  </span>`;
}
function Tr(n, e = "default") {
  const t = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  return n.iconType === "char" ? `<span class="${t[e]} inline-flex items-center justify-center" aria-hidden="true">${n.icon}</span>` : `<svg class="${t[e]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${n.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function Ir(n, e = {}) {
  const t = gt(n);
  if (!t)
    return `<span class="text-gray-500 text-xs">${X(n)}</span>`;
  const { size: r = "default", showIcon: s = !0, showFullMessage: i = !1, extraClass: o = "" } = e, a = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, c = s ? `<svg class="${r === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
      </svg>` : "", d = i ? t.message : t.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${a[r]} ${t.colorClass} ${o}"
                role="status"
                aria-label="${X(t.message)}"
                data-reason-code="${X(n)}">
    ${c}
    <span>${X(d)}</span>
  </span>`;
}
function Po(n, e) {
  const t = gt(n);
  if (!t)
    return "";
  const r = e || t.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${t.bgClass} ${t.textClass}"
                title="${X(r)}"
                aria-label="${X(t.shortMessage)}"
                data-reason-code="${X(n)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function Bo(n = {}) {
  return (e) => typeof e != "string" || !e ? '<span class="text-gray-400">-</span>' : Ke(e, n);
}
function Oo(n = {}) {
  return (e) => typeof e != "string" || !e ? "" : Ir(e, n);
}
function Fo(n) {
  n.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", n.schema_version);
}
function qo() {
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
function X(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ge(n) {
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
  return !n || typeof n != "object" || (e.requestedLocale = Ce(n, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = Ce(n, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = Bn(n, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = lr(n, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = lr(n, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = Ce(n, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = Ce(n, ["status"]), e.entityType = Ce(n, ["entity_type", "type", "_type"]), e.recordId = Ce(n, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function jo(n) {
  const e = ge(n);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function No(n) {
  const e = ge(n);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function Z(n) {
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
  if (!n || typeof n != "object")
    return e;
  const t = n.translation_readiness;
  if (t && typeof t == "object") {
    e.hasReadinessMetadata = !0, e.translationGroupId = typeof t.translation_group_id == "string" ? t.translation_group_id : null, e.requiredLocales = Array.isArray(t.required_locales) ? t.required_locales.filter((o) => typeof o == "string") : [], e.availableLocales = Array.isArray(t.available_locales) ? t.available_locales.filter((o) => typeof o == "string") : [], e.missingRequiredLocales = Array.isArray(t.missing_required_locales) ? t.missing_required_locales.filter((o) => typeof o == "string") : [];
    const r = t.missing_required_fields_by_locale;
    if (r && typeof r == "object" && !Array.isArray(r))
      for (const [o, a] of Object.entries(r))
        Array.isArray(a) && (e.missingRequiredFieldsByLocale[o] = a.filter(
          (l) => typeof l == "string"
        ));
    const s = t.readiness_state;
    typeof s == "string" && _n(s) && (e.readinessState = s);
    const i = t.ready_for_transition;
    if (i && typeof i == "object" && !Array.isArray(i))
      for (const [o, a] of Object.entries(i))
        typeof a == "boolean" && (e.readyForTransition[o] = a);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function zo(n) {
  return Z(n).hasReadinessMetadata;
}
function Ho(n, e) {
  return Z(n).readyForTransition[e] === !0;
}
function _n(n) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(n);
}
function Rr(n, e = {}) {
  const t = "resolvedLocale" in n ? n : ge(n), { showFallbackIndicator: r = !0, size: s = "default", extraClass: i = "" } = e;
  if (!t.resolvedLocale)
    return "";
  const o = t.resolvedLocale.toUpperCase(), a = t.fallbackUsed || t.missingRequestedLocale, c = `inline-flex items-center gap-1 rounded font-medium ${s === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return a && r ? `<span class="${c} bg-amber-100 text-amber-800 ${i}"
                  title="Showing ${t.resolvedLocale} content (${t.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${o}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${o}
    </span>` : `<span class="${c} bg-blue-100 text-blue-800 ${i}"
                title="Locale: ${o}"
                aria-label="Locale: ${o}">
    ${o}
  </span>`;
}
function Dn(n, e = {}) {
  const t = "resolvedLocale" in n ? n : ge(n), { maxLocales: r = 3, size: s = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const i = s === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", o = s === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, r), l = t.availableLocales.length - r, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${o} rounded bg-blue-100 text-blue-700 font-medium` : `${o} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${o} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${i}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function Tn(n, e = {}) {
  const t = "resolvedLocale" in n ? n : ge(n), { showResolvedLocale: r = !0, size: s = "default" } = e, i = [];
  return r && t.resolvedLocale && i.push(Rr(t, { size: s, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && i.push(Dn(t, { ...e, size: s })), i.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${s === "sm" ? "gap-1" : "gap-2"}">${i.join("")}</div>`;
}
function Uo(n, e = "default") {
  if (!n)
    return "";
  const t = n.trim();
  if (ft(t) !== null)
    return Ke(t, { size: e === "sm" ? "sm" : "default" });
  const r = t.toLowerCase();
  return lt(n, "status", r, { size: e === "sm" ? "sm" : void 0 });
}
function Go(n, e = {}) {
  const t = Z(n);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: r = "default", showDetailedTooltip: s = !0, extraClass: i = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${r === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: h, tooltip: p } = In(l, t, s);
  return `<span class="${a} ${u} ${h} ${i}"
                title="${p}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function Vo(n, e = {}) {
  const t = Z(n);
  if (!t.hasReadinessMetadata)
    return "";
  const r = t.readyForTransition.publish === !0, { size: s = "default", extraClass: i = "" } = e, o = s === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (r)
    return `<span class="inline-flex items-center gap-1 rounded font-medium ${o} bg-green-100 text-green-700 ${i}"
                  title="Ready to publish"
                  aria-label="Ready to publish">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      Ready
    </span>`;
  const a = t.missingRequiredLocales.length, l = a > 0 ? `Missing translations: ${t.missingRequiredLocales.join(", ")}` : "Not ready to publish";
  return `<span class="inline-flex items-center gap-1 rounded font-medium ${o} bg-amber-100 text-amber-700 ${i}"
                title="${l}"
                aria-label="Not ready to publish">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    ${a > 0 ? `${a} missing` : "Not ready"}
  </span>`;
}
function Ko(n, e = {}) {
  const t = Z(n);
  if (!t.hasReadinessMetadata || t.requiredLocales.length === 0)
    return "";
  const { size: r = "default", extraClass: s = "" } = e, i = r === "sm" ? "text-xs" : "text-sm", o = t.requiredLocales.length, a = t.availableLocales.filter(
    (d) => t.requiredLocales.includes(d)
  ).length, c = o > 0 && a === o ? "text-green-600" : a > 0 ? "text-amber-600" : "text-gray-500";
  return `<span class="${i} ${c} font-medium ${s}"
                title="Locale completeness: ${a} of ${o} required locales available"
                aria-label="${a} of ${o} locales">
    ${a}/${o}
  </span>`;
}
function Yo(n, e = {}) {
  const t = Z(n);
  if (!t.hasReadinessMetadata || t.readinessState === "ready")
    return "";
  const { size: r = "default", extraClass: s = "" } = e, i = r === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", o = t.missingRequiredLocales.length, a = o > 0, l = Object.keys(t.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", u = "", h = "";
  return a && l ? (c = "bg-red-100", d = "text-red-800", u = `${o} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : a ? (c = "bg-amber-100", d = "text-amber-800", u = `${o} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", u = "Incomplete", h = `Incomplete fields in: ${Object.keys(t.missingRequiredFieldsByLocale).join(", ")}`), u ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${i} ${c} ${d} ${s}"
                title="${h}"
                aria-label="${h}"
                data-missing-translations="true"
                data-missing-count="${o}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>` : "";
}
function Jo(n) {
  const e = Z(n);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function Xo(n) {
  return Z(n).missingRequiredLocales.length;
}
function In(n, e, t) {
  const r = ft(n, "core"), s = r ? Tr(r, "sm") : "", i = r?.bgClass || "bg-gray-100", o = r?.textClass || "text-gray-600", a = r?.label || "Unknown", l = r?.description || "Unknown readiness state";
  switch (n) {
    case "ready":
      return {
        icon: s,
        label: a,
        bgClass: i,
        textClass: o,
        tooltip: l
      };
    case "missing_locales": {
      const c = e.missingRequiredLocales, d = t && c.length > 0 ? `Missing translations: ${c.join(", ")}` : "Missing required translations";
      return {
        icon: s,
        label: `${c.length} missing`,
        bgClass: i,
        textClass: o,
        tooltip: d
      };
    }
    case "missing_fields": {
      const c = Object.keys(e.missingRequiredFieldsByLocale), d = t && c.length > 0 ? `Incomplete fields in: ${c.join(", ")}` : "Some translations have missing required fields";
      return {
        icon: s,
        label: "Incomplete",
        bgClass: i,
        textClass: o,
        tooltip: d
      };
    }
    case "missing_locales_and_fields": {
      const c = e.missingRequiredLocales, d = Object.keys(e.missingRequiredFieldsByLocale), u = [];
      c.length > 0 && u.push(`Missing: ${c.join(", ")}`), d.length > 0 && u.push(`Incomplete: ${d.join(", ")}`);
      const h = t ? u.join("; ") : "Missing translations and incomplete fields";
      return {
        icon: s,
        label: "Not ready",
        bgClass: i,
        textClass: o,
        tooltip: h
      };
    }
    default:
      return {
        icon: s,
        label: a,
        bgClass: i,
        textClass: o,
        tooltip: l
      };
  }
}
function Rn(n, e = {}) {
  const { size: t = "sm", maxLocales: r = 5, showLabels: s = !1 } = e, i = Z(n);
  if (!i.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: o, availableLocales: a, missingRequiredFieldsByLocale: l } = i, c = o.length > 0 ? o : a;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(a), u = Mn(l), h = c.slice(0, r).map((f) => {
    const m = d.has(f), $ = m && u.has(f), D = m && !$;
    let k, O, T;
    D ? (k = "bg-green-100 text-green-700 border-green-300", O = "●", T = "Complete") : $ ? (k = "bg-amber-100 text-amber-700 border-amber-300", O = "◐", T = "Incomplete") : (k = "bg-white text-gray-400 border-gray-300 border-dashed", O = "○", T = "Missing");
    const K = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", Y = s ? `<span class="font-medium">${f.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${K} rounded border ${k}"
              title="${f.toUpperCase()}: ${T}"
              aria-label="${f.toUpperCase()}: ${T}"
              data-locale="${f}"
              data-state="${T.toLowerCase()}">
          ${Y}
          <span aria-hidden="true">${O}</span>
        </span>
      `;
  }).join(""), p = c.length > r ? `<span class="text-[10px] text-gray-500" title="${c.length - r} more locales">+${c.length - r}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${h}${p}</div>`;
}
function Mn(n) {
  const e = /* @__PURE__ */ new Set();
  if (n && typeof n == "object")
    for (const [t, r] of Object.entries(n))
      Array.isArray(r) && r.length > 0 && e.add(t);
  return e;
}
function Wo(n = {}) {
  return (e, t, r) => Rn(t, n);
}
function Qo(n, e = {}) {
  if (!n.fallbackUsed && !n.missingRequestedLocale)
    return "";
  const { showCreateButton: t = !0, createTranslationUrl: r, panelName: s } = e, i = n.requestedLocale || "requested locale", o = n.resolvedLocale || "default", a = t ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${n.requestedLocale || ""}"
            data-panel="${s || ""}"
            data-record-id="${n.recordId || ""}"
            ${r ? `data-url="${r}"` : ""}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Create ${i.toUpperCase()} translation
    </button>
  ` : "";
  return `
    <div class="fallback-warning bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
         role="alert"
         aria-live="polite"
         data-fallback-mode="true"
         data-requested-locale="${n.requestedLocale || ""}"
         data-resolved-locale="${n.resolvedLocale || ""}">
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
            The <strong>${i.toUpperCase()}</strong> translation doesn't exist yet.
            You're viewing content from <strong>${o.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${a ? `<div class="mt-3">${a}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function ar(n = {}) {
  return (e, t, r) => Tn(t, n);
}
function Pn(n = {}) {
  return (e, t, r) => Rr(t, n);
}
function Ce(n, e) {
  for (const t of e) {
    const r = Jt(n, t);
    if (typeof r == "string" && r.trim())
      return r;
  }
  return null;
}
function Bn(n, e) {
  for (const t of e) {
    const r = Jt(n, t);
    if (Array.isArray(r))
      return r.filter((s) => typeof s == "string");
  }
  return [];
}
function lr(n, e) {
  for (const t of e) {
    const r = Jt(n, t);
    if (typeof r == "boolean")
      return r;
    if (r === "true") return !0;
    if (r === "false") return !1;
  }
  return !1;
}
function Jt(n, e) {
  const t = e.split(".");
  let r = n;
  for (const s of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[s];
  }
  return r;
}
const ie = '<span class="text-gray-400">-</span>', On = [
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
function Pe(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Fn(n) {
  try {
    return JSON.stringify(n);
  } catch {
    return String(n);
  }
}
function qn(n) {
  const e = [], t = (s) => {
    if (typeof s != "string") return;
    const i = s.trim();
    !i || e.includes(i) || e.push(i);
  };
  t(n.display_key), t(n.displayKey);
  const r = n.display_keys ?? n.displayKeys;
  return Array.isArray(r) && r.forEach(t), e;
}
function jn(n, e) {
  if (!e) return;
  if (Object.prototype.hasOwnProperty.call(n, e))
    return n[e];
  if (!e.includes("."))
    return;
  const t = e.split(".");
  let r = n;
  for (const s of t) {
    if (!r || typeof r != "object" || Array.isArray(r) || !Object.prototype.hasOwnProperty.call(r, s))
      return;
    r = r[s];
  }
  return r;
}
function Nn(n) {
  if (n == null)
    return "";
  switch (typeof n) {
    case "string":
      return n.trim();
    case "number":
    case "bigint":
      return String(n);
    case "boolean":
      return n ? "true" : "false";
    default:
      return "";
  }
}
function qt(n, e) {
  if (n == null)
    return "";
  if (Array.isArray(n))
    return jt(n, e);
  if (typeof n != "object")
    return String(n);
  const r = [...qn(e), ...On], s = /* @__PURE__ */ new Set();
  for (const i of r) {
    if (s.has(i)) continue;
    s.add(i);
    const o = jn(n, i), a = Nn(o);
    if (a)
      return a;
  }
  return Fn(n);
}
function jt(n, e) {
  if (!Array.isArray(n) || n.length === 0)
    return "";
  const t = n.map((o) => qt(o, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const r = Number(e.preview_limit ?? e.previewLimit ?? 3), s = Number.isFinite(r) && r > 0 ? Math.floor(r) : 3, i = t.slice(0, s);
  return t.length <= s ? i.join(", ") : `${i.join(", ")} +${t.length - s} more`;
}
function zn(n, e, t, r) {
  const s = n[e] ?? n[t] ?? r, i = Number(s);
  return Number.isFinite(i) && i > 0 ? Math.floor(i) : r;
}
function Hn(n, e, t, r) {
  const s = n[e] ?? n[t];
  return s == null ? r : typeof s == "boolean" ? s : typeof s == "string" ? s.toLowerCase() === "true" || s === "1" : !!s;
}
function Un(n, e, t, r) {
  const s = n[e] ?? n[t];
  return s == null ? r : String(s).trim() || r;
}
function Gn(n) {
  if (n == null)
    return "";
  if (typeof n == "string")
    return n.trim();
  if (typeof n != "object")
    return String(n).trim();
  const e = ["_type", "type", "blockType", "block_type"];
  for (const t of e) {
    const r = n[t];
    if (typeof r == "string" && r.trim())
      return r.trim();
  }
  return "";
}
function Vn(n) {
  switch (n) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    case "default":
    default:
      return "bg-blue-50 text-blue-700";
  }
}
class Kn {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return ie;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = jt(e, {});
        return t ? Pe(t) : ie;
      }
      if (typeof e == "object") {
        const t = qt(e, {});
        return t ? Pe(t) : ie;
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
      return lt(String(e), "status", t);
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
      const t = Number(e), r = ["Bytes", "KB", "MB", "GB", "TB"];
      if (t === 0) return "0 Bytes";
      const s = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, s)).toFixed(2)} ${r[s]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), r = 50;
      return t.length <= r ? t : `<span title="${t}">${t.substring(0, r)}...</span>`;
    }), this.renderers.set("_array", (e, t, r, s) => {
      if (!Array.isArray(e) || e.length === 0)
        return ie;
      const i = s?.options || {}, o = jt(e, i);
      return o ? Pe(o) : ie;
    }), this.renderers.set("_object", (e, t, r, s) => {
      if (e == null)
        return ie;
      const i = s?.options || {}, o = qt(e, i);
      return o ? Pe(o) : ie;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, r, s) => {
      if (!Array.isArray(e) || e.length === 0)
        return ie;
      const i = s?.options || {}, o = zn(i, "max_visible", "maxVisible", 3), a = Hn(i, "show_count", "showCount", !0), l = Un(i, "chip_variant", "chipVariant", "default"), c = i.block_icons_map || i.blockIconsMap || {}, d = [], u = e.slice(0, o);
      for (const f of u) {
        const m = Gn(f);
        if (!m) continue;
        const $ = c[m] || "view-grid", D = kn($, { size: "14px", extraClass: "flex-shrink-0" }), k = Vn(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${k}">${D}<span>${Pe(m)}</span></span>`
        );
      }
      if (d.length === 0)
        return ie;
      const h = e.length - o;
      let p = "";
      return a && h > 0 && (p = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${p}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", s = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${s}</div>`;
    });
  }
}
const Zo = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (n) => (e) => {
    const t = String(e).toLowerCase();
    return lt(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (n) => (e) => {
    const t = String(e).toLowerCase();
    return lt(String(e), "role", t);
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (n, e) => {
    const t = n || e.name || e.username || "-", r = e.email || "";
    return r ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${r}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (n) => (e) => $n(!!e, n),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (n) => {
    if (!n) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(n), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(r / 6e4), i = Math.floor(r / 36e5), o = Math.floor(r / 864e5);
      return s < 1 ? "Just now" : s < 60 ? `${s} minute${s > 1 ? "s" : ""} ago` : i < 24 ? `${i} hour${i > 1 ? "s" : ""} ago` : o < 30 ? `${o} day${o > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(n);
    }
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: Pn(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: ar(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: ar({ size: "sm", maxLocales: 2 })
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function cr(n, e) {
  var t = Object.keys(n);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(n);
    e && (r = r.filter(function(s) {
      return Object.getOwnPropertyDescriptor(n, s).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function ne(n) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? cr(Object(t), !0).forEach(function(r) {
      Yn(n, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(t)) : cr(Object(t)).forEach(function(r) {
      Object.defineProperty(n, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return n;
}
function rt(n) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? rt = function(e) {
    return typeof e;
  } : rt = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, rt(n);
}
function Yn(n, e, t) {
  return e in n ? Object.defineProperty(n, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : n[e] = t, n;
}
function ae() {
  return ae = Object.assign || function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, ae.apply(this, arguments);
}
function Jn(n, e) {
  if (n == null) return {};
  var t = {}, r = Object.keys(n), s, i;
  for (i = 0; i < r.length; i++)
    s = r[i], !(e.indexOf(s) >= 0) && (t[s] = n[s]);
  return t;
}
function Xn(n, e) {
  if (n == null) return {};
  var t = Jn(n, e), r, s;
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(n);
    for (s = 0; s < i.length; s++)
      r = i[s], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(n, r) && (t[r] = n[r]);
  }
  return t;
}
var Wn = "1.15.6";
function oe(n) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(n);
}
var le = oe(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), Ye = oe(/Edge/i), dr = oe(/firefox/i), Ne = oe(/safari/i) && !oe(/chrome/i) && !oe(/android/i), Xt = oe(/iP(ad|od|hone)/i), Mr = oe(/chrome/i) && oe(/android/i), Pr = {
  capture: !1,
  passive: !1
};
function C(n, e, t) {
  n.addEventListener(e, t, !le && Pr);
}
function S(n, e, t) {
  n.removeEventListener(e, t, !le && Pr);
}
function ct(n, e) {
  if (e) {
    if (e[0] === ">" && (e = e.substring(1)), n)
      try {
        if (n.matches)
          return n.matches(e);
        if (n.msMatchesSelector)
          return n.msMatchesSelector(e);
        if (n.webkitMatchesSelector)
          return n.webkitMatchesSelector(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
function Br(n) {
  return n.host && n !== document && n.host.nodeType ? n.host : n.parentNode;
}
function Q(n, e, t, r) {
  if (n) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? n.parentNode === t && ct(n, e) : ct(n, e)) || r && n === t)
        return n;
      if (n === t) break;
    } while (n = Br(n));
  }
  return null;
}
var ur = /\s+/g;
function G(n, e, t) {
  if (n && e)
    if (n.classList)
      n.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + n.className + " ").replace(ur, " ").replace(" " + e + " ", " ");
      n.className = (r + (t ? " " + e : "")).replace(ur, " ");
    }
}
function b(n, e, t) {
  var r = n && n.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(n, "") : n.currentStyle && (t = n.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function Le(n, e) {
  var t = "";
  if (typeof n == "string")
    t = n;
  else
    do {
      var r = b(n, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (n = n.parentNode));
  var s = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return s && new s(t);
}
function Or(n, e, t) {
  if (n) {
    var r = n.getElementsByTagName(e), s = 0, i = r.length;
    if (t)
      for (; s < i; s++)
        t(r[s], s);
    return r;
  }
  return [];
}
function re() {
  var n = document.scrollingElement;
  return n || document.documentElement;
}
function P(n, e, t, r, s) {
  if (!(!n.getBoundingClientRect && n !== window)) {
    var i, o, a, l, c, d, u;
    if (n !== window && n.parentNode && n !== re() ? (i = n.getBoundingClientRect(), o = i.top, a = i.left, l = i.bottom, c = i.right, d = i.height, u = i.width) : (o = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && n !== window && (s = s || n.parentNode, !le))
      do
        if (s && s.getBoundingClientRect && (b(s, "transform") !== "none" || t && b(s, "position") !== "static")) {
          var h = s.getBoundingClientRect();
          o -= h.top + parseInt(b(s, "border-top-width")), a -= h.left + parseInt(b(s, "border-left-width")), l = o + i.height, c = a + i.width;
          break;
        }
      while (s = s.parentNode);
    if (r && n !== window) {
      var p = Le(s || n), f = p && p.a, m = p && p.d;
      p && (o /= m, a /= f, u /= f, d /= m, l = o + d, c = a + u);
    }
    return {
      top: o,
      left: a,
      bottom: l,
      right: c,
      width: u,
      height: d
    };
  }
}
function hr(n, e, t) {
  for (var r = pe(n, !0), s = P(n)[e]; r; ) {
    var i = P(r)[t], o = void 0;
    if (o = s >= i, !o) return r;
    if (r === re()) break;
    r = pe(r, !1);
  }
  return !1;
}
function _e(n, e, t, r) {
  for (var s = 0, i = 0, o = n.children; i < o.length; ) {
    if (o[i].style.display !== "none" && o[i] !== y.ghost && (r || o[i] !== y.dragged) && Q(o[i], t.draggable, n, !1)) {
      if (s === e)
        return o[i];
      s++;
    }
    i++;
  }
  return null;
}
function Wt(n, e) {
  for (var t = n.lastElementChild; t && (t === y.ghost || b(t, "display") === "none" || e && !ct(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function J(n, e) {
  var t = 0;
  if (!n || !n.parentNode)
    return -1;
  for (; n = n.previousElementSibling; )
    n.nodeName.toUpperCase() !== "TEMPLATE" && n !== y.clone && (!e || ct(n, e)) && t++;
  return t;
}
function pr(n) {
  var e = 0, t = 0, r = re();
  if (n)
    do {
      var s = Le(n), i = s.a, o = s.d;
      e += n.scrollLeft * i, t += n.scrollTop * o;
    } while (n !== r && (n = n.parentNode));
  return [e, t];
}
function Qn(n, e) {
  for (var t in n)
    if (n.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === n[t][r]) return Number(t);
    }
  return -1;
}
function pe(n, e) {
  if (!n || !n.getBoundingClientRect) return re();
  var t = n, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var s = b(t);
      if (t.clientWidth < t.scrollWidth && (s.overflowX == "auto" || s.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (s.overflowY == "auto" || s.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return re();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return re();
}
function Zn(n, e) {
  if (n && e)
    for (var t in e)
      e.hasOwnProperty(t) && (n[t] = e[t]);
  return n;
}
function wt(n, e) {
  return Math.round(n.top) === Math.round(e.top) && Math.round(n.left) === Math.round(e.left) && Math.round(n.height) === Math.round(e.height) && Math.round(n.width) === Math.round(e.width);
}
var ze;
function Fr(n, e) {
  return function() {
    if (!ze) {
      var t = arguments, r = this;
      t.length === 1 ? n.call(r, t[0]) : n.apply(r, t), ze = setTimeout(function() {
        ze = void 0;
      }, e);
    }
  };
}
function es() {
  clearTimeout(ze), ze = void 0;
}
function qr(n, e, t) {
  n.scrollLeft += e, n.scrollTop += t;
}
function jr(n) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(n).cloneNode(!0) : t ? t(n).clone(!0)[0] : n.cloneNode(!0);
}
function Nr(n, e, t) {
  var r = {};
  return Array.from(n.children).forEach(function(s) {
    var i, o, a, l;
    if (!(!Q(s, e.draggable, n, !1) || s.animated || s === t)) {
      var c = P(s);
      r.left = Math.min((i = r.left) !== null && i !== void 0 ? i : 1 / 0, c.left), r.top = Math.min((o = r.top) !== null && o !== void 0 ? o : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var H = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function ts() {
  var n = [], e;
  return {
    captureAnimationState: function() {
      if (n = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(s) {
          if (!(b(s, "display") === "none" || s === y.ghost)) {
            n.push({
              target: s,
              rect: P(s)
            });
            var i = ne({}, n[n.length - 1].rect);
            if (s.thisAnimationDuration) {
              var o = Le(s, !0);
              o && (i.top -= o.f, i.left -= o.e);
            }
            s.fromRect = i;
          }
        });
      }
    },
    addAnimationState: function(r) {
      n.push(r);
    },
    removeAnimationState: function(r) {
      n.splice(Qn(n, {
        target: r
      }), 1);
    },
    animateAll: function(r) {
      var s = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof r == "function" && r();
        return;
      }
      var i = !1, o = 0;
      n.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = P(c), h = c.prevFromRect, p = c.prevToRect, f = a.rect, m = Le(c, !0);
        m && (u.top -= m.f, u.left -= m.e), c.toRect = u, c.thisAnimationDuration && wt(h, u) && !wt(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (f.top - u.top) / (f.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = ns(f, h, p, s.options)), wt(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = s.options.animation), s.animate(c, f, u, l)), l && (i = !0, o = Math.max(o, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), i ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, o) : typeof r == "function" && r(), n = [];
    },
    animate: function(r, s, i, o) {
      if (o) {
        b(r, "transition", ""), b(r, "transform", "");
        var a = Le(this.el), l = a && a.a, c = a && a.d, d = (s.left - i.left) / (l || 1), u = (s.top - i.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, b(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = rs(r), b(r, "transition", "transform " + o + "ms" + (this.options.easing ? " " + this.options.easing : "")), b(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          b(r, "transition", ""), b(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, o);
      }
    }
  };
}
function rs(n) {
  return n.offsetWidth;
}
function ns(n, e, t, r) {
  return Math.sqrt(Math.pow(e.top - n.top, 2) + Math.pow(e.left - n.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var Ee = [], xt = {
  initializeByDefault: !0
}, Je = {
  mount: function(e) {
    for (var t in xt)
      xt.hasOwnProperty(t) && !(t in e) && (e[t] = xt[t]);
    Ee.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), Ee.push(e);
  },
  pluginEvent: function(e, t, r) {
    var s = this;
    this.eventCanceled = !1, r.cancel = function() {
      s.eventCanceled = !0;
    };
    var i = e + "Global";
    Ee.forEach(function(o) {
      t[o.pluginName] && (t[o.pluginName][i] && t[o.pluginName][i](ne({
        sortable: t
      }, r)), t.options[o.pluginName] && t[o.pluginName][e] && t[o.pluginName][e](ne({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, s) {
    Ee.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, ae(r, c.defaults);
      }
    });
    for (var i in e.options)
      if (e.options.hasOwnProperty(i)) {
        var o = this.modifyOption(e, i, e.options[i]);
        typeof o < "u" && (e.options[i] = o);
      }
  },
  getEventProperties: function(e, t) {
    var r = {};
    return Ee.forEach(function(s) {
      typeof s.eventProperties == "function" && ae(r, s.eventProperties.call(t[s.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var s;
    return Ee.forEach(function(i) {
      e[i.pluginName] && i.optionListeners && typeof i.optionListeners[t] == "function" && (s = i.optionListeners[t].call(e[i.pluginName], r));
    }), s;
  }
};
function ss(n) {
  var e = n.sortable, t = n.rootEl, r = n.name, s = n.targetEl, i = n.cloneEl, o = n.toEl, a = n.fromEl, l = n.oldIndex, c = n.newIndex, d = n.oldDraggableIndex, u = n.newDraggableIndex, h = n.originalEvent, p = n.putSortable, f = n.extraEventProperties;
  if (e = e || t && t[H], !!e) {
    var m, $ = e.options, D = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !le && !Ye ? m = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (m = document.createEvent("Event"), m.initEvent(r, !0, !0)), m.to = o || t, m.from = a || t, m.item = s || t, m.clone = i, m.oldIndex = l, m.newIndex = c, m.oldDraggableIndex = d, m.newDraggableIndex = u, m.originalEvent = h, m.pullMode = p ? p.lastPutMode : void 0;
    var k = ne(ne({}, f), Je.getEventProperties(r, e));
    for (var O in k)
      m[O] = k[O];
    t && t.dispatchEvent(m), $[D] && $[D].call(e, m);
  }
}
var is = ["evt"], z = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, s = r.evt, i = Xn(r, is);
  Je.pluginEvent.bind(y)(e, t, ne({
    dragEl: g,
    parentEl: I,
    ghostEl: v,
    rootEl: L,
    nextEl: xe,
    lastDownEl: nt,
    cloneEl: _,
    cloneHidden: he,
    dragStarted: Oe,
    putSortable: F,
    activeSortable: y.active,
    originalEvent: s,
    oldIndex: Ae,
    oldDraggableIndex: He,
    newIndex: V,
    newDraggableIndex: ue,
    hideGhostForTarget: Gr,
    unhideGhostForTarget: Vr,
    cloneNowHidden: function() {
      he = !0;
    },
    cloneNowShown: function() {
      he = !1;
    },
    dispatchSortableEvent: function(a) {
      N({
        sortable: t,
        name: a,
        originalEvent: s
      });
    }
  }, i));
};
function N(n) {
  ss(ne({
    putSortable: F,
    cloneEl: _,
    targetEl: g,
    rootEl: L,
    oldIndex: Ae,
    oldDraggableIndex: He,
    newIndex: V,
    newDraggableIndex: ue
  }, n));
}
var g, I, v, L, xe, nt, _, he, Ae, V, He, ue, We, F, ke = !1, dt = !1, ut = [], ye, W, St, Ct, fr, gr, Oe, $e, Ue, Ge = !1, Qe = !1, st, q, Et = [], Nt = !1, ht = [], mt = typeof document < "u", Ze = Xt, mr = Ye || le ? "cssFloat" : "float", os = mt && !Mr && !Xt && "draggable" in document.createElement("div"), zr = function() {
  if (mt) {
    if (le)
      return !1;
    var n = document.createElement("x");
    return n.style.cssText = "pointer-events:auto", n.style.pointerEvents === "auto";
  }
}(), Hr = function(e, t) {
  var r = b(e), s = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), i = _e(e, 0, t), o = _e(e, 1, t), a = i && b(i), l = o && b(o), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + P(i).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + P(o).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (i && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return o && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return i && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= s && r[mr] === "none" || o && r[mr] === "none" && c + d > s) ? "vertical" : "horizontal";
}, as = function(e, t, r) {
  var s = r ? e.left : e.top, i = r ? e.right : e.bottom, o = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return s === a || i === l || s + o / 2 === a + c / 2;
}, ls = function(e, t) {
  var r;
  return ut.some(function(s) {
    var i = s[H].options.emptyInsertThreshold;
    if (!(!i || Wt(s))) {
      var o = P(s), a = e >= o.left - i && e <= o.right + i, l = t >= o.top - i && t <= o.bottom + i;
      if (a && l)
        return r = s;
    }
  }), r;
}, Ur = function(e) {
  function t(i, o) {
    return function(a, l, c, d) {
      var u = a.options.group.name && l.options.group.name && a.options.group.name === l.options.group.name;
      if (i == null && (o || u))
        return !0;
      if (i == null || i === !1)
        return !1;
      if (o && i === "clone")
        return i;
      if (typeof i == "function")
        return t(i(a, l, c, d), o)(a, l, c, d);
      var h = (o ? a : l).options.group.name;
      return i === !0 || typeof i == "string" && i === h || i.join && i.indexOf(h) > -1;
    };
  }
  var r = {}, s = e.group;
  (!s || rt(s) != "object") && (s = {
    name: s
  }), r.name = s.name, r.checkPull = t(s.pull, !0), r.checkPut = t(s.put), r.revertClone = s.revertClone, e.group = r;
}, Gr = function() {
  !zr && v && b(v, "display", "none");
}, Vr = function() {
  !zr && v && b(v, "display", "");
};
mt && !Mr && document.addEventListener("click", function(n) {
  if (dt)
    return n.preventDefault(), n.stopPropagation && n.stopPropagation(), n.stopImmediatePropagation && n.stopImmediatePropagation(), dt = !1, !1;
}, !0);
var ve = function(e) {
  if (g) {
    e = e.touches ? e.touches[0] : e;
    var t = ls(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var s in e)
        e.hasOwnProperty(s) && (r[s] = e[s]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[H]._onDragOver(r);
    }
  }
}, cs = function(e) {
  g && g.parentNode[H]._isOutsideThisEl(e.target);
};
function y(n, e) {
  if (!(n && n.nodeType && n.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(n));
  this.el = n, this.options = e = ae({}, e), n[H] = this;
  var t = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(n.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: !1,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: !0,
    direction: function() {
      return Hr(n, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(o, a) {
      o.setData("Text", a.textContent);
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
    supportPointer: y.supportPointer !== !1 && "PointerEvent" in window && (!Ne || Xt),
    emptyInsertThreshold: 5
  };
  Je.initializePlugins(this, n, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  Ur(e);
  for (var s in this)
    s.charAt(0) === "_" && typeof this[s] == "function" && (this[s] = this[s].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : os, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? C(n, "pointerdown", this._onTapStart) : (C(n, "mousedown", this._onTapStart), C(n, "touchstart", this._onTapStart)), this.nativeDraggable && (C(n, "dragover", this), C(n, "dragenter", this)), ut.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), ae(this, ts());
}
y.prototype = /** @lends Sortable.prototype */
{
  constructor: y,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && ($e = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, g) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, s = this.options, i = s.preventOnFilter, o = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = s.filter;
      if (bs(r), !g && !(/mousedown|pointerdown/.test(o) && e.button !== 0 || s.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Ne && l && l.tagName.toUpperCase() === "SELECT") && (l = Q(l, s.draggable, r, !1), !(l && l.animated) && nt !== l)) {
        if (Ae = J(l), He = J(l, s.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            N({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), z("filter", t, {
              evt: e
            }), i && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = Q(c, u.trim(), r, !1), u)
            return N({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), z("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          i && e.preventDefault();
          return;
        }
        s.handle && !Q(c, s.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var s = this, i = s.el, o = s.options, a = i.ownerDocument, l;
    if (r && !g && r.parentNode === i) {
      var c = P(r);
      if (L = i, g = r, I = g.parentNode, xe = g.nextSibling, nt = r, We = o.group, y.dragged = g, ye = {
        target: g,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, fr = ye.clientX - c.left, gr = ye.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, g.style["will-change"] = "all", l = function() {
        if (z("delayEnded", s, {
          evt: e
        }), y.eventCanceled) {
          s._onDrop();
          return;
        }
        s._disableDelayedDragEvents(), !dr && s.nativeDraggable && (g.draggable = !0), s._triggerDragStart(e, t), N({
          sortable: s,
          name: "choose",
          originalEvent: e
        }), G(g, o.chosenClass, !0);
      }, o.ignore.split(",").forEach(function(d) {
        Or(g, d.trim(), $t);
      }), C(a, "dragover", ve), C(a, "mousemove", ve), C(a, "touchmove", ve), o.supportPointer ? (C(a, "pointerup", s._onDrop), !this.nativeDraggable && C(a, "pointercancel", s._onDrop)) : (C(a, "mouseup", s._onDrop), C(a, "touchend", s._onDrop), C(a, "touchcancel", s._onDrop)), dr && this.nativeDraggable && (this.options.touchStartThreshold = 4, g.draggable = !0), z("delayStart", this, {
        evt: e
      }), o.delay && (!o.delayOnTouchOnly || t) && (!this.nativeDraggable || !(Ye || le))) {
        if (y.eventCanceled) {
          this._onDrop();
          return;
        }
        o.supportPointer ? (C(a, "pointerup", s._disableDelayedDrag), C(a, "pointercancel", s._disableDelayedDrag)) : (C(a, "mouseup", s._disableDelayedDrag), C(a, "touchend", s._disableDelayedDrag), C(a, "touchcancel", s._disableDelayedDrag)), C(a, "mousemove", s._delayedDragTouchMoveHandler), C(a, "touchmove", s._delayedDragTouchMoveHandler), o.supportPointer && C(a, "pointermove", s._delayedDragTouchMoveHandler), s._dragStartTimer = setTimeout(l, o.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    g && $t(g), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    S(e, "mouseup", this._disableDelayedDrag), S(e, "touchend", this._disableDelayedDrag), S(e, "touchcancel", this._disableDelayedDrag), S(e, "pointerup", this._disableDelayedDrag), S(e, "pointercancel", this._disableDelayedDrag), S(e, "mousemove", this._delayedDragTouchMoveHandler), S(e, "touchmove", this._delayedDragTouchMoveHandler), S(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? C(document, "pointermove", this._onTouchMove) : t ? C(document, "touchmove", this._onTouchMove) : C(document, "mousemove", this._onTouchMove) : (C(g, "dragend", this), C(L, "dragstart", this._onDragStart));
    try {
      document.selection ? it(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (ke = !1, L && g) {
      z("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && C(document, "dragover", cs);
      var r = this.options;
      !e && G(g, r.dragClass, !1), G(g, r.ghostClass, !0), y.active = this, e && this._appendGhost(), N({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (W) {
      this._lastX = W.clientX, this._lastY = W.clientY, Gr();
      for (var e = document.elementFromPoint(W.clientX, W.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(W.clientX, W.clientY), e !== t); )
        t = e;
      if (g.parentNode[H]._isOutsideThisEl(e), t)
        do {
          if (t[H]) {
            var r = void 0;
            if (r = t[H]._onDragOver({
              clientX: W.clientX,
              clientY: W.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = Br(t));
      Vr();
    }
  },
  _onTouchMove: function(e) {
    if (ye) {
      var t = this.options, r = t.fallbackTolerance, s = t.fallbackOffset, i = e.touches ? e.touches[0] : e, o = v && Le(v, !0), a = v && o && o.a, l = v && o && o.d, c = Ze && q && pr(q), d = (i.clientX - ye.clientX + s.x) / (a || 1) + (c ? c[0] - Et[0] : 0) / (a || 1), u = (i.clientY - ye.clientY + s.y) / (l || 1) + (c ? c[1] - Et[1] : 0) / (l || 1);
      if (!y.active && !ke) {
        if (r && Math.max(Math.abs(i.clientX - this._lastX), Math.abs(i.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (v) {
        o ? (o.e += d - (St || 0), o.f += u - (Ct || 0)) : o = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var h = "matrix(".concat(o.a, ",").concat(o.b, ",").concat(o.c, ",").concat(o.d, ",").concat(o.e, ",").concat(o.f, ")");
        b(v, "webkitTransform", h), b(v, "mozTransform", h), b(v, "msTransform", h), b(v, "transform", h), St = d, Ct = u, W = i;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!v) {
      var e = this.options.fallbackOnBody ? document.body : L, t = P(g, !0, Ze, !0, e), r = this.options;
      if (Ze) {
        for (q = e; b(q, "position") === "static" && b(q, "transform") === "none" && q !== document; )
          q = q.parentNode;
        q !== document.body && q !== document.documentElement ? (q === document && (q = re()), t.top += q.scrollTop, t.left += q.scrollLeft) : q = re(), Et = pr(q);
      }
      v = g.cloneNode(!0), G(v, r.ghostClass, !1), G(v, r.fallbackClass, !0), G(v, r.dragClass, !0), b(v, "transition", ""), b(v, "transform", ""), b(v, "box-sizing", "border-box"), b(v, "margin", 0), b(v, "top", t.top), b(v, "left", t.left), b(v, "width", t.width), b(v, "height", t.height), b(v, "opacity", "0.8"), b(v, "position", Ze ? "absolute" : "fixed"), b(v, "zIndex", "100000"), b(v, "pointerEvents", "none"), y.ghost = v, e.appendChild(v), b(v, "transform-origin", fr / parseInt(v.style.width) * 100 + "% " + gr / parseInt(v.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, s = e.dataTransfer, i = r.options;
    if (z("dragStart", this, {
      evt: e
    }), y.eventCanceled) {
      this._onDrop();
      return;
    }
    z("setupClone", this), y.eventCanceled || (_ = jr(g), _.removeAttribute("id"), _.draggable = !1, _.style["will-change"] = "", this._hideClone(), G(_, this.options.chosenClass, !1), y.clone = _), r.cloneId = it(function() {
      z("clone", r), !y.eventCanceled && (r.options.removeCloneOnHide || L.insertBefore(_, g), r._hideClone(), N({
        sortable: r,
        name: "clone"
      }));
    }), !t && G(g, i.dragClass, !0), t ? (dt = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (S(document, "mouseup", r._onDrop), S(document, "touchend", r._onDrop), S(document, "touchcancel", r._onDrop), s && (s.effectAllowed = "move", i.setData && i.setData.call(r, s, g)), C(document, "drop", r), b(g, "transform", "translateZ(0)")), ke = !0, r._dragStartId = it(r._dragStarted.bind(r, t, e)), C(document, "selectstart", r), Oe = !0, window.getSelection().removeAllRanges(), Ne && b(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, s, i, o, a = this.options, l = a.group, c = y.active, d = We === l, u = a.sort, h = F || c, p, f = this, m = !1;
    if (Nt) return;
    function $(Me, wn) {
      z(Me, f, ne({
        evt: e,
        isOwner: d,
        axis: p ? "vertical" : "horizontal",
        revert: o,
        dragRect: s,
        targetRect: i,
        canSort: u,
        fromSortable: h,
        target: r,
        completed: k,
        onMove: function(ir, xn) {
          return et(L, t, g, s, ir, P(ir), e, xn);
        },
        changed: O
      }, wn));
    }
    function D() {
      $("dragOverAnimationCapture"), f.captureAnimationState(), f !== h && h.captureAnimationState();
    }
    function k(Me) {
      return $("dragOverCompleted", {
        insertion: Me
      }), Me && (d ? c._hideClone() : c._showClone(f), f !== h && (G(g, F ? F.options.ghostClass : c.options.ghostClass, !1), G(g, a.ghostClass, !0)), F !== f && f !== y.active ? F = f : f === y.active && F && (F = null), h === f && (f._ignoreWhileAnimating = r), f.animateAll(function() {
        $("dragOverAnimationComplete"), f._ignoreWhileAnimating = null;
      }), f !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (r === g && !g.animated || r === t && !r.animated) && ($e = null), !a.dragoverBubble && !e.rootEl && r !== document && (g.parentNode[H]._isOutsideThisEl(e.target), !Me && ve(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), m = !0;
    }
    function O() {
      V = J(g), ue = J(g, a.draggable), N({
        sortable: f,
        name: "change",
        toEl: t,
        newIndex: V,
        newDraggableIndex: ue,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = Q(r, a.draggable, t, !0), $("dragOver"), y.eventCanceled) return m;
    if (g.contains(e.target) || r.animated && r.animatingX && r.animatingY || f._ignoreWhileAnimating === r)
      return k(!1);
    if (dt = !1, c && !a.disabled && (d ? u || (o = I !== L) : F === this || (this.lastPutMode = We.checkPull(this, c, g, e)) && l.checkPut(this, c, g, e))) {
      if (p = this._getDirection(e, r) === "vertical", s = P(g), $("dragOverValid"), y.eventCanceled) return m;
      if (o)
        return I = L, D(), this._hideClone(), $("revert"), y.eventCanceled || (xe ? L.insertBefore(g, xe) : L.appendChild(g)), k(!0);
      var T = Wt(t, a.draggable);
      if (!T || ps(e, p, this) && !T.animated) {
        if (T === g)
          return k(!1);
        if (T && t === e.target && (r = T), r && (i = P(r)), et(L, t, g, s, r, i, e, !!r) !== !1)
          return D(), T && T.nextSibling ? t.insertBefore(g, T.nextSibling) : t.appendChild(g), I = t, O(), k(!0);
      } else if (T && hs(e, p, this)) {
        var K = _e(t, 0, a, !0);
        if (K === g)
          return k(!1);
        if (r = K, i = P(r), et(L, t, g, s, r, i, e, !1) !== !1)
          return D(), t.insertBefore(g, K), I = t, O(), k(!0);
      } else if (r.parentNode === t) {
        i = P(r);
        var Y = 0, me, De = g.parentNode !== t, U = !as(g.animated && g.toRect || s, r.animated && r.toRect || i, p), Te = p ? "top" : "left", ce = hr(r, "top", "top") || hr(g, "top", "top"), Ie = ce ? ce.scrollTop : void 0;
        $e !== r && (me = i[Te], Ge = !1, Qe = !U && a.invertSwap || De), Y = fs(e, r, i, p, U ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, Qe, $e === r);
        var se;
        if (Y !== 0) {
          var be = J(g);
          do
            be -= Y, se = I.children[be];
          while (se && (b(se, "display") === "none" || se === v));
        }
        if (Y === 0 || se === r)
          return k(!1);
        $e = r, Ue = Y;
        var Re = r.nextElementSibling, de = !1;
        de = Y === 1;
        var Xe = et(L, t, g, s, r, i, e, de);
        if (Xe !== !1)
          return (Xe === 1 || Xe === -1) && (de = Xe === 1), Nt = !0, setTimeout(us, 30), D(), de && !Re ? t.appendChild(g) : r.parentNode.insertBefore(g, de ? Re : r), ce && qr(ce, 0, Ie - ce.scrollTop), I = g.parentNode, me !== void 0 && !Qe && (st = Math.abs(me - P(r)[Te])), O(), k(!0);
      }
      if (t.contains(g))
        return k(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    S(document, "mousemove", this._onTouchMove), S(document, "touchmove", this._onTouchMove), S(document, "pointermove", this._onTouchMove), S(document, "dragover", ve), S(document, "mousemove", ve), S(document, "touchmove", ve);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    S(e, "mouseup", this._onDrop), S(e, "touchend", this._onDrop), S(e, "pointerup", this._onDrop), S(e, "pointercancel", this._onDrop), S(e, "touchcancel", this._onDrop), S(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, r = this.options;
    if (V = J(g), ue = J(g, r.draggable), z("drop", this, {
      evt: e
    }), I = g && g.parentNode, V = J(g), ue = J(g, r.draggable), y.eventCanceled) {
      this._nulling();
      return;
    }
    ke = !1, Qe = !1, Ge = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), zt(this.cloneId), zt(this._dragStartId), this.nativeDraggable && (S(document, "drop", this), S(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Ne && b(document.body, "user-select", ""), b(g, "transform", ""), e && (Oe && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), v && v.parentNode && v.parentNode.removeChild(v), (L === I || F && F.lastPutMode !== "clone") && _ && _.parentNode && _.parentNode.removeChild(_), g && (this.nativeDraggable && S(g, "dragend", this), $t(g), g.style["will-change"] = "", Oe && !ke && G(g, F ? F.options.ghostClass : this.options.ghostClass, !1), G(g, this.options.chosenClass, !1), N({
      sortable: this,
      name: "unchoose",
      toEl: I,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), L !== I ? (V >= 0 && (N({
      rootEl: I,
      name: "add",
      toEl: I,
      fromEl: L,
      originalEvent: e
    }), N({
      sortable: this,
      name: "remove",
      toEl: I,
      originalEvent: e
    }), N({
      rootEl: I,
      name: "sort",
      toEl: I,
      fromEl: L,
      originalEvent: e
    }), N({
      sortable: this,
      name: "sort",
      toEl: I,
      originalEvent: e
    })), F && F.save()) : V !== Ae && V >= 0 && (N({
      sortable: this,
      name: "update",
      toEl: I,
      originalEvent: e
    }), N({
      sortable: this,
      name: "sort",
      toEl: I,
      originalEvent: e
    })), y.active && ((V == null || V === -1) && (V = Ae, ue = He), N({
      sortable: this,
      name: "end",
      toEl: I,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    z("nulling", this), L = g = I = v = xe = _ = nt = he = ye = W = Oe = V = ue = Ae = He = $e = Ue = F = We = y.dragged = y.ghost = y.clone = y.active = null, ht.forEach(function(e) {
      e.checked = !0;
    }), ht.length = St = Ct = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        g && (this._onDragOver(e), ds(e));
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
    for (var e = [], t, r = this.el.children, s = 0, i = r.length, o = this.options; s < i; s++)
      t = r[s], Q(t, o.draggable, this.el, !1) && e.push(t.getAttribute(o.dataIdAttr) || ms(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var r = {}, s = this.el;
    this.toArray().forEach(function(i, o) {
      var a = s.children[o];
      Q(a, this.options.draggable, s, !1) && (r[i] = a);
    }, this), t && this.captureAnimationState(), e.forEach(function(i) {
      r[i] && (s.removeChild(r[i]), s.appendChild(r[i]));
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
    var r = this.options;
    if (t === void 0)
      return r[e];
    var s = Je.modifyOption(this, e, t);
    typeof s < "u" ? r[e] = s : r[e] = t, e === "group" && Ur(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    z("destroy", this);
    var e = this.el;
    e[H] = null, S(e, "mousedown", this._onTapStart), S(e, "touchstart", this._onTapStart), S(e, "pointerdown", this._onTapStart), this.nativeDraggable && (S(e, "dragover", this), S(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), ut.splice(ut.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!he) {
      if (z("hideClone", this), y.eventCanceled) return;
      b(_, "display", "none"), this.options.removeCloneOnHide && _.parentNode && _.parentNode.removeChild(_), he = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (he) {
      if (z("showClone", this), y.eventCanceled) return;
      g.parentNode == L && !this.options.group.revertClone ? L.insertBefore(_, g) : xe ? L.insertBefore(_, xe) : L.appendChild(_), this.options.group.revertClone && this.animate(g, _), b(_, "display", ""), he = !1;
    }
  }
};
function ds(n) {
  n.dataTransfer && (n.dataTransfer.dropEffect = "move"), n.cancelable && n.preventDefault();
}
function et(n, e, t, r, s, i, o, a) {
  var l, c = n[H], d = c.options.onMove, u;
  return window.CustomEvent && !le && !Ye ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = n, l.dragged = t, l.draggedRect = r, l.related = s || e, l.relatedRect = i || P(e), l.willInsertAfter = a, l.originalEvent = o, n.dispatchEvent(l), d && (u = d.call(c, l, o)), u;
}
function $t(n) {
  n.draggable = !1;
}
function us() {
  Nt = !1;
}
function hs(n, e, t) {
  var r = P(_e(t.el, 0, t.options, !0)), s = Nr(t.el, t.options, v), i = 10;
  return e ? n.clientX < s.left - i || n.clientY < r.top && n.clientX < r.right : n.clientY < s.top - i || n.clientY < r.bottom && n.clientX < r.left;
}
function ps(n, e, t) {
  var r = P(Wt(t.el, t.options.draggable)), s = Nr(t.el, t.options, v), i = 10;
  return e ? n.clientX > s.right + i || n.clientY > r.bottom && n.clientX > r.left : n.clientY > s.bottom + i || n.clientX > r.right && n.clientY > r.top;
}
function fs(n, e, t, r, s, i, o, a) {
  var l = r ? n.clientY : n.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, h = !1;
  if (!o) {
    if (a && st < c * s) {
      if (!Ge && (Ue === 1 ? l > d + c * i / 2 : l < u - c * i / 2) && (Ge = !0), Ge)
        h = !0;
      else if (Ue === 1 ? l < d + st : l > u - st)
        return -Ue;
    } else if (l > d + c * (1 - s) / 2 && l < u - c * (1 - s) / 2)
      return gs(e);
  }
  return h = h || o, h && (l < d + c * i / 2 || l > u - c * i / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function gs(n) {
  return J(g) < J(n) ? 1 : -1;
}
function ms(n) {
  for (var e = n.tagName + n.className + n.src + n.href + n.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function bs(n) {
  ht.length = 0;
  for (var e = n.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && ht.push(r);
  }
}
function it(n) {
  return setTimeout(n, 0);
}
function zt(n) {
  return clearTimeout(n);
}
mt && C(document, "touchmove", function(n) {
  (y.active || ke) && n.cancelable && n.preventDefault();
});
y.utils = {
  on: C,
  off: S,
  css: b,
  find: Or,
  is: function(e, t) {
    return !!Q(e, t, e, !1);
  },
  extend: Zn,
  throttle: Fr,
  closest: Q,
  toggleClass: G,
  clone: jr,
  index: J,
  nextTick: it,
  cancelNextTick: zt,
  detectDirection: Hr,
  getChild: _e,
  expando: H
};
y.get = function(n) {
  return n[H];
};
y.mount = function() {
  for (var n = arguments.length, e = new Array(n), t = 0; t < n; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (y.utils = ne(ne({}, y.utils), r.utils)), Je.mount(r);
  });
};
y.create = function(n, e) {
  return new y(n, e);
};
y.version = Wn;
var M = [], Fe, Ht, Ut = !1, kt, At, pt, qe;
function ys() {
  function n() {
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
  return n.prototype = {
    dragStarted: function(t) {
      var r = t.originalEvent;
      this.sortable.nativeDraggable ? C(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? C(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? C(document, "touchmove", this._handleFallbackAutoScroll) : C(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var r = t.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? S(document, "dragover", this._handleAutoScroll) : (S(document, "pointermove", this._handleFallbackAutoScroll), S(document, "touchmove", this._handleFallbackAutoScroll), S(document, "mousemove", this._handleFallbackAutoScroll)), br(), ot(), es();
    },
    nulling: function() {
      pt = Ht = Fe = Ut = qe = kt = At = null, M.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var s = this, i = (t.touches ? t.touches[0] : t).clientX, o = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(i, o);
      if (pt = t, r || this.options.forceAutoScrollFallback || Ye || le || Ne) {
        Lt(t, this.options, a, r);
        var l = pe(a, !0);
        Ut && (!qe || i !== kt || o !== At) && (qe && br(), qe = setInterval(function() {
          var c = pe(document.elementFromPoint(i, o), !0);
          c !== l && (l = c, ot()), Lt(t, s.options, c, r);
        }, 10), kt = i, At = o);
      } else {
        if (!this.options.bubbleScroll || pe(a, !0) === re()) {
          ot();
          return;
        }
        Lt(t, this.options, pe(a, !1), !1);
      }
    }
  }, ae(n, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function ot() {
  M.forEach(function(n) {
    clearInterval(n.pid);
  }), M = [];
}
function br() {
  clearInterval(qe);
}
var Lt = Fr(function(n, e, t, r) {
  if (e.scroll) {
    var s = (n.touches ? n.touches[0] : n).clientX, i = (n.touches ? n.touches[0] : n).clientY, o = e.scrollSensitivity, a = e.scrollSpeed, l = re(), c = !1, d;
    Ht !== t && (Ht = t, ot(), Fe = e.scroll, d = e.scrollFn, Fe === !0 && (Fe = pe(t, !0)));
    var u = 0, h = Fe;
    do {
      var p = h, f = P(p), m = f.top, $ = f.bottom, D = f.left, k = f.right, O = f.width, T = f.height, K = void 0, Y = void 0, me = p.scrollWidth, De = p.scrollHeight, U = b(p), Te = p.scrollLeft, ce = p.scrollTop;
      p === l ? (K = O < me && (U.overflowX === "auto" || U.overflowX === "scroll" || U.overflowX === "visible"), Y = T < De && (U.overflowY === "auto" || U.overflowY === "scroll" || U.overflowY === "visible")) : (K = O < me && (U.overflowX === "auto" || U.overflowX === "scroll"), Y = T < De && (U.overflowY === "auto" || U.overflowY === "scroll"));
      var Ie = K && (Math.abs(k - s) <= o && Te + O < me) - (Math.abs(D - s) <= o && !!Te), se = Y && (Math.abs($ - i) <= o && ce + T < De) - (Math.abs(m - i) <= o && !!ce);
      if (!M[u])
        for (var be = 0; be <= u; be++)
          M[be] || (M[be] = {});
      (M[u].vx != Ie || M[u].vy != se || M[u].el !== p) && (M[u].el = p, M[u].vx = Ie, M[u].vy = se, clearInterval(M[u].pid), (Ie != 0 || se != 0) && (c = !0, M[u].pid = setInterval(function() {
        r && this.layer === 0 && y.active._onTouchMove(pt);
        var Re = M[this.layer].vy ? M[this.layer].vy * a : 0, de = M[this.layer].vx ? M[this.layer].vx * a : 0;
        typeof d == "function" && d.call(y.dragged.parentNode[H], de, Re, n, pt, M[this.layer].el) !== "continue" || qr(M[this.layer].el, de, Re);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && h !== l && (h = pe(h, !1)));
    Ut = c;
  }
}, 30), Kr = function(e) {
  var t = e.originalEvent, r = e.putSortable, s = e.dragEl, i = e.activeSortable, o = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = r || i;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (o("spill"), this.onSpill({
      dragEl: s,
      putSortable: r
    }));
  }
};
function Qt() {
}
Qt.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var s = _e(this.sortable.el, this.startIndex, this.options);
    s ? this.sortable.el.insertBefore(t, s) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: Kr
};
ae(Qt, {
  pluginName: "revertOnSpill"
});
function Zt() {
}
Zt.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, s = r || this.sortable;
    s.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), s.animateAll();
  },
  drop: Kr
};
ae(Zt, {
  pluginName: "removeOnSpill"
});
y.mount(new ys());
y.mount(Zt, Qt);
class vs {
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
    const r = this.createHeader(e.length, e.length - t.size);
    this.container.appendChild(r);
    const s = document.createElement("div");
    s.className = "column-list", s.setAttribute("role", "list"), s.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = s, e.forEach((o) => {
      const a = this.createColumnItem(o.field, o.label || o.field, !t.has(o.field));
      s.appendChild(a);
    }), this.container.appendChild(s);
    const i = this.createFooter();
    this.container.appendChild(i);
  }
  /**
   * Create header with search input and count badge
   */
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const s = document.createElement("div");
    s.className = "column-search-container";
    const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    i.setAttribute("class", "column-search-icon"), i.setAttribute("viewBox", "0 0 24 24"), i.setAttribute("fill", "none"), i.setAttribute("stroke", "currentColor"), i.setAttribute("stroke-width", "2");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    o.setAttribute("cx", "11"), o.setAttribute("cy", "11"), o.setAttribute("r", "8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "m21 21-4.3-4.3"), i.appendChild(o), i.appendChild(a);
    const l = document.createElement("input");
    l.type = "text", l.className = "column-search-input", l.placeholder = "Filter columns...", l.setAttribute("aria-label", "Filter columns"), this.searchInput = l, l.addEventListener("input", () => {
      this.filterColumns(l.value);
    }), s.appendChild(i), s.appendChild(l);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, r.appendChild(s), r.appendChild(c), r;
  }
  /**
   * Filter columns by search term
   */
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((s) => {
      const i = s.querySelector(".column-label")?.textContent?.toLowerCase() || "", o = t === "" || i.includes(t);
      s.style.display = o ? "" : "none";
    }), this.updateScrollShadows();
  }
  /**
   * Update the count badge
   */
  updateCountBadge() {
    if (!this.countBadgeEl) return;
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns, r = e.length - t.size;
    this.countBadgeEl.textContent = `${r} of ${e.length}`;
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
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, s = e.clientHeight, i = r > s, o = i && t > 0, a = i && t + s < r - 1;
    e.classList.toggle("column-list--shadow-top", o), e.classList.toggle("column-list--shadow-bottom", a);
  }
  /**
   * Create footer with Reset to Default button
   */
  createFooter() {
    const e = document.createElement("div");
    e.className = "column-manager-footer";
    const t = document.createElement("button");
    t.type = "button", t.className = "column-reset-btn", t.setAttribute("aria-label", "Reset columns to default");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    r.setAttribute("class", "column-reset-icon"), r.setAttribute("viewBox", "0 0 24 24"), r.setAttribute("fill", "none"), r.setAttribute("stroke", "currentColor"), r.setAttribute("stroke-width", "2"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-linejoin", "round");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "path");
    s.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    i.setAttribute("d", "M3 3v5h5"), r.appendChild(s), r.appendChild(i);
    const o = document.createElement("span");
    return o.textContent = "Reset to Default", t.appendChild(r), t.appendChild(o), t.addEventListener("click", () => {
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
  createColumnItem(e, t, r) {
    const s = `column-item-${e}`, i = `column-switch-${e}`, o = document.createElement("div");
    o.className = "column-item", o.id = s, o.dataset.column = e, o.setAttribute("role", "listitem");
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
    ].forEach(([m, $]) => {
      const D = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      D.setAttribute("cx", String(m)), D.setAttribute("cy", String($)), D.setAttribute("r", "1.5"), l.appendChild(D);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${s}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = i;
    const h = document.createElement("input");
    h.type = "checkbox", h.id = i, h.dataset.column = e, h.checked = r, h.setAttribute("role", "switch"), h.setAttribute("aria-checked", String(r)), h.setAttribute("aria-labelledby", `${s}-label`), h.setAttribute("aria-describedby", `${s}-desc`);
    const p = document.createElement("span");
    p.id = `${s}-desc`, p.className = "sr-only", p.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const f = document.createElement("span");
    return f.className = "column-switch-slider", f.setAttribute("aria-hidden", "true"), u.appendChild(h), u.appendChild(f), o.appendChild(a), o.appendChild(u), o.appendChild(p), o;
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
        const t = e.querySelectorAll(".column-item"), r = Array.from(t).map(
          (s) => s.dataset.column
        );
        this.onReorder && this.onReorder(r), this.grid.reorderColumns(r), this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(r, this.grid);
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
        const r = t.dataset.column;
        if (!r) return;
        const s = t.checked;
        t.setAttribute("aria-checked", String(s));
        const i = `column-item-${r}-desc`, o = this.container.querySelector(`#${i}`);
        if (o) {
          const a = this.container.querySelector(`#column-item-${r}-label`)?.textContent || r;
          o.textContent = `Press Space or Enter to toggle ${a} column visibility. Currently ${s ? "visible" : "hidden"}.`;
        }
        this.onToggle && this.onToggle(r, s), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(r, this.grid), this.updateCountBadge();
      });
    });
  }
  /**
   * Update the switch state for a specific column
   * Called when visibility changes externally (e.g., URL restore)
   * Also updates ARIA attributes for accessibility
   */
  updateSwitchState(e, t) {
    const r = this.container.querySelector(
      `input[type="checkbox"][data-column="${e}"]`
    );
    r && (r.checked = t, r.setAttribute("aria-checked", String(t)));
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
function ws(n, e = {}) {
  const {
    groupByField: t = "translation_group_id",
    defaultExpanded: r = !0,
    expandedGroups: s = /* @__PURE__ */ new Set()
  } = e, i = /* @__PURE__ */ new Map(), o = [];
  for (const l of n) {
    const c = As(l, t);
    if (c) {
      const d = i.get(c);
      d ? d.push(l) : i.set(c, [l]);
    } else
      o.push(l);
  }
  const a = [];
  for (const [l, c] of i) {
    const d = Xr(c), u = s.has(l) || s.size === 0 && r;
    a.push({
      groupId: l,
      records: c,
      summary: d,
      expanded: u,
      summaryFromBackend: !1
      // We're computing client-side here
    });
  }
  return a.sort((l, c) => {
    const d = n.indexOf(l.records[0]), u = n.indexOf(c.records[0]);
    return d - u;
  }), {
    groups: a,
    ungrouped: o,
    totalGroups: a.length,
    totalRecords: n.length
  };
}
function Yr(n) {
  return n.length === 0 ? !1 : n.every((e) => Ss(e));
}
function xs(n, e = {}) {
  const {
    defaultExpanded: t = !0,
    expandedGroups: r = /* @__PURE__ */ new Set()
  } = e;
  if (!Yr(n))
    return null;
  const s = [];
  let i = 0;
  for (const o of n) {
    const a = Es(o);
    if (!a)
      return null;
    const l = Jr(o), c = ks(o, l), d = r.has(a) || r.size === 0 && t;
    s.push({
      groupId: a,
      records: l,
      summary: c,
      expanded: d,
      summaryFromBackend: $s(o)
    }), i += l.length;
  }
  return {
    groups: s,
    ungrouped: [],
    totalGroups: s.length,
    totalRecords: i
  };
}
function Ss(n) {
  const e = n, t = typeof e.group_by == "string" ? e.group_by.trim().toLowerCase() : "", r = Cs(n);
  if (!(t === "translation_group_id" || r === "group"))
    return !1;
  const i = Jr(n);
  return Array.isArray(i);
}
function Cs(n) {
  const e = n._group;
  if (!e || typeof e != "object" || Array.isArray(e))
    return "";
  const t = e.row_type;
  return typeof t == "string" ? t.trim().toLowerCase() : "";
}
function Es(n) {
  const e = n.translation_group_id;
  if (typeof e == "string" && e.trim())
    return e.trim();
  const t = n._group;
  if (!t || typeof t != "object" || Array.isArray(t))
    return null;
  const r = t.id;
  return typeof r == "string" && r.trim() ? r.trim() : null;
}
function Jr(n) {
  const e = n, t = Array.isArray(e.records) ? e.records : e.children;
  if (Array.isArray(t)) {
    const s = t.filter((i) => !!i && typeof i == "object" && !Array.isArray(i)).map((i) => ({ ...i }));
    if (s.length > 0)
      return s;
  }
  const r = e.parent;
  return r && typeof r == "object" && !Array.isArray(r) ? [{ ...r }] : [];
}
function $s(n) {
  const e = n.translation_group_summary;
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function ks(n, e) {
  const t = n.translation_group_summary;
  if (!t || typeof t != "object" || Array.isArray(t))
    return Xr(e);
  const r = t, s = Array.isArray(r.available_locales) ? r.available_locales.filter(fe) : [], i = Array.isArray(r.missing_locales) ? r.missing_locales.filter(fe) : [], o = Wr(r.readiness_state) ? r.readiness_state : null, a = typeof r.required_count == "number" ? Math.max(r.required_count, 0) : null, l = typeof r.available_count == "number" ? Math.max(r.available_count, 0) : s.length, c = a !== null ? a : Math.max(l + i.length, e.length);
  return {
    totalItems: typeof r.total_items == "number" ? Math.max(r.total_items, 0) : c,
    availableLocales: s,
    missingLocales: i,
    readinessState: o,
    readyForPublish: typeof r.ready_for_publish == "boolean" ? r.ready_for_publish : null
  };
}
function As(n, e) {
  const t = n[e];
  if (typeof t == "string" && t.trim())
    return t;
  const r = [
    `translation.meta.${e}`,
    `content_translation.meta.${e}`
  ];
  for (const s of r) {
    const i = Ls(n, s);
    if (typeof i == "string" && i.trim())
      return i;
  }
  return null;
}
function Ls(n, e) {
  const t = e.split(".");
  let r = n;
  for (const s of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[s];
  }
  return r;
}
function Xr(n) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let r = !1, s = 0;
  for (const o of n) {
    const a = o.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, u = a.readiness_state;
      Array.isArray(c) && c.filter(fe).forEach((h) => e.add(h)), Array.isArray(d) && d.filter(fe).forEach((h) => t.add(h)), (u === "missing_fields" || u === "missing_locales_and_fields") && (r = !0), u === "ready" && s++;
    }
    const l = o.available_locales;
    Array.isArray(l) && l.filter(fe).forEach((c) => e.add(c));
  }
  let i = null;
  if (n.length > 0) {
    const o = s === n.length, a = t.size > 0;
    o ? i = "ready" : a && r ? i = "missing_locales_and_fields" : a ? i = "missing_locales" : r && (i = "missing_fields");
  }
  return {
    totalItems: n.length,
    availableLocales: Array.from(e),
    missingLocales: Array.from(t),
    readinessState: i,
    readyForPublish: i === "ready"
  };
}
function fe(n) {
  return typeof n == "string";
}
function _s(n, e) {
  const t = n.groups.map((r) => {
    const s = e.get(r.groupId);
    return s ? {
      ...r,
      summary: {
        ...r.summary,
        ...s
      },
      summaryFromBackend: !0
    } : r;
  });
  return {
    ...n,
    groups: t
  };
}
function Ds(n) {
  const e = /* @__PURE__ */ new Map(), t = n.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [r, s] of Object.entries(t))
    if (s && typeof s == "object") {
      const i = s;
      e.set(r, {
        totalItems: typeof i.total_items == "number" ? i.total_items : void 0,
        availableLocales: Array.isArray(i.available_locales) ? i.available_locales.filter(fe) : void 0,
        missingLocales: Array.isArray(i.missing_locales) ? i.missing_locales.filter(fe) : void 0,
        readinessState: Wr(i.readiness_state) ? i.readiness_state : void 0,
        readyForPublish: typeof i.ready_for_publish == "boolean" ? i.ready_for_publish : void 0
      });
    }
  return e;
}
function Wr(n) {
  return n === "ready" || n === "missing_locales" || n === "missing_fields" || n === "missing_locales_and_fields";
}
const Qr = "datagrid-expand-state-";
function Ts(n) {
  try {
    const e = Qr + n, t = localStorage.getItem(e);
    if (t) {
      const r = JSON.parse(t);
      if (Array.isArray(r))
        return new Set(r.filter(fe));
    }
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Is(n, e) {
  try {
    const t = Qr + n;
    localStorage.setItem(t, JSON.stringify(Array.from(e)));
  } catch {
  }
}
function ea(n, e) {
  const t = n.groups.map((r) => r.groupId === e ? { ...r, expanded: !r.expanded } : r);
  return { ...n, groups: t };
}
function ta(n) {
  const e = n.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...n, groups: e };
}
function ra(n) {
  const e = n.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...n, groups: e };
}
function na(n) {
  const e = /* @__PURE__ */ new Set();
  for (const t of n.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const Zr = "datagrid-view-mode-", Rs = 200, Ms = 256;
function Ps(n) {
  try {
    const e = Zr + n, t = localStorage.getItem(e);
    if (t && en(t))
      return t;
  } catch {
  }
  return null;
}
function yr(n, e) {
  try {
    const t = Zr + n;
    localStorage.setItem(t, e);
  } catch {
  }
}
function en(n) {
  return n === "flat" || n === "grouped" || n === "matrix";
}
function Bs(n) {
  return n && en(n) ? n : null;
}
function Os(n) {
  if (!(n instanceof Set) || n.size === 0)
    return "";
  const e = Array.from(new Set(
    Array.from(n).map((t) => tn(t)).filter((t) => t !== null)
  )).sort();
  return e.length === 0 ? "" : e.map((t) => encodeURIComponent(t)).join(",");
}
function Fs(n) {
  const e = /* @__PURE__ */ new Set();
  if (!n)
    return e;
  const t = n.split(",");
  for (const r of t) {
    if (e.size >= Rs)
      break;
    if (!r)
      continue;
    let s = "";
    try {
      s = decodeURIComponent(r);
    } catch {
      continue;
    }
    const i = tn(s);
    i && e.add(i);
  }
  return e;
}
function tn(n) {
  if (typeof n != "string")
    return null;
  const e = n.trim();
  return !e || e.length > Ms ? null : e;
}
function qs(n, e = {}) {
  const { summary: t } = n, { size: r = "sm" } = e, s = r === "sm" ? "text-xs" : "text-sm", i = t.availableLocales.length, o = t.missingLocales.length, a = i + o;
  let l = "";
  if (t.readinessState) {
    const u = js(t.readinessState);
    l = `
      <span class="${s} px-1.5 py-0.5 rounded ${u.bgClass} ${u.textClass}"
            title="${u.description}">
        ${u.icon} ${u.label}
      </span>
    `;
  }
  const c = a > 0 ? `<span class="${s} text-gray-500">${i}/${a} locales</span>` : "", d = `<span class="${s} text-gray-500">${t.totalItems} item${t.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${l}
      ${c}
      ${d}
    </div>
  `;
}
function js(n) {
  switch (n) {
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
function Ns(n, e, t = {}) {
  const { showExpandIcon: r = !0 } = t, s = r ? `<span class="expand-icon mr-2" aria-hidden="true">${n.expanded ? "▼" : "▶"}</span>` : "", i = qs(n);
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${zs(n.groupId)}"
        data-expanded="${n.expanded}"
        role="row"
        aria-expanded="${n.expanded}"
        tabindex="0">
      <td colspan="${e + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${s}
            <span class="font-medium text-gray-700">Group: ${er(n.groupId.slice(0, 12))}...</span>
          </div>
          ${i}
        </div>
      </td>
    </tr>
  `;
}
function er(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function zs(n) {
  return er(n);
}
function Hs(n) {
  return `
    <tr>
      <td colspan="${n + 2}" class="px-6 py-12 text-center">
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
function sa(n) {
  return `
    <tr>
      <td colspan="${n + 2}" class="px-6 py-12 text-center">
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
function ia(n, e, t) {
  const r = t ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${n + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${er(e)}</p>
          ${r}
        </div>
      </td>
    </tr>
  `;
}
function Us(n = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < n;
}
function vr(n, e = 768) {
  return Us(e) && n === "grouped" ? "flat" : n;
}
const x = class x {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new Ve(), this.selectors = {
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
    const t = this.config.panelId || this.config.tableId, r = this.config.enableGroupedMode ? Ps(t) : null, s = this.config.enableGroupedMode ? Ts(t) : /* @__PURE__ */ new Set(), i = r || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: new Set(
        this.config.columns.filter((o) => o.hidden).map((o) => o.field)
      ),
      columnOrder: this.config.columns.map((o) => o.field),
      // Initialize with config column order
      // Phase 2: Grouped mode state
      viewMode: i,
      groupedData: null,
      expandedGroups: s
    }, this.actionRenderer = new Ln({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new Kn(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([o, a]) => {
      this.cellRendererRegistry.register(o, a);
    }), this.defaultColumns = this.config.columns.map((o) => ({ ...o }));
  }
  /**
   * Initialize the data grid
   */
  init() {
    if (console.log("[DataGrid] Initializing with config:", this.config), this.tableEl = document.querySelector(this.selectors.table), !this.tableEl) {
      console.error(`[DataGrid] Table element not found: ${this.selectors.table}`);
      return;
    }
    console.log("[DataGrid] Table element found:", this.tableEl), this.restoreStateFromURL(), this.bindSearchInput(), this.bindPerPageSelect(), this.bindFilterInputs(), this.bindColumnVisibility(), this.bindExportButtons(), this.bindSorting(), this.bindSelection(), this.bindBulkActions(), this.bindBulkClearButton(), this.bindDropdownToggles(), this.refresh();
  }
  /**
   * Restore DataGrid state from URL parameters
   */
  restoreStateFromURL() {
    const e = new URLSearchParams(window.location.search);
    this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1;
    const t = e.get(x.URL_KEY_SEARCH);
    if (t) {
      this.state.search = t;
      const l = document.querySelector(this.selectors.searchInput);
      l && (l.value = t);
    }
    const r = e.get(x.URL_KEY_PAGE);
    if (r) {
      const l = parseInt(r, 10);
      this.state.currentPage = Number.isNaN(l) ? 1 : Math.max(1, l);
    }
    const s = e.get(x.URL_KEY_PER_PAGE);
    if (s) {
      const l = parseInt(s, 10), c = this.config.perPage || 10;
      this.state.perPage = Number.isNaN(l) ? c : Math.max(1, l);
      const d = document.querySelector(this.selectors.perPageSelect);
      d && (d.value = String(this.state.perPage));
    }
    const i = e.get(x.URL_KEY_FILTERS);
    if (i)
      try {
        this.state.filters = JSON.parse(i);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse filters from URL:", l);
      }
    const o = e.get(x.URL_KEY_SORT);
    if (o)
      try {
        this.state.sort = JSON.parse(o);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse sort from URL:", l);
      }
    if (this.config.enableGroupedMode) {
      const l = Bs(e.get(x.URL_KEY_VIEW_MODE));
      l && (this.state.viewMode = vr(l)), e.has(x.URL_KEY_EXPANDED_GROUPS) && (this.state.expandedGroups = Fs(
        e.get(x.URL_KEY_EXPANDED_GROUPS)
      ));
    }
    const a = e.get(x.URL_KEY_HIDDEN_COLUMNS);
    if (a)
      try {
        const l = JSON.parse(a), c = new Set(this.config.columns.map((d) => d.field));
        this.state.hiddenColumns = new Set(
          (Array.isArray(l) ? l : []).filter((d) => c.has(d))
        );
      } catch (l) {
        console.warn("[DataGrid] Failed to parse hidden columns from URL:", l);
      }
    else if (this.config.behaviors?.columnVisibility) {
      const l = this.config.columns.map((d) => d.field), c = this.config.behaviors.columnVisibility.loadHiddenColumnsFromCache(l);
      c.size > 0 && (this.state.hiddenColumns = c);
    }
    if (this.config.behaviors?.columnVisibility?.loadColumnOrderFromCache) {
      const l = this.config.columns.map((d) => d.field), c = this.config.behaviors.columnVisibility.loadColumnOrderFromCache(l);
      if (c && c.length > 0) {
        const d = this.mergeColumnOrder(c);
        this.state.columnOrder = d, this.didRestoreColumnOrder = !0;
        const u = this.defaultColumns.map((p) => p.field);
        this.shouldReorderDOMOnRestore = u.join("|") !== d.join("|");
        const h = new Map(this.config.columns.map((p) => [p.field, p]));
        this.config.columns = d.map((p) => h.get(p)).filter((p) => p !== void 0), console.log("[DataGrid] Column order restored from cache:", d);
      }
    }
    console.log("[DataGrid] State restored from URL:", this.state), setTimeout(() => {
      this.applyRestoredState();
    }, 0);
  }
  /**
   * Apply restored state to UI elements
   */
  applyRestoredState() {
    this.state.filters.length > 0 && this.state.filters.forEach((t) => {
      const r = document.querySelector(
        `[data-filter-column="${t.column}"]`
      );
      r && (r.value = String(t.value));
    }), this.didRestoreColumnOrder && this.shouldReorderDOMOnRestore && this.reorderTableColumns(this.state.columnOrder);
    const e = this.config.columns.filter((t) => !this.state.hiddenColumns.has(t.field)).map((t) => t.field);
    this.updateColumnVisibility(e, !0), this.state.sort.length > 0 && this.updateSortIndicators();
  }
  /**
   * Push current state to URL without reloading page
   */
  pushStateToURL(e = {}) {
    const t = new URLSearchParams(window.location.search);
    for (const s of x.MANAGED_URL_KEYS)
      t.delete(s);
    if (this.state.search && t.set(x.URL_KEY_SEARCH, this.state.search), this.state.currentPage > 1 && t.set(x.URL_KEY_PAGE, String(this.state.currentPage)), this.state.perPage !== (this.config.perPage || 10) && t.set(x.URL_KEY_PER_PAGE, String(this.state.perPage)), this.state.filters.length > 0 && t.set(x.URL_KEY_FILTERS, JSON.stringify(this.state.filters)), this.state.sort.length > 0 && t.set(x.URL_KEY_SORT, JSON.stringify(this.state.sort)), this.state.hiddenColumns.size > 0 && t.set(
      x.URL_KEY_HIDDEN_COLUMNS,
      JSON.stringify(Array.from(this.state.hiddenColumns))
    ), this.config.enableGroupedMode && (t.set(x.URL_KEY_VIEW_MODE, this.state.viewMode), this.state.viewMode === "grouped")) {
      const s = Os(this.state.expandedGroups);
      s && t.set(x.URL_KEY_EXPANDED_GROUPS, s);
    }
    const r = t.toString() ? `${window.location.pathname}?${t.toString()}` : window.location.pathname;
    e.replace ? window.history.replaceState({}, "", r) : window.history.pushState({}, "", r), console.log("[DataGrid] URL updated:", r);
  }
  /**
   * Public API: sync current grid state to the URL.
   * Keeps `hiddenColumns` shareable; column order stays preferences-only by default.
   */
  syncURL() {
    this.pushStateToURL();
  }
  /**
   * Refresh data from API
   */
  async refresh() {
    console.log("[DataGrid] ===== refresh() CALLED ====="), console.log("[DataGrid] Current sort state:", JSON.stringify(this.state.sort)), this.abortController && this.abortController.abort(), this.abortController = new AbortController();
    try {
      const e = this.buildApiUrl(), t = await fetch(e, {
        signal: this.abortController.signal,
        headers: {
          Accept: "application/json"
        }
      });
      if (!t.ok) {
        if (this.handleGroupedModeStatusFallback(t.status))
          return;
        throw new Error(`HTTP error! status: ${t.status}`);
      }
      const r = await t.json();
      console.log("[DataGrid] API Response:", r), console.log("[DataGrid] API Response data array:", r.data), console.log("[DataGrid] API Response total:", r.total, "count:", r.count, "$meta:", r.$meta);
      const s = r.data || r.records || [];
      if (this.handleGroupedModePayloadFallback(s))
        return;
      this.lastSchema = r.schema || null, this.lastForm = r.form || null;
      const i = this.getResponseTotal(r);
      if (this.normalizePagination(i))
        return this.refresh();
      console.log("[DataGrid] About to call renderData()..."), this.renderData(r), console.log("[DataGrid] renderData() completed"), this.updatePaginationUI(r), console.log("[DataGrid] ===== refresh() COMPLETED =====");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        console.log("[DataGrid] Request aborted");
        return;
      }
      console.error("[DataGrid] Error fetching data:", e), this.showError("Failed to load data");
    }
  }
  /**
   * Build API URL with all query parameters
   */
  buildApiUrl() {
    const e = new URLSearchParams(), t = this.buildQueryParams();
    Object.entries(t).forEach(([s, i]) => {
      i != null && e.append(s, String(i));
    });
    const r = `${this.config.apiEndpoint}?${e.toString()}`;
    return console.log(`[DataGrid] API URL: ${r}`), r;
  }
  /**
   * Build query string (for exports, etc.)
   */
  buildQueryString() {
    const e = new URLSearchParams(), t = this.buildQueryParams();
    return Object.entries(t).forEach(([r, s]) => {
      s != null && e.append(r, String(s));
    }), e.toString();
  }
  /**
   * Build query parameters from state using behaviors
   */
  buildQueryParams() {
    const e = {};
    if (this.config.behaviors?.pagination) {
      const t = this.config.behaviors.pagination.buildQuery(
        this.state.currentPage,
        this.state.perPage
      );
      Object.assign(e, t);
    }
    if (this.state.search && this.config.behaviors?.search) {
      const t = this.config.behaviors.search.buildQuery(this.state.search);
      Object.assign(e, t);
    }
    if (this.state.filters.length > 0 && this.config.behaviors?.filter) {
      const t = this.config.behaviors.filter.buildFilters(this.state.filters);
      Object.assign(e, t);
    }
    if (this.state.sort.length > 0 && this.config.behaviors?.sort) {
      const t = this.config.behaviors.sort.buildQuery(this.state.sort);
      Object.assign(e, t);
    }
    return this.isGroupedViewActive() && (e.group_by = this.config.groupByField || "translation_group_id"), e;
  }
  getResponseTotal(e) {
    return e.total !== void 0 && e.total !== null ? e.total : e.$meta?.count !== void 0 && e.$meta?.count !== null ? e.$meta.count : e.count !== void 0 && e.count !== null ? e.count : null;
  }
  normalizePagination(e) {
    if (e === null)
      return !1;
    const t = Math.max(1, this.state.perPage || this.config.perPage || 10), r = Math.max(1, Math.ceil(e / t));
    let s = this.state.currentPage;
    e === 0 ? s = 1 : s > r ? s = r : s < 1 && (s = 1);
    const i = t !== this.state.perPage || s !== this.state.currentPage;
    return i && (this.state.perPage = t, this.state.currentPage = s, this.pushStateToURL()), e === 0 ? !1 : i;
  }
  /**
   * Reset pagination to first page
   */
  resetPagination() {
    this.state.currentPage = 1;
  }
  /**
   * Update column visibility
   */
  updateColumnVisibility(e, t = !1) {
    if (!this.tableEl) return;
    const r = new Set(e);
    this.state.hiddenColumns.clear(), this.config.columns.forEach((o) => {
      r.has(o.field) || this.state.hiddenColumns.add(o.field);
    }), t || this.pushStateToURL(), this.tableEl.querySelectorAll("thead th[data-column]").forEach((o) => {
      const a = o.dataset.column;
      a && (o.style.display = r.has(a) ? "" : "none");
    }), this.tableEl.querySelectorAll("tbody td[data-column]").forEach((o) => {
      const a = o.dataset.column;
      a && (o.style.display = r.has(a) ? "" : "none");
    }), this.syncColumnVisibilityCheckboxes();
  }
  /**
   * Sync column visibility switches with current state
   * Uses ColumnManager if available, falls back to direct DOM manipulation
   */
  syncColumnVisibilityCheckboxes() {
    if (this.columnManager) {
      this.columnManager.syncWithGridState();
      return;
    }
    const e = document.querySelector(this.selectors.columnToggleMenu);
    e && this.config.columns.forEach((t) => {
      const r = e.querySelector(
        `input[data-column="${t.field}"]`
      );
      r && (r.checked = !this.state.hiddenColumns.has(t.field));
    });
  }
  /**
   * Render data into table
   */
  renderData(e) {
    const t = this.tableEl?.querySelector("tbody");
    if (!t) {
      console.error("[DataGrid] tbody not found!");
      return;
    }
    t.innerHTML = "";
    const r = e.data || e.records || [];
    console.log(`[DataGrid] renderData() called with ${r.length} items`), console.log("[DataGrid] First 3 items:", r.slice(0, 3));
    const s = this.getResponseTotal(e);
    if (this.state.totalRows = s ?? r.length, r.length === 0) {
      this.config.enableGroupedMode && this.state.viewMode === "grouped" ? t.innerHTML = Hs(this.config.columns.length) : t.innerHTML = `
          <tr>
            <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
      return;
    }
    this.recordsById = {}, this.config.enableGroupedMode && this.state.viewMode === "grouped" ? this.renderGroupedData(e, r, t) : this.renderFlatData(r, t), this.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((o) => {
      const a = o.dataset.column;
      a && this.state.hiddenColumns.has(a) && (o.style.display = "none");
    }), this.updateSelectionBindings();
  }
  /**
   * Render data in flat mode (original behavior)
   */
  renderFlatData(e, t) {
    e.forEach((r, s) => {
      console.log(`[DataGrid] Rendering row ${s + 1}: id=${r.id}`), r.id && (this.recordsById[r.id] = r);
      const i = this.createTableRow(r);
      t.appendChild(i);
    }), console.log(`[DataGrid] Finished appending ${e.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length);
  }
  /**
   * Render data in grouped mode (Phase 2)
   */
  renderGroupedData(e, t, r) {
    const s = this.config.groupByField || "translation_group_id", i = t.filter((c) => !!c && typeof c == "object" && !Array.isArray(c));
    let o = xs(i, {
      defaultExpanded: !0,
      expandedGroups: this.state.expandedGroups
    });
    o || (o = ws(i, {
      groupByField: s,
      defaultExpanded: !0,
      expandedGroups: this.state.expandedGroups
    }));
    const a = Ds(e);
    a.size > 0 && (o = _s(o, a)), this.state.groupedData = o;
    const l = this.config.columns.length;
    for (const c of o.groups) {
      const d = Ns(c, l);
      r.insertAdjacentHTML("beforeend", d);
      const u = r.lastElementChild;
      if (u && (u.addEventListener("click", () => this.toggleGroup(c.groupId)), u.addEventListener("keydown", (h) => {
        (h.key === "Enter" || h.key === " ") && (h.preventDefault(), this.toggleGroup(c.groupId));
      })), c.expanded)
        for (const h of c.records) {
          h.id && (this.recordsById[h.id] = h);
          const p = this.createTableRow(h);
          p.dataset.groupId = c.groupId, p.classList.add("group-child-row"), r.appendChild(p);
        }
    }
    for (const c of o.ungrouped) {
      c.id && (this.recordsById[c.id] = c);
      const d = this.createTableRow(c);
      r.appendChild(d);
    }
    console.log(`[DataGrid] Rendered ${o.groups.length} groups, ${o.ungrouped.length} ungrouped`);
  }
  /**
   * Whether grouped view is currently active and enabled.
   */
  isGroupedViewActive() {
    return !!(this.config.enableGroupedMode && this.state.viewMode === "grouped");
  }
  /**
   * Fallback to flat mode when grouped pagination contract is unavailable.
   */
  fallbackGroupedMode(e) {
    if (!this.isGroupedViewActive())
      return;
    this.state.viewMode = "flat", this.state.groupedData = null;
    const t = this.config.panelId || this.config.tableId;
    yr(t, "flat"), this.pushStateToURL({ replace: !0 }), this.notify(e, "warning"), this.refresh();
  }
  /**
   * Fallback on grouped mode request errors that indicate unsupported contract.
   */
  handleGroupedModeStatusFallback(e) {
    return !this.isGroupedViewActive() || ![400, 404, 405, 422].includes(e) ? !1 : (this.fallbackGroupedMode("Grouped pagination is not supported by this panel. Switched to flat view."), !0);
  }
  /**
   * Fallback when payload does not follow backend grouped-row contract.
   */
  handleGroupedModePayloadFallback(e) {
    if (!this.isGroupedViewActive() || e.length === 0)
      return !1;
    const t = e.filter((r) => !!r && typeof r == "object" && !Array.isArray(r));
    return t.length !== e.length || !Yr(t) ? (this.fallbackGroupedMode("Grouped pagination contract is unavailable. Switched to flat view to avoid split groups."), !0) : !1;
  }
  /**
   * Toggle group expand/collapse state (Phase 2)
   */
  toggleGroup(e) {
    if (!this.state.groupedData) return;
    this.state.expandedGroups.has(e) ? this.state.expandedGroups.delete(e) : this.state.expandedGroups.add(e);
    const t = this.config.panelId || this.config.tableId;
    Is(t, this.state.expandedGroups);
    const r = this.state.groupedData.groups.find((s) => s.groupId === e);
    r && (r.expanded = this.state.expandedGroups.has(e)), this.updateGroupVisibility(e), this.pushStateToURL({ replace: !0 });
  }
  /**
   * Update visibility of child rows for a group
   */
  updateGroupVisibility(e) {
    const t = this.tableEl?.querySelector("tbody");
    if (!t) return;
    const r = t.querySelector(`tr[data-group-id="${e}"]`);
    if (!r) return;
    const s = this.state.expandedGroups.has(e);
    r.dataset.expanded = String(s), r.setAttribute("aria-expanded", String(s));
    const i = r.querySelector(".expand-icon");
    i && (i.textContent = s ? "▼" : "▶"), t.querySelectorAll(`tr.group-child-row[data-group-id="${e}"]`).forEach((a) => {
      a.style.display = s ? "" : "none";
    });
  }
  /**
   * Set view mode (flat, grouped, matrix) - Phase 2
   */
  setViewMode(e) {
    if (!this.config.enableGroupedMode) {
      console.warn("[DataGrid] Grouped mode not enabled");
      return;
    }
    const t = vr(e);
    this.state.viewMode = t;
    const r = this.config.panelId || this.config.tableId;
    yr(r, t), this.pushStateToURL(), this.refresh();
  }
  /**
   * Get current view mode
   */
  getViewMode() {
    return this.state.viewMode;
  }
  /**
   * Get grouped data (if available)
   */
  getGroupedData() {
    return this.state.groupedData;
  }
  /**
   * Fetch a detail payload and unwrap the record from the `data` field.
   */
  async fetchDetail(e) {
    const t = await fetch(`${this.config.apiEndpoint}/${e}`, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!t.ok)
      throw new Error(`Detail request failed: ${t.status}`);
    const r = await t.json(), s = this.normalizeDetailResponse(r);
    return s.schema && (this.lastSchema = s.schema), s.form && (this.lastForm = s.form), {
      ...s,
      tabs: s.schema?.tabs || []
    };
  }
  /**
   * Access the most recent schema returned by the API (list or detail).
   */
  getSchema() {
    return this.lastSchema;
  }
  /**
   * Access the most recent form returned by the API (list or detail).
   */
  getForm() {
    return this.lastForm;
  }
  /**
   * Access tabs from the most recent schema payload.
   */
  getTabs() {
    return this.lastSchema?.tabs || [];
  }
  normalizeDetailResponse(e) {
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
  resolveRendererOptions(e) {
    const t = e.rendererOptions ?? e.renderer_options;
    return !t || typeof t != "object" || Array.isArray(t) ? {} : t;
  }
  /**
   * Create table row element
   */
  createTableRow(e) {
    const t = document.createElement("tr");
    let r = ["hover:bg-gray-50"];
    this.config.rowClassProvider && (r = r.concat(this.config.rowClassProvider(e))), t.className = r.join(" ");
    const s = document.createElement("td");
    s.className = "px-6 py-4 whitespace-nowrap", s.dataset.role = "selection", s.dataset.fixed = "left", s.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${e.id}">
        <span class="sr-only">Select</span>
      </label>
    `, t.appendChild(s), this.config.columns.forEach((a) => {
      const l = document.createElement("td");
      l.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800", l.setAttribute("data-column", a.field);
      const c = e[a.field], d = typeof a.renderer == "string" ? a.renderer.trim() : "", u = {
        options: this.resolveRendererOptions(a)
      };
      if (a.render)
        l.innerHTML = a.render(c, e);
      else if (this.cellRendererRegistry.has(a.field)) {
        const h = this.cellRendererRegistry.get(a.field);
        l.innerHTML = h(c, e, a.field, u);
      } else if (d && this.cellRendererRegistry.has(d)) {
        const h = this.cellRendererRegistry.get(d);
        l.innerHTML = h(c, e, a.field, u);
      } else c == null ? l.textContent = "-" : a.field.includes("_at") ? l.textContent = new Date(c).toLocaleDateString() : l.textContent = String(c);
      t.appendChild(l);
    });
    const i = this.config.actionBasePath || this.config.apiEndpoint, o = document.createElement("td");
    if (o.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", o.dataset.role = "actions", o.dataset.fixed = "right", this.config.rowActions) {
      const a = this.config.rowActions(e);
      o.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = o.querySelector(`[data-action-id="${c}"]`);
        l.disabled || d && d.addEventListener("click", async (u) => {
          if (u.preventDefault(), !d.disabled)
            try {
              await l.action(e);
            } catch (h) {
              console.error(`Action "${l.label}" failed:`, h);
              const p = h instanceof Error ? h.message : `Action "${l.label}" failed`;
              this.notify(p, "error");
            }
        });
      });
    } else if (this.config.useDefaultActions !== !1) {
      const a = [
        {
          label: "View",
          icon: "eye",
          action: () => {
            window.location.href = `${i}/${e.id}`;
          },
          variant: "secondary"
        },
        {
          label: "Edit",
          icon: "edit",
          action: () => {
            window.location.href = `${i}/${e.id}/edit`;
          },
          variant: "primary"
        },
        {
          label: "Delete",
          icon: "trash",
          action: async () => {
            await this.handleDelete(e.id);
          },
          variant: "danger"
        }
      ];
      o.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = o.querySelector(`[data-action-id="${c}"]`);
        d && d.addEventListener("click", async (u) => {
          if (u.preventDefault(), u.stopPropagation(), !d.disabled)
            try {
              await l.action();
            } catch (h) {
              console.error(`Action "${l.label}" failed:`, h);
              const p = h instanceof Error ? h.message : `Action "${l.label}" failed`;
              this.notify(p, "error");
            }
        });
      });
    }
    return t.appendChild(o), t;
  }
  /**
   * Sanitize action label to create a valid ID
   */
  sanitizeActionId(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
  /**
   * Handle delete action
   */
  async handleDelete(e) {
    if (await this.confirmAction("Are you sure you want to delete this item?"))
      try {
        if (!(await fetch(`${this.config.apiEndpoint}/${e}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json"
          }
        })).ok)
          throw new Error("Delete failed");
        await this.refresh();
      } catch (r) {
        console.error("Error deleting item:", r), this.showError("Failed to delete item");
      }
  }
  /**
   * Update pagination UI
   */
  updatePaginationUI(e) {
    const t = this.getResponseTotal(e) ?? this.state.totalRows, r = this.state.perPage * (this.state.currentPage - 1), s = t === 0 ? 0 : r + 1, i = Math.min(r + this.state.perPage, t), o = document.querySelector(this.selectors.tableInfoStart), a = document.querySelector(this.selectors.tableInfoEnd), l = document.querySelector(this.selectors.tableInfoTotal);
    o && (o.textContent = String(s)), a && (a.textContent = String(i)), l && (l.textContent = String(t)), this.renderPaginationButtons(t);
  }
  /**
   * Render pagination buttons
   */
  renderPaginationButtons(e) {
    const t = document.querySelector(this.selectors.paginationContainer);
    if (!t) return;
    const r = Math.ceil(e / this.state.perPage);
    if (r <= 1) {
      t.innerHTML = "";
      return;
    }
    const s = [], i = this.state.currentPage;
    s.push(`
      <button type="button"
              data-page="${i - 1}"
              ${i === 1 ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span>Previous</span>
      </button>
    `);
    const o = 5;
    let a = Math.max(1, i - Math.floor(o / 2)), l = Math.min(r, a + o - 1);
    l - a < o - 1 && (a = Math.max(1, l - o + 1));
    for (let c = a; c <= l; c++) {
      const d = c === i;
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
              data-page="${i + 1}"
              ${i === r ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), t.innerHTML = s.join(""), t.querySelectorAll("[data-page]").forEach((c) => {
      c.addEventListener("click", async () => {
        const d = parseInt(c.dataset.page || "1", 10);
        d >= 1 && d <= r && (this.state.currentPage = d, this.pushStateToURL(), this.config.behaviors?.pagination ? await this.config.behaviors.pagination.onPageChange(d, this) : await this.refresh());
      });
    });
  }
  /**
   * Bind search input
   */
  bindSearchInput() {
    const e = document.querySelector(this.selectors.searchInput);
    if (!e) {
      console.warn(`[DataGrid] Search input not found: ${this.selectors.searchInput}`);
      return;
    }
    console.log(`[DataGrid] Search input bound to: ${this.selectors.searchInput}`);
    const t = document.getElementById("clear-search-btn"), r = () => {
      t && (e.value.trim() ? t.classList.remove("hidden") : t.classList.add("hidden"));
    };
    e.addEventListener("input", () => {
      r(), this.searchTimeout && clearTimeout(this.searchTimeout), this.searchTimeout = window.setTimeout(async () => {
        console.log(`[DataGrid] Search triggered: "${e.value}"`), this.state.search = e.value, this.pushStateToURL(), this.config.behaviors?.search ? await this.config.behaviors.search.onSearch(e.value, this) : (this.resetPagination(), await this.refresh());
      }, this.config.searchDelay);
    }), t && t.addEventListener("click", async () => {
      e.value = "", e.focus(), r(), this.state.search = "", this.pushStateToURL(), this.config.behaviors?.search ? await this.config.behaviors.search.onSearch("", this) : (this.resetPagination(), await this.refresh());
    }), r();
  }
  /**
   * Bind per-page select
   */
  bindPerPageSelect() {
    const e = document.querySelector(this.selectors.perPageSelect);
    e && e.addEventListener("change", async () => {
      this.state.perPage = parseInt(e.value, 10), this.resetPagination(), this.pushStateToURL(), await this.refresh();
    });
  }
  /**
   * Bind filter inputs
   */
  bindFilterInputs() {
    document.querySelectorAll(this.selectors.filterRow).forEach((t) => {
      const r = async () => {
        const s = t.dataset.filterColumn, i = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", o = t instanceof HTMLSelectElement ? "eq" : i === "" || i === "text" || i === "search" || i === "email" || i === "tel" || i === "url" ? "ilike" : "eq", a = t.dataset.filterOperator || o, l = t.value;
        if (!s) return;
        const c = this.state.filters.findIndex((d) => d.column === s);
        if (l) {
          const d = { column: s, operator: a, value: l };
          c >= 0 ? this.state.filters[c] = d : this.state.filters.push(d);
        } else
          c >= 0 && this.state.filters.splice(c, 1);
        this.pushStateToURL(), this.config.behaviors?.filter ? await this.config.behaviors.filter.onFilterChange(s, l, this) : (this.resetPagination(), await this.refresh());
      };
      t.addEventListener("input", r), t.addEventListener("change", r);
    });
  }
  /**
   * Bind column visibility toggle using ColumnManager
   */
  bindColumnVisibility() {
    const e = document.querySelector(this.selectors.columnToggleBtn), t = document.querySelector(this.selectors.columnToggleMenu);
    !e || !t || (this.columnManager = new vs({
      container: t,
      grid: this,
      onToggle: (r, s) => {
        console.log(`[DataGrid] Column ${r} visibility toggled to ${s}`);
      },
      onReorder: (r) => {
        console.log("[DataGrid] Columns reordered:", r);
      }
    }));
  }
  /**
   * Bind export buttons
   */
  bindExportButtons() {
    const e = document.querySelector(this.selectors.exportMenu);
    if (!e) return;
    const t = e.querySelectorAll("[data-export-format]");
    t.forEach((r) => {
      r.addEventListener("click", async () => {
        const s = r.dataset.exportFormat;
        if (!s || !this.config.behaviors?.export) return;
        const i = this.config.behaviors.export.getConcurrency?.() || "single", o = [];
        i === "single" ? t.forEach((d) => o.push(d)) : i === "per-format" && o.push(r);
        const a = (d) => {
          const u = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
          u && u.classList.add("hidden"), h && h.classList.remove("hidden");
        }, l = (d) => {
          const u = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
          u && u.classList.remove("hidden"), h && h.classList.add("hidden");
        };
        o.forEach((d) => {
          d.setAttribute("data-export-loading", "true"), d.disabled = !0, a(d);
        });
        const c = i === "none";
        c && (r.setAttribute("data-export-loading", "true"), a(r));
        try {
          await this.config.behaviors.export.export(s, this);
        } catch (d) {
          console.error("[DataGrid] Export failed:", d);
        } finally {
          o.forEach((d) => {
            d.removeAttribute("data-export-loading"), d.disabled = !1, l(d);
          }), c && (r.removeAttribute("data-export-loading"), l(r));
        }
      });
    });
  }
  /**
   * Bind table sorting
   */
  bindSorting() {
    if (!this.tableEl) return;
    this.tableEl.querySelectorAll("[data-sort-column]").forEach((r) => {
      r.addEventListener("click", async (s) => {
        s.preventDefault(), s.stopPropagation();
        const i = r.dataset.sortColumn;
        if (!i) return;
        console.log(`[DataGrid] Sort button clicked for field: ${i}`);
        const o = this.state.sort.find((l) => l.field === i);
        let a = null;
        o ? o.direction === "asc" ? (a = "desc", o.direction = a) : (this.state.sort = this.state.sort.filter((l) => l.field !== i), a = null, console.log(`[DataGrid] Sort cleared for field: ${i}`)) : (a = "asc", this.state.sort = [{ field: i, direction: a }]), console.log("[DataGrid] New sort state:", this.state.sort), this.pushStateToURL(), a !== null && this.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await this.config.behaviors.sort.onSort(i, a, this)) : (console.log("[DataGrid] Calling refresh() for sort"), await this.refresh()), console.log("[DataGrid] Updating sort indicators"), this.updateSortIndicators();
      });
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      r.addEventListener("click", async () => {
        const s = r.dataset.sort;
        if (!s) return;
        const i = this.state.sort.find((a) => a.field === s);
        let o = null;
        i ? i.direction === "asc" ? (o = "desc", i.direction = o) : (this.state.sort = this.state.sort.filter((a) => a.field !== s), o = null) : (o = "asc", this.state.sort = [{ field: s, direction: o }]), this.pushStateToURL(), o !== null && this.config.behaviors?.sort ? await this.config.behaviors.sort.onSort(s, o, this) : await this.refresh(), this.updateSortIndicators();
      });
    });
  }
  /**
   * Update sort indicators in table headers
   */
  updateSortIndicators() {
    if (!this.tableEl) return;
    this.tableEl.querySelectorAll("[data-sort-column]").forEach((r) => {
      const s = r.dataset.sortColumn;
      if (!s) return;
      const i = this.state.sort.find((a) => a.field === s), o = r.querySelector("svg");
      o && (i ? (r.classList.remove("opacity-0"), r.classList.add("opacity-100"), i.direction === "asc" ? (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', o.classList.add("text-blue-600"), o.classList.remove("text-gray-400")) : (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', o.classList.add("text-blue-600"), o.classList.remove("text-gray-400"))) : (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', o.classList.remove("text-blue-600"), o.classList.add("text-gray-400")));
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      const s = r.dataset.sort, i = this.state.sort.find((a) => a.field === s), o = r.querySelector(".sort-indicator");
      o && (o.textContent = i ? i.direction === "asc" ? "↑" : "↓" : "");
    });
  }
  /**
   * Bind selection checkboxes
   */
  bindSelection() {
    const e = document.querySelector(this.selectors.selectAllCheckbox);
    e && e.addEventListener("change", () => {
      document.querySelectorAll(this.selectors.rowCheckboxes).forEach((r) => {
        r.checked = e.checked;
        const s = r.dataset.id;
        s && (e.checked ? this.state.selectedRows.add(s) : this.state.selectedRows.delete(s));
      }), this.updateBulkActionsBar();
    }), this.updateSelectionBindings();
  }
  /**
   * Update selection bindings after rendering
   * This syncs checkbox states with the selectedRows Set
   */
  updateSelectionBindings() {
    document.querySelectorAll(this.selectors.rowCheckboxes).forEach((t) => {
      const r = t.dataset.id;
      r && (t.checked = this.state.selectedRows.has(r)), t.addEventListener("change", () => {
        r && (t.checked ? this.state.selectedRows.add(r) : this.state.selectedRows.delete(r)), this.updateBulkActionsBar();
      });
    });
  }
  /**
   * Bind bulk action buttons
   */
  bindBulkActions() {
    const t = document.getElementById("bulk-actions-overlay")?.dataset?.bulkBase || "";
    document.querySelectorAll("[data-bulk-action]").forEach((i) => {
      i.addEventListener("click", async () => {
        const o = i, a = o.dataset.bulkAction;
        if (!a) return;
        const l = Array.from(this.state.selectedRows);
        if (l.length === 0) {
          this.notify("Please select items first", "warning");
          return;
        }
        if (this.config.bulkActions) {
          const c = this.config.bulkActions.find((d) => d.id === a);
          if (c) {
            try {
              await this.actionRenderer.executeBulkAction(c, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
            } catch (d) {
              console.error("Bulk action failed:", d), this.showError("Bulk action failed");
            }
            return;
          }
        }
        if (t) {
          const c = `${t}/${a}`, d = o.dataset.bulkConfirm, u = this.parseDatasetStringArray(o.dataset.bulkPayloadRequired), h = this.parseDatasetObject(o.dataset.bulkPayloadSchema), p = {
            id: a,
            label: o.textContent?.trim() || a,
            endpoint: c,
            confirm: d,
            payloadRequired: u,
            payloadSchema: h
          };
          try {
            await this.actionRenderer.executeBulkAction(p, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
          } catch (f) {
            console.error("Bulk action failed:", f), this.showError("Bulk action failed");
          }
          return;
        }
        if (this.config.behaviors?.bulkActions)
          try {
            await this.config.behaviors.bulkActions.execute(a, l, this), this.state.selectedRows.clear(), this.updateBulkActionsBar();
          } catch (c) {
            console.error("Bulk action failed:", c), this.showError("Bulk action failed");
          }
      });
    });
    const s = document.getElementById("clear-selection-btn");
    s && s.addEventListener("click", () => {
      this.state.selectedRows.clear(), this.updateBulkActionsBar(), document.querySelectorAll(".table-checkbox").forEach((a) => a.checked = !1);
      const o = document.querySelector(this.selectors.selectAllCheckbox);
      o && (o.checked = !1);
    }), this.bindOverflowMenu();
  }
  /**
   * Bind overflow menu toggle (three-dot "More" button)
   */
  bindOverflowMenu() {
    const e = document.getElementById("bulk-more-btn"), t = document.getElementById("bulk-overflow-menu");
    !e || !t || (e.addEventListener("click", (r) => {
      r.stopPropagation(), t.classList.toggle("hidden");
    }), document.addEventListener("click", () => {
      t.classList.add("hidden");
    }), document.addEventListener("keydown", (r) => {
      r.key === "Escape" && t.classList.add("hidden");
    }), t.addEventListener("click", (r) => {
      r.stopPropagation();
    }));
  }
  /**
   * Update bulk actions bar visibility with animation
   */
  updateBulkActionsBar() {
    const e = document.getElementById("bulk-actions-overlay"), t = document.getElementById("selected-count"), r = this.state.selectedRows.size;
    if (console.log("[DataGrid] updateBulkActionsBar - overlay:", e, "countEl:", t, "count:", r), !e || !t) {
      console.error("[DataGrid] Missing bulk actions elements!");
      return;
    }
    t.textContent = String(r), r > 0 ? (e.classList.remove("hidden"), e.offsetHeight) : e.classList.add("hidden");
  }
  /**
   * Bind clear selection button
   */
  bindBulkClearButton() {
    const e = document.getElementById("bulk-clear-selection");
    console.log("[DataGrid] Binding clear button:", e), e ? e.addEventListener("click", () => {
      console.log("[DataGrid] Clear button clicked!"), this.clearSelection();
    }) : console.error("[DataGrid] Clear button not found!");
  }
  /**
   * Clear all selections
   */
  clearSelection() {
    console.log("[DataGrid] Clearing selection..."), this.state.selectedRows.clear();
    const e = document.querySelector(this.selectors.selectAllCheckbox);
    e && (e.checked = !1), this.updateBulkActionsBar(), this.updateSelectionBindings();
  }
  /**
   * Position dropdown menu intelligently based on available space
   */
  positionDropdownMenu(e, t) {
    const r = e.getBoundingClientRect(), s = t.offsetHeight || 300, o = window.innerHeight - r.bottom, a = r.top, l = o < s && a > o, c = r.right - (t.offsetWidth || 224);
    t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${r.top - s - 8}px`, t.style.bottom = "auto") : (t.style.top = `${r.bottom + 8}px`, t.style.bottom = "auto");
  }
  /**
   * Bind dropdown toggles
   */
  bindDropdownToggles() {
    this.dropdownAbortController && this.dropdownAbortController.abort(), this.dropdownAbortController = new AbortController();
    const { signal: e } = this.dropdownAbortController;
    document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
      const r = t.dataset.dropdownToggle, s = document.getElementById(r || "");
      s && !s.classList.contains("hidden") && s.classList.add("hidden");
    }), document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
      t.addEventListener("click", (r) => {
        r.stopPropagation();
        const s = t.dataset.dropdownToggle, i = document.getElementById(s || "");
        i && (i.classList.contains("hidden"), document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
          const a = o.dataset.dropdownToggle, l = document.getElementById(a || "");
          l && l !== i && l.classList.add("hidden");
        }), i.classList.toggle("hidden"));
      }, { signal: e });
    }), document.addEventListener("click", (t) => {
      const r = t.target.closest("[data-dropdown-trigger]");
      if (r) {
        t.stopPropagation();
        const i = r.closest("[data-dropdown]")?.querySelector(".actions-menu");
        document.querySelectorAll(".actions-menu").forEach((a) => {
          a !== i && a.classList.add("hidden");
        });
        const o = i?.classList.contains("hidden");
        i?.classList.toggle("hidden"), r.setAttribute("aria-expanded", o ? "true" : "false"), o && i && this.positionDropdownMenu(r, i);
      } else
        t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
          (i) => i.classList.add("hidden")
        ), document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
          const o = i.dataset.dropdownToggle, a = document.getElementById(o || "");
          a && a.classList.add("hidden");
        }));
    }, { signal: e }), document.addEventListener("keydown", (t) => {
      t.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((r) => {
        r.classList.add("hidden");
        const s = r.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
        s && s.setAttribute("aria-expanded", "false");
      }), document.querySelectorAll("[data-dropdown-toggle]").forEach((r) => {
        const s = r.dataset.dropdownToggle, i = document.getElementById(s || "");
        i && i.classList.add("hidden");
      }));
    }, { signal: e });
  }
  /**
   * Show error message using notifier
   */
  showError(e) {
    console.error(e), this.notifier.error(e);
  }
  /**
   * Show notification using notifier
   */
  notify(e, t) {
    this.notifier.show({ message: e, type: t });
  }
  /**
   * Show confirmation dialog using notifier
   */
  async confirmAction(e) {
    return this.notifier.confirm(e);
  }
  /**
   * Extract error message from Response or Error
   */
  async extractError(e) {
    return e instanceof Response ? Lr(e) : e instanceof Error ? e.message : "An unexpected error occurred";
  }
  parseDatasetStringArray(e) {
    if (e)
      try {
        const t = JSON.parse(e);
        if (!Array.isArray(t))
          return;
        const r = t.map((s) => typeof s == "string" ? s.trim() : "").filter((s) => s.length > 0);
        return r.length > 0 ? r : void 0;
      } catch (t) {
        console.warn("[DataGrid] Failed to parse bulk payload_required:", t);
        return;
      }
  }
  parseDatasetObject(e) {
    if (e)
      try {
        const t = JSON.parse(e);
        return !t || typeof t != "object" || Array.isArray(t) ? void 0 : t;
      } catch (t) {
        console.warn("[DataGrid] Failed to parse bulk payload_schema:", t);
        return;
      }
  }
  /**
   * Reorder columns based on the provided order array
   * Updates config.columns order and triggers DOM reordering
   * Note: Column order is NOT pushed to URL by default (per guiding notes)
   */
  reorderColumns(e) {
    if (!this.tableEl) return;
    const t = this.mergeColumnOrder(e);
    this.state.columnOrder = t;
    const r = new Map(this.config.columns.map((s) => [s.field, s]));
    this.config.columns = t.map((s) => r.get(s)).filter((s) => s !== void 0), this.reorderTableColumns(t), console.log("[DataGrid] Columns reordered:", t);
  }
  /**
   * Reset columns to their initial/default order and visibility.
   * Intended to be called by ColumnManager's "Reset to Default" action.
   */
  resetColumnsToDefault() {
    this.config.behaviors?.columnVisibility?.clearSavedPrefs?.(), this.config.columns = this.defaultColumns.map((t) => ({ ...t })), this.state.columnOrder = this.config.columns.map((t) => t.field);
    const e = this.config.columns.filter((t) => !t.hidden).map((t) => t.field);
    this.tableEl ? (this.reorderTableColumns(this.state.columnOrder), this.updateColumnVisibility(e)) : this.state.hiddenColumns = new Set(
      this.config.columns.filter((t) => t.hidden).map((t) => t.field)
    ), this.columnManager && (this.columnManager.refresh(), this.columnManager.syncWithGridState()), console.log("[DataGrid] Columns reset to default");
  }
  /**
   * Merge and validate saved column order with current columns
   * - Drops columns that no longer exist
   * - Appends new columns that aren't in saved order
   */
  mergeColumnOrder(e) {
    const t = new Set(this.config.columns.map((o) => o.field)), r = new Set(e), s = e.filter((o) => t.has(o)), i = this.config.columns.map((o) => o.field).filter((o) => !r.has(o));
    return [...s, ...i];
  }
  /**
   * Reorder table DOM elements (header, filter row, body rows)
   * Moves existing nodes rather than recreating them to preserve event listeners
   */
  reorderTableColumns(e) {
    if (!this.tableEl) return;
    const t = this.tableEl.querySelector("thead tr:first-child");
    t && this.reorderRowCells(t, e, "th");
    const r = this.tableEl.querySelector("#filter-row");
    r && this.reorderRowCells(r, e, "th"), this.tableEl.querySelectorAll("tbody tr").forEach((i) => {
      this.reorderRowCells(i, e, "td");
    });
  }
  /**
   * Reorder cells within a single row
   * Preserves fixed columns (selection on left, actions on right)
   */
  reorderRowCells(e, t, r) {
    const s = Array.from(e.querySelectorAll(`${r}[data-column]`)), i = new Map(
      s.map((d) => [d.dataset.column, d])
    ), o = Array.from(e.querySelectorAll(r)), a = e.querySelector(`${r}[data-role="selection"]`) || o.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${r}[data-role="actions"]`) || o.find(
      (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
    ), c = [];
    a && c.push(a), t.forEach((d) => {
      const u = i.get(d);
      u && c.push(u);
    }), l && c.push(l), c.forEach((d) => {
      e.appendChild(d);
    });
  }
  /**
   * Cleanup and destroy the DataGrid instance
   * Call this when removing the grid from the DOM to prevent memory leaks
   */
  destroy() {
    this.columnManager && (this.columnManager.destroy(), this.columnManager = null), this.dropdownAbortController && (this.dropdownAbortController.abort(), this.dropdownAbortController = null), this.abortController && (this.abortController.abort(), this.abortController = null), this.searchTimeout && (clearTimeout(this.searchTimeout), this.searchTimeout = null), console.log("[DataGrid] Instance destroyed");
  }
};
x.URL_KEY_SEARCH = "search", x.URL_KEY_PAGE = "page", x.URL_KEY_PER_PAGE = "perPage", x.URL_KEY_FILTERS = "filters", x.URL_KEY_SORT = "sort", x.URL_KEY_HIDDEN_COLUMNS = "hiddenColumns", x.URL_KEY_VIEW_MODE = "view_mode", x.URL_KEY_EXPANDED_GROUPS = "expanded_groups", x.MANAGED_URL_KEYS = [
  x.URL_KEY_SEARCH,
  x.URL_KEY_PAGE,
  x.URL_KEY_PER_PAGE,
  x.URL_KEY_FILTERS,
  x.URL_KEY_SORT,
  x.URL_KEY_HIDDEN_COLUMNS,
  x.URL_KEY_VIEW_MODE,
  x.URL_KEY_EXPANDED_GROUPS
];
let Gt = x;
typeof window < "u" && (window.DataGrid = Gt);
const wr = {
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
class oa {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new Ve();
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
        const r = JSON.parse(t);
        this.criteria = r.map((s) => ({
          field: s.column,
          operator: s.operator || "ilike",
          value: s.value,
          logic: "and"
          // Default logic connector
        })), console.log("[AdvancedSearch] Restored criteria from URL:", this.criteria);
      } catch (r) {
        console.warn("[AdvancedSearch] Failed to parse filters from URL:", r);
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
    const t = document.getElementById("advanced-search-close"), r = document.getElementById("advanced-search-cancel"), s = document.getElementById("advanced-search-overlay");
    t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), s?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
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
      const r = document.createElement("div"), s = this.createCriterionRow(e, t);
      if (r.appendChild(s), t < this.criteria.length - 1) {
        const i = this.createLogicConnector(t);
        r.appendChild(i);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const s = this.config.fields.find((i) => i.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((i) => `
          <option value="${i.name}" ${i.name === e.field ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(s).map((i) => `
          <option value="${i.value}" ${i.value === e.operator ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(s, e, t)}

      <button type="button" data-criterion-index="${t}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `, r.querySelectorAll("select, input").forEach((i) => {
      i.addEventListener("change", (o) => this.updateCriterion(o.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((i) => `
            <option value="${i.value}" ${i.value === t.value ? "selected" : ""}>${i.label}</option>
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
    `, t.querySelectorAll("[data-logic-index]").forEach((s) => {
      s.addEventListener("click", (i) => {
        const o = i.target, a = parseInt(o.dataset.logicIndex || "0", 10), l = o.dataset.logicValue;
        this.criteria[a].logic = l, this.renderCriteria();
      });
    }), t;
  }
  updateCriterion(e) {
    const t = parseInt(e.dataset.criterionIndex || "0", 10), r = e.dataset.criterionPart;
    if (!this.criteria[t]) return;
    const s = e.value;
    r === "field" ? (this.criteria[t].field = s, this.renderCriteria()) : r === "operator" ? this.criteria[t].operator = s : r === "value" && (this.criteria[t].value = s);
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : wr[e.type] || wr.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new or({
      title: "Save Search Preset",
      label: "Preset name",
      placeholder: "e.g. Active users filter",
      confirmLabel: "Save",
      onConfirm: (t) => {
        const r = this.loadPresetsFromStorage();
        r[t] = this.criteria, localStorage.setItem("search_presets", JSON.stringify(r)), this.notifier.success(`Preset "${t}" saved!`);
      }
    }).show();
  }
  loadPreset() {
    const e = this.loadPresetsFromStorage(), t = Object.keys(e);
    if (t.length === 0) {
      this.notifier.warning("No saved presets found.");
      return;
    }
    new or({
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
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), r = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), r && r.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((s, i) => {
        const o = this.createChip(s, i);
        e.appendChild(o);
      });
    }
  }
  /**
   * Create a single filter chip
   */
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200";
    const i = this.config.fields.find((l) => l.name === e.field)?.label || e.field, o = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    r.innerHTML = `
      <span>${i} ${o} "${e.value}"</span>
      <button type="button"
              data-chip-index="${t}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
    const a = r.querySelector("[data-chip-index]");
    return a && a.addEventListener("click", () => {
      this.removeChip(t);
    }), r;
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
const xr = {
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
class aa {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new Ve(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    const e = document.getElementById("add-group-btn"), t = document.getElementById("apply-filter-btn"), r = document.getElementById("clear-all-btn"), s = document.getElementById("save-filter-btn");
    e && e.addEventListener("click", () => this.addGroup()), t && t.addEventListener("click", () => this.applyFilters()), r && r.addEventListener("click", () => this.clearAll()), s && s.addEventListener("click", () => this.saveFilter());
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
        const s = this.createGroupConnector(t);
        this.container.appendChild(s);
      }
    }), this.updatePreview());
  }
  createGroupElement(e, t) {
    const r = document.createElement("div");
    r.className = "border border-gray-200 rounded-lg p-3 bg-gray-50";
    const s = document.createElement("div");
    s.className = "flex justify-end mb-2", s.innerHTML = `
      <button type="button" data-remove-group="${t}" class="text-xs text-red-600 hover:text-red-800">
        Remove group
      </button>
    `, r.appendChild(s), e.conditions.forEach((o, a) => {
      const l = this.createConditionElement(o, t, a);
      if (r.appendChild(l), a < e.conditions.length - 1) {
        const c = this.createConditionConnector(t, a, e.logic);
        r.appendChild(c);
      }
    });
    const i = document.createElement("button");
    return i.type = "button", i.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", i.dataset.addCondition = String(t), i.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, r.appendChild(i), this.bindGroupEvents(r, t), r;
  }
  createConditionElement(e, t, r) {
    const s = document.createElement("div");
    s.className = "flex items-center gap-2 mb-2";
    const i = this.config.fields.find((o) => o.name === e.field) || this.config.fields[0];
    return s.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${r}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((o) => `
          <option value="${o.name}" ${o.name === e.field ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${r}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(i).map((o) => `
          <option value="${o.value}" ${o.value === e.operator ? "selected" : ""}>${o.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(i, e, t, r)}

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
    `, s;
  }
  renderValueInput(e, t, r, s) {
    return e.type === "select" && e.options ? `
        <select data-cond="${r}-${s}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${e.options.map((o) => `
            <option value="${o.value}" ${o.value === t.value ? "selected" : ""}>${o.label}</option>
          `).join("")}
        </select>
      ` : `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}"
             data-cond="${r}-${s}-value"
             value="${t.value || ""}"
             placeholder="Enter value..."
             class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  createConditionConnector(e, t, r) {
    const s = document.createElement("div");
    return s.className = "flex items-center justify-center my-1", s.innerHTML = `
      <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">
        ${r.toUpperCase()}
      </span>
    `, s;
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
    `, t.querySelectorAll("[data-group-logic]").forEach((s) => {
      s.addEventListener("click", (i) => {
        const o = i.target, a = parseInt(o.dataset.groupLogic || "0", 10), l = o.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const s = e.querySelector(`[data-add-condition="${t}"]`);
    s && s.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((i) => {
      const o = i, [a, l, c] = o.dataset.cond.split("-"), d = parseInt(a, 10), u = parseInt(l, 10);
      o.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[u].field = o.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[u].operator = o.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[u].value = o.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((i) => {
      i.addEventListener("click", (o) => {
        const l = o.target.closest("[data-remove-cond]");
        if (!l) return;
        const [c, d] = l.dataset.removeCond.split("-").map(Number);
        this.removeCondition(c, d);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((i) => {
      i.addEventListener("click", (o) => {
        const a = o.target, l = a.dataset.addCondOr !== void 0, c = l ? a.dataset.addCondOr : a.dataset.addCondAnd;
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
    const r = this.structure.groups[e];
    r.conditions.splice(t, 1), r.conditions.length === 0 ? this.removeGroup(e) : this.render();
  }
  removeGroup(e) {
    this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.length > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 ? this.addGroup() : this.render();
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : xr[e.type] || xr.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || "No filters applied"), this.previewElement && (this.previewElement.textContent = t);
    const r = document.getElementById("applied-filter-preview");
    r && (this.hasActiveFilters() ? r.classList.remove("hidden") : r.classList.add("hidden"));
  }
  hasActiveFilters() {
    return this.structure.groups.some(
      (e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0)
    );
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((s) => s.value !== "" && s.value !== null).map((s) => {
        const i = s.operator.toUpperCase(), o = typeof s.value == "string" ? `'${s.value}'` : s.value;
        return `${s.field} ${i === "ILIKE" ? "ILIKE" : i === "EQ" ? "=" : i} ${o}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, s) => {
      if (s === 0) return r;
      const i = this.structure.groupLogic[s - 1] || "and";
      return `${t} ${i.toUpperCase()} ${r}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((s) => s.value !== "" && s.value !== null).map((s) => {
        const i = this.config.fields.find((l) => l.name === s.field), o = i?.label || s.field, a = this.getOperatorsForField(i).find((l) => l.value === s.operator)?.label || s.operator;
        return `${o} ${a} "${s.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, s) => {
      if (s === 0) return r;
      const i = this.structure.groupLogic[s - 1] || "and";
      return `${t} ${i.toUpperCase()} ${r}`;
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
    const t = new URLSearchParams(window.location.search).get("filters");
    if (t)
      try {
        const r = JSON.parse(t);
        Array.isArray(r) && r.length > 0 && (this.structure = this.convertLegacyFilters(r), this.render());
      } catch (r) {
        console.warn("[FilterBuilder] Failed to parse filters from URL:", r);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((s) => {
      const i = s.column;
      t.has(i) || t.set(i, []), t.get(i).push(s);
    });
    const r = [];
    return t.forEach((s) => {
      r.push({
        conditions: s.map((i) => ({
          field: i.column,
          operator: i.operator || "ilike",
          value: i.value
        })),
        logic: s.length > 1 ? "or" : "and"
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
}
class la {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0)
      throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "")
      return {};
    const t = {}, r = e.trim();
    return this.searchableFields.forEach((s) => {
      t[`${s}__ilike`] = `%${r}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
class ca {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((s) => {
      if (s.value === null || s.value === void 0 || s.value === "")
        return;
      const i = s.operator || "eq", o = s.column;
      r.has(o) || r.set(o, { operator: i, values: [] }), r.get(o).values.push(s.value);
    }), r.forEach((s, i) => {
      if (s.values.length === 1) {
        const o = s.operator === "eq" ? i : `${i}__${s.operator}`;
        t[o] = s.values[0];
      } else
        s.operator === "ilike" ? t[`${i}__ilike`] = s.values.join(",") : s.operator === "eq" ? t[`${i}__in`] = s.values.join(",") : t[`${i}__${s.operator}`] = s.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}
class da {
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
class ua {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class ha {
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
    const r = Gs(t, this.config, e);
    r.delivery = Vs(this.config, e);
    let s;
    try {
      s = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json,application/octet-stream"
        },
        body: JSON.stringify(r)
      });
    } catch (i) {
      const o = i instanceof Error ? i.message : "Network error during export";
      throw we(t, "error", o), i;
    }
    if (s.status === 202) {
      const i = await s.json().catch(() => ({}));
      we(t, "info", "Export queued. You can download it when ready.");
      const o = i?.status_url || "";
      if (o) {
        const a = Js(i, o);
        try {
          await Xs(o, {
            intervalMs: Ks(this.config),
            timeoutMs: Ys(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await Vt(l);
            throw we(t, "error", c), new Error(c);
          }
          await Cr(l, r.definition || r.resource || "export", r.format), we(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw we(t, "error", c), l;
        }
      }
      if (i?.download_url) {
        window.open(i.download_url, "_blank");
        return;
      }
      return;
    }
    if (!s.ok) {
      const i = await Vt(s);
      throw we(t, "error", i), new Error(i);
    }
    await Cr(s, r.definition || r.resource || "export", r.format), we(t, "success", "Export ready.");
  }
}
function Gs(n, e, t) {
  const r = si(t), s = Qs(n, e), i = Zs(n, e), o = ei(n), a = ti(o), l = {
    format: r,
    query: a,
    selection: s,
    columns: i,
    delivery: e.delivery || "auto"
  };
  e.definition && (l.definition = e.definition), e.resource && (l.resource = e.resource);
  const c = e.sourceVariant || e.variant;
  return c && (l.source_variant = c), l;
}
function Vs(n, e) {
  return n.delivery ? n.delivery : (n.asyncFormats && n.asyncFormats.length > 0 ? n.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function Ks(n) {
  const e = Number(n.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function Ys(n) {
  const e = Number(n.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function Js(n, e) {
  return n?.download_url ? n.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function Xs(n, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const s = await fetch(n, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!s.ok) {
      const a = await Vt(s);
      throw new Error(a);
    }
    const i = await s.json().catch(() => ({})), o = String(i?.state || "").toLowerCase();
    if (o === "completed")
      return i;
    if (o === "failed")
      throw new Error("Export failed");
    if (o === "canceled")
      throw new Error("Export canceled");
    if (o === "deleted")
      throw new Error("Export deleted");
    if (e.timeoutMs > 0 && Date.now() - t > e.timeoutMs)
      throw new Error("Export status timed out");
    await Ws(r);
  }
}
function Ws(n) {
  return new Promise((e) => setTimeout(e, n));
}
function Qs(n, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(n.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function Zs(n, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = n.state?.hiddenColumns ? new Set(n.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(n.state?.columnOrder) && n.state.columnOrder.length > 0 ? n.state.columnOrder : n.config.columns.map((s) => s.field)).filter((s) => !t.has(s));
}
function ei(n) {
  const e = {}, t = n.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(n.state.currentPage, n.state.perPage)), n.state.search && t.search && Object.assign(e, t.search.buildQuery(n.state.search)), n.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(n.state.filters)), n.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(n.state.sort)), e;
}
function ti(n) {
  const e = {}, t = [];
  return Object.entries(n).forEach(([r, s]) => {
    if (s == null || s === "")
      return;
    switch (r) {
      case "limit":
        e.limit = Sr(s);
        return;
      case "offset":
        e.offset = Sr(s);
        return;
      case "order":
      case "sort":
        e.sort = ni(String(s));
        return;
      case "q":
      case "search":
        e.search = String(s);
        return;
    }
    const { field: i, op: o } = ri(r);
    i && t.push({ field: i, op: o, value: s });
  }), t.length > 0 && (e.filters = t), e;
}
function ri(n) {
  const e = n.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function ni(n) {
  return n ? n.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", s = t[1] || "asc";
    return { field: r, desc: s.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function si(n) {
  const e = String(n || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function Sr(n) {
  const e = Number(n);
  return Number.isFinite(e) ? e : 0;
}
async function Cr(n, e, t) {
  const r = await n.blob(), s = ii(n, e, t), i = URL.createObjectURL(r), o = document.createElement("a");
  o.href = i, o.download = s, o.rel = "noopener", document.body.appendChild(o), o.click(), o.remove(), URL.revokeObjectURL(i);
}
function ii(n, e, t) {
  const r = n.headers.get("content-disposition") || "", s = `${e}.${t}`;
  return oi(r) || s;
}
function oi(n) {
  if (!n) return null;
  const e = n.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = n.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function Vt(n) {
  if ((n.headers.get("content-type") || "").includes("application/json")) {
    const r = await n.json().catch(() => ({}));
    if (r?.error?.message)
      return r.error.message;
    if (r?.message)
      return r.message;
  }
  const t = await n.text().catch(() => "");
  return t || `Export failed (${n.status})`;
}
function we(n, e, t) {
  const r = n.config.notifier;
  if (r && typeof r[e] == "function") {
    r[e](t);
    return;
  }
  const s = window.toastManager;
  if (s && typeof s[e] == "function") {
    s[e](t);
    return;
  }
  e === "error" && alert(t);
}
class pa {
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
    const s = this.getActionEndpoint(e), i = await fetch(s, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids: t })
    });
    if (!i.ok) {
      const o = await i.text();
      throw new Error(`Bulk action '${e}' failed: ${o}`);
    }
    await r.refresh();
  }
}
function ai(n) {
  const e = (n || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function li(n) {
  const e = (n || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function rn(n) {
  return typeof n == "object" && n !== null && "version" in n && n.version === 2;
}
class ci {
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
    const r = !t.state.hiddenColumns.has(e), s = t.config.columns.filter((a) => a.field === e ? !r : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), i = {};
    t.config.columns.forEach((a) => {
      i[a.field] = s.includes(a.field);
    });
    const o = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: i,
      order: o.length > 0 ? o : void 0
    }), t.updateColumnVisibility(s);
  }
  /**
   * Reorder columns and persist to storage
   * Stores both visibility and order in V2 format
   */
  reorderColumns(e, t) {
    const r = {};
    t.config.columns.forEach((s) => {
      r[s.field] = !t.state.hiddenColumns.has(s.field);
    }), this.cachedOrder = e, this.savePrefs({
      version: 2,
      visibility: r,
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
      const r = new Set(e), s = t.order.filter((i) => r.has(i));
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
      const r = new Set(e), s = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([i, o]) => {
        !o && r.has(i) && s.add(i);
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
      if (rn(t))
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
class fa extends ci {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const s = ai(t.basePath), i = li(t.apiBasePath);
    t.preferencesEndpoint ? this.preferencesEndpoint = t.preferencesEndpoint : i ? this.preferencesEndpoint = `${i}/preferences` : s ? this.preferencesEndpoint = `${s}/api/preferences` : this.preferencesEndpoint = "/api/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
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
      const e = await fetch(this.preferencesEndpoint, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });
      if (!e.ok)
        return console.warn("[ServerColumnVisibility] Failed to load server prefs:", e.status), null;
      const r = (await e.json()).records || [];
      if (r.length === 0)
        return console.log("[ServerColumnVisibility] No server preferences found"), null;
      const s = r[0]?.raw;
      if (!s || !s[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const i = s[this.serverPrefsKey];
      return rn(i) ? (this.serverPrefs = i, this.savePrefs(i), console.log("[ServerColumnVisibility] Loaded prefs from server:", i), i) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", i), null);
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
      const r = /* @__PURE__ */ new Set();
      Object.entries(t.visibility).forEach(([o, a]) => {
        a || r.add(o);
      });
      const s = new Set(e), i = (t.order || []).filter((o) => s.has(o));
      return {
        hiddenColumns: r,
        columnOrder: i
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
    const r = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const s = await fetch(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          raw: {
            [this.serverPrefsKey]: r
          }
        })
      });
      if (!s.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", s.status);
        return;
      }
      this.serverPrefs = r, console.log("[ServerColumnVisibility] Synced prefs to server:", r);
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
      const e = await fetch(this.preferencesEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          raw: {
            [this.serverPrefsKey]: null
          }
        })
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
const di = {
  async prompt(n) {
    const { PayloadInputModal: e } = await import("../chunks/payload-modal-2KQOIFny.js");
    return e.prompt(n);
  }
}, Er = {
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
}, ui = 5e3;
class hi {
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
    const r = [];
    let s = 0;
    const i = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const o of t) {
        if (!o.name || !this.shouldIncludeAction(e, o)) continue;
        const a = o.name.toLowerCase();
        if (this.seenActions.has(a)) continue;
        this.seenActions.add(a);
        const l = this.resolveRecordActionState(e, o.name), c = this.buildActionFromSchema(e, o, i, l);
        c && r.push({
          action: c,
          name: o.name,
          order: this.resolveActionOrder(o.name, o.order),
          insertionIndex: s++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, i, s);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, i, s);
    return r.sort((o, a) => o.order !== a.order ? o.order - a.order : o.insertionIndex - a.insertionIndex), r.map((o) => o.action);
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
    const r = e.toLowerCase();
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : Er[r] !== void 0 ? Er[r] : ui;
  }
  /**
   * Build a single action from schema definition
   */
  buildActionFromSchema(e, t, r, s) {
    const i = t.name, o = t.label || t.label_key || i, a = t.variant || "secondary", l = t.icon, c = this.isNavigationAction(t), d = i === "delete";
    return c ? this.applyActionState(
      this.buildNavigationAction(e, t, o, a, l, r),
      s
    ) : d ? this.applyActionState(this.buildDeleteAction(e, o, a, l), s) : this.applyActionState(this.buildPostAction(e, t, o, a, l), s);
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
    const r = Array.isArray(t.context_required) ? t.context_required : [];
    if (r.length === 0)
      return !0;
    for (const s of r) {
      const i = typeof s == "string" ? s.trim() : "";
      if (!i) continue;
      const o = this.resolveRecordContextValue(e, i);
      if (this.isEmptyPayloadValue(o))
        return !1;
    }
    return !0;
  }
  resolveRecordActionState(e, t) {
    const r = e._action_state;
    if (!r || typeof r != "object" || Array.isArray(r))
      return null;
    const s = r[t];
    return !s || typeof s != "object" || Array.isArray(s) ? null : s;
  }
  applyActionState(e, t) {
    if (!t || t.enabled !== !1)
      return e;
    const r = this.disabledReason(t);
    return {
      ...e,
      disabled: !0,
      disabledReason: r
    };
  }
  disabledReason(e) {
    const t = typeof e.reason == "string" ? e.reason.trim() : "";
    if (t)
      return t;
    const r = typeof e.reason_code == "string" ? e.reason_code.trim() : "";
    if (r) {
      const s = gt(r);
      if (s?.message)
        return s.message;
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
    if (!t || t === "all")
      return !0;
    const r = (this.config.actionContext || "row").toLowerCase();
    return t === r;
  }
  resolveRecordContextValue(e, t) {
    const r = t.trim();
    if (!r) return;
    if (!r.includes("."))
      return e[r];
    const s = r.split(".").map((o) => o.trim()).filter(Boolean);
    if (s.length === 0) return;
    let i = e;
    for (const o of s) {
      if (!i || typeof i != "object" || Array.isArray(i))
        return;
      i = i[o];
    }
    return i;
  }
  /**
   * Build navigation action (view, edit, etc.)
   */
  buildNavigationAction(e, t, r, s, i, o) {
    const a = String(e.id || ""), l = this.config.actionBasePath;
    let c;
    return t.href ? c = t.href.replace("{id}", a) : t.name === "edit" ? c = `${l}/${a}/edit` : c = `${l}/${a}`, o && (c += c.includes("?") ? `&${o}` : `?${o}`), {
      id: t.name,
      label: r,
      icon: i || this.getDefaultIcon(t.name),
      variant: s,
      action: () => {
        window.location.href = c;
      }
    };
  }
  /**
   * Build delete action with confirmation
   */
  buildDeleteAction(e, t, r, s) {
    const i = String(e.id || ""), o = this.config.apiEndpoint;
    return {
      id: "delete",
      label: t,
      icon: s || "trash",
      variant: r === "secondary" ? "danger" : r,
      action: async () => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        if (!(await fetch(`${o}/${i}`, {
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
  buildPostAction(e, t, r, s, i) {
    const o = String(e.id || ""), a = t.name, l = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      id: a,
      label: r,
      icon: i || this.getDefaultIcon(a),
      variant: s,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const c = await this.buildActionPayload(e, t);
        c !== null && await this.executePostAction({
          actionName: a,
          endpoint: l,
          payload: c,
          recordId: o
        });
      }
    };
  }
  async executePostAction(e) {
    const t = await Yt(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (Sn(t.error)) {
      const s = Cn(t.error);
      if (s && this.config.onTranslationBlocker) {
        const i = { ...e.payload };
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...s,
          retry: async () => this.executePostAction({
            actionName: e.actionName,
            endpoint: e.endpoint,
            payload: { ...i },
            recordId: e.recordId
          })
        }), { success: !1, error: t.error };
      }
    }
    const r = this.buildActionErrorMessage(e.actionName, t.error);
    throw this.config.onActionError?.(e.actionName, {
      ...t.error,
      message: r
    }), new Error(r);
  }
  /**
   * Handle successful create_translation action:
   * - Show success toast with source locale shortcut
   * - Redirect to new locale edit page
   */
  handleCreateTranslationSuccess(e, t) {
    const r = typeof e.id == "string" ? e.id : String(e.id || ""), s = typeof e.locale == "string" ? e.locale : "";
    if (!r) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const i = this.config.actionBasePath, o = new URLSearchParams();
    s && o.set("locale", s), this.config.environment && o.set("env", this.config.environment);
    const a = o.toString(), l = `${i}/${r}/edit${a ? `?${a}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(s || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, {
      action: {
        label: `View ${c.toUpperCase()}`,
        handler: () => {
          const h = new URLSearchParams();
          h.set("locale", c), this.config.environment && h.set("env", this.config.environment);
          const p = typeof t.id == "string" ? t.id : String(t.id || r);
          window.location.href = `${i}/${p}/edit?${h.toString()}`;
        }
      }
    }) : console.log(`[SchemaActionBuilder] Translation created: ${s}`), window.location.href = l;
  }
  /**
   * Build action payload from record and schema
   */
  async buildActionPayload(e, t) {
    const r = {
      id: e.id
    };
    this.config.locale && (r.locale = this.config.locale), this.config.environment && (r.environment = this.config.environment), this.config.panelName && (r.policy_entity = this.config.panelName);
    const s = this.normalizePayloadSchema(t.payload_schema), i = this.collectRequiredFields(t.payload_required, s);
    if (s?.properties)
      for (const [l, c] of Object.entries(s.properties))
        r[l] === void 0 && c.default !== void 0 && (r[l] = c.default);
    i.includes("idempotency_key") && this.isEmptyPayloadValue(r.idempotency_key) && (r.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const o = i.filter((l) => this.isEmptyPayloadValue(r[l]));
    if (o.length === 0)
      return r;
    const a = await this.promptForPayload(t, o, s, r, e);
    if (a === null)
      return null;
    for (const l of o) {
      const c = s?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        throw new Error(u.error);
      r[l] = u.value;
    }
    return r;
  }
  /**
   * Prompt user for required payload values
   * Uses the lazy payload modal proxy.
   */
  async promptForPayload(e, t, r, s, i) {
    if (t.length === 0)
      return {};
    const o = t.map((l) => {
      const c = r?.properties?.[l];
      return {
        name: l,
        label: c?.title || l,
        description: c?.description,
        value: this.stringifyDefault(s[l] ?? c?.default),
        type: c?.type || "string",
        options: this.buildFieldOptions(l, e.name, c, i)
      };
    });
    return await di.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: o
    });
  }
  /**
   * Build field options from schema property
   */
  buildFieldOptions(e, t, r, s) {
    const i = this.deriveCreateTranslationLocaleOptions(e, t, s, r);
    if (i && i.length > 0)
      return i;
    if (!r)
      return;
    if (r.oneOf)
      return r.oneOf.filter((a) => a && "const" in a).map((a) => ({
        value: this.stringifyDefault(a.const),
        label: a.title || this.stringifyDefault(a.const)
      }));
    if (r.enum)
      return r.enum.map((a) => ({
        value: this.stringifyDefault(a),
        label: this.stringifyDefault(a)
      }));
    const o = this.buildExtensionFieldOptions(r);
    if (o && o.length > 0)
      return o;
  }
  buildExtensionFieldOptions(e) {
    const t = e, r = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(r) || r.length === 0)
      return;
    const s = [];
    for (const i of r) {
      if (typeof i == "string") {
        const d = this.stringifyDefault(i);
        if (!d)
          continue;
        s.push({ value: d, label: d });
        continue;
      }
      if (!i || typeof i != "object")
        continue;
      const o = i.value, a = this.stringifyDefault(o);
      if (!a)
        continue;
      const l = i.label, c = this.stringifyDefault(l) || a;
      s.push({ value: a, label: c });
    }
    return s.length > 0 ? s : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r, s) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object")
      return;
    const i = this.asObject(r.translation_readiness);
    let o = this.asStringArray(i?.missing_required_locales);
    if (o.length === 0 && (o = this.asStringArray(r.missing_locales)), o.length === 0 && i) {
      const f = this.asStringArray(i.required_locales), m = new Set(this.asStringArray(i.available_locales));
      o = f.filter(($) => !m.has($));
    }
    const a = this.asStringArray(s?.enum);
    if (a.length > 0) {
      const f = new Set(a);
      o = o.filter((m) => f.has(m));
    }
    if (o.length === 0)
      return;
    const l = this.extractStringField(r, "recommended_locale") || this.extractStringField(i || {}, "recommended_locale"), c = this.asStringArray(
      r.required_for_publish ?? i?.required_for_publish ?? i?.required_locales
    ), d = this.asStringArray(
      r.existing_locales ?? i?.available_locales
    ), u = this.createTranslationLocaleLabelMap(s), h = /* @__PURE__ */ new Set(), p = [];
    for (const f of o) {
      const m = f.trim().toLowerCase();
      if (!m || h.has(m))
        continue;
      h.add(m);
      const $ = l?.toLowerCase() === m, D = c.includes(m), k = [];
      D && k.push("Required for publishing"), d.length > 0 && k.push(`${d.length} translation${d.length > 1 ? "s" : ""} exist`);
      const O = k.length > 0 ? k.join(" • ") : void 0, T = u[m] || this.localeLabel(m);
      let K = `${m.toUpperCase()} - ${T}`;
      $ && (K += " (recommended)"), p.push({
        value: m,
        label: K,
        description: O,
        recommended: $
      });
    }
    return p.sort((f, m) => f.recommended && !m.recommended ? -1 : !f.recommended && m.recommended ? 1 : f.value.localeCompare(m.value)), p.length > 0 ? p : void 0;
  }
  createTranslationLocaleLabelMap(e) {
    const t = {};
    if (!e)
      return t;
    if (Array.isArray(e.oneOf))
      for (const i of e.oneOf) {
        const o = this.stringifyDefault(i?.const).trim().toLowerCase();
        if (!o)
          continue;
        const a = this.stringifyDefault(i?.title).trim();
        a && (t[o] = a);
      }
    const r = e, s = r["x-options"] ?? r.x_options ?? r.xOptions;
    if (Array.isArray(s))
      for (const i of s) {
        if (!i || typeof i != "object")
          continue;
        const o = this.stringifyDefault(i.value).trim().toLowerCase(), a = this.stringifyDefault(i.label).trim();
        o && a && (t[o] = a);
      }
    return t;
  }
  extractStringField(e, t) {
    const r = e[t];
    return typeof r == "string" && r.trim() ? r.trim() : null;
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
    let r;
    if (t && typeof t == "object" && !Array.isArray(t)) {
      r = {};
      for (const [o, a] of Object.entries(t))
        a && typeof a == "object" && !Array.isArray(a) && (r[o] = a);
    }
    const s = e.required, i = Array.isArray(s) ? s.filter((o) => typeof o == "string").map((o) => o.trim()).filter((o) => o.length > 0) : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: i,
      properties: r
    };
  }
  collectRequiredFields(e, t) {
    const r = [], s = /* @__PURE__ */ new Set(), i = (o) => {
      const a = o.trim();
      !a || s.has(a) || (s.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((o) => i(String(o))), Array.isArray(t?.required) && t.required.forEach((o) => i(String(o))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), s = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), i = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${s || "record"}-${i}`;
  }
  coercePromptValue(e, t, r) {
    const s = typeof e == "string" ? e.trim() : String(e ?? "").trim(), i = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (s.length === 0)
      return { value: s };
    if (i === "number" || i === "integer") {
      const o = Number(s);
      return Number.isFinite(o) ? { value: i === "integer" ? Math.trunc(o) : o } : { value: null, error: `${t} must be a valid number` };
    }
    if (i === "boolean") {
      const o = s.toLowerCase();
      return o === "true" || o === "1" || o === "yes" ? { value: !0 } : o === "false" || o === "0" || o === "no" ? { value: !1 } : { value: null, error: `${t} must be true or false` };
    }
    if (i === "array" || i === "object")
      try {
        return { value: JSON.parse(s) };
      } catch {
        return { value: null, error: `${t} must be valid JSON (${i === "array" ? "[...]" : "{...}"})` };
      }
    return { value: s };
  }
  buildActionErrorMessage(e, t) {
    return En(t, `${e} failed`);
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
  appendDefaultActions(e, t, r) {
    const s = String(t.id || ""), i = this.config.actionBasePath, o = this.config.apiEndpoint, a = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let l = `${i}/${s}`;
            r && (l += `?${r}`), window.location.href = l;
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
            let l = `${i}/${s}/edit`;
            r && (l += `?${r}`), window.location.href = l;
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
            if (!(await fetch(`${o}/${s}`, {
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
  appendDefaultActionsOrdered(e, t, r, s) {
    const i = String(t.id || ""), o = this.config.actionBasePath, a = this.config.apiEndpoint, l = [
      {
        name: "view",
        button: {
          id: "view",
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let d = `${o}/${i}`;
            r && (d += `?${r}`), window.location.href = d;
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
            let d = `${o}/${i}/edit`;
            r && (d += `?${r}`), window.location.href = d;
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
            if (!(await fetch(`${a}/${i}`, {
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
function ga(n, e, t) {
  return new hi(t).buildRowActions(n, e);
}
function ma(n) {
  return n.schema?.actions;
}
class tr extends _r {
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
      const r = e.onDismiss;
      new tr({
        ...e,
        onDismiss: () => {
          r?.(), t();
        }
      }).show();
    });
  }
  renderContent() {
    const e = this.config.transition || "complete action", t = this.config.entityType || "content", r = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
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
                ${this.renderDescription(r)}
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
    const t = this.localeStates.get(e) || { loading: !1, created: !1 }, r = this.config.missingFieldsByLocale?.[e], s = Array.isArray(r) && r.length > 0, i = this.getLocaleLabel(e), o = t.loading ? "disabled" : "";
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
                ${w(i)}
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
                  ${r.map((l) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${w(l)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${t.created ? this.renderOpenButton(e, t.newRecordId) : this.renderCreateButton(e, o)}
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
  renderOpenButton(e, t, r = !1) {
    if (r) return "";
    const s = this.config.navigationBasePath, i = t || this.config.recordId, o = new URLSearchParams();
    o.set("locale", e), this.config.environment && o.set("env", this.config.environment);
    const a = `${s}/${i}/edit?${o.toString()}`;
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
    }), this.container?.querySelectorAll('[data-blocker-action="create"]')?.forEach((i) => {
      i.addEventListener("click", () => {
        const o = i.getAttribute("data-locale");
        o && this.handleCreateTranslation(o);
      });
    });
    const s = this.container?.querySelectorAll("[data-locale-item]");
    s?.forEach((i, o) => {
      i.addEventListener("keydown", (a) => {
        a.key === "ArrowDown" && o < s.length - 1 ? (a.preventDefault(), s[o + 1].querySelector("[data-blocker-action]")?.focus()) : a.key === "ArrowUp" && o > 0 && (a.preventDefault(), s[o - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(e) {
    const t = this.localeStates.get(e);
    if (!(!t || t.loading || t.created)) {
      t.loading = !0, this.updateLocaleItemUI(e);
      try {
        const r = {
          id: this.config.recordId,
          locale: e
        };
        this.config.environment && (r.environment = this.config.environment), this.config.panelName && (r.policy_entity = this.config.panelName);
        const s = `${this.config.apiEndpoint}/actions/create_translation`, i = await Yt(s, r);
        if (i.success) {
          t.loading = !1, t.created = !0, i.data?.id && (t.newRecordId = String(i.data.id)), this.updateLocaleItemUI(e);
          const o = {
            id: t.newRecordId || this.config.recordId,
            locale: e,
            status: String(i.data?.status || "draft"),
            translation_group_id: i.data?.translation_group_id ? String(i.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(e, o);
        } else {
          t.loading = !1, this.updateLocaleItemUI(e);
          const o = i.error?.message || "Failed to create translation";
          this.config.onError?.(o);
        }
      } catch (r) {
        t.loading = !1, this.updateLocaleItemUI(e);
        const s = r instanceof Error ? r.message : "Failed to create translation";
        this.config.onError?.(s);
      }
    }
  }
  updateLocaleItemUI(e) {
    const t = this.container?.querySelector(`[data-locale-item="${e}"]`);
    if (!t || !this.localeStates.get(e)) return;
    const s = t.parentElement;
    if (!s) return;
    const i = document.createElement("div");
    i.innerHTML = this.renderLocaleItem(e);
    const o = i.firstElementChild;
    o && (s.replaceChild(o, t), o.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
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
async function ba(n) {
  try {
    await tr.showBlocker(n);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = n.transition || "complete action", r = n.missingLocales.join(", "), s = `Cannot ${t}: Missing translations for ${r}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(s) : alert(s);
  }
}
const pi = [
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
class nn {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || pi
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
    const { title: e, orientation: t, size: r, items: s, containerClass: i } = this.config, o = t === "vertical", a = r === "sm", l = o ? "flex-col" : "flex-row flex-wrap", c = a ? "gap-2" : "gap-4", d = a ? "text-xs" : "text-sm", u = a ? "text-sm" : "text-base", h = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${this.escapeHtml(e)}</span>` : "", p = s.map((f) => this.renderItem(f, u, d)).join("");
    return `
      <div class="status-legend inline-flex items-center ${l} ${c} ${i}"
           role="list"
           aria-label="Translation status legend">
        ${h}
        ${p}
      </div>
    `;
  }
  /**
   * Render a single legend item
   */
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
function fi(n) {
  const e = new nn(n);
  return e.render(), e;
}
function ya() {
  const n = document.querySelectorAll("[data-status-legend]"), e = [];
  return n.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const r = t.dataset.orientation || "horizontal", s = t.dataset.size || "default", i = t.dataset.title || "", o = fi({
      container: t,
      orientation: r,
      size: s,
      title: i
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(o);
  }), e;
}
function va(n = {}) {
  const e = document.createElement("div");
  return new nn({
    container: e,
    ...n
  }).buildHTML();
}
const sn = [
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
class gi {
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
    const { size: e = "default", containerClass: t = "" } = this.config, r = e === "sm" ? "text-xs" : "text-sm", s = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", i = this.config.filters.map((o) => this.renderFilterButton(o, r, s)).join("");
    this.container.innerHTML = `
      <div class="quick-filters inline-flex items-center gap-2 flex-wrap ${t}"
           role="group"
           aria-label="Quick filters">
        ${i}
      </div>
    `, this.bindEventListeners();
  }
  /**
   * Render a single filter button
   */
  renderFilterButton(e, t, r) {
    const s = this.state.capabilities.get(e.key), i = s?.supported !== !1, o = this.state.activeKey === e.key, a = s?.disabledReason || "Filter not available", l = `inline-flex items-center gap-1 ${r} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let c, d;
    i ? o ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${Kt(a)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${Kt(e.key)}"
              ${d}
              ${i ? "" : "disabled"}>
        ${u}
        <span>${rr(e.label)}</span>
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
        const r = t.dataset.filterKey;
        r && !t.disabled && this.selectFilter(r);
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
  setCapability(e, t, r) {
    this.state.capabilities.set(e, { key: e, supported: t, disabledReason: r }), this.render();
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
function mi(n, e, t = {}) {
  return new gi({
    container: n,
    filters: sn,
    onFilterSelect: e,
    ...t
  });
}
function wa(n) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-quick-filters-init"))
      return;
    const s = r.dataset.size || "default", i = mi(
      r,
      (o) => n(o, r),
      { size: s }
    );
    r.setAttribute("data-quick-filters-init", "true"), t.push(i);
  }), t;
}
function xa(n = {}) {
  const {
    filters: e = sn,
    activeKey: t = null,
    capabilities: r = [],
    size: s = "default",
    containerClass: i = ""
  } = n, o = s === "sm" ? "text-xs" : "text-sm", a = s === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const d of r)
    l.set(d.key, d);
  const c = e.map((d) => {
    const u = l.get(d.key), h = u?.supported !== !1, p = t === d.key, f = u?.disabledReason || "Filter not available", m = `inline-flex items-center gap-1 ${a} ${o} rounded-full font-medium`;
    let $;
    h ? p ? $ = `${d.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : $ = d.styleClass || "bg-gray-100 text-gray-700" : $ = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const D = d.icon ? `<span>${d.icon}</span>` : "", k = h ? "" : `title="${Kt(f)}"`;
    return `<span class="${m} ${$}" ${k}>${D}<span>${rr(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-2 flex-wrap ${i}">${c}</div>`;
}
function rr(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Kt(n) {
  return rr(n);
}
async function bi(n, e, t = {}) {
  const { apiEndpoint: r, notifier: s = new Ve(), maxFailuresToShow: i = 5 } = n, o = `${r}/bulk/create-missing-translations`;
  try {
    const a = await fetch(o, {
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
        const h = JSON.parse(d);
        u = h.error || h.message || u;
      } catch {
        d && (u = d);
      }
      throw new Error(u);
    }
    const l = await a.json(), c = yi(l, i);
    return vi(c, s), n.onSuccess && n.onSuccess(c), c;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw s.error(`Failed to create translations: ${l.message}`), n.onError && n.onError(l), l;
  }
}
function yi(n, e) {
  const t = n.data || [], r = n.created_count ?? t.filter((l) => l.success).length, s = n.failed_count ?? t.filter((l) => !l.success).length, i = n.skipped_count ?? 0, o = n.total ?? t.length, a = t.filter((l) => !l.success && l.error).slice(0, e).map((l) => ({
    id: l.id,
    locale: l.locale,
    error: l.error || "Unknown error"
  }));
  return {
    total: o,
    created: r,
    failed: s,
    skipped: i,
    failures: a
  };
}
function vi(n, e) {
  const { created: t, failed: r, skipped: s, total: i } = n;
  if (i === 0) {
    e.info("No translations to create");
    return;
  }
  r === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${s > 0 ? ` (${s} skipped)` : ""}`) : s > 0 && e.info(`All ${s} translation${s !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${r} translation${r !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${r}${s > 0 ? `, skipped ${s}` : ""}`
  );
}
function Sa(n) {
  const { created: e, failed: t, skipped: r, total: s, failures: i } = n, o = `
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="text-center p-3 bg-green-50 rounded">
        <div class="text-2xl font-bold text-green-700">${e}</div>
        <div class="text-sm text-green-600">Created</div>
      </div>
      <div class="text-center p-3 ${t > 0 ? "bg-red-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${t > 0 ? "text-red-700" : "text-gray-400"}">${t}</div>
        <div class="text-sm ${t > 0 ? "text-red-600" : "text-gray-500"}">Failed</div>
      </div>
      <div class="text-center p-3 ${r > 0 ? "bg-yellow-50" : "bg-gray-50"} rounded">
        <div class="text-2xl font-bold ${r > 0 ? "text-yellow-700" : "text-gray-400"}">${r}</div>
        <div class="text-sm ${r > 0 ? "text-yellow-600" : "text-gray-500"}">Skipped</div>
      </div>
    </div>
  `;
  let a = "";
  return i.length > 0 && (a = `
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
              ${i.map(
    (c) => `
        <tr>
          <td class="px-3 py-2 text-sm text-gray-700">${_t(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${_t(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${_t(c.error)}</td>
        </tr>
      `
  ).join("")}
            </tbody>
          </table>
        </div>
        ${t > i.length ? `<p class="mt-2 text-sm text-gray-500">Showing ${i.length} of ${t} failures</p>` : ""}
      </div>
    `), `
    <div class="bulk-result-summary">
      <div class="mb-4 text-sm text-gray-600">
        Processed ${s} item${s !== 1 ? "s" : ""}
      </div>
      ${o}
      ${a}
    </div>
  `;
}
function Ca(n) {
  const { created: e, failed: t, skipped: r } = n, s = [];
  return e > 0 && s.push(`<span class="text-green-600">+${e}</span>`), t > 0 && s.push(`<span class="text-red-600">${t} failed</span>`), r > 0 && s.push(`<span class="text-yellow-600">${r} skipped</span>`), s.join(" · ");
}
function Ea(n, e, t) {
  return async (r) => bi(
    {
      apiEndpoint: n,
      notifier: e,
      onSuccess: t
    },
    r
  );
}
function _t(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const wi = {
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
function te(n) {
  const e = n.toLowerCase();
  return wi[e] || n.toUpperCase();
}
class bt {
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
    const { locale: e, size: t, mode: r, localeExists: s } = this.config, { loading: i, created: o, error: a } = this.state, l = te(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = r === "button" ? "rounded-lg" : "rounded-full";
    let u, h = "";
    i ? (u = "bg-gray-100 text-gray-600 border-gray-300", h = this.renderSpinner()) : o ? (u = "bg-green-100 text-green-700 border-green-300", h = this.renderCheckIcon()) : a ? (u = "bg-red-100 text-red-700 border-red-300", h = this.renderErrorIcon()) : s ? u = "bg-blue-100 text-blue-700 border-blue-300" : u = "bg-amber-100 text-amber-700 border-amber-300";
    const p = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${c} ${d} border ${u}"
           data-locale-action="${w(e)}"
           data-locale-exists="${s}"
           data-loading="${i}"
           data-created="${o}"
           role="group"
           aria-label="${l} translation">
        ${h}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${w(e)}</span>
        <span class="sr-only">${l}</span>
        ${p}
      </div>
    `;
  }
  /**
   * Render action buttons (create/open).
   */
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: s, created: i } = this.state, o = r === "sm" ? "p-0.5" : "p-1", a = r === "sm" ? "w-3 h-3" : "w-4 h-4", l = [];
    if (!t && !i && !s && l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${o} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${w(e)}"
                aria-label="Create ${te(e)} translation"
                title="Create ${te(e)} translation">
          <svg class="${a}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `), t || i) {
      const c = i ? "hover:bg-green-200" : "hover:bg-blue-200", d = i ? "focus:ring-green-500" : "focus:ring-blue-500";
      l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${o} rounded ${c} focus:outline-none focus:ring-1 ${d} transition-colors"
                data-action="open"
                data-locale="${w(e)}"
                aria-label="Open ${te(e)} translation"
                title="Open ${te(e)} translation">
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
    e?.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      r.preventDefault(), r.stopPropagation(), this.handleOpen();
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
        const t = `${this.config.apiEndpoint}/actions/create_translation`, r = await Yt(t, e);
        if (r.success) {
          const s = r.data?.id ? String(r.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: s
          });
          const i = {
            id: s || this.config.recordId,
            locale: this.config.locale,
            status: String(r.data?.status || "draft"),
            translationGroupId: r.data?.translation_group_id ? String(r.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, i);
        } else {
          const s = r.error?.message || "Failed to create translation";
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
    const { locale: e, navigationBasePath: t, recordId: r, environment: s } = this.config, { newRecordId: i } = this.state, o = i || r, a = new URLSearchParams();
    a.set("locale", e), s && a.set("env", s);
    const l = `${t}/${o}/edit?${a.toString()}`;
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
function on(n) {
  return new bt(n).render();
}
function $a(n, e) {
  return n.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${n.map((r) => {
    const s = { ...e, locale: r };
    return on(s);
  }).join("")}
    </div>
  `;
}
function ka(n, e) {
  const t = /* @__PURE__ */ new Map();
  return n.querySelectorAll("[data-locale-action]").forEach((s) => {
    const i = s.getAttribute("data-locale-action");
    if (!i) return;
    const o = s.getAttribute("data-locale-exists") === "true", a = { ...e, locale: i, localeExists: o }, l = new bt(a), c = s.parentElement;
    c && (l.mount(c), t.set(i, l));
  }), t;
}
function $r(n, e, t, r) {
  const s = new URLSearchParams();
  return s.set("locale", t), r && s.set("env", r), `${n}/${e}/edit?${s.toString()}`;
}
class nr {
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
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", s = e.resolvedLocale || "default", i = te(r), o = te(s), a = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${w(r)}"
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
                The <strong class="font-medium">${w(i)}</strong> (${w(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${w(o)}</strong> (${w(s.toUpperCase())}).
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
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: s, environment: i } = this.config, o = e.requestedLocale;
    return !o || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${w(o)}"
              data-record-id="${w(e.recordId)}"
              data-api-endpoint="${w(t)}"
              data-panel="${w(s || "")}"
              data-environment="${w(i || "")}"
              aria-label="Create ${te(o)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${w(o.toUpperCase())} translation
      </button>
    `;
  }
  /**
   * Render the secondary CTA (Open source locale).
   */
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, environment: r } = this.config, s = e.resolvedLocale;
    if (!s || !e.recordId)
      return "";
    const i = $r(t, e.recordId, s, r);
    return `
      <a href="${w(i)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${w(s)}"
         aria-label="Open ${te(s)} translation">
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
    e?.addEventListener("click", async (r) => {
      r.preventDefault(), await this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      const s = t.getAttribute("data-locale"), i = t.getAttribute("href");
      s && i && this.config.onOpenSource?.(s, i);
    });
  }
  /**
   * Handle create translation action.
   */
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, environment: s, navigationBasePath: i } = this.config, o = e.requestedLocale, a = e.recordId;
    if (!o || !a) return;
    await new bt({
      locale: o,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: i,
      panelName: r,
      environment: s,
      localeExists: !1,
      onCreateSuccess: (c, d) => {
        this.config.onCreateSuccess?.(c, d);
        const u = $r(i, d.id, c, s);
        window.location.href = u;
      },
      onError: (c, d) => {
        this.config.onError?.(d);
      }
    }).handleCreate();
  }
}
function xi(n, e) {
  if (!e.locked) {
    Si(n);
    return;
  }
  if (n.classList.add("form-locked", "pointer-events-none", "opacity-75"), n.setAttribute("data-form-locked", "true"), n.setAttribute("data-lock-reason", e.reason || ""), n.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !n.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(n).position === "static" && (n.style.position = "relative"), n.appendChild(r);
  }
}
function Si(n) {
  n.classList.remove("form-locked", "pointer-events-none", "opacity-75"), n.removeAttribute("data-form-locked"), n.removeAttribute("data-lock-reason"), n.querySelectorAll('[data-was-enabled="true"]').forEach((r) => {
    r.removeAttribute("disabled"), r.removeAttribute("data-was-enabled"), r.removeAttribute("aria-disabled");
  }), n.querySelector("[data-form-lock-overlay]")?.remove();
}
function Aa(n) {
  return n.getAttribute("data-form-locked") === "true";
}
function La(n) {
  return n.getAttribute("data-lock-reason");
}
function _a(n, e) {
  const t = ge(n);
  return new nr({ ...e, context: t }).render();
}
function Da(n) {
  const e = ge(n);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Ta(n, e) {
  const t = new nr(e);
  return t.mount(n), t;
}
function Ia(n, e) {
  const t = ge(e), s = new nr({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return xi(n, s), s;
}
class an {
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
    const r = e._action_state;
    if (!r || typeof r != "object" || Array.isArray(r))
      return null;
    const s = r[t];
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
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), s = this.getOverflowCount(), i = e.map(
      (l) => this.renderChip(l, t, r)
    ).join(""), o = s > 0 ? this.renderOverflow(s) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${w(this.config.recordId)}"
           data-action-enabled="${t}"
           role="list"
           aria-label="Missing translations">
        ${i}${o}
      </div>
    `;
  }
  /**
   * Render a single locale chip.
   */
  renderChip(e, t, r) {
    const { recordId: s, apiEndpoint: i, navigationBasePath: o, panelName: a, environment: l, size: c } = this.config;
    return t ? on({
      locale: e,
      recordId: s,
      apiEndpoint: i,
      navigationBasePath: o,
      panelName: a,
      environment: l,
      localeExists: !1,
      size: c,
      mode: "chip",
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError
    }) : this.renderDisabledChip(e, r, c);
  }
  /**
   * Render a disabled locale chip (no action buttons).
   */
  renderDisabledChip(e, t, r) {
    const s = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", i = t || "Translation creation unavailable", o = te(e);
    return `
      <div class="inline-flex items-center gap-1 ${s} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${w(e)}"
           data-disabled="true"
           title="${w(i)}"
           role="listitem"
           aria-label="${o} translation (unavailable)">
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
    const { size: t } = this.config, r = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", s = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${r} rounded text-gray-500 font-medium"
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
      const r = t.getAttribute("data-locale-action");
      if (!r) return;
      const s = new bt({
        locale: r,
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
      this.chips.set(r, s), t.querySelector('[data-action="create"]')?.addEventListener("click", async (a) => {
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
function Ci(n, e) {
  const t = String(n.id || "");
  return t ? new an(n, { ...e, recordId: t }).render() : "";
}
function Ra(n) {
  const e = Z(n);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function Ma(n, e, t) {
  const r = String(e.id || ""), s = new an(e, { ...t, recordId: r });
  return s.mount(n), s;
}
function Pa(n) {
  return (e, t, r) => Ci(t, n);
}
function yt() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function Ei() {
  return yt() ? "⌘" : "Ctrl";
}
function $i(n) {
  if (yt())
    switch (n) {
      case "ctrl":
        return "⌃";
      case "alt":
        return "⌥";
      case "shift":
        return "⇧";
      case "meta":
        return "⌘";
    }
  switch (n) {
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
function ln(n) {
  const e = n.modifiers.map($i), t = ki(n.key);
  return yt() ? [...e, t].join("") : [...e, t].join("+");
}
function ki(n) {
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
  }[n] || n.toUpperCase();
}
class cn {
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
    const r = this.shortcuts.get(e);
    r && (r.enabled = t);
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
      const r = e.get(t.category) || [];
      r.push(t), e.set(t.category, r);
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
        const r = t.handler(e);
        r instanceof Promise && r.catch((s) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, s);
        });
      } catch (r) {
        console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, r);
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
    const r = t.key.toLowerCase(), s = e.key.toLowerCase();
    if (r !== s && t.code.toLowerCase() !== s)
      return !1;
    const i = yt(), o = new Set(e.modifiers), a = o.has("ctrl"), l = o.has("meta"), c = o.has("alt"), d = o.has("shift");
    return !(a && !(i ? t.metaKey : t.ctrlKey) || l && !i && !t.metaKey || c && !t.altKey || d && !t.shiftKey || !a && !l && (i ? t.metaKey : t.ctrlKey) || !c && t.altKey || !d && t.shiftKey);
  }
  /**
   * Check if an input element is focused.
   */
  isInputFocused(e) {
    const t = e.target;
    if (!t) return !1;
    const r = t.tagName.toLowerCase();
    return !!(r === "input" || r === "textarea" || r === "select" || t.isContentEditable);
  }
  /**
   * Destroy the registry and clean up.
   */
  destroy() {
    this.unbind(), this.shortcuts.clear();
  }
}
function Ai(n) {
  const e = [];
  return n.onSave && e.push({
    id: "save",
    description: "Save changes",
    category: "save",
    key: "s",
    modifiers: ["ctrl"],
    handler: n.onSave,
    context: "form"
  }), n.onPublish && e.push({
    id: "publish",
    description: "Publish content",
    category: "actions",
    key: "p",
    modifiers: ["ctrl", "shift"],
    handler: n.onPublish,
    context: "form"
  }), n.onLocalePicker && e.push({
    id: "locale-picker",
    description: "Open locale picker",
    category: "locale",
    key: "l",
    modifiers: ["ctrl", "shift"],
    handler: n.onLocalePicker
  }), n.onPrevLocale && e.push({
    id: "prev-locale",
    description: "Switch to previous locale",
    category: "locale",
    key: "[",
    modifiers: ["ctrl"],
    handler: n.onPrevLocale
  }), n.onNextLocale && e.push({
    id: "next-locale",
    description: "Switch to next locale",
    category: "locale",
    key: "]",
    modifiers: ["ctrl"],
    handler: n.onNextLocale
  }), n.onCreateTranslation && e.push({
    id: "create-translation",
    description: "Create new translation",
    category: "actions",
    key: "t",
    modifiers: ["ctrl", "shift"],
    handler: n.onCreateTranslation
  }), e;
}
function Ba(n) {
  const e = /* @__PURE__ */ new Map();
  for (const i of n) {
    if (i.enabled === !1) continue;
    const o = e.get(i.category) || [];
    o.push(i), e.set(i.category, o);
  }
  const t = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, r = ["save", "locale", "navigation", "actions", "help", "other"];
  let s = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const i of r) {
    const o = e.get(i);
    if (!(!o || o.length === 0)) {
      s += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${t[i]}</h4>
        <dl class="space-y-1">
    `;
      for (const a of o) {
        const l = ln(a);
        s += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${Se(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${Se(l)}</kbd>
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
function Se(n) {
  const e = typeof document < "u" ? document.createElement("div") : null;
  return e ? (e.textContent = n, e.innerHTML) : n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const dn = "admin_keyboard_shortcuts_settings", un = "admin_keyboard_shortcuts_hint_dismissed", at = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function vt() {
  return typeof localStorage > "u" || !localStorage || typeof localStorage.getItem != "function" || typeof localStorage.setItem != "function" ? null : localStorage;
}
function Li() {
  const n = vt();
  if (!n)
    return { ...at };
  try {
    const e = n.getItem(dn);
    if (!e)
      return { ...at };
    const t = JSON.parse(e);
    return {
      enabled: typeof t.enabled == "boolean" ? t.enabled : !0,
      shortcuts: typeof t.shortcuts == "object" && t.shortcuts !== null ? t.shortcuts : {},
      updatedAt: typeof t.updatedAt == "string" ? t.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...at };
  }
}
function Oa(n) {
  const e = vt();
  if (e)
    try {
      const t = {
        ...n,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      e.setItem(dn, JSON.stringify(t));
    } catch {
    }
}
function _i() {
  const n = vt();
  return n ? n.getItem(un) === "true" : !1;
}
function Di() {
  const n = vt();
  if (n)
    try {
      n.setItem(un, "true");
    } catch {
    }
}
function Ti(n) {
  if (_i())
    return null;
  const { container: e, position: t = "bottom", onDismiss: r, onShowHelp: s, autoDismissMs: i = 1e4 } = n, o = document.createElement("div");
  o.className = `shortcuts-discovery-hint fixed ${t === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, o.setAttribute("role", "alert"), o.setAttribute("aria-live", "polite");
  const a = Ei();
  o.innerHTML = `
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
    c && Di(), o.remove(), r?.();
  };
  return o.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    l(!0), s?.();
  }), o.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    l(!0);
  }), o.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    l(!1);
  }), i > 0 && setTimeout(() => {
    o.parentElement && l(!1);
  }, i), e.appendChild(o), o;
}
function Fa(n) {
  const { container: e, shortcuts: t, settings: r, onSettingsChange: s } = n, i = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, o = /* @__PURE__ */ new Map();
  for (const h of t) {
    const p = o.get(h.category) || [];
    p.push(h), o.set(h.category, p);
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
                aria-checked="${r.enabled}"
                data-settings-action="toggle-global"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${r.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}">
          <span class="sr-only">Enable keyboard shortcuts</span>
          <span aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${r.enabled ? "translate-x-5" : "translate-x-0"}"></span>
        </button>
      </div>

      <!-- Per-shortcut toggles -->
      <div class="${r.enabled ? "" : "opacity-50 pointer-events-none"}" data-shortcuts-list>
  `;
  for (const h of a) {
    const p = o.get(h);
    if (!(!p || p.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${i[h]}
        </h4>
        <div class="space-y-1">
    `;
      for (const f of p) {
        const m = r.shortcuts[f.id] !== !1, $ = ln(f);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${Se($)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${Se(f.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${Se(f.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${Se(f.id)}"
                 ${m ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${Se(f.description)} shortcut">
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
      ...r,
      enabled: !r.enabled
    };
    s(h);
  }), e.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((h) => {
    h.addEventListener("change", () => {
      const p = h.getAttribute("data-shortcut-id");
      if (!p) return;
      const f = {
        ...r,
        shortcuts: {
          ...r.shortcuts,
          [p]: h.checked
        }
      };
      s(f);
    });
  }), e.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    s({ ...at });
  });
}
function Ii(n, e) {
  const t = n;
  t.config && (t.config.enabled = e.enabled);
  for (const r of n.getShortcuts()) {
    const s = e.shortcuts[r.id] !== !1;
    n.setEnabled(r.id, s);
  }
}
let Dt = null;
function qa() {
  return Dt || (Dt = new cn()), Dt;
}
function Ri(n, e) {
  const t = Li(), r = new cn({
    ...e,
    enabled: t.enabled
  }), s = Ai(n);
  for (const i of s)
    r.register(i);
  return Ii(r, t), r.bind(), r;
}
function ja(n, e) {
  const t = Ri(n, e);
  return e.hintContainer && Ti({
    container: e.hintContainer,
    onShowHelp: e.onShowHelp,
    onDismiss: () => {
    }
  }), t;
}
const Mi = 1500, Pi = 2e3, sr = "autosave", je = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Bi = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
};
class hn {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? Mi,
      savedDurationMs: e.savedDurationMs ?? Pi,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? sr,
      labels: { ...je, ...e.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: { ...Bi, ...e.conflictLabels }
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
    const r = {
      action: "use_server",
      serverState: t,
      localData: this.pendingData,
      conflict: e
    };
    if (this.isDirty = !1, this.pendingData = null, this.conflictInfo = null, this.setState("idle"), this.config.onConflictResolve)
      try {
        await this.config.onConflictResolve(r);
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
    const e = this.config.classPrefix, t = this.config.labels, r = `${e}--${this.state}`, s = t[this.state] || "", i = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${r}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${i}</span>
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
    const r = {
      previousState: t,
      currentState: e,
      error: this.lastError ?? void 0,
      data: this.pendingData ?? void 0
    };
    for (const s of this.listeners)
      try {
        s(r);
      } catch {
      }
    this.config.showToasts && this.config.notifier && this.showToast(e), this.render();
  }
  showToast(e) {
    const t = this.config.notifier;
    if (t)
      switch (e) {
        case "saved":
          t.success(this.config.labels.saved ?? je.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? je.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? je.conflict);
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
function Na(n) {
  return new hn({
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
    ...n
  });
}
function za(n, e = {}) {
  const t = e.classPrefix ?? sr, s = { ...je, ...e.labels }[n] || "";
  let i = "";
  switch (n) {
    case "saving":
      i = `<span class="${t}__spinner"></span>`;
      break;
    case "saved":
      i = `<span class="${t}__check">✓</span>`;
      break;
    case "error":
      i = `<span class="${t}__error">!</span>`;
      break;
    case "conflict":
      i = `<span class="${t}__conflict-icon">⚠</span>`;
      break;
  }
  return `<div class="${t} ${t}--${n}" role="status" aria-live="polite">
    ${i}
    <span class="${t}__label">${s}</span>
  </div>`;
}
function Ha(n = sr) {
  return `
    .${n} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${n}--idle {
      opacity: 0;
    }

    .${n}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${n}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${n}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${n}__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .${n}__icon svg {
      width: 100%;
      height: 100%;
    }

    .${n}__spinner {
      animation: ${n}-spin 1s linear infinite;
    }

    .${n}__retry {
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

    .${n}__retry:hover {
      background-color: var(--autosave-retry-hover-bg, rgba(59, 130, 246, 0.1));
    }

    @keyframes ${n}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Conflict state styles (TX-074) */
    .${n}--conflict {
      color: var(--autosave-conflict-color, #f59e0b);
      padding: 0.75rem;
      background: var(--autosave-conflict-bg, #fffbeb);
      border: 1px solid var(--autosave-conflict-border, #fcd34d);
      border-radius: 0.5rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .${n}__conflict-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .${n}__conflict-title {
      font-weight: 600;
      color: var(--autosave-conflict-title-color, #92400e);
    }

    .${n}__conflict-message {
      font-size: 0.75rem;
      color: var(--autosave-conflict-message-color, #78350f);
      margin: 0;
    }

    .${n}__conflict-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .${n}__conflict-actions button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${n}__conflict-use-server {
      color: white;
      background: var(--autosave-conflict-use-server-bg, #3b82f6);
      border: none;
    }

    .${n}__conflict-use-server:hover {
      background: var(--autosave-conflict-use-server-hover-bg, #2563eb);
    }

    .${n}__conflict-force-save {
      color: var(--autosave-conflict-force-color, #ef4444);
      background: transparent;
      border: 1px solid currentColor;
    }

    .${n}__conflict-force-save:hover {
      background: var(--autosave-conflict-force-hover-bg, rgba(239, 68, 68, 0.1));
    }

    .${n}__conflict-dismiss {
      color: var(--autosave-conflict-dismiss-color, #6b7280);
      background: transparent;
      border: 1px solid var(--autosave-conflict-dismiss-border, #d1d5db);
    }

    .${n}__conflict-dismiss:hover {
      background: var(--autosave-conflict-dismiss-hover-bg, #f3f4f6);
    }
  `;
}
function Ua(n, e) {
  const { watchFields: t, indicatorSelector: r, ...s } = e;
  let i = s.container;
  !i && r && (i = n.querySelector(r) ?? void 0);
  const o = new hn({
    ...s,
    container: i
  }), a = () => {
    const h = new FormData(n), p = {};
    return h.forEach((f, m) => {
      p[m] = f;
    }), p;
  }, l = (h) => {
    const p = h.target;
    if (p) {
      if (t && t.length > 0) {
        const f = p.name;
        if (!f || !t.includes(f))
          return;
      }
      o.markDirty(a());
    }
  };
  n.addEventListener("input", l), n.addEventListener("change", l), n.addEventListener("submit", async (h) => {
    o.hasPendingChanges() && (h.preventDefault(), await o.save() && n.submit());
  });
  const c = (h) => {
    o.hasPendingChanges() && (h.preventDefault(), h.returnValue = "");
  };
  window.addEventListener("beforeunload", c);
  const d = () => {
    document.hidden && o.hasPendingChanges() && o.save();
  };
  document.addEventListener("visibilitychange", d);
  const u = o.destroy.bind(o);
  return o.destroy = () => {
    n.removeEventListener("input", l), n.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), u();
  }, o;
}
const pn = "char-counter", Oi = "interpolation-preview", fn = "dir-toggle", gn = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: "Mustache", example: "{{name}}" },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: "ICU", example: "{name}" },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: "Printf", example: "%s" },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: "Named Printf", example: "%(name)s" },
  { pattern: /\$\{(\w+)\}/g, name: "Template Literal", example: "${name}" }
], Fi = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
};
class qi {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? pn,
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
    const e = this.getCount(), t = [...this.config.thresholds].sort((r, s) => s.limit - r.limit);
    for (const r of t)
      if (e >= r.limit)
        return r.severity;
    return null;
  }
  /**
   * Update the counter display.
   */
  update() {
    const e = this.getCount(), t = this.getSeverity(), r = this.config.hardLimit ?? this.config.softLimit;
    this.config.enforceHardLimit && this.config.hardLimit && e > this.config.hardLimit && (this.config.input.value = this.config.input.value.slice(0, this.config.hardLimit)), this.counterEl && (this.counterEl.textContent = this.config.formatDisplay(e, r), this.counterEl.className = this.buildCounterClasses(t), this.counterEl.setAttribute("aria-live", "polite"), t === "error" ? this.counterEl.setAttribute("role", "alert") : this.counterEl.removeAttribute("role"));
  }
  /**
   * Render the counter HTML.
   */
  render() {
    const e = this.getCount(), t = this.getSeverity(), r = this.config.hardLimit ?? this.config.softLimit;
    return `<span class="${this.buildCounterClasses(t)}" aria-live="polite">${this.config.formatDisplay(e, r)}</span>`;
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
    const t = this.config.classPrefix, r = [t];
    return e && r.push(`${t}--${e}`), r.join(" ");
  }
  defaultFormatDisplay(e, t) {
    return t ? `${e} / ${t}` : `${e}`;
  }
}
class ji {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? Fi,
      patterns: [...gn, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Oi
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
    for (const r of this.config.patterns) {
      r.pattern.lastIndex = 0;
      let s;
      for (; (s = r.pattern.exec(e)) !== null; )
        t.push({
          pattern: r.name,
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
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (r, s) => {
        const o = (s ?? r).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        for (const [a, l] of Object.entries(this.config.sampleValues))
          if (a.toLowerCase() === o)
            return l;
        return r;
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
    const e = this.config.input.value, t = this.getMatches(), r = this.config.classPrefix;
    if (t.length === 0)
      return this.escapeHtml(e);
    t.sort((o, a) => o.start - a.start);
    let s = "", i = 0;
    for (const o of t) {
      s += this.escapeHtml(e.slice(i, o.start));
      const a = this.getSampleValue(o.variable), l = e.slice(o.start, o.end);
      s += `<span class="${r}__variable" title="${this.escapeHtml(l)}">${this.escapeHtml(a ?? l)}</span>`, i = o.end;
    }
    return s += this.escapeHtml(e.slice(i)), s;
  }
  /**
   * Render the preview HTML structure.
   */
  render() {
    const e = this.config.classPrefix, r = this.getMatches().length === 0;
    return `<div class="${e}${r ? ` ${e}--empty` : ""}">
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
    for (const [r, s] of Object.entries(this.config.sampleValues))
      if (r.toLowerCase() === t)
        return s;
    return null;
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}
class Ni {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? fn,
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
function Ga(n, e = {}) {
  const t = [], r = [], s = [];
  for (const i of e.charCounterFields ?? []) {
    const o = n.querySelector(`[name="${i}"]`);
    o && t.push(new qi({
      input: o,
      ...e.charCounterConfig
    }));
  }
  for (const i of e.interpolationFields ?? []) {
    const o = n.querySelector(`[name="${i}"]`);
    o && r.push(new ji({
      input: o,
      ...e.interpolationConfig
    }));
  }
  for (const i of e.directionToggleFields ?? []) {
    const o = n.querySelector(`[name="${i}"]`);
    o && s.push(new Ni({
      input: o,
      persistenceKey: `dir-${i}`,
      ...e.directionToggleConfig
    }));
  }
  return {
    counters: t,
    previews: r,
    toggles: s,
    destroy: () => {
      t.forEach((i) => i.destroy()), r.forEach((i) => i.destroy()), s.forEach((i) => i.destroy());
    }
  };
}
function Va(n, e, t, r = pn) {
  const s = [r];
  t && s.push(`${r}--${t}`);
  const i = e ? `${n} / ${e}` : `${n}`;
  return `<span class="${s.join(" ")}" aria-live="polite">${i}</span>`;
}
function Ka(n, e = fn) {
  const t = n === "rtl", r = t ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${n.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${r}</svg>
    <span class="${e}__label">${n.toUpperCase()}</span>
  </button>`;
}
function Ya() {
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
function Ja(n, e = gn) {
  const t = [];
  for (const r of e) {
    r.pattern.lastIndex = 0;
    let s;
    for (; (s = r.pattern.exec(n)) !== null; )
      t.push({
        pattern: r.name,
        variable: s[1] ?? s[0],
        start: s.index,
        end: s.index + s[0].length
      });
  }
  return t;
}
function Xa(n, e, t) {
  return t && n >= t ? "error" : e && n >= e ? "warning" : null;
}
function zi(n) {
  return typeof n == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(n) ? n : "none";
}
function Hi(n) {
  return n === "core+exchange" || n === "full";
}
function Ui(n) {
  return n === "core+queue" || n === "full";
}
function Wa(n) {
  return n !== "none";
}
function Gi(n) {
  if (!n || typeof n != "object")
    return null;
  const e = n, t = zi(e.profile || e.capability_mode), r = typeof e.schema_version == "number" ? e.schema_version : 0;
  return {
    profile: t,
    capability_mode: t,
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.filter(
      (s) => typeof s == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(s)
    ) : ["none", "core", "core+exchange", "core+queue", "full"],
    schema_version: r,
    modules: Vi(e.modules),
    features: Yi(e.features),
    routes: Ji(e.routes),
    panels: Xi(e.panels),
    resolver_keys: Wi(e.resolver_keys),
    warnings: Qi(e.warnings),
    contracts: e.contracts && typeof e.contracts == "object" ? e.contracts : void 0
  };
}
function Vi(n) {
  if (!n || typeof n != "object")
    return {};
  const e = n, t = {};
  return e.exchange && typeof e.exchange == "object" && (t.exchange = kr(e.exchange)), e.queue && typeof e.queue == "object" && (t.queue = kr(e.queue)), t;
}
function kr(n) {
  if (!n || typeof n != "object")
    return {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1, reason: "Invalid module state", reason_code: "INVALID_STATE" },
      actions: {}
    };
  const e = n;
  return {
    enabled: e.enabled === !0,
    visible: e.visible === !0,
    entry: mn(e.entry),
    actions: Ki(e.actions)
  };
}
function mn(n) {
  if (!n || typeof n != "object")
    return { enabled: !1 };
  const e = n;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function Ki(n) {
  if (!n || typeof n != "object")
    return {};
  const e = n, t = {};
  for (const [r, s] of Object.entries(e))
    s && typeof s == "object" && (t[r] = mn(s));
  return t;
}
function Yi(n) {
  if (!n || typeof n != "object")
    return {};
  const e = n;
  return {
    cms: e.cms === !0,
    dashboard: e.dashboard === !0
  };
}
function Ji(n) {
  if (!n || typeof n != "object")
    return {};
  const e = {}, t = n;
  for (const [r, s] of Object.entries(t))
    typeof s == "string" && (e[r] = s);
  return e;
}
function Xi(n) {
  return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
function Wi(n) {
  return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
function Qi(n) {
  return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
class bn {
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
    return e === "exchange" ? Hi(t) : Ui(t);
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
    const r = this.getModuleState(e);
    return r && r.actions[t] || null;
  }
  /**
   * Gate a navigation item.
   * Returns visibility/enabled state for rendering.
   *
   * Rule: Hidden when module is off or no module-view permission;
   *       visible-disabled for partial action permissions.
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
    if (!t.visible || !t.entry.enabled)
      return {
        visible: !1,
        enabled: !1,
        reason: t.entry.reason || "Missing module view permission",
        reasonCode: t.entry.reason_code || "PERMISSION_DENIED",
        permission: t.entry.permission
      };
    if (e.action) {
      const r = t.actions[e.action];
      if (!r)
        return {
          visible: !0,
          enabled: !1,
          reason: `Action ${e.action} not configured`,
          reasonCode: "ACTION_NOT_CONFIGURED"
        };
      if (!r.enabled)
        return {
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
function Qa(n) {
  const e = Gi(n);
  return e ? new bn(e) : null;
}
function Za() {
  return new bn({
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
function el(n) {
  return n.visible ? n.enabled ? "" : `aria-disabled="true"${n.reason ? ` title="${yn(n.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function tl(n) {
  if (n.enabled || !n.reason)
    return "";
  const e = (n.reasonCode || "").trim();
  return e ? Ir(e, { size: "sm", showFullMessage: !0 }) : `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${yn(n.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${Zi(n.reason)}
    </span>
  `.trim();
}
function Zi(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function yn(n) {
  return n.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function rl() {
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
function eo(n, e) {
  if (!e.visible) {
    n.style.display = "none", n.setAttribute("aria-hidden", "true");
    return;
  }
  n.style.display = "", n.removeAttribute("aria-hidden"), e.enabled ? (n.removeAttribute("aria-disabled"), n.classList.remove("capability-gate-disabled"), n.removeAttribute("title"), delete n.dataset.reasonCode, n.removeEventListener("click", Ar, !0)) : (n.setAttribute("aria-disabled", "true"), n.classList.add("capability-gate-disabled"), e.reason && (n.setAttribute("title", e.reason), n.dataset.reasonCode = e.reasonCode || ""), n.addEventListener("click", Ar, !0));
}
function Ar(n) {
  n.currentTarget.getAttribute("aria-disabled") === "true" && (n.preventDefault(), n.stopPropagation());
}
function nl(n, e) {
  n.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const s = r.dataset.capabilityGate;
    if (s)
      try {
        const i = JSON.parse(s), o = e.gateNavItem(i);
        eo(r, o);
      } catch {
        console.warn("Invalid capability gate config:", s);
      }
  });
}
const to = {
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
}, ro = [
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
class no {
  constructor(e) {
    this.container = null, this.state = "loading", this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || ro,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: { ...to, ...e.labels || {} }
    };
  }
  /**
   * Mount the dashboard to a container element
   */
  mount(e) {
    this.container = e, this.render(), this.loadData(), this.config.refreshInterval > 0 && this.startAutoRefresh();
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
      const e = this.config.filterPresets.find((i) => i.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), r = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, s = await fetch(r, {
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
  renderSummaryCard(e, t, r, s) {
    return `
      <div class="summary-card ${s}" role="listitem" data-summary="${e}">
        <div class="summary-count">${r}</div>
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
    const t = this.activePreset === e.id, r = e.badge?.() ?? null, s = r !== null ? `<span class="filter-badge">${r}</span>` : "";
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
  renderAssignmentList() {
    if (!this.data) return "";
    const e = this.config.labels;
    let t = this.data.assignments;
    return this.activePreset === "due_soon" && (t = t.filter((r) => r.due_state === "due_soon" || r.due_state === "overdue")), t.length === 0 ? this.renderEmpty() : `
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
            ${t.map((r) => this.renderAssignmentRow(r)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderAssignmentRow(e) {
    this.config.labels;
    const t = so(e.due_state), r = io(e.priority), s = Ke(e.queue_state, {
      domain: "queue",
      size: "sm"
    }), i = e.due_date ? ao(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${Be(e.id)}">
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
          ${i}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${r}">${R(oo(e.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(e)}
        </td>
      </tr>
    `;
  }
  renderAssignmentActions(e) {
    const t = this.config.labels, r = [];
    r.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${Be(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const s = e.review_actions;
    return e.queue_state === "in_progress" && s.submit_review.enabled && r.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${Be(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), e.queue_state === "review" && (s.approve.enabled && r.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${Be(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), s.reject.enabled && r.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${Be(t.reject)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        `)), `<div class="action-buttons">${r.join("")}</div>`;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".dashboard-refresh-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.loadData()), this.container.querySelectorAll(".filter-preset").forEach((o) => {
      o.addEventListener("click", () => {
        const a = o.dataset.preset;
        a && this.setActivePreset(a);
      });
    }), this.container.querySelectorAll(".assignment-row").forEach((o) => {
      const a = o.dataset.assignmentId;
      if (!a || !this.data) return;
      const l = this.data.assignments.find((d) => d.id === a);
      if (!l) return;
      o.querySelectorAll(".action-btn").forEach((d) => {
        d.addEventListener("click", async (u) => {
          u.stopPropagation();
          const h = d.dataset.action;
          h && (h === "open" ? this.config.onAssignmentClick?.(l) : await this.config.onActionClick?.(h, l));
        });
      }), o.addEventListener("click", () => {
        this.config.onAssignmentClick?.(l);
      });
    }), this.container.querySelectorAll(".summary-card").forEach((o) => {
      o.addEventListener("click", () => {
        const a = o.dataset.summary;
        a === "review" ? this.setActivePreset("review") : a === "due_soon" || a === "overdue" ? this.setActivePreset("due_soon") : this.setActivePreset("all");
      });
    });
  }
}
function R(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Be(n) {
  return n.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function so(n) {
  switch (n) {
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
function io(n) {
  switch (n) {
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
function oo(n) {
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function ao(n) {
  const e = /* @__PURE__ */ new Date(), t = n.getTime() - e.getTime(), r = Math.ceil(t / (1e3 * 60 * 60 * 24));
  return r < 0 ? `${Math.abs(r)}d overdue` : r === 0 ? "Today" : r === 1 ? "Tomorrow" : r <= 7 ? `${r}d` : n.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function sl() {
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
function lo(n, e) {
  const t = new no(e);
  return t.mount(n), t;
}
function il(n) {
  const e = n.dataset.myWorkEndpoint;
  return e ? lo(n, {
    myWorkEndpoint: e,
    panelBaseUrl: n.dataset.panelBaseUrl,
    queueEndpoint: n.dataset.queueEndpoint,
    refreshInterval: parseInt(n.dataset.refreshInterval || "0", 10)
  }) : (console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null);
}
const co = {
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
class uo {
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
    const t = { ...co, ...e.labels || {} };
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
        const i = await s.json();
        return this.handleValidationResult(i), i;
      } else
        throw new Error("No file or data to validate");
      const t = await fetch(this.config.validateEndpoint, {
        method: "POST",
        body: e
      });
      if (!t.ok)
        throw new Error(`Validation failed: ${t.status}`);
      const r = await t.json();
      return this.handleValidationResult(r), r;
    } catch (e) {
      return this.error = e instanceof Error ? e : new Error(String(e)), this.state = "error", this.config.onError?.(this.error), this.render(), null;
    }
  }
  /**
   * Apply the import with selected rows
   */
  async apply(e) {
    const t = { ...this.applyOptions, ...e }, r = t.selectedIndices || this.getSelectedIndices();
    if (r.length === 0)
      return this.error = new Error(this.config.labels.noRowsSelected), this.render(), null;
    if (this.config.capabilityGate) {
      const s = this.config.capabilityGate.gateAction("exchange", "import.apply");
      if (!s.enabled)
        return this.error = new Error(s.reason || this.config.labels.applyDisabledReason), this.render(), null;
    }
    this.state = "applying", this.error = null, this.render();
    try {
      const o = {
        rows: (this.validationResult?.results.filter(
          (c) => r.includes(c.index)
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
        body: JSON.stringify(o)
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
    const r = this.previewRows.find((s) => s.index === e);
    r && (r.resolution = t, this.render());
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
      <div class="exchange-import" role="dialog" aria-label="${E(e.title)}">
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
        <h3 class="import-title">${E(e.title)}</h3>
        ${this.validationResult ? this.renderSummaryBadges() : ""}
      </div>
    `;
  }
  renderSummaryBadges() {
    if (!this.validationResult) return "";
    const e = this.validationResult.summary, t = this.config.labels;
    return `
      <div class="import-summary-badges">
        <span class="summary-badge success">${e.succeeded} ${E(t.success)}</span>
        <span class="summary-badge error">${e.failed} ${E(t.error)}</span>
        <span class="summary-badge conflict">${e.conflicts} ${E(t.conflict)}</span>
        <span class="summary-badge skipped">${e.skipped} ${E(t.skipped)}</span>
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
          <span class="dropzone-text">${E(e.selectFile)}</span>
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
        <p>${E(e)}</p>
      </div>
    `;
  }
  renderPreviewGrid() {
    const e = this.config.labels, t = this.getSelectedIndices().length, r = this.previewRows.length;
    return `
      <div class="import-preview">
        <div class="preview-toolbar">
          <div class="selection-controls">
            <button type="button" class="select-all-btn">${E(e.selectAll)}</button>
            <button type="button" class="deselect-all-btn">${E(e.deselectAll)}</button>
            <span class="selection-count">${t} / ${r} ${E(e.selectedCount)}</span>
          </div>
          <div class="import-options">
            <label class="option-checkbox">
              <input type="checkbox" name="allowCreateMissing" ${this.applyOptions.allowCreateMissing ? "checked" : ""} />
              ${E(e.allowCreateMissing)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="continueOnError" ${this.applyOptions.continueOnError ? "checked" : ""} />
              ${E(e.continueOnError)}
            </label>
            <label class="option-checkbox">
              <input type="checkbox" name="dryRun" ${this.applyOptions.dryRun ? "checked" : ""} />
              ${E(e.dryRun)}
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
                <th scope="col">${E(e.resource)}</th>
                <th scope="col">${E(e.field)}</th>
                <th scope="col">${E(e.status)}</th>
                <th scope="col">${E(e.translatedText)}</th>
                <th scope="col">${E(e.conflictResolution)}</th>
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
    const t = ho(e.status), r = e.status === "error", s = Ke(e.status, {
      domain: "exchange",
      size: "sm"
    });
    return `
      <tr class="preview-row ${t} ${e.isSelected ? "selected" : ""}" data-index="${e.index}">
        <td class="select-col">
          <input type="checkbox" class="row-checkbox" ${e.isSelected ? "checked" : ""} ${r ? "disabled" : ""} />
        </td>
        <td class="resource-cell">
          <span class="resource-type">${E(e.resource)}</span>
          <span class="entity-id">${E(e.entityId)}</span>
        </td>
        <td class="field-cell">${E(e.fieldPath)}</td>
        <td class="status-cell">
          ${s}
          ${e.error ? `<span class="error-message" title="${tt(e.error)}">${E(po(e.error, 30))}</span>` : ""}
        </td>
        <td class="translation-cell">
          <span class="translation-text" title="${tt(e.targetLocale)}">${E(e.targetLocale)}</span>
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
        <option value="skip" ${r === "skip" ? "selected" : ""}>${E(t.skip)}</option>
        <option value="keep_current" ${r === "keep_current" ? "selected" : ""}>${E(t.keepCurrent)}</option>
        <option value="accept_incoming" ${r === "accept_incoming" ? "selected" : ""}>${E(t.acceptIncoming)}</option>
        <option value="force" ${r === "force" ? "selected" : ""}>${E(t.force)}</option>
      </select>
      ${e.conflict ? `<button type="button" class="conflict-details-btn" data-index="${e.index}" title="${tt(t.conflictDetails)}">?</button>` : ""}
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
        <p class="error-message">${E(this.error?.message || e.error)}</p>
        <button type="button" class="reset-btn">${E(e.cancelButton)}</button>
      </div>
    `;
  }
  renderFooter() {
    const e = this.config.labels, t = this.state === "validated" && this.getSelectedIndices().length > 0, r = this.getApplyGate();
    return `
      <div class="import-footer">
        <button type="button" class="cancel-btn">${E(e.cancelButton)}</button>
        ${this.state === "idle" ? `
          <button type="button" class="validate-btn" ${!this.file && !this.rawData ? "disabled" : ""}>
            ${E(e.validateButton)}
          </button>
        ` : ""}
        ${this.state === "validated" ? `
          <button type="button"
                  class="apply-btn"
                  ${!t || !r.enabled ? "disabled" : ""}
                  ${r.enabled ? "" : `aria-disabled="true" title="${tt(r.reason || e.applyDisabledReason)}"`}>
            ${E(e.applyButton)}
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
    this.container.querySelector(".file-input")?.addEventListener("change", (p) => {
      const f = p.target;
      f.files?.[0] && this.setFile(f.files[0]);
    }), this.container.querySelector(".data-input")?.addEventListener("input", (p) => {
      const f = p.target;
      this.rawData = f.value;
    }), this.container.querySelector(".validate-btn")?.addEventListener("click", () => this.validate()), this.container.querySelector(".apply-btn")?.addEventListener("click", () => this.apply()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".reset-btn")?.addEventListener("click", () => this.reset()), this.container.querySelector(".select-all-btn")?.addEventListener("click", () => this.selectAll()), this.container.querySelector(".deselect-all-btn")?.addEventListener("click", () => this.deselectAll()), this.container.querySelector(".select-all-checkbox")?.addEventListener("change", (p) => {
      p.target.checked ? this.selectAll() : this.deselectAll();
    }), this.container.querySelectorAll(".row-checkbox").forEach((p) => {
      p.addEventListener("change", () => {
        const f = p.closest(".preview-row"), m = parseInt(f?.dataset.index || "", 10);
        isNaN(m) || this.toggleRowSelection(m);
      });
    }), this.container.querySelectorAll(".resolution-select").forEach((p) => {
      p.addEventListener("change", () => {
        const f = parseInt(p.dataset.index || "", 10);
        isNaN(f) || this.setRowResolution(f, p.value);
      });
    }), this.container.querySelectorAll(".option-checkbox input").forEach((p) => {
      p.addEventListener("change", () => {
        const f = p.name;
        f && this.setApplyOption(f, p.checked);
      });
    });
  }
}
function E(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function tt(n) {
  return n.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ho(n) {
  switch (n) {
    case "success":
      return "status-success";
    case "error":
      return "status-error";
    case "conflict":
      return "status-conflict";
    case "skipped":
      return "status-skipped";
    default:
      return "";
  }
}
function po(n, e) {
  return n.length <= e ? n : n.slice(0, e - 3) + "...";
}
function ol() {
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
function fo(n, e) {
  const t = new uo(e);
  return t.mount(n), t;
}
function al(n) {
  const e = n.dataset.validateEndpoint, t = n.dataset.applyEndpoint;
  return !e || !t ? (console.warn("ExchangeImport: Missing required data attributes"), null) : fo(n, {
    validateEndpoint: e,
    applyEndpoint: t
  });
}
const go = {
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
}, mo = 2e3, bo = 300, yo = "async_job_";
class vn {
  constructor(e = {}) {
    this.container = null, this.job = null, this.pollingState = "idle", this.pollTimer = null, this.pollAttempts = 0, this.startTime = null, this.error = null;
    const t = { ...go, ...e.labels || {} };
    this.config = {
      storageKeyPrefix: e.storageKeyPrefix || yo,
      pollInterval: e.pollInterval || mo,
      maxPollAttempts: e.maxPollAttempts || bo,
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
      const t = this.getStorageKey(e.kind), r = localStorage.getItem(t);
      if (r) {
        const s = JSON.parse(r);
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
      <div class="async-progress" role="region" aria-label="${B(e.title)}">
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
          <h4 class="progress-title">${B(e.title)}</h4>
          <span class="progress-status">${B(e.noActiveJob)}</span>
        </div>
      `;
    const t = vo(this.job.status), r = this.getStatusLabel(), s = this.pollingState === "paused" ? `<span class="progress-status ${t}">${B(r)}</span>` : Ke(this.job.status, { domain: "exchange", size: "sm" });
    return `
      <div class="progress-header ${t}">
        <h4 class="progress-title">${B(e.title)}</h4>
        ${s}
      </div>
    `;
  }
  renderContent() {
    if (!this.job)
      return "";
    const e = this.config.labels, t = this.job.progress;
    t.total || t.processed + 1;
    const r = t.total ? Math.round(t.processed / t.total * 100) : null;
    return `
      <div class="progress-content">
        ${this.renderProgressBar(r)}
        <div class="progress-counters">
          <span class="counter processed">
            <span class="counter-label">${B(e.processed)}:</span>
            <span class="counter-value">${t.processed}${t.total ? ` / ${t.total}` : ""}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${B(e.succeeded)}:</span>
            <span class="counter-value">${t.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${B(e.failedCount)}:</span>
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
          <span class="info-label">${B(e.jobId)}:</span>
          <code class="info-value">${B(this.job.id)}</code>
        </span>
        ${t ? `
          <span class="info-item">
            <span class="info-label">${B(e.elapsed)}:</span>
            <span class="info-value">${B(t)}</span>
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
          <span class="conflicts-label">${B(e.conflicts)}:</span>
          <span class="conflicts-count">${t.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(t.by_type).map(([r, s]) => `
              <span class="conflict-type">
                <span class="type-name">${B(r)}:</span>
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
        <span class="error-message">${B(e)}</span>
      </div>
    ` : "";
  }
  renderFooter() {
    const e = this.config.labels, t = [];
    return this.pollingState === "paused" && t.push(`<button type="button" class="resume-btn">${B(e.resume)}</button>`), this.pollingState === "polling" && t.push(`<button type="button" class="cancel-btn">${B(e.cancel)}</button>`), (this.error || this.job?.status === "failed") && t.push(`<button type="button" class="retry-btn">${B(e.retry)}</button>`), (this.job?.status === "completed" || this.job?.status === "failed") && t.push(`<button type="button" class="dismiss-btn">${B(e.dismiss)}</button>`), t.length === 0 ? "" : `
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
    const t = (/* @__PURE__ */ new Date()).getTime() - this.startTime.getTime(), r = Math.floor(t / 1e3);
    if (r < 60)
      return `${r}s`;
    const s = Math.floor(r / 60), i = r % 60;
    if (s < 60)
      return `${s}m ${i}s`;
    const o = Math.floor(s / 60), a = s % 60;
    return `${o}h ${a}m`;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelector(".resume-btn")?.addEventListener("click", () => this.resumePolling()), this.container.querySelector(".cancel-btn")?.addEventListener("click", () => this.stopPolling()), this.container.querySelector(".retry-btn")?.addEventListener("click", () => this.retry()), this.container.querySelector(".dismiss-btn")?.addEventListener("click", () => this.reset());
  }
}
function B(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function vo(n) {
  switch (n) {
    case "running":
      return "status-running";
    case "completed":
      return "status-completed";
    case "failed":
      return "status-failed";
    default:
      return "";
  }
}
function ll() {
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
function wo(n, e) {
  const t = new vn(e);
  return t.mount(n), t;
}
function cl(n) {
  const e = n.dataset.pollInterval ? parseInt(n.dataset.pollInterval, 10) : void 0, t = n.dataset.autoStart !== "false";
  return wo(n, {
    pollInterval: e,
    autoStart: t
  });
}
function dl(n, e) {
  const t = new vn(e);
  return t.hasPersistedJob(n) ? t : null;
}
const Tt = {
  sourceColumn: "Source",
  targetColumn: "Translation",
  driftBannerTitle: "Source content has changed",
  driftBannerDescription: "The source content has been updated since this translation was last edited.",
  driftAcknowledgeButton: "Acknowledge",
  driftViewChangesButton: "View Changes",
  copySourceButton: "Copy from source",
  fieldChangedIndicator: "Source changed"
};
function xo(n) {
  const e = {
    sourceHash: null,
    sourceVersion: null,
    changedFieldsSummary: { count: 0, fields: [] },
    hasDrift: !1
  };
  if (!n || typeof n != "object")
    return e;
  const t = n.source_target_drift;
  if (t && typeof t == "object") {
    e.sourceHash = typeof t.source_hash == "string" ? t.source_hash : null, e.sourceVersion = typeof t.source_version == "string" ? t.source_version : null;
    const r = t.changed_fields_summary;
    r && typeof r == "object" && (e.changedFieldsSummary.count = typeof r.count == "number" ? r.count : 0, e.changedFieldsSummary.fields = Array.isArray(r.fields) ? r.fields.filter((s) => typeof s == "string") : []), e.hasDrift = e.changedFieldsSummary.count > 0 || e.changedFieldsSummary.fields.length > 0;
  }
  return e;
}
function So(n, e) {
  return !n || !n.hasDrift ? !1 : n.changedFieldsSummary.fields.some(
    (t) => t.toLowerCase() === e.toLowerCase()
  );
}
function ul(n) {
  return !n || !n.hasDrift ? [] : [...n.changedFieldsSummary.fields];
}
class Co {
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
      labels: { ...Tt, ...e.labels }
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
    const { drift: e, labels: t, sourceLocale: r, targetLocale: s, fields: i } = this.config, o = this.shouldShowDriftBanner() ? this.renderDriftBanner(e, t) : "", a = i.map((l) => this.renderFieldRow(l, t)).join("");
    return `
      <div class="side-by-side-editor" data-source-locale="${r}" data-target-locale="${s}">
        ${o}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${ee(t.sourceColumn)}</span>
              <span class="sbs-locale-badge">${r.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${ee(t.targetColumn)}</span>
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
    const r = { ...Tt, ...t }, s = e.changedFieldsSummary.count, i = e.changedFieldsSummary.fields, o = i.length > 0 ? `<ul class="sbs-drift-fields-list">${i.map((a) => `<li>${ee(a)}</li>`).join("")}</ul>` : "";
    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${ee(r.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${ee(r.driftBannerDescription)}
            ${s > 0 ? `<span class="sbs-drift-count">${s} field${s !== 1 ? "s" : ""} changed.</span>` : ""}
          </p>
          ${o}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${ee(r.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }
  /**
   * Render a single field row
   */
  renderFieldRow(e, t) {
    const r = { ...Tt, ...t }, s = e.hasSourceChanged ? `<span class="sbs-field-changed" title="${ee(r.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>` : "", i = this.renderSourceField(e), o = this.renderTargetField(e), a = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${j(e.key)}"
              title="${j(r.copySourceButton)}"
              aria-label="${j(r.copySourceButton)} for ${j(e.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;
    return `
      <div class="${e.hasSourceChanged ? "sbs-field-row sbs-field-changed-row" : "sbs-field-row"}" data-field-key="${j(e.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${ee(e.label)}
            ${e.required ? '<span class="sbs-required">*</span>' : ""}
          </label>
          ${s}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${i}
          </div>
          <div class="sbs-field-actions">
            ${a}
          </div>
          <div class="sbs-target-field">
            ${o}
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render source field (read-only)
   */
  renderSourceField(e) {
    const t = ee(e.sourceValue || "");
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${j(e.key)}"
             aria-label="Source: ${j(e.label)}">
          ${t || '<span class="sbs-empty">Empty</span>'}
        </div>
      ` : `
      <div class="sbs-source-content sbs-text-field"
           data-field="${j(e.key)}"
           aria-label="Source: ${j(e.label)}">
        ${t || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }
  /**
   * Render target field (editable)
   */
  renderTargetField(e) {
    const t = ee(e.targetValue || ""), r = e.placeholder ? `placeholder="${j(e.placeholder)}"` : "", s = e.required ? "required" : "", i = e.maxLength ? `maxlength="${e.maxLength}"` : "";
    return e.type === "textarea" || e.type === "richtext" || e.type === "html" ? `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${j(e.key)}"
                  data-field="${j(e.key)}"
                  aria-label="Translation: ${j(e.label)}"
                  ${r}
                  ${s}
                  ${i}>${t}</textarea>
      ` : `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${j(e.key)}"
             data-field="${j(e.key)}"
             value="${t}"
             aria-label="Translation: ${j(e.label)}"
             ${r}
             ${s}
             ${i}>
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
      t.addEventListener("click", (r) => {
        const s = r.currentTarget.dataset.field;
        s && this.copySourceToTarget(s);
      });
    }), this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      t.addEventListener("input", (r) => {
        const s = r.target, i = s.dataset.field;
        i && this.config.onChange && this.config.onChange(i, s.value);
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
    const r = this.container?.querySelector(
      `.sbs-target-input[data-field="${e}"]`
    );
    if (r) {
      r.value = t.sourceValue || "";
      const s = new Event("input", { bubbles: !0 });
      r.dispatchEvent(s);
    }
    this.config.onCopySource && this.config.onCopySource(e);
  }
  /**
   * Get current field values
   */
  getValues() {
    const e = {};
    return this.container && this.container.querySelectorAll(".sbs-target-input").forEach((t) => {
      const r = t.dataset.field;
      r && (e[r] = t.value);
    }), e;
  }
  /**
   * Set field value programmatically
   */
  setValue(e, t) {
    const r = this.container?.querySelector(
      `.sbs-target-input[data-field="${e}"]`
    );
    r && (r.value = t);
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
function Eo(n) {
  const e = new Co(n);
  return e.render(), e;
}
function hl(n, e, t, r, s) {
  const i = xo(e), o = r.map((a) => ({
    key: a,
    label: a.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    type: "text",
    hasSourceChanged: So(i, a),
    sourceValue: String(t[a] || ""),
    targetValue: String(e[a] || ""),
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || ""
  }));
  return Eo({
    container: n,
    fields: o,
    drift: i,
    sourceLocale: s.sourceLocale || "en",
    targetLocale: s.targetLocale || "",
    panelName: s.panelName || "",
    recordId: s.recordId || "",
    ...s
  });
}
function pl() {
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
function ee(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function j(n) {
  return n.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export {
  Ln as ActionRenderer,
  oa as AdvancedSearch,
  vn as AsyncProgress,
  hn as AutosaveIndicator,
  It as CORE_READINESS_DISPLAY,
  bn as CapabilityGate,
  Kn as CellRendererRegistry,
  qi as CharacterCounter,
  vs as ColumnManager,
  Zo as CommonRenderers,
  ro as DEFAULT_FILTER_PRESETS,
  gn as DEFAULT_INTERPOLATION_PATTERNS,
  Fi as DEFAULT_SAMPLE_VALUES,
  Tt as DEFAULT_SIDE_BY_SIDE_LABELS,
  pi as DEFAULT_STATUS_LEGEND_ITEMS,
  sn as DEFAULT_TRANSLATION_QUICK_FILTERS,
  Ft as DISABLED_REASON_DISPLAY,
  Gt as DataGrid,
  ci as DefaultColumnVisibilityBehavior,
  Ni as DirectionToggle,
  Ot as EXCHANGE_JOB_STATUS_DISPLAY,
  Bt as EXCHANGE_ROW_STATUS_DISPLAY,
  uo as ExchangeImport,
  nr as FallbackBanner,
  aa as FilterBuilder,
  pa as GoCrudBulkActionBehavior,
  ha as GoCrudExportBehavior,
  ca as GoCrudFilterBehavior,
  da as GoCrudPaginationBehavior,
  la as GoCrudSearchBehavior,
  ua as GoCrudSortBehavior,
  an as InlineLocaleChips,
  ji as InterpolationPreview,
  cn as KeyboardShortcutRegistry,
  bt as LocaleActionChip,
  di as PayloadInputModal,
  Mt as QUEUE_CONTENT_STATE_DISPLAY,
  Pt as QUEUE_DUE_STATE_DISPLAY,
  Rt as QUEUE_STATE_DISPLAY,
  gi as QuickFilters,
  hi as SchemaActionBuilder,
  fa as ServerColumnVisibilityBehavior,
  Co as SideBySideEditor,
  nn as StatusLegend,
  tr as TranslationBlockerModal,
  no as TranslatorDashboard,
  xi as applyFormLock,
  eo as applyGateToElement,
  Ii as applyShortcutSettings,
  $r as buildLocaleEditUrl,
  ga as buildSchemaRowActions,
  dl as checkForPersistedJob,
  ra as collapseAllGroups,
  wo as createAsyncProgress,
  Ea as createBulkCreateMissingHandler,
  Qa as createCapabilityGate,
  Za as createEmptyCapabilityGate,
  fo as createExchangeImport,
  Pa as createInlineLocaleChipsRenderer,
  Pn as createLocaleBadgeRenderer,
  Oo as createReasonCodeCellRenderer,
  Eo as createSideBySideEditor,
  Bo as createStatusCellRenderer,
  fi as createStatusLegend,
  Na as createTranslationAutosave,
  Wo as createTranslationMatrixRenderer,
  mi as createTranslationQuickFilters,
  Ai as createTranslationShortcuts,
  ar as createTranslationStatusRenderer,
  lo as createTranslatorDashboard,
  Fs as decodeExpandedGroupsToken,
  Ja as detectInterpolations,
  Di as dismissShortcutHint,
  Os as encodeExpandedGroupsToken,
  bi as executeBulkCreateMissing,
  ta as expandAllGroups,
  Ds as extractBackendSummaries,
  Gi as extractCapabilities,
  ml as extractExchangeError,
  ma as extractSchemaActions,
  xo as extractSourceTargetDrift,
  ge as extractTranslationContext,
  Z as extractTranslationReadiness,
  ln as formatShortcutDisplay,
  bl as generateExchangeReport,
  Mo as getAllReasonCodes,
  ll as getAsyncProgressStyles,
  Ha as getAutosaveIndicatorStyles,
  rl as getCapabilityGateStyles,
  ul as getChangedFields,
  Xa as getCharCountSeverity,
  qa as getDefaultShortcutRegistry,
  gt as getDisabledReasonDisplay,
  ol as getExchangeImportStyles,
  na as getExpandedGroupIds,
  Ya as getFieldHelperStyles,
  La as getFormLockReason,
  te as getLocaleLabel,
  Xo as getMissingTranslationsCount,
  $i as getModifierSymbol,
  Ts as getPersistedExpandState,
  Ps as getPersistedViewMode,
  Ei as getPrimaryModifierLabel,
  pl as getSideBySideEditorStyles,
  ft as getStatusDisplay,
  qo as getStatusVocabularyStyles,
  Ro as getStatusesForDomain,
  sl as getTranslatorDashboardStyles,
  vr as getViewModeForViewport,
  yl as groupRowResultsByStatus,
  Yr as hasBackendGroupedRows,
  So as hasFieldDrift,
  Jo as hasMissingTranslations,
  No as hasTranslationContext,
  zo as hasTranslationReadiness,
  cl as initAsyncProgress,
  nl as initCapabilityGating,
  al as initExchangeImport,
  Ta as initFallbackBanner,
  Ga as initFieldHelpers,
  Ua as initFormAutosave,
  Ia as initFormLock,
  Ma as initInlineLocaleChips,
  Ri as initKeyboardShortcuts,
  ja as initKeyboardShortcutsWithDiscovery,
  ka as initLocaleActionChips,
  wa as initQuickFilters,
  hl as initSideBySideEditorFromRecord,
  ya as initStatusLegends,
  il as initTranslatorDashboard,
  Fo as initializeVocabularyFromPayload,
  Wa as isCoreEnabled,
  Hi as isExchangeEnabled,
  vl as isExchangeError,
  Aa as isFormLocked,
  jo as isInFallbackMode,
  yt as isMacPlatform,
  Us as isNarrowViewport,
  Ui as isQueueEnabled,
  Ho as isReadyForTransition,
  _i as isShortcutHintDismissed,
  Io as isValidReasonCode,
  To as isValidStatus,
  Li as loadShortcutSettings,
  _s as mergeBackendSummaries,
  xs as normalizeBackendGroupedRows,
  zi as parseCapabilityMode,
  wl as parseImportResult,
  Bs as parseViewMode,
  Is as persistExpandState,
  yr as persistViewMode,
  Si as removeFormLock,
  za as renderAutosaveIndicator,
  Dn as renderAvailableLocalesIndicator,
  Ca as renderBulkResultInline,
  Sa as renderBulkResultSummary,
  Va as renderCharacterCounter,
  Ka as renderDirectionToggle,
  tl as renderDisabledReasonBadge,
  Ti as renderDiscoveryHint,
  _a as renderFallbackBannerFromRecord,
  Qo as renderFallbackWarning,
  el as renderGateAriaAttributes,
  Ns as renderGroupHeaderRow,
  qs as renderGroupHeaderSummary,
  Hs as renderGroupedEmptyState,
  ia as renderGroupedErrorState,
  sa as renderGroupedLoadingState,
  Ci as renderInlineLocaleChips,
  on as renderLocaleActionChip,
  $a as renderLocaleActionList,
  Rr as renderLocaleBadge,
  Ko as renderLocaleCompleteness,
  Yo as renderMissingTranslationsBadge,
  Vo as renderPublishReadinessBadge,
  xa as renderQuickFiltersHTML,
  Go as renderReadinessIndicator,
  Ir as renderReasonCodeBadge,
  Po as renderReasonCodeIndicator,
  Fa as renderShortcutSettingsUI,
  Ba as renderShortcutsHelpContent,
  Uo as renderStatusBadge,
  va as renderStatusLegendHTML,
  Rn as renderTranslationMatrixCell,
  Tn as renderTranslationStatusCell,
  Ke as renderVocabularyStatusBadge,
  Tr as renderVocabularyStatusIcon,
  Oa as saveShortcutSettings,
  Da as shouldShowFallbackBanner,
  Ra as shouldShowInlineLocaleChips,
  ba as showTranslationBlocker,
  ea as toggleGroupExpand,
  ws as transformToGroups
};
//# sourceMappingURL=index.js.map

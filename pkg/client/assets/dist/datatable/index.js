import { F as qe } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as lr, executeActionRequest as Lt, isTranslationBlocker as Ur, extractTranslationBlocker as Gr, formatStructuredErrorForDisplay as Vr } from "../toast/error-helpers.js";
import { extractExchangeError as ia, generateExchangeReport as oa, groupRowResultsByStatus as aa, isExchangeError as la, parseImportResult as ca } from "../toast/error-helpers.js";
import { M as _t, e as m, T as zt } from "../chunks/modal-DXPBR0f5.js";
import { b as Ze, a as Kr } from "../chunks/badge-CqKzZ9y5.js";
import { r as Yr } from "../chunks/icon-renderer-CRbgoQtj.js";
let Jr = class cr extends _t {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = r;
  }
  static prompt(e) {
    return new Promise((t) => {
      new cr(
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
          <h3 class="text-lg font-semibold text-gray-900">${m(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${m(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${m(this.config.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), r = () => {
      this.clearErrors();
      const n = {};
      let i = null;
      for (const o of this.config.fields) {
        const a = this.container?.querySelector(
          `[data-payload-field="${o.name}"]`
        );
        if (!a)
          continue;
        const l = a.value.trim();
        n[o.name] = l, l || (i || (i = a), this.showFieldError(o.name, "This field is required."));
      }
      if (i) {
        i.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(n), this.hide();
    };
    e?.addEventListener("submit", (n) => {
      n.preventDefault(), r();
    }), t?.addEventListener("click", () => {
      this.hide();
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${m(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${m(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, n = (e.options || []).map((i) => {
      const o = i.value === t ? " selected" : "";
      return `<option value="${m(i.value)}"${o}>${m(i.label)}</option>`;
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${m(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${m(e.value)}"
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
class Wr {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new qe();
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
      const o = this.getVariantClass(i.variant || "secondary"), a = i.icon ? this.renderIcon(i.icon) : "", l = i.className || "", c = i.disabled === !0, d = c ? "opacity-50 cursor-not-allowed" : "", u = c ? 'aria-disabled="true"' : "", h = i.disabledReason ? `title="${this.escapeHtml(i.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${o} ${l} ${d}"
          data-action-id="${this.sanitize(i.label)}"
          data-record-id="${e.id}"
          data-disabled="${c}"
          ${u}
          ${h}
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
    const n = `actions-menu-${e.id}`, i = this.buildDropdownItems(e, r);
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
          ${i}
        </div>
      </div>
    `;
  }
  /**
   * Build dropdown menu items HTML
   */
  buildDropdownItems(e, t) {
    return t.map((r, n) => {
      const i = r.variant === "danger", o = r.disabled === !0, a = r.icon ? this.renderIcon(r.icon) : "", c = this.shouldShowDivider(r, n, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", d = o ? "action-item text-gray-400 cursor-not-allowed" : i ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", u = o ? 'aria-disabled="true"' : "", h = r.disabledReason ? `title="${this.escapeHtml(r.disabledReason)}"` : "";
      return `
        ${c}
        <button type="button"
                class="${d} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(r.label)}"
                data-record-id="${e.id}"
                data-disabled="${o}"
                role="menuitem"
                ${u}
                ${h}>
          <span class="flex-shrink-0 w-5 h-5">${a}</span>
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
    t.forEach((n) => {
      e.querySelectorAll(
        `[data-action-id="${this.sanitize(n.label)}"]`
      ).forEach((o) => {
        const a = o, l = a.dataset.recordId, c = r[l];
        c && a.addEventListener("click", async (d) => {
          if (d.preventDefault(), !(a.getAttribute("aria-disabled") === "true" || a.dataset.disabled === "true"))
            try {
              await n.action(c);
            } catch (u) {
              console.error(`Action "${n.label}" failed:`, u);
              const h = u instanceof Error ? u.message : `Action "${n.label}" failed`;
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
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const n = document.createElement("div");
    n.className = "flex gap-2 flex-1", e.forEach((o) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = o.id, o.icon ? a.innerHTML = `${this.renderIcon(o.icon)} ${o.label}` : a.textContent = o.label, n.appendChild(a);
    }), t.appendChild(n);
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
      const n = e.confirm.replace("{count}", t.length.toString());
      if (!await this.notifier.confirm(n))
        return;
    }
    const r = await this.resolveBulkActionPayload(e, t);
    if (r !== null)
      try {
        const n = await fetch(e.endpoint, {
          method: e.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(r)
        });
        if (!n.ok) {
          const o = await lr(n);
          throw this.notifier.error(o), new Error(o);
        }
        const i = await n.json();
        this.notifier.success(this.buildBulkSuccessMessage(e, i, t.length)), e.onSuccess && e.onSuccess(i);
      } catch (n) {
        if (console.error(`Bulk action "${e.id}" failed:`, n), !e.onError) {
          const i = n instanceof Error ? n.message : "Bulk action failed";
          this.notifier.error(i);
        }
        throw e.onError && e.onError(n), n;
      }
  }
  async resolveBulkActionPayload(e, t) {
    const r = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([l, c]) => {
      r[l] === void 0 && c && c.default !== void 0 && (r[l] = c.default);
    });
    const o = this.collectRequiredFields(e.payloadRequired, n).filter((l) => l !== "ids" && this.isEmptyPayloadValue(r[l]));
    if (o.length === 0)
      return r;
    const a = await this.requestRequiredFields(e, o, n, r);
    if (a === null)
      return null;
    for (const l of o) {
      const c = n?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        return this.notifier.error(u.error), null;
      r[l] = u.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), i = (o) => {
      const a = o.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((o) => i(String(o))), Array.isArray(t?.required) && t.required.forEach((o) => i(String(o))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([n, i]) => {
      i && typeof i == "object" && (r[n] = i);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, n) {
    const i = t.map((o) => {
      const a = r?.properties?.[o], l = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: o,
        label: (a?.title || o).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[o] !== void 0 ? n[o] : a?.default),
        type: l,
        options: this.buildSchemaOptions(a)
      };
    });
    return Jr.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: i
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((r) => r && Object.prototype.hasOwnProperty.call(r, "const")).map((r) => {
          const n = this.stringifyPromptDefault(r.const), i = typeof r.title == "string" && r.title.trim() ? r.title.trim() : n;
          return { value: n, label: i };
        });
        return t.length > 0 ? t : void 0;
      }
      if (Array.isArray(e.enum) && e.enum.length > 0) {
        const t = e.enum.map((r) => {
          const n = this.stringifyPromptDefault(r);
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
    const n = (r?.type || "string").toLowerCase();
    if (e === "")
      return { value: "" };
    let i = e;
    switch (n) {
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
          if (n === "array" && !Array.isArray(o))
            return { value: e, error: `${t} must be a JSON array.` };
          if (n === "object" && (o === null || Array.isArray(o) || typeof o != "object"))
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
    const n = e.label || e.id || "Bulk action", i = t && typeof t == "object" ? t.summary : null, o = i && typeof i.succeeded == "number" ? i.succeeded : typeof t?.processed == "number" ? t.processed : r, a = i && typeof i.failed == "number" ? i.failed : 0;
    return a > 0 ? `${n} completed: ${o} succeeded, ${a} failed.` : `${n} completed for ${o} item${o === 1 ? "" : "s"}.`;
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
  sanitize(e) {
    return e.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function ae(s) {
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
  return !s || typeof s != "object" || (e.requestedLocale = ge(s, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = ge(s, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = sn(s, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = Ut(s, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = Ut(s, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = ge(s, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = ge(s, ["status"]), e.entityType = ge(s, ["entity_type", "type", "_type"]), e.recordId = ge(s, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function Bi(s) {
  const e = ae(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Oi(s) {
  const e = ae(s);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function V(s) {
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
  if (!s || typeof s != "object")
    return e;
  const t = s.translation_readiness;
  if (t && typeof t == "object") {
    e.hasReadinessMetadata = !0, e.translationGroupId = typeof t.translation_group_id == "string" ? t.translation_group_id : null, e.requiredLocales = Array.isArray(t.required_locales) ? t.required_locales.filter((o) => typeof o == "string") : [], e.availableLocales = Array.isArray(t.available_locales) ? t.available_locales.filter((o) => typeof o == "string") : [], e.missingRequiredLocales = Array.isArray(t.missing_required_locales) ? t.missing_required_locales.filter((o) => typeof o == "string") : [];
    const r = t.missing_required_fields_by_locale;
    if (r && typeof r == "object" && !Array.isArray(r))
      for (const [o, a] of Object.entries(r))
        Array.isArray(a) && (e.missingRequiredFieldsByLocale[o] = a.filter(
          (l) => typeof l == "string"
        ));
    const n = t.readiness_state;
    typeof n == "string" && Xr(n) && (e.readinessState = n);
    const i = t.ready_for_transition;
    if (i && typeof i == "object" && !Array.isArray(i))
      for (const [o, a] of Object.entries(i))
        typeof a == "boolean" && (e.readyForTransition[o] = a);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function Fi(s) {
  return V(s).hasReadinessMetadata;
}
function qi(s, e) {
  return V(s).readyForTransition[e] === !0;
}
function Xr(s) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(s);
}
function dr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : ae(s), { showFallbackIndicator: r = !0, size: n = "default", extraClass: i = "" } = e;
  if (!t.resolvedLocale)
    return "";
  const o = t.resolvedLocale.toUpperCase(), a = t.fallbackUsed || t.missingRequestedLocale, c = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
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
function Qr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : ae(s), { maxLocales: r = 3, size: n = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const i = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", o = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, r), l = t.availableLocales.length - r, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${o} rounded bg-blue-100 text-blue-700 font-medium` : `${o} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${o} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${i}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function Zr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : ae(s), { showResolvedLocale: r = !0, size: n = "default" } = e, i = [];
  return r && t.resolvedLocale && i.push(dr(t, { size: n, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && i.push(Qr(t, { ...e, size: n })), i.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${i.join("")}</div>`;
}
function Ni(s, e = "default") {
  if (!s)
    return "";
  const t = s.toLowerCase();
  return Ze(s, "status", t, { size: e === "sm" ? "sm" : void 0 });
}
function ji(s, e = {}) {
  const t = V(s);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: r = "default", showDetailedTooltip: n = !0, extraClass: i = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${r === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: h, tooltip: f } = en(l, t, n);
  return `<span class="${a} ${u} ${h} ${i}"
                title="${f}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function zi(s, e = {}) {
  const t = V(s);
  if (!t.hasReadinessMetadata)
    return "";
  const r = t.readyForTransition.publish === !0, { size: n = "default", extraClass: i = "" } = e, o = n === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
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
function Hi(s, e = {}) {
  const t = V(s);
  if (!t.hasReadinessMetadata || t.requiredLocales.length === 0)
    return "";
  const { size: r = "default", extraClass: n = "" } = e, i = r === "sm" ? "text-xs" : "text-sm", o = t.requiredLocales.length, a = t.availableLocales.filter(
    (d) => t.requiredLocales.includes(d)
  ).length, c = o > 0 && a === o ? "text-green-600" : a > 0 ? "text-amber-600" : "text-gray-500";
  return `<span class="${i} ${c} font-medium ${n}"
                title="Locale completeness: ${a} of ${o} required locales available"
                aria-label="${a} of ${o} locales">
    ${a}/${o}
  </span>`;
}
function Ui(s, e = {}) {
  const t = V(s);
  if (!t.hasReadinessMetadata || t.readinessState === "ready")
    return "";
  const { size: r = "default", extraClass: n = "" } = e, i = r === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", o = t.missingRequiredLocales.length, a = o > 0, l = Object.keys(t.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", u = "", h = "";
  return a && l ? (c = "bg-red-100", d = "text-red-800", u = `${o} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : a ? (c = "bg-amber-100", d = "text-amber-800", u = `${o} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", u = "Incomplete", h = `Incomplete fields in: ${Object.keys(t.missingRequiredFieldsByLocale).join(", ")}`), u ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${i} ${c} ${d} ${n}"
                title="${h}"
                aria-label="${h}"
                data-missing-translations="true"
                data-missing-count="${o}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>` : "";
}
function Gi(s) {
  const e = V(s);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function Vi(s) {
  return V(s).missingRequiredLocales.length;
}
function en(s, e, t) {
  const r = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>', n = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
  switch (s) {
    case "ready":
      return {
        icon: r,
        label: "Ready",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        tooltip: "All required translations are complete"
      };
    case "missing_locales": {
      const i = e.missingRequiredLocales, o = t && i.length > 0 ? `Missing translations: ${i.join(", ")}` : "Missing required translations";
      return {
        icon: n,
        label: `${i.length} missing`,
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        tooltip: o
      };
    }
    case "missing_fields": {
      const i = Object.keys(e.missingRequiredFieldsByLocale), o = t && i.length > 0 ? `Incomplete fields in: ${i.join(", ")}` : "Some translations have missing required fields";
      return {
        icon: n,
        label: "Incomplete",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        tooltip: o
      };
    }
    case "missing_locales_and_fields": {
      const i = e.missingRequiredLocales, o = Object.keys(e.missingRequiredFieldsByLocale), a = [];
      i.length > 0 && a.push(`Missing: ${i.join(", ")}`), o.length > 0 && a.push(`Incomplete: ${o.join(", ")}`);
      const l = t ? a.join("; ") : "Missing translations and incomplete fields";
      return {
        icon: n,
        label: "Not ready",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        tooltip: l
      };
    }
    default:
      return {
        icon: "",
        label: "Unknown",
        bgClass: "bg-gray-100",
        textClass: "text-gray-600",
        tooltip: "Unknown readiness state"
      };
  }
}
function tn(s, e = {}) {
  const { size: t = "sm", maxLocales: r = 5, showLabels: n = !1 } = e, i = V(s);
  if (!i.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: o, availableLocales: a, missingRequiredFieldsByLocale: l } = i, c = o.length > 0 ? o : a;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(a), u = rn(l), h = c.slice(0, r).map((g) => {
    const b = d.has(g), C = b && u.has(g), k = b && !C;
    let E, R, D;
    k ? (E = "bg-green-100 text-green-700 border-green-300", R = "●", D = "Complete") : C ? (E = "bg-amber-100 text-amber-700 border-amber-300", R = "◐", D = "Incomplete") : (E = "bg-white text-gray-400 border-gray-300 border-dashed", R = "○", D = "Missing");
    const W = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", z = n ? `<span class="font-medium">${g.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${W} rounded border ${E}"
              title="${g.toUpperCase()}: ${D}"
              aria-label="${g.toUpperCase()}: ${D}"
              data-locale="${g}"
              data-state="${D.toLowerCase()}">
          ${z}
          <span aria-hidden="true">${R}</span>
        </span>
      `;
  }).join(""), f = c.length > r ? `<span class="text-[10px] text-gray-500" title="${c.length - r} more locales">+${c.length - r}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${h}${f}</div>`;
}
function rn(s) {
  const e = /* @__PURE__ */ new Set();
  if (s && typeof s == "object")
    for (const [t, r] of Object.entries(s))
      Array.isArray(r) && r.length > 0 && e.add(t);
  return e;
}
function Ki(s = {}) {
  return (e, t, r) => tn(t, s);
}
function Yi(s, e = {}) {
  if (!s.fallbackUsed && !s.missingRequestedLocale)
    return "";
  const { showCreateButton: t = !0, createTranslationUrl: r, panelName: n } = e, i = s.requestedLocale || "requested locale", o = s.resolvedLocale || "default", a = t ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${s.requestedLocale || ""}"
            data-panel="${n || ""}"
            data-record-id="${s.recordId || ""}"
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
function Ht(s = {}) {
  return (e, t, r) => Zr(t, s);
}
function nn(s = {}) {
  return (e, t, r) => dr(t, s);
}
function ge(s, e) {
  for (const t of e) {
    const r = Dt(s, t);
    if (typeof r == "string" && r.trim())
      return r;
  }
  return null;
}
function sn(s, e) {
  for (const t of e) {
    const r = Dt(s, t);
    if (Array.isArray(r))
      return r.filter((n) => typeof n == "string");
  }
  return [];
}
function Ut(s, e) {
  for (const t of e) {
    const r = Dt(s, t);
    if (typeof r == "boolean")
      return r;
    if (r === "true") return !0;
    if (r === "false") return !1;
  }
  return !1;
}
function Dt(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
const Q = '<span class="text-gray-400">-</span>', on = [
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
function Le(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function an(s) {
  try {
    return JSON.stringify(s);
  } catch {
    return String(s);
  }
}
function ln(s) {
  const e = [], t = (n) => {
    if (typeof n != "string") return;
    const i = n.trim();
    !i || e.includes(i) || e.push(i);
  };
  t(s.display_key), t(s.displayKey);
  const r = s.display_keys ?? s.displayKeys;
  return Array.isArray(r) && r.forEach(t), e;
}
function cn(s, e) {
  if (!e) return;
  if (Object.prototype.hasOwnProperty.call(s, e))
    return s[e];
  if (!e.includes("."))
    return;
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (!r || typeof r != "object" || Array.isArray(r) || !Object.prototype.hasOwnProperty.call(r, n))
      return;
    r = r[n];
  }
  return r;
}
function dn(s) {
  if (s == null)
    return "";
  switch (typeof s) {
    case "string":
      return s.trim();
    case "number":
    case "bigint":
      return String(s);
    case "boolean":
      return s ? "true" : "false";
    default:
      return "";
  }
}
function yt(s, e) {
  if (s == null)
    return "";
  if (Array.isArray(s))
    return wt(s, e);
  if (typeof s != "object")
    return String(s);
  const r = [...ln(e), ...on], n = /* @__PURE__ */ new Set();
  for (const i of r) {
    if (n.has(i)) continue;
    n.add(i);
    const o = cn(s, i), a = dn(o);
    if (a)
      return a;
  }
  return an(s);
}
function wt(s, e) {
  if (!Array.isArray(s) || s.length === 0)
    return "";
  const t = s.map((o) => yt(o, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const r = Number(e.preview_limit ?? e.previewLimit ?? 3), n = Number.isFinite(r) && r > 0 ? Math.floor(r) : 3, i = t.slice(0, n);
  return t.length <= n ? i.join(", ") : `${i.join(", ")} +${t.length - n} more`;
}
function un(s, e, t, r) {
  const n = s[e] ?? s[t] ?? r, i = Number(n);
  return Number.isFinite(i) && i > 0 ? Math.floor(i) : r;
}
function hn(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" || n === "1" : !!n;
}
function fn(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : String(n).trim() || r;
}
function pn(s) {
  if (s == null)
    return "";
  if (typeof s == "string")
    return s.trim();
  if (typeof s != "object")
    return String(s).trim();
  const e = ["_type", "type", "blockType", "block_type"];
  for (const t of e) {
    const r = s[t];
    if (typeof r == "string" && r.trim())
      return r.trim();
  }
  return "";
}
function gn(s) {
  switch (s) {
    case "muted":
      return "bg-gray-100 text-gray-600";
    case "outline":
      return "bg-white border border-gray-300 text-gray-700";
    case "default":
    default:
      return "bg-blue-50 text-blue-700";
  }
}
class mn {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return Q;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = wt(e, {});
        return t ? Le(t) : Q;
      }
      if (typeof e == "object") {
        const t = yt(e, {});
        return t ? Le(t) : Q;
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
      return Ze(String(e), "status", t);
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
      const n = Math.floor(Math.log(t) / Math.log(1024));
      return `${(t / Math.pow(1024, n)).toFixed(2)} ${r[n]}`;
    }), this.renderers.set("_truncate", (e) => {
      if (!e) return '<span class="text-gray-400">-</span>';
      const t = String(e), r = 50;
      return t.length <= r ? t : `<span title="${t}">${t.substring(0, r)}...</span>`;
    }), this.renderers.set("_array", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return Q;
      const i = n?.options || {}, o = wt(e, i);
      return o ? Le(o) : Q;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null)
        return Q;
      const i = n?.options || {}, o = yt(e, i);
      return o ? Le(o) : Q;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return Q;
      const i = n?.options || {}, o = un(i, "max_visible", "maxVisible", 3), a = hn(i, "show_count", "showCount", !0), l = fn(i, "chip_variant", "chipVariant", "default"), c = i.block_icons_map || i.blockIconsMap || {}, d = [], u = e.slice(0, o);
      for (const g of u) {
        const b = pn(g);
        if (!b) continue;
        const C = c[b] || "view-grid", k = Yr(C, { size: "14px", extraClass: "flex-shrink-0" }), E = gn(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${E}">${k}<span>${Le(b)}</span></span>`
        );
      }
      if (d.length === 0)
        return Q;
      const h = e.length - o;
      let f = "";
      return a && h > 0 && (f = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${f}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const Ji = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return Ze(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return Ze(String(e), "role", t);
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (s, e) => {
    const t = s || e.name || e.username || "-", r = e.email || "";
    return r ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${r}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (s) => (e) => Kr(!!e, s),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (s) => {
    if (!s) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(s), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(r / 6e4), i = Math.floor(r / 36e5), o = Math.floor(r / 864e5);
      return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : i < 24 ? `${i} hour${i > 1 ? "s" : ""} ago` : o < 30 ? `${o} day${o > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(s);
    }
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: nn(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: Ht(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: Ht({ size: "sm", maxLocales: 2 })
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function Gt(s, e) {
  var t = Object.keys(s);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(s);
    e && (r = r.filter(function(n) {
      return Object.getOwnPropertyDescriptor(s, n).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function J(s) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Gt(Object(t), !0).forEach(function(r) {
      bn(s, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(s, Object.getOwnPropertyDescriptors(t)) : Gt(Object(t)).forEach(function(r) {
      Object.defineProperty(s, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return s;
}
function Ke(s) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Ke = function(e) {
    return typeof e;
  } : Ke = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Ke(s);
}
function bn(s, e, t) {
  return e in s ? Object.defineProperty(s, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : s[e] = t, s;
}
function ee() {
  return ee = Object.assign || function(s) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (s[r] = t[r]);
    }
    return s;
  }, ee.apply(this, arguments);
}
function vn(s, e) {
  if (s == null) return {};
  var t = {}, r = Object.keys(s), n, i;
  for (i = 0; i < r.length; i++)
    n = r[i], !(e.indexOf(n) >= 0) && (t[n] = s[n]);
  return t;
}
function yn(s, e) {
  if (s == null) return {};
  var t = vn(s, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(s);
    for (n = 0; n < i.length; n++)
      r = i[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(s, r) && (t[r] = s[r]);
  }
  return t;
}
var wn = "1.15.6";
function Z(s) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(s);
}
var te = Z(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), Ne = Z(/Edge/i), Vt = Z(/firefox/i), Re = Z(/safari/i) && !Z(/chrome/i) && !Z(/android/i), It = Z(/iP(ad|od|hone)/i), ur = Z(/chrome/i) && Z(/android/i), hr = {
  capture: !1,
  passive: !1
};
function S(s, e, t) {
  s.addEventListener(e, t, !te && hr);
}
function x(s, e, t) {
  s.removeEventListener(e, t, !te && hr);
}
function et(s, e) {
  if (e) {
    if (e[0] === ">" && (e = e.substring(1)), s)
      try {
        if (s.matches)
          return s.matches(e);
        if (s.msMatchesSelector)
          return s.msMatchesSelector(e);
        if (s.webkitMatchesSelector)
          return s.webkitMatchesSelector(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
function fr(s) {
  return s.host && s !== document && s.host.nodeType ? s.host : s.parentNode;
}
function G(s, e, t, r) {
  if (s) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? s.parentNode === t && et(s, e) : et(s, e)) || r && s === t)
        return s;
      if (s === t) break;
    } while (s = fr(s));
  }
  return null;
}
var Kt = /\s+/g;
function N(s, e, t) {
  if (s && e)
    if (s.classList)
      s.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + s.className + " ").replace(Kt, " ").replace(" " + e + " ", " ");
      s.className = (r + (t ? " " + e : "")).replace(Kt, " ");
    }
}
function v(s, e, t) {
  var r = s && s.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(s, "") : s.currentStyle && (t = s.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function we(s, e) {
  var t = "";
  if (typeof s == "string")
    t = s;
  else
    do {
      var r = v(s, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (s = s.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function pr(s, e, t) {
  if (s) {
    var r = s.getElementsByTagName(e), n = 0, i = r.length;
    if (t)
      for (; n < i; n++)
        t(r[n], n);
    return r;
  }
  return [];
}
function Y() {
  var s = document.scrollingElement;
  return s || document.documentElement;
}
function T(s, e, t, r, n) {
  if (!(!s.getBoundingClientRect && s !== window)) {
    var i, o, a, l, c, d, u;
    if (s !== window && s.parentNode && s !== Y() ? (i = s.getBoundingClientRect(), o = i.top, a = i.left, l = i.bottom, c = i.right, d = i.height, u = i.width) : (o = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && s !== window && (n = n || s.parentNode, !te))
      do
        if (n && n.getBoundingClientRect && (v(n, "transform") !== "none" || t && v(n, "position") !== "static")) {
          var h = n.getBoundingClientRect();
          o -= h.top + parseInt(v(n, "border-top-width")), a -= h.left + parseInt(v(n, "border-left-width")), l = o + i.height, c = a + i.width;
          break;
        }
      while (n = n.parentNode);
    if (r && s !== window) {
      var f = we(n || s), g = f && f.a, b = f && f.d;
      f && (o /= b, a /= g, u /= g, d /= b, l = o + d, c = a + u);
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
function Yt(s, e, t) {
  for (var r = oe(s, !0), n = T(s)[e]; r; ) {
    var i = T(r)[t], o = void 0;
    if (o = n >= i, !o) return r;
    if (r === Y()) break;
    r = oe(r, !1);
  }
  return !1;
}
function Se(s, e, t, r) {
  for (var n = 0, i = 0, o = s.children; i < o.length; ) {
    if (o[i].style.display !== "none" && o[i] !== y.ghost && (r || o[i] !== y.dragged) && G(o[i], t.draggable, s, !1)) {
      if (n === e)
        return o[i];
      n++;
    }
    i++;
  }
  return null;
}
function Tt(s, e) {
  for (var t = s.lastElementChild; t && (t === y.ghost || v(t, "display") === "none" || e && !et(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function H(s, e) {
  var t = 0;
  if (!s || !s.parentNode)
    return -1;
  for (; s = s.previousElementSibling; )
    s.nodeName.toUpperCase() !== "TEMPLATE" && s !== y.clone && (!e || et(s, e)) && t++;
  return t;
}
function Jt(s) {
  var e = 0, t = 0, r = Y();
  if (s)
    do {
      var n = we(s), i = n.a, o = n.d;
      e += s.scrollLeft * i, t += s.scrollTop * o;
    } while (s !== r && (s = s.parentNode));
  return [e, t];
}
function xn(s, e) {
  for (var t in s)
    if (s.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === s[t][r]) return Number(t);
    }
  return -1;
}
function oe(s, e) {
  if (!s || !s.getBoundingClientRect) return Y();
  var t = s, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var n = v(t);
      if (t.clientWidth < t.scrollWidth && (n.overflowX == "auto" || n.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (n.overflowY == "auto" || n.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return Y();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return Y();
}
function Sn(s, e) {
  if (s && e)
    for (var t in e)
      e.hasOwnProperty(t) && (s[t] = e[t]);
  return s;
}
function lt(s, e) {
  return Math.round(s.top) === Math.round(e.top) && Math.round(s.left) === Math.round(e.left) && Math.round(s.height) === Math.round(e.height) && Math.round(s.width) === Math.round(e.width);
}
var Pe;
function gr(s, e) {
  return function() {
    if (!Pe) {
      var t = arguments, r = this;
      t.length === 1 ? s.call(r, t[0]) : s.apply(r, t), Pe = setTimeout(function() {
        Pe = void 0;
      }, e);
    }
  };
}
function Cn() {
  clearTimeout(Pe), Pe = void 0;
}
function mr(s, e, t) {
  s.scrollLeft += e, s.scrollTop += t;
}
function br(s) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(s).cloneNode(!0) : t ? t(s).clone(!0)[0] : s.cloneNode(!0);
}
function vr(s, e, t) {
  var r = {};
  return Array.from(s.children).forEach(function(n) {
    var i, o, a, l;
    if (!(!G(n, e.draggable, s, !1) || n.animated || n === t)) {
      var c = T(n);
      r.left = Math.min((i = r.left) !== null && i !== void 0 ? i : 1 / 0, c.left), r.top = Math.min((o = r.top) !== null && o !== void 0 ? o : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var F = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function En() {
  var s = [], e;
  return {
    captureAnimationState: function() {
      if (s = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(v(n, "display") === "none" || n === y.ghost)) {
            s.push({
              target: n,
              rect: T(n)
            });
            var i = J({}, s[s.length - 1].rect);
            if (n.thisAnimationDuration) {
              var o = we(n, !0);
              o && (i.top -= o.f, i.left -= o.e);
            }
            n.fromRect = i;
          }
        });
      }
    },
    addAnimationState: function(r) {
      s.push(r);
    },
    removeAnimationState: function(r) {
      s.splice(xn(s, {
        target: r
      }), 1);
    },
    animateAll: function(r) {
      var n = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof r == "function" && r();
        return;
      }
      var i = !1, o = 0;
      s.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = T(c), h = c.prevFromRect, f = c.prevToRect, g = a.rect, b = we(c, !0);
        b && (u.top -= b.f, u.left -= b.e), c.toRect = u, c.thisAnimationDuration && lt(h, u) && !lt(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (g.top - u.top) / (g.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = kn(g, h, f, n.options)), lt(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, g, u, l)), l && (i = !0, o = Math.max(o, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), i ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, o) : typeof r == "function" && r(), s = [];
    },
    animate: function(r, n, i, o) {
      if (o) {
        v(r, "transition", ""), v(r, "transform", "");
        var a = we(this.el), l = a && a.a, c = a && a.d, d = (n.left - i.left) / (l || 1), u = (n.top - i.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, v(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = $n(r), v(r, "transition", "transform " + o + "ms" + (this.options.easing ? " " + this.options.easing : "")), v(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          v(r, "transition", ""), v(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, o);
      }
    }
  };
}
function $n(s) {
  return s.offsetWidth;
}
function kn(s, e, t, r) {
  return Math.sqrt(Math.pow(e.top - s.top, 2) + Math.pow(e.left - s.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var me = [], ct = {
  initializeByDefault: !0
}, je = {
  mount: function(e) {
    for (var t in ct)
      ct.hasOwnProperty(t) && !(t in e) && (e[t] = ct[t]);
    me.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), me.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var i = e + "Global";
    me.forEach(function(o) {
      t[o.pluginName] && (t[o.pluginName][i] && t[o.pluginName][i](J({
        sortable: t
      }, r)), t.options[o.pluginName] && t[o.pluginName][e] && t[o.pluginName][e](J({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    me.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, ee(r, c.defaults);
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
    return me.forEach(function(n) {
      typeof n.eventProperties == "function" && ee(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return me.forEach(function(i) {
      e[i.pluginName] && i.optionListeners && typeof i.optionListeners[t] == "function" && (n = i.optionListeners[t].call(e[i.pluginName], r));
    }), n;
  }
};
function An(s) {
  var e = s.sortable, t = s.rootEl, r = s.name, n = s.targetEl, i = s.cloneEl, o = s.toEl, a = s.fromEl, l = s.oldIndex, c = s.newIndex, d = s.oldDraggableIndex, u = s.newDraggableIndex, h = s.originalEvent, f = s.putSortable, g = s.extraEventProperties;
  if (e = e || t && t[F], !!e) {
    var b, C = e.options, k = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !te && !Ne ? b = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (b = document.createEvent("Event"), b.initEvent(r, !0, !0)), b.to = o || t, b.from = a || t, b.item = n || t, b.clone = i, b.oldIndex = l, b.newIndex = c, b.oldDraggableIndex = d, b.newDraggableIndex = u, b.originalEvent = h, b.pullMode = f ? f.lastPutMode : void 0;
    var E = J(J({}, g), je.getEventProperties(r, e));
    for (var R in E)
      b[R] = E[R];
    t && t.dispatchEvent(b), C[k] && C[k].call(e, b);
  }
}
var Ln = ["evt"], O = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, i = yn(r, Ln);
  je.pluginEvent.bind(y)(e, t, J({
    dragEl: p,
    parentEl: L,
    ghostEl: w,
    rootEl: $,
    nextEl: fe,
    lastDownEl: Ye,
    cloneEl: A,
    cloneHidden: ie,
    dragStarted: De,
    putSortable: M,
    activeSortable: y.active,
    originalEvent: n,
    oldIndex: ye,
    oldDraggableIndex: Be,
    newIndex: j,
    newDraggableIndex: se,
    hideGhostForTarget: Sr,
    unhideGhostForTarget: Cr,
    cloneNowHidden: function() {
      ie = !0;
    },
    cloneNowShown: function() {
      ie = !1;
    },
    dispatchSortableEvent: function(a) {
      B({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, i));
};
function B(s) {
  An(J({
    putSortable: M,
    cloneEl: A,
    targetEl: p,
    rootEl: $,
    oldIndex: ye,
    oldDraggableIndex: Be,
    newIndex: j,
    newDraggableIndex: se
  }, s));
}
var p, L, w, $, fe, Ye, A, ie, ye, j, Be, se, He, M, ve = !1, tt = !1, rt = [], de, U, dt, ut, Wt, Xt, De, be, Oe, Fe = !1, Ue = !1, Je, P, ht = [], xt = !1, nt = [], it = typeof document < "u", Ge = It, Qt = Ne || te ? "cssFloat" : "float", _n = it && !ur && !It && "draggable" in document.createElement("div"), yr = function() {
  if (it) {
    if (te)
      return !1;
    var s = document.createElement("x");
    return s.style.cssText = "pointer-events:auto", s.style.pointerEvents === "auto";
  }
}(), wr = function(e, t) {
  var r = v(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), i = Se(e, 0, t), o = Se(e, 1, t), a = i && v(i), l = o && v(o), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + T(i).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + T(o).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (i && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return o && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return i && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[Qt] === "none" || o && r[Qt] === "none" && c + d > n) ? "vertical" : "horizontal";
}, Dn = function(e, t, r) {
  var n = r ? e.left : e.top, i = r ? e.right : e.bottom, o = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || i === l || n + o / 2 === a + c / 2;
}, In = function(e, t) {
  var r;
  return rt.some(function(n) {
    var i = n[F].options.emptyInsertThreshold;
    if (!(!i || Tt(n))) {
      var o = T(n), a = e >= o.left - i && e <= o.right + i, l = t >= o.top - i && t <= o.bottom + i;
      if (a && l)
        return r = n;
    }
  }), r;
}, xr = function(e) {
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
  var r = {}, n = e.group;
  (!n || Ke(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, Sr = function() {
  !yr && w && v(w, "display", "none");
}, Cr = function() {
  !yr && w && v(w, "display", "");
};
it && !ur && document.addEventListener("click", function(s) {
  if (tt)
    return s.preventDefault(), s.stopPropagation && s.stopPropagation(), s.stopImmediatePropagation && s.stopImmediatePropagation(), tt = !1, !1;
}, !0);
var ue = function(e) {
  if (p) {
    e = e.touches ? e.touches[0] : e;
    var t = In(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[F]._onDragOver(r);
    }
  }
}, Tn = function(e) {
  p && p.parentNode[F]._isOutsideThisEl(e.target);
};
function y(s, e) {
  if (!(s && s.nodeType && s.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(s));
  this.el = s, this.options = e = ee({}, e), s[F] = this;
  var t = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(s.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: !1,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: !0,
    direction: function() {
      return wr(s, this.options);
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
    supportPointer: y.supportPointer !== !1 && "PointerEvent" in window && (!Re || It),
    emptyInsertThreshold: 5
  };
  je.initializePlugins(this, s, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  xr(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : _n, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? S(s, "pointerdown", this._onTapStart) : (S(s, "mousedown", this._onTapStart), S(s, "touchstart", this._onTapStart)), this.nativeDraggable && (S(s, "dragover", this), S(s, "dragenter", this)), rt.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), ee(this, En());
}
y.prototype = /** @lends Sortable.prototype */
{
  constructor: y,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (be = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, p) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, i = n.preventOnFilter, o = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (Nn(r), !p && !(/mousedown|pointerdown/.test(o) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Re && l && l.tagName.toUpperCase() === "SELECT") && (l = G(l, n.draggable, r, !1), !(l && l.animated) && Ye !== l)) {
        if (ye = H(l), Be = H(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            B({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), O("filter", t, {
              evt: e
            }), i && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = G(c, u.trim(), r, !1), u)
            return B({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), O("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          i && e.preventDefault();
          return;
        }
        n.handle && !G(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, i = n.el, o = n.options, a = i.ownerDocument, l;
    if (r && !p && r.parentNode === i) {
      var c = T(r);
      if ($ = i, p = r, L = p.parentNode, fe = p.nextSibling, Ye = r, He = o.group, y.dragged = p, de = {
        target: p,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, Wt = de.clientX - c.left, Xt = de.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, p.style["will-change"] = "all", l = function() {
        if (O("delayEnded", n, {
          evt: e
        }), y.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !Vt && n.nativeDraggable && (p.draggable = !0), n._triggerDragStart(e, t), B({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), N(p, o.chosenClass, !0);
      }, o.ignore.split(",").forEach(function(d) {
        pr(p, d.trim(), ft);
      }), S(a, "dragover", ue), S(a, "mousemove", ue), S(a, "touchmove", ue), o.supportPointer ? (S(a, "pointerup", n._onDrop), !this.nativeDraggable && S(a, "pointercancel", n._onDrop)) : (S(a, "mouseup", n._onDrop), S(a, "touchend", n._onDrop), S(a, "touchcancel", n._onDrop)), Vt && this.nativeDraggable && (this.options.touchStartThreshold = 4, p.draggable = !0), O("delayStart", this, {
        evt: e
      }), o.delay && (!o.delayOnTouchOnly || t) && (!this.nativeDraggable || !(Ne || te))) {
        if (y.eventCanceled) {
          this._onDrop();
          return;
        }
        o.supportPointer ? (S(a, "pointerup", n._disableDelayedDrag), S(a, "pointercancel", n._disableDelayedDrag)) : (S(a, "mouseup", n._disableDelayedDrag), S(a, "touchend", n._disableDelayedDrag), S(a, "touchcancel", n._disableDelayedDrag)), S(a, "mousemove", n._delayedDragTouchMoveHandler), S(a, "touchmove", n._delayedDragTouchMoveHandler), o.supportPointer && S(a, "pointermove", n._delayedDragTouchMoveHandler), n._dragStartTimer = setTimeout(l, o.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    p && ft(p), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    x(e, "mouseup", this._disableDelayedDrag), x(e, "touchend", this._disableDelayedDrag), x(e, "touchcancel", this._disableDelayedDrag), x(e, "pointerup", this._disableDelayedDrag), x(e, "pointercancel", this._disableDelayedDrag), x(e, "mousemove", this._delayedDragTouchMoveHandler), x(e, "touchmove", this._delayedDragTouchMoveHandler), x(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? S(document, "pointermove", this._onTouchMove) : t ? S(document, "touchmove", this._onTouchMove) : S(document, "mousemove", this._onTouchMove) : (S(p, "dragend", this), S($, "dragstart", this._onDragStart));
    try {
      document.selection ? We(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (ve = !1, $ && p) {
      O("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && S(document, "dragover", Tn);
      var r = this.options;
      !e && N(p, r.dragClass, !1), N(p, r.ghostClass, !0), y.active = this, e && this._appendGhost(), B({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (U) {
      this._lastX = U.clientX, this._lastY = U.clientY, Sr();
      for (var e = document.elementFromPoint(U.clientX, U.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(U.clientX, U.clientY), e !== t); )
        t = e;
      if (p.parentNode[F]._isOutsideThisEl(e), t)
        do {
          if (t[F]) {
            var r = void 0;
            if (r = t[F]._onDragOver({
              clientX: U.clientX,
              clientY: U.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = fr(t));
      Cr();
    }
  },
  _onTouchMove: function(e) {
    if (de) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, i = e.touches ? e.touches[0] : e, o = w && we(w, !0), a = w && o && o.a, l = w && o && o.d, c = Ge && P && Jt(P), d = (i.clientX - de.clientX + n.x) / (a || 1) + (c ? c[0] - ht[0] : 0) / (a || 1), u = (i.clientY - de.clientY + n.y) / (l || 1) + (c ? c[1] - ht[1] : 0) / (l || 1);
      if (!y.active && !ve) {
        if (r && Math.max(Math.abs(i.clientX - this._lastX), Math.abs(i.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (w) {
        o ? (o.e += d - (dt || 0), o.f += u - (ut || 0)) : o = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var h = "matrix(".concat(o.a, ",").concat(o.b, ",").concat(o.c, ",").concat(o.d, ",").concat(o.e, ",").concat(o.f, ")");
        v(w, "webkitTransform", h), v(w, "mozTransform", h), v(w, "msTransform", h), v(w, "transform", h), dt = d, ut = u, U = i;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!w) {
      var e = this.options.fallbackOnBody ? document.body : $, t = T(p, !0, Ge, !0, e), r = this.options;
      if (Ge) {
        for (P = e; v(P, "position") === "static" && v(P, "transform") === "none" && P !== document; )
          P = P.parentNode;
        P !== document.body && P !== document.documentElement ? (P === document && (P = Y()), t.top += P.scrollTop, t.left += P.scrollLeft) : P = Y(), ht = Jt(P);
      }
      w = p.cloneNode(!0), N(w, r.ghostClass, !1), N(w, r.fallbackClass, !0), N(w, r.dragClass, !0), v(w, "transition", ""), v(w, "transform", ""), v(w, "box-sizing", "border-box"), v(w, "margin", 0), v(w, "top", t.top), v(w, "left", t.left), v(w, "width", t.width), v(w, "height", t.height), v(w, "opacity", "0.8"), v(w, "position", Ge ? "absolute" : "fixed"), v(w, "zIndex", "100000"), v(w, "pointerEvents", "none"), y.ghost = w, e.appendChild(w), v(w, "transform-origin", Wt / parseInt(w.style.width) * 100 + "% " + Xt / parseInt(w.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, i = r.options;
    if (O("dragStart", this, {
      evt: e
    }), y.eventCanceled) {
      this._onDrop();
      return;
    }
    O("setupClone", this), y.eventCanceled || (A = br(p), A.removeAttribute("id"), A.draggable = !1, A.style["will-change"] = "", this._hideClone(), N(A, this.options.chosenClass, !1), y.clone = A), r.cloneId = We(function() {
      O("clone", r), !y.eventCanceled && (r.options.removeCloneOnHide || $.insertBefore(A, p), r._hideClone(), B({
        sortable: r,
        name: "clone"
      }));
    }), !t && N(p, i.dragClass, !0), t ? (tt = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (x(document, "mouseup", r._onDrop), x(document, "touchend", r._onDrop), x(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", i.setData && i.setData.call(r, n, p)), S(document, "drop", r), v(p, "transform", "translateZ(0)")), ve = !0, r._dragStartId = We(r._dragStarted.bind(r, t, e)), S(document, "selectstart", r), De = !0, window.getSelection().removeAllRanges(), Re && v(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, i, o, a = this.options, l = a.group, c = y.active, d = He === l, u = a.sort, h = M || c, f, g = this, b = !1;
    if (xt) return;
    function C(Ae, zr) {
      O(Ae, g, J({
        evt: e,
        isOwner: d,
        axis: f ? "vertical" : "horizontal",
        revert: o,
        dragRect: n,
        targetRect: i,
        canSort: u,
        fromSortable: h,
        target: r,
        completed: E,
        onMove: function(jt, Hr) {
          return Ve($, t, p, n, jt, T(jt), e, Hr);
        },
        changed: R
      }, zr));
    }
    function k() {
      C("dragOverAnimationCapture"), g.captureAnimationState(), g !== h && h.captureAnimationState();
    }
    function E(Ae) {
      return C("dragOverCompleted", {
        insertion: Ae
      }), Ae && (d ? c._hideClone() : c._showClone(g), g !== h && (N(p, M ? M.options.ghostClass : c.options.ghostClass, !1), N(p, a.ghostClass, !0)), M !== g && g !== y.active ? M = g : g === y.active && M && (M = null), h === g && (g._ignoreWhileAnimating = r), g.animateAll(function() {
        C("dragOverAnimationComplete"), g._ignoreWhileAnimating = null;
      }), g !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (r === p && !p.animated || r === t && !r.animated) && (be = null), !a.dragoverBubble && !e.rootEl && r !== document && (p.parentNode[F]._isOutsideThisEl(e.target), !Ae && ue(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), b = !0;
    }
    function R() {
      j = H(p), se = H(p, a.draggable), B({
        sortable: g,
        name: "change",
        toEl: t,
        newIndex: j,
        newDraggableIndex: se,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = G(r, a.draggable, t, !0), C("dragOver"), y.eventCanceled) return b;
    if (p.contains(e.target) || r.animated && r.animatingX && r.animatingY || g._ignoreWhileAnimating === r)
      return E(!1);
    if (tt = !1, c && !a.disabled && (d ? u || (o = L !== $) : M === this || (this.lastPutMode = He.checkPull(this, c, p, e)) && l.checkPut(this, c, p, e))) {
      if (f = this._getDirection(e, r) === "vertical", n = T(p), C("dragOverValid"), y.eventCanceled) return b;
      if (o)
        return L = $, k(), this._hideClone(), C("revert"), y.eventCanceled || (fe ? $.insertBefore(p, fe) : $.appendChild(p)), E(!0);
      var D = Tt(t, a.draggable);
      if (!D || Bn(e, f, this) && !D.animated) {
        if (D === p)
          return E(!1);
        if (D && t === e.target && (r = D), r && (i = T(r)), Ve($, t, p, n, r, i, e, !!r) !== !1)
          return k(), D && D.nextSibling ? t.insertBefore(p, D.nextSibling) : t.appendChild(p), L = t, R(), E(!0);
      } else if (D && Pn(e, f, this)) {
        var W = Se(t, 0, a, !0);
        if (W === p)
          return E(!1);
        if (r = W, i = T(r), Ve($, t, p, n, r, i, e, !1) !== !1)
          return k(), t.insertBefore(p, W), L = t, R(), E(!0);
      } else if (r.parentNode === t) {
        i = T(r);
        var z = 0, le, Ce = p.parentNode !== t, q = !Dn(p.animated && p.toRect || n, r.animated && r.toRect || i, f), Ee = f ? "top" : "left", re = Yt(r, "top", "top") || Yt(p, "top", "top"), $e = re ? re.scrollTop : void 0;
        be !== r && (le = i[Ee], Fe = !1, Ue = !q && a.invertSwap || Ce), z = On(e, r, i, f, q ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, Ue, be === r);
        var X;
        if (z !== 0) {
          var ce = H(p);
          do
            ce -= z, X = L.children[ce];
          while (X && (v(X, "display") === "none" || X === w));
        }
        if (z === 0 || X === r)
          return E(!1);
        be = r, Oe = z;
        var ke = r.nextElementSibling, ne = !1;
        ne = z === 1;
        var ze = Ve($, t, p, n, r, i, e, ne);
        if (ze !== !1)
          return (ze === 1 || ze === -1) && (ne = ze === 1), xt = !0, setTimeout(Rn, 30), k(), ne && !ke ? t.appendChild(p) : r.parentNode.insertBefore(p, ne ? ke : r), re && mr(re, 0, $e - re.scrollTop), L = p.parentNode, le !== void 0 && !Ue && (Je = Math.abs(le - T(r)[Ee])), R(), E(!0);
      }
      if (t.contains(p))
        return E(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    x(document, "mousemove", this._onTouchMove), x(document, "touchmove", this._onTouchMove), x(document, "pointermove", this._onTouchMove), x(document, "dragover", ue), x(document, "mousemove", ue), x(document, "touchmove", ue);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    x(e, "mouseup", this._onDrop), x(e, "touchend", this._onDrop), x(e, "pointerup", this._onDrop), x(e, "pointercancel", this._onDrop), x(e, "touchcancel", this._onDrop), x(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, r = this.options;
    if (j = H(p), se = H(p, r.draggable), O("drop", this, {
      evt: e
    }), L = p && p.parentNode, j = H(p), se = H(p, r.draggable), y.eventCanceled) {
      this._nulling();
      return;
    }
    ve = !1, Ue = !1, Fe = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), St(this.cloneId), St(this._dragStartId), this.nativeDraggable && (x(document, "drop", this), x(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Re && v(document.body, "user-select", ""), v(p, "transform", ""), e && (De && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), w && w.parentNode && w.parentNode.removeChild(w), ($ === L || M && M.lastPutMode !== "clone") && A && A.parentNode && A.parentNode.removeChild(A), p && (this.nativeDraggable && x(p, "dragend", this), ft(p), p.style["will-change"] = "", De && !ve && N(p, M ? M.options.ghostClass : this.options.ghostClass, !1), N(p, this.options.chosenClass, !1), B({
      sortable: this,
      name: "unchoose",
      toEl: L,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), $ !== L ? (j >= 0 && (B({
      rootEl: L,
      name: "add",
      toEl: L,
      fromEl: $,
      originalEvent: e
    }), B({
      sortable: this,
      name: "remove",
      toEl: L,
      originalEvent: e
    }), B({
      rootEl: L,
      name: "sort",
      toEl: L,
      fromEl: $,
      originalEvent: e
    }), B({
      sortable: this,
      name: "sort",
      toEl: L,
      originalEvent: e
    })), M && M.save()) : j !== ye && j >= 0 && (B({
      sortable: this,
      name: "update",
      toEl: L,
      originalEvent: e
    }), B({
      sortable: this,
      name: "sort",
      toEl: L,
      originalEvent: e
    })), y.active && ((j == null || j === -1) && (j = ye, se = Be), B({
      sortable: this,
      name: "end",
      toEl: L,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    O("nulling", this), $ = p = L = w = fe = A = Ye = ie = de = U = De = j = se = ye = Be = be = Oe = M = He = y.dragged = y.ghost = y.clone = y.active = null, nt.forEach(function(e) {
      e.checked = !0;
    }), nt.length = dt = ut = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        p && (this._onDragOver(e), Mn(e));
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
    for (var e = [], t, r = this.el.children, n = 0, i = r.length, o = this.options; n < i; n++)
      t = r[n], G(t, o.draggable, this.el, !1) && e.push(t.getAttribute(o.dataIdAttr) || qn(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var r = {}, n = this.el;
    this.toArray().forEach(function(i, o) {
      var a = n.children[o];
      G(a, this.options.draggable, n, !1) && (r[i] = a);
    }, this), t && this.captureAnimationState(), e.forEach(function(i) {
      r[i] && (n.removeChild(r[i]), n.appendChild(r[i]));
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
    return G(e, t || this.options.draggable, this.el, !1);
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
    var n = je.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && xr(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    O("destroy", this);
    var e = this.el;
    e[F] = null, x(e, "mousedown", this._onTapStart), x(e, "touchstart", this._onTapStart), x(e, "pointerdown", this._onTapStart), this.nativeDraggable && (x(e, "dragover", this), x(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), rt.splice(rt.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!ie) {
      if (O("hideClone", this), y.eventCanceled) return;
      v(A, "display", "none"), this.options.removeCloneOnHide && A.parentNode && A.parentNode.removeChild(A), ie = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (ie) {
      if (O("showClone", this), y.eventCanceled) return;
      p.parentNode == $ && !this.options.group.revertClone ? $.insertBefore(A, p) : fe ? $.insertBefore(A, fe) : $.appendChild(A), this.options.group.revertClone && this.animate(p, A), v(A, "display", ""), ie = !1;
    }
  }
};
function Mn(s) {
  s.dataTransfer && (s.dataTransfer.dropEffect = "move"), s.cancelable && s.preventDefault();
}
function Ve(s, e, t, r, n, i, o, a) {
  var l, c = s[F], d = c.options.onMove, u;
  return window.CustomEvent && !te && !Ne ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = s, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = i || T(e), l.willInsertAfter = a, l.originalEvent = o, s.dispatchEvent(l), d && (u = d.call(c, l, o)), u;
}
function ft(s) {
  s.draggable = !1;
}
function Rn() {
  xt = !1;
}
function Pn(s, e, t) {
  var r = T(Se(t.el, 0, t.options, !0)), n = vr(t.el, t.options, w), i = 10;
  return e ? s.clientX < n.left - i || s.clientY < r.top && s.clientX < r.right : s.clientY < n.top - i || s.clientY < r.bottom && s.clientX < r.left;
}
function Bn(s, e, t) {
  var r = T(Tt(t.el, t.options.draggable)), n = vr(t.el, t.options, w), i = 10;
  return e ? s.clientX > n.right + i || s.clientY > r.bottom && s.clientX > r.left : s.clientY > n.bottom + i || s.clientX > r.right && s.clientY > r.top;
}
function On(s, e, t, r, n, i, o, a) {
  var l = r ? s.clientY : s.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, h = !1;
  if (!o) {
    if (a && Je < c * n) {
      if (!Fe && (Oe === 1 ? l > d + c * i / 2 : l < u - c * i / 2) && (Fe = !0), Fe)
        h = !0;
      else if (Oe === 1 ? l < d + Je : l > u - Je)
        return -Oe;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return Fn(e);
  }
  return h = h || o, h && (l < d + c * i / 2 || l > u - c * i / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function Fn(s) {
  return H(p) < H(s) ? 1 : -1;
}
function qn(s) {
  for (var e = s.tagName + s.className + s.src + s.href + s.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function Nn(s) {
  nt.length = 0;
  for (var e = s.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && nt.push(r);
  }
}
function We(s) {
  return setTimeout(s, 0);
}
function St(s) {
  return clearTimeout(s);
}
it && S(document, "touchmove", function(s) {
  (y.active || ve) && s.cancelable && s.preventDefault();
});
y.utils = {
  on: S,
  off: x,
  css: v,
  find: pr,
  is: function(e, t) {
    return !!G(e, t, e, !1);
  },
  extend: Sn,
  throttle: gr,
  closest: G,
  toggleClass: N,
  clone: br,
  index: H,
  nextTick: We,
  cancelNextTick: St,
  detectDirection: wr,
  getChild: Se,
  expando: F
};
y.get = function(s) {
  return s[F];
};
y.mount = function() {
  for (var s = arguments.length, e = new Array(s), t = 0; t < s; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (y.utils = J(J({}, y.utils), r.utils)), je.mount(r);
  });
};
y.create = function(s, e) {
  return new y(s, e);
};
y.version = wn;
var I = [], Ie, Ct, Et = !1, pt, gt, st, Te;
function jn() {
  function s() {
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
  return s.prototype = {
    dragStarted: function(t) {
      var r = t.originalEvent;
      this.sortable.nativeDraggable ? S(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? S(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? S(document, "touchmove", this._handleFallbackAutoScroll) : S(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var r = t.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? x(document, "dragover", this._handleAutoScroll) : (x(document, "pointermove", this._handleFallbackAutoScroll), x(document, "touchmove", this._handleFallbackAutoScroll), x(document, "mousemove", this._handleFallbackAutoScroll)), Zt(), Xe(), Cn();
    },
    nulling: function() {
      st = Ct = Ie = Et = Te = pt = gt = null, I.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, i = (t.touches ? t.touches[0] : t).clientX, o = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(i, o);
      if (st = t, r || this.options.forceAutoScrollFallback || Ne || te || Re) {
        mt(t, this.options, a, r);
        var l = oe(a, !0);
        Et && (!Te || i !== pt || o !== gt) && (Te && Zt(), Te = setInterval(function() {
          var c = oe(document.elementFromPoint(i, o), !0);
          c !== l && (l = c, Xe()), mt(t, n.options, c, r);
        }, 10), pt = i, gt = o);
      } else {
        if (!this.options.bubbleScroll || oe(a, !0) === Y()) {
          Xe();
          return;
        }
        mt(t, this.options, oe(a, !1), !1);
      }
    }
  }, ee(s, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Xe() {
  I.forEach(function(s) {
    clearInterval(s.pid);
  }), I = [];
}
function Zt() {
  clearInterval(Te);
}
var mt = gr(function(s, e, t, r) {
  if (e.scroll) {
    var n = (s.touches ? s.touches[0] : s).clientX, i = (s.touches ? s.touches[0] : s).clientY, o = e.scrollSensitivity, a = e.scrollSpeed, l = Y(), c = !1, d;
    Ct !== t && (Ct = t, Xe(), Ie = e.scroll, d = e.scrollFn, Ie === !0 && (Ie = oe(t, !0)));
    var u = 0, h = Ie;
    do {
      var f = h, g = T(f), b = g.top, C = g.bottom, k = g.left, E = g.right, R = g.width, D = g.height, W = void 0, z = void 0, le = f.scrollWidth, Ce = f.scrollHeight, q = v(f), Ee = f.scrollLeft, re = f.scrollTop;
      f === l ? (W = R < le && (q.overflowX === "auto" || q.overflowX === "scroll" || q.overflowX === "visible"), z = D < Ce && (q.overflowY === "auto" || q.overflowY === "scroll" || q.overflowY === "visible")) : (W = R < le && (q.overflowX === "auto" || q.overflowX === "scroll"), z = D < Ce && (q.overflowY === "auto" || q.overflowY === "scroll"));
      var $e = W && (Math.abs(E - n) <= o && Ee + R < le) - (Math.abs(k - n) <= o && !!Ee), X = z && (Math.abs(C - i) <= o && re + D < Ce) - (Math.abs(b - i) <= o && !!re);
      if (!I[u])
        for (var ce = 0; ce <= u; ce++)
          I[ce] || (I[ce] = {});
      (I[u].vx != $e || I[u].vy != X || I[u].el !== f) && (I[u].el = f, I[u].vx = $e, I[u].vy = X, clearInterval(I[u].pid), ($e != 0 || X != 0) && (c = !0, I[u].pid = setInterval(function() {
        r && this.layer === 0 && y.active._onTouchMove(st);
        var ke = I[this.layer].vy ? I[this.layer].vy * a : 0, ne = I[this.layer].vx ? I[this.layer].vx * a : 0;
        typeof d == "function" && d.call(y.dragged.parentNode[F], ne, ke, s, st, I[this.layer].el) !== "continue" || mr(I[this.layer].el, ne, ke);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && h !== l && (h = oe(h, !1)));
    Et = c;
  }
}, 30), Er = function(e) {
  var t = e.originalEvent, r = e.putSortable, n = e.dragEl, i = e.activeSortable, o = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = r || i;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (o("spill"), this.onSpill({
      dragEl: n,
      putSortable: r
    }));
  }
};
function Mt() {
}
Mt.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = Se(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: Er
};
ee(Mt, {
  pluginName: "revertOnSpill"
});
function Rt() {
}
Rt.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: Er
};
ee(Rt, {
  pluginName: "removeOnSpill"
});
y.mount(new jn());
y.mount(Rt, Mt);
class zn {
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
    const n = document.createElement("div");
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((o) => {
      const a = this.createColumnItem(o.field, o.label || o.field, !t.has(o.field));
      n.appendChild(a);
    }), this.container.appendChild(n);
    const i = this.createFooter();
    this.container.appendChild(i);
  }
  /**
   * Create header with search input and count badge
   */
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    i.setAttribute("class", "column-search-icon"), i.setAttribute("viewBox", "0 0 24 24"), i.setAttribute("fill", "none"), i.setAttribute("stroke", "currentColor"), i.setAttribute("stroke-width", "2");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    o.setAttribute("cx", "11"), o.setAttribute("cy", "11"), o.setAttribute("r", "8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "m21 21-4.3-4.3"), i.appendChild(o), i.appendChild(a);
    const l = document.createElement("input");
    l.type = "text", l.className = "column-search-input", l.placeholder = "Filter columns...", l.setAttribute("aria-label", "Filter columns"), this.searchInput = l, l.addEventListener("input", () => {
      this.filterColumns(l.value);
    }), n.appendChild(i), n.appendChild(l);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, r.appendChild(n), r.appendChild(c), r;
  }
  /**
   * Filter columns by search term
   */
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((n) => {
      const i = n.querySelector(".column-label")?.textContent?.toLowerCase() || "", o = t === "" || i.includes(t);
      n.style.display = o ? "" : "none";
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
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, n = e.clientHeight, i = r > n, o = i && t > 0, a = i && t + n < r - 1;
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
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "path");
    i.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(i);
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
    const n = `column-item-${e}`, i = `column-switch-${e}`, o = document.createElement("div");
    o.className = "column-item", o.id = n, o.dataset.column = e, o.setAttribute("role", "listitem");
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
    ].forEach(([b, C]) => {
      const k = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      k.setAttribute("cx", String(b)), k.setAttribute("cy", String(C)), k.setAttribute("r", "1.5"), l.appendChild(k);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = i;
    const h = document.createElement("input");
    h.type = "checkbox", h.id = i, h.dataset.column = e, h.checked = r, h.setAttribute("role", "switch"), h.setAttribute("aria-checked", String(r)), h.setAttribute("aria-labelledby", `${n}-label`), h.setAttribute("aria-describedby", `${n}-desc`);
    const f = document.createElement("span");
    f.id = `${n}-desc`, f.className = "sr-only", f.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const g = document.createElement("span");
    return g.className = "column-switch-slider", g.setAttribute("aria-hidden", "true"), u.appendChild(h), u.appendChild(g), o.appendChild(a), o.appendChild(u), o.appendChild(f), o;
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
          (n) => n.dataset.column
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
        const n = t.checked;
        t.setAttribute("aria-checked", String(n));
        const i = `column-item-${r}-desc`, o = this.container.querySelector(`#${i}`);
        if (o) {
          const a = this.container.querySelector(`#column-item-${r}-label`)?.textContent || r;
          o.textContent = `Press Space or Enter to toggle ${a} column visibility. Currently ${n ? "visible" : "hidden"}.`;
        }
        this.onToggle && this.onToggle(r, n), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(r, this.grid), this.updateCountBadge();
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
function Hn(s, e = {}) {
  const {
    groupByField: t = "translation_group_id",
    defaultExpanded: r = !0,
    expandedGroups: n = /* @__PURE__ */ new Set()
  } = e, i = /* @__PURE__ */ new Map(), o = [];
  for (const l of s) {
    const c = Un(l, t);
    if (c) {
      const d = i.get(c);
      d ? d.push(l) : i.set(c, [l]);
    } else
      o.push(l);
  }
  const a = [];
  for (const [l, c] of i) {
    const d = Vn(c), u = n.has(l) || n.size === 0 && r;
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
    const d = s.indexOf(l.records[0]), u = s.indexOf(c.records[0]);
    return d - u;
  }), {
    groups: a,
    ungrouped: o,
    totalGroups: a.length,
    totalRecords: s.length
  };
}
function Un(s, e) {
  const t = s[e];
  if (typeof t == "string" && t.trim())
    return t;
  const r = [
    `translation.meta.${e}`,
    `content_translation.meta.${e}`
  ];
  for (const n of r) {
    const i = Gn(s, n);
    if (typeof i == "string" && i.trim())
      return i;
  }
  return null;
}
function Gn(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
function Vn(s) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let r = !1, n = 0;
  for (const o of s) {
    const a = o.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, u = a.readiness_state;
      Array.isArray(c) && c.filter(xe).forEach((h) => e.add(h)), Array.isArray(d) && d.filter(xe).forEach((h) => t.add(h)), (u === "missing_fields" || u === "missing_locales_and_fields") && (r = !0), u === "ready" && n++;
    }
    const l = o.available_locales;
    Array.isArray(l) && l.filter(xe).forEach((c) => e.add(c));
  }
  let i = null;
  if (s.length > 0) {
    const o = n === s.length, a = t.size > 0;
    o ? i = "ready" : a && r ? i = "missing_locales_and_fields" : a ? i = "missing_locales" : r && (i = "missing_fields");
  }
  return {
    totalItems: s.length,
    availableLocales: Array.from(e),
    missingLocales: Array.from(t),
    readinessState: i,
    readyForPublish: i === "ready"
  };
}
function xe(s) {
  return typeof s == "string";
}
function Kn(s, e) {
  const t = s.groups.map((r) => {
    const n = e.get(r.groupId);
    return n ? {
      ...r,
      summary: {
        ...r.summary,
        ...n
      },
      summaryFromBackend: !0
    } : r;
  });
  return {
    ...s,
    groups: t
  };
}
function Yn(s) {
  const e = /* @__PURE__ */ new Map(), t = s.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [r, n] of Object.entries(t))
    if (n && typeof n == "object") {
      const i = n;
      e.set(r, {
        totalItems: typeof i.total_items == "number" ? i.total_items : void 0,
        availableLocales: Array.isArray(i.available_locales) ? i.available_locales.filter(xe) : void 0,
        missingLocales: Array.isArray(i.missing_locales) ? i.missing_locales.filter(xe) : void 0,
        readinessState: Jn(i.readiness_state) ? i.readiness_state : void 0,
        readyForPublish: typeof i.ready_for_publish == "boolean" ? i.ready_for_publish : void 0
      });
    }
  return e;
}
function Jn(s) {
  return s === "ready" || s === "missing_locales" || s === "missing_fields" || s === "missing_locales_and_fields";
}
const $r = "datagrid-expand-state-";
function Wn(s) {
  try {
    const e = $r + s, t = localStorage.getItem(e);
    if (t) {
      const r = JSON.parse(t);
      if (Array.isArray(r))
        return new Set(r.filter(xe));
    }
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Xn(s, e) {
  try {
    const t = $r + s;
    localStorage.setItem(t, JSON.stringify(Array.from(e)));
  } catch {
  }
}
function Wi(s, e) {
  const t = s.groups.map((r) => r.groupId === e ? { ...r, expanded: !r.expanded } : r);
  return { ...s, groups: t };
}
function Xi(s) {
  const e = s.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...s, groups: e };
}
function Qi(s) {
  const e = s.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...s, groups: e };
}
function Zi(s) {
  const e = /* @__PURE__ */ new Set();
  for (const t of s.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const kr = "datagrid-view-mode-";
function Qn(s) {
  try {
    const e = kr + s, t = localStorage.getItem(e);
    if (t && es(t))
      return t;
  } catch {
  }
  return null;
}
function Zn(s, e) {
  try {
    const t = kr + s;
    localStorage.setItem(t, e);
  } catch {
  }
}
function es(s) {
  return s === "flat" || s === "grouped" || s === "matrix";
}
function ts(s, e = {}) {
  const { summary: t } = s, { size: r = "sm" } = e, n = r === "sm" ? "text-xs" : "text-sm", i = t.availableLocales.length, o = t.missingLocales.length, a = i + o;
  let l = "";
  if (t.readinessState) {
    const u = rs(t.readinessState);
    l = `
      <span class="${n} px-1.5 py-0.5 rounded ${u.bgClass} ${u.textClass}"
            title="${u.description}">
        ${u.icon} ${u.label}
      </span>
    `;
  }
  const c = a > 0 ? `<span class="${n} text-gray-500">${i}/${a} locales</span>` : "", d = `<span class="${n} text-gray-500">${t.totalItems} item${t.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${l}
      ${c}
      ${d}
    </div>
  `;
}
function rs(s) {
  switch (s) {
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
function ns(s, e, t = {}) {
  const { showExpandIcon: r = !0 } = t, n = r ? `<span class="expand-icon mr-2" aria-hidden="true">${s.expanded ? "▼" : "▶"}</span>` : "", i = ts(s);
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${ss(s.groupId)}"
        data-expanded="${s.expanded}"
        role="row"
        aria-expanded="${s.expanded}"
        tabindex="0">
      <td colspan="${e + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${n}
            <span class="font-medium text-gray-700">Group: ${Pt(s.groupId.slice(0, 12))}...</span>
          </div>
          ${i}
        </div>
      </td>
    </tr>
  `;
}
function Pt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ss(s) {
  return Pt(s);
}
function is(s) {
  return `
    <tr>
      <td colspan="${s + 2}" class="px-6 py-12 text-center">
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
function eo(s) {
  return `
    <tr>
      <td colspan="${s + 2}" class="px-6 py-12 text-center">
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
function to(s, e, t) {
  const r = t ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${s + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${Pt(e)}</p>
          ${r}
        </div>
      </td>
    </tr>
  `;
}
function os(s = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < s;
}
function as(s, e = 768) {
  return os(e) && s === "grouped" ? "flat" : s;
}
class ls {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new qe(), this.selectors = {
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
    const t = this.config.panelId || this.config.tableId, r = this.config.enableGroupedMode ? Qn(t) : null, n = this.config.enableGroupedMode ? Wn(t) : /* @__PURE__ */ new Set(), i = r || this.config.defaultViewMode || "flat";
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
      expandedGroups: n
    }, this.actionRenderer = new Wr({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new mn(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([o, a]) => {
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
    const t = e.get("search");
    if (t) {
      this.state.search = t;
      const l = document.querySelector(this.selectors.searchInput);
      l && (l.value = t);
    }
    const r = e.get("page");
    if (r) {
      const l = parseInt(r, 10);
      this.state.currentPage = Number.isNaN(l) ? 1 : Math.max(1, l);
    }
    const n = e.get("perPage");
    if (n) {
      const l = parseInt(n, 10), c = this.config.perPage || 10;
      this.state.perPage = Number.isNaN(l) ? c : Math.max(1, l);
      const d = document.querySelector(this.selectors.perPageSelect);
      d && (d.value = String(this.state.perPage));
    }
    const i = e.get("filters");
    if (i)
      try {
        this.state.filters = JSON.parse(i);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse filters from URL:", l);
      }
    const o = e.get("sort");
    if (o)
      try {
        this.state.sort = JSON.parse(o);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse sort from URL:", l);
      }
    const a = e.get("hiddenColumns");
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
        const u = this.defaultColumns.map((f) => f.field);
        this.shouldReorderDOMOnRestore = u.join("|") !== d.join("|");
        const h = new Map(this.config.columns.map((f) => [f.field, f]));
        this.config.columns = d.map((f) => h.get(f)).filter((f) => f !== void 0), console.log("[DataGrid] Column order restored from cache:", d);
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
  pushStateToURL() {
    const e = new URLSearchParams();
    this.state.search && e.set("search", this.state.search), this.state.currentPage > 1 && e.set("page", String(this.state.currentPage)), this.state.perPage !== (this.config.perPage || 10) && e.set("perPage", String(this.state.perPage)), this.state.filters.length > 0 && e.set("filters", JSON.stringify(this.state.filters)), this.state.sort.length > 0 && e.set("sort", JSON.stringify(this.state.sort)), this.state.hiddenColumns.size > 0 && e.set("hiddenColumns", JSON.stringify(Array.from(this.state.hiddenColumns)));
    const t = e.toString() ? `${window.location.pathname}?${e.toString()}` : window.location.pathname;
    window.history.pushState({}, "", t), console.log("[DataGrid] URL updated:", t);
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
      if (!t.ok)
        throw new Error(`HTTP error! status: ${t.status}`);
      const r = await t.json();
      console.log("[DataGrid] API Response:", r), console.log("[DataGrid] API Response data array:", r.data), console.log("[DataGrid] API Response total:", r.total, "count:", r.count, "$meta:", r.$meta), this.lastSchema = r.schema || null, this.lastForm = r.form || null;
      const n = this.getResponseTotal(r);
      if (this.normalizePagination(n))
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
    Object.entries(t).forEach(([n, i]) => {
      i != null && e.append(n, String(i));
    });
    const r = `${this.config.apiEndpoint}?${e.toString()}`;
    return console.log(`[DataGrid] API URL: ${r}`), r;
  }
  /**
   * Build query string (for exports, etc.)
   */
  buildQueryString() {
    const e = new URLSearchParams(), t = this.buildQueryParams();
    return Object.entries(t).forEach(([r, n]) => {
      n != null && e.append(r, String(n));
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
    return e;
  }
  getResponseTotal(e) {
    return e.total !== void 0 && e.total !== null ? e.total : e.$meta?.count !== void 0 && e.$meta?.count !== null ? e.$meta.count : e.count !== void 0 && e.count !== null ? e.count : null;
  }
  normalizePagination(e) {
    if (e === null)
      return !1;
    const t = Math.max(1, this.state.perPage || this.config.perPage || 10), r = Math.max(1, Math.ceil(e / t));
    let n = this.state.currentPage;
    e === 0 ? n = 1 : n > r ? n = r : n < 1 && (n = 1);
    const i = t !== this.state.perPage || n !== this.state.currentPage;
    return i && (this.state.perPage = t, this.state.currentPage = n, this.pushStateToURL()), e === 0 ? !1 : i;
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
    const n = this.getResponseTotal(e);
    if (this.state.totalRows = n ?? r.length, r.length === 0) {
      this.config.enableGroupedMode && this.state.viewMode === "grouped" ? t.innerHTML = is(this.config.columns.length) : t.innerHTML = `
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
    e.forEach((r, n) => {
      console.log(`[DataGrid] Rendering row ${n + 1}: id=${r.id}`), r.id && (this.recordsById[r.id] = r);
      const i = this.createTableRow(r);
      t.appendChild(i);
    }), console.log(`[DataGrid] Finished appending ${e.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length);
  }
  /**
   * Render data in grouped mode (Phase 2)
   */
  renderGroupedData(e, t, r) {
    const n = this.config.groupByField || "translation_group_id";
    let i = Hn(t, {
      groupByField: n,
      defaultExpanded: !0,
      expandedGroups: this.state.expandedGroups
    });
    const o = Yn(e);
    o.size > 0 && (i = Kn(i, o)), this.state.groupedData = i;
    const a = this.config.columns.length;
    for (const l of i.groups) {
      const c = ns(l, a);
      r.insertAdjacentHTML("beforeend", c);
      const d = r.lastElementChild;
      if (d && (d.addEventListener("click", () => this.toggleGroup(l.groupId)), d.addEventListener("keydown", (u) => {
        (u.key === "Enter" || u.key === " ") && (u.preventDefault(), this.toggleGroup(l.groupId));
      })), l.expanded)
        for (const u of l.records) {
          u.id && (this.recordsById[u.id] = u);
          const h = this.createTableRow(u);
          h.dataset.groupId = l.groupId, h.classList.add("group-child-row"), r.appendChild(h);
        }
    }
    for (const l of i.ungrouped) {
      l.id && (this.recordsById[l.id] = l);
      const c = this.createTableRow(l);
      r.appendChild(c);
    }
    console.log(`[DataGrid] Rendered ${i.groups.length} groups, ${i.ungrouped.length} ungrouped`);
  }
  /**
   * Toggle group expand/collapse state (Phase 2)
   */
  toggleGroup(e) {
    if (!this.state.groupedData) return;
    this.state.expandedGroups.has(e) ? this.state.expandedGroups.delete(e) : this.state.expandedGroups.add(e);
    const t = this.config.panelId || this.config.tableId;
    Xn(t, this.state.expandedGroups);
    const r = this.state.groupedData.groups.find((n) => n.groupId === e);
    r && (r.expanded = this.state.expandedGroups.has(e)), this.updateGroupVisibility(e);
  }
  /**
   * Update visibility of child rows for a group
   */
  updateGroupVisibility(e) {
    const t = this.tableEl?.querySelector("tbody");
    if (!t) return;
    const r = t.querySelector(`tr[data-group-id="${e}"]`);
    if (!r) return;
    const n = this.state.expandedGroups.has(e);
    r.dataset.expanded = String(n), r.setAttribute("aria-expanded", String(n));
    const i = r.querySelector(".expand-icon");
    i && (i.textContent = n ? "▼" : "▶"), t.querySelectorAll(`tr.group-child-row[data-group-id="${e}"]`).forEach((a) => {
      a.style.display = n ? "" : "none";
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
    const t = as(e);
    this.state.viewMode = t;
    const r = this.config.panelId || this.config.tableId;
    Zn(r, t), this.refresh();
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
    const r = await t.json(), n = this.normalizeDetailResponse(r);
    return n.schema && (this.lastSchema = n.schema), n.form && (this.lastForm = n.form), {
      ...n,
      tabs: n.schema?.tabs || []
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
    const n = document.createElement("td");
    n.className = "px-6 py-4 whitespace-nowrap", n.dataset.role = "selection", n.dataset.fixed = "left", n.innerHTML = `
      <label class="flex">
        <input type="checkbox"
               class="table-checkbox shrink-0 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
               data-id="${e.id}">
        <span class="sr-only">Select</span>
      </label>
    `, t.appendChild(n), this.config.columns.forEach((a) => {
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
              const f = h instanceof Error ? h.message : `Action "${l.label}" failed`;
              this.notify(f, "error");
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
              const f = h instanceof Error ? h.message : `Action "${l.label}" failed`;
              this.notify(f, "error");
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
    const t = this.getResponseTotal(e) ?? this.state.totalRows, r = this.state.perPage * (this.state.currentPage - 1), n = t === 0 ? 0 : r + 1, i = Math.min(r + this.state.perPage, t), o = document.querySelector(this.selectors.tableInfoStart), a = document.querySelector(this.selectors.tableInfoEnd), l = document.querySelector(this.selectors.tableInfoTotal);
    o && (o.textContent = String(n)), a && (a.textContent = String(i)), l && (l.textContent = String(t)), this.renderPaginationButtons(t);
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
    const n = [], i = this.state.currentPage;
    n.push(`
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
              data-page="${i + 1}"
              ${i === r ? "disabled" : ""}
              class="min-h-[38px] min-w-[38px] py-2 px-2.5 inline-flex justify-center items-center gap-x-1.5 text-sm rounded-lg text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none">
        <span>Next</span>
        <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `), t.innerHTML = n.join(""), t.querySelectorAll("[data-page]").forEach((c) => {
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
        const n = t.dataset.filterColumn, i = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", o = t instanceof HTMLSelectElement ? "eq" : i === "" || i === "text" || i === "search" || i === "email" || i === "tel" || i === "url" ? "ilike" : "eq", a = t.dataset.filterOperator || o, l = t.value;
        if (!n) return;
        const c = this.state.filters.findIndex((d) => d.column === n);
        if (l) {
          const d = { column: n, operator: a, value: l };
          c >= 0 ? this.state.filters[c] = d : this.state.filters.push(d);
        } else
          c >= 0 && this.state.filters.splice(c, 1);
        this.pushStateToURL(), this.config.behaviors?.filter ? await this.config.behaviors.filter.onFilterChange(n, l, this) : (this.resetPagination(), await this.refresh());
      };
      t.addEventListener("input", r), t.addEventListener("change", r);
    });
  }
  /**
   * Bind column visibility toggle using ColumnManager
   */
  bindColumnVisibility() {
    const e = document.querySelector(this.selectors.columnToggleBtn), t = document.querySelector(this.selectors.columnToggleMenu);
    !e || !t || (this.columnManager = new zn({
      container: t,
      grid: this,
      onToggle: (r, n) => {
        console.log(`[DataGrid] Column ${r} visibility toggled to ${n}`);
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
        const n = r.dataset.exportFormat;
        if (!n || !this.config.behaviors?.export) return;
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
          await this.config.behaviors.export.export(n, this);
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
      r.addEventListener("click", async (n) => {
        n.preventDefault(), n.stopPropagation();
        const i = r.dataset.sortColumn;
        if (!i) return;
        console.log(`[DataGrid] Sort button clicked for field: ${i}`);
        const o = this.state.sort.find((l) => l.field === i);
        let a = null;
        o ? o.direction === "asc" ? (a = "desc", o.direction = a) : (this.state.sort = this.state.sort.filter((l) => l.field !== i), a = null, console.log(`[DataGrid] Sort cleared for field: ${i}`)) : (a = "asc", this.state.sort = [{ field: i, direction: a }]), console.log("[DataGrid] New sort state:", this.state.sort), this.pushStateToURL(), a !== null && this.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await this.config.behaviors.sort.onSort(i, a, this)) : (console.log("[DataGrid] Calling refresh() for sort"), await this.refresh()), console.log("[DataGrid] Updating sort indicators"), this.updateSortIndicators();
      });
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.sort;
        if (!n) return;
        const i = this.state.sort.find((a) => a.field === n);
        let o = null;
        i ? i.direction === "asc" ? (o = "desc", i.direction = o) : (this.state.sort = this.state.sort.filter((a) => a.field !== n), o = null) : (o = "asc", this.state.sort = [{ field: n, direction: o }]), this.pushStateToURL(), o !== null && this.config.behaviors?.sort ? await this.config.behaviors.sort.onSort(n, o, this) : await this.refresh(), this.updateSortIndicators();
      });
    });
  }
  /**
   * Update sort indicators in table headers
   */
  updateSortIndicators() {
    if (!this.tableEl) return;
    this.tableEl.querySelectorAll("[data-sort-column]").forEach((r) => {
      const n = r.dataset.sortColumn;
      if (!n) return;
      const i = this.state.sort.find((a) => a.field === n), o = r.querySelector("svg");
      o && (i ? (r.classList.remove("opacity-0"), r.classList.add("opacity-100"), i.direction === "asc" ? (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', o.classList.add("text-blue-600"), o.classList.remove("text-gray-400")) : (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', o.classList.add("text-blue-600"), o.classList.remove("text-gray-400"))) : (o.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', o.classList.remove("text-blue-600"), o.classList.add("text-gray-400")));
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      const n = r.dataset.sort, i = this.state.sort.find((a) => a.field === n), o = r.querySelector(".sort-indicator");
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
        const n = r.dataset.id;
        n && (e.checked ? this.state.selectedRows.add(n) : this.state.selectedRows.delete(n));
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
          const c = `${t}/${a}`, d = o.dataset.bulkConfirm, u = this.parseDatasetStringArray(o.dataset.bulkPayloadRequired), h = this.parseDatasetObject(o.dataset.bulkPayloadSchema), f = {
            id: a,
            label: o.textContent?.trim() || a,
            endpoint: c,
            confirm: d,
            payloadRequired: u,
            payloadSchema: h
          };
          try {
            await this.actionRenderer.executeBulkAction(f, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
          } catch (g) {
            console.error("Bulk action failed:", g), this.showError("Bulk action failed");
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
    const n = document.getElementById("clear-selection-btn");
    n && n.addEventListener("click", () => {
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
    const r = e.getBoundingClientRect(), n = t.offsetHeight || 300, o = window.innerHeight - r.bottom, a = r.top, l = o < n && a > o, c = r.right - (t.offsetWidth || 224);
    t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${r.top - n - 8}px`, t.style.bottom = "auto") : (t.style.top = `${r.bottom + 8}px`, t.style.bottom = "auto");
  }
  /**
   * Bind dropdown toggles
   */
  bindDropdownToggles() {
    this.dropdownAbortController && this.dropdownAbortController.abort(), this.dropdownAbortController = new AbortController();
    const { signal: e } = this.dropdownAbortController;
    document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
      const r = t.dataset.dropdownToggle, n = document.getElementById(r || "");
      n && !n.classList.contains("hidden") && n.classList.add("hidden");
    }), document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
      t.addEventListener("click", (r) => {
        r.stopPropagation();
        const n = t.dataset.dropdownToggle, i = document.getElementById(n || "");
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
        const n = r.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
        n && n.setAttribute("aria-expanded", "false");
      }), document.querySelectorAll("[data-dropdown-toggle]").forEach((r) => {
        const n = r.dataset.dropdownToggle, i = document.getElementById(n || "");
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
    return e instanceof Response ? lr(e) : e instanceof Error ? e.message : "An unexpected error occurred";
  }
  parseDatasetStringArray(e) {
    if (e)
      try {
        const t = JSON.parse(e);
        if (!Array.isArray(t))
          return;
        const r = t.map((n) => typeof n == "string" ? n.trim() : "").filter((n) => n.length > 0);
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
    const r = new Map(this.config.columns.map((n) => [n.field, n]));
    this.config.columns = t.map((n) => r.get(n)).filter((n) => n !== void 0), this.reorderTableColumns(t), console.log("[DataGrid] Columns reordered:", t);
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
    const t = new Set(this.config.columns.map((o) => o.field)), r = new Set(e), n = e.filter((o) => t.has(o)), i = this.config.columns.map((o) => o.field).filter((o) => !r.has(o));
    return [...n, ...i];
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
    const n = Array.from(e.querySelectorAll(`${r}[data-column]`)), i = new Map(
      n.map((d) => [d.dataset.column, d])
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
}
typeof window < "u" && (window.DataGrid = ls);
const er = {
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
class ro {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new qe();
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
        this.criteria = r.map((n) => ({
          field: n.column,
          operator: n.operator || "ilike",
          value: n.value,
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
    const t = document.getElementById("advanced-search-close"), r = document.getElementById("advanced-search-cancel"), n = document.getElementById("advanced-search-overlay");
    t?.addEventListener("click", () => this.close()), r?.addEventListener("click", () => this.close()), n?.addEventListener("click", () => this.close()), document.getElementById("add-criteria-btn")?.addEventListener("click", () => this.addCriterion()), document.getElementById("advanced-search-apply")?.addEventListener("click", () => this.applySearch());
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
      const r = document.createElement("div"), n = this.createCriterionRow(e, t);
      if (r.appendChild(n), t < this.criteria.length - 1) {
        const i = this.createLogicConnector(t);
        r.appendChild(i);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((i) => i.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
      <select data-criterion-index="${t}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map((i) => `
          <option value="${i.name}" ${i.name === e.field ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      <select data-criterion-index="${t}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(n).map((i) => `
          <option value="${i.value}" ${i.value === e.operator ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      ${this.createValueInput(n, e, t)}

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
    `, t.querySelectorAll("[data-logic-index]").forEach((n) => {
      n.addEventListener("click", (i) => {
        const o = i.target, a = parseInt(o.dataset.logicIndex || "0", 10), l = o.dataset.logicValue;
        this.criteria[a].logic = l, this.renderCriteria();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : er[e.type] || er.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new zt({
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
    new zt({
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
    const e = document.getElementById("filter-chips-container"), t = document.getElementById("table-search"), r = document.getElementById("search-clear-btn");
    if (e) {
      if (e.innerHTML = "", this.criteria.length === 0) {
        t && (t.placeholder = "Search for items", t.style.display = ""), r && r.classList.add("hidden");
        return;
      }
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, i) => {
        const o = this.createChip(n, i);
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
const tr = {
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
class no {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new qe(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    `, r.appendChild(n), e.conditions.forEach((o, a) => {
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
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const i = this.config.fields.find((o) => o.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
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
    `, n;
  }
  renderValueInput(e, t, r, n) {
    return e.type === "select" && e.options ? `
        <select data-cond="${r}-${n}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${e.options.map((o) => `
            <option value="${o.value}" ${o.value === t.value ? "selected" : ""}>${o.label}</option>
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
      n.addEventListener("click", (i) => {
        const o = i.target, a = parseInt(o.dataset.groupLogic || "0", 10), l = o.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((i) => {
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : tr[e.type] || tr.text;
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
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const i = n.operator.toUpperCase(), o = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${i === "ILIKE" ? "ILIKE" : i === "EQ" ? "=" : i} ${o}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const i = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${i.toUpperCase()} ${r}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const i = this.config.fields.find((l) => l.name === n.field), o = i?.label || n.field, a = this.getOperatorsForField(i).find((l) => l.value === n.operator)?.label || n.operator;
        return `${o} ${a} "${n.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const i = this.structure.groupLogic[n - 1] || "and";
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
    e.forEach((n) => {
      const i = n.column;
      t.has(i) || t.set(i, []), t.get(i).push(n);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((i) => ({
          field: i.column,
          operator: i.operator || "ilike",
          value: i.value
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
}
class so {
  constructor(e) {
    if (this.searchableFields = e, !e || e.length === 0)
      throw new Error("At least one searchable field is required");
  }
  buildQuery(e) {
    if (!e || e.trim() === "")
      return {};
    const t = {}, r = e.trim();
    return this.searchableFields.forEach((n) => {
      t[`${n}__ilike`] = `%${r}%`;
    }), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
class io {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "")
        return;
      const i = n.operator || "eq", o = n.column;
      r.has(o) || r.set(o, { operator: i, values: [] }), r.get(o).values.push(n.value);
    }), r.forEach((n, i) => {
      if (n.values.length === 1) {
        const o = n.operator === "eq" ? i : `${i}__${n.operator}`;
        t[o] = n.values[0];
      } else
        n.operator === "ilike" ? t[`${i}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${i}__in`] = n.values.join(",") : t[`${i}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}
class oo {
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
class ao {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class lo {
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
    const r = cs(t, this.config, e);
    r.delivery = ds(this.config, e);
    let n;
    try {
      n = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json,application/octet-stream"
        },
        body: JSON.stringify(r)
      });
    } catch (i) {
      const o = i instanceof Error ? i.message : "Network error during export";
      throw he(t, "error", o), i;
    }
    if (n.status === 202) {
      const i = await n.json().catch(() => ({}));
      he(t, "info", "Export queued. You can download it when ready.");
      const o = i?.status_url || "";
      if (o) {
        const a = fs(i, o);
        try {
          await ps(o, {
            intervalMs: us(this.config),
            timeoutMs: hs(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await $t(l);
            throw he(t, "error", c), new Error(c);
          }
          await nr(l, r.definition || r.resource || "export", r.format), he(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw he(t, "error", c), l;
        }
      }
      if (i?.download_url) {
        window.open(i.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const i = await $t(n);
      throw he(t, "error", i), new Error(i);
    }
    await nr(n, r.definition || r.resource || "export", r.format), he(t, "success", "Export ready.");
  }
}
function cs(s, e, t) {
  const r = Ss(t), n = ms(s, e), i = bs(s, e), o = vs(s), a = ys(o), l = {
    format: r,
    query: a,
    selection: n,
    columns: i,
    delivery: e.delivery || "auto"
  };
  e.definition && (l.definition = e.definition), e.resource && (l.resource = e.resource);
  const c = e.sourceVariant || e.variant;
  return c && (l.source_variant = c), l;
}
function ds(s, e) {
  return s.delivery ? s.delivery : (s.asyncFormats && s.asyncFormats.length > 0 ? s.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function us(s) {
  const e = Number(s.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function hs(s) {
  const e = Number(s.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function fs(s, e) {
  return s?.download_url ? s.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function ps(s, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await fetch(s, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const a = await $t(n);
      throw new Error(a);
    }
    const i = await n.json().catch(() => ({})), o = String(i?.state || "").toLowerCase();
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
    await gs(r);
  }
}
function gs(s) {
  return new Promise((e) => setTimeout(e, s));
}
function ms(s, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(s.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function bs(s, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = s.state?.hiddenColumns ? new Set(s.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(s.state?.columnOrder) && s.state.columnOrder.length > 0 ? s.state.columnOrder : s.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function vs(s) {
  const e = {}, t = s.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(s.state.currentPage, s.state.perPage)), s.state.search && t.search && Object.assign(e, t.search.buildQuery(s.state.search)), s.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(s.state.filters)), s.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(s.state.sort)), e;
}
function ys(s) {
  const e = {}, t = [];
  return Object.entries(s).forEach(([r, n]) => {
    if (n == null || n === "")
      return;
    switch (r) {
      case "limit":
        e.limit = rr(n);
        return;
      case "offset":
        e.offset = rr(n);
        return;
      case "order":
      case "sort":
        e.sort = xs(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: i, op: o } = ws(r);
    i && t.push({ field: i, op: o, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function ws(s) {
  const e = s.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function xs(s) {
  return s ? s.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", n = t[1] || "asc";
    return { field: r, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function Ss(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function rr(s) {
  const e = Number(s);
  return Number.isFinite(e) ? e : 0;
}
async function nr(s, e, t) {
  const r = await s.blob(), n = Cs(s, e, t), i = URL.createObjectURL(r), o = document.createElement("a");
  o.href = i, o.download = n, o.rel = "noopener", document.body.appendChild(o), o.click(), o.remove(), URL.revokeObjectURL(i);
}
function Cs(s, e, t) {
  const r = s.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return Es(r) || n;
}
function Es(s) {
  if (!s) return null;
  const e = s.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = s.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function $t(s) {
  if ((s.headers.get("content-type") || "").includes("application/json")) {
    const r = await s.json().catch(() => ({}));
    if (r?.error?.message)
      return r.error.message;
    if (r?.message)
      return r.message;
  }
  const t = await s.text().catch(() => "");
  return t || `Export failed (${s.status})`;
}
function he(s, e, t) {
  const r = s.config.notifier;
  if (r && typeof r[e] == "function") {
    r[e](t);
    return;
  }
  const n = window.toastManager;
  if (n && typeof n[e] == "function") {
    n[e](t);
    return;
  }
  e === "error" && alert(t);
}
class co {
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
    const n = this.getActionEndpoint(e), i = await fetch(n, {
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
function $s(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function ks(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function Ar(s) {
  return typeof s == "object" && s !== null && "version" in s && s.version === 2;
}
class As {
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
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((a) => a.field === e ? !r : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), i = {};
    t.config.columns.forEach((a) => {
      i[a.field] = n.includes(a.field);
    });
    const o = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: i,
      order: o.length > 0 ? o : void 0
    }), t.updateColumnVisibility(n);
  }
  /**
   * Reorder columns and persist to storage
   * Stores both visibility and order in V2 format
   */
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
      const r = new Set(e), n = t.order.filter((i) => r.has(i));
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
      const r = new Set(e), n = /* @__PURE__ */ new Set();
      return Object.entries(t.visibility).forEach(([i, o]) => {
        !o && r.has(i) && n.add(i);
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
      if (Ar(t))
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
class uo extends As {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = $s(t.basePath), i = ks(t.apiBasePath);
    t.preferencesEndpoint ? this.preferencesEndpoint = t.preferencesEndpoint : i ? this.preferencesEndpoint = `${i}/preferences` : n ? this.preferencesEndpoint = `${n}/api/preferences` : this.preferencesEndpoint = "/api/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
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
      const n = r[0]?.raw;
      if (!n || !n[this.serverPrefsKey])
        return console.log("[ServerColumnVisibility] No column preferences in server response"), null;
      const i = n[this.serverPrefsKey];
      return Ar(i) ? (this.serverPrefs = i, this.savePrefs(i), console.log("[ServerColumnVisibility] Loaded prefs from server:", i), i) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", i), null);
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
      const n = new Set(e), i = (t.order || []).filter((o) => n.has(o));
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
    e.config.columns.forEach((n) => {
      t[n.field] = !e.state.hiddenColumns.has(n.field);
    });
    const r = {
      version: 2,
      visibility: t,
      order: e.state.columnOrder.length > 0 ? e.state.columnOrder : void 0
    };
    try {
      const n = await fetch(this.preferencesEndpoint, {
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
      if (!n.ok) {
        console.warn("[ServerColumnVisibility] Failed to sync to server:", n.status);
        return;
      }
      this.serverPrefs = r, console.log("[ServerColumnVisibility] Synced prefs to server:", r);
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
const sr = {
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
}, Ls = 5e3;
class _s {
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
    let n = 0;
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
          insertionIndex: n++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, i, n);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, i, n);
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
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : sr[r] !== void 0 ? sr[r] : Ls;
  }
  /**
   * Build a single action from schema definition
   */
  buildActionFromSchema(e, t, r, n) {
    const i = t.name, o = t.label || t.label_key || i, a = t.variant || "secondary", l = t.icon, c = this.isNavigationAction(t), d = i === "delete";
    return c ? this.applyActionState(
      this.buildNavigationAction(e, t, o, a, l, r),
      n
    ) : d ? this.applyActionState(this.buildDeleteAction(e, o, a, l), n) : this.applyActionState(this.buildPostAction(e, t, o, a, l), n);
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
    for (const n of r) {
      const i = typeof n == "string" ? n.trim() : "";
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
    const n = r[t];
    return !n || typeof n != "object" || Array.isArray(n) ? null : n;
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
    switch (typeof e.reason_code == "string" ? e.reason_code.trim().toLowerCase() : "") {
      case "workflow_transition_not_available":
        return "Action is not available in the current workflow state.";
      case "permission_denied":
        return "You do not have permission to execute this action.";
      case "missing_context_required":
        return "Action is unavailable because required record context is missing.";
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
    const n = r.split(".").map((o) => o.trim()).filter(Boolean);
    if (n.length === 0) return;
    let i = e;
    for (const o of n) {
      if (!i || typeof i != "object" || Array.isArray(i))
        return;
      i = i[o];
    }
    return i;
  }
  /**
   * Build navigation action (view, edit, etc.)
   */
  buildNavigationAction(e, t, r, n, i, o) {
    const a = String(e.id || ""), l = this.config.actionBasePath;
    let c;
    return t.href ? c = t.href.replace("{id}", a) : t.name === "edit" ? c = `${l}/${a}/edit` : c = `${l}/${a}`, o && (c += c.includes("?") ? `&${o}` : `?${o}`), {
      label: r,
      icon: i || this.getDefaultIcon(t.name),
      variant: n,
      action: () => {
        window.location.href = c;
      }
    };
  }
  /**
   * Build delete action with confirmation
   */
  buildDeleteAction(e, t, r, n) {
    const i = String(e.id || ""), o = this.config.apiEndpoint;
    return {
      label: t,
      icon: n || "trash",
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
  buildPostAction(e, t, r, n, i) {
    const o = String(e.id || ""), a = t.name, l = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      label: r,
      icon: i || this.getDefaultIcon(a),
      variant: n,
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
    const t = await Lt(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (Ur(t.error)) {
      const n = Gr(t.error);
      if (n && this.config.onTranslationBlocker) {
        const i = { ...e.payload };
        return this.config.onTranslationBlocker({
          actionName: e.actionName,
          recordId: e.recordId,
          ...n,
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
    const r = typeof e.id == "string" ? e.id : String(e.id || ""), n = typeof e.locale == "string" ? e.locale : "";
    if (!r) {
      console.warn("[SchemaActionBuilder] create_translation response missing id");
      return;
    }
    const i = this.config.actionBasePath, o = new URLSearchParams();
    n && o.set("locale", n), this.config.environment && o.set("env", this.config.environment);
    const a = o.toString(), l = `${i}/${r}/edit${a ? `?${a}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(n || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, {
      action: {
        label: `View ${c.toUpperCase()}`,
        handler: () => {
          const h = new URLSearchParams();
          h.set("locale", c), this.config.environment && h.set("env", this.config.environment);
          const f = typeof t.id == "string" ? t.id : String(t.id || r);
          window.location.href = `${i}/${f}/edit?${h.toString()}`;
        }
      }
    }) : console.log(`[SchemaActionBuilder] Translation created: ${n}`), window.location.href = l;
  }
  /**
   * Build action payload from record and schema
   */
  async buildActionPayload(e, t) {
    const r = {
      id: e.id
    };
    this.config.locale && (r.locale = this.config.locale), this.config.environment && (r.environment = this.config.environment), this.config.panelName && (r.policy_entity = this.config.panelName);
    const n = this.normalizePayloadSchema(t.payload_schema), i = this.collectRequiredFields(t.payload_required, n);
    if (n?.properties)
      for (const [l, c] of Object.entries(n.properties))
        r[l] === void 0 && c.default !== void 0 && (r[l] = c.default);
    i.includes("idempotency_key") && this.isEmptyPayloadValue(r.idempotency_key) && (r.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const o = i.filter((l) => this.isEmptyPayloadValue(r[l]));
    if (o.length === 0)
      return r;
    const a = await this.promptForPayload(t, o, n, r, e);
    if (a === null)
      return null;
    for (const l of o) {
      const c = n?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        throw new Error(u.error);
      r[l] = u.value;
    }
    return r;
  }
  /**
   * Prompt user for required payload values
   * Uses the existing PayloadInputModal from actions.ts
   */
  async promptForPayload(e, t, r, n, i) {
    if (t.length === 0)
      return {};
    const { PayloadInputModal: o } = await Promise.resolve().then(() => Ds), a = t.map((c) => {
      const d = r?.properties?.[c];
      return {
        name: c,
        label: d?.title || c,
        description: d?.description,
        value: this.stringifyDefault(n[c] ?? d?.default),
        type: d?.type || "string",
        options: this.buildFieldOptions(c, e.name, d, i)
      };
    });
    return await o.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: a
    });
  }
  /**
   * Build field options from schema property
   */
  buildFieldOptions(e, t, r, n) {
    if (!r)
      return this.deriveCreateTranslationLocaleOptions(e, t, n);
    if (r.oneOf)
      return r.oneOf.filter((o) => o && "const" in o).map((o) => ({
        value: this.stringifyDefault(o.const),
        label: o.title || this.stringifyDefault(o.const)
      }));
    if (r.enum)
      return r.enum.map((o) => ({
        value: this.stringifyDefault(o),
        label: this.stringifyDefault(o)
      }));
    const i = this.buildExtensionFieldOptions(r);
    return i && i.length > 0 ? i : this.deriveCreateTranslationLocaleOptions(e, t, n);
  }
  buildExtensionFieldOptions(e) {
    const t = e, r = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(r) || r.length === 0)
      return;
    const n = [];
    for (const i of r) {
      if (typeof i == "string") {
        const d = this.stringifyDefault(i);
        if (!d)
          continue;
        n.push({ value: d, label: d });
        continue;
      }
      if (!i || typeof i != "object")
        continue;
      const o = i.value, a = this.stringifyDefault(o);
      if (!a)
        continue;
      const l = i.label, c = this.stringifyDefault(l) || a;
      n.push({ value: a, label: c });
    }
    return n.length > 0 ? n : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object")
      return;
    const n = this.asObject(r.translation_readiness);
    let i = this.asStringArray(n?.missing_required_locales);
    if (i.length === 0 && (i = this.asStringArray(r.missing_locales)), i.length === 0 && n) {
      const u = this.asStringArray(n.required_locales), h = new Set(this.asStringArray(n.available_locales));
      i = u.filter((f) => !h.has(f));
    }
    if (i.length === 0)
      return;
    const o = this.extractStringField(r, "recommended_locale"), a = this.asStringArray(n?.required_for_publish ?? n?.required_locales), l = this.asStringArray(n?.available_locales ?? r.existing_locales), c = /* @__PURE__ */ new Set(), d = [];
    for (const u of i) {
      const h = u.trim().toLowerCase();
      if (!h || c.has(h))
        continue;
      c.add(h);
      const f = o?.toLowerCase() === h, g = a.includes(h), b = [];
      g && b.push("Required for publishing"), l.length > 0 && b.push(`${l.length} translation${l.length > 1 ? "s" : ""} exist`);
      const C = b.length > 0 ? b.join(" • ") : void 0;
      let k = `${h.toUpperCase()} - ${this.localeLabel(h)}`;
      f && (k += " (recommended)"), d.push({
        value: h,
        label: k,
        description: C,
        recommended: f
      });
    }
    return d.sort((u, h) => u.recommended && !h.recommended ? -1 : !u.recommended && h.recommended ? 1 : u.value.localeCompare(h.value)), d.length > 0 ? d : void 0;
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
    const n = e.required, i = Array.isArray(n) ? n.filter((o) => typeof o == "string").map((o) => o.trim()).filter((o) => o.length > 0) : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: i,
      properties: r
    };
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), i = (o) => {
      const a = o.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((o) => i(String(o))), Array.isArray(t?.required) && t.required.forEach((o) => i(String(o))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), i = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${n || "record"}-${i}`;
  }
  coercePromptValue(e, t, r) {
    const n = typeof e == "string" ? e.trim() : String(e ?? "").trim(), i = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (n.length === 0)
      return { value: n };
    if (i === "number" || i === "integer") {
      const o = Number(n);
      return Number.isFinite(o) ? { value: i === "integer" ? Math.trunc(o) : o } : { value: null, error: `${t} must be a valid number` };
    }
    if (i === "boolean") {
      const o = n.toLowerCase();
      return o === "true" || o === "1" || o === "yes" ? { value: !0 } : o === "false" || o === "0" || o === "no" ? { value: !1 } : { value: null, error: `${t} must be true or false` };
    }
    if (i === "array" || i === "object")
      try {
        return { value: JSON.parse(n) };
      } catch {
        return { value: null, error: `${t} must be valid JSON (${i === "array" ? "[...]" : "{...}"})` };
      }
    return { value: n };
  }
  buildActionErrorMessage(e, t) {
    return Vr(t, `${e} failed`);
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
    const n = String(t.id || ""), i = this.config.actionBasePath, o = this.config.apiEndpoint, a = [
      {
        name: "view",
        button: {
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let l = `${i}/${n}`;
            r && (l += `?${r}`), window.location.href = l;
          }
        }
      },
      {
        name: "edit",
        button: {
          label: "Edit",
          icon: "edit",
          variant: "primary",
          action: () => {
            let l = `${i}/${n}/edit`;
            r && (l += `?${r}`), window.location.href = l;
          }
        }
      },
      {
        name: "delete",
        button: {
          label: "Delete",
          icon: "trash",
          variant: "danger",
          action: async () => {
            if (!window.confirm("Are you sure you want to delete this item?")) return;
            if (!(await fetch(`${o}/${n}`, {
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
  appendDefaultActionsOrdered(e, t, r, n) {
    const i = String(t.id || ""), o = this.config.actionBasePath, a = this.config.apiEndpoint, l = [
      {
        name: "view",
        button: {
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
function ho(s, e, t) {
  return new _s(t).buildRowActions(s, e);
}
function fo(s) {
  return s.schema?.actions;
}
class Bt extends _t {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = r;
  }
  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(e) {
    return new Promise((t) => {
      new Bt(
        e,
        (n) => t(n),
        () => t(null)
      ).show();
    });
  }
  renderContent() {
    const e = this.modalConfig.fields.map((t) => this.renderField(t)).join("");
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${m(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${m(this.modalConfig.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${m(this.modalConfig.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), r = () => {
      this.clearErrors();
      const i = {};
      let o = null;
      for (const a of this.modalConfig.fields) {
        const l = this.container?.querySelector(
          `[data-payload-field="${a.name}"]`
        );
        if (!l)
          continue;
        const c = l.value.trim();
        i[a.name] = c, c || (o || (o = l), this.showFieldError(a.name, "This field is required."));
      }
      if (o) {
        o.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(i), this.hide();
    };
    e?.addEventListener("submit", (i) => {
      i.preventDefault(), r();
    }), t?.addEventListener("click", () => {
      this.hide();
    }), this.container?.querySelectorAll("[data-payload-radio-group]")?.forEach((i) => {
      const o = i.dataset.payloadRadioGroup;
      if (!o) return;
      const a = i.querySelectorAll(`[data-payload-radio="${o}"]`), l = i.querySelector(`[data-payload-field="${o}"]`);
      l && a.forEach((c) => {
        c.addEventListener("change", () => {
          c.checked && (l.value = c.value);
        });
      });
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${m(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${m(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    let t = e.value;
    const r = e.options || [];
    if (!t) {
      const o = r.find((a) => a.recommended);
      o && (t = o.value);
    }
    if (r.some((o) => o.description))
      return this.renderRadioGroup(e, r, t);
    const i = r.map((o) => {
      const a = o.value === t ? " selected" : "";
      return `<option value="${m(o.value)}"${a}>${m(o.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${e.name}"
              data-payload-field="${e.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${i}
      </select>
    `;
  }
  renderRadioGroup(e, t, r) {
    const n = t.map((o, a) => {
      const l = o.value === r ? " checked" : "", c = o.description ? `<span class="text-xs text-gray-500 block ml-6 mt-0.5">${m(o.description)}</span>` : "";
      return `
          <label class="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${o.recommended ? "bg-blue-50 border border-blue-200" : ""}">
            <input type="radio"
                   name="payload-radio-${e.name}"
                   value="${m(o.value)}"
                   data-payload-radio="${e.name}"
                   class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                   ${l} />
            <span class="flex-1">
              <span class="text-sm font-medium text-gray-900">${m(o.label)}</span>
              ${c}
            </span>
          </label>
        `;
    }).join(""), i = r || "";
    return `
      <div class="space-y-1" data-payload-radio-group="${e.name}">
        <input type="hidden"
               data-payload-field="${e.name}"
               value="${m(i)}" />
        ${n}
      </div>
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${m(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${m(e.value)}"
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
}
const Ds = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PayloadInputModal: Bt
}, Symbol.toStringTag, { value: "Module" }));
class Ot extends _t {
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
      new Ot({
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
                Cannot ${m(e)} ${m(t)}
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
            Retry ${m(e)}
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
    const t = this.localeStates.get(e) || { loading: !1, created: !1 }, r = this.config.missingFieldsByLocale?.[e], n = Array.isArray(r) && r.length > 0, i = this.getLocaleLabel(e), o = t.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${t.loading ? "opacity-50" : ""}"
          data-locale-item="${m(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${m(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${m(i)}
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
                  ${r.map((l) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${m(l)}
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
              data-locale="${m(e)}"
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
    const n = this.config.navigationBasePath, i = t || this.config.recordId, o = new URLSearchParams();
    o.set("locale", e), this.config.environment && o.set("env", this.config.environment);
    const a = `${n}/${i}/edit?${o.toString()}`;
    return `
      <a href="${m(a)}"
         data-blocker-action="open"
         data-locale="${m(e)}"
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
    const n = this.container?.querySelectorAll("[data-locale-item]");
    n?.forEach((i, o) => {
      i.addEventListener("keydown", (a) => {
        a.key === "ArrowDown" && o < n.length - 1 ? (a.preventDefault(), n[o + 1].querySelector("[data-blocker-action]")?.focus()) : a.key === "ArrowUp" && o > 0 && (a.preventDefault(), n[o - 1].querySelector("[data-blocker-action]")?.focus());
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
        const n = `${this.config.apiEndpoint}/actions/create_translation`, i = await Lt(n, r);
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
        const n = r instanceof Error ? r.message : "Failed to create translation";
        this.config.onError?.(n);
      }
    }
  }
  updateLocaleItemUI(e) {
    const t = this.container?.querySelector(`[data-locale-item="${e}"]`);
    if (!t || !this.localeStates.get(e)) return;
    const n = t.parentElement;
    if (!n) return;
    const i = document.createElement("div");
    i.innerHTML = this.renderLocaleItem(e);
    const o = i.firstElementChild;
    o && (n.replaceChild(o, t), o.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
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
async function po(s) {
  try {
    await Ot.showBlocker(s);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = s.transition || "complete action", r = s.missingLocales.join(", "), n = `Cannot ${t}: Missing translations for ${r}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(n) : alert(n);
  }
}
const Is = [
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
class Lr {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || Is
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
    const { title: e, orientation: t, size: r, items: n, containerClass: i } = this.config, o = t === "vertical", a = r === "sm", l = o ? "flex-col" : "flex-row flex-wrap", c = a ? "gap-2" : "gap-4", d = a ? "text-xs" : "text-sm", u = a ? "text-sm" : "text-base", h = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${this.escapeHtml(e)}</span>` : "", f = n.map((g) => this.renderItem(g, u, d)).join("");
    return `
      <div class="status-legend inline-flex items-center ${l} ${c} ${i}"
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
function Ts(s) {
  const e = new Lr(s);
  return e.render(), e;
}
function go() {
  const s = document.querySelectorAll("[data-status-legend]"), e = [];
  return s.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const r = t.dataset.orientation || "horizontal", n = t.dataset.size || "default", i = t.dataset.title || "", o = Ts({
      container: t,
      orientation: r,
      size: n,
      title: i
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(o);
  }), e;
}
function mo(s = {}) {
  const e = document.createElement("div");
  return new Lr({
    container: e,
    ...s
  }).buildHTML();
}
const _r = [
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
class Ms {
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
    const { size: e = "default", containerClass: t = "" } = this.config, r = e === "sm" ? "text-xs" : "text-sm", n = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", i = this.config.filters.map((o) => this.renderFilterButton(o, r, n)).join("");
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
    const n = this.state.capabilities.get(e.key), i = n?.supported !== !1, o = this.state.activeKey === e.key, a = n?.disabledReason || "Filter not available", l = `inline-flex items-center gap-1 ${r} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let c, d;
    i ? o ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${kt(a)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${kt(e.key)}"
              ${d}
              ${i ? "" : "disabled"}>
        ${u}
        <span>${Ft(e.label)}</span>
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
function Rs(s, e, t = {}) {
  return new Ms({
    container: s,
    filters: _r,
    onFilterSelect: e,
    ...t
  });
}
function bo(s) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-quick-filters-init"))
      return;
    const n = r.dataset.size || "default", i = Rs(
      r,
      (o) => s(o, r),
      { size: n }
    );
    r.setAttribute("data-quick-filters-init", "true"), t.push(i);
  }), t;
}
function vo(s = {}) {
  const {
    filters: e = _r,
    activeKey: t = null,
    capabilities: r = [],
    size: n = "default",
    containerClass: i = ""
  } = s, o = n === "sm" ? "text-xs" : "text-sm", a = n === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const d of r)
    l.set(d.key, d);
  const c = e.map((d) => {
    const u = l.get(d.key), h = u?.supported !== !1, f = t === d.key, g = u?.disabledReason || "Filter not available", b = `inline-flex items-center gap-1 ${a} ${o} rounded-full font-medium`;
    let C;
    h ? f ? C = `${d.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : C = d.styleClass || "bg-gray-100 text-gray-700" : C = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const k = d.icon ? `<span>${d.icon}</span>` : "", E = h ? "" : `title="${kt(g)}"`;
    return `<span class="${b} ${C}" ${E}>${k}<span>${Ft(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-2 flex-wrap ${i}">${c}</div>`;
}
function Ft(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function kt(s) {
  return Ft(s);
}
async function Ps(s, e, t = {}) {
  const { apiEndpoint: r, notifier: n = new qe(), maxFailuresToShow: i = 5 } = s, o = `${r}/bulk/create-missing-translations`;
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
    const l = await a.json(), c = Bs(l, i);
    return Os(c, n), s.onSuccess && s.onSuccess(c), c;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw n.error(`Failed to create translations: ${l.message}`), s.onError && s.onError(l), l;
  }
}
function Bs(s, e) {
  const t = s.data || [], r = s.created_count ?? t.filter((l) => l.success).length, n = s.failed_count ?? t.filter((l) => !l.success).length, i = s.skipped_count ?? 0, o = s.total ?? t.length, a = t.filter((l) => !l.success && l.error).slice(0, e).map((l) => ({
    id: l.id,
    locale: l.locale,
    error: l.error || "Unknown error"
  }));
  return {
    total: o,
    created: r,
    failed: n,
    skipped: i,
    failures: a
  };
}
function Os(s, e) {
  const { created: t, failed: r, skipped: n, total: i } = s;
  if (i === 0) {
    e.info("No translations to create");
    return;
  }
  r === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${n > 0 ? ` (${n} skipped)` : ""}`) : n > 0 && e.info(`All ${n} translation${n !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${r} translation${r !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${r}${n > 0 ? `, skipped ${n}` : ""}`
  );
}
function yo(s) {
  const { created: e, failed: t, skipped: r, total: n, failures: i } = s, o = `
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
          <td class="px-3 py-2 text-sm text-gray-700">${bt(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${bt(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${bt(c.error)}</td>
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
        Processed ${n} item${n !== 1 ? "s" : ""}
      </div>
      ${o}
      ${a}
    </div>
  `;
}
function wo(s) {
  const { created: e, failed: t, skipped: r } = s, n = [];
  return e > 0 && n.push(`<span class="text-green-600">+${e}</span>`), t > 0 && n.push(`<span class="text-red-600">${t} failed</span>`), r > 0 && n.push(`<span class="text-yellow-600">${r} skipped</span>`), n.join(" · ");
}
function xo(s, e, t) {
  return async (r) => Ps(
    {
      apiEndpoint: s,
      notifier: e,
      onSuccess: t
    },
    r
  );
}
function bt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const Fs = {
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
function K(s) {
  const e = s.toLowerCase();
  return Fs[e] || s.toUpperCase();
}
class ot {
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
    const { locale: e, size: t, mode: r, localeExists: n } = this.config, { loading: i, created: o, error: a } = this.state, l = K(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = r === "button" ? "rounded-lg" : "rounded-full";
    let u, h = "";
    i ? (u = "bg-gray-100 text-gray-600 border-gray-300", h = this.renderSpinner()) : o ? (u = "bg-green-100 text-green-700 border-green-300", h = this.renderCheckIcon()) : a ? (u = "bg-red-100 text-red-700 border-red-300", h = this.renderErrorIcon()) : n ? u = "bg-blue-100 text-blue-700 border-blue-300" : u = "bg-amber-100 text-amber-700 border-amber-300";
    const f = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${c} ${d} border ${u}"
           data-locale-action="${m(e)}"
           data-locale-exists="${n}"
           data-loading="${i}"
           data-created="${o}"
           role="group"
           aria-label="${l} translation">
        ${h}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${m(e)}</span>
        <span class="sr-only">${l}</span>
        ${f}
      </div>
    `;
  }
  /**
   * Render action buttons (create/open).
   */
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: n, created: i } = this.state, o = r === "sm" ? "p-0.5" : "p-1", a = r === "sm" ? "w-3 h-3" : "w-4 h-4", l = [];
    if (!t && !i && !n && l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${o} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${m(e)}"
                aria-label="Create ${K(e)} translation"
                title="Create ${K(e)} translation">
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
                data-locale="${m(e)}"
                aria-label="Open ${K(e)} translation"
                title="Open ${K(e)} translation">
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
        const t = `${this.config.apiEndpoint}/actions/create_translation`, r = await Lt(t, e);
        if (r.success) {
          const n = r.data?.id ? String(r.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: n
          });
          const i = {
            id: n || this.config.recordId,
            locale: this.config.locale,
            status: String(r.data?.status || "draft"),
            translationGroupId: r.data?.translation_group_id ? String(r.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, i);
        } else {
          const n = r.error?.message || "Failed to create translation";
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
    const { locale: e, navigationBasePath: t, recordId: r, environment: n } = this.config, { newRecordId: i } = this.state, o = i || r, a = new URLSearchParams();
    a.set("locale", e), n && a.set("env", n);
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
function Dr(s) {
  return new ot(s).render();
}
function So(s, e) {
  return s.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${s.map((r) => {
    const n = { ...e, locale: r };
    return Dr(n);
  }).join("")}
    </div>
  `;
}
function Co(s, e) {
  const t = /* @__PURE__ */ new Map();
  return s.querySelectorAll("[data-locale-action]").forEach((n) => {
    const i = n.getAttribute("data-locale-action");
    if (!i) return;
    const o = n.getAttribute("data-locale-exists") === "true", a = { ...e, locale: i, localeExists: o }, l = new ot(a), c = n.parentElement;
    c && (l.mount(c), t.set(i, l));
  }), t;
}
function ir(s, e, t, r) {
  const n = new URLSearchParams();
  return n.set("locale", t), r && n.set("env", r), `${s}/${e}/edit?${n.toString()}`;
}
class qt {
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
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", n = e.resolvedLocale || "default", i = K(r), o = K(n), a = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${m(r)}"
           data-resolved-locale="${m(n)}">
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
                The <strong class="font-medium">${m(i)}</strong> (${m(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${m(o)}</strong> (${m(n.toUpperCase())}).
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
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: n, environment: i } = this.config, o = e.requestedLocale;
    return !o || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${m(o)}"
              data-record-id="${m(e.recordId)}"
              data-api-endpoint="${m(t)}"
              data-panel="${m(n || "")}"
              data-environment="${m(i || "")}"
              aria-label="Create ${K(o)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${m(o.toUpperCase())} translation
      </button>
    `;
  }
  /**
   * Render the secondary CTA (Open source locale).
   */
  renderSecondaryCta() {
    const { context: e, navigationBasePath: t, environment: r } = this.config, n = e.resolvedLocale;
    if (!n || !e.recordId)
      return "";
    const i = ir(t, e.recordId, n, r);
    return `
      <a href="${m(i)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${m(n)}"
         aria-label="Open ${K(n)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${m(n.toUpperCase())} (source)
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
      const n = t.getAttribute("data-locale"), i = t.getAttribute("href");
      n && i && this.config.onOpenSource?.(n, i);
    });
  }
  /**
   * Handle create translation action.
   */
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, environment: n, navigationBasePath: i } = this.config, o = e.requestedLocale, a = e.recordId;
    if (!o || !a) return;
    await new ot({
      locale: o,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: i,
      panelName: r,
      environment: n,
      localeExists: !1,
      onCreateSuccess: (c, d) => {
        this.config.onCreateSuccess?.(c, d);
        const u = ir(i, d.id, c, n);
        window.location.href = u;
      },
      onError: (c, d) => {
        this.config.onError?.(d);
      }
    }).handleCreate();
  }
}
function qs(s, e) {
  if (!e.locked) {
    Ns(s);
    return;
  }
  if (s.classList.add("form-locked", "pointer-events-none", "opacity-75"), s.setAttribute("data-form-locked", "true"), s.setAttribute("data-lock-reason", e.reason || ""), s.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !s.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(s).position === "static" && (s.style.position = "relative"), s.appendChild(r);
  }
}
function Ns(s) {
  s.classList.remove("form-locked", "pointer-events-none", "opacity-75"), s.removeAttribute("data-form-locked"), s.removeAttribute("data-lock-reason"), s.querySelectorAll('[data-was-enabled="true"]').forEach((r) => {
    r.removeAttribute("disabled"), r.removeAttribute("data-was-enabled"), r.removeAttribute("aria-disabled");
  }), s.querySelector("[data-form-lock-overlay]")?.remove();
}
function Eo(s) {
  return s.getAttribute("data-form-locked") === "true";
}
function $o(s) {
  return s.getAttribute("data-lock-reason");
}
function ko(s, e) {
  const t = ae(s);
  return new qt({ ...e, context: t }).render();
}
function Ao(s) {
  const e = ae(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Lo(s, e) {
  const t = new qt(e);
  return t.mount(s), t;
}
function _o(s, e) {
  const t = ae(e), n = new qt({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return qs(s, n), n;
}
class Ir {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = V(e), this.actionState = this.extractActionState(e, "create_translation");
  }
  /**
   * Extract action state for a specific action from the record.
   */
  extractActionState(e, t) {
    const r = e._action_state;
    if (!r || typeof r != "object" || Array.isArray(r))
      return null;
    const n = r[t];
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
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), n = this.getOverflowCount(), i = e.map(
      (l) => this.renderChip(l, t, r)
    ).join(""), o = n > 0 ? this.renderOverflow(n) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${m(this.config.recordId)}"
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
    const { recordId: n, apiEndpoint: i, navigationBasePath: o, panelName: a, environment: l, size: c } = this.config;
    return t ? Dr({
      locale: e,
      recordId: n,
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
    const n = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", i = t || "Translation creation unavailable", o = K(e);
    return `
      <div class="inline-flex items-center gap-1 ${n} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${m(e)}"
           data-disabled="true"
           title="${m(i)}"
           role="listitem"
           aria-label="${o} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${m(e)}</span>
      </div>
    `;
  }
  /**
   * Render overflow indicator.
   */
  renderOverflow(e) {
    const { size: t } = this.config, r = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", n = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${r} rounded text-gray-500 font-medium"
            title="Also missing: ${m(n)}"
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
      const n = new ot({
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
      this.chips.set(r, n), t.querySelector('[data-action="create"]')?.addEventListener("click", async (a) => {
        a.preventDefault(), a.stopPropagation(), await n.handleCreate();
      }), t.querySelector('[data-action="open"]')?.addEventListener("click", (a) => {
        a.preventDefault(), a.stopPropagation(), n.handleOpen();
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
function js(s, e) {
  const t = String(s.id || "");
  return t ? new Ir(s, { ...e, recordId: t }).render() : "";
}
function Do(s) {
  const e = V(s);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function Io(s, e, t) {
  const r = String(e.id || ""), n = new Ir(e, { ...t, recordId: r });
  return n.mount(s), n;
}
function To(s) {
  return (e, t, r) => js(t, s);
}
function at() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function zs() {
  return at() ? "⌘" : "Ctrl";
}
function Hs(s) {
  if (at())
    switch (s) {
      case "ctrl":
        return "⌃";
      case "alt":
        return "⌥";
      case "shift":
        return "⇧";
      case "meta":
        return "⌘";
    }
  switch (s) {
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
function Tr(s) {
  const e = s.modifiers.map(Hs), t = Us(s.key);
  return at() ? [...e, t].join("") : [...e, t].join("+");
}
function Us(s) {
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
  }[s] || s.toUpperCase();
}
class Mr {
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
        r instanceof Promise && r.catch((n) => {
          console.error(`[KeyboardShortcuts] Handler error for "${t.id}":`, n);
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
    const r = t.key.toLowerCase(), n = e.key.toLowerCase();
    if (r !== n && t.code.toLowerCase() !== n)
      return !1;
    const i = at(), o = new Set(e.modifiers), a = o.has("ctrl"), l = o.has("meta"), c = o.has("alt"), d = o.has("shift");
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
function Gs(s) {
  const e = [];
  return s.onSave && e.push({
    id: "save",
    description: "Save changes",
    category: "save",
    key: "s",
    modifiers: ["ctrl"],
    handler: s.onSave,
    context: "form"
  }), s.onPublish && e.push({
    id: "publish",
    description: "Publish content",
    category: "actions",
    key: "p",
    modifiers: ["ctrl", "shift"],
    handler: s.onPublish,
    context: "form"
  }), s.onLocalePicker && e.push({
    id: "locale-picker",
    description: "Open locale picker",
    category: "locale",
    key: "l",
    modifiers: ["ctrl", "shift"],
    handler: s.onLocalePicker
  }), s.onPrevLocale && e.push({
    id: "prev-locale",
    description: "Switch to previous locale",
    category: "locale",
    key: "[",
    modifiers: ["ctrl"],
    handler: s.onPrevLocale
  }), s.onNextLocale && e.push({
    id: "next-locale",
    description: "Switch to next locale",
    category: "locale",
    key: "]",
    modifiers: ["ctrl"],
    handler: s.onNextLocale
  }), s.onCreateTranslation && e.push({
    id: "create-translation",
    description: "Create new translation",
    category: "actions",
    key: "t",
    modifiers: ["ctrl", "shift"],
    handler: s.onCreateTranslation
  }), e;
}
function Mo(s) {
  const e = /* @__PURE__ */ new Map();
  for (const i of s) {
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
  let n = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const i of r) {
    const o = e.get(i);
    if (!(!o || o.length === 0)) {
      n += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${t[i]}</h4>
        <dl class="space-y-1">
    `;
      for (const a of o) {
        const l = Tr(a);
        n += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${pe(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${pe(l)}</kbd>
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
function pe(s) {
  const e = typeof document < "u" ? document.createElement("div") : null;
  return e ? (e.textContent = s, e.innerHTML) : s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const Rr = "admin_keyboard_shortcuts_settings", Pr = "admin_keyboard_shortcuts_hint_dismissed", Qe = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function Vs() {
  if (typeof localStorage > "u")
    return { ...Qe };
  try {
    const s = localStorage.getItem(Rr);
    if (!s)
      return { ...Qe };
    const e = JSON.parse(s);
    return {
      enabled: typeof e.enabled == "boolean" ? e.enabled : !0,
      shortcuts: typeof e.shortcuts == "object" && e.shortcuts !== null ? e.shortcuts : {},
      updatedAt: typeof e.updatedAt == "string" ? e.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...Qe };
  }
}
function Ro(s) {
  if (!(typeof localStorage > "u"))
    try {
      const e = {
        ...s,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      localStorage.setItem(Rr, JSON.stringify(e));
    } catch {
    }
}
function Ks() {
  return typeof localStorage > "u" ? !1 : localStorage.getItem(Pr) === "true";
}
function Ys() {
  if (!(typeof localStorage > "u"))
    try {
      localStorage.setItem(Pr, "true");
    } catch {
    }
}
function Js(s) {
  if (Ks())
    return null;
  const { container: e, position: t = "bottom", onDismiss: r, onShowHelp: n, autoDismissMs: i = 1e4 } = s, o = document.createElement("div");
  o.className = `shortcuts-discovery-hint fixed ${t === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, o.setAttribute("role", "alert"), o.setAttribute("aria-live", "polite");
  const a = zs();
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
    c && Ys(), o.remove(), r?.();
  };
  return o.querySelector('[data-hint-action="show-help"]')?.addEventListener("click", () => {
    l(!0), n?.();
  }), o.querySelector('[data-hint-action="dismiss"]')?.addEventListener("click", () => {
    l(!0);
  }), o.querySelector('[data-hint-action="close"]')?.addEventListener("click", () => {
    l(!1);
  }), i > 0 && setTimeout(() => {
    o.parentElement && l(!1);
  }, i), e.appendChild(o), o;
}
function Po(s) {
  const { container: e, shortcuts: t, settings: r, onSettingsChange: n } = s, i = {
    save: "Save & Submit",
    navigation: "Navigation",
    locale: "Locale Switching",
    actions: "Actions",
    help: "Help",
    other: "Other"
  }, o = /* @__PURE__ */ new Map();
  for (const h of t) {
    const f = o.get(h.category) || [];
    f.push(h), o.set(h.category, f);
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
    const f = o.get(h);
    if (!(!f || f.length === 0)) {
      l += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${i[h]}
        </h4>
        <div class="space-y-1">
    `;
      for (const g of f) {
        const b = r.shortcuts[g.id] !== !1, C = Tr(g);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${pe(C)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${pe(g.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${pe(g.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${pe(g.id)}"
                 ${b ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${pe(g.description)} shortcut">
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
    n(h);
  }), e.querySelectorAll('[data-settings-action="toggle-shortcut"]').forEach((h) => {
    h.addEventListener("change", () => {
      const f = h.getAttribute("data-shortcut-id");
      if (!f) return;
      const g = {
        ...r,
        shortcuts: {
          ...r.shortcuts,
          [f]: h.checked
        }
      };
      n(g);
    });
  }), e.querySelector('[data-settings-action="reset"]')?.addEventListener("click", () => {
    n({ ...Qe });
  });
}
function Ws(s, e) {
  const t = s;
  t.config && (t.config.enabled = e.enabled);
  for (const r of s.getShortcuts()) {
    const n = e.shortcuts[r.id] !== !1;
    s.setEnabled(r.id, n);
  }
}
let vt = null;
function Bo() {
  return vt || (vt = new Mr()), vt;
}
function Xs(s, e) {
  const t = Vs(), r = new Mr({
    ...e,
    enabled: t.enabled
  }), n = Gs(s);
  for (const i of n)
    r.register(i);
  return Ws(r, t), r.bind(), r;
}
function Oo(s, e) {
  const t = Xs(s, e);
  return e.hintContainer && Js({
    container: e.hintContainer,
    onShowHelp: e.onShowHelp,
    onDismiss: () => {
    }
  }), t;
}
const Qs = 1500, Zs = 2e3, Nt = "autosave", Me = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, ei = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
};
class Br {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? Qs,
      savedDurationMs: e.savedDurationMs ?? Zs,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Nt,
      labels: { ...Me, ...e.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: { ...ei, ...e.conflictLabels }
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
    const e = this.config.classPrefix, t = this.config.labels, r = `${e}--${this.state}`, n = t[this.state] || "", i = this.getStateIcon();
    return this.state === "conflict" ? this.renderConflictUI() : `<div class="${e} ${r}" role="status" aria-live="polite" aria-atomic="true">
      <span class="${e}__icon">${i}</span>
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
    const r = {
      previousState: t,
      currentState: e,
      error: this.lastError ?? void 0,
      data: this.pendingData ?? void 0
    };
    for (const n of this.listeners)
      try {
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
          t.success(this.config.labels.saved ?? Me.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? Me.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? Me.conflict);
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
}
function Fo(s) {
  return new Br({
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
    ...s
  });
}
function qo(s, e = {}) {
  const t = e.classPrefix ?? Nt, n = { ...Me, ...e.labels }[s] || "";
  let i = "";
  switch (s) {
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
  return `<div class="${t} ${t}--${s}" role="status" aria-live="polite">
    ${i}
    <span class="${t}__label">${n}</span>
  </div>`;
}
function No(s = Nt) {
  return `
    .${s} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${s}--idle {
      opacity: 0;
    }

    .${s}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${s}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${s}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${s}__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .${s}__icon svg {
      width: 100%;
      height: 100%;
    }

    .${s}__spinner {
      animation: ${s}-spin 1s linear infinite;
    }

    .${s}__retry {
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

    .${s}__retry:hover {
      background-color: var(--autosave-retry-hover-bg, rgba(59, 130, 246, 0.1));
    }

    @keyframes ${s}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Conflict state styles (TX-074) */
    .${s}--conflict {
      color: var(--autosave-conflict-color, #f59e0b);
      padding: 0.75rem;
      background: var(--autosave-conflict-bg, #fffbeb);
      border: 1px solid var(--autosave-conflict-border, #fcd34d);
      border-radius: 0.5rem;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .${s}__conflict-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .${s}__conflict-title {
      font-weight: 600;
      color: var(--autosave-conflict-title-color, #92400e);
    }

    .${s}__conflict-message {
      font-size: 0.75rem;
      color: var(--autosave-conflict-message-color, #78350f);
      margin: 0;
    }

    .${s}__conflict-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .${s}__conflict-actions button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .${s}__conflict-use-server {
      color: white;
      background: var(--autosave-conflict-use-server-bg, #3b82f6);
      border: none;
    }

    .${s}__conflict-use-server:hover {
      background: var(--autosave-conflict-use-server-hover-bg, #2563eb);
    }

    .${s}__conflict-force-save {
      color: var(--autosave-conflict-force-color, #ef4444);
      background: transparent;
      border: 1px solid currentColor;
    }

    .${s}__conflict-force-save:hover {
      background: var(--autosave-conflict-force-hover-bg, rgba(239, 68, 68, 0.1));
    }

    .${s}__conflict-dismiss {
      color: var(--autosave-conflict-dismiss-color, #6b7280);
      background: transparent;
      border: 1px solid var(--autosave-conflict-dismiss-border, #d1d5db);
    }

    .${s}__conflict-dismiss:hover {
      background: var(--autosave-conflict-dismiss-hover-bg, #f3f4f6);
    }
  `;
}
function jo(s, e) {
  const { watchFields: t, indicatorSelector: r, ...n } = e;
  let i = n.container;
  !i && r && (i = s.querySelector(r) ?? void 0);
  const o = new Br({
    ...n,
    container: i
  }), a = () => {
    const h = new FormData(s), f = {};
    return h.forEach((g, b) => {
      f[b] = g;
    }), f;
  }, l = (h) => {
    const f = h.target;
    if (f) {
      if (t && t.length > 0) {
        const g = f.name;
        if (!g || !t.includes(g))
          return;
      }
      o.markDirty(a());
    }
  };
  s.addEventListener("input", l), s.addEventListener("change", l), s.addEventListener("submit", async (h) => {
    o.hasPendingChanges() && (h.preventDefault(), await o.save() && s.submit());
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
    s.removeEventListener("input", l), s.removeEventListener("change", l), window.removeEventListener("beforeunload", c), document.removeEventListener("visibilitychange", d), u();
  }, o;
}
const Or = "char-counter", ti = "interpolation-preview", Fr = "dir-toggle", qr = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: "Mustache", example: "{{name}}" },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: "ICU", example: "{name}" },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: "Printf", example: "%s" },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: "Named Printf", example: "%(name)s" },
  { pattern: /\$\{(\w+)\}/g, name: "Template Literal", example: "${name}" }
], ri = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
};
class ni {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Or,
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
    const e = this.getCount(), t = [...this.config.thresholds].sort((r, n) => n.limit - r.limit);
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
class si {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? ri,
      patterns: [...qr, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? ti
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
      let n;
      for (; (n = r.pattern.exec(e)) !== null; )
        t.push({
          pattern: r.name,
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
      t.pattern.lastIndex = 0, e = e.replace(t.pattern, (r, n) => {
        const o = (n ?? r).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
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
    let n = "", i = 0;
    for (const o of t) {
      n += this.escapeHtml(e.slice(i, o.start));
      const a = this.getSampleValue(o.variable), l = e.slice(o.start, o.end);
      n += `<span class="${r}__variable" title="${this.escapeHtml(l)}">${this.escapeHtml(a ?? l)}</span>`, i = o.end;
    }
    return n += this.escapeHtml(e.slice(i)), n;
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
    for (const [r, n] of Object.entries(this.config.sampleValues))
      if (r.toLowerCase() === t)
        return n;
    return null;
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}
class ii {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Fr,
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
function zo(s, e = {}) {
  const t = [], r = [], n = [];
  for (const i of e.charCounterFields ?? []) {
    const o = s.querySelector(`[name="${i}"]`);
    o && t.push(new ni({
      input: o,
      ...e.charCounterConfig
    }));
  }
  for (const i of e.interpolationFields ?? []) {
    const o = s.querySelector(`[name="${i}"]`);
    o && r.push(new si({
      input: o,
      ...e.interpolationConfig
    }));
  }
  for (const i of e.directionToggleFields ?? []) {
    const o = s.querySelector(`[name="${i}"]`);
    o && n.push(new ii({
      input: o,
      persistenceKey: `dir-${i}`,
      ...e.directionToggleConfig
    }));
  }
  return {
    counters: t,
    previews: r,
    toggles: n,
    destroy: () => {
      t.forEach((i) => i.destroy()), r.forEach((i) => i.destroy()), n.forEach((i) => i.destroy());
    }
  };
}
function Ho(s, e, t, r = Or) {
  const n = [r];
  t && n.push(`${r}--${t}`);
  const i = e ? `${s} / ${e}` : `${s}`;
  return `<span class="${n.join(" ")}" aria-live="polite">${i}</span>`;
}
function Uo(s, e = Fr) {
  const t = s === "rtl", r = t ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${s.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${r}</svg>
    <span class="${e}__label">${s.toUpperCase()}</span>
  </button>`;
}
function Go() {
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
function Vo(s, e = qr) {
  const t = [];
  for (const r of e) {
    r.pattern.lastIndex = 0;
    let n;
    for (; (n = r.pattern.exec(s)) !== null; )
      t.push({
        pattern: r.name,
        variable: n[1] ?? n[0],
        start: n.index,
        end: n.index + n[0].length
      });
  }
  return t;
}
function Ko(s, e, t) {
  return t && s >= t ? "error" : e && s >= e ? "warning" : null;
}
function oi(s) {
  return typeof s == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(s) ? s : "none";
}
function ai(s) {
  return s === "core+exchange" || s === "full";
}
function li(s) {
  return s === "core+queue" || s === "full";
}
function Yo(s) {
  return s !== "none";
}
function ci(s) {
  if (!s || typeof s != "object")
    return null;
  const e = s, t = oi(e.profile || e.capability_mode), r = typeof e.schema_version == "number" ? e.schema_version : 0;
  return {
    profile: t,
    capability_mode: t,
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.filter(
      (n) => typeof n == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(n)
    ) : ["none", "core", "core+exchange", "core+queue", "full"],
    schema_version: r,
    modules: di(e.modules),
    features: hi(e.features),
    routes: fi(e.routes),
    panels: pi(e.panels),
    resolver_keys: gi(e.resolver_keys),
    warnings: mi(e.warnings),
    contracts: e.contracts && typeof e.contracts == "object" ? e.contracts : void 0
  };
}
function di(s) {
  if (!s || typeof s != "object")
    return {};
  const e = s, t = {};
  return e.exchange && typeof e.exchange == "object" && (t.exchange = or(e.exchange)), e.queue && typeof e.queue == "object" && (t.queue = or(e.queue)), t;
}
function or(s) {
  if (!s || typeof s != "object")
    return {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1, reason: "Invalid module state", reason_code: "INVALID_STATE" },
      actions: {}
    };
  const e = s;
  return {
    enabled: e.enabled === !0,
    visible: e.visible === !0,
    entry: Nr(e.entry),
    actions: ui(e.actions)
  };
}
function Nr(s) {
  if (!s || typeof s != "object")
    return { enabled: !1 };
  const e = s;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function ui(s) {
  if (!s || typeof s != "object")
    return {};
  const e = s, t = {};
  for (const [r, n] of Object.entries(e))
    n && typeof n == "object" && (t[r] = Nr(n));
  return t;
}
function hi(s) {
  if (!s || typeof s != "object")
    return {};
  const e = s;
  return {
    cms: e.cms === !0,
    dashboard: e.dashboard === !0
  };
}
function fi(s) {
  if (!s || typeof s != "object")
    return {};
  const e = {}, t = s;
  for (const [r, n] of Object.entries(t))
    typeof n == "string" && (e[r] = n);
  return e;
}
function pi(s) {
  return Array.isArray(s) ? s.filter((e) => typeof e == "string") : [];
}
function gi(s) {
  return Array.isArray(s) ? s.filter((e) => typeof e == "string") : [];
}
function mi(s) {
  return Array.isArray(s) ? s.filter((e) => typeof e == "string") : [];
}
class jr {
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
    return e === "exchange" ? ai(t) : li(t);
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
function Jo(s) {
  const e = ci(s);
  return e ? new jr(e) : null;
}
function Wo() {
  return new jr({
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
function Xo(s) {
  return s.visible ? s.enabled ? "" : `aria-disabled="true"${s.reason ? ` title="${At(s.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function Qo(s) {
  if (s.enabled || !s.reason)
    return "";
  const e = s.reasonCode || "DISABLED";
  return `
    <span class="capability-gate-reason ${bi(e)}"
          role="status"
          aria-label="${At(s.reason)}"
          data-reason-code="${At(e)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${vi(s.reason)}
    </span>
  `.trim();
}
function bi(s) {
  switch (s) {
    case "FEATURE_DISABLED":
      return "text-gray-500 bg-gray-100";
    case "PERMISSION_DENIED":
      return "text-amber-600 bg-amber-50";
    case "MODULE_NOT_CONFIGURED":
      return "text-blue-500 bg-blue-50";
    case "ACTION_NOT_CONFIGURED":
      return "text-blue-500 bg-blue-50";
    default:
      return "text-gray-500 bg-gray-100";
  }
}
function vi(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function At(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Zo() {
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
function yi(s, e) {
  if (!e.visible) {
    s.style.display = "none", s.setAttribute("aria-hidden", "true");
    return;
  }
  s.style.display = "", s.removeAttribute("aria-hidden"), e.enabled ? (s.removeAttribute("aria-disabled"), s.classList.remove("capability-gate-disabled"), s.removeAttribute("title"), delete s.dataset.reasonCode, s.removeEventListener("click", ar, !0)) : (s.setAttribute("aria-disabled", "true"), s.classList.add("capability-gate-disabled"), e.reason && (s.setAttribute("title", e.reason), s.dataset.reasonCode = e.reasonCode || ""), s.addEventListener("click", ar, !0));
}
function ar(s) {
  s.currentTarget.getAttribute("aria-disabled") === "true" && (s.preventDefault(), s.stopPropagation());
}
function ea(s, e) {
  s.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const n = r.dataset.capabilityGate;
    if (n)
      try {
        const i = JSON.parse(n), o = e.gateNavItem(i);
        yi(r, o);
      } catch {
        console.warn("Invalid capability gate config:", n);
      }
  });
}
const wi = {
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
}, xi = [
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
class Si {
  constructor(e) {
    this.container = null, this.state = "loading", this.data = null, this.error = null, this.activePreset = "all", this.refreshTimer = null, this.config = {
      myWorkEndpoint: e.myWorkEndpoint,
      queueEndpoint: e.queueEndpoint || "",
      panelBaseUrl: e.panelBaseUrl || "",
      capabilityGate: e.capabilityGate,
      filterPresets: e.filterPresets || xi,
      refreshInterval: e.refreshInterval || 0,
      onAssignmentClick: e.onAssignmentClick,
      onActionClick: e.onActionClick,
      labels: { ...wi, ...e.labels || {} }
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
      const e = this.config.filterPresets.find((i) => i.id === this.activePreset), t = new URLSearchParams(e?.filters || {}), r = `${this.config.myWorkEndpoint}${t.toString() ? "?" + t.toString() : ""}`, n = await fetch(r, {
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
      <div class="translator-dashboard" role="region" aria-label="${_(e.title)}">
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
        <h2 class="dashboard-title">${_(e.title)}</h2>
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
  renderSummaryCard(e, t, r, n) {
    return `
      <div class="summary-card ${n}" role="listitem" data-summary="${e}">
        <div class="summary-count">${r}</div>
        <div class="summary-label">${_(t)}</div>
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
        <span class="filter-label">${_(e.label)}</span>
        ${n}
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
        <p>${_(e.loading)}</p>
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
        <p class="error-message">${_(e.error)}</p>
        ${this.error ? `<p class="error-detail">${_(this.error.message)}</p>` : ""}
        <button type="button" class="retry-btn">${_(e.retry)}</button>
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
        <p class="empty-title">${_(e.noAssignments)}</p>
        <p class="empty-description">${_(e.noAssignmentsDescription)}</p>
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
              <th scope="col">${_(e.sourceTitle)}</th>
              <th scope="col">${_(e.targetLocale)}</th>
              <th scope="col">${_(e.status)}</th>
              <th scope="col">${_(e.dueDate)}</th>
              <th scope="col">${_(e.priority)}</th>
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
    const t = Ci(e.due_state), r = Ei(e.queue_state), n = $i(e.priority), i = e.due_date ? Li(new Date(e.due_date)) : "-";
    return `
      <tr class="assignment-row" data-assignment-id="${_e(e.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${_(e.source_title || e.source_path || e.id)}</span>
            <span class="entity-type">${_(e.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${_(e.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${_(e.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          <span class="status-badge ${r}">${_(ki(e.queue_state))}</span>
        </td>
        <td class="due-cell ${t}">
          ${i}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${n}">${_(Ai(e.priority))}</span>
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
      <button type="button" class="action-btn open-btn" data-action="open" title="${_e(t.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);
    const n = e.review_actions;
    return e.queue_state === "in_progress" && n.submit_review.enabled && r.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${_e(t.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `), e.queue_state === "review" && (n.approve.enabled && r.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${_e(t.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `), n.reject.enabled && r.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${_e(t.reject)}">
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
function _(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function _e(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Ci(s) {
  switch (s) {
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
function Ei(s) {
  switch (s) {
    case "pending":
      return "status-pending";
    case "assigned":
      return "status-assigned";
    case "in_progress":
      return "status-in-progress";
    case "review":
      return "status-review";
    case "approved":
      return "status-approved";
    case "published":
      return "status-published";
    case "archived":
      return "status-archived";
    default:
      return "";
  }
}
function $i(s) {
  switch (s) {
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
function ki(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function Ai(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function Li(s) {
  const e = /* @__PURE__ */ new Date(), t = s.getTime() - e.getTime(), r = Math.ceil(t / (1e3 * 60 * 60 * 24));
  return r < 0 ? `${Math.abs(r)}d overdue` : r === 0 ? "Today" : r === 1 ? "Tomorrow" : r <= 7 ? `${r}d` : s.toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function ta() {
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
function _i(s, e) {
  const t = new Si(e);
  return t.mount(s), t;
}
function ra(s) {
  const e = s.dataset.myWorkEndpoint;
  return e ? _i(s, {
    myWorkEndpoint: e,
    panelBaseUrl: s.dataset.panelBaseUrl,
    queueEndpoint: s.dataset.queueEndpoint,
    refreshInterval: parseInt(s.dataset.refreshInterval || "0", 10)
  }) : (console.warn("TranslatorDashboard: Missing data-my-work-endpoint attribute"), null);
}
export {
  Wr as ActionRenderer,
  ro as AdvancedSearch,
  Br as AutosaveIndicator,
  jr as CapabilityGate,
  mn as CellRendererRegistry,
  ni as CharacterCounter,
  zn as ColumnManager,
  Ji as CommonRenderers,
  xi as DEFAULT_FILTER_PRESETS,
  qr as DEFAULT_INTERPOLATION_PATTERNS,
  ri as DEFAULT_SAMPLE_VALUES,
  Is as DEFAULT_STATUS_LEGEND_ITEMS,
  _r as DEFAULT_TRANSLATION_QUICK_FILTERS,
  ls as DataGrid,
  As as DefaultColumnVisibilityBehavior,
  ii as DirectionToggle,
  qt as FallbackBanner,
  no as FilterBuilder,
  co as GoCrudBulkActionBehavior,
  lo as GoCrudExportBehavior,
  io as GoCrudFilterBehavior,
  oo as GoCrudPaginationBehavior,
  so as GoCrudSearchBehavior,
  ao as GoCrudSortBehavior,
  Ir as InlineLocaleChips,
  si as InterpolationPreview,
  Mr as KeyboardShortcutRegistry,
  ot as LocaleActionChip,
  Bt as PayloadInputModal,
  Ms as QuickFilters,
  _s as SchemaActionBuilder,
  uo as ServerColumnVisibilityBehavior,
  Lr as StatusLegend,
  Ot as TranslationBlockerModal,
  Si as TranslatorDashboard,
  qs as applyFormLock,
  yi as applyGateToElement,
  Ws as applyShortcutSettings,
  ir as buildLocaleEditUrl,
  ho as buildSchemaRowActions,
  Qi as collapseAllGroups,
  xo as createBulkCreateMissingHandler,
  Jo as createCapabilityGate,
  Wo as createEmptyCapabilityGate,
  To as createInlineLocaleChipsRenderer,
  nn as createLocaleBadgeRenderer,
  Ts as createStatusLegend,
  Fo as createTranslationAutosave,
  Ki as createTranslationMatrixRenderer,
  Rs as createTranslationQuickFilters,
  Gs as createTranslationShortcuts,
  Ht as createTranslationStatusRenderer,
  _i as createTranslatorDashboard,
  Vo as detectInterpolations,
  Ys as dismissShortcutHint,
  Ps as executeBulkCreateMissing,
  Xi as expandAllGroups,
  Yn as extractBackendSummaries,
  ci as extractCapabilities,
  ia as extractExchangeError,
  fo as extractSchemaActions,
  ae as extractTranslationContext,
  V as extractTranslationReadiness,
  Tr as formatShortcutDisplay,
  oa as generateExchangeReport,
  No as getAutosaveIndicatorStyles,
  Zo as getCapabilityGateStyles,
  Ko as getCharCountSeverity,
  Bo as getDefaultShortcutRegistry,
  Zi as getExpandedGroupIds,
  Go as getFieldHelperStyles,
  $o as getFormLockReason,
  K as getLocaleLabel,
  Vi as getMissingTranslationsCount,
  Hs as getModifierSymbol,
  Wn as getPersistedExpandState,
  Qn as getPersistedViewMode,
  zs as getPrimaryModifierLabel,
  ta as getTranslatorDashboardStyles,
  as as getViewModeForViewport,
  aa as groupRowResultsByStatus,
  Gi as hasMissingTranslations,
  Oi as hasTranslationContext,
  Fi as hasTranslationReadiness,
  ea as initCapabilityGating,
  Lo as initFallbackBanner,
  zo as initFieldHelpers,
  jo as initFormAutosave,
  _o as initFormLock,
  Io as initInlineLocaleChips,
  Xs as initKeyboardShortcuts,
  Oo as initKeyboardShortcutsWithDiscovery,
  Co as initLocaleActionChips,
  bo as initQuickFilters,
  go as initStatusLegends,
  ra as initTranslatorDashboard,
  Yo as isCoreEnabled,
  ai as isExchangeEnabled,
  la as isExchangeError,
  Eo as isFormLocked,
  Bi as isInFallbackMode,
  at as isMacPlatform,
  os as isNarrowViewport,
  li as isQueueEnabled,
  qi as isReadyForTransition,
  Ks as isShortcutHintDismissed,
  Vs as loadShortcutSettings,
  Kn as mergeBackendSummaries,
  oi as parseCapabilityMode,
  ca as parseImportResult,
  Xn as persistExpandState,
  Zn as persistViewMode,
  Ns as removeFormLock,
  qo as renderAutosaveIndicator,
  Qr as renderAvailableLocalesIndicator,
  wo as renderBulkResultInline,
  yo as renderBulkResultSummary,
  Ho as renderCharacterCounter,
  Uo as renderDirectionToggle,
  Qo as renderDisabledReasonBadge,
  Js as renderDiscoveryHint,
  ko as renderFallbackBannerFromRecord,
  Yi as renderFallbackWarning,
  Xo as renderGateAriaAttributes,
  ns as renderGroupHeaderRow,
  ts as renderGroupHeaderSummary,
  is as renderGroupedEmptyState,
  to as renderGroupedErrorState,
  eo as renderGroupedLoadingState,
  js as renderInlineLocaleChips,
  Dr as renderLocaleActionChip,
  So as renderLocaleActionList,
  dr as renderLocaleBadge,
  Hi as renderLocaleCompleteness,
  Ui as renderMissingTranslationsBadge,
  zi as renderPublishReadinessBadge,
  vo as renderQuickFiltersHTML,
  ji as renderReadinessIndicator,
  Po as renderShortcutSettingsUI,
  Mo as renderShortcutsHelpContent,
  Ni as renderStatusBadge,
  mo as renderStatusLegendHTML,
  tn as renderTranslationMatrixCell,
  Zr as renderTranslationStatusCell,
  Ro as saveShortcutSettings,
  Ao as shouldShowFallbackBanner,
  Do as shouldShowInlineLocaleChips,
  po as showTranslationBlocker,
  Wi as toggleGroupExpand,
  Hn as transformToGroups
};
//# sourceMappingURL=index.js.map

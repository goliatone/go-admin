import { F as Re } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as er, executeActionRequest as St, isTranslationBlocker as Lr, extractTranslationBlocker as Ar, formatStructuredErrorForDisplay as _r } from "../toast/error-helpers.js";
import { extractExchangeError as qo, generateExchangeReport as Fo, groupRowResultsByStatus as jo, isExchangeError as No, parseImportResult as zo } from "../toast/error-helpers.js";
import { M as Ct, e as g, T as Rt } from "../chunks/modal-DXPBR0f5.js";
import { b as Ye, a as Dr } from "../chunks/badge-CqKzZ9y5.js";
import { r as Ir } from "../chunks/icon-renderer-CRbgoQtj.js";
let Mr = class tr extends Ct {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = r;
  }
  static prompt(e) {
    return new Promise((t) => {
      new tr(
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
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), r = () => {
      this.clearErrors();
      const n = {};
      let o = null;
      for (const i of this.config.fields) {
        const a = this.container?.querySelector(
          `[data-payload-field="${i.name}"]`
        );
        if (!a)
          continue;
        const l = a.value.trim();
        n[i.name] = l, l || (o || (o = a), this.showFieldError(i.name, "This field is required."));
      }
      if (o) {
        o.focus();
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${g(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${g(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, n = (e.options || []).map((o) => {
      const i = o.value === t ? " selected" : "";
      return `<option value="${g(o.value)}"${i}>${g(o.label)}</option>`;
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
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
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
    const r = this.container?.querySelector(`[data-payload-error="${e}"]`);
    r && (r.textContent = t, r.classList.remove("hidden"));
  }
};
class Pr {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Re();
  }
  /**
   * Render row actions as HTML
   */
  renderRowActions(e, t) {
    if (this.mode === "dropdown")
      return this.renderRowActionsDropdown(e, t);
    const r = t.filter(
      (o) => !o.condition || o.condition(e)
    );
    return r.length === 0 ? '<div class="flex justify-end gap-2"></div>' : `<div class="flex justify-end gap-2">${r.map((o) => {
      const i = this.getVariantClass(o.variant || "secondary"), a = o.icon ? this.renderIcon(o.icon) : "", l = o.className || "", c = o.disabled === !0, d = c ? "opacity-50 cursor-not-allowed" : "", u = c ? 'aria-disabled="true"' : "", h = o.disabledReason ? `title="${this.escapeHtml(o.disabledReason)}"` : "";
      return `
        <button
          type="button"
          class="btn btn-sm ${i} ${l} ${d}"
          data-action-id="${this.sanitize(o.label)}"
          data-record-id="${e.id}"
          data-disabled="${c}"
          ${u}
          ${h}
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
    const r = t.filter(
      (i) => !i.condition || i.condition(e)
    );
    if (r.length === 0)
      return '<div class="text-sm text-gray-400">No actions</div>';
    const n = `actions-menu-${e.id}`, o = this.buildDropdownItems(e, r);
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
    return t.map((r, n) => {
      const o = r.variant === "danger", i = r.disabled === !0, a = r.icon ? this.renderIcon(r.icon) : "", c = this.shouldShowDivider(r, n, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : "", d = i ? "action-item text-gray-400 cursor-not-allowed" : o ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50", u = i ? 'aria-disabled="true"' : "", h = r.disabledReason ? `title="${this.escapeHtml(r.disabledReason)}"` : "";
      return `
        ${c}
        <button type="button"
                class="${d} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(r.label)}"
                data-record-id="${e.id}"
                data-disabled="${i}"
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
  attachRowActionListeners(e, t, r) {
    t.forEach((n) => {
      e.querySelectorAll(
        `[data-action-id="${this.sanitize(n.label)}"]`
      ).forEach((i) => {
        const a = i, l = a.dataset.recordId, c = r[l];
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
    n.className = "flex gap-2 flex-1", e.forEach((i) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = i.id, i.icon ? a.innerHTML = `${this.renderIcon(i.icon)} ${i.label}` : a.textContent = i.label, n.appendChild(a);
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
          const i = await er(n);
          throw this.notifier.error(i), new Error(i);
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
    const r = {
      ...e.payload || {},
      ids: t
    }, n = this.normalizePayloadSchema(e.payloadSchema);
    n?.properties && Object.entries(n.properties).forEach(([l, c]) => {
      r[l] === void 0 && c && c.default !== void 0 && (r[l] = c.default);
    });
    const i = this.collectRequiredFields(e.payloadRequired, n).filter((l) => l !== "ids" && this.isEmptyPayloadValue(r[l]));
    if (i.length === 0)
      return r;
    const a = await this.requestRequiredFields(e, i, n, r);
    if (a === null)
      return null;
    for (const l of i) {
      const c = n?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        return this.notifier.error(u.error), null;
      r[l] = u.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), o = (i) => {
      const a = i.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((i) => o(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => o(String(i))), r;
  }
  normalizePayloadSchema(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e.properties;
    let r;
    return t && typeof t == "object" && (r = {}, Object.entries(t).forEach(([n, o]) => {
      o && typeof o == "object" && (r[n] = o);
    })), {
      type: typeof e.type == "string" ? e.type : void 0,
      required: e.required,
      properties: r
    };
  }
  async requestRequiredFields(e, t, r, n) {
    const o = t.map((i) => {
      const a = r?.properties?.[i], l = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: i,
        label: (a?.title || i).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[i] !== void 0 ? n[i] : a?.default),
        type: l,
        options: this.buildSchemaOptions(a)
      };
    });
    return Mr.prompt({
      title: `Complete ${e.label || e.id}`,
      fields: o
    });
  }
  buildSchemaOptions(e) {
    if (e) {
      if (Array.isArray(e.oneOf) && e.oneOf.length > 0) {
        const t = e.oneOf.filter((r) => r && Object.prototype.hasOwnProperty.call(r, "const")).map((r) => {
          const n = this.stringifyPromptDefault(r.const), o = typeof r.title == "string" && r.title.trim() ? r.title.trim() : n;
          return { value: n, label: o };
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
      const i = r.oneOf.find(
        (a) => a && Object.prototype.hasOwnProperty.call(a, "const") && this.stringifyPromptDefault(a.const) === e
      );
      if (!i || !Object.prototype.hasOwnProperty.call(i, "const")) {
        const a = r.oneOf.map((l) => typeof l?.title == "string" && l.title.trim() ? l.title.trim() : this.stringifyPromptDefault(l.const)).filter((l) => l !== "").join(", ");
        return { value: e, error: `${t} must be one of: ${a}` };
      }
      return { value: i.const };
    }
    const n = (r?.type || "string").toLowerCase();
    if (e === "")
      return { value: "" };
    let o = e;
    switch (n) {
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
          if (n === "array" && !Array.isArray(i))
            return { value: e, error: `${t} must be a JSON array.` };
          if (n === "object" && (i === null || Array.isArray(i) || typeof i != "object"))
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
    return Array.isArray(r?.enum) && r.enum.length > 0 && !r.enum.some((a) => a === o || String(a) === String(o)) ? { value: o, error: `${t} must be one of: ${r.enum.map((a) => String(a)).join(", ")}` } : { value: o };
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  buildBulkSuccessMessage(e, t, r) {
    const n = e.label || e.id || "Bulk action", o = t && typeof t == "object" ? t.summary : null, i = o && typeof o.succeeded == "number" ? o.succeeded : typeof t?.processed == "number" ? t.processed : r, a = o && typeof o.failed == "number" ? o.failed : 0;
    return a > 0 ? `${n} completed: ${i} succeeded, ${a} failed.` : `${n} completed for ${i} item${i === 1 ? "" : "s"}.`;
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
function ie(s) {
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
  return !s || typeof s != "object" || (e.requestedLocale = fe(s, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = fe(s, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = Nr(s, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = Ot(s, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = Ot(s, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = fe(s, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = fe(s, ["status"]), e.entityType = fe(s, ["entity_type", "type", "_type"]), e.recordId = fe(s, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function Rs(s) {
  const e = ie(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Ts(s) {
  const e = ie(s);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function U(s) {
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
    e.hasReadinessMetadata = !0, e.translationGroupId = typeof t.translation_group_id == "string" ? t.translation_group_id : null, e.requiredLocales = Array.isArray(t.required_locales) ? t.required_locales.filter((i) => typeof i == "string") : [], e.availableLocales = Array.isArray(t.available_locales) ? t.available_locales.filter((i) => typeof i == "string") : [], e.missingRequiredLocales = Array.isArray(t.missing_required_locales) ? t.missing_required_locales.filter((i) => typeof i == "string") : [];
    const r = t.missing_required_fields_by_locale;
    if (r && typeof r == "object" && !Array.isArray(r))
      for (const [i, a] of Object.entries(r))
        Array.isArray(a) && (e.missingRequiredFieldsByLocale[i] = a.filter(
          (l) => typeof l == "string"
        ));
    const n = t.readiness_state;
    typeof n == "string" && Br(n) && (e.readinessState = n);
    const o = t.ready_for_transition;
    if (o && typeof o == "object" && !Array.isArray(o))
      for (const [i, a] of Object.entries(o))
        typeof a == "boolean" && (e.readyForTransition[i] = a);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function Os(s) {
  return U(s).hasReadinessMetadata;
}
function qs(s, e) {
  return U(s).readyForTransition[e] === !0;
}
function Br(s) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(s);
}
function rr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : ie(s), { showFallbackIndicator: r = !0, size: n = "default", extraClass: o = "" } = e;
  if (!t.resolvedLocale)
    return "";
  const i = t.resolvedLocale.toUpperCase(), a = t.fallbackUsed || t.missingRequestedLocale, c = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return a && r ? `<span class="${c} bg-amber-100 text-amber-800 ${o}"
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
function Rr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : ie(s), { maxLocales: r = 3, size: n = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const o = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", i = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, r), l = t.availableLocales.length - r, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${i} rounded bg-blue-100 text-blue-700 font-medium` : `${i} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${i} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${o}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function Tr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : ie(s), { showResolvedLocale: r = !0, size: n = "default" } = e, o = [];
  return r && t.resolvedLocale && o.push(rr(t, { size: n, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && o.push(Rr(t, { ...e, size: n })), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${o.join("")}</div>`;
}
function Fs(s, e = "default") {
  if (!s)
    return "";
  const t = s.toLowerCase();
  return Ye(s, "status", t, { size: e === "sm" ? "sm" : void 0 });
}
function js(s, e = {}) {
  const t = U(s);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: r = "default", showDetailedTooltip: n = !0, extraClass: o = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${r === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: h, tooltip: p } = Or(l, t, n);
  return `<span class="${a} ${u} ${h} ${o}"
                title="${p}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function Ns(s, e = {}) {
  const t = U(s);
  if (!t.hasReadinessMetadata)
    return "";
  const r = t.readyForTransition.publish === !0, { size: n = "default", extraClass: o = "" } = e, i = n === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  if (r)
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
function zs(s, e = {}) {
  const t = U(s);
  if (!t.hasReadinessMetadata || t.requiredLocales.length === 0)
    return "";
  const { size: r = "default", extraClass: n = "" } = e, o = r === "sm" ? "text-xs" : "text-sm", i = t.requiredLocales.length, a = t.availableLocales.filter(
    (d) => t.requiredLocales.includes(d)
  ).length, c = i > 0 && a === i ? "text-green-600" : a > 0 ? "text-amber-600" : "text-gray-500";
  return `<span class="${o} ${c} font-medium ${n}"
                title="Locale completeness: ${a} of ${i} required locales available"
                aria-label="${a} of ${i} locales">
    ${a}/${i}
  </span>`;
}
function Hs(s, e = {}) {
  const t = U(s);
  if (!t.hasReadinessMetadata || t.readinessState === "ready")
    return "";
  const { size: r = "default", extraClass: n = "" } = e, o = r === "sm" ? "text-xs px-2 py-1" : "text-sm px-2.5 py-1", i = t.missingRequiredLocales.length, a = i > 0, l = Object.keys(t.missingRequiredFieldsByLocale).length > 0;
  let c = "bg-amber-100", d = "text-amber-800", u = "", h = "";
  return a && l ? (c = "bg-red-100", d = "text-red-800", u = `${i} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}. Also has incomplete fields.`) : a ? (c = "bg-amber-100", d = "text-amber-800", u = `${i} missing`, h = `Missing translations: ${t.missingRequiredLocales.join(", ")}`) : l && (c = "bg-yellow-100", d = "text-yellow-800", u = "Incomplete", h = `Incomplete fields in: ${Object.keys(t.missingRequiredFieldsByLocale).join(", ")}`), u ? `<span class="inline-flex items-center gap-1.5 rounded-full font-medium ${o} ${c} ${d} ${n}"
                title="${h}"
                aria-label="${h}"
                data-missing-translations="true"
                data-missing-count="${i}">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
    <span>${u}</span>
  </span>` : "";
}
function Gs(s) {
  const e = U(s);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function Us(s) {
  return U(s).missingRequiredLocales.length;
}
function Or(s, e, t) {
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
      const o = e.missingRequiredLocales, i = t && o.length > 0 ? `Missing translations: ${o.join(", ")}` : "Missing required translations";
      return {
        icon: n,
        label: `${o.length} missing`,
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        tooltip: i
      };
    }
    case "missing_fields": {
      const o = Object.keys(e.missingRequiredFieldsByLocale), i = t && o.length > 0 ? `Incomplete fields in: ${o.join(", ")}` : "Some translations have missing required fields";
      return {
        icon: n,
        label: "Incomplete",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        tooltip: i
      };
    }
    case "missing_locales_and_fields": {
      const o = e.missingRequiredLocales, i = Object.keys(e.missingRequiredFieldsByLocale), a = [];
      o.length > 0 && a.push(`Missing: ${o.join(", ")}`), i.length > 0 && a.push(`Incomplete: ${i.join(", ")}`);
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
function qr(s, e = {}) {
  const { size: t = "sm", maxLocales: r = 5, showLabels: n = !1 } = e, o = U(s);
  if (!o.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: i, availableLocales: a, missingRequiredFieldsByLocale: l } = o, c = i.length > 0 ? i : a;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(a), u = Fr(l), h = c.slice(0, r).map((m) => {
    const v = d.has(m), C = v && u.has(m), k = v && !C;
    let E, P, _;
    k ? (E = "bg-green-100 text-green-700 border-green-300", P = "●", _ = "Complete") : C ? (E = "bg-amber-100 text-amber-700 border-amber-300", P = "◐", _ = "Incomplete") : (E = "bg-white text-gray-400 border-gray-300 border-dashed", P = "○", _ = "Missing");
    const J = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", N = n ? `<span class="font-medium">${m.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${J} rounded border ${E}"
              title="${m.toUpperCase()}: ${_}"
              aria-label="${m.toUpperCase()}: ${_}"
              data-locale="${m}"
              data-state="${_.toLowerCase()}">
          ${N}
          <span aria-hidden="true">${P}</span>
        </span>
      `;
  }).join(""), p = c.length > r ? `<span class="text-[10px] text-gray-500" title="${c.length - r} more locales">+${c.length - r}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${h}${p}</div>`;
}
function Fr(s) {
  const e = /* @__PURE__ */ new Set();
  if (s && typeof s == "object")
    for (const [t, r] of Object.entries(s))
      Array.isArray(r) && r.length > 0 && e.add(t);
  return e;
}
function Vs(s = {}) {
  return (e, t, r) => qr(t, s);
}
function Ks(s, e = {}) {
  if (!s.fallbackUsed && !s.missingRequestedLocale)
    return "";
  const { showCreateButton: t = !0, createTranslationUrl: r, panelName: n } = e, o = s.requestedLocale || "requested locale", i = s.resolvedLocale || "default", a = t ? `
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
      Create ${o.toUpperCase()} translation
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
function Tt(s = {}) {
  return (e, t, r) => Tr(t, s);
}
function jr(s = {}) {
  return (e, t, r) => rr(t, s);
}
function fe(s, e) {
  for (const t of e) {
    const r = Et(s, t);
    if (typeof r == "string" && r.trim())
      return r;
  }
  return null;
}
function Nr(s, e) {
  for (const t of e) {
    const r = Et(s, t);
    if (Array.isArray(r))
      return r.filter((n) => typeof n == "string");
  }
  return [];
}
function Ot(s, e) {
  for (const t of e) {
    const r = Et(s, t);
    if (typeof r == "boolean")
      return r;
    if (r === "true") return !0;
    if (r === "false") return !1;
  }
  return !1;
}
function Et(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
const W = '<span class="text-gray-400">-</span>', zr = [
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
function ke(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Hr(s) {
  try {
    return JSON.stringify(s);
  } catch {
    return String(s);
  }
}
function Gr(s) {
  const e = [], t = (n) => {
    if (typeof n != "string") return;
    const o = n.trim();
    !o || e.includes(o) || e.push(o);
  };
  t(s.display_key), t(s.displayKey);
  const r = s.display_keys ?? s.displayKeys;
  return Array.isArray(r) && r.forEach(t), e;
}
function Ur(s, e) {
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
function Vr(s) {
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
function pt(s, e) {
  if (s == null)
    return "";
  if (Array.isArray(s))
    return gt(s, e);
  if (typeof s != "object")
    return String(s);
  const r = [...Gr(e), ...zr], n = /* @__PURE__ */ new Set();
  for (const o of r) {
    if (n.has(o)) continue;
    n.add(o);
    const i = Ur(s, o), a = Vr(i);
    if (a)
      return a;
  }
  return Hr(s);
}
function gt(s, e) {
  if (!Array.isArray(s) || s.length === 0)
    return "";
  const t = s.map((i) => pt(i, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const r = Number(e.preview_limit ?? e.previewLimit ?? 3), n = Number.isFinite(r) && r > 0 ? Math.floor(r) : 3, o = t.slice(0, n);
  return t.length <= n ? o.join(", ") : `${o.join(", ")} +${t.length - n} more`;
}
function Kr(s, e, t, r) {
  const n = s[e] ?? s[t] ?? r, o = Number(n);
  return Number.isFinite(o) && o > 0 ? Math.floor(o) : r;
}
function Yr(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" || n === "1" : !!n;
}
function Jr(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : String(n).trim() || r;
}
function Xr(s) {
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
function Wr(s) {
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
class Qr {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return W;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = gt(e, {});
        return t ? ke(t) : W;
      }
      if (typeof e == "object") {
        const t = pt(e, {});
        return t ? ke(t) : W;
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
      return Ye(String(e), "status", t);
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
        return W;
      const o = n?.options || {}, i = gt(e, o);
      return i ? ke(i) : W;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null)
        return W;
      const o = n?.options || {}, i = pt(e, o);
      return i ? ke(i) : W;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return W;
      const o = n?.options || {}, i = Kr(o, "max_visible", "maxVisible", 3), a = Yr(o, "show_count", "showCount", !0), l = Jr(o, "chip_variant", "chipVariant", "default"), c = o.block_icons_map || o.blockIconsMap || {}, d = [], u = e.slice(0, i);
      for (const m of u) {
        const v = Xr(m);
        if (!v) continue;
        const C = c[v] || "view-grid", k = Ir(C, { size: "14px", extraClass: "flex-shrink-0" }), E = Wr(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${E}">${k}<span>${ke(v)}</span></span>`
        );
      }
      if (d.length === 0)
        return W;
      const h = e.length - i;
      let p = "";
      return a && h > 0 && (p = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${p}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const Ys = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return Ye(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return Ye(String(e), "role", t);
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
  booleanChip: (s) => (e) => Dr(!!e, s),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (s) => {
    if (!s) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(s), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(r / 6e4), o = Math.floor(r / 36e5), i = Math.floor(r / 864e5);
      return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : i < 30 ? `${i} day${i > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(s);
    }
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: jr(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: Tt(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: Tt({ size: "sm", maxLocales: 2 })
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function qt(s, e) {
  var t = Object.keys(s);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(s);
    e && (r = r.filter(function(n) {
      return Object.getOwnPropertyDescriptor(s, n).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function Y(s) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? qt(Object(t), !0).forEach(function(r) {
      Zr(s, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(s, Object.getOwnPropertyDescriptors(t)) : qt(Object(t)).forEach(function(r) {
      Object.defineProperty(s, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return s;
}
function He(s) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? He = function(e) {
    return typeof e;
  } : He = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, He(s);
}
function Zr(s, e, t) {
  return e in s ? Object.defineProperty(s, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : s[e] = t, s;
}
function Z() {
  return Z = Object.assign || function(s) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (s[r] = t[r]);
    }
    return s;
  }, Z.apply(this, arguments);
}
function en(s, e) {
  if (s == null) return {};
  var t = {}, r = Object.keys(s), n, o;
  for (o = 0; o < r.length; o++)
    n = r[o], !(e.indexOf(n) >= 0) && (t[n] = s[n]);
  return t;
}
function tn(s, e) {
  if (s == null) return {};
  var t = en(s, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(s);
    for (n = 0; n < o.length; n++)
      r = o[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(s, r) && (t[r] = s[r]);
  }
  return t;
}
var rn = "1.15.6";
function Q(s) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(s);
}
var ee = Q(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), Te = Q(/Edge/i), Ft = Q(/firefox/i), De = Q(/safari/i) && !Q(/chrome/i) && !Q(/android/i), $t = Q(/iP(ad|od|hone)/i), nr = Q(/chrome/i) && Q(/android/i), sr = {
  capture: !1,
  passive: !1
};
function S(s, e, t) {
  s.addEventListener(e, t, !ee && sr);
}
function x(s, e, t) {
  s.removeEventListener(e, t, !ee && sr);
}
function Je(s, e) {
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
function or(s) {
  return s.host && s !== document && s.host.nodeType ? s.host : s.parentNode;
}
function G(s, e, t, r) {
  if (s) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? s.parentNode === t && Je(s, e) : Je(s, e)) || r && s === t)
        return s;
      if (s === t) break;
    } while (s = or(s));
  }
  return null;
}
var jt = /\s+/g;
function F(s, e, t) {
  if (s && e)
    if (s.classList)
      s.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + s.className + " ").replace(jt, " ").replace(" " + e + " ", " ");
      s.className = (r + (t ? " " + e : "")).replace(jt, " ");
    }
}
function b(s, e, t) {
  var r = s && s.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(s, "") : s.currentStyle && (t = s.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function ye(s, e) {
  var t = "";
  if (typeof s == "string")
    t = s;
  else
    do {
      var r = b(s, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (s = s.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function ir(s, e, t) {
  if (s) {
    var r = s.getElementsByTagName(e), n = 0, o = r.length;
    if (t)
      for (; n < o; n++)
        t(r[n], n);
    return r;
  }
  return [];
}
function K() {
  var s = document.scrollingElement;
  return s || document.documentElement;
}
function I(s, e, t, r, n) {
  if (!(!s.getBoundingClientRect && s !== window)) {
    var o, i, a, l, c, d, u;
    if (s !== window && s.parentNode && s !== K() ? (o = s.getBoundingClientRect(), i = o.top, a = o.left, l = o.bottom, c = o.right, d = o.height, u = o.width) : (i = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && s !== window && (n = n || s.parentNode, !ee))
      do
        if (n && n.getBoundingClientRect && (b(n, "transform") !== "none" || t && b(n, "position") !== "static")) {
          var h = n.getBoundingClientRect();
          i -= h.top + parseInt(b(n, "border-top-width")), a -= h.left + parseInt(b(n, "border-left-width")), l = i + o.height, c = a + o.width;
          break;
        }
      while (n = n.parentNode);
    if (r && s !== window) {
      var p = ye(n || s), m = p && p.a, v = p && p.d;
      p && (i /= v, a /= m, u /= m, d /= v, l = i + d, c = a + u);
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
function Nt(s, e, t) {
  for (var r = oe(s, !0), n = I(s)[e]; r; ) {
    var o = I(r)[t], i = void 0;
    if (i = n >= o, !i) return r;
    if (r === K()) break;
    r = oe(r, !1);
  }
  return !1;
}
function we(s, e, t, r) {
  for (var n = 0, o = 0, i = s.children; o < i.length; ) {
    if (i[o].style.display !== "none" && i[o] !== y.ghost && (r || i[o] !== y.dragged) && G(i[o], t.draggable, s, !1)) {
      if (n === e)
        return i[o];
      n++;
    }
    o++;
  }
  return null;
}
function kt(s, e) {
  for (var t = s.lastElementChild; t && (t === y.ghost || b(t, "display") === "none" || e && !Je(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function z(s, e) {
  var t = 0;
  if (!s || !s.parentNode)
    return -1;
  for (; s = s.previousElementSibling; )
    s.nodeName.toUpperCase() !== "TEMPLATE" && s !== y.clone && (!e || Je(s, e)) && t++;
  return t;
}
function zt(s) {
  var e = 0, t = 0, r = K();
  if (s)
    do {
      var n = ye(s), o = n.a, i = n.d;
      e += s.scrollLeft * o, t += s.scrollTop * i;
    } while (s !== r && (s = s.parentNode));
  return [e, t];
}
function nn(s, e) {
  for (var t in s)
    if (s.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === s[t][r]) return Number(t);
    }
  return -1;
}
function oe(s, e) {
  if (!s || !s.getBoundingClientRect) return K();
  var t = s, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var n = b(t);
      if (t.clientWidth < t.scrollWidth && (n.overflowX == "auto" || n.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (n.overflowY == "auto" || n.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return K();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return K();
}
function sn(s, e) {
  if (s && e)
    for (var t in e)
      e.hasOwnProperty(t) && (s[t] = e[t]);
  return s;
}
function nt(s, e) {
  return Math.round(s.top) === Math.round(e.top) && Math.round(s.left) === Math.round(e.left) && Math.round(s.height) === Math.round(e.height) && Math.round(s.width) === Math.round(e.width);
}
var Ie;
function ar(s, e) {
  return function() {
    if (!Ie) {
      var t = arguments, r = this;
      t.length === 1 ? s.call(r, t[0]) : s.apply(r, t), Ie = setTimeout(function() {
        Ie = void 0;
      }, e);
    }
  };
}
function on() {
  clearTimeout(Ie), Ie = void 0;
}
function lr(s, e, t) {
  s.scrollLeft += e, s.scrollTop += t;
}
function cr(s) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(s).cloneNode(!0) : t ? t(s).clone(!0)[0] : s.cloneNode(!0);
}
function dr(s, e, t) {
  var r = {};
  return Array.from(s.children).forEach(function(n) {
    var o, i, a, l;
    if (!(!G(n, e.draggable, s, !1) || n.animated || n === t)) {
      var c = I(n);
      r.left = Math.min((o = r.left) !== null && o !== void 0 ? o : 1 / 0, c.left), r.top = Math.min((i = r.top) !== null && i !== void 0 ? i : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var O = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function an() {
  var s = [], e;
  return {
    captureAnimationState: function() {
      if (s = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(b(n, "display") === "none" || n === y.ghost)) {
            s.push({
              target: n,
              rect: I(n)
            });
            var o = Y({}, s[s.length - 1].rect);
            if (n.thisAnimationDuration) {
              var i = ye(n, !0);
              i && (o.top -= i.f, o.left -= i.e);
            }
            n.fromRect = o;
          }
        });
      }
    },
    addAnimationState: function(r) {
      s.push(r);
    },
    removeAnimationState: function(r) {
      s.splice(nn(s, {
        target: r
      }), 1);
    },
    animateAll: function(r) {
      var n = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof r == "function" && r();
        return;
      }
      var o = !1, i = 0;
      s.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = I(c), h = c.prevFromRect, p = c.prevToRect, m = a.rect, v = ye(c, !0);
        v && (u.top -= v.f, u.left -= v.e), c.toRect = u, c.thisAnimationDuration && nt(h, u) && !nt(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (m.top - u.top) / (m.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = cn(m, h, p, n.options)), nt(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, m, u, l)), l && (o = !0, i = Math.max(i, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), o ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, i) : typeof r == "function" && r(), s = [];
    },
    animate: function(r, n, o, i) {
      if (i) {
        b(r, "transition", ""), b(r, "transform", "");
        var a = ye(this.el), l = a && a.a, c = a && a.d, d = (n.left - o.left) / (l || 1), u = (n.top - o.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, b(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = ln(r), b(r, "transition", "transform " + i + "ms" + (this.options.easing ? " " + this.options.easing : "")), b(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          b(r, "transition", ""), b(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, i);
      }
    }
  };
}
function ln(s) {
  return s.offsetWidth;
}
function cn(s, e, t, r) {
  return Math.sqrt(Math.pow(e.top - s.top, 2) + Math.pow(e.left - s.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var pe = [], st = {
  initializeByDefault: !0
}, Oe = {
  mount: function(e) {
    for (var t in st)
      st.hasOwnProperty(t) && !(t in e) && (e[t] = st[t]);
    pe.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), pe.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var o = e + "Global";
    pe.forEach(function(i) {
      t[i.pluginName] && (t[i.pluginName][o] && t[i.pluginName][o](Y({
        sortable: t
      }, r)), t.options[i.pluginName] && t[i.pluginName][e] && t[i.pluginName][e](Y({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    pe.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, Z(r, c.defaults);
      }
    });
    for (var o in e.options)
      if (e.options.hasOwnProperty(o)) {
        var i = this.modifyOption(e, o, e.options[o]);
        typeof i < "u" && (e.options[o] = i);
      }
  },
  getEventProperties: function(e, t) {
    var r = {};
    return pe.forEach(function(n) {
      typeof n.eventProperties == "function" && Z(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return pe.forEach(function(o) {
      e[o.pluginName] && o.optionListeners && typeof o.optionListeners[t] == "function" && (n = o.optionListeners[t].call(e[o.pluginName], r));
    }), n;
  }
};
function dn(s) {
  var e = s.sortable, t = s.rootEl, r = s.name, n = s.targetEl, o = s.cloneEl, i = s.toEl, a = s.fromEl, l = s.oldIndex, c = s.newIndex, d = s.oldDraggableIndex, u = s.newDraggableIndex, h = s.originalEvent, p = s.putSortable, m = s.extraEventProperties;
  if (e = e || t && t[O], !!e) {
    var v, C = e.options, k = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !ee && !Te ? v = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (v = document.createEvent("Event"), v.initEvent(r, !0, !0)), v.to = i || t, v.from = a || t, v.item = n || t, v.clone = o, v.oldIndex = l, v.newIndex = c, v.oldDraggableIndex = d, v.newDraggableIndex = u, v.originalEvent = h, v.pullMode = p ? p.lastPutMode : void 0;
    var E = Y(Y({}, m), Oe.getEventProperties(r, e));
    for (var P in E)
      v[P] = E[P];
    t && t.dispatchEvent(v), C[k] && C[k].call(e, v);
  }
}
var un = ["evt"], T = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, o = tn(r, un);
  Oe.pluginEvent.bind(y)(e, t, Y({
    dragEl: f,
    parentEl: A,
    ghostEl: w,
    rootEl: $,
    nextEl: he,
    lastDownEl: Ge,
    cloneEl: L,
    cloneHidden: se,
    dragStarted: Le,
    putSortable: M,
    activeSortable: y.active,
    originalEvent: n,
    oldIndex: be,
    oldDraggableIndex: Me,
    newIndex: j,
    newDraggableIndex: ne,
    hideGhostForTarget: pr,
    unhideGhostForTarget: gr,
    cloneNowHidden: function() {
      se = !0;
    },
    cloneNowShown: function() {
      se = !1;
    },
    dispatchSortableEvent: function(a) {
      R({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, o));
};
function R(s) {
  dn(Y({
    putSortable: M,
    cloneEl: L,
    targetEl: f,
    rootEl: $,
    oldIndex: be,
    oldDraggableIndex: Me,
    newIndex: j,
    newDraggableIndex: ne
  }, s));
}
var f, A, w, $, he, Ge, L, se, be, j, Me, ne, Fe, M, me = !1, Xe = !1, We = [], ce, H, ot, it, Ht, Gt, Le, ge, Pe, Be = !1, je = !1, Ue, B, at = [], mt = !1, Qe = [], et = typeof document < "u", Ne = $t, Ut = Te || ee ? "cssFloat" : "float", hn = et && !nr && !$t && "draggable" in document.createElement("div"), ur = function() {
  if (et) {
    if (ee)
      return !1;
    var s = document.createElement("x");
    return s.style.cssText = "pointer-events:auto", s.style.pointerEvents === "auto";
  }
}(), hr = function(e, t) {
  var r = b(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), o = we(e, 0, t), i = we(e, 1, t), a = o && b(o), l = i && b(i), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + I(o).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + I(i).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (o && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return i && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return o && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[Ut] === "none" || i && r[Ut] === "none" && c + d > n) ? "vertical" : "horizontal";
}, fn = function(e, t, r) {
  var n = r ? e.left : e.top, o = r ? e.right : e.bottom, i = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || o === l || n + i / 2 === a + c / 2;
}, pn = function(e, t) {
  var r;
  return We.some(function(n) {
    var o = n[O].options.emptyInsertThreshold;
    if (!(!o || kt(n))) {
      var i = I(n), a = e >= i.left - o && e <= i.right + o, l = t >= i.top - o && t <= i.bottom + o;
      if (a && l)
        return r = n;
    }
  }), r;
}, fr = function(e) {
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
      var h = (i ? a : l).options.group.name;
      return o === !0 || typeof o == "string" && o === h || o.join && o.indexOf(h) > -1;
    };
  }
  var r = {}, n = e.group;
  (!n || He(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, pr = function() {
  !ur && w && b(w, "display", "none");
}, gr = function() {
  !ur && w && b(w, "display", "");
};
et && !nr && document.addEventListener("click", function(s) {
  if (Xe)
    return s.preventDefault(), s.stopPropagation && s.stopPropagation(), s.stopImmediatePropagation && s.stopImmediatePropagation(), Xe = !1, !1;
}, !0);
var de = function(e) {
  if (f) {
    e = e.touches ? e.touches[0] : e;
    var t = pn(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[O]._onDragOver(r);
    }
  }
}, gn = function(e) {
  f && f.parentNode[O]._isOutsideThisEl(e.target);
};
function y(s, e) {
  if (!(s && s.nodeType && s.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(s));
  this.el = s, this.options = e = Z({}, e), s[O] = this;
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
      return hr(s, this.options);
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
    supportPointer: y.supportPointer !== !1 && "PointerEvent" in window && (!De || $t),
    emptyInsertThreshold: 5
  };
  Oe.initializePlugins(this, s, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  fr(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : hn, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? S(s, "pointerdown", this._onTapStart) : (S(s, "mousedown", this._onTapStart), S(s, "touchstart", this._onTapStart)), this.nativeDraggable && (S(s, "dragover", this), S(s, "dragenter", this)), We.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), Z(this, an());
}
y.prototype = /** @lends Sortable.prototype */
{
  constructor: y,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (ge = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, f) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, o = n.preventOnFilter, i = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (Cn(r), !f && !(/mousedown|pointerdown/.test(i) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && De && l && l.tagName.toUpperCase() === "SELECT") && (l = G(l, n.draggable, r, !1), !(l && l.animated) && Ge !== l)) {
        if (be = z(l), Me = z(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            R({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), T("filter", t, {
              evt: e
            }), o && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = G(c, u.trim(), r, !1), u)
            return R({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), T("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          o && e.preventDefault();
          return;
        }
        n.handle && !G(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, o = n.el, i = n.options, a = o.ownerDocument, l;
    if (r && !f && r.parentNode === o) {
      var c = I(r);
      if ($ = o, f = r, A = f.parentNode, he = f.nextSibling, Ge = r, Fe = i.group, y.dragged = f, ce = {
        target: f,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, Ht = ce.clientX - c.left, Gt = ce.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, f.style["will-change"] = "all", l = function() {
        if (T("delayEnded", n, {
          evt: e
        }), y.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !Ft && n.nativeDraggable && (f.draggable = !0), n._triggerDragStart(e, t), R({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), F(f, i.chosenClass, !0);
      }, i.ignore.split(",").forEach(function(d) {
        ir(f, d.trim(), lt);
      }), S(a, "dragover", de), S(a, "mousemove", de), S(a, "touchmove", de), i.supportPointer ? (S(a, "pointerup", n._onDrop), !this.nativeDraggable && S(a, "pointercancel", n._onDrop)) : (S(a, "mouseup", n._onDrop), S(a, "touchend", n._onDrop), S(a, "touchcancel", n._onDrop)), Ft && this.nativeDraggable && (this.options.touchStartThreshold = 4, f.draggable = !0), T("delayStart", this, {
        evt: e
      }), i.delay && (!i.delayOnTouchOnly || t) && (!this.nativeDraggable || !(Te || ee))) {
        if (y.eventCanceled) {
          this._onDrop();
          return;
        }
        i.supportPointer ? (S(a, "pointerup", n._disableDelayedDrag), S(a, "pointercancel", n._disableDelayedDrag)) : (S(a, "mouseup", n._disableDelayedDrag), S(a, "touchend", n._disableDelayedDrag), S(a, "touchcancel", n._disableDelayedDrag)), S(a, "mousemove", n._delayedDragTouchMoveHandler), S(a, "touchmove", n._delayedDragTouchMoveHandler), i.supportPointer && S(a, "pointermove", n._delayedDragTouchMoveHandler), n._dragStartTimer = setTimeout(l, i.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    f && lt(f), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    x(e, "mouseup", this._disableDelayedDrag), x(e, "touchend", this._disableDelayedDrag), x(e, "touchcancel", this._disableDelayedDrag), x(e, "pointerup", this._disableDelayedDrag), x(e, "pointercancel", this._disableDelayedDrag), x(e, "mousemove", this._delayedDragTouchMoveHandler), x(e, "touchmove", this._delayedDragTouchMoveHandler), x(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? S(document, "pointermove", this._onTouchMove) : t ? S(document, "touchmove", this._onTouchMove) : S(document, "mousemove", this._onTouchMove) : (S(f, "dragend", this), S($, "dragstart", this._onDragStart));
    try {
      document.selection ? Ve(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (me = !1, $ && f) {
      T("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && S(document, "dragover", gn);
      var r = this.options;
      !e && F(f, r.dragClass, !1), F(f, r.ghostClass, !0), y.active = this, e && this._appendGhost(), R({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (H) {
      this._lastX = H.clientX, this._lastY = H.clientY, pr();
      for (var e = document.elementFromPoint(H.clientX, H.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(H.clientX, H.clientY), e !== t); )
        t = e;
      if (f.parentNode[O]._isOutsideThisEl(e), t)
        do {
          if (t[O]) {
            var r = void 0;
            if (r = t[O]._onDragOver({
              clientX: H.clientX,
              clientY: H.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = or(t));
      gr();
    }
  },
  _onTouchMove: function(e) {
    if (ce) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, o = e.touches ? e.touches[0] : e, i = w && ye(w, !0), a = w && i && i.a, l = w && i && i.d, c = Ne && B && zt(B), d = (o.clientX - ce.clientX + n.x) / (a || 1) + (c ? c[0] - at[0] : 0) / (a || 1), u = (o.clientY - ce.clientY + n.y) / (l || 1) + (c ? c[1] - at[1] : 0) / (l || 1);
      if (!y.active && !me) {
        if (r && Math.max(Math.abs(o.clientX - this._lastX), Math.abs(o.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (w) {
        i ? (i.e += d - (ot || 0), i.f += u - (it || 0)) : i = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var h = "matrix(".concat(i.a, ",").concat(i.b, ",").concat(i.c, ",").concat(i.d, ",").concat(i.e, ",").concat(i.f, ")");
        b(w, "webkitTransform", h), b(w, "mozTransform", h), b(w, "msTransform", h), b(w, "transform", h), ot = d, it = u, H = o;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!w) {
      var e = this.options.fallbackOnBody ? document.body : $, t = I(f, !0, Ne, !0, e), r = this.options;
      if (Ne) {
        for (B = e; b(B, "position") === "static" && b(B, "transform") === "none" && B !== document; )
          B = B.parentNode;
        B !== document.body && B !== document.documentElement ? (B === document && (B = K()), t.top += B.scrollTop, t.left += B.scrollLeft) : B = K(), at = zt(B);
      }
      w = f.cloneNode(!0), F(w, r.ghostClass, !1), F(w, r.fallbackClass, !0), F(w, r.dragClass, !0), b(w, "transition", ""), b(w, "transform", ""), b(w, "box-sizing", "border-box"), b(w, "margin", 0), b(w, "top", t.top), b(w, "left", t.left), b(w, "width", t.width), b(w, "height", t.height), b(w, "opacity", "0.8"), b(w, "position", Ne ? "absolute" : "fixed"), b(w, "zIndex", "100000"), b(w, "pointerEvents", "none"), y.ghost = w, e.appendChild(w), b(w, "transform-origin", Ht / parseInt(w.style.width) * 100 + "% " + Gt / parseInt(w.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, o = r.options;
    if (T("dragStart", this, {
      evt: e
    }), y.eventCanceled) {
      this._onDrop();
      return;
    }
    T("setupClone", this), y.eventCanceled || (L = cr(f), L.removeAttribute("id"), L.draggable = !1, L.style["will-change"] = "", this._hideClone(), F(L, this.options.chosenClass, !1), y.clone = L), r.cloneId = Ve(function() {
      T("clone", r), !y.eventCanceled && (r.options.removeCloneOnHide || $.insertBefore(L, f), r._hideClone(), R({
        sortable: r,
        name: "clone"
      }));
    }), !t && F(f, o.dragClass, !0), t ? (Xe = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (x(document, "mouseup", r._onDrop), x(document, "touchend", r._onDrop), x(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", o.setData && o.setData.call(r, n, f)), S(document, "drop", r), b(f, "transform", "translateZ(0)")), me = !0, r._dragStartId = Ve(r._dragStarted.bind(r, t, e)), S(document, "selectstart", r), Le = !0, window.getSelection().removeAllRanges(), De && b(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, o, i, a = this.options, l = a.group, c = y.active, d = Fe === l, u = a.sort, h = M || c, p, m = this, v = !1;
    if (mt) return;
    function C($e, $r) {
      T($e, m, Y({
        evt: e,
        isOwner: d,
        axis: p ? "vertical" : "horizontal",
        revert: i,
        dragRect: n,
        targetRect: o,
        canSort: u,
        fromSortable: h,
        target: r,
        completed: E,
        onMove: function(Bt, kr) {
          return ze($, t, f, n, Bt, I(Bt), e, kr);
        },
        changed: P
      }, $r));
    }
    function k() {
      C("dragOverAnimationCapture"), m.captureAnimationState(), m !== h && h.captureAnimationState();
    }
    function E($e) {
      return C("dragOverCompleted", {
        insertion: $e
      }), $e && (d ? c._hideClone() : c._showClone(m), m !== h && (F(f, M ? M.options.ghostClass : c.options.ghostClass, !1), F(f, a.ghostClass, !0)), M !== m && m !== y.active ? M = m : m === y.active && M && (M = null), h === m && (m._ignoreWhileAnimating = r), m.animateAll(function() {
        C("dragOverAnimationComplete"), m._ignoreWhileAnimating = null;
      }), m !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (r === f && !f.animated || r === t && !r.animated) && (ge = null), !a.dragoverBubble && !e.rootEl && r !== document && (f.parentNode[O]._isOutsideThisEl(e.target), !$e && de(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), v = !0;
    }
    function P() {
      j = z(f), ne = z(f, a.draggable), R({
        sortable: m,
        name: "change",
        toEl: t,
        newIndex: j,
        newDraggableIndex: ne,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = G(r, a.draggable, t, !0), C("dragOver"), y.eventCanceled) return v;
    if (f.contains(e.target) || r.animated && r.animatingX && r.animatingY || m._ignoreWhileAnimating === r)
      return E(!1);
    if (Xe = !1, c && !a.disabled && (d ? u || (i = A !== $) : M === this || (this.lastPutMode = Fe.checkPull(this, c, f, e)) && l.checkPut(this, c, f, e))) {
      if (p = this._getDirection(e, r) === "vertical", n = I(f), C("dragOverValid"), y.eventCanceled) return v;
      if (i)
        return A = $, k(), this._hideClone(), C("revert"), y.eventCanceled || (he ? $.insertBefore(f, he) : $.appendChild(f)), E(!0);
      var _ = kt(t, a.draggable);
      if (!_ || vn(e, p, this) && !_.animated) {
        if (_ === f)
          return E(!1);
        if (_ && t === e.target && (r = _), r && (o = I(r)), ze($, t, f, n, r, o, e, !!r) !== !1)
          return k(), _ && _.nextSibling ? t.insertBefore(f, _.nextSibling) : t.appendChild(f), A = t, P(), E(!0);
      } else if (_ && yn(e, p, this)) {
        var J = we(t, 0, a, !0);
        if (J === f)
          return E(!1);
        if (r = J, o = I(r), ze($, t, f, n, r, o, e, !1) !== !1)
          return k(), t.insertBefore(f, J), A = t, P(), E(!0);
      } else if (r.parentNode === t) {
        o = I(r);
        var N = 0, ae, xe = f.parentNode !== t, q = !fn(f.animated && f.toRect || n, r.animated && r.toRect || o, p), Se = p ? "top" : "left", te = Nt(r, "top", "top") || Nt(f, "top", "top"), Ce = te ? te.scrollTop : void 0;
        ge !== r && (ae = o[Se], Be = !1, je = !q && a.invertSwap || xe), N = wn(e, r, o, p, q ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, je, ge === r);
        var X;
        if (N !== 0) {
          var le = z(f);
          do
            le -= N, X = A.children[le];
          while (X && (b(X, "display") === "none" || X === w));
        }
        if (N === 0 || X === r)
          return E(!1);
        ge = r, Pe = N;
        var Ee = r.nextElementSibling, re = !1;
        re = N === 1;
        var qe = ze($, t, f, n, r, o, e, re);
        if (qe !== !1)
          return (qe === 1 || qe === -1) && (re = qe === 1), mt = !0, setTimeout(bn, 30), k(), re && !Ee ? t.appendChild(f) : r.parentNode.insertBefore(f, re ? Ee : r), te && lr(te, 0, Ce - te.scrollTop), A = f.parentNode, ae !== void 0 && !je && (Ue = Math.abs(ae - I(r)[Se])), P(), E(!0);
      }
      if (t.contains(f))
        return E(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    x(document, "mousemove", this._onTouchMove), x(document, "touchmove", this._onTouchMove), x(document, "pointermove", this._onTouchMove), x(document, "dragover", de), x(document, "mousemove", de), x(document, "touchmove", de);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    x(e, "mouseup", this._onDrop), x(e, "touchend", this._onDrop), x(e, "pointerup", this._onDrop), x(e, "pointercancel", this._onDrop), x(e, "touchcancel", this._onDrop), x(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, r = this.options;
    if (j = z(f), ne = z(f, r.draggable), T("drop", this, {
      evt: e
    }), A = f && f.parentNode, j = z(f), ne = z(f, r.draggable), y.eventCanceled) {
      this._nulling();
      return;
    }
    me = !1, je = !1, Be = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), bt(this.cloneId), bt(this._dragStartId), this.nativeDraggable && (x(document, "drop", this), x(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), De && b(document.body, "user-select", ""), b(f, "transform", ""), e && (Le && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), w && w.parentNode && w.parentNode.removeChild(w), ($ === A || M && M.lastPutMode !== "clone") && L && L.parentNode && L.parentNode.removeChild(L), f && (this.nativeDraggable && x(f, "dragend", this), lt(f), f.style["will-change"] = "", Le && !me && F(f, M ? M.options.ghostClass : this.options.ghostClass, !1), F(f, this.options.chosenClass, !1), R({
      sortable: this,
      name: "unchoose",
      toEl: A,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), $ !== A ? (j >= 0 && (R({
      rootEl: A,
      name: "add",
      toEl: A,
      fromEl: $,
      originalEvent: e
    }), R({
      sortable: this,
      name: "remove",
      toEl: A,
      originalEvent: e
    }), R({
      rootEl: A,
      name: "sort",
      toEl: A,
      fromEl: $,
      originalEvent: e
    }), R({
      sortable: this,
      name: "sort",
      toEl: A,
      originalEvent: e
    })), M && M.save()) : j !== be && j >= 0 && (R({
      sortable: this,
      name: "update",
      toEl: A,
      originalEvent: e
    }), R({
      sortable: this,
      name: "sort",
      toEl: A,
      originalEvent: e
    })), y.active && ((j == null || j === -1) && (j = be, ne = Me), R({
      sortable: this,
      name: "end",
      toEl: A,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    T("nulling", this), $ = f = A = w = he = L = Ge = se = ce = H = Le = j = ne = be = Me = ge = Pe = M = Fe = y.dragged = y.ghost = y.clone = y.active = null, Qe.forEach(function(e) {
      e.checked = !0;
    }), Qe.length = ot = it = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        f && (this._onDragOver(e), mn(e));
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
    for (var e = [], t, r = this.el.children, n = 0, o = r.length, i = this.options; n < o; n++)
      t = r[n], G(t, i.draggable, this.el, !1) && e.push(t.getAttribute(i.dataIdAttr) || Sn(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var r = {}, n = this.el;
    this.toArray().forEach(function(o, i) {
      var a = n.children[i];
      G(a, this.options.draggable, n, !1) && (r[o] = a);
    }, this), t && this.captureAnimationState(), e.forEach(function(o) {
      r[o] && (n.removeChild(r[o]), n.appendChild(r[o]));
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
    var n = Oe.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && fr(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    T("destroy", this);
    var e = this.el;
    e[O] = null, x(e, "mousedown", this._onTapStart), x(e, "touchstart", this._onTapStart), x(e, "pointerdown", this._onTapStart), this.nativeDraggable && (x(e, "dragover", this), x(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), We.splice(We.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!se) {
      if (T("hideClone", this), y.eventCanceled) return;
      b(L, "display", "none"), this.options.removeCloneOnHide && L.parentNode && L.parentNode.removeChild(L), se = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (se) {
      if (T("showClone", this), y.eventCanceled) return;
      f.parentNode == $ && !this.options.group.revertClone ? $.insertBefore(L, f) : he ? $.insertBefore(L, he) : $.appendChild(L), this.options.group.revertClone && this.animate(f, L), b(L, "display", ""), se = !1;
    }
  }
};
function mn(s) {
  s.dataTransfer && (s.dataTransfer.dropEffect = "move"), s.cancelable && s.preventDefault();
}
function ze(s, e, t, r, n, o, i, a) {
  var l, c = s[O], d = c.options.onMove, u;
  return window.CustomEvent && !ee && !Te ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = s, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = o || I(e), l.willInsertAfter = a, l.originalEvent = i, s.dispatchEvent(l), d && (u = d.call(c, l, i)), u;
}
function lt(s) {
  s.draggable = !1;
}
function bn() {
  mt = !1;
}
function yn(s, e, t) {
  var r = I(we(t.el, 0, t.options, !0)), n = dr(t.el, t.options, w), o = 10;
  return e ? s.clientX < n.left - o || s.clientY < r.top && s.clientX < r.right : s.clientY < n.top - o || s.clientY < r.bottom && s.clientX < r.left;
}
function vn(s, e, t) {
  var r = I(kt(t.el, t.options.draggable)), n = dr(t.el, t.options, w), o = 10;
  return e ? s.clientX > n.right + o || s.clientY > r.bottom && s.clientX > r.left : s.clientY > n.bottom + o || s.clientX > r.right && s.clientY > r.top;
}
function wn(s, e, t, r, n, o, i, a) {
  var l = r ? s.clientY : s.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, h = !1;
  if (!i) {
    if (a && Ue < c * n) {
      if (!Be && (Pe === 1 ? l > d + c * o / 2 : l < u - c * o / 2) && (Be = !0), Be)
        h = !0;
      else if (Pe === 1 ? l < d + Ue : l > u - Ue)
        return -Pe;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return xn(e);
  }
  return h = h || i, h && (l < d + c * o / 2 || l > u - c * o / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function xn(s) {
  return z(f) < z(s) ? 1 : -1;
}
function Sn(s) {
  for (var e = s.tagName + s.className + s.src + s.href + s.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function Cn(s) {
  Qe.length = 0;
  for (var e = s.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && Qe.push(r);
  }
}
function Ve(s) {
  return setTimeout(s, 0);
}
function bt(s) {
  return clearTimeout(s);
}
et && S(document, "touchmove", function(s) {
  (y.active || me) && s.cancelable && s.preventDefault();
});
y.utils = {
  on: S,
  off: x,
  css: b,
  find: ir,
  is: function(e, t) {
    return !!G(e, t, e, !1);
  },
  extend: sn,
  throttle: ar,
  closest: G,
  toggleClass: F,
  clone: cr,
  index: z,
  nextTick: Ve,
  cancelNextTick: bt,
  detectDirection: hr,
  getChild: we,
  expando: O
};
y.get = function(s) {
  return s[O];
};
y.mount = function() {
  for (var s = arguments.length, e = new Array(s), t = 0; t < s; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (y.utils = Y(Y({}, y.utils), r.utils)), Oe.mount(r);
  });
};
y.create = function(s, e) {
  return new y(s, e);
};
y.version = rn;
var D = [], Ae, yt, vt = !1, ct, dt, Ze, _e;
function En() {
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
      this.sortable.nativeDraggable ? x(document, "dragover", this._handleAutoScroll) : (x(document, "pointermove", this._handleFallbackAutoScroll), x(document, "touchmove", this._handleFallbackAutoScroll), x(document, "mousemove", this._handleFallbackAutoScroll)), Vt(), Ke(), on();
    },
    nulling: function() {
      Ze = yt = Ae = vt = _e = ct = dt = null, D.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, o = (t.touches ? t.touches[0] : t).clientX, i = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(o, i);
      if (Ze = t, r || this.options.forceAutoScrollFallback || Te || ee || De) {
        ut(t, this.options, a, r);
        var l = oe(a, !0);
        vt && (!_e || o !== ct || i !== dt) && (_e && Vt(), _e = setInterval(function() {
          var c = oe(document.elementFromPoint(o, i), !0);
          c !== l && (l = c, Ke()), ut(t, n.options, c, r);
        }, 10), ct = o, dt = i);
      } else {
        if (!this.options.bubbleScroll || oe(a, !0) === K()) {
          Ke();
          return;
        }
        ut(t, this.options, oe(a, !1), !1);
      }
    }
  }, Z(s, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Ke() {
  D.forEach(function(s) {
    clearInterval(s.pid);
  }), D = [];
}
function Vt() {
  clearInterval(_e);
}
var ut = ar(function(s, e, t, r) {
  if (e.scroll) {
    var n = (s.touches ? s.touches[0] : s).clientX, o = (s.touches ? s.touches[0] : s).clientY, i = e.scrollSensitivity, a = e.scrollSpeed, l = K(), c = !1, d;
    yt !== t && (yt = t, Ke(), Ae = e.scroll, d = e.scrollFn, Ae === !0 && (Ae = oe(t, !0)));
    var u = 0, h = Ae;
    do {
      var p = h, m = I(p), v = m.top, C = m.bottom, k = m.left, E = m.right, P = m.width, _ = m.height, J = void 0, N = void 0, ae = p.scrollWidth, xe = p.scrollHeight, q = b(p), Se = p.scrollLeft, te = p.scrollTop;
      p === l ? (J = P < ae && (q.overflowX === "auto" || q.overflowX === "scroll" || q.overflowX === "visible"), N = _ < xe && (q.overflowY === "auto" || q.overflowY === "scroll" || q.overflowY === "visible")) : (J = P < ae && (q.overflowX === "auto" || q.overflowX === "scroll"), N = _ < xe && (q.overflowY === "auto" || q.overflowY === "scroll"));
      var Ce = J && (Math.abs(E - n) <= i && Se + P < ae) - (Math.abs(k - n) <= i && !!Se), X = N && (Math.abs(C - o) <= i && te + _ < xe) - (Math.abs(v - o) <= i && !!te);
      if (!D[u])
        for (var le = 0; le <= u; le++)
          D[le] || (D[le] = {});
      (D[u].vx != Ce || D[u].vy != X || D[u].el !== p) && (D[u].el = p, D[u].vx = Ce, D[u].vy = X, clearInterval(D[u].pid), (Ce != 0 || X != 0) && (c = !0, D[u].pid = setInterval(function() {
        r && this.layer === 0 && y.active._onTouchMove(Ze);
        var Ee = D[this.layer].vy ? D[this.layer].vy * a : 0, re = D[this.layer].vx ? D[this.layer].vx * a : 0;
        typeof d == "function" && d.call(y.dragged.parentNode[O], re, Ee, s, Ze, D[this.layer].el) !== "continue" || lr(D[this.layer].el, re, Ee);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && h !== l && (h = oe(h, !1)));
    vt = c;
  }
}, 30), mr = function(e) {
  var t = e.originalEvent, r = e.putSortable, n = e.dragEl, o = e.activeSortable, i = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = r || o;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (i("spill"), this.onSpill({
      dragEl: n,
      putSortable: r
    }));
  }
};
function Lt() {
}
Lt.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = we(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: mr
};
Z(Lt, {
  pluginName: "revertOnSpill"
});
function At() {
}
At.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: mr
};
Z(At, {
  pluginName: "removeOnSpill"
});
y.mount(new En());
y.mount(At, Lt);
class $n {
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
    n.className = "column-list", n.setAttribute("role", "list"), n.setAttribute("aria-label", "Column visibility and order"), this.columnListEl = n, e.forEach((i) => {
      const a = this.createColumnItem(i.field, i.label || i.field, !t.has(i.field));
      n.appendChild(a);
    }), this.container.appendChild(n);
    const o = this.createFooter();
    this.container.appendChild(o);
  }
  /**
   * Create header with search input and count badge
   */
  createHeader(e, t) {
    const r = document.createElement("div");
    r.className = "column-manager-header";
    const n = document.createElement("div");
    n.className = "column-search-container";
    const o = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    o.setAttribute("class", "column-search-icon"), o.setAttribute("viewBox", "0 0 24 24"), o.setAttribute("fill", "none"), o.setAttribute("stroke", "currentColor"), o.setAttribute("stroke-width", "2");
    const i = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    i.setAttribute("cx", "11"), i.setAttribute("cy", "11"), i.setAttribute("r", "8");
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path");
    a.setAttribute("d", "m21 21-4.3-4.3"), o.appendChild(i), o.appendChild(a);
    const l = document.createElement("input");
    l.type = "text", l.className = "column-search-input", l.placeholder = "Filter columns...", l.setAttribute("aria-label", "Filter columns"), this.searchInput = l, l.addEventListener("input", () => {
      this.filterColumns(l.value);
    }), n.appendChild(o), n.appendChild(l);
    const c = document.createElement("span");
    return c.className = "column-count-badge", c.textContent = `${t} of ${e}`, c.setAttribute("aria-live", "polite"), this.countBadgeEl = c, r.appendChild(n), r.appendChild(c), r;
  }
  /**
   * Filter columns by search term
   */
  filterColumns(e) {
    const t = e.toLowerCase().trim();
    this.container.querySelectorAll(".column-item").forEach((n) => {
      const o = n.querySelector(".column-label")?.textContent?.toLowerCase() || "", i = t === "" || o.includes(t);
      n.style.display = i ? "" : "none";
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
    const e = this.columnListEl, t = e.scrollTop, r = e.scrollHeight, n = e.clientHeight, o = r > n, i = o && t > 0, a = o && t + n < r - 1;
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
    const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    r.setAttribute("class", "column-reset-icon"), r.setAttribute("viewBox", "0 0 24 24"), r.setAttribute("fill", "none"), r.setAttribute("stroke", "currentColor"), r.setAttribute("stroke-width", "2"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-linejoin", "round");
    const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
    n.setAttribute("d", "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8");
    const o = document.createElementNS("http://www.w3.org/2000/svg", "path");
    o.setAttribute("d", "M3 3v5h5"), r.appendChild(n), r.appendChild(o);
    const i = document.createElement("span");
    return i.textContent = "Reset to Default", t.appendChild(r), t.appendChild(i), t.addEventListener("click", () => {
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
    const n = `column-item-${e}`, o = `column-switch-${e}`, i = document.createElement("div");
    i.className = "column-item", i.id = n, i.dataset.column = e, i.setAttribute("role", "listitem");
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
    ].forEach(([v, C]) => {
      const k = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      k.setAttribute("cx", String(v)), k.setAttribute("cy", String(C)), k.setAttribute("r", "1.5"), l.appendChild(k);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = o;
    const h = document.createElement("input");
    h.type = "checkbox", h.id = o, h.dataset.column = e, h.checked = r, h.setAttribute("role", "switch"), h.setAttribute("aria-checked", String(r)), h.setAttribute("aria-labelledby", `${n}-label`), h.setAttribute("aria-describedby", `${n}-desc`);
    const p = document.createElement("span");
    p.id = `${n}-desc`, p.className = "sr-only", p.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const m = document.createElement("span");
    return m.className = "column-switch-slider", m.setAttribute("aria-hidden", "true"), u.appendChild(h), u.appendChild(m), i.appendChild(a), i.appendChild(u), i.appendChild(p), i;
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
        const o = `column-item-${r}-desc`, i = this.container.querySelector(`#${o}`);
        if (i) {
          const a = this.container.querySelector(`#column-item-${r}-label`)?.textContent || r;
          i.textContent = `Press Space or Enter to toggle ${a} column visibility. Currently ${n ? "visible" : "hidden"}.`;
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
function kn(s, e = {}) {
  const {
    groupByField: t = "translation_group_id",
    defaultExpanded: r = !0,
    expandedGroups: n = /* @__PURE__ */ new Set()
  } = e, o = /* @__PURE__ */ new Map(), i = [];
  for (const l of s) {
    const c = Ln(l, t);
    if (c) {
      const d = o.get(c);
      d ? d.push(l) : o.set(c, [l]);
    } else
      i.push(l);
  }
  const a = [];
  for (const [l, c] of o) {
    const d = _n(c), u = n.has(l) || n.size === 0 && r;
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
    ungrouped: i,
    totalGroups: a.length,
    totalRecords: s.length
  };
}
function Ln(s, e) {
  const t = s[e];
  if (typeof t == "string" && t.trim())
    return t;
  const r = [
    `translation.meta.${e}`,
    `content_translation.meta.${e}`
  ];
  for (const n of r) {
    const o = An(s, n);
    if (typeof o == "string" && o.trim())
      return o;
  }
  return null;
}
function An(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
function _n(s) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let r = !1, n = 0;
  for (const i of s) {
    const a = i.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, u = a.readiness_state;
      Array.isArray(c) && c.filter(ve).forEach((h) => e.add(h)), Array.isArray(d) && d.filter(ve).forEach((h) => t.add(h)), (u === "missing_fields" || u === "missing_locales_and_fields") && (r = !0), u === "ready" && n++;
    }
    const l = i.available_locales;
    Array.isArray(l) && l.filter(ve).forEach((c) => e.add(c));
  }
  let o = null;
  if (s.length > 0) {
    const i = n === s.length, a = t.size > 0;
    i ? o = "ready" : a && r ? o = "missing_locales_and_fields" : a ? o = "missing_locales" : r && (o = "missing_fields");
  }
  return {
    totalItems: s.length,
    availableLocales: Array.from(e),
    missingLocales: Array.from(t),
    readinessState: o,
    readyForPublish: o === "ready"
  };
}
function ve(s) {
  return typeof s == "string";
}
function Dn(s, e) {
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
function In(s) {
  const e = /* @__PURE__ */ new Map(), t = s.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [r, n] of Object.entries(t))
    if (n && typeof n == "object") {
      const o = n;
      e.set(r, {
        totalItems: typeof o.total_items == "number" ? o.total_items : void 0,
        availableLocales: Array.isArray(o.available_locales) ? o.available_locales.filter(ve) : void 0,
        missingLocales: Array.isArray(o.missing_locales) ? o.missing_locales.filter(ve) : void 0,
        readinessState: Mn(o.readiness_state) ? o.readiness_state : void 0,
        readyForPublish: typeof o.ready_for_publish == "boolean" ? o.ready_for_publish : void 0
      });
    }
  return e;
}
function Mn(s) {
  return s === "ready" || s === "missing_locales" || s === "missing_fields" || s === "missing_locales_and_fields";
}
const br = "datagrid-expand-state-";
function Pn(s) {
  try {
    const e = br + s, t = localStorage.getItem(e);
    if (t) {
      const r = JSON.parse(t);
      if (Array.isArray(r))
        return new Set(r.filter(ve));
    }
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Bn(s, e) {
  try {
    const t = br + s;
    localStorage.setItem(t, JSON.stringify(Array.from(e)));
  } catch {
  }
}
function Js(s, e) {
  const t = s.groups.map((r) => r.groupId === e ? { ...r, expanded: !r.expanded } : r);
  return { ...s, groups: t };
}
function Xs(s) {
  const e = s.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...s, groups: e };
}
function Ws(s) {
  const e = s.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...s, groups: e };
}
function Qs(s) {
  const e = /* @__PURE__ */ new Set();
  for (const t of s.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const yr = "datagrid-view-mode-";
function Rn(s) {
  try {
    const e = yr + s, t = localStorage.getItem(e);
    if (t && On(t))
      return t;
  } catch {
  }
  return null;
}
function Tn(s, e) {
  try {
    const t = yr + s;
    localStorage.setItem(t, e);
  } catch {
  }
}
function On(s) {
  return s === "flat" || s === "grouped" || s === "matrix";
}
function qn(s, e = {}) {
  const { summary: t } = s, { size: r = "sm" } = e, n = r === "sm" ? "text-xs" : "text-sm", o = t.availableLocales.length, i = t.missingLocales.length, a = o + i;
  let l = "";
  if (t.readinessState) {
    const u = Fn(t.readinessState);
    l = `
      <span class="${n} px-1.5 py-0.5 rounded ${u.bgClass} ${u.textClass}"
            title="${u.description}">
        ${u.icon} ${u.label}
      </span>
    `;
  }
  const c = a > 0 ? `<span class="${n} text-gray-500">${o}/${a} locales</span>` : "", d = `<span class="${n} text-gray-500">${t.totalItems} item${t.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${l}
      ${c}
      ${d}
    </div>
  `;
}
function Fn(s) {
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
function jn(s, e, t = {}) {
  const { showExpandIcon: r = !0 } = t, n = r ? `<span class="expand-icon mr-2" aria-hidden="true">${s.expanded ? "▼" : "▶"}</span>` : "", o = qn(s);
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${Nn(s.groupId)}"
        data-expanded="${s.expanded}"
        role="row"
        aria-expanded="${s.expanded}"
        tabindex="0">
      <td colspan="${e + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${n}
            <span class="font-medium text-gray-700">Group: ${_t(s.groupId.slice(0, 12))}...</span>
          </div>
          ${o}
        </div>
      </td>
    </tr>
  `;
}
function _t(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Nn(s) {
  return _t(s);
}
function zn(s) {
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
function Zs(s) {
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
function eo(s, e, t) {
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
          <p class="mt-1 text-sm text-gray-500">${_t(e)}</p>
          ${r}
        </div>
      </td>
    </tr>
  `;
}
function Hn(s = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < s;
}
function Gn(s, e = 768) {
  return Hn(e) && s === "grouped" ? "flat" : s;
}
class Un {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new Re(), this.selectors = {
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
    const t = this.config.panelId || this.config.tableId, r = this.config.enableGroupedMode ? Rn(t) : null, n = this.config.enableGroupedMode ? Pn(t) : /* @__PURE__ */ new Set(), o = r || this.config.defaultViewMode || "flat";
    this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: new Set(
        this.config.columns.filter((i) => i.hidden).map((i) => i.field)
      ),
      columnOrder: this.config.columns.map((i) => i.field),
      // Initialize with config column order
      // Phase 2: Grouped mode state
      viewMode: o,
      groupedData: null,
      expandedGroups: n
    }, this.actionRenderer = new Pr({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new Qr(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([i, a]) => {
      this.cellRendererRegistry.register(i, a);
    }), this.defaultColumns = this.config.columns.map((i) => ({ ...i }));
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
    const o = e.get("filters");
    if (o)
      try {
        this.state.filters = JSON.parse(o);
      } catch (l) {
        console.warn("[DataGrid] Failed to parse filters from URL:", l);
      }
    const i = e.get("sort");
    if (i)
      try {
        this.state.sort = JSON.parse(i);
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
    Object.entries(t).forEach(([n, o]) => {
      o != null && e.append(n, String(o));
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
    const o = t !== this.state.perPage || n !== this.state.currentPage;
    return o && (this.state.perPage = t, this.state.currentPage = n, this.pushStateToURL()), e === 0 ? !1 : o;
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
    this.state.hiddenColumns.clear(), this.config.columns.forEach((i) => {
      r.has(i.field) || this.state.hiddenColumns.add(i.field);
    }), t || this.pushStateToURL(), this.tableEl.querySelectorAll("thead th[data-column]").forEach((i) => {
      const a = i.dataset.column;
      a && (i.style.display = r.has(a) ? "" : "none");
    }), this.tableEl.querySelectorAll("tbody td[data-column]").forEach((i) => {
      const a = i.dataset.column;
      a && (i.style.display = r.has(a) ? "" : "none");
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
      this.config.enableGroupedMode && this.state.viewMode === "grouped" ? t.innerHTML = zn(this.config.columns.length) : t.innerHTML = `
          <tr>
            <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
              No results found
            </td>
          </tr>
        `;
      return;
    }
    this.recordsById = {}, this.config.enableGroupedMode && this.state.viewMode === "grouped" ? this.renderGroupedData(e, r, t) : this.renderFlatData(r, t), this.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((i) => {
      const a = i.dataset.column;
      a && this.state.hiddenColumns.has(a) && (i.style.display = "none");
    }), this.updateSelectionBindings();
  }
  /**
   * Render data in flat mode (original behavior)
   */
  renderFlatData(e, t) {
    e.forEach((r, n) => {
      console.log(`[DataGrid] Rendering row ${n + 1}: id=${r.id}`), r.id && (this.recordsById[r.id] = r);
      const o = this.createTableRow(r);
      t.appendChild(o);
    }), console.log(`[DataGrid] Finished appending ${e.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length);
  }
  /**
   * Render data in grouped mode (Phase 2)
   */
  renderGroupedData(e, t, r) {
    const n = this.config.groupByField || "translation_group_id";
    let o = kn(t, {
      groupByField: n,
      defaultExpanded: !0,
      expandedGroups: this.state.expandedGroups
    });
    const i = In(e);
    i.size > 0 && (o = Dn(o, i)), this.state.groupedData = o;
    const a = this.config.columns.length;
    for (const l of o.groups) {
      const c = jn(l, a);
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
    for (const l of o.ungrouped) {
      l.id && (this.recordsById[l.id] = l);
      const c = this.createTableRow(l);
      r.appendChild(c);
    }
    console.log(`[DataGrid] Rendered ${o.groups.length} groups, ${o.ungrouped.length} ungrouped`);
  }
  /**
   * Toggle group expand/collapse state (Phase 2)
   */
  toggleGroup(e) {
    if (!this.state.groupedData) return;
    this.state.expandedGroups.has(e) ? this.state.expandedGroups.delete(e) : this.state.expandedGroups.add(e);
    const t = this.config.panelId || this.config.tableId;
    Bn(t, this.state.expandedGroups);
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
    const o = r.querySelector(".expand-icon");
    o && (o.textContent = n ? "▼" : "▶"), t.querySelectorAll(`tr.group-child-row[data-group-id="${e}"]`).forEach((a) => {
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
    const t = Gn(e);
    this.state.viewMode = t;
    const r = this.config.panelId || this.config.tableId;
    Tn(r, t), this.refresh();
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
    const o = this.config.actionBasePath || this.config.apiEndpoint, i = document.createElement("td");
    if (i.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", i.dataset.role = "actions", i.dataset.fixed = "right", this.config.rowActions) {
      const a = this.config.rowActions(e);
      i.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
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
            await this.handleDelete(e.id);
          },
          variant: "danger"
        }
      ];
      i.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = i.querySelector(`[data-action-id="${c}"]`);
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
    return t.appendChild(i), t;
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
    const t = this.getResponseTotal(e) ?? this.state.totalRows, r = this.state.perPage * (this.state.currentPage - 1), n = t === 0 ? 0 : r + 1, o = Math.min(r + this.state.perPage, t), i = document.querySelector(this.selectors.tableInfoStart), a = document.querySelector(this.selectors.tableInfoEnd), l = document.querySelector(this.selectors.tableInfoTotal);
    i && (i.textContent = String(n)), a && (a.textContent = String(o)), l && (l.textContent = String(t)), this.renderPaginationButtons(t);
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
    const n = [], o = this.state.currentPage;
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
    const i = 5;
    let a = Math.max(1, o - Math.floor(i / 2)), l = Math.min(r, a + i - 1);
    l - a < i - 1 && (a = Math.max(1, l - i + 1));
    for (let c = a; c <= l; c++) {
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
              ${o === r ? "disabled" : ""}
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
        const n = t.dataset.filterColumn, o = t instanceof HTMLInputElement ? t.type.toLowerCase() : "", i = t instanceof HTMLSelectElement ? "eq" : o === "" || o === "text" || o === "search" || o === "email" || o === "tel" || o === "url" ? "ilike" : "eq", a = t.dataset.filterOperator || i, l = t.value;
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
    !e || !t || (this.columnManager = new $n({
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
        const o = this.config.behaviors.export.getConcurrency?.() || "single", i = [];
        o === "single" ? t.forEach((d) => i.push(d)) : o === "per-format" && i.push(r);
        const a = (d) => {
          const u = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
          u && u.classList.add("hidden"), h && h.classList.remove("hidden");
        }, l = (d) => {
          const u = d.querySelector(".export-icon"), h = d.querySelector(".export-spinner");
          u && u.classList.remove("hidden"), h && h.classList.add("hidden");
        };
        i.forEach((d) => {
          d.setAttribute("data-export-loading", "true"), d.disabled = !0, a(d);
        });
        const c = o === "none";
        c && (r.setAttribute("data-export-loading", "true"), a(r));
        try {
          await this.config.behaviors.export.export(n, this);
        } catch (d) {
          console.error("[DataGrid] Export failed:", d);
        } finally {
          i.forEach((d) => {
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
        const o = r.dataset.sortColumn;
        if (!o) return;
        console.log(`[DataGrid] Sort button clicked for field: ${o}`);
        const i = this.state.sort.find((l) => l.field === o);
        let a = null;
        i ? i.direction === "asc" ? (a = "desc", i.direction = a) : (this.state.sort = this.state.sort.filter((l) => l.field !== o), a = null, console.log(`[DataGrid] Sort cleared for field: ${o}`)) : (a = "asc", this.state.sort = [{ field: o, direction: a }]), console.log("[DataGrid] New sort state:", this.state.sort), this.pushStateToURL(), a !== null && this.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await this.config.behaviors.sort.onSort(o, a, this)) : (console.log("[DataGrid] Calling refresh() for sort"), await this.refresh()), console.log("[DataGrid] Updating sort indicators"), this.updateSortIndicators();
      });
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.sort;
        if (!n) return;
        const o = this.state.sort.find((a) => a.field === n);
        let i = null;
        o ? o.direction === "asc" ? (i = "desc", o.direction = i) : (this.state.sort = this.state.sort.filter((a) => a.field !== n), i = null) : (i = "asc", this.state.sort = [{ field: n, direction: i }]), this.pushStateToURL(), i !== null && this.config.behaviors?.sort ? await this.config.behaviors.sort.onSort(n, i, this) : await this.refresh(), this.updateSortIndicators();
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
      const o = this.state.sort.find((a) => a.field === n), i = r.querySelector("svg");
      i && (o ? (r.classList.remove("opacity-0"), r.classList.add("opacity-100"), o.direction === "asc" ? (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', i.classList.add("text-blue-600"), i.classList.remove("text-gray-400")) : (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', i.classList.add("text-blue-600"), i.classList.remove("text-gray-400"))) : (i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', i.classList.remove("text-blue-600"), i.classList.add("text-gray-400")));
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      const n = r.dataset.sort, o = this.state.sort.find((a) => a.field === n), i = r.querySelector(".sort-indicator");
      i && (i.textContent = o ? o.direction === "asc" ? "↑" : "↓" : "");
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
    document.querySelectorAll("[data-bulk-action]").forEach((o) => {
      o.addEventListener("click", async () => {
        const i = o, a = i.dataset.bulkAction;
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
          const c = `${t}/${a}`, d = i.dataset.bulkConfirm, u = this.parseDatasetStringArray(i.dataset.bulkPayloadRequired), h = this.parseDatasetObject(i.dataset.bulkPayloadSchema), p = {
            id: a,
            label: i.textContent?.trim() || a,
            endpoint: c,
            confirm: d,
            payloadRequired: u,
            payloadSchema: h
          };
          try {
            await this.actionRenderer.executeBulkAction(p, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
          } catch (m) {
            console.error("Bulk action failed:", m), this.showError("Bulk action failed");
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
      const i = document.querySelector(this.selectors.selectAllCheckbox);
      i && (i.checked = !1);
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
    const r = e.getBoundingClientRect(), n = t.offsetHeight || 300, i = window.innerHeight - r.bottom, a = r.top, l = i < n && a > i, c = r.right - (t.offsetWidth || 224);
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
        const n = t.dataset.dropdownToggle, o = document.getElementById(n || "");
        o && (o.classList.contains("hidden"), document.querySelectorAll("[data-dropdown-toggle]").forEach((i) => {
          const a = i.dataset.dropdownToggle, l = document.getElementById(a || "");
          l && l !== o && l.classList.add("hidden");
        }), o.classList.toggle("hidden"));
      }, { signal: e });
    }), document.addEventListener("click", (t) => {
      const r = t.target.closest("[data-dropdown-trigger]");
      if (r) {
        t.stopPropagation();
        const o = r.closest("[data-dropdown]")?.querySelector(".actions-menu");
        document.querySelectorAll(".actions-menu").forEach((a) => {
          a !== o && a.classList.add("hidden");
        });
        const i = o?.classList.contains("hidden");
        o?.classList.toggle("hidden"), r.setAttribute("aria-expanded", i ? "true" : "false"), i && o && this.positionDropdownMenu(r, o);
      } else
        t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
          (o) => o.classList.add("hidden")
        ), document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
          const i = o.dataset.dropdownToggle, a = document.getElementById(i || "");
          a && a.classList.add("hidden");
        }));
    }, { signal: e }), document.addEventListener("keydown", (t) => {
      t.key === "Escape" && (document.querySelectorAll(".actions-menu").forEach((r) => {
        r.classList.add("hidden");
        const n = r.closest("[data-dropdown]")?.querySelector("[data-dropdown-trigger]");
        n && n.setAttribute("aria-expanded", "false");
      }), document.querySelectorAll("[data-dropdown-toggle]").forEach((r) => {
        const n = r.dataset.dropdownToggle, o = document.getElementById(n || "");
        o && o.classList.add("hidden");
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
    return e instanceof Response ? er(e) : e instanceof Error ? e.message : "An unexpected error occurred";
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
    const t = new Set(this.config.columns.map((i) => i.field)), r = new Set(e), n = e.filter((i) => t.has(i)), o = this.config.columns.map((i) => i.field).filter((i) => !r.has(i));
    return [...n, ...o];
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
    r && this.reorderRowCells(r, e, "th"), this.tableEl.querySelectorAll("tbody tr").forEach((o) => {
      this.reorderRowCells(o, e, "td");
    });
  }
  /**
   * Reorder cells within a single row
   * Preserves fixed columns (selection on left, actions on right)
   */
  reorderRowCells(e, t, r) {
    const n = Array.from(e.querySelectorAll(`${r}[data-column]`)), o = new Map(
      n.map((d) => [d.dataset.column, d])
    ), i = Array.from(e.querySelectorAll(r)), a = e.querySelector(`${r}[data-role="selection"]`) || i.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${r}[data-role="actions"]`) || i.find(
      (d) => !d.dataset.column && (d.querySelector("[data-action]") || d.querySelector("[data-action-id]") || d.querySelector(".dropdown"))
    ), c = [];
    a && c.push(a), t.forEach((d) => {
      const u = o.get(d);
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
typeof window < "u" && (window.DataGrid = Un);
const Kt = {
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
class to {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new Re();
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
        const o = this.createLogicConnector(t);
        r.appendChild(o);
      }
      this.container.appendChild(r);
    }));
  }
  createCriterionRow(e, t) {
    const r = document.createElement("div");
    r.className = "flex items-center gap-2 py-3";
    const n = this.config.fields.find((o) => o.name === e.field) || this.config.fields[0];
    return r.innerHTML = `
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
    `, r.querySelectorAll("select, input").forEach((o) => {
      o.addEventListener("change", (i) => this.updateCriterion(i.target));
    }), r.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      this.removeCriterion(t);
    }), r;
  }
  createValueInput(e, t, r) {
    return e.type === "select" && e.options ? `
        <select data-criterion-index="${r}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${e.options.map((o) => `
            <option value="${o.value}" ${o.value === t.value ? "selected" : ""}>${o.label}</option>
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
      n.addEventListener("click", (o) => {
        const i = o.target, a = parseInt(i.dataset.logicIndex || "0", 10), l = i.dataset.logicValue;
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Kt[e.type] || Kt.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Rt({
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
    new Rt({
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
      t && (t.placeholder = "", t.style.display = ""), r && r.classList.remove("hidden"), this.criteria.forEach((n, o) => {
        const i = this.createChip(n, o);
        e.appendChild(i);
      });
    }
  }
  /**
   * Create a single filter chip
   */
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200";
    const o = this.config.fields.find((l) => l.name === e.field)?.label || e.field, i = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    r.innerHTML = `
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
const Yt = {
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
class ro {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new Re(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    `, r.appendChild(n), e.conditions.forEach((i, a) => {
      const l = this.createConditionElement(i, t, a);
      if (r.appendChild(l), a < e.conditions.length - 1) {
        const c = this.createConditionConnector(t, a, e.logic);
        r.appendChild(c);
      }
    });
    const o = document.createElement("button");
    return o.type = "button", o.className = "mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800", o.dataset.addCondition = String(t), o.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${e.logic.toUpperCase()}
    `, r.appendChild(o), this.bindGroupEvents(r, t), r;
  }
  createConditionElement(e, t, r) {
    const n = document.createElement("div");
    n.className = "flex items-center gap-2 mb-2";
    const o = this.config.fields.find((i) => i.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${r}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((i) => `
          <option value="${i.name}" ${i.name === e.field ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${r}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(o).map((i) => `
          <option value="${i.value}" ${i.value === e.operator ? "selected" : ""}>${i.label}</option>
        `).join("")}
      </select>

      ${this.renderValueInput(o, e, t, r)}

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
          ${e.options.map((i) => `
            <option value="${i.value}" ${i.value === t.value ? "selected" : ""}>${i.label}</option>
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
      n.addEventListener("click", (o) => {
        const i = o.target, a = parseInt(i.dataset.groupLogic || "0", 10), l = i.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((o) => {
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
    const r = this.structure.groups[e];
    r.conditions.splice(t, 1), r.conditions.length === 0 ? this.removeGroup(e) : this.render();
  }
  removeGroup(e) {
    this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.length > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 ? this.addGroup() : this.render();
  }
  getOperatorsForField(e) {
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Yt[e.type] || Yt.text;
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
        const o = n.operator.toUpperCase(), i = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${o === "ILIKE" ? "ILIKE" : o === "EQ" ? "=" : o} ${i}`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const o = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${o.toUpperCase()} ${r}`;
    }, "");
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t) => {
      const r = t.conditions.filter((n) => n.value !== "" && n.value !== null).map((n) => {
        const o = this.config.fields.find((l) => l.name === n.field), i = o?.label || n.field, a = this.getOperatorsForField(o).find((l) => l.value === n.operator)?.label || n.operator;
        return `${i} ${a} "${n.value}"`;
      });
      return r.length === 0 ? "" : r.length === 1 ? r[0] : `( ${r.join(` ${t.logic.toUpperCase()} `)} )`;
    }).filter((t) => t !== "");
    return e.length === 0 ? "" : e.length === 1 ? e[0] : e.reduce((t, r, n) => {
      if (n === 0) return r;
      const o = this.structure.groupLogic[n - 1] || "and";
      return `${t} ${o.toUpperCase()} ${r}`;
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
      const o = n.column;
      t.has(o) || t.set(o, []), t.get(o).push(n);
    });
    const r = [];
    return t.forEach((n) => {
      r.push({
        conditions: n.map((o) => ({
          field: o.column,
          operator: o.operator || "ilike",
          value: o.value
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
class no {
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
class so {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "")
        return;
      const o = n.operator || "eq", i = n.column;
      r.has(i) || r.set(i, { operator: o, values: [] }), r.get(i).values.push(n.value);
    }), r.forEach((n, o) => {
      if (n.values.length === 1) {
        const i = n.operator === "eq" ? o : `${o}__${n.operator}`;
        t[i] = n.values[0];
      } else
        n.operator === "ilike" ? t[`${o}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${o}__in`] = n.values.join(",") : t[`${o}__${n.operator}`] = n.values.join(",");
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
class io {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class ao {
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
    const r = Vn(t, this.config, e);
    r.delivery = Kn(this.config, e);
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
    } catch (o) {
      const i = o instanceof Error ? o.message : "Network error during export";
      throw ue(t, "error", i), o;
    }
    if (n.status === 202) {
      const o = await n.json().catch(() => ({}));
      ue(t, "info", "Export queued. You can download it when ready.");
      const i = o?.status_url || "";
      if (i) {
        const a = Xn(o, i);
        try {
          await Wn(i, {
            intervalMs: Yn(this.config),
            timeoutMs: Jn(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await wt(l);
            throw ue(t, "error", c), new Error(c);
          }
          await Xt(l, r.definition || r.resource || "export", r.format), ue(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw ue(t, "error", c), l;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const o = await wt(n);
      throw ue(t, "error", o), new Error(o);
    }
    await Xt(n, r.definition || r.resource || "export", r.format), ue(t, "success", "Export ready.");
  }
}
function Vn(s, e, t) {
  const r = os(t), n = Zn(s, e), o = es(s, e), i = ts(s), a = rs(i), l = {
    format: r,
    query: a,
    selection: n,
    columns: o,
    delivery: e.delivery || "auto"
  };
  e.definition && (l.definition = e.definition), e.resource && (l.resource = e.resource);
  const c = e.sourceVariant || e.variant;
  return c && (l.source_variant = c), l;
}
function Kn(s, e) {
  return s.delivery ? s.delivery : (s.asyncFormats && s.asyncFormats.length > 0 ? s.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function Yn(s) {
  const e = Number(s.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function Jn(s) {
  const e = Number(s.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function Xn(s, e) {
  return s?.download_url ? s.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function Wn(s, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await fetch(s, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const a = await wt(n);
      throw new Error(a);
    }
    const o = await n.json().catch(() => ({})), i = String(o?.state || "").toLowerCase();
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
    await Qn(r);
  }
}
function Qn(s) {
  return new Promise((e) => setTimeout(e, s));
}
function Zn(s, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(s.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function es(s, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = s.state?.hiddenColumns ? new Set(s.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(s.state?.columnOrder) && s.state.columnOrder.length > 0 ? s.state.columnOrder : s.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function ts(s) {
  const e = {}, t = s.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(s.state.currentPage, s.state.perPage)), s.state.search && t.search && Object.assign(e, t.search.buildQuery(s.state.search)), s.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(s.state.filters)), s.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(s.state.sort)), e;
}
function rs(s) {
  const e = {}, t = [];
  return Object.entries(s).forEach(([r, n]) => {
    if (n == null || n === "")
      return;
    switch (r) {
      case "limit":
        e.limit = Jt(n);
        return;
      case "offset":
        e.offset = Jt(n);
        return;
      case "order":
      case "sort":
        e.sort = ss(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: o, op: i } = ns(r);
    o && t.push({ field: o, op: i, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function ns(s) {
  const e = s.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function ss(s) {
  return s ? s.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", n = t[1] || "asc";
    return { field: r, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function os(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function Jt(s) {
  const e = Number(s);
  return Number.isFinite(e) ? e : 0;
}
async function Xt(s, e, t) {
  const r = await s.blob(), n = is(s, e, t), o = URL.createObjectURL(r), i = document.createElement("a");
  i.href = o, i.download = n, i.rel = "noopener", document.body.appendChild(i), i.click(), i.remove(), URL.revokeObjectURL(o);
}
function is(s, e, t) {
  const r = s.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return as(r) || n;
}
function as(s) {
  if (!s) return null;
  const e = s.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = s.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function wt(s) {
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
function ue(s, e, t) {
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
class lo {
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
    const n = this.getActionEndpoint(e), o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids: t })
    });
    if (!o.ok) {
      const i = await o.text();
      throw new Error(`Bulk action '${e}' failed: ${i}`);
    }
    await r.refresh();
  }
}
function ls(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function cs(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function vr(s) {
  return typeof s == "object" && s !== null && "version" in s && s.version === 2;
}
class ds {
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
    const r = !t.state.hiddenColumns.has(e), n = t.config.columns.filter((a) => a.field === e ? !r : !t.state.hiddenColumns.has(a.field)).map((a) => a.field), o = {};
    t.config.columns.forEach((a) => {
      o[a.field] = n.includes(a.field);
    });
    const i = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: o,
      order: i.length > 0 ? i : void 0
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
      const r = new Set(e), n = t.order.filter((o) => r.has(o));
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
      return Object.entries(t.visibility).forEach(([o, i]) => {
        !i && r.has(o) && n.add(o);
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
      if (vr(t))
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
class co extends ds {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = ls(t.basePath), o = cs(t.apiBasePath);
    t.preferencesEndpoint ? this.preferencesEndpoint = t.preferencesEndpoint : o ? this.preferencesEndpoint = `${o}/preferences` : n ? this.preferencesEndpoint = `${n}/api/preferences` : this.preferencesEndpoint = "/api/preferences", this.syncDebounce = t.syncDebounce ?? 1e3;
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
      const o = n[this.serverPrefsKey];
      return vr(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
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
      Object.entries(t.visibility).forEach(([i, a]) => {
        a || r.add(i);
      });
      const n = new Set(e), o = (t.order || []).filter((i) => n.has(i));
      return {
        hiddenColumns: r,
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
const Wt = {
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
}, us = 5e3;
class hs {
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
    const o = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const i of t) {
        if (!i.name || !this.shouldIncludeAction(e, i)) continue;
        const a = i.name.toLowerCase();
        if (this.seenActions.has(a)) continue;
        this.seenActions.add(a);
        const l = this.resolveRecordActionState(e, i.name), c = this.buildActionFromSchema(e, i, o, l);
        c && r.push({
          action: c,
          name: i.name,
          order: this.resolveActionOrder(i.name, i.order),
          insertionIndex: n++
        });
      }
      this.config.appendDefaultActions && this.appendDefaultActionsOrdered(r, e, o, n);
    } else this.config.useDefaultFallback && this.appendDefaultActionsOrdered(r, e, o, n);
    return r.sort((i, a) => i.order !== a.order ? i.order - a.order : i.insertionIndex - a.insertionIndex), r.map((i) => i.action);
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
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : Wt[r] !== void 0 ? Wt[r] : us;
  }
  /**
   * Build a single action from schema definition
   */
  buildActionFromSchema(e, t, r, n) {
    const o = t.name, i = t.label || t.label_key || o, a = t.variant || "secondary", l = t.icon, c = this.isNavigationAction(t), d = o === "delete";
    return c ? this.applyActionState(
      this.buildNavigationAction(e, t, i, a, l, r),
      n
    ) : d ? this.applyActionState(this.buildDeleteAction(e, i, a, l), n) : this.applyActionState(this.buildPostAction(e, t, i, a, l), n);
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
      const o = typeof n == "string" ? n.trim() : "";
      if (!o) continue;
      const i = this.resolveRecordContextValue(e, o);
      if (this.isEmptyPayloadValue(i))
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
    const n = r.split(".").map((i) => i.trim()).filter(Boolean);
    if (n.length === 0) return;
    let o = e;
    for (const i of n) {
      if (!o || typeof o != "object" || Array.isArray(o))
        return;
      o = o[i];
    }
    return o;
  }
  /**
   * Build navigation action (view, edit, etc.)
   */
  buildNavigationAction(e, t, r, n, o, i) {
    const a = String(e.id || ""), l = this.config.actionBasePath;
    let c;
    return t.href ? c = t.href.replace("{id}", a) : t.name === "edit" ? c = `${l}/${a}/edit` : c = `${l}/${a}`, i && (c += c.includes("?") ? `&${i}` : `?${i}`), {
      label: r,
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
  buildDeleteAction(e, t, r, n) {
    const o = String(e.id || ""), i = this.config.apiEndpoint;
    return {
      label: t,
      icon: n || "trash",
      variant: r === "secondary" ? "danger" : r,
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
  buildPostAction(e, t, r, n, o) {
    const i = String(e.id || ""), a = t.name, l = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      label: r,
      icon: o || this.getDefaultIcon(a),
      variant: n,
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
    const t = await St(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (Lr(t.error)) {
      const n = Ar(t.error);
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
    const o = this.config.actionBasePath, i = new URLSearchParams();
    n && i.set("locale", n), this.config.environment && i.set("env", this.config.environment);
    const a = i.toString(), l = `${o}/${r}/edit${a ? `?${a}` : ""}`, c = typeof t.source_locale == "string" ? t.source_locale : this.config.locale || "source", d = this.localeLabel(n || "unknown");
    typeof window < "u" && "toastManager" in window ? window.toastManager.success(`${d} translation created`, {
      action: {
        label: `View ${c.toUpperCase()}`,
        handler: () => {
          const h = new URLSearchParams();
          h.set("locale", c), this.config.environment && h.set("env", this.config.environment);
          const p = typeof t.id == "string" ? t.id : String(t.id || r);
          window.location.href = `${o}/${p}/edit?${h.toString()}`;
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
    const n = this.normalizePayloadSchema(t.payload_schema), o = this.collectRequiredFields(t.payload_required, n);
    if (n?.properties)
      for (const [l, c] of Object.entries(n.properties))
        r[l] === void 0 && c.default !== void 0 && (r[l] = c.default);
    o.includes("idempotency_key") && this.isEmptyPayloadValue(r.idempotency_key) && (r.idempotency_key = this.generateIdempotencyKey(t.name, String(e.id || "")));
    const i = o.filter((l) => this.isEmptyPayloadValue(r[l]));
    if (i.length === 0)
      return r;
    const a = await this.promptForPayload(t, i, n, r, e);
    if (a === null)
      return null;
    for (const l of i) {
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
  async promptForPayload(e, t, r, n, o) {
    if (t.length === 0)
      return {};
    const { PayloadInputModal: i } = await Promise.resolve().then(() => fs), a = t.map((c) => {
      const d = r?.properties?.[c];
      return {
        name: c,
        label: d?.title || c,
        description: d?.description,
        value: this.stringifyDefault(n[c] ?? d?.default),
        type: d?.type || "string",
        options: this.buildFieldOptions(c, e.name, d, o)
      };
    });
    return await i.prompt({
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
      return r.oneOf.filter((i) => i && "const" in i).map((i) => ({
        value: this.stringifyDefault(i.const),
        label: i.title || this.stringifyDefault(i.const)
      }));
    if (r.enum)
      return r.enum.map((i) => ({
        value: this.stringifyDefault(i),
        label: this.stringifyDefault(i)
      }));
    const o = this.buildExtensionFieldOptions(r);
    return o && o.length > 0 ? o : this.deriveCreateTranslationLocaleOptions(e, t, n);
  }
  buildExtensionFieldOptions(e) {
    const t = e, r = t["x-options"] ?? t.x_options ?? t.xOptions;
    if (!Array.isArray(r) || r.length === 0)
      return;
    const n = [];
    for (const o of r) {
      if (typeof o == "string") {
        const d = this.stringifyDefault(o);
        if (!d)
          continue;
        n.push({ value: d, label: d });
        continue;
      }
      if (!o || typeof o != "object")
        continue;
      const i = o.value, a = this.stringifyDefault(i);
      if (!a)
        continue;
      const l = o.label, c = this.stringifyDefault(l) || a;
      n.push({ value: a, label: c });
    }
    return n.length > 0 ? n : void 0;
  }
  deriveCreateTranslationLocaleOptions(e, t, r) {
    if (e.trim().toLowerCase() !== "locale" || t.trim().toLowerCase() !== "create_translation" || !r || typeof r != "object")
      return;
    const n = this.asObject(r.translation_readiness);
    let o = this.asStringArray(n?.missing_required_locales);
    if (o.length === 0 && (o = this.asStringArray(r.missing_locales)), o.length === 0 && n) {
      const u = this.asStringArray(n.required_locales), h = new Set(this.asStringArray(n.available_locales));
      o = u.filter((p) => !h.has(p));
    }
    if (o.length === 0)
      return;
    const i = this.extractStringField(r, "recommended_locale"), a = this.asStringArray(n?.required_for_publish ?? n?.required_locales), l = this.asStringArray(n?.available_locales ?? r.existing_locales), c = /* @__PURE__ */ new Set(), d = [];
    for (const u of o) {
      const h = u.trim().toLowerCase();
      if (!h || c.has(h))
        continue;
      c.add(h);
      const p = i?.toLowerCase() === h, m = a.includes(h), v = [];
      m && v.push("Required for publishing"), l.length > 0 && v.push(`${l.length} translation${l.length > 1 ? "s" : ""} exist`);
      const C = v.length > 0 ? v.join(" • ") : void 0;
      let k = `${h.toUpperCase()} - ${this.localeLabel(h)}`;
      p && (k += " (recommended)"), d.push({
        value: h,
        label: k,
        description: C,
        recommended: p
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
      for (const [i, a] of Object.entries(t))
        a && typeof a == "object" && !Array.isArray(a) && (r[i] = a);
    }
    const n = e.required, o = Array.isArray(n) ? n.filter((i) => typeof i == "string").map((i) => i.trim()).filter((i) => i.length > 0) : void 0;
    return {
      type: typeof e.type == "string" ? e.type : void 0,
      required: o,
      properties: r
    };
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), o = (i) => {
      const a = i.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((i) => o(String(i))), Array.isArray(t?.required) && t.required.forEach((i) => o(String(i))), r;
  }
  isEmptyPayloadValue(e) {
    return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
  }
  generateIdempotencyKey(e, t) {
    const r = e.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), n = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), o = typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return `${r || "action"}-${n || "record"}-${o}`;
  }
  coercePromptValue(e, t, r) {
    const n = typeof e == "string" ? e.trim() : String(e ?? "").trim(), o = typeof r?.type == "string" ? r.type.toLowerCase() : "string";
    if (n.length === 0)
      return { value: n };
    if (o === "number" || o === "integer") {
      const i = Number(n);
      return Number.isFinite(i) ? { value: o === "integer" ? Math.trunc(i) : i } : { value: null, error: `${t} must be a valid number` };
    }
    if (o === "boolean") {
      const i = n.toLowerCase();
      return i === "true" || i === "1" || i === "yes" ? { value: !0 } : i === "false" || i === "0" || i === "no" ? { value: !1 } : { value: null, error: `${t} must be true or false` };
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
    return _r(t, `${e} failed`);
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
    const n = String(t.id || ""), o = this.config.actionBasePath, i = this.config.apiEndpoint, a = [
      {
        name: "view",
        button: {
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let l = `${o}/${n}`;
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
            let l = `${o}/${n}/edit`;
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
            if (!(await fetch(`${i}/${n}`, {
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
    const o = String(t.id || ""), i = this.config.actionBasePath, a = this.config.apiEndpoint, l = [
      {
        name: "view",
        button: {
          label: "View",
          icon: "eye",
          variant: "secondary",
          action: () => {
            let d = `${i}/${o}`;
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
            let d = `${i}/${o}/edit`;
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
            if (!(await fetch(`${a}/${o}`, {
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
function uo(s, e, t) {
  return new hs(t).buildRowActions(s, e);
}
function ho(s) {
  return s.schema?.actions;
}
class Dt extends Ct {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = r;
  }
  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(e) {
    return new Promise((t) => {
      new Dt(
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
          <h3 class="text-lg font-semibold text-gray-900">${g(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${g(this.modalConfig.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${g(this.modalConfig.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), r = () => {
      this.clearErrors();
      const o = {};
      let i = null;
      for (const a of this.modalConfig.fields) {
        const l = this.container?.querySelector(
          `[data-payload-field="${a.name}"]`
        );
        if (!l)
          continue;
        const c = l.value.trim();
        o[a.name] = c, c || (i || (i = l), this.showFieldError(a.name, "This field is required."));
      }
      if (i) {
        i.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(o), this.hide();
    };
    e?.addEventListener("submit", (o) => {
      o.preventDefault(), r();
    }), t?.addEventListener("click", () => {
      this.hide();
    }), this.container?.querySelectorAll("[data-payload-radio-group]")?.forEach((o) => {
      const i = o.dataset.payloadRadioGroup;
      if (!i) return;
      const a = o.querySelectorAll(`[data-payload-radio="${i}"]`), l = o.querySelector(`[data-payload-field="${i}"]`);
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${g(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${g(e.label)}
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
      const i = r.find((a) => a.recommended);
      i && (t = i.value);
    }
    if (r.some((i) => i.description))
      return this.renderRadioGroup(e, r, t);
    const o = r.map((i) => {
      const a = i.value === t ? " selected" : "";
      return `<option value="${g(i.value)}"${a}>${g(i.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${e.name}"
              data-payload-field="${e.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${o}
      </select>
    `;
  }
  renderRadioGroup(e, t, r) {
    const n = t.map((i, a) => {
      const l = i.value === r ? " checked" : "", c = i.description ? `<span class="text-xs text-gray-500 block ml-6 mt-0.5">${g(i.description)}</span>` : "";
      return `
          <label class="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${i.recommended ? "bg-blue-50 border border-blue-200" : ""}">
            <input type="radio"
                   name="payload-radio-${e.name}"
                   value="${g(i.value)}"
                   data-payload-radio="${e.name}"
                   class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                   ${l} />
            <span class="flex-1">
              <span class="text-sm font-medium text-gray-900">${g(i.label)}</span>
              ${c}
            </span>
          </label>
        `;
    }).join(""), o = r || "";
    return `
      <div class="space-y-1" data-payload-radio-group="${e.name}">
        <input type="hidden"
               data-payload-field="${e.name}"
               value="${g(o)}" />
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${g(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
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
    const r = this.container?.querySelector(`[data-payload-error="${e}"]`);
    r && (r.textContent = t, r.classList.remove("hidden"));
  }
}
const fs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PayloadInputModal: Dt
}, Symbol.toStringTag, { value: "Module" }));
class It extends Ct {
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
      new It({
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
                Cannot ${g(e)} ${g(t)}
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
    const t = this.localeStates.get(e) || { loading: !1, created: !1 }, r = this.config.missingFieldsByLocale?.[e], n = Array.isArray(r) && r.length > 0, o = this.getLocaleLabel(e), i = t.loading ? "disabled" : "";
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
                  ${r.map((l) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${g(l)}
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
  renderOpenButton(e, t, r = !1) {
    if (r) return "";
    const n = this.config.navigationBasePath, o = t || this.config.recordId, i = new URLSearchParams();
    i.set("locale", e), this.config.environment && i.set("env", this.config.environment);
    const a = `${n}/${o}/edit?${i.toString()}`;
    return `
      <a href="${g(a)}"
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
        const i = o.getAttribute("data-locale");
        i && this.handleCreateTranslation(i);
      });
    });
    const n = this.container?.querySelectorAll("[data-locale-item]");
    n?.forEach((o, i) => {
      o.addEventListener("keydown", (a) => {
        a.key === "ArrowDown" && i < n.length - 1 ? (a.preventDefault(), n[i + 1].querySelector("[data-blocker-action]")?.focus()) : a.key === "ArrowUp" && i > 0 && (a.preventDefault(), n[i - 1].querySelector("[data-blocker-action]")?.focus());
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
        const n = `${this.config.apiEndpoint}/actions/create_translation`, o = await St(n, r);
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
    const o = document.createElement("div");
    o.innerHTML = this.renderLocaleItem(e);
    const i = o.firstElementChild;
    i && (n.replaceChild(i, t), i.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
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
async function fo(s) {
  try {
    await It.showBlocker(s);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = s.transition || "complete action", r = s.missingLocales.join(", "), n = `Cannot ${t}: Missing translations for ${r}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(n) : alert(n);
  }
}
const ps = [
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
class wr {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || ps
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
    const { title: e, orientation: t, size: r, items: n, containerClass: o } = this.config, i = t === "vertical", a = r === "sm", l = i ? "flex-col" : "flex-row flex-wrap", c = a ? "gap-2" : "gap-4", d = a ? "text-xs" : "text-sm", u = a ? "text-sm" : "text-base", h = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${this.escapeHtml(e)}</span>` : "", p = n.map((m) => this.renderItem(m, u, d)).join("");
    return `
      <div class="status-legend inline-flex items-center ${l} ${c} ${o}"
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
function gs(s) {
  const e = new wr(s);
  return e.render(), e;
}
function po() {
  const s = document.querySelectorAll("[data-status-legend]"), e = [];
  return s.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const r = t.dataset.orientation || "horizontal", n = t.dataset.size || "default", o = t.dataset.title || "", i = gs({
      container: t,
      orientation: r,
      size: n,
      title: o
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(i);
  }), e;
}
function go(s = {}) {
  const e = document.createElement("div");
  return new wr({
    container: e,
    ...s
  }).buildHTML();
}
const xr = [
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
class ms {
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
    const { size: e = "default", containerClass: t = "" } = this.config, r = e === "sm" ? "text-xs" : "text-sm", n = e === "sm" ? "px-2 py-1" : "px-3 py-1.5", o = this.config.filters.map((i) => this.renderFilterButton(i, r, n)).join("");
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
  renderFilterButton(e, t, r) {
    const n = this.state.capabilities.get(e.key), o = n?.supported !== !1, i = this.state.activeKey === e.key, a = n?.disabledReason || "Filter not available", l = `inline-flex items-center gap-1 ${r} ${t} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
    let c, d;
    o ? i ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${xt(a)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${xt(e.key)}"
              ${d}
              ${o ? "" : "disabled"}>
        ${u}
        <span>${Mt(e.label)}</span>
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
function bs(s, e, t = {}) {
  return new ms({
    container: s,
    filters: xr,
    onFilterSelect: e,
    ...t
  });
}
function mo(s) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-quick-filters-init"))
      return;
    const n = r.dataset.size || "default", o = bs(
      r,
      (i) => s(i, r),
      { size: n }
    );
    r.setAttribute("data-quick-filters-init", "true"), t.push(o);
  }), t;
}
function bo(s = {}) {
  const {
    filters: e = xr,
    activeKey: t = null,
    capabilities: r = [],
    size: n = "default",
    containerClass: o = ""
  } = s, i = n === "sm" ? "text-xs" : "text-sm", a = n === "sm" ? "px-2 py-1" : "px-3 py-1.5", l = /* @__PURE__ */ new Map();
  for (const d of r)
    l.set(d.key, d);
  const c = e.map((d) => {
    const u = l.get(d.key), h = u?.supported !== !1, p = t === d.key, m = u?.disabledReason || "Filter not available", v = `inline-flex items-center gap-1 ${a} ${i} rounded-full font-medium`;
    let C;
    h ? p ? C = `${d.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500` : C = d.styleClass || "bg-gray-100 text-gray-700" : C = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
    const k = d.icon ? `<span>${d.icon}</span>` : "", E = h ? "" : `title="${xt(m)}"`;
    return `<span class="${v} ${C}" ${E}>${k}<span>${Mt(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-2 flex-wrap ${o}">${c}</div>`;
}
function Mt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function xt(s) {
  return Mt(s);
}
async function ys(s, e, t = {}) {
  const { apiEndpoint: r, notifier: n = new Re(), maxFailuresToShow: o = 5 } = s, i = `${r}/bulk/create-missing-translations`;
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
        const h = JSON.parse(d);
        u = h.error || h.message || u;
      } catch {
        d && (u = d);
      }
      throw new Error(u);
    }
    const l = await a.json(), c = vs(l, o);
    return ws(c, n), s.onSuccess && s.onSuccess(c), c;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw n.error(`Failed to create translations: ${l.message}`), s.onError && s.onError(l), l;
  }
}
function vs(s, e) {
  const t = s.data || [], r = s.created_count ?? t.filter((l) => l.success).length, n = s.failed_count ?? t.filter((l) => !l.success).length, o = s.skipped_count ?? 0, i = s.total ?? t.length, a = t.filter((l) => !l.success && l.error).slice(0, e).map((l) => ({
    id: l.id,
    locale: l.locale,
    error: l.error || "Unknown error"
  }));
  return {
    total: i,
    created: r,
    failed: n,
    skipped: o,
    failures: a
  };
}
function ws(s, e) {
  const { created: t, failed: r, skipped: n, total: o } = s;
  if (o === 0) {
    e.info("No translations to create");
    return;
  }
  r === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${n > 0 ? ` (${n} skipped)` : ""}`) : n > 0 && e.info(`All ${n} translation${n !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${r} translation${r !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${r}${n > 0 ? `, skipped ${n}` : ""}`
  );
}
function yo(s) {
  const { created: e, failed: t, skipped: r, total: n, failures: o } = s, i = `
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
          <td class="px-3 py-2 text-sm text-gray-700">${ht(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${ht(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${ht(c.error)}</td>
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
      ${i}
      ${a}
    </div>
  `;
}
function vo(s) {
  const { created: e, failed: t, skipped: r } = s, n = [];
  return e > 0 && n.push(`<span class="text-green-600">+${e}</span>`), t > 0 && n.push(`<span class="text-red-600">${t} failed</span>`), r > 0 && n.push(`<span class="text-yellow-600">${r} skipped</span>`), n.join(" · ");
}
function wo(s, e, t) {
  return async (r) => ys(
    {
      apiEndpoint: s,
      notifier: e,
      onSuccess: t
    },
    r
  );
}
function ht(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const xs = {
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
function V(s) {
  const e = s.toLowerCase();
  return xs[e] || s.toUpperCase();
}
class tt {
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
    const { locale: e, size: t, mode: r, localeExists: n } = this.config, { loading: o, created: i, error: a } = this.state, l = V(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = r === "button" ? "rounded-lg" : "rounded-full";
    let u, h = "";
    o ? (u = "bg-gray-100 text-gray-600 border-gray-300", h = this.renderSpinner()) : i ? (u = "bg-green-100 text-green-700 border-green-300", h = this.renderCheckIcon()) : a ? (u = "bg-red-100 text-red-700 border-red-300", h = this.renderErrorIcon()) : n ? u = "bg-blue-100 text-blue-700 border-blue-300" : u = "bg-amber-100 text-amber-700 border-amber-300";
    const p = this.renderActions();
    return `
      <div class="inline-flex items-center gap-1.5 ${c} ${d} border ${u}"
           data-locale-action="${g(e)}"
           data-locale-exists="${n}"
           data-loading="${o}"
           data-created="${i}"
           role="group"
           aria-label="${l} translation">
        ${h}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${g(e)}</span>
        <span class="sr-only">${l}</span>
        ${p}
      </div>
    `;
  }
  /**
   * Render action buttons (create/open).
   */
  renderActions() {
    const { locale: e, localeExists: t, size: r } = this.config, { loading: n, created: o } = this.state, i = r === "sm" ? "p-0.5" : "p-1", a = r === "sm" ? "w-3 h-3" : "w-4 h-4", l = [];
    if (!t && !o && !n && l.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${i} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${g(e)}"
                aria-label="Create ${V(e)} translation"
                title="Create ${V(e)} translation">
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
                data-locale="${g(e)}"
                aria-label="Open ${V(e)} translation"
                title="Open ${V(e)} translation">
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
        const t = `${this.config.apiEndpoint}/actions/create_translation`, r = await St(t, e);
        if (r.success) {
          const n = r.data?.id ? String(r.data.id) : void 0;
          this.setState({
            loading: !1,
            created: !0,
            newRecordId: n
          });
          const o = {
            id: n || this.config.recordId,
            locale: this.config.locale,
            status: String(r.data?.status || "draft"),
            translationGroupId: r.data?.translation_group_id ? String(r.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(this.config.locale, o);
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
    const { locale: e, navigationBasePath: t, recordId: r, environment: n } = this.config, { newRecordId: o } = this.state, i = o || r, a = new URLSearchParams();
    a.set("locale", e), n && a.set("env", n);
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
function Sr(s) {
  return new tt(s).render();
}
function xo(s, e) {
  return s.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${s.map((r) => {
    const n = { ...e, locale: r };
    return Sr(n);
  }).join("")}
    </div>
  `;
}
function So(s, e) {
  const t = /* @__PURE__ */ new Map();
  return s.querySelectorAll("[data-locale-action]").forEach((n) => {
    const o = n.getAttribute("data-locale-action");
    if (!o) return;
    const i = n.getAttribute("data-locale-exists") === "true", a = { ...e, locale: o, localeExists: i }, l = new tt(a), c = n.parentElement;
    c && (l.mount(c), t.set(o, l));
  }), t;
}
function Qt(s, e, t, r) {
  const n = new URLSearchParams();
  return n.set("locale", t), r && n.set("env", r), `${s}/${e}/edit?${n.toString()}`;
}
class Pt {
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
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", n = e.resolvedLocale || "default", o = V(r), i = V(n), a = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${g(r)}"
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
                The <strong class="font-medium">${g(o)}</strong> (${g(r.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${g(i)}</strong> (${g(n.toUpperCase())}).
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
    const { context: e, apiEndpoint: t, navigationBasePath: r, panelName: n, environment: o } = this.config, i = e.requestedLocale;
    return !i || !e.recordId ? "" : `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${g(i)}"
              data-record-id="${g(e.recordId)}"
              data-api-endpoint="${g(t)}"
              data-panel="${g(n || "")}"
              data-environment="${g(o || "")}"
              aria-label="Create ${V(i)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${g(i.toUpperCase())} translation
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
    const o = Qt(t, e.recordId, n, r);
    return `
      <a href="${g(o)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${g(n)}"
         aria-label="Open ${V(n)} translation">
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
    e?.addEventListener("click", async (r) => {
      r.preventDefault(), await this.handleCreate();
    }), t?.addEventListener("click", (r) => {
      const n = t.getAttribute("data-locale"), o = t.getAttribute("href");
      n && o && this.config.onOpenSource?.(n, o);
    });
  }
  /**
   * Handle create translation action.
   */
  async handleCreate() {
    const { context: e, apiEndpoint: t, panelName: r, environment: n, navigationBasePath: o } = this.config, i = e.requestedLocale, a = e.recordId;
    if (!i || !a) return;
    await new tt({
      locale: i,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: o,
      panelName: r,
      environment: n,
      localeExists: !1,
      onCreateSuccess: (c, d) => {
        this.config.onCreateSuccess?.(c, d);
        const u = Qt(o, d.id, c, n);
        window.location.href = u;
      },
      onError: (c, d) => {
        this.config.onError?.(d);
      }
    }).handleCreate();
  }
}
function Ss(s, e) {
  if (!e.locked) {
    Cs(s);
    return;
  }
  if (s.classList.add("form-locked", "pointer-events-none", "opacity-75"), s.setAttribute("data-form-locked", "true"), s.setAttribute("data-lock-reason", e.reason || ""), s.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !s.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(s).position === "static" && (s.style.position = "relative"), s.appendChild(r);
  }
}
function Cs(s) {
  s.classList.remove("form-locked", "pointer-events-none", "opacity-75"), s.removeAttribute("data-form-locked"), s.removeAttribute("data-lock-reason"), s.querySelectorAll('[data-was-enabled="true"]').forEach((r) => {
    r.removeAttribute("disabled"), r.removeAttribute("data-was-enabled"), r.removeAttribute("aria-disabled");
  }), s.querySelector("[data-form-lock-overlay]")?.remove();
}
function Co(s) {
  return s.getAttribute("data-form-locked") === "true";
}
function Eo(s) {
  return s.getAttribute("data-lock-reason");
}
function $o(s, e) {
  const t = ie(s);
  return new Pt({ ...e, context: t }).render();
}
function ko(s) {
  const e = ie(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function Lo(s, e) {
  const t = new Pt(e);
  return t.mount(s), t;
}
function Ao(s, e) {
  const t = ie(e), n = new Pt({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return Ss(s, n), n;
}
class Cr {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = U(e), this.actionState = this.extractActionState(e, "create_translation");
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
    const t = this.isCreateActionEnabled(), r = this.getDisabledReason(), n = this.getOverflowCount(), o = e.map(
      (l) => this.renderChip(l, t, r)
    ).join(""), i = n > 0 ? this.renderOverflow(n) : "";
    return `
      <div class="${t ? "inline-flex items-center gap-1.5 flex-wrap" : "inline-flex items-center gap-1.5 flex-wrap opacity-60"}"
           data-inline-locale-chips="true"
           data-record-id="${g(this.config.recordId)}"
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
  renderChip(e, t, r) {
    const { recordId: n, apiEndpoint: o, navigationBasePath: i, panelName: a, environment: l, size: c } = this.config;
    return t ? Sr({
      locale: e,
      recordId: n,
      apiEndpoint: o,
      navigationBasePath: i,
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
    const n = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", o = t || "Translation creation unavailable", i = V(e);
    return `
      <div class="inline-flex items-center gap-1 ${n} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${g(e)}"
           data-disabled="true"
           title="${g(o)}"
           role="listitem"
           aria-label="${i} translation (unavailable)">
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
    const { size: t } = this.config, r = t === "md" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5", n = this.readiness.missingRequiredLocales.join(", ").toUpperCase();
    return `
      <span class="${r} rounded text-gray-500 font-medium"
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
      const r = t.getAttribute("data-locale-action");
      if (!r) return;
      const n = new tt({
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
function Es(s, e) {
  const t = String(s.id || "");
  return t ? new Cr(s, { ...e, recordId: t }).render() : "";
}
function _o(s) {
  const e = U(s);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function Do(s, e, t) {
  const r = String(e.id || ""), n = new Cr(e, { ...t, recordId: r });
  return n.mount(s), n;
}
function Io(s) {
  return (e, t, r) => Es(t, s);
}
function rt() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function Mo() {
  return rt() ? "⌘" : "Ctrl";
}
function $s(s) {
  if (rt())
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
function ks(s) {
  const e = s.modifiers.map($s), t = Ls(s.key);
  return rt() ? [...e, t].join("") : [...e, t].join("+");
}
function Ls(s) {
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
class Er {
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
    const o = rt(), i = new Set(e.modifiers), a = i.has("ctrl"), l = i.has("meta"), c = i.has("alt"), d = i.has("shift");
    return !(a && !(o ? t.metaKey : t.ctrlKey) || l && !o && !t.metaKey || c && !t.altKey || d && !t.shiftKey || !a && !l && (o ? t.metaKey : t.ctrlKey) || !c && t.altKey || !d && t.shiftKey);
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
function As(s) {
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
function Po(s) {
  const e = /* @__PURE__ */ new Map();
  for (const o of s) {
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
  }, r = ["save", "locale", "navigation", "actions", "help", "other"];
  let n = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;
  for (const o of r) {
    const i = e.get(o);
    if (!(!i || i.length === 0)) {
      n += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${t[o]}</h4>
        <dl class="space-y-1">
    `;
      for (const a of i) {
        const l = ks(a);
        n += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${Zt(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${Zt(l)}</kbd>
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
function Zt(s) {
  const e = typeof document < "u" ? document.createElement("div") : null;
  return e ? (e.textContent = s, e.innerHTML) : s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
let ft = null;
function Bo() {
  return ft || (ft = new Er()), ft;
}
function Ro(s, e) {
  const t = new Er(e), r = As(s);
  for (const n of r)
    t.register(n);
  return t.bind(), t;
}
export {
  Pr as ActionRenderer,
  to as AdvancedSearch,
  Qr as CellRendererRegistry,
  $n as ColumnManager,
  Ys as CommonRenderers,
  ps as DEFAULT_STATUS_LEGEND_ITEMS,
  xr as DEFAULT_TRANSLATION_QUICK_FILTERS,
  Un as DataGrid,
  ds as DefaultColumnVisibilityBehavior,
  Pt as FallbackBanner,
  ro as FilterBuilder,
  lo as GoCrudBulkActionBehavior,
  ao as GoCrudExportBehavior,
  so as GoCrudFilterBehavior,
  oo as GoCrudPaginationBehavior,
  no as GoCrudSearchBehavior,
  io as GoCrudSortBehavior,
  Cr as InlineLocaleChips,
  Er as KeyboardShortcutRegistry,
  tt as LocaleActionChip,
  Dt as PayloadInputModal,
  ms as QuickFilters,
  hs as SchemaActionBuilder,
  co as ServerColumnVisibilityBehavior,
  wr as StatusLegend,
  It as TranslationBlockerModal,
  Ss as applyFormLock,
  Qt as buildLocaleEditUrl,
  uo as buildSchemaRowActions,
  Ws as collapseAllGroups,
  wo as createBulkCreateMissingHandler,
  Io as createInlineLocaleChipsRenderer,
  jr as createLocaleBadgeRenderer,
  gs as createStatusLegend,
  Vs as createTranslationMatrixRenderer,
  bs as createTranslationQuickFilters,
  As as createTranslationShortcuts,
  Tt as createTranslationStatusRenderer,
  ys as executeBulkCreateMissing,
  Xs as expandAllGroups,
  In as extractBackendSummaries,
  qo as extractExchangeError,
  ho as extractSchemaActions,
  ie as extractTranslationContext,
  U as extractTranslationReadiness,
  ks as formatShortcutDisplay,
  Fo as generateExchangeReport,
  Bo as getDefaultShortcutRegistry,
  Qs as getExpandedGroupIds,
  Eo as getFormLockReason,
  V as getLocaleLabel,
  Us as getMissingTranslationsCount,
  $s as getModifierSymbol,
  Pn as getPersistedExpandState,
  Rn as getPersistedViewMode,
  Mo as getPrimaryModifierLabel,
  Gn as getViewModeForViewport,
  jo as groupRowResultsByStatus,
  Gs as hasMissingTranslations,
  Ts as hasTranslationContext,
  Os as hasTranslationReadiness,
  Lo as initFallbackBanner,
  Ao as initFormLock,
  Do as initInlineLocaleChips,
  Ro as initKeyboardShortcuts,
  So as initLocaleActionChips,
  mo as initQuickFilters,
  po as initStatusLegends,
  No as isExchangeError,
  Co as isFormLocked,
  Rs as isInFallbackMode,
  rt as isMacPlatform,
  Hn as isNarrowViewport,
  qs as isReadyForTransition,
  Dn as mergeBackendSummaries,
  zo as parseImportResult,
  Bn as persistExpandState,
  Tn as persistViewMode,
  Cs as removeFormLock,
  Rr as renderAvailableLocalesIndicator,
  vo as renderBulkResultInline,
  yo as renderBulkResultSummary,
  $o as renderFallbackBannerFromRecord,
  Ks as renderFallbackWarning,
  jn as renderGroupHeaderRow,
  qn as renderGroupHeaderSummary,
  zn as renderGroupedEmptyState,
  eo as renderGroupedErrorState,
  Zs as renderGroupedLoadingState,
  Es as renderInlineLocaleChips,
  Sr as renderLocaleActionChip,
  xo as renderLocaleActionList,
  rr as renderLocaleBadge,
  zs as renderLocaleCompleteness,
  Hs as renderMissingTranslationsBadge,
  Ns as renderPublishReadinessBadge,
  bo as renderQuickFiltersHTML,
  js as renderReadinessIndicator,
  Po as renderShortcutsHelpContent,
  Fs as renderStatusBadge,
  go as renderStatusLegendHTML,
  qr as renderTranslationMatrixCell,
  Tr as renderTranslationStatusCell,
  ko as shouldShowFallbackBanner,
  _o as shouldShowInlineLocaleChips,
  fo as showTranslationBlocker,
  Js as toggleGroupExpand,
  kn as transformToGroups
};
//# sourceMappingURL=index.js.map

import { F as Oe } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as or, executeActionRequest as kt, isTranslationBlocker as Hr, extractTranslationBlocker as zr, formatStructuredErrorForDisplay as Ur } from "../toast/error-helpers.js";
import { extractExchangeError as Go, generateExchangeReport as Vo, groupRowResultsByStatus as Ko, isExchangeError as Jo, parseImportResult as Yo } from "../toast/error-helpers.js";
import { M as Lt, e as m, T as Nt } from "../chunks/modal-DXPBR0f5.js";
import { b as We, a as Gr } from "../chunks/badge-CqKzZ9y5.js";
import { r as Vr } from "../chunks/icon-renderer-CRbgoQtj.js";
let Kr = class ar extends Lt {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = r;
  }
  static prompt(e) {
    return new Promise((t) => {
      new ar(
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
class Jr {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Oe();
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
          const o = await or(n);
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
    return Kr.prompt({
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
function oe(s) {
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
  return !s || typeof s != "object" || (e.requestedLocale = pe(s, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = pe(s, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = rn(s, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = Ht(s, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = Ht(s, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = pe(s, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = pe(s, ["status"]), e.entityType = pe(s, ["entity_type", "type", "_type"]), e.recordId = pe(s, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function Ei(s) {
  const e = oe(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function $i(s) {
  const e = oe(s);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function G(s) {
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
    typeof n == "string" && Yr(n) && (e.readinessState = n);
    const i = t.ready_for_transition;
    if (i && typeof i == "object" && !Array.isArray(i))
      for (const [o, a] of Object.entries(i))
        typeof a == "boolean" && (e.readyForTransition[o] = a);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function ki(s) {
  return G(s).hasReadinessMetadata;
}
function Li(s, e) {
  return G(s).readyForTransition[e] === !0;
}
function Yr(s) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(s);
}
function lr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : oe(s), { showFallbackIndicator: r = !0, size: n = "default", extraClass: i = "" } = e;
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
function Xr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : oe(s), { maxLocales: r = 3, size: n = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const i = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", o = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, r), l = t.availableLocales.length - r, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${o} rounded bg-blue-100 text-blue-700 font-medium` : `${o} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${o} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${i}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function Wr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : oe(s), { showResolvedLocale: r = !0, size: n = "default" } = e, i = [];
  return r && t.resolvedLocale && i.push(lr(t, { size: n, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && i.push(Xr(t, { ...e, size: n })), i.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${i.join("")}</div>`;
}
function Ai(s, e = "default") {
  if (!s)
    return "";
  const t = s.toLowerCase();
  return We(s, "status", t, { size: e === "sm" ? "sm" : void 0 });
}
function _i(s, e = {}) {
  const t = G(s);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: r = "default", showDetailedTooltip: n = !0, extraClass: i = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${r === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: h, tooltip: f } = Qr(l, t, n);
  return `<span class="${a} ${u} ${h} ${i}"
                title="${f}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function Di(s, e = {}) {
  const t = G(s);
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
function Ii(s, e = {}) {
  const t = G(s);
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
function Ti(s, e = {}) {
  const t = G(s);
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
function Mi(s) {
  const e = G(s);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function Ri(s) {
  return G(s).missingRequiredLocales.length;
}
function Qr(s, e, t) {
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
function Zr(s, e = {}) {
  const { size: t = "sm", maxLocales: r = 5, showLabels: n = !1 } = e, i = G(s);
  if (!i.hasReadinessMetadata)
    return '<span class="text-gray-400">-</span>';
  const { requiredLocales: o, availableLocales: a, missingRequiredFieldsByLocale: l } = i, c = o.length > 0 ? o : a;
  if (c.length === 0)
    return '<span class="text-gray-400">-</span>';
  const d = new Set(a), u = en(l), h = c.slice(0, r).map((g) => {
    const b = d.has(g), C = b && u.has(g), k = b && !C;
    let E, M, _;
    k ? (E = "bg-green-100 text-green-700 border-green-300", M = "●", _ = "Complete") : C ? (E = "bg-amber-100 text-amber-700 border-amber-300", M = "◐", _ = "Incomplete") : (E = "bg-white text-gray-400 border-gray-300 border-dashed", M = "○", _ = "Missing");
    const Y = t === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1", j = n ? `<span class="font-medium">${g.toUpperCase()}</span>` : "";
    return `
        <span class="inline-flex items-center gap-0.5 ${Y} rounded border ${E}"
              title="${g.toUpperCase()}: ${_}"
              aria-label="${g.toUpperCase()}: ${_}"
              data-locale="${g}"
              data-state="${_.toLowerCase()}">
          ${j}
          <span aria-hidden="true">${M}</span>
        </span>
      `;
  }).join(""), f = c.length > r ? `<span class="text-[10px] text-gray-500" title="${c.length - r} more locales">+${c.length - r}</span>` : "";
  return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${h}${f}</div>`;
}
function en(s) {
  const e = /* @__PURE__ */ new Set();
  if (s && typeof s == "object")
    for (const [t, r] of Object.entries(s))
      Array.isArray(r) && r.length > 0 && e.add(t);
  return e;
}
function Pi(s = {}) {
  return (e, t, r) => Zr(t, s);
}
function Bi(s, e = {}) {
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
function jt(s = {}) {
  return (e, t, r) => Wr(t, s);
}
function tn(s = {}) {
  return (e, t, r) => lr(t, s);
}
function pe(s, e) {
  for (const t of e) {
    const r = At(s, t);
    if (typeof r == "string" && r.trim())
      return r;
  }
  return null;
}
function rn(s, e) {
  for (const t of e) {
    const r = At(s, t);
    if (Array.isArray(r))
      return r.filter((n) => typeof n == "string");
  }
  return [];
}
function Ht(s, e) {
  for (const t of e) {
    const r = At(s, t);
    if (typeof r == "boolean")
      return r;
    if (r === "true") return !0;
    if (r === "false") return !1;
  }
  return !1;
}
function At(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
const W = '<span class="text-gray-400">-</span>', nn = [
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
function sn(s) {
  try {
    return JSON.stringify(s);
  } catch {
    return String(s);
  }
}
function on(s) {
  const e = [], t = (n) => {
    if (typeof n != "string") return;
    const i = n.trim();
    !i || e.includes(i) || e.push(i);
  };
  t(s.display_key), t(s.displayKey);
  const r = s.display_keys ?? s.displayKeys;
  return Array.isArray(r) && r.forEach(t), e;
}
function an(s, e) {
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
function ln(s) {
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
function bt(s, e) {
  if (s == null)
    return "";
  if (Array.isArray(s))
    return yt(s, e);
  if (typeof s != "object")
    return String(s);
  const r = [...on(e), ...nn], n = /* @__PURE__ */ new Set();
  for (const i of r) {
    if (n.has(i)) continue;
    n.add(i);
    const o = an(s, i), a = ln(o);
    if (a)
      return a;
  }
  return sn(s);
}
function yt(s, e) {
  if (!Array.isArray(s) || s.length === 0)
    return "";
  const t = s.map((o) => bt(o, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const r = Number(e.preview_limit ?? e.previewLimit ?? 3), n = Number.isFinite(r) && r > 0 ? Math.floor(r) : 3, i = t.slice(0, n);
  return t.length <= n ? i.join(", ") : `${i.join(", ")} +${t.length - n} more`;
}
function cn(s, e, t, r) {
  const n = s[e] ?? s[t] ?? r, i = Number(n);
  return Number.isFinite(i) && i > 0 ? Math.floor(i) : r;
}
function dn(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" || n === "1" : !!n;
}
function un(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : String(n).trim() || r;
}
function hn(s) {
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
function fn(s) {
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
class pn {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return W;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = yt(e, {});
        return t ? Le(t) : W;
      }
      if (typeof e == "object") {
        const t = bt(e, {});
        return t ? Le(t) : W;
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
      return We(String(e), "status", t);
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
      const i = n?.options || {}, o = yt(e, i);
      return o ? Le(o) : W;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null)
        return W;
      const i = n?.options || {}, o = bt(e, i);
      return o ? Le(o) : W;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return W;
      const i = n?.options || {}, o = cn(i, "max_visible", "maxVisible", 3), a = dn(i, "show_count", "showCount", !0), l = un(i, "chip_variant", "chipVariant", "default"), c = i.block_icons_map || i.blockIconsMap || {}, d = [], u = e.slice(0, o);
      for (const g of u) {
        const b = hn(g);
        if (!b) continue;
        const C = c[b] || "view-grid", k = Vr(C, { size: "14px", extraClass: "flex-shrink-0" }), E = fn(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${E}">${k}<span>${Le(b)}</span></span>`
        );
      }
      if (d.length === 0)
        return W;
      const h = e.length - o;
      let f = "";
      return a && h > 0 && (f = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${f}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const Oi = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return We(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return We(String(e), "role", t);
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
  booleanChip: (s) => (e) => Gr(!!e, s),
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
  localeBadge: tn(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: jt(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: jt({ size: "sm", maxLocales: 2 })
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function zt(s, e) {
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
    e % 2 ? zt(Object(t), !0).forEach(function(r) {
      gn(s, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(s, Object.getOwnPropertyDescriptors(t)) : zt(Object(t)).forEach(function(r) {
      Object.defineProperty(s, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return s;
}
function Ge(s) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Ge = function(e) {
    return typeof e;
  } : Ge = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Ge(s);
}
function gn(s, e, t) {
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
function mn(s, e) {
  if (s == null) return {};
  var t = {}, r = Object.keys(s), n, i;
  for (i = 0; i < r.length; i++)
    n = r[i], !(e.indexOf(n) >= 0) && (t[n] = s[n]);
  return t;
}
function bn(s, e) {
  if (s == null) return {};
  var t = mn(s, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(s);
    for (n = 0; n < i.length; n++)
      r = i[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(s, r) && (t[r] = s[r]);
  }
  return t;
}
var yn = "1.15.6";
function Q(s) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(s);
}
var ee = Q(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), Fe = Q(/Edge/i), Ut = Q(/firefox/i), Te = Q(/safari/i) && !Q(/chrome/i) && !Q(/android/i), _t = Q(/iP(ad|od|hone)/i), cr = Q(/chrome/i) && Q(/android/i), dr = {
  capture: !1,
  passive: !1
};
function S(s, e, t) {
  s.addEventListener(e, t, !ee && dr);
}
function x(s, e, t) {
  s.removeEventListener(e, t, !ee && dr);
}
function Qe(s, e) {
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
function ur(s) {
  return s.host && s !== document && s.host.nodeType ? s.host : s.parentNode;
}
function U(s, e, t, r) {
  if (s) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? s.parentNode === t && Qe(s, e) : Qe(s, e)) || r && s === t)
        return s;
      if (s === t) break;
    } while (s = ur(s));
  }
  return null;
}
var Gt = /\s+/g;
function q(s, e, t) {
  if (s && e)
    if (s.classList)
      s.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + s.className + " ").replace(Gt, " ").replace(" " + e + " ", " ");
      s.className = (r + (t ? " " + e : "")).replace(Gt, " ");
    }
}
function y(s, e, t) {
  var r = s && s.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(s, "") : s.currentStyle && (t = s.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function ve(s, e) {
  var t = "";
  if (typeof s == "string")
    t = s;
  else
    do {
      var r = y(s, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (s = s.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function hr(s, e, t) {
  if (s) {
    var r = s.getElementsByTagName(e), n = 0, i = r.length;
    if (t)
      for (; n < i; n++)
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
    var i, o, a, l, c, d, u;
    if (s !== window && s.parentNode && s !== K() ? (i = s.getBoundingClientRect(), o = i.top, a = i.left, l = i.bottom, c = i.right, d = i.height, u = i.width) : (o = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && s !== window && (n = n || s.parentNode, !ee))
      do
        if (n && n.getBoundingClientRect && (y(n, "transform") !== "none" || t && y(n, "position") !== "static")) {
          var h = n.getBoundingClientRect();
          o -= h.top + parseInt(y(n, "border-top-width")), a -= h.left + parseInt(y(n, "border-left-width")), l = o + i.height, c = a + i.width;
          break;
        }
      while (n = n.parentNode);
    if (r && s !== window) {
      var f = ve(n || s), g = f && f.a, b = f && f.d;
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
function Vt(s, e, t) {
  for (var r = ie(s, !0), n = I(s)[e]; r; ) {
    var i = I(r)[t], o = void 0;
    if (o = n >= i, !o) return r;
    if (r === K()) break;
    r = ie(r, !1);
  }
  return !1;
}
function xe(s, e, t, r) {
  for (var n = 0, i = 0, o = s.children; i < o.length; ) {
    if (o[i].style.display !== "none" && o[i] !== v.ghost && (r || o[i] !== v.dragged) && U(o[i], t.draggable, s, !1)) {
      if (n === e)
        return o[i];
      n++;
    }
    i++;
  }
  return null;
}
function Dt(s, e) {
  for (var t = s.lastElementChild; t && (t === v.ghost || y(t, "display") === "none" || e && !Qe(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function H(s, e) {
  var t = 0;
  if (!s || !s.parentNode)
    return -1;
  for (; s = s.previousElementSibling; )
    s.nodeName.toUpperCase() !== "TEMPLATE" && s !== v.clone && (!e || Qe(s, e)) && t++;
  return t;
}
function Kt(s) {
  var e = 0, t = 0, r = K();
  if (s)
    do {
      var n = ve(s), i = n.a, o = n.d;
      e += s.scrollLeft * i, t += s.scrollTop * o;
    } while (s !== r && (s = s.parentNode));
  return [e, t];
}
function vn(s, e) {
  for (var t in s)
    if (s.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === s[t][r]) return Number(t);
    }
  return -1;
}
function ie(s, e) {
  if (!s || !s.getBoundingClientRect) return K();
  var t = s, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var n = y(t);
      if (t.clientWidth < t.scrollWidth && (n.overflowX == "auto" || n.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (n.overflowY == "auto" || n.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return K();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return K();
}
function wn(s, e) {
  if (s && e)
    for (var t in e)
      e.hasOwnProperty(t) && (s[t] = e[t]);
  return s;
}
function ot(s, e) {
  return Math.round(s.top) === Math.round(e.top) && Math.round(s.left) === Math.round(e.left) && Math.round(s.height) === Math.round(e.height) && Math.round(s.width) === Math.round(e.width);
}
var Me;
function fr(s, e) {
  return function() {
    if (!Me) {
      var t = arguments, r = this;
      t.length === 1 ? s.call(r, t[0]) : s.apply(r, t), Me = setTimeout(function() {
        Me = void 0;
      }, e);
    }
  };
}
function xn() {
  clearTimeout(Me), Me = void 0;
}
function pr(s, e, t) {
  s.scrollLeft += e, s.scrollTop += t;
}
function gr(s) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(s).cloneNode(!0) : t ? t(s).clone(!0)[0] : s.cloneNode(!0);
}
function mr(s, e, t) {
  var r = {};
  return Array.from(s.children).forEach(function(n) {
    var i, o, a, l;
    if (!(!U(n, e.draggable, s, !1) || n.animated || n === t)) {
      var c = I(n);
      r.left = Math.min((i = r.left) !== null && i !== void 0 ? i : 1 / 0, c.left), r.top = Math.min((o = r.top) !== null && o !== void 0 ? o : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var O = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function Sn() {
  var s = [], e;
  return {
    captureAnimationState: function() {
      if (s = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(y(n, "display") === "none" || n === v.ghost)) {
            s.push({
              target: n,
              rect: I(n)
            });
            var i = J({}, s[s.length - 1].rect);
            if (n.thisAnimationDuration) {
              var o = ve(n, !0);
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
      s.splice(vn(s, {
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
        var l = 0, c = a.target, d = c.fromRect, u = I(c), h = c.prevFromRect, f = c.prevToRect, g = a.rect, b = ve(c, !0);
        b && (u.top -= b.f, u.left -= b.e), c.toRect = u, c.thisAnimationDuration && ot(h, u) && !ot(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (g.top - u.top) / (g.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = En(g, h, f, n.options)), ot(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, g, u, l)), l && (i = !0, o = Math.max(o, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), i ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, o) : typeof r == "function" && r(), s = [];
    },
    animate: function(r, n, i, o) {
      if (o) {
        y(r, "transition", ""), y(r, "transform", "");
        var a = ve(this.el), l = a && a.a, c = a && a.d, d = (n.left - i.left) / (l || 1), u = (n.top - i.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, y(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = Cn(r), y(r, "transition", "transform " + o + "ms" + (this.options.easing ? " " + this.options.easing : "")), y(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          y(r, "transition", ""), y(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, o);
      }
    }
  };
}
function Cn(s) {
  return s.offsetWidth;
}
function En(s, e, t, r) {
  return Math.sqrt(Math.pow(e.top - s.top, 2) + Math.pow(e.left - s.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var ge = [], at = {
  initializeByDefault: !0
}, qe = {
  mount: function(e) {
    for (var t in at)
      at.hasOwnProperty(t) && !(t in e) && (e[t] = at[t]);
    ge.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), ge.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var i = e + "Global";
    ge.forEach(function(o) {
      t[o.pluginName] && (t[o.pluginName][i] && t[o.pluginName][i](J({
        sortable: t
      }, r)), t.options[o.pluginName] && t[o.pluginName][e] && t[o.pluginName][e](J({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    ge.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, Z(r, c.defaults);
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
    return ge.forEach(function(n) {
      typeof n.eventProperties == "function" && Z(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return ge.forEach(function(i) {
      e[i.pluginName] && i.optionListeners && typeof i.optionListeners[t] == "function" && (n = i.optionListeners[t].call(e[i.pluginName], r));
    }), n;
  }
};
function $n(s) {
  var e = s.sortable, t = s.rootEl, r = s.name, n = s.targetEl, i = s.cloneEl, o = s.toEl, a = s.fromEl, l = s.oldIndex, c = s.newIndex, d = s.oldDraggableIndex, u = s.newDraggableIndex, h = s.originalEvent, f = s.putSortable, g = s.extraEventProperties;
  if (e = e || t && t[O], !!e) {
    var b, C = e.options, k = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !ee && !Fe ? b = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (b = document.createEvent("Event"), b.initEvent(r, !0, !0)), b.to = o || t, b.from = a || t, b.item = n || t, b.clone = i, b.oldIndex = l, b.newIndex = c, b.oldDraggableIndex = d, b.newDraggableIndex = u, b.originalEvent = h, b.pullMode = f ? f.lastPutMode : void 0;
    var E = J(J({}, g), qe.getEventProperties(r, e));
    for (var M in E)
      b[M] = E[M];
    t && t.dispatchEvent(b), C[k] && C[k].call(e, b);
  }
}
var kn = ["evt"], B = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, i = bn(r, kn);
  qe.pluginEvent.bind(v)(e, t, J({
    dragEl: p,
    parentEl: A,
    ghostEl: w,
    rootEl: $,
    nextEl: he,
    lastDownEl: Ve,
    cloneEl: L,
    cloneHidden: se,
    dragStarted: Ae,
    putSortable: T,
    activeSortable: v.active,
    originalEvent: n,
    oldIndex: ye,
    oldDraggableIndex: Re,
    newIndex: N,
    newDraggableIndex: ne,
    hideGhostForTarget: wr,
    unhideGhostForTarget: xr,
    cloneNowHidden: function() {
      se = !0;
    },
    cloneNowShown: function() {
      se = !1;
    },
    dispatchSortableEvent: function(a) {
      P({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, i));
};
function P(s) {
  $n(J({
    putSortable: T,
    cloneEl: L,
    targetEl: p,
    rootEl: $,
    oldIndex: ye,
    oldDraggableIndex: Re,
    newIndex: N,
    newDraggableIndex: ne
  }, s));
}
var p, A, w, $, he, Ve, L, se, ye, N, Re, ne, je, T, be = !1, Ze = !1, et = [], ce, z, lt, ct, Jt, Yt, Ae, me, Pe, Be = !1, He = !1, Ke, R, dt = [], vt = !1, tt = [], nt = typeof document < "u", ze = _t, Xt = Fe || ee ? "cssFloat" : "float", Ln = nt && !cr && !_t && "draggable" in document.createElement("div"), br = function() {
  if (nt) {
    if (ee)
      return !1;
    var s = document.createElement("x");
    return s.style.cssText = "pointer-events:auto", s.style.pointerEvents === "auto";
  }
}(), yr = function(e, t) {
  var r = y(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), i = xe(e, 0, t), o = xe(e, 1, t), a = i && y(i), l = o && y(o), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + I(i).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + I(o).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (i && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return o && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return i && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[Xt] === "none" || o && r[Xt] === "none" && c + d > n) ? "vertical" : "horizontal";
}, An = function(e, t, r) {
  var n = r ? e.left : e.top, i = r ? e.right : e.bottom, o = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || i === l || n + o / 2 === a + c / 2;
}, _n = function(e, t) {
  var r;
  return et.some(function(n) {
    var i = n[O].options.emptyInsertThreshold;
    if (!(!i || Dt(n))) {
      var o = I(n), a = e >= o.left - i && e <= o.right + i, l = t >= o.top - i && t <= o.bottom + i;
      if (a && l)
        return r = n;
    }
  }), r;
}, vr = function(e) {
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
  (!n || Ge(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, wr = function() {
  !br && w && y(w, "display", "none");
}, xr = function() {
  !br && w && y(w, "display", "");
};
nt && !cr && document.addEventListener("click", function(s) {
  if (Ze)
    return s.preventDefault(), s.stopPropagation && s.stopPropagation(), s.stopImmediatePropagation && s.stopImmediatePropagation(), Ze = !1, !1;
}, !0);
var de = function(e) {
  if (p) {
    e = e.touches ? e.touches[0] : e;
    var t = _n(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[O]._onDragOver(r);
    }
  }
}, Dn = function(e) {
  p && p.parentNode[O]._isOutsideThisEl(e.target);
};
function v(s, e) {
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
      return yr(s, this.options);
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
    supportPointer: v.supportPointer !== !1 && "PointerEvent" in window && (!Te || _t),
    emptyInsertThreshold: 5
  };
  qe.initializePlugins(this, s, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  vr(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : Ln, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? S(s, "pointerdown", this._onTapStart) : (S(s, "mousedown", this._onTapStart), S(s, "touchstart", this._onTapStart)), this.nativeDraggable && (S(s, "dragover", this), S(s, "dragenter", this)), et.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), Z(this, Sn());
}
v.prototype = /** @lends Sortable.prototype */
{
  constructor: v,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (me = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, p) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, i = n.preventOnFilter, o = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (Fn(r), !p && !(/mousedown|pointerdown/.test(o) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Te && l && l.tagName.toUpperCase() === "SELECT") && (l = U(l, n.draggable, r, !1), !(l && l.animated) && Ve !== l)) {
        if (ye = H(l), Re = H(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            P({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), B("filter", t, {
              evt: e
            }), i && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = U(c, u.trim(), r, !1), u)
            return P({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), B("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          i && e.preventDefault();
          return;
        }
        n.handle && !U(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, i = n.el, o = n.options, a = i.ownerDocument, l;
    if (r && !p && r.parentNode === i) {
      var c = I(r);
      if ($ = i, p = r, A = p.parentNode, he = p.nextSibling, Ve = r, je = o.group, v.dragged = p, ce = {
        target: p,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, Jt = ce.clientX - c.left, Yt = ce.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, p.style["will-change"] = "all", l = function() {
        if (B("delayEnded", n, {
          evt: e
        }), v.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !Ut && n.nativeDraggable && (p.draggable = !0), n._triggerDragStart(e, t), P({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), q(p, o.chosenClass, !0);
      }, o.ignore.split(",").forEach(function(d) {
        hr(p, d.trim(), ut);
      }), S(a, "dragover", de), S(a, "mousemove", de), S(a, "touchmove", de), o.supportPointer ? (S(a, "pointerup", n._onDrop), !this.nativeDraggable && S(a, "pointercancel", n._onDrop)) : (S(a, "mouseup", n._onDrop), S(a, "touchend", n._onDrop), S(a, "touchcancel", n._onDrop)), Ut && this.nativeDraggable && (this.options.touchStartThreshold = 4, p.draggable = !0), B("delayStart", this, {
        evt: e
      }), o.delay && (!o.delayOnTouchOnly || t) && (!this.nativeDraggable || !(Fe || ee))) {
        if (v.eventCanceled) {
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
    p && ut(p), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    x(e, "mouseup", this._disableDelayedDrag), x(e, "touchend", this._disableDelayedDrag), x(e, "touchcancel", this._disableDelayedDrag), x(e, "pointerup", this._disableDelayedDrag), x(e, "pointercancel", this._disableDelayedDrag), x(e, "mousemove", this._delayedDragTouchMoveHandler), x(e, "touchmove", this._delayedDragTouchMoveHandler), x(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? S(document, "pointermove", this._onTouchMove) : t ? S(document, "touchmove", this._onTouchMove) : S(document, "mousemove", this._onTouchMove) : (S(p, "dragend", this), S($, "dragstart", this._onDragStart));
    try {
      document.selection ? Je(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (be = !1, $ && p) {
      B("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && S(document, "dragover", Dn);
      var r = this.options;
      !e && q(p, r.dragClass, !1), q(p, r.ghostClass, !0), v.active = this, e && this._appendGhost(), P({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (z) {
      this._lastX = z.clientX, this._lastY = z.clientY, wr();
      for (var e = document.elementFromPoint(z.clientX, z.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(z.clientX, z.clientY), e !== t); )
        t = e;
      if (p.parentNode[O]._isOutsideThisEl(e), t)
        do {
          if (t[O]) {
            var r = void 0;
            if (r = t[O]._onDragOver({
              clientX: z.clientX,
              clientY: z.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = ur(t));
      xr();
    }
  },
  _onTouchMove: function(e) {
    if (ce) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, i = e.touches ? e.touches[0] : e, o = w && ve(w, !0), a = w && o && o.a, l = w && o && o.d, c = ze && R && Kt(R), d = (i.clientX - ce.clientX + n.x) / (a || 1) + (c ? c[0] - dt[0] : 0) / (a || 1), u = (i.clientY - ce.clientY + n.y) / (l || 1) + (c ? c[1] - dt[1] : 0) / (l || 1);
      if (!v.active && !be) {
        if (r && Math.max(Math.abs(i.clientX - this._lastX), Math.abs(i.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (w) {
        o ? (o.e += d - (lt || 0), o.f += u - (ct || 0)) : o = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var h = "matrix(".concat(o.a, ",").concat(o.b, ",").concat(o.c, ",").concat(o.d, ",").concat(o.e, ",").concat(o.f, ")");
        y(w, "webkitTransform", h), y(w, "mozTransform", h), y(w, "msTransform", h), y(w, "transform", h), lt = d, ct = u, z = i;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!w) {
      var e = this.options.fallbackOnBody ? document.body : $, t = I(p, !0, ze, !0, e), r = this.options;
      if (ze) {
        for (R = e; y(R, "position") === "static" && y(R, "transform") === "none" && R !== document; )
          R = R.parentNode;
        R !== document.body && R !== document.documentElement ? (R === document && (R = K()), t.top += R.scrollTop, t.left += R.scrollLeft) : R = K(), dt = Kt(R);
      }
      w = p.cloneNode(!0), q(w, r.ghostClass, !1), q(w, r.fallbackClass, !0), q(w, r.dragClass, !0), y(w, "transition", ""), y(w, "transform", ""), y(w, "box-sizing", "border-box"), y(w, "margin", 0), y(w, "top", t.top), y(w, "left", t.left), y(w, "width", t.width), y(w, "height", t.height), y(w, "opacity", "0.8"), y(w, "position", ze ? "absolute" : "fixed"), y(w, "zIndex", "100000"), y(w, "pointerEvents", "none"), v.ghost = w, e.appendChild(w), y(w, "transform-origin", Jt / parseInt(w.style.width) * 100 + "% " + Yt / parseInt(w.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, i = r.options;
    if (B("dragStart", this, {
      evt: e
    }), v.eventCanceled) {
      this._onDrop();
      return;
    }
    B("setupClone", this), v.eventCanceled || (L = gr(p), L.removeAttribute("id"), L.draggable = !1, L.style["will-change"] = "", this._hideClone(), q(L, this.options.chosenClass, !1), v.clone = L), r.cloneId = Je(function() {
      B("clone", r), !v.eventCanceled && (r.options.removeCloneOnHide || $.insertBefore(L, p), r._hideClone(), P({
        sortable: r,
        name: "clone"
      }));
    }), !t && q(p, i.dragClass, !0), t ? (Ze = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (x(document, "mouseup", r._onDrop), x(document, "touchend", r._onDrop), x(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", i.setData && i.setData.call(r, n, p)), S(document, "drop", r), y(p, "transform", "translateZ(0)")), be = !0, r._dragStartId = Je(r._dragStarted.bind(r, t, e)), S(document, "selectstart", r), Ae = !0, window.getSelection().removeAllRanges(), Te && y(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, i, o, a = this.options, l = a.group, c = v.active, d = je === l, u = a.sort, h = T || c, f, g = this, b = !1;
    if (vt) return;
    function C(ke, Nr) {
      B(ke, g, J({
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
        onMove: function(qt, jr) {
          return Ue($, t, p, n, qt, I(qt), e, jr);
        },
        changed: M
      }, Nr));
    }
    function k() {
      C("dragOverAnimationCapture"), g.captureAnimationState(), g !== h && h.captureAnimationState();
    }
    function E(ke) {
      return C("dragOverCompleted", {
        insertion: ke
      }), ke && (d ? c._hideClone() : c._showClone(g), g !== h && (q(p, T ? T.options.ghostClass : c.options.ghostClass, !1), q(p, a.ghostClass, !0)), T !== g && g !== v.active ? T = g : g === v.active && T && (T = null), h === g && (g._ignoreWhileAnimating = r), g.animateAll(function() {
        C("dragOverAnimationComplete"), g._ignoreWhileAnimating = null;
      }), g !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (r === p && !p.animated || r === t && !r.animated) && (me = null), !a.dragoverBubble && !e.rootEl && r !== document && (p.parentNode[O]._isOutsideThisEl(e.target), !ke && de(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), b = !0;
    }
    function M() {
      N = H(p), ne = H(p, a.draggable), P({
        sortable: g,
        name: "change",
        toEl: t,
        newIndex: N,
        newDraggableIndex: ne,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = U(r, a.draggable, t, !0), C("dragOver"), v.eventCanceled) return b;
    if (p.contains(e.target) || r.animated && r.animatingX && r.animatingY || g._ignoreWhileAnimating === r)
      return E(!1);
    if (Ze = !1, c && !a.disabled && (d ? u || (o = A !== $) : T === this || (this.lastPutMode = je.checkPull(this, c, p, e)) && l.checkPut(this, c, p, e))) {
      if (f = this._getDirection(e, r) === "vertical", n = I(p), C("dragOverValid"), v.eventCanceled) return b;
      if (o)
        return A = $, k(), this._hideClone(), C("revert"), v.eventCanceled || (he ? $.insertBefore(p, he) : $.appendChild(p)), E(!0);
      var _ = Dt(t, a.draggable);
      if (!_ || Rn(e, f, this) && !_.animated) {
        if (_ === p)
          return E(!1);
        if (_ && t === e.target && (r = _), r && (i = I(r)), Ue($, t, p, n, r, i, e, !!r) !== !1)
          return k(), _ && _.nextSibling ? t.insertBefore(p, _.nextSibling) : t.appendChild(p), A = t, M(), E(!0);
      } else if (_ && Mn(e, f, this)) {
        var Y = xe(t, 0, a, !0);
        if (Y === p)
          return E(!1);
        if (r = Y, i = I(r), Ue($, t, p, n, r, i, e, !1) !== !1)
          return k(), t.insertBefore(p, Y), A = t, M(), E(!0);
      } else if (r.parentNode === t) {
        i = I(r);
        var j = 0, ae, Se = p.parentNode !== t, F = !An(p.animated && p.toRect || n, r.animated && r.toRect || i, f), Ce = f ? "top" : "left", te = Vt(r, "top", "top") || Vt(p, "top", "top"), Ee = te ? te.scrollTop : void 0;
        me !== r && (ae = i[Ce], Be = !1, He = !F && a.invertSwap || Se), j = Pn(e, r, i, f, F ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, He, me === r);
        var X;
        if (j !== 0) {
          var le = H(p);
          do
            le -= j, X = A.children[le];
          while (X && (y(X, "display") === "none" || X === w));
        }
        if (j === 0 || X === r)
          return E(!1);
        me = r, Pe = j;
        var $e = r.nextElementSibling, re = !1;
        re = j === 1;
        var Ne = Ue($, t, p, n, r, i, e, re);
        if (Ne !== !1)
          return (Ne === 1 || Ne === -1) && (re = Ne === 1), vt = !0, setTimeout(Tn, 30), k(), re && !$e ? t.appendChild(p) : r.parentNode.insertBefore(p, re ? $e : r), te && pr(te, 0, Ee - te.scrollTop), A = p.parentNode, ae !== void 0 && !He && (Ke = Math.abs(ae - I(r)[Ce])), M(), E(!0);
      }
      if (t.contains(p))
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
    if (N = H(p), ne = H(p, r.draggable), B("drop", this, {
      evt: e
    }), A = p && p.parentNode, N = H(p), ne = H(p, r.draggable), v.eventCanceled) {
      this._nulling();
      return;
    }
    be = !1, He = !1, Be = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), wt(this.cloneId), wt(this._dragStartId), this.nativeDraggable && (x(document, "drop", this), x(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Te && y(document.body, "user-select", ""), y(p, "transform", ""), e && (Ae && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), w && w.parentNode && w.parentNode.removeChild(w), ($ === A || T && T.lastPutMode !== "clone") && L && L.parentNode && L.parentNode.removeChild(L), p && (this.nativeDraggable && x(p, "dragend", this), ut(p), p.style["will-change"] = "", Ae && !be && q(p, T ? T.options.ghostClass : this.options.ghostClass, !1), q(p, this.options.chosenClass, !1), P({
      sortable: this,
      name: "unchoose",
      toEl: A,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), $ !== A ? (N >= 0 && (P({
      rootEl: A,
      name: "add",
      toEl: A,
      fromEl: $,
      originalEvent: e
    }), P({
      sortable: this,
      name: "remove",
      toEl: A,
      originalEvent: e
    }), P({
      rootEl: A,
      name: "sort",
      toEl: A,
      fromEl: $,
      originalEvent: e
    }), P({
      sortable: this,
      name: "sort",
      toEl: A,
      originalEvent: e
    })), T && T.save()) : N !== ye && N >= 0 && (P({
      sortable: this,
      name: "update",
      toEl: A,
      originalEvent: e
    }), P({
      sortable: this,
      name: "sort",
      toEl: A,
      originalEvent: e
    })), v.active && ((N == null || N === -1) && (N = ye, ne = Re), P({
      sortable: this,
      name: "end",
      toEl: A,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    B("nulling", this), $ = p = A = w = he = L = Ve = se = ce = z = Ae = N = ne = ye = Re = me = Pe = T = je = v.dragged = v.ghost = v.clone = v.active = null, tt.forEach(function(e) {
      e.checked = !0;
    }), tt.length = lt = ct = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        p && (this._onDragOver(e), In(e));
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
      t = r[n], U(t, o.draggable, this.el, !1) && e.push(t.getAttribute(o.dataIdAttr) || On(t));
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
      U(a, this.options.draggable, n, !1) && (r[i] = a);
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
    return U(e, t || this.options.draggable, this.el, !1);
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
    var n = qe.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && vr(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    B("destroy", this);
    var e = this.el;
    e[O] = null, x(e, "mousedown", this._onTapStart), x(e, "touchstart", this._onTapStart), x(e, "pointerdown", this._onTapStart), this.nativeDraggable && (x(e, "dragover", this), x(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), et.splice(et.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!se) {
      if (B("hideClone", this), v.eventCanceled) return;
      y(L, "display", "none"), this.options.removeCloneOnHide && L.parentNode && L.parentNode.removeChild(L), se = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (se) {
      if (B("showClone", this), v.eventCanceled) return;
      p.parentNode == $ && !this.options.group.revertClone ? $.insertBefore(L, p) : he ? $.insertBefore(L, he) : $.appendChild(L), this.options.group.revertClone && this.animate(p, L), y(L, "display", ""), se = !1;
    }
  }
};
function In(s) {
  s.dataTransfer && (s.dataTransfer.dropEffect = "move"), s.cancelable && s.preventDefault();
}
function Ue(s, e, t, r, n, i, o, a) {
  var l, c = s[O], d = c.options.onMove, u;
  return window.CustomEvent && !ee && !Fe ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = s, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = i || I(e), l.willInsertAfter = a, l.originalEvent = o, s.dispatchEvent(l), d && (u = d.call(c, l, o)), u;
}
function ut(s) {
  s.draggable = !1;
}
function Tn() {
  vt = !1;
}
function Mn(s, e, t) {
  var r = I(xe(t.el, 0, t.options, !0)), n = mr(t.el, t.options, w), i = 10;
  return e ? s.clientX < n.left - i || s.clientY < r.top && s.clientX < r.right : s.clientY < n.top - i || s.clientY < r.bottom && s.clientX < r.left;
}
function Rn(s, e, t) {
  var r = I(Dt(t.el, t.options.draggable)), n = mr(t.el, t.options, w), i = 10;
  return e ? s.clientX > n.right + i || s.clientY > r.bottom && s.clientX > r.left : s.clientY > n.bottom + i || s.clientX > r.right && s.clientY > r.top;
}
function Pn(s, e, t, r, n, i, o, a) {
  var l = r ? s.clientY : s.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, h = !1;
  if (!o) {
    if (a && Ke < c * n) {
      if (!Be && (Pe === 1 ? l > d + c * i / 2 : l < u - c * i / 2) && (Be = !0), Be)
        h = !0;
      else if (Pe === 1 ? l < d + Ke : l > u - Ke)
        return -Pe;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return Bn(e);
  }
  return h = h || o, h && (l < d + c * i / 2 || l > u - c * i / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function Bn(s) {
  return H(p) < H(s) ? 1 : -1;
}
function On(s) {
  for (var e = s.tagName + s.className + s.src + s.href + s.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function Fn(s) {
  tt.length = 0;
  for (var e = s.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && tt.push(r);
  }
}
function Je(s) {
  return setTimeout(s, 0);
}
function wt(s) {
  return clearTimeout(s);
}
nt && S(document, "touchmove", function(s) {
  (v.active || be) && s.cancelable && s.preventDefault();
});
v.utils = {
  on: S,
  off: x,
  css: y,
  find: hr,
  is: function(e, t) {
    return !!U(e, t, e, !1);
  },
  extend: wn,
  throttle: fr,
  closest: U,
  toggleClass: q,
  clone: gr,
  index: H,
  nextTick: Je,
  cancelNextTick: wt,
  detectDirection: yr,
  getChild: xe,
  expando: O
};
v.get = function(s) {
  return s[O];
};
v.mount = function() {
  for (var s = arguments.length, e = new Array(s), t = 0; t < s; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (v.utils = J(J({}, v.utils), r.utils)), qe.mount(r);
  });
};
v.create = function(s, e) {
  return new v(s, e);
};
v.version = yn;
var D = [], _e, xt, St = !1, ht, ft, rt, De;
function qn() {
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
      this.sortable.nativeDraggable ? x(document, "dragover", this._handleAutoScroll) : (x(document, "pointermove", this._handleFallbackAutoScroll), x(document, "touchmove", this._handleFallbackAutoScroll), x(document, "mousemove", this._handleFallbackAutoScroll)), Wt(), Ye(), xn();
    },
    nulling: function() {
      rt = xt = _e = St = De = ht = ft = null, D.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, i = (t.touches ? t.touches[0] : t).clientX, o = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(i, o);
      if (rt = t, r || this.options.forceAutoScrollFallback || Fe || ee || Te) {
        pt(t, this.options, a, r);
        var l = ie(a, !0);
        St && (!De || i !== ht || o !== ft) && (De && Wt(), De = setInterval(function() {
          var c = ie(document.elementFromPoint(i, o), !0);
          c !== l && (l = c, Ye()), pt(t, n.options, c, r);
        }, 10), ht = i, ft = o);
      } else {
        if (!this.options.bubbleScroll || ie(a, !0) === K()) {
          Ye();
          return;
        }
        pt(t, this.options, ie(a, !1), !1);
      }
    }
  }, Z(s, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Ye() {
  D.forEach(function(s) {
    clearInterval(s.pid);
  }), D = [];
}
function Wt() {
  clearInterval(De);
}
var pt = fr(function(s, e, t, r) {
  if (e.scroll) {
    var n = (s.touches ? s.touches[0] : s).clientX, i = (s.touches ? s.touches[0] : s).clientY, o = e.scrollSensitivity, a = e.scrollSpeed, l = K(), c = !1, d;
    xt !== t && (xt = t, Ye(), _e = e.scroll, d = e.scrollFn, _e === !0 && (_e = ie(t, !0)));
    var u = 0, h = _e;
    do {
      var f = h, g = I(f), b = g.top, C = g.bottom, k = g.left, E = g.right, M = g.width, _ = g.height, Y = void 0, j = void 0, ae = f.scrollWidth, Se = f.scrollHeight, F = y(f), Ce = f.scrollLeft, te = f.scrollTop;
      f === l ? (Y = M < ae && (F.overflowX === "auto" || F.overflowX === "scroll" || F.overflowX === "visible"), j = _ < Se && (F.overflowY === "auto" || F.overflowY === "scroll" || F.overflowY === "visible")) : (Y = M < ae && (F.overflowX === "auto" || F.overflowX === "scroll"), j = _ < Se && (F.overflowY === "auto" || F.overflowY === "scroll"));
      var Ee = Y && (Math.abs(E - n) <= o && Ce + M < ae) - (Math.abs(k - n) <= o && !!Ce), X = j && (Math.abs(C - i) <= o && te + _ < Se) - (Math.abs(b - i) <= o && !!te);
      if (!D[u])
        for (var le = 0; le <= u; le++)
          D[le] || (D[le] = {});
      (D[u].vx != Ee || D[u].vy != X || D[u].el !== f) && (D[u].el = f, D[u].vx = Ee, D[u].vy = X, clearInterval(D[u].pid), (Ee != 0 || X != 0) && (c = !0, D[u].pid = setInterval(function() {
        r && this.layer === 0 && v.active._onTouchMove(rt);
        var $e = D[this.layer].vy ? D[this.layer].vy * a : 0, re = D[this.layer].vx ? D[this.layer].vx * a : 0;
        typeof d == "function" && d.call(v.dragged.parentNode[O], re, $e, s, rt, D[this.layer].el) !== "continue" || pr(D[this.layer].el, re, $e);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && h !== l && (h = ie(h, !1)));
    St = c;
  }
}, 30), Sr = function(e) {
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
function It() {
}
It.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = xe(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: Sr
};
Z(It, {
  pluginName: "revertOnSpill"
});
function Tt() {
}
Tt.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: Sr
};
Z(Tt, {
  pluginName: "removeOnSpill"
});
v.mount(new qn());
v.mount(Tt, It);
class Nn {
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
    this.sortable = v.create(e, {
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
function jn(s, e = {}) {
  const {
    groupByField: t = "translation_group_id",
    defaultExpanded: r = !0,
    expandedGroups: n = /* @__PURE__ */ new Set()
  } = e, i = /* @__PURE__ */ new Map(), o = [];
  for (const l of s) {
    const c = Hn(l, t);
    if (c) {
      const d = i.get(c);
      d ? d.push(l) : i.set(c, [l]);
    } else
      o.push(l);
  }
  const a = [];
  for (const [l, c] of i) {
    const d = Un(c), u = n.has(l) || n.size === 0 && r;
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
function Hn(s, e) {
  const t = s[e];
  if (typeof t == "string" && t.trim())
    return t;
  const r = [
    `translation.meta.${e}`,
    `content_translation.meta.${e}`
  ];
  for (const n of r) {
    const i = zn(s, n);
    if (typeof i == "string" && i.trim())
      return i;
  }
  return null;
}
function zn(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
function Un(s) {
  const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
  let r = !1, n = 0;
  for (const o of s) {
    const a = o.translation_readiness;
    if (a) {
      const c = a.available_locales, d = a.missing_required_locales, u = a.readiness_state;
      Array.isArray(c) && c.filter(we).forEach((h) => e.add(h)), Array.isArray(d) && d.filter(we).forEach((h) => t.add(h)), (u === "missing_fields" || u === "missing_locales_and_fields") && (r = !0), u === "ready" && n++;
    }
    const l = o.available_locales;
    Array.isArray(l) && l.filter(we).forEach((c) => e.add(c));
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
function we(s) {
  return typeof s == "string";
}
function Gn(s, e) {
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
function Vn(s) {
  const e = /* @__PURE__ */ new Map(), t = s.group_summaries;
  if (!t || typeof t != "object" || Array.isArray(t))
    return e;
  for (const [r, n] of Object.entries(t))
    if (n && typeof n == "object") {
      const i = n;
      e.set(r, {
        totalItems: typeof i.total_items == "number" ? i.total_items : void 0,
        availableLocales: Array.isArray(i.available_locales) ? i.available_locales.filter(we) : void 0,
        missingLocales: Array.isArray(i.missing_locales) ? i.missing_locales.filter(we) : void 0,
        readinessState: Kn(i.readiness_state) ? i.readiness_state : void 0,
        readyForPublish: typeof i.ready_for_publish == "boolean" ? i.ready_for_publish : void 0
      });
    }
  return e;
}
function Kn(s) {
  return s === "ready" || s === "missing_locales" || s === "missing_fields" || s === "missing_locales_and_fields";
}
const Cr = "datagrid-expand-state-";
function Jn(s) {
  try {
    const e = Cr + s, t = localStorage.getItem(e);
    if (t) {
      const r = JSON.parse(t);
      if (Array.isArray(r))
        return new Set(r.filter(we));
    }
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function Yn(s, e) {
  try {
    const t = Cr + s;
    localStorage.setItem(t, JSON.stringify(Array.from(e)));
  } catch {
  }
}
function Fi(s, e) {
  const t = s.groups.map((r) => r.groupId === e ? { ...r, expanded: !r.expanded } : r);
  return { ...s, groups: t };
}
function qi(s) {
  const e = s.groups.map((t) => ({
    ...t,
    expanded: !0
  }));
  return { ...s, groups: e };
}
function Ni(s) {
  const e = s.groups.map((t) => ({
    ...t,
    expanded: !1
  }));
  return { ...s, groups: e };
}
function ji(s) {
  const e = /* @__PURE__ */ new Set();
  for (const t of s.groups)
    t.expanded && e.add(t.groupId);
  return e;
}
const Er = "datagrid-view-mode-";
function Xn(s) {
  try {
    const e = Er + s, t = localStorage.getItem(e);
    if (t && Qn(t))
      return t;
  } catch {
  }
  return null;
}
function Wn(s, e) {
  try {
    const t = Er + s;
    localStorage.setItem(t, e);
  } catch {
  }
}
function Qn(s) {
  return s === "flat" || s === "grouped" || s === "matrix";
}
function Zn(s, e = {}) {
  const { summary: t } = s, { size: r = "sm" } = e, n = r === "sm" ? "text-xs" : "text-sm", i = t.availableLocales.length, o = t.missingLocales.length, a = i + o;
  let l = "";
  if (t.readinessState) {
    const u = es(t.readinessState);
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
function es(s) {
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
function ts(s, e, t = {}) {
  const { showExpandIcon: r = !0 } = t, n = r ? `<span class="expand-icon mr-2" aria-hidden="true">${s.expanded ? "▼" : "▶"}</span>` : "", i = Zn(s);
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${rs(s.groupId)}"
        data-expanded="${s.expanded}"
        role="row"
        aria-expanded="${s.expanded}"
        tabindex="0">
      <td colspan="${e + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${n}
            <span class="font-medium text-gray-700">Group: ${Mt(s.groupId.slice(0, 12))}...</span>
          </div>
          ${i}
        </div>
      </td>
    </tr>
  `;
}
function Mt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function rs(s) {
  return Mt(s);
}
function ns(s) {
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
function Hi(s) {
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
function zi(s, e, t) {
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
          <p class="mt-1 text-sm text-gray-500">${Mt(e)}</p>
          ${r}
        </div>
      </td>
    </tr>
  `;
}
function ss(s = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < s;
}
function is(s, e = 768) {
  return ss(e) && s === "grouped" ? "flat" : s;
}
class os {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new Oe(), this.selectors = {
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
    const t = this.config.panelId || this.config.tableId, r = this.config.enableGroupedMode ? Xn(t) : null, n = this.config.enableGroupedMode ? Jn(t) : /* @__PURE__ */ new Set(), i = r || this.config.defaultViewMode || "flat";
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
    }, this.actionRenderer = new Jr({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new pn(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([o, a]) => {
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
      this.config.enableGroupedMode && this.state.viewMode === "grouped" ? t.innerHTML = ns(this.config.columns.length) : t.innerHTML = `
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
    let i = jn(t, {
      groupByField: n,
      defaultExpanded: !0,
      expandedGroups: this.state.expandedGroups
    });
    const o = Vn(e);
    o.size > 0 && (i = Gn(i, o)), this.state.groupedData = i;
    const a = this.config.columns.length;
    for (const l of i.groups) {
      const c = ts(l, a);
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
    Yn(t, this.state.expandedGroups);
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
    const t = is(e);
    this.state.viewMode = t;
    const r = this.config.panelId || this.config.tableId;
    Wn(r, t), this.refresh();
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
    !e || !t || (this.columnManager = new Nn({
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
    return e instanceof Response ? or(e) : e instanceof Error ? e.message : "An unexpected error occurred";
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
typeof window < "u" && (window.DataGrid = os);
const Qt = {
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
class Ui {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new Oe();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Qt[e.type] || Qt.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Nt({
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
    new Nt({
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
const Zt = {
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
class Gi {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new Oe(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Zt[e.type] || Zt.text;
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
class Vi {
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
class Ki {
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
class Ji {
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
class Yi {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
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
    const r = as(t, this.config, e);
    r.delivery = ls(this.config, e);
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
      throw ue(t, "error", o), i;
    }
    if (n.status === 202) {
      const i = await n.json().catch(() => ({}));
      ue(t, "info", "Export queued. You can download it when ready.");
      const o = i?.status_url || "";
      if (o) {
        const a = us(i, o);
        try {
          await hs(o, {
            intervalMs: cs(this.config),
            timeoutMs: ds(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await Ct(l);
            throw ue(t, "error", c), new Error(c);
          }
          await tr(l, r.definition || r.resource || "export", r.format), ue(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw ue(t, "error", c), l;
        }
      }
      if (i?.download_url) {
        window.open(i.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const i = await Ct(n);
      throw ue(t, "error", i), new Error(i);
    }
    await tr(n, r.definition || r.resource || "export", r.format), ue(t, "success", "Export ready.");
  }
}
function as(s, e, t) {
  const r = ws(t), n = ps(s, e), i = gs(s, e), o = ms(s), a = bs(o), l = {
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
function ls(s, e) {
  return s.delivery ? s.delivery : (s.asyncFormats && s.asyncFormats.length > 0 ? s.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function cs(s) {
  const e = Number(s.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function ds(s) {
  const e = Number(s.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function us(s, e) {
  return s?.download_url ? s.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function hs(s, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await fetch(s, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const a = await Ct(n);
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
    await fs(r);
  }
}
function fs(s) {
  return new Promise((e) => setTimeout(e, s));
}
function ps(s, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(s.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function gs(s, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = s.state?.hiddenColumns ? new Set(s.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(s.state?.columnOrder) && s.state.columnOrder.length > 0 ? s.state.columnOrder : s.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function ms(s) {
  const e = {}, t = s.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(s.state.currentPage, s.state.perPage)), s.state.search && t.search && Object.assign(e, t.search.buildQuery(s.state.search)), s.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(s.state.filters)), s.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(s.state.sort)), e;
}
function bs(s) {
  const e = {}, t = [];
  return Object.entries(s).forEach(([r, n]) => {
    if (n == null || n === "")
      return;
    switch (r) {
      case "limit":
        e.limit = er(n);
        return;
      case "offset":
        e.offset = er(n);
        return;
      case "order":
      case "sort":
        e.sort = vs(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: i, op: o } = ys(r);
    i && t.push({ field: i, op: o, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function ys(s) {
  const e = s.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function vs(s) {
  return s ? s.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", n = t[1] || "asc";
    return { field: r, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function ws(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function er(s) {
  const e = Number(s);
  return Number.isFinite(e) ? e : 0;
}
async function tr(s, e, t) {
  const r = await s.blob(), n = xs(s, e, t), i = URL.createObjectURL(r), o = document.createElement("a");
  o.href = i, o.download = n, o.rel = "noopener", document.body.appendChild(o), o.click(), o.remove(), URL.revokeObjectURL(i);
}
function xs(s, e, t) {
  const r = s.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return Ss(r) || n;
}
function Ss(s) {
  if (!s) return null;
  const e = s.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = s.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function Ct(s) {
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
class Wi {
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
function Cs(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function Es(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function $r(s) {
  return typeof s == "object" && s !== null && "version" in s && s.version === 2;
}
class $s {
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
      if ($r(t))
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
class Qi extends $s {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = Cs(t.basePath), i = Es(t.apiBasePath);
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
      return $r(i) ? (this.serverPrefs = i, this.savePrefs(i), console.log("[ServerColumnVisibility] Loaded prefs from server:", i), i) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", i), null);
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
const rr = {
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
}, ks = 5e3;
class Ls {
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
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : rr[r] !== void 0 ? rr[r] : ks;
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
    const t = await kt(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (Hr(t.error)) {
      const n = zr(t.error);
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
    const { PayloadInputModal: o } = await Promise.resolve().then(() => As), a = t.map((c) => {
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
    return Ur(t, `${e} failed`);
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
function Zi(s, e, t) {
  return new Ls(t).buildRowActions(s, e);
}
function eo(s) {
  return s.schema?.actions;
}
class Rt extends Lt {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = r;
  }
  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(e) {
    return new Promise((t) => {
      new Rt(
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
const As = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PayloadInputModal: Rt
}, Symbol.toStringTag, { value: "Module" }));
class Pt extends Lt {
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
      new Pt({
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
        const n = `${this.config.apiEndpoint}/actions/create_translation`, i = await kt(n, r);
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
async function to(s) {
  try {
    await Pt.showBlocker(s);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = s.transition || "complete action", r = s.missingLocales.join(", "), n = `Cannot ${t}: Missing translations for ${r}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(n) : alert(n);
  }
}
const _s = [
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
class kr {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || _s
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
function Ds(s) {
  const e = new kr(s);
  return e.render(), e;
}
function ro() {
  const s = document.querySelectorAll("[data-status-legend]"), e = [];
  return s.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const r = t.dataset.orientation || "horizontal", n = t.dataset.size || "default", i = t.dataset.title || "", o = Ds({
      container: t,
      orientation: r,
      size: n,
      title: i
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(o);
  }), e;
}
function no(s = {}) {
  const e = document.createElement("div");
  return new kr({
    container: e,
    ...s
  }).buildHTML();
}
const Lr = [
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
class Is {
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
    i ? o ? (c = `${e.styleClass || "bg-blue-100 text-blue-700"} ring-2 ring-offset-1 ring-blue-500`, d = 'aria-pressed="true"') : (c = e.styleClass || "bg-gray-100 text-gray-700 hover:bg-gray-200", d = 'aria-pressed="false"') : (c = "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60", d = `aria-disabled="true" title="${Et(a)}"`);
    const u = e.icon ? `<span aria-hidden="true">${e.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter-btn ${l} ${c}"
              data-filter-key="${Et(e.key)}"
              ${d}
              ${i ? "" : "disabled"}>
        ${u}
        <span>${Bt(e.label)}</span>
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
function Ts(s, e, t = {}) {
  return new Is({
    container: s,
    filters: Lr,
    onFilterSelect: e,
    ...t
  });
}
function so(s) {
  const e = document.querySelectorAll("[data-quick-filters]"), t = [];
  return e.forEach((r) => {
    if (r.hasAttribute("data-quick-filters-init"))
      return;
    const n = r.dataset.size || "default", i = Ts(
      r,
      (o) => s(o, r),
      { size: n }
    );
    r.setAttribute("data-quick-filters-init", "true"), t.push(i);
  }), t;
}
function io(s = {}) {
  const {
    filters: e = Lr,
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
    const k = d.icon ? `<span>${d.icon}</span>` : "", E = h ? "" : `title="${Et(g)}"`;
    return `<span class="${b} ${C}" ${E}>${k}<span>${Bt(d.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters inline-flex items-center gap-2 flex-wrap ${i}">${c}</div>`;
}
function Bt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Et(s) {
  return Bt(s);
}
async function Ms(s, e, t = {}) {
  const { apiEndpoint: r, notifier: n = new Oe(), maxFailuresToShow: i = 5 } = s, o = `${r}/bulk/create-missing-translations`;
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
    const l = await a.json(), c = Rs(l, i);
    return Ps(c, n), s.onSuccess && s.onSuccess(c), c;
  } catch (a) {
    const l = a instanceof Error ? a : new Error(String(a));
    throw n.error(`Failed to create translations: ${l.message}`), s.onError && s.onError(l), l;
  }
}
function Rs(s, e) {
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
function Ps(s, e) {
  const { created: t, failed: r, skipped: n, total: i } = s;
  if (i === 0) {
    e.info("No translations to create");
    return;
  }
  r === 0 ? t > 0 ? e.success(`Created ${t} translation${t !== 1 ? "s" : ""}${n > 0 ? ` (${n} skipped)` : ""}`) : n > 0 && e.info(`All ${n} translation${n !== 1 ? "s" : ""} already exist`) : t === 0 ? e.error(`Failed to create ${r} translation${r !== 1 ? "s" : ""}`) : e.warning(
    `Created ${t}, failed ${r}${n > 0 ? `, skipped ${n}` : ""}`
  );
}
function oo(s) {
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
          <td class="px-3 py-2 text-sm text-gray-700">${gt(c.id)}</td>
          <td class="px-3 py-2 text-sm text-gray-700">${gt(c.locale)}</td>
          <td class="px-3 py-2 text-sm text-red-600">${gt(c.error)}</td>
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
function ao(s) {
  const { created: e, failed: t, skipped: r } = s, n = [];
  return e > 0 && n.push(`<span class="text-green-600">+${e}</span>`), t > 0 && n.push(`<span class="text-red-600">${t} failed</span>`), r > 0 && n.push(`<span class="text-yellow-600">${r} skipped</span>`), n.join(" · ");
}
function lo(s, e, t) {
  return async (r) => Ms(
    {
      apiEndpoint: s,
      notifier: e,
      onSuccess: t
    },
    r
  );
}
function gt(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
const Bs = {
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
  return Bs[e] || s.toUpperCase();
}
class st {
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
    const { locale: e, size: t, mode: r, localeExists: n } = this.config, { loading: i, created: o, error: a } = this.state, l = V(e), c = t === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5", d = r === "button" ? "rounded-lg" : "rounded-full";
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
                aria-label="Create ${V(e)} translation"
                title="Create ${V(e)} translation">
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
        const t = `${this.config.apiEndpoint}/actions/create_translation`, r = await kt(t, e);
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
function Ar(s) {
  return new st(s).render();
}
function co(s, e) {
  return s.length === 0 ? "" : `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${s.map((r) => {
    const n = { ...e, locale: r };
    return Ar(n);
  }).join("")}
    </div>
  `;
}
function uo(s, e) {
  const t = /* @__PURE__ */ new Map();
  return s.querySelectorAll("[data-locale-action]").forEach((n) => {
    const i = n.getAttribute("data-locale-action");
    if (!i) return;
    const o = n.getAttribute("data-locale-exists") === "true", a = { ...e, locale: i, localeExists: o }, l = new st(a), c = n.parentElement;
    c && (l.mount(c), t.set(i, l));
  }), t;
}
function nr(s, e, t, r) {
  const n = new URLSearchParams();
  return n.set("locale", t), r && n.set("env", r), `${s}/${e}/edit?${n.toString()}`;
}
class Ot {
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
    const { context: e, showFormLockMessage: t } = this.config, r = e.requestedLocale || "requested", n = e.resolvedLocale || "default", i = V(r), o = V(n), a = this.renderPrimaryCta(), l = this.renderSecondaryCta(), c = t ? this.renderFormLockMessage() : "";
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
              aria-label="Create ${V(o)} translation">
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
    const i = nr(t, e.recordId, n, r);
    return `
      <a href="${m(i)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${m(n)}"
         aria-label="Open ${V(n)} translation">
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
    await new st({
      locale: o,
      recordId: a,
      apiEndpoint: t,
      navigationBasePath: i,
      panelName: r,
      environment: n,
      localeExists: !1,
      onCreateSuccess: (c, d) => {
        this.config.onCreateSuccess?.(c, d);
        const u = nr(i, d.id, c, n);
        window.location.href = u;
      },
      onError: (c, d) => {
        this.config.onError?.(d);
      }
    }).handleCreate();
  }
}
function Os(s, e) {
  if (!e.locked) {
    Fs(s);
    return;
  }
  if (s.classList.add("form-locked", "pointer-events-none", "opacity-75"), s.setAttribute("data-form-locked", "true"), s.setAttribute("data-lock-reason", e.reason || ""), s.querySelectorAll('input, textarea, select, button[type="submit"]').forEach((r) => {
    r.setAttribute("disabled", "true"), r.setAttribute("data-was-enabled", "true"), r.setAttribute("aria-disabled", "true");
  }), !s.querySelector("[data-form-lock-overlay]")) {
    const r = document.createElement("div");
    r.setAttribute("data-form-lock-overlay", "true"), r.className = "absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10", r.setAttribute("title", e.reason || "Form is locked"), window.getComputedStyle(s).position === "static" && (s.style.position = "relative"), s.appendChild(r);
  }
}
function Fs(s) {
  s.classList.remove("form-locked", "pointer-events-none", "opacity-75"), s.removeAttribute("data-form-locked"), s.removeAttribute("data-lock-reason"), s.querySelectorAll('[data-was-enabled="true"]').forEach((r) => {
    r.removeAttribute("disabled"), r.removeAttribute("data-was-enabled"), r.removeAttribute("aria-disabled");
  }), s.querySelector("[data-form-lock-overlay]")?.remove();
}
function ho(s) {
  return s.getAttribute("data-form-locked") === "true";
}
function fo(s) {
  return s.getAttribute("data-lock-reason");
}
function po(s, e) {
  const t = oe(s);
  return new Ot({ ...e, context: t }).render();
}
function go(s) {
  const e = oe(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function mo(s, e) {
  const t = new Ot(e);
  return t.mount(s), t;
}
function bo(s, e) {
  const t = oe(e), n = new Ot({
    context: t,
    apiEndpoint: "",
    navigationBasePath: ""
  }).getFormLockState();
  return Os(s, n), n;
}
class _r {
  constructor(e, t) {
    this.chips = /* @__PURE__ */ new Map(), this.element = null, this.config = {
      maxChips: 3,
      size: "sm",
      ...t
    }, this.readiness = G(e), this.actionState = this.extractActionState(e, "create_translation");
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
    return t ? Ar({
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
    const n = r === "md" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1", i = t || "Translation creation unavailable", o = V(e);
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
      const n = new st({
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
function qs(s, e) {
  const t = String(s.id || "");
  return t ? new _r(s, { ...e, recordId: t }).render() : "";
}
function yo(s) {
  const e = G(s);
  return e.hasReadinessMetadata && e.missingRequiredLocales.length > 0;
}
function vo(s, e, t) {
  const r = String(e.id || ""), n = new _r(e, { ...t, recordId: r });
  return n.mount(s), n;
}
function wo(s) {
  return (e, t, r) => qs(t, s);
}
function it() {
  return typeof navigator > "u" ? !1 : /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}
function Ns() {
  return it() ? "⌘" : "Ctrl";
}
function js(s) {
  if (it())
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
function Dr(s) {
  const e = s.modifiers.map(js), t = Hs(s.key);
  return it() ? [...e, t].join("") : [...e, t].join("+");
}
function Hs(s) {
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
class Ir {
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
    const i = it(), o = new Set(e.modifiers), a = o.has("ctrl"), l = o.has("meta"), c = o.has("alt"), d = o.has("shift");
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
function zs(s) {
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
function xo(s) {
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
        const l = Dr(a);
        n += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${fe(a.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${fe(l)}</kbd>
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
function fe(s) {
  const e = typeof document < "u" ? document.createElement("div") : null;
  return e ? (e.textContent = s, e.innerHTML) : s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const Tr = "admin_keyboard_shortcuts_settings", Mr = "admin_keyboard_shortcuts_hint_dismissed", Xe = {
  enabled: !0,
  shortcuts: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function Us() {
  if (typeof localStorage > "u")
    return { ...Xe };
  try {
    const s = localStorage.getItem(Tr);
    if (!s)
      return { ...Xe };
    const e = JSON.parse(s);
    return {
      enabled: typeof e.enabled == "boolean" ? e.enabled : !0,
      shortcuts: typeof e.shortcuts == "object" && e.shortcuts !== null ? e.shortcuts : {},
      updatedAt: typeof e.updatedAt == "string" ? e.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch {
    return { ...Xe };
  }
}
function So(s) {
  if (!(typeof localStorage > "u"))
    try {
      const e = {
        ...s,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      localStorage.setItem(Tr, JSON.stringify(e));
    } catch {
    }
}
function Gs() {
  return typeof localStorage > "u" ? !1 : localStorage.getItem(Mr) === "true";
}
function Vs() {
  if (!(typeof localStorage > "u"))
    try {
      localStorage.setItem(Mr, "true");
    } catch {
    }
}
function Ks(s) {
  if (Gs())
    return null;
  const { container: e, position: t = "bottom", onDismiss: r, onShowHelp: n, autoDismissMs: i = 1e4 } = s, o = document.createElement("div");
  o.className = `shortcuts-discovery-hint fixed ${t === "top" ? "top-4" : "bottom-4"} right-4 z-50 animate-fade-in`, o.setAttribute("role", "alert"), o.setAttribute("aria-live", "polite");
  const a = Ns();
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
    c && Vs(), o.remove(), r?.();
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
function Co(s) {
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
        const b = r.shortcuts[g.id] !== !1, C = Dr(g);
        l += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${fe(C)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${fe(g.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${fe(g.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${fe(g.id)}"
                 ${b ? "checked" : ""}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${fe(g.description)} shortcut">
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
    n({ ...Xe });
  });
}
function Js(s, e) {
  const t = s;
  t.config && (t.config.enabled = e.enabled);
  for (const r of s.getShortcuts()) {
    const n = e.shortcuts[r.id] !== !1;
    s.setEnabled(r.id, n);
  }
}
let mt = null;
function Eo() {
  return mt || (mt = new Ir()), mt;
}
function Ys(s, e) {
  const t = Us(), r = new Ir({
    ...e,
    enabled: t.enabled
  }), n = zs(s);
  for (const i of n)
    r.register(i);
  return Js(r, t), r.bind(), r;
}
function $o(s, e) {
  const t = Ys(s, e);
  return e.hintContainer && Ks({
    container: e.hintContainer,
    onShowHelp: e.onShowHelp,
    onDismiss: () => {
    }
  }), t;
}
const Xs = 1500, Ws = 2e3, Ft = "autosave", Ie = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
  conflict: "Conflict detected"
}, Qs = {
  title: "Save Conflict",
  message: "This content was modified by someone else. Choose how to proceed:",
  useServer: "Use server version",
  forceSave: "Overwrite with my changes",
  viewDiff: "View differences",
  dismiss: "Dismiss"
};
class Rr {
  constructor(e = {}) {
    this.state = "idle", this.conflictInfo = null, this.pendingData = null, this.lastError = null, this.debounceTimer = null, this.savedTimer = null, this.listeners = [], this.isDirty = !1, this.config = {
      container: e.container,
      onSave: e.onSave,
      debounceMs: e.debounceMs ?? Xs,
      savedDurationMs: e.savedDurationMs ?? Ws,
      notifier: e.notifier,
      showToasts: e.showToasts ?? !1,
      classPrefix: e.classPrefix ?? Ft,
      labels: { ...Ie, ...e.labels },
      // Phase 3b conflict handling (TX-074)
      enableConflictDetection: e.enableConflictDetection ?? !1,
      onConflictResolve: e.onConflictResolve,
      fetchServerState: e.fetchServerState,
      allowForceSave: e.allowForceSave ?? !0,
      conflictLabels: { ...Qs, ...e.conflictLabels }
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
          t.success(this.config.labels.saved ?? Ie.saved, 2e3);
          break;
        case "error":
          t.error(this.lastError?.message ?? this.config.labels.error ?? Ie.error);
          break;
        case "conflict":
          t.warning?.(this.config.labels.conflict ?? Ie.conflict);
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
function ko(s) {
  return new Rr({
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
function Lo(s, e = {}) {
  const t = e.classPrefix ?? Ft, n = { ...Ie, ...e.labels }[s] || "";
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
function Ao(s = Ft) {
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
function _o(s, e) {
  const { watchFields: t, indicatorSelector: r, ...n } = e;
  let i = n.container;
  !i && r && (i = s.querySelector(r) ?? void 0);
  const o = new Rr({
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
const Pr = "char-counter", Zs = "interpolation-preview", Br = "dir-toggle", Or = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: "Mustache", example: "{{name}}" },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: "ICU", example: "{name}" },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: "Printf", example: "%s" },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: "Named Printf", example: "%(name)s" },
  { pattern: /\$\{(\w+)\}/g, name: "Template Literal", example: "${name}" }
], ei = {
  name: "John",
  count: "5",
  email: "user@example.com",
  date: "2024-01-15",
  price: "$29.99",
  user: "Jane",
  item: "Product",
  total: "100"
};
class ti {
  constructor(e) {
    this.counterEl = null, this.config = {
      input: e.input,
      container: e.container,
      softLimit: e.softLimit,
      hardLimit: e.hardLimit,
      thresholds: e.thresholds ?? this.buildDefaultThresholds(e),
      enforceHardLimit: e.enforceHardLimit ?? !1,
      classPrefix: e.classPrefix ?? Pr,
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
class ri {
  constructor(e) {
    this.previewEl = null, this.config = {
      input: e.input,
      container: e.container,
      sampleValues: e.sampleValues ?? ei,
      patterns: [...Or, ...e.customPatterns ?? []],
      highlightVariables: e.highlightVariables ?? !0,
      classPrefix: e.classPrefix ?? Zs
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
class ni {
  constructor(e) {
    this.toggleEl = null, this.config = {
      input: e.input,
      container: e.container,
      initialDirection: e.initialDirection ?? "auto",
      persistenceKey: e.persistenceKey,
      classPrefix: e.classPrefix ?? Br,
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
function Do(s, e = {}) {
  const t = [], r = [], n = [];
  for (const i of e.charCounterFields ?? []) {
    const o = s.querySelector(`[name="${i}"]`);
    o && t.push(new ti({
      input: o,
      ...e.charCounterConfig
    }));
  }
  for (const i of e.interpolationFields ?? []) {
    const o = s.querySelector(`[name="${i}"]`);
    o && r.push(new ri({
      input: o,
      ...e.interpolationConfig
    }));
  }
  for (const i of e.directionToggleFields ?? []) {
    const o = s.querySelector(`[name="${i}"]`);
    o && n.push(new ni({
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
function Io(s, e, t, r = Pr) {
  const n = [r];
  t && n.push(`${r}--${t}`);
  const i = e ? `${s} / ${e}` : `${s}`;
  return `<span class="${n.join(" ")}" aria-live="polite">${i}</span>`;
}
function To(s, e = Br) {
  const t = s === "rtl", r = t ? '<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<button type="button" class="${e}" aria-pressed="${t}" title="Toggle text direction (${s.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${r}</svg>
    <span class="${e}__label">${s.toUpperCase()}</span>
  </button>`;
}
function Mo() {
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
function Ro(s, e = Or) {
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
function Po(s, e, t) {
  return t && s >= t ? "error" : e && s >= e ? "warning" : null;
}
function si(s) {
  return typeof s == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(s) ? s : "none";
}
function ii(s) {
  return s === "core+exchange" || s === "full";
}
function oi(s) {
  return s === "core+queue" || s === "full";
}
function Bo(s) {
  return s !== "none";
}
function ai(s) {
  if (!s || typeof s != "object")
    return null;
  const e = s, t = si(e.profile || e.capability_mode), r = typeof e.schema_version == "number" ? e.schema_version : 0;
  return {
    profile: t,
    capability_mode: t,
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.filter(
      (n) => typeof n == "string" && ["none", "core", "core+exchange", "core+queue", "full"].includes(n)
    ) : ["none", "core", "core+exchange", "core+queue", "full"],
    schema_version: r,
    modules: li(e.modules),
    features: di(e.features),
    routes: ui(e.routes),
    panels: hi(e.panels),
    resolver_keys: fi(e.resolver_keys),
    warnings: pi(e.warnings),
    contracts: e.contracts && typeof e.contracts == "object" ? e.contracts : void 0
  };
}
function li(s) {
  if (!s || typeof s != "object")
    return {};
  const e = s, t = {};
  return e.exchange && typeof e.exchange == "object" && (t.exchange = sr(e.exchange)), e.queue && typeof e.queue == "object" && (t.queue = sr(e.queue)), t;
}
function sr(s) {
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
    entry: Fr(e.entry),
    actions: ci(e.actions)
  };
}
function Fr(s) {
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
function ci(s) {
  if (!s || typeof s != "object")
    return {};
  const e = s, t = {};
  for (const [r, n] of Object.entries(e))
    n && typeof n == "object" && (t[r] = Fr(n));
  return t;
}
function di(s) {
  if (!s || typeof s != "object")
    return {};
  const e = s;
  return {
    cms: e.cms === !0,
    dashboard: e.dashboard === !0
  };
}
function ui(s) {
  if (!s || typeof s != "object")
    return {};
  const e = {}, t = s;
  for (const [r, n] of Object.entries(t))
    typeof n == "string" && (e[r] = n);
  return e;
}
function hi(s) {
  return Array.isArray(s) ? s.filter((e) => typeof e == "string") : [];
}
function fi(s) {
  return Array.isArray(s) ? s.filter((e) => typeof e == "string") : [];
}
function pi(s) {
  return Array.isArray(s) ? s.filter((e) => typeof e == "string") : [];
}
class qr {
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
    return e === "exchange" ? ii(t) : oi(t);
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
function Oo(s) {
  const e = ai(s);
  return e ? new qr(e) : null;
}
function Fo() {
  return new qr({
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
function qo(s) {
  return s.visible ? s.enabled ? "" : `aria-disabled="true"${s.reason ? ` title="${$t(s.reason)}"` : ""}` : 'aria-hidden="true" style="display: none;"';
}
function No(s) {
  if (s.enabled || !s.reason)
    return "";
  const e = s.reasonCode || "DISABLED";
  return `
    <span class="capability-gate-reason ${gi(e)}"
          role="status"
          aria-label="${$t(s.reason)}"
          data-reason-code="${$t(e)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${mi(s.reason)}
    </span>
  `.trim();
}
function gi(s) {
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
function mi(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function $t(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function jo() {
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
function bi(s, e) {
  if (!e.visible) {
    s.style.display = "none", s.setAttribute("aria-hidden", "true");
    return;
  }
  s.style.display = "", s.removeAttribute("aria-hidden"), e.enabled ? (s.removeAttribute("aria-disabled"), s.classList.remove("capability-gate-disabled"), s.removeAttribute("title"), delete s.dataset.reasonCode, s.removeEventListener("click", ir, !0)) : (s.setAttribute("aria-disabled", "true"), s.classList.add("capability-gate-disabled"), e.reason && (s.setAttribute("title", e.reason), s.dataset.reasonCode = e.reasonCode || ""), s.addEventListener("click", ir, !0));
}
function ir(s) {
  s.currentTarget.getAttribute("aria-disabled") === "true" && (s.preventDefault(), s.stopPropagation());
}
function Ho(s, e) {
  s.querySelectorAll("[data-capability-gate]").forEach((r) => {
    const n = r.dataset.capabilityGate;
    if (n)
      try {
        const i = JSON.parse(n), o = e.gateNavItem(i);
        bi(r, o);
      } catch {
        console.warn("Invalid capability gate config:", n);
      }
  });
}
export {
  Jr as ActionRenderer,
  Ui as AdvancedSearch,
  Rr as AutosaveIndicator,
  qr as CapabilityGate,
  pn as CellRendererRegistry,
  ti as CharacterCounter,
  Nn as ColumnManager,
  Oi as CommonRenderers,
  Or as DEFAULT_INTERPOLATION_PATTERNS,
  ei as DEFAULT_SAMPLE_VALUES,
  _s as DEFAULT_STATUS_LEGEND_ITEMS,
  Lr as DEFAULT_TRANSLATION_QUICK_FILTERS,
  os as DataGrid,
  $s as DefaultColumnVisibilityBehavior,
  ni as DirectionToggle,
  Ot as FallbackBanner,
  Gi as FilterBuilder,
  Wi as GoCrudBulkActionBehavior,
  Xi as GoCrudExportBehavior,
  Ki as GoCrudFilterBehavior,
  Ji as GoCrudPaginationBehavior,
  Vi as GoCrudSearchBehavior,
  Yi as GoCrudSortBehavior,
  _r as InlineLocaleChips,
  ri as InterpolationPreview,
  Ir as KeyboardShortcutRegistry,
  st as LocaleActionChip,
  Rt as PayloadInputModal,
  Is as QuickFilters,
  Ls as SchemaActionBuilder,
  Qi as ServerColumnVisibilityBehavior,
  kr as StatusLegend,
  Pt as TranslationBlockerModal,
  Os as applyFormLock,
  bi as applyGateToElement,
  Js as applyShortcutSettings,
  nr as buildLocaleEditUrl,
  Zi as buildSchemaRowActions,
  Ni as collapseAllGroups,
  lo as createBulkCreateMissingHandler,
  Oo as createCapabilityGate,
  Fo as createEmptyCapabilityGate,
  wo as createInlineLocaleChipsRenderer,
  tn as createLocaleBadgeRenderer,
  Ds as createStatusLegend,
  ko as createTranslationAutosave,
  Pi as createTranslationMatrixRenderer,
  Ts as createTranslationQuickFilters,
  zs as createTranslationShortcuts,
  jt as createTranslationStatusRenderer,
  Ro as detectInterpolations,
  Vs as dismissShortcutHint,
  Ms as executeBulkCreateMissing,
  qi as expandAllGroups,
  Vn as extractBackendSummaries,
  ai as extractCapabilities,
  Go as extractExchangeError,
  eo as extractSchemaActions,
  oe as extractTranslationContext,
  G as extractTranslationReadiness,
  Dr as formatShortcutDisplay,
  Vo as generateExchangeReport,
  Ao as getAutosaveIndicatorStyles,
  jo as getCapabilityGateStyles,
  Po as getCharCountSeverity,
  Eo as getDefaultShortcutRegistry,
  ji as getExpandedGroupIds,
  Mo as getFieldHelperStyles,
  fo as getFormLockReason,
  V as getLocaleLabel,
  Ri as getMissingTranslationsCount,
  js as getModifierSymbol,
  Jn as getPersistedExpandState,
  Xn as getPersistedViewMode,
  Ns as getPrimaryModifierLabel,
  is as getViewModeForViewport,
  Ko as groupRowResultsByStatus,
  Mi as hasMissingTranslations,
  $i as hasTranslationContext,
  ki as hasTranslationReadiness,
  Ho as initCapabilityGating,
  mo as initFallbackBanner,
  Do as initFieldHelpers,
  _o as initFormAutosave,
  bo as initFormLock,
  vo as initInlineLocaleChips,
  Ys as initKeyboardShortcuts,
  $o as initKeyboardShortcutsWithDiscovery,
  uo as initLocaleActionChips,
  so as initQuickFilters,
  ro as initStatusLegends,
  Bo as isCoreEnabled,
  ii as isExchangeEnabled,
  Jo as isExchangeError,
  ho as isFormLocked,
  Ei as isInFallbackMode,
  it as isMacPlatform,
  ss as isNarrowViewport,
  oi as isQueueEnabled,
  Li as isReadyForTransition,
  Gs as isShortcutHintDismissed,
  Us as loadShortcutSettings,
  Gn as mergeBackendSummaries,
  si as parseCapabilityMode,
  Yo as parseImportResult,
  Yn as persistExpandState,
  Wn as persistViewMode,
  Fs as removeFormLock,
  Lo as renderAutosaveIndicator,
  Xr as renderAvailableLocalesIndicator,
  ao as renderBulkResultInline,
  oo as renderBulkResultSummary,
  Io as renderCharacterCounter,
  To as renderDirectionToggle,
  No as renderDisabledReasonBadge,
  Ks as renderDiscoveryHint,
  po as renderFallbackBannerFromRecord,
  Bi as renderFallbackWarning,
  qo as renderGateAriaAttributes,
  ts as renderGroupHeaderRow,
  Zn as renderGroupHeaderSummary,
  ns as renderGroupedEmptyState,
  zi as renderGroupedErrorState,
  Hi as renderGroupedLoadingState,
  qs as renderInlineLocaleChips,
  Ar as renderLocaleActionChip,
  co as renderLocaleActionList,
  lr as renderLocaleBadge,
  Ii as renderLocaleCompleteness,
  Ti as renderMissingTranslationsBadge,
  Di as renderPublishReadinessBadge,
  io as renderQuickFiltersHTML,
  _i as renderReadinessIndicator,
  Co as renderShortcutSettingsUI,
  xo as renderShortcutsHelpContent,
  Ai as renderStatusBadge,
  no as renderStatusLegendHTML,
  Zr as renderTranslationMatrixCell,
  Wr as renderTranslationStatusCell,
  So as saveShortcutSettings,
  go as shouldShowFallbackBanner,
  yo as shouldShowInlineLocaleChips,
  to as showTranslationBlocker,
  Fi as toggleGroupExpand,
  jn as transformToGroups
};
//# sourceMappingURL=index.js.map

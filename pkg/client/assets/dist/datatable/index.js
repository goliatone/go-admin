import { F as We } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as jt, executeActionRequest as zt, isTranslationBlocker as cr, extractTranslationBlocker as dr, formatStructuredErrorForDisplay as ur } from "../toast/error-helpers.js";
import { extractExchangeError as fo, generateExchangeReport as po, groupRowResultsByStatus as mo, isExchangeError as go, parseImportResult as bo } from "../toast/error-helpers.js";
import { M as mt, e as S, T as Et } from "../chunks/modal-DXPBR0f5.js";
import { b as Ue, a as hr } from "../chunks/badge-CqKzZ9y5.js";
import { r as fr } from "../chunks/icon-renderer-CRbgoQtj.js";
let pr = class Ht extends mt {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = r;
  }
  static prompt(e) {
    return new Promise((t) => {
      new Ht(
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
          <h3 class="text-lg font-semibold text-gray-900">${S(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${S(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${S(this.config.confirmLabel ?? "Continue")}
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${S(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${S(e.label)}
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
      return `<option value="${S(o.value)}"${i}>${S(o.label)}</option>`;
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${S(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${S(e.value)}"
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
class mr {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new We();
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
          const i = await jt(n);
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
    return pr.prompt({
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
function Be(s) {
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
  return !s || typeof s != "object" || (e.requestedLocale = ue(s, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = ue(s, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = xr(s, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = At(s, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = At(s, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = ue(s, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = ue(s, ["status"]), e.entityType = ue(s, ["entity_type", "type", "_type"]), e.recordId = ue(s, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function Mn(s) {
  const e = Be(s);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function qn(s) {
  const e = Be(s);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function ne(s) {
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
    typeof n == "string" && gr(n) && (e.readinessState = n);
    const o = t.ready_for_transition;
    if (o && typeof o == "object" && !Array.isArray(o))
      for (const [i, a] of Object.entries(o))
        typeof a == "boolean" && (e.readyForTransition[i] = a);
    e.evaluatedEnvironment = typeof t.evaluated_environment == "string" ? t.evaluated_environment : null;
  }
  return e;
}
function Fn(s) {
  return ne(s).hasReadinessMetadata;
}
function Nn(s, e) {
  return ne(s).readyForTransition[e] === !0;
}
function gr(s) {
  return ["ready", "missing_locales", "missing_fields", "missing_locales_and_fields"].includes(s);
}
function Gt(s, e = {}) {
  const t = "resolvedLocale" in s ? s : Be(s), { showFallbackIndicator: r = !0, size: n = "default", extraClass: o = "" } = e;
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
function br(s, e = {}) {
  const t = "resolvedLocale" in s ? s : Be(s), { maxLocales: r = 3, size: n = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const o = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", i = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, r), l = t.availableLocales.length - r, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${i} rounded bg-blue-100 text-blue-700 font-medium` : `${i} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${i} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${o}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function yr(s, e = {}) {
  const t = "resolvedLocale" in s ? s : Be(s), { showResolvedLocale: r = !0, size: n = "default" } = e, o = [];
  return r && t.resolvedLocale && o.push(Gt(t, { size: n, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && o.push(br(t, { ...e, size: n })), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${o.join("")}</div>`;
}
function jn(s, e = "default") {
  if (!s)
    return "";
  const t = s.toLowerCase();
  return Ue(s, "status", t, { size: e === "sm" ? "sm" : void 0 });
}
function zn(s, e = {}) {
  const t = ne(s);
  if (!t.hasReadinessMetadata)
    return "";
  const { size: r = "default", showDetailedTooltip: n = !0, extraClass: o = "" } = e, a = `inline-flex items-center gap-1 rounded font-medium ${r === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`, l = t.readinessState || "ready", { icon: c, label: d, bgClass: u, textClass: h, tooltip: p } = vr(l, t, n);
  return `<span class="${a} ${u} ${h} ${o}"
                title="${p}"
                aria-label="${d}"
                data-readiness-state="${l}">
    ${c}
    <span>${d}</span>
  </span>`;
}
function Hn(s, e = {}) {
  const t = ne(s);
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
function Gn(s, e = {}) {
  const t = ne(s);
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
function Un(s, e = {}) {
  const t = ne(s);
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
function Vn(s) {
  const e = ne(s);
  return e.hasReadinessMetadata ? e.readinessState !== "ready" : !1;
}
function Yn(s) {
  return ne(s).missingRequiredLocales.length;
}
function vr(s, e, t) {
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
function Jn(s, e = {}) {
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
function $t(s = {}) {
  return (e, t, r) => yr(t, s);
}
function wr(s = {}) {
  return (e, t, r) => Gt(t, s);
}
function ue(s, e) {
  for (const t of e) {
    const r = gt(s, t);
    if (typeof r == "string" && r.trim())
      return r;
  }
  return null;
}
function xr(s, e) {
  for (const t of e) {
    const r = gt(s, t);
    if (Array.isArray(r))
      return r.filter((n) => typeof n == "string");
  }
  return [];
}
function At(s, e) {
  for (const t of e) {
    const r = gt(s, t);
    if (typeof r == "boolean")
      return r;
    if (r === "true") return !0;
    if (r === "false") return !1;
  }
  return !1;
}
function gt(s, e) {
  const t = e.split(".");
  let r = s;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
const J = '<span class="text-gray-400">-</span>', Sr = [
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
function Ce(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Cr(s) {
  try {
    return JSON.stringify(s);
  } catch {
    return String(s);
  }
}
function Er(s) {
  const e = [], t = (n) => {
    if (typeof n != "string") return;
    const o = n.trim();
    !o || e.includes(o) || e.push(o);
  };
  t(s.display_key), t(s.displayKey);
  const r = s.display_keys ?? s.displayKeys;
  return Array.isArray(r) && r.forEach(t), e;
}
function $r(s, e) {
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
function Ar(s) {
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
function lt(s, e) {
  if (s == null)
    return "";
  if (Array.isArray(s))
    return ct(s, e);
  if (typeof s != "object")
    return String(s);
  const r = [...Er(e), ...Sr], n = /* @__PURE__ */ new Set();
  for (const o of r) {
    if (n.has(o)) continue;
    n.add(o);
    const i = $r(s, o), a = Ar(i);
    if (a)
      return a;
  }
  return Cr(s);
}
function ct(s, e) {
  if (!Array.isArray(s) || s.length === 0)
    return "";
  const t = s.map((i) => lt(i, e).trim()).filter(Boolean);
  if (t.length === 0)
    return "";
  const r = Number(e.preview_limit ?? e.previewLimit ?? 3), n = Number.isFinite(r) && r > 0 ? Math.floor(r) : 3, o = t.slice(0, n);
  return t.length <= n ? o.join(", ") : `${o.join(", ")} +${t.length - n} more`;
}
function kr(s, e, t, r) {
  const n = s[e] ?? s[t] ?? r, o = Number(n);
  return Number.isFinite(o) && o > 0 ? Math.floor(o) : r;
}
function Lr(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" || n === "1" : !!n;
}
function Dr(s, e, t, r) {
  const n = s[e] ?? s[t];
  return n == null ? r : String(n).trim() || r;
}
function _r(s) {
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
function Pr(s) {
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
class Br {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => {
      if (e == null)
        return J;
      if (typeof e == "boolean")
        return e ? "Yes" : "No";
      if (Array.isArray(e)) {
        const t = ct(e, {});
        return t ? Ce(t) : J;
      }
      if (typeof e == "object") {
        const t = lt(e, {});
        return t ? Ce(t) : J;
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
      return Ue(String(e), "status", t);
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
        return J;
      const o = n?.options || {}, i = ct(e, o);
      return i ? Ce(i) : J;
    }), this.renderers.set("_object", (e, t, r, n) => {
      if (e == null)
        return J;
      const o = n?.options || {}, i = lt(e, o);
      return i ? Ce(i) : J;
    }), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("blocks_chips", (e, t, r, n) => {
      if (!Array.isArray(e) || e.length === 0)
        return J;
      const o = n?.options || {}, i = kr(o, "max_visible", "maxVisible", 3), a = Lr(o, "show_count", "showCount", !0), l = Dr(o, "chip_variant", "chipVariant", "default"), c = o.block_icons_map || o.blockIconsMap || {}, d = [], u = e.slice(0, i);
      for (const b of u) {
        const v = _r(b);
        if (!v) continue;
        const D = c[v] || "view-grid", L = fr(D, { size: "14px", extraClass: "flex-shrink-0" }), _ = Pr(l);
        d.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${_}">${L}<span>${Ce(v)}</span></span>`
        );
      }
      if (d.length === 0)
        return J;
      const h = e.length - i;
      let p = "";
      return a && h > 0 && (p = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${h} more</span>`), `<div class="flex flex-wrap gap-1">${d.join("")}${p}</div>`;
    }), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const Xn = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return Ue(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (s) => (e) => {
    const t = String(e).toLowerCase();
    return Ue(String(e), "role", t);
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
  booleanChip: (s) => (e) => hr(!!e, s),
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
  localeBadge: wr(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: $t(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: $t({ size: "sm", maxLocales: 2 })
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function kt(s, e) {
  var t = Object.keys(s);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(s);
    e && (r = r.filter(function(n) {
      return Object.getOwnPropertyDescriptor(s, n).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function V(s) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? kt(Object(t), !0).forEach(function(r) {
      Tr(s, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(s, Object.getOwnPropertyDescriptors(t)) : kt(Object(t)).forEach(function(r) {
      Object.defineProperty(s, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return s;
}
function Ne(s) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Ne = function(e) {
    return typeof e;
  } : Ne = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Ne(s);
}
function Tr(s, e, t) {
  return e in s ? Object.defineProperty(s, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : s[e] = t, s;
}
function K() {
  return K = Object.assign || function(s) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (s[r] = t[r]);
    }
    return s;
  }, K.apply(this, arguments);
}
function Ir(s, e) {
  if (s == null) return {};
  var t = {}, r = Object.keys(s), n, o;
  for (o = 0; o < r.length; o++)
    n = r[o], !(e.indexOf(n) >= 0) && (t[n] = s[n]);
  return t;
}
function Rr(s, e) {
  if (s == null) return {};
  var t = Ir(s, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(s);
    for (n = 0; n < o.length; n++)
      r = o[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(s, r) && (t[r] = s[r]);
  }
  return t;
}
var Or = "1.15.6";
function X(s) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(s);
}
var W = X(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), Te = X(/Edge/i), Lt = X(/firefox/i), ke = X(/safari/i) && !X(/chrome/i) && !X(/android/i), bt = X(/iP(ad|od|hone)/i), Ut = X(/chrome/i) && X(/android/i), Vt = {
  capture: !1,
  passive: !1
};
function x(s, e, t) {
  s.addEventListener(e, t, !W && Vt);
}
function w(s, e, t) {
  s.removeEventListener(e, t, !W && Vt);
}
function Ve(s, e) {
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
function Yt(s) {
  return s.host && s !== document && s.host.nodeType ? s.host : s.parentNode;
}
function H(s, e, t, r) {
  if (s) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? s.parentNode === t && Ve(s, e) : Ve(s, e)) || r && s === t)
        return s;
      if (s === t) break;
    } while (s = Yt(s));
  }
  return null;
}
var Dt = /\s+/g;
function q(s, e, t) {
  if (s && e)
    if (s.classList)
      s.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + s.className + " ").replace(Dt, " ").replace(" " + e + " ", " ");
      s.className = (r + (t ? " " + e : "")).replace(Dt, " ");
    }
}
function m(s, e, t) {
  var r = s && s.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(s, "") : s.currentStyle && (t = s.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function ge(s, e) {
  var t = "";
  if (typeof s == "string")
    t = s;
  else
    do {
      var r = m(s, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (s = s.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function Jt(s, e, t) {
  if (s) {
    var r = s.getElementsByTagName(e), n = 0, o = r.length;
    if (t)
      for (; n < o; n++)
        t(r[n], n);
    return r;
  }
  return [];
}
function U() {
  var s = document.scrollingElement;
  return s || document.documentElement;
}
function k(s, e, t, r, n) {
  if (!(!s.getBoundingClientRect && s !== window)) {
    var o, i, a, l, c, d, u;
    if (s !== window && s.parentNode && s !== U() ? (o = s.getBoundingClientRect(), i = o.top, a = o.left, l = o.bottom, c = o.right, d = o.height, u = o.width) : (i = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && s !== window && (n = n || s.parentNode, !W))
      do
        if (n && n.getBoundingClientRect && (m(n, "transform") !== "none" || t && m(n, "position") !== "static")) {
          var h = n.getBoundingClientRect();
          i -= h.top + parseInt(m(n, "border-top-width")), a -= h.left + parseInt(m(n, "border-left-width")), l = i + o.height, c = a + o.width;
          break;
        }
      while (n = n.parentNode);
    if (r && s !== window) {
      var p = ge(n || s), b = p && p.a, v = p && p.d;
      p && (i /= v, a /= b, u /= b, d /= v, l = i + d, c = a + u);
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
function _t(s, e, t) {
  for (var r = re(s, !0), n = k(s)[e]; r; ) {
    var o = k(r)[t], i = void 0;
    if (i = n >= o, !i) return r;
    if (r === U()) break;
    r = re(r, !1);
  }
  return !1;
}
function be(s, e, t, r) {
  for (var n = 0, o = 0, i = s.children; o < i.length; ) {
    if (i[o].style.display !== "none" && i[o] !== g.ghost && (r || i[o] !== g.dragged) && H(i[o], t.draggable, s, !1)) {
      if (n === e)
        return i[o];
      n++;
    }
    o++;
  }
  return null;
}
function yt(s, e) {
  for (var t = s.lastElementChild; t && (t === g.ghost || m(t, "display") === "none" || e && !Ve(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function N(s, e) {
  var t = 0;
  if (!s || !s.parentNode)
    return -1;
  for (; s = s.previousElementSibling; )
    s.nodeName.toUpperCase() !== "TEMPLATE" && s !== g.clone && (!e || Ve(s, e)) && t++;
  return t;
}
function Pt(s) {
  var e = 0, t = 0, r = U();
  if (s)
    do {
      var n = ge(s), o = n.a, i = n.d;
      e += s.scrollLeft * o, t += s.scrollTop * i;
    } while (s !== r && (s = s.parentNode));
  return [e, t];
}
function Mr(s, e) {
  for (var t in s)
    if (s.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === s[t][r]) return Number(t);
    }
  return -1;
}
function re(s, e) {
  if (!s || !s.getBoundingClientRect) return U();
  var t = s, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var n = m(t);
      if (t.clientWidth < t.scrollWidth && (n.overflowX == "auto" || n.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (n.overflowY == "auto" || n.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return U();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return U();
}
function qr(s, e) {
  if (s && e)
    for (var t in e)
      e.hasOwnProperty(t) && (s[t] = e[t]);
  return s;
}
function Ze(s, e) {
  return Math.round(s.top) === Math.round(e.top) && Math.round(s.left) === Math.round(e.left) && Math.round(s.height) === Math.round(e.height) && Math.round(s.width) === Math.round(e.width);
}
var Le;
function Xt(s, e) {
  return function() {
    if (!Le) {
      var t = arguments, r = this;
      t.length === 1 ? s.call(r, t[0]) : s.apply(r, t), Le = setTimeout(function() {
        Le = void 0;
      }, e);
    }
  };
}
function Fr() {
  clearTimeout(Le), Le = void 0;
}
function Kt(s, e, t) {
  s.scrollLeft += e, s.scrollTop += t;
}
function Wt(s) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(s).cloneNode(!0) : t ? t(s).clone(!0)[0] : s.cloneNode(!0);
}
function Qt(s, e, t) {
  var r = {};
  return Array.from(s.children).forEach(function(n) {
    var o, i, a, l;
    if (!(!H(n, e.draggable, s, !1) || n.animated || n === t)) {
      var c = k(n);
      r.left = Math.min((o = r.left) !== null && o !== void 0 ? o : 1 / 0, c.left), r.top = Math.min((i = r.top) !== null && i !== void 0 ? i : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var R = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function Nr() {
  var s = [], e;
  return {
    captureAnimationState: function() {
      if (s = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(m(n, "display") === "none" || n === g.ghost)) {
            s.push({
              target: n,
              rect: k(n)
            });
            var o = V({}, s[s.length - 1].rect);
            if (n.thisAnimationDuration) {
              var i = ge(n, !0);
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
      s.splice(Mr(s, {
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
        var l = 0, c = a.target, d = c.fromRect, u = k(c), h = c.prevFromRect, p = c.prevToRect, b = a.rect, v = ge(c, !0);
        v && (u.top -= v.f, u.left -= v.e), c.toRect = u, c.thisAnimationDuration && Ze(h, u) && !Ze(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (b.top - u.top) / (b.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = zr(b, h, p, n.options)), Ze(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, b, u, l)), l && (o = !0, i = Math.max(i, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), o ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, i) : typeof r == "function" && r(), s = [];
    },
    animate: function(r, n, o, i) {
      if (i) {
        m(r, "transition", ""), m(r, "transform", "");
        var a = ge(this.el), l = a && a.a, c = a && a.d, d = (n.left - o.left) / (l || 1), u = (n.top - o.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, m(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = jr(r), m(r, "transition", "transform " + i + "ms" + (this.options.easing ? " " + this.options.easing : "")), m(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          m(r, "transition", ""), m(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, i);
      }
    }
  };
}
function jr(s) {
  return s.offsetWidth;
}
function zr(s, e, t, r) {
  return Math.sqrt(Math.pow(e.top - s.top, 2) + Math.pow(e.left - s.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var he = [], et = {
  initializeByDefault: !0
}, Ie = {
  mount: function(e) {
    for (var t in et)
      et.hasOwnProperty(t) && !(t in e) && (e[t] = et[t]);
    he.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), he.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var o = e + "Global";
    he.forEach(function(i) {
      t[i.pluginName] && (t[i.pluginName][o] && t[i.pluginName][o](V({
        sortable: t
      }, r)), t.options[i.pluginName] && t[i.pluginName][e] && t[i.pluginName][e](V({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    he.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, K(r, c.defaults);
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
    return he.forEach(function(n) {
      typeof n.eventProperties == "function" && K(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return he.forEach(function(o) {
      e[o.pluginName] && o.optionListeners && typeof o.optionListeners[t] == "function" && (n = o.optionListeners[t].call(e[o.pluginName], r));
    }), n;
  }
};
function Hr(s) {
  var e = s.sortable, t = s.rootEl, r = s.name, n = s.targetEl, o = s.cloneEl, i = s.toEl, a = s.fromEl, l = s.oldIndex, c = s.newIndex, d = s.oldDraggableIndex, u = s.newDraggableIndex, h = s.originalEvent, p = s.putSortable, b = s.extraEventProperties;
  if (e = e || t && t[R], !!e) {
    var v, D = e.options, L = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !W && !Te ? v = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (v = document.createEvent("Event"), v.initEvent(r, !0, !0)), v.to = i || t, v.from = a || t, v.item = n || t, v.clone = o, v.oldIndex = l, v.newIndex = c, v.oldDraggableIndex = d, v.newDraggableIndex = u, v.originalEvent = h, v.pullMode = p ? p.lastPutMode : void 0;
    var _ = V(V({}, b), Ie.getEventProperties(r, e));
    for (var j in _)
      v[j] = _[j];
    t && t.dispatchEvent(v), D[L] && D[L].call(e, v);
  }
}
var Gr = ["evt"], I = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, o = Rr(r, Gr);
  Ie.pluginEvent.bind(g)(e, t, V({
    dragEl: f,
    parentEl: $,
    ghostEl: y,
    rootEl: C,
    nextEl: de,
    lastDownEl: je,
    cloneEl: E,
    cloneHidden: te,
    dragStarted: Ee,
    putSortable: P,
    activeSortable: g.active,
    originalEvent: n,
    oldIndex: me,
    oldDraggableIndex: De,
    newIndex: F,
    newDraggableIndex: ee,
    hideGhostForTarget: rr,
    unhideGhostForTarget: nr,
    cloneNowHidden: function() {
      te = !0;
    },
    cloneNowShown: function() {
      te = !1;
    },
    dispatchSortableEvent: function(a) {
      T({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, o));
};
function T(s) {
  Hr(V({
    putSortable: P,
    cloneEl: E,
    targetEl: f,
    rootEl: C,
    oldIndex: me,
    oldDraggableIndex: De,
    newIndex: F,
    newDraggableIndex: ee
  }, s));
}
var f, $, y, C, de, je, E, te, me, F, De, ee, Oe, P, pe = !1, Ye = !1, Je = [], ae, z, tt, rt, Bt, Tt, Ee, fe, _e, Pe = !1, Me = !1, ze, B, nt = [], dt = !1, Xe = [], Qe = typeof document < "u", qe = bt, It = Te || W ? "cssFloat" : "float", Ur = Qe && !Ut && !bt && "draggable" in document.createElement("div"), Zt = function() {
  if (Qe) {
    if (W)
      return !1;
    var s = document.createElement("x");
    return s.style.cssText = "pointer-events:auto", s.style.pointerEvents === "auto";
  }
}(), er = function(e, t) {
  var r = m(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), o = be(e, 0, t), i = be(e, 1, t), a = o && m(o), l = i && m(i), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + k(o).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + k(i).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (o && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return i && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return o && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[It] === "none" || i && r[It] === "none" && c + d > n) ? "vertical" : "horizontal";
}, Vr = function(e, t, r) {
  var n = r ? e.left : e.top, o = r ? e.right : e.bottom, i = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || o === l || n + i / 2 === a + c / 2;
}, Yr = function(e, t) {
  var r;
  return Je.some(function(n) {
    var o = n[R].options.emptyInsertThreshold;
    if (!(!o || yt(n))) {
      var i = k(n), a = e >= i.left - o && e <= i.right + o, l = t >= i.top - o && t <= i.bottom + o;
      if (a && l)
        return r = n;
    }
  }), r;
}, tr = function(e) {
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
  (!n || Ne(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, rr = function() {
  !Zt && y && m(y, "display", "none");
}, nr = function() {
  !Zt && y && m(y, "display", "");
};
Qe && !Ut && document.addEventListener("click", function(s) {
  if (Ye)
    return s.preventDefault(), s.stopPropagation && s.stopPropagation(), s.stopImmediatePropagation && s.stopImmediatePropagation(), Ye = !1, !1;
}, !0);
var le = function(e) {
  if (f) {
    e = e.touches ? e.touches[0] : e;
    var t = Yr(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[R]._onDragOver(r);
    }
  }
}, Jr = function(e) {
  f && f.parentNode[R]._isOutsideThisEl(e.target);
};
function g(s, e) {
  if (!(s && s.nodeType && s.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(s));
  this.el = s, this.options = e = K({}, e), s[R] = this;
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
      return er(s, this.options);
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
    supportPointer: g.supportPointer !== !1 && "PointerEvent" in window && (!ke || bt),
    emptyInsertThreshold: 5
  };
  Ie.initializePlugins(this, s, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  tr(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : Ur, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? x(s, "pointerdown", this._onTapStart) : (x(s, "mousedown", this._onTapStart), x(s, "touchstart", this._onTapStart)), this.nativeDraggable && (x(s, "dragover", this), x(s, "dragenter", this)), Je.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), K(this, Nr());
}
g.prototype = /** @lends Sortable.prototype */
{
  constructor: g,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (fe = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, f) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, o = n.preventOnFilter, i = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (rn(r), !f && !(/mousedown|pointerdown/.test(i) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && ke && l && l.tagName.toUpperCase() === "SELECT") && (l = H(l, n.draggable, r, !1), !(l && l.animated) && je !== l)) {
        if (me = N(l), De = N(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            T({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), I("filter", t, {
              evt: e
            }), o && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = H(c, u.trim(), r, !1), u)
            return T({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), I("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          o && e.preventDefault();
          return;
        }
        n.handle && !H(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, o = n.el, i = n.options, a = o.ownerDocument, l;
    if (r && !f && r.parentNode === o) {
      var c = k(r);
      if (C = o, f = r, $ = f.parentNode, de = f.nextSibling, je = r, Oe = i.group, g.dragged = f, ae = {
        target: f,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, Bt = ae.clientX - c.left, Tt = ae.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, f.style["will-change"] = "all", l = function() {
        if (I("delayEnded", n, {
          evt: e
        }), g.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !Lt && n.nativeDraggable && (f.draggable = !0), n._triggerDragStart(e, t), T({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), q(f, i.chosenClass, !0);
      }, i.ignore.split(",").forEach(function(d) {
        Jt(f, d.trim(), ot);
      }), x(a, "dragover", le), x(a, "mousemove", le), x(a, "touchmove", le), i.supportPointer ? (x(a, "pointerup", n._onDrop), !this.nativeDraggable && x(a, "pointercancel", n._onDrop)) : (x(a, "mouseup", n._onDrop), x(a, "touchend", n._onDrop), x(a, "touchcancel", n._onDrop)), Lt && this.nativeDraggable && (this.options.touchStartThreshold = 4, f.draggable = !0), I("delayStart", this, {
        evt: e
      }), i.delay && (!i.delayOnTouchOnly || t) && (!this.nativeDraggable || !(Te || W))) {
        if (g.eventCanceled) {
          this._onDrop();
          return;
        }
        i.supportPointer ? (x(a, "pointerup", n._disableDelayedDrag), x(a, "pointercancel", n._disableDelayedDrag)) : (x(a, "mouseup", n._disableDelayedDrag), x(a, "touchend", n._disableDelayedDrag), x(a, "touchcancel", n._disableDelayedDrag)), x(a, "mousemove", n._delayedDragTouchMoveHandler), x(a, "touchmove", n._delayedDragTouchMoveHandler), i.supportPointer && x(a, "pointermove", n._delayedDragTouchMoveHandler), n._dragStartTimer = setTimeout(l, i.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    f && ot(f), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    w(e, "mouseup", this._disableDelayedDrag), w(e, "touchend", this._disableDelayedDrag), w(e, "touchcancel", this._disableDelayedDrag), w(e, "pointerup", this._disableDelayedDrag), w(e, "pointercancel", this._disableDelayedDrag), w(e, "mousemove", this._delayedDragTouchMoveHandler), w(e, "touchmove", this._delayedDragTouchMoveHandler), w(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? x(document, "pointermove", this._onTouchMove) : t ? x(document, "touchmove", this._onTouchMove) : x(document, "mousemove", this._onTouchMove) : (x(f, "dragend", this), x(C, "dragstart", this._onDragStart));
    try {
      document.selection ? He(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (pe = !1, C && f) {
      I("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && x(document, "dragover", Jr);
      var r = this.options;
      !e && q(f, r.dragClass, !1), q(f, r.ghostClass, !0), g.active = this, e && this._appendGhost(), T({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (z) {
      this._lastX = z.clientX, this._lastY = z.clientY, rr();
      for (var e = document.elementFromPoint(z.clientX, z.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(z.clientX, z.clientY), e !== t); )
        t = e;
      if (f.parentNode[R]._isOutsideThisEl(e), t)
        do {
          if (t[R]) {
            var r = void 0;
            if (r = t[R]._onDragOver({
              clientX: z.clientX,
              clientY: z.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = Yt(t));
      nr();
    }
  },
  _onTouchMove: function(e) {
    if (ae) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, o = e.touches ? e.touches[0] : e, i = y && ge(y, !0), a = y && i && i.a, l = y && i && i.d, c = qe && B && Pt(B), d = (o.clientX - ae.clientX + n.x) / (a || 1) + (c ? c[0] - nt[0] : 0) / (a || 1), u = (o.clientY - ae.clientY + n.y) / (l || 1) + (c ? c[1] - nt[1] : 0) / (l || 1);
      if (!g.active && !pe) {
        if (r && Math.max(Math.abs(o.clientX - this._lastX), Math.abs(o.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (y) {
        i ? (i.e += d - (tt || 0), i.f += u - (rt || 0)) : i = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var h = "matrix(".concat(i.a, ",").concat(i.b, ",").concat(i.c, ",").concat(i.d, ",").concat(i.e, ",").concat(i.f, ")");
        m(y, "webkitTransform", h), m(y, "mozTransform", h), m(y, "msTransform", h), m(y, "transform", h), tt = d, rt = u, z = o;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!y) {
      var e = this.options.fallbackOnBody ? document.body : C, t = k(f, !0, qe, !0, e), r = this.options;
      if (qe) {
        for (B = e; m(B, "position") === "static" && m(B, "transform") === "none" && B !== document; )
          B = B.parentNode;
        B !== document.body && B !== document.documentElement ? (B === document && (B = U()), t.top += B.scrollTop, t.left += B.scrollLeft) : B = U(), nt = Pt(B);
      }
      y = f.cloneNode(!0), q(y, r.ghostClass, !1), q(y, r.fallbackClass, !0), q(y, r.dragClass, !0), m(y, "transition", ""), m(y, "transform", ""), m(y, "box-sizing", "border-box"), m(y, "margin", 0), m(y, "top", t.top), m(y, "left", t.left), m(y, "width", t.width), m(y, "height", t.height), m(y, "opacity", "0.8"), m(y, "position", qe ? "absolute" : "fixed"), m(y, "zIndex", "100000"), m(y, "pointerEvents", "none"), g.ghost = y, e.appendChild(y), m(y, "transform-origin", Bt / parseInt(y.style.width) * 100 + "% " + Tt / parseInt(y.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, o = r.options;
    if (I("dragStart", this, {
      evt: e
    }), g.eventCanceled) {
      this._onDrop();
      return;
    }
    I("setupClone", this), g.eventCanceled || (E = Wt(f), E.removeAttribute("id"), E.draggable = !1, E.style["will-change"] = "", this._hideClone(), q(E, this.options.chosenClass, !1), g.clone = E), r.cloneId = He(function() {
      I("clone", r), !g.eventCanceled && (r.options.removeCloneOnHide || C.insertBefore(E, f), r._hideClone(), T({
        sortable: r,
        name: "clone"
      }));
    }), !t && q(f, o.dragClass, !0), t ? (Ye = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (w(document, "mouseup", r._onDrop), w(document, "touchend", r._onDrop), w(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", o.setData && o.setData.call(r, n, f)), x(document, "drop", r), m(f, "transform", "translateZ(0)")), pe = !0, r._dragStartId = He(r._dragStarted.bind(r, t, e)), x(document, "selectstart", r), Ee = !0, window.getSelection().removeAllRanges(), ke && m(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, o, i, a = this.options, l = a.group, c = g.active, d = Oe === l, u = a.sort, h = P || c, p, b = this, v = !1;
    if (dt) return;
    function D(Se, ar) {
      I(Se, b, V({
        evt: e,
        isOwner: d,
        axis: p ? "vertical" : "horizontal",
        revert: i,
        dragRect: n,
        targetRect: o,
        canSort: u,
        fromSortable: h,
        target: r,
        completed: _,
        onMove: function(Ct, lr) {
          return Fe(C, t, f, n, Ct, k(Ct), e, lr);
        },
        changed: j
      }, ar));
    }
    function L() {
      D("dragOverAnimationCapture"), b.captureAnimationState(), b !== h && h.captureAnimationState();
    }
    function _(Se) {
      return D("dragOverCompleted", {
        insertion: Se
      }), Se && (d ? c._hideClone() : c._showClone(b), b !== h && (q(f, P ? P.options.ghostClass : c.options.ghostClass, !1), q(f, a.ghostClass, !0)), P !== b && b !== g.active ? P = b : b === g.active && P && (P = null), h === b && (b._ignoreWhileAnimating = r), b.animateAll(function() {
        D("dragOverAnimationComplete"), b._ignoreWhileAnimating = null;
      }), b !== h && (h.animateAll(), h._ignoreWhileAnimating = null)), (r === f && !f.animated || r === t && !r.animated) && (fe = null), !a.dragoverBubble && !e.rootEl && r !== document && (f.parentNode[R]._isOutsideThisEl(e.target), !Se && le(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), v = !0;
    }
    function j() {
      F = N(f), ee = N(f, a.draggable), T({
        sortable: b,
        name: "change",
        toEl: t,
        newIndex: F,
        newDraggableIndex: ee,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = H(r, a.draggable, t, !0), D("dragOver"), g.eventCanceled) return v;
    if (f.contains(e.target) || r.animated && r.animatingX && r.animatingY || b._ignoreWhileAnimating === r)
      return _(!1);
    if (Ye = !1, c && !a.disabled && (d ? u || (i = $ !== C) : P === this || (this.lastPutMode = Oe.checkPull(this, c, f, e)) && l.checkPut(this, c, f, e))) {
      if (p = this._getDirection(e, r) === "vertical", n = k(f), D("dragOverValid"), g.eventCanceled) return v;
      if (i)
        return $ = C, L(), this._hideClone(), D("revert"), g.eventCanceled || (de ? C.insertBefore(f, de) : C.appendChild(f)), _(!0);
      var O = yt(t, a.draggable);
      if (!O || Qr(e, p, this) && !O.animated) {
        if (O === f)
          return _(!1);
        if (O && t === e.target && (r = O), r && (o = k(r)), Fe(C, t, f, n, r, o, e, !!r) !== !1)
          return L(), O && O.nextSibling ? t.insertBefore(f, O.nextSibling) : t.appendChild(f), $ = t, j(), _(!0);
      } else if (O && Wr(e, p, this)) {
        var oe = be(t, 0, a, !0);
        if (oe === f)
          return _(!1);
        if (r = oe, o = k(r), Fe(C, t, f, n, r, o, e, !1) !== !1)
          return L(), t.insertBefore(f, oe), $ = t, j(), _(!0);
      } else if (r.parentNode === t) {
        o = k(r);
        var G = 0, ie, ye = f.parentNode !== t, M = !Vr(f.animated && f.toRect || n, r.animated && r.toRect || o, p), ve = p ? "top" : "left", Q = _t(r, "top", "top") || _t(f, "top", "top"), we = Q ? Q.scrollTop : void 0;
        fe !== r && (ie = o[ve], Pe = !1, Me = !M && a.invertSwap || ye), G = Zr(e, r, o, p, M ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, Me, fe === r);
        var Y;
        if (G !== 0) {
          var se = N(f);
          do
            se -= G, Y = $.children[se];
          while (Y && (m(Y, "display") === "none" || Y === y));
        }
        if (G === 0 || Y === r)
          return _(!1);
        fe = r, _e = G;
        var xe = r.nextElementSibling, Z = !1;
        Z = G === 1;
        var Re = Fe(C, t, f, n, r, o, e, Z);
        if (Re !== !1)
          return (Re === 1 || Re === -1) && (Z = Re === 1), dt = !0, setTimeout(Kr, 30), L(), Z && !xe ? t.appendChild(f) : r.parentNode.insertBefore(f, Z ? xe : r), Q && Kt(Q, 0, we - Q.scrollTop), $ = f.parentNode, ie !== void 0 && !Me && (ze = Math.abs(ie - k(r)[ve])), j(), _(!0);
      }
      if (t.contains(f))
        return _(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    w(document, "mousemove", this._onTouchMove), w(document, "touchmove", this._onTouchMove), w(document, "pointermove", this._onTouchMove), w(document, "dragover", le), w(document, "mousemove", le), w(document, "touchmove", le);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    w(e, "mouseup", this._onDrop), w(e, "touchend", this._onDrop), w(e, "pointerup", this._onDrop), w(e, "pointercancel", this._onDrop), w(e, "touchcancel", this._onDrop), w(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, r = this.options;
    if (F = N(f), ee = N(f, r.draggable), I("drop", this, {
      evt: e
    }), $ = f && f.parentNode, F = N(f), ee = N(f, r.draggable), g.eventCanceled) {
      this._nulling();
      return;
    }
    pe = !1, Me = !1, Pe = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), ut(this.cloneId), ut(this._dragStartId), this.nativeDraggable && (w(document, "drop", this), w(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), ke && m(document.body, "user-select", ""), m(f, "transform", ""), e && (Ee && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), y && y.parentNode && y.parentNode.removeChild(y), (C === $ || P && P.lastPutMode !== "clone") && E && E.parentNode && E.parentNode.removeChild(E), f && (this.nativeDraggable && w(f, "dragend", this), ot(f), f.style["will-change"] = "", Ee && !pe && q(f, P ? P.options.ghostClass : this.options.ghostClass, !1), q(f, this.options.chosenClass, !1), T({
      sortable: this,
      name: "unchoose",
      toEl: $,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), C !== $ ? (F >= 0 && (T({
      rootEl: $,
      name: "add",
      toEl: $,
      fromEl: C,
      originalEvent: e
    }), T({
      sortable: this,
      name: "remove",
      toEl: $,
      originalEvent: e
    }), T({
      rootEl: $,
      name: "sort",
      toEl: $,
      fromEl: C,
      originalEvent: e
    }), T({
      sortable: this,
      name: "sort",
      toEl: $,
      originalEvent: e
    })), P && P.save()) : F !== me && F >= 0 && (T({
      sortable: this,
      name: "update",
      toEl: $,
      originalEvent: e
    }), T({
      sortable: this,
      name: "sort",
      toEl: $,
      originalEvent: e
    })), g.active && ((F == null || F === -1) && (F = me, ee = De), T({
      sortable: this,
      name: "end",
      toEl: $,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    I("nulling", this), C = f = $ = y = de = E = je = te = ae = z = Ee = F = ee = me = De = fe = _e = P = Oe = g.dragged = g.ghost = g.clone = g.active = null, Xe.forEach(function(e) {
      e.checked = !0;
    }), Xe.length = tt = rt = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        f && (this._onDragOver(e), Xr(e));
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
      t = r[n], H(t, i.draggable, this.el, !1) && e.push(t.getAttribute(i.dataIdAttr) || tn(t));
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
      H(a, this.options.draggable, n, !1) && (r[o] = a);
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
    return H(e, t || this.options.draggable, this.el, !1);
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
    var n = Ie.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && tr(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    I("destroy", this);
    var e = this.el;
    e[R] = null, w(e, "mousedown", this._onTapStart), w(e, "touchstart", this._onTapStart), w(e, "pointerdown", this._onTapStart), this.nativeDraggable && (w(e, "dragover", this), w(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), Je.splice(Je.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!te) {
      if (I("hideClone", this), g.eventCanceled) return;
      m(E, "display", "none"), this.options.removeCloneOnHide && E.parentNode && E.parentNode.removeChild(E), te = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (te) {
      if (I("showClone", this), g.eventCanceled) return;
      f.parentNode == C && !this.options.group.revertClone ? C.insertBefore(E, f) : de ? C.insertBefore(E, de) : C.appendChild(E), this.options.group.revertClone && this.animate(f, E), m(E, "display", ""), te = !1;
    }
  }
};
function Xr(s) {
  s.dataTransfer && (s.dataTransfer.dropEffect = "move"), s.cancelable && s.preventDefault();
}
function Fe(s, e, t, r, n, o, i, a) {
  var l, c = s[R], d = c.options.onMove, u;
  return window.CustomEvent && !W && !Te ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = s, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = o || k(e), l.willInsertAfter = a, l.originalEvent = i, s.dispatchEvent(l), d && (u = d.call(c, l, i)), u;
}
function ot(s) {
  s.draggable = !1;
}
function Kr() {
  dt = !1;
}
function Wr(s, e, t) {
  var r = k(be(t.el, 0, t.options, !0)), n = Qt(t.el, t.options, y), o = 10;
  return e ? s.clientX < n.left - o || s.clientY < r.top && s.clientX < r.right : s.clientY < n.top - o || s.clientY < r.bottom && s.clientX < r.left;
}
function Qr(s, e, t) {
  var r = k(yt(t.el, t.options.draggable)), n = Qt(t.el, t.options, y), o = 10;
  return e ? s.clientX > n.right + o || s.clientY > r.bottom && s.clientX > r.left : s.clientY > n.bottom + o || s.clientX > r.right && s.clientY > r.top;
}
function Zr(s, e, t, r, n, o, i, a) {
  var l = r ? s.clientY : s.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, h = !1;
  if (!i) {
    if (a && ze < c * n) {
      if (!Pe && (_e === 1 ? l > d + c * o / 2 : l < u - c * o / 2) && (Pe = !0), Pe)
        h = !0;
      else if (_e === 1 ? l < d + ze : l > u - ze)
        return -_e;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return en(e);
  }
  return h = h || i, h && (l < d + c * o / 2 || l > u - c * o / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function en(s) {
  return N(f) < N(s) ? 1 : -1;
}
function tn(s) {
  for (var e = s.tagName + s.className + s.src + s.href + s.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function rn(s) {
  Xe.length = 0;
  for (var e = s.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && Xe.push(r);
  }
}
function He(s) {
  return setTimeout(s, 0);
}
function ut(s) {
  return clearTimeout(s);
}
Qe && x(document, "touchmove", function(s) {
  (g.active || pe) && s.cancelable && s.preventDefault();
});
g.utils = {
  on: x,
  off: w,
  css: m,
  find: Jt,
  is: function(e, t) {
    return !!H(e, t, e, !1);
  },
  extend: qr,
  throttle: Xt,
  closest: H,
  toggleClass: q,
  clone: Wt,
  index: N,
  nextTick: He,
  cancelNextTick: ut,
  detectDirection: er,
  getChild: be,
  expando: R
};
g.get = function(s) {
  return s[R];
};
g.mount = function() {
  for (var s = arguments.length, e = new Array(s), t = 0; t < s; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (g.utils = V(V({}, g.utils), r.utils)), Ie.mount(r);
  });
};
g.create = function(s, e) {
  return new g(s, e);
};
g.version = Or;
var A = [], $e, ht, ft = !1, it, st, Ke, Ae;
function nn() {
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
      this.sortable.nativeDraggable ? x(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? x(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? x(document, "touchmove", this._handleFallbackAutoScroll) : x(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var r = t.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? w(document, "dragover", this._handleAutoScroll) : (w(document, "pointermove", this._handleFallbackAutoScroll), w(document, "touchmove", this._handleFallbackAutoScroll), w(document, "mousemove", this._handleFallbackAutoScroll)), Rt(), Ge(), Fr();
    },
    nulling: function() {
      Ke = ht = $e = ft = Ae = it = st = null, A.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, o = (t.touches ? t.touches[0] : t).clientX, i = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(o, i);
      if (Ke = t, r || this.options.forceAutoScrollFallback || Te || W || ke) {
        at(t, this.options, a, r);
        var l = re(a, !0);
        ft && (!Ae || o !== it || i !== st) && (Ae && Rt(), Ae = setInterval(function() {
          var c = re(document.elementFromPoint(o, i), !0);
          c !== l && (l = c, Ge()), at(t, n.options, c, r);
        }, 10), it = o, st = i);
      } else {
        if (!this.options.bubbleScroll || re(a, !0) === U()) {
          Ge();
          return;
        }
        at(t, this.options, re(a, !1), !1);
      }
    }
  }, K(s, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function Ge() {
  A.forEach(function(s) {
    clearInterval(s.pid);
  }), A = [];
}
function Rt() {
  clearInterval(Ae);
}
var at = Xt(function(s, e, t, r) {
  if (e.scroll) {
    var n = (s.touches ? s.touches[0] : s).clientX, o = (s.touches ? s.touches[0] : s).clientY, i = e.scrollSensitivity, a = e.scrollSpeed, l = U(), c = !1, d;
    ht !== t && (ht = t, Ge(), $e = e.scroll, d = e.scrollFn, $e === !0 && ($e = re(t, !0)));
    var u = 0, h = $e;
    do {
      var p = h, b = k(p), v = b.top, D = b.bottom, L = b.left, _ = b.right, j = b.width, O = b.height, oe = void 0, G = void 0, ie = p.scrollWidth, ye = p.scrollHeight, M = m(p), ve = p.scrollLeft, Q = p.scrollTop;
      p === l ? (oe = j < ie && (M.overflowX === "auto" || M.overflowX === "scroll" || M.overflowX === "visible"), G = O < ye && (M.overflowY === "auto" || M.overflowY === "scroll" || M.overflowY === "visible")) : (oe = j < ie && (M.overflowX === "auto" || M.overflowX === "scroll"), G = O < ye && (M.overflowY === "auto" || M.overflowY === "scroll"));
      var we = oe && (Math.abs(_ - n) <= i && ve + j < ie) - (Math.abs(L - n) <= i && !!ve), Y = G && (Math.abs(D - o) <= i && Q + O < ye) - (Math.abs(v - o) <= i && !!Q);
      if (!A[u])
        for (var se = 0; se <= u; se++)
          A[se] || (A[se] = {});
      (A[u].vx != we || A[u].vy != Y || A[u].el !== p) && (A[u].el = p, A[u].vx = we, A[u].vy = Y, clearInterval(A[u].pid), (we != 0 || Y != 0) && (c = !0, A[u].pid = setInterval(function() {
        r && this.layer === 0 && g.active._onTouchMove(Ke);
        var xe = A[this.layer].vy ? A[this.layer].vy * a : 0, Z = A[this.layer].vx ? A[this.layer].vx * a : 0;
        typeof d == "function" && d.call(g.dragged.parentNode[R], Z, xe, s, Ke, A[this.layer].el) !== "continue" || Kt(A[this.layer].el, Z, xe);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && h !== l && (h = re(h, !1)));
    ft = c;
  }
}, 30), or = function(e) {
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
function vt() {
}
vt.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = be(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: or
};
K(vt, {
  pluginName: "revertOnSpill"
});
function wt() {
}
wt.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: or
};
K(wt, {
  pluginName: "removeOnSpill"
});
g.mount(new nn());
g.mount(wt, vt);
class on {
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
    ].forEach(([v, D]) => {
      const L = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      L.setAttribute("cx", String(v)), L.setAttribute("cy", String(D)), L.setAttribute("r", "1.5"), l.appendChild(L);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = o;
    const h = document.createElement("input");
    h.type = "checkbox", h.id = o, h.dataset.column = e, h.checked = r, h.setAttribute("role", "switch"), h.setAttribute("aria-checked", String(r)), h.setAttribute("aria-labelledby", `${n}-label`), h.setAttribute("aria-describedby", `${n}-desc`);
    const p = document.createElement("span");
    p.id = `${n}-desc`, p.className = "sr-only", p.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const b = document.createElement("span");
    return b.className = "column-switch-slider", b.setAttribute("aria-hidden", "true"), u.appendChild(h), u.appendChild(b), i.appendChild(a), i.appendChild(u), i.appendChild(p), i;
  }
  /**
   * Setup SortableJS for drag-and-drop reordering
   */
  setupDragAndDrop() {
    const e = this.container.querySelector(".column-list") || this.container;
    this.sortable = g.create(e, {
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
class sn {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new We(), this.selectors = {
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
    }, this.state = {
      currentPage: 1,
      perPage: this.config.perPage || 10,
      totalRows: 0,
      search: "",
      filters: [],
      sort: [],
      selectedRows: /* @__PURE__ */ new Set(),
      hiddenColumns: new Set(
        this.config.columns.filter((t) => t.hidden).map((t) => t.field)
      ),
      columnOrder: this.config.columns.map((t) => t.field)
      // Initialize with config column order
    }, this.actionRenderer = new mr({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new Br(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([t, r]) => {
      this.cellRendererRegistry.register(t, r);
    }), this.defaultColumns = this.config.columns.map((t) => ({ ...t }));
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
      t.innerHTML = `
        <tr>
          <td colspan="${this.config.columns.length + 2}" class="px-6 py-8 text-center text-gray-500">
            No results found
          </td>
        </tr>
      `;
      return;
    }
    this.recordsById = {}, r.forEach((o, i) => {
      console.log(`[DataGrid] Rendering row ${i + 1}: id=${o.id}, email=${o.email}, role=${o.role}, status=${o.status}`), o.id && (this.recordsById[o.id] = o);
      const a = this.createTableRow(o);
      t.appendChild(a);
    }), console.log(`[DataGrid] Finished appending ${r.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length), this.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((i) => {
      const a = i.dataset.column;
      a && this.state.hiddenColumns.has(a) && (i.style.display = "none");
    }), this.updateSelectionBindings();
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
    !e || !t || (this.columnManager = new on({
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
          } catch (b) {
            console.error("Bulk action failed:", b), this.showError("Bulk action failed");
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
    return e instanceof Response ? jt(e) : e instanceof Error ? e.message : "An unexpected error occurred";
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
typeof window < "u" && (window.DataGrid = sn);
const Ot = {
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
class Kn {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new We();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Ot[e.type] || Ot.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new Et({
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
    new Et({
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
const Mt = {
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
class Wn {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new We(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Mt[e.type] || Mt.text;
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
class Qn {
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
class Zn {
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
class eo {
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
class to {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class ro {
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
    const r = an(t, this.config, e);
    r.delivery = ln(this.config, e);
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
      throw ce(t, "error", i), o;
    }
    if (n.status === 202) {
      const o = await n.json().catch(() => ({}));
      ce(t, "info", "Export queued. You can download it when ready.");
      const i = o?.status_url || "";
      if (i) {
        const a = un(o, i);
        try {
          await hn(i, {
            intervalMs: cn(this.config),
            timeoutMs: dn(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await pt(l);
            throw ce(t, "error", c), new Error(c);
          }
          await Ft(l, r.definition || r.resource || "export", r.format), ce(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw ce(t, "error", c), l;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const o = await pt(n);
      throw ce(t, "error", o), new Error(o);
    }
    await Ft(n, r.definition || r.resource || "export", r.format), ce(t, "success", "Export ready.");
  }
}
function an(s, e, t) {
  const r = wn(t), n = pn(s, e), o = mn(s, e), i = gn(s), a = bn(i), l = {
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
function ln(s, e) {
  return s.delivery ? s.delivery : (s.asyncFormats && s.asyncFormats.length > 0 ? s.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function cn(s) {
  const e = Number(s.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function dn(s) {
  const e = Number(s.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function un(s, e) {
  return s?.download_url ? s.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function hn(s, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await fetch(s, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const a = await pt(n);
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
    await fn(r);
  }
}
function fn(s) {
  return new Promise((e) => setTimeout(e, s));
}
function pn(s, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(s.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function mn(s, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = s.state?.hiddenColumns ? new Set(s.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(s.state?.columnOrder) && s.state.columnOrder.length > 0 ? s.state.columnOrder : s.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function gn(s) {
  const e = {}, t = s.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(s.state.currentPage, s.state.perPage)), s.state.search && t.search && Object.assign(e, t.search.buildQuery(s.state.search)), s.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(s.state.filters)), s.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(s.state.sort)), e;
}
function bn(s) {
  const e = {}, t = [];
  return Object.entries(s).forEach(([r, n]) => {
    if (n == null || n === "")
      return;
    switch (r) {
      case "limit":
        e.limit = qt(n);
        return;
      case "offset":
        e.offset = qt(n);
        return;
      case "order":
      case "sort":
        e.sort = vn(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: o, op: i } = yn(r);
    o && t.push({ field: o, op: i, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function yn(s) {
  const e = s.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function vn(s) {
  return s ? s.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", n = t[1] || "asc";
    return { field: r, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function wn(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function qt(s) {
  const e = Number(s);
  return Number.isFinite(e) ? e : 0;
}
async function Ft(s, e, t) {
  const r = await s.blob(), n = xn(s, e, t), o = URL.createObjectURL(r), i = document.createElement("a");
  i.href = o, i.download = n, i.rel = "noopener", document.body.appendChild(i), i.click(), i.remove(), URL.revokeObjectURL(o);
}
function xn(s, e, t) {
  const r = s.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return Sn(r) || n;
}
function Sn(s) {
  if (!s) return null;
  const e = s.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = s.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function pt(s) {
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
function ce(s, e, t) {
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
class no {
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
function Cn(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function En(s) {
  const e = (s || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function ir(s) {
  return typeof s == "object" && s !== null && "version" in s && s.version === 2;
}
class $n {
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
      if (ir(t))
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
class oo extends $n {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = Cn(t.basePath), o = En(t.apiBasePath);
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
      return ir(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
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
const Nt = {
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
}, An = 5e3;
class kn {
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
    return this.config.actionOrderOverride?.[r] !== void 0 ? this.config.actionOrderOverride[r] : Nt[r] !== void 0 ? Nt[r] : An;
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
    const t = await zt(e.endpoint, e.payload);
    if (t.success)
      return this.config.onActionSuccess?.(e.actionName, t), e.actionName.toLowerCase() === "create_translation" && t.data && this.handleCreateTranslationSuccess(t.data, e.payload), t;
    if (!t.error)
      return t;
    if (cr(t.error)) {
      const n = dr(t.error);
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
    const { PayloadInputModal: i } = await Promise.resolve().then(() => Ln), a = t.map((c) => {
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
      const p = i?.toLowerCase() === h, b = a.includes(h), v = [];
      b && v.push("Required for publishing"), l.length > 0 && v.push(`${l.length} translation${l.length > 1 ? "s" : ""} exist`);
      const D = v.length > 0 ? v.join(" • ") : void 0;
      let L = `${h.toUpperCase()} - ${this.localeLabel(h)}`;
      p && (L += " (recommended)"), d.push({
        value: h,
        label: L,
        description: D,
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
    return ur(t, `${e} failed`);
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
function io(s, e, t) {
  return new kn(t).buildRowActions(s, e);
}
function so(s) {
  return s.schema?.actions;
}
class xt extends mt {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = r;
  }
  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(e) {
    return new Promise((t) => {
      new xt(
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
          <h3 class="text-lg font-semibold text-gray-900">${S(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${S(this.modalConfig.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${S(this.modalConfig.confirmLabel ?? "Continue")}
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${S(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${S(e.label)}
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
      return `<option value="${S(i.value)}"${a}>${S(i.label)}</option>`;
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
      const l = i.value === r ? " checked" : "", c = i.description ? `<span class="text-xs text-gray-500 block ml-6 mt-0.5">${S(i.description)}</span>` : "";
      return `
          <label class="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${i.recommended ? "bg-blue-50 border border-blue-200" : ""}">
            <input type="radio"
                   name="payload-radio-${e.name}"
                   value="${S(i.value)}"
                   data-payload-radio="${e.name}"
                   class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                   ${l} />
            <span class="flex-1">
              <span class="text-sm font-medium text-gray-900">${S(i.label)}</span>
              ${c}
            </span>
          </label>
        `;
    }).join(""), o = r || "";
    return `
      <div class="space-y-1" data-payload-radio-group="${e.name}">
        <input type="hidden"
               data-payload-field="${e.name}"
               value="${S(o)}" />
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${S(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${S(e.value)}"
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
const Ln = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PayloadInputModal: xt
}, Symbol.toStringTag, { value: "Module" }));
class St extends mt {
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
      new St({
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
                Cannot ${S(e)} ${S(t)}
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
            Retry ${S(e)}
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
          data-locale-item="${S(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${S(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${S(o)}
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
                      ${S(l)}
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
              data-locale="${S(e)}"
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
      <a href="${S(a)}"
         data-blocker-action="open"
         data-locale="${S(e)}"
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
        const n = `${this.config.apiEndpoint}/actions/create_translation`, o = await zt(n, r);
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
async function ao(s) {
  try {
    await St.showBlocker(s);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = s.transition || "complete action", r = s.missingLocales.join(", "), n = `Cannot ${t}: Missing translations for ${r}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(n) : alert(n);
  }
}
const Dn = [
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
class sr {
  constructor(e) {
    this.container = null;
    const t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
    this.config = {
      container: t,
      containerClass: e.containerClass || "",
      title: e.title || "",
      orientation: e.orientation || "horizontal",
      size: e.size || "default",
      items: e.items || Dn
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
    const { title: e, orientation: t, size: r, items: n, containerClass: o } = this.config, i = t === "vertical", a = r === "sm", l = i ? "flex-col" : "flex-row flex-wrap", c = a ? "gap-2" : "gap-4", d = a ? "text-xs" : "text-sm", u = a ? "text-sm" : "text-base", h = e ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${d}">${this.escapeHtml(e)}</span>` : "", p = n.map((b) => this.renderItem(b, u, d)).join("");
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
function _n(s) {
  const e = new sr(s);
  return e.render(), e;
}
function lo() {
  const s = document.querySelectorAll("[data-status-legend]"), e = [];
  return s.forEach((t) => {
    if (t.hasAttribute("data-status-legend-init"))
      return;
    const r = t.dataset.orientation || "horizontal", n = t.dataset.size || "default", o = t.dataset.title || "", i = _n({
      container: t,
      orientation: r,
      size: n,
      title: o
    });
    t.setAttribute("data-status-legend-init", "true"), e.push(i);
  }), e;
}
function co(s = {}) {
  const e = document.createElement("div");
  return new sr({
    container: e,
    ...s
  }).buildHTML();
}
export {
  mr as ActionRenderer,
  Kn as AdvancedSearch,
  Br as CellRendererRegistry,
  on as ColumnManager,
  Xn as CommonRenderers,
  Dn as DEFAULT_STATUS_LEGEND_ITEMS,
  sn as DataGrid,
  $n as DefaultColumnVisibilityBehavior,
  Wn as FilterBuilder,
  no as GoCrudBulkActionBehavior,
  ro as GoCrudExportBehavior,
  Zn as GoCrudFilterBehavior,
  eo as GoCrudPaginationBehavior,
  Qn as GoCrudSearchBehavior,
  to as GoCrudSortBehavior,
  xt as PayloadInputModal,
  kn as SchemaActionBuilder,
  oo as ServerColumnVisibilityBehavior,
  sr as StatusLegend,
  St as TranslationBlockerModal,
  io as buildSchemaRowActions,
  wr as createLocaleBadgeRenderer,
  _n as createStatusLegend,
  $t as createTranslationStatusRenderer,
  fo as extractExchangeError,
  so as extractSchemaActions,
  Be as extractTranslationContext,
  ne as extractTranslationReadiness,
  po as generateExchangeReport,
  Yn as getMissingTranslationsCount,
  mo as groupRowResultsByStatus,
  Vn as hasMissingTranslations,
  qn as hasTranslationContext,
  Fn as hasTranslationReadiness,
  lo as initStatusLegends,
  go as isExchangeError,
  Mn as isInFallbackMode,
  Nn as isReadyForTransition,
  bo as parseImportResult,
  br as renderAvailableLocalesIndicator,
  Jn as renderFallbackWarning,
  Gt as renderLocaleBadge,
  Gn as renderLocaleCompleteness,
  Un as renderMissingTranslationsBadge,
  Hn as renderPublishReadinessBadge,
  zn as renderReadinessIndicator,
  jn as renderStatusBadge,
  co as renderStatusLegendHTML,
  yr as renderTranslationStatusCell,
  ao as showTranslationBlocker
};
//# sourceMappingURL=index.js.map

import { F as Xe } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as Ot, executeActionRequest as Rt, isTranslationBlocker as rr, extractTranslationBlocker as nr } from "../toast/error-helpers.js";
import { extractExchangeError as Bn, generateExchangeReport as Tn, groupRowResultsByStatus as _n, isExchangeError as In, parseImportResult as On } from "../toast/error-helpers.js";
import { M as dt, e as E, T as yt } from "../chunks/modal-DXPBR0f5.js";
import { b as Ge, a as or } from "../chunks/badge-CqKzZ9y5.js";
let ir = class Mt extends dt {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.config = e, this.onConfirm = t, this.onCancel = r;
  }
  static prompt(e) {
    return new Promise((t) => {
      new Mt(
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
          <h3 class="text-lg font-semibold text-gray-900">${E(this.config.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${E(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${E(this.config.confirmLabel ?? "Continue")}
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
      for (const s of this.config.fields) {
        const a = this.container?.querySelector(
          `[data-payload-field="${s.name}"]`
        );
        if (!a)
          continue;
        const l = a.value.trim();
        n[s.name] = l, l || (o || (o = a), this.showFieldError(s.name, "This field is required."));
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${E(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${E(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, n = (e.options || []).map((o) => {
      const s = o.value === t ? " selected" : "";
      return `<option value="${E(o.value)}"${s}>${E(o.label)}</option>`;
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${E(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${E(e.value)}"
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
class sr {
  constructor(e = {}) {
    this.actionBasePath = e.actionBasePath || "", this.mode = e.mode || "dropdown", this.notifier = e.notifier || new Xe();
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
      const s = this.getVariantClass(o.variant || "secondary"), a = o.icon ? this.renderIcon(o.icon) : "", l = o.className || "";
      return `
        <button
          type="button"
          class="btn btn-sm ${s} ${l}"
          data-action-id="${this.sanitize(o.label)}"
          data-record-id="${e.id}"
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
      (s) => !s.condition || s.condition(e)
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
      const o = r.variant === "danger", s = r.icon ? this.renderIcon(r.icon) : "";
      return `
        ${this.shouldShowDivider(r, n, t) ? '<div class="action-divider border-t border-gray-200 my-1"></div>' : ""}
        <button type="button"
                class="${o ? "action-item text-red-600 hover:bg-red-50" : "action-item text-gray-700 hover:bg-gray-50"} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(r.label)}"
                data-record-id="${e.id}"
                role="menuitem">
          <span class="flex-shrink-0 w-5 h-5">${s}</span>
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
      ).forEach((s) => {
        const a = s, l = a.dataset.recordId, c = r[l];
        c && a.addEventListener("click", async (d) => {
          d.preventDefault();
          try {
            await n.action(c);
          } catch (u) {
            console.error(`Action "${n.label}" failed:`, u);
            const f = u instanceof Error ? u.message : `Action "${n.label}" failed`;
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
    const r = document.createElement("span");
    r.className = "text-sm font-medium text-blue-900", r.id = "selected-count", r.textContent = "0 items selected", t.appendChild(r);
    const n = document.createElement("div");
    n.className = "flex gap-2 flex-1", e.forEach((s) => {
      const a = document.createElement("button");
      a.type = "button", a.className = "btn btn-sm btn-primary", a.dataset.bulkAction = s.id, s.icon ? a.innerHTML = `${this.renderIcon(s.icon)} ${s.label}` : a.textContent = s.label, n.appendChild(a);
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
          const s = await Ot(n);
          throw this.notifier.error(s), new Error(s);
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
    const s = this.collectRequiredFields(e.payloadRequired, n).filter((l) => l !== "ids" && this.isEmptyPayloadValue(r[l]));
    if (s.length === 0)
      return r;
    const a = await this.requestRequiredFields(e, s, n, r);
    if (a === null)
      return null;
    for (const l of s) {
      const c = n?.properties?.[l], d = a[l] ?? "", u = this.coercePromptValue(d, l, c);
      if (u.error)
        return this.notifier.error(u.error), null;
      r[l] = u.value;
    }
    return r;
  }
  collectRequiredFields(e, t) {
    const r = [], n = /* @__PURE__ */ new Set(), o = (s) => {
      const a = s.trim();
      !a || n.has(a) || (n.add(a), r.push(a));
    };
    return Array.isArray(e) && e.forEach((s) => o(String(s))), Array.isArray(t?.required) && t.required.forEach((s) => o(String(s))), r;
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
    const o = t.map((s) => {
      const a = r?.properties?.[s], l = typeof a?.type == "string" ? a.type.toLowerCase() : "string";
      return {
        name: s,
        label: (a?.title || s).trim(),
        description: (a?.description || "").trim() || void 0,
        value: this.stringifyPromptDefault(n[s] !== void 0 ? n[s] : a?.default),
        type: l,
        options: this.buildSchemaOptions(a)
      };
    });
    return ir.prompt({
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
      const s = r.oneOf.find(
        (a) => a && Object.prototype.hasOwnProperty.call(a, "const") && this.stringifyPromptDefault(a.const) === e
      );
      if (!s || !Object.prototype.hasOwnProperty.call(s, "const")) {
        const a = r.oneOf.map((l) => typeof l?.title == "string" && l.title.trim() ? l.title.trim() : this.stringifyPromptDefault(l.const)).filter((l) => l !== "").join(", ");
        return { value: e, error: `${t} must be one of: ${a}` };
      }
      return { value: s.const };
    }
    const n = (r?.type || "string").toLowerCase();
    if (e === "")
      return { value: "" };
    let o = e;
    switch (n) {
      case "integer": {
        const s = Number.parseInt(e, 10);
        if (Number.isNaN(s))
          return { value: e, error: `${t} must be an integer.` };
        o = s;
        break;
      }
      case "number": {
        const s = Number.parseFloat(e);
        if (Number.isNaN(s))
          return { value: e, error: `${t} must be a number.` };
        o = s;
        break;
      }
      case "boolean": {
        const s = e.toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(s)) {
          o = !0;
          break;
        }
        if (["false", "0", "no", "n", "off"].includes(s)) {
          o = !1;
          break;
        }
        return { value: e, error: `${t} must be true/false.` };
      }
      case "array":
      case "object": {
        try {
          const s = JSON.parse(e);
          if (n === "array" && !Array.isArray(s))
            return { value: e, error: `${t} must be a JSON array.` };
          if (n === "object" && (s === null || Array.isArray(s) || typeof s != "object"))
            return { value: e, error: `${t} must be a JSON object.` };
          o = s;
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
    const n = e.label || e.id || "Bulk action", o = t && typeof t == "object" ? t.summary : null, s = o && typeof o.succeeded == "number" ? o.succeeded : typeof t?.processed == "number" ? t.processed : r, a = o && typeof o.failed == "number" ? o.failed : 0;
    return a > 0 ? `${n} completed: ${s} succeeded, ${a} failed.` : `${n} completed for ${s} item${s === 1 ? "" : "s"}.`;
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
function De(i) {
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
  return !i || typeof i != "object" || (e.requestedLocale = ce(i, [
    "requested_locale",
    "translation.meta.requested_locale",
    "content_translation.meta.requested_locale"
  ]), e.resolvedLocale = ce(i, [
    "resolved_locale",
    "locale",
    "translation.meta.resolved_locale",
    "content_translation.meta.resolved_locale"
  ]), e.availableLocales = dr(i, [
    "available_locales",
    "translation.meta.available_locales",
    "content_translation.meta.available_locales"
  ]), e.missingRequestedLocale = xt(i, [
    "missing_requested_locale",
    "translation.meta.missing_requested_locale",
    "content_translation.meta.missing_requested_locale"
  ]), e.fallbackUsed = xt(i, [
    "fallback_used",
    "translation.meta.fallback_used",
    "content_translation.meta.fallback_used"
  ]), e.translationGroupId = ce(i, [
    "translation_group_id",
    "translation.meta.translation_group_id",
    "content_translation.meta.translation_group_id"
  ]), e.status = ce(i, ["status"]), e.entityType = ce(i, ["entity_type", "type", "_type"]), e.recordId = ce(i, ["id"]), !e.fallbackUsed && e.requestedLocale && e.resolvedLocale && (e.fallbackUsed = e.requestedLocale !== e.resolvedLocale), !e.missingRequestedLocale && e.fallbackUsed && (e.missingRequestedLocale = !0)), e;
}
function hn(i) {
  const e = De(i);
  return e.fallbackUsed || e.missingRequestedLocale;
}
function fn(i) {
  const e = De(i);
  return e.translationGroupId !== null || e.resolvedLocale !== null || e.availableLocales.length > 0;
}
function Ft(i, e = {}) {
  const t = "resolvedLocale" in i ? i : De(i), { showFallbackIndicator: r = !0, size: n = "default", extraClass: o = "" } = e;
  if (!t.resolvedLocale)
    return "";
  const s = t.resolvedLocale.toUpperCase(), a = t.fallbackUsed || t.missingRequestedLocale, c = `inline-flex items-center gap-1 rounded font-medium ${n === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`;
  return a && r ? `<span class="${c} bg-amber-100 text-amber-800 ${o}"
                  title="Showing ${t.resolvedLocale} content (${t.requestedLocale || "requested locale"} not available)"
                  aria-label="Fallback locale: ${s}">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      ${s}
    </span>` : `<span class="${c} bg-blue-100 text-blue-800 ${o}"
                title="Locale: ${s}"
                aria-label="Locale: ${s}">
    ${s}
  </span>`;
}
function ar(i, e = {}) {
  const t = "resolvedLocale" in i ? i : De(i), { maxLocales: r = 3, size: n = "default" } = e;
  if (t.availableLocales.length === 0)
    return "";
  const o = n === "sm" ? "text-xs gap-0.5" : "text-xs gap-1", s = n === "sm" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5", a = t.availableLocales.slice(0, r), l = t.availableLocales.length - r, c = a.map((u) => `<span class="${u === t.resolvedLocale ? `${s} rounded bg-blue-100 text-blue-700 font-medium` : `${s} rounded bg-gray-100 text-gray-600`}">${u.toUpperCase()}</span>`).join(""), d = l > 0 ? `<span class="${s} rounded bg-gray-100 text-gray-500">+${l}</span>` : "";
  return `<span class="inline-flex items-center ${o}"
                title="Available locales: ${t.availableLocales.join(", ")}"
                aria-label="Available locales: ${t.availableLocales.join(", ")}">
    ${c}${d}
  </span>`;
}
function lr(i, e = {}) {
  const t = "resolvedLocale" in i ? i : De(i), { showResolvedLocale: r = !0, size: n = "default" } = e, o = [];
  return r && t.resolvedLocale && o.push(Ft(t, { size: n, showFallbackIndicator: !0 })), t.availableLocales.length > 1 && o.push(ar(t, { ...e, size: n })), o.length === 0 ? '<span class="text-gray-400">-</span>' : `<div class="flex items-center flex-wrap ${n === "sm" ? "gap-1" : "gap-2"}">${o.join("")}</div>`;
}
function pn(i, e = "default") {
  if (!i)
    return "";
  const t = i.toLowerCase();
  return Ge(i, "status", t, { size: e === "sm" ? "sm" : void 0 });
}
function mn(i, e = {}) {
  if (!i.fallbackUsed && !i.missingRequestedLocale)
    return "";
  const { showCreateButton: t = !0, createTranslationUrl: r, panelName: n } = e, o = i.requestedLocale || "requested locale", s = i.resolvedLocale || "default", a = t ? `
    <button type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            data-action="create-translation"
            data-locale="${i.requestedLocale || ""}"
            data-panel="${n || ""}"
            data-record-id="${i.recordId || ""}"
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
         data-requested-locale="${i.requestedLocale || ""}"
         data-resolved-locale="${i.resolvedLocale || ""}">
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
            You're viewing content from <strong>${s.toUpperCase()}</strong>.
            <span class="block mt-1 text-amber-600">Editing is disabled until you create the missing translation.</span>
          </p>
          ${a ? `<div class="mt-3">${a}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}
function wt(i = {}) {
  return (e, t, r) => lr(t, i);
}
function cr(i = {}) {
  return (e, t, r) => Ft(t, i);
}
function ce(i, e) {
  for (const t of e) {
    const r = ut(i, t);
    if (typeof r == "string" && r.trim())
      return r;
  }
  return null;
}
function dr(i, e) {
  for (const t of e) {
    const r = ut(i, t);
    if (Array.isArray(r))
      return r.filter((n) => typeof n == "string");
  }
  return [];
}
function xt(i, e) {
  for (const t of e) {
    const r = ut(i, t);
    if (typeof r == "boolean")
      return r;
    if (r === "true") return !0;
    if (r === "false") return !1;
  }
  return !1;
}
function ut(i, e) {
  const t = e.split(".");
  let r = i;
  for (const n of t) {
    if (r == null || typeof r != "object")
      return;
    r = r[n];
  }
  return r;
}
class ur {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map(), this.defaultRenderer = (e) => e == null ? '<span class="text-gray-400">-</span>' : typeof e == "boolean" ? e ? "Yes" : "No" : String(e), this.registerDefaultRenderers();
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
      return Ge(String(e), "status", t);
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
    }), this.renderers.set("_array", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.join(", ")), this.renderers.set("_tags", (e) => !Array.isArray(e) || e.length === 0 ? '<span class="text-gray-400">-</span>' : e.map(
      (t) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${t}</span>`
    ).join("")), this.renderers.set("_image", (e) => e ? `<img src="${e}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />` : '<span class="text-gray-400">-</span>'), this.renderers.set("_avatar", (e, t) => {
      const r = t.name || t.username || t.email || "U", n = r.charAt(0).toUpperCase();
      return e ? `<img src="${e}" alt="${r}" class="h-8 w-8 rounded-full object-cover" />` : `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${n}</div>`;
    });
  }
}
const gn = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (i) => (e) => {
    const t = String(e).toLowerCase();
    return Ge(String(e), "status", t);
  },
  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (i) => (e) => {
    const t = String(e).toLowerCase();
    return Ge(String(e), "role", t);
  },
  /**
   * Combined name+email renderer
   */
  userInfo: (i, e) => {
    const t = i || e.name || e.username || "-", r = e.email || "";
    return r ? `<div><div class="font-medium text-gray-900">${t}</div><div class="text-sm text-gray-500">${r}</div></div>` : `<div class="font-medium text-gray-900">${t}</div>`;
  },
  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (i) => (e) => or(!!e, i),
  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (i) => {
    if (!i) return '<span class="text-gray-400">-</span>';
    try {
      const e = new Date(i), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(r / 6e4), o = Math.floor(r / 36e5), s = Math.floor(r / 864e5);
      return n < 1 ? "Just now" : n < 60 ? `${n} minute${n > 1 ? "s" : ""} ago` : o < 24 ? `${o} hour${o > 1 ? "s" : ""} ago` : s < 30 ? `${s} day${s > 1 ? "s" : ""} ago` : e.toLocaleDateString();
    } catch {
      return String(i);
    }
  },
  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: cr(),
  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: wt(),
  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: wt({ size: "sm", maxLocales: 2 })
};
/**!
 * Sortable 1.15.6
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
function Et(i, e) {
  var t = Object.keys(i);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(i);
    e && (r = r.filter(function(n) {
      return Object.getOwnPropertyDescriptor(i, n).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function V(i) {
  for (var e = 1; e < arguments.length; e++) {
    var t = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Et(Object(t), !0).forEach(function(r) {
      hr(i, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(i, Object.getOwnPropertyDescriptors(t)) : Et(Object(t)).forEach(function(r) {
      Object.defineProperty(i, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return i;
}
function Me(i) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Me = function(e) {
    return typeof e;
  } : Me = function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Me(i);
}
function hr(i, e, t) {
  return e in i ? Object.defineProperty(i, e, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : i[e] = t, i;
}
function J() {
  return J = Object.assign || function(i) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (i[r] = t[r]);
    }
    return i;
  }, J.apply(this, arguments);
}
function fr(i, e) {
  if (i == null) return {};
  var t = {}, r = Object.keys(i), n, o;
  for (o = 0; o < r.length; o++)
    n = r[o], !(e.indexOf(n) >= 0) && (t[n] = i[n]);
  return t;
}
function pr(i, e) {
  if (i == null) return {};
  var t = fr(i, e), r, n;
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(i);
    for (n = 0; n < o.length; n++)
      r = o[n], !(e.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(i, r) && (t[r] = i[r]);
  }
  return t;
}
var mr = "1.15.6";
function X(i) {
  if (typeof window < "u" && window.navigator)
    return !!/* @__PURE__ */ navigator.userAgent.match(i);
}
var W = X(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i), Pe = X(/Edge/i), St = X(/firefox/i), Ce = X(/safari/i) && !X(/chrome/i) && !X(/android/i), ht = X(/iP(ad|od|hone)/i), qt = X(/chrome/i) && X(/android/i), Nt = {
  capture: !1,
  passive: !1
};
function w(i, e, t) {
  i.addEventListener(e, t, !W && Nt);
}
function y(i, e, t) {
  i.removeEventListener(e, t, !W && Nt);
}
function Ue(i, e) {
  if (e) {
    if (e[0] === ">" && (e = e.substring(1)), i)
      try {
        if (i.matches)
          return i.matches(e);
        if (i.msMatchesSelector)
          return i.msMatchesSelector(e);
        if (i.webkitMatchesSelector)
          return i.webkitMatchesSelector(e);
      } catch {
        return !1;
      }
    return !1;
  }
}
function jt(i) {
  return i.host && i !== document && i.host.nodeType ? i.host : i.parentNode;
}
function U(i, e, t, r) {
  if (i) {
    t = t || document;
    do {
      if (e != null && (e[0] === ">" ? i.parentNode === t && Ue(i, e) : Ue(i, e)) || r && i === t)
        return i;
      if (i === t) break;
    } while (i = jt(i));
  }
  return null;
}
var Ct = /\s+/g;
function F(i, e, t) {
  if (i && e)
    if (i.classList)
      i.classList[t ? "add" : "remove"](e);
    else {
      var r = (" " + i.className + " ").replace(Ct, " ").replace(" " + e + " ", " ");
      i.className = (r + (t ? " " + e : "")).replace(Ct, " ");
    }
}
function m(i, e, t) {
  var r = i && i.style;
  if (r) {
    if (t === void 0)
      return document.defaultView && document.defaultView.getComputedStyle ? t = document.defaultView.getComputedStyle(i, "") : i.currentStyle && (t = i.currentStyle), e === void 0 ? t : t[e];
    !(e in r) && e.indexOf("webkit") === -1 && (e = "-webkit-" + e), r[e] = t + (typeof t == "string" ? "" : "px");
  }
}
function pe(i, e) {
  var t = "";
  if (typeof i == "string")
    t = i;
  else
    do {
      var r = m(i, "transform");
      r && r !== "none" && (t = r + " " + t);
    } while (!e && (i = i.parentNode));
  var n = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return n && new n(t);
}
function Gt(i, e, t) {
  if (i) {
    var r = i.getElementsByTagName(e), n = 0, o = r.length;
    if (t)
      for (; n < o; n++)
        t(r[n], n);
    return r;
  }
  return [];
}
function z() {
  var i = document.scrollingElement;
  return i || document.documentElement;
}
function A(i, e, t, r, n) {
  if (!(!i.getBoundingClientRect && i !== window)) {
    var o, s, a, l, c, d, u;
    if (i !== window && i.parentNode && i !== z() ? (o = i.getBoundingClientRect(), s = o.top, a = o.left, l = o.bottom, c = o.right, d = o.height, u = o.width) : (s = 0, a = 0, l = window.innerHeight, c = window.innerWidth, d = window.innerHeight, u = window.innerWidth), (e || t) && i !== window && (n = n || i.parentNode, !W))
      do
        if (n && n.getBoundingClientRect && (m(n, "transform") !== "none" || t && m(n, "position") !== "static")) {
          var f = n.getBoundingClientRect();
          s -= f.top + parseInt(m(n, "border-top-width")), a -= f.left + parseInt(m(n, "border-left-width")), l = s + o.height, c = a + o.width;
          break;
        }
      while (n = n.parentNode);
    if (r && i !== window) {
      var p = pe(n || i), v = p && p.a, x = p && p.d;
      p && (s /= x, a /= v, u /= v, d /= x, l = s + d, c = a + u);
    }
    return {
      top: s,
      left: a,
      bottom: l,
      right: c,
      width: u,
      height: d
    };
  }
}
function kt(i, e, t) {
  for (var r = te(i, !0), n = A(i)[e]; r; ) {
    var o = A(r)[t], s = void 0;
    if (s = n >= o, !s) return r;
    if (r === z()) break;
    r = te(r, !1);
  }
  return !1;
}
function me(i, e, t, r) {
  for (var n = 0, o = 0, s = i.children; o < s.length; ) {
    if (s[o].style.display !== "none" && s[o] !== g.ghost && (r || s[o] !== g.dragged) && U(s[o], t.draggable, i, !1)) {
      if (n === e)
        return s[o];
      n++;
    }
    o++;
  }
  return null;
}
function ft(i, e) {
  for (var t = i.lastElementChild; t && (t === g.ghost || m(t, "display") === "none" || e && !Ue(t, e)); )
    t = t.previousElementSibling;
  return t || null;
}
function N(i, e) {
  var t = 0;
  if (!i || !i.parentNode)
    return -1;
  for (; i = i.previousElementSibling; )
    i.nodeName.toUpperCase() !== "TEMPLATE" && i !== g.clone && (!e || Ue(i, e)) && t++;
  return t;
}
function $t(i) {
  var e = 0, t = 0, r = z();
  if (i)
    do {
      var n = pe(i), o = n.a, s = n.d;
      e += i.scrollLeft * o, t += i.scrollTop * s;
    } while (i !== r && (i = i.parentNode));
  return [e, t];
}
function gr(i, e) {
  for (var t in i)
    if (i.hasOwnProperty(t)) {
      for (var r in e)
        if (e.hasOwnProperty(r) && e[r] === i[t][r]) return Number(t);
    }
  return -1;
}
function te(i, e) {
  if (!i || !i.getBoundingClientRect) return z();
  var t = i, r = !1;
  do
    if (t.clientWidth < t.scrollWidth || t.clientHeight < t.scrollHeight) {
      var n = m(t);
      if (t.clientWidth < t.scrollWidth && (n.overflowX == "auto" || n.overflowX == "scroll") || t.clientHeight < t.scrollHeight && (n.overflowY == "auto" || n.overflowY == "scroll")) {
        if (!t.getBoundingClientRect || t === document.body) return z();
        if (r || e) return t;
        r = !0;
      }
    }
  while (t = t.parentNode);
  return z();
}
function br(i, e) {
  if (i && e)
    for (var t in e)
      e.hasOwnProperty(t) && (i[t] = e[t]);
  return i;
}
function We(i, e) {
  return Math.round(i.top) === Math.round(e.top) && Math.round(i.left) === Math.round(e.left) && Math.round(i.height) === Math.round(e.height) && Math.round(i.width) === Math.round(e.width);
}
var ke;
function Ut(i, e) {
  return function() {
    if (!ke) {
      var t = arguments, r = this;
      t.length === 1 ? i.call(r, t[0]) : i.apply(r, t), ke = setTimeout(function() {
        ke = void 0;
      }, e);
    }
  };
}
function vr() {
  clearTimeout(ke), ke = void 0;
}
function Ht(i, e, t) {
  i.scrollLeft += e, i.scrollTop += t;
}
function zt(i) {
  var e = window.Polymer, t = window.jQuery || window.Zepto;
  return e && e.dom ? e.dom(i).cloneNode(!0) : t ? t(i).clone(!0)[0] : i.cloneNode(!0);
}
function Vt(i, e, t) {
  var r = {};
  return Array.from(i.children).forEach(function(n) {
    var o, s, a, l;
    if (!(!U(n, e.draggable, i, !1) || n.animated || n === t)) {
      var c = A(n);
      r.left = Math.min((o = r.left) !== null && o !== void 0 ? o : 1 / 0, c.left), r.top = Math.min((s = r.top) !== null && s !== void 0 ? s : 1 / 0, c.top), r.right = Math.max((a = r.right) !== null && a !== void 0 ? a : -1 / 0, c.right), r.bottom = Math.max((l = r.bottom) !== null && l !== void 0 ? l : -1 / 0, c.bottom);
    }
  }), r.width = r.right - r.left, r.height = r.bottom - r.top, r.x = r.left, r.y = r.top, r;
}
var I = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function yr() {
  var i = [], e;
  return {
    captureAnimationState: function() {
      if (i = [], !!this.options.animation) {
        var r = [].slice.call(this.el.children);
        r.forEach(function(n) {
          if (!(m(n, "display") === "none" || n === g.ghost)) {
            i.push({
              target: n,
              rect: A(n)
            });
            var o = V({}, i[i.length - 1].rect);
            if (n.thisAnimationDuration) {
              var s = pe(n, !0);
              s && (o.top -= s.f, o.left -= s.e);
            }
            n.fromRect = o;
          }
        });
      }
    },
    addAnimationState: function(r) {
      i.push(r);
    },
    removeAnimationState: function(r) {
      i.splice(gr(i, {
        target: r
      }), 1);
    },
    animateAll: function(r) {
      var n = this;
      if (!this.options.animation) {
        clearTimeout(e), typeof r == "function" && r();
        return;
      }
      var o = !1, s = 0;
      i.forEach(function(a) {
        var l = 0, c = a.target, d = c.fromRect, u = A(c), f = c.prevFromRect, p = c.prevToRect, v = a.rect, x = pe(c, !0);
        x && (u.top -= x.f, u.left -= x.e), c.toRect = u, c.thisAnimationDuration && We(f, u) && !We(d, u) && // Make sure animatingRect is on line between toRect & fromRect
        (v.top - u.top) / (v.left - u.left) === (d.top - u.top) / (d.left - u.left) && (l = xr(v, f, p, n.options)), We(u, d) || (c.prevFromRect = d, c.prevToRect = u, l || (l = n.options.animation), n.animate(c, v, u, l)), l && (o = !0, s = Math.max(s, l), clearTimeout(c.animationResetTimer), c.animationResetTimer = setTimeout(function() {
          c.animationTime = 0, c.prevFromRect = null, c.fromRect = null, c.prevToRect = null, c.thisAnimationDuration = null;
        }, l), c.thisAnimationDuration = l);
      }), clearTimeout(e), o ? e = setTimeout(function() {
        typeof r == "function" && r();
      }, s) : typeof r == "function" && r(), i = [];
    },
    animate: function(r, n, o, s) {
      if (s) {
        m(r, "transition", ""), m(r, "transform", "");
        var a = pe(this.el), l = a && a.a, c = a && a.d, d = (n.left - o.left) / (l || 1), u = (n.top - o.top) / (c || 1);
        r.animatingX = !!d, r.animatingY = !!u, m(r, "transform", "translate3d(" + d + "px," + u + "px,0)"), this.forRepaintDummy = wr(r), m(r, "transition", "transform " + s + "ms" + (this.options.easing ? " " + this.options.easing : "")), m(r, "transform", "translate3d(0,0,0)"), typeof r.animated == "number" && clearTimeout(r.animated), r.animated = setTimeout(function() {
          m(r, "transition", ""), m(r, "transform", ""), r.animated = !1, r.animatingX = !1, r.animatingY = !1;
        }, s);
      }
    }
  };
}
function wr(i) {
  return i.offsetWidth;
}
function xr(i, e, t, r) {
  return Math.sqrt(Math.pow(e.top - i.top, 2) + Math.pow(e.left - i.left, 2)) / Math.sqrt(Math.pow(e.top - t.top, 2) + Math.pow(e.left - t.left, 2)) * r.animation;
}
var de = [], Qe = {
  initializeByDefault: !0
}, Be = {
  mount: function(e) {
    for (var t in Qe)
      Qe.hasOwnProperty(t) && !(t in e) && (e[t] = Qe[t]);
    de.forEach(function(r) {
      if (r.pluginName === e.pluginName)
        throw "Sortable: Cannot mount plugin ".concat(e.pluginName, " more than once");
    }), de.push(e);
  },
  pluginEvent: function(e, t, r) {
    var n = this;
    this.eventCanceled = !1, r.cancel = function() {
      n.eventCanceled = !0;
    };
    var o = e + "Global";
    de.forEach(function(s) {
      t[s.pluginName] && (t[s.pluginName][o] && t[s.pluginName][o](V({
        sortable: t
      }, r)), t.options[s.pluginName] && t[s.pluginName][e] && t[s.pluginName][e](V({
        sortable: t
      }, r)));
    });
  },
  initializePlugins: function(e, t, r, n) {
    de.forEach(function(a) {
      var l = a.pluginName;
      if (!(!e.options[l] && !a.initializeByDefault)) {
        var c = new a(e, t, e.options);
        c.sortable = e, c.options = e.options, e[l] = c, J(r, c.defaults);
      }
    });
    for (var o in e.options)
      if (e.options.hasOwnProperty(o)) {
        var s = this.modifyOption(e, o, e.options[o]);
        typeof s < "u" && (e.options[o] = s);
      }
  },
  getEventProperties: function(e, t) {
    var r = {};
    return de.forEach(function(n) {
      typeof n.eventProperties == "function" && J(r, n.eventProperties.call(t[n.pluginName], e));
    }), r;
  },
  modifyOption: function(e, t, r) {
    var n;
    return de.forEach(function(o) {
      e[o.pluginName] && o.optionListeners && typeof o.optionListeners[t] == "function" && (n = o.optionListeners[t].call(e[o.pluginName], r));
    }), n;
  }
};
function Er(i) {
  var e = i.sortable, t = i.rootEl, r = i.name, n = i.targetEl, o = i.cloneEl, s = i.toEl, a = i.fromEl, l = i.oldIndex, c = i.newIndex, d = i.oldDraggableIndex, u = i.newDraggableIndex, f = i.originalEvent, p = i.putSortable, v = i.extraEventProperties;
  if (e = e || t && t[I], !!e) {
    var x, O = e.options, T = "on" + r.charAt(0).toUpperCase() + r.substr(1);
    window.CustomEvent && !W && !Pe ? x = new CustomEvent(r, {
      bubbles: !0,
      cancelable: !0
    }) : (x = document.createEvent("Event"), x.initEvent(r, !0, !0)), x.to = s || t, x.from = a || t, x.item = n || t, x.clone = o, x.oldIndex = l, x.newIndex = c, x.oldDraggableIndex = d, x.newDraggableIndex = u, x.originalEvent = f, x.pullMode = p ? p.lastPutMode : void 0;
    var P = V(V({}, v), Be.getEventProperties(r, e));
    for (var j in P)
      x[j] = P[j];
    t && t.dispatchEvent(x), O[T] && O[T].call(e, x);
  }
}
var Sr = ["evt"], _ = function(e, t) {
  var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, n = r.evt, o = pr(r, Sr);
  Be.pluginEvent.bind(g)(e, t, V({
    dragEl: h,
    parentEl: k,
    ghostEl: b,
    rootEl: S,
    nextEl: le,
    lastDownEl: Fe,
    cloneEl: C,
    cloneHidden: ee,
    dragStarted: xe,
    putSortable: L,
    activeSortable: g.active,
    originalEvent: n,
    oldIndex: fe,
    oldDraggableIndex: $e,
    newIndex: q,
    newDraggableIndex: Z,
    hideGhostForTarget: Wt,
    unhideGhostForTarget: Qt,
    cloneNowHidden: function() {
      ee = !0;
    },
    cloneNowShown: function() {
      ee = !1;
    },
    dispatchSortableEvent: function(a) {
      B({
        sortable: t,
        name: a,
        originalEvent: n
      });
    }
  }, o));
};
function B(i) {
  Er(V({
    putSortable: L,
    cloneEl: C,
    targetEl: h,
    rootEl: S,
    oldIndex: fe,
    oldDraggableIndex: $e,
    newIndex: q,
    newDraggableIndex: Z
  }, i));
}
var h, k, b, S, le, Fe, C, ee, fe, q, $e, Z, _e, L, he = !1, He = !1, ze = [], ie, G, Ke, Ze, At, Lt, xe, ue, Ae, Le = !1, Ie = !1, qe, D, et = [], it = !1, Ve = [], Je = typeof document < "u", Oe = ht, Dt = Pe || W ? "cssFloat" : "float", Cr = Je && !qt && !ht && "draggable" in document.createElement("div"), Yt = function() {
  if (Je) {
    if (W)
      return !1;
    var i = document.createElement("x");
    return i.style.cssText = "pointer-events:auto", i.style.pointerEvents === "auto";
  }
}(), Xt = function(e, t) {
  var r = m(e), n = parseInt(r.width) - parseInt(r.paddingLeft) - parseInt(r.paddingRight) - parseInt(r.borderLeftWidth) - parseInt(r.borderRightWidth), o = me(e, 0, t), s = me(e, 1, t), a = o && m(o), l = s && m(s), c = a && parseInt(a.marginLeft) + parseInt(a.marginRight) + A(o).width, d = l && parseInt(l.marginLeft) + parseInt(l.marginRight) + A(s).width;
  if (r.display === "flex")
    return r.flexDirection === "column" || r.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  if (r.display === "grid")
    return r.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  if (o && a.float && a.float !== "none") {
    var u = a.float === "left" ? "left" : "right";
    return s && (l.clear === "both" || l.clear === u) ? "vertical" : "horizontal";
  }
  return o && (a.display === "block" || a.display === "flex" || a.display === "table" || a.display === "grid" || c >= n && r[Dt] === "none" || s && r[Dt] === "none" && c + d > n) ? "vertical" : "horizontal";
}, kr = function(e, t, r) {
  var n = r ? e.left : e.top, o = r ? e.right : e.bottom, s = r ? e.width : e.height, a = r ? t.left : t.top, l = r ? t.right : t.bottom, c = r ? t.width : t.height;
  return n === a || o === l || n + s / 2 === a + c / 2;
}, $r = function(e, t) {
  var r;
  return ze.some(function(n) {
    var o = n[I].options.emptyInsertThreshold;
    if (!(!o || ft(n))) {
      var s = A(n), a = e >= s.left - o && e <= s.right + o, l = t >= s.top - o && t <= s.bottom + o;
      if (a && l)
        return r = n;
    }
  }), r;
}, Jt = function(e) {
  function t(o, s) {
    return function(a, l, c, d) {
      var u = a.options.group.name && l.options.group.name && a.options.group.name === l.options.group.name;
      if (o == null && (s || u))
        return !0;
      if (o == null || o === !1)
        return !1;
      if (s && o === "clone")
        return o;
      if (typeof o == "function")
        return t(o(a, l, c, d), s)(a, l, c, d);
      var f = (s ? a : l).options.group.name;
      return o === !0 || typeof o == "string" && o === f || o.join && o.indexOf(f) > -1;
    };
  }
  var r = {}, n = e.group;
  (!n || Me(n) != "object") && (n = {
    name: n
  }), r.name = n.name, r.checkPull = t(n.pull, !0), r.checkPut = t(n.put), r.revertClone = n.revertClone, e.group = r;
}, Wt = function() {
  !Yt && b && m(b, "display", "none");
}, Qt = function() {
  !Yt && b && m(b, "display", "");
};
Je && !qt && document.addEventListener("click", function(i) {
  if (He)
    return i.preventDefault(), i.stopPropagation && i.stopPropagation(), i.stopImmediatePropagation && i.stopImmediatePropagation(), He = !1, !1;
}, !0);
var se = function(e) {
  if (h) {
    e = e.touches ? e.touches[0] : e;
    var t = $r(e.clientX, e.clientY);
    if (t) {
      var r = {};
      for (var n in e)
        e.hasOwnProperty(n) && (r[n] = e[n]);
      r.target = r.rootEl = t, r.preventDefault = void 0, r.stopPropagation = void 0, t[I]._onDragOver(r);
    }
  }
}, Ar = function(e) {
  h && h.parentNode[I]._isOutsideThisEl(e.target);
};
function g(i, e) {
  if (!(i && i.nodeType && i.nodeType === 1))
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(i));
  this.el = i, this.options = e = J({}, e), i[I] = this;
  var t = {
    group: null,
    sort: !0,
    disabled: !1,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(i.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: !1,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: !0,
    direction: function() {
      return Xt(i, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: !0,
    animation: 0,
    easing: null,
    setData: function(s, a) {
      s.setData("Text", a.textContent);
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
    supportPointer: g.supportPointer !== !1 && "PointerEvent" in window && (!Ce || ht),
    emptyInsertThreshold: 5
  };
  Be.initializePlugins(this, i, t);
  for (var r in t)
    !(r in e) && (e[r] = t[r]);
  Jt(e);
  for (var n in this)
    n.charAt(0) === "_" && typeof this[n] == "function" && (this[n] = this[n].bind(this));
  this.nativeDraggable = e.forceFallback ? !1 : Cr, this.nativeDraggable && (this.options.touchStartThreshold = 1), e.supportPointer ? w(i, "pointerdown", this._onTapStart) : (w(i, "mousedown", this._onTapStart), w(i, "touchstart", this._onTapStart)), this.nativeDraggable && (w(i, "dragover", this), w(i, "dragenter", this)), ze.push(this.el), e.store && e.store.get && this.sort(e.store.get(this) || []), J(this, yr());
}
g.prototype = /** @lends Sortable.prototype */
{
  constructor: g,
  _isOutsideThisEl: function(e) {
    !this.el.contains(e) && e !== this.el && (ue = null);
  },
  _getDirection: function(e, t) {
    return typeof this.options.direction == "function" ? this.options.direction.call(this, e, t, h) : this.options.direction;
  },
  _onTapStart: function(e) {
    if (e.cancelable) {
      var t = this, r = this.el, n = this.options, o = n.preventOnFilter, s = e.type, a = e.touches && e.touches[0] || e.pointerType && e.pointerType === "touch" && e, l = (a || e).target, c = e.target.shadowRoot && (e.path && e.path[0] || e.composedPath && e.composedPath()[0]) || l, d = n.filter;
      if (Or(r), !h && !(/mousedown|pointerdown/.test(s) && e.button !== 0 || n.disabled) && !c.isContentEditable && !(!this.nativeDraggable && Ce && l && l.tagName.toUpperCase() === "SELECT") && (l = U(l, n.draggable, r, !1), !(l && l.animated) && Fe !== l)) {
        if (fe = N(l), $e = N(l, n.draggable), typeof d == "function") {
          if (d.call(this, e, l, this)) {
            B({
              sortable: t,
              rootEl: c,
              name: "filter",
              targetEl: l,
              toEl: r,
              fromEl: r
            }), _("filter", t, {
              evt: e
            }), o && e.preventDefault();
            return;
          }
        } else if (d && (d = d.split(",").some(function(u) {
          if (u = U(c, u.trim(), r, !1), u)
            return B({
              sortable: t,
              rootEl: u,
              name: "filter",
              targetEl: l,
              fromEl: r,
              toEl: r
            }), _("filter", t, {
              evt: e
            }), !0;
        }), d)) {
          o && e.preventDefault();
          return;
        }
        n.handle && !U(c, n.handle, r, !1) || this._prepareDragStart(e, a, l);
      }
    }
  },
  _prepareDragStart: function(e, t, r) {
    var n = this, o = n.el, s = n.options, a = o.ownerDocument, l;
    if (r && !h && r.parentNode === o) {
      var c = A(r);
      if (S = o, h = r, k = h.parentNode, le = h.nextSibling, Fe = r, _e = s.group, g.dragged = h, ie = {
        target: h,
        clientX: (t || e).clientX,
        clientY: (t || e).clientY
      }, At = ie.clientX - c.left, Lt = ie.clientY - c.top, this._lastX = (t || e).clientX, this._lastY = (t || e).clientY, h.style["will-change"] = "all", l = function() {
        if (_("delayEnded", n, {
          evt: e
        }), g.eventCanceled) {
          n._onDrop();
          return;
        }
        n._disableDelayedDragEvents(), !St && n.nativeDraggable && (h.draggable = !0), n._triggerDragStart(e, t), B({
          sortable: n,
          name: "choose",
          originalEvent: e
        }), F(h, s.chosenClass, !0);
      }, s.ignore.split(",").forEach(function(d) {
        Gt(h, d.trim(), tt);
      }), w(a, "dragover", se), w(a, "mousemove", se), w(a, "touchmove", se), s.supportPointer ? (w(a, "pointerup", n._onDrop), !this.nativeDraggable && w(a, "pointercancel", n._onDrop)) : (w(a, "mouseup", n._onDrop), w(a, "touchend", n._onDrop), w(a, "touchcancel", n._onDrop)), St && this.nativeDraggable && (this.options.touchStartThreshold = 4, h.draggable = !0), _("delayStart", this, {
        evt: e
      }), s.delay && (!s.delayOnTouchOnly || t) && (!this.nativeDraggable || !(Pe || W))) {
        if (g.eventCanceled) {
          this._onDrop();
          return;
        }
        s.supportPointer ? (w(a, "pointerup", n._disableDelayedDrag), w(a, "pointercancel", n._disableDelayedDrag)) : (w(a, "mouseup", n._disableDelayedDrag), w(a, "touchend", n._disableDelayedDrag), w(a, "touchcancel", n._disableDelayedDrag)), w(a, "mousemove", n._delayedDragTouchMoveHandler), w(a, "touchmove", n._delayedDragTouchMoveHandler), s.supportPointer && w(a, "pointermove", n._delayedDragTouchMoveHandler), n._dragStartTimer = setTimeout(l, s.delay);
      } else
        l();
    }
  },
  _delayedDragTouchMoveHandler: function(e) {
    var t = e.touches ? e.touches[0] : e;
    Math.max(Math.abs(t.clientX - this._lastX), Math.abs(t.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1)) && this._disableDelayedDrag();
  },
  _disableDelayedDrag: function() {
    h && tt(h), clearTimeout(this._dragStartTimer), this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function() {
    var e = this.el.ownerDocument;
    y(e, "mouseup", this._disableDelayedDrag), y(e, "touchend", this._disableDelayedDrag), y(e, "touchcancel", this._disableDelayedDrag), y(e, "pointerup", this._disableDelayedDrag), y(e, "pointercancel", this._disableDelayedDrag), y(e, "mousemove", this._delayedDragTouchMoveHandler), y(e, "touchmove", this._delayedDragTouchMoveHandler), y(e, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function(e, t) {
    t = t || e.pointerType == "touch" && e, !this.nativeDraggable || t ? this.options.supportPointer ? w(document, "pointermove", this._onTouchMove) : t ? w(document, "touchmove", this._onTouchMove) : w(document, "mousemove", this._onTouchMove) : (w(h, "dragend", this), w(S, "dragstart", this._onDragStart));
    try {
      document.selection ? Ne(function() {
        document.selection.empty();
      }) : window.getSelection().removeAllRanges();
    } catch {
    }
  },
  _dragStarted: function(e, t) {
    if (he = !1, S && h) {
      _("dragStarted", this, {
        evt: t
      }), this.nativeDraggable && w(document, "dragover", Ar);
      var r = this.options;
      !e && F(h, r.dragClass, !1), F(h, r.ghostClass, !0), g.active = this, e && this._appendGhost(), B({
        sortable: this,
        name: "start",
        originalEvent: t
      });
    } else
      this._nulling();
  },
  _emulateDragOver: function() {
    if (G) {
      this._lastX = G.clientX, this._lastY = G.clientY, Wt();
      for (var e = document.elementFromPoint(G.clientX, G.clientY), t = e; e && e.shadowRoot && (e = e.shadowRoot.elementFromPoint(G.clientX, G.clientY), e !== t); )
        t = e;
      if (h.parentNode[I]._isOutsideThisEl(e), t)
        do {
          if (t[I]) {
            var r = void 0;
            if (r = t[I]._onDragOver({
              clientX: G.clientX,
              clientY: G.clientY,
              target: e,
              rootEl: t
            }), r && !this.options.dragoverBubble)
              break;
          }
          e = t;
        } while (t = jt(t));
      Qt();
    }
  },
  _onTouchMove: function(e) {
    if (ie) {
      var t = this.options, r = t.fallbackTolerance, n = t.fallbackOffset, o = e.touches ? e.touches[0] : e, s = b && pe(b, !0), a = b && s && s.a, l = b && s && s.d, c = Oe && D && $t(D), d = (o.clientX - ie.clientX + n.x) / (a || 1) + (c ? c[0] - et[0] : 0) / (a || 1), u = (o.clientY - ie.clientY + n.y) / (l || 1) + (c ? c[1] - et[1] : 0) / (l || 1);
      if (!g.active && !he) {
        if (r && Math.max(Math.abs(o.clientX - this._lastX), Math.abs(o.clientY - this._lastY)) < r)
          return;
        this._onDragStart(e, !0);
      }
      if (b) {
        s ? (s.e += d - (Ke || 0), s.f += u - (Ze || 0)) : s = {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: d,
          f: u
        };
        var f = "matrix(".concat(s.a, ",").concat(s.b, ",").concat(s.c, ",").concat(s.d, ",").concat(s.e, ",").concat(s.f, ")");
        m(b, "webkitTransform", f), m(b, "mozTransform", f), m(b, "msTransform", f), m(b, "transform", f), Ke = d, Ze = u, G = o;
      }
      e.cancelable && e.preventDefault();
    }
  },
  _appendGhost: function() {
    if (!b) {
      var e = this.options.fallbackOnBody ? document.body : S, t = A(h, !0, Oe, !0, e), r = this.options;
      if (Oe) {
        for (D = e; m(D, "position") === "static" && m(D, "transform") === "none" && D !== document; )
          D = D.parentNode;
        D !== document.body && D !== document.documentElement ? (D === document && (D = z()), t.top += D.scrollTop, t.left += D.scrollLeft) : D = z(), et = $t(D);
      }
      b = h.cloneNode(!0), F(b, r.ghostClass, !1), F(b, r.fallbackClass, !0), F(b, r.dragClass, !0), m(b, "transition", ""), m(b, "transform", ""), m(b, "box-sizing", "border-box"), m(b, "margin", 0), m(b, "top", t.top), m(b, "left", t.left), m(b, "width", t.width), m(b, "height", t.height), m(b, "opacity", "0.8"), m(b, "position", Oe ? "absolute" : "fixed"), m(b, "zIndex", "100000"), m(b, "pointerEvents", "none"), g.ghost = b, e.appendChild(b), m(b, "transform-origin", At / parseInt(b.style.width) * 100 + "% " + Lt / parseInt(b.style.height) * 100 + "%");
    }
  },
  _onDragStart: function(e, t) {
    var r = this, n = e.dataTransfer, o = r.options;
    if (_("dragStart", this, {
      evt: e
    }), g.eventCanceled) {
      this._onDrop();
      return;
    }
    _("setupClone", this), g.eventCanceled || (C = zt(h), C.removeAttribute("id"), C.draggable = !1, C.style["will-change"] = "", this._hideClone(), F(C, this.options.chosenClass, !1), g.clone = C), r.cloneId = Ne(function() {
      _("clone", r), !g.eventCanceled && (r.options.removeCloneOnHide || S.insertBefore(C, h), r._hideClone(), B({
        sortable: r,
        name: "clone"
      }));
    }), !t && F(h, o.dragClass, !0), t ? (He = !0, r._loopId = setInterval(r._emulateDragOver, 50)) : (y(document, "mouseup", r._onDrop), y(document, "touchend", r._onDrop), y(document, "touchcancel", r._onDrop), n && (n.effectAllowed = "move", o.setData && o.setData.call(r, n, h)), w(document, "drop", r), m(h, "transform", "translateZ(0)")), he = !0, r._dragStartId = Ne(r._dragStarted.bind(r, t, e)), w(document, "selectstart", r), xe = !0, window.getSelection().removeAllRanges(), Ce && m(document.body, "user-select", "none");
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function(e) {
    var t = this.el, r = e.target, n, o, s, a = this.options, l = a.group, c = g.active, d = _e === l, u = a.sort, f = L || c, p, v = this, x = !1;
    if (it) return;
    function O(we, er) {
      _(we, v, V({
        evt: e,
        isOwner: d,
        axis: p ? "vertical" : "horizontal",
        revert: s,
        dragRect: n,
        targetRect: o,
        canSort: u,
        fromSortable: f,
        target: r,
        completed: P,
        onMove: function(vt, tr) {
          return Re(S, t, h, n, vt, A(vt), e, tr);
        },
        changed: j
      }, er));
    }
    function T() {
      O("dragOverAnimationCapture"), v.captureAnimationState(), v !== f && f.captureAnimationState();
    }
    function P(we) {
      return O("dragOverCompleted", {
        insertion: we
      }), we && (d ? c._hideClone() : c._showClone(v), v !== f && (F(h, L ? L.options.ghostClass : c.options.ghostClass, !1), F(h, a.ghostClass, !0)), L !== v && v !== g.active ? L = v : v === g.active && L && (L = null), f === v && (v._ignoreWhileAnimating = r), v.animateAll(function() {
        O("dragOverAnimationComplete"), v._ignoreWhileAnimating = null;
      }), v !== f && (f.animateAll(), f._ignoreWhileAnimating = null)), (r === h && !h.animated || r === t && !r.animated) && (ue = null), !a.dragoverBubble && !e.rootEl && r !== document && (h.parentNode[I]._isOutsideThisEl(e.target), !we && se(e)), !a.dragoverBubble && e.stopPropagation && e.stopPropagation(), x = !0;
    }
    function j() {
      q = N(h), Z = N(h, a.draggable), B({
        sortable: v,
        name: "change",
        toEl: t,
        newIndex: q,
        newDraggableIndex: Z,
        originalEvent: e
      });
    }
    if (e.preventDefault !== void 0 && e.cancelable && e.preventDefault(), r = U(r, a.draggable, t, !0), O("dragOver"), g.eventCanceled) return x;
    if (h.contains(e.target) || r.animated && r.animatingX && r.animatingY || v._ignoreWhileAnimating === r)
      return P(!1);
    if (He = !1, c && !a.disabled && (d ? u || (s = k !== S) : L === this || (this.lastPutMode = _e.checkPull(this, c, h, e)) && l.checkPut(this, c, h, e))) {
      if (p = this._getDirection(e, r) === "vertical", n = A(h), O("dragOverValid"), g.eventCanceled) return x;
      if (s)
        return k = S, T(), this._hideClone(), O("revert"), g.eventCanceled || (le ? S.insertBefore(h, le) : S.appendChild(h)), P(!0);
      var R = ft(t, a.draggable);
      if (!R || Br(e, p, this) && !R.animated) {
        if (R === h)
          return P(!1);
        if (R && t === e.target && (r = R), r && (o = A(r)), Re(S, t, h, n, r, o, e, !!r) !== !1)
          return T(), R && R.nextSibling ? t.insertBefore(h, R.nextSibling) : t.appendChild(h), k = t, j(), P(!0);
      } else if (R && Pr(e, p, this)) {
        var re = me(t, 0, a, !0);
        if (re === h)
          return P(!1);
        if (r = re, o = A(r), Re(S, t, h, n, r, o, e, !1) !== !1)
          return T(), t.insertBefore(h, re), k = t, j(), P(!0);
      } else if (r.parentNode === t) {
        o = A(r);
        var H = 0, ne, ge = h.parentNode !== t, M = !kr(h.animated && h.toRect || n, r.animated && r.toRect || o, p), be = p ? "top" : "left", Q = kt(r, "top", "top") || kt(h, "top", "top"), ve = Q ? Q.scrollTop : void 0;
        ue !== r && (ne = o[be], Le = !1, Ie = !M && a.invertSwap || ge), H = Tr(e, r, o, p, M ? 1 : a.swapThreshold, a.invertedSwapThreshold == null ? a.swapThreshold : a.invertedSwapThreshold, Ie, ue === r);
        var Y;
        if (H !== 0) {
          var oe = N(h);
          do
            oe -= H, Y = k.children[oe];
          while (Y && (m(Y, "display") === "none" || Y === b));
        }
        if (H === 0 || Y === r)
          return P(!1);
        ue = r, Ae = H;
        var ye = r.nextElementSibling, K = !1;
        K = H === 1;
        var Te = Re(S, t, h, n, r, o, e, K);
        if (Te !== !1)
          return (Te === 1 || Te === -1) && (K = Te === 1), it = !0, setTimeout(Dr, 30), T(), K && !ye ? t.appendChild(h) : r.parentNode.insertBefore(h, K ? ye : r), Q && Ht(Q, 0, ve - Q.scrollTop), k = h.parentNode, ne !== void 0 && !Ie && (qe = Math.abs(ne - A(r)[be])), j(), P(!0);
      }
      if (t.contains(h))
        return P(!1);
    }
    return !1;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function() {
    y(document, "mousemove", this._onTouchMove), y(document, "touchmove", this._onTouchMove), y(document, "pointermove", this._onTouchMove), y(document, "dragover", se), y(document, "mousemove", se), y(document, "touchmove", se);
  },
  _offUpEvents: function() {
    var e = this.el.ownerDocument;
    y(e, "mouseup", this._onDrop), y(e, "touchend", this._onDrop), y(e, "pointerup", this._onDrop), y(e, "pointercancel", this._onDrop), y(e, "touchcancel", this._onDrop), y(document, "selectstart", this);
  },
  _onDrop: function(e) {
    var t = this.el, r = this.options;
    if (q = N(h), Z = N(h, r.draggable), _("drop", this, {
      evt: e
    }), k = h && h.parentNode, q = N(h), Z = N(h, r.draggable), g.eventCanceled) {
      this._nulling();
      return;
    }
    he = !1, Ie = !1, Le = !1, clearInterval(this._loopId), clearTimeout(this._dragStartTimer), st(this.cloneId), st(this._dragStartId), this.nativeDraggable && (y(document, "drop", this), y(t, "dragstart", this._onDragStart)), this._offMoveEvents(), this._offUpEvents(), Ce && m(document.body, "user-select", ""), m(h, "transform", ""), e && (xe && (e.cancelable && e.preventDefault(), !r.dropBubble && e.stopPropagation()), b && b.parentNode && b.parentNode.removeChild(b), (S === k || L && L.lastPutMode !== "clone") && C && C.parentNode && C.parentNode.removeChild(C), h && (this.nativeDraggable && y(h, "dragend", this), tt(h), h.style["will-change"] = "", xe && !he && F(h, L ? L.options.ghostClass : this.options.ghostClass, !1), F(h, this.options.chosenClass, !1), B({
      sortable: this,
      name: "unchoose",
      toEl: k,
      newIndex: null,
      newDraggableIndex: null,
      originalEvent: e
    }), S !== k ? (q >= 0 && (B({
      rootEl: k,
      name: "add",
      toEl: k,
      fromEl: S,
      originalEvent: e
    }), B({
      sortable: this,
      name: "remove",
      toEl: k,
      originalEvent: e
    }), B({
      rootEl: k,
      name: "sort",
      toEl: k,
      fromEl: S,
      originalEvent: e
    }), B({
      sortable: this,
      name: "sort",
      toEl: k,
      originalEvent: e
    })), L && L.save()) : q !== fe && q >= 0 && (B({
      sortable: this,
      name: "update",
      toEl: k,
      originalEvent: e
    }), B({
      sortable: this,
      name: "sort",
      toEl: k,
      originalEvent: e
    })), g.active && ((q == null || q === -1) && (q = fe, Z = $e), B({
      sortable: this,
      name: "end",
      toEl: k,
      originalEvent: e
    }), this.save()))), this._nulling();
  },
  _nulling: function() {
    _("nulling", this), S = h = k = b = le = C = Fe = ee = ie = G = xe = q = Z = fe = $e = ue = Ae = L = _e = g.dragged = g.ghost = g.clone = g.active = null, Ve.forEach(function(e) {
      e.checked = !0;
    }), Ve.length = Ke = Ze = 0;
  },
  handleEvent: function(e) {
    switch (e.type) {
      case "drop":
      case "dragend":
        this._onDrop(e);
        break;
      case "dragenter":
      case "dragover":
        h && (this._onDragOver(e), Lr(e));
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
    for (var e = [], t, r = this.el.children, n = 0, o = r.length, s = this.options; n < o; n++)
      t = r[n], U(t, s.draggable, this.el, !1) && e.push(t.getAttribute(s.dataIdAttr) || Ir(t));
    return e;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function(e, t) {
    var r = {}, n = this.el;
    this.toArray().forEach(function(o, s) {
      var a = n.children[s];
      U(a, this.options.draggable, n, !1) && (r[o] = a);
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
    var n = Be.modifyOption(this, e, t);
    typeof n < "u" ? r[e] = n : r[e] = t, e === "group" && Jt(r);
  },
  /**
   * Destroy
   */
  destroy: function() {
    _("destroy", this);
    var e = this.el;
    e[I] = null, y(e, "mousedown", this._onTapStart), y(e, "touchstart", this._onTapStart), y(e, "pointerdown", this._onTapStart), this.nativeDraggable && (y(e, "dragover", this), y(e, "dragenter", this)), Array.prototype.forEach.call(e.querySelectorAll("[draggable]"), function(t) {
      t.removeAttribute("draggable");
    }), this._onDrop(), this._disableDelayedDragEvents(), ze.splice(ze.indexOf(this.el), 1), this.el = e = null;
  },
  _hideClone: function() {
    if (!ee) {
      if (_("hideClone", this), g.eventCanceled) return;
      m(C, "display", "none"), this.options.removeCloneOnHide && C.parentNode && C.parentNode.removeChild(C), ee = !0;
    }
  },
  _showClone: function(e) {
    if (e.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (ee) {
      if (_("showClone", this), g.eventCanceled) return;
      h.parentNode == S && !this.options.group.revertClone ? S.insertBefore(C, h) : le ? S.insertBefore(C, le) : S.appendChild(C), this.options.group.revertClone && this.animate(h, C), m(C, "display", ""), ee = !1;
    }
  }
};
function Lr(i) {
  i.dataTransfer && (i.dataTransfer.dropEffect = "move"), i.cancelable && i.preventDefault();
}
function Re(i, e, t, r, n, o, s, a) {
  var l, c = i[I], d = c.options.onMove, u;
  return window.CustomEvent && !W && !Pe ? l = new CustomEvent("move", {
    bubbles: !0,
    cancelable: !0
  }) : (l = document.createEvent("Event"), l.initEvent("move", !0, !0)), l.to = e, l.from = i, l.dragged = t, l.draggedRect = r, l.related = n || e, l.relatedRect = o || A(e), l.willInsertAfter = a, l.originalEvent = s, i.dispatchEvent(l), d && (u = d.call(c, l, s)), u;
}
function tt(i) {
  i.draggable = !1;
}
function Dr() {
  it = !1;
}
function Pr(i, e, t) {
  var r = A(me(t.el, 0, t.options, !0)), n = Vt(t.el, t.options, b), o = 10;
  return e ? i.clientX < n.left - o || i.clientY < r.top && i.clientX < r.right : i.clientY < n.top - o || i.clientY < r.bottom && i.clientX < r.left;
}
function Br(i, e, t) {
  var r = A(ft(t.el, t.options.draggable)), n = Vt(t.el, t.options, b), o = 10;
  return e ? i.clientX > n.right + o || i.clientY > r.bottom && i.clientX > r.left : i.clientY > n.bottom + o || i.clientX > r.right && i.clientY > r.top;
}
function Tr(i, e, t, r, n, o, s, a) {
  var l = r ? i.clientY : i.clientX, c = r ? t.height : t.width, d = r ? t.top : t.left, u = r ? t.bottom : t.right, f = !1;
  if (!s) {
    if (a && qe < c * n) {
      if (!Le && (Ae === 1 ? l > d + c * o / 2 : l < u - c * o / 2) && (Le = !0), Le)
        f = !0;
      else if (Ae === 1 ? l < d + qe : l > u - qe)
        return -Ae;
    } else if (l > d + c * (1 - n) / 2 && l < u - c * (1 - n) / 2)
      return _r(e);
  }
  return f = f || s, f && (l < d + c * o / 2 || l > u - c * o / 2) ? l > d + c / 2 ? 1 : -1 : 0;
}
function _r(i) {
  return N(h) < N(i) ? 1 : -1;
}
function Ir(i) {
  for (var e = i.tagName + i.className + i.src + i.href + i.textContent, t = e.length, r = 0; t--; )
    r += e.charCodeAt(t);
  return r.toString(36);
}
function Or(i) {
  Ve.length = 0;
  for (var e = i.getElementsByTagName("input"), t = e.length; t--; ) {
    var r = e[t];
    r.checked && Ve.push(r);
  }
}
function Ne(i) {
  return setTimeout(i, 0);
}
function st(i) {
  return clearTimeout(i);
}
Je && w(document, "touchmove", function(i) {
  (g.active || he) && i.cancelable && i.preventDefault();
});
g.utils = {
  on: w,
  off: y,
  css: m,
  find: Gt,
  is: function(e, t) {
    return !!U(e, t, e, !1);
  },
  extend: br,
  throttle: Ut,
  closest: U,
  toggleClass: F,
  clone: zt,
  index: N,
  nextTick: Ne,
  cancelNextTick: st,
  detectDirection: Xt,
  getChild: me,
  expando: I
};
g.get = function(i) {
  return i[I];
};
g.mount = function() {
  for (var i = arguments.length, e = new Array(i), t = 0; t < i; t++)
    e[t] = arguments[t];
  e[0].constructor === Array && (e = e[0]), e.forEach(function(r) {
    if (!r.prototype || !r.prototype.constructor)
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(r));
    r.utils && (g.utils = V(V({}, g.utils), r.utils)), Be.mount(r);
  });
};
g.create = function(i, e) {
  return new g(i, e);
};
g.version = mr;
var $ = [], Ee, at, lt = !1, rt, nt, Ye, Se;
function Rr() {
  function i() {
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
  return i.prototype = {
    dragStarted: function(t) {
      var r = t.originalEvent;
      this.sortable.nativeDraggable ? w(document, "dragover", this._handleAutoScroll) : this.options.supportPointer ? w(document, "pointermove", this._handleFallbackAutoScroll) : r.touches ? w(document, "touchmove", this._handleFallbackAutoScroll) : w(document, "mousemove", this._handleFallbackAutoScroll);
    },
    dragOverCompleted: function(t) {
      var r = t.originalEvent;
      !this.options.dragOverBubble && !r.rootEl && this._handleAutoScroll(r);
    },
    drop: function() {
      this.sortable.nativeDraggable ? y(document, "dragover", this._handleAutoScroll) : (y(document, "pointermove", this._handleFallbackAutoScroll), y(document, "touchmove", this._handleFallbackAutoScroll), y(document, "mousemove", this._handleFallbackAutoScroll)), Pt(), je(), vr();
    },
    nulling: function() {
      Ye = at = Ee = lt = Se = rt = nt = null, $.length = 0;
    },
    _handleFallbackAutoScroll: function(t) {
      this._handleAutoScroll(t, !0);
    },
    _handleAutoScroll: function(t, r) {
      var n = this, o = (t.touches ? t.touches[0] : t).clientX, s = (t.touches ? t.touches[0] : t).clientY, a = document.elementFromPoint(o, s);
      if (Ye = t, r || this.options.forceAutoScrollFallback || Pe || W || Ce) {
        ot(t, this.options, a, r);
        var l = te(a, !0);
        lt && (!Se || o !== rt || s !== nt) && (Se && Pt(), Se = setInterval(function() {
          var c = te(document.elementFromPoint(o, s), !0);
          c !== l && (l = c, je()), ot(t, n.options, c, r);
        }, 10), rt = o, nt = s);
      } else {
        if (!this.options.bubbleScroll || te(a, !0) === z()) {
          je();
          return;
        }
        ot(t, this.options, te(a, !1), !1);
      }
    }
  }, J(i, {
    pluginName: "scroll",
    initializeByDefault: !0
  });
}
function je() {
  $.forEach(function(i) {
    clearInterval(i.pid);
  }), $ = [];
}
function Pt() {
  clearInterval(Se);
}
var ot = Ut(function(i, e, t, r) {
  if (e.scroll) {
    var n = (i.touches ? i.touches[0] : i).clientX, o = (i.touches ? i.touches[0] : i).clientY, s = e.scrollSensitivity, a = e.scrollSpeed, l = z(), c = !1, d;
    at !== t && (at = t, je(), Ee = e.scroll, d = e.scrollFn, Ee === !0 && (Ee = te(t, !0)));
    var u = 0, f = Ee;
    do {
      var p = f, v = A(p), x = v.top, O = v.bottom, T = v.left, P = v.right, j = v.width, R = v.height, re = void 0, H = void 0, ne = p.scrollWidth, ge = p.scrollHeight, M = m(p), be = p.scrollLeft, Q = p.scrollTop;
      p === l ? (re = j < ne && (M.overflowX === "auto" || M.overflowX === "scroll" || M.overflowX === "visible"), H = R < ge && (M.overflowY === "auto" || M.overflowY === "scroll" || M.overflowY === "visible")) : (re = j < ne && (M.overflowX === "auto" || M.overflowX === "scroll"), H = R < ge && (M.overflowY === "auto" || M.overflowY === "scroll"));
      var ve = re && (Math.abs(P - n) <= s && be + j < ne) - (Math.abs(T - n) <= s && !!be), Y = H && (Math.abs(O - o) <= s && Q + R < ge) - (Math.abs(x - o) <= s && !!Q);
      if (!$[u])
        for (var oe = 0; oe <= u; oe++)
          $[oe] || ($[oe] = {});
      ($[u].vx != ve || $[u].vy != Y || $[u].el !== p) && ($[u].el = p, $[u].vx = ve, $[u].vy = Y, clearInterval($[u].pid), (ve != 0 || Y != 0) && (c = !0, $[u].pid = setInterval(function() {
        r && this.layer === 0 && g.active._onTouchMove(Ye);
        var ye = $[this.layer].vy ? $[this.layer].vy * a : 0, K = $[this.layer].vx ? $[this.layer].vx * a : 0;
        typeof d == "function" && d.call(g.dragged.parentNode[I], K, ye, i, Ye, $[this.layer].el) !== "continue" || Ht($[this.layer].el, K, ye);
      }.bind({
        layer: u
      }), 24))), u++;
    } while (e.bubbleScroll && f !== l && (f = te(f, !1)));
    lt = c;
  }
}, 30), Kt = function(e) {
  var t = e.originalEvent, r = e.putSortable, n = e.dragEl, o = e.activeSortable, s = e.dispatchSortableEvent, a = e.hideGhostForTarget, l = e.unhideGhostForTarget;
  if (t) {
    var c = r || o;
    a();
    var d = t.changedTouches && t.changedTouches.length ? t.changedTouches[0] : t, u = document.elementFromPoint(d.clientX, d.clientY);
    l(), c && !c.el.contains(u) && (s("spill"), this.onSpill({
      dragEl: n,
      putSortable: r
    }));
  }
};
function pt() {
}
pt.prototype = {
  startIndex: null,
  dragStart: function(e) {
    var t = e.oldDraggableIndex;
    this.startIndex = t;
  },
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable;
    this.sortable.captureAnimationState(), r && r.captureAnimationState();
    var n = me(this.sortable.el, this.startIndex, this.options);
    n ? this.sortable.el.insertBefore(t, n) : this.sortable.el.appendChild(t), this.sortable.animateAll(), r && r.animateAll();
  },
  drop: Kt
};
J(pt, {
  pluginName: "revertOnSpill"
});
function mt() {
}
mt.prototype = {
  onSpill: function(e) {
    var t = e.dragEl, r = e.putSortable, n = r || this.sortable;
    n.captureAnimationState(), t.parentNode && t.parentNode.removeChild(t), n.animateAll();
  },
  drop: Kt
};
J(mt, {
  pluginName: "removeOnSpill"
});
g.mount(new Rr());
g.mount(mt, pt);
class Mr {
  constructor(e) {
    this.sortable = null, this.container = e.container, this.grid = e.grid, this.onReorder = e.onReorder, this.onToggle = e.onToggle, this.onReset = e.onReset, this.initialize();
  }
  initialize() {
    this.render(), this.setupDragAndDrop(), this.bindSwitchToggles();
  }
  /**
   * Render column items using safe DOM construction
   * Uses textContent for labels to prevent XSS
   */
  render() {
    const e = this.grid.config.columns, t = this.grid.state.hiddenColumns;
    this.container.innerHTML = "";
    const r = document.createElement("div");
    r.className = "column-list", r.setAttribute("role", "list"), r.setAttribute("aria-label", "Column visibility and order"), e.forEach((o) => {
      const s = this.createColumnItem(o.field, o.label || o.field, !t.has(o.field));
      r.appendChild(s);
    }), this.container.appendChild(r);
    const n = this.createFooter();
    this.container.appendChild(n);
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
    const s = document.createElement("span");
    return s.textContent = "Reset to Default", t.appendChild(r), t.appendChild(s), t.addEventListener("click", () => {
      this.handleReset();
    }), e.appendChild(t), e;
  }
  /**
   * Handle reset button click
   */
  handleReset() {
    this.grid.resetColumnsToDefault(), this.onReset?.();
  }
  /**
   * Create a single column item element
   * Uses DOM APIs with textContent for safe label rendering
   * Includes full ARIA support for accessibility
   */
  createColumnItem(e, t, r) {
    const n = `column-item-${e}`, o = `column-switch-${e}`, s = document.createElement("div");
    s.className = "column-item", s.id = n, s.dataset.column = e, s.setAttribute("role", "listitem");
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
    ].forEach(([x, O]) => {
      const T = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      T.setAttribute("cx", String(x)), T.setAttribute("cy", String(O)), T.setAttribute("r", "1.5"), l.appendChild(T);
    });
    const d = document.createElement("span");
    d.className = "column-label", d.id = `${n}-label`, d.textContent = t, a.appendChild(l), a.appendChild(d);
    const u = document.createElement("label");
    u.className = "column-switch", u.htmlFor = o;
    const f = document.createElement("input");
    f.type = "checkbox", f.id = o, f.dataset.column = e, f.checked = r, f.setAttribute("role", "switch"), f.setAttribute("aria-checked", String(r)), f.setAttribute("aria-labelledby", `${n}-label`), f.setAttribute("aria-describedby", `${n}-desc`);
    const p = document.createElement("span");
    p.id = `${n}-desc`, p.className = "sr-only", p.textContent = `Press Space or Enter to toggle ${t} column visibility. Currently ${r ? "visible" : "hidden"}.`;
    const v = document.createElement("span");
    return v.className = "column-switch-slider", v.setAttribute("aria-hidden", "true"), u.appendChild(f), u.appendChild(v), s.appendChild(a), s.appendChild(u), s.appendChild(p), s;
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
        const o = `column-item-${r}-desc`, s = this.container.querySelector(`#${o}`);
        if (s) {
          const a = this.container.querySelector(`#column-item-${r}-label`)?.textContent || r;
          s.textContent = `Press Space or Enter to toggle ${a} column visibility. Currently ${n ? "visible" : "hidden"}.`;
        }
        this.onToggle && this.onToggle(r, n), this.grid.config.behaviors?.columnVisibility && this.grid.config.behaviors.columnVisibility.toggleColumn(r, this.grid);
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
    });
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
    this.destroy(), this.render(), this.setupDragAndDrop(), this.bindSwitchToggles();
  }
  /**
   * Cleanup - destroy SortableJS instance
   */
  destroy() {
    this.sortable && (this.sortable.destroy(), this.sortable = null);
  }
}
class Fr {
  constructor(e) {
    this.tableEl = null, this.searchTimeout = null, this.abortController = null, this.dropdownAbortController = null, this.didRestoreColumnOrder = !1, this.shouldReorderDOMOnRestore = !1, this.recordsById = {}, this.columnManager = null, this.lastSchema = null, this.lastForm = null, this.config = {
      perPage: 10,
      searchDelay: 300,
      behaviors: {},
      ...e
    }, this.notifier = e.notifier || new Xe(), this.selectors = {
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
    }, this.actionRenderer = new sr({
      mode: this.config.actionRenderMode || "dropdown",
      // Default to dropdown
      actionBasePath: this.config.actionBasePath || this.config.apiEndpoint,
      notifier: this.notifier
      // Pass notifier to ActionRenderer
    }), this.cellRendererRegistry = new ur(), this.config.cellRenderers && Object.entries(this.config.cellRenderers).forEach(([t, r]) => {
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
    const s = e.get("sort");
    if (s)
      try {
        this.state.sort = JSON.parse(s);
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
        const f = new Map(this.config.columns.map((p) => [p.field, p]));
        this.config.columns = d.map((p) => f.get(p)).filter((p) => p !== void 0), console.log("[DataGrid] Column order restored from cache:", d);
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
    this.state.hiddenColumns.clear(), this.config.columns.forEach((s) => {
      r.has(s.field) || this.state.hiddenColumns.add(s.field);
    }), t || this.pushStateToURL(), this.tableEl.querySelectorAll("thead th[data-column]").forEach((s) => {
      const a = s.dataset.column;
      a && (s.style.display = r.has(a) ? "" : "none");
    }), this.tableEl.querySelectorAll("tbody td[data-column]").forEach((s) => {
      const a = s.dataset.column;
      a && (s.style.display = r.has(a) ? "" : "none");
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
    this.recordsById = {}, r.forEach((o, s) => {
      console.log(`[DataGrid] Rendering row ${s + 1}: id=${o.id}, email=${o.email}, role=${o.role}, status=${o.status}`), o.id && (this.recordsById[o.id] = o);
      const a = this.createTableRow(o);
      t.appendChild(a);
    }), console.log(`[DataGrid] Finished appending ${r.length} rows to tbody`), console.log("[DataGrid] tbody.children.length =", t.children.length), this.state.hiddenColumns.size > 0 && t.querySelectorAll("td[data-column]").forEach((s) => {
      const a = s.dataset.column;
      a && this.state.hiddenColumns.has(a) && (s.style.display = "none");
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
      const c = e[a.field];
      if (a.render)
        l.innerHTML = a.render(c, e);
      else if (this.cellRendererRegistry.has(a.field)) {
        const d = this.cellRendererRegistry.get(a.field);
        l.innerHTML = d(c, e, a.field);
      } else c == null ? l.textContent = "-" : a.field.includes("_at") ? l.textContent = new Date(c).toLocaleDateString() : l.textContent = String(c);
      t.appendChild(l);
    });
    const o = this.config.actionBasePath || this.config.apiEndpoint, s = document.createElement("td");
    if (s.className = "px-6 py-4 whitespace-nowrap text-end text-sm font-medium", s.dataset.role = "actions", s.dataset.fixed = "right", this.config.rowActions) {
      const a = this.config.rowActions(e);
      s.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = s.querySelector(`[data-action-id="${c}"]`);
        d && d.addEventListener("click", async (u) => {
          u.preventDefault();
          try {
            await l.action(e);
          } catch (f) {
            console.error(`Action "${l.label}" failed:`, f);
            const p = f instanceof Error ? f.message : `Action "${l.label}" failed`;
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
      s.innerHTML = this.actionRenderer.renderRowActions(e, a), a.forEach((l) => {
        const c = this.sanitizeActionId(l.label), d = s.querySelector(`[data-action-id="${c}"]`);
        d && d.addEventListener("click", async (u) => {
          u.preventDefault(), u.stopPropagation();
          try {
            await l.action();
          } catch (f) {
            console.error(`Action "${l.label}" failed:`, f);
            const p = f instanceof Error ? f.message : `Action "${l.label}" failed`;
            this.notify(p, "error");
          }
        });
      });
    }
    return t.appendChild(s), t;
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
    const t = this.getResponseTotal(e) ?? this.state.totalRows, r = this.state.perPage * (this.state.currentPage - 1), n = t === 0 ? 0 : r + 1, o = Math.min(r + this.state.perPage, t), s = document.querySelector(this.selectors.tableInfoStart), a = document.querySelector(this.selectors.tableInfoEnd), l = document.querySelector(this.selectors.tableInfoTotal);
    s && (s.textContent = String(n)), a && (a.textContent = String(o)), l && (l.textContent = String(t)), this.renderPaginationButtons(t);
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
    const s = 5;
    let a = Math.max(1, o - Math.floor(s / 2)), l = Math.min(r, a + s - 1);
    l - a < s - 1 && (a = Math.max(1, l - s + 1));
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
        const n = t.dataset.filterColumn, o = t.dataset.filterOperator || "eq", s = t.value;
        if (!n) return;
        const a = this.state.filters.findIndex((l) => l.column === n);
        if (s) {
          const l = { column: n, operator: o, value: s };
          a >= 0 ? this.state.filters[a] = l : this.state.filters.push(l);
        } else
          a >= 0 && this.state.filters.splice(a, 1);
        this.pushStateToURL(), this.config.behaviors?.filter ? await this.config.behaviors.filter.onFilterChange(n, s, this) : (this.resetPagination(), await this.refresh());
      };
      t.addEventListener("input", r), t.addEventListener("change", r);
    });
  }
  /**
   * Bind column visibility toggle using ColumnManager
   */
  bindColumnVisibility() {
    const e = document.querySelector(this.selectors.columnToggleBtn), t = document.querySelector(this.selectors.columnToggleMenu);
    !e || !t || (this.columnManager = new Mr({
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
        const o = this.config.behaviors.export.getConcurrency?.() || "single", s = [];
        o === "single" ? t.forEach((d) => s.push(d)) : o === "per-format" && s.push(r);
        const a = (d) => {
          const u = d.querySelector(".export-icon"), f = d.querySelector(".export-spinner");
          u && u.classList.add("hidden"), f && f.classList.remove("hidden");
        }, l = (d) => {
          const u = d.querySelector(".export-icon"), f = d.querySelector(".export-spinner");
          u && u.classList.remove("hidden"), f && f.classList.add("hidden");
        };
        s.forEach((d) => {
          d.setAttribute("data-export-loading", "true"), d.disabled = !0, a(d);
        });
        const c = o === "none";
        c && (r.setAttribute("data-export-loading", "true"), a(r));
        try {
          await this.config.behaviors.export.export(n, this);
        } catch (d) {
          console.error("[DataGrid] Export failed:", d);
        } finally {
          s.forEach((d) => {
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
        const s = this.state.sort.find((l) => l.field === o);
        let a = null;
        s ? s.direction === "asc" ? (a = "desc", s.direction = a) : (this.state.sort = this.state.sort.filter((l) => l.field !== o), a = null, console.log(`[DataGrid] Sort cleared for field: ${o}`)) : (a = "asc", this.state.sort = [{ field: o, direction: a }]), console.log("[DataGrid] New sort state:", this.state.sort), this.pushStateToURL(), a !== null && this.config.behaviors?.sort ? (console.log("[DataGrid] Calling custom sort behavior"), await this.config.behaviors.sort.onSort(o, a, this)) : (console.log("[DataGrid] Calling refresh() for sort"), await this.refresh()), console.log("[DataGrid] Updating sort indicators"), this.updateSortIndicators();
      });
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      r.addEventListener("click", async () => {
        const n = r.dataset.sort;
        if (!n) return;
        const o = this.state.sort.find((a) => a.field === n);
        let s = null;
        o ? o.direction === "asc" ? (s = "desc", o.direction = s) : (this.state.sort = this.state.sort.filter((a) => a.field !== n), s = null) : (s = "asc", this.state.sort = [{ field: n, direction: s }]), this.pushStateToURL(), s !== null && this.config.behaviors?.sort ? await this.config.behaviors.sort.onSort(n, s, this) : await this.refresh(), this.updateSortIndicators();
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
      const o = this.state.sort.find((a) => a.field === n), s = r.querySelector("svg");
      s && (o ? (r.classList.remove("opacity-0"), r.classList.add("opacity-100"), o.direction === "asc" ? (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400")) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />', s.classList.add("text-blue-600"), s.classList.remove("text-gray-400"))) : (s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />', s.classList.remove("text-blue-600"), s.classList.add("text-gray-400")));
    }), this.tableEl.querySelectorAll("[data-sort]").forEach((r) => {
      const n = r.dataset.sort, o = this.state.sort.find((a) => a.field === n), s = r.querySelector(".sort-indicator");
      s && (s.textContent = o ? o.direction === "asc" ? "↑" : "↓" : "");
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
        const s = o, a = s.dataset.bulkAction;
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
          const c = `${t}/${a}`, d = s.dataset.bulkConfirm, u = this.parseDatasetStringArray(s.dataset.bulkPayloadRequired), f = this.parseDatasetObject(s.dataset.bulkPayloadSchema), p = {
            id: a,
            label: s.textContent?.trim() || a,
            endpoint: c,
            confirm: d,
            payloadRequired: u,
            payloadSchema: f
          };
          try {
            await this.actionRenderer.executeBulkAction(p, l), this.state.selectedRows.clear(), this.updateBulkActionsBar(), await this.refresh();
          } catch (v) {
            console.error("Bulk action failed:", v), this.showError("Bulk action failed");
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
      const s = document.querySelector(this.selectors.selectAllCheckbox);
      s && (s.checked = !1);
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
    const r = e.getBoundingClientRect(), n = t.offsetHeight || 300, s = window.innerHeight - r.bottom, a = r.top, l = s < n && a > s, c = r.right - (t.offsetWidth || 224);
    t.style.left = `${Math.max(10, c)}px`, l ? (t.style.top = `${r.top - n - 8}px`, t.style.bottom = "auto") : (t.style.top = `${r.bottom + 8}px`, t.style.bottom = "auto");
  }
  /**
   * Bind dropdown toggles
   */
  bindDropdownToggles() {
    this.dropdownAbortController && this.dropdownAbortController.abort(), this.dropdownAbortController = new AbortController();
    const { signal: e } = this.dropdownAbortController;
    document.querySelectorAll("[data-dropdown-toggle]").forEach((t) => {
      t.addEventListener("click", (r) => {
        r.stopPropagation();
        const n = t.dataset.dropdownToggle, o = document.getElementById(n || "");
        o && (o.classList.contains("hidden"), document.querySelectorAll("[data-dropdown-toggle]").forEach((s) => {
          const a = s.dataset.dropdownToggle, l = document.getElementById(a || "");
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
        const s = o?.classList.contains("hidden");
        o?.classList.toggle("hidden"), r.setAttribute("aria-expanded", s ? "true" : "false"), s && o && this.positionDropdownMenu(r, o);
      } else
        t.target.closest("[data-dropdown-toggle], #column-toggle-menu, #export-menu") || (document.querySelectorAll(".actions-menu").forEach(
          (o) => o.classList.add("hidden")
        ), document.querySelectorAll("[data-dropdown-toggle]").forEach((o) => {
          const s = o.dataset.dropdownToggle, a = document.getElementById(s || "");
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
    return e instanceof Response ? Ot(e) : e instanceof Error ? e.message : "An unexpected error occurred";
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
    const t = new Set(this.config.columns.map((s) => s.field)), r = new Set(e), n = e.filter((s) => t.has(s)), o = this.config.columns.map((s) => s.field).filter((s) => !r.has(s));
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
    ), s = Array.from(e.querySelectorAll(r)), a = e.querySelector(`${r}[data-role="selection"]`) || s.find((d) => d.querySelector('input[type="checkbox"]')), l = e.querySelector(`${r}[data-role="actions"]`) || s.find(
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
typeof window < "u" && (window.DataGrid = Fr);
const Bt = {
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
class bn {
  constructor(e) {
    this.criteria = [], this.modal = null, this.container = null, this.searchInput = null, this.clearBtn = null, this.config = e, this.notifier = e.notifier || new Xe();
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
      o.addEventListener("change", (s) => this.updateCriterion(s.target));
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
        const s = o.target, a = parseInt(s.dataset.logicIndex || "0", 10), l = s.dataset.logicValue;
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Bt[e.type] || Bt.text;
  }
  applySearch() {
    this.pushCriteriaToURL(), this.config.onSearch(this.criteria), this.renderChips(), this.close();
  }
  savePreset() {
    new yt({
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
    new yt({
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
        const s = this.createChip(n, o);
        e.appendChild(s);
      });
    }
  }
  /**
   * Create a single filter chip
   */
  createChip(e, t) {
    const r = document.createElement("div");
    r.className = "inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200";
    const o = this.config.fields.find((l) => l.name === e.field)?.label || e.field, s = e.operator === "ilike" ? "contains" : e.operator === "eq" ? "is" : e.operator;
    r.innerHTML = `
      <span>${o} ${s} "${e.value}"</span>
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
const Tt = {
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
class vn {
  constructor(e) {
    this.panel = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.config = e, this.notifier = e.notifier || new Xe(), this.structure = { groups: [], groupLogic: [] }, this.init();
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
    `, r.appendChild(n), e.conditions.forEach((s, a) => {
      const l = this.createConditionElement(s, t, a);
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
    const o = this.config.fields.find((s) => s.name === e.field) || this.config.fields[0];
    return n.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${t}-${r}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map((s) => `
          <option value="${s.name}" ${s.name === e.field ? "selected" : ""}>${s.label}</option>
        `).join("")}
      </select>

      <select data-cond="${t}-${r}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(o).map((s) => `
          <option value="${s.value}" ${s.value === e.operator ? "selected" : ""}>${s.label}</option>
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
      n.addEventListener("click", (o) => {
        const s = o.target, a = parseInt(s.dataset.groupLogic || "0", 10), l = s.dataset.logicValue;
        this.structure.groupLogic[a] = l, this.render();
      });
    }), t;
  }
  bindGroupEvents(e, t) {
    const r = e.querySelector(`[data-remove-group="${t}"]`);
    r && r.addEventListener("click", () => this.removeGroup(t));
    const n = e.querySelector(`[data-add-condition="${t}"]`);
    n && n.addEventListener("click", () => this.addCondition(t)), e.querySelectorAll("[data-cond]").forEach((o) => {
      const s = o, [a, l, c] = s.dataset.cond.split("-"), d = parseInt(a, 10), u = parseInt(l, 10);
      s.addEventListener("change", () => {
        c === "field" ? (this.structure.groups[d].conditions[u].field = s.value, this.render()) : c === "operator" ? (this.structure.groups[d].conditions[u].operator = s.value, this.updatePreview()) : c === "value" && (this.structure.groups[d].conditions[u].value = s.value, this.updatePreview());
      });
    }), e.querySelectorAll("[data-remove-cond]").forEach((o) => {
      o.addEventListener("click", (s) => {
        const l = s.target.closest("[data-remove-cond]");
        if (!l) return;
        const [c, d] = l.dataset.removeCond.split("-").map(Number);
        this.removeCondition(c, d);
      });
    }), e.querySelectorAll("[data-add-cond-or], [data-add-cond-and]").forEach((o) => {
      o.addEventListener("click", (s) => {
        const a = s.target, l = a.dataset.addCondOr !== void 0, c = l ? a.dataset.addCondOr : a.dataset.addCondAnd;
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
    return e.operators && e.operators.length > 0 ? e.operators.map((t) => ({ label: t, value: t })) : Tt[e.type] || Tt.text;
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
        const o = n.operator.toUpperCase(), s = typeof n.value == "string" ? `'${n.value}'` : n.value;
        return `${n.field} ${o === "ILIKE" ? "ILIKE" : o === "EQ" ? "=" : o} ${s}`;
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
        const o = this.config.fields.find((l) => l.name === n.field), s = o?.label || n.field, a = this.getOperatorsForField(o).find((l) => l.value === n.operator)?.label || n.operator;
        return `${s} ${a} "${n.value}"`;
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
class yn {
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
class wn {
  buildFilters(e) {
    const t = {}, r = /* @__PURE__ */ new Map();
    return e.forEach((n) => {
      if (n.value === null || n.value === void 0 || n.value === "")
        return;
      const o = n.operator || "eq", s = n.column;
      r.has(s) || r.set(s, { operator: o, values: [] }), r.get(s).values.push(n.value);
    }), r.forEach((n, o) => {
      if (n.values.length === 1) {
        const s = n.operator === "eq" ? o : `${o}__${n.operator}`;
        t[s] = n.values[0];
      } else
        n.operator === "ilike" ? t[`${o}__ilike`] = n.values.join(",") : n.operator === "eq" ? t[`${o}__in`] = n.values.join(",") : t[`${o}__${n.operator}`] = n.values.join(",");
    }), t;
  }
  async onFilterChange(e, t, r) {
    r.resetPagination(), await r.refresh();
  }
}
class xn {
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
class En {
  buildQuery(e) {
    return !e || e.length === 0 ? {} : { order: e.map((r) => `${r.field} ${r.direction}`).join(",") };
  }
  async onSort(e, t, r) {
    await r.refresh();
  }
}
class Sn {
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
    const r = qr(t, this.config, e);
    r.delivery = Nr(this.config, e);
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
      const s = o instanceof Error ? o.message : "Network error during export";
      throw ae(t, "error", s), o;
    }
    if (n.status === 202) {
      const o = await n.json().catch(() => ({}));
      ae(t, "info", "Export queued. You can download it when ready.");
      const s = o?.status_url || "";
      if (s) {
        const a = Ur(o, s);
        try {
          await Hr(s, {
            intervalMs: jr(this.config),
            timeoutMs: Gr(this.config)
          });
          const l = await fetch(a, {
            headers: {
              Accept: "application/octet-stream"
            }
          });
          if (!l.ok) {
            const c = await ct(l);
            throw ae(t, "error", c), new Error(c);
          }
          await It(l, r.definition || r.resource || "export", r.format), ae(t, "success", "Export ready.");
          return;
        } catch (l) {
          const c = l instanceof Error ? l.message : "Export failed";
          throw ae(t, "error", c), l;
        }
      }
      if (o?.download_url) {
        window.open(o.download_url, "_blank");
        return;
      }
      return;
    }
    if (!n.ok) {
      const o = await ct(n);
      throw ae(t, "error", o), new Error(o);
    }
    await It(n, r.definition || r.resource || "export", r.format), ae(t, "success", "Export ready.");
  }
}
function qr(i, e, t) {
  const r = Kr(t), n = Vr(i, e), o = Yr(i, e), s = Xr(i), a = Jr(s), l = {
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
function Nr(i, e) {
  return i.delivery ? i.delivery : (i.asyncFormats && i.asyncFormats.length > 0 ? i.asyncFormats : ["pdf"]).includes(e) ? "async" : "auto";
}
function jr(i) {
  const e = Number(i.statusPollIntervalMs);
  return Number.isFinite(e) && e > 0 ? e : 2e3;
}
function Gr(i) {
  const e = Number(i.statusPollTimeoutMs);
  return Number.isFinite(e) && e >= 0 ? e : 3e5;
}
function Ur(i, e) {
  return i?.download_url ? i.download_url : `${e.replace(/\/+$/, "")}/download`;
}
async function Hr(i, e) {
  const t = Date.now(), r = Math.max(250, e.intervalMs);
  for (; ; ) {
    const n = await fetch(i, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!n.ok) {
      const a = await ct(n);
      throw new Error(a);
    }
    const o = await n.json().catch(() => ({})), s = String(o?.state || "").toLowerCase();
    if (s === "completed")
      return o;
    if (s === "failed")
      throw new Error("Export failed");
    if (s === "canceled")
      throw new Error("Export canceled");
    if (s === "deleted")
      throw new Error("Export deleted");
    if (e.timeoutMs > 0 && Date.now() - t > e.timeoutMs)
      throw new Error("Export status timed out");
    await zr(r);
  }
}
function zr(i) {
  return new Promise((e) => setTimeout(e, i));
}
function Vr(i, e) {
  if (e.selection?.mode)
    return e.selection;
  const t = Array.from(i.state.selectedRows || []), r = t.length > 0 ? "ids" : "all";
  return {
    mode: r,
    ids: r === "ids" ? t : []
  };
}
function Yr(i, e) {
  if (Array.isArray(e.columns) && e.columns.length > 0)
    return e.columns.slice();
  const t = i.state?.hiddenColumns ? new Set(i.state.hiddenColumns) : /* @__PURE__ */ new Set();
  return (Array.isArray(i.state?.columnOrder) && i.state.columnOrder.length > 0 ? i.state.columnOrder : i.config.columns.map((n) => n.field)).filter((n) => !t.has(n));
}
function Xr(i) {
  const e = {}, t = i.config.behaviors || {};
  return t.pagination && Object.assign(e, t.pagination.buildQuery(i.state.currentPage, i.state.perPage)), i.state.search && t.search && Object.assign(e, t.search.buildQuery(i.state.search)), i.state.filters.length > 0 && t.filter && Object.assign(e, t.filter.buildFilters(i.state.filters)), i.state.sort.length > 0 && t.sort && Object.assign(e, t.sort.buildQuery(i.state.sort)), e;
}
function Jr(i) {
  const e = {}, t = [];
  return Object.entries(i).forEach(([r, n]) => {
    if (n == null || n === "")
      return;
    switch (r) {
      case "limit":
        e.limit = _t(n);
        return;
      case "offset":
        e.offset = _t(n);
        return;
      case "order":
      case "sort":
        e.sort = Qr(String(n));
        return;
      case "q":
      case "search":
        e.search = String(n);
        return;
    }
    const { field: o, op: s } = Wr(r);
    o && t.push({ field: o, op: s, value: n });
  }), t.length > 0 && (e.filters = t), e;
}
function Wr(i) {
  const e = i.split("__"), t = e[0]?.trim() || "", r = e[1]?.trim() || "eq";
  return { field: t, op: r };
}
function Qr(i) {
  return i ? i.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const t = e.split(/\s+/), r = t[0] || "", n = t[1] || "asc";
    return { field: r, desc: n.toLowerCase() === "desc" };
  }).filter((e) => e.field) : [];
}
function Kr(i) {
  const e = String(i || "").trim().toLowerCase();
  return e === "excel" || e === "xls" ? "xlsx" : e || "csv";
}
function _t(i) {
  const e = Number(i);
  return Number.isFinite(e) ? e : 0;
}
async function It(i, e, t) {
  const r = await i.blob(), n = Zr(i, e, t), o = URL.createObjectURL(r), s = document.createElement("a");
  s.href = o, s.download = n, s.rel = "noopener", document.body.appendChild(s), s.click(), s.remove(), URL.revokeObjectURL(o);
}
function Zr(i, e, t) {
  const r = i.headers.get("content-disposition") || "", n = `${e}.${t}`;
  return en(r) || n;
}
function en(i) {
  if (!i) return null;
  const e = i.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (e && e[1])
    return decodeURIComponent(e[1].replace(/"/g, "").trim());
  const t = i.match(/filename="?([^";]+)"?/i);
  return t && t[1] ? t[1].trim() : null;
}
async function ct(i) {
  if ((i.headers.get("content-type") || "").includes("application/json")) {
    const r = await i.json().catch(() => ({}));
    if (r?.error?.message)
      return r.error.message;
    if (r?.message)
      return r.message;
  }
  const t = await i.text().catch(() => "");
  return t || `Export failed (${i.status})`;
}
function ae(i, e, t) {
  const r = i.config.notifier;
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
class Cn {
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
      const s = await o.text();
      throw new Error(`Bulk action '${e}' failed: ${s}`);
    }
    await r.refresh();
  }
}
function tn(i) {
  const e = (i || "").trim();
  return !e || e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "");
}
function rn(i) {
  const e = (i || "").trim();
  return !e || e === "/" ? "" : e.replace(/\/+$/, "");
}
function Zt(i) {
  return typeof i == "object" && i !== null && "version" in i && i.version === 2;
}
class nn {
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
    const s = this.cachedOrder || t.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility: o,
      order: s.length > 0 ? s : void 0
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
      return Object.entries(t.visibility).forEach(([o, s]) => {
        !s && r.has(o) && n.add(o);
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
      if (Zt(t))
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
class kn extends nn {
  constructor(e, t) {
    const r = t.localStorageKey || `${t.resource}_datatable_columns`;
    super(e, r), this.syncTimeout = null, this.serverPrefs = null, this.resource = t.resource;
    const n = tn(t.basePath), o = rn(t.apiBasePath);
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
      return Zt(o) ? (this.serverPrefs = o, this.savePrefs(o), console.log("[ServerColumnVisibility] Loaded prefs from server:", o), o) : (console.warn("[ServerColumnVisibility] Server prefs not in V2 format:", o), null);
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
      Object.entries(t.visibility).forEach(([s, a]) => {
        a || r.add(s);
      });
      const n = new Set(e), o = (t.order || []).filter((s) => n.has(s));
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
class on {
  constructor(e) {
    this.seenActions = /* @__PURE__ */ new Set(), this.config = {
      useDefaultFallback: !0,
      appendDefaultActions: !1,
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
    const r = [], n = this.buildQueryContext();
    if (Array.isArray(t) && t.length > 0) {
      for (const o of t) {
        if (!o.name || this.seenActions.has(o.name)) continue;
        this.seenActions.add(o.name);
        const s = this.buildActionFromSchema(e, o, n);
        s && r.push(s);
      }
      this.config.appendDefaultActions && this.appendDefaultActions(r, e, n);
    } else this.config.useDefaultFallback && this.appendDefaultActions(r, e, n);
    return r;
  }
  /**
   * Build a single action from schema definition
   */
  buildActionFromSchema(e, t, r) {
    const n = t.name, o = t.label || t.label_key || n, s = t.variant || "secondary", a = t.icon, l = this.isNavigationAction(t), c = n === "delete";
    return l ? this.buildNavigationAction(e, t, o, s, a, r) : c ? this.buildDeleteAction(e, o, s, a) : this.buildPostAction(e, t, o, s, a);
  }
  /**
   * Check if action is a navigation action
   */
  isNavigationAction(e) {
    return e.type === "navigation" || e.href ? !0 : ["view", "edit", "show", "details"].includes(e.name.toLowerCase());
  }
  /**
   * Build navigation action (view, edit, etc.)
   */
  buildNavigationAction(e, t, r, n, o, s) {
    const a = String(e.id || ""), l = this.config.actionBasePath;
    let c;
    return t.href ? c = t.href.replace("{id}", a) : t.name === "edit" ? c = `${l}/${a}/edit` : c = `${l}/${a}`, s && (c += c.includes("?") ? `&${s}` : `?${s}`), {
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
    const o = String(e.id || ""), s = this.config.apiEndpoint;
    return {
      label: t,
      icon: n || "trash",
      variant: r === "secondary" ? "danger" : r,
      action: async () => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        if (!(await fetch(`${s}/${o}`, {
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
    const s = String(e.id || ""), a = t.name, l = `${this.config.apiEndpoint}/actions/${a}`;
    return {
      label: r,
      icon: o || this.getDefaultIcon(a),
      variant: n,
      action: async () => {
        if (t.confirm && !window.confirm(t.confirm))
          return;
        const c = await this.buildActionPayload(e, t);
        if (c === null)
          return;
        const d = await Rt(l, c);
        if (d.success)
          this.config.onActionSuccess?.(a, d);
        else if (d.error) {
          if (rr(d.error)) {
            const u = nr(d.error);
            if (u && this.config.onTranslationBlocker) {
              this.config.onTranslationBlocker({
                actionName: a,
                recordId: s,
                ...u
              });
              return;
            }
          }
          throw this.config.onActionError?.(a, d.error), new Error(d.error.message);
        }
      }
    };
  }
  /**
   * Build action payload from record and schema
   */
  async buildActionPayload(e, t) {
    const r = {
      id: e.id
    };
    if (this.config.locale && (r.locale = this.config.locale), this.config.environment && (r.environment = this.config.environment), this.config.panelName && (r.policy_entity = this.config.panelName), t.payload_required && t.payload_schema) {
      const n = await this.promptForPayload(t);
      if (n === null)
        return null;
      Object.assign(r, n);
    }
    return r;
  }
  /**
   * Prompt user for required payload values
   * Uses the existing PayloadInputModal from actions.ts
   */
  async promptForPayload(e) {
    const t = e.payload_schema;
    if (!t?.properties)
      return {};
    const { PayloadInputModal: r } = await Promise.resolve().then(() => sn), n = t.required || [], o = Object.entries(t.properties).map(([a, l]) => ({
      name: a,
      label: l.title || a,
      description: l.description,
      value: this.stringifyDefault(l.default),
      type: l.type || "string",
      options: this.buildFieldOptions(l)
    }));
    return await r.prompt({
      title: `Complete ${e.label || e.name}`,
      fields: o.filter((a) => n.includes(a.name))
    });
  }
  /**
   * Build field options from schema property
   */
  buildFieldOptions(e) {
    if (e.oneOf)
      return e.oneOf.filter((t) => t && "const" in t).map((t) => ({
        value: this.stringifyDefault(t.const),
        label: t.title || this.stringifyDefault(t.const)
      }));
    if (e.enum)
      return e.enum.map((t) => ({
        value: this.stringifyDefault(t),
        label: this.stringifyDefault(t)
      }));
  }
  /**
   * Stringify default value for form input
   */
  stringifyDefault(e) {
    return e == null ? "" : typeof e == "string" ? e : String(e);
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
    const n = String(t.id || ""), o = this.config.actionBasePath, s = this.config.apiEndpoint, a = [
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
            if (!(await fetch(`${s}/${n}`, {
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
function $n(i, e, t) {
  return new on(t).buildRowActions(i, e);
}
function An(i) {
  return i.schema?.actions;
}
class gt extends dt {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = r;
  }
  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(e) {
    return new Promise((t) => {
      new gt(
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
          <h3 class="text-lg font-semibold text-gray-900">${E(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${E(this.modalConfig.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${E(this.modalConfig.confirmLabel ?? "Continue")}
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
      for (const s of this.modalConfig.fields) {
        const a = this.container?.querySelector(
          `[data-payload-field="${s.name}"]`
        );
        if (!a)
          continue;
        const l = a.value.trim();
        n[s.name] = l, l || (o || (o = a), this.showFieldError(s.name, "This field is required."));
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
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${E(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${E(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    const t = e.value, n = (e.options || []).map((o) => {
      const s = o.value === t ? " selected" : "";
      return `<option value="${E(o.value)}"${s}>${E(o.label)}</option>`;
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
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${E(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${E(e.value)}"
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
const sn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PayloadInputModal: gt
}, Symbol.toStringTag, { value: "Module" }));
class bt extends dt {
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
      new bt({
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
                Cannot ${E(e)} ${E(t)}
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
            Retry ${E(e)}
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
    const t = this.localeStates.get(e) || { loading: !1, created: !1 }, r = this.config.missingFieldsByLocale?.[e], n = Array.isArray(r) && r.length > 0, o = this.getLocaleLabel(e), s = t.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${t.loading ? "opacity-50" : ""}"
          data-locale-item="${E(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${E(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${E(o)}
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
                      ${E(l)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${t.created ? this.renderOpenButton(e, t.newRecordId) : this.renderCreateButton(e, s)}
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
              data-locale="${E(e)}"
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
    const n = this.config.navigationBasePath, o = t || this.config.recordId, s = new URLSearchParams();
    s.set("locale", e), this.config.environment && s.set("env", this.config.environment);
    const a = `${n}/${o}/edit?${s.toString()}`;
    return `
      <a href="${E(a)}"
         data-blocker-action="open"
         data-locale="${E(e)}"
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
    }), this.container?.querySelector("[data-blocker-retry]")?.addEventListener("click", () => {
      this.handleRetry();
    }), this.container?.querySelectorAll('[data-blocker-action="create"]')?.forEach((o) => {
      o.addEventListener("click", () => {
        const s = o.getAttribute("data-locale");
        s && this.handleCreateTranslation(s);
      });
    });
    const n = this.container?.querySelectorAll("[data-locale-item]");
    n?.forEach((o, s) => {
      o.addEventListener("keydown", (a) => {
        a.key === "ArrowDown" && s < n.length - 1 ? (a.preventDefault(), n[s + 1].querySelector("[data-blocker-action]")?.focus()) : a.key === "ArrowUp" && s > 0 && (a.preventDefault(), n[s - 1].querySelector("[data-blocker-action]")?.focus());
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
        const n = `${this.config.apiEndpoint}/actions/create_translation`, o = await Rt(n, r);
        if (o.success) {
          t.loading = !1, t.created = !0, o.data?.id && (t.newRecordId = String(o.data.id)), this.updateLocaleItemUI(e);
          const s = {
            id: t.newRecordId || this.config.recordId,
            locale: e,
            status: String(o.data?.status || "draft"),
            translation_group_id: o.data?.translation_group_id ? String(o.data.translation_group_id) : void 0
          };
          this.config.onCreateSuccess?.(e, s);
        } else {
          t.loading = !1, this.updateLocaleItemUI(e);
          const s = o.error?.message || "Failed to create translation";
          this.config.onError?.(s);
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
    const s = o.firstElementChild;
    s && (n.replaceChild(s, t), s.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
      this.handleCreateTranslation(e);
    }));
  }
  handleRetry() {
    this.resolved = !0, this.hide();
  }
  dismiss() {
    this.resolved = !0, this.config.onDismiss?.(), this.hide();
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.config.onDismiss?.()), !0;
  }
}
async function Ln(i) {
  try {
    await bt.showBlocker(i);
  } catch (e) {
    console.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const t = i.transition || "complete action", r = i.missingLocales.join(", "), n = `Cannot ${t}: Missing translations for ${r}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(n) : alert(n);
  }
}
export {
  sr as ActionRenderer,
  bn as AdvancedSearch,
  ur as CellRendererRegistry,
  Mr as ColumnManager,
  gn as CommonRenderers,
  Fr as DataGrid,
  nn as DefaultColumnVisibilityBehavior,
  vn as FilterBuilder,
  Cn as GoCrudBulkActionBehavior,
  Sn as GoCrudExportBehavior,
  wn as GoCrudFilterBehavior,
  xn as GoCrudPaginationBehavior,
  yn as GoCrudSearchBehavior,
  En as GoCrudSortBehavior,
  gt as PayloadInputModal,
  on as SchemaActionBuilder,
  kn as ServerColumnVisibilityBehavior,
  bt as TranslationBlockerModal,
  $n as buildSchemaRowActions,
  cr as createLocaleBadgeRenderer,
  wt as createTranslationStatusRenderer,
  Bn as extractExchangeError,
  An as extractSchemaActions,
  De as extractTranslationContext,
  Tn as generateExchangeReport,
  _n as groupRowResultsByStatus,
  fn as hasTranslationContext,
  In as isExchangeError,
  hn as isInFallbackMode,
  On as parseImportResult,
  ar as renderAvailableLocalesIndicator,
  mn as renderFallbackWarning,
  Ft as renderLocaleBadge,
  pn as renderStatusBadge,
  lr as renderTranslationStatusCell,
  Ln as showTranslationBlocker
};
//# sourceMappingURL=index.js.map

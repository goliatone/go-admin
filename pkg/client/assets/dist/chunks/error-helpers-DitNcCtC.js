const f = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
}, y = 100, x = 10;
class k {
  constructor() {
    this.stack = [];
  }
  push(t) {
    return this.stack.push(t), y + this.stack.length * x;
  }
  remove(t) {
    const n = this.stack.indexOf(t);
    n !== -1 && this.stack.splice(n, 1);
  }
  isTopmost(t) {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === t;
  }
  get count() {
    return this.stack.length;
  }
}
const h = new k();
class g {
  constructor(t = {}) {
    this.backdrop = null, this.container = null, this._escHandler = null, this._isOpen = !1, this._options = {
      size: t.size ?? "lg",
      maxHeight: t.maxHeight ?? "max-h-[90vh]",
      flexColumn: t.flexColumn ?? !0,
      animationDuration: t.animationDuration ?? 150,
      dismissOnBackdropClick: t.dismissOnBackdropClick ?? !0,
      dismissOnEscape: t.dismissOnEscape ?? !0,
      lockBodyScroll: t.lockBodyScroll ?? !0,
      initialFocus: t.initialFocus ?? null,
      containerClass: t.containerClass ?? "",
      backdropDataAttr: t.backdropDataAttr ?? ""
    };
  }
  get isOpen() {
    return this._isOpen;
  }
  get options() {
    return this._options;
  }
  // ---- Lifecycle ----------------------------------------------------------
  /** Show the modal. Async to support subclass data loading in onAfterShow(). */
  async show() {
    if (this._isOpen) return;
    const t = h.push(this);
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 flex items-center justify-center bg-black/50 transition-opacity opacity-0", this.backdrop.style.zIndex = String(t), this.backdrop.style.transitionDuration = `${this._options.animationDuration}ms`, this._options.backdropDataAttr && this.backdrop.setAttribute(this._options.backdropDataAttr, "true");
    const n = f[this._options.size] ?? f.lg, i = this._options.flexColumn ? "flex flex-col" : "", l = this._options.containerClass;
    this.container = document.createElement("div"), this.container.className = [
      "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden",
      n,
      this._options.maxHeight,
      i,
      l
    ].filter(Boolean).join(" "), this.container.innerHTML = this.renderContent(), this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), this._options.lockBodyScroll && document.body.classList.add("overflow-hidden"), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    }), this._bindBaseEvents(), this.bindContentEvents(), this._isOpen = !0, await this.onAfterShow(), this._manageFocus();
  }
  /** Hide the modal with fade-out animation. */
  hide() {
    !this._isOpen || !this.backdrop || (this._isOpen = !1, h.remove(this), this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this._cleanup();
    }, this._options.animationDuration));
  }
  /** Remove immediately without animation. */
  destroy() {
    this._isOpen = !1, h.remove(this), this._cleanup();
  }
  // ---- Hooks for subclasses -----------------------------------------------
  /** Called after DOM is mounted and events are bound. Override for data loading. */
  async onAfterShow() {
  }
  /** Called before hide. Return false to prevent closing. */
  onBeforeHide() {
    return !0;
  }
  // ---- Internal -----------------------------------------------------------
  /** Try to hide; calls onBeforeHide() first. */
  requestHide() {
    this.onBeforeHide() && this.hide();
  }
  _bindBaseEvents() {
    this._options.dismissOnBackdropClick && this.backdrop && this.backdrop.addEventListener("click", (t) => {
      t.target === this.backdrop && this.requestHide();
    }), this._options.dismissOnEscape && (this._escHandler = (t) => {
      t.key === "Escape" && h.isTopmost(this) && (t.stopPropagation(), this.requestHide());
    }, document.addEventListener("keydown", this._escHandler, !0));
  }
  _manageFocus() {
    if (!this.container || !this._options.initialFocus) return;
    const t = this.container.querySelector(this._options.initialFocus);
    t && typeof t.focus == "function" && (t.focus(), t instanceof HTMLInputElement && t.select());
  }
  _cleanup() {
    this._escHandler && (document.removeEventListener("keydown", this._escHandler, !0), this._escHandler = null), this.backdrop?.remove(), this.backdrop = null, this.container = null, this._options.lockBodyScroll && h.count === 0 && document.body.classList.remove("overflow-hidden");
  }
}
class b extends g {
  constructor(t) {
    super({
      size: "md",
      maxHeight: "",
      flexColumn: !1,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0,
      lockBodyScroll: !1
    }), this._isDone = !1, this._opts = {
      title: t.title ?? "Confirm",
      message: t.message,
      confirmText: t.confirmText ?? "Confirm",
      cancelText: t.cancelText ?? "Cancel",
      confirmVariant: t.confirmVariant ?? "primary"
    };
  }
  /** Show and return a promise that resolves when user decides. */
  static confirm(t, n = {}) {
    return new b({ ...n, message: t }).prompt();
  }
  prompt() {
    return new Promise((t) => {
      this._resolve = t, this.show();
    });
  }
  renderContent() {
    const t = this._opts.confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${a(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${a(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${a(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${t}">
          ${a(this._opts.confirmText)}
        </button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-modal-cancel]")?.addEventListener("click", () => {
      this._finish(!1);
    }), this.container?.querySelector("[data-modal-confirm]")?.addEventListener("click", () => {
      this._finish(!0);
    });
  }
  onBeforeHide() {
    return this._isDone || (this._isDone = !0, this._resolve(!1)), !0;
  }
  _finish(t) {
    this._isDone || (this._isDone = !0, this._resolve(t), this.hide());
  }
}
const _ = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300";
class v extends g {
  constructor(t) {
    super({ size: "sm", initialFocus: "[data-prompt-input]" }), this.config = t;
  }
  renderContent() {
    const t = this.config.inputClass ?? _;
    return `
      <div class="p-5">
        <div class="text-base font-semibold text-gray-900 dark:text-white">${a(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${a(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${a(this.config.initialValue ?? "")}"
               placeholder="${a(this.config.placeholder ?? "")}"
               class="${t}" />
        <div data-prompt-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${a(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${a(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const t = this.container?.querySelector("[data-prompt-input]"), n = this.container?.querySelector("[data-prompt-error]"), i = this.container?.querySelector("[data-prompt-confirm]"), l = this.container?.querySelector("[data-prompt-cancel]"), e = (r) => {
      n && (n.textContent = r, n.classList.remove("hidden"));
    }, c = () => {
      const r = t?.value.trim() ?? "";
      if (!r) {
        e("Value is required."), t?.focus();
        return;
      }
      this.config.onConfirm(r), this.hide();
    };
    i?.addEventListener("click", c), t?.addEventListener("keydown", (r) => {
      r.key === "Enter" && (r.preventDefault(), c());
    }), l?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
}
function a(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function w(s) {
  const t = s.headers.get("content-type") || "", n = t.includes("application/json") || t.includes("application/problem+json"), i = await s.clone().text().catch(() => "");
  if (i) {
    if (n || i.trim().startsWith("{"))
      try {
        const e = JSON.parse(i);
        if (typeof e.error == "string" && e.error.trim()) return e.error.trim();
        if (e.error && typeof e.error == "object") {
          const c = e.error, r = typeof c.message == "string" ? c.message.trim() : "", u = [];
          if (Array.isArray(c.validation_errors))
            for (const o of c.validation_errors) {
              if (!o || typeof o != "object") continue;
              const p = o.field, d = o.message;
              typeof p == "string" && typeof d == "string" && u.push(`${p}: ${d}`);
            }
          const m = c.metadata;
          if (m && typeof m == "object") {
            const o = m.fields;
            if (o && typeof o == "object" && !Array.isArray(o))
              for (const [p, d] of Object.entries(o))
                typeof d == "string" && u.push(`${p}: ${d}`);
          }
          if (u.length > 0)
            return `${r && r.toLowerCase() !== "validation failed" ? `${r}: ` : "Validation failed: "}${u.join("; ")}`;
          if (r) return r;
        }
        if (typeof e.detail == "string" && e.detail.trim()) return e.detail.trim();
        if (typeof e.title == "string" && e.title.trim()) return e.title.trim();
        if (typeof e.message == "string" && e.message.trim()) return e.message.trim();
      } catch {
      }
    if (i.includes("go-users:")) {
      const e = i.match(/go-users:\s*([^|]+)/);
      if (e) return e[1].trim();
    }
    const l = i.match(/\|\s*([^|]+)$/);
    if (l) return l[1].trim();
    if (i.trim().length > 0 && i.length < 200) return i.trim();
  }
  return `Request failed (${s.status})`;
}
function C(s) {
  return s instanceof Error ? s.message : typeof s == "string" ? s : "An unexpected error occurred";
}
export {
  b as C,
  g as M,
  v as T,
  w as e,
  C as g
};
//# sourceMappingURL=error-helpers-DitNcCtC.js.map

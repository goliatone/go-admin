const l = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
}, p = 100, m = 10;
class f {
  constructor() {
    this.stack = [];
  }
  push(t) {
    return this.stack.push(t), p + this.stack.length * m;
  }
  remove(t) {
    const e = this.stack.indexOf(t);
    e !== -1 && this.stack.splice(e, 1);
  }
  isTopmost(t) {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === t;
  }
  get count() {
    return this.stack.length;
  }
}
const r = new f();
class d {
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
    const t = r.push(this);
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 flex items-center justify-center bg-black/50 transition-opacity opacity-0", this.backdrop.style.zIndex = String(t), this.backdrop.style.transitionDuration = `${this._options.animationDuration}ms`, this._options.backdropDataAttr && this.backdrop.setAttribute(this._options.backdropDataAttr, "true");
    const e = l[this._options.size] ?? l.lg, o = this._options.flexColumn ? "flex flex-col" : "", a = this._options.containerClass;
    this.container = document.createElement("div"), this.container.className = [
      "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden",
      e,
      this._options.maxHeight,
      o,
      a
    ].filter(Boolean).join(" "), this.container.innerHTML = this.renderContent(), this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), this._options.lockBodyScroll && document.body.classList.add("overflow-hidden"), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    }), this._bindBaseEvents(), this.bindContentEvents(), this._isOpen = !0, await this.onAfterShow(), this._manageFocus();
  }
  /** Hide the modal with fade-out animation. */
  hide() {
    !this._isOpen || !this.backdrop || (this._isOpen = !1, r.remove(this), this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this._cleanup();
    }, this._options.animationDuration));
  }
  /** Remove immediately without animation. */
  destroy() {
    this._isOpen = !1, r.remove(this), this._cleanup();
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
      t.key === "Escape" && r.isTopmost(this) && (t.stopPropagation(), this.requestHide());
    }, document.addEventListener("keydown", this._escHandler, !0));
  }
  _manageFocus() {
    if (!this.container || !this._options.initialFocus) return;
    const t = this.container.querySelector(this._options.initialFocus);
    t && typeof t.focus == "function" && (t.focus(), t instanceof HTMLInputElement && t.select());
  }
  _cleanup() {
    this._escHandler && (document.removeEventListener("keydown", this._escHandler, !0), this._escHandler = null), this.backdrop?.remove(), this.backdrop = null, this.container = null, this._options.lockBodyScroll && r.count === 0 && document.body.classList.remove("overflow-hidden");
  }
}
class h extends d {
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
  static confirm(t, e = {}) {
    return new h({ ...e, message: t }).prompt();
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
          ${i(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${i(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${i(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${t}">
          ${i(this._opts.confirmText)}
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
const g = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300";
class b extends d {
  constructor(t) {
    super({ size: "sm", initialFocus: "[data-prompt-input]" }), this.config = t;
  }
  renderContent() {
    const t = this.config.inputClass ?? g;
    return `
      <div class="p-5">
        <div class="text-base font-semibold text-gray-900 dark:text-white">${i(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${i(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${i(this.config.initialValue ?? "")}"
               placeholder="${i(this.config.placeholder ?? "")}"
               class="${t}" />
        <div data-prompt-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${i(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${i(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const t = this.container?.querySelector("[data-prompt-input]"), e = this.container?.querySelector("[data-prompt-error]"), o = this.container?.querySelector("[data-prompt-confirm]"), a = this.container?.querySelector("[data-prompt-cancel]"), u = (s) => {
      e && (e.textContent = s, e.classList.remove("hidden"));
    }, c = () => {
      const s = t?.value.trim() ?? "";
      if (!s) {
        u("Value is required."), t?.focus();
        return;
      }
      this.config.onConfirm(s), this.hide();
    };
    o?.addEventListener("click", c), t?.addEventListener("keydown", (s) => {
      s.key === "Enter" && (s.preventDefault(), c());
    }), a?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
}
function i(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export {
  h as C,
  d as M,
  b as T,
  i as e
};
//# sourceMappingURL=modal-DXPBR0f5.js.map

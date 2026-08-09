import { escapeHTML as s } from "../shared/html.js";
import { t as p } from "./modal-coordinator-Ctk09F2l.js";
var d = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
}, m = 0, h = class {
  constructor(t = {}) {
    this.backdrop = null, this.container = null, this._backdropClickHandler = null, this._isOpen = !1, this._invoker = null, this._layer = null, this._cleanupTimer = null, this._lifecycle = 0, this._mounted = !1, this._options = {
      size: t.size ?? "lg",
      maxHeight: t.maxHeight ?? "",
      flexColumn: t.flexColumn ?? !0,
      animationDuration: t.animationDuration ?? 150,
      dismissOnBackdropClick: t.dismissOnBackdropClick ?? !0,
      dismissOnEscape: t.dismissOnEscape ?? !0,
      lockBodyScroll: t.lockBodyScroll ?? !0,
      initialFocus: t.initialFocus ?? null,
      labelledBy: t.labelledBy ?? null,
      ariaLabel: t.ariaLabel ?? null,
      describedBy: t.describedBy ?? null,
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
  async show() {
    if (this._isOpen) return;
    const t = this.backdrop && this._invoker?.isConnected ? this._invoker : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this._cancelCleanupTimer(), this._cleanup(!1);
    const e = ++this._lifecycle;
    this._invoker = t;
    try {
      const i = document.createElement("div");
      this.backdrop = i, i.className = "fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-4 transition-opacity opacity-0", i.style.transitionDuration = `${this._animationDuration()}ms`, i.setAttribute("data-go-admin-modal-backdrop", "true"), this._options.backdropDataAttr && i.setAttribute(this._options.backdropDataAttr, "true");
      const l = d[this._options.size] ?? d.lg, n = this._options.flexColumn ? "flex flex-col" : "", o = this._options.containerClass, r = document.createElement("div");
      this.container = r, r.className = [
        "go-admin-modal-container bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden",
        l,
        this._options.maxHeight,
        n,
        o
      ].filter(Boolean).join(" "), r.setAttribute("data-go-admin-modal", "true"), r.setAttribute("role", "dialog"), r.setAttribute("aria-modal", "true"), this._layer = p({
        container: r,
        zIndexTarget: i,
        initialFocus: this._options.initialFocus,
        returnFocus: this._invoker,
        dismissOnEscape: this._options.dismissOnEscape,
        onEscape: () => this.requestHide(),
        lockBodyScroll: this._options.lockBodyScroll
      }), r.innerHTML = this.renderContent(), this._applyAccessibleName(), i.appendChild(r), document.body.appendChild(i), this._mounted = !0, (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (a) => (a(0), 0))(() => {
        i === this.backdrop && i.classList.remove("opacity-0");
      }), this._bindBaseEvents(), this.bindContentEvents(), this._isOpen = !0, this._focusInitial(), await this.onAfterShow();
    } catch (i) {
      throw e === this._lifecycle && (++this._lifecycle, this._isOpen = !1, this._cleanup(!0)), i;
    }
  }
  hide() {
    this.requestClose();
  }
  requestClose() {
    return !this._isOpen || !this.backdrop || !this.onBeforeHide() ? !1 : (this._beginClose(), !0);
  }
  destroy() {
    ++this._lifecycle, this._isOpen = !1, this._cancelCleanupTimer(), this._cleanup(!0);
  }
  async onAfterShow() {
  }
  onBeforeHide() {
    return !0;
  }
  onAfterHide() {
  }
  replaceContent(t, e) {
    this.container && (this.container.innerHTML = t, this._applyAccessibleName(), this.bindContentEvents(), this._focusInitial(e));
  }
  refreshFocus(t) {
    this._focusInitial(t);
  }
  requestHide() {
    this.requestClose();
  }
  _bindBaseEvents() {
    this._options.dismissOnBackdropClick && this.backdrop && (this._backdropClickHandler = (t) => {
      t.target === this.backdrop && this._layer?.isTopmost() && this.requestHide();
    }, this.backdrop.addEventListener("click", this._backdropClickHandler));
  }
  _applyAccessibleName() {
    if (this.container) {
      if (this.container.removeAttribute("aria-label"), this.container.removeAttribute("aria-labelledby"), this.container.removeAttribute("aria-describedby"), this._options.labelledBy) this.container.setAttribute("aria-labelledby", this._options.labelledBy);
      else if (this._options.ariaLabel) this.container.setAttribute("aria-label", this._options.ariaLabel);
      else {
        const t = this.container.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
        t ? (t.id || (t.id = `go-admin-modal-title-${++m}`), this.container.setAttribute("aria-labelledby", t.id)) : (this.container.setAttribute("aria-label", "Dialog"), console.warn("Modal opened without labelledBy, ariaLabel, or heading; using fallback accessible name."));
      }
      this._options.describedBy && this.container.setAttribute("aria-describedby", this._options.describedBy);
    }
  }
  _focusInitial(t) {
    this._layer?.focusInitial(t);
  }
  _beginClose() {
    ++this._lifecycle, this._isOpen = !1, this._layer?.setClosing(!0), this.backdrop?.classList.add("opacity-0"), this._cancelCleanupTimer();
    const t = this._animationDuration();
    if (t === 0) {
      this._cleanup(!0);
      return;
    }
    this._cleanupTimer = setTimeout(() => this._cleanup(!0), t);
  }
  _cleanup(t) {
    const e = this._mounted;
    this._mounted = !1, this.backdrop && this._backdropClickHandler && this.backdrop.removeEventListener("click", this._backdropClickHandler), this._backdropClickHandler = null, this.backdrop?.remove(), this.backdrop = null;
    const i = this._layer;
    this._layer = null, i?.release({ restoreFocus: t }), this.container = null, this._invoker = null, e && this.onAfterHide();
  }
  _animationDuration() {
    return typeof window < "u" && typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, this._options.animationDuration);
  }
  _cancelCleanupTimer() {
    this._cleanupTimer !== null && (clearTimeout(this._cleanupTimer), this._cleanupTimer = null);
  }
}, _ = class u extends h {
  constructor(e) {
    super({
      size: "md",
      maxHeight: "",
      flexColumn: !1,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0,
      lockBodyScroll: !1,
      ariaLabel: e.title ?? "Confirm"
    }), this._isDone = !1, this._opts = {
      title: e.title ?? "Confirm",
      message: e.message,
      confirmText: e.confirmText ?? "Confirm",
      cancelText: e.cancelText ?? "Cancel",
      confirmVariant: e.confirmVariant ?? "primary"
    };
  }
  static confirm(e, i = {}) {
    return new u({
      ...i,
      message: e
    }).prompt();
  }
  prompt() {
    return new Promise((e) => {
      this._resolve = e, this.show();
    });
  }
  renderContent() {
    const e = this._opts.confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${s(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${s(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${s(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${e}">
          ${s(this._opts.confirmText)}
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
  _finish(e) {
    this._isDone || (this._isDone = !0, this._resolve(e), this.hide());
  }
}, b = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300", f = 0, x = class extends h {
  constructor(t) {
    super({
      size: "sm",
      initialFocus: "[data-prompt-input]",
      ariaLabel: t.title
    }), this.config = t;
    const e = ++f;
    this.inputId = `go-admin-text-prompt-input-${e}`, this.helpId = `go-admin-text-prompt-help-${e}`, this.errorId = `go-admin-text-prompt-error-${e}`;
  }
  renderContent() {
    const t = this.config.inputClass ?? b;
    return `
      <div class="p-5">
        <div role="heading" aria-level="2" class="text-base font-semibold text-gray-900 dark:text-white">${s(this.config.title)}</div>
        <label for="${this.inputId}" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${s(this.config.label)}</label>
        <input type="text"
               id="${this.inputId}"
               data-prompt-input
               aria-describedby="${this.config.helpText ? `${this.helpId} ` : ""}${this.errorId}"
               value="${s(this.config.initialValue ?? "")}"
               placeholder="${s(this.config.placeholder ?? "")}"
               class="${t}" />
        ${this.config.helpText ? `<p id="${this.helpId}" class="mt-1 text-xs text-gray-500 dark:text-gray-400">${s(this.config.helpText)}</p>` : ""}
        <div id="${this.errorId}" data-prompt-error role="alert" aria-live="assertive" class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${s(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${s(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const t = this.container?.querySelector("[data-prompt-input]"), e = this.container?.querySelector("[data-prompt-error]"), i = this.container?.querySelector("[data-prompt-confirm]"), l = this.container?.querySelector("[data-prompt-cancel]"), n = (r) => {
      e && (e.textContent = r, e.classList.remove("hidden"), t?.setAttribute("aria-invalid", "true"));
    };
    t?.addEventListener("input", () => {
      t.removeAttribute("aria-invalid"), e?.classList.add("hidden"), e && (e.textContent = "");
    });
    const o = async () => {
      const r = t?.value.trim() ?? "";
      if (!r) {
        n("Value is required."), t?.focus();
        return;
      }
      const a = await this.config.onConfirm(r), c = a === !1 ? "Value is invalid." : typeof a == "string" ? a : a && typeof a == "object" && typeof a.error == "string" ? a.error : "";
      if (c) {
        n(c), t?.focus();
        return;
      }
      this.hide();
    };
    i?.addEventListener("click", () => {
      o();
    }), t?.addEventListener("keydown", (r) => {
      r.key === "Enter" && (r.preventDefault(), o());
    }), l?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
};
export {
  h as n,
  x as r,
  _ as t
};

//# sourceMappingURL=modal-3jeDrPyW.js.map
import { createLogger as u } from "../shared/logger.js";
import { escapeHTML as r } from "../shared/html.js";
import { n as p } from "./modal-coordinator-HTtA8-3F.js";
var b = u("Modal"), d = Object.freeze({
  root: "go-admin-modal",
  backdrop: "go-admin-modal__backdrop",
  container: "go-admin-modal__container",
  surface: "go-admin-modal__surface",
  header: "go-admin-modal__header",
  body: "go-admin-modal__body",
  footer: "go-admin-modal__footer",
  close: "go-admin-modal__close"
}), f = 0, h = class {
  constructor(e = {}) {
    this.backdrop = null, this.container = null, this._backdropClickHandler = null, this._isOpen = !1, this._invoker = null, this._layer = null, this._cleanupTimer = null, this._lifecycle = 0, this._mounted = !1, this._isMaximized = !1, this._options = {
      size: e.size ?? "lg",
      maxHeight: e.maxHeight ?? "",
      flexColumn: e.flexColumn ?? !0,
      animationDuration: e.animationDuration ?? 150,
      dismissOnBackdropClick: e.dismissOnBackdropClick ?? !0,
      dismissOnEscape: e.dismissOnEscape ?? !0,
      lockBodyScroll: e.lockBodyScroll ?? !0,
      initialFocus: e.initialFocus ?? null,
      labelledBy: e.labelledBy ?? null,
      ariaLabel: e.ariaLabel ?? null,
      describedBy: e.describedBy ?? null,
      containerClass: e.containerClass ?? "",
      backdropDataAttr: e.backdropDataAttr ?? "",
      maximizable: e.maximizable ?? !1
    };
  }
  get isOpen() {
    return this._isOpen;
  }
  get isMaximized() {
    return this._isMaximized;
  }
  get options() {
    return this._options;
  }
  async show() {
    if (this._isOpen) return;
    const e = this.backdrop && this._invoker?.isConnected ? this._invoker : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this._cancelCleanupTimer(), this._cleanup(!1);
    const t = ++this._lifecycle;
    this._invoker = e;
    try {
      const i = document.createElement("div");
      this.backdrop = i, i.className = [
        d.root,
        d.backdrop,
        "go-admin-modal--opening",
        "fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain p-4 transition-opacity"
      ].join(" "), i.style.transitionDuration = `${this._animationDuration()}ms`, i.setAttribute("data-go-admin-modal-backdrop", "true"), i.setAttribute("data-state", "opening"), this._options.backdropDataAttr && i.setAttribute(this._options.backdropDataAttr, "true");
      const n = this._options.size ?? "lg", o = this._options.flexColumn ? "go-admin-modal__container--flex flex flex-col" : "", l = this._options.containerClass, a = document.createElement("div");
      this.container = a, a.className = [
        "go-admin-modal-container w-full overflow-hidden",
        d.container,
        d.surface,
        `go-admin-modal__container--${n}`,
        this._options.maxHeight,
        o,
        l
      ].filter(Boolean).join(" "), a.setAttribute("data-go-admin-modal", "true"), a.setAttribute("data-size", n), a.setAttribute("role", "dialog"), a.setAttribute("aria-modal", "true"), a.setAttribute("data-maximized", String(this._isMaximized)), this._options.maximizable && a.setAttribute("data-maximizable", "true"), this._layer = p({
        container: a,
        zIndexTarget: i,
        initialFocus: this._options.initialFocus,
        returnFocus: this._invoker,
        dismissOnEscape: this._options.dismissOnEscape,
        onEscape: () => this.requestHide(),
        lockBodyScroll: this._options.lockBodyScroll
      }), a.innerHTML = this.renderContent(), this._applyAccessibleName(), i.appendChild(a), document.body.appendChild(i), this._mounted = !0, (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (s) => (s(0), 0))(() => {
        i === this.backdrop && (i.classList.remove("go-admin-modal--opening"), i.setAttribute("data-state", "open"));
      }), this._bindBaseEvents(), this.bindContentEvents(), this._isOpen = !0, this._focusInitial(), await this.onAfterShow();
    } catch (i) {
      throw t === this._lifecycle && (++this._lifecycle, this._isOpen = !1, this._cleanup(!0)), i;
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
  toggleMaximized(e) {
    return this.setMaximized(!this._isMaximized, e);
  }
  setMaximized(e, t) {
    return this._options.maximizable ? (this._isMaximized = !!e, this.container?.setAttribute("data-maximized", String(this._isMaximized)), t && t.setAttribute("aria-expanded", String(this._isMaximized)), this.onMaximizedChange(this._isMaximized), this._isMaximized) : !1;
  }
  async onAfterShow() {
  }
  onBeforeHide() {
    return !0;
  }
  onAfterHide() {
  }
  onMaximizedChange(e) {
  }
  replaceContent(e, t) {
    this.container && (this.container.innerHTML = e, this._applyAccessibleName(), this.bindContentEvents(), this._focusInitial(t));
  }
  refreshFocus(e) {
    this._focusInitial(e);
  }
  requestHide() {
    if (this._isMaximized) {
      this.setMaximized(!1);
      return;
    }
    this.requestClose();
  }
  _bindBaseEvents() {
    this._options.dismissOnBackdropClick && this.backdrop && (this._backdropClickHandler = (e) => {
      e.target === this.backdrop && this._layer?.isTopmost() && this.requestHide();
    }, this.backdrop.addEventListener("click", this._backdropClickHandler));
  }
  _applyAccessibleName() {
    if (this.container) {
      if (this.container.removeAttribute("aria-label"), this.container.removeAttribute("aria-labelledby"), this.container.removeAttribute("aria-describedby"), this._options.labelledBy) this.container.setAttribute("aria-labelledby", this._options.labelledBy);
      else if (this._options.ariaLabel) this.container.setAttribute("aria-label", this._options.ariaLabel);
      else {
        const e = this.container.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
        e ? (e.id || (e.id = `go-admin-modal-title-${++f}`), this.container.setAttribute("aria-labelledby", e.id)) : (this.container.setAttribute("aria-label", "Dialog"), b.warn("Modal opened without labelledBy, ariaLabel, or heading; using fallback accessible name."));
      }
      this._options.describedBy && this.container.setAttribute("aria-describedby", this._options.describedBy);
    }
  }
  _focusInitial(e) {
    this._layer?.focusInitial(e);
  }
  _beginClose() {
    ++this._lifecycle, this._isOpen = !1, this._layer?.setClosing(!0), this.backdrop?.classList.remove("go-admin-modal--opening"), this.backdrop?.classList.add("go-admin-modal--closing"), this.backdrop?.setAttribute("data-state", "closing"), this._cancelCleanupTimer();
    const e = this._animationDuration();
    if (e === 0) {
      this._cleanup(!0);
      return;
    }
    this._cleanupTimer = setTimeout(() => this._cleanup(!0), e);
  }
  _cleanup(e) {
    const t = this._mounted;
    this._mounted = !1, this.backdrop && this._backdropClickHandler && this.backdrop.removeEventListener("click", this._backdropClickHandler), this._backdropClickHandler = null, this.backdrop?.remove(), this.backdrop = null;
    const i = this._layer;
    this._layer = null, i?.release({ restoreFocus: e }), this.container = null, this._invoker = null, t && this.onAfterHide();
  }
  _animationDuration() {
    return typeof window < "u" && typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, this._options.animationDuration);
  }
  _cancelCleanupTimer() {
    this._cleanupTimer !== null && (clearTimeout(this._cleanupTimer), this._cleanupTimer = null);
  }
}, v = class m extends h {
  constructor(t) {
    super({
      size: "md",
      maxHeight: "",
      flexColumn: !1,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0,
      lockBodyScroll: !1,
      ariaLabel: t.title ?? "Confirm"
    }), this._isDone = !1, this._opts = {
      title: t.title ?? "Confirm",
      message: t.message,
      confirmText: t.confirmText ?? "Confirm",
      cancelText: t.cancelText ?? "Cancel",
      confirmVariant: t.confirmVariant ?? "primary"
    };
  }
  static confirm(t, i = {}) {
    return new m({
      ...i,
      message: t
    }).prompt();
  }
  prompt() {
    return new Promise((t) => {
      this._resolve = t, this.show();
    });
  }
  renderContent() {
    const t = this._opts.confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";
    return `
      <div class="go-admin-modal__header px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${r(this._opts.title)}
        </h3>
      </div>
      <div class="go-admin-modal__body px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${r(this._opts.message)}
        </p>
      </div>
      <div class="go-admin-modal__footer flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="go-admin-modal__close px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${r(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${t}">
          ${r(this._opts.confirmText)}
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
}, _ = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300", g = 0, C = class extends h {
  constructor(e) {
    super({
      size: "sm",
      initialFocus: "[data-prompt-input]",
      ariaLabel: e.title
    }), this.config = e;
    const t = ++g;
    this.inputId = `go-admin-text-prompt-input-${t}`, this.helpId = `go-admin-text-prompt-help-${t}`, this.errorId = `go-admin-text-prompt-error-${t}`;
  }
  renderContent() {
    const e = this.config.inputClass ?? _;
    return `
      <div class="go-admin-modal__body p-5">
        <div role="heading" aria-level="2" class="text-base font-semibold text-gray-900 dark:text-white">${r(this.config.title)}</div>
        <label for="${this.inputId}" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${r(this.config.label)}</label>
        <input type="text"
               id="${this.inputId}"
               data-prompt-input
               aria-describedby="${this.config.helpText ? `${this.helpId} ` : ""}${this.errorId}"
               value="${r(this.config.initialValue ?? "")}"
               placeholder="${r(this.config.placeholder ?? "")}"
               class="${e}" />
        ${this.config.helpText ? `<p id="${this.helpId}" class="mt-1 text-xs text-gray-500 dark:text-gray-400">${r(this.config.helpText)}</p>` : ""}
        <div id="${this.errorId}" data-prompt-error role="alert" aria-live="assertive" class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="go-admin-modal__close px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${r(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${r(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-prompt-input]"), t = this.container?.querySelector("[data-prompt-error]"), i = this.container?.querySelector("[data-prompt-confirm]"), n = this.container?.querySelector("[data-prompt-cancel]"), o = (a) => {
      t && (t.textContent = a, t.classList.remove("hidden"), e?.setAttribute("aria-invalid", "true"));
    };
    e?.addEventListener("input", () => {
      e.removeAttribute("aria-invalid"), t?.classList.add("hidden"), t && (t.textContent = "");
    });
    const l = async () => {
      const a = e?.value.trim() ?? "";
      if (!a) {
        o("Value is required."), e?.focus();
        return;
      }
      const s = await this.config.onConfirm(a), c = s === !1 ? "Value is invalid." : typeof s == "string" ? s : s && typeof s == "object" && typeof s.error == "string" ? s.error : "";
      if (c) {
        o(c), e?.focus();
        return;
      }
      this.hide();
    };
    i?.addEventListener("click", () => {
      l();
    }), e?.addEventListener("keydown", (a) => {
      a.key === "Enter" && (a.preventDefault(), l());
    }), n?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
};
export {
  C as i,
  d as n,
  h as r,
  v as t
};

//# sourceMappingURL=modal-Cg0_ZVPf.js.map
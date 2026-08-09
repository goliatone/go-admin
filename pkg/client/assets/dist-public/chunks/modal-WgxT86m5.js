import { escapeHTML as n } from "../shared/html.js";
var h = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
}, p = 100, b = 10, m = 0, y = class {
  constructor() {
    this.stack = [], this.scrollLockCount = 0, this.bodyHadScrollLock = !1;
  }
  push(t) {
    return this.remove(t), this.stack.push(t), p + this.stack.length * b;
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
  lockBody() {
    this.scrollLockCount === 0 && (this.bodyHadScrollLock = document.body.classList.contains("overflow-hidden"), document.body.classList.add("overflow-hidden")), this.scrollLockCount += 1;
  }
  unlockBody() {
    this.scrollLockCount !== 0 && (this.scrollLockCount -= 1, this.scrollLockCount === 0 && !this.bodyHadScrollLock && document.body.classList.remove("overflow-hidden"));
  }
}, a = new y(), u = class {
  constructor(t = {}) {
    this.backdrop = null, this.container = null, this._documentKeyHandler = null, this._backdropClickHandler = null, this._isOpen = !1, this._invoker = null, this._bodyLocked = !1, this._cleanupTimer = null, this._lifecycle = 0, this._fallbackTabIndex = !1, this._options = {
      size: t.size ?? "lg",
      maxHeight: t.maxHeight ?? "max-h-[90vh]",
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
    const i = a.push(this);
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-4 transition-opacity opacity-0", this.backdrop.style.zIndex = String(i), this.backdrop.style.transitionDuration = `${this._animationDuration()}ms`, this.backdrop.setAttribute("data-go-admin-modal-backdrop", "true"), this._options.backdropDataAttr && this.backdrop.setAttribute(this._options.backdropDataAttr, "true");
    const s = h[this._options.size] ?? h.lg, o = this._options.flexColumn ? "flex flex-col" : "", c = this._options.containerClass;
    this.container = document.createElement("div"), this.container.className = [
      "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden",
      s,
      this._options.maxHeight,
      o,
      c
    ].filter(Boolean).join(" "), this.container.setAttribute("data-go-admin-modal", "true"), this.container.setAttribute("role", "dialog"), this.container.setAttribute("aria-modal", "true"), this.container.innerHTML = this.renderContent(), this._applyAccessibleName(), this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), this._options.lockBodyScroll && (a.lockBody(), this._bodyLocked = !0, this.backdrop.setAttribute("data-go-admin-modal-scroll-lock", "true")), (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (r) => (r(0), 0))(() => {
      this.backdrop?.classList.remove("opacity-0");
    }), this._bindBaseEvents(), this.bindContentEvents(), this._isOpen = !0;
    try {
      await this.onAfterShow();
    } catch (r) {
      throw this.destroy(), r;
    }
    this._isOpen && e === this._lifecycle && this._focusInitial();
  }
  hide() {
    this.requestClose();
  }
  requestClose() {
    return !this._isOpen || !this.backdrop || !this.onBeforeHide() ? !1 : (this._beginClose(), !0);
  }
  destroy() {
    ++this._lifecycle, this._isOpen = !1, a.remove(this), this._cancelCleanupTimer(), this._cleanup(!0);
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
      t.target === this.backdrop && a.isTopmost(this) && this.requestHide();
    }, this.backdrop.addEventListener("click", this._backdropClickHandler)), this._documentKeyHandler = (t) => {
      if (!(!this._isOpen || !a.isTopmost(this))) {
        if (t.key === "Escape" && this._options.dismissOnEscape) {
          t.preventDefault(), t.stopPropagation(), this.requestHide();
          return;
        }
        t.key === "Tab" && this._trapFocus(t);
      }
    }, document.addEventListener("keydown", this._documentKeyHandler, !0);
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
    if (!this.container || !this._isOpen || !a.isTopmost(this)) return;
    const e = t === void 0 ? this._options.initialFocus : t, i = this._resolveFocusTarget(e), s = (i && this._canReceiveFocus(i) ? i : null) ?? this._focusableElements()[0] ?? this.container;
    s === this.container && !this.container.hasAttribute("tabindex") && (this.container.setAttribute("tabindex", "-1"), this._fallbackTabIndex = !0), s.focus({ preventScroll: !0 }), s.tagName === "INPUT" && typeof s.select == "function" && s.select();
  }
  _resolveFocusTarget(t) {
    if (!t || !this.container) return null;
    if (typeof t != "string") return t.isConnected && this.container.contains(t) ? t : null;
    try {
      return this.container.querySelector(t);
    } catch {
      return null;
    }
  }
  _focusableElements() {
    if (!this.container) return [];
    const t = [
      "a[href]",
      "area[href]",
      "button:not([disabled])",
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      "textarea:not([disabled])",
      "iframe",
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");
    return Array.from(this.container.querySelectorAll(t)).filter((e) => this._canReceiveFocus(e));
  }
  _canReceiveFocus(t) {
    if (!t.isConnected || t.closest('[hidden], [aria-hidden="true"], [inert]') || t.matches(":disabled")) return !1;
    const e = typeof window.getComputedStyle == "function" ? window.getComputedStyle(t) : null;
    return e?.display !== "none" && e?.visibility !== "hidden";
  }
  _trapFocus(t) {
    if (!this.container) return;
    const e = this._focusableElements();
    if (e.length === 0) {
      t.preventDefault(), this._focusInitial(null);
      return;
    }
    const i = e[0], s = e[e.length - 1], o = document.activeElement;
    this.container.contains(o) ? t.shiftKey && o === i ? (t.preventDefault(), s.focus()) : !t.shiftKey && o === s && (t.preventDefault(), i.focus()) : (t.preventDefault(), (t.shiftKey ? s : i).focus());
  }
  _beginClose() {
    ++this._lifecycle, this._isOpen = !1, this.backdrop?.classList.add("opacity-0"), this._cancelCleanupTimer();
    const t = this._animationDuration();
    if (t === 0) {
      this._cleanup(!0);
      return;
    }
    this._cleanupTimer = setTimeout(() => this._cleanup(!0), t);
  }
  _cleanup(t) {
    const e = !!(this.backdrop || this.container);
    a.remove(this), this._documentKeyHandler && (document.removeEventListener("keydown", this._documentKeyHandler, !0), this._documentKeyHandler = null), this.backdrop && this._backdropClickHandler && this.backdrop.removeEventListener("click", this._backdropClickHandler), this._backdropClickHandler = null, this.backdrop?.remove(), this.backdrop = null, this.container && this._fallbackTabIndex && this.container.removeAttribute("tabindex"), this.container = null, this._fallbackTabIndex = !1, this._bodyLocked && (a.unlockBody(), this._bodyLocked = !1), t && this._invoker && this._canReceiveFocus(this._invoker) && this._invoker.focus({ preventScroll: !0 }), this._invoker = null, e && this.onAfterHide();
  }
  _animationDuration() {
    return typeof window < "u" && typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, this._options.animationDuration);
  }
  _cancelCleanupTimer() {
    this._cleanupTimer !== null && (clearTimeout(this._cleanupTimer), this._cleanupTimer = null);
  }
}, g = class f extends u {
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
    return new f({
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
          ${n(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${n(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${n(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${e}">
          ${n(this._opts.confirmText)}
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
}, k = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300", x = class extends u {
  constructor(t) {
    super({
      size: "sm",
      initialFocus: "[data-prompt-input]",
      ariaLabel: t.title
    }), this.config = t;
  }
  renderContent() {
    const t = this.config.inputClass ?? k;
    return `
      <div class="p-5">
        <div role="heading" aria-level="2" class="text-base font-semibold text-gray-900 dark:text-white">${n(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${n(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${n(this.config.initialValue ?? "")}"
               placeholder="${n(this.config.placeholder ?? "")}"
               class="${t}" />
        ${this.config.helpText ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">${n(this.config.helpText)}</p>` : ""}
        <div data-prompt-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${n(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${n(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const t = this.container?.querySelector("[data-prompt-input]"), e = this.container?.querySelector("[data-prompt-error]"), i = this.container?.querySelector("[data-prompt-confirm]"), s = this.container?.querySelector("[data-prompt-cancel]"), o = (r) => {
      e && (e.textContent = r, e.classList.remove("hidden"));
    }, c = async () => {
      const r = t?.value.trim() ?? "";
      if (!r) {
        o("Value is required."), t?.focus();
        return;
      }
      const l = await this.config.onConfirm(r), d = l === !1 ? "Value is invalid." : typeof l == "string" ? l : l && typeof l == "object" && typeof l.error == "string" ? l.error : "";
      if (d) {
        o(d), t?.focus();
        return;
      }
      this.hide();
    };
    i?.addEventListener("click", () => {
      c();
    }), t?.addEventListener("keydown", (r) => {
      r.key === "Enter" && (r.preventDefault(), c());
    }), s?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
};
export {
  u as n,
  x as r,
  g as t
};

//# sourceMappingURL=modal-WgxT86m5.js.map
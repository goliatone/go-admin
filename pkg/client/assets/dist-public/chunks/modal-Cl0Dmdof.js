import { escapeHTML as o } from "../shared/html.js";
var y = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  '[contenteditable="true"]',
  "[tabindex]"
].join(","), g = 100, x = 10;
function k(t) {
  const e = t.ownerDocument.defaultView;
  let i = t;
  for (; i; ) {
    if (i.hasAttribute("hidden") || i.getAttribute("aria-hidden") === "true" || i.hasAttribute("inert")) return !0;
    const r = e?.getComputedStyle(i);
    if (r?.display === "none" || r?.visibility === "hidden") return !0;
    i = i.parentElement;
  }
  return !1;
}
function d(t) {
  return !(!t.isConnected || k(t) || t.matches(":disabled"));
}
function h(t) {
  return Array.from(t.querySelectorAll(y)).filter((e) => e.tabIndex >= 0 && d(e));
}
function _(t, e) {
  if (!e) return null;
  if (typeof e != "string") return e.isConnected && t.contains(e) ? e : null;
  try {
    return t.querySelector(e);
  } catch {
    return null;
  }
}
function l(t, e = !1) {
  return !d(t) || (t.focus({ preventScroll: !0 }), t.ownerDocument.activeElement !== t) ? !1 : (e && t.tagName === "INPUT" && typeof t.select == "function" && t.select(), !0);
}
var v = class {
  constructor(t) {
    this.ownerDocument = t, this.layers = [], this.nextLayerIndex = 0, this.scrollLockCount = 0, this.bodyHadScrollLock = !1, this.handleKeyDown = (e) => {
      const i = this.topmost();
      if (i) {
        if (e.key === "Escape") {
          if (i.closing || !i.dismissOnEscape) return;
          e.preventDefault(), e.stopPropagation(), i.onEscape?.();
          return;
        }
        e.key === "Tab" && this.trapFocus(i, e);
      }
    };
  }
  register(t) {
    const e = t.zIndexTarget ?? t.container, i = {
      container: t.container,
      zIndexTarget: e,
      initialFocus: t.initialFocus ?? null,
      returnFocus: t.returnFocus ?? null,
      dismissOnEscape: t.dismissOnEscape ?? !0,
      onEscape: t.onEscape,
      lockBodyScroll: t.lockBodyScroll ?? !0,
      zIndex: g + ++this.nextLayerIndex * x,
      closing: !1,
      released: !1,
      addedFallbackTabIndex: !1,
      previousZIndex: e.style.zIndex,
      previousScrollLockMarker: e.getAttribute("data-go-admin-modal-scroll-lock")
    };
    return this.layers.length === 0 && this.ownerDocument.addEventListener("keydown", this.handleKeyDown, !0), this.layers.push(i), e.style.zIndex = String(i.zIndex), i.lockBodyScroll && this.lockBody(i), {
      zIndex: i.zIndex,
      isTopmost: () => this.topmost() === i,
      focusInitial: (r) => {
        this.topmost() !== i || i.released || this.focusInitial(i, r);
      },
      setClosing: (r) => {
        i.released || (i.closing = r);
      },
      release: (r = {}) => {
        this.release(i, r.restoreFocus ?? !0);
      }
    };
  }
  topmost() {
    return this.layers[this.layers.length - 1] ?? null;
  }
  focusInitial(t, e) {
    const i = e === void 0 ? t.initialFocus : e, r = _(t.container, i);
    if (r && l(r, !0)) return;
    const n = h(t.container)[0];
    n && l(n, !0) || (t.container.hasAttribute("tabindex") || (t.container.setAttribute("tabindex", "-1"), t.addedFallbackTabIndex = !0), l(t.container));
  }
  trapFocus(t, e) {
    const i = h(t.container);
    if (i.length === 0) {
      e.preventDefault(), this.focusInitial(t, null);
      return;
    }
    const r = this.ownerDocument.activeElement, n = i.indexOf(r);
    if (n === -1) {
      e.preventDefault(), l(e.shiftKey ? i[i.length - 1] : i[0]);
      return;
    }
    e.shiftKey && n === 0 ? (e.preventDefault(), l(i[i.length - 1])) : !e.shiftKey && n === i.length - 1 && (e.preventDefault(), l(i[0]));
  }
  lockBody(t) {
    this.scrollLockCount === 0 && (this.bodyHadScrollLock = this.ownerDocument.body.classList.contains("overflow-hidden"), this.ownerDocument.body.classList.add("overflow-hidden")), this.scrollLockCount += 1, t.zIndexTarget.setAttribute("data-go-admin-modal-scroll-lock", "true");
  }
  unlockBody(t) {
    t.previousScrollLockMarker === null ? t.zIndexTarget.removeAttribute("data-go-admin-modal-scroll-lock") : t.zIndexTarget.setAttribute("data-go-admin-modal-scroll-lock", t.previousScrollLockMarker), this.scrollLockCount !== 0 && (this.scrollLockCount -= 1, this.scrollLockCount === 0 && !this.bodyHadScrollLock && this.ownerDocument.body.classList.remove("overflow-hidden"));
  }
  release(t, e) {
    if (t.released) return;
    const i = this.topmost() === t;
    t.released = !0;
    const r = this.layers.indexOf(t);
    if (r !== -1 && this.layers.splice(r, 1), t.lockBodyScroll && this.unlockBody(t), t.zIndexTarget.style.zIndex = t.previousZIndex, t.addedFallbackTabIndex && t.container.removeAttribute("tabindex"), this.layers.length === 0 && (this.ownerDocument.removeEventListener("keydown", this.handleKeyDown, !0), this.nextLayerIndex = 0), !e || !i) return;
    const n = this.topmost();
    t.returnFocus && d(t.returnFocus) && (!n || n.container.contains(t.returnFocus)) && l(t.returnFocus) || n && this.focusInitial(n);
  }
}, f = /* @__PURE__ */ new WeakMap();
function C(t) {
  const e = t.container.ownerDocument;
  let i = f.get(e);
  return i || (i = new v(e), f.set(e, i)), i.register(t);
}
var p = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
}, w = 0, m = class {
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
      const r = p[this._options.size] ?? p.lg, n = this._options.flexColumn ? "flex flex-col" : "", c = this._options.containerClass, s = document.createElement("div");
      this.container = s, s.className = [
        "go-admin-modal-container bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden",
        r,
        this._options.maxHeight,
        n,
        c
      ].filter(Boolean).join(" "), s.setAttribute("data-go-admin-modal", "true"), s.setAttribute("role", "dialog"), s.setAttribute("aria-modal", "true"), this._layer = C({
        container: s,
        zIndexTarget: i,
        initialFocus: this._options.initialFocus,
        returnFocus: this._invoker,
        dismissOnEscape: this._options.dismissOnEscape,
        onEscape: () => this.requestHide(),
        lockBodyScroll: this._options.lockBodyScroll
      }), s.innerHTML = this.renderContent(), this._applyAccessibleName(), i.appendChild(s), document.body.appendChild(i), this._mounted = !0, (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (a) => (a(0), 0))(() => {
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
        t ? (t.id || (t.id = `go-admin-modal-title-${++w}`), this.container.setAttribute("aria-labelledby", t.id)) : (this.container.setAttribute("aria-label", "Dialog"), console.warn("Modal opened without labelledBy, ariaLabel, or heading; using fallback accessible name."));
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
}, T = class b extends m {
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
    return new b({
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
          ${o(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${o(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${o(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${e}">
          ${o(this._opts.confirmText)}
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
}, L = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300", E = 0, A = class extends m {
  constructor(t) {
    super({
      size: "sm",
      initialFocus: "[data-prompt-input]",
      ariaLabel: t.title
    }), this.config = t;
    const e = ++E;
    this.inputId = `go-admin-text-prompt-input-${e}`, this.helpId = `go-admin-text-prompt-help-${e}`, this.errorId = `go-admin-text-prompt-error-${e}`;
  }
  renderContent() {
    const t = this.config.inputClass ?? L;
    return `
      <div class="p-5">
        <div role="heading" aria-level="2" class="text-base font-semibold text-gray-900 dark:text-white">${o(this.config.title)}</div>
        <label for="${this.inputId}" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${o(this.config.label)}</label>
        <input type="text"
               id="${this.inputId}"
               data-prompt-input
               aria-describedby="${this.config.helpText ? `${this.helpId} ` : ""}${this.errorId}"
               value="${o(this.config.initialValue ?? "")}"
               placeholder="${o(this.config.placeholder ?? "")}"
               class="${t}" />
        ${this.config.helpText ? `<p id="${this.helpId}" class="mt-1 text-xs text-gray-500 dark:text-gray-400">${o(this.config.helpText)}</p>` : ""}
        <div id="${this.errorId}" data-prompt-error role="alert" aria-live="assertive" class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${o(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${o(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const t = this.container?.querySelector("[data-prompt-input]"), e = this.container?.querySelector("[data-prompt-error]"), i = this.container?.querySelector("[data-prompt-confirm]"), r = this.container?.querySelector("[data-prompt-cancel]"), n = (s) => {
      e && (e.textContent = s, e.classList.remove("hidden"), t?.setAttribute("aria-invalid", "true"));
    };
    t?.addEventListener("input", () => {
      t.removeAttribute("aria-invalid"), e?.classList.add("hidden"), e && (e.textContent = "");
    });
    const c = async () => {
      const s = t?.value.trim() ?? "";
      if (!s) {
        n("Value is required."), t?.focus();
        return;
      }
      const a = await this.config.onConfirm(s), u = a === !1 ? "Value is invalid." : typeof a == "string" ? a : a && typeof a == "object" && typeof a.error == "string" ? a.error : "";
      if (u) {
        n(u), t?.focus();
        return;
      }
      this.hide();
    };
    i?.addEventListener("click", () => {
      c();
    }), t?.addEventListener("keydown", (s) => {
      s.key === "Enter" && (s.preventDefault(), c());
    }), r?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
};
export {
  C as i,
  m as n,
  A as r,
  T as t
};

//# sourceMappingURL=modal-Cl0Dmdof.js.map
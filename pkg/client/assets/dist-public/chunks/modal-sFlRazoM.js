import { escapeHTML as s } from "../shared/html.js";
var g = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  '[contenteditable="true"]',
  "[tabindex]"
].join(","), y = 100, _ = 10;
function k(e) {
  const t = e.ownerDocument.defaultView;
  let i = e;
  for (; i; ) {
    if (i.hasAttribute("hidden") || i.getAttribute("aria-hidden") === "true" || i.hasAttribute("inert")) return !0;
    const r = t?.getComputedStyle(i);
    if (r?.display === "none" || r?.visibility === "hidden") return !0;
    i = i.parentElement;
  }
  return !1;
}
function u(e) {
  return !(!e.isConnected || k(e) || e.matches(":disabled"));
}
function m(e) {
  return Array.from(e.querySelectorAll(g)).filter((t) => t.tabIndex >= 0 && u(t));
}
function x(e, t) {
  if (!t) return null;
  if (typeof t != "string") return t.isConnected && e.contains(t) ? t : null;
  try {
    return e.querySelector(t);
  } catch {
    return null;
  }
}
function l(e, t = !1) {
  return !u(e) || (e.focus({ preventScroll: !0 }), e.ownerDocument.activeElement !== e) ? !1 : (t && e.tagName === "INPUT" && typeof e.select == "function" && e.select(), !0);
}
var v = class {
  constructor(e) {
    this.ownerDocument = e, this.layers = [], this.nextLayerIndex = 0, this.scrollLockCount = 0, this.bodyHadScrollLock = !1, this.handleKeyDown = (t) => {
      const i = this.topmost();
      if (i) {
        if (t.key === "Escape") {
          if (i.closing || !i.dismissOnEscape) return;
          t.preventDefault(), t.stopPropagation(), i.onEscape?.();
          return;
        }
        t.key === "Tab" && this.trapFocus(i, t);
      }
    };
  }
  register(e) {
    const t = e.zIndexTarget ?? e.container, i = {
      container: e.container,
      zIndexTarget: t,
      initialFocus: e.initialFocus ?? null,
      returnFocus: e.returnFocus ?? null,
      dismissOnEscape: e.dismissOnEscape ?? !0,
      onEscape: e.onEscape,
      lockBodyScroll: e.lockBodyScroll ?? !0,
      zIndex: y + ++this.nextLayerIndex * _,
      closing: !1,
      released: !1,
      addedFallbackTabIndex: !1,
      previousZIndex: t.style.zIndex,
      previousScrollLockMarker: t.getAttribute("data-go-admin-modal-scroll-lock")
    };
    return this.layers.length === 0 && this.ownerDocument.addEventListener("keydown", this.handleKeyDown, !0), this.layers.push(i), t.style.zIndex = String(i.zIndex), i.lockBodyScroll && this.lockBody(i), {
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
  focusInitial(e, t) {
    const i = t === void 0 ? e.initialFocus : t, r = x(e.container, i);
    if (r && l(r, !0)) return;
    const o = m(e.container)[0];
    o && l(o, !0) || (e.container.hasAttribute("tabindex") || (e.container.setAttribute("tabindex", "-1"), e.addedFallbackTabIndex = !0), l(e.container));
  }
  trapFocus(e, t) {
    const i = m(e.container);
    if (i.length === 0) {
      t.preventDefault(), this.focusInitial(e, null);
      return;
    }
    const r = this.ownerDocument.activeElement, o = i.indexOf(r);
    if (o === -1) {
      t.preventDefault(), l(t.shiftKey ? i[i.length - 1] : i[0]);
      return;
    }
    t.shiftKey && o === 0 ? (t.preventDefault(), l(i[i.length - 1])) : !t.shiftKey && o === i.length - 1 && (t.preventDefault(), l(i[0]));
  }
  lockBody(e) {
    this.scrollLockCount === 0 && (this.bodyHadScrollLock = this.ownerDocument.body.classList.contains("overflow-hidden"), this.ownerDocument.body.classList.add("overflow-hidden")), this.scrollLockCount += 1, e.zIndexTarget.setAttribute("data-go-admin-modal-scroll-lock", "true");
  }
  unlockBody(e) {
    e.previousScrollLockMarker === null ? e.zIndexTarget.removeAttribute("data-go-admin-modal-scroll-lock") : e.zIndexTarget.setAttribute("data-go-admin-modal-scroll-lock", e.previousScrollLockMarker), this.scrollLockCount !== 0 && (this.scrollLockCount -= 1, this.scrollLockCount === 0 && !this.bodyHadScrollLock && this.ownerDocument.body.classList.remove("overflow-hidden"));
  }
  release(e, t) {
    if (e.released) return;
    const i = this.topmost() === e;
    e.released = !0;
    const r = this.layers.indexOf(e);
    if (r !== -1 && this.layers.splice(r, 1), e.lockBodyScroll && this.unlockBody(e), e.zIndexTarget.style.zIndex = e.previousZIndex, e.addedFallbackTabIndex && e.container.removeAttribute("tabindex"), this.layers.length === 0 && (this.ownerDocument.removeEventListener("keydown", this.handleKeyDown, !0), this.nextLayerIndex = 0), !t || !i) return;
    const o = this.topmost();
    e.returnFocus && u(e.returnFocus) && (!o || o.container.contains(e.returnFocus)) && l(e.returnFocus) || o && this.focusInitial(o);
  }
}, f = /* @__PURE__ */ new WeakMap();
function C(e) {
  const t = e.container.ownerDocument;
  let i = f.get(t);
  return i || (i = new v(t), f.set(t, i)), i.register(e);
}
var d = Object.freeze({
  root: "go-admin-modal",
  backdrop: "go-admin-modal__backdrop",
  container: "go-admin-modal__container",
  surface: "go-admin-modal__surface",
  header: "go-admin-modal__header",
  body: "go-admin-modal__body",
  footer: "go-admin-modal__footer",
  close: "go-admin-modal__close"
}), w = 0, p = class {
  constructor(e = {}) {
    this.backdrop = null, this.container = null, this._backdropClickHandler = null, this._isOpen = !1, this._invoker = null, this._layer = null, this._cleanupTimer = null, this._lifecycle = 0, this._mounted = !1, this._options = {
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
      backdropDataAttr: e.backdropDataAttr ?? ""
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
      const r = this._options.size ?? "lg", o = this._options.flexColumn ? "go-admin-modal__container--flex flex flex-col" : "", c = this._options.containerClass, n = document.createElement("div");
      this.container = n, n.className = [
        "go-admin-modal-container w-full overflow-hidden",
        d.container,
        d.surface,
        `go-admin-modal__container--${r}`,
        this._options.maxHeight,
        o,
        c
      ].filter(Boolean).join(" "), n.setAttribute("data-go-admin-modal", "true"), n.setAttribute("data-size", r), n.setAttribute("role", "dialog"), n.setAttribute("aria-modal", "true"), this._layer = C({
        container: n,
        zIndexTarget: i,
        initialFocus: this._options.initialFocus,
        returnFocus: this._invoker,
        dismissOnEscape: this._options.dismissOnEscape,
        onEscape: () => this.requestHide(),
        lockBodyScroll: this._options.lockBodyScroll
      }), n.innerHTML = this.renderContent(), this._applyAccessibleName(), i.appendChild(n), document.body.appendChild(i), this._mounted = !0, (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (a) => (a(0), 0))(() => {
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
  async onAfterShow() {
  }
  onBeforeHide() {
    return !0;
  }
  onAfterHide() {
  }
  replaceContent(e, t) {
    this.container && (this.container.innerHTML = e, this._applyAccessibleName(), this.bindContentEvents(), this._focusInitial(t));
  }
  refreshFocus(e) {
    this._focusInitial(e);
  }
  requestHide() {
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
        e ? (e.id || (e.id = `go-admin-modal-title-${++w}`), this.container.setAttribute("aria-labelledby", e.id)) : (this.container.setAttribute("aria-label", "Dialog"), console.warn("Modal opened without labelledBy, ariaLabel, or heading; using fallback accessible name."));
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
}, E = class b extends p {
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
    return new b({
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
          ${s(this._opts.title)}
        </h3>
      </div>
      <div class="go-admin-modal__body px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${s(this._opts.message)}
        </p>
      </div>
      <div class="go-admin-modal__footer flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="go-admin-modal__close px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${s(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${t}">
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
  _finish(t) {
    this._isDone || (this._isDone = !0, this._resolve(t), this.hide());
  }
}, L = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 px-3 py-2 text-sm border-gray-300", A = 0, I = class extends p {
  constructor(e) {
    super({
      size: "sm",
      initialFocus: "[data-prompt-input]",
      ariaLabel: e.title
    }), this.config = e;
    const t = ++A;
    this.inputId = `go-admin-text-prompt-input-${t}`, this.helpId = `go-admin-text-prompt-help-${t}`, this.errorId = `go-admin-text-prompt-error-${t}`;
  }
  renderContent() {
    const e = this.config.inputClass ?? L;
    return `
      <div class="go-admin-modal__body p-5">
        <div role="heading" aria-level="2" class="text-base font-semibold text-gray-900 dark:text-white">${s(this.config.title)}</div>
        <label for="${this.inputId}" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${s(this.config.label)}</label>
        <input type="text"
               id="${this.inputId}"
               data-prompt-input
               aria-describedby="${this.config.helpText ? `${this.helpId} ` : ""}${this.errorId}"
               value="${s(this.config.initialValue ?? "")}"
               placeholder="${s(this.config.placeholder ?? "")}"
               class="${e}" />
        ${this.config.helpText ? `<p id="${this.helpId}" class="mt-1 text-xs text-gray-500 dark:text-gray-400">${s(this.config.helpText)}</p>` : ""}
        <div id="${this.errorId}" data-prompt-error role="alert" aria-live="assertive" class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="go-admin-modal__close px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
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
    const e = this.container?.querySelector("[data-prompt-input]"), t = this.container?.querySelector("[data-prompt-error]"), i = this.container?.querySelector("[data-prompt-confirm]"), r = this.container?.querySelector("[data-prompt-cancel]"), o = (n) => {
      t && (t.textContent = n, t.classList.remove("hidden"), e?.setAttribute("aria-invalid", "true"));
    };
    e?.addEventListener("input", () => {
      e.removeAttribute("aria-invalid"), t?.classList.add("hidden"), t && (t.textContent = "");
    });
    const c = async () => {
      const n = e?.value.trim() ?? "";
      if (!n) {
        o("Value is required."), e?.focus();
        return;
      }
      const a = await this.config.onConfirm(n), h = a === !1 ? "Value is invalid." : typeof a == "string" ? a : a && typeof a == "object" && typeof a.error == "string" ? a.error : "";
      if (h) {
        o(h), e?.focus();
        return;
      }
      this.hide();
    };
    i?.addEventListener("click", () => {
      c();
    }), e?.addEventListener("keydown", (n) => {
      n.key === "Enter" && (n.preventDefault(), c());
    }), r?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
};
export {
  C as a,
  I as i,
  d as n,
  p as r,
  E as t
};

//# sourceMappingURL=modal-sFlRazoM.js.map
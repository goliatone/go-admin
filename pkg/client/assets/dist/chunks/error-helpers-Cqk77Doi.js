const f = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
}, y = 100, b = 10;
class x {
  constructor() {
    this.stack = [];
  }
  push(t) {
    return this.stack.push(t), y + this.stack.length * b;
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
const l = new x();
class k {
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
    const t = l.push(this);
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 flex items-center justify-center bg-black/50 transition-opacity opacity-0", this.backdrop.style.zIndex = String(t), this.backdrop.style.transitionDuration = `${this._options.animationDuration}ms`, this._options.backdropDataAttr && this.backdrop.setAttribute(this._options.backdropDataAttr, "true");
    const n = f[this._options.size] ?? f.lg, s = this._options.flexColumn ? "flex flex-col" : "", d = this._options.containerClass;
    this.container = document.createElement("div"), this.container.className = [
      "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden",
      n,
      this._options.maxHeight,
      s,
      d
    ].filter(Boolean).join(" "), this.container.innerHTML = this.renderContent(), this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), this._options.lockBodyScroll && document.body.classList.add("overflow-hidden"), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    }), this._bindBaseEvents(), this.bindContentEvents(), this._isOpen = !0, await this.onAfterShow(), this._manageFocus();
  }
  /** Hide the modal with fade-out animation. */
  hide() {
    !this._isOpen || !this.backdrop || (this._isOpen = !1, l.remove(this), this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this._cleanup();
    }, this._options.animationDuration));
  }
  /** Remove immediately without animation. */
  destroy() {
    this._isOpen = !1, l.remove(this), this._cleanup();
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
      t.key === "Escape" && l.isTopmost(this) && (t.stopPropagation(), this.requestHide());
    }, document.addEventListener("keydown", this._escHandler, !0));
  }
  _manageFocus() {
    if (!this.container || !this._options.initialFocus) return;
    const t = this.container.querySelector(this._options.initialFocus);
    t && typeof t.focus == "function" && (t.focus(), t instanceof HTMLInputElement && t.select());
  }
  _cleanup() {
    this._escHandler && (document.removeEventListener("keydown", this._escHandler, !0), this._escHandler = null), this.backdrop?.remove(), this.backdrop = null, this.container = null, this._options.lockBodyScroll && l.count === 0 && document.body.classList.remove("overflow-hidden");
  }
}
class g extends k {
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
    return new g({ ...n, message: t }).prompt();
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
          ${m(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${m(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${m(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${t}">
          ${m(this._opts.confirmText)}
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
function m(i) {
  return i.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function _(i) {
  const t = i.headers.get("content-type") || "", n = t.includes("application/json") || t.includes("application/problem+json"), s = await i.clone().text().catch(() => "");
  if (s) {
    if (n || s.trim().startsWith("{"))
      try {
        const e = JSON.parse(s);
        if (typeof e.error == "string" && e.error.trim()) return e.error.trim();
        if (e.error && typeof e.error == "object") {
          const o = e.error, a = typeof o.message == "string" ? o.message.trim() : "", h = [];
          if (Array.isArray(o.validation_errors))
            for (const r of o.validation_errors) {
              if (!r || typeof r != "object") continue;
              const u = r.field, c = r.message;
              typeof u == "string" && typeof c == "string" && h.push(`${u}: ${c}`);
            }
          const p = o.metadata;
          if (p && typeof p == "object") {
            const r = p.fields;
            if (r && typeof r == "object" && !Array.isArray(r))
              for (const [u, c] of Object.entries(r))
                typeof c == "string" && h.push(`${u}: ${c}`);
          }
          if (h.length > 0)
            return `${a && a.toLowerCase() !== "validation failed" ? `${a}: ` : "Validation failed: "}${h.join("; ")}`;
          if (a) return a;
        }
        if (typeof e.detail == "string" && e.detail.trim()) return e.detail.trim();
        if (typeof e.title == "string" && e.title.trim()) return e.title.trim();
        if (typeof e.message == "string" && e.message.trim()) return e.message.trim();
      } catch {
      }
    if (s.includes("go-users:")) {
      const e = s.match(/go-users:\s*([^|]+)/);
      if (e) return e[1].trim();
    }
    const d = s.match(/\|\s*([^|]+)$/);
    if (d) return d[1].trim();
    if (s.trim().length > 0 && s.length < 200) return s.trim();
  }
  return `Request failed (${i.status})`;
}
function v(i) {
  return i instanceof Error ? i.message : typeof i == "string" ? i : "An unexpected error occurred";
}
export {
  g as C,
  k as M,
  _ as e,
  v as g
};
//# sourceMappingURL=error-helpers-Cqk77Doi.js.map

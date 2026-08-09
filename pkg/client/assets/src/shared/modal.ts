/**
 * Shared Modal Base Class
 *
 * Provides dialog semantics, focus management, backdrop and escape dismissal,
 * z-index stacking for nested modals, body scroll lock, and cleanup.
 *
 * Subclasses implement renderContent() and bindContentEvents() to provide
 * their specific content and behavior.
 *
 * Usage:
 *   class MyModal extends Modal {
 *     constructor() { super({ size: 'lg' }); }
 *     protected renderContent(): string { return '<div>...</div>'; }
 *     protected bindContentEvents(): void { ... }
 *   }
 *   new MyModal().show();
 */

import { escapeHTML, escapeHTML as escapeHtml } from './html.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export { escapeHtml };

export interface ModalOptions {
  /** Maximum width. Default: 'lg' */
  size?: ModalSize;
  /** Maximum height class. Default: 'max-h-[90vh]' */
  maxHeight?: string;
  /** Use flex flex-col on container. Default: true */
  flexColumn?: boolean;
  /** Animation duration in ms. Default: 150 */
  animationDuration?: number;
  /** Backdrop click dismisses modal. Default: true */
  dismissOnBackdropClick?: boolean;
  /** Escape key dismisses modal. Default: true */
  dismissOnEscape?: boolean;
  /** Lock body scroll when open. Default: true */
  lockBodyScroll?: boolean;
  /** CSS selector or element to focus on open */
  initialFocus?: string | HTMLElement | null;
  /** ID of the element that names the dialog */
  labelledBy?: string | null;
  /** Explicit accessible name when labelledBy is not used */
  ariaLabel?: string | null;
  /** ID of the element that describes the dialog */
  describedBy?: string | null;
  /** Extra CSS classes for the container div */
  containerClass?: string;
  /** Data attribute name to set on backdrop (e.g. 'data-my-modal-backdrop') */
  backdropDataAttr?: string;
}

type ResolvedModalOptions = {
  size: ModalSize;
  maxHeight: string;
  flexColumn: boolean;
  animationDuration: number;
  dismissOnBackdropClick: boolean;
  dismissOnEscape: boolean;
  lockBodyScroll: boolean;
  initialFocus: string | HTMLElement | null;
  labelledBy: string | null;
  ariaLabel: string | null;
  describedBy: string | null;
  containerClass: string;
  backdropDataAttr: string;
};

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

// ---------------------------------------------------------------------------
// Z-Index Stack Manager (module singleton)
// ---------------------------------------------------------------------------

const MODAL_BASE_Z = 100;
const MODAL_Z_STEP = 10;
let modalHeadingSequence = 0;

class ModalStack {
  private stack: Modal[] = [];
  private scrollLockCount = 0;
  private bodyHadScrollLock = false;

  push(modal: Modal): number {
    this.remove(modal);
    this.stack.push(modal);
    return MODAL_BASE_Z + this.stack.length * MODAL_Z_STEP;
  }

  remove(modal: Modal): void {
    const idx = this.stack.indexOf(modal);
    if (idx !== -1) this.stack.splice(idx, 1);
  }

  isTopmost(modal: Modal): boolean {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === modal;
  }

  get count(): number {
    return this.stack.length;
  }

  lockBody(): void {
    if (this.scrollLockCount === 0) {
      this.bodyHadScrollLock = document.body.classList.contains('overflow-hidden');
      document.body.classList.add('overflow-hidden');
    }
    this.scrollLockCount += 1;
  }

  unlockBody(): void {
    if (this.scrollLockCount === 0) return;
    this.scrollLockCount -= 1;
    if (this.scrollLockCount === 0 && !this.bodyHadScrollLock) {
      document.body.classList.remove('overflow-hidden');
    }
  }
}

const modalStack = new ModalStack();

// ---------------------------------------------------------------------------
// Modal Base Class
// ---------------------------------------------------------------------------

export abstract class Modal {
  protected backdrop: HTMLElement | null = null;
  protected container: HTMLElement | null = null;

  private _options: ResolvedModalOptions;
  private _documentKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _backdropClickHandler: ((e: MouseEvent) => void) | null = null;
  private _isOpen = false;
  private _invoker: HTMLElement | null = null;
  private _bodyLocked = false;
  private _cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private _lifecycle = 0;
  private _fallbackTabIndex = false;

  constructor(opts: ModalOptions = {}) {
    this._options = {
      size: opts.size ?? 'lg',
      maxHeight: opts.maxHeight ?? 'max-h-[90vh]',
      flexColumn: opts.flexColumn ?? true,
      animationDuration: opts.animationDuration ?? 150,
      dismissOnBackdropClick: opts.dismissOnBackdropClick ?? true,
      dismissOnEscape: opts.dismissOnEscape ?? true,
      lockBodyScroll: opts.lockBodyScroll ?? true,
      initialFocus: opts.initialFocus ?? null,
      labelledBy: opts.labelledBy ?? null,
      ariaLabel: opts.ariaLabel ?? null,
      describedBy: opts.describedBy ?? null,
      containerClass: opts.containerClass ?? '',
      backdropDataAttr: opts.backdropDataAttr ?? '',
    };
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  protected get options(): Readonly<ResolvedModalOptions> {
    return this._options;
  }

  // ---- Abstract: subclasses must implement --------------------------------

  /** Return inner HTML for the container. Called once during show(). */
  protected abstract renderContent(): string;

  /** Bind event listeners to content elements. Called after renderContent(). */
  protected abstract bindContentEvents(): void;

  // ---- Lifecycle ----------------------------------------------------------

  /** Show the modal. Async to support subclass data loading in onAfterShow(). */
  async show(): Promise<void> {
    if (this._isOpen) return;

    const nextInvoker = this.backdrop && this._invoker?.isConnected
      ? this._invoker
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this._cancelCleanupTimer();
    this._cleanup(false);
    const lifecycle = ++this._lifecycle;
    this._invoker = nextInvoker;

    const zIndex = modalStack.push(this);

    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-4 transition-opacity opacity-0';
    this.backdrop.style.zIndex = String(zIndex);
    this.backdrop.style.transitionDuration = `${this._animationDuration()}ms`;
    this.backdrop.setAttribute('data-go-admin-modal-backdrop', 'true');

    if (this._options.backdropDataAttr) {
      this.backdrop.setAttribute(this._options.backdropDataAttr, 'true');
    }

    // Container
    const sizeClass = SIZE_MAP[this._options.size] ?? SIZE_MAP.lg;
    const flexClass = this._options.flexColumn ? 'flex flex-col' : '';
    const extra = this._options.containerClass;

    this.container = document.createElement('div');
    this.container.className = [
      'bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden',
      sizeClass,
      this._options.maxHeight,
      flexClass,
      extra,
    ]
      .filter(Boolean)
      .join(' ');
    this.container.setAttribute('data-go-admin-modal', 'true');
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');

    // Render subclass content
    this.container.innerHTML = this.renderContent();
    this._applyAccessibleName();

    // Assemble DOM
    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    // Lock body scroll
    if (this._options.lockBodyScroll) {
      modalStack.lockBody();
      this._bodyLocked = true;
      this.backdrop.setAttribute('data-go-admin-modal-scroll-lock', 'true');
    }

    // Animate in
    const scheduleFrame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: FrameRequestCallback): number => {
          callback(0);
          return 0;
        };
    scheduleFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });

    // Bind base events (backdrop click, escape)
    this._bindBaseEvents();

    // Bind subclass content events
    this.bindContentEvents();

    this._isOpen = true;

    // Hook for subclass async loading
    try {
      await this.onAfterShow();
    } catch (error) {
      this.destroy();
      throw error;
    }

    // Focus management
    if (this._isOpen && lifecycle === this._lifecycle) {
      this._focusInitial();
    }
  }

  /** Hide the modal with fade-out animation. */
  hide(): void {
    this.requestClose();
  }

  /** Request the normal vetoable close lifecycle. */
  requestClose(): boolean {
    if (!this._isOpen || !this.backdrop || !this.onBeforeHide()) return false;
    this._beginClose();
    return true;
  }

  /** Remove immediately without animation. */
  destroy(): void {
    ++this._lifecycle;
    this._isOpen = false;
    modalStack.remove(this);
    this._cancelCleanupTimer();
    this._cleanup(true);
  }

  // ---- Hooks for subclasses -----------------------------------------------

  /** Called after DOM is mounted and events are bound. Override for data loading. */
  protected async onAfterShow(): Promise<void> {
    // no-op by default
  }

  /** Called before hide. Return false to prevent closing. */
  protected onBeforeHide(): boolean {
    return true;
  }

  /** Called after the modal DOM and shared state have been released. */
  protected onAfterHide(): void {
    // no-op by default
  }

  /** Replace product content without replacing the dialog container or stack. */
  protected replaceContent(content: string, initialFocus?: string | HTMLElement | null): void {
    if (!this.container) return;
    this.container.innerHTML = content;
    this._applyAccessibleName();
    this.bindContentEvents();
    this._focusInitial(initialFocus);
  }

  /** Re-evaluate focus after product content changes in place. */
  protected refreshFocus(initialFocus?: string | HTMLElement | null): void {
    this._focusInitial(initialFocus);
  }

  // ---- Internal -----------------------------------------------------------

  /** Try to hide; calls onBeforeHide() first. */
  protected requestHide(): void {
    this.requestClose();
  }

  private _bindBaseEvents(): void {
    if (this._options.dismissOnBackdropClick && this.backdrop) {
      this._backdropClickHandler = (event: MouseEvent) => {
        if (event.target === this.backdrop && modalStack.isTopmost(this)) {
          this.requestHide();
        }
      };
      this.backdrop.addEventListener('click', this._backdropClickHandler);
    }

    this._documentKeyHandler = (event: KeyboardEvent) => {
      if (!this._isOpen || !modalStack.isTopmost(this)) return;
      if (event.key === 'Escape' && this._options.dismissOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        this.requestHide();
        return;
      }
      if (event.key === 'Tab') this._trapFocus(event);
    };
    document.addEventListener('keydown', this._documentKeyHandler, true);
  }

  private _applyAccessibleName(): void {
    if (!this.container) return;
    this.container.removeAttribute('aria-label');
    this.container.removeAttribute('aria-labelledby');
    this.container.removeAttribute('aria-describedby');

    if (this._options.labelledBy) {
      this.container.setAttribute('aria-labelledby', this._options.labelledBy);
    } else if (this._options.ariaLabel) {
      this.container.setAttribute('aria-label', this._options.ariaLabel);
    } else {
      const heading = this.container.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]');
      if (heading) {
        heading.id ||= `go-admin-modal-title-${++modalHeadingSequence}`;
        this.container.setAttribute('aria-labelledby', heading.id);
      } else {
        this.container.setAttribute('aria-label', 'Dialog');
        console.warn('Modal opened without labelledBy, ariaLabel, or heading; using fallback accessible name.');
      }
    }
    if (this._options.describedBy) {
      this.container.setAttribute('aria-describedby', this._options.describedBy);
    }
  }

  private _focusInitial(override?: string | HTMLElement | null): void {
    if (!this.container || !this._isOpen || !modalStack.isTopmost(this)) return;
    const requested = override === undefined ? this._options.initialFocus : override;
    const requestedTarget = this._resolveFocusTarget(requested);
    const target = (requestedTarget && this._canReceiveFocus(requestedTarget) ? requestedTarget : null)
      ?? this._focusableElements()[0]
      ?? this.container;
    if (target === this.container && !this.container.hasAttribute('tabindex')) {
      this.container.setAttribute('tabindex', '-1');
      this._fallbackTabIndex = true;
    }
    target.focus({ preventScroll: true });
    if (target.tagName === 'INPUT' && typeof (target as HTMLInputElement).select === 'function') {
      (target as HTMLInputElement).select();
    }
  }

  private _resolveFocusTarget(target: string | HTMLElement | null): HTMLElement | null {
    if (!target || !this.container) return null;
    if (typeof target !== 'string') {
      return target.isConnected && this.container.contains(target) ? target : null;
    }
    try {
      return this.container.querySelector<HTMLElement>(target);
    } catch {
      return null;
    }
  }

  private _focusableElements(): HTMLElement[] {
    if (!this.container) return [];
    const selector = [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'iframe',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.from(this.container.querySelectorAll<HTMLElement>(selector))
      .filter((element) => this._canReceiveFocus(element));
  }

  private _canReceiveFocus(element: HTMLElement): boolean {
    if (!element.isConnected || element.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    if (element.matches(':disabled')) return false;
    const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  }

  private _trapFocus(event: KeyboardEvent): void {
    if (!this.container) return;
    const focusable = this._focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      this._focusInitial(null);
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!this.container.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private _beginClose(): void {
    ++this._lifecycle;
    this._isOpen = false;
    this.backdrop?.classList.add('opacity-0');
    this._cancelCleanupTimer();
    const delay = this._animationDuration();
    if (delay === 0) {
      this._cleanup(true);
      return;
    }
    this._cleanupTimer = setTimeout(() => this._cleanup(true), delay);
  }

  private _cleanup(restoreFocus: boolean): void {
    const hadDOM = Boolean(this.backdrop || this.container);
    modalStack.remove(this);
    if (this._documentKeyHandler) {
      document.removeEventListener('keydown', this._documentKeyHandler, true);
      this._documentKeyHandler = null;
    }
    if (this.backdrop && this._backdropClickHandler) {
      this.backdrop.removeEventListener('click', this._backdropClickHandler);
    }
    this._backdropClickHandler = null;

    this.backdrop?.remove();
    this.backdrop = null;
    if (this.container && this._fallbackTabIndex) this.container.removeAttribute('tabindex');
    this.container = null;
    this._fallbackTabIndex = false;

    if (this._bodyLocked) {
      modalStack.unlockBody();
      this._bodyLocked = false;
    }
    if (restoreFocus && this._invoker && this._canReceiveFocus(this._invoker)) {
      this._invoker.focus({ preventScroll: true });
    }
    this._invoker = null;
    if (hadDOM) this.onAfterHide();
  }

  private _animationDuration(): number {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    }
    return Math.max(0, this._options.animationDuration);
  }

  private _cancelCleanupTimer(): void {
    if (this._cleanupTimer !== null) {
      clearTimeout(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// ConfirmModal (Promise-based)
// ---------------------------------------------------------------------------

export interface ConfirmModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export class ConfirmModal extends Modal {
  private _resolve!: (value: boolean) => void;
  private _opts: Required<ConfirmModalOptions>;
  private _isDone = false;

  constructor(options: ConfirmModalOptions) {
    super({
      size: 'md',
      maxHeight: '',
      flexColumn: false,
      dismissOnBackdropClick: true,
      dismissOnEscape: true,
      lockBodyScroll: false,
      ariaLabel: options.title ?? 'Confirm',
    });
    this._opts = {
      title: options.title ?? 'Confirm',
      message: options.message,
      confirmText: options.confirmText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      confirmVariant: options.confirmVariant ?? 'primary',
    };
  }

  /** Show and return a promise that resolves when user decides. */
  static confirm(
    message: string,
    options: Omit<ConfirmModalOptions, 'message'> = {},
  ): Promise<boolean> {
    const modal = new ConfirmModal({ ...options, message });
    return modal.prompt();
  }

  prompt(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._resolve = resolve;
      this.show();
    });
  }

  protected renderContent(): string {
    const btnClass =
      this._opts.confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white';

    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${escapeHtml(this._opts.title)}
        </h3>
      </div>
      <div class="px-6 py-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${escapeHtml(this._opts.message)}
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" data-modal-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
          ${escapeHtml(this._opts.cancelText)}
        </button>
        <button type="button" data-modal-confirm
          class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${btnClass}">
          ${escapeHtml(this._opts.confirmText)}
        </button>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-modal-cancel]')?.addEventListener('click', () => {
      this._finish(false);
    });
    this.container?.querySelector('[data-modal-confirm]')?.addEventListener('click', () => {
      this._finish(true);
    });
  }

  protected onBeforeHide(): boolean {
    if (!this._isDone) {
      this._isDone = true;
      this._resolve(false);
    }
    return true;
  }

  private _finish(confirmed: boolean): void {
    if (this._isDone) return;
    this._isDone = true;
    this._resolve(confirmed);
    this.hide();
  }
}

// ---------------------------------------------------------------------------
// TextPromptModal (single text input)
// ---------------------------------------------------------------------------

export interface TextPromptModalConfig {
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  helpText?: string;
  /** CSS class string for the text input. Falls back to a sensible default. */
  inputClass?: string;
  onConfirm: (value: string) => void | boolean | string | { error?: string } | Promise<void | boolean | string | { error?: string }>;
  onCancel?: () => void;
}

const DEFAULT_INPUT_CLASS =
  'w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 ' +
  'px-3 py-2 text-sm border-gray-300';

export class TextPromptModal extends Modal {
  private config: TextPromptModalConfig;

  constructor(config: TextPromptModalConfig) {
    super({ size: 'sm', initialFocus: '[data-prompt-input]', ariaLabel: config.title });
    this.config = config;
  }

  protected renderContent(): string {
    const cls = this.config.inputClass ?? DEFAULT_INPUT_CLASS;
    return `
      <div class="p-5">
        <div role="heading" aria-level="2" class="text-base font-semibold text-gray-900 dark:text-white">${escapeHtml(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${escapeHtml(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${escapeHtml(this.config.initialValue ?? '')}"
               placeholder="${escapeHtml(this.config.placeholder ?? '')}"
               class="${cls}" />
        ${this.config.helpText ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">${escapeHtml(this.config.helpText)}</p>` : ''}
        <div data-prompt-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            ${escapeHtml(this.config.cancelLabel ?? 'Cancel')}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            ${escapeHtml(this.config.confirmLabel ?? 'Save')}
          </button>
        </div>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    const input = this.container?.querySelector<HTMLInputElement>('[data-prompt-input]');
    const errorEl = this.container?.querySelector<HTMLElement>('[data-prompt-error]');
    const confirmBtn = this.container?.querySelector<HTMLButtonElement>('[data-prompt-confirm]');
    const cancelBtn = this.container?.querySelector<HTMLButtonElement>('[data-prompt-cancel]');

    const showError = (message: string): void => {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    };

    const handleConfirm = async (): Promise<void> => {
      const value = input?.value.trim() ?? '';
      if (!value) {
        showError('Value is required.');
        input?.focus();
        return;
      }
      const result = await this.config.onConfirm(value);
      const error =
        result === false
          ? 'Value is invalid.'
          : typeof result === 'string'
            ? result
            : result && typeof result === 'object' && typeof result.error === 'string'
              ? result.error
              : '';
      if (error) {
        showError(error);
        input?.focus();
        return;
      }
      this.hide();
    };

    confirmBtn?.addEventListener('click', () => {
      void handleConfirm();
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleConfirm();
      }
    });
    cancelBtn?.addEventListener('click', () => {
      this.config.onCancel?.();
      this.hide();
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Shared Modal Base Class
 *
 * Provides backdrop management, opacity animations, escape-key handling,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

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
  /** CSS selector for element to focus on open */
  initialFocus?: string | null;
  /** Extra CSS classes for the container div */
  containerClass?: string;
  /** Data attribute name to set on backdrop (e.g. 'data-my-modal-backdrop') */
  backdropDataAttr?: string;
}

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

class ModalStack {
  private stack: Modal[] = [];

  push(modal: Modal): number {
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
}

const modalStack = new ModalStack();

// ---------------------------------------------------------------------------
// Modal Base Class
// ---------------------------------------------------------------------------

export abstract class Modal {
  protected backdrop: HTMLElement | null = null;
  protected container: HTMLElement | null = null;

  private _options: Required<ModalOptions>;
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;
  private _isOpen = false;

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
      containerClass: opts.containerClass ?? '',
      backdropDataAttr: opts.backdropDataAttr ?? '',
    };
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  protected get options(): Required<ModalOptions> {
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

    const zIndex = modalStack.push(this);

    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 flex items-center justify-center bg-black/50 transition-opacity opacity-0';
    this.backdrop.style.zIndex = String(zIndex);
    this.backdrop.style.transitionDuration = `${this._options.animationDuration}ms`;

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

    // Render subclass content
    this.container.innerHTML = this.renderContent();

    // Assemble DOM
    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    // Lock body scroll
    if (this._options.lockBodyScroll) {
      document.body.classList.add('overflow-hidden');
    }

    // Animate in
    requestAnimationFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });

    // Bind base events (backdrop click, escape)
    this._bindBaseEvents();

    // Bind subclass content events
    this.bindContentEvents();

    this._isOpen = true;

    // Hook for subclass async loading
    await this.onAfterShow();

    // Focus management
    this._manageFocus();
  }

  /** Hide the modal with fade-out animation. */
  hide(): void {
    if (!this._isOpen || !this.backdrop) return;
    this._isOpen = false;

    modalStack.remove(this);

    this.backdrop.classList.add('opacity-0');
    setTimeout(() => {
      this._cleanup();
    }, this._options.animationDuration);
  }

  /** Remove immediately without animation. */
  destroy(): void {
    this._isOpen = false;
    modalStack.remove(this);
    this._cleanup();
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

  // ---- Internal -----------------------------------------------------------

  /** Try to hide; calls onBeforeHide() first. */
  protected requestHide(): void {
    if (this.onBeforeHide()) {
      this.hide();
    }
  }

  private _bindBaseEvents(): void {
    if (this._options.dismissOnBackdropClick && this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.requestHide();
        }
      });
    }

    if (this._options.dismissOnEscape) {
      this._escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && modalStack.isTopmost(this)) {
          e.stopPropagation();
          this.requestHide();
        }
      };
      document.addEventListener('keydown', this._escHandler, true);
    }
  }

  private _manageFocus(): void {
    if (!this.container || !this._options.initialFocus) return;

    const target = this.container.querySelector<HTMLElement>(this._options.initialFocus);
    if (target && typeof target.focus === 'function') {
      target.focus();
      if (target instanceof HTMLInputElement) {
        target.select();
      }
    }
  }

  private _cleanup(): void {
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler, true);
      this._escHandler = null;
    }

    this.backdrop?.remove();
    this.backdrop = null;
    this.container = null;

    if (this._options.lockBodyScroll && modalStack.count === 0) {
      document.body.classList.remove('overflow-hidden');
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
  /** CSS class string for the text input. Falls back to a sensible default. */
  inputClass?: string;
  onConfirm: (value: string) => void;
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
    super({ size: 'sm', initialFocus: '[data-prompt-input]' });
    this.config = config;
  }

  protected renderContent(): string {
    const cls = this.config.inputClass ?? DEFAULT_INPUT_CLASS;
    return `
      <div class="p-5">
        <div class="text-base font-semibold text-gray-900 dark:text-white">${escapeHtml(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${escapeHtml(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${escapeHtml(this.config.initialValue ?? '')}"
               placeholder="${escapeHtml(this.config.placeholder ?? '')}"
               class="${cls}" />
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

    const handleConfirm = (): void => {
      const value = input?.value.trim() ?? '';
      if (!value) {
        showError('Value is required.');
        input?.focus();
        return;
      }
      this.config.onConfirm(value);
      this.hide();
    };

    confirmBtn?.addEventListener('click', handleConfirm);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
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

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

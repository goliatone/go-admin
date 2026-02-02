import type { ToastNotifier, ToastOptions, ConfirmOptions } from './types.js';
import { ConfirmModal } from '../shared/modal.js';

type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

interface ToastManagerOptions {
  position?: ToastPosition;
}

/**
 * Toast notification manager
 * Manages toast notifications with auto-dismiss and stacking
 */
export class ToastManager implements ToastNotifier {
  private container: HTMLElement;
  private toasts: Map<string, HTMLElement> = new Map();
  private position: ToastPosition;

  constructor(options: ToastManagerOptions = {}) {
    this.position = options.position || 'top-right';
    this.container = this.getOrCreateContainer();
    this.applyContainerClasses(this.container);
  }

  private getOrCreateContainer(): HTMLElement {
    const existing = document.getElementById('toast-container');
    if (existing) return existing;

    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  private applyContainerClasses(container: HTMLElement): void {
    const positionClasses: Array<`toast-${ToastPosition}`> = [
      'toast-top-right',
      'toast-top-center',
      'toast-bottom-right',
      'toast-bottom-center',
    ];

    container.classList.add('toast-container');
    positionClasses.forEach((cls) => container.classList.remove(cls));
    container.classList.add(`toast-${this.position}`);
  }

  show(options: ToastOptions): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const toast = this.createToastElement(id, options);

    this.container.appendChild(toast);
    this.toasts.set(id, toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-enter-active');
    });

    // Auto-dismiss after duration (default 5 seconds)
    const duration = options.duration !== undefined ? options.duration : 5000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration, dismissible: true });
  }

  error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration: duration || 0, dismissible: true });
  }

  warning(message: string, duration?: number): void {
    this.show({ message, type: 'warning', duration, dismissible: true });
  }

  info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration, dismissible: true });
  }

  async confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return ConfirmModal.confirm(message, {
      title: options.title,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
    });
  }

  private createToastElement(id: string, options: ToastOptions): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type}`;
    toast.setAttribute('data-toast-id', id);

    const icon = this.getIconForType(options.type);

    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-header-left">
          <div class="toast-icon toast-icon-${options.type}">
            ${icon}
          </div>
          <svg class="toast-pin-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
          <div class="toast-title">${this.escapeHtml(options.title || this.getDefaultTitle(options.type))}</div>
        </div>
        ${options.dismissible !== false ? `
          <button class="toast-dismiss" aria-label="Dismiss">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="toast-content">
        <div class="toast-message">${this.escapeHtml(options.message)}</div>
      </div>
    `;

    // Bind dismiss button
    if (options.dismissible !== false) {
      const dismissBtn = toast.querySelector('.toast-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => this.dismiss(id));
      }
    }

    return toast;
  }

  private dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    toast.classList.remove('toast-enter-active');
    toast.classList.add('toast-leave-active');

    setTimeout(() => {
      toast.remove();
      this.toasts.delete(id);
    }, 300); // Match CSS transition duration
  }

  private getDefaultTitle(type: string): string {
    const titles: Record<string, string> = {
      success: 'Success notification',
      error: 'Error notification',
      warning: 'Warning notification',
      info: 'Informational notification'
    };
    return titles[type] || 'Notification';
  }

  private getIconForType(type: string): string {
    const icons: Record<string, string> = {
      success: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`,
      error: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`,
      warning: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      info: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`
    };
    return icons[type] || icons.info;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Fallback notifier that uses native alert/confirm
 * Used when no ToastManager is configured (backwards compatibility)
 */
export class FallbackNotifier implements ToastNotifier {
  show(options: ToastOptions): void {
    const prefix = options.title ? `${options.title}: ` : '';
    alert(prefix + options.message);
  }

  success(message: string): void {
    alert(message);
  }

  error(message: string): void {
    alert('Error: ' + message);
  }

  warning(message: string): void {
    alert('Warning: ' + message);
  }

  info(message: string): void {
    alert(message);
  }

  async confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
    const prefix = options?.title ? `${options.title}\n\n` : '';
    return Promise.resolve(confirm(prefix + message));
  }
}

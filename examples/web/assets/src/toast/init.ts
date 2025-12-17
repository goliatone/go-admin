import { ToastManager } from './toast-manager.js';
import { extractErrorMessage, getErrorMessage } from './error-helpers.js';

type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

/**
 * Initialize global toast manager
 * Exposed as window.toastManager and window.notify for easy template access
 */
export function initGlobalToastManager(position?: ToastPosition): ToastManager {
  const manager = new ToastManager({ position: position || 'top-right' });

  // Expose globally for template access
  (window as any).toastManager = manager;

  // Also expose convenient helper functions
  (window as any).notify = {
    success: (msg: string, duration?: number) => manager.success(msg, duration),
    error: (msg: string, duration?: number) => manager.error(msg, duration),
    warning: (msg: string, duration?: number) => manager.warning(msg, duration),
    info: (msg: string, duration?: number) => manager.info(msg, duration),
    confirm: (msg: string, options?: any) => manager.confirm(msg, options)
  };

  // Expose error helpers globally
  (window as any).extractErrorMessage = extractErrorMessage;
  (window as any).getErrorMessage = getErrorMessage;

  return manager;
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initGlobalToastManager());
} else {
  initGlobalToastManager();
}

// Also export for module usage
export { ToastManager } from './toast-manager.js';
export { extractErrorMessage, getErrorMessage } from './error-helpers.js';
export type { ToastNotifier, ToastOptions, ConfirmOptions } from './types.js';

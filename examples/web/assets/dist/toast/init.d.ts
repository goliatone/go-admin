import { ToastManager } from './toast-manager.js';
type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
/**
 * Initialize global toast manager
 * Exposed as window.toastManager and window.notify for easy template access
 */
export declare function initGlobalToastManager(position?: ToastPosition): ToastManager;
export { ToastManager } from './toast-manager.js';
export { extractErrorMessage, getErrorMessage } from './error-helpers.js';
export type { ToastNotifier, ToastOptions, ConfirmOptions } from './types.js';
//# sourceMappingURL=init.d.ts.map
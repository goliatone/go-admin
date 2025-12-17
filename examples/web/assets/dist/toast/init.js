import { ToastManager } from './toast-manager.js';
import { extractErrorMessage, getErrorMessage } from './error-helpers.js';
/**
 * Initialize global toast manager
 * Exposed as window.toastManager and window.notify for easy template access
 */
export function initGlobalToastManager(position) {
    const manager = new ToastManager({ position: position || 'top-right' });
    // Expose globally for template access
    window.toastManager = manager;
    // Also expose convenient helper functions
    window.notify = {
        success: (msg, duration) => manager.success(msg, duration),
        error: (msg, duration) => manager.error(msg, duration),
        warning: (msg, duration) => manager.warning(msg, duration),
        info: (msg, duration) => manager.info(msg, duration),
        confirm: (msg, options) => manager.confirm(msg, options)
    };
    // Expose error helpers globally
    window.extractErrorMessage = extractErrorMessage;
    window.getErrorMessage = getErrorMessage;
    return manager;
}
// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGlobalToastManager());
}
else {
    initGlobalToastManager();
}
// Also export for module usage
export { ToastManager } from './toast-manager.js';
export { extractErrorMessage, getErrorMessage } from './error-helpers.js';
//# sourceMappingURL=init.js.map
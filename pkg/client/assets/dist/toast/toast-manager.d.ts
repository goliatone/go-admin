import type { ToastNotifier, ToastOptions, ConfirmOptions } from './types.js';
type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
interface ToastManagerOptions {
    position?: ToastPosition;
}
/**
 * Toast notification manager
 * Manages toast notifications with auto-dismiss and stacking
 */
export declare class ToastManager implements ToastNotifier {
    private container;
    private toasts;
    private position;
    constructor(options?: ToastManagerOptions);
    private getOrCreateContainer;
    private applyContainerClasses;
    show(options: ToastOptions): void;
    success(message: string, duration?: number): void;
    error(message: string, duration?: number): void;
    warning(message: string, duration?: number): void;
    info(message: string, duration?: number): void;
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
    private createToastElement;
    private dismiss;
    private getDefaultTitle;
    private getIconForType;
    private escapeHtml;
}
/**
 * Fallback notifier that uses native alert/confirm
 * Used when no ToastManager is configured (backwards compatibility)
 */
export declare class FallbackNotifier implements ToastNotifier {
    show(options: ToastOptions): void;
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    info(message: string): void;
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
}
export {};
//# sourceMappingURL=toast-manager.d.ts.map
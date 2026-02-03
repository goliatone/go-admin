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
export declare abstract class Modal {
    protected backdrop: HTMLElement | null;
    protected container: HTMLElement | null;
    private _options;
    private _escHandler;
    private _isOpen;
    constructor(opts?: ModalOptions);
    get isOpen(): boolean;
    protected get options(): Required<ModalOptions>;
    /** Return inner HTML for the container. Called once during show(). */
    protected abstract renderContent(): string;
    /** Bind event listeners to content elements. Called after renderContent(). */
    protected abstract bindContentEvents(): void;
    /** Show the modal. Async to support subclass data loading in onAfterShow(). */
    show(): Promise<void>;
    /** Hide the modal with fade-out animation. */
    hide(): void;
    /** Remove immediately without animation. */
    destroy(): void;
    /** Called after DOM is mounted and events are bound. Override for data loading. */
    protected onAfterShow(): Promise<void>;
    /** Called before hide. Return false to prevent closing. */
    protected onBeforeHide(): boolean;
    /** Try to hide; calls onBeforeHide() first. */
    protected requestHide(): void;
    private _bindBaseEvents;
    private _manageFocus;
    private _cleanup;
}
export interface ConfirmModalOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger';
}
export declare class ConfirmModal extends Modal {
    private _resolve;
    private _opts;
    private _isDone;
    constructor(options: ConfirmModalOptions);
    /** Show and return a promise that resolves when user decides. */
    static confirm(message: string, options?: Omit<ConfirmModalOptions, 'message'>): Promise<boolean>;
    prompt(): Promise<boolean>;
    protected renderContent(): string;
    protected bindContentEvents(): void;
    protected onBeforeHide(): boolean;
    private _finish;
}
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
export declare class TextPromptModal extends Modal {
    private config;
    constructor(config: TextPromptModalConfig);
    protected renderContent(): string;
    protected bindContentEvents(): void;
}
export declare function escapeHtml(str: string): string;
//# sourceMappingURL=modal.d.ts.map
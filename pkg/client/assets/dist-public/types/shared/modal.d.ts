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
import { escapeHTML as escapeHtml } from './html.js';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export { escapeHtml };
export interface ModalOptions {
    /** Maximum width. Default: 'lg' */
    size?: ModalSize;
    /** Optional maximum-height class applied in addition to the structural viewport constraint. */
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
    /** Allow the dialog surface to fill the current visual viewport. Default: false. */
    maximizable?: boolean;
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
    maximizable: boolean;
};
export declare const MODAL_ANATOMY: Readonly<{
    readonly root: "go-admin-modal";
    readonly backdrop: "go-admin-modal__backdrop";
    readonly container: "go-admin-modal__container";
    readonly surface: "go-admin-modal__surface";
    readonly header: "go-admin-modal__header";
    readonly body: "go-admin-modal__body";
    readonly footer: "go-admin-modal__footer";
    readonly close: "go-admin-modal__close";
}>;
export declare abstract class Modal {
    protected backdrop: HTMLElement | null;
    protected container: HTMLElement | null;
    private _options;
    private _backdropClickHandler;
    private _isOpen;
    private _invoker;
    private _layer;
    private _cleanupTimer;
    private _lifecycle;
    private _mounted;
    private _isMaximized;
    constructor(opts?: ModalOptions);
    get isOpen(): boolean;
    get isMaximized(): boolean;
    protected get options(): Readonly<ResolvedModalOptions>;
    /** Return inner HTML for the container. Called once during show(). */
    protected abstract renderContent(): string;
    /** Bind event listeners to content elements. Called after renderContent(). */
    protected abstract bindContentEvents(): void;
    /** Show the modal. Async to support subclass data loading in onAfterShow(). */
    show(): Promise<void>;
    /** Hide the modal with fade-out animation. */
    hide(): void;
    /** Request the normal vetoable close lifecycle. */
    requestClose(): boolean;
    /** Remove immediately without animation. */
    destroy(): void;
    /** Toggle the opt-in visual-viewport presentation without leaving the modal stack. */
    toggleMaximized(control?: HTMLElement | null): boolean;
    /** Set the opt-in visual-viewport presentation. Existing consumers are unchanged by default. */
    setMaximized(maximized: boolean, control?: HTMLElement | null): boolean;
    /** Called after DOM is mounted and events are bound. Override for data loading. */
    protected onAfterShow(): Promise<void>;
    /** Called before hide. Return false to prevent closing. */
    protected onBeforeHide(): boolean;
    /** Called after the modal DOM and shared state have been released. */
    protected onAfterHide(): void;
    /** Called when the dialog enters or leaves its visual-viewport presentation. */
    protected onMaximizedChange(_maximized: boolean): void;
    /** Replace product content without replacing the dialog container or stack. */
    protected replaceContent(content: string, initialFocus?: string | HTMLElement | null): void;
    /** Re-evaluate focus after product content changes in place. */
    protected refreshFocus(initialFocus?: string | HTMLElement | null): void;
    /** Try to hide; calls onBeforeHide() first. */
    protected requestHide(): void;
    private _bindBaseEvents;
    private _applyAccessibleName;
    private _focusInitial;
    private _beginClose;
    private _cleanup;
    private _animationDuration;
    private _cancelCleanupTimer;
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
    helpText?: string;
    /** CSS class string for the text input. Falls back to a sensible default. */
    inputClass?: string;
    onConfirm: (value: string) => void | boolean | string | {
        error?: string;
    } | Promise<void | boolean | string | {
        error?: string;
    }>;
    onCancel?: () => void;
}
export declare class TextPromptModal extends Modal {
    private config;
    private readonly inputId;
    private readonly helpId;
    private readonly errorId;
    constructor(config: TextPromptModalConfig);
    protected renderContent(): string;
    protected bindContentEvents(): void;
}
//# sourceMappingURL=modal.d.ts.map
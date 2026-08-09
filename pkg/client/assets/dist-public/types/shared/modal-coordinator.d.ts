/**
 * Internal modal coordination shared by generated and template-backed dialogs.
 *
 * There is one coordinator per Document so independently loaded modal adapters
 * agree on stacking, Escape ownership, focus containment, and body scroll lock.
 */
export type ModalFocusTarget = string | HTMLElement | null;
export interface ModalLayerOptions {
    container: HTMLElement;
    zIndexTarget?: HTMLElement;
    initialFocus?: ModalFocusTarget;
    returnFocus?: HTMLElement | null;
    dismissOnEscape?: boolean;
    onEscape?: () => void;
    lockBodyScroll?: boolean;
}
export interface ModalLayerHandle {
    readonly zIndex: number;
    isTopmost(): boolean;
    focusInitial(target?: ModalFocusTarget): void;
    setClosing(closing: boolean): void;
    release(options?: {
        restoreFocus?: boolean;
    }): void;
}
/** Internal focus eligibility shared by modal adapters and legacy focus traps. */
export declare function canReceiveModalFocus(element: HTMLElement): boolean;
/** Return sequentially keyboard-focusable descendants in DOM order. */
export declare function getModalFocusableElements(container: HTMLElement): HTMLElement[];
export declare function registerModalLayer(options: ModalLayerOptions): ModalLayerHandle;
//# sourceMappingURL=modal-coordinator.d.ts.map
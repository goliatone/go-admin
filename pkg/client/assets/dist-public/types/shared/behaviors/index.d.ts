export { BUSY_ACTIVE_VALUE, isBusy, resetBusy, resetBusyWithin, setBusy, type BusyController, type BusyControl, type BusyOptions, type BusyRoot, } from './busy.js';
export { NAVIGATION_BUSY_ROOT_SELECTOR, NAVIGATION_BUSY_TRIGGER_SELECTOR, isNavigationBusy, resetNavigationBusy, resetNavigationBusyWithin, } from './navigation.js';
export interface BehaviorRuntimeOptions {
    submitBusySelector?: string;
    window?: Window;
    listenForFragments?: boolean;
    compatibilitySubmitLoading?: boolean;
}
export interface BehaviorBootstrapOptions extends BehaviorRuntimeOptions {
    root?: Document | HTMLElement;
}
export interface BehaviorRuntimeController {
    reset(): void;
    destroy(): void;
}
export declare function initBehaviors(root?: Document | HTMLElement, options?: BehaviorRuntimeOptions): BehaviorRuntimeController;
export declare function resetBehaviors(root?: Document | HTMLElement): void;
export declare function bootstrapBehaviors(options?: BehaviorBootstrapOptions): BehaviorRuntimeController;
//# sourceMappingURL=index.d.ts.map
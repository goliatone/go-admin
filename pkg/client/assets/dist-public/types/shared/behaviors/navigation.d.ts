export declare const NAVIGATION_BUSY_ROOT_SELECTOR = "[data-behavior~=\"navigation-busy\"]";
export declare const NAVIGATION_BUSY_TRIGGER_SELECTOR = "[data-navigation-busy-trigger]";
export declare function handleNavigationBusyClick(event: MouseEvent, scope: Document | HTMLElement, win: Window | null): boolean;
export declare function handleNavigationBusySubmit(event: SubmitEvent, scope: Document | HTMLElement, win: Window | null): boolean;
export declare function isNavigationBusy(root: HTMLElement | null | undefined): boolean;
export declare function resetNavigationBusy(root: HTMLElement | null | undefined): void;
export declare function resetNavigationBusyWithin(root?: Document | HTMLElement): void;
//# sourceMappingURL=navigation.d.ts.map
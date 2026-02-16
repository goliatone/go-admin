/**
 * E-Sign DOM Helpers
 * Utilities for DOM manipulation, element selection, and event handling
 */
/**
 * Safely query selector that returns null instead of throwing
 */
export declare function qs<T extends Element = Element>(selector: string, parent?: ParentNode): T | null;
/**
 * Query all matching elements
 */
export declare function qsa<T extends Element = Element>(selector: string, parent?: ParentNode): T[];
/**
 * Get element by ID with type safety
 */
export declare function byId<T extends HTMLElement = HTMLElement>(id: string): T | null;
/**
 * Create an element with attributes and children
 */
export declare function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, attributes?: Record<string, string | undefined>, children?: (Node | string)[]): HTMLElementTagNameMap[K];
/**
 * Add event listener with automatic cleanup on AbortSignal
 */
export declare function on<K extends keyof HTMLElementEventMap>(element: HTMLElement | Document | Window, event: K, handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions & {
    signal?: AbortSignal;
}): () => void;
/**
 * Add delegated event listener
 */
export declare function delegate<K extends keyof HTMLElementEventMap>(parent: HTMLElement | Document, selector: string, event: K, handler: (this: HTMLElement, ev: HTMLElementEventMap[K], target: HTMLElement) => void, options?: AddEventListenerOptions): () => void;
/**
 * Run callback when DOM is ready
 */
export declare function onReady(callback: () => void): void;
/**
 * Show element (remove hidden classes)
 */
export declare function show(element: HTMLElement | null): void;
/**
 * Hide element (add hidden class)
 */
export declare function hide(element: HTMLElement | null): void;
/**
 * Toggle element visibility
 */
export declare function toggle(element: HTMLElement | null, visible?: boolean): void;
/**
 * Set element loading state
 */
export declare function setLoading(element: HTMLElement | null, loading: boolean, options?: {
    spinnerClass?: string;
}): void;
/**
 * Update text content of element by data attribute
 */
export declare function updateDataText(key: string, value: string | number, parent?: ParentNode): void;
/**
 * Update multiple data text elements
 */
export declare function updateDataTexts(values: Record<string, string | number>, parent?: ParentNode): void;
/**
 * Extract page config from script tag or data attribute
 */
export declare function getPageConfig<T extends Record<string, unknown>>(selector?: string, configAttr?: string): T | null;
/**
 * Announce message to screen readers
 */
export declare function announce(message: string, priority?: 'polite' | 'assertive'): void;
//# sourceMappingURL=dom-helpers.d.ts.map
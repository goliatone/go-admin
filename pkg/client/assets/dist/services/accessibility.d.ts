/**
 * Accessibility Utilities Module
 * Provides keyboard navigation, focus management, and screen-reader support
 * for the services module UI components.
 *
 * Usage:
 *   import { setupKeyboardNavigation, announceToScreenReader } from './accessibility.js';
 *
 *   // Enable keyboard navigation on a list
 *   setupKeyboardNavigation({
 *     container: tableElement,
 *     selector: 'tr[data-row-id]',
 *     onSelect: (element) => handleRowSelect(element),
 *   });
 *
 *   // Announce state changes to screen readers
 *   announceToScreenReader('Connection refreshed successfully');
 */
/** Configuration for keyboard navigation on lists/tables */
export interface KeyboardNavigationConfig {
    /** Container element for the navigable items */
    container: HTMLElement;
    /** Selector for navigable items within the container */
    selector: string;
    /** Called when an item is selected via Enter/Space */
    onSelect?: (element: HTMLElement, index: number) => void;
    /** Called when an item receives focus */
    onFocus?: (element: HTMLElement, index: number) => void;
    /** Called when Escape is pressed */
    onEscape?: () => void;
    /** Whether navigation wraps from last to first item (default: true) */
    wrap?: boolean;
    /** Whether to auto-focus first item on init (default: false) */
    autoFocus?: boolean;
    /** Custom key handlers */
    keyHandlers?: Record<string, (event: KeyboardEvent, element: HTMLElement, index: number) => void>;
}
/** Configuration for focus trap (e.g., in modals) */
export interface FocusTrapConfig {
    /** Container element to trap focus within */
    container: HTMLElement;
    /** Initial element to focus (default: first focusable) */
    initialFocus?: HTMLElement | string;
    /** Element to return focus to on close */
    returnFocus?: HTMLElement;
    /** Called when Escape is pressed */
    onEscape?: () => void;
}
/** Options for screen reader announcements */
export interface AnnounceOptions {
    /** Announcement priority: 'polite' or 'assertive' (default: 'polite') */
    priority?: 'polite' | 'assertive';
    /** Clear previous announcement before new one (default: true) */
    clear?: boolean;
}
/**
 * Set up keyboard navigation for a list/table of items.
 * Supports Arrow keys for navigation, Enter/Space for selection, Home/End for jump.
 */
export declare function setupKeyboardNavigation(config: KeyboardNavigationConfig): () => void;
/**
 * Set up roving tabindex for a toolbar or button group.
 */
export declare function setupRovingTabindex(container: HTMLElement, selector: string): () => void;
declare const FOCUSABLE_SELECTOR: string;
/**
 * Create a focus trap that keeps focus within a container (e.g., modal).
 * Returns a cleanup function to release the trap.
 */
export declare function createFocusTrap(config: FocusTrapConfig): () => void;
/**
 * Announce a message to screen readers via ARIA live region.
 */
export declare function announceToScreenReader(message: string, options?: AnnounceOptions): void;
/**
 * Announce loading state to screen readers.
 */
export declare function announceLoading(resource: string): void;
/**
 * Announce successful action to screen readers.
 */
export declare function announceSuccess(message: string): void;
/**
 * Announce error to screen readers.
 */
export declare function announceError(message: string): void;
/**
 * Announce navigation/page change to screen readers.
 */
export declare function announceNavigation(destination: string): void;
/**
 * Add ARIA attributes for a button that controls expanded/collapsed content.
 */
export declare function setExpandedState(trigger: HTMLElement, target: HTMLElement | string, expanded: boolean): void;
/**
 * Add ARIA attributes for a loading state.
 */
export declare function setLoadingState(element: HTMLElement, loading: boolean): void;
/**
 * Add ARIA label for status badges/indicators.
 */
export declare function setStatusLabel(element: HTMLElement, status: string, statusLabel: string): void;
/**
 * Add ARIA attributes for sortable table headers.
 */
export declare function setSortableHeader(header: HTMLElement, sorted: 'ascending' | 'descending' | 'none'): void;
/**
 * Add ARIA attributes for a progress indicator.
 */
export declare function setProgress(element: HTMLElement, value: number, max?: number, label?: string): void;
/**
 * Create a skip link for keyboard users to bypass navigation.
 */
export declare function createSkipLink(targetId: string, label?: string): HTMLAnchorElement;
/**
 * Set up focus management for a modal dialog.
 * Returns a cleanup function.
 */
export declare function setupDialogFocus(dialog: HTMLElement, options?: {
    title?: string;
    describedBy?: string;
    onClose?: () => void;
}): () => void;
/**
 * Check if user prefers reduced motion.
 */
export declare function prefersReducedMotion(): boolean;
/**
 * Get appropriate animation duration based on user preference.
 */
export declare function getAnimationDuration(normalDuration: number): number;
export { FOCUSABLE_SELECTOR };
//# sourceMappingURL=accessibility.d.ts.map
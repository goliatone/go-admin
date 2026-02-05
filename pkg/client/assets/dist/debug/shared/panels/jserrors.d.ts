import type { JSErrorEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the JS errors panel
 */
export type JSErrorsPanelOptions = PanelOptions & {
    /** Maximum number of entries to display. */
    maxEntries?: number;
    /** Use compact rendering (toolbar mode). */
    compact?: boolean;
    /** Whether to show the sort toggle control. */
    showSortToggle?: boolean;
};
/**
 * Render the JS errors panel table.
 *
 * @param errors - Array of JS error entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the JS errors panel
 */
export declare function renderJSErrorsPanel(errors: JSErrorEntry[], styles: StyleConfig, options?: JSErrorsPanelOptions): string;
//# sourceMappingURL=jserrors.d.ts.map
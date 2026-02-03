import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the JSON panel
 */
export type JSONPanelOptions = {
    /** Whether to use icon-based copy button (console) vs SVG-based (toolbar). Defaults to false. */
    useIconCopyButton?: boolean;
    /** Optional pre-filter function for the data (e.g., JSONPath search in console). */
    filterFn?: (data: Record<string, unknown>) => Record<string, unknown>;
    /** Whether to show key/item count. Defaults to true. */
    showCount?: boolean;
};
/**
 * Render a JSON panel with syntax highlighting and copy functionality
 *
 * @param title - Panel title to display
 * @param data - The data object to render as JSON
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the JSON panel
 */
export declare function renderJSONPanel(title: string, data: Record<string, unknown> | unknown, styles: StyleConfig, options?: JSONPanelOptions): string;
/**
 * Render a simple JSON viewer without title/header (for embedding in other panels)
 *
 * @param data - The data object to render as JSON
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the JSON viewer
 */
export declare function renderJSONViewer(data: Record<string, unknown> | unknown, styles: StyleConfig, options?: JSONPanelOptions): string;
//# sourceMappingURL=json.d.ts.map
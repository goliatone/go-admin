import type { CustomSnapshot } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the custom panel
 */
export type CustomPanelOptions = {
    /** Maximum number of log entries to display. Defaults to 50. */
    maxLogEntries?: number;
    /** Whether to use icon-based copy button (console) vs SVG-based (toolbar). Defaults to false. */
    useIconCopyButton?: boolean;
    /** Whether to show key count. Defaults to true. */
    showCount?: boolean;
    /** Optional filter function for custom data (e.g., search in console). */
    dataFilterFn?: (data: Record<string, unknown>) => Record<string, unknown>;
};
/**
 * Render the custom panel with both data and logs sections
 *
 * @param custom - Custom snapshot containing data and logs
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the custom panel
 */
export declare function renderCustomPanel(custom: CustomSnapshot, styles: StyleConfig, options?: CustomPanelOptions): string;
//# sourceMappingURL=custom.d.ts.map
import type { SQLEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the SQL panel
 */
export type SQLPanelOptions = PanelOptions & {
    /** Maximum number of entries to display. Defaults to 50 for toolbar, 200 for console. */
    maxEntries?: number;
    /** Whether to show the sort toggle control. Defaults to true for toolbar, false for console. */
    showSortToggle?: boolean;
    /** Whether to use icon-based copy button (console) vs SVG-based (toolbar). Defaults to false. */
    useIconCopyButton?: boolean;
};
/**
 * Render the SQL panel table
 *
 * @param queries - Array of SQL entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the SQL panel
 */
export declare function renderSQLPanel(queries: SQLEntry[], styles: StyleConfig, options?: SQLPanelOptions): string;
//# sourceMappingURL=sql.d.ts.map
import type { RequestEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the requests panel
 */
export type RequestsPanelOptions = PanelOptions & {
    /** Maximum number of entries to display. Defaults to 50 for toolbar, unlimited for console. */
    maxEntries?: number;
    /** Whether to show the sort toggle control. Defaults to true for toolbar, false for console. */
    showSortToggle?: boolean;
    /** Whether to truncate the path. Defaults to true for toolbar, false for console. */
    truncatePath?: boolean;
    /** Maximum path length before truncation. Defaults to 50. */
    maxPathLength?: number;
};
/**
 * Render the requests panel table
 *
 * @param requests - Array of request entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the requests panel
 */
export declare function renderRequestsPanel(requests: RequestEntry[], styles: StyleConfig, options?: RequestsPanelOptions): string;
//# sourceMappingURL=requests.d.ts.map
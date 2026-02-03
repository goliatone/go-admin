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
    /** Set of expanded request IDs (preserved across re-renders). */
    expandedRequestIds?: Set<string>;
    /** Placeholder string used for masked values. Defaults to '***'. */
    maskPlaceholder?: string;
    /** Maximum length for header/query values in the detail pane (toolbar truncation). */
    maxDetailLength?: number;
};
/**
 * Generate a stable key for a request entry.
 * Uses entry.id if available, otherwise falls back to timestamp + index.
 */
export declare function getRequestKey(entry: RequestEntry, index: number): string;
/**
 * Render the detail pane content for a single request entry.
 * Shows: Metadata line, Request Headers, Query Parameters,
 * Request Body, Response Headers, Response Body, and Error.
 * Sections are omitted when data is absent.
 */
export declare function renderRequestDetail(entry: RequestEntry, styles: StyleConfig, options?: {
    maskPlaceholder?: string;
    maxDetailLength?: number;
}): string;
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
import type { RouteEntry } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the routes panel
 */
export type RoutesPanelOptions = {
    /** Whether to show the name column. Defaults to true for console, false for toolbar. */
    showName?: boolean;
};
/**
 * Render the routes panel table
 *
 * @param routes - Array of route entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the routes panel
 */
export declare function renderRoutesPanel(routes: RouteEntry[], styles: StyleConfig, options?: RoutesPanelOptions): string;
//# sourceMappingURL=routes.d.ts.map
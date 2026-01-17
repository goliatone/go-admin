/**
 * CSS class configuration for different rendering contexts.
 * Provides functions that generate appropriate class names for console or toolbar.
 */
export type StyleConfig = {
    table: string;
    tableRoutes: string;
    badge: string;
    badgeMethod: (method: string) => string;
    badgeStatus: (status: number) => string;
    badgeLevel: (level: string) => string;
    badgeError: string;
    badgeCustom: string;
    duration: string;
    durationSlow: string;
    timestamp: string;
    path: string;
    message: string;
    queryText: string;
    rowError: string;
    rowSlow: string;
    expandableRow: string;
    expansionRow: string;
    slowQuery: string;
    errorQuery: string;
    expandIcon: string;
    emptyState: string;
    jsonViewer: string;
    jsonViewerHeader: string;
    jsonViewerTitle: string;
    jsonGrid: string;
    jsonPanel: string;
    jsonHeader: string;
    jsonActions: string;
    jsonContent: string;
    copyBtn: string;
    copyBtnSm: string;
    panelControls: string;
    sortToggle: string;
    expandedContent: string;
    expandedContentHeader: string;
    muted: string;
};
/**
 * Per-panel column configuration for consistent layouts across console/toolbar.
 * Each array defines the columns to display for that panel type.
 */
export type PanelColumns = {
    requests: ('method' | 'path' | 'status' | 'duration' | 'time')[];
    sql: ('duration' | 'rows' | 'time' | 'status' | 'query')[];
    logs: ('level' | 'time' | 'message' | 'source')[];
    routes: ('method' | 'path' | 'handler' | 'name')[];
    customLogs: ('category' | 'time' | 'message')[];
};
/**
 * Default column configuration for console (full debug panel)
 * Includes all available columns
 */
export declare const consoleColumns: PanelColumns;
/**
 * Default column configuration for toolbar (compact)
 * Omits some columns for space efficiency
 */
export declare const toolbarColumns: PanelColumns;
/**
 * Style configuration for the full debug console
 * Uses BEM-style class naming with `debug-` prefix
 */
export declare const consoleStyles: StyleConfig;
/**
 * Style configuration for the debug toolbar
 * Uses simpler class naming suitable for Shadow DOM
 */
export declare const toolbarStyles: StyleConfig;
/**
 * Get the appropriate style configuration for a context
 */
export declare function getStyleConfig(context: 'console' | 'toolbar'): StyleConfig;
/**
 * Get the appropriate column configuration for a context
 */
export declare function getColumnConfig(context: 'console' | 'toolbar'): PanelColumns;
/**
 * Column header labels for each panel type
 */
export declare const columnLabels: Record<string, Record<string, string>>;
/**
 * Generate table header HTML for a panel
 */
export declare function renderTableHeader(panel: keyof PanelColumns, columns: PanelColumns): string;
//# sourceMappingURL=styles.d.ts.map
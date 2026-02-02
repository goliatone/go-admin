// Shared style configuration for debug panels
// Abstracts CSS class differences between console and toolbar contexts

import { getStatusClass, getLevelClass } from './utils.js';

/**
 * CSS class configuration for different rendering contexts.
 * Provides functions that generate appropriate class names for console or toolbar.
 */
export type StyleConfig = {
  // Table styling
  table: string;
  tableRoutes: string;

  // Badge styling
  badge: string;
  badgeMethod: (method: string) => string;
  badgeStatus: (status: number) => string;
  badgeLevel: (level: string) => string;
  badgeError: string;
  badgeCustom: string;

  // Duration styling
  duration: string;
  durationSlow: string;

  // Cell content styling
  timestamp: string;
  path: string;
  message: string;
  queryText: string;

  // Row styling
  rowError: string;
  rowSlow: string;
  expandableRow: string;
  expansionRow: string;
  slowQuery: string;
  errorQuery: string;

  // Expand icon
  expandIcon: string;

  // Empty state
  emptyState: string;

  // JSON viewer
  jsonViewer: string;
  jsonViewerHeader: string;
  jsonViewerTitle: string;
  jsonGrid: string;
  jsonPanel: string;
  jsonHeader: string;
  jsonActions: string;
  jsonContent: string;

  // Copy button
  copyBtn: string;
  copyBtnSm: string;

  // Panel controls
  panelControls: string;
  sortToggle: string;

  // Expanded content
  expandedContent: string;
  expandedContentHeader: string;

  // Muted text
  muted: string;

  // SQL selection
  selectCell: string;
  sqlToolbar: string;
  sqlToolbarBtn: string;

  // Request detail
  detailRow: string;
  detailPane: string;
  detailSection: string;
  detailLabel: string;
  detailValue: string;
  detailKeyValueTable: string;
  detailError: string;
  detailMasked: string;
  badgeContentType: string;
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
export const consoleColumns: PanelColumns = {
  requests: ['method', 'path', 'status', 'duration', 'time'],
  sql: ['duration', 'rows', 'time', 'status', 'query'],
  logs: ['level', 'time', 'message', 'source'],
  routes: ['method', 'path', 'handler', 'name'],
  customLogs: ['category', 'time', 'message'],
};

/**
 * Default column configuration for toolbar (compact)
 * Omits some columns for space efficiency
 */
export const toolbarColumns: PanelColumns = {
  requests: ['method', 'path', 'status', 'duration', 'time'],
  sql: ['duration', 'rows', 'time', 'status', 'query'],
  logs: ['level', 'message', 'time'], // No source column in toolbar
  routes: ['method', 'path', 'handler'], // No name column in toolbar
  customLogs: ['category', 'message', 'time'],
};

/**
 * Style configuration for the full debug console
 * Uses BEM-style class naming with `debug-` prefix
 */
export const consoleStyles: StyleConfig = {
  // Table styling
  table: 'debug-table',
  tableRoutes: 'debug-table debug-routes-table',

  // Badge styling
  badge: 'badge',
  badgeMethod: (method: string) => `badge badge--method-${method.toLowerCase()}`,
  badgeStatus: (status: number) => {
    if (status >= 500) return 'badge badge--status-error';
    if (status >= 400) return 'badge badge--status-warn';
    return 'badge badge--status';
  },
  badgeLevel: (level: string) => `badge badge--level-${level.toLowerCase()}`,
  badgeError: 'badge badge--status-error',
  badgeCustom: 'badge badge--custom',

  // Duration styling
  duration: 'duration',
  durationSlow: 'duration--slow',

  // Cell content styling
  timestamp: 'timestamp',
  path: 'path',
  message: 'message',
  queryText: 'query-text',

  // Row styling
  rowError: 'error',
  rowSlow: 'slow',
  expandableRow: 'expandable-row',
  expansionRow: 'expansion-row',
  slowQuery: 'slow',
  errorQuery: 'error',

  // Expand icon
  expandIcon: 'expand-icon',

  // Empty state
  emptyState: 'debug-empty',

  // JSON viewer
  jsonViewer: 'debug-json-panel',
  jsonViewerHeader: 'debug-json-header',
  jsonViewerTitle: '',
  jsonGrid: 'debug-json-grid',
  jsonPanel: 'debug-json-panel',
  jsonHeader: 'debug-json-header',
  jsonActions: 'debug-json-actions',
  jsonContent: 'debug-json-content',

  // Copy button
  copyBtn: 'debug-btn debug-copy',
  copyBtnSm: 'debug-btn debug-copy debug-copy--sm',

  // Panel controls
  panelControls: 'debug-filter',
  sortToggle: 'debug-btn',

  // Expanded content
  expandedContent: 'expanded-content',
  expandedContentHeader: 'expanded-content__header',

  // Muted text
  muted: 'debug-muted',

  // SQL selection
  selectCell: 'debug-sql-select',
  sqlToolbar: 'debug-sql-toolbar',
  sqlToolbarBtn: 'debug-btn',

  // Request detail
  detailRow: 'request-detail-row',
  detailPane: 'request-detail-pane',
  detailSection: 'request-detail-section',
  detailLabel: 'request-detail-label',
  detailValue: 'request-detail-value',
  detailKeyValueTable: 'request-detail-kv',
  detailError: 'request-detail-error',
  detailMasked: 'request-detail-masked',
  badgeContentType: 'badge badge--content-type',
};

/**
 * Style configuration for the debug toolbar
 * Uses simpler class naming suitable for Shadow DOM
 */
export const toolbarStyles: StyleConfig = {
  // Table styling
  table: '',
  tableRoutes: '',

  // Badge styling
  badge: 'badge',
  badgeMethod: (method: string) => `badge badge-method ${method.toLowerCase()}`,
  badgeStatus: (status: number) => {
    const statusClass = getStatusClass(status);
    return statusClass ? `badge badge-status ${statusClass}` : 'badge badge-status';
  },
  badgeLevel: (level: string) => {
    const levelClass = getLevelClass(level);
    return `badge badge-level ${levelClass}`;
  },
  badgeError: 'badge badge-status error',
  badgeCustom: 'badge',

  // Duration styling
  duration: 'duration',
  durationSlow: 'slow',

  // Cell content styling
  timestamp: 'timestamp',
  path: 'path',
  message: 'message',
  queryText: 'query-text',

  // Row styling
  rowError: '',
  rowSlow: '',
  expandableRow: 'expandable-row',
  expansionRow: 'expansion-row',
  slowQuery: 'slow-query',
  errorQuery: 'error-query',

  // Expand icon
  expandIcon: 'expand-icon',

  // Empty state
  emptyState: 'empty-state',

  // JSON viewer
  jsonViewer: 'json-viewer',
  jsonViewerHeader: 'json-viewer__header',
  jsonViewerTitle: 'json-viewer__title',
  jsonGrid: '',
  jsonPanel: 'json-viewer',
  jsonHeader: 'json-viewer__header',
  jsonActions: '',
  jsonContent: '',

  // Copy button
  copyBtn: 'copy-btn',
  copyBtnSm: 'copy-btn',

  // Panel controls
  panelControls: 'panel-controls',
  sortToggle: 'sort-toggle',

  // Expanded content
  expandedContent: 'expanded-content',
  expandedContentHeader: 'expanded-content__header',

  // Muted text
  muted: 'timestamp',

  // SQL selection
  selectCell: 'sql-select',
  sqlToolbar: 'sql-toolbar',
  sqlToolbarBtn: 'copy-btn',

  // Request detail
  detailRow: 'request-detail-row',
  detailPane: 'request-detail-pane',
  detailSection: 'request-detail-section',
  detailLabel: 'request-detail-label',
  detailValue: 'request-detail-value',
  detailKeyValueTable: 'request-detail-kv',
  detailError: 'request-detail-error',
  detailMasked: 'request-detail-masked',
  badgeContentType: 'badge badge-content-type',
};

/**
 * Get the appropriate style configuration for a context
 */
export function getStyleConfig(context: 'console' | 'toolbar'): StyleConfig {
  return context === 'console' ? consoleStyles : toolbarStyles;
}

/**
 * Get the appropriate column configuration for a context
 */
export function getColumnConfig(context: 'console' | 'toolbar'): PanelColumns {
  return context === 'console' ? consoleColumns : toolbarColumns;
}

/**
 * Column header labels for each panel type
 */
export const columnLabels: Record<string, Record<string, string>> = {
  requests: {
    method: 'Method',
    path: 'Path',
    status: 'Status',
    duration: 'Duration',
    time: 'Time',
  },
  sql: {
    duration: 'Duration',
    rows: 'Rows',
    time: 'Time',
    status: 'Status',
    query: 'Query',
  },
  logs: {
    level: 'Level',
    time: 'Time',
    message: 'Message',
    source: 'Source',
  },
  routes: {
    method: 'Method',
    path: 'Path',
    handler: 'Handler',
    name: 'Name',
  },
  customLogs: {
    category: 'Category',
    time: 'Time',
    message: 'Message',
  },
};

/**
 * Generate table header HTML for a panel
 */
export function renderTableHeader(
  panel: keyof PanelColumns,
  columns: PanelColumns
): string {
  const cols = columns[panel];
  const labels = columnLabels[panel] || {};
  const headers = cols.map((col) => `<th>${labels[col] || col}</th>`).join('');
  return `<thead><tr>${headers}</tr></thead>`;
}

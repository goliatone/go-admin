// Class-name configuration for console renderers. Renderers never hardcode a
// host's class names: Debug passes its existing `debug-*` vocabulary and other
// consoles use the scoped `console-*` vocabulary below.

/**
 * CSS class configuration for a rendering context.
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
  detailBody: string;
  detailMetadataLine: string;
  badgeContentType: string;

  /**
   * Prefix for the declarative renderer blocks that have no dedicated key
   * (key/value lists, identity headers, schema grids, filters, buttons and
   * deferred-syntax markers). Defaults to `debug` so existing Debug output is
   * unchanged.
   */
  blockPrefix?: string;
};

/** Default block prefix; preserves the shipped Debug markup. */
export const DEFAULT_BLOCK_PREFIX = 'debug';

const BLOCK_PREFIX_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Resolve a safe block prefix for class names and data attributes. */
export function blockPrefix(styles: Pick<StyleConfig, 'blockPrefix'> | undefined): string {
  const prefix = typeof styles?.blockPrefix === 'string' ? styles.blockPrefix.trim() : '';
  return prefix && BLOCK_PREFIX_PATTERN.test(prefix) ? prefix : DEFAULT_BLOCK_PREFIX;
}

const tone = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return normalized || 'default';
};

/**
 * Style configuration for neutral console hosts. Every class is scoped under
 * the `console-` vocabulary defined by `styles/console.css`.
 */
export const consoleStyleConfig: StyleConfig = {
  table: 'console-table',
  tableRoutes: 'console-table',

  badge: 'console-badge',
  badgeMethod: (method: string) => `console-badge console-badge--${tone(method)}`,
  badgeStatus: (status: number) => {
    if (status >= 500) return 'console-badge console-badge--danger';
    if (status >= 400) return 'console-badge console-badge--warning';
    return 'console-badge';
  },
  badgeLevel: (level: string) => `console-badge console-badge--${tone(level)}`,
  badgeError: 'console-badge console-badge--danger',
  badgeCustom: 'console-badge',

  duration: 'console-duration',
  durationSlow: 'console-duration--slow',

  timestamp: 'console-timestamp',
  path: 'console-path',
  message: 'console-message',
  queryText: 'console-code',

  rowError: 'console-row--error',
  rowSlow: 'console-row--slow',
  expandableRow: 'console-row--expandable',
  expansionRow: 'console-row--expansion',
  slowQuery: 'console-row--slow',
  errorQuery: 'console-row--error',

  expandIcon: 'console-expand-icon',

  emptyState: 'console-empty',

  jsonViewer: 'console-json-panel',
  jsonViewerHeader: 'console-json-header',
  jsonViewerTitle: 'console-json-title',
  jsonGrid: 'console-json-grid',
  jsonPanel: 'console-json-panel',
  jsonHeader: 'console-json-header',
  jsonActions: 'console-json-actions',
  jsonContent: 'console-json-content',

  copyBtn: 'console-btn console-copy',
  copyBtnSm: 'console-btn console-copy console-copy--sm',

  panelControls: 'console-controls',
  sortToggle: 'console-btn',

  expandedContent: 'console-expanded',
  expandedContentHeader: 'console-expanded__header',

  muted: 'console-muted',

  selectCell: 'console-select-cell',
  sqlToolbar: 'console-controls',
  sqlToolbarBtn: 'console-btn',

  detailRow: 'console-detail-row',
  detailPane: 'console-detail-pane',
  detailSection: 'console-detail-section',
  detailLabel: 'console-detail-label',
  detailValue: 'console-detail-value',
  detailKeyValueTable: 'console-detail-kv',
  detailError: 'console-detail-error',
  detailMasked: 'console-detail-masked',
  detailBody: 'console-detail-body',
  detailMetadataLine: 'console-detail-metadata',
  badgeContentType: 'console-badge',

  blockPrefix: 'console',
};

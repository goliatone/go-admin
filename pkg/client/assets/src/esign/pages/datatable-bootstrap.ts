/**
 * E-Sign Datatable Bootstrap Utilities
 * Shared datatable initialization and configuration for e-sign list pages
 */

import { onReady, qs } from '../utils/dom-helpers.js';

/**
 * Filter field configuration
 */
export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date';
  options?: Array<{ label: string; value: string }>;
  operators?: string[];
}

/**
 * Column configuration
 */
export interface ColumnConfig {
  field: string;
  label?: string;
  sortable?: boolean;
  hidden?: boolean;
  default?: boolean;
  [key: string]: unknown;
}

/**
 * Cell renderer function type
 */
export type CellRenderer = (value: unknown, row?: Record<string, unknown>) => string;

/**
 * Datatable bootstrap configuration
 */
export interface DatatableBootstrapConfig {
  datatableId: string;
  basePath: string;
  apiBasePath?: string;
  apiEndpoint: string;
  actionBasePath: string;
  columns: ColumnConfig[];
  filters?: Array<{
    name: string;
    label: string;
    type?: string;
    options?: Array<{ value?: unknown; label?: string }>;
    operators?: string[];
    default_operator?: string;
  }>;
  env?: string;
  locale?: string;
  panelName: string;
  localStorageKey: string;
  cellRenderers?: Record<string, CellRenderer>;
  onActionSuccess?: (actionName: string, result: unknown) => void;
  onActionError?: (actionName: string, error: ActionError) => void;
}

interface ActionError {
  message?: string;
  textCode?: string;
  fields?: Record<string, string>;
}

/**
 * Panel pagination behavior
 */
export class PanelPaginationBehavior {
  private readonly env?: string;

  constructor(env?: string) {
    this.env = env;
  }

  buildQuery(page: number, perPage: number): Record<string, unknown> {
    const params: Record<string, unknown> = { page, per_page: perPage };
    if (this.env) params.env = this.env;
    return params;
  }

  async onPageChange(_page: number, grid: { refresh: () => Promise<void> }): Promise<void> {
    await grid.refresh();
  }
}

/**
 * Panel search behavior
 */
export class PanelSearchBehavior {
  private readonly env?: string;

  constructor(env?: string) {
    this.env = env;
  }

  buildQuery(term: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const value = term ? term.trim() : '';
    if (value) params.search = value;
    if (this.env) params.env = this.env;
    return params;
  }

  async onSearch(_term: string, grid: { resetPagination: () => void; refresh: () => Promise<void> }): Promise<void> {
    grid.resetPagination();
    await grid.refresh();
  }
}

/**
 * Normalize filter type to standard types
 */
export function normalizeFilterType(type?: string): 'text' | 'select' | 'number' | 'date' {
  switch ((type || '').toLowerCase()) {
    case 'select':
    case 'enum':
      return 'select';
    case 'number':
    case 'integer':
      return 'number';
    case 'date':
    case 'datetime':
    case 'time':
      return 'date';
    default:
      return 'text';
  }
}

/**
 * Normalize filter options
 */
export function normalizeFilterOptions(
  options?: Array<{ value?: unknown; label?: string }>
): Array<{ label: string; value: string }> | undefined {
  if (!Array.isArray(options)) return undefined;
  const normalized = options
    .map((option) => {
      if (!option) return null;
      const value = option.value ?? '';
      const label = option.label ?? String(value);
      return { label: String(label), value: String(value) };
    })
    .filter((o): o is { label: string; value: string } => o !== null);
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalize filter operators
 */
export function normalizeFilterOperators(
  operators?: string[],
  defaultOperator?: string
): string[] | undefined {
  if (!Array.isArray(operators) || operators.length === 0) return undefined;
  const normalized = operators
    .map((op) => String(op || '').trim().toLowerCase())
    .filter(Boolean);
  if (normalized.length === 0) return undefined;
  const deduped = Array.from(new Set(normalized));
  const preferred = defaultOperator ? String(defaultOperator).trim().toLowerCase() : '';
  if (preferred && deduped.includes(preferred)) {
    return [preferred, ...deduped.filter((op) => op !== preferred)];
  }
  return deduped;
}

/**
 * Prepare grid columns from raw column config
 */
export function prepareGridColumns(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.map((col) => ({
    ...col,
    hidden: col.default === false,
  }));
}

/**
 * Prepare filter fields from raw filter config
 */
export function prepareFilterFields(
  filters?: DatatableBootstrapConfig['filters']
): FilterField[] {
  if (!filters) return [];
  return filters.map((filter) => ({
    name: filter.name,
    label: filter.label,
    type: normalizeFilterType(filter.type),
    options: normalizeFilterOptions(filter.options),
    operators: normalizeFilterOperators(filter.operators, filter.default_operator),
  }));
}

/**
 * Common date/time cell renderer
 */
export function dateTimeCellRenderer(value: unknown): string {
  if (!value) return '-';
  try {
    const date = new Date(value as string);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return String(value);
  }
}

/**
 * File size cell renderer
 */
export function fileSizeCellRenderer(value: unknown): string {
  if (!value || Number(value) <= 0) return '-';
  const bytes = parseInt(String(value), 10);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Default action success handler
 */
export function defaultActionSuccessHandler(
  actionName: string,
  _result: unknown,
  notifier?: { success: (msg: string) => void }
): void {
  if (notifier) {
    notifier.success(`${actionName} completed successfully`);
  }
}

/**
 * Default action error handler with field details
 */
export function defaultActionErrorHandler(
  actionName: string,
  error: ActionError,
  notifier?: { error: (msg: string) => void }
): void {
  if (notifier) {
    const fieldDetails = error?.fields
      ? Object.entries(error.fields)
          .map(([field, detail]) => `${field}: ${detail}`)
          .join('; ')
      : '';
    const prefix = error?.textCode ? `${error.textCode}: ` : '';
    const message = error?.message || `${actionName} failed`;
    notifier.error(fieldDetails ? `${prefix}${message}: ${fieldDetails}` : `${prefix}${message}`);
  }
}

/**
 * Setup refresh button event listener
 */
export function setupRefreshButton(
  buttonId: string,
  grid: { refresh: () => Promise<void> }
): void {
  const refreshBtn = qs<HTMLButtonElement>(`#${buttonId}`);
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('opacity-50');
      try {
        await grid.refresh();
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('opacity-50');
      }
    });
  }
}

/**
 * Create schema action caching wrapper for grid refresh
 */
export function createSchemaActionCachingRefresh(
  grid: { refresh: () => Promise<void>; getSchema: () => { actions?: unknown } | null },
  setCachedActions: (actions: unknown) => void
): () => Promise<void> {
  const originalRefresh = grid.refresh.bind(grid);
  return async function () {
    await originalRefresh();
    const schema = grid.getSchema();
    if (schema?.actions) {
      setCachedActions(schema.actions);
    }
  };
}

/**
 * Standard datatable grid selectors
 */
export const STANDARD_GRID_SELECTORS = {
  searchInput: '#table-search',
  perPageSelect: '#table-per-page',
  filterRow: '[data-filter-column]',
  columnToggleBtn: '#column-toggle-btn',
  columnToggleMenu: '#column-toggle-menu',
  exportBtn: '#export-btn',
  exportMenu: '#export-menu',
  paginationContainer: '#table-pagination',
  tableInfoStart: '#table-info-start',
  tableInfoEnd: '#table-info-end',
  tableInfoTotal: '#table-info-total',
  selectAllCheckbox: '#table-checkbox-all',
  rowCheckboxes: '.table-checkbox',
  bulkActionsBar: '#bulk-actions-overlay',
  selectedCount: '#selected-count',
} as const;

// Export all utilities
export type {
  ActionError,
};

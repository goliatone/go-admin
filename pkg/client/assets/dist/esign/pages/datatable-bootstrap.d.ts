/**
 * E-Sign Datatable Bootstrap Utilities
 * Shared datatable initialization and configuration for e-sign list pages
 */
/**
 * Filter field configuration
 */
export interface FilterField {
    name: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'date';
    options?: Array<{
        label: string;
        value: string;
    }>;
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
        options?: Array<{
            value?: unknown;
            label?: string;
        }>;
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
export declare class PanelPaginationBehavior {
    private readonly env?;
    constructor(env?: string);
    buildQuery(page: number, perPage: number): Record<string, unknown>;
    onPageChange(_page: number, grid: {
        refresh: () => Promise<void>;
    }): Promise<void>;
}
/**
 * Panel search behavior
 */
export declare class PanelSearchBehavior {
    private readonly env?;
    constructor(env?: string);
    buildQuery(term: string): Record<string, unknown>;
    onSearch(_term: string, grid: {
        resetPagination: () => void;
        refresh: () => Promise<void>;
    }): Promise<void>;
}
/**
 * Normalize filter type to standard types
 */
export declare function normalizeFilterType(type?: string): 'text' | 'select' | 'number' | 'date';
/**
 * Normalize filter options
 */
export declare function normalizeFilterOptions(options?: Array<{
    value?: unknown;
    label?: string;
}>): Array<{
    label: string;
    value: string;
}> | undefined;
/**
 * Normalize filter operators
 */
export declare function normalizeFilterOperators(operators?: string[], defaultOperator?: string): string[] | undefined;
/**
 * Prepare grid columns from raw column config
 */
export declare function prepareGridColumns(columns: ColumnConfig[]): ColumnConfig[];
/**
 * Prepare filter fields from raw filter config
 */
export declare function prepareFilterFields(filters?: DatatableBootstrapConfig['filters']): FilterField[];
/**
 * Common date/time cell renderer
 */
export declare function dateTimeCellRenderer(value: unknown): string;
/**
 * File size cell renderer
 */
export declare function fileSizeCellRenderer(value: unknown): string;
/**
 * Default action success handler
 */
export declare function defaultActionSuccessHandler(actionName: string, _result: unknown, notifier?: {
    success: (msg: string) => void;
}): void;
/**
 * Default action error handler with field details
 */
export declare function defaultActionErrorHandler(actionName: string, error: ActionError, notifier?: {
    error: (msg: string) => void;
}): void;
/**
 * Setup refresh button event listener
 */
export declare function setupRefreshButton(buttonId: string, grid: {
    refresh: () => Promise<void>;
}): void;
/**
 * Create schema action caching wrapper for grid refresh
 */
export declare function createSchemaActionCachingRefresh(grid: {
    refresh: () => Promise<void>;
    getSchema: () => {
        actions?: unknown;
    } | null;
}, setCachedActions: (actions: unknown) => void): () => Promise<void>;
/**
 * Standard datatable grid selectors
 */
export declare const STANDARD_GRID_SELECTORS: {
    readonly searchInput: "#table-search";
    readonly perPageSelect: "#table-per-page";
    readonly filterRow: "[data-filter-column]";
    readonly columnToggleBtn: "#column-toggle-btn";
    readonly columnToggleMenu: "#column-toggle-menu";
    readonly exportBtn: "#export-btn";
    readonly exportMenu: "#export-menu";
    readonly paginationContainer: "#table-pagination";
    readonly tableInfoStart: "#table-info-start";
    readonly tableInfoEnd: "#table-info-end";
    readonly tableInfoTotal: "#table-info-total";
    readonly selectAllCheckbox: "#table-checkbox-all";
    readonly rowCheckboxes: ".table-checkbox";
    readonly bulkActionsBar: "#bulk-actions-overlay";
    readonly selectedCount: "#selected-count";
};
export type { ActionError, };
//# sourceMappingURL=datatable-bootstrap.d.ts.map
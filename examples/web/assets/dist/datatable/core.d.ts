import type { ColumnDefinition, ColumnFilter, SortColumn, DataGridBehaviors } from './behaviors/types.js';
import type { ActionButton, BulkActionConfig } from './actions.js';
import type { CellRenderer } from './renderers.js';
/**
 * DataGrid configuration
 */
export interface DataGridConfig {
    tableId: string;
    apiEndpoint: string;
    /**
     * Optional base path for view/edit links (UI routes). Falls back to apiEndpoint.
     */
    actionBasePath?: string;
    columns: ColumnDefinition[];
    perPage?: number;
    searchDelay?: number;
    behaviors?: DataGridBehaviors;
    selectors?: Partial<DataGridSelectors>;
    /**
     * Custom row actions (overrides default view/edit/delete)
     */
    rowActions?: (record: any) => ActionButton[];
    /**
     * Custom bulk actions
     */
    bulkActions?: BulkActionConfig[];
    /**
     * Custom cell renderers (field name -> renderer function)
     */
    cellRenderers?: Record<string, CellRenderer>;
    /**
     * Custom row class provider
     */
    rowClassProvider?: (record: any) => string[];
    /**
     * Use default actions (view, edit, delete)
     */
    useDefaultActions?: boolean;
}
/**
 * DOM element selectors
 */
interface DataGridSelectors {
    table: string;
    searchInput: string;
    perPageSelect: string;
    filterRow: string;
    columnToggleBtn: string;
    columnToggleMenu: string;
    exportBtn: string;
    exportMenu: string;
    paginationContainer: string;
    tableInfoStart: string;
    tableInfoEnd: string;
    tableInfoTotal: string;
    selectAllCheckbox: string;
    rowCheckboxes: string;
    bulkActionsBar: string;
    selectedCount: string;
}
/**
 * DataGrid state
 */
interface DataGridState {
    currentPage: number;
    perPage: number;
    totalRows: number;
    search: string;
    filters: ColumnFilter[];
    sort: SortColumn[];
    selectedRows: Set<string>;
    hiddenColumns: Set<string>;
}
/**
 * DataGrid component
 * Behavior-agnostic data grid with pluggable behaviors
 */
export declare class DataGrid {
    config: DataGridConfig;
    state: DataGridState;
    private selectors;
    private tableEl;
    private searchTimeout;
    private abortController;
    private actionRenderer;
    private cellRendererRegistry;
    private recordsById;
    constructor(config: DataGridConfig);
    /**
     * Initialize the data grid
     */
    init(): void;
    /**
     * Restore DataGrid state from URL parameters
     */
    private restoreStateFromURL;
    /**
     * Apply restored state to UI elements
     */
    private applyRestoredState;
    /**
     * Push current state to URL without reloading page
     */
    private pushStateToURL;
    /**
     * Refresh data from API
     */
    refresh(): Promise<void>;
    /**
     * Build API URL with all query parameters
     */
    buildApiUrl(): string;
    /**
     * Build query string (for exports, etc.)
     */
    buildQueryString(): string;
    /**
     * Build query parameters from state using behaviors
     */
    private buildQueryParams;
    /**
     * Reset pagination to first page
     */
    resetPagination(): void;
    /**
     * Update column visibility
     */
    updateColumnVisibility(visibleColumns: string[], skipURLUpdate?: boolean): void;
    /**
     * Render data into table
     */
    private renderData;
    /**
     * Create table row element
     */
    private createTableRow;
    /**
     * Sanitize action label to create a valid ID
     */
    private sanitizeActionId;
    /**
     * Handle delete action
     */
    private handleDelete;
    /**
     * Update pagination UI
     */
    private updatePaginationUI;
    /**
     * Render pagination buttons
     */
    private renderPaginationButtons;
    /**
     * Bind search input
     */
    private bindSearchInput;
    /**
     * Bind per-page select
     */
    private bindPerPageSelect;
    /**
     * Bind filter inputs
     */
    private bindFilterInputs;
    /**
     * Bind column visibility toggle
     */
    private bindColumnVisibility;
    /**
     * Bind export buttons
     */
    private bindExportButtons;
    /**
     * Bind table sorting
     */
    private bindSorting;
    /**
     * Update sort indicators in table headers
     */
    private updateSortIndicators;
    /**
     * Bind selection checkboxes
     */
    private bindSelection;
    /**
     * Update selection bindings after rendering
     */
    private updateSelectionBindings;
    /**
     * Bind bulk action buttons
     */
    private bindBulkActions;
    /**
     * Update bulk actions bar visibility
     */
    private updateBulkActionsBar;
    /**
     * Bind dropdown toggles
     */
    private bindDropdownToggles;
    /**
     * Show error message
     */
    private showError;
}
export {};
//# sourceMappingURL=core.d.ts.map
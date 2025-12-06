import type { ColumnDefinition, DataGridBehaviors } from './behaviors/types';
/**
 * DataGrid configuration
 */
export interface DataGridConfig {
    tableId: string;
    apiEndpoint: string;
    columns: ColumnDefinition[];
    perPage?: number;
    searchDelay?: number;
    behaviors?: DataGridBehaviors;
    selectors?: Partial<DataGridSelectors>;
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
 * DataGrid component
 * Behavior-agnostic data grid with pluggable behaviors
 */
export declare class DataGrid {
    config: DataGridConfig;
    private state;
    private selectors;
    private tableEl;
    private searchTimeout;
    private abortController;
    constructor(config: DataGridConfig);
    /**
     * Initialize the data grid
     */
    init(): void;
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
    updateColumnVisibility(visibleColumns: string[]): void;
    /**
     * Render data into table
     */
    private renderData;
    /**
     * Create table row element
     */
    private createTableRow;
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
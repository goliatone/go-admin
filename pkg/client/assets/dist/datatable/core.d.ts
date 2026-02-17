import type { ColumnDefinition, ColumnFilter, SortColumn, DataGridBehaviors } from './behaviors/types.js';
import type { ActionButton, BulkActionConfig, ActionRenderMode } from './actions.js';
import type { CellRenderer } from './renderers.js';
import type { ToastNotifier } from '../toast/types.js';
import type { ViewMode, GroupedData } from './grouped-mode.js';
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
    /**
     * Action rendering mode: 'inline' (buttons) or 'dropdown' (menu)
     */
    actionRenderMode?: ActionRenderMode;
    /**
     * Toast notification handler (optional)
     * If not provided, falls back to native alert/confirm
     */
    notifier?: ToastNotifier;
    /**
     * Panel identifier for state persistence (Phase 2 grouped mode)
     */
    panelId?: string;
    /**
     * Enable grouped mode support (Phase 2)
     * When true, records can be grouped by translation_group_id
     */
    enableGroupedMode?: boolean;
    /**
     * Default view mode: 'flat', 'grouped', or 'matrix' (Phase 2)
     */
    defaultViewMode?: ViewMode;
    /**
     * Field to group by (default: translation_group_id)
     */
    groupByField?: string;
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
    columnOrder: string[];
    viewMode: ViewMode;
    groupedData: GroupedData | null;
    expandedGroups: Set<string>;
    hasPersistedExpandState: boolean;
}
/**
 * DataGrid component
 * Behavior-agnostic data grid with pluggable behaviors
 */
export declare class DataGrid {
    private static readonly URL_KEY_SEARCH;
    private static readonly URL_KEY_PAGE;
    private static readonly URL_KEY_PER_PAGE;
    private static readonly URL_KEY_FILTERS;
    private static readonly URL_KEY_SORT;
    private static readonly URL_KEY_HIDDEN_COLUMNS;
    private static readonly URL_KEY_VIEW_MODE;
    private static readonly URL_KEY_EXPANDED_GROUPS;
    private static readonly MANAGED_URL_KEYS;
    config: DataGridConfig;
    state: DataGridState;
    private selectors;
    private tableEl;
    private searchTimeout;
    private abortController;
    private dropdownAbortController;
    private didRestoreColumnOrder;
    private shouldReorderDOMOnRestore;
    private actionRenderer;
    private cellRendererRegistry;
    private recordsById;
    private notifier;
    private columnManager;
    private defaultColumns;
    private lastSchema;
    private lastForm;
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
     * Public API: sync current grid state to the URL.
     * Keeps `hiddenColumns` shareable; column order stays preferences-only by default.
     */
    syncURL(): void;
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
    private getResponseTotal;
    private normalizePagination;
    /**
     * Reset pagination to first page
     */
    resetPagination(): void;
    /**
     * Update column visibility
     */
    updateColumnVisibility(visibleColumns: string[], skipURLUpdate?: boolean): void;
    /**
     * Sync column visibility switches with current state
     * Uses ColumnManager if available, falls back to direct DOM manipulation
     */
    private syncColumnVisibilityCheckboxes;
    /**
     * Render data into table
     */
    private renderData;
    /**
     * Render data in flat mode (original behavior)
     */
    private renderFlatData;
    /**
     * Render data in grouped mode (Phase 2)
     */
    private renderGroupedData;
    /**
     * Whether grouped view is currently active and enabled.
     */
    private isGroupedViewActive;
    /**
     * Fallback to flat mode when grouped pagination contract is unavailable.
     */
    private fallbackGroupedMode;
    /**
     * Fallback on grouped mode request errors that indicate unsupported contract.
     */
    private handleGroupedModeStatusFallback;
    /**
     * Fallback when payload does not follow backend grouped-row contract.
     */
    private handleGroupedModePayloadFallback;
    /**
     * Toggle group expand/collapse state (Phase 2)
     */
    toggleGroup(groupId: string): void;
    /**
     * Update visibility of child rows for a group
     */
    private updateGroupVisibility;
    /**
     * Set view mode (flat, grouped, matrix) - Phase 2
     */
    setViewMode(mode: ViewMode): void;
    /**
     * Get current view mode
     */
    getViewMode(): ViewMode;
    /**
     * Get grouped data (if available)
     */
    getGroupedData(): GroupedData | null;
    /**
     * Fetch a detail payload and unwrap the record from the `data` field.
     */
    fetchDetail(id: string): Promise<{
        data: any;
        schema?: Record<string, any>;
        form?: Record<string, any>;
        tabs?: any[];
    }>;
    /**
     * Access the most recent schema returned by the API (list or detail).
     */
    getSchema(): Record<string, any> | null;
    /**
     * Access the most recent form returned by the API (list or detail).
     */
    getForm(): Record<string, any> | null;
    /**
     * Access tabs from the most recent schema payload.
     */
    getTabs(): any[];
    private normalizeDetailResponse;
    private resolveRendererOptions;
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
     * Bind column visibility toggle using ColumnManager
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
     * This syncs checkbox states with the selectedRows Set
     */
    private updateSelectionBindings;
    /**
     * Bind bulk action buttons
     */
    private bindBulkActions;
    /**
     * Bind overflow menu toggle (three-dot "More" button)
     */
    private bindOverflowMenu;
    /**
     * Update bulk actions bar visibility with animation
     */
    private updateBulkActionsBar;
    /**
     * Bind clear selection button
     */
    private bindBulkClearButton;
    /**
     * Clear all selections
     */
    private clearSelection;
    /**
     * Position dropdown menu intelligently based on available space
     */
    private positionDropdownMenu;
    /**
     * Bind dropdown toggles
     */
    private bindDropdownToggles;
    /**
     * Show error message using notifier
     */
    private showError;
    /**
     * Show notification using notifier
     */
    private notify;
    /**
     * Show confirmation dialog using notifier
     */
    private confirmAction;
    /**
     * Extract error message from Response or Error
     */
    private extractError;
    private parseDatasetStringArray;
    private parseDatasetObject;
    /**
     * Reorder columns based on the provided order array
     * Updates config.columns order and triggers DOM reordering
     * Note: Column order is NOT pushed to URL by default (per guiding notes)
     */
    reorderColumns(newOrder: string[]): void;
    /**
     * Reset columns to their initial/default order and visibility.
     * Intended to be called by ColumnManager's "Reset to Default" action.
     */
    resetColumnsToDefault(): void;
    /**
     * Merge and validate saved column order with current columns
     * - Drops columns that no longer exist
     * - Appends new columns that aren't in saved order
     */
    private mergeColumnOrder;
    /**
     * Reorder table DOM elements (header, filter row, body rows)
     * Moves existing nodes rather than recreating them to preserve event listeners
     */
    private reorderTableColumns;
    /**
     * Reorder cells within a single row
     * Preserves fixed columns (selection on left, actions on right)
     */
    private reorderRowCells;
    /**
     * Cleanup and destroy the DataGrid instance
     * Call this when removing the grid from the DOM to prevent memory leaks
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=core.d.ts.map
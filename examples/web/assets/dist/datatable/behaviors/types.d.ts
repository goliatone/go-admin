/**
 * Behavior interfaces for DataGrid component
 * These interfaces define the contract for pluggable behaviors
 */
import type { DataGrid } from '../core';
/**
 * Column filter specification
 */
export interface ColumnFilter {
    column: string;
    operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in' | 'and' | 'or';
    value: any;
}
/**
 * Filter condition within a group
 */
export interface FilterCondition {
    field: string;
    operator: string;
    value: any;
}
/**
 * Filter group with conditions joined by logic operator
 */
export interface FilterGroup {
    conditions: FilterCondition[];
    logic: 'and' | 'or';
}
/**
 * Complete filter structure with groups
 */
export interface FilterStructure {
    groups: FilterGroup[];
    groupLogic: ('and' | 'or')[];
}
/**
 * Sort column specification
 */
export interface SortColumn {
    field: string;
    direction: 'asc' | 'desc';
}
/**
 * Column definition for the grid
 */
export interface ColumnDefinition {
    field: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    hidden?: boolean;
    render?: (value: any, row: any) => string;
}
/**
 * Search behavior - handles global search functionality
 */
export interface SearchBehavior {
    /**
     * Build query parameters for search
     */
    buildQuery(term: string): Record<string, any>;
    /**
     * Handle search event
     */
    onSearch(term: string, grid: DataGrid): Promise<void>;
}
/**
 * Filter behavior - handles column-level filtering
 */
export interface FilterBehavior {
    /**
     * Build query parameters from column filters
     */
    buildFilters(filters: ColumnFilter[]): Record<string, any>;
    /**
     * Handle filter change event
     */
    onFilterChange(column: string, value: any, grid: DataGrid): Promise<void>;
}
/**
 * Pagination behavior - handles page navigation
 */
export interface PaginationBehavior {
    /**
     * Build query parameters for pagination
     */
    buildQuery(page: number, perPage: number): Record<string, any>;
    /**
     * Handle page change event
     */
    onPageChange(page: number, grid: DataGrid): Promise<void>;
}
/**
 * Sort behavior - handles column sorting
 */
export interface SortBehavior {
    /**
     * Build query parameters for sorting
     */
    buildQuery(columns: SortColumn[]): Record<string, any>;
    /**
     * Handle sort event
     */
    onSort(column: string, direction: 'asc' | 'desc', grid: DataGrid): Promise<void>;
}
/**
 * Export behavior - handles data export
 */
export interface ExportBehavior {
    /**
     * Get the export endpoint URL
     */
    getEndpoint(): string;
    /**
     * Export data in specified format
     */
    export(format: 'csv' | 'excel' | 'pdf', grid: DataGrid): Promise<void>;
}
/**
 * Bulk action behavior - handles bulk operations
 */
export interface BulkActionBehavior {
    /**
     * Get the endpoint for a specific action
     */
    getActionEndpoint(action: string): string;
    /**
     * Execute bulk action on selected IDs
     */
    execute(action: string, ids: string[], grid: DataGrid): Promise<void>;
}
/**
 * Column visibility behavior - handles show/hide columns
 */
export interface ColumnVisibilityBehavior {
    /**
     * Get currently visible columns
     */
    getVisibleColumns(): string[];
    /**
     * Toggle column visibility
     */
    toggleColumn(field: string, grid: DataGrid): void;
    /**
     * Save visibility state (e.g., to localStorage)
     */
    saveState(state: Record<string, boolean>): void;
    /**
     * Load visibility state
     */
    loadState(): Record<string, boolean>;
}
/**
 * Behavior collection for DataGrid
 */
export interface DataGridBehaviors {
    search?: SearchBehavior;
    filter?: FilterBehavior;
    pagination?: PaginationBehavior;
    sort?: SortBehavior;
    export?: ExportBehavior;
    bulkActions?: BulkActionBehavior;
    columnVisibility?: ColumnVisibilityBehavior;
}
//# sourceMappingURL=types.d.ts.map
import type { ColumnVisibilityBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
/**
 * Default column visibility behavior
 * Stores state in localStorage as a cache, but DataGrid.state.hiddenColumns is the single source of truth
 */
export declare class DefaultColumnVisibilityBehavior implements ColumnVisibilityBehavior {
    private storageKey;
    constructor(initialColumns: string[], storageKey?: string);
    /**
     * Get visible columns from grid state (single source of truth)
     */
    getVisibleColumns(grid: DataGrid): string[];
    /**
     * Toggle column visibility based on current grid state
     */
    toggleColumn(field: string, grid: DataGrid): void;
    /**
     * Load saved visibility state from localStorage
     * Returns hiddenColumns Set to be merged with URL state
     */
    loadHiddenColumnsFromCache(allColumns: string[]): Set<string>;
    private saveState;
}
//# sourceMappingURL=column-visibility.d.ts.map
import type { ColumnVisibilityBehavior } from '../behaviors/types';
import type { DataGrid } from '../core';
/**
 * Default column visibility behavior
 * Stores state in localStorage
 */
export declare class DefaultColumnVisibilityBehavior implements ColumnVisibilityBehavior {
    private visibleColumns;
    private storageKey;
    constructor(initialColumns: string[], storageKey?: string);
    getVisibleColumns(): string[];
    toggleColumn(field: string, grid: DataGrid): void;
    saveState(state: Record<string, boolean>): void;
    loadState(): Record<string, boolean>;
}
//# sourceMappingURL=column-visibility.d.ts.map
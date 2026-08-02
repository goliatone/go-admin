export declare function reorderColumns(grid: any, newOrder: string[]): void;
/**
 * Reset columns to their initial/default order and visibility.
 * Intended to be called by ColumnManager's "Reset to Default" action.
 */
export declare function resetColumnsToDefault(grid: any): void;
/**
 * Merge and validate saved column order with current columns
 * - Drops columns that no longer exist
 * - Appends new columns that aren't in saved order
 */
export declare function mergeColumnOrder(grid: any, savedOrder: string[]): string[];
/**
 * Reorder table DOM elements (header, filter row, body rows)
 * Moves existing nodes rather than recreating them to preserve event listeners
 */
export declare function reorderTableColumns(grid: any, order: string[]): void;
/**
 * Reorder cells within a single row
 * Preserves fixed columns (selection on left, actions on right)
 */
export declare function reorderRowCells(grid: any, row: Element, order: string[], cellTag: 'th' | 'td'): void;
//# sourceMappingURL=core-columns.d.ts.map
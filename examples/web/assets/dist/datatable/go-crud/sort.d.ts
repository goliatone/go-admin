import type { SortBehavior, SortColumn } from '../behaviors/types';
import type { DataGrid } from '../core';
/**
 * go-crud sort behavior
 * Uses order query parameter with comma-separated values
 */
export declare class GoCrudSortBehavior implements SortBehavior {
    buildQuery(columns: SortColumn[]): Record<string, any>;
    onSort(column: string, direction: 'asc' | 'desc', grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=sort.d.ts.map
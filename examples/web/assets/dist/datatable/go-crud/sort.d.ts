import type { SortBehavior, SortColumn } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
/**
 * go-crud sort behavior
 * Uses order query parameter with comma-separated values
 */
export declare class GoCrudSortBehavior implements SortBehavior {
    buildQuery(columns: SortColumn[]): Record<string, any>;
    onSort(column: string, direction: 'asc' | 'desc', grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=sort.d.ts.map
import type { FilterBehavior, ColumnFilter } from '../behaviors/types';
import type { DataGrid } from '../core';
/**
 * go-crud filter behavior
 * Builds query parameters using go-crud's filter syntax
 */
export declare class GoCrudFilterBehavior implements FilterBehavior {
    buildFilters(filters: ColumnFilter[]): Record<string, any>;
    onFilterChange(column: string, value: any, grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=filter.d.ts.map
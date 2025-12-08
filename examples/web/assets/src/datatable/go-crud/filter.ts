import type { FilterBehavior, ColumnFilter } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * go-crud filter behavior
 * Builds query parameters using go-crud's filter syntax
 */
export class GoCrudFilterBehavior implements FilterBehavior {
  buildFilters(filters: ColumnFilter[]): Record<string, any> {
    const params: Record<string, any> = {};

    filters.forEach(filter => {
      if (filter.value === null || filter.value === undefined || filter.value === '') {
        return;
      }

      const operator = filter.operator || 'eq';

      // For 'eq' operator, use plain field name: ?status=active
      // For others, use field__operator: ?age__gte=30
      const key = operator === 'eq' ? filter.column : `${filter.column}__${operator}`;

      params[key] = filter.value;
    });

    return params;
  }

  async onFilterChange(column: string, value: any, grid: DataGrid): Promise<void> {
    // Reset to first page when filtering changes
    grid.resetPagination();
    await grid.refresh();
  }
}

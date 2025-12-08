import type { FilterBehavior, ColumnFilter } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * go-crud filter behavior
 * Builds query parameters using go-crud's filter syntax
 */
export class GoCrudFilterBehavior implements FilterBehavior {
  buildFilters(filters: ColumnFilter[]): Record<string, any> {
    const params: Record<string, any> = {};

    // Group filters by column and operator to detect OR conditions
    const grouped = new Map<string, any[]>();

    filters.forEach(filter => {
      if (filter.value === null || filter.value === undefined || filter.value === '') {
        return;
      }

      const operator = filter.operator || 'eq';
      const key = operator === 'eq' ? filter.column : `${filter.column}__${operator}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(filter.value);
    });

    // Convert grouped filters to params
    // If multiple values for same field/operator, join with comma (OR logic)
    grouped.forEach((values, key) => {
      if (values.length === 1) {
        params[key] = values[0];
      } else {
        // Multiple values for same field - join with comma for OR logic
        params[key] = values.join(',');
      }
    });

    return params;
  }

  async onFilterChange(column: string, value: any, grid: DataGrid): Promise<void> {
    // Reset to first page when filtering changes
    grid.resetPagination();
    await grid.refresh();
  }
}

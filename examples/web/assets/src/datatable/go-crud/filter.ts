import type { FilterBehavior, ColumnFilter } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * go-crud filter behavior
 * Builds query parameters using go-crud's filter syntax
 */
export class GoCrudFilterBehavior implements FilterBehavior {
  buildFilters(filters: ColumnFilter[]): Record<string, any> {
    const params: Record<string, any> = {};

    // Group filters by column to detect OR conditions
    const grouped = new Map<string, { operator: string; values: any[] }>();

    filters.forEach(filter => {
      if (filter.value === null || filter.value === undefined || filter.value === '') {
        return;
      }

      const operator = filter.operator || 'eq';
      const column = filter.column;

      if (!grouped.has(column)) {
        grouped.set(column, { operator, values: [] });
      }
      grouped.get(column)!.values.push(filter.value);
    });

    // Convert grouped filters to params
    grouped.forEach((data, column) => {
      if (data.values.length === 1) {
        // Single value - use the original operator
        const key = data.operator === 'eq' ? column : `${column}__${data.operator}`;
        params[key] = data.values[0];
      } else {
        // Multiple values for same field - use __in for OR logic (exact match)
        // For pattern matching like ILIKE, join with comma and handle in backend
        if (data.operator === 'ilike') {
          // Use custom OR syntax: field__ilike=val1,val2
          params[`${column}__ilike`] = data.values.join(',');
        } else if (data.operator === 'eq') {
          // Use __in for exact matches with multiple values
          params[`${column}__in`] = data.values.join(',');
        } else {
          // For other operators, join with comma
          params[`${column}__${data.operator}`] = data.values.join(',');
        }
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

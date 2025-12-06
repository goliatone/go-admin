import type { SortBehavior, SortColumn } from '../behaviors/types';
import type { DataGrid } from '../core';

/**
 * go-crud sort behavior
 * Uses order query parameter with comma-separated values
 */
export class GoCrudSortBehavior implements SortBehavior {
  buildQuery(columns: SortColumn[]): Record<string, any> {
    if (!columns || columns.length === 0) {
      return {};
    }

    // Build order parameter: ?order=name asc,created_at desc
    const order = columns
      .map(col => `${col.field} ${col.direction}`)
      .join(',');

    return { order };
  }

  async onSort(column: string, direction: 'asc' | 'desc', grid: DataGrid): Promise<void> {
    await grid.refresh();
  }
}

import type { PaginationBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * go-crud pagination behavior
 * Uses limit/offset query parameters
 */
export class GoCrudPaginationBehavior implements PaginationBehavior {
  buildQuery(page: number, perPage: number): Record<string, any> {
    return {
      limit: perPage,
      offset: (page - 1) * perPage
    };
  }

  async onPageChange(page: number, grid: DataGrid): Promise<void> {
    await grid.refresh();
  }
}

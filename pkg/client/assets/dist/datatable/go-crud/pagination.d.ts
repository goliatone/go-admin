import type { PaginationBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
/**
 * go-crud pagination behavior
 * Uses limit/offset query parameters
 */
export declare class GoCrudPaginationBehavior implements PaginationBehavior {
    buildQuery(page: number, perPage: number): Record<string, any>;
    onPageChange(page: number, grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=pagination.d.ts.map
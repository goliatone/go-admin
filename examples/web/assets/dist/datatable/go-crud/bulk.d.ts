import type { BulkActionBehavior } from '../behaviors/types';
import type { DataGrid } from '../core';
/**
 * go-crud bulk action behavior
 * Uses custom action endpoints for bulk operations
 */
export declare class GoCrudBulkActionBehavior implements BulkActionBehavior {
    private baseEndpoint;
    constructor(baseEndpoint: string);
    getActionEndpoint(action: string): string;
    private getPluralEndpoint;
    execute(action: string, ids: string[], grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=bulk.d.ts.map
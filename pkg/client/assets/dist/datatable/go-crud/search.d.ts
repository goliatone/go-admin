import type { SearchBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
/**
 * go-crud search behavior
 * Builds OR queries across multiple fields using __ilike operator
 */
export declare class GoCrudSearchBehavior implements SearchBehavior {
    private searchableFields;
    constructor(searchableFields: string[]);
    buildQuery(term: string): Record<string, any>;
    onSearch(term: string, grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=search.d.ts.map
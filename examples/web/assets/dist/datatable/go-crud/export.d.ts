import type { ExportBehavior } from '../behaviors/types';
import type { DataGrid } from '../core';
/**
 * go-crud export behavior
 * Uses custom action endpoint for exports
 */
export declare class GoCrudExportBehavior implements ExportBehavior {
    private baseEndpoint;
    private actionSlug;
    constructor(baseEndpoint: string, actionSlug?: string);
    getEndpoint(): string;
    private getPluralEndpoint;
    export(format: 'csv' | 'excel' | 'pdf', grid: DataGrid): Promise<void>;
}
//# sourceMappingURL=export.d.ts.map
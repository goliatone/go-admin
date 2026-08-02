import type { ExportBehavior, ExportConcurrencyMode } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';
type DeliveryMode = 'sync' | 'async' | 'auto';
interface ExportSelection {
    mode: 'all' | 'ids' | 'query';
    ids?: string[];
    query?: {
        name: string;
        params?: Record<string, any>;
    };
}
export interface GoCrudExportConfig {
    endpoint: string;
    definition?: string;
    resource?: string;
    variant?: string;
    sourceVariant?: string;
    delivery?: DeliveryMode;
    /**
     * Formats that should default to async delivery (when delivery is not explicitly set).
     * Defaults to ['pdf'].
     */
    asyncFormats?: ExportFormat[];
    /**
     * Polling interval for async exports (ms).
     */
    statusPollIntervalMs?: number;
    /**
     * Maximum polling duration for async exports (ms). Set to 0 to disable timeout.
     */
    statusPollTimeoutMs?: number;
    selection?: ExportSelection;
    columns?: string[];
    /**
     * Concurrency mode for export operations
     * - 'single': Block all export buttons while any export is in progress (default)
     * - 'per-format': Block only the clicked format's button
     * - 'none': Allow parallel exports (no blocking)
     */
    concurrency?: ExportConcurrencyMode;
}
/**
 * go-export export behavior
 * Uses go-export endpoints with the datagrid request contract
 */
export declare class GoCrudExportBehavior implements ExportBehavior {
    private config;
    constructor(config: GoCrudExportConfig);
    getEndpoint(): string;
    getConcurrency(): ExportConcurrencyMode;
    export(format: ExportFormat, grid: DataGrid): Promise<void>;
}
export {};
//# sourceMappingURL=export.d.ts.map
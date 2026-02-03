import type { RequestEntry, SQLEntry, LogEntry, RouteEntry, CustomLogEntry, CustomSnapshot, DebugSnapshot, PanelOptions } from '../shared/types.js';
export type { RequestEntry, SQLEntry, LogEntry, RouteEntry, CustomLogEntry, CustomSnapshot, DebugSnapshot, PanelOptions, };
/**
 * Main entry point for rendering panels in the toolbar.
 * Delegates to shared panel components with toolbar-specific defaults.
 */
export declare function renderPanel(panel: string, snapshot: DebugSnapshot, slowThresholdMs?: number, options?: PanelOptions & {
    expandedRequestIds?: Set<string>;
}): string;
export declare function getCounts(snapshot: DebugSnapshot, slowThresholdMs?: number): {
    requests: number;
    sql: number;
    logs: number;
    errors: number;
    slowQueries: number;
};
//# sourceMappingURL=panel-renderers.d.ts.map
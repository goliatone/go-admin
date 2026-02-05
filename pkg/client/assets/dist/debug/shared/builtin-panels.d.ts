import { type PanelDefinition } from './panel-registry.js';
import type { RequestEntry, SQLEntry, LogEntry, JSErrorEntry } from './types.js';
/**
 * Requests panel - HTTP request log
 * snapshotKey: "requests" (plural)
 * eventTypes: "request" (singular)
 */
declare const requestsPanel: PanelDefinition;
/**
 * SQL panel - SQL query log
 * snapshotKey: "sql"
 * eventTypes: "sql"
 */
declare const sqlPanel: PanelDefinition;
/**
 * Logs panel - Application logs
 * snapshotKey: "logs" (plural)
 * eventTypes: "log" (singular)
 */
declare const logsPanel: PanelDefinition;
/**
 * Routes panel - Registered application routes
 * snapshotKey: "routes"
 * eventTypes: none (snapshot only)
 */
declare const routesPanel: PanelDefinition;
/**
 * Config panel - Application configuration
 * snapshotKey: "config"
 * eventTypes: none (snapshot only)
 */
declare const configPanel: PanelDefinition;
/**
 * Template panel - Template context data (console only)
 * snapshotKey: "template"
 * eventTypes: "template"
 */
declare const templatePanel: PanelDefinition;
/**
 * Session panel - Session data (console only)
 * snapshotKey: "session"
 * eventTypes: "session"
 */
declare const sessionPanel: PanelDefinition;
/**
 * Custom panel - Custom data and logs
 * snapshotKey: "custom"
 * eventTypes: "custom"
 */
declare const customPanel: PanelDefinition;
/**
 * JS Errors panel - Frontend JavaScript errors
 * snapshotKey: "jserrors"
 * eventTypes: "jserror" (singular)
 */
declare const jserrorsPanel: PanelDefinition;
/**
 * Register all built-in panels with the registry.
 * Safe to call multiple times - will replace existing registrations.
 */
export declare function registerBuiltinPanels(): void;
/**
 * Get count helpers for toolbar summary display.
 * These are specific calculations used by the toolbar FAB.
 */
export declare function getToolbarCounts(snapshot: {
    requests?: RequestEntry[];
    sql?: SQLEntry[];
    logs?: LogEntry[];
    jserrors?: JSErrorEntry[];
}, slowThresholdMs?: number): {
    requests: number;
    sql: number;
    logs: number;
    jserrors: number;
    errors: number;
    slowQueries: number;
};
export { requestsPanel, sqlPanel, logsPanel, jserrorsPanel, routesPanel, configPanel, templatePanel, sessionPanel, customPanel, };
//# sourceMappingURL=builtin-panels.d.ts.map
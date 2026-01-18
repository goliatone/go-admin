import type { StyleConfig } from './styles.js';
import type { PanelOptions, DebugSnapshot } from './types.js';
/**
 * Definition for a debug panel (built-in or custom)
 */
export interface PanelDefinition {
    /** Unique panel identifier */
    id: string;
    /** Display label for tab */
    label: string;
    /** Optional icon class (e.g., 'iconoir-database') */
    icon?: string;
    /**
     * Key in DebugSnapshot for full data payload.
     * Defaults to panel id. Use this to map built-ins like "requests" or "logs".
     */
    snapshotKey?: string;
    /**
     * WebSocket event types to subscribe to.
     * Defaults to snapshotKey or id.
     * Built-ins must set this explicitly (e.g., "request", "log", "sql").
     */
    eventTypes?: string | string[];
    /**
     * Render function for panel content.
     * Receives panel data, style config, and options.
     * Returns HTML string.
     */
    render: (data: unknown, styles: StyleConfig, options: PanelOptions) => string;
    /**
     * Optional per-context render overrides.
     * If omitted, falls back to render().
     */
    renderConsole?: (data: unknown, styles: StyleConfig, options: PanelOptions) => string;
    renderToolbar?: (data: unknown, styles: StyleConfig, options: PanelOptions) => string;
    /**
     * Optional function to get item count for tab badge.
     * If not provided, uses defaultGetCount().
     */
    getCount?: (data: unknown) => number;
    /**
     * Optional function to handle incremental updates.
     * Called when WebSocket events arrive for this panel.
     * If not provided, uses defaultHandleEvent().
     */
    handleEvent?: (currentData: unknown, eventPayload: unknown) => unknown;
    /**
     * Optional filter UI renderer (console only).
     * Returns HTML string for filter controls.
     */
    renderFilters?: (state: unknown) => string;
    /**
     * Optional default filter state (console only).
     */
    defaultFilters?: unknown;
    /**
     * Optional filter application hook (console only).
     * Allows panel data to be filtered before render.
     */
    applyFilters?: (data: unknown, state: unknown) => unknown;
    /**
     * Whether this panel should render in the toolbar.
     * Defaults to true. If false and renderToolbar is undefined, toolbar shows fallback.
     */
    supportsToolbar?: boolean;
    /**
     * Panel category for grouping in UI.
     * Built-in categories: 'core', 'data', 'system'
     */
    category?: string;
    /**
     * Sort order within category (lower = earlier)
     */
    order?: number;
}
/**
 * Get the snapshot key for a panel definition.
 * Falls back to panel id if not specified.
 */
export declare function getSnapshotKey(panel: PanelDefinition): string;
/**
 * Normalize eventTypes to an array.
 * Falls back to snapshotKey or id if not specified.
 */
export declare function normalizeEventTypes(panel: PanelDefinition): string[];
/**
 * Default count calculation for panels.
 * Returns array length for arrays, object key count for objects, 0 otherwise.
 */
export declare function defaultGetCount(data: unknown): number;
/**
 * Default event handler for panels.
 * Arrays: append event payload and cap to maxEntries.
 * Objects: shallow merge by key.
 */
export declare function defaultHandleEvent(currentData: unknown, eventPayload: unknown, maxEntries?: number): unknown;
/**
 * Get panel data from a snapshot.
 */
export declare function getPanelData(snapshot: DebugSnapshot, panel: PanelDefinition): unknown;
/**
 * Get panel count from a snapshot.
 */
export declare function getPanelCount(snapshot: DebugSnapshot, panel: PanelDefinition): number;
/**
 * Render panel content for a given context.
 */
export declare function renderPanelContent(panel: PanelDefinition, data: unknown, styles: StyleConfig, options: PanelOptions, context: 'console' | 'toolbar'): string;
/**
 * Registry change event types
 */
export type RegistryChangeEvent = {
    type: 'register' | 'unregister';
    panelId: string;
    panel?: PanelDefinition;
};
/**
 * Registry change listener
 */
export type RegistryChangeListener = (event: RegistryChangeEvent) => void;
/**
 * Registry for debug panels.
 * Singleton instance shared between console and toolbar.
 */
export declare class PanelRegistry {
    private panels;
    private listeners;
    /**
     * Register a panel definition.
     * If a panel with the same ID exists, it will be replaced.
     */
    register(panel: PanelDefinition): void;
    /**
     * Unregister a panel by ID.
     */
    unregister(id: string): void;
    /**
     * Get a panel definition by ID.
     */
    get(id: string): PanelDefinition | undefined;
    /**
     * Check if a panel is registered.
     */
    has(id: string): boolean;
    /**
     * Get all registered panel definitions.
     */
    list(): PanelDefinition[];
    /**
     * Get all registered panel IDs.
     */
    ids(): string[];
    /**
     * Get panel IDs sorted by category and order.
     */
    getSortedIds(): string[];
    /**
     * Get panels filtered for toolbar display.
     */
    getToolbarPanels(): PanelDefinition[];
    /**
     * Get all event types that need WebSocket subscriptions.
     */
    getAllEventTypes(): string[];
    /**
     * Find panel by event type.
     */
    findByEventType(eventType: string): PanelDefinition | undefined;
    /**
     * Subscribe to registry changes.
     * Returns unsubscribe function.
     */
    subscribe(listener: RegistryChangeListener): () => void;
    /**
     * Subscribe to any registry change (simpler API).
     * Returns unsubscribe function.
     */
    onChange(listener: () => void): () => void;
    private notifyListeners;
}
/**
 * Global panel registry singleton.
 * Use this to register custom panels from external packages.
 *
 * @example
 * ```typescript
 * import { panelRegistry } from 'go-admin/debug';
 *
 * panelRegistry.register({
 *   id: 'cache',
 *   label: 'Cache',
 *   snapshotKey: 'cache',
 *   eventTypes: 'cache',
 *   category: 'data',
 *   order: 50,
 *   render: (data, styles, options) => {
 *     // Return HTML string
 *   },
 * });
 * ```
 */
export declare const panelRegistry: PanelRegistry;
//# sourceMappingURL=panel-registry.d.ts.map
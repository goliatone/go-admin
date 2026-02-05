import type { ColumnVisibilityBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
/**
 * V2 storage format (visibility + order)
 */
interface ColumnPrefsV2 {
    version: 2;
    visibility: Record<string, boolean>;
    order?: string[];
}
/**
 * Default column visibility behavior
 * Stores state in localStorage as a cache, but DataGrid.state.hiddenColumns is the single source of truth
 *
 * Storage schema (V2):
 * {
 *   version: 2,
 *   visibility: { email: true, username: true, ... },
 *   order: ["email", "username", "status", ...]
 * }
 *
 * Migrates automatically from V1 format (Record<string, boolean>)
 */
export declare class DefaultColumnVisibilityBehavior implements ColumnVisibilityBehavior {
    protected storageKey: string;
    private cachedOrder;
    constructor(initialColumns: string[], storageKey?: string);
    /**
     * Get visible columns from grid state (single source of truth)
     */
    getVisibleColumns(grid: DataGrid): string[];
    /**
     * Toggle column visibility based on current grid state
     * Preserves column order when writing visibility updates
     */
    toggleColumn(field: string, grid: DataGrid): void;
    /**
     * Reorder columns and persist to storage
     * Stores both visibility and order in V2 format
     */
    reorderColumns(order: string[], grid: DataGrid): void;
    /**
     * Load column order from cache (localStorage)
     * Validates order against current columns (drops missing, doesn't append new)
     * New columns are appended by DataGrid.mergeColumnOrder()
     */
    loadColumnOrderFromCache(allColumns: string[]): string[];
    /**
     * Load saved visibility state from localStorage
     * Returns hiddenColumns Set to be merged with URL state
     * Handles both V1 and V2 formats (migrates V1 automatically)
     * Filters out stale columns that no longer exist in allColumns
     */
    loadHiddenColumnsFromCache(allColumns: string[]): Set<string>;
    /**
     * Load preferences from localStorage with V1->V2 migration
     */
    protected loadPrefs(): ColumnPrefsV2 | null;
    /**
     * Save V2 preferences to localStorage
     */
    protected savePrefs(prefs: ColumnPrefsV2): void;
    /**
     * Clear saved preferences from localStorage
     * Called when user clicks "Reset to Default"
     */
    clearSavedPrefs(): void;
}
/**
 * Server-synced column visibility behavior configuration
 */
export interface ServerColumnVisibilityConfig {
    /** Resource name for the preference key (e.g., 'users' -> 'ui.datagrid.users.columns') */
    resource: string;
    /** Base path for the preferences API (used when preferencesEndpoint is omitted) */
    basePath?: string;
    /** Base path for preferences API (default: '/api/preferences' unless basePath is provided) */
    preferencesEndpoint?: string;
    /** localStorage key for local cache (default: '<resource>_datatable_columns') */
    localStorageKey?: string;
    /** Debounce delay in ms for server sync (default: 1000) */
    syncDebounce?: number;
}
/**
 * Server-synced column visibility behavior
 *
 * Extends DefaultColumnVisibilityBehavior with server persistence:
 * - On reorder/toggle, saves to localStorage immediately (fast) and syncs to server (durable)
 * - On init, can hydrate from server preferences before DataGrid starts
 *
 * Server preference key format: `ui.datagrid.<resource>.columns`
 * Server payload format: { raw: { "ui.datagrid.<resource>.columns": <V2 prefs> } }
 */
export declare class ServerColumnVisibilityBehavior extends DefaultColumnVisibilityBehavior {
    private resource;
    private preferencesEndpoint;
    private syncDebounce;
    private syncTimeout;
    private serverPrefs;
    constructor(initialColumns: string[], config: ServerColumnVisibilityConfig);
    /**
     * Get the server preference key for this resource
     */
    private get serverPrefsKey();
    /**
     * Toggle column visibility and sync to server
     */
    toggleColumn(field: string, grid: DataGrid): void;
    /**
     * Reorder columns and sync to server
     */
    reorderColumns(order: string[], grid: DataGrid): void;
    /**
     * Load preferences from server
     * Call this before DataGrid.init() to hydrate state from server
     * Returns the V2 prefs if found, null otherwise
     */
    loadFromServer(): Promise<ColumnPrefsV2 | null>;
    /**
     * Get initial column prefs (server takes precedence over localStorage)
     * Call this after loadFromServer() to get the prefs to use
     */
    getInitialPrefs(allColumns: string[]): {
        hiddenColumns: Set<string>;
        columnOrder: string[];
    };
    /**
     * Schedule a debounced sync to server
     */
    private scheduleServerSync;
    /**
     * Sync current preferences to server
     */
    private syncToServer;
    /**
     * Clear saved preferences from both localStorage and server
     * Called when user clicks "Reset to Default"
     */
    clearSavedPrefs(): void;
    /**
     * Clear preferences on server
     */
    private clearServerPrefs;
}
export {};
//# sourceMappingURL=column-visibility.d.ts.map
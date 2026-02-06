import type { ColumnVisibilityBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * Legacy V1 storage format (visibility only)
 */
type ColumnPrefsV1 = Record<string, boolean>;

/**
 * V2 storage format (visibility + order)
 */
interface ColumnPrefsV2 {
  version: 2;
  visibility: Record<string, boolean>;
  order?: string[];
}

function normalizeBasePath(basePath?: string): string {
  const trimmed = (basePath || '').trim();
  if (!trimmed || trimmed === '/') return '';
  return '/' + trimmed.replace(/^\/+|\/+$/g, '');
}

function normalizeApiBasePath(apiBasePath?: string): string {
  const trimmed = (apiBasePath || '').trim();
  if (!trimmed || trimmed === '/') return '';
  return trimmed.replace(/\/+$/, '');
}

/**
 * Type guard to check if prefs are V2 format
 */
function isV2Prefs(data: unknown): data is ColumnPrefsV2 {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    (data as ColumnPrefsV2).version === 2
  );
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
export class DefaultColumnVisibilityBehavior implements ColumnVisibilityBehavior {
  protected storageKey: string;
  private cachedOrder: string[] | null = null;

  constructor(
    initialColumns: string[],
    storageKey: string = 'datatable_columns'
  ) {
    this.storageKey = storageKey;
  }

  /**
   * Get visible columns from grid state (single source of truth)
   */
  getVisibleColumns(grid: DataGrid): string[] {
    return grid.config.columns
      .filter(col => !grid.state.hiddenColumns.has(col.field))
      .map(col => col.field);
  }

  /**
   * Toggle column visibility based on current grid state
   * Preserves column order when writing visibility updates
   */
  toggleColumn(field: string, grid: DataGrid): void {
    // Read current state from grid (single source of truth)
    const currentlyVisible = !grid.state.hiddenColumns.has(field);

    // Compute new visible columns
    const newVisibleColumns = grid.config.columns
      .filter(col => {
        if (col.field === field) {
          return !currentlyVisible; // Toggle the clicked field
        }
        return !grid.state.hiddenColumns.has(col.field); // Keep others as-is
      })
      .map(col => col.field);

    // Build visibility map
    const visibility: Record<string, boolean> = {};
    grid.config.columns.forEach(col => {
      visibility[col.field] = newVisibleColumns.includes(col.field);
    });

    // Save to localStorage preserving existing order
    // Use cached order if available, otherwise use current grid column order
    const currentOrder = this.cachedOrder || grid.state.columnOrder;
    this.savePrefs({
      version: 2,
      visibility,
      order: currentOrder.length > 0 ? currentOrder : undefined
    });

    // Update grid (which will sync checkboxes automatically)
    grid.updateColumnVisibility(newVisibleColumns);
  }

  /**
   * Reorder columns and persist to storage
   * Stores both visibility and order in V2 format
   */
  reorderColumns(order: string[], grid: DataGrid): void {
    // Build visibility map from current grid state
    const visibility: Record<string, boolean> = {};
    grid.config.columns.forEach(col => {
      visibility[col.field] = !grid.state.hiddenColumns.has(col.field);
    });

    // Update cached order
    this.cachedOrder = order;

    // Save V2 prefs with both visibility and order
    this.savePrefs({
      version: 2,
      visibility,
      order
    });

    console.log('[ColumnVisibility] Order saved:', order);
  }

  /**
   * Load column order from cache (localStorage)
   * Validates order against current columns (drops missing, doesn't append new)
   * New columns are appended by DataGrid.mergeColumnOrder()
   */
  loadColumnOrderFromCache(allColumns: string[]): string[] {
    try {
      const prefs = this.loadPrefs();
      if (!prefs || !prefs.order) {
        return [];
      }

      // Validate: keep only columns that exist in allColumns
      const validColumns = new Set(allColumns);
      const validOrder = prefs.order.filter(field => validColumns.has(field));

      // Cache the loaded order for future saves
      this.cachedOrder = validOrder;

      console.log('[ColumnVisibility] Order loaded from cache:', validOrder);
      return validOrder;
    } catch (e) {
      console.warn('Failed to load column order from cache:', e);
      return [];
    }
  }

  /**
   * Load saved visibility state from localStorage
   * Returns hiddenColumns Set to be merged with URL state
   * Handles both V1 and V2 formats (migrates V1 automatically)
   * Filters out stale columns that no longer exist in allColumns
   */
  loadHiddenColumnsFromCache(allColumns: string[]): Set<string> {
    try {
      const prefs = this.loadPrefs();
      if (!prefs) return new Set();

      // Build set of valid columns to filter stale entries
      const validColumns = new Set(allColumns);

      // Return hidden columns (visible=false), filtered against valid columns
      const hidden = new Set<string>();
      Object.entries(prefs.visibility).forEach(([field, visible]) => {
        // Only include if column still exists and is hidden
        if (!visible && validColumns.has(field)) {
          hidden.add(field);
        }
      });

      return hidden;
    } catch (e) {
      console.warn('Failed to load column visibility state:', e);
      return new Set();
    }
  }

  /**
   * Load preferences from localStorage with V1->V2 migration
   */
  protected loadPrefs(): ColumnPrefsV2 | null {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const data = JSON.parse(saved);

      // Check if V2 format
      if (isV2Prefs(data)) {
        return data;
      }

      // Migrate V1 format (Record<string, boolean>) to V2
      const v1Data = data as ColumnPrefsV1;
      const migratedPrefs: ColumnPrefsV2 = {
        version: 2,
        visibility: v1Data
        // order is undefined - will be populated on first reorder
      };

      // Save migrated prefs back to storage
      console.log('[ColumnVisibility] Migrating V1 prefs to V2 format');
      this.savePrefs(migratedPrefs);

      return migratedPrefs;
    } catch (e) {
      console.warn('Failed to load column preferences:', e);
      return null;
    }
  }

  /**
   * Save V2 preferences to localStorage
   */
  protected savePrefs(prefs: ColumnPrefsV2): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save column preferences:', e);
    }
  }

  /**
   * Clear saved preferences from localStorage
   * Called when user clicks "Reset to Default"
   */
  clearSavedPrefs(): void {
    try {
      localStorage.removeItem(this.storageKey);
      this.cachedOrder = null;
      console.log('[ColumnVisibility] Preferences cleared');
    } catch (e) {
      console.warn('Failed to clear column preferences:', e);
    }
  }
}

/**
 * Server-synced column visibility behavior configuration
 */
export interface ServerColumnVisibilityConfig {
  /** Resource name for the preference key (e.g., 'users' -> 'ui.datagrid.users.columns') */
  resource: string;
  /** Base path for the preferences API (used when preferencesEndpoint is omitted) */
  basePath?: string;
  /** Full API base path (preferred when using versioned admin APIs) */
  apiBasePath?: string;
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
export class ServerColumnVisibilityBehavior extends DefaultColumnVisibilityBehavior {
  private resource: string;
  private preferencesEndpoint: string;
  private syncDebounce: number;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private serverPrefs: ColumnPrefsV2 | null = null;

  constructor(initialColumns: string[], config: ServerColumnVisibilityConfig) {
    const localStorageKey = config.localStorageKey || `${config.resource}_datatable_columns`;
    super(initialColumns, localStorageKey);

    this.resource = config.resource;
    const basePath = normalizeBasePath(config.basePath);
    const apiBasePath = normalizeApiBasePath(config.apiBasePath);
    if (config.preferencesEndpoint) {
      this.preferencesEndpoint = config.preferencesEndpoint;
    } else if (apiBasePath) {
      this.preferencesEndpoint = `${apiBasePath}/preferences`;
    } else if (basePath) {
      this.preferencesEndpoint = `${basePath}/api/preferences`;
    } else {
      this.preferencesEndpoint = '/api/preferences';
    }
    this.syncDebounce = config.syncDebounce ?? 1000;
  }

  /**
   * Get the server preference key for this resource
   */
  private get serverPrefsKey(): string {
    return `ui.datagrid.${this.resource}.columns`;
  }

  /**
   * Toggle column visibility and sync to server
   */
  override toggleColumn(field: string, grid: DataGrid): void {
    // Call parent to update localStorage immediately
    super.toggleColumn(field, grid);

    // Schedule server sync
    this.scheduleServerSync(grid);
  }

  /**
   * Reorder columns and sync to server
   */
  override reorderColumns(order: string[], grid: DataGrid): void {
    // Call parent to update localStorage immediately
    super.reorderColumns(order, grid);

    // Schedule server sync
    this.scheduleServerSync(grid);
  }

  /**
   * Load preferences from server
   * Call this before DataGrid.init() to hydrate state from server
   * Returns the V2 prefs if found, null otherwise
   */
  async loadFromServer(): Promise<ColumnPrefsV2 | null> {
    try {
      const response = await fetch(this.preferencesEndpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('[ServerColumnVisibility] Failed to load server prefs:', response.status);
        return null;
      }

      const data = await response.json();

      // Server response format: { records: [{ raw: { "ui.datagrid.users.columns": {...} } }] }
      const records = data.records || [];
      if (records.length === 0) {
        console.log('[ServerColumnVisibility] No server preferences found');
        return null;
      }

      const rawPrefs = records[0]?.raw;
      if (!rawPrefs || !rawPrefs[this.serverPrefsKey]) {
        console.log('[ServerColumnVisibility] No column preferences in server response');
        return null;
      }

      const serverPrefs = rawPrefs[this.serverPrefsKey];

      // Validate it's V2 format
      if (!isV2Prefs(serverPrefs)) {
        console.warn('[ServerColumnVisibility] Server prefs not in V2 format:', serverPrefs);
        return null;
      }

      // Cache server prefs
      this.serverPrefs = serverPrefs;

      // Store as local cache so DataGrid can restore synchronously on init.
      this.savePrefs(serverPrefs);

      console.log('[ServerColumnVisibility] Loaded prefs from server:', serverPrefs);
      return serverPrefs;
    } catch (e) {
      console.warn('[ServerColumnVisibility] Error loading server prefs:', e);
      return null;
    }
  }

  /**
   * Get initial column prefs (server takes precedence over localStorage)
   * Call this after loadFromServer() to get the prefs to use
   */
  getInitialPrefs(allColumns: string[]): { hiddenColumns: Set<string>; columnOrder: string[] } {
    // Use server prefs if available, otherwise fall back to localStorage
    const prefs = this.serverPrefs;

    if (prefs) {
      // Build hidden columns set from server prefs
      const hidden = new Set<string>();
      Object.entries(prefs.visibility).forEach(([field, visible]) => {
        if (!visible) {
          hidden.add(field);
        }
      });

      // Validate order against current columns
      const validColumns = new Set(allColumns);
      const validOrder = (prefs.order || []).filter(field => validColumns.has(field));

      return {
        hiddenColumns: hidden,
        columnOrder: validOrder
      };
    }

    // Fall back to localStorage via parent methods
    return {
      hiddenColumns: this.loadHiddenColumnsFromCache(allColumns),
      columnOrder: this.loadColumnOrderFromCache(allColumns)
    };
  }

  /**
   * Schedule a debounced sync to server
   */
  private scheduleServerSync(grid: DataGrid): void {
    // Clear existing timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    // Schedule new sync
    this.syncTimeout = setTimeout(() => {
      this.syncToServer(grid);
    }, this.syncDebounce);
  }

  /**
   * Sync current preferences to server
   */
  private async syncToServer(grid: DataGrid): Promise<void> {
    // Build V2 prefs from current grid state
    const visibility: Record<string, boolean> = {};
    grid.config.columns.forEach(col => {
      visibility[col.field] = !grid.state.hiddenColumns.has(col.field);
    });

    const prefs: ColumnPrefsV2 = {
      version: 2,
      visibility,
      order: grid.state.columnOrder.length > 0 ? grid.state.columnOrder : undefined
    };

    try {
      const response = await fetch(this.preferencesEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          raw: {
            [this.serverPrefsKey]: prefs
          }
        })
      });

      if (!response.ok) {
        console.warn('[ServerColumnVisibility] Failed to sync to server:', response.status);
        return;
      }

      // Update cached server prefs
      this.serverPrefs = prefs;

      console.log('[ServerColumnVisibility] Synced prefs to server:', prefs);
    } catch (e) {
      console.warn('[ServerColumnVisibility] Error syncing to server:', e);
    }
  }

  /**
   * Clear saved preferences from both localStorage and server
   * Called when user clicks "Reset to Default"
   */
  override clearSavedPrefs(): void {
    // Clear localStorage
    super.clearSavedPrefs();

    // Clear server prefs
    this.serverPrefs = null;

    // Clear server prefs by sending empty/null value
    this.clearServerPrefs();
  }

  /**
   * Clear preferences on server
   */
  private async clearServerPrefs(): Promise<void> {
    try {
      const response = await fetch(this.preferencesEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          raw: {
            [this.serverPrefsKey]: null
          }
        })
      });

      if (!response.ok) {
        console.warn('[ServerColumnVisibility] Failed to clear server prefs:', response.status);
        return;
      }

      console.log('[ServerColumnVisibility] Server prefs cleared');
    } catch (e) {
      console.warn('[ServerColumnVisibility] Error clearing server prefs:', e);
    }
  }
}

// Panel registry for dynamic debug panel registration
// Shared singleton that both console and toolbar consume

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
   * Whether console filter UI should be shown for this panel.
   * Defaults to true.
   */
  showFilters?: boolean;

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
export function getSnapshotKey(panel: PanelDefinition): string {
  return panel.snapshotKey ?? panel.id;
}

/**
 * Normalize eventTypes to an array.
 * Falls back to snapshotKey or id if not specified.
 */
export function normalizeEventTypes(panel: PanelDefinition): string[] {
  if (panel.eventTypes) {
    return Array.isArray(panel.eventTypes) ? panel.eventTypes : [panel.eventTypes];
  }
  return [getSnapshotKey(panel)];
}

/**
 * Default count calculation for panels.
 * Returns array length for arrays, object key count for objects, 0 otherwise.
 */
export function defaultGetCount(data: unknown): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data && typeof data === 'object') {
    return Object.keys(data).length;
  }
  return 0;
}

/**
 * Default event handler for panels.
 * Arrays: append event payload and cap to maxEntries.
 * Objects: shallow merge by key.
 */
export function defaultHandleEvent(
  currentData: unknown,
  eventPayload: unknown,
  maxEntries = 500
): unknown {
  // Array: append and cap
  if (Array.isArray(currentData)) {
    const updated = [...currentData, eventPayload];
    return maxEntries > 0 ? updated.slice(-maxEntries) : updated;
  }

  // Object: shallow merge
  if (currentData && typeof currentData === 'object' && eventPayload && typeof eventPayload === 'object') {
    return { ...currentData, ...eventPayload };
  }

  // Otherwise just return the new payload
  return eventPayload;
}

/**
 * Get panel data from a snapshot.
 */
export function getPanelData(snapshot: DebugSnapshot, panel: PanelDefinition): unknown {
  const key = getSnapshotKey(panel);
  return snapshot[key];
}

/**
 * Get panel count from a snapshot.
 */
export function getPanelCount(snapshot: DebugSnapshot, panel: PanelDefinition): number {
  const data = getPanelData(snapshot, panel);
  if (panel.getCount) {
    return panel.getCount(data);
  }
  return defaultGetCount(data);
}

/**
 * Render panel content for a given context.
 */
export function renderPanelContent(
  panel: PanelDefinition,
  data: unknown,
  styles: StyleConfig,
  options: PanelOptions,
  context: 'console' | 'toolbar'
): string {
  // Use context-specific renderer if available
  if (context === 'console' && panel.renderConsole) {
    return panel.renderConsole(data, styles, options);
  }
  if (context === 'toolbar' && panel.renderToolbar) {
    return panel.renderToolbar(data, styles, options);
  }

  // Check if toolbar is supported
  if (context === 'toolbar' && panel.supportsToolbar === false) {
    return `<div class="${styles.emptyState}">Panel "${panel.label}" not available in toolbar</div>`;
  }

  // Fall back to generic render
  return panel.render(data, styles, options);
}

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
export class PanelRegistry {
  private panels: Map<string, PanelDefinition> = new Map();
  private listeners: Set<RegistryChangeListener> = new Set();

  /**
   * Register a panel definition.
   * If a panel with the same ID exists, it will be replaced.
   */
  register(panel: PanelDefinition): void {
    this.panels.set(panel.id, panel);
    this.notifyListeners({
      type: 'register',
      panelId: panel.id,
      panel,
    });
  }

  /**
   * Unregister a panel by ID.
   */
  unregister(id: string): void {
    const panel = this.panels.get(id);
    if (this.panels.delete(id)) {
      this.notifyListeners({
        type: 'unregister',
        panelId: id,
        panel,
      });
    }
  }

  /**
   * Get a panel definition by ID.
   */
  get(id: string): PanelDefinition | undefined {
    return this.panels.get(id);
  }

  /**
   * Check if a panel is registered.
   */
  has(id: string): boolean {
    return this.panels.has(id);
  }

  /**
   * Get all registered panel definitions.
   */
  list(): PanelDefinition[] {
    return Array.from(this.panels.values());
  }

  /**
   * Get all registered panel IDs.
   */
  ids(): string[] {
    return Array.from(this.panels.keys());
  }

  /**
   * Get panel IDs sorted by category and order.
   */
  getSortedIds(): string[] {
    return this.list()
      .sort((a, b) => {
        const catA = a.category || 'custom';
        const catB = b.category || 'custom';
        if (catA !== catB) return catA.localeCompare(catB);
        return (a.order || 100) - (b.order || 100);
      })
      .map((p) => p.id);
  }

  /**
   * Get panels filtered for toolbar display.
   */
  getToolbarPanels(): PanelDefinition[] {
    return this.list().filter((p) => p.supportsToolbar !== false);
  }

  /**
   * Get all event types that need WebSocket subscriptions.
   */
  getAllEventTypes(): string[] {
    const types = new Set<string>();
    for (const panel of this.panels.values()) {
      for (const type of normalizeEventTypes(panel)) {
        types.add(type);
      }
    }
    return Array.from(types);
  }

  /**
   * Find panel by event type.
   */
  findByEventType(eventType: string): PanelDefinition | undefined {
    for (const panel of this.panels.values()) {
      const types = normalizeEventTypes(panel);
      if (types.includes(eventType)) {
        return panel;
      }
    }
    return undefined;
  }

  /**
   * Subscribe to registry changes.
   * Returns unsubscribe function.
   */
  subscribe(listener: RegistryChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to any registry change (simpler API).
   * Returns unsubscribe function.
   */
  onChange(listener: () => void): () => void {
    const wrapper: RegistryChangeListener = () => listener();
    return this.subscribe(wrapper);
  }

  private notifyListeners(event: RegistryChangeEvent): void {
    this.listeners.forEach((fn) => fn(event));
  }
}

/**
 * Global panel registry singleton.
 * Uses globalThis to ensure single instance across bundles.
 */
const REGISTRY_KEY = '__go_admin_panel_registry__';

function getOrCreateRegistry(): PanelRegistry {
  const g = globalThis as Record<string, unknown>;
  if (!g[REGISTRY_KEY]) {
    g[REGISTRY_KEY] = new PanelRegistry();
  }
  return g[REGISTRY_KEY] as PanelRegistry;
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
export const panelRegistry = getOrCreateRegistry();

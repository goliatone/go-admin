// Debug compatibility facade for the console panel registry.
// Debug keeps its process-wide singleton for existing console, toolbar and
// external registrations; every other console host owns its own registry.

import { PanelRegistry } from '../../console/registry.js';

export {
  PanelRegistry,
  createPanelRegistry,
  defaultGetCount,
  defaultHandleEvent,
  getPanelCount,
  getPanelData,
  getSnapshotKey,
  normalizeEventTypes,
  renderPanelContent,
  type PanelDefinition,
  type PanelLiveListConfig,
  type RegistryChangeEvent,
  type RegistryChangeListener,
} from '../../console/registry.js';

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
 * Global Debug panel registry singleton.
 * Use this to register custom Debug panels from external packages.
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

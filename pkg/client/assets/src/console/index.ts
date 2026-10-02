// Operator console runtime entry. Auto-mounts every `[data-console-root]`
// that carries a bootstrap and has not opted out with `data-console-manual`.
// Each root gets its own registry, store, preferences and live stream.

import { mountConsoles } from './runtime.js';

const autoMount = (): void => {
  mountConsoles(document);
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  } else {
    autoMount();
  }
}

export {
  ConsoleRuntime,
  disposeConsole,
  getMountedConsole,
  mountConsole,
  mountConsoles,
  readConsoleBootstrap,
  type ConsoleConnectionState,
  type ConsoleRuntimeOptions,
  type ConsoleRuntimeState,
} from './runtime.js';
export {
  ConsoleRecordStore,
  normalizeConsoleIdentity,
  sameConsoleIdentity,
  type ConsoleEventOutcome,
  type ConsoleRecordStoreOptions,
  type ConsoleSnapshotOutcome,
} from './store.js';
export {
  ConsolePreferences,
  consoleIdentityNamespace,
  type ConsoleStorageArea,
  type ConsoleStorageProvider,
  type LegacyPreferenceKey,
} from './preferences.js';
export {
  ConsoleLiveStream,
  resolveLiveURL,
  type ConsoleLiveCommand,
  type ConsoleLiveStatus,
  type ConsoleLiveStreamOptions,
} from './live-stream.js';
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
} from './registry.js';
export {
  fetchServerPanelDefinitions,
  panelDefinitionFromServer,
  registerServerPanelDefinitions,
  type PanelHydrationContext,
  type PanelHydrationOptions,
  type ServerPanelConsoleRenderer,
  type ServerPanelConsoleRendererContext,
} from './schema/hydrate.js';
export {
  isSchemaListRenderer,
  renderSchemaListRow,
  renderSchemaPanelView,
  schemaRowKey,
} from './schema/views.js';
export { renderJSONPanel, renderJSONViewer, type JSONPanelOptions } from './schema/json.js';
export {
  applyPanelActionNavigation,
  applyPanelActionPayload,
  buildPanelActionPayload,
  panelActionHasSensitiveFields,
} from './schema/actions.js';
export { consoleStyleConfig, type StyleConfig } from './style-config.js';
export { escapeHTML, escapeAttribute } from './format.js';
export { PANEL_UI_SCHEMA_VERSION } from './types.js';
export type * from './types.js';

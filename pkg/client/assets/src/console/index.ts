// Operator console runtime entry. Auto-mounts every `[data-console-root]`
// carrying a bootstrap (or a display-only widget payload) unless it opts out
// with `data-console-manual`, including roots inserted later (for example by a
// dashboard refresh). Removed roots are disposed. Each root gets its own
// registry, store, preferences and live stream.

import { disposeConsole, mountConsole } from './runtime.js';
import { autoMountConsoleRoots } from './auto-mount.js';

autoMountConsoleRoots({
  mount: (root) => {
    mountConsole(root);
  },
  dispose: disposeConsole,
});

export {
  ConsoleRuntime,
  disposeConsole,
  getMountedConsole,
  mountConsole,
  mountConsoles,
  readConsoleBootstrap,
  readConsoleWidgetBootstrap,
  type ConsoleConnectionState,
  type ConsoleRuntimeChange,
  type ConsoleRuntimeOptions,
  type ConsoleRuntimeState,
} from './runtime.js';
export {
  ConsoleRecordStore,
  normalizeConsoleIdentity,
  sameConsoleIdentity,
  type ConsoleEventOutcome,
  type ConsoleRecordStoreOptions,
  type ConsoleSequenceMode,
  type ConsoleSnapshotOptions,
  type ConsoleSnapshotOutcome,
} from './store.js';
export {
  ConsolePreferences,
  consoleIdentityNamespace,
  type ConsoleStorageArea,
  type ConsoleStorageProvider,
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

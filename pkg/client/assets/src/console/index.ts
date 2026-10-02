// Operator console runtime entry. Auto-mounts every `[data-console-root]`
// carrying a bootstrap (or a display-only widget payload) unless it opts out
// with `data-console-manual`, including roots inserted later (for example by a
// dashboard refresh). Removed roots are disposed. Each root gets its own
// registry, store, preferences and live stream.

import { disposeConsole, mountConsole, mountConsoles } from './runtime.js';

const ROOT_SELECTOR = '[data-console-root]:not([data-console-manual])';

function consoleRoots(node: Node): HTMLElement[] {
  if (!(node instanceof HTMLElement)) return [];
  const roots = Array.from(node.querySelectorAll<HTMLElement>(ROOT_SELECTOR));
  return node.matches(ROOT_SELECTOR) ? [node, ...roots] : roots;
}

function observeConsoleRoots(): void {
  if (typeof MutationObserver === 'undefined' || !document.body) return;
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.removedNodes.forEach((node) => {
        consoleRoots(node).forEach((root) => {
          if (!root.isConnected) disposeConsole(root);
        });
      });
      record.addedNodes.forEach((node) => {
        consoleRoots(node).forEach((root) => {
          if (root.isConnected) mountConsole(root);
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

const autoMount = (): void => {
  mountConsoles(document);
  observeConsoleRoots();
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
  readConsoleWidgetBootstrap,
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
  type ConsoleSequenceMode,
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

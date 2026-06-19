import { DebugPanel, initDebugPanel } from './debug-panel.js';
import { DebugStream, RemoteDebugStream } from './debug-stream.js';

const autoInit = () => {
  initDebugPanel();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

// Core exports
export { DebugPanel, DebugStream, RemoteDebugStream, initDebugPanel };
export type {
  DebugEvent,
  DebugStreamOptions,
  DebugStreamStatus,
  RemoteDebugStreamOptions,
  RemoteDebugToken,
} from './debug-stream.js';

// Panel registry - for custom panel registration
export {
  panelRegistry,
  type PanelDefinition,
  type PanelRegistry,
  type RegistryChangeEvent,
  type RegistryChangeListener,
  getSnapshotKey,
  normalizeEventTypes,
  defaultGetCount,
  defaultHandleEvent,
  getPanelData,
  getPanelCount,
  renderPanelContent,
} from './shared/panel-registry.js';

// Style infrastructure - for uniform panel styling
export {
  type StyleConfig,
  consoleStyles,
  toolbarStyles,
  getStyleConfig,
} from './shared/styles.js';

// Utilities - for panel rendering
export {
  escapeHTML,
  formatTimestamp,
  formatDuration,
  formatJSON,
  formatNumber,
  truncate,
  countPayload,
  isSlowDuration,
  getStatusClass,
  getLevelClass,
} from './shared/utils.js';

// Interaction helpers - for copy/expand behaviors
export {
  attachCopyListeners,
  attachExpandableRowListeners,
  copyToClipboard,
  DATA_ATTRS,
  INTERACTION_CLASSES,
} from './shared/interactions.js';

export {
  applyCustomEventPayload,
  applyDebugEventToSnapshot,
  buildEventToPanel,
  fetchDebugSnapshot,
  getDefaultPanels,
  getDefaultToolbarPanels,
  getPanelEventTypes,
  getPanelIcon,
  getPanelLabel,
  getToolbarCounts,
  isKnownPanel,
  normalizeReplCommands,
  replPanelIDs,
} from './shared/runtime-helpers.js';

export {
  DEBUG_ICON_REFS,
  getDebugIconRef,
  renderDebugIcon,
  renderDebugIconRef,
  type DebugIconKind,
  type DebugIconRenderOptions,
} from './shared/icons.js';

// Shared panel renderers - for building custom panels
export {
  renderRequestsPanel,
  renderSQLPanel,
  renderSQLRow,
  renderSQLRowsHTML,
  appendSqlRowDOM,
  evictSqlOverflow,
  sqlRowKey,
  SqlLiveView,
  type SqlLiveViewOptions,
  LiveListView,
  appendListRow,
  evictListOverflow,
  hashString,
  type LiveListViewOptions,
  renderLogsPanel,
  renderLogRow,
  logRowKey,
  renderRoutesPanel,
  renderJSONPanel,
  renderJSONViewer,
  renderCustomPanel,
  renderPermissionsPanel,
  renderPermissionsPanelCompact,
  renderDoctorPanel,
  renderDoctorPanelCompact,
  renderSiteRenderCachePanel,
  renderSiteRenderCachePanelCompact,
} from './shared/panels/index.js';

// Types
export type {
  RequestEntry,
  SQLEntry,
  LogEntry,
  RouteEntry,
  CustomLogEntry,
  CustomSnapshot,
  DebugSnapshot,
  PanelOptions,
} from './shared/types.js';

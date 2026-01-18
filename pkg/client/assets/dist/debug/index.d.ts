import { DebugPanel, initDebugPanel } from './debug-panel.js';
import { DebugStream } from './debug-stream.js';
export { DebugPanel, DebugStream, initDebugPanel };
export { panelRegistry, type PanelDefinition, type PanelRegistry, type RegistryChangeEvent, type RegistryChangeListener, getSnapshotKey, normalizeEventTypes, defaultGetCount, defaultHandleEvent, getPanelData, getPanelCount, renderPanelContent, } from './shared/panel-registry.js';
export { type StyleConfig, consoleStyles, toolbarStyles, getStyleConfig, } from './shared/styles.js';
export { escapeHTML, formatTimestamp, formatDuration, formatJSON, formatNumber, truncate, countPayload, isSlowDuration, getStatusClass, getLevelClass, } from './shared/utils.js';
export { attachCopyListeners, attachExpandableRowListeners, copyToClipboard, DATA_ATTRS, INTERACTION_CLASSES, } from './shared/interactions.js';
export { renderRequestsPanel, renderSQLPanel, renderLogsPanel, renderRoutesPanel, renderJSONPanel, renderJSONViewer, renderCustomPanel, } from './shared/panels/index.js';
export type { RequestEntry, SQLEntry, LogEntry, RouteEntry, CustomLogEntry, CustomSnapshot, DebugSnapshot, PanelOptions, } from './shared/types.js';
//# sourceMappingURL=index.d.ts.map
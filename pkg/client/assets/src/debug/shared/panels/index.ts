// Shared panel renderers for debug panels
// Re-exports all panel components for easy importing

export { renderRequestsPanel, renderRequestRow, renderRequestDetail, getRequestKey, requestRowKey, type RequestsPanelOptions } from './requests.js';
export {
  renderSQLPanel,
  renderSQLRow,
  renderSQLRowsHTML,
  appendSqlRowDOM,
  evictSqlOverflow,
  sqlRowKey,
  type SQLPanelOptions,
} from './sql.js';
export { SqlLiveView, type SqlLiveViewOptions } from './sql-live-view.js';
export {
  LiveListView,
  appendListRow,
  evictListOverflow,
  hashString,
  type LiveListViewOptions,
} from './live-list-view.js';
export {
  renderLogsPanel,
  renderLogRow,
  logRowKey,
  logSearchText,
  serializeLogEntry,
  type LogsPanelOptions,
} from './logs.js';
export { renderRoutesPanel, type RoutesPanelOptions } from './routes.js';
export { renderJSONPanel, renderJSONViewer, type JSONPanelOptions } from './json.js';
export {
  renderSchemaPanelView,
  renderSchemaMetrics,
  renderSchemaKeyValue,
  renderSchemaTable,
  renderSchemaTableRow,
  renderSchemaStatusList,
  renderSchemaStatusRow,
  renderSchemaTimeline,
  renderSchemaTimelineRow,
  renderSchemaStack,
  renderSchemaListRow,
  isSchemaListRenderer,
  schemaRowKey,
} from './schema.js';
export { RegistryLiveListManager, type RegistryLiveListHost } from './registry-live-list.js';
export { renderCustomPanel, type CustomPanelOptions } from './custom.js';
export { renderJSErrorsPanel, renderErrorRow, jsErrorRowKey, type JSErrorsPanelOptions } from './jserrors.js';
export { renderPermissionsPanel, renderPermissionsPanelCompact, type PermissionsPanelOptions } from './permissions.js';
export { doctorNavigation, renderDoctorPanel, renderDoctorPanelCompact, type DoctorNavigation, type DoctorPanelOptions } from './doctor.js';
export {
  renderSiteRenderCachePanel,
  renderSiteRenderCachePanelCompact,
  type SiteRenderCachePanelOptions,
  type SiteRenderCacheSnapshot,
} from './site-render-cache.js';

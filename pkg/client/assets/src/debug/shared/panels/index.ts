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
export { renderLogsPanel, renderLogRow, logRowKey, type LogsPanelOptions } from './logs.js';
export { renderRoutesPanel, type RoutesPanelOptions } from './routes.js';
export { renderJSONPanel, renderJSONViewer, type JSONPanelOptions } from './json.js';
export {
  renderSchemaPanelView,
  renderSchemaMetrics,
  renderSchemaKeyValue,
  renderSchemaTable,
  renderSchemaStatusList,
  renderSchemaTimeline,
  renderSchemaStack,
} from './schema.js';
export { renderCustomPanel, type CustomPanelOptions } from './custom.js';
export { renderJSErrorsPanel, renderErrorRow, jsErrorRowKey, type JSErrorsPanelOptions } from './jserrors.js';
export { renderPermissionsPanel, renderPermissionsPanelCompact, type PermissionsPanelOptions } from './permissions.js';
export { renderDoctorPanel, renderDoctorPanelCompact, type DoctorPanelOptions } from './doctor.js';
export {
  renderSiteRenderCachePanel,
  renderSiteRenderCachePanelCompact,
  type SiteRenderCachePanelOptions,
  type SiteRenderCacheSnapshot,
} from './site-render-cache.js';

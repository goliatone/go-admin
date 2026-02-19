// Built-in panel registrations for the debug panel registry
// Registers requests, sql, logs, routes, config, template, session, and custom panels

import { panelRegistry, defaultHandleEvent, type PanelDefinition } from './panel-registry.js';
import type { StyleConfig } from './styles.js';
import type {
  PanelOptions,
  RequestEntry,
  SQLEntry,
  LogEntry,
  RouteEntry,
  CustomSnapshot,
  JSErrorEntry,
  PermissionsSnapshot,
  DoctorReport,
} from './types.js';
import { isSlowDuration } from './utils.js';
import {
  renderRequestsPanel,
  renderSQLPanel,
  renderLogsPanel,
  renderRoutesPanel,
  renderJSONPanel,
  renderCustomPanel,
  renderJSErrorsPanel,
  renderPermissionsPanel,
  renderPermissionsPanelCompact,
  renderDoctorPanel,
} from './panels/index.js';

// ============================================================================
// Built-in Panel Definitions
// ============================================================================

/**
 * Requests panel - HTTP request log
 * snapshotKey: "requests" (plural)
 * eventTypes: "request" (singular)
 */
const requestsPanel: PanelDefinition = {
  id: 'requests',
  label: 'Requests',
  icon: 'iconoir-network',
  snapshotKey: 'requests',
  eventTypes: 'request',
  category: 'core',
  order: 10,

  render: (data, styles, options) => {
    const requests = (data as RequestEntry[]) || [];
    return renderRequestsPanel(requests, styles, {
      ...options,
      showSortToggle: false,
      truncatePath: false,
    });
  },

  renderConsole: (data, styles, options) => {
    const requests = (data as RequestEntry[]) || [];
    return renderRequestsPanel(requests, styles, {
      ...options,
      showSortToggle: false,
      truncatePath: false,
    });
  },

  renderToolbar: (data, styles, options) => {
    const requests = (data as RequestEntry[]) || [];
    return renderRequestsPanel(requests, styles, {
      ...options,
      maxEntries: 50,
      showSortToggle: true,
      truncatePath: true,
      maxPathLength: 50,
    });
  },

  getCount: (data) => ((data as RequestEntry[]) || []).length,

  handleEvent: (current, event) => {
    return defaultHandleEvent(current || [], event, 500);
  },

  supportsToolbar: true,
};

/**
 * SQL panel - SQL query log
 * snapshotKey: "sql"
 * eventTypes: "sql"
 */
const sqlPanel: PanelDefinition = {
  id: 'sql',
  label: 'SQL',
  icon: 'iconoir-database',
  snapshotKey: 'sql',
  eventTypes: 'sql',
  category: 'core',
  order: 20,

  render: (data, styles, options) => {
    const queries = (data as SQLEntry[]) || [];
    return renderSQLPanel(queries, styles, {
      ...options,
      showSortToggle: false,
      useIconCopyButton: true,
    });
  },

  renderConsole: (data, styles, options) => {
    const queries = (data as SQLEntry[]) || [];
    return renderSQLPanel(queries, styles, {
      ...options,
      maxEntries: 200,
      showSortToggle: false,
      useIconCopyButton: true,
    });
  },

  renderToolbar: (data, styles, options) => {
    const queries = (data as SQLEntry[]) || [];
    return renderSQLPanel(queries, styles, {
      ...options,
      maxEntries: 50,
      showSortToggle: true,
      useIconCopyButton: false,
    });
  },

  getCount: (data) => ((data as SQLEntry[]) || []).length,

  handleEvent: (current, event) => {
    return defaultHandleEvent(current || [], event, 500);
  },

  supportsToolbar: true,
};

/**
 * Logs panel - Application logs
 * snapshotKey: "logs" (plural)
 * eventTypes: "log" (singular)
 */
const logsPanel: PanelDefinition = {
  id: 'logs',
  label: 'Logs',
  icon: 'iconoir-page',
  snapshotKey: 'logs',
  eventTypes: 'log',
  category: 'core',
  order: 30,

  render: (data, styles, options) => {
    const logs = (data as LogEntry[]) || [];
    return renderLogsPanel(logs, styles, {
      ...options,
      showSortToggle: false,
      showSource: true,
      truncateMessage: false,
    });
  },

  renderConsole: (data, styles, options) => {
    const logs = (data as LogEntry[]) || [];
    return renderLogsPanel(logs, styles, {
      ...options,
      maxEntries: 500,
      showSortToggle: false,
      showSource: true,
      truncateMessage: false,
    });
  },

  renderToolbar: (data, styles, options) => {
    const logs = (data as LogEntry[]) || [];
    return renderLogsPanel(logs, styles, {
      newestFirst: true,
      maxEntries: 100,
      showSortToggle: false,
      showSource: false,
      truncateMessage: true,
      maxMessageLength: 100,
    });
  },

  getCount: (data) => ((data as LogEntry[]) || []).length,

  handleEvent: (current, event) => {
    return defaultHandleEvent(current || [], event, 1000);
  },

  supportsToolbar: true,
};

/**
 * Routes panel - Registered application routes
 * snapshotKey: "routes"
 * eventTypes: none (snapshot only)
 */
const routesPanel: PanelDefinition = {
  id: 'routes',
  label: 'Routes',
  icon: 'iconoir-path-arrow',
  snapshotKey: 'routes',
  eventTypes: [], // Snapshot only, no incremental events
  category: 'system',
  order: 40,

  render: (data, styles) => {
    const routes = (data as RouteEntry[]) || [];
    return renderRoutesPanel(routes, styles, {
      showName: true,
    });
  },

  renderConsole: (data, styles) => {
    const routes = (data as RouteEntry[]) || [];
    return renderRoutesPanel(routes, styles, {
      showName: true,
    });
  },

  renderToolbar: (data, styles) => {
    const routes = (data as RouteEntry[]) || [];
    return renderRoutesPanel(routes, styles, {
      showName: false,
    });
  },

  getCount: (data) => ((data as RouteEntry[]) || []).length,

  // No handleEvent - snapshot only
  supportsToolbar: true,
};

/**
 * Config panel - Application configuration
 * snapshotKey: "config"
 * eventTypes: none (snapshot only)
 */
const configPanel: PanelDefinition = {
  id: 'config',
  label: 'Config',
  icon: 'iconoir-settings',
  snapshotKey: 'config',
  eventTypes: [], // Snapshot only, no incremental events
  category: 'system',
  order: 50,

  render: (data, styles, options) => {
    return renderJSONPanel('Config', data as Record<string, unknown>, styles, {
      useIconCopyButton: true,
      showCount: true,
    });
  },

  renderConsole: (data, styles, options) => {
    // Console may pass filterFn through options for JSONPath search
    const filterFn = (options as { filterFn?: (d: Record<string, unknown>) => Record<string, unknown> })?.filterFn;
    return renderJSONPanel('Config', data as Record<string, unknown>, styles, {
      useIconCopyButton: true,
      showCount: true,
      filterFn,
    });
  },

  renderToolbar: (data, styles) => {
    return renderJSONPanel('Config', data as Record<string, unknown>, styles, {
      useIconCopyButton: false,
      showCount: false,
    });
  },

  getCount: (data) => {
    if (data && typeof data === 'object') {
      return Object.keys(data as object).length;
    }
    return 0;
  },

  // No handleEvent - snapshot only
  supportsToolbar: true,
};

/**
 * Template panel - Template context data (console only)
 * snapshotKey: "template"
 * eventTypes: "template"
 */
const templatePanel: PanelDefinition = {
  id: 'template',
  label: 'Template',
  icon: 'iconoir-code',
  snapshotKey: 'template',
  eventTypes: 'template',
  category: 'data',
  order: 10,

  render: (data, styles, options) => {
    return renderJSONPanel('Template Context', data as Record<string, unknown>, styles, {
      useIconCopyButton: true,
      showCount: true,
    });
  },

  renderConsole: (data, styles, options) => {
    const filterFn = (options as { filterFn?: (d: Record<string, unknown>) => Record<string, unknown> })?.filterFn;
    return renderJSONPanel('Template Context', data as Record<string, unknown>, styles, {
      useIconCopyButton: true,
      showCount: true,
      filterFn,
    });
  },

  renderToolbar: (data, styles) => {
    return renderJSONPanel('Template Context', data as Record<string, unknown>, styles, {
      useIconCopyButton: false,
      showCount: false,
    });
  },

  getCount: (data) => {
    if (data && typeof data === 'object') {
      return Object.keys(data as object).length;
    }
    return 0;
  },

  handleEvent: (current, event) => {
    // Template is typically replaced wholesale
    return event;
  },

  supportsToolbar: true,
};

/**
 * Session panel - Session data (console only)
 * snapshotKey: "session"
 * eventTypes: "session"
 */
const sessionPanel: PanelDefinition = {
  id: 'session',
  label: 'Session',
  icon: 'iconoir-user',
  snapshotKey: 'session',
  eventTypes: 'session',
  category: 'data',
  order: 20,

  render: (data, styles, options) => {
    return renderJSONPanel('Session', data as Record<string, unknown>, styles, {
      useIconCopyButton: true,
      showCount: true,
    });
  },

  renderConsole: (data, styles, options) => {
    const filterFn = (options as { filterFn?: (d: Record<string, unknown>) => Record<string, unknown> })?.filterFn;
    return renderJSONPanel('Session', data as Record<string, unknown>, styles, {
      useIconCopyButton: true,
      showCount: true,
      filterFn,
    });
  },

  renderToolbar: (data, styles) => {
    return renderJSONPanel('Session', data as Record<string, unknown>, styles, {
      useIconCopyButton: false,
      showCount: false,
    });
  },

  getCount: (data) => {
    if (data && typeof data === 'object') {
      return Object.keys(data as object).length;
    }
    return 0;
  },

  handleEvent: (current, event) => {
    // Session is typically replaced wholesale
    return event;
  },

  supportsToolbar: true,
};

/**
 * Custom panel - Custom data and logs
 * snapshotKey: "custom"
 * eventTypes: "custom"
 */
const customPanel: PanelDefinition = {
  id: 'custom',
  label: 'Custom',
  icon: 'iconoir-puzzle',
  snapshotKey: 'custom',
  eventTypes: 'custom',
  category: 'data',
  order: 30,

  render: (data, styles, options) => {
    const custom = (data as CustomSnapshot) || {};
    return renderCustomPanel(custom, styles, {
      useIconCopyButton: true,
      showCount: true,
    });
  },

  renderConsole: (data, styles, options) => {
    const custom = (data as CustomSnapshot) || {};
    const dataFilterFn = (options as { dataFilterFn?: (d: Record<string, unknown>) => Record<string, unknown> })?.dataFilterFn;
    return renderCustomPanel(custom, styles, {
      maxLogEntries: 100,
      useIconCopyButton: true,
      showCount: true,
      dataFilterFn,
    });
  },

  renderToolbar: (data, styles) => {
    const custom = (data as CustomSnapshot) || {};
    return renderCustomPanel(custom, styles, {
      maxLogEntries: 50,
      useIconCopyButton: false,
      showCount: false,
    });
  },

  getCount: (data) => {
    const custom = (data as CustomSnapshot) || {};
    const dataCount = custom.data ? Object.keys(custom.data).length : 0;
    const logsCount = custom.logs?.length || 0;
    return dataCount + logsCount;
  },

  handleEvent: (current, event) => {
    const currentCustom = (current as CustomSnapshot) || { data: {}, logs: [] };
    const eventCustom = event as Partial<CustomSnapshot>;

    // Merge data, append logs
    const newData = eventCustom.data
      ? { ...currentCustom.data, ...eventCustom.data }
      : currentCustom.data;

    const newLogs = eventCustom.logs
      ? [...(currentCustom.logs || []), ...eventCustom.logs].slice(-500)
      : currentCustom.logs;

    return { data: newData, logs: newLogs };
  },

  supportsToolbar: true,
};

/**
 * JS Errors panel - Frontend JavaScript errors
 * snapshotKey: "jserrors"
 * eventTypes: "jserror" (singular)
 */
const jserrorsPanel: PanelDefinition = {
  id: 'jserrors',
  label: 'JS Errors',
  icon: 'iconoir-warning-triangle',
  snapshotKey: 'jserrors',
  eventTypes: 'jserror',
  category: 'core',
  order: 35,

  render: (data, styles, options) => {
    const errors = (data as JSErrorEntry[]) || [];
    return renderJSErrorsPanel(errors, styles, {
      ...options,
      compact: false,
      showSortToggle: false,
    });
  },

  renderConsole: (data, styles, options) => {
    const errors = (data as JSErrorEntry[]) || [];
    return renderJSErrorsPanel(errors, styles, {
      ...options,
      maxEntries: 500,
      compact: false,
      showSortToggle: false,
    });
  },

  renderToolbar: (data, styles, options) => {
    const errors = (data as JSErrorEntry[]) || [];
    return renderJSErrorsPanel(errors, styles, {
      ...options,
      maxEntries: 50,
      compact: true,
      showSortToggle: true,
    });
  },

  getCount: (data) => ((data as JSErrorEntry[]) || []).length,

  handleEvent: (current, event) => {
    return defaultHandleEvent(current || [], event, 500);
  },

  supportsToolbar: true,
};

/**
 * Permissions panel - Permission diagnostics
 * snapshotKey: "permissions"
 * eventTypes: none (snapshot only)
 */
const permissionsPanel: PanelDefinition = {
  id: 'permissions',
  label: 'Permissions',
  icon: 'iconoir-shield-check',
  snapshotKey: 'permissions',
  eventTypes: [], // Snapshot only, no incremental events
  category: 'system',
  order: 45,
  showFilters: false,

  render: (data, styles, options) => {
    const permissions = data as PermissionsSnapshot;
    return renderPermissionsPanel(permissions, styles, {
      showRawJSON: true,
    });
  },

  renderConsole: (data, styles, options) => {
    const permissions = data as PermissionsSnapshot;
    return renderPermissionsPanel(permissions, styles, {
      showRawJSON: true,
    });
  },

  renderToolbar: (data, styles, options) => {
    const permissions = data as PermissionsSnapshot;
    return renderPermissionsPanelCompact(permissions, styles);
  },

  getCount: (data) => {
    const permissions = data as PermissionsSnapshot;
    if (!permissions || !permissions.summary) return 0;
    return permissions.summary.missing_keys;
  },

  // No handleEvent - snapshot only
  supportsToolbar: true,
};

/**
 * Doctor panel - App diagnostics checks
 * snapshotKey: "doctor"
 * eventTypes: none (snapshot only)
 */
const doctorPanel: PanelDefinition = {
  id: 'doctor',
  label: 'Doctor',
  icon: 'iconoir-heartbeat',
  snapshotKey: 'doctor',
  eventTypes: [],
  category: 'system',
  order: 46,
  showFilters: false,

  render: (data, styles, options) => {
    const report = data as DoctorReport;
    return renderDoctorPanel(report, styles, {
      showRawJSON: true,
    });
  },

  renderConsole: (data, styles, options) => {
    const report = data as DoctorReport;
    return renderDoctorPanel(report, styles, {
      showRawJSON: true,
    });
  },

  getCount: (data) => {
    const report = data as DoctorReport;
    if (!report || !report.summary) return 0;
    return (report.summary.error || 0) + (report.summary.warn || 0);
  },

  supportsToolbar: false,
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all built-in panels with the registry.
 * Safe to call multiple times - will replace existing registrations.
 */
export function registerBuiltinPanels(): void {
  panelRegistry.register(requestsPanel);
  panelRegistry.register(sqlPanel);
  panelRegistry.register(logsPanel);
  panelRegistry.register(jserrorsPanel);
  panelRegistry.register(routesPanel);
  panelRegistry.register(permissionsPanel);
  panelRegistry.register(doctorPanel);
  panelRegistry.register(configPanel);
  panelRegistry.register(templatePanel);
  panelRegistry.register(sessionPanel);
  panelRegistry.register(customPanel);
}

/**
 * Get count helpers for toolbar summary display.
 * These are specific calculations used by the toolbar FAB.
 */
export function getToolbarCounts(
  snapshot: {
    requests?: RequestEntry[];
    sql?: SQLEntry[];
    logs?: LogEntry[];
    jserrors?: JSErrorEntry[];
  },
  slowThresholdMs = 50
): {
  requests: number;
  sql: number;
  logs: number;
  jserrors: number;
  errors: number;
  slowQueries: number;
} {
  const requests = snapshot.requests?.length || 0;
  const sql = snapshot.sql?.length || 0;
  const logs = snapshot.logs?.length || 0;
  const jserrors = snapshot.jserrors?.length || 0;

  // Count errors
  const requestErrors = (snapshot.requests || []).filter((r) => (r.status || 0) >= 400).length;
  const sqlErrors = (snapshot.sql || []).filter((q) => q.error).length;
  const logErrors = (snapshot.logs || []).filter((l) => {
    const level = (l.level || '').toLowerCase();
    return level === 'error' || level === 'fatal';
  }).length;

  // Count slow queries
  const slowQueries = (snapshot.sql || []).filter((q) =>
    isSlowDuration(q.duration, slowThresholdMs)
  ).length;

  return {
    requests,
    sql,
    logs,
    jserrors,
    errors: requestErrors + sqlErrors + logErrors + jserrors,
    slowQueries,
  };
}

// Export individual panel definitions for testing or customization
export {
  requestsPanel,
  sqlPanel,
  logsPanel,
  jserrorsPanel,
  routesPanel,
  permissionsPanel,
  doctorPanel,
  configPanel,
  templatePanel,
  sessionPanel,
  customPanel,
};

// Auto-register on module load
registerBuiltinPanels();

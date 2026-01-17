// Panel renderers for the debug toolbar
// Thin wrapper around shared panel components with toolbar-specific defaults

import type {
  RequestEntry,
  SQLEntry,
  LogEntry,
  RouteEntry,
  CustomLogEntry,
  CustomSnapshot,
  DebugSnapshot,
  PanelOptions,
} from '../shared/types.js';
import { escapeHTML, isSlowDuration } from '../shared/utils.js';
import { toolbarStyles } from '../shared/styles.js';
import {
  renderRequestsPanel,
  renderSQLPanel,
  renderLogsPanel,
  renderRoutesPanel,
  renderJSONPanel,
  renderCustomPanel,
} from '../shared/panels/index.js';

// Re-export types for consumers that import from this file
export type {
  RequestEntry,
  SQLEntry,
  LogEntry,
  RouteEntry,
  CustomLogEntry,
  CustomSnapshot,
  DebugSnapshot,
  PanelOptions,
};

// Use toolbar styles
const styles = toolbarStyles;

/**
 * Main entry point for rendering panels in the toolbar.
 * Delegates to shared panel components with toolbar-specific defaults.
 */
export function renderPanel(
  panel: string,
  snapshot: DebugSnapshot,
  slowThresholdMs = 50,
  options?: PanelOptions
): string {
  const newestFirst = options?.newestFirst ?? true;
  const threshold = options?.slowThresholdMs ?? slowThresholdMs;

  switch (panel) {
    case 'requests':
      return renderRequestsPanel(snapshot.requests || [], styles, {
        newestFirst,
        slowThresholdMs: threshold,
        maxEntries: 50,
        showSortToggle: true,
        truncatePath: true,
        maxPathLength: 50,
      });
    case 'sql':
      return renderSQLPanel(snapshot.sql || [], styles, {
        newestFirst,
        slowThresholdMs: threshold,
        maxEntries: 50,
        showSortToggle: true,
        useIconCopyButton: false, // Toolbar uses SVG icons
      });
    case 'logs':
      return renderLogsPanel(snapshot.logs || [], styles, {
        newestFirst: true, // Logs always show newest first in toolbar
        maxEntries: 100,
        showSortToggle: false, // Logs don't have sort toggle in toolbar
        showSource: false, // Toolbar doesn't show source column
        truncateMessage: true,
        maxMessageLength: 100,
      });
    case 'config':
      return renderJSONPanel('Config', snapshot.config || {}, styles, {
        useIconCopyButton: false,
        showCount: false,
      });
    case 'routes':
      return renderRoutesPanel(snapshot.routes || [], styles, {
        showName: false, // Toolbar doesn't show name column
      });
    case 'template':
      return renderJSONPanel('Template Context', snapshot.template || {}, styles, {
        useIconCopyButton: false,
        showCount: false,
      });
    case 'session':
      return renderJSONPanel('Session', snapshot.session || {}, styles, {
        useIconCopyButton: false,
        showCount: false,
      });
    case 'custom':
      return renderCustomPanel(snapshot.custom || {}, styles, {
        maxLogEntries: 50,
        useIconCopyButton: false,
        showCount: false,
      });
    default:
      return `<div class="${styles.emptyState}">Panel "${escapeHTML(panel)}" not available</div>`;
  }
}

// Get counts for summary display
export function getCounts(snapshot: DebugSnapshot): {
  requests: number;
  sql: number;
  logs: number;
  errors: number;
  slowQueries: number;
} {
  const requests = snapshot.requests?.length || 0;
  const sql = snapshot.sql?.length || 0;
  const logs = snapshot.logs?.length || 0;

  // Count errors
  const requestErrors = (snapshot.requests || []).filter((r) => (r.status || 0) >= 400).length;
  const sqlErrors = (snapshot.sql || []).filter((q) => q.error).length;
  const logErrors = (snapshot.logs || []).filter((l) => {
    const level = (l.level || '').toLowerCase();
    return level === 'error' || level === 'fatal';
  }).length;

  // Count slow queries (using default 50ms threshold)
  const slowQueries = (snapshot.sql || []).filter((q) => isSlowDuration(q.duration, 50)).length;

  return {
    requests,
    sql,
    logs,
    errors: requestErrors + sqlErrors + logErrors,
    slowQueries,
  };
}

// Debug Toolbar Entry Point
// Auto-registers the <debug-toolbar> custom element when imported

import './debug-toolbar.js';

// Re-export for programmatic use
export { DebugToolbar } from './debug-toolbar.js';
export { renderPanel, getCounts } from './panel-renderers.js';
export type {
  DebugSnapshot,
  RequestEntry,
  SQLEntry,
  LogEntry,
  RouteEntry,
  CustomSnapshot,
  CustomLogEntry,
} from './panel-renderers.js';

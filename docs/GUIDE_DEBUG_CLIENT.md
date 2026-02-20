# Debug Client Guide

This guide covers the frontend TypeScript architecture of the go-admin debug system, explains how the built-in panels and error collector work, and shows how to add application-level JavaScript that integrates with the debug infrastructure.

## What it provides

- Panel registry for registering and consuming debug panels at runtime
- Shared renderers (tables, JSON viewers, log lists) with consistent styling
- Two rendering contexts: full debug console and inline toolbar
- WebSocket streaming with per-panel subscription management
- Inline JS error collector that captures uncaught exceptions, rejections, and console.error calls
- Utility functions for escaping, formatting, and DOM interactions

## Table of Contents

1. [Architecture](#1-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Entry Points and Imports](#3-entry-points-and-imports)
4. [Panel Registry](#4-panel-registry)
5. [Shared Styles](#5-shared-styles)
6. [Shared Renderers](#6-shared-renderers)
7. [JS Error Collector](#7-js-error-collector)
8. [Adding Application Code](#8-adding-application-code)
9. [Build and Asset Pipeline](#9-build-and-asset-pipeline)
10. [Key Files](#10-key-files)

---

## 1. Architecture

The frontend debug system is split into three independent modules that share a common infrastructure layer:

```
┌──────────────────────────────────────────────────────────────┐
│                      Host Page                               │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Console      │  │  Toolbar     │  │  REPL        │       │
│  │  (Full UI)    │  │  (Inline)    │  │  (Terminal)  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         ▼                 ▼                  ▼               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    Shared Layer                       │    │
│  │  ┌────────────────┐  ┌────────────┐  ┌────────────┐  │    │
│  │  │ Panel Registry │  │   Styles   │  │  Utilities │  │    │
│  │  └────────────────┘  └────────────┘  └────────────┘  │    │
│  │  ┌────────────────────────────────────────────────┐   │    │
│  │  │  Panel Renderers (requests, sql, logs, json,   │   │    │
│  │  │                   routes, custom, jserrors)     │   │    │
│  │  └────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    Types (types.ts)                   │    │
│  │  DebugSnapshot, RequestEntry, SQLEntry, LogEntry,     │    │
│  │  RouteEntry, JSErrorEntry, CustomSnapshot, ...        │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  WebSocket /debug/ws           POST /debug/api/errors
  (snapshot + incremental)      (JS error ingestion)
```

**Console** (`debug/index.ts`) — the full debug dashboard page at `/admin/debug`. Auto-initializes the `<debug-panel>` custom element and WebSocket stream.

**Toolbar** (`debug/toolbar/index.ts`) — an inline floating toolbar injected at the bottom of admin pages. Registers `<debug-toolbar>` and `<debug-fab>` custom elements.

**REPL** (`debug/repl/index.ts`) — interactive shell and app console terminals.

All three consume the **shared layer**: panel registry, styles, utilities, and panel renderers.

---

## 2. Directory Structure

```
pkg/client/assets/src/debug/
├── index.ts                     # Console entry point (auto-init)
├── debug-panel.ts               # <debug-panel> custom element
├── debug-stream.ts              # WebSocket stream handler
├── syntax-highlight.ts          # Syntax highlighting utility
│
├── toolbar/                     # Toolbar sub-module
│   ├── index.ts                 # Toolbar entry point
│   ├── debug-toolbar.ts         # <debug-toolbar> custom element
│   ├── debug-fab.ts             # <debug-fab> floating action button
│   ├── debug-manager.ts         # State manager (connects WS, renders)
│   ├── panel-renderers.ts       # Toolbar panel rendering dispatch
│   ├── fab-styles.ts            # FAB CSS
│   └── toolbar-styles.ts        # Toolbar CSS
│
├── repl/                        # REPL sub-module
│   ├── index.ts                 # REPL entry point
│   ├── repl-panel.ts            # REPL panel component
│   └── repl-terminal.ts         # Terminal emulator
│
└── shared/                      # Common infrastructure
    ├── panel-registry.ts        # Panel registration system
    ├── builtin-panels.ts        # Built-in panel definitions
    ├── styles.ts                # Style configuration
    ├── types.ts                 # Data type definitions
    ├── utils.ts                 # Formatting and utility functions
    ├── interactions.ts          # DOM interaction handlers (copy, expand)
    ├── jsonpath-search.ts       # JSONPath search for config/session panels
    └── panels/                  # Individual panel renderers
        ├── index.ts             # Re-exports all renderers
        ├── requests.ts          # HTTP requests panel
        ├── sql.ts               # SQL queries panel
        ├── logs.ts              # Application logs panel
        ├── routes.ts            # Routes panel
        ├── json.ts              # JSON viewer (config, session, template)
        ├── custom.ts            # Custom data panel
        └── jserrors.ts          # JavaScript errors panel
```

---

## 3. Entry Points and Imports

### Console (full debug page)

```typescript
import {
  panelRegistry,
  type PanelDefinition,
  escapeHTML,
  formatTimestamp,
  consoleStyles,
} from '{base_path}/assets/dist/debug/index.js';
```

The console entry point auto-initializes `<debug-panel>` on `DOMContentLoaded`. It re-exports the full shared API: panel registry, styles, utilities, interactions, and built-in renderers.

### Toolbar (inline on admin pages)

```typescript
import {
  initDebugManager,
  renderPanel,
  getCounts,
} from '{base_path}/assets/dist/debug/toolbar.js';
```

The toolbar entry point registers `<debug-toolbar>` and `<debug-fab>` as custom elements on import. Call `initDebugManager()` to connect the WebSocket and start rendering panels.

### Direct shared imports

If you only need specific utilities without the full console or toolbar, import from the shared modules:

```typescript
import { panelRegistry } from '{base_path}/assets/dist/debug/shared/panel-registry.js';
import { toolbarStyles } from '{base_path}/assets/dist/debug/shared/styles.js';
import { renderJSONPanel } from '{base_path}/assets/dist/debug/shared/panels/index.js';
```

---

## 4. Panel Registry

The panel registry is a singleton that manages all debug panel definitions. Built-in panels (requests, sql, logs, jserrors, routes, config, template, session, custom) are auto-registered on module load via `builtin-panels.ts`.

### Registering a custom panel

```typescript
import { panelRegistry, type PanelDefinition } from 'go-admin/debug';

const myPanel: PanelDefinition = {
  id: 'cache',
  label: 'Cache',
  icon: 'iconoir-database',
  snapshotKey: 'cache',
  eventTypes: 'cache',
  category: 'data',
  order: 50,

  render: (data, styles, options) => {
    const entries = (data as CacheEntry[]) || [];
    if (!entries.length) {
      return `<div class="${styles.emptyState}">No cache entries</div>`;
    }
    return `<table class="${styles.table}">...</table>`;
  },

  getCount: (data) => ((data as CacheEntry[]) || []).length,

  handleEvent: (current, event) => {
    const entries = (current as CacheEntry[]) || [];
    return [...entries, event].slice(-100);
  },

  supportsToolbar: true,
};

panelRegistry.register(myPanel);
```

### PanelDefinition properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | yes | Unique panel identifier |
| `label` | `string` | yes | Display label for tab/header |
| `icon` | `string` | no | CSS icon class (e.g. `iconoir-database`) |
| `snapshotKey` | `string` | no | Key in `DebugSnapshot` (defaults to `id`) |
| `eventTypes` | `string \| string[]` | no | WebSocket event types to subscribe to |
| `category` | `string` | no | Grouping: `core`, `data`, `system` |
| `order` | `number` | no | Sort order within category |
| `render` | `function` | yes | Default renderer returning HTML |
| `renderConsole` | `function` | no | Console-specific renderer |
| `renderToolbar` | `function` | no | Toolbar-specific renderer |
| `getCount` | `function` | no | Returns badge count for the tab |
| `handleEvent` | `function` | no | Merges incremental WS events into current data |
| `supportsToolbar` | `boolean` | no | Whether panel renders in toolbar (default `true`) |

### Listening for registry changes

```typescript
const unsubscribe = panelRegistry.subscribe((event) => {
  // event.type: 'register' | 'unregister'
  // event.panelId: string
  // event.panel?: PanelDefinition
});
```

### Registry utility functions

```typescript
import {
  getSnapshotKey,        // Get the snapshot key for a panel definition
  normalizeEventTypes,   // Normalize eventTypes to string[]
  defaultHandleEvent,    // Default array-append event handler
  getPanelData,          // Extract panel data from a snapshot
  getPanelCount,         // Get count for a panel from a snapshot
  renderPanelContent,    // Render with context-aware renderer selection
} from 'go-admin/debug';
```

---

## 5. Shared Styles

The style system provides two `StyleConfig` objects with CSS class names for consistent panel rendering:

- `consoleStyles` — full debug console (BEM naming, `debug-` prefix)
- `toolbarStyles` — compact toolbar (simpler names, Shadow DOM context)

### Using styles in renderers

```typescript
render: (data, styles, options) => {
  return `
    <table class="${styles.table}">
      <thead>
        <tr><th>Key</th><th>Value</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="${styles.path}">example</td>
          <td class="${styles.timestamp}">value</td>
        </tr>
      </tbody>
    </table>
  `;
}
```

### Key style properties

| Property | Description |
|----------|-------------|
| `table` | Main data table |
| `badge` | Generic badge |
| `badgeMethod(method)` | HTTP method badge class |
| `badgeStatus(status)` | HTTP status badge class |
| `badgeLevel(level)` | Log level / error type badge class |
| `duration` / `durationSlow` | Timing display (normal / slow) |
| `timestamp` | Timestamp cell |
| `path` | URL path cell |
| `message` | Message text cell |
| `emptyState` | "No data" placeholder |
| `rowError` / `rowSlow` | Highlighted rows |
| `expandableRow` / `expansionRow` | Expand/collapse row pairs |
| `expandIcon` | Expand arrow indicator |
| `jsonPanel` / `jsonViewer` | JSON viewer container |
| `copyBtn` / `copyBtnSm` | Copy-to-clipboard buttons |
| `panelControls` / `sortToggle` | Sort/filter controls |

---

## 6. Shared Renderers

Built-in renderers can be reused in custom panels:

```typescript
import {
  renderRequestsPanel,  // HTTP request table
  renderSQLPanel,        // SQL query table with duration highlighting
  renderLogsPanel,       // Log entries with level badges
  renderRoutesPanel,     // Route table with method badges
  renderJSONPanel,       // Collapsible JSON tree viewer
  renderJSONViewer,      // Standalone JSON viewer widget
  renderCustomPanel,     // Custom data + logs display
  renderJSErrorsPanel,   // JS error table with expandable stacks
} from 'go-admin/debug';
```

Each renderer follows the same signature:

```typescript
function renderPanel(
  data: DataType[],
  styles: StyleConfig,
  options?: PanelSpecificOptions
): string
```

### Example: reusing the JSON renderer

```typescript
panelRegistry.register({
  id: 'app-state',
  label: 'App State',
  snapshotKey: 'app_state',
  eventTypes: 'app_state',

  renderConsole: (data, styles) => {
    return renderJSONPanel('Application State', data, styles, {
      useIconCopyButton: true,
      showCount: true,
    });
  },

  renderToolbar: (data, styles) => {
    return renderJSONPanel('App State', data, styles, {
      useIconCopyButton: false,
      showCount: false,
    });
  },
});
```

### Example: reusing the logs renderer

```typescript
panelRegistry.register({
  id: 'audit',
  label: 'Audit Log',
  snapshotKey: 'audit',
  eventTypes: 'audit',

  render: (data, styles) => {
    return renderLogsPanel(data || [], styles, {
      showSource: true,
      truncateMessage: false,
    });
  },

  renderToolbar: (data, styles) => {
    return renderLogsPanel(data || [], styles, {
      newestFirst: true,
      maxEntries: 50,
      showSource: false,
      truncateMessage: true,
      maxMessageLength: 80,
    });
  },
});
```

---

## 7. JS Error Collector

The JS error collector is a synchronous inline script controlled by the
`CaptureJSErrors` config flag, **independent of `ToolbarMode`**. It is injected
via the `partials/jserror-collector.html` template partial into the `<head>` of
**every page** (admin, public site, and login layouts). It runs before any
module scripts and captures errors from three sources:

### Error sources

| Source | Error type | Fields populated |
|--------|-----------|------------------|
| `window.addEventListener('error')` | `uncaught` | message, source, line, column, stack |
| `window.addEventListener('unhandledrejection')` | `unhandled_rejection` | message, stack |
| `console.error` override | `console_error` | message (stringified arguments) |

### How it works

1. **Capture** — errors are pushed to an in-memory queue (max 50 entries).
2. **Batch** — a 2-second debounced timer flushes the queue.
3. **Send** — each entry is posted individually to `{debug_jserror_endpoint}` via
   `navigator.sendBeacon` (with a `Blob` for proper `Content-Type: application/json`),
   falling back to `fetch` with `keepalive: true` and `credentials: 'same-origin'`.
4. **Flush on unload** — `pagehide` triggers an immediate flush for any remaining entries.

### Nonce authentication

The collector uses the **double-submit cookie** pattern to ensure only valid
clients (those that loaded a server-rendered page) can submit error reports:

1. Server generates a random nonce on first page load, sets an `HttpOnly`
   cookie (`__dbg_nonce`) and embeds the same nonce in the inline script.
2. The collector includes `"nonce": "<value>"` in every error report JSON body.
3. The server reads the cookie and compares it to the body nonce — mismatches
   return 403.

The cookie is `HttpOnly`, `Secure`, `SameSite=Strict` with a 24-hour expiry.
Since `sendBeacon` automatically sends same-origin cookies, no extra header
handling is needed.

### console.error recursion guard

The `console.error` override uses a boolean flag (`inOverride`) to prevent
infinite loops. If the reporting code itself calls `console.error` (directly or
indirectly), the guard short-circuits to the original `console.error` without
re-entering the reporter.

### Server-side processing

The `POST {debug_path}/api/errors` endpoint is registered **without**
authentication middleware but validates the double-submit nonce. The handler:

1. Checks `CaptureJSErrors` is enabled (returns 404 if disabled).
2. Parses the JSON payload via `json.Unmarshal(c.Body(), &payload)`.
3. Validates nonce: reads `__dbg_nonce` cookie, compares to body `nonce` field
   (returns 403 if mismatched or missing).
4. Validates that `message` is non-empty (returns 400 otherwise).
5. Masks `message`, `stack`, `url`, and `source` fields via `debugMaskInlineString`.
6. Stores the entry in a ring buffer and publishes a `jserror` WebSocket event.

### Payload format

```json
{
  "type": "uncaught",
  "message": "ReferenceError: foo is not defined",
  "source": "app.js",
  "line": 42,
  "column": 12,
  "stack": "ReferenceError: foo is not defined\n    at app.js:42:12",
  "url": "http://localhost:8080/admin/users",
  "user_agent": "Mozilla/5.0 ...",
  "nonce": "a1b2c3d4e5f6..."
}
```

### Enabling on non-admin pages

For public site or login pages that don't use `CaptureViewContext`, call
`CaptureJSErrorContext` to inject the collector variables:

```go
viewCtx = admin.CaptureJSErrorContext(collector, c, viewCtx)
```

---

## 8. Adding Application Code

### Publishing custom debug data from application JavaScript

If your application JS needs to send debug data to the backend, use the
collector's Custom panel via the existing `Set()` and `Log()` Go API on the
server side, or publish events from application handlers.

For client-initiated data, post to your own endpoint and have the handler call
the collector:

```go
// Server-side handler
func handleAppMetrics(c router.Context) error {
    var payload map[string]any
    json.Unmarshal(c.Body(), &payload)

    if collector := adm.Debug(); collector != nil {
        collector.Set("app.metrics", payload)
    }
    return writeJSON(c, map[string]string{"status": "ok"})
}
```

### Adding a custom panel renderer

To display application-specific data in the debug UI:

1. **Register the panel on the server** (so the backend knows about the snapshot key):

```go
import debug "github.com/goliatone/go-admin/debug"

debug.RegisterPanel("metrics", debug.PanelConfig{
    SnapshotKey: "metrics",
    EventType:   "metrics",
    Label:       "Metrics",
})
```

2. **Register the panel on the client** (for rendering):

```typescript
// metrics-panel.ts
import { panelRegistry, escapeHTML, formatNumber } from 'go-admin/debug';

interface MetricsData {
  goroutines: number;
  memory_alloc: number;
  uptime: string;
}

panelRegistry.register({
  id: 'metrics',
  label: 'Metrics',
  icon: 'iconoir-graph-up',
  snapshotKey: 'metrics',
  eventTypes: 'metrics',
  category: 'system',
  order: 60,

  render: (data, styles) => {
    const m = data as MetricsData;
    if (!m) return `<div class="${styles.emptyState}">No metrics</div>`;

    return `
      <table class="${styles.table}">
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Goroutines</td><td>${formatNumber(m.goroutines)}</td></tr>
          <tr><td>Memory</td><td>${formatNumber(m.memory_alloc)} bytes</td></tr>
          <tr><td>Uptime</td><td>${escapeHTML(m.uptime)}</td></tr>
        </tbody>
      </table>
    `;
  },

  handleEvent: (_current, event) => event,
});
```

3. **Import it** from a `<script type="module">` tag or bundle it with your application.

### Adding a page-level error reporter

The built-in error collector captures global errors. To report errors from
specific application code (e.g. a failed API call), post directly:

```typescript
function reportAppError(error: Error, context: Record<string, unknown> = {}) {
  const debugPath = window.DEBUG_CONFIG?.debugPath;
  if (!debugPath) return;

  const body = JSON.stringify({
    type: 'app_error',
    message: error.message,
    stack: error.stack || '',
    url: location.href,
    user_agent: navigator.userAgent,
    extra: context,
  });

  try {
    navigator.sendBeacon(
      `${debugPath}/api/errors`,
      new Blob([body], { type: 'application/json' })
    );
  } catch {
    // Silently ignore.
  }
}

// Usage
try {
  await fetchAPI('/admin/api/users');
} catch (err) {
  reportAppError(err as Error, { endpoint: '/admin/api/users' });
}
```

### Consuming debug snapshot data

To read the current debug snapshot from application code:

```typescript
async function getDebugSnapshot() {
  const debugPath = window.DEBUG_CONFIG?.debugPath;
  if (!debugPath) return null;

  const res = await fetch(`${debugPath}/api/snapshot`);
  if (!res.ok) return null;
  return res.json();
}
```

### Listening to WebSocket events

For live updates, connect to the WebSocket and filter by event type:

```typescript
const debugPath = window.DEBUG_CONFIG?.debugPath;
const ws = new WebSocket(`ws://${location.host}${debugPath}/ws`);

ws.onopen = () => {
  // Subscribe to specific panels
  ws.send(JSON.stringify({ type: 'subscribe', panels: ['sql', 'jserrors'] }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: "snapshot" | "request" | "sql" | "log" | "jserror" | ...
  // data.payload: panel-specific data
  // data.timestamp: ISO 8601
};
```

---

## 9. Build and Asset Pipeline

The debug TypeScript source lives in `pkg/client/assets/src/debug/` and is
compiled to `pkg/client/assets/dist/debug/`. The built assets are embedded in
the Go binary via `pkg/client/assets.go`.

### Build output

| Source entry point | Output | Used by |
|--------------------|--------|---------|
| `debug/index.ts` | `dist/debug/index.js` | Debug console page |
| `debug/toolbar/index.ts` | `dist/debug/toolbar.js` | Toolbar injection |
| `debug/repl/index.ts` | `dist/debug/repl.js` | REPL panels |

### Adding your own panels to the build

If you want your custom panel to be part of the same bundle:

1. Create your renderer in `shared/panels/your-panel.ts`.
2. Export it from `shared/panels/index.ts`.
3. Register it in `shared/builtin-panels.ts`.
4. Rebuild the assets.

For application-level panels that live outside the go-admin package, import
from the built dist files via `<script type="module">` and register at runtime.
The panel registry accepts registrations at any time — the console and toolbar
will pick up new panels automatically.

---

## 10. Key Files

| File | Description |
|------|-------------|
| `shared/panel-registry.ts` | `PanelRegistry` class, `PanelDefinition` type, utility functions |
| `shared/builtin-panels.ts` | All built-in panel definitions and `registerBuiltinPanels()` |
| `shared/styles.ts` | `StyleConfig` type, `consoleStyles`, `toolbarStyles` |
| `shared/types.ts` | `DebugSnapshot`, `RequestEntry`, `SQLEntry`, `LogEntry`, `JSErrorEntry`, etc. |
| `shared/utils.ts` | `escapeHTML`, `formatTimestamp`, `formatDuration`, `formatJSON`, etc. |
| `shared/interactions.ts` | `attachCopyListeners`, `attachExpandableRowListeners`, `copyToClipboard` |
| `shared/panels/*.ts` | Individual panel renderers (`renderRequestsPanel`, `renderSQLPanel`, etc.) |
| `toolbar/debug-manager.ts` | `DebugManager` class — connects WS, manages state, renders toolbar |
| `toolbar/panel-renderers.ts` | `renderPanel()` dispatch and `getCounts()` for toolbar FAB |
| `debug-panel.ts` | `<debug-panel>` custom element for full console |
| `debug-stream.ts` | `DebugStream` WebSocket client |
| `partials/jserror-collector.html` | Standalone inline collector partial (included in all layouts) |

---

## See Also

- [Debug Module Guide](GUIDE_DEBUG_MODULE.md) — Backend configuration, data capture, security, and API reference
- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) — Template and asset pipeline
- [Module Development Guide](GUIDE_MODULES.md) — General module patterns

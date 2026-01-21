# Debug Module Guide

This guide explains how to enable, configure, and integrate the Debug Module into your go-admin application for development introspection and troubleshooting.

## What it provides

- Real-time SQL query capture and visualization
- HTTP request logging with timing metrics
- Server log streaming via slog integration
- Application configuration inspection
- Registered routes overview
- Template context debugging
- Session data inspection
- Custom debug data injection
- Shell + app REPL panels (disabled by default)
- WebSocket-based live updates
- Toolbar mode for inline debugging
- Sensitive data redaction

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Configuration](#3-configuration)
4. [Enabling the Module](#4-enabling-the-module)
5. [Data Capture Integration](#5-data-capture-integration)
6. [Panel Types](#6-panel-types)
7. [Toolbar Mode](#7-toolbar-mode)
8. [WebSocket Streaming](#8-websocket-streaming)
9. [REPL Panels (Shell + App Console)](#9-repl-panels-shell--app-console)
10. [Custom Panels](#10-custom-panels)
11. [Security Considerations](#11-security-considerations)
12. [API Reference](#12-api-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

The Debug Module provides development-time introspection for go-admin applications. It captures and displays:

- **SQL Queries**: All database queries with timing, arguments, and error information
- **HTTP Requests**: Incoming requests with headers, query parameters, and response status
- **Server Logs**: Application logs captured via slog handler integration
- **Routes**: All registered routes with handlers and middleware
- **Configuration**: Admin configuration snapshot (with sensitive data redacted)
- **Template Context**: View context data passed to templates
- **Session**: Current session information
- **Custom Data**: Application-specific debug data

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Host Application                        │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌──────────────────┐                │
│  │ Request Middleware│  │   Log Handler    │                │
│  └────────┬──────────┘  └────────┬─────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  DebugCollector                      │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Ring Buffers: requests, sql, logs, custom      │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Snapshots: config, routes, template, session   │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  WebSocket Subscribers                          │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   DebugModule                        │   │
│  │  - Dashboard routes                                  │   │
│  │  - WebSocket endpoint                                │   │
│  │  - Toolbar injection                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Description |
|------|-------------|
| `admin/debug_module.go` | Module registration, manifest, and dashboard wiring |
| `admin/debug_config.go` | Configuration struct and normalization |
| `admin/debug_collector.go` | Data aggregation, ring buffers, WebSocket pub/sub |
| `admin/debug_integrations.go` | Middleware, slog handler, route/config snapshots |
| `admin/debug_query_hook.go` | Bun ORM query hook for SQL capture |
| `admin/debug_transport.go` | HTTP routes and WebSocket handlers |
| `admin/ring_buffer.go` | Generic ring buffer implementation |

---

## 2. Quick Start

### Minimal Setup

```go
package main

import (
    "os"

    "github.com/goliatone/go-admin/admin"
    "github.com/goliatone/go-admin/quickstart"
)

func main() {
    // Check if debug mode is enabled
    debugEnabled := os.Getenv("ADMIN_DEBUG") == "true"

    // Configure admin with debug settings
    cfg := admin.Config{
        BasePath: "/admin",
        FeatureFlags: map[string]bool{
            "debug": debugEnabled,
        },
        Debug: admin.DebugConfig{
            Enabled:    debugEnabled,
            CaptureSQL: debugEnabled,
            CaptureLogs: debugEnabled,
        },
    }

    // Create admin instance (quickstart requires adapter hooks + deps option)
    adm, _, _ := quickstart.NewAdmin(cfg, quickstart.AdapterHooks{},
        quickstart.WithAdminDependencies(deps),
    )

    // Register debug module (if enabled)
    if debugEnabled {
        adm.RegisterModule(admin.NewDebugModule(cfg.Debug))
    }

    // Initialize and start
    adm.Initialize(router)
    router.Listen(":8080")
}
```

The debug console is available at `/admin/debug` when enabled.

---

## 3. Configuration

### DebugConfig Structure

```go
type DebugConfig struct {
    // Master enable flag - must be true for module to function
    Enabled bool

    // Enable SQL query capture
    CaptureSQL bool

    // Enable log streaming
    CaptureLogs bool

    // Panic on invalid query hook registrations
    StrictQueryHooks bool

    // Ring buffer sizes
    MaxLogEntries int // Default: 500
    MaxSQLQueries int // Default: 200

    // Field masking rules (field name -> mask type)
    MaskFieldTypes map[string]string

    // Enabled panel IDs
    Panels []string

    // Feature gate key (default: "debug")
    FeatureKey string

    // Permission required to access debug routes
    Permission string // Default: "admin.debug.view"

    // Base path for debug routes (default: "{admin_base}/debug")
    BasePath string

    // Render mode for /admin/debug ("standalone" or "admin")
    LayoutMode DebugLayoutMode

    // Template overrides for debug HTML
    PageTemplate string
    StandaloneTemplate string
    DashboardTemplate string

    // Optional hook to add nav/session/theme to the view context
    ViewContextBuilder DebugViewContextBuilder

    // Highlight queries slower than this threshold
    SlowQueryThreshold time.Duration // Default: 50ms

    // IP whitelist (empty = allow all authenticated users)
    AllowedIPs []string

    // Persist layout preferences
    PersistLayout bool

    // REPL configuration (shell + app console)
    Repl DebugREPLConfig

    // Enable inline toolbar on all admin pages
    ToolbarMode bool

    // Panels shown in toolbar (default: requests, sql, logs, routes, config)
    ToolbarPanels []string

    // Paths where the toolbar should not render
    ToolbarExcludePaths []string
}
```

### DebugLayoutMode

```go
type DebugLayoutMode string

const (
    DebugLayoutStandalone DebugLayoutMode = "standalone"
    DebugLayoutAdmin      DebugLayoutMode = "admin"
)
```

### Default Values

| Setting | Default Value |
|---------|---------------|
| `FeatureKey` | `"debug"` |
| `Permission` | `"admin.debug.view"` |
| `BasePath` | `"{admin_base}/debug"` |
| `LayoutMode` | `"standalone"` |
| `PageTemplate` | `"resources/debug/index"` |
| `StandaloneTemplate` | `"resources/debug/index"` |
| `DashboardTemplate` | `"dashboard_ssr.html"` |
| `MaxLogEntries` | `500` |
| `MaxSQLQueries` | `200` |
| `SlowQueryThreshold` | `50ms` |
| `Panels` | `["template", "session", "requests", "sql", "logs", "config", "routes", "custom"]` |
| `ToolbarPanels` | `["requests", "sql", "logs", "routes", "config"]` |
| `ToolbarExcludePaths` | `["{debug_path}"]` |

### Admin Layout Rendering

Set `LayoutMode` to `"admin"` to render the debug page inside the admin layout
(sidebar, header, theme). The default admin template is
`resources/debug/index_admin`, which embeds the standalone console in an iframe
to avoid CSS conflicts.

```go
cfg.Debug = admin.DebugConfig{
    LayoutMode: admin.DebugLayoutAdmin,
    ViewContextBuilder: func(adm *admin.Admin, _ admin.DebugConfig, c router.Context, view router.ViewContext) router.ViewContext {
        // Inject nav/session/theme for layout.html
        return helpers.WithNav(view, adm, cfg, "debug", c.Context())
    },
}
```

To force the standalone UI while in admin layout mode, append
`?debug_layout=standalone` to the debug URL. This is useful for debugging
styles or embedding the console in a separate window.

### Excluding the Debug Toolbar

When `ToolbarMode` is enabled, the toolbar is injected only if the request path
does not match `ToolbarExcludePaths`. Paths support exact matches (e.g.
`/admin/debug`) and simple prefixes with `*` (e.g. `/admin/debug/*`). The debug
page is excluded by default.

If you have access to `router.Context`, use the request-aware helper:

```go
viewCtx = admin.CaptureViewContextForRequest(adm.Debug(), c, viewCtx)
```

### DebugREPLConfig Structure

```go
type DebugREPLConfig struct {
    Enabled            bool
    ShellEnabled       bool
    AppEnabled         bool
    Permission         string
    ExecPermission     string
    ReadOnly           *bool
    AllowedRoles       []string
    AllowedIPs         []string
    ShellCommand       string
    ShellArgs          []string
    WorkingDir         string
    Environment        []string
    MaxSessionSeconds  int
    AppEvalTimeoutMs   int
    AppAllowedPackages []string
    OverrideStrategy   DebugREPLOverrideStrategy
    MaxSessionsPerUser int
}
```

### DebugREPL Defaults

| Setting | Default Value |
|---------|---------------|
| `Enabled` | `false` |
| `ShellEnabled` | `false` |
| `AppEnabled` | `false` |
| `Permission` | `"admin.debug.repl"` |
| `ExecPermission` | `"admin.debug.repl.exec"` |
| `ReadOnly` | `true` |
| `ShellCommand` | `"/bin/sh"` |
| `MaxSessionSeconds` | `900` |
| `AppEvalTimeoutMs` | `3000` |
| `MaxSessionsPerUser` | `2` |
| `OverrideStrategy` | `DenyAllStrategy{}` |

### Example Configuration

```go
cfg.Debug = admin.DebugConfig{
    Enabled:            true,
    CaptureSQL:         true,
    CaptureLogs:        true,
    StrictQueryHooks:   false,
    MaxLogEntries:      1000,
    MaxSQLQueries:      500,
    SlowQueryThreshold: 100 * time.Millisecond,
    Permission:         "admin.debug.view",
    AllowedIPs:         []string{"127.0.0.1", "::1"},
    ToolbarMode:        true,
    Panels: []string{
        "requests",
        "sql",
        "logs",
        "config",
        "routes",
    },
    MaskFieldTypes: map[string]string{
        "credit_card": "partial",
        "ssn":         "full",
    },
}
```

### Example REPL Configuration

```go
cfg.Debug.Repl = admin.DebugREPLConfig{
    Enabled:      true,
    ShellEnabled: true,
    AppEnabled:   true,
    ReadOnly:     admin.BoolPtr(false),
    AllowedIPs:   []string{"127.0.0.1"},
    OverrideStrategy: admin.DenyAllStrategy{},
}
cfg.Debug.Panels = append(cfg.Debug.Panels, "shell", "console")
```

---

## 4. Enabling the Module

### Prerequisites

1. **Feature Flag**: Set `FeatureFlags["debug"] = true` in admin config
2. **DebugConfig.Enabled**: Set to `true`
3. **Panels**: At least one panel must be enabled

### Registration Methods

#### Method 1: Direct Registration

```go
adm, _ := admin.New(cfg, deps)

// Register debug module before Initialize
if cfg.FeatureFlags["debug"] && cfg.Debug.Enabled {
    adm.RegisterModule(admin.NewDebugModule(cfg.Debug))
}

adm.Initialize(router)
```

#### Method 2: Using Quickstart

```go
import "github.com/goliatone/go-admin/quickstart"

// Quickstart handles dependencies, you still register the module
adm, _, _ := quickstart.NewAdmin(cfg, hooks,
    quickstart.WithAdminDependencies(deps),
)
if cfg.FeatureFlags["debug"] && cfg.Debug.Enabled {
    adm.RegisterModule(admin.NewDebugModule(cfg.Debug))
}
```

#### Method 3: Environment-Driven

```go
debugEnabled := os.Getenv("ADMIN_DEBUG") == "true"

cfg := admin.Config{
    FeatureFlags: map[string]bool{
        "debug": debugEnabled,
    },
    Debug: admin.DebugConfig{
        Enabled:     debugEnabled,
        CaptureSQL:  os.Getenv("ADMIN_DEBUG_SQL") != "false",
        CaptureLogs: os.Getenv("ADMIN_DEBUG_LOGS") != "false",
    },
}
```

### Disabling the Module

The module is disabled when any of these conditions are true:

- `DebugConfig.Enabled = false`
- `FeatureFlags["debug"] = false`
- `Panels` is empty
- Feature gate check fails

When disabled, the module silently no-ops without errors.

Note: if the dashboard feature is enabled and the router supports the go-dashboard
routes, the debug UI uses `/api/dashboard/...` endpoints; otherwise it falls back
to the debug HTML page served at `{debug_path}`.

---

## 5. Data Capture Integration

### Wiring Checklist

The debug module only captures data that is explicitly wired in:

- Attach `DebugRequestMiddleware` to your router.
- Attach `DebugLogHandler` to slog (or your logging pipeline).
- Attach debug query hooks to every `bun.DB` instance.
- Call `CaptureViewContext` when building template contexts.
- Call `CaptureSession` after auth populates context/claims (if you want Session panel data).

Config and route snapshots are captured automatically during admin initialization.

### SQL Query Capture

SQL queries are captured via a Bun query hook. There are two integration patterns:

#### Pattern 1: Using go-repository-bun Options

```go
// Get query hook options from Admin
repoOptions := adm.DebugQueryHookOptions()

// Pass to repository creation
repo := repository.MustNewRepositoryWithOptions[*MyModel](db, handlers, repoOptions...)
```

#### Pattern 2: Direct Hook Attachment

```go
// For databases not using go-repository-bun
if collector := adm.Debug(); collector != nil {
    hook := admin.NewDebugQueryHook(collector)
    db.AddQueryHook(hook)
}
```

#### Pattern 3: Provider-Based (Lazy Resolution)

```go
// Hook resolves collector at runtime
hook := admin.NewDebugQueryHookProvider(adm.Debug)
db.AddQueryHook(hook)
```

**Important**: The hook must be attached to each `bun.DB` instance you want to monitor. See [DEBUG_SQL_BUG.md](../DEBUG_SQL_BUG.md) for details on multi-database scenarios.

### Request Capture

Use the provided middleware to capture HTTP requests:

```go
// Apply middleware to router
router.Use(admin.DebugRequestMiddleware(adm.Debug()))
```

The middleware captures:
- Request method, path, and timing
- Request headers (with sensitive headers redacted)
- Query parameters (with sensitive values redacted)
- Response status code
- Errors (if any)

### Log Capture

Integrate with slog for log streaming:

```go
import "log/slog"

// Create debug log handler
debugHandler := admin.NewDebugLogHandler(
    adm.Debug(),        // Debug collector
    slog.Default().Handler(), // Optional delegate handler
)

// Set as default logger
slog.SetDefault(slog.New(debugHandler))
```

The handler captures:
- Log level, message, and timestamp
- Structured fields (with sensitive fields redacted)
- Source location (file and function)

### Template Context Capture

Capture template data in handlers:

```go
func (h *MyHandler) List(c router.Context) error {
    // Build view context
    viewCtx := router.ViewContext{
        "items": items,
        "total": len(items),
    }

    // Capture for debug panel (also injects toolbar vars if enabled)
    viewCtx = admin.CaptureViewContext(adm.Debug(), viewCtx)

    return c.Render("my-template", viewCtx)
}
```

### Session Capture

Capture session data:

```go
func (h *MyHandler) handleRequest(c router.Context) error {
    session := map[string]any{
        "user_id":    userID,
        "role":       role,
        "last_seen":  time.Now(),
    }

    if collector := adm.Debug(); collector != nil {
        collector.CaptureSession(session)
    }

    // ...
}
```

Important: session capture is manual. To populate the Session panel, call
`CaptureSession` after your auth middleware has attached the actor/claims to the
request context. In the example app, this is done in a debug middleware using
`helpers.BuildSessionUser(...)` and `SessionUser.ToViewContext()`.

### Custom Data

Add application-specific debug data:

```go
collector := adm.Debug()
if collector != nil {
    // Set key-value data (supports nested keys)
    collector.Set("cache.hit_rate", 0.95)
    collector.Set("queue.pending", 42)

    // Log custom debug messages
    collector.Log("payment", "processing order",
        "order_id", orderID,
        "amount", amount,
    )
}
```

---

## 6. Panel Types

### Built-in Panels

| Panel | ID | Description | Capture Method |
|-------|----|-------------|----------------|
| Template | `template` | View context data | `CaptureTemplateData()` |
| Session | `session` | Session information | `CaptureSession()` |
| Requests | `requests` | HTTP request log | `DebugRequestMiddleware` |
| SQL | `sql` | Database queries | `DebugQueryHook` |
| Logs | `logs` | Server log stream | `DebugLogHandler` |
| Config | `config` | App configuration | Auto-captured on init |
| Routes | `routes` | Registered routes | Auto-captured on init |
| Shell | `shell` | Shell REPL (xterm.js) | `DebugConfig.Repl` |
| App Console | `console` | App REPL (yaegi) | `DebugConfig.Repl` |
| Custom | `custom` | Custom debug data | `Set()`, `Log()` |

Note: The `shell` and `console` panels use dedicated WebSocket endpoints and are
disabled until you enable `DebugConfig.Repl` and include the panel IDs in
`DebugConfig.Panels`.

### Enabling/Disabling Panels

```go
cfg.Debug = admin.DebugConfig{
    Enabled: true,
    Panels: []string{
        "requests",
        "sql",
        "logs",
        // Omit "template", "session", etc. to disable
    },
}
```

### Panel Data Structures

**RequestEntry**:
```go
type RequestEntry struct {
    ID        string            `json:"id"`
    Timestamp time.Time         `json:"timestamp"`
    Method    string            `json:"method"`
    Path      string            `json:"path"`
    Status    int               `json:"status"`
    Duration  time.Duration     `json:"duration"`
    Headers   map[string]string `json:"headers,omitempty"`
    Query     map[string]string `json:"query,omitempty"`
    Error     string            `json:"error,omitempty"`
}
```

**SQLEntry**:
```go
type SQLEntry struct {
    ID        string        `json:"id"`
    Timestamp time.Time     `json:"timestamp"`
    Query     string        `json:"query"`
    Args      []any         `json:"args,omitempty"`
    Duration  time.Duration `json:"duration"`
    RowCount  int           `json:"row_count"`
    Error     string        `json:"error,omitempty"`
}
```

**LogEntry**:
```go
type LogEntry struct {
    Timestamp time.Time      `json:"timestamp"`
    Level     string         `json:"level"`
    Message   string         `json:"message"`
    Fields    map[string]any `json:"fields,omitempty"`
    Source    string         `json:"source,omitempty"`
}
```

**RouteEntry**:
```go
type RouteEntry struct {
    Method     string   `json:"method"`
    Path       string   `json:"path"`
    Name       string   `json:"name,omitempty"`
    Handler    string   `json:"handler,omitempty"`
    Middleware []string `json:"middleware,omitempty"`
    Summary    string   `json:"summary,omitempty"`
    Tags       []string `json:"tags,omitempty"`
}
```

---

## 7. Toolbar Mode

Toolbar mode injects a collapsible debug toolbar at the bottom of all admin pages.

### Enabling Toolbar Mode

```go
cfg.Debug = admin.DebugConfig{
    Enabled:     true,
    ToolbarMode: true,
    ToolbarPanels: []string{
        "requests",
        "sql",
        "logs",
    },
}
```

### Template Integration

When `ToolbarMode` is enabled, `CaptureViewContext()` injects these variables:

| Variable | Type | Description |
|----------|------|-------------|
| `debug_toolbar_enabled` | `bool` | `true` when toolbar should show |
| `debug_path` | `string` | Debug module base path |
| `debug_toolbar_panels` | `string` | Comma-separated panel IDs |
| `debug_slow_threshold_ms` | `int64` | Slow query threshold in ms |

### Layout Template Example

```html
{% if debug_toolbar_enabled %}
<script>
  window.DEBUG_CONFIG = {
    basePath: "{{ base_path }}",
    debugPath: "{{ debug_path }}",
    panels: "{{ debug_toolbar_panels }}".split(","),
    slowThresholdMs: {{ debug_slow_threshold_ms }}
  };
</script>
<script type="module">
  import { initDebugManager } from "{{ base_path }}/assets/dist/debug/toolbar.js";
  initDebugManager();
</script>
{% endif %}
```

---

## 8. WebSocket Streaming

The debug module provides real-time updates via WebSocket.
REPL consoles use separate WebSocket routes; see [REPL Panels](#9-repl-panels-shell--app-console).

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8080/admin/debug/ws');

ws.onopen = () => {
  console.log('Debug stream connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleDebugEvent(data);
};
```

### Event Format

```typescript
interface DebugEvent {
  type: "snapshot" | "request" | "sql" | "log" | "template" | "session" | "custom";
  payload: any;
  timestamp: string; // ISO 8601
}
```

### Client Commands

Send commands to control the subscription:

```javascript
// Subscribe to specific panels
ws.send(JSON.stringify({
  type: "subscribe",
  panels: ["sql", "requests"]
}));

// Unsubscribe from panels
ws.send(JSON.stringify({
  type: "unsubscribe",
  panels: ["logs"]
}));

// Request full snapshot
ws.send(JSON.stringify({
  type: "snapshot"
}));

// Clear panel data
ws.send(JSON.stringify({
  type: "clear",
  panels: ["sql"] // Empty = clear all
}));
```

### Server-Side Subscription Management

```go
// Subscribe returns a channel for debug events
func (c *DebugCollector) Subscribe(id string) <-chan DebugEvent

// Unsubscribe closes and removes the channel
func (c *DebugCollector) Unsubscribe(id string)
```

---

## 9. REPL Panels (Shell + App Console)

The REPL panels add interactive consoles to the debug UI. They are **disabled by
default** and must be explicitly enabled in config.

### Endpoints

- Shell: `GET {debug_path}/repl/shell/ws`
- App Console: `GET {debug_path}/repl/app/ws`

### Enablement

```go
cfg.Debug.Repl = admin.DebugREPLConfig{
    Enabled:      true,
    ShellEnabled: true,
    AppEnabled:   true,
    ReadOnly:     admin.BoolPtr(false),
    AllowedIPs:   []string{"127.0.0.1"},
}
cfg.Debug.Panels = append(cfg.Debug.Panels, "shell", "console")
```

### Permissions + Read-Only

- `Permission` gates opening a REPL session (default `admin.debug.repl`).
- `ExecPermission` gates shell input and app console statements (default `admin.debug.repl.exec`).
- `ReadOnly = true` (default) allows only app console expressions; shell access is denied.
- `AllowedRoles` and `AllowedIPs` are enforced (IP list merges debug + REPL allowlists).

### Session Limits

- `MaxSessionSeconds` enforces session TTL (default 900s).
- `MaxSessionsPerUser` caps concurrency (default 2).
- `AppEvalTimeoutMs` limits evaluation time (default 3000ms).

### Production Overrides

Override strategies allow **temporary** access when `Repl.Enabled` is `false`.
The override does **not** bypass permissions, role checks, or IP allowlists.

Supported inputs:

- Key: `X-Admin-REPL-Key` header or `repl_key` query param
- Token: `X-Admin-REPL-Token` header or `repl_token` query param

Static key example:

```go
cfg.Debug.Repl.OverrideStrategy = admin.StaticKeyStrategy{
    Key:       os.Getenv("ADMIN_REPL_KEY"),
    ExpiresAt: time.Now().Add(30 * time.Minute),
}
```

Signed token example:

```go
cfg.Debug.Repl.OverrideStrategy = admin.SignedTokenStrategy{
    Secret:   []byte(os.Getenv("ADMIN_REPL_HMAC")),
    Audience: "admin-repl",
    Issuer:   "my-app",
}
```

Token generation (HMAC):

```go
claims := jwt.RegisteredClaims{
    Audience:  []string{"admin-repl"},
    Issuer:    "my-app",
    ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
}
token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
signed, _ := token.SignedString([]byte(os.Getenv("ADMIN_REPL_HMAC")))
```

## 10. Custom Panels

Register custom panels to display application-specific data. There are two approaches:

1. **Server-side panels** (Go): Register via `DebugPanel` interface for data collection
2. **Client-side panels** (TypeScript): Register via `panelRegistry` for custom UI rendering

### Server-Side: DebugPanel Interface

```go
type DebugPanel interface {
    ID() string                              // Unique panel identifier
    Label() string                           // Display name for UI
    Icon() string                            // Icon identifier
    Collect(ctx context.Context) map[string]any // Gather panel data
}
```

Optional layout metadata:

```go
// If implemented, controls the default widget span when rendered in go-dashboard.
type interface {
    Span() int
}
```

### Server-Side: Panel Registry API (Optional)

Use the registry API when you need explicit `snapshotKey`, custom `eventTypes`,
or a `clear` handler for your panel.

```go
import debug "github.com/goliatone/go-admin/debug"

debug.RegisterPanel("metrics", debug.PanelConfig{
    SnapshotKey: "metrics",
    EventType:   "metrics",
    Label:       "Application Metrics",
    Snapshot: func(ctx context.Context) any {
        return gatherMetrics()
    },
    Clear: func(ctx context.Context) error {
        resetMetrics()
        return nil
    },
})

// Optional: include a schema/version identifier in /api/panels
debug.SetRegistryVersion("v1")
```

The collector-based `RegisterPanel` method remains supported and automatically
registers panel metadata with the registry when used.

### Example: Metrics Panel (Server-Side)

```go
type MetricsPanel struct {
    startTime time.Time
}

func NewMetricsPanel() *MetricsPanel {
    return &MetricsPanel{startTime: time.Now()}
}

func (p *MetricsPanel) ID() string    { return "metrics" }
func (p *MetricsPanel) Label() string { return "Application Metrics" }
func (p *MetricsPanel) Icon() string  { return "chart-line" }

func (p *MetricsPanel) Collect(ctx context.Context) map[string]any {
    var mem runtime.MemStats
    runtime.ReadMemStats(&mem)

    return map[string]any{
        "goroutines":   runtime.NumGoroutine(),
        "memory_alloc": mem.Alloc,
        "memory_sys":   mem.Sys,
        "gc_cycles":    mem.NumGC,
        "uptime":       time.Since(p.startTime).String(),
    }
}
```

### Registration (Server-Side)

```go
// Register after admin creation
collector := adm.Debug()
if collector != nil {
    collector.RegisterPanel(NewMetricsPanel())
}
```

The debug module uses `Label()` and `Icon()` (plus `Span()` when provided) when
registering dashboard providers, so custom panels inherit your metadata.

### Adding Panel to Config

```go
cfg.Debug.Panels = append(cfg.Debug.Panels, "metrics")
```

### Publishing Panel Snapshots

If your module can stream updates (or wants to cache snapshot state), publish
panel data directly through the collector. Payloads are masked and stored before
they are sent to WebSocket subscribers.

```go
collector.PublishPanel("metrics", map[string]any{
    "goroutines": runtime.NumGoroutine(),
    "uptime":     time.Since(startedAt).String(),
})
```

When a snapshot is requested, the latest published payload is returned for the
panel ID. Streaming updates emit events with `type` set to the panel ID, so
clients can subscribe to `"metrics"` alongside the built-in panel event types.

For custom event types, use `collector.PublishEvent("metrics", payload)` (event
types are filtered by registered panels when available).

### Client-Side: Dynamic Panel Registration

The debug console and toolbar support dynamic panel registration from JavaScript/TypeScript.
External packages can register custom panels without modifying the core debug infrastructure.

#### Panel Registry API

```typescript
import {
  panelRegistry,
  type PanelDefinition,
  type StyleConfig,
  escapeHTML,
  formatTimestamp,
} from 'go-admin/debug';

// Register a custom panel
panelRegistry.register({
  id: 'cache',
  label: 'Cache',
  icon: 'iconoir-database',
  snapshotKey: 'cache',      // Key in snapshot payload
  eventTypes: 'cache',        // WebSocket event types to subscribe to
  category: 'data',           // Panel category for ordering
  order: 50,                  // Sort order within category

  // Render function (receives data, styles, options)
  render: (data, styles, options) => {
    const entries = (data as CacheEntry[]) || [];
    if (!entries.length) {
      return `<div class="${styles.emptyState}">No cache entries</div>`;
    }
    // Return HTML string
    return `<table class="${styles.table}">...</table>`;
  },

  // Optional: different rendering for console vs toolbar
  renderConsole: (data, styles, options) => { /* ... */ },
  renderToolbar: (data, styles, options) => { /* ... */ },

  // Optional: custom count for tab badge
  getCount: (data) => ((data as CacheEntry[]) || []).length,

  // Optional: handle incremental WebSocket events
  handleEvent: (currentData, eventPayload) => {
    const entries = (currentData as CacheEntry[]) || [];
    return [...entries, eventPayload].slice(-100);
  },

  // Optional: toolbar support (default: true)
  supportsToolbar: true,
});
```

#### PanelDefinition Interface

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique panel identifier |
| `label` | `string` | Display label for tab |
| `icon` | `string` | Optional icon class |
| `snapshotKey` | `string` | Key in snapshot (defaults to id) |
| `eventTypes` | `string \| string[]` | WebSocket events to subscribe to |
| `category` | `string` | Panel category (`core`, `data`, `system`) |
| `order` | `number` | Sort order within category |
| `render` | `function` | Render function returning HTML |
| `renderConsole` | `function` | Console-specific renderer |
| `renderToolbar` | `function` | Toolbar-specific renderer |
| `getCount` | `function` | Tab badge count |
| `handleEvent` | `function` | Incremental event handler |
| `supportsToolbar` | `boolean` | Whether panel renders in toolbar |

#### Runtime Registration

Panels can be registered at any time, even after the debug UI has mounted:

```typescript
// Register dynamically
panelRegistry.register(myPanelDef);

// The console/toolbar will automatically:
// - Add the new tab
// - Subscribe to WebSocket events
// - Render the panel when selected

// Unregister when no longer needed
panelRegistry.unregister('cache');
```

#### Subscribing to Registry Changes

```typescript
// React to panel registration/unregistration
const unsubscribe = panelRegistry.subscribe((event) => {
  console.log(`Panel ${event.panelId} was ${event.type}d`);
});

// Cleanup
unsubscribe();
```

#### Using Shared Styles

Custom panels receive a `StyleConfig` object for consistent styling:

```typescript
render: (data, styles, options) => {
  return `
    <table class="${styles.table}">
      <thead>
        <tr>
          <th>Key</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(e => `
          <tr>
            <td class="${styles.path}">${escapeHTML(e.key)}</td>
            <td class="${styles.timestamp}">${escapeHTML(e.value)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
```

Available style properties include: `table`, `badge`, `badgeMethod()`, `badgeStatus()`,
`badgeLevel()`, `duration`, `durationSlow`, `timestamp`, `path`, `message`,
`emptyState`, `jsonPanel`, `copyBtn`, and more.

#### Using Shared Renderers

Reuse built-in panel renderers for common patterns:

```typescript
import {
  panelRegistry,
  renderJSONPanel,
  renderLogsPanel,
  consoleStyles,
  toolbarStyles,
} from 'go-admin/debug';

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

#### Full Example: Queue Monitor Panel

```typescript
import {
  panelRegistry,
  escapeHTML,
  formatTimestamp,
  type StyleConfig,
  type PanelOptions,
} from 'go-admin/debug';

interface QueueJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
}

panelRegistry.register({
  id: 'queue',
  label: 'Queue',
  snapshotKey: 'queue',
  eventTypes: 'queue',
  category: 'system',
  order: 60,

  render: (data: unknown, styles: StyleConfig, options: PanelOptions) => {
    const jobs = (data as QueueJob[]) || [];

    if (!jobs.length) {
      return `<div class="${styles.emptyState}">No queued jobs</div>`;
    }

    const rows = jobs.map(job => `
      <tr>
        <td>${escapeHTML(job.id)}</td>
        <td>${escapeHTML(job.name)}</td>
        <td><span class="${styles.badge}">${escapeHTML(job.status)}</span></td>
        <td class="${styles.timestamp}">${formatTimestamp(job.created_at)}</td>
      </tr>
    `).join('');

    return `
      <table class="${styles.table}">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },

  getCount: (data) => ((data as QueueJob[]) || []).length,

  handleEvent: (current, event) => {
    const jobs = (current as QueueJob[]) || [];
    const newJob = event as QueueJob;
    // Update existing or append
    const idx = jobs.findIndex(j => j.id === newJob.id);
    if (idx >= 0) {
      jobs[idx] = newJob;
      return [...jobs];
    }
    return [...jobs, newJob].slice(-100);
  },

  supportsToolbar: true,
});

---

## 11. Security Considerations

### 1. Disabled by Default

The debug module requires explicit opt-in:

```go
cfg.Debug = admin.DebugConfig{
    Enabled: true, // Must be explicitly enabled
}
```

### 2. Authentication Required

All debug routes require authentication via the admin's auth wrapper.

### 3. Permission-Based Access

```go
cfg.Debug = admin.DebugConfig{
    Permission: "admin.debug.view", // Custom permission
}
```

Users must have this permission to access debug routes.

### 4. IP Whitelist

Restrict access to specific IPs:

```go
cfg.Debug = admin.DebugConfig{
    AllowedIPs: []string{
        "127.0.0.1",
        "::1",
        "192.168.1.0/24", // Note: CIDR not supported, exact match only
    },
}
```

### 5. Automatic Data Redaction

Sensitive data is automatically redacted:

**Sensitive Keys** (automatically redacted):
- `password`, `signing_key`, `authorization`, `token`, `access_token`, `refresh_token`
- `api_key`, `apikey`, `client_secret`, `secret`
- `jwt`, `cookie`, `set-cookie`, `csrf`, `session`, `bearer`

**Custom Masking**:

```go
cfg.Debug = admin.DebugConfig{
    MaskFieldTypes: map[string]string{
        "credit_card": "preserveEnds(4,4)", // Show last 4 digits
        "ssn":         "filled",            // Full redaction
        "email":       "preserveEnds(2,2)", // Partial redaction
    },
}
```

### 6. Production Recommendations

- **Never enable in production** without IP restrictions
- Use environment variables to control enablement
- Consider separate debug permissions
- Monitor access logs for debug endpoints

```go
// Production-safe pattern
cfg.Debug = admin.DebugConfig{
    Enabled:    os.Getenv("ENV") == "development",
    AllowedIPs: []string{"127.0.0.1"},
}
```

### 7. REPL Security

- Keep `DebugConfig.Repl.Enabled` false in production; use override strategies for emergencies.
- Leave `ReadOnly` enabled unless you explicitly need mutations.
- Shell access always requires `ExecPermission` and `ReadOnly = false`.
- App console expressions are allowed in read-only mode; statements require `ExecPermission`.
- Prefer strict `AllowedIPs` and `AllowedRoles` for REPL usage.

---

## 12. API Reference

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `{debug_path}` | Debug dashboard page |
| GET | `{debug_path}/api/panels` | Panel metadata registry |
| GET | `{debug_path}/api/snapshot` | Current state snapshot |
| POST | `{debug_path}/api/clear` | Clear all panel data |
| POST | `{debug_path}/api/clear/:panel` | Clear specific panel |
| WS | `{debug_path}/ws` | WebSocket connection |
| WS | `{debug_path}/repl/shell/ws` | Shell REPL WebSocket |
| WS | `{debug_path}/repl/app/ws` | App console REPL WebSocket |

### Snapshot Response

```json
{
  "template": { /* view context data */ },
  "session": { /* session data */ },
  "requests": [
    {
      "id": "uuid",
      "timestamp": "2024-01-15T10:30:00Z",
      "method": "GET",
      "path": "/admin/users",
      "status": 200,
      "duration": 45000000
    }
  ],
  "sql": [
    {
      "id": "uuid",
      "timestamp": "2024-01-15T10:30:00Z",
      "query": "SELECT * FROM users WHERE id = $1",
      "args": ["[REDACTED]"],
      "duration": 2000000,
      "row_count": 1
    }
  ],
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "level": "INFO",
      "message": "User logged in",
      "fields": { "user_id": "123" }
    }
  ],
  "config": { /* admin configuration */ },
  "routes": [
    {
      "method": "GET",
      "path": "/admin/users",
      "handler": "UserHandlers.List"
    }
  ],
  "custom": {
    "data": { /* custom key-value data */ },
    "logs": [ /* custom log entries */ ]
  }
}
```

### Admin Methods

```go
// Get debug collector (nil if disabled)
func (a *Admin) Debug() *DebugCollector

// Get query hook options for repository integration
func (a *Admin) DebugQueryHookOptions() []repository.Option

// Get a Bun query hook for direct DB wiring
func (a *Admin) DebugQueryHook() bun.QueryHook
```

### DebugCollector Methods

```go
// Data Capture
func (c *DebugCollector) CaptureTemplateData(viewCtx router.ViewContext)
func (c *DebugCollector) CaptureSession(session map[string]any)
func (c *DebugCollector) CaptureRequest(entry RequestEntry)
func (c *DebugCollector) CaptureSQL(entry SQLEntry)
func (c *DebugCollector) CaptureLog(entry LogEntry)
func (c *DebugCollector) CaptureConfigSnapshot(snapshot map[string]any)
func (c *DebugCollector) CaptureRoutes(routes []RouteEntry)

// Custom Data
func (c *DebugCollector) Set(key string, value any)
func (c *DebugCollector) Get(key string) (any, bool)
func (c *DebugCollector) Log(category, message string, fields ...any)

// Panel Management
func (c *DebugCollector) RegisterPanel(panel DebugPanel)
func (c *DebugCollector) Snapshot() map[string]any
func (c *DebugCollector) Clear()
func (c *DebugCollector) ClearPanel(panelID string) bool

// WebSocket
func (c *DebugCollector) Subscribe(id string) <-chan DebugEvent
func (c *DebugCollector) Unsubscribe(id string)
```

---

## 13. Troubleshooting

### SQL Queries Not Showing

**Symptom**: SQL panel is empty despite queries being executed.

**Causes**:
1. `CaptureSQL` is `false`
2. `sql` panel not in `Panels` list
3. Query hook not attached to database

**Solution**:
```go
// Ensure config is correct
cfg.Debug.CaptureSQL = true
cfg.Debug.Panels = []string{"sql", ...}

// Ensure hook is attached
repoOptions := adm.DebugQueryHookOptions()
// Pass to ALL repositories/databases
```

See [DEBUG_SQL_BUG.md](../DEBUG_SQL_BUG.md) for detailed analysis of multi-database scenarios.

### Logs Not Appearing

**Symptom**: Logs panel is empty.

**Causes**:
1. `CaptureLogs` is `false`
2. `DebugLogHandler` not configured
3. Logger created before admin initialization

**Solution**:
```go
// After admin initialization
if collector := adm.Debug(); collector != nil {
    handler := admin.NewDebugLogHandler(collector, slog.Default().Handler())
    slog.SetDefault(slog.New(handler))
}
```

### WebSocket Connection Fails

**Symptom**: Cannot connect to debug WebSocket.

**Causes**:
1. Router doesn't support WebSocket
2. Authentication fails on upgrade
3. IP not in whitelist

**Solution**:
```go
// Check router supports WebSocket
ws, ok := router.(debugWebSocketRouter)
if !ok {
    log.Println("Router doesn't support WebSocket")
}

// Check IP whitelist
cfg.Debug.AllowedIPs = []string{} // Empty = allow all authenticated
```

### Module Not Registering

**Symptom**: Debug routes not available.

**Causes**:
1. Feature flag not set
2. `Enabled` is `false`
3. Module registered after `Initialize()`

**Solution**:
```go
// Check feature flag
cfg.FeatureFlags["debug"] = true

// Check enabled
cfg.Debug.Enabled = true

// Register BEFORE Initialize
adm.RegisterModule(admin.NewDebugModule(cfg.Debug))
adm.Initialize(router) // After registration
```

### Debug UI Template Missing

**Symptom**: `/admin/debug` returns `failed to render: template resources/debug/index does not exist`.

**Causes**:
1. The view engine base FS does not include `resources/debug/index.html`
2. Templates are layered via fallbacks, but the template loader only walks the base FS

**Solution**:
```go
// Prefer go-admin templates as the base FS, or copy the template into your base FS.
views, err := quickstart.NewViewEngine(
    client.FS(), // includes templates + assets
    quickstart.WithViewTemplatesFS(customTemplates),
)

// If you keep a custom base FS, copy the template into it:
// templates/resources/debug/index.html
```

### Permission Denied

**Symptom**: 403 Forbidden on debug routes.

**Causes**:
1. User lacks required permission
2. IP not in whitelist
3. Authentication failed

**Solution**:
```go
// Check user has permission
cfg.Debug.Permission = "admin.debug.view"
// Ensure user's JWT includes this permission

// Or disable permission check for development
cfg.Debug.Permission = "" // Not recommended
```

### REPL Panel Missing

**Symptom**: Shell/App Console tabs do not appear.

**Causes**:
1. `DebugConfig.Repl.Enabled` is `false`
2. `ShellEnabled`/`AppEnabled` is `false`
3. `Panels` does not include `shell` and/or `console`

**Solution**:
```go
cfg.Debug.Repl.Enabled = true
cfg.Debug.Repl.AppEnabled = true
cfg.Debug.Repl.ShellEnabled = true
cfg.Debug.Panels = append(cfg.Debug.Panels, "shell", "console")
```

### Shell REPL Forbidden

**Symptom**: Shell REPL connects but immediately closes or returns 403.

**Causes**:
1. `ReadOnly` is enabled (shell requires exec)
2. Missing `ExecPermission`
3. Override strategy rejected (if REPL is disabled)

**Solution**:
```go
cfg.Debug.Repl.ReadOnly = admin.BoolPtr(false)
cfg.Debug.Repl.ExecPermission = "admin.debug.repl.exec"
```

---

## See Also

- [Module Development Guide](GUIDE_MODULES.md) - General module patterns
- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) - Template and theme customization
- [Auth Guide](AUTH.md) - Authentication and authorization patterns
- [DEBUG_SQL_BUG.md](../DEBUG_SQL_BUG.md) - SQL capture troubleshooting

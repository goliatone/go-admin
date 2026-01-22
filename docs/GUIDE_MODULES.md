# Module Development Guide

This guide explains how to create, register, and integrate custom modules into go-admin. It covers both the actual built-in module implementations and advanced patterns like the Debug Module for real-time introspection.

## What it provides

- Module interface and manifest system for self-describing features
- Feature flag integration for conditional module loading
- Navigation menu contribution from modules
- Panel module pattern for CRUD-based admin features
- Repository interface for data access abstraction
- go-dashboard widget integration for module UIs
- Route registration patterns for module endpoints
- Quickstart helpers for streamlined module registration
- i18n support via TranslatorAware interface
- Security patterns (auth, permissions, redaction)

## Table of Contents

1. [Module Architecture](#1-module-architecture)
2. [Built-in Modules Reference](#2-built-in-modules-reference)
3. [Panel Module Pattern](#3-panel-module-pattern)
4. [Creating a Module](#4-creating-a-module)
5. [Module Registration](#5-module-registration)
6. [Configuration and Feature Flags](#6-configuration-and-feature-flags)
7. [Navigation Menu Integration](#7-navigation-menu-integration)
8. [Dashboard Widget Integration](#8-dashboard-widget-integration)
9. [Route Registration](#9-route-registration)
10. [Data Collection Patterns](#10-data-collection-patterns)
11. [WebSocket Streaming](#11-websocket-streaming)
12. [Security Considerations](#12-security-considerations)
13. [Testing Modules](#13-testing-modules)
14. [Advanced Example: Debug Module](#14-advanced-example-debug-module)
15. [Quickstart Module Registrar](#15-quickstart-module-registrar)

---

## 1. Module Architecture

### What is a Module?

A module is a self-contained feature unit that extends go-admin functionality. Modules can:

- Register panels with CRUD operations
- Contribute navigation menu items
- Provide dashboard widgets
- Register search adapters
- Define feature flag dependencies
- Declare dependencies on other modules

### Module Interface

The actual module interface from `admin/module.go`:

```go
// Module defines the minimal contract for pluggable slices.
// Modules should be registered before Admin.Initialize is called.
type Module interface {
    Manifest() ModuleManifest
    Register(ctx ModuleContext) error
}

// ModuleManifest captures identifying metadata and dependencies for a module.
// Labels/description keys are i18n-friendly and resolved by the host.
type ModuleManifest struct {
    ID             string   // Unique identifier (e.g., "profile", "users")
    NameKey        string   // i18n key for display name
    DescriptionKey string   // i18n key for description
    FeatureFlags   []string // Required feature gate keys (evaluated by FeatureGate)
    Dependencies   []string // Other module IDs this depends on
}

// ModuleContext is passed to modules so they can register panels, routes,
// commands, and other contributions against the admin orchestrator.
// Router can be nil if the admin has not been initialized yet.
type ModuleContext struct {
    Admin      *Admin
    Router     AdminRouter
    Locale     string
    Translator Translator
}

// AdminRouter is the minimal router surface exposed to modules.
type AdminRouter interface {
    Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
}
```

### Optional Interfaces

Modules can implement additional interfaces for extended functionality:

```go
// MenuContributor optionally lets a module contribute navigation items.
type MenuContributor interface {
    MenuItems(locale string) []MenuItem
}

// TranslatorAware is implemented by modules that want a translator
// injected before registration.
type TranslatorAware interface {
    WithTranslator(Translator)
}
```

MenuContributor is separate from Module; your module should implement Module and optionally MenuContributor/TranslatorAware.

### Repository Interface

Most panel modules use the Repository interface for data access:

```go
type Repository interface {
    List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
    Get(ctx context.Context, id string) (map[string]any, error)
    Create(ctx context.Context, record map[string]any) (map[string]any, error)
    Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
    Delete(ctx context.Context, id string) error
}
```

---

## 2. Built-in Modules Reference

go-admin includes several built-in modules that follow consistent patterns. These serve as reference implementations.

### Quick Reference: Feature Flags to Module IDs

| Feature Flag           | Module ID       | File                          | Description                          |
| ---------------------- | --------------- | ----------------------------- | ------------------------------------ |
| `FeatureProfile`       | `profile`       | `admin/profile_module.go`     | Current user profile management      |
| `FeaturePreferences`   | `preferences`   | `admin/preferences_module.go` | User preferences (theme, layout, UI) |
| `FeatureUsers`         | `users`         | `admin/users_module.go`       | User and role management             |
| `FeatureTenants`       | `tenants`       | `admin/tenants_module.go`     | Multi-tenant support                 |
| `FeatureOrganizations` | `organizations` | `admin/tenants_module.go`     | Organization hierarchy               |
| `debug` (custom)       | `debug`         | `admin/debug_module.go`       | Development introspection            |

### Profile Module

**File**: `admin/profile_module.go`

User profile management for the currently authenticated user.

| Property     | Value                                          |
| ------------ | ---------------------------------------------- |
| ID           | `profile`                                      |
| Feature Flag | `FeatureProfile`                               |
| Panel Route  | `/admin/profile`                               |
| Permissions  | `ProfilePermission`, `ProfileUpdatePermission` |

```go
// Registration (automatic when FeatureProfile is enabled)
// Or manually with menu parent grouping:
adm.RegisterModule(admin.NewProfileModule().WithMenuParent("nav-group-account"))
```

### Preferences Module

**File**: `admin/preferences_module.go`

User preferences for theme, dashboard layout, and UI settings.

| Property     | Value                                                  |
| ------------ | ------------------------------------------------------ |
| ID           | `preferences`                                          |
| Feature Flag | `FeaturePreferences`                                   |
| Panel Route  | `/admin/preferences`                                   |
| Permissions  | `PreferencesPermission`, `PreferencesUpdatePermission` |

See `docs/GUIDE_MOD_PREFERENCES.md` for detailed behavior.

### Users Module

**File**: `admin/users_module.go`

User and role management with CRUD operations.

| Property     | Value                                |
| ------------ | ------------------------------------ |
| ID           | `users`                              |
| Feature Flag | `FeatureUsers`                       |
| Panel Routes | `/admin/users`, `/admin/roles`       |
| Permissions  | `UsersPermission`, `RolesPermission` |

Features:

- User listing with filters (status, role)
- Role assignment and permission management
- Search adapter for global user search

### Tenants Module

**File**: `admin/tenants_module.go`

Multi-tenant support with membership tracking.

| Property     | Value                                                |
| ------------ | ---------------------------------------------------- |
| ID           | `tenants`                                            |
| Feature Flag | `FeatureTenants`                                     |
| Panel Route  | `/admin/tenants`                                     |
| Permissions  | `TenantsPermission`, `TenantsCreatePermission`, etc. |

### Organizations Module

**File**: `admin/tenants_module.go` (same file)

Organization management with hierarchical structure.

| Property     | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| ID           | `organizations`                                                  |
| Feature Flag | `FeatureOrganizations`                                           |
| Panel Route  | `/admin/organizations`                                           |
| Permissions  | `OrganizationsPermission`, `OrganizationsCreatePermission`, etc. |

### Default Module Registration

Built-in modules are auto-registered when their feature flags are enabled:

```go
// In admin/modules.go
func (a *Admin) registerDefaultModules() error {
    if a.gates.Enabled(FeatureUsers) {
        if _, exists := a.registry.Module(usersModuleID); !exists {
            if err := a.registry.RegisterModule(NewUserManagementModule()); err != nil {
                return err
            }
        }
    }
    // ... same pattern for Preferences, Profile, Tenants, Organizations
}
```

---

## 3. Panel Module Pattern

Most built-in modules follow a consistent "Panel Module" pattern that provides CRUD functionality.

### Pattern Overview

1. **Module struct** with configuration fields
2. **Repository adapter** that wraps a service
3. **Panel builder** registration with fields and permissions
4. **Menu items** contribution

### Example: Profile Module Structure

```go
// 1. Module struct
type ProfileModule struct {
    basePath         string
    menuCode         string
    defaultLocale    string
    viewPermission   string
    updatePermission string
    menuParent       string
}

// 2. Constructor
func NewProfileModule() *ProfileModule {
    return &ProfileModule{}
}

// 3. Manifest
func (m *ProfileModule) Manifest() ModuleManifest {
    return ModuleManifest{
        ID:             "profile",
        NameKey:        "modules.profile.name",
        DescriptionKey: "modules.profile.description",
        FeatureFlags:   []string{string(FeatureProfile)},
    }
}

// 4. Register - wire panel with repository
func (m *ProfileModule) Register(ctx ModuleContext) error {
    if ctx.Admin == nil {
        return errors.New("admin is nil")
    }
    // Check service availability
    if ctx.Admin.profile == nil {
        return FeatureDisabledError{Feature: string(FeatureProfile)}
    }

    // Resolve defaults from admin context
    if m.basePath == "" {
        m.basePath = ctx.Admin.config.BasePath
    }
    if m.menuCode == "" {
        m.menuCode = ctx.Admin.navMenuCode
    }
    if m.defaultLocale == "" {
        m.defaultLocale = ctx.Admin.config.DefaultLocale
    }
    if m.viewPermission == "" {
        m.viewPermission = ctx.Admin.config.ProfilePermission
    }
    if m.updatePermission == "" {
        m.updatePermission = ctx.Admin.config.ProfileUpdatePermission
    }

    // Create repository adapter
    repo := NewProfileRepository(ctx.Admin.profile, m.defaultLocale)

    // Register panel with builder
    builder := ctx.Admin.Panel("profile").
        WithRepository(repo).
        ListFields(
            Field{Name: "display_name", Label: "Name", Type: "text"},
            Field{Name: "email", Label: "Email", Type: "email"},
        ).
        FormFields(
            Field{Name: "display_name", Label: "Name", Type: "text", Required: true},
            Field{Name: "email", Label: "Email", Type: "email", Required: true},
            Field{Name: "locale", Label: "Locale", Type: "text"},
        ).
        Permissions(PanelPermissions{
            View:   m.viewPermission,
            Create: m.updatePermission,
            Edit:   m.updatePermission,
            Delete: m.updatePermission,
        })

    if _, err := ctx.Admin.RegisterPanel("profile", builder); err != nil {
        return err
    }
    return nil
}

// 5. Menu contribution
func (m *ProfileModule) MenuItems(locale string) []MenuItem {
    if locale == "" {
        locale = m.defaultLocale
    }
    path := joinPath(m.basePath, "profile")
    return []MenuItem{{
        Label:       "Profile",
        LabelKey:    "menu.profile",
        Icon:        "user",
        Target:      map[string]any{"type": "url", "path": path, "key": "profile"},
        Permissions: []string{m.viewPermission},
        Menu:        m.menuCode,
        Locale:      locale,
        Position:    intPtr(55),
        ParentID:    m.menuParent,
    }}
}

// 6. Optional: menu parent setter
func (m *ProfileModule) WithMenuParent(parent string) *ProfileModule {
    m.menuParent = parent
    return m
}
```

### Repository Adapter Pattern

Repository adapters convert service operations to the panel Repository interface:

```go
type ProfileRepository struct {
    service       *ProfileService
    defaultLocale string
}

func NewProfileRepository(service *ProfileService, defaultLocale string) *ProfileRepository {
    return &ProfileRepository{service: service, defaultLocale: defaultLocale}
}

func (r *ProfileRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
    userID := userIDFromContext(ctx)
    if r.service == nil {
        return nil, 0, FeatureDisabledError{Feature: string(FeatureProfile)}
    }
    if userID == "" {
        return nil, 0, ErrForbidden
    }
    profile, err := r.service.Get(ctx, userID)
    if err != nil {
        return nil, 0, err
    }
    return []map[string]any{r.recordFromProfile(profile)}, 1, nil
}

// Conversion helpers
func (r *ProfileRepository) recordFromProfile(profile UserProfile) map[string]any {
    return map[string]any{
        "id":           profile.UserID,
        "display_name": profile.DisplayName,
        "email":        profile.Email,
        // ...
    }
}
```

### Service Dependency Check

Always check that required services are available:

```go
func (m *PreferencesModule) Register(ctx ModuleContext) error {
    if ctx.Admin == nil {
        return errors.New("admin is nil")
    }
    // Service must be set up before module registration
    if ctx.Admin.preferences == nil {
        return FeatureDisabledError{Feature: string(FeaturePreferences)}
    }
    // ... continue registration
}
```

---

## 4. Creating a Module

### Step 1: Define the Module Struct

```go
// File: admin/debug_module.go
package admin

// DebugModule provides development introspection tools
type DebugModule struct {
    collector     *DebugCollector
    config        DebugConfig
    basePath      string   // Debug module's own path (e.g., "/admin/debug")
    adminBasePath string   // Admin's base path (e.g., "/admin")
    menuCode      string
    locale        string
    permission    string
}

// NewDebugModule creates a new debug module instance
func NewDebugModule(config DebugConfig) *DebugModule {
    return &DebugModule{config: config}
}
```

### Step 2: Define Configuration

```go
type DebugConfig struct {
    Enabled            bool          // Master enable flag
    CaptureSQL         bool          // Enable SQL query capture
    CaptureLogs        bool          // Enable log streaming
    StrictQueryHooks   bool          // Panic on invalid query hook registrations
    MaxLogEntries      int           // Ring buffer size for logs
    MaxSQLQueries      int           // Ring buffer size for SQL
    Panels             []string      // Enabled panel IDs
    FeatureKey         string        // Feature gate key (defaults to "debug")
    Permission         string        // Optional permission gate
    BasePath           string        // Optional path override
    SlowQueryThreshold time.Duration // Highlight slow queries
    AllowedIPs         []string      // Optional IP whitelist
    PersistLayout      bool          // Opt-in to layout persistence
}
```

### Step 3: Implement Manifest

The manifest describes the module to the admin system:

```go
func (m *DebugModule) Manifest() ModuleManifest {
    featureKey := m.config.FeatureKey
    if featureKey == "" {
        featureKey = "debug"
    }
    return ModuleManifest{
        ID:             "debug",
        NameKey:        "modules.debug.name",
        DescriptionKey: "modules.debug.description",
        FeatureFlags:   []string{featureKey},
        Dependencies:   []string{}, // No dependencies
    }
}
```

### Step 4: Implement Register

The Register method wires the module into the admin:

```go
func (m *DebugModule) Register(ctx ModuleContext) error {
    if ctx.Admin == nil {
        return errors.New("admin is nil")
    }
    cfg := normalizeDebugConfig(m.config, ctx.Admin.BasePath())
    m.config = cfg
    if !debugConfigEnabled(cfg) {
        return nil // Silent no-op when disabled
    }

    if m.basePath == "" {
        m.basePath = cfg.BasePath
    }
    if m.adminBasePath == "" {
        m.adminBasePath = ctx.Admin.BasePath()
    }
    if m.menuCode == "" {
        m.menuCode = ctx.Admin.NavMenuCode()
    }
    if m.locale == "" {
        m.locale = ctx.Admin.DefaultLocale()
    }
    if m.permission == "" {
        m.permission = cfg.Permission
    }
    if m.basePath == "" {
        m.basePath = cfg.BasePath
    }
    if m.collector == nil {
        m.collector = NewDebugCollector(cfg)
    }
    ctx.Admin.debugCollector = m.collector

    m.captureConfigSnapshot(ctx.Admin)
    m.captureRoutesSnapshot(ctx.Admin)
    m.registerDashboardArea(ctx.Admin)
    m.registerDashboardProviders(ctx.Admin)
    m.registerDebugRoutes(ctx.Admin)
    m.registerDebugWebSocket(ctx.Admin)

    return nil
}
```

---

## 5. Module Registration

### Registration Order

Modules should be registered **before** calling `Admin.Initialize()`:

```go
adm, err := admin.New(cfg, deps)
if err != nil {
    return err
}

// Register custom modules before Initialize
adm.RegisterModule(myCustomModule)

// Now initialize (sets router, loads modules, registers routes, menus, widgets)
if err := adm.Initialize(router); err != nil {
    return err
}
```

### How Module Loading Works

The actual module loading happens in `admin/modules.go`:

```go
func (a *Admin) loadModules(ctx context.Context) error {
    // 1. Register default modules (based on feature flags)
    if err := a.registerDefaultModules(); err != nil {
        return err
    }

    // 2. Load all registered modules in dependency order
    modulesToLoad := []modules.Module{}
    for _, mod := range a.registry.Modules() {
        if mod == nil {
            continue
        }
        modulesToLoad = append(modulesToLoad, mod)
    }
    err := modules.Load(ctx, modules.LoadOptions{
        Modules:       modulesToLoad,
        Gates:         a.gates,
        DefaultLocale: a.config.DefaultLocale,
        Translator:    a.translator,
        DisabledError: func(feature, moduleID string) error {
            return FeatureDisabledError{
                Feature: feature,
                Reason:  fmt.Sprintf("required by module %s; enable via FeatureGate defaults or overrides", moduleID),
            }
        },
        Register: func(mod modules.Module) error {
            registrar, ok := mod.(Module)
            if !ok {
                return fmt.Errorf("module %s missing Register implementation", mod.Manifest().ID)
            }
            return registrar.Register(ModuleContext{
                Admin:      a,
                Router:     a.router,
                Locale:     a.config.DefaultLocale,
                Translator: a.translator,
            })
        },
        AddMenuItems: func(ctx context.Context, items []navinternal.MenuItem) error {
            return a.addMenuItems(ctx, []MenuItem(items))
        },
    })
    return err
}
```

### Module Ordering (Topological Sort)

Modules are sorted by dependencies before loading:

```go
// In admin/internal/modules/load.go
func Order(modules []Module) ([]Module, error) {
    // Builds dependency graph
    // Detects cycles
    // Returns modules in topological order
    // Error if dependency is missing
}
```

Example: if module B depends on module A, A is registered first regardless of registration order.

### Duplicate ID Rejection

Duplicate module IDs are rejected to preserve ordering:

```go
if err := adm.RegisterModule(&stubModule{id: "mod"}); err != nil {
    // success
}
if err := adm.RegisterModule(&stubModule{id: "mod"}); err == nil {
    // error: duplicate module ID rejected
}
```

---

## 6. Configuration and Feature Gates

### Feature Gate Integration

Modules declare required feature gate keys in their manifest:

```go
func (m *DebugModule) Manifest() ModuleManifest {
    return ModuleManifest{
        ID:           "debug",
        FeatureFlags: []string{"debug"}, // Requires feature gate key "debug" to be enabled
    }
}
```

### FeatureGate Defaults

```go
featureDefaults := map[string]bool{
    "debug": os.Getenv("ADMIN_DEBUG") == "true",
}
gate := resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(featureDefaults)))

adm, err := admin.New(cfg, admin.Dependencies{
    FeatureGate: gate,
})
```

Quickstart builds a FeatureGate automatically; override defaults via
`quickstart.WithFeatureDefaults(...)`.

### Environment Variables

```bash
# Enable debug module
ADMIN_DEBUG=true

# Individual capture flags
ADMIN_DEBUG_SQL=true
ADMIN_DEBUG_LOGS=true

# Buffer sizes
ADMIN_DEBUG_MAX_LOGS=500
ADMIN_DEBUG_MAX_SQL=200
```

Note: go-admin does not parse environment variables directly. The host application is responsible for configuration.

---

## 7. Navigation Menu Integration

### Implementing MenuItems

```go
func (m *DebugModule) MenuItems(locale string) []MenuItem {
    if locale == "" {
        locale = m.locale
    }

    permissions := []string{}
    if m.permission != "" {
        permissions = []string{m.permission}
    }

    return []MenuItem{{
        Label:       "Debug",
        LabelKey:    "menu.debug",
        Icon:        "bug",
        Target:      map[string]any{"type": "url", "path": m.basePath, "key": "debug"},
        Permissions: permissions,
        Position:    intPtr(999), // Bottom of sidebar
        Menu:        m.menuCode,
        Locale:      locale,
    }}
}
```

### MenuItem Structure

```go
type MenuItem struct {
    Label       string         // Display text
    LabelKey    string         // i18n key
    Icon        string         // Icon identifier (iconoir)
    Target      map[string]any // Navigation target
    Permissions []string       // Required permissions
    Position    *int           // Menu ordering
    Menu        string         // Menu code to attach to
    Locale      string         // Locale for i18n
    Children    []MenuItem     // Nested items
}
```

### Target Types

| Type       | Description       |
| ---------- | ----------------- |
| `url`      | Direct URL path   |
| `panel`    | Navigate to panel |
| `external` | External link     |

---

## 8. Dashboard Widget Integration

### Registering Widget Areas

Create a dedicated widget area for your module:

```go
func (m *DebugModule) registerDashboardWidgets(ctx ModuleContext) error {
    // Register widget area
    ctx.Admin.RegisterWidgetArea(WidgetAreaDefinition{
        Code: "admin.debug",
        Name: "Debug Console",
    })

    // Register widget providers for each panel
    for _, panel := range m.config.Panels {
        if err := m.registerPanelWidget(ctx, panel); err != nil {
            return err
        }
    }

    return nil
}
```

### Registering Widget Providers

```go
func (m *DebugModule) registerPanelWidget(ctx ModuleContext, panelID string) error {
    spec := DashboardProviderSpec{
        Code:        "debug." + panelID,
        Name:        m.panelDisplayName(panelID),
        DefaultArea: "admin.debug",
        DefaultSpan: 12,
        Handler:     m.createPanelHandler(panelID),
    }

    return ctx.Admin.Dashboard().RegisterProvider(spec)
}

func (m *DebugModule) createPanelHandler(panelID string) DashboardProviderHandler {
    return func(ctx AdminContext, config map[string]any) (map[string]any, error) {
        snapshot := m.collector.Snapshot()

        switch panelID {
        case "template":
            return map[string]any{"data": snapshot["template"]}, nil
        case "session":
            return map[string]any{"data": snapshot["session"]}, nil
        case "sql":
            return map[string]any{"queries": snapshot["sql"]}, nil
        case "logs":
            return map[string]any{"entries": snapshot["logs"]}, nil
        default:
            return snapshot, nil
        }
    }
}
```

### Panel Configuration

All panels default to span 12 (full width). See `admin/debug_module.go` for panel metadata.

| Panel      | Description           | Default Span |
| ---------- | --------------------- | ------------ |
| `template` | Template context data | 12           |
| `session`  | Current session info  | 12           |
| `requests` | HTTP request log      | 12           |
| `sql`      | SQL query log         | 12           |
| `logs`     | Server log stream     | 12           |
| `config`   | App configuration     | 12           |
| `routes`   | Registered routes     | 12           |
| `custom`   | User-defined data     | 12           |

---

## 9. Route Registration

### Router Access

Modules register routes through `ModuleContext.Router`, which exposes the minimal `AdminRouter` interface (Get/Post/Put/Delete). The router is only set after `Admin.Initialize`, so guard against nil if you call registration outside the normal boot flow. If you need access outside module registration, use `Admin.PublicRouter()` after initialization.

```go
func (m *MyModule) Register(ctx ModuleContext) error {
    if ctx.Router == nil {
        return errors.New("router is nil")
    }
    m.registerRoutes(ctx)
    return nil
}
```

### Router Capabilities

If you need router-specific features (groups, WebSocket support, etc.), type-assert the router to the interface you need.

```go
type WebSocketRouter interface {
    WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo
}

if ws, ok := ctx.Router.(WebSocketRouter); ok {
    ws.WebSocket("/admin/my-module/ws", router.DefaultWebSocketConfig(), m.handleWebSocket)
}
```

### Custom Route Registration Pattern

For modules that don't use go-dashboard, here's the standard pattern:

```go
func (m *MyModule) registerRoutes(ctx ModuleContext) error {
    if ctx.Router == nil {
        return errors.New("router is nil")
    }

    // Guard function with module-specific checks
    guard := func(handler router.HandlerFunc) router.HandlerFunc {
        return func(c router.Context) error {
            if !m.allowRequest(c) {
                return ErrForbidden
            }
            return handler(c)
        }
    }

    // Register routes
    ctx.Router.Get(m.basePath, guard(m.handleIndex))
    ctx.Router.Get(path.Join(m.basePath, "api/data"), guard(m.handleData))
    ctx.Router.Post(path.Join(m.basePath, "api/action"), guard(m.handleAction))
    return nil
}
```

### Route Handlers Example

```go
func (m *MyModule) handleIndex(c router.Context) error {
    viewCtx := router.ViewContext{
        "title":     "My Module",
        "base_path": m.basePath,
    }
    return c.Render("resources/mymodule/index", viewCtx)
}

func (m *MyModule) handleData(c router.Context) error {
    data := m.collector.Snapshot()
    return c.JSON(http.StatusOK, data)
}

func (m *MyModule) handleAction(c router.Context) error {
    // Process action
    return c.JSON(http.StatusOK, map[string]any{"success": true})
}
```

---

## 10. Data Collection Patterns

### DebugPanel Interface

Custom debug panels can be registered via the `DebugPanel` interface. This allows modules to contribute their own debug data to the collector.

```go
// File: admin/debug_collector.go

// DebugPanel defines a pluggable debug panel.
type DebugPanel interface {
    ID() string                              // Unique panel identifier
    Label() string                           // Display name for UI
    Icon() string                            // Icon identifier
    Collect(ctx context.Context) map[string]any // Gather panel data
}

// RegisterPanel adds a custom debug panel.
func (c *DebugCollector) RegisterPanel(panel DebugPanel) {
    if c == nil || panel == nil {
        return
    }
    id := strings.TrimSpace(panel.ID())
    if id == "" {
        return
    }
    c.mu.Lock()
    defer c.mu.Unlock()
    if _, exists := c.panelIndex[id]; exists {
        return
    }
    c.panels = append(c.panels, panel)
    c.panelIndex[id] = panel
}
```

**Example Custom Panel:**

```go
type MetricsPanel struct{}

func (p *MetricsPanel) ID() string    { return "metrics" }
func (p *MetricsPanel) Label() string { return "Application Metrics" }
func (p *MetricsPanel) Icon() string  { return "chart-line" }

func (p *MetricsPanel) Collect(ctx context.Context) map[string]any {
    return map[string]any{
        "goroutines":   runtime.NumGoroutine(),
        "memory_alloc": getMemoryAlloc(),
        "uptime":       time.Since(startTime).String(),
    }
}

// Register during module initialization
adm.Debug().RegisterPanel(&MetricsPanel{})
```

### Collector Architecture

```go
// File: admin/debug_collector.go

type DebugCollector struct {
    mu sync.RWMutex

    config     DebugConfig
    panelSet   map[string]bool        // Enabled panel IDs
    panels     []DebugPanel           // Custom panels
    panelIndex map[string]DebugPanel  // Panel lookup by ID

    // Built-in data stores
    templateData map[string]any
    sessionData  map[string]any
    requestLog   *RingBuffer[RequestEntry]
    sqlLog       *RingBuffer[SQLEntry]
    serverLog    *RingBuffer[LogEntry]
    customData   map[string]any
    customLog    *RingBuffer[CustomLogEntry]
    configData   map[string]any
    routesData   []RouteEntry

    // WebSocket subscribers
    subscribers map[string]chan DebugEvent
}
```

### Ring Buffer for Bounded Storage

```go
// RingBuffer stores the most recent values up to a fixed capacity.
// File: admin/ring_buffer.go
type RingBuffer[T any] struct {
    mu     sync.RWMutex
    values []T
    start  int
    count  int
}

// NewRingBuffer creates a ring buffer with the provided capacity.
func NewRingBuffer[T any](capacity int) *RingBuffer[T] {
    if capacity < 0 {
        capacity = 0
    }
    return &RingBuffer[T]{values: make([]T, capacity)}
}

// Add appends a value, overwriting the oldest when full.
func (r *RingBuffer[T]) Add(value T) {
    if r == nil || len(r.values) == 0 {
        return
    }
    r.mu.Lock()
    defer r.mu.Unlock()
    if r.count < len(r.values) {
        idx := (r.start + r.count) % len(r.values)
        r.values[idx] = value
        r.count++
        return
    }
    r.values[r.start] = value
    r.start = (r.start + 1) % len(r.values)
}

// Values returns the buffered values ordered from oldest to newest.
func (r *RingBuffer[T]) Values() []T {
    if r == nil {
        return nil
    }
    r.mu.RLock()
    defer r.mu.RUnlock()
    if r.count == 0 {
        return nil
    }
    out := make([]T, r.count)
    for i := 0; i < r.count; i++ {
        idx := (r.start + i) % len(r.values)
        out[i] = r.values[idx]
    }
    return out
}

// Clear removes all buffered values.
func (r *RingBuffer[T]) Clear()

// Len returns the current number of stored values.
func (r *RingBuffer[T]) Len() int

// Cap returns the buffer capacity.
func (r *RingBuffer[T]) Cap() int
```

### Capture Methods

Some capture methods redact sensitive data (request headers/query, SQL args, log fields, config snapshot). Template/session/custom data are stored as provided.

```go
// File: admin/debug_collector.go

// CaptureTemplateData stores the current template context.
func (c *DebugCollector) CaptureTemplateData(viewCtx router.ViewContext) {
    if c == nil || !c.panelEnabled("template") {
        return
    }
    data := cloneAnyMap(map[string]any(viewCtx))
    c.mu.Lock()
    c.templateData = data
    c.mu.Unlock()
    c.publish("template", data)
}

// CaptureSQL logs a database query with automatic argument redaction.
func (c *DebugCollector) CaptureSQL(entry SQLEntry) {
    if c == nil || !c.config.CaptureSQL || !c.panelEnabled("sql") {
        return
    }
    if entry.Timestamp.IsZero() {
        entry.Timestamp = time.Now()
    }
    if len(entry.Args) > 0 {
        if redacted, ok := redactSensitiveValue(entry.Args).([]any); ok {
            entry.Args = redacted
        }
    }
    if c.sqlLog != nil {
        c.sqlLog.Add(entry)
    }
    c.publish("sql", entry)
}

// CaptureLog adds a log entry with field redaction.
func (c *DebugCollector) CaptureLog(entry LogEntry) {
    if c == nil || !c.config.CaptureLogs || !c.panelEnabled("logs") {
        return
    }
    if entry.Timestamp.IsZero() {
        entry.Timestamp = time.Now()
    }
    if len(entry.Fields) > 0 {
        entry.Fields = redactSensitiveMap(entry.Fields)
    }
    if c.serverLog != nil {
        c.serverLog.Add(entry)
    }
    c.publish("log", entry)
}

// Set adds custom debug data with automatic sensitive key redaction.
func (c *DebugCollector) Set(key string, value any) {
    if c == nil || !c.panelEnabled("custom") {
        return
    }
    key = strings.TrimSpace(key)
    if key == "" {
        return
    }
    if isSensitiveKey(key) {
        value = "[REDACTED]"
    } else {
        value = redactSensitiveValue(value)
    }
    c.mu.Lock()
    if c.customData == nil {
        c.customData = map[string]any{}
    }
    setNestedValue(c.customData, key, value)
    c.mu.Unlock()
    c.publish("custom", map[string]any{"key": key, "value": value})
}

// Log adds a custom debug message with field redaction.
func (c *DebugCollector) Log(category, message string, fields ...any) {
    if c == nil || !c.panelEnabled("custom") {
        return
    }
    payload := fieldsToMap(fields)
    if len(payload) > 0 {
        payload = redactSensitiveMap(payload)
    }
    entry := CustomLogEntry{
        Timestamp: time.Now(),
        Category:  strings.TrimSpace(category),
        Message:   strings.TrimSpace(message),
        Fields:    payload,
    }
    if c.customLog != nil {
        c.customLog.Add(entry)
    }
    c.publish("custom", entry)
}
```

### Integration Hooks

**View Context Capture:**

The `CaptureViewContext` function serves two purposes:
1. Stores template data in the debug collector for the "template" panel
2. Injects debug toolbar template variables when `ToolbarMode` is enabled

```go
// In handlers, after assembling view context
viewCtx := helpers.WithTheme(h.WithNav(router.ViewContext{...}), h.Admin, c)
viewCtx = admin.CaptureViewContext(adm.Debug(), viewCtx)
return c.Render("resources/users/list", viewCtx)
```

**Injected Template Variables:**

When `DebugConfig.ToolbarMode` is enabled, `CaptureViewContext` adds these variables:

| Variable                  | Type   | Description                              |
| ------------------------- | ------ | ---------------------------------------- |
| `debug_toolbar_enabled`   | bool   | True when toolbar should render          |
| `debug_path`              | string | Debug module base path (e.g., `/admin/debug`) |
| `debug_toolbar_panels`    | string | Comma-separated panel IDs                |
| `debug_slow_threshold_ms` | int64  | Slow query threshold in milliseconds     |

**Using with Quickstart UI Routes:**

The `quickstart.RegisterAdminUIRoutes` helper automatically calls `CaptureViewContext` via its `defaultUIViewContextBuilder`. Custom UI route builders should do the same:

```go
// Custom view context builder with debug toolbar support
func customViewContextBuilder(adm *admin.Admin, cfg admin.Config) quickstart.UIViewContextBuilder {
    return func(ctx router.ViewContext, active string, c router.Context) router.ViewContext {
        reqCtx := c.Context()
        ctx = quickstart.WithNav(ctx, adm, cfg, active, reqCtx)
        ctx = quickstart.WithThemeContext(ctx, adm, c)
        // IMPORTANT: Call CaptureViewContext to enable debug toolbar
        return admin.CaptureViewContext(adm.Debug(), ctx)
    }
}

// Register with custom builder
quickstart.RegisterAdminUIRoutes(router, cfg, adm, auth,
    quickstart.WithUIViewContextBuilder(customViewContextBuilder(adm, cfg)),
)
```

**Manual Route Registration:**

For routes registered outside the quickstart helpers, ensure `CaptureViewContext` is called:

```go
router.Get("/admin/custom-page", authMiddleware(func(c router.Context) error {
    viewCtx := router.ViewContext{
        "title":     "Custom Page",
        "base_path": cfg.BasePath,
    }
    // Add navigation and theme
    viewCtx = quickstart.WithNav(viewCtx, adm, cfg, "custom", c.Context())
    viewCtx = quickstart.WithThemeContext(viewCtx, adm, c)
    // Enable debug toolbar (required for toolbar to appear)
    viewCtx = admin.CaptureViewContext(adm.Debug(), viewCtx)

    return c.Render("resources/custom/page", viewCtx)
}))
```

**Template Integration:**

Templates extending `layout.html` automatically include the debug toolbar partial:

```html
<!-- In layout.html -->
{% include "partials/debug-toolbar.html" %}

<!-- The partial checks for debug_toolbar_enabled -->
{% if debug_toolbar_enabled %}
<script>
  window.DEBUG_CONFIG = {
    basePath: '{{ base_path }}',
    debugPath: '{{ debug_path }}',
    panels: '{{ debug_toolbar_panels }}'.split(','),
    slowThresholdMs: {{ debug_slow_threshold_ms }}
  };
</script>
<script type="module">
  import { initDebugManager } from '{{ base_path }}/assets/dist/debug/toolbar.js';
  initDebugManager();
</script>
{% endif %}
```

**Using the Debug Toolbar in External Projects:**

Projects using `go-admin` as a dependency can reuse the embedded debug toolbar partial without copying it. The key is to:

1. Register `go-admin`'s embedded templates with your template engine
2. Include the partial in your layout
3. Ensure `CaptureViewContext` is called for routes that should show the toolbar

```go
import (
    "github.com/goliatone/go-admin/pkg/client"
    "github.com/goliatone/go-template"
)

// When setting up the template engine, add go-admin's embedded templates
engine := template.NewPongo2Engine(template.Pongo2Config{
    Directory: "./templates",
})

// Add go-admin's embedded templates as a fallback
engine.AddFS(client.Templates(), "templates")
```

Then in your layout template:

```html
<!-- layout.html -->
<!DOCTYPE html>
<html>
<head>...</head>
<body>
    {% block content %}{% endblock %}

    <!-- Include go-admin's debug toolbar partial -->
    {% include "partials/debug-toolbar.html" %}
</body>
</html>
```

The partial is self-contained and checks `debug_toolbar_enabled` before rendering. If the variable is not set or false, nothing is rendered.

**Important**: Do not create your own `partials/debug-toolbar.html` file. Use the one embedded in `go-admin` via the template fallback mechanism. This ensures you receive updates when upgrading `go-admin`.

**SQL Query Hook (Bun):**

```go
type DebugQueryHook struct {
    Collector *DebugCollector
}

func (h *DebugQueryHook) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
    return ctx
}

func (h *DebugQueryHook) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
    entry := SQLEntry{
        ID:        generateID(),
        Timestamp: time.Now(),
        Query:     event.Query,
        Args:      event.QueryArgs,
        Duration:  time.Since(event.StartTime),
        Error:     errorString(event.Err),
    }
    h.Collector.CaptureSQL(entry)
}

// Register on bun.DB
db.AddQueryHook(&DebugQueryHook{Collector: adm.Debug()})
```

**Slog Handler:**

```go
type DebugLogHandler struct {
    collector *DebugCollector
    next      slog.Handler
}

func (h *DebugLogHandler) Handle(ctx context.Context, r slog.Record) error {
    entry := LogEntry{
        Timestamp: r.Time,
        Level:     r.Level.String(),
        Message:   r.Message,
        Fields:    extractFields(r),
    }
    h.collector.CaptureLog(entry)

    if h.next != nil {
        return h.next.Handle(ctx, r)
    }
    return nil
}
```

---

## 11. WebSocket Streaming

### WebSocket Registration

```go
type WebSocketRouter interface {
    WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo
}

func (m *DebugModule) registerWebSocket(ctx ModuleContext) {
    if ctx.Router == nil {
        return
    }
    ws, ok := ctx.Router.(WebSocketRouter)
    if !ok {
        return // Router doesn't support WebSocket
    }
    ws.WebSocket(
        path.Join(m.basePath, "ws"),
        router.DefaultWebSocketConfig(),
        m.handleDebugWebSocket,
    )
}
```

### WebSocket Handler

```go
func (m *DebugModule) handleDebugWebSocket(c router.WebSocketContext) error {
    clientID := generateClientID()
    events := m.collector.Subscribe(clientID)
    defer m.collector.Unsubscribe(clientID)

    // Send initial snapshot
    _ = c.WriteJSON(DebugEvent{
        Type:      "snapshot",
        Payload:   m.collector.Snapshot(),
        Timestamp: time.Now(),
    })

    // Handle incoming commands
    go func() {
        for {
            var cmd DebugCommand
            if err := c.ReadJSON(&cmd); err != nil {
                return
            }
            m.handleCommand(clientID, cmd)
        }
    }()

    // Stream events to client
    for event := range events {
        if err := c.WriteJSON(event); err != nil {
            return err
        }
    }
    return nil
}
```

### Subscriber Management

```go
func (c *DebugCollector) Subscribe(id string) <-chan DebugEvent {
    c.mu.Lock()
    defer c.mu.Unlock()

    ch := make(chan DebugEvent, 100)
    c.subscribers[id] = ch
    return ch
}

func (c *DebugCollector) Unsubscribe(id string) {
    c.mu.Lock()
    defer c.mu.Unlock()

    if ch, ok := c.subscribers[id]; ok {
        close(ch)
        delete(c.subscribers, id)
    }
}

func (c *DebugCollector) broadcast(event DebugEvent) {
    event.Timestamp = time.Now()

    c.mu.RLock()
    defer c.mu.RUnlock()

    for _, ch := range c.subscribers {
        select {
        case ch <- event:
        default:
            // Drop if channel full
        }
    }
}
```

### Client Protocol

```typescript
// Client -> Server
interface DebugCommand {
  type: "subscribe" | "unsubscribe" | "clear" | "snapshot";
  panels?: string[];
}

// Server -> Client
interface DebugEvent {
  type:
    | "log"
    | "sql"
    | "request"
    | "template"
    | "session"
    | "custom"
    | "snapshot";
  payload: any;
  timestamp: string;
}
```

---

## 12. Security Considerations

### 1. Disabled by Default

```go
func (m *DebugModule) Register(ctx ModuleContext) error {
    // Require explicit opt-in
    if !m.config.Enabled {
        return nil // Silent no-op
    }
    // ...
}
```

### 2. Authentication Required

All debug routes should require authentication:

```go
func (m *DebugModule) registerRoutes(ctx ModuleContext) {
    if ctx.Router == nil {
        return
    }
    ctx.Router.Get(m.basePath, m.guard(m.handleDebugDashboard))
}
```

### 3. Permission Checks

```go
guard := func(handler router.HandlerFunc) router.HandlerFunc {
    return func(c router.Context) error {
        if !m.isAllowedIP(c.IP()) {
            return ErrForbidden
        }
        if !m.hasPermission(c.Context()) {
            return ErrForbidden
        }
        return handler(c)
    }
}
```

### 4. Sensitive Data Redaction

```go
var sensitiveKeys = []string{
    "password", "secret", "token", "key", "credential",
    "authorization", "api_key", "apikey", "auth", "bearer", "cookie", "jwt",
}

func redactSensitiveMap(data map[string]any) map[string]any {
    if len(data) == 0 {
        return map[string]any{}
    }
    out := make(map[string]any, len(data))
    for key, value := range data {
        if isSensitiveKey(key) {
            out[key] = "[REDACTED]"
            continue
        }
        out[key] = redactSensitiveValue(value)
    }
    return out
}

func redactSensitiveValue(value any) any {
    switch typed := value.(type) {
    case map[string]any:
        return redactSensitiveMap(typed)
    case []any:
        out := make([]any, 0, len(typed))
        for _, item := range typed {
            out = append(out, redactSensitiveValue(item))
        }
        return out
    default:
        return value
    }
}

func isSensitiveKey(key string) bool {
    normalized := normalizeKey(key)
    if normalized == "" {
        return false
    }
    for _, token := range sensitiveKeys {
        if normalized == token {
            return true
        }
    }
    for _, segment := range splitKeySegments(normalized) {
        if segment == "key" {
            return true
        }
        for _, token := range sensitiveKeys {
            if segment == token {
                return true
            }
        }
    }
    return false
}

func normalizeKey(key string) string {
    var out []rune
    out = make([]rune, 0, len(key))
    for i, r := range key {
        if unicode.IsUpper(r) && i > 0 {
            out = append(out, '_')
        }
        out = append(out, unicode.ToLower(r))
    }
    return strings.TrimSpace(string(out))
}

func splitKeySegments(key string) []string {
    parts := strings.FieldsFunc(key, func(r rune) bool {
        return !(unicode.IsLetter(r) || unicode.IsNumber(r))
    })
    out := make([]string, 0, len(parts))
    for _, part := range parts {
        if trimmed := strings.TrimSpace(part); trimmed != "" {
            out = append(out, trimmed)
        }
    }
    return out
}
```

### 5. IP Whitelist

```go
func (m *DebugModule) isAllowedIP(clientIP string) bool {
    if len(m.config.AllowedIPs) == 0 {
        return true // Allow all if not configured
    }
    for _, allowed := range m.config.AllowedIPs {
        if clientIP == allowed {
            return true
        }
    }
    return false
}
```

---

## 13. Testing Modules

### Unit Tests

```go
func TestDebugCollector_Snapshot(t *testing.T) {
    collector := NewDebugCollector(DebugConfig{
        MaxLogEntries: 100,
        MaxSQLQueries: 50,
    })

    // Add test data
    collector.CaptureLog(LogEntry{Message: "test log"})
    collector.CaptureSQL(SQLEntry{Query: "SELECT 1"})
    collector.Set("custom.key", "value")

    snapshot := collector.Snapshot()

    assert.NotNil(t, snapshot["logs"])
    assert.NotNil(t, snapshot["sql"])
    assert.Equal(t, "value", snapshot["custom"].(map[string]any)["custom.key"])
}

func TestDebugCollector_Redaction(t *testing.T) {
    data := map[string]any{
        "username": "admin",
        "password": "secret123",
        "nested": map[string]any{
            "api_key": "abc123",
        },
    }

    redacted := redactSensitive(data)

    assert.Equal(t, "admin", redacted["username"])
    assert.Equal(t, "[REDACTED]", redacted["password"])
    assert.Equal(t, "[REDACTED]", redacted["nested"].(map[string]any)["api_key"])
}
```

### Integration Tests

```go
func TestDebugRoutes_AuthRequired(t *testing.T) {
    app := setupTestApp()

    // Without auth - should fail
    resp, _ := app.Test(httptest.NewRequest("GET", "/admin/debug", nil))
    assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

    // With auth - should succeed
    req := httptest.NewRequest("GET", "/admin/debug", nil)
    req.Header.Set("Authorization", "Bearer "+validToken)
    resp, _ = app.Test(req)
    assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestDebugRoutes_PermissionCheck(t *testing.T) {
    app := setupTestAppWithPermissions()

    // User without debug permission
    req := httptest.NewRequest("GET", "/admin/debug", nil)
    req.Header.Set("Authorization", "Bearer "+limitedUserToken)
    resp, _ := app.Test(req)
    assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)

    // User with debug permission
    req = httptest.NewRequest("GET", "/admin/debug", nil)
    req.Header.Set("Authorization", "Bearer "+adminToken)
    resp, _ = app.Test(req)
    assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}
```

---

## 14. Advanced Example: Debug Module

### File Structure

```
go-admin/
├── admin/
│   ├── debug_config.go        # Config defaults and normalizer
│   ├── debug_module.go        # Module registration & manifest
│   ├── debug_collector.go     # Data collection & aggregation
│   ├── debug_integrations.go  # Middleware + log/session/template helpers
│   ├── debug_query_hook.go    # Bun query hook integration
│   └── debug_transport.go     # Routes + WebSocket handlers
├── pkg/client/
│   ├── assets/src/debug/
│   │   ├── debug-panel.ts     # Debug panel component
│   │   └── debug-stream.ts    # WebSocket client
│   └── templates/resources/debug/
│       └── index.html         # Debug dashboard template
```

### Module Configuration

```go
debugEnabled := os.Getenv("ADMIN_DEBUG") == "true"
cfg.Debug = admin.DebugConfig{
    Enabled:            debugEnabled,
    CaptureSQL:         debugEnabled,
    CaptureLogs:        debugEnabled,
    MaxLogEntries:      500,
    MaxSQLQueries:      200,
    SlowQueryThreshold: 50 * time.Millisecond,
    Permission:         "admin.debug",
    AllowedIPs:         []string{"127.0.0.1"},
    Panels: []string{
        "template",
        "session",
        "requests",
        "sql",
        "logs",
        "config",
        "routes",
        "custom",
    },
}
```

### Panels

Default panel IDs:

- `template`
- `session`
- `requests`
- `sql`
- `logs`
- `config`
- `routes`
- `custom`

### Enable/Disable Guidance

- The module is disabled by default; set `DebugConfig.Enabled=true` to opt in.
- The module also requires the feature gate key (default key is `debug`; override with `DebugConfig.FeatureKey`).
- When enabled, ensure the dashboard feature and CMS widget service are available.
- Disable by setting `Enabled=false` or providing an empty `Panels` list.

### Wiring in Host Application

```go
// main.go
func main() {
    cfg := admin.Config{
        BasePath: "/admin",
    }

    debugEnabled := os.Getenv("ADMIN_DEBUG") == "true"
    cfg.Debug.Enabled = debugEnabled
    cfg.Debug.CaptureSQL = debugEnabled
    cfg.Debug.CaptureLogs = debugEnabled

    featureDefaults := map[string]bool{
        "debug": debugEnabled,
    }
    gate := resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(featureDefaults)))
    adm, _ := admin.New(cfg, admin.Dependencies{FeatureGate: gate})

    // Register debug module
    if debugEnabled {
        adm.RegisterModule(admin.NewDebugModule(cfg.Debug))
    }

    // Wire request capture (collector is resolved per request)
    router.Use(func(next router.HandlerFunc) router.HandlerFunc {
        return func(c router.Context) error {
            if collector := adm.Debug(); collector != nil {
                return admin.DebugRequestMiddleware(collector)(next)(c)
            }
            return next(c)
        }
    })

    // Wire log capture
    if adm.Debug() != nil {
        slog.SetDefault(slog.New(admin.NewDebugLogHandler(
            adm.Debug(),
            slog.Default().Handler(),
        )))
    }

    // Wire SQL capture (go-repository-bun options)
    repoOptions := adm.DebugQueryHookOptions()
    repo := repository.MustNewRepository(db, handlers, repoOptions...)

    // Initialize admin (registers routes, menus, widgets)
    adm.Initialize(router)

    // Start server
    router.Listen(":8080")
}
```

### Template Capture in Handlers

```go
func (h *UserHandlers) List(c router.Context) error {
    users, _ := h.store.List(c.Context())

    viewCtx := router.ViewContext{
        "users": users,
        "total": len(users),
    }
    viewCtx = helpers.WithNav(viewCtx, h.Admin, h.Config, "users", c.Context())
viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)

// Capture for debug panel
viewCtx = admin.CaptureViewContext(h.Admin.Debug(), viewCtx)

return c.Render("resources/users/list", viewCtx)
}
```

---

## API Endpoints

| Method | Path                            | Description            |
| ------ | ------------------------------- | ---------------------- |
| GET    | `{debug_path}`                  | Debug dashboard page   |
| GET    | `{debug_path}/ws`               | WebSocket connection   |
| GET    | `{debug_path}/api/snapshot`     | Current state snapshot |
| POST   | `{debug_path}/api/clear`        | Clear all buffers      |
| POST   | `{debug_path}/api/clear/:panel` | Clear specific panel   |

---

## 15. Quickstart Module Registrar

The quickstart package provides helpers for streamlined module registration with feature gates and navigation seeding.

### Using NewModuleRegistrar

```go
import "github.com/goliatone/go-admin/quickstart"

// Register modules with feature gating
err := quickstart.NewModuleRegistrar(
    adm,
    cfg,
    []admin.Module{
        myCustomModule,
        anotherModule,
    },
    isDev, // development mode flag
    quickstart.WithSeedNavigation(true),
)
if err != nil {
    return err
}
```

### ModuleRegistrarOption Functions

| Option                                 | Description                           |
| -------------------------------------- | ------------------------------------- |
| `WithModuleRegistrarContext(ctx)`      | Set context for navigation seeding    |
| `WithModuleMenuItems(items...)`        | Append base menu items before seeding |
| `WithSeedNavigation(bool)`             | Toggle navigation seeding             |
| `WithSeedNavigationOptions(fn)`        | Mutate seed options                   |
| `WithModuleFeatureGates(gates)`        | Enable feature-gated module filtering |
| `WithModuleFeatureDisabledHandler(fn)` | Custom handler for disabled modules   |

### Feature Gates in Quickstart

Quickstart builds a FeatureGate when you call `quickstart.NewAdmin(...)`. You can
pass a custom gate via `WithModuleFeatureGates(...)` if you need to override it
for module filtering.

### Handling Disabled Modules

By default, disabled modules are silently skipped. Use a custom handler for logging:

```go
quickstart.NewModuleRegistrar(
    adm, cfg, modules, isDev,
    quickstart.WithModuleFeatureGates(gates),
    quickstart.WithModuleFeatureDisabledHandler(func(feature, moduleID string) error {
        log.Printf("Module %s disabled (requires %s)", moduleID, feature)
        return nil // Return nil to skip, error to fail
    }),
)
```

### Navigation Seeding

The registrar automatically seeds navigation from module menu contributions:

```go
quickstart.NewModuleRegistrar(
    adm, cfg, modules, isDev,
    quickstart.WithSeedNavigation(true),
    quickstart.WithSeedNavigationOptions(func(opts *quickstart.SeedNavigationOptions) {
        opts.ResetMenu = os.Getenv("RESET_NAV_MENU") == "true"
    }),
)
```

---

## Best Practices

1. **Use Panel Module pattern** — For CRUD features, follow the built-in module structure
2. **Check service availability** — Return `FeatureDisabledError` if required services are nil
3. **Resolve defaults from context** — Use `ctx.Admin.config.*` for base path, locale, permissions
4. **Declare feature flags** — Use `Manifest().FeatureFlags` for conditional loading
5. **Implement MenuContributor** — Provide navigation items with proper permissions
6. **Use Repository adapters** — Convert services to panel Repository interface
7. **Gate with permissions** — Set `PanelPermissions` and menu item `Permissions`
8. **Support menu grouping** — Implement `WithMenuParent()` for nested navigation
9. **Test auth paths** — Verify unauthorized users get 403/filtered results
10. **Document permission strings** — List required permissions in module docs

---

## Key Files

| File                              | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `admin/module.go`                 | Public Module interface and ModuleContext         |
| `admin/modules.go`                | Module registration and loading logic             |
| `admin/internal/modules/types.go` | Internal module contracts (Manifest, LoadOptions) |
| `admin/internal/modules/load.go`  | Module ordering and dependency resolution         |
| `admin/profile_module.go`         | Profile module (simplest example)                 |
| `admin/preferences_module.go`     | Preferences module                                |
| `admin/users_module.go`           | Users/roles module (complex example)              |
| `admin/tenants_module.go`         | Tenants and Organizations modules                 |
| `quickstart/module_registrar.go`  | Quickstart module registration helpers            |

---

## See Also

- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) — Template and theme customization
- [Preferences Module Guide](GUIDE_MOD_PREFERENCES.md) — Detailed preferences behavior
- [Auth Guide](AUTH.md) — Authentication and authorization patterns
- [Quickstart README](../quickstart/README.md) — Bootstrap helpers and adapters
- [Architecture & Design](../CLAUDE.md) — Package structure and design principles
- [Debug Module Design](../DEBUGGER_GUI.md) — Advanced module specification
- [Debug Module Tasks](../DEBUGGER_TSK.md) — Implementation task breakdown

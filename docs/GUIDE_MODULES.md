# Module Development Guide

This guide explains how to create, register, and integrate custom modules into go-admin. It covers both the actual built-in module implementations and advanced patterns like the Debug Module for real-time introspection.

## What it provides

- Module interface and manifest system for self-describing features
- Explicit route contracts for mounted modules
- Feature flag integration for conditional module loading
- Navigation menu contribution from modules
- Panel module pattern for CRUD-based admin features
- Repository interface for data access abstraction
- go-dashboard widget integration for module UIs
- Route registration patterns for module endpoints
- Quickstart helpers for streamlined module registration
- i18n support via TranslatorAware interface
- Startup validation and icon contribution hooks
- Security patterns (auth, permissions, redaction)
- Theme payload handoff for module views; see `GUIDE_THEME.md` for the full
  admin/public-site theme contract

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

Search has its own contract split between admin global search, public site
search, and panel list search. See `docs/GUIDE_SEARCH.md` before adding or
replacing module search wiring.

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
    Admin           *Admin
    Router          AdminRouter
    ProtectedRouter AdminRouter
    PublicRouter    AdminRouter
    AuthMiddleware  router.MiddlewareFunc
    Locale          string
    Translator      Translator
    Routing         routing.ModuleContext
}

// AdminRouter is the minimal router surface exposed to modules.
type AdminRouter interface {
    Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
}

// RouteContractProvider exposes the explicit routing contract required for mounted modules.
type RouteContractProvider interface {
    RouteContract() routing.ModuleContract
}

// ModuleStartupValidator can run additional startup checks after module registration.
type ModuleStartupValidator interface {
    ValidateStartup(ctx context.Context) error
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

// IconContributor optionally lets package-internal modules contribute icon libraries
// and definitions during load.
type IconContributor interface {
    IconLibraries() []modules.IconLibrary
    IconDefinitions() []modules.IconDefinition
}
```

MenuContributor is separate from Module; your module should implement Module and
optionally MenuContributor/TranslatorAware. Icon contribution is currently wired
through the internal module loader for go-admin-owned modules.

All registered modules are planned through the routing system and must implement
`RouteContractProvider`. Module routing is no longer inferred. See
`docs/GUIDE_ROUTING.md` for the published slug, route ownership, mount, and
manifest-review contract.

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

| Feature Flag                         | Module ID              | File                                   | Default Registration | Description                          |
| ------------------------------------ | ---------------------- | -------------------------------------- | -------------------- | ------------------------------------ |
| `FeatureUsers`                       | `users`                | `admin/users_module.go`                | Feature-gated        | User and role management             |
| `FeaturePreferences`                 | `preferences`          | `admin/preferences_module.go`          | Feature-gated        | User preferences (theme, layout, UI) |
| Always registered                    | `feature_flags`        | `admin/feature_flags_module.go`        | Yes                  | Feature flag administration entry    |
| `FeatureProfile`                     | `profile`              | `admin/profile_module.go`              | Feature-gated        | Current user profile management      |
| `FeatureTenants`                     | `tenants`              | `admin/tenants_module.go`              | Feature-gated        | Multi-tenant support                 |
| `FeatureOrganizations`               | `organizations`        | `admin/tenants_module.go`              | Feature-gated        | Organization hierarchy               |
| `FeatureMedia`                       | `media`                | `admin/media_module.go`                | Feature-gated        | Media library UI and API routes      |
| Always registered                    | `activity`             | `admin/activity_module.go`             | Yes                  | Activity navigation and integrations |
| `debug` (custom feature key)         | `debug`                | `admin/debug_module.go`                | Manual               | Development introspection            |
| `FeatureCMS`, `FeatureCommands`      | `content_type_builder` | `admin/content_type_builder_module.go` | Manual               | Content type builder                 |

### Profile Module

**File**: `admin/profile_module.go`

User profile management for the currently authenticated user.

| Property     | Value                                          |
| ------------ | ---------------------------------------------- |
| ID           | `profile`                                      |
| Feature Flag | `FeatureProfile`                               |
| Panel Route  | `/admin/profile`                               |
| Entry Mode   | `PanelEntryModeDetailCurrentUser`              |
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
| Permissions  | `UsersPermission`, `UsersCreatePermission`, `UsersImportPermission`, `UsersUpdatePermission`, `UsersDeletePermission`, `RolesPermission` |

Features:

- User listing with filters (status, role)
- Role assignment and permission management
- Search adapter for global user search
- Role form permission matrix with dedicated debug/translation rows and chips-based Additional permissions (see `GUIDES_PERMISSION_MATRIX.md`; for broader auth, permissions, scope, and debugging, see `GUIDE_AUTH_PERMISSIONS.md`)

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

### Feature Flags Module

**File**: `admin/feature_flags_module.go`

Feature flag administration navigation. This module is registered by default and
owns the `feature_flags.index` UI route.

### Media Module

**File**: `admin/media_module.go`

Media library page, list page, admin JSON routes, and optional media delivery
routes. The module is feature-gated by `FeatureMedia`; media delivery routes are
included in the module route contract when delivery configuration enables them.

See `docs/GUIDE_MODULE_MEDIA.md` for detailed behavior.

### Activity Module

**File**: `admin/activity_module.go`

Activity navigation and activity-related integrations. This module is registered
by default and owns the `activity.index` UI route.

See `docs/GUIDE_ACTIVITY.md` for detailed behavior.

### Other Module Implementations

`ContentTypeBuilderModule` is a useful reference for a manually registered
module. `modules/services` is a separate setup integration package rather than
an `admin.Module`; it wires go-services runtime, migrations, and API routes
through its own `Setup(...)` flow.

### Default Module Registration

Built-in modules are auto-registered during initialization. Feature-gated
modules are included only when their gates are enabled; always-on utility
modules are included unless the host registered the same module ID first:

```go
// In admin/modules.go
func (a *Admin) registerDefaultModules() error {
    for _, candidate := range a.defaultModules() {
        if !candidate.enabled {
            continue
        }
        if err := a.registerDefaultModule(candidate.id, candidate.build); err != nil {
            return err
        }
    }
    return nil
}
```

The default module list currently includes `users`, `preferences`,
`feature_flags`, `profile`, `tenants`, `organizations`, `media`, and `activity`.
Duplicate IDs are skipped so host code can register a customized module before
initialization.

---

## 3. Panel Module Pattern

Most built-in modules follow a consistent "Panel Module" pattern that provides CRUD functionality.

### Pattern Overview

1. **Module struct** with configuration fields
2. **Repository adapter** that wraps a service
3. **Panel builder** registration with fields and permissions
4. **Menu items** contribution

### Route Ownership vs Entry Mode

Panel UI behavior has two independent controls:

1. `PanelUIRouteMode` (route ownership)
2. `PanelEntryMode` (what `/admin/<panel>` renders when canonical routes are used)

`PanelUIRouteMode` values:

- `PanelUIRouteModeCanonical` (default): quickstart canonical panel UI routes
  are registered and can honor panel entry mode.
- `PanelUIRouteModeCustom`: module-specific handlers own the UI routes
  entirely; canonical panel UI routes are skipped.

`PanelEntryMode` values:

- `PanelEntryModeList` (default): `/admin/<panel>` renders the list/datagrid.
- `PanelEntryModeDetailCurrentUser`: `/admin/<panel>` resolves current
  authenticated user ID and renders detail for that record.

Use entry mode for reusable package-level behavior (for example self-service
profile screens) without app-specific route overrides.

### Custom UI Route Registration

`PanelUIRouteModeCustom` only declares ownership. It does not register HTTP
handlers.

When a panel is marked custom-owned, quickstart's canonical content-entry route
registrar skips it. The owning module or host must register the actual UI
surface explicitly:

```go
// Example host wiring for the built-in custom-owned roles panel.
if err := quickstart.RegisterRolesUIRoutes(adminUI, cfg, adm); err != nil {
    return err
}
```

If the route exists in URLKit or navigation but no custom UI registrar is called,
the menu can point at a valid-looking path such as `/admin/roles` while the
router still returns 404.

Use this rule for every custom-owned panel:

- Add the route to the module `RouteContract()` or URLKit group so navigation
  and URL helpers can resolve it.
- Register the matching UI handlers on the runtime router.
- Add a route-registration test that asserts the expected GET/POST paths are
  mounted.
- Keep generic content-entry registration for canonical panels only; it will not
  backfill custom-owned panels.

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
    urls             urlkit.Resolver
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
    if m.urls == nil {
        m.urls = ctx.Admin.URLs()
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
        WithEntryMode(PanelEntryModeDetailCurrentUser).
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

// 5. Route contract
func (m *ProfileModule) RouteContract() routing.ModuleContract {
    return routing.ModuleContract{
        Slug: "profile",
        UIRoutes: map[string]string{
            "profile.index": "/",
        },
    }
}

// 6. Menu contribution
func (m *ProfileModule) MenuItems(locale string) []MenuItem {
    if locale == "" {
        locale = m.defaultLocale
    }
    basePath := strings.TrimSpace(m.basePath)
    target := map[string]any{
        "type": "url",
        "key":  "profile",
    }
    if path := resolveURLWith(m.urls, "admin", "profile", nil, nil); path != "" {
        target["path"] = path
    } else {
        target["path"] = joinBasePath(basePath, "profile")
    }
    return []MenuItem{{
        Label:       "Profile",
        LabelKey:    "menu.profile",
        Icon:        "user",
        Target:      target,
        Permissions: []string{m.viewPermission},
        Menu:        m.menuCode,
        Locale:      locale,
        Position:    intPtr(55),
        ParentID:    m.menuParent,
    }}
}

// 7. Optional: menu parent setter
func (m *ProfileModule) WithMenuParent(parent string) *ProfileModule {
    m.menuParent = parent
    return m
}
```

For deeper guidance on `FormFields(...)`, `FormSchema(...)`, go-formgen
rendering, and custom form components, see `GUIDE_FORMGEN.md`.

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
    uiGroupPath   string
}

// NewDebugModule creates a new debug module instance
func NewDebugModule(config DebugConfig) *DebugModule {
    return &DebugModule{config: config}
}
```

### Step 2: Define Configuration

```go
type DebugConfig struct {
    Enabled            bool              // Master enable flag
    CaptureSQL         bool              // Enable SQL query capture
    CaptureLogs        bool              // Enable log streaming
    CaptureRequestBody bool              // Capture request bodies when safe
    CaptureJSErrors    bool              // Capture browser JS errors
    StrictQueryHooks   bool              // Panic on invalid query hook registrations
    MaxLogEntries      int               // Ring buffer size for request/log/js/custom data
    MaxSQLQueries      int               // Ring buffer size for SQL
    MaskFieldTypes     map[string]string // Field-type mask overrides
    MaskPlaceholder    string            // Redaction placeholder
    Panels             []string          // Enabled console panel IDs
    ToolbarMode        bool              // Render toolbar on admin pages
    ToolbarPanels      []string          // Enabled toolbar panel IDs
    ToolbarExcludePaths []string         // Paths where toolbar is hidden
    FeatureKey         string            // Feature gate key (defaults to "debug")
    Permission         string            // Debug view permission
    BasePath           string            // Optional path override
    LayoutMode         DebugLayoutMode   // standalone, admin, or dashboard layout
    PageTemplate       string            // Primary debug template
    DashboardTemplate  string            // go-dashboard template override
    ViewContextBuilder DebugViewContextBuilder
    SecureRequestResolver DebugSecureRequestResolver
    SlowQueryThreshold time.Duration     // Highlight slow queries
    AllowedIPs         []string          // Optional IP allowlist
    AllowedOrigins     []string          // Remote debug origin allowlist
    RemoteEnabled      bool              // Remote identity/token endpoints
    AppID              string            // Remote debug app id
    AppName            string            // Remote debug app name
    Environment        string            // Deployment label
    TokenTTL           time.Duration     // Remote token TTL
    PersistLayout      bool              // Opt-in to layout persistence
    SessionTracking    bool              // Debug session tracking
    SessionCookieName  string            // Debug session cookie name
    SessionInactivityExpiry time.Duration
    Repl               DebugREPLConfig
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

### Step 4: Implement RouteContract

Every registered module must declare the route surfaces it owns:

```go
const (
    debugRouteKey         = "debug_tools.index"
    debugSnapshotRouteKey = "debug_tools.api.snapshot"
)

func (m *DebugModule) RouteContract() routing.ModuleContract {
    return routing.ModuleContract{
        Slug: "debug_tools",
        UIRoutes: map[string]string{
            debugRouteKey:         "/",
            debugSnapshotRouteKey: "/api/snapshot",
        },
    }
}
```

Route tables are relative to the module mount. Use `UIRoutes` for admin UI
pages, `APIRoutes` for admin API routes, and `PublicAPIRoutes` only for
intentional public API exposure.

The debug module keeps console support endpoints under its UI mount so the
entire debug surface shares one access boundary. General reusable modules should
prefer `APIRoutes` for admin JSON APIs.

### Step 5: Implement Register

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
    if path := ctx.Routing.RoutePath(routing.SurfaceUI, debugRouteKey); path != "" {
        m.basePath = path
    }
    if group := strings.TrimSpace(ctx.Routing.Resolved.UIGroupPath); group != "" {
        m.uiGroupPath = group
    }
    if m.collector == nil {
        m.collector = NewDebugCollector(cfg)
    }
    ctx.Admin.debugCollector = m.collector

    m.captureConfigSnapshot(ctx.Admin)
    m.captureRoutesSnapshot(ctx.Admin)
    m.registerDashboardArea(ctx.Admin)
    m.registerDashboardProviders(ctx.Admin)
    m.registerDebugRoutes(ctx)
    m.registerDebugWebSocket(ctx)

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
    if err := a.registerDefaultModules(); err != nil {
        return err
    }

    modulesToLoad := collectRegisteredModules(a.registry.Modules())
    routingContexts, err := a.planModuleRouting(modulesToLoad)
    if err != nil {
        return err
    }

    authMiddleware, publicRouter, protectedRouter := a.moduleRouters()
    return modules.Load(ctx, a.moduleLoadOptions(
        ctx,
        modulesToLoad,
        routingContexts,
        authMiddleware,
        publicRouter,
        protectedRouter,
    ))
}
```

Loading has three important phases:

1. Default modules are added when their feature gates are enabled.
2. The routing planner validates every registered module's `RouteContract()` and
   builds resolved mount paths.
3. Modules load in dependency order with a staged public and protected router.
   Staged routes are committed only after registration and startup validation
   succeed.

`modules.Load` also injects translators, adds contributed menu items, adds
contributed icon libraries/definitions, and skips dependents when an earlier
module was intentionally skipped.

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
debugEnabled := hostConfig.Admin.Debug.Enabled
featureDefaults := map[string]bool{
    "debug": debugEnabled,
}
gate := resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(featureDefaults)))

adm, err := admin.New(cfg, admin.Dependencies{
    FeatureGate: gate,
})
```

Quickstart builds a FeatureGate automatically; override defaults via
`quickstart.WithFeatureDefaults(...)`.

### Host Configuration Example

```go
cfg.Debug = admin.DebugConfig{
    Enabled:       hostConfig.Admin.Debug.Enabled,
    CaptureSQL:    hostConfig.Admin.Debug.Enabled,
    CaptureLogs:   hostConfig.Admin.Debug.Enabled,
    MaxLogEntries: 500,
    MaxSQLQueries: 200,
}
```

Note: go-admin does not parse environment variables directly. Load env in your host config layer, then pass explicit values into go-admin.

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

### Ensuring Correct URLs

Menu links are rendered from `Target["path"]` first, then `Target["name"]` if present. If neither resolves, the UI falls back to the admin base path. To avoid incorrect links (e.g. `/admin`), always resolve through URLKit and provide a base-path fallback.

### Permission Denial Policy

Menu item `Permissions` are evaluated at render/resolve time; route handlers must still enforce authorization independently. Denied entries are hidden by default. Hosts can opt into diagnostic disabled rendering:

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en",
    quickstart.WithNavPermissionDeniedMode(admin.NavigationPermissionDeniedModeDisable),
)
```

Use `disable` outside production to reveal missing role grants while keeping links non-navigable. Use `hide` in production to avoid exposing restricted features. Public site CMS menus use the same `permission_denied_mode` semantics through `quickstart/site.SiteNavigationConfig`.

```go
func (m *MyModule) MenuItems(locale string) []MenuItem {
    if locale == "" {
        locale = m.defaultLocale
    }
    basePath := strings.TrimSpace(m.basePath)
    target := map[string]any{
        "type": "url",
        "key":  "my_module",
    }
    if path := resolveURLWith(m.urls, "admin", "my_module", nil, nil); path != "" {
        target["path"] = path
    } else {
        target["path"] = joinBasePath(basePath, "my-module")
    }

    return []MenuItem{{
        Label:    "My Module",
        LabelKey: "menu.my_module",
        Icon:     "layers",
        Target:   target,
        Menu:     m.menuCode,
        Locale:   locale,
        Position: intPtr(80),
    }}
}
```

For quickstart panel-backed modules, prefer canonical panel URL helpers over
hardcoded paths:

```go
target := map[string]any{
    "type": "url",
    "path": quickstart.ResolveAdminPanelURL(m.urls, m.basePath, "translations"),
    "key":  "translations",
}
```

`ResolveAdminPanelURL(...)` returns the canonical entry route. For panels using
`PanelEntryModeDetailCurrentUser`, that route opens the current-user detail
screen.

Checklist:
- Set `m.urls = ctx.Admin.URLs()` during `Register`, and keep it on the module for menu building.
- Ensure the route exists in URLKit (`defaultAdminRoutes()` or a custom `cfg.URLs.URLKit` group). Missing routes resolve to an empty string.
- Keep the route name and path consistent (e.g. `feature_flags` -> `/feature-flags`).
- For panel-backed menu links, use `quickstart.ResolveAdminPanelURL(...)` so nav targets stay aligned with canonical UI route wiring.

### MenuItem Structure

```go
type MenuItem struct {
    ID            string            // Stable item path/id
    Code          string            // Optional code alias
    Type          string            // item, group, separator
    Label         string            // Display text
    LabelKey      string            // i18n key
    GroupTitle    string            // Group heading
    GroupTitleKey string            // Group heading i18n key
    URLOverride   *string           // Locale-specific URL override
    Target        map[string]any    // Navigation target
    Icon          string            // Icon identifier
    Position      *int              // Menu ordering
    Children      []MenuItem        // Nested items
    Locale        string            // Locale for i18n
    Badge         map[string]any    // Optional badge metadata
    Permissions   []string          // Required permissions
    Menu          string            // Menu code to attach to
    Classes       []string          // Optional UI classes
    Styles        map[string]string // Optional UI styles
    ParentID      string            // Parent item path/id
    ParentCode    string            // Parent item code alias
    Collapsible   bool              // Group can collapse
    Collapsed     bool              // Initial collapsed state
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
        Scope: "admin",
    })

    // Register widget providers for each panel
    for _, panel := range m.config.Panels {
        m.registerPanelWidget(ctx, panel)
    }

    return nil
}
```

### Registering Widget Providers

```go
type DebugPanelWidgetPayload struct {
    Panel string `json:"panel"`
    Label string `json:"label,omitempty"`
    Icon  string `json:"icon,omitempty"`
    Data  any    `json:"data"`
}

func (m *DebugModule) registerPanelWidget(ctx ModuleContext, panelID string) {
    spec := DashboardProviderSpec{
        Code:        "debug." + panelID,
        Name:        m.panelDisplayName(panelID),
        DefaultArea: "admin.debug",
        DefaultSpan: 12,
        Permission:  m.permission,
        Handler:     m.createPanelHandler(panelID),
    }

    ctx.Admin.Dashboard().RegisterProvider(spec)
}

func (m *DebugModule) createPanelHandler(panelID string) WidgetProvider {
    return func(ctx AdminContext, config map[string]any) (WidgetPayload, error) {
        snapshot := m.collector.Snapshot()
        meta := m.panelMeta(panelID)
        return WidgetPayloadOf(DebugPanelWidgetPayload{
            Panel: panelID,
            Label: meta.Label,
            Icon:  meta.Icon,
            Data:  snapshot[panelID],
        }), nil
    }
}
```

Use canonical widget constants for built-in definitions (`admin.Widget...`), and
prefer typed payload structs for handler output. Avoid opaque HTML/script
payload fields and map-shape branching by render mode.

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
| `jserrors` | Browser JS errors     | 12           |
| `permissions` | Permission checks  | 12           |
| `actions`  | Action diagnostics    | 12           |
| `doctor`   | Runtime health checks | 12           |

---

## 9. Route Registration

### Router Access

Modules register routes through `ModuleContext.Router`,
`ModuleContext.ProtectedRouter`, and `ModuleContext.PublicRouter`. Mounted
modules should resolve concrete paths from `ctx.Routing` instead of hardcoding
absolute URLs. The router is only set after `Admin.Initialize`, so guard
against nil if you call registration outside the normal boot flow. If you need
access outside module registration, use `Admin.PublicRouter()` after
initialization.

```go
func (m *MyModule) Register(ctx ModuleContext) error {
    if ctx.Router == nil {
        return errors.New("router is nil")
    }
    indexPath := ctx.Routing.RoutePath(routing.SurfaceUI, "my_module.index")
    dataPath := ctx.Routing.RoutePath(routing.SurfaceAPI, "my_module.data")
    actionPath := ctx.Routing.RoutePath(routing.SurfaceAPI, "my_module.action")

    guard := func(handler router.HandlerFunc) router.HandlerFunc {
        return func(c router.Context) error {
            if !m.allowRequest(c) {
                return ErrForbidden
            }
            return handler(c)
        }
    }

    ctx.ProtectedRouter.Get(indexPath, guard(m.handleIndex))
    ctx.ProtectedRouter.Get(dataPath, guard(m.handleData))
    ctx.ProtectedRouter.Post(actionPath, guard(m.handleAction))
    return nil
}
```

For route-owning modules, implement `RouteContractProvider` and register paths
through `ctx.Routing.RoutePath(...)`. That keeps route ownership, host root
overrides, and manifest export coherent.

### Router Capabilities

If you need router-specific features (groups, WebSocket support, etc.),
type-assert the router to the interface you need and still use the resolved route
path:

```go
type WebSocketRouter interface {
    WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo
}

if ws, ok := ctx.ProtectedRouter.(WebSocketRouter); ok {
    ws.WebSocket(
        ctx.Routing.RoutePath(routing.SurfaceUI, "my_module.ws"),
        router.DefaultWebSocketConfig(),
        m.handleWebSocket,
    )
}
```

Note: If you want navigation to resolve this route via URLKit, keep route keys in
the module contract and route names consistent. Otherwise `resolveURLWith(...)`
will return an empty string and your menu item should provide an explicit
fallback path.

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

// DebugPanelUIProvider optionally adds a declarative rich UI schema.
type DebugPanelUIProvider interface {
    UI() *debugregistry.PanelUI
}

// DebugPanelActionProvider optionally adds action handlers to a rich panel.
type DebugPanelActionProvider interface {
    Actions() map[string]debugregistry.PanelActionHandler
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

For Go-only rich panels, provide a `debug.PanelConfig` with `UI`, or implement
`DebugPanelUIProvider` when registering through `DebugCollector.RegisterPanel`.
The browser hydrates those definitions from the debug panel discovery endpoint
and renders them with shipped schema-driven renderers. Custom TypeScript
`panelRegistry.register(...)` renderers are still appropriate for bespoke
interactions that cannot be expressed with the declarative schema.

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

The `quickstart.RegisterAdminUIRoutes` helper automatically calls `CaptureViewContext` via its `defaultUIViewContextBuilder`. Custom UI route builders should do the same, and should call `quickstart.WithNav(...)` so feature context keys (including `translation_capabilities`, `activity_enabled`, and `body_classes`) are present for template/sidebar gating. Call `quickstart.WithThemeContext(...)` when the view should honor `?theme=` / `?variant=` preview overrides; see `GUIDE_THEME.md`.

```go
// Custom view context builder with debug toolbar support
func customViewContextBuilder(adm *admin.Admin, cfg admin.Config) quickstart.UIViewContextBuilder {
    return func(ctx router.ViewContext, active string, c router.Context) router.ViewContext {
        reqCtx := c.Context()
        // Injects nav/session/theme dependencies + feature context (translation/activity/body classes).
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

For routes registered outside the quickstart helpers, ensure `quickstart.WithNav(...)` and `CaptureViewContext` are called. Add `quickstart.WithThemeContext(...)` when request query theme overrides should be supported:

```go
router.Get("/admin/custom-page", authMiddleware(func(c router.Context) error {
    reqCtx := c.Context()
    viewCtx := quickstart.WithPathViewContext(nil, cfg, quickstart.PathViewContextConfig{
        BasePath: cfg.BasePath,
    })
    viewCtx["title"] = "Custom Page"
    viewCtx = quickstart.WithNav(viewCtx, adm, cfg, "custom", reqCtx)
    viewCtx = quickstart.WithThemeContext(viewCtx, adm, c)
    // Enable debug toolbar (required for toolbar to appear)
    viewCtx = admin.CaptureViewContextForRequest(adm.Debug(), c, viewCtx)

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
    ws, ok := ctx.ProtectedRouter.(WebSocketRouter)
    if !ok {
        return // Router doesn't support WebSocket
    }
    ws.WebSocket(
        ctx.Routing.RoutePath(routing.SurfaceUI, debugWSRouteKey),
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
	    | "jserrors"
	    | "permissions"
	    | "actions"
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

### 2. Authentication Boundary

Debug routes should be mounted on `ProtectedRouter` unless the host explicitly
configures a standalone IP allowlist/access boundary:

```go
func (m *DebugModule) registerRoutes(ctx ModuleContext) {
    if ctx.Router == nil {
        return
    }
    ctx.ProtectedRouter.Get(
        ctx.Routing.RoutePath(routing.SurfaceUI, debugRouteKey),
        m.guard(m.handleDebugDashboard),
    )
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
│   ├── debug_panel_registry.go # Built-in/rich panel definitions
│   ├── debug_integrations.go  # Middleware + log/session/template helpers
│   ├── debug_query_hook.go    # Bun query hook integration
│   ├── debug_transport.go     # Routes + WebSocket handlers
│   └── debug_repl_*.go        # Optional REPL/session support
├── pkg/client/
│   ├── assets/src/debug/
│   │   ├── debug-panel.ts     # Debug panel component
│   │   ├── shared/            # Hydration, registry, schema renderers
│   │   └── toolbar/           # Toolbar/FAB client
│   └── templates/resources/debug/
│       └── index.html         # Debug dashboard template
```

### Module Configuration

```go
debugEnabled := hostConfig.Admin.Debug.Enabled
cfg.Debug = admin.DebugConfig{
    Enabled:            debugEnabled,
    CaptureSQL:         debugEnabled,
    CaptureLogs:        debugEnabled,
    CaptureJSErrors:    debugEnabled,
    MaxLogEntries:      500,
    MaxSQLQueries:      200,
    SlowQueryThreshold: 50 * time.Millisecond,
    Permission:         "admin.debug",
    AllowedIPs:         []string{"127.0.0.1"},
    ToolbarMode:        debugEnabled,
    Panels: []string{
        "template",
        "session",
        "requests",
        "sql",
        "logs",
        "config",
        "routes",
        "custom",
        "jserrors",
        "permissions",
        "actions",
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
- `jserrors`
- `permissions`
- `actions`

Additional panels such as `doctor`, `shell`, and `console` are available when
their supporting runtime/configuration is registered.

### Enable/Disable Guidance

- The module is disabled by default; set `DebugConfig.Enabled=true` to opt in.
- The module also requires the feature gate key (default key is `debug`; override with `DebugConfig.FeatureKey`).
- Without `FeatureDashboard`, the debug module serves its fallback page and API routes.
- With `FeatureDashboard`, debug panels are also registered as dashboard providers; set `LayoutMode` to `dashboard` to opt into dashboard runtime routes/widgets.
- CMS widget persistence is only required for persisted dashboard widget instances, not for the fallback debug console.
- Disable by setting `Enabled=false` or providing an empty `Panels` list.

### Wiring in Host Application

```go
// main.go
func main() {
    cfg := admin.Config{
        BasePath: "/admin",
    }

    debugEnabled := hostConfig.Admin.Debug.Enabled
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
| GET    | `{debug_path}/session/:sessionId/ws` | Session-scoped WebSocket |
| GET    | `{debug_path}/repl/app/ws`      | REPL app WebSocket |
| GET    | `{debug_path}/repl/shell/ws`    | REPL shell WebSocket |
| GET    | `{debug_path}/api/panels`       | Enabled panel definitions |
| GET    | `{debug_path}/api/snapshot`     | Current state snapshot |
| GET    | `{debug_path}/api/sessions`     | Active debug sessions |
| POST   | `{debug_path}/api/clear`        | Clear all buffers      |
| POST   | `{debug_path}/api/clear/:panel` | Clear specific panel   |
| POST   | `{debug_path}/api/panels/:panel/actions/:action` | Run panel action |
| POST   | `{debug_path}/api/doctor/:check/action` | Run doctor action |
| POST   | `{debug_path}/api/errors`       | JS error ingestion when enabled |
| GET/POST | `{debug_path}/api/dashboard...` | Dashboard widget runtime routes |

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
| `WithToolsMenuItems(items...)`         | Append items to the quickstart Tools group |
| `WithSidebarUtilityMenuItems(items...)` | Append fixed sidebar utility links   |
| `WithDefaultSidebarUtilityItems(bool)` | Toggle quickstart-provided utility links |
| `WithSidebarUtilityMenuCode(code)`     | Override the utility menu code        |
| `WithSeedNavigation(bool)`             | Toggle navigation seeding             |
| `WithSeedNavigationOptions(fn)`        | Mutate seed options                   |
| `WithMenuSeedPlanOptions(fn)`          | Mutate the expected generated menu plan |
| `WithMenuSeedParents(items...)`        | Replace quickstart default primary-menu parent groups |
| `WithMenuSeedTargetParentOverride(targetKey, parentID)` | Move rows by stable target key |
| `WithMenuSeedModuleParentOverride(moduleID, parentID)` | Move all rows contributed by a module |
| `WithMenuSeedBaseItemTransform(fns...)` | Adjust quickstart base/capability rows before reconciliation |
| `WithMenuSeedItemTransform(fns...)`    | Adjust module-contributed rows before reconciliation |
| `WithModuleFeatureGates(gates)`        | Enable feature-gated module filtering |
| `WithModuleFeatureDisabledHandler(fn)` | Custom handler for disabled modules   |
| `WithTranslationCapabilityMenuMode(mode)` | Control seeded translation links   |

### Feature Gates in Quickstart

Quickstart builds a FeatureGate when you call `quickstart.NewAdmin(...)`. You can
pass a custom gate via `WithModuleFeatureGates(...)` if you need to override it
for module filtering.

### Handling Disabled Modules

By default, disabled modules are skipped and logged. Use a custom handler when
you want different logging or fail-fast behavior:

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
        opts.Reset = hostConfig.Navigation.ResetMenu
    }),
)
```

Primary and utility menu seeding now reconciles generated rows rather than
blindly appending duplicates. The registrar builds the expected tree with
`BuildMenuSeedPlan`, marks persisted generated rows with quickstart ownership
metadata, preserves host-authored rows, updates stale generated rows, and reports
ambiguous or destructive candidates through `NavigationReconcileReport`.

Use `admin.MenuItem.Position` in module-contributed menu items as a sparse sort
weight, not as a CMS insertion index. Quickstart sorts generated siblings by
that sparse weight and writes compact per-parent positions to CMS-backed menus.
The original generated weight is retained on generated leaf targets as
`_generated_sort_order` for troubleshooting.

Use seed-plan options for host-owned sidebar layout:

```go
quickstart.NewModuleRegistrar(
    adm, cfg, modules, isDev,
    quickstart.WithMenuSeedParents(admin.MenuItem{
        ID:          "host.nav",
        Type:        admin.MenuItemTypeGroup,
        GroupTitle:  "Host Navigation",
        Collapsible: true,
    }),
    quickstart.WithMenuSeedTargetParentOverride("translation_queue", "host.nav"),
    quickstart.WithMenuSeedModuleParentOverride("reports", "host.nav"),
)
```

Base/capability rows are quickstart-owned rows, such as translation dashboard,
queue, assignments, and exchange links. Module item transforms do not see those
rows. Use `WithMenuSeedBaseItemTransform` when the host needs to customize a
quickstart-owned row before generated navigation reconciliation:

```go
quickstart.NewModuleRegistrar(
    adm, cfg, modules, isDev,
    quickstart.WithMenuSeedTargetParentOverride("translation_dashboard", "host.nav"),
    quickstart.WithMenuSeedBaseItemTransform(func(item *admin.MenuItem) {
        if item == nil || item.Target == nil || item.Target["key"] != "translation_dashboard" {
            return
        }
        item.Label = "Translations"
        item.LabelKey = "menu.translations.overview"
        item.Target["name"] = "admin.translations.overview"
        item.Target["breadcrumb_label"] = "Translation Center"
    }),
)
```

Use `WithMenuSeedItemTransform` only for rows returned by module
`MenuItems(locale)` contributors. Hosts that pin `go-admin` and
`go-admin/quickstart` independently should upgrade both together when adopting
base-item transforms so the seed-plan API and generated navigation reconciler
come from compatible releases.

For troubleshooting or migrations, call `ReconcileGeneratedNavigation` with
`Apply: false` first and inspect `Creates`, `Updates`,
`PreservedUserRows`, `DuplicateIdentities`, `DestructiveCandidates`,
`StaleTargetStateCleanup`, `CapabilityOmissions`, and
`PermissionFilteredItems`. Also inspect `RawInventoryUnavailable` and
`RawPresentButNotRendered` before apply so scoped raw-inventory failures or
render-hidden rows are not mistaken for safe fallback behavior. Check
`CoordinationBackend`, `CoordinationScope`, `CoordinationSupported`, and
`CoordinationWarning` before relying on generated-menu convergence during
multi-process or blue-green startup. See `quickstart/README.md` for the full
reconciliation contract.

---

## Best Practices

1. **Use Panel Module pattern** — For CRUD features, follow the built-in module structure
2. **Check service availability** — Return `FeatureDisabledError` if required services are nil
3. **Resolve defaults from context** — Use public helpers such as `ctx.Admin.BasePath()`, `ctx.Admin.URLs()`, `ctx.Admin.DefaultLocale()`, and `ctx.Admin.NavMenuCode()` in external modules; package-internal modules may use lower-level fields when needed
4. **Declare feature flags** — Use `Manifest().FeatureFlags` for conditional loading
5. **Implement MenuContributor** — Provide navigation items with proper permissions
6. **Use Repository adapters** — Convert services to panel Repository interface
7. **Gate with permissions** — Set `PanelPermissions` and menu item `Permissions`
8. **Support menu grouping** — Implement `WithMenuParent()` for nested navigation
9. **Test auth paths** — Verify unauthorized users get 403/filtered results
10. **Document permission strings** — List required permissions in module docs
11. **Use `WithNav` in custom handlers** — Keep `translation_capabilities`, activity flags, and sidebar/session payload consistent with built-in routes
12. **Declare route ownership** — Implement `RouteContract()` and register concrete paths through `ctx.Routing.RoutePath(...)`
13. **Mount custom-owned UI routes** — `PanelUIRouteModeCustom` panels are skipped by canonical content-entry routing, so call the owning route registrar explicitly
14. **Use startup validation sparingly** — Implement `ModuleStartupValidator` only for checks that must run after module registration

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
| `admin/feature_flags_module.go`   | Feature flags navigation module                   |
| `admin/media_module.go`           | Media module UI/API route owner                   |
| `admin/activity_module.go`        | Activity navigation module                        |
| `admin/content_type_builder_module.go` | Manually registered CMS builder module        |
| `quickstart/module_registrar.go`  | Quickstart module registration helpers            |

---

## See Also

- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) — Template customization and view engine layering
- [Theme Guide](GUIDE_THEME.md) — Admin go-theme wiring, theme payloads, and public-site theme isolation
- [Preferences Module Guide](GUIDE_MOD_PREFERENCES.md) — Detailed preferences behavior
- [Media Module Guide](GUIDE_MODULE_MEDIA.md) — Media module configuration and delivery
- [Activity Guide](GUIDE_ACTIVITY.md) — Activity module and widget integrations
- [Search Guide](GUIDE_SEARCH.md) — Admin global search, public site search, and go-search adapters
- [Debug Module Guide](GUIDE_DEBUG_MODULE.md) — Debug module configuration and APIs
- [Routing Guide](GUIDE_ROUTING.md) — Module route ownership and mount policy
- [Authentication and Permissions Guide](GUIDE_AUTH_PERMISSIONS.md) — Auth, permission, scope, and debug workflow
- [Auth Guide](AUTH.md) — Authentication and authorization patterns

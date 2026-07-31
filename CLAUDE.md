# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`go-admin` is a composable, router-agnostic admin panel library for Go. It combines JSON APIs, server-rendered admin views, embedded frontend assets, and optional quickstart wiring. The library follows a modular design where features are orchestrated through the central `Admin` struct and exposed through routes, panels, commands, widgets, navigation, and template/view helpers.

The repository contains five Go modules:
- **Root module** (`github.com/goliatone/go-admin`): The core admin library in `admin/`
- **Quickstart submodule** (`github.com/goliatone/go-admin/quickstart`): Opt-in defaults and bootstrap helpers that bundle heavier integrations (Fiber, go-dashboard, go-formgen, go-theme). Import core for minimal deps; import quickstart for turnkey setup.
- **go-sync nested module** (`github.com/goliatone/go-sync`): Revision-safe resource sync runtime incubated under `pkg/go-sync`
- **go-lifecycle nested module** (`github.com/goliatone/go-lifecycle`): Framework-neutral lifecycle runner incubated under `pkg/go-lifecycle`
- **go-translation-ai nested module** (`github.com/goliatone/go-translation-ai`): Generic AI translation providers, with the go-admin adapter under `pkg/go-translation-ai/adapters/goadmin`

Concrete translation workflow code is opt-in through `github.com/goliatone/go-admin/pkg/go-translations`. Quickstart hosts should prefer `github.com/goliatone/go-admin/quickstart/translations`.

## Project Context Workflow

This repository uses `.ctx/` as canonical feature context. Before meaningful feature work, read `.ctx/README.md`, then the relevant `.ctx/specs/<feature>/REQUIREMENTS.md`, `DESIGN.md`, and `TASKS.md`. Keep requirements, design, and task state in their own files. Do not create ad hoc planning markdown files unless explicitly requested.

## Common Development Tasks

### Running Tests

```bash
# All tests in the project
./taskfile dev:test

# Verbose tests with CMS logs
./taskfile dev:test:verbose

# Race condition detection
./taskfile dev:race

# Single test by name
go test ./admin -run TestName -v

# Tests in a specific package
go test ./admin/...
go test ./examples/web/...

# Test coverage report
./taskfile dev:cover
```

### Running the Examples

```bash
# Enterprise admin example (full features) — http://localhost:8080/admin
cd examples/web && GO111MODULE=on go run .
# Auth: username/password format is <username>.pwd (e.g. admin/admin.pwd)

# Commerce example (lightweight) — bearer token printed on startup
cd examples/commerce && go run .

# E-sign workflow example — document signing workflows
cd examples/esign && go run .

# Admin shell example — CLI admin interface
cd examples/admin-shell && go run ./cmd/admin
```

### Updating Dependencies

```bash
# Update all goliatone/* modules to latest
./taskfile go:mod:update
```

### Creating a Release

```bash
# Bumps .version, tags both root and quickstart, pushes, generates CHANGELOG
./taskfile release [patch|minor|major] ["Custom message"]

# Optional: include temporary manual notes in the next changelog entry
$EDITOR .release-notes.md
./taskfile release minor
```

The release process creates two tags per release: `v{tag}` and `quickstart/v{tag}`, then generates the changelog with git-cliff. The root and quickstart modules are published; `examples` is a repository-only workspace module. Release preflight ignores untracked files, rejects tracked working-tree changes, and rejects mismatched coordinated tags. Preparation tests root and quickstart with workspace mode disabled, validates quickstart against the local root before either tag exists, removes that temporary replacement before committing, and advances examples development metadata. If preparation, commit, tagging, or the atomic push fails, the task restores the pre-release version, changelog, module files, sums, Git index, and manual notes; incomplete recovery preserves its snapshot.

Manual release notes are optional and temporary. If `.release-notes.md` exists with non-whitespace content, the release task passes it to git-cliff, renders it into the new `CHANGELOG.md` release section, then removes `.release-notes.md` after changelog generation succeeds. The file is ignored by git and should not be committed. Use `RELEASE_NOTES_FILE=path` or `./taskfile release --notes path` to use another untracked scratch file. Put migration guidance here when it needs to ship in the release notes without relying on a special commit message.

## Architecture

### Core Orchestration

The `Admin` struct (`admin/admin.go`) is the central orchestrator. It bootstraps services, registers routes, and manages panels, dashboard widgets, navigation, search, settings, notifications, jobs, and activity feeds.

Initialization flow:
1. Create `Admin` with `Config` (feature flags, theme, base path)
2. Attach optional services via `WithAuth()`, `WithAuthorizer()`, `WithThemeProvider()`
3. Call `Initialize(router)` which bootstraps CMS, widget areas, menus, settings, registers API/UI routes, and wires up dashboard providers

The quickstart module (`quickstart/admin_bootstrap.go`) provides `NewAdmin()` and `NewAdminConfig()` to reduce boilerplate. It wires features, backend adapters, and validates dependencies automatically. The examples use quickstart for initialization.

### Router Abstraction

Router-agnostic via `AdminRouter` interface (`admin/router_iface.go`):
```go
type AdminRouter interface {
    Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
    Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
}
```

### Panels

Panels (`admin/panel.go`) provide CRUD functionality via the `Repository` interface:
```go
type Repository interface {
    List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
    Get(ctx context.Context, id string) (map[string]any, error)
    Create(ctx context.Context, record map[string]any) (map[string]any, error)
    Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
    Delete(ctx context.Context, id string) error
}
```

Panel routes: `{BasePath}/api/{panelName}` with standard REST endpoints plus `/actions/:action` and `/bulk/:action` for command execution.

### Command Bus

`CommandBus` (`admin/command_bus.go`) wires handlers into `go-command` registry/dispatcher. Commands implement `command.Commander[Msg]` (or `command.Querier[Msg, Result]`), messages provide `Type() string`. Panel actions and HTTP endpoints call `CommandBus.DispatchByName` which builds a message via the registered factory and dispatches through `dispatcher.Dispatch`.

### Feature System

Features (`admin/features.go`) are enabled via `Config.Features` flags. Each feature is a `FeatureKey` constant (`dashboard`, `cms`, `search`, `settings`, `users`, `tenants`, `organizations`, `profile`, `preferences`, `media`, `export`, `bulk`, `jobs`, `commands`, `notifications`, `translations.exchange`, `translations.queue`, and translation QA gates). Dependencies between features are validated at initialization; missing dependencies raise `INVALID_FEATURE_CONFIG` with an `issues` list.

### AdminContext

`AdminContext` (`admin/context.go`) carries request-scoped information (UserID, TenantID, OrgID, Locale, Theme, Translator) into panel operations.

### Dashboard & Widgets

The `Dashboard` (`admin/dashboard.go`) manages widget areas and instances using `goliatone/go-dashboard`. Requires CMS persistence (`Features.CMS = true`). Widget definitions and instances are stored via CMS. Modules register widget providers via `Dashboard().RegisterWidget(spec, handler)`.

### Other Services

- **Navigation** (`admin/navigation.go`): Resolves menu items from CMS, filtered by `Authorizer` permissions
- **Search** (`admin/search.go`): Registry of searchable providers, exposed at `/admin/api/search`
- **Settings** (`admin/settings.go`): Hierarchical settings with scopes (system, site, user), form schema generation via `SettingsFormAdapter`
- **Notifications** (`admin/notifications.go`): In-memory inbox with unread tracking
- **Activity** (`admin/activity.go`): Timestamped activity entries (actor, action, object)
- **Jobs** (`admin/jobs.go`): Resolves `command.CronCommand` registrations, exposes metadata, triggers via dispatcher

### Theming

Theme flows through: base theme from `Config` → optional `ThemeProvider` for dynamic selection → tokens merged and injected into panel schemas, settings forms, and API responses.

### CMS Integration

`CMSContainer` interface (`admin/cms.go`) abstracts widget and menu services. `NoopCMSContainer` provides in-memory defaults. The CMS read/write split uses `AdminPageReadService` for reads and `AdminPageWriteService` via `PageApplicationService` for writes (see `docs/GUIDE_CMS.md`).

### Optional Translation Workflow

Core `admin` keeps generic localization primitives, public extension hooks, and narrow transport-neutral contracts needed by optional packages. Translation workflow routes, repositories, queue/family/exchange bindings, OpenAPI artifacts, and migration providers live in `pkg/go-translations`. Core admin does not register translation route steps by default. Quickstart hosts should import `quickstart/translations` and use `translations.WithProductConfig`, `translations.WithExchangeConfig`, or `translations.WithQueueConfig`.

Canonical translation queue UI path is `/admin/translations/queue`; `/admin/content/translations` is a compatibility alias.

## Key Interfaces

When extending the library:
1. **Repository**: CRUD operations for custom data sources
2. **Authorizer**: `Can(ctx, permission, resource) bool` for access control
3. **Authenticator**: `Wrap(c router.Context) error` for authentication middleware
4. **ThemeProvider**: `func(ctx, ThemeSelector) (*ThemeSelection, error)` for dynamic themes
5. **CMSContainer**: Swap `NoopCMSContainer` with persistent CMS backend

## JSON API Patterns

- API routes return JSON via `writeJSON()` / `writeError()` helpers (`admin/http_helpers.go`)
- Payloads use `snake_case` for JSON keys
- Error codes: `FORBIDDEN` (403), `FEATURE_DISABLED` (404), `INVALID_FEATURE_CONFIG` (400)
- Validation errors: `{"error": "validation failed", "fields": {"key": "message"}}`
- Authentication: Bearer token via `Authenticator` interface; go-auth provides JWT with role-based permissions

## Testing Conventions

- Test files colocated as `*_test.go` alongside implementation
- Uses `testify` for assertions (`require`, `assert`) and `testify/mock` for mocking
- Test coverage expected for core orchestration, panel operations, settings validation, and command dispatch

## Dependencies & Local Development

### Go Version
Requires Go 1.26.4. If you have go version mismatch issues, use the repository's configured Go toolchain or `go` when available.

### Module Structure
The root `go.mod` has local replaces for quickstart and the incubated runtime modules:
```
replace github.com/goliatone/go-admin/quickstart => ./quickstart
replace github.com/goliatone/go-sync => ./pkg/go-sync
replace github.com/goliatone/go-lifecycle => ./pkg/go-lifecycle
replace github.com/goliatone/go-translation-ai => ./pkg/go-translation-ai
```
The quickstart `go.mod` has a reciprocal replace plus additional local replaces for development:
```
replace github.com/goliatone/go-admin => ..
replace github.com/goliatone/go-router => ../../go-router
replace github.com/goliatone/go-cms => ../../go-cms
replace github.com/goliatone/go-lifecycle => ../pkg/go-lifecycle
replace github.com/goliatone/go-sync => ../pkg/go-sync
replace github.com/goliatone/go-translation-ai => ../pkg/go-translation-ai
```

The nested runtime modules should also be tested from their own module roots:
```bash
cd pkg/go-sync && go test ./...
cd pkg/go-lifecycle && go test ./...
cd pkg/go-translation-ai && go test ./...
```

### Local Packages
All `goliatone/*` packages are available locally at `/Users/goliatone/Development/GO/src/github.com/goliatone`. If you need to work against a local version of a dependency, add a replace directive pointing to the sibling directory.

### Core Libraries
- `go-router`: Router abstraction (examples use Fiber v2 adapter)
- `go-auth`: JWT authentication and authorization
- `go-cms`: CMS backend for content, widgets, menus
- `go-crud`: CRUD operations and repository patterns
- `go-dashboard`: Dashboard widget system
- `go-users`: User and role management
- `go-command`: Command bus pattern
- `go-theme`: Theme configuration and tokens
- `bun` (uptrace): SQL toolkit / ORM
- `testify`: Testing assertions and mocks

## Environment Variables

The `examples/web` app loads `examples/web/config/app.json` and supports nested `APP_*` overrides. Keep detailed env documentation in `examples/web/README.md`; do not duplicate the full matrix here.

| Variable | Description |
|----------|-------------|
| `APP_ADMIN__ERRORS__DEV_MODE=true` | Enable dev-mode error output in `examples/web` |
| `APP_ADMIN__DEBUG__ENABLED=true` | Enable the example app debug module/config |
| `APP_ADMIN__SCOPE__MODE=single\|multi` | Configure example app tenant/org scope mode |
| `APP_ADMIN__SCOPE__DEFAULT_TENANT_ID=<uuid>` | Configure default tenant for single-scope examples |
| `APP_ADMIN__SCOPE__DEFAULT_ORG_ID=<uuid>` | Configure default org for single-scope examples |
| `APP_DATABASES__CMS_DSN=<dsn>` | Configure persistent go-cms database DSN |
| `APP_DATABASES__CONTENT_DSN=<dsn>` | Configure content database DSN |
| `APP_SEEDS__ENABLED=true` | Enable fixture loading |
| `APP_SEEDS__TRUNCATE=true` | Reseed fixtures from scratch |
| `APP_NAVIGATION__RESET_MENU=true` | Reset persistent navigation before seeding |
| `APP_NAVIGATION__PERMISSION_DENIED_MODE=disable` | Render permission-denied menu rows as disabled diagnostics |
| `APP_TRANSLATION__PROFILE=none\|core\|core+exchange\|core+queue\|full` | Select quickstart translation profile |
| `APP_TRANSLATION__EXCHANGE=true\|false` | Override exchange module enablement |
| `APP_TRANSLATION__QUEUE=true\|false` | Override queue module enablement |

Site runtime (quickstart/site): `SITE_RUNTIME_ENV`, `SITE_CONTENT_ENV`, `SITE_ENV`

Full current example reference: `examples/web/README.md` and `examples/web/config/app.json`.

## Frontend Assets

The `pkg/client/` directory contains:
- `assets/` - Frontend source (TypeScript, CSS) with Vite build
- `templates/` - Embedded Pongo2 templates for admin UI

To rebuild frontend assets:
```bash
cd pkg/client/assets && npm install && npm run build
```

## Documentation Reference

The `docs/` directory contains detailed guides for specific features. Use this table to find the right guide:

| Guide | Description | When to Use |
|-------|-------------|-------------|
| `GUIDE_CMS.md` | CMS module with localization, approval workflows, content previews, and menu management | Managing multi-language content, implementing content workflows, menu systems |
| `GUIDE_MODULES.md` | Module architecture, panel module pattern, feature flags, navigation, widget integration | Creating custom modules, building CRUD-based admin features |
| `GUIDE_FRONTEND.md` | Frontend architecture, behavior layer, enhanced actions, and `go-sync` usage | Building or changing browser behavior and asset code |
| `GUIDE_UI_PRIMITIVES.md` | Shared UI primitives, template partials, busy states, and data attributes | Reusing existing UI patterns instead of creating one-off markup |
| `GUIDE_ROUTING.md` | Admin route groups, URL resolution, and route registration contracts | Adding routes, URL keys, aliases, or route-aware modules |
| `GUIDE_AUTH_PERMISSIONS.md` | Auth, authorization, scope, and permission diagnostics | Changing permissions, authorizers, role grants, or auth debug behavior |
| `GUIDES_PERMISSION_MATRIX.md` | Role form permission matrix and split debug/translation permission fields | Updating role permission UI or permission round-tripping |
| `GUIDE_VIEW_CUSTOMIZATION.md` | Template packaging, view engine wiring, customizing views/helpers/themes | Customizing admin UI templates, overriding themes, adding template helpers |
| `GUIDE_FEATURE_GATES.md` | Feature gating configuration at different scopes, built-in feature keys | Enabling/disabling features, configuring runtime toggles |
| `GUIDE_TRANSLATION.md` | Optional translation package, exchange, queue lifecycle, workflow operations | Bulk translating content, external translation integration |
| `GUIDE_ONBOARDING.md` | Securelink-driven onboarding (invite, password reset, self-registration), token lifecycle | User registration, invite flows, password resets |
| `GUIDE_MOD_PREFERENCES.md` | Preferences module for multi-scope user settings, theme selection, dashboard layout | Implementing user preferences, theme switching |
| `GUIDE_ACTIVITY.md` | Activity read API, query parameters, pagination, permissions | Building activity logs/audit trails, filtering user actions |
| `GUIDE_DEBUG_MODULE.md` | Real-time SQL capture, HTTP logging, server logs, config inspection | Development-time introspection, SQL analysis, request debugging |
| `GUIDE_DEBUG_CLIENT.md` | Frontend TypeScript debug architecture, panel registry, error collection | Debugging frontend issues, extending JS debug infrastructure |
| `GUIDE_TAB_WIDGETS.md` | Widget-backed tabs in panel detail views, rendering modes (SSR/hybrid/client) | Adding custom tabs to detail pages, integrating widgets into panels |
| `GUIDE_DASHBOARD_WIDGETS.md` | Dashboard widget system, widget providers, SSR/client rendering, payload contracts | Building dashboard widgets, widget area configuration |
| `GUIDE_BLOCK_EDITOR.md` | Block editor component setup, drag/drop, schema versioning, validation | Building modular content editors with drag-and-drop blocks |
| `GUIDE_DEVELOPMENT.md` | Shared development playbook, implementation patterns, testing, logging | General development workflow, standardizing code patterns |

Additional references:
- `quickstart/README.md`: Bootstrap helpers, adapter hooks, and quickstart module API
- `pkg/client/`: Embedded templates and static assets

## Important Development Guidelines

- **File Creation**: ALWAYS prefer editing existing files over creating new ones. Only create files when absolutely necessary.
- **Documentation**: NEVER proactively create documentation files (*.md) or README files unless explicitly requested.
- **Task Focus**: Do what has been asked; nothing more, nothing less.

# go-admin Web Example

A complete reference implementation demonstrating the `go-admin` library with production-ready integrations including go-auth authentication, activity tracking, settings management, and multi-tenant support.

## Features

This example demonstrates:

- ✅ **Authentication & Authorization** via [go-auth](https://github.com/goliatone/go-auth)
- ✅ **Activity Tracking** with hooks pattern and dashboard integration
- ✅ **User, Role, Profile & Preferences Management** powered by go-users on shared SQLite (panels, search, onboarding, go-crud JSON APIs)
- ✅ **Multi-Tenant Support** with organizations and tenant isolation
- ✅ **Dynamic Settings** with hierarchical scopes (system/site/user)
- ✅ **CMS Integration** with widget areas and navigation menus
- ✅ **Command Pattern** for actions, jobs, and CLI operations
- ✅ **Search Engine** with typeahead and cross-resource queries
- ✅ **Notification System** with unread tracking
- ✅ **Advanced Sidebar Navigation** with collapse, groups, separators, submenus, and LabelKey/GroupTitleKey i18n
- ✅ **Panel CRUD** for Users, Pages, Posts, Media with filtering and bulk actions
- ✅ **Job Registry** with cron metadata for scheduling
- ✅ **Theme System** with dynamic tokens and variant support

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+ (for Tailwind CSS build)

### Running the Example

```bash
# From the repo root
cd pkg/client/assets

# Install frontend dependencies (Tailwind + TS build)
npm install

# Build CSS + JS bundles
npm run build

# Run the server
cd ../../examples/web
go run .

# Run the server
go run .
```

The server starts at `http://localhost:8080/admin`

If you are iterating on the `quickstart` submodule locally, make sure the root
module resolves it via either:
- a `replace github.com/goliatone/go-admin/quickstart => ./quickstart` entry in
  the root `go.mod`, or
- a `go.work` file that includes `./quickstart`.

### API Endpoints

- **Health**: `GET /admin/health`
- **Dashboard HTML** (SSR): `GET /admin/dashboard` - Server-side rendered dashboard with inline state
- **Dashboard JSON**: `GET /admin/api/dashboard` - JSON API (backwards compatible)
- **Navigation**: `GET /admin/api/navigation`
- **Settings**: `GET /admin/api/settings`, `POST /admin/api/settings`
- **Search**: `GET /admin/api/search?query=...`
- **Notifications**: `GET /admin/api/notifications`
- **Activity**: `GET /admin/api/activity?limit=50&offset=0&channel=users` (filters: `user_id`, `actor_id`, `verb`, `object_type`, `object_id`, `channel`/`channels`, `channel_denylist`, `since`, `until`, `q`; response includes `entries`, `total`, `next_offset`, `has_more`; defaults: limit 50, max 200, offset 0; ordered by most recent first).
- **Jobs**: `GET /admin/api/jobs`, `POST /admin/api/jobs/:name/trigger`
- **Users Panel**: `GET /admin/api/users`, `POST /admin/api/users`, etc.
- **Roles Panel**: `GET /admin/api/roles`, `POST /admin/api/roles`, etc.
- **User Actions**: `/admin/api/users/:id/{activate,suspend,disable,archive,reset-password,invite}` plus `/admin/api/users/bulk/{activate,suspend,disable,archive,assign-role,unassign-role}` (mirrored under `/admin/crud/users/...`).
- **Profile & Preferences**: `GET/POST /admin/api/profile`, `GET/POST /admin/api/preferences`
- **Onboarding**: `POST /admin/api/onboarding/invite`, `POST /admin/api/onboarding/password/reset/request`, `POST /admin/api/onboarding/password/reset/confirm`, `POST /admin/api/onboarding/register` (flagged)
- **Users CRUD API**: `GET /admin/crud/users` (go-crud JSON endpoints)
- **Tenants Panel**: `GET /admin/api/tenants`
- **Organizations Panel**: `GET /admin/api/organizations`
- **Session**: `GET /admin/api/session` (current authenticated user snapshot)

## Stage 1 quickstart helpers

If you want a minimal Stage 1 admin (login + dashboard only), the quickstart helpers provide a smaller wiring surface:
- `WithFeaturesExplicit(DefaultMinimalFeatures())` for typed feature flags.
- `WithAdapterFlags(config.Admin.AdapterFlags)` to drive adapter wiring from config (env fallback still available).
- `FeatureGatesFromConfig(cfg)` with `WithModuleFeatureGates(...)` to filter modules/menu items.
- `WithGoAuth(...)` to wire auth + authorizer in one call.
- `WithDefaultDashboardRenderer(...)` for a basic SSR dashboard (override templates via `WithDashboardTemplatesFS`).

### Preferences quickstart

```go
adm, err := quickstart.NewAdminWithGoUsersPreferences(
	cfg,
	deps.PreferenceRepo,
	quickstart.EnablePreferences(),
)
if err != nil {
	return err
}
_ = adm
```

If `/admin/api/preferences` returns 403, grant `admin.preferences.view` and `admin.preferences.edit`.

### Content UI (Pages, Posts, Media)

- HTML CRUD screens live at `/admin/pages`, `/admin/posts`, `/admin/media` (auth + permissions enforced: `admin.pages.*`, `admin.posts.*`, `admin.media.*`).
- Actions include create/edit/delete plus publish/unpublish (pages) and publish/archive (posts); media supports add/edit/delete metadata.
- Navigation highlights the active item; search results link to the new views.

### Content persistence (SQLite + go-repository-bun)

- CRUD APIs (`/admin/crud/{pages,posts,media}`) are backed by SQLite via go-repository-bun stores; go-cms migrations from `../go-cms/data/sql/migrations` are applied on startup with a light overlay that creates `admin_pages`, `admin_posts`, and `media` demo tables for the example flows.
- Configure the DSN with `CONTENT_DATABASE_DSN` (preferred), falling back to `CMS_DATABASE_DSN`, else `file:/tmp/go-admin-cms.db?cache=shared&_fk=1`; stores seed once when the tables are empty using the demo fixtures.
- Controllers also register plural aliases (`/admin/crud/posts`, `/admin/crud/posts/:id`, `/admin/crud/posts/batch`, etc.) so the DataGrid and HTML flows keep using plural paths while hitting the DB.
- Smoke: create/edit/delete a page, post, and media item via the UI or `/admin/crud/{resource}`; restart the server and confirm the records persist and still filter/sort in the lists.

## Sidebar Navigation & Quickstart defaults

- Navigation can be seeded via `quickstart.SeedNavigation` in `examples/web/setup/navigation.go` (set `USE_NAV_SEED=true`); by default the app uses module menu contributions with `quickstart.EnsureDefaultMenuParents` so grouped/collapsible nav renders without seeding. Menus are addressed by slug (`cfg.NavMenuCode`) for deterministic IDs; reset persistent menus with `RESET_NAV_MENU=true` or delete `/tmp/go-admin-cms.db` when switching sources.
- Sidebar templates/assets come from quickstart embeds (collapse + submenu persistence); override by layering your own template/assets FS via `quickstart.NewViewEngine` options in `examples/web/main.go`.
- Menu items include both `Label`/`LabelKey` and `GroupTitleKey`; modules can nest under seeded groups via `ParentID`.
- Collapse state persists (`admin-sidebar-collapsed`), submenu state persists per submenu key, and `NAV_DEBUG=true` exposes the ordered nav JSON in the sidebar (`NAV_DEBUG_LOG=true` logs payload).
- Logo shrinks in collapsed mode; separators and group titles remain visible.

## Template Functions

- The view engine uses `quickstart.DefaultTemplateFuncs`, which includes `singularize`, `pluralize`, `toJSON`, `dict`, `formatNumber`, and widget title helpers. These are helpers (globals) in Pongo2, so call them like `{{ singularize(resource_label|default:resource)|title }}`.
- Example-specific widget title labels are configured in `examples/web/helpers/template_funcs.go` via `helpers.TemplateFuncOptions()`.
- To add custom template functions while keeping defaults, use `quickstart.MergeTemplateFuncs` and pass the result to `quickstart.WithViewTemplateFuncs` in `examples/web/main.go`.

### Sidebar Manual QA

- Toggle collapse/expand, refresh, and confirm state persists.
- Expand/collapse `Content` and `My Shop`; child links persist across reloads.
- Group titles and separators render once after permission filtering; no duplicate children on reseed.
- In collapsed mode, text hides while icons stay aligned; submenu chevrons hide until expanded.
- With `NAV_DEBUG=true`, verify nav JSON matches rendered order; with `NAV_DEBUG_LOG=true`, payload logs once per build.

## Session Widget & API

- Sidebar footer now renders the current session from go-auth (`helpers.BuildSessionUser` via `helpers.WithNav`), showing display name/email plus role/tenant when available; guest state falls back to “Not signed in.”
- Authenticated snapshot is also available at `GET /admin/api/session` (mirrors the footer payload: id/subject/email/username/role/tenant/org/resource_roles/scopes/issued_at/expires_at).
- QA: login as admin/editor/viewer and confirm the footer avatar initial and labels match the account; collapse the sidebar to hide text; call `/admin/api/session` with the issued token and expect 200 with populated fields; without/expired token the auth middleware returns 401 and the footer shows Guest/Not signed in.

## Adding a new CRUD resource (HTML)

1) **Routes & guards**: define routes under `/admin/<resource>` with auth middleware and permission checks (`admin.<resource>.read/create/edit/delete`). See `handlers/users.go` and `handlers/tenants.go`.
2) **URL helper**: use `helpers.NewResourceRoutes(basePath, resource)` to build `index/new/show/edit/delete` URLs. Avoid hardcoding strings.
3) **Handlers**: populate generic view keys: `resource`, `resource_label`, `routes`, `items` (list), `columns` (list headers), `resource_item` (detail/form), `fields` (detail sections), `is_edit`, `form_action`, `form_method`. Attach `actions` per row via `routes.ActionsMap(id)`.
4) **Templates**: place views at `pkg/client/templates/resources/<resource>/list.html`, `detail.html`, `form.html`. The generic templates for users/tenants show how to render the shared keys.
5) **Data shape**: return maps with snake_case fields; keep consistent keys across resources so the same template structure works.
6) **Smoke**: list/create/edit/delete, verify guards (401/403 for unauthorized), and ensure menu visibility matches permissions.

## User Detail Tabs (Example)

- Users detail renders a tab strip sourced from `schema.tabs` in the admin detail payload.
- Tabs are registered for the `users` panel in `examples/web/modules.go` and include Activity + Profile.
- The detail handler (`examples/web/handlers/users.go`) calls the admin detail API and maps tabs to view links; the template renders `tabs`.
- If you change the tab targets, ensure the routes exist (e.g., `/admin/activity`) or update the target to a panel/path that does.
- Tab content is resolved by a host-app resolver (`helpers.TabContentResolver`) and render mode selector (`helpers.TabRenderModeSelector`) to support SSR, hybrid, or client-only strategies.
- Inline tabs (content kinds: `details`, `dashboard_area`, `cms_area`, `template`) link back to the detail URL with `?tab=<id>`, while navigation tabs keep their `panel/path/external` targets.
- The detail handler reads `?tab` and sets `active_tab` (defaults to `details`) for consistent deep linking.
- Hybrid tabs fetch HTML from `/admin/users/:id/tabs/:tab` on demand; client tabs fetch JSON from `/admin/api/users/:id/tabs/:tab`.
- The detail template includes a lightweight loader that swaps the tab panel for `data-render-mode="hybrid|client"` tabs and updates the URL to preserve deep links.

## Authentication

### go-auth Integration

The example uses production-ready go-auth integration via `setup/auth.go`:

```go
func SetupAuth(adm *admin.Admin, dataStores *stores.DataStores) {
    cfg := demoAuthConfig{signingKey: "web-demo-secret"}
    provider := &demoIdentityProvider{users: dataStores.Users}

    auther := auth.NewAuthenticator(provider, cfg)
    routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)

    // Wire go-auth to admin
    adm.WithAuth(admin.NewGoAuthAuthenticator(routeAuth, cfg), &admin.AuthConfig{
        LoginPath:    "/admin/login",
        LogoutPath:   "/admin/logout",
        RedirectPath: "/admin",
    })

    // Wire authorization
    adm.WithAuthorizer(admin.NewGoAuthAuthorizer(admin.GoAuthAuthorizerConfig{
        DefaultResource: "admin",
    }))
}
```

### Demo Authentication Tokens

When the server starts, it logs JWT tokens for demo users:

```
demo Authorization tokens (use Authorization: Bearer <token>):
  - admin (admin): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  - editor (editor): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  - viewer (guest): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Use these tokens in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/admin/api/dashboard
```

## User management (go-users + go-crud)

- Users/roles/profiles/preferences are backed by go-users on the shared SQLite DSN (`CMS_DATABASE_DSN`); seeds create admin/editor/viewer/inactive with passwords `<username>.pwd`, and demo JWTs are printed from the DB on startup.
- go-auth reads users from go-users and issues resource roles for `admin.users.*`, `admin.roles.*`, `admin.profile.*`, `admin.preferences.*` (admin → owner, editor → member, viewer → none); profile/preferences remain self-service even when broader perms are absent.
- Panels (`/admin/api/users|roles|profile|preferences`), navigation, search, and `/admin/crud/users` all run through the same scope guard and permissions; unauthorized tokens get 403s and the menu hides.
- Onboarding flags live in `main.go` (`users.invite` ✅, `users.password_reset` ✅, `users.signup` ❌ by default with allowlist mode). Override with `USE_USER_INVITES`, `USE_PASSWORD_RESET`, `USE_SELF_REGISTRATION`, `REGISTRATION_MODE` (`open|allowlist|closed`), and `REGISTRATION_ALLOWLIST`. Endpoints sit under `/admin/api/onboarding/*` for invite, accept/verify, reset request/confirm, and optional self-registration.
- Lifecycle transitions, admin-triggered invites/password resets, and bulk role assign/unassign live under `/admin/api/users/*` (also `/admin/crud/users/*`) and emit `users` channel activity for the dashboard widget/search feeds.
- Lifecycle actions (activate/suspend/disable/archive) and role assignment emit activity to the `users` channel and surface in the dashboard activity widget; preferences persist via go-users `PreferenceRepository`.
- Quick wiring/seed notes live in `docs/prds/EXAMPLE_USERS_TDD.md`; the smoke checklist is in `docs/prds/EXAMPLE_SMOKE.md`.

### Onboarding + Secure Links

- Securelink env vars: `ADMIN_SECURELINK_KEY`, `ADMIN_SECURELINK_BASE_URL`, `ADMIN_SECURELINK_QUERY_KEY`, `ADMIN_SECURELINK_AS_QUERY`, `ADMIN_SECURELINK_EXPIRATION`.
- The example falls back to a demo signing key when `ADMIN_SECURELINK_KEY` is unset (see `examples/web/setup/securelink.go`).
- Default securelink paths: `/admin/invite`, `/admin/register`, `/admin/password-reset` (base path mirrors `ADMIN_BASE_PATH`).
- API endpoints remain under `/admin/api/onboarding/*`; UI routes are registered in `examples/web/main.go` with custom view context for token parsing and policy hints.
- Errors follow the go-errors response shape with `error.text_code` (see `docs/GUIDE_ONBOARDING.md` for the canonical list).

### JSON CRUD Smoke (Users)

Use the demo tokens to exercise the go-crud JSON endpoints (snake_case payloads) backed by the same go-users SQLite store:

1. List users: `curl -H "Authorization: Bearer <token>" http://localhost:8080/admin/crud/users`
2. Create: `curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"username":"api.user","email":"api.user@example.com","role":"editor","status":"active"}' http://localhost:8080/admin/crud/user`
3. Update: `curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"status":"inactive"}' http://localhost:8080/admin/crud/user/<id>`
4. Delete: `curl -X DELETE -H "Authorization: Bearer <token>" http://localhost:8080/admin/crud/user/<id>`

### Swapping Identity Providers

The `demoIdentityProvider` can be replaced with any implementation of `auth.IdentityProvider`:

```go
type IdentityProvider interface {
    VerifyIdentity(ctx context.Context, identifier, password string) (Identity, error)
    FindIdentityByIdentifier(ctx context.Context, identifier string) (Identity, error)
}
```

For production, replace with a database-backed provider:

```go
// Example: PostgreSQL-backed provider
type PostgreSQLIdentityProvider struct {
    db *sql.DB
}

func (p *PostgreSQLIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
    // Query database, verify password hash
    // Return user identity
}
```

## Dashboard Rendering (SSR + Hydration)

The example demonstrates hybrid server-side rendering with client-side hydration for optimal performance and user experience.

### Architecture

- **Server-Side Rendering (SSR)**: Complete HTML is rendered server-side with widgets and data
- **Client Hydration**: JavaScript attaches behaviors to existing DOM without re-rendering
- **Zero API Fetches**: Initial page load requires no additional API calls
- **Backwards Compatible**: JSON API (`/admin/api/dashboard`) remains available

### How It Works

1. **Server renders complete HTML** at `/admin/dashboard` using Go templates
2. **Inline state** is embedded as JSON in the page for hydration
3. **WidgetGrid client** attaches drag-and-drop, resize, and visibility behaviors
4. **Layout changes** persist via AJAX to `/admin/api/dashboard/preferences`

### Performance Benefits

- **<200ms initial render** (server-side, no API waterfall)
- **Instant interactivity** (behaviors attach to existing DOM)
- **SEO-friendly** (fully rendered HTML)
- **Reduced bandwidth** (single request vs. multiple API calls)

### Implementation

The dashboard renderer is wired in `main.go`:

```go
// Wire dashboard renderer for server-side rendering
dashboardRenderer, err := setup.NewDashboardRenderer()
if err != nil {
    log.Printf("warning: failed to initialize dashboard renderer (falling back to JSON API): %v", err)
} else {
    if dashboard := adm.Dashboard(); dashboard != nil {
        dashboard.WithRenderer(dashboardRenderer)
        log.Println("Dashboard SSR enabled")
    }
}
```

Template: `pkg/client/templates/dashboard_ssr.html`
Renderer: `renderers/dashboard_renderer.go`
Hydration: `assets/src/dashboard/widget-grid.ts`

### Routes

- **SSR**: `GET /admin/dashboard` - Full HTML page with inline state
- **JSON API**: `GET /admin/api/dashboard` - JSON payload (backwards compatible)
- **Preferences**: `GET/POST /admin/api/dashboard/preferences` - Layout persistence

### Customizing Templates

The renderer uses Go's `html/template` with custom functions:

- `toJSON` - Serialize data for inline state
- `getWidgetTitle` - Human-readable widget titles
- `formatNumber` - Locale-aware number formatting
- `safeHTML` - Render trusted HTML

Example widget template:

```html
{{define "widgetContent"}}
  {{if eq .definition "admin.widget.user_stats"}}
    <div class="metrics">
      {{$values := index .data "values"}}
      {{range $key, $value := $values}}
        <div class="metric">
          <small>{{$key}}</small>
          <span>{{formatNumber $value}}</span>
        </div>
      {{end}}
    </div>
  {{end}}
{{end}}
```

### Disabling SSR

To revert to JSON-only rendering, simply don't wire the renderer:

```go
// Comment out renderer wiring in main.go
// dashboardRenderer, err := setup.NewDashboardRenderer()
```

The dashboard will automatically fall back to the JSON API endpoint.

### Dashboard Persistence

The dashboard uses `goliatone/go-dashboard` with CMS-backed persistent storage. Widgets and user layout preferences are stored in the database and survive server restarts.

**Prerequisites:**
- CMS persistence must be enabled (`USE_PERSISTENT_CMS=true`)
- Dashboard feature enabled (`Features.Dashboard = true`, default)

**Run with persistent dashboard:**
```bash
USE_PERSISTENT_CMS=true go run .
```

**Expected behavior:**
- Dashboard widgets persist across server restarts
- Layout preferences saved to database via go-options or go-users
- Widget data fetched from CMS widget store
- Activity hooks integrated with dashboard events
- Console log shows: `Dashboard: go-dashboard (persistent, requires CMS)`

**Verify integration:**
```bash
# Start server
USE_PERSISTENT_CMS=true go run . &

# Test JSON API
curl -s http://localhost:8080/admin/api/dashboard | jq '.areas[0].widgets[0].id'

# Test HTML SSR
curl -s http://localhost:8080/admin | grep "dashboard-state"

# Test preferences persistence
curl -s -X POST http://localhost:8080/admin/api/dashboard/preferences \
  -H "Content-Type: application/json" \
  -d '{"areas":{"admin.dashboard.main":[{"id":"widget-1","span":6}]}}'
```

## Activity Tracking

### Activity Hooks Pattern

The example demonstrates the activity hooks pattern with bidirectional flow:

1. **Admin Activity Feed** → Dashboard Hooks
2. **Command Execution** → Dashboard Hooks
3. **Panel CRUD Operations** → Activity Sink

See `main.go` for the composite activity sink setup; env flags can swap the primary sink:

- `USE_GO_USERS_ACTIVITY=true` enables the go-users sink when available; otherwise falls back to in-memory.
- `USE_PERSISTENT_CMS=true` swaps to the persistent CMS via the quickstart adapter hook; falls back to in-memory.
- `USE_GO_OPTIONS=true` swaps the settings backend to go-options; falls back to in-memory settings.

```go
dashboardHooks := dashboardactivity.Hooks{
    dashboardactivity.HookFunc(func(ctx context.Context, event dashboardactivity.Event) error {
        log.Printf("[Dashboard Activity] %s %s %s:%s",
            event.ActorID, event.Verb, event.ObjectType, event.ObjectID)
        return nil
    }),
}
dashboardCfg := dashboardactivity.Config{
    Enabled: true,
    Channel: "admin",
}

compositeActivitySink := quickstart.NewCompositeActivitySink(
    adm.ActivityFeed(),
    dashboardHooks,
    dashboardCfg,
)
adm.WithActivitySink(compositeActivitySink)
```

### Activity Events

Commands emit activity events via the hooks pattern:

```go
type UserActivateCommand struct {
    store         *stores.UserStore
    activityHooks activity.ActivityHookSlice
}

func (c *UserActivateCommand) Execute(ctx admin.AdminContext) error {
    // ... perform activation ...

    c.activityHooks.Notify(ctx.Context, activity.Event{
        Channel:    "users",
        Verb:       "activated",
        ObjectType: "user",
        ObjectID:   userID,
        Data: map[string]any{
            "email": user.Email,
            "name":  user.Name,
        },
    })
    return nil
}
```

### Activity backends & smoke

- Flag: `USE_GO_USERS_ACTIVITY=true` swaps the activity sink to the go-users adapter (`examples/web/setup/activity.go`) while keeping dashboard hooks and the in-memory fallback buffer.
- Smoke (in-memory): start normally, create a page (`POST /admin/api/pages`), update a post (`PUT /admin/api/posts/<id>`), delete a media item (`DELETE /admin/api/media/<id>`), then `GET /admin/api/activity?limit=10` and confirm `entries` show `page:<id>`, `post:<id>`, `media:<id>` with actor + metadata.
- Smoke (go-users): restart with the flag, repeat the same create/update/delete calls, and verify `/admin/api/activity` still returns the new events in `entries` with intact IDs/actors; toggle the flag off again to confirm the feed keeps working.

## Persistent CMS (go-cms + Bun/SQLite)

- Flag: `USE_PERSISTENT_CMS=true` swaps the CMS container to go-cms using the Bun storage adapter (`examples/web/setup/cms_persistent.go`). Default DSN is `file:/tmp/go-admin-cms.db?cache=shared&_fk=1`; override with `CMS_DATABASE_DSN`.
- Migrations: applied automatically at startup via go-persistence-bun using the embedded go-cms SQL migrations (no manual migration step needed).
- Requirements: SQLite driver (sqliteshim is bundled; no additional install) and write access to the DSN path.
- Smoke:
 1. `USE_PERSISTENT_CMS=true go run ./examples/web` → logs show `CMS backend: go-cms (sqlite)`.
  2. Call `GET /admin/api/navigation` and confirm menus load; stop the server, restart with the same DSN, and confirm the menu payload still resolves (data persisted).
  3. Optional: point `CMS_DATABASE_DSN` to a different file path and confirm a fresh database is created with the same migrations applied.

## Content (Pages + Posts)

- Pages and Posts panels now swap to the go-cms backend when `USE_PERSISTENT_CMS=true` (using the container from `examples/web/setup/cms_persistent.go`); with the flag off they use the in-memory stores seeded with demo content.
- Navigation seeds a `Content` parent guarded by `admin.pages.*`/`admin.posts.*`; the go-auth role provider now issues matching resource roles so the menu and panels hide for unauthorized tokens.
- CMS-backed stores emit `page:<id>`/`post:<id>` activity (actor + slug/status metadata) and drive search adapters from go-cms data, keeping search and activity aligned with the persistent backend.
- Smoke: `USE_PERSISTENT_CMS=true CMS_DATABASE_DSN=file:/tmp/go-admin-cms.db?cache=shared&_fk=1 go run ./examples/web`, create/edit/delete a page and a post via `/admin/pages` and `/admin/posts`, confirm `/admin/api/search?query=<slug>` returns them and `/admin/api/activity?limit=5` shows create/update/delete in `entries` with correct actors; turn the flag off to fall back to the seeded in-memory content without errors.

## User & Role Management

The example includes a complete user management module (`admin/users.go`) with:

- `UserManagementService` - orchestrates CRUD and role assignments
- `UserRepository` and `RoleRepository` interfaces
- `InMemoryUserStore` - default in-memory implementation
- `GoUsersUserRepository` and `GoUsersRoleRepository` - go-users adapters

### Using In-Memory Store (Default)

```go
service := admin.NewUserManagementService(nil, nil)
// Uses InMemoryUserStore for both users and roles
```

### Using go-users Adapters

See `../../docs/prds/ADMIN_REFACTOR.md#role-assignment-lookup-system-vs-custom-roles` for context on filtering system roles from custom role assignments.

```go
import users "github.com/goliatone/go-users/pkg/types"

authRepo := // your go-users AuthRepository
inventory := // your go-users UserInventoryRepository
roleRegistry := // your go-users RoleRegistry

userRepo := admin.NewGoUsersUserRepository(authRepo, inventory, scopeResolver)
roleRepo := admin.NewGoUsersRoleRepository(roleRegistry, scopeResolver)

service := admin.NewUserManagementService(userRepo, roleRepo)
service.WithRoleAssignmentLookup(admin.UUIDRoleAssignmentLookup{})
service.WithActivitySink(adm.ActivityFeed())
```

## Multi-Tenant Support

The example seeds demo tenants and organizations:

```go
if svc := adm.TenantService(); svc != nil {
    tenant, _ := svc.SaveTenant(ctx, admin.TenantRecord{
        Name:   "Acme Corp",
        Slug:   "acme",
        Status: "active",
        Domain: "acme.local",
        Members: []admin.TenantMember{
            {UserID: "user-1", Role: "owner"},
        },
    })
}
```

Panels are registered for tenants and organizations:

- `/admin/api/tenants` - Tenant CRUD
- `/admin/api/organizations` - Organization CRUD

## Settings Management

Dynamic settings with hierarchical scopes (system/site/user):

- Default in-memory backend: `setup.SetupSettings(adm)` via `setup/settings.go`
- go-options backend: set `USE_GO_OPTIONS=true` to route through `setup.SetupSettingsWithOptions(adm)` in `setup/settings_options.go` (adds go-options scope metadata + snapshot IDs, seeds a site override for `features.release_channel`)

Endpoints:
- `GET /admin/api/settings/form` - Form schema with current values + go-options scopes
- `POST /admin/api/settings` - Update settings with validation

Go-options flag smoke checklist:
- `USE_GO_OPTIONS=true go run ./examples/web` then hit `/admin/api/settings/form` → `scopes` include `source: go-options` and snapshot IDs; `features.release_channel` shows `scope: site`
- POST `/admin/api/settings` with `{ "values": { "performance.cache_ttl": -1 }, "scope": "site" }` → `400` with `fields.performance.cache_ttl` error and `metadata.scope` in response
- POST `/admin/api/settings` with `{ "values": { "features.release_channel": "stable" }, "scope": "site" }` → subsequent GET returns `provenance: site` and the new value

## Modules

The example demonstrates the module pattern:

### Registering Modules

```go
type usersModule struct {
    store *stores.UserStore
}

func (m *usersModule) Manifest() admin.ModuleManifest {
    return admin.ModuleManifest{
        ID:             "users",
        NameKey:        "modules.users.name",
        DescriptionKey: "modules.users.description",
    }
}

func (m *usersModule) Register(ctx admin.ModuleContext) error {
    // Register panels, commands, search providers
    return nil
}

adm.RegisterModule(&usersModule{store: dataStores.Users})
```

### Built-in Modules

- Users Module - user management panel with activate/deactivate commands
- Pages Module - CMS pages with publish/unpublish
- Posts Module - blog posts with categories
- Media Module - file uploads with metadata
- Tenants Module - multi-tenant management
- Organizations Module - organization hierarchy
- Preferences Module - user preferences
- Profile Module - user profile management

## Command Pattern

Commands are first-class operations triggered via:
- Panel actions (single record)
- Bulk actions (multiple records)
- Jobs (scheduled/manual)
- CLI (if implementing `CommandWithCLI`)

### Implementing Commands

```go
type UserActivateCommand struct {
    store         *stores.UserStore
    activityHooks activity.ActivityHookSlice
}

func (c *UserActivateCommand) Name() string {
    return "users:activate"
}

func (c *UserActivateCommand) Execute(ctx admin.AdminContext) error {
    userID := ctx.Context.Value("user_id").(string)
    // ... perform activation ...
    c.activityHooks.Notify(ctx.Context, activity.Event{...})
    return nil
}

// Optional: CLI metadata
func (c *UserActivateCommand) CLIMetadata() admin.CLIMetadata {
    return admin.CLIMetadata{
        Path:        "users:activate",
        Description: "Activate a user account",
        Flags: []admin.CLIFlag{
            {Name: "user-id", Type: "string", Required: true},
        },
    }
}
```

### Registering Commands

```go
activateCmd := commands.NewUserActivateCommand(m.store).
    WithActivityHooks(activityAdapter)

ctx.Admin.Commands().Register(activateCmd)
```

## Extending the Example

### Adding a New Module

1. Create module struct implementing `admin.Module`
2. Implement `Manifest()` and `Register(ctx admin.ModuleContext)`
3. Register panels, commands, search providers in `Register()`
4. Wire activity hooks if needed
5. Register module in `main.go`

### Adding a New Panel

```go
builder := ctx.Admin.Panel("my-resource").
    WithRepository(myRepo).
    ListFields(
        admin.Field{Name: "name", Label: "Name", Type: "text"},
        admin.Field{Name: "status", Label: "Status", Type: "select"},
    ).
    FormFields(
        admin.Field{Name: "name", Label: "Name", Type: "text", Required: true},
    ).
    WithFilters(
        admin.Filter{Field: "status", Label: "Status", Type: "select", Options: statusOptions},
    ).
    WithActions(
        admin.Action{
            Name:    "my-action",
            Label:   "My Action",
            Command: "my-resource:my-action",
        },
    )
```

### Swapping Adapters

The example uses in-memory implementations by default. Swap with production adapters:

**Authentication**: Replace `demoIdentityProvider` with database-backed provider

**Settings**: Wire go-options registry (Phase 18 adapter available)

**Activity**: Set `USE_GO_USERS_ACTIVITY=true` to use the go-users ActivityLogger adapter (Phase 17) defined in `setup/activity.go`. The example wires the read path with `admin.Dependencies{ActivityRepository: usersDeps.ActivityRepo, ActivityAccessPolicy: activity.NewDefaultAccessPolicy()}` in `examples/web/main.go` so `/admin/api/activity` uses the go-users policy.

**CMS**: Wire go-cms persistent container (Phase 20 adapter available)

## Architecture

### Directory Structure

```
examples/web/
├── main.go                  # Application entry point
├── modules.go               # Module registration
├── commands/                # Command implementations
│   ├── user_commands.go
│   ├── page_commands.go
│   ├── post_commands.go
│   └── media_commands.go
├── handlers/                # HTTP handlers
├── helpers/                 # Utility functions
├── jobs/                    # Job definitions
├── pkg/activity/            # Activity hooks package
├── search/                  # Search providers
├── setup/                   # Setup functions
│   ├── auth.go             # go-auth integration
│   ├── dashboard.go        # Dashboard widgets
│   └── settings.go         # Settings definitions
├── stores/                  # Data stores (in-memory)
├── pkg/client/templates/    # HTML templates
└── openapi/                 # OpenAPI specs
```

```
pkg/client/assets/     # Admin client assets (source + dist)
```

### Integration Points

- **Authenticator**: `admin.WithAuth(authenticator, authConfig)`
- **Authorizer**: `admin.WithAuthorizer(authorizer)`
- **Activity Sink**: `admin.WithActivitySink(sink)`
- **Theme Provider**: `admin.WithThemeProvider(provider)`
- **CMS Container**: `admin.Config.CMS.Container`

## Production Considerations

### Security

- **Replace demo signing key**: Use environment variable for JWT secret
- **HTTPS**: Enable TLS in production
- **CORS**: Configure allowed origins
- **Rate Limiting**: Implement per-user rate limits
- **Session Storage**: Use Redis/PostgreSQL instead of in-memory

### Database

- **Persistent Storage**: Replace in-memory stores with PostgreSQL/MySQL
- **Migrations**: Use go-migrate or similar
- **Connection Pooling**: Configure appropriate pool sizes

### Monitoring

- **Activity Logging**: Ship activity events to log aggregator
- **Metrics**: Export Prometheus metrics
- **Tracing**: Integrate OpenTelemetry

### Deployment

- **Environment Variables**: Externalize configuration
- **Health Checks**: Monitor `/admin/health` endpoint
- **Graceful Shutdown**: Handle SIGTERM signals
- **Horizontal Scaling**: Ensure session state is shared

## References

- [go-admin Core Documentation](../../README.md)
- [ADMIN_TDD.md](../../docs/prds/ADMIN_TDD.md) - Architecture decisions
- [ADMIN_TSK.md](../../docs/prds/ADMIN_TSK.md) - Implementation tasks
- [DASH_TDD.md](../../DASH_TDD.md) - Dashboard SSR technical design
- [DASH_TSK.md](../../DASH_TSK.md) - Dashboard SSR implementation plan
- [go-auth](https://github.com/goliatone/go-auth) - Authentication library
- [go-users](https://github.com/goliatone/go-users) - User management
- [go-options](https://github.com/goliatone/go-options) - Settings management
- [go-dashboard](https://github.com/goliatone/go-dashboard) - Dashboard widgets

## License

See root LICENSE file

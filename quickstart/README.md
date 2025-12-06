# Quickstart Defaults

The quickstart package bundles opt-in defaults for go-admin so hosts can get a working admin with minimal wiring while keeping override hooks.

## What’s included
- Navigation: idempotent seeding (`SeedNavigation`), deterministic ordering, permission filtering, collapsible state, `NAV_DEBUG` logging/JSON, and view helpers (`WithNav`, `BuildNavItems`).
- Sidebar: embedded templates/partials and assets (CSS/JS) with collapse + submenu persistence; apps can override by adding their own template/assets FS ahead of the defaults.
- Error handling: Fiber error handler that returns JSON for API paths and renders the branded error page (with nav/theme/session) for HTML routes.
- Adapters: env-flagged wiring for persistent CMS (`USE_PERSISTENT_CMS`), go-options settings (`USE_GO_OPTIONS`), and go-users activity sink (`USE_GO_USERS_ACTIVITY`) with safe in-memory fallbacks.
- Auth debug: `GoAuthAuthorizer` supports `AUTH_DEBUG=true` or config flag for structured decision logging (logger injectable).

## Flags and debug
- `USE_PERSISTENT_CMS=true` – swap to persistent CMS via provided hook.
- `USE_GO_OPTIONS=true` – swap settings backend to go-options adapter.
- `USE_GO_USERS_ACTIVITY=true` – use go-users activity sink if available.
- `RESET_NAV_MENU=true` – reset target menu before seeding (backends must expose reset hook).
- `NAV_DEBUG=true` – include nav JSON in views; `NAV_DEBUG_LOG=true` – log nav payload.
- `AUTH_DEBUG=true` – emit structured auth decisions.

## Overrides
- Templates/Assets: prepend your own FS via `AddTemplatesFS`/`AddAssetsFS` to override the embedded sidebar.
- Navigation seed: pass custom items to `SeedNavigation`; module menu contributions are deduped by ID.
- Error handler: swap `quickstart.NewFiberErrorHandler` with your own if needed.

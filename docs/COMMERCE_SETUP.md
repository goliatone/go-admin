# Commerce Example Setup Guide

This guide explains how the `examples/commerce` demo wires go-admin. See the
[CMS guide](GUIDE_CMS.md) and [routing guide](GUIDE_ROUTING.md) for current
runtime and integration conventions.

## Router + Auth
- Router: the demo uses the Fiber adapter from `go-router` (`router.NewFiberAdapter`), mounting under `Config.BasePath` (`/admin`). Any router that implements `admin.AdminRouter` works; new hosts should use the owned surfaces described in `GUIDE_ROUTING.md`.
- Authenticator: go-auth HTTP authenticator via `admin.NewGoAuthAuthenticator`, expecting `Authorization: Bearer <token>` headers. Startup logs print demo tokens for seeded users (see `examples/commerce/auth.go`).
- Authorizer: `admin.NewGoAuthAuthorizer` maps permission strings to go-auth claims/roles; replace with your own authorizer if you enforce a different policy model.

## CMS + Theme
- Feature gate defaults enable `cms` (and `dashboard`), so the in-memory CMS services back navigation and widget storage by default. Replace via `adm.UseCMS(realCMSContainer)`.
- Theme selection uses the default `Config.Theme`/`ThemeVariant`; provide a
  `go-theme` selector through `adm.WithAdminTheme(...)` or quickstart
  `WithThemeSelector(...)`. See `docs/GUIDE_THEME.md`.

## Feature Flags + Optional Slices
- Feature gate defaults are set in `main.go` (`dashboard`, `search`, `commands`, `jobs`, `cms`).
- Optional slices (export/bulk/media/settings/notifications) remain disabled to keep the example lean; enable them by adding keys to the feature defaults map and satisfy the dependencies in `GUIDE_FEATURE_GATES.md`.
- Commands and cron hooks are provided through `commerce.restock_low` (CLI) and `commerce.daily_report` (cron) to illustrate transport-agnostic handlers.

## Where to Look
- Wiring entrypoint: `examples/commerce/main.go`
- Auth: `examples/commerce/auth.go`
- Panels and modules: `examples/commerce/panels.go`, `examples/commerce/modules.go`
- Dashboard/search/commands: `examples/commerce/dashboard.go`, `examples/commerce/search.go`, `examples/commerce/commands.go`
- Seed data: `examples/commerce/stores/stores.go`

Run the demo with:
```
cd examples/commerce
go run .
```

API checkpoints (all under `/admin`): `/api/dashboard`, `/api/navigation`, `/api/users`, `/api/products`, `/api/orders`, `/api/search`, `/api/jobs`. Include an `Authorization: Bearer <token>` header from the startup log.

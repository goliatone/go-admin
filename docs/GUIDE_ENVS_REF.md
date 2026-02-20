# `ADMIN_*` Environment Flags Reference

Canonical reference for runtime `ADMIN_*` flags in this repo.

- Scope: keys read by Go runtime code (`*.go`, excluding tests).
- Last updated: February 13, 2026.
- Note: `ADMIN_UNAVAILABLE` is not an env var; it is an internal error text code.

| Name | Description | Possible values | Default value |
|---|---|---|---|
| `ADMIN_ADDR` | Listen address for `examples/web` server. | `<host>:<port>` or `:<port>` | `:8080` |
| `ADMIN_API_PREFIX` | Overrides admin API prefix (`cfg.URLs.Admin.APIPrefix`). | non-empty path segment | `api` |
| `ADMIN_API_VERSION` | Overrides admin API version segment (`cfg.URLs.Admin.APIVersion`). | version segment (for example `v1`) or empty | empty |
| `ADMIN_ASSETS_DIR` | Forces static assets to be served from disk path before embedded fallback. | directory path | auto-detect disk assets, then embedded assets |
| `ADMIN_BASE_PATH` | Base path used by securelink helpers for route generation. | path (for example `/admin`) | `/admin` |
| `ADMIN_DEBUG` | Enables debug mode. When `true`, bootstrap defaults also enable toolbar + SQL/log/JS/request capture unless explicitly overridden by specific flags. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_DEBUG_ALLOWED_IPS` | Allowed IP list for debug access controls. | comma/semicolon-separated IP list | empty |
| `ADMIN_DEBUG_ALLOWED_ORIGINS` | Allowed origins for remote debug endpoints. | comma/semicolon-separated origins | empty |
| `ADMIN_DEBUG_APP_ID` | Application instance identifier exposed by debug integration. | string | empty |
| `ADMIN_DEBUG_APP_NAME` | Human-readable app name for debug integration. | string | empty |
| `ADMIN_DEBUG_ENVIRONMENT` | Environment label for debug integration. | string | empty |
| `ADMIN_DEBUG_JS_ERRORS` | Toggles JavaScript error capture panel/feed. | boolean (`strconv.ParseBool`) | `false` (auto-set `true` when `ADMIN_DEBUG=true` unless overridden) |
| `ADMIN_DEBUG_LAYOUT` | Debug page layout mode. | `admin`, `standalone` | `standalone` |
| `ADMIN_DEBUG_LOGS` | Toggles server log capture in debug tooling. | boolean (`strconv.ParseBool`) | `false` (auto-set `true` when `ADMIN_DEBUG=true` unless overridden) |
| `ADMIN_DEBUG_REMOTE` | Enables remote debug identity/token endpoints. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_DEBUG_REPL` | Enables debug REPL. If enabled and sub-modes are unset, both app and shell REPL modes are enabled. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_DEBUG_REPL_READONLY` | Sets REPL read-only mode. | boolean (`strconv.ParseBool`) | `true` |
| `ADMIN_DEBUG_REQUEST_BODY` | Toggles request-body capture in debug tooling. | boolean (`strconv.ParseBool`) | `false` (auto-set `true` when `ADMIN_DEBUG=true` unless overridden) |
| `ADMIN_DEBUG_SCOPE` | Enables scope-resolution debug capture panel in quickstart host apps that wire it. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_DEBUG_SCOPE_LIMIT` | In-memory scope debug ring-buffer limit. | positive integer | `200` |
| `ADMIN_DEBUG_SESSION_COOKIE` | Cookie name for debug session tracking. | string | `admin_debug_session` |
| `ADMIN_DEBUG_SESSION_EXPIRY` | Session inactivity timeout for debug session tracking. | Go duration string (for example `30m`, `1h`) | `30m` |
| `ADMIN_DEBUG_SESSION_GLOBAL_PANELS` | Includes global panels in session views. | boolean (`strconv.ParseBool`) | `true` |
| `ADMIN_DEBUG_SESSION_TRACKING` | Enables debug session tracking. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_DEBUG_SLOG` | Controls debug slog bridge activation in example apps when debug mode is active. | disabled only when exactly `false` or `0`; any other value enables | enabled |
| `ADMIN_DEBUG_SQL` | Toggles SQL query capture in debug tooling. | boolean (`strconv.ParseBool`) | `false` (auto-set `true` when `ADMIN_DEBUG=true` unless overridden) |
| `ADMIN_DEBUG_TOKEN_TTL` | Override for debug exchange token TTL. | Go duration string | unset (uses integration default) |
| `ADMIN_DEBUG_TOOLBAR` | Enables injected debug toolbar. | boolean (`strconv.ParseBool`) | `false` (auto-set `true` when `ADMIN_DEBUG=true` unless overridden) |
| `ADMIN_DEBUG_TOOLBAR_PANELS` | Panel IDs shown in debug toolbar. | comma/semicolon-separated panel IDs | when toolbar is on: `requests,sql,logs,jserrors,routes,config` |
| `ADMIN_DEFAULT_ORG_ID` | Default org ID applied in single-tenant scope mode. | UUID string | `22222222-2222-2222-2222-222222222222` |
| `ADMIN_DEFAULT_TENANT_ID` | Default tenant ID applied in single-tenant scope mode. | UUID string | `11111111-1111-1111-1111-111111111111` |
| `ADMIN_DEV` | Enables error dev-mode behavior (`cfg.Errors.DevMode`). | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_ERROR_EXPOSE_INTERNAL` | Exposes internal error messages to clients. | boolean (`strconv.ParseBool`) | `false` (becomes `true` when dev mode is enabled) |
| `ADMIN_ERROR_NONPROD` | Non-production override used by Fiber error presenter for auto dev-mode behavior when runtime env is non-prod. | boolean (`strconv.ParseBool`) | if unset: treated as `true` for non-prod env names; ignored in prod/unknown env |
| `ADMIN_ERROR_STACKTRACE` | Forces stack traces in error responses outside dev mode. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_FEATURE_CATALOG` | Explicit feature catalog file path for `examples/web`. | file path | first existing of: `feature_catalog.yaml`, `examples/web/feature_catalog.yaml`, `feature_catalog.yml`, `examples/web/feature_catalog.yml` |
| `ADMIN_PASSWORD_POLICY_HINTS` | UI password hint overrides for onboarding templates. | comma-separated strings | built-in hints: min length, complexity, avoid reuse |
| `ADMIN_PREFERENCES_JSON_STRICT` | Enables strict JSON validation for preferences raw JSON editor in `examples/web`. | `true` to enable; any other value disables | `false` |
| `ADMIN_PREFERENCES_SCHEMA` | Overrides preferences schema source for preferences module. | file path or directory containing `schema.json` | empty (module default schema) |
| `ADMIN_PREVIEW_SECRET` | Preview token signing/validation secret. | string | `admin-preview-secret-change-me` |
| `ADMIN_PUBLIC_API` | Enables/disables admin public API exposure in `examples/web`. | boolean (`strconv.ParseBool`) | `true` in `examples/web` bootstrap |
| `ADMIN_REGISTER_TEMPLATE` | Template name used for the registration page in `examples/web`. | template name | `register` |
| `ADMIN_ROUTE_CONFLICT_POLICY` | Route conflict action for Fiber adapter registration. | `panic`, `log_and_skip` (`log-skip`, `skip`), `log_and_continue` (`log-continue`, `continue`) | derived: `panic` when strict routes are enabled, else `log_and_continue` |
| `ADMIN_ROUTE_PATH_CONFLICT_MODE` | Path conflict mode for Fiber adapter static/param sibling resolution. | `prefer_static` (`prefer-static`, `preferstatic`, `static`), `strict` | `prefer_static` |
| `ADMIN_SCOPE_MODE` | Scope behavior mode. | `single`, `multi` | `single` |
| `ADMIN_SECURELINK_AS_QUERY` | Securelink token placement mode. | boolean (`true/false/1/0/yes/no/on/off`) | `true` |
| `ADMIN_SECURELINK_BASE_URL` | Base URL for securelink generation. | absolute URL | `http://localhost:8080` |
| `ADMIN_SECURELINK_EXPIRATION` | Securelink token expiration. | Go duration string | `72h` |
| `ADMIN_SECURELINK_KEY` | Securelink signing key. | string | quickstart helpers: empty (manager disabled); `examples/web`: demo fallback key if unset |
| `ADMIN_SECURELINK_QUERY_KEY` | Query key name for securelink tokens. | string | `token` |
| `ADMIN_SEEDS` | Master toggle for fixture seeding in `examples/web`. | boolean (`strconv.ParseBool`) | `true` outside production, `false` in production |
| `ADMIN_SEEDS_IGNORE_DUPLICATES` | Ignores duplicate fixture errors when seeding. | boolean (`strconv.ParseBool`) | `true` |
| `ADMIN_SEEDS_TRUNCATE` | Truncates seed target tables before load. | boolean (`strconv.ParseBool`) | `false` |
| `ADMIN_STRICT_ROUTES` | Strict route conflict detection toggle for Fiber adapter. | boolean (`strconv.ParseBool`) | `true` in dev/debug/test contexts; `false` otherwise |
| `ADMIN_TRANSLATION_EXCHANGE` | Explicit override for translation exchange module enablement. | boolean (`strconv.ParseBool`) | profile-derived |
| `ADMIN_TRANSLATION_PROFILE` | Baseline translation capability profile. | `none`, `core`, `core+exchange` (`exchange` alias), `core+queue` (`queue` alias), `full` | empty; resolves to `core` when CMS is enabled, `none` when CMS is disabled |
| `ADMIN_TRANSLATION_QUEUE` | Explicit override for translation queue module enablement. | boolean (`strconv.ParseBool`) | profile-derived |

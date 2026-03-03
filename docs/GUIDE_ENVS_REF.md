# Runtime Config Reference (`examples/web`)

Canonical runtime configuration for `examples/web` is:

1. `examples/web/config/app.json` (base file)
2. `APP_*` environment overrides loaded via `examples/web/config.Load(...)`

`go-admin` and `quickstart` do not read process environment directly for runtime behavior. Host apps should load config and pass explicit option structs/config values.

Last updated: March 2, 2026.

## Resolution order

`examples/web/config.Load(ctx)` resolves values in this order:

1. `Defaults()` in `examples/web/config/config.go`
2. `examples/web/config/app.json` (or explicit file paths passed to `Load`)
3. environment overrides with prefix `APP_` and nested delimiter `__`

Example:

- `admin.scope.mode` -> `APP_ADMIN__SCOPE__MODE`
- `translation.profile` -> `APP_TRANSLATION__PROFILE`
- `site.runtime_env` -> `APP_SITE__RUNTIME_ENV`

## Naming convention

- Prefix: `APP_`
- Nested fields: `__`
- Key normalization: struct field names map to `snake_case` keys in config, then upper snake case for env.

Examples:

- `app.env` -> `APP_APP__ENV`
- `features.persistent_cms` -> `APP_FEATURES__PERSISTENT_CMS`
- `securelink.signing_key` -> `APP_SECURELINK__SIGNING_KEY`

## Common overrides

| Config key | Env override | Notes |
|---|---|---|
| `app.env` | `APP_APP__ENV` | `development`, `staging`, `production` |
| `server.address` | `APP_SERVER__ADDRESS` | HTTP bind address (default `:8080`) |
| `admin.base_path` | `APP_ADMIN__BASE_PATH` | Admin UI mount path |
| `admin.debug.enabled` | `APP_ADMIN__DEBUG__ENABLED` | Debug module toggle |
| `admin.debug.layout` | `APP_ADMIN__DEBUG__LAYOUT` | `admin` or `standalone` |
| `admin.errors.dev_mode` | `APP_ADMIN__ERRORS__DEV_MODE` | Error presenter dev mode |
| `admin.scope.mode` | `APP_ADMIN__SCOPE__MODE` | `single` or `multi` |
| `admin.scope.default_tenant_id` | `APP_ADMIN__SCOPE__DEFAULT_TENANT_ID` | Default tenant in single mode |
| `admin.scope.default_org_id` | `APP_ADMIN__SCOPE__DEFAULT_ORG_ID` | Default org in single mode |
| `admin.authz_preflight.mode` | `APP_ADMIN__AUTHZ_PREFLIGHT__MODE` | `off`, `warn`, `strict` |
| `site.runtime_env` | `APP_SITE__RUNTIME_ENV` | Runtime behavior environment (`dev`, `staging`, `prod`) |
| `site.content_channel` | `APP_SITE__CONTENT_CHANNEL` | CMS content scope (`default`, `dev`, etc.) |
| `site.environment_strict` | `APP_SITE__ENVIRONMENT_STRICT` | Fail-fast env mismatch detection |
| `features.persistent_cms` | `APP_FEATURES__PERSISTENT_CMS` | Persistent CMS adapter toggle |
| `features.go_options` | `APP_FEATURES__GO_OPTIONS` | go-options settings backend toggle |
| `features.go_users_activity` | `APP_FEATURES__GO_USERS_ACTIVITY` | go-users activity sink toggle |
| `navigation.reset_menu` | `APP_NAVIGATION__RESET_MENU` | Reset seeded menu before startup |
| `databases.cms_dsn` | `APP_DATABASES__CMS_DSN` | CMS SQLite DSN/path |
| `databases.content_dsn` | `APP_DATABASES__CONTENT_DSN` | Content DB DSN/path |
| `seeds.enabled` | `APP_SEEDS__ENABLED` | Seed fixtures at startup |
| `seeds.truncate` | `APP_SEEDS__TRUNCATE` | Truncate seed targets before load |
| `translation.profile` | `APP_TRANSLATION__PROFILE` | `none`, `core`, `core+exchange`, `core+queue`, `full` |
| `translation.exchange` | `APP_TRANSLATION__EXCHANGE` | Explicit exchange module override |
| `translation.queue` | `APP_TRANSLATION__QUEUE` | Explicit queue module override |
| `securelink.base_url` | `APP_SECURELINK__BASE_URL` | Public base URL used in secure links |
| `securelink.signing_key` | `APP_SECURELINK__SIGNING_KEY` | Required to enable securelink manager |
| `securelink.query_key` | `APP_SECURELINK__QUERY_KEY` | Token query parameter name |
| `securelink.as_query` | `APP_SECURELINK__AS_QUERY` | Query vs path token mode |
| `securelink.expiration` | `APP_SECURELINK__EXPIRATION` | Go duration string (default `72h`) |
| `cms.runtime_logs` | `APP_CMS__RUNTIME_LOGS` | CMS runtime diagnostics toggle |

## Compatibility aliases

`examples/web/taskfile` `dev:serve` exports canonical `APP_*` keys, then mirrors a subset to legacy aliases (`ADMIN_*`, `SITE_*`, `USE_*`, etc.) for compatibility with older scripts. Those aliases are not canonical runtime config.

## Quickstart note

Legacy helpers such as `WithDebugFromEnv`, `WithErrorsFromEnv`, `WithScopeFromEnv`, and `SecureLinkConfigFromEnv` are compatibility shims only. They no longer parse environment variables and should be replaced with explicit option structs/config.

# go-admin E-Sign Example

Backend-first flagship e-sign scaffold wired through quickstart.

## Command Reference

All commands map directly to `examples/esign/taskfile`.

## Architecture Guides

- `../../docs/GUIDES_ESIGN_ARCHITECTURE.md`
- `../../docs/GUIDE_TRANSACTION_OUTBOX.md`

### `dev:serve`

Build shared client assets and run the e-sign example server.

```bash
cd examples/esign
./taskfile dev:serve
```

### `dev:test`

Run backend tests for the e-sign example package.

```bash
cd examples/esign
./taskfile dev:test
```

### `dev:cover`

Run tests with coverage output.

```bash
cd examples/esign
./taskfile dev:cover
```

### `release:verify`

Run backend release-gate validation.

```bash
cd examples/esign
./taskfile release:verify
```

### `smoke:e2e`

Run local smoke flow (upload pdf, create doc+agreement, send, complete signer flow).

```bash
cd examples/esign
./taskfile smoke:e2e
```

Optional smoke overrides:

```bash
BASE_URL=http://localhost:8082 \
TENANT_ID=tenant-smoke \
ORG_ID=org-smoke \
ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=admin.pwd \
./taskfile smoke:e2e
```

## Configuration

The e-sign example uses generated typed config in [`examples/esign/config`](./config):

- Schema source: [`examples/esign/config/app.json`](./config/app.json)
- Optional overlay: [`examples/esign/config/overrides.yml`](./config/overrides.yml)
- Generated artifacts (committed): [`examples/esign/config/config_structs.go`](./config/config_structs.go), [`examples/esign/config/config_getters.go`](./config/config_getters.go)
- Runtime loader: [`examples/esign/config/config.go`](./config/config.go)

### Generation Workflow

Do not edit generated files manually. Regenerate from `app.json` and overrides:

```bash
go generate ./examples/esign/config
```

Equivalent generated commands are defined in [`examples/esign/config/config_gen.go`](./config/config_gen.go):

- `app-config ... -extension ./codegen.overrides.yml`
- `config-getters ...`

### Precedence Model

Load order is:

1. Struct defaults (`Defaults()` in `config.go`)
2. Base config file (`app.json`)
3. Optional overlay file (`overrides.yml`)
4. Environment (`APP_*`, with `__` nesting delimiter)

Environment selectors for file paths:

- `APP_CONFIG`: base config path (defaults to package-local `app.json`)
- `APP_CONFIG_OVERRIDES`: optional overlay path (defaults to package-local `overrides.yml`)

Examples:

- `APP_APP__ENV=development`
- `APP_SERVER__ADDRESS=:8082`
- `APP_FEATURES__ESIGN_GOOGLE=true`
- `APP_RUNTIME__PROFILE=staging`
- `APP_PUBLIC__BASE_URL=https://esign.example.com`

Legacy `ESIGN_*` alias overrides are removed.

### Key `APP_*` Overrides

| Key | Default |
|---|---|
| `APP_APP__ENV` | `development` |
| `APP_SERVER__ADDRESS` | `:8082` |
| `APP_ADMIN__PUBLIC_API` | `true` |
| `APP_ADMIN__API_VERSION` | `v1` |
| `APP_FEATURES__ESIGN` | `true` |
| `APP_FEATURES__ESIGN_GOOGLE` | `false` |
| `APP_FEATURES__ACTIVITY` | `true` |
| `APP_RUNTIME__PROFILE` | `development` |
| `APP_RUNTIME__REPOSITORY_DIALECT` | `(auto: sqlite in development, postgres in production)` |
| `APP_RUNTIME__STARTUP_POLICY` | `enforce` |
| `APP_RUNTIME__STRICT_STARTUP` | `false` |
| `APP_SQLITE__DSN` | `file:data/go-admin-esign.sqlite?_busy_timeout=5000&_foreign_keys=on` |
| `APP_POSTGRES__DSN` | `(empty)` |
| `APP_MIGRATIONS__LOCAL_DIR` | `data/sql/migrations` |
| `APP_MIGRATIONS__LOCAL_ONLY` | `false` |
| `APP_EMAIL__TRANSPORT` | `deterministic` |
| `APP_SIGNER__UPLOAD_TTL_SECONDS` | `300` |
| `APP_SIGNER__UPLOAD_SIGNING_KEY` | `(empty)` |
| `APP_SIGNER__PROFILE_MODE` | `hybrid` |
| `APP_PUBLIC__BASE_URL` | `http://localhost:8082` |

Legacy persistence alias keys (`APP_DATABASES__ESIGN_DSN`, `APP_DATABASES__CONTENT_DSN`) are ignored by runtime bootstrap and are no longer part of DSN resolution.

### Demo Login Credentials

By default:

- `identifier`: `admin@example.com`
- `password`: `admin.pwd`

Override using:

- `APP_AUTH__ADMIN_EMAIL`
- `APP_AUTH__ADMIN_PASSWORD`
- `APP_AUTH__ADMIN_ID`
- `APP_AUTH__ADMIN_ROLE`
- `APP_AUTH__SIGNING_KEY`
- `APP_AUTH__CONTEXT_KEY`

### Google Integration Keys

When `APP_FEATURES__ESIGN_GOOGLE=true`, configure at least:

- `APP_GOOGLE__PROVIDER_MODE` (`real` or `deterministic`)
- `APP_GOOGLE__CLIENT_ID`
- `APP_GOOGLE__CLIENT_SECRET`
- `APP_GOOGLE__OAUTH_REDIRECT_URI`
- `APP_SERVICES__ENCRYPTION_KEY`
- `APP_GOOGLE__CREDENTIAL_ACTIVE_KEY`

Generate a credential key (production):

```bash
openssl rand -base64 32
```

Set it:

```bash
export APP_GOOGLE__CREDENTIAL_ACTIVE_KEY="<generated-value>"
```

`dev:serve` fails fast unless these are set:

- `APP_SERVICES__ENCRYPTION_KEY`
- `APP_GOOGLE__OAUTH_REDIRECT_URI`

## Web Entrypoint And Auth Flow

- `http://localhost:8082/` redirects to `/admin`.
- `http://localhost:8082/admin` redirects unauthenticated users to `/admin/login`.
- `http://localhost:8082/admin/esign` renders the e-sign landing page.
- Public signer routes remain outside admin auth, for example `http://localhost:8082/api/v1/esign/signing/session/:token`.

## Framework Env

Framework-level `ADMIN_*`/debug switches still apply to go-admin runtime behavior.
Canonical reference: `../../ENVS_REF.md`.

## Action UX QA

The e-sign example is the domain-rule action UX reference.

Relevant checks:

- document delete is disabled before execution when agreements reference it
- stale delete retries return `RESOURCE_IN_USE` through the standard error
  envelope
- list and detail surfaces expose the same `_action_state` result

Focused verification:

```bash
/opt/homebrew/bin/go test ./examples/esign/modules -run 'TestActionPhase8|TestESignActionContractsPhase6|TestESignBulkActionsPhase7'
```

When debug mode is enabled, the Debug dashboard includes an `Actions` panel with
recent disablements, resolver failures, and structured execution failures from
the shared action system.

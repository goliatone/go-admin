# Admin Shell Example

Opinionated `go-admin` shell wired with `go-config`, `go-auth`, and quickstart.

## Run

```bash
./examples/admin-shell/taskfile dev:serve
```

Or:

```bash
go run ./examples/admin-shell/cmd/admin
```

## Task Commands

- `dev:serve`
- `dev:serve:quiet`
- `dev:serve:prod`
- `dev:config:generate`
- `dev:test`
- `dev:cover`
- `dev:fmt`
- `dev:vet`
- `dev:check`

## Configuration

Runtime config package: `examples/admin-shell/internal/config`

Canonical files:

- Base schema/config: `examples/admin-shell/internal/config/app.json`
- Optional overlay: `examples/admin-shell/internal/config/overrides.yml`
- Generator extension: `examples/admin-shell/internal/config/codegen.overrides.yml`
- Runtime loader: `examples/admin-shell/internal/config/config.go`
- Generated artifacts (committed):
  - `examples/admin-shell/internal/config/config_structs.go`
  - `examples/admin-shell/internal/config/config_getters.go`

### Generation Workflow

Do not manually edit generated files.

```bash
go generate ./examples/admin-shell/internal/config
```

Equivalent task:

```bash
./examples/admin-shell/taskfile dev:config:generate
```

### Load Precedence

Load order is:

1. Struct defaults (`Defaults()`)
2. Base config file (`app.json`)
3. Optional overlay (`overrides.yml`)
4. Environment overrides (`APP_*` with `__` nesting)

### Config Path Selectors

- `APP_CONFIG`: base config file path
- `APP_CONFIG_OVERRIDES`: overlay file path (optional)
- `APP_CONFIG_PATH`: legacy fallback alias for `APP_CONFIG`

Examples:

- `APP_SERVER__ADDRESS=:9090`
- `APP_ADMIN__BASE_PATH=/control`
- `APP_AUTH__SIGNING_KEY=replace-me`
- `APP_FEATURES__SEARCH=false`

## URLs

Default address from config is `:8383`:

- `http://localhost:8383/`
- `http://localhost:8383/healthz`
- `http://localhost:8383/readyz`
- `http://localhost:8383/admin`
- `http://localhost:8383/admin/login`

## Demo Credentials

- `superadmin` / `superadmin.pwd`
- `admin` / `admin.pwd`
- `jane.smith` / `jane.smith.pwd`
- `translator` / `translator.pwd`
- `john.doe` / `john.doe.pwd`
- `viewer` / `viewer.pwd`

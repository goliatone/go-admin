# Admin Shell Project Starter

`admin-shell` is the smallest runnable, production-shaped go-admin host in this
repository. It includes owned route surfaces, embedded views and assets,
quickstart feature profiles, go-auth integration, typed layered configuration,
deployment identity, health/readiness endpoints, and signal-aware graceful
shutdown.

The built-in identities and plaintext credentials are development fixtures.
Production configuration rejects demo auth, credential display, the development
signing key, and signing keys shorter than 32 characters.

## Run

From the repository root:

```bash
./examples/admin-shell/taskfile dev:serve
```

Or:

```bash
go run ./examples/admin-shell/cmd/admin
```

Default endpoints:

- `http://localhost:8383/`
- `http://localhost:8383/healthz`
- `http://localhost:8383/readyz`
- `http://localhost:8383/admin`
- `http://localhost:8383/admin/login`

Run the complete starter checks with:

```bash
./examples/admin-shell/taskfile dev:check
```

## Use It As A New Project

1. Copy `examples/admin-shell` into the new module.
2. Replace imports beginning with
   `github.com/goliatone/go-admin/examples/admin-shell` with the new module path.
3. Customize `name`, `admin`, and `deployment` in
   `internal/config/app.json`, then run `go generate ./internal/config`.
4. Add domain modules and routes through `core.WithRouteRegistrar`; choose the
   matching `HostRouter` surface instead of registering on the raw router.
5. Replace demo auth with the application identity provider using
   `core.WithIdentityProvider(provider)` and disable both demo settings.
6. Supply production secrets through the deployment environment or secret
   manager; do not put them in `app.json`.

When the starter remains inside this repository, keep the existing command
paths and update only its package name/import prefix as needed.

## Composition Contract

`core.New` owns startup ordering:

1. validate typed config;
2. create go-admin with the process context and quickstart feature options;
3. create the Fiber server and `HostRouter`;
4. register static and host-owned routes;
5. initialize admin routes through `host.Admin()`;
6. register admin/auth UI routes;
7. return an unsealed server.

`Serve`, `Run`, or `Server.WrappedRouter()` is the sealing boundary. Add public
pages through `host.PublicSite()`, internal probes through
`host.InternalOps()`, static mounts through `host.Static()`, and admin routes
through their Admin UI/API surfaces.

`cmd/admin` uses `signal.NotifyContext` for `SIGINT`/`SIGTERM`. On cancellation,
`Core.Run` stops the HTTP server and admin command runtime within
`server.shutdown_timeout_seconds`.

## Configuration

Canonical configuration lives in `internal/config`:

- `app.json`: base schema and development values
- `overrides.yml`: optional local/deployment overlay
- `codegen.overrides.yml`: generator type overrides
- `config.go`: precedence, normalization, validation, and helpers
- `config_structs.go`, `config_getters.go`: committed generated artifacts

Load precedence is defaults, base file, optional overlay, then `APP_*`
environment values using `__` for nesting. Select files with `APP_CONFIG` and
`APP_CONFIG_OVERRIDES`; `APP_CONFIG_PATH` remains a compatibility fallback.

Examples:

```bash
APP_SERVER__ADDRESS=:9090 \
APP_ADMIN__BASE_PATH=/control \
APP_FEATURES__OVERRIDES__SEARCH=false \
go run ./examples/admin-shell/cmd/admin
```

The feature config has two parts:

- `profile: minimal` replaces the complete quickstart base with dashboard and
  CMS; `default` and `full` use `DefaultAdminFeatures()`.
- `overrides` merges any feature keys on top of that profile. The starter
  enables `search` this way.

Quickstart still constructs the actual scoped gate, including claims support
and preferences-backed runtime overrides. The home page resolves and displays
all current core feature keys from that gate.

Regenerate typed config after schema changes:

```bash
go generate ./examples/admin-shell/internal/config
```

## Authentication And Production

Development defaults seed six identities and can show their credentials on the
home/login pages and in startup logs. Set
`APP_AUTH__SHOW_DEMO_CREDENTIALS=false` when that convenience is unnecessary.

Production requires:

- `APP_AUTH__DEMO_ENABLED=false`
- `APP_AUTH__SHOW_DEMO_CREDENTIALS=false`
- a secret `APP_AUTH__SIGNING_KEY` of at least 32 characters
- a real `auth.IdentityProvider` passed with `core.WithIdentityProvider`

The provided `dev:serve:prod` task applies the safe demo settings and checks for
the signing key. It will then fail with a clear provider error until the starter
has been connected to the project’s real identity store. This is intentional:
there is no plaintext fallback in production.

Browser sessions use an HTTP-only cookie for `/admin/*`; unsafe browser writes
must include the CSRF token rendered by the templates. Bearer-authenticated API
clients use `Authorization: Bearer <token>`.

## Task Commands

- `dev:serve`, `dev:serve:quiet`, `dev:serve:prod`
- `dev:config:generate`, `dev:config`, `dev:env`
- `dev:test`, `dev:cover`, `dev:fmt`, `dev:vet`, `dev:check`
- `dev:curl:home`, `dev:curl:health`, `dev:curl:ready`, `dev:curl:admin`

The task script resolves `go` from `PATH`; set `GO_BIN` only when an explicit Go
binary is required.

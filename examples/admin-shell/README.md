# Admin Shell Project Starter

`admin-shell` is the smallest runnable, production-shaped go-admin host in this
repository. It includes owned route surfaces, embedded views and assets,
quickstart feature profiles, go-auth integration, typed layered configuration,
centralized glog/go-errors logging, lifecycle-managed admin contributions,
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
   `config/app.json`, then run `go generate ./config`.
4. Add domain modules through `core.WithAdminModule`, other pre-initialize
   admin contributions through `core.WithAdminContribution`, and host routes
   through `core.WithRouteRegistrar`. Choose the matching `HostRouter` surface
   instead of registering on the raw router.
5. Replace demo auth with the application identity provider using
   `core.WithIdentityProvider(provider)` and disable both demo settings.
6. Supply production secrets through the deployment environment or secret
   manager; do not put them in `app.json`.

When the starter remains inside this repository, keep the existing command
paths and update only its package name/import prefix as needed.

## Repository Layout

The starter uses these ownership boundaries so copied applications remain
predictable:

```text
admin-shell/
  cmd/                 process entrypoints
  config/              human-edited config, typed package, generated config
  data/                application-owned embedded resources and data
    templates/
    templates.go
  internal/            private application-specific implementation
  pkg/                 optional incubator for extraction candidates
```

- Keep configuration at top-level `config/` so files such as
  `config/app.json` and `config/overrides.yml` are easy for operators and
  developers to find. The typed config package and its generated artifacts
  stay there too.
- Keep application-owned resources under top-level `data/`, grouped by
  concern. Use `data/templates/`, `data/assets/`,
  `data/sql/migrations/`, `data/sql/seeds/`, `data/i18n/`, and
  `data/openapi/` as those concerns are introduced. Put focused Go embed
  holders beside the resources in the `data` package.
- Keep application-specific private code under `internal/`.
- Do not use `pkg/` as a general destination for application code. Reserve it
  for packages that are orthogonal to the current application, avoid its
  domain model, and are plausible candidates for later promotion into their
  own repository or Go module.

Create optional `data/` subdirectories only when they have a real owned
artifact; the starter includes templates but does not add empty migration,
asset, i18n, or OpenAPI trees.

## Composition Contract

`core.New` owns startup ordering:

1. receive the command-owned logger provider and validate typed config;
2. create go-admin with the process context, logger provider, and quickstart
   feature options;
3. create auth, the Fiber server, and `HostRouter` with named child loggers;
4. run named fatal pre-bind admin contribution tasks;
5. register static and host-owned routes;
6. initialize admin routes through `host.Admin()`;
7. register admin/auth UI routes;
8. return an unsealed server.

Admin contribution tasks use deterministic priority and insertion ordering.
Contribution callbacks and module factories receive the active startup
`context.Context`. Module factories also receive the root provider and a stable
`modules.<name>` logger before their module is registered. A module that
implements `Shutdown(context.Context) error` is adapted into a real lifecycle
shutdown task; interrupted teardown remains retryable without rerunning tasks
that already succeeded. Route registrars remain direct composition callbacks;
`Admin.Initialize` and listener binding are not modeled as module lifecycle
tasks.

`Serve`, `Run`, or `Server.WrappedRouter()` is the sealing boundary. Add public
pages through `host.PublicSite()`, internal probes through
`host.InternalOps()`, static mounts through `host.Static()`, and admin routes
through their Admin UI/API surfaces.

`cmd/admin` uses `signal.NotifyContext` for `SIGINT`/`SIGTERM`. On cancellation,
listener failure, or startup rollback, `Core.Run` bounds server, lifecycle,
and admin command-runtime cleanup with `server.shutdown_timeout_seconds`.
Incomplete lifecycle shutdown keeps shared admin resources open so a later
`Core.Shutdown` call can finish safely. `Core.Shutdown` also applies that
timeout when its caller supplies no deadline.

## Configuration

Canonical configuration lives in top-level `config/`:

- `app.json`: base schema and development values
- `overrides.yml`: optional local/deployment overlay
- `codegen.overrides.yml`: generator type overrides
- `config.go`: precedence, normalization, validation, and helpers
- `config_structs.go`, `config_getters.go`: committed generated artifacts

Logging is configured with:

- `logging.level`: `trace`, `debug`, `info`, `warn`, or `error`
- `logging.format`: `json`, `console`, `text`, or `pretty`

The entrypoint creates one root logger before configuration loading, sends the
`config` child into the loader, and then applies the validated level, format,
and deployment identity to that same root. go-admin, go-auth, routing, and
module loggers all resolve from the shared provider. Fiber access records use
the `http.access` child rather than Fiber's independent text logger. Render
merge diagnostics redact values such as CSRF tokens, and
`server.print_routes=false` suppresses structured route-registration records.

Load precedence is defaults, base file, optional overlay, then `APP_*`
environment values using `__` for nesting. Select files with `APP_CONFIG` and
`APP_CONFIG_OVERRIDES`; `APP_CONFIG_PATH` remains a compatibility fallback.

Examples:

```bash
APP_SERVER__ADDRESS=:9090 \
APP_ADMIN__BASE_PATH=/control \
APP_FEATURES__OVERRIDES__SEARCH=false \
APP_LOGGING__LEVEL=debug \
APP_LOGGING__FORMAT=pretty \
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
go generate ./examples/admin-shell/config
```

## Authentication And Production

Development defaults seed six identities and can show their credentials on the
home/login pages. Passwords are not written to application logs. Set
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

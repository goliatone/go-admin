## Admin Shell Example

This example is an opinionated `go-admin` shell for projects that use the goliatone stack.

It is intentionally small, but complete enough to:

1. boot the server,
2. show a useful root page at `/`,
3. protect `/admin` behind auth,
4. render a real login UI at `/admin/login`,
5. and provide a `Core` dependency container you can reuse in new projects.

## Goal

Create a reusable app-shell baseline that wires:

1. `go-config` for config loading,
2. `go-router`/Fiber for HTTP server + routing,
3. `go-auth` for login/session auth,
4. `go-admin/quickstart` for admin bootstrap and UI routes.

## What We Built

1. `examples/admin-shell/cmd/admin/main.go`
2. `examples/admin-shell/internal/config/config.go`
3. `examples/admin-shell/internal/core/core.go`
4. `examples/admin-shell/internal/core/auth.go`
5. `examples/admin-shell/internal/http/routes.go`
6. `examples/admin-shell/config/app.yaml`
7. `examples/admin-shell/taskfile`

## Step-By-Step Setup Process

### 1. Scaffold the Example Structure

We started by creating a focused structure for an app-shell:

```text
examples/admin-shell/
  cmd/admin/main.go
  config/app.yaml
  internal/config/config.go
  internal/core/core.go
  internal/core/auth.go
  internal/http/routes.go
  taskfile
```

### 2. Add Configuration Loading (`go-config`)

In `internal/config/config.go` we added:

1. `AppConfig` with `Server`, `Admin`, `Auth`, and `Features`.
2. `Defaults()` for baseline values.
3. `Load(ctx)` that merges:
   1. struct defaults,
   2. optional config file,
   3. environment overrides.

Environment override convention:

1. prefix: `APP_`
2. delimiter: `__`
3. examples:
   1. `APP_SERVER__ADDRESS=":9090"`
   2. `APP_ADMIN__BASE_PATH="/control"`
   3. `APP_AUTH__SIGNING_KEY="change-me"`

### 3. Build a Lightweight DI Container (`Core`)

In `internal/core/core.go` we introduced `type Core struct` to carry app dependencies:

1. config and logger,
2. server/router/fiber app,
3. admin instance,
4. auth components,
5. feature gate,
6. demo identity/token metadata.

`core.New(...)` is the composition root and is where wiring happens.

### 4. Wire `go-admin` with Quickstart

In `core.New(...)`:

1. create `admin.Config` via `quickstart.NewAdminConfig(...)`,
2. construct admin via `quickstart.NewAdmin(...)`,
3. provide a feature gate from configured defaults.

### 5. Wire `go-auth`

In `internal/core/auth.go`:

1. define demo identity provider (`username/email/password`),
2. create `auth.Auther`,
3. create `auth.RouteAuthenticator`,
4. attach auth + authorizer to admin via `quickstart.WithGoAuth(...)`.

Important detail:

`GetTokenLookup()` is configured as:

```text
header:Authorization,cookie:<contextKey>
```

This is required so browser login sessions (cookie) and API bearer tokens both work.

### 6. Add View Engine + Static Assets

To render login/admin pages, we wired:

1. `quickstart.NewViewEngine(...)` using embedded client templates,
2. `quickstart.NewFiberServer(...)` to use that view engine,
3. `quickstart.NewStaticAssets(...)` to serve `/admin/assets/...`.

### 7. Register Auth + Admin UI Routes

This is the key wiring for protected UI:

1. `quickstart.RegisterAuthUIRoutes(...)`
2. `quickstart.RegisterAdminUIRoutes(...)` with auth wrapper

Result:

1. unauthenticated `GET /admin` -> `302` redirect to `/admin/login`,
2. `GET /admin/login` renders login page,
3. successful login sets auth cookie and redirects to `/admin`.

### 8. Register Shell Utility Routes

In `internal/http/routes.go` we kept lightweight shell routes:

1. `GET /` status/links/debug-friendly page,
2. `GET /healthz`,
3. `GET /readyz`.

The root page includes quick links to `/admin` and `/admin/login`.

### 9. Add Developer Task Commands

`examples/admin-shell/taskfile` includes shell-focused commands:

1. `dev:serve`
2. `dev:serve:quiet`
3. `dev:serve:prod`
4. `dev:test`
5. `dev:fmt`
6. `dev:vet`
7. `dev:check`
8. `dev:curl:home`
9. `dev:curl:health`
10. `dev:curl:ready`
11. `dev:curl:admin`

## Run Guide

### 1. Start the app

```bash
./examples/admin-shell/taskfile dev:serve
```

or:

```bash
go run ./examples/admin-shell/cmd/admin
```

### 2. Open endpoints

From current `examples/admin-shell/config/app.yaml`, default address is `:8383`:

1. `http://localhost:8383/`
2. `http://localhost:8383/healthz`
3. `http://localhost:8383/readyz`
4. `http://localhost:8383/admin`
5. `http://localhost:8383/admin/login`

### 3. Login credentials

Default demo credentials:

1. `superadmin` / `superadmin.pwd`
2. `admin` / `admin.pwd`
3. `jane.smith` / `jane.smith.pwd`
4. `translator` / `translator.pwd`
5. `john.doe` / `john.doe.pwd`
6. `viewer` / `viewer.pwd`

The login page also renders this credential list as a local-dev helper snippet.

## Verification Checklist

After startup, verify these exact behaviors:

1. `GET /admin` returns redirect (`302`) to `/admin/login`.
2. `GET /admin/login` returns `200` and HTML login page.
3. `POST /admin/login` with demo credentials sets auth cookie and redirects to `/admin`.
4. `GET /admin` with that cookie returns `200`.

Example cURL:

```bash
# expect 302 + Location: /admin/login
curl -i http://localhost:8383/admin

# login and store cookie
curl -i -c /tmp/admin-shell.cookies -X POST \
  -d 'identifier=admin&password=admin.pwd' \
  http://localhost:8383/admin/login

# authenticated admin page
curl -i -b /tmp/admin-shell.cookies http://localhost:8383/admin
```

## “Cannot GET /admin” Fix Summary

We hit this during setup and fixed it by adding missing UI/auth wiring:

1. add view engine,
2. add static assets,
3. register auth UI routes,
4. register admin UI routes with auth wrapper,
5. support cookie lookup in token config.

Without those, only API/admin backend routes existed and `/admin` could resolve to 404/“Cannot GET”.

## Configuration Notes

Default config file:

1. `examples/admin-shell/config/app.yaml`

Override config file:

1. `APP_CONFIG_PATH=/absolute/path/to/app.yaml`

Common env overrides:

1. `APP_SERVER__ADDRESS=":9090"`
2. `APP_SERVER__PRINT_ROUTES=false`
3. `APP_ADMIN__BASE_PATH="/control"`
4. `APP_AUTH__SIGNING_KEY="replace-me"`
5. `APP_FEATURES__SEARCH=false`

## Next Extensions

Natural next changes if you clone this shell into another project:

1. replace demo identity provider with real user store,
2. plug real role/resource mappings into go-auth claims,
3. add project modules under admin registration,
4. add persistence and migrations,
5. add project-specific home diagnostics to `/`.

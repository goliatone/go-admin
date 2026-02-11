# go-admin E-Sign Example (Phase 0 Scaffold)

Backend-first flagship e-sign scaffold wired through quickstart.

## Command Reference

All commands map directly to `examples/esign/taskfile`.

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

### `version:*`

Use the same version helper tasks as other examples:

- `version:get`
- `version:set`
- `version:bump`
- `version:upsert`

### `release`

Run the release helper flow defined in the taskfile.

### `release:verify`

Run backend release-gate validation (checklist enforcement + SLO validation profile).

```bash
cd examples/esign
./taskfile release:verify
```

## Local Defaults

`dev:serve` sets:

- `ESIGN_FEATURE_ENABLED=true`
- `ESIGN_GOOGLE_FEATURE_ENABLED=false`
- `ADMIN_PUBLIC_API=true`
- `ADMIN_API_VERSION=v1`

## Web Entrypoint And Auth Flow

Phase 16 wiring enables the admin shell/login flow for the e-sign runtime.

- `http://localhost:8082/` redirects to `/admin`.
- `http://localhost:8082/admin` and `http://localhost:8082/admin/` are authenticated shell entrypoints.
- Unauthenticated shell access redirects to `/admin/login`.
- `http://localhost:8082/admin/esign` renders the e-sign landing page inside the go-admin shell.
- `http://localhost:8082/admin/esign/status` remains a backend status endpoint.
- Public signer routes stay outside admin auth, for example:
  - `http://localhost:8082/api/v1/esign/signing/session/:token`

### Demo Login Credentials (Env-Backed Provider)

By default:

- `identifier`: `admin@example.com`
- `password`: `admin.pwd`

Override with environment variables:

- `ESIGN_ADMIN_EMAIL`
- `ESIGN_ADMIN_PASSWORD`
- `ESIGN_ADMIN_ID`
- `ESIGN_ADMIN_ROLE`
- `ESIGN_AUTH_SIGNING_KEY`
- `ESIGN_AUTH_CONTEXT_KEY`

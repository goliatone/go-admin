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

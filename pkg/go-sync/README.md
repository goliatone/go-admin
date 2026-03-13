# go-sync

`pkg/go-sync` is the vendored, extraction-ready sync package for revision-safe resource reads, compare-and-swap mutations, idempotent action replay, HTTP transport mapping, and embedded browser client distribution.

## Package Surface

- `core`
  - Canonical backend contracts for `ResourceRef`, `Snapshot`, `MutationInput`, `MutationResult`, and stable sync error codes.
- `store`
  - Extension point for authoritative resource persistence and replay-key storage.
  - Implementations must preserve compare-and-swap revision checks and actor-scoped idempotency semantics.
- `service`
  - Orchestrates `Get` and `Mutate` with retry-safe idempotency reservation and stale-revision mapping.
- `transport/http`
  - Maps the canonical service envelopes to `GET`, `PATCH`, and action `POST` handlers without pulling in app-specific routes.
- `observability`
  - Metrics/logging hooks for reads, mutations, conflicts, retries, and idempotent replays.
- `data`
  - Embedded browser artifacts rooted at `data/client` and `data/client/sync-core`.

## Store Requirements

- `ResourceStore.Get` must return the latest authoritative snapshot for `{kind,id,scope}`.
- `ResourceStore.Mutate` must enforce `expectedRevision` as a compare-and-swap precondition.
- Stale writes must return `STALE_REVISION` details with the current revision and, when available, the latest snapshot.
- Idempotent actions must scope replay keys by resource, actor, operation, and caller-provided idempotency key.
- Replay storage must distinguish `pending` reservations from committed results so duplicate sends cannot double-apply.

## Error Codes

- `NOT_FOUND`
- `STALE_REVISION`
- `IDEMPOTENCY_REPLAY`
- `INVALID_MUTATION`
- `TRANSPORT_UNAVAILABLE`
- `RATE_LIMITED`
- `TEMPORARY_FAILURE`

`core.SyncError` is the canonical backend error shape. `transport/http` converts those errors into stable wire envelopes without exposing app-local internals.

## Client Distribution

The package-local client workspace lives under [`pkg/go-sync/client/packages/sync-core`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/pkg/go-sync/client/packages/sync-core).

- Build output is emitted to `client/packages/sync-core/dist` and `dist-types`.
- `client/scripts/build-sync.mjs` copies the runtime bundle into `data/client/sync-core`.
- `data.ClientFS()` exposes all embedded client artifacts rooted at `data/client`.
- `data.ClientSyncCoreFS()` exposes only the `sync-core` bundle rooted at `data/client/sync-core`.

Consuming applications serve those embedded files from routes they own. `go-sync` ships bytes and contracts, not route registration.

## Release Workflow

- Package version source of truth: [`pkg/go-sync/.version`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/pkg/go-sync/.version)
- Package-local commands: [`pkg/go-sync/taskfile`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/pkg/go-sync/taskfile)

Commands:

- `./pkg/go-sync/taskfile client:release`
  - synchronizes the Go package version, workspace package versions, and `sync-core` metadata, then builds and embeds the client artifacts.
- `./pkg/go-sync/taskfile client:build`
  - builds `sync-core`, copies `dist` into `data/client/sync-core`, and verifies runtime/type outputs against the manifest.
- `./pkg/go-sync/taskfile client:test`
  - runs workspace tests and the same manifest/output verification.
- `./pkg/go-sync/taskfile client:build:all`
  - current alias for `client:build`, reserved for future multiple sync client packages.

## Extraction Boundaries

- Do not import `examples/esign` or other host app packages from `pkg/go-sync`.
- Do not make the package-local taskfile or client scripts depend on `pkg/client/assets` or unpublished e-sign page source.
- Keep browser artifacts checked in under `data/client` so Go builds do not require Node.
- Preserve the package-local workspace, taskfile, and embed pipeline when the package moves to its own repository.

The extraction checklist is documented in [`docs/GO_SYNC_EXTRACTION_CHECKLIST.md`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/docs/GO_SYNC_EXTRACTION_CHECKLIST.md).

# sync-core

`sync-core` is the frontend half of the vendored sync package. It provides a framework-agnostic runtime for revisioned resources with a small public API and no direct dependency on the e-sign page.

## Public API

Runtime exports:

- `createSyncEngine`
- `createSyncResource`
- `createInMemoryCache`
- `createResourceKey`
- `createFetchSyncTransport`
- `createRefreshPolicy`
- `parseReadEnvelope`
- `parseMutationEnvelope`
- `parseErrorEnvelope`
- `normalizeSyncError`
- `isSyncEnvelopeError`
- `DEFAULT_RETRY_POLICY`
- `SYNC_CORE_PACKAGE_NAME`
- `SYNC_CORE_PACKAGE_VERSION`

Types are exposed only from the package root. App code must not deep-import `src/internal`, `dist-types/internal`, or unpublished source modules.

## Resource Lifecycle

- `idle`
  - no snapshot has been loaded yet.
- `loading`
  - first authoritative load is in flight.
- `ready`
  - the resource has a current snapshot and no pending work.
- `refreshing`
  - a refresh is in flight while a snapshot is already available.
- `saving`
  - a queued mutation is being processed.
- `conflict`
  - the server returned `STALE_REVISION`; consumer UI should reload latest or reconcile explicitly.
- `error`
  - a non-conflict failure occurred and the normalized error is available on state.

Mutation queues are per resource key and are processed FIFO. `expectedRevision` is rebound from the latest local snapshot when the caller omits it.

## Resource Keying Rules

Resource isolation is strict on `{kind, id, scope}`.

- Different `id` values do not share cache state.
- Different `scope` maps do not share cache state, even when `kind` and `id` match.
- Scope serialization is normalized so key order does not change the resource key.

## Served Asset Consumption

The compiled runtime is produced from this package and vendored into the Go package embed tree.

- Build source: [`pkg/go-sync/client/packages/sync-core/dist`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/pkg/go-sync/client/packages/sync-core/dist)
- Embedded output: [`pkg/go-sync/data/client/sync-core`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/pkg/go-sync/data/client/sync-core)

Consuming apps should serve the embedded bundle or wrap it behind a thin application-owned loader. They should not import unpublished page-local sync code.
